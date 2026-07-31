"""Voice synthesis and transcription.

Provider-agnostic by design. Sarvam is the current backend; ElevenLabs and
Azure are stubbed with the same interface so switching to a British or Irish
voice later is an environment variable, not a refactor.

Every function returns None rather than raising. A voice failure must never
break the turn that triggered it — the browser voice picks up.
"""

import base64
from typing import Protocol

import httpx

from app.config import get_settings

TIMEOUT = 25.0

SARVAM_TTS = "https://api.sarvam.ai/text-to-speech"
SARVAM_STT = "https://api.sarvam.ai/speech-to-text"
ELEVEN_TTS = "https://api.elevenlabs.io/v1/text-to-speech"
AZURE_TTS_PATH = "/cognitiveservices/v1"


class VoiceStyle(Protocol):
    speaker: str
    pace: float
    pitch: float
    loudness: float


PRESETS: dict[str, dict[str, float | str]] = {
    "boardroom": {"speaker": "arjun", "pace": 0.96, "pitch": 0.0, "loudness": 1.0},
    "halcyon": {"speaker": "amelia", "pace": 0.82, "pitch": -0.06, "loudness": 0.85},
    "crisis": {"speaker": "amelia", "pace": 0.72, "pitch": -0.1, "loudness": 0.78},
}
"""Sarvam speakers.

`amelia` and `sophia` read closest to neutral English of Sarvam's library;
`arjun` is the authoritative option and suits board verdicts. When you move to
a British or Irish voice, only ELEVEN_VOICES or AZURE_VOICES below need values.
"""

ELEVEN_VOICES: dict[str, str] = {
    "boardroom": "",
    "halcyon": "",
    "crisis": "",
}
"""ElevenLabs voice IDs. Their British library is the natural home for
Halcyon — look for a low, unhurried RP voice rather than a newsreader."""

AZURE_VOICES: dict[str, str] = {
    "boardroom": "en-GB-RyanNeural",
    "halcyon": "en-GB-SoniaNeural",
    "crisis": "en-IE-EmilyNeural",
}
"""Azure neural voices. en-GB-* are British, en-IE-* Irish. Free tier covers
0.5M characters a month, which is generous for this workload."""


def active_provider() -> str:
    settings = get_settings()
    configured = (settings.voice_provider or "sarvam").lower()

    if configured == "elevenlabs" and settings.elevenlabs_api_key:
        return "elevenlabs"
    if configured == "azure" and settings.azure_speech_key:
        return "azure"
    if configured == "sarvam" and settings.sarvam_api_key:
        return "sarvam"

    return "browser"


def is_configured() -> bool:
    return active_provider() != "browser"


def _style(preset: str) -> dict[str, float | str]:
    return PRESETS.get(preset, PRESETS["boardroom"])


def _sarvam_speak(text: str, preset: str) -> dict | None:
    settings = get_settings()
    style = _style(preset)

    payload = {
        "inputs": [text[:1500]],
        "target_language_code": settings.voice_language,
        "speaker": style["speaker"],
        "pitch": style["pitch"],
        "pace": style["pace"],
        "loudness": style["loudness"],
        "speech_sample_rate": 22050,
        "enable_preprocessing": True,
        "model": settings.sarvam_model,
    }

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            response = client.post(
                SARVAM_TTS,
                json=payload,
                headers={
                    "api-subscription-key": settings.sarvam_api_key or "",
                    "Content-Type": "application/json",
                },
            )
            if response.status_code >= 400:
                print(f"[voice] Sarvam TTS {response.status_code}: {response.text[:220]}")
                return None
            audios = response.json().get("audios") or []
    except Exception as exc:
        print(f"[voice] Sarvam TTS failed: {exc}")
        return None

    if not audios:
        return None

    return {
        "audio_base64": audios[0],
        "mime_type": "audio/wav",
        "voice": str(style["speaker"]),
        "provider": "sarvam",
    }


