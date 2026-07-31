from typing import Callable, Iterator, TypedDict
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed

from langgraph.graph import END, StateGraph

from app.store import cache_get, cache_set
from app.config import get_settings
from app.llm import generate_agent_report


class AgentBrief(TypedDict, total=False):
    agent: str
    title: str
    summary: str
    bullets: list[str]
    score: int
    prediction: dict[str, object]


class CEOState(TypedDict):
    goal: str
    message: str
    memory_context: list[str]
    reports: list[AgentBrief]
    final: str
    tasks: list[dict[str, str]]
    predictions: list[dict[str, object]]
    health_score: int
    runway_months: int
    conviction_spread: int
    conviction_low: int
    conviction_high: int
    most_sceptical: str
    most_convinced: str


AGENT_PREDICTIONS: dict[str, tuple[str, int]] = {
    "Market Research": (
        "At least 3 of the next 10 target customers will describe this problem as urgent.",
        30,
    ),
    "CFO": (
        "Cost to acquire a customer will exceed first-month revenue per customer.",
        60,
    ),
    "CTO": (
        "The core workflow will be shippable by one engineer within six weeks.",
        42,
    ),
    "Product Manager": (
        "More than half of users who finish a first session will return within seven days.",
        30,
    ),
    "Marketing": (
        "Organic channels will produce more signups than paid in the first month.",
        30,
    ),
    "Legal": (
        "No regulatory or compliance blocker will surface before launch.",
        90,
    ),
    "Sales": (
        "At least one prospect will commit to a paid pilot.",
        45,
    ),
    "Designer": (
        "First-session completion rate will exceed 50 percent.",
        30,
    ),
    "Executive Assistant": (
        "Fewer than half of this week's tasks will be closed on time.",
        14,
    ),
}


def _score(text: str, base: int) -> int:
    lowered = text.lower()
    penalties = ["food delivery", "generic", "everyone", "no budget", "saturated"]
    boosts = ["ai", "freelancer", "b2b", "automation", "niche", "saas"]
    score = base - sum(5 for item in penalties if item in lowered) + sum(4 for item in boosts if item in lowered)
    return max(35, min(95, score))


def market_agent(state: CEOState) -> CEOState:
    goal = state["message"] or state["goal"]
    llm_report = generate_agent_report("market", state["goal"], state["message"], state.get("memory_context"))
    if llm_report:
        state["reports"].append(llm_report)
        return state
    score = _score(goal, 78)
    report: AgentBrief = {
        "agent": "Market Research",
        "title": "Narrow the market before building",
        "summary": "The best path is to validate one painful use case with a reachable segment, then expand after proof of willingness to pay.",
        "bullets": [
            "Interview users who already spend time or money solving this manually.",
            "Reject broad consumer markets until there is a sharper wedge.",
            "Use a landing page test before product development.",
        ],
        "score": score,
    }
    state["reports"].append(report)
    return state


def cfo_agent(state: CEOState) -> CEOState:
    llm_report = generate_agent_report("cfo", state["goal"], state["message"], state.get("memory_context"))
    if llm_report:
        state["runway_months"] = 7 if llm_report["score"] >= 75 else 4
        state["reports"].append(llm_report)
        return state
    score = _score(state["goal"], 74)
    report: AgentBrief = {
        "agent": "CFO",
        "title": "Preserve runway until validation is proven",
        "summary": "Keep the first experiment lean: customer interviews, positioning tests, and a small acquisition budget before engineering spend.",
        "bullets": [
            "Cap validation cost at 10-15% of the starting budget.",
            "Track CAC, conversion, gross margin, and time-to-first-value.",
            "Do not hire or buy tools before demand signals exist.",
        ],
        "score": score,
    }
    state["runway_months"] = 7 if score >= 75 else 4
    state["reports"].append(report)
    return state


def cto_agent(state: CEOState) -> CEOState:
    llm_report = generate_agent_report("cto", state["goal"], state["message"], state.get("memory_context"))
    if llm_report:
        state["reports"].append(llm_report)
        return state
    report: AgentBrief = {
        "agent": "CTO",
        "title": "Build a thin MVP with measurable workflows",
        "summary": "Use Next.js, FastAPI, LangGraph, PostgreSQL, and pgvector. Ship the smallest loop: input, agent plan, report, task tracking.",
        "bullets": [
            "Start with one core workflow and one dashboard.",
            "Store decisions and reports as structured records.",
            "Add background jobs only after the manual board report works.",
        ],
        "score": 86,
    }
    state["reports"].append(report)
    return state


