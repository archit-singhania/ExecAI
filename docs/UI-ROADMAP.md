# CEO.ai — Frontend UI Enhancement & Feature Roadmap

Audit date: 2026-08-14
Scope read: `frontend/` (56 source files), `backend/app/`, `docs/`, `WALKTHROUGH.md`, `README.md`

---

## Part 0 — What exists today (honest baseline)

**Stack:** Next.js 15 (App Router) + React 19 + TS 5.6 + Tailwind 3.4 + Three/Vanta.
No animation library, no headless UI library, no icon system beyond lucide,
no form library, no test runner on the frontend.

**Routes (13):** `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`,
`/dashboard`, `/settings`, `/pricing`, `/trial`, `/about-author`, `/r/[slug]`,
`/halcyon`, `/halcyon/enter`.

**Design system:** five CSS custom properties (`--color-ink`, `--color-fog`,
`--color-steel`, `--color-surface`, `--color-accent`), a Tailwind config with
five hardcoded brand hexes (`ember`, `basil`, `chartreuse`, `graphite`), and
**`globals.css` at 7,992 lines / 158 KB.**

**What's genuinely good:**
- Streaming boardroom (`boardroom-convening.tsx`) — 9 desks lighting up one at a time is a real differentiator.
- Conviction spread chart — the single best idea in the product.
- No-flash theme script in `layout.tsx`, done correctly.
- Optimistic task updates with revert-on-failure.
- Command palette that searches real data, not just menu items.
- `webgl-lock.ts` + capability gating so weak machines don't melt.
- Demo mode with realistic fallback data — removes signup friction.

---

## Part 1 — The design-system problem (fix this before anything else)

> Note: there is no `/design` route in the repo. I've read your request as
> "the design language across the app." If you actually want a `/design`
> route (a living style guide), that's **item 1.7** below — and you should
> build it, because it's the cheapest way to stop the drift described here.

### 1.1 `globals.css` is 8,000 lines and it is the core problem

You have **eleven independent, overlapping component prefixes** in one file:

| Prefix | Purpose | Approx lines |
|---|---|---|
| `.metro-tile-*` | dashboard tile v1 | ~440 |
| `.mt2-*` | dashboard tile v2 (the one actually used) | ~240 |
| `.sec-*` | section shell, cards, sheets, bars | ~330 |
| `.hal-*` | Halcyon | ~870 |
| `.bc-*` | boardroom convening (**defined twice — lines 3244 and 3453**) | ~380 |
| `.cs-*` | conviction spread | ~90 |
| `.mh-*` | metro home chrome | ~140 |
| `.cmdk-*` | command palette | ~190 |
| `.pr-*` | pricing | ~150 |
| `.toast-*`, `.set-*`, `.err-*`, `.voice-*`, `.spot`, `.gborder` | misc | ~600 |

`.metro-tile-*` looks dead — `metro-tile.tsx` only emits `mt2-*` classes. That's
~440 lines of CSS shipped to every user for nothing. `.bc-*` is defined twice with
conflicting rules; the second block wins, the first is dead weight and a trap for
the next person who edits it.

**This is why the app doesn't feel premium.** Premium feel comes from *consistency*
— identical radii, identical shadow ramps, identical easing on every surface. With
eleven hand-rolled prefixes written at different times, every screen has slightly
different corner radii, slightly different hover lift, slightly different transition
duration. Users can't name it, but they read it as "unfinished."

### 1.2 There are no design tokens, only colours

Your `:root` has 5 colours and `--corner-clearance`. Everything else — spacing,
radius, shadow, blur, easing, duration, z-index, typography scale — is hardcoded
per rule, thousands of times. Grep for `border-radius` in globals.css and you'll
find at least nine distinct values.

**Action:** define a real token layer. This is the single highest-leverage change
in the whole document.

