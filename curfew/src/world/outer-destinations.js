// Three outer-county expeditions. Geometry and collision share the same authored
// measurements. Long sightlines invite entry; side aisles and ordinary stairs reward it.
// No independent lights or materials: these reuse places' warmed, merged kit.
import * as THREE from 'three';
import { QUARRY_PIT, quarryBenchGround, quarryInclineHeight, quarryInclineEnd } from './world-scars.js';

const P = Object.freeze({
  iron: [0.064, 0.072, 0.075], rust: [0.102, 0.057, 0.035],
  stone: [0.079, 0.083, 0.078], moss: [0.040, 0.062, 0.052],
  dark: [0.027, 0.030, 0.032], wood: [0.076, 0.052, 0.033],
  bone: [0.125, 0.123, 0.099], glass: [0.041, 0.076, 0.084],
  copper: [0.114, 0.080, 0.043], earth: [0.040, 0.043, 0.032],
});
const Y = 0.16;
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3(), _q = new THREE.Quaternion();

// These are also the authored route probes. Stairs have sub-STEP_UP rises and
// real upper slabs; entering a destination never needs a teleport or camera pan.
export const OUTER_ROUTES = Object.freeze({
  glasshouse: { entrance: [0, 31, Y], floor: [0, -48, Y], loot: [[-24, -36], [24, -16], [-24, 12], [0, -55]] },
  'bell-vault': { entrance: [0, 31, Y], floor: [0, -45, Y],
    stair: { x: 16, startZ: 17, endZ: -8.6, base: Y, top: 5.2, count: 32, width: 4.4 },
    loot: [[-17, -38], [-17, 8], [0, -50]], upperLoot: [16, -24, 5.2] },
  // The pit (world-scars.js QUARRY_PIT): padY is the FLOOR, the rim is +14. The route comes
  // off the rim through the east gap at the incline's head (a bollard stands in the middle, so
  // the car cannot follow), down the incline, which is ground, and out onto the floor. The upper
  // strongbox is on the second bench, the far west side: a mantle over the incline's cheek wall.
  'red-quarry': { entrance: [1.0, 27, 0], floor: [1.0, -30, 0], rim: 14,
    loot: [[-23, -30], [12, -19], [4, -51]], upperLoot: [-34, -45, 7.0] },
});

function member(s, a, b, radius, col, segments = 6) {
  _dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _dir.length();
  if (len < 0.001) return;
  const g = new THREE.CylinderGeometry(radius, radius, len, segments);
  _q.setFromUnitVectors(_up, _dir.normalize()); g.applyQuaternion(_q);
  g.translate((a[0] + b[0]) * .5, (a[1] + b[1]) * .5, (a[2] + b[2]) * .5);
  s.push(g, col);
}

function slab(k, api, x, z, w, d, top, col, thickness = .22) {
  const y = api.padY + top;
  k.solid.box(w, thickness, d, x, y - thickness * .5, z, col);
  // Collision deliberately rejects prop AABBs larger than 48 m. A whole floor
  // emitted as one box therefore looked solid but left the feet under it. Tile
  // the support beneath the one merged visual slab, with shared exact edges.
  const nx = Math.ceil(w / 40), nz = Math.ceil(d / 40);
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    api.emit({ kind: 'obb', x: x - w * .5 + (ix + .5) * w / nx,
      z: z - d * .5 + (iz + .5) * d / nz, halfX: w / nx * .5, halfZ: d / nz * .5, yaw: 0,
      y0: y - thickness, y1: y, tag: 'stone', standable: true, climbable: false });
  }
}

function post(k, api, x, z, r, h, col, groundY) {
  const y = groundY(api, x, z) + .08;
  k.solid.cyl(r * .82, r, h, 8, x, y + h * .5, z, col);
  api.emit({ kind: 'circle', x, z, r, y0: y - .3, y1: y + h, tag: 'wall' });
}

function arch(k, api, z, half, rise, spring, thickness, col, groundY) {
  for (const x of [-half, half]) post(k, api, x, z, thickness, spring, col, groundY);
  const y = api.padY + .08 + spring;
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI, b = (i + 1) / 16 * Math.PI;
    member(k.solid, [Math.cos(a) * half, y + Math.sin(a) * rise, z],
      [Math.cos(b) * half, y + Math.sin(b) * rise, z], thickness, col, 8);
  }
  // The arch crown is above the entire walking envelope. The side shafts are
  // separately collidable; a full wall AABB here would seal the open passage.
  for (const side of [-1, 1]) api.emit({ kind: 'obb', x: side * half * .5, z,
    halfX: half * .5, halfZ: thickness, yaw: 0,
    y0: y + rise * .78, y1: y + rise + thickness, tag: 'wall' });
}

function lamp(k, x, y, z, tint = [1, 1, 1]) {
  k.solid.cyl(.19, .23, .10, 8, x, y + .32, z, P.iron);
  k.solid.cyl(.21, .17, .09, 8, x, y - .04, z, P.iron);
  k.glow.cyl(.085, .085, .28, 8, x, y + .14, z, tint);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI * .5;
    k.solid.cyl(.022, .022, .34, 5, x + Math.sin(a) * .17, y + .13, z + Math.cos(a) * .17, P.iron);
  }
}

function chest(k, api, x, z, top = Y, strong = false) {
  const y = api.padY + top, s = k.solid, h = strong ? .60 : .80;
  s.open();
  s.box(1.14, h, .80, x, y + h * .5, z, P.wood);
  for (let i = 0; i < 5; i++) s.box(.018, h * .84, .014, x - .45 + i * .225, y + h * .5, z + .407, P.dark);
  for (const dx of [-.40, .40]) s.box(.082, h + .065, .84, x + dx, y + h * .5, z, strong ? P.iron : P.copper);
  s.box(1.18, .09, .84, x, y + h + .01, z, P.wood);
  s.box(.15, .19, .07, x, y + h * .68, z + .44, P.copper);
  s.close(x, z, .95, P.wood);
  api.emit({ kind: 'obb', x, z, halfX: .59, halfZ: .44, yaw: 0,
    y0: y, y1: y + h + .07, tag: strong ? 'strongbox' : 'crate', standable: true, breakable: true });
}

function stair(k, api, spec) {
  const run = (spec.startZ - spec.endZ) / spec.count;
  const rise = (spec.top - spec.base) / spec.count;
  for (let i = 0; i < spec.count; i++) {
    const z = spec.startZ - run * (i + .5), h = spec.base + rise * (i + 1);
    slab(k, api, spec.x, z, spec.width, run + .025, h, P.stone, .20);
    // A visible weathered nosing makes a real stair legible in the torch beam.
    k.solid.box(spec.width, .045, .055, spec.x, api.padY + h + .002, z + run * .5 - .03, P.copper);
  }
  for (const side of [-1, 1]) {
    const x = spec.x + side * (spec.width * .5 + .08);
    member(k.solid, [x, api.padY + spec.base + .85, spec.startZ],
      [x, api.padY + spec.top + .85, spec.endZ], .06, P.iron);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, z = spec.startZ + (spec.endZ - spec.startZ) * t;
      const h = spec.base + (spec.top - spec.base) * t;
      k.solid.cyl(.06, .06, .92, 6, x, api.padY + h + .46, z, P.iron);
    }
  }
}

function result(k, glowColour, cast = null) {
  return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour, cast };
}

/* ==================================================================== THE RED QUARRY ==
   ALEX, 2026-09-18: "the red quarry destination could be so much cooler if it actually was a
   large spot below ground level."

   It is a pit now: world-scars.js QUARRY_PIT carves the ground 14 m down (the site's padY is
   the FLOOR; the rim is +14) and everything here stands on that carve. Local frame as ever:
   +Z toward the road, which runs past 38 m north of the pit's north lip.

   THE BENCHES are cut blocks, because terrain cannot draw a vertical face. Three 3.5 m
   treads and a coping, each band a partition of four strips (the south and north strips own
   the square corners), each strip cut into 8-11 m blocks whose pit face is pushed out 0-18 cm
   so the wall reads as quarried blocks and never as one extrusion. A pushed face only ever
   grows INTO the rock mass below it, so the variation cannot open a slot. Every block is one
   standable OBB from under the ground (the carve's slope minus 1.2 m) to its tread.

   WHAT MAY STAND WHERE (the carve's laws, restated for the builder): enemies walk the ground,
   so they come down the incline after you, cross the floor and walk the rim; they are never on
   a tread, a cheek wall or the coping inside the fence, where the ground is far under the
   stone. The player has more: the treads by the ladders or any bench face (held Space), the
   cheek walls, and the rim paving up to the fence.
   ======================================================================================== */
