// THE WRECK as a porcelain figurine: bone-white glaze, a black-lacquer moto jacket over a torn white tee, cherry racing
// trousers, a seatbelt sash with the heart grenade clipped at the sternum, fuzzy-dice earrings, crash-test targets,
// and a windswept platinum sculpture of hair caught at the instant of impact (the first notch). Her own pieces are
// registered on the figurine kit's accessory table under 'wreck_*' names; her faces under 'wreck_*' expressions.
import * as THREE from 'three';
import { ACCESSORIES } from '../../game/figurine/accessories.js';
import { EXPRESSIONS } from '../../game/figurine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const deg = Math.PI / 180;
const placeM = (pos, euler = [0, 0, 0], s = 1) => new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(euler[0], euler[1], euler[2], 'YXZ')), new THREE.Vector3(s, s, s));
const mesh = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name || ''; m.castShadow = true; m.receiveShadow = true; return m; };

// a tube with elliptical sections of varying size along a curve: r(k) -> [rx, ry] (k 0..1 along it), twist in radians
function loft(curve, r, { segs = 48, ring = 18, twist = 0, flat = 1 } = {}) {
  const fr = curve.computeFrenetFrames(segs, false);
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const k = i / segs, p = curve.getPointAt(k), N = fr.normals[i], B = fr.binormals[i];
    const [rx, ry] = r(k); const tw = twist * k;
    for (let j = 0; j <= ring; j++) {
      const a = (j / ring) * Math.PI * 2 + tw, c = Math.cos(a), s = Math.sin(a);
      pos.push(p.x + (N.x * c * rx + B.x * s * ry * flat), p.y + (N.y * c * rx + B.y * s * ry * flat), p.z + (N.z * c * rx + B.z * s * ry * flat));
      uv.push(k, j / ring);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < ring; j++) { const a = i * (ring + 1) + j, b = a + ring + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// platinum with gold lustre streaks, cherry at the tips (u runs root -> tip)
let hairTex = null;
function hairTexture() {
  if (hairTex) return hairTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 0);
  g.addColorStop(0, '#f6efe2'); g.addColorStop(0.62, '#f4ede0'); g.addColorStop(0.8, '#f3b3c6'); g.addColorStop(0.93, '#e8336d'); g.addColorStop(1, '#c41e55');
  x.fillStyle = g; x.fillRect(0, 0, 512, 128);
  // gold lustre: long streaks along the sweep
  for (let i = 0; i < 9; i++) {
    const v = (i + 0.5) / 9 * 128 + Math.sin(i * 7.1) * 4;
    const sg = x.createLinearGradient(0, 0, 512, 0); sg.addColorStop(0, 'rgba(217,164,65,0)'); sg.addColorStop(0.25, 'rgba(217,164,65,0.75)'); sg.addColorStop(0.7, 'rgba(230,180,80,0.55)'); sg.addColorStop(0.9, 'rgba(217,164,65,0)');
    x.strokeStyle = sg; x.lineWidth = 2 + (i % 3); x.beginPath(); x.moveTo(0, v); x.bezierCurveTo(170, v + 6, 340, v - 5, 512, v + 3); x.stroke();
  }
  hairTex = new THREE.CanvasTexture(c); hairTex.colorSpace = THREE.SRGBColorSpace; hairTex.anisotropy = 8;
  return hairTex;
}
let targetTex = null;
function targetTexture() {
  if (targetTex) return targetTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#d9a441'; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#0b0b0b';
  for (const a of [0, Math.PI]) { x.beginPath(); x.moveTo(64, 64); x.arc(64, 64, 60, a, a + Math.PI / 2); x.closePath(); x.fill(); }
  x.strokeStyle = '#0b0b0b'; x.lineWidth = 4; x.beginPath(); x.arc(64, 64, 60, 0, Math.PI * 2); x.stroke();
  targetTex = new THREE.CanvasTexture(c); targetTex.colorSpace = THREE.SRGBColorSpace;
  return targetTex;
}
let diceTex = null;
function diceTexture() {
  if (diceTex) return diceTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#b0102e'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#f6efe2';
  for (const [u, v] of [[16, 16], [48, 48], [32, 32], [48, 16], [16, 48]]) { x.beginPath(); x.arc(u, v, 6, 0, Math.PI * 2); x.fill(); }
  diceTex = new THREE.CanvasTexture(c); diceTex.colorSpace = THREE.SRGBColorSpace;
  return diceTex;
}
// a nearest surface depth on the body (front or back) around (x, y) in bind space
function surfZ(I, x, y, front = true, region = null) {
  let z = front ? -9 : 9;
  for (let v = 0; v < I.nv; v++) {
    if (region !== null && I.region[v] !== region) continue;
    if (Math.abs(I.pos[v * 3] - x) < 0.015 && Math.abs(I.pos[v * 3 + 1] - y) < 0.012) z = front ? Math.max(z, I.pos[v * 3 + 2]) : Math.min(z, I.pos[v * 3 + 2]);
  }
  return z;
}

// ---------------------------------------------------------------------------------------------
// the windswept sculpture: one sweep thrown back and to her right from the crown, two locks lifting off it
ACCESSORIES.wreck_sweep = (ctx, o) => {
  const { I } = ctx;
  const g = new THREE.Group();
  const top = I.top + 0.004, cz = I.headC.z - 0.004, R = -I.side;         // R: +x toward her right
  const mat = ctx.mat('acc', { color: 0xffffff, finish: 'gloss', map: hairTexture() });
  const main = new THREE.CatmullRomCurve3([
    V3(R * -0.012, top - 0.035, cz + 0.07), V3(R * 0.01, top + 0.012, cz + 0.01), V3(R * 0.06, top + 0.03, cz - 0.09),
    V3(R * 0.13, top + 0.02, cz - 0.21), V3(R * 0.21, top - 0.02, cz - 0.33), V3(R * 0.27, top - 0.07, cz - 0.42),
  ]);
  g.add(mesh(loft(main, (k) => { const w = Math.sin(Math.min(1, k * 2.4 + 0.12) * Math.PI / 2) * (1 - k) ** 0.7; return [0.105 * w + 0.004, 0.06 * w + 0.003]; }, { segs: 56, ring: 22, twist: 1.1, flat: 1 }), mat, 'sweep'));
  // a second, lower sweep under it (the mass thrown back over the nape)
  const low = new THREE.CatmullRomCurve3([
    V3(R * -0.05, top - 0.08, cz - 0.03), V3(R * 0.0, top - 0.06, cz - 0.1), V3(R * 0.08, top - 0.07, cz - 0.2), V3(R * 0.17, top - 0.11, cz - 0.3), V3(R * 0.22, top - 0.16, cz - 0.36),
  ]);
  g.add(mesh(loft(low, (k) => { const w = Math.sin(Math.min(1, k * 3 + 0.2) * Math.PI / 2) * (1 - k) ** 0.8; return [0.085 * w + 0.003, 0.05 * w + 0.003]; }, { segs: 40, ring: 18, twist: -0.8 }), mat, 'sweep2'));
  // two locks lifting off the crown
  for (const [dx, up, back] of [[-0.03, 0.13, -0.05], [0.02, 0.1, -0.12]]) {
    const lock = new THREE.CatmullRomCurve3([V3(R * dx, top - 0.01, cz + 0.02), V3(R * (dx + 0.02), top + up * 0.6, cz + back * 0.4), V3(R * (dx + 0.06), top + up, cz + back), V3(R * (dx + 0.1), top + up * 0.85, cz + back * 1.6)]);
    g.add(mesh(loft(lock, (k) => { const w = (1 - k) ** 0.9; return [0.018 * w + 0.002, 0.012 * w + 0.002]; }, { segs: 28, ring: 10, twist: 0.6 }), mat, 'lock'));
  }
  // safety-glass glitter set in it: a few dozen tiny glassy cubes
  const glassM = ctx.mat('acc', { color: 0xe8f2ff, finish: 'pearl', iridescence: 1.0 });
  const n = 48, cube = new THREE.BoxGeometry(0.008, 0.008, 0.008);
  const im = new THREE.InstancedMesh(cube, glassM, n); im.name = 'glass';
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < n; i++) {
    const k = (i * 0.618) % 1 * 0.85 + 0.05, p = main.getPointAt(k), a = i * 2.39;
    const w = Math.sin(Math.min(1, k * 2.4 + 0.12) * Math.PI / 2) * (1 - k) ** 0.7;
    p.x += Math.cos(a) * 0.1 * w; p.y += Math.abs(Math.sin(a)) * 0.06 * w + 0.002;
    e.set(i, i * 1.7, i * 0.3); q.setFromEuler(e); M.compose(p, q, V3(1, 1, 1)); im.setMatrixAt(i, M);
  }
  g.add(im);
  return { root: g, bone: 'Head', bind: new THREE.Matrix4() };
};

