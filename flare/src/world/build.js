// MESH GENERATION — an ArenaSpec becomes geometry, instances and colliders.
//
// Three rules govern everything below, and each of them is a defect this project
// has already paid for somewhere:
//
//   NO `import ... from 'three'`. THREE arrives on `ctx.THREE` (main.js already
//   puts it there). That single choice is what lets tests/world.mjs assert the
//   ENTIRE layout and the ENTIRE collider bake headless, with no GPU, in
//   milliseconds — the same discipline that makes ground.js testable. Geometry
//   assembly is the only part that needs a renderer, and it is quarantined into
//   `createBuilder`.
//
//   NO NEW MATERIAL. Every surface comes from `ctx.render.materials.*`
//   (docs/HANDOFF.md, W1-RENDER's interface list). A `new THREE.Mesh*Material`
//   anywhere here is an eighteenth program and a blown budget, and
//   tests/world.mjs greps for it.
//
//   ONE DRAW CALL PER REPEATED ELEMENT, and NEVER a perfectly repeated instance.
//   docs/RENDER.md's automatic failure #10 is "same rock, same angle"; #4 is
//   "empty ground, sparse midground — the frame must be crammed". So every
//   instanced element carries per-instance yaw, non-uniform scale, small tilt and
//   a tint drawn from a MACRO noise field sampled at the instance's own world
//   position. That macro field is deliberate: W1-RENDER's surface shader breaks
//   albedo up at 0.37 m and 0.71 m cells and nothing in it varies at building
//   scale, so the per-instance tint IS the third scale. It is authored on the CPU
//   because that is the only place it can exist without a new uniform, and the
//   material family is not mine to change.
//
// THE BAKE IS THE SAME ARRAY THE GPU GETS. `buildLayout` produces one Float32
// `iMatrix` buffer per element; the vertex shader reads it, and `bakeLayout`
// feeds that exact buffer to collide.js's `bakeObject` through an InstancedMesh-
// shaped proxy. There is no second transcription of a transform, so a collider
// cannot drift from the thing you can see. tests/world.mjs re-derives every box
// from the authored TRS with its own arithmetic and compares — two independent
// implementations agreeing is the only version of that assertion worth making.

import FEEL from '../feel.js';
import { clamp, lerp, TAU } from '../core/math.js';
import { hash2 } from '../core/rng.js';
import { createGround } from './ground.js';
import { COLLIDE, bakeObject } from './collide.js';

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this module. CONTRACT §5. Chamber dimensions are NOT
// here — those are authored level design and live in the chamber's own table
// (src/chambers/intake.js), exactly as GROUND.helix holds the helix's numbers.
// What lives here is everything that must be identical in every chamber.
// ---------------------------------------------------------------------------
export const BUILD = Object.freeze({
  // Every field an ArenaSpec must declare. `defineArena` refuses a spec that is
  // missing one, BY NAME, at import time. A chamber is data, so this check can
  // be total — and a chamber that half-exists is exactly the silent partial
  // wiring CONTRACT §2 was written after.
  arenaFields: Object.freeze([
    'id', 'name', 'tier', 'bounds', 'ground', 'ceilingY', 'playerStart',
    'tiers', 'lanes', 'portals', 'waveSpawns', 'routes', 'recoveryNodes',
    'coverNodes', 'holdingGround', 'keepOuts', 'lightGoal', 'tensionFloor',
    'maxSightline', 'fogDensity', 'scarDepositScale', 'staticLights',
    'palette', 'elements', 'director', 'roster',
  ]),
  elementFields: Object.freeze(['id', 'mode', 'shape', 'material']),
  modes: Object.freeze({ static: 'static', instanced: 'instanced', collider: 'collider' }),

  // ---- the global material polish pass -----------------------------------
  // The draft asked for "accent regex, desaturation, roughness floor". Two of
  // the three survive contact with W1-RENDER's material family and one does not,
  // so it is restated rather than faked:
  //   accent regex  -> an element whose id matches FEEL.render.accentRegex is
  //                    built emissiveUnlit instead of surface. Kept verbatim.
  //   desaturation  -> every authored colour is pulled this far toward
  //                    FEEL.render.drab before it reaches a material, so no
  //                    chamber can wander off the palette by authoring a colour.
  //   roughness fl. -> THERE IS NO ROUGHNESS. The family is Lambert+wrap with no
  //                    GGX (docs/RENDER.md). Its analogue is `uDetail`, the
  //                    albedo-breakup amount, and it gets the floor instead:
  //                    a surface at detail 0 IS automatic failure #1.
  desaturate: 0.34,
  detailFloor: 0.55,

  // Macro tint field — the third breakup scale (see the header).
  macroCell: 17.0,          // metres per macro noise cell
  macroAmount: 0.26,        // +-, multiplied into the instance tint
  tintWarmSpan: 0.055,      // r/b split. BLUE-YELLOW ONLY: that is the axis
                            // moderate deuteranomaly leaves intact, and
                            // CONTRACT §6 forbids meaning on hue regardless —
                            // this is texture, never signal.

  // PLAN W4's number is "a full build never exceeds 4 ms in any SINGLE FRAME",
  // and a job-scheduler cannot know a job's cost before running it — so the
  // slice always overshoots its budget by the duration of the last job it
  // started. Budget 2.5 with a measured worst job of ~1.3 ms lands the worst
  // frame at ~3.8. Budgeting the full 4 measured 4.20 and would have shipped a
  // busted contract behind a passing average.
  // 2.0, not 2.5. The slicer checks its budget only AFTER finishing a job, so a
  // slice can overrun by up to one job's cost — the contract on the next line is
  // therefore an arithmetic constraint, not an aspiration. With the layout path
  // warmed the worst job measures 2.0 ms, so a 2.5 ms slice budget guarantees
  // 4.5 ms worst-case frames against a 4.0 ms budget, which is what it was doing.
  sliceBudgetMs: 2.0,
  frameBudgetMs: 4.0,       // the contract; sliceBudgetMs + the worst job must fit
  maxJobMs: 1.5,            // a job fatter than this needs splitting
  chamfer: 0.04,            // default box bevel, in the shape's local units
  minSegments: 3,
  irradianceMargin: 6,      // the scar projection must cover decals at the wall

  // A round element's collider is ONE oriented box inscribed in its footprint at
  // this fraction of the circumradius. The corners sit ~27% proud of the
  // silhouette at 45 degrees, which on a 0.5 m pillar is 13 cm of invisible fat.
  // The error is deliberately on the safe side — you brush a pillar slightly
  // early, you never clip into one — and the alternative (two boxes at 45
  // degrees) doubles the collider count and destroys the one-to-one mapping that
  // makes "every box matches its matrix" a testable statement.
  roundColliderInset: 0.90,
});

const R = FEEL.render;

// ---------------------------------------------------------------------------
// SPEC VALIDATION + DEEP FREEZE
// ---------------------------------------------------------------------------

/** Recursively freeze plain objects and arrays. TypedArrays cannot be frozen. */
export function deepFreeze(o) {
  if (o === null || typeof o !== 'object' || ArrayBuffer.isView(o)) return o;
  Object.freeze(o);
  for (const k of Object.keys(o)) deepFreeze(o[k]);
  return o;
}