```css
:root {
  /* Colour — keep your 5, add semantic roles */
  --color-ink: 16 19 23;
  --color-fog: 246 244 238;
  --color-steel: 96 113 124;
  --color-surface: 255 255 255;
  --color-accent: 91 122 214;

  --color-positive: 29 111 95;    /* basil  */
  --color-caution:  183 202 93;   /* chartreuse */
  --color-critical: 212 95 58;    /* ember  */

  /* Elevation — one ramp, six steps, used everywhere */
  --elev-0: none;
  --elev-1: 0 1px 2px rgb(var(--color-ink) / .04), 0 0 0 1px rgb(var(--color-ink) / .05);
  --elev-2: 0 2px 8px rgb(var(--color-ink) / .06), 0 0 0 1px rgb(var(--color-ink) / .06);
  --elev-3: 0 8px 24px rgb(var(--color-ink) / .08), 0 0 0 1px rgb(var(--color-ink) / .06);
  --elev-4: 0 18px 48px rgb(var(--color-ink) / .12);
  --elev-5: 0 32px 80px rgb(var(--color-ink) / .18);

  /* Radius — four values, no more */
  --r-sm: 6px; --r-md: 10px; --r-lg: 16px; --r-xl: 24px; --r-full: 999px;

  /* Motion — this is where premium lives */
  --e-out:    cubic-bezier(0.16, 1, 0.3, 1);      /* expo-out, the "expensive" curve */
  --e-inout:  cubic-bezier(0.65, 0, 0.35, 1);
  --e-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* overshoot, use sparingly */
  --d-instant: 90ms; --d-fast: 160ms; --d-base: 240ms;
  --d-slow: 420ms; --d-scene: 700ms;

  /* Layering — stop the z-index arms race */
  --z-base: 0; --z-raised: 10; --z-sticky: 100; --z-overlay: 200;
  --z-sheet: 300; --z-modal: 400; --z-toast: 500; --z-cursor: 999;

  /* Type */
  --t-xs: 11px; --t-sm: 13px; --t-base: 15px; --t-lg: 18px;
  --t-xl: 24px; --t-2xl: 34px; --t-3xl: 48px; --t-hero: clamp(40px, 7vw, 92px);
  --lh-tight: 1.08; --lh-snug: 1.28; --lh-base: 1.55;
  --track-tight: -0.022em; --track-wide: 0.16em;
}
```

Then wire them into `tailwind.config.ts` so `rounded-lg`, `shadow-2`, `duration-base`,
`ease-out-expo` are the only way anyone writes them.

### 1.3 Split `globals.css` into modules

```
src/styles/
  tokens.css          # the block above + .dark overrides
  base.css            # reset, body, selection, focus, scrollbars
  primitives.css      # .surface, .card, .sheet, .field, .chip, .bar, .ring
  motion.css          # every @keyframes, one reduced-motion block
  app/
    dashboard.css     # mt2-*, mh-*, sec-*
    boardroom.css     # bc-*, cs-*
    halcyon.css       # hal-*
    marketing.css     # pricing, landing
```
`globals.css` becomes ~12 lines of `@import`. Delete `.metro-tile-*` and the
duplicate `.bc-*` block in the same pass. **Expected: 8,000 → ~4,200 lines.**

### 1.4 Your font stack is contradicting itself

`layout.tsx` loads Inter (`--font-sans`) and Instrument Serif (`--font-display`).
`globals.css` line 34 sets `body { font-family: Arial, Helvetica, sans-serif; }`.

**Arial is what most of your app is actually rendering in.** Fix:

```css
body { font-family: var(--font-sans), system-ui, -apple-system, sans-serif; }
```

Then add optical treatment that people read as "expensive":

```css
body {
  font-feature-settings: "cv11", "ss01";  /* Inter's better a, g */
  font-variant-numeric: tabular-nums;      /* numbers stop jittering */
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
h1, h2, .display { font-family: var(--font-display); letter-spacing: var(--track-tight); }
.metric, .mt2-stat, .bc-desk-score { font-variant-numeric: tabular-nums; }
```

That last line alone fixes the visible number-width jitter when scores count up in
the boardroom. It's a one-line change with an outsized effect.

### 1.5 Motion audit — you have animation, not choreography

Right now most transitions are `150ms linear` (body) or bare `transition`. Linear
easing is the strongest single signal of an amateur UI. Premium products use
expo-out for entrances and stagger everything.

Rules to apply globally:
- Never `linear` except for opacity crossfades and colour temperature shifts.
- **Entrances** `var(--d-base) var(--e-out)`; **exits** `var(--d-fast)` (exits are always faster).
- **Stagger** every list: `animation-delay: calc(var(--i) * 40ms)`. You do this on
  `.metro-home-grid` with eight hardcoded `nth-child` rules — replace with a
  `--i` CSS var set inline, which works for any list length.
