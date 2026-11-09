# LuuVi

### A calmer way to keep your day moving.

LuuVi is a personal productivity workspace for capturing tasks, planning a day, and remembering what matters. Type a task or record it by voice, then keep your plans together in a simple daily notebook.

> **Project status:** LuuVi is currently a local prototype. The demo workspace works, but account sign-in is not connected yet.

## What you can do

- **Capture tasks by voice or text.** Voice recordings are sent to the backend and transcribed with Gnani Prisma. Voice transcription is configured for English (`en-IN`).
- **Plan tasks by date and time.** Add a due date, priority, category, and reminder time.
- **See upcoming alerts.** Scheduled reminders appear in the notification panel. Browser alerts are optional and silent; in-app alerts require LuuVi to remain open.
- **Track your day.** Review daily progress, browse tasks by date, and switch between day and night themes.
- **Keep quick notes.** Notes are saved in the current browser.

## Run LuuVi locally

You’ll need Node.js 20 or newer, npm, and Python 3.11 or newer.

### 1. Configure the backend

Open a terminal in `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Open `backend/.env` and add your Gnani API key to `GNANI_API_KEY` to enable voice transcription. Keep this file private; it is ignored by Git. Never put the key in frontend code or a `VITE_` variable.

Start the API:

```powershell
uvicorn app.main:app --reload --port 8001
```

### 2. Start the frontend

In a second terminal, open `frontend/`:

```powershell
npm install
npm run dev
```

Open the local URL Vite prints, usually [http://localhost:5173](http://localhost:5173). Use **Continue to local demo** to enter the workspace.

The API health endpoint is [http://localhost:8001/api/health](http://localhost:8001/api/health), and interactive API docs are at [http://localhost:8001/docs](http://localhost:8001/docs).

## Voice and reminders

Tap the microphone to record, then tap it again to submit the recording. Allow microphone access for `localhost` in your browser. Voice transcription needs a valid `GNANI_API_KEY` in the backend environment.

Setting a task’s due time enables a reminder for that time. Keep the backend running for its scheduler. In-app alerts appear while the workspace is open; browser notifications also require permission from the notification bell.

## Configuration

The backend reads settings from `backend/.env`. The tracked `backend/.env.example` contains safe defaults and placeholders only.

| Setting | Purpose |
| --- | --- |
| `GNANI_API_KEY` | Private backend credential for Gnani voice services |
| `PRISMA_MODEL` | Speech transcription model; defaults to `prisma-v3.0` |
| `PRISMA_LANGUAGE` | Transcription language; defaults to `en-IN` |
| `DATABASE_URL` | Task database; defaults to a local SQLite file |
| `TIMEZONE` | Scheduler timezone; defaults to `Asia/Kolkata` |

The local SQLite database and virtual environment are ignored by Git.

## Project layout

```text
backend/    FastAPI API, Prisma integration, task storage, and reminder scheduler
frontend/   React + TypeScript + Vite workspace
```

## Important limitations

- Email and password fields are a visual sign-in placeholder. Use the local demo option; real account authentication is not implemented.
- General AI chat, calendar sync, and cloud note sync are not connected.
- This repository does not currently have a deployed public website. GitHub Pages can host the frontend, but the API and its secrets must run on a backend host.