/** Every nested plain object/array is frozen. Returns the paths that are not. */
export function unfrozenPaths(o, path = '$', out = []) {
  if (o === null || typeof o !== 'object' || ArrayBuffer.isView(o)) return out;
  if (!Object.isFrozen(o)) out.push(path);
  for (const k of Object.keys(o)) unfrozenPaths(o[k], `${path}.${k}`, out);
  return out;
}

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isVec3 = v => v && isNum(v.x) && isNum(v.y) && isNum(v.z);

/** Structural validation. Returns EVERY problem — an author wants the whole list. */
export function validateArena(spec) {
  const missing = [];
  const errors = [];
  if (!spec || typeof spec !== 'object') {
    return { ok: false, missing: BUILD.arenaFields.slice(), errors: ['spec is not an object'] };
  }

  for (const f of BUILD.arenaFields) if (spec[f] === undefined || spec[f] === null) missing.push(f);

  const b = spec.bounds;
  if (b) {
    for (const k of ['minX', 'maxX', 'minZ', 'maxZ', 'minY', 'maxY']) {
      if (!isNum(b[k])) errors.push(`bounds.${k} is not a finite number`);
    }
    if (isNum(b.minX) && isNum(b.maxX) && b.maxX <= b.minX) errors.push('bounds.maxX <= bounds.minX');
    if (isNum(b.minZ) && isNum(b.maxZ) && b.maxZ <= b.minZ) errors.push('bounds.maxZ <= bounds.minZ');
  }

  if (spec.playerStart) {
    if (!isVec3(spec.playerStart)) errors.push('playerStart is not a finite vec3');
    if (!isNum(spec.playerStart.yaw)) errors.push('playerStart.yaw is not a number');
  }

  if (Array.isArray(spec.portals)) {
    if (spec.portals.length === 0) errors.push('portals is empty — the director has nowhere legal to spawn');
    spec.portals.forEach((p, i) => {
      if (!p || !p.id) errors.push(`portals[${i}] has no id`);
      if (!isVec3(p)) errors.push(`portals[${i}] is not a finite vec3`);
      if (!isNum(p.nx) || !isNum(p.nz)) errors.push(`portals[${i}] has no inward normal`);
      if (!isNum(p.spawnX) || !isNum(p.spawnZ)) errors.push(`portals[${i}] has no spawn point`);
    });
  } else if (spec.portals !== undefined) errors.push('portals is not an array');

  // PLAN line 221: "two or three holding-ground nodes the director biases
  // surprises toward, so the decision has a place to be about".
  if (Array.isArray(spec.holdingGround)) {
    if (spec.holdingGround.length < 2 || spec.holdingGround.length > 3) {
      errors.push(`holdingGround must declare 2 or 3 nodes, got ${spec.holdingGround.length}`);
    }
    spec.holdingGround.forEach((h, i) => { if (!isVec3(h) || !isNum(h.r)) errors.push(`holdingGround[${i}] needs x,y,z,r`); });
  }

  if (Array.isArray(spec.waveSpawns)) {
    const ids = new Set((spec.portals || []).map(p => p && p.id));
    spec.waveSpawns.forEach((wave, w) => {
      if (!Array.isArray(wave) || wave.length === 0) { errors.push(`waveSpawns[${w}] is empty`); return; }
      for (const id of wave) if (!ids.has(id)) errors.push(`waveSpawns[${w}] references unknown portal "${id}"`);
    });
  }

  if (Array.isArray(spec.coverNodes)) {
    spec.coverNodes.forEach((c, i) => {
      if (!isVec3(c)) errors.push(`coverNodes[${i}] is not a finite vec3`);
      if (!isNum(c.height)) errors.push(`coverNodes[${i}] has no height`);
      if (!isNum(c.nx) || !isNum(c.nz)) errors.push(`coverNodes[${i}] has no facing normal`);
    });
  }

  if (Array.isArray(spec.routes)) errors.push('routes must be an object keyed by route id, not an array');

  if (Array.isArray(spec.elements)) {
    spec.elements.forEach((e, i) => {
      for (const f of BUILD.elementFields) if (e[f] === undefined) errors.push(`elements[${i}] ("${e.id || '?'}") is missing "${f}"`);
      if (e.mode && !BUILD.modes[e.mode]) errors.push(`elements[${i}] mode "${e.mode}" is not ${Object.keys(BUILD.modes).join('|')}`);
      if (e.mode !== 'static' && !e.place) errors.push(`elements[${i}] ("${e.id}") has no placement rule`);
      if (e.place && e.place.kind !== 'mirror' && !PLACERS[e.place.kind]) errors.push(`elements[${i}] names unknown placer "${e.place.kind}"`);
      if (e.place && e.place.kind === 'mirror' && !e.place.of) errors.push(`elements[${i}] mirrors nothing`);
      if (e.mode !== 'collider' && !SHAPES[e.shape]) errors.push(`elements[${i}] names unknown shape "${e.shape}"`);
      if (e.collider && !Array.isArray(e.collider.half)) errors.push(`elements[${i}] collider has no half extents`);
    });
    const ids = spec.elements.map(e => e.id);
    if (new Set(ids).size !== ids.length) errors.push('element ids are not unique');
  } else if (spec.elements !== undefined) errors.push('elements is not an array');

  if (isNum(spec.tensionFloor) && FEEL.tension.floors[spec.id] !== undefined
      && Math.abs(FEEL.tension.floors[spec.id] - spec.tensionFloor) > 1e-9) {
    errors.push(`tensionFloor ${spec.tensionFloor} disagrees with FEEL.tension.floors.${spec.id} = ${FEEL.tension.floors[spec.id]}`);
  }
  if (isNum(spec.lightGoal) && !(spec.lightGoal > 0)) errors.push('lightGoal must be > 0 — it is the divisor the mood filter reads');

  return { ok: missing.length === 0 && errors.length === 0, missing, errors };
}

/**
 * THE CHAMBER CONTRACT. Validates, then deep-freezes. A malformed chamber throws
 * HERE, at import, naming the field — never four systems later as a NaN.
 */
export function defineArena(spec) {
  const v = validateArena(spec);
  if (!v.ok) {
    const parts = [];
    if (v.missing.length) parts.push(`missing fields: ${v.missing.join(', ')}`);
    if (v.errors.length) parts.push(v.errors.join('; '));
    throw new Error(`defineArena("${spec && spec.id}"): ${parts.join(' | ')}`);
  }
  return deepFreeze(spec);
}

// ---------------------------------------------------------------------------
// PURE TRANSFORM MATH — column-major, three's layout, without three.
// ---------------------------------------------------------------------------

/**
 * Compose a TRS matrix into `out[o .. o+15]`, Euler order YXZ — the order the
 * camera and every actor in this project uses, so a yaw is a yaw everywhere.
 * Transcribed from Matrix4.makeRotationFromEuler; tests/world.mjs compares the
 * result against THREE's own Matrix4 on the real page, element by element.
 */
