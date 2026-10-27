"""Real HTTP/database acceptance for outcome review lifecycle and boundaries."""
from test_studio import account, workspace, client


def setup_review():
    owner, _, _ = account()
    sid = workspace(owner)
    root = f"/api/studio/{sid}"
    decision = client.post(root + "/records", headers=owner, json={"kind": "decision", "title": "Validate demand", "body": "Run a small launch"}).json()
    metric = client.post(root + "/records", headers=owner, json={"kind": "metric", "title": "Orders", "data": {"value": 3, "target": 10}}).json()
    baseline = client.post(root + "/freshness/baselines", headers=owner, json={"confirmed": True, "decision_id": decision["id"], "evidence_ids": [metric["id"]]}).json()
    payload = {"baseline_id": baseline["id"], "review_date": "2026-11-30", "criteria": [
        {"label": "Orders", "kind": "numeric", "target": 10, "unit": "orders", "period": "November 2026"},
        {"label": "Feedback", "kind": "qualitative", "expected": "Users can explain the product"}]}
    response = client.post(root + "/outcome-reviews", headers=owner, json=payload)
    assert response.status_code == 201, response.text
    return owner, root, decision, payload, response.json()


def test_outcome_freeze_correction_snapshot_and_idempotent_tasks():
    owner, root, decision, _, row = setup_review()
    path = root + "/outcome-reviews/" + row["id"]
    assert row["data"]["comparisons"][0]["variance"] is None
    observed = row["data"]["observations"]
    observed[0].update(actual=0, unit="orders", period="November 2026", source="Sales ledger", measured_on="2026-11-30")
    payload = {"version": row["version"], "observations": observed, "lessons": "No sales; qualitative evidence still missing.", "actions": ["Interview five buyers"], "complete": True}
    response = client.put(path, headers=owner, json=payload)
    assert response.status_code == 200, response.text
    completed = response.json()
    assert completed["data"]["comparisons"][0]["variance"] == -10
    assert client.put(path, headers=owner, json={**payload, "version": completed["version"]}).status_code == 409
    assert client.delete(root + "/records/" + row["id"], headers=owner).status_code == 409
    task_payload = {"version": completed["version"], "confirmed": True, "indexes": [0]}
    first = client.post(path + "/tasks", headers=owner, json=task_payload)
    assert first.status_code == 200, first.text
    assert client.post(path + "/tasks", headers=owner, json=task_payload).json() == first.json()
    assert client.post(path + "/tasks", headers=owner, json={**task_payload, "confirmed": False}).status_code == 422
    assert client.post(path + "/tasks", headers=owner, json={**task_payload, "indexes": [-1]}).status_code == 422
    changed = client.put(root + "/records/" + decision["id"], headers=owner, json={"kind": "decision", "title": "Changed later", "body": "Different strategy", "version": decision["version"]})
    assert changed.status_code == 200
    correction = client.post(path + "/corrections", headers=owner, json={"version": completed["version"]})
    assert correction.status_code == 201, correction.text
    assert correction.json()["data"]["decision"]["title"] == "Validate demand"
    assert correction.json()["data"]["previous_review_id"] == row["id"]
    persisted = client.get(root + "/outcome-reviews", headers=owner).json()
    assert next(r for r in persisted if r["id"] == row["id"])["data"] == completed["data"]


def test_outcome_units_missing_sources_stale_versions_and_roles():
    owner, root, _, _, row = setup_review()
    other, _, email = account()
    path = root + "/outcome-reviews/" + row["id"]
    assert client.get(root + "/outcome-reviews", headers=other).status_code == 404
    observed = row["data"]["observations"]
    observed[0].update(actual=12, unit="customers", period="November 2026")
    payload = {"version": row["version"], "observations": observed}
    assert client.put(path, headers=owner, json=payload).status_code == 422
    observed[0].update(source="CRM export", measured_on="2026-11-30")
    result = client.put(path, headers=owner, json=payload)
    assert result.status_code == 200, result.text
    assert result.json()["data"]["comparisons"][0]["variance"] is None
    assert "differ" in result.json()["data"]["comparisons"][0]["explanation"]
    assert client.put(path, headers=owner, json=payload).status_code == 409
    assert client.post(root + "/members", headers=owner, json={"email": email, "role": "viewer"}).status_code == 200
    assert client.get(root + "/outcome-reviews", headers=other).status_code == 200
    assert client.put(path, headers=other, json=payload).status_code == 403


def test_outcome_rejects_stale_approval_and_foreign_baselines():
    owner, root, decision, payload, _ = setup_review()
    changed = client.put(root + "/records/" + decision["id"], headers=owner, json={"kind": "decision", "title": "Revised", "version": decision["version"]})
    assert changed.status_code == 200
    assert client.post(root + "/outcome-reviews", headers=owner, json=payload).status_code == 409
    sid = workspace(owner)
    assert client.post(f"/api/studio/{sid}/outcome-reviews", headers=owner, json=payload).status_code == 404


def test_outcome_invalid_criteria_and_measurements_do_not_save():
    owner, root, _, payload, row = setup_review()
    bad = {**payload, "criteria": [{"label": "Blank target", "unit": "orders", "period": "November"}]}
    assert client.post(root + "/outcome-reviews", headers=owner, json=bad).status_code == 422
    obs = row["data"]["observations"]
    obs[0]["actual"] = "NaN"
    assert client.put(root + "/outcome-reviews/" + row["id"], headers=owner, json={"version": 1, "observations": obs}).status_code == 422
    assert client.get(root + "/outcome-reviews", headers=owner).json()[0]["version"] == 1
