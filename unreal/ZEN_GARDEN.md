# Building the Zen Garden

The first world. Small, enclosed, and mostly light and water, which is exactly
what you want when you're proving the loop rather than shipping content.

Everything below uses free assets. Total cost: nothing.

---

## Why this world first

No terrain sculpting. No vegetation scattering at scale. No weather system
needed. The mood comes almost entirely from light, fog and water — the three
things the directors already drive. If the loop feels good here it will feel
good anywhere; if it doesn't, no amount of extra content will save it.

Budget a weekend for a rough pass, another for polish.

---

## Assets to pull (all free)

**From Fab / Quixel Megascans:**

| What | Search for |
|---|---|
| Ground | `gravel`, `raked sand`, `granite pebbles` |
| Rocks | `granite boulder`, `mossy rock`, `river stone` |
| Stone edging | `cut stone`, `paving slab` |
| Moss | `moss patch`, `forest moss` decals |
| Bamboo / maple | Megascans 3D plants — `bamboo`, `japanese maple` |
| Water surface | use the Water plugin body, not a scanned asset |

**From the Epic marketplace free section:**

- Any Japanese architecture pack for the tea house and lanterns. Several are
  permanently free; a simple pagoda roof and two lanterns is enough.
- Free ambient sound packs for water trickle, birdsong, wind.

**What you do not need:** a modeller, a texture artist, or a single custom
mesh. This is an assembly job.

---

## Scene setup, in order

**1. Landscape or plane.** For an enclosed garden, a flat Landscape with light
sculpting beats terrain work. Sculpt a shallow basin for the pond and a low
ridge at the boundary so the world doesn't visibly end.

**2. Lighting rig.** Add in this order, and leave the values alone — the
Sky Director overwrites them at runtime:

- Directional Light — set **Movable**, enable **Atmosphere Sun Light**
- Sky Atmosphere
- Sky Light — set **Movable**, enable **Real Time Capture**
- Exponential Height Fog — enable **Volumetric Fog**
- Volumetric Cloud
- Post Process Volume — **Infinite Extent (Unbound)** ticked
- Wind Directional Source

**3. Enable the renderer features.** Project Settings → Rendering:

- Dynamic Global Illumination: **Lumen**
- Reflections: **Lumen**
- Shadow Maps: **Virtual Shadow Maps**
- Default RHI: **DirectX 12**

This is the whole "how do I get good graphics" answer. Lumen plus Megascans
plus a sensible sun angle is the look. There is no secret beyond it.

**4. Water.** Enable the Water plugin, drop a **Water Body Lake** into the
basin. Assign its material to the Water Director's `WaterMeshes` array, or
duplicate the water material and expose `WaveAmplitude`, `WaveSpeed`,
`SurfaceRoughness` and `Warmth` as scalar parameters so the director can
drive them.

The roughness parameter matters more than the waves. Still water that goes
genuinely mirror-flat reads as calm faster than any lighting change.

**5. Dress the scene.** Raked gravel as the base material, a stone path, three
or five rocks (odd numbers, asymmetric placement — this is the actual
convention in Japanese gardens and it looks wrong when you use four), a maple
at the edge, lanterns near the path, moss decals where stone meets ground.

**6. Drop in the Halcyon actors.** Bridge, Sky Director, Audio Director, Water
Director, one Companion set to `koi`, and set the Game Mode's default pawn to
your `AHalcyonPawn` Blueprint subclass.

---

## Getting it to look expensive

Five things, in order of impact:

**Sun angle.** Low sun, roughly 8–15° above the horizon, is the single
highest-leverage decision in the scene. Long shadows and grazing light across
gravel do more than any asset. Your `TimeOfDay` of 16.0 for this world already
lands near this.

**Volumetric fog.** Even at low density it separates foreground from
background and catches the light shafts. Scenes without it look flat no matter
how good the meshes are.

**Contrast in scale.** Big rock, small pebbles, one tall tree. Everything at
mid-scale reads as a video game; mixed scale reads as a place.

**Negative space.** Empty raked gravel is the point of a zen garden. The
instinct to fill the frame is the instinct to ruin it.

**Colour restraint.** Grey stone, green moss, one warm accent from the lantern
or the maple. Lumen will do the bouncing.

---

## Performance for Pixel Streaming

Pixel streaming renders on your GPU and encodes video, so you're paying twice.
Target 60fps locally before you stream.

- Nanite on all static meshes — it's cheaper than LODs here
- Cap foliage instance counts; the maple is the expensive thing, not the rocks
- Volumetric fog resolution can drop to 0.5 with almost no visible cost
- Screen percentage 80% is invisible after video encoding
- Package a **Development** build to test rather than streaming from the editor

---

## Checkpoint

You'll know it's working when you type "I can't stop spiralling" into
`/halcyon/enter` and, over the following twelve seconds, the wind dies, the
pond goes to glass, the fog lifts slightly, the vignette starts breathing, and
the koi drifts closer without ever coming to the edge.

Nothing else needs to exist for that to be worth showing someone.
