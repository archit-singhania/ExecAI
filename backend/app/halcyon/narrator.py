"""Optional LLM replies.

A local model writes better lines than a lookup table, but it must never be
allowed anywhere near the environment. The planner stays deterministic: a
model that invents weather will eventually invent something unpleasant during
someone's worst moment, and a weather system you cannot reason about is a
weather system you cannot make safe.

So the division is strict. The planner decides what the world does. The
narrator only gets to describe it, and only in one sentence.

If Ollama isn't running, everything falls back to the hand-written lines with
no error and no degradation worth noticing. That is the intended steady state
for a prototype, not a failure mode.
"""

import json
import urllib.error
import urllib.request

from app.halcyon.schemas import AffectReading, EnvironmentCommand

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
DEFAULT_MODEL = "qwen3:8b"
TIMEOUT_SECONDS = 6.0

SYSTEM_RULES = """You describe a peaceful virtual world reacting to someone.

Rules, all of them absolute:
- One or two short sentences. Never more.
- Describe only what the world is doing: light, weather, water, sound, animals.
- Never give advice. Never ask a question. Never suggest they try anything.
- Never reference therapy, feelings, healing, or mental health.
- Never say "I". The world has no ego and is not a character.
- Plain words. No poetry, no metaphor, no purple writing.

Good: "The wind drops. The water goes flat. Nothing here needs anything from you."
Good: "It's early here. The light is coming up slowly."
Bad: "I sense you're struggling. Have you tried breathing deeply?"
Bad: "The gossamer veil of twilight embraces your weary soul."
"""


def _describe_environment(env: EnvironmentCommand) -> str:
    parts = [
        f"world: {env.world}",
        f"hour: {env.time_of_day:.0f}",
        f"weather: {env.weather}",
        f"wind: {env.wind:.2f}",
        f"water motion: {env.water_motion:.2f}",
        f"brightness: {env.brightness:.2f}",
        f"warmth: {env.warmth:.2f}",
    ]
    if env.companion != "none":
        parts.append(f"companion: {env.companion} is {env.companion_action}")
    if env.breathing_guide:
        parts.append("a slow breathing rhythm is running")
    return ", ".join(parts)


def is_available(model: str = DEFAULT_MODEL) -> bool:
    """Cheap liveness check. Never raises."""
    try:
        with urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=1.5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return False

    names = {entry.get("name", "") for entry in payload.get("models", [])}
    return any(name.startswith(model.split(":")[0]) for name in names)


def compose(
    affect: AffectReading,
    env: EnvironmentCommand,
    model: str = DEFAULT_MODEL,
) -> str | None:
    """One sentence describing the world, or None if the model can't help.

    Returning None is a completely normal outcome. The caller falls back to
    the written lines.
    """
    prompt = (
        f"{SYSTEM_RULES}\n\n"
        f"The person seems: {affect.label}\n"
        f"The world is now: {_describe_environment(env)}\n\n"
        f"Describe the world in one or two short sentences:"
    )

    body = json.dumps({
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.7, "num_predict": 60},
    }).encode("utf-8")

    request = urllib.request.Request(
        OLLAMA_URL, data=body, headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return None

    text = (payload.get("response") or "").strip()
    return _sanitise(text)


def _sanitise(text: str) -> str | None:
    """Reject anything that breaks the rules rather than trying to repair it.

    A bad line is worse than a plain one, and silently falling back costs
    nothing.
    """
    if not text:
        return None

    if "</think>" in text:
        text = text.split("</think>")[-1].strip()

    text = text.strip().strip('"').strip()

    if not text or len(text) > 260:
        return None

    lowered = text.lower()

    banned = (
        "have you tried", "i sense", "i understand", "i'm here", "i am here",
        "you should", "try to", "remember to", "it's okay to", "?",
        "therapy", "healing", "mental health", "anxiety", "depression",
    )
    if any(term in lowered for term in banned):
        return None

    if text.count(".") > 3:
        return None

    return text
