"""Deterministic tests never call a developer's running Ollama or external providers."""
import pytest
import os
from pathlib import Path
from tempfile import TemporaryDirectory
_data = TemporaryDirectory(prefix="ceoai-suite-", ignore_cleanup_errors=True)
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_data.name) / 'tests.db'}"
os.environ["APP_ENV"] = "test"
os.environ["JWT_SECRET"] = "isolated-test-secret"

@pytest.fixture(autouse=True)
def offline_providers(monkeypatch):
    from app import embeddings, llm_router, llm, store
    from app.ratelimit import reset_limits
    reset_limits()
    monkeypatch.setattr(store, "_memory", store.MemoryStore())
    monkeypatch.setattr(embeddings, "_ollama_embedding", lambda *args, **kwargs: None)
    monkeypatch.setattr(llm_router, "_call", lambda *args, **kwargs: None)
    monkeypatch.setattr(llm, "_client", lambda: (None, None))
