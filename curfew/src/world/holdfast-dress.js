// CURFEW — THE HOLDFAST'S CROWD, ITS DEAD, AND ITS MONEY. Owner: the places lane.
//
// Alex, 2026-09-07:
//
//   "It should be surrounded by actualy realistic looking people. they can't look like a
//    threat from a distance. and you have to pay someone at the door to get in. you can try
//    to fight your way in, but there are a lot of them."
//
//   "there should be a lot more environmental story telling in areas with realistic bodies
//    and skeletons and everything you can brainstorm."
//
//   "cash should be in breakable boxes at locations too"
//
// ============================================================================
// WHY THE CROWD IS SCENERY, AND WHY THAT IS THE RIGHT ANSWER
// ============================================================================
// A real body in this game is an enemies.js pool record: 7-11 meshes, an AI tick, a slot in
// a pool that is fixed at boot. The pools are `standing: 8, poacher: 12` and the county's
// eighteen staged scenes already hold most of them for the life of the save. Forty real
// people at this gate is not a budget question, it is arithmetic: the slots do not exist.
//
// So the forty are WELDED INTO THE CASTLE. Every figure below is kit primitives pushed onto
// the site's one merged solid geometry — zero draws, zero programs, zero AI, zero pool slots,
// and about 1,100 triangles against a 8 M budget with 6.0 M measured. They never move.
//
// And they should never move. This game has already taught the player that the still figure
// is the frightening one — the Standing Kind does nothing at all until it is behind you — and
// Alex's own words are "they can't look like a threat from a distance". A hundred metres out
// they are a crowd standing in lamplight outside a gate. Close up they are people who have
// been waiting a long time and are not going to be let in.
//
// THE ONES THAT FIGHT are a separate, small, REAL cast at the gate: the doorman and four
// guards, spawned dormant by places' cast machinery the first time you come within 150 m.
// Attack anybody and they wake. That is "you can try to fight your way in, but there are a
// lot of them" told honestly — the ones who can hurt you are the ones with a job, and the
// crowd simply stands there and watches you do it, which is worse.
//
// ============================================================================
// THE NIGHT-VALUE LAW (species.js:74) APPLIES TO EVERY FIGURE HERE
// ============================================================================
// A body must be DARKER than the sky it stands against. Forty pale shapes outside a lit gate
// would be the brightest thing in the county and would read as a car park. Every value below
// is at or under C.dark, and the only bright thing anywhere near them is the brazier.

import * as THREE from 'three';
import { C, kits, groundY, ON_APRON, glowColumn } from './sites.js';
import { skeleton, corpse } from './remains.js';

/* --------------------------------------------------------------------------
   Palette. Values only — ART 0.5: the county has one hue and everything that is
   not a rationed glow is a value, not a colour.
   -------------------------------------------------------------------------- */
const P = {
  coat: [0.030, 0.029, 0.031],
  coat2: [0.041, 0.038, 0.036],
  coat3: [0.024, 0.025, 0.029],
  hood: [0.019, 0.019, 0.022],
  skin: [0.062, 0.050, 0.042],
  boot: [0.021, 0.020, 0.020],
  // the strongbox
  iron: [0.052, 0.052, 0.056],
  timber: [0.086, 0.066, 0.048],
};

const shade = (col, k) => [col[0] * k, col[1] * k, col[2] * k];

/* --------------------------------------------------------------------------
   ONE PERSON, STANDING.

   Fourteen primitives. It is not a rig and it never animates: the whole point is that it is
   part of the wall it is standing in front of, as far as the renderer is concerned.

   Everything that stops forty of these reading as wallpaper is per-figure: the yaw, a lean
   in two axes, the height (0.92-1.07), which of three coat values it wears, whether it is
   hooded or bare-headed, whether its arms are folded or hanging, and whether it is looking at
   the gate or at the person beside it.
   -------------------------------------------------------------------------- */