def product_agent(state: CEOState) -> CEOState:
    llm_report = generate_agent_report("product", state["goal"], state["message"], state.get("memory_context"))
    if llm_report:
        state["reports"].append(llm_report)
        return state
    report: AgentBrief = {
        "agent": "Product Manager",
        "title": "Define success around decisions, not chat length",
        "summary": "The product should help the founder make better weekly decisions through briefs, tasks, and hard strategic pushback.",
        "bullets": [
            "Primary user story: founder asks for a launch strategy and receives a board-ready plan.",
            "MVP scope: chat, reports, tasks, memory, dashboard.",
            "Success metric: user completes validation tasks within 7 days.",
        ],
        "score": 82,
    }
    state["reports"].append(report)
    return state


def marketing_agent(state: CEOState) -> CEOState:
    llm_report = generate_agent_report("marketing", state["goal"], state["message"], state.get("memory_context"))
    if llm_report:
        state["reports"].append(llm_report)
        return state
    report: AgentBrief = {
        "agent": "Marketing",
        "title": "Lead with the contrarian CEO positioning",
        "summary": "Position the product as an AI executive that challenges weak ideas and produces investor-style operating briefs.",
        "bullets": [
            "Create demo clips around 'the AI CEO disagreed with me'.",
            "Target indie hackers, students, and early founders first.",
            "Publish weekly teardown reports as acquisition content.",
        ],
        "score": 80,
    }
    state["reports"].append(report)
    return state


def legal_agent(state: CEOState) -> CEOState:
    llm_report = generate_agent_report("legal", state["goal"], state["message"], state.get("memory_context"))
    if llm_report:
        state["reports"].append(llm_report)
        return state
    report: AgentBrief = {
        "agent": "Legal",
        "title": "Use approval gates for external actions",
        "summary": "The CEO may draft policies, emails, and business checklists, but anything legal, financial, or externally sent should require human approval.",
        "bullets": [
            "Add clear disclaimers for legal and financial guidance.",
            "Store approval history for outbound messages and spending decisions.",
            "Prepare privacy policy and terms once user data collection begins.",
        ],
        "score": 76,
    }
    state["reports"].append(report)
    return state


def sales_agent(state: CEOState) -> CEOState:
    llm_report = generate_agent_report("sales", state["goal"], state["message"], state.get("memory_context"))
    if llm_report:
        state["reports"].append(llm_report)
        return state
    report: AgentBrief = {
        "agent": "Sales",
        "title": "Sell the pilot before scaling the product",
        "summary": "The fastest evidence is a paid or committed pilot from a narrow segment, supported by direct outreach and founder-led demos.",
        "bullets": [
            "Build a list of 30 qualified prospects.",
            "Send concise outreach around one painful workflow.",
            "Ask for a pilot conversation, not generic feedback.",
        ],
        "score": 79,
    }
    state["reports"].append(report)
    return state


def designer_agent(state: CEOState) -> CEOState:
    llm_report = generate_agent_report("designer", state["goal"], state["message"], state.get("memory_context"))
    if llm_report:
        state["reports"].append(llm_report)
        return state
    report: AgentBrief = {
        "agent": "Designer",
        "title": "Make the product feel like an operating room",
        "summary": "The UI should communicate executive control: dense information, calm contrast, clear signals, and fast access to decisions.",
        "bullets": [
            "Keep chat connected to reports, tasks, and metrics.",
            "Use compact cards for repeated items only.",
            "Prioritize scanability over marketing-style sections.",
        ],
        "score": 84,
    }
    state["reports"].append(report)
    return state


def assistant_agent(state: CEOState) -> CEOState:
    llm_report = generate_agent_report("assistant", state["goal"], state["message"], state.get("memory_context"))
    if llm_report:
        state["reports"].append(llm_report)
        return state
    report: AgentBrief = {
        "agent": "Executive Assistant",
        "title": "Convert strategy into a weekly operating rhythm",
        "summary": "Every CEO decision should become tasks, reminders, board notes, and a visible accountability trail.",
        "bullets": [
            "Generate a weekly board review from tasks and reports.",
            "Track missed work explicitly.",
            "Keep next actions short enough to execute.",
        ],
        "score": 83,
    }
    state["reports"].append(report)
    return state


