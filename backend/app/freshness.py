"""Saved approval baselines and deduplicated, inspectable evidence-change alerts."""
import hashlib
import json
from datetime import date
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.orm import Session
from app.access import workspace_access
from app.auth import get_current_user
from app.database import get_db
from app.models import BusinessSession, User
from app.studio_models import StudioRecord
from app.studio import record_out, record_activity

router = APIRouter(prefix="/api/studio", tags=["evidence-freshness"])
EVIDENCE = {"knowledge", "research", "metric"}

class ApprovalIn(BaseModel):
    confirmed: Literal[True]
    decision_id: str = Field(min_length=1, max_length=36)
    evidence_ids: list[str] = Field(min_length=1, max_length=100)
    review_dates: dict[str, date] = Field(default_factory=dict)

class AlertIn(BaseModel):
    state: Literal["acknowledged", "reviewed"]

def fingerprint(row):
    payload = {"title": row.title, "body": row.body, "data": json.loads(row.data), "version": row.version}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

def latest_baselines(db, sid):
    found = {}
    for row in db.query(StudioRecord).filter_by(session_id=sid, kind="evidence_baseline").order_by(StudioRecord.created_at.desc()).all():
        found.setdefault(row.title, row)
    return found.values()

def scan(db, sid, today=None):
    db.execute(update(BusinessSession).where(BusinessSession.id == sid).values(title=BusinessSession.title))
    today = today or date.today()
    existing = {r.title for r in db.query(StudioRecord).filter_by(session_id=sid, kind="freshness_alert").all()}
    added = 0
    for baseline in latest_baselines(db, sid):
        value = json.loads(baseline.data)
        decision = db.get(StudioRecord, value["decision_id"])
        if not decision or decision.session_id != sid:
            continue
        for saved in value["evidence"]:
            current = db.get(StudioRecord, saved["id"])
            valid = current and current.session_id == sid and current.kind in EVIDENCE
            after = fingerprint(current) if valid else "missing"
            changed = after != saved["fingerprint"]
            overdue = bool(saved.get("review_date") and date.fromisoformat(saved["review_date"]) <= today)
            if not changed and not overdue:
                continue
            reason = "removed" if not valid else "changed" if changed else "review_due"
            key = hashlib.sha256(f"{baseline.id}:{saved['id']}:{reason}:{after}".encode()).hexdigest()
            if key in existing:
                continue
            db.add(StudioRecord(session_id=sid, author_id=baseline.author_id, kind="freshness_alert", title=key,
                body=f"{saved['title']}: {reason.replace('_', ' ')}", data=json.dumps({
                    "decision_id": decision.id, "decision_title": decision.title, "baseline_id": baseline.id,
                    "evidence_id": saved["id"], "evidence_title": saved["title"], "reason": reason,
                    "before": saved, "after": {"version": current.version, "fingerprint": after, "title": current.title, "body": current.body[:2000], "data": json.loads(current.data)} if valid else None,
                    "state": "open", "scope": "Stored evidence comparison or entered review date; no claim that an external website changed"})))
            existing.add(key); added += 1
    return added

@router.post("/{session_id}/freshness/baselines", status_code=201)
def approve(session_id: str, payload: ApprovalIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    db.execute(update(BusinessSession).where(BusinessSession.id == session_id).values(title=BusinessSession.title))
    decision = db.get(StudioRecord, payload.decision_id)
    if not decision or decision.session_id != session_id or decision.kind != "decision":
        raise HTTPException(404, "Decision not found in this workspace.")
    ids = set(payload.evidence_ids)
    if set(payload.review_dates) - ids:
        raise HTTPException(422, "Review dates must refer to selected evidence.")
    snapshots = []
    for rid in sorted(ids):
        row = db.get(StudioRecord, rid)
        if not row or row.session_id != session_id or row.kind not in EVIDENCE:
            raise HTTPException(404, "Evidence not found in this workspace.")
        snapshots.append({"id": row.id, "title": row.title, "body": row.body[:2000], "version": row.version, "data": json.loads(row.data),
                          "fingerprint": fingerprint(row), "review_date": payload.review_dates[rid].isoformat() if rid in payload.review_dates else None})
    baseline = StudioRecord(session_id=session_id, author_id=user.id, kind="evidence_baseline", title=decision.id,
        body="User-approved evidence baseline", data=json.dumps({"decision_id": decision.id, "decision_title": decision.title, "decision_version": decision.version, "evidence": snapshots}))
    db.add(baseline); record_activity(db, session_id, user, "Decision evidence baseline approved", decision.title)
    db.commit(); db.refresh(baseline)
    return record_out(baseline)

@router.get("/{session_id}/freshness")
def read(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user)
    alerts = db.query(StudioRecord).filter_by(session_id=session_id, kind="freshness_alert").order_by(StudioRecord.created_at.desc()).all()
    return {"baselines": [record_out(r) for r in latest_baselines(db, session_id)], "alerts": [record_out(r) for r in alerts]}

@router.post("/{session_id}/freshness/scan")
def check(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    db.execute(update(BusinessSession).where(BusinessSession.id == session_id).values(title=BusinessSession.title))
    added = scan(db, session_id); db.commit()
    return {"created": added}

@router.patch("/{session_id}/freshness/alerts/{alert_id}")
def acknowledge(session_id: str, alert_id: str, payload: AlertIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    row = db.get(StudioRecord, alert_id)
    if not row or row.session_id != session_id or row.kind != "freshness_alert":
        raise HTTPException(404, "Alert not found.")
    value = json.loads(row.data); value.update(state=payload.state, reviewer_id=user.id)
    row.data = json.dumps(value); row.version += 1
    record_activity(db, session_id, user, "Evidence alert " + payload.state, row.body)
    db.commit(); db.refresh(row)
    return record_out(row)
