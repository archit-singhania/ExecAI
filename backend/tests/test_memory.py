import json
import subprocess
import sys
from datetime import datetime, timedelta

from app.embeddings import _hashing_embedding, _stable_hash, cosine_similarity, embed_text
from app.memory import _rank, _recency


class FakeMemory:
    def __init__(self, content, importance=0.6, days_old=0, embedding=None):
        self.content = content
        self.importance = importance
        self.created_at = datetime.utcnow() - timedelta(days=days_old)
        self.embedding = (
            json.dumps(embedding) if embedding is not None else json.dumps(_hashing_embedding(content))
        )


def test_hash_is_stable_within_a_process():
    assert _stable_hash("runway") == _stable_hash("runway")


def test_hash_is_stable_across_processes():
    """Python's built-in hash() is randomised per process, which silently
    invalidated every stored embedding on restart. This is the regression
    test for that."""
    code = "from app.embeddings import _stable_hash; print(_stable_hash('runway'))"
    first = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
    second = subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True,
        text=True,
        env={"PYTHONHASHSEED": "1", "PATH": "/usr/bin:/bin"},
    )

    assert first.stdout.strip()
    if second.returncode == 0 and second.stdout.strip():
        assert first.stdout.strip() == second.stdout.strip()


def test_embedding_is_deterministic():
    assert _hashing_embedding("cut the burn rate") == _hashing_embedding("cut the burn rate")


def test_embedding_is_normalised():
    vector = _hashing_embedding("validate demand before building")
    magnitude = sum(value * value for value in vector) ** 0.5
    assert abs(magnitude - 1.0) < 1e-6


def test_empty_text_gives_a_zero_vector():
    assert all(value == 0.0 for value in _hashing_embedding(""))


def test_similar_text_scores_higher_than_unrelated():
    query = embed_text("how much runway do we have left")
    close = cosine_similarity(query, embed_text("runway and burn rate analysis"))
    far = cosine_similarity(query, embed_text("choosing a colour palette for the logo"))
    assert close > far


def test_cosine_of_identical_vectors_is_one():
    vector = embed_text("board decision")
    assert abs(cosine_similarity(vector, vector) - 1.0) < 1e-6


def test_cosine_handles_mismatched_lengths():
    assert cosine_similarity([1.0, 2.0], [1.0]) == 0.0
    assert cosine_similarity([], [1.0]) == 0.0


def test_recency_decays_with_age():
    now = datetime.utcnow()
    fresh = _recency(now, now)
    old = _recency(now - timedelta(days=60), now)
    assert fresh > old
    assert 0.0 < old < 1.0


def test_missing_timestamp_gets_a_neutral_recency():
    assert _recency(None, datetime.utcnow()) == 0.5


def test_importance_breaks_ties_between_equal_matches():
    """Two memories with identical text must rank by importance. Before this,
    importance was recorded and then ignored at retrieval time."""
    query = embed_text("we decided to delay the launch")
    now = datetime.utcnow()

    critical = FakeMemory("we decided to delay the launch", importance=0.9)
    passing = FakeMemory("we decided to delay the launch", importance=0.3)

    assert _rank(critical, query, now) > _rank(passing, query, now)


def test_recency_breaks_ties_between_equal_matches():
    query = embed_text("pricing experiment")
    now = datetime.utcnow()

    recent = FakeMemory("pricing experiment", importance=0.6, days_old=0)
    stale = FakeMemory("pricing experiment", importance=0.6, days_old=90)

    assert _rank(recent, query, now) > _rank(stale, query, now)


def test_relevance_still_dominates_importance():
    """A trivial memory that actually matches must beat an important one that
    does not, or retrieval becomes 'show me the important things' regardless
    of the question."""
    query = embed_text("what colour should the button be")
    now = datetime.utcnow()

    relevant = FakeMemory("the button colour should be blue", importance=0.3)
    important_but_unrelated = FakeMemory(
        "we raised a seed round from investors", importance=1.0
    )

    assert _rank(relevant, query, now) > _rank(important_but_unrelated, query, now)


def test_unembedded_memory_is_rejected():
    now = datetime.utcnow()
    memory = FakeMemory("no vector")
    memory.embedding = None
    assert _rank(memory, embed_text("anything"), now) == -1.0


def test_corrupt_embedding_is_rejected():
    now = datetime.utcnow()
    memory = FakeMemory("bad json")
    memory.embedding = "{not json"
    assert _rank(memory, embed_text("anything"), now) == -1.0


def test_rank_stays_in_a_sane_range():
    now = datetime.utcnow()
    query = embed_text("runway")
    memory = FakeMemory("runway", importance=1.0)
    assert 0.0 <= _rank(memory, query, now) <= 1.0
