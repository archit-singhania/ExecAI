"""Deterministic tests never call a developer's running Ollama or external providers."""
import pytest
import os
import secrets
from contextlib import ExitStack
from pathlib import Path
from tempfile import TemporaryDirectory

_resources = ExitStack()
_postgres = os.environ.get("EXEC_AI_TEST_POSTGRES_DSN")
if _postgres:
    import psycopg
    from sqlalchemy import JSON
    from sqlalchemy.engine import make_url

    url = make_url(_postgres)
    if url.get_backend_name() != "postgresql" or url.host not in ("localhost", "127.0.0.1", "::1"):
        raise pytest.UsageError("ExecAI integration tests require loopback PostgreSQL")
    schema = "execai_test_" + secrets.token_hex(8)
    connection = _resources.enter_context(
        psycopg.connect(url.set(drivername="postgresql").render_as_string(hide_password=False), autocommit=True)
    )
    connection.execute(f'CREATE SCHEMA "{schema}"')
    _resources.callback(connection.execute, f'DROP SCHEMA "{schema}" CASCADE')
    isolated_url = url.set(drivername="postgresql+psycopg", query={"options": f"-csearch_path={schema}"})
    os.environ["DATABASE_URL"] = isolated_url.render_as_string(hide_password=False)
else:
    _data = _resources.enter_context(TemporaryDirectory(prefix="ceoai-suite-", ignore_cleanup_errors=True))
    os.environ["DATABASE_URL"] = f"sqlite:///{Path(_data) / 'tests.db'}"
os.environ["APP_ENV"] = "test"
os.environ["JWT_SECRET"] = "isolated-test-secret"

if _postgres and os.environ.get("EXEC_AI_TEST_APPROVALS_WITHOUT_VECTOR") == "1":
    # This suite exercises transactional approval and ownership, never retrieval.
    from app.studio_models import KnowledgeChunk

    column = KnowledgeChunk.__table__.c.embedding
    column.type = column.type.with_variant(JSON(), "postgresql")

def pytest_sessionfinish():
    _resources.close()

@pytest.fixture(autouse=True)
def offline_providers(monkeypatch):
    from app import embeddings, llm_router, llm, store
    from app.ratelimit import reset_limits
    reset_limits()
    monkeypatch.setattr(store, "_memory", store.MemoryStore())
    monkeypatch.setattr(embeddings, "_ollama_embedding", lambda *args, **kwargs: None)
    monkeypatch.setattr(llm_router, "_call", lambda *args, **kwargs: None)
    monkeypatch.setattr(llm, "_client", lambda: (None, None))
