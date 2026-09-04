// CURFEW — the six destination compounds that must read as places, not isolated props.
//
// This is body dress only. It adds to the existing builders after their route, claim
// fixture, interiors and progression have been created; it never moves or replaces any of
// those things. The six compounds are deliberately different pieces of land:
//
//   Weeping Mine     tram yard -> ore tipple -> winding-house breaker
//   Cathedral        road cloister -> west walk -> brazier at the tower
//   Chapel           pilgrims' court -> porch lane -> hearth beside the tower
//   Gallowsfen       road causeway -> drowned nave -> hanging belfry lamp
//   Hollow Mill      wagon court -> granary bridge -> winding lamp
//   Garden of Rest   mourning arcade -> grave avenue -> mausoleum lamp
//
// The engine merges a destination's body dress into one shared material. That makes dense
// PHYSICAL surface pattern important: masonry is laid in courses, siding has individual
// boards and battens, roofs have shingle rows, and machinery has ribs, seams and rust plates.
// All primitives retain their UVs so the shared body material can also apply its weathered
// maps/procedural treatment. There are no lights, no text and no new claim/pickup logic here.

import * as THREE from 'three';
import { kits, C, groundY, shell, GLOW } from './sites.js';

const TAU = Math.PI * 2;

// Under torchlight the stock pale stone can flatten into white. These are the material
// families of things that have stood outside for decades; small pale accents are rationed
// to cache contents and broken mortar.
const COAL = [0.034, 0.036, 0.040];
const IRON = [0.055, 0.058, 0.064];
const TAR = [0.068, 0.055, 0.044];
const OLD_WOOD = [0.105, 0.074, 0.050];
const OLD_STONE = [0.118, 0.116, 0.108];
const MOSS_STONE = [0.092, 0.104, 0.086];
const MORTAR = [0.148, 0.143, 0.132];
const OXIDE = [0.151, 0.071, 0.044];
const VERDIGRIS = [0.060, 0.113, 0.102];
const BONE = [0.255, 0.238, 0.198];
const BRASS = [0.275, 0.184, 0.072];
const GRIME = [0.050, 0.046, 0.042];
const SHINGLE = [0.073, 0.079, 0.087];

/** Three's local frame after rotateY(yaw): +x -> (cos,-sin), +z -> (sin,cos). */
function frame(ox, oz, yaw = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return {
    yaw,
    x(lx, lz) { return ox + lx * c + lz * s; },
    z(lx, lz) { return oz - lx * s + lz * c; },
  };
}

function localGround(api, x, z) { return groundY(api, x, z) - api.padY; }

/** One colliding solid. y is local metres above the site's pad, at the box centre. */
function solidBox(k, api, w, h, d, x, y, z, col, yaw = 0, tag = 'wall', standable = false) {
  k.box(w, h, d, x, api.padY + y, z, col, yaw);
  api.emit({
    kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw,
    y0: api.padY + y - h * 0.5, y1: api.padY + y + h * 0.5,
    tag, standable,
  });
}

/** A solid whose foot follows terrain. inset buries foundations into the ground. */
function groundedBox(k, api, w, h, d, x, z, col, yaw = 0, tag = 'wall', standable = false, inset = 0.18) {
  const gy = localGround(api, x, z);
  solidBox(k, api, w, h + inset, d, x, gy + h * 0.5 - inset * 0.5, z, col, yaw, tag, standable);
  return gy;
}

/** Slender scenery beam between two local xyz points; major collision stays on its piers. */
function beamBetween(k, api, a, b, r, col, seg = 6) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize(),
  );
  g.applyQuaternion(q);
  g.translate((a[0] + b[0]) * 0.5, api.padY + (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
  k.push(g, col);
}

/** A walkable timber/stone platform with visible joists and grounded legs. */
function deck(k, api, x, z, w, d, top, col = OLD_WOOD, yaw = 0, legs = true) {
  solidBox(k, api, w, 0.18, d, x, top - 0.09, z, col, yaw, 'wood', true);
  const f = frame(x, z, yaw);
  for (const lz of [-d * 0.5 + 0.16, d * 0.5 - 0.16]) {
    k.box(w, 0.30, 0.16, f.x(0, lz), api.padY + top - 0.28, f.z(0, lz), TAR, yaw);
  }
  for (let ix = -1; ix <= 1; ix++) {
    k.box(0.12, 0.24, d, f.x(ix * w * 0.32, 0), api.padY + top - 0.25, f.z(ix * w * 0.32, 0), TAR, yaw);
  }
  if (!legs) return;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const px = f.x(sx * (w * 0.5 - 0.4), sz * (d * 0.5 - 0.4));
    const pz = f.z(sx * (w * 0.5 - 0.4), sz * (d * 0.5 - 0.4));
    const base = localGround(api, px, pz);
    const h = Math.max(0.35, top - base);
    k.cyl(0.13, 0.17, h, 6, px, api.padY + base + h * 0.5, pz, TAR);
  }
}

/**
 * A route tread with the exact same OBB as `deck`, but a separated merged plank mesh.
 * Tiny visual seams and irregular fascia stop a climb from reading as stacked shipping
 * crates; collision remains the original single rectangle so Space traversal is unchanged.
 */
function routeDeck(k, api, x, z, w, d, top, col = OLD_WOOD, yaw = 0, trim = TAR) {
  api.emit({
    kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw,
    y0: api.padY + top - 0.18, y1: api.padY + top,
    tag: 'wood', standable: true,
  });
  const f = frame(x, z, yaw), gap = 0.035;
  const boardW = (w - gap * 3) / 4;
  for (let p = 0; p < 4; p++) {
    const lx = -w * 0.5 + boardW * 0.5 + p * (boardW + gap);
    const px = f.x(lx, 0), pz = f.z(lx, 0);
    k.box(boardW, 0.16, d, px, api.padY + top - 0.08, pz,
      p === 1 || p === 3 ? col : trim, yaw);
    for (const lz of [-d * 0.5 + 0.06, d * 0.5 - 0.06]) {
      k.box(boardW - 0.025, 0.16 + ((p + (lz > 0 ? 1 : 0)) & 1) * 0.045,
        0.115, f.x(lx, lz), api.padY + top - 0.225, f.z(lx, lz),
        (p + (lz > 0 ? 1 : 0)) % 3 === 0 ? trim : col, yaw);
    }
  }
  for (const lx of [-w * 0.32, 0, w * 0.32]) {
    k.box(0.10, 0.21, d - 0.08, f.x(lx, 0), api.padY + top - 0.245,
      f.z(lx, 0), trim, yaw);
  }
}

/** Low risers, usable in either direction, ending at `top` and running along local +z. */
function steps(k, api, x, z, w, top, yaw = 0, col = OLD_STONE) {
  const n = Math.max(2, Math.ceil(top / 0.40));
  const rise = top / n, tread = 0.56;
  const f = frame(x, z, yaw);
  for (let i = 0; i < n; i++) {
    const h = rise * (i + 1);
    const lz = (i - (n - 1)) * tread;
    const px = f.x(0, lz), pz = f.z(0, lz);
    solidBox(k, api, w, h, tread + 0.05, px, h * 0.5, pz, col, yaw, 'stone', true);
  }
}

/** Same step OBBs as `steps`, surfaced as dry-laid courses with an exact-height cap. */
function coursedSteps(k, api, x, z, w, top, yaw = 0, col = OLD_STONE,
  accent = GRIME) {
  const n = Math.max(2, Math.ceil(top / 0.40));
  const rise = top / n, tread = 0.56;
  const f = frame(x, z, yaw);
  for (let i = 0; i < n; i++) {
    const h = rise * (i + 1), lz = (i - (n - 1)) * tread;
    const px = f.x(0, lz), pz = f.z(0, lz), d = tread + 0.05;
    api.emit({
      kind: 'obb', x: px, z: pz, halfX: w * 0.5, halfZ: d * 0.5, yaw,
      y0: api.padY, y1: api.padY + h, tag: 'stone', standable: true,
    });
    const bodyH = Math.max(0.04, h - 0.055), rows = Math.max(1, Math.ceil(bodyH / 0.27));
    const rowH = bodyH / rows, sf = frame(px, pz, yaw);
    for (let r = 0; r < rows; r++) {
      const inset = ((r + i) % 3) * 0.018;
      const rowW = w - inset * 2, blocks = 2 + ((r + i) & 1), seam = 0.026;
      const blockW = (rowW - seam * (blocks - 1)) / blocks;
      for (let b = 0; b < blocks; b++) {
        const chip = (r + b + i) % 5 === 0 ? 0.055 : 0;
        const lx = -rowW * 0.5 + blockW * 0.5 + b * (blockW + seam)
          + (b === 0 ? chip * 0.5 : (b === blocks - 1 ? -chip * 0.5 : 0));
        k.box(blockW - chip, Math.max(0.025, rowH - 0.012), d - inset,
          sf.x(lx, 0), api.padY + r * rowH + (rowH - 0.012) * 0.5,
          sf.z(lx, 0), (r + b + i) % 4 === 0 ? accent : col, yaw);
      }
    }
    const capGap = 0.026, capW = (w - capGap * 2) / 3;
    for (let c = 0; c < 3; c++) {
      const lx = -w * 0.5 + capW * 0.5 + c * (capW + capGap);
      k.box(capW, 0.055, d, sf.x(lx, 0), api.padY + h - 0.0275,
        sf.z(lx, 0), (i + c) % 3 === 0 ? accent : col, yaw);
    }
  }
}

/** One unchanged stone OBB represented by broken masonry courses rather than a cuboid. */
function memorialPlinth(k, api, w, h, d, x, base, z, col, yaw = 0) {
  api.emit({
    kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw,
    y0: api.padY + base, y1: api.padY + base + h, tag: 'stone', standable: true,
  });
  const bodyH = Math.max(0.04, h - 0.07), rows = Math.max(1, Math.ceil(bodyH / 0.34));
  const rowH = bodyH / rows, f = frame(x, z, yaw);
  for (let r = 0; r < rows; r++) {
    const inset = ((r * 2 + rows) % 3) * 0.020;
    const rowW = w - inset * 2, rowD = d - inset;
    const blocks = 2 + (r & 1), seam = 0.024;
    const blockD = (rowD - seam * (blocks - 1)) / blocks;
    for (let b = 0; b < blocks; b++) {
      const chip = (r * 3 + b) % 7 === 0 ? 0.065 : 0;
      const lz = -rowD * 0.5 + blockD * 0.5 + b * (blockD + seam)
        + (b === 0 ? chip * 0.5 : (b === blocks - 1 ? -chip * 0.5 : 0));
      k.box(rowW - chip, Math.max(0.025, rowH - 0.014), blockD,
        f.x(-chip * 0.25, lz), api.padY + base + r * rowH + (rowH - 0.014) * 0.5,
        f.z(-chip * 0.25, lz), (r + b) % 5 === 0 ? GRIME : col, yaw);
    }
  }
  const capGap = 0.030, capD = (d - capGap) * 0.5;
  for (let c = 0; c < 2; c++) {
    const lz = (c ? 1 : -1) * (capD + capGap) * 0.5;
    const chip = c === (rows & 1) ? 0.055 : 0;
    k.box(w - chip, 0.07, capD, f.x(-chip * 0.25, lz),
      api.padY + base + h - 0.035, f.z(-chip * 0.25, lz), MORTAR, yaw);
  }
}

