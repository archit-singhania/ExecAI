"""Executive studio capabilities with workspace isolation and persistent, editable records."""
import csv
import io
import json
import math
from datetime import datetime
from typing import Literal
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile
from pydantic import BaseModel, Field, EmailStr, field_validator
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from app.access import workspace_access
from app.auth import get_current_user, revoke_user_sessions
from app.config import get_settings
from app.database import get_db
from app.embeddings import _hashing_embedding, cosine_similarity
from app.models import AgentReport, BusinessSession, Message, Task, User
from app.studio_models import AuthSession, KnowledgeChunk, StudioRecord, WorkspaceMember

router = APIRouter(prefix="/api/studio", tags=["studio"])
Kind = Literal["profile", "decision", "scenario", "metric", "comment", "task_details", "preferences", "research", "activity", "archive", "template"]

class RecordIn(BaseModel):
    kind: Kind
    title: str = Field(min_length=1, max_length=240)
    body: str = Field(default="", max_length=30000)
    data: dict = Field(default_factory=dict)
    version: int | None = None
    @field_validator("title")
    @classmethod
    def meaningful_title(cls, value):
        if not value.strip():
            raise ValueError("Title cannot be blank.")
        return value.strip()

class MemberIn(BaseModel):
    email: EmailStr
    role: Literal["viewer", "editor"] = "viewer"

class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=220)
    description: str = Field(default="", max_length=5000)
    priority: Literal["High", "Medium", "Low"] = "Medium"
    status: Literal["Ready", "In progress", "Done"] = "Ready"
    due_at: str | None = None
    assignee_id: str | None = None
    dependencies: list[str] = Field(default_factory=list, max_length=30)

class ResearchIn(BaseModel):
    query: str = Field(min_length=3, max_length=500)

class DebateIn(BaseModel):
    question: str = Field(min_length=3, max_length=8000)
    specialist: Literal["market", "cfo", "cto", "product", "marketing", "legal", "sales", "designer", "assistant"]
    challenger: Literal["market", "cfo", "cto", "product", "marketing", "legal", "sales", "designer", "assistant"] | None = None

