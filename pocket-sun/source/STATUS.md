# Pocket Sun status

Canonical source: `C:\Users\Alex\Projects\pocket-sun`. Site worktree: `C:\Users\Alex\Projects\_wt-pocket-sun-cinematic`. PR #221 remains the preview release; production has not been changed by this work.

3.1.0 moonrise addresses Alex's preview feedback: the background changes were too subtle, and the controlled sun flickered. Four different procedural cloud formations continuously blend over time and with points. The moon retains its drifting approach, follows score toward the center, brightens and gradually grows smiling eyes and a wide grin. The progression target is 5,000 points, smoothed over several seconds. The physical rim appears before solidity at 92% of the approach. At the center it occupies 47% of the shorter screen dimension, leaving room around all sides.

The sun now explicitly draws at full opacity rather than inheriting particle/ring fades. Moon contacts use continuous relative-motion collision, reflect only incoming motion and give the sun a bounded sideways launch. Nearby moon gravity is weaker while holding; full circuits award the existing orbit reward. Motes and particles bounce, resonators are kept outside the surface, and gate placement and paths account for the moon.

Persistent UI remains only score. Fullscreen is requested once on first gameplay pointer where supported. Pull, tap, release, audio and automatic environments remain available without a menu or stage selector.

Build with `npm run build:site`, then `npm run copy:site -- <site-worktree>/pocket-sun`. The site includes independently buildable source and moon collision tests. `?autotest=1&seed=1337&score=5000` is a non-persistent visual/physics fixture; score parameters have no effect in normal play and fixtures suppress automatic smoke mutation.

Validation: game lint, focused TypeScript, production build and all four new moon collision/progression tests pass. All 30 existing runtime checks pass in 390x844 and 844x390 system-Chrome mobile emulation. Real Chrome touch dispatch exercised movement, release pulse and automatic fullscreen. Instrumented rendered sun draws stayed fully opaque throughout fading effects; the final sampled run covered 191 body draws and no center brightness below 235/255. A staged center-moon interaction produced repeated ricochets and remained outside the surface. Three staged screenshots show opening, approach and full grin. These fixtures are not evidence of earning the progression through a full natural play session. Physical phone hardware performance remains unverified.

The broader recovered legacy server TypeScript scaffolding still has missing Cloudflare types. It is absent from the static source snapshot; the actual game typecheck passes.