/** A large open arch. Columns are collision; the opening is always at least 3.2 m. */
function arch(k, api, x, z, span, height, depth, col, yaw = 0, crown = true) {
  const f = frame(x, z, yaw), pier = Math.max(0.62, span * 0.12);
  for (const sx of [-1, 1]) {
    const px = f.x(sx * span * 0.5, 0), pz = f.z(sx * span * 0.5, 0);
    groundedBox(k, api, pier, height, depth, px, pz, col, yaw, 'wall');
    k.box(pier + 0.20, 0.18, depth + 0.12, px, api.padY + height * 0.48, pz, MORTAR, yaw);
  }
  const y = localGround(api, x, z);
  solidBox(k, api, span + pier, 0.72, depth, x, y + height - 0.36, z, col, yaw, 'wall');
  if (crown) {
    for (const sx of [-1, 1]) {
      k.box(span * 0.52, 0.28, depth + 0.10,
        f.x(sx * span * 0.25, 0), api.padY + y + height + 0.28,
        f.z(sx * span * 0.25, 0), SHINGLE, yaw, 0, sx * 0.17);
    }
  }
}

/** Alternating masonry blocks proud of an existing wall: geometric relief plus colour grain. */
function masonryFace(k, api, x, z, w, h, yaw = 0, rows = 7, cols = 8, palette = [OLD_STONE, MOSS_STONE, MORTAR]) {
  const f = frame(x, z, yaw), bh = h / rows, bw = w / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const shift = (r & 1) ? bw * 0.5 : 0;
      const lx = -w * 0.5 + (c + 0.5) * bw + shift;
      if (lx > w * 0.5 - bw * 0.2) continue;
      const p = f.x(lx, 0), q = f.z(lx, 0);
      k.box(bw * 0.90, bh * 0.78, 0.055, p, api.padY + localGround(api, x, z) + (r + 0.5) * bh,
        q, palette[(r * 5 + c * 3) % palette.length], yaw);
    }
  }
}

/** Weatherboard skin: individual boards, dark gaps, battens and a tarred foot. */
function plankFace(k, api, x, z, w, h, yaw = 0, boards = 12, baseOffset = 0) {
  const f = frame(x, z, yaw), bw = w / boards;
  const base = localGround(api, x, z) + baseOffset;
  for (let i = 0; i < boards; i++) {
    const lx = -w * 0.5 + (i + 0.5) * bw;
    const px = f.x(lx, 0), pz = f.z(lx, 0);
    const col = i % 4 === 0 ? TAR : (i % 3 === 0 ? C.wood : OLD_WOOD);
    k.box(bw * 0.88, h, 0.065, px, api.padY + base + h * 0.5, pz, col, yaw);
    if ((i & 1) === 0) k.box(0.045, h + 0.08, 0.10, px + Math.cos(yaw) * bw * 0.44,
      api.padY + base + h * 0.5, pz - Math.sin(yaw) * bw * 0.44, COAL, yaw);
  }
  k.box(w + 0.20, 0.30, 0.12, x, api.padY + base + 0.15, z, TAR, yaw);
}

/** Corrugated/riveted metal skin. */
function rustFace(k, api, x, z, w, h, yaw = 0, ribs = 14) {
  const f = frame(x, z, yaw), base = localGround(api, x, z), step = w / ribs;
  k.box(w, h, 0.055, x, api.padY + base + h * 0.5, z, IRON, yaw);
  for (let i = 0; i <= ribs; i++) {
    const lx = -w * 0.5 + i * step, px = f.x(lx, 0), pz = f.z(lx, 0);
    k.box(0.045, h, 0.09, px, api.padY + base + h * 0.5, pz, i % 3 ? OXIDE : C.metal, yaw);
  }
  for (let r = 1; r < 4; r++) k.box(w, 0.045, 0.10, x, api.padY + base + h * r / 4, z, OXIDE, yaw);
}

/** A patterned trail that remains a low, walkable floor and never hides the terrain seam. */
function trail(k, api, points, width, colA, colB) {
  for (let p = 0; p + 1 < points.length; p++) {
    const [x0, z0] = points[p], [x1, z1] = points[p + 1];
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
    const n = Math.max(1, Math.ceil(len / 1.8));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = x0 + dx * t, z = z0 + dz * t;
      const gy = localGround(api, x, z);
      k.box(width * (i % 3 ? 0.82 : 0.96), 0.08, len / n * 0.82,
        x, api.padY + gy + 0.025, z, i & 1 ? colA : colB, yaw);
    }
  }
}

/** Visible physical cache. It is scenery beside the real claim, never a second pickup. */
function openCache(k, api, x, z, yaw, family, contents) {
  const f = frame(x, z, yaw), gy = localGround(api, x, z);
  solidBox(k, api, 1.55, 0.58, 0.84, x, gy + 0.29, z, family, yaw, 'metal', false);
  k.box(1.50, 0.10, 0.78, f.x(0, 0.34), api.padY + gy + 0.96, f.z(0, 0.34), family, yaw, -0.72);
  k.box(1.30, 0.08, 0.64, x, api.padY + gy + 0.62, z, COAL, yaw);
  api.emit({ kind: 'obb', x, z, halfX: 0.65, halfZ: 0.32, yaw,
    y0: api.padY + gy + 0.58, y1: api.padY + gy + 0.66,
    tag: 'metal', standable: true });
  for (let i = 0; i < contents; i++) {
    const lx = -0.48 + (i % 4) * 0.32, lz = -0.18 + Math.floor(i / 4) * 0.30;
    const px = f.x(lx, lz), pz = f.z(lx, lz);
    if ((i & 1) === 0) k.cyl(0.09, 0.09, 0.36, 8, px, api.padY + gy + 0.78, pz, BRASS, yaw, 0, Math.PI * 0.5);
    else k.box(0.26, 0.18, 0.20, px, api.padY + gy + 0.73, pz, i % 3 ? BONE : C.cloth, yaw + i * 0.17);
  }
  // latch and corner straps — the silhouette reads as an authored cache, not a brown box
  k.box(0.14, 0.34, 0.05, f.x(0, -0.43), api.padY + gy + 0.36, f.z(0, -0.43), BRASS, yaw);
  for (const sx of [-1, 1]) k.box(0.08, 0.60, 0.05, f.x(sx * 0.58, -0.43),
    api.padY + gy + 0.30, f.z(sx * 0.58, -0.43), IRON, yaw);
}

/** Repeated roof courses turn a single broad slab into visible shingle/weather texture. */
function shingleRows(k, api, x, z, w, d, eaveY, rise, yaw = 0, rows = 7) {
  const f = frame(x, z, yaw);
  const course = Math.hypot(w * 0.5, rise) / rows + 0.10;
  for (const side of [-1, 1]) {
    for (let i = 0; i < rows; i++) {
      const t = (i + 0.5) / rows;
      // March from the eave all the way to the ridge along the same plane as Kit.gable.
      // The old 0.5-t*0.25 formula covered only the outer half and floated each later
      // course farther above the roof, reaching a 2.4 m gap on Hollow Mill.
      const lx = side * (w * 0.5) * (1 - t);
      const yy = eaveY + rise * t;
      k.box(course, 0.12, d + 0.32,
        f.x(lx, 0), api.padY + yy, f.z(lx, 0), i % 3 === 0 ? OXIDE : SHINGLE,
        yaw, 0, -side * Math.atan2(rise, w * 0.5));
    }
  }
}

/* ========================================================================== */