// fuzzy-dice earrings: a cherry die on a short gold chain at each earlobe
ACCESSORIES.wreck_dice = (ctx, o) => {
  const { I } = ctx;
  const out = [];
  const gold = ctx.mat('acc', { color: 0xffffff, finish: 'gold', goldTint: true });
  const die = ctx.mat('acc', { color: 0xffffff, finish: 'gloss', map: diceTexture() });
  const ey = I.EYE.l.c.y;
  for (const s of [1, -1]) {
    const g = new THREE.Group();
    const links = []; for (let k = 0; k < 3; k++) { const lg = new THREE.TorusGeometry(0.0028, 0.0007, 6, 12); if (k % 2) lg.rotateY(Math.PI / 2); lg.translate(0, -0.004 - k * 0.0048, 0); links.push(lg); }
    g.add(mesh(mergeGeometries(links), gold, 'links'));
    const d = mesh(new THREE.BoxGeometry(0.019, 0.019, 0.019, 2, 2, 2), die, 'die'); d.position.y = -0.026; d.rotation.set(0.5, 0.7, 0.2); g.add(d);
    out.push({ root: g, bone: 'Head', bind: placeM(V3(s * 0.071, ey - 0.052, I.headC.z - 0.004)) });
  }
  return { root: new THREE.Group(), multi: out };
};