def ceo_synthesis(state: CEOState) -> CEOState:
    average_score = round(sum(report["score"] for report in state["reports"]) / len(state["reports"]))
    state["health_score"] = average_score

    scores = sorted(report["score"] for report in state["reports"])
    state["conviction_low"] = scores[0]
    state["conviction_high"] = scores[-1]
    state["conviction_spread"] = scores[-1] - scores[0]

    lowest = min(state["reports"], key=lambda report: report["score"])
    highest = max(state["reports"], key=lambda report: report["score"])
    state["most_sceptical"] = lowest["agent"]
    state["most_convinced"] = highest["agent"]
    top_risk = "market saturation" if "food delivery" in state["message"].lower() else "building before validation"
    state["tasks"] = [
        {
            "title": "Interview 10 target customers",
            "description": "Capture exact pain statements, current workaround, and willingness to pay.",
            "priority": "High",
            "status": "Ready",
            "created_by_agent": "Market Research",
        },
        {
            "title": "Create one landing page offer and measure signups",
            "description": "Test one promise, one audience, and one call to action.",
            "priority": "High",
            "status": "Ready",
            "created_by_agent": "Marketing",
        },
        {
            "title": "Estimate CAC, price, margin, and break-even point",
            "description": "Set a spending ceiling before any paid acquisition.",
            "priority": "Medium",
            "status": "Ready",
            "created_by_agent": "CFO",
        },
        {
            "title": "Define MVP scope in one page",
            "description": "Describe the narrowest workflow that proves repeat value.",
            "priority": "Medium",
            "status": "Ready",
            "created_by_agent": "Product Manager",
        },
        {
            "title": "Build a 30-prospect pilot list",
            "description": "Prioritize buyers with visible pain and budget authority.",
            "priority": "Medium",
            "status": "Ready",
            "created_by_agent": "Sales",
        },
    ]
    state["predictions"] = []
    for report in state["reports"]:
        agent = report["agent"]
        supplied = report.get("prediction")

        if isinstance(supplied, dict) and supplied.get("statement"):
            statement = str(supplied["statement"])
            horizon = int(supplied.get("horizon_days", 30) or 30)
        elif agent in AGENT_PREDICTIONS:
            statement, horizon = AGENT_PREDICTIONS[agent]
        else:
            continue

        state["predictions"].append(
            {
                "agent": agent,
                "statement": statement,
                "horizon_days": horizon,
                "confidence": report["score"],
            }
        )

    spread = state["conviction_spread"]
    if spread <= 10:
        dissent = (
            f"The floor is aligned: {spread} points separate the highest and lowest desk. "
            "That agreement is itself worth noting, and worth testing."
        )
    elif spread <= 22:
        dissent = (
            f"There is broad agreement with reservations — a {spread} point range. "
            f"{state['most_sceptical']} is the desk to satisfy before committing."
        )
    else:
        dissent = (
            f"The floor is genuinely split: {spread} points between "
            f"{state['most_convinced']} at {state['conviction_high']} and "
            f"{state['most_sceptical']} at {state['conviction_low']}. "
            "That gap is where the real risk sits, and it should be closed with "
            "evidence rather than argument."
        )

    state["final"] = (
        f"CEO decision: proceed only with validation gates. The opportunity currently scores "
        f"{average_score}/100. {dissent} My main concern is {top_risk}. For the next 7 days, "
        "do not build the full product. Validate demand, prove willingness to pay, then build "
        "the narrowest MVP. I recommend moving forward if at least 3 out of 10 target users "
        "show urgent pain or agree to a paid pilot."
    )
    return state


AGENT_SEQUENCE: list[tuple[str, Callable[["CEOState"], "CEOState"]]] = []


def _register_sequence() -> None:
    AGENT_SEQUENCE.clear()
    AGENT_SEQUENCE.extend(
        [
            ("market", market_agent),
            ("cfo", cfo_agent),
            ("cto", cto_agent),
            ("product", product_agent),
            ("marketing", marketing_agent),
            ("legal", legal_agent),
            ("sales", sales_agent),
            ("designer", designer_agent),
            ("assistant", assistant_agent),
        ]
    )


def _run_isolated(agent_fn: Callable[["CEOState"], "CEOState"], base: "CEOState") -> "CEOState":
    local: CEOState = {**base, "reports": []}
    agent_fn(local)
    return local


def _merge(state: "CEOState", name: str, local: "CEOState") -> None:
    state["reports"].extend(local["reports"])
    if name == "cfo":
        state["runway_months"] = local["runway_months"]


