"""Product behavior acceptance: isolation, persistence, roles and durable board runs."""
import io
import time
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import User, Job
from app.studio_models import StudioRecord, RunEvent

client = TestClient(app)

def test_specialist_debate_is_scoped_and_preserves_two_sources():
    owner, _, _ = account(); other, _, _ = account(); sid = workspace(owner)
    path = f"/api/studio/{sid}/debate"
    payload = {"question": "Should we launch now or validate demand?", "specialist": "cfo", "challenger": "product"}
    assert client.post(path, headers=other, json=payload).status_code == 404
    value = client.post(path, headers=owner, json=payload)
    assert value.status_code == 200, value.text
    reports = value.json()["data"]["reports"]
    assert len(reports) == 2 and reports[0]["agent"] != reports[1]["agent"]
    assert all(r["source"] == "local-template" for r in reports)
    payload["challenger"] = "cfo"
    assert client.post(path, headers=owner, json=payload).status_code == 422

def test_metric_history_and_recipient_only_mentions():
    owner, _, _ = account(); colleague, user, email = account(); sid = workspace(owner)
    client.post(f"/api/studio/{sid}/members", headers=owner, json={"email": email, "role": "editor"})
    path = f"/api/studio/{sid}/records"
    payload = {"kind": "metric", "title": "Buyer interviews", "data": {"value": 2, "target": 5, "objective": "Validate demand"}}
    metric = client.post(path, headers=owner, json=payload).json()
    payload.update(version=metric["version"], data={"value": 5, "target": 5, "objective": "Validate demand"})
    assert client.put(path + "/" + metric["id"], headers=owner, json=payload).status_code == 200
    history = client.get(path, headers=owner).json()
    assert any(r["kind"] == "metric_observation" and r["data"]["value"] == 2 for r in history)
    client.post(path, headers=owner, json={"kind": "comment", "title": "Review the evidence", "body": "@" + email + " Please inspect these interviews."})
    notices = client.get(f"/api/studio/{sid}/notifications", headers=colleague).json()
    assert notices and notices[0]["data"]["recipient_id"] == user["id"]
    assert not any(r["kind"] == "notification" for r in client.get(path, headers=owner).json())
    assert client.post(f"/api/studio/{sid}/notifications/{notices[0]['id']}/read", headers=owner).status_code == 404
    assert client.post(f"/api/studio/{sid}/notifications/{notices[0]['id']}/read", headers=colleague).status_code == 200

def test_reusable_briefs_and_archive_preserve_records():
    owner, _, _ = account(); sid = workspace(owner); path = f"/api/studio/{sid}/records"
    brief = client.post(path, headers=owner, json={"kind": "template", "title": "Launch gate", "body": "Assess launch evidence"}).json()
    archive = client.post(path, headers=owner, json={"kind": "archive", "title": "Archive"}).json()
    assert next(w for w in client.get("/api/studio/workspaces", headers=owner).json() if w["id"] == sid)["archived"]
    client.delete(path + "/" + archive["id"], headers=owner)
    assert any(r["id"] == brief["id"] for r in client.get(path, headers=owner).json())

def test_timezone_schedule_handles_daylight_saving_transition():
    from datetime import datetime
    from app.scheduling import compute_next_run
    before = compute_next_run("weekly", 0, 9, 0, now=datetime(2026, 3, 2, 15), timezone="America/New_York")
    assert before == datetime(2026, 3, 9, 13)  # 09:00 EDT after the spring transition.
    owner, _, _ = account()
    result = client.put("/api/review-schedule", headers=owner, json={"cadence": "weekly", "weekday": 0, "hour": 9, "timezone": "America/New_York"})
    assert result.status_code == 200 and result.json()["timezone"] == "America/New_York"
    assert client.put("/api/review-schedule", headers=owner, json={"timezone": "Mars/Nope"}).status_code == 422

def test_cookie_mutation_rejects_untrusted_origin():
    owner, _, _ = account()
    result = client.post("/api/sessions", headers={**owner, "Origin": "https://untrusted.example"}, json={"business_goal": "Inspect a company"})
    assert result.status_code == 403

def account():
    email = f"{uuid.uuid4().hex}@example.com"
    result = client.post("/api/auth/signup", json={"name": "Founder", "email": email, "password": "correct-horse-battery"})
    assert result.status_code == 200, result.text
    body = result.json()
    with SessionLocal() as db:
        db.get(User, body["user"]["id"]).tier = "agency"
        db.commit()
    return {"Authorization": "Bearer " + body["access_token"]}, body["user"], email

def workspace(headers):
    result = client.post("/api/sessions", headers=headers, json={"business_goal": "Build a focused B2B service with evidence before spending."})
    assert result.status_code == 200, result.text
    return result.json()["id"]

def test_workspace_roles_and_optimistic_decision_versions():
    owner, _, _ = account(); stranger, _, email = account(); sid = workspace(owner)
    path = f"/api/studio/{sid}/records"
    payload = {"kind": "decision", "title": "Validate first", "body": "Interview buyers", "data": {"assumptions": "Demand unproven"}}
    assert client.get(path, headers=stranger).status_code == 404
    assert client.post(f"/api/studio/{sid}/members", headers=owner, json={"email": email, "role": "viewer"}).status_code == 200
    assert client.get(path, headers=stranger).status_code == 200
    assert client.post(path, headers=stranger, json=payload).status_code == 403
    r = client.post(path, headers=owner, json=payload).json()
    payload.update(version=r["version"], body="Interview ten buyers")
    assert client.put(path + "/" + r["id"], headers=owner, json=payload).status_code == 200
    assert client.put(path + "/" + r["id"], headers=owner, json=payload).status_code == 409
    versions = client.get(path, headers=owner).json()
    assert any(item["kind"] == "decision_revision" and item["body"] == "Interview buyers" for item in versions)

