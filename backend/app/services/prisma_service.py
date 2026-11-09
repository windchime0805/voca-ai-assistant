import httpx

from app.config import get_settings

PRISMA_URL = "https://api.vachana.ai/stt/v3"


async def transcribe_audio(audio: bytes, filename: str, content_type: str, language_code: str | None = None) -> dict:
    settings = get_settings()
    if not settings.gnani_api_key:
        raise RuntimeError("Gnani speech recognition is not configured. Add GNANI_API_KEY to backend/.env and restart the backend.")

    model = settings.prisma_model or "prisma-v3.0"
    language = language_code or settings.prisma_language or "indic-auto"
    if model == "prisma-v2.5" and language == "indic-auto":
        language = "en-IN"
    data = {"model": model, "language_code": language}
    files = {"audio_file": (filename, audio, content_type or "audio/wav")}
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            PRISMA_URL,
            headers={"X-API-Key-ID": settings.gnani_api_key},
            data=data,
            files=files,
        )
    if response.is_error:
        detail = "Gnani Prisma could not transcribe this recording. Check the API key, model, language, and audio format."
        try:
            provider_error = response.json().get("error", {}).get("message")
            if provider_error and response.status_code not in (401, 403):
                detail = provider_error
        except (ValueError, AttributeError):
            pass
        raise RuntimeError(detail)
    return response.json()