// the heart grenade: a pink porcelain heart with a gold spoon and pull ring, clipped to the sash at the sternum
export function heartGeometry(w = 0.08, depth = 0.034) {
  const s = new THREE.Shape(); const h = w * 0.95;
  s.moveTo(0, -h * 0.5);
  s.bezierCurveTo(w * 0.15, -h * 0.32, w * 0.52, -h * 0.08, w * 0.5, h * 0.18);
  s.bezierCurveTo(w * 0.48, h * 0.46, w * 0.14, h * 0.52, 0, h * 0.28);
  s.bezierCurveTo(-w * 0.14, h * 0.52, -w * 0.48, h * 0.46, -w * 0.5, h * 0.18);
  s.bezierCurveTo(-w * 0.52, -h * 0.08, -w * 0.15, -h * 0.32, 0, -h * 0.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: depth * 0.4, bevelEnabled: true, bevelThickness: depth * 0.3, bevelSize: w * 0.07, bevelSegments: 6, curveSegments: 24 });
  g.translate(0, 0, -depth * 0.2); g.computeVertexNormals();
  return g;
}
export function grenadeParts(mat) {
  const g = new THREE.Group();
  g.add(mesh(heartGeometry(), mat.pink, 'heart'));
  const spoon = mesh(new THREE.TorusGeometry(0.03, 0.0035, 6, 20, Math.PI * 0.9), mat.gold, 'spoon'); spoon.position.set(0.004, 0.012, 0.024); spoon.rotation.z = 0.35; g.add(spoon);
  const ring = mesh(new THREE.TorusGeometry(0.011, 0.0022, 8, 24), mat.gold, 'ring'); ring.position.set(-0.026, 0.03, 0.022); ring.rotation.y = 0.6; g.add(ring);
  const cap = mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.012, 16), mat.gold, 'cap'); cap.position.set(0, 0.032, 0.004); g.add(cap);
  return g;
}
ACCESSORIES.wreck_grenade = (ctx, o) => {
  const { I } = ctx;
  const g = grenadeParts({ pink: ctx.mat('acc', { color: 0xf3a3c0, finish: 'gloss' }), gold: ctx.mat('acc', { color: 0xffffff, finish: 'gold', goldTint: true }) });
  const y = I.Y.bust + 0.03, x = I.side * 0.012;
  const z = surfZ(I, x, y, true, 0);
  return { root: g, bone: 'spine_03', bind: placeM(V3(x, y, z + 0.024), [-10 * deg, 0, I.side * 8 * deg]) };
};

