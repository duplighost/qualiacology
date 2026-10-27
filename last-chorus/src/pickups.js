// A pickup of its own for every song: the shapes. Each is about a metre across, bold enough to
// read at speed from the chase camera, coloured per vertex so one material and one draw does it.
// (feedback.js turns them into the line of things you steer through.)

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const paint = (g, c) => {
  g = g.index ? g.toNonIndexed() : g;
  if (g.attributes.uv) g.deleteAttribute('uv');
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set(typeof c === 'function' ? c(g.attributes.position, i) : c, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
};
const merge = (parts) => { const g = mergeGeometries(parts, false); g.computeVertexNormals(); return g; };
const ext = (shape, depth, bevel = 0.05, seg = 3) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: seg, curveSegments: 14 }).translate(0, 0, -depth / 2);

// Kiss Me Like a Car Crash: a kiss, glossy red lips
export function lipsGeometry() {
  const R = [0.92, 0.06, 0.16], D = [0.5, 0.02, 0.06];
  const up = new THREE.Shape();
  up.moveTo(-0.62, 0.0); up.bezierCurveTo(-0.45, 0.12, -0.28, 0.32, -0.12, 0.27); up.bezierCurveTo(-0.05, 0.25, -0.02, 0.18, 0, 0.17);
  up.bezierCurveTo(0.02, 0.18, 0.05, 0.25, 0.12, 0.27); up.bezierCurveTo(0.28, 0.32, 0.45, 0.12, 0.62, 0.0);
  up.bezierCurveTo(0.3, 0.05, 0.1, 0.04, 0, 0.05); up.bezierCurveTo(-0.1, 0.04, -0.3, 0.05, -0.62, 0.0);
  const lo = new THREE.Shape();
  lo.moveTo(-0.6, -0.02); lo.bezierCurveTo(-0.3, 0.01, -0.1, 0.0, 0, 0.0); lo.bezierCurveTo(0.1, 0.0, 0.3, 0.01, 0.6, -0.02);
  lo.bezierCurveTo(0.42, -0.24, 0.2, -0.36, 0, -0.36); lo.bezierCurveTo(-0.2, -0.36, -0.42, -0.24, -0.6, -0.02);
  const parts = [paint(ext(up, 0.16, 0.07), R), paint(ext(lo, 0.18, 0.08), R)];
  const seam = new THREE.BoxGeometry(1.15, 0.03, 0.2); seam.translate(0, 0.02, 0); parts.push(paint(seam, D));
  // a glint on the lower lip
  const gl = new THREE.SphereGeometry(0.07, 8, 6); gl.scale(1.8, 0.6, 0.6); gl.translate(0.14, -0.2, 0.17); parts.push(paint(gl, [1, 0.85, 0.9]));
  return merge(parts);
}

// Summer People: a scallop shell, ribbed, peach and pearl
export function shellGeometry() {
  const parts = [];
  const s = new THREE.Shape();
  const N = 9;
  s.moveTo(0, -0.42);
  for (let i = 0; i <= N; i++) {
    const a = Math.PI * (0.12 + 0.76 * i / N), r = 0.62;
    const x = -Math.cos(a) * r, y = Math.sin(a) * r - 0.12;
    if (i === 0) s.lineTo(x, y);
    else { const am = Math.PI * (0.12 + 0.76 * (i - 0.5) / N); s.quadraticCurveTo(-Math.cos(am) * (r + 0.07), Math.sin(am) * (r + 0.07) - 0.12, x, y); }
  }
  s.lineTo(0, -0.42);
  let g = ext(s, 0.08, 0.05, 2);
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position;
  // ribs: the face rises and falls in rays from the hinge, and it bulges in the middle
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i) + 0.42, z = p.getZ(i), a = Math.atan2(y, x), r = Math.hypot(x, y);
    const rib = Math.cos(a * (N * 2) ) * 0.05 * Math.min(1, r / 0.25);
    p.setZ(i, z + (z > 0 ? rib + 0.12 * Math.sin(Math.min(1, r / 0.6) * Math.PI) : -rib * 0.5));
  }
  parts.push(paint(g, (P, i) => { const x = P.getX(i), y = P.getY(i) + 0.42, a = Math.atan2(y, x), k = 0.85 + 0.15 * Math.cos(a * N * 2); const r = Math.hypot(x, y); return [1 * k, (0.62 + 0.25 * r) * k, (0.5 + 0.3 * r) * k]; }));
  for (const sd of [-1, 1]) { const ear = new THREE.BoxGeometry(0.22, 0.14, 0.08); ear.translate(sd * 0.14, -0.4, 0); parts.push(paint(ear, [0.95, 0.6, 0.48])); }
  return merge(parts);
}

