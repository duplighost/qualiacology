# IRON PSALM — BLACK IRON 1.2

Built on BLACK IRON BRIGHTER 1.2. Campaign version 6, so 1.1 checkpoints are
retired and a new run starts clean. Save namespace and settings are unchanged.

## Climbing

The iron is now the engine of a climb. Swing it overhead and catch it on the
way up, and its momentum hauls you after it — the same measured hand trajectory
the rest of the game teaches, doing the one thing that only makes sense on a
wall. Free climbing still works and can never leave you stuck; it is simply
slow. Measured: 5.6 m in eight seconds under your own arms, the full 28 m in
eight seconds on the haul.

- Outer wall 16 m → 28 m, perimeter mesh 9.2 m → 15 m, watch store 5.6 m → 8 m.
- Four rest courses on the wall and three standing rails in the mesh. Getting
  hit while planted on one costs 12 cm instead of 60.
- Grates alternate across the face, so the route zig-zags. None of them spans
  the full width: every barrier can be traversed around or smashed through.
- Knocking a guard off takes the guards below him with him, up to three deep.
- A four-limb climbing gait: one limb moves at a time, three stay loaded, the
  hips swing under the planted side, and hands land on holds that exist in the
  masonry. The haul has its own full-body pose.
- The camera sits near the climber's own level in three-quarter, widens with
  height, and kicks on each haul. Looking down on him folded his legs into his
  torso and made every pose read as a shrug.
- A height and haul read-out on the right of the HUD.

## The ending

The last chain is played, not watched. Stop the winch, break the sea gate, walk
the tide road out to the breaker stone, and swing the iron into it to take your
own cuff off. The chain drops on the rock and stays there. Unweighted, the
prisoner moves at 12.6 m/s instead of 8.2 — the first time in four acts that the
weight is gone, and you feel it in your hands rather than read it on a card.

- New geography past the sea gate: a masonry causeway on arched piers, a rock
  islet with the breaker stone, and a strand that runs down into the water.
- The sunrise is in the scene. It starts when the winch dies, lifts when the
  cuff comes off, and finishes as the strand runs out — sky, sea, sun, fog and
  grade all driven by one value.
- No freeze and no white-out. The simulation keeps running through the ending,
  the movement pad stays live, and the camera widens on its own.

## Environments

- A new sky: layered cloud decks lit from the sun's side, a real disc with a
  horizon band, and a dawn state.
- Open sea with three swell scales, a glitter road toward the sun and shore foam
  where the water actually meets land.
- The outdoor half of the campaign now stands on a continuous headland that
  falls away into the water. Before this the authored rooms were rectangles over
  open sea and the gaps between them showed straight through.
- Continuous ridge silhouettes and a treeline on the horizon, parented to the
  prisoner so they can never be reached.
- Aerial perspective and screen-space light shafts in the post pass, matched to
  the sky rather than a flat grey constant. Film grain and a touch of lateral
  dispersion at the frame edge.
- The key light was back-lighting every surface the player looks at, including
  all three climb faces. It now rakes across them.
- Climb faces rebuilt with recessed courses, pilasters, projecting headers,
  string courses, a blown-out panel with the bar still in it, downpipes with
  brackets, and weeds in the mortar. The mesh gets razor coil, tensioners and
  patched panels.
- The parapet is paved and crenellated, with a drain channel, conduit and a
  searchlight that stopped working a long time ago. The stair has a handrail and
  side-mounted lamps.
- Denser, clumped meadow grass with seed heads, a collapsed fence line, a dead
  tree and field stones.

## Things that were floating

Dressing carried by a breakable now belongs to that breakable and topples with
it: infirmary curtains, droppers and bay monitors, and the incinerator hoods,
stacks and flue runs. Lamps state the structure they hang from instead of
stopping 35 cm into open air, and a wide sign only gets hangers when something
is actually above it.

## Mobile

- Drag anywhere that is not a pad to look around. The follow camera was the
  whole camera on a phone, and being swung around by your own thumbstick was
  what made it sickening.
- The follow camera now has a dead band and a slower rate on touch, and a
  deliberate look holds for nearly three seconds before it resumes.
- The camera never sinks below the surface it is over, so the parapet stair and
  the coast stair no longer bury the view in the treads.

## Note on source

This revision was authored directly in `dist/game.bundle.js`, which is readable
per-module source. It has not been round-tripped through the `Projects\iron-psalm`
build. The site copy is ahead of that tree.
