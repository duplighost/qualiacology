// Your Apartment Smells Like Summer: the things on its lines. In her apartment, at our size:
// watermelon on a milk crate ("smells like summer"), the Polaroid that flashes as you smile like
// you got caught, prayer candles on the floor ("nothing here is sacred"), two pairs of shoes
// kicked off ("two amateurs at wanting"), the projector throwing a scene on the wall, the moving
// boxes ("we are not built to stay"), the sheers blowing in at the window she leaves by. Out on
// the block: a drum kit on a roof, the boombox on the ledge, a plane going over ("smells like
// leaving"), a jug of cheap wine, a clock at midnight, a saucepan of cereal with a fork in it, a
// fuse burning to a firecracker ("a short fuse thing"). The hallway's busted light. The lyrics in
// neon: in windows, on her walls, hung off the walk-ups.

import * as THREE from 'three';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { clamp, smooth, pick, TAU, merge, box, cyl, sph, seeded, rgb, paint, tag, mergeTagged, VCM, glowMat, faceQ, SIDE, U } from './yas-kit.js';

const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t) + (it.lift ?? 0); return it; };
// a board on a room's wall shows only once its room does (before that it would hang in the street)
function roomShown(S, t) {
  for (const r of S.plan.rooms || []) if (t >= r.from && t < r.to) return (S.tNow ?? -1e9) > (r.showFrom ?? -1e9);
  return true;
}

