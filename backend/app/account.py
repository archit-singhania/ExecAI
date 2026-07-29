from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, hash_password, verify_password
from app.database import get_db
from app.email import send_password_changed
from app.halcyon.models import HalcyonSession, HalcyonTurn
from app.models import (
    AgentReport,
    BusinessMemory,
    BusinessSession,
    Message,
    PasswordResetToken,
    ReviewSchedule,
    Task,
    User,
)
from app.plans import get_plan
from app.ratelimit import limit_by_user
from app.schemas import AccountDelete, PasswordChange, ProfileUpdate, UserOut

router = APIRouter(prefix="/api/account", tags=["account"])

password_change_limit = limit_by_user("password_change", limit=5, window_seconds=900)
export_limit = limit_by_user("data_export", limit=3, window_seconds=3600)
delete_limit = limit_by_user("account_delete", limit=3, window_seconds=3600)


@router.patch("/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.name = payload.name.strip()
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/password")
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(password_change_limit),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="That isn't your current password.")

    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="The new password matches the old one.")

    current_user.hashed_password = hash_password(payload.new_password)

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == current_user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": datetime.utcnow()}, synchronize_session=False)

    db.commit()
    send_password_changed(to=current_user.email, name=current_user.name)

    return {"detail": "Password updated."}


@router.get("/export")
def export_everything(
    db: Session = Depends(get_db),
    current_user: User = Depends(export_limit),
):
    sessions = (
        db.query(BusinessSession).filter(BusinessSession.user_id == current_user.id).all()
    )
    session_ids = [session.id for session in sessions]

    messages = (
        db.query(Message).filter(Message.session_id.in_(session_ids)).all() if session_ids else []
    )
    reports = (
        db.query(AgentReport).filter(AgentReport.session_id.in_(session_ids)).all()
        if session_ids
        else []
    )
    tasks = db.query(Task).filter(Task.session_id.in_(session_ids)).all() if session_ids else []
    memories = (
        db.query(BusinessMemory).filter(BusinessMemory.session_id.in_(session_ids)).all()
        if session_ids
        else []
    )

    halcyon_sessions = (
        db.query(HalcyonSession).filter(HalcyonSession.user_id == current_user.id).all()
    )
    halcyon_ids = [session.id for session in halcyon_sessions]
    halcyon_turns = (
        db.query(HalcyonTurn).filter(HalcyonTurn.session_id.in_(halcyon_ids)).all()
        if halcyon_ids
        else []
    )

    schedule = (
        db.query(ReviewSchedule).filter(ReviewSchedule.user_id == current_user.id).first()
    )

    plan = get_plan(current_user.tier)

    return {
        "exported_at": datetime.utcnow(),
        "account": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "created_at": current_user.created_at,
            "tier": plan.id,
            "subscription_status": current_user.subscription_status,
        },
        "review_schedule": (
            {
                "cadence": schedule.cadence,
                "weekday": schedule.weekday,
                "hour": schedule.hour,
                "email_enabled": schedule.email_enabled,
                "last_run_at": schedule.last_run_at,
            }
            if schedule
            else None
        ),
        "sessions": [
            {
                "id": session.id,
                "title": session.title,
                "business_goal": session.business_goal,
                "health_score": session.health_score,
                "runway_months": session.runway_months,
                "created_at": session.created_at,
            }
            for session in sessions
        ],
        "messages": [
            {
                "session_id": message.session_id,
                "role": message.role,
                "content": message.content,
                "created_at": message.created_at,
            }
            for message in messages
        ],
        "reports": [
            {
                "session_id": report.session_id,
                "agent": report.agent,
                "report_type": report.report_type,
                "title": report.title,
                "summary": report.summary,
                "bullets": report.bullets.splitlines(),
                "score": report.score,
                "created_at": report.created_at,
            }
            for report in reports
        ],
        "tasks": [
            {
                "session_id": task.session_id,
                "title": task.title,
                "description": task.description,
                "priority": task.priority,
                "status": task.status,
                "created_by_agent": task.created_by_agent,
                "created_at": task.created_at,
                "completed_at": task.completed_at,
            }
            for task in tasks
        ],
        "memories": [
            {
                "session_id": memory.session_id,
                "kind": memory.kind,
                "content": memory.content,
                "importance": memory.importance,
                "created_at": memory.created_at,
            }
            for memory in memories
        ],
        "halcyon_sessions": [
            {
                "id": session.id,
                "world": session.world,
                "turn_count": session.turn_count,
                "started_at": session.started_at,
                "ended_at": session.ended_at,
            }
            for session in halcyon_sessions
        ],
        "halcyon_turns": [
            {
                "session_id": turn.session_id,
                "turn_index": turn.turn_index,
                "text": turn.text,
                "affect_label": turn.affect_label,
                "created_at": turn.created_at,
            }
            for turn in halcyon_turns
        ],
    }


@router.delete("")
def delete_account(
    payload: AccountDelete,
    db: Session = Depends(get_db),
    current_user: User = Depends(delete_limit),
):
    if payload.confirmation.strip().upper() != "DELETE":
        raise HTTPException(status_code=400, detail="Type DELETE to confirm.")

    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="That password is not correct.")

    if current_user.subscription_status == "active":
        raise HTTPException(
            status_code=409,
            detail="Cancel your subscription in the billing portal before deleting the account.",
        )

    sessions = db.query(BusinessSession).filter(BusinessSession.user_id == current_user.id).all()
    session_ids = [session.id for session in sessions]

    if session_ids:
        db.query(Message).filter(Message.session_id.in_(session_ids)).delete(
            synchronize_session=False
        )
        db.query(AgentReport).filter(AgentReport.session_id.in_(session_ids)).delete(
            synchronize_session=False
        )
        db.query(Task).filter(Task.session_id.in_(session_ids)).delete(synchronize_session=False)
        db.query(BusinessMemory).filter(BusinessMemory.session_id.in_(session_ids)).delete(
            synchronize_session=False
        )
        db.query(BusinessSession).filter(BusinessSession.id.in_(session_ids)).delete(
            synchronize_session=False
        )

    halcyon_sessions = (
        db.query(HalcyonSession).filter(HalcyonSession.user_id == current_user.id).all()
    )
    halcyon_ids = [session.id for session in halcyon_sessions]

    if halcyon_ids:
        db.query(HalcyonTurn).filter(HalcyonTurn.session_id.in_(halcyon_ids)).delete(
            synchronize_session=False
        )
        db.query(HalcyonSession).filter(HalcyonSession.id.in_(halcyon_ids)).delete(
            synchronize_session=False
        )

    db.query(ReviewSchedule).filter(ReviewSchedule.user_id == current_user.id).delete(
        synchronize_session=False
    )
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == current_user.id).delete(
        synchronize_session=False
    )

    db.delete(current_user)
    db.commit()

    return {"detail": "Account deleted."}