@router.post("/{session_id}/debate")
def specialist_debate(session_id: str, payload: DebateIn, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """A focused response, followed by a separate specialist's critique when requested."""
    session = workspace_access(db, session_id, user, write=True)
    if payload.challenger == payload.specialist:
        raise HTTPException(422, "Choose two different specialists for a debate.")
    from app.entitlements import enforce_run_quota
    from app.agents import AGENT_SEQUENCE, _register_sequence, _initial_state, _run_isolated
    from app.board_runner import recent_history
    from app.memory import retrieve_relevant_memories
    enforce_run_quota(request, db, user)
    if not AGENT_SEQUENCE:
        _register_sequence()
    agents = dict(AGENT_SEQUENCE)
    context = recent_history(db, session_id) + retrieve_relevant_memories(db, session_id, payload.question)
    preference = db.query(StudioRecord).filter_by(session_id=session_id, kind="preferences", title="Agent controls").first()
    options = json.loads(preference.data) if preference else {}
    answers = []
    question = payload.question
    for key in [payload.specialist, payload.challenger]:
        if not key:
            continue
        state = _initial_state(session.business_goal, question, context)
        state["options"] = options
        report = _run_isolated(agents[key], state)["reports"][0]
        answers.append(report)
        question = f"Critique this recommendation and offer a concrete alternative. Original question: {payload.question}\nPrevious specialist: {report['agent']}\nRecommendation: {report['summary']}\nDetails: {report['bullets']}"
    result = StudioRecord(session_id=session_id, author_id=user.id, kind="debate", title=payload.question[:240], body=payload.question, data=json.dumps({"reports": answers, "mode": "debate" if payload.challenger else "follow-up"}))
    db.add(result)
    record_activity(db, session_id, user, "Specialist discussion completed", payload.question[:500])
    db.commit(); db.refresh(result)
    return record_out(result)

@router.post("/{session_id}/research")
async def research(session_id: str, payload: ResearchIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    key = get_settings().research_api_key
    if not key:
        raise HTTPException(503, "Research search is unavailable. Configure RESEARCH_API_KEY for Tavily, or add your own source in the evidence library.")
    import httpx
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            result = await client.post("https://api.tavily.com/search", json={"api_key": key, "query": payload.query, "max_results": 5, "search_depth": "basic"})
            result.raise_for_status()
            sources = result.json().get("results", [])
    except Exception:
        raise HTTPException(503, "Research provider could not complete this search. Retry later.")
    saved = []
    for source in sources:
        r = StudioRecord(session_id=session_id, author_id=user.id, kind="research", title=str(source.get("title", "Source"))[:240], body=str(source.get("content", ""))[:30000], data=json.dumps({"url": source.get("url"), "query": payload.query, "retrieved_at": datetime.utcnow().isoformat(), "source": "Tavily search excerpt; verify the original page"}))
        db.add(r); db.flush(); saved.append(r)
    db.commit()
    return [record_out(r) for r in saved]

@router.get("/{session_id}/reports/{report_id}/pdf")
def report_pdf(session_id: str, report_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user)
    report = db.get(AgentReport, report_id)
    if not report or report.session_id != session_id:
        raise HTTPException(404, "Report not found.")
    from app.plans import get_plan
    if not get_plan(user.tier).exports:
        raise HTTPException(402, "Report exports are available on Pro and above.")
    from xml.sax.saxutils import escape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    styles = getSampleStyleSheet()
    output = io.BytesIO()
    flow = [Paragraph("CEO.ai · Executive brief", styles["Heading2"]), Paragraph(escape(report.title), styles["Title"]), Paragraph(escape(report.agent) + " · " + str(report.score) + "/100", styles["Normal"]), Spacer(1, 20), Paragraph(escape(report.summary), styles["BodyText"]), Spacer(1, 16)]
    flow += [Paragraph("• " + escape(item), styles["BodyText"]) for item in report.bullets.splitlines()]
    SimpleDocTemplate(output, title=report.title, author="CEO.ai", rightMargin=48, leftMargin=48).build(flow)
    return Response(output.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="ceoai-report-{report.id}.pdf"'})

def record_out(r):
    return {"id": r.id, "session_id": r.session_id, "kind": r.kind, "title": r.title, "body": r.body, "data": json.loads(r.data), "version": r.version, "author_id": r.author_id, "created_at": r.created_at, "updated_at": r.updated_at}

def allowed_sessions(db, user):
    shared = select(WorkspaceMember.session_id).where(WorkspaceMember.user_id == user.id)
    return db.query(BusinessSession).filter(or_(BusinessSession.user_id == user.id, BusinessSession.id.in_(shared)))

def validate_data(payload):
    if len(json.dumps(payload.data)) > 60000:
        raise HTTPException(422, "Record data exceeds the size limit.")
    if payload.kind == "metric":
        target = payload.data.get("target", 0)
        value = payload.data.get("value", 0)
        if not isinstance(target, (int, float)) or not isinstance(value, (int, float)) or not math.isfinite(target) or not math.isfinite(value):
            raise HTTPException(422, "Metric value and target must be numbers.")
    if payload.kind == "scenario":
        numbers = ["cash", "monthly_cost", "monthly_revenue", "ad_spend", "customers", "arpu", "margin", "churn"]
        for key in numbers:
            value = payload.data.get(key, 0)
            if not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
                raise HTTPException(422, f"{key} must be a nonnegative number.")
        d = payload.data
        burn = d.get("monthly_cost", 0) - d.get("monthly_revenue", 0)
        margin = min(1, d.get("margin", 0.7))
        churn = min(1, d.get("churn", 0.05))
        cac = d.get("ad_spend", 0) / d["customers"] if d.get("customers", 0) else None
        ltv = d.get("arpu", 0) * margin / churn if churn else None
        d["result"] = {"net_burn": burn, "runway_months": d.get("cash", 0) / burn if burn > 0 else None, "cash_positive": burn <= 0, "cac": cac, "ltv": ltv, "ltv_cac": ltv / cac if cac and ltv is not None else None}
        sensitivity = []
        for factor in [.8, 1, 1.2]:
            changed_burn = d.get("monthly_cost", 0) * factor - d.get("monthly_revenue", 0)
            sensitivity.append({"cost_change": round((factor - 1) * 100), "runway_months": d.get("cash", 0) / changed_burn if changed_burn > 0 else None})
        d["sensitivity"] = sensitivity
    if payload.kind == "preferences" and payload.title == "Agent controls":
        d = payload.data
        if d.get("provider", "") not in {"", "ollama", "groq", "gemini", "cerebras", "nvidia", "openrouter"}:
            raise HTTPException(422, "Choose a supported configured provider.")
        if not isinstance(d.get("local_only", True), bool) or not isinstance(d.get("max_tokens", 900), int) or not 200 <= d.get("max_tokens", 900) <= 2000:
            raise HTTPException(422, "Privacy must be boolean; specialist token budget must be 200–2000.")

def record_activity(db, session_id, user, title, body=""):
    db.add(StudioRecord(session_id=session_id, author_id=user.id, kind="activity", title=title, body=body, data="{}"))

def mention_notifications(db, session_id, user, body, topic):
    for member in db.query(WorkspaceMember).filter_by(session_id=session_id):
        target = db.get(User, member.user_id)
        if target and ("@" + target.email.lower()) in body.lower():
            db.add(StudioRecord(session_id=session_id, author_id=user.id, kind="notification", title=f"Mention in {topic}"[:240], body=body, data=json.dumps({"recipient_id": target.id, "read": False})))

@router.get("/workspaces")
def workspaces(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    archived = {r.session_id for r in db.query(StudioRecord).filter_by(kind="archive").all()}
    return [{"id": s.id, "title": s.title, "business_goal": s.business_goal, "archived": s.id in archived, "owned": s.user_id == user.id, "health_score": s.health_score, "updated_at": s.updated_at} for s in allowed_sessions(db, user).order_by(BusinessSession.updated_at.desc()).all()]

@router.patch("/workspaces/{session_id}")
def rename_workspace(session_id: str, payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = workspace_access(db, session_id, user, write=True)
    title = str(payload.get("title", "")).strip()
    if not title or len(title) > 180:
        raise HTTPException(422, "Name must contain 1–180 characters.")
    s.title = title
    db.commit()
    return {"id": s.id, "title": s.title}

@router.get("/{session_id}/records")
def records(session_id: str, kind: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user)
    q = db.query(StudioRecord).filter_by(session_id=session_id).filter(StudioRecord.kind != "notification")
    if kind:
        q = q.filter_by(kind=kind)
    return [record_out(r) for r in q.order_by(StudioRecord.updated_at.desc()).limit(500)]

@router.post("/{session_id}/records", status_code=201)
def create_record(session_id: str, payload: RecordIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    validate_data(payload)
    if payload.kind == "profile":
        old = db.query(StudioRecord).filter_by(session_id=session_id, kind="profile").first()
        if old:
            raise HTTPException(409, "Edit the existing company profile.")
    r = StudioRecord(session_id=session_id, author_id=user.id, kind=payload.kind, title=payload.title.strip(), body=payload.body, data=json.dumps(payload.data))
    db.add(r)
    record_activity(db, session_id, user, f"{payload.kind.capitalize()} created", payload.title)
    if payload.kind == "comment":
        mention_notifications(db, session_id, user, payload.body, payload.title)
    db.commit()
    db.refresh(r)
    return record_out(r)

@router.put("/{session_id}/records/{record_id}")
def update_record(session_id: str, record_id: str, payload: RecordIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    r = db.get(StudioRecord, record_id)
    if not r or r.session_id != session_id:
        raise HTTPException(404, "Record not found.")
    if payload.version != r.version:
        raise HTTPException(409, "This record changed. Refresh before saving.")
    if r.kind != payload.kind:
        raise HTTPException(422, "Record type cannot be changed.")
    validate_data(payload)
    if r.kind == "decision":
        snapshot = record_out(r)
        snapshot.pop("created_at"); snapshot.pop("updated_at")
        db.add(StudioRecord(session_id=session_id, author_id=user.id, kind="decision_revision", title=r.title, body=r.body, data=json.dumps(snapshot)))
    if r.kind == "metric":
        db.add(StudioRecord(session_id=session_id, author_id=user.id, kind="metric_observation", title=r.title, body="Previous metric observation", data=json.dumps({"metric_id": r.id, **json.loads(r.data), "observed_at": r.updated_at.isoformat()})))
    r.title, r.body, r.data, r.version = payload.title.strip(), payload.body, json.dumps(payload.data), r.version + 1
    record_activity(db, session_id, user, f"{r.kind.capitalize()} updated", r.title)
    if r.kind == "metric" and payload.data.get("target", 0) and payload.data.get("value", 0) >= payload.data["target"]:
        db.add(StudioRecord(session_id=session_id, author_id=user.id, kind="notification", title=f"Target reached: {r.title}"[:240], body=f"{payload.data['value']} / {payload.data['target']}", data=json.dumps({"recipient_id": user.id, "read": False})))
    db.commit()
    db.refresh(r)
    return record_out(r)

@router.delete("/{session_id}/records/{record_id}")
def delete_record(session_id: str, record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    r = db.get(StudioRecord, record_id)
    if not r or r.session_id != session_id:
        raise HTTPException(404, "Record not found.")
    db.query(KnowledgeChunk).filter_by(record_id=r.id).delete()
    db.delete(r)
    db.commit()
    return {"deleted": True}

def knowledge_search(db, session_id, query, limit=8):
    vector = _hashing_embedding(query)
    q = db.query(KnowledgeChunk).filter_by(session_id=session_id)
    if db.bind.dialect.name == "postgresql":
        chunks = q.order_by(KnowledgeChunk.embedding.cosine_distance(vector)).limit(limit).all()
    else:
        chunks = sorted(q.limit(3000).all(), key=lambda c: cosine_similarity(vector, c.embedding), reverse=True)[:limit]
    return [{"id": c.id, "document_id": c.record_id, "position": c.position, "content": c.content, "score": round(cosine_similarity(vector, c.embedding), 3)} for c in chunks if cosine_similarity(vector, c.embedding) > 0]

@router.post("/{session_id}/knowledge", status_code=201)
async def upload_knowledge(session_id: str, file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    raw = await file.read(10 * 1024 * 1024 + 1)
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(413, "Documents must be 10 MB or smaller.")
    name = (file.filename or "document").replace("\\", "/").split("/")[-1]
    if name.lower().endswith(".pdf"):
        from pypdf import PdfReader
        try:
            reader = PdfReader(io.BytesIO(raw))
            if len(reader.pages) > 200:
                raise ValueError("PDF exceeds 200 pages")
            text = "\n".join(p.extract_text() or "" for p in reader.pages)
        except Exception:
            raise HTTPException(422, "This PDF cannot be read. Upload a searchable, unencrypted PDF.")
    elif name.lower().endswith((".txt", ".md", ".csv")):
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise HTTPException(422, "Text documents must use UTF-8.")
    else:
        raise HTTPException(422, "Supported documents: PDF, TXT, Markdown, CSV.")
    if not text.strip() or len(text) > 2_000_000:
        raise HTTPException(422, "Document is empty or exceeds the extracted text limit.")
    r = StudioRecord(session_id=session_id, author_id=user.id, kind="knowledge", title=name[:240], body=text[:30000], data=json.dumps({"characters": len(text), "retrieval": "local feature-hash vectors (256 dimensions)"}))
    db.add(r); db.flush()
    for i, start in enumerate(range(0, len(text), 1000)):
        chunk = text[start:start + 1200]
        db.add(KnowledgeChunk(record_id=r.id, session_id=session_id, position=i, content=chunk, embedding=_hashing_embedding(chunk)))
    db.commit(); db.refresh(r)
    return record_out(r)

@router.get("/{session_id}/knowledge/search")
def search_knowledge(session_id: str, q: str = Query(min_length=2, max_length=500), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user)
    return {"query": q, "results": knowledge_search(db, session_id, q), "method": "local vector relevance"}

@router.get("/{session_id}/tasks")
def tasks(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user)
    details = {r.title: json.loads(r.data) for r in db.query(StudioRecord).filter_by(session_id=session_id, kind="task_details")}
    return [{"id": t.id, "title": t.title, "description": t.description, "priority": t.priority, "status": t.status, "completed_at": t.completed_at, **details.get(t.id, {})} for t in db.query(Task).filter_by(session_id=session_id).order_by(Task.created_at.desc())]

def save_task(db, user, session_id, payload, task=None):
    workspace_access(db, session_id, user, write=True)
    dependencies = db.query(Task).filter(Task.id.in_(payload.dependencies), Task.session_id == session_id).all()
    if len(dependencies) != len(set(payload.dependencies)) or (task and task.id in payload.dependencies):
        raise HTTPException(422, "Dependencies must be other tasks in this workspace.")
    # Walk the graph before adding an edge to prevent circular execution dependencies.
    if task:
        details = {r.title: json.loads(r.data).get("dependencies", []) for r in db.query(StudioRecord).filter_by(session_id=session_id, kind="task_details")}
        frontier, visited = list(payload.dependencies), set()
        while frontier:
            node = frontier.pop()
            if node == task.id:
                raise HTTPException(422, "Task dependencies cannot form a cycle.")
            if node not in visited:
                visited.add(node); frontier.extend(details.get(node, []))
    if payload.status == "Done" and any(d.status != "Done" for d in dependencies):
        raise HTTPException(409, "Complete dependency tasks first.")
    if payload.due_at:
        try:
            datetime.fromisoformat(payload.due_at)
        except ValueError:
            raise HTTPException(422, "Due date must be an ISO date.")
    if payload.assignee_id:
        session = db.get(BusinessSession, session_id)
        if payload.assignee_id != session.user_id and not db.query(WorkspaceMember).filter_by(session_id=session_id, user_id=payload.assignee_id).first():
            raise HTTPException(422, "Assignee must belong to this workspace.")
    if not task:
        task = Task(session_id=session_id, created_by_agent="Founder")
        db.add(task)
    task.title, task.description, task.priority, task.status = payload.title.strip(), payload.description, payload.priority, payload.status
    task.completed_at = datetime.utcnow() if payload.status == "Done" else None
    db.flush()
    meta = db.query(StudioRecord).filter_by(session_id=session_id, kind="task_details", title=task.id).first()
    if not meta:
        meta = StudioRecord(session_id=session_id, author_id=user.id, kind="task_details", title=task.id)
        db.add(meta)
    meta.data = json.dumps({"due_at": payload.due_at, "assignee_id": payload.assignee_id, "dependencies": payload.dependencies})
    record_activity(db, session_id, user, "Task updated", task.title)
    db.commit()
    return {"id": task.id, "status": task.status}

@router.post("/{session_id}/tasks", status_code=201)
def create_task(session_id: str, payload: TaskIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return save_task(db, user, session_id, payload)

@router.put("/{session_id}/tasks/{task_id}")
def update_task(session_id: str, task_id: str, payload: TaskIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = db.get(Task, task_id)
    if not task or task.session_id != session_id:
        raise HTTPException(404, "Task not found.")
    return save_task(db, user, session_id, payload, task)

@router.get("/{session_id}/members")
def members(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = workspace_access(db, session_id, user)
    owner = db.get(User, s.user_id)
    result = [{"id": owner.id, "name": owner.name, "email": owner.email, "role": "owner"}]
    for m in db.query(WorkspaceMember).filter_by(session_id=session_id):
        u = db.get(User, m.user_id)
        if u:
            result.append({"id": u.id, "name": u.name, "email": u.email, "role": m.role})
    return result

@router.post("/{session_id}/members")
def add_member(session_id: str, payload: MemberIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = workspace_access(db, session_id, user)
    if s.user_id != user.id:
        raise HTTPException(403, "Only the owner can manage members.")
    target = db.query(User).filter_by(email=payload.email.lower()).first()
    if not target:
        raise HTTPException(404, "Ask this colleague to create an account first.")
    if target.id == user.id:
        raise HTTPException(409, "The owner already has access.")
    m = db.query(WorkspaceMember).filter_by(session_id=session_id, user_id=target.id).first()
    if not m:
        m = WorkspaceMember(session_id=session_id, user_id=target.id)
        db.add(m)
    m.role = payload.role
    record_activity(db, session_id, user, "Workspace access updated", target.email + " · " + payload.role)
    db.commit()
    return {"added": True}

@router.delete("/{session_id}/members/{user_id}")
def remove_member(session_id: str, user_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = workspace_access(db, session_id, user)
    if s.user_id != user.id:
        raise HTTPException(403, "Only the owner can manage members.")
    db.query(WorkspaceMember).filter_by(session_id=session_id, user_id=user_id).delete()
    db.commit()
    return {"removed": True}

@router.get("/search/all")
def universal_search(q: str = Query(min_length=2, max_length=200), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ids = [s.id for s in allowed_sessions(db, user)]
    pattern = "%" + q.replace("%", "\\%").replace("_", "\\_") + "%"
    records = db.query(StudioRecord).filter(StudioRecord.session_id.in_(ids), StudioRecord.kind != "notification", or_(StudioRecord.title.ilike(pattern, escape="\\"), StudioRecord.body.ilike(pattern, escape="\\"))).limit(40)
    reports = db.query(AgentReport).filter(AgentReport.session_id.in_(ids), AgentReport.title.ilike(pattern, escape="\\")).limit(20)
    tasks = db.query(Task).filter(Task.session_id.in_(ids), Task.title.ilike(pattern, escape="\\")).limit(20)
    return [record_out(r) for r in records] + [{"id": r.id, "session_id": r.session_id, "kind": "report", "title": r.title, "body": r.summary} for r in reports] + [{"id": t.id, "session_id": t.session_id, "kind": "task", "title": t.title, "body": t.description} for t in tasks]

@router.get("/security/sessions")
def security_sessions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [{"id": s.id, "label": s.label, "created_at": s.created_at, "expires_at": s.expires_at, "revoked": bool(s.revoked_at)} for s in db.query(AuthSession).filter_by(user_id=user.id).order_by(AuthSession.created_at.desc())]

@router.delete("/security/sessions/{auth_session_id}")
def revoke_session(auth_session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = db.get(AuthSession, auth_session_id)
    if not s or s.user_id != user.id:
        raise HTTPException(404, "Session not found.")
    s.revoked_at = datetime.utcnow(); db.commit()
    return {"revoked": True}

@router.get("/{session_id}/notifications")
def notifications(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user)
    rows = db.query(StudioRecord).filter_by(session_id=session_id, kind="notification").order_by(StudioRecord.created_at.desc()).limit(200)
    return [record_out(r) for r in rows if json.loads(r.data).get("recipient_id") == user.id]

@router.post("/{session_id}/notifications/{notification_id}/read")
def read_notification(session_id: str, notification_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user)
    r = db.get(StudioRecord, notification_id)
    if not r or r.session_id != session_id or r.kind != "notification":
        raise HTTPException(404, "Notification not found.")
    data = json.loads(r.data)
    if data.get("recipient_id") != user.id:
        raise HTTPException(404, "Notification not found.")
    data["read"] = True; r.data = json.dumps(data); db.commit()
    return {"read": True}

@router.post("/security/logout")
def logout(response: Response, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from jose import jwt
    settings = get_settings()
    token = request.cookies.get("ceoai_session") or request.headers.get("authorization", "").removeprefix("Bearer ")
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    s = db.get(AuthSession, payload["jti"])
    s.revoked_at = datetime.utcnow(); db.commit()
    response.delete_cookie("ceoai_session", path="/")
    return {"logged_out": True}
