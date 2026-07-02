# Architecture

```txt
Next.js Dashboard
  |
  | HTTPS
  v
FastAPI Backend
  |
  | LangGraph orchestration
  v
CEO Orchestrator
  |
  +-- Market Agent
  +-- CFO Agent
  +-- CTO Agent
  +-- Marketing Agent
  +-- Product Agent
  +-- Legal Agent
  |
  v
PostgreSQL Neon + pgvector
```

## Deployment

- Vercel hosts `frontend/`.
- Render hosts `backend/`.
- Neon hosts PostgreSQL and pgvector.

## Core Backend Modules

- `app/main.py`: FastAPI app entrypoint.
- `app/api/routes.py`: API routes.
- `app/agents/graph.py`: LangGraph orchestration.
- `app/db/models.py`: SQLAlchemy models.
- `app/db/session.py`: database session setup.
- `app/schemas.py`: request and response contracts.
