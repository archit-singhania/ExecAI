from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.agents import run_ceo_agents
from app.memory import retrieve_relevant_memories, store_memory
from app.models import AgentReport, BusinessSession, Job, Message, Task
from app.predictions import create_predictions


def recent_history(db: Session, session_id: str, limit: int = 8) -> list[str]:
    rows = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()
    )
    return [f"{row.role}: {row.content}" for row in reversed(rows)]


def execute_board_run(db: Session, session: BusinessSession, content: str) -> Message:
    user_message = Message(session_id=session.id, role="user", content=content)
    db.add(user_message)

    try:
        memory_context = recent_history(db, session.id) + retrieve_relevant_memories(
            db, session.id, content
        )
    except Exception:
        memory_context = recent_history(db, session.id)

    result = run_ceo_agents(session.business_goal, content, memory_context)

    session.health_score = result["health_score"]
    session.runway_months = result["runway_months"]

    response = Message(session_id=session.id, role="assistant", content=result["final"])
    db.add(response)
    db.flush()

    for item in result["reports"]:
        db.add(
            AgentReport(
                session_id=session.id,
                agent=item["agent"],
                report_type="agent",
                title=item["title"],
                summary=item["summary"],
                bullets="\n".join(item["bullets"]),
                score=item["score"],
            )
        )

    for item in result["tasks"]:
        exists = (
            db.query(Task)
            .filter(Task.session_id == session.id, Task.title == item["title"])
            .first()
        )
        if not exists:
            db.add(
                Task(
                    session_id=session.id,
                    title=item["title"],
                    description=item.get("description", ""),
                    priority=item["priority"],
                    status=item["status"],
                    created_by_agent=item["created_by_agent"],
                )
            )

    db.commit()
    db.refresh(response)

    try:
        create_predictions(db, session.id, result.get("predictions", []))
        db.commit()
    except Exception:
        db.rollback()

    try:
        store_memory(db, session.id, "user_question", f"User asked: {content}", importance=0.65)
        store_memory(db, session.id, "ceo_decision", result["final"], importance=0.9)
        db.commit()
    except Exception:
        pass

    return response


def claim_stale_jobs(db: Session, older_than_minutes: int = 15) -> int:
    cutoff = datetime.utcnow() - timedelta(minutes=older_than_minutes)
    stale = (
        db.query(Job)
        .filter(Job.status == "running", Job.updated_at < cutoff)
        .all()
    )

    for job in stale:
        job.status = "failed"
        job.error = "The run stopped unexpectedly. Try again."
        job.updated_at = datetime.utcnow()

    if stale:
        db.commit()

    return len(stale)
