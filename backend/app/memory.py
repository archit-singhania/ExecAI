import json

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.embeddings import cosine_similarity, embed_text
from app.models import BusinessMemory


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
    """Semantic search over this session's memories. Falls back gracefully
    to the most recent/important memories if nothing has an embedding yet
    (e.g. rows created before this feature existed)."""
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
    scored: list[tuple[float, BusinessMemory]] = []
    unembedded: list[BusinessMemory] = []
    for memory in memories:
        if memory.embedding:
            try:
                vector = json.loads(memory.embedding)
                scored.append((cosine_similarity(query_vector, vector), memory))
                continue
            except (json.JSONDecodeError, TypeError):
                pass
        unembedded.append(memory)

    scored.sort(key=lambda pair: pair[0], reverse=True)
    top = [memory.content for _, memory in scored[:top_k]]

    if len(top) < top_k:
        top.extend(m.content for m in unembedded[: top_k - len(top)])

    return top


def search_memory_rows(db: Session, session_id: str, query: str, limit: int = 10) -> list[BusinessMemory]:
    """Like retrieve_relevant_memories, but returns the full ORM rows
    (ranked by semantic similarity) for API responses that need id/kind/
    importance/created_at rather than just the text."""
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

    def score(memory: BusinessMemory) -> float:
        if not memory.embedding:
            return -1.0
        try:
            return cosine_similarity(query_vector, json.loads(memory.embedding))
        except (json.JSONDecodeError, TypeError):
            return -1.0

    ranked = sorted(memories, key=score, reverse=True)
    return ranked[:limit]
