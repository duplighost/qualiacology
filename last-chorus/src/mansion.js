// Rent Free. The house he keeps in his head, and she lives in it: in through the front
// door ("honey, I'm home"), a gallery with a vaulted ceiling and a spine along the top of
// it, her portrait where his peace of mind used to hang, and his self-esteem, and Jesus.
// Every room hers. Furniture under dust sheets, the doors that knock, the stairs to check
// under, the bed at 3 a.m., the crawl space and the attic, the blueprint he drew to keep her
// out, mold behind the walls, her fingerprints, the one light he leaves on, the locks he
// never changed. Sweet dreams, landlord. This is home.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room, capQuad, paint, rgb, seeded, box, litTint } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };

// ---------- her portraits: one woman, four sittings ----------
// a stylised oil portrait, head and shoulders, looking straight out at you
function portraitTexture() {
  const W = 512, H = 640, c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2;
  const g = c.getContext('2d');
  const sittings = [
    { bg: ['#3a5a5a', '#0e1a1c'], dress: '#1a0e14', tilt: -0.06, light: 0.0 },
    { bg: ['#6a1a2a', '#1a060a'], dress: '#0e0e16', tilt: 0.08, light: 0.15 },
    { bg: ['#7a6030', '#1e1408'], dress: '#3a0a14', tilt: -0.12, light: -0.1 },
    { bg: ['#2a2a4a', '#08080e'], dress: '#2a2a2e', tilt: 0.04, light: 0.05 },
  ];
  sittings.forEach((s, k) => {
    const ox = (k % 2) * W, oy = Math.floor(k / 2) * H;
    g.save(); g.translate(ox, oy);
    g.beginPath(); g.rect(0, 0, W, H); g.clip();
    const bg = g.createRadialGradient(W * 0.45, H * 0.32, 20, W * 0.5, H * 0.45, H * 0.75);
    bg.addColorStop(0, s.bg[0]); bg.addColorStop(1, s.bg[1]);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.translate(W / 2, H * 0.44); g.rotate(s.tilt);
    // the hair behind, long and dark, falling past the shoulders
    g.fillStyle = '#1a0c08';
    g.beginPath(); g.moveTo(-120, -90); g.bezierCurveTo(-170, 60, -150, 210, -110, 300); g.lineTo(110, 300); g.bezierCurveTo(150, 210, 170, 60, 120, -90);
    g.bezierCurveTo(100, -190, -100, -190, -120, -90); g.fill();
    // shoulders and the dress
    g.fillStyle = s.dress;
    g.beginPath(); g.moveTo(-230, 360); g.bezierCurveTo(-200, 220, -110, 190, -60, 175); g.lineTo(60, 175); g.bezierCurveTo(110, 190, 200, 220, 230, 360); g.fill();
    // neck and face
    const skin = g.createLinearGradient(-80, -100, 90, 120); skin.addColorStop(0, '#f2cdb0'); skin.addColorStop(1, '#b8846a');
    g.fillStyle = skin;
    g.beginPath(); g.moveTo(-42, 70); g.lineTo(-48, 190); g.quadraticCurveTo(0, 215, 48, 190); g.lineTo(42, 70); g.fill();
    g.beginPath(); g.ellipse(0, -20, 78, 104, 0, 0, Math.PI * 2); g.fill();
    // the hair in front: a heavy fringe swept to one side, waves either side of the face
    g.fillStyle = '#24120c';
    g.beginPath(); g.moveTo(-86, -40); g.bezierCurveTo(-90, -140, 40, -170, 92, -70); g.bezierCurveTo(60, -110, -20, -105, -40, -60); g.bezierCurveTo(-60, -20, -70, 40, -96, 80); g.fill();
    g.beginPath(); g.moveTo(84, -50); g.bezierCurveTo(110, 30, 96, 120, 120, 200); g.bezierCurveTo(140, 110, 130, 0, 84, -50); g.fill();
    g.strokeStyle = 'rgba(120, 70, 40, 0.5)'; g.lineWidth = 3;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-70 + i * 8, -110 + i * 3); g.bezierCurveTo(-20 + i * 10, -140, 40, -130, 80, -60 + i * 6); g.stroke(); }
    // eyes, looking at you; brows; the mouth, red
    for (const sx of [-1, 1]) {
      g.fillStyle = '#f4ece4'; g.beginPath(); g.ellipse(sx * 30, -24, 15, 7, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(sx * 30 + 1, -24, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx * 30 + 3, -26, 1.6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#3a1a10'; g.lineWidth = 3; g.beginPath(); g.ellipse(sx * 30, -24, 16, 8, 0, Math.PI, Math.PI * 2); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.moveTo(sx * 14, -42); g.quadraticCurveTo(sx * 30, -50, sx * 46, -42); g.stroke();
    }
    g.strokeStyle = 'rgba(120, 70, 50, 0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(4, -20); g.quadraticCurveTo(10, 10, 0, 22); g.stroke();
    g.fillStyle = '#a8202e'; g.beginPath(); g.moveTo(-24, 46); g.quadraticCurveTo(0, 36, 24, 46); g.quadraticCurveTo(0, 62, -24, 46); g.fill();
    g.fillStyle = 'rgba(255, 140, 130, 0.18)'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 44, 14, 20, 0, Math.PI * 2); g.fill(); }
    // pearls
    g.fillStyle = '#f4f0e8'; for (let i = -6; i <= 6; i++) { g.beginPath(); g.arc(i * 9, 196 + Math.abs(i) * Math.abs(i) * -0.9 + 10, 5, 0, Math.PI * 2); g.fill(); }
    g.restore();
    // the light from one side, the varnish, the dark at the edges, the cracks of age
    g.save(); g.translate(ox, oy);
    const lt = g.createLinearGradient(0, 0, W, 0); lt.addColorStop(0, `rgba(255, 220, 160, ${0.12 + s.light})`); lt.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
    g.fillStyle = lt; g.fillRect(0, 0, W, H);
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10, 5, 0, 0.55)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(30, 20, 10, 0.18)'; g.lineWidth = 1;
    const R = seeded(77 + k);
    for (let i = 0; i < 70; i++) { let x = R() * W, y = R() * H; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (R() - 0.5) * 40; y += (R() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
    g.restore();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

const MG = {
  canvas(k) {
    const g = new THREE.PlaneGeometry(12, 15);
    const uv = g.attributes.uv.array, u0 = (k % 2) * 0.5, v0 = k < 2 ? 0.5 : 0;
    for (let i = 0; i < uv.length; i += 2) { uv[i] = u0 + uv[i] * 0.5; uv[i + 1] = v0 + uv[i + 1] * 0.5; }
    g.translate(0, 18.5, 0.25);
    return g;
  },
  // a gilt frame, deep, with a raised lip and a bead inside
  frame() {
    const parts = [];
    for (const [w, h, x, y, d, z] of [[15, 1.5, 0, 26.75, 0.9, 0.2], [15, 1.5, 0, 10.25, 0.9, 0.2], [1.5, 18, -6.75, 18.5, 0.9, 0.2], [1.5, 18, 6.75, 18.5, 0.9, 0.2],
      [15.4, 0.35, 0, 27.6, 1.3, 0.25], [15.4, 0.35, 0, 9.4, 1.3, 0.25], [0.35, 18.5, -7.55, 18.5, 1.3, 0.25], [0.35, 18.5, 7.55, 18.5, 1.3, 0.25],
      [12.3, 0.2, 0, 26.0, 1.0, 0.3], [12.3, 0.2, 0, 11.0, 1.0, 0.3], [0.2, 15.2, -6.05, 18.5, 1.0, 0.3], [0.2, 15.2, 6.05, 18.5, 1.0, 0.3]]) {
      parts.push(box(w, h, d, x, y, z));
    }
    // a little ornament at each corner
    for (const sx of [-1, 1]) for (const sy of [10.25, 26.75]) { const o = new THREE.SphereGeometry(0.75, 10, 8); o.scale(1, 1, 0.5); o.translate(sx * 6.75, sy, 0.75); parts.push(o); }
    // and a brass picture light above it
    parts.push(box(5.5, 0.45, 0.6, 0, 28.4, 1.4)); parts.push(box(0.25, 0.25, 1.4, 0, 28.4, 0.7));
    return merge(parts);
  },
  plaque() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.translate(0, 7.6, 0.3); return g; },
  // two wires from the top of a frame up into the vault
  hangWire() { const parts = []; for (const s of [-1, 1]) { const a = new THREE.Vector3(s * 6.5, 27.8, 0), b = new THREE.Vector3(s * 2.0, 60, 0), d = b.clone().sub(a), L = d.length(); const w = new THREE.BoxGeometry(0.12, L, 0.12); w.translate(0, L / 2, 0); w.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); w.translate(a.x, a.y, a.z); parts.push(w); } return merge(parts); },
  // a chandelier: a column, two tiers of arms with candles, crystal drops
  chandelier() {
    const parts = [];
    const gold = rgb(0xc8a050), glass = rgb(0xf4f0ff), wax = rgb(0xfff4e0);
    parts.push(paint(new THREE.CylinderGeometry(0.12, 0.12, 8, 6).translate(0, 4, 0), gold));
    parts.push(paint(new THREE.SphereGeometry(1.1, 12, 10).translate(0, -0.6, 0), gold));
    for (const [r, y, n] of [[5.2, -1.2, 10], [3.2, 1.0, 7]]) {
      const ring = new THREE.TorusGeometry(r, 0.18, 6, 32); ring.rotateX(Math.PI / 2); ring.translate(0, y, 0); parts.push(paint(ring, gold));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
        parts.push(paint(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 8).translate(x, y + 0.6, z), wax));
        parts.push(paint(new THREE.CylinderGeometry(0.38, 0.2, 0.25, 8).translate(x, y + 0.08, z), gold));
        for (let d = 0; d < 2; d++) { const o = new THREE.OctahedronGeometry(0.32, 0); o.scale(0.7, 1.4, 0.7); o.translate(x * (0.82 + d * 0.1), y - 0.9 - d * 0.7, z * (0.82 + d * 0.1)); parts.push(paint(o, glass)); }
      }
      const arm = new THREE.TorusGeometry(r * 0.5, 0.08, 4, 16, Math.PI); arm.rotateX(Math.PI / 2); arm.translate(0, y - 0.3, 0); parts.push(paint(arm, gold));
    }
    for (let k = 0; k < 14; k++) { const a = k * 2.4, o = new THREE.OctahedronGeometry(0.4, 0); o.scale(0.7, 1.6, 0.7); o.translate(Math.cos(a) * 1.4, -2.2 - (k % 3) * 0.8, Math.sin(a) * 1.4); parts.push(paint(o, glass)); }
    return merge(parts);
  },
  // furniture under dust sheets: the shapes you can just about make out
  ghost(kind) {
    const parts = [], cloth = rgb(0xece8e0);
    if (kind === 0) {
      // an armchair
      parts.push(new THREE.SphereGeometry(1, 20, 14).scale(4.4, 2.4, 4.2).translate(0, 4.2, 0));
      parts.push(new THREE.SphereGeometry(1, 20, 14).scale(4.2, 4.8, 1.6).translate(0, 8.2, -3.0));
      for (const s of [-1, 1]) parts.push(new THREE.SphereGeometry(1, 16, 12).scale(1.2, 2.2, 4.0).translate(s * 4.0, 6.0, 0));
      const skirt = new THREE.CylinderGeometry(4.6, 5.6, 4.6, 24, 3, true); skirt.scale(1, 1, 0.95); skirt.translate(0, 2.3, 0); parts.push(skirt);
    } else {
      // a sofa
      parts.push(new THREE.SphereGeometry(1, 24, 14).scale(10, 2.4, 4.4).translate(0, 4.2, 0));
      parts.push(new THREE.SphereGeometry(1, 24, 14).scale(10, 4.2, 1.6).translate(0, 7.8, -3.2));
      for (const s of [-1, 1]) parts.push(new THREE.SphereGeometry(1, 16, 12).scale(1.6, 2.6, 4.2).translate(s * 9.4, 5.6, 0));
      const skirt = new THREE.CylinderGeometry(5.2, 6.0, 4.6, 32, 3, true); skirt.scale(2.0, 1, 0.95); skirt.translate(0, 2.3, 0); parts.push(skirt);
    }
    // folds in the cloth
    for (const g of parts) { const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 3) { const a = Math.atan2(p[i + 2], p[i]); p[i] += Math.sin(a * 9 + p[i + 1] * 0.8) * 0.12; p[i + 2] += Math.cos(a * 7 + p[i + 1] * 0.6) * 0.12; } }
    return merge(parts.map((g) => paint(g, cloth)));
  },
  // the stairs across the room, over the ribbon: steps rising from one wall to the other
  stairs(W) {
    const parts = [], wood = rgb(0x4a2a18), runner = rgb(0x6a1020), rail = rgb(0x2a160c), brass = rgb(0xc8a050);
    const n = 28, x0 = -W + 3, x1 = W - 6, y0 = 13, y1 = 36, depth = 9;
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1), x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, sw = (x1 - x0) / (n - 1) + 0.05;
      parts.push(paint(box(sw, 0.5, depth, x, y, 0), wood));
      parts.push(paint(box(sw, 0.08, depth * 0.62, x, y + 0.29, 0), runner));
      parts.push(paint(box(sw, (y1 - y0) / (n - 1) + 0.6, 0.4, x, y - 0.55, depth / 2 - 0.2), wood));
      if (k % 2 === 0) for (const z of [-depth / 2 + 0.3, depth / 2 - 0.3]) parts.push(paint(box(0.2, 3.4, 0.2, x, y + 1.95, z), rail));
    }
    // the stringer underneath, the handrails, a landing and a newel post with a brass knob
    const d = new THREE.Vector3(x1 - x0, y1 - y0, 0), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.clone().normalize());
    const str = new THREE.BoxGeometry(L, 1.6, depth); str.applyQuaternion(q); str.translate((x0 + x1) / 2, (y0 + y1) / 2 - 1.2, 0); parts.push(paint(str, wood));
    for (const z of [-depth / 2 + 0.3, depth / 2 - 0.3]) { const r = new THREE.BoxGeometry(L, 0.35, 0.45); r.applyQuaternion(q); r.translate((x0 + x1) / 2, (y0 + y1) / 2 + 3.7, z); parts.push(paint(r, rail)); }
    parts.push(paint(box(9, 0.8, depth + 2, x1 + 5, y1, 0), wood));
    parts.push(paint(box(1.1, 6, 1.1, x0 - 0.5, y0 + 2.4, depth / 2 - 0.3), rail));
    parts.push(paint(new THREE.SphereGeometry(0.75, 10, 8).translate(x0 - 0.5, y0 + 5.8, depth / 2 - 0.3), brass));
    return merge(parts);
  },
  // the bed: a four-poster, the sheets thrown back and twisted, her pillow, his
  bed() {
    const parts = [], wood = rgb(0x3a1e12), sheet = rgb(0xf0e8e4), duvet = rgb(0x8a2a3a), brass = rgb(0xc8a050);
    parts.push(paint(box(30, 4, 38, 0, 3, 0), wood));
    parts.push(paint(box(28.6, 3.6, 36.4, 0, 6.6, 0), sheet));
    const dv = new THREE.PlaneGeometry(30, 26, 30, 26); dv.rotateX(-Math.PI / 2);
    const p = dv.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const x = p[i], z = p[i + 2]; p[i + 1] = 8.7 + 1.2 * Math.sin(x * 0.35 + z * 0.2) * Math.sin(z * 0.3) + 0.7 * Math.sin(x * 0.9 - z * 0.7) - (Math.abs(x) > 14 ? (Math.abs(x) - 14) * 3 : 0); }
    dv.translate(0, 0, 5); parts.push(paint(dv, duvet));
    for (const x of [-7, 7]) parts.push(paint(new THREE.SphereGeometry(1, 16, 10).scale(5.4, 1.6, 3.2).translate(x, 9.6, -14.5), sheet));
    parts.push(paint(box(30, 14, 1.6, 0, 11, -19), wood));
    for (const x of [-14.2, 14.2]) for (const z of [-18.4, 18.4]) {
      parts.push(paint(new THREE.CylinderGeometry(0.7, 0.85, 34, 10).translate(x, 17, z), wood));
      parts.push(paint(new THREE.SphereGeometry(1.1, 10, 8).translate(x, 34.6, z), brass));
    }
    for (const z of [-18.4, 18.4]) parts.push(paint(box(29, 0.8, 0.8, 0, 33.8, z), wood));
    for (const x of [-14.2, 14.2]) parts.push(paint(box(0.8, 0.8, 37, x, 33.8, 0), wood));
    return merge(parts);
  },
  // the nightstand, the clock on it
  nightstand() {
    const parts = [], wood = rgb(0x3a1e12), brass = rgb(0xc8a050);
    parts.push(paint(box(8, 9, 7, 0, 4.5, 0), wood));
    parts.push(paint(box(8.6, 0.5, 7.6, 0, 9.25, 0), wood));
    parts.push(paint(new THREE.SphereGeometry(0.35, 8, 6).translate(0, 6, 3.6), brass));
    parts.push(paint(box(5.2, 2.6, 2.6, 0, 10.8, 0.5), rgb(0x1a1414)));
    return merge(parts);
  },
  clockFace() { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(0.62, 0.95, 1); g.translate(0, 10.8, 1.82); return g; },
  // his journal, open, the ink run all over it, the pen
  journal() {
    const parts = [], page = rgb(0xefe6d0), cover = rgb(0x3a1a12), ink = rgb(0x0a0a1e);
    for (const s of [-1, 1]) {
      const pg = new THREE.BoxGeometry(11, 1.4, 15); pg.rotateZ(s * 0.08); pg.translate(s * 5.6, 1.2, 0); parts.push(paint(pg, page));
      const cv = new THREE.BoxGeometry(11.6, 0.4, 15.6); cv.rotateZ(s * 0.08); cv.translate(s * 5.7, 0.4, 0); parts.push(paint(cv, cover));
      for (let k = 0; k < 9; k++) parts.push(paint(box(8.5, 0.05, 0.12, s * 5.6, 1.95 + s * 0.0, -5.6 + k * 1.4), rgb(0x7a8aa0)));
    }
    const R = seeded(5);
    for (let k = 0; k < 7; k++) { const b = new THREE.SphereGeometry(1, 12, 8); b.scale(1.4 + R() * 2.6, 0.25, 1.2 + R() * 2.2); b.translate(-2 + R() * 9, 2.0, -5 + R() * 10); parts.push(paint(b, ink)); }
    for (let k = 0; k < 4; k++) { const dr = box(0.5, 5 + R() * 4, 0.3, 11.2, -0.5 - R() * 2, -3 + R() * 6); parts.push(paint(dr, ink)); }
    const pen = new THREE.CylinderGeometry(0.35, 0.35, 9, 10); pen.rotateZ(Math.PI / 2); pen.rotateY(0.6); pen.translate(3, 2.4, 6.5); parts.push(paint(pen, rgb(0x101014)));
    for (const g of parts) { g.rotateX(0.55); g.translate(0, 13.4, 0); }
    const wood = rgb(0x3a1e12);
    parts.push(paint(box(26, 1.2, 18, 0, 11.4, -1), wood));
    for (const x of [-11.5, 11.5]) for (const z of [-8.5, 6.5]) parts.push(paint(box(1.2, 11, 1.2, x, 5.5, z), wood));
    parts.push(paint(box(24, 4, 1, 0, 9, -9.2), wood));
    return merge(parts);
  },
  // the bottle, finished, on its side; the glass, empty
  wine() {
    const parts = [], glass = rgb(0x1a3a1a);
    const body = new THREE.CylinderGeometry(2.1, 2.1, 9, 20); body.translate(0, 4.5, 0);
    const shoulder = new THREE.SphereGeometry(2.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); shoulder.scale(1, 0.9, 1); shoulder.translate(0, 9, 0);
    const neck = new THREE.CylinderGeometry(0.75, 0.85, 5, 14); neck.translate(0, 12.2, 0);
    const lip = new THREE.TorusGeometry(0.78, 0.16, 6, 14); lip.rotateX(Math.PI / 2); lip.translate(0, 14.7, 0);
    const label = new THREE.CylinderGeometry(2.14, 2.14, 3.6, 20, 1, true); label.translate(0, 4.6, 0);
    const bottle = [paint(body, glass), paint(shoulder, glass), paint(neck, glass), paint(lip, glass), paint(label, rgb(0xe8dcc0))];
    for (const g of bottle) { g.rotateZ(Math.PI / 2 - 0.08); g.translate(4, 2.1, 0); parts.push(g); }
    // the glass, standing, a red ring in the bottom
    const cup = new THREE.CylinderGeometry(2.4, 1.2, 5, 20, 1, true); cup.translate(-8, 10.5, 2); parts.push(paint(cup, rgb(0xdce4ec)));
    const stem = new THREE.CylinderGeometry(0.22, 0.22, 7, 8); stem.translate(-8, 4.5, 2); parts.push(paint(stem, rgb(0xdce4ec)));
    const foot = new THREE.CylinderGeometry(2.2, 2.2, 0.3, 20); foot.translate(-8, 0.9, 2); parts.push(paint(foot, rgb(0xdce4ec)));
    const dregs = new THREE.CylinderGeometry(1.3, 1.2, 0.3, 16); dregs.translate(-8, 8.2, 2); parts.push(paint(dregs, rgb(0x5a0a14)));
    return merge(parts);
  },
  // boxes of her things, stacked
  crates() {
    const parts = [], R = seeded(23), card = [rgb(0xb88a5a), rgb(0xa87a4a), rgb(0xc89a6a)];
    for (let k = 0; k < 9; k++) {
      const w = 5 + R() * 3, h = 4 + R() * 2.5, d = 5 + R() * 3;
      const x = (k % 3) * 7 - 7 + (R() - 0.5), y = Math.floor(k / 3) * 5.6 + h / 2, z = (R() - 0.5) * 2;
      if (Math.floor(k / 3) === 2 && R() < 0.4) continue;
      const b = box(w, h, d, x, y, z); b.rotateY((R() - 0.5) * 0.2); parts.push(paint(b, card[k % 3]));
      parts.push(paint(box(w * 1.01, 0.3, 1.2, x, y + h / 2, z), rgb(0xd8c8a0)));
    }
    return merge(parts);
  },
  // the lamp he leaves on: a side table, a lamp with a pleated shade
  lamp() {
    const parts = [], wood = rgb(0x3a1e12), brass = rgb(0xc8a050);
    parts.push(paint(new THREE.CylinderGeometry(4.6, 4.6, 0.6, 24).translate(0, 9.2, 0), wood));
    parts.push(paint(new THREE.CylinderGeometry(0.6, 0.9, 9, 10).translate(0, 4.5, 0), wood));
    parts.push(paint(new THREE.CylinderGeometry(3, 3.2, 0.5, 20).translate(0, 0.25, 0), wood));
    parts.push(paint(new THREE.SphereGeometry(1.8, 14, 10).translate(0, 11.6, 0), brass));
    parts.push(paint(new THREE.CylinderGeometry(0.25, 0.25, 5, 8).translate(0, 14.5, 0), brass));
    return merge(parts);
  },
  lampShade() { const g = new THREE.CylinderGeometry(2.4, 4.2, 4.6, 24, 1, true); g.translate(0, 18.2, 0); return g; },
  // the locks he never changed: deadbolts and a chain up the side of a door
  locks() {
    const parts = [], brass = rgb(0xd0a850), dark = rgb(0x2a2018);
    for (let k = 0; k < 5; k++) {
      const y = 7 + k * 4.2;
      parts.push(paint(new THREE.CylinderGeometry(1.2, 1.2, 0.8, 16).rotateX(Math.PI / 2).translate(0, y, 0.4), brass));
      parts.push(paint(box(0.25, 1.1, 0.3, 0, y, 0.85), dark));
    }
    for (let k = 0; k < 8; k++) { const l = new THREE.TorusGeometry(0.5, 0.12, 6, 12); l.rotateY(k % 2 ? Math.PI / 2 : 0); l.translate(-1.5 - k * 0.9, 26 - k * 0.6 - Math.sin(k * 0.4) * 0.8, 0.6); parts.push(paint(l, brass)); }
    return merge(parts);
  },
};

