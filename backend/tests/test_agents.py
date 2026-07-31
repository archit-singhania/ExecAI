import pytest

from app.agents import (
    _initial_state,
    _score,
    assistant_agent,
    ceo_synthesis,
    cfo_agent,
    cto_agent,
    designer_agent,
    legal_agent,
    market_agent,
    marketing_agent,
    product_agent,
    sales_agent,
)


def _state_with(reports):
    state = _initial_state("An AI board for founders", "Should I build now?", [])
    state["reports"] = reports
    return state


def _report(agent, score=80):
    return {
        "agent": agent,
        "title": "t",
        "summary": "s",
        "bullets": ["b"],
        "score": score,
    }

ALL_AGENTS = [
    market_agent,
    cfo_agent,
    cto_agent,
    product_agent,
    marketing_agent,
    legal_agent,
    sales_agent,
    designer_agent,
    assistant_agent,
]

REQUIRED_KEYS = {"agent", "title", "summary", "bullets", "score"}


@pytest.fixture
def state(monkeypatch):
    monkeypatch.setattr("app.agents.generate_agent_report", lambda *args, **kwargs: None)
    return _initial_state("An AI board for founders", "Should I build the full product now?", [])


def test_score_stays_inside_bounds():
    assert _score("food delivery generic everyone no budget saturated", 50) >= 35
    assert _score("ai freelancer b2b automation niche saas", 95) <= 95


def test_score_penalises_crowded_markets():
    crowded = _score("a food delivery app for everyone", 78)
    focused = _score("a b2b saas automation niche for freelancers", 78)
    assert focused > crowded


def test_score_is_deterministic():
    assert _score("an ai saas for niche b2b", 78) == _score("an ai saas for niche b2b", 78)


@pytest.mark.parametrize("agent", ALL_AGENTS)
def test_each_agent_files_exactly_one_report(agent, state):
    before = len(state["reports"])
    agent(state)
    assert len(state["reports"]) == before + 1


@pytest.mark.parametrize("agent", ALL_AGENTS)
def test_report_shape_is_complete(agent, state):
    agent(state)
    report = state["reports"][-1]

    assert REQUIRED_KEYS.issubset(report.keys())
    assert isinstance(report["agent"], str) and report["agent"]
    assert isinstance(report["title"], str) and report["title"]
    assert isinstance(report["summary"], str) and report["summary"]
    assert isinstance(report["bullets"], list) and report["bullets"]
    assert all(isinstance(bullet, str) and bullet for bullet in report["bullets"])
    assert isinstance(report["score"], int)
    assert 0 <= report["score"] <= 100


def test_agents_have_distinct_identities(state):
    for agent in ALL_AGENTS:
        agent(state)

    names = [report["agent"] for report in state["reports"]]
    assert len(names) == len(set(names))
    assert len(names) == 9


def test_cfo_links_runway_to_its_own_score(state):
    cfo_agent(state)
    score = state["reports"][-1]["score"]
    assert state["runway_months"] == (7 if score >= 75 else 4)


def test_llm_report_is_used_when_available(monkeypatch, state):
    stub = {
        "agent": "CFO",
        "title": "From the model",
        "summary": "Model summary",
        "bullets": ["one"],
        "score": 91,
    }
    monkeypatch.setattr("app.agents.generate_agent_report", lambda *args, **kwargs: stub)

    cfo_agent(state)
    assert state["reports"][-1]["title"] == "From the model"
    assert state["runway_months"] == 7


def test_fallback_is_used_when_model_returns_nothing(state):
    market_agent(state)
    assert state["reports"][-1]["agent"] == "Market Research"


def test_synthesis_averages_every_report(state):
    for agent in ALL_AGENTS:
        agent(state)

    scores = [report["score"] for report in state["reports"]]
    ceo_synthesis(state)

    assert state["health_score"] == round(sum(scores) / len(scores))
    assert 0 <= state["health_score"] <= 100


def test_synthesis_produces_actionable_tasks(state):
    for agent in ALL_AGENTS:
        agent(state)
    ceo_synthesis(state)

    assert state["tasks"]
    for task in state["tasks"]:
        assert {"title", "description", "priority", "status", "created_by_agent"} <= task.keys()
        assert task["priority"] in {"High", "Medium", "Low"}
        assert task["title"].strip()


def test_task_titles_are_unique(state):
    for agent in ALL_AGENTS:
        agent(state)
    ceo_synthesis(state)

    titles = [task["title"] for task in state["tasks"]]
    assert len(titles) == len(set(titles))


def test_every_task_is_attributed_to_a_reporting_agent(state):
    for agent in ALL_AGENTS:
        agent(state)
    ceo_synthesis(state)

    reporters = {report["agent"] for report in state["reports"]}
    for task in state["tasks"]:
        assert task["created_by_agent"] in reporters


def test_final_verdict_states_the_score(state):
    for agent in ALL_AGENTS:
        agent(state)
    ceo_synthesis(state)

    assert str(state["health_score"]) in state["final"]
    assert len(state["final"]) > 80


def test_synthesis_reflects_a_weak_opportunity(state):
    state["reports"] = [
        {"agent": f"A{index}", "title": "t", "summary": "s", "bullets": ["b"], "score": 40}
        for index in range(9)
    ]
    ceo_synthesis(state)
    assert state["health_score"] == 40


def test_initial_state_has_every_key():
    fresh = _initial_state("goal", "message", None)
    expected = {
        "goal",
        "message",
        "memory_context",
        "reports",
        "final",
        "tasks",
        "predictions",
        "health_score",
        "runway_months",
        "conviction_spread",
        "conviction_low",
        "conviction_high",
        "most_sceptical",
        "most_convinced",
    }
    assert expected == set(fresh.keys())
    assert fresh["reports"] == []
    assert fresh["predictions"] == []
    assert fresh["memory_context"] == []


def test_synthesis_measures_the_spread():
    state = _state_with(
        [_report("CTO", score=91), _report("CFO", score=70), _report("Marketing", score=44)]
    )
    ceo_synthesis(state)

    assert state["conviction_low"] == 44
    assert state["conviction_high"] == 91
    assert state["conviction_spread"] == 47
    assert state["most_sceptical"] == "Marketing"
    assert state["most_convinced"] == "CTO"


def test_a_split_board_is_named_in_the_verdict():
    """The disagreement is the product, so it has to reach the verdict text."""
    state = _state_with(
        [_report("CTO", score=91), _report("Marketing", score=44)]
    )
    ceo_synthesis(state)

    assert "genuinely split" in state["final"]
    assert "Marketing" in state["final"]
    assert "47" in state["final"]


def test_an_aligned_board_says_so():
    state = _state_with([_report("CTO", score=80), _report("CFO", score=78)])
    ceo_synthesis(state)

    assert "aligned" in state["final"]
    assert state["conviction_spread"] == 2


def test_middling_spread_names_the_desk_to_satisfy():
    state = _state_with([_report("CTO", score=85), _report("Sales", score=68)])
    ceo_synthesis(state)

    assert "reservations" in state["final"]
    assert "Sales" in state["final"]
