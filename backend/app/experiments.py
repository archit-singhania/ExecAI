"""Owned strategy experiments with immutable expectation revisions and reviewed closure."""
import json
from datetime import date, datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db
from app.models import User, BusinessSession
from app.outcomes import lock_workspace, owned, snapshot, Observation
from app.studio import record_activity, record_out
from app.studio_models import StudioRecord, WorkspaceMember

router = APIRouter(prefix="/api/studio", tags=["strategy-experiments"])

class Plan(BaseModel):
    baseline_id: str
    hypothesis: str = Field(min_length=1, max_length=4000)
    criteria: list[str] = Field(min_length=1, max_length=20)
    starts_on: date
    ends_on: date
    stop_conditions: str = Field(min_length=1, max_length=4000)

    @model_validator(mode="after")
    def valid(self):
        if self.ends_on < self.starts_on or not self.hypothesis.strip() or not self.stop_conditions.strip() or any(not c.strip() or len(c)>1000 for c in self.criteria):
            raise ValueError("Provide a valid window, hypothesis, stop conditions and nonempty criteria of at most 1000 characters.")
        return self

class Revise(Plan):
    version: int = Field(ge=1)

class Assignment(BaseModel):
    version: int = Field(ge=1)
    owner_id: str = Field(min_length=1, max_length=36)

