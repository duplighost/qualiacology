// vehicle/carbody.js — the car itself. Owner: vehicle. No system id: this is a builder,
// not a manifest entry (tests/reverse-manifest.mjs keys off `static id`).
//
// An abandoned rural estate car. It has to do two jobs at once and they pull apart:
//   at 40 m, in moonlight, it must read as A CAR and not as a crate — that is a boxy
//     silhouette, a greenhouse that is visibly glass-shaped, four round wheels below a
//     shadow gap, and ONE lit lamp;
//   at 2 m, from the driver's seat, it must be a place you want to be — a dash you can
//     see, a binnacle, a wheel rim below your hands, a door card either side.
//
// Exterior paint and matte cabin trim are separate merged geometries. The wheels,
// steering, door, glass and lamps remain independent where motion or surface response
// requires it. All opaque materials use the same Standard vertex-colour shader family;
// roughness, metalness and emissive differences are uniforms, not shader variants.
// The interior split adds one draw and keeps wet bodywork highlights off the dashboard.
//
// vertexColors is safe here and is NOT the PALEHOLLOW grass bug (flora.js:693): every
// part that reaches mergeGeometries has a `color` attribute written by `part()`, so
// USE_COLOR never multiplies against a missing attribute's default of black. The merge
// is asserted below.
//
// Layout is Three-local: forward is -Z, driver on -X (left-hand drive), origin on the
// ground between the axles. CFG.car.seat is (-0.31, 1.66, -0.50) and every dimension
// here is chosen so that eye sits INSIDE the greenhouse with the glass line below it.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CFG } from '../config.js';
import { clamp01 } from '../engine/math.js';

/* --------------------------------------------------------------- dimensions --
 * WHEELBASE is CFG.car.wheelbase (2.55). Everything else is local: config.js is
 * engine's file and a request for a CFG.car.body block is in docs/HANDOFF.md.
 * ------------------------------------------------------------------------- */
const WB = CFG.car.wheelbase;          // 2.55
const HALF_WB = WB * 0.5;              // 1.275
const BODY_HX = 0.93;                  // half width of the lower body
const TRACK = 0.84;                    // wheel centre offset from the spine
const WHEEL_R = 0.40;
const WHEEL_W = 0.26;
const NOSE_Z = -2.14;                  // front bumper face
const TAIL_Z = 2.16;                   // rear bumper face
export const ROOF_Y = 1.97;            // top of the roof plate — the mantle target
/** The body's footprint, car-local (forward is -Z): car.js roofHeightAt answers inside it. */
export const FOOTPRINT = Object.freeze({ hx: BODY_HX, z0: NOSE_Z, z1: TAIL_Z });
export const DOOR = Object.freeze({ x: -1.00, y: 1.05, z: -0.30 });   // driver door, local
export const LAMP_GOOD = Object.freeze({ x: -0.66, y: 1.02, z: NOSE_Z - 0.04 });
export const LAMP_DEAD = Object.freeze({ x: 0.66, y: 1.02, z: NOSE_Z - 0.04 });
export const WHEEL_RADIUS = WHEEL_R;

/* ---------------------------------------------------------- THE DOORWAY -----
 * ALEX PLAYED IT: "I've made it to the car. i have no idea how to get into the car lol."
 *
 * He found it, he wanted it, and the car answered him with nothing at all. The entry verb
 * existed (hold E within 2.2 m of a point on the driver's flank) and NOTHING in the world
 * said so: the shell was one closed box, every panel line was a 2 cm dark strip, and the
 * only moving part on the whole prop was the wheels. A rule against captions is not a rule
 * against making a verb discoverable — so the DOOR is the caption now.
 *
 * The driver's door is cut OUT of the shell (a real aperture with a black liner behind it)
 * and rebuilt as its own hinged group that stands ajar whenever the car is parked, swings
 * wide when you walk up to it, and shuts on you when you get in. A player who walks up to a
 * car in a forest and sees an open driver's door with a light on inside does not need a
 * prompt, and that is the whole of this block.
 * -------------------------------------------------------------------------- */
// The hole in the flank. z is along the car (forward is -Z), y is off the ground.
const AP_Z0 = -0.92, AP_Z1 = 0.30;      // 1.22 m of doorway
const AP_Y0 = 0.80, AP_Y1 = 1.24;       // sill to waist
const SKIN = 0.16;                      // flank skin thickness — the door is this thick too
const CORE_HX = BODY_HX - SKIN;         // 0.77: the body under the skin
/** Hinge, car-local. The front edge of the aperture, which is where a car door hinges. */
export const DOOR_HINGE = Object.freeze({ x: -0.90, y: 0, z: AP_Z0 });
/** Radians at full open. 60 degrees is a door you could not mistake for a shut one. */
export const DOOR_OPEN_MAX = 1.05;
export const WHEEL_OFFSETS = Object.freeze([
  Object.freeze({ x: -TRACK, y: WHEEL_R, z: -HALF_WB, front: true }),
  Object.freeze({ x: TRACK, y: WHEEL_R, z: -HALF_WB, front: true }),
  Object.freeze({ x: -TRACK, y: WHEEL_R, z: HALF_WB, front: false }),
  Object.freeze({ x: TRACK, y: WHEEL_R, z: HALF_WB, front: false }),
]);

/* ------------------------------------------------------------------ palette --
 * Linear-space albedos, deliberately dark. terrain.js's ground sits at 0.04-0.08
 * (world HANDOFF D.5) and a car painted at 0.6 would read as a lit billboard in a
 * county whose whole point is that it is dark. The paint is oatmeal gone grey; the
 * rust does the storytelling.
 * ------------------------------------------------------------------------- */
// ROUND 14. These were 0.150/0.098 and warm — oatmeal. Under the torch, which is how you
// actually meet this car, 0.150 albedo clips to near-white and the whole thing read as
// CARDBOARD (Alex: "that car does not look good"). Measured off tools/carlook.mjs: at 5 m
// with the torch on, the old paint sat at luma 232; this sits at 138, which is a painted
// panel catching a light rather than a lit billboard. It is also colder — a green-grey,
// not a cream — because every warm thing in this county is a fire, a lamp or a wound.
// The doorway still reads as a hole: the liner is 0.030, darker than this by 3x.
const C_PAINT = [0.086, 0.092, 0.083];
const C_PAINT_LO = [0.052, 0.056, 0.050];   // lower panels, dirt-shadowed
// ROUND 14: rust was 0.115/0.148 — BRIGHTER than the new paint, so every rusted panel
// (the arches and skirt run at 0.95) glowed tan and the car read as cardboard. Rust on a
// car left in a wet field is darker than its paint, not lighter.
const C_RUST = [0.062, 0.033, 0.019];
const C_RUST_HOT = [0.092, 0.046, 0.023];
const C_CHROME = [0.230, 0.235, 0.245];
const C_DARK = [0.030, 0.029, 0.031];
const C_RUBBER = [0.022, 0.021, 0.023];
const C_LEATHER = [0.072, 0.055, 0.042];
const C_WOOD = [0.062, 0.040, 0.026];
const C_GLASSFRAME = [0.055, 0.054, 0.056];

/* Deterministic hash noise for the rust mottle. No Math.random anywhere (CONTRACT). */
function hash3(x, y, z, seed) {
  let h = Math.imul((x * 73856093) ^ (y * 19349663) ^ (z * 83492791) ^ seed, 2654435761);
  h = (h ^ (h >>> 15)) >>> 0;
  return h / 4294967296;
}
function mottle(x, y, z, seed) {
  // Two octaves of trilinear-ish value noise on a 0.35 m lattice: patchy, not speckled.
  let v = 0, amp = 0.65, f = 2.9;
  for (let o = 0; o < 2; o++) {
    const px = x * f, py = y * f, pz = z * f;
    const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
    const fx = px - ix, fy = py - iy, fz = pz - iz;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    let acc = 0;
    for (let k = 0; k < 8; k++) {
      const dx = k & 1, dy = (k >> 1) & 1, dz = (k >> 2) & 1;
      const w = (dx ? ux : 1 - ux) * (dy ? uy : 1 - uy) * (dz ? uz : 1 - uz);
      acc += w * hash3(ix + dx, iy + dy, iz + dz, seed + o * 977);
    }
    v += acc * amp; amp *= 0.5; f *= 2.3;
  }
  return clamp01(v / 0.975);
}

/**
 * One part, ready for the merge. Applies the transform, writes a `color` attribute,
 * and optionally weathers it. Every geometry that reaches mergeGeometries goes through
 * here, which is what makes vertexColors safe.
 */
