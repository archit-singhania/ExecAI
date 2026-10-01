# Deploy through existing hosting accounts

The repository is prepared for an existing Vercel frontend project and an existing Render API service. No remote project was linked, database changed, commit pushed or deployment triggered during preparation.

## Target evidence

| Item | Repository evidence | Confirmation still required |
| --- | --- | --- |
| Git repository | `git@github.com:archit-singhania/ExecAI.git` | Linked production branch and approved release commit |
| Render service | Blueprint name `ceo-ai-api` | Owning workspace, actual `srv-…` ID, domain, current compute plan and database |
| Vercel frontend | `frontend/vercel.json`, Next.js npm workspace | Owning team, actual `prj_…` ID, production domain and root directory |
| PostgreSQL | `DATABASE_URL` supplied through the host | Existing database identity, pgvector support, migration revision and verified backup |

There is no local `.vercel/project.json` and no confirmed public domain in the repository. A service name does not establish an account or a public URL. Match each existing project to this Git repository before applying any configuration; importing this Blueprint into a different account could create new resources.

## Render API

Use the existing paid, always-running Python web service. The Blueprint intentionally omits plan, region, domain and database creation so the existing target's settings can be preserved. Its pre-deploy command requires a paid service; confirm that capability before applying. Render documents [pre-deploy migrations and ephemeral filesystems](https://render.com/docs/deploys#pre-deploy-command).

The manifest sets `backend` as the root, Python 3.12.14, production mode, one Uvicorn process, one manual instance, a five-minute shutdown allowance and `/health`. It leaves automatic deploys off. **Disable any existing autoscaling in the service dashboard**: `numInstances: 1` does not override an already enabled autoscaling policy. These fields follow the current [Render Blueprint reference](https://render.com/docs/blueprint-spec).

Use the existing persistent PostgreSQL database with pgvector. Local SQLite on Render's ephemeral filesystem is unsuitable for accounts, documents or jobs. Standard `postgres://` and `postgresql://` host URLs are normalized to the installed `postgresql+psycopg://` driver; encoded credentials are preserved. Keep credentials in the host's secret environment settings.

Set these required variables on the confirmed API service:

| Variable | Value |
| --- | --- |
| `APP_ENV` | `production` |
| `DATABASE_URL` | Existing PostgreSQL connection URL; require TLS for external database connections |
| `JWT_SECRET` | At least 32 cryptographically random characters; preserve the current secure secret when possible |
| `CORS_ORIGINS` | Exact HTTPS frontend origin(s), comma-separated, without paths or wildcard domains |
| `APP_BASE_URL` | Confirmed HTTPS production frontend origin, also included in CORS |
| `LLM_LOCAL_ONLY` | `true` until hosted processing is explicitly configured and approved |

`python -m app.deployment check` validates configuration without connecting to a database or revealing secrets. The Render pre-deploy command, `python -m app.deployment migrate`, repeats those checks and upgrades Alembic to head. It fails closed if production security or PostgreSQL configuration is missing. Back up existing data and inspect `alembic current` first; never stamp an unknown schema as current. The release adds tables and columns, and existing tokens without server session IDs require a fresh sign-in.

Do not run Ollama at a localhost address on Render unless that model service is actually present in the deployment. An unreachable local model produces labeled planning templates. For real generative runs, configure a supported model key and preferred provider, then deliberately set `LLM_LOCAL_ONLY=false`; verify the actual report source after a board run. Provider configuration is separate from provider health.

The durable queue lives in PostgreSQL; execution runs in the API's bounded local worker pool. Queued jobs resume at startup. Interrupted running jobs become retryable after the fifteen-minute lease expires. The shutdown allowance helps ongoing provider calls finish but cannot guarantee completion. Do not add API replicas, multiple Uvicorn workers or a detached worker service until a distributed lease/broker design is implemented.

## Vercel frontend

Select the existing project associated with this repository. Set its Root Directory to `frontend`, framework to Next.js and Node.js to the locally validated 24.x line. Keep the whole Git repository and root `package-lock.json` available to the npm workspace build. The updated `frontend/vercel.json` uses `npm ci` and `npm run build`; npm detects the repository workspace root when invoked from `frontend`. Vercel describes [workspace lockfile detection and monorepo root selection](https://vercel.com/docs/monorepos).

Set `NEXT_PUBLIC_API_URL` to the confirmed HTTPS Render API origin before building, without a trailing slash. The Vercel production build rejects a missing, localhost or non-HTTPS API origin. This browser-visible setting is compiled into the frontend; change it through a new build. Do not put model, database, Stripe or email secrets into any `NEXT_PUBLIC_…` variable. Leave `NEXT_PUBLIC_PIXEL_STREAM_URL` unset unless an actual Unreal streaming service is available.

Use existing custom domains under the same site for frontend and API when available, such as `studio.example.com` and `api.example.com` (illustrative, not assigned domains). The production API cookie is HttpOnly, Secure and SameSite=Lax. Separate `vercel.app` and `onrender.com` sites cannot provide durable cookie-based sign-in across a new browser tab; the current tab's session bearer can still work. Confirm domain and HTTPS cookie behavior before calling authentication release-ready. Preview origins must be explicitly allowed; never use wildcard CORS to bypass preview configuration.

## Optional services and live gates

Keep existing keys in the confirmed host account. Enable only the services required for the release:

- Tavily research needs `RESEARCH_API_KEY`; inspect returned URLs, excerpts and retrieval times against a real query.
- Resend needs `RESEND_API_KEY` and a verified `EMAIL_FROM`; test real welcome/reset/review delivery without exposing reset links.
- Stripe needs matching secret/webhook keys and the existing plan price IDs; validate signature handling and checkout in Stripe's test mode before live billing.
- Reviews need an external scheduler that POSTs `/api/internal/run-due-reviews` with `x-cron-secret` every fifteen minutes. Save a schedule with its IANA timezone and verify one entitled account's actual delivery.
- Voice requires browser microphone permission and supported caption/playback APIs; hosted voice services need their matching credentials.
- Native Halcyon needs its own built Unreal Pixel Streaming service. The browser ambience fallback remains labeled.

Before promotion, verify the PostgreSQL/pgvector CI migration job, backup/restore, isolated account signup and sign-in after tab closure, viewer/editor access, a real nine-specialist run, cancellation/retry, reconnection, persistence after API restart, document citations and revocable exports. Exercise one scheduled review and each enabled integration. `/health` only establishes that the API responds, not model, database, email or billing readiness.

If a release fails, retain the previous working frontend/API deployment and inspect the additive migration state. A code rollback does not undo database migrations; do not automatically downgrade or delete the database. Target account IDs, domains and release commit must be confirmed before any push or deployment.
