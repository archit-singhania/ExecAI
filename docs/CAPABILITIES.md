# Twenty-capability acceptance matrix

All rows describe connected product flows, not mock analytics. “Configured service” means code is implemented but live third-party acceptance needs credentials or infrastructure. Local fallback reports are visibly labeled.

| # | Capability | Implemented path and acceptance | Boundary |
| --- | --- | --- | --- |
| 1 | Durable nine-specialist runs | Boardroom → durable job → nine source-labeled reports → persisted verdict; backend and Chrome workflow | Provider-free acceptance uses planning templates |
| 2 | Cancel, retry, reconnect | Job controls, persisted events, active run restoration, expired-lease recovery, conditional cancellation and atomic final-result persistence | In-flight provider HTTP calls finish; a cancellation that wins before finalization prevents the canonical result |
| 3 | Multiple company workspaces | Create/rename/archive/restore and structured company context; memberships and isolation tests | Active company limits follow the account plan |
| 4 | Reusable board templates | Built-in decision structures and workspace-saved briefs populate the prompt | Templates are question structures, not fabricated company data |
| 5 | Inspectable research | Saved URLs, excerpts and timestamps; optional Tavily search | Live search needs `RESEARCH_API_KEY`; original claims must be inspected |
| 6 | Document ingestion and citations | PDF/TXT/MD/CSV extraction, scoped chunks, passage IDs and board retrieval context | Hashed lexical vectors; no neural semantic quality claim |
| 7 | Specialist follow-up/debate | One specialist response, optional independent critique; saved source-labeled discussion | Configured model required for substantive generative debate; local templates are labeled |
| 8 | Dissent and alternatives | Lowest/highest specialist assessments, reasons and explicit score spread | Heuristic/model assessments are not measured probabilities |
| 9 | Versioned decision ledger | Rationale, alternatives, assumptions, owner/review date; conflict checks and prior snapshots | People approve actual decisions |
| 10 | Scenario comparison | Saved scenarios displayed side-by-side with derived burn/runway/CAC/LTV ratio | Uses entered assumptions, not a financial forecasting guarantee |
| 11 | Interactive financial sensitivity | Live cost slider and persisted scenario outputs; numerical and validation tests | Undefined values are labeled rather than fabricated |
| 12 | Persistent task boards | Priorities, assignment, due dates, dependency validation/cycle rejection and status columns | Click-based editing; no drag-and-drop claim |
| 13 | OKRs and KPI history | Objective grouping, target/current values, owner/review date, prior observations and target notices | Values are entered by workspace users |
| 14 | Forecast calibration | Selected-workspace forecasts, outcome resolution and scoped calibration; shared viewers can read, editors can resolve | Resolution evidence is entered by users; classic account view remains an owned-workspace aggregate |
| 15 | Timezone-aware reviews | Saved IANA timezone, DST math, scheduled review endpoint and manual review | External cron and email provider required for unattended delivery |
| 16 | Voice/captions/playback | Studio VoiceStage starts durable runs; text captions, mute and browser/server playback | Browser support and microphone permissions vary; real microphone capture not automated |
| 17 | Roles/comments/activity | Owner/editor/viewer checks, colleague membership, comments, recipient-only mentions and activity | Colleagues must already have an account; no fake email invitations |
| 18 | Exports/revocable links | Real Markdown/PDF downloads and existing public link create/revoke | Export plan gates apply; workspace owners control public links |
| 19 | Search/offline viewed work | Scoped search across records/reports/tasks; session-only cache for previously viewed reports/messages/tasks | Warm offline reading only; cold app startup and offline mutations are not supported |
| 20 | Routing/budgets/traces | Server/privacy controls, preferred provider, token cap, persisted source trace, actual plan usage | Provider “configured” is not a health check; served counters reset on server restart; no invented dollar costs |

Additional verification covers account export/deletion, password revocation, untrusted mutation origins, task ownership and populated-schema migration preservation. Design acceptance includes light/dark/system appearance, responsive navigation, keyboard modal trapping/restoration and reduced motion. PostgreSQL CI smoke and live integration gates are documented in `RELEASE.md`.

The refreshed interaction layer adds original layered glass highlights, a floating navigation rail and toolbar, larger touch controls, keyboard-contained mobile navigation, and persisted reduced-motion/transparency/high-contrast preferences. Documents, evidence and long reports keep readable surfaces. The public sharing dialog exposes the real link even when clipboard access is denied; ownership controls match the server permissions.

Dependency verification is a separate foundation: the 5 October refresh has zero production audit findings, while the full audit retains 11 high entries from one unresolved development-tool advisory. See [the dated validation record](VALIDATION.md) and [release gate](RELEASE.md); this does not change the twenty product capability scopes above.
