from typing import TypedDict
from langgraph.graph import END, StateGraph
from app.config import get_settings


class AgentBrief(TypedDict):
    agent: str
    title: str
    summary: str
    bullets: list[str]
    score: int


class CEOState(TypedDict):
    goal: str
    message: str
    reports: list[AgentBrief]
    final: str
    tasks: list[dict[str, str]]
    health_score: int
    runway_months: int


def _score(text: str, base: int) -> int:
    lowered = text.lower()
    penalties = ["food delivery", "generic", "everyone", "no budget", "saturated"]
    boosts = ["ai", "freelancer", "b2b", "automation", "niche", "saas"]
    score = base - sum(5 for item in penalties if item in lowered) + sum(4 for item in boosts if item in lowered)
    return max(35, min(95, score))


def market_agent(state: CEOState) -> CEOState:
    goal = state["message"] or state["goal"]
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
    state["final"] = (
        f"CEO decision: proceed only with validation gates. The opportunity currently scores {average_score}/100. "
        f"My main concern is {top_risk}. For the next 7 days, do not build the full product. "
        "Validate demand, prove willingness to pay, and then build the narrowest MVP. "
        "I recommend moving forward if at least 3 out of 10 target users show urgent pain or agree to a paid pilot."
    )
    return state


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


def run_ceo_agents(goal: str, message: str) -> CEOState:
    settings = get_settings()
    # The deterministic graph keeps the app fully functional without paid keys.
    # A real LLM node can be added here when OPENAI_API_KEY is configured.
    _ = settings.openai_api_key
    graph = build_ceo_graph()
    return graph.invoke(
        {
            "goal": goal,
            "message": message,
            "reports": [],
            "final": "",
            "tasks": [],
            "health_score": 75,
            "runway_months": 6,
        }
    )