export function composeTRS(out, o, px, py, pz, rx, ry, rz, sx, sy, sz) {
  const c1 = Math.cos(rx), s1 = Math.sin(rx);
  const c2 = Math.cos(ry), s2 = Math.sin(ry);
  const c3 = Math.cos(rz), s3 = Math.sin(rz);
  const ce = c2 * c3, cf = c2 * s3, de = s2 * c3, df = s2 * s3;

  out[o + 0] = (ce + df * s1) * sx;
  out[o + 1] = (c1 * s3) * sx;
  out[o + 2] = (cf * s1 - de) * sx;
  out[o + 3] = 0;

  out[o + 4] = (de * s1 - cf) * sy;
  out[o + 5] = (c1 * c3) * sy;
  out[o + 6] = (df + ce * s1) * sy;
  out[o + 7] = 0;

  out[o + 8] = (c1 * s2) * sz;
  out[o + 9] = (-s1) * sz;
  out[o + 10] = (c1 * c2) * sz;
  out[o + 11] = 0;

  out[o + 12] = px;
  out[o + 13] = py;
  out[o + 14] = pz;
  out[o + 15] = 1;
  return out;
}

function valueNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uz);
}

/** Two octaves of value noise on the stable spatial hash, at BUILDING scale. */
export function macroNoise(x, z, cell) {
  const c = cell || BUILD.macroCell;
  return valueNoise(x / c, z / c) * 0.68 + valueNoise(x / (c * 0.41) + 13.7, z / (c * 0.41) - 7.1) * 0.32;
}

// ---------------------------------------------------------------------------
// THE POLISH PASS — every colour in the game goes through here.
// ---------------------------------------------------------------------------
export const isAccent = id => R.accentRegex.test(id);

/**
 * Pull an authored colour toward the base drab's CHROMA, at its own VALUE.
 *
 * The obvious implementation — lerp straight at `drab` — is wrong in a way that
 * takes a screenshot to see: it drags luminance as well as hue, so no chamber
 * can author a dark surface. THE INTAKE's first floor came out at display level
 * 60/255 with zero light in the room, and the whole premise ("your gun is the
 * only light") died in the unlit frame, because a "desaturation" pass had
 * quietly become a brightening pass.
 *
 * So: build the target by scaling drab to the SOURCE's luma, then blend. Both
 * endpoints carry the same luminance, chroma moves, value does not.
 */
export function polishColor(hex, amount) {
  const k = amount === undefined ? BUILD.desaturate : amount;
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  const dr = (R.drab >> 16) & 255, dg = (R.drab >> 8) & 255, db = R.drab & 255;
  const luma = (cr, cg, cb) => 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
  const dL = luma(dr, dg, db);
  const s = dL > 0 ? luma(r, g, b) / dL : 1;
  const clamp255 = v => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  return (clamp255(lerp(r, dr * s, k)) << 16)
    | (clamp255(lerp(g, dg * s, k)) << 8)
    | clamp255(lerp(b, db * s, k));
}

export const polishDetail = d => Math.max(BUILD.detailFloor, d === undefined ? 1 : d);

// ---------------------------------------------------------------------------
// SHAPES — pure geometry generators. Each returns typed arrays, so the collider
// proxy and the mesh come from ONE description and no browser is needed to test
// either.
//
// Conventions, so per-instance scale means the same thing everywhere:
//   uprights  span y in [0, 1], x/z in [-1, 1]  -> sy IS the height, sx/sz the radii
//   slabs     are centred, extent 1 on every axis -> s* ARE the half-extents
//   wall-facing pieces put their FRONT FACE at local z = 0 and grow to -z, so a
//   piece placed on the wall plane never intrudes past the barrier the player
//   actually collides with.
// ---------------------------------------------------------------------------

function mesher() { return { p: [], n: [], i: [], v: 0 }; }
function vert(m, x, y, z, nx, ny, nz) { m.p.push(x, y, z); m.n.push(nx, ny, nz); return m.v++; }
function tri(m, a, b, c) { m.i.push(a, b, c); }

/**
 * Emit a convex polygon with a known outward normal. The winding is derived from
 * the Newell normal and flipped to match, so no shape below has to reason about
 * face culling — a back-facing wall in a game with no ambient light is invisible
 * until a muzzle flash finds it, which is the worst possible time to discover it.
 */
function poly(m, pts, nx, ny, nz) {
  let ax = 0, ay = 0, az = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    ax += (p[1] - q[1]) * (p[2] + q[2]);
    ay += (p[2] - q[2]) * (p[0] + q[0]);
    az += (p[0] - q[0]) * (p[1] + q[1]);
  }
  const list = (ax * nx + ay * ny + az * nz) < 0 ? pts.slice().reverse() : pts;
  const idx = [];
  for (const p of list) idx.push(vert(m, p[0], p[1], p[2], nx, ny, nz));
  for (let i = 2; i < idx.length; i++) tri(m, idx[0], idx[i - 1], idx[i]);
}

const AXES = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/**
 * A chamfered box: 6 inset faces + 12 edge bevels + 8 corner triangles = 44
 * triangles. The bevels are not decoration — a hard 90-degree edge on a Lambert
 * surface produces a single luminance step, and the bevel is what turns it into
 * a highlight that reads as a real material under a moving muzzle light.
 */
function addBox(m, cx, cy, cz, hx, hy, hz, chamfer) {
  const h = [hx, hy, hz];
  const c = Math.min(chamfer === undefined ? BUILD.chamfer : chamfer, Math.min(hx, hy, hz) * 0.45);
  const o = [cx, cy, cz];
  // A vertex of the chamfered solid: full extent on `axis`, inset on the others.
  const P = (s, axis) => [
    o[0] + s[0] * (axis === 0 ? h[0] : h[0] - c),
    o[1] + s[1] * (axis === 1 ? h[1] : h[1] - c),
    o[2] + s[2] * (axis === 2 ? h[2] : h[2] - c),
  ];
  const S = (a, sa, b, sb, d, sd) => { const s = [0, 0, 0]; s[a] = sa; s[b] = sb; s[d] = sd; return s; };

  // Faces.
  for (let a = 0; a < 3; a++) {
    const u = (a + 1) % 3, v = (a + 2) % 3;
    for (const sa of [-1, 1]) {
      const pts = [
        P(S(a, sa, u, -1, v, -1), a), P(S(a, sa, u, 1, v, -1), a),
        P(S(a, sa, u, 1, v, 1), a), P(S(a, sa, u, -1, v, 1), a),
      ];
      poly(m, pts, AXES[a][0] * sa, AXES[a][1] * sa, AXES[a][2] * sa);
    }
  }

  // Edge bevels.
  const inv = Math.SQRT1_2;
  for (let a = 0; a < 3; a++) {
    for (let b = a + 1; b < 3; b++) {
      const d = 3 - a - b;
      for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
        const n = [0, 0, 0];
        n[a] = sa * inv; n[b] = sb * inv;
        const pts = [
          P(S(a, sa, b, sb, d, -1), a), P(S(a, sa, b, sb, d, 1), a),
          P(S(a, sa, b, sb, d, 1), b), P(S(a, sa, b, sb, d, -1), b),
        ];
        poly(m, pts, n[0], n[1], n[2]);
      }
    }
  }

  // Corner triangles.
  const k = 1 / Math.sqrt(3);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const s = [sx, sy, sz];
    poly(m, [P(s, 0), P(s, 1), P(s, 2)], sx * k, sy * k, sz * k);
  }
}

/** Composite: several chamfered boxes baked into one geometry. */
function boxes(list) {
  const m = mesher();
  for (const b of list) addBox(m, b[0], b[1], b[2], b[3], b[4], b[5], b[6]);
  return finish(m);
}

