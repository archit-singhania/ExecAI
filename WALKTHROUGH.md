# CEO.ai — the complete walkthrough

Every screen, every button, what happens behind it, and what should appear.
Written assuming you know nothing about the code.

Read `RUNNING.md` first for setup. This document is what to do *after* it starts.

---

## Part 1 — The mental model

Three separate programs:

**The backend** (Python, port 8000). Holds all data, runs the nine AI agents,
decides everything. You never look at it directly, but it prints useful things.

**The frontend** (Next.js, port 3000). Everything you see. It asks the backend
for data and draws it.

**Unreal** (optional, not built yet). A 3D world for Halcyon. Everything else
works without it.

When the frontend needs something it sends a **request**. The backend sends back
a **response**. If the backend isn't running, the frontend shows
*"Backend is not reachable yet."*

---

## Part 2 — Every screen

### 2.1 — `/` Landing page

**What you see:** dark hero, animated 3D network drifting behind the text. Nav
at top. In the footer, two small circular icons: a **feather** and a **moon**.

**What to do:** click the moon. That's the hidden Halcyon entrance — most people
will never find it, which is intentional.

**Behind the scenes:** nothing. Static page, no backend needed.

**If the 3D is missing:** you're on a machine with fewer than 4 CPU cores, a
touchscreen, or a narrow window. The app disables WebGL there on purpose.

---

### 2.2 — `/signup`

**What you see:** a wide card split in two. Left is the form. Right is a dark
panel with nine agent tiles that fade in one after another.

**What to do:**
1. Type a name, an email, a password
2. Watch the four strength bars as you type — they go ember → amber → blue → green
3. The button is disabled until 8 characters

**Request:** `POST /api/auth/signup` with your name, email, password.

**Response:** an access token plus your user record. The frontend stores the
token in browser localStorage and redirects to `/dashboard`.

**Also happens:** a welcome email is generated. Because `RESEND_API_KEY` is
blank, it's **printed in your backend terminal** inside a box of `=` characters.
That is correct behaviour, not a failure.

**Common problem:** *"Email already registered"* — you signed up with that
address before. Use `/login` or a different email.

---

### 2.3 — `/login`

**What you see:** same card, but the right panel says something different —
*"Nine specialists. One verdict. And a record of who was right."* with three
ticked lines. A returning user already knows what the product is, so it sells
the track record instead.

**What to do:** sign in, or click **"Skip sign-in — explore a live demo"**.

Demo mode gives you the whole app filled with realistic sample data and saves
nothing. **This is what you should show most testers.**

**Request:** `POST /api/auth/login`.
**Response:** token + user, same as signup.

**Common problem:** you log in, then everything fails with 401. That means you
changed `JWT_SECRET` in `.env` after creating the account. Old tokens are now
invalid. Log out, log back in.

---

### 2.4 — `/forgot-password` → `/reset-password`

**What to do:**
1. Enter your email, submit
2. Screen changes to "Check your inbox"
3. **Look at your backend terminal.** A line starting `[email] Link:` contains
   the reset URL
4. Copy that URL into your browser
5. Set a new password twice, submit

**You are signed in automatically** — no second login step.

**Request 1:** `POST /api/auth/forgot-password`
**Response 1:** always *"If that email has an account, a reset link is on its way."*
even for addresses that don't exist. That's deliberate — otherwise anyone could
test which emails have accounts here.

**Request 2:** `POST /api/auth/reset-password` with the token and new password.

**Try this:** use the same link twice. The second attempt fails. Links are
single-use and expire after an hour.

---

### 2.5 — `/dashboard` — the home grid

**What you see:** a header and a grid of tiles.

**Header, left to right:** logo, your initial in a square, your name and email.

**Header, right:** a pill showing your plan and a usage bar (`3/20`), then
Health / Runway / Open counts, then Settings and Log out.

The usage bar turns ember when you're near your monthly limit.

**The tiles:** Chat (large), Agent briefing, Task board, Board & memory,
Operations, Analytics, Track record, Health, Runway, Start new session.

Each shows a real number, some a sparkline or progress bar. Hover: the tile
lifts 3px, a soft light follows your cursor, an arrow slides in, and a coloured
line grows along the bottom.