- One transform property per element. Don't animate `box-shadow` (paint-bound) —
  animate the opacity of a pseudo-element that carries the shadow.
- Every animation gets a `prefers-reduced-motion` opt-out. You do this in ~8 places;
  it needs to be a single global block in `motion.css`.

### 1.6 Depth model — pick one and enforce it

You currently mix glassmorphism (`.glass`, `.glass-strong`), flat Metro tiles
(`.mt2`), gradient-mesh backgrounds (`.bg-radial-ui`), scanlines, film grain,
Vanta 3D, particle fields, and cursor spotlights. That's six competing visual
languages on one screen.

**Recommendation: "quiet luxury."** Kill the scanline and the grain overlay on
dashboard surfaces (keep grain only on marketing/Halcyon). Keep one hero 3D moment
per route, never two. Make depth come from a consistent elevation ramp + a single
1px hairline border, not from blur stacking.

Concretely, one primitive replaces `.glass`, `.glass-strong`, `.sec-card`,
`.sec-panel`, `.section-panel`, `.hal-panel`, `.pr-card`, `.set-card`:

```css
.surface {
  background: rgb(var(--color-surface) / var(--surface-alpha, 1));
  border-radius: var(--r-lg);
  box-shadow: var(--elev-2);
  transition: box-shadow var(--d-base) var(--e-out), transform var(--d-base) var(--e-out);
}
.surface[data-elev="3"] { box-shadow: var(--elev-3); }
.surface[data-interactive]:hover { box-shadow: var(--elev-3); transform: translateY(-2px); }
```

### 1.7 Build a `/design` route (living style guide)

A dev-only page (`process.env.NODE_ENV !== "production"` or behind a query flag)
that renders: the full colour ramp light+dark, elevation ramp, radius scale, type
scale, every button variant × state, every form field state, all chips/pills/badges,
skeletons, empty states, toasts, and the motion curves side by side as animated bars.

Why it matters: it is the only thing that stops the drift that produced eleven CSS
prefixes. It also takes about half a day and doubles as portfolio material.

### 1.8 The small things that read as "expensive"

- **Focus rings.** You have `.premium-focus` but it isn't universal. One global
  `:focus-visible { outline: 2px solid rgb(var(--color-accent)); outline-offset: 2px; }`.
- **Selection colour** — you have this, keep it.
- **Custom scrollbars** — you style `.command-scroll` and `.sec-rail` only. Do it globally.
- **Optical alignment on icons** — lucide icons at `strokeWidth={1.9}` are good; make
  1.75 the single global default and never vary it.
- **Number transitions.** Scores should count up with a shared `useCountUp` hook and
  tabular numerals, not snap.
- **Hairlines, not borders.** `1px solid rgb(var(--color-ink) / .07)` everywhere,
  never `.2` or `.15`.
- **Text balance.** `text-wrap: balance` on every heading, `text-wrap: pretty` on
  body. Two lines of CSS, instantly more typeset.
- **Dark mode surfaces should get lighter with elevation, not darker.** Currently
  `--color-surface: 23 27 32` is flat. Add `--surface-raised` and `--surface-overlay`.
- **A real loading identity.** Replace generic spinners with skeletons shaped like
  the actual content (you have `.sec-skel` — apply it everywhere).
- **Sound (optional, off by default).** A 40ms tick when an agent files its report.
  In a voice-first product this is on-brand rather than gimmicky.

---

## Part 2 — Missing UI infrastructure

### 2.1 Component primitives that don't exist yet

You have exactly two UI primitives: `Button` (3 variants) and `Panel`. Everything
else is bespoke JSX + a bespoke CSS prefix. Build these, in this order:

