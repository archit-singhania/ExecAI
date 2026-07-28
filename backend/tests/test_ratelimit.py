"""Tests for the sliding-window rate limiter."""

import time

import pytest

from app.ratelimit import SlidingWindow


def test_allows_up_to_the_limit():
    window = SlidingWindow()
    for _ in range(5):
        allowed, _ = window.check("user-a", limit=5, window_seconds=60)
        assert allowed is True


def test_blocks_past_the_limit():
    window = SlidingWindow()
    for _ in range(5):
        window.check("user-a", limit=5, window_seconds=60)

    allowed, retry_after = window.check("user-a", limit=5, window_seconds=60)
    assert allowed is False
    assert 0 < retry_after <= 60


def test_keys_are_isolated():
    """One noisy account must not consume another's budget."""
    window = SlidingWindow()
    for _ in range(5):
        window.check("user-a", limit=5, window_seconds=60)

    allowed, _ = window.check("user-b", limit=5, window_seconds=60)
    assert allowed is True


def test_namespaces_are_isolated():
    """Cheap calls must not eat the budget for expensive ones."""
    window = SlidingWindow()
    for _ in range(5):
        window.check("cheap:user-a", limit=5, window_seconds=60)

    allowed, _ = window.check("expensive:user-a", limit=5, window_seconds=60)
    assert allowed is True


def test_window_slides():
    window = SlidingWindow()
    for _ in range(3):
        window.check("user-a", limit=3, window_seconds=0.15)

    blocked, _ = window.check("user-a", limit=3, window_seconds=0.15)
    assert blocked is False

    time.sleep(0.2)

    allowed, _ = window.check("user-a", limit=3, window_seconds=0.15)
    assert allowed is True, "old hits should have aged out of the window"


def test_retry_after_shrinks_as_the_window_ages():
    window = SlidingWindow()
    window.check("user-a", limit=1, window_seconds=2.0)

    _, first = window.check("user-a", limit=1, window_seconds=2.0)
    time.sleep(0.1)
    _, second = window.check("user-a", limit=1, window_seconds=2.0)

    assert second < first


def test_reset_clears_everything():
    window = SlidingWindow()
    for _ in range(3):
        window.check("user-a", limit=3, window_seconds=60)

    window.reset()

    allowed, _ = window.check("user-a", limit=3, window_seconds=60)
    assert allowed is True


@pytest.mark.parametrize("limit", [1, 10, 100])
def test_limit_is_exact(limit):
    """Off-by-one here means either a free extra call or one fewer than
    advertised, and both are the kind of bug nobody notices for months."""
    window = SlidingWindow()

    for index in range(limit):
        allowed, _ = window.check("k", limit=limit, window_seconds=60)
        assert allowed is True, f"call {index + 1} of {limit} was rejected"

    allowed, _ = window.check("k", limit=limit, window_seconds=60)
    assert allowed is False