const Q = QUARRY_PIT;
const QP = Object.freeze({
  rock: [0.110, 0.056, 0.035], scree: [0.072, 0.051, 0.039],
  bed: [0.058, 0.033, 0.023], cut: [0.150, 0.078, 0.050], fresh: [0.186, 0.101, 0.066],
  steel: [0.118, 0.121, 0.125], timber: [0.084, 0.058, 0.036],
});
// THE COPING is one course of paving, 6 cm over the rim, and the fence stands 0.5 m OUTSIDE
// the crest, not at the lip. The reason is two collision rules that meet here: a walker who
// moves UP ground steeper than 47 degrees is stopped when that ground is within 0.48 m of his
// feet, and a body may step onto anything within 0.60 m of what it stands on while an enemy
// stands only on the ground (nav.js followGround). The crest climbs 63 degrees to the rim, so
// paving over it walled the player in at the lip (measured, node walk), and a raised kerb over
// it let a hound on the paving press its chest into the kerb (measured, r3 station probe). With
// the fence at the crest nobody walks over it; everyone stands on paving over flat rim.
const COPE_TOP = Q.depth + 0.06;          // the paving: 3.5 cm over the apron that drapes the rim
const RAIL_E = Q.crest + 0.5;
const bandTop = (b) => (b < 4 ? Q.rise * b : COPE_TOP);
const bandInner = (b) => Q.bench * (b - 1);
// The north coping reaches the stair-head landing at e 17.6; the other three stop at 17.2.
const bandOuter = (b, side) => (b < 4 ? Q.bench * b : (side === 'N' ? 17.6 : Q.coping));
const INC = Q.incline, INC_END = quarryInclineEnd();
const CHEEK = Object.freeze({ x0: INC.half, x1: 4.8 });   // over the incline's notch edge (4.6)
// The benches' ladders (climbs-and-caches.js 'red-quarry' climbs): the block each one is bolted
// to keeps its face unpushed, so the boarding sits flush on the stone and never off it.
const LADDERS = Object.freeze([{ side: 'W', band: 1, u: -45 }, { side: 'W', band: 2, u: -41.5 }]);
// hookY is the hook block's middle: 5 m over BLOCK 1's top, so its sling stands at 50 degrees
// and reads as chains carrying a weight, not a flat thread across a lid.
const DERRICK = Object.freeze({ x: 20, z: -40, h: 30, tipX: -6, tipY: 23, hookY: 16.4 });
const CONVEYOR = Object.freeze({ z: -10, x0: 22, x1: 46.6, y0: 1.2, slope: 0.9 });
const beltY = (x) => CONVEYOR.y0 + CONVEYOR.slope * (x - CONVEYOR.x0);
// THE FLOODLIGHTS, which come on with the claim. The first cut was a lantern on a pole, and
// claimed, from the rim, five of them were 2-4 px orange beads over a floor still lit by the
// moon: the claim could not be seen. Now each pole carries two heads on a crossarm aimed at
// the stone it lights (or, the one by the sump, at him), a hot core and a wide haze round each
// head (lampGlow), and a pool of light on the face it is aimed at, carried by that block's own
// glow pane (benchBlock). No pool on the FLOOR: a horizontal additive sheet is what Alex saw as
// "a translucent square overlay across the screen" (sites.js PANE_WASH), and sites.mjs pins
// every one at 2 m^2. All of it is the one merged glow mesh the claim already fades up.
const FLOODS = Object.freeze([
  { x: -6, z: -4, ax: -11, az: 1, wash: { side: 'N', band: 1, u: -11, half: 4.0, y: 1.74, yHalf: 1.72, peak: 0.3 } },
  { x: 15, z: -6, ax: 14, az: 1, wash: { side: 'N', band: 1, u: 14, half: 4.0, y: 1.74, yHalf: 1.72, peak: 0.3 } },
  { x: -21, z: -24, ax: -28, az: -27, wash: { side: 'W', band: 1, u: -27, half: 4.2, y: 1.74, yHalf: 1.72, peak: 0.32 } },
  { x: 6, z: -32, ax: -9, az: -38, wash: null },
  { x: 24, z: -48, ax: 28, az: -46, wash: { side: 'E', band: 1, u: -46, half: 3.6, y: 1.74, yHalf: 1.72, peak: 0.32 } },
]);
/** A soft round glow, hot at the middle, gone at the rim (a pane profile, -1..1 both ways). */
const haloProfile = (peak) => (u, v) => { const r = Math.min(1, Math.hypot(u, v)), k = 1 - r; return peak * k * k * k; };
/** Two crossed upright panes round a lamp: the glow that says a lamp is lit from 80 m. */
function halo(G, x, y, z, size, peak, yaw = 0) {
  const prof = haloProfile(peak);
  G.pane(size, size, x, y, z, prof, yaw, 0, 6, 6);
  G.pane(size, size, x, y, z, prof, yaw + Math.PI * 0.5, 0, 6, 6);
}
/** A lamp's light in the cold air: a tight hot core, and a wide faint haze that is what still
 *  reads from the rim and the road (a single mid-sized halo was a 5 px bead at 70 m, and a
 *  bright orange smear when you stood under it). */
function lampGlow(G, x, y, z, core, yaw = 0) {
  halo(G, x, y, z, core, 0.5, yaw);
  halo(G, x, y, z, core * 4, 0.12, yaw);
}

/** A floodlight pole: the post and its collider, a crossarm across the aim, and two heads on
 *  it pitched down at what they light, their lenses and halos on the glow kit. */
function floodlight(k, api, F, groundY) {
  const S = k.solid, G = k.glow, gy = groundY(api, F.x, F.z);
  post(k, api, F.x, F.z, 0.09, 4.2, P.iron, groundY);
  const top = gy + 0.08 + 4.2, dx = F.ax - F.x, dz = F.az - F.z, L = Math.hypot(dx, dz);
  const fx = dx / L, fz = dz / L, yaw = Math.atan2(fx, fz), px = fz, pz = -fx, pitch = 0.42;
  S.box(1.52, 0.08, 0.08, F.x, top - 0.1, F.z, P.iron, yaw);                          // the crossarm
  S.box(0.2, 0.12, 0.2, F.x, top + 0.0, F.z, P.iron, yaw);                            // its clamp
  for (const side of [-1, 1]) {
    const hx = F.x + px * side * 0.44 + fx * 0.04, hz = F.z + pz * side * 0.44 + fz * 0.04, hy = top + 0.16;
    for (const cz of [-0.14, 0.14]) S.box(0.03, 0.26, 0.03, hx + px * cz * 1.9, top + 0.03, hz + pz * cz * 1.9, P.iron, yaw);   // the yoke
    S.box(0.46, 0.32, 0.2, hx, hy, hz, P.dark, yaw, pitch);                                // the head
    S.box(0.5, 0.04, 0.26, hx - fx * 0.02, hy + 0.17, hz - fz * 0.02, P.iron, yaw, pitch); // its hood
    // the lens on its front face, and the halo just in front of that
    const nx = fx * Math.cos(pitch), ny = -Math.sin(pitch), nz = fz * Math.cos(pitch);
    G.pane(0.4, 0.26, hx + nx * 0.105, hy + ny * 0.105, hz + nz * 0.105, (u, v) => 0.62 * (1 - 0.4 * (u * u + v * v)), yaw, pitch, 4, 4);
    lampGlow(G, hx + nx * 0.3, hy + ny * 0.3, hz + nz * 0.3, 0.9, yaw);
  }
}

/** A box between (x0,z0) and (x1,z1) in the site frame, from y0 to y1 above the floor. */
function qbox(S, api, x0, x1, z0, z1, y0, y1, col) {
  S.box(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) * 0.5, api.padY + (y0 + y1) * 0.5, (z0 + z1) * 0.5, col);
}

