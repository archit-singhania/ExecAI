from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import BusinessSession, User
from app.plans import RUN_LIMITS_PER_MINUTE, get_plan
from app.ratelimit import _window


def reset_period_if_due(db: Session, user: User) -> None:
    started = user.period_started_at or datetime.utcnow()
    if datetime.utcnow() - started >= timedelta(days=30):
        user.runs_this_period = 0
        user.period_started_at = datetime.utcnow()
        db.commit()


def require_feature(flag: str, label: str):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        plan = get_plan(current_user.tier)
        if not getattr(plan, flag, False):
            raise HTTPException(
                status_code=402,
                detail=f"{label} is available on Pro and above. Upgrade to unlock it.",
            )
        return current_user

    return dependency


def enforce_run_quota(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    plan = get_plan(current_user.tier)
    reset_period_if_due(db, current_user)

    if current_user.runs_this_period >= plan.monthly_runs:
        raise HTTPException(
            status_code=402,
            detail=(
                f"You've used all {plan.monthly_runs} board runs on the {plan.name} plan "
                f"this month. Upgrade for more."
            ),
        )

    per_minute = RUN_LIMITS_PER_MINUTE.get(plan.id, 3)
    allowed, retry_after = _window.check(f"tier_run:{current_user.id}", per_minute, 60.0)

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=(
                f"The {plan.name} plan allows {per_minute} board runs a minute. "
                f"Try again in about {int(retry_after) + 1} seconds."
            ),
            headers={"Retry-After": str(int(retry_after) + 1)},
        )

    current_user.runs_this_period += 1
    db.commit()
    return current_user


def enforce_session_quota(db: Session, user: User) -> None:
    plan = get_plan(user.tier)
    count = db.query(BusinessSession).filter(BusinessSession.user_id == user.id).count()

    if count >= plan.session_limit:
        raise HTTPException(
            status_code=402,
            detail=(
                f"The {plan.name} plan allows {plan.session_limit} active session"
                f"{'' if plan.session_limit == 1 else 's'}. Upgrade or archive one to start another."
            ),
        )
