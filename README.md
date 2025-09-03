# ChatStack

A full‑stack chat application with Google OAuth, conversation history, system prompts, and OpenAI model selection. The backend is built with FastAPI and MongoDB; the frontend is a Next.js app.

## Features

- Chat with streaming responses (SSE)
- Conversation history with titles and timestamps
- Per‑user system prompt management
- OpenAI model selection
- CORS and security headers configured for dev/prod
- Google OAuth login with secure HttpOnly cookies and PKCE

## Tech Stack
- Backend: FastAPI, Uvicorn, Pydantic, python-jose, Google OAuth, MongoDB (PyMongo)
- AI: LangChain, langchain-openai, langgraph, langchain-community
- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS 4

## Monorepo Layout
- `backend/`: FastAPI app, services, repositories, schemas
- `frontend/`: Next.js app, UI, hooks, and services

## Prerequisites
- Node.js 20+
- Python 3.10+
- MongoDB (local or hosted)
- Google OAuth 2.0 Client (Web) credentials
- OpenAI API key

## Environment Variables
Create `.env` files in both `backend/` and `frontend/` (or a shared root .env if you prefer) with the following.

Backend `.env` (at `backend/.env`):
- `ENVIRONMENT` = development | production
- `BASE_URL` = http://localhost:8000
- `FRONTEND_URL` = http://localhost:3000
- `ALLOWED_ORIGINS` = http://localhost:3000
- `OPENAI_API_KEY` = your_openai_api_key
- `GOOGLE_CLIENT_ID` = your_google_client_id
- `GOOGLE_CLIENT_SECRET` = your_google_client_secret
- `JWT_SECRET` = random_long_secret
- `MONGO_URI` = mongodb://localhost:27017 (or your Atlas URI)
- `MONGO_DB_NAME` = chatstack

Frontend `.env.local` (at `frontend/.env.local`):
- `NEXT_PUBLIC_API_URL` = http://localhost:8000

Notes:
- In production, set `ENVIRONMENT=production`. Cookies will be `secure` with `SameSite=None`. Update `ALLOWED_ORIGINS` to include your web origin(s).
- Ensure `BASE_URL` and `FRONTEND_URL` match your actual deployed URLs.

## Install and Run (Development)

Backend:
1. Create a Python virtualenv (recommended)
2. Install dependencies
3. Run FastAPI server

Commands:
```bash
# from repo root
cd backend
python -m venv venv
# Windows PowerShell
./venv/Scripts/Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:
1. Install dependencies
2. Run Next.js dev server

Commands:
```bash
# from repo root
cd frontend
npm install
npm run dev
```

App URLs (dev):
- Frontend: http://localhost:3000
- API: http://localhost:8000/api


## Scripts
Frontend:
- `npm run dev` → Next dev server
- `npm run build` → Next build
- `npm start` → Next start

Backend:
- `uvicorn main:app --reload` → Dev server

## License
MIT 