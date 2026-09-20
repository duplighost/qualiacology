// Shared destination materials, projected in metres rather than stretched per mesh.
// The offline bake stores nine albedos and five structural heights at 512 square,
// followed by measured physical channels and normals for the steel/plaster scans.
// Shared shader code adds world-space weathering, building-foot damp,
// horizontal mineral paving, rain pooling and snow relief without new draw calls.
//
// At the default four-metre projection: irregular stone courses, weatherboards
// 25 cm, scanned corrugations 13 cm and chipped lime render. Wear stays subordinate
// to those structures; stains never double as a height field.
import * as THREE from 'three';
import { SURFACE_RELIEF_GLSL } from './surface-relief.js';

const SIZE = 512;
const COLOR_STYLES = ['timber', 'stone', 'mossStone', 'metal', 'industrial', 'plaster', 'salt', 'avery', 'naturalRock'];
const HEIGHT_STYLES = ['timber', 'stone', 'metal', 'plaster', 'naturalRock'];
const BASE_BYTES = SIZE * SIZE * 32;
const SCAN_BYTES = 8 + SIZE * SIZE * 10;
let prebaked = null, preload = null;

// These maps are deterministic and need not run millions of noise samples on every
// visit. tools/bake-place-surfaces.mjs stores their exact RGB/height bytes losslessly.
// Load beside the terrain scans, before the synchronous place builders need textures.
export async function preloadPlaceSurfaceLibrary() {
  if (typeof document === 'undefined' || typeof DecompressionStream === 'undefined') return false;
  if (!preload) preload = (async () => {
    const url = new URL('../../assets/materials/place-surfaces-v1.bin.gz', import.meta.url);
    const response = await fetch(url);
    if (!response.ok) throw new Error('place surfaces: asset HTTP ' + response.status);
    const bytes = new Uint8Array(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    if (bytes.length !== BASE_BYTES + SCAN_BYTES) throw new Error('place surfaces: invalid baked data length');
    if (String.fromCharCode(...bytes.subarray(BASE_BYTES, BASE_BYTES + 8)) !== 'PSCAN001') {
      throw new Error('place surfaces: invalid scan channel header');
    }
    prebaked = bytes;
    return true;
  })();
  return preload;
}
const TAU = Math.PI * 2;

const STYLE_BY_KIND = Object.freeze({
  station: 'industrial',
  manor: 'plaster',
  avery: 'avery',
  works: 'stone',
  relay: 'metal',
  cathedral: 'stone',
  planetarium: 'stone',   // ROUND 22: concrete and render, the science centre at Morning
  chapel: 'timber',
  steeple: 'timber',
  lighthouse: 'salt',
  mill: 'timber',
  cemetery: 'mossStone',
  tower: 'stone',
  barn: 'timber',
  stones: 'mossStone',
  'great-tree': 'timber',
  'rock-arch': 'stone',
  holdfast: 'stone',
  // ROUND 18: concrete barriers, a steel gantry and a prefab booth. The station's family.
  checkpoint: 'industrial',
  glasshouse: 'metal',
  'bell-vault': 'mossStone',
  'red-quarry': 'naturalRock',
  // The Cut is a hamlet in a worked stone face: cottages, terraces, kiln and gate piers are
  // stone. With no row it fell back to timber and read as a wooden fort (round 3 critic).
  'quarry-cut': 'stone',
});

function wrap(v, n) { return ((v % n) + n) % n; }

function hash2(x, y, salt = 0) {
  let n = Math.imul((x | 0) + 0x51ed + salt, 0x45d9f3b) ^
    Math.imul((y | 0) - 0x6c8e - salt, 0x119de1f3);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967295;
}

function smooth(t) { return t * t * (3 - 2 * t); }

/* --------------------------------------------------------------------------
   NOISE.

   The old valueNoise called hash2 four times per sample — three imuls each — and every
   family sampled it five or six times per texel. At 256 px that was 206 ms of boot for
   twelve images (measured). Four times the pixels at that cost would have been most of a
   second, so the lattice is built ONCE per (cellsX, cellsY, salt) and sampled out of a
   Float32Array. Same numbers, and it is what pays for 512.

   It is also ANISOTROPIC now, which is the whole reason timber grain can run along a board:
   cellsX and cellsY are independent. Neither has to divide SIZE — gx = x*cx/SIZE reaches
   exactly cx at x=SIZE and wraps to 0 — so a 21-rib sheet and a 13-course wall both tile.
   -------------------------------------------------------------------------- */
const LATTICE = new Map();
function lattice(cx, cy, salt) {
  const key = (cx * 4096 + cy) * 65536 + (salt & 0xffff);
  let g = LATTICE.get(key);
  if (g === undefined) {
    g = new Float32Array(cx * cy);
    for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) g[j * cx + i] = hash2(i, j, salt);
    LATTICE.set(key, g);
  }
  return g;
}

function noise(x, y, cx, cy, salt) {
  const g = lattice(cx, cy, salt);
  const gx = x * cx / SIZE, gy = y * cy / SIZE;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = smooth(gx - x0), fy = smooth(gy - y0);
  const xa = ((x0 % cx) + cx) % cx, xb = xa + 1 === cx ? 0 : xa + 1;
  const ya = ((y0 % cy) + cy) % cy, yb = ya + 1 === cy ? 0 : ya + 1;
  const ra = ya * cx, rb = yb * cx;
  const a = g[ra + xa], b = g[ra + xb], c = g[rb + xa], d = g[rb + xb];
  const ab = a + (b - a) * fx;
  return ab + ((c + (d - c) * fx) - ab) * fy;
}

/** Two octaves. One call site's worth of arithmetic, written out so it does not allocate. */
function fbm2(x, y, cx, cy, salt) {
  return noise(x, y, cx, cy, salt) * 0.6667 + noise(x, y, cx * 2, cy * 2, salt + 101) * 0.3333;
}

/* --------------------------------------------------------------------------
   THE MASONRY TABLES.

   A wall is not a grid. Eleven courses whose heights are hashed, not equal; within each
   course a run of stones whose widths are hashed, not equal; and roughly one course in four
   laid in stones nearly twice as wide, which is the second frequency that stops a castle
   reading as one block size. Both tables are normalised to land on exactly SIZE so the tile
   is seamless, and each course is then rotated by its own hashed shift so the tile's own
   vertical edge is not a continuous joint running the full height of a forty-metre wall.

   edgeX / EDGE_Y hold the distance in texels from the nearest joint. The colour and the
   height images read the SAME tables, so the bump lines up with the mortar instead of
   approximating it, and the arris darkening (the dirt and contact shadow in the last few
   millimetres before a joint) is one array lookup rather than a second pattern.
   -------------------------------------------------------------------------- */
const COURSE_N = 11;
const COURSES = [];
const ROW_OF = new Uint8Array(SIZE);
const EDGE_Y = new Uint8Array(SIZE);

function buildMasonry() {
  const raw = new Float32Array(COURSE_N);
  let sum = 0;
  for (let i = 0; i < COURSE_N; i++) { raw[i] = 0.64 + hash2(i, 3, 907) * 0.84; sum += raw[i]; }
  const hs = new Int32Array(COURSE_N);
  let acc = 0;
  for (let i = 0; i < COURSE_N; i++) { hs[i] = Math.max(18, Math.round(raw[i] / sum * SIZE)); acc += hs[i]; }
  hs[COURSE_N - 1] += SIZE - acc;

  let y0 = 0;
  for (let i = 0; i < COURSE_N; i++) {
    const h = hs[i];
    const big = hash2(i, 11, 1319) > 0.72;          // the second frequency
    const base = big ? 164 : 92;                    // substantial dressed stone, with occasional long headers
    const n = Math.max(3, Math.round(SIZE / base));
    const rw = new Float32Array(n);
    let s2 = 0;
    for (let j = 0; j < n; j++) { rw[j] = 0.58 + hash2(i * 97 + j, 5, 2311) * 1.05; s2 += rw[j]; }
    const cuts = new Int32Array(n + 1);
    let a2 = 0;
    for (let j = 0; j < n; j++) { a2 += Math.max(14, Math.round(rw[j] / s2 * SIZE)); cuts[j + 1] = a2; }
    for (let j = 1; j < n; j++) cuts[j] = Math.round(cuts[j] * SIZE / a2);
    cuts[n] = SIZE;

    const shift = Math.floor(hash2(i, 13, 3671) * SIZE);
    const blockOf = new Uint8Array(SIZE), edgeX = new Uint8Array(SIZE);
    for (let j = 0; j < n; j++) {
      const lo = cuts[j], hi = cuts[j + 1];
      for (let t = lo; t < hi; t++) {
        const x = (t + shift) % SIZE;
        blockOf[x] = j;
        const e = Math.min(t - lo, hi - 1 - t);
        edgeX[x] = e > 255 ? 255 : e;
      }
    }
    for (let k = 0; k < h; k++) ROW_OF[y0 + k] = i;
    COURSES.push({ y0, h, blockOf, edgeX });
    y0 += h;
  }
  for (let y = 0; y < SIZE; y++) {
    const c = COURSES[ROW_OF[y]];
    const e = Math.min(y - c.y0, c.y0 + c.h - 1 - y);
    EDGE_Y[y] = e > 255 ? 255 : e;
  }
}
buildMasonry();

