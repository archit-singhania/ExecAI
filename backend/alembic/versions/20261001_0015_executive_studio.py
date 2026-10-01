"""Add executive studio records, memberships, revocable sessions and run events."""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = "20261001_0015"
down_revision = "20260730_0014"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("review_schedules", sa.Column("timezone", sa.String(80), nullable=True))
    op.create_table("studio_records", sa.Column("id", sa.String(36), primary_key=True), sa.Column("session_id", sa.String(36), sa.ForeignKey("business_sessions.id"), nullable=False), sa.Column("author_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("kind", sa.String(30), nullable=False), sa.Column("title", sa.String(240), nullable=False), sa.Column("body", sa.Text(), nullable=False), sa.Column("data", sa.Text(), nullable=False), sa.Column("version", sa.Integer(), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False), sa.Column("updated_at", sa.DateTime(), nullable=False))
    for name in ["session_id", "author_id", "kind"]:
        op.create_index(f"ix_studio_records_{name}", "studio_records", [name])
    op.create_table("workspace_members", sa.Column("id", sa.String(36), primary_key=True), sa.Column("session_id", sa.String(36), sa.ForeignKey("business_sessions.id"), nullable=False), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("role", sa.String(20), nullable=False), sa.UniqueConstraint("session_id", "user_id"))
    for name in ["session_id", "user_id"]:
        op.create_index(f"ix_workspace_members_{name}", "workspace_members", [name])
    op.create_table("auth_sessions", sa.Column("id", sa.String(36), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False), sa.Column("label", sa.String(200), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False), sa.Column("expires_at", sa.DateTime(), nullable=False), sa.Column("revoked_at", sa.DateTime(), nullable=True))
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_table("run_events", sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True), sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id"), nullable=False), sa.Column("event", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False))
    op.create_index("ix_run_events_job_id", "run_events", ["job_id"])
    postgres = op.get_bind().dialect.name == "postgresql"
    if postgres:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table("knowledge_chunks", sa.Column("id", sa.String(36), primary_key=True), sa.Column("record_id", sa.String(36), sa.ForeignKey("studio_records.id"), nullable=False), sa.Column("session_id", sa.String(36), sa.ForeignKey("business_sessions.id"), nullable=False), sa.Column("content", sa.Text(), nullable=False), sa.Column("position", sa.Integer(), nullable=False), sa.Column("embedding", Vector(256) if postgres else sa.JSON(), nullable=False))
    for name in ["record_id", "session_id"]:
        op.create_index(f"ix_knowledge_chunks_{name}", "knowledge_chunks", [name])
    if postgres:
        op.create_index("ix_knowledge_chunks_vector", "knowledge_chunks", ["embedding"], postgresql_using="hnsw", postgresql_ops={"embedding": "vector_cosine_ops"})

def downgrade():
    op.drop_column("review_schedules", "timezone")
    for name in ["knowledge_chunks", "run_events", "auth_sessions", "workspace_members", "studio_records"]:
        op.drop_table(name)