/** A flat trapezoid lying on a pit face, `lift` proud of it and facing the pit: a stain. */
function faceTrap(S, along, face, out, u, yTop, yBot, wTop, wBot, col, lift) {
  const f = face + out * lift;
  const pos = along
    ? [u - wTop / 2, yTop, f, u + wTop / 2, yTop, f, u + wBot / 2, yBot, f, u - wBot / 2, yBot, f]
    : [f, yTop, u - wTop / 2, f, yTop, u + wTop / 2, f, yBot, u + wBot / 2, f, yBot, u - wBot / 2];
  const n = along ? [0, 0, out] : [out, 0, 0];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([...n, ...n, ...n, ...n], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
  // wound so its FRONT is the side facing the pit: the material is double-sided and turns a
  // back face's normal round, which lit these marks from inside the wall (they drew black)
  g.setIndex((along ? out < 0 : out > 0) ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  S.push(g, col);
}

/** A flat mark on a pit face: w x h, centred at (u, y), turned `rot` in the face's own plane
 *  (its top moves -rot per metre along u), `lift` proud of the face and facing the pit. Two
 *  triangles: only its front could ever be seen, so it is not a box. */
function faceQuad(S, along, face, out, lift, u, y, w, h, rot, col) {
  const f = face + out * lift, c = Math.cos(rot), s = Math.sin(rot), pos = [];
  for (const [cx, cy] of [[-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]]) {
    const du = cx * c - cy * s, dy = cx * s + cy * c;
    if (along) pos.push(u + du, y + dy, f); else pos.push(f, y + dy, u + du);
  }
  const n = along ? [0, 0, out] : [out, 0, 0];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([...n, ...n, ...n, ...n], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
  // wound so its FRONT is the side facing the pit: the material is double-sided and turns a
  // back face's normal round, which lit these marks from inside the wall (they drew black)
  g.setIndex((along ? out < 0 : out > 0) ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  S.push(g, col);
}

/** How far each mark on a face stands proud of it. No two kinds that can cross share a value
 *  (the foot and the overburden are at opposite ends of a riser), so no two coplanar marks
 *  fight where they cross, and all are under the 3 cm the collider forgives. */
const PROUD = Object.freeze({ strata: 0.006, foot: 0.012, stain: 0.016, bed: 0.02, trace: 0.024, plug: 0.028, burden: 0.012, wash: 0.034 });

/** The light a claimed floodlight throws on the stone it is aimed at: 1 at the middle of the
 *  pool, nothing at its edge. A pane only ever carries the part of this that lands on its own
 *  block, so a pool that spans three blocks is one pool. */
const washAt = (W, u, y) => {
  const r2 = ((u - W.u) / W.half) ** 2 + ((y - W.y) / W.yHalf) ** 2;
  return r2 >= 1 ? 0 : W.peak * (1 - r2) ** 1.6;
};

/** One cut block of a bench band and its collider, and what the work and the weather left on
 *  its pit face. */
function benchBlock(k, api, rng, side, band, ua, ub, eIn, eOut, bottom, top, prev, eFace) {
  const S = k.solid, noClimb = band === 4;
  let x0, x1, z0, z1;
  if (side === 'S') { x0 = ua; x1 = ub; z0 = Q.fz0 - eOut; z1 = Q.fz0 - eIn; }
  else if (side === 'N') { x0 = ua; x1 = ub; z0 = Q.fz1 + eIn; z1 = Q.fz1 + eOut; }
  else if (side === 'W') { x0 = Q.fx0 - eOut; x1 = Q.fx0 - eIn; z0 = ua; z1 = ub; }
  else { x0 = Q.fx1 + eIn; x1 = Q.fx1 + eOut; z0 = ua; z1 = ub; }
  const tone = 0.84 + rng.next() * 0.30, warm = 1 + (rng.next() - 0.5) * 0.10;
  const rock = [QP.rock[0] * tone * warm, QP.rock[1] * tone, QP.rock[2] * tone / warm];
  const scree = [QP.scree[0] * tone, QP.scree[1] * tone, QP.scree[2] * tone];
  const shade = (m0, m1, m2) => [rock[0] * m0, rock[1] * m1, rock[2] * m2];
  const SCREE = 0.06;
  qbox(S, api, x0, x1, z0, z1, bottom, top - SCREE, rock);
  if (band < 4) qbox(S, api, x0, x1, z0, z1, top - SCREE, top, scree);
  else copingSlabs(S, api, rng, x0, x1, z0, z1, top, tone, side === 'S' || side === 'N');
  api.emit({ kind: 'obb', x: (x0 + x1) * 0.5, z: (z0 + z1) * 0.5, halfX: (x1 - x0) * 0.5, halfZ: (z1 - z0) * 0.5,
    // A tread is a ledge: the held-Space climb takes a bench face anywhere (the ladders are
    // where it is plainly meant), and a no-climb flag would refuse the ladders' pull-over too.
    // The coping inside the crest fence is refused: pulled up onto it from the third bench,
    // the crest's ground stops the walk out to the fence (see COPE_TOP).
    yaw: 0, y0: api.padY + bottom, y1: api.padY + top, tag: 'stone', standable: true, climbable: !noClimb });
  // THE PIT FACE. The first cut of these faces was one flat red plane ruled with near-black,
  // dead-straight, full-height lines, and under the torch it read as plywood hoarding with
  // battens. What cut stone actually carries, at low contrast: drill traces that come and go
  // and never quite plumb, a row of plug-and-feather holes along a split top edge, a bedding
  // plane that steps where the block was lifted, water stains hanging from the tread lip, and
  // a darker wet band at the foot where the water stands.
  const lo = prev + 0.15, hi = top - 0.12;
  if (hi - lo < 0.5) return;
  const along = side === 'S' || side === 'N';
  const visLo = Math.max(along ? x0 : z0, along ? Q.fx0 - eFace : Q.fz0 - eFace);
  const visHi = Math.min(along ? x1 : z1, along ? Q.fx1 + eFace : Q.fz1 + eFace);
  if (visHi - visLo < 0.6) return;
  const face = side === 'S' ? z1 : side === 'N' ? z0 : side === 'W' ? x1 : x0;
  const out = side === 'S' || side === 'W' ? 1 : -1;          // toward the pit, along the face's axis
  // a ladder's boarding sits flush on this stone: nothing is drawn on the face behind it
  const keep = LADDERS.filter(L => L.side === side && L.band === band).map(L => [L.u - 1.15, L.u + 1.15]);
  const free = (a, b) => keep.every(([p, q]) => b <= p || a >= q);
  const spans = (a, b) => {
    let r = [[a, b]];
    for (const [p, q] of keep) r = r.flatMap(([s, e]) => (e <= p || s >= q) ? [[s, e]] : [[s, p], [q, e]].filter(([s2, e2]) => e2 - s2 > 0.05));
    return r;
  };
  const Y = api.padY;
  // a mark on the face, centred at (u, y over the floor), `proud` out of it, turned lean + tilt
  const mark = (u, y, w, h, col, proud, lean = 0, tilt = 0) => faceQuad(S, along, face, out, proud, u, Y + y, w, h, lean + tilt, col);
  const groove = shade(0.55, 0.55, 0.58), bed = shade(0.66, 0.64, 0.66);
  // drill traces: most blocks, every 0.85-1.55 m, broken into lengths with gaps, leaning a
  // degree or two, a few stopping well short of the tread
  if (rng.next() < 0.8) {
    for (let u = visLo + 0.4 + rng.next() * 0.6; u < visHi - 0.35; u += 0.85 + rng.next() * 0.7) {
      const lean = (rng.next() - 0.5) * 0.07, w = 0.026 + rng.next() * 0.014, ymid = (lo + hi) * 0.5;
      const yEnd = hi - rng.next() * rng.next() * (hi - lo) * 0.6;
      if (!free(u - 0.3, u + 0.3)) continue;
      for (let y = lo + rng.next() * 0.35; y < yEnd - 0.2;) {
        const seg = Math.min(yEnd - y, 0.45 + rng.next() * 1.7), yc = y + seg * 0.5;
        mark(u - lean * (yc - ymid), yc, w, seg, groove, PROUD.trace, lean);
        y += seg + 0.07 + rng.next() * 0.22;
      }
    }
  }
  // plug-and-feather: a row of short holes along the split top edge, over a few metres
  if (rng.next() < 0.36 && visHi - visLo > 2.4) {
    const run = 1.4 + rng.next() * 1.8, u0 = visLo + 0.3 + rng.next() * Math.max(0, visHi - visLo - run - 0.6);
    for (let u = u0; u < u0 + run; u += 0.16 + rng.next() * 0.05) {
      const h = 0.1 + rng.next() * 0.07, dy = rng.next() * 0.04, lean = (rng.next() - 0.5) * 0.06;
      if (free(u - 0.05, u + 0.05)) mark(u, hi - 0.02 - h * 0.5 - dy, 0.03, h, groove, PROUD.plug, lean);
    }
  }
  // the bedding plane, in two or three lengths that step where the block was lifted
  {
    const by = lo + 0.5 + rng.next() * Math.max(0.1, hi - lo - 1.0), n = 2 + (rng.next() < 0.5 ? 1 : 0);
    const cut = [visLo];
    for (let i = 1; i < n; i++) cut.push(visLo + (visHi - visLo) * (i / n + (rng.next() - 0.5) * 0.18));
    cut.push(visHi);
    for (let i = 0; i < n; i++) {
      const a = cut[i] + (i ? 0.08 + rng.next() * 0.3 : 0), b = cut[i + 1];
      const dy = (rng.next() - 0.5) * 0.1, th = 0.022 + rng.next() * 0.012, tilt = (rng.next() - 0.5) * 0.012;
      if (b - a < 0.3) continue;
      for (const [s, e] of spans(a, b)) mark((s + e) * 0.5, by + dy, e - s, th, bed, PROUD.bed, 0, tilt);
    }
  }
  // the strata: faint bands of lighter and darker stone across the riser, all at the block's
  // one dip, which is what reads as rock that was laid down and not a board that was painted
  {
    // bands laid bottom to top with gaps between, so no two ever overlap on the one plane
    const dip = (rng.next() - 0.5) * 0.012, mid = (visLo + visHi) * 0.5;
    for (let y0 = lo + 0.1 + rng.next() * 0.5; ;) {
      const h = 0.05 + rng.next() * 0.26, t = rng.next() < 0.5 ? 0.86 : 1.1, gap = 0.2 + rng.next() * 0.8;
      if (y0 + h > hi - 0.1) break;
      for (const [s0, e0] of spans(visLo, visHi)) mark((s0 + e0) * 0.5, y0 + h * 0.5 + dip * ((s0 + e0) * 0.5 - mid), e0 - s0, h, shade(t, t, t), PROUD.strata, 0, dip);
      y0 += h + gap;
    }
  }
  // the wet foot of the riser, its top edge uneven
  for (let u = visLo; u < visHi - 0.05;) {
    const len = Math.min(visHi - u, 1.2 + rng.next() * 2.2), h = 0.22 + rng.next() * 0.3;
    for (const [s, e] of spans(u, u + len)) mark((s + e) * 0.5, prev + h * 0.5, e - s, h, shade(0.58, 0.6, 0.68), PROUD.foot);
    u += len;
  }
  // water stains hanging from the tread lip (under the overburden on the coping's face)
  const lip = band === 4 ? hi - 1.5 : hi + 0.06;
  for (let i = 0, n = 2 + Math.floor(rng.next() * 3); i < n; i++) {
    const u = visLo + 0.3 + rng.next() * Math.max(0.1, visHi - visLo - 0.6), len = 0.7 + rng.next() * (lip - lo) * 0.75;
    const wTop = 0.07 + rng.next() * 0.16, wBot = 0.015 + rng.next() * 0.03;
    if (!free(u - wTop * 0.5 - 0.1, u + wTop * 0.5 + 0.1)) continue;
    const yb = Y + Math.max(prev + 0.25, lip - len), col = shade(0.74, 0.8, 0.9);
    faceTrap(S, along, face, out, u, Y + lip, yb, wTop, wBot, col, PROUD.stain);
    // most run as two, the second thinner and shorter beside the first
    if (rng.next() < 0.6) faceTrap(S, along, face, out, u + wTop * 0.9, Y + lip, (Y + lip + yb) * 0.5, wTop * 0.5, 0.01, col, PROUD.stain + 0.001);
  }
  // THE OVERBURDEN. The coping's face is the top of the cut, where the rock was never clean: a
  // course of broken dark soil and stone 1.1-1.8 m deep under the paving, so the rim reads as
  // ground somebody cut into and not as the lip of a pool.
  if (band === 4) {
    const soil = [0.052 * tone, 0.041 * tone, 0.031 * tone];
    for (let u = visLo; u < visHi - 0.05;) {
      const len = Math.min(visHi - u, 0.6 + rng.next() * 1.2), d = 1.1 + rng.next() * 0.7;
      mark(u + len * 0.5, hi + 0.1 - d * 0.5, len, d, rng.next() < 0.5 ? soil : [soil[0] * 0.8, soil[1] * 0.8, soil[2] * 0.82], PROUD.burden);
      u += len;
    }
    for (let i = 0, n = Math.floor((visHi - visLo) * 0.9); i < n; i++) {
      const sz = 0.12 + rng.next() * 0.22, u = visLo + 0.2 + rng.next() * (visHi - visLo - 0.4);
      // a stone in the soil, turned in the face's own plane, standing 5 cm out of it at most
      const y = hi - 0.2 - rng.next() * 1.1, turn = (rng.next() - 0.5) * 0.9;
      if (along) S.box(sz * 1.4, sz, 0.06, u, Y + y, face + out * 0.02, shade(0.8, 0.78, 0.8), 0, 0, turn);
      else S.box(0.06, sz, sz * 1.4, face + out * 0.02, Y + y, u, shade(0.8, 0.78, 0.8), 0, turn, 0);
    }
  }
  // the light of a claimed floodlight on this block, if one is aimed at it
  for (const F of FLOODS) {
    const W = F.wash;
    if (!W || W.side !== side || W.band !== band) continue;
    const a = Math.max(visLo, W.u - W.half), b = Math.min(visHi, W.u + W.half);
    if (b - a < 0.05) continue;
    const y0 = prev + 0.03, y1 = top - SCREE - 0.02, hw = (b - a) * 0.5, hh = (y1 - y0) * 0.5, uc = (a + b) * 0.5, yc = (y0 + y1) * 0.5;
    // the pane's own +x runs along +u on S and E faces and against it on N and W
    const dir = side === 'S' || side === 'E' ? 1 : -1;
    const ry = side === 'S' ? 0 : side === 'N' ? Math.PI : side === 'W' ? Math.PI * 0.5 : -Math.PI * 0.5;
    const f = face + out * PROUD.wash;
    const g = k.glow.pane(b - a, y1 - y0, along ? uc : f, Y + yc, along ? f : uc,
      (pu, pv) => washAt(W, uc + dir * pu * hw, yc + pv * hh), ry, 0, Math.max(2, Math.round((b - a) / 0.5)), 8);
    // the site's glow is ember; lit stone takes it nearer white, a lamp's light and not its glass
    const cc = g.getAttribute('color');
    for (let i = 0; i < cc.count; i++) cc.setXYZ(i, cc.getX(i), cc.getY(i) * 1.3, cc.getZ(i) * 1.7);
  }
}

/** The coping's paving: slabs of the quarry's own stone laid in courses across the band, each
 *  its own tone, a couple of centimetres of joint between them and their tops never quite level
 *  (0-2.5 cm under the collider's top, so nothing stands on air and nothing sinks). */
function copingSlabs(S, api, rng, x0, x1, z0, z1, top, tone, along) {
  const u0 = along ? x0 : z0, u1 = along ? x1 : z1, e0 = along ? z0 : x0, e1 = along ? z1 : x1;
  const courses = [e0];
  for (let e = e0 + 1.5 + rng.next() * 0.9; e < e1 - 1.2; e += 1.5 + rng.next() * 0.9) courses.push(e);
  courses.push(e1);
  const J = 0.022, T = 0.06;
  for (let c = 0; c + 1 < courses.length; c++) {
    const ea = courses[c] + (c ? J * 0.5 : 0), eb = courses[c + 1] - (c + 2 < courses.length ? J * 0.5 : 0);
    for (let u = u0; u < u1 - 0.05;) {
      let len = 0.9 + rng.next() * 1.4;
      if (u1 - u - len < 0.6) len = u1 - u;
      const ua = u + (u > u0 ? J * 0.5 : 0), ub = u + len - (u + len < u1 - 0.01 ? J * 0.5 : 0);
      const t = tone * (rng.next() < 0.14 ? 0.72 : 0.86 + rng.next() * 0.18), warm = 1 + (rng.next() - 0.5) * 0.08;
      const col = [QP.rock[0] * t * warm * 0.92, QP.rock[1] * t * 0.96, QP.rock[2] * t / warm];
      const yTop = top - rng.next() * 0.025;
      if (along) qbox(S, api, ua, ub, ea, eb, yTop - T, yTop, col);
      else qbox(S, api, ea, eb, ua, ub, yTop - T, yTop, col);
      u += len;
    }
  }
}

/** The three benches and the coping, round all four walls. */
function quarryBenches(k, api) {
  const rng = api.rng;
  for (let band = 1; band <= 4; band++) {
    const top = bandTop(band), prev = band === 1 ? 0 : bandTop(band - 1), ea = bandInner(band);
    const bottom = quarryBenchGround(ea) - 1.2;
    for (const side of ['S', 'N', 'W', 'E']) {
      const eb = bandOuter(band, side);
      // the north strips stop at the incline's cheek walls
      const sx = CHEEK.x1;
      const runs = side === 'S' ? [[Q.fx0 - eb, Q.fx1 + eb]]
        : side === 'N' ? [[Q.fx0 - eb, -sx], [sx, Q.fx1 + eb]]
          : [[Q.fz0 - ea, Q.fz1 + ea]];
      for (const [u0, u1] of runs) {
        let u = u0;
        while (u1 - u > 0.01) {
          let len = 8 + rng.next() * 3;
          if (u1 - u - len < 4) len = u1 - u;
          const push = rng.next() * 0.18;
          const ladder = LADDERS.some(L => L.side === side && L.band === band && L.u >= u && L.u <= u + len);
          benchBlock(k, api, rng, side, band, u, u + len, ea - (ladder ? 0 : push), eb, bottom, top, prev, ea);
          u += len;
        }
      }
    }
  }
}

/** A post-and-rail run on the coping, a collider for every post and every 12 m of rail.
 *  Timber posts at 2.4-3.6 m, a few of them leaning ALONG the run (never across it, so the
 *  rails stay over their collider), rusted pipe rails through them. `broken` is the span whose
 *  top rail has come off its far post and lies from the near one down to the paving; its
 *  bottom rail still stands, so the collider over it is still a fence you can see. */
const FENCE_POST = [0.066, 0.05, 0.036];
function railRun(S, api, ax, az, bx, bz, y, broken = -1) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), rng = api.rng;
  if (L < 0.3) return;
  const ux = dx / L, uz = dz / L, ry = Math.atan2(-dz, dx);
  const ts = [0];
  for (let t = 2.4 + rng.next() * 1.2; t < L - 1.2; t += 2.4 + rng.next() * 1.2) ts.push(t);
  ts.push(L);
  const posts = ts.map((t, i) => {
    const leans = i > 0 && i < ts.length - 1 && rng.next() < 0.25;
    return { x: ax + ux * t, z: az + uz * t, lean: leans ? (rng.next() - 0.5) * 0.16 : (rng.next() - 0.5) * 0.03 };
  });
  const up = (p, h) => [p.x + ux * Math.sin(p.lean) * h, y + Math.cos(p.lean) * h, p.z + uz * Math.sin(p.lean) * h];
  for (const p of posts) {
    member(S, [p.x, y - 0.03, p.z], up(p, 1.17), 0.062, FENCE_POST, 6);
    api.emit({ kind: 'circle', x: p.x, z: p.z, r: 0.1, y0: y - 0.1, y1: y + 1.14, tag: 'wood' });
  }
  for (let i = 0; i + 1 < posts.length; i++) {
    const a = posts[i], b = posts[i + 1];
    member(S, up(a, 0.55), up(b, 0.55), 0.03, P.rust, 6);
    if (i === broken) member(S, up(a, 1.04), [b.x - ux * 0.35, y + 0.015, b.z - uz * 0.35], 0.03, P.rust, 6);
    else member(S, up(a, 1.04), up(b, 1.04), 0.03, P.rust, 6);
  }
  const m = Math.max(1, Math.ceil(L / 12));
  for (let i = 0; i < m; i++) {
    const t = (i + 0.5) / m;
    api.emit({ kind: 'obb', x: ax + dx * t, z: az + dz * t, halfX: L / m * 0.5, halfZ: 0.07, yaw: ry,
      y0: y + 0.02, y1: y + 1.1, tag: 'metal', climbable: false });
  }
}

/** Dry grass: a tuft of five to seven blades out of a joint or the edge of the paving, every
 *  blade steeper than the 54 degrees the county's snow settles on. */
function tuft(S, rng, x, y, z) {
  const n = 5 + (rng.next() < 0.5 ? 2 : 0), col = [0.1 + rng.next() * 0.03, 0.082 + rng.next() * 0.02, 0.045];
  for (let i = 0; i < n; i++) {
    const h = 0.22 + rng.next() * 0.3, a = rng.next() * Math.PI * 2, lean = 0.15 + rng.next() * 0.35;
    S.cone(0.018 + rng.next() * 0.012, h, 4, x + Math.cos(a) * 0.05, y + h * 0.5 * Math.cos(lean), z + Math.sin(a) * 0.05, col, Math.PI - a, 0, lean);   // splayed outward
  }
}

/** The fence along the crest (see COPE_TOP). It meets the incline's cheek walls on the north
 *  side and keeps the car out too: the only way in is on foot, through the incline's gate.
 *  Dry grass comes up along it and along the paving's outer edge, where the overburden starts:
 *  the rim is ground that somebody cut into, not the lip of a pool. */
function quarryRail(k, api) {
  const S = k.solid, y = api.padY + COPE_TOP, e = RAIL_E, rng = api.rng;
  const xa = Q.fx0 - e, xb = Q.fx1 + e, za = Q.fz0 - e, zb = Q.fz1 + e, sx = CHEEK.x1 + 0.1;
  // the far (south) run, the one you see across the pit from the incline's head, has the break
  railRun(S, api, xa, za, xb, za, y, 14);
  railRun(S, api, xa, za, xa, zb, y);
  railRun(S, api, xb, za, xb, zb, y);
  railRun(S, api, xa, zb, -sx, zb, y);
  railRun(S, api, sx, zb, xb, zb, y);
  const edge = (side) => (side === 'N' ? 17.6 : Q.coping);
  for (const side of ['S', 'N', 'W', 'E']) {
    const along = side === 'S' || side === 'N', lim = along ? 28 + (side === 'N' ? 17.6 : Q.coping) : 28 + Q.coping - 1;
    for (let u = -lim; u < lim; u += 0.8 + rng.next() * 2.2) {
      if (side === 'N' && Math.abs(u) < 7.5) continue;                     // the incline's head yard
      for (const [eo, gy, p] of [[edge(side) + 0.12 + rng.next() * 0.5, api.padY + Q.depth, 1], [e + (rng.next() - 0.5) * 0.5, y - 0.03, 0.4]]) {
        if (rng.next() > p) continue;
        const uu = u + (rng.next() - 0.5) * 0.6;
        const lx = side === 'W' ? Q.fx0 - eo : side === 'E' ? Q.fx1 + eo : uu;
        const lz = side === 'S' ? Q.fz0 - eo : side === 'N' ? Q.fz1 + eo : uu - 27;
        tuft(S, rng, lx, gy, lz);
      }
    }
  }
}

/** The top of whatever the incline's cheek wall stands beside at t: the floor, a tread, the
 *  kerb course, the coping's paving, the rim. */
function besideTop(t) {
  if (t <= 0) return 0;
  if (t <= Q.lip) return Q.rise * Math.min(3, Math.ceil(t / Q.bench - 1e-9));
  return t <= 17.6 ? COPE_TOP : Q.depth;
}

/** THE INCLINE (world-scars.js QUARRY_PIT.incline has why it is ground and not a stair): the
 *  paved way down the north face. Stone setts across it, the haulage rails up its middle with
 *  their rollers and the slack rope, cheek walls either side that stand 0.8 m over it all the
 *  way (so nothing on it can step off onto a bench, and nothing on a bench is ever within a
 *  step of it), paving at its toe and head over the ground its edges leave, and at the head
 *  two gateposts and a bollard: a way in on foot, not for the car. */
function quarryIncline(k, api) {
  const S = k.solid, y = api.padY, zt = (t) => Q.fz1 + t, rng = api.rng;
  const slopeAt = (t) => (quarryInclineHeight(t + 0.05) - quarryInclineHeight(t - 0.05)) / 0.1;
  // the setts, and the rails and rollers on them
  for (let t = INC.t0 + 0.35; t < INC_END - 0.2; t += 0.45) {
    const h = quarryInclineHeight(t), a = -Math.atan(slopeAt(t));
    S.box(INC.half * 2 - 0.12, 0.05, 0.17, (rng.next() - 0.5) * 0.04, y + h + 0.02, zt(t), rng.next() < 0.5 ? P.stone : QP.scree, (rng.next() - 0.5) * 0.02, a);
  }
  for (let t = INC.t0 + 1.0; t < INC_END - 0.5; t += 1.0) {
    const t1 = Math.min(t + 1.0, INC_END - 0.5), h0 = quarryInclineHeight(t), h1 = quarryInclineHeight(t1);
    for (const dx of [-0.42, 0.42]) member(S, [dx, y + h0 + 0.075, zt(t)], [dx, y + h1 + 0.075, zt(t1)], 0.035, P.iron, 5);
    if (Math.round(t) % 3 === 0) S.cyl(0.06, 0.06, 0.7, 8, 0, y + h0 + 0.09, zt(t), P.rust, 0, 0, Math.PI * 0.5);
    member(S, [0.05 * Math.sin(t), y + h0 + 0.1, zt(t)], [0.05 * Math.sin(t1), y + h1 + 0.1, zt(t1)], 0.018, P.dark, 4);
  }
  // the cheek walls, stepped a metre at a time
  for (const sgn of [-1, 1]) {
    for (let t = INC.t0; t < INC_END + 0.4; t += 1.0) {
      const t1 = Math.min(t + 1.0, INC_END + 0.4);
      const top = Math.max(besideTop(t), besideTop((t + t1) * 0.5), besideTop(t1), quarryInclineHeight(t1) + 0.8);
      const bottom = Math.min(quarryInclineHeight(t), quarryBenchGround(Math.max(0, t))) - 0.6;
      const x0 = sgn < 0 ? -CHEEK.x1 : CHEEK.x0, x1 = sgn < 0 ? -CHEEK.x0 : CHEEK.x1;
      qbox(S, api, x0, x1, zt(t), zt(t1), bottom, top - 0.08, QP.rock);
      qbox(S, api, x0 - 0.04, x1 + 0.04, zt(t), zt(t1), top - 0.08, top, P.stone);
      api.emit({ kind: 'obb', x: (x0 + x1) * 0.5, z: zt((t + t1) * 0.5), halfX: (x1 - x0) * 0.5, halfZ: (t1 - t) * 0.5,
        yaw: 0, y0: y + bottom, y1: y + top, tag: 'stone', standable: true });
    }
    // paving beside the toe and the head, over the ground the incline's edge disturbs
    const px = sgn * (CHEEK.x1 + 1.05);
    slab(k, api, px, zt((INC.t0 + 0) * 0.5), 2.1, -INC.t0, 0.06, P.stone, 0.4);
    slab(k, api, px, zt((17.6 + INC_END + 0.4) * 0.5), 2.1, INC_END + 0.4 - 17.6, COPE_TOP, P.stone, 0.4);
  }
  // the head yard, on the rim beyond where the incline meets it
  const hz0 = INC_END + 0.05, hz1 = INC_END + 2.6;
  slab(k, api, 0, zt((hz0 + hz1) * 0.5), 13.8, hz1 - hz0, COPE_TOP, P.stone, 0.4);
  const gz = zt(INC_END + 0.9);
  for (const gx of [-2.05, 2.05]) {
    qbox(S, api, gx - 0.25, gx + 0.25, gz - 0.25, gz + 0.25, COPE_TOP, COPE_TOP + 2.5, QP.rock);
    qbox(S, api, gx - 0.31, gx + 0.31, gz - 0.31, gz + 0.31, COPE_TOP + 2.5, COPE_TOP + 2.62, P.stone);
    api.emit({ kind: 'obb', x: gx, z: gz, halfX: 0.25, halfZ: 0.25, yaw: 0, y0: y + COPE_TOP - 0.2, y1: y + COPE_TOP + 2.62, tag: 'stone' });
  }
  S.cyl(0.14, 0.17, 0.95, 10, 0, y + COPE_TOP + 0.475, gz, P.iron);
  api.emit({ kind: 'circle', x: 0, z: gz, r: 0.17, y0: y + COPE_TOP - 0.2, y1: y + COPE_TOP + 0.95, tag: 'metal' });
  // the chain that used to close it, dropped in a heap at the west post's foot
  for (let i = 0; i < 9; i++) {
    S.box(0.11, 0.025, 0.05, -2.45 + Math.sin(i * 2.3) * 0.16, y + COPE_TOP + 0.013 + (i % 3) * 0.024,
      gz + 0.55 + Math.cos(i * 1.7) * 0.14, P.iron, i * 0.7);
  }
  // the way down's light, on the east post
  lamp(k, 2.05, y + COPE_TOP + 2.71, gz);
  lampGlow(k.glow, 2.05, y + COPE_TOP + 2.85, gz, 0.7);
}

/** A square lattice from a to b (site-frame points, absolute y), tapering half0 -> half1. */
function lattice(S, a, b, half0, half1, chordR, col, step) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]);
  const n = [d[0] / L, d[1] / L, d[2] / L];
  let u = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [n[2], 0, -n[0]];
  const ul = Math.hypot(u[0], u[1], u[2]); u = [u[0] / ul, u[1] / ul, u[2] / ul];
  const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  const corner = (t, i) => {
    const h = half0 + (half1 - half0) * t, su = i & 1 ? 1 : -1, sv = i & 2 ? 1 : -1;
    return [a[0] + d[0] * t + (u[0] * su + v[0] * sv) * h, a[1] + d[1] * t + (u[1] * su + v[1] * sv) * h,
      a[2] + d[2] * t + (u[2] * su + v[2] * sv) * h];
  };
  const order = [0, 1, 3, 2];
  for (let i = 0; i < 4; i++) member(S, corner(0, i), corner(1, i), chordR, col);
  const m = Math.max(1, Math.round(L / step));
  for (let s = 0; s <= m; s++) {
    const t = s / m;
    for (let f = 0; f < 4; f++) {
      const p = order[f], q = order[(f + 1) % 4];
      member(S, corner(t, p), corner(t, q), chordR * 0.6, col, 5);
      if (s < m) member(S, corner(t, (s + f) & 1 ? p : q), corner((s + 1) / m, (s + f) & 1 ? q : p), chordR * 0.5, col, 5);
    }
  }
}