/* --------------------------------------------------------------------------
   THE BOARD TABLE. Sixteen boards of 32 texels — 25 cm of clapboard at 4 m/tile, where the
   old 32 texels at 256 was a 50 cm plank, which is a beam. Each board carries its own tone,
   two butt joints (board stock is 1.5-3.5 m, so one tile of wall has two of them), and up to
   two knots. Knots are the single feature that reads as "wood" at two metres and the old
   timber had none.
   -------------------------------------------------------------------------- */
const BOARD_H = 32;
const BOARD_N = SIZE / BOARD_H;
const BOARDS = [];

function buildBoards() {
  for (let r = 0; r < BOARD_N; r++) {
    const j0 = Math.floor(hash2(r, 1, 5501) * SIZE);
    let j1 = Math.floor(hash2(r, 2, 5501) * SIZE);
    if (Math.abs(j1 - j0) < 96) j1 = (j0 + 190 + Math.floor(hash2(r, 3, 5501) * 140)) % SIZE;
    const knots = [];
    const kn = hash2(r, 4, 6607) > 0.42 ? (hash2(r, 5, 6607) > 0.68 ? 2 : 1) : 0;
    for (let k = 0; k < kn; k++) {
      knots.push({
        x: Math.floor(hash2(r, 10 + k, 7717) * SIZE),
        y: 9 + hash2(r, 20 + k, 7717) * (BOARD_H - 18),
        r: 4.5 + hash2(r, 30 + k, 7717) * 4.5,
      });
    }
    BOARDS.push({ tone: (hash2(r, 7, 8123) - 0.5) * 26, j0, j1, knots });
  }
}
buildBoards();

/** Signed x distance across the tile seam, so a knot or a joint at x=3 is 5 from x=510. */
function dxWrap(a, b) {
  let d = a - b;
  if (d > SIZE / 2) d -= SIZE; else if (d < -SIZE / 2) d += SIZE;
  return d;
}

/** Grain lines 4.3 texels apart — 3.3 cm at the default 4 m per tile. Wider than the 2.7 cm
 *  first tried, because at 4.3 texels a line survives one mip level and at 3.4 it does not. */
const TIMBER_LINE = 120;

/* --------------------------------------------------------------------------
   PAINT LOSS, PER BOARD — ROUND 17.

   The old peel was fbm2(x, y, 9, 9): a field continuous in y, so one 45 cm island of bare
   wood ran across five boards and over the lap shadows between them without noticing they
   were there. In a 2x2 dump it read as brown camouflage, which is the single worst thing in
   this library and it is on every barn, chapel, mill and steeple in the county.

   Boards are separate pieces of wood with separate paint. Sampling the field at
   `edge + row * 137` gives each board its own slice of the noise — 137 is not a multiple of
   the cell size, so no two boards get the same one — and the field is DISCONTINUOUS at every
   board boundary, which is exactly right: the discontinuity is hidden under the lap shadow
   that is drawn there anyway. 7 x 40 cells makes an island about 60 cm long and 10 cm high,
   which is the shape paint comes off a weatherboard in.
   -------------------------------------------------------------------------- */
const PEEL_T = 0.662;
function timberPeel(x, row, edge) { return fbm2(x, edge + row * 137, 7, 40, 97); }

// Rising damp belongs to the building's actual foot. It is now applied in world
// space by the material shader, so it cannot repeat every four metres upstairs.
function tideline() { return 0; }

/* --------------------------------------------------------------------------
   COLOUR.

   Every family keeps the mean luminance it had before this pass, within a few counts. That
   is deliberate and it is not cosmetic: places.js multiplies these maps by vertex colours in
   the 0.03-0.05 range (FX_STONE, FX_WOOD ...), so the image is a DETAIL term on an almost
   black base and its mean is the building's brightness in the county. Changing it here would
   silently relight every destination. Structure changed; value did not.
   -------------------------------------------------------------------------- */

function stonePixel(x, y, moss) {
  const ci = ROW_OF[y];
  const c = COURSES[ci];
  const ex = c.edgeX[x], ey = EDGE_Y[y];
  const e = (ex < ey ? ex : ey) + (noise(x, y, 74, 74, 4811) - 0.5) * 1.35;

  const broad = noise(x, y, 8, 8, 11);
  const grit = noise(x, y, 96, 96, 29);
  const face = noise(x, y, 26, 26, 353);   // 15 cm blotches: weathering across one stone

  // RISING DAMP. v=0 is the foot of the wall (projectPlaceSurfaceUVs maps local y straight
  // to v, and DataTexture does not flip), so the bottom of the image really is the bottom of
  // the building. Sixty centimetres of it, on a ragged tideline — see tideline().
  const damp = tideline(x, y, 78, 71);
  const foot = y < 96 ? 1 - y / 96 : 0;                   // moss climbs higher than the wet

  if (e < 1.15) {
    // Not every joint is full. A castle has repointed lengths, blown lengths and lengths
    // where the mortar has washed back into the wall, and one flat grey for all of them was
    // the thing that made the round 16 dump read as a garden wall from a catalogue.
    // and about two joints in five have lost mortar altogether, which is the dark shadow
    // that stops a curtain wall reading as one machined grid. Measured: stone stdev 37.0 -> 40.2
    // at a mean 1.5 counts under round 16, which is inside the value law.
    const jv = (hash2(ci, c.blockOf[x], 5501) - 0.5) * 44 - Math.max(0, noise(x, y, 12, 12, 5507) - 0.60) * 90;
    const v = 147 + jv * 0.52 + broad * 22 + (grit - 0.5) * 10 - damp * 22;
    let r = v, g = v - 1, b = v - 4;
    if (moss) {
      const m = Math.min(1, (0.62 + foot * 0.5) * Math.max(0, noise(x, y, 7, 7, 113) - 0.40) * 2.1);
      r -= m * 46; g -= m * 20; b -= m * 42;
    }
    return [r, g, b];
  }

  const id = c.blockOf[x];
  const tone = (hash2(id, ci, 4801) - 0.5) * 48;
  const warm = (hash2(id, ci, 907) - 0.5) * 20;
  // and a minority of stones are simply soaked, or were replaced with something darker. The
  // top 28% of the hash, graded so there is no hard population split.
  const dark = Math.max(0, hash2(id, ci, 6151) - 0.72) * 3.57;
  let v = 219 + tone - dark * 26 + (broad - 0.5) * 20 + (face - 0.5) * 38 + (grit - 0.5) * 16 + (hash2(x, y, 61) - 0.5) * 9;
  if (e < 5) v -= (1 - (e - 1.15) / 3.85) * 22;
  // A cleft face retains directional bedding. It carries a restrained mineral
  // figure in colour and the same shallow ridges in the height field below.
  v += (noise(x + broad * 8, y, 3, 74, 4871) - 0.5) * 12;
  const chip = noise(x, y, 64, 64, 131);
  if (chip > 0.80 && e < 18) v -= (chip - 0.80) * 200;    // a broken face

  // WATER OFF THE BED JOINT. Rain leaves a wall at its joints and tracks down the stone
  // under them, so the stain starts at a feature you can see rather than at a column the
  // noise picked. +y is up, so the joint above this texel is the top of its own course and
  // `drop` is how far under it we are.
  const drop = c.y0 + c.h - y;
  const weep = Math.exp(-drop / 22) * Math.max(0, noise(x, y, 22, 3, 233) - 0.46) * 2.4;

  let r = v + warm * 0.8, g = v, b = v - 5 - warm * 0.6;
  r -= weep * 34 + damp * 60; g -= weep * 31 + damp * 52; b -= weep * 26 + damp * 43;
  if (moss) {
    // moss lives in the joint and at the foot, which is where it lives on a real wall — the
    // old growth was thresholded noise scattered over the middle of the face.
    const cling = (e < 7 ? 0.55 * (1 - e / 7) : 0) + foot * 0.55;
    const m = Math.min(1, cling * Math.max(0, noise(x, y, 7, 7, 113) - 0.40) * 2.4);
    r -= m * 104; g -= m * 52; b -= m * 92;
  }
  return [r, g, b];
}