function finish(m) {
  return {
    position: Float32Array.from(m.p),
    normal: Float32Array.from(m.n),
    index: (m.v > 65535 ? Uint32Array : Uint16Array).from(m.i),
    verts: m.v,
    tris: m.i.length / 3,
  };
}

/**
 * A lathed upright: rings of {y, r} swept over `segments`, with flutes and ONE
 * asymmetric spine. The asymmetry is the entire point — per-instance yaw only
 * defeats automatic failure #10 if rotating the thing changes its silhouette,
 * and a plain cylinder is identical from every angle.
 */
function lathe(rings, segments, opts = {}) {
  const m = mesher();
  const seg = Math.max(BUILD.minSegments, segments | 0);
  const flute = opts.flute || 0;
  const fluteCount = opts.fluteCount || 6;
  const spine = opts.spine || 0;
  const spineAt = (opts.spineAt === undefined ? 1 : opts.spineAt) % seg;
  const jag = opts.jag || 0;
  const top = rings.length - 1;

  const rows = [];
  for (let ri = 0; ri < rings.length; ri++) {
    const row = [];
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * TAU;
      let r = rings[ri].r;
      if (flute) r -= flute * (0.5 - 0.5 * Math.cos(a * fluteCount));
      if (spine && s === spineAt) r += spine;
      let y = rings[ri].y;
      // A broken column: only the TOP ring is ragged, and it is ragged in a way
      // that is stable per segment, so yaw decides which side is tall.
      if (jag && ri === top) y -= jag * hash2(s * 1.7 + 0.3, 4.1);
      row.push([Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(a), 0, Math.sin(a)]);
    }
    rows.push(row);
  }

  const idx = rows.map(row => row.map(p => vert(m, p[0], p[1], p[2], p[3], p[4], p[5])));
  for (let ri = 0; ri < rows.length - 1; ri++) {
    for (let s = 0; s < seg; s++) {
      const s2 = (s + 1) % seg;
      tri(m, idx[ri][s], idx[ri][s2], idx[ri + 1][s2]);
      tri(m, idx[ri][s], idx[ri + 1][s2], idx[ri + 1][s]);
    }
  }

  // Closed caps. An open tube shows its inside the instant a flash gets under it.
  const cap = (ri, ny) => {
    const row = rows[ri];
    let sx = 0, sy = 0, sz = 0;
    for (const p of row) { sx += p[0]; sy += p[1]; sz += p[2]; }
    const centre = vert(m, sx / row.length, sy / row.length, sz / row.length, 0, ny, 0);
    const ring = row.map(p => vert(m, p[0], p[1], p[2], 0, ny, 0));
    for (let s = 0; s < seg; s++) {
      const s2 = (s + 1) % seg;
      if (ny > 0) tri(m, centre, ring[s], ring[s2]); else tri(m, centre, ring[s2], ring[s]);
    }
  };
  cap(top, 1);
  cap(0, -1);
  return finish(m);
}

export const SHAPES = Object.freeze({
  /** Floor-to-ceiling column. Unit height, unit radius, fluted, one spine. */
  column: (o = {}) => lathe([
    { y: 0.000, r: 1.14 }, { y: 0.022, r: 1.14 }, { y: 0.052, r: 1.00 },
    { y: 0.300, r: 0.965 }, { y: 0.620, r: 0.930 }, { y: 0.880, r: 0.905 },
    { y: 0.944, r: 0.985 }, { y: 0.972, r: 1.10 }, { y: 1.000, r: 1.10 },
  ], o.segments || 18, { flute: o.flute === undefined ? 0.055 : o.flute, fluteCount: 6, spine: 0.16, spineAt: 4 }),

  /** A broken column. Ragged top ring; yaw decides which side survived. */
  stub: (o = {}) => lathe([
    { y: 0.000, r: 1.16 }, { y: 0.032, r: 1.16 }, { y: 0.066, r: 1.00 },
    { y: 0.420, r: 0.955 }, { y: 0.780, r: 0.905 }, { y: 1.000, r: 0.860 },
  ], o.segments || 14, { flute: 0.05, fluteCount: 5, spine: 0.13, spineAt: 2, jag: o.jag === undefined ? 0.17 : o.jag }),

  /** The base skirt. This IS the grounding — automatic failure #5, contact. */
  collar: (o = {}) => lathe([
    { y: 0.000, r: 1.00 }, { y: 0.30, r: 0.760 }, { y: 0.62, r: 0.605 }, { y: 1.00, r: 0.560 },
  ], o.segments || 14, { flute: 0.02, fluteCount: 7, spine: 0.05, spineAt: 3 }),

  /** The capital, where a column meets the ceiling. Hides the joint. */
  capital: (o = {}) => lathe([
    { y: 0.000, r: 0.62 }, { y: 0.34, r: 0.80 }, { y: 0.62, r: 0.96 },
    { y: 0.80, r: 1.00 }, { y: 1.00, r: 0.94 },
  ], o.segments || 14, { flute: 0.03, fluteCount: 8, spine: 0.07, spineAt: 5 }),

  /** Ceiling beam segment: web, two flanges, a bolt ridge on ONE side. */
  beam: () => boxes([
    [0, 0, 0, 1, 0.62, 0.30, 0.05],
    [0, 0.78, 0, 1, 0.24, 0.62, 0.05],
    [0, -0.72, 0, 1, 0.28, 0.52, 0.05],
    [0, -0.10, 0.44, 0.86, 0.16, 0.12, 0.03],
  ]),

  /** Wall panel. FRONT FACE AT LOCAL z = 0; everything grows backwards. */
  panel: () => boxes([
    [0, 0, -0.44, 1, 1, 0.44, 0.05],
    [0, 0, -1.00, 0.92, 0.92, 0.18, 0.04],
    [0, -0.66, -0.30, 0.98, 0.10, 0.16, 0.03],
    [0.62, 0.20, -0.26, 0.13, 0.66, 0.16, 0.04],
  ]),

  /** Floor plate: flat, bevelled, one raised lip on one edge. */
  plate: () => boxes([
    [0, 0, 0, 1, 1, 1, 0.20],
    [0, 0.44, -0.86, 0.72, 0.56, 0.12, 0.05],
  ]),

  /** Rubble. Three lobes, no symmetry on any axis, BASE AT LOCAL y = 0. */
  chunk: () => boxes([
    [0, 0.74, 0, 1, 0.74, 0.86, 0.22],
    [0.52, 1.06, -0.24, 0.52, 0.46, 0.40, 0.16],
    [-0.34, 0.50, 0.44, 0.42, 0.32, 0.36, 0.14],
  ]),

  /** A kerb / cable channel run. */
  kerb: () => boxes([
    [0, 0, 0, 1, 1, 1, 0.18],
    [0, 0.62, 0, 0.94, 0.36, 0.44, 0.10],
  ]),

  /** Waist-high cover block. A real barrier, and what the cover nodes hide behind. */
  block: () => boxes([
    [0, 0, 0, 1, 1, 1, 0.10],
    [0, 0.92, 0, 0.82, 0.16, 0.86, 0.06],
    [-0.86, -0.34, 0, 0.20, 0.44, 0.94, 0.06],
  ]),

  /** A spawn portal: recessed frame plus five grate bars. FRONT AT z = 0. */
  portalFrame: () => {
    const list = [
      [-0.90, 0, -0.30, 0.16, 1.00, 0.30, 0.05],
      [0.90, 0, -0.30, 0.16, 1.00, 0.30, 0.05],
      [0, 0.90, -0.30, 0.90, 0.16, 0.30, 0.05],
      [0, -0.92, -0.30, 0.90, 0.14, 0.30, 0.05],
      [0, 0, -1.10, 1.00, 1.00, 0.16, 0.04],
    ];
    for (let i = 0; i < 5; i++) list.push([-0.70 + i * 0.35, 0, -0.72, 0.055, 0.80, 0.055, 0.02]);
    return boxes(list);
  },

  /** Ceiling duct run. Local x IS the run axis, like `beam`. */
  duct: () => boxes([
    [0, 0, 0, 1, 0.34, 0.34, 0.12],
    [0, 0.42, 0, 0.96, 0.10, 0.26, 0.05],
    [-0.55, 0, 0.30, 0.10, 0.42, 0.12, 0.04],
    [0.35, 0, -0.32, 0.10, 0.40, 0.12, 0.04],
  ]),

  /** A single quad. `face`: 'up' | 'down' | 'front'. Static surfaces only. */
  quad: (o = {}) => {
    const m = mesher();
    const f = o.face || 'up';
    if (f === 'up') poly(m, [[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1]], 0, 1, 0);
    else if (f === 'down') poly(m, [[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1]], 0, -1, 0);
    else poly(m, [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]], 0, 0, 1);
    return finish(m);
  },
});