**Press `Ctrl+K` or `Cmd+K`:** a command palette opens. Type two or more letters
and it searches your actual reports and tasks, not just menu items. Arrow keys
move, Enter runs, Escape closes.

**Request on load:** `GET /api/dashboard` and `GET /api/billing/me`.
**Response:** your active session, tasks, reports, health score, plan, usage.

---

### 2.6 — The Chat tile

**Click it.** The tile expands into the section — it grows from where it was
rather than the screen swapping.

**What you see:** a large microphone orb, a status line, and a text box.

**What to do:** type something real, like
*"Should I build the full product now or validate first?"*

**What happens over the next 10–20 seconds:**

1. A ring of nine desks appears, all dark and grey
2. One at a time, each desk **snaps to colour, lifts slightly, and its score
   counts up** as that specialist finishes
3. The centre counts `1/9`, `2/9`, `3/9`…
4. When all nine are in, the centre resolves to a consensus score
5. The CEO's verdict paragraph appears below

**This is the thing to show people.** It's the part no competitor has.

**Request:** `POST /api/sessions` (first time only, creates the session), then
`POST /api/sessions/{id}/messages/stream`.

**Response:** a *stream* — nine separate `agent_report` events as each finishes,
then a `done` event with the final verdict. That's why the desks light up one at
a time rather than all at once.

**If a desk stays dark longer than the others**, that specialist is slow. You
can see exactly which one. That's honest, and more interesting than a spinner.

**Common problem:** *"You've used all 20 board runs this month"* — free tier
limit. Expected.

---

### 2.7 — Agent briefing tile

**What you see:** nine cards, each with an agent icon, name, headline,
two-line summary, and a **coloured ring** showing conviction.

Ring colours: green ≥85, blue 70–84, yellow-green 50–69, ember below 50.

**What to do:** click any card. A panel slides in from the right.

**Inside the panel:** the score ring, full summary, numbered recommendations,
and a **Share** row.

**Click Share:** a public link is created and copied to your clipboard.
On a free account this shows as a lock instead.

**Request on click:** `GET /api/reports/{id}` and `GET /api/reports/{id}/export`.
**Share request:** `POST /api/share/reports/{id}`
**Share response:** `{ slug, url }` — the URL is now live to anyone.

**Press Escape** to close the panel. Focus returns to the card you opened.

---

### 2.8 — Task board tile

**What you see:** progress meter at the top, four filter buttons with counts,
then task cards.

**What to do:** click a checkbox. It fills in **instantly** — the app doesn't
wait for the server. If the save fails it reverts and shows an error toast.

**Request:** `PATCH /api/tasks/{id}` with `{"status": "Done"}`.

**Note:** above 60 tasks the list switches to virtual scrolling — only visible
rows render. You won't notice unless you have that many.

---

### 2.9 — Board & memory tile

**What you see:** a dark verdict card, then three cards below — review cadence,
board history, memory search.

**On the free plan the cadence card is blurred** with an unlock card over it.
That is the feature lock working correctly.

**What to do (paid or demo):** pick Weekly, choose a day and hour. It saves as
you click.

**Request:** `PUT /api/review-schedule`.

**What this actually does:** if you set up the cron job, the board runs a review
on that schedule and emails you the verdict — whether or not you open the app.
That's the retention mechanic.

**Memory search:** type a word, submit. Searches decisions stored across sessions.

---

### 2.10 — Operations tile

**What you see:** an opportunity ring, four metrics, a dark executive verdict,
then the **conviction spread**.

**The conviction spread is the most important chart in the product.** Every desk
is a dot on one 0–100 axis. The coloured band is the range between lowest and
highest. A vertical line marks the mean.

- **Tight band** = the floor agrees
- **Wide band** = genuine disagreement, and that's where the risk is

Underneath, the two outliers are named: *"Most sceptical: Marketing, 58, −16"*.

Beneath that: conviction bars per desk and the roadmap.

---

### 2.11 — Analytics tile

**What you see:** four metrics, a 7/30/90-day selector, then twenty-two charts.

In **demo mode** every chart is populated. On a **real account** only some have
data until you've run several sessions — the rest wait for their source.