function timberPixel(x, y) {
  const row = (y / BOARD_H) | 0;
  const B = BOARDS[row];
  const edge = y - row * BOARD_H;

  // GRAIN ALONG THE BOARD. Anisotropic: five cells across the tile, eighty down it, so a
  // feature is a hundred texels long and six high. Ridged and raised to the fourth so what
  // is left is the dark lines of the grain rather than a wash.
  //
  // ROUND 17 adds the SECOND frequency. One ridged octave at 102 x 6 texels is the cathedral
  // figure and it reads at ten metres, but at two metres a plank's surface is a set of lines
  // about two and a half centimetres apart, and with only the coarse octave the board read as
  // a smooth wash with a smudge in it. TIMBER_LINE is 3.4 texels tall — 2.7 cm at 4 m/tile —
  // and it is the frequency that makes a plank look sawn rather than moulded.
  const gr = fbm2(x, y, 5, 80, 4327);
  const ridge = 1 - Math.abs(2 * gr - 1);
  const rid2 = ridge * ridge;
  const lin = noise(x, y, 3, TIMBER_LINE, 4451);
  const lr = 1 - Math.abs(2 * lin - 1);
  const lr3 = 0.5 - lr;              // SIGNED: light line, dark line, mean unchanged
  const broad = noise(x, y, 6, 12, 17);

  let v = 215 + B.tone + (broad - 0.5) * 16 + (gr - 0.5) * 15
    - rid2 * rid2 * 40 + lr3 * 42 + (hash2(x, y, 43) - 0.5) * 8;

  for (let k = 0; k < B.knots.length; k++) {
    const K = B.knots[k];
    const dx = dxWrap(x, K.x), dy = (edge - K.y) * 1.9;
    const d = Math.sqrt(dx * dx + dy * dy);
    const rad = K.r * 2.4;
    if (d < rad) {
      v -= (0.5 + 0.5 * Math.cos(d * 1.7)) * 24 * (1 - d / rad);
      if (d < K.r) v -= (1 - d / K.r) * 58;
    }
  }

  if (edge < 3) v = 74 + broad * 26;                       // the gap between boards
  else if (edge < 10) v -= (1 - (edge - 3) / 7) * 42;      // the shadow under the lap

  const dj = Math.min(Math.abs(dxWrap(x, B.j0)), Math.abs(dxWrap(x, B.j1)));
  if (edge >= 3) {
    if (dj < 2) v -= 76;                                   // the butt join
    else if (dj < 6) v -= (1 - (dj - 2) / 4) * 20;
  }

  const damp = tideline(x, y, 70, 349);                    // the bottom board sits in the wet

  let r = v, g = v - 4, b = v - 9;
  const peel = timberPeel(x, row, edge);
  if (peel > PEEL_T && edge >= 3) {
    // A HARD EDGE. The old ramp was (peel-t)*5.5, which spread the boundary over about
    // thirty texels: paint does not fade into bare wood over twenty-three centimetres, it
    // stops. *34 is a boundary three or four texels wide. And the bare patch is not a flat
    // subtraction any more — weathered timber shows MORE grain than the paint over it, so
    // the exposed wood is rebuilt from the same two grain octaves.
    const p = Math.min(1, (peel - PEEL_T) * 34);
    const bare = 118 + (gr - 0.5) * 42 - rid2 * rid2 * 54 + lr3 * 46 + (broad - 0.5) * 22;
    r += (bare + 5 - r) * p; g += (bare - 3 - g) * p; b += (bare - 13 - b) * p;
  } else if (peel > PEEL_T - 0.028 && edge >= 3) {
    v += (peel - (PEEL_T - 0.028)) * 430; r = v; g = v - 4; b = v - 9; // the paint's lip
  }
  r -= damp * 44; g -= damp * 40; b -= damp * 34;
  return [r, g, b];
}

/* Cladding. RIBS ribs across the tile — 19 cm pitch — a 1 m sheet cover width, and a
   fastener line every 66 cm. The streaks now START AT THE FASTENERS and run DOWN from them,
   which is what a rust streak is; the old ones started at a noise-picked column and got
   stronger with height for no reason anything on the wall could explain. */
const RIBS = 21;
const PANEL = SIZE / 4;
const BOLT_PITCH = SIZE / 6;

function metalBolt(x, y) {
  const above = Math.ceil((y + 0.5) / BOLT_PITCH) * BOLT_PITCH;
  const crownIdx = Math.round(x * RIBS / SIZE);
  const dx = dxWrap(x, crownIdx * SIZE / RIBS);
  const has = hash2(crownIdx % RIBS, Math.round(above / BOLT_PITCH), 6011) > 0.34;
  return { has, dx, drop: above - y, at: above };
}

function metalPixel(x, y, industrial) {
  const rib = 0.5 + 0.5 * Math.cos(TAU * x * RIBS / SIZE);
  const broad = noise(x, y, 8, 8, 23);
  const pits = noise(x, y, 80, 80, 89);
  let v = 186 + rib * 46 + (broad - 0.5) * 18;

  const px = wrap(x, PANEL);
  if (px < 3) v -= 64;                                     // the sheet lap
  else if (px < 9) v -= (1 - (px - 3) / 6) * 26;
  if (pits > 0.86) v -= 34;

  const B = metalBolt(x, y);
  let streak = 0;
  if (B.has) {
    const w = Math.abs(B.dx) < 5.5 ? 1 - Math.abs(B.dx) / 5.5 : 0;
    streak = w * Math.exp(-B.drop / 74) * (0.5 + 0.5 * noise(x, 0, 64, 2, 157));
    const bd = Math.sqrt(B.dx * B.dx + B.drop * B.drop);
    if (bd < 3.4) v += 15 - bd * 3;                        // the washer, proud and lit
  }
  const seam = px < 6 ? (1 - px / 6) : 0;
  const foot = tideline(x, y, 64, 191);                    // the sheet rots from the ground up
  const patch = Math.max(0, noise(x, y, 12, 12, 131) - 0.72) * 2.4;
  const rust = Math.min(1, streak * 1.15
    + seam * noise(x, y, 14, 14, 181) * 0.9
    + foot
    + patch);

  // Muted iron oxide, not traffic-cone orange: the old rust took forty per cent of the wall
  // at full chroma and it was the brightest thing in a night frame.
  let r = v - rust * 46, g = v - rust * 88, b = v - rust * 114;
  if (industrial) {
    const soot = Math.max(0, noise(x, y, 5, 5, 211) - 0.50) * 1.6 * (0.3 + 0.7 * y / SIZE);
    r -= soot * 100; g -= soot * 104; b -= soot * 100;     // soot rises
  }
  return [r, g, b];
}

