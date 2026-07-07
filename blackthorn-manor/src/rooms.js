// Furnishing: every room dressed from a primitive-built Victorian prop kit,
// and every clue, key and document placed into the world as an interactable.
import * as THREE from 'three';
import { makePortraitTexture } from './textures.js';
import { LV } from './world.js';

let M, W, CTX, S;
const CANDLES = [];   // virtual candle lights {x,y,z,r,intensity,color}
const FLAMES = [];    // flame meshes to flicker
export function getCandles() { return CANDLES; }
export function getFlames() { return FLAMES; }

/* ============================ prop kit ============================ */

function grp(x, y, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  S.add(g);
  return g;
}
function bx(g, w, h, d, mat, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  return m;
}
function cyl(g, r0, r1, h, mat, x = 0, y = 0, z = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}
function collideBox(g, w, d, h = 1.4) {
  // axis-aligned collider around a (possibly rotated) group — use its world pos
  const p = g.position;
  const ry = ((g.rotation.y % Math.PI) + Math.PI) % Math.PI;
  const swap = ry > Math.PI / 4 && ry < (3 * Math.PI) / 4;
  const hw = (swap ? d : w) / 2, hd = (swap ? w : d) / 2;
  W.colliders.push({
    min: new THREE.Vector3(p.x - hw, p.y, p.z - hd),
    max: new THREE.Vector3(p.x + hw, p.y + h, p.z + hd),
  });
}
function candle(x, y, z, opts = {}) {
  CANDLES.push({ x, y: y + (opts.dy ?? 0.32), z, intensity: opts.i ?? 6.5, color: opts.color ?? 0xff9540, r: opts.r ?? 9 });
}
function flameMesh(g, x, y, z, s = 1) {
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.028 * s, 6, 6), M.flame);
  f.position.set(x, y, z);
  f.scale.y = 1.9;
  g.add(f);
  FLAMES.push(f);
  return f;
}
function candleStick(g, x, yBase, z, lit = true) {
  const h = 0.22;
  cyl(g, 0.035, 0.05, h, M.brass, x, yBase + h / 2, z, 8);
  cyl(g, 0.018, 0.018, 0.12, M.candleWax, x, yBase + h + 0.06, z, 6);
  if (lit) {
    flameMesh(g, x, yBase + h + 0.15, z);
    candle(g.position.x + x, g.position.y + yBase + h + 0.1, g.position.z + z, { i: 3.5, r: 6, dy: 0 });
  }
}

