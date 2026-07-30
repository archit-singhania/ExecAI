"""add indexes on hot query paths"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260730_0013"
down_revision: Union[str, None] = "20260730_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEXES = [
    ("ix_agent_reports_session_id", "agent_reports", ["session_id"]),
    ("ix_agent_reports_report_type", "agent_reports", ["report_type"]),
    ("ix_agent_reports_session_type", "agent_reports", ["session_id", "report_type"]),
    ("ix_tasks_session_id", "tasks", ["session_id"]),
    ("ix_tasks_session_status", "tasks", ["session_id", "status"]),
    ("ix_messages_session_id", "messages", ["session_id"]),
    ("ix_messages_session_created", "messages", ["session_id", "created_at"]),
    ("ix_business_memories_session_id", "business_memories", ["session_id"]),
    ("ix_business_sessions_user_id", "business_sessions", ["user_id"]),
    ("ix_business_sessions_user_updated", "business_sessions", ["user_id", "updated_at"]),
]


def upgrade() -> None:
    for name, table, columns in INDEXES:
        try:
            op.create_index(name, table, columns)
        except Exception:
            pass


def downgrade() -> None:
    for name, table, _ in reversed(INDEXES):
        try:
            op.drop_index(name, table_name=table)
        except Exception:
            pass