Charts with real data today: conviction over time, average score by desk, task
flow, prediction accuracy, score distribution, message volume, activity heatmap,
task priority, task status, completion gauge, confidence-vs-outcome.

**The one worth understanding:** *Confidence against outcome*. Each dot is a
prediction — how confident the agent was (left to right) against whether it came
true (bottom to top). **Dots in the top-right are earned confidence. Dots in the
bottom-right are overconfidence.**

---

### 2.12 — Track record tile

**What you see:** board accuracy, open calls, and per-desk accuracy bars.
Then a list of predictions with dates.

**What to do:** find one marked "due now" (ember border) and click **Right**,
**Wrong**, or **Can't tell**.

**Request:** `PATCH /api/predictions/{id}`.

**Why this matters:** every session commits each specialist to a dated,
falsifiable claim. Over months you learn which desks to trust. No competitor can
copy this quickly, because it needs history.

"Can't tell" voids the prediction rather than counting it against the agent.

---

### 2.13 — `/settings`

Five cards: profile name, password change, plan and usage, data export, delete
account.

**Export:** downloads a JSON file with everything — sessions, messages, reports,
tasks, memories, review settings. `GET /api/account/export`.

**Delete:** needs your password *and* typing `DELETE`. Refuses if you have an
active subscription, and tells you to cancel first — otherwise you'd delete the
account and keep being charged.

---

### 2.14 — `/pricing`

Four cards: €0 / €4.99 / €9.99 / €14.99. Pro is highlighted.

**Clicking a paid plan fails** until Stripe keys are in `.env`. Expected.

`GET /api/billing/plans` — works without Stripe, returns `billing_enabled: false`.

---

### 2.15 — `/halcyon`

**Completely different feel** — dark, slow, lots of empty space. Deliberate.

**What to do:** click **Restless**, **Heavy**, **Flat**, **Clear**. The whole
sky shifts colour over about 1.5 seconds and a line of prose responds.

That's a live demonstration of the core idea: the world answers in weather, not
advice.

Eight world cards below. Their preview gradients are **computed from the same
data the engine uses** — time of day, warmth, fog — so they can't drift apart.

---

### 2.16 — `/halcyon/enter`

**What you see:** world picker on the left, launch console on the right with a
fidelity selector (1080p / 1440p / 4K).

**Click "Go in".** `POST /api/halcyon/sessions`.

**Then:** a video panel (blank without Unreal), and below it a **large
microphone orb**.

**What to do:** tap the orb and speak. It listens (teal, breathing), thinks
(spinning arc), answers aloud (coral, pulsing), then **listens again
automatically**. You never touch the screen twice.

Typing is behind a "Type instead" chip — deliberately secondary.

**Request:** `POST /api/halcyon/sessions/{id}/turn` with your words.
**Response:** a reply line, an affect reading, and a full environment command —
wind, water, fog, brightness, warmth, companion, invitation.

**Try saying "I can't stop spiralling."** Watch the readouts underneath: wind and
water drop to near zero, breathing turns on. The world does *less*, not more.

---

### 2.17 — `/r/[slug]` — shared report

The public page from a Share button. **Open it in a private window** to check it
works logged out. Has proper preview metadata for social sharing.

---

### 2.18 — `/about-author`

Your portrait rendered live as monospace characters, using dithering and
auto-levels. Beside it, a founder's note in a code-editor frame.

---

## Part 3 — Complete API list

Visit **http://localhost:8000/docs** for an interactive version.

**Auth:** signup, login, me, forgot-password, reset-password
**Account:** profile, password, export, delete
**Sessions:** create, list, get, messages, messages/stream
**Reports:** get, export, board-meeting, board-meetings
**Tasks:** list, update
**Memory:** list, search
**Predictions:** list, resolve, calibration
**Analytics:** overview
**Billing:** plans, me, checkout, portal, webhook
**Share:** create, revoke, view
**Jobs:** board-run, status
**Halcyon:** worlds, sessions, turn, end, preferences, support, delete, ws
**Internal:** run-due-reviews, run-weekly-digests

---

## Part 4 — What every Unreal file does

All in `unreal/Source/HalcyonBridge/`. **None have been compiled yet.**

