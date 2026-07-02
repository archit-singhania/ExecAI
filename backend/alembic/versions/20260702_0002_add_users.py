"""add users table and business_sessions.user_id

Revision ID: 20260702_0002
Revises: 20260701_0001
Create Date: 2026-07-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260702_0002"
down_revision: Union[str, None] = "20260701_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    with op.batch_alter_table("business_sessions") as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.String(length=36), nullable=True))
        batch_op.create_foreign_key(
            "fk_business_sessions_user_id", "users", ["user_id"], ["id"]
        )


def downgrade() -> None:
    with op.batch_alter_table("business_sessions") as batch_op:
        batch_op.drop_constraint("fk_business_sessions_user_id", type_="foreignkey")
        batch_op.drop_column("user_id")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