function weepingMine(api) {
  const k = kits(), S = k.solid;

  // A paired tramway makes the road-to-breaker route physical. Rails and sleepers stay
  // below the capsule; ore carts are shunted off the open 4.5 m walking lane.
  trail(S, api, [[8.8, 23], [10.6, 11], [12.5, -13.9]], 4.6, COAL, C.ash);
  for (let i = 0; i < 22; i++) {
    const t = i / 21, x = 8.8 + (12.5 - 8.8) * t, z = 23 + (-13.9 - 23) * t;
    const yaw = Math.atan2(12.5 - 8.8, -13.9 - 23), f = frame(x, z, yaw);
    const gy = localGround(api, x, z);
    S.box(4.4, 0.10, 0.24, x, api.padY + gy + 0.04, z, TAR, yaw);
    for (const sx of [-1, 1]) S.box(0.10, 0.10, 1.75, f.x(sx * 1.42, 0), api.padY + gy + 0.11,
      f.z(sx * 1.42, 0), C.metal, yaw);
  }

  // The ore tipple: a 14 m high, open, layered machine instead of another shed.
  const TX = -11.5, TZ = 8.0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const px = TX + sx * 5.3, pz = TZ + sz * 4.2;
    const gy = localGround(api, px, pz);
    solidBox(S, api, 0.62, 11.5, 0.62, px, gy + 5.75, pz, OXIDE, 0, 'metal');
    beamBetween(S, api, [px, gy + 1, pz],
      [TX - sx * 5.3, gy + 10.5, TZ + sz * 4.2], 0.12, IRON);
  }
  deck(S, api, TX, TZ, 12.2, 9.4, 8.2, C.metal, 0, false);
  S.box(13.4, 0.38, 0.38, TX, api.padY + 11.2, TZ - 4.4, OXIDE);
  S.box(13.4, 0.38, 0.38, TX, api.padY + 11.2, TZ + 4.4, OXIDE);
  for (const x of [-15.2, -11.5, -7.8]) {
    S.cone(2.15, 4.6, 6, x, api.padY + 7.55, TZ, IRON, 0, 0, Math.PI);
    S.box(3.9, 1.0, 3.4, x, api.padY + 9.8, TZ, iColour(x));
    rustFace(S, api, x, TZ - 1.73, 3.6, 1.9, 0, 10);
  }
  // A walkable inspection stage and stair, with a bridge toward the winding house.
  deck(S, api, -2.8, 5.4, 6.8, 3.2, 3.2, OLD_WOOD, 0, true);
  steps(S, api, -4.8, 3.45, 1.5, 3.2, 0, C.rust);
  deck(S, api, 2.2, 3.0, 5.0, 1.5, 3.2, OLD_WOOD, Math.PI * 0.5, true);
  for (let i = 0; i < 7; i++) {
    const x = -5.2 + i * 1.28;
    S.box(0.05, 1.05, 0.05, x, api.padY + 3.72, 3.9, IRON);
  }
  S.box(8.2, 0.08, 0.08, -1.35, api.padY + 4.25, 3.9, OXIDE);

  // Three ore skips, every panel ribbed and stained. They sit beside rather than across
  // the track so the breaker remains a straight, readable destination.
  for (const [x, z, yaw] of [[2.4, 16.2, -0.12], [-1.4, 20.0, 0.08], [18.2, 6.5, 0.18]]) {
    const gy = localGround(api, x, z);
    solidBox(S, api, 3.6, 1.5, 2.4, x, gy + 1.05, z, IRON, yaw, 'metal', true);
    rustFace(S, api, x, z - Math.cos(yaw) * 1.22, 3.4, 1.2, yaw, 8);
    for (const sx of [-1, 1]) {
      const f = frame(x, z, yaw), px = f.x(sx * 1.15, -0.72), pz = f.z(sx * 1.15, -0.72);
      S.cyl(0.42, 0.42, 0.18, 10, px, api.padY + gy + 0.44, pz, COAL, yaw, 0, Math.PI * 0.5);
    }
  }

  // An ore inspector can now climb the thing that dominates the mine's silhouette. A
  // narrow, braced stair-scaffold rises along the tipple's open south-east leg and lands
  // on the REAL 8.2 m sorting deck. The route is deliberately outside the tram/claim line.
  const mineStages = [];
  const mineX = -4.95, mineStartZ = -5.45, mineCount = 9;
  const mineLow = Math.max(0.62, localGround(api, mineX, mineStartZ - 1.25) + 0.62);
  for (let i = 0; i < mineCount; i++) {
    const t = i / (mineCount - 1);
    const z = mineStartZ + i * 1.08;
    const top = mineLow + (8.2 - mineLow) * t;
    routeDeck(S, api, mineX, z, 1.82, 1.34, top,
      i % 3 === 0 ? OXIDE : OLD_WOOD, 0, i & 1 ? IRON : TAR);
    // The route used to read as nine copies of one tan crate. Riveted face straps and an
    // alternating diagonal turn the same exact tread hull into a tipple inspection stair.
    // These are merged surface pieces only; collision remains the deck above.
    const mineFaceZ = z - 0.681;
    for (const sx of [-0.56, 0, 0.56]) {
      S.box(0.055, 0.20, 0.032, mineX + sx, api.padY + top - 0.235,
        mineFaceZ, i & 1 ? IRON : TAR);
      S.box(0.095, 0.035, 0.038, mineX + sx, api.padY + top - 0.135,
        mineFaceZ - 0.004, OXIDE);
    }
    beamBetween(S, api,
      [mineX + (i & 1 ? -0.70 : 0.70), top - 0.35, mineFaceZ - 0.012],
      [mineX + (i & 1 ? 0.70 : -0.70), top - 0.16, mineFaceZ - 0.012],
      0.024, i % 3 ? OXIDE : IRON, 4);
    for (const sx of [-0.70, 0.70]) {
      const gy = localGround(api, mineX + sx, z);
      const h = Math.max(0.30, top - gy - 0.17);
      S.box(0.12, h, 0.12, mineX + sx, api.padY + gy + h * 0.5,
        z, i & 1 ? TAR : IRON);
    }
    if (i > 0) {
      const prev = mineStages[i - 1];
      for (const sx of [-0.78, 0.78]) beamBetween(S, api,
        [mineX + sx, prev.top - 0.18, prev.z],
        [mineX + sx, top - 0.18, z], 0.055, i & 1 ? OXIDE : TAR, 4);
    }
    mineStages.push({ x: mineX, z, top });
  }
  // The last tread overlaps the existing tipple deck in both axes; no invisible bridge is
  // needed at the join. A pair of guard standards tells the player this is intentional.
  for (const x of [mineX - 0.78, mineX + 0.78]) {
    S.box(0.08, 1.0, 0.08, x, api.padY + 8.65, 3.18, IRON);
  }
  api.site.parkourRoute = {
    kind: 'mine-tipple-scaffold', space: 'local',
    approach: { x: mineX, z: mineStartZ - 1.35,
      y: groundY(api, mineX, mineStartZ - 1.35) },
    target: { x: mineX, z: mineStages[mineStages.length - 1].z, y: api.padY + 8.2 },
    crown: { x: -7.0, z: 4.2, y: api.padY + 8.2 },
    stages: mineStages.map((p) => ({ x: p.x, z: p.z, y: api.padY + p.top })),
  };

  // Three furnace houses and the black gaps between them make an assay row, not the old
  // twenty-five-metre brick cliff that swallowed the close view.
  const furnaces = [[-8.8, 5.0, 6.8], [-1.0, 4.0, 8.2], [6.3, 5.5, 6.0]];
  for (const [z, d, h] of furnaces) {
    groundedBox(S, api, 0.55, h, d, 24.0, z, OLD_STONE, 0, 'wall');
    masonryFace(S, api, 23.70, z, d, h - 0.4, Math.PI * 0.5,
      Math.max(7, Math.round(h * 1.35)), Math.max(5, Math.round(d * 1.15)),
      [C.brick, OXIDE, GRIME, OLD_STONE]);
    S.box(0.12, Math.min(3.4, h - 1.2), Math.max(2.4, d - 1.2), 23.35,
      api.padY + localGround(api, 24, z) + Math.min(2.2, h * 0.34), z, IRON);
    for (let i = 0; i < 4; i++) S.box(0.10, 0.12, 3.3, 23.24,
      api.padY + localGround(api, 24, z) + 0.8 + i * 0.65, z, COAL);
  }

  // The existing carbine grant still happens at the breaker. This open blasting chest is
  // its physical promise, far enough aside to leave the 2.8 m claim circle unobstructed.
  openCache(S, api, 8.6, -15.4, -0.18, IRON, 7);

  return finish(k);
}

function iColour(x) { return x < -13 ? OXIDE : (x < -9 ? C.rust : C.metal); }