| File | What it does |
|---|---|
| `HalcyonBridge.h/.cpp` | The core. Opens a WebSocket to the backend, receives world snapshots, smoothly eases from current state to target. Auto-reconnects. |
| `HalcyonSkyDirector.h/.cpp` | Sun angle, colour temperature, brightness, fog, wind, bloom, rain/snow. The biggest visual file. |
| `HalcyonWaterDirector.h/.cpp` | Wave height, speed, surface roughness. Still water reads as calm more reliably than warm light does. |
| `HalcyonAudioDirector.h/.cpp` | Ambience and music, crossfading over the same duration as the visual transition. |
| `HalcyonCompanion.h/.cpp` | The animal or figure. Distant / approach / settle / lead. Never closes past a set distance. |
| `HalcyonPlace.h/.cpp` | Somewhere the world can invite you. Lights up slowly. Never a quest marker. |
| `HalcyonPawn.h/.cpp` | You. Slow walk, no jump, camera with weight, breathing field of view. |
| `HalcyonGradeDirector.h/.cpp` | Colour grading per world. **Matters more than resolution** for looking cinematic. |
| `HalcyonQualityDirector.h/.cpp` | Resolution presets and streaming bitrate together. |
| `HalcyonGameMode.h/.cpp` | Connects a running instance to your session. |
| `HalcyonStreamLink.h/.cpp` | Receives session handover from the browser. |
| `HalcyonBridge.Build.cs` | Tells Unreal which engine modules to link. |

Docs: `unreal/README.md` (setup), `unreal/ZEN_GARDEN.md` (building the world).

---

## Part 5 — Unreal, step by step

**Skip this unless you specifically want the 3D world.** Everything else works
without it.

1. **Install** Epic Games Launcher, then Unreal Engine **5.5**.
2. **New project:** Games → Blank → **C++** → Maximum Quality → no starter content. Name it `HalcyonWorld`.
3. **Plugins:** enable Water, Niagara, Pixel Streaming. Restart.
4. **Rendering settings:** Lumen for GI and Reflections, Virtual Shadow Maps, DirectX 12.
5. **Copy** all files from `unreal/Source/HalcyonBridge/` into `Source/HalcyonWorld/`.
6. **Edit** `HalcyonWorld.Build.cs` to add `"WebSockets", "Json", "JsonUtilities", "Niagara"`.
7. **Compile.** Right-click the `.uproject` → Generate project files → build.

   **Expect errors.** These files have never been through a compiler. Send me the
   exact error text. **Do not continue until this builds clean.**

8. **Build the level** following `ZEN_GARDEN.md`. Two weekends, realistically.
9. **Place the actors:** Bridge, SkyDirector, AudioDirector, WaterDirector, GradeDirector, QualityDirector. Assign your sun, fog, sky light in each Details panel.
10. **Set the Game Mode** to a Blueprint made from `AHalcyonGameMode`.
11. **Input:** Project Settings → Input → add axes `MoveForward`, `MoveRight`, `Turn`, `LookUp`.
12. **Connect:** start a session at `/halcyon/enter`, copy `ceoai-auth-token` from browser devtools (F12 → Application → Local Storage), paste it and the session ID into the Bridge actor, press Play.

**Success:** type "I'm panicking" in the browser. Over twelve seconds the wind
dies, the pond goes flat, and a breathing vignette starts.

---

## Part 6 — Your feedback session

**Before:**
```bash
cd backend && pytest -q                       # expect 136 passed
cd frontend && npx tsc --noEmit && npm run build
```

**Give testers the demo link** — `/login` → "Skip sign-in". No account friction.

**During: say nothing.** Don't explain, don't guide, don't defend. Watch where
they pause, where they scroll past, what they click twice.

**After, ask five questions:**

1. Before you clicked anything, what did you think this was?
2. Where did you get stuck or confused?
3. What did you ignore completely?
4. Would you pay €4.99 a month? If not, what would change that?
5. How would you describe this to a friend?

**Question 3 is the important one.** Anything nobody touched should probably be
deleted. Question 5 tells you whether your positioning survives contact.

**Write down what they *did*, not what they *said*.** People are polite about
products and honest with their hands.
