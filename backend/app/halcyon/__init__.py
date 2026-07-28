"""Halcyon — the responsive world.

Unreal is a rendering client, not the brain. Everything that decides what the
world does lives here: affect estimation, the environment planner, session
memory, and the WebSocket bridge Unreal subscribes to.

Nothing in this package requires a paid API. Affect estimation is lexicon
based, the planner is deterministic, and both run offline. An LLM can be
layered on later without changing the contract Unreal depends on.
"""

from app.halcyon.routes import router  # noqa: F401
