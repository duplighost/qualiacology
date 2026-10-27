// I Remember Them Too. The hall where the group meets, and she's the one who keeps it. A wet street
// at night, every front room lighting up as you come and going dark once you're by; in at the hall's
// front door: the corridor and its coat hooks, then the meeting room, its folding chairs facing each
// other across the floor, the urn, the flip chart where the names get written up (the last one stops
// halfway). Ride in time and the chairs fill as you come (a coat over the back, someone warm in the
// seat) and empty again behind you: every room fills up and empties out the same. One chair stays
// empty, a scarf over its back: their spot, until someone just as bright sits in it. The small room
// with a box of tissues on every seat and the doors propped open on chairs; the meeting room again;
// the corridor where the coats leave their hooks; out in the rain; back in to tell the new ones how it
// began (the board of photographs); the lights going out but for the one chair, and then the walls
// come down and the chairs go on into the night as far as you can see, every one of them full. At the
// end, a ring of folding chairs under one bulb, the urn's red light on, and the one who stays.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local, col, tintV, wakeV, signV } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room, paint, rgb, seeded, box, litTint } from './summer.js';
import { AA_GLSL } from './aa.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => { gs = gs.map(ni); if (!gs.every((g) => g.attributes.uv)) for (const g of gs) if (g.attributes.uv) g.deleteAttribute('uv'); return mergeGeometries(gs, false); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.3 : -Math.PI / 2 - 0.3);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const lathe = (pts, n = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
// a round bar from one point to another
const _ta = new THREE.Vector3(), _tb = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _tq = new THREE.Quaternion();
function tube(a, b, r, n = 8) {
  _ta.set(...a); _tb.set(...b).sub(_ta);
  const L = _tb.length(), g = new THREE.CylinderGeometry(r, r, L, n);
  g.translate(0, L / 2, 0); g.applyQuaternion(_tq.setFromUnitVectors(_up, _tb.normalize())); g.translate(_ta.x, _ta.y, _ta.z);
  return g;
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function signFace(w, h, x = 0, y = 0, z = 0) { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(w / 7.5, h / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(x, y, z); return g; }
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VCm = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const pic = (M, key, map, k = 0.6) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.75, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide }));

// the light a person gives a chair, the cold light on the empty one, the bulbs, the urn's lamp
const WARM = [1, 0.76, 0.48], COLD = [0.62, 0.74, 1], BRIGHT = [1, 0.92, 0.74], BULB = [1, 0.8, 0.52], URN_RED = [1, 0.12, 0.06], PORCH = [1, 0.8, 0.5];
const FRAME = rgb(0xb4ada0), SEAT = rgb(0x5c3a30), FOOT = rgb(0x262220), STEEL = rgb(0xc8ccd0), WOOD = rgb(0x8a6040), WHITE = rgb(0xf2efe8);
const COATS = [0x2a3a5a, 0x6a2a2a, 0x3a4a3a, 0x8a6a4a, 0x2a2a30, 0x5a4a6a, 0xa87a3a, 0x4a5a6a, 0x7a3a4a, 0xc8b89a];