@router.post("/{sid}/experiments/{rid}/owner")
def assign_owner(sid: str, rid: str, payload: Assignment, db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    lock_workspace(db,sid,user,True)
    workspace=db.get(BusinessSession,sid)
    if workspace.user_id != user.id:
        raise HTTPException(403,"Only the workspace owner can reassign experiment responsibility.")
    row=owned(db,sid,rid,"experiment"); data=json.loads(row.data)
    if row.version != payload.version or data["status"] in {"completed","stopped"}:
        raise HTTPException(409,"Experiment changed or closed.")
    member=db.query(WorkspaceMember).filter_by(session_id=sid,user_id=payload.owner_id,role="editor").first()
    if payload.owner_id != workspace.user_id and not member:
        raise HTTPException(422,"Choose the workspace owner or an active editor.")
    if data["owner_id"] != payload.owner_id:
        data.setdefault("owner_history",[]).append({"from":data["owner_id"],"to":payload.owner_id,"by":user.id,"at":datetime.now(timezone.utc).isoformat()})
        data["owner_id"]=payload.owner_id; row.data=json.dumps(data); row.version+=1
        record_activity(db,sid,user,"Experiment owner reassigned",row.title)
        db.commit(); db.refresh(row)
    return record_out(row)

class Event(BaseModel):
    version: int = Field(ge=1)
    action: Literal["activate", "checkpoint", "completed", "stopped"]
    criterion: int | None = None
    observation: str = Field(default="", max_length=4000)
    source: str = Field(default="", max_length=2000)
    kpi_baseline_id: str | None = None
    kpi_id: str | None = None
    measured_on: date | None = None
    assessment: Literal["unknown", "met", "not_met"] = "unknown"
    actions: list[str] = Field(default_factory=list, max_length=20)

def baseline_data(db, sid, bid):
    baseline = owned(db, sid, bid, "evidence_baseline")
    data = json.loads(baseline.data)
    decision = owned(db, sid, data["decision_id"], "decision")
    if decision.version != data["decision_version"]:
        raise HTTPException(409, "Approve a current decision evidence baseline first.")
    return snapshot(baseline), snapshot(decision)

@router.get("/{sid}/experiments")
def listing(sid: str, db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    lock_workspace(db, sid, user)
    return [record_out(r) for r in db.query(StudioRecord).filter_by(session_id=sid, kind="experiment").order_by(StudioRecord.created_at.desc()).all()]

@router.post("/{sid}/experiments", status_code=201)
def create(sid: str, payload: Plan, db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    lock_workspace(db, sid, user, True)
    baseline, decision = baseline_data(db, sid, payload.baseline_id)
    plan = payload.model_dump(mode="json")
    data = {"status":"planned", "owner_id":user.id, "plan":plan, "baseline":baseline, "decision":decision,
            "plan_revision":1, "history":[{"revision":1,"plan":plan,"by":user.id,"at":datetime.now(timezone.utc).isoformat()}], "checkpoints":[], "review_id":None}
    row = StudioRecord(session_id=sid, author_id=user.id, kind="experiment", title=payload.hypothesis[:240], data=json.dumps(data))
    db.add(row); record_activity(db,sid,user,"Experiment planned",row.title); db.commit(); db.refresh(row)
    return record_out(row)

@router.put("/{sid}/experiments/{rid}")
def revise(sid: str, rid: str, payload: Revise, db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    lock_workspace(db,sid,user,True); row=owned(db,sid,rid,"experiment"); data=json.loads(row.data)
    if row.version != payload.version or data["status"] not in {"planned","active"}:
        raise HTTPException(409,"Experiment changed or closed.")
    if payload.baseline_id != data["plan"]["baseline_id"]:
        raise HTTPException(422,"Create another experiment to change its decision baseline.")
    plan=payload.model_dump(mode="json",exclude={"version"}); data["plan_revision"]+=1; data["plan"]=plan
    data["history"].append({"revision":data["plan_revision"],"plan":plan,"by":user.id,"at":datetime.now(timezone.utc).isoformat()})
    row.title=payload.hypothesis[:240]; row.data=json.dumps(data); row.version+=1
    record_activity(db,sid,user,"Experiment criteria revised",row.title); db.commit(); db.refresh(row); return record_out(row)

@router.post("/{sid}/experiments/{rid}/events")
def event(sid: str, rid: str, payload: Event, db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    lock_workspace(db,sid,user,True); row=owned(db,sid,rid,"experiment"); data=json.loads(row.data)
    if row.version != payload.version or data["status"] in {"completed","stopped"}:
        raise HTTPException(409,"Experiment changed or closed. Reload before acting.")
    now=datetime.now(timezone.utc).isoformat()
    if payload.action == "activate":
        if data["status"] != "planned": raise HTTPException(409,"Only planned experiments can activate.")
        data.update(status="active",activated_at=now)
    elif payload.action == "checkpoint":
        if data["status"] != "active": raise HTTPException(409,"Activate before recording checkpoints.")
        if payload.criterion is None or not 0 <= payload.criterion < len(data["plan"]["criteria"]): raise HTTPException(422,"Select a current criterion.")
        kpi = None
        source = payload.source
        if payload.kpi_id or payload.kpi_baseline_id:
            approval = owned(db, sid, payload.kpi_baseline_id, "evidence_baseline")
            approved = json.loads(approval.data)
            if approved["decision_id"] != data["decision"]["id"]:
                raise HTTPException(422,"KPI approval must belong to this experiment's decision.")
            kpi = next((e for e in approved["evidence"] if e["id"] == payload.kpi_id and e.get("kind") == "metric"), None)
            if kpi is None: raise HTTPException(422,"Select a metric from the approved evidence snapshot.")
            source = f"Approved KPI: {kpi['title']} · revision {kpi['version']} · baseline {approval.id}"
        if not payload.observation.strip() or not source.strip() or payload.measured_on is None: raise HTTPException(422,"Checkpoints require an observation, source and measurement date.")
        if not data["plan"]["starts_on"] <= payload.measured_on.isoformat() <= data["plan"]["ends_on"]: raise HTTPException(422,"Measurement date is outside the observation window.")
        data["checkpoints"].append({**payload.model_dump(mode="json",exclude={"version","actions","action"}),"source":source,"kpi_snapshot":kpi,"plan_revision":data["plan_revision"],"recorded_at":now,"by":user.id})
    else:
        if data["status"] != "active" or not payload.observation.strip(): raise HTTPException(422,"Activate first and provide a closure summary, including missing evidence.")
        if any(not a.strip() or len(a)>220 for a in payload.actions): raise HTTPException(422,"Proposed actions need 1–220 characters.")
        criteria=[{"label":c[:240],"kind":"qualitative","target":None,"unit":"","period":"","expected":c} for c in data["plan"]["criteria"]]
        observations=[]
        for index in range(len(criteria)):
            checkpoints=[c for c in data["checkpoints"] if c["plan_revision"]==data["plan_revision"] and c["criterion"]==index]
            latest=checkpoints[-1] if checkpoints else None
            observations.append(Observation(narrative=latest["observation"] if latest else "",source=latest["source"] if latest else "",measured_on=latest["measured_on"] if latest else None).model_dump(mode="json"))
        review=StudioRecord(session_id=sid,author_id=user.id,kind="outcome_review",title=row.title,data=json.dumps({"decision":data["decision"],"baseline":data["baseline"],"review_date":date.today().isoformat(),"criteria":criteria,"observations":observations,"status":"draft","lessons":payload.observation,"unexpected_effects":"","actions":payload.actions,"previous_review_id":None,"expectations_recorded_at":data["history"][-1]["at"],"experiment_id":row.id}))
        db.add(review); db.flush(); data.update(status=payload.action,closed_at=now,closed_by=user.id,review_id=review.id,closure_summary=payload.observation)
    row.data=json.dumps(data); row.version+=1
    record_activity(db,sid,user,"Experiment "+payload.action,row.title); db.commit(); db.refresh(row); return record_out(row)
