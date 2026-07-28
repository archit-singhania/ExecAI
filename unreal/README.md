# Halcyon — Unreal prototype

Everything here runs on your machine for £0. No GPU cloud, no hosted STT/TTS,
no paid API. The only thing you cannot do for free is let *other people* use it
— that needs a GPU server, and it's the one line item worth postponing until
the demo is good.

---

## What's in this folder

```
unreal/
└── Source/HalcyonBridge/
    ├── HalcyonBridge.Build.cs     module dependencies
    ├── HalcyonBridge.h/.cpp       WebSocket transport + state interpolation
    ├── HalcyonSkyDirector.h/.cpp  sun, sky, fog, wind, post, precipitation
    ├── HalcyonAudioDirector.h/.cpp ambience + music crossfading
    └── HalcyonCompanion.h/.cpp    the animal that shares the world
```

The bridge holds the connection and the state. The three directors read that
state and translate it into engine units. None of them decide anything —
every decision about what the world does is made server-side in
`backend/app/halcyon/planner.py`.

That separation is the whole architecture. You can rewrite the planner, swap
the rules for an LLM, or change the entire emotional model without opening
Unreal once.

---

## Project setup

**1. Create the project.** UE 5.4 or 5.5, C++ project, Blank template, Maximum
quality, no starter content.

**2. Add the module dependencies.** Either use the supplied `Build.cs` as a
separate module, or add these to your existing `<Project>.Build.cs`:

```csharp
PublicDependencyModuleNames.AddRange(new string[] {
    "Core", "CoreUObject", "Engine", "InputCore",
    "WebSockets", "Json", "JsonUtilities", "Niagara"
});
```

**3. Copy the source files** into `Source/<Project>/`, regenerate project
files, and build.

---

## Placing the actors

Four things go in the level. This is the entire integration.

**`AHalcyonBridge`** — one per level. Set `SessionId` and `AuthToken`. During
development just paste them from the browser's localStorage
(`ceoai-auth-token`) after starting a session. Everything else auto-finds it.

**`AHalcyonSkyDirector`** — one per level. In the Details panel assign your
Directional Light, Sky Light, Exponential Height Fog, Wind Directional Source,
Post Process Volume, and optionally rain/snow Niagara components. Leave the
Bridge field empty and it finds the bridge itself.

It then drives, every frame:

| State | Becomes |
|---|---|
| `TimeOfDay` | Sun pitch, with a horizon fade so night isn't a grey day |
| `Warmth` | Light colour temperature, 8500K → 2400K, plus fog inscatter |
| `Brightness` | Sun and Sky Light intensity |
| `Fog` | Height fog density and volumetric extinction |
| `Wind` | Wind source strength and speed; foliage follows for free |
| `Bloom` | Post process bloom intensity |
| `bBreathingGuide` | Slow vignette pulse at `BreathingPaceSeconds` |
| `Weather` | Activates and scales rain/snow Niagara systems |

Every mapping constant is exposed as a `UPROPERTY` under Tuning, because scene
scale differs per project and you'll want to tune fog against your actual
Zen Garden rather than against my guesses.

**`AHalcyonAudioDirector`** — one per level. Fill `AmbienceLibrary` and
`MusicLibrary` with key/sound pairs. Keys must match the server vocabulary
exactly: `birdsong`, `surf`, `rain_on_glass`, `wind_in_pines`, `water_trickle`,
`night_insects` for ambience; `soft_piano`, `low_drone`, `warm_strings` for
music.

It runs two audio components per channel and crossfades between them over the
same duration as the environment transition. When the world takes twelve
seconds to go still, the surf takes twelve seconds to fade with it. A sound
that snaps while the light eases will break the illusion faster than any
visual error.

**`AHalcyonCompanion`** — one per animal you want available. Set `CompanionId`
to match the server vocabulary (`dog`, `cat`, `deer`, `sea_turtle`, `koi`,
`monk`). Each actor hides itself unless the server names it. Subclass it as a
Blueprint and implement `OnCompanionStateChanged` to swap animations;
`GetCurrentSpeed()` drives a locomotion blendspace.

It handles the four server states — distant, approach, settle, lead — and
never closes past `ApproachDistance`. That default is deliberate. Nothing in
this world should demand attention, and an animal that walks into your face
is a demand.

---

## A note on the C++

This is written against UE 5.4/5.5 APIs. Expect one or two signature
adjustments on first compile — the most likely candidates are
`SetFogInscatteringColor` and `IsRealTimeCaptureEnabled`, both of which have
moved across recent engine versions. The logic is sound; the API surface may
need a nudge.

