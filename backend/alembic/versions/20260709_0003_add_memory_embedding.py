"""add business_memories.embedding column for RAG

Revision ID: 20260709_0003
Revises: 20260702_0002
Create Date: 2026-07-09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260709_0003"
down_revision: Union[str, None] = "20260702_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("business_memories") as batch_op:
        batch_op.add_column(sa.Column("embedding", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("business_memories") as batch_op:
        batch_op.drop_column("embedding")
