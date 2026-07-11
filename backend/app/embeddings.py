"""Lightweight, dependency-free embeddings for local RAG.

Uses the hashing trick (feature hashing) instead of a network embeddings
API, so memory search works with zero extra cost and zero extra
dependencies regardless of which LLM provider is configured. If Ollama is
configured, we use its real embeddings endpoint instead for better quality.
"""
import json
import math
import re
from urllib import request as urllib_request

from app.config import get_settings

DIMENSIONS = 256
_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def _hashing_embedding(text: str) -> list[float]:
    vector = [0.0] * DIMENSIONS
    tokens = _tokenize(text)
    if not tokens:
        return vector
    for token in tokens:
        h = hash(token)
        index = h % DIMENSIONS
        sign = 1.0 if (h // DIMENSIONS) % 2 == 0 else -1.0
        vector[index] += sign
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [v / norm for v in vector]


def _ollama_embedding(text: str, base_url: str, model: str) -> list[float] | None:
    try:
        url = base_url.removesuffix("/v1") + "/api/embeddings"
        payload = json.dumps({"model": model, "prompt": text}).encode("utf-8")
        req = urllib_request.Request(
            url, data=payload, headers={"Content-Type": "application/json"}
        )
        with urllib_request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            embedding = data.get("embedding")
            return embedding if embedding else None
    except Exception:
        return None


def embed_text(text: str) -> list[float]:
    """Return an embedding vector for `text`. Always succeeds (falls back
    to the local hashing embedding if a remote embeddings call fails)."""
    settings = get_settings()
    if settings.llm_provider.lower() == "ollama":
        result = _ollama_embedding(text, settings.ollama_base_url, settings.ollama_embed_model)
        if result:
            return result
    return _hashing_embedding(text)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a)) or 1.0
    norm_b = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (norm_a * norm_b)