function part(geo, colour, opts) {
  const o = opts || {};
  if (o.rx) geo.rotateX(o.rx);
  if (o.ry) geo.rotateY(o.ry);
  if (o.rz) geo.rotateZ(o.rz);
  geo.translate(o.x || 0, o.y || 0, o.z || 0);

  const pos = geo.attributes.position;
  const n = pos.count;
  const col = new Float32Array(n * 3);
  const rust = o.rust === undefined ? 0 : o.rust;
  const seed = o.seed === undefined ? 17 : o.seed;
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let r = colour[0], g = colour[1], b = colour[2];
    if (rust > 0) {
      // Rust blooms from the sills up and from the seams out. `low` is the sill weight:
      // 1 at the rocker panel, 0 by the roof line — which is where rust actually lives
      // on a car left in a field, and reads as a car rather than as noise.
      const low = clamp01(1.25 - y / 1.15);
      const m = mottle(x, y, z, seed);
      const w = clamp01((m - (1 - rust * (0.35 + 0.65 * low))) * 3.4);
      const hot = clamp01((m - 0.86) * 6);
      const rr = C_RUST[0] + (C_RUST_HOT[0] - C_RUST[0]) * hot;
      const rg = C_RUST[1] + (C_RUST_HOT[1] - C_RUST[1]) * hot;
      const rb = C_RUST[2] + (C_RUST_HOT[2] - C_RUST[2]) * hot;
      r += (rr - r) * w; g += (rg - g) * w; b += (rb - b) * w;
      // road film: everything below the sill is grimed down, which is what separates
      // the body from the ground plane instead of letting them merge into one blob.
      const grime = clamp01(1.0 - y / 0.72) * 0.42;
      r *= 1 - grime; g *= 1 - grime; b *= 1 - grime;
    }
    col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // mergeGeometries demands an identical attribute set on every part. Box/Cylinder/
  // Plane/Torus all ship position+normal+uv; the merge below asserts it anyway.
  return geo;
}

function box(w, h, d) {
  const radius=Math.min(.025,w*.14,h*.14,d*.14);
  if(radius<.008)return new THREE.BoxGeometry(w,h,d);
  const g=new THREE.BoxGeometry(w,h,d,3,3,3),p=g.attributes.position,n=g.attributes.normal;
  const v=new THREE.Vector3(),core=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i);
    // Put support edges one bevel radius from the boundary, keeping broad faces flat.
    if(Math.abs(v.x)<w*.49)v.x=Math.sign(v.x)*(w/2-radius);
    if(Math.abs(v.y)<h*.49)v.y=Math.sign(v.y)*(h/2-radius);
    if(Math.abs(v.z)<d*.49)v.z=Math.sign(v.z)*(d/2-radius);
    core.set(Math.max(-w/2+radius,Math.min(w/2-radius,v.x)),
      Math.max(-h/2+radius,Math.min(h/2-radius,v.y)),Math.max(-d/2+radius,Math.min(d/2-radius,v.z)));
    v.sub(core).normalize();n.setXYZ(i,v.x,v.y,v.z);v.multiplyScalar(radius).add(core);p.setXYZ(i,v.x,v.y,v.z);
  }
  return g;
}

/**
 * Build the car. `rng` is an engine/math.js Rng fork — used only for the wear seed, so
 * the same seed always produces the same rust and a screenshot test is stable.
 * @returns {{root, wheels, steer, lampGood, lampDead, setLamp, dispose, tris}}
 */
