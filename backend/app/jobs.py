"""Database-backed runs, event replay and bounded worker concurrency."""
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from threading import Lock
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.access import workspace_access
from app.board_runner import execute_board_run
from app.database import SessionLocal, get_db
from app.entitlements import enforce_run_quota
from app.models import BusinessSession, Job, User
from app.schemas import MessageCreate
from app.studio_models import RunEvent, StudioRecord
router = APIRouter(prefix="/api/jobs", tags=["jobs"])
_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ceo-board")
_lock = Lock()
_active: set[str] = set()

def queue_board_run(db, user, session_id, content, request):
    workspace_access(db, session_id, user, write=True)
    with _lock:
        existing = db.query(Job).filter(Job.session_id == session_id, Job.status.in_(["queued", "running"])).first()
        if existing:
            return existing
        enforce_run_quota(request, db, user)
        job = Job(user_id=user.id, session_id=session_id, prompt=content, progress_total=9)
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

def ensure_worker(job_id):
    with _lock:
        if job_id in _active:
            return
        _active.add(job_id)
    _pool.submit(_run_board_job, job_id)

def _run_board_job(job_id):
    db = SessionLocal()
    try:
        claimed = db.query(Job).filter(Job.id == job_id, Job.status == "queued").update({"status": "running", "updated_at": datetime.utcnow()}, synchronize_session=False)
        db.commit()
        if not claimed:
            return
        job = db.get(Job, job_id)
        session = db.get(BusinessSession, job.session_id)
        if not session:
            raise RuntimeError("Workspace no longer exists.")
        def cancelled():
            with SessionLocal() as check:
                current = check.get(Job, job_id)
                return not current or current.status != "running"
        def event(payload):
            with SessionLocal() as events:
                current = events.get(Job, job_id)
                if not current or current.status != "running":
                    raise InterruptedError("Run cancelled.")
                current.progress_current += 1
                current.progress_label = payload["report"]["agent"] + " reported"
                current.updated_at = datetime.utcnow()
                events.add(RunEvent(job_id=job_id, event=json.dumps(payload)))
                events.commit()
        execute_board_run(db, session, job.prompt, on_event=event, cancelled=cancelled, job_id=job_id)
    except Exception as exc:
        import logging
        logging.getLogger("ceoai").exception("Board job failed: %s", job_id)
        db.rollback()
        job = db.get(Job, job_id)
        if job and job.status in {"queued", "running"}:
            job.status = "failed"
            job.error = "Run interrupted; retry to continue." if isinstance(exc, InterruptedError) else "Board execution failed. Retry or check provider configuration."
            job.updated_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()
        with _lock:
            _active.discard(job_id)

def recover_runs():
    with SessionLocal() as db:
        db.query(Job).filter(Job.status == "running", Job.updated_at < datetime.utcnow() - timedelta(minutes=15)).update({"status": "failed", "error": "Worker lease expired. Retry this run."}, synchronize_session=False)
        queued = [j.id for j in db.query(Job).filter(Job.status == "queued").all()]
        db.commit()
    for job_id in queued:
        ensure_worker(job_id)

def owned_job(db, job_id, user):
    job = db.get(Job, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(404, "Run not found.")
    return job

def serialize_job(db, job):
    events = [json.loads(e.event) for e in db.query(RunEvent).filter_by(job_id=job.id).order_by(RunEvent.id).all()]
    final = next((e for e in reversed(events) if e["type"] == "done"), {})
    return {"id": job.id, "session_id": job.session_id, "status": job.status, "progress_current": job.progress_current, "progress_total": job.progress_total, "progress_label": job.progress_label, "error": job.error, "final": final.get("final", ""), "message_id": job.message_id, "reports": [e["report"] for e in events if e["type"] == "agent_report"], "updated_at": job.updated_at}

@router.post("/board-run/{session_id}")
def start_board_run(session_id: str, payload: MessageCreate, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    job = queue_board_run(db, user, session_id, payload.content, request)
    ensure_worker(job.id)
    return {"job_id": job.id, "status": job.status, "already_running": job.status == "running"}

@router.get("")
def list_jobs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    recover_runs()
    return [serialize_job(db, j) for j in db.query(Job).filter_by(user_id=user.id).order_by(Job.created_at.desc()).limit(30)]

@router.get("/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    job = owned_job(db, job_id, user)
    if job.status == "queued":
        ensure_worker(job.id)
    return serialize_job(db, job)

@router.post("/{job_id}/cancel")
def cancel_job(job_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    job = owned_job(db, job_id, user)
    db.query(Job).filter(Job.id == job_id, Job.status.in_(["queued", "running"])).update(
        {"status": "cancelled", "updated_at": datetime.utcnow()}, synchronize_session=False)
    db.commit()
    db.refresh(job)
    return serialize_job(db, job)

@router.post("/{job_id}/retry")
def retry_job(job_id: str, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    previous = owned_job(db, job_id, user)
    if previous.status not in {"failed", "cancelled"}:
        raise HTTPException(409, "Only failed or cancelled runs can be retried.")
    job = queue_board_run(db, user, previous.session_id, previous.prompt, request)
    ensure_worker(job.id)
    return {"job_id": job.id, "status": job.status}
