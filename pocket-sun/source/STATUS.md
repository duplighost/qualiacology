# Pocket Sun status

Canonical source: `C:\Users\Alex\Projects\pocket-sun`. Site worktree: `C:\Users\Alex\Projects\_wt-pocket-sun-cinematic`. PR #221 remains the preview release; production has not been changed by this work.

3.2.0 long-moonrise follows Alex's revised pacing: the final smiling/solid moon should take far more points, while earlier score milestones should send the plain background moon on short trips that return home. Arrival now unlocks at 50,000 points, up from 5,000. At 500, 1,500, 3,500, 6,500, 10,000, 15,000, 21,000, 28,000 and 36,000 points the moon unlocks a 12-second excursion, alternating left, down and looping paths. Trips have zero displacement and zero velocity at their ends. New milestones wait for an unfinished excursion. Idle drift continues around the same home position.

Before the final arrival the moon has no face and no collider, even when an excursion takes it across the playfield. Reaching 50,000 starts a 14-second eased journey to the exact center. Only once centered does the face reveal over 2.5 seconds; only after that reveal does the moon become solid. The existing bounded ricochets and gentle nearby gravity then activate. This is a tenfold point threshold, not a claim of a tenfold measured play duration.

Four cloud formations continue morphing over time and score independently of the final moon arrival. The controlled sun remains opaque through fading particles and rings. The score is the only persistent UI. Fullscreen is requested on first gameplay pointer where supported.

Build with `npm run build:site`, then `npm run copy:site -- <site-worktree>/pocket-sun`. The static source snapshot includes the moon tests. `?autotest=1&seed=1337&score=50000` is a non-persistent completed-arrival fixture; low-score fixtures exercise milestone excursions. Score parameters do nothing in normal play.

Validation: six moon unit tests cover score gating, excursion return, queued milestones, delayed face/solidity, swept collision and overlap safety. Game TypeScript, lint and production build pass. System-Chrome mobile-emulation checks verified a rendered low-score departure/return, no early face/collider, a centered 50,000-point fixture, all 30 existing checks in portrait and landscape, and no page errors. Physical phone hardware performance and full natural progression duration remain unverified. Prior touch, fullscreen and sun-opacity regression checks are recorded in the PR; these paths were not changed in this pacing revision.

The broader recovered legacy server TypeScript scaffolding has missing Cloudflare types and is excluded from the static game source.