/* --------------------------------------------------------------------------
   THE CRACK MAP.

   The old cracks were |wrap(x + 0.57y + k, 109) - 54.5| — a modulus comb, so every crack in
   the county ran at the same angle and repeated four times across a wall. This is the level
   set of a smooth field, normalised by its own gradient so the line keeps a constant width
   instead of pooling where the field is flat. Cracks meander, fork where two cells meet and
   never repeat inside a tile. It costs six noise samples per texel, so it is computed once
   into a byte per texel and shared by plaster, salt, avery and the plaster height image.
   -------------------------------------------------------------------------- */
let CRACK = null;
function crackMap() {
  if (CRACK) return CRACK;
  CRACK = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // ROUND 17 — THE DOMAIN WARP. The level set of a four-cell field is smooth, and in the
      // dump the cracks read as three-metre pen strokes: a contour map, not a failure in
      // render. A crack is not smooth. Displacing the sample point by a 48-cell noise before
      // the field is evaluated makes the line wander by up to seven texels with an eleven
      // texel wavelength — 5 cm of deviation every 8 cm — which is a crack's own scale, and
      // it forks where the warp folds. Two extra noise samples per texel, and this map is
      // built once and shared by plaster, salt, avery and the plaster height image.
      const wx = x + (noise(x, y, 48, 48, 617) - 0.5) * 14;
      const wy = y + (noise(x, y, 48, 48, 619) - 0.5) * 14;
      const n0 = fbm2(wx, wy, 4, 4, 613);
      const gx = (fbm2(wx + 2, wy, 4, 4, 613) - n0) * 0.5;
      const gy = (fbm2(wx, wy + 2, 4, 4, 613) - n0) * 0.5;
      const g = Math.sqrt(gx * gx + gy * gy) + 1e-5;
      const d = Math.abs(n0 - 0.5) / g;
      CRACK[y * SIZE + x] = d > 255 ? 255 : d;
    }
  }
  return CRACK;
}

/** The wall behind the render: 21 x 6.5 cm brick, warm and much darker than lime. */
function substrate(x, y) {
  const rowH = 9, bw = 28;
  const row = (y / rowH) | 0;
  const yy = y - row * rowH;
  const xx = wrap(x + (row & 1) * 14, bw);
  const n = noise(x, y, 48, 48, 271);
  if (yy < 2 || xx < 2) { const m = 92 + n * 24; return [m, m - 2, m - 7]; }
  const t = (hash2((x / bw) | 0, row, 331) - 0.5) * 28;
  const v = 136 + t + (n - 0.5) * 20;
  return [v + 18, v - 4, v - 17];
}

// Render fails in a few connected patches. A fine chipped boundary belongs to a
// broad failure; independent metre-wide blobs in every repeat read as wallpaper.
function plasterLoss(x, y) {
  return fbm2(x, y, 3, 3, 67) + (noise(x, y, 31, 31, 673) - 0.5) * 0.052;
}

function plasterPixel(x, y, salt) {
  const trowel = fbm2(x, y, 5, 3, salt ? 181 : 31);        // long sweeps of the float
  const grit = noise(x, y, 110, 110, 53);
  const fine = hash2(x, y, salt ? 19 : 7);
  let v = 221 + (trowel - 0.5) * 26 + (grit - 0.5) * 9 + (fine - 0.5) * 10;

  const damp = tideline(x, y, 86, 149);

  const peel = plasterLoss(x, y);
  let r, g, b;
  if (peel > 0.665) {
    // A HARD EDGE, and a shadow in the step. Render is a 12 mm skin: where it has come off
    // the wall you see brick, and you see it immediately. The old *7 spread that transition
    // over about thirty texels — twenty-three centimetres of render dissolving into brick —
    // which is what made the round 16 plaster read as camouflage rather than as damage.
    const p = Math.min(1, Math.max(0, (peel - 0.665) * 72));
    const s = substrate(x, y);
    r = v + (s[0] - v) * p; g = v + (s[1] - v) * p; b = v + (s[2] - v) * p;
    if (p < 0.42) { const l = (1 - p / 0.42) * 26; r -= l; g -= l; b -= l * 0.92; }
  } else {
    if (peel > 0.645) v += (peel - 0.645) * 220;
    r = v; g = v - 2; b = v - 6;
    // WATER OUT OF THE HOLE. A wall with the render off it wets through, and the water leaves
    // at the bottom of the bare patch and runs down the sound render below. One extra sample
    // of the SAME peel field twenty-two texels (17 cm) up the wall: if the wall is bare up
    // there, this texel is under a hole. It is the plaster family's version of the stone's
    // weep and the cladding's bolt streak, and it is the last of the four families whose
    // drips started at a column the noise picked rather than at a thing you can see.
    const over = plasterLoss(x, y + 22);
    const run = Math.min(1, Math.max(0, (over - 0.652) * 24))
      * Math.max(0, noise(x, y, 24, 3, 383) - 0.42) * 2.0;
    r -= run * 42; g -= run * 39; b -= run * 33;
  }

  const cd = crackMap()[y * SIZE + x];
  const stress = Math.min(1, Math.max(0, (peel - 0.43) * 4.5));
  if (cd < 1) { r -= 48 * stress; g -= 47 * stress; b -= 45 * stress; }
  else if (cd < 3) { const t = (1 - (cd - 1) / 2) * stress; r -= 10 * t; g -= 10 * t; b -= 9 * t; }

  r -= damp * (salt ? 66 : 52); g -= damp * (salt ? 52 : 47); b -= damp * (salt ? 44 : 41);
  if (salt && fine > 0.975) { r = 254; g = 253; b = 246; } // salt bloom off the sea
  return [r, g, b];
}

function averyPixel(x, y) {
  const base = plasterPixel(x, y, false);
  const cd = crackMap()[y * SIZE + x];
  const damp = tideline(x, y, 104, 313);
  const foot = y < 118 ? 1 - y / 118 : 0;
  // Water leaves the wall through the cracks and runs down from them, so the drip is anchored
  // to a feature you can see rather than to a column the noise happened to pick.
  const bleed = cd < 26 ? (1 - cd / 26) * Math.max(0, noise(x, y, 16, 3, 379) - 0.44) * 2.2 : 0;
  const lichen = Math.min(1, ((cd < 14 ? 0.6 : 0) + foot * 0.45)
    * Math.max(0, noise(x, y, 14, 14, 421) - 0.46) * 2.2);
  return [
    base[0] - 20 - damp * 46 - bleed * 44 - lichen * 44,
    base[1] - 14 - damp * 31 - bleed * 33 - lichen * 20,
    base[2] - 23 - damp * 41 - bleed * 39 - lichen * 40,
  ];
}

/* ==========================================================================
   THE HEIGHT LIBRARY — THE LIST item 14.

   Every destination material used ONE generated image as both its colour map and its bump
   map. A bump map is a HEIGHT FIELD: the renderer differentiates it and tilts the normal by
   the slope. Feeding it the albedo tells the renderer that every dark thing is a hole. So a
   rust drip down a corrugated wall was a gouge, soot was a crater, a damp patch on stone was
   a dent, and peeling paint was a hole in the timber — which is a good half of "bad textures
   in certain places", and it is a bug rather than a taste.

   These four functions are the SAME structure with the stains taken out: the course tables,
   the board table with its knots, the corrugation rib with its lap and its fasteners, the
   crack map. What is left is the geometry of the surface, which is what a height field is
   supposed to be. Every one of them reads the same tables as its colour twin, so the bump
   and the picture agree texel for texel instead of nearly agreeing.

   Four images, not eight: mossStone differs from stone only by growth, industrial from metal
   only by soot, salt and avery from plaster only by staining — and by definition a stain has
   no height. ZERO extra programs: bumpMap is a boolean in three's program parameters, so a
   DIFFERENT texture object on the same UV channel produces an identical cache key.
   ========================================================================== */

