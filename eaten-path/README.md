# THE EATEN PATH

Every path you take eats itself.

A first-person horror walk through an infinite nighttime forest, recorded on a
camcorder that should have died in 1996. The maze only runs forward: the trees
knit shut a few metres behind you, and when you commit to a fork the road not
taken closes with a rush. There is no map, no objective, no going back. Stand
still too long and the forest closes in anyway.

## Run

```bash
node serve.mjs
```

Open http://localhost:8658 — click to record. **WASD** walk, **mouse** look,
**shift** hurry. Headphones on.

## What's out there

Nine kinds of place, rationed so it never feels the same twice: corridors of
trunk and bramble; **thickets** where the foliage closes over the path and
engulfs you; root-choked cave tunnels; cemetery fields; sun-shaft clearings that
sometimes stop falling, all at once, to show you what the light was on; **stone
ruins** — a roofless chapel, a ring of standing stones, a well with a rope gone
taut into the black, a house that's just a chimney and a footprint now;
**bogs** of black water, reeds, and will-o'-wisps; **deadwood** — cold fields of
bone-white bare trees.

Things behind you, and worse, things ahead:

- The path **seals shut behind you**. Commit to a fork and the road not taken
  closes with a rush. There is no back. Stand still and it creeps in anyway —
  and if you balk in front of what's ahead, it herds you onward.
- **Something is standing down the path**, in the fog, facing you. Get close and
  it's gone. A shape darts across the trail ahead and into the trees. A figure
  runs from you and rounds the bend before you reach it. **Footprints** appear
  leading forward — fresh, as if someone just went this way; sometimes there are
  too many of them.
- Eyes in the trunk holes that look around, sometimes at you. Dead cars that
  remember being cars for six seconds. Junk that switches on — a TV, a radio
  playing a waltz nobody broadcasts, a swing, a phone that only rings deep in.
  Machinery humming for no one on HRTF panners, so you can walk toward it.
- What people left when they didn't come back: a child's bike and one small
  shoe, MISSING flyers stapled in rows (the same face, over and over; the date
  gets older the deeper you go), a search party's gear with the flashlights
  still on, a tipped stroller, a roadside shrine with candles still lit. And a
  red thing you keep seeing that you cannot possibly have seen before.

The tape counter in the corner only ever climbs. You are always getting deeper.

Everything you hear is synthesized in WebAudio — no samples. Everything you see
goes through a 640×480 4:3 tape pass: scanlines, grain, chroma bleed, tracking
bands, head-switch noise, auto-iris lag, a timestamp that is occasionally wrong
in ways timestamps should not be wrong.

## Dev

- Build-free ES modules, Three.js vendored in `vendor/`.
- `?test=1&run=1&seed=N` exposes `window.__EP` (step, setInput, faceForward,
  segInfo, stats, forceEvent).
- `node tests/smoke.mjs` — headless Playwright drive on the real GPU
  (`--use-angle=d3d11`), asserts generation/sealing/fps/leaks, drops
  screenshots in `tests/shots/`.
- `node tests/biomes.mjs [seed]`, `node tests/biomes2.mjs [seed] [secs]` —
  walk until each biome/event appears and screenshot it.
