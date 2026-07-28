"""Tests for the Halcyon affect reader, planner and schedule maths.

These cover the parts with real logic in them. The two that matter most are
the crisis bypass and the direction of the environment response — both are
easy to break with a well-meaning refactor and both are visible to a user in
a bad moment.
"""

from datetime import datetime

import pytest

from app.halcyon.affect import detect_crisis, estimate_affect
from app.halcyon.arc import ArcReading, apply_arc, compute_arc
from app.halcyon.narrator import _sanitise
from app.halcyon.planner import (
    WORLD_PLACES,
    choose_invitation,
    plan_crisis_environment,
    plan_environment,
)
from app.halcyon.schemas import AffectReading
from app.halcyon.worlds import WORLD_BASELINES, baseline_for
from app.scheduling import compute_next_run

@pytest.mark.parametrize(
    "text",
    [
        "Have you tried breathing deeply?",
        "I sense that you're struggling today.",
        "You should try to rest.",
        "How are you feeling right now?",
        "This is a safe space for healing.",
        "",
        "A. B. C. D. E.",
    ],
)
def test_narrator_rejects_bad_lines(text):
    assert _sanitise(text) is None


@pytest.mark.parametrize(
    "text",
    [
        "The wind drops. The water goes flat.",
        "It's early here, and the light is coming up slowly.",
        "The sky stays open.",
    ],
)
def test_narrator_accepts_good_lines(text):
    assert _sanitise(text) == text


def test_narrator_strips_reasoning_blocks():
    assert _sanitise("<think>hmm</think>The wind drops.") == "The wind drops."

@pytest.mark.parametrize(
    "text,expected",
    [
        ("I can't stop spiralling about the launch", "anxious"),
        ("everything feels heavy and I've been crying", "low"),
        ("I'm completely burnt out, running on empty", "exhausted"),
        ("I'm so fed up with all of it", "angry"),
        ("feeling calm and settled today", "calm"),
        ("I'm hopeful, the pilot went great", "hopeful"),
        ("the meeting is at four", "neutral"),
    ],
)
def test_affect_labels(text, expected):
    assert estimate_affect(text).label == expected


def test_confidence_never_reads_as_certain():
    reading = estimate_affect("anxious worried scared panicking on edge stressed")
    assert reading.confidence <= 0.85


def test_negation_damps_rather_than_inverts():
    plain = estimate_affect("I am anxious")
    negated = estimate_affect("I am not anxious")

    assert negated.label == "anxious"
    assert abs(negated.valence) < abs(plain.valence)
    assert negated.confidence < plain.confidence


def test_neutral_text_is_low_confidence():
    reading = estimate_affect("what time does the shop open")
    assert reading.label == "neutral"
    assert reading.confidence < 0.3

@pytest.mark.parametrize(
    "text",
    [
        "I want to die",
        "I've been thinking about ending my life",
        "sometimes I want to hurt myself",
        "everyone would be better off dead",
    ],
)
def test_crisis_detected(text):
    assert detect_crisis(text) is True


@pytest.mark.parametrize(
    "text",
    [
        "I'm dying of laughter",
        "this deadline is killing me",
        "I'm exhausted but okay",
    ],
)
def test_crisis_not_over_triggered(text):
    assert detect_crisis(text) is False


def test_crisis_environment_stops_performing():
    """The world must not prettify itself in response to a crisis."""
    env = plan_crisis_environment("ocean_dusk")

    assert env.reason == "crisis_hold"
    assert env.wind <= 0.05
    assert env.water_motion <= 0.05
    assert env.music == "none"
    assert env.music_volume == 0.0
    assert env.companion == "none"
    assert env.companion_action == "absent"
    assert env.breathing_guide is False
    assert env.invitation == "none"

def test_distress_is_invited_to_stop_not_to_move():
    env = plan_environment("zen_garden", estimate_affect("I'm panicking, I can't stop"))
    assert env.invitation == "sit"
    assert env.invitation_label


def test_hope_is_invited_outward():
    env = plan_environment("ocean_dusk", estimate_affect("I feel hopeful and excited"))
    assert env.invitation == "overlook"


def test_exhaustion_is_offered_shelter():
    env = plan_environment("rain_cabin", estimate_affect("I am completely drained"))
    assert env.invitation == "shelter"


