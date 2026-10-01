"""Both clean installs and an existing owner's rows survive the additive upgrade."""
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

def test_migration_from_existing_schema_preserves_records(tmp_path):
    root = Path(__file__).resolve().parents[1]
    database = tmp_path / "migration.db"
    env = {**os.environ, "DATABASE_URL": "sqlite:///" + database.as_posix()}
    def migrate(version):
        result = subprocess.run([sys.executable, "-m", "alembic", "upgrade", version], cwd=root, env=env, capture_output=True, text=True)
        assert result.returncode == 0, result.stderr
    migrate("20260730_0014")
    with sqlite3.connect(database) as db:
        db.execute("INSERT INTO users(id,name,email,hashed_password,tier,created_at) VALUES('owner','Existing owner','owner@example.com','hash','free','2026-01-01')")
    migrate("head")
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT name FROM users WHERE id='owner'").fetchone()[0] == "Existing owner"
        assert db.execute("SELECT version_num FROM alembic_version").fetchone()[0] == "20261001_0015"
        assert "timezone" in [r[1] for r in db.execute("PRAGMA table_info(review_schedules)")]
        for name in ["studio_records", "workspace_members", "auth_sessions", "run_events", "knowledge_chunks"]:
            assert db.execute("SELECT name FROM sqlite_master WHERE name=?", (name,)).fetchone()
