"""add predictions for agent calibration"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260730_0012"
down_revision: Union[str, None] = "20260730_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "predictions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "session_id",
            sa.String(length=36),
            sa.ForeignKey("business_sessions.id"),
            nullable=False,
        ),
        sa.Column("agent", sa.String(length=80), nullable=False),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=False, server_default="75"),
        sa.Column("due_at", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_predictions_session_id", "predictions", ["session_id"])
    op.create_index("ix_predictions_agent", "predictions", ["agent"])
    op.create_index("ix_predictions_status", "predictions", ["status"])
    op.create_index("ix_predictions_due_at", "predictions", ["due_at"])


def downgrade() -> None:
    op.drop_index("ix_predictions_due_at", table_name="predictions")
    op.drop_index("ix_predictions_status", table_name="predictions")
    op.drop_index("ix_predictions_agent", table_name="predictions")
    op.drop_index("ix_predictions_session_id", table_name="predictions")
    op.drop_table("predictions")
