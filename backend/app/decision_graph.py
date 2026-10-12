"""Workspace-owned decision relationships; edges never change their source records."""
import json
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

router = APIRouter(prefix="/api/studio", tags=["decision-graph"])
NODE_KINDS = {"decision", "assumption", "knowledge", "research", "metric"}

class EdgeIn(BaseModel):
    source: str = Field(min_length=1, max_length=36)
    target: str = Field(min_length=1, max_length=36)
    relationship: Literal["dependency", "evidence"] = "dependency"

class AssumptionIn(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    body: str = Field(default="", max_length=30000)

def reachable(edges, source):
    adjacency = {}
    for edge in edges:
        if edge["relationship"] == "dependency":
            adjacency.setdefault(edge["source"], set()).add(edge["target"])
    visited, pending = set(), [source]
    while pending:
        for target in adjacency.get(pending.pop(), ()):
            if target not in visited:
                visited.add(target)
                pending.append(target)
    return visited

def graph_data(db, sid):
    records = db.query(StudioRecord).filter_by(session_id=sid).filter(StudioRecord.kind.in_(NODE_KINDS)).all()
    tasks = db.query(Task).filter_by(session_id=sid).all()
    nodes = [{"id": r.id, "kind": r.kind, "title": r.title, "body": r.body,
              "version": r.version} for r in records]
    nodes += [{"id": t.id, "kind": "task", "title": t.title, "body": t.description,
               "version": None} for t in tasks]
    valid = {node["id"] for node in nodes}
    rows = db.query(StudioRecord).filter_by(session_id=sid, kind="dependency_edge").all()
    edges = [{"id": row.id, **json.loads(row.data)} for row in rows]
    return {"nodes": nodes, "edges": [e for e in edges if e["source"] in valid and e["target"] in valid]}

@router.get("/{session_id}/decision-graph")
def graph(session_id: str, changed: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user)
    result = graph_data(db, session_id)
    if changed and changed not in {n["id"] for n in result["nodes"]}:
        raise HTTPException(404, "Changed node is not in this workspace.")
    result["affected"] = sorted(reachable(result["edges"], changed)) if changed else []
    return result

@router.post("/{session_id}/decision-graph/assumptions", status_code=201)
def assumption(session_id: str, payload: AssumptionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    if not payload.title.strip():
        raise HTTPException(422, "Assumption title cannot be blank.")
    row = StudioRecord(session_id=session_id, author_id=user.id, kind="assumption", title=payload.title.strip(), body=payload.body)
    db.add(row)
    record_activity(db, session_id, user, "Assumption created", row.title)
    db.commit(); db.refresh(row)
    return record_out(row)

@router.post("/{session_id}/decision-graph/edges", status_code=201)
def link(session_id: str, payload: EdgeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    # Serialize graph writers before reading edges, including on local SQLite.
    db.execute(update(BusinessSession).where(BusinessSession.id == session_id).values(title=BusinessSession.title))
    state = graph_data(db, session_id)
    ids = {n["id"] for n in state["nodes"]}
    if payload.source not in ids or payload.target not in ids:
        raise HTTPException(404, "Both endpoints must belong to this workspace.")
    if payload.source == payload.target:
        raise HTTPException(422, "Choose two different records.")
    data = payload.model_dump()
    for edge in state["edges"]:
        if all(edge[key] == data[key] for key in data):
            return edge
    if payload.relationship == "dependency" and payload.source in reachable(state["edges"], payload.target):
        raise HTTPException(409, "This dependency would create a cycle.")
    row = StudioRecord(session_id=session_id, author_id=user.id, kind="dependency_edge", title="Decision relationship", data=json.dumps(data))
    db.add(row)
    record_activity(db, session_id, user, "Decision relationship linked", payload.relationship)
    db.commit(); db.refresh(row)
    return {"id": row.id, **data}

@router.delete("/{session_id}/decision-graph/edges/{edge_id}")
def unlink(session_id: str, edge_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    row = db.get(StudioRecord, edge_id)
    if not row or row.session_id != session_id or row.kind != "dependency_edge":
        raise HTTPException(404, "Relationship not found.")
    db.delete(row)
    record_activity(db, session_id, user, "Decision relationship removed", edge_id)
    db.commit()
    return {"removed": edge_id}
