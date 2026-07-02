import os
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./test_ceo_ai.db"
Path("test_ceo_ai.db").unlink(missing_ok=True)

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_session_message_flow():
    created = client.post("/api/sessions", json={"business_goal": "Build an AI CEO for founders"})
    assert created.status_code == 200
    session_id = created.json()["id"]

    message = client.post(
        f"/api/sessions/{session_id}/messages",
        json={"content": "Challenge my launch plan and create priorities."},
    )
    assert message.status_code == 200
    body = message.json()
    assert body["role"] == "assistant"
    assert "CEO decision" in body["content"]
    assert len(body["reports"]) == 9


def test_tasks_reports_memories_and_board_meeting():
    created = client.post("/api/sessions", json={"business_goal": "Launch AI accounting for freelancers"})
    session_id = created.json()["id"]

    client.post(
        f"/api/sessions/{session_id}/messages",
        json={"content": "Create validation tasks and board-level risks."},
    )

    tasks = client.get(f"/api/sessions/{session_id}/tasks")
    assert tasks.status_code == 200
    first_task = tasks.json()[0]

    updated = client.patch(f"/api/tasks/{first_task['id']}", json={"status": "Done"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "Done"
    assert updated.json()["completed_at"] is not None

    reports = client.get(f"/api/sessions/{session_id}/reports")
    assert reports.status_code == 200
    assert len(reports.json()) >= 9

    memories = client.get(f"/api/sessions/{session_id}/memories")
    assert memories.status_code == 200
    assert len(memories.json()) >= 2

    board = client.post(f"/api/sessions/{session_id}/board-meeting")
    assert board.status_code == 200
    assert board.json()["report_type"] == "board"

    board_history = client.get(f"/api/sessions/{session_id}/board-meetings")
    assert board_history.status_code == 200
    assert len(board_history.json()) == 1

    report_id = reports.json()[0]["id"]
    report_detail = client.get(f"/api/reports/{report_id}")
    assert report_detail.status_code == 200
    assert report_detail.json()["id"] == report_id

    exported = client.get(f"/api/reports/{report_id}/export")
    assert exported.status_code == 200
    assert "# " in exported.json()["markdown"]

    memory_search = client.get(f"/api/sessions/{session_id}/memories/search?q=validation")
    assert memory_search.status_code == 200
    assert "results" in memory_search.json()
