"""Where a session is going, not just where it is.

Every turn so far has been judged in isolation: you say something, the world
responds. But a person who has been getting steadily worse across five turns
is in a different situation from someone who says one hard thing and settles.

The response to escalation here is counter-intuitive and deliberate: the
world does *less*, not more. A place that keeps dramatically rearranging
itself in response to someone spiralling is amplifying the spiral \u2014 it reads
as the environment becoming as agitated as you are. Escalation should make
the world slower, quieter and more constant, and should stop it suggesting
things. Stillness is the response, not effort.
"""

from typing import Literal

from pydantic import BaseModel, Field

from app.halcyon.schemas import AffectReading, EnvironmentCommand

Trajectory = Literal["unknown", "settling", "holding", "escalating"]


class ArcReading(BaseModel):
    trajectory: Trajectory = "unknown"
    turns: int = 0
    distress_now: float = Field(default=0.0, ge=0.0, le=1.0)
    distress_delta: float = 0.0


def distress_of(reading: AffectReading) -> float:
    """How hard a moment looks, 0..1.

    Negative valence is the bulk of it, with arousal adding weight \u2014 panic
    and flat despair are both hard, but panic is louder and the world should
    treat it as such.
    """
    negative = max(0.0, -reading.valence)
    return min(1.0, negative * (0.6 + 0.4 * reading.arousal))


def compute_arc(history: list[AffectReading]) -> ArcReading:
    """Read the shape of a session from its affect history, oldest first."""
    if len(history) < 3:
        return ArcReading(
            trajectory="unknown",
            turns=len(history),
            distress_now=distress_of(history[-1]) if history else 0.0,
        )

    scores = [distress_of(reading) for reading in history]

    split = max(1, len(scores) // 2)
    earlier = sum(scores[:split]) / split
    recent = sum(scores[split:]) / (len(scores) - split)

    delta = recent - earlier

    if delta > 0.12:
        trajectory: Trajectory = "escalating"
    elif delta < -0.12:
        trajectory = "settling"
    else:
        trajectory = "holding"

    return ArcReading(
        trajectory=trajectory,
        turns=len(history),
        distress_now=round(scores[-1], 3),
        distress_delta=round(delta, 3),
    )


def apply_arc(env: EnvironmentCommand, arc: ArcReading) -> EnvironmentCommand:
    """Temper the planned environment with the shape of the session."""
    if arc.trajectory == "escalating":
        env.transition_seconds = min(45.0, env.transition_seconds * 1.8)
        env.invitation = "none"
        env.invitation_label = ""
        env.music_volume = round(env.music_volume * 0.5, 3)
        env.ambience_volume = round(env.ambience_volume * 0.8, 3)
        env.breathing_guide = True
        env.breathing_pace_seconds = min(7.0, env.breathing_pace_seconds + 0.5)

        if env.companion_action == "approach":
            env.companion_action = "settle"

        env.reason = f"{env.reason}|arc:escalating"

    elif arc.trajectory == "settling":
        env.transition_seconds = max(4.0, env.transition_seconds * 0.85)
        env.reason = f"{env.reason}|arc:settling"

    elif arc.trajectory == "holding" and arc.distress_now > 0.45:
        env.invitation = "none"
        env.invitation_label = ""
        env.reason = f"{env.reason}|arc:holding"

    return env