// ---------- the pictures ----------
const R0 = seeded(91);
// handwriting that isn't words: a line of joined-up loops
function scrawl(g, R, x, y, end, h = 18) {
  g.beginPath(); g.moveTo(x, y);
  while (x < end) { const s = 7 + R() * 9; g.bezierCurveTo(x + s * 0.3, y - h - R() * 6, x + s * 0.7, y + 3, x + s, y - 2 - R() * 4); x += s; if (R() < 0.1) { x += 12; g.moveTo(x, y); } }
  g.stroke();
}
// the flip chart: a heading underlined, the names down the page in marker, and the last name stops
function flipTexture() {
  return canvasTex(512, 720, (g, W, H) => {
    g.fillStyle = '#f7f5ee'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, 0, W, 14);
    const R = seeded(57); g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#1e3a8a'; g.lineWidth = 9; scrawl(g, R, 70, 92, 300, 30);
    g.lineWidth = 6; g.beginPath(); g.moveTo(64, 112); g.lineTo(330, 106); g.stroke();
    const inks = ['#1a1a1a', '#1e3a8a', '#1a1a1a', '#1e6a3a', '#1a1a1a', '#a01a1a', '#1e3a8a', '#1a1a1a'];
    for (let row = 0; row < 9; row++) {
      const y = 190 + row * 58, last = row === 8;
      g.strokeStyle = inks[row % inks.length]; g.lineWidth = 6.5;
      g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(54, y - 8, 5, 0, Math.PI * 2); g.fill();
      scrawl(g, R, 76, y, last ? 168 : 250 + R() * 150, 24);
    }
    // where it stopped: the line runs out, the pen's dot
    g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(176, 190 + 8 * 58 - 4, 4, 0, Math.PI * 2); g.fill();
  });
}
// the cork board: the photographs from the start, a few flyers, the pins
function boardTexture() {
  return canvasTex(768, 512, (g, W, H) => {
    g.fillStyle = '#b08458'; g.fillRect(0, 0, W, H);
    const R = seeded(23);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '70,44,20' : '230,200,150'},${0.12 + R() * 0.2})`; g.fillRect(R() * W, R() * H, 2 + R() * 3, 2 + R() * 3); }
    // flyers behind
    for (const [x, y, c, r] of [[40, 300, '#f4e27a', -0.06], [560, 40, '#9ad0f4', 0.05], [600, 300, '#f4a8c8', -0.04]]) {
      g.save(); g.translate(x, y); g.rotate(r); g.fillStyle = c; g.fillRect(0, 0, 150, 190); g.strokeStyle = 'rgba(30,30,40,0.55)'; g.lineWidth = 4; g.lineCap = 'round';
      for (let k = 0; k < 6; k++) scrawl(g, R, 18, 40 + k * 26, 110 + R() * 20, 10);
      g.restore();
    }
    // the photographs: people in a row, blurred, laughing; a room; the first ring of chairs
    const photo = (x, y, r, seedK) => {
      g.save(); g.translate(x, y); g.rotate(r);
      g.fillStyle = '#f6f4ee'; g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 8; g.fillRect(-62, -70, 124, 146); g.shadowBlur = 0;
      const RR = seeded(seedK);
      const sky = g.createLinearGradient(0, -58, 0, 50); sky.addColorStop(0, ['#e8a87a', '#7aa0c8', '#c88a6a', '#8ab088'][seedK % 4]); sky.addColorStop(1, '#4a3a3a');
      g.fillStyle = sky; g.fillRect(-52, -60, 104, 104);
      g.filter = 'blur(2px)';
      for (let k = 0; k < 3 + (seedK % 3); k++) { const px = -40 + k * (80 / (2 + (seedK % 3))) + RR() * 8; g.fillStyle = ['#f0c8a0', '#d8a888', '#a87858'][k % 3]; g.beginPath(); g.arc(px, -14 + RR() * 6, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = ['#c84a4a', '#4a6ab0', '#e8d0a0', '#3a3a3a', '#6a9a5a'][(k + seedK) % 5]; g.fillRect(px - 12, -4, 24, 46); }
      g.filter = 'none';
      g.restore();
      g.fillStyle = '#d02a2a'; g.beginPath(); g.arc(x, y - 62, 6, 0, Math.PI * 2); g.fill();
    };
    let k = 0;
    for (const [x, y] of [[110, 110], [250, 90], [390, 120], [520, 210], [180, 260], [330, 280], [460, 360], [110, 410], [260, 420], [680, 220]]) photo(x, y, (R() - 0.5) * 0.3, 3 + k++);
  });
}
let TEX = null;
const tex = () => TEX || (TEX = { flip: flipTexture(), board: boardTexture() });

// ---------- the things in the hall, at the size they are to her (about eighteen times hers) ----------
const IRT = {
  // a folding chair: padded seat and back, the metal frame, rubber feet; it faces +z
  chair() {
    const p = [paint(box(8.2, 0.9, 7.0, 0, 8.0, 0.2), SEAT), paint(new THREE.CylinderGeometry(0.45, 0.45, 8.2, 10).rotateZ(Math.PI / 2).translate(0, 8.0, 3.7), SEAT)];
    const back = box(7.8, 4.2, 0.6, 0, 0, 0); back.rotateX(-0.14); back.translate(0, 12.8, -3.6); p.push(paint(back, SEAT));
    for (const s of [-1, 1]) {
      p.push(paint(tube([s * 4.05, 0, -4.7], [s * 4.05, 15.0, -3.4], 0.32), FRAME));
      p.push(paint(tube([s * 4.05, 0, 3.9], [s * 4.05, 7.7, 2.6], 0.32), FRAME));
      p.push(paint(tube([s * 4.05, 7.5, -4.1], [s * 4.05, 7.5, 3.4], 0.26), FRAME));
      for (const z of [-4.7, 3.9]) p.push(paint(cyl(0.48, 0.48, 0.5, 8, s * 4.05, 0.25, z), FOOT));
    }
    p.push(paint(tube([-4.05, 1.7, 3.6], [4.05, 1.7, 3.6], 0.24), FRAME), paint(tube([-4.05, 1.7, -4.55], [4.05, 1.7, -4.55], 0.24), FRAME));
    return merge(p);
  },
  // somebody's coat over the back of it (white: each one is tinted)
  coat() {
    const W = [1, 1, 1], p = [paint(sph(1, 4.5, 1.3, 1.5, 0, 15.1, -3.85, 18, 10), W)];
    const behind = box(8.8, 7.6, 1.0, 0, 11.3, -4.75); behind.rotateX(0.05); p.push(paint(behind, W));
    p.push(paint(box(8.4, 2.6, 0.6, 0, 13.7, -3.0), W));
    for (const s of [-1, 1]) p.push(paint(box(1.7, 7.4, 1.8, s * 4.75, 10.6, -4.2), W));
    p.push(paint(box(2.2, 2.4, 0.5, 2.2, 9.6, -5.3), rgb(0xdedad2)));   // a pocket, lighter
    return merge(p);
  },
  // a box of tissues on the seat, one pulled up
  tissue() {
    const p = [paint(box(3.8, 2.2, 2.4, 1.3, 9.55, 1.0), rgb(0x8ab8d8)), paint(box(1.4, 0.08, 0.6, 1.3, 10.68, 1.0), rgb(0x2a4a6a))];
    const t = new THREE.ConeGeometry(0.9, 2.2, 4); t.scale(1, 1, 0.25); t.translate(1.3, 11.7, 1.0); p.push(paint(t, WHITE));
    return merge(p);
  },
  // their scarf, knitted, over the top of the back and hanging down either side of it
  scarf() {
    const A = rgb(0xff8ac0), B = rgb(0xffc8de), p = [paint(sph(1, 4.6, 0.9, 1.1, 0, 15.3, -3.85, 16, 8), A)];
    for (let k = 0; k < 6; k++) { p.push(paint(box(2.0, 1.35, 0.55, 2.2, 14.2 - k * 1.4, -3.05), k % 2 ? B : A)); p.push(paint(box(2.0, 1.35, 0.55, -1.9, 14.0 - k * 1.45, -4.65), k % 2 ? A : B)); }
    for (let k = 0; k < 5; k++) { p.push(paint(box(0.22, 1.2, 0.22, 1.5 + k * 0.35, 5.3, -3.05), A)); p.push(paint(box(0.22, 1.2, 0.22, -2.6 + k * 0.35, 5.0, -4.65), A)); }
    return merge(p);
  },
  // a paper cup by the front leg, the coffee gone cold in it
  cup() { return merge([paint(cyl(0.85, 0.62, 2.2, 14, 3.0, 1.1, 5.6), WHITE), paint(cyl(0.7, 0.7, 0.06, 14, 3.0, 2.0, 5.6), rgb(0x4a2a18))]); },
  // the urn on its folding table, the cups stacked beside it, the tray of biscuits
  urn() {
    const p = [paint(box(32, 0.9, 12, 0, 13.2, 0), rgb(0xd8d4c8)), paint(box(32.2, 1.2, 12.2, 0, 12.3, 0), rgb(0x6a6458))];
    for (const s of [-1, 1]) { p.push(paint(tube([s * 13, 0, -5], [s * 14.5, 12, 0], 0.4), STEEL), paint(tube([s * 13, 0, 5], [s * 14.5, 12, 0], 0.4), STEEL)); }
    const urn = lathe([[0, 0], [2.6, 0], [3.0, 0.6], [3.0, 8.6], [2.4, 9.4], [1.2, 9.8], [1.3, 10.4], [0, 10.6]]); urn.translate(-8, 13.6, 0); p.push(paint(urn, STEEL));
    for (const s of [-1, 1]) p.push(paint(box(0.5, 1.6, 0.5, -8 + s * 3.2, 21, 0), rgb(0x1a1a1c)));
    p.push(paint(box(1.2, 0.7, 2.2, -8, 15.4, 3.3), rgb(0x1a1a1c)), paint(box(0.5, 0.5, 0.5, -8, 16.4, 3.0), rgb(0x3a0a08)));
    for (let k = 0; k < 3; k++) for (let j = 0; j < 9; j++) p.push(paint(cyl(0.9 - j * 0.004, 0.7, 0.9, 12, 0 + k * 2.6, 14.1 + j * 0.62, -1.5), WHITE));
    p.push(paint(cyl(3.4, 3.4, 0.4, 20, 8.5, 13.9, 1.8), WHITE));
    const R = seeded(3); for (let k = 0; k < 7; k++) p.push(paint(cyl(0.9, 0.9, 0.35, 12, 8.5 + (R() - 0.5) * 4, 14.3 + (k > 4 ? 0.35 : 0), 1.8 + (R() - 0.5) * 4), rgb(0xd8a860)));
    p.push(paint(cyl(1.3, 1.1, 2.4, 14, 13, 14.9, -3), rgb(0xe8e4dc)));
    return merge(p);
  },
  // the flip chart on its easel; the pad is its own (the names)
  flip() {
    const p = [];
    for (const s of [-1, 1]) p.push(paint(tube([s * 8, 0, 2.2], [s * 5.5, 34, 0.4], 0.45), rgb(0x3a3a40)));
    p.push(paint(tube([0, 0, -9], [0, 30, -0.6], 0.45), rgb(0x3a3a40)));
    p.push(paint(box(14.6, 21, 0.6, 0, 22, 0), rgb(0x2a2a2e)), paint(box(15, 0.9, 2.4, 0, 11.2, 1.2), rgb(0x2a2a2e)));
    p.push(paint(cyl(0.45, 0.45, 4, 8, 0, 0, 0).rotateZ(Math.PI / 2).translate(3.5, 12.0, 1.6), rgb(0x1a1a1a)), paint(cyl(0.5, 0.5, 1.4, 8, 0, 0, 0).rotateZ(Math.PI / 2).translate(6.2, 12.0, 1.6), rgb(0xf0f0f0)));
    return merge(p);
  },
  flipPage() { const g = new THREE.PlaneGeometry(13.6, 19.2); g.translate(0, 22.2, 0.34); return g; },
  // a wall rail of coat hooks (the coats on it are their own)
  rack() {
    const p = [paint(box(1.0, 2.6, 46, 0, 15, 0), WOOD)];
    for (let k = 0; k < 8; k++) { const z = -19.6 + k * 5.6; p.push(paint(tube([0.4, 15.2, z], [2.4, 16.6, z], 0.3), STEEL), paint(sph(0.5, 1, 1, 1, 2.5, 16.7, z, 8, 6), STEEL)); }
    return merge(p);
  },
  // a long coat on a hook: shoulders, the body, the sleeves hanging
  hang() {
    const W = [1, 1, 1], p = [paint(sph(1, 1.6, 1.1, 2.6, 0, 14.2, 0, 14, 8), W), paint(box(2.4, 11, 4.8, 0, 7.9, 0), W), paint(box(2.6, 2.2, 5.2, 0, 2.6, 0), W)];
    for (const s of [-1, 1]) p.push(paint(box(1.6, 8.8, 1.4, 0.3, 8.9, s * 2.9), W));
    return merge(p);
  },
  // a door in its frame, the panel hinged at its left edge (its little wired window, the push plate)
  frame() { return merge([paint(box(1.2, 22.4, 1.8, -5.6, 11.2, 0), rgb(0x5a3a26)), paint(box(1.2, 22.4, 1.8, 5.6, 11.2, 0), rgb(0x5a3a26)), paint(box(12.4, 1.4, 1.8, 0, 22.4, 0), rgb(0x5a3a26))]); },
  door() {
    const p = [paint(box(10.4, 21.6, 0.7, 5.2, 10.8, 0), rgb(0xa8784a)), paint(box(3.0, 5.0, 0.8, 5.2, 15.6, 0), rgb(0x9ab0c0)), paint(box(1.6, 3.6, 0.9, 8.6, 10.4, 0), STEEL)];
    return merge(p);
  },
  doorLight() { const g = new THREE.PlaneGeometry(10.4, 21.6); g.translate(0, 10.8, -0.6); return g; },
  // the cork board, framed, on its two hooks
  board() { return merge([paint(box(28, 18, 1.0, 0, 0, -0.6), rgb(0x5a3a22))]); },
  boardFace() { const g = new THREE.PlaneGeometry(26.4, 16.4); g.translate(0, 0, 0.02); return g; },
  // chairs folded and stacked against the wall at the end of the night
  stack() {
    const p = [];
    for (let k = 0; k < 7; k++) { const y = k * 1.5, z = k * 0.35; p.push(paint(box(8.4, 1.0, 1.4, 0, 2 + y, z), SEAT), paint(box(8.0, 4.0, 0.5, 0, 12 + y, z - 1.2), SEAT)); for (const s of [-1, 1]) p.push(paint(tube([s * 4.1, y, z - 1.4], [s * 4.1, 15.5 + y, z - 1.0], 0.3), FRAME)); }
    return merge(p);
  },
  // the felt letter board her lines are put up on, hung by two cords
  signBoard() { return merge([paint(box(26.2, 10.6, 1.0, 0, 0, -1.0), rgb(0x7a5230)), paint(box(25.0, 9.4, 0.4, 0, 0, -0.45), rgb(0x161618)), ...[-9, 9].map((x) => paint(box(0.14, 40, 0.14, x, 25.3, -1.0), rgb(0x2a2420)))]); },
  // a bare bulb on a pole with an arm, for the ring at the end
  lampPole() { return merge([paint(cyl(0.7, 0.9, 46, 10, 0, 23, 0), rgb(0x5a4632)), paint(box(16, 0.8, 0.8, 7.6, 45.4, 0), rgb(0x5a4632)), paint(cyl(0.12, 0.12, 5, 6, 15, 42.6, 0), rgb(0x1a1a1a)), paint(cyl(0.6, 0.6, 1.0, 10, 15, 39.9, 0), rgb(0x2a2a2a))]); },
  bulb() { return paint(sph(1.2, 1, 1.25, 1, 15, 38.4, 0, 14, 10), [1, 0.9, 0.7]); },
};

extend({
  layers: {
    irtChairL: (M) => [IRT.chair(), VCm(M, 'irtChairM', 0.16, { roughness: 0.55, metalness: 0.15 }), 1400, {}],
    irtCoat: (M) => [IRT.coat(), M.irtCoatM || (M.irtCoatM = litTint(0.24)), 1300, { aTint: 3 }],
    irtCup: (M) => [IRT.cup(), VCm(M, 'irtCupM', 0.3, { roughness: 0.6 }), 600, {}],
    irtTissue: (M) => [IRT.tissue(), VCm(M, 'irtTissueM', 0.35, { roughness: 0.7 }), 200, {}],
    irtScarf: (M) => [IRT.scarf(), VCm(M, 'irtScarfM', 0.4, { roughness: 0.9 }), 16, {}],
    irtUrn: (M) => [IRT.urn(), VCm(M, 'irtUrnM', 0.22, { roughness: 0.35, metalness: 0.35 }), 6, {}],
    irtFlip: (M) => [IRT.flip(), VCm(M, 'irtFlipM', 0.2, { roughness: 0.6 }), 4, {}],
    irtFlipPage: (M) => [IRT.flipPage(), pic(M, 'irtFlipPageM', tex().flip, 0.62), 4, {}],
    irtRack: (M) => [IRT.rack(), VCm(M, 'irtRackM', 0.2, { roughness: 0.6 }), 24, {}],
    irtHang: (M) => [IRT.hang(), M.irtHangM || (M.irtHangM = litTint(0.22)), 200, { aTint: 3 }],
    irtFrame: (M) => [IRT.frame(), VCm(M, 'irtFrameM', 0.2, { roughness: 0.6 }), 40, {}],
    irtDoor: (M) => [IRT.door(), VCm(M, 'irtDoorM', 0.22, { roughness: 0.55 }), 40, {}],
    irtDoorLight: (M) => [IRT.doorLight(), M.irtDoorLightM || (M.irtDoorLightM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.05, 0.72), side: THREE.DoubleSide })), 40, {}],
    irtBoard: (M) => [IRT.board(), VCm(M, 'irtBoardM', 0.2, { roughness: 0.8 }), 30, {}],
    irtBoardFace: (M) => [IRT.boardFace(), pic(M, 'irtBoardFaceM', tex().board, 0.55), 30, {}],
    irtStack: (M) => [IRT.stack(), VCm(M, 'irtStackM', 0.16, { roughness: 0.6, metalness: 0.1 }), 30, {}],
    irtSignBoard: (M) => [IRT.signBoard(), VCm(M, 'irtSignM', 0.28, { roughness: 0.8 }), 16, {}],
    irtSignFace: (M) => [signFace(23.8, 8.6, 0, 0, -0.2), M.sign, 16, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // a folding chair, and whoever's in it. Ride in time and it fills as you come; it empties again once
    // you're by (mode 'wave'); 'stay' keeps it full (the room is always full); 'dark' never fills.
    // spot: their chair, the scarf over it, empty, the cold light on it, until someone sits in it (bright).
    irtChair(S, it, p, q, yaw) {
      const L = S.layers; void L.irtChairL; void L.irtCoat; void L.irtCup; void L.irtTissue; void L.irtScarf;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      const at = S._irc || (S._irc = new THREE.Vector3()); at.set(p.x, (it.h ?? 0), p.z);
      m.compose(at, q, S._s.set(s, s, s)); L.irtChairL.add(m);
      if (it.tissue) L.irtTissue.add(m);
      const W = S.irtWarm ?? 1, near = Math.abs(it.x) < 40;
      if (it.spot) {
        L.irtScarf.add(m);
        const b = it.bright !== undefined ? smooth(it.bright, it.bright + 0.6, T) * (it.brightTo !== undefined ? 1 - smooth(it.brightTo, it.brightTo + 1, T) : 1) : 0;
        const w = local(at, yaw, 0, 11 * s, 0.6 * s, S._o);
        if (b < 0.99) { glowAt(S, w.x, w.y + 2 * s, w.z, 11 * s, COLD, 0.42 * (1 - b) * (it.cold ?? 1)); if (near) poolAt(S, at.x, at.y + 0.14, at.z, 22 * s, COLD, 0.42 * (1 - b) * (it.cold ?? 1)); }
        if (b > 0.01) { L.irtCoat.add(m, tintV(it.coat)); glowAt(S, w.x, w.y, w.z, 18 * s, BRIGHT, 1.5 * b); glowAt(S, w.x, w.y + 4 * s, w.z, 54 * s, BRIGHT, 0.32 * b); if (near) poolAt(S, at.x, at.y + 0.14, at.z, 44 * s, BRIGHT, 0.8 * b); }
        return;
      }
      // (her run fills it: each chair takes a little more of one than the last, so half a run is
      // half a room; it fills a few seconds before she gets there, where it's seen)
      const run = smooth(it.seed * 0.75, it.seed * 0.75 + 0.22, S.irtRun ?? 0);
      let f;
      if (it.mode === 'dark') f = 0;
      else if (it.mode === 'stay') f = Math.max(it.min ?? 0.7, run);
      else f = run * smooth(it.t - (it.lead ?? 3.2), it.t - (it.lead ?? 3.2) + 0.9, T) * (1 - smooth(it.t + (it.lag ?? 1.3), it.t + (it.lag ?? 1.3) + 1.5, T));
      if (it.on !== undefined) f *= smooth(it.on, it.on + 0.35, T);
      if (it.off !== undefined) f *= 1 - smooth(it.off, it.off + (it.offFor ?? 0.5), T);
      if (f > 0.3) { L.irtCoat.add(m, tintV(it.coat)); if (it.cup) L.irtCup.add(m); }
      if (f > 0.02) {
        const w = local(at, yaw, 0, 11 * s, 0.6 * s, S._o);
        glowAt(S, w.x, w.y, w.z, 9.5 * s, WARM, 0.62 * f * W);
        if (near) poolAt(S, at.x, at.y + 0.12, at.z, 20 * s, WARM, 0.36 * f * W);
      }
    },
    // far out in the field: only their light shows that far
    irtFar(S, it, p) {
      const T = S.tNow ?? 0;
      const f = Math.max(it.min ?? 0.6, it.wakeNow ?? 0) * (it.off !== undefined ? 1 - smooth(it.off, it.off + 0.8, T) : 1) * (it.on !== undefined ? smooth(it.on, it.on + 0.6, T) : 1);
      if (f > 0.02) glowAt(S, p.x, (it.h ?? 0) + 11 * (it.s ?? 1), p.z, 10 * (it.s ?? 1), WARM, 0.7 * f * (S.irtWarm ?? 1));
    },
    // the set-pieces, each where she sings it
    irtProp(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['irtUrn', 'irtFlip', 'irtFlipPage', 'irtBoard', 'irtBoardFace', 'irtStack', 'irtFrame', 'irtDoor', 'irtDoorLight', 'irtChairL']) void L[k];
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, k = it.kind;
      const at = S._irp || (S._irp = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const put = (layer, x = 0, y = 0, z = 0) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, q, S._s.set(s, s, s)); return L[layer].add(m); };
      const light = (y, size, c, k2, z = 4, x = 0) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, c, k2); };
      const spot = (k2 = 0.45, c = WARM, r = 34) => poolAt(S, at.x, (it.h ?? 0) + 0.15, at.z, r * s, c, k2);
      if (k === 'urn') {
        put('irtUrn');
        light(16.4, 3.2, URN_RED, 1.6, 3.2, -8);       // its little red lamp: ready
        const st = 0.5 + 0.5 * Math.sin(T * 1.7);
        for (let j = 0; j < 4; j++) { const f = (T * 0.35 + j / 4) % 1; light(24.4 + f * 12, 2 + f * 5, [0.9, 0.9, 0.95], 0.18 * (1 - f) * st, 0, -8 + Math.sin(T + j) * 0.8); }
        light(20, 40, WARM, 0.14, 2); spot(0.4);
      } else if (k === 'flip') {
        put('irtFlip'); put('irtFlipPage');
        light(24, 34, [1, 0.97, 0.9], 0.2, 3); spot(0.4, [1, 0.96, 0.9]);
      } else if (k === 'board') {
        put('irtBoard'); put('irtBoardFace');
        light(0, 30, WARM, 0.18, 3); light(12, 6, BULB, 0.8, 4);
      } else if (k === 'stack') {
        put('irtStack'); spot(0.25);
      } else if (k === 'door') {
        // a door standing open on a chair wedged under it; or just cracked, the light through the gap
        put('irtFrame');
        const open = it.shut !== undefined ? (it.open ?? 1.3) * (1 - smooth(it.shut - 0.3, it.shut, T)) : (it.open ?? 1.3);
        const hinge = local(at, yaw, -5.2 * s, 0, 0, S._o);
        S._e.set(0, yaw - open, 0); const dq = (S._irdq || (S._irdq = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(hinge, dq, S._s.set(s, s, s)); L.irtDoor.add(m);
        if (it.wedge) { const w = local(at, yaw, (-5.2 + Math.sin(open) * 10.8 * 0.5) * s, 0, Math.cos(open) * 2 * s + 6 * s, S._o); S._e.set(0, yaw + Math.PI * 0.5 - open, 0); const cq = (S._ircq || (S._ircq = new THREE.Quaternion())).setFromEuler(S._e); m.compose(w, cq, S._s.set(s * 0.95, s * 0.95, s * 0.95)); L.irtChairL.add(m); }
        const lit = (it.lit ?? 1) * clamp(open / 0.4, 0, 1);
        if (it.crack) for (let j = 0; j < 4; j++) light(2.5 + j * 5.4, 5, PORCH, 1.0, 1.2, -5.2 + Math.cos(open) * 10.4);
        if (lit > 0.01) { put('irtDoorLight'); light(10, 30, PORCH, 0.55 * lit, -1); const w = local(at, yaw, 0, 0, 10 * s, S._o); poolAt(S, w.x, (it.h ?? 0) + 0.15, w.z, 30 * s, PORCH, 0.5 * lit); }
      }
    },
    // a rail of coat hooks along the wall, a coat on each; each one leaves at its moment
    irtRack(S, it, p, q, yaw) {
      const L = S.layers; void L.irtRack; void L.irtHang;
      if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      const at = S._irk || (S._irk = new THREE.Vector3()); at.set(p.x, it.h ?? 0, p.z);
      m.compose(at, q, S._s.set(s, s, s)); L.irtRack.add(m);
      for (let j = 0; j < 8; j++) {
        const c = it.coats[j]; if (!c) continue;
        const gone = c.leave !== undefined ? smooth(c.leave, c.leave + 0.35, T) : 0, come = c.come !== undefined ? smooth(c.come, c.come + 0.35, T) : 1;
        const k = come * (1 - gone); if (k < 0.02) continue;
        const w = local(at, yaw, 2.4 * s, (1 - k) * 4 * s, (-19.6 + j * 5.6) * s, S._o);
        m.compose(w, q, S._s.set(s, s * k, s)); L.irtHang.add(m, tintV(c.tint));
      }
      const w = local(at, yaw, 6 * s, 20 * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 26 * s, WARM, 0.1);
    },
    // her lines on the felt board, hung over the road
    irtSign(S, it, p) {
      const T = S.tNow ?? 0, sm = S._irs || (S._irs = {}), sp = S.course.sample(it.t, sm), h = sp.yaw;
      S._e.set(0, h + Math.PI, Math.sin(T * 1.1 + it.t) * 0.018); const fq = (S._irsq || (S._irsq = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = sp.y + (it.h || 14);
      const m = S._m, s = it.s ?? 1; m.compose(p, fq, S._s.set(s, s, s)); S.layers.irtSignBoard.add(m); S.layers.irtSignFace.add(m, signV(it.idx, 1, 0));
      glowAt(S, p.x, p.y + 7 * s, p.z, 26 * s, WARM, 0.16);
    },
    // a house on the street: its front room lights as you come and goes dark once you're by
    irtHouse(S, it, p, q) {
      const T = S.tNow ?? 0, m = S._m, ld = it.lead ?? 5, lg = it.lag ?? 1.0;
      const w = smooth(it.t - ld, it.t - ld + 1.2, T) * (1 - smooth(it.t + lg, it.t + lg + 1.4, T));
      m.compose(p, q, S._s.set(it.s, it.s, it.s));
      S.layers.house.add(m, wakeV(0.06 + 0.94 * w * (it.k ?? 1), it.seed, 0, it.tint));
      S.layers.roof.add(m, tintV(it.roofTint));
      if (it.porch) { const o = local(p, S.course.yawAt(it.t) + it.rot, 0, 2.4 * it.s, 4.3 * it.s, S._o); glowAt(S, o.x, o.y, o.z, 1.6 * it.s, PORCH, 0.35 + 1.0 * w); poolAt(S, o.x, p.y + 0.06, o.z, 7 * it.s, PORCH, 0.2 + 0.6 * w); }
    },
  },
  kits: {
    // the street on a wet night: two rows of houses, the lamps, cars parked along the kerb
    irtStreet(S, z, R) {
      const tints = [0xc8b8a8, 0xa8b0b8, 0xb8a898, 0xd0c4b0, 0x98a4a0, 0xb0a0a8];
      for (let t = z.from; t < z.to; t += 0.16) for (const side of [-1, 1]) {
        if (R() < 0.7) {
          const x = side * (20 + R() * 5), tt = t + R() * 0.06;
          S.items.push({ t: tt, x, rot: SIDE(side), s: 0.85 + R() * 0.25, parts: 'irtHouse', tint: col(tints[Math.floor(R() * tints.length)]), roofTint: col(0x262028), seed: R(), porch: R() < 0.8, lead: 4 + R() * 3, lag: 0.6 + R() * 0.8 });
          if (R() < 0.45) S.items.push({ t: tt + 0.05, x: x - side * 1.8, rot: SIDE(side) + Math.PI / 2 + (R() - 0.5) * 0.12, parts: 'parked', tint: col([0x3a3a44, 0x6a2a2a, 0x8a8a90, 0x2a3a4a, 0xd0ccc4][Math.floor(R() * 5)]) });
        }
        if (R() < 0.5) S.items.push({ t: t + R() * 0.1, x: side * (40 + R() * 16), rot: SIDE(side), s: 0.85 + R() * 0.3, parts: 'irtHouse', tint: col(tints[Math.floor(R() * tints.length)]), roofTint: col(0x262028), seed: R(), lead: 6 + R() * 4, lag: 0.4 + R() * 1.4, k: 0.8 });
        if (R() < 0.25) S.items.push({ t, x: side * (62 + R() * 50), s: 0.9 + R() * 0.5, parts: 'tree', tint: col(0x16201e), seed: R() });
      }
      for (let t = z.from; t < z.to; t += 0.33) for (const side of [-1, 1]) S.items.push({ t, x: side * 9, rot: SIDE(side), parts: 'lamp', seed: R() });
    },
    // the chairs down both sides of a room, facing each other across it (rows: their distances out)
    irtChairs(S, z, R) {
      const rows = z.rows || [28], every = z.every ?? 0.5, spots = z.spots || [];
      for (let t = z.from; t < z.to; t += every) for (const side of [-1, 1]) for (let r = 0; r < rows.length; r++) {
        const tt = t + (r % 2) * every * 0.5 + (R() - 0.5) * every * 0.15;
        if (tt >= z.to) continue;
        const isSpot = spots.some((sp) => Math.abs(sp.t - tt) < every * 0.5 && (sp.side ?? -1) === side && r === 0);
        const it = { t: tt, x: side * (rows[r] + (R() - 0.5) * 1.6), rot: FACE(side) + (R() - 0.5) * 0.18, s: (z.s ?? 1) * (0.96 + R() * 0.08), parts: 'irtChair', mode: z.mode || 'wave', min: z.min, lead: (z.lead ?? 3.2) + R() * 1.2, lag: z.lag, on: z.on, off: z.off !== undefined ? z.off + (z.offSpread ?? 0) * R() : undefined, offFor: z.offFor, coat: col(COATS[Math.floor(R() * COATS.length)]), cup: R() < 0.35, tissue: z.tissue && R() < z.tissue, seed: R(), wake0: 0, ahead: 26, h: 0 };
        if (isSpot) { const sp = spots.find((s2) => Math.abs(s2.t - tt) < every * 0.5); Object.assign(it, { spot: true, bright: sp.bright, brightTo: sp.brightTo, cold: sp.cold, tissue: false }); }
        S.items.push(z.floor ? onFloor(S, it) : it);
      }
    },
    // the set-pieces, each where she sings it
    irtProps(S, z) { for (const c of z.at) { const it = { t: c.t, x: c.x, rot: c.rot ?? (c.face === false ? SIDE(c.x) : FACE(c.x)), s: c.s ?? 1, y: c.y, kind: c.kind, open: c.open, shut: c.shut, wedge: c.wedge, crack: c.crack, lit: c.lit, h: 0, parts: 'irtProp', ahead: c.ahead ?? 40 }; S.items.push(c.floor ? onFloor(S, it) : it); } },
    // the coat hooks along a wall, every coat with its own moment to go (or arrive)
    irtRacks(S, z, R) {
      for (const r of z.at) {
        const coats = [];
        for (let j = 0; j < 8; j++) { if (r.empty && r.empty.includes(j)) { coats.push(null); continue; } coats.push({ tint: col(COATS[Math.floor(R() * COATS.length)]), leave: r.leave ? r.leave[j] : undefined, come: r.come ? r.come[j] : undefined }); }
        S.items.push(onFloor(S, { t: r.t, x: r.x, rot: r.x > 0 ? 0 : Math.PI, s: r.s ?? 1, coats, h: 0, parts: 'irtRack', ahead: 40 }));
      }
    },
    // the walls gone: the chairs go on into the night as far as you can see, all of them full
    irtField(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 0.42) for (const side of [-1, 1]) {
        for (const d of z.rows || [30, 44, 60]) S.items.push({ t: t + R() * 0.2, x: side * (d + (R() - 0.5) * 6), rot: FACE(side) + (R() - 0.5) * 0.5, s: (z.s ?? 1.1) * (0.94 + R() * 0.1), parts: 'irtChair', mode: 'stay', min: z.min ?? 0.75, on: z.on, off: z.off !== undefined ? z.off + R() * (z.offSpread ?? 6) : undefined, offFor: 0.8, coat: col(COATS[Math.floor(R() * COATS.length)]), cup: R() < 0.3, seed: R(), wake0: 0, ahead: 22, h: 0 });
        for (let k = 0; k < (z.far ?? 3); k++) S.items.push({ t: t + R() * 0.4, x: side * (80 + R() * 220), s: 1.1 + R() * 0.5, parts: 'irtFar', min: z.min ?? 0.75, on: z.on, off: z.off !== undefined ? z.off + R() * (z.offSpread ?? 6) : undefined, wake0: 0, ahead: 30, h: 0 });
      }
    },
  },
});

// ---------- the hall ----------
const ringFlat = (W = 34, H = 30) => [
  [-W, H, 1, 1], [-W, 0, 1, 1],
  [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0],
  [W, 0, 1, 2], [W, H, 1, 2],
  [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
];
const HALL = {
  rings: { flat: ringFlat },
  ringOf: () => 'flat',
  styles: { corridor: 0, meeting: 1, big: 2, small: 3 },
  dims: { corridor: [24, 28], meeting: [38, 32], big: [48, 42], small: [32, 28] },
  // the ceiling panels' spacing along (the drop ceiling has one every third tile)
  lights: (id) => ({ 0: [36, 6], 1: [36, 6], 2: [24, 12], 3: [36, 6] }[id] || null),
};
function hallMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) }, uSkyLo: { value: new THREE.Color(0x1a1a34) }, uSkyHi: { value: new THREE.Color(0x05060f) }, uNight: { value: 1 }, uRain: { value: 0 }, uPanel: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uNight, uRain, uPanel; uniform vec3 uFog, uCam, uLight, uSkyLo, uSkyHi;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      ${AA_GLSL}
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float box2(vec2 p, vec2 a, vec2 b){ return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
      // 1 on the lines of a grid of unit cells (w: half their width), filtered so they don't shimmer
      float grout(vec2 q, float w){ vec2 f = abs(fract(q) - 0.5); vec2 fw = max(fwidth(q), vec2(1e-4)); vec2 g = smoothstep(0.5 - w - fw, 0.5 - w + fw, f); return max(g.x, g.y) * clamp(1.0 - 3.0 * max(fw.x, fw.y), 0.0, 1.0); }
      float lineAA(float d, float w){ float fw = max(fwidth(d), 1e-4); return 1.0 - smoothstep(w - fw, w + fw, abs(d)); }
      void main(){
        int part = int(vPart + 0.5); int st = int(uStyle + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float wa = part == 6 ? x : along;
        vec3 glow = vec3(0.0); vec3 col;
        if (part == 7) {
          // the hall from the street: brick, tall windows lit either side of the door, a stone band
          vec2 br = vec2(x / 1.8 + 0.5 * mod(floor(h / 0.8), 2.0), h / 0.8);
          col = mix(vec3(0.38, 0.17, 0.13) * (0.75 + 0.35 * h2(floor(br))), vec3(0.5, 0.47, 0.44), grout(br, 0.06));
          float ax = abs(x);
          vec2 wv = vec2(mod(ax - 18.0, 22.0), h);
          float win = step(18.0, ax) * step(ax, 92.0) * box2(wv, vec2(5.0, 9.0), vec2(16.0, 30.0));
          float mull = win * (lineAA(wv.x - 10.5, 0.35) + lineAA(wv.y - 21.0, 0.35));
          vec3 lit = vec3(1.0, 0.8, 0.52) * (0.8 + 0.2 * h2(vec2(floor((ax - 18.0) / 22.0), 4.0)));
          col = mix(col, lit, win); glow += lit * win * 0.85;
          col = mix(col, vec3(0.2, 0.16, 0.14), clamp(mull, 0.0, 1.0));
          col = mix(col, vec3(0.72, 0.68, 0.6), lineAA(h - 36.0, 1.0));
          col *= 0.72;
        }
        else if (part == 8) { col = vec3(0.34, 0.22, 0.15); }
        else if (part == 0) {
          if (st == 2) {
            // the big hall: a maple floor, and the lines of the court painted on it
            vec2 pl = vec2(x / 2.2, along / 26.0 + 0.41 * floor(x / 2.2));
            col = vec3(0.74, 0.52, 0.32) * (0.82 + 0.25 * h2(floor(pl))) * (1.0 - 0.12 * grout(pl, 0.02));
            float cz = mod(along, 150.0) - 75.0;
            float ln = lineAA(abs(x) - 31.0, 0.45) + lineAA(length(vec2(x, cz)) - 17.0, 0.45) * step(abs(x), 31.0) + lineAA(cz, 0.45) * step(abs(x), 31.0);
            col = mix(col, vec3(0.72, 0.16, 0.14), clamp(ln, 0.0, 1.0) * 0.85);
            col += vec3(0.1, 0.08, 0.06) * uPanel * smoothstep(0.5, 1.0, sin(along * 0.1309)) * (1.0 - smoothstep(6.0, 26.0, abs(x)));
          } else if (st == 3) {
            // carpet tiles, the nap turned each way
            vec2 q = vec2(x, along) / 6.0;
            float c = aaChk(q);
            col = vec3(0.24, 0.29, 0.36) * (0.9 + 0.1 * c) * (0.94 + 0.06 * h2(floor(q * 7.0)));
          } else {
            // linoleum squares: cream, a grey-green one now and then
            vec2 q = vec2(x, along) / 6.0; vec2 iq = floor(q);
            float acc = step(0.84, h2(iq + 7.0)) + (mod(iq.x + iq.y, 7.0) < 0.5 ? 1.0 : 0.0);
            col = mix(vec3(0.84, 0.82, 0.74), vec3(0.4, 0.5, 0.44), clamp(acc, 0.0, 1.0)) * (1.0 - 0.1 * grout(q, 0.025)) * (0.95 + 0.05 * h2(floor(q * 6.0)));
            col += vec3(0.09, 0.1, 0.09) * uPanel * pow(max(0.0, sin(along * 0.0873)), 8.0) * (1.0 - smoothstep(6.0, 20.0, abs(x)));
          }
        }
        else if (part == 3) {
          if (st == 2) {
            // the big hall's ceiling: dark boards, beams across
            col = vec3(0.3, 0.22, 0.16) * (0.9 + 0.1 * h2(vec2(floor(x / 3.0), 1.0)));
            float bm = 1.0 - smoothstep(1.6, 1.9, abs(mod(along, 24.0) - 12.0));
            col = mix(col, vec3(0.16, 0.11, 0.08), bm);
          } else {
            // a dropped ceiling: speckled tiles in their grid, a light panel in every third row
            vec2 q = vec2(x / 12.0, along / 12.0); vec2 iq = floor(q);
            col = vec3(0.88, 0.87, 0.84) * (0.94 + 0.06 * h2(floor(q * 9.0)));
            col = mix(col, vec3(0.72, 0.72, 0.7), grout(q, 0.02));
            float pan = step(abs(x), 12.0) * step(mod(iq.y, 3.0), 0.5) * box2(fract(q), vec2(0.06), vec2(0.94));
            col = mix(col, vec3(1.0), pan);
            glow += vec3(0.95, 1.0, 0.96) * pan * uPanel * 1.4;
          }
        }
        else {
          // walls: painted block in courses, darker below a wooden rail, a rubber skirting
          float notCap = part == 6 ? 0.0 : 1.0;
          vec2 bq = vec2(wa / 8.0 + 0.5 * mod(floor(h / 4.0), 2.0), h / 4.0);
          vec3 up = vec3(0.86, 0.84, 0.74), lo = vec3(0.3, 0.42, 0.36);
          if (st == 1) { up = vec3(0.84, 0.8, 0.7); lo = vec3(0.56, 0.44, 0.34); }
          else if (st == 2) { up = vec3(0.8, 0.77, 0.7); lo = vec3(0.5, 0.28, 0.23); }
          else if (st == 3) { up = vec3(0.9, 0.78, 0.66); lo = vec3(0.68, 0.54, 0.44); }
          col = mix(up, lo, step(h, 7.0)) * (1.0 - 0.18 * grout(bq, 0.03));
          col = mix(col, vec3(0.55, 0.4, 0.28), lineAA(h - 7.0, 0.35));
          col = mix(col, vec3(0.2, 0.18, 0.17), step(h, 0.8));
          if (st != 0) {
            // windows onto the night (wired glass in the halls, half-lowered blinds in the small room)
            float per = st == 2 ? 34.0 : 30.0, w0 = 9.0, w1 = st == 2 ? 32.0 : 24.0, ww = st == 3 ? 10.0 : 13.0;
            vec2 wv = vec2(mod(wa + 6.0, per) - 6.0, h);
            float win = notCap * box2(wv, vec2(0.0, w0), vec2(ww, w1));
            vec3 sky = mix(uSkyLo, uSkyHi, clamp((h - w0) / (w1 - w0), 0.0, 1.0));
            vec2 cq = vec2(floor(wv.x * 1.2 + floor(along / per) * 7.0), floor(wv.y * 1.3));
            float far = step(0.84, h2(cq)) * step(wv.y, w0 + (w1 - w0) * 0.45) * uNight;
            float rs = h2(vec2(floor(wv.x * 2.5), floor(along / per)));
            float streak = uRain * step(0.62, rs) * smoothstep(0.75, 1.0, fract(h * 0.07 - uTime * (0.25 + 0.5 * rs) + rs * 7.0));
            vec3 glass = sky + vec3(1.0, 0.75, 0.45) * far * 0.7 + vec3(0.55, 0.62, 0.75) * streak * 0.35;
            col = mix(col, glass, win); glow += glass * win * 0.55;
            if (st == 3) col = mix(col, vec3(0.9, 0.87, 0.8), win * step(0.55, fract(h / 1.1)) * step(w0 + (w1 - w0) * 0.45, h));
            else col = mix(col, vec3(0.62, 0.64, 0.66), win * grout(vec2(wv.x + wv.y, wv.x - wv.y) / 3.0, 0.03) * 0.5);
            float fr = notCap * (box2(wv, vec2(-0.7, w0 - 0.7), vec2(ww + 0.7, w1 + 0.7)) - box2(wv, vec2(0.0, w0), vec2(ww, w1)));
            col = mix(col, vec3(0.86, 0.84, 0.8), fr);
            if (st != 3) { float rad = notCap * box2(wv, vec2(0.6, 1.4), vec2(ww - 0.6, 6.0)); col = mix(col, vec3(0.86, 0.85, 0.8) * (0.82 + 0.18 * aaSq(wv.x * 1.4)), rad); }
          } else {
            // the corridor: a red alarm bell now and then, and an exit sign's green over the doors
            vec2 av = vec2(mod(wa, 56.0) - 28.0, h - 20.0);
            float bell = notCap * (1.0 - smoothstep(0.5, 0.56, length(av)));
            col = mix(col, mix(vec3(0.75, 0.08, 0.06), vec3(0.3, 0.05, 0.04), step(length(av), 0.16)), bell);
          }
        }
        col *= uLight;
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// a song-only palette value at song time t, blended the way look.js blends its own
function lookNum(S, key, def) {
  const K = S.look && S.look.keys; if (!K) return def;
  const t = S.rider.t;
  let i = 0; while (i + 1 < K.length && t >= K[i + 1].t) i++;
  const a = K[i].P[key] ?? def, nxt = K[i + 1];
  if (!nxt || t <= nxt.t - nxt.fade) return a;
  let f = (t - (nxt.t - nxt.fade)) / nxt.fade; f = f * f * (3 - 2 * f);
  return a + ((nxt.P[key] ?? a) - a) * f;
}

// lit by the one bulb over the ring: warm, falling off with the distance from it
function bulbLit(k) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.1 });
  m.userData.uBulb = { value: new THREE.Vector3() };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBulb = m.userData.uBulb;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vIrtWp;').replace('#include <project_vertex>', '#include <project_vertex>\nvIrtWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uBulb; varying vec3 vIrtWp;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float irtBd = length(vIrtWp - uBulb); totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.78, 0.5) * ' + k.toFixed(2) + ' / (1.0 + irtBd * irtBd / 900.0);');
  };
  return m;
}

// ---------- the end: a ring of folding chairs under one bulb, the scarf on one, the urn's lamp on ----------
export class IrtFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -36;
    this.group = new THREE.Group(); scene.add(this.group);
    const mat = this.mat = bulbLit(2.2);
    const chairG = IRT.chair();
    const n = cfg.n ?? 10, r = cfg.r ?? 22;
    this.spots = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + 0.2, cx = Math.cos(a) * r, cz = Math.sin(a) * r, ry = Math.atan2(-Math.cos(a), -Math.sin(a));
      const c = new THREE.Mesh(chairG, mat); c.position.set(cx, 0, cz); c.rotation.y = ry; this.group.add(c);
      if (i === (cfg.scarf ?? 3)) { const sc = new THREE.Mesh(IRT.scarf(), mat); sc.position.copy(c.position); sc.rotation.y = ry; this.group.add(sc); }
      // hers: her coat over the back of the one nearest the door
      if (i === (cfg.coat ?? 8)) { const co = new THREE.Mesh(paint(IRT.coat(), rgb(0x3a4a6a)), mat); co.position.copy(c.position); co.rotation.y = ry; this.group.add(co); }
    }
    // (behind the ring from the road: the urn on its table, the chairs stacked either side, the lamp)
    const urn = new THREE.Mesh(IRT.urn(), mat); urn.position.set(r + 13, 0, -6); urn.rotation.y = -1.75; this.group.add(urn);
    this.urnMesh = urn;
    const st = new THREE.Mesh(IRT.stack(), mat); st.position.set(6, 0, r + 12); st.rotation.y = Math.PI + 0.3; this.group.add(st);
    const st2 = new THREE.Mesh(IRT.stack(), mat); st2.position.set(-4, 0, -r - 13); st2.rotation.y = -0.2; this.group.add(st2);
    const pole = new THREE.Mesh(IRT.lampPole(), mat); pole.position.set(15, 0, 0); pole.rotation.y = Math.PI; this.group.add(pole);
    const bulb = new THREE.Mesh(IRT.bulb(), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.8, 1.2) })); bulb.position.set(15, 0, 0); bulb.rotation.y = Math.PI; this.group.add(bulb);
    this.group.scale.setScalar(cfg.s ?? 1.4);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  fire() { this.fired = true; }
  update(track, rider, songT) {
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t).yaw + (this.cfg.rot ?? 0), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1.4;
    this._w.set(0, 38.4, 0).applyMatrix4(this.group.matrixWorld); this.mat.userData.uBulb.value.copy(this._w); S.glow(this._w.x, this._w.y, this._w.z, 7 * s, BULB, 1.6); S.glow(this._w.x, this._w.y, this._w.z, 40 * s, BULB, 0.2);
    this._w.set(0, 0.2, 0).applyMatrix4(this.group.matrixWorld); S.pool(this._w.x, this._w.y, this._w.z, 44 * s, BULB, 0.95);
    this._w.set(-8, 16.4, 3.4).applyMatrix4(this.urnMesh.matrixWorld); S.glow(this._w.x, this._w.y, this._w.z, 3 * s, URN_RED, 1.5);
  }
}

// ---------- the place, per frame ----------
export class IrtWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = hallMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, HALL));
    this._g = new THREE.Vector3();
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyLo.value.set(P.horizon); u.uSkyHi.value.set(P.zenith); u.uNight.value = clamp(P.stars ?? 0, 0, 1) * 2; u.uRain.value = Math.max(P.rain ?? 0, 0.25);
    u.uPanel.value = lookNum(S, 'irtPanel', 1);
    S.town.irtWarm = lookNum(S, 'irtWarm', 1);
    // how full her run makes the rooms (eased, so a pump doesn't flick them)
    const run = clamp((S.rider.flow - 0.2) / 0.6, 0, 1);
    S.town.irtRun = (S.town.irtRun ?? run) + (run - (S.town.irtRun ?? run)) * Math.min(1, dt * 2.5);
    for (const r of this.rooms) r.update(S.track, S.rider, S.rider.t);
  }
  // the ceiling lights, and the lamp over the hall's front door
  draw(T) {
    const g = this._g, pk = this.mat.uniforms.uPanel.value;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) { const fy = floorAt(this.S.course, f.t); this.S.track.ground(f.t, 0, g); T.glow(g.x, fy + r.H - 1.5, g.z, r.style === 2 ? 9 : 12, r.style === 2 ? BULB : [0.92, 1, 0.94], (r.style === 2 ? 1.1 : 0.55) * pk); T.pool(g.x, fy + 0.08, g.z, 34, [0.95, 1, 0.95], 0.22 * pk); }
      for (const cap of r.caps) {
        if (!cap.visible || r.span.caps[cap.userData.k]?.kind !== 'front') continue;
        const t = cap.userData.t; this.S.track.ground(t, 0, g);
        T.glow(g.x, cap.userData.fy + (r.span.caps[cap.userData.k].hh ?? 26) + 3, g.z, 6, PORCH, 1.4); T.pool(g.x, cap.userData.fy + 0.1, g.z, 24, PORCH, 0.5);
      }
    }
  }
}