function cathedral(api) {
  const k = kits(), S = k.solid;

  // The west cloister is the arrival route: a 32 m outdoor room whose arcade frames the
  // tower while leaving a six-metre lane down its middle.
  trail(S, api, [[-17, 30], [-15.5, 3], [-10.5, -5], [3, -12]], 5.2, OLD_STONE, MOSS_STONE);
  for (const x of [-22.4, -10.3]) {
    for (let i = 0; i < 5; i++) {
      const z = 25.5 - i * 6.6, gy = localGround(api, x, z);
      solidBox(S, api, 0.85, 5.1, 0.85, x, gy + 2.55, z, i % 3 ? OLD_STONE : MOSS_STONE, 0, 'wall');
      S.box(1.2, 0.30, 1.2, x, api.padY + gy + 0.15, z, MORTAR);
      S.box(1.1, 0.25, 1.1, x, api.padY + gy + 5.12, z, SHINGLE);
      if (i < 4) {
        arch(S, api, x, z - 3.3, 5.2, 5.8, 0.62, i & 1 ? OLD_STONE : MOSS_STONE,
          Math.PI * 0.5, true);
      }
    }
    // A few surviving eave rafts, including a deliberate mid-run collapse, preserve the
    // cloister rhythm without turning its near view into a picket fence and flat ceiling.
    for (let i = 0; i < 7; i++) {
      if (i === 3) continue;
      S.box(2.8, 0.15, 3.8, x + (x < -16 ? 1.0 : -1.0), api.padY + 5.72 + (i & 1) * 0.10,
        24.5 - i * 4.35, i % 3 ? SHINGLE : VERDIGRIS, 0.08 * Math.sin(i));
    }
  }

  // Flying buttresses turn the nave's blank flank into a deep layered structure.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      // The west feet stand OUTSIDE the cloister lane. The old -14.7 row landed squarely
      // in the processional walk it was meant to frame.
      const z = 5.8 + i * 5.6, x = side < 0 ? -26.0 : 14.7, gy = localGround(api, x, z);
      solidBox(S, api, 1.4, 7.2, 2.2, x, gy + 3.6, z, i & 1 ? MOSS_STONE : OLD_STONE, 0, 'wall');
      if (side > 0) {
        beamBetween(S, api, [side * 8.9, 12.2, z], [x, gy + 6.5, z], 0.34, OLD_STONE, 7);
        beamBetween(S, api, [side * 8.9, 8.6, z + 0.6], [x, gy + 3.7, z + 0.6], 0.20, MOSS_STONE, 6);
      } else if ((i & 1) === 0) {
        // Two high flying ribs preserve the layered west silhouette without putting four
        // long poles across the player's road/cloister view at head height.
        beamBetween(S, api, [-8.9, 14.2, z], [x, gy + 11.4, z], 0.24, OLD_STONE, 7);
      }
      masonryFace(S, api, x - side * 0.72, z, 2.0, 6.4,
        side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 8, 3);
    }
  }

  // Dark coursing and iron cramps break up the tower's huge pale road face.
  for (let y = 2.5; y < 17; y += 2.4) {
    for (let i = 0; i < 7; i++) {
      const x = -4.6 + i * 1.53;
      S.box(1.32, 0.42, 0.10, x, api.padY + y, -5.57,
        (i + Math.floor(y)) % 3 === 0 ? MOSS_STONE : OLD_STONE, 0);
    }
  }
  for (const x of [-4.9, 4.9]) {
    S.box(0.22, 17.5, 0.16, x, api.padY + 8.75, -5.62, IRON);
    for (let y = 3; y < 17; y += 3.2) S.box(1.0, 0.16, 0.20, x, api.padY + y, -5.68, OXIDE);
  }

  // The real road passes six metres behind the nave, so this +Z wall is the first thing a
  // player naturally sees. It used to be one blank 17 x 15 m slab. Deep buttresses, dark
  // lancet recesses, voussoirs and a corroded parapet make it a cathedral end wall at arm's
  // length, while the route remains outside it on the west (x=-17).
  for (const x of [-7.3, -3.7, 0, 3.7, 7.3]) {
    S.box(1.05, 11.2, 1.55, x, api.padY + 5.6, 23.62,
      Math.abs(x) < 1 ? MOSS_STONE : OLD_STONE);
    S.box(1.45, 0.30, 1.85, x, api.padY + 0.16, 23.62, MORTAR);
    S.box(1.30, 0.26, 1.72, x, api.padY + 11.35, 23.62, SHINGLE);
  }
  for (const x of [-5.5, -1.85, 1.85, 5.5]) {
    S.box(1.55, 5.8, 0.10, x, api.padY + 7.1, 23.28, GRIME);
    S.box(1.15, 5.25, 0.08, x, api.padY + 7.05, 23.34, VERDIGRIS);
    S.cone(0.95, 1.8, 3, x, api.padY + 10.72, 23.36, OLD_STONE, Math.PI);
    for (let y = 4.8; y < 9.8; y += 1.0) {
      S.box(1.35, 0.08, 0.12, x, api.padY + y, 23.40, IRON);
    }
  }
  S.box(16.7, 0.42, 0.62, 0, api.padY + 12.4, 23.55, VERDIGRIS);
  for (let i = 0; i < 15; i++) S.box(0.54, 1.15 + (i % 3) * 0.25, 0.54,
    -7.6 + i * 1.08, api.padY + 13.0 + (i % 3) * 0.12, 23.55,
    i % 4 ? OLD_STONE : MOSS_STONE);

  // Ruined chapter house: an octagonal, roofless destination within the destination.
  const CX = 17.6, CZ = 11.0, R = 6.3;
  for (let i = 0; i < 8; i++) {
    if (i === 5) continue; // west-south opening from the nave court
    const a = i / 8 * TAU, x = CX + Math.cos(a) * R, z = CZ + Math.sin(a) * R;
    const gy = localGround(api, x, z), h = 4.8 + (i % 3) * 0.8;
    solidBox(S, api, 4.6, h, 0.48, x, gy + h * 0.5, z, i & 1 ? OLD_STONE : MOSS_STONE,
      -(a + Math.PI * 0.5), 'wall');
    masonryFace(S, api, x - Math.cos(a) * 0.27, z - Math.sin(a) * 0.27, 4.3, h * 0.86,
      -(a + Math.PI * 0.5), 6, 5);
  }
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    beamBetween(S, api, [CX + Math.cos(a) * R, 5.2, CZ + Math.sin(a) * R],
      [CX, 8.6, CZ], 0.16, VERDIGRIS, 6);
  }
  S.cyl(1.2, 1.4, 1.1, 10, CX, api.padY + 0.55, CZ, OLD_STONE);
  S.tube(1.0, 1.0, 0.16, 12, CX, api.padY + 1.13, CZ, VERDIGRIS);
  api.emit({ kind: 'circle', x: CX, z: CZ, r: 1.40,
    y0: api.padY, y1: api.padY + 1.10, tag: 'stone', standable: true });

  // The outer west buttress now carries a restoration scaffold. It climbs parallel to the
  // cloister instead of occupying its processional lane, and terminates on a visible stone
  // coping laid over the actual buttress. Every tread is a made timber deck with legs and
  // braces; none of the flying ribs are silently treated as floors.
  const catX = -26.0, catButtressZ = 5.8;
  const catWallBase = localGround(api, catX, catButtressZ);
  const catCapTop = catWallBase + 7.38;
  solidBox(S, api, 1.72, 0.18, 2.42, catX, catCapTop - 0.09,
    catButtressZ, MORTAR, 0, 'stone', true);
  const catStages = [];
  const catStartZ = -1.18, catCount = 8;
  const catLow = Math.max(localGround(api, catX, catStartZ - 1.0) + 0.62, 0.62);
  for (let i = 0; i < catCount; i++) {
    const t = i / (catCount - 1), z = catStartZ + i * 0.86;
    const top = catLow + (catCapTop - 0.62 - catLow) * t;
    routeDeck(S, api, catX, z, 1.70, 1.24, top,
      i % 3 === 0 ? VERDIGRIS : OLD_WOOD, 0, i & 1 ? TAR : MORTAR);
    // Restoration scaffold: individual plank ends, chalked end blocks and a narrow iron
    // binding replace the old monolithic front face without changing its climb hull.
    const catFaceZ = z - 0.631;
    for (let p = 0; p < 4; p++) {
      const px = catX - 0.60 + p * 0.40;
      S.box(0.31, 0.135 + (p & 1) * 0.025, 0.030, px,
        api.padY + top - 0.205 + (p & 1) * 0.008, catFaceZ,
        (p + i) % 3 === 0 ? VERDIGRIS : OLD_WOOD);
    }
    S.box(1.48, 0.035, 0.040, catX, api.padY + top - 0.285,
      catFaceZ - 0.006, IRON);
    for (const sx of [-0.70, 0.70]) S.box(0.075, 0.24, 0.038,
      catX + sx, api.padY + top - 0.235, catFaceZ - 0.008, MORTAR);
    for (const sx of [-0.66, 0.66]) {
      const gy = localGround(api, catX + sx, z);
      const h = Math.max(0.28, top - gy - 0.17);
      S.box(0.11, h, 0.11, catX + sx, api.padY + gy + h * 0.5, z,
        i & 1 ? IRON : TAR);
    }
    if (i > 0) {
      const p = catStages[i - 1];
      beamBetween(S, api, [catX - 0.76, p.top - 0.16, p.z],
        [catX - 0.76, top - 0.16, z], 0.05, OXIDE, 4);
      beamBetween(S, api, [catX + 0.76, p.top - 0.16, p.z],
        [catX + 0.76, top - 0.16, z], 0.05, TAR, 4);
    }
    catStages.push({ x: catX, z, top });
  }
  api.site.parkourRoute = {
    kind: 'cathedral-buttress-scaffold', space: 'local',
    approach: { x: catX, z: catStartZ - 1.12,
      y: groundY(api, catX, catStartZ - 1.12) },
    target: { x: catX, z: catButtressZ, y: api.padY + catCapTop },
    crown: { x: catX, z: catButtressZ, y: api.padY + catCapTop },
    stages: catStages.map((p) => ({ x: p.x, z: p.z, y: api.padY + p.top })),
  };

  // A reliquary chest makes the brazier/claim end read as a payoff without changing it.
  openCache(S, api, 7.2, -12.4, 0.08, VERDIGRIS, 8);

  return finish(k);
}

function chapel(api) {
  const k = kits(), S = k.solid;

  // Flagstones carry the eye through the road-side yard and bend around the tower to the
  // real hearth at (4.8,-4). Nothing occupies the 4 m centre of that route.
  trail(S, api, [[0, 24], [3.6, 10], [3.6, -1], [4.8, -4]], 4.2, MOSS_STONE, OLD_STONE);

  // West pilgrims' hospice: a real 12 x 17 m two-storey building, open at its court end.
  const HX = -13.0, HZ = 3.0, HW = 10.5, HD = 17.0, HH = 6.4;
  shell(S, api, HX, HZ, HW, HD, HH, Math.PI, OLD_STONE, 2.6);
  S.gable(HW + 0.8, HD + 0.8, api.padY + HH, 2.4, HX, 0, HZ, SHINGLE, Math.PI);
  plankFace(S, api, HX, HZ + HD * 0.5 + 0.25, HW - 1.0, 5.7, 0, 13);
  masonryFace(S, api, HX + HW * 0.5 + 0.25, HZ, HD - 0.8, 5.6, Math.PI * 0.5, 8, 10);
  shingleRows(S, api, HX, HZ, HW + 0.8, HD + 0.8, HH + 0.15, 2.2, Math.PI, 8);
  for (let i = 0; i < 5; i++) {
    const z = -2.8 + i * 2.9;
    S.box(0.10, 1.7, 0.12, HX + HW * 0.5 + 0.32, api.padY + 3.0, z,
      i & 1 ? IRON : OXIDE, Math.PI * 0.5);
  }
  // The hospice veranda is traversable and looks back across the whole chapel court.
  deck(S, api, -7.1, 4.0, 2.1, 13.5, 1.05, OLD_WOOD, 0, true);
  coursedSteps(S, api, -7.1, -3.3, 1.5, 1.05, 0, OLD_STONE, GRIME);
  // Three dark worn noses and off-centre repair plates make the hospice stair readable as
  // masonry repaired with salvage, rather than three pale boxes pasted onto the veranda.
  for (let i = 0; i < 3; i++) {
    const h = 0.35 * (i + 1), z = -3.3 + (i - 2) * 0.56;
    S.box(1.28, 0.055, 0.034, -7.1, api.padY + h - 0.065,
      z - 0.307, i === 1 ? OXIDE : GRIME);
    S.box(0.24, Math.max(0.10, h * 0.42), 0.030, -7.1 + (i - 1) * 0.31,
      api.padY + h * 0.42, z - 0.310, i & 1 ? MOSS_STONE : MORTAR);
  }
  for (let i = 0; i < 6; i++) {
    const z = -1.8 + i * 2.35;
    solidBox(S, api, 0.18, 3.2, 0.18, -6.3, 1.6, z, TAR, 0, 'wood');
    S.box(1.5, 0.14, 0.20, -6.7, api.padY + 3.2, z, OLD_WOOD);
  }

  // East bell-founders' yard: an open casting canopy with a black pit and a broken bell.
  const FX = 13.1, FZ = 5.5;
  deck(S, api, FX, FZ, 10.0, 12.0, 0.42, C.stone, 0, false);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = FX + sx * 4.3, z = FZ + sz * 5.1;
    solidBox(S, api, 0.36, 5.4, 0.36, x, 2.7, z, OXIDE, 0, 'metal');
  }
  for (const z of [FZ - 5.1, FZ, FZ + 5.1]) S.box(10.2, 0.34, 0.34, FX, api.padY + 5.2, z, IRON);
  for (let i = 0; i < 8; i++) {
    const z = FZ - 5.2 + i * 1.48;
    S.box(10.5, 0.14, 1.15, FX, api.padY + 5.35 + (i & 1) * 0.07, z,
      i % 3 ? SHINGLE : OXIDE);
  }
  S.cyl(2.0, 2.0, 0.08, 14, FX, api.padY + 0.47, FZ + 0.6, COAL);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU, x = FX + Math.cos(a) * 2.25, z = FZ + 0.6 + Math.sin(a) * 2.25;
    groundedBox(S, api, 1.15, 0.6, 0.40, x, z, i & 1 ? C.brick : OLD_STONE,
      -(a + Math.PI * 0.5), 'stone', true);
  }
  S.tube(1.15, 0.58, 1.8, 12, FX + 2.9, api.padY + 1.15, FZ - 2.0, IRON,
    0.5, Math.PI * 0.44);
  api.emit({ kind: 'circle', x: FX + 2.9, z: FZ - 2.0, r: 1.25,
    y0: api.padY, y1: api.padY + 2.1, tag: 'metal' });

  // Dark buttress skins and timber repairs break the original pale chapel box.
  for (const side of [-1, 1]) {
    for (const z of [0.3, 4.1, 7.9, 11.6]) {
      S.box(0.72, 4.8, 1.10, side * 4.88, api.padY + 2.4, z,
        z > 6 ? MOSS_STONE : OLD_STONE);
      beamBetween(S, api, [side * 4.9, 5.0, z], [side * 6.0, 0.2, z], 0.14,
        side > 0 ? OXIDE : TAR, 6);
    }
  }
  for (let y = 1.1; y < 5.8; y += 1.1) {
    S.box(8.4, 0.16, 0.10, 0, api.padY + y, -2.04, y % 2 > 1 ? MOSS_STONE : OLD_STONE);
  }

  // The road-facing end now has two repaired timber wings around a deep blind recess. The
  // old full-width weatherboard sheet and three stickers made the whole chapel one stripey
  // rectangle at arm's length. The east-flank route at x=3.6 remains untouched.
  for (const x of [-2.75, 2.75]) {
    plankFace(S, api, x, 12.23, 2.55, 5.75, 0, 5);
    S.box(0.74, 2.90, 0.20, x, api.padY + 3.10, 12.38, GRIME);
    S.box(0.12, 3.0, 0.25, x - 0.43, api.padY + 3.10, 12.45, OXIDE);
    S.box(0.12, 3.0, 0.25, x + 0.43, api.padY + 3.10, 12.45, OXIDE);
    S.cone(0.56, 1.25, 3, x, api.padY + 5.18, 12.45, SHINGLE, Math.PI);
  }
  S.box(2.20, 3.85, 0.28, 0, api.padY + 2.62, 12.44, GRIME);
  for (const side of [-1, 1]) {
    S.box(0.28, 4.35, 0.36, side * 1.23, api.padY + 2.75, 12.48, OLD_STONE,
      0, 0, side * 0.11);
    beamBetween(S, api, [side * 1.18, 4.72, 12.50], [0, 6.28, 12.50], 0.18, OXIDE, 6);
  }
  for (let i = 0; i < 5; i++) {
    S.box(1.25, 0.13, 2.25, -3.2 + i * 1.6, api.padY + 6.05 + (i & 1) * 0.10,
      13.15, i % 3 ? SHINGLE : OXIDE);
  }

  // The rear charnel gallery closes the court with an authored ruin rather than another
  // hut. Six open bays hold stone shelves and folded biers; the centre bay is broken out.
  for (let i = 0; i < 7; i++) {
    const x = -18.0 + i * 6.0;
    if (i === 4) continue;
    arch(S, api, x, -14.5, 4.6, 5.0 + (i % 2) * 0.7, 0.68,
      i % 3 ? OLD_STONE : MOSS_STONE, 0, false);
    for (const side of [-1, 1]) {
      S.box(1.7, 0.14, 0.66, x + side * 1.2, api.padY + 1.0, -14.1,
        side > 0 ? C.stone : MOSS_STONE);
      S.box(1.5, 0.36, 0.52, x + side * 1.2, api.padY + 1.26, -14.1,
        i & 1 ? C.cloth : BONE);
    }
  }
  for (let i = 0; i < 15; i++) {
    S.box(2.5, 0.14, 1.25, -19.0 + i * 2.7, api.padY + 5.35 + (i & 1) * 0.08,
      -14.5, i % 4 === 0 ? VERDIGRIS : SHINGLE);
  }

  openCache(S, api, 8.1, -4.3, 0.1, OLD_WOOD, 6);

  // Audit note for the route already authored here: the hospice stair meets a broad real
  // veranda. Do not stamp a second climb over the chapel merely to satisfy a route count.
  api.site.parkourRoute = {
    kind: 'chapel-hospice-veranda', space: 'local',
    approach: { x: -7.1, z: -5.22, y: groundY(api, -7.1, -5.22) },
    target: { x: -7.1, z: -2.72, y: api.padY + 1.05 },
    crown: { x: -7.1, z: 4.0, y: api.padY + 1.05 },
  };

  return finish(k);
}