// Unloaded: a wrapped sweet, striped, twisted at both ends
export function candyGeometry() {
  const parts = [];
  const body = new THREE.SphereGeometry(0.34, 20, 14); body.scale(1.35, 1, 1);
  parts.push(paint(body, (P, i) => { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const a = Math.atan2(z, y) + x * 6; return Math.sin(a * 2) > 0 ? [1, 0.22, 0.55] : [1, 0.94, 0.96]; }));
  for (const sd of [-1, 1]) {
    const tw = new THREE.ConeGeometry(0.26, 0.36, 10, 2, true); tw.rotateZ(sd * Math.PI / 2); tw.translate(sd * 0.6, 0, 0);
    const p = tw.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = Math.abs(x) - 0.42, ang = k * 4 * sd, c = Math.cos(ang), s = Math.sin(ang); p.setY(i, y * c - z * s); p.setZ(i, y * s + z * c); }
    parts.push(paint(tw, [1, 0.42, 0.7]));
    const knot = new THREE.CylinderGeometry(0.07, 0.07, 0.1, 8); knot.rotateZ(Math.PI / 2); knot.translate(sd * 0.44, 0, 0); parts.push(paint(knot, [1, 0.3, 0.6]));
  }
  return merge(parts);
}

// Overdose Aesthetic: a perfume bottle, faceted pink glass, a gold collar and a round cap
export function perfumeGeometry() {
  const parts = [];
  const body = new THREE.CylinderGeometry(0.34, 0.38, 0.62, 6); body.translate(0, -0.12, 0);
  parts.push(paint(body, (P, i) => { const y = P.getY(i); return [1, 0.45 + 0.25 * (y + 0.4), 0.72 + 0.15 * (y + 0.4)]; }));
  const shoulder = new THREE.CylinderGeometry(0.12, 0.34, 0.14, 6); shoulder.translate(0, 0.26, 0); parts.push(paint(shoulder, [1, 0.62, 0.82]));
  const collar = new THREE.CylinderGeometry(0.11, 0.11, 0.12, 12); collar.translate(0, 0.38, 0); parts.push(paint(collar, [1, 0.8, 0.35]));
  const cap = new THREE.SphereGeometry(0.17, 14, 10); cap.translate(0, 0.56, 0); parts.push(paint(cap, [1, 0.84, 0.42]));
  const label = new THREE.BoxGeometry(0.34, 0.2, 0.02); label.translate(0, -0.12, 0.34); parts.push(paint(label, [1, 0.95, 0.9]));
  return merge(parts);
}

// Nothing Happens Every Week: a donut, pink icing, sprinkles
export function donutGeometry() {
  const parts = [];
  const dough = new THREE.TorusGeometry(0.36, 0.17, 12, 24); dough.rotateX(Math.PI / 2);
  parts.push(paint(dough, (P, i) => P.getY(i) > -0.03 ? [1, 0.42, 0.68] : [0.95, 0.68, 0.38]));
  const cols = [[1, 1, 1], [0.3, 0.8, 1], [1, 0.9, 0.2], [0.5, 1, 0.5], [0.8, 0.4, 1]];
  for (let i = 0; i < 22; i++) {
    const a = i * 2.39996, r = 0.36 + Math.sin(i * 5.1) * 0.1;
    const sp = new THREE.BoxGeometry(0.13, 0.04, 0.04); sp.rotateY(a * 1.7); sp.translate(Math.cos(a) * r, 0.155 - Math.abs(Math.sin(i * 5.1)) * 0.03, Math.sin(a) * r);
    parts.push(paint(sp, cols[i % cols.length]));
  }
  const g = merge(parts); g.rotateX(-0.75);
  return g;
}

