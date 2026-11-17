"""Persistent allocation proposals; bounded solver processes never run in request handlers."""
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict, model_validator
from sqlalchemy import update
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db, SessionLocal
from app.models import User
from app.outcomes import lock_workspace, owned
from app.studio import record_out, record_activity
from app.studio_models import StudioRecord

router=APIRouter(prefix="/api/studio",tags=["allocation"])
pool=ThreadPoolExecutor(max_workers=2,thread_name_prefix="allocation")
guard=Lock(); processes={}; pending=set()

class Initiative(BaseModel):
    model_config=ConfigDict(allow_inf_nan=False)
    id: str=Field(min_length=1,max_length=50)
    name: str=Field(min_length=1,max_length=200)
    value: float=Field(ge=0,le=1e9)
    cost: float=Field(ge=0,le=1e9)
    hours: float=Field(ge=0,le=1e9)
    required: bool=False
    dependencies: list[str]=Field(default_factory=list,max_length=100)

class Scenario(BaseModel):
    model_config=ConfigDict(allow_inf_nan=False)
    title: str=Field(min_length=1,max_length=200)
    budget: float=Field(ge=0,le=1e12)
    staff_hours: float=Field(ge=0,le=1e12)
    time_limit: float=Field(default=10,ge=0.1,le=30)
    initiatives: list[Initiative]=Field(min_length=1,max_length=100)
    @model_validator(mode="after")
    def references(self):
        ids=[i.id for i in self.initiatives]
        if len(set(ids))!=len(ids) or any(d not in ids or d==i.id for i in self.initiatives for d in i.dependencies):
            raise ValueError("Use unique initiative IDs and existing non-self dependencies.")
        return self

class Revision(BaseModel):
    version: int=Field(ge=1)

def worker(rid):
    process=None
    try:
        with SessionLocal() as db:
            row=db.get(StudioRecord,rid)
            if not row:return
            data=json.loads(row.data)
            if data["state"]!="queued":return
            version=row.version;data["state"]="running"
            claimed=db.execute(update(StudioRecord).where(StudioRecord.id==rid,StudioRecord.version==version).values(data=json.dumps(data),version=version+1)).rowcount
            db.commit()
            if not claimed:return
            plan=data["input"]
        process=subprocess.Popen([sys.executable,"-I",str(Path(__file__).with_name("allocation_solver.py"))],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
        with guard: processes[rid]=process
        with SessionLocal() as check:
            current=check.get(StudioRecord,rid)
            if not current or json.loads(current.data)["state"]!="running":
                process.kill();process.communicate();return
        try:
            stdout,stderr=process.communicate(json.dumps(plan),timeout=plan["time_limit"]+15)
            result=json.loads(stdout) if process.returncode==0 else {"status":"failed","feasible":False,"error":"Solver failed; check the installed SciPy runtime."}
        except subprocess.TimeoutExpired:
            process.kill();process.communicate();result={"status":"time_limited","feasible":False,"selected":None,"error":"Worker deadline reached without a validated solution."}
        with SessionLocal() as db:
            row=db.get(StudioRecord,rid);data=json.loads(row.data)
            if data["state"]!="running":return
            version=row.version;data.update(state="finished",result=result,finished_at=datetime.now(timezone.utc).isoformat())
            db.execute(update(StudioRecord).where(StudioRecord.id==rid,StudioRecord.version==version).values(data=json.dumps(data),version=version+1));db.commit()
    except Exception:
        with SessionLocal() as db:
            row=db.get(StudioRecord,rid)
            if row:
                data=json.loads(row.data)
                if data["state"] in {"queued","running"}:
                    version=row.version;data.update(state="failed",error="Allocation worker interrupted; create a new scenario to retry.")
                    db.execute(update(StudioRecord).where(StudioRecord.id==rid,StudioRecord.version==version).values(data=json.dumps(data),version=version+1));db.commit()
    finally:
        if process and process.poll() is None:process.kill();process.wait()
        with guard: processes.pop(rid,None);pending.discard(rid)

def enqueue(rid):
    with guard:
        if rid in pending:return
        pending.add(rid)
    pool.submit(worker,rid)

def recover_allocations():
    """Single-service startup: interrupted proposals never masquerade as results."""
    queued=[]
    with SessionLocal() as db:
        for row in db.query(StudioRecord).filter_by(kind="allocation").all():
            data=json.loads(row.data)
            if data["state"]=="queued":queued.append(row.id)
            elif data["state"]=="running":
                data.update(state="failed",error="Service restarted during optimization. Create a new scenario to retry.")
                row.data=json.dumps(data);row.version+=1
        db.commit()
    for rid in queued:enqueue(rid)

@router.get("/{sid}/allocations")
def listing(sid:str,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    lock_workspace(db,sid,user)
    return [record_out(r) for r in db.query(StudioRecord).filter_by(session_id=sid,kind="allocation").order_by(StudioRecord.created_at.desc()).all()]

@router.post("/{sid}/allocations",status_code=201)
def create(sid:str,payload:Scenario,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    lock_workspace(db,sid,user,True)
    with guard:
        if len(pending)>=20:raise HTTPException(429,"Local solver queue is full; try again after an active scenario finishes.")
    row=StudioRecord(session_id=sid,author_id=user.id,kind="allocation",title=payload.title,data=json.dumps({"input":payload.model_dump(),"state":"queued","result":None}))
    db.add(row);db.commit();db.refresh(row);result=record_out(row);enqueue(row.id);return result

@router.post("/{sid}/allocations/{rid}/cancel")
def cancel(sid:str,rid:str,payload:Revision,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    lock_workspace(db,sid,user,True);row=owned(db,sid,rid,"allocation");data=json.loads(row.data)
    if row.version!=payload.version or data["state"] not in {"queued","running"}:raise HTTPException(409,"Reload the current active scenario.")
    data["state"]="cancelled"
    changed=db.execute(update(StudioRecord).where(StudioRecord.id==rid,StudioRecord.version==payload.version).values(data=json.dumps(data),version=payload.version+1)).rowcount
    if not changed:raise HTTPException(409,"Scenario changed; reload.")
    db.commit()
    with guard:
        process=processes.get(rid)
        if process and process.poll() is None:process.kill()
    return {"state":"cancelled"}

@router.post("/{sid}/allocations/{rid}/apply")
def apply(sid:str,rid:str,payload:Revision,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    lock_workspace(db,sid,user,True);row=owned(db,sid,rid,"allocation");data=json.loads(row.data)
    if row.version!=payload.version or data["state"]!="finished" or not data["result"]["feasible"]:raise HTTPException(409,"Review a current feasible proposal first.")
    if data.get("plan_id"):return record_out(owned(db,sid,data["plan_id"],"allocation_plan"))
    previous=db.query(StudioRecord).filter_by(session_id=sid,kind="allocation_plan").order_by(StudioRecord.created_at.desc()).first()
    plan=StudioRecord(session_id=sid,author_id=user.id,kind="allocation_plan",title=row.title,data=json.dumps({"scenario_id":rid,"input":data["input"],"result":data["result"],"previous_plan_id":previous.id if previous else None}))
    db.add(plan);db.flush();data["plan_id"]=plan.id;row.data=json.dumps(data);row.version+=1;record_activity(db,sid,user,"Allocation proposal applied as new plan",row.title);db.commit();db.refresh(plan);return record_out(plan)
