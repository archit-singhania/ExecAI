# Resource allocation — local implementation

Open Execution → Resource allocation. Enter a scenario name, budget and staff-hour limits. Add initiatives with estimated value, cost, hours, required status and dependencies using their displayed IDs. Costs must share a currency/reporting period and values must be comparable. Save and optimize starts a persisted background job. The comparison table shows saved proposals; expanding results describes selected and excluded initiatives and consumed capacity.

SciPy 1.17.0 `optimize.milp` maximizes the sum of entered values using binary selection variables. Dependencies require selected prerequisites. Inputs are bounded to 100 initiatives; the solver has a node limit, a 0.1–30 second solver limit and a separate process deadline. Two solver processes run concurrently. The UI requests a 10-second solver budget. No external AI provider is needed.

An infeasible model has no allocation; unknown totals remain unknown. Time-limited results are never labeled optimal. Only a validated feasible incumbent can be applied. Apply reviewed proposal creates a new immutable allocation-plan record pointing to the preceding plan; it does not execute initiatives or create expenses. Stale applies are rejected, and an already-applied current proposal returns its existing plan.

Cancellation persists before terminating the solver; cancelled jobs cannot publish a later solution. On service startup, queued work is requeued and interrupted running jobs are marked failed with an explicit retry instruction. Retry by saving another scenario, preserving the prior result. This implementation targets a single backend service process; coordinated multi-instance worker leases are not implemented.

## Verification and remaining release work

Tests cover a known optimum, impossible required constraints, source ownership, saved plan creation, stale revisions, cancellation before execution, invalid dependencies, non-finite inputs, queued recovery and interrupted-state handling. Simulated solver limit results check truthful status handling; they do not benchmark real worst-case solve times.

Full source regression and production-browser results are recorded in the workspace status. Manual checks should include cancelling an active solve, editing multiple scenarios for comparison, keyboard access, large text and assistive-technology reading. Unsaved form drafts, user-editable solver budgets, copying an existing scenario into a new form, broader performance profiling and multi-instance deployment remain outstanding. Saved scenarios and applied plans persist in the existing additive studio-record storage.

Acceptance checkpoint: 43 backend regressions passed. The production build passed compilation/lint/type checks. The real Edge browser journey passed initiative entry, actual optimization, explicit apply, reload persistence and a 390px viewport check. This does not certify all broader release gates.
