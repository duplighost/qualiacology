# Recorded evidence

Read [the validation report](../breakwater-validation.md) before interpreting
these files. Counts and scripted checks do not establish AAA quality, fun,
hardware frame rate or two-hour duration.

- `actual-input.json`: real browser inputs, accessibility and persistence checks.
- `public-route.json`: final ordinary-URL start, pause, Resume and skill-menu return.
  `public-lock-race-before-fix.json` preserves the observed ordering defect that
  prompted this regression: native lock succeeded before the input event arrived.
- `campaign.json`: final complete campaign/state run, including ending and replay.
- `traversal.json`: all 25 main routes and secret access/return using player physics.
- `player-weapon-regressions.json`, `combat-regressions.json`: isolated regression
  results against the actual game modules.
- `bosses.json`: seven baseline-equipment, telemetry-assisted boss fixtures.
- `weakpoint-actual-input.json`: the precisely aimed Crucible interrupt through
  actual mouse charge/release; this predates only its final health calibration.
- `audio.json`: numerical WebAudio routing, filtering and mute checks.
- `prop-library.json`: final seven-model runtime library assertions.
- `visual-six-original.json`: initial final six-district capture run. Its aggregate
  failure is retained: the classifier omitted `.glb` streaming responses.
- `tree-stream-validation.json`: diagnosis using the complete bytes observed in
  that same run and the loaded tree's geometry. It resolves that transport notice
  without rewriting the raw run as if it originally passed.
- `visual-corrections.json`: the passing focused Transit/Foundry recapture after
  architectural, stair-material and HUD fixes, with the corrected classifier.
- `commercial-reference-sources.json`: official review-reference URLs and hashes.
  The commercial image files are not shipped here or in the game.
- `final-source-sha256.json`: final runtime source fingerprints. Some earlier
  reports predate the documented focused repairs; their own timestamps and source
  fingerprints are preserved where the harness recorded them.
- `site-checks.json`: passing build, static validation, route smoke and art audit.
- `catalog-capture.json`: source and encoding notes for the actual-game card/OG art.

The final district contact sheet combines the two documented visual runs. Raw
report screenshot filenames identify development captures; this evidence folder
retains the contact sheet rather than every intermediate full-resolution image.
Absolute workspace paths and local test URLs in raw JSON describe the cloud test
environment, not deployment links or files required by the runtime.
