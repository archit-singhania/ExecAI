import os
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./test_ceo_ai.db"
Path("test_ceo_ai.db").unlink(missing_ok=True)

import uuid

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import User


client = TestClient(app)


def register(tier: str = "free") -> dict[str, str]:
    email = f"{uuid.uuid4().hex[:12]}@example.com"
    response = client.post(
        "/api/auth/signup",
        json={"name": "Test Founder", "email": email, "password": "correct-horse-battery"},
    )
    assert response.status_code == 200, response.text
    payload = response.json()

    if tier != "free":
        db = SessionLocal()
        try:
            user = db.get(User, payload["user"]["id"])
            user.tier = tier
            db.commit()
        finally:
            db.close()

    return {"Authorization": f"Bearer {payload['access_token']}"}


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_protected_routes_reject_anonymous_callers():
    assert client.post("/api/sessions", json={"business_goal": "x"}).status_code == 401
    assert client.get("/api/dashboard").status_code == 401


def test_session_message_flow():
    headers = register()

    created = client.post(
        "/api/sessions", json={"business_goal": "Build an AI CEO for founders"}, headers=headers
    )
    assert created.status_code == 200, created.text
    session_id = created.json()["id"]

    message = client.post(
        f"/api/sessions/{session_id}/messages",
        json={"content": "Challenge my launch plan and create priorities."},
        headers=headers,
    )
    assert message.status_code == 200, message.text
    body = message.json()
    assert body["role"] == "assistant"
    assert "CEO decision" in body["content"]
    assert len(body["reports"]) == 9


def test_sessions_are_scoped_to_their_owner():
    owner = register()
    intruder = register()

    created = client.post(
        "/api/sessions", json={"business_goal": "Private strategy"}, headers=owner
    )
    session_id = created.json()["id"]

    assert client.get(f"/api/sessions/{session_id}", headers=owner).status_code == 200
    assert client.get(f"/api/sessions/{session_id}", headers=intruder).status_code == 404


def test_free_tier_session_quota_is_enforced():
    headers = register()

    first = client.post("/api/sessions", json={"business_goal": "First"}, headers=headers)
    assert first.status_code == 200

    second = client.post("/api/sessions", json={"business_goal": "Second"}, headers=headers)
    assert second.status_code == 402
    assert "upgrade" in second.json()["detail"].lower()


def test_export_requires_a_paid_plan():
    free = register()
    created = client.post("/api/sessions", json={"business_goal": "Gated export"}, headers=free)
    session_id = created.json()["id"]
    client.post(
        f"/api/sessions/{session_id}/messages",
        json={"content": "Draft a plan."},
        headers=free,
    )

    reports = client.get(f"/api/sessions/{session_id}/reports", headers=free)
    report_id = reports.json()[0]["id"]

    blocked = client.get(f"/api/reports/{report_id}/export", headers=free)
    assert blocked.status_code == 402


def test_tasks_reports_memories_and_board_meeting():
    headers = register(tier="pro")

    created = client.post(
        "/api/sessions",
        json={"business_goal": "Launch AI accounting for freelancers"},
        headers=headers,
    )
    session_id = created.json()["id"]

    client.post(
        f"/api/sessions/{session_id}/messages",
        json={"content": "Create validation tasks and board-level risks."},
        headers=headers,
    )

    tasks = client.get(f"/api/sessions/{session_id}/tasks", headers=headers)
    assert tasks.status_code == 200
    first_task = tasks.json()[0]

    updated = client.patch(
        f"/api/tasks/{first_task['id']}", json={"status": "Done"}, headers=headers
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "Done"
    assert updated.json()["completed_at"] is not None

    reports = client.get(f"/api/sessions/{session_id}/reports", headers=headers)
    assert reports.status_code == 200
    assert len(reports.json()) >= 9

    memories = client.get(f"/api/sessions/{session_id}/memories", headers=headers)
    assert memories.status_code == 200
    assert len(memories.json()) >= 2

    board = client.post(f"/api/sessions/{session_id}/board-meeting", headers=headers)
    assert board.status_code == 200
    assert board.json()["report_type"] == "board"

    board_history = client.get(f"/api/sessions/{session_id}/board-meetings", headers=headers)
    assert board_history.status_code == 200
    assert len(board_history.json()) == 1

    report_id = reports.json()[0]["id"]
    report_detail = client.get(f"/api/reports/{report_id}", headers=headers)
    assert report_detail.status_code == 200
    assert report_detail.json()["id"] == report_id

    exported = client.get(f"/api/reports/{report_id}/export", headers=headers)
    assert exported.status_code == 200
    assert "# " in exported.json()["markdown"]

    memory_search = client.get(
        f"/api/sessions/{session_id}/memories/search?q=validation", headers=headers
    )
    assert memory_search.status_code == 200
    assert "results" in memory_search.json()


def test_billing_plans_are_public_and_priced_in_eur():
    response = client.get("/api/billing/plans")
    assert response.status_code == 200

    payload = response.json()
    assert payload["currency"] == "EUR"

    prices = {plan["id"]: plan["price_eur"] for plan in payload["plans"]}
    assert prices == {"free": 0.0, "pro": 4.99, "team": 9.99, "agency": 14.99}


def test_subscription_reports_the_current_plan():
    headers = register()
    response = client.get("/api/billing/me", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["tier"] == "free"
    assert body["runs_included"] > 0


def test_forgot_password_never_reveals_whether_an_account_exists():
    known = register()
    assert known

    unknown = client.post(
        "/api/auth/forgot-password", json={"email": "nobody-here@example.com"}
    )
    assert unknown.status_code == 200
    assert "if that email" in unknown.json()["detail"].lower()


def test_reset_rejects_a_bogus_token():
    response = client.post(
        "/api/auth/reset-password",
        json={"token": "x" * 40, "password": "a-new-password"},
    )
    assert response.status_code == 400