/** THE DERRICK and BLOCK 1. Vera's ledger: "There's a block still hanging from the middle
 *  crane. It's the last one they cut. It's the size of a house and there's nothing carved on
 *  it." The site's card: BLOCK 1 · RED · 9m x 4m x 3m. It hangs over the frozen sump. */
function quarryDerrick(k, api) {
  const S = k.solid, y = api.padY, D = DERRICK;
  // the base is knee-high, not ankle-high: nothing may stand on it sunk to the shin
  qbox(S, api, D.x - 1.25, D.x + 1.25, D.z - 1.25, D.z + 1.25, -0.4, 0.7, P.stone);
  api.emit({ kind: 'obb', x: D.x, z: D.z, halfX: 1.25, halfZ: 1.25, yaw: 0, y0: y - 0.4, y1: y + 0.7, tag: 'stone', standable: true });
  lattice(S, [D.x, y + 0.7, D.z], [D.x, y + D.h, D.z], 0.8, 0.8, 0.12, P.iron, 2.5);
  qbox(S, api, D.x - 1.0, D.x + 1.0, D.z - 1.0, D.z + 1.0, D.h, D.h + 0.5, P.rust);
  api.emit({ kind: 'obb', x: D.x, z: D.z, halfX: 0.9, halfZ: 0.9, yaw: 0, y0: y + 0.7, y1: y + D.h + 0.5, tag: 'metal', climbable: false });
  // the boom, pivoted at the mast's foot, over the pit to its tip above the sump
  const foot = [D.x - 0.95, y + 1.5, D.z], tip = [D.tipX, y + D.tipY, D.z];
  lattice(S, foot, tip, 0.48, 0.24, 0.09, P.rust, 2.2);
  S.cyl(0.32, 0.32, 0.5, 12, D.tipX, y + D.tipY, D.z, P.iron, 0, Math.PI * 0.5);          // the tip sheave
  // the boom's low end is at head height beside the mast: it is solid there
  api.emit({ kind: 'obb', x: D.x - 2.9, z: D.z, halfX: 2.0, halfZ: 0.55, yaw: 0, y0: y + 0.9, y1: y + 4.4, tag: 'metal', climbable: false });
  // luffing cables from the mast head to the boom tip
  for (const dz of [-0.35, 0.35]) member(S, [D.x, y + D.h + 0.3, D.z + dz], [D.tipX + 0.2, y + D.tipY + 0.25, D.z + dz], 0.03, P.dark, 4);
  // THE HOIST, reeved: four falls off the tip sheave down to a hook block with its own sheave
  // between two cheek plates, the hook under it, and the master ring hanging in the hook. One
  // 3.5 cm line was what this used to be, and it looked like a thread holding up a house.
  const hb = y + D.hookY;
  for (const fx of [-1, 1]) for (const fz of [-0.09, 0.09]) {
    member(S, [D.tipX + fx * 0.3, y + D.tipY - 0.05, D.z + fz], [D.tipX + fx * 0.24, hb + 0.3, D.z + fz], 0.022, P.dark, 4);
  }
  for (const cz of [-0.17, 0.17]) S.box(0.66, 0.92, 0.05, D.tipX, hb + 0.2, D.z + cz, P.rust);
  S.cyl(0.24, 0.24, 0.28, 14, D.tipX, hb + 0.3, D.z, P.iron, 0, Math.PI * 0.5);
  S.box(0.52, 0.16, 0.4, D.tipX, hb - 0.3, D.z, P.iron);
  S.cyl(0.06, 0.06, 0.2, 8, D.tipX, hb - 0.46, D.z, QP.steel);
  S.at(new THREE.TorusGeometry(0.16, 0.05, 6, 12, Math.PI * 1.5), QP.steel, D.tipX, hb - 0.72, D.z, 0, 0, Math.PI * 0.5);
  const ringY = hb - 0.975;                  // its inner top edge on the hook's tube
  S.at(new THREE.TorusGeometry(0.2, 0.055, 6, 14), QP.steel, D.tipX, ringY, D.z, Math.PI * 0.5);
  // BLOCK 1: 9 x 3 x 4, turned 0.3, its underside 8.2 m over the floor. Freshly cut, lighter
  // than the faces it came out of.
  const by = 8.2, bh = 3, ry = 0.3, c = Math.cos(ry), s = Math.sin(ry), bx = D.tipX, bz = D.z;
  const L = (lx, ly, lz) => [bx + lx * c + lz * s, y + by + ly, bz - lx * s + lz * c];
  S.box(9, bh, 4, bx, y + by + bh * 0.5, bz, QP.fresh, ry);
  api.emit({ kind: 'obb', x: bx, z: bz, halfX: 4.5, halfZ: 2.0, yaw: ry, y0: y + by, y1: y + by + bh, tag: 'stone' });
  // the lifting eyes, and four chains up to the ring: heavy, light steel, so the sling reads
  for (const [lx, lz] of [[-3.3, -1.4], [3.3, -1.4], [-3.3, 1.4], [3.3, 1.4]]) {
    const e = L(lx, bh, lz);
    S.box(0.24, 0.22, 0.1, e[0], e[1] + 0.1, e[2], P.iron, ry);
    member(S, [e[0], e[1] + 0.18, e[2]], [D.tipX, ringY - 0.19, D.z], 0.07, QP.steel, 6);
  }
  // it is stone, not a crate: its east end is the rough face it was split along, in three
  // shelled slabs; a row of half drill holes runs along one top edge; and the bedding plane
  // crosses its long faces low, in two lengths that do not quite meet
  for (const [ly, h, proud, lz, w, tone] of [[2.35, 1.3, 0.05, -0.3, 3.3, 0.9], [0.55, 1.1, 0.025, 0.2, 3.5, 0.82], [1.45, 0.7, 0.085, -0.9, 1.7, 0.96]]) {
    const p = L(4.5 + proud * 0.5, ly, lz);
    S.box(proud + 0.02, h, w, p[0], p[1], p[2], [QP.fresh[0] * tone, QP.fresh[1] * tone, QP.fresh[2] * tone], ry, (lz > 0 ? 1 : -1) * 0.03);
  }
  for (let i = 0; i < 18; i++) {
    const p = L(-4.1 + i * 0.48, bh - 0.12, 2.01);
    S.box(0.036, 0.22, 0.03, p[0], p[1], p[2], [QP.fresh[0] * 0.62, QP.fresh[1] * 0.62, QP.fresh[2] * 0.64], ry);
  }
  for (const side of [-1, 1]) for (const [a, b, dy] of [[-4.5, 0.6, 0], [0.9, 4.5, -0.06]]) {
    const p = L((a + b) * 0.5, bh * 0.34 + dy, side * 2.014);
    S.box(b - a, 0.035, 0.03, p[0], p[1], p[2], QP.bed, ry);
  }
  // two stiff legs from the mast head down to sills on the east coping
  for (const az of [-26, -54]) {
    const ax = 44, sy = COPE_TOP + 0.8;
    qbox(S, api, ax - 0.8, ax + 0.8, az - 0.8, az + 0.8, COPE_TOP, sy, P.stone);
    api.emit({ kind: 'obb', x: ax, z: az, halfX: 0.8, halfZ: 0.8, yaw: 0, y0: y + COPE_TOP - 0.3, y1: y + sy, tag: 'stone', standable: true });
    member(S, [D.x, y + D.h - 0.2, D.z], [ax, y + sy, az], 0.22, P.wood, 8);
    const hx = D.x - ax, hz = D.z - az, hl = Math.hypot(hx, hz), yawL = Math.atan2(-hz / hl, hx / hl);
    api.emit({ kind: 'obb', x: ax + hx / hl * 1.6, z: az + hz / hl * 1.6, halfX: 0.9, halfZ: 0.24, yaw: yawL,
      y0: y + sy, y1: y + sy + 1.5, tag: 'wood', climbable: false });
  }
  lamp(k, D.x, y + D.h + 0.6, D.z);
  lampGlow(k.glow, D.x, y + D.h + 0.74, D.z, 1.3);                // the masthead light, from the road
}

