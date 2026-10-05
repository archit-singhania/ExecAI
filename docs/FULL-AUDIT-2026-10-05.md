# CEO.ai full functional and visual audit — 5 October 2026

This audit covers the maintained Next.js web application and FastAPI service. It uses isolated SQLite data, example.com accounts, guarded local Pro acceptance entitlements, and an unreachable model endpoint for deterministic runs. Existing databases, credentials and user accounts are preserved. No deployment, real payment or hosted model call is performed.

## Improvements from this audit

- Original Liquid Glass material on the public/account/classic interaction layer and executive studio: floating rail and toolbar, translucent pearl/navy tint, diagonal highlights, crisp rims, soft elevation, cobalt atmosphere and larger touch controls. Reports and documents retain clear reading surfaces.
- Persistent **Visual comfort** controls for reduced motion, reduced transparency and higher contrast. System accessibility settings and unsupported-blur fallbacks remain respected. Preferences apply across the application and on reload before the first painted theme.
- Mobile navigation hides off-screen controls from keyboard focus; its open drawer contains focus, makes the content inert, prevents background scrolling, and restores the menu button on Escape/close. Search has an accessible name at narrow widths. Reduced-motion dialogs remain centered.
- Forecasts and analytics now query the selected company. Shared viewers can read them and editors can resolve forecasts; unrelated accounts receive 404 and viewers receive 403 for writes. Service failures show an error and retry control rather than zero/empty success states.
- Cancellation and canonical finalization now use conditional database updates. A cancelled/stopped run cannot publish its final reports, tasks, predictions or done event from an obsolete observation. Successful final output and the done event commit together. Retry preserves one canonical response per run.
- Password changes return the browser to sign-in after all previous sessions are revoked. The login screen explains the outcome without claiming an unverified email delivery.
- Report sharing exposes a selectable real URL even when clipboard access fails. Sharing/revocation controls reflect owner-only server permissions. Review cadence explains its account scope and external scheduler/email requirements; controls prevent overlapping saves.

Design references were the user's [Liquid Glass Design gallery](https://liquidglassdesign.com/), its [guide](https://liquidglassdesign.com/guide/) and [style prompts](https://liquidglassdesign.com/prompts/), alongside [Apple's materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials). The app uses original CSS and vector assets; it does not copy gallery artwork or claim native per-frame optical refraction. No extra graphics framework is required.

## Reproduce the local application

Use two PowerShell terminals. Keep the selected database path unchanged after restart. If dependencies are already installed, avoid reinstalling the environment. Normal signup starts on the Free plan; the guarded isolated acceptance fixture documented in [MANUAL_TEST.md](MANUAL_TEST.md) enables local export/multiple-company/scheduling checks without billing.

Terminal A:

```powershell
cd D:\remaining-4-git-projs\ExecAI\backend
$env:CORS_ORIGINS='http://localhost:3012'
$env:APP_BASE_URL='http://localhost:3012'
& .\.venv\Scripts\python.exe -m alembic upgrade head
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8012
```

Terminal B:

```powershell
cd D:\remaining-4-git-projs\ExecAI
$env:NEXT_PUBLIC_API_URL='http://localhost:8012'
npm run dev --workspace frontend -- --port 3012
```

Open `http://localhost:3012` for marketing and `http://localhost:3012/studio` for the product. API health is `http://localhost:8012/health`. For a production preview, keep the API running and use `npm run build`, then `npm run start --workspace frontend -- --port 3012` with the same public API environment set **before the build**. This workstation also supports the direct npm CLI fallback documented in the manual guide.

## Twenty-feature manual checklist

The complete click/input instructions, exact financial fixtures and expected failure states are in [MANUAL_TEST.md](MANUAL_TEST.md). Each row below is a real connected implementation; provider-free intelligence is explicitly labeled `local-template`.

