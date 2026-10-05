from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.agents import run_ceo_agents, run_ceo_agents_stream
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


def execute_board_run(db: Session, session: BusinessSession, content: str, on_event=None, cancelled=None, job_id: str | None = None) -> Message:
    user_message = Message(session_id=session.id, role="user", content=content)
    db.add(user_message)
    db.commit()

    try:
        memory_context = recent_history(db, session.id) + retrieve_relevant_memories(
            db, session.id, content
        )
    except Exception:
        memory_context = recent_history(db, session.id)

    from app.studio_models import StudioRecord
    import json
    company_records = db.query(StudioRecord).filter(StudioRecord.session_id == session.id, StudioRecord.kind.in_(["profile", "decision", "research", "scenario", "metric"])).order_by(StudioRecord.updated_at.desc()).limit(12).all()
    memory_context.extend([f"Workspace {r.kind}: {r.title}\n{r.body[:1600]}\n{r.data[:1600]}" for r in company_records])
    preference = db.query(StudioRecord).filter_by(session_id=session.id, kind="preferences", title="Agent controls").first()
    options = json.loads(preference.data) if preference else {}
    if on_event:
        result = None
        for node, state in run_ceo_agents_stream(session.business_goal, content, memory_context, options=options):
            if cancelled and cancelled():
                raise InterruptedError("Run cancelled by user.")
            if node != "ceo":
                for report in state["reports"]:
                    on_event({"type": "agent_report", "node": node, "report": report})
            result = state
        if result is None:
            raise RuntimeError("No board result was produced.")
    else:
        result = run_ceo_agents(session.business_goal, content, memory_context, options=options)
    if cancelled and cancelled():
        raise InterruptedError("Run cancelled by user.")

    if job_id:
        # Claim finalization inside the same transaction as the canonical result.
        # A cancellation that wins first prevents every final-result write.
        claimed = db.query(Job).filter(Job.id == job_id, Job.status == "running").update(
            {"status": "done", "updated_at": datetime.utcnow()}, synchronize_session=False)
        if not claimed:
            db.rollback()
            raise InterruptedError("Run stopped before its final result was saved.")

    session.health_score = result["health_score"]
    session.runway_months = result["runway_months"]
    session.conviction_spread = result.get("conviction_spread", 0)
    session.most_sceptical = result.get("most_sceptical", "")
    session.most_convinced = result.get("most_convinced", "")

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
                source=item.get("source", "legacy-unverified"),
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

    create_predictions(db, session.id, result.get("predictions", []))
    if job_id:
        from app.studio_models import RunEvent
        job = db.get(Job, job_id)
        db.refresh(job)
        job.message_id = response.id
        job.progress_current = job.progress_total
        job.progress_label = "Verdict delivered"
        db.add(RunEvent(job_id=job_id, event=json.dumps({"type": "done", "message_id": response.id, "final": response.content, "health_score": session.health_score, "runway_months": session.runway_months})))
        db.add(StudioRecord(session_id=session.id, author_id=job.user_id, kind="activity", title="Board run completed", body=content, data=json.dumps({"job_id": job_id, "message_id": response.id})))
    db.commit()
    db.refresh(response)

    try:
        store_memory(db, session.id, "user_question", f"User asked: {content}", importance=0.65)
        store_memory(db, session.id, "ceo_decision", result["final"], importance=0.9)
        db.commit()
    except Exception:
        db.rollback()

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