// Pretty Until Proven Guilty: handcuffs in gold, worn like jewellery
export function cuffsGeometry() {
  const parts = [];
  const G = [1, 0.8, 0.36];
  for (const sd of [-1, 1]) {
    const ring = new THREE.TorusGeometry(0.26, 0.055, 8, 28); ring.translate(sd * 0.36, -0.08, 0); parts.push(paint(ring, G));
    const lock = new THREE.BoxGeometry(0.16, 0.2, 0.12); lock.translate(sd * 0.36, 0.22, 0); parts.push(paint(lock, [0.9, 0.7, 0.3]));
  }
  for (let i = 0; i < 3; i++) { const l = new THREE.TorusGeometry(0.06, 0.02, 6, 12); if (i % 2) l.rotateY(Math.PI / 2); l.translate(-0.12 + i * 0.12, 0.25, 0); parts.push(paint(l, G)); }
  return merge(parts);
}

// Technically Thirty-Two: a coffee to go, steaming
export function coffeeGeometry() {
  const parts = [];
  const cup = new THREE.CylinderGeometry(0.3, 0.22, 0.72, 20); parts.push(paint(cup, [0.97, 0.96, 0.94]));
  const sleeve = new THREE.CylinderGeometry(0.29, 0.25, 0.3, 20); sleeve.scale(1.04, 1, 1.04); sleeve.translate(0, -0.02, 0); parts.push(paint(sleeve, [0.62, 0.42, 0.26]));
  const lid = new THREE.CylinderGeometry(0.31, 0.33, 0.08, 20); lid.translate(0, 0.4, 0); parts.push(paint(lid, [0.22, 0.2, 0.22]));
  const top = new THREE.CylinderGeometry(0.24, 0.3, 0.06, 20); top.translate(0, 0.47, 0); parts.push(paint(top, [0.28, 0.26, 0.28]));
  const sip = new THREE.BoxGeometry(0.12, 0.02, 0.05); sip.translate(0, 0.5, 0.2); parts.push(paint(sip, [0.05, 0.05, 0.06]));
  return merge(parts);
}

// School Shooter Sweetheart: a homecoming crown, gold, with stones
export function crownGeometry() {
  const parts = [];
  const band = new THREE.CylinderGeometry(0.38, 0.36, 0.2, 24, 1, true); band.translate(0, -0.2, 0); parts.push(paint(band, [1, 0.82, 0.32]));
  const inner = new THREE.CylinderGeometry(0.35, 0.33, 0.2, 24, 1, true); inner.scale(-1, 1, 1); inner.translate(0, -0.2, 0); parts.push(paint(inner, [0.8, 0.6, 0.2]));
  const gems = [[1, 0.15, 0.35], [0.3, 0.6, 1], [0.4, 1, 0.6], [1, 0.15, 0.35], [0.8, 0.4, 1]];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const pt = new THREE.ConeGeometry(0.11, 0.34, 4); pt.translate(0, 0.07, 0); pt.translate(Math.sin(a) * 0.37, 0, Math.cos(a) * 0.37); parts.push(paint(pt, [1, 0.84, 0.36]));
    const ball = new THREE.SphereGeometry(0.05, 8, 6); ball.translate(Math.sin(a) * 0.37, 0.26, Math.cos(a) * 0.37); parts.push(paint(ball, [1, 0.95, 0.7]));
    const gem = new THREE.SphereGeometry(0.06, 8, 6); gem.scale(1, 1, 0.5); gem.translate(Math.sin(a + 0.63) * 0.39, -0.2, Math.cos(a + 0.63) * 0.39); parts.push(paint(gem, gems[i]));
  }
  return merge(parts);
}

// Your Apartment Smells Like Summer: an ice pop, melting a little, on its stick
export function popsicleGeometry() {
  const parts = [];
  const s = new THREE.Shape(); const w = 0.26, h = 0.44, r = 0.24;
  s.moveTo(-w, -h); s.lineTo(w, -h); s.lineTo(w, h - r); s.absarc(w - r + 0.0001, h - r, r - 0.0001, 0, Math.PI / 2, false); s.lineTo(-w + r, h); s.absarc(-w + r, h - r, r - 0.0001, Math.PI / 2, Math.PI, false); s.lineTo(-w, -h);
  parts.push(paint(ext(s, 0.16, 0.06), (P, i) => { const y = P.getY(i); return y > 0.12 ? [1, 0.3, 0.42] : y > -0.18 ? [1, 0.72, 0.3] : [0.55, 0.85, 1]; }));
  const stick = new THREE.BoxGeometry(0.1, 0.42, 0.05); stick.translate(0, -0.66, 0); parts.push(paint(stick, [0.92, 0.78, 0.55]));
  const drip = new THREE.SphereGeometry(0.06, 8, 6); drip.scale(1, 1.5, 1); drip.translate(0.18, -0.52, 0.04); parts.push(paint(drip, [0.6, 0.86, 1]));
  return merge(parts);
}

