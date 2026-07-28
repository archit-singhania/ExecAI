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

**`AHalcyonWaterDirector`** — one per body of water. Assign your water meshes
and it pushes `WaveAmplitude`, `WaveSpeed`, `SurfaceRoughness` and `Warmth`
into dynamic material instances. Parameter names are exposed as properties, so
rename them to match your material rather than the other way round.

The roughness curve is deliberately non-linear — the first bit of motion
breaks a mirror surface far more visibly than the last bit adds chop. Below
0.12 the surface effect switches off entirely, because stillness has to be
complete to land.

**`AHalcyonPawn`** — set as the Game Mode's default pawn. Standard UE
character defaults are tuned for action games: 600cm/s is a jog, the camera
snaps, and you can jump. All three are wrong here. A world that eases its
light over twelve seconds and then lets you sprint through it is telling you
two contradictory things.

So: 185cm/s amble, gentle acceleration, camera lag, subtle head bob that eases
to a zero crossing when you stop, no jump. And the walk speed itself eases
down when the world's energy drops — floored at 68% so it reads as *no reason
to hurry* rather than *the controls have broken*. When the breathing guide is
running, the field of view breathes with it, at a depth low enough that you
shouldn't consciously notice.

Bind four axes in Project Settings → Input: `MoveForward`, `MoveRight`,
`Turn`, `LookUp`.

**`AHalcyonQualityDirector`** — one per level. Three presets (1080p Balanced,
1440p High, 4K Cinematic) that set scalability groups, TSR, Lumen hardware ray
tracing, virtual shadow map bias, volumetric fog grid density, and the Pixel
Streaming encoder bitrate together.

It also holds a frame-time budget by moving screen percentage rather than
dropping features — losing Lumen mid-session is visible, losing 12% of screen
percentage is not. The adapt rate is deliberately slow, and it climbs back
more slowly than it falls, because a resolution that visibly hunts is worse
than one that sits slightly too low.

The counter-intuitive part is in `ApplyStreamingSettings`: past a point, more
pixels make a *streamed* image look worse, because the encoder has a fixed
budget to spend. A clean 1440p at 20Mbps beats a mushy 4K at the same rate.
That's why 1440p High is the default rather than 4K.

Reads `-HalcyonQuality=cinematic|high|balanced` so the browser's choice passes
straight through to the instance.

**`AHalcyonGradeDirector`** — one per level. This is the actor that decides
whether the render looks like a game or a film, and it matters more than
resolution does. Ungraded UE output has a recognisable look — slightly green
midtones, crushed shadows, everything equally saturated — that most people spot
instantly without being able to name it.

Eight per-world grades ship as defaults: Zen Garden restrained with cool
shadows, Ocean at Dusk warm and rich, Nordic Lake desaturated to 0.74 because
stillness reads better without colour, Observatory near-monochrome with heavy
grain to sell the low light. Each pairs cool shadows against warm highlights,
which is the oldest trick in grading and still the most effective.

Grades then bend with live state: warmth shifts temperature by up to 1600K,
fog lifts the blacks (a hazy scene with crushed shadows looks wrong), grain
rises as light falls the way real sensors behave, and a breathing session
pulls focus shallower to quiet the periphery.

Exposure is locked to manual by default. Auto-exposure hunting during a slow
light change is the single most immersion-breaking artefact in a world like
this one.

**`AHalcyonPlace`** — one per spot worth going to. Set `PlaceKind` to a verb
from the shared vocabulary (`sit`, `water_edge`, `shelter`, `overlook`,
`path`) and drop it on a bench, a shoreline, under a tree, on a ridge. When
the planner names that verb, the nearest matching place wakes: an optional
light rises over eight seconds, a Niagara effect and an audio loop fade in,
and the whole thing breathes slowly. `OnArrived` fires once when you get
within `ArrivalRadius`.

The hard rule is that an invitation must never become a demand. No quest
marker, no arrow, no objective text — a place simply brightens, and if you
ignore it nothing at all happens. That restraint is the entire difference
between a calm world and a game nagging you to run an errand. The eight-second
wake is part of it: a light that snaps on is a notification, one that arrives
slowly is just the place being noticed.

Any new world gets invitations for free by tagging its own geometry. The
server never names a place that world doesn't have.

---

## Getting a session into the running instance

Pasting a token into the editor is fine for level work and useless for
anything else. Three routes, in order of how you'll actually use them.

**Launch arguments — local development and production alike.**

```
HalcyonWorld.exe \
  -HalcyonSession=<session-id> \
  -HalcyonToken=<jwt> \
  -HalcyonQuality=high \
  -PixelStreamingURL=ws://127.0.0.1:8888 \
  -RenderOffScreen -Windowed -ResX=1280 -ResY=720
```

`AHalcyonGameMode` reads these on BeginPlay and connects the bridge. This is
also exactly how you'd spawn a per-user GPU instance later, so the local and
deployed paths stay identical. `-HalcyonUrl=` overrides the API address.

**Data channel — handing a running instance a new session.**

Add a `PixelStreamingInput` component to your Blueprint, add a
`HalcyonStreamLink` component, and bind the input delegate to
`HandleBrowserMessage`. One node.

The browser side is already built: `/halcyon/enter` posts the credentials into
the stream iframe on load. For that to reach Unreal, drop this into the Pixel
Streaming player page, which forwards the postMessage onto the data channel:

```html
<script>
window.addEventListener("message", (event) => {
  if (event.data?.type !== "halcyon.session") return;
  if (typeof emitUIInteraction === "function") emitUIInteraction(event.data);
});
</script>
```

The stream hint in the browser flips from "Waiting for the world" to "Linked
to this session" once the post lands.

**Editor fields** — still there, used only when the other two find nothing.

Until credentials arrive the bridge stays disconnected and the world sits at
its baseline, which is a perfectly reasonable thing to look at.

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
