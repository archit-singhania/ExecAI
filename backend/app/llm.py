import json
from openai import OpenAI
from app.config import get_settings

AGENT_ROLES = {
    "market": "You are the Market Research lead for a startup CEO AI. Assess the market opportunity, competition, and target segment for the given goal.",
    "cfo": "You are the CFO. Assess financial risk, runway, and spending discipline for the given goal.",
    "cto": "You are the CTO. Recommend a lean technical approach and MVP scope for the given goal.",
    "product": "You are the Product Manager. Define the core user story and MVP scope for the given goal.",
    "marketing": "You are the Marketing lead. Recommend positioning and early acquisition tactics for the given goal.",
    "legal": "You are Legal counsel. Flag legal/compliance risks and required approval gates for the given goal.",
    "sales": "You are the Head of Sales. Recommend how to land the first paying pilot customers for the given goal.",
    "designer": "You are the Product Designer. Describe the UX/UI approach that fits the given goal.",
    "assistant": "You are the Executive Assistant. Turn the CEO's plan into a weekly operating rhythm and accountability system.",
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


def generate_agent_report(agent_key: str, goal: str, message: str) -> dict | None:
    """Call the configured free LLM (Groq or Ollama) for one agent's report.

    Returns None if no provider is configured or the call fails, so callers
    can fall back to the deterministic rule-based report.
    """
    client, model = _client()
    if client is None:
        return None

    role = AGENT_ROLES[agent_key]
    prompt = (
        f"{role}\n\n"
        f"Business goal: {goal}\n"
        f"Latest founder message: {message}\n\n"
        "Respond with ONLY valid JSON, no markdown fences, in this exact shape:\n"
        '{"title": "short headline", "summary": "2-3 sentence summary", '
        '"bullets": ["point 1", "point 2", "point 3"], "score": <integer 0-100>}'
    )

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=500,
        )
        raw = completion.choices[0].message.content.strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(raw)
        return {
            "agent": DISPLAY_NAMES[agent_key],
            "title": str(data["title"]),
            "summary": str(data["summary"]),
            "bullets": [str(b) for b in list(data["bullets"])[:5]],
            "score": max(0, min(100, int(data["score"]))),
        }
    except Exception:
        return None