function gallowsfen(api) {
  const k = kits(), S = k.solid;

  // A causeway now meets the ACTUAL +Z road. Each 1.6 m deck is a two-way floor; a broad
  // centre lane remains clear for the sightline to the shootable lamp.
  const cause = [[0, 27], [-0.4, 21], [0.7, 15], [-0.5, 9], [-1.0, 3.2]];
  for (let p = 0; p + 1 < cause.length; p++) {
    const [x0, z0] = cause[p], [x1, z1] = cause[p + 1];
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
    const n = Math.ceil(len / 1.55);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = x0 + dx * t, z = z0 + dz * t;
      const gy = localGround(api, x, z), top = gy + 0.48 + (i % 4 === 0 ? 0.03 : 0);
      deck(S, api, x, z, 3.4, len / n * 0.92, top, i & 1 ? OLD_WOOD : TAR, yaw, false);
      for (const side of [-1, 1]) {
        const f = frame(x, z, yaw), px = f.x(side * 1.45, 0), pz = f.z(side * 1.45, 0);
        const base = localGround(api, px, pz);
        S.cyl(0.10, 0.14, Math.max(0.6, top - base + 0.4), 5, px,
          api.padY + base + Math.max(0.6, top - base + 0.4) * 0.5, pz, TAR);
      }
    }
  }

  // The drowned nave is 23 x 34 m: stone arcade remnants and roof trusses make one ruined
  // building, while the open central aisle preserves the lamp shot from the causeway.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const x = side * 8.8, z = -5.0 + i * 4.7, gy = localGround(api, x, z);
      const h = 4.2 + (i % 3) * 1.1;
      solidBox(S, api, 1.1, h, 1.1, x, gy + h * 0.5 - 0.25, z,
        i & 1 ? MOSS_STONE : OLD_STONE, 0, 'wall');
      S.box(1.5, 0.25, 1.5, x, api.padY + gy + h - 0.2, z, GRIME);
      if (i < 6) arch(S, api, x, z + 2.35, 3.7, Math.min(h, 5.0), 0.62,
        i & 1 ? MOSS_STONE : OLD_STONE, Math.PI * 0.5, false);
      masonryFace(S, api, x - side * 0.58, z, 1.0, Math.max(2.8, h - 0.5),
        side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 5, 2,
        [MOSS_STONE, OLD_STONE, GRIME]);
    }
  }
  // Four heavy surviving roof couples read as one drowned church from the road. The old
  // seven thin couples dissolved into the surrounding tree trunks before the player ever
  // reached the causeway.
  for (let i = 0; i < 7; i += 2) {
    const z = -4.7 + i * 4.7;
    const eave = 8.2 + (i === 2 ? 0.6 : 0);
    beamBetween(S, api, [-8.8, eave, z], [0, 12.5, z], 0.28, TAR);
    beamBetween(S, api, [0, 12.5, z], [8.8, eave, z], 0.28, TAR);
    if (i === 0 || i === 6) {
      S.box(0.22, 0.22, 18.4, 0, api.padY + 7.25, z, OXIDE, Math.PI * 0.5);
    }
  }

  // Opaque remnants turn the roof couples into a broad, asymmetric ruin instead of more
  // line art. They hang above the six-metre open aisle and leave the lamp shot untouched.
  S.box(7.4, 0.34, 6.2, -4.7, api.padY + 9.45, 12.8, SHINGLE, 0, 0, -0.43);
  S.box(6.2, 0.34, 4.8, 5.4, api.padY + 9.0, 14.2, TAR, 0, 0, 0.38);
  for (const [x, y, z, lean] of [[-7.7, 8.2, 12.5, -0.35], [8.0, 7.7, 14.0, 0.31]]) {
    S.box(0.34, 5.8, 0.34, x, api.padY + y, z, OXIDE, 0, 0, lean);
  }

  // The drowned tower itself was still a clean pale shaft. A tarred waterline cage, rust
  // cramps and crooked maintenance braces make the surviving masonry share the ruin's age.
  for (const y of [1.0, 3.2, 5.7, 8.6, 11.8]) {
    const x = -0.10 * y;
    // Perimeter straps, never a filled square slab: torchlight can now reveal the old
    // masonry between the iron rather than five giant pancakes stacked up the steeple.
    S.box(5.30, 0.22, 0.18, x, api.padY + y, -2.56, y < 4 ? GRIME : OXIDE);
    S.box(5.30, 0.22, 0.18, x, api.padY + y, 2.56, y < 4 ? GRIME : OXIDE);
    S.box(0.18, 0.22, 5.30, x - 2.56, api.padY + y, 0, y < 4 ? GRIME : OXIDE);
    S.box(0.18, 0.22, 5.30, x + 2.56, api.padY + y, 0, y < 4 ? GRIME : OXIDE);
  }
  for (const side of [-1, 1]) {
    beamBetween(S, api, [side * 2.45, 0.2, -2.45], [side * 1.3, 12.4, -2.45], 0.11,
      side > 0 ? OXIDE : TAR, 5);
  }
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU, x = Math.cos(a) * 2.55, z = Math.sin(a) * 2.55;
    S.box(0.16, 3.1, 0.16, x, api.padY + 1.55, z, i & 1 ? TAR : OXIDE, -a);
  }

  // Drowned transept stages widen the ruin into a church-sized footprint. They are side
  // discoveries, never obstacles in the straight causeway/belfry sightline.
  for (const side of [-1, 1]) {
    const x = side * 17.0, z = 5.0, base = localGround(api, x, z);
    deck(S, api, x, z, 6.0, 9.0, base + 0.92, OLD_WOOD, 0, true);
    for (const dz of [-3.5, 0, 3.5]) {
      solidBox(S, api, 0.46, 5.8 + (dz === 0 ? 1.2 : 0), 0.46, x,
        base + 2.9, z + dz, side > 0 ? OXIDE : TAR, 0, 'wood');
    }
    beamBetween(S, api, [x, base + 6.4, z - 4.0],
      [side * 9.0, base + 4.5, z - 4.0], 0.18, TAR);
    beamBetween(S, api, [x, base + 6.4, z + 4.0],
      [side * 9.0, base + 4.5, z + 4.0], 0.18, TAR);
    for (let i = 0; i < 5; i++) {
      S.box(2.4, 0.44, 0.80, x + side * (i % 2) * 0.4,
        api.padY + base + 1.18, z - 3.0 + i * 1.45,
        i % 3 ? MOSS_STONE : OLD_STONE, side * 0.08);
    }
  }

  // Two surviving transept fronts give the drowned nave shoulders. They sit nine metres
  // clear of the causeway and deliberately disagree in height, so the far road sees a
  // ruined church-width silhouette instead of a steeple and a row of tree-like sticks.
  for (const side of [-1, 1]) {
    const x = side * 13.2, z = 11.0;
    const h = side < 0 ? 13.2 : 11.3;
    arch(S, api, x, z, 6.2, h, 1.05,
      side < 0 ? MOSS_STONE : OLD_STONE, 0, true);
    for (const edge of [-1, 1]) {
      const px = x + edge * 2.75, gy = localGround(api, px, z);
      S.box(0.78, h * 0.66, 1.35, px, api.padY + gy + h * 0.33, z - 0.18,
        edge === side ? MORTAR : GRIME, 0, 0, edge * side * 0.05);
    }
    beamBetween(S, api, [x - 2.8, h - 0.8, z - 0.6],
      [x + side * 0.7, h + (side < 0 ? 2.8 : 1.7), z - 0.6], 0.21, OXIDE, 6);
    beamBetween(S, api, [x + 2.8, h - 0.8, z - 0.6],
      [x + side * 0.7, h + (side < 0 ? 2.8 : 1.7), z - 0.6], 0.21, OXIDE, 6);
  }

  // The drowned chancel is a raised side discovery, reached by branching planks.
  deck(S, api, 12.5, -9.5, 8.5, 7.0, localGround(api, 12.5, -9.5) + 1.25,
    OLD_WOOD, -0.15, true);
  steps(S, api, 9.3, -11.6, 1.45, 1.25, -0.15, MOSS_STONE);
  arch(S, api, 12.5, -11.9, 5.4, 5.8, 0.75, OLD_STONE, 0, true);
  for (let i = 0; i < 15; i++) {
    const x = 9.2 + (i % 5) * 1.55, z = -8.0 + Math.floor(i / 5) * 1.3;
    const gy = localGround(api, 12.5, -9.5) + 1.25;
    S.box(1.22, 0.46, 0.82, x, api.padY + gy + 0.23, z,
      i % 3 === 0 ? MOSS_STONE : OLD_STONE, (i & 1) * 0.08);
    S.box(0.78, 0.06, 0.46, x, api.padY + gy + 0.49, z, GRIME, (i & 1) * 0.08);
  }

  // A punt snagged in the south aisle adds a different silhouette and a place to climb.
  const BX = -11.5, BZ = 10.2, BY = localGround(api, BX, BZ);
  S.box(4.8, 0.32, 1.7, BX, api.padY + BY + 0.38, BZ, TAR, 0.22);
  for (const side of [-1, 1]) beamBetween(S, api,
    [BX - 2.4, BY + 0.45, BZ + side * 0.82], [BX + 2.4, BY + 0.45, BZ + side * 0.82],
    0.12, OLD_WOOD);
  api.emit({ kind: 'obb', x: BX, z: BZ, halfX: 2.45, halfZ: 0.9, yaw: 0.22,
    y0: api.padY + BY + 0.22, y1: api.padY + BY + 0.54,
    tag: 'wood', standable: true });
  S.box(5.2, 0.08, 0.16, BX + 0.5, api.padY + BY + 0.75, BZ - 0.5, C.wood, -0.5);

  // A drowned maintenance stair climbs the outside of the west transept. Its first tread
  // grows directly from the existing low stage and its last reaches a new gallery laid on
  // the three visible transept posts. The central aisle and belfry shot stay completely
  // open; the hanging roof couples remain scenery, not surprise walkable planes.
  const fenX = -17.0, fenZ = 5.0;
  const fenBase = localGround(api, fenX, fenZ);
  const fenLowerTop = fenBase + 0.92;
  const fenUpperTop = fenBase + 6.55;
  deck(S, api, fenX, fenZ, 4.20, 2.30, fenUpperTop, TAR, 0, false);
  const fenStages = [];
  for (let i = 0; i < 7; i++) {
    const z = 0.68 + i * 0.70;
    const top = fenBase + 1.58 + i * 0.71;
    routeDeck(S, api, fenX, z, 1.62, 1.16, top,
      i % 3 === 0 ? OXIDE : OLD_WOOD, 0, i & 1 ? GRIME : TAR);
    // Water-blackened boards deliberately disagree in width and colour. The tread collider
    // stays a clean rectangle, but its merged face now reads as salvaged transept timber.
    const fenFaceZ = z - 0.591;
    for (let p = 0; p < 3; p++) {
      const px = fenX - 0.54 + p * 0.54;
      S.box(0.43 - (p === 1 ? 0.05 : 0), 0.15 + ((p + i) & 1) * 0.035,
        0.032, px, api.padY + top - 0.22 + (p === 2 ? 0.015 : 0), fenFaceZ,
        (p + i) % 3 === 0 ? OXIDE : ((p + i) & 1 ? TAR : OLD_WOOD));
    }
    for (const sx of [-0.57, 0.57]) S.box(0.065, 0.235, 0.038,
      fenX + sx, api.padY + top - 0.235, fenFaceZ - 0.006, IRON);
    for (const sx of [-0.62, 0.62]) {
      const h = Math.max(0.22, top - fenLowerTop - 0.16);
      S.box(0.10, h, 0.10, fenX + sx,
        api.padY + fenLowerTop + h * 0.5, z, i & 1 ? TAR : OXIDE);
    }
    if (i > 0) {
      const p = fenStages[i - 1];
      beamBetween(S, api, [fenX - 0.70, p.top - 0.14, p.z],
        [fenX - 0.70, top - 0.14, z], 0.05, TAR, 4);
    }
    fenStages.push({ x: fenX, z, top });
  }
  api.site.parkourRoute = {
    kind: 'gallowsfen-transept-gallery', space: 'local',
    approach: { x: fenX, z: -1.0, y: groundY(api, fenX, -1.0) },
    mount: { x: fenX, z: 0.55, y: api.padY + fenLowerTop },
    target: { x: fenX, z: fenZ, y: api.padY + fenUpperTop },
    crown: { x: fenX, z: fenZ, y: api.padY + fenUpperTop },
    stages: fenStages.map((p) => ({ x: p.x, z: p.z, y: api.padY + p.top })),
  };

  // Low enough not to occlude the belfry target, close enough to make its prize readable.
  openCache(S, api, -7.0, -2.2, -0.45, VERDIGRIS, 6);

  return finish(k);
}

