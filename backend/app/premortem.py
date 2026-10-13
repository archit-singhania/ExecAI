"""Editable qualitative pre-mortems and explicitly approved mitigation tasks."""
import json
import uuid
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.orm import Session
from app.access import workspace_access
from app.auth import get_current_user
from app.database import get_db
from app.models import BusinessSession, Task, User
from app.studio_models import StudioRecord
from app.studio import record_out, record_activity

router = APIRouter(prefix="/api/studio", tags=["pre-mortem"])

class RiskIn(BaseModel):
    origin: Literal["user", "ai_proposal"] = "user"
    id: str | None = Field(default=None, max_length=36)
    failure: str = Field(min_length=1, max_length=2000)
    likelihood: Literal["low", "medium", "high"] = "medium"
    impact: Literal["low", "medium", "high"] = "medium"
    warning: str = Field(default="", max_length=2000)
    mitigation: str = Field(default="", max_length=2000)

class PremortemIn(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    strategy: str = Field(min_length=1, max_length=10000)
    risks: list[RiskIn] = Field(default_factory=list, max_length=30)
    version: int | None = None

class ConfirmIn(BaseModel):
    confirmed: Literal[True]

def owned(db, sid, rid):
    row = db.get(StudioRecord, rid)
    if not row or row.session_id != sid or row.kind != "premortem":
        raise HTTPException(404, "Pre-mortem not found.")
    return row

def data_for(payload, previous=None):
    if not payload.title.strip() or not payload.strategy.strip():
        raise HTTPException(422, "Title and strategy cannot be blank.")
    old = {r["id"]: r for r in (previous or {}).get("risks", [])}
    risks, seen = [], set()
    for item in payload.risks:
        if not item.failure.strip():
            raise HTTPException(422, "Failure paths cannot be blank.")
        value = item.model_dump()
        value["id"] = item.id or str(uuid.uuid4())
        if value["id"] in seen:
            raise HTTPException(422, "Risk identifiers must be unique.")
        seen.add(value["id"])
        value["task_id"] = old.get(value["id"], {}).get("task_id")
        risks.append(value)
    return {"risks": risks, "assessment_scope": "Qualitative human judgments; not measured probabilities"}

@router.get("/{session_id}/premortems")
def list_premortems(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user)
    return [record_out(r) for r in db.query(StudioRecord).filter_by(session_id=session_id, kind="premortem").order_by(StudioRecord.updated_at.desc()).all()]

@router.post("/{session_id}/premortems", status_code=201)
def create(session_id: str, payload: PremortemIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    row = StudioRecord(session_id=session_id, author_id=user.id, kind="premortem", title=payload.title.strip(), body=payload.strategy, data=json.dumps(data_for(payload)))
    db.add(row); record_activity(db, session_id, user, "Pre-mortem created", row.title)
    db.commit(); db.refresh(row)
    return record_out(row)

@router.put("/{session_id}/premortems/{record_id}")
def save(session_id: str, record_id: str, payload: PremortemIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    db.execute(update(BusinessSession).where(BusinessSession.id == session_id).values(title=BusinessSession.title))
    row = owned(db, session_id, record_id)
    if row.version != payload.version:
        raise HTTPException(409, "Pre-mortem changed. Reload before saving.")
    value = data_for(payload, json.loads(row.data))
    row.title, row.body, row.data = payload.title.strip(), payload.strategy, json.dumps(value)
    row.version += 1
    record_activity(db, session_id, user, "Pre-mortem updated", row.title)
    db.commit(); db.refresh(row)
    return record_out(row)

@router.post("/{session_id}/premortems/{record_id}/risks/{risk_id}/task")
def mitigation_task(session_id: str, record_id: str, risk_id: str, payload: ConfirmIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    db.execute(update(BusinessSession).where(BusinessSession.id == session_id).values(title=BusinessSession.title))
    row = owned(db, session_id, record_id)
    value = json.loads(row.data)
    risk = next((r for r in value["risks"] if r["id"] == risk_id), None)
    if not risk:
        raise HTTPException(404, "Failure path not found.")
    if risk.get("task_id"):
        task = db.get(Task, risk["task_id"])
        if task and task.session_id == session_id:
            return {"task_id": task.id, "created": False}
    if not risk["mitigation"].strip():
        raise HTTPException(422, "Save a mitigation before creating a task.")
    task = Task(session_id=session_id, title=risk["mitigation"][:220], description=f"Pre-mortem: {row.title}\nFailure path: {risk['failure']}\nWarning: {risk['warning']}", priority="High" if risk["impact"] == "high" else "Medium", created_by_agent="User-approved pre-mortem")
    db.add(task); db.flush()
    risk["task_id"] = task.id
    row.data = json.dumps(value); row.version += 1
    record_activity(db, session_id, user, "Mitigation task created", task.title)
    db.commit()
    return {"task_id": task.id, "created": True}
