import pytest

from app.agents import AGENT_PREDICTIONS, _initial_state, ceo_synthesis
from app.llm import _parse_prediction

ALL_NINE = [
    "Market Research",
    "CFO",
    "CTO",
    "Product Manager",
    "Marketing",
    "Legal",
    "Sales",
    "Designer",
    "Executive Assistant",
]


def _state_with(reports):
    state = _initial_state("An AI board for founders", "Should I build now?", [])
    state["reports"] = reports
    return state


def _report(agent, score=80, prediction=None):
    report = {
        "agent": agent,
        "title": "t",
        "summary": "s",
        "bullets": ["b"],
        "score": score,
    }
    if prediction:
        report["prediction"] = prediction
    return report


def test_every_agent_has_a_fallback_prediction():
    assert set(AGENT_PREDICTIONS) == set(ALL_NINE)


def test_fallback_predictions_carry_a_horizon():
    for statement, horizon in AGENT_PREDICTIONS.values():
        assert statement.strip()
        assert 7 <= horizon <= 120


def test_synthesis_produces_one_prediction_per_report():
    state = _state_with([_report(agent) for agent in ALL_NINE])
    ceo_synthesis(state)

    assert len(state["predictions"]) == 9
    assert {item["agent"] for item in state["predictions"]} == set(ALL_NINE)


def test_model_supplied_prediction_wins_over_the_fallback():
    supplied = {"statement": "Churn will exceed 8 percent by March.", "horizon_days": 45}
    state = _state_with([_report("CFO", prediction=supplied)])
    ceo_synthesis(state)

    prediction = state["predictions"][0]
    assert prediction["statement"] == supplied["statement"]
    assert prediction["horizon_days"] == 45


def test_fallback_is_used_when_the_model_supplies_nothing():
    state = _state_with([_report("CFO")])
    ceo_synthesis(state)

    assert state["predictions"][0]["statement"] == AGENT_PREDICTIONS["CFO"][0]


def test_confidence_mirrors_the_report_score():
    state = _state_with([_report("Sales", score=63)])
    ceo_synthesis(state)
    assert state["predictions"][0]["confidence"] == 63


def test_unknown_agent_without_a_prediction_is_skipped():
    state = _state_with([_report("Ops Wizard")])
    ceo_synthesis(state)
    assert state["predictions"] == []


@pytest.mark.parametrize(
    "statement",
    [
        "Growth may be challenging next quarter.",
        "Revenue could increase over time.",
        "This might work.",
        "Adoption is likely to improve.",
    ],
)
def test_hedged_predictions_are_rejected(statement):
    assert _parse_prediction({"prediction": {"statement": statement, "horizon_days": 30}}) is None


def test_too_short_predictions_are_rejected():
    assert _parse_prediction({"prediction": {"statement": "Yes.", "horizon_days": 30}}) is None


def test_missing_prediction_block_is_rejected():
    assert _parse_prediction({}) is None
    assert _parse_prediction({"prediction": "not an object"}) is None


def test_valid_prediction_is_accepted():
    result = _parse_prediction(
        {"prediction": {"statement": "Fewer than 3 of 20 signups will remain active.", "horizon_days": 14}}
    )
    assert result is not None
    assert result["horizon_days"] == 14


def test_horizon_is_clamped_into_range():
    long = _parse_prediction(
        {"prediction": {"statement": "Fewer than 3 of 20 signups will remain active.", "horizon_days": 9999}}
    )
    short = _parse_prediction(
        {"prediction": {"statement": "Fewer than 3 of 20 signups will remain active.", "horizon_days": 1}}
    )

    assert long["horizon_days"] == 120
    assert short["horizon_days"] == 7


def test_non_numeric_horizon_falls_back_to_thirty():
    result = _parse_prediction(
        {"prediction": {"statement": "Fewer than 3 of 20 signups will remain active.", "horizon_days": "soon"}}
    )
    assert result["horizon_days"] == 30