// ---------- her apartment's things (about ten times our size) ----------
const AP = {
  // a milk crate for a table, a plate of watermelon on it, half a melon beside
  melon() {
    const parts = [], R = seeded(5);
    const crate = rgb(0x2a6ad8), rind = rgb(0x2a7a3a), pale = rgb(0xd8f0b0), red = rgb(0xff3a4a), seed = rgb(0x1a1210);
    // the crate: a frame of bars, open sides
    for (const [w, h, d, x, y, z] of [[6.6, 0.4, 6.6, 0, 0.2, 0], [6.6, 0.5, 0.4, 0, 5.4, 3.1], [6.6, 0.5, 0.4, 0, 5.4, -3.1], [0.4, 0.5, 6.6, 3.1, 5.4, 0], [0.4, 0.5, 6.6, -3.1, 5.4, 0], [6.6, 0.4, 0.4, 0, 2.8, 3.1], [6.6, 0.4, 0.4, 0, 2.8, -3.1], [0.4, 0.4, 6.6, 3.1, 2.8, 0], [0.4, 0.4, 6.6, -3.1, 2.8, 0]]) parts.push(paint(box(w, h, d, x, y, z), crate));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(box(0.5, 5.6, 0.5, sx * 3.05, 2.8, sz * 3.05), crate));
    for (let k = -2; k <= 2; k++) { parts.push(paint(box(0.25, 5.2, 0.25, k * 1.2, 2.8, 3.1), crate)); parts.push(paint(box(0.25, 5.2, 0.25, 3.1, 2.8, k * 1.2), crate)); }
    // the plate, and the wedges fanned on it
    parts.push(paint(cyl(3.0, 2.6, 0.3, 28, 0, 5.85, 0), rgb(0xf4f2ee)));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + R() * 0.3;
      const s = new THREE.Shape(); s.moveTo(-1.6, 0); s.quadraticCurveTo(0, -0.7, 1.6, 0); s.lineTo(0, 2.2); s.lineTo(-1.6, 0);
      const wedge = new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: false, curveSegments: 8 }); wedge.translate(0, 0, -0.27);
      const P = wedge.attributes.position.array, n = P.length / 3, cc = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const y = P[i * 3 + 1]; const q = y < -0.32 ? rind : y < -0.12 ? pale : red; cc.set(q, i * 3); }
      wedge.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      wedge.rotateX(-Math.PI / 2); wedge.rotateZ(0.3); wedge.rotateY(a); wedge.translate(Math.cos(a) * 1.2, 6.3, -Math.sin(a) * 1.2); parts.push(wedge);
      for (let q = 0; q < 3; q++) { const r = 0.5 + q * 0.4; parts.push(paint(sph(0.09, 1.4, 0.6, 1, Math.cos(a) * (1.2 + r), 6.62, -Math.sin(a) * (1.2 + r) + (R() - 0.5) * 0.4, 5, 4), seed)); }
    }
    // half a melon on the floor beside the crate, cut side up
    const half = new THREE.SphereGeometry(3.4, 24, 12, 0, TAU, 0, Math.PI / 2); half.rotateX(Math.PI); half.scale(1.15, 0.9, 1); half.translate(6.4, 3.06, 2.4); parts.push(paint(half, rind));
    parts.push(paint(cyl(3.85, 3.85, 0.12, 24, 6.4, 3.08, 2.4), red));
    for (let q = 0; q < 14; q++) { const a = R() * TAU, r = 1 + R() * 2; parts.push(paint(sph(0.12, 1.4, 0.5, 1, 6.4 + Math.cos(a) * r, 3.16, 2.4 + Math.sin(a) * r, 5, 4), seed)); }
    return merge(parts);
  },
  // a Polaroid camera on a stack of books, its lens to the road; the photo comes out the front
  camera() {
    const parts = [], cream = rgb(0xf2ece0), black = rgb(0x1a1a1e);
    const R = seeded(9);
    for (let k = 0; k < 3; k++) parts.push(paint(box(7.5 - k * 0.6, 1.4, 5.4 - k * 0.3, (R() - 0.5) * 0.6, 0.7 + k * 1.4, (R() - 0.5) * 0.5), rgb(pick(R, [0x8a2a2a, 0x2a4a6a, 0x3a5a3a, 0xc8a050]))));
    const y0 = 4.2;
    parts.push(paint(box(5.6, 4.6, 5.2, 0, y0 + 2.3, 0), cream));
    const top = box(5.6, 1.4, 4.2, 0, 0, 0); top.rotateX(-0.5); top.translate(0, y0 + 5.0, -0.7); parts.push(paint(top, cream));
    parts.push(paint(box(5.62, 1.0, 5.22, 0, y0 + 0.9, 0), black));
    // the rainbow stripe down the front
    [0xe8402a, 0xf08a2a, 0xf4c83a, 0x3aa85a, 0x2a7ad8].forEach((c, i) => parts.push(paint(box(0.28, 3.2, 0.05, -0.56 + i * 0.28, y0 + 2.9, 2.62), rgb(c))));
    // the lens, the eye, the flash window
    const lens = cyl(1.3, 1.3, 0.7, 24); lens.rotateX(Math.PI / 2); lens.translate(1.2, y0 + 3.0, 2.85); parts.push(paint(lens, black));
    const glass = cyl(0.85, 0.85, 0.1, 24); glass.rotateX(Math.PI / 2); glass.translate(1.2, y0 + 3.0, 3.22); parts.push(paint(glass, rgb(0x3a4a6a)));
    parts.push(paint(box(1.6, 0.8, 0.1, -1.6, y0 + 5.15, 2.4).rotateX(-0.5), black));
    parts.push(paint(box(1.2, 0.2, 0.3, 0, y0 + 1.5, 2.65), rgb(0x0a0a0a)));                    // the slot
    return merge(parts);
  },
  // a Polaroid: white frame, the picture in it (painted by the shader as it develops)
  photo() { const parts = []; parts.push(tag(paint(box(3.6, 4.3, 0.06, 0, 0, 0), rgb(0xf8f6f0)), 'aPh', 0)); parts.push(tag(paint(box(3.0, 3.0, 0.08, 0, 0.35, 0), rgb(1, 1, 1)), 'aPh', 1)); return mergeTagged(parts, [['aPh', 1, 0]]); },
  // prayer candles: tall glass, coloured, the label band; the flames are glows
  candles() {
    const parts = [], R = seeded(13);
    const spots = [];
    for (let k = 0; k < 9; k++) {
      const a = R() * TAU, r = R() * 4.4, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 4.4 + R() * 2.2;
      if (spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 2.1)) continue;
      spots.push([x, z, h]);
      const c = rgb(pick(R, [0xd8203a, 0xf0c040, 0x3a6ad8, 0xf4f0e8, 0x2a9a5a, 0xe86aa8]));
      parts.push(paint(cyl(0.95, 0.95, h, 18, x, h / 2, z), c));
      parts.push(paint(cyl(0.97, 0.97, h * 0.45, 18, x, h * 0.5, z), rgb(0xf4ecd8)));     // the label
      parts.push(paint(cyl(0.6, 0.6, 0.1, 12, x, h - 0.3, z), rgb(0xfff4dc)));
    }
    AP._candleSpots = spots;
    return merge(parts);
  },
  // two pairs kicked off: white sneakers and red heels, at odd angles
  shoes() {
    const parts = [];
    const sneaker = (x, z, a, tip) => {
      const g = [];
      g.push(paint(sph(1, 1.45, 0.62, 3.2, 0, 0.62, 0, 14, 8), rgb(0xf8f8f8)));
      g.push(paint(box(2.9, 0.42, 6.2, 0, 0.21, 0), rgb(0xe8e2d8)));
      g.push(paint(box(2.6, 0.9, 2.8, 0, 1.25, -1.5), rgb(0xf4f4f4)));
      g.push(paint(cyl(1.1, 1.1, 0.3, 16, 0, 1.75, -1.3), rgb(0x2a2a2e)));
      for (let k = 0; k < 4; k++) g.push(paint(box(1.5, 0.12, 0.18, 0, 1.35 + k * 0.06, 0.3 - k * 0.55), rgb(0xe84a3a)));
      g.push(paint(box(0.12, 0.9, 3.2, 1.42, 0.7, 0), rgb(0xe84a3a)));
      const s = merge(g); if (tip) { s.rotateZ(1.45); s.translate(-0.4, 1.4, 0); } s.rotateY(a); s.translate(x, 0, z); parts.push(s);
    };
    const heel = (x, z, a, tip) => {
      const g = [], red = rgb(0xd8102a);
      g.push(paint(box(2.2, 0.3, 5.6, 0, 1.9, 0.4).rotateX(-0.38), red));
      g.push(paint(sph(1, 1.15, 0.5, 1.6, 0, 1.0, 2.4, 12, 6), red));
      g.push(paint(cyl(0.18, 0.12, 3.3, 8, 0, 1.65, -2.2), red));
      g.push(paint(box(2.2, 1.1, 0.3, 0, 3.0, -2.4), red));
      const s = merge(g); if (tip) { s.rotateZ(-1.5); s.translate(0.6, 1.2, 0); } s.rotateY(a); s.translate(x, 0, z); parts.push(s);
    };
    sneaker(-3.5, 0, 0.5, false); sneaker(1.2, 4.6, 2.2, true);
    heel(4.4, -2.6, -0.8, false); heel(-1.2, -5.2, 1.4, true);
    return merge(parts);
  },
  // the projector: two reels, the body, the lens toward the far wall (+z), on a stack of books
  projector() {
    const parts = [], R = seeded(17), grey = rgb(0x5a5e66), dark = rgb(0x1e2024);
    for (let k = 0; k < 4; k++) parts.push(paint(box(6.5 - k * 0.4, 1.3, 7.5 - k * 0.5, (R() - 0.5) * 0.5, 0.65 + k * 1.3, (R() - 0.5) * 0.4), rgb(pick(R, [0x6a2a1a, 0x1a3a5a, 0x4a6a3a, 0xd8c8a0, 0x7a2a4a]))));
    const y0 = 5.2;
    parts.push(paint(box(4.2, 3.4, 6.0, 0, y0 + 1.7, 0), grey));
    const lens = cyl(0.9, 1.1, 2.2, 18); lens.rotateX(Math.PI / 2); lens.translate(0, y0 + 2.0, 3.9); parts.push(paint(lens, dark));
    parts.push(paint(cyl(0.7, 0.7, 0.1, 18).rotateX(Math.PI / 2).translate(0, y0 + 2.0, 5.02), rgb(6, 5.6, 4.6)));   // hot: the lamp through the lens
    for (const z of [-2.2, 2.4]) { const reel = cyl(2.6, 2.6, 0.5, 26); reel.rotateZ(Math.PI / 2); reel.translate(0, y0 + 6.2, z); parts.push(paint(reel, dark)); parts.push(paint(box(0.5, 2.8, 0.4, 0, y0 + 4.4, z * 0.8), grey)); }
    return merge(parts);
  },
  // boxes stacked to go, taped, and a suitcase standing by them
  boxes() {
    const parts = [], R = seeded(23), card = [0xc8a070, 0xb8905e, 0xd4ae7c];
    const one = (w, h, d, x, y, z, ry) => { const c = rgb(pick(R, card)); const g = [paint(box(w, h, d, 0, h / 2, 0), c), paint(box(w + 0.04, 0.05, 0.8, 0, h + 0.01, 0), rgb(0xd8c8a0)), paint(box(0.8, h * 0.6, 0.04, 0, h * 0.5, d / 2 + 0.02), rgb(0xd8c8a0))]; const m = merge(g); m.rotateY(ry); m.translate(x, y, z); parts.push(m); };
    one(6.4, 4.6, 5.2, 0, 0, 0, 0.1); one(5.6, 4.0, 4.8, 6.2, 0, -0.6, -0.2); one(5.4, 3.8, 4.6, 0.6, 4.6, 0.2, 0.25); one(4.6, 3.2, 4.0, 5.6, 4.0, -0.4, -0.1); one(3.6, 2.6, 3.4, 1.2, 8.4, 0.4, -0.3);
    const sc = rgb(0x2a6a6a);
    parts.push(paint(box(4.4, 6.6, 2.2, -5.6, 3.6, 1.0), sc));
    parts.push(paint(box(4.0, 0.3, 2.3, -5.6, 5.2, 1.0), rgb(0x1a4a4a)));
    parts.push(paint(box(1.6, 0.4, 0.5, -5.6, 7.3, 1.0), rgb(0x1a1a1a)));
    for (const x of [-7.3, -3.9]) parts.push(paint(cyl(0.35, 0.35, 0.4, 10, x, 0.2, 1.8).rotateZ(Math.PI / 2), rgb(0x1a1a1a)));
    return merge(parts);
  },
};

