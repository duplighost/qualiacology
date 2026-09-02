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
// FLORA DISCIPLINE (world/flora.js:382, :759 — mergeGeometries, one material, no
// per-prop material): the whole static shell is ONE merged geometry with ONE
// MeshStandardMaterial and vertexColors, so paint / rust / chrome / leather cost one
// draw between them. Only the things that MOVE are separate: the four wheels (one
// InstancedMesh), the steering rim, the working lamp, the glass.
//
// FIVE MATERIALS, THREE PROGRAMS (audit 2026-09-02; ART.md 7.1, same day). Three bakes
// every distinct material CONFIG into its own shader program, and the budget for those is
// ONE number that lives in CFG.render.budget.programsMax — nothing here restates it, because
// four files used to restate it four different ways and none of them agreed with config. A
// prop that spent seven programs was spending a budget it does not own.
//
// The fold that took this file from seven configs to four still stands and must not be
// undone. What matters is not the material COUNT but the program count, and those are
// different numbers: Three's program cache key is built from the FEATURE set (vertexColors,
// fog, maps, lights, precision) and never from a uniform's value. roughness, metalness and
// emissive are uniforms. So:
//   `bodyMat`   Standard + vertexColors — shell, wheels, steering rim, dead lamp
//   `chromeMat` Standard + vertexColors, roughness 0.62 / metalness 0.88 — ART.md 7.1's
//               one highlight: the flank moulding, bumpers, grille bars, handles, bezels
//   `lampMat` / `tailMat`  Standard + vertexColors, emissive amber and emissive red
// — those four are ONE program between them. Plus `glassMat` (Basic, the only transparent
// thing) and the shadow-depth variant. Measured: adding chromeMat left
// renderer.info.programs.length unchanged. If a later round puts a MAP on any of them that
// stops being true, because a map IS a define. Re-measure if you do.
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
export const DOOR = Object.freeze({ x: -1.00, y: 1.05, z: -0.30 });   // driver door, local
export const LAMP_GOOD = Object.freeze({ x: -0.66, y: 1.02, z: NOSE_Z - 0.04 });
export const LAMP_DEAD = Object.freeze({ x: 0.66, y: 1.02, z: NOSE_Z - 0.04 });
export const WHEEL_RADIUS = WHEEL_R;
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
const C_PAINT = [0.150, 0.143, 0.126];
const C_PAINT_LO = [0.098, 0.092, 0.082];   // lower panels, dirt-shadowed
const C_RUST = [0.115, 0.052, 0.026];
const C_RUST_HOT = [0.148, 0.070, 0.031];
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

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

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
  P(box(BODY_HX * 2, 0.62, 4.10), C_PAINT, { y: 0.93, z: 0.02, rust: 0.85 });
  // rocker panels — the rustiest thing on any car left in a field
  P(box(BODY_HX * 2 + 0.04, 0.20, 3.60), C_PAINT_LO, { y: 0.68, z: 0.02, rust: 1.0 });
  // bonnet, sloping very slightly down to the nose
  P(box(1.74, 0.16, 1.30), C_PAINT, { y: 1.20, z: -1.52, rx: 0.030, rust: 0.75 });
  // greenhouse: the estate car's long roof box. 1.24 -> 1.90.
  P(box(1.74, 0.66, 2.86), C_GLASSFRAME, { y: 1.57, z: 0.42, rust: 0.30 });
  // roof plate — this is the mantle target and it must catch the moon
  P(box(1.70, 0.09, 2.90), C_PAINT, { y: ROOF_Y - 0.045, z: 0.42, rust: 0.55 });
  // roof rails: the two lines that make it read as an estate at distance
  P(box(0.07, 0.07, 2.55), C_DARK, { x: -0.62, y: ROOF_Y + 0.05, z: 0.42, rust: 0.4 });
  P(box(0.07, 0.07, 2.55), C_DARK, { x: 0.62, y: ROOF_Y + 0.05, z: 0.42, rust: 0.4 });

  // pillars. A (raked), B (upright, at the door shut), D (tailgate). Thin, dark, and
  // they are what stops the greenhouse reading as a solid block.
  P(box(0.09, 0.74, 0.10), C_GLASSFRAME, { x: -0.85, y: 1.57, z: -0.94, rx: -0.34, rust: 0.4 });
  P(box(0.09, 0.74, 0.10), C_GLASSFRAME, { x: 0.85, y: 1.57, z: -0.94, rx: -0.34, rust: 0.4 });
  P(box(0.09, 0.68, 0.09), C_GLASSFRAME, { x: -0.85, y: 1.57, z: 0.28, rust: 0.4 });
  P(box(0.09, 0.68, 0.09), C_GLASSFRAME, { x: 0.85, y: 1.57, z: 0.28, rust: 0.4 });
  P(box(0.09, 0.68, 0.09), C_GLASSFRAME, { x: -0.85, y: 1.57, z: 1.80, rust: 0.5 });
  P(box(0.09, 0.68, 0.09), C_GLASSFRAME, { x: 0.85, y: 1.57, z: 1.80, rust: 0.5 });

  // wheel arches — four dark crescents. Cheap, and without them the wheels look bolted on.
  for (let i = 0; i < WHEEL_OFFSETS.length; i++) {
    const w = WHEEL_OFFSETS[i];
    P(box(0.10, 0.34, WHEEL_R * 2.30), C_DARK,
      { x: w.x + (w.x < 0 ? -0.06 : 0.06), y: WHEEL_R + 0.36, z: w.z, rust: 0.9 });
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
  for (const sx of [-1, 1]) {
    PC(box(0.05, 0.110, 3.30), C_CHROME,
      { x: sx * (BODY_HX + 0.022), y: 0.965, z: 0.02, rz: sx * MOULD_TILT, rust: 0.30 });
  }

  // door shut lines, cut as recessed dark strips so the doors are legible as doors
  for (const sx of [-1, 1]) {
    P(box(0.02, 0.60, 0.03), C_DARK, { x: sx * (BODY_HX + 0.005), y: 0.95, z: -0.88 });
    P(box(0.02, 0.60, 0.03), C_DARK, { x: sx * (BODY_HX + 0.005), y: 0.95, z: 0.28 });
    P(box(0.02, 0.60, 0.03), C_DARK, { x: sx * (BODY_HX + 0.005), y: 0.95, z: 1.44 });
    // handles
    PC(box(0.05, 0.05, 0.20), C_CHROME, { x: sx * (BODY_HX + 0.02), y: 1.10, z: -0.30, rust: 0.4 });
  }

  /* --------------------------------------------------- the place you sit --- */
  const S = CFG.car.seat;             // (-0.31, 1.66, -0.50); everything below frames it

  // dash: the top edge sits at 1.31, 0.35 m below the eye, so it fills the bottom of
  // the view the way a dash does instead of being an invisible shelf.
  P(box(1.66, 0.22, 0.46), C_DARK, { y: 1.20, z: -1.16, rust: 0.15 });
  P(box(1.66, 0.05, 0.30), C_WOOD, { y: 1.31, z: -1.06, rust: 0.2 });   // capping rail
  // binnacle, right in front of the driver
  P(box(0.44, 0.16, 0.26), C_DARK, { x: S.x, y: 1.33, z: -1.20 });
  PC(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 12), C_CHROME,
    { x: S.x - 0.10, y: 1.40, z: -1.19, rx: Math.PI * 0.5 });
  PC(new THREE.CylinderGeometry(0.060, 0.060, 0.012, 12), C_CHROME,
    { x: S.x + 0.10, y: 1.41, z: -1.19, rx: Math.PI * 0.5 });
  // column
  P(new THREE.CylinderGeometry(0.030, 0.030, 0.30, 8), C_DARK,
    { x: S.x, y: 1.30, z: -1.02, rx: 1.20 });
  // gear lever, in the middle where your right hand goes
  P(new THREE.CylinderGeometry(0.018, 0.022, 0.30, 8), C_DARK, { x: 0.02, y: 1.20, z: -0.72, rx: -0.24 });
  P(new THREE.SphereGeometry(0.042, 8, 6), C_WOOD, { x: 0.02, y: 1.34, z: -0.75 });

  // seats: two buckets. The driver's is behind the eye, so you see its bolster edge.
  for (const sx of [S.x, 0.31]) {
    P(box(0.56, 0.16, 0.52), C_LEATHER, { x: sx, y: 1.10, z: -0.30, rust: 0.1 });
    P(box(0.56, 0.54, 0.14), C_LEATHER, { x: sx, y: 1.40, z: 0.00, rx: -0.13, rust: 0.1 });
    P(box(0.24, 0.16, 0.14), C_LEATHER, { x: sx, y: 1.70, z: 0.03, rust: 0.1 });   // headrest
  }
  // rear bench, glimpsed over your shoulder
  P(box(1.40, 0.16, 0.48), C_LEATHER, { y: 1.08, z: 1.02, rust: 0.2 });
  P(box(1.40, 0.50, 0.14), C_LEATHER, { y: 1.36, z: 1.30, rx: -0.10, rust: 0.2 });
  // load bay floor — it is an estate; the back is empty and that is the point
  P(box(1.52, 0.06, 1.00), C_WOOD, { y: 1.06, z: 1.86, rust: 0.4 });

  // door cards, inside face, either side of you
  for (const sx of [-1, 1]) {
    P(box(0.05, 0.52, 1.90), C_DARK, { x: sx * 0.84, y: 1.20, z: -0.20, rust: 0.1 });
    PC(box(0.09, 0.05, 0.34), C_CHROME, { x: sx * 0.79, y: 1.28, z: -0.62 });   // pull
  }
  // floor pan, so a downward look is not a hole into the terrain
  P(box(1.62, 0.05, 3.20), C_DARK, { y: 1.00, z: 0.20 });

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

  // THE ONE PAINTED MATERIAL. Audit: this file used to build seven material configs and
  // Three bakes every distinct config into its own shader program, against the one budget
  // in CFG.render.budget.programsMax. Four now: this one (shell + wheels + the steering rim,
  // all of them carrying their colour per vertex), the glass, and the two emissives —
  // and because the emissives also declare vertexColors they land in THIS program, so
  // the car costs three programs, not seven materials' worth.
  const bodyMat = new THREE.MeshStandardMaterial({
    vertexColors: true,               // safe: every part above carries `color`
    roughness: 0.91,                  // dead paint, no clearcoat. A shiny car at night is a mirror ball.
    metalness: 0.08,                  // between the old shell 0.88/0.10 and wheel 0.95/0.05
    fog: true,
  });
  bodyMat.name = 'curfew-car';
  const shell = new THREE.Mesh(shellGeo, bodyMat);
  shell.castShadow = true;
  shell.receiveShadow = true;
  shell.name = 'car-shell';
  root.add(shell);

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
  const glassMat = new THREE.MeshBasicMaterial({
    color: 0x0b1014, transparent: true, opacity: 0.30,
    depthWrite: false, side: THREE.DoubleSide, fog: true,
  });
  glassMat.name = 'curfew-car-glass';
  const glass = glassGeo ? new THREE.Mesh(glassGeo, glassMat) : null;
  if (glass) { glass.renderOrder = 2; glass.name = 'car-glass'; root.add(glass); }

  /* -------------------------------------------------------------- wheels --- */
  // ONE InstancedMesh: four wheels, one draw. They steer (fronts) and spin (all four),
  // which is the single cheapest thing that makes a car look alive rather than slid.
  const tyre = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 14, 1);
  tyre.rotateZ(Math.PI * 0.5);        // axis along local X
  const hub = new THREE.CylinderGeometry(WHEEL_R * 0.42, WHEEL_R * 0.42, WHEEL_W + 0.012, 10, 1);
  hub.rotateZ(Math.PI * 0.5);
  const spoke = box(WHEEL_W + 0.02, 0.045, WHEEL_R * 1.30);
  const wheelParts = [
    part(tyre, C_RUBBER, { seed, rust: 0 }),
    part(hub, C_CHROME, { seed, rust: 0.8, y: 0 }),
    part(spoke, C_CHROME, { seed, rust: 0.8 }),
  ];
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
  const rim = new THREE.Mesh(steerGeo, bodyMat);
  rim.name = 'car-steer';
  steer.add(rim);
  root.add(steer);

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
    root, wheels, steer, lampGood,
    lampDead: null,                   // merged into the shell; the key stays for callers
    materials: [bodyMat, chromeMat, glassMat, lampMat, tailMat],   // five materials, THREE programs
    tris: Math.round(tris),
    roofY: ROOF_Y,
    door: DOOR,
    lampOffsets: { good: LAMP_GOOD, dead: LAMP_DEAD },

    /**
     * Electrics. `head` 0..1 is the working headlamp's filament, `tailOn` the rears.
     * Emissive intensity only — NEVER a light. The census is pinned (CONTRACT).
     */
    setLamp(head, tailOn) {
      lampMat.emissiveIntensity = head * 2.4;
      tailMat.emissiveIntensity = tailOn ? 0.85 : 0.0;
    },

    dispose() {
      shellGeo.dispose();
      chromeGeo.dispose();
      if (glass) glass.geometry.dispose();
      wheelGeo.dispose();
      steerGeo.dispose();
      lensGeo.dispose();
      tailGeo.dispose();
      bodyMat.dispose(); chromeMat.dispose(); glassMat.dispose(); lampMat.dispose(); tailMat.dispose();
      if (root.parent) root.parent.remove(root);
    },
  };
}

export default buildCarBody;