// crash-test targets: the quartered dummy disc, black and gold
function targetDisc(ctx, r) {
  const m = ctx.mat('acc', { color: 0xffffff, finish: 'lacquer', map: targetTexture() });
  const d = mesh(new THREE.CylinderGeometry(r, r, 0.004, 32), m, 'target'); d.rotation.x = Math.PI / 2;
  const g = new THREE.Group(); g.add(d); return g;
}
ACCESSORIES.wreck_targets = (ctx, o) => {
  const { I } = ctx;
  const out = [];
  for (const s of ['l', 'r']) {                           // both knees, on the front
    const k = I.J['calf_' + s];
    const z = surfZ(I, k.x, k.y + 0.01, true);
    out.push({ root: targetDisc(ctx, 0.034), bone: 'calf_' + s, bind: placeM(V3(k.x, k.y + 0.01, z + 0.004)) });
  }
  // a small one on her left temple
  const ex = I.EYE.l.c.x, sx = Math.sign(ex) || I.side;
  out.push({ root: targetDisc(ctx, 0.012), bone: 'Head', bind: placeM(V3(ex + sx * 0.038, I.EYE.l.c.y + 0.028, I.EYE.l.c.z - 0.03), [0, sx * 62 * deg, 0]) });
  return { root: new THREE.Group(), multi: out };
};
// the shoulder target and the studs ride the jacket's left shoulder (they go with it at the second notch)
ACCESSORIES.wreck_shoulder = (ctx, o) => {
  const { I } = ctx;
  const s = o.side === 'r' ? 'r' : 'l';
  const sh = I.J['upperarm_' + s], sx = Math.sign(sh.x) || 1;
  const gold = ctx.mat('acc', { color: 0xffffff, finish: 'gold', goldTint: true });
  const g = new THREE.Group();
  const studs = [];
  for (let i = 0; i < 6; i++) { const sg = new THREE.SphereGeometry(0.0055, 12, 8); sg.scale(1, 0.6, 1); sg.translate(sx * (-0.035 + i * 0.016), 0.038 + Math.sin(i / 5 * Math.PI) * 0.006, 0.0); studs.push(sg); }
  g.add(mesh(mergeGeometries(studs), gold, 'studs'));
  if (o.target) { const t = targetDisc(ctx, 0.03); t.position.set(sx * 0.06, -0.02, 0); t.rotation.y = sx * Math.PI / 2; g.add(t); }
  return { root: g, bone: 'upperarm_' + s, bind: placeM(V3(sh.x + sx * 0.02, sh.y, sh.z - 0.004)) };
};

// her faces (the five states of the design), over the kit's
Object.assign(EXPRESSIONS, {
  wreck_stare: { jaw: 0.06, smileL: 0.1, smileR: 0.05, pucker: 0.05, browIL: 0.0, browOL: 0.15, browIR: 0.0, browOR: 0.15, sneer: 0, pout: 0.1, cheek: 0.1, lidT: 0.58, lidB: 0.12, happy: 0, iris: 1.05, pupil: 1.1, gazeY: 0 },
  wreck_grin: { jaw: 0.34, smileL: 1.0, smileR: 1.0, pucker: 0.0, browIL: 0.4, browOL: 0.35, browIR: 0.4, browOR: 0.35, sneer: 0.1, pout: 0, cheek: 0.95, lidT: 0.7, lidB: 0.5, happy: 0.85, iris: 1, pupil: 1.1, gazeY: 0 },
  wreck_plea: { jaw: 0.14, smileL: -0.35, smileR: -0.35, pucker: 0.15, browIL: 1.0, browOL: -0.45, browIR: 1.0, browOR: -0.45, sneer: 0, pout: 0.45, cheek: 0, lidT: 0.22, lidB: 0.05, happy: 0, iris: 1.08, pupil: 1.25, gazeY: 0.04 },
  wreck_kiss: { jaw: 0.0, smileL: 0.0, smileR: 0.0, pucker: 1.0, browIL: 0.3, browOL: 0.2, browIR: 0.3, browOR: 0.2, sneer: 0, pout: 0.9, cheek: 0.2, lidT: 0.68, lidB: 0.2, happy: 0, iris: 1, pupil: 1, gazeY: -0.05 },
  wreck_wrecked: { jaw: 0.42, smileL: 0.75, smileR: -0.1, pucker: 0.0, browIL: 0.55, browOL: 0.6, browIR: -0.3, browOR: 0.2, sneer: 0.35, pout: 0, cheek: 0.4, lidT: -0.1, lidB: 0.0, happy: 0, iris: 0.92, pupil: 0.55, gazeY: 0 },
});

