import json
import math
from datetime import datetime

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.embeddings import cosine_similarity, embed_text
from app.models import BusinessMemory

SIMILARITY_WEIGHT = 0.65
IMPORTANCE_WEIGHT = 0.25
RECENCY_WEIGHT = 0.10
RECENCY_HALF_LIFE_DAYS = 21.0


def _recency(created_at: datetime | None, now: datetime) -> float:
    if not created_at:
        return 0.5
    age_days = max(0.0, (now - created_at).total_seconds() / 86400.0)
    return math.exp(-age_days / RECENCY_HALF_LIFE_DAYS)


def _rank(memory: BusinessMemory, query_vector: list[float], now: datetime) -> float:
    """Blend similarity with importance and recency.

    Similarity alone treats 'the CEO decided to delay the launch' and an
    offhand remark as equal if they share vocabulary. Importance is already
    recorded when memories are written — board decisions at 0.9, passing
    questions at 0.65 — and was previously ignored at retrieval time.
    """
    if not memory.embedding:
        return -1.0

    try:
        similarity = cosine_similarity(query_vector, json.loads(memory.embedding))
    except (json.JSONDecodeError, TypeError):
        return -1.0

    normalised = (similarity + 1.0) / 2.0

    return (
        normalised * SIMILARITY_WEIGHT
        + (memory.importance or 0.5) * IMPORTANCE_WEIGHT
        + _recency(memory.created_at, now) * RECENCY_WEIGHT
    )


def store_memory(
    db: Session,
    session_id: str,
    kind: str,
    content: str,
    importance: float = 0.6,
) -> BusinessMemory:
    """Create (but do not commit) a BusinessMemory row with a real embedding
    attached, so it can later be retrieved by semantic similarity."""
    vector = embed_text(content)
    memory = BusinessMemory(
        session_id=session_id,
        kind=kind,
        content=content,
        importance=importance,
        embedding_text=content,
        embedding=json.dumps(vector),
    )
    db.add(memory)
    return memory


def retrieve_relevant_memories(db: Session, session_id: str, query: str, top_k: int = 4) -> list[str]:
    """Semantic search over this session's memories, weighted by importance
    and recency. Falls back to the most recent rows if nothing is embedded."""
    memories = (
        db.query(BusinessMemory)
        .filter(BusinessMemory.session_id == session_id)
        .order_by(desc(BusinessMemory.created_at))
        .limit(200)
        .all()
    )
    if not memories:
        return []

    query_vector = embed_text(query)
    now = datetime.utcnow()

    scored: list[tuple[float, BusinessMemory]] = []
    unembedded: list[BusinessMemory] = []

    for memory in memories:
        rank = _rank(memory, query_vector, now)
        if rank < 0:
            unembedded.append(memory)
        else:
            scored.append((rank, memory))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    top = [memory.content for _, memory in scored[:top_k]]

    if len(top) < top_k:
        top.extend(memory.content for memory in unembedded[: top_k - len(top)])

    return top


def search_memory_rows(db: Session, session_id: str, query: str, limit: int = 10) -> list[BusinessMemory]:
    """Like retrieve_relevant_memories, but returns full ORM rows for API
    responses that need id, kind, importance and created_at."""
    memories = (
        db.query(BusinessMemory)
        .filter(BusinessMemory.session_id == session_id)
        .order_by(desc(BusinessMemory.created_at))
        .limit(200)
        .all()
    )
    if not memories:
        return []

    query_vector = embed_text(query)
    now = datetime.utcnow()

    ranked = sorted(memories, key=lambda memory: _rank(memory, query_vector, now), reverse=True)
    return ranked[:limit]
