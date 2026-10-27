"""Revision-bound outcome reviews; completed records are immutable."""
import json
import math
from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.access import workspace_access
from app.auth import get_current_user
from app.database import get_db
from app.models import BusinessSession, Task, User
from app.studio import record_activity, record_out
from app.studio_models import StudioRecord

router = APIRouter(prefix="/api/studio", tags=["outcome-reviews"])


class Criterion(BaseModel):
    label: str = Field(min_length=1, max_length=240)
    kind: Literal["numeric", "qualitative"] = "numeric"
    target: float | None = None
    unit: str = Field(default="", max_length=80)
    period: str = Field(default="", max_length=160)
    expected: str = Field(default="", max_length=2000)

    @field_validator("target")
    @classmethod
    def finite(cls, value):
        if value is not None and not math.isfinite(value):
            raise ValueError("Use finite measurements.")
        return value


class CreateReview(BaseModel):
    baseline_id: str = Field(min_length=1, max_length=36)
    review_date: date
    criteria: list[Criterion] = Field(min_length=1, max_length=30)


class Observation(BaseModel):
    actual: float | None = None
    unit: str = Field(default="", max_length=80)
    period: str = Field(default="", max_length=160)
    narrative: str = Field(default="", max_length=3000)
    source: str = Field(default="", max_length=2000)
    measured_on: date | None = None

    @field_validator("actual")
    @classmethod
    def finite(cls, value):
        return Criterion.finite(value)


class SaveReview(BaseModel):
    version: int = Field(ge=1)
    observations: list[Observation] = Field(max_length=30)
    lessons: str = Field(default="", max_length=10000)
    unexpected_effects: str = Field(default="", max_length=10000)
    actions: list[str] = Field(default_factory=list, max_length=30)
    complete: bool = False


class VersionIn(BaseModel):
    version: int = Field(ge=1)


class TaskSelection(VersionIn):
    confirmed: Literal[True]
    indexes: list[int] = Field(min_length=1, max_length=30)


def lock_workspace(db, sid, user, write=False):
    workspace_access(db, sid, user, write=write)
    if write:
        db.execute(update(BusinessSession).where(BusinessSession.id == sid).values(title=BusinessSession.title))


def owned(db, sid, rid, kind):
    row = db.get(StudioRecord, rid)
    if not row or row.session_id != sid or row.kind != kind:
        raise HTTPException(404, "Record not found.")
    return row


def snapshot(row):
    return {"id": row.id, "version": row.version, "title": row.title,
            "body": row.body, "data": json.loads(row.data)}


def comparisons(data):
    result = []
    for expected, observed in zip(data["criteria"], data["observations"]):
        variance = None
        if expected["kind"] == "qualitative":
            reason = "Qualitative assessment; no numeric variance."
        elif observed["actual"] is None:
            reason = "No measurement recorded."
        elif expected["unit"] != observed["unit"] or expected["period"] != observed["period"]:
            reason = "Units or reporting periods differ."
        else:
            variance = observed["actual"] - expected["target"]
            if not math.isfinite(variance):
                raise HTTPException(422, "Measurement difference exceeds supported numeric range.")
            reason = "Actual minus target; direction is not a success judgment."
        result.append({"variance": variance, "explanation": reason})
    return result


def output(row):
    value = record_out(row)
    value["data"]["comparisons"] = comparisons(value["data"])
    return value