// Spiked: the drink, a cocktail glass with a cherry in it
export function drinkGeometry() {
  const parts = [];
  const bowl = new THREE.ConeGeometry(0.42, 0.42, 18, 1, true); bowl.rotateX(Math.PI); bowl.translate(0, 0.25, 0); parts.push(paint(bowl, [0.75, 0.9, 1]));
  const drink = new THREE.ConeGeometry(0.36, 0.36, 18); drink.rotateX(Math.PI); drink.translate(0, 0.21, 0); parts.push(paint(drink, [0.35, 1, 0.9]));
  const stem = new THREE.CylinderGeometry(0.025, 0.03, 0.42, 8); stem.translate(0, -0.17, 0); parts.push(paint(stem, [0.8, 0.92, 1]));
  const foot = new THREE.CylinderGeometry(0.22, 0.24, 0.03, 18); foot.translate(0, -0.39, 0); parts.push(paint(foot, [0.8, 0.92, 1]));
  const cherry = new THREE.SphereGeometry(0.09, 10, 8); cherry.translate(0.08, 0.42, 0.05); parts.push(paint(cherry, [1, 0.08, 0.15]));
  const pick = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4); pick.rotateZ(0.6); pick.translate(-0.02, 0.5, 0.05); parts.push(paint(pick, [1, 0.85, 0.3]));
  return merge(parts);
}

// You Are Here: the map's pin
export function pinGeometry() {
  const parts = [];
  const head = new THREE.SphereGeometry(0.34, 20, 14); head.translate(0, 0.22, 0); parts.push(paint(head, [1, 0.16, 0.2]));
  const tip = new THREE.ConeGeometry(0.28, 0.62, 20); tip.rotateX(Math.PI); tip.translate(0, -0.24, 0); parts.push(paint(tip, [0.92, 0.1, 0.14]));
  for (const z of [0.3, -0.3]) { const dot = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16); dot.rotateX(Math.PI / 2); dot.translate(0, 0.24, z); parts.push(paint(dot, [1, 1, 1])); }
  return merge(parts);
}

// Heart of the Party: a heart, the real shape, deep red with its vessels; it beats
export function realHeartGeometry() {
  const parts = [];
  const R = [0.82, 0.07, 0.13], D = [0.62, 0.04, 0.1], B = [0.3, 0.42, 0.95], A = [0.9, 0.16, 0.22];
  const body = new THREE.SphereGeometry(0.4, 22, 16); body.scale(1, 1.25, 0.85);
  const bp = body.attributes.position;
  for (let i = 0; i < bp.count; i++) { const y = bp.getY(i); if (y < 0) { const k = 1 + y * 1.1; bp.setX(i, bp.getX(i) * k); bp.setZ(i, bp.getZ(i) * (0.6 + 0.4 * k)); } }
  body.rotateZ(0.42); body.translate(0, -0.08, 0); parts.push(paint(body, R));
  const atr = new THREE.SphereGeometry(0.22, 16, 12); atr.translate(0.22, 0.28, -0.04); parts.push(paint(atr, D));
  const atl = new THREE.SphereGeometry(0.16, 14, 10); atl.translate(-0.26, 0.22, 0.02); parts.push(paint(atl, D));
  const arch = new THREE.TorusGeometry(0.17, 0.075, 10, 18, Math.PI * 1.15); arch.rotateZ(-0.1); arch.translate(-0.02, 0.4, 0.02); parts.push(paint(arch, A));
  const up = new THREE.CylinderGeometry(0.075, 0.08, 0.3, 10); up.translate(-0.19, 0.36, 0.02); parts.push(paint(up, A));
  for (const [x, z] of [[0.12, -0.12], [0.3, -0.1]]) { const v = new THREE.CylinderGeometry(0.05, 0.055, 0.3, 8); v.rotateZ(-0.25); v.translate(x, 0.5, z); parts.push(paint(v, B)); }
  // a groove down the front where the two sides meet
  const gr = new THREE.TorusGeometry(0.42, 0.02, 6, 18, 1.4); gr.rotateZ(2.2); gr.translate(0.3, 0.12, 0.25); parts.push(paint(gr, [0.5, 0.03, 0.08]));
  return merge(parts);
}

