GORETHREAD // HELLSPINDLE — gamefeel and routes pass

The playable copy is this folder. Open index.html.

What is true now:

- It is fast. The old build spent about 87% of every frame blitting a hidden
  canvas onto the visible one; a measured frame went from 29.8ms to 0.90ms.
  Phones render at their own resolution rather than always 1600x900.
- The rope cannot drop you. Nothing in the solver releases a hook — only you
  do, by letting go or jumping. Grazing a slab costs a little speed, not the
  arc. Hanging ledges do not catch you mid-swing. A latch lifts you off the
  floor. A pointer that blinks out for a frame does not count as letting go.
- You do not wedge in the seam between two slabs any more, and brushing the
  side of a block while falling no longer snaps you onto its roof.
- The twelve districts cross-fade into each other over 900px either side of the
  line, so it reads as one cathedral instead of twelve rooms.
- Each district has four heights: the vault (rings only), the gallery, the road,
  and the undercroft under a grate in the floor. Reliquary caches hang on the
  detours. Gaps between the road slabs are still death — those are the swing
  voids — but the crypt below is fair: you always land, the way out is behind
  you, and the one gap in there clears on a tapped jump.
- Levels hand you a relic. You spend it in the Reliquary when you choose:
  Tab or E, or tap the badge. Six lines, and THE CHAIN and THE TENDON change
  the actual geometry of what you can reach.
- New hunter and knight. She has twelve walk frames, eight idle and eleven
  airborne — more than the build shipped with. The air set is ordered by
  meaning: the leap, a float loop, the fall, the dive, picked off vertical
  speed rather than a clock. Landings compress, takeoffs stretch. She is the
  same size in every state and centred on her body, not her sash.
  The knight walks on twelve now too, from two sheets colour-matched so the
  cycle cannot flicker.
- She throws, she recoils when hit, and she dies on the floor she was standing
  on instead of falling through it. So does the knight.

Still true about the picture: knight shield art stays after the shield breaks,
attacks are a lean, hook hole is a little chewed.

Clean break point.
