"""Saved numeric concession comparisons; never approve or transmit an agreement."""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, FiniteFloat, model_validator
from sqlalchemy import update
from sqlalchemy.orm import Session
from app.access import workspace_access
from app.auth import get_current_user
from app.database import get_db
from app.models import BusinessSession, User
from app.studio_models import StudioRecord
from app.studio import record_out, record_activity

router = APIRouter(prefix="/api/studio", tags=["negotiation"])

class ConstraintIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    unit: str = Field(default="", max_length=40)
    minimum: FiniteFloat | None = None
    maximum: FiniteFloat | None = None
    @model_validator(mode="after")
    def bounds(self):
        self.name = self.name.strip()
        if not self.name or self.minimum is None and self.maximum is None:
            raise ValueError("Name and at least one reservation limit are required.")
        if self.minimum is not None and self.maximum is not None and self.minimum > self.maximum:
            raise ValueError("Minimum must not exceed maximum.")
        return self

class PackageIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    values: dict[str, FiniteFloat] = Field(default_factory=dict)

class NegotiationIn(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    objectives: str = Field(min_length=1, max_length=10000)
    alternative: str = Field(default="", max_length=5000)
    counterpart: str = Field(default="", max_length=5000)
    constraints: list[ConstraintIn] = Field(min_length=1, max_length=30)
    packages: list[PackageIn] = Field(min_length=1, max_length=20)
    version: int | None = None
    @model_validator(mode="after")
    def names(self):
        if not self.title.strip() or not self.objectives.strip():
            raise ValueError("Title and objectives cannot be blank.")
        names = {c.name for c in self.constraints}
        if len(names) != len(self.constraints):
            raise ValueError("Constraint names must be unique.")
        if len({p.name.strip() for p in self.packages}) != len(self.packages) or any(not p.name.strip() for p in self.packages):
            raise ValueError("Package names must be meaningful and unique.")
        if any(set(p.values) != names for p in self.packages):
            raise ValueError("Every package must specify each reservation variable exactly once.")
        return self

def compare(payload):
    results = []
    for package in payload.packages:
        checks = []
        for constraint in payload.constraints:
            value = package.values[constraint.name]
            violated = ((constraint.minimum is not None and value < constraint.minimum)
                        or (constraint.maximum is not None and value > constraint.maximum))
            checks.append({**constraint.model_dump(), "value": value, "violated": violated})
        results.append({"name": package.name.strip(), "within_limits": not any(c["violated"] for c in checks), "checks": checks})
    return {"alternative": payload.alternative, "counterpart": payload.counterpart,
            "constraints": [c.model_dump() for c in payload.constraints], "packages": [p.model_dump() for p in payload.packages],
            "comparison": results, "scope": "Numeric reservation limits only; no acceptance, dispatch or guarantee of a good agreement"}

@router.get("/{session_id}/negotiations")
def list_negotiations(session_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user)
    return [record_out(r) for r in db.query(StudioRecord).filter_by(session_id=session_id, kind="negotiation").order_by(StudioRecord.updated_at.desc()).all()]

@router.post("/{session_id}/negotiations", status_code=201)
def create(session_id: str, payload: NegotiationIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    row = StudioRecord(session_id=session_id, author_id=user.id, kind="negotiation", title=payload.title.strip(), body=payload.objectives, data=json.dumps(compare(payload)))
    db.add(row); record_activity(db, session_id, user, "Negotiation comparison saved", row.title)
    db.commit(); db.refresh(row)
    return record_out(row)

@router.put("/{session_id}/negotiations/{record_id}")
def save(session_id: str, record_id: str, payload: NegotiationIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    workspace_access(db, session_id, user, write=True)
    db.execute(update(BusinessSession).where(BusinessSession.id == session_id).values(title=BusinessSession.title))
    row = db.get(StudioRecord, record_id)
    if not row or row.session_id != session_id or row.kind != "negotiation":
        raise HTTPException(404, "Negotiation not found.")
    if row.version != payload.version:
        raise HTTPException(409, "Negotiation changed. Reload before saving.")
    row.title, row.body, row.data = payload.title.strip(), payload.objectives, json.dumps(compare(payload))
    row.version += 1; record_activity(db, session_id, user, "Negotiation comparison updated", row.title)
    db.commit(); db.refresh(row)
    return record_out(row)