function stoneHeight(x, y) {
  const ci = ROW_OF[y];
  const c = COURSES[ci];
  const ex = c.edgeX[x], ey = EDGE_Y[y];
  const e = (ex < ey ? ex : ey) + (noise(x, y, 74, 74, 4811) - 0.5) * 1.35;
  const broad = noise(x, y, 8, 8, 11);
  if (e < 1.15) return 140 + broad * 18;                   // narrow, recessed lime mortar
  const id = c.blockOf[x];
  let h = 208 + (hash2(id, ci, 4801) - 0.5) * 18 + (broad - 0.5) * 14
    + (noise(x, y, 26, 26, 353) - 0.5) * 12 + (noise(x, y, 96, 96, 29) - 0.5) * 10;
  h += (noise(x + broad * 8, y, 3, 74, 4871) - 0.5) * 11;
  if (e < 5) h -= (1 - (e - 1.15) / 3.85) * 31;
  const chip = noise(x, y, 64, 64, 131);
  if (chip > 0.80 && e < 18) h -= (chip - 0.80) * 220;
  return h;
}

function timberHeight(x, y) {
  const row = (y / BOARD_H) | 0;
  const B = BOARDS[row];
  const edge = y - row * BOARD_H;
  const gr = fbm2(x, y, 5, 80, 4327);
  const ridge = 1 - Math.abs(2 * gr - 1);
  const rid2 = ridge * ridge;
  const lin = noise(x, y, 3, TIMBER_LINE, 4451);
  const lr = 1 - Math.abs(2 * lin - 1);
  const broad = noise(x, y, 6, 12, 17);
  // grain is shallow — it is a texture, not a set of trenches — and the weathered knot
  // stands PROUD of the board around it, because it is the hardest thing in the plank.
  // The fine line grain is shallower still: 7 counts, which under a torch at two metres is
  // the difference between a plank and a painted board, and at ten metres is nothing.
  let h = 204 + (broad - 0.5) * 10 - rid2 * rid2 * 16 + (0.5 - lr) * 14;
  for (let k = 0; k < B.knots.length; k++) {
    const K = B.knots[k];
    const dx = dxWrap(x, K.x), dy = (edge - K.y) * 1.9;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < K.r * 1.6) h += (1 - d / (K.r * 1.6)) * 26;
  }
  if (edge < 3) h = 86 + broad * 22;                       // the gap between boards
  else if (edge < 10) h -= (1 - (edge - 3) / 7) * 30;      // the lap
  const dj = Math.min(Math.abs(dxWrap(x, B.j0)), Math.abs(dxWrap(x, B.j1)));
  if (dj < 2 && edge >= 3) h -= 58;                        // the butt join
  const peel = timberPeel(x, row, edge);
  // Lost paint is a STEP at the edge of the island, not a hole across the whole of it: the
  // paint film is about half a millimetre and the wood behind it is a step down of that much.
  // Same threshold and same field as the colour, so the step lands on the line you can see.
  if (peel > PEEL_T && peel < PEEL_T + 0.02 && edge >= 3) h -= 24;
  return h;
}

function metalHeight(x, y) {
  const rib = 0.5 + 0.5 * Math.cos(TAU * x * RIBS / SIZE);
  let h = 148 + rib * 94;                                  // corrugation dominates
  const px = wrap(x, PANEL);
  if (px < 3) h -= 76;                                     // the lap
  else if (px < 9) h += (1 - (px - 3) / 6) * 16;           // the sheet riding over it
  const B = metalBolt(x, y);
  if (B.has) {
    const bd = Math.sqrt(B.dx * B.dx + B.drop * B.drop);
    if (bd < 3.2) h += 44 - bd * 8;                        // the fastener head
  }
  if (noise(x, y, 80, 80, 89) > 0.86) h -= 36;             // pitting
  return h;
}

function plasterHeight(x, y) {
  const trowel = fbm2(x, y, 5, 3, 31);
  const fine = hash2(x, y, 7);
  let h = 208 + (trowel - 0.5) * 12 + (fine - 0.5) * 9;    // sand grain, shallow
  const peel = plasterLoss(x, y);
  if (peel > 0.665) {
    // *24, the same ramp as the colour, so the step down to the brick and the visible edge
    // of the render are the same three texels rather than nearly the same thirty.
    const p = Math.min(1, Math.max(0, (peel - 0.665) * 72));
    // the render is a real 12 mm skin: where it is gone the wall steps BACK, and the brick
    // behind it has its own joints
    const rowH = 9, bw = 28;
    const row = (y / rowH) | 0;
    const joint = (y - row * rowH) < 2 || wrap(x + (row & 1) * 14, bw) < 2;
    h -= p * (joint ? 62 : 34);
  } else if (peel > 0.645) h += (peel - 0.645) * 200;
  const cd = crackMap()[y * SIZE + x];
  const stress = Math.min(1, Math.max(0, (peel - 0.43) * 4.5));
  if (cd < 1) h -= 38 * stress;
  else if (cd < 3) h -= (1 - (cd - 1) / 2) * 12 * stress;
  return h;
}

// Geological strata and fractures, not masonry. The Quarry's first live frame
// exposed the shared stone map wrapping every outcrop in neat rows of bricks.
// This color/height pair retains the same existing mapped material program.
function rockRelief(x, y) {
  const warp = noise(x, y, 5, 5, 709) * 64;
  const layers = noise(x + warp, y + x * .34, 3, 44, 719);
  const fracture = Math.max(0, 1 - Math.abs(noise(x + warp, y, 13, 11, 727) - .48) * 42);
  return 160 + (fbm2(x, y, 5, 4, 701) - .5) * 72 + (layers - .5) * 30 - fracture * 28;
}

function naturalRockHeight(x, y) {
  return rockRelief(x, y) + (noise(x, y, 94, 94, 743) - .5) * 11;
}

function naturalRockPixel(x, y) {
  const v = 210 + (rockRelief(x, y) - 160) * .84 + (hash2(x, y, 751) - .5) * 13;
  const wet = Math.max(0, noise(x, y, 21, 4, 757) - .54) * 48;
  return [v - wet, v - 2 - wet, v - 6 - wet * .84];
}

function heightFor(style, x, y) {
  if (style === 'naturalRock') return naturalRockHeight(x, y);
  if (style === 'timber') return timberHeight(x, y);
  if (style === 'stone') return stoneHeight(x, y);
  if (style === 'metal') return metalHeight(x, y);
  return plasterHeight(x, y);
}

/** Which structural height family a colour style belongs to. */
const BUMP_OF = Object.freeze({
  naturalRock: 'naturalRock',
  timber: 'timber', stone: 'stone', mossStone: 'stone',
  metal: 'metal', industrial: 'metal',
  plaster: 'plaster', salt: 'plaster', avery: 'plaster',
});

function pixelFor(style, x, y) {
  if (style === 'naturalRock') return naturalRockPixel(x, y);
  if (style === 'timber') return timberPixel(x, y);
  if (style === 'stone') return stonePixel(x, y, false);
  if (style === 'mossStone') return stonePixel(x, y, true);
  if (style === 'metal') return metalPixel(x, y, false);
  if (style === 'industrial') return metalPixel(x, y, true);
  if (style === 'salt') return plasterPixel(x, y, true);
  if (style === 'avery') return averyPixel(x, y);
  return plasterPixel(x, y, false);
}

function clampByte(v) { return Math.max(16, Math.min(255, Math.round(v))); }

function writePixel(data, x, y, rgb) {
  const i = (y * SIZE + x) * 4;
  data[i] = clampByte(rgb[0]);
  data[i + 1] = clampByte(rgb[1]);
  data[i + 2] = clampByte(rgb[2]);
  data[i + 3] = 255;
}

