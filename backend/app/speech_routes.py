from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app import speech
from app.config import get_settings
from app.models import User
from app.ratelimit import limit_by_user

router = APIRouter(prefix="/api/speech", tags=["speech"])

tts_limit = limit_by_user("tts", limit=60, window_seconds=60)
stt_limit = limit_by_user("stt", limit=40, window_seconds=60)

MAX_AUDIO_BYTES = 8 * 1024 * 1024


class SpeakIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    preset: str = Field(default="boardroom", pattern="^(boardroom|halcyon|crisis)$")


@router.get("/capabilities")
def capabilities():
    settings = get_settings()
    provider = speech.active_provider()

    return {
        "server_tts": provider != "browser",
        "server_stt": bool(settings.sarvam_api_key),
        "provider": provider,
        "language": settings.voice_language,
        "fallback": "browser",
    }


@router.post("/speak")
def speak(payload: SpeakIn, current_user: User = Depends(tts_limit)):
    result = speech.synthesize(payload.text, preset=payload.preset)

    if not result:
        return {"available": False, "reason": "Server voice unavailable. Use the browser voice."}

    return {"available": True, **result}


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    current_user: User = Depends(stt_limit),
):
    audio = await file.read()

    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="That clip is too long. Keep it under 8MB.")

    result = speech.transcribe(audio, filename=file.filename or "clip.webm")

    if not result:
        return {"available": False, "transcript": "", "reason": "Server transcription unavailable."}

    return {"available": True, **result}