// ---------------------------------------------------------------------------
// PLACERS — pure. Each returns {x, y, z, yaw, half?} seeds; per-instance
// variation is applied afterwards, uniformly, by `buildLayout`.
// ---------------------------------------------------------------------------

function axisPositions(half, spacing) {
  const n = Math.floor(half / spacing + 1e-9);
  const out = [];
  for (let i = -n; i <= n; i++) out.push(i * spacing);
  return out;
}

/**
 * Split a run of length `2*half` into `count` pieces whose widths vary but whose
 * sum is EXACTLY the run. This is how a wall gets per-instance width variation
 * without opening a seam — the naive version (scale each segment by a random
 * factor) is automatic failure #10 solved by creating a hole in the wall.
 */
function jitteredPartition(half, count, jitter, rng) {
  const w = new Array(count);
  let sum = 0;
  for (let i = 0; i < count; i++) { w[i] = 1 + rng.jitter(jitter); sum += w[i]; }
  const scale = (half * 2) / sum;
  const out = [];
  let c = -half;
  for (let i = 0; i < count; i++) {
    const width = w[i] * scale;
    out.push({ centre: c + width * 0.5, half: width * 0.5 });
    c += width;
  }
  return out;
}

export const PLACERS = Object.freeze({
  /** A centred lattice with per-point jitter. The pillar field. */
  lattice(p, rng) {
    const ox = p.offsetX || 0, oz = p.offsetZ || 0;
    const xs = p.xs || axisPositions(p.halfX, p.spacing).map(x => x + ox);
    const zs = p.zs || axisPositions(p.halfZ, p.spacingZ || p.spacing).map(z => z + oz);
    const j = p.jitter || 0;
    const out = [];
    for (const x of xs) for (const z of zs) out.push({ x: x + rng.jitter(j), y: p.y || 0, z: z + rng.jitter(j), yaw: 0 });
    return out;
  },

  /** The dual lattice — the cell centres of `lattice`. Fills its gaps. */
  latticeDual(p, rng) {
    const sx = p.spacing, sz = p.spacingZ || p.spacing;
    const xs = axisPositions(p.halfX, sx).slice(0, -1).map(x => x + sx * 0.5);
    const zs = axisPositions(p.halfZ, sz).slice(0, -1).map(z => z + sz * 0.5);
    const j = p.jitter || 0;
    const out = [];
    for (const x of xs) for (const z of zs) out.push({ x: x + rng.jitter(j), y: p.y || 0, z: z + rng.jitter(j), yaw: 0 });
    return out;
  },

  /**
   * Dart-thrown scatter with a minimum separation, accelerated by a uniform
   * grid. The naive version is O(candidates x accepted) — 520 chunks at eight
   * tries each is about a million distance tests and measured 4.2 ms on this
   * box, which is a whole frame budget spent on gravel. The grid makes it O(n).
   */
  scatter(p, rng) {
    const out = [];
    const min = p.minDist || 0;
    const min2 = min * min;
    const cell = min > 0 ? min : 1;
    const grid = new Map();
    const key = (cx, cz) => ((cx + 4096) * 8192) + (cz + 4096);
    const tries = p.count * (p.tries || 8);
    for (let t = 0; t < tries && out.length < p.count; t++) {
      const x = lerp(p.minX, p.maxX, rng.next());
      const z = lerp(p.minZ, p.maxZ, rng.next());
      const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
      if (min2 > 0) {
        let bad = false;
        for (let ox = -1; ox <= 1 && !bad; ox++) for (let oz = -1; oz <= 1 && !bad; oz++) {
          const b = grid.get(key(cx + ox, cz + oz));
          if (!b) continue;
          for (let i = 0; i < b.length; i++) {
            const dx = b[i].x - x, dz = b[i].z - z;
            if (dx * dx + dz * dz < min2) { bad = true; break; }
          }
        }
        if (bad) continue;
      }
      const pt = { x, y: p.y || 0, z, yaw: rng.next() * TAU };
      out.push(pt);
      const k = key(cx, cz);
      let bucket = grid.get(k);
      if (!bucket) { bucket = []; grid.set(k, bucket); }
      bucket.push(pt);
    }
    return out;
  },

  /**
   * A run of segments around a rectangular perimeter, facing INWARD, with gaps
   * where portals are. Segment widths come from `jitteredPartition`, so the wall
   * varies and still closes.
   */
  perimeter(p, rng) {
    const out = [];
    const sides = [
      { fixed: -p.halfZ, axis: 'x', half: p.halfX, yaw: 0 },
      { fixed: p.halfZ, axis: 'x', half: p.halfX, yaw: Math.PI },
      { fixed: -p.halfX, axis: 'z', half: p.halfZ, yaw: Math.PI * 0.5 },
      { fixed: p.halfX, axis: 'z', half: p.halfZ, yaw: -Math.PI * 0.5 },
    ];
    for (const s of sides) {
      const count = Math.max(1, Math.round((s.half * 2) / p.segment));
      const parts = jitteredPartition(s.half, count, p.widthJitter || 0, rng);
      for (const part of parts) {
        const x = s.axis === 'x' ? part.centre : s.fixed;
        const z = s.axis === 'x' ? s.fixed : part.centre;
        let blocked = false;
        for (const g of (p.gaps || [])) {
          if (Math.abs(g.x - x) <= (g.r + part.half) && Math.abs(g.z - z) <= (g.r + part.half)) { blocked = true; break; }
        }
        if (blocked) continue;
        out.push({ x, y: p.y || 0, z, yaw: s.yaw, half: part.half });
      }
    }
    return out;
  },

  /** Parallel runs across the ceiling, each chopped into varied segments. */
  runs(p, rng) {
    const out = [];
    const along = p.along === 'z' ? 'z' : 'x';
    const crossHalf = along === 'x' ? p.halfZ : p.halfX;
    const alongHalf = along === 'x' ? p.halfX : p.halfZ;
    const lines = axisPositions(crossHalf, p.spacing).map(c => c + (p.offset || 0));
    const count = Math.max(1, Math.round((alongHalf * 2) / p.segment));
    for (const c of lines) {
      const parts = jitteredPartition(alongHalf, count, p.widthJitter || 0, rng);
      for (const part of parts) {
        out.push({
          x: along === 'x' ? part.centre : c,
          y: p.y || 0,
          z: along === 'x' ? c : part.centre,
          yaw: along === 'x' ? 0 : Math.PI * 0.5,
          half: Math.max(0.05, part.half - (p.gap || 0)),
        });
      }
    }
    return out;
  },

  /**
   * Explicit authored points. Cover blocks, portals, anything hand-placed.
   * A point may carry its own sx/sy/sz, which OVERRIDE the element's random
   * scale range — an authored cover block is a specific size on purpose.
   */
  list(p) {
    return (p.points || []).map(pt => ({
      x: pt.x, y: pt.y || 0, z: pt.z, yaw: pt.yaw || 0, half: pt.half, tag: pt.tag,
      sx: pt.sx, sy: pt.sy, sz: pt.sz,
    }));
  },
});

