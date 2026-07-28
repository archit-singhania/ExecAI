"""The contract between the planner and Unreal.

This schema is the stable interface. Unreal reads these fields and nothing
else, so the planner can get smarter (rules today, LLM later) without
touching a single Blueprint.

All continuous values are normalised 0..1 unless noted, so Unreal can lerp
them directly onto material and post-process parameters.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

WorldId = Literal[
    "zen_garden",
    "ocean_dusk",
    "old_forest",
    "rain_cabin",
    "nordic_lake",
    "blossom_park",
    "desert_oasis",
    "observatory",
]

Weather = Literal["clear", "overcast", "mist", "light_rain", "rain", "snow"]
Ambience = Literal["silence", "birdsong", "surf", "rain_on_glass", "wind_in_pines", "water_trickle", "night_insects"]
Music = Literal["none", "soft_piano", "low_drone", "warm_strings"]
Companion = Literal["none", "dog", "cat", "deer", "sea_turtle", "koi", "monk"]
CompanionAction = Literal["absent", "distant", "approach", "settle", "lead"]


class AffectReading(BaseModel):
    """Where the user seems to be, as far as we can tell from words alone."""

    label: str = "neutral"
    valence: float = Field(default=0.0, ge=-1.0, le=1.0)
    arousal: float = Field(default=0.4, ge=0.0, le=1.0)
    confidence: float = Field(default=0.3, ge=0.0, le=1.0)
    matched: list[str] = Field(default_factory=list)


class EnvironmentCommand(BaseModel):
    """One complete description of how the world should be.

    Unreal receives this as a whole and interpolates from its current state
    over `transition_seconds`. Never send partial states — a full snapshot
    every time keeps the client stateless and makes reconnects trivial.
    """

    world: WorldId = "zen_garden"
    time_of_day: float = Field(default=17.5, ge=0.0, le=24.0)
    weather: Weather = "clear"

    wind: float = Field(default=0.3, ge=0.0, le=1.0)
    water_motion: float = Field(default=0.3, ge=0.0, le=1.0)
    fog: float = Field(default=0.2, ge=0.0, le=1.0)
    brightness: float = Field(default=0.6, ge=0.0, le=1.0)
    warmth: float = Field(default=0.5, ge=0.0, le=1.0)
    bloom: float = Field(default=0.3, ge=0.0, le=1.0)

    ambience: Ambience = "birdsong"
    ambience_volume: float = Field(default=0.5, ge=0.0, le=1.0)
    music: Music = "none"
    music_volume: float = Field(default=0.3, ge=0.0, le=1.0)

    companion: Companion = "none"
    companion_action: CompanionAction = "absent"

    breathing_guide: bool = False
    breathing_pace_seconds: float = Field(default=5.5, ge=3.0, le=8.0)

    transition_seconds: float = Field(default=6.0, ge=0.0, le=60.0)
    reason: str = ""


class TurnIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    world: WorldId | None = None


class TurnOut(BaseModel):
    reply: str
    affect: AffectReading
    environment: EnvironmentCommand
    turn_index: int


class HalcyonSessionOut(BaseModel):
    id: str
    world: WorldId
    started_at: datetime
    ended_at: datetime | None = None
    turn_count: int = 0
    environment: EnvironmentCommand | None = None

    model_config = {"from_attributes": True}


class SessionStartIn(BaseModel):
    world: WorldId = "zen_garden"
    consent_to_store: bool = False