def test_calm_is_left_alone():
    """A world that constantly suggests things is a world that wants
    something from you."""
    for text in ("I feel calm and settled", "the meeting is at four"):
        env = plan_environment("zen_garden", estimate_affect(text))
        assert env.invitation == "none"
        assert env.invitation_label == ""


def test_never_invited_somewhere_that_does_not_exist():
    """An invitation you can't accept is worse than silence."""
    env = plan_environment("rain_cabin", estimate_affect("I feel hopeful"))
    assert env.invitation == "none"

    for world, places in WORLD_PLACES.items():
        for text in ("I'm panicking", "everything is heavy", "I'm drained", "I feel hopeful"):
            env = plan_environment(world, estimate_affect(text))
            if env.invitation != "none":
                assert env.invitation in places, f"{world} invited to {env.invitation}"


def test_invitation_label_only_present_with_an_invitation():
    for world in WORLD_BASELINES:
        for text in ("I'm panicking", "I feel calm", "hello", "I feel hopeful"):
            env = plan_environment(world, estimate_affect(text))
            assert bool(env.invitation_label) == (env.invitation != "none")


def test_choose_invitation_is_conservative_for_unknown_worlds():
    assert choose_invitation("nowhere", "anxious") == ("none", "")

def _reading(label: str) -> AffectReading:
    return estimate_affect({
        "anxious": "I'm panicking and can't stop",
        "low": "everything feels heavy",
        "calm": "I feel calm and settled",
        "hopeful": "I feel hopeful",
        "neutral": "the shop opens at nine",
    }[label])


def test_arc_unknown_before_three_turns():
    arc = compute_arc([_reading("anxious"), _reading("anxious")])
    assert arc.trajectory == "unknown"


def test_arc_detects_settling():
    history = [_reading("anxious"), _reading("anxious"), _reading("calm"), _reading("hopeful")]
    assert compute_arc(history).trajectory == "settling"


def test_arc_detects_escalation():
    history = [_reading("neutral"), _reading("calm"), _reading("anxious"), _reading("anxious")]
    assert compute_arc(history).trajectory == "escalating"


def test_arc_detects_holding():
    history = [_reading("anxious")] * 4
    assert compute_arc(history).trajectory == "holding"


def test_escalation_makes_the_world_do_less():
    """The central claim of arc.py: a world that rearranges itself harder
    while someone spirals is amplifying the spiral."""
    affect = _reading("anxious")
    plain = plan_environment("zen_garden", affect)

    escalating = apply_arc(
        plan_environment("zen_garden", affect),
        ArcReading(trajectory="escalating", turns=5, distress_now=0.8, distress_delta=0.3),
    )

    assert escalating.transition_seconds > plain.transition_seconds
    assert escalating.invitation == "none"
    assert escalating.music_volume <= plain.music_volume
    assert escalating.ambience_volume <= plain.ambience_volume
    assert escalating.breathing_guide is True


def test_escalation_stops_the_companion_crowding():
    affect = _reading("low")
    plain = plan_environment("zen_garden", affect)
    assert plain.companion_action == "approach"

    escalating = apply_arc(
        plan_environment("zen_garden", affect),
        ArcReading(trajectory="escalating", turns=5, distress_now=0.7),
    )
    assert escalating.companion_action == "settle"


def test_stuck_sessions_stop_being_offered_new_things():
    affect = _reading("anxious")
    held = apply_arc(
        plan_environment("zen_garden", affect),
        ArcReading(trajectory="holding", turns=6, distress_now=0.7),
    )
    assert held.invitation == "none"


def test_settling_does_not_rush_the_world_back():
    affect = _reading("calm")
    plain = plan_environment("zen_garden", affect)
    settling = apply_arc(
        plan_environment("zen_garden", affect),
        ArcReading(trajectory="settling", turns=5, distress_now=0.1),
    )
    assert settling.transition_seconds <= plain.transition_seconds
    assert settling.transition_seconds >= 4.0


def test_arc_keeps_environment_in_range():
    affect = _reading("anxious")
    for trajectory in ("escalating", "settling", "holding", "unknown"):
        env = apply_arc(
            plan_environment("ocean_dusk", affect),
            ArcReading(trajectory=trajectory, turns=5, distress_now=0.6),
        )
        for field in ("wind", "water_motion", "fog", "brightness", "warmth",
                      "ambience_volume", "music_volume"):
            assert 0.0 <= getattr(env, field) <= 1.0
        assert 3.0 <= env.breathing_pace_seconds <= 8.0
        assert env.transition_seconds <= 60.0


