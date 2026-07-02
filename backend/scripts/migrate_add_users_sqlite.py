"""One-off patch for existing SQLite dev databases created before auth was added.

Safe to run multiple times. Stop the backend server before running this
(Windows will keep the .db file locked while uvicorn is running).

Usage (from the backend/ directory, with your venv active):
    python scripts/migrate_add_users_sqlite.py
"""

import sqlite3
from pathlib import Path

DB_FILES = ["ceo_ai.db", "test_ceo_ai.db"]


def patch(db_path: Path) -> None:
    if not db_path.exists():
        print(f"skip (not found): {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            hashed_password VARCHAR(255) NOT NULL,
            name VARCHAR(120) NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL
        )
        """
    )
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)")

    cursor.execute("PRAGMA table_info(business_sessions)")
    columns = [row[1] for row in cursor.fetchall()]
    if "user_id" not in columns:
        cursor.execute("ALTER TABLE business_sessions ADD COLUMN user_id VARCHAR(36)")
        print(f"added user_id column: {db_path}")
    else:
        print(f"user_id already present: {db_path}")

    conn.commit()
    conn.close()
    print(f"patched: {db_path}")


if __name__ == "__main__":
    backend_dir = Path(__file__).resolve().parent.parent
    for name in DB_FILES:
        patch(backend_dir / name)