| Priority | Component | Why |
|---|---|---|
| P0 | `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Field` (label+hint+error) | Auth, settings, and Halcyon all re-implement these |
| P0 | `Card` + `CardHeader/Body/Footer` | Replaces 8 card CSS prefixes |
| P0 | `Skeleton` | Loading states are inconsistent across sections |
| P0 | `EmptyState` (icon + line + action) | Currently ad-hoc per section |
| P1 | `Sheet` / `Drawer` | `.sec-sheet-*` is hardcoded to the report panel |
| P1 | `Dialog` / `Modal` | Doesn't exist — delete-account confirm needs one |
| P1 | `Tooltip` | Nothing in the app explains itself on hover |
| P1 | `Badge` / `Chip` / `Pill` | 4 different implementations today |
| P1 | `Tabs`, `SegmentedControl` | Analytics 7/30/90 selector is bespoke |
| P2 | `Popover`, `DropdownMenu` | Needed for row actions, filters |
| P2 | `Avatar`, `AvatarGroup` | For the 9 agents |
| P2 | `Table` / `DataGrid` | Track record + tasks would benefit |
| P2 | `Progress`, `Meter`, `Ring` | 3 ring implementations exist today |

### 2.2 Missing libraries worth adding

- **`framer-motion`** (or `motion`) — layout animations, shared element transitions,
  `AnimatePresence` for exits. Your tile→section "grows from where it was" effect is
  hand-rolled via `originRect`; `layoutId` does it in three lines and correctly.
- **`radix-ui` primitives** — accessible Dialog/Popover/Tooltip/Tabs for free. You are
  currently shipping custom focus-trap and Escape handling that will have gaps.
- **`sonner`** — or keep your toaster, it's fine.
- **`cmdk`** — your palette is good; only swap if you want fuzzy scoring.
- **`recharts`** or **`visx`** — 22 charts hand-drawn in SVG is impressive but expensive
  to maintain. At minimum extract a shared axis/scale/tooltip layer.
- **`zod` + `react-hook-form`** — auth forms currently validate ad-hoc.

### 2.3 Frontend quality gates that are missing entirely

- No `prettier` config, no `stylelint`. Add both; stylelint with
  `declaration-property-value-allowed-list` can *enforce* the token system.
- No component tests. Add Vitest + Testing Library for `metro-tile`, `command-palette`,
  `boardroom-convening`, `task-board`.
- No Playwright E2E. Four flows worth covering: signup→dashboard, demo mode,
  run a board session, complete a task.
- No Storybook. Optional if you build `/design` instead.
- No bundle analysis. `@next/bundle-analyzer` — you ship Three.js + Vanta
  (~600 KB) and should verify it's actually lazy.
- No `next/image` usage — `public/` has raw PNGs and a `.MOV`. That `.MOV` should
  be an H.264/WebM `<video>` with a poster frame.

### 2.4 Accessibility gaps (these also block "premium")

- `role="dialog"` + `aria-modal` + focus trap + focus restore on `.sec-sheet` and
  the command palette.
- `aria-live="polite"` on the boardroom counter so screen readers hear "3 of 9".
- Charts have no text alternative — every chart needs a `<figcaption>` or a
  visually-hidden data table.
- Colour-only status encoding (green/blue/yellow/ember conviction rings) fails for
  colourblind users — add a shape or numeral.
- Verify contrast: `--color-steel: 96 113 124` on `--color-fog` is ~3.9:1, which
  **fails WCAG AA for body text**. Darken to roughly `72 88 99`.
- Skip-to-content link. Doesn't exist.
- Keyboard nav through the metro grid should be arrow-key roving tabindex, not tab-through-all.

### 2.5 Performance

- `globals.css` at 158 KB is **render-blocking on every route**. Splitting it (1.3)
  and letting Next inline only critical CSS is worth a large LCP win.
- Vanta + Three should be `next/dynamic` with `ssr: false` **and** only mounted on
  viewport intersection.
- `scene-field.tsx` is 28.5 KB in one file — split it.
- Add `content-visibility: auto` to below-fold sections.
- Route-level `loading.tsx` files — you have `error.tsx` for four routes but no
  `loading.tsx` anywhere, so navigations feel dead.
- Analytics renders 22 charts at once. Virtualise or lazy-mount on scroll.

---

## Part 3 — New features worth building

Grouped by how much they strengthen the product's core claim: *"nine specialists,
one verdict, and a record of who was right."*

### 3.1 Highest value — deepen the differentiator

**1. Desk dissent view.** When the conviction spread is wide, show the actual
disagreement: pull the two outlier agents' reasoning side by side and let the CEO
agent adjudicate on demand. This is the most interesting thing your data already
contains and you currently only show it as a number.

