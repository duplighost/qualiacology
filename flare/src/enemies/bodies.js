// THE BODIES — instanced geometry, and the silhouette strips that are the whole
// reason this workstream exists.
//
// NO `import ... from 'three'`. THREE arrives on `ctx.THREE`, exactly as
// world/build.js and weapons/viewmodel.js take it, which is what keeps this
// module loadable in node — so the gate can measure a silhouette without a GPU,
// and so the strip layout is data a test can read rather than pixels it has to
// guess at.
//
// ---------------------------------------------------------------------------
// WHY THE STRIPS ARE ADDITIVE SPRITES AND NOT EMISSIVE MESHES
// ---------------------------------------------------------------------------
// The render family offers exactly one program with a PER-INSTANCE emissive
// channel, and it is ADDITIVE_INSTANCED (iA position+size, iB colour+alpha,
// iC direction+shape). `EMISSIVE_UNLIT` carries uEmissive / uIntensity / uDuty
// as MATERIAL uniforms, so using it would mean one material per creature — which
// docs/PLAN.md rules out by name ("never a cloned material per body"), and which
// would also make every HUSK in the room pulse its health readout in unison.
//
// So: bodies are instanced SURFACE_INSTANCED (one draw per archetype, iMatrix +
// iTint), and every self-lit part — strip, core, tell — is an additive sprite in
// the shared bucket. Zero new programs, zero new materials per body, and the
// per-instance emissive attribute PLAN asks for is `iB.a`.
//
// THE ONE TRAP, MEASURED: P3_ADDITIVE renders into the same HDR target as
// P1_WORLD with the depth buffer still bound, so a sprite centred on a creature's
// axis is depth-rejected by the creature's own front face and the strip
// disappears into the body. Every sprite is therefore pushed `stripLift` metres
// toward the camera along the view vector. A wall between you and the creature
// still occludes it — the lift is centimetres and the wall is metres — so cover
// keeps working in both directions.
//
// ---------------------------------------------------------------------------
// WHY 0.12-0.18 IS UNDER THE BLOOM THRESHOLD AT EVERY IRIS GAIN
// ---------------------------------------------------------------------------
// The bloom prefilter (src/render/post.js, FS_BLOOM_DOWN) thresholds the HDR
// scene at FEEL.render.bloomThreshold = 0.85 BEFORE the grade applies uGain.
// A resting strip is at most 0.18 of additive radiance in that buffer, so it can
// never bloom — at gain 0.15 or at gain 2.60 — and it therefore reads as SHAPE
// rather than as glare. A charging tell at 6x lands at 0.90, just over, which is
// exactly the difference the player is meant to see.