function figure(k, api, lx, lz, yaw, rng) {
  const s = k.solid;
  const g = groundY(api, lx, lz) + ON_APRON;
  const h = 0.99 + rng.next() * 0.11;              // 1.74 - 1.94 m of person
  const coat = [P.coat, P.coat2, P.coat3][(rng.next() * 3) | 0];
  const hooded = rng.next() < 0.45;
  const lean = (rng.next() - 0.5) * 0.07;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const put = (ox, oz) => [lx + ox * cy + oz * sy, lz - ox * sy + oz * cy];

  // MEASURED, FIRST PASS, AND IT WAS WRONG. The coat was a 0.30 x 0.96 cone from the ground
  // up with the torso stacked on top of it, and at 4 m every figure read as a traffic cone
  // with a chess piece balanced on it (tests/shots/holdfast-first/crowd-close.png). A person
  // is not a cone. A person at night is a NARROW VERTICAL, about seven times taller than it
  // is wide, with a small round thing on top and a gap of leg underneath. So this is built
  // from real proportions in metres and scaled by h, and the silhouette is checked at the
  // two distances it has to work at: 4 m, and 90 m across a crowd.
  const legs = 0.86, waist = 1.02, chest = 1.42, neck = 1.50, crown = 1.76;

  // legs, and the boots they stand in
  for (const side of [-1, 1]) {
    const [bx, bz] = put(side * 0.105 * h, 0);
    s.cyl(0.068 * h, 0.076 * h, legs * h, 5, bx, g + legs * 0.5 * h, bz, shade(coat, 0.72), yaw);
    const [fx, fz] = put(side * 0.105 * h, 0.045 * h);
    s.box(0.115 * h, 0.075 * h, 0.235 * h, fx, g + 0.038 * h, fz, P.boot, yaw);
  }
  // THE COAT. MEASURED AGAIN, ROUND 16: the rebuilt figure still read at twelve metres as a
  // dark post rather than a person (tests/shots/arch-r1/crowd-12m.png). The cause is in the
  // numbers: the coat was 0.80 m tall and 0.43 m across the shoulder end, and it merged with
  // the torso and the shoulders into a single mass 1.03 m tall and 0.44 wide — a 2.3:1 block
  // with a knob on it, which is a bollard whatever it is called in the source. It also
  // tapered THE WRONG WAY: widest at the collar, narrowest at the hem, which is a funnel.
  // A hanging coat is 0.98 m of nearly-straight fall that flares slightly at the hem, so the
  // mass is now 2.7:1 and 10 per cent narrower, and the leg gap under it is unchanged.
  s.cyl(0.170 * h, 0.196 * h, 0.98 * h, 7, lx, g + 0.91 * h, lz, coat, yaw, 0, lean);
  // torso, and shoulders a little wider than it
  s.box(0.34 * h, (chest - waist) * h, 0.22 * h, lx, g + (waist + chest) * 0.5 * h, lz, coat, yaw, 0, lean);
  s.box(0.42 * h, 0.11 * h, 0.24 * h, lx, g + (chest - 0.02) * h, lz, shade(coat, 0.86), yaw, 0, lean);
  // neck and head, ON the shoulders. The old head floated 0.14 m clear of them.
  s.cyl(0.048 * h, 0.052 * h, 0.10 * h, 5, lx, g + neck * h, lz, P.skin, yaw, 0, lean);
  const hy = (neck + crown) * 0.5 * h + 0.02 * h;
  if (hooded) {
    s.cyl(0.098 * h, 0.104 * h, 0.20 * h, 7, lx, g + hy, lz, P.hood, yaw, 0, lean);
    s.cone(0.125 * h, 0.16 * h, 6, lx, g + (crown - 0.04) * h, lz, P.hood, yaw, 0, lean);
  } else {
    s.cyl(0.094 * h, 0.100 * h, 0.21 * h, 7, lx, g + hy, lz, P.skin, yaw, 0, lean);
    s.cyl(0.100 * h, 0.096 * h, 0.07 * h, 7, lx, g + (crown - 0.05) * h, lz, P.hood, yaw, 0, lean);
  }
  // arms: folded across the chest, or hanging. Either way they are DOWN THE SIDES of the
  // torso, not out from it — a person waiting is a closed shape.
  if (rng.next() < 0.45) {
    for (const side of [-1, 1]) {
      const [ax, az] = put(side * 0.10 * h, 0.14 * h);
      s.cyl(0.048 * h, 0.052 * h, 0.30 * h, 5, ax, g + (chest - 0.16) * h, az,
        coat, yaw + side * 0.55, 0, Math.PI * 0.5);
    }
  } else {
    for (const side of [-1, 1]) {
      const [ax, az] = put(side * 0.205 * h, 0);
      s.cyl(0.050 * h, 0.058 * h, 0.52 * h, 5, ax, g + (waist + 0.16) * h, az,
        coat, yaw, 0, side * 0.05);
    }
  }
  /* WHAT ACTUALLY MAKES A CROWD READ AS PEOPLE AT TWELVE METRES.
   *
   * Not the anatomy. At this art direction every figure out there is one value against one
   * ground and all you get is an outline, and forty identical outlines is a fence. What
   * breaks it is that PEOPLE ARE CARRYING THINGS. A staff is a single 4 cm line standing
   * 1.9 m out of the ground at a slight angle beside a vertical mass, and one line at an
   * angle beside a vertical is the cheapest "this is a person" signal there is — it is why a
   * pilgrim reads at a distance a fence post never will. A bundle on the back breaks the
   * shoulder line the same way, and a hat breaks the head.
   *
   * A third of them carry something. None of it moves, none of it is a new material, and it
   * is nine primitives across the whole crowd's worst case.
   */
  const carry = rng.next();
  if (carry < 0.34) {
    const side = rng.next() < 0.5 ? -1 : 1;
    const [sx2, sz2] = put(side * 0.30 * h, 0.06 * h);
    s.cyl(0.022 * h, 0.028 * h, 1.92 * h, 5, sx2, g + 0.94 * h, sz2,
      shade(P.skin, 0.62), yaw + side * 0.5, 0, side * 0.075);
  } else if (carry < 0.62) {
    const [bx2, bz2] = put(0, -0.24 * h);
    s.box(0.36 * h, 0.42 * h, 0.24 * h, bx2, g + (chest - 0.10) * h, bz2,
      shade(coat, 0.72), yaw, 0, lean);
    s.cyl(0.020 * h, 0.020 * h, 0.46 * h, 4, lx, g + (chest + 0.02) * h, lz,
      shade(coat, 0.6), yaw, Math.PI * 0.5, 0);
  }
  // A collider, in the same statement that lays the geometry — the law. A person is something
  // you walk round, not through, and at 1.75 m they are not standable.
  api.emit({
    kind: 'circle', x: lx, z: lz, r: 0.34,
    y0: g - 0.3, y1: g + 1.78 * h, tag: 'cloth',
  });
  return g;
}

