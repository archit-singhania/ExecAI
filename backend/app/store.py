import json
import os
import time
from threading import Lock
from typing import Any

_redis_client = None
_redis_checked = False


def _redis():
    global _redis_client, _redis_checked

    if _redis_checked:
        return _redis_client

    _redis_checked = True
    url = os.getenv("REDIS_URL")

    if not url:
        return None

    try:
        import redis

        client = redis.Redis.from_url(url, decode_responses=True, socket_timeout=2)
        client.ping()
        _redis_client = client
        print("[store] Redis connected.")
    except Exception as exc:
        print(f"[store] Redis unavailable, falling back to in-process store: {exc}")
        _redis_client = None

    return _redis_client


class MemoryStore:
    def __init__(self) -> None:
        self._data: dict[str, tuple[float | None, str]] = {}
        self._lock = Lock()

    def get(self, key: str) -> str | None:
        with self._lock:
            entry = self._data.get(key)
            if not entry:
                return None
            expires, value = entry
            if expires is not None and expires < time.time():
                del self._data[key]
                return None
            return value

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None:
        with self._lock:
            expires = time.time() + ttl_seconds if ttl_seconds else None
            self._data[key] = (expires, value)

    def incr_window(self, key: str, limit: int, window_seconds: float) -> tuple[bool, float]:
        now = time.time()
        with self._lock:
            entry = self._data.get(key)
            hits: list[float] = json.loads(entry[1]) if entry else []
            hits = [hit for hit in hits if hit > now - window_seconds]

            if len(hits) >= limit:
                return False, max(0.0, hits[0] + window_seconds - now)

            hits.append(now)
            self._data[key] = (now + window_seconds, json.dumps(hits))
            return True, 0.0


_memory = MemoryStore()


def cache_get(key: str) -> Any | None:
    client = _redis()
    raw = client.get(key) if client else _memory.get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def cache_set(key: str, value: Any, ttl_seconds: int = 86400) -> None:
    payload = json.dumps(value, default=str)
    client = _redis()
    if client:
        try:
            client.setex(key, ttl_seconds, payload)
            return
        except Exception:
            pass
    _memory.set(key, payload, ttl_seconds)


def check_window(key: str, limit: int, window_seconds: float) -> tuple[bool, float]:
    client = _redis()

    if client:
        try:
            now = time.time()
            pipeline = client.pipeline()
            pipeline.zremrangebyscore(key, 0, now - window_seconds)
            pipeline.zcard(key)
            pipeline.zadd(key, {f"{now}:{os.urandom(4).hex()}": now})
            pipeline.expire(key, int(window_seconds) + 1)
            _, count, _, _ = pipeline.execute()

            if count >= limit:
                oldest = client.zrange(key, 0, 0, withscores=True)
                retry = max(0.0, (oldest[0][1] + window_seconds - now)) if oldest else window_seconds
                return False, retry

            return True, 0.0
        except Exception:
            pass

    return _memory.incr_window(key, limit, window_seconds)


def store_backend() -> str:
    return "redis" if _redis() else "memory"