function hollowMill(api) {
  const k = kits(), S = k.solid;

  trail(S, api, [[0, 25], [3.2, 14], [3.0, 7.0], [0, 5.2]], 4.4, C.ash, OLD_STONE);

  // The granary is a second major mass: stone lower storey, weatherboard loft, deep roof.
  const GX = 14.5, GZ = -5.5, GW = 12.0, GD = 17.0;
  shell(S, api, GX, GZ, GW, GD, 7.2, 0, OLD_STONE, 3.0);
  S.gable(GW + 0.9, GD + 0.9, api.padY + 7.2, 5.2, GX, 0, GZ, SHINGLE, 0);
  masonryFace(S, api, GX, GZ + GD * 0.5 + 0.24, GW - 0.8, 3.0, 0, 6, 10);
  // The weatherboards are the loft, not a second facade pasted over the stone storey.
  plankFace(S, api, GX, GZ + GD * 0.5 + 0.30, GW - 0.8, 3.4, 0, 13, 3.05);
  rustFace(S, api, GX - GW * 0.5 - 0.25, GZ, GD - 0.7, 6.2, -Math.PI * 0.5, 18);
  shingleRows(S, api, GX, GZ, GW + 0.9, GD + 0.9, 7.35, 4.8, 0, 11);

  // A tall grain elevator grows through the back half of the granary. It gives the sails
  // a second vertical mass and turns the collection into a mill complex from the road.
  // The shaft is well east of the x=0..3 arrival route.
  const EX = 15.0, EZ = -7.3, EH = 15.4, EGY = localGround(api, EX, EZ);
  groundedBox(S, api, 5.8, EH, 5.8, EX, EZ, TAR, 0, 'wall');
  masonryFace(S, api, EX, EZ + 2.94, 5.3, 5.0, 0, 7, 6,
    [OLD_STONE, MOSS_STONE, GRIME]);
  plankFace(S, api, EX, EZ + 2.98, 5.2, 8.8, 0, 8, 5.05);
  rustFace(S, api, EX - 2.94, EZ, 5.2, 9.6, -Math.PI * 0.5, 9);
  for (const y of [4.8, 9.2, 13.4]) {
    S.box(6.25, 0.24, 6.25, EX, api.padY + EGY + y, EZ,
      y === 9.2 ? OXIDE : IRON);
  }
  S.gable(6.8, 6.8, api.padY + EGY + EH, 4.4, EX, 0, EZ, SHINGLE, 0);
  for (const x of [EX - 1.55, EX + 1.55]) {
    S.box(0.82, 3.0, 0.16, x, api.padY + EGY + 10.9, EZ + 3.04, COAL);
    S.cone(0.52, 1.0, 3, x, api.padY + EGY + 12.9, EZ + 3.08, OXIDE, Math.PI);
  }
  beamBetween(S, api, [11.8, EGY + 12.2, EZ], [3.2, 10.0, -1.0], 0.24, TAR, 7);
  beamBetween(S, api, [12.2, EGY + 10.9, EZ + 0.7], [3.5, 8.9, -0.3], 0.13, OXIDE, 6);

  // Banked wagon deck and climb into the loft; the court route stays west of it.
  deck(S, api, 8.4, 8.0, 6.0, 8.0, 2.1, OLD_WOOD, 0, true);
  coursedSteps(S, api, 8.4, 12.5, 2.2, 2.1, 0, OLD_STONE, OXIDE);
  // Course the wagon stair's enormous road-facing risers. All strips sit inside the real
  // stone stair silhouette, so movement still sees precisely the six original step boxes.
  for (let i = 0; i < 6; i++) {
    const h = 0.35 * (i + 1), z = 12.5 + (i - 5) * 0.56;
    S.box(1.92, 0.055, 0.034, 8.4, api.padY + h - 0.075,
      z + 0.307, i % 3 === 0 ? OXIDE : TAR);
    for (const sx of [-0.54, 0.54]) S.box(0.075, Math.max(0.10, h * 0.46), 0.030,
      8.4 + sx, api.padY + h * 0.43, z + 0.310,
      (i + (sx > 0 ? 1 : 0)) & 1 ? MOSS_STONE : GRIME);
  }
  // Two crooked supports and one brace hold the loft deck without drawing a perfect
  // rectangular prototype frame around the windmill when seen from the forest road.
  for (const x of [6.3, 10.5]) {
    const gy = localGround(api, x, 4.1);
    solidBox(S, api, 0.46, 4.7, 0.46, x, gy + 2.35, 4.1, TAR, 0, 'wood');
  }
  beamBetween(S, api, [6.3, 4.65, 4.1], [10.5, 1.15, 4.1], 0.16, OXIDE, 6);
  for (let i = 0; i < 5; i++) {
    const z = 5.1 + i * 1.55;
    S.box(5.4, 0.07, 0.36, 8.4, api.padY + 2.15 + i * 0.03, z,
      i & 1 ? C.plank : OLD_WOOD);
  }
  // An overhead grain bridge ties the new mass into the windmill instead of reading as a
  // random detached building.
  deck(S, api, 7.3, -1.0, 8.4, 1.7, 6.0, OLD_WOOD, Math.PI * 0.5, true);
  for (let i = 0; i < 8; i++) {
    const x = 3.7 + i * 1.0;
    S.box(0.75, 2.1, 0.12, x, api.padY + 7.05, -1.0,
      i % 3 ? TAR : C.plank, Math.PI * 0.5);
  }
  S.box(8.6, 0.18, 2.0, 7.3, api.padY + 8.2, -1.0, SHINGLE, Math.PI * 0.5);

  // A grain-loader stair finally joins the wagon deck to the overhead bridge. The broad
  // wagon stair already supplies the ground-to-2.1 m opening; six close-set timber stages
  // then climb in one straight run toward the bridge edge. Uprights start on the visible
  // wagon deck and sack bundles sit beneath alternating treads, so this reads as mill
  // equipment rather than six floating game platforms.
  const millStages = [];
  for (let i = 0; i < 6; i++) {
    const z = 8.18 - i * 0.98;
    const top = 2.72 + i * 0.64;
    routeDeck(S, api, 7.3, z, 1.72, 1.28, top,
      i % 3 === 0 ? C.plank : OLD_WOOD, 0, i & 1 ? OXIDE : TAR);
    // A loader tread is a slatted machine part, not a full beige drawer. Thin batten ends,
    // a centre seam and rust shoes sit on the visual face only.
    const millFaceZ = z + 0.651;
    for (let p = 0; p < 4; p++) S.box(0.32, 0.145, 0.030,
      7.3 - 0.60 + p * 0.40, api.padY + top - 0.21 + (p & 1) * 0.012,
      millFaceZ, (p + i) % 3 === 0 ? C.plank : TAR);
    S.box(0.055, 0.245, 0.038, 7.3, api.padY + top - 0.235,
      millFaceZ + 0.006, OXIDE);
    for (const sx of [-0.68, 0.68]) S.box(0.10, 0.075, 0.040,
      7.3 + sx, api.padY + top - 0.14, millFaceZ + 0.008, IRON);
    const supportH = top - 2.1 - 0.16;
    for (const sx of [-0.66, 0.66]) S.box(0.11, supportH, 0.11,
      7.3 + sx, api.padY + 2.1 + supportH * 0.5, z, i & 1 ? TAR : OXIDE);
    if ((i & 1) === 0) {
      for (const sx of [-0.36, 0.36]) S.box(0.55, 0.30, 0.76, 7.3 + sx,
        api.padY + 2.28, z, i % 3 ? C.cloth : BONE, sx * 0.10);
    }
    if (i > 0) {
      const p = millStages[i - 1];
      beamBetween(S, api, [6.55, p.top - 0.15, p.z],
        [6.55, top - 0.15, z], 0.05, OXIDE, 4);
    }
    millStages.push({ x: 7.3, z, top });
  }
  api.site.parkourRoute = {
    kind: 'mill-grain-loader', space: 'local',
    approach: { x: 8.4, z: 14.25, y: groundY(api, 8.4, 14.25) },
    mount: { x: 8.4, z: 11.9, y: api.padY + 2.1 },
    target: { x: 7.3, z: 3.05, y: api.padY + 6.0 },
    crown: { x: 7.3, z: -1.0, y: api.padY + 6.0 },
    stages: millStages.map((p) => ({ x: p.x, z: p.z, y: api.padY + p.top })),
  };

  // Drying racks, visibly full, occupy the west yard and give it things to walk among.
  for (let r = 0; r < 3; r++) {
    const x = -17.0 + r * 3.8, z = 8.0 + r * 2.0, gy = localGround(api, x, z);
    for (const sx of [-1, 1]) solidBox(S, api, 0.22, 4.5, 0.22, x + sx * 1.5,
      gy + 2.25, z, TAR, 0, 'wood');
    for (let y = 0.8; y < 4.2; y += 0.65) {
      S.box(3.4, 0.11, 0.16, x, api.padY + gy + y, z, OLD_WOOD);
      for (let i = 0; i < 7; i++) S.box(0.32, 0.48, 0.08, x - 1.3 + i * 0.43,
        api.padY + gy + y - 0.28, z + 0.10, (i + r) % 3 ? C.cloth : BONE);
    }
  }

  // Threshing floor with a toothed horse gear; it is a climbable landmark within the yard.
  const RX = -10.5, RZ = -8.5, R = 5.4, RY = localGround(api, RX, RZ);
  S.cyl(R, R, 0.18, 20, RX, api.padY + RY + 0.09, RZ, OLD_STONE);
  api.emit({ kind: 'circle', x: RX, z: RZ, r: R, y0: api.padY + RY,
    y1: api.padY + RY + 0.18, tag: 'stone', standable: true });
  const ring = new THREE.TorusGeometry(3.6, 0.22, 6, 28);
  ring.rotateX(Math.PI * 0.5); ring.translate(RX, api.padY + RY + 0.46, RZ); S.push(ring, OXIDE);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU, x = RX + Math.cos(a) * 4.0, z = RZ + Math.sin(a) * 4.0;
    S.box(0.28, 0.50, 0.40, x, api.padY + RY + 0.38, z, IRON, -a);
  }
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    beamBetween(S, api, [RX, RY + 0.47, RZ],
      [RX + Math.cos(a) * 3.5, RY + 0.47, RZ + Math.sin(a) * 3.5], 0.10, OXIDE, 5);
  }

  openCache(S, api, -2.7, 6.3, 0.22, OLD_WOOD, 7);

  return finish(k);
}

