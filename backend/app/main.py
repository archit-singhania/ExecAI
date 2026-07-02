from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc
from sqlalchemy.orm import Session
from app.agents import run_ceo_agents
from app.config import get_settings
from app.database import Base, engine, get_db
from app.models import AgentReport, BusinessMemory, BusinessSession, Message, Task
from app.schemas import (
    AgentReportOut,
    DashboardOut,
    MemoryOut,
    MessageCreate,
    MessageOut,
    SessionCreate,
    SessionOut,
    TaskOut,
    TaskUpdate,
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


@app.post("/api/sessions", response_model=SessionOut)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    title = payload.business_goal.strip()[:72]
    session = BusinessSession(
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
def list_sessions(db: Session = Depends(get_db)):
    return db.query(BusinessSession).order_by(desc(BusinessSession.updated_at)).all()


@app.get("/api/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.get(BusinessSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.get("/api/sessions/{session_id}/messages", response_model=list[MessageOut])
def list_messages(session_id: str, db: Session = Depends(get_db)):
    messages = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at)
        .all()
    )
    return [MessageOut.model_validate(message).model_copy(update={"reports": []}) for message in messages]


@app.get("/api/sessions/{session_id}/reports", response_model=list[AgentReportOut])
def list_reports(session_id: str, db: Session = Depends(get_db)):
    session = db.get(BusinessSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
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
        }
        for report in reports
    ]


@app.get("/api/sessions/{session_id}/tasks", response_model=list[TaskOut])
def list_tasks(session_id: str, db: Session = Depends(get_db)):
    session = db.get(BusinessSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return (
        db.query(Task)
        .filter(Task.session_id == session_id)
        .order_by(desc(Task.created_at))
        .all()
    )


@app.patch("/api/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = payload.status
    task.completed_at = datetime.utcnow() if payload.status.lower() in {"done", "complete", "completed"} else None
    db.commit()
    db.refresh(task)
    return task


@app.get("/api/sessions/{session_id}/memories", response_model=list[MemoryOut])
def list_memories(session_id: str, db: Session = Depends(get_db)):
    session = db.get(BusinessSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return (
        db.query(BusinessMemory)
        .filter(BusinessMemory.session_id == session_id)
        .order_by(desc(BusinessMemory.created_at))
        .limit(20)
        .all()
    )


@app.post("/api/sessions/{session_id}/messages", response_model=MessageOut)
def send_message(session_id: str, payload: MessageCreate, db: Session = Depends(get_db)):
    session = db.get(BusinessSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_message = Message(session_id=session.id, role="user", content=payload.content)
    db.add(user_message)

    result = run_ceo_agents(session.business_goal, payload.content)
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

    db.add(
        BusinessMemory(
            session_id=session.id,
            kind="user_question",
            content=f"User asked: {payload.content}",
            importance=0.65,
            embedding_text=payload.content,
        )
    )
    db.add(
        BusinessMemory(
            session_id=session.id,
            kind="ceo_decision",
            content=result["final"],
            importance=0.9,
            embedding_text=result["final"],
        )
    )
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
            }
            for report in reports
        ],
    )


@app.get("/api/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    active_session = db.query(BusinessSession).order_by(desc(BusinessSession.updated_at)).first()
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
            }
            for report in reports
        ],
    }


@app.post("/api/sessions/{session_id}/board-meeting", response_model=AgentReportOut)
def generate_board_meeting(session_id: str, db: Session = Depends(get_db)):
    session = db.get(BusinessSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

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
    }
