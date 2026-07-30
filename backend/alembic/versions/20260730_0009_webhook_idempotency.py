"""add processed webhook events for stripe idempotency"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260730_0009"
down_revision: Union[str, None] = "20260729_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "processed_webhook_events",
        sa.Column("id", sa.String(length=80), primary_key=True),
        sa.Column("event_type", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("processed_webhook_events")
