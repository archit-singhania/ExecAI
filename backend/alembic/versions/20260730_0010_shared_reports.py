"""add shared reports"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260730_0010"
down_revision: Union[str, None] = "20260730_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "shared_reports",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("slug", sa.String(length=32), nullable=False),
        sa.Column("report_id", sa.String(length=36), sa.ForeignKey("agent_reports.id"), nullable=False),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_viewed_at", sa.DateTime(), nullable=True),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_shared_reports_slug", "shared_reports", ["slug"], unique=True)
    op.create_index("ix_shared_reports_report_id", "shared_reports", ["report_id"])
    op.create_index("ix_shared_reports_user_id", "shared_reports", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_shared_reports_user_id", table_name="shared_reports")
    op.drop_index("ix_shared_reports_report_id", table_name="shared_reports")
    op.drop_index("ix_shared_reports_slug", table_name="shared_reports")
    op.drop_table("shared_reports")