**2. Ask a desk directly.** Click any of the 9 agents → a focused single-agent
thread, with that agent's history and past accuracy in the header. Backend already
has per-agent structure; this is mostly frontend.

**3. Decision journal / timeline.** A vertical, filterable timeline of every
decision: goal → verdict → tasks spawned → predictions made → predictions resolved.
This is what makes the product feel like an operating system rather than a chat app.
`decision-tree.tsx` exists but isn't wired into the tab set.

**4. Calibration report card.** You have `/api/predictions/calibration`. Build the
proper reliability diagram (predicted probability vs observed frequency, perfect
calibration diagonal, Brier score per desk). This is genuinely rare in consumer
products and is the strongest thing to put in front of an interviewer.

**5. Scenario comparison.** Run the same board on two framings ("build now" vs
"validate first") and diff the nine verdicts side by side. High perceived value,
moderate backend work.

**6. What changed since last board.** A diff view between consecutive board runs on
the same session: which desks moved, by how much, and why. Drives the weekly return visit.

### 3.2 Retention & habit

**7. Weekly digest email with real design.** Backend has `run-weekly-digests`. The
email itself is the retention mechanic and currently plain.

**8. Board run scheduling UI beyond weekly** — monthly, on-milestone, on-task-slip.

**9. Nudges / risk alerts feed.** "Marketing has been your least accurate desk 4
months running." "3 predictions are due this week." Surfaced on the dashboard home.

**10. Streaks / momentum meter** for board cadence — light touch, no gamification cheese.

### 3.3 Collaboration & sharing

**11. Multi-user workspaces.** Invite a cofounder; roles (owner / member / viewer).
This is the biggest structural gap and the main thing that turns €4.99 into €29.

**12. Comments and @mentions on reports.**

**13. Better public share pages.** You have `/r/[slug]`. Add OG image generation
(`next/og`), a proper reading layout, and a "run your own board" CTA — it's a free
acquisition channel.

**14. Export to PDF / Notion / Slack.** JSON export exists; nobody reads JSON.
A designed PDF of a board verdict is a shareable artefact.

### 3.4 Input & integrations

**15. Document upload as context.** Drop a pitch deck / P&L / competitor list and let
the desks read it. Backend has pgvector already — this is the highest-value
integration relative to effort.

**16. Connect real data.** Stripe revenue, Google Analytics, GitHub velocity → the
health score and runway stop being fictional. This is what makes the product credible.

**17. Slack bot.** `/board should we raise now?` → verdict in-channel.

**18. Mobile.** `MobileTabBar` exists but the metro grid, sheets, and charts are
desktop-shaped. A proper responsive pass + PWA manifest + install prompt.

### 3.5 Product surface

**19. Onboarding that asks about the business.** Currently a tour. Ask 4 questions
(stage, sector, team size, biggest risk) and the first board run is dramatically better.

**20. Templates gallery.** "Pricing decision", "Should I hire?", "Fundraise timing",
"Kill or persevere". Removes the blank-page problem, which is your biggest activation risk.

**21. In-app changelog + feature flags UI.**

**22. Search across everything** (Cmd+K already exists — extend it to memories,
predictions, and past verdicts with real ranking).

**23. Settings expansion:** notification preferences, timezone, default board
composition (turn desks on/off), LLM model preference, API keys for BYO-key users.

**24. Admin/observability page:** LLM cost per session, latency per desk, error rates.
`llm_router.py` and `jobs.py` already produce this data.

---

## Part 4 — Action plan

Sequenced so nothing later blocks on anything earlier.

### Sprint 1 — Foundation (3–4 days) · *do not skip*

