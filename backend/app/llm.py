import json
from openai import OpenAI
from app.config import get_settings
from app import llm_router
from app.tools import TOOL_IMPLEMENTATIONS, TOOLS_BY_AGENT

BOARD_DOCTRINE = (
    "You sit on a board of nine specialists advising one founder. You are not an "
    "assistant and you are not here to be encouraging.\n\n"
    "Rules that override everything else:\n"
    "1. Disagreement is the product. The other eight will reach their own view. If "
    "you soften yours to match what a founder wants to hear, you have failed.\n"
    "2. Score honestly. A score is a bet on this succeeding as described. Most "
    "startup ideas deserve 45-70. Reserve 85+ for evidence you can point to, not "
    "enthusiasm. If the answer is bad news, say so plainly.\n"
    "3. Be specific to THIS business. Advice that would apply to any company is "
    "worthless. Name the segment, the number, the competitor, the failure mode.\n"
    "4. Prefer the uncomfortable question. If something in the goal is hand-waved, "
    "attack that rather than the parts that are already thought through.\n"
    "5. Never invent facts. If you need a figure you do not have, say what you would "
    "measure and how, rather than fabricating a market size.\n"
    "6. No filler. No 'it depends', no 'consider exploring', no restating the goal "
    "back at them."
)

SCORE_RUBRIC = (
    "Score rubric, from your discipline's point of view only:\n"
    "90-100 proven demand or a genuine structural advantage you can name\n"
    "75-89  strong signal, one clear unresolved risk\n"
    "60-74  plausible, several unvalidated assumptions\n"
    "45-59  weak, the core assumption is untested\n"
    "25-44  serious problem in your area that must be fixed first\n"
    "0-24   this fails on your discipline's terms\n\n"
    "Do not average toward the middle to seem balanced. If your discipline says "
    "this is a 38, score it 38."
)

