from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.board_runner import claim_stale_jobs, execute_board_run
from app.database import SessionLocal, get_db
from app.entitlements import enforce_run_quota
from app.logging_setup import log_event
from app.models import AgentReport, BusinessSession, Job, Message, User
from app.schemas import MessageCreate

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _run_board_job(job_id: str) -> None:
    db = SessionLocal()

    try:
        job = db.get(Job, job_id)
        if not job or job.status != "queued":
            return

        job.status = "running"
        job.progress_label = "Assembling the boardroom"
        db.commit()

        session = db.get(BusinessSession, job.session_id)
        if not session:
            job.status = "failed"
            job.error = "That session no longer exists."
            db.commit()
            return

        response = execute_board_run(db, session, job.prompt)

        job.status = "done"
        job.progress_current = job.progress_total
        job.progress_label = "Verdict delivered"
        job.message_id = response.id
        db.commit()

        log_event("board job finished", job_id=job.id, session_id=session.id)

    except Exception as exc:
        db.rollback()
        job = db.get(Job, job_id)
        if job:
            job.status = "failed"
            job.error = str(exc)[:500]
            db.commit()
        log_event("board job failed", job_id=job_id, error=str(exc)[:200])
    finally:
        db.close()


@router.post("/board-run/{session_id}")
def start_board_run(
    session_id: str,
    payload: MessageCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(enforce_run_quota),
):
    session = db.get(BusinessSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found.")

    active = (
        db.query(Job)
        .filter(
            Job.session_id == session_id,
            Job.status.in_(["queued", "running"]),
        )
        .first()
    )
    if active:
        return {"job_id": active.id, "status": active.status, "already_running": True}

    job = Job(
        user_id=current_user.id,
        session_id=session_id,
        kind="board_run",
        status="queued",
        progress_total=9,
        prompt=payload.content,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background.add_task(_run_board_job, job.id)
    log_event("board job queued", job_id=job.id, session_id=session_id)

    return {"job_id": job.id, "status": "queued", "already_running": False}


@router.get("/{job_id}")
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    claim_stale_jobs(db)

    job = db.get(Job, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found.")

    reports = []
    final = ""

    if job.status == "done":
        reports = (
            db.query(AgentReport)
            .filter(AgentReport.session_id == job.session_id, AgentReport.report_type == "agent")
            .order_by(AgentReport.created_at.desc())
            .limit(9)
            .all()
        )
        reports = list(reversed(reports))

        if job.message_id:
            message = db.get(Message, job.message_id)
            final = message.content if message else ""

    return {
        "id": job.id,
        "status": job.status,
        "progress_current": job.progress_current,
        "progress_total": job.progress_total,
        "progress_label": job.progress_label,
        "error": job.error if job.status == "failed" else None,
        "final": final,
        "message_id": job.message_id,
        "reports": [
            {
                "id": report.id,
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
        "updated_at": job.updated_at or datetime.utcnow(),
    }