| # | Task | Files |
|---|---|---|
| 1.1 | Write `src/styles/tokens.css` per §1.2 | new |
| 1.2 | **Fix the Arial bug** — `body { font-family: var(--font-sans) }` | `globals.css:34` |
| 1.3 | Add `font-variant-numeric: tabular-nums` to all metric classes | `globals.css` |
| 1.4 | Delete `.metro-tile-*` (~440 lines, dead) | `globals.css` |
| 1.5 | Delete the duplicate `.bc-*` block at line 3244 | `globals.css` |
| 1.6 | Split `globals.css` into `src/styles/*` per §1.3 | new |
| 1.7 | Map tokens into `tailwind.config.ts` (radius, shadow, duration, easing, z) | `tailwind.config.ts` |
| 1.8 | One global `prefers-reduced-motion` block; delete the 8 scattered ones | `motion.css` |
| 1.9 | Global `:focus-visible`, custom scrollbar, `text-wrap: balance/pretty` | `base.css` |
| 1.10 | Fix `--color-steel` contrast to pass AA | `tokens.css` |
| 1.11 | Add prettier + stylelint, wire into `npm run lint` | root |

**Definition of done:** `npm run build` clean, `npx tsc --noEmit` clean, visual
regression by eye on all 13 routes, globals.css under 4,500 total lines across modules.

### Sprint 2 — Primitives (4–5 days)

| # | Task |
|---|---|
| 2.1 | Install `framer-motion` + `@radix-ui/react-{dialog,popover,tooltip,tabs}` |
| 2.2 | Build `Surface`/`Card` and migrate `.sec-card`, `.pr-card`, `.set-card`, `.hal-panel` onto it |
| 2.3 | Build `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`; migrate auth + settings |
| 2.4 | Build `Skeleton` + `EmptyState`; apply to all 7 dashboard sections |
| 2.5 | Rebuild `.sec-sheet` on Radix Dialog (gets focus trap, Escape, restore for free) |
| 2.6 | `Tooltip` + `Badge` + `SegmentedControl` |
| 2.7 | `useCountUp` hook; apply to every score, health, runway, conviction number |
| 2.8 | Replace `originRect` tile→section animation with `framer-motion` `layoutId` |
| 2.9 | Add `loading.tsx` to `/dashboard`, `/settings`, `/pricing`, `/halcyon` |

### Sprint 3 — `/design` + polish pass (2–3 days)

| # | Task |
|---|---|
| 3.1 | Build the `/design` route per §1.7 |
| 3.2 | Motion choreography audit: stagger via `--i`, expo-out entrances, fast exits |
| 3.3 | Depth cleanup: remove scanline + grain from dashboard, one 3D moment per route |
| 3.4 | Dark-mode elevation ramp (`--surface-raised`, `--surface-overlay`) |
| 3.5 | Icon stroke-width standardised to 1.75 everywhere |
| 3.6 | A11y sweep: aria-live on boardroom, chart alt text, skip link, roving tabindex on grid |
| 3.7 | Perf: bundle analyzer, intersection-mount Vanta, split `scene-field.tsx`, `content-visibility` |

### Sprint 4 — Feature wave 1 (1–2 weeks)

Ship in this order — each one is independently demoable:

1. **Templates gallery** (§3.5-20) — biggest activation win, smallest effort.
2. **Ask a desk directly** (§3.1-2).
3. **Desk dissent view** (§3.1-1).
4. **Decision journal** (§3.1-3) — wire up the orphaned `decision-tree.tsx`.
5. **Calibration report card** (§3.1-4).
6. **OG images + redesigned `/r/[slug]`** (§3.3-13).

### Sprint 5 — Feature wave 2 (2–3 weeks)

7. **Document upload as context** (§3.4-15) — highest value/effort ratio in the doc.
8. **PDF export of a board verdict** (§3.3-14).
9. **What changed since last board** (§3.1-6).
10. **Mobile responsive pass + PWA** (§3.4-18).
11. **Multi-user workspaces** (§3.3-11) — largest, do last, changes the data model.

### Continuous

- Vitest on every new primitive.
- Playwright on the four core flows before any deploy.
- Keep `/design` current — if a component isn't on it, it doesn't exist.

---

## Part 5 — The five things to do first

If you only do five things this week:

1. **Fix the Arial bug.** One line. Your entire app is rendering in the wrong typeface.
2. **`font-variant-numeric: tabular-nums` on metrics.** One line. Kills number jitter.
3. **Delete `.metro-tile-*` and the duplicate `.bc-*` block.** ~800 dead lines.
4. **Write `tokens.css` and replace `linear` easing with expo-out.** This is 80% of
   what people mean by "premium feel."
5. **Fix `--color-steel` contrast.** Accessibility and legibility in one change.
