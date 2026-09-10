// CURFEW — destination surfaces.
//
// Destination geometry is intentionally assembled from a small, cheap procedural kit, but
// cheap geometry must not mean blank prototype walls. This module supplies eight deterministic
// sampled materials and projects their UVs in metres so a forty-metre cathedral wall has many
// courses while a door still has recognisable grain. The maps are shared; per-site material clones
// reuse those textures and the mapped shader variants that places.js warms at boot.
//
// ROUND 16 — THE RESOLUTION AND STRUCTURE PASS. Three things were measured wrong and are
// now fixed. All three were visible in a 2x2 tile dump of the generator (the pictures are in
// the round report), which is the only way to judge a texture: a wall in a night frame is
// four pixels of evidence.
//
//   1. 256 px over a 4 m tile is 1.56 cm per texel. Two metres from a wall that is about
//      nine screen pixels per texel at 1280 wide, so every family read as a blur with a
//      pattern in it. Every image is now 512, which is 0.78 cm per texel. Measured cost is
//      in the note above createPlaceSurfaceLibrary; it is paid once, at boot, on the CPU.
//   2. The stone was a machine-perfect running bond: ONE block size, 62 x 28 px, repeated
//      without variation. Real masonry has a course table and a stone table. It has them now
//      (see buildMasonry) — thirteen courses of different heights, blocks of different widths
//      within each course, roughly one course in four laid in noticeably bigger stones, and a
//      per-stone tone. That is the "second frequency of stone" the wall was missing.
//   3. The timber grain was a sine in X on a board that runs in X — so the grain striped
//      ACROSS every plank instead of along it. The grain is now anisotropic noise, long in x
//      and fine in y, with knots, which is what makes a plank read as a plank.
//
// ROUND 17 — THE PASS THAT LOOKED AT ROUND 16. Round 16 was committed unreviewed. Its three
// structural claims hold up in a dump, and its arithmetic was re-derived here and matches:
// 13 courses of 21-40 cm, stones 26-73 cm (56-158 cm in a big course), boards of 25 cm, a
// 19 cm rib pitch, a 21 x 7 cm brick substrate. What it did NOT survive is being looked at
// from two metres, which is the distance every one of these images exists for. Five faults,
// all of them visible in a 256-texel crop of the generator:
//
//   1. TIMBER PEEL WAS CAMOUFLAGE. fbm2(x, y, 9, 9) is continuous in y, so one 45 cm island
//      of bare wood ran across five boards and straight over the lap shadow between them,
//      and its edge faded over thirty texels. Brown blobs on a cream board — on every barn,
//      chapel, mill and steeple in the county. Paint is now per board (see timberPeel) and
//      the edge is three texels, not thirty.
//   2. PLASTER PEEL HAD THE SAME DISEASE, ramp *7 over the same field. Render is a 12 mm
//      skin; where it is gone you see brick and you see it AT ONCE. The ramp is *60 now,
//      with a contact shadow in the step, and the height image steps with it.
//   3. THE CRACKS WERE PEN LINES. The level set of a four-cell field is smooth, so every
//      crack was a three-metre arc: a contour map, not a failure in render. The field is
//      domain-warped before it is levelled, which is what makes a crack wander and fork.
//   4. THE DAMP WAS A RULED LINE, constant in x at a fixed height, and the image tiles — so
//      a nine-metre castle wall carried a horizontal grey rule across it every four metres.
//      tideline() gives it a ragged edge. The REPEAT is not fixable here; see the note there.
//   5. NOTHING READ AT TWO METRES. Stone faces were flat grey between the joints; timber had
//      one grain octave 102 texels long and nothing at a plank's own line spacing. There is
//      now a 15 cm weathering mottle on the stone face, a signed 3.3 cm line grain on the
//      timber, per-joint mortar tone, and water tracking DOWN from the bed joints.
//
// Every family holds its round 16 mean luminance to within 3 counts (the numbers are in the
// note above createPlaceSurfaceLibrary) while its standard deviation is up 3-9: this is more
// structure at the same brightness, which is the only kind this file is allowed to add,
// because places.js multiplies these maps by vertex colours in the 0.03-0.05 range and the
// mean is the building's brightness in the county.
//
// SCALE, checked against the real thing at the default 4 m per tile (0.78 cm per texel):
//   stone      courses 21-40 cm, stones 26-73 cm (and 56-158 cm in a big course) — ashlar
//   timber     boards 25 cm, grain lines 3.3 cm — clapboard/weatherboard
//   metal      rib pitch 19 cm, sheet cover width 1 m, fastener lines every 66 cm — cladding
//   plaster    render over a 21 x 7 cm brick substrate that shows where the render is lost
// projectPlaceSurfaceUVs is also called at 7 m (the station apron), 3.2 m (a compound floor)
// and 1.8-2.8 m (wilds props); the families hold up across that range because every feature
// above is a real-world size at 4 m rather than a number that looked right in a dump.

