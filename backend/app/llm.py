import json
from openai import OpenAI
from app.config import get_settings
from app.tools import TOOL_IMPLEMENTATIONS, TOOLS_BY_AGENT

AGENT_ROLES = {
    "market": "You are the Market Research lead for a startup CEO AI. Assess the market opportunity, competition, and target segment for the given goal. Use the estimate_market_size tool whenever a user count, market size, or price is mentioned.",
    "cfo": "You are the CFO. Assess financial risk, runway, and spending discipline for the given goal. Use the calculate_runway tool whenever cash, budget, revenue, or cost figures are mentioned.",
    "cto": "You are the CTO. Recommend a lean technical approach and MVP scope for the given goal. Use the estimate_build_cost tool whenever scoping engineering effort or feature count.",
    "product": "You are the Product Manager. Define the core user story and MVP scope for the given goal. Use the prioritize_features tool whenever comparing candidate features or scope options.",
    "marketing": "You are the Marketing lead. Recommend positioning and early acquisition tactics for the given goal. Use the estimate_cac_ltv tool whenever ad spend, conversion, price, or churn figures are mentioned.",
    "legal": "You are Legal counsel. Flag legal/compliance risks and required approval gates for the given goal. Use the compliance_checklist tool to ground your recommendations in the business type and data/payment handling.",
    "sales": "You are the Head of Sales. Recommend how to land the first paying pilot customers for the given goal. Use the calculate_deal_economics tool whenever a revenue target or deal size is mentioned.",
    "designer": "You are the Product Designer. Describe the UX/UI approach that fits the given goal. Use the check_color_contrast tool whenever specific colors or a palette are proposed.",
    "assistant": "You are the Executive Assistant. Turn the CEO's plan into a weekly operating rhythm and accountability system. Use the generate_weekly_schedule tool to lay out concrete tasks across the work week.",
}

DISPLAY_NAMES = {
    "market": "Market Research",
    "cfo": "CFO",
    "cto": "CTO",
    "product": "Product Manager",
    "marketing": "Marketing",
    "legal": "Legal",
    "sales": "Sales",
    "designer": "Designer",
    "assistant": "Executive Assistant",
}

RESPONSE_FORMAT_INSTRUCTIONS = (
    "Respond with ONLY valid JSON, no markdown fences, in this exact shape:\n"
    '{"title": "short headline", "summary": "2-3 sentence summary", '
    '"bullets": ["point 1", "point 2", "point 3"], "score": <integer 0-100>}'
)


def _client():
    settings = get_settings()
    provider = settings.llm_provider.lower()
    if provider == "groq":
        if not settings.groq_api_key:
            return None, None
        return (
            OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1"),
            settings.groq_model,
        )
    if provider == "ollama":
        return (
            OpenAI(api_key="ollama", base_url=settings.ollama_base_url),
            settings.ollama_model,
        )
    return None, None


def transcribe_audio(file_bytes: bytes, filename: str = "audio.webm") -> str | None:
    """Transcribe a short voice clip via Groq's Whisper endpoint (OpenAI-compatible
    /audio/transcriptions route). Used as the STT fallback for browsers without
    native SpeechRecognition support (Firefox, some Safari builds). Returns None
    if Groq isn't configured or the call fails, so the caller can surface a clear
    error instead of silently returning empty text.
    """
    settings = get_settings()
    if settings.llm_provider.lower() != "groq" or not settings.groq_api_key:
        return None
    client = OpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")
    try:
        result = client.audio.transcriptions.create(
            model=settings.groq_whisper_model,
            file=(filename, file_bytes),
        )
        return result.text
    except Exception:
        return None


def _parse_report(agent_key: str, raw: str) -> dict:
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    data = json.loads(raw)
    return {
        "agent": DISPLAY_NAMES[agent_key],
        "title": str(data["title"]),
        "summary": str(data["summary"]),
        "bullets": [str(b) for b in list(data["bullets"])[:5]],
        "score": max(0, min(100, int(data["score"]))),
    }


def _run_tool_calls(client, model, messages: list[dict], tools: list[dict]) -> list[dict]:
    """Run one round of tool-calling: ask the model, execute any tool calls
    it requests, and append the results back into the conversation."""
    completion = client.chat.completions.create(
        model=model,
        messages=messages,
        tools=tools,
        tool_choice="auto",
        temperature=0.2,
        max_tokens=500,
    )
    message = completion.choices[0].message
    tool_calls = getattr(message, "tool_calls", None)
    if not tool_calls:
        return messages  

    messages.append({"role": "assistant", "content": message.content or "", "tool_calls": [
        {
            "id": tc.id,
            "type": "function",
            "function": {"name": tc.function.name, "arguments": tc.function.arguments},
        }
        for tc in tool_calls
    ]})

    for tc in tool_calls:
        impl = TOOL_IMPLEMENTATIONS.get(tc.function.name)
        try:
            args = json.loads(tc.function.arguments or "{}")
            result = impl(**args) if impl else {"error": "unknown tool"}
        except Exception as exc: 
            result = {"error": str(exc)}
        messages.append(
            {
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result),
            }
        )
    return messages


def generate_agent_report(
    agent_key: str,
    goal: str,
    message: str,
    memory_context: list[str] | None = None,
) -> dict | None:
    """Call the configured free LLM (Groq or Ollama) for one agent's report.

    Retrieved memories (`memory_context`) are injected as grounding context.
    If the agent has tools registered (see app.tools), the model may call
    them for exact figures (e.g. the CFO's runway calculator) before giving
    its final JSON report.

    Returns None if no provider is configured or the call fails, so callers
    can fall back to the deterministic rule-based report.
    """
    client, model = _client()
    if client is None:
        return None

    role = AGENT_ROLES[agent_key]
    context_block = ""
    if memory_context:
        joined = "\n".join(f"- {m}" for m in memory_context)
        context_block = f"\nRelevant prior context for this business:\n{joined}\n"

    prompt = (
        f"{role}\n\n"
        f"Business goal: {goal}\n"
        f"Latest founder message: {message}\n"
        f"{context_block}\n"
        f"{RESPONSE_FORMAT_INSTRUCTIONS}"
    )
    messages = [{"role": "user", "content": prompt}]

    try:
        tools = TOOLS_BY_AGENT.get(agent_key)
        if tools:
            messages = _run_tool_calls(client, model, messages, tools)
            messages.append(
                {
                    "role": "user",
                    "content": f"Now give your final report. {RESPONSE_FORMAT_INSTRUCTIONS}",
                }
            )

        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.4,
            max_tokens=500,
        )
        raw = completion.choices[0].message.content or ""
        return _parse_report(agent_key, raw)
    except Exception:
        return None
