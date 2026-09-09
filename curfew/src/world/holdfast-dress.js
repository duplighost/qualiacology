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

import {
  C, kits, groundY, ON_APRON, glowColumn, humanFigure, Kit, shell, gableFloor,
  PANE_WINDOW, PANE_LAMP, GLOW,
} from './sites.js';
import { skeleton, corpse } from './remains.js';

const P = { iron: [0.052, 0.052, 0.056], timber: [0.086, 0.066, 0.048] };
// The town's own palette. Everything inside a curtain wall is built of what was to hand, so
// it is the castle's stone below and cheap timber, daub and canvas above — all darker than
// the wall itself, which is what stops a town reading as a second castle from the gate.
const T = {
  daub: [0.092, 0.084, 0.070],
  daubAlt: [0.078, 0.072, 0.062],
  beam: [0.052, 0.040, 0.030],
  thatch: [0.070, 0.058, 0.038],
  tile: [0.048, 0.048, 0.052],
  canvas: [0.118, 0.108, 0.088],
  sack: [0.096, 0.086, 0.062],
  crate: [0.104, 0.078, 0.050],
  iron: [0.052, 0.052, 0.056],
};

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
   THE TOWN INSIDE THE WALLS — ROUND 19.

   ALEX, 2026-09-09:

     "The castle feels so empty and fucked. Just empty places inside the gates too. This
      place should be more awesome!"
     "Some boxes on the ground just in the gates kind of no where scattered about the castle
      grounds are odd. This place should be so built up like a little castle town. Like the
      one real town in the game with people."

   MEASURED, from inside (tests/shots/castle-r19/bailey-wide.png): 122 metres of cobble, a
   well, four strongboxes standing on their own in the open, an arcade down one side, a
   stable lean-to down the other, and nothing else at all. Everything the round-15 pass built
   is a WALL — the curtain, the ranges, the keep — and a wall is a boundary, not a place.

   So this is the inside of the boundary: a street of houses down both curtain walls, a
   market either side of the approach, two fires, and people at the stalls and in the
   doorways. The rules it is built under, none of them new:

     - ONE MERGED GEOMETRY. Every solid here goes on the dress's own kit and is merged into
       the site's single body mesh by places._dress, so the castle is still two draw calls
       and still zero new shader programs.
     - NO LIGHT IS EVER CREATED (CONTRACT). Every warm thing is the shared additive material
       through k.glow — a window pane, a lantern, a fire — at one of the rationed colours.
     - COLLIDERS ARE EMITTED IN THE LOOP THAT LAYS THE GEOMETRY, never afterwards. shell()
       does its own; everything else emits beside the statement that draws it.
     - THE APPROACH STAYS CLEAR. Nothing is laid inside |x| < 9 between the gate (z 66) and
       the keep's porch (z 2): you have to be able to walk in and see the keep.
     - THE PEOPLE ARE REAL. They are neutral residents from the enemy pool, like the crowd
       outside, so they can be talked past, walked round, shot, and (round 18) will heal and
       come back if you leave them alone. A welded silhouette you cannot interact with would
       be worse than an empty yard.
   ========================================================================== */

/** A townhouse: stone to the first floor, timber and daub above, a shuttered window that is
 *  lit if somebody is home, and a roof you can get onto. `face` is the direction the door
 *  looks in the site frame: -PI/2 for a door on the +X side, +PI/2 for one on -X. */