const TT = { aTint: 3 };
const VC = (M, key, opts) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts }));
let PORTRAIT_TEX = null;
const portraitMat = (M) => M.portraitM || (M.portraitM = new THREE.MeshStandardMaterial({ map: (PORTRAIT_TEX = PORTRAIT_TEX || portraitTexture()), emissiveMap: PORTRAIT_TEX, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.75 }));
extend({
  layers: {
    canvas0: (M) => [MG.canvas(0), portraitMat(M), 40, {}],
    canvas1: (M) => [MG.canvas(1), portraitMat(M), 40, {}],
    canvas2: (M) => [MG.canvas(2), portraitMat(M), 40, {}],
    canvas3: (M) => [MG.canvas(3), portraitMat(M), 40, {}],
    gilt: (M) => [MG.frame(), M.giltM || (M.giltM = litTint(0.28)), 160, TT],
    plaque: (M) => [MG.plaque(), M.sign, 40, { aIdx: 1, aWake: 2 }],
    hangWire: (M) => [MG.hangWire(), M.metal, 12, TT],
    chandelier: (M) => [MG.chandelier(), VC(M, 'chandM', { roughness: 0.25, metalness: 0.4, emissive: 0x2a2010 }), 40, {}],
    ghostChair: (M) => [MG.ghost(0), VC(M, 'sheetM', { roughness: 0.95, metalness: 0, emissive: 0x141210 }), 60, {}],
    ghostSofa: (M) => [MG.ghost(1), VC(M, 'sheetM', { roughness: 0.95, metalness: 0, emissive: 0x141210 }), 40, {}],
    stairs: (M) => [MG.stairs(46), VC(M, 'woodM', { roughness: 0.6, metalness: 0.05 }), 3, {}],
    bed: (M) => [MG.bed(), VC(M, 'woodM', { roughness: 0.6, metalness: 0.05 }), 3, {}],
    nightstand: (M) => [MG.nightstand(), VC(M, 'woodM', { roughness: 0.6, metalness: 0.05 }), 4, {}],
    clockFace: (M) => [MG.clockFace(), M.sign, 4, { aIdx: 1, aWake: 2 }],
    journal: (M) => [MG.journal(), VC(M, 'paperM', { roughness: 0.85, metalness: 0 }), 3, {}],
    wine: (M) => [MG.wine(), VC(M, 'glassM', { roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.88 }), 3, {}],
    crates: (M) => [MG.crates(), VC(M, 'paperM', { roughness: 0.85, metalness: 0 }), 40, {}],
    sideLamp: (M) => [MG.lamp(), VC(M, 'woodM', { roughness: 0.6, metalness: 0.05 }), 4, {}],
    lampShade: (M) => [MG.lampShade(), M.shadeM || (M.shadeM = new THREE.MeshStandardMaterial({ color: 0xf4e0c0, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffb060, emissiveIntensity: 1.1 })), 4, {}],
    locks: (M) => [MG.locks(), VC(M, 'brassM', { roughness: 0.3, metalness: 0.7, emissive: 0x1a1208 }), 12, {}],
  },
  parts: {
    // her portrait on the wall, the plaque under it (what used to hang there), a light on it
    portrait(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1;
      if (it.lift) p.y += it.lift;
      m.compose(p, q, S._s.set(s, s, s));
      S.layers['canvas' + (it.v ?? 0)].add(m);
      S.layers.gilt.add(m, { aTint: [1, 0.76, 0.36] });
      if (it.idx !== undefined) S.layers.plaque.add(m, { aIdx: it.idx, aWake: [0.7, 0] });
      if (it.hang) S.layers.hangWire.add(m, { aTint: [0.25, 0.2, 0.14] });
      const w = local(p, yaw, 0, 28.0 * s, 1.6 * s, S._o);
      glowAt(S, w.x, w.y, w.z, 5 * s, [1, 0.85, 0.6], 0.55);
    },
    ghost(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers[it.sofa ? 'ghostSofa' : 'ghostChair'].add(m); },
    stairs(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.stairs.add(m); },
    bed(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.bed.add(m); },
    nightstand(S, it, p, q) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.nightstand.add(m);
      if (it.idx !== undefined) { S.layers.clockFace.add(m, { aIdx: it.idx, aWake: [1, 0] }); const w = local(p, S.course.sample(it.t).yaw + (it.rot || 0), 0, 10.8 * s, 2.4 * s, S._o); glowAt(S, w.x, w.y, w.z, 4 * s, [1, 0.12, 0.1], 0.6); }
    },
    journal(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.journal.add(m); },
    wine(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.wine.add(m); },
    crates(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.crates.add(m); },
    // the light left on
    sideLamp(S, it, p, q) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.sideLamp.add(m); S.layers.lampShade.add(m);
      glowAt(S, p.x, p.y + 18 * s, p.z, 22 * s, [1, 0.72, 0.38], 0.9);
      poolAt(S, p.x, p.y + 0.1, p.z, 70 * s, [1, 0.7, 0.36], 0.8);
    },
    locks(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.locks.add(m); },
  },
  kits: {
    // her portraits along both walls of a stretch, every so often; or one, with a plaque
    portraits(S, z, R) {
      const W = z.W ?? 40, every = z.every ?? 2.6;
      if (z.hang) {
        [].concat(z.at).forEach((t, k) => S.items.push({ t, x: 0, rot: Math.PI, s: z.s ?? 1, v: (z.v ?? k) % 4, h: S.course.sample(t).y + (z.lift ?? 1.2), hang: true, idx: z.plaques ? S.atlas.index[z.plaques[k]] : undefined, parts: 'portrait', ahead: z.ahead }));
        return;
      }
      if (z.at !== undefined) {
        [].concat(z.at).forEach((t, k) => {
          const sd = Array.isArray(z.sides) ? z.sides[k] : (k % 2 ? 1 : -1);
          S.items.push(onFloor(S, { t, x: sd * (W - 0.6), rot: SIDE(sd), s: z.s ?? 1, lift: z.y, v: (z.v ?? k) % 4, idx: z.plaques ? S.atlas.index[z.plaques[k]] : undefined, parts: 'portrait', ahead: z.ahead }));
        });
        return;
      }
      let k = Math.floor(R() * 4);
      for (let t = z.from + (z.offset ?? 0.6); t < z.to; t += every) {
        const sd = (Math.round((t - z.from) / every) % 2) ? 1 : -1;
        S.items.push(onFloor(S, { t, x: sd * (W - 0.6), rot: SIDE(sd), s: z.s ?? 1, v: k++ % 4, idx: z.plaque ? S.atlas.index[z.plaque] : undefined, parts: 'portrait', ahead: z.ahead }));
      }
    },
    // furniture under sheets, here and there either side of the ribbon
    ghosts(S, z, R) {
      for (let t = z.from + R() * 0.4; t < z.to; t += (z.every ?? 1.3) * (0.7 + R() * 0.6)) {
        const sd = R() < 0.5 ? -1 : 1;
        S.items.push(onFloor(S, { t, x: sd * ((z.x ?? 18) + R() * (z.spread ?? 14)), rot: SIDE(sd) + (R() - 0.5) * 0.6, s: 0.9 + R() * 0.4, sofa: R() < 0.35, parts: 'ghost', ahead: z.ahead }));
      }
    },
    crates(S, z, R) {
      for (let t = z.from + R() * 0.3; t < z.to; t += (z.every ?? 1.1) * (0.7 + R() * 0.6)) {
        const sd = R() < 0.5 ? -1 : 1;
        S.items.push(onFloor(S, { t, x: sd * ((z.x ?? 20) + R() * (z.spread ?? 14)), rot: R() * 6.28, s: 0.8 + R() * 0.5, parts: 'crates', ahead: z.ahead }));
      }
    },
    stairs(S, z) { S.items.push(onFloor(S, { t: z.at, x: 0, rot: 0, parts: 'stairs', ahead: z.ahead })); },
    bed(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: z.rot ?? SIDE(z.x), s: z.s ?? 1, parts: 'bed', ahead: z.ahead })); },
    nightstand(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, s: z.s ?? 1, rot: z.rot ?? SIDE(z.x), idx: z.clock ? S.atlas.index[z.clock] : undefined, parts: 'nightstand', ahead: z.ahead })); },
    journal(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: z.rot ?? 0.5, s: z.s ?? 1, parts: 'journal', ahead: z.ahead })); },
    wine(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: z.rot ?? 0.3, s: z.s ?? 1, parts: 'wine', ahead: z.ahead })); },
    sideLamp(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: 0, s: z.s ?? 1, parts: 'sideLamp', ahead: z.ahead })); },
    locks(S, z) { S.items.push(onFloor(S, { t: z.at, x: z.x, rot: 0, parts: 'locks', ahead: z.ahead })); },
  },
});

