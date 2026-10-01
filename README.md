# CEO.ai

An executive decision studio for turning company context, evidence and specialist perspectives into accountable decisions and execution.

The premium interface uses an original compass identity, light/dark/system appearance, translucent navigation, readable cards, responsive layouts, keyboard modal access and restrained motion. The new `/studio` has thirteen connected sections; the classic boardroom and Halcyon companion remain available.

## Product workflows

- Durable nine-specialist runs, live progress, cancellation, retry and reconnect.
- Company workspaces, reusable briefs, focused specialist debates and visible dissent.
- Versioned decisions, cited document retrieval and inspectable research sources.
- Scenario comparison, financial sensitivity, historical KPI scorecards and forecast calibration.
- Task dependencies, member roles, comments, mentions and activity.
- Timezone-aware board reviews, voice/captions, report exports and revocable links.
- Scoped search, warm offline reading, provider privacy controls, budgets and source traces.

Every advanced workflow has an implementation and a documented acceptance boundary in [the twenty-capability matrix](docs/CAPABILITIES.md). Missing external services are surfaced honestly. Provider-free reports are labeled planning templates rather than presented as generated intelligence.

## Stack and setup

Next.js 15, React 19, TypeScript and Tailwind; FastAPI, SQLAlchemy, Alembic and a concurrent Python specialist runner. SQLite supports local operation. PostgreSQL/pgvector supports indexed knowledge retrieval in hosted deployments. The legacy LangGraph definition remains in the repository, while the active runner uses bounded jobs and concurrent specialist threads.

```sh
python -m venv backend/.venv
# Activate the virtual environment for your shell.
python -m pip install -r backend/requirements.txt
npm ci
# Set DATABASE_URL and JWT_SECRET for your environment.
cd backend
python -m alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# In another shell, from the repository root:
npm run dev
```

Use frontend port 3000 and API port 8000 locally. Back up existing data before applying migrations. Existing accounts remain; old JWTs require one new sign-in after the server-side session upgrade.

[Manual acceptance guide](docs/MANUAL_TEST.md) contains startup commands, isolated local accounts and expected results for all twenty capabilities. [Release and configuration guide](docs/RELEASE.md) covers cookie domains, production secrets, migrations, external provider setup and deployment gates. [Architecture and portfolio walkthrough](docs/EXECUTIVE_STUDIO.md) explains data flow and honest CV claims.

## Validation

```sh
python -m pytest backend/tests -q
npm run typecheck --workspace frontend
npm run lint --workspace frontend
npm run build
npm audit
npm run test:e2e --workspace frontend
```

Browser tests use isolated local servers and data. Tests do not delete the developer database or call a developer's running model. CI includes SQLite migration preservation, browser acceptance and a PostgreSQL/pgvector migration smoke job. Live model/research/voice/email/payment acceptance requires configured services. Native Unreal compilation is an independent optional integration; the browser companion shows labeled ambience when streaming is not configured.
