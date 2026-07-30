# Running CEO.ai — a complete guide

Written for someone who has not memorised any of this. Follow it top to bottom
the first time. After that you only need the "Every day" section.

---

## 1. What you need installed

| Thing | Why | Check it works |
|---|---|---|
| **Python 3.12+** | The backend | `python --version` |
| **Node.js 20+** | The frontend | `node --version` |
| **Git** | Version control | `git --version` |

Optional, only when you get to it:

- **Ollama** — better AI replies. Without it the app uses built-in fallbacks and works fine.
- **Unreal Engine 5.5** — only for Halcyon. Everything else works without it.
- **Redis** — only when you have real traffic.

---

## 2. First-time setup

You only do this once.

### Backend

```bash
cd backend
python -m venv .venv
```

Activate it:

- **Windows:** `.venv\Scripts\activate`
- **Mac/Linux:** `source .venv/bin/activate`

You'll know it worked because your prompt now starts with `(.venv)`.

```bash
pip install -r requirements.txt
copy .env.example .env        # Windows
cp .env.example .env          # Mac/Linux
```

Open `backend/.env` in any text editor. Change one line:

```
JWT_SECRET=change-this-to-a-long-random-string
```

Put any long random text there. It signs login tokens; anything works locally.

Leave everything else blank for now. Blank means "feature off, app still runs."

Then create the database:

```bash
alembic upgrade head
```

You should see a list of migrations running. No errors means you're done.

### Frontend

Open a **second terminal window** (leave the first one alone).

```bash
cd frontend
npm install
```

Takes a few minutes the first time.

---

## 3. Every day: starting the app

You need **two terminals running at the same time**.

**Terminal 1 — backend:**
```bash
cd backend
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # Mac/Linux
uvicorn app.main:app --reload
```

Expect to see: `Uvicorn running on http://127.0.0.1:8000`

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```

Expect to see: `Local: http://localhost:3000`

Open **http://localhost:3000** in your browser.

**To stop either:** press `Ctrl + C` in that terminal.

---

## 4. Every page, and what you should see

### `/` — Landing page

The marketing page. Animated 3D network background.

**Look for:** a small feather icon and a small moon icon in the footer. The moon
is the hidden Halcyon entrance.

### `/signup` — Create an account

Two-column card. Form on the left, nine agent cards on the right.

**Try this:** type a password slowly. Four strength bars fill as it improves.
The submit button stays disabled until 8 characters.

**What happens:** you're logged in and sent to the dashboard. A welcome email is
printed in your **backend terminal** (not actually sent, since you left
`RESEND_API_KEY` blank).

### `/login` — Sign in

Same layout, different right panel — it sells the track record rather than the
concept, because you already know what the product is.

**Try this:** click "Skip sign-in — explore a live demo". No account needed,
full app with sample data.

### `/forgot-password` and `/reset-password`

**Try this:** enter your email, submit. Look at your **backend terminal** — the
reset link is printed there. Copy it into your browser. Set a new password.
You'll be signed in automatically.

Use the link twice and the second attempt fails. That's intentional.

### `/dashboard` — The main screen

A grid of tiles. Header shows your name, plan, and board-run usage.

**Press `Cmd+K` (Mac) or `Ctrl+K` (Windows)** — a command palette opens. Type to
search commands, reports, and tasks. Arrow keys to move, Enter to run.

Click any tile to open it. The tile expands into the section.

#### Chat tile
Type or speak a business question, e.g. *"Should I build the full product now?"*

**What you'll see:** nine desks arranged in a ring. Each lights up as its
specialist files, with a score counting up. The centre tracks 3/9, 4/9… then
resolves to a consensus score. Takes 10–20 seconds.

**Response you'll get:** a CEO verdict paragraph plus nine individual reports.

#### Agent briefing tile
The nine reports as cards. Click one to open a side panel with the full summary,
numbered recommendations, and a **Share** button that copies a public link.

#### Task board tile
Tasks the board created. Tick one — it responds instantly.

