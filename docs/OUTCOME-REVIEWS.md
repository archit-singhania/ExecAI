# Decision outcome reviews

In Decisions, approve a current decision/evidence baseline using Evidence freshness. Open Decision outcome reviews → Create outcome review. Refresh approved baselines if one was just approved. Choose a baseline, review date and numeric or qualitative criteria.

Numeric criteria require a target, unit and reporting period. Actual observations require a source/reference and measurement date. Missing values remain unknown; different units or periods have no numeric variance. Variance is actual minus target, not an automatic success score. Qualitative expectations and observed narratives remain human judgments.

Save observations, lessons, unexpected effects and proposed actions. Completion freezes the review. Select specific actions and confirm task creation; repeat requests return the same task IDs. A correction creates a new linked draft with the original decision/evidence snapshot. Generic record deletion cannot remove review history.

Expectations are recorded at review creation, not backdated to decision approval. Existing evidence-baseline approval is a user acknowledgment; the separately planned multi-reviewer approval workflow is not part of this feature yet.

API family: `/api/studio/{workspace}/outcome-reviews`, with create/list, versioned update, corrections and confirmed task selection. Uses additive `studio_records` kinds and existing owned workspace access; no destructive database migration.

Verified October 27, 2026: 39 backend regressions; TypeScript/ESLint; real Chrome lifecycle including save/reload, zero actual value, immutable completion, correction, selected tasks and 390px width. The browser journey also verifies unsaved observation recovery after navigating to Execution and back. Drafts are scoped to the signed-in user and workspace in session storage; stale drafts are exposed for manual reconciliation rather than overwriting newer server data. Signing out clears cached drafts.

A refreshed production Next.js build and the same lifecycle against `next start` passed after the draft-recovery change (October 27, 2026). To repeat against the isolated fixture backend, build with `NEXT_PUBLIC_API_URL=http://127.0.0.1:8012`, then run `CEOAI_E2E_PRODUCTION=1` with the existing Playwright outcome test. The test creates a temporary database and fixture account; it does not operate on live account data. Broader accessibility, performance, recovery and release checks remain outstanding.