/** The conveyor that carried spoil up the east wall to a hopper on the rim. */
function quarryConveyor(k, api) {
  const S = k.solid, y = api.padY, C = CONVEYOR, ang = Math.atan(C.slope);
  const L = (C.x1 - C.x0) / Math.cos(ang), mx = (C.x0 + C.x1) * 0.5;
  S.box(L, 0.07, 0.8, mx, y + beltY(mx), C.z, P.dark, 0, 0, ang);
  for (const dz of [-0.48, 0.48]) {
    member(S, [C.x0, y + beltY(C.x0) - 0.22, C.z + dz], [C.x1, y + beltY(C.x1) - 0.22, C.z + dz], 0.07, P.rust, 6);
    member(S, [C.x0, y + beltY(C.x0) + 0.32, C.z + dz], [C.x1, y + beltY(C.x1) + 0.32, C.z + dz], 0.035, P.iron, 5);
  }
  for (let x = C.x0 + 1; x < C.x1; x += 2.2) S.box(0.07, 0.07, 1.02, x, y + beltY(x) - 0.2, C.z, P.iron);
  // legs where there is stone to stand them on: the floor, bench 2, the coping
  for (const [lx, base] of [[26, 0], [34, bandTop(2)], [42, COPE_TOP]]) {
    const topY = beltY(lx) - 0.25;
    for (const dz of [-0.48, 0.48]) {
      S.box(0.16, topY - base, 0.16, lx, y + (base + topY) * 0.5, C.z + dz, P.rust);
      api.emit({ kind: 'circle', x: lx, z: C.z + dz, r: 0.1, y0: y + base - 0.2, y1: y + topY, tag: 'metal' });
    }
    member(S, [lx, y + base + 0.3, C.z - 0.48], [lx, y + topY - 0.2, C.z + 0.48], 0.04, P.iron, 4);
    S.box(0.1, 0.1, 1.1, lx, y + topY - 0.05, C.z, P.rust);
  }
  // the feed hopper at the foot, and one collider for it and the belt while it is low
  qbox(S, api, C.x0 - 1.7, C.x0 + 0.1, C.z - 0.8, C.z + 0.8, 1.4, 2.6, P.rust);
  for (const [hx, hz] of [[-1.6, -0.7], [0, -0.7], [-1.6, 0.7], [0, 0.7]]) S.box(0.12, 1.4, 0.12, C.x0 + hx, y + 0.7, C.z + hz, P.iron);
  api.emit({ kind: 'obb', x: C.x0 + 1.75, z: C.z, halfX: 3.55, halfZ: 0.85, yaw: 0, y0: y - 0.2, y1: y + beltY(26.2), tag: 'metal', climbable: false });
  // the tower on the rim the belt climbs into
  const tx = 48.6, g = COPE_TOP - 0.06, hy0 = 21.8, hy1 = 24.8;
  for (const [px, pz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
    S.box(0.24, hy0 - g, 0.24, tx + px, y + (g + hy0) * 0.5, C.z + pz, P.wood);
    api.emit({ kind: 'circle', x: tx + px, z: C.z + pz, r: 0.16, y0: y + g - 0.3, y1: y + hy0, tag: 'wood' });
  }
  for (const pz of [-1.5, 1.5]) {
    member(S, [tx - 1.5, y + g + 0.4, C.z + pz], [tx + 1.5, y + hy0 - 0.4, C.z + pz], 0.07, P.wood, 5);
    member(S, [tx + 1.5, y + g + 0.4, C.z + pz], [tx - 1.5, y + hy0 - 0.4, C.z + pz], 0.07, P.wood, 5);
  }
  qbox(S, api, tx - 1.8, tx + 1.8, C.z - 1.8, C.z + 1.8, hy0, hy1, P.rust);
  qbox(S, api, tx - 1.95, tx + 1.95, C.z - 1.95, C.z + 1.95, hy1, hy1 + 0.12, P.iron);
  api.emit({ kind: 'obb', x: tx, z: C.z, halfX: 1.8, halfZ: 1.8, yaw: 0, y0: y + hy0, y1: y + hy1 + 0.12, tag: 'metal' });
}

/** A skip wagon: four wheels, a chassis and its bin, standing on rails (g 0.13) or in the
 *  dirt beside them (g 0) with `lean` tipping it; `onSide` is one knocked over, its wheels
 *  come off and its load run out across the floor. */
function skip(S, api, x, z, ry, g, lean, onSide) {
  const y = api.padY, c = Math.cos(ry), s = Math.sin(ry);
  const P2 = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  if (onSide) {
    S.box(0.8, 1.0, 1.45, x, y + 0.5, z, P.rust, ry);
    for (const [lx, lz] of [[1.0, -0.3], [1.3, 0.55]]) { const [wx, wz] = P2(lx, lz); S.cyl(0.2, 0.2, 0.08, 10, wx, y + 0.04, wz, P.iron, ry); }
    for (let i = 0; i < 14; i++) {
      const [px, pz] = P2(-0.6 - (i % 5) * 0.28 - Math.sin(i * 1.9) * 0.1, -0.6 + (i * 0.37) % 1.3), sz = 0.09 + (i % 4) * 0.035;
      S.box(sz, sz * 0.8, sz * 1.2, px, y + sz * 0.4, pz, QP.cut, i * 0.9);
    }
    api.emit({ kind: 'obb', x, z, halfX: 0.42, halfZ: 0.75, yaw: ry, y0: y - 0.1, y1: y + 1.0, tag: 'metal', standable: true });
    return;
  }
  for (const [lx, lz] of [[-0.42, -0.5], [0.42, -0.5], [-0.42, 0.5], [0.42, 0.5]]) {
    const [wx, wz] = P2(lx, lz);
    S.cyl(0.2, 0.2, 0.08, 10, wx, y + g + 0.2, wz, P.iron, ry, 0, Math.PI * 0.5);
  }
  S.box(0.8, 0.14, 1.45, x, y + g + 0.42, z, P.iron, ry, 0, lean);
  S.box(0.9, 0.62, 1.35, x, y + g + 0.84, z, P.rust, ry, 0, lean);
  S.box(0.8, 0.04, 1.25, x, y + g + 1.13, z, QP.cut, ry, 0, lean);     // a load of red chippings
  api.emit({ kind: 'obb', x, z, halfX: 0.48, halfZ: 0.75, yaw: ry, y0: y - 0.1, y1: y + g + 1.16, tag: 'metal', standable: true });
}

/** THE HAND IN THE ICE. A quarryman went through the sump and it froze over him. All that is
 *  out is his arm, to the middle of the forearm, the hand clawed at the sky, the sheet broken
 *  up round it where he punched through, and a shoulder's width away the crown of his head,
 *  face down. Nothing moves. The torch finds him.
 *  y is relative to the ice level; the sheet is drawn at +0.03 and the opaque water under it at
 *  -0.22 (wilds.js). MEASURED (r3 station probe): the sheet does not veil what lies between
 *  those two, it draws UNDER it, so nothing of him is between them. Two earlier cuts are why
 *  it is only the arm: a face and a flat hand breaking the surface read as a grey ball and a
 *  white glove, and his shape laid flat on the sheet in dark layers read as a sticker of a
 *  gingerbread man (r3 station polish shots, sump-man-*). */
function frozenMan(people, S, api) {
  const level = api.padY - Q.sump.ice, hx = -10.4, hz = -37.6, ry = Math.PI * 0.25, ICE = level + 0.03;
  const c = Math.cos(ry), s = Math.sin(ry);
  const at = (lx, ly, lz) => [hx + lx * c + lz * s, level + ly, hz - lx * s + lz * c];
  // HE IS DARK. The ice barely answers the torch, so at arm's length anything on it with an
  // albedo much over 0.01 comes up white-grey in the beam: a frost ring at 0.07 read as a paper
  // ring and skin at 0.02 as a mannequin's arm (measured, r3 station polish, with the weather's
  // snow at zero). The broken plates may stay pale, because broken ice is. Nothing of his lies
  // flat either: the place materials put the county's snow on any face turned up more than 54
  // degrees (places.js _installPlaceSnow) and the ice takes none, so the plates stand on edge
  // and his hair comes up in points. That second reason is read off the shader, not seen.
  const B = at(-0.2, 0, 0.53), SHARD = [0.011, 0.015, 0.027];
  // the break: plates of the sheet pushed up on edge round where he came through
  for (let i = 0; i < 10; i++) {
    const a = i * 0.63 + 0.3 + Math.sin(i * 2.1) * 0.2, r = 0.1 + (i % 3) * 0.022;
    S.box(0.05 + (i % 2) * 0.025, 0.007, 0.035, B[0] + Math.cos(a) * r, ICE + 0.03, B[2] + Math.sin(a) * r,
      SHARD, -a, 0, -(1.0 + (i % 3) * 0.1));
  }
  // THE CROWN OF HIS HEAD, a shoulder's width from the hand: face down under the sheet, only
  // the top of his head through it, the hair frozen into points. Dark: nothing of him is pale.
  {
    const hp = at(0.2, 0, 0.16), HAIR = [0.0035, 0.003, 0.0028];
    // a whorl of frozen hair in clumps, leaning out from the crown, the middle ones tallest
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4 + 0.2, r = 0.012 + (i % 4) * 0.022, lean = 0.2 + (i % 4) * 0.08, h = 0.075 - (i % 4) * 0.011;
      people.cone(0.017, h, 4, hp[0] + Math.cos(a) * r, ICE + h * 0.5 * Math.cos(lean), hp[2] + Math.sin(a) * r, HAIR, Math.PI - a, 0, lean);
    }
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + 0.5, r = 0.12 + (i % 2) * 0.02;
      S.box(0.045, 0.007, 0.03, hp[0] + Math.cos(a) * r, ICE + 0.026, hp[2] + Math.sin(a) * r, SHARD, -a, 0, -(1.0 + (i % 2) * 0.12));
    }
  }
  // the forearm, up out of the hole at 55 degrees, a torn coat sleeve at the ice
  const SKIN = [0.0085, 0.008, 0.0092], TIP = [0.0025, 0.0022, 0.0026], SLEEVE = [0.006, 0.0055, 0.005];
  const hdx = -c, hdz = s;                                   // his reach: local -x, in the world
  const el = 0.96, dir = [hdx * Math.cos(el), Math.sin(el), hdz * Math.cos(el)];
  const go = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];
  const b0 = [B[0], ICE, B[2]], W = go(b0, dir, 0.26), M = go(b0, dir, 0.13);
  member(people, b0, go(b0, dir, 0.06), 0.052, SLEEVE, 8);
  member(people, b0, M, 0.043, SKIN, 7);
  member(people, M, W, 0.035, SKIN, 7);                     // it narrows to the wrist
  // the hand, bent back at the wrist toward the sky, the fingers hooked into a claw
  const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const palm = nrm([dir[0] * 0.55, 1, dir[2] * 0.55]);
  const side = nrm([-palm[2], 0, palm[0]]);                                   // across the palm
  const front = nrm([side[1] * palm[2] - side[2] * palm[1], side[2] * palm[0] - side[0] * palm[2], side[0] * palm[1] - side[1] * palm[0]]);
  const K = go(W, palm, 0.1);
  member(people, W, K, 0.035, SKIN, 7);
  for (let f = 0; f < 4; f++) {
    const off = (f - 1.5) * 0.025, len = f === 1 || f === 2 ? 0.058 : 0.048;
    let p = go(K, side, off);
    for (const [phi, l, r, col] of [[0.15, len, 0.0115, SKIN], [1.05, len * 0.72, 0.0102, SKIN], [1.95, len * 0.55, 0.0088, TIP]]) {
      const d = nrm([palm[0] * Math.cos(phi) + front[0] * Math.sin(phi), palm[1] * Math.cos(phi) + front[1] * Math.sin(phi), palm[2] * Math.cos(phi) + front[2] * Math.sin(phi)]);
      const q = go(p, d, l); member(people, p, q, r, col, 5); p = q;
    }
  }
  {
    let p = go(go(W, palm, 0.035), side, -0.04);
    for (const [ang, l, r, col] of [[0.9, 0.05, 0.013, SKIN], [1.6, 0.04, 0.0102, TIP]]) {
      const d = nrm([palm[0] * 0.5 - side[0] * 0.6 + front[0] * ang * 0.45, palm[1] * 0.5 - side[1] * 0.6 + front[1] * ang * 0.45, palm[2] * 0.5 - side[2] * 0.6 + front[2] * ang * 0.45]);
      const q = go(p, d, l); member(people, p, q, r, col, 5); p = q;
    }
  }
  api.emit({ kind: 'circle', x: B[0], z: B[2], r: 0.1, y0: ICE - 0.05, y1: ICE + 0.42, tag: 'stone' });
  // his hat, blown off onto the ice two metres away and frozen where it landed, crown up
  const hp = [-7.3, -38.9], HAT = [0.032, 0.026, 0.019];
  S.cyl(0.2, 0.2, 0.014, 16, hp[0], ICE + 0.007, hp[1], HAT, 0.4);
  S.cyl(0.105, 0.118, 0.095, 14, hp[0], ICE + 0.06, hp[1], HAT, 0.4);
  S.cyl(0.12, 0.12, 0.022, 14, hp[0], ICE + 0.026, hp[1], [0.014, 0.011, 0.009], 0.4);
  // a drum caught in it near the edge, on its side, only its back through the sheet
  S.cyl(0.29, 0.29, 0.88, 12, -15.4, level - 0.17, -41.2, P.rust, 0.3, 0, Math.PI * 0.5);
  api.emit({ kind: 'obb', x: -15.4, z: -41.2, halfX: 0.44, halfZ: 0.2, yaw: 0.3, y0: level - 0.4, y1: level + 0.12, tag: 'metal', standable: true });
}