export function buildCarBody(rng) {
  const seed = rng ? (1 + Math.floor(rng.next() * 4096)) : 17;
  const root = new THREE.Group();
  root.name = 'car';
  root.rotation.order = 'YXZ';        // fix 1 on port: YXZ everywhere a pose is composed

  /* ---------------------------------------------------------- the shell ---- */
  const parts = [];
  const P = (geo, colour, opts) => { parts.push(part(geo, colour, Object.assign({ seed }, opts))); };
  // ART.md 7.1 — the chrome class. Same builder, same vertex colours, same program; the
  // ONLY difference is roughness/metalness, which are uniforms and not defines. See the
  // chromeMat comment below for why a second material here costs no shader program.
  const chromeParts = [];
  const PC = (geo, colour, opts) => { chromeParts.push(part(geo, colour, Object.assign({ seed }, opts))); };
  // THE DOOR. Three collectors, because the door is three materials' worth of the same
  // three materials the rest of the car already uses — bodyMat, chromeMat and the new
  // cabinMat — so it costs three draw calls and NO shader program (see chromeMat's note:
  // Three keys programs off the FEATURE set, and emissive/roughness/metalness are uniforms).
  // Every position below is DOOR-LOCAL: car-local minus DOOR_HINGE, so the group rotates
  // about the front edge of the aperture the way a car door actually does.
  const doorParts = [], doorChromeParts = [], glowParts = [], sillGlowParts = [];
  const PD = (geo, colour, opts) => { doorParts.push(part(geo, colour, Object.assign({ seed }, opts))); };
  const PDC = (geo, colour, opts) => { doorChromeParts.push(part(geo, colour, Object.assign({ seed }, opts))); };
  const PDG = (geo, colour, opts) => { glowParts.push(part(geo, colour, Object.assign({ seed }, opts))); };
  const PSG = (geo, colour, opts) => { sillGlowParts.push(part(geo, colour, Object.assign({ seed }, opts))); };
  const dx_ = (x) => x - DOOR_HINGE.x;
  const dz_ = (z) => z - DOOR_HINGE.z;
  // A chrome bar, not a chrome box. THIS is the highlight: a box has one normal across its
  // whole face, so it is either entirely in the moon's specular lobe or entirely out of it
  // (which is exactly the flat-plate diagnosis viewmodel.js reached, ART.md 6.0). A bar's
  // normals sweep the whole circle, so SOMEWHERE along it the mirror condition is met from
  // any angle you look, and what you get is a streak the length of the bumper.
  const bar = (len, r, segs) => {
    const g = new THREE.CylinderGeometry(r, r, len, segs === undefined ? 14 : segs, 1);
    return g;   // part() rotates it onto X via rz
  };

  // lower body: sill to waist. 0.62 -> 1.24.
  //
  // THE APERTURE. This used to be one solid box, which is why there was no way to show a
  // door standing open: there was no hole for it to stand open in front of. It is now a
  // core plus flank skins, and the driver's skin is broken around a real 1.22 x 0.44 m
  // doorway. The liner behind it is C_DARK with no rust, so what you see through the
  // opening is the darkest value on the car — at night a doorway reads as a HOLE, and a
  // hole in a pale-ish flank is visible from much further out than any 2 cm panel line.
  // ROUND 14. Alex, 2026-09-07: "that car does not look good. you'll be driving around
  // that car for the whole game. it should look excellent."
  //
  // What was actually wrong, read off tools/carlook.mjs, not reasoned about:
  //   1. THE GREENHOUSE WAS A SOLID BOX — box(1.74, 0.66, 2.86) — with the glass planes
  //      floating just outside it. You could not see into the cabin from anywhere, so the
  //      thing read as a camper shell bolted to a flatbed. This is the whole fix: the
  //      cabin is now PILLARS AND OPENINGS, and you look THROUGH it at the dark inside.
  //   2. The flank was one flat slab, so nothing but the moulding ever caught light.
  //      It now has a section: tucked at the sill, widest at the hip, tumblehome above.
  //   3. The arches were four dark rectangles, so the wheels read as bolted on. They are
  //      arcs now, flared proud of the flank, with a dark well behind them.
  //
  // Still ONE merged geometry, ONE material, vertex colours only — no map, no new program.

  // The cross-section, as a half-width at a height. A car's side is never one plane and
  // the roll of light along this curve is most of what says "car" at 40 m.
  const FL_Y0 = 0.62, FL_Y1 = 1.24;
  const flankHX = (y) => {
    const t = clamp01((y - FL_Y0) / (FL_Y1 - FL_Y0));
    const d = t - 0.34;                       // the hip
    const tuck = d < 0 ? (d / 0.34) * (d / 0.34) * 0.080 : (d / 0.66) * (d / 0.66) * 0.058;
    return BODY_HX * (1 - tuck);
  };
  const WAIST_HX = flankHX(FL_Y1);

  // the body under the skin
  P(box(CORE_HX * 2, 0.62, 4.10), C_PAINT, { y: 0.93, z: 0.02, rust: 0.85 });

  // The flank, as eight courses following the section. The driver's courses that cross the
  // doorway are split fore and aft of it, so the aperture stays a real hole in a real skin.
  const FL_N = 8, FL_DY = (FL_Y1 - FL_Y0) / FL_N;
  for (let i = 0; i < FL_N; i++) {
    const ym = FL_Y0 + (i + 0.5) * FL_DY;
    const hx = flankHX(ym) - SKIN * 0.5;
    const h = FL_DY + 0.006;
    const rust = 0.72 + 0.28 * (1 - (ym - FL_Y0) / (FL_Y1 - FL_Y0));
    P(box(SKIN, h, 4.10), C_PAINT, { x: hx, y: ym, z: 0.02, rust });
    if (ym > AP_Y0 && ym < AP_Y1) {
      P(box(SKIN, h, AP_Z0 + 2.03), C_PAINT, { x: -hx, y: ym, z: (-2.03 + AP_Z0) * 0.5, rust });
      P(box(SKIN, h, 2.07 - AP_Z1), C_PAINT, { x: -hx, y: ym, z: (AP_Z1 + 2.07) * 0.5, rust });
    } else {
      P(box(SKIN, h, 4.10), C_PAINT, { x: -hx, y: ym, z: 0.02, rust });
    }
  }
  // the liner: what the doorway is a hole INTO
  P(box(0.03, AP_Y1 - AP_Y0, AP_Z1 - AP_Z0), C_DARK,
    { x: -(CORE_HX + 0.016), y: (AP_Y0 + AP_Y1) * 0.5, z: (AP_Z0 + AP_Z1) * 0.5 });
  // rocker panels — the rustiest thing on any car left in a field
  P(box(flankHX(FL_Y0) * 2 + 0.02, 0.20, 3.60), C_PAINT_LO, { y: 0.68, z: 0.02, rust: 1.0 });

  // Bonnet: five courses falling and narrowing toward the nose, so the front is a wedge
  // with a crown on it instead of a plank laid on a box.
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    P(box(1.76 - t * 0.20, 0.14, 0.27), C_PAINT,
      { y: 1.215 - t * 0.105, z: -0.98 - t * 1.10, rx: 0.075, rust: 0.72 });
  }
  // scuttle: the step from bonnet up to the windscreen base, where wipers live
  P(box(1.74, 0.10, 0.20), C_PAINT_LO, { y: 1.245, z: -1.02, rust: 0.8 });

  /* -- the greenhouse: a FRAME, never a block ------------------------------- */
  // Rails and pillars only. Every gap between them is a window the glass planes below
  // sit in, and what you see through them is the dark cabin.
  const GH_Y0 = 1.28, GH_Y1 = 1.88;                 // the glass band
  const GX = WAIST_HX - 0.02;              // the greenhouse is inboard of the waist
  // The frame sits a stop under the flanks. Pillars painted the same value as the body
  // made the cabin one pale mass; darker members read as a frame with glass IN it.
  const C_FRAME = [0.061, 0.065, 0.059];
  for (const sx of [-1, 1]) {
    // waist rail under the glass, header rail over it
    P(box(0.11, 0.10, 2.94), C_PAINT, { x: sx * GX, y: GH_Y0 - 0.02, z: 0.42, rust: 0.5 });
    P(box(0.11, 0.09, 2.94), C_FRAME, { x: sx * GX, y: GH_Y1 + 0.015, z: 0.42, rust: 0.45 });
    // A pillar, raked with the windscreen; B at the door shut; D down the tailgate
    P(box(0.10, 0.64, 0.12), C_FRAME, { x: sx * GX, y: 1.58, z: -0.93, rx: -0.34, rust: 0.4 });
    P(box(0.11, 0.62, 0.20), C_FRAME, { x: sx * GX, y: 1.58, z: 0.32, rust: 0.42 });
    P(box(0.10, 0.62, 0.13), C_FRAME, { x: sx * GX, y: 1.58, z: 1.80, rx: 0.22, rust: 0.5 });
    // drip rail: the dark line where a roof meets a side, and a real car always has one
    P(box(0.05, 0.045, 2.90), C_DARK, { x: sx * (GX + 0.035), y: 1.905, z: 0.42, rust: 0.4 });
    // roof edge chamfer, so the roof is not a sharp slab
    P(box(0.11, 0.07, 2.90), C_PAINT, { x: sx * (GX - 0.03), y: 1.925, z: 0.42, rz: sx * 0.62, rust: 0.5 });
  }
  // windscreen header and tailgate header, across the top
  P(box(1.72, 0.10, 0.16), C_FRAME, { y: GH_Y1 + 0.02, z: -0.84, rust: 0.4 });
  P(box(1.72, 0.10, 0.16), C_FRAME, { y: GH_Y1 + 0.02, z: 1.80, rust: 0.5 });
  // tailgate waist, under the rear glass
  P(box(1.72, 0.11, 0.14), C_PAINT, { y: GH_Y0 - 0.02, z: 1.88, rust: 0.6 });

  // Roof plate — the mantle target, and it must catch the moon. It ENDS at the A-pillar
  // tops (z -0.84): a roof that overhangs its own windscreen is a shed canopy on posts,
  // which is exactly what the first pass looked like.
  const ROOF_Z0 = -0.84, ROOF_Z1 = 1.88;
  const ROOF_LEN = ROOF_Z1 - ROOF_Z0, ROOF_CZ = (ROOF_Z0 + ROOF_Z1) * 0.5;
  P(box(1.66, 0.09, ROOF_LEN), C_PAINT, { y: ROOF_Y - 0.045, z: ROOF_CZ, rust: 0.55 });
  // roof rails: the two lines that make it read as an estate at distance
  P(box(0.07, 0.07, ROOF_LEN - 0.34), C_DARK, { x: -0.62, y: ROOF_Y + 0.05, z: ROOF_CZ, rust: 0.4 });
  P(box(0.07, 0.07, ROOF_LEN - 0.34), C_DARK, { x: 0.62, y: ROOF_Y + 0.05, z: ROOF_CZ, rust: 0.4 });

  // Wheel arches, as arcs. Nine segments over each wheel, standing a little proud of the
  // flank, with a dark well behind so the tyre sits IN the body and not beside it.
  // THE SKIRT. Without this the arches hang in mid-air below a body that stops at 0.62
  // while the wheels reach the ground — which is what made the first pass look like four
  // croissants pinned to a plank. The lower body now comes down to meet them.
  const SKIRT_Y0 = 0.42, SKIRT_Y1 = 0.64;
  const SKIRT_HX = flankHX(FL_Y0) - 0.020;
  const ARCH_R = WHEEL_R + 0.19;
  for (const sx of [-1, 1]) {
    const seg = (z0, z1) => P(box(SKIN * 0.75, SKIRT_Y1 - SKIRT_Y0, z1 - z0), C_PAINT_LO,
      { x: sx * SKIRT_HX, y: (SKIRT_Y0 + SKIRT_Y1) * 0.5, z: (z0 + z1) * 0.5, rust: 0.62 });
    seg(-HALF_WB + ARCH_R, HALF_WB - ARCH_R);          // between the wheels
    seg(-2.03, -HALF_WB - ARCH_R);                     // ahead of the front wheel
    seg(HALF_WB + ARCH_R, 2.07);                       // behind the rear wheel
  }

  // Wheel arches, as arcs springing from the skirt. Nine segments over each wheel, a
  // little proud of the flank, with a dark well behind so the tyre sits IN the body.
  const ARCH_N = 9, ARCH_SEG = Math.PI * ARCH_R / ARCH_N * 1.24;
  for (let k = 0; k < WHEEL_OFFSETS.length; k++) {
    const w = WHEEL_OFFSETS[k];
    const sx = w.x < 0 ? -1 : 1;
    const hx = flankHX(0.84);
    P(box(0.04, 0.44, ARCH_R * 1.94), C_DARK, { x: sx * (hx + 0.008), y: 0.78, z: w.z, rust: 0.2 });
    for (let i = 0; i < ARCH_N; i++) {
      const a = Math.PI * (i + 0.5) / ARCH_N;
      P(box(0.115, 0.13, ARCH_SEG), C_PAINT_LO,
        { x: sx * (hx + 0.018), y: WHEEL_R + Math.sin(a) * ARCH_R, z: w.z + Math.cos(a) * ARCH_R,
          rx: -(a + Math.PI * 0.5), rust: 0.55 });
    }
  }

  // bumpers and grille. Dull chrome: the only thing on the car brighter than the ground.
  // THE ONE HIGHLIGHT (ART.md 7.1). The rust here is deliberately lower than everything
  // else on the car: a bumper mottled at 0.55 is a bumper whose streak is chopped into
  // eight-pixel fragments, and a fragmented streak fails the "contiguous run" read for the
  // same reason a fragmented silhouette does. Measured both ways — see docs/HANDOFF.md.
  PC(bar(1.92, 0.105), C_CHROME, { y: 0.82, z: NOSE_Z + 0.06, rz: Math.PI * 0.5, rust: 0.22 });
  PC(bar(1.92, 0.105), C_CHROME, { y: 0.82, z: TAIL_Z - 0.06, rz: Math.PI * 0.5, rust: 0.45 });
  P(box(1.24, 0.30, 0.12), C_DARK, { y: 1.10, z: NOSE_Z + 0.05, rust: 0.5 });
  for (let i = 0; i < 5; i++) {
    PC(bar(1.20, 0.013, 8), C_CHROME, { y: 0.99 + i * 0.055, z: NOSE_Z + 0.005, rz: Math.PI * 0.5, rust: 0.35 });
  }
  // one mirror, driver side only — the other is gone, which is a whole sentence of story
  P(box(0.16, 0.11, 0.07), C_DARK, { x: -1.02, y: 1.36, z: -0.86, rust: 0.6 });

  // THE STREAK (ART.md 7.1). A chrome rubbing strip down each flank, and the ONLY reason
  // it is a flat facet and not a round bar is measurement:
  //
  //   at 40 m the buffer is 12.5 px per metre. Roughness 0.22 is a GGX alpha of 0.048,
  //   which on a CURVED element is about 5.6 degrees of arc — 8 mm on a 160 mm bumper bar,
  //   which is 0.1 of a pixel. A round chrome bar physically cannot make a multi-pixel
  //   streak at the distance the gate is written for. Measured: rounded bumper bars, every
  //   combination of roughness 0.18-0.50 and metalness 0.25-0.88, largest contiguous run
  //   0-11 px against a gate of 40. A FLAT facet is all-or-nothing, and all-or-nothing is
  //   what "one hard streak" means: it flashes as you walk past, the way chrome does.
  //
  // The tilt is the half-vector, not a guess. The moon sits at elevation 0.593 rad (34 deg,
  // gfx/lights.js:45) and a player's eye at 40 m is level with the strip, so the half-vector
  // between them stands at 16-17 degrees. The face is tilted UP by that, away from the car,
  // and the tolerance is about +-10 degrees before the lobe falls away — which covers every
  // slope a road in this county actually has.
  const MOULD_TILT = 0.29;            // rad, ~16.6 deg: (moon elevation + eye elevation) / 2
  // The passenger flank keeps the measured 3.30 m strip whole. The DRIVER'S flank is now
  // three abutting segments — fore of the doorway, the door's own, aft of the doorway — and
  // they meet with no gap, so a shut door still presents one unbroken 3.30 m run and the
  // 110 px contiguous-highlight measurement above is unchanged. An OPEN door breaks it into
  // 0.71 m and 1.37 m, which is the point: the streak snapping in two at 40 m is itself the
  // read that something on that car is standing open.
  PC(box(0.05, 0.110, 3.30), C_CHROME,
    { x: BODY_HX + 0.022, y: 0.965, z: 0.02, rz: MOULD_TILT, rust: 0.30 });
  PC(box(0.05, 0.110, AP_Z0 + 1.63), C_CHROME,
    { x: -(BODY_HX + 0.022), y: 0.965, z: (-1.63 + AP_Z0) * 0.5, rz: -MOULD_TILT, rust: 0.30 });
  PC(box(0.05, 0.110, 1.67 - AP_Z1), C_CHROME,
    { x: -(BODY_HX + 0.022), y: 0.965, z: (AP_Z1 + 1.67) * 0.5, rz: -MOULD_TILT, rust: 0.30 });

  // door shut lines, cut as recessed dark strips so the doors are legible as doors. The
  // driver's front two are gone: they used to draw the edges of a door that could not
  // open, and they now sit inside the aperture, which is a hole and needs no line drawn
  // around it.
  P(box(0.02, 0.60, 0.03), C_DARK, { x: -(BODY_HX + 0.005), y: 0.95, z: 1.44 });
  PC(box(0.05, 0.05, 0.20), C_CHROME, { x: BODY_HX + 0.02, y: 1.10, z: -0.30, rust: 0.4 });
  for (const z of [-0.88, 0.28, 1.44]) {
    P(box(0.02, 0.60, 0.03), C_DARK, { x: BODY_HX + 0.005, y: 0.95, z });
  }

  /* ------------------------------------------------------- the door itself -- */
  // Everything here is DOOR-LOCAL. It reads as a door from any angle because it has the
  // three things a door has and a panel does not: thickness, a window frame above the
  // waist, and a handle that catches the moon on the outside face.
  PD(box(SKIN, 0.56, AP_Z1 - AP_Z0), C_PAINT,
    { x: dx_(-(BODY_HX - SKIN * 0.5)), y: 0.96, z: dz_((AP_Z0 + AP_Z1) * 0.5), rust: 0.85 });
  // the inner card. Pale leather ON PURPOSE (0.072 linear against the shell's 0.150 is
  // still darker than the paint) because this is the face the cabin glow lands on, and a
  // black card would swallow the one warm thing on the whole prop.
  PD(box(0.035, 0.48, 1.14), C_LEATHER,
    { x: dx_(-(CORE_HX + 0.005)), y: 0.99, z: dz_((AP_Z0 + AP_Z1) * 0.5), rust: 0.12 });
  // window frame: a U above the waist. Empty — the glass is wound down, which is why the
  // frame never doubles the greenhouse's own dark pane when the door swings out.
  PD(box(0.05, 0.05, 1.20), C_GLASSFRAME, { x: dx_(-0.895), y: 1.745, z: dz_(-0.31), rust: 0.5 });
  PD(box(0.05, 0.52, 0.06), C_GLASSFRAME, { x: dx_(-0.895), y: 1.50, z: dz_(AP_Z1 - 0.045), rust: 0.5 });
  PD(box(0.05, 0.52, 0.06), C_GLASSFRAME, { x: dx_(-0.895), y: 1.50, z: dz_(AP_Z0 + 0.035), rust: 0.5 });
  // the handle, and the door's own segment of the chrome strip
  PDC(box(0.05, 0.05, 0.20), C_CHROME, { x: dx_(-(BODY_HX + 0.02)), y: 1.10, z: dz_(-0.30), rust: 0.4 });
  PDC(box(0.05, 0.110, AP_Z1 - AP_Z0), C_CHROME,
    { x: dx_(-(BODY_HX + 0.022)), y: 0.965, z: dz_((AP_Z0 + AP_Z1) * 0.5), rz: -MOULD_TILT, rust: 0.30 });
  // THE LIGHT ON INSIDE. A courtesy strip along the top of the door card. It is the only
  // warm thing on a parked car and it swings out with the door, so from in front of the
  // car it is a warm horizontal line hanging off the flank in a county with no other warm
  // pixels in it. Emissive only — the census is pinned and this file creates no light.
  PDG(box(0.024, 0.05, 1.06), [0.055, 0.040, 0.026],
    { x: dx_(-(CORE_HX - 0.008)), y: 1.215, z: dz_((AP_Z0 + AP_Z1) * 0.5) });
  // and the same glow on the doorway sill, which is what you see straight THROUGH the hole
  PSG(box(0.03, 0.045, AP_Z1 - AP_Z0 - 0.06), [0.055, 0.040, 0.026],
    { x: -(CORE_HX + 0.030), y: AP_Y0 + 0.045, z: (AP_Z0 + AP_Z1) * 0.5 });

  const interiorParts = [];
  const PI = (geometry, colour, opts) => interiorParts.push(part(geometry, colour, opts));
  /* --------------------------------------------------- the place you sit --- */
  const S = CFG.car.seat;             // (-0.31, 1.66, -0.50); everything below frames it

  // dash: the top edge sits at 1.31, 0.35 m below the eye, so it fills the bottom of
  // the view the way a dash does instead of being an invisible shelf.
  PI(box(1.66, 0.22, 0.46), C_DARK, { y: 1.20, z: -1.16, rust: 0.15 });
  PI(box(1.66, 0.05, 0.30), C_WOOD, { y: 1.31, z: -1.06, rust: 0.2 });   // capping rail
  // binnacle, right in front of the driver
  PI(box(0.44, 0.16, 0.26), C_DARK, { x: S.x, y: 1.33, z: -1.20 });
  PC(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 12), C_CHROME,
    { x: S.x - 0.10, y: 1.40, z: -1.19, rx: Math.PI * 0.5 });
  PC(new THREE.CylinderGeometry(0.060, 0.060, 0.012, 12), C_CHROME,
    { x: S.x + 0.10, y: 1.41, z: -1.19, rx: Math.PI * 0.5 });

  // column
  PI(new THREE.CylinderGeometry(0.030, 0.030, 0.30, 8), C_DARK,
    { x: S.x, y: 1.30, z: -1.02, rx: 1.20 });
  // gear lever, in the middle where your right hand goes
  PI(new THREE.CylinderGeometry(0.018, 0.022, 0.30, 8), C_DARK, { x: 0.02, y: 1.20, z: -0.72, rx: -0.24 });
  PI(new THREE.SphereGeometry(0.042, 8, 6), C_WOOD, { x: 0.02, y: 1.34, z: -0.75 });

  /* ------------------------------------------------------------- THE SET ---
   * ROUND 14. The dial has to be readable and there are NO WORDS ON SCREEN, so the
   * station is told by a needle on a dashboard — the same grammar as the fuel gauge and
   * the key-cap glyph. A player who presses T and watches a needle step along a scale
   * knows what T does, and nothing had to be written down.
   *
   * The faceplate is merged into the shell. Only the needle moves, so only the needle is
   * its own mesh, exactly like the steering rim above it.
   * ------------------------------------------------------------------------ */
  const SET = { x: 0.055, y: 1.245, z: -.855 };   // mounted on the driver-facing surface
  PI(box(0.40, 0.155, 0.05), C_DARK, { x: SET.x, y: SET.y, z: SET.z + 0.012, rust: 0.1 });
  PC(box(0.42, 0.022, 0.035), C_CHROME, { x: SET.x, y: SET.y + 0.088, z: SET.z + 0.010, rust: 0.25 });
  PC(box(0.42, 0.020, 0.035), C_CHROME, { x: SET.x, y: SET.y - 0.086, z: SET.z + 0.010, rust: 0.3 });
  // the scale: five ticks, so a needle has somewhere to be
  for (let i = 0; i < 5; i++) {
    PC(box(0.011, i % 2 ? 0.030 : 0.046, 0.02), C_CHROME,
      { x: SET.x - 0.152 + i * 0.076, y: SET.y + 0.040, z: SET.z + 0.052, rust: 0.2 });
  }
  // two knobs, because a set with a needle and no knobs is a drawing of a set
  for (const kx of [-0.238, 0.238]) {
    PC(new THREE.CylinderGeometry(0.028, 0.030, 0.030, 10), C_CHROME,
      { x: SET.x + kx, y: SET.y - 0.010, z: SET.z + 0.060, rx: Math.PI * 0.5, rust: 0.35 });
  }
  const RADIO_SWEEP = 0.152;   // half the scale, metres either side of centre
  // The needle itself is built with the other MOVING parts, below, because it needs
  // cabinMat and cabinMat does not exist yet.

  /* ------------------------------------------------- THE CONDITION GAUGE ---
   * ROUND 18. Alex, 2026-09-09: "If there isn't a meter that shows you the car slowly
   * breaking down, there should be one. Actually, have it on the cars dashboard and not
   * on the hud."
   *
   * There WAS one, and it was a line of text in the corner of the screen (ui/readouts.js
   * printed "CAR CONDITION 84%"). That line is gone, so this is now the only place that
   * number lives and it has to be legible or the feature is lost.
   *
   * IT IS ON THE RADIO'S PLANE, NOT ON THE BINNACLE. The first cut put it on the left of
   * the two chrome discs in front of the driver, which seemed obvious — they were already
   * there with nothing on them. But those discs sit at y 1.40 inside a binnacle whose top
   * is at 1.41, so two thirds of each is BURIED and only a crescent shows above the
   * casing. Photographed at wear 0.00 and 0.95, the two frames were pixel-identical:
   * the needle swept 4.21 radians entirely inside the dashboard. This is the same
   * dash face the radio set is on, twenty centimetres to the driver's side of it, and the
   * radio needle is the proof that a moving pointer there can be read from the seat.
   *
   * The face and the ticks merge into the shell. Only the needle moves.
   */
  const GAUGE = { x: SET.x - 0.375, y: SET.y + 0.012, z: SET.z + 0.014 };
  const GAUGE_R = 0.070;
  PI(new THREE.CylinderGeometry(GAUGE_R + 0.012, GAUGE_R + 0.012, 0.030, 16), C_DARK,
    { x: GAUGE.x, y: GAUGE.y, z: GAUGE.z - 0.008, rx: Math.PI * 0.5, rust: 0.2 });
  PC(new THREE.TorusGeometry(GAUGE_R + 0.008, 0.008, 5, 14), C_CHROME,
    { x: GAUGE.x, y: GAUGE.y, z: GAUGE.z + 0.006, rust: 0.3 });
  PI(new THREE.CylinderGeometry(GAUGE_R, GAUGE_R, 0.006, 16), [0.020, 0.019, 0.017],
    { x: GAUGE.x, y: GAUGE.y, z: GAUGE.z + 0.004, rx: Math.PI * 0.5 });
  // Nine ticks over 240 degrees, the long ones at the ends and the middle. The empty end is
  // on the LEFT, where every gauge in every car the player has ever seen puts it, so nothing
  // has to be explained. The first two are red: that is the whole of "it is breaking down".
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 1.17 - (i / 8) * Math.PI * 1.34;
    const long = i === 0 || i === 4 || i === 8;
    const rr = GAUGE_R - (long ? 0.020 : 0.012) * 0.5 - 0.004;
    PC(box(long ? 0.009 : 0.006, long ? 0.020 : 0.012, 0.006),
      i < 2 ? [0.62, 0.13, 0.07] : C_CHROME,
      { x: GAUGE.x + Math.cos(a) * rr, y: GAUGE.y + Math.sin(a) * rr, z: GAUGE.z + 0.010,
        rz: a - Math.PI * 0.5 });
  }
  const GAUGE_A0 = Math.PI * 1.17;      // needle angle at "wrecked"
  const GAUGE_A1 = Math.PI * -0.17;     // ...and at "as good as it gets"

  // seats: two buckets. The driver's is behind the eye, so you see its bolster edge.
  for (const sx of [S.x, 0.31]) {
    PI(box(0.56, 0.16, 0.52), C_LEATHER, { x: sx, y: 1.10, z: -0.30, rust: 0.1 });
    // ROUND 14: top was 1.67, one centimetre ABOVE the 1.66 eye and half a metre behind it,
    // so looking back was a wall of leather. 1.58 clears the shoulder line.
    PI(box(0.56, 0.46, 0.14), C_LEATHER, { x: sx, y: 1.35, z: 0.00, rx: -0.13, rust: 0.1 });
    PI(box(0.24, 0.14, 0.13), C_LEATHER, { x: sx, y: 1.63, z: 0.03, rust: 0.1 });   // headrest
  }
  // rear bench, glimpsed over your shoulder
  PI(box(1.40, 0.16, 0.48), C_LEATHER, { y: 1.08, z: 1.02, rust: 0.2 });
  PI(box(1.40, 0.34, 0.14), C_LEATHER, { y: 1.28, z: 1.30, rx: -0.10, rust: 0.2 });
  // load bay floor — it is an estate; the back is empty and that is the point
  PI(box(1.52, 0.06, 1.00), C_WOOD, { y: 1.06, z: 1.86, rust: 0.4 });

  // door cards, inside face, either side of you
  for (const sx of [-1, 1]) {
    PI(box(0.05, 0.52, 1.90), C_DARK, { x: sx * 0.84, y: 1.20, z: -0.20, rust: 0.1 });
    PC(box(0.09, 0.05, 0.34), C_CHROME, { x: sx * 0.79, y: 1.28, z: -0.62 });   // pull
  }
  // floor pan, so a downward look is not a hole into the terrain
  PI(box(1.62, 0.05, 3.20), C_DARK, { y: 1.00, z: 0.20 });

  // PROGRAM BUDGET (audit). The dead lamp never moves and never lights, so it has no
  // business owning a material: it is a dark lens, which is exactly what a vertex colour
  // on the shell is for. Folding it in removes a material AND a draw call.
  const deadLens = new THREE.SphereGeometry(0.115, 10, 8);
  deadLens.scale(1, 1, 0.6);
  P(deadLens, C_DARK, { x: LAMP_DEAD.x, y: LAMP_DEAD.y, z: LAMP_DEAD.z, rust: 0.6 });

  /* ------------------------------------------------------------ the merge -- */
  // Assert the attribute sets match BEFORE merging: mergeGeometries returns null on a
  // mismatch and a null geometry is a silent invisible car, which is exactly the
  // working-but-illegible failure this project keeps hitting.
  const keys0 = Object.keys(parts[0].attributes).sort().join(',');
  for (let i = 1; i < parts.length; i++) {
    const k = Object.keys(parts[i].attributes).sort().join(',');
    if (k !== keys0) throw new Error('carbody: attribute mismatch on part ' + i + ' (' + k + ' vs ' + keys0 + ')');
  }
  const shellGeo = mergeGeometries(parts, false);
  for (let i = 0; i < parts.length; i++) parts[i].dispose();
  if (!shellGeo) throw new Error('carbody: mergeGeometries returned null');
  shellGeo.computeBoundingSphere();

  // Exterior paint; cabin trim below shares its feature set with matte uniforms.
  const bodyMat = new THREE.MeshStandardMaterial({
    vertexColors: true,               // safe: every part above carries `color`
    roughness: 0.68,                  // worn paint with a broad wet highlight on rounded edges
    metalness: 0.08,                  // between the old shell 0.88/0.10 and wheel 0.95/0.05
    fog: true,
  });
  bodyMat.name = 'curfew-car';
  const shell = new THREE.Mesh(shellGeo, bodyMat);
  shell.castShadow = true;
  shell.receiveShadow = true;
  shell.name = 'car-shell';
  root.add(shell);

  // Worn exterior paint can carry a wet highlight; wood, leather and rubber inside
  // stay matte so their broad reflections do not compete with the road ahead.
  const interiorGeo = mergeGeometries(interiorParts, false);
  for (const geometry of interiorParts) geometry.dispose();
  const interiorMat = bodyMat.clone();
  interiorMat.name = 'curfew-car-interior';
  interiorMat.roughness = .98; interiorMat.metalness = 0;
  const interior = new THREE.Mesh(interiorGeo, interiorMat);
  interior.name = 'car-interior'; interior.castShadow = true; interior.receiveShadow = true;
  root.add(interior);


  /* --------------------------------------------------------------- chrome -- */
  // ART.md 7.1: "A car in a black field is found by the one hard streak the moon puts on
  // its bumper, and there is currently no surface in the county that can produce one."
  // Measured on the pinned frame (car at -1267,-441, camera abeam on the moon's side at
  // 40 m, torch off): before this landed, the largest contiguous run above shell-mean + 25
  // was **30 px** against a gate of 40, and that 30 was the roof plate's edge, not chrome.
  // After: **110 px**, and it holds 18-110 px across 50 degrees of camera swing either way.
  // On the shadow flank, and in the pines where the car is occluded, the same measurement
  // gave 0-11 px at every material setting — which is how the first three runs concluded
  // the highlight was impossible. It was the staging that was wrong. See docs/HANDOFF.md.
  //
  // AND IT COSTS NO SHADER PROGRAM, which is the whole reason the previous round's
  // seven-to-four fold is not being undone here. Three's program cache key is built from
  // the material's FEATURE set — vertexColors, fog, maps, lights, precision — and never
  // from a uniform's value. `roughness` and `metalness` are uniforms. So this fifth
  // material lands in the same program as bodyMat, and the measured program count is
  // unchanged at 71 against CFG.render.budget.programsMax 72. It costs ONE draw call and
  // 220-odd triangles. (If a later round adds a map to either material that stops being
  // true, because a map IS a define. Re-measure `renderer.info.programs.length` if you do.)
  //
  // castShadow is deliberately FALSE. The shell behind it already casts, a bumper's own
  // shadow is three pixels at any distance a player reads the car from, and the shadow
  // pass is a second draw call against the budget in ART.md H.4 gate 17.
  const chromeGeo = mergeGeometries(chromeParts, false);
  for (let i = 0; i < chromeParts.length; i++) chromeParts[i].dispose();
  if (!chromeGeo) throw new Error('carbody: chrome merge returned null');
  const chromeMat = new THREE.MeshStandardMaterial({
    vertexColors: true,               // same program family as bodyMat, on purpose
    // ART.md 7.1 asks for roughness 0.22. MEASURED, and the document loses to the
    // measurement (its own rule): at 0.22 the flat moulding facet concentrates the moon's
    // whole specular lobe and clips at 254.9, which puts it over CFG.render.bloom.threshold
    // (1.05) and blooms a halo over 9,466 pixels — 10x the car's own 930-pixel silhouette.
    // A car bumper that BLOOMS reads as a light source, and in this game the one lit lamp
    // coming down a road is a signal the player has to be able to trust. ART.md 0.6 #2 says
    // it outright: only true emissives bloom.
    //
    // Sweep at this exact frame (moon-side, abeam, 40 m), metalness 0.88, real chrome albedo:
    //     rough 0.22  peak 254.9  mask 9466 (bloomed)  run 458
    //     rough 0.40  peak 253.2  mask  945            run  88
    //     rough 0.50  peak 212.8  mask  942            run  90
    //     rough 0.62  peak 145.4  mask  943            run  92   <- shipped
    //     rough 0.75  peak  89.2  mask  930            run 102
    // 0.62 is the first value whose peak clears the whole-frame gate of 160 (ART.md H.4
    // gate 10) with the chrome at its real albedo instead of a fudged-dark one.
    //
    // And the streak stays HARD at 0.62, which is the part worth understanding: the edge of
    // the streak is the edge of the FACET, not the edge of the lobe. Roughness sets how
    // bright the streak is and how far off-axis it survives; the geometry sets its shape.
    // Half a century in a field is also what chrome actually looks like.
    roughness: 0.62,
    metalness: 0.88,                  // ART.md 7.1, unchanged: F0 is the chrome colour, and
                                      // that is what makes the streak cold and hard-edged
    fog: true,
  });
  chromeMat.name = 'curfew-car-chrome';
  const chrome = new THREE.Mesh(chromeGeo, chromeMat);
  chrome.castShadow = false;
  chrome.receiveShadow = true;
  chrome.name = 'car-chrome';
  root.add(chrome);

  /* ----------------------------------------------------------- the cabin --- */
  // ONE material for both glow strips, and it lands in bodyMat's program: Standard +
  // vertexColors + fog, differing only by `emissive` and `emissiveIntensity`, which are
  // uniforms and not defines (the same argument tailMat has always run on). Measured
  // below with tools/programs.mjs; if a later round puts a MAP on it that stops being
  // true. `emissiveIntensity` starts at 0 — car.js owns when the light is on.
  const cabinMat = new THREE.MeshStandardMaterial({
    vertexColors: true, emissive: 0xffc27a, emissiveIntensity: 0.0, roughness: 0.55, fog: true,
  });
  cabinMat.name = 'curfew-car-cabin';

  /* ------------------------------------------------------------- the door -- */
  // A Group whose origin IS the hinge, so `door.rotation.y` is the only thing that ever
  // moves and car.js interpolates one scalar. Negative y opens it: rotY sends a point at
  // +z out to +x, and the driver's side is -x.
  const door = new THREE.Group();
  door.name = 'car-door';
  door.position.set(DOOR_HINGE.x, DOOR_HINGE.y, DOOR_HINGE.z);
  door.rotation.order = 'YXZ';

  const doorGeo = mergeGeometries(doorParts, false);
  for (let i = 0; i < doorParts.length; i++) doorParts[i].dispose();
  if (!doorGeo) throw new Error('carbody: door merge returned null');
  const doorMesh = new THREE.Mesh(doorGeo, bodyMat);
  doorMesh.castShadow = true;          // an open door casts a shape on the ground, which is
  doorMesh.receiveShadow = true;       // half of how you read that it is open at all
  doorMesh.name = 'car-door-panel';
  door.add(doorMesh);

  const doorChromeGeo = mergeGeometries(doorChromeParts, false);
  for (let i = 0; i < doorChromeParts.length; i++) doorChromeParts[i].dispose();
  if (!doorChromeGeo) throw new Error('carbody: door chrome merge returned null');
  const doorChrome = new THREE.Mesh(doorChromeGeo, chromeMat);
  doorChrome.castShadow = false;
  doorChrome.receiveShadow = true;
  doorChrome.name = 'car-door-chrome';
  door.add(doorChrome);

  const glowGeo = mergeGeometries(glowParts, false);
  for (let i = 0; i < glowParts.length; i++) glowParts[i].dispose();
  if (!glowGeo) throw new Error('carbody: door glow merge returned null');
  const doorGlow = new THREE.Mesh(glowGeo, cabinMat);
  doorGlow.name = 'car-door-glow';
  door.add(doorGlow);
  root.add(door);

  const sillGlowGeo = mergeGeometries(sillGlowParts, false);
  for (let i = 0; i < sillGlowParts.length; i++) sillGlowParts[i].dispose();
  if (!sillGlowGeo) throw new Error('carbody: sill glow merge returned null');
  const sillGlow = new THREE.Mesh(sillGlowGeo, cabinMat);
  sillGlow.name = 'car-sill-glow';
  root.add(sillGlow);

  /* ------------------------------------------------------------- windows --- */
  // One mesh, one material, both sides, no depth write: the glass is a haze you look
  // THROUGH, and at night that is all glass is. Not a mirror — no second render.
  const glassParts = [];
  const gp = (geo, o) => { glassParts.push(part(geo, [0.020, 0.024, 0.028], Object.assign({ seed }, o))); };
  gp(new THREE.PlaneGeometry(1.60, 0.78), { y: 1.56, z: -1.02, rx: -0.34 });                    // windscreen
  gp(new THREE.PlaneGeometry(1.60, 0.70), { y: 1.57, z: 1.86, rx: 0.22 });                      // tailgate
  gp(new THREE.PlaneGeometry(1.12, 0.60), { x: -0.87, y: 1.58, z: -0.34, ry: Math.PI * 0.5 });  // front sides
  gp(new THREE.PlaneGeometry(1.12, 0.60), { x: 0.87, y: 1.58, z: -0.34, ry: Math.PI * 0.5 });
  gp(new THREE.PlaneGeometry(1.28, 0.60), { x: -0.87, y: 1.58, z: 1.06, ry: Math.PI * 0.5 });   // rear sides
  gp(new THREE.PlaneGeometry(1.28, 0.60), { x: 0.87, y: 1.58, z: 1.06, ry: Math.PI * 0.5 });
  const glassGeo = mergeGeometries(glassParts, false);
  for (let i = 0; i < glassParts.length; i++) glassParts[i].dispose();
  // ROUND 14. At opacity 0.30 on 0x0b1014 the glass was invisible, so the cabin read as a
  // ROLL CAGE — bare pillars with holes between them — from every angle outside the car.
  // Glass at night is not nothing: it is a dark sheet that takes a little of the sky. This
  // is still something you see through (the residents inside a car are the point), just
  // present enough that the greenhouse reads as enclosed.
  const glassMat = new THREE.MeshBasicMaterial({
    color: 0x141c22, transparent: true, opacity: 0.46,
    depthWrite: false, side: THREE.DoubleSide, fog: true,
  });
  glassMat.name = 'curfew-car-glass';
  const glass = glassGeo ? new THREE.Mesh(glassGeo, glassMat) : null;
  if (glass) { glass.renderOrder = 2; glass.name = 'car-glass'; root.add(glass); }

  /* -------------------------------------------------------------- wheels --- */
  // ONE InstancedMesh: four wheels, one draw. They steer (fronts) and spin (all four),
  // which is the single cheapest thing that makes a car look alive rather than slid.
  // ROUND 14. These were a 14-segment disc with a bar across it, which is exactly what
  // they looked like: cardboard circles bolted to the sides. A real wheel is a TYRE with
  // a shoulder, a rim set INSIDE it, and a hub — three diameters, not one. 24 segments,
  // because at 2 m from the driver's door a 14-gon reads as a polygon.
  const WSEG = 24;
  const tyre = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W * 0.82, WSEG, 1);
  tyre.rotateZ(Math.PI * 0.5);        // axis along local X
  // the shoulders: a slightly smaller diameter at each outer face, so the tread is a band
  const shoulderL = new THREE.CylinderGeometry(WHEEL_R * 0.965, WHEEL_R * 0.965, WHEEL_W, WSEG, 1);
  shoulderL.rotateZ(Math.PI * 0.5);
  // the rim, dished in from the tyre face; then the hub cap proud of it
  const rimDisc = new THREE.CylinderGeometry(WHEEL_R * 0.66, WHEEL_R * 0.66, WHEEL_W * 0.30, WSEG, 1);
  rimDisc.rotateZ(Math.PI * 0.5);
  const hub = new THREE.CylinderGeometry(WHEEL_R * 0.30, WHEEL_R * 0.26, WHEEL_W * 0.34, 12, 1);
  hub.rotateZ(Math.PI * 0.5);
  const wheelParts = [
    part(tyre, C_RUBBER, { seed, rust: 0 }),
    part(shoulderL, C_RUBBER, { seed, rust: 0 }),
    part(rimDisc, [0.088, 0.086, 0.082], { seed, rust: 0.75 }),
    part(hub, C_CHROME, { seed, rust: 0.7 }),
  ];
  // five wheel nuts on the outer face — the detail that says "wheel" at arm's length
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    wheelParts.push(part(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 6), C_CHROME, {
      seed, rust: 0.8, rz: Math.PI * 0.5,
      x: WHEEL_W * 0.30, y: Math.sin(a) * WHEEL_R * 0.44, z: Math.cos(a) * WHEEL_R * 0.44,
    }));
  }
  const wheelGeo = mergeGeometries(wheelParts, false);
  for (let i = 0; i < wheelParts.length; i++) wheelParts[i].dispose();
  // Same material as the shell: rubber and rusted chrome are already told apart by the
  // vertex colours above, so a second config bought nothing but a program.
  const wheels = new THREE.InstancedMesh(wheelGeo, bodyMat, 4);
  wheels.castShadow = true;
  wheels.receiveShadow = false;
  wheels.name = 'car-wheels';
  wheels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(wheels);

  /* ------------------------------------------------------- steering rim ---- */
  const steer = new THREE.Group();
  steer.position.set(S.x, 1.36, -1.08);
  steer.rotation.x = 1.16;            // laid back the way a wheel on a column is
  // Rim and spoke bar merged into one geometry on the body material: the dark trim is a
  // vertex colour, not a third material. One draw, one program, and the steer group
  // still rotates as a whole so car.js's `body.steer.rotation.z` is unchanged.
  const rimParts = [
    part(new THREE.TorusGeometry(0.175, 0.020, 6, 20), C_DARK, { seed }),
    part(box(0.32, 0.016, 0.020), C_DARK, { seed }),
  ];
  const steerGeo = mergeGeometries(rimParts, false);
  for (let i = 0; i < rimParts.length; i++) rimParts[i].dispose();
  if (!steerGeo) throw new Error('carbody: steering merge returned null');
  const rim = new THREE.Mesh(steerGeo, interiorMat);
  rim.name = 'car-steer';
  steer.add(rim);
  root.add(steer);

  /* ------------------------------------------------------- the radio needle -- */
  // On cabinMat: the needle is lit from inside the set, the way a dial is, so it can be
  // found in a black cabin without adding a light to the pinned census (CONTRACT).
  const radioNeedle = new THREE.Group();
  radioNeedle.position.set(SET.x, SET.y + 0.012, SET.z + 0.067);
  const radioMat=cabinMat.clone();radioMat.name='car-radio-dial';radioMat.emissiveIntensity=.24;
  const radioDialGeo=part(box(.34,.095,.008),[.028,.065,.047],{seed,x:SET.x,y:SET.y+.012,z:SET.z+.045});
  const radioDial=new THREE.Mesh(radioDialGeo,radioMat);radioDial.name='car-radio-dial';root.add(radioDial);
  {
    const nParts = [part(box(0.013, 0.098, 0.013), [0.62, 0.30, 0.10], { seed })];
    const nGeo = mergeGeometries(nParts, false);
    for (let i = 0; i < nParts.length; i++) nParts[i].dispose();
    if (nGeo) {
      const nm = new THREE.Mesh(nGeo, radioMat);
      nm.name = 'car-radio-needle';
      radioNeedle.add(nm);
    }
  }
  root.add(radioNeedle);

  /* ---------------------------------------------------- the condition needle -- */
  // On radioMat, which is cabinMat's clone with a small emissive: the needle is lit from
  // inside the dial, so the gauge can be read in a black cabin without adding a light to
  // the pinned census (CONTRACT). Pivot at the dial's centre; the needle geometry runs UP
  // from the pivot so a rotation about Z sweeps it round the face.
  //
  // MEASURED AND REBUILT ONCE. The first cut was 7.5 mm wide, vertex-coloured [0.70,0.24,0.10]
  // and shared the radio's material at emissiveIntensity 0.24. tools/dash-check.mjs said
  // every number about it was right — it was in the scene, it was visible, its rotation swept
  // 4.21 rad monotonically across the whole range of wear — and the PHOTOGRAPHS at wear 0.0
  // and 0.95 were identical. A gauge you cannot see is not a gauge, and this is exactly the
  // failure this project keeps hitting: working, animating, and never reaching the screen.
  // So: half again as wide, a pale vertex colour, and its own material at four times the
  // emissive. It is a clone of the same base as the radio dial, so it shares that program
  // and costs no compile.
  const condMat = cabinMat.clone();
  condMat.name = 'car-condition-dial';
  condMat.emissive = new THREE.Color(0xffb066);
  condMat.emissiveIntensity = 1.05;
  const condNeedle = new THREE.Group();
  condNeedle.position.set(GAUGE.x, GAUGE.y, GAUGE.z + 0.017);
  {
    const nParts = [
      part(box(0.011, GAUGE_R * 0.88, 0.007), [0.95, 0.62, 0.34],
        { seed, y: GAUGE_R * 0.44 }),
      // the counterweight tail, so the needle is pinned at a hub rather than growing out of
      // the middle of the face
      part(box(0.009, GAUGE_R * 0.24, 0.006), [0.72, 0.42, 0.22],
        { seed, y: -GAUGE_R * 0.12 }),
      part(new THREE.CylinderGeometry(0.010, 0.010, 0.008, 8), [0.55, 0.50, 0.46],
        { seed, rx: Math.PI * 0.5 }),
    ];
    const nGeo = mergeGeometries(nParts, false);
    for (let i = 0; i < nParts.length; i++) nParts[i].dispose();
    if (nGeo) {
      const nm = new THREE.Mesh(nGeo, condMat);
      nm.name = 'car-condition-needle';
      condNeedle.add(nm);
    }
  }
  // Straight up is halfway; setCondition() puts it where the wear says.
  condNeedle.rotation.z = 0;
  root.add(condNeedle);

  /* --------------------------------------------------------------- lamps --- */
  // One works, one does not. That asymmetry is the whole read at 200 m: a single light
  // coming down a road is not a car, it is a QUESTION, and that is the beat.
  // The dead one is merged into the shell above — it is a dark lens, and a dark lens is
  // a vertex colour. Only the WORKING lamp needs a material, because only it emits.
  // vertexColors is on so this shares the body's shader program: emissive is a uniform,
  // not a define, so the two differ by a colour and not by a compile.
  const lensSrc = new THREE.SphereGeometry(0.115, 10, 8);
  lensSrc.scale(1, 1, 0.6);           // baked, not a mesh scale: the pose is in the geometry
  const lensGeo = part(lensSrc, [0.020, 0.017, 0.013],
    { seed, x: LAMP_GOOD.x, y: LAMP_GOOD.y, z: LAMP_GOOD.z });
  const lampMat = new THREE.MeshStandardMaterial({
    vertexColors: true, emissive: 0xffd9a4, emissiveIntensity: 0.0, roughness: 0.28, fog: true,
  });
  lampMat.name = 'curfew-car-lamp';
  const lampGood = new THREE.Mesh(lensGeo, lampMat);
  lampGood.name = 'car-lamp-good';
  root.add(lampGood);
  const repairedGeo=lensGeo.clone();
  repairedGeo.translate(LAMP_DEAD.x-LAMP_GOOD.x,LAMP_DEAD.y-LAMP_GOOD.y,LAMP_DEAD.z-LAMP_GOOD.z-.012);
  const repairedMat=lampMat.clone();repairedMat.name='car-repaired-headlamp';
  const lampDead=new THREE.Mesh(repairedGeo,repairedMat);lampDead.name='car-repaired-headlamp';root.add(lampDead);
  let fullyRepaired=false;

  // Tail lamps: the thing you see in the mirror of your own car and the thing a hound
  // stands beside. Dim red, always on when the electrics are. Both in one geometry —
  // and they keep their own material because an emissive COLOUR cannot be carried per
  // vertex, and red-behind / amber-ahead is the whole read of a car at distance.
  const tailParts = [
    part(box(0.28, 0.14, 0.06), [0.030, 0.010, 0.008], { seed, x: -0.72, y: 1.06, z: TAIL_Z - 0.02 }),
    part(box(0.28, 0.14, 0.06), [0.030, 0.010, 0.008], { seed, x: 0.72, y: 1.06, z: TAIL_Z - 0.02 }),
  ];
  const tailGeo = mergeGeometries(tailParts, false);
  for (let i = 0; i < tailParts.length; i++) tailParts[i].dispose();
  if (!tailGeo) throw new Error('carbody: tail merge returned null');
  const tailMat = new THREE.MeshStandardMaterial({
    vertexColors: true, emissive: 0xff2412, emissiveIntensity: 0.0, roughness: 0.4, fog: true,
  });
  tailMat.name = 'curfew-car-tail';
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.name = 'car-tails';
  root.add(tail);

  let tris = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const c = g.index ? g.index.count : g.attributes.position.count;
    tris += (c / 3) * (o.isInstancedMesh ? o.count : 1);
  });

  return {
    root, wheels, steer, lampGood, radio:radioNeedle,
    doorGroup: door,
    lampDead,
    // Shared material programs; the dial and restored lamp vary their emissive uniforms.
    materials: [bodyMat, chromeMat, glassMat, lampMat, repairedMat, tailMat, cabinMat, interiorMat, radioMat, condMat],
    tris: Math.round(tris),
    roofY: ROOF_Y,
    door: DOOR,
    hinge: DOOR_HINGE,
    openMax: DOOR_OPEN_MAX,
    lampOffsets: { good: LAMP_GOOD, dead: LAMP_DEAD },

    /**
     * Electrics. `head` 0..1 is the working headlamp's filament, `tailOn` the rears.
     * Emissive intensity only — NEVER a light. The census is pinned (CONTRACT).
     */
    setLamp(head, tailOn) {
      lampMat.emissiveIntensity = head * 2.4;
      repairedMat.emissiveIntensity=fullyRepaired?head*2.4:0;
      tailMat.emissiveIntensity = tailOn ? 0.85 : 0.0;
    },
    setRepaired(on){fullyRepaired=!!on;repairedMat.emissiveIntensity=fullyRepaired?lampMat.emissiveIntensity:0;},

    /**
     * The physical dial moves with T; looking at the set also shows its focused prompt.
     */
    setRadioDial(t) {
      radioNeedle.position.x = SET.x + (clamp01(t) * 2 - 1) * RADIO_SWEEP;
    },

    /**
     * ROUND 18. The condition gauge on the binnacle, 0 = wrecked .. 1 = as good as this car
     * gets. car.js hands it `1 - wear` every frame it draws the body. The needle sits UP at
     * zero rotation, so the angle it wants is measured off vertical: a full sweep of
     * GAUGE_A0..GAUGE_A1 rotated a quarter turn back.
     */
    setCondition(t) {
      const k = clamp01(t);
      const a = GAUGE_A0 + (GAUGE_A1 - GAUGE_A0) * k;
      condNeedle.rotation.z = a - Math.PI * 0.5;
    },

    /**
     * THE DOOR, 0 shut .. 1 wide open. One scalar, because car.js interpolates it between
     * fixed steps and a pose with two of anything in it is a pose that can disagree
     * with itself.
     */
    setDoor(t) {
      door.rotation.y = -clamp01(t) * DOOR_OPEN_MAX;
    },

    /**
     * The courtesy light, 0..1. Deliberately weak at the top end: 1.35 puts the strip at
     * roughly 120 on the 0-255 frame, which is bright enough to be the one warm thing in
     * the county and short of the 150 that ART.md 0.3 row 12 reserves for lamps and
     * glints. It is the only thing on a cold parked car that says "still here".
     */
    setCabin(level) {
      cabinMat.emissiveIntensity = clamp01(level) * 1.35;
    },

    dispose() {
      shellGeo.dispose();
      chromeGeo.dispose();
      doorGeo.dispose();
      doorChromeGeo.dispose();
      glowGeo.dispose();
      sillGlowGeo.dispose();
      if (glass) glass.geometry.dispose();
      wheelGeo.dispose();
      steerGeo.dispose();
      lensGeo.dispose();
      repairedGeo.dispose();repairedMat.dispose();
      tailGeo.dispose();
      bodyMat.dispose(); interiorMat.dispose(); interiorGeo.dispose(); chromeMat.dispose(); glassMat.dispose();
      lampMat.dispose(); tailMat.dispose(); cabinMat.dispose();radioDialGeo.dispose();radioMat.dispose();
      radioNeedle.traverse(o=>o.geometry?.dispose());condMat.dispose();
      condNeedle.traverse(o=>o.geometry?.dispose());
      if (root.parent) root.parent.remove(root);
    },
  };
}

