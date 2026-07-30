import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.models import AgentReport, BusinessSession, SharedReport, User
from app.ratelimit import limit_by_ip, limit_by_user

router = APIRouter(prefix="/api/share", tags=["share"])

create_limit = limit_by_user("share_create", limit=20, window_seconds=3600)
view_limit = limit_by_ip("share_view", limit=120, window_seconds=3600)


def _owned_report(report_id: str, db: Session, user: User) -> AgentReport:
    report = db.get(AgentReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    session = db.get(BusinessSession, report.session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Report not found.")

    return report


@router.post("/reports/{report_id}")
def create_share_link(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(create_limit),
):
    report = _owned_report(report_id, db, current_user)

    existing = (
        db.query(SharedReport)
        .filter(SharedReport.report_id == report.id, SharedReport.revoked_at.is_(None))
        .first()
    )

    if existing:
        slug = existing.slug
    else:
        slug = secrets.token_urlsafe(9)
        db.add(SharedReport(slug=slug, report_id=report.id, user_id=current_user.id))
        db.commit()

    return {"slug": slug, "url": f"{get_settings().app_base_url}/r/{slug}"}


@router.delete("/reports/{report_id}")
def revoke_share_link(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = _owned_report(report_id, db, current_user)

    db.query(SharedReport).filter(
        SharedReport.report_id == report.id, SharedReport.revoked_at.is_(None)
    ).update({"revoked_at": datetime.utcnow()}, synchronize_session=False)
    db.commit()

    return {"revoked": True}


@router.get("/{slug}")
def view_shared_report(
    slug: str,
    db: Session = Depends(get_db),
    _: None = Depends(view_limit),
):
    shared = db.query(SharedReport).filter(SharedReport.slug == slug).first()

    if not shared or shared.revoked_at is not None:
        raise HTTPException(status_code=404, detail="This link is no longer available.")

    report = db.get(AgentReport, shared.report_id)
    if not report:
        raise HTTPException(status_code=404, detail="This link is no longer available.")

    shared.view_count += 1
    shared.last_viewed_at = datetime.utcnow()
    db.commit()

    owner = db.get(User, shared.user_id)

    return {
        "title": report.title,
        "agent": report.agent,
        "report_type": report.report_type,
        "summary": report.summary,
        "bullets": report.bullets.splitlines(),
        "score": report.score,
        "created_at": report.created_at,
        "author": owner.name if owner else "A founder",
    }
