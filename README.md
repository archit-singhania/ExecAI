# CEO.ai

CEO.ai is a multi-agent AI executive workspace. The user gives a business goal, and an AI CEO coordinates specialist agents for market research, finance, product, technology, marketing, legal, sales, design, and execution.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: FastAPI, LangGraph, SQLAlchemy, PostgreSQL
- Database: Neon PostgreSQL with pgvector
- Deploy: Vercel frontend, Render backend, Neon database

## Current MVP

- Executive dashboard
- AI CEO chat
- LangGraph specialist agents
- Agent reports
- Task creation and completion
- Long-term memory records
- Browser voice prompt capture
- Spoken board meeting summaries

## Run Locally

Install frontend dependencies from the repository root:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Run the backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Or run the backend from the repository root:

```bash
npm run backend:dev
```

Copy `.env.example` files before running.