import FEEL from '../feel.js';
import { clamp, clamp01 } from '../core/math.js';
import { hash2 } from '../core/rng.js';
import { ARCHETYPES, ENEMY_TABLE as T, healthDuty } from './table.js';

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this module: PROPORTIONS AND STRIP LAYOUT.
//
// This is shape, not tuning — the same reason `INTAKE` holds THE INTAKE's
// geometry and `IMPACT_TABLE` holds the ring's. Anything here that governs how
// the game FEELS (speeds, damage, telegraph durations, emissive window) is read
// from FEEL and is not restated.
//
// Every measurement below is a FRACTION OF THE ARCHETYPE'S OWN HEIGHT or of its
// own radius, so a stat change in FEEL reshapes the creature instead of
// desynchronising it from its collision capsule.
// ---------------------------------------------------------------------------
export const BODY_TABLE = Object.freeze({
  stripLift: 0.34,             // metres toward the camera; see the trap above
  stripAlphaFar: 0.55,         // strips hold alpha with distance — a silhouette
  stripFadeFrom: 28,           // that dims at 40 m is not a silhouette at 40 m
  stripFadeRange: 46,
  stripAlphaFloor: 0.62,

  hitFlashGain: 5.5,           // the 60 ms pulse impact.js writes, as a multiplier
  litGain: 2.2,                // THE ONE LAW's 0.35 s: litIntensity rides the strip
  deathGlowGain: 3.4,          // the dying glow that hands off into the scar

  tintBase: 0.80,              // per-instance albedo variation, from `vary`
  tintSpan: 0.42,
  scaleSpan: 0.09,             // +-9% per-instance size. Fourteen identical
                               // bodies is automatic failure #10.

  // The warm channel. Hue carries NOTHING (CONTRACT §6) — every creature in the
  // game is the same amber and they are told apart by shape, size and timing.
  strip: Object.freeze([FEEL.render.warm[0], FEEL.render.warm[1], FEEL.render.warm[2]]),

  // Body boxes, per archetype. [cx, cy, cz, hx, hy, hz, pitch] in a space where
  // y = 0 is the FEET, +Z is forward, and every extent is a fraction of the
  // archetype's height (y) or radius (x, z). `pitch` tips the box about X, which
  // is what lets the RUNNER read as a low canted thing rather than a short HUSK.
  boxes: Object.freeze({
    // HUSK — the crowd. Upright, narrow, unmistakably a standing person-shape.
    husk: Object.freeze([
      [0, 0.62, 0, 0.44, 0.24, 0.30, 0],        // torso
      [0, 0.35, 0, 0.36, 0.13, 0.26, 0],        // pelvis
      [-0.26, 0.16, 0, 0.16, 0.17, 0.17, 0],    // legs
      [0.26, 0.16, 0, 0.16, 0.17, 0.17, 0],
      [-0.60, 0.60, 0, 0.14, 0.20, 0.14, 0],    // arms
      [0.60, 0.60, 0, 0.14, 0.20, 0.14, 0],
      [0, 0.91, 0, 0.24, 0.08, 0.22, 0],        // head
    ]),
    // RUNNER — 7.2 m/s of low canted forward mass. Nothing else in the roster
    // has its centre of gravity in front of its feet, and at 40 m that is the
    // read: it is LEANING.
    runner: Object.freeze([
      [0, 0.50, 0.10, 0.46, 0.19, 0.42, -0.62], // canted spine
      [0, 0.28, -0.14, 0.34, 0.13, 0.26, -0.30],// haunch
      [-0.34, 0.13, -0.10, 0.14, 0.14, 0.20, 0],
      [0.34, 0.13, -0.10, 0.14, 0.14, 0.20, 0],
      [-0.40, 0.44, 0.26, 0.12, 0.12, 0.22, -0.5],
      [0.40, 0.44, 0.26, 0.12, 0.12, 0.22, -0.5],
      [0, 0.70, 0.34, 0.20, 0.08, 0.16, -0.4],  // low head, thrust forward
      // The raised rear shoulder. It is here because WHAT THE PLAYER SHOOTS AND
      // WHAT THE PLAYER SEES MUST BE THE SAME SIZE: without it the canted body
      // topped out at 1.15 m inside a 1.45 m capsule, and every shot into the
      // top 0.30 m connected with nothing visible. It also happens to be the
      // shape a sprinter is — the cant reads harder against a high back.
      [0, 0.86, -0.20, 0.34, 0.11, 0.30, -0.25],
    ]),
    // LANTERN — 70 m of range on a body that is almost nothing but vertical.
    lantern: Object.freeze([
      [0, 0.52, 0, 0.30, 0.34, 0.24, 0],        // column
      [0, 0.17, 0, 0.30, 0.18, 0.26, 0],        // base
      [-0.34, 0.66, 0, 0.10, 0.16, 0.10, 0],
      [0.34, 0.66, 0, 0.10, 0.16, 0.10, 0],
      [0, 0.90, 0.04, 0.26, 0.09, 0.24, 0],     // the sac — the tell AND the
                                                 // weak point, in the top 22%
    ]),
    // WARDEN — 220 hp under an armoured front. Wide, low-shouldered, and the
    // only thing in the roster whose width exceeds its head height.
    warden: Object.freeze([
      [0, 0.46, 0, 0.62, 0.24, 0.44, 0],        // hull
      [0, 0.30, 0.42, 0.56, 0.20, 0.14, 0],     // the FRONT PLATE: armour is a
                                                 // 120 degree cone and this is it
      [-0.44, 0.15, 0, 0.20, 0.16, 0.22, 0],
      [0.44, 0.15, 0, 0.20, 0.16, 0.22, 0],
      [0, 0.76, 0, 0.90, 0.07, 0.20, 0],        // the YOKE
      [-0.78, 0.66, 0, 0.14, 0.10, 0.16, 0],
      [0.78, 0.66, 0, 0.14, 0.10, 0.16, 0],
      [0, 0.88, -0.06, 0.22, 0.07, 0.20, 0],    // the relocated tell, BEHIND the
                                                 // plate and inside the weak band
    ]),
    // BLOOM — a walking fuse. Bulbous, slow, and it is the only round thing.
    bloom: Object.freeze([
      [0, 0.50, 0, 0.86, 0.26, 0.86, 0],        // sac
      [0, 0.72, 0, 0.62, 0.14, 0.62, 0],
      [0, 0.28, 0, 0.58, 0.14, 0.58, 0],
      [-0.42, 0.11, 0, 0.16, 0.12, 0.16, 0],
      [0.42, 0.11, 0, 0.16, 0.12, 0.16, 0],
      [0, 0.86, 0, 0.34, 0.08, 0.34, 0],        // the crown, inside the weak band
    ]),
  }),

  // THE SILHOUETTE STRIPS. Each segment is
  //   [x, y, z, dirX, dirY, dirZ, size, shape]
  // with x/z as fractions of radius, y as a fraction of height, size in METRES
  // (an additive streak is 8*size long and 2*size wide; a ring is size in
  // radius). `shape` is the render bucket's own: 0 blob, 1 ring, 2 streak.
  //
  // These are not decoration. They ARE the identification channel — the thing
  // the player reads at 40 m in a black room — so each one describes the
  // creature's actual outline rather than sitting on it as a badge.
  strips: Object.freeze({
    husk: Object.freeze([[0, 0.60, 0.42, 0, 1, 0, 0.078, 2]]),
    runner: Object.freeze([[0, 0.50, 0.30, 0, 0.55, 0.84, 0.064, 2]]),
    lantern: Object.freeze([
      [0, 0.40, 0.40, 0, 1, 0, 0.049, 2],
      [0, 0.74, 0.40, 0, 1, 0, 0.049, 2],
    ]),
    warden: Object.freeze([
      [0, 0.78, 0.28, 1, 0, 0, 0.086, 2],
      [-0.66, 0.68, 0.24, 0.42, -0.90, 0, 0.048, 2],
      [0.66, 0.68, 0.24, -0.42, -0.90, 0, 0.048, 2],
    ]),
    bloom: Object.freeze([[0, 0.52, 0, 0, 1, 0, 0.62, 1]]),
  }),

  // Where the TELL lives, and what the wind-up does to the outline. Every `y` is
  // at or above 0.78 — impact.js's weak-point band — because THE TELEGRAPH IS
  // THE WEAK POINT and splitting them would be two things to learn instead of one.
  tell: Object.freeze({
    husk: Object.freeze({ x: 0, y: 0.86, z: 0.30, size: 0.10, grow: 0.55 }),
    runner: Object.freeze({ x: 0, y: 0.80, z: 0.42, size: 0.09, grow: 0.50 }),
    lantern: Object.freeze({ x: 0, y: 0.90, z: 0.10, size: 0.15, grow: 1.10 }),
    warden: Object.freeze({ x: 0, y: 0.88, z: -0.10, size: 0.13, grow: 0.60 }),
    bloom: Object.freeze({ x: 0, y: 0.86, z: 0, size: 0.17, grow: 1.25 }),
  }),

  // THE SILHOUETTE CHANGE. `scaleY` crouches or rears; `stripShift` slides the
  // strip along its own axis; `spread` opens a yoke or a ring; `cant` rotates a
  // canted bar toward the leap it is about to make.
  deform: Object.freeze({
    husk: Object.freeze({ scaleY: -0.13, stripShift: -0.07, spread: 0.10, cant: 0.10 }),
    runner: Object.freeze({ scaleY: -0.19, stripShift: -0.05, spread: 0.06, cant: 0.42 }),
    lantern: Object.freeze({ scaleY: 0.11, stripShift: 0.09, spread: 0.14, cant: 0 }),
    warden: Object.freeze({ scaleY: 0.09, stripShift: 0.05, spread: 0.34, cant: 0 }),
    bloom: Object.freeze({ scaleY: 0.07, stripShift: 0, spread: 0.46, cant: 0 }),
  }),
});

