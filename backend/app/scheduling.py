"""Standing board reviews.

The board convenes on a cadence whether or not the founder opens the app.
This module owns the next-run math and the shared board-report builder so
both the manual endpoint and the cron runner produce identical output.
"""

from datetime import datetime, timedelta

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.config import get_settings
from app.email import send_board_review
from app.models import AgentReport, BusinessMemory, BusinessSession, ReviewSchedule, Task, User

CADENCE_DAYS = {"weekly": 7, "biweekly": 14, "monthly": 28}


def compute_next_run(
    cadence: str,
    weekday: int,
    hour: int,
    tz_offset_minutes: int,
    last_run_at: datetime | None = None,
    now: datetime | None = None,
) -> datetime | None:
    """Next run in UTC, or None when the cadence is off.

    Local time is UTC + tz_offset_minutes. We land on the next `weekday` at
    `hour` local, then push forward in whole weeks until the gap since the
    last run satisfies the cadence interval.
    """
    if cadence == "off":
        return None

    now = now or datetime.utcnow()
    offset = timedelta(minutes=tz_offset_minutes)
    local_now = now + offset

    candidate = local_now.replace(hour=hour, minute=0, second=0, microsecond=0)
    candidate += timedelta(days=(weekday - candidate.weekday()) % 7)
    if candidate <= local_now:
        candidate += timedelta(days=7)

    interval = CADENCE_DAYS.get(cadence, 7)
    if last_run_at is not None and interval > 7:
        earliest_local = last_run_at + offset + timedelta(days=interval)
        while candidate < earliest_local:
            candidate += timedelta(days=7)

    return candidate - offset


def build_board_meeting(db: Session, session: BusinessSession, trigger: str = "manual") -> AgentReport:
    """Score the session and persist a board report. Shared by the manual
    endpoint and the scheduled runner so both read identically."""
    tasks = db.query(Task).filter(Task.session_id == session.id).all()
    reports = (
        db.query(AgentReport)
        .filter(AgentReport.session_id == session.id, AgentReport.report_type == "agent")
        .all()
    )

    completed = len([task for task in tasks if task.status.lower() in {"done", "complete", "completed"}])
    missed_or_open = len(tasks) - completed
    average_score = round(sum(r.score for r in reports) / len(reports)) if reports else session.health_score

    bullets = [
        f"Completed tasks: {completed}",
        f"Open or missed tasks: {missed_or_open}",
        f"Business health score: {average_score}/100",
        "Next recommendation: prove demand before expanding scope or spending on acquisition.",
    ]

    if trigger == "scheduled" and missed_or_open and not completed:
        bullets.insert(
            0,
            "Nothing closed since the last review — the board is treating this as a stall, not a delay.",
        )

    summary = (
        "This board review approves continued validation, but blocks full-scale buildout until customer "
        "evidence improves. The CEO wants sharper buyer proof, clearer pricing, and weekly accountability "
        "on tasks."
    )

    report = AgentReport(
        session_id=session.id,
        agent="CEO Board",
        report_type="board",
        title="Weekly board meeting" if trigger == "manual" else "Scheduled board review",
        summary=summary,
        bullets="\n".join(bullets),
        score=average_score,
    )
    db.add(report)
    db.add(
        BusinessMemory(
            session_id=session.id,
            kind="board_report",
            content=summary,
            importance=0.85,
            embedding_text=summary,
        )
    )
    return report


def serialize_report(report: AgentReport) -> dict:
    return {
        "id": report.id,
        "agent": report.agent,
        "report_type": report.report_type,
        "title": report.title,
        "summary": report.summary,
        "bullets": report.bullets.splitlines(),
        "score": report.score,
        "created_at": report.created_at,
    }


def get_or_create_schedule(db: Session, user_id: str) -> ReviewSchedule:
    schedule = db.query(ReviewSchedule).filter(ReviewSchedule.user_id == user_id).first()
    if schedule:
        return schedule

    schedule = ReviewSchedule(user_id=user_id)
    schedule.next_run_at = compute_next_run(
        schedule.cadence, schedule.weekday, schedule.hour, schedule.tz_offset_minutes
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


def run_due_reviews(db: Session, now: datetime | None = None, limit: int = 200) -> list[dict]:
    """Generate board reviews for every schedule that has come due.

    Designed to be hit by an external cron every 15 minutes. Idempotent in
    practice: once a schedule runs, next_run_at moves forward.
    """
    now = now or datetime.utcnow()
    due = (
        db.query(ReviewSchedule)
        .filter(ReviewSchedule.cadence != "off", ReviewSchedule.next_run_at <= now)
        .limit(limit)
        .all()
    )

    results: list[dict] = []
    for schedule in due:
        session = (
            db.query(BusinessSession)
            .filter(BusinessSession.user_id == schedule.user_id)
            .order_by(desc(BusinessSession.updated_at))
            .first()
        )

        if session is None:
            # Nothing to review yet; roll the schedule forward so we don't spin.
            schedule.next_run_at = compute_next_run(
                schedule.cadence, schedule.weekday, schedule.hour, schedule.tz_offset_minutes, now, now
            )
            results.append({"user_id": schedule.user_id, "status": "skipped_no_session"})
            continue

        report = build_board_meeting(db, session, trigger="scheduled")
        schedule.last_run_at = now
        schedule.next_run_at = compute_next_run(
            schedule.cadence, schedule.weekday, schedule.hour, schedule.tz_offset_minutes, now, now
        )

        delivered = False
        if schedule.email_enabled:
            user = db.get(User, schedule.user_id)
            if user and user.email:
                delivered = send_board_review(
                    to=user.email,
                    name=user.name,
                    title=report.title,
                    score=report.score,
                    bullets=report.bullets.splitlines(),
                    app_url=get_settings().app_base_url,
                )

        results.append(
            {
                "user_id": schedule.user_id,
                "session_id": session.id,
                "status": "generated",
                "score": report.score,
                "email_sent": delivered,
            }
        )

    db.commit()
    return results