---

## Graphics — the part you asked about

**You do not need to make any art.** This is the thing most people get wrong
about Unreal. Photoreal environments are an assembly job, not a modelling job.

**Fab (formerly Quixel Megascans)** — the entire Megascans library is free for
use in Unreal Engine. Thousands of photoscanned rocks, cliffs, forest floors,
tree bark, moss, sand, gravel, foliage. This is the same library used in film
and AAA production. Zen garden stones, forest ground, desert rock: all there.

**Free sample projects from Epic** worth harvesting:

- *Valley of the Ancient* — cliffs, canyon geology, Nanite at scale
- *Electric Dreams* — the best free foliage and PCG forest setup that exists
- *City Sample* — less relevant, but excellent for lighting reference
- *Content Examples* — how every feature is meant to be wired

**Built-in systems that give you the look for free:**

- **Lumen** — real-time global illumination and reflections. This is the single
  biggest reason UE5 scenes look expensive. No lightmap baking, and it responds
  live when your `Brightness` and `Warmth` values change, which is exactly what
  Halcyon needs.
- **Nanite** — drop in film-quality meshes with no LOD work.
- **Virtual Shadow Maps** — soft, accurate shadows without tuning cascades.
- **Sky Atmosphere + Volumetric Clouds + Sky Light** — a full physical sky. Move
  the sun and the sky recolours itself correctly. Your `TimeOfDay` field drives
  this directly.
- **Water plugin** — built in. Lakes, oceans, rivers with real wave systems.
  Your `WaterMotion` maps onto wave amplitude.
- **PCG plugin** — scatter a forest procedurally rather than by hand.
- **MetaHuman** — free, if you want the monk companion to be a person.

**Realistic scope for the first world.** Zen Garden is the right one to build
first: it's small, enclosed, and mostly static geometry, water and light. No
terrain sculpting, no vegetation scattering at scale, no weather system needed.
A competent first pass is a weekend or two, and Lumen does most of the work.

**Where the effort actually goes:** composition and lighting, not assets. A
scene made of free Megascans with thoughtful light beats a scene of expensive
custom assets with default lighting, every time.

---

## Local Pixel Streaming (still £0)

1. Enable the **Pixel Streaming** plugin in the editor, restart.
2. Run the signalling server that ships with the engine:
   `Engine/Plugins/Media/PixelStreaming/Resources/WebServers/SignallingWebServer/platform_scripts/cmd/Start_SignallingServer.ps1`
3. Launch your packaged build with:
   `-PixelStreamingURL=ws://127.0.0.1:8888 -RenderOffScreen -Windowed -ResX=1280 -ResY=720`
4. Open `http://127.0.0.1` — the player page is served by the signalling
   server, and can be iframed into Next.js.

Your GPU renders, your browser receives. Cost: nothing. This is the same
architecture you would deploy to a GPU server later — only the address changes.

---

## Test the loop without Unreal

The whole server side works before Unreal exists. Start FastAPI, log in, then:

```bash
# start a session
curl -X POST http://127.0.0.1:8000/api/halcyon/sessions \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"world":"zen_garden","consent_to_store":false}'

# say something
curl -X POST http://127.0.0.1:8000/api/halcyon/sessions/$SESSION/turn \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"I cannot stop spiralling about the launch"}'
```

You'll get back an affect reading, a reply, and a full `EnvironmentCommand`
with wind and water dropped to near zero and the breathing guide switched on.
That JSON is exactly what Unreal receives.

---

## Free local AI stack

The planner needs no model at all — affect estimation is a lexicon and the
planner is deterministic. Add voice when you want it:

- **STT** — `faster-whisper`, `small.en` model, runs comfortably on CPU
- **TTS** — Piper, near-instant on CPU, decent voices
- **LLM** — Ollama with Qwen 3 or Llama 3.1 8B, if you want conversational
  replies richer than the current lines

Slot the LLM in behind `compose_reply()` in `planner.py`. Keep the environment
planning deterministic even then — a model that invents weather is a model that
will eventually invent something unpleasant during a bad moment.

---

## One thing built in deliberately

`affect.py` checks for crisis language before anything else runs. On a hit, the
planner is bypassed entirely: the world goes still and neutral, the reply points
to real help, and no mood-based prettification happens. A world that responds to
someone in genuine distress by warming the light and sending over a dog would be
worse than useless. Keep that path intact whatever else changes.