export const WRECK = {
  name: 'THE WRECK', body: 'female', scale: 1.15, porcelain: 0xf2eee9, gold: 0xffbd54,
  skin: { roughness: 0.08, coatRough: 0.035 },
  layers: [
    { kind: 'bottom', from: 'navel', hem: 'ankle', color: 0xe8336d, finish: 'gloss', trim: { color: 'gold', width: 0.008, relief: 0.0005 } },
    { kind: 'top', from: 'navel', neckline: 'crew', sleeves: 'cap', color: 0xfbfaf7, finish: 'satin', trim: { color: 'gold', width: 0.006, relief: 0.0004 } },
    { kind: 'patch', at: [0.0, 1.18, 0.11], r: 0.045, color: 0x6b3a8c, finish: 'gloss' },
    { kind: 'patch', at: [0.0, 1.18, 0.11], r: 0.022, color: 0xd9a441, finish: 'gold' },
    { kind: 'top', from: 'waist', neckline: 'plunge', depth: 0.3, width: 0.16, sleeves: 'elbow', color: 0x0b0a0d, finish: 'lacquer', trim: { color: 'gold', width: 0.007, relief: 0.0006 }, shell: { thickness: 0.008, smooth: 6 } },
    { kind: 'sash', side: 'l', width: 0.05, color: 0x111114, finish: 'satin', trim: { color: 0xd8dde2, width: 0.004 } },
  ],
  hair: { style: 'crop', color: 0xf4ede0, finish: 'pearl', gild: 0.4 },
  face: {
    brows: { color: '#0b0a0d', shape: 'thin', thick: 0.75, lift: 0.15 },
    liner: { color: '#060506', thick: 1.35, wing: 1.6 },
    lashes: { color: '#d9a441', n: 9, len: 1.15, lower: 0.25 },
    shadow: { color: '#5a3a6e', amount: 0.55 },
    lips: { color: '#b0102e', shape: 'natural', line: 0.4, gloss: 0.8 },
    blush: { color: '#ff6f86', amount: 0.15 },
  },
  eyes: { iris: 0x060608, iris2: 0x16141c, ring: true, white: 0.22 },
  accessories: [
    { type: 'wreck_sweep', name: 'sweep' },
    { type: 'wreck_dice', name: 'dice' },
    { type: 'wreck_grenade', name: 'grenade' },
    { type: 'wreck_targets', name: 'targets' },
    { type: 'wreck_shoulder', name: 'studs_l', side: 'l', target: true },
    { type: 'wreck_shoulder', name: 'studs_r', side: 'r' },
    { type: 'shoes', from: 'ankle', color: 0xb0102e, toe: 'point', smooth: 10 },
  ],
  breaks: ['sweep', 'shoulder_l', 'face'],
};

// paint what the kit's face paint doesn't: a bruise blooming violet to gold on her left cheekbone, and a glossy
// cherry drip from the left corner of her mouth to the chin
export function paintWounds(fig) {
  const tex = fig.face && fig.face.texture, cv = tex && tex.image;
  if (!cv || !cv.getContext) return;
  const I = fig.I, R = I.faceRect, S = cv.width, x = cv.getContext('2d');
  const P = (bx, by) => { const [u, v] = I.toUV(bx, by); return [(u - R[0]) / (R[2] - R[0]) * S, (v - R[1]) / (R[3] - R[1]) * S]; };
  const pxm = Math.abs(P(0.01, 0)[0] - P(0, 0)[0]) * 100;
  const e = I.EYE.l, out = Math.sign(e.c.x) || I.side;
  const [bx, by] = P(e.c.x + out * 0.016, e.c.y - 0.03);
  const g = x.createRadialGradient(bx, by, 0, bx, by, 0.026 * pxm);
  g.addColorStop(0, 'rgba(217,164,65,0.7)'); g.addColorStop(0.35, 'rgba(150,80,140,0.55)'); g.addColorStop(0.7, 'rgba(107,58,140,0.42)'); g.addColorStop(1, 'rgba(107,58,140,0)');
  x.fillStyle = g; x.beginPath(); x.ellipse(bx, by, 0.03 * pxm, 0.02 * pxm, 0.3, 0, Math.PI * 2); x.fill();
  // the drip
  const cx = out * I.MOUTH.halfW * 0.92, cy = I.MOUTH.y - 0.002;
  const pts = [[cx, cy], [cx + out * 0.002, cy - 0.012], [cx + out * 0.001, cy - 0.026], [cx + out * 0.003, cy - 0.04]].map(([a, b]) => P(a, b));
  x.strokeStyle = 'rgba(176,16,46,0.95)'; x.lineCap = 'round';
  for (let i = 0; i < pts.length - 1; i++) { x.lineWidth = (0.0034 - i * 0.0006) * pxm; x.beginPath(); x.moveTo(...pts[i]); x.lineTo(...pts[i + 1]); x.stroke(); }
  x.fillStyle = 'rgba(176,16,46,0.95)'; const [dx, dy] = pts[pts.length - 1]; x.beginPath(); x.arc(dx, dy, 0.0024 * pxm, 0, Math.PI * 2); x.fill();
  tex.needsUpdate = true;
}

// a loose heart grenade (in her hand, in the air, stuck to someone): the same parts, its own glaze-free materials
export function looseGrenade() {
  const pink = new THREE.MeshPhysicalMaterial({ color: 0xf3a3c0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xffc35a, roughness: 0.25, metalness: 1 });
  const g = grenadeParts({ pink, gold }); g.scale.setScalar(1.15 * 1.4);
  return g;
}
