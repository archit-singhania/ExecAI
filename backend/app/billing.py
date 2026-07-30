from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app import stripe_client
from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.entitlements import reset_period_if_due
from app.models import ProcessedWebhookEvent, User
from app.plans import PLANS, TierId, get_plan, plan_list
from app.ratelimit import limit_by_user

router = APIRouter(prefix="/api/billing", tags=["billing"])

checkout_limit = limit_by_user("checkout", limit=10, window_seconds=300)

TIER_BY_PRICE_SETTING = {
    "pro": "stripe_price_pro",
    "team": "stripe_price_team",
    "agency": "stripe_price_agency",
}


def price_id_for(tier: TierId) -> str:
    settings = get_settings()
    attribute = TIER_BY_PRICE_SETTING.get(tier)
    if not attribute:
        raise HTTPException(status_code=400, detail="That plan cannot be purchased.")

    price_id = getattr(settings, attribute, None)
    if not price_id:
        raise HTTPException(
            status_code=503,
            detail="Billing is not configured yet. Set the Stripe price IDs in the backend environment.",
        )
    return price_id


def tier_for_price(price_id: str) -> TierId | None:
    settings = get_settings()
    for tier, attribute in TIER_BY_PRICE_SETTING.items():
        if getattr(settings, attribute, None) == price_id:
            return tier  # type: ignore[return-value]
    return None


@router.get("/plans")
def list_plans():
    settings = get_settings()
    return {
        "currency": "EUR",
        "billing_enabled": bool(settings.stripe_secret_key),
        "plans": [
            {
                "id": plan.id,
                "name": plan.name,
                "price_eur": plan.price_eur,
                "tagline": plan.tagline,
                "features": plan.features,
                "agent_limit": plan.agent_limit,
                "session_limit": plan.session_limit,
                "monthly_runs": plan.monthly_runs,
                "scheduled_reviews": plan.scheduled_reviews,
                "exports": plan.exports,
                "workspaces": plan.workspaces,
                "white_label": plan.white_label,
                "api_access": plan.api_access,
            }
            for plan in plan_list()
        ],
    }


@router.get("/me")
def my_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reset_period_if_due(db, current_user)
    plan = get_plan(current_user.tier)

    return {
        "tier": plan.id,
        "name": plan.name,
        "price_eur": plan.price_eur,
        "status": current_user.subscription_status,
        "ends_at": current_user.subscription_ends_at,
        "runs_used": current_user.runs_this_period,
        "runs_included": plan.monthly_runs,
        "period_started_at": current_user.period_started_at,
        "manageable": bool(current_user.stripe_customer_id),
    }


@router.post("/checkout")
def start_checkout(
    tier: TierId,
    current_user: User = Depends(checkout_limit),
):
    if tier == "free":
        raise HTTPException(status_code=400, detail="The free plan needs no checkout.")

    settings = get_settings()
    price_id = price_id_for(tier)

    try:
        session = stripe_client.create_checkout_session(
            price_id=price_id,
            customer_email=current_user.email,
            user_id=current_user.id,
            success_url=f"{settings.app_base_url}/dashboard?upgraded={tier}",
            cancel_url=f"{settings.app_base_url}/pricing",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"url": session.get("url")}


@router.post("/portal")
def open_portal(current_user: User = Depends(get_current_user)):
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account yet.")

    settings = get_settings()
    try:
        session = stripe_client.create_portal_session(
            customer_id=current_user.stripe_customer_id,
            return_url=f"{settings.app_base_url}/dashboard",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"url": session.get("url")}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()

    try:
        event = stripe_client.verify_webhook(payload, request.headers.get("stripe-signature"))
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    event_type = event.get("type", "")
    event_id = event.get("id", "")
    obj = event.get("data", {}).get("object", {})

    if event_id:
        if db.get(ProcessedWebhookEvent, event_id):
            return {"received": True, "duplicate": True}
        db.add(ProcessedWebhookEvent(id=event_id, event_type=event_type))
        db.commit()

    if event_type == "checkout.session.completed":
        user_id = obj.get("client_reference_id") or obj.get("metadata", {}).get("user_id")
        user = db.get(User, user_id) if user_id else None
        if user:
            user.stripe_customer_id = obj.get("customer")
            user.subscription_id = obj.get("subscription")
            user.subscription_status = "active"
            db.commit()

    elif event_type in {"customer.subscription.updated", "customer.subscription.created"}:
        user = (
            db.query(User)
            .filter(User.stripe_customer_id == obj.get("customer"))
            .first()
        )
        if user:
            items = obj.get("items", {}).get("data", [])
            price_id = items[0].get("price", {}).get("id") if items else None
            tier = tier_for_price(price_id) if price_id else None

            status = obj.get("status")
            user.subscription_status = status
            user.subscription_id = obj.get("id")

            if tier and status in {"active", "trialing"}:
                if user.tier != tier:
                    user.runs_this_period = 0
                    user.period_started_at = datetime.utcnow()
                user.tier = tier
            elif status in {"canceled", "unpaid", "incomplete_expired"}:
                user.tier = "free"

            ends = obj.get("current_period_end")
            user.subscription_ends_at = datetime.utcfromtimestamp(ends) if ends else None
            db.commit()

    elif event_type == "customer.subscription.deleted":
        user = (
            db.query(User)
            .filter(User.stripe_customer_id == obj.get("customer"))
            .first()
        )
        if user:
            user.tier = "free"
            user.subscription_status = "canceled"
            user.subscription_id = None
            db.commit()

    return {"received": True}