function townhouse(k, api, lx, lz, w, d, h, face, rng, lit) {
  const s = k.solid;
  shell(s, api, lx, lz, w, d, h, face, T.daub, 1.9);
  const y = api.padY;
  const cy = Math.cos(face), sy = Math.sin(face);
  // a point in the house's own frame, out into the site frame
  const P2 = (ux, uz) => [lx + ux * cy + uz * sy, lz - ux * sy + uz * cy];
  // the stone plinth course, so the daub above it has something to stand on
  s.box(w + 0.28, 1.3, d + 0.28, lx, y + 0.65, lz, C.stone, face);
  // the frame: four corner posts and a mid rail, which is the whole read of a timber house
  for (const ux of [-w * 0.5 + 0.12, w * 0.5 - 0.12]) {
    for (const uz of [-d * 0.5 + 0.12, d * 0.5 - 0.12]) {
      const [px, pz] = P2(ux, uz);
      s.box(0.22, h - 1.2, 0.22, px, y + 1.3 + (h - 1.3) * 0.5, pz, T.beam, face);
    }
  }
  s.box(w + 0.06, 0.20, 0.20, lx, y + h * 0.62, lz, T.beam, face);
  // the roof, and it is walkable — which is the only kind of climb reward this county has
  s.gable(d + 0.7, w + 0.7, y + h, 1.5, lx, 0, lz, T.tile, face + Math.PI * 0.5,
    { api, depth: w, col: T.daubAlt });
  gableFloor(api, lx, lz, d + 0.7, w + 0.7, y + h, 1.5, face + Math.PI * 0.5);
  // the door's lintel and its two jambs, on the face the shell left open (its local -Z)
  {
    const [dx, dz] = P2(0, -d * 0.5 - 0.05);
    s.box(2.3, 0.24, 0.30, dx, y + 2.25, dz, T.beam, face);
  }
  for (const ux of [-1.05, 1.05]) {
    const [jx, jz] = P2(ux, -d * 0.5 - 0.05);
    s.box(0.16, 2.1, 0.26, jx, y + 1.05, jz, T.beam, face);
  }
  // one window beside the door, with a sill and shutters. Lit only if lit: a town with every
  // window burning is a hotel, and this county's rule is that light means somebody is there.
  {
    const [wx, wz] = P2(w * 0.28, -d * 0.5 - 0.06);
    s.box(1.05, 0.14, 0.26, wx, y + 2.32, wz, T.beam, face);          // head
    s.box(1.20, 0.16, 0.30, wx, y + 1.30, wz, C.stone, face);         // sill
    for (const sx2 of [-0.62, 0.62]) {
      const [sx3, sz3] = P2(w * 0.28 + sx2, -d * 0.5 - 0.16);
      s.box(0.34, 0.96, 0.06, sx3, y + 1.86, sz3, T.beam, face);      // shutters, thrown back
    }
    if (lit) {
      const [gx, gz] = P2(w * 0.28, -d * 0.5 - 0.11);
      k.live.pane(0.86, 0.90, gx, y + 1.86, gz, PANE_WINDOW, face + Math.PI, 0, 4, 4);
    }
  }
  // firewood against the gable end, because a house in a cold county has firewood
  for (let i = 0; i < 5; i++) {
    const [fx, fz] = P2(-w * 0.5 - 0.34, -d * 0.28 + i * 0.30);
    s.cyl(0.11, 0.11, 0.62, 6, fx, groundY(api, fx, fz) + 0.11 + (i % 2) * 0.22, fz,
      T.beam, face, 0, Math.PI * 0.5);
  }
  const [ex, ez] = P2(-w * 0.5 - 0.34, 0);
  api.emit({ kind: 'obb', x: ex, z: ez, halfX: 0.34, halfZ: 0.9, yaw: face,
    y0: api.padY - 0.3, y1: api.padY + 0.56, tag: 'wood', standable: true });
  // and the doorstep somebody stands on
  const [px2, pz2] = P2(0, -d * 0.5 - 1.5);
  void rng;
  return { doorX: px2, doorZ: pz2, doorYaw: face + Math.PI };
}

/** A market stall: a trestle under a canvas awning, goods on it, a lamp over it. `face` is
 *  which way the front looks — the counter and the stallholder go on that side. */
