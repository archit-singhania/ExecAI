# Local release evidence

Verified on Windows on 1 October 2026 with Python 3.12, Node.js, Chrome and isolated test databases. The twenty connected capabilities and their service boundaries are described in [CAPABILITIES.md](CAPABILITIES.md); setup and production gates are in [RELEASE.md](RELEASE.md).

| Check | Observed result |
| --- | --- |
| Backend suite | 244 passed in 26.07 seconds; 565 warnings, no failed tests |
| Clean and populated SQLite migrations | Additive upgrade to revision `20261001_0015` passed; existing account preserved |
| TypeScript | Passed |
| ESLint | Passed |
| Next.js production build | Passed; 16 routes built with Next.js 15.5.27, including the Vercel environment guard |
| Clean dependency installation | `npm ci --ignore-scripts` passed |
| npm security audit | Zero reported vulnerabilities |
| Chrome browser acceptance | Two tests passed, including the recorded studio journey and reduced-motion marketing |
| Patch whitespace | `git diff --check` passed |
| CI workflow syntax | Parsed successfully; backend, frontend and PostgreSQL migration jobs configured |
| Hosting preparation | Render/Vercel manifest structure checks passed; HTTPS API build guard accepted an illustrative secure origin and rejected localhost |
| Manual acceptance setup | Dedicated fixture database guard, actual password hashes, Pro fixture entitlement and no-overwrite behavior passed |

The backend suite verifies workspace isolation and role enforcement, token revocation, mutation origins, version conflicts, task dependency validation, cited ingestion, nine-report durable runs, scheduling, exports and migration preservation. Provider calls are isolated from the developer's Ollama instance. Successful fallback reports remain labeled `local-template`.

Additional deployment checks validate managed PostgreSQL URL aliases, encoded credentials, persistent production storage and exact HTTPS origins. [DEPLOYMENT.md](DEPLOYMENT.md) records the existing target evidence and the account/domain confirmations still required. The Vercel environment build used an illustrative API origin solely to validate configuration; it did not contact or deploy to that origin.

[MANUAL_TEST.md](MANUAL_TEST.md) provides exact startup, demo/account distinctions, guarded local fixture setup and expected results for every capability. The fixture tool is restricted to a dedicated development/test database and cannot modify normal or production accounts. Its Pro entitlement is explicitly a local acceptance fixture, not a payment outcome.

The actual Chrome journey creates the explicitly labeled **Northstar Labs · Illustrative workspace**, persists a decision through reload, exercises keyboard search and modal focus, calculates a financial scenario, adds a task, uploads and retrieves evidence, and completes all nine specialist reports. It checks light and dark appearances, mobile navigation, previously viewed offline content and rejected offline mutations. Fixtures use a disposable example.com account.

Artifacts:

- [Approximately one-minute browser demonstration](demo/ceoai-workflow.webm) — 64.52 seconds, 1280 × 720, WebM.
- [Full browser recording](demo/ceoai-workflow-full.webm).
- [Light studio](screenshots/studio-light.png), [dark studio](screenshots/studio-dark.png), [mobile execution](screenshots/studio-mobile.png).

PostgreSQL/pgvector integration was configured in CI but was not run locally. Hosted models, Tavily search, payments, email, actual microphone permissions, unattended cron and native Unreal streaming require acceptance against configured services before release claims. The local worker design supports one application deployment; distributed workers and cold offline startup are outside this release. No deployment, publication or benchmark claims are included in this evidence.