/** THE WINCH HOUSE at the derrick's foot: the crane's cab, where the work order is clipped
 *  (lore-records.js, on its desk) and the petrol for the winch engine was kept. */
function winchHouse(k, api) {
  const S = k.solid, y = api.padY, x0 = 12.4, x1 = 16.6, z0 = -45.6, z1 = -42.4, t = 0.18, h = 2.62;
  const doorA = 13.2, doorB = 14.3;
  const wall = (ax, bx, az, bz) => {
    qbox(S, api, ax, bx, az, bz, 0, h, QP.timber);
    api.emit({ kind: 'obb', x: (ax + bx) * 0.5, z: (az + bz) * 0.5, halfX: (bx - ax) * 0.5, halfZ: (bz - az) * 0.5,
      yaw: 0, y0: y - 0.2, y1: y + h, tag: 'wood', climbable: false });
  };
  wall(x0, x1, z0, z0 + t);                       // back (south)
  wall(x0, x0 + t, z0 + t, z1);                   // west
  wall(x1 - t, x1, z0 + t, z1);                   // east
  wall(x0 + t, doorA, z1 - t, z1);                // front, either side of the door
  wall(doorB, x1 - t, z1 - t, z1);
  qbox(S, api, doorA, doorB, z1 - t, z1, 2.1, h, QP.timber);                 // over the door
  api.emit({ kind: 'obb', x: (doorA + doorB) * 0.5, z: z1 - t * 0.5, halfX: (doorB - doorA) * 0.5, halfZ: t * 0.5, yaw: 0, y0: y + 2.1, y1: y + h, tag: 'wood' });
  // boards and battens on the outside, so it is a shed and not a box
  for (let x = x0 + 0.35; x < x1 - 0.2; x += 0.42) S.box(0.05, h - 0.1, 0.03, x, y + h * 0.5, z0 - 0.015, P.dark);
  // one window in the front, dark glass in a frame, looking at the pit
  S.box(1.1, 0.7, 0.03, 15.6, y + 1.55, z1 + 0.012, P.glass);
  S.box(1.22, 0.07, 0.06, 15.6, y + 1.93, z1 + 0.02, P.dark); S.box(1.22, 0.07, 0.06, 15.6, y + 1.17, z1 + 0.02, P.dark);
  // a roof of rusted sheet on the wall heads, a hand's width over them all round
  S.box(x1 - x0 + 0.5, 0.06, z1 - z0 + 0.6, (x0 + x1) * 0.5, y + h + 0.03, (z0 + z1) * 0.5, P.rust);
  for (let x = x0 - 0.1; x < x1 + 0.2; x += 0.5) S.box(0.04, 0.03, z1 - z0 + 0.6, x, y + h + 0.075, (z0 + z1) * 0.5, P.dark);
  api.emit({ kind: 'obb', x: (x0 + x1) * 0.5, z: (z0 + z1) * 0.5, halfX: (x1 - x0) * 0.5 + 0.25, halfZ: (z1 - z0) * 0.5 + 0.3,
    yaw: 0, y0: y + h - 0.05, y1: y + h + 0.42, tag: 'metal' });
  // the winch: a drum on two stands, its engine behind it, the cable out through the wall
  S.cyl(0.34, 0.34, 1.2, 14, 15.6, y + 0.72, -43.5, P.iron, 0, Math.PI * 0.5);
  S.cyl(0.4, 0.4, 0.05, 14, 15.6, y + 0.72, -44.12, P.rust, 0, Math.PI * 0.5);
  S.cyl(0.4, 0.4, 0.05, 14, 15.6, y + 0.72, -42.88, P.rust, 0, Math.PI * 0.5);
  for (const sz of [-44.2, -42.8]) S.box(0.5, 0.72, 0.1, 15.6, y + 0.36, sz, P.iron);
  S.box(0.9, 0.7, 0.62, 15.7, y + 0.35, -44.8, P.dark);
  S.cyl(0.05, 0.05, 2.35, 6, 15.95, y + 1.85, -44.95, P.iron);               // its exhaust, out through the roof
  api.emit({ kind: 'obb', x: 15.65, z: -44.0, halfX: 0.55, halfZ: 1.35, yaw: 0, y0: y - 0.2, y1: y + 1.1, tag: 'metal', standable: true });
  // the hoist rope, out low through the east wall and along the floor to the mast's foot
  member(S, [x1 - 0.1, y + 0.3, -43.5], [x1 + 0.6, y + 0.03, -43.0], 0.025, P.dark, 4);
  member(S, [x1 + 0.6, y + 0.03, -43.0], [DERRICK.x - 1.25, y + 0.1, DERRICK.z - 0.9], 0.025, P.dark, 4);
  // the lamp over the door
  S.box(0.24, 0.16, 0.12, (doorA + doorB) * 0.5, y + 2.3, z1 + 0.08, P.iron);
  k.glow.box(0.16, 0.08, 0.05, (doorA + doorB) * 0.5, y + 2.24, z1 + 0.14, [1, 0.8, 0.55]);
}

