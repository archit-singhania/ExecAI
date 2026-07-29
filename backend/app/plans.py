from dataclasses import dataclass, field
from typing import Literal

TierId = Literal["free", "pro", "team", "agency"]


@dataclass(frozen=True)
class Plan:
    id: TierId
    name: str
    price_eur: float
    tagline: str
    agent_limit: int
    session_limit: int
    monthly_runs: int
    scheduled_reviews: bool
    exports: bool
    workspaces: bool
    white_label: bool
    api_access: bool
    features: list[str] = field(default_factory=list)


PLANS: dict[TierId, Plan] = {
    "free": Plan(
        id="free",
        name="Free",
        price_eur=0.0,
        tagline="See the board work.",
        agent_limit=3,
        session_limit=1,
        monthly_runs=20,
        scheduled_reviews=False,
        exports=False,
        workspaces=False,
        white_label=False,
        api_access=False,
        features=[
            "3 specialists",
            "1 active session",
            "20 board runs a month",
            "Conviction spread",
        ],
    ),
    "pro": Plan(
        id="pro",
        name="Pro",
        price_eur=4.99,
        tagline="The full floor, meeting weekly.",
        agent_limit=9,
        session_limit=5,
        monthly_runs=300,
        scheduled_reviews=True,
        exports=True,
        workspaces=False,
        white_label=False,
        api_access=False,
        features=[
            "All 9 specialists",
            "5 active sessions",
            "300 board runs a month",
            "Scheduled reviews, emailed",
            "Markdown exports",
            "Long-term memory search",
        ],
    ),
    "team": Plan(
        id="team",
        name="Team",
        price_eur=9.99,
        tagline="One board, many founders.",
        agent_limit=9,
        session_limit=25,
        monthly_runs=1500,
        scheduled_reviews=True,
        exports=True,
        workspaces=True,
        white_label=False,
        api_access=False,
        features=[
            "Everything in Pro",
            "25 active sessions",
            "1,500 board runs a month",
            "Shared workspaces and seats",
            "Priority run queue",
        ],
    ),
    "agency": Plan(
        id="agency",
        name="Agency",
        price_eur=14.99,
        tagline="A board for every client you run.",
        agent_limit=9,
        session_limit=200,
        monthly_runs=10000,
        scheduled_reviews=True,
        exports=True,
        workspaces=True,
        white_label=True,
        api_access=True,
        features=[
            "Everything in Team",
            "200 active sessions",
            "10,000 board runs a month",
            "Multi-client workspaces",
            "White-label branding",
            "API access",
        ],
    ),
}

DEFAULT_TIER: TierId = "free"

RUN_LIMITS_PER_MINUTE: dict[TierId, int] = {
    "free": 3,
    "pro": 10,
    "team": 20,
    "agency": 40,
}


def get_plan(tier: str | None) -> Plan:
    return PLANS.get(tier or DEFAULT_TIER, PLANS[DEFAULT_TIER])


def plan_list() -> list[Plan]:
    return [PLANS["free"], PLANS["pro"], PLANS["team"], PLANS["agency"]]
