import httpx

from app.config import get_settings

TIMBRE_URL = "https://api.vachana.ai/api/v1/tts/inference"


async def synthesize_speech(text: str) -> bytes:
    settings = get_settings()
    if not settings.gnani_api_key:
        raise RuntimeError("Gnani speech generation is not configured. Add GNANI_API_KEY to backend/.env and restart the backend.")
    payload = {
        "text": text,
        "model": settings.timbre_model or "timbre-v2.5",
        "voice": settings.timbre_voice,
        "language": settings.timbre_language,
        "audio_config": {
            "encoding": "linear_pcm",
            "container": "wav",
            "num_channels": 1,
            "sample_rate": 24000,
            "sample_width": 2,
        },
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            TIMBRE_URL,
            headers={"X-API-Key-ID": settings.gnani_api_key},
            json=payload,
        )
    if response.is_error:
        raise RuntimeError("Gnani Timbre could not generate audio. Check the configured model and voice.")
    return response.content
