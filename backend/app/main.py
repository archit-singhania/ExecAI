from datetime import datetime
import json

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session
from app.agents import run_ceo_agents, run_ceo_agents_stream
from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.config import get_settings
from app.database import Base, engine, get_db, SessionLocal
from app.memory import retrieve_relevant_memories, search_memory_rows, store_memory
from app.models import AgentReport, BusinessMemory, BusinessSession, Message, Task, User
from app.schemas import (
    AgentReportOut,
    DashboardOut,
    MemoryOut,
    MemorySearchOut,
    MessageCreate,
    MessageOut,
    ReportExportOut,
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
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CEO.ai API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


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


@app.post("/api/sessions", response_model=SessionOut)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
):
    session = _owned_session(session_id, db, current_user)

    user_message = Message(session_id=session.id, role="user", content=payload.content)
    db.add(user_message)

    memory_context = _recent_history(db, session.id) + retrieve_relevant_memories(db, session.id, payload.content)
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

    store_memory(db, session.id, "user_question", f"User asked: {payload.content}", importance=0.65)
    store_memory(db, session.id, "ceo_decision", result["final"], importance=0.9)
    db.commit()
    db.refresh(response)

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


@app.post("/api/sessions/{session_id}/messages/stream")
def send_message_stream(
    session_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Same as POST /messages, but streams each agent's report to the client
    over Server-Sent Events as soon as it's ready, instead of waiting for
    all 9 agents to finish. Event payloads:
      {"type": "agent_report", "node": "cfo", "report": {...}}   (x9)
      {"type": "done", "message_id": ..., "final": ..., "health_score": ..., "runway_months": ...}
    """
    session = _owned_session(session_id, db, current_user)
    business_goal = session.business_goal
    session_id_value = session.id

    user_message = Message(session_id=session_id_value, role="user", content=payload.content)
    db.add(user_message)
    db.commit()

    memory_context = _recent_history(db, session_id_value) + retrieve_relevant_memories(db, session_id_value, payload.content)

    def event_stream():
        stream_db = SessionLocal()
        try:
            seen = 0
            final_state = None
            for node_name, state in run_ceo_agents_stream(business_goal, payload.content, memory_context):
                if node_name != "ceo":
                    for report in state["reports"][seen:]:
                        yield f"data: {json.dumps({'type': 'agent_report', 'node': node_name, 'report': report})}\n\n"
                    seen = len(state["reports"])
                final_state = state

            session_row = stream_db.get(BusinessSession, session_id_value)
            session_row.health_score = final_state["health_score"]
            session_row.runway_months = final_state["runway_months"]

            response = Message(session_id=session_id_value, role="assistant", content=final_state["final"])
            stream_db.add(response)
            stream_db.flush()

            for item in final_state["reports"]:
                stream_db.add(
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
                    stream_db.query(Task)
                    .filter(Task.session_id == session_id_value, Task.title == item["title"])
                    .first()
                )
                if not exists:
                    stream_db.add(
                        Task(
                            session_id=session_id_value,
                            title=item["title"],
                            description=item.get("description", ""),
                            priority=item["priority"],
                            status=item["status"],
                            created_by_agent=item["created_by_agent"],
                        )
                    )

            store_memory(stream_db, session_id_value, "user_question", f"User asked: {payload.content}", importance=0.65)
            store_memory(stream_db, session_id_value, "ceo_decision", final_state["final"], importance=0.9)
            stream_db.commit()
            stream_db.refresh(response)

            yield f"data: {json.dumps({'type': 'done', 'message_id': response.id, 'final': final_state['final'], 'health_score': final_state['health_score'], 'runway_months': final_state['runway_months']})}\n\n"
        except Exception as exc:
            stream_db.rollback()
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        finally:
            stream_db.close()

    return StreamingResponse(event_stream(), media_type="text/event-stream")


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


@app.post("/api/sessions/{session_id}/board-meeting", response_model=AgentReportOut)
def generate_board_meeting(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _owned_session(session_id, db, current_user)

    tasks = db.query(Task).filter(Task.session_id == session.id).all()
    reports = db.query(AgentReport).filter(AgentReport.session_id == session.id).all()
    completed = len([task for task in tasks if task.status.lower() in {"done", "complete", "completed"}])
    missed_or_open = len(tasks) - completed
    average_score = round(sum(report.score for report in reports) / len(reports)) if reports else session.health_score
    bullets = [
        f"Completed tasks: {completed}",
        f"Open or missed tasks: {missed_or_open}",
        f"Business health score: {average_score}/100",
        "Next recommendation: prove demand before expanding scope or spending on acquisition.",
    ]
    summary = (
        "This board review approves continued validation, but blocks full-scale buildout until customer evidence improves. "
        "The CEO wants sharper buyer proof, clearer pricing, and weekly accountability on tasks."
    )
    report = AgentReport(
        session_id=session.id,
        agent="CEO Board",
        report_type="board",
        title="Weekly board meeting",
        summary=summary,
        bullets="\n".join(bullets),
        score=average_score,
    )
    db.add(report)
    db.add(BusinessMemory(session_id=session.id, kind="board_report", content=summary, importance=0.85, embedding_text=summary))
    db.commit()
    db.refresh(report)
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