function makeTexture(style, asHeight) {
  const data = new Uint8Array(SIZE * SIZE * 4);
  const family = BUMP_OF[style] || style;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // A shared physical microstructure affects BOTH colour and relief. Pores
      // are recessed in mineral faces; cut timber has long checked fibres;
      // rolled metal has fine parallel abrasion instead of the same noise.
      let relief = 0;
      if (family === 'stone' || family === 'plaster' || family === 'naturalRock') {
        const cx = Math.floor(x / 4), cy = Math.floor(y / 4);
        const h = hash2(cx, cy, 7117);
        const px = cx * 4 + 0.9 + hash2(cx, cy, 7121) * 2.2;
        const py = cy * 4 + 0.9 + hash2(cx, cy, 7127) * 2.2;
        const r = 0.46 + h * 0.92;
        const d = Math.hypot(x - px, y - py);
        if (d < r && h > 0.48) relief = -(1 - d / r) * (family === 'plaster' ? 29 : 43);
        relief += (noise(x, y, 180, 180, 7141) - 0.5) * 11;
      } else if (family === 'timber') {
        const strand = noise(x, y, 9, 240, 7151);
        relief = -Math.max(0, strand - 0.58) * 45;
      } else if (family === 'metal') {
        relief = (noise(x, y, 11, 220, 7177) - 0.5) * 4;
      }
      if (asHeight) {
        const h = heightFor(style, x, y) + relief;
        writePixel(data, x, y, [h, h, h]);
      } else {
        const col = pixelFor(style, x, y);
        for (let c = 0; c < 3; c++) col[c] += relief * 0.72;
        writePixel(data, x, y, col);
      }
    }
  }
  return textureFromData(style, asHeight, data);
}

