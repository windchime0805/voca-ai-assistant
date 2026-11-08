# Voca — Your Personal AI Productivity Assistant

Voca is a voice-first productivity assistant with Prisma speech recognition, persistent tasks, and quiet scheduled notifications. General reasoning, calendar, and notes remain future phases.

## Requirements

- Node.js 20+ and npm
- Python 3.11+

## Run locally

Backend (from `backend/`):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8001
```

Frontend (from `frontend/` in a second terminal):

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal. API health is at `http://localhost:8001/api/health`; interactive API docs are at `/docs`.

## Current functionality

- React + TypeScript + Vite dashboard with responsive layout, voice capture, daily task progress, and day/night/success themes.
- FastAPI task CRUD API with SQLite persistence, priorities, categories, due dates, and completion status.
- Prisma voice transcription routed through FastAPI; voice tasks are saved in the recognized language and can be cancelled from the input box.
- APScheduler-backed task notifications persist and recover after backend restarts. Browser notifications are silent by default; in-app notifications appear while Voca is open, and unread alerts remain available when it is reopened.
- Task due times can set notification times automatically; the task form also lets you choose a separate notification time.
- Timbre speech-generation endpoint and health/configuration status endpoints.
- SQLAlchemy engine with SQLite initialization and a PostgreSQL-ready URL configuration.
- Environment-based configuration and placeholder-only `.env.example`.

## Next phases

Next add the reasoning provider abstraction and controlled agent tools, calendar, and notes. Live Gnani speech requests require the user's configured key and are not run by the production build.
