"""flag halcyon sessions that have touched a crisis

Once a session has been flagged it stays careful for the rest of its life.
There is deliberately no path that clears this column.

Revision ID: 20260728_0006
Revises: 20260728_0005
Create Date: 2026-07-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260728_0006"
down_revision: Union[str, None] = "20260728_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "halcyon_sessions",
        sa.Column("crisis_flagged", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("halcyon_sessions", "crisis_flagged")
