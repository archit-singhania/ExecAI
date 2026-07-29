"""Per-user rate limiting.

The expensive endpoints here fan out to nine agents or hit a GPU, and until
now nothing stopped one authenticated account from calling them in a loop.
That is a bill and a denial-of-service in one.

Deliberately dependency-free. A sliding window in a dict is enough for a
single-process deployment and adds nothing to install, which matters more
than elegance at this stage.

Known limitation, stated plainly: this is per-process. Run more than one
uvicorn worker and each gets its own counters, so the effective limit
multiplies by the worker count. When that starts to matter, move the buckets
into Redis and keep this interface unchanged.
"""

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Depends, HTTPException, Request

from app.auth import get_current_user
from app.models import User


class SlidingWindow:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()
        self._last_sweep = time.monotonic()

    def check(self, key: str, limit: int, window_seconds: float) -> tuple[bool, float]:
        """Returns (allowed, seconds_until_retry)."""
        now = time.monotonic()
        cutoff = now - window_seconds

        with self._lock:
            hits = self._hits[key]

            while hits and hits[0] < cutoff:
                hits.popleft()

            if len(hits) >= limit:
                retry_after = max(0.0, hits[0] + window_seconds - now)
                return False, retry_after

            hits.append(now)

            if now - self._last_sweep > 300:
                self._last_sweep = now
                empty = [k for k, v in self._hits.items() if not v or v[-1] < cutoff]
                for k in empty:
                    del self._hits[k]

            return True, 0.0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


_window = SlidingWindow()


def reset_limits() -> None:
    """Test hook."""
    _window.reset()


def limit_by_ip(name: str, limit: int, window_seconds: float):
    """For unauthenticated endpoints, where there is no user to key on.

    Password reset request is the motivating case: it must be callable
    without a session, which also makes it the easiest endpoint to abuse for
    email bombing someone else's inbox.
    """

    def dependency(request: Request) -> None:
        identity = request.client.host if request.client else "anon"
        allowed, retry_after = _window.check(f"{name}:{identity}", limit, window_seconds)

        if not allowed:
            raise HTTPException(
                status_code=429,
                detail=f"Too many attempts. Try again in about {int(retry_after) + 1} seconds.",
                headers={"Retry-After": str(int(retry_after) + 1)},
            )

    return dependency


def limit_by_user(name: str, limit: int, window_seconds: float):
    """Dependency factory. Keys on user id, falling back to client host.

    Each endpoint gets its own namespace, so a burst of cheap calls can't
    consume the budget for expensive ones.
    """

    def dependency(request: Request, current_user: User = Depends(get_current_user)) -> User:
        identity = current_user.id if current_user else (request.client.host if request.client else "anon")
        allowed, retry_after = _window.check(f"{name}:{identity}", limit, window_seconds)

        if not allowed:
            raise HTTPException(
                status_code=429,
                detail=(
                    "You're going faster than the boardroom can think. "
                    f"Try again in about {int(retry_after) + 1} seconds."
                ),
                headers={"Retry-After": str(int(retry_after) + 1)},
            )

        return current_user

    return dependency