| # | Feature and where to check | Expected result |
| --- | --- | --- |
| 1 | Boardroom → Convene board | One durable job, nine source-labeled specialist reports, persisted verdict and execution trace. |
| 2 | Running board → Cancel → Retry; reload during execution | Cancelled work cannot finalize; retry gets a new job; reopening restores persisted progress. Slow-provider cancellation is distinct from a run that already completed. |
| 3 | Overview → New workspace/company context | Company context persists; switching isolates work. Free-plan company limits are enforced. |
| 4 | Boardroom → Decision briefs / Save your own brief | Saved structure reloads into an editable prompt; it does not fabricate a report. |
| 5 | Knowledge → Add verified source / Research sources | Saved URL/excerpt persists. Missing Tavily configuration displays unavailable; live search needs its configured key. |
| 6 | Knowledge → Upload and search TXT/MD/CSV/PDF | Real extracted passage and document/chunk citation; unrelated workspace access denied. Unsupported/oversized files rejected. |
| 7 | Boardroom → Specialist follow-up & debate | One or two distinct source-labeled responses; same specialist twice rejected. Evaluate intelligence with a real provider. |
| 8 | Boardroom → Dissent & alternatives | Actual lowest/highest report assessment and score spread; zero spread is permitted. |
| 9 | Decisions → Save / Edit | Version increment and prior snapshot; stale version rejected; reload preserves data. |
| 10 | Scenario lab → Save two scenarios | Derived burn, runway, CAC and LTV/CAC compare entered assumptions. |
| 11 | Scenario lab → Monthly cost sensitivity | Immediate recalculation; saved inputs stay unchanged; undefined ratios are labeled. |
| 12 | Execution → Add / edit tasks and dependencies | A dependent task cannot complete before prerequisites; cycles/wrong-workspace dependencies rejected. |
| 13 | Goals & metrics → Save / edit a key result | Target/current values, objective, owner/review date and historical observations remain inspectable. |
| 14 | Forecasts → Right / Wrong / Can't tell | Selected-company outcome and calibration persist; second empty company has no first-company forecasts. Viewers cannot resolve. |
| 15 | Reports & reviews → Account review cadence | Timezone/DST-aware settings persist. Unattended delivery requires cron/email configuration. |
| 16 | Boardroom → Open voice → type / microphone | Typed conversation gives real captions and optional playback. Physical capture, permission denial, browser recognition and provider STT require device acceptance. |
| 17 | Team & activity → add registered colleague / comment / mention | Correct viewer/editor controls, saved comments/activity and recipient-only mentions. |
| 18 | Reports → Read / PDF / Markdown / Share / Revoke | Actual readable exports; share dialog exposes public URL; revocation returns 404. Free export gates remain enforced. |
| 19 | Search everything / Ctrl or Cmd K; disconnect after viewing | Scoped search and previously viewed reports/messages/tasks in reading mode. Offline writes rejected; cold offline startup is outside this release. |
| 20 | Agent controls → Routing / privacy / token cap; execution trace | Saved settings govern future runs; actual report source and usage counters; no invented provider health or dollar costs. |

Account profile/password/export/deletion, authentication, plan limits and existing classic dashboard/Halcyon pages also remain maintained. Halcyon browser ambience is explicitly illustrative when Unreal streaming is unavailable.

## Verification and real limits

Exact final test/build results and refreshed visual artifacts are appended after the local checks complete. The suite creates and migrates a new temporary fixture database rather than deleting or reusing normal account data. The public/provider states are exercised with local fixtures and unavailable endpoints; those are not claims of live hosted integration acceptance.

The refreshed production-only npm registry audit returned **zero vulnerabilities**. The full audit returned **11 high, zero critical** development-tree entries, all propagated from one unpatched `braces` advisory. The [raw registry record](npm-audit-2026-10-05.json) is retained. The [upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version, and a fresh registry query still returned 3.0.3. No unvalidated major upgrade or toolchain downgrade is represented as a fix; [VALIDATION.md](VALIDATION.md) describes the scope and release gate.

Remaining external gates are live configured model quality/availability, Tavily research, actual microphone and speech playback, Stripe test-mode payment/webhooks, email delivery/unattended cron, PostgreSQL/pgvector runtime acceptance, real-device rendering/performance profiling, hosted HTTPS and native Unreal compilation/streaming. This local audit does not claim universal device coverage, a 60 fps benchmark or “perfect” UX under every condition.