/* --------------------------------------------------------------------------
   THE DEAD are built by src/world/remains.js, which the staged lane uses too — one
   skeleton and one corpse in the county, not two that drift apart. Both register
   themselves with the search lane through api.body(), so holding E over them finds them.
   -------------------------------------------------------------------------- */
/** An iron-banded chest. Three rounds or three buttstrokes, and it pays properly — see
 *  combat.js's COIN_TAGS. Bracketed with open()/close() so the debris is thrown and the
 *  geometry collapses, which is the thing sites.js is the only file in the repo to do. */
function strongbox(k, api, lx, lz, yaw) {
  const s = k.solid;
  const g = groundY(api, lx, lz) + ON_APRON;
  s.open();
  s.box(0.86, 0.52, 0.58, lx, g + 0.26, lz, P.timber, yaw);
  s.box(0.90, 0.10, 0.62, lx, g + 0.50, lz, shade(P.timber, 0.8), yaw);
  for (const ox of [-0.28, 0, 0.28]) {
    const bx = lx + ox * Math.cos(yaw), bz = lz - ox * Math.sin(yaw);
    s.box(0.07, 0.56, 0.62, bx, g + 0.27, bz, P.iron, yaw);
  }
  s.box(0.12, 0.14, 0.06, lx + Math.sin(yaw) * 0.30, g + 0.30, lz + Math.cos(yaw) * 0.30, P.iron, yaw);
  s.close(lx, lz, 0.8, P.timber);
  api.emit({
    kind: 'obb', x: lx, z: lz, halfX: 0.45, halfZ: 0.31, yaw,
    y0: g - 0.25, y1: g + 0.54, tag: 'strongbox', standable: true, breakable: true,
  });
  return g;
}

