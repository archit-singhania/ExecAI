from datetime import datetime, timedelta
import hashlib
import json
import secrets

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session
from app.agents import run_ceo_agents, run_ceo_agents_stream
from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.email import send_password_changed, send_password_reset, send_welcome
from app.llm import transcribe_audio
from app.config import get_settings
from app.database import Base, engine, get_db, SessionLocal
from app.memory import retrieve_relevant_memories, search_memory_rows, store_memory
from app.models import AgentReport, BusinessMemory, BusinessSession, Message, PasswordResetToken, ReviewSchedule, Task, User
from app.halcyon.models import HalcyonSession, HalcyonTurn
from app.halcyon import router as halcyon_router
from app.billing import router as billing_router
from app.account import router as account_router
from app.share import router as share_router
from app.jobs import router as jobs_router
from app.predictions import router as predictions_router
from app.analytics import router as analytics_router
from app.speech_routes import router as speech_router
from app.entitlements import enforce_run_quota, enforce_session_quota, require_feature
from app.logging_setup import RequestContextMiddleware, configure_logging, log_event
from app.store import store_backend
from app.scheduling import (
    build_board_meeting,
    compute_next_run,
    get_or_create_schedule,
    run_due_reviews,
    run_weekly_digests,
    serialize_report,
)
from app.ratelimit import limit_by_ip, limit_by_user
from app.schemas import (
    AgentReportOut,
    DashboardOut,
    MemoryOut,
    MemorySearchOut,
    MessageCreate,
    MessageOut,
    PasswordResetConfirm,
    PasswordResetRequest,
    ReportExportOut,
    ReviewScheduleIn,
    ReviewScheduleOut,
    SessionCreate,
    SessionOut,
    TaskOut,
    TaskUpdate,
    TokenOut,
    UserCreate,
    UserLogin,
    UserOut,
)


settings = get_settings()

