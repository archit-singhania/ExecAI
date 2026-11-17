# Strategy experiments — implementation checkpoint

Implemented October 31, 2026: workspace-owned experiments in Decisions, current approved evidence baseline selection, hypothesis, observation window, success criteria and stop conditions. The creating user is recorded as owner. Workspace editors can update the plan; viewers cannot write.

Plan changes append expectation history. Evidence checkpoints belong to their exact expectation revision and require an observation, source and measurement date within the window. A human assessment is not a probability or causal finding. Changed criteria do not inherit a previous revision's observations automatically.

Activate a planned experiment, record checkpoints, then complete or stop it with a closure summary. Closure atomically freezes the experiment and creates an ordinary outcome-review draft with saved decision/baseline snapshots, current-revision observations and proposed actions. Missing evidence stays blank. Task creation remains the existing separately reviewed outcome-review operation. Stale writes and changes after closure are rejected. Generic record deletion is blocked.

## Manual review

1. In Decisions, approve the current decision evidence baseline, then open Strategy experiments.
2. Select that baseline, enter a hypothesis, one criterion per line, dates and stop conditions. Plan and activate it.
3. Record a sourced checkpoint. An empty source or out-of-window date must fail visibly.
4. Save a changed criterion and inspect expectation history. Close with an honest summary and optional actions.
5. Reopen Decisions and inspect the new outcome-review draft. Evidence from an older criterion revision must not become current evidence. Complete the review and explicitly select any actions to turn into tasks.

## Remaining before feature completion

Approved KPI snapshot selection and account/workspace-scoped session draft recovery are implemented. Seven backend tests pass, including immutable KPI snapshots after live metric changes. Production compilation, lint and type validation passed. Production-mode Edge browser acceptance passed: navigate away/back with an unsaved hypothesis, save and activate, select an approved KPI, reload checkpoint drafts, record evidence, complete into an outcome-review draft and reload at 390px width. Explicit labels keep restored textareas accessible. Owner reassignment is implemented: only the workspace owner may choose the owner or an active editor; changes preserve audit history and require the current revision. Four experiment backend tests and frontend type validation passed after this addition. Native browser acceptance of the new reassignment control and broader accessibility inspection remain. Older evidence snapshots without a stored kind require a new approval to appear in KPI selection. The implementation is in progress, not release-certified. Existing storage is reused additively without changing historical records.
