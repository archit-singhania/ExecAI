# CEO.ai Build Phases

## Phase 0: Foundation

Goal: Create a clean monorepo that can deploy to Vercel, Render, and Neon.

Steps:

1. Build `frontend/` with Next.js, TypeScript, Tailwind CSS, and a premium SaaS dashboard.
2. Build `backend/` with FastAPI, SQLAlchemy, Alembic, Pydantic, and LangGraph.
3. Add environment examples for frontend and backend.
4. Add deployment files for Vercel and Render.
5. Add docs for architecture and phased delivery.

## Phase 1: AI CEO Chat MVP

Goal: Let a user start a business session and speak with an AI CEO.

Steps:

1. Create session APIs.
2. Create message APIs.
3. Store conversation history in PostgreSQL.
4. Add CEO response endpoint.
5. Show chat, recommendations, health score, tasks, and agent activity in the dashboard.

## Phase 2: LangGraph Multi-Agent Brain

Goal: Move from chatbot to orchestrated executive team.

Agents:

- CEO Orchestrator
- Market Research Agent
- CFO Agent
- CTO Agent
- Marketing Agent
- Product Agent
- Legal Agent

Steps:

1. Classify user intent.
2. Route work to specialist agents.
3. Merge specialist output into a CEO-level decision.
4. Persist reports and recommendations.

## Phase 3: Long-Term Memory

Goal: Make the AI remember goals, rejected ideas, strategic decisions, and reports.

Steps:

1. Enable pgvector on Neon.
2. Add `business_memories` table.
3. Store embeddings for important decisions.
4. Retrieve relevant memory before agent execution.
5. Show memory timeline in the UI.

## Phase 4: Executive Dashboard

Goal: Make the product feel like a real AI business operating system.

Dashboard modules:

- Business health score
- Cash runway
- Current priorities
- Agent reports
- Risk alerts
- Weekly board summary
- Task progress
- Recommendation feed

## Phase 5: Reports

Goal: Generate recruiter-worthy business documents.

Reports:

- Market research report
- Competitor analysis
- Financial forecast
- MVP roadmap
- Marketing plan
- PRD
- Weekly board report

## Phase 6: Task System

Goal: Make the AI CEO accountable and action-oriented.

Steps:

1. AI creates tasks.
2. User updates task status.
3. AI reviews missed tasks.
4. Board report includes progress and accountability.

## Phase 7: Browser Voice Mode

Goal: Add a free voice demo without Twilio.

Steps:

1. Use Web Speech API for speech-to-text.
2. Use browser speech synthesis for text-to-speech.
3. Add `Talk to CEO` mode.
4. Later replace with realtime voice APIs.

## Phase 8: Board Meeting Mode

Goal: Create the memorable feature.

Steps:

1. Generate weekly board report manually.
2. Add background scheduling later.
3. Include progress, financial risk, missed tasks, and next priorities.
4. Add voice playback for board meeting.

## Phase 9: Deployment

Goal: Deploy publicly.

Steps:

1. Create Neon database.
2. Enable pgvector.
3. Deploy backend on Render.
4. Run migrations.
5. Deploy frontend on Vercel.
6. Connect frontend to backend with `NEXT_PUBLIC_API_URL`.

## Phase 10: Portfolio Polish

Goal: Make the project interview-ready.

Steps:

1. Add demo data.
2. Add screenshots.
3. Add architecture diagram.
4. Add demo video.
5. Add GitHub README.
6. Add deployed links.
