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
// The waiting crowd is authored scenery with its own cloth material. Real gate
// guards use the enemy pool with a neutral state: arriving, lighting a torch or
// making incidental noise does not attack the player. Damage starts the fight.
// All five stand outside the shut leaves so the fight route can be completed.

import { C, kits, groundY, ON_APRON, glowColumn, humanFigure, Kit } from './sites.js';
import { skeleton, corpse } from './remains.js';

const P = { iron: [0.052, 0.052, 0.056], timber: [0.086, 0.066, 0.048] };

const shade = (col, k) => [col[0] * k, col[1] * k, col[2] * k];

// Share anatomy and clothing with the recognisable cashier at the gate.
function figure(k, api, lx, lz, yaw, rng) {
  return humanFigure(k.people, api, lx, lz, yaw, rng);
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
    const k = kits(); k.people = new Kit();
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

    // Three armed guards and two heavy Wardens hold the outside of the gate.
    // Killing the complete garrison opens the same persistent access as payment.
    if (typeof api.cast === 'function') {
      api.cast([
        { species:'poacher', lx:-3.3, lz:R+5.0, yaw:0, guard:true, hpScale:1.5 },
        { species:'poacher', lx:3.3, lz:R+5.0, yaw:0, guard:true, hpScale:1.5 },
        { species:'poacher', lx:9, lz:R+6.5, yaw:-0.4, guard:true, hpScale:1.5 },
        { species:'warden', lx:-16, lz:R+12, yaw:0, guard:true },
        { species:'warden', lx:18, lz:R+12, yaw:0, guard:true },
      ]);
    }

    return { people: k.people.build(), solid: k.solid.build(), glow: k.glow.empty() ? null : k.glow.build() };
  },
};

export default DRESS;
