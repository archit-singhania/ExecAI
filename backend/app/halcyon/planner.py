"""The planner: affect in, world out.

Two rules govern everything here.

1. The world responds; it does not advise. Replies are short, concrete, and
   about the place. No coaching, no reframing, no "have you tried".
2. Distress lowers the energy of the world rather than brightening it. The
   instinct to make things sunny when someone is struggling is wrong; what
   helps is less input, not more stimulus.
"""

import random

from app.halcyon.schemas import AffectReading, EnvironmentCommand
from app.halcyon.worlds import baseline_for


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return round(max(low, min(high, value)), 3)


REPLIES: dict[str, tuple[str, ...]] = {
    "anxious": (
        "The wind drops. The water goes flat. Nothing here needs anything from you.",
        "Everything slows down a little. Stay as long as you want.",
        "The air goes still. There's no hurry in this place.",
    ),
    "angry": (
        "The wind drops off. The light stops moving. You can put it down here.",
        "Everything goes quiet. Nothing is going to argue with you.",
    ),
    "low": (
        "It's early here. The light is coming up slowly, and something small has come to sit nearby.",
        "The sky warms a little. You don't have to do anything with that.",
        "Dawn arrives early in this place. It isn't asking you to feel better.",
    ),
    "exhausted": (
        "The light goes soft. There's somewhere to sit, and nothing after this.",
        "Everything dims down to almost nothing. Rest is the whole activity.",
    ),
    "calm": (
        "The place holds where it is. Clear sky, steady water.",
        "Nothing changes. It's good here.",
    ),
    "hopeful": (
        "The sky opens right up. Long view from here.",
        "The light lifts and stays lifted.",
    ),
    "neutral": (
        "The world settles around you. Take your time.",
        "It's quiet here. You can start wherever you like.",
    ),
}

CRISIS_REPLY = (
    "I'm going to stop the world here for a second, because what you said matters more than "
    "the weather. I'm not able to help with this the way you deserve — please reach out to "
    "someone who can. If you're in immediate danger, contact your local emergency number. "
    "You can stay in this place as long as you want, but please talk to a real person too."
)

INVITATIONS: dict[str, tuple[str, str]] = {
    "anxious": ("sit", "There's somewhere to sit, just there."),
    "angry": ("water_edge", "The water's edge is a few steps away."),
    "low": ("sit", "Somewhere to sit has appeared, if you want it."),
    "exhausted": ("shelter", "There's shelter, and nothing after this."),
    "hopeful": ("overlook", "There's a longer view from up there."),
}
"""Where the world would like you to go, by mood.

Calm and neutral are absent on purpose. Someone who is fine does not need to
be sent anywhere, and a world that constantly suggests things is a world that
wants something from you.
"""

WORLD_PLACES: dict[str, set[str]] = {
    "zen_garden": {"sit", "water_edge", "shelter", "path"},
    "ocean_dusk": {"sit", "water_edge", "overlook", "path"},
    "old_forest": {"sit", "water_edge", "shelter", "path"},
    "rain_cabin": {"sit", "shelter"},
    "nordic_lake": {"sit", "water_edge", "overlook"},
    "blossom_park": {"sit", "shelter", "path"},
    "desert_oasis": {"sit", "water_edge", "shelter", "overlook"},
    "observatory": {"sit", "overlook", "shelter"},
}
"""What each world actually contains. The planner never invites you somewhere
that doesn't exist — an invitation you can't accept is worse than silence."""


def plan_crisis_environment(world: str) -> EnvironmentCommand:
    """Neutral, still, non-manipulative. The world stops performing."""
    env = baseline_for(world)
    env.wind = 0.05
    env.water_motion = 0.05
    env.music = "none"
    env.music_volume = 0.0
    env.ambience_volume = _clamp(env.ambience_volume * 0.4)
    env.breathing_guide = False
    env.companion_action = "absent"
    env.companion = "none"
    env.invitation = "none"
    env.invitation_label = ""
    env.transition_seconds = 4.0
    env.reason = "crisis_hold"
    return env


def choose_invitation(world: str, label: str) -> tuple[str, str]:
    """Pick somewhere to suggest, or nothing at all."""
    proposal = INVITATIONS.get(label)
    if not proposal:
        return "none", ""

    place, text = proposal
    if place not in WORLD_PLACES.get(world, set()):
        return "none", ""

    return place, text


def plan_environment(world: str, affect: AffectReading) -> EnvironmentCommand:
    env = baseline_for(world)
    label = affect.label

    if label in {"anxious", "angry"}:
        # High arousal, negative. Strip stimulus out of the scene.
        env.wind = _clamp(env.wind * 0.25)
        env.water_motion = _clamp(env.water_motion * 0.3)
        env.fog = _clamp(env.fog + 0.1)
        env.brightness = _clamp(env.brightness * 0.9)
        env.warmth = _clamp(env.warmth + 0.08)
        env.bloom = _clamp(env.bloom * 0.8)
        env.ambience_volume = _clamp(env.ambience_volume * 0.55)
        env.music = "low_drone" if label == "anxious" else "none"
        env.music_volume = 0.18 if label == "anxious" else 0.0
        env.weather = "clear" if env.weather in {"rain", "light_rain"} else env.weather
        env.breathing_guide = True
        env.breathing_pace_seconds = 6.0
        env.companion_action = "settle" if env.companion != "none" else "absent"
        env.transition_seconds = 12.0

    elif label in {"low", "exhausted"}:
        # Low arousal, negative. Warmth and company, not brightness.
        env.time_of_day = 6.2 if label == "low" else env.time_of_day
        env.warmth = _clamp(env.warmth + 0.18)
        env.brightness = _clamp(env.brightness + (0.12 if label == "low" else -0.1))
        env.bloom = _clamp(env.bloom + 0.12)
        env.wind = _clamp(env.wind * 0.5)
        env.water_motion = _clamp(env.water_motion * 0.6)
        env.fog = _clamp(env.fog - 0.05)
        env.music = "warm_strings" if label == "low" else "soft_piano"
        env.music_volume = 0.22
        env.ambience_volume = _clamp(env.ambience_volume * 0.7)
        env.breathing_guide = label == "exhausted"
        env.companion_action = "approach" if env.companion != "none" else "absent"
        env.transition_seconds = 14.0

    elif label == "calm":
        env.wind = _clamp(env.wind * 0.8)
        env.water_motion = _clamp(env.water_motion * 0.8)
        env.companion_action = "settle" if env.companion != "none" else "absent"
        env.transition_seconds = 8.0

    elif label == "hopeful":
        env.fog = _clamp(env.fog * 0.5)
        env.brightness = _clamp(env.brightness + 0.15)
        env.bloom = _clamp(env.bloom + 0.1)
        env.weather = "clear"
        env.companion_action = "lead" if env.companion != "none" else "absent"
        env.transition_seconds = 7.0

    env.reason = f"{label}:v{affect.valence}:a{affect.arousal}"
    env.invitation, env.invitation_label = choose_invitation(world, label)
    return env


def compose_reply(affect: AffectReading, seed: int | None = None) -> str:
    options = REPLIES.get(affect.label, REPLIES["neutral"])
    rng = random.Random(seed)
    return rng.choice(options)