function gardenOfRest(api) {
  const k = kits(), S = k.solid;

  trail(S, api, [[0, 26], [0, 18], [0, 10.6]], 5.5, OLD_STONE, MOSS_STONE);

  // The mourning arcade makes the road entrance a 30 m processional sequence. Paired
  // columns and half-roofs frame the mausoleum lamp without closing the central avenue.
  for (const side of [-1, 1]) {
    const x = side * 8.6;
    for (let i = 0; i < 5; i++) {
      const z = 24.0 - i * 3.5, gy = localGround(api, x, z);
      solidBox(S, api, 0.62, 4.1, 0.62, x, gy + 2.05, z,
        i % 3 === 0 ? MOSS_STONE : OLD_STONE, 0, 'wall');
      S.box(0.92, 0.16, 0.92, x, api.padY + gy + 4.13, z, MORTAR);
      if (i < 4) arch(S, api, x, z - 1.75, 2.8, 4.25, 0.52,
        i & 1 ? MOSS_STONE : OLD_STONE, Math.PI * 0.5, true);
    }
    for (let i = 0; i < 8; i++) {
      if (i === 3 || i === 4) continue;
      const z = 23.0 - i * 1.9;
      S.box(3.3, 0.15, 1.45, side * 9.7, api.padY + 4.45 + (i & 1) * 0.08, z,
        i % 3 ? SHINGLE : VERDIGRIS);
    }
  }

  // Two columbarium ranges, each a patterned wall of actual niches rather than repeated
  // featureless boxes. Their broken centre sections open onto the grave field.
  for (const side of [-1, 1]) {
    const x = side * 19.0, faceYaw = side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
    for (const [z, d] of [[-8.5, 11.0], [7.5, 10.0]]) {
      groundedBox(S, api, 0.70, 6.2, d, x, z, OLD_STONE, 0, 'wall');
      masonryFace(S, api, x - side * 0.38, z, d - 0.6, 5.8, faceYaw, 9,
        Math.max(6, Math.round(d * 0.52)), [OLD_STONE, MOSS_STONE, MORTAR, GRIME]);
    }
    for (let z = -11.5; z <= 9.5; z += 2.4) {
      if (z > -3.0 && z < 2.8) continue;
      for (let y = 1.0; y <= 4.8; y += 1.3) {
        S.box(0.10, 0.72, 1.35, x - side * 0.43, api.padY + localGround(api, x, z) + y,
          z, COAL);
        S.box(0.08, 0.12, 1.48, x - side * 0.50, api.padY + localGround(api, x, z) + y - 0.42,
          z, iNiche(z, y), faceYaw);
      }
    }
    for (const z of [-13.8, 12.0]) {
      const gy = localGround(api, x, z);
      S.cone(1.3, 3.0, 4, x, api.padY + gy + 7.7, z, SHINGLE);
      solidBox(S, api, 1.4, 7.0, 1.4, x, gy + 3.5, z, MOSS_STONE, 0, 'wall');
    }
  }

  // One broken run of memorial plinths reaches the west columbarium wall-walk. Each riser
  // is a visibly solid monument base with a horizontal stone crown; a fresh coping slab on
  // the actual wall receives the last step. The route stays west of the grave avenue and
  // does not make either whole columbarium range magically walkable.
  const gardenWallX = -19.0, gardenZ = 4.8;
  const gardenWallBase = localGround(api, gardenWallX, 7.5);
  const gardenCapTop = gardenWallBase + 6.38;
  solidBox(S, api, 1.28, 0.18, 3.20, gardenWallX, gardenCapTop - 0.09,
    gardenZ, MORTAR, 0, 'stone', true);
  const gardenStages = [];
  const gardenStartX = -12.60, gardenCount = 8;
  const gardenLow = localGround(api, gardenStartX, gardenZ) + 0.58;
  for (let i = 0; i < gardenCount; i++) {
    const t = i / (gardenCount - 1), x = gardenStartX - i * 0.76;
    const top = gardenLow + (gardenCapTop - 0.58 - gardenLow) * t;
    const gy = localGround(api, x, gardenZ);
    const h = Math.max(0.36, top - gy);
    memorialPlinth(S, api, 1.30 - (i % 3) * 0.06, h, 1.12,
      x, gy, gardenZ, i & 1 ? MOSS_STONE : OLD_STONE,
      (i & 1) ? 0.035 : -0.025);
    // A recessed memorial tablet and a buried cap course give each riser a front and a
    // history. They remain below `top` and emit no collider, preserving every landing.
    const plinthW = 1.30 - (i % 3) * 0.06, plinthYaw = (i & 1) ? 0.035 : -0.025;
    const pf = frame(x, gardenZ, plinthYaw);
    const plaqueH = Math.min(0.62, Math.max(0.22, h * 0.38));
    const plaqueY = gy + Math.min(h * 0.52, h - plaqueH * 0.55);
    const plaqueX = plinthW * 0.5 + 0.008, plaqueCol = i % 3 === 0 ? COAL : GRIME;
    // An empty four-piece frame reads as a carved tablet; the former filled rectangle read
    // as yet another box pasted onto the box.
    for (const lz of [-0.285, 0.285]) S.box(0.032, plaqueH, 0.050,
      pf.x(plaqueX, lz), api.padY + plaqueY, pf.z(plaqueX, lz), plaqueCol, plinthYaw);
    for (const sy of [-1, 1]) S.box(0.032, 0.050, 0.62,
      pf.x(plaqueX, 0), api.padY + plaqueY + sy * (plaqueH * 0.5 - 0.025),
      pf.z(plaqueX, 0), plaqueCol, plinthYaw);
    // Chipped side blocks give each plinth a different ruin profile without raising its
    // walkable top or inventing a second collision surface.
    S.box(0.42, Math.min(0.54, h * 0.35), 0.34, x + (i & 1 ? 0.42 : -0.42),
      api.padY + gy + Math.min(0.27, h * 0.18), gardenZ + 0.67,
      i % 3 ? GRIME : MORTAR, i * 0.07);
    gardenStages.push({ x, z: gardenZ, top });
  }
  api.site.parkourRoute = {
    kind: 'garden-columbarium-plinths', space: 'local',
    approach: { x: gardenStartX + 1.18, z: gardenZ,
      y: groundY(api, gardenStartX + 1.18, gardenZ) },
    target: { x: gardenWallX, z: gardenZ, y: api.padY + gardenCapTop },
    crown: { x: gardenWallX, z: gardenZ, y: api.padY + gardenCapTop },
    stages: gardenStages.map((p) => ({ x: p.x, z: p.z, y: api.padY + p.top })),
  };

  // Mortuary gatehouse: the cemetery needed one unmistakable vertical mass from the road,
  // not another waist-high wall hiding in fog. The open portal remains centred on the grave
  // avenue; paired towers, steep caps and a deliberately broken block gable make a dark,
  // asymmetric silhouette well beyond the claim without closing the player's route.
  const GX = 0, GZ = -10.5, GROUND = localGround(api, GX, GZ);
  arch(S, api, GX, GZ + 1.42, 5.8, 9.4, 1.10, OLD_STONE, 0, false);
  for (const side of [-1, 1]) {
    const x = GX + side * 4.65, gy = localGround(api, x, GZ);
    groundedBox(S, api, 2.65, 11.8, 3.15, x, GZ, side > 0 ? MOSS_STONE : OLD_STONE,
      0, 'wall');
    masonryFace(S, api, x, GZ + 1.61, 2.50, 11.1, 0, 12, 3,
      [OLD_STONE, MOSS_STONE, MORTAR, GRIME]);
    // Projecting bands and corner quoins stop each tall shaft reading as a blank cuboid.
    for (const y of [2.1, 5.0, 8.0, 10.9]) {
      S.box(3.02, 0.22, 3.48, x, api.padY + gy + y, GZ,
        y === 5.0 ? VERDIGRIS : MORTAR);
    }
    for (const edge of [-1, 1]) {
      for (let row = 0; row < 6; row++) {
        S.box(0.34, 0.72, 0.16, x + edge * 1.34, api.padY + gy + 0.75 + row * 1.78,
          GZ + 1.66, row % 3 ? MORTAR : MOSS_STONE);
      }
    }
    S.cone(2.12, 4.35, 4, x, api.padY + gy + 13.98, GZ, SHINGLE, Math.PI * 0.25);
    S.cone(1.50, 0.32, 4, x, api.padY + gy + 11.92, GZ, OXIDE, Math.PI * 0.25);
    // One tower has lost its vane, making the skyline authored rather than mirror-perfect.
    if (side < 0) {
      S.cyl(0.10, 0.13, 1.65, 6, x, api.padY + gy + 16.55, GZ, IRON);
      S.box(1.10, 0.12, 0.12, x + 0.32, api.padY + gy + 16.82, GZ, OXIDE, -0.22);
    }
    beamBetween(S, api, [x + side * 1.20, gy + 9.7, GZ - 1.45],
      [x + side * 3.05, gy + 5.0, GZ - 4.15], 0.18, VERDIGRIS, 6);
  }
  // Corbelled gable courses leave a chipped central bite while climbing to a 14.8 m peak.
  for (let row = 0; row < 7; row++) {
    const y = GROUND + 9.55 + row * 0.76;
    const half = 3.28 - row * 0.43;
    const bite = row === 3 || row === 4;
    const col = row % 3 === 0 ? MOSS_STONE : (row % 2 ? MORTAR : OLD_STONE);
    if (bite) {
      S.box(half - 0.62, 0.61, 0.82, -half * 0.5 - 0.31, api.padY + y,
        GZ + 1.41, col);
      S.box(half - 1.18, 0.61, 0.82, half * 0.5 + 0.59, api.padY + y,
        GZ + 1.41, col);
    } else {
      S.box(half * 2, 0.61, 0.82, 0, api.padY + y, GZ + 1.41, col);
    }
  }
  beamBetween(S, api, [-3.45, GROUND + 9.35, GZ + 1.88],
    [0, GROUND + 15.25, GZ + 1.88], 0.14, OXIDE, 6);
  beamBetween(S, api, [3.45, GROUND + 9.35, GZ + 1.88],
    [0, GROUND + 15.25, GZ + 1.88], 0.14, OXIDE, 6);
  // Short ruined chapel returns give the skyline depth while leaving both side paths open.
  for (const side of [-1, 1]) {
    const x = side * 5.95;
    for (let i = 0; i < 3; i++) {
      const z = GZ - 2.8 - i * 2.0, h = 6.6 - i * 1.25;
      groundedBox(S, api, 0.62, h, 2.0, x, z,
        (i + (side > 0 ? 1 : 0)) % 2 ? MOSS_STONE : OLD_STONE, 0, 'wall');
      S.box(0.88, 0.20, 2.18, x, api.padY + localGround(api, x, z) + h + 0.08, z,
        i === 1 ? VERDIGRIS : MORTAR);
    }
  }

  // Ossuary rotunda: a layered circular silhouette, open toward the avenue.
  const OX = 13.5, OZ = -17.0, OR = 5.8;
  S.cyl(OR, OR, 0.20, 18, OX, api.padY + localGround(api, OX, OZ) + 0.10, OZ, OLD_STONE);
  api.emit({ kind: 'circle', x: OX, z: OZ, r: OR, y0: api.padY + localGround(api, OX, OZ),
    y1: api.padY + localGround(api, OX, OZ) + 0.20, tag: 'stone', standable: true });
  for (let i = 0; i < 12; i++) {
    if (i === 5 || i === 6) continue;
    const a = i / 12 * TAU, x = OX + Math.cos(a) * OR, z = OZ + Math.sin(a) * OR;
    const gy = localGround(api, x, z);
    solidBox(S, api, 0.72, 5.2, 0.72, x, gy + 2.6, z,
      i & 1 ? MOSS_STONE : OLD_STONE, 0, 'wall');
    S.box(1.0, 0.20, 1.0, x, api.padY + gy + 5.25, z, MORTAR);
    beamBetween(S, api, [x, gy + 5.3, z], [OX, 8.2, OZ], 0.14,
      i % 3 ? VERDIGRIS : IRON, 6);
  }
  const dome = new THREE.SphereGeometry(4.2, 16, 7, 0, TAU, 0, Math.PI * 0.48);
  dome.scale(1, 0.60, 1); dome.translate(OX, api.padY + 6.25, OZ); S.push(dome, VERDIGRIS);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * TAU;
    S.box(1.15, 0.55, 0.65, OX + Math.cos(a) * 3.0, api.padY + localGround(api, OX, OZ) + 0.48,
      OZ + Math.sin(a) * 3.0, i % 3 ? OLD_STONE : MOSS_STONE, -a);
  }

  // Tall, varied monuments break the old copy-paste grave boxes into authored clusters.
  for (const [x, z, h, kind] of [[-11, 11, 5.4, 0], [11, 7, 4.3, 1], [-9, -8, 6.2, 2], [7, -5, 4.8, 0]]) {
    const gy = localGround(api, x, z);
    solidBox(S, api, 1.5, h * 0.70, 1.5, x, gy + h * 0.35, z,
      kind === 1 ? MOSS_STONE : OLD_STONE, 0, 'wall');
    if (kind === 0) {
      S.cone(1.4, h * 0.30, 4, x, api.padY + gy + h * 0.85, z, SHINGLE);
    } else if (kind === 1) {
      S.box(4.0, 0.48, 0.60, x, api.padY + gy + h * 0.72, z, OLD_STONE);
      S.box(0.55, h * 0.45, 0.55, x, api.padY + gy + h * 0.86, z, OLD_STONE);
    } else {
      S.cyl(1.8, 1.8, 0.45, 12, x, api.padY + gy + h * 0.72, z, VERDIGRIS);
      S.cyl(0.28, 0.35, h * 0.42, 8, x, api.padY + gy + h * 0.91, z, IRON);
    }
  }

  // Pair of exedra at the far cross-axis: open monumental wings whose curved purpose is
  // legible from the avenue. These are the cemetery's breadth, not two more box sheds.
  for (const side of [-1, 1]) {
    const x = side * 24.0, z = -15.0, gy = localGround(api, x, z);
    arch(S, api, x, z, 5.5, 7.0, 0.9, side > 0 ? MOSS_STONE : OLD_STONE,
      Math.PI * 0.5, true);
    for (let i = -2; i <= 2; i++) {
      const a = i * 0.25, px = x + Math.sin(a) * 4.8, pz = z + Math.cos(a) * 4.8 - 4.8;
      solidBox(S, api, 0.60, 4.2 - Math.abs(i) * 0.35, 0.60, px,
        gy + 2.1, pz, i & 1 ? OLD_STONE : MOSS_STONE, 0, 'wall');
      beamBetween(S, api, [px, gy + 4.25, pz], [x, gy + 6.8, z], 0.11, VERDIGRIS);
    }
  }

  // Votive strongbox beside, not on, the real mausoleum lamp trigger.
  openCache(S, api, 3.2, 10.2, -0.12, VERDIGRIS, 8);

  return finish(k);
}

