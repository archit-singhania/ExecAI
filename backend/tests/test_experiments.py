from test_outcomes import setup_review
from test_studio import client, account

def test_experiment_lifecycle_revision_evidence_and_closure():
    owner,root,_,review_input,_=setup_review()
    plan={"baseline_id":review_input["baseline_id"],"hypothesis":"Interviews improve retention","criteria":["Users describe value"],"starts_on":"2026-10-01","ends_on":"2026-12-31","stop_conditions":"Stop if customers withdraw"}
    response=client.post(root+"/experiments",headers=owner,json=plan)
    assert response.status_code==201,response.text
    row=response.json(); path=root+"/experiments/"+row["id"]
    other,_,_=account()
    assert client.get(root+"/experiments",headers=other).status_code==404
    assert client.delete(root+"/records/"+row["id"],headers=owner).status_code==409
    active=client.post(path+"/events",headers=owner,json={"version":1,"action":"activate"}).json()
    assert active["data"]["status"]=="active"
    assert client.post(path+"/events",headers=owner,json={"version":1,"action":"activate"}).status_code==409
    event={"version":active["version"],"action":"checkpoint","criterion":0,"assessment":"met"}
    assert client.post(path+"/events",headers=owner,json=event).status_code==422
    event.update(observation="Two interview transcripts",source="Owned interview notes",measured_on="2026-11-01")
    saved=client.post(path+"/events",headers=owner,json=event)
    assert saved.status_code==200,saved.text
    revised=client.put(path,headers=owner,json={**plan,"version":saved.json()["version"],"criteria":["Five users describe value"]})
    assert revised.status_code==200,revised.text
    assert len(revised.json()["data"]["history"])==2
    closed=client.post(path+"/events",headers=owner,json={"version":revised.json()["version"],"action":"stopped","observation":"Insufficient evidence for revised criterion","actions":["Review next steps"]})
    assert closed.status_code==200,closed.text
    data=closed.json()["data"]
    reviews=client.get(root+"/outcome-reviews",headers=owner).json()
    review=next(r for r in reviews if r["id"]==data["review_id"])
    assert review["data"]["status"]=="draft"
    assert review["data"]["observations"][0]["narrative"]==""
    assert review["data"]["actions"]==["Review next steps"]
    assert client.put(path,headers=owner,json={**plan,"version":closed.json()["version"]}).status_code==409
    assert client.get(root+"/experiments",headers=owner).json()[0]["data"]==data

def test_experiment_readonly_invalid_window_and_completed_review():
    owner,root,_,review_input,_=setup_review()
    other,_,email=account()
    assert client.post(root+"/members",headers=owner,json={"email":email,"role":"viewer"}).status_code==200
    plan={"baseline_id":review_input["baseline_id"],"hypothesis":"Check demand","criteria":["Interview evidence"],"starts_on":"2026-11-01","ends_on":"2026-11-30","stop_conditions":"Consent withdrawn"}
    assert client.post(root+"/experiments",headers=other,json=plan).status_code==403
    assert client.post(root+"/experiments",headers=owner,json={**plan,"ends_on":"2026-01-01"}).status_code==422
    row=client.post(root+"/experiments",headers=owner,json=plan).json(); path=root+"/experiments/"+row["id"]+"/events"
    row=client.post(path,headers=owner,json={"version":1,"action":"activate"}).json()
    payload={"version":row["version"],"action":"checkpoint","criterion":0,"observation":"Interview recorded","source":"Interview 1","measured_on":"2026-10-01"}
    assert client.post(path,headers=owner,json=payload).status_code==422
    assert client.post(path,headers=other,json=payload).status_code==403
    row=client.post(path,headers=owner,json={**payload,"measured_on":"2026-11-05"}).json()
    row=client.post(path,headers=owner,json={"version":row["version"],"action":"completed","observation":"Review evidence without causal claim"}).json()
    assert row["data"]["status"]=="completed"
    review=next(r for r in client.get(root+"/outcome-reviews",headers=owner).json() if r["id"]==row["data"]["review_id"])
    assert review["data"]["observations"][0]["source"]=="Interview 1"

def test_kpi_checkpoint_uses_approved_snapshot_not_mutated_metric():
    owner,root,_,review_input,_=setup_review()
    baseline=client.get(root+"/freshness",headers=owner).json()["baselines"][0]
    metric=baseline["data"]["evidence"][0]
    plan={"baseline_id":baseline["id"],"hypothesis":"Measure orders","criteria":["Orders"],"starts_on":"2026-11-01","ends_on":"2026-11-30","stop_conditions":"Budget exhausted"}
    row=client.post(root+"/experiments",headers=owner,json=plan).json()
    path=root+"/experiments/"+row["id"]+"/events"
    client.post(path,headers=owner,json={"version":1,"action":"activate"})
    client.put(root+"/records/"+metric["id"],headers=owner,json={"kind":"metric","title":"Later","data":{"value":999},"version":metric["version"]})
    event={"version":2,"action":"checkpoint","criterion":0,"observation":"Review approved orders","measured_on":"2026-11-10","kpi_baseline_id":baseline["id"],"kpi_id":metric["id"]}
    assert client.post(path,headers=owner,json={**event,"kpi_id":"missing"}).status_code==422
    response=client.post(path,headers=owner,json=event)
    assert response.status_code==200,response.text
    checkpoint=response.json()["data"]["checkpoints"][0]
    assert checkpoint["kpi_snapshot"]["data"]["value"]==3
    assert checkpoint["source"].startswith("Approved KPI:")

def test_owner_reassignment_requires_workspace_owner_and_eligible_member():
    owner,root,_,review_input,_=setup_review()
    editor,editor_user,email=account()
    client.post(root+"/members",headers=owner,json={"email":email,"role":"editor"})
    plan={"baseline_id":review_input["baseline_id"],"hypothesis":"Ownership","criteria":["Accountability"],"starts_on":"2026-11-01","ends_on":"2026-11-30","stop_conditions":"Stop"}
    row=client.post(root+"/experiments",headers=owner,json=plan).json()
    path=root+"/experiments/"+row["id"]+"/owner"
    payload={"version":1,"owner_id":editor_user["id"]}
    assert client.post(path,headers=editor,json=payload).status_code==403
    assert client.post(path,headers=owner,json={**payload,"owner_id":"unknown"}).status_code==422
    response=client.post(path,headers=owner,json=payload)
    assert response.status_code==200,response.text
    assert response.json()["data"]["owner_id"]==editor_user["id"]
    assert len(response.json()["data"]["owner_history"])==1
    assert client.post(path,headers=owner,json=payload).status_code==409

    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier

    ready = Barrier(2)

    def reassign(member_id):
        ready.wait(timeout=5)
        return client.post(path, headers=owner, json={
            "version": response.json()["version"], "owner_id": member_id,
        })

    _, alternate, alternate_email = account()
    assert client.post(root+"/members", headers=owner, json={
        "email": alternate_email, "role": "editor",
    }).is_success
    with ThreadPoolExecutor(2) as pool:
        first = pool.submit(reassign, row["data"]["owner_id"])
        second = pool.submit(reassign, alternate["id"])
        results = [first.result(timeout=15), second.result(timeout=15)]
    assert sorted(result.status_code for result in results) == [200, 409]
    winner = next(result.json() for result in results if result.is_success)
    current = client.get(root+"/experiments", headers=owner).json()[0]
    assert current["data"]["owner_id"] == winner["data"]["owner_id"]
    assert len(current["data"]["owner_history"]) == 2