// ---------- out on the block ----------
const BK = {
  // a drum kit on a rooftop, facing the road: kick, snare, toms, hi-hat, a crash; the shells are
  // one piece, the cymbals another (they shake on the beat)
  drums() {
    const parts = [], shell = rgb(0xd8203a), chrome = rgb(0xd8dce4), head = rgb(0xf4f0e8);
    const kick = cyl(1.8, 1.8, 1.7, 24); kick.rotateX(Math.PI / 2); kick.translate(0, 1.85, 0); parts.push(paint(kick, shell));
    const kh = cyl(1.62, 1.62, 0.05, 24); kh.rotateX(Math.PI / 2); kh.translate(0, 1.85, 0.88); parts.push(paint(kh, head));
    for (const [r, h, x, y, z] of [[0.75, 0.6, -1.0, 3.9, 0.3], [0.85, 0.7, 1.0, 3.9, 0.3], [1.1, 1.4, 2.6, 1.5, -0.4], [0.8, 0.6, -2.2, 2.6, 0.9]]) { parts.push(paint(cyl(r, r, h, 20, x, y, z), shell)); parts.push(paint(cyl(r * 0.96, r * 0.96, 0.04, 20, x, y + h / 2 + 0.01, z), head)); }
    for (const [x, y, z] of [[2.6, 0.4, -0.4], [-2.2, 1.2, 0.9], [-3.0, 1.8, 0], [3.3, 2.2, -1.2]]) parts.push(paint(box(0.08, y * 2, 0.08, x, y, z), chrome));
    // the stool
    parts.push(paint(cyl(0.7, 0.7, 0.3, 14, 0, 2.0, -2.2), rgb(0x1a1a1a)), paint(cyl(0.08, 0.08, 1.9, 6, 0, 0.95, -2.2), chrome));
    return merge(parts);
  },
  cymbals() {
    const parts = [], gold = rgb(0xe8b84a);
    for (const [r, x, y, z] of [[1.3, -3.0, 3.7, 0], [1.6, 3.3, 4.5, -1.2], [1.1, 2.0, 4.9, 1.0]]) { const c = cyl(r, 0.1, 0.18, 24, 0, 0, 0); c.rotateX(0.2); c.translate(x, y, z); parts.push(paint(c, gold)); }
    return merge(parts);
  },
  // a boombox on a ledge: two big speakers (their cones pump: their own piece), the tape deck lit
  boombox() {
    const parts = [], body = rgb(0x2a2a30), trim = rgb(0xb8bcc8);
    parts.push(paint(box(9.2, 4.6, 2.4, 0, 2.3, 0), body));
    parts.push(paint(box(9.4, 0.3, 2.5, 0, 4.7, 0), trim));
    for (const s of [-1, 1]) { const r = cyl(1.7, 1.7, 0.3, 26); r.rotateX(Math.PI / 2); r.translate(s * 2.9, 2.2, 1.25); parts.push(paint(r, trim)); }
    parts.push(paint(box(2.2, 1.4, 0.3, 0, 2.6, 1.22), rgb(0x0a0a0a)));
    parts.push(paint(box(1.8, 0.5, 0.32, 0, 3.8, 1.22), rgb(2.4, 1.2, 3.0)));                            // the display, hot
    for (let k = 0; k < 6; k++) parts.push(paint(box(0.35, 0.3, 0.3, -1.0 + k * 0.4, 4.25, 0.9), rgb(0x8a8a90)));
    const handle = new THREE.TorusGeometry(3.4, 0.22, 8, 24, Math.PI); handle.translate(0, 4.8, 0); parts.push(paint(handle, trim));
    return merge(parts);
  },
  cones() { const parts = []; for (const s of [-1, 1]) { const c = new THREE.ConeGeometry(1.45, 0.7, 24, 1, true); c.rotateX(-Math.PI / 2); c.translate(s * 2.9, 2.2, 1.25); parts.push(paint(c, rgb(0x141418))); parts.push(paint(sph(0.4, 1, 1, 0.5, s * 2.9, 2.2, 1.0, 10, 6), rgb(0x3a3a40))); } return merge(parts); },
  // a jug of cheap wine with a screw cap and a finger loop, two glasses, a towel over the rail
  wine() {
    const parts = [], glass = rgb(0x2a5a2a), wine = rgb(0x8a1428);
    const jug = new THREE.LatheGeometry([[0, 0], [2.6, 0], [3.0, 0.6], [3.2, 2.8], [2.9, 4.6], [1.7, 6.0], [0.9, 6.6], [0.9, 7.4], [1.0, 7.5], [1.0, 8.0], [0, 8.0]].map(([r, y]) => new THREE.Vector2(r, y)), 24);
    parts.push(paint(jug, glass));
    parts.push(paint(cyl(2.95, 3.12, 3.0, 24, 0, 1.6, 0), wine));
    parts.push(paint(cyl(1.05, 1.05, 0.6, 16, 0, 7.7, 0), rgb(0xd8c060)));
    const loop = new THREE.TorusGeometry(0.75, 0.25, 8, 16); loop.rotateY(Math.PI / 2); loop.translate(1.6, 6.3, 0); parts.push(paint(loop, glass));
    parts.push(paint(box(3.6, 2.4, 0.05, 0, 3.0, 3.04), rgb(0xf4e8c8)));                           // the label
    for (const [x, z] of [[4.6, 1.2], [5.8, -1.0]]) {
      const g = new THREE.LatheGeometry([[0, 0], [1.0, 0], [1.0, 0.1], [0.12, 0.3], [0.12, 2.0], [0.9, 2.6], [1.1, 3.8], [1.0, 4.4]].map(([r, y]) => new THREE.Vector2(r, y)), 16);
      g.translate(x, 0, z); parts.push(paint(g, rgb(0xd8e0e8)));
      parts.push(paint(cyl(0.98, 0.9, 0.6, 16, x, 3.1, z), wine));
    }
    return merge(parts);
  },
  // the clock over the corner, at midnight: a round face on a bracket, numbers as ticks
  clock() {
    const parts = [], iron = rgb(0x1a1a1e), face = rgb(0xf4ecd8);
    const rim = cyl(4.2, 4.2, 1.0, 40); rim.rotateX(Math.PI / 2); parts.push(paint(rim, iron));
    for (const z of [0.52, -0.52]) { const f = cyl(3.8, 3.8, 0.05, 40); f.rotateX(Math.PI / 2); f.translate(0, 0, z); parts.push(paint(f, face)); for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; const tk = box(k % 3 ? 0.18 : 0.32, k % 3 ? 0.6 : 0.95, 0.05); tk.translate(0, 3.2, 0); tk.rotateZ(a); tk.translate(0, 0, z * 1.04); parts.push(paint(tk, iron)); } }
    // both hands straight up
    for (const z of [0.58, -0.58]) { parts.push(paint(box(0.32, 2.6, 0.05, 0, 1.3, z), iron)); parts.push(paint(box(0.2, 3.4, 0.05, 0.05, 1.7, z * 1.02), iron)); }
    parts.push(paint(box(0.5, 0.5, 9, 0, 4.6, 0), iron));
    parts.push(paint(sph(0.6, 1, 1, 1, 0, 4.8, 0, 10, 6), rgb(0xd8b060)));
    return merge(parts);
  },
  // a saucepan of cereal on the ledge, the fork stood up in it; the cereal is its own piece
  saucepan() {
    const parts = [], steel = rgb(0xc8ccd4);
    parts.push(paint(cyl(5.0, 4.6, 4.2, 32, 0, 2.1, 0, true), steel));
    parts.push(paint(cyl(4.6, 4.6, 0.2, 32, 0, 0.1, 0), steel));
    parts.push(paint(cyl(4.85, 4.85, 0.15, 32, 0, 3.4, 0), rgb(0xfffaf0)));                        // the milk
    const handle = box(9.0, 0.7, 1.1, 9.2, 3.6, 0); handle.rotateZ(0.12); parts.push(paint(handle, rgb(0x1a1a1e)));
    const fork = [box(0.4, 9.5, 0.2, 0, 4.75, 0), box(1.5, 0.35, 0.2, 0, 9.6, 0)];
    for (const dx of [-0.6, -0.2, 0.2, 0.6]) fork.push(box(0.16, 2.0, 0.16, dx, 10.7, 0));
    const f = merge(fork.map((g) => paint(g, rgb(0xe0e4ec)))); f.rotateZ(-0.22); f.rotateX(0.12); f.translate(1.2, 2.4, 0.8); parts.push(f);
    return merge(parts);
  },
  // one ring of cereal
  ring() { const t = new THREE.TorusGeometry(0.55, 0.26, 8, 14); return paint(t, rgb(0xf0b048)); },
  // a fuse along the ledge to a bundle of firecrackers, red paper, gold bands
  firecracker() {
    const parts = [], red = rgb(0xd8102a), gold = rgb(0xf0c040);
    for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU, r = k ? 1.7 : 0; parts.push(paint(cyl(0.95, 0.95, 7.5, 16, Math.cos(a) * r, 3.75, Math.sin(a) * r), red)); for (const y of [0.6, 6.9]) parts.push(paint(cyl(0.98, 0.98, 0.45, 16, Math.cos(a) * r, y, Math.sin(a) * r), gold)); }
    parts.push(paint(cyl(2.9, 2.9, 0.5, 20, 0, 4.0, 0), gold));
    return merge(parts);
  },
  // a plane: fuselage, wings, the tail; its lights are glows
  plane() {
    const parts = [], white = rgb(0xe8eaf0);
    const body = cyl(1.6, 1.4, 30, 16); body.rotateX(Math.PI / 2); parts.push(paint(body, white));
    parts.push(paint(sph(1.6, 1, 1, 2.2, 0, 0, 15, 14, 8), white));
    const wing = box(38, 0.5, 5.5, 0, -0.5, 1.5); parts.push(paint(wing, rgb(0xc8ccd8)));
    parts.push(paint(box(13, 0.4, 3, 0, 0.5, -13.5), rgb(0xc8ccd8)));
    const fin = box(0.4, 7, 4.4, 0, 3.8, -13.5); fin.rotateX(-0.35); parts.push(paint(fin, rgb(0xff6a3a)));
    for (const s of [-1, 1]) { const e = cyl(1.1, 1.1, 4.2, 12); e.rotateX(Math.PI / 2); e.translate(s * 7.5, -1.6, 3.0); parts.push(paint(e, rgb(0xa8acb8))); }
    for (let k = 0; k < 14; k++) parts.push(paint(box(0.05, 0.5, 0.6, 1.62, 0.4, 10 - k * 1.6), rgb(3.2, 2.6, 1.8)));          // windows, lit
    for (let k = 0; k < 14; k++) parts.push(paint(box(0.05, 0.5, 0.6, -1.62, 0.4, 10 - k * 1.6), rgb(3.2, 2.6, 1.8)));
    return merge(parts);
  },
  // a sheer curtain the size of the window she leaves by, hung from the top of the opening
  bigSheer(v) {
    const W = 9, L = 26, g = new THREE.PlaneGeometry(W, L, 18, 14); g.translate(W / 2, -L / 2, 0);
    const P = g.attributes.position.array;
    for (let i = 0; i < P.length; i += 3) P[i + 2] += Math.sin(P[i] / W * Math.PI * 7 + v) * 0.45 * (0.4 + 0.6 * (-P[i + 1] / L));
    g.computeVertexNormals();
    tag(g, 'aCl', (i, k) => (k === 0 ? -P[i * 3 + 1] / L : k === 1 ? P[i * 3] / W : k === 2 ? 0.3 + v * 0.4 : L), 4);
    return paint(g, rgb(v ? 0xffe6cc : 0xffd8e0));
  },
  // the busted light in the hallway: a cage over a bare bulb on a short stem from the ceiling
  cage() {
    const parts = [], iron = rgb(0x2a2a2a);
    parts.push(paint(cyl(1.4, 1.4, 0.5, 16, 0, 0, 0), rgb(0xc8c4b8)));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; const b = box(0.08, 2.4, 0.08, Math.cos(a) * 1.05, -1.4, Math.sin(a) * 1.05); parts.push(paint(b, iron)); }
    parts.push(paint(new THREE.TorusGeometry(1.05, 0.06, 6, 20).rotateX(Math.PI / 2).translate(0, -2.6, 0), iron));
    parts.push(paint(new THREE.TorusGeometry(1.05, 0.06, 6, 20).rotateX(Math.PI / 2).translate(0, -1.3, 0), iron));
    parts.push(tag(paint(sph(0.62, 1, 1.25, 1, 0, -1.6, 0, 12, 8), rgb(1, 0.95, 0.8)), 'aPh', 1));
    return mergeTagged(parts.map((g) => (g.attributes.aPh ? g : tag(g, 'aPh', 0))), [['aPh', 1, 0]]);
  },
  // an exit sign over the stairs door
  exit() { const parts = []; parts.push(paint(box(5.2, 2.2, 0.8, 0, 0, 0), rgb(0x1a1a1a))); parts.push(paint(box(4.6, 1.6, 0.05, 0, 0, 0.42), rgb(3.6, 0.4, 0.3))); parts.push(paint(box(4.6, 1.6, 0.05, 0, 0, -0.42), rgb(3.6, 0.4, 0.3))); return merge(parts); },
};