def test_financial_scenarios_calculate_real_inputs_and_reject_invalid_data():
    owner, _, _ = account(); sid = workspace(owner); path = f"/api/studio/{sid}/records"
    payload = {"kind": "scenario", "title": "Lean launch", "data": {"cash": 12000, "monthly_cost": 3000, "monthly_revenue": 1000, "ad_spend": 100, "customers": 10, "arpu": 50, "margin": .8, "churn": .1}}
    result = client.post(path, headers=owner, json=payload)
    assert result.status_code == 201, result.text
    assert result.json()["data"]["result"]["runway_months"] == 6
    assert result.json()["data"]["result"]["cac"] == 10
    payload["data"]["cash"] = -1
    assert client.post(path, headers=owner, json=payload).status_code == 422

def test_task_dependencies_and_assignment_enforce_workspace_boundaries():
    owner, user, _ = account(); sid = workspace(owner); path = f"/api/studio/{sid}/tasks"
    base = {"title": "Interview customers", "status": "Ready", "assignee_id": user["id"]}
    first = client.post(path, headers=owner, json=base).json()["id"]
    dependent = client.post(path, headers=owner, json={"title": "Ship experiment", "dependencies": [first]}).json()["id"]
    assert client.put(path + "/" + dependent, headers=owner, json={"title": "Ship experiment", "status": "Done", "dependencies": [first]}).status_code == 409
    assert client.put(path + "/" + first, headers=owner, json={"title": "Interview customers", "status": "Done"}).status_code == 200
    assert client.put(path + "/" + dependent, headers=owner, json={"title": "Ship experiment", "status": "Done", "dependencies": [first]}).status_code == 200
    assert client.post(path, headers=owner, json={"title": "Wrong dependency", "dependencies": ["missing"]}).status_code == 422

def test_knowledge_upload_search_and_ownership():
    owner, _, _ = account(); stranger, _, _ = account(); sid = workspace(owner)
    result = client.post(f"/api/studio/{sid}/knowledge", headers=owner, files={"file": ("notes.md", b"Our target buyer is a freelance accountant. They need invoice reconciliation.", "text/markdown")})
    assert result.status_code == 201, result.text
    search = client.get(f"/api/studio/{sid}/knowledge/search?q=invoice", headers=owner)
    assert search.json()["results"][0]["document_id"] == result.json()["id"]
    assert client.get(f"/api/studio/{sid}/knowledge/search?q=invoice", headers=stranger).status_code == 404
    assert client.post(f"/api/studio/{sid}/knowledge", headers=owner, files={"file": ("bad.exe", b"data", "application/octet-stream")}).status_code == 422

def test_canonical_run_streams_all_nine_and_persists_predictions():
    owner, _, _ = account(); sid = workspace(owner)
    result = client.post(f"/api/sessions/{sid}/messages", headers=owner, json={"content": "Assess a niche invoice automation service for accountants."})
    assert result.status_code == 200, result.text
    assert len(result.json()["reports"]) == 9
    predictions = client.get("/api/predictions", headers=owner).json()
    assert len(predictions["predictions"]) >= 9
    jobs = client.get("/api/jobs", headers=owner).json()
    assert jobs[0]["status"] == "done"
    assert len({r["agent"] for r in jobs[0]["reports"]}) == 9
    assert all(r["source"] == "local-template" for r in jobs[0]["reports"])

def test_revocation_and_password_change_invalidate_existing_tokens():
    owner, _, _ = account()
    active = client.get("/api/studio/security/sessions", headers=owner).json()
    assert client.delete("/api/studio/security/sessions/" + active[0]["id"], headers=owner).status_code == 200
    assert client.get("/api/auth/me", headers=owner).status_code == 401
    headers, _, _ = account()
    assert client.post("/api/account/password", headers=headers, json={"current_password": "correct-horse-battery", "new_password": "a-new-secure-password"}).status_code == 200
    assert client.get("/api/auth/me", headers=headers).status_code == 401

def test_board_review_is_completed_and_export_is_a_real_pdf():
    owner, _, _ = account(); sid = workspace(owner)
    review = client.post(f"/api/sessions/{sid}/board-meeting", headers=owner)
    assert review.status_code == 200, review.text
    assert "Progress" not in review.json()["title"]
    pdf = client.get(f"/api/studio/{sid}/reports/{review.json()['id']}/pdf", headers=owner)
    assert pdf.status_code == 200, pdf.text
    assert pdf.content.startswith(b"%PDF-")

def test_account_deletion_cleans_new_studio_data():
    owner, _, _ = account(); sid = workspace(owner)
    assert client.post(f"/api/studio/{sid}/records", headers=owner, json={"kind": "decision", "title": "Deleteable", "data": {}}).status_code == 201
    result = client.request("DELETE", "/api/account", headers=owner, json={"password": "correct-horse-battery", "confirmation": "DELETE"})
    assert result.status_code == 200, result.text
    assert client.get("/api/auth/me", headers=owner).status_code == 401
