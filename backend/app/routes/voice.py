from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.services.prisma_service import transcribe_audio
from app.services.timbre_service import synthesize_speech

router = APIRouter(prefix="/api/voice", tags=["voice"])
MAX_AUDIO_BYTES = 15 * 1024 * 1024


@router.post("/transcribe")
async def transcribe(
    audio_file: UploadFile = File(...),
    language_code: str = Form(default="en-IN", max_length=40),
) -> dict:
    audio = await audio_file.read(MAX_AUDIO_BYTES + 1)
    if not audio:
        raise HTTPException(status_code=400, detail="The recording is empty. Try speaking for a little longer.")
    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Recording is too large. Please keep voice notes under 25 seconds.")
    filename = audio_file.filename or "voca-recording.wav"
    content_type = audio_file.content_type or "audio/wav"
    try:
        result = await transcribe_audio(audio, filename, content_type, language_code)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Could not reach Gnani Prisma. Check your connection and try again.") from exc
    return {
        "transcript": result.get("transcript", ""),
        "model": result.get("model", "prisma-v3.0"),
        "detected_language_code": result.get("detected_language_code"),
    }


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


@router.post("/speak")
async def speak(payload: SpeakRequest) -> Response:
    try:
        audio = await synthesize_speech(payload.text)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Could not reach Gnani Timbre. Check your connection and try again.") from exc
    return Response(content=audio, media_type="audio/wav")
