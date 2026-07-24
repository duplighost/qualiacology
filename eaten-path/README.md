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

- Corridors of trunk and bramble; root-choked tunnel stretches where the canopy
  closes to a ceiling; old cemetery fields; clearings where sunlight falls at
  3 AM and sometimes stops falling, all at once, to show you what it was on.
- Eyes in the trunk holes. They look around. Sometimes at you.
- Dead cars that remember being cars for about six seconds.
- Junk that can switch on: a TV on a stump, a radio playing a waltz nobody is
  broadcasting, a swing, a lamp, a phone that only rings deep in.
- Machinery humming for no one, on HRTF panners, so you can walk toward it.

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