def build_ceo_graph():
    graph = StateGraph(CEOState)
    graph.add_node("market", market_agent)
    graph.add_node("cfo", cfo_agent)
    graph.add_node("cto", cto_agent)
    graph.add_node("product", product_agent)
    graph.add_node("marketing", marketing_agent)
    graph.add_node("legal", legal_agent)
    graph.add_node("sales", sales_agent)
    graph.add_node("designer", designer_agent)
    graph.add_node("assistant", assistant_agent)
    graph.add_node("ceo", ceo_synthesis)

    graph.set_entry_point("market")
    graph.add_edge("market", "cfo")
    graph.add_edge("cfo", "cto")
    graph.add_edge("cto", "product")
    graph.add_edge("product", "marketing")
    graph.add_edge("marketing", "legal")
    graph.add_edge("legal", "sales")
    graph.add_edge("sales", "designer")
    graph.add_edge("designer", "assistant")
    graph.add_edge("assistant", "ceo")
    graph.add_edge("ceo", END)
    return graph.compile()


def _initial_state(goal: str, message: str, memory_context: list[str] | None) -> CEOState:
    return {
        "goal": goal,
        "message": message,
        "memory_context": memory_context or [],
        "reports": [],
        "final": "",
        "tasks": [],
        "predictions": [],
        "health_score": 75,
        "runway_months": 6,
        "conviction_spread": 0,
        "conviction_low": 0,
        "conviction_high": 0,
        "most_sceptical": "",
        "most_convinced": "",
    }


def _cache_key(goal: str, message: str) -> str:
    digest = hashlib.sha256(f"{goal.strip().lower()}||{message.strip().lower()}".encode()).hexdigest()
    return f"agents:v1:{digest[:32]}"


def run_ceo_agents(goal: str, message: str, memory_context: list[str] | None = None) -> CEOState:
    """Run all nine specialists concurrently, then synthesise.

    They were sequential, which meant nine round trips end to end. Each agent
    only reads the goal and message, so there is no reason to wait: every one
    gets an isolated state copy and the results merge afterwards.

    Reports merge in declaration order rather than completion order, so the
    board always reads in the same sequence even though the desks finish in
    whatever order the providers respond.
    """
    settings = get_settings()
    _ = settings.openai_api_key

    if not AGENT_SEQUENCE:
        _register_sequence()

    key = _cache_key(goal, message)
    if not memory_context:
        cached = cache_get(key)
        if cached:
            return cached

    state = _initial_state(goal, message, memory_context)
    collected: dict[str, CEOState] = {}

    with ThreadPoolExecutor(max_workers=len(AGENT_SEQUENCE)) as pool:
        futures = {
            pool.submit(_run_isolated, agent_fn, state): name
            for name, agent_fn in AGENT_SEQUENCE
        }

        for future in as_completed(futures):
            name = futures[future]
            try:
                collected[name] = future.result()
            except Exception as exc:
                print(f"[agents] {name} failed: {exc}")

    for name, _agent in AGENT_SEQUENCE:
        local = collected.get(name)
        if local and local["reports"]:
            _merge(state, name, local)

    if not state["reports"]:
        raise RuntimeError("Every specialist failed to file a report.")

    ceo_synthesis(state)

    if not memory_context:
        cache_set(key, state, ttl_seconds=86400)

    return state


def run_ceo_agents_stream(
    goal: str, message: str, memory_context: list[str] | None = None
) -> Iterator[tuple[str, CEOState]]:
    """Yield (node_name, state_so_far) as each specialist finishes.

    Runs concurrently and yields on completion, so a fast desk appears
    immediately rather than waiting behind a slow one earlier in the list.
    The last yield is always ("ceo", final_state).
    """
    if not AGENT_SEQUENCE:
        _register_sequence()

    state = _initial_state(goal, message, memory_context)
    collected: dict[str, CEOState] = {}

    with ThreadPoolExecutor(max_workers=len(AGENT_SEQUENCE)) as pool:
        futures = {
            pool.submit(_run_isolated, agent_fn, state): name
            for name, agent_fn in AGENT_SEQUENCE
        }

        for future in as_completed(futures):
            name = futures[future]
            try:
                local = future.result()
            except Exception as exc:
                print(f"[agents] {name} failed: {exc}")
                continue

            if not local["reports"]:
                continue

            collected[name] = local
            _merge(state, name, local)
            yield name, {**state, "reports": list(local["reports"])}

    if not state["reports"]:
        raise RuntimeError("Every specialist failed to file a report.")

    state["reports"] = []
    for name, _agent in AGENT_SEQUENCE:
        local = collected.get(name)
        if local:
            state["reports"].extend(local["reports"])

    ceo_synthesis(state)
    yield "ceo", state