function stall(k, api, lx, lz, face, rng) {
  const s = k.solid;
  const g = groundY(api, lx, lz) + ON_APRON;
  const cy = Math.cos(face), sy = Math.sin(face);
  const P2 = (ux, uz) => [lx + ux * cy + uz * sy, lz - ux * sy + uz * cy];
  // four posts
  for (const ux of [-1.35, 1.35]) for (const uz of [-1.0, 1.0]) {
    const [px, pz] = P2(ux, uz);
    s.cyl(0.075, 0.085, 2.30, 6, px, groundY(api, px, pz) + 1.15, pz, T.beam);
    api.emit({ kind: 'circle', x: px, z: pz, r: 0.12,
      y0: groundY(api, px, pz) - 0.3, y1: groundY(api, px, pz) + 2.3, tag: 'wood' });
  }
  // the awning, pitched forward so rain runs off the front
  s.box(3.10, 0.10, 2.40, lx, g + 2.34, lz, T.canvas, face, 0, -0.16);
  { const [vx, vz] = P2(0, -1.24); s.box(3.10, 0.34, 0.08, vx, g + 2.12, vz, T.canvas, face); }
  // the counter, and the trestles under it
  {
    const [bx, bz] = P2(0, -0.42);
    s.box(2.70, 0.14, 0.86, bx, g + 0.92, bz, T.beam, face);
    for (const ux of [-1.20, 1.20]) {
      const [lx2, lz2] = P2(ux, -0.42);
      s.box(0.16, 0.90, 0.16, lx2, g + 0.47, lz2, T.beam, face);
    }
    api.emit({ kind: 'obb', x: bx, z: bz, halfX: 1.35, halfZ: 0.43, yaw: face,
      y0: g - 0.3, y1: g + 0.99, tag: 'wood', standable: true });
  }
  // what is being sold: crates, sacks and a few jars, all on the counter and under it
  for (let i = 0; i < 3; i++) {
    const [cx, cz] = P2(-0.9 + i * 0.9, -0.42);
    s.box(0.44, 0.30, 0.40, cx, g + 1.14, cz, T.crate, face + rng.range(-0.2, 0.2));
  }
  for (let i = 0; i < 3; i++) {
    const [sx2, sz2] = P2(-1.0 + i * 1.0, 0.55);
    s.box(0.52, 0.46, 0.44, sx2, g + 0.23, sz2, T.sack, rng.range(0, 6.28));
    api.emit({ kind: 'obb', x: sx2, z: sz2, halfX: 0.28, halfZ: 0.24, yaw: 0,
      y0: g - 0.2, y1: g + 0.46, tag: 'cloth', standable: true });
  }
  for (let i = 0; i < 4; i++) {
    const [jx, jz] = P2(-1.1 + i * 0.75, -0.15);
    s.cyl(0.10, 0.12, 0.26, 7, jx, g + 1.14, jz, C.dark);
  }
  // the lamp hung off the front rail: the thing that makes a market read at ninety metres
  {
    const [gx, gz] = P2(0.98, -1.06);
    s.cyl(0.03, 0.03, 0.34, 5, gx, g + 2.22, gz, T.iron);
    s.box(0.20, 0.24, 0.20, gx, g + 1.94, gz, T.iron);
    k.live.pane(0.30, 0.30, gx, g + 1.94, gz, PANE_LAMP, face, 0, 5, 5);
    glowColumn(k.live, gx, g + 1.80, gz, 0.30, 0.85, 0.50);
  }
  const [fx, fz] = P2(0, -1.35);
  return { standX: fx, standZ: fz, standYaw: face };
}

/** A fire in the yard, in a ring of blacked stones. Same construction as the crowd's fires
 *  outside the gate, so the two read as the same county. */
function yardFire(k, api, fx, fz, rng) {
  const g = groundY(api, fx, fz) + ON_APRON;
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
  k.live.pane(0.80, 0.80, fx, g + 0.24, fz, (u, v) => {
    const r = Math.min(1, Math.hypot(u, v));
    const f = 1 - r * r;
    return f * f * 0.52;
  }, 0, -Math.PI * 0.5, 6, 6);
  // ROUND 19: 0.40 x 1.35 at gain 0.58 was a SOLID ORANGE CONE from four metres — an additive
  // column saturates against a night this dark, and its eight facets read as a traffic cone
  // standing in the fire (tests/shots/castle-town3/terrace-west.png). It had never been seen
  // lit before this round, because the body glow was gated on the claim. Half the gain, and a
  // shorter, narrower column: still a fire from the far side of the yard, and flame-shaped
  // when you walk up to it.
  glowColumn(k.live, fx, g + 0.14, fz, 0.30, 0.95, 0.30);
  api.emit({ kind: 'circle', x: fx, z: fz, r: 0.85, y0: g - 0.2, y1: g + 0.34, tag: 'stone', standable: true });
}

/* ==========================================================================
   THE DRESS
   ========================================================================== */