// ---------------------------------------------------------------------------
// LAYOUT — the deterministic materialisation of every placement rule. PURE.
// This is what tests/world.mjs measures, headless, in milliseconds.
// ---------------------------------------------------------------------------

function rejectKeepOut(points, spec, element) {
  const tags = element.keepOut;
  if (!tags || !tags.length) return points;
  const zones = (spec.keepOuts || []).filter(k => tags.indexOf(k.id) !== -1);
  if (!zones.length) return points;
  return points.filter(pt => {
    for (const z of zones) {
      const dx = pt.x - z.x, dz = pt.z - z.z;
      if (dx * dx + dz * dz < z.r * z.r) return false;
    }
    return true;
  });
}

/**
 * Build every element's instance buffers. Deterministic: the same spec and the
 * same seed produce bit-identical arrays, which tests/world.mjs asserts by
 * running it twice and comparing every float.
 */
/**
 * ONE element's layout. Exported because the builder schedules these as separate
 * time slices: doing the whole layout in one job made a single 4.2 ms slice —
 * a build that is sliced everywhere except in one place is a build with a hitch
 * in one place, and it would have shipped invisible behind an averaged number.
 */
export function layoutElement(spec, el, rng, byId) {
  if (el.mode === 'static') return makeStaticLayout(el);
  const stream = rng.fork(`${spec.id}:${el.id}`);
  let raw;
  if (el.place.kind === 'list') raw = PLACERS.list(el.place);
  else if (el.place.kind === 'mirror') raw = mirrorPoints(byId, el);
  else raw = PLACERS[el.place.kind](el.place, stream);
  return makeInstanceLayout(el, rejectKeepOut(raw, spec, el), stream);
}

export function makeLayout(spec) {
  const layout = { id: spec.id, elements: [], instances: 0, colliders: 0 };
  layout.tally = () => {
    layout.instances = 0; layout.colliders = 0;
    for (const l of layout.elements) { layout.instances += l.count; if (l.collider) layout.colliders += l.count; }
    return layout;
  };
  return layout;
}

/** The whole layout in one call. `createBuilder` slices it instead. */
/**
 * Pay the layout path's JIT cost OUTSIDE the slice budget.
 *
 * The worst build job is a fixed 2.1-3.5 ms tiering cost on whichever
 * substantial layout job runs FIRST — it is not proportional to the work, and
 * splitting elements does not move it (measured across five configurations from
 * 180 to 530 instances). It lands inside a budgeted frame and blows the 4 ms
 * contract on the first chamber built in a session, every session.
 *
 * chambers/index.js already fades out for 0.55 s before it begins building, and
 * nothing else is competing for that window. One throwaway layout there moves the
 * cost to where the player is looking at a fade instead of at a dropped frame.
 *
 * Idempotent: the tier is per-page, so this is worth doing exactly once.
 */
let _layoutWarm = false;
export function warmLayoutPath(rng) {
  if (_layoutWarm) return false;
  _layoutWarm = true;
  // Shaped like a real element (see intake.js's pillar field) so it exercises the
  // same layout path the budgeted jobs will: the lattice placer, the per-instance
  // variation, the TRS compose. A probe that misses any of those warms nothing.
  const probe = {
    id: '__warm', seed: 1,
    elements: [{
      id: 'w', mode: 'instanced', shape: 'column', material: 'surface',
      color: 0x8a8f94, detail: 1,
      place: { kind: 'lattice', halfX: 12, halfZ: 12, spacing: 3, jitter: 0.4, y: 0 },
      vary: {
        scale: { x: [0.40, 0.56], y: [4, 5], z: [0.40, 0.56] },
        yaw: [0, Math.PI * 2], tiltMax: 0.009, tint: [0.84, 1.14], macro: 0.28,
      },
    }],
  };
  try { buildLayout(probe, rng); } catch { /* the warm-up must never be able to fail a build */ }
  return true;
}

export function buildLayout(spec, rng) {
  const layout = makeLayout(spec);
  const byId = new Map();
  for (const el of spec.elements) {
    const l = layoutElement(spec, el, rng, byId);
    layout.elements.push(l);
    byId.set(el.id, l);
  }
  return layout.tally();
}

/**
 * MIRROR — copy another element's RESOLVED instance positions. This is how a
 * base skirt lands on exactly its own pillar: not by re-running the same random
 * placement and hoping the streams line up, but by reading the transform that
 * was actually built. Two elements deriving the same jitter from the same seed
 * is precisely the kind of coupling that survives until somebody inserts one
 * extra rng call and every collar in the game slides half a metre.
 */
function mirrorPoints(byId, el) {
  const src = byId.get(el.place.of);
  if (!src) throw new Error(`build: element "${el.id}" mirrors "${el.place.of}", which is not built before it`);
  const out = new Array(src.count);
  for (let i = 0; i < src.count; i++) {
    const o = i * 9;
    out[i] = {
      x: src.trs[o], y: (el.place.y === undefined ? src.trs[o + 1] : el.place.y), z: src.trs[o + 2],
      yaw: el.place.keepYaw ? src.trs[o + 4] : 0,
      srcSX: src.trs[o + 6], srcSY: src.trs[o + 7], srcSZ: src.trs[o + 8],
    };
  }
  return out;
}

function makeStaticLayout(el) {
  const t = el.transform || {};
  const trs = new Float64Array([
    t.x || 0, t.y || 0, t.z || 0,
    t.rx || 0, t.ry || 0, t.rz || 0,
    t.sx === undefined ? 1 : t.sx, t.sy === undefined ? 1 : t.sy, t.sz === undefined ? 1 : t.sz,
  ]);
  const matrix = new Float32Array(16);
  composeTRS(matrix, 0, trs[0], trs[1], trs[2], trs[3], trs[4], trs[5], trs[6], trs[7], trs[8]);
  return { id: el.id, element: el, mode: 'static', count: 1, trs, matrix, tint: null, collider: el.collider || null, points: [] };
}

