# CEO.ai manual acceptance guide

This guide tests actual local product behavior. Use hypothetical company data and the isolated accounts below. Keep a pass/fail note for each numbered capability, together with the screen, expected result and provider configuration used. A missing external service is an unavailable-state result, not a successful integration test.

## Start the existing checkout

From the repository root in PowerShell, install dependencies if needed:

```powershell
py -3.12 -m venv backend/.venv
& ./backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
npm ci
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (!(Test-Path frontend/.env.local)) { Copy-Item frontend/.env.example frontend/.env.local }
```

Keep an already working virtual environment; creating it again is unnecessary. If `py` is unavailable, use an installed Python 3.12 executable. This machine's npm shim has an installation problem; its working alternative is `& 'C:/Program Files/nodejs/node.exe' 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' ci`. Other machines normally use `npm ci`.

For the normal account database, leave `DATABASE_URL=sqlite:///./ceo_ai.db`, set a long random `JWT_SECRET` in `backend/.env`, and keep `APP_ENV=development`. Backend CORS and application base URL must be `http://localhost:3000`; frontend `NEXT_PUBLIC_API_URL` must be `http://localhost:8000`. Existing environment files are preserved by the copy commands. Back up any existing database before migration; never delete it to fix a startup error.

Terminal A, from `backend`:

```powershell
& ./.venv/Scripts/python.exe -m alembic upgrade head
& ./.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Terminal B, from the repository root:

```powershell
npm run dev
```

Open `http://localhost:8000/health`: expect `{"status":"ok"}`. Open `http://localhost:3000`: expect the premium landing page. If a port is occupied, stop only the server you own or change both matching URL/origin settings. For a production-build preview, run `npm run build`, followed by `npm run start --workspace frontend`; keep the API running. Do not run dev and production frontend servers on the same port.

When running all four repositories together, use CEO.ai's reserved API/frontend ports **8012/3012**. In Terminal A, set `$env:CORS_ORIGINS='http://localhost:3012'` and `$env:APP_BASE_URL='http://localhost:3012'`, then start Uvicorn with `--port 8012`. In Terminal B, set `$env:NEXT_PUBLIC_API_URL='http://localhost:8012'`, then run `npm run dev --workspace frontend -- --port 3012`. Open `http://localhost:3012/studio`; the API health URL is `http://localhost:8012/health`. Keep the same chosen database in Terminal A. These session variables override the example files without editing other projects.

## Isolated complete acceptance accounts

A normal signup starts on Free: one active workspace, twenty monthly runs, no paid report exports or scheduled reviews. Verify those limits with a real signed-up account. To test all local features without purchasing or changing existing users, stop Terminal A and select a separate acceptance database in that terminal:

