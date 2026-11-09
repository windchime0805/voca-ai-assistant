from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import initialize_database
from app.routes.voice import router as voice_router
from app.routes.tasks import router as tasks_router
from app.routes.notifications import router as notifications_router
from app.services.scheduler_service import start_scheduler, stop_scheduler

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="LuuVi API", version="0.2.0", description="LuuVi productivity API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(voice_router)
app.include_router(tasks_router)
app.include_router(notifications_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "luuvi-api"}


@app.get("/api/status")
def status() -> dict[str, object]:
    return {
        "phase": 3,
        "demo_mode": settings.demo_mode,
        "features": {
            "database_initialized": True,
            "tasks": True,
            "notifications": True,
            "reminders": True,
            "calendar": False,
            "notes": False,
            "voice": bool(settings.gnani_api_key),
            "reasoning": False,
        },
        "integrations": {
            "prisma_configured": bool(settings.gnani_api_key),
            "timbre_configured": bool(settings.gnani_api_key),
            "reasoning_configured": False,
        },
    }