/** Things left where the work stopped. */
function quarryFloor(k, api) {
  const S = k.solid, y = api.padY, rng = api.rng;
  // the skip road: 0.84 m gauge down the pit's east half, from the stair's foot to the south face
  const rx = 8, za = -3, zb = -51;
  for (let z = za; z > zb; z -= 0.72) S.box(1.5, 0.06, 0.18, rx + (rng.next() - 0.5) * 0.06, y + 0.03, z, P.wood, (rng.next() - 0.5) * 0.06);
  for (const dx of [-0.42, 0.42]) S.box(0.06, 0.07, za - zb, rx + dx, y + 0.095, (za + zb) * 0.5, P.iron);
  skip(S, api, rx, -14, 0, 0.13, 0, false);
  skip(S, api, rx + 0.85, -26, 0.32, 0, 0.22, false);         // off the rails, leaning into the dirt
  skip(S, api, rx + 1.7, -35, 1.25, 0, 0, true);             // over on its side, its load across the floor
  // cut blocks waiting to go up, stacked where the crane could reach them
  const stack = (x, z, n, ry) => {
    for (let i = 0; i < n; i++) S.box(2.0, 1.5, 1.5, x + (rng.next() - 0.5) * 0.1, y + 0.75 + i * 1.5, z + (rng.next() - 0.5) * 0.1, i % 2 ? QP.cut : QP.rock, ry + (rng.next() - 0.5) * 0.06);
    api.emit({ kind: 'obb', x, z, halfX: 1.08, halfZ: 0.83, yaw: ry, y0: y - 0.2, y1: y + n * 1.5, tag: 'stone', standable: true });
  };
  stack(-18, -50.5, 3, 0.1);
  stack(22.5, -18, 2, -0.2);
  // a block half split, the wedges still in their holes along the line
  S.box(1.1, 1.4, 1.6, -4.58, y + 0.7, -20, QP.rock, 0.05);
  S.box(1.1, 1.4, 1.6, -3.42, y + 0.7, -20, QP.rock, -0.02);
  for (let i = 0; i < 6; i++) S.box(0.05, 0.16, 0.05, -4.0, y + 1.46, -20.65 + i * 0.26, P.iron);
  api.emit({ kind: 'obb', x: -4, z: -20, halfX: 1.18, halfZ: 0.84, yaw: 0, y0: y - 0.2, y1: y + 1.46, tag: 'stone', standable: true });
  // a drill tripod over a half-bored hole
  {
    const cx = -22, cz = -35, top = 3.4;
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.3; member(S, [cx + Math.cos(a) * 1.15, y, cz + Math.sin(a) * 1.15], [cx, y + top, cz], 0.06, P.wood, 6); }
    S.box(0.45, 0.35, 0.3, cx, y + top - 0.25, cz, P.iron);
    member(S, [cx, y + top - 0.4, cz], [cx, y + 0.02, cz], 0.03, P.iron, 5);
    api.emit({ kind: 'circle', x: cx, z: cz, r: 0.95, y0: y - 0.2, y1: y + top, tag: 'wood', climbable: false });
  }
  // what came down off the faces
  for (const [bx, bz, w, h, d, r] of [[-12, -52.3, 1.2, 0.9, 1.4, 0.4], [14, -52.6, 1.6, 1.0, 1.1, -0.2], [25.2, -46, 1.1, 0.8, 1.0, 0.7], [-25.4, -8, 1.3, 0.85, 0.9, -0.5]]) {
    S.box(w, h, d, bx, y + h * 0.5, bz, QP.rock, r, 0, 0.04);
    api.emit({ kind: 'obb', x: bx, z: bz, halfX: w * 0.5, halfZ: d * 0.5, yaw: r, y0: y - 0.2, y1: y + h, tag: 'stone', standable: true });
  }
  // spalls at the foot of the faces
  for (let i = 0; i < 48; i++) {
    const side = i % 3;
    let x, z;
    if (side === 0) { x = -27.5 + rng.next() * 0.9; z = -53.5 + rng.next() * 52; }
    else if (side === 1) { x = 26.6 + rng.next() * 0.9; z = -53.5 + rng.next() * 52; }
    else { x = -27 + rng.next() * 54; z = -54.5 + rng.next() * 0.9; }
    if (x > 20 && Math.abs(z + 10) < 1.2) continue;
    const sz = 0.08 + rng.next() * 0.16;
    S.box(sz * 1.3, sz, sz, x, y + sz * 0.45, z, rng.next() < 0.5 ? QP.rock : QP.cut, rng.next() * 3, rng.next() * 0.4);
  }
}