// ---------- the neon the lyrics are in ----------
// the face is the atlas cell (7.5 x 2.35 at s 1); a dark backplate behind it, a thin frame
function neonBack() {
  const parts = [];
  parts.push(paint(box(8.3, 3.1, 0.3, 0, 0, -0.2), rgb(0x0e0a10)));
  for (const [w, h, x, y] of [[8.5, 0.18, 0, 1.6], [8.5, 0.18, 0, -1.6], [0.18, 3.3, 4.2, 0], [0.18, 3.3, -4.2, 0]]) parts.push(paint(box(w, h, 0.36, x, y, -0.1), rgb(0x3a3440)));
  return merge(parts);
}
// the bracket a blade sign hangs from, out from the wall over the street
function bracket() {
  const parts = [], iron = rgb(0x1a1618);
  parts.push(paint(box(0.25, 0.25, 7.5, 0, 2.3, -3.5), iron));
  parts.push(paint(box(0.18, 3.6, 0.18, 0, 0.6, -6.9), iron));
  const brace = box(0.14, 0.14, 5.2, 0, 0, 0); brace.rotateX(-0.62); brace.translate(0, 1.1, -5.0); parts.push(paint(brace, iron));
  for (const z of [-0.9, 0.9]) parts.push(paint(box(0.06, 0.8, 0.06, 0, 1.85, z), iron));
  return merge(parts);
}

