// Your Wife, My Number: the set-pieces of the first half, each on its line.
// The gate swinging open on the drop; all the money on your wrist (a gold watch the size of a
// house, its second hand ticking on the beat); frost and a clenched red fist; the napkin with my
// digits writing themselves on; her steps in gold ahead of you and the heels she took off; the
// champagne tower going over on "messy"; one gate shut, four open; the thermometer in the red;
// the privacy hedges coming up out of the lawn; thunder (lightning you can see); the doves for
// peace; the portrait of him and his brother, a kiss landing on the brother; the gold phone
// ringing on "my number"; the grin; her standing there in gold; the house turning its floors
// round, one a beat, as its plan changes.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { groundAt, prepare } from './trail.js';
import { clamp, smooth, hash, TAU, V, rgb, seeded, merge, paint, shade, box, cyl, sph, lathe, tube, rbox, torus, roundRect, heartShape, vcMat, canvasTex, faceRoad, quat } from './ywn-lib.js';
import { beatInfo } from './ywn-place.js';

const GOLD = rgb(0xe0b84a), GOLD2 = rgb(0xc8962e), IRON = rgb(0x16181a), STONE = rgb(0xe8dfcc), RED = rgb(0xc8102e);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const ease = (f) => (f <= 0 ? 0 : f >= 1 ? 1 : 1 - Math.pow(1 - f, 3));
// a spring: 0 to 1 with an overshoot, settling
const spring = (f, k = 9, w = 16) => (f <= 0 ? 0 : 1 - Math.exp(-f * k) * Math.cos(f * w));

// ---------- pictures ----------
function dialTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    const cx = W / 2, cy = H / 2;
    const grd = g.createRadialGradient(cx, cy, 10, cx, cy, 256); grd.addColorStop(0, '#2a5a44'); grd.addColorStop(1, '#0c2018'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.06)'; for (let k = 0; k < 180; k++) { const a = k / 180 * TAU; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 260, cy + Math.sin(a) * 260); g.stroke(); }
    g.fillStyle = '#f0d070'; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.save(); g.translate(cx + Math.sin(a) * 196, cy - Math.cos(a) * 196); g.rotate(a); g.fillRect(-8, -30, 16, k % 3 ? 44 : 62); g.restore(); }
    g.strokeStyle = 'rgba(240,208,112,0.5)'; g.lineWidth = 2; for (let k = 0; k < 60; k++) { const a = k / 60 * TAU; g.beginPath(); g.moveTo(cx + Math.sin(a) * 236, cy - Math.cos(a) * 236); g.lineTo(cx + Math.sin(a) * 246, cy - Math.cos(a) * 246); g.stroke(); }
    g.fillStyle = '#f0d070'; g.beginPath(); g.arc(cx, cy, 16, 0, TAU); g.fill();
  });
}
function paperTexture() {
  return canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 2500; k++) { g.fillStyle = `rgba(160,150,130,${0.05 * Math.random()})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    g.strokeStyle = 'rgba(190,178,150,0.8)'; g.lineWidth = 4; g.strokeRect(26, 26, W - 52, H - 52);
    for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(26 + k * 11.6, 26, 3.5, 0, TAU); g.stroke(); g.beginPath(); g.arc(26 + k * 11.6, H - 26, 3.5, 0, TAU); g.stroke(); }
  });
}
function inkTexture() {
  return canvasTex(1024, 512, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.save(); g.translate(W / 2, H / 2 + 10); g.rotate(-0.08); g.fillStyle = '#1a2a6a'; g.font = 'italic 700 190px "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('555-0173', 0, 0); g.restore();
    g.strokeStyle = '#1a2a6a'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(170, 400); g.bezierCurveTo(380, 430, 640, 420, 860, 380); g.stroke();
  });
}
// a heel's print: the ball of the foot, the waist, the heel's little point
function printTexture() {
  return canvasTex(128, 256, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(64, 70, 40, 58, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(34, 100); g.quadraticCurveTo(52, 170, 58, 190); g.lineTo(70, 190); g.quadraticCurveTo(82, 150, 96, 96); g.fill();
    g.beginPath(); g.arc(64, 226, 14, 0, TAU); g.fill();
  });
}
// the brothers, in oils: him stiff on the left, his brother smiling on the right
function portraitTexture() {
  return canvasTex(768, 576, (g, W, H) => {
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#2a3a2a'); bg.addColorStop(1, '#141a14'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(255,240,200,${0.025 * Math.random()})`; g.fillRect(Math.random() * W, Math.random() * H, 6 + 10 * Math.random(), 2); }
    const man = (cx, smile, hair) => {
      g.fillStyle = '#16161c'; g.beginPath(); g.moveTo(cx - 170, H); g.quadraticCurveTo(cx - 160, 360, cx, 350); g.quadraticCurveTo(cx + 160, 360, cx + 170, H); g.fill();
      g.fillStyle = '#f2ece2'; g.beginPath(); g.moveTo(cx - 40, 352); g.lineTo(cx, 470); g.lineTo(cx + 40, 352); g.fill();
      g.fillStyle = smile ? '#a01828' : '#2a2a4a'; g.beginPath(); g.moveTo(cx - 12, 365); g.lineTo(cx + 12, 365); g.lineTo(cx + 18, 470); g.lineTo(cx, 500); g.lineTo(cx - 18, 470); g.fill();
      g.fillStyle = '#d8a888'; g.fillRect(cx - 28, 300, 56, 60);
      g.beginPath(); g.ellipse(cx, 240, 78, 98, 0, 0, TAU); g.fill();
      g.fillStyle = hair; g.beginPath(); g.ellipse(cx, 172, 82, 46, 0, Math.PI, TAU); g.fill(); g.fillRect(cx - 82, 168, 18, 50); g.fillRect(cx + 64, 168, 18, 50);
      g.fillStyle = '#2a1a14'; g.fillRect(cx - 40, 228, 22, 7); g.fillRect(cx + 18, 228, 22, 7);
      g.strokeStyle = '#7a3a2a'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath();
      if (smile) { g.moveTo(cx - 32, 286); g.quadraticCurveTo(cx, 312, cx + 32, 286); } else { g.moveTo(cx - 26, 292); g.lineTo(cx + 26, 292); }
      g.stroke();
    };
    man(250, false, '#3a3028'); man(530, true, '#6a4a2a');
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 30; g.strokeRect(0, 0, W, H);
  });
}
function kissTexture() {
  return canvasTex(256, 192, (g) => {
    g.clearRect(0, 0, 256, 192); g.save(); g.translate(128, 96); g.rotate(-0.25); g.fillStyle = '#d0102a';
    g.beginPath(); g.moveTo(-100, 0); g.bezierCurveTo(-60, -55, -18, -38, 0, -18); g.bezierCurveTo(18, -38, 60, -55, 100, 0); g.bezierCurveTo(50, -6, -50, -6, -100, 0); g.fill();
    g.beginPath(); g.moveTo(-100, 6); g.bezierCurveTo(-50, 12, 50, 12, 100, 6); g.bezierCurveTo(60, 66, -60, 66, -100, 6); g.fill();
    g.restore();
  });
}
let TX = null;
export const tex = () => TX || (TX = { dial: dialTexture(), paper: paperTexture(), ink: inkTexture(), print: printTexture(), portrait: portraitTexture(), kiss: kissTexture() });

