# Pocket Sun status

Canonical editable source: `C:\Users\Alex\Projects\pocket-sun`.

Current local revision is 3.0.0 cinematic. It starts from the recovered 2.1 editable source, while production previously served 1.1. The continuous UI is now only the score. Multipliers appear temporarily in the playfield. Environments advance automatically. The first gameplay pointer requests fullscreen once, when supported; rejection leaves the game running edge to edge. Escape exits browser fullscreen and does not cause another request during the same load.

Rendering uses cached procedural nebula, planetary surface and solar photosphere textures, animated prominences, bloom, stars, and resonators shaded toward the moving sun. Existing pull, release, tap, audio, moving rewards, gates, persistence and visibility handling remain in the recovered game engine.

Build the site with `npm run build:site`, then `npm run copy:site -- <site-worktree>/pocket-sun`. The copy script includes an editable source snapshot in the route. The snapshot can rebuild independently with its own small package manifest. The legacy Vinext build and package scripts remain available for standalone package work.

Validation: final game lint, static production build and focused game TypeScript check passed. Both 390x844 and 844x390 previews passed all 30 existing runtime checks. Mouse pull/release and automatic fullscreen worked in the browser. The recovered legacy rendered-shell tests passed. The broader legacy TypeScript project still has missing types in unused Cloudflare scaffolding; that scaffolding is excluded from the static site release. Native touch dispatch was unavailable in the connected in-app browser, and the separate Chrome connection was unavailable. Physical Android/iPhone input, performance and iPhone browser fullscreen remain unverified.
