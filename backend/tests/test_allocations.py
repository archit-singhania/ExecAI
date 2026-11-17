import time
from test_studio import client,account,workspace
from app.allocation_solver import solve
from app.allocations import Scenario

def plan():
    return {"title":"Capacity","budget":10,"staff_hours":10,"time_limit":5,"initiatives":[
        {"id":"a","name":"Foundation","cost":4,"hours":4,"value":5,"required":False,"dependencies":[]},
        {"id":"b","name":"Launch","cost":6,"hours":6,"value":12,"required":False,"dependencies":["a"]},
        {"id":"c","name":"Alternative","cost":10,"hours":10,"value":15,"required":False,"dependencies":[]}]}

def test_known_optimum_and_infeasibility():
    result=solve(plan())
    assert result["status"]=="optimal" and result["selected"]==["a","b"]
    assert result["value"]==17 and result["cost"]==10
    impossible=plan();impossible["budget"]=1;impossible["initiatives"][0]["required"]=True
    result=solve(impossible)
    assert result["status"]=="infeasible" and not result["feasible"] and result["cost"] is None

def test_http_worker_saved_plan_and_isolation():
    owner,_,_=account();other,_,_=account();sid=workspace(owner);root=f"/api/studio/{sid}"
    response=client.post(root+"/allocations",headers=owner,json=plan())
    assert response.status_code==201,response.text
    rid=response.json()["id"]
    assert client.get(root+"/allocations",headers=other).status_code==404
    for _ in range(150):
        row=next(r for r in client.get(root+"/allocations",headers=owner).json() if r["id"]==rid)
        if row["data"]["state"] not in {"queued","running"}:break
        time.sleep(.1)
    assert row["data"]["state"]=="finished",row
    assert row["data"]["result"]["selected"]==["a","b"]
    result=client.post(root+f"/allocations/{rid}/apply",headers=owner,json={"version":row["version"]})
    assert result.status_code==200,result.text
    assert result.json()["data"]["scenario_id"]==rid
    assert client.post(root+f"/allocations/{rid}/apply",headers=owner,json={"version":1}).status_code==409
    assert client.delete(root+"/records/"+rid,headers=owner).status_code==409

def test_cancel_queued_and_validation(monkeypatch):
    from app import allocations
    monkeypatch.setattr(allocations,"enqueue",lambda rid:None)
    owner,_,_=account();sid=workspace(owner);root=f"/api/studio/{sid}/allocations"
    row=client.post(root,headers=owner,json=plan()).json()
    assert client.post(root+"/"+row["id"]+"/cancel",headers=owner,json={"version":1}).status_code==200
    allocations.worker(row["id"])
    assert client.get(root,headers=owner).json()[0]["data"]["state"]=="cancelled"
    invalid=plan();invalid["initiatives"][0]["dependencies"]=["outside"]
    assert client.post(root,headers=owner,json=invalid).status_code==422

def test_time_limit_does_not_claim_optimality(monkeypatch):
    from types import SimpleNamespace
    import numpy as np
    from app import allocation_solver
    monkeypatch.setattr(allocation_solver,"milp",lambda *a,**k:SimpleNamespace(status=1,x=None))
    result=solve(plan());assert result["status"]=="time_limited" and not result["feasible"]
    monkeypatch.setattr(allocation_solver,"milp",lambda *a,**k:SimpleNamespace(status=1,x=np.array([1.,1.,0.])))
    result=solve(plan());assert result["status"]=="time_limited" and result["feasible"]

def test_recovery_requeues_saved_jobs_and_marks_interrupted(monkeypatch):
    import json
    from app import allocations
    from app.database import SessionLocal
    from app.studio_models import StudioRecord
    queued=[];monkeypatch.setattr(allocations,"enqueue",queued.append)
    owner,_,_=account();sid=workspace(owner);root=f"/api/studio/{sid}/allocations"
    row=client.post(root,headers=owner,json=plan()).json()
    queued.clear();allocations.recover_allocations();assert row["id"] in queued
    with SessionLocal() as db:
        record=db.get(StudioRecord,row["id"]);data=json.loads(record.data);data["state"]="running";record.data=json.dumps(data);db.commit()
    allocations.recover_allocations()
    assert client.get(root,headers=owner).json()[0]["data"]["state"]=="failed"
    invalid=plan();invalid["initiatives"][0]["value"]="NaN"
    assert client.post(root,headers=owner,json=invalid).status_code==422