// ---------- the rooms of the house ----------
// rings: 'vault' walls, then the arch of the ceiling; 'flat'; 'crawl' (low); 'attic' (the roof)
const vaultRing = (W = 40, H = 30, V = 14) => {
  const r = [[-W, H, 1, 1], [-W, 0, 1, 1], [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0], [W, 0, 1, 2], [W, H, 1, 2]];
  for (let k = 0; k <= 10; k++) { const a = (k / 10) * Math.PI; r.push([W * Math.cos(a), H + V * Math.sin(a), 1, 3]); }
  return r;
};
const flatRing = (W = 46, H = 40) => [[-W, H, 1, 1], [-W, 0, 1, 1], [-W, 0, 1, 0], [-W * 0.6, 0, 1, 0], [-W * 0.25, 0, 1, 0], [0, 0, 1, 0], [W * 0.25, 0, 1, 0], [W * 0.6, 0, 1, 0], [W, 0, 1, 0], [W, 0, 1, 2], [W, H, 1, 2], [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3]];
const atticRing = (W = 36, h0 = 8, H = 32) => [[-W, h0, 1, 1], [-W, 0, 1, 1], [-W, 0, 1, 0], [-W * 0.5, 0, 1, 0], [0, 0, 1, 0], [W * 0.5, 0, 1, 0], [W, 0, 1, 0], [W, 0, 1, 2], [W, h0, 1, 2], [W, h0, 1, 3], [W * 0.5, (h0 + H) / 2, 1, 3], [0, H, 1, 3], [-W * 0.5, (h0 + H) / 2, 1, 3], [-W, h0, 1, 3]];
const HOUSE = {
  rings: { vault: vaultRing, flat: flatRing, crawl: flatRing, attic: atticRing },
  ringOf: (s) => ({ gallery: 'vault', ballroom: 'vault', dark: 'vault', mold: 'vault', bedroom: 'flat', foyer: 'flat', blueprint: 'flat', crawl: 'crawl', attic: 'attic' }[s]),
  styles: { gallery: 0, ballroom: 1, bedroom: 2, crawl: 3, attic: 4, blueprint: 5, foyer: 6, dark: 7, mold: 8 },
  dims: { gallery: [40, 30, 14], ballroom: [70, 40, 24], dark: [40, 30, 14], mold: [40, 30, 14], bedroom: [50, 44], foyer: [46, 40], blueprint: [46, 40], crawl: [30, 15], attic: [36, 8, 32] },
  // chandeliers: every 48 m in the gallery, 64 in the big rooms, a bare bulb every 30 in the crawl space
  lights: (id) => ({ 0: [48, 24], 1: [64, 32], 2: [64, 32], 3: [30, 15], 6: [64, 32], 7: [96, 48], 8: [48, 24] }[id] || null),
};

function houseMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.003 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uWarm: { value: new THREE.Color(0xffc070) }, uLight: { value: new THREE.Color(1, 1, 1) }, uSkyTop: { value: new THREE.Color(0x0a0414) }, uSkyLow: { value: new THREE.Color(0x2a1030) },
      uMold: { value: new THREE.Vector2(-1e5, 0) }, uPrints: { value: new THREE.Vector2(-1e5, 0) },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity;
      uniform vec3 uFog, uCam, uWarm, uLight, uSkyTop, uSkyLow;
      uniform vec2 uMold, uPrints;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float box2(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
      // a damask flower, tone on tone, in cells of 5 x 7 m, every other row offset
      float damask(vec2 p){
        vec2 q = p / vec2(5.0, 7.0); q.x += 0.5 * mod(floor(q.y), 2.0);
        vec2 g = (fract(q) - 0.5) * vec2(5.0, 7.0); g.x = abs(g.x);
        float a = atan(g.y, g.x), r = length(g * vec2(1.0, 0.8));
        float petal = 1.3 + 0.5 * cos(a * 3.0) + 0.22 * cos(a * 7.0);
        float m = smoothstep(petal + 0.08, petal - 0.08, r) * smoothstep(0.25, 0.5, r);
        float stem = smoothstep(0.16, 0.05, abs(g.x - 0.12 * sin(g.y * 1.6))) * step(1.3, abs(g.y)) * step(abs(g.y), 3.3);
        float leaf = smoothstep(0.5, 0.4, length((g - vec2(0.8, 2.3)) * vec2(1.0, 0.5))) + smoothstep(0.5, 0.4, length((g - vec2(0.8, -2.3)) * vec2(1.0, 0.5)));
        return clamp(m + stem + leaf, 0.0, 1.0);
      }
      vec2 fixture(float st){
        if (st < 0.5 || st > 7.5) return vec2(48.0, 24.0);
        if (st < 2.5 || st > 5.5 && st < 6.5) return vec2(64.0, 32.0);
        if (st < 3.5) return vec2(30.0, 15.0);
        if (st > 6.5) return vec2(96.0, 48.0);
        return vec2(0.0);
      }
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z;
        float side = x < 0.0 ? -1.0 : 1.0;
        float st = uStyle;
        vec3 col;
        vec2 fx = fixture(st);
        float dl = fx.x > 0.0 ? mod(along - fx.y + fx.x * 0.5, fx.x) - fx.x * 0.5 : 1e3;
        float lightK = fx.x > 0.0 ? 0.42 + 0.75 * exp(-dl * dl / (fx.x * fx.x * 0.12)) : 0.8;
        float wa = part == 6 ? x * 1.3 + 11.0 : (side > 0.0 ? along + 13.0 : along);
        bool onWall = part == 1 || part == 2;
        if (part == 8) { col = vec3(0.78, 0.6, 0.3) * 1.1; }
        else if (part == 7) {
          // the front of the house: dressed stone, tall windows lit from inside
          vec2 b = vec2(x / 3.2 + mod(floor(h / 1.6), 2.0) * 0.5, h / 1.6);
          col = vec3(0.32, 0.29, 0.3) * (0.8 + 0.3 * h2(floor(b))) * (0.8 + 0.2 * step(0.04, fract(b.x)) * step(0.06, fract(b.y)));
          vec2 wc = vec2(mod(x, 16.0) - 8.0, h - 16.0);
          float win = step(box2(wc, vec2(3.0, 7.5)), 0.0) + step(length(wc - vec2(0.0, 7.5)), 3.0) * step(7.5, wc.y);
          col = mix(col, uWarm * (0.9 + 0.4 * h2(vec2(floor(x / 16.0), 2.0))), clamp(win, 0.0, 1.0) * step(4.0, abs(x) - 12.0));
          col *= uLight * 0.7;
        } else if (st > 4.5 && st < 5.5) {
          // the blueprint: everything drawn in white on blue, the walls, the floor, the doors
          col = vec3(0.07, 0.18, 0.46);
          vec2 q = part == 0 || part == 3 ? vec2(x, along) : vec2(wa, h);
          vec2 g1 = abs(fract(q / 2.0) - 0.5), g2 = abs(fract(q / 10.0) - 0.5);
          float grid = (1.0 - smoothstep(0.0, 0.03, min(g1.x, g1.y))) * 0.18 + (1.0 - smoothstep(0.0, 0.01, min(g2.x, g2.y))) * 0.45;
          col += vec3(0.85, 0.92, 1.0) * grid;
          if (part == 0) {
            // room outlines on the floor and the swing of every door
            float ro = abs(fract(along / 36.0) - 0.5) * 36.0;
            col += vec3(0.95) * (1.0 - smoothstep(0.1, 0.25, abs(ro - 14.0))) * step(18.0, abs(x));
            vec2 dq = vec2(abs(x) - 18.0, mod(along, 36.0) - 4.0);
            col += vec3(0.95) * (1.0 - smoothstep(0.08, 0.2, abs(length(dq) - 9.0))) * step(0.0, dq.y) * step(0.0, -dq.x);
          } else if (onWall || part == 6) {
            vec2 dq = vec2(mod(wa, 36.0) - 18.0, h);
            col += vec3(0.95) * (1.0 - smoothstep(0.12, 0.3, box2(dq - vec2(0.0, 13.0), vec2(6.5, 13.0)))) * 0.9;
            col += vec3(0.95) * (1.0 - smoothstep(0.06, 0.16, abs(h - 33.0))) * 0.6;
            float dim = abs(h - 3.0); col += vec3(0.95) * (1.0 - smoothstep(0.05, 0.12, dim)) * step(abs(mod(wa, 36.0) - 18.0), 14.0) * 0.5;
          }
          col *= 0.9 + 0.1 * sin(uTime * 2.0 + along * 0.05);
        } else {
          if (part == 0) {
            if (st > 0.5 && st < 1.5 || st > 5.5 && st < 6.5) {
              // marble in big squares, black and cream, polished
              vec2 tq = vec2(x, along) / 7.0;
              float dark = step(0.5, mod(floor(tq.x) + floor(tq.y), 2.0));
              float vein = smoothstep(0.03, 0.0, abs(n2(vec2(x, along) * 0.08 + n2(vec2(x, along) * 0.3)) - 0.5));
              col = mix(vec3(0.72, 0.66, 0.58), vec3(0.06, 0.05, 0.06), dark);
              col = mix(col, dark > 0.5 ? vec3(0.2, 0.18, 0.2) : vec3(0.5, 0.46, 0.44), vein * 0.6);
              col += uWarm * 0.12 * exp(-dl * dl / 300.0) * (1.0 - dark * 0.5);
            } else if (st > 1.5 && st < 2.5) {
              col = vec3(0.26, 0.06, 0.08) * (0.85 + 0.25 * n2(vec2(x, along) * 0.4));
              float med = damask(vec2(x * 1.4, along * 0.6));
              col = mix(col, vec3(0.42, 0.24, 0.12), med * 0.35);
            } else if (st > 2.5 && st < 3.5) {
              col = vec3(0.16, 0.11, 0.07) * (0.6 + 0.6 * n2(vec2(x, along) * 0.2) + 0.2 * n2(vec2(x, along) * 1.4));
            } else if (st > 3.5 && st < 4.5) {
              float id = floor(x / 3.0);
              col = vec3(0.28, 0.2, 0.13) * (0.75 + 0.3 * h2(vec2(id, 4.0)) + 0.15 * n2(vec2(x * 2.0, along * 0.1)));
              col *= 0.6 + 0.4 * smoothstep(0.0, 0.05, fract(x / 3.0));
            } else {
              // dark boards, and a red runner down the middle with a gold border
              float id = floor(x / 2.2);
              col = vec3(0.12, 0.06, 0.035) * (0.8 + 0.3 * h2(vec2(id, 1.0)) + 0.2 * n2(vec2(x, along * 0.05)));
              float run = step(abs(x), 13.0);
              vec3 rug = vec3(0.32, 0.04, 0.07) * (0.85 + 0.2 * n2(vec2(x, along) * 0.6));
              rug = mix(rug, vec3(0.5, 0.36, 0.14), smoothstep(0.35, 0.0, abs(abs(x) - 11.6)) + smoothstep(0.25, 0.0, abs(abs(x) - 10.4)) * 0.6);
              rug = mix(rug, vec3(0.45, 0.2, 0.1), damask(vec2(x * 1.6, along * 0.5)) * step(abs(x), 9.8) * 0.4);
              col = mix(col, rug, run);
            }
            col *= lightK;
          } else if (part == 3) {
            if (st < 1.5 || st > 6.5) {
              // the vault, and along the top of it a spine: a vertebra every few metres, ribs down to the walls
              float rib = 1.0 - smoothstep(0.5, 0.9, abs(mod(along + 4.5, 9.0) - 4.5));
              vec2 vq = vec2(x, mod(along, 4.5) - 2.25);
              float body = step(length(vq * vec2(0.42, 0.62)), 1.0);
              float wing = step(abs(vq.y), 0.42) * step(abs(x), 5.2) * step(1.0, abs(x));
              float knob = step(length(vec2(abs(x) - 5.2, vq.y)), 0.75);
              float spine = clamp(body + wing + knob, 0.0, 1.0);
              col = st > 0.5 && st < 1.5 ? vec3(0.42, 0.34, 0.26) : vec3(0.2, 0.08, 0.12);
              col *= 0.8 + 0.2 * n2(vec2(x, along) * 0.1);
              col = mix(col, vec3(0.86, 0.8, 0.66) * (0.8 + 0.25 * smoothstep(0.0, 1.0, 1.0 - length(vq * vec2(0.42, 0.62)))), max(rib * 0.85, spine));
            } else if (st > 2.5 && st < 3.5) {
              // joists, the boards above them, a pipe
              float jo = step(abs(mod(along, 3.2) - 1.6), 0.55);
              col = mix(vec3(0.34, 0.26, 0.17), vec3(0.18, 0.11, 0.07), jo);
              col = mix(col, vec3(0.42, 0.42, 0.44), step(abs(x - 8.0), 0.6));
            } else if (st > 3.5 && st < 4.5) {
              // the underside of the roof: boards, rafters, light through a gap
              float raf = step(abs(mod(along, 5.0) - 2.5), 0.6);
              col = mix(vec3(0.3, 0.22, 0.14) * (0.8 + 0.2 * step(0.06, fract(h / 1.2))), vec3(0.16, 0.1, 0.06), raf);
              col += uWarm * 0.6 * step(abs(mod(along, 41.0) - 20.5), 0.35) * step(abs(x), 20.0);
            } else {
              col = vec3(0.68, 0.62, 0.52) * (0.9 + 0.1 * n2(vec2(x, along) * 0.1));
              float r = length(vec2(x, dl));
              col = mix(col, vec3(0.86, 0.8, 0.62), step(abs(r - 6.0), 0.5) + step(abs(r - 8.5), 0.3));
            }
            col *= lightK;
          } else {
            // the walls
            if (st > 2.5 && st < 3.5) {
              vec2 b = vec2(wa / 3.4 + mod(floor(h / 1.7), 2.0) * 0.5, h / 1.7);
              col = vec3(0.34, 0.33, 0.32) * (0.8 + 0.25 * h2(floor(b))) * (0.75 + 0.25 * step(0.05, fract(b.x)) * step(0.08, fract(b.y)));
            } else if (st > 3.5 && st < 4.5) {
              col = vec3(0.3, 0.22, 0.14) * (0.8 + 0.2 * step(0.06, fract(h / 1.2))) * (0.85 + 0.15 * h2(vec2(floor(h / 1.2), floor(wa / 9.0))));
            } else if (st > 0.5 && st < 1.5) {
              // the ballroom: cream panels, gilt pilasters, tall dark mirrors
              float pa = mod(wa, 16.0) - 8.0;
              col = vec3(0.7, 0.62, 0.5);
              col = mix(col, vec3(0.08, 0.07, 0.1) + uWarm * 0.12 * (0.5 + 0.5 * sin(wa * 0.3 + h * 0.2)), step(abs(pa), 4.6) * step(4.0, h) * step(h, 32.0));
              col = mix(col, vec3(0.8, 0.6, 0.28), step(abs(abs(pa) - 6.8), 0.7));
            } else {
              vec3 base = st > 1.5 && st < 2.5 ? vec3(0.32, 0.1, 0.14) : (st > 5.5 && st < 6.5 ? vec3(0.62, 0.56, 0.46) : vec3(0.3, 0.05, 0.09));
              col = mix(base, base * 1.55 + vec3(0.04, 0.02, 0.0), damask(vec2(wa, h)) * 0.6);
              if (h < 9.0) {
                vec2 pq = vec2(mod(wa, 8.0) - 4.0, h - 4.6);
                col = vec3(0.16, 0.08, 0.05) * (0.85 + 0.25 * n2(vec2(wa * 0.3, h * 2.0)));
                col *= 1.0 - 0.25 * (step(box2(pq, vec2(3.2, 3.2)), 0.0) - step(box2(pq, vec2(2.9, 2.9)), 0.0));
              }
              col = mix(col, vec3(0.75, 0.56, 0.28), step(abs(h - 9.2), 0.3));
            }
            // crown moulding where the wall meets the ceiling
            float top = st > 2.5 && st < 3.5 ? 15.0 : (st > 3.5 && st < 4.5 ? 8.0 : (st > 0.5 && st < 1.5 ? 40.0 : (st > 1.5 && st < 2.5 ? 44.0 : (st > 5.5 && st < 6.5 ? 40.0 : 30.0))));
            col = mix(col, vec3(0.86, 0.78, 0.6), step(top - 1.6, h) * step(st, 2.5) + step(top - 1.6, h) * step(5.5, st));
            col *= lightK;
            // mould behind the walls of memory: black-green, from the floor and the corners, spreading
            float mk = uMold.y * smoothstep(uMold.x - 1.0, uMold.x + 7.0, vT) * step(7.5, st) * 1.25;
            if (mk > 0.001) {
              float mm = n2(vec2(wa, h) * 0.11) * 0.55 + n2(vec2(wa, h) * 0.45) * 0.3 + n2(vec2(wa, h) * 1.7) * 0.15;
              float where = smoothstep(16.0, 0.0, h) + smoothstep(top - 12.0, top, h) + 0.35;
              float grow = smoothstep(0.75 - 0.4 * mk * where, 0.7 - 0.4 * mk * where, 1.0 - mm);
              col = mix(col, vec3(0.03, 0.05, 0.03), grow * 0.92);
              col += vec3(0.1, 0.16, 0.06) * grow * (1.0 - grow) * 2.0;
            }
            // her fingerprints, everywhere, catching the light
            float pk = uPrints.y * smoothstep(uPrints.x - 1.0, uPrints.x + 2.0, vT) * (1.0 - smoothstep(214.0, 218.0, vT));
            if (pk > 0.001) {
              vec2 cell = floor(vec2(wa / 17.0, h / 13.0));
              vec2 cen = (cell + 0.5 + (vec2(h2(cell), h2(cell + 3.1)) - 0.5) * 0.5) * vec2(17.0, 13.0);
              vec2 d = (vec2(wa, h) - cen) * vec2(1.0, 0.78);
              float rr = length(d);
              if (rr < 5.2 && h2(cell + 7.7) < 0.7) {
                float ang = atan(d.y, d.x);
                float ridges = 1.0 - smoothstep(0.1, 0.32, abs(fract(rr * 1.35 + 0.18 * sin(ang * 2.0 + rr * 0.4)) - 0.5) * 2.0 - 0.2);
                float there = smoothstep(5.2, 4.2, rr);
                col = mix(col, col * 0.55, ridges * there * pk * 0.7);
                col += vec3(0.75, 0.45, 1.0) * ridges * there * pk * 0.22;
              }
            }
          }
          col *= uLight;
        }
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the end: the bed, and her over it ----------
export class PortraitFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -20;
    prepare(course, scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    this.lit = 0.6; this.fired = false; this.earned = 0;
    this._p = new THREE.Vector3();
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    const fy = floorAt(this.course, this.t);
    track.ground(this.t, this.x, this._p);
    this.group.position.set(this._p.x, fy, this._p.z);
    this.group.rotation.set(0, this.course.sample(this.t).yaw, 0);
    this.lit += ((this.fired ? 1.3 : 0.7) - this.lit) * Math.min(1, dt);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    const g = this.group.position;
    S.glow(g.x, g.y + 30, g.z, 40, [1, 0.8, 0.5], 0.35 * this.lit);
  }
}