const B = BODY_TABLE;

// ---------------------------------------------------------------------------
// THE SILHOUETTE SIGNATURE
//
// One number describing the creature's outline this instant: total strip extent
// plus body height. It is what the renderer draws FROM, so a test that asserts
// "the silhouette changed during the wind-up" is asserting about the picture and
// not about a parallel bookkeeping variable that could agree with nothing.
// ---------------------------------------------------------------------------
export function silhouetteSignature(arch, windup01, flashSafe) {
  const d = B.deform[arch.id];
  const w = clamp01(windup01) * (flashSafe ? T.telegraphSilhouetteSafe : 1);
  const segs = B.strips[arch.id];
  const scaleY = 1 + d.scaleY * w;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const spread = 1 + d.spread * w;
    const cx = s[0] * arch.radius * spread;
    const cy = (s[1] + d.stripShift * w) * arch.height * scaleY;
    // A streak is 8*size long along its direction; a ring is 2*size across.
    const half = s[7] === 2 ? s[6] * 4 : s[6];
    const cant = d.cant * w;
    const dx = s[3], dy = s[4] * Math.cos(cant) - s[5] * Math.sin(cant);
    const l = Math.sqrt(dx * dx + dy * dy) || 1;
    const ex = Math.abs(dx / l) * half + (s[7] === 2 ? s[6] : half) * 0.5;
    const ey = Math.abs(dy / l) * half + (s[7] === 2 ? s[6] : half) * 0.5;
    if (cx - ex < minX) minX = cx - ex;
    if (cx + ex > maxX) maxX = cx + ex;
    if (cy - ey < minY) minY = cy - ey;
    if (cy + ey > maxY) maxY = cy + ey;
  }
  const tell = B.tell[arch.id];
  const sac = tell.size * (1 + tell.grow * w);
  return (maxX - minX) + (maxY - minY) + arch.height * scaleY + sac * 2;
}

