# Galaxy Sandbox

A restricted N-body galaxy toy. 5,000 stars on closed-form orbital rails under a
flat-rotation-curve halo potential, with a rigid m=2 density-wave spiral pattern —
stars stream through the arms, the arms never wind up. Drag to launch perturber
masses (10⁸–10¹⁰ M☉, honest G) and watch the wakes shear into trailing arclets.

Nothing else is included in this simulation.

## Run locally

Open `index.html` in a browser, or serve the folder:

```
python -m http.server 8080
```

## Deploy to Netlify

Drag this folder onto https://app.netlify.com/drop — it's a single static page,
no build step, no configuration.

## Notes

- Sound is synthesized in-browser and starts on the first click (autoplay policy).
- Best played in its own tab, unhurried, with sound on. Give it 6–8 minutes.
- The simulation stores a small amount of state in `localStorage`. Clearing site
  data restores everything to exactly how it was the first time.