export function makeOuterBuilders({ kits, GLOW, groundY }) {
  return {
    glasshouse: {
      landmark(api) {
        const k = kits(), y = api.padY;
        // Eighty-eight metres of curved iron, split into three aisles. The missing
        // panes leave actual holes in the roof through which the forest and sky show.
        for (let i = 0; i < 12; i++) {
          const z = 30 - i * 8;
          arch(k, api, z, 25, 15, 4.2, .23, P.iron, groundY);
          for (const x of [-10, 10]) post(k, api, x, z, .17, 15.8, P.iron, groundY);
          if (i < 11) for (const x of [-25, 25, -10, 10]) {
            member(k.solid, [x, y + (Math.abs(x) > 20 ? 4.28 : 15.88), z],
              [x, y + (Math.abs(x) > 20 ? 4.28 : 15.88), z - 8], .12, P.iron);
          }
          if (i % 3 === 0) lamp(k, 0, y + 16.6, z, [.60, .96, .86]);
          // Remaining roof shards are solid tinted glass, never transparent fog sheets.
          if (i % 3 !== 1) for (const sx of [-1, 1]) {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([
              sx * 24.4, y + 6.4, z - .5, sx * 20.4, y + 12.4, z - .5,
              sx * 21.6, y + 10.9, z - 5.4,
            ], 3));
            g.computeVertexNormals(); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, .7, 1], 2));
            g.setIndex([0, 1, 2]);
            k.solid.push(g, P.glass);
          }
        }
        return result(k, GLOW.wisp);
      },
      body(api) {
        const k = kits(), y = api.padY;
        slab(k, api, 0, -14, 56, 94, Y, P.dark);
        // Broken growing beds leave clear 5 m side routes and a 9 m central aisle.
        for (const x of [-17, 17]) for (const z of [19, -1, -21, -41]) {
          slab(k, api, x, z, 7, 11, .69, P.moss, .53);
          k.solid.box(6.6, .07, 10.6, x, y + .70, z, P.earth);
          for (let n = 0; n < 7; n++) {
            const px = x + Math.sin(n * 2.7 + z) * 2.3, pz = z - 4 + n * 1.3;
            const h = 1.4 + (n % 3) * .47;
            member(k.solid, [px, y + .72, pz], [px + .3, y + h + .72, pz - .4], .06, P.moss);
            for (const side of [-1, 1]) {
              k.solid.cone(.32, .8, 5, px + side * .27, y + h * .72, pz, P.moss, 0, 0, side * .8);
            }
          }
        }
        // Empty linen cocoons hang in the upper aisle. Their distinct skull and shoulder
        // cavities read when the torch travels upward; they never occupy a walking route.
        for (const [x, z, h] of [[-6, 10, 6.4], [7, -12, 7.2], [-5, -36, 5.6]]) {
          member(k.solid, [x, y + h + 2.5, z], [x, y + 15, z], .028, P.iron);
          k.solid.cyl(.32, .07, 1.8, 9, x, y + h + .9, z, P.bone, 0, 0, .12);
          k.solid.cyl(.08, .48, .58, 9, x, y + h + 1.9, z, P.bone);
          k.solid.at(new THREE.SphereGeometry(.22, 10, 8), P.dark, x, y + h + 2.27, z + .14);
          for (let n = 0; n < 5; n++) member(k.solid, [x, y + h, z],
            [x + Math.sin(n * 2.4) * .38, y + h - .8 - n * .17, z + Math.cos(n * 2.4) * .3], .025, P.moss);
        }
        for (const [i, p] of OUTER_ROUTES.glasshouse.loot.entries()) chest(k, api, p[0], p[1], Y, i === 3);
        for (const z of [22, 2, -18, -38, -54]) for (const x of [-7, 7]) lamp(k, x, y + 1.7, z);
        return result(k, GLOW.wisp, [
          { species: 'standing', lx: -7, lz: -43, ly: Y, awake: false },
          { species: 'pale', lx: 21, lz: -28, ly: Y, awake: false },
        ]);
      },
    },
    'bell-vault': {
      landmark(api) {
        const k = kits(), y = api.padY;
        // Repeated open ribs make a ruined nave nearly a hundred metres deep.
        for (let i = 0; i < 9; i++) {
          const z = 30 - i * 11;
          arch(k, api, z, 22, 18, 7, 1.05, i % 3 === 0 ? P.moss : P.stone, groundY);
          for (const sx of [-1, 1]) {
            const x = sx * 26;
            post(k, api, x, z, 1.0, 13 + (i % 2) * 2, P.stone, groundY);
            member(k.solid, [sx * 22, y + 18, z], [x, y + 10, z], .54, P.stone);
          }
        }
        for (let i = 0; i < 5; i++) {
          const z = 19 - i * 14, h = 14 + (i % 3) * 2.1;
          member(k.solid, [0, y + h + 2, z], [0, y + 25, z], .07, P.iron);
          k.solid.tube(.46, 1.6, 2.1, 18, 0, y + h, z, P.copper);
          k.solid.at(new THREE.TorusGeometry(1.58, .12, 5, 20), P.copper, 0, y + h - 1.05, z, 0, Math.PI * .5);
          k.solid.cyl(.09, .18, 2.5, 7, 0, y + h -.5, z, P.iron);
          lamp(k, 0, y + h + 1.25, z);
        }
        return result(k, GLOW.cold);
      },
      body(api) {
        const k = kits(), y = api.padY;
        slab(k, api, 0, -14, 58, 94, Y, P.stone);
        for (const z of [18, 0, -18, -38]) {
          // Broken west chapels have two doors each and do not seal the nave.
          for (const pz of [z - 5, z + 5]) {
            k.solid.box(10, 2.2, .8, -20, y + 1.18, pz, P.moss);
            api.emit({ kind: 'obb', x: -20, z: pz, halfX: 5, halfZ: .4, yaw: 0,
              y0: y + .08, y1: y + 2.28, tag: 'wall' });
          }
          slab(k, api, -22, z, 3, 2.1, .96, P.dark, .8);
          for (let n = 0; n < 5; n++) k.solid.cyl(.045, .07, .34 + n * .055, 7,
            -23 + n * .46, y + 1.14, z, P.bone);
        }
        const route = OUTER_ROUTES['bell-vault']; stair(k, api, route.stair);
        slab(k, api, 16, -30, 6.2, 42.8, 5.2, P.stone, .45);
        // A parapet is a rail, never a waist-high solid across the stair landing.
        for (const x of [12.9, 19.1]) {
          for (let z = -12; z >= -50; z -= 4) post(k, { ...api, heightAt: () => y + 5.12 }, x, z, .11, 1.05, P.iron, groundY);
          member(k.solid, [x, y + 6.12, -10], [x, y + 6.12, -51], .07, P.iron);
        }
        for (const [i, p] of route.loot.entries()) chest(k, api, p[0], p[1], Y, i === 2);
        chest(k, api, route.upperLoot[0], route.upperLoot[1], route.upperLoot[2], true);
        for (const z of [25, 5, -15, -35, -53]) lamp(k, 0, y + .65, z);
        return result(k, GLOW.cold, [
          { species: 'pallbearer', lx: -19, lz: -18, ly: Y, awake: false },
          { species: 'standing', lx: 6, lz: -44, ly: Y, awake: false },
        ]);
      },
    },
    'red-quarry': {
      // The landmark is what reads from the road and must never stream out: the derrick,
      // its boom and BLOCK 1 over the pit, and the conveyor up the east wall to its tower.
      landmark(api) {
        const k = kits();
        quarryDerrick(k, api);
        quarryConveyor(k, api);
        return result(k, GLOW.ember);
      },
      body(api) {
        const k = kits(), route = OUTER_ROUTES['red-quarry'];
        quarryBenches(k, api);
        quarryRail(k, api);
        quarryIncline(k, api);
        winchHouse(k, api);
        quarryFloor(k, api);
        for (const [i, p] of route.loot.entries()) chest(k, api, p[0], p[1], 0, i === 2);
        chest(k, api, route.upperLoot[0], route.upperLoot[1], route.upperLoot[2], true);
        // floodlights on poles across the floor; they come on with the claim, from the derrick out
        for (const F of FLOODS) floodlight(k, api, F, groundY);
        const people = kits().solid;
        frozenMan(people, k.solid, api);
        const out = result(k, GLOW.ember, [
          { species: 'hunter', lx: -14, lz: -31, ly: 0, awake: false },
          { species: 'hound', lx: 11, lz: -46, ly: 0, awake: false },
        ]);
        out.people = people.build();
        return out;
      },
    },
  };
}