/* ==========================================================================
   DEBRIS — ROUND 7, lane F. What comes off a fence when you drive through it.

   Alex asked to be able to crush things with the car. A collider that quietly disappears
   is the exact failure this project keeps shipping: it works, and nothing reaches the
   screen. So a crush throws real geometry.

   ONE merged geometry, ONE mesh, ONE draw call, and NO NEW MATERIAL — car.js hands this
   the places lane's own body material, which already exists and already has a program, so
   the light census and the program budget are both untouched (AGENTS.md). Every piece is a
   little box; car.js writes its vertices each frame from a position and a rotation. The
   pieces are UNIT-SPACE here and world-space there, which is why the base arrays come back
   out with the geometry: the sim never allocates.

   `pieces` boxes, each 24 vertices (a BoxGeometry is indexed: 24 verts, 36 indices), so
   16 pieces is 384 vertices. Rewriting all of them every frame is nothing.
   ========================================================================== */
export const DEBRIS_VERTS = 24;

export function buildDebrisGeometry(pieces) {
  const n = Math.max(1, pieces | 0);
  const geos = [];
  for (let i = 0; i < n; i++) {
    // A spread of shapes: planks, blocks and splinters, so a smashed thing does not read
    // as a bag of identical dice.
    const t = i / n;
    // Kept small on purpose: a piece is thrown 1-3 m in front of the camera, where a 0.8 m
    // slab fills a third of the frame and reads as a door, not as a splinter. Photographed
    // at tests/shots/f-crush-debris.png before this was trimmed.
    const w = 0.09 + (i % 3) * 0.10;
    const h = 0.05 + ((i * 7) % 5) * 0.035;
    const d = 0.09 + ((i * 5) % 4) * 0.10 + t * 0.12;
    const g = new THREE.BoxGeometry(w, h, d);
    const p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (let v = 0; v < p.count; v++) { c[v * 3] = 0.14; c[v * 3 + 1] = 0.13; c[v * 3 + 2] = 0.12; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    geos.push(g);
  }
  const geo = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  // The rest pose, kept so every frame can rebuild from it instead of accumulating drift.
  const src = geo.attributes.position.array;
  const srcN = geo.attributes.normal.array;
  const base = new Float32Array(src.length);
  base.set(src);
  const baseN = new Float32Array(srcN.length);
  baseN.set(srcN);
  // Nothing culls it: the pieces move far from wherever the bounding sphere was computed.
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1e6);
  return { geo, base, baseN, pieces: n, per: DEBRIS_VERTS };
}

export default buildCarBody;