function makeInstanceLayout(el, pts, rng) {
  const n = pts.length;
  const trs = new Float64Array(n * 9);
  const matrix = new Float32Array(n * 16);
  const tint = new Float32Array(n * 4);
  const v = el.vary || {};
  const sc = v.scale || {};
  const tiltMax = v.tiltMax || 0;
  const tintLo = v.tint ? v.tint[0] : 0.86;
  const tintHi = v.tint ? v.tint[1] : 1.14;
  const macroAmount = v.macro === undefined ? BUILD.macroAmount : v.macro;
  const macroCell = v.macroCell || BUILD.macroCell;
  const warm = v.warm === undefined ? BUILD.tintWarmSpan : v.warm;

  for (let i = 0; i < n; i++) {
    const pt = pts[i];

    let sx = sc.x ? lerp(sc.x[0], sc.x[1], rng.next()) : 1;
    let sy = sc.y ? lerp(sc.y[0], sc.y[1], rng.next()) : 1;
    let sz = sc.z ? lerp(sc.z[0], sc.z[1], rng.next()) : 1;
    if (v.uniformXZ) sz = sx;
    // A mirrored element inherits its host's footprint, so a wide pillar gets a
    // wide skirt and a narrow one gets a narrow skirt.
    if (v.followScale && pt.srcSX !== undefined) { sx *= pt.srcSX; sz *= pt.srcSZ; }
    // A placer that sized an axis (a wall panel's own half-width, a beam
    // segment's half-length) OWNS that axis, so runs meet without a seam.
    if (pt.half !== undefined && v.halfAxis) {
      if (v.halfAxis === 'x') sx = pt.half; else if (v.halfAxis === 'y') sy = pt.half; else sz = pt.half;
    }
    // An authored point states its own size. Explicit beats random.
    if (pt.sx !== undefined) sx = pt.sx;
    if (pt.sy !== undefined) sy = pt.sy;
    if (pt.sz !== undefined) sz = pt.sz;

    let ry = pt.yaw || 0;
    if (v.yawQuantum) {
      const steps = Math.max(1, Math.round(TAU / v.yawQuantum));
      ry += Math.floor(rng.next() * steps) * v.yawQuantum + (v.yawFine ? rng.jitter(v.yawFine) : 0);
    } else if (v.yaw) {
      ry += lerp(v.yaw[0], v.yaw[1], rng.next());
    }
    const rx = tiltMax ? rng.jitter(tiltMax) : 0;
    const rz = tiltMax ? rng.jitter(tiltMax) : 0;
    // Anchoring runs AFTER the scale draw on purpose: a capital whose height
    // varies must still touch the ceiling, and a kerb whose height varies must
    // still touch the floor. Authoring a fixed y and a random height is how
    // props end up floating — automatic failure #5.
    let py = pt.y + (v.yOffset ? rng.jitter(v.yOffset) : 0);
    if (v.anchorTop !== undefined) py = v.anchorTop - sy;
    else if (v.anchorBottom !== undefined) py = v.anchorBottom + sy;

    const o9 = i * 9;
    trs[o9] = pt.x; trs[o9 + 1] = py; trs[o9 + 2] = pt.z;
    trs[o9 + 3] = rx; trs[o9 + 4] = ry; trs[o9 + 5] = rz;
    trs[o9 + 6] = sx; trs[o9 + 7] = sy; trs[o9 + 8] = sz;
    composeTRS(matrix, i * 16, pt.x, py, pt.z, rx, ry, rz, sx, sy, sz);

    // Tint = per-instance jitter x MACRO field. The macro term is the third
    // breakup scale, and it is what stops 600 rubble chunks reading as one
    // uniform gravel texture across a 50 m floor.
    const macro = (macroNoise(pt.x, pt.z, macroCell) - 0.5) * 2 * macroAmount;
    const k = clamp(lerp(tintLo, tintHi, rng.next()) * (1 + macro), 0.3, 1.9);
    const w = (rng.next() * 2 - 1) * warm;
    const o4 = i * 4;
    tint[o4] = k * (1 + w); tint[o4 + 1] = k; tint[o4 + 2] = k * (1 - w); tint[o4 + 3] = 1;
  }

  return { id: el.id, element: el, mode: el.mode, count: n, trs, matrix, tint, collider: el.collider || null, points: pts };
}

// ---------------------------------------------------------------------------
// COLLIDER BAKE — from the SAME Float32 matrices the GPU reads.
// ---------------------------------------------------------------------------
const IDENTITY16 = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const FLAG_OF = Object.freeze({
  barrier: COLLIDE.flags.barrier,
  support: COLLIDE.flags.support,
  ceiling: COLLIDE.flags.ceiling,
});

/**
 * Bake every element that declares a collider. `bakeObject` is collide.js's own
 * code path, reached through an InstancedMesh-shaped proxy, so the ribbon-mesh
 * refusal, the duplicate-proxy suppression and the {tag, chamber} record are
 * W2's — not a second copy of them living here and drifting.
 */
export function bakeLayout(colliders, spec, layout, chamberId) {
  let added = 0;
  const before = colliders.rejected.length;
  for (const el of layout.elements) {
    const c = el.collider;
    if (!c || el.count === 0) continue;
    let flags = 0;
    for (const f of (Array.isArray(c.flags) ? c.flags : [c.flags || 'barrier'])) flags |= FLAG_OF[f] || 0;
    added += bakeObject(colliders, {
      name: `${spec.id}-${el.id}`,
      userData: {
        tag: c.tag || COLLIDE.tag.prop,
        chamber: chamberId || spec.id,
        colliderHalf: c.half,
        colliderCenter: c.center || [0, 0, 0],
        traversalBarrier: (flags & COLLIDE.flags.barrier) !== 0,
        traversalSurface: (flags & COLLIDE.flags.support) !== 0,
        traversalCeiling: (flags & COLLIDE.flags.ceiling) !== 0,
      },
      matrixWorld: { elements: IDENTITY16 },
      isInstancedMesh: true,
      instanceMatrix: { array: el.matrix },
      count: el.count,
    }, chamberId || spec.id);
  }
  return { added, rejected: colliders.rejected.slice(before) };
}

// ---------------------------------------------------------------------------
// THE BUILDER — time-sliced, and the only part of this file that touches THREE.
// ---------------------------------------------------------------------------

function geometryFor(THREE, el) {
  const gen = SHAPES[el.shape];
  if (!gen) throw new Error(`build: element "${el.id}" names unknown shape "${el.shape}"`);
  const data = gen(el.shapeArgs || {});
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(data.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(data.normal, 3));
  g.setIndex(new THREE.BufferAttribute(data.index, 1));
  g.userData.tris = data.tris;
  return g;
}

function materialFor(render, el) {
  const colour = polishColor(el.color === undefined ? R.drab : el.color, el.polish);
  if (isAccent(el.id) || el.material === 'emissive') {
    return render.materials.emissiveUnlit({
      emissive: colour,
      intensity: el.emissive === undefined ? FEEL.enemies.stripEmissive.min : el.emissive,
    });
  }
  const opts = { color: colour, detail: polishDetail(el.detail) };
  return el.mode === 'instanced' ? render.materials.surfaceInstanced(opts) : render.materials.surfaceStatic(opts);
}

const now = () => ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());