/** The emissive multiplier on the tell, and the law's first clause. */
export const telegraphGain = (windup01, flashSafe) => {
  const g = flashSafe ? T.telegraphGainSafe : T.telegraphGain;
  const rise = clamp01(clamp01(windup01) / T.telegraphRise);
  return 1 + (g - 1) * (rise * rise * (3 - 2 * rise));
};

// ---------------------------------------------------------------------------
// GEOMETRY — merged boxes, one non-indexed buffer per archetype.
//
// Non-indexed because a merged box set shares no vertices across faces anyway
// (each face needs its own normal), so an index buffer would be 36 unique
// entries per box pointing at 36 unique vertices.
// ---------------------------------------------------------------------------
const FACE = [
  // [nx, ny, nz, ax, ay, az, bx, by, bz] — normal, then the two in-plane axes
  [0, 0, 1, 1, 0, 0, 0, 1, 0], [0, 0, -1, -1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 0, -1, 0, 1, 0], [-1, 0, 0, 0, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 0, 0, 0, -1], [0, -1, 0, 1, 0, 0, 0, 0, 1],
];

export function buildArchetypeGeometry(arch) {
  const boxes = B.boxes[arch.id];
  const verts = boxes.length * 36;
  const pos = new Float32Array(verts * 3);
  const nrm = new Float32Array(verts * 3);
  let p = 0;

  for (let bi = 0; bi < boxes.length; bi++) {
    const bx = boxes[bi];
    const cx = bx[0] * arch.radius, cy = bx[1] * arch.height, cz = bx[2] * arch.radius;
    const hx = bx[3] * arch.radius, hy = bx[4] * arch.height, hz = bx[5] * arch.radius;
    const pitch = bx[6] || 0;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);

    for (let f = 0; f < 6; f++) {
      const F = FACE[f];
      // The half-extent ALONG each of the face's three axes. Every one of N, A
      // and B is +-a cardinal axis, so this picks exactly one of hx/hy/hz.
      const hN = Math.abs(F[0]) * hx + Math.abs(F[1]) * hy + Math.abs(F[2]) * hz;
      const hA = Math.abs(F[3]) * hx + Math.abs(F[4]) * hy + Math.abs(F[5]) * hz;
      const hB = Math.abs(F[6]) * hx + Math.abs(F[7]) * hy + Math.abs(F[8]) * hz;
      for (let v = 0; v < 6; v++) {
        // Two triangles over the face quad: corners 0,1,2 then 0,2,3. Wound so
        // that A x B == N, i.e. counter-clockwise seen from OUTSIDE — these
        // materials are FrontSide and a flipped winding is an invisible body.
        const k = (v === 0 || v === 3) ? 0 : (v === 1) ? 1 : (v === 2 || v === 4) ? 2 : 3;
        const su = (k === 0 || k === 3) ? -1 : 1;
        const sv = (k === 0 || k === 1) ? -1 : 1;

        const lx = F[0] * hN + F[3] * su * hA + F[6] * sv * hB;
        const ly = F[1] * hN + F[4] * su * hA + F[7] * sv * hB;
        const lz = F[2] * hN + F[5] * su * hA + F[8] * sv * hB;

        // Pitch about X, then translate. The normal rotates with it.
        pos[p] = cx + lx;
        pos[p + 1] = cy + (ly * cp - lz * sp);
        pos[p + 2] = cz + (ly * sp + lz * cp);
        nrm[p] = F[0];
        nrm[p + 1] = F[1] * cp - F[2] * sp;
        nrm[p + 2] = F[1] * sp + F[2] * cp;
        p += 3;
      }
    }
  }
  return { position: pos, normal: nrm, count: verts, tris: verts / 3 };
}

