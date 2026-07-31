"""store conviction spread on sessions"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260730_0014"
down_revision: Union[str, None] = "20260730_0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "business_sessions",
        sa.Column("conviction_spread", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "business_sessions",
        sa.Column("most_sceptical", sa.String(length=80), nullable=False, server_default=""),
    )
    op.add_column(
        "business_sessions",
        sa.Column("most_convinced", sa.String(length=80), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("business_sessions", "most_convinced")
    op.drop_column("business_sessions", "most_sceptical")
    op.drop_column("business_sessions", "conviction_spread")
