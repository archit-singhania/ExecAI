"""add billing columns to users"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260729_0008"
down_revision: Union[str, None] = "20260729_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("tier", sa.String(length=24), nullable=False, server_default="free"))
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("subscription_id", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("subscription_status", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("subscription_ends_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("runs_this_period", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("period_started_at", sa.DateTime(), nullable=True))
    op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"])


def downgrade() -> None:
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    for column in (
        "period_started_at",
        "runs_this_period",
        "subscription_ends_at",
        "subscription_status",
        "subscription_id",
        "stripe_customer_id",
        "tier",
    ):
        op.drop_column("users", column)
