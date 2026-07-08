# Behind You — standalone package

This zip separates the `Behind You` browser game from the larger site bundle.

## Files included

- `index.html` — the full game page
- `vendor/three.min.js` — Three.js runtime
- `vendor/pointerlockcontrols.js` — pointer-lock controls
- `vendor/tone.js` — Tone.js audio runtime
- `assets/games/behind-you-card-clean.jpg` — local preview/share image

## Run locally

Open `index.html` directly in a modern desktop browser, or run a tiny static server from this folder:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy

Upload the contents of this folder, or upload this zip directly to a static host that expects `index.html` at the root.

Note: I fixed the vendor script paths to lowercase so they work on case-sensitive hosts.