// the photo developing: the white square goes to a warm blur of a face, a smile
const PHOTO_VS = { vertDecl: 'attribute float aPh; varying float vPh; varying vec2 vPq;', vert: 'vPh = aPh; vPq = position.xy;' };
const PHOTO_FS = {
  fragDecl: 'varying float vPh; varying vec2 vPq; uniform float uDev;',
  frag: `if (vPh > 0.5) {
      vec2 q = vPq - vec2(0.0, 0.35);
      float face = smoothstep(0.95, 0.75, length(q * vec2(1.0, 0.82) - vec2(0.0, 0.1)));
      float smile = smoothstep(0.08, 0.0, abs(length(q - vec2(0.0, 0.35)) - 0.5)) * step(q.y, 0.05) * face;
      vec3 pic = mix(vec3(0.9, 0.5, 0.35), vec3(1.0, 0.82, 0.62), face) * (1.0 - 0.7 * smile);
      pic = mix(pic, vec3(0.2, 0.12, 0.1), smoothstep(0.9, 1.2, length(q)) * 0.5);
      vec3 c = mix(vec3(0.2, 0.22, 0.24), pic, uDev);
      diffuseColor.rgb = c; totalEmissiveRadiance = c * 0.5;
    }`,
};
const DEV = { value: 0 };
// the bulb in the cage: flickering with the hallway (its own uniform)
export const YAS_PHOTO = DEV;

// each material key's options in one place: whichever layer asks first makes it the same way
const PROP = { k: 0.32, roughness: 0.6 };
const SHINY = { k: 0.38, roughness: 0.35, metalness: 0.25 };
const GLASSY = { k: 0.55, roughness: 0.25, metalness: 0.1 };
const SHEER = { k: 0.7, side: THREE.DoubleSide, roughness: 0.95, transparent: true, opacity: 0.72, depthWrite: false, vertDecl: 'attribute vec4 aCl;', vert: `
      float sv = aCl.x, sph2 = aCl.z * 6.2832, sL = aCl.w;
      float sw = 0.25 + 0.5 * uWind + 0.25 * uBeat;
      float sa = sw * (0.55 + 0.25 * sin(uTime * 1.7 + sph2)) * (0.3 + 0.9 * sv);
      transformed.z += sin(sa) * sv * sL * 0.55 + sin(uTime * 5.0 + sv * 5.0 + aCl.y * 4.0 + sph2) * 0.6 * sv;
      transformed.y += (1.0 - cos(sa)) * sv * sL * 0.55;` };
const CAGEM = { k: 0.3, vertDecl: 'attribute float aPh; attribute vec3 aTint; varying float vPh; varying float vK;', vert: 'vPh = aPh; vK = aTint.x;',
  fragDecl: 'varying float vPh; varying float vK;', frag: 'if (vPh > 0.5) { totalEmissiveRadiance = vec3(1.0, 0.92, 0.75) * (0.15 + 3.4 * vK); }' };