function textureFromData(style, asHeight, data, size = SIZE) {
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.name = (asHeight ? 'place-bump-' : 'place-surface-') + style;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  // 8, not 4: a wall seen along its length is the case 512 was bought for, and it is exactly
  // the case where the mip chain throws the new detail away first.
  tex.anisotropy = 8;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Service hardware is rolled or forged steel, not corrugated sheet. A small
// neutral pair preserves authored paint colors and supplies shallow pits plus
// oxidized roughness. It shares the existing mapped place/weather program.
export function createSmoothSteelSurface() {
  const size = 128, color = new Uint8Array(size * size * 4), physical = new Uint8Array(color.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const p = (y * size + x) * 4;
    const oxide = noise(x * 4, y * 4, 9, 9, 9041);
    const grain = hash2(x, y, 9049), pit = Math.max(0, grain - .91) / .09;
    const tone = Math.round(222 - oxide * 12 - pit * 5);
    color[p] = tone; color[p+1] = tone; color[p+2] = tone; color[p+3] = 255;
    physical[p] = Math.round(184 + (grain - .5) * 3 - pit * 5);
    physical[p+1] = Math.round((.60 + oxide * .16 + pit * .06) * 255);
    physical[p+2] = Math.round((1 - pit * .055) * 255);
    physical[p+3] = Math.round((.42 - oxide * .16) * 255);
  }
  const albedo = textureFromData('metal', false, color, size);
  const response = textureFromData('metal', true, physical, size);
  albedo.userData.surface = 'smoothSteel';
  response.userData.physicalChannels = 'height/roughness/cavity/metalness';
  return { albedo, physical: response, dispose() { albedo.dispose(); response.dispose(); } };
}

// The height sampler only reads R. Its other channels now carry the material's
// physical response instead of three redundant copies of height: G roughness,
// B cavity visibility, A exposed metal. Derive these from the same authored
// structure and colour so a rust stain is rough, a painted board catches light,
// and mortar stays porous. No extra texture, sampler, UV or shader family.
function packPhysicalChannels(lib) {
  const clamp01 = v => Math.max(0, Math.min(1, v));
  for (const family of HEIGHT_STYLES) {
    const surface = lib[family].image.data;
    const texture = lib[family + '-bump'];
    const data = texture.image.data;
    for (let p = 0; p < data.length; p += 4) {
      const h = data[p] / 255;
      const r = surface[p] / 255, g = surface[p + 1] / 255, b = surface[p + 2] / 255;
      const value = (r + g + b) / 3;
      // The local height deficit identifies recesses without mistaking a whole
      // darker stone or a broad timber grain for a crevice.
      const texel = p / 4, x = texel % SIZE, y = (texel / SIZE) | 0;
      const left = (y * SIZE + (x + SIZE - 2) % SIZE) * 4;
      const right = (y * SIZE + (x + 2) % SIZE) * 4;
      const down = (((y + SIZE - 2) % SIZE) * SIZE + x) * 4;
      const up = (((y + 2) % SIZE) * SIZE + x) * 4;
      const adjacent = (data[left] + data[right] + data[down] + data[up]) / 1020;
      const cavity = clamp01((adjacent - h) * 2.8);
      let roughness, metal = 0;
      if (family === 'metal') {
        // Oxide has a warmer albedo than zinc. Recessed laps and accumulated
        // dirt remain rough even where the rest of a sheet is reflective.
        const oxide = clamp01((r - b - 0.015) * 5.0);
        const dirt = clamp01((0.69 - value) * 2.5);
        const coating = Math.max(oxide, dirt * 0.72);
        roughness = 0.37 + coating * 0.48 + cavity * 0.08;
        metal = (1 - coating) * 0.64;
      } else if (family === 'timber') {
        const bare = clamp01((0.68 - value) * 4.0);
        roughness = 0.59 + bare * 0.29 + cavity * 0.12;
      } else if (family === 'stone') {
        const mortar = clamp01((0.69 - h) * 4.0);
        roughness = 0.76 + mortar * 0.18 + (1 - value) * 0.06;
      } else if (family === 'naturalRock') {
        roughness = 0.80 + (1 - h) * 0.12 + cavity * 0.05;
      } else {
        roughness = 0.87 + (1 - h) * 0.09 + cavity * 0.03;
      }
      data[p + 1] = Math.round(clamp01(roughness) * 255);
      data[p + 2] = Math.round((1 - cavity * 0.21) * 255);
      data[p + 3] = Math.round(clamp01(metal) * 255);
    }
    texture.userData.physicalChannels = 'height/roughness/cavity/metalness';
    texture.needsUpdate = true;
  }
}

/** Apply the packed response after the shared place weather shader is installed. */
export function patchPlaceSurfaceLighting(shader, material) {
  const family = material.map?.name?.replace('place-surface-', '') || 'plaster';
  const surfaceType = ['plaster', 'salt', 'avery'].includes(family) ? 0
    : family === 'timber' ? 2 : ['metal', 'industrial'].includes(family) ? 3 : 1;
  shader.uniforms.uPlaceSurfaceType = { value: surfaceType };
  shader.uniforms.uPlaceScanNormal = { value: material.map?.userData?.scanNormal || material.bumpMap };
  shader.uniforms.uPlaceHasScan = { value: material.map?.userData?.scanNormal ? 1 : 0 };
  shader.uniforms.uPlaceMetalKeep = material.userData.metalCoat || (material.userData.metalCoat = { value: 0.58 });
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', [
      '#include <common>', SURFACE_RELIEF_GLSL,
      'uniform float uPlaceSurfaceType;',
      'uniform float uPlaceMetalKeep;',
      'float countyMaterialHash(vec2 p) {',
      '  vec3 q = fract(vec3(p.xyx) * 0.1031);',
      '  q += dot(q, q.yzx + 33.33);',
      '  return fract((q.x + q.y) * q.z);',
      '}',
      'float countyMaterialNoise(vec2 p) {',
      '  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);',
      '  return mix(mix(countyMaterialHash(i), countyMaterialHash(i+vec2(1.0,0.0)), f.x),',
      '    mix(countyMaterialHash(i+vec2(0.0,1.0)), countyMaterialHash(i+vec2(1.0)), f.x), f.y);',
      '}',
      'uniform sampler2D uPlaceScanNormal;',
      'uniform float uPlaceHasScan;',
      'vec3 countyScanNormal(vec3 position, vec3 surfNormal, vec2 uv, vec2 encoded) {',
      '  vec3 q0 = dFdx(position), q1 = dFdy(position);',
      '  vec2 st0 = dFdx(uv), st1 = dFdy(uv);',
      '  vec3 q1p = cross(q1, surfNormal), q0p = cross(surfNormal, q0);',
      '  vec3 T = q1p * st0.x + q0p * st1.x;',
      '  vec3 B = q1p * st0.y + q0p * st1.y;',
      '  float scale = inversesqrt(max(max(dot(T,T), dot(B,B)), 0.00000001));',
      '  vec2 xy = encoded * 2.0 - 1.0;',
      '  vec3 tangentNormal = normalize(vec3(xy, sqrt(max(0.001, 1.0 - dot(xy,xy)))));',
      '  #ifdef DOUBLE_SIDED',
      '    T *= gl_FrontFacing ? 1.0 : -1.0; B *= gl_FrontFacing ? 1.0 : -1.0;',
      '  #endif',
      '  return normalize(mat3(T * scale, B * scale, surfNormal) * tangentNormal);',
      '}',
      'vec4 countyPlasterSample(sampler2D tex, vec2 uv, vec2 offsetA, vec2 offsetB, float blend) {',
      '  return mix(texture2D(tex, uv + offsetA), texture2D(tex, uv + offsetB), blend);',
      '}',
      // Derivatives are evaluated before the zero-gradient branch at the call
      // site, keeping them valid across a fragment quad. This is the same relief
      // reconstruction as countyReliefNormal with already evaluated derivatives.
      'vec3 countyLayerNormal(vec3 surfaceNormal, vec3 dx, vec3 dy, vec2 gradient) {',
      '  vec3 rx = cross(dy, surfaceNormal), ry = cross(surfaceNormal, dx);',
      '  float determinant = dot(dx, rx);',
      '  vec3 slope = sign(determinant) * (gradient.x * rx + gradient.y * ry);',
      '  return normalize(max(abs(determinant), 0.00000001) * surfaceNormal - slope);',
      '}',
    ].join('\n'))
    .replace('#include <map_fragment>', [
      'vec2 countyWallPlane = vec2(vPlaceWorld.x + vPlaceWorld.z * 0.73, vPlaceWorld.y);',
      // Plaster damage has no regular bond to preserve. Two continuously blended
      // texture phases remove the four-metre wallpaper repeat; colour, height and
      // roughness use the SAME phases, so visible failures keep their real relief.
      'vec2 countyOffsetA = vec2(0.0), countyOffsetB = vec2(0.0);',
      'float countyPhaseMix = 0.0, countyFloor = 0.0;',
      // This condition is uniform for the whole material, so metal, masonry and
      // timber avoid eight hashes and the interpolation for unused plaster UVs.
      'if (uPlaceSurfaceType < 0.5) {',
      '  float countyPhase = countyMaterialNoise(countyWallPlane * 0.13) * 8.0;',
      '  float countyPhaseId = floor(countyPhase);',
      '  countyOffsetA = vec2(countyMaterialHash(vec2(countyPhaseId, 17.0)), countyMaterialHash(vec2(countyPhaseId, 49.0))) * 2.0;',
      '  countyOffsetB = vec2(countyMaterialHash(vec2(countyPhaseId + 1.0, 17.0)), countyMaterialHash(vec2(countyPhaseId + 1.0, 49.0))) * 2.0;',
      '  countyPhaseMix = smoothstep(0.18, 0.82, fract(countyPhase));',
      '  countyFloor = smoothstep(0.62, 0.91, vWxUp);',
      '}',
      '#ifdef USE_MAP',
      'if (uPlaceSurfaceType < 0.5) {',
      '  diffuseColor *= countyPlasterSample(map, vMapUv, countyOffsetA, countyOffsetB, countyPhaseMix);',
      '} else {',
      '  #include <map_fragment>',
      '}',
      '#endif',
      'float countyMacro = countyMaterialNoise(vPlaceWorld.xz * 0.045 + vPlaceWorld.y * 0.011);',
      'float countyWeathering = countyMaterialNoise(countyWallPlane * vec2(0.37, 0.062));',
      'float countyFloorRelief = 0.0;',
      'if (countyFloor > 0.001) {',
      // Horizontal plaster is a paved slab, never a wall's repeated brick peel.
      // Aggregate is filtered by the world-space pixel footprint before it can
      // turn into distant shimmer; the metre-scale wear remains visible.
      '  float footprint = max(length(dFdx(vPlaceWorld)), length(dFdy(vPlaceWorld)));',
      '  float fineFade = 1.0 - smoothstep(0.025, 0.15, footprint);',
      '  float aggregate = countyMaterialNoise(vPlaceWorld.xz * 19.0);',
      '  float wear = countyMaterialNoise(vPlaceWorld.xz * 0.63);',
      '  float slab = 0.72 + (wear - 0.5) * 0.12 + (aggregate - 0.5) * 0.13 * fineFade;',
      '  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(slab * 0.99, slab, slab * 0.985), countyFloor);',
      '  countyFloorRelief = (aggregate - 0.5) * 0.003 * fineFade + (wear - 0.5) * 0.009;',
      '}',
    ].join('\n'))
    .replace('#include <color_fragment>', [
      '#include <color_fragment>',
      'float countyWall = 1.0 - smoothstep(0.35, 0.78, vWxUp);',
      'float countyFoot = 0.0, countyRunnel = 0.0;',
      // No derivatives or texture LOD inside this face-orientation branch.
      'if (countyWall > 0.0) {',
      '  countyFoot = (1.0 - smoothstep(0.06, 0.8 + countyMacro * 1.15, max(vPlaceLocalY, 0.0))) * countyWall;',
      '  countyRunnel = smoothstep(0.55, 0.79, countyMaterialNoise(countyWallPlane * vec2(2.3, 0.10) + countyMacro * 0.7)) * countyWall;',
      '}',
      'float countyTone = mix(0.86, 1.08, countyMacro) * mix(0.90, 1.025, countyWeathering);',
      'diffuseColor.rgb *= countyTone * (1.0 - countyFoot * 0.21 - countyRunnel * 0.14);',
    ].join('\n'))
    .replace('#include <roughnessmap_fragment>', [
      '#include <roughnessmap_fragment>',
      'vec4 countyPhysical = vec4(0.7, roughnessFactor, 1.0, 0.0);',
      '#ifdef USE_BUMPMAP',
      '  if (uPlaceSurfaceType < 0.5) countyPhysical = countyPlasterSample(bumpMap, vBumpMapUv, countyOffsetA, countyOffsetB, countyPhaseMix);',
      '  else countyPhysical = texture2D(bumpMap, vBumpMapUv);',
      '#endif',
      'countyPhysical = mix(countyPhysical, vec4(0.62, 0.88, 1.0, 0.0), countyFloor);',
      'countyPhysical.g = max(0.35, countyPhysical.g - countyRunnel * 0.065);',
      'float countyWet = 0.0;',
      'if (uWeather.y > 0.0) {',
      '  float countyPocket = 1.0 - smoothstep(0.42, 0.82, countyPhysical.r);',
      '  countyWet = uWeather.y * (1.0 - countySnowCover)',
      '    * (smoothstep(0.08, 0.80, vWxUp) * mix(0.54, 1.0, countyPocket) + countyRunnel * 0.28);',
      '}',
      'roughnessFactor = mix(countyPhysical.g, 0.22, countyWet);',
      'roughnessFactor = mix(roughnessFactor, mix(0.94, 0.72, countySnowCrest), countySnowCover);',
    ].join('\n'))
    .replace('#include <metalnessmap_fragment>', [
      '#include <metalnessmap_fragment>',
      // The scan supplies the zinc/oxide boundaries; an old county building also
      // carries a matte dust coat. Retaining that diffuse layer lets dim room
      // light describe the sheet between its narrow specular ridges.
      'metalnessFactor = countyPhysical.a * uPlaceMetalKeep * (1.0 - countySnowCover);',
    ].join('\n'))
    .replace('#include <normal_fragment_maps>', [
      'if (uPlaceHasScan > 0.5) {',
      '  vec2 countyNormalXY;',
      '  if (uPlaceSurfaceType < 0.5) countyNormalXY = countyPlasterSample(uPlaceScanNormal, vBumpMapUv, countyOffsetA, countyOffsetB, countyPhaseMix).rg;',
      '  else countyNormalXY = texture2D(uPlaceScanNormal, vBumpMapUv).rg;',
      '  normal = countyScanNormal(-vViewPosition, nonPerturbedNormal, vBumpMapUv, countyNormalXY);',
      '} else if (uPlaceSurfaceType >= 0.5) {',
      '  #include <normal_fragment_maps>',
      '}',
      '#ifdef USE_BUMPMAP',
      'else { normal = countyReliefNormal(-vViewPosition, nonPerturbedNormal, countyPhysical.r * bumpScale); }',
      '#endif',
      // Water fills the finest grain. Snow is a layer with its own wind-shaped
      // relief, so a white roof no longer reflects the boards buried beneath it.
      'float countyNormalFill = max(countyFloor, max(countyWet * 0.26, countySnowCover * 0.92));',
      'if (countyNormalFill > 0.0) normal = normalize(mix(normal, nonPerturbedNormal, countyNormalFill));',
      // Only plaster can produce slab relief; snow availability is also uniform.
      // Dry stone, wood and steel skip the entire additional derivative layer.
      'if (uPlaceSurfaceType < 0.5 || uWeather.x > 0.0) {',
      '  float countyLayerHeight = countyFloorRelief * countyFloor * (1.0 - countySnowCover) + countySnowHeight * countySnowCover;',
      '  vec2 countyLayerGradient = vec2(dFdx(countyLayerHeight), dFdy(countyLayerHeight));',
      '  vec3 countyLayerDx = dFdx(-vViewPosition), countyLayerDy = dFdy(-vViewPosition);',
      '  if (any(notEqual(countyLayerGradient, vec2(0.0)))) {',
      '    normal = countyLayerNormal(normal, countyLayerDx, countyLayerDy, countyLayerGradient);',
      '  }',
      '}',
    ].join('\n'))
    .replace('#include <aomap_fragment>', [
      '#include <aomap_fragment>',
      'float countyCavity = mix(countyPhysical.b, 1.0, countySnowCover);',
      'reflectedLight.indirectDiffuse *= countyCavity;',
      'reflectedLight.indirectSpecular *= sqrt(countyCavity);',
    ].join('\n'))
    .replace('#include <dithering_fragment>', [
      '#include <dithering_fragment>',
      'gl_FragColor.a = 0.98 - clamp(countyWet * smoothstep(0.85, 0.99, vWxUp) * (1.0 - countySnowCover), 0.0, 1.0) * 0.75;',
    ].join('\n'));
}