function iNiche(z, y) {
  const k = (Math.round((z + 20) * 2) + Math.round(y * 3)) % 4;
  return k === 0 ? BONE : (k === 1 ? MORTAR : (k === 2 ? VERDIGRIS : OLD_STONE));
}

function finish(k) {
  return {
    solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp,
  };
}

/** Integration map for places.js's ordinary DRESS_CHAIN (id keys win over kind keys). */
export const DRESS = Object.freeze({
  'weeping-mine': weepingMine,
  cathedral,
  chapel,
  gallowsfen,
  'hollow-mill': hollowMill,
  'garden-of-rest': gardenOfRest,
});

/** Single-function integration surface for callers that do not use the dress map. */
export function destinationCompound(api) {
  const fn = api && api.site ? DRESS[api.site.id] : null;
  return typeof fn === 'function' ? fn(api) : null;
}

/** Test/report ledger: authored extents and the route deliberately kept open in each. */
export const COMPOUND_SPECS = Object.freeze({
  'weeping-mine': Object.freeze({ footprint: [-18, 24, -16, 24], route: [[8.8, 23], [10.6, 11], [12.5, -13.9]], find: 'open blasting chest' }),
  cathedral: Object.freeze({ footprint: [-27, 24, -14, 30], route: [[-17, 30], [-15.5, 3], [-10.5, -5], [3, -12]], find: 'open reliquary' }),
  chapel: Object.freeze({ footprint: [-21, 21, -15, 24], route: [[0, 24], [3.6, 10], [3.6, -1], [4.8, -4]], find: 'open pilgrims cache' }),
  gallowsfen: Object.freeze({ footprint: [-20, 20, -14, 27], route: [[0, 27], [-0.4, 21], [0.7, 15], [-1, 3.2]], find: 'open sextons cache' }),
  'hollow-mill': Object.freeze({ footprint: [-19, 21, -15, 25], route: [[0, 25], [3.2, 14], [3, 7], [0, 5.2]], find: 'open grainmasters cache' }),
  'garden-of-rest': Object.freeze({ footprint: [-27, 27, -23, 26], route: [[0, 26], [0, 18], [0, 10.6]], find: 'open votive strongbox' }),
});