// ---------- geometry ----------
const SG = {
  // the grand gate: rusticated piers with urns and lamps (leaves are their own), W = half the span
  piers(W = 30, H = 30) {
    const P = [];
    for (const s of [-1, 1]) {
      for (let k = 0; k < Math.round(H / 2.5); k++) P.push(shade(box(5 + (k % 2) * 0.4, 2.4, 5 + (k % 2) * 0.4, s * W, 1.25 + k * 2.5, 0), STONE, 0.86, 1.0));
      P.push(paint(box(6.4, 1.2, 6.4, s * W, H + 0.6, 0), rgb(0xf2ebdc)));
      P.push(paint(lathe([[0, 0], [1.6, 0], [1.2, 0.8], [1.2, 1.6], [2.6, 3.0], [2.9, 4.4], [1.4, 5.4], [0.6, 6.4], [0, 6.6]], 16).translate(s * W, H + 1.2, 0), rgb(0xf2ebdc)));
      for (const z of [-2.7, 2.7]) P.push(paint(box(1.2, 1.6, 0.4, s * W, H - 3, z), rgb(0x1a1a1a)));
    }
    // the overthrow: an iron arch from pier to pier with a gilt cartouche at its crown
    const R = W * 1.15, cy = H - Math.sqrt(R * R - W * W);
    for (let k = 0; k < 36; k++) {
      const a0 = -Math.asin(W / R) + (k / 36) * 2 * Math.asin(W / R), a1 = -Math.asin(W / R) + ((k + 1) / 36) * 2 * Math.asin(W / R);
      for (const dy of [0, 2.2]) P.push(paint(tube(V(Math.sin(a0) * R, cy + Math.cos(a0) * R + dy, 0), V(Math.sin(a1) * R, cy + Math.cos(a1) * R + dy, 0), 0.25), IRON));
      if (k % 2 === 0) P.push(paint(box(0.2, 2.2, 0.2, Math.sin(a0) * R, cy + Math.cos(a0) * R + 1.1, 0), IRON));
    }
    P.push(paint(sph(3.0, 1, 1.3, 0.5, 0, cy + R + 4.6, 0, 18, 12), GOLD));
    for (const s of [-1, 1]) P.push(paint(torus(1.6, 0.3, 6, 18, Math.PI * 1.5).rotateZ(s > 0 ? 0 : Math.PI / 2).translate(s * 3.6, cy + R + 3.4, 0), GOLD));
    return merge(P);
  },
  // one leaf: hinged at x 0, out to +x; its top rising toward the middle; spears gilt
  leaf(w = 27.5, h = 24) {
    const P = [];
    for (const y of [0.8, 10, 11.4]) P.push(paint(box(w, 0.6, 0.5, w / 2, y, 0), IRON));
    P.push(paint(box(0.7, h, 0.6, 0.35, h / 2, 0), IRON)); P.push(paint(box(0.7, h + 3, 0.6, w - 0.35, (h + 3) / 2, 0), IRON));
    const n = 16;
    for (let k = 1; k < n; k++) { const x = k * w / n, top = h - 2 + 5 * Math.pow(x / w, 1.6); P.push(paint(box(0.36, top, 0.36, x, top / 2, 0), IRON)); P.push(paint(new THREE.ConeGeometry(0.5, 1.6, 6).translate(x, top + 0.8, 0), GOLD)); }
    for (let k = 0; k < 8; k++) P.push(paint(torus(0.62, 0.14, 6, 14).translate(1.7 + k * (w - 3.4) / 7, 10.7, 0), GOLD));
    // the crest on each leaf: a gilt oval with scrolls
    P.push(paint(torus(2.4, 0.3, 8, 24).scale(1, 1.3, 1).translate(w * 0.62, 17, 0), GOLD));
    P.push(paint(sph(1.4, 1, 1.3, 0.4, w * 0.62, 17, 0, 14, 10), GOLD2));
    return merge(P);
  },
  // the watch: its case, the bezel set with stones, the crown, lugs and the bracelet down to the lawn
  watch() {
    const P = [];
    P.push(paint(cyl(10, 10, 3.6, 48, 0, 0, 0).rotateX(Math.PI / 2), GOLD));
    P.push(paint(torus(10, 1.0, 10, 48).translate(0, 0, 1.8), GOLD));
    P.push(paint(cyl(1.0, 1.0, 2.6, 16, 0, 0, 0).rotateZ(Math.PI / 2).translate(11.6, 0, 0), GOLD));
    for (const s of [-1, 1]) for (const dx of [-4.6, 4.6]) P.push(paint(box(2.2, 4, 3, dx, s * 10.6, 0), GOLD));
    return merge(P);
  },
  // the bracelet: a loop of links from the top lug back and down round the lawn and up the
  // front to the bottom lug, the way a watch stands in a window (case centre at 0, lawn at -24)
  bracelet() {
    const P = [], n = 30, cy = -7, cz = -3, ry = 17, rz = 4.2;
    for (let k = 0; k < n; k++) {
      const th = Math.PI / 2 - (k / n) * TAU;
      const y = cy + ry * Math.sin(th), z = cz + rz * Math.cos(th);
      if (y > -10.2 && z > -1.6) continue;          // inside the case
      const ty = ry * Math.cos(th), tz = -rz * Math.sin(th), L = Math.hypot(ty, tz);
      const link = rbox(9.4, 2.7, 1.8, 0.5); link.rotateX(Math.atan2(tz / L, ty / L)); link.translate(0, y, z);
      P.push(paint(link, k % 2 ? GOLD : GOLD2));
    }
    return merge(P);
  },
  hand(len, w) { return paint(box(w, len, 0.4, 0, len / 2 - 1.2, 0), rgb(0xf4e8c8)); },
  stones() { const P = []; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; P.push(new THREE.OctahedronGeometry(0.7, 0).translate(Math.cos(a) * 10, Math.sin(a) * 10, 2.7)); } return paint(merge(P), [1.6, 1.6, 1.7]); },
  // a fist in a red satin opera glove, the cuff set with diamonds (front +z, the arm up from 0)
  fist() {
    const P = [], satin = RED;
    P.push(shade(lathe([[3.3, 0], [3.4, 6], [3.1, 11], [2.9, 13.6], [0, 13.6]], 24), satin, 0.7, 1.0));
    P.push(shade(rbox(8.0, 7.4, 6.0, 1.9, 0, 17.4, 0.4), satin, 0.85, 1.0));
    // the fingers curled over: their knuckles in a row along the top front, their tips folded under
    for (let k = 0; k < 4; k++) {
      const x = -2.85 + k * 1.9, sz = k === 3 ? 0.88 : 1;
      P.push(shade(rbox(1.75, 2.5, 5.2 * sz, 0.75, x, 20.4, 1.6), satin, 0.85, 1.05));
      P.push(shade(rbox(1.65, 3.4, 1.9, 0.72, x, 18.9, 4.1), satin, 0.82, 1.0));
      P.push(paint(sph(0.75, 1, 0.8, 0.8, x, 21.4, 3.7, 10, 8), satin, 1.08));
    }
    const th = rbox(2.2, 1.9, 5.8, 0.85); th.rotateY(-1.25); th.rotateZ(0.25); th.translate(-0.4, 17.0, 4.4); P.push(shade(th, satin, 0.85, 1.0));
    // a ring with a stone on her ring finger
    P.push(paint(torus(1.0, 0.3, 8, 16).rotateY(Math.PI / 2).translate(1.0, 18.9, 4.2), GOLD));
    P.push(paint(new THREE.OctahedronGeometry(0.9, 0).translate(1.0, 19.9, 5.1), [1.5, 1.5, 1.6]));
    return merge(P);
  },
  cuff() { const P = [paint(cyl(3.5, 3.5, 1.4, 28, 0, 13.6, 0), rgb(0xd8dce4))]; for (let k = 0; k < 22; k++) { const a = k / 22 * TAU; P.push(paint(new THREE.OctahedronGeometry(0.75, 0).translate(Math.cos(a) * 3.6, 13.6, Math.sin(a) * 3.6), [1.7, 1.7, 1.8])); } return merge(P); },
  // a café table, its marble top on a gold foot
  table(r = 8, h = 12) { return merge([shade(cyl(r, r, 0.7, 40, 0, h, 0), rgb(0xf4f0ea), 0.8, 1.05), paint(lathe([[3.6, 0], [3.4, 0.6], [1.0, 1.4], [0.7, 6], [0.9, h - 1.2], [2.2, h - 0.35], [0, h - 0.3]], 24), GOLD)]); },
  pen() { const P = [paint(cyl(0.55, 0.55, 10, 16, 0, 0, 0), rgb(0x101014)), paint(cyl(0.6, 0.6, 1.0, 16, 0, 3.6, 0), GOLD), paint(new THREE.ConeGeometry(0.55, 2.4, 16).translate(0, 6.2, 0), GOLD), paint(sph(0.55, 1, 1, 1, 0, -5, 0, 12, 8), rgb(0x101014))]; const g = merge(P); g.rotateZ(Math.PI / 2); g.rotateY(0.5); return g; },
  // a gold stiletto (toe to +z): the sole's arch, the pointed toe cap, the counter, the spike, a strap
  stiletto() {
    const P = [];
    const pts = [];
    for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push([u, u < 0.32 ? 0.0 : Math.pow((u - 0.32) / 0.68, 1.5)]); }
    // the sole: a thin bent plate from the toe (z +9) back to the heel seat (z -8, up 8.5)
    for (let k = 0; k < 16; k++) {
      const [u0, y0] = pts[k], [u1, y1] = pts[k + 1];
      const za = 9 - u0 * 17, zb = 9 - u1 * 17, ya = y0 * 8.5, yb = y1 * 8.5, w = 3.6 - 1.4 * Math.abs(u0 - 0.45);
      P.push(paint(tube(V(0, ya + 0.2, za), V(0, yb + 0.2, zb), 0.18, 0.18, 4).scale(w * 3, 1, 1), GOLD2));
    }
    // toe cap
    P.push(shade(sph(2.0, 1, 0.9, 2.6, 0, 0.9, 5.6, 18, 12, ), GOLD, 0.85, 1.1));
    // heel counter: a cup round the back of the heel seat
    P.push(paint(new THREE.CylinderGeometry(1.9, 1.7, 3.0, 20, 1, true, Math.PI * 0.55, Math.PI * 0.9).rotateY(Math.PI).translate(0, 9.6, -7.2), GOLD));
    // the spike under the heel
    P.push(paint(tube(V(0, 8.4, -7.6), V(0, 0, -8.6), 0.75, 0.22, 10), GOLD));
    // an ankle strap
    P.push(paint(torus(2.2, 0.22, 6, 20).rotateX(Math.PI / 2 - 0.3).translate(0, 11.4, -6.2), GOLD));
    return merge(P);
  },
  // a champagne coupe (12x), and its liquid
  coupe() { return merge([paint(lathe([[0.04, 1.62], [0.95, 1.62], [1.0, 1.66], [0.18, 1.18], [0.07, 1.1], [0.07, 0.12], [0.5, 0.05], [0.55, 0.0], [0, 0]], 16), rgb(0xe8eef4))]); },
  liquid() { return cyl(0.86, 0.86, 0.05, 14, 0, 1.56, 0); },
  clothTable() { return merge([shade(lathe([[0, 9.2], [7.6, 9.2], [7.9, 9.0], [8.0, 0.2], [8.2, 0.0], [0, 0]], 40), rgb(0xf6f2ea), 0.75, 1.05)]); },
  // the garden thermometer: an enamel plaque in a brass frame, a sun at the top, the bulb
  thermo() {
    const P = [];
    P.push(shade(rbox(9, 46, 1.4, 2.5, 0, 25, -0.8), rgb(0xf6f2ea), 0.85, 1.0));
    P.push(paint(rbox(10.2, 47.2, 1.0, 3, 0, 25, -1.4), rgb(0xc8a040)));
    P.push(paint(cyl(1.7, 1.7, 36, 16, 0, 27, 0.6), rgb(0xe8eef2)));
    P.push(paint(sph(3.6, 1, 1, 1, 0, 6.4, 0.6, 18, 14), rgb(0xd82a1a)));
    for (let k = 0; k < 13; k++) P.push(paint(box(k % 2 ? 2.2 : 3.6, 0.32, 0.3, -3.0, 11 + k * 2.75, 0.05), rgb(0x2a2a30)));
    for (let k = 0; k < 6; k++) P.push(paint(box(1.6, 0.6, 0.3, 3.0, 12.4 + k * 5.5, 0.05), k > 3 ? rgb(0xd82a1a) : rgb(0x2a2a30)));
    P.push(paint(cyl(3.0, 3.0, 0.8, 24, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 45, 0.2), rgb(0xe8c050)));
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; P.push(paint(new THREE.ConeGeometry(0.7, 2.4, 4).rotateZ(-a).translate(Math.sin(a) * 4.5, 45 + Math.cos(a) * 4.5, 0.2), rgb(0xe8c050))); }
    P.push(paint(box(1.2, 8, 1.2, 0, -3.5, -0.8), rgb(0x3a3a3a)));
    return merge(P);
  },
  mercury() { return cyl(1.0, 1.0, 1, 12, 0, 0.5, 0); },
  // a length of clipped hedge (along z), its top a little lumpy
  hedge() { const R = seeded(31), P = [shade(box(5, 12, 13, 0, 6, 0), rgb(0x1e4a24), 0.7, 1.05)]; for (let k = 0; k < 10; k++) P.push(shade(sph(1.4 + R(), 1, 0.6, 1, (R() - 0.5) * 3.6, 12, (R() - 0.5) * 11.6, 8, 6), rgb(0x22522a), 0.9, 1.1)); return merge(P); },
  // a dove: body and head (the wings are their own, they beat)
  dove() { return merge([paint(sph(0.5, 0.75, 0.7, 1.5, 0, 0, 0, 8, 6), [1.1, 1.1, 1.08]), paint(sph(0.3, 1, 1, 1.1, 0, 0.3, 0.75, 8, 6), [1.1, 1.1, 1.08]), paint(new THREE.ConeGeometry(0.1, 0.3, 5).rotateX(Math.PI / 2).translate(0, 0.28, 1.12), rgb(0xd88a5a)), paint(box(0.7, 0.1, 0.7, 0, 0, -0.9), [1.0, 1.0, 1.0])]); },
  wing() { const s = new THREE.Shape(); s.moveTo(0, -0.35); s.quadraticCurveTo(1.0, -0.5, 1.9, -0.05); s.quadraticCurveTo(1.0, 0.45, 0, 0.4); s.closePath(); const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return paint(g, [1.05, 1.05, 1.02]); },
  // the gilt frame round the portrait, its corners carved (the picture itself is its own)
  frame(w = 22, h = 16.5) {
    const P = [], g = GOLD;
    for (const [fw, fh, x, y] of [[w + 3, 1.6, 0, h / 2 + 0.8], [w + 3, 1.6, 0, -h / 2 - 0.8], [1.6, h, -w / 2 - 0.8, 0], [1.6, h, w / 2 + 0.8, 0]]) P.push(shade(box(fw, fh, 1.2, x, y, 0), g, 0.8, 1.1));
    for (const [x, y] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) P.push(paint(sph(1.5, 1, 1, 0.6, x * (w / 2 + 0.8), y * (h / 2 + 0.8), 0.4, 12, 8), GOLD2));
    P.push(paint(sph(2.2, 1.4, 1, 0.6, 0, h / 2 + 1.6, 0.4, 14, 8), GOLD2));
    P.push(paint(box(w + 0.4, h + 0.4, 0.4, 0, 0, -0.5), rgb(0x2a1a10)));
    // an easel's legs behind it
    for (const [x, rz, rx] of [[-7, 0.08, 0.06], [7, -0.08, 0.06], [0, 0, -0.32]]) { const l = box(0.7, 30, 0.7, 0, 0, 0); l.rotateZ(rz); l.rotateX(rx); l.translate(x, -h / 2 + 6, rx < 0 ? -4.4 : -0.9); P.push(paint(l, rgb(0x5a3a1e))); }
    return merge(P);
  },
  // a gold rotary telephone: the body, its dial, the handset (its own, so it can jump)
  phone() {
    const P = [];
    P.push(shade(rbox(16, 7, 13, 2.5, 0, 3.5, 0), GOLD, 0.75, 1.05));
    const top = rbox(12, 3, 9, 1.4); top.rotateX(-0.35); top.translate(0, 7.4, 1.4); P.push(shade(top, GOLD, 0.8, 1.1));
    const dial = cyl(4.4, 4.4, 0.6, 32).rotateX(Math.PI / 2 - 0.35).translate(0, 7.6, 5.6); P.push(paint(dial, rgb(0xf4ecd8)));
    for (let k = 0; k < 10; k++) { const a = -0.4 - k / 10 * TAU * 0.82; P.push(paint(cyl(0.55, 0.55, 0.8, 12).rotateX(Math.PI / 2 - 0.35).translate(Math.cos(a) * 3.0, 7.6 + Math.sin(a) * 3.0 * Math.cos(0.35), 5.6 + Math.sin(a) * 3.0 * Math.sin(0.35) + 0.15), rgb(0x2a2420))); }
    P.push(paint(cyl(1.3, 1.3, 0.8, 18).rotateX(Math.PI / 2 - 0.35).translate(0, 7.6, 5.75), GOLD));
    for (const s of [-1, 1]) P.push(paint(rbox(1.6, 2.4, 1.6, 0.5, s * 6.2, 9.4, -1.5), GOLD));
    // its cord, coiling off to the side
    for (let k = 0; k < 14; k++) P.push(paint(torus(0.55, 0.16, 5, 10).rotateY(Math.PI / 2).translate(-8.6 - k * 0.42, 2.0 + Math.sin(k * 0.5) * 0.3, -1.5), GOLD2));
    return merge(P);
  },
  handset() {
    const P = [];
    P.push(shade(rbox(17, 2.2, 2.6, 1.0, 0, 0, 0), GOLD, 0.85, 1.1));
    for (const s of [-1, 1]) P.push(shade(rbox(3.6, 3.4, 4.0, 1.2, s * 7.6, -1.4, 0), GOLD, 0.85, 1.1));
    return merge(P);
  },
  // the grin: two glossy lips (the upper with its bow) and a row of teeth between
  lipUpper() {
    const s = new THREE.Shape(); s.moveTo(-9, 0); s.bezierCurveTo(-6, 2.6, -2.4, 3.6, 0, 2.4); s.bezierCurveTo(2.4, 3.6, 6, 2.6, 9, 0); s.bezierCurveTo(4, 0.9, -4, 0.9, -9, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: true, bevelThickness: 1.0, bevelSize: 0.7, bevelSegments: 4, curveSegments: 18 }); g.translate(0, 0, -0.8); return shade(g, rgb(0xd0102a), 0.8, 1.1);
  },
  lipLower() {
    const s = new THREE.Shape(); s.moveTo(-9, 0); s.bezierCurveTo(-4, -0.9, 4, -0.9, 9, 0); s.bezierCurveTo(6, -4.2, -6, -4.2, -9, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.8, bevelEnabled: true, bevelThickness: 1.1, bevelSize: 0.8, bevelSegments: 4, curveSegments: 18 }); g.translate(0, 0, -0.9); return shade(g, rgb(0xd0102a), 0.75, 1.05);
  },
  teeth() { const P = []; for (let k = 0; k < 8; k++) { const x = -5.25 + k * 1.5, w = 1.36 - Math.abs(x) * 0.03; P.push(paint(rbox(w, 1.8, 1.4, 0.3, x, 0.2, 0.2 - Math.abs(x) * 0.08), [1.25, 1.25, 1.2])); } return merge(P); },
  // her, standing, a hand on her hip; on a black plinth (front +z)
  lady() {
    const P = [], g = GOLD;
    P.push(shade(box(7, 6, 7, 0, 3, 0), rgb(0x1a1a1e), 0.7, 1.0)); P.push(paint(box(7.8, 0.6, 7.8, 0, 6.3, 0), rgb(0x2a2a2e)));
    const S = 6.2, B = 6.6;
    const lg = (x0, x1, z1) => paint(tube(V(x0 * S, B, 0), V(x1 * S, B + 0.85 * S, z1 * S), 0.07 * S, 0.11 * S, 8), g);
    P.push(lg(0.07, 0.11, 0.0)); P.push(lg(-0.12, -0.09, 0.05));
    P.push(shade(lathe([[0.0, 0.7], [0.3, 0.7], [0.2, 1.02], [0.15, 1.12], [0.19, 1.38], [0.12, 1.47], [0, 1.47]], 16).scale(S, S, S).translate(0, B, 0), g, 0.8, 1.1));
    P.push(paint(sph(0.105 * S, 1, 1.15, 1, 0, B + 1.6 * S, 0.01 * S, 12, 10), g));
    P.push(paint(sph(0.08 * S, 1, 1, 1, 0, B + 1.74 * S, -0.1 * S, 10, 8), g));
    P.push(paint(tube(V(0, B + 1.72 * S, -0.12 * S), V(0, B + 1.35 * S, -0.22 * S), 0.05 * S, 0.02 * S, 6), g));
    // the hand on her hip
    P.push(paint(tube(V(0.17 * S, B + 1.42 * S, 0), V(0.34 * S, B + 1.2 * S, -0.02 * S), 0.04 * S, 0.035 * S, 6), g));
    P.push(paint(tube(V(0.34 * S, B + 1.2 * S, -0.02 * S), V(0.17 * S, B + 1.03 * S, 0.02 * S), 0.035 * S, 0.03 * S, 6), g));
    // the other arm loose at her side
    P.push(paint(tube(V(-0.17 * S, B + 1.42 * S, 0), V(-0.22 * S, B + 1.1 * S, 0.04 * S), 0.04 * S, 0.035 * S, 6), g));
    P.push(paint(tube(V(-0.22 * S, B + 1.1 * S, 0.04 * S), V(-0.21 * S, B + 0.82 * S, 0.06 * S), 0.035 * S, 0.03 * S, 6), g));
    return merge(P);
  },
  // a floor of the house that changes its plan: a long box, glass along both long sides
  floorA() { return merge([shade(box(28, 5.4, 14, 0, 2.7, 0), rgb(0xf2efe8), 0.85, 1.0), paint(box(28.2, 0.5, 14.2, 0, 5.15, 0), rgb(0xdedad2))]); },
  floorB() { return merge([shade(box(18, 5.4, 22, 0, 2.7, 0), rgb(0xe8e2d6), 0.85, 1.0), paint(box(18.2, 0.5, 22.2, 0, 5.15, 0), rgb(0xd8d0c4))]); },
  winA() { return merge([box(26, 3.2, 14.3, 0, 2.5, 0)]); },
  winB() { return merge([box(18.3, 3.2, 20, 0, 2.5, 0)]); },
  // a lightning bolt: a jagged line from the cloud down to y 0, as a flat ribbon
  bolt(seed) {
    const R = seeded(seed), P = []; let x = 0, y = 120;
    while (y > 0) {
      const ny = Math.max(0, y - 6 - R() * 10), nx = x + (R() - 0.5) * 12;
      P.push(tube(V(x, y, 0), V(nx, ny, 0), 0.45, 0.45, 4));
      if (R() < 0.3 && y > 30) { let bx = nx, by = ny; for (let k = 0; k < 3; k++) { const ex = bx + (R() - 0.3) * 10 * (nx > x ? 1 : -1), ey = by - 4 - R() * 6; P.push(tube(V(bx, by, 0), V(ex, ey, 0), 0.25, 0.2, 3)); bx = ex; by = ey; } }
      x = nx; y = ny;
    }
    return merge(P);
  },
};

