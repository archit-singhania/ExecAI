"""add review_schedules for automatic board reviews

Revision ID: 20260728_0004
Revises: 20260709_0003
Create Date: 2026-07-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260728_0004"
down_revision: Union[str, None] = "20260709_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "review_schedules",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("cadence", sa.String(length=24), nullable=False, server_default="weekly"),
        sa.Column("weekday", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("hour", sa.Integer(), nullable=False, server_default="9"),
        sa.Column("tz_offset_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_run_at", sa.DateTime(), nullable=True),
        sa.Column("next_run_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "ix_review_schedules_user_id",
        "review_schedules",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_review_schedules_user_id", table_name="review_schedules")
    op.drop_table("review_schedules")
