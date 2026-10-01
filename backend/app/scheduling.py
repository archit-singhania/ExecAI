"""Standing board reviews.

The board convenes on a cadence whether or not the founder opens the app.
This module owns the next-run math and the shared board-report builder so
both the manual endpoint and the cron runner produce identical output.
"""

from datetime import datetime, timedelta, timezone as utc_timezone
from zoneinfo import ZoneInfo

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.config import get_settings
from app.email import send_board_review, send_weekly_digest
from app.models import AgentReport, BusinessMemory, BusinessSession, ReviewSchedule, Task, User
from app.studio_models import StudioRecord

CADENCE_DAYS = {"weekly": 7, "biweekly": 14, "monthly": 28}


def compute_next_run(
    cadence: str,
    weekday: int,
    hour: int,
    tz_offset_minutes: int,
    last_run_at: datetime | None = None,
    now: datetime | None = None,
    timezone: str | None = None,
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
    zone = ZoneInfo(timezone) if timezone else None
    local_now = now.replace(tzinfo=utc_timezone.utc).astimezone(zone).replace(tzinfo=None) if zone else now + offset

    candidate = local_now.replace(hour=hour, minute=0, second=0, microsecond=0)
    candidate += timedelta(days=(weekday - candidate.weekday()) % 7)
    if candidate <= local_now:
        candidate += timedelta(days=7)

    interval = CADENCE_DAYS.get(cadence, 7)
    if last_run_at is not None and interval > 7:
        last_local = last_run_at.replace(tzinfo=utc_timezone.utc).astimezone(zone).replace(tzinfo=None) if zone else last_run_at + offset
        earliest_local = last_local + timedelta(days=interval)
        while candidate < earliest_local:
            candidate += timedelta(days=7)

    return candidate.replace(tzinfo=zone).astimezone(utc_timezone.utc).replace(tzinfo=None) if zone else candidate - offset


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
    if not reports and not tasks:
        from fastapi import HTTPException
        raise HTTPException(422, "Create tasks or convene the board before reviewing this workspace.")
    average_score = round(sum(r.score for r in reports) / len(reports)) if reports else round(completed / len(tasks) * 100)

    bullets = [
        f"Completed tasks: {completed}",
        f"Open or missed tasks: {missed_or_open}",
        f"Specialist assessment average: {average_score}/100 across {len(reports)} reports" if reports else f"Task completion score: {average_score}/100",
        "Review open tasks, evidence and assumptions before approving further scope or spend.",
    ]

    if trigger == "scheduled" and missed_or_open and not completed:
        bullets.insert(
            0,
            "None of the currently tracked tasks is complete. Inspect dependencies and blockers.",
        )

    summary = f"Execution review: {completed} of {len(tasks)} tracked tasks complete, with {missed_or_open} open. This workspace contains {len(reports)} specialist reports. The score summarizes recorded assessments or task completion; it is not a measurement of business health. Review the evidence and decide the next move."

    report = AgentReport(
        session_id=session.id,
        agent="CEO Board",
        report_type="board",
        title="Weekly board meeting" if trigger == "manual" else "Scheduled board review",
        summary=summary,
        bullets="\n".join(bullets),
        score=average_score,
        source="execution-review-rules",
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
        "source": report.source,
        "created_at": report.created_at,
    }


def get_or_create_schedule(db: Session, user_id: str) -> ReviewSchedule:
    schedule = db.query(ReviewSchedule).filter(ReviewSchedule.user_id == user_id).first()
    if schedule:
        return schedule

    schedule = ReviewSchedule(user_id=user_id, cadence="off", weekday=0, hour=9, tz_offset_minutes=0, email_enabled=False)
    schedule.next_run_at = compute_next_run(
        schedule.cadence, schedule.weekday, schedule.hour, schedule.tz_offset_minutes
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


def run_weekly_digests(db: Session, now: datetime | None = None, limit: int = 500) -> list[dict]:
    now = now or datetime.utcnow()
    since = now - timedelta(days=7)

    users = (
        db.query(User)
        .join(ReviewSchedule, ReviewSchedule.user_id == User.id)
        .filter(ReviewSchedule.email_enabled.is_(True), ReviewSchedule.cadence != "off")
        .limit(limit)
        .all()
    )

    results: list[dict] = []

    for user in users:
        sessions = db.query(BusinessSession).filter(BusinessSession.user_id == user.id).all()
        if not sessions:
            continue

        session_ids = [session.id for session in sessions]
        tasks = db.query(Task).filter(Task.session_id.in_(session_ids)).all()

        done = len(
            [
                task
                for task in tasks
                if task.status.lower() in {"done", "complete", "completed"}
                and task.completed_at
                and task.completed_at >= since
            ]
        )
        open_tasks = [
            task for task in tasks if task.status.lower() not in {"done", "complete", "completed"}
        ]
        high_priority = [task.title for task in open_tasks if task.priority == "High"]

        health = round(sum(session.health_score for session in sessions) / len(sessions))

        delivered = send_weekly_digest(
            to=user.email,
            name=user.name,
            health=health,
            done=done,
            open_tasks=len(open_tasks),
            high_priority=high_priority,
            app_url=get_settings().app_base_url,
        )

        results.append({"user_id": user.id, "sent": delivered, "done": done})

    return results


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
        from app.plans import get_plan
        account = db.get(User, schedule.user_id)
        if not account or not get_plan(account.tier).scheduled_reviews:
            schedule.next_run_at = compute_next_run(schedule.cadence, schedule.weekday, schedule.hour, schedule.tz_offset_minutes, now, now, timezone=schedule.timezone)
            results.append({"user_id": schedule.user_id, "status": "skipped_entitlement"})
            continue
        session = (
            db.query(BusinessSession)
            .filter(BusinessSession.user_id == schedule.user_id, BusinessSession.id.notin_(db.query(StudioRecord.session_id).filter_by(kind="archive")))
            .order_by(desc(BusinessSession.updated_at))
            .first()
        )

        if session is None:
            # Nothing to review yet; roll the schedule forward so we don't spin.
            schedule.next_run_at = compute_next_run(
                schedule.cadence, schedule.weekday, schedule.hour, schedule.tz_offset_minutes, now, now, timezone=schedule.timezone
            )
            results.append({"user_id": schedule.user_id, "status": "skipped_no_session"})
            continue

        try:
            report = build_board_meeting(db, session, trigger="scheduled")
        except Exception as error:
            from fastapi import HTTPException
            if not isinstance(error, HTTPException) or error.status_code != 422:
                raise
            schedule.next_run_at = compute_next_run(schedule.cadence, schedule.weekday, schedule.hour, schedule.tz_offset_minutes, now, now, timezone=schedule.timezone)
            results.append({"user_id": schedule.user_id, "status": "skipped_no_history"})
            continue
        schedule.last_run_at = now
        schedule.next_run_at = compute_next_run(
            schedule.cadence, schedule.weekday, schedule.hour, schedule.tz_offset_minutes, now, now, timezone=schedule.timezone
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
        "source": report.source,
                "email_sent": delivered,
            }
        )

    db.commit()
    return results