def _eleven_speak(text: str, preset: str) -> dict | None:
    settings = get_settings()
    voice_id = ELEVEN_VOICES.get(preset) or ELEVEN_VOICES.get("boardroom")

    if not voice_id:
        print("[voice] ElevenLabs selected but no voice ID set for that preset.")
        return None

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            response = client.post(
                f"{ELEVEN_TTS}/{voice_id}",
                json={
                    "text": text[:2500],
                    "model_id": "eleven_turbo_v2_5",
                    "voice_settings": {
                        "stability": 0.55 if preset == "boardroom" else 0.75,
                        "similarity_boost": 0.75,
                        "speed": 1.0 if preset == "boardroom" else 0.85,
                    },
                },
                headers={"xi-api-key": settings.elevenlabs_api_key or ""},
            )
            if response.status_code >= 400:
                print(f"[voice] ElevenLabs {response.status_code}: {response.text[:220]}")
                return None
            audio = response.content
    except Exception as exc:
        print(f"[voice] ElevenLabs failed: {exc}")
        return None

    return {
        "audio_base64": base64.b64encode(audio).decode(),
        "mime_type": "audio/mpeg",
        "voice": voice_id,
        "provider": "elevenlabs",
    }


def _azure_speak(text: str, preset: str) -> dict | None:
    settings = get_settings()
    voice = AZURE_VOICES.get(preset, AZURE_VOICES["boardroom"])
    region = settings.azure_speech_region

    rate = "0%" if preset == "boardroom" else "-12%"
    pitch = "0%" if preset == "boardroom" else "-4%"

    ssml = (
        f"<speak version='1.0' xml:lang='en-GB'>"
        f"<voice name='{voice}'>"
        f"<prosody rate='{rate}' pitch='{pitch}'>{text[:3000]}</prosody>"
        f"</voice></speak>"
    )

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            response = client.post(
                f"https://{region}.tts.speech.microsoft.com{AZURE_TTS_PATH}",
                content=ssml.encode("utf-8"),
                headers={
                    "Ocp-Apim-Subscription-Key": settings.azure_speech_key or "",
                    "Content-Type": "application/ssml+xml",
                    "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
                },
            )
            if response.status_code >= 400:
                print(f"[voice] Azure {response.status_code}: {response.text[:220]}")
                return None
            audio = response.content
    except Exception as exc:
        print(f"[voice] Azure failed: {exc}")
        return None

    return {
        "audio_base64": base64.b64encode(audio).decode(),
        "mime_type": "audio/mpeg",
        "voice": voice,
        "provider": "azure",
    }


def synthesize(text: str, preset: str = "boardroom") -> dict | None:
    cleaned = text.strip()
    if not cleaned:
        return None

    provider = active_provider()

    if provider == "sarvam":
        return _sarvam_speak(cleaned, preset)
    if provider == "elevenlabs":
        return _eleven_speak(cleaned, preset)
    if provider == "azure":
        return _azure_speak(cleaned, preset)

    return None


def transcribe(audio_bytes: bytes, filename: str = "clip.webm") -> dict | None:
    settings = get_settings()

    if not audio_bytes or not settings.sarvam_api_key:
        return None

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            response = client.post(
                SARVAM_STT,
                files={"file": (filename, audio_bytes, "audio/webm")},
                data={"model": "saarika:v2", "language_code": settings.voice_language},
                headers={"api-subscription-key": settings.sarvam_api_key},
            )
            if response.status_code >= 400:
                print(f"[voice] Sarvam STT {response.status_code}: {response.text[:220]}")
                return None
            body = response.json()
    except Exception as exc:
        print(f"[voice] Sarvam STT failed: {exc}")
        return None

    transcript = (body.get("transcript") or "").strip()
    if not transcript:
        return None

    return {
        "transcript": transcript,
        "language_code": body.get("language_code") or settings.voice_language,
        "provider": "sarvam",
    }
