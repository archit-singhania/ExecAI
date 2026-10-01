# Release and local operation

For the existing Render/Vercel account deployment, see [DEPLOYMENT.md](DEPLOYMENT.md), including target identification and production pre-deploy checks.

## Prerequisites and setup

Use Python 3.12 and Node 20 or newer. Install from the repository root:

```sh
python -m venv backend/.venv
# Activate the virtual environment for your shell.
python -m pip install -r backend/requirements.txt
npm ci
```

Set backend environment variables before startup. The default local frontend is port 3000 and API port 8000. Set `CORS_ORIGINS=http://localhost:3000`, `APP_BASE_URL=http://localhost:3000` and frontend `NEXT_PUBLIC_API_URL=http://localhost:8000`. Hosted deployments should use matching HTTPS application and API domains on the same site so the HttpOnly SameSite cookie is available. A session-only bearer token supports explicit API authorization; credentials are no longer persisted in localStorage.

Back up the existing database first. From `backend`, run `python -m alembic upgrade head`, then `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`. From the root, run `npm run dev`. Do not stamp an unknown existing schema as current; inspect its migration state before applying upgrades. The new migration adds tables and provenance/timezone columns without deleting existing rows. Existing JWTs without server session IDs require a new sign-in.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite locally; `postgresql+psycopg://…` with pgvector in production |
| `JWT_SECRET` | At least 32 random characters in production; development default is rejected |
| `APP_ENV` | `production` skips automatic schema creation; apply Alembic first |
| `CORS_ORIGINS`, `APP_BASE_URL` | Explicit application origins and links |
| `LLM_LOCAL_ONLY` | Server policy; a workspace cannot override local-only server privacy |
| `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Actual local model service and model |
| Provider API keys | Optional configured hosted routing: Groq, Gemini, Cerebras, NVIDIA, OpenRouter |
| `RESEARCH_API_KEY` | Tavily research search; missing key returns an actionable unavailable response |
| `CRON_SECRET` | Protect scheduled review/digest triggers; external scheduler required |
| `RESEND_API_KEY` | Actual email delivery; missing key does not claim email was sent |
| Stripe secrets and price IDs | Optional billing checkout/webhooks; unconfigured payments remain unavailable |
| Speech keys | Optional Sarvam/ElevenLabs/Azure voice; browser captions/playback remain available where supported |
| `NEXT_PUBLIC_PIXEL_STREAM_URL` | Optional Unreal Pixel Streaming endpoint; Halcyon uses labeled browser ambience when absent |

Configure an external scheduler to POST `/api/internal/run-due-reviews` with `x-cron-secret` every fifteen minutes. The browser saves an IANA timezone and review math handles daylight saving changes. Reviews currently target the account's most recently updated active company. Email delivery requires Resend; scheduling requires a Pro-or-higher entitlement. Keep multiple application replicas or distributed execution out of this local worker deployment until a shared broker and worker lease design are adopted.

## Validation and deployment gates

```sh
python -m pytest backend/tests -q
npm run typecheck --workspace frontend
npm run lint --workspace frontend
npm run build
npm audit
npm run test:e2e --workspace frontend
```

Playwright starts isolated API and frontend servers on 8012/3012. Install its browser with `npx playwright install chromium`. For existing Chrome, set `PLAYWRIGHT_CHANNEL=chrome`. `CEOAI_PYTHON` can point to the product virtual environment; `PLAYWRIGHT_EXTERNAL_SERVERS=1` uses already started test servers. Tests never delete the developer's database or call their local Ollama service.

CI uses the root npm workspace lock, runs backend tests, clean SQLite migrations, TypeScript, ESLint, a production build, browser acceptance and PostgreSQL/pgvector migration smoke. PostgreSQL migration smoke is configured in CI but was not executed on this Windows machine. Verify that job on the target branch before a PostgreSQL release. Provider calls, payment/email delivery, actual microphone permissions, the external cron service and native Unreal compilation need configured-environment acceptance; local tests cover their contracts and unavailable states.

Before publishing, verify backup/restore, migration results, HTTPS cookie behavior, provider privacy policy, queue recovery and live integrations. No deployment or publication is performed by these repository changes.