import * as THREE from 'three';

const SIZE = 512;
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

   A wall is not a grid. Thirteen courses whose heights are hashed, not equal; within each
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
const COURSE_N = 13;
const COURSES = [];
const ROW_OF = new Uint8Array(SIZE);
const EDGE_Y = new Uint8Array(SIZE);

function buildMasonry() {
  const raw = new Float32Array(COURSE_N);
  let sum = 0;
  for (let i = 0; i < COURSE_N; i++) { raw[i] = 0.70 + hash2(i, 3, 907) * 0.66; sum += raw[i]; }
  const hs = new Int32Array(COURSE_N);
  let acc = 0;
  for (let i = 0; i < COURSE_N; i++) { hs[i] = Math.max(18, Math.round(raw[i] / sum * SIZE)); acc += hs[i]; }
  hs[COURSE_N - 1] += SIZE - acc;

  let y0 = 0;
  for (let i = 0; i < COURSE_N; i++) {
    const h = hs[i];
    const big = hash2(i, 11, 1319) > 0.72;          // the second frequency
    const base = big ? 137 : 74;                    // texels: 107 cm and 58 cm at 4 m/tile
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

/* --------------------------------------------------------------------------
   THE TIDELINE.

   Rising damp lives at the foot of a wall, and v=0 is the foot, so every family darkens its
   bottom rows. Round 16 did that with a straight ruled edge at a fixed height, constant in x
   — and the image tiles, so a nine-metre castle wall got a horizontal grey rule across it
   every four metres. A tideline on a real wall is ragged: it follows the mortar and the
   splash. The height is now modulated by a five-cell noise in x (0.62-1.38 of nominal), so
   the repeat is a wavering stain rather than a drawn line.

   It cannot fix the repeat itself: the damp still comes back every tile because a tiling
   texture has no idea how tall its wall is. That needs a second UV channel or a vertex-colour
   gradient in places.js, which this lane does not own — it is written up as blocked.
   -------------------------------------------------------------------------- */
function tideline(x, y, h0, salt) {
  const h = h0 * (0.62 + 0.76 * noise(x, 0, 5, 1, salt + 7));
  if (y >= h) return 0;
  const band = 1 - y / h;
  return band * band * (0.40 + 0.60 * noise(x, y, 9, 4, salt));
}

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
  const e = ex < ey ? ex : ey;

  const broad = noise(x, y, 8, 8, 11);
  const grit = noise(x, y, 96, 96, 29);
  const face = noise(x, y, 26, 26, 353);   // 15 cm blotches: weathering across one stone

  // RISING DAMP. v=0 is the foot of the wall (projectPlaceSurfaceUVs maps local y straight
  // to v, and DataTexture does not flip), so the bottom of the image really is the bottom of
  // the building. Sixty centimetres of it, on a ragged tideline — see tideline().
  const damp = tideline(x, y, 78, 71);
  const foot = y < 96 ? 1 - y / 96 : 0;                   // moss climbs higher than the wet

  if (e < 3) {
    // Not every joint is full. A castle has repointed lengths, blown lengths and lengths
    // where the mortar has washed back into the wall, and one flat grey for all of them was
    // the thing that made the round 16 dump read as a garden wall from a catalogue.
    // and about two joints in five have lost mortar altogether, which is the dark shadow
    // that stops a curtain wall reading as one machined grid. Measured: stone stdev 37.0 -> 40.2
    // at a mean 1.5 counts under round 16, which is inside the value law.
    const jv = (hash2(ci, c.blockOf[x], 5501) - 0.5) * 44 - Math.max(0, noise(x, y, 12, 12, 5507) - 0.60) * 90;
    const v = 104 + jv + broad * 30 + (grit - 0.5) * 14 - damp * 22;
    let r = v, g = v - 1, b = v - 4;
    if (moss) {
      const m = Math.min(1, (0.62 + foot * 0.5) * Math.max(0, noise(x, y, 7, 7, 113) - 0.40) * 2.1);
      r -= m * 46; g -= m * 20; b -= m * 42;
    }
    return [r, g, b];
  }

  const id = c.blockOf[x];
  const tone = (hash2(id, ci, 4801) - 0.5) * 32;          // this stone, not its neighbour
  const warm = (hash2(id, ci, 907) - 0.5) * 11;
  // and a minority of stones are simply soaked, or were replaced with something darker. The
  // top 28% of the hash, graded so there is no hard population split.
  const dark = Math.max(0, hash2(id, ci, 6151) - 0.72) * 3.57;
  let v = 219 + tone - dark * 26 + (broad - 0.5) * 20 + (face - 0.5) * 38 + (grit - 0.5) * 16 + (hash2(x, y, 61) - 0.5) * 9;
  if (e < 10) v -= (1 - (e - 3) / 7) * 34;                // the arris: dirt in the joint
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

function plasterPixel(x, y, salt) {
  const trowel = fbm2(x, y, 5, 3, salt ? 181 : 31);        // long sweeps of the float
  const grit = noise(x, y, 110, 110, 53);
  const fine = hash2(x, y, salt ? 19 : 7);
  let v = 221 + (trowel - 0.5) * 26 + (grit - 0.5) * 9 + (fine - 0.5) * 10;

  const damp = tideline(x, y, 86, 149);

  const peel = fbm2(x, y, 7, 7, salt ? 229 : 67);
  let r, g, b;
  if (peel > 0.60) {
    // A HARD EDGE, and a shadow in the step. Render is a 12 mm skin: where it has come off
    // the wall you see brick, and you see it immediately. The old *7 spread that transition
    // over about thirty texels — twenty-three centimetres of render dissolving into brick —
    // which is what made the round 16 plaster read as camouflage rather than as damage.
    const p = Math.min(1, (peel - 0.607) * 60);
    const s = substrate(x, y);
    r = v + (s[0] - v) * p; g = v + (s[1] - v) * p; b = v + (s[2] - v) * p;
    if (p < 0.42) { const l = (1 - p / 0.42) * 26; r -= l; g -= l; b -= l * 0.92; }
  } else {
    if (peel > 0.565) v += (peel - 0.565) * 380;           // the lip of the render at the break
    r = v; g = v - 2; b = v - 6;
    // WATER OUT OF THE HOLE. A wall with the render off it wets through, and the water leaves
    // at the bottom of the bare patch and runs down the sound render below. One extra sample
    // of the SAME peel field twenty-two texels (17 cm) up the wall: if the wall is bare up
    // there, this texel is under a hole. It is the plaster family's version of the stone's
    // weep and the cladding's bolt streak, and it is the last of the four families whose
    // drips started at a column the noise picked rather than at a thing you can see.
    const over = fbm2(x, y + 22, 7, 7, salt ? 229 : 67);
    const run = Math.min(1, Math.max(0, (over - 0.585) * 16))
      * Math.max(0, noise(x, y, 24, 3, 383) - 0.42) * 2.0;
    r -= run * 42; g -= run * 39; b -= run * 33;
  }

  const cd = crackMap()[y * SIZE + x];
  if (cd < 2) { r -= 96; g -= 95; b -= 92; }
  else if (cd < 5) { const t = 1 - (cd - 2) / 3; r -= 24 * t; g -= 24 * t; b -= 23 * t; }

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
  const e = ex < ey ? ex : ey;
  const broad = noise(x, y, 8, 8, 11);
  if (e < 3) return 92 + broad * 24;                       // the joint, recessed
  const id = c.blockOf[x];
  let h = 208 + (hash2(id, ci, 4801) - 0.5) * 18 + (broad - 0.5) * 14
    + (noise(x, y, 26, 26, 353) - 0.5) * 12 + (noise(x, y, 96, 96, 29) - 0.5) * 10;
  if (e < 10) h -= (1 - (e - 3) / 7) * 42;                 // the stone's own bevel
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
  const peel = fbm2(x, y, 7, 7, 67);
  if (peel > 0.60) {
    // *24, the same ramp as the colour, so the step down to the brick and the visible edge
    // of the render are the same three texels rather than nearly the same thirty.
    const p = Math.min(1, (peel - 0.607) * 60);
    // the render is a real 12 mm skin: where it is gone the wall steps BACK, and the brick
    // behind it has its own joints
    const rowH = 9, bw = 28;
    const row = (y / rowH) | 0;
    const joint = (y - row * rowH) < 2 || wrap(x + (row & 1) * 14, bw) < 2;
    h -= p * (joint ? 62 : 34);
  } else if (peel > 0.565) h += (peel - 0.565) * 260;      // the lip at the break
  const cd = crackMap()[y * SIZE + x];
  if (cd < 2) h -= 92;                                     // the groove
  else if (cd < 4) h -= (1 - (cd - 2) / 2) * 20;
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
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (asHeight) { const h = heightFor(style, x, y); writePixel(data, x, y, [h, h, h]); }
      else writePixel(data, x, y, pixelFor(style, x, y));
    }
  }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
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

/**
 * Fourteen 512 x 512 images: nine colour, five height. Natural rock has its own
 * pair because the Quarry's live frame showed masonry coursing on its geology.
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
  for (const style of ['timber', 'stone', 'mossStone', 'metal', 'industrial', 'plaster', 'salt', 'avery', 'naturalRock']) {
    lib[style] = makeTexture(style, false);
  }
  // and the four height images. Keyed '<family>-bump' so disposePlaceSurfaceLibrary's
  // Object.values sweep picks them up without knowing they exist.
  for (const family of ['timber', 'stone', 'metal', 'plaster', 'naturalRock']) {
    lib[family + '-bump'] = makeTexture(family, true);
  }
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