export const DRESS = {
  holdfast(api, out) {
    void out;
    // ROUND 19: `live` is the second glow channel — see places._dress. Everything warm the
    // Holdfast has belongs to the people standing in it, not to the player's breaker, so all
    // of it goes here and burns from the moment the chunk streams in.
    const k = kits(); k.people = new Kit(); k.live = new Kit(); k.live.additive = true;
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
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const side = (i & 1) ? 1 : -1;
      const lz = R + 5 + t * 34 + rng.range(-1.4, 1.4);
      const lx = side * (2.2 + t * 5.5) + rng.range(-1.1, 1.1);
      figure(k, api, lx, lz, Math.atan2(-lx, -(lz - R)) + rng.range(-0.35, 0.35), rng);
      n++;
    }

    // the knots, further out, facing each other
    for (const [cx, cz, count] of [[-17, R + 20, 3], [16, R + 27, 2], [22, R + 44, 3]]) {
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
    for (const [lx, lz] of [[-38, R + 12], [37, R + 9], [-31, R + 61], [30, R + 58]]) {
      figure(k, api, lx + rng.range(-2, 2), lz + rng.range(-2, 2),
        Math.atan2(-lx, -(lz - R)) + Math.PI + rng.range(-0.6, 0.6), rng);
      n++;
    }
    void n;

    /* ---- THE FIRE THEY ARE STANDING ROUND -------------------------------
     * Two, well back from the gate. The only bright things outside the walls, and small: the
     * frame's over-200 ration is 0.2% and the places lane already owns most of it.
     *
     * ROUND 19: this was fifteen lines of its own, byte-identical to the yard fires inside
     * the walls except for the two glow numbers — which meant softening the cone (see
     * yardFire) would have fixed the town's fires and left the crowd's alone. One fire.
     */
    yardFire(k, api, -17, R + 20, rng);
    yardFire(k, api, 22, R + 44, rng);

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

    /* ---- THE TOWN INSIDE THE WALLS, ROUND 19 -----------------------------
     * See the long note above this module's helpers. Two terraces, a market either side of
     * the approach, two fires, and the people who live here.
     */
    const town = [];

    // TWO TERRACES, backed onto the curtain either side of the approach. The west row stops
    // at z 8 because the hall range occupies z -34..0 behind it; the east row clears the
    // stable range (z -21..5) the same way. Depth 9 leaves 5 m between the back wall and the
    // curtain's inner face at |x| 64, which is the alley a town has.
    for (const side of [-1, 1]) {
      const face = side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;   // the door looks at the yard
      for (let i = 0; i < 4; i++) {
        const lz = 14 + i * 12 + rng.range(-1.2, 1.2);
        const lx = side * (55 + rng.range(-0.9, 0.9));
        const h = 5.2 + rng.range(0, 1.1);
        // Two of the eight have somebody in. The dark ones are the point: this place has
        // more houses than it has people left.
        const lit = (i === 1 && side < 0) || (i === 2 && side > 0);
        town.push(townhouse(k, api, lx, lz, 11, 9, h, face, rng, lit));
      }
    }

    // THE MARKET. Two ranks of stalls facing each other across the approach, far enough
    // apart (|x| 13) that the 14 m street between them stays a street.
    const stalls = [];
    for (const side of [-1, 1]) {
      const face = side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
      for (let i = 0; i < 4; i++) {
        stalls.push(stall(k, api, side * 13, 22 + i * 9.5 + rng.range(-0.8, 0.8), face, rng));
      }
    }

    // A CART, unhitched, with its shafts down — the thing that brought the market here.
    {
      const cx = -25, cz = 46, g2 = groundY(api, cx, cz) + ON_APRON;
      k.solid.box(3.4, 0.22, 1.9, cx, g2 + 0.94, cz, T.beam, 0.35);
      for (const ux of [-1.55, 1.55]) {
        k.solid.box(0.18, 0.62, 1.9, cx + ux * Math.cos(0.35), g2 + 1.25, cz - ux * Math.sin(0.35), T.beam, 0.35);
      }
      for (const [ux, uz] of [[-1.1, -0.95], [-1.1, 0.95], [1.1, -0.95], [1.1, 0.95]]) {
        const wx = cx + ux * Math.cos(0.35) + uz * Math.sin(0.35);
        const wz = cz - ux * Math.sin(0.35) + uz * Math.cos(0.35);
        k.solid.cyl(0.52, 0.52, 0.16, 12, wx, g2 + 0.52, wz, T.beam, 0.35, 0, Math.PI * 0.5);
      }
      // the shafts, on the ground where they were dropped
      for (const ux of [-0.62, 0.62]) {
        k.solid.cyl(0.07, 0.09, 3.2, 5, cx + ux + 1.9, g2 + 0.24, cz - 1.4, T.beam, 0.35, 0.28, Math.PI * 0.5);
      }
      api.emit({ kind: 'obb', x: cx, z: cz, halfX: 1.75, halfZ: 1.05, yaw: 0.35,
        y0: g2 - 0.3, y1: g2 + 1.05, tag: 'wood', standable: true });
    }

    /* ---- THE WORKING YARD, south of the market and either side of the keep ----
     * The half of the bailey between the ranges and the keep was the emptiest ground at the
     * whole site — 40 m of cobble with nothing on it in any direction. A castle's back yard
     * is where the work is: a smithy, a woodpile, a pen, and washing that somebody has left
     * out because there has not been a morning to bring it in on.
     */
    // THE SMITHY: an open-fronted forge against the west range's end, and it is the only
    // thing in the county that is orange from underneath.
    {
      const fx = -34, fz = -2, g2 = groundY(api, fx, fz) + ON_APRON;
      // the hood and its two piers
      for (const ux of [-1.9, 1.9]) {
        k.solid.box(0.7, 2.5, 0.7, fx + ux, g2 + 1.25, fz, C.stone);
        api.emit({ kind: 'obb', x: fx + ux, z: fz, halfX: 0.35, halfZ: 0.35, yaw: 0,
          y0: g2 - 0.3, y1: g2 + 2.5, tag: 'stone' });
      }
      k.solid.box(5.0, 0.5, 1.6, fx, g2 + 2.7, fz, C.stone);
      k.solid.box(1.4, 3.6, 1.4, fx, g2 + 4.7, fz - 0.1, C.stone);        // the chimney
      // the hearth itself, a low stone bench with a bed of coals in it
      k.solid.box(2.6, 0.86, 1.3, fx, g2 + 0.43, fz, shade(C.stone, 0.5));
      api.emit({ kind: 'obb', x: fx, z: fz, halfX: 1.3, halfZ: 0.65, yaw: 0,
        y0: g2 - 0.3, y1: g2 + 0.90, tag: 'stone', standable: true });
      k.live.pane(1.5, 0.7, fx, g2 + 0.90, fz, (u, v) => {
        const r = Math.min(1, Math.hypot(u, v));
        return (1 - r * r) * 0.72;
      }, 0, -Math.PI * 0.5, 6, 5);
      glowColumn(k.live, fx, g2 + 0.86, fz, 0.55, 1.10, 0.42);
      // the anvil, the trough and the tools
      k.solid.box(0.30, 0.34, 0.86, fx + 2.6, g2 + 0.62, fz + 1.5, T.iron);
      k.solid.cyl(0.28, 0.24, 0.70, 8, fx + 2.6, g2 + 0.22, fz + 1.5, T.beam);
      api.emit({ kind: 'circle', x: fx + 2.6, z: fz + 1.5, r: 0.32,
        y0: g2 - 0.3, y1: g2 + 0.80, tag: 'metal', standable: true });
      k.solid.box(1.5, 0.62, 0.72, fx - 2.9, g2 + 0.31, fz + 1.7, T.beam, 0.2);
      api.emit({ kind: 'obb', x: fx - 2.9, z: fz + 1.7, halfX: 0.75, halfZ: 0.36, yaw: 0.2,
        y0: g2 - 0.3, y1: g2 + 0.64, tag: 'wood', standable: true });
      figure(k, api, fx + 2.6, fz + 2.6, Math.PI, rng);
    }

    // THE WOODYARD: a stack under a lean-to, a block with an axe in it, and the chips.
    {
      const wx = 30, wz = -8, g2 = groundY(api, wx, wz) + ON_APRON;
      for (const ux of [-2.4, 2.4]) for (const uz of [-1.5, 1.5]) {
        k.solid.cyl(0.10, 0.12, 2.3, 6, wx + ux, groundY(api, wx + ux, wz + uz) + 1.15, wz + uz, T.beam);
        api.emit({ kind: 'circle', x: wx + ux, z: wz + uz, r: 0.14,
          y0: g2 - 0.3, y1: g2 + 2.3, tag: 'wood' });
      }
      k.solid.box(5.4, 0.12, 3.6, wx, g2 + 2.36, wz, T.thatch, 0, 0, -0.13);
      for (let row = 0; row < 4; row++) for (let i = 0; i < 7; i++) {
        k.solid.cyl(0.13, 0.13, 2.6, 6, wx - 1.9 + i * 0.32, g2 + 0.16 + row * 0.27, wz - 0.4,
          T.beam, 0, 0, Math.PI * 0.5);
      }
      api.emit({ kind: 'obb', x: wx - 0.9, z: wz - 0.4, halfX: 1.35, halfZ: 1.35, yaw: 0,
        y0: g2 - 0.3, y1: g2 + 1.20, tag: 'wood', standable: true });
      // the block, and the axe left in it
      k.solid.cyl(0.42, 0.44, 0.72, 10, wx + 1.6, g2 + 0.36, wz + 2.4, T.beam);
      k.solid.box(0.06, 0.72, 0.05, wx + 1.6, g2 + 1.02, wz + 2.4, T.beam, 0, 0.35);
      k.solid.box(0.10, 0.20, 0.24, wx + 1.72, g2 + 0.78, wz + 2.4, T.iron, 0, 0.35);
      api.emit({ kind: 'circle', x: wx + 1.6, z: wz + 2.4, r: 0.44,
        y0: g2 - 0.3, y1: g2 + 0.74, tag: 'wood', standable: true });
      for (let i = 0; i < 12; i++) {
        const a = rng.next() * Math.PI * 2, r = 0.7 + rng.next() * 1.9;
        k.solid.box(0.16, 0.05, 0.10, wx + 1.6 + Math.cos(a) * r, g2 + 0.025,
          wz + 2.4 + Math.sin(a) * r, T.beam, a);
      }
    }

    // WASHING, strung between the west terrace and a post, because nobody took it in.
    {
      const lx2 = -44, lz2 = 20, g2 = groundY(api, lx2, lz2) + ON_APRON;
      k.solid.cyl(0.09, 0.11, 3.0, 6, lx2, g2 + 1.5, lz2 - 4.5, T.beam);
      k.solid.cyl(0.09, 0.11, 3.0, 6, lx2, g2 + 1.5, lz2 + 4.5, T.beam);
      k.solid.box(0.03, 0.03, 9.0, lx2, g2 + 2.85, lz2, T.beam);
      for (let i = 0; i < 6; i++) {
        const t2 = -3.6 + i * 1.45;
        k.solid.quad(0.62, 0.86 + rng.range(-0.2, 0.2), lx2, g2 + 2.35, lz2 + t2,
          shade(T.canvas, 0.8 + rng.range(0, 0.3)), Math.PI * 0.5);
      }
      api.emit({ kind: 'circle', x: lx2, z: lz2 - 4.5, r: 0.13, y0: g2 - 0.3, y1: g2 + 3.0, tag: 'wood' });
      api.emit({ kind: 'circle', x: lx2, z: lz2 + 4.5, r: 0.13, y0: g2 - 0.3, y1: g2 + 3.0, tag: 'wood' });
    }

    // A PEN against the stable range, with its gate hanging open and nothing in it.
    {
      const px2 = 40, pz2 = 6;
      for (let i = 0; i <= 8; i++) {
        const ux = -6 + i * 1.5;
        const gx = px2 + ux, gz = pz2 - 4.5, gg = groundY(api, gx, gz) + ON_APRON;
        k.solid.cyl(0.08, 0.10, 1.35, 5, gx, gg + 0.67, gz, T.beam);
        if (i < 8) k.solid.box(1.5, 0.09, 0.06, gx + 0.75, gg + 0.95, gz, T.beam);
        if (i < 8) k.solid.box(1.5, 0.09, 0.06, gx + 0.75, gg + 0.55, gz, T.beam);
        api.emit({ kind: 'circle', x: gx, z: gz, r: 0.12, y0: gg - 0.3, y1: gg + 1.35, tag: 'wood' });
      }
      for (let i = 0; i <= 6; i++) {
        const uz = -4.5 + i * 1.5;
        const gx = px2 - 6, gz = pz2 + uz, gg = groundY(api, gx, gz) + ON_APRON;
        k.solid.cyl(0.08, 0.10, 1.35, 5, gx, gg + 0.67, gz, T.beam);
        if (i < 6) k.solid.box(0.06, 0.09, 1.5, gx, gg + 0.95, gz + 0.75, T.beam);
        api.emit({ kind: 'circle', x: gx, z: gz, r: 0.12, y0: gg - 0.3, y1: gg + 1.35, tag: 'wood' });
      }
      // a trough and a scatter of straw
      const tg = groundY(api, px2 - 2, pz2 + 2) + ON_APRON;
      k.solid.box(2.2, 0.42, 0.72, px2 - 2, tg + 0.21, pz2 + 2, T.beam, 0.1);
      api.emit({ kind: 'obb', x: px2 - 2, z: pz2 + 2, halfX: 1.1, halfZ: 0.36, yaw: 0.1,
        y0: tg - 0.3, y1: tg + 0.44, tag: 'wood', standable: true });
      for (let i = 0; i < 16; i++) {
        const a = rng.next() * Math.PI * 2, r = rng.next() * 5.0;
        const sx2 = px2 - 1 + Math.cos(a) * r, sz2 = pz2 + Math.sin(a) * r;
        k.solid.quad(0.5, 0.7, sx2, groundY(api, sx2, sz2) + ON_APRON + 0.006, sz2,
          shade(T.sack, 0.75), rng.range(0, 6.28), -Math.PI * 0.5);
      }
    }

    // TWO FIRES IN THE YARD. Off the axis, so the street stays dark and the sides are warm —
    // which is also what makes the keep read as the black thing at the end of a lit street.
    yardFire(k, api, -26, 30, rng);
    yardFire(k, api, 27, 47, rng);

    // THE PEOPLE WHO LIVE HERE. Alex: "Like the one real town in the game with people."
    // One at each stall, four in doorways, and a knot of three at the nearer fire. They are
    // neutral residents from the pool, exactly like the crowd outside the gate.
    for (const st of stalls) {
      figure(k, api, st.standX, st.standZ, st.standYaw + Math.PI, rng);
    }
    for (let i = 0; i < town.length; i += 2) {
      const t2 = town[i];
      figure(k, api, t2.doorX, t2.doorZ, t2.doorYaw + rng.range(-0.4, 0.4), rng);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.7;
      figure(k, api, -26 + Math.cos(a) * 1.7, 30 + Math.sin(a) * 1.7,
        Math.atan2(-Math.cos(a), -Math.sin(a)) + rng.range(-0.2, 0.2), rng);
    }

    /* ---- THE MONEY, INSIDE THE WALLS ------------------------------------
     * Six strongboxes in the town, the bailey and the undercroft. Alex: "cash should be in
     * breakable boxes at locations too." They are behind the gate on purpose — the toll is
     * the loop.
     *
     * ROUND 19. ALEX: "Some boxes on the ground just in the gates kind of no where scattered
     * about the castle grounds are odd." They were: four iron-banded chests standing on bare
     * cobble in the middle of a 122 m yard with nothing near them, which reads as loot
     * placement and not as a place. They are IN the town now — behind a stall's counter, in
     * a house doorway, against the cart, under the stable lean-to — so each of them is
     * somewhere a chest would actually be, and finding one is a thing you did rather than a
     * thing that was left out for you.
     */
    for (const [lx, lz, ry] of [
      [-13.0, 40.4, 1.55],     // behind the second west stall's counter
      [13.0, 26.6, -1.55],     // and behind the first east one
      [-49.0, 26.2, 0.35],     // in the west terrace's second doorway
      [49.0, 38.4, -0.35],     // and the east terrace's third
      [-23.4, 44.6, 0.9],      // against the cart
      [48.6, -4.0, -0.2],      // under the stable lean-to, out of the light
    ]) {
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
        { species:'sentry', lx:-3.3, lz:R+5.0, yaw:0, guard:true, hpScale:1.5 },
        { species:'sentry', lx:3.3, lz:R+5.0, yaw:0, guard:true, hpScale:1.5 },
        { species:'sentry', lx:9, lz:R+6.5, yaw:-0.4, guard:true, hpScale:1.5 },
        { species:'marshal', lx:-16, lz:R+12, yaw:0, guard:true },
        { species:'marshal', lx:18, lz:R+12, yaw:0, guard:true },
      ]);
    }

    return {
      people: k.people.build(), solid: k.solid.build(),
      glow: k.glow.empty() ? null : k.glow.build(),
      glowLive: k.live.empty() ? null : k.live.build(), glowLiveColour: GLOW.ember,
    };
  },
};

export default DRESS;