#### Board & memory tile
Run a weekly review. Set a cadence (blurred behind an upgrade card on the free
plan — that's the lock working, not a bug).

#### Operations tile
The **conviction spread** — every desk as a dot on one axis. Tight band = the
floor agrees. Wide band = real disagreement, with the outliers named.

#### Track record tile
Each specialist's dated predictions. Mark them Right / Wrong / Can't tell.
Accuracy per desk builds over time.

#### Analytics tile
Twenty-two charts. In demo mode all are populated. On a real account only some
have data until you've run several sessions.

### `/settings` — Account

Change your name and password, see your plan and usage, **export all your data
as JSON**, delete your account.

### `/pricing` — Plans

€0 / €4.99 / €9.99 / €14.99. Clicking a paid plan fails until Stripe is
configured — expected.

### `/halcyon` — The hidden world

Dark, calm, deliberately unlike the rest of the app.

**Try this:** click Restless / Heavy / Flat / Clear. The whole sky shifts colour
over about 1.5 seconds.

### `/halcyon/enter` — The session

Pick a world, go in. A large microphone orb is the main interface — it listens,
answers aloud, and starts listening again automatically.

**Without Unreal running** the video panel is blank. Everything else works.

### `/r/[slug]` — Shared report

The public page from a Share button. Open it in a private window to check it
works logged-out.

### `/about-author` — Founder's note

Your portrait rendered live as monospace characters.

---

## 5. Testing the API directly

Visit **http://localhost:8000/docs** — every endpoint, with a "Try it out"
button. Useful for checking the backend without the UI.

---

## 6. Optional: better AI replies

1. Download Ollama from `ollama.com`
2. `ollama pull qwen3:8b` (about 5GB)
3. Restart the backend

The app finds it automatically. Without it, built-in fallback reports are used.

---

## 7. Unreal — only for Halcyon

**Skip this section entirely if you just want feedback on the main app.** Nothing
else depends on it.

### Step 1 — Install

Install Epic Games Launcher, then Unreal Engine **5.5**. Large download.

### Step 2 — Create the project

New Project → Games → **Blank** → **C++** (not Blueprint) → Maximum Quality →
no starter content. Name it `HalcyonWorld`.

### Step 3 — Enable plugins

Edit → Plugins. Enable **Water**, **Niagara**, **Pixel Streaming**. Restart.

### Step 4 — Renderer settings

Project Settings → Rendering:
- Dynamic Global Illumination → **Lumen**
- Reflections → **Lumen**
- Shadow Maps → **Virtual Shadow Maps**
- Default RHI → **DirectX 12**

### Step 5 — Copy the code

Copy everything from `unreal/Source/HalcyonBridge/` into your project's
`Source/HalcyonWorld/` folder.

Open `Source/HalcyonWorld/HalcyonWorld.Build.cs` and make the dependency line:

```csharp
PublicDependencyModuleNames.AddRange(new string[] {
    "Core", "CoreUObject", "Engine", "InputCore",
    "WebSockets", "Json", "JsonUtilities", "Niagara"
});
```

### Step 6 — Compile

Right-click the `.uproject` file → **Generate Visual Studio project files**.
Open the solution and build.

**Expect errors on the first try.** These files have never been compiled. Send
me the exact error text and I'll fix them. Do not continue until this builds.

### Step 7 — Build the Zen Garden

Follow `unreal/ZEN_GARDEN.md`. Roughly two weekends.

### Step 8 — Connect it

1. Start the backend and open `/halcyon/enter`, start a session
2. Browser → F12 → Application → Local Storage → copy `ceoai-auth-token`
3. In Unreal, select the `HalcyonBridge` actor, paste the token and session ID
4. Press Play, then type "I'm panicking" in the browser

**Success looks like:** over twelve seconds the wind dies, the pond goes flat,
and a breathing vignette begins.

---

## 8. Before showing anyone

```bash
cd backend && pytest -q
```
Expect: `136 passed`

```bash
cd frontend && npx tsc --noEmit && npm run build
```
Expect: no errors.

---

## 9. What to ask your 5–10 testers

Give them the URL and **say nothing else**. Watch, don't explain. Then ask:

1. What did you think this was, before you used it?
2. Where did you get stuck?
3. What did you ignore completely?
4. Would you pay €4.99 a month? If not, what would make you?
5. What would you tell a friend this does?

**The most valuable answer is question 3.** Anything nobody touched should
probably be deleted.

---

## 10. When things break

**"Backend is not reachable"** — Terminal 1 isn't running, or it crashed. Check it.

**Blank page** — check the browser console (F12). An error boundary should catch
most failures and show a message instead.

**`alembic upgrade head` fails** — delete `ceo_ai.db` and run it again. You lose
local data; that's fine at this stage.

**`npm run dev` fails** — delete `node_modules` and `.next`, run `npm install` again.

**Login works then everything 401s** — you changed `JWT_SECRET` after signing up.
Old tokens are invalid. Log out and back in.
