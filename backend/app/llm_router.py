"""Multi-provider LLM routing across free tiers.

Two failure modes drove this design.

First, free tiers are rate limited, not free of limits. Groq allows roughly 30
requests a minute, Gemini around 15 with a 1,500 daily ceiling. A nine-agent
fan-out burns nine calls at once, so any single provider throttles almost
immediately. Spreading across providers means no one per-minute window gates
everything.

Second, free models disappear. Providers prune their free catalogue without
notice and the only signal is a 404 on a model that worked yesterday. Every
provider here is tried in order and a failure moves to the next one, so a
deleted model degrades quality rather than breaking the product.

Privacy: most free tiers train on your prompts. Ollama runs locally and sends
nothing anywhere, which is why it is first in the chain. If you are handling
anything you would not want in a training set, run Ollama and set
LLM_LOCAL_ONLY=true.
"""

import json
import time
from dataclasses import dataclass, field

import httpx

from app.config import get_settings

TIMEOUT = 45.0
COOLDOWN_SECONDS = 120.0
FAILURES_BEFORE_COOLDOWN = 3


@dataclass
class Provider:
    name: str
    base_url: str
    model: str
    key_setting: str
    local: bool = False
    failures: int = 0
    blocked_until: float = 0.0
    served: int = 0

    def available(self, settings) -> bool:
        if time.monotonic() < self.blocked_until:
            return False
        if self.local:
            return True
        return bool(getattr(settings, self.key_setting, None))

    def trip(self) -> None:
        self.failures += 1
        if self.failures >= FAILURES_BEFORE_COOLDOWN:
            self.blocked_until = time.monotonic() + COOLDOWN_SECONDS
            self.failures = 0
            print(f"[llm] {self.name} cooling down for {COOLDOWN_SECONDS:.0f}s")

    def clear(self) -> None:
        self.failures = 0
        self.blocked_until = 0.0
        self.served += 1


PROVIDERS: list[Provider] = [
    Provider("ollama", "http://127.0.0.1:11434/v1", "qwen3:8b", "", local=True),
    Provider("groq", "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile", "groq_api_key"),
    Provider("gemini", "https://generativelanguage.googleapis.com/v1beta/openai", "gemini-2.5-flash", "gemini_api_key"),
    Provider("cerebras", "https://api.cerebras.ai/v1", "llama-3.3-70b", "cerebras_api_key"),
    Provider("nvidia", "https://integrate.api.nvidia.com/v1", "meta/llama-3.3-70b-instruct", "nvidia_api_key"),
    Provider("openrouter", "https://openrouter.ai/api/v1", "meta-llama/llama-3.3-70b-instruct:free", "openrouter_api_key"),
]
"""Every provider here has a free tier that needs no credit card.

Ollama is local and unlimited. The rest are hosted free tiers with per-minute
and daily ceilings, which is exactly why more than one is configured.
"""

TIERS: dict[str, list[str]] = {
    "fast": ["ollama", "groq", "cerebras", "nvidia", "gemini", "openrouter"],
    "deep": ["gemini", "groq", "ollama", "nvidia", "openrouter", "cerebras"],
}
"""Which order to try, by job.

`fast` favours throughput for the nine parallel agent reports. `deep` favours
reasoning quality for the CEO synthesis and board verdicts, where one slower
call is worth a better answer.
"""


def _by_name(name: str) -> Provider | None:
    return next((provider for provider in PROVIDERS if provider.name == name), None)


def _key_for(provider: Provider, settings) -> str:
    if provider.local:
        return "ollama"
    return getattr(settings, provider.key_setting, "") or ""


def _model_for(provider: Provider, settings) -> str:
    override = getattr(settings, f"{provider.name}_model", None)
    return override or provider.model


def _call(provider: Provider, settings, messages: list[dict], json_mode: bool, max_tokens: int) -> str | None:
    payload: dict = {
        "model": _model_for(provider, settings),
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": max_tokens,
    }

    if json_mode and provider.name not in {"ollama", "cerebras"}:
        payload["response_format"] = {"type": "json_object"}

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            response = client.post(
                f"{provider.base_url}/chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {_key_for(provider, settings)}",
                    "Content-Type": "application/json",
                },
            )

            if response.status_code == 429:
                print(f"[llm] {provider.name} rate limited")
                provider.trip()
                return None

            if response.status_code >= 400:
                print(f"[llm] {provider.name} {response.status_code}: {response.text[:180]}")
                provider.trip()
                return None

            body = response.json()
    except Exception as exc:
        print(f"[llm] {provider.name} unreachable: {exc}")
        provider.trip()
        return None

    choices = body.get("choices") or []
    if not choices:
        provider.trip()
        return None

    content = (choices[0].get("message") or {}).get("content") or ""
    if not content.strip():
        provider.trip()
        return None

    provider.clear()
    return content


def complete(
    system: str,
    user: str,
    tier: str = "fast",
    json_mode: bool = False,
    max_tokens: int = 900,
) -> tuple[str, str] | None:
    """Returns (content, provider_name), or None when every provider failed."""
    settings = get_settings()

    order = TIERS.get(tier, TIERS["fast"])
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]

    for name in order:
        provider = _by_name(name)
        if not provider:
            continue

        if settings.llm_local_only and not provider.local:
            continue

        if not provider.available(settings):
            continue

        content = _call(provider, settings, messages, json_mode, max_tokens)
        if content:
            return content, provider.name

    return None


def complete_json(
    system: str,
    user: str,
    tier: str = "fast",
    max_tokens: int = 900,
) -> tuple[dict, str] | None:
    result = complete(system, user, tier=tier, json_mode=True, max_tokens=max_tokens)
    if not result:
        return None

    raw, provider = result
    cleaned = raw.strip()

    if "</think>" in cleaned:
        cleaned = cleaned.split("</think>")[-1].strip()

    cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1:
        return None

    try:
        return json.loads(cleaned[start : end + 1]), provider
    except json.JSONDecodeError:
        return None


def status() -> dict:
    settings = get_settings()
    return {
        "local_only": settings.llm_local_only,
        "providers": [
            {
                "name": provider.name,
                "model": _model_for(provider, settings),
                "configured": provider.available(settings),
                "local": provider.local,
                "served": provider.served,
                "cooling_down": time.monotonic() < provider.blocked_until,
            }
            for provider in PROVIDERS
        ],
    }