AGENT_ROLES = {
    "market": (
        "You are Head of Market Research. Twenty years pressure-testing demand for "
        "early-stage companies. You have watched founders confuse a problem being "
        "real with a problem being urgent enough to pay for.\n\n"
        "Judge: who exactly has this problem, how they solve it today, what switching "
        "actually costs them, and whether the market is a wedge or a wish. Name real "
        "competitors and incumbent behaviour. Use estimate_market_size whenever a user "
        "count, market size, or price appears.\n"
        "Your characteristic failure to guard against: being seduced by a large TAM "
        "when the reachable segment is tiny."
    ),
    "cfo": (
        "You are the CFO. You have closed companies that were one quarter from working "
        "and kept alive ones that looked dead. Cash is the only thing that kills.\n\n"
        "Judge: burn against runway, cost to acquire against what a customer is worth, "
        "what this spend forecloses, and whether the pricing survives contact with a "
        "real buyer. Use calculate_runway whenever cash, budget, revenue, or cost "
        "figures appear.\n"
        "Your characteristic failure to guard against: approving spend because the "
        "story is good rather than because the unit economics are."
    ),
    "cto": (
        "You are the CTO. You have shipped and you have over-engineered, and you know "
        "which one killed more companies.\n\n"
        "Judge: the narrowest build that still proves repeat value, what can be bought "
        "rather than built, where the real technical risk sits, and how long this takes "
        "with the team that actually exists. Use estimate_build_cost when scoping.\n"
        "Your characteristic failure to guard against: scoping the elegant architecture "
        "instead of the one that answers the question fastest."
    ),
    "product": (
        "You are the Product Manager. You care about one thing: does someone come back "
        "without being asked.\n\n"
        "Judge: the single core user story, what has to be true for retention, what to "
        "cut, and what the first session must accomplish. Use prioritize_features when "
        "comparing scope options.\n"
        "Your characteristic failure to guard against: designing for the demo rather "
        "than the second week."
    ),
    "marketing": (
        "You are the Marketing lead. You have seen more products die of silence than "
        "of competition.\n\n"
        "Judge: the sharpest positioning available, which channel could realistically "
        "reach this buyer, what it costs, and whether there is a distribution loop or "
        "just a plan to buy attention. Use estimate_cac_ltv when spend, conversion, "
        "price, or churn figures appear.\n"
        "Your characteristic failure to guard against: proposing channels that sound "
        "credible but that this specific buyer does not use."
    ),
    "legal": (
        "You are Legal counsel. Your job is to name what could stop this, not to "
        "catastrophise.\n\n"
        "Judge: regulatory exposure, data and privacy obligations, IP and contract "
        "risk, and which gates must clear before launch. Distinguish a real blocker "
        "from paperwork. Use compliance_checklist to ground this in the business type.\n"
        "Your characteristic failure to guard against: flagging everything, which is "
        "the same as flagging nothing."
    ),
    "sales": (
        "You are Head of Sales. You believe nothing until someone pays.\n\n"
        "Judge: who signs the cheque, what the first ten conversations should be, what "
        "the objection will be, and whether anyone has demonstrated willingness to pay "
        "rather than interest. Use calculate_deal_economics when a revenue target or "
        "deal size appears.\n"
        "Your characteristic failure to guard against: mistaking a warm reply for a "
        "buying signal."
    ),
    "designer": (
        "You are the Product Designer. You judge whether someone can succeed in the "
        "first ninety seconds without being taught.\n\n"
        "Judge: the first-run experience, where users will stall, what to remove, and "
        "whether the interface communicates the value or hides it. Use "
        "check_color_contrast when specific colours are proposed.\n"
        "Your characteristic failure to guard against: aesthetic critique that does "
        "not change whether anyone completes the task."
    ),
    "assistant": (
        "You are the Executive Assistant. You convert intention into a week that "
        "actually happens.\n\n"
        "Judge: what must happen in the next seven days, what the founder will avoid, "
        "how progress gets measured, and what to drop. Be concrete about days. Use "
        "generate_weekly_schedule to lay this out.\n"
        "Your characteristic failure to guard against: producing a plan too full to "
        "survive one bad day."
    ),
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
    "Before writing, think through: what is the single strongest reason this fails "
    "in my area, and what evidence would change my mind. Do not show that thinking. "
    "Let it shape the score.\n\n"
    f"{SCORE_RUBRIC}\n\n"
    "Respond with ONLY valid JSON, no markdown fences, in this exact shape:\n"
    '{"title": "...", "summary": "...", "bullets": ["..."], "score": <int 0-100>, '
    '"prediction": {"statement": "...", "horizon_days": <int 7-120>}}\n\n'
    "title: under 9 words, states your verdict, not the topic. "
    "'Pricing is the unvalidated assumption' not 'Pricing analysis'.\n"
    "summary: 2-3 sentences. Lead with your conclusion. No preamble.\n"
    "bullets: 3-4 actions. Each must name a thing to do this week, not a principle. "
    "'Call 10 agency owners and ask what they pay now' not 'Validate demand'.\n"
    "score: per the rubric above.\n\n"
    "prediction: one falsifiable claim about THIS business, judgeable true or false "
    "on the stated date. Specific, measurable, and you must be willing to be wrong. "
    "No hedging: never 'may', 'might', 'could', 'likely'. Do not predict something "
    "certain to happen. Your accuracy is tracked and shown to the founder, so a safe "
    "prediction is worth nothing.\n"
    "Good: 'Fewer than 3 of the first 20 signups will still be active after 14 days.'\n"
    "Good: 'At least 6 of 10 agencies contacted will say they already pay for this.'\n"
    "Bad: 'Growth may be challenging.' / 'The market is competitive.'"
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


def _parse_prediction(data: dict) -> dict | None:
    raw = data.get("prediction")
    if not isinstance(raw, dict):
        return None

    statement = str(raw.get("statement", "")).strip()
    if len(statement) < 15 or len(statement) > 300:
        return None

    lowered = statement.lower()
    hedges = (" may ", " might ", " could ", " possibly ", " perhaps ", " likely ")
    if any(hedge in f" {lowered} " for hedge in hedges):
        return None

    try:
        horizon = int(raw.get("horizon_days", 30))
    except (TypeError, ValueError):
        horizon = 30

    return {"statement": statement, "horizon_days": max(7, min(120, horizon))}


def _parse_report(agent_key: str, raw: str) -> dict:
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    data = json.loads(raw)
    report = {
        "agent": DISPLAY_NAMES[agent_key],
        "title": str(data["title"]),
        "summary": str(data["summary"]),
        "bullets": [str(b) for b in list(data["bullets"])[:5]],
        "score": max(0, min(100, int(data["score"]))),
    }

    prediction = _parse_prediction(data)
    if prediction:
        report["prediction"] = prediction

    return report


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


def _router_report(agent_key: str, goal: str, message: str, memory_context: list[str] | None) -> dict | None:
    role = AGENT_ROLES[agent_key]

    context_block = ""
    if memory_context:
        joined = "\n".join(f"- {item}" for item in memory_context)
        context_block = f"\nRelevant prior context for this business:\n{joined}\n"

    user = (
        f"Business goal: {goal}\n"
        f"Latest founder message: {message}\n"
        f"{context_block}\n"
        f"{RESPONSE_FORMAT_INSTRUCTIONS}"
    )

    result = llm_router.complete_json(
        f"{BOARD_DOCTRINE}\n\n{role}", user, tier="fast", max_tokens=700
    )
    if not result:
        return None

    data, provider = result

    try:
        report = {
            "agent": DISPLAY_NAMES[agent_key],
            "title": str(data["title"]),
            "summary": str(data["summary"]),
            "bullets": [str(bullet) for bullet in list(data["bullets"])[:5]],
            "score": max(0, min(100, int(data["score"]))),
            "provider": provider,
        }
    except (KeyError, TypeError, ValueError):
        return None

    prediction = _parse_prediction(data)
    if prediction:
        report["prediction"] = prediction

    return report


def generate_agent_report(
    agent_key: str,
    goal: str,
    message: str,
    memory_context: list[str] | None = None,
) -> dict | None:
    client, model = _client()

    if client is None:
        return _router_report(agent_key, goal, message, memory_context)

    role = AGENT_ROLES[agent_key]
    context_block = ""
    if memory_context:
        joined = "\n".join(f"- {m}" for m in memory_context)
        context_block = f"\nRelevant prior context for this business:\n{joined}\n"

    prompt = (
        f"{BOARD_DOCTRINE}\n\n"
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
        return _router_report(agent_key, goal, message, memory_context)
