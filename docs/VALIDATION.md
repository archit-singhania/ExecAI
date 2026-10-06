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
| npm security audit | 1 October: zero reported vulnerabilities. Refreshed 3 October: full audit has 11 high development-tool entries from one `braces` advisory; production-only audit has zero. See current dependency gate below. |
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
- [Recording provenance and original fixture inputs](demo/README.md).

## Dependency audit refresh — 3 October 2026

The original build/browser evidence above remains dated 1 October. A new registry check ran `npm audit --json --registry=https://registry.npmjs.org` against the unchanged root workspace lock: **11 high, zero critical** entries. All propagate from `braces` 3.0.3 through development dependencies including `micromatch`, `fast-glob`, Tailwind's watcher and ESLint/stylelint tooling. These are eleven affected dependency-tree entries, not eleven independent defects. `npm audit --omit=dev --json --registry=https://registry.npmjs.org` separately returned **zero vulnerabilities**.

[GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), reviewed/updated on 2 October, affects `braces` through 3.0.3 and lists no patched version. The registry's latest `braces` is still 3.0.3. Compatible parent updates do not resolve it: latest `micromatch` 4.0.8 still requires `braces ^3.0.3`, and latest `fast-glob` 3.3.3 requires that micromatch line. npm's proposed forced Tailwind major upgrade and ESLint/stylelint downgrades do not constitute a validated compatible fix, so the manifest and lock were preserved.

The installed lock marks `braces` as development-only. Reviewed first-party frontend source has no direct runtime import of these glob libraries. Current callers use maintainer-controlled source/build/lint patterns in `frontend/tailwind.config.ts`, `frontend/eslint.config.mjs` and package scripts. Company text, search terms and uploaded documents are not passed to those build/lint pattern APIs. This limits the observed exposure; it does not remove the advisory or justify calling the full audit clean. Running tooling on unreviewed repository/configuration changes remains an exposure. A compatible upstream patch or a separately validated toolchain migration is an outstanding development dependency release gate; repeat the full registry audit before publishing.

PostgreSQL/pgvector integration was configured in CI but was not run locally. Hosted models, Tavily search, payments, email, actual microphone permissions, unattended cron and native Unreal streaming require acceptance against configured services before release claims. The local worker design supports one application deployment; distributed workers and cold offline startup are outside this release. No deployment, publication or benchmark claims are included in this evidence.

## Audit completion — 6 October 2026

The [5–6 October full audit](FULL-AUDIT-2026-10-05.md) supersedes the local functional/visual acceptance totals above while preserving their original dates. The completed 5 October backend suite had **247 passes in 66.59 s**. Backend source was unchanged on 6 October, so that result was reused. After repairing saved agent-controls form initialization, 6 October TypeScript, ESLint and a Next.js 15.5.27 production build passed with **16 routes**.

All **five production Chrome journeys** passed across two final browser invocations on the same production build. The five-test invocation passed the core, glass/error, password and marketing journeys; the extended journey reached a test-only ambiguous member selector. Scoping that selector to Workspace members required no application change. Its fresh-database rerun passed in **71.648 s**, including exports, shares/revocation, cadence, roles, forecast isolation/resolution and saved controls across reload/workspace changes. No studio page errors were reported. The initial controls defect and intermediate selector failure remain recorded in the audit and logs.

[Machine-readable results and SHA-256 artifact hashes](AUDIT-RESULTS-2026-10-06.json), [final regression log](evidence-2026-10-06/browser-final.log), [successful extended log](evidence-2026-10-06/extended-final.log) and [extended report](evidence-2026-10-06/extended-report.json) contain the exact evidence. New recordings/screenshots are dated 6 October; the 1 and 5 October artifacts remain unchanged.

The last registry audit remains dated **5 October**, not 6 October: zero production findings, 11 high/zero critical development-tree entries from the unresolved braces advisory, with its [raw registry record](npm-audit-2026-10-05.json). No dependencies changed during this continuation and no new registry outcome is inferred. External integration, physical-device and hosting gates above still apply.