function table(x, y, z, w = 1.4, d = 0.8, ry = 0, mat) {
  const g = grp(x, y, z, ry);
  mat = mat || M.woodDark;
  bx(g, w, 0.06, d, mat, 0, 0.76, 0);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    bx(g, 0.07, 0.76, 0.07, mat, lx * (w / 2 - 0.08), 0.38, lz * (d / 2 - 0.08));
  collideBox(g, w, d, 0.85);
  return g;
}
function chair(x, y, z, ry = 0, mat) {
  const g = grp(x, y, z, ry);
  mat = mat || M.woodDark;
  bx(g, 0.46, 0.05, 0.44, mat, 0, 0.46, 0);
  bx(g, 0.46, 0.55, 0.05, mat, 0, 0.78, -0.2);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    bx(g, 0.05, 0.46, 0.05, mat, lx * 0.19, 0.23, lz * 0.18);
  collideBox(g, 0.5, 0.5, 1.0);
  return g;
}
function armchair(x, y, z, ry = 0, fab) {
  const g = grp(x, y, z, ry);
  fab = fab || M.fabricRed;
  bx(g, 0.8, 0.3, 0.75, fab, 0, 0.3, 0);
  bx(g, 0.8, 0.62, 0.18, fab, 0, 0.6, -0.32);
  bx(g, 0.16, 0.28, 0.6, fab, -0.34, 0.56, 0.02);
  bx(g, 0.16, 0.28, 0.6, fab, 0.34, 0.56, 0.02);
  collideBox(g, 0.85, 0.8, 1.0);
  return g;
}
function sofa(x, y, z, ry = 0, fab) {
  const g = grp(x, y, z, ry);
  fab = fab || M.fabricGreen;
  bx(g, 1.9, 0.32, 0.8, fab, 0, 0.3, 0);
  bx(g, 1.9, 0.6, 0.2, fab, 0, 0.62, -0.32);
  bx(g, 0.18, 0.3, 0.66, fab, -0.88, 0.56, 0);
  bx(g, 0.18, 0.3, 0.66, fab, 0.88, 0.56, 0);
  collideBox(g, 1.95, 0.85, 1.0);
  return g;
}
function bed(x, y, z, ry = 0, big = true) {
  const g = grp(x, y, z, ry);
  const w = big ? 1.7 : 1.0, len = big ? 2.2 : 1.7;
  for (const [lx, lz, h] of [[-1, -1, 1.9], [1, -1, 1.9], [-1, 1, 1.5], [1, 1, 1.5]])
    cyl(g, 0.05, 0.06, h, M.woodDark, lx * (w / 2), h / 2, lz * (len / 2), 8);
  bx(g, w, 0.35, len, M.woodDark, 0, 0.3, 0);
  bx(g, w - 0.06, 0.16, len - 0.1, M.linen, 0, 0.55, 0);
  bx(g, w - 0.1, 0.1, 0.5, M.fabricDark, 0, 0.64, -len / 2 + 0.35);
  if (big) { // canopy
    bx(g, w + 0.1, 0.06, len + 0.1, M.fabricDark, 0, 2.0, 0);
    bx(g, w + 0.1, 0.3, 0.04, M.curtain, 0, 1.82, -len / 2 - 0.02);
  }
  collideBox(g, w + 0.1, len + 0.1, 0.9);
  return g;
}
function wardrobe(x, y, z, ry = 0) {
  const g = grp(x, y, z, ry);
  bx(g, 1.5, 2.2, 0.62, M.woodDark, 0, 1.1, 0);
  bx(g, 0.66, 1.9, 0.05, M.woodMid, -0.36, 1.05, 0.32);
  bx(g, 0.66, 1.9, 0.05, M.woodMid, 0.36, 1.05, 0.32);
  cyl(g, 0.025, 0.025, 0.1, M.brass, -0.06, 1.1, 0.36, 6);
  cyl(g, 0.025, 0.025, 0.1, M.brass, 0.06, 1.1, 0.36, 6);
  collideBox(g, 1.55, 0.7, 2.2);
  return g;
}
function dresser(x, y, z, ry = 0, mirror = false) {
  const g = grp(x, y, z, ry);
  bx(g, 1.3, 0.95, 0.55, M.woodMid, 0, 0.48, 0);
  for (let i = 0; i < 3; i++) bx(g, 1.1, 0.02, 0.57, M.woodDark, 0, 0.25 + i * 0.26, 0.0);
  if (mirror) {
    bx(g, 0.7, 0.9, 0.05, M.frameGold, 0, 1.5, -0.2);
    bx(g, 0.6, 0.8, 0.02, M.mirror, 0, 1.5, -0.17);
  }
  collideBox(g, 1.35, 0.6, 1.0);
  return g;
}
function desk(x, y, z, ry = 0) {
  const g = grp(x, y, z, ry);
  bx(g, 1.5, 0.06, 0.8, M.leather, 0, 0.78, 0);
  bx(g, 0.45, 0.72, 0.75, M.woodDark, -0.5, 0.36, 0);
  bx(g, 0.45, 0.72, 0.75, M.woodDark, 0.5, 0.36, 0);
  collideBox(g, 1.55, 0.85, 0.85);
  return g;
}
function bookshelf(x, y, z, ry = 0, w = 1.8, h = 2.4) {
  const g = grp(x, y, z, ry);
  bx(g, w, h, 0.36, M.woodDark, 0, h / 2, 0);
  const rows = Math.floor(h / 0.42);
  for (let i = 0; i < rows; i++) {
    const bm = M.bookRows[(i + Math.abs(Math.round(x + z))) % 3];
    bx(g, w - 0.12, 0.34, 0.26, bm, 0, 0.28 + i * 0.42, 0.06);
  }
  collideBox(g, w + 0.02, 0.42, h);
  return g;
}
function fireplace(x, y, z, ry = 0, lit = false) {
  const g = grp(x, y, z, ry);
  bx(g, 1.9, 1.3, 0.5, M.stone, 0, 0.65, 0);
  bx(g, 2.1, 0.12, 0.6, M.woodDark, 0, 1.32, 0);
  bx(g, 1.1, 0.9, 0.4, new THREE.MeshBasicMaterial({ color: '#050403' }), 0, 0.45, 0.08);
  if (lit) {
    const em = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), M.ember);
    em.position.set(0, 0.18, 0.12); em.scale.set(1.6, 0.5, 1);
    g.add(em);
    FLAMES.push(em);
    candle(x, y + 0.3, z, { i: 9, color: 0xff6a20, r: 8, dy: 0 });
  }
  collideBox(g, 1.95, 0.6, 1.4);
  return g;
}
function grandPiano(x, y, z, ry = 0) {
  const g = grp(x, y, z, ry);
  bx(g, 1.5, 0.22, 2.1, M.woodDark, 0, 0.85, 0);
  bx(g, 1.4, 0.5, 2.0, M.woodDark, 0, 0.55, 0);
  bx(g, 1.3, 0.04, 0.3, M.candleWax, 0, 0.82, -1.15); // keys
  for (const [lx, lz] of [[-1, -1], [1, -1], [0, 1]])
    cyl(g, 0.05, 0.07, 0.65, M.woodDark, lx * 0.6, 0.32, lz * 0.85, 8);
  collideBox(g, 1.6, 2.3, 1.1);
  return g;
}
function billiardTable(x, y, z, ry = 0) {
  const g = grp(x, y, z, ry);
  bx(g, 1.6, 0.18, 2.9, M.fabricGreen, 0, 0.8, 0);
  bx(g, 1.75, 0.14, 3.05, M.woodDark, 0, 0.68, 0);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    bx(g, 0.16, 0.68, 0.16, M.woodDark, lx * 0.72, 0.34, lz * 1.35);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshStandardMaterial({ color: ['#c8bfa8', '#7a1f1f', '#1f2f5a', '#caa53a', '#222'][i], roughness: 0.3 }));
    b.position.set((i - 2) * 0.18 + (i % 2) * 0.1, 0.93, (i % 3 - 1) * 0.5);
    g.add(b);
  }
  collideBox(g, 1.8, 3.1, 0.95);
  return g;
}
function grandfatherClock(x, y, z, ry = 0) {
  const g = grp(x, y, z, ry);
  bx(g, 0.6, 2.3, 0.4, M.woodDark, 0, 1.15, 0);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), M.candleWax);
  face.position.set(0, 1.9, 0.21);
  g.add(face);
  bx(g, 0.02, 0.14, 0.01, M.iron, 0, 1.93, 0.215);   // hands, stopped
  bx(g, 0.1, 0.02, 0.01, M.iron, 0.04, 1.9, 0.215);
  cyl(g, 0.06, 0.06, 0.5, M.brass, 0, 1.2, 0.1, 8);  // pendulum, still
  collideBox(g, 0.65, 0.45, 2.3);
  return g;
}
function chandelier(x, y, z, big = false) {
  const g = grp(x, y, z);
  const arms = big ? 8 : 6, R = big ? 0.85 : 0.55;
  cyl(g, 0.03, 0.03, 1.2, M.iron, 0, 0.6, 0, 6);
  cyl(g, 0.16, 0.22, 0.25, M.brass, 0, 0, 0, 10);
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2;
    const ax = Math.cos(a) * R, az = Math.sin(a) * R;
    bx(g, R, 0.03, 0.03, M.brass, ax / 2, 0.05, az / 2, -a);
    cyl(g, 0.02, 0.02, 0.14, M.candleWax, ax, 0.12, az, 6);
    flameMesh(g, ax, 0.24, az, 0.9);
  }
  candle(x, y + 0.15, z, { i: big ? 24 : 14, r: big ? 16 : 11, color: 0xffa050, dy: 0 });
  return g;
}
function sconce(x, y, z, nx, nz) {
  // wall candle: nx/nz = outward normal
  const g = grp(x, y, z);
  bx(g, 0.1, 0.24, 0.1, M.brass, 0, 0, 0);
  cyl(g, 0.016, 0.016, 0.14, M.candleWax, nx * 0.09, 0.14, nz * 0.09, 6);
  flameMesh(g, nx * 0.09, 0.25, nz * 0.09, 0.85);
  candle(x + nx * 0.12, y + 0.2, z + nz * 0.12, { i: 4.5, r: 7, dy: 0 });
  return g;
}
function portrait(x, y, z, ry, seed, opts = {}) {
  const g = grp(x, y, z, ry);
  const w = opts.w ?? 0.9, h = opts.h ?? 1.15;
  bx(g, w + 0.14, h + 0.14, 0.07, M.frameGold, 0, 0, 0);
  const canvasMat = new THREE.MeshStandardMaterial({ map: makePortraitTexture(seed, opts), roughness: 0.85 });
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), canvasMat);
  pm.position.z = 0.045;
  g.add(pm);
  return g;
}
function mirrorTall(x, y, z, ry) {
  const g = grp(x, y, z, ry);
  bx(g, 1.0, 2.2, 0.08, M.frameGold, 0, 1.1, 0);
  bx(g, 0.86, 2.05, 0.02, M.mirror, 0, 1.1, 0.045);
  collideBox(g, 1.0, 0.2, 2.2);
  return g;
}
function rug(x, y, z, w, d, mat, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), mat || M.carpetRed);
  m.position.set(x, y + 0.012, z);
  m.rotation.y = ry;
  m.receiveShadow = true;
  S.add(m);
  return m;
}
function curtains(x, y, z, isX, w = 1.6) {
  // two panels flanking a window
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(isX ? w * 0.32 : 0.1, 2.4, isX ? 0.1 : w * 0.32), M.curtain);
    p.position.set(x + (isX ? s * w * 0.42 : 0.18 * Math.sign(30 - x)), y + 1.9, z + (isX ? 0.18 * Math.sign(20 - z) : s * w * 0.42));
    p.castShadow = true;
    S.add(p);
  }
}
function sheeted(x, y, z, ry, w = 1.2, h = 1.1, d = 0.8) {
  const g = grp(x, y, z, ry);
  const m = bx(g, w, h, d, M.sheet, 0, h / 2, 0);
  m.scale.set(1, 1, 1);
  bx(g, w * 0.7, 0.25, d * 0.7, M.sheet, 0, h + 0.1, 0);
  collideBox(g, w, d, h);
  return g;
}
function crate(x, y, z, ry = 0, s = 0.7) {
  const g = grp(x, y, z, ry);
  bx(g, s, s * 0.8, s, M.woodMid, 0, s * 0.4, 0);
  collideBox(g, s, s, s * 0.8);
  return g;
}
function barrel(x, y, z) {
  const g = grp(x, y, z);
  cyl(g, 0.34, 0.28, 0.9, M.woodMid, 0, 0.45, 0, 12);
  collideBox(g, 0.7, 0.7, 0.95);
  return g;
}
function wineRack(x, y, z, ry) {
  const g = grp(x, y, z, ry);
  bx(g, 2.0, 1.9, 0.5, M.woodDark, 0, 0.95, 0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++)
    cyl(g, 0.045, 0.045, 0.4, new THREE.MeshStandardMaterial({ color: '#1a2410', roughness: 0.4 }),
      -0.8 + j * 0.32, 0.4 + i * 0.4, 0.08, 6).rotation.x = Math.PI / 2;
  collideBox(g, 2.05, 0.55, 1.95);
  return g;
}
function paperProp(x, y, z, ry = 0) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.32), M.paper);
  p.rotation.set(-Math.PI / 2, 0, ry);
  p.position.set(x, y, z);
  S.add(p);
  return p;
}
function bookProp(x, y, z, ry = 0, color = '#4a2a20') {
  const g = grp(x, y, z, ry);
  bx(g, 0.24, 0.05, 0.32, new THREE.MeshStandardMaterial({ color, roughness: 0.7 }), 0, 0.025, 0);
  return g;
}
function stove(x, y, z, ry) {
  const g = grp(x, y, z, ry);
  bx(g, 1.8, 0.9, 0.75, M.iron, 0, 0.45, 0);
  cyl(g, 0.09, 0.09, 1.6, M.iron, 0.5, 1.7, -0.1, 8);
  for (let i = 0; i < 3; i++) cyl(g, 0.14, 0.14, 0.03, M.iron, -0.5 + i * 0.45, 0.92, 0, 10);
  collideBox(g, 1.85, 0.8, 1.0);
  return g;
}
function pew(x, y, z, ry) {
  const g = grp(x, y, z, ry);
  bx(g, 2.4, 0.05, 0.4, M.woodDark, 0, 0.45, 0);
  bx(g, 2.4, 0.6, 0.05, M.woodDark, 0, 0.75, -0.2);
  bx(g, 0.05, 0.45, 0.4, M.woodDark, -1.15, 0.22, 0);
  bx(g, 0.05, 0.45, 0.4, M.woodDark, 1.15, 0.22, 0);
  collideBox(g, 2.45, 0.45, 1.05);
  return g;
}
function tomb(x, y, z, ry, name) {
  const g = grp(x, y, z, ry);
  bx(g, 0.9, 0.7, 2.0, M.stoneDark, 0, 0.35, 0);
  bx(g, 1.0, 0.12, 2.1, M.stone, 0, 0.76, 0);
  collideBox(g, 1.0, 2.1, 0.85);
  g.userData.tombName = name;
  return g;
}
function deadPlant(x, y, z) {
  const g = grp(x, y, z);
  cyl(g, 0.22, 0.16, 0.35, new THREE.MeshStandardMaterial({ color: '#5a3c22', roughness: 1 }), 0, 0.18, 0, 8);
  for (let i = 0; i < 5; i++) {
    const st = cyl(g, 0.008, 0.012, 0.7, new THREE.MeshStandardMaterial({ color: '#2a2418', roughness: 1 }), 0, 0.7, 0, 4);
    st.rotation.z = (i - 2) * 0.28;
    st.position.x = (i - 2) * 0.06;
  }
  collideBox(g, 0.4, 0.4, 0.6);
  return g;
}
function coatStand(x, y, z, withCoat = false) {
  const g = grp(x, y, z);
  cyl(g, 0.03, 0.25, 1.8, M.woodDark, 0, 0.9, 0, 8);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    bx(g, 0.22, 0.03, 0.03, M.woodDark, Math.cos(a) * 0.12, 1.68, Math.sin(a) * 0.12, -a);
  }
  if (withCoat) bx(g, 0.5, 1.1, 0.3, M.fabricDark, 0.1, 1.1, 0.05);
  collideBox(g, 0.5, 0.5, 1.8);
  return g;
}
function dressForm(x, y, z) {
  const g = grp(x, y, z);
  cyl(g, 0.02, 0.3, 1.0, M.woodDark, 0, 0.5, 0, 8);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.75, 10), M.linen);
  torso.position.y = 1.35;
  g.add(torso);
  collideBox(g, 0.45, 0.45, 1.75);
  return g;
}
function ropeBarrier(x, y, z, ry) {
  const g = grp(x, y, z, ry);
  for (const s of [-1, 1]) cyl(g, 0.03, 0.09, 0.95, M.brass, s * 0.7, 0.48, 0, 8);
  const rope = cyl(g, 0.02, 0.02, 1.4, new THREE.MeshStandardMaterial({ color: '#6a1c1c', roughness: 1 }), 0, 0.82, 0, 6);
  rope.rotation.z = Math.PI / 2;
  return g;
}

