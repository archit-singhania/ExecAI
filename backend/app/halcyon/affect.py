"""Affect estimation with zero dependencies and zero cost.

A lexicon is crude next to a trained classifier, but it is instant, offline,
free, deterministic, and completely inspectable — which is exactly what you
want in a prototype where you are still deciding what the world should do.

Swap in a real model later behind `estimate_affect`; the return type is the
only thing the planner knows about.
"""

import re

from app.halcyon.schemas import AffectReading

LEXICON: dict[str, tuple[float, float, tuple[str, ...]]] = {
    "anxious": (
        -0.5,
        0.85,
        ("anxious", "anxiety", "panic", "panicking", "nervous", "worried", "worry", "scared",
         "afraid", "dread", "on edge", "restless", "racing", "spiralling", "spiraling", "stressed",
         "stress", "overwhelmed", "can't stop", "cant stop", "freaking out"),
    ),
    "low": (
        -0.7,
        0.2,
        ("sad", "down", "low", "empty", "hopeless", "heavy", "hurting", "grief", "grieving",
         "lonely", "alone", "crying", "cried", "miserable", "numb", "worthless", "defeated"),
    ),
    "exhausted": (
        -0.35,
        0.12,
        ("tired", "exhausted", "drained", "burnt out", "burned out", "burnout", "no energy",
         "can't keep", "cant keep", "running on empty", "wiped", "shattered", "knackered"),
    ),
    "angry": (
        -0.45,
        0.9,
        ("angry", "furious", "raging", "rage", "pissed", "frustrated", "frustrating", "sick of",
         "fed up", "resentful", "bitter", "hate"),
    ),
    "calm": (
        0.45,
        0.2,
        ("calm", "calmer", "settled", "peaceful", "quiet", "still", "steady", "relaxed", "okay",
         "alright", "better", "fine now", "grounded"),
    ),
    "hopeful": (
        0.7,
        0.5,
        ("hopeful", "excited", "good", "great", "happy", "grateful", "thankful", "proud",
         "relieved", "optimistic", "looking forward", "clear"),
    ),
}

CRISIS_TERMS: tuple[str, ...] = (
    "kill myself", "killing myself", "kill my self",
    "end my life", "ending my life", "ended my life",
    "take my own life", "taking my own life",
    "end it all", "ending it all",
    "want to die", "wanna die", "want to be dead",
    "wish i was dead", "wish i were dead",
    "suicidal", "suicide",
    "hurt myself", "hurting myself",
    "harm myself", "harming myself",
    "self harm", "self-harm", "selfharm",
    "cut myself", "cutting myself",
    "no reason to live", "nothing to live for",
    "better off dead", "better off without me",
    "don't want to be here anymore", "dont want to be here anymore",
    "don't want to wake up", "dont want to wake up",
)
"""High recall by design.

A false positive costs one gentle, slightly off-target reply. A false
negative means the world responds to someone in danger by adjusting the
weather. Those costs are not comparable, so inflected variants are listed
explicitly rather than stemmed, and this list should only ever grow.
"""


def _normalise(text: str) -> str:
    lowered = text.lower()
    return re.sub(r"[^a-z0-9'\s-]", " ", lowered)


def detect_crisis(text: str) -> bool:
    """Cheap, high-recall check. Deliberately errs toward false positives.

    A hit here must bypass the environment planner entirely — a world that
    responds to this by prettifying the weather would be grotesque.
    """
    haystack = _normalise(text)
    return any(term in haystack for term in CRISIS_TERMS)


def estimate_affect(text: str) -> AffectReading:
    haystack = _normalise(text)
    padded = f" {haystack} "

    scores: dict[str, list[str]] = {}
    for label, (_, _, terms) in LEXICON.items():
        hits = [term for term in terms if f" {term} " in padded or term in haystack]
        if hits:
            scores[label] = hits

    if not scores:
        return AffectReading(label="neutral", valence=0.0, arousal=0.4, confidence=0.2)

    label = max(scores, key=lambda key: len(scores[key]))
    valence, arousal, _ = LEXICON[label]
    hits = scores[label]

    confidence = min(0.85, 0.35 + 0.18 * len(hits))

    if re.search(r"\b(not|isn't|aren't|don't|didn't|never)\b", haystack):
        valence *= 0.4
        confidence *= 0.7

    return AffectReading(
        label=label,
        valence=round(valence, 3),
        arousal=round(arousal, 3),
        confidence=round(confidence, 3),
        matched=hits[:6],
    )