// ---------- the house, per frame ----------
export class HouseWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = houseMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, HOUSE));
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P;
    u.uTime.value = time; u.uCam.value.copy(camera.position);
    u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uWarm.value.set(P.lamp ?? 0xffc070);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.5) / 1.6);
    u.uSkyTop.value.set(P.zenith); u.uSkyLow.value.set(P.horizon);
    const ev = S.plan.roomEvents || {};
    u.uMold.value.set(ev.mold ?? -1e5, ev.mold !== undefined ? 1 : 0);
    u.uPrints.value.set(ev.prints ?? -1e5, ev.prints !== undefined ? 1 : 0);
    for (const r of this.rooms) r.update(S.track, S.rider, S.rider.t);
  }
  // the chandeliers (and the crawl space's bare bulbs) where the lights hang
  draw(T) {
    const lamp = col(this.S.P.lamp ?? 0xffc070), m = this._m || (this._m = new THREE.Matrix4()), g = this._g || (this._g = new THREE.Vector3());
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      const crawl = r.style === 3;
      const top = Math.max(...r.ring.map((p) => p[1]));
      for (const f of r.fixtures) {
        this.S.track.ground(f.t, 0, g);
        const fy = floorAt(this.S.course, f.t);
        if (crawl) { T.glow(g.x, fy + top - 1.2, g.z, 7, [1, 0.8, 0.5], 1.0); T.pool(g.x, fy + 0.08, g.z, 30, [1, 0.75, 0.45], 0.5); continue; }
        const y = fy + top - (r.style === 1 ? 16 : 12);
        m.makeTranslation(g.x, y, g.z); T.layers.chandelier.add(m);
        T.glow(g.x, y, g.z, r.style === 1 ? 30 : 22, lamp, 0.85);
        T.pool(g.x, fy + 0.08, g.z, r.style === 1 ? 90 : 60, lamp, 0.4);
      }
    }
  }
}