def test_distress_lowers_energy_rather_than_brightening():
    base = baseline_for("zen_garden")
    env = plan_environment("zen_garden", estimate_affect("I'm panicking, I can't stop"))

    assert env.wind < base.wind
    assert env.water_motion < base.water_motion
    assert env.breathing_guide is True
    assert env.transition_seconds > base.transition_seconds


def test_low_mood_warms_and_brings_company():
    base = baseline_for("zen_garden")
    env = plan_environment("zen_garden", estimate_affect("everything feels heavy, I've been crying"))

    assert env.warmth > base.warmth
    assert env.time_of_day < 12           
    assert env.companion_action == "approach"


def test_exhaustion_dims_rather_than_brightens():
    base = baseline_for("zen_garden")
    env = plan_environment("zen_garden", estimate_affect("I am completely drained, no energy"))

    assert env.brightness < base.brightness
    assert env.breathing_guide is True


def test_hopeful_opens_the_sky():
    base = baseline_for("zen_garden")
    env = plan_environment("zen_garden", estimate_affect("I feel hopeful and excited"))

    assert env.fog < base.fog
    assert env.brightness > base.brightness
    assert env.weather == "clear"


def test_planner_never_leaves_the_normalised_range():
    """Every continuous field is lerped into engine params; out-of-range
    values would silently produce broken visuals rather than an error."""
    texts = [
        "I'm panicking", "everything is heavy", "I'm drained",
        "I'm furious", "I feel calm", "I'm hopeful", "hello",
    ]

    for world in WORLD_BASELINES:
        for text in texts:
            env = plan_environment(world, estimate_affect(text))
            for field in ("wind", "water_motion", "fog", "brightness", "warmth", "bloom",
                          "ambience_volume", "music_volume"):
                value = getattr(env, field)
                assert 0.0 <= value <= 1.0, f"{world}/{text}/{field} = {value}"
            assert 0.0 <= env.time_of_day <= 24.0


def test_planner_does_not_invent_a_companion():
    """A world with no companion must not acquire one from a mood shift."""
    env = plan_environment("nordic_lake", estimate_affect("everything feels heavy"))
    assert env.companion == "none"
    assert env.companion_action == "absent"


def test_baseline_is_not_mutated_between_calls():
    first = plan_environment("zen_garden", estimate_affect("I'm panicking"))
    second = baseline_for("zen_garden")

    assert second.wind != first.wind
    assert second.wind == WORLD_BASELINES["zen_garden"].wind

def test_next_run_is_the_coming_monday_at_nine_utc():
    now = datetime(2026, 7, 29, 12, 0)
    nxt = compute_next_run("weekly", weekday=0, hour=9, tz_offset_minutes=0, now=now)

    assert nxt == datetime(2026, 8, 3, 9, 0)
    assert nxt.weekday() == 0


def test_next_run_respects_timezone_offset():
    """09:00 must mean 09:00 where the user is, not at the server."""
    now = datetime(2026, 7, 29, 12, 0)

    nxt = compute_next_run("weekly", weekday=0, hour=9, tz_offset_minutes=330, now=now)
    local = nxt.replace() + __import__("datetime").timedelta(minutes=330)

    assert local.hour == 9
    assert local.weekday() == 0


def test_cadence_off_has_no_next_run():
    assert compute_next_run("off", 0, 9, 0, now=datetime(2026, 7, 29, 12, 0)) is None


def test_monthly_waits_the_full_interval():
    now = datetime(2026, 7, 29, 12, 0)
    last = datetime(2026, 7, 27, 9, 0)

    nxt = compute_next_run("monthly", 0, 9, 0, last_run_at=last, now=now)

    assert (nxt - last).days >= 28
    assert nxt.weekday() == 0


def test_weekly_does_not_skip_ahead_after_a_recent_run():
    now = datetime(2026, 7, 29, 12, 0)
    last = datetime(2026, 7, 27, 9, 0)

    nxt = compute_next_run("weekly", 0, 9, 0, last_run_at=last, now=now)

    assert nxt == datetime(2026, 8, 3, 9, 0)


def test_run_at_the_scheduled_hour_moves_to_next_week():
    """Exactly on the boundary must roll forward, not fire twice."""
    now = datetime(2026, 8, 3, 9, 0)
    nxt = compute_next_run("weekly", 0, 9, 0, now=now)

    assert nxt == datetime(2026, 8, 10, 9, 0)