// ---------- materials ----------
const vc = (key, o) => (M) => M[key] || (M[key] = vcMat(o));
const goldM = vc('ywnGoldM', { rough: 0.22, metal: 0.85, k: 0.9 });
const satinM = vc('ywnSatinM', { rough: 0.3, metal: 0.15, k: 0.7 });
const stoneM = vc('ywnStoneM', { rough: 0.8, k: 1.0 });
const ironM = vc('ywnIronM', { rough: 0.5, metal: 0.3, k: 1.0 });
const glassyM = vc('ywnGlassyM', { rough: 0.08, metal: 0.3, k: 1.1 });
const leafM = vc('ywnTreeM', { rough: 0.95, k: 0.5, flat: true });
const houseM = vc('ywnHouseM', { rough: 0.6, k: 1.2 });
const sparkM = (M) => M.ywnSparkM || (M.ywnSparkM = new THREE.MeshBasicMaterial({ vertexColors: true }));
const winM = (M) => M.ywnWinM || (M.ywnWinM = (() => { const m = vcMat({ rough: 0.3, k: 0.2, glow: true }); return m; })());
const picM = (M, key, map, k = 0.75) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.6, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide }));
const decalM = (M, key, map, color) => M[key] || (M[key] = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, color: color || 0xffffff, side: THREE.DoubleSide }));
// the ink that writes itself: its uv.x shown up to uReveal
const inkM = (M) => M.ywnInkM || (M.ywnInkM = (() => {
  const m = new THREE.MeshBasicMaterial({ map: tex().ink, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  m.userData.reveal = { value: 0 };
  m.onBeforeCompile = (sh) => { sh.uniforms.uReveal = m.userData.reveal; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vRu;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRu = uv;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uReveal; varying vec2 vRu;').replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.a *= smoothstep(uReveal, uReveal - 0.03, vRu.x);'); };
  m.customProgramCacheKey = () => 'ywnInk';
  return m;
})());
const boltM = (M) => M.ywnBoltM || (M.ywnBoltM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.3, 3.0) }));