@router.get("/{session_id}/outcome-reviews")
def listing(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lock_workspace(db, session_id, user)
    return [output(r) for r in db.query(StudioRecord).filter_by(session_id=session_id, kind="outcome_review").order_by(StudioRecord.created_at.desc()).all()]


@router.post("/{session_id}/outcome-reviews", status_code=201)
def create(session_id: str, payload: CreateReview, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lock_workspace(db, session_id, user, True)
    baseline = owned(db, session_id, payload.baseline_id, "evidence_baseline")
    saved = json.loads(baseline.data)
    decision = owned(db, session_id, saved["decision_id"], "decision")
    if decision.version != saved["decision_version"]:
        raise HTTPException(409, "Decision changed. Approve a current evidence baseline first.")
    for item in payload.criteria:
        if not item.label.strip() or (item.kind == "numeric" and (item.target is None or not item.unit.strip() or not item.period.strip())) or (item.kind == "qualitative" and not item.expected.strip()):
            raise HTTPException(422, "Numeric criteria need a target, unit and period; qualitative criteria need an expectation.")
    data = {"decision": snapshot(decision), "baseline": snapshot(baseline),
            "review_date": payload.review_date.isoformat(), "criteria": [c.model_dump() for c in payload.criteria],
            "observations": [Observation().model_dump(mode="json") for _ in payload.criteria],
            "status": "draft", "lessons": "", "unexpected_effects": "", "actions": [],
            "previous_review_id": None, "expectations_recorded_at": datetime.now(timezone.utc).isoformat()}
    row = StudioRecord(session_id=session_id, author_id=user.id, kind="outcome_review", title=decision.title, data=json.dumps(data))
    db.add(row)
    record_activity(db, session_id, user, "Outcome review created", row.title)
    db.commit(); db.refresh(row)
    return output(row)


@router.put("/{session_id}/outcome-reviews/{record_id}")
def save(session_id: str, record_id: str, payload: SaveReview, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lock_workspace(db, session_id, user, True)
    row = owned(db, session_id, record_id, "outcome_review")
    data = json.loads(row.data)
    if row.version != payload.version or data["status"] != "draft":
        raise HTTPException(409, "Review changed or completed. Reload or create a correction.")
    if len(payload.observations) != len(data["criteria"]):
        raise HTTPException(422, "Provide one observation per saved criterion.")
    for obs in payload.observations:
        if (obs.actual is not None or obs.narrative.strip()) and (not obs.source.strip() or obs.measured_on is None):
            raise HTTPException(422, "Recorded observations require a source and measurement date.")
    actions = [a.strip() for a in payload.actions]
    if any(not a or len(a) > 220 for a in actions):
        raise HTTPException(422, "Actions must contain 1–220 characters.")
    if payload.complete and not payload.lessons.strip():
        raise HTTPException(422, "Record lessons, including any missing evidence, before completion.")
    data.update(observations=[o.model_dump(mode="json") for o in payload.observations],
                lessons=payload.lessons, unexpected_effects=payload.unexpected_effects, actions=actions)
    comparisons(data)
    if payload.complete:
        data.update(status="completed", completed_at=datetime.now(timezone.utc).isoformat(), completed_by=user.id)
    row.data = json.dumps(data); row.version += 1
    record_activity(db, session_id, user, "Outcome review completed" if payload.complete else "Outcome review saved", row.title)
    db.commit(); db.refresh(row)
    return output(row)


@router.post("/{session_id}/outcome-reviews/{record_id}/corrections", status_code=201)
def correction(session_id: str, record_id: str, payload: VersionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lock_workspace(db, session_id, user, True)
    row = owned(db, session_id, record_id, "outcome_review")
    data = json.loads(row.data)
    if row.version != payload.version or data["status"] != "completed":
        raise HTTPException(409, "Only a current completed review can be corrected.")
    data.update(status="draft", previous_review_id=row.id)
    data.pop("completed_at", None); data.pop("completed_by", None)
    result = StudioRecord(session_id=session_id, author_id=user.id, kind="outcome_review", title=row.title, data=json.dumps(data))
    db.add(result)
    record_activity(db, session_id, user, "Outcome review correction started", row.title)
    db.commit(); db.refresh(result)
    return output(result)


@router.post("/{session_id}/outcome-reviews/{record_id}/tasks")
def tasks(session_id: str, record_id: str, payload: TaskSelection, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lock_workspace(db, session_id, user, True)
    row = owned(db, session_id, record_id, "outcome_review")
    data = json.loads(row.data)
    if row.version != payload.version or data["status"] != "completed":
        raise HTTPException(409, "Complete and reload the review before creating tasks.")
    indexes = sorted(set(payload.indexes))
    if any(i < 0 or i >= len(data["actions"]) for i in indexes):
        raise HTTPException(422, "Select existing actions.")
    receipts = db.query(StudioRecord).filter_by(session_id=session_id, kind="outcome_task", title=row.id).all()
    existing = {json.loads(r.data)["index"]: json.loads(r.data)["task_id"] for r in receipts}
    result = []
    for index in indexes:
        if index not in existing:
            task = Task(session_id=session_id, title=data["actions"][index], description=f"Outcome review: {row.title}\nReview: {row.id}", priority="Medium", created_by_agent="User-approved outcome review")
            db.add(task); db.flush()
            db.add(StudioRecord(session_id=session_id, author_id=user.id, kind="outcome_task", title=row.id,
                                data=json.dumps({"index": index, "task_id": task.id})))
            existing[index] = task.id
        result.append(existing[index])
    db.commit()
    return {"task_ids": result}