// I Remember Them Too: an instant photograph, white border, an evening of people in it
export function polaroidGeometry() {
  const parts = [paint(new THREE.BoxGeometry(0.78, 0.94, 0.05), [0.96, 0.95, 0.92])];
  for (const z of [0.027, -0.027]) {
    const r = z > 0 ? 0 : Math.PI;
    const sky = new THREE.PlaneGeometry(0.66, 0.36); sky.rotateY(r); sky.translate(0, 0.17, z); parts.push(paint(sky, [0.85, 0.55, 0.42]));
    const gr = new THREE.PlaneGeometry(0.66, 0.3); gr.rotateY(r); gr.translate(0, -0.16, z); parts.push(paint(gr, [0.3, 0.22, 0.26]));
    for (let k = 0; k < 3; k++) {
      const x = -0.2 + k * 0.2, h = new THREE.CircleGeometry(0.06, 10), b = new THREE.PlaneGeometry(0.11, 0.18);
      h.rotateY(r); h.translate(x, 0.06, z * 1.04); b.rotateY(r); b.translate(x, -0.1, z * 1.04);
      parts.push(paint(h, [0.95, 0.78, 0.62]), paint(b, [[0.8, 0.3, 0.35], [0.3, 0.4, 0.7], [0.85, 0.75, 0.5]][k]));
    }
  }
  return merge(parts);
}

// No Lifeguard On Duty: the whistle they took, on its cord
export function whistleGeometry() {
  const parts = [], O = [1, 0.34, 0.16];
  const barrel = new THREE.CylinderGeometry(0.36, 0.36, 0.42, 22); barrel.rotateX(Math.PI / 2); parts.push(paint(barrel, O));
  const mouth = new THREE.BoxGeometry(0.62, 0.22, 0.3); mouth.translate(0.5, 0.13, 0); parts.push(paint(mouth, O));
  const slot = new THREE.BoxGeometry(0.2, 0.06, 0.24); slot.translate(0.05, 0.36, 0); parts.push(paint(slot, [0.25, 0.05, 0.03]));
  const ring = new THREE.TorusGeometry(0.14, 0.035, 8, 18); ring.translate(-0.42, 0.18, 0); parts.push(paint(ring, [0.85, 0.86, 0.9]));
  const cord = new THREE.TorusGeometry(0.38, 0.04, 6, 26); cord.scale(1, 0.7, 1); cord.translate(-0.7, 0.45, 0); parts.push(paint(cord, [0.9, 0.12, 0.12]));
  return merge(parts);
}

// Don't Anybody Move: a red party cup, white inside, the white rim, two ridges round it
export function cupGeometry() {
  const V = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y));
  const parts = [];
  parts.push(paint(new THREE.LatheGeometry(V([[0.2, -0.36], [0.31, 0.3]]), 24), [0.9, 0.1, 0.1]));
  parts.push(paint(new THREE.LatheGeometry(V([[0.29, 0.3], [0.19, -0.3]]), 24), [0.96, 0.95, 0.93]));
  const rim = new THREE.TorusGeometry(0.305, 0.024, 6, 24); rim.rotateX(Math.PI / 2); rim.translate(0, 0.3, 0); parts.push(paint(rim, [1, 1, 1]));
  const base = new THREE.CircleGeometry(0.2, 24); base.rotateX(Math.PI / 2); base.translate(0, -0.36, 0); parts.push(paint(base, [0.8, 0.08, 0.08]));
  for (const y of [-0.12, 0.08]) { const ring = new THREE.TorusGeometry(0.204 + (y + 0.36) * 0.1667, 0.009, 4, 24); ring.rotateX(Math.PI / 2); ring.translate(0, y, 0); parts.push(paint(ring, [0.72, 0.06, 0.06])); }
  return merge(parts);
}