const BW = 30, BH = 30;    // the grand gate
extend({
  layers: {
    ywnPiers: (M) => [SG.piers(BW, BH), stoneM(M), 12, {}],
    ywnLeaf: (M) => [SG.leaf(BW - 2.5), ironM(M), 24, {}],
    ywnWatch: (M) => [SG.watch(), goldM(M), 3, {}],
    ywnBracelet: (M) => [SG.bracelet(), goldM(M), 3, {}],
    ywnDial: (M) => [(() => { const g = new THREE.CircleGeometry(9.1, 48); g.translate(0, 0, 1.86); return g; })(), picM(M, 'ywnDialM', tex().dial, 0.65), 3, {}],
    ywnHandH: (M) => [SG.hand(7.5, 1.0), goldM(M), 6, {}],
    ywnHandS: (M) => [SG.hand(9.2, 0.35), goldM(M), 3, {}],
    ywnStones: (M) => [SG.stones(), sparkM(M), 3, {}],
    ywnFist: (M) => [SG.fist(), satinM(M), 3, {}],
    ywnCuff: (M) => [SG.cuff(), glassyM(M), 3, {}],
    ywnTable: (M) => [SG.table(), stoneM(M), 3, {}],
    ywnPaper: (M) => [(() => { const a = new THREE.PlaneGeometry(18, 18); a.rotateX(-0.2); a.translate(0, 9, 1.0); return a; })(), picM(M, 'ywnPaperM', tex().paper, 0.55), 3, {}],
    ywnPaperB: (M) => [(() => { const a = new THREE.PlaneGeometry(18, 18); a.rotateX(0.2); a.translate(0, 9, -1.0); return a; })(), picM(M, 'ywnPaperM', tex().paper, 0.55), 3, {}],
    ywnInk: (M) => [(() => { const a = new THREE.PlaneGeometry(17, 8.5); a.rotateX(-0.2); a.translate(0, 9.6, 1.12); return a; })(), inkM(M), 3, {}],
    ywnPen: (M) => [SG.pen(), goldM(M), 3, {}],
    ywnPrint: (M) => [(() => { const g = new THREE.PlaneGeometry(0.7, 1.4); g.rotateX(-Math.PI / 2); return g; })(), M.ywnPrintM || (M.ywnPrintM = new THREE.MeshBasicMaterial({ map: tex().print, color: new THREE.Color(2.4, 1.7, 0.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })), 40, {}],
    ywnHeel: (M) => [SG.stiletto(), goldM(M), 6, {}],
    ywnClothTable: (M) => [SG.clothTable(), vc('ywnClothTM', { rough: 0.85, k: 1.0 })(M), 3, {}],
    ywnCoupe: (M) => [SG.coupe(), glassyM(M), 80, {}],
    ywnBubbly: (M) => [SG.liquid(), M.ywnBubblyM || (M.ywnBubblyM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.85, 0.35) })), 80, {}],
    ywnThermo: (M) => [SG.thermo(), vc('ywnEnamelM', { rough: 0.4, metal: 0.1, k: 1.0 })(M), 3, {}],
    ywnMercury: (M) => [SG.mercury(), M.ywnMercM || (M.ywnMercM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.12, 0.08) })), 3, {}],
    ywnHedge: (M) => [SG.hedge(), vc('ywnYewM', { rough: 0.9, k: 0.55, flat: true, glow: true })(M), 60, { aGlow: 1 }],
    ywnDove: (M) => [SG.dove(), vc('ywnDoveM', { rough: 0.7, k: 0.8 })(M), 60, {}],
    ywnWing: (M) => [SG.wing(), M.ywnWingM || (M.ywnWingM = vcMat({ rough: 0.7, k: 1.4, side: THREE.DoubleSide })), 120, {}],
    ywnFrame: (M) => [SG.frame(), goldM(M), 4, {}],
    ywnCanvas: (M) => [(() => { const g = new THREE.PlaneGeometry(22, 16.5); g.translate(0, 0, -0.25); return g; })(), picM(M, 'ywnPortraitM', tex().portrait, 0.7), 4, {}],
    ywnKiss: (M) => [new THREE.PlaneGeometry(3.6, 2.7), decalM(M, 'ywnKissM', tex().kiss, new THREE.Color(1.2, 1.0, 1.0)), 8, {}],
    ywnPhone: (M) => [SG.phone(), goldM(M), 3, {}],
    ywnHandset: (M) => [SG.handset(), goldM(M), 3, {}],
    ywnLipU: (M) => [SG.lipUpper(), vc('ywnLipM', { rough: 0.15, metal: 0.2, k: 0.8 })(M), 3, {}],
    ywnLipL: (M) => [SG.lipLower(), vc('ywnLipM', { rough: 0.15, metal: 0.2, k: 0.8 })(M), 3, {}],
    ywnTeeth: (M) => [SG.teeth(), M.ywnTeethM || (M.ywnTeethM = new THREE.MeshBasicMaterial({ vertexColors: true })), 6, {}],
    ywnLady: (M) => [SG.lady(), goldM(M), 3, {}],
    ywnFloorA: (M) => [SG.floorA(), houseM(M), 8, {}],
    ywnFloorB: (M) => [SG.floorB(), houseM(M), 8, {}],
    ywnWinA: (M) => [paint(SG.winA(), [0.9, 0.62, 0.36]), winM(M), 8, { aGlow: 1 }],
    ywnWinB: (M) => [paint(SG.winB(), [0.9, 0.62, 0.36]), winM(M), 8, { aGlow: 1 }],
    ywnBolt0: (M) => [SG.bolt(3), boltM(M), 4, {}],
    ywnBolt1: (M) => [SG.bolt(17), boltM(M), 4, {}],
    ywnBolt2: (M) => [SG.bolt(41), boltM(M), 4, {}],
  },
  parts: {
    // the grand gate across the drive: its leaves open on their moment (or shut on it)
    ywnGateBig(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnPiers; void L.ywnLeaf; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1, sy = it.sy ?? 1;
      m.compose(p, q, S._s.set(s, sy, s)); L.ywnPiers.add(m);
      const open = it.shut !== undefined ? 1 - spring(T - it.shut, 7, 11) : spring(T - (it.open ?? 1e9), 5, 7);
      for (const sd of [-1, 1]) {
        const hinge = local(p, yaw, sd * (BW - 2.5) * s, 0, 0, S._o);
        const a = yaw + (sd > 0 ? Math.PI : 0) + sd * open * 1.5;
        m.compose(hinge, quat(S, '_ywnQg', a), S._s.set(s, sy, s)); L.ywnLeaf.add(m);
      }
      for (const sd of [-1, 1]) for (const dz of [-2.8, 2.8]) { const w = local(p, yaw, sd * BW * s, (BH - 3) * sy, dz, S._o); glowAt(S, w.x, w.y, w.z, 3.2, [1, 0.82, 0.5], 0.9); }
      if (it.open !== undefined && T > it.open && T < it.open + 0.6) { const w = local(p, yaw, 0, (BH + 6) * sy, 0, S._o); glowAt(S, w.x, w.y, w.z, 14 * s, [1, 0.9, 0.7], 0.9 * (1 - (T - it.open) / 0.6)); }
    },
    // all the money on your wrist: the watch stands on its bracelet, the second hand ticks on the beat
    ywnWatch(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['ywnWatch', 'ywnBracelet', 'ywnDial', 'ywnHandH', 'ywnHandS', 'ywnStones']) void L[k]; if (!S.track) return;
      const s = it.s ?? 1, m = S._m, bi = beatInfo(S), fq = faceRoad(S, it, 0.5);
      const fy = S._ywnFy;
      const c = local(p, fy, 0, 24 * s, 0, S._ywnC1 || (S._ywnC1 = new THREE.Vector3()));
      m.compose(c, fq, S._s.set(s, s, s)); L.ywnWatch.add(m); L.ywnDial.add(m); L.ywnStones.add(m); L.ywnBracelet.add(m);
      // the hands: ten past ten, and the second hand a tick a beat
      const hz = local(c, fy, 0, 0, 2.2 * s, S._ywnHz || (S._ywnHz = new THREE.Vector3()));
      m.compose(hz, quat(S, '_ywnQh1', fy, 0, -(-1.05)), S._s.set(s, s, s)); L.ywnHandH.add(m);
      m.compose(hz, quat(S, '_ywnQh2', fy, 0, -1.05), S._s.set(s, s * 1.4, s)); L.ywnHandH.add(m);
      const tick = (bi.i + Math.min(1, bi.f * 8)) * (TAU / 60);
      m.compose(hz, quat(S, '_ywnQh3', fy, 0, -tick), S._s.set(s, s, s)); L.ywnHandS.add(m);
      // the stones catch the sun on the beat, round the bezel
      for (let k = 0; k < 4; k++) { const a = (bi.i * 5 + k * 6) % 24 / 24 * TAU; const w = local(c, fy, -Math.cos(a) * 10 * s, Math.sin(a) * 10 * s, 3 * s, S._ywnSt || (S._ywnSt = new THREE.Vector3())); glowAt(S, w.x, w.y, w.z, (2 + 3 * bi.pulse) * s, [1, 0.97, 0.88], 0.9 + 1.4 * bi.pulse); }
      poolAt(S, p.x, p.y + 0.12, p.z, 40 * s, [1, 0.85, 0.5], 0.35);
    },
    // a clenched red fist comes up out of the lawn on "clenched", frost on its wrist
    ywnFist(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnFist; void L.ywnCuff; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      const up = spring(T - it.rise, 7, 9), clench = T > it.fist ? 1 + 0.07 * Math.exp(-(T - it.fist) * 5) : 1;
      if (up <= 0.001) return;
      const fq = faceRoad(S, it, 0.4);
      const w = S._ywnFw || (S._ywnFw = new THREE.Vector3()); w.copy(p); w.y = p.y - (1 - up) * 26 * s;
      m.compose(w, fq, S._s.set(s * clench, s, s * clench)); L.ywnFist.add(m); L.ywnCuff.add(m);
      // frost: the diamonds catch, and on "fist" a breath of white
      const bi = beatInfo(S);
      for (let k = 0; k < 5; k++) { const a = k * 1.3 + bi.i * 0.7; const g = local(w, yaw, Math.cos(a) * 3.6 * s, 13.6 * s, Math.sin(a) * 3.6 * s, S._o); glowAt(S, g.x, g.y, g.z, (1.5 + 2 * bi.pulse) * s, [0.9, 0.97, 1], 0.8 + bi.pulse); }
      if (T > it.fist && T < it.fist + 1.2) { const f = T - it.fist; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; const g = local(w, yaw, Math.cos(a) * (4 + 14 * f) * s, (17 + Math.sin(a) * (3 + 10 * f)) * s, 3 * s, S._o); glowAt(S, g.x, g.y, g.z, 2.4 * s, [0.85, 0.95, 1], 1.2 * (1 - f / 1.2)); } }
    },
    // the napkin on its table: my digits writing themselves on as the line goes
    ywnNapkin(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['ywnTable', 'ywnPaper', 'ywnPaperB', 'ywnInk', 'ywnPen']) void L[k]; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, fq = faceRoad(S, it, 0.45);
      m.compose(p, fq, S._s.set(s, s, s)); L.ywnTable.add(m);
      const fy = S._ywnFy;
      const top = local(p, fy, 0, 12.35 * s, 0, S._ywnC1 || (S._ywnC1 = new THREE.Vector3()));
      m.compose(top, fq, S._s.set(s, s, s)); L.ywnPaper.add(m); L.ywnPaperB.add(m); L.ywnInk.add(m);
      const pw = local(top, fy, 5 * s, 0.6 * s, 4.5 * s, S._ywnPw || (S._ywnPw = new THREE.Vector3())); m.compose(pw, quat(S, '_ywnQp', fy + 0.4), S._s.set(s, s, s)); L.ywnPen.add(m);
      const mat = L.ywnInk.mesh.material; if (mat.userData.reveal) mat.userData.reveal.value = 0.1 + 0.95 * smooth(it.w0, it.w1, T);
      const g = local(top, fy, 0, 9 * s, 6 * s, S._ywnPw); glowAt(S, g.x, g.y, g.z, 26 * s, [1, 0.95, 0.85], 0.16); poolAt(S, p.x, p.y + 0.12, p.z, 30 * s, [1, 0.9, 0.7], 0.3);
    },
    // her steps in gold on the road ahead, one on each eighth, walking away from you
    ywnPrint(S, it) {
      const L = S.layers; void L.ywnPrint; if (!S.track) return;
      const T = S.tNow ?? 0; if (T < it.on) return;
      const f = T - it.on, k = 1 + 0.6 * Math.exp(-f * 12), m = S._m;
      const w = S.track.at(it.t, it.x, 0.08, S._o), yaw = S.course.sample(it.t).yaw;
      m.compose(w, quat(S, '_ywnQpr', yaw + (it.x > 0 ? -0.1 : 0.1)), S._s.set(3.2 * k, 1, 3.2 * k)); L.ywnPrint.add(m);
      if (f < 0.4) glowAt(S, w.x, w.y + 0.4, w.z, 4, [1, 0.8, 0.4], 1.2 * (1 - f / 0.4));
    },
    // the gold heels she stepped out of: one standing, one tipped over
    ywnHeels(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnHeel; if (!S.track) return;
      const s = it.s ?? 1, m = S._m, bi = beatInfo(S);
      const fy = yaw;
      m.compose(local(p, fy, -5 * s, 0, 0, S._o), quat(S, '_ywnQh', fy + 0.4), S._s.set(s, s, s)); L.ywnHeel.add(m);
      m.compose(local(p, fy, 7 * s, 2.0 * s, 4 * s, S._o), quat(S, '_ywnQh4', fy - 0.9, 0, 1.25), S._s.set(s, s, s)); L.ywnHeel.add(m);
      for (let k = 0; k < 3; k++) { const g = local(p, fy, (-5 + k * 5) * s, (4 + k * 3) * s, 2 * s, S._o); glowAt(S, g.x, g.y, g.z, (2 + 2 * bi.pulse) * s, [1, 0.92, 0.7], 0.6 + 1.2 * bi.pulse * ((bi.i + k) % 3 === 0 ? 1 : 0.2)); }
      poolAt(S, p.x, p.y + 0.12, p.z, 30 * s, [1, 0.85, 0.5], 0.4);
    },
    // the champagne tower: on "messy" it goes over, coupes everywhere, the champagne in the air
    ywnTower(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnClothTable; void L.ywnCoupe; void L.ywnBubbly; void L.ywnFizz; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, f = T - it.topple;
      m.compose(p, q, S._s.set(s, s, s)); L.ywnClothTable.add(m);
      const cs = it.cs ?? 2.4, R = seeded(77);
      let n = 0;
      for (let lv = 5; lv >= 1; lv--) {
        const y0 = 9.2 + (5 - lv) * 1.62 * cs;
        for (let i = 0; i < lv; i++) for (let j = 0; j < lv; j++) {
          const lx = (i - (lv - 1) / 2) * 1.9 * cs, lz = (j - (lv - 1) / 2) * 1.9 * cs; n++;
          const r1 = R(), r2 = R(), r3 = R();
          let x = lx, y = y0, z = lz, rx = 0, rz = 0, ry = 0;
          if (f > 0) {
            // pushed over toward the road: out, up a little, down onto the lawn, rolling to a stop
            const delay = (5 - lv) * 0.05 + r3 * 0.08, g = Math.max(0, f - delay);
            const vx = (it.x > 0 ? -1 : 1) * (6 + 10 * r1) * (1 + (5 - lv) * 0.15), vz = (r2 - 0.5) * 12, vy = 4 + 6 * r3;
            const tl = (vy + Math.sqrt(vy * vy + 2 * 22 * y0 * s)) / 22, gg = Math.min(g, tl);
            x = lx + vx * gg / s; z = lz + vz * gg / s; y = y0 + (vy * gg - 11 * gg * gg) / s;
            if (g > tl) { const roll = Math.min(1.2, g - tl); x += vx * 0.25 * roll / s; y = 0.6; rz = 1.5; ry = r1 * 6; }
            else { rx = gg * (3 + 6 * r1); rz = gg * (4 + 5 * r2); }
          }
          const w = local(p, yaw, x * s, y * s, z * s, S._o);
          m.compose(w, quat(S, '_ywnQcp', yaw + ry, rx, rz), S._s.set(cs * s, cs * s, cs * s)); L.ywnCoupe.add(m);
          if (f <= 0) L.ywnBubbly.add(m);
        }
      }
      if (f > 0 && f < 1.6) { for (let k = 0; k < 26; k++) { const a = k * 2.39, u = (f * 1.4 + k / 26) % 1, w = local(p, yaw, ((it.x > 0 ? -1 : 1) * (4 + 16 * u) + Math.cos(a) * 3) * s, (20 + 10 * Math.sin(Math.PI * u) - 18 * u * u) * s, Math.sin(a) * 6 * s, S._o); m.compose(w, quat(S, '_ywnQz', yaw, a, a), S._s.set(2 * s, 3 * s, 2 * s)); L.ywnFizz.add(m); } }
      glowAt(S, p.x, p.y + 22 * s, p.z, 16 * s, [1, 0.88, 0.6], 0.08);
    },
    // the thermometer: the red goes up on "heat wave", out of the top on "grin"
    ywnThermo(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnThermo; void L.ywnMercury; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, fq = faceRoad(S, it, 0.5);
      m.compose(p, fq, S._s.set(s, s, s)); L.ywnThermo.add(m);
      const fy = S._ywnFy;
      const lvl = it.fall ? 0.95 - 0.7 * smooth(it.rise, it.rise + 2, T) : 0.3 + 0.7 * smooth(it.rise, it.rise + 1.1, T);
      const b = local(p, fy, 0, 8.8 * s, 0.6 * s, S._o);
      m.makeRotationFromQuaternion(fq); m.scale(S._s.set(1.15 * s, 35 * lvl * s, 1.15 * s)); m.setPosition(b.x, b.y, b.z); L.ywnMercury.add(m);
      const top = T > it.rise + 0.9 && !it.fall ? Math.exp(-(T - it.rise - 0.9) * 2) : 0;
      const g = local(p, fy, 0, 6.4 * s, 3 * s, S._o); glowAt(S, g.x, g.y, g.z, (10 + 8 * top) * s, [1, 0.25, 0.12], 0.7 + 1.2 * top);
      if (top > 0.02) { const g2 = local(p, fy, 0, 45 * s, 2 * s, S._o); glowAt(S, g2.x, g2.y, g2.z, 30 * s, [1, 0.4, 0.15], 1.4 * top); }
    },
    // a hedge that comes up out of the lawn on its beat
    ywnHedgeUp(S, it, p, q) {
      const L = S.layers; void L.ywnHedge; if (!S.track) return;
      const T = S.tNow ?? 0, up = it.up === null ? 1 : spring(T - it.up, 8, 12);
      if (up <= 0.01) return;
      const m = S._m; m.compose(p, q, S._s.set(1, Math.max(0.02, up), 1)); L.ywnHedge.add(m, { aGlow: 0 });
    },
    // lightning: a bolt down to the lawn on its moment, flickering, and its light round where it hits
    ywnBolt(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnBolt0; void L.ywnBolt1; void L.ywnBolt2; if (!S.track) return;
      const T = S.tNow ?? 0, f = T - it.at;
      if (f < 0 || f > 0.42) return;
      const on = (f < 0.07 || (f > 0.12 && f < 0.2) || (f > 0.27 && f < 0.36)) ? 1 : 0;
      if (!on) return;
      const s = it.s ?? 1, m = S._m;
      m.compose(p, quat(S, '_ywnQbt', S.course.sample(it.t).yaw + Math.PI / 2 + (it.x > 0 ? 0.3 : -0.3)), S._s.set(s, s, s)); L['ywnBolt' + (it.v ?? 0)].add(m);
      glowAt(S, p.x, p.y + 2, p.z, 30 * s, [0.8, 0.88, 1], 2.0); poolAt(S, p.x, p.y + 0.1, p.z, 60 * s, [0.8, 0.88, 1], 1.4);
      glowAt(S, p.x, p.y + 70 * s, p.z, 90 * s, [0.75, 0.82, 1], 0.5);
    },
    // doves for "peace": up out of the hedge in a cloud, wings going
    ywnDoves(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnDove; void L.ywnWing; if (!S.track) return;
      const T = S.tNow ?? 0, f = T - it.at; if (f < -0.2 || f > 6) return;
      const m = S._m, R = seeded(19), n = it.n ?? 22;
      for (let k = 0; k < n; k++) {
        const a = R() * TAU, sp = 5 + R() * 8, rise = 8 + R() * 9, d = Math.max(0, f - R() * 0.3);
        const x = Math.cos(a) * sp * d * 0.8 + (it.x > 0 ? -1 : 1) * d * 6, z = Math.sin(a) * sp * d * 0.6 + d * 10, y = 3 + rise * d - 0.4 * d * d;
        const w = local(p, yaw, x, y, z, S._o);
        const hd = yaw + Math.atan2(x, z + 1e-3) * 0.3 + (it.x > 0 ? 0.9 : -0.9);
        const flap = Math.sin(T * 26 + k) * 0.9;
        m.compose(w, quat(S, '_ywnQd1', hd, -0.4), S._s.set(1.8, 1.8, 1.8)); L.ywnDove.add(m);
        m.compose(w, quat(S, '_ywnQd2', hd, -0.4, flap), S._s.set(1.8, 1.8, 1.8)); L.ywnWing.add(m);
        m.compose(w, quat(S, '_ywnQd3', hd + Math.PI, 0.4, -flap), S._s.set(1.8, 1.8, 1.8)); L.ywnWing.add(m);
      }
    },
    // the portrait of him and his brother; a kiss lands on the brother
    ywnPortrait(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnFrame; void L.ywnCanvas; void L.ywnKiss; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, fq = faceRoad(S, it, 0.5);
      const fy = S._ywnFy;
      const c = local(p, fy, 0, 20 * s, 0, S._ywnC1 || (S._ywnC1 = new THREE.Vector3()));
      m.compose(c, fq, S._s.set(s, s, s)); L.ywnFrame.add(m); L.ywnCanvas.add(m);
      for (const [k0, dx, dy] of it.kisses) {
        const f = T - k0; if (f < 0) continue;
        const k = spring(f, 10, 18) * s, w = local(c, fy, dx * s, dy * s, 0.3 * s, S._ywnKw || (S._ywnKw = new THREE.Vector3()));
        m.compose(w, fq, S._s.set(k, k, k)); L.ywnKiss.add(m);
        if (f < 0.5) glowAt(S, w.x, w.y, w.z, 8 * s, [1, 0.3, 0.4], 1.2 * (1 - f / 0.5));
      }
      glowAt(S, c.x, c.y + 12 * s, c.z, 30 * s, [1, 0.9, 0.7], 0.2); poolAt(S, p.x, p.y + 0.12, p.z, 26 * s, [1, 0.85, 0.6], 0.3);
    },
    // the gold phone, ringing: the handset jumping in its cradle
    ywnPhone(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnPhone; void L.ywnHandset; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, fq = faceRoad(S, it, 0.55);
      const fy = S._ywnFy;
      const ring = it.rings.some(([a, b]) => T > a && T < b);
      const j = ring ? Math.abs(Math.sin(T * 38)) : 0;
      m.compose(p, fq, S._s.set(s, s, s)); L.ywnPhone.add(m);
      const h = local(p, fy, 0, (10.8 + j * 2.2) * s, -1.5 * s, S._o);
      m.compose(h, quat(S, '_ywnQhs', fy, 0, ring ? Math.sin(T * 31) * 0.12 : 0), S._s.set(s, s, s)); L.ywnHandset.add(m);
      if (ring) { const g = local(p, fy, 0, 9 * s, 0, S._ywnPh || (S._ywnPh = new THREE.Vector3())); glowAt(S, g.x, g.y, g.z, (14 + 8 * j) * s, [1, 0.88, 0.55], 0.6 + 0.6 * j); }
      poolAt(S, p.x, p.y + 0.12, p.z, 26 * s, [1, 0.85, 0.5], 0.35);
    },
    // the grin: red lips parting on "teeth", wider on the beat
    ywnLips(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnLipU; void L.ywnLipL; void L.ywnTeeth; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, fq = faceRoad(S, it, 0.45), bi = beatInfo(S);
      const fy = S._ywnFy;
      const open = 0.3 + 1.6 * spring(T - it.open, 8, 12) + 0.35 * bi.pulse * (T > it.open ? 1 : 0);
      const c = local(p, fy, 0, (it.h0 ?? 14) * s, 0, S._ywnC1 || (S._ywnC1 = new THREE.Vector3()));
      const u = local(c, fy, 0, open * s, 0, S._ywnLu || (S._ywnLu = new THREE.Vector3()));
      m.compose(u, fq, S._s.set(s, s, s)); L.ywnLipU.add(m);
      const d = local(c, fy, 0, -open * s, 0, S._ywnLu);
      m.compose(d, fq, S._s.set(s, s, s)); L.ywnLipL.add(m);
      m.compose(c, fq, S._s.set(s, s * Math.min(1, 0.3 + open * 0.5), s)); L.ywnTeeth.add(m);
      glowAt(S, c.x, c.y, c.z, 26 * s, [1, 0.3, 0.35], 0.18 + 0.2 * bi.pulse);
    },
    // her in gold on a black plinth, a hand on her hip; on "stand" the light comes on her
    ywnLady(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnLady; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, fq = faceRoad(S, it, 0.35);
      m.compose(p, fq, S._s.set(s, s, s)); L.ywnLady.add(m);
      const lit = 0.3 + 1.0 * smooth(it.on, it.on + 0.15, T);
      glowAt(S, p.x, p.y + 12 * s, p.z, 18 * s, [1, 0.88, 0.6], 0.45 * lit); poolAt(S, p.x, p.y + 0.15, p.z, 26 * s, [1, 0.88, 0.6], 0.9 * lit);
      const fy = S._ywnFy, g = local(p, fy, 0, 30 * s, 8 * s, S._o); glowAt(S, g.x, g.y, g.z, 5 * s, [1, 0.95, 0.85], 1.2 * lit);
    },
    // the house changing its plan: four floors, each turning a quarter on its word
    ywnTurnHouse(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnFloorA; void L.ywnFloorB; void L.ywnWinA; void L.ywnWinB; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      const lamps = (S.ywnK ? S.ywnK.lamps : 0.5);
      for (let k = 0; k < 4; k++) {
        const turns = it.turns.filter((tt, j) => j % 4 === k).reduce((a, tt) => a + spring(T - tt, 9, 13), 0);
        const a = yaw + (k % 2 ? 0.3 : -0.25) + turns * Math.PI / 2;
        const w = local(p, yaw, (k % 2 ? 3 : -2) * s, k * 5.6 * s, (k % 2 ? -2 : 2) * s, S._o);
        const fl = k % 2 ? 'B' : 'A';
        m.compose(w, quat(S, '_ywnQf' + k, a), S._s.set(s, s, s)); L['ywnFloor' + fl].add(m);
        // the lights: lit, and on each turn a new pattern
        const flick = it.turns.some((tt) => T > tt && T < tt + 0.35) ? (hash(k + Math.floor(T * 9)) > 0.4 ? 1.6 : 0.1) : 0.6 + 0.6 * lamps;
        L['ywnWin' + fl].add(m, { aGlow: flick });
      }
      glowAt(S, p.x, p.y + 12 * s, p.z, 50 * s, [1, 0.8, 0.5], 0.15 + 0.2 * lamps);
    },
  },
  kits: {
    // { at: [{ t, x, kind, ... }] }: each set-piece to its part; heights are above the lawn
    ywnSet(S, z) {
      const PARTS_OF = { gate: 'ywnGateBig', watch: 'ywnWatch', fist: 'ywnFist', napkin: 'ywnNapkin', heels: 'ywnHeels', tower: 'ywnTower', thermo: 'ywnThermo', doves: 'ywnDoves', portrait: 'ywnPortrait', phone: 'ywnPhone', lips: 'ywnLips', lady: 'ywnLady', turnHouse: 'ywnTurnHouse' };
      for (const a of z.at) {
        const parts = PARTS_OF[a.kind]; if (!parts) continue;
        const it = { ...a, rot: a.rot ?? (a.kind === 'gate' ? 0 : SIDE(a.x)), s: a.s ?? 1, parts, ahead: a.ahead ?? 40 };
        if (a.kind === 'gate') {
          // tall enough to clear the ribbon here
          const c = S.course, y = c.sample(a.t).y; prepare(c, S.plan); it.sy = Math.max(1, (y - groundAt(c, a.t, 0) + 12) / BH) * (a.s ?? 1);
        }
        S.items.push(it);
      }
    },
    // her steps: one print an eighth apart along the road, each lit on its eighth
    ywnPrints(S, z) {
      const c = S.course;
      let k = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.24) {
        const on = c.timeOfBeat(Math.round(c.beatAt(t - (z.lead ?? 1.4)) * 2) / 2);
        S.items.push({ t, x: (k++ % 2 ? 1 : -1) * 0.9, rot: 0, on: Math.max(on, z.after ?? -1e9), parts: 'ywnPrint', abs: true, ahead: 12 });
      }
    },
    // hedges either side that come up out of the lawn on the beat after "you want privacy"
    ywnHedges(S, z) {
      const c = S.course;
      for (let t = z.from; t < z.to; t += z.every ?? 0.32) for (const side of [-1, 1]) {
        let up = null;
        if (t >= (z.after ?? -1e9)) { const b = Math.round(c.beatAt(t - (z.lead ?? 1.3))); up = Math.max(c.beats[b], z.after); }
        S.items.push({ t, x: side * (z.x ?? 20), rot: 0, up: z.always ? null : up, parts: 'ywnHedgeUp', ahead: 36 });
      }
    },
    // lightning on the given moments: [time, side]; or on every bar of a stretch, out to the sides
    ywnBolts(S, z, R) {
      const c = S.course, list = (z.at || []).slice();
      if (z.bars) for (let i = Math.ceil(c.beatAt(z.bars[0])); c.beats[i] < z.bars[1]; i++) if (c.isBar(i) && R() < (z.p ?? 0.8)) list.push([c.beats[i], R() < 0.5 ? -1 : 1]);
      for (const [at, side, far] of list) S.items.push({ t: at + (z.lead ?? 1.7), x: side * (far ?? (40 + R() * 30)), rot: 0, at, v: Math.floor(R() * 3), s: 0.8 + R() * 0.5, parts: 'ywnBolt', ahead: 4 });
    },
  },
});
