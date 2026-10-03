# CEO.ai recording provenance

These recordings show the actual local CEO.ai application in Chrome, driven by the acceptance journey in [studio.spec.ts](../../frontend/tests/e2e/studio.spec.ts). They were captured on **1 October 2026** on Windows against an isolated SQLite test database. This provenance page was added on 3 October; the videos were not recorded again.

- [Short workflow](ceoai-workflow.webm): **64.52 seconds**, 1280 × 720 WebM, a trimmed excerpt of the actual browser recording. It is not a separate complete twenty-feature acceptance run.
- [Full workflow](ceoai-workflow-full.webm): the complete recorded studio acceptance journey, including the later board, appearance, mobile and offline checks.
- [Light studio](../screenshots/studio-light.png), [dark studio](../screenshots/studio-dark.png) and [mobile execution](../screenshots/studio-mobile.png): actual application screenshots from the same acceptance run.

## Illustrative inputs

The company is explicitly named **Northstar Labs · Illustrative workspace**. The founder is a disposable `example.com` test account; no real customer account or company records are used. Inputs are original acceptance fixtures:

| Input | Fixture value |
| --- | --- |
| Business goal | Validate invoice reconciliation for accountants before spending the launch budget. |
| Decision | “Interview before launch,” with rationale “Evidence should precede engineering effort.” |
| Financial scenario | “Lean launch”: available cash 12,000; monthly costs 3,000; monthly revenue 1,000. The calculated net burn is 2,000 and runway is 6.0 months. These are hypothetical values, not measured company finances. |
| Execution task | Interview five accountants. |
| Uploaded document | `buyers.md`, containing “Accountants need invoice reconciliation and audit trails.” This is a synthetic buyer note, not an actual interview. |
| Board brief | The application's Product launch decision template, submitted through Convene board. |

## Actual operations and their limits

The full journey signs up through the API, creates an owned workspace, saves a decision and verifies it after reload, uses keyboard search and modal focus, calculates and saves the financial scenario, persists a task, uploads/indexes the document and retrieves a cited passage. It submits a durable board job and checks that all **nine specialist reports** return. It also checks light/dark appearance, mobile navigation without horizontal overflow, previously viewed content in warm offline mode and rejection of an offline mutation. Two Chrome acceptance tests passed, with no page errors in the studio journey; the second checks readable marketing with reduced motion.

The acceptance environment deliberately points local model requests at an unreachable endpoint and enables local-only routing. Reports therefore carry the visible **`local-template`** source. Their persistence and execution are real; their text is a planning template and their heuristic scores do not demonstrate AI inference, factual research, measured business health or prediction quality. Knowledge retrieval uses deterministic hashed lexical ranking; the uploaded note is not independently verified evidence.

This recording does not prove every capability or external integration. Live models, Tavily research, payments, email, unattended scheduling, actual microphone capture and optional Unreal streaming require their documented configured-service checks. The video demonstrates local browser behavior, not public deployment, commercial traction, model accuracy or reference-device performance.

See [the twenty-capability matrix](../CAPABILITIES.md), [the dated validation record](../VALIDATION.md) and [the complete manual guide](../MANUAL_TEST.md) for persistence, permissions, cancellation and service-gate acceptance beyond the recorded excerpt.
