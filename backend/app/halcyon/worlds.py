"""Per-world baselines.

Each world has a resting state and a small vocabulary of things it can do.
The planner nudges away from the baseline; it never invents a companion the
world doesn't have or an ambience that would make no sense there.
"""

from app.halcyon.schemas import EnvironmentCommand

WORLD_BASELINES: dict[str, EnvironmentCommand] = {
    "zen_garden": EnvironmentCommand(
        world="zen_garden", time_of_day=16.0, weather="clear", wind=0.2, water_motion=0.25,
        fog=0.15, brightness=0.62, warmth=0.55, bloom=0.3,
        ambience="water_trickle", ambience_volume=0.45, music="none",
        companion="koi", companion_action="distant", transition_seconds=6.0,
    ),
    "ocean_dusk": EnvironmentCommand(
        world="ocean_dusk", time_of_day=19.2, weather="clear", wind=0.4, water_motion=0.5,
        fog=0.18, brightness=0.5, warmth=0.75, bloom=0.45,
        ambience="surf", ambience_volume=0.55, music="none",
        companion="sea_turtle", companion_action="distant", transition_seconds=7.0,
    ),
    "old_forest": EnvironmentCommand(
        world="old_forest", time_of_day=10.5, weather="mist", wind=0.25, water_motion=0.2,
        fog=0.4, brightness=0.45, warmth=0.45, bloom=0.25,
        ambience="birdsong", ambience_volume=0.5, music="none",
        companion="deer", companion_action="distant", transition_seconds=6.5,
    ),
    "rain_cabin": EnvironmentCommand(
        world="rain_cabin", time_of_day=20.5, weather="rain", wind=0.35, water_motion=0.15,
        fog=0.25, brightness=0.35, warmth=0.8, bloom=0.35,
        ambience="rain_on_glass", ambience_volume=0.6, music="none",
        companion="cat", companion_action="settle", transition_seconds=5.0,
    ),
    "nordic_lake": EnvironmentCommand(
        world="nordic_lake", time_of_day=5.5, weather="mist", wind=0.15, water_motion=0.12,
        fog=0.45, brightness=0.5, warmth=0.4, bloom=0.3,
        ambience="silence", ambience_volume=0.25, music="none",
        companion="none", companion_action="absent", transition_seconds=8.0,
    ),
    "blossom_park": EnvironmentCommand(
        world="blossom_park", time_of_day=15.0, weather="clear", wind=0.3, water_motion=0.2,
        fog=0.1, brightness=0.7, warmth=0.65, bloom=0.5,
        ambience="birdsong", ambience_volume=0.45, music="none",
        companion="dog", companion_action="distant", transition_seconds=6.0,
    ),
    "desert_oasis": EnvironmentCommand(
        world="desert_oasis", time_of_day=18.0, weather="clear", wind=0.35, water_motion=0.2,
        fog=0.08, brightness=0.6, warmth=0.85, bloom=0.4,
        ambience="wind_in_pines", ambience_volume=0.4, music="none",
        companion="none", companion_action="absent", transition_seconds=7.0,
    ),
    "observatory": EnvironmentCommand(
        world="observatory", time_of_day=23.0, weather="clear", wind=0.1, water_motion=0.0,
        fog=0.12, brightness=0.2, warmth=0.3, bloom=0.6,
        ambience="night_insects", ambience_volume=0.3, music="low_drone",
        companion="monk", companion_action="distant", transition_seconds=9.0,
    ),
}

DEFAULT_WORLD = "zen_garden"


def baseline_for(world: str) -> EnvironmentCommand:
    return WORLD_BASELINES.get(world, WORLD_BASELINES[DEFAULT_WORLD]).model_copy(deep=True)