// ---------------------------------------------------------------------------
// THE RENDER SIDE
// ---------------------------------------------------------------------------

/**
 * `createBodies(ctx, opts)` — one instanced mesh per archetype, plus the sprite
 * submission for strips, cores and tells. Degrades to a no-op when there is no
 * THREE and no render system, which is what lets the FAST tier of the gate run
 * the whole AI in node.
 */
export function createBodies(ctx, opts = {}) {
  const THREE = ctx && ctx.THREE;
  const render = (ctx && ctx.render) || null;
  const capacity = opts.capacity || (FEEL.director.hardAliveCap + T.corpseCap);

  const meshes = [];
  const geometries = [];
  const materials = [];
  const buckets = [];              // per archetype: { matrix, tint, count, mesh }
  let live = !!(THREE && render && render.materials && render.LAYERS !== undefined);

  const stats = { draws: 0, instances: 0, triangles: 0, sprites: 0, materials: 0 };

  for (let i = 0; i < ARCHETYPES.length; i++) {
    const arch = ARCHETYPES[i];
    const bucket = {
      arch,
      matrix: new Float32Array(capacity * 16),
      tint: new Float32Array(capacity * 4),
      count: 0,
      mesh: null, geometry: null, material: null, attrM: null, attrT: null,
    };
    buckets.push(bucket);
    if (!live) continue;

    const data = buildArchetypeGeometry(arch);
    const ig = new THREE.InstancedBufferGeometry();
    ig.setAttribute('position', new THREE.BufferAttribute(data.position, 3));
    ig.setAttribute('normal', new THREE.BufferAttribute(data.normal, 3));
    const attrM = new THREE.InstancedBufferAttribute(bucket.matrix, 16);
    const attrT = new THREE.InstancedBufferAttribute(bucket.tint, 4);
    attrM.setUsage(THREE.DynamicDrawUsage);
    attrT.setUsage(THREE.DynamicDrawUsage);
    ig.setAttribute('iMatrix', attrM);
    ig.setAttribute('iTint', attrT);
    ig.instanceCount = 0;
    // W1-RENDER's finding: an InstancedBufferGeometry is culled from the BASE
    // geometry's bounding sphere, i.e. as if the whole bucket sat at the origin.
    ig.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);

    // ONE material per ARCHETYPE, minted from the shared family. Five materials,
    // zero new programs: the source string is interned, so every one of them
    // shares SURFACE_INSTANCED's single linked program.
    const mat = render.materials.surfaceInstanced({ color: opts.color || FEEL.render.drab });
    const mesh = new THREE.Mesh(ig, mat);
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.name = `enemies:${arch.id}`;
    mesh.layers.set(render.LAYERS.WORLD);

    bucket.mesh = mesh; bucket.geometry = ig; bucket.material = mat;
    bucket.attrM = attrM; bucket.attrT = attrT;
    bucket.tris = data.tris;
    meshes.push(mesh); geometries.push(ig); materials.push(mat);
    if (ctx.scene) ctx.scene.add(mesh);
  }
  stats.materials = materials.length;

  // ---- per-frame scratch. CONTRACT §4 ------------------------------------
  const _m = new Float32Array(16);
  const _rot = new Float32Array(9);

  function begin() {
    for (let i = 0; i < buckets.length; i++) buckets[i].count = 0;
    stats.sprites = 0;
  }

  /**
   * Compose the instance matrix: lean(world axis) * yaw * scale, translated to
   * the creature's feet. The lean is the flinch's spine bend, applied about the
   * axis perpendicular to the bullet direction, so a hit from the left leans it
   * right and the player can read WHERE they hit from across the room.
   */
  function compose(x, y, z, yaw, sx, sy, sz, leanAxisX, leanAxisZ, lean) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    // Ry
    let r0 = c, r1 = 0, r2 = -s;
    let r3 = 0, r4 = 1, r5 = 0;
    let r6 = s, r7 = 0, r8 = c;

    if (lean > 1e-4) {
      // Rodrigues about the unit axis (ax, 0, az).
      const l = Math.sqrt(leanAxisX * leanAxisX + leanAxisZ * leanAxisZ) || 1;
      const ax = leanAxisX / l, az = leanAxisZ / l;
      const ct = Math.cos(lean), st = Math.sin(lean), ic = 1 - ct;
      const k0 = ct + ax * ax * ic, k1 = -az * st, k2 = ax * az * ic;
      const k3 = az * st, k4 = ct, k5 = -ax * st;
      const k6 = ax * az * ic, k7 = ax * st, k8 = ct + az * az * ic;
      // rot = K * Ry
      _rot[0] = k0 * r0 + k1 * r3 + k2 * r6; _rot[1] = k0 * r1 + k1 * r4 + k2 * r7; _rot[2] = k0 * r2 + k1 * r5 + k2 * r8;
      _rot[3] = k3 * r0 + k4 * r3 + k5 * r6; _rot[4] = k3 * r1 + k4 * r4 + k5 * r7; _rot[5] = k3 * r2 + k4 * r5 + k5 * r8;
      _rot[6] = k6 * r0 + k7 * r3 + k8 * r6; _rot[7] = k6 * r1 + k7 * r4 + k8 * r7; _rot[8] = k6 * r2 + k7 * r5 + k8 * r8;
      r0 = _rot[0]; r1 = _rot[1]; r2 = _rot[2];
      r3 = _rot[3]; r4 = _rot[4]; r5 = _rot[5];
      r6 = _rot[6]; r7 = _rot[7]; r8 = _rot[8];
    }

    // Column-major, columns scaled in object space.
    _m[0] = r0 * sx; _m[1] = r3 * sx; _m[2] = r6 * sx; _m[3] = 0;
    _m[4] = r1 * sy; _m[5] = r4 * sy; _m[6] = r7 * sy; _m[7] = 0;
    _m[8] = r2 * sz; _m[9] = r5 * sz; _m[10] = r8 * sz; _m[11] = 0;
    _m[12] = x; _m[13] = y; _m[14] = z; _m[15] = 1;
    return _m;
  }

  /** Push one creature's body instance. Returns false at bucket capacity. */
  function submitBody(e, arch) {
    const b = buckets[arch.index];
    if (b.count >= capacity) return false;
    const n = b.count++;

    const sink = e.dead ? e.sinkY : 0;
    compose(
      e.x + e.flinchX, e.y - sink, e.z + e.flinchZ, e.yaw,
      e.scaleXZ, e.scaleY, e.scaleXZ,
      e.leanAxisX, e.leanAxisZ, e.lean,
    );
    b.matrix.set(_m, n * 16);

    // iTint.rgb is per-instance albedo. The hit flash and THE ONE LAW's 0.35 s
    // both ride here as well as on the strip: a lit body is the second half of
    // the contract impact.js writes, and a body that only brightens its strip
    // reads as a lamp turning on rather than as a creature being hit.
    const flash = 1 + B.hitFlashGain * (e.hitFlash > 0 ? e.hitFlash / (FEEL.law.hitFlashMs / 1e3) : 0);
    const lit = 1 + B.litGain * (e.litFor > 0 ? e.litIntensity : 0) * clamp01(e.litFor / FEEL.law.hitLightMin);
    const t = e.tint * flash * lit * (e.dead ? clamp01(e.deathGlow) * 0.6 + 0.4 : 1);
    b.tint[n * 4] = t; b.tint[n * 4 + 1] = t; b.tint[n * 4 + 2] = t; b.tint[n * 4 + 3] = 1;
    return true;
  }

  /**
   * Push one creature's self-lit parts. This is the identification channel, and
   * it is the only part of a creature that is guaranteed visible in a room with
   * no light in it at all.
   */
  function submitStrips(e, arch, camX, camY, camZ, clock, flashSafe) {
    const add = render && render.additive;
    if (!add) return 0;

    const d = B.deform[arch.id];
    const w = clamp01(e.windup01) * (flashSafe ? T.telegraphSilhouetteSafe : 1);
    const scaleY = (1 + d.scaleY * w) * e.scaleY;
    const spread = 1 + d.spread * w;
    const cant = d.cant * w;

    // Toward the camera, so a sprite is not depth-rejected by its own body.
    let lx = camX - e.x, ly = camY - (e.y + arch.height * 0.5), lz = camZ - e.z;
    const dist = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1e-6;
    lx /= dist; ly /= dist; lz /= dist;
    const lift = B.stripLift + arch.radius * 0.5;

    // A silhouette that dims with distance is not a silhouette at 40 m. It fades
    // only far past the chamber's longest sightline, and never below the floor.
    const fade = Math.max(B.stripAlphaFloor,
      1 - clamp01((dist - B.stripFadeFrom) / B.stripFadeRange) * (1 - B.stripAlphaFar));

    const cy = Math.cos(e.yaw), sy = Math.sin(e.yaw);
    const emissive = arch.stripEmissive * fade
      * (1 + B.hitFlashGain * (e.hitFlash > 0 ? e.hitFlash / (FEEL.law.hitFlashMs / 1e3) : 0))
      * (e.dead ? clamp01(e.deathGlow) * B.deathGlowGain : 1);

    const segs = B.strips[arch.id];
    let n = 0;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      // local -> world (yaw only; the strip is a surface marking, not a limb)
      const px = s[0] * arch.radius * spread, pz = s[2] * arch.radius;
      const py = (s[1] + d.stripShift * w) * arch.height * scaleY;
      let dxl = s[3], dyl = s[4], dzl = s[5];
      if (cant !== 0) {
        const c2 = Math.cos(cant), s2 = Math.sin(cant);
        const ny = dyl * c2 - dzl * s2, nz = dyl * s2 + dzl * c2;
        dyl = ny; dzl = nz;
      }
      const wx = e.x + (px * cy + pz * sy) + lx * lift + e.flinchX;
      const wy = e.y - (e.dead ? e.sinkY : 0) + py + ly * lift * 0.35;
      const wz = e.z + (-px * sy + pz * cy) + lz * lift + e.flinchZ;
      const wdx = dxl * cy + dzl * sy, wdz = -dxl * sy + dzl * cy;
      add.sprite(wx, wy, wz, s[6] * spread, B.strip[0], B.strip[1], B.strip[2],
        emissive, s[7], wdx, dyl, wdz);
      n++;
    }

    // THE HEALTH READOUT: duty cycle, at or under 3 Hz, never frequency.
    //
    // The phase offset is derived from the creature's own position, not read from
    // a field. `e.phase` never existed — the record has no such property — so this
    // was clock + undefined = NaN, and the ONE readout that tells the player how
    // hurt something is, in a game with no HUD, was dead for every creature while
    // every enemy test still passed. A stable spatial hash gives each body its own
    // offset so a group does not pulse in unison, and it cannot go undefined.
    const duty = e.dead ? 0 : healthDuty(e.hp / e.maxHp, clock + hash2(e.spawnX ?? e.x, e.spawnZ ?? e.z) * 6.283);
    if (duty > 0.01) {
      const cxw = e.x + lx * lift + e.flinchX;
      const cyw = e.y + T.coreHeight * arch.height * scaleY + ly * lift * 0.35;
      const czw = e.z + lz * lift + e.flinchZ;
      add.sprite(cxw, cyw, czw, T.coreSize * arch.radius * 2, B.strip[0], B.strip[1], B.strip[2],
        arch.stripEmissive * fade * duty * 1.25, 0, 0, 0, 0);
      n++;
    }

    // THE TELL. Emissive x2 minimum during the wind-up, on a part the player can
    // shoot, in impact.js's weak-point band. Never split from the target.
    if (e.windup01 > 0 && !e.dead) {
      const tell = B.tell[arch.id];
      const g = telegraphGain(e.windup01, flashSafe);
      const tx = e.x + (tell.x * arch.radius * cy + tell.z * arch.radius * sy) + lx * lift;
      const ty = e.y + tell.y * arch.height * scaleY + ly * lift * 0.35;
      const tz = e.z + (-tell.x * arch.radius * sy + tell.z * arch.radius * cy) + lz * lift;
      add.sprite(tx, ty, tz, tell.size * (1 + tell.grow * w), B.strip[0], B.strip[1], B.strip[2],
        arch.stripEmissive * g * fade, 0, 0, 0, 0);
      n++;

      // A charging creature is a LIGHT — one of the two telegraph slots in the
      // rover pool, and a real probe in the light field, so its own glow feeds
      // the iris and the trade exactly as the player's muzzle flash does.
      if (render.lights && e.windup01 > 0.25) {
        render.lights.request('telegraph', arch.index * 4096 + e.id, tx, ty, tz,
          arch.radius * 6, arch.stripEmissive * g * 1.4, B.strip,
          render.LIGHT_KIND ? render.LIGHT_KIND.POINT : 0);
      }
      if (ctx.light && ctx.light.addProbe) {
        ctx.light.addProbe(tx, ty, tz, arch.radius * 5, arch.stripEmissive * g * 0.5);
      }
    }

    // Contact shadow. Automatic failure #5 is "objects that float", and in a room
    // whose only light comes off the floor a body with no contact blob hovers.
    if (render.blobs && ctx.world && ctx.world.ground) {
      const g = ctx.world.ground.groundAt(e.x, e.z, e.y + arch.height);
      if (g > -1e8) render.blobs.add(e.x, g, e.z, arch.radius * 1.5, Math.max(0, e.y - g));
    }

    stats.sprites += n;
    return n;
  }

  /** Upload. Called once per frame after every creature has been submitted. */
  function flush() {
    stats.draws = 0; stats.instances = 0; stats.triangles = 0;
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      if (!b.mesh) { stats.instances += b.count; continue; }
      b.geometry.instanceCount = b.count;
      if (b.count > 0) {
        b.attrM.needsUpdate = true;
        b.attrT.needsUpdate = true;
        stats.draws++;
        stats.instances += b.count;
        stats.triangles += b.tris * b.count;
      }
    }
  }

  function dispose() {
    for (const m of meshes) { if (m.parent) m.parent.remove(m); }
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    meshes.length = 0; geometries.length = 0; materials.length = 0;
    live = false;
  }

  return {
    begin, submitBody, submitStrips, flush, dispose,
    stats, buckets, meshes,
    get live() { return live; },
    silhouetteSignature, telegraphGain,
  };
}

export default createBodies;
