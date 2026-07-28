"""add halcyon session tables

Revision ID: 20260728_0005
Revises: 20260728_0004
Create Date: 2026-07-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260728_0005"
down_revision: Union[str, None] = "20260728_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "halcyon_sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("world", sa.String(length=40), nullable=False, server_default="zen_garden"),
        sa.Column("consent_to_store", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("turn_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_halcyon_sessions_user_id", "halcyon_sessions", ["user_id"])

    op.create_table(
        "halcyon_turns",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("session_id", sa.String(length=36), sa.ForeignKey("halcyon_sessions.id"), nullable=False),
        sa.Column("turn_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("affect_label", sa.String(length=32), nullable=False, server_default="neutral"),
        sa.Column("valence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("arousal", sa.Float(), nullable=False, server_default="0.4"),
        sa.Column("environment", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_halcyon_turns_session_id", "halcyon_turns", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_halcyon_turns_session_id", table_name="halcyon_turns")
    op.drop_table("halcyon_turns")
    op.drop_index("ix_halcyon_sessions_user_id", table_name="halcyon_sessions")
    op.drop_table("halcyon_sessions")