extend({
  layers: {
    yasMelon: (M) => [AP.melon(), VCM(M, 'yasPropM', PROP), 3, {}],
    yasCamera: (M) => [AP.camera(), VCM(M, 'yasPropM', PROP), 3, {}],
    yasPhoto: (M) => [AP.photo(), M.yasPhotoM || (M.yasPhotoM = (() => { const m = VCM(M, 'yasPhotoBase', { k: 0.4, roughness: 0.4, ...PHOTO_VS, ...PHOTO_FS }); const ob = m.onBeforeCompile; m.onBeforeCompile = (sh) => { sh.uniforms.uDev = DEV; ob(sh); }; return m; })()), 3, {}],
    yasCandles: (M) => [AP.candles(), VCM(M, 'yasGlassM', GLASSY), 3, {}],
    yasShoes: (M) => [AP.shoes(), VCM(M, 'yasPropM', PROP), 3, {}],
    yasProjector: (M) => [AP.projector(), VCM(M, 'yasPropM', PROP), 3, {}],
    yasBeam: (M) => [(() => { const g = new THREE.CylinderGeometry(1, 0.06, 1, 4, 1, true); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); g.rotateX(Math.PI / 2); return g; })(), M.yasBeamM || (M.yasBeamM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 0.29, 0.24), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })), 3, {}],
    yasBoxes: (M) => [AP.boxes(), VCM(M, 'yasPropM', PROP), 3, {}],
    yasSheer: (M) => [BK.bigSheer(0), VCM(M, 'yasSheerM', SHEER), 6, {}],
    yasSheer2: (M) => [BK.bigSheer(1), VCM(M, 'yasSheerM', SHEER), 6, {}],
    yasDrums: (M) => [BK.drums(), VCM(M, 'yasShinyM', SHINY), 3, {}],
    yasCymbals: (M) => [BK.cymbals(), VCM(M, 'yasShinyM', SHINY), 3, {}],
    yasBoombox: (M) => [BK.boombox(), VCM(M, 'yasShinyM', SHINY), 3, {}],
    yasCones: (M) => [BK.cones(), VCM(M, 'yasPropM', PROP), 3, {}],
    yasWine: (M) => [BK.wine(), VCM(M, 'yasGlassM', GLASSY), 3, {}],
    yasClock: (M) => [BK.clock(), VCM(M, 'yasPropM', PROP), 3, {}],
    yasPan: (M) => [BK.saucepan(), VCM(M, 'yasShinyM', SHINY), 3, {}],
    yasRing: (M) => [BK.ring(), VCM(M, 'yasPropM', PROP), 120, {}],
    yasCracker: (M) => [BK.firecracker(), VCM(M, 'yasPropM', PROP), 3, {}],
    yasPlane: (M) => [BK.plane(), VCM(M, 'yasPropM', PROP), 2, {}],
    yasCage: (M) => [BK.cage(), VCM(M, 'yasCageM', CAGEM), 12, { aTint: 3 }],
    yasExit: (M) => [BK.exit(), VCM(M, 'yasPropM', PROP), 4, {}],
    yasNeonBack: (M) => [neonBack(), VCM(M, 'yasPropM', PROP), 40, {}],
    yasNeonFace: (M) => [(() => { const g = new THREE.PlaneGeometry(7.5, 2.35); g.translate(0, 0, 0.0); return g; })(), M.sign, 40, { aIdx: 1, aWake: 2 }],
    yasBracket: (M) => [bracket(), VCM(M, 'yasPropM', PROP), 40, {}],
  },
  parts: {
    yasMelon(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.yasMelon.add(m); poolAt(S, p.x, p.y + 0.1, p.z, 20 * s, [1, 0.6, 0.5], 0.3); },
    // the camera: the flash fires on its beat, the photo slides out of the slot and develops
    yasCamera(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, T = S.tNow ?? 0; void S.layers.yasPhoto;
      m.compose(p, q, S._s.set(s, s, s)); S.layers.yasCamera.add(m);
      const k = T - it.flash;
      const out = clamp(k / 1.2, 0, 1), e = out * out * (3 - 2 * out);
      // the slot is low on the front (local z 2.65): the photo comes out toward the road, drooping
      const w = local(p, yaw, 0, (5.7 - 0.5 * e) * s, (2.65 - 1.6 + 3.9 * e) * s, S._o);
      S._e.set(-Math.PI / 2 + 0.3 * e, yaw, 0, 'YXZ'); const pq = (S._qph || (S._qph = new THREE.Quaternion())).setFromEuler(S._e); S._e.order = 'XYZ';
      if (k > 0) { m.compose(w, pq, S._s.set(s, s, s)); S.layers.yasPhoto.add(m); }
      DEV.value = clamp((k - 0.8) / 2.6, 0, 1);
      // the flash: a burst of white from the flash window
      const fw = local(p, yaw, -1.6 * s, 9.4 * s, 2.6 * s, S._o);
      const fl = k > -0.05 && k < 0.5 ? Math.exp(-Math.max(0, k) * 9) : 0;
      glowAt(S, fw.x, fw.y, fw.z, (3 + 12 * fl) * s, [1, 1, 1], 0.4 + 1.6 * fl);
      poolAt(S, p.x, p.y + 0.1, p.z, 30 * s, [1, 0.95, 0.9], 0.15 + 0.7 * fl);
    },
    yasCandles(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.yasCandles.add(m);
      const T = S.tNow ?? 0;
      for (const [x, z, h] of AP._candleSpots || []) {
        const fl = 0.8 + 0.2 * Math.sin(T * 13 + x * 7) * Math.sin(T * 7.3 + z * 3);
        const w = local(p, yaw, x * s, (h + 0.5) * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, 2.4 * s, [1, 0.7, 0.35], 1.3 * fl);
      }
      glowAt(S, p.x, p.y + 6 * s, p.z, 18 * s, [1, 0.62, 0.3], 0.35); poolAt(S, p.x, p.y + 0.1, p.z, 22 * s, [1, 0.6, 0.3], 0.6);
    },
    yasShoes(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.yasShoes.add(m); },
    // the projector, its beam across the room to the far wall, the scene on it (the sign layer)
    yasProjector(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.yasProjector.add(m);
      // (the scenery's first pass runs before there's a road to aim at: make the beam's layer then,
      // so it compiles with the rest and not mid-ride)
      if (!S.track) { void S.layers.yasBeam; return; }
      const lens = local(p, yaw, 0, 7.2 * s, 5.1 * s, S._p4 || (S._p4 = new THREE.Vector3()));
      const tgt = S.track.ground(it.t + (it.dt ?? 0.15), it.screenX ?? 37.2, S._p2 || (S._p2 = new THREE.Vector3())); tgt.y = p.y + (it.screenY ?? 17);
      const d = (S._d4 || (S._d4 = new THREE.Vector3())).copy(tgt).sub(lens), L = d.length();
      const fl = 0.85 + 0.15 * Math.sin((S.tNow ?? 0) * 31) * Math.sin((S.tNow ?? 0) * 17);
      (S._qb || (S._qb = new THREE.Quaternion())).setFromUnitVectors(S._zAx || (S._zAx = new THREE.Vector3(0, 0, 1)), d.normalize());
      m.compose(lens, S._qb, S._s.set(it.beamW ?? 9, it.beamH ?? 4.4, L)); S.layers.yasBeam.add(m);
      glowAt(S, lens.x, lens.y, lens.z, 4 * s, [1, 0.95, 0.85], 1.6 * fl);
      glowAt(S, tgt.x, tgt.y, tgt.z, 24, [1, 0.92, 0.8], 0.28 * fl);
    },
    yasBoxes(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.yasBoxes.add(m); },
    // the sheers at the window she leaves by, either side of the opening, blowing in at her
    yasSheers(S, it, p, q, yaw) {
      const m = S._m;
      for (const sd of [-1, 1]) {
        const w = local(p, yaw, -sd * ((it.hw ?? 12.5) - 9), it.top ?? 27, 0, S._o);
        S._e.set(0, yaw + Math.PI, 0); const qq = (S._qsh || (S._qsh = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(w, qq, S._s.set(sd > 0 ? 1 : -1, 1, 1)); S.layers[sd > 0 ? 'yasSheer' : 'yasSheer2'].add(m);
      }
    },
    // the drums: the cymbals shiver on the beat, the kick's head lights on it
    yasDrums(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, b = S.beat || 0;
      m.compose(p, q, S._s.set(s, s, s)); S.layers.yasDrums.add(m);
      S._e.set(0.06 * b * Math.sin((S.tNow ?? 0) * 40), yaw, 0.05 * b); const cq = (S._qcy || (S._qcy = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, cq, S._s.set(s, s, s)); S.layers.yasCymbals.add(m);
      const w = local(p, yaw, 0, 1.85 * s, 1.0 * s, S._o); glowAt(S, w.x, w.y, w.z, 4.5 * s, [1, 0.5, 0.4], 0.25 + 1.4 * b);
      poolAt(S, p.x, p.y + 0.1, p.z, 14 * s, [1, 0.55, 0.45], 0.25 + 0.5 * b);
    },
    // the boombox: the cones push out on every beat
    yasBoombox(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, b = S.beat || 0;
      m.compose(p, q, S._s.set(s, s, s)); S.layers.yasBoombox.add(m);
      const w = local(p, yaw, 0, 0, 0.5 * b * s, S._o); m.compose(w, q, S._s.set(s, s, s * (1 + 0.6 * b))); S.layers.yasCones.add(m);
      const g = local(p, yaw, 0, 3.8 * s, 1.5 * s, S._o); glowAt(S, g.x, g.y, g.z, 3 * s, [0.8, 0.4, 1], 0.6 + 0.6 * b);
    },
    yasWine(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.yasWine.add(m); poolAt(S, p.x, p.y + 0.1, p.z, 14 * s, [0.9, 0.3, 0.4], 0.3); },
    yasClock(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.yasClock.add(m);
      for (const z of [0.9, -0.9]) { const w = local(p, yaw, 0, 0, z * s, S._o); glowAt(S, w.x, w.y, w.z, 7 * s, [1, 0.94, 0.78], 0.5); }
    },
    // the saucepan; on every beat a few rings of cereal jump out of it and fall back
    yasPan(S, it, p, q, yaw) {
      // tipped toward the road so she sees into it: the milk, the cereal, the fork
      const m = S._m, s = it.s ?? 1, T = S.tNow ?? 0;
      S._e.set(it.tilt ?? 0.38, yaw, 0, 'YXZ'); const tq = (S._qpan || (S._qpan = new THREE.Quaternion())).setFromEuler(S._e); S._e.order = 'XYZ';
      m.compose(p, tq, S._s.set(s, s, s)); S.layers.yasPan.add(m);
      const c = S.course, bp = c.beatAt(T), bi = Math.floor(bp), bf = bp - bi;
      for (let k = 0; k < 14; k++) {
        const R = seeded(bi * 31 + k * 7 + 1), a = R() * TAU, r = R() * 3.6, up = 5 + R() * 7, sp = (R() - 0.5) * 3.5;
        const hgt = 3.5 + up * 4 * bf * (1 - bf) * 1.6;
        const w = local(p, yaw, (Math.cos(a) * r + sp * bf) * s, hgt * s, (Math.sin(a) * r) * s, S._o);
        S._e.set(R() * 6 + bf * 5, R() * 6, bf * 3); const rq = (S._qr || (S._qr = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(w, rq, S._s.set(1.7 * s, 1.7 * s, 1.7 * s)); S.layers.yasRing.add(m);
      }
      poolAt(S, p.x, p.y + 0.1, p.z, 18 * s, [1, 0.85, 0.6], 0.35);
    },
    // the firecracker: the fuse is a spark running along the ledge to it, then it goes
    yasCracker(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, T = S.tNow ?? 0; void S.layers.yasCracker;
      if (T < it.boom) { m.compose(p, q, S._s.set(s, s, s)); S.layers.yasCracker.add(m); }
      const u = clamp((T - it.lit) / (it.boom - it.lit), 0, 1);
      if (T > it.lit && T < it.boom) {
        // the spark: along the fuse, from far up the road to the bundle
        const ft = it.t - (1 - u) * (it.t - it.from), k2 = clamp((u - 0.86) / 0.14, 0, 1), fx = Math.sign(it.x) * 15.2 + (it.x - Math.sign(it.x) * 15.2) * k2;
        const w = S.track.ground(ft, fx, S._o); w.y = p.y + (it.fy ?? 1.0) * s + k2 * 7.6 * s;
        const fl = 0.7 + 0.3 * Math.sin(T * 47);
        glowAt(S, w.x, w.y, w.z, 5.5, [1, 0.8, 0.35], 2.6 * fl); glowAt(S, w.x, w.y, w.z, 16, [1, 0.5, 0.2], 0.55 * fl);
        for (let n = 0; n < 5; n++) { const a = T * 23 + n * 1.3; glowAt(S, w.x + Math.cos(a) * 1.4, w.y + Math.abs(Math.sin(T * 17 + n)) * 1.8, w.z + Math.sin(a) * 1.4, 1.2, [1, 0.9, 0.5], 1.6); }
      }
      const k = T - it.boom;
      if (k > 0 && k < 1.2) { const e = Math.exp(-k * 3.5); glowAt(S, p.x, p.y + 6 * s, p.z, (10 + 40 * (1 - e)) * s, [1, 0.6, 0.3], 3 * e); }
    },
    // a plane low over the block with its lights on: it crosses the road ahead of her
    yasPlane(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, u = (T - it.t0) / (it.t1 - it.t0); void S.layers.yasPlane;
      if (u < -0.05 || u > 1.05) return;
      const x = it.xFrom + (it.xTo - it.xFrom) * u;
      const w = S.track.ground(it.t, x, S._o); w.y = it.h + 4 * u;
      const dir = Math.sign(it.xTo - it.xFrom);
      S._e.set(-0.06, yaw + (dir > 0 ? -Math.PI / 2 : Math.PI / 2), dir * 0.08); const pq = (S._qpl || (S._qpl = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m; m.compose(w, pq, S._s.set(1, 1, 1)); S.layers.yasPlane.add(m);
      const blink = Math.sin(T * 7) > 0.6 ? 1 : 0.1, strobe = Math.sin(T * 11) > 0.92 ? 1 : 0;
      const wingL = local(w, yaw + (dir > 0 ? -Math.PI / 2 : Math.PI / 2), 19, -0.5, 1.5, S._p3 || (S._p3 = new THREE.Vector3())); glowAt(S, wingL.x, wingL.y, wingL.z, 3, [1, 0.1, 0.1], 1.2 + blink);
      const wingR = local(w, yaw + (dir > 0 ? -Math.PI / 2 : Math.PI / 2), -19, -0.5, 1.5, S._p3); glowAt(S, wingR.x, wingR.y, wingR.z, 3, [0.1, 1, 0.3], 1.2 + blink);
      glowAt(S, w.x, w.y - 2, w.z, 5, [1, 1, 1], 0.2 + 3 * strobe);
      const nose = local(w, yaw + (dir > 0 ? -Math.PI / 2 : Math.PI / 2), 0, -1, 17, S._p3); glowAt(S, nose.x, nose.y, nose.z, 4, [1, 0.95, 0.8], 1.6);
    },
    // the hallway's light, flickering; moths round it
    yasCage(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, k = it.k ?? 1, T = S.tNow ?? 0; m.compose(p, q, S._s.set(s, s, s)); S.layers.yasCage.add(m, { aTint: [k, 0, 0] });
      glowAt(S, p.x, p.y - 1.6 * s, p.z, 6 * s, [1, 0.95, 0.8], 0.25 + 1.6 * k);
      if (it.busted) for (let n = 0; n < 7; n++) { const a = T * (2.2 + n * 0.37) + n * 1.9, r = (1.6 + 0.8 * Math.sin(T * 1.3 + n)) * s; glowAt(S, p.x + Math.cos(a) * r, p.y - 1.6 * s + Math.sin(T * 3.1 + n * 2) * 0.8 * s, p.z + Math.sin(a) * r, 0.5 * s, [0.9, 0.85, 0.75], 0.7); }
    },
    // the scene the projector throws on the wall: the lyric as a title card, flickering
    yasScreen(S, it, p, q, yaw) {
      void S.layers.yasNeonFace;
      if (!roomShown(S, it.t)) return;
      prepare(S.course, S.plan); p.y = floorAt(S.course, it.t) + (it.h || 17);
      S._e.set(0, S.course.sample(it.t).yaw + SIDE(it.x), 0); const fq = (S._qn || (S._qn = new THREE.Quaternion())).setFromEuler(S._e);
      const m = S._m, s = it.s ?? 1.7, T = S.tNow ?? 0, fl = 0.8 + 0.2 * Math.sin(T * 31) * Math.sin(T * 17.3);
      m.compose(p, fq, S._s.set(s, s, s)); S.layers.yasNeonFace.add(m, { aIdx: it.idx, aWake: [fl, 0] });
      glowAt(S, p.x, p.y, p.z, 16 * s, [1, 0.92, 0.78], 0.22 * fl);
    },
    // the clock over the corner, hung off a walk-up on a bracket like the signs
    yasClockBlade(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1, cy = S.course.sample(it.t);
      p.y = cy.y + (it.over ?? 6);
      S._e.set(0, cy.yaw + Math.PI, 0); const fq = (S._qn || (S._qn = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, fq, S._s.set(s, s, s)); S.layers.yasClock.add(m);
      S._e.set(0, cy.yaw + (it.x > 0 ? Math.PI / 2 : -Math.PI / 2), 0); const bq = (S._qbr || (S._qbr = new THREE.Quaternion())).setFromEuler(S._e);
      S._o.copy(p); S._o.y += 2.6 * s; m.compose(S._o, bq, S._s.set(s, s, s)); S.layers.yasBracket.add(m);
      for (const z of [0.9, -0.9]) { const w = local(p, cy.yaw + Math.PI, 0, 0, z * s, S._o); glowAt(S, w.x, w.y, w.z, 7 * s, [1, 0.94, 0.78], 0.5); }
    },
    yasExit(S, it, p, q, yaw) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.yasExit.add(m); glowAt(S, p.x, p.y, p.z, 6 * s, [1, 0.15, 0.1], 0.6); },
    // a lyric in neon. floor: 'room' (h above her floor, on the wall, facing the road),
    // 'blade' (h over the ribbon, hung off a walk-up on a bracket, facing her), else h as it is
    yasNeon(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; void S.layers.yasBracket; void S.layers.yasNeonBack; void S.layers.yasNeonFace;
      if (it.floor === 'room' && !roomShown(S, it.t)) return;
      let fq;
      if (it.floor === 'room') { prepare(S.course, S.plan); p.y = floorAt(S.course, it.t) + (it.h || 16); S._e.set(0, S.course.sample(it.t).yaw + SIDE(it.x), 0); fq = (S._qn || (S._qn = new THREE.Quaternion())).setFromEuler(S._e); }
      else if (it.floor === 'blade') { p.y = S.course.sample(it.t).y + (it.h || 5); S._e.set(0, S.course.sample(it.t).yaw + Math.PI, 0); fq = (S._qn || (S._qn = new THREE.Quaternion())).setFromEuler(S._e); }
      else fq = faceQ(S, it);
      m.compose(p, fq, S._s.set(s, s, s)); S.layers.yasNeonBack.add(m); S.layers.yasNeonFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      if (it.floor === 'blade') {
        // the bracket back to the wall, the sign hung under it
        S._e.set(0, S.course.sample(it.t).yaw + (it.x > 0 ? Math.PI / 2 : -Math.PI / 2), 0); const bq = (S._qbr || (S._qbr = new THREE.Quaternion())).setFromEuler(S._e);
        const w = local(p, S._e.y, 0, 0, 0, S._o); m.compose(w, bq, S._s.set(s, s, s)); S.layers.yasBracket.add(m);
      }
      const c = it.glow || [1, 0.55, 0.4];
      glowAt(S, p.x, p.y, p.z, 13 * s, c, 0.32 + 0.12 * (S.beat || 0));
    },
  },
  kits: {
    yasMelon(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: z.rot ?? 0.3, s: z.s ?? 1, parts: 'yasMelon', ahead: z.ahead })); },
    yasCamera(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: Math.PI + (z.x > 0 ? -0.55 : 0.55), s: z.s ?? 1, flash: z.flash, parts: 'yasCamera', ahead: z.ahead })); },
    yasCandles(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: 0, s: z.s ?? 1, parts: 'yasCandles', ahead: z.ahead })); },
    yasShoes(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: z.rot ?? 0.6, s: z.s ?? 1, parts: 'yasShoes', ahead: z.ahead })); },
    yasProjector(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: z.x > 0 ? -Math.PI / 2 : Math.PI / 2, s: z.s ?? 1, screenX: z.screenX ?? -Math.sign(z.x) * 37.2, screenY: z.screenY ?? 17, dt: z.dt ?? 0.2, parts: 'yasProjector', ahead: z.ahead })); },
    yasBoxes(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: z.rot ?? 0.4, s: z.s ?? 1, parts: 'yasBoxes', ahead: z.ahead })); },
    yasSheers(S, z) { S.items.push(onFloor(S, { t: z.at, x: 0, rot: 0, hw: z.hw, top: z.top, parts: 'yasSheers', ahead: z.ahead })); },
    // the rest stand where they're put: on a ledge or a roof at h (or h over the ribbon: over)
    yasPiece(S, z) {
      prepare(S.course, S.plan);
      const y = z.room ? floorAt(S.course, z.at) + (z.h ?? 0) : z.over !== undefined ? S.course.sample(z.at).y + z.over : (z.h ?? 0);
      S.items.push({ t: z.at, x: z.x ?? 0, rot: z.rot ?? (z.face ? Math.PI + (z.x > 0 ? -0.5 : 0.5) : SIDE(z.x ?? 1)), s: z.s ?? 1, h: y, parts: z.part, ahead: z.ahead ?? 30, flash: z.flash, lit: z.lit, boom: z.boom, from: z.from2, fy: z.fy, busted: z.busted, t0: z.t0, t1: z.t1, xFrom: z.xFrom, xTo: z.xTo, over: z.over2 });
    },
  },
});