if settings.sentry_dsn:
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.app_env,
            traces_sample_rate=0.1,
            send_default_pii=False,
            max_request_body_size="never",
        )
        print("[sentry] Error tracking enabled.")
    except ImportError:
        print("[sentry] SENTRY_DSN is set but sentry-sdk isn't installed. Skipping.")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CEO.ai API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Starlette's default 500 handling doesn't always run through
    CORSMiddleware, so an unhandled exception shows up in the browser as a
    generic 'blocked by CORS' error instead of the real message. This makes
    sure the actual error always reaches the frontend (and the traceback
    always reaches this terminal)."""
    import traceback

    traceback.print_exc()
    origin = request.headers.get("origin")
    headers = {}
    if origin and (origin in settings.cors_origin_list or "*" in settings.cors_origin_list):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(status_code=500, content={"detail": str(exc)}, headers=headers)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/llm/status")
def llm_status(current_user: User = Depends(get_current_user)):
    from app import llm_router

    return llm_router.status()


app.include_router(halcyon_router)
app.include_router(billing_router)
app.include_router(account_router)
app.include_router(share_router)
app.include_router(jobs_router)
app.include_router(predictions_router)
app.include_router(analytics_router)
app.include_router(speech_router)

configure_logging(as_json=settings.app_env != "development")
app.add_middleware(RequestContextMiddleware)
log_event("startup", env=settings.app_env, store=store_backend())

agent_run_limit = limit_by_user("agent_run", limit=10, window_seconds=60)
board_limit = limit_by_user("board_meeting", limit=6, window_seconds=300)
transcribe_limit = limit_by_user("transcribe", limit=30, window_seconds=60)

forgot_limit = limit_by_ip("forgot_password", limit=5, window_seconds=900)
reset_limit = limit_by_ip("reset_password", limit=10, window_seconds=900)


@app.post("/api/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...), current_user: User = Depends(transcribe_limit)):
    """STT fallback for browsers without native SpeechRecognition (Firefox, some
    Safari builds). VoiceStage's mic button records via MediaRecorder and posts
    the clip here when window.SpeechRecognition is unavailable."""
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio upload.")
    text = transcribe_audio(audio_bytes, file.filename or "audio.webm")
    if text is None:
        raise HTTPException(
            status_code=503,
            detail="Voice transcription isn't configured (set LLM_PROVIDER=groq and GROQ_API_KEY in backend/.env).",
        )
    return {"text": text.strip()}


@app.post("/api/auth/signup", response_model=TokenOut)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    send_welcome(to=user.email, name=user.name, app_url=settings.app_base_url)
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.post("/api/auth/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    invalid = HTTPException(status_code=401, detail="Incorrect email or password.")
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise invalid

    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.get("/api/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/api/auth/forgot-password")
def forgot_password(
    payload: PasswordResetRequest,
    db: Session = Depends(get_db),
    _: None = Depends(forgot_limit),
):
    """Always reports success.

    Saying "no account with that email" would turn this endpoint into a free
    membership oracle — anyone could enumerate which addresses have accounts.
    The cost of the ambiguity is one confused user; the cost of the leak is
    every user's email address being confirmable.
    """
    generic = {
        "detail": "If that email has an account, a reset link is on its way."
    }

    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        return generic

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": datetime.utcnow()}, synchronize_session=False)

    raw_token = secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
            expires_at=datetime.utcnow() + timedelta(minutes=settings.password_reset_minutes),
        )
    )
    db.commit()

    send_password_reset(
        to=user.email,
        name=user.name,
        reset_url=f"{settings.app_base_url}/reset-password?token={raw_token}",
        minutes_valid=settings.password_reset_minutes,
    )

    return generic


@app.post("/api/auth/reset-password", response_model=TokenOut)
def reset_password(
    payload: PasswordResetConfirm,
    db: Session = Depends(get_db),
    _: None = Depends(reset_limit),
):
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()

    record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash)
        .first()
    )

    invalid = HTTPException(
        status_code=400,
        detail="This reset link is invalid or has expired. Request a new one.",
    )

    if not record or record.used_at is not None or record.expires_at < datetime.utcnow():
        raise invalid

    user = db.get(User, record.user_id)
    if not user:
        raise invalid

    user.hashed_password = hash_password(payload.password)
    record.used_at = datetime.utcnow()

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": datetime.utcnow()}, synchronize_session=False)

    db.commit()
    db.refresh(user)

    send_password_changed(to=user.email, name=user.name)

    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.post("/api/sessions", response_model=SessionOut)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enforce_session_quota(db, current_user)
    title = payload.business_goal.strip()[:72]
    session = BusinessSession(
        user_id=current_user.id,
        title=title,
        business_goal=payload.business_goal,
        health_score=72,
        runway_months=6,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@app.get("/api/sessions", response_model=list[SessionOut])
def list_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(BusinessSession)
        .filter(BusinessSession.user_id == current_user.id)
        .order_by(desc(BusinessSession.updated_at))
        .all()
    )


@app.get("/api/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.get(BusinessSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _owned_session(session_id: str, db: Session, current_user: User) -> BusinessSession:
    session = db.get(BusinessSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _recent_history(db: Session, session_id: str, limit: int = 6) -> list[str]:
    """Last few turns of this conversation, oldest first, so agents have
    short-term context on top of the long-term RAG memory search."""
    recent = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(desc(Message.created_at))
        .limit(limit)
        .all()
    )
    recent.reverse()
    speaker = {"user": "Founder", "assistant": "CEO"}
    return [f"{speaker.get(m.role, m.role)}: {m.content[:300]}" for m in recent]


@app.get("/api/sessions/{session_id}/messages", response_model=list[MessageOut])
def list_messages(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _owned_session(session_id, db, current_user)
    messages = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at)
        .all()
    )
    return [MessageOut.model_validate(message).model_copy(update={"reports": []}) for message in messages]


@app.get("/api/sessions/{session_id}/reports", response_model=list[AgentReportOut])
def list_reports(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _owned_session(session_id, db, current_user)
    reports = (
        db.query(AgentReport)
        .filter(AgentReport.session_id == session_id)
        .order_by(desc(AgentReport.created_at))
        .all()
    )
    return [
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
    ]


@app.get("/api/reports/{report_id}", response_model=AgentReportOut)
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.get(AgentReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    _owned_session(report.session_id, db, current_user)
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


@app.get("/api/reports/{report_id}/export", response_model=ReportExportOut)
def export_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("exports", "Markdown export")),
):
    report = db.get(AgentReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    _owned_session(report.session_id, db, current_user)
    bullets = "\n".join(f"- {bullet}" for bullet in report.bullets.splitlines())
    markdown = (
        f"# {report.title}\n\n"
        f"**Agent:** {report.agent}\n\n"
        f"**Type:** {report.report_type}\n\n"
        f"**Score:** {report.score}/100\n\n"
        f"## Summary\n\n{report.summary}\n\n"
        f"## Key Points\n\n{bullets if bullets else '- No bullet points recorded.'}\n"
    )
    filename = f"{report.title.lower().replace(' ', '-')[:48]}.md"
    return {"id": report.id, "filename": filename, "markdown": markdown}


@app.get("/api/sessions/{session_id}/tasks", response_model=list[TaskOut])
def list_tasks(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _owned_session(session_id, db, current_user)
    return (
        db.query(Task)
        .filter(Task.session_id == session_id)
        .order_by(desc(Task.created_at))
        .all()
    )


@app.patch("/api/tasks/{task_id}", response_model=TaskOut)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    _owned_session(task.session_id, db, current_user)
    task.status = payload.status
    task.completed_at = datetime.utcnow() if payload.status.lower() in {"done", "complete", "completed"} else None
    db.commit()
    db.refresh(task)
    return task


@app.get("/api/sessions/{session_id}/memories", response_model=list[MemoryOut])
def list_memories(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _owned_session(session_id, db, current_user)
    return (
        db.query(BusinessMemory)
        .filter(BusinessMemory.session_id == session_id)
        .order_by(desc(BusinessMemory.created_at))
        .limit(20)
        .all()
    )


@app.get("/api/sessions/{session_id}/memories/search", response_model=MemorySearchOut)
def search_memories(
    session_id: str,
    q: str = Query(min_length=1, max_length=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _owned_session(session_id, db, current_user)
    results = search_memory_rows(db, session_id, q, limit=10)
    return {"query": q, "results": results}


@app.post("/api/sessions/{session_id}/messages", response_model=MessageOut)
def send_message(
    session_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(enforce_run_quota),
):
    session = _owned_session(session_id, db, current_user)

    user_message = Message(session_id=session.id, role="user", content=payload.content)
    db.add(user_message)

    try:
        memory_context = _recent_history(db, session.id) + retrieve_relevant_memories(db, session.id, payload.content)
    except Exception:
        import traceback

        traceback.print_exc()
        memory_context = _recent_history(db, session.id)

    result = run_ceo_agents(session.business_goal, payload.content, memory_context)
    session.health_score = result["health_score"]
    session.runway_months = result["runway_months"]

    response = Message(session_id=session.id, role="assistant", content=result["final"])
    db.add(response)
    db.flush()

    reports = []
    for item in result["reports"]:
        report = AgentReport(
            session_id=session.id,
            agent=item["agent"],
            report_type="agent",
            title=item["title"],
            summary=item["summary"],
            bullets="\n".join(item["bullets"]),
            score=item["score"],
        )
        db.add(report)
        reports.append(report)

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
        store_memory(db, session.id, "user_question", f"User asked: {payload.content}", importance=0.65)
        store_memory(db, session.id, "ceo_decision", result["final"], importance=0.9)
        db.commit()
    except Exception:
        import traceback

        traceback.print_exc()
        db.rollback()

    return MessageOut(
        id=response.id,
        role=response.role,
        content=response.content,
        created_at=response.created_at,
        reports=[
            {
                "agent": report.agent,
                "id": report.id,
                "report_type": report.report_type,
                "title": report.title,
                "summary": report.summary,
                "bullets": report.bullets.splitlines(),
                "score": report.score,
                "created_at": report.created_at,
            }
            for report in reports
        ],
    )


from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/api/sessions/{session_id}/messages/ws")
async def send_message_ws(websocket: WebSocket, session_id: str, db: Session = Depends(get_db)):
    await websocket.accept()
    try:
        raw_data = await websocket.receive_text()
        data = json.loads(raw_data)
        content = data.get("content", "")
        token = data.get("token")
        
        # Super simple auth for WS
        if not token:
            await websocket.send_json({"type": "error", "message": "Unauthorized"})
            await websocket.close()
            return
            
        from app.auth import get_current_user_ws
        try:
            current_user = get_current_user_ws(token, db)
        except Exception:
            await websocket.send_json({"type": "error", "message": "Unauthorized"})
            await websocket.close()
            return

        session = _owned_session(session_id, db, current_user)
        business_goal = session.business_goal
        session_id_value = session.id

        user_message = Message(session_id=session_id_value, role="user", content=content)
        db.add(user_message)
        db.commit()

        try:
            memory_context = _recent_history(db, session_id_value) + retrieve_relevant_memories(
                db, session_id_value, content
            )
        except Exception:
            import traceback
            traceback.print_exc()
            memory_context = _recent_history(db, session_id_value)

        seen = 0
        final_state = None
        for node_name, state in run_ceo_agents_stream(business_goal, content, memory_context):
            if node_name != "ceo":
                for report in state["reports"][seen:]:
                    await websocket.send_json({'type': 'agent_report', 'node': node_name, 'report': report})
                seen = len(state["reports"])
            final_state = state

        if not final_state:
             await websocket.send_json({"type": "error", "message": "No response generated"})
             return

        session.health_score = final_state["health_score"]
        session.runway_months = final_state["runway_months"]

        response = Message(session_id=session_id_value, role="assistant", content=final_state["final"])
        db.add(response)
        db.flush()

        for item in final_state["reports"]:
            db.add(
                AgentReport(
                    session_id=session_id_value,
                    agent=item["agent"],
                    report_type="agent",
                    title=item["title"],
                    summary=item["summary"],
                    bullets="\n".join(item["bullets"]),
                    score=item["score"],
                )
            )

        for item in final_state["tasks"]:
            exists = (
                db.query(Task)
                .filter(Task.session_id == session_id_value, Task.title == item["title"])
                .first()
            )
            if not exists:
                db.add(
                    Task(
                        session_id=session_id_value,
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
            store_memory(db, session_id_value, "user_question", f"User asked: {content}", importance=0.65)
            store_memory(db, session_id_value, "ceo_decision", final_state["final"], importance=0.9)
            db.commit()
        except Exception:
            db.rollback()

        await websocket.send_json({
            'type': 'done', 
            'message_id': response.id, 
            'final': final_state['final'], 
            'health_score': final_state['health_score'], 
            'runway_months': final_state['runway_months']
        })

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({'type': 'error', 'message': str(exc)})
        except:
            pass


@app.get("/api/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    active_session = (
        db.query(BusinessSession)
        .filter(BusinessSession.user_id == current_user.id)
        .order_by(desc(BusinessSession.updated_at))
        .first()
    )
    if not active_session:
        return {
            "active_session": None,
            "recommendations": [
                "Start with a focused validation sprint before writing production code.",
                "Force the CEO to challenge every idea with market and financial risk.",
            ],
            "tasks": [],
            "reports": [],
        }

    tasks = (
        db.query(Task)
        .filter(Task.session_id == active_session.id)
        .order_by(desc(Task.created_at))
        .limit(6)
        .all()
    )
    reports = (
        db.query(AgentReport)
        .filter(AgentReport.session_id == active_session.id)
        .order_by(desc(AgentReport.created_at))
        .limit(5)
        .all()
    )
    recommendations = [
        "Validate the pain with 10 users before product expansion.",
        "Keep the MVP narrow and instrument every conversion step.",
        "Use the weekly board review to hold execution accountable.",
    ]
    return {
        "active_session": active_session,
        "recommendations": recommendations,
        "tasks": tasks,
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
    }


@app.get("/api/sessions/{session_id}/board-meetings", response_model=list[AgentReportOut])
def list_board_meetings(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _owned_session(session_id, db, current_user)
    reports = (
        db.query(AgentReport)
        .filter(AgentReport.session_id == session.id, AgentReport.report_type == "board")
        .order_by(desc(AgentReport.created_at))
        .all()
    )
    return [
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
    ]


from fastapi import BackgroundTasks

def _background_board_meeting(session_id: str):
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        session = db.get(BusinessSession, session_id)
        if session:
            build_board_meeting(db, session, trigger="manual")
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

@app.post("/api/sessions/{session_id}/board-meeting", response_model=AgentReportOut)
def generate_board_meeting(
    session_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(board_limit),
):
    session = _owned_session(session_id, db, current_user)
    
    # Create placeholder report
    report = AgentReport(
        session_id=session.id,
        agent="CEO Board",
        report_type="board",
        title="Board Meeting in Progress...",
        summary="The board is convening in the background. Check back in a few moments.",
        bullets="",
        score=0,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    background_tasks.add_task(_background_board_meeting, session.id)
    return serialize_report(report)


@app.get("/api/review-schedule", response_model=ReviewScheduleOut)
def get_review_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_or_create_schedule(db, current_user.id)


@app.put("/api/review-schedule", response_model=ReviewScheduleOut)
def update_review_schedule(
    payload: ReviewScheduleIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("scheduled_reviews", "Scheduled board reviews")),
):
    schedule = get_or_create_schedule(db, current_user.id)
    schedule.cadence = payload.cadence
    schedule.weekday = payload.weekday
    schedule.hour = payload.hour
    schedule.tz_offset_minutes = payload.tz_offset_minutes
    schedule.email_enabled = payload.email_enabled
    schedule.next_run_at = compute_next_run(
        payload.cadence,
        payload.weekday,
        payload.hour,
        payload.tz_offset_minutes,
        schedule.last_run_at,
    )
    db.commit()
    db.refresh(schedule)
    return schedule


@app.post("/api/internal/run-due-reviews")
def trigger_due_reviews(request: Request, db: Session = Depends(get_db)):
    """Cron target. Point an external scheduler at this every 15 minutes with
    the X-Cron-Secret header set to CRON_SECRET."""
    if not settings.cron_secret:
        raise HTTPException(status_code=503, detail="CRON_SECRET is not configured.")
    if request.headers.get("x-cron-secret") != settings.cron_secret:
        raise HTTPException(status_code=401, detail="Invalid cron secret.")

    results = run_due_reviews(db)
    return {"ran": len(results), "results": results}


@app.post("/api/internal/run-weekly-digests")
def trigger_weekly_digests(request: Request, db: Session = Depends(get_db)):
    if not settings.cron_secret:
        raise HTTPException(status_code=503, detail="CRON_SECRET is not configured.")
    if request.headers.get("x-cron-secret") != settings.cron_secret:
        raise HTTPException(status_code=401, detail="Invalid cron secret.")

    results = run_weekly_digests(db)
    log_event("weekly digests sent", count=len(results))
    return {"sent": len(results), "results": results}