/* ============================ furnishing ============================ */

export function furnish(world, mats, ctx) {
  M = mats; W = world; CTX = ctx; S = world.scene;
  const R = (id) => world.roomById[id];
  const F = LV.first.floor, G = 0, B = LV.basement.floor, A = LV.attic.floor;

  /* ------------ THE GRAND FOYER ------------ */
  {
    chandelier(30, 5.4, 34.5, true);
    rug(30, G, 38.4, 4.4, 2.8, M.carpetRed);
    table(25, G, 36.8, 1.3, 1.3);
    const news = paperProp(25.1, 0.82, 36.7, 0.3);
    ctx.doc(news, 'clipping', 'a yellowed newspaper');
    coatStand(23.2, G, 38.8);
    deadPlant(36.8, G, 38.8);
    sconce(22.35, 2.0, 34, 1, 0); sconce(37.65, 2.0, 34, -1, 0);
    portrait(30, 2.6, 39.72, Math.PI, 101, { w: 1.4, h: 1.8 });     // over the door
    portrait(22.35, 2.2, 32.5, Math.PI / 2, 102);
    portrait(37.65, 2.2, 32.5, -Math.PI / 2, 103);
    // executor's notice on the front door
    const note = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), M.paper);
    note.position.set(29.2, 1.6, 39.55); note.rotation.y = Math.PI;
    S.add(note);
    ctx.doc(note, 'frontDoorNote', 'a notice nailed to the door');
    // your letter of engagement — auto-read at start (handled in events)
  }

  /* ------------ CORRIDORS ------------ */
  {
    rug(30, G, 28, 46, 1.8, M.runner);
    rug(30, F, 28, 46, 1.8, M.runner);
    rug(30, G, 14, 46, 1.6, M.runner);
    for (const x of [6, 14, 22, 38, 46, 54]) {
      sconce(x, 2.0, 26.2, 0, 1);
      sconce(x, F + 1.9, 26.2, 0, 1);
      sconce(x, 2.0, 12.2, 0, 1);
    }
    for (const x of [10, 26, 42]) {
      const st = table(x, G, 26.6, 0.9, 0.45, 0);
      if (x === 26) candleStick(st, 0, 0.79, 0); // candle on the side table
    }
    portrait(4, 2.1, 26.2, 0, 111); portrait(18, 2.1, 26.2, 0, 112);
    portrait(34, 2.1, 26.2, 0, 113); portrait(50, 2.1, 26.2, 0, 114);
    portrait(12, F + 2.0, 26.2, 0, 115); portrait(44, F + 2.0, 26.2, 0, 116);
    grandfatherClock(1.2, G, 27, Math.PI / 2);
    ctx.examine(grandfatherClock(58.8, G, 13, -Math.PI / 2), 'a grandfather clock',
      'Stopped at 11:47. Every clock in this house is stopped at 11:47.');
  }

  /* ------------ LIBRARY ------------ */
  {
    // north wall run leaves the corridor doorway (x14–16) clear
    for (const bxp of [9.2, 11.3, 13.4, 17.8, 19.9]) bookshelf(bxp, G, 30.5, 0, 1.9);
    bookshelf(8.5, G, 39.4, Math.PI, 1.9); bookshelf(12.5, G, 39.4, Math.PI, 1.9);
    bookshelf(20.5, G, 31.5, -Math.PI / 2, 1.9); bookshelf(20.5, G, 38, -Math.PI / 2, 1.9);
    fireplace(14.5, G, 39.55, Math.PI, true);
    rug(14, G, 35, 5, 3.4, M.carpetBlue);
    armchair(13, G, 35.5, 2.6); armchair(15.4, G, 35.2, -2.6, M.fabricGreen);
    table(14.2, G, 33.8, 0.8, 0.8);
    const ldesk = desk(10.5, G, 36.5, Math.PI / 2);
    candleStick(ldesk, 0.4, 0.78, 0.2);
    // the false spine
    const shelf = bookshelf(16.7, G, 30.5, 0, 1.9);
    ctx.interact(shelf, 'a shelf of sermons', () => {
      if (!ctx.game.flags.ledgerFound) {
        ctx.game.flags.ledgerFound = true;
        ctx.toastMsg('One spine is false — “Sermons, Vol. IX” swings open.');
        ctx.audio.creak();
        setTimeout(() => ctx.readDoc('ledger'), 900);
      } else ctx.readDoc('ledger');
    });
    sconce(8.35, 2.1, 34, 1, 0);
  }

  /* ------------ STUDY ------------ */
  {
    const d = desk(4, G, 34, 0);
    chair(4, G, 35.2, Math.PI);
    paperProp(3.6, 0.82, 34, 0.2); bookProp(4.5, 0.82, 34.2, 0.4);
    candleStick(d, -0.5, 0.78, 0.2);
    ctx.interact(d, 'the desk drawer', () => {
      if (ctx.game.hasKey('deskKey')) {
        if (!ctx.game.flags.drawerOpen) { ctx.game.flags.drawerOpen = true; ctx.audio.unlock(); }
        ctx.readDoc('coroner');
      } else ctx.toastMsg('Locked. A small keyhole, worn with use.');
    });
    bookshelf(1.2, G, 30.5, 0, 1.9);
    bookshelf(6.8, G, 30.4, 0, 1.6);
    fireplace(0.45, G, 34, Math.PI / 2);
    portrait(4, 2.3, 39.65, Math.PI, 121, {}); // Sir Edmund glowering
    armchair(6.5, G, 37.5, -2.2);
    grandfatherClock(7.4, G, 30.8, Math.PI);
    rug(4, G, 35, 3.4, 2.6, M.carpetRed);
  }

  /* ------------ DINING ROOM ------------ */
  {
    const t = table(44, G, 34.8, 1.6, 5.4);
    for (let i = 0; i < 3; i++) {
      chair(43, G, 32.6 + i * 1.8, Math.PI / 2);
      chair(45, G, 32.6 + i * 1.8, -Math.PI / 2);
    }
    candleStick(t, 0, 0.79, -1.4); candleStick(t, 0, 0.79, 0); candleStick(t, 0, 0.79, 1.4);
    chandelier(44, 3.1, 34.8);
    dresser(39, G, 30.7, 0);
    dresser(49.3, G, 37.8, -Math.PI / 2); // clear of the kitchen doorway
    fireplace(44, G, 39.55, Math.PI, false);
    portrait(39, 2.2, 34, Math.PI / 2, 131, { w: 1.1, h: 1.4 });
    ctx.examine(t, 'the long table', 'Laid for three, five years ago. The dust lies on the plates like snow. One chair is knocked over — no. It was set down carefully, on its side.');
    rug(44, G, 34.8, 4.4, 7, M.carpetBlue);
  }

  /* ------------ KITCHEN ------------ */
  {
    stove(57.5, G, 31.5, Math.PI); // against north wall? actually east
    table(55, G, 35, 1.2, 3.0);
    dresser(51, G, 30.8, 0);
    for (let i = 0; i < 5; i++) {
      const pot = cyl(grp(53 + i * 1.2, 2.4, 31.2), 0.12, 0.15, 0.2, M.iron);
    }
    barrel(50.8, G, 38.8);
    crate(52.3, G, 39, 0.4);
    ctx.examine(dresser(58.9, G, 36, -Math.PI / 2), 'the kitchen dresser',
      'Good plate, untouched. Mice have been at the pantry book. The last entry, October 1899: “Bonfire night — cook off. Cold supper laid for the family. V. to dine OUT (again).” He was meant to be away that night.');
  }

  /* ------------ BALLROOM ------------ */
  {
    chandelier(6, 5.6, 21, true); chandelier(13, 5.6, 21, true);
    grandPiano(3.5, G, 17.5, 0.5);
    ctx.props.ballroomPiano = { x: 3.5, z: 17.5 };
    for (let i = 0; i < 4; i++) sheeted(3 + i * 3.6, G, 24.4, i * 0.7, 1.3, 1.15, 0.9);
    mirrorTall(0.35, G, 19, Math.PI / 2); mirrorTall(0.35, G, 23, Math.PI / 2);
    sheeted(15.5, G, 17.5, 0.2, 2.2, 1.0, 1.0);
    rug(9, G, 21, 10, 6, M.carpetBlue);
    ctx.examine(mirrorTall(17.6, G, 21, -Math.PI / 2), 'a tall mirror',
      'Your lantern, your face — and for half a heartbeat, high in the glass, a pale figure on the gallery behind you. You turn. Nothing. Of course, nothing.');
  }

  /* ------------ BILLIARDS / SMOKING ------------ */
  {
    billiardTable(23, G, 21);
    bx(grp(18.35, 1.3, 21, 0), 0.08, 1.6, 1.2, M.woodDark); // cue rack
    sofa(26.5, G, 17.3, Math.PI);
    sconce(18.35, 2.0, 19, 1, 0); sconce(27.65, 2.0, 23, -1, 0);
    // smoking room
    armchair(30.5, G, 21.5, 1.4); armchair(33.5, G, 21.6, -1.4, M.fabricDark);
    table(32, G, 20.6, 0.9, 0.9);
    const cards = table(32, G, 22.8, 1.1, 1.1);
    ctx.examine(cards, 'a card table', 'A hand of whist, abandoned mid-trick. Brandy in the glasses gone to varnish. Under one chair, a scattering of markers from a Leeds club — V.B., V.B., V.B.');
    fireplace(35.5, G, 21, -Math.PI / 2, true);
    grandfatherClock(28.6, G, 16.8, 0);
    rug(32, G, 21, 5.5, 4.5, M.carpetRed);
  }

  /* ------------ DRAWING ROOM ------------ */
  {
    sofa(42, G, 20, 0); armchair(39.5, G, 21.8, 0.9); armchair(44.5, G, 21.8, -0.9);
    table(42, G, 21.6, 1.1, 0.7);
    fireplace(47.55, G, 17.6, -Math.PI / 2, true); // clear of the conservatory door
    chandelier(42, 3.1, 21);
    portrait(42, 2.35, 16.35, 0, 141, { w: 1.6, h: 1.9, family: true });
    ctx.examine(portrait(38, 2.2, 16.35, 0, 142, { woman: true }), 'a portrait of Lady Constance',
      'Painted the year before her death. The painter caught something the inquest did not: she looks over her shoulder, as if listening for a step behind her.');
    rug(42.5, G, 20.8, 6.5, 5, M.carpetBlue);
    deadPlant(36.7, G, 24.8); deadPlant(47.4, G, 24.9);
  }

  /* ------------ CONSERVATORY ------------ */
  {
    for (let i = 0; i < 6; i++) deadPlant(49.5 + (i % 3) * 3.6, G, 17.7 + Math.floor(i / 3) * 5.8);
    table(54, G, 21, 1.0, 2.6); // potting bench
    const cage = grp(57.5, G, 18.2);
    cyl(cage, 0.32, 0.32, 0.7, M.iron, 0, 1.5, 0, 10);
    cyl(cage, 0.02, 0.02, 1.15, M.iron, 0, 0.6, 0, 6);
    ctx.props.birdcage = cage;
    ctx.examine(cage, 'an empty birdcage', 'The little door stands open. Mrs. Grady’s canary. Nobody freed it — the door was found open the morning after, like every other door in the house.');
    barrel(58.8, G, 23);
  }

  /* ------------ CHAPEL ------------ */
  {
    for (let i = 0; i < 3; i++) { pew(6, G, 4.5 + i * 1.9, 0); pew(9.5, G, 4.5 + i * 1.9, 0); }
    const altar = grp(8, G, 1.3);
    bx(altar, 2.2, 1.0, 0.8, M.stone, 0, 0.5, 0);
    bx(altar, 2.4, 0.1, 0.9, M.stoneDark, 0, 1.02, 0);
    collideBox(altar, 2.4, 0.95, 1.1);
    candleStick(altar, -0.8, 1.06, 0); candleStick(altar, 0.8, 1.06, 0);
    const card = paperProp(8, 1.09, 1.3, 0.15);
    ctx.doc(card, 'chapelNote', 'a card upon the altar');
    // cross
    bx(altar, 0.1, 0.7, 0.1, M.brass, 0, 1.5, -0.2);
    bx(altar, 0.36, 0.1, 0.1, M.brass, 0, 1.62, -0.2);
    sconce(0.5, 2.2, 6, 1, 0); sconce(11.5, 2.2, 6, -1, 0);
  }

  /* ------------ MUSIC ROOM ------------ */
  {
    grandPiano(17, G, 6, -0.6);
    ctx.props.musicPiano = { x: 17, z: 6 };
    const st = grp(19.8, G, 3.2);
    cyl(st, 0.02, 0.14, 1.1, M.woodDark, 0, 0.55, 0, 6);
    bx(st, 0.5, 0.4, 0.03, M.woodDark, 0, 1.2, 0);
    paperProp(19.8, 1.41, 3.19, 0.1).rotation.x = -1.2;
    ctx.examine(st, 'a music stand',
      'The same piece copied out a dozen times in a child’s improving hand: “Lavender’s Blue”. Lily’s practice sheets. The last copy is marked in an adult hand: <em>Perfect. Play it for Papa on Sunday.</em>');
    sofa(14, G, 2.6, 0);
    cyl(grp(21.5, G, 8.5), 0.5, 0.6, 0.16, M.woodMid, 0, 0.08, 0, 12); // dais
    sconce(12.35, 2.1, 6, 1, 0);
    rug(17, G, 6, 5, 4.5, M.carpetRed);
  }

  /* ------------ PORTRAIT GALLERY ------------ */
  {
    const names = [
      [201, 'Jasper Blackthorn, 1712–1770', {}],
      [202, 'Amelia Blackthorn, 1741–1801', { woman: true }],
      [203, 'Colonel Rufus Blackthorn, 1770–1843', {}],
      [204, 'Sir Edmund Blackthorn', {}],
      [206, 'Victor Blackthorn', {}],
    ];
    let px = 25.5;
    for (const [seed, nm, o] of names) {
      const p = portrait(px, 2.1, 0.45, 0, seed, o);
      if (nm === 'Victor Blackthorn')
        ctx.examine(p, 'a portrait — Victor Blackthorn', 'Younger than Edmund, handsomer, and painted cheaper. The painter has taken care over the brass buttons of his coat. You find yourself counting them.');
      else if (nm === 'Sir Edmund Blackthorn')
        ctx.examine(p, 'a portrait — Sir Edmund Blackthorn', 'A heavy, honest face. He holds a pocket watch; the painter has put real gold leaf on the chain.');
      else ctx.examine(p, 'a portrait — ' + nm, 'Generations of Blackthorns, and every one of them watching the door.');
      px += 2.2;
    }
    // Constance — the key behind the frame
    const cp = portrait(32.5, 2.1, 11.55, Math.PI, 205, { woman: true, pale: true });
    ctx.interact(cp, 'a portrait — Lady Constance', () => {
      if (!ctx.game.flags.chapelKeyFound) {
        ctx.game.flags.chapelKeyFound = true;
        ctx.audio.metalDrop();
        ctx.giveKey('chapelKey');
        ctx.toastMsg('Something falls from behind the frame — a cold iron key.');
      } else ctx.toastMsg('She watches the chapel door across the years.');
    });
    portrait(27.5, 2.1, 11.55, Math.PI, 207, { woman: true });
    bx(grp(30, G, 6), 3.5, 0.5, 1.0, M.fabricRed, 0, 0.25, 0); // long ottoman
    sconce(24.35, 2.2, 3, 1, 0); sconce(35.65, 2.2, 9, -1, 0);
    rug(30, G, 6, 9, 3, M.runner, Math.PI / 2);
  }

  /* ------------ SERVANTS / SCULLERY / LARDER ------------ */
  {
    table(41, G, 6, 1.4, 4.2);
    for (let i = 0; i < 3; i++) { chair(40, G, 4.4 + i * 1.6, Math.PI / 2); chair(42, G, 4.4 + i * 1.6, -Math.PI / 2); }
    const bells = grp(38, 2.6, 0.5);
    for (let i = 0; i < 6; i++) cyl(bells, 0.05, 0.07, 0.09, M.brass, i * 0.3 - 0.75, 0, 0);
    ctx.examine(bells, 'the service bells', 'Six bells on coiled springs, one for each fine room. The one marked NURSERY hangs from a snapped spring. It rang hard, once, and never again.');
    dresser(44.5, G, 0.8, 0);
    // scullery
    bx(grp(47, G, 0.9), 1.8, 0.85, 0.7, M.stone, 0, 0.42, 0); // stone sink
    const kb = grp(50.5, 1.6, 0.55);
    bx(kb, 1.0, 0.6, 0.05, M.woodMid, 0, 0, 0);
    ctx.examine(kb, 'the housekeeper’s key-board',
      'A board of brass hooks, each labelled in Mrs. Grady’s hand. CELLARS — hook empty (the stair below gapes open). CHAPEL — hook empty, label underlined twice, and beside it pencilled: “taken by her Ladyship, Oct. ’99. She said HE was not to have it.”');
    // larder
    for (let i = 0; i < 3; i++) barrel(53.2 + i * 1.1, G, 1.0);
    crate(53.5, G, 3, 0.2); crate(54.6, G, 3.4, 0.9, 0.5);
    bx(grp(53, 1.4, 6.5), 1.6, 0.05, 0.5, M.woodMid, 0, 0, 0); // shelf
  }

  /* ============================ FIRST FLOOR ============================ */

  /* ------------ GALLERY + BROKEN BALUSTRADE ------------ */
  {
    ctx.props.seanceSpot = { x: 30, y: 2.1, z: 32 };
    table(23, F, 37, 0.9, 0.45, 0); // clear of the corridor arch
    table(37, F, 39, 0.9, 0.45, 0);
    candleStick(table(23, F, 39, 0.9, 0.45, 0), 0, 0.78, 0);
    // the broken section — east gallery rail, roped off
    const broke = ropeBarrier(36.2, F, 35, Math.PI / 2);
    const splinters = grp(36.1, F, 35.6, 0.3);
    bx(splinters, 0.5, 0.04, 0.07, M.woodDark, 0, 0.02, 0, 0.4);
    bx(splinters, 0.35, 0.04, 0.06, M.woodDark, 0.2, 0.02, 0.3, -0.7);
    ctx.interact(broke, 'the broken balustrade', () => {
      ctx.readText('The Broken Balustrade',
        `Five years on, no one has repaired it — only roped it off, as though the house were waiting for you to see.

The rail is snapped through two balusters, and every splinter points OUTWARD, over the foyer floor four yards below. A rail gives way like this when weight is thrown against it — not when a woman leans, but when a woman is <em>driven</em>.

On the floor, half under the rope, a child might once have knelt: there are two small scuffs in the wax, side by side, the size of a nine-year-old’s knees. From here, through the balusters, you can see the whole gallery — and whoever stood upon it.`, 'balustrade');
    });
    portrait(22.35, F + 2.1, 36, Math.PI / 2, 151);
    portrait(37.65, F + 2.1, 38.5, -Math.PI / 2, 152);
  }

  /* ------------ MASTER BEDROOM ------------ */
  {
    bed(44, F, 32.5, 0);
    wardrobe(39, F, 30.8, 0);
    dresser(48.5, F, 30.8, 0, true);
    fireplace(49.55, F, 35, -Math.PI / 2, false);
    const stand = coatStand(40, F, 38.6, true);
    ctx.interact(stand, 'Sir Edmund’s greatcoat', () => {
      if (!ctx.game.flags.deskKeyFound) {
        ctx.game.flags.deskKeyFound = true;
        ctx.giveKey('deskKey');
        ctx.audio.metalDrop();
        ctx.toastMsg('In the breast pocket: a small desk key, and a dried sprig of lavender.');
      } else ctx.toastMsg('The coat smells of pipe smoke and rain that fell five years ago.');
    });
    rug(44, F, 33.5, 5, 4, M.carpetRed);
    portrait(44, F + 2.3, 39.65, Math.PI, 153, { woman: true });
  }

  /* ------------ CONSTANCE'S ROOM ------------ */
  {
    bed(12, F, 33, 0);
    wardrobe(9, F, 30.8, 0);
    const van = dresser(17, F, 30.8, 0, true);
    ctx.interact(van, 'the jewel box', () => {
      if (!ctx.game.flags.nurseryKeyFound) {
        ctx.game.flags.nurseryKeyFound = true;
        ctx.giveKey('nurseryKey');
        ctx.audio.metalDrop();
        ctx.toastMsg('Beneath the paste brooches, a small key on a ribbon — labelled NURSERY in her hand.');
      } else ctx.toastMsg('Paste and mourning-jet. The good jewels went to the executors.');
    });
    // loose floorboard
    const board = grp(13.5, F, 35.8);
    bx(board, 0.9, 0.035, 0.24, M.woodMid, 0, 0.02, 0);
    ctx.interact(board, 'a floorboard, sitting proud', () => {
      if (!ctx.game.flags.diaryFound) {
        ctx.game.flags.diaryFound = true;
        ctx.audio.creak();
        ctx.toastMsg('The board lifts. Oilcloth, and inside it — her diary.');
        setTimeout(() => ctx.readDoc('diary'), 900);
      } else ctx.readDoc('diary');
    });
    table(19, F, 36 + 1, 0.9, 0.6, 0.4);
    fireplace(8.45, F, 35, Math.PI / 2, false);
    rug(13, F, 34, 4.5, 3.5, M.carpetBlue);
    portrait(12, F + 2.2, 30.35, 0, 154, {});
  }

  /* ------------ BOUDOIR / DRESSING ------------ */
  {
    sofa(3.5, F, 32, 0.3);
    desk(2, F, 37.5, 0.6);
    table(6, F, 35, 0.8, 0.8);
    dressForm(1.2, F, 30.9);
    // dressing room (doorway at x54–56 kept clear)
    wardrobe(51, F, 30.9, 0); wardrobe(52.6, F, 30.9, 0); wardrobe(58.2, F, 30.9, 0);
    mirrorTall(58.8, F, 34, -Math.PI / 2);
    crate(51.2, F, 38.5, 0.2); crate(52.6, F, 38.8, 1.2, 0.6);
    ctx.examine(mirrorTall(50.2, F, 36, Math.PI / 2), 'a cheval glass',
      'A crack runs corner to corner. Mrs. Grady’s ledger (you saw it below) records it plainly: “cheval glass cracked the night of the 31st, no cause found.” Mirrors crack for grief, they say in Yorkshire.');
  }

  /* ------------ VICTOR'S ROOM ------------ */
  {
    bed(21, F, 19, Math.PI / 2, false);
    const press = wardrobe(19, F, 16.9, 0);
    ctx.interact(press, 'Victor’s clothes-press', () => {
      ctx.readText('The Coat Without a Button',
        `His good black evening coat, still on its hanger — he left this house in a hurry, in the end.

Six brass buttons should close it. The second from the top is gone: not undone, not lost — <em>torn away</em>, taking a bite of the cloth with it. The thread ends are frayed white where they were ripped.

You think of Dr. Marsh's letter: a brass coat button, clenched in her dead hand so hard they broke her fingers freeing it.

She marked him. She has been holding the proof for five years.`, 'coat');
    });
    // riding boots with the IOUs
    const boots = grp(25.5, F, 17.2);
    cyl(boots, 0.09, 0.12, 0.5, M.leather, -0.12, 0.25, 0, 8);
    cyl(boots, 0.09, 0.12, 0.5, M.leather, 0.14, 0.25, 0.05, 8);
    ctx.interact(boots, 'a pair of riding boots', () => {
      if (!ctx.game.flags.iousFound) {
        ctx.game.flags.iousFound = true;
        ctx.toastMsg('Stuffed down one boot: a bundle of papers tied with string.');
        setTimeout(() => ctx.readDoc('ious'), 900);
      } else ctx.readDoc('ious');
    });
    ctx.examine(table(24, F, 21.5, 1.0, 0.7, 0.2), 'Victor’s table',
      'Empty bottles, a dry inkwell, and a half-written letter that begins “My dear Kessler — I shall have the whole sum by the new year, upon my honour and upon my expectations —” Expectations of what, with his brother alive and an heir in the nursery?');
    rug(22, F, 19.5, 4, 3.5, M.carpetRed);
  }

  /* ------------ BLUE ROOM ------------ */
  {
    bed(30, F, 18.5, 0, false);
    sheeted(34, F, 17.5, 0.4);
    sheeted(29, F, 23.5, -0.3, 1.0, 1.3, 0.7);
    dresser(33.5, F, 24.7, Math.PI);
  }

  /* ------------ NURSERY ------------ */
  {
    bed(39, F, 17.5, 0, false);
    // rocking horse
    const horse = grp(43, F, 20, -0.5);
    bx(horse, 0.14, 0.5, 0.9, M.woodMid, 0, 0.65, 0);
    bx(horse, 0.12, 0.3, 0.34, M.woodMid, 0, 1.0, -0.45);
    bx(horse, 0.5, 0.08, 1.3, M.woodDark, 0, 0.12, 0);
    ctx.props.rockingHorse = horse;
    ctx.examine(horse, 'a rocking horse', 'Dust lies thick on everything in this room — except the horse’s saddle, which is clean, as though something small still rides it. You must have brushed it. You must have.');
    // toy chest & dollhouse
    crate(45.5, F, 17.3, 0, 0.9);
    const dolls = grp(41, F, 23.8, Math.PI);
    bx(dolls, 1.1, 0.8, 0.5, M.woodMid, 0, 0.75, 0);
    bx(dolls, 1.2, 0.3, 0.55, M.woodDark, 0, 1.3, 0);
    bx(dolls, 0.5, 0.35, 0.3, M.woodMid, 0, 0.35, 0);
    ctx.examine(dolls, 'a dollhouse — Blackthorn in miniature',
      'Every room of this house, small enough for a child’s hand. In the little foyer, at the foot of the little staircase, a doll in a blue dress lies face down. A second doll — a man — has been shut in the toy chest, and the chest tied round and round with ribbon.');
    // drawing under the bed
    const dr = paperProp(38.6, F + 0.02, 18.9, 0.7);
    ctx.interact(dr, 'a paper, far under the bed', () => {
      ctx.readText('Lily’s Drawing',
        `Crayon, on the back of a laundry list.

A tall railing, drawn as a row of X X X. Behind it a lady in a blue gown, tipping — the crayon has pressed so hard here the paper is torn. And behind HER, a man, arms straight out, a yellow chain looping across his waistcoat.

Where the man's face should be, the paper has been scrubbed with black crayon, over and over and over, until it shines.

Children draw what they cannot say.`, 'drawing');
    });
    // wardrobe with the secret nook
    const ward = wardrobe(45.2, F, 24.7, Math.PI);
    ctx.interact(ward, 'the nursery wardrobe', () => {
      if (!ctx.game.flags.lilyNook) {
        ctx.game.flags.lilyNook = true;
        ctx.audio.creak();
        ctx.toastMsg('Behind the winter coats, the back panel is loose — a child’s hiding nook, lined with a stolen eiderdown.');
        setTimeout(() => ctx.readDoc('lilyDiary'), 1100);
      } else ctx.readDoc('lilyDiary');
    });
    rug(42, F, 20, 4.5, 4, M.carpetBlue);
  }

  /* ------------ EAST WING (sealed) ------------ */
  {
    // corridor: boarded windows, dust
    // Edmund's retreat
    bed(39, F, 3.5, Math.PI / 2, false);
    const d2 = desk(41.5, F, 1.4, 0);
    chair(41.5, F, 2.6, Math.PI);
    candleStick(d2, 0.4, 0.78, 0.15);
    const journal = bookProp(41.2, F + 0.82, 1.4, 0.2, '#2a2018');
    ctx.interact(journal, 'a journal, left open', () => {
      ctx.readDoc('edmundJournal');
    });
    const ekey = grp(42.1, F + 0.8, 1.5);
    cyl(ekey, 0.02, 0.02, 0.12, M.brass, 0, 0.01, 0, 6).rotation.z = Math.PI / 2;
    ctx.interact(ekey, 'a heavy key on the desk', () => {
      if (!ctx.game.flags.ewKeyFound) {
        ctx.game.flags.ewKeyFound = true;
        ctx.giveKey('eastwingKey');
        ctx.toastMsg('The east wing key. From this side, he was not locking people out — he was locking himself in.');
        ekey.visible = false;
      }
    });
    // wall markings (anchor floats at eye height against the west wall)
    ctx.examine(grp(36.45, F + 1.5, 2), 'the wall — covered in pencil marks',
      'Sir Edmund has mapped his own house upon the wallpaper: every wall, every void behind every wall, in a hand that gets smaller and more desperate as it descends. Beneath the chapel he has drawn a small square, circled four times, and written: I HEAR HER LOWEST HERE.');
    sconce(36.5, F + 1.9, 3, 1, 0);
    // Grady's room
    bed(48, F, 2.5, 0, false);
    const kb2 = grp(46.6, F + 1.5, 0.55);
    bx(kb2, 0.8, 0.5, 0.05, M.woodMid, 0, 0, 0);
    ctx.interact(kb2, 'a key-board — one key left', () => {
      if (!ctx.game.flags.atticKeyFound) {
        ctx.game.flags.atticKeyFound = true;
        ctx.giveKey('atticKey');
        ctx.audio.metalDrop();
        ctx.toastMsg('One key remains, labelled ATTICS. Mrs. Grady kept it back when they turned her out.');
      }
    });
    const gl = paperProp(49.5, F + 0.79, 4.4, -0.4);
    table(49.5, F, 4.5, 0.9, 0.6);
    ctx.doc(gl, 'gradyLetter', 'an unsent letter');
    dresser(51, F, 0.9, 0);
    // boarded hatch over the attic stair (bottom of the second service flight)
    const hatch = grp(54, F, 10);
    bx(hatch, 3.9, 2.1, 0.1, M.woodMid, 0, 1.05, 0);
    bx(hatch, 3.9, 0.16, 0.16, M.woodDark, 0, 0.7, 0.02).rotation.z = 0.06;
    bx(hatch, 3.9, 0.16, 0.16, M.woodDark, 0, 1.5, 0.02).rotation.z = -0.05;
    const hatchCol = { min: new THREE.Vector3(52.05, F, 9.86), max: new THREE.Vector3(56, F + 2.2, 10.14) };
    W.colliders.push(hatchCol);
    const openHatch = () => {
      hatch.visible = false;
      hatchCol.max.y = hatchCol.min.y;
      hi.enabled = false;
    };
    const hi = ctx.interact(hatch,
      () => ctx.game.hasKey('atticKey') ? 'unlock the attic stair' : 'the attic stair — boarded fast, a keyhole in the batten',
      () => {
        if (!ctx.game.hasKey('atticKey')) {
          ctx.audio.lockedRattle();
          ctx.toastMsg('Locked. Mrs. Grady kept the attic key back when they turned her out.');
          return;
        }
        ctx.audio.unlock();
        ctx.audio.creak(1);
        ctx.game.flags.atticOpen = true;
        ctx.toastMsg('The battens swing loose. Cold air spills down the attic stair.');
        openHatch();
      });
    ctx.props.applyAtticOpen = openHatch;
  }

  /* ------------ ATTIC ------------ */
  {
    for (let i = 0; i < 5; i++) sheeted(28 + i * 5.5, A, 3 + (i % 2) * 6, i, 1.4, 1.2, 1.0);
    crate(31, A, 11, 0.3); crate(32.4, A, 11.4, 1.1, 0.55); crate(31.6, A, 12.6, 0.7);
    dressForm(45, A, 4); dressForm(45.7, A, 4.6);
    mirrorTall(56, A, 2.5, Math.PI * 0.9);
    const horse2 = grp(38, A, 12, 2.4);
    bx(horse2, 0.14, 0.5, 0.9, M.woodMid, 0, 0.65, 0);
    bx(horse2, 0.5, 0.08, 1.3, M.woodDark, 0, 0.12, 0);
    // Constance's trunk
    const trunk = grp(27, A, 4.5, 0.2);
    bx(trunk, 1.3, 0.7, 0.7, M.leather, 0, 0.35, 0);
    bx(trunk, 1.34, 0.1, 0.74, M.iron, 0, 0.72, 0);
    ctx.interact(trunk, 'a travelling trunk — “C.A.” ', () => {
      if (!ctx.game.flags.trunkOpen) {
        ctx.game.flags.trunkOpen = true;
        ctx.audio.creak();
        ctx.toastMsg('Constance Ashworth — her maiden initials. Inside: winter linens, and letters tied in ribbon.');
        setTimeout(() => ctx.readDoc('sisterLetters'), 1000);
      } else ctx.readDoc('sisterLetters');
    });
    for (let i = 0; i < 4; i++) {
      const beam = grp(26 + i * 8, A, 8);
      bx(beam, 0.25, 2.5, 0.25, M.woodMid, 0, 1.25, 0);
    }
  }

  /* ------------ BASEMENT ------------ */
  {
    // wine cellar
    const wr = wineRack(52, B, 20.5, 0);
    wineRack(56, B, 20.5, 0);
    wineRack(57.6, B, 15, -Math.PI / 2);
    barrel(51, B, 12); barrel(52.2, B, 12.4); barrel(51.6, B, 13.6);
    ctx.examine(wr, 'the wine racks',
      'The good vintages are gone — sold, or drunk. In the dust of the empty slots someone has practised a signature, over and over, with a wet finger: Edmund Blackthorn. Edmund Blackthorn. Edmund Blackthorn.');
    // undercroft
    for (let i = 0; i < 6; i++) crate(41.5 + (i % 3) * 1.4, B, 16 + Math.floor(i / 3) * 1.6, i * 0.5);
    sheeted(47, B, 21, 0.2, 1.6, 1.2, 1.0);
    sheeted(42, B, 22.5, -0.4);
    // boiler room
    const boil = grp(36, B, 12.5);
    cyl(boil, 0.8, 0.8, 2.0, M.iron, 0, 1.0, 0, 12);
    cyl(boil, 0.12, 0.12, 1.4, M.iron, 0.9, 1.9, 0, 8);
    collideBox(boil, 1.8, 1.8, 2.0);
    crate(33, B, 16.5, 0.2); // coal
    ctx.examine(boil, 'the great boiler', 'Cold these five years. Behind it, on the brick, a child has chalked a hopscotch grid. The chalk lines go under the wall — the wall to the old tunnel.');
    // tunnel props
    for (let x = 12; x <= 36; x += 6) {
      cyl(grp(x, B, 10.6), 0.05, 0.05, 2.4, M.iron, 0, 1.2, 0, 6); // pipes
      sconce(x + 2, B + 1.6, 10.35, 0, 1);
    }
    // crypt (tombs sit east of the chapel steps and their rails)
    tomb(5, B, 4, 0, 'JASPER BLACKTHORN');
    tomb(7, B, 4, 0, 'AMELIA BLACKTHORN');
    const ct = tomb(5, B, 8, 0, 'CONSTANCE');
    ctx.examine(ct, 'a new tomb — CONSTANCE BLACKTHORN, 1858–1899',
      'The newest stone, already going green. Beneath her name, Sir Edmund had them cut a single line: SHE WAS NOT AFRAID. On the lid, small and recent, someone has left a posy of moor-heather, tied with string. Someone still comes here.');
    tomb(7, B, 8, 0, 'EDMUND BLACKTHORN');
    candleStick(grp(2.8, B, 12), 0, 0, 0, true);
    // the loose stone / priest hole entry
    const stone = grp(4.9, B, 13.6);
    ctx.interact(stone, 'a loose stone in the south wall', () => {
      const d = W.doorById['priestDoor'];
      if (!d) return;
      if (!d.isOpen) {
        if (ctx.game.clues.has('lilyDiary') || ctx.game.flags.stoneHint) {
          ctx.game.flags.priestOpen = true;
          d.setOpen(true);
          ctx.audio.stoneGrind();
          ctx.toastMsg('The stone swings inward on a counterweight two hundred years old. Cold air, and the dark beyond.');
        } else {
          ctx.game.flags.stoneHint = true;
          ctx.toastMsg('One stone stands a half-inch proud of its brothers, worn smooth at the edge — as if pulled, many times, by small hands. It wants a knack you don’t yet have. (Perhaps the child knew it.)');
        }
      } else ctx.toastMsg('The dark little room stands open.');
    });
    // priest hole interior
    const nest = grp(4, B, 16.5);
    bx(nest, 1.2, 0.15, 0.9, M.fabricDark, 0, 0.07, 0);
    const shoe = grp(3.4, B, 16.2);
    bx(shoe, 0.1, 0.08, 0.22, M.leather, 0, 0.05, 0, 0.4);
    ctx.interact(shoe, 'a child’s shoe', () => {
      ctx.readText('The Priest Hole',
        `A room the size of a pantry, black as the inside of a bell. This is where the priests waited, two hundred years ago, listening to the soldiers’ boots above.

A nest of stolen blankets. A stub of chalk. On the stone wall, chalk drawings: a house. A lady with a crown. A sun with long rays. A dog she was not allowed to have.

And one small buttoned shoe, sitting neatly by the blankets, as though its owner meant to come straight back.

She was here. In the dark, under the house, for two days — while forty men dragged the mere.`, 'shoe');
    });
    const wl = paperProp(4.6, B + 0.16, 16.8, 0.9);
    ctx.doc(wl, 'wicksLetter', 'a paper, folded small, wedged in the stones');
    candle(4, B + 0.5, 16.5, { i: 2.5, r: 5, color: 0x8090c0 });
  }

  /* ------------ curtains on some windows ------------ */
  for (const wdw of W.windows) {
    if (wdw.level === 'basement' || wdw.level === 'attic') continue;
    const h = (wdw.x * 7 + wdw.z * 13) % 10;
    if (h < 4) curtains(wdw.x, LV[wdw.level].floor, wdw.z, wdw.isX);
  }
}