/**
 * A time-sliced chamber build. `step(budgetMs)` runs jobs until the budget is
 * spent and returns true when the chamber is complete.
 *
 * GROUPED G10: the chamber build is the only window in this game where a
 * synchronous freeze is even possible, and it lands in the 20 s landing where
 * the player is standing still looking back down the shaft — which is precisely
 * where a hitch is most visible, not least.
 */
export function createBuilder(ctx, spec, opts = {}) {
  const THREE = opts.THREE || ctx.THREE;
  if (!THREE) throw new Error('build: ctx.THREE is missing — the builder needs the renderer namespace');
  const render = opts.render || ctx.render;
  if (!render || !render.materials) throw new Error('build: ctx.render.materials is missing — every surface comes from the render family');

  // derive(), not fork(): fork is memoised, so rebuilding a chamber would resume
  // the previous build's stream and lay out a different room. See core/rng.js.
  const rng = (opts.rng || ctx.rng).derive(`build:${spec.id}`);
  // NOT computed here. The layout is ~1100 instances of pure arithmetic and it
  // belongs INSIDE the slice budget like everything else — a build that is
  // sliced except for the one synchronous part at the front is a build with a
  // synchronous part at the front.
  let layout = null;

  const group = new THREE.Group();
  group.name = `chamber:${spec.id}`;

  const geometries = [];
  const materials = [];
  const meshes = [];
  const jobs = [];
  const stats = {
    draws: 0, instances: 0, triangles: 0, colliders: 0, rejected: 0,
    slices: 0, maxSliceMs: 0, maxJobMs: 0, worstJob: -1, buildMs: 0, geometries: 0, materials: 0,
  };

  let world = null;
  let done = false;
  let jobIndex = 0;

  // ---- the ground evaluator and the room's own walls ----------------------
  jobs.push(() => {
    layout = makeLayout(spec);
    const ground = ctx.systems && ctx.systems.get('ground');
    if (ground && typeof ground.load === 'function') {
      world = ground.load(spec.ground, { id: spec.id, walls: true });
    } else {
      world = { id: spec.id, ground: createGround(spec.ground), colliders: opts.colliders, stats: null };
    }
  });

  // ---- ONE JOB PER ELEMENT LAYOUT ----------------------------------------
  // `mirror` reads an element resolved before it, which is why these run in spec
  // order and why `byId` is filled as they go rather than up front.
  const byId = new Map();
  for (let ei = 0; ei < spec.elements.length; ei++) {
    const el = spec.elements[ei];
    jobs.push(() => {
      const l = layoutElement(spec, el, rng, byId);
      layout.elements[ei] = l;
      byId.set(el.id, l);
      layout.tally();
    });
  }

  // ---- one geometry + material + mesh per element -------------------------
  // Enumerated from the SPEC, not from the layout, because the layout does not
  // exist yet — the jobs above build it.
  for (let ei = 0; ei < spec.elements.length; ei++) {
    if (spec.elements[ei].mode === 'collider') continue;
    const index = ei;
    jobs.push(() => {
      const el = layout.elements[index];
      const geo = geometryFor(THREE, el.element);
      geometries.push(geo);
      const mat = materialFor(render, el.element);
      materials.push(mat);

      if (el.mode === 'static') {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.fromArray(el.matrix);
        mesh.matrixWorldNeedsUpdate = true;
        mesh.name = `${spec.id}:${el.id}`;
        mesh.layers.set(render.LAYERS.WORLD);
        group.add(mesh);
        meshes.push(mesh);
        stats.draws++;
        stats.instances++;
        stats.triangles += geo.userData.tris;
        return;
      }

      if (el.count === 0) { geometries.pop(); materials.pop(); geo.dispose(); mat.dispose(); return; }

      const ig = new THREE.InstancedBufferGeometry();
      ig.setAttribute('position', geo.getAttribute('position'));
      ig.setAttribute('normal', geo.getAttribute('normal'));
      ig.setIndex(geo.getIndex());
      ig.setAttribute('iMatrix', new THREE.InstancedBufferAttribute(el.matrix, 16));
      ig.setAttribute('iTint', new THREE.InstancedBufferAttribute(el.tint, 4));
      ig.instanceCount = el.count;
      // HANDOFF (W1-RENDER): an InstancedBufferGeometry is culled from the BASE
      // geometry's bounding sphere — as if the whole bucket sat at the origin.
      // One bucket IS the whole room, so culling it is all-or-nothing anyway;
      // refusing the cull is both correct and cheaper than a fake sphere.
      ig.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
      geometries.push(ig);

      const mesh = new THREE.Mesh(ig, mat);
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      mesh.name = `${spec.id}:${el.id}`;
      mesh.layers.set(render.LAYERS.WORLD);
      group.add(mesh);
      meshes.push(mesh);
      stats.draws++;
      stats.instances += el.count;
      stats.triangles += geo.userData.tris * el.count;
    });
  }

  // ---- colliders, then the scene attach and the scar projection -----------
  jobs.push(() => {
    const set = world && world.colliders;
    if (!set) return;
    bakeLayout(set, spec, layout, spec.id);
    stats.colliders = set.n;
    stats.rejected = set.rejected.length;
  });

  jobs.push(() => {
    ctx.scene.add(group);
    const m = BUILD.irradianceMargin;
    render.setChamberBounds(spec.bounds.minX - m, spec.bounds.minZ - m, spec.bounds.maxX + m, spec.bounds.maxZ + m);
    stats.geometries = geometries.length;
    stats.materials = materials.length;
  });

  const t0 = now();

  function step(budgetMs) {
    if (done) return true;
    const budget = budgetMs === undefined ? BUILD.sliceBudgetMs : budgetMs;
    const start = now();
    while (jobIndex < jobs.length) {
      const j0 = now();
      const index = jobIndex++;
      jobs[index]();
      const jms = now() - j0;
      // Per-job cost is published, not averaged away: the slice budget only
      // holds if no single job is fatter than the headroom left for it, and a
      // future chamber element that breaks that has to be visible, not silent.
      if (jms > stats.maxJobMs) { stats.maxJobMs = jms; stats.worstJob = index; }
      if (now() - start >= budget) break;
    }
    const ms = now() - start;
    stats.slices++;
    if (ms > stats.maxSliceMs) stats.maxSliceMs = ms;
    if (jobIndex >= jobs.length) { done = true; stats.buildMs = now() - t0; }
    return done;
  }

  function run() { while (!step(Infinity)) { /* to completion */ } return api; }

  function dispose() {
    if (group.parent) group.parent.remove(group);
    for (let i = meshes.length - 1; i >= 0; i--) group.remove(meshes[i]);
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    geometries.length = 0; materials.length = 0; meshes.length = 0;
    if (world && world.colliders) world.colliders.clear();
    done = true;
  }

  const api = {
    spec, group, stats,
    get layout() { return layout; },
    get world() { return world; },
    get meshes() { return meshes; },
    get geometries() { return geometries; },
    get materials() { return materials; },
    get done() { return done; },
    get progress() { return jobs.length ? Math.min(1, jobIndex / jobs.length) : 1; },
    get jobCount() { return jobs.length; },
    step, run, dispose,
  };
  return api;
}

/** Build to completion in one call. `verify()` and the leak test use this. */
export function buildChamber(ctx, spec, opts = {}) {
  return createBuilder(ctx, spec, opts).run();
}

export default buildChamber;