/* ==========================================================================
   THE DRESS
   ========================================================================== */
export const DRESS = {
  holdfast(api, out) {
    void out;
    const k = kits();
    const rng = api.rng;
    const R = 66;                       // the curtain's half-width; the gate is at +Z

    /* ---- THE CROWD ------------------------------------------------------
     * Not on a grid. Three shapes, because that is what a crowd outside a door that will not
     * open actually looks like:
     *   - a QUEUE at the gate, close, facing it, patient and thinning with distance
     *   - KNOTS of three and four, turned in on each other, further back
     *   - STRAGGLERS out on the edge of the lamplight, facing away, alone
     */
    let n = 0;

    // the queue: two ragged files either side of the road, tightest at the door
    for (let i = 0; i < 15; i++) {
      const t = i / 14;
      const side = (i & 1) ? 1 : -1;
      const lz = R + 5 + t * 34 + rng.range(-1.4, 1.4);
      const lx = side * (2.2 + t * 5.5) + rng.range(-1.1, 1.1);
      figure(k, api, lx, lz, Math.atan2(-lx, -(lz - R)) + rng.range(-0.35, 0.35), rng);
      n++;
    }

    // the knots, further out, facing each other
    for (const [cx, cz, count] of [[-17, R + 20, 4], [16, R + 27, 3], [-24, R + 38, 4], [22, R + 44, 3], [-6, R + 52, 3]]) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rng.range(-0.3, 0.3);
        const r = 0.9 + rng.range(0, 0.5);
        const lx = cx + Math.cos(a) * r, lz = cz + Math.sin(a) * r;
        // facing the middle of their own knot
        figure(k, api, lx, lz, Math.atan2(cx - lx, cz - lz) + rng.range(-0.25, 0.25), rng);
        n++;
      }
    }

    // the stragglers, on the edge of the light, facing out into the dark
    for (const [lx, lz] of [[-38, R + 12], [37, R + 9], [-31, R + 61], [30, R + 58], [-44, R + 33], [43, R + 30]]) {
      figure(k, api, lx + rng.range(-2, 2), lz + rng.range(-2, 2),
        Math.atan2(-lx, -(lz - R)) + Math.PI + rng.range(-0.6, 0.6), rng);
      n++;
    }
    void n;

    /* ---- THE FIRE THEY ARE STANDING ROUND -------------------------------
     * Two, well back from the gate. The only bright things outside the walls, and small: the
     * frame's over-200 ration is 0.2% and the places lane already owns most of it.
     */
    for (const [fx, fz] of [[-17, R + 20], [22, R + 44]]) {
      const g = groundY(api, fx, fz) + ON_APRON;
      // MEASURED: the ring was C.stone (0.135) and under a torch at four metres it was the
      // brightest thing in the frame — nine white bricks round a fire nobody could see
      // (tests/shots/arch-r2/crowd-4m-torch.png). Fire-blacked stone is not white stone.
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2;
        k.solid.box(0.30, 0.22, 0.18, fx + Math.cos(a) * 0.72, g + 0.11, fz + Math.sin(a) * 0.72,
          shade(C.stone, 0.44), a);
      }
      k.solid.cyl(0.42, 0.30, 0.20, 8, fx, g + 0.12, fz, C.dark);
      for (let i = 0; i < 5; i++) {
        const a = rng.next() * Math.PI * 2;
        k.solid.cyl(0.045, 0.035, 0.70, 4, fx + Math.cos(a) * 0.12, g + 0.30, fz + Math.sin(a) * 0.12,
          shade(C.wood, 0.42), a, 0.42, 0);
      }
      // AND THE FIRE ITSELF, WHICH WAS NOT THERE. The whole fire was ONE HORIZONTAL PANE at
      // 0.30 m with a gain of 0.34: edge-on from a standing eye, and measured invisible at
      // four metres with the torch on and at fifteen without it — the crowd stood round a
      // cold ring of stones. sites.js's own campfire records the same lesson in its own
      // comment ("a flat bed is edge-on at 25 m and measured invisible from the verge") and
      // answers it with a glow COLUMN that fades out below head height. Same answer here.
      k.glow.pane(0.80, 0.80, fx, g + 0.24, fz, (u, v) => {
        const r = Math.min(1, Math.hypot(u, v));
        const f = 1 - r * r;
        return f * f * 0.66;
      }, 0, -Math.PI * 0.5, 6, 6);
      glowColumn(k.glow, fx, g + 0.16, fz, 0.40, 1.35, 0.58);
      api.emit({ kind: 'circle', x: fx, z: fz, r: 0.85, y0: g - 0.2, y1: g + 0.34, tag: 'stone', standable: true });
    }

    /* ---- THE DEAD, OUTSIDE THE WALLS ------------------------------------
     * The story the approach tells: people have been waiting here a long time and not all of
     * them are still waiting. The oldest are bone, out past the light; the newest still have
     * coats on, close to the gate.
     */
    for (const [lx, lz] of [[-11, R + 8], [13, R + 15], [-26, R + 31]]) {
      corpse(k, api, lx + rng.range(-1, 1), lz + rng.range(-1, 1), rng.range(0, 6.28), rng);
    }
    for (const [lx, lz] of [[-33, R + 47], [29, R + 66], [-19, R + 74], [40, R + 51], [-47, R + 22]]) {
      skeleton(k, api, lx + rng.range(-2, 2), lz + rng.range(-2, 2), rng.range(0, 6.28), rng);
    }
    // and a pit of them out on the treeline, which is where you put people you are not
    // burying one at a time
    {
      const px = -8, pz = R + 92;
      const g = groundY(api, px, pz) + ON_APRON;
      k.solid.quad(9.0, 6.0, px, g + 0.004, pz, shade(C.soil, 0.7), 0.2, -Math.PI * 0.5);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        skeleton(k, api, px + Math.cos(a) * (1.2 + rng.range(0, 1.9)),
          pz + Math.sin(a) * (1.0 + rng.range(0, 1.5)), rng.range(0, 6.28), rng);
      }
      // the spoil, on the OUTSIDE of the pit
      for (let i = 0; i < 14; i++) {
        const a = rng.next() * Math.PI * 2, d = 4.2 + rng.range(0, 1.6);
        const sx = px + Math.cos(a) * d, sz = pz + Math.sin(a) * d;
        k.solid.cone(rng.range(0.35, 0.7), rng.range(0.20, 0.42), 6, sx,
          groundY(api, sx, sz) + ON_APRON + 0.1, sz, shade(C.soil, 0.85));
      }
    }

    /* ---- THE MONEY, INSIDE THE WALLS ------------------------------------
     * Four strongboxes in the bailey and the undercroft. Alex: "cash should be in breakable
     * boxes at locations too." They are behind the gate on purpose — the toll is the loop.
     */
    for (const [lx, lz, ry] of [[-30, 4, 0.4], [-26, -6, -0.9], [24, 8, 1.7], [19, -22, 0.2]]) {
      strongbox(k, api, lx, lz, ry);
    }
    // and two more in the undercroft, now that the keep has one. The room's clear floor is
    // x -12.6..12.6, z -24.6..-3.4; the six piers stand at x +-6.3 on z -8.4/-14/-19.6, the
    // stair runs up the west side from z -5.5 to -19.1, and the fire basket is on the axis
    // at z -10.5. These two are clear of all of it.
    strongbox(k, api, -3.4, -22.2, 0.25);
    strongbox(k, api, 9.6, -6.4, -1.15);

    /* ---- AND THE DEAD INSIDE THE KEEP -----------------------------------
     * Alex: "there should be a lot more environmental story telling in areas with realistic
     * bodies and skeletons." The undercroft is the one room in the county where a body can
     * be found by torchlight in a made space instead of in a field.
     */
    for (const [lx, lz] of [[3.9, -20.6], [-4.4, -16.2]]) {
      skeleton(k, api, lx, lz, rng.range(0, 6.28), rng);
    }
    corpse(k, api, 10.2, -12.4, rng.range(0, 6.28), rng);

    /* ---- WHO IS ACTUALLY AT THE DOOR ------------------------------------
     * Five real bodies, dormant, placed by places' cast machinery the first time you come
     * within 150 m. The doorman stands IN the gate; the four guards are inside the arch and
     * on the flanks. They are 'standing' — the Standing Kind, an ordinary person who does
     * nothing at all until it notices you — which is exactly the ask: not a threat from a
     * distance, and a very bad idea up close.
     */
    /* ---- AND WHAT IS INSIDE ---------------------------------------------
     * Six Wardens, which is the whole pool: 2.55 m, 420 hp, slower than a walk, and worth
     * 260 XP each. They are dormant — a Warden standing in a dark bailey is a shape you can
     * see through the gate before you decide to pay, which is the whole reason to put them
     * where the crowd can be seen against them.
     *
     * That is 1,560 XP of garrison plus a 600 XP claim, against the county's next biggest
     * prize of 260. Alex asked for "full of xp"; this is the number that makes it true.
     */
    if (typeof api.cast === 'function') {
      api.cast([
        // the door
        { species: 'standing', lx: 0, lz: R + 1.6, yaw: Math.PI, awake: false },
        { species: 'standing', lx: -3.6, lz: R - 2.0, yaw: Math.PI, awake: false },
        { species: 'standing', lx: 3.6, lz: R - 2.0, yaw: Math.PI, awake: false },
        { species: 'poacher', lx: -8.0, lz: R + 4.5, yaw: Math.PI + 0.5, awake: false },
        { species: 'poacher', lx: 8.4, lz: R + 5.2, yaw: Math.PI - 0.5, awake: false },
        // the bailey
        { species: 'warden', lx: -18, lz: 26, yaw: 0.4, awake: false },
        { species: 'warden', lx: 21, lz: 18, yaw: -0.7, awake: false },
        { species: 'warden', lx: -34, lz: -12, yaw: 1.9, awake: false },
        // the keep's own door, and the two INSIDE it. Until this round the keep was a solid
        // block, so every Warden had to stand in the yard; the undercroft is a real room now
        // and two of them are in it, in the dark, past the fire.
        { species: 'warden', lx: 0, lz: 7.5, yaw: Math.PI, awake: false },
        { species: 'warden', lx: -6.0, lz: -17.5, yaw: 0.3, awake: false },
        { species: 'warden', lx: 7.0, lz: -21.0, yaw: -0.5, awake: false },
      ]);
    }

    return { solid: k.solid.build(), glow: k.glow.empty() ? null : k.glow.build() };
  },
};

// Keep THREE imported-and-used, the same reason dress-station.js does.
void THREE;

export default DRESS;
