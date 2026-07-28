"""Crisis handling.

Two things were wrong with treating a crisis as a single-turn event.

First, the session forgot. A crisis turn was handled carefully and then the
next message went straight back to mood-driven planning \u2014 so someone could
say something serious, get a careful reply, say "sorry, ignore that", and the
world would cheerfully warm the light and send a dog over. Once a session has
touched this, it stays careful for the rest of it. There is no un-flagging.

Second, the reply told people to contact emergency services without giving
them any way to do that. A referral with no destination is not a referral.

Resources deliberately are not hardcoded numbers. Helpline numbers change,
vary by country, and a wrong number here is worse than no number. The default
is an international directory that stays current; operators should add their
own jurisdiction in settings.
"""

from pydantic import BaseModel

from app.halcyon.schemas import EnvironmentCommand
from app.halcyon.worlds import baseline_for


class CrisisResource(BaseModel):
    label: str
    detail: str
    url: str | None = None


DEFAULT_RESOURCES: list[CrisisResource] = [
    CrisisResource(
        label="Find a helpline",
        detail="A directory of free, confidential support lines in almost every country.",
        url="https://findahelpline.com",
    ),
    CrisisResource(
        label="Emergency services",
        detail="If you are in immediate danger, call your local emergency number now.",
    ),
]
"""Replace or extend for your jurisdiction before this goes near real users.

An operator running in one country should list that country's line first.
The directory is the safe default precisely because it does not require us
to guess where someone is.
"""


FIRST_CRISIS_REPLY = (
    "I'm going to stop the world here, because what you just said matters more than "
    "the weather. I'm not able to help with this the way you deserve \u2014 but people who can "
    "are reachable right now, and they are used to exactly this conversation. "
    "You're welcome to stay here as long as you like. Please talk to one of them too."
)

CONTINUED_REPLY = (
    "The world is staying still. There's no hurry here, and nothing you have to do. "
    "The people on that line are still there whenever you want them."
)


def hold_environment(world: str, first_time: bool) -> EnvironmentCommand:
    """A world that has stopped performing.

    No mood inference, no invitations, no companion, no music. Not dark and
    not brightened either \u2014 either would be the environment editorialising
    about someone's state, and it has no business doing that here.
    """
    env = baseline_for(world)

    env.wind = 0.04
    env.water_motion = 0.04
    env.fog = min(env.fog, 0.2)
    env.brightness = 0.5
    env.warmth = 0.5
    env.bloom = 0.2

    env.music = "none"
    env.music_volume = 0.0
    env.ambience_volume = round(env.ambience_volume * 0.35, 3)

    env.companion = "none"
    env.companion_action = "absent"

    env.invitation = "none"
    env.invitation_label = ""

    env.breathing_guide = False

    env.transition_seconds = 4.0 if first_time else 8.0
    env.reason = "crisis_hold" if first_time else "crisis_continued"
    return env


def reply_for(first_time: bool) -> str:
    return FIRST_CRISIS_REPLY if first_time else CONTINUED_REPLY


def resources() -> list[CrisisResource]:
    return list(DEFAULT_RESOURCES)