/**
 * Sixteen 512 x 512 images: nine colour, five packed height/response and two
 * measured tangent normals. Natural rock retains its own pair for the Quarry.
 *
 * COST. Round 16's note here said 300-340 ms against 206 ms for twelve 256s — "four times the
 * texels for about 1.6x the time". That is wrong and the correction matters, because it was
 * the whole argument for 512. Absolute milliseconds cannot be measured on this machine today
 * (five agents share the CPU; the same call took 1.4 s, 2.5 s and 16.6 s in one sitting), so
 * it was measured as a RATIO instead: the identical file with SIZE forced to 256, alternating
 * A/B/A/B five times in one process so contention lands on both. Medians 1696 ms and 452 ms —
 * 3.76x for 4x the texels. The lattice cache is what keeps it under linear; it does not make
 * 512 nearly free. Round 17 adds about 5% on top of that (one grain octave on timber, one
 * mottle on stone, two warp samples in the crack map, one drip sample on the plaster family).
 *
 * So this is on the order of half a second of a cold boot whose law is 15 s, and the boot the
 * shots below were taken through is the number that decides it, not this ratio. It is a
 * one-off cost inside places._ensureBuilt. The original twelve cost 12.6 MB before
 * mipmaps; the two rock images add 2.1 MB, with no additional shader variant.
 *
 * The noise lattices and the crack map are working buffers, not results, so they are dropped
 * on the way out: about 600 KB that would otherwise sit in the heap for the whole session.
 */
export function createPlaceSurfaceLibrary() {
  const lib = Object.create(null);
  let offset = 0;
  for (const asHeight of [false, true]) for (const style of asHeight ? HEIGHT_STYLES : COLOR_STYLES) {
    const key = style + (asHeight ? '-bump' : '');
    if (!prebaked) { lib[key] = makeTexture(style, asHeight); continue; }
    const data = new Uint8Array(SIZE * SIZE * 4);
    for (let p = 0; p < data.length; p += 4) {
      data[p] = prebaked[offset++];
      data[p + 1] = asHeight ? data[p] : prebaked[offset++];
      data[p + 2] = asHeight ? data[p] : prebaked[offset++];
      data[p + 3] = 255;
    }
    lib[key] = textureFromData(style, asHeight, data);
  }
  packPhysicalChannels(lib);
  if (prebaked) {
    // Scan data overrides estimates after the procedural families have been packed.
    // Normal XY adds one shared sampler, with a uniform branch for every material;
    // it does not split the destination shader into additional program variants.
    let scanOffset = BASE_BYTES + 8;
    for (const family of ['metal', 'plaster']) {
      const response = lib[family + '-bump'].image.data;
      const normal = new Uint8Array(SIZE * SIZE * 4);
      for (let p = 0; p < response.length; p += 4) {
        response[p + 1] = prebaked[scanOffset++];
        response[p + 2] = prebaked[scanOffset++];
        response[p + 3] = prebaked[scanOffset++];
        normal[p] = prebaked[scanOffset++];
        normal[p + 1] = prebaked[scanOffset++];
        normal[p + 2] = normal[p + 3] = 255;
      }
      const normalTexture = textureFromData(family, false, normal);
      normalTexture.name = 'place-scan-normal-' + family;
      lib[family + '-normal'] = normalTexture;
      lib[family + '-bump'].userData.physicalSource = 'ambientCG';
      for (const style of COLOR_STYLES.filter(style => BUMP_OF[style] === family)) {
        lib[style].userData.scanNormal = normalTexture;
        if (family === 'metal') lib[style].repeat.set(2, 1);
      }
      // The steel scan is 2:1 before rotation: a 2 x 4 metre repeat keeps its
      // photographic aspect and narrow rib spacing within the existing 4 m UVs.
      if (family === 'metal') lib[family + '-bump'].repeat.set(2, 1);
    }
  }
  // The renderer owns the expanded texels now; release the packed working copy.
  prebaked = null;
  LATTICE.clear();
  CRACK = null;
  return lib;
}

export function placeSurfaceFor(lib, siteOrKind) {
  const kind = typeof siteOrKind === 'string' ? siteOrKind : siteOrKind && siteOrKind.kind;
  return lib[STYLE_BY_KIND[kind] || 'timber'];
}

/** The HEIGHT image for the same site. See the note above the height functions. */
export function placeBumpFor(lib, siteOrKind) {
  const kind = typeof siteOrKind === 'string' ? siteOrKind : siteOrKind && siteOrKind.kind;
  return lib[(BUMP_OF[STYLE_BY_KIND[kind] || 'timber'] || 'timber') + '-bump'];
}

/**
 * Replace primitive-local 0..1 UVs with metre-scaled box projection. Merged destination
 * kits retain per-face normals, so this stays stable across walls, roofs, towers and props.
 *
 * The default stays 4 m per tile. Every feature size in this module was chosen against that
 * number (see the scale table at the top), and places.js passes 7 for the station apron and
 * 3.2 for a compound floor, so moving the default would silently rescale the whole county.
 * Note that a vertical face gets v = local y, so v=0 is the FOOT of the building: the bottom
 * of each image is the bottom of the wall, which is what makes rising damp land where damp
 * actually is.
 */
export function projectPlaceSurfaceUVs(geometry, metresPerTile = 4) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position) return geometry;
  const pos = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  let uv = geometry.attributes.uv;
  if (!uv || uv.count !== pos.count) {
    uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
    geometry.setAttribute('uv', uv);
  }
  const inv = 1 / Math.max(0.25, metresPerTile);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = normal ? Math.abs(normal.getX(i)) : 0;
    const ny = normal ? Math.abs(normal.getY(i)) : 1;
    const nz = normal ? Math.abs(normal.getZ(i)) : 0;
    if (ny >= nx && ny >= nz) uv.setXY(i, x * inv, -z * inv);
    else if (nx >= nz) uv.setXY(i, z * inv, y * inv);
    else uv.setXY(i, x * inv, y * inv);
  }
  uv.needsUpdate = true;
  return geometry;
}

export function disposePlaceSurfaceLibrary(lib) {
  if (!lib) return;
  for (const tex of Object.values(lib)) if (tex && typeof tex.dispose === 'function') tex.dispose();
}
