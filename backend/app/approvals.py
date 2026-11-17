"""Revision-bound ordered reviews; audit events are separate immutable records."""
import json
from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db
from app.models import User, BusinessSession
from app.studio_models import StudioRecord, WorkspaceMember
from app.outcomes import lock_workspace, owned, snapshot
from app.studio import record_out

router=APIRouter(prefix="/api/studio",tags=["approvals"])
class Policy(BaseModel):
    allow_self_approval: bool
class Create(BaseModel):
    decision_id: str
    reviewers: list[str]=Field(min_length=1,max_length=10)
    evidence_ids: list[str]=Field(min_length=1,max_length=50)
class Transition(BaseModel):
    version: int=Field(ge=1)
    action: Literal["submit","approve","request_changes","reject","withdraw"]
    comment: str=Field(default="",max_length=4000)

def audit(db,row,user_id,action,comment=""):
    state = json.loads(row.data)
    event = {"workflow_id": row.id, "workflow_version": row.version, "actor_id": user_id,
             "decision_version": state.get("decision", {}).get("version"), "stage": state.get("stage"),
             "status": state.get("status"), "action": action, "comment": comment,
             "at": datetime.now(timezone.utc).isoformat()}
    db.add(StudioRecord(session_id=row.session_id,author_id=user_id,kind="approval_event",title=row.id,data=json.dumps(event)))

def policy(db,sid):
    row=db.query(StudioRecord).filter_by(session_id=sid,kind="approval_policy").first()
    return json.loads(row.data)["allow_self_approval"] if row else False

def eligible(db,sid,uid):
    workspace=db.get(BusinessSession,sid)
    return workspace.user_id==uid or db.query(WorkspaceMember).filter_by(session_id=sid,user_id=uid,role="editor").first() is not None

@router.get("/{sid}/approvals")
def listing(sid:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    lock_workspace(db,sid,user)
    rows=db.query(StudioRecord).filter_by(session_id=sid,kind="approval").order_by(StudioRecord.created_at.desc()).all()
    results=[]
    for row in rows:
        value=record_out(row);decision=db.get(StudioRecord,value["data"]["decision"]["id"])
        value["data"]["current_revision"]=bool(decision and decision.version==value["data"]["decision"]["version"])
        value["data"]["events"]=[json.loads(e.data) for e in db.query(StudioRecord).filter_by(session_id=sid,kind="approval_event",title=row.id).order_by(StudioRecord.created_at).all()]
        results.append(value)
    return {"allow_self_approval":policy(db,sid),"workflows":results}

@router.put("/{sid}/approvals/policy")
def set_policy(sid:str,payload:Policy,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    lock_workspace(db,sid,user,True)
    if db.get(BusinessSession,sid).user_id!=user.id:raise HTTPException(403,"Only the workspace owner can change this policy.")
    row=db.query(StudioRecord).filter_by(session_id=sid,kind="approval_policy").first()
    if not row:
        row=StudioRecord(session_id=sid,author_id=user.id,kind="approval_policy",title="Approval policy",version=1);db.add(row);db.flush()
    else:row.version+=1
    row.data=json.dumps(payload.model_dump());audit(db,row,user.id,"policy_changed",f"allow_self_approval={payload.allow_self_approval}");db.commit()
    return payload.model_dump()

@router.post("/{sid}/approvals",status_code=201)
def create(sid:str,payload:Create,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    lock_workspace(db,sid,user,True);decision=owned(db,sid,payload.decision_id,"decision")
    if len(set(payload.reviewers))!=len(payload.reviewers) or any(not eligible(db,sid,r) for r in payload.reviewers):raise HTTPException(422,"Choose distinct current owners/editors in stage order.")
    if not policy(db,sid) and (user.id in payload.reviewers or decision.author_id in payload.reviewers):raise HTTPException(422,"Self-approval is disabled: choose reviewers other than the requester and decision author.")
    evidence=[]
    for rid in dict.fromkeys(payload.evidence_ids):
        row=db.get(StudioRecord,rid)
        if not row or row.session_id!=sid or row.kind not in {"metric","knowledge","research"}:raise HTTPException(422,"Choose existing workspace evidence.")
        evidence.append(snapshot(row))
    row=StudioRecord(session_id=sid,author_id=user.id,kind="approval",title=decision.title,version=1,data=json.dumps({"status":"draft","decision":snapshot(decision),"evidence":evidence,"reviewers":payload.reviewers,"stage":0,"requester_id":user.id,"self_approval_at_creation":policy(db,sid)}))
    db.add(row);db.flush();audit(db,row,user.id,"created");db.commit();db.refresh(row);return record_out(row)

def invalidate(db,decision,user_id):
    for row in db.query(StudioRecord).filter_by(session_id=decision.session_id,kind="approval").all():
        data=json.loads(row.data)
        if data["decision"]["id"]==decision.id and data["status"] in {"draft","submitted","changes_requested"}:
            data["status"]="changes_requested";data["stage"]=0;row.data=json.dumps(data);row.version+=1;audit(db,row,user_id,"decision_revision_changed","Outstanding approvals invalidated. Resubmit the current revision.")

@router.post("/{sid}/approvals/{rid}/transitions")
def transition(sid:str,rid:str,payload:Transition,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    lock_workspace(db,sid,user,True);row=owned(db,sid,rid,"approval");data=json.loads(row.data)
    if row.version!=payload.version:raise HTTPException(409,"Workflow changed; reload.")
    decision=owned(db,sid,data["decision"]["id"],"decision")
    if payload.action in {"submit","withdraw"}:
        if user.id not in {data["requester_id"],db.get(BusinessSession,sid).user_id}:raise HTTPException(403,"Only the requester or workspace owner can submit or withdraw.")
        if payload.action=="submit":
            if data["status"] not in {"draft","changes_requested"}:raise HTTPException(409,"Only draft or changes-requested workflows can submit.")
            if any(not eligible(db,sid,r) for r in data["reviewers"]):raise HTTPException(409,"A reviewer lost access; create a new workflow.")
            if not policy(db,sid) and any(r in {data["requester_id"],decision.author_id} for r in data["reviewers"]):raise HTTPException(409,"Current self-approval policy prevents submission.")
            if any(not db.get(StudioRecord,e["id"]) for e in data["evidence"]):raise HTTPException(409,"Required evidence was removed; create a new workflow.")
            data.update(status="submitted",stage=0,decision=snapshot(decision))
        else:
            if data["status"] not in {"draft","submitted","changes_requested"}:raise HTTPException(409,"Workflow is already closed.")
            data["status"]="withdrawn"
    else:
        if data["status"]!="submitted" or data["decision"]["version"]!=decision.version:raise HTTPException(409,"Approval must bind the current submitted decision revision.")
        if data["reviewers"][data["stage"]]!=user.id:raise HTTPException(403,"Only the assigned reviewer for this stage can act.")
        if not policy(db,sid) and user.id in {data["requester_id"],decision.author_id}:raise HTTPException(403,"Self-approval is disabled.")
        if payload.action in {"reject","request_changes"} and not payload.comment.strip():raise HTTPException(422,"Explain the requested change or rejection.")
        if payload.action=="approve":
            data["stage"]+=1
            if data["stage"]==len(data["reviewers"]):data["status"]="approved"
        else:data["status"]="rejected" if payload.action=="reject" else "changes_requested"
    row.version+=1;row.data=json.dumps(data);audit(db,row,user.id,payload.action,payload.comment);db.commit();db.refresh(row);return record_out(row)