```powershell
$env:DATABASE_URL='sqlite:///./manual_acceptance.db'
$env:APP_ENV='development'
$env:OLLAMA_BASE_URL='http://127.0.0.1:9/v1'
$env:LLM_LOCAL_ONLY='true'
& ./.venv/Scripts/python.exe -m alembic upgrade head
& ./.venv/Scripts/python.exe -m app.local_fixture
& ./.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The fixture command prompts for a password of at least twelve characters without displaying it. It creates `owner.fixture@example.com`, `editor.fixture@example.com` and `viewer.fixture@example.com`; all use your chosen password. The explicitly illustrative owner receives a local Pro entitlement for export/schedule tests and five active workspaces. No Stripe purchase or paid subscription is fabricated. The command refuses production mode, a different database filename, or a database already containing accounts. If the accounts exist, skip seeding and use their previous password; do not erase the database.

Use separate browser profiles or incognito windows for the roles. Sign in through `/login`; the owner should reach `/studio` with real persisted account state. Developer tools should show a session bearer in sessionStorage and an HttpOnly API session cookie; the bearer must not be in localStorage. Restart the API with the same database settings to verify persistence.

## Demo versus actual accounts

The landing/authentication **demo** opens the classic dashboard with clearly illustrative, temporary client-side examples. It does not create an authenticated backend account. Opening `/studio` from a demo displays account guidance; studio persistence tests require signup/login. Normal sign-in clears the demo flag. Use the fixtures below and name the company **Northstar Labs · Illustrative workspace**. The saved video uses real account/API flows with fixture inputs, separately from temporary demo mode.

## Twenty capability checks

### 1. Durable nine-specialist runs

Create Northstar with goal “Validate invoice reconciliation for small agencies.” In **Boardroom**, ask “Should we interview five agencies before building invoice integrations?” and convene the board. Expect a persisted job ID, progress, nine specialist reports and a verdict. Refresh: messages/reports remain. Every report displays its actual source. With the unreachable model above, expect `local-template`; heuristic scores do not establish business health or measured probabilities. With a real provider, require its provider/model source.

### 2. Cancellation, retry and reconnection

Start another run and refresh during execution. Expect restoration of the same job rather than an automatic duplicate. Disconnect/reconnect the browser briefly: the API continues and persisted progress returns. For a sufficiently slow configured model, press **Cancel run** before completion; expect `cancelled` and no final response committed for that run. Recorded progress events may remain. **Retry** creates a new job and consumes one additional run. A fast fallback can finish before the click; that does not test cancellation. After API interruption, an expired running lease becomes retryable after fifteen minutes; queued work resumes at startup. This is one-process recovery, not a distributed worker guarantee.

### 3. Multiple workspaces and company context

Under **Overview**, save customer, problem, revenue model and constraints. Create “Southstar · Illustrative” using the workspace plus button, switch back, and verify Northstar's context. In **Trust center**, rename/archive Southstar, then restore it from archived-workspace onboarding. Records must survive archive and API restart. A normal Free account rejects a second active workspace until one is archived; fixture Pro permits five. Unrelated accounts must not see each other's owned workspaces.

### 4. Reusable decision briefs

In **Boardroom → Decision briefs**, choose **Product launch**: expect its structure in the editable prompt. Expand **Save your own brief**, save “Interview gate” with “Compare interviews, a concierge pilot and immediate integration work.” Refresh and choose it. The same structure returns; no report exists until a run is submitted.

### 5. Inspectable research

In **Knowledge → Add a verified source**, save a real public URL, title and excerpt you inspected yourself. Source metadata and retrieval time persist. Research search without a key must report unavailable without invented results. With `RESEARCH_API_KEY`, submit an actual query and inspect returned URLs/excerpts/timestamps. A saved URL is evidence to evaluate, not proof of every claim.

### 6. Document ingestion and citations

Save this original fixture as `interviews.txt`: “Interview 01: Small agencies reconcile invoices weekly. Buyers need CSV import, exception review and a record of who approved each match. Interview 02: A paid pilot requires an export of unresolved invoices.” Upload under **Knowledge**, then search “exception review”. Expect a passage with document/chunk citation, also after reload. Ask the board about the interviews and inspect retrieved context/citations. Unsupported types or files over ten megabytes must be rejected. Retrieval is deterministic hashed lexical ranking; this release does not claim neural semantic quality.

### 7. Specialist follow-up and structured debate

In **Boardroom → Specialist follow-up & debate**, ask “Which validation expense should we postpone?”, choose `cfo`, and submit a focused response. Then choose a different challenger such as `product` and submit. Expect one report for focused follow-up, two distinct source-labeled reports for debate, and persisted discussion. Reusing the same specialist twice must fail validation. Templates test plumbing; evaluate substantive debate only with a real model.

### 8. Dissent and alternatives

After a run, inspect dissent/alternative cards and conviction spread. Expect the lowest/highest reported assessments, reasons and actual spread. Match them to the reports. Equal scores may produce zero spread; disagreement must never be invented to fill a card.

### 9. Versioned decisions

In **Decisions**, save “Interview before integration”, rationale, alternatives, assumptions, owner and review date. Edit the rationale. Expect a version increment and previous snapshot. Reload/restart: current and historical versions remain. Open the same decision in two tabs, save one edit, then submit the other's stale version; expect a conflict instead of overwrite. A verdict can be drafted into the ledger; a human still approves it.

### 10. Side-by-side financial scenarios

In **Scenario lab**, save “Lean”: cash 30000, monthly costs 7000, revenue 2000, acquisition spend 600, new customers 20, monthly revenue/customer 40, margin 0.7, churn 0.05. Save “Expansion” with costs 10000/revenue 3000 and other inputs unchanged. **Compare scenarios** should show lean burn 5000/runway 6.0 months; expansion burn 7000/runway about 4.3 months; CAC 30.00 and LTV/CAC about 18.67. Saved values survive reload.

### 11. Interactive sensitivity

Set **Monthly cost sensitivity** to +20%: Lean burn becomes 6400 and runway about 4.7 months immediately. Return to zero and reload: assumptions remain unchanged; the exploratory slider is not a persisted edit. Zero customers/churn must produce explicitly undefined ratios where appropriate. Negative/nonfinite input is rejected. Outputs depend on entered assumptions.

### 12. Execution boards and dependencies

In **Execution**, add High-priority “Complete interviews” with owner/date. Add “Design pilot” dependent on it. Marking the pilot **Done** first must fail. Complete interviews, then the pilot: expect correct columns and saved assignments/dates. Try making the first task depend on the second: expect cycle rejection. Reload/restart: tasks persist. Editing is click-based, not drag-and-drop.

### 13. OKRs, scorecards and history

In **Goals & metrics**, save “Buyer interviews”, objective “Validate demand”, current 2, target 5, owner and review date. Edit current value to 5. Expect current scorecard, historical value 2, objective grouping and a target notice. Reload to confirm history. Values are user-entered rather than an invented analytics integration.

### 14. Forecast tracking and calibration

Open **Forecasts** after a run. Inspect statement, due date and confidence; mark a checkable forecast correct/incorrect/void only after inspecting evidence. Expect it to leave pending and update calibration totals after reload. A new account without resolved forecasts shows insufficient data, not sample accuracy. The existing calibration view is account-wide; forecasts from that account's other workspaces may appear.

### 15. Timezone-aware reviews

On fixture Pro, open **Reports & reviews** and **Run review** after adding tasks/reports. Expect saved execution review reflecting actual task completion, labeled `execution-review-rules`. An empty workspace must return an actionable error. Scheduling starts **Off**, with email disabled. Choose Weekly, weekday/hour and IANA timezone such as `Asia/Kolkata`; settings persist after reload. External cron/email are required for automatic delivery. Free schedule activation must fail honestly. Automated tests cover DST; the saved timezone must not silently become just today's UTC offset.

### 16. Voice, captions and playback

In **Boardroom**, press **Open voice**, then deliberately tap the mic. Expect a permission prompt or actionable unsupported state; opening the panel must not record. Speak a question: visible captions accompany the durable job and supported playback reads the reply. Test mute and denied permission; typed input remains available. Real mic capture is a manual gate. Browser speech may process audio remotely even with local-only board models.

### 17. Roles, comments, activity and mentions

As owner, add the existing editor/viewer emails under **Team & activity**. Viewer reads Northstar but cannot save/run/archive/manage members; API checks must also reject writes. Editor can add tasks but cannot manage owner access. Comment `@editor.fixture@example.com`: only that recipient receives the private mention notice, and marking read persists. Remove viewer and refresh its browser: access disappears. Edits/comments/runs create real activity. A nonexistent email fails; no invitation delivery is simulated.

### 18. Exports and revocable links

On fixture Pro owner, download **PDF** and **Markdown**. Open them: expect content, title and provenance; PDF must be a valid document. Normal Free receives an export entitlement response. As owner, **Share**, open the copied URL unsigned-in and read only that report. **Revoke link**, then reload public page: access fails. Viewer/editor cannot manage owner's links. Anyone holding a public link can read that selected report, so use fixture content.

### 19. Universal search and warm offline reading

**Search everything** should find the interview decision and task and open their matching sections. Type several characters; test Tab/Shift+Tab/Escape: focus stays in the dialog and restores to its trigger. Visit reports/tasks/messages online, then switch browser network tools offline without closing the app. Previously viewed work remains readable; mutations/runs show an offline error. Logout clears session cache. Cold offline startup, new-document retrieval and offline editing are outside this release.

### 20. Routing, budgets and traces

In **Agent controls**, save provider, local-only preference and maximum response tokens; reload. Server `LLM_LOCAL_ONLY=true` overrides workspace hosted preference. Run and inspect source/progress traces and before/after plan usage. A repeated request while a workspace job is active reuses it without another quota charge. Configured cards are not health probes; served-call counters cover only the current process. For real routing, configure a provider, deliberately allow hosted processing and verify source/token cap. Monthly run usage persists; no invented dollar estimates are shown.

## Cross-cutting finish checks

Check light/dark/system appearance on desktop and near 390 px mobile width. Navigation must collapse/reopen, reports wrap, forms/tables remain usable and focus is visible. Reduced motion stops decoration while navigation works. Inspect original compass branding on marketing/auth/studio/app icons.

In **Trust center**, revoke the other browser session: its next authenticated request fails. A password change revokes all prior sessions. Export fixture account JSON in settings and inspect it. Test account deletion only on a disposable account after other checks: active runs block it and deletion affects that account's data, not another member's account.

Unconfigured Stripe must report unavailable. With Stripe test secrets/prices/webhook configuration, exercise checkout, signature verification and replay protection. Unconfigured Resend must not claim email delivery; test actual reset/review messages only when enabled. Halcyon shows labeled browser ambience unless a real Unreal stream is supplied; native Unreal compilation is a separate acceptance gate.

Evidence/media: [VALIDATION.md](VALIDATION.md), [scope matrix](CAPABILITIES.md), [short recording](demo/ceoai-workflow.webm), [full recording](demo/ceoai-workflow-full.webm), and [light](screenshots/studio-light.png), [dark](screenshots/studio-dark.png), [mobile](screenshots/studio-mobile.png) screenshots. Hosting is deferred; no deployment or publication is included.
