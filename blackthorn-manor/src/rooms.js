// Furnishing: every room dressed from a primitive-built Victorian prop kit,
// and every clue, key and document placed into the world as an interactable.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePortraitTexture, makeArtTextures } from './textures.js';
import { LV } from './world.js';

let M, W, CTX, S;
let D;                       // shared decoration materials
let ART;                     // shared small-painting materials
let decoBuckets;             // Map<material, geometry[]> — merged at the end
let artBuckets;              // geometry[] per ART texture
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

/* ==================== lived-in dressing kit ====================
   Small props are batched: every little object is baked into a shared
   geometry per material and merged once, so hundreds of teacups, books and
   framed pictures cost only a dozen or so draw calls. */

const std2 = (c, rough = 0.8, extra) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, ...(extra || {}) });
const BOOK_COLORS = ['#5a1e1e', '#25361f', '#2b2a48', '#6e5626', '#48202c', '#232a3c', '#5a4632', '#333036', '#704a22', '#1f3a34'];

function makeDecoMats() {
  return {
    porcelain: std2('#e9e3d3', 0.35),
    porcelainBlue: std2('#c6d2e2', 0.32),
    cream: std2('#d8cfb4', 0.6),
    gilt: M.brass, silver: M.silver, iron: M.iron,
    wax: M.candleWax, leather: M.leather,
    woodD: M.woodDark, woodM: M.woodMid,
    frameWood: std2('#2e2013', 0.5, { metalness: 0.1 }),
    glass: std2('#aebfca', 0.12, { transparent: true, opacity: 0.42, metalness: 0 }),
    wine: std2('#3a1418', 0.35),
    greenGlass: std2('#20361f', 0.3),
    paper: std2('#d8ccaa', 0.9),
    foliage: std2('#2c3a22', 1), foliageDry: std2('#6a5a33', 1),
    redCloth: M.fabricRed, greenCloth: M.fabricGreen, darkCloth: M.fabricDark,
    blueCloth: std2('#233a56', 1), goldCloth: std2('#7a5a24', 1),
    books: BOOK_COLORS.map((c) => std2(c, 0.82)),
    brassDark: std2('#5a4420', 0.5, { metalness: 0.6 }),
    ink: std2('#0c0c10', 0.4),
  };
}

function push(mat, g) { let a = decoBuckets.get(mat); if (!a) { a = []; decoBuckets.set(mat, a); } a.push(g); }
function dBox(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const g = new THREE.BoxGeometry(w, h, d); if (rz) g.rotateZ(rz); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); push(mat, g); }
function dCyl(r0, r1, h, mat, x, y, z, rx = 0, ry = 0, rz = 0, seg = 8) { const g = new THREE.CylinderGeometry(r0, r1, h, seg); if (rz) g.rotateZ(rz); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); push(mat, g); }
function dSph(r, mat, x, y, z, sx, sy, sz, seg = 8) { const g = new THREE.SphereGeometry(r, seg, seg); if (sx || sy || sz) g.scale(sx || 1, sy || 1, sz || 1); g.translate(x, y, z); push(mat, g); }

function srng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function seedOf(str) { str = '' + str; let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// a real flame light in world space (for lit floor/table candelabra)
function litFlame(x, y, z, s = 1, opts = {}) {
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.028 * s, 6, 6), M.flame);
  f.position.set(x, y, z); f.scale.y = 1.9; S.add(f); FLAMES.push(f);
  candle(x, y - 0.02, z, { i: opts.i ?? 3.2, r: opts.r ?? 6, dy: 0 });
}

/* ---- clutter items: (x, top, z, r) build a small thing sitting on `top` ---- */
function ciBooks(x, y, z, r) {
  const n = 1 + Math.floor(r() * 3); let yy = y;
  for (let i = 0; i < n; i++) { const w = 0.13 + r() * 0.06, d = 0.19 + r() * 0.05, h = 0.03 + r() * 0.015; dBox(w, h, d, D.books[Math.floor(r() * D.books.length)], x, yy + h / 2, z, 0, (r() - 0.5) * 0.7, 0); yy += h + 0.002; }
}
function ciBottle(x, y, z, r) { const m = r() < 0.5 ? D.wine : D.greenGlass; dCyl(0.028, 0.032, 0.16, m, x, y + 0.08, z); dCyl(0.011, 0.011, 0.07, m, x, y + 0.19, z); }
function ciDecanter(x, y, z, r) { dCyl(0.032, 0.05, 0.12, D.glass, x, y + 0.06, z); dCyl(0.02, 0.02, 0.04, D.glass, x, y + 0.14, z); dSph(0.024, D.glass, x, y + 0.17, z); }
function ciGlass(x, y, z, r) { dCyl(0.02, 0.024, 0.06, D.glass, x, y + 0.03, z); }
function ciCup(x, y, z, r) { dCyl(0.05, 0.05, 0.008, D.porcelainBlue, x, y + 0.004, z); dCyl(0.03, 0.034, 0.038, D.porcelain, x, y + 0.028, z); }
function ciTeapot(x, y, z, r) { dSph(0.062, D.porcelainBlue, x, y + 0.06, z, 1, 0.85, 1); dCyl(0.008, 0.013, 0.07, D.porcelainBlue, x + 0.07, y + 0.07, z, 0, 0, 0.9); dSph(0.02, D.porcelain, x, y + 0.11, z); }
function ciPlate(x, y, z, r) { const n = 1 + Math.floor(r() * 3); for (let i = 0; i < n; i++) dCyl(0.085, 0.085, 0.008, i % 2 ? D.porcelain : D.porcelainBlue, x, y + 0.006 + i * 0.01, z); }
function ciBowl(x, y, z, r) { dCyl(0.04, 0.07, 0.05, D.porcelain, x, y + 0.025, z); }
function ciTureen(x, y, z, r) { dSph(0.09, D.porcelain, x, y + 0.06, z, 1, 0.65, 1); dCyl(0.092, 0.092, 0.012, D.porcelain, x, y + 0.06, z); dSph(0.028, D.porcelain, x, y + 0.11, z); }
function ciVase(x, y, z, r) { const m = [D.porcelainBlue, D.porcelain, D.brassDark][Math.floor(r() * 3)]; dCyl(0.035, 0.05, 0.18, m, x, y + 0.09, z); const st = 3 + Math.floor(r() * 3); for (let i = 0; i < st; i++) { const a = (i / st) * Math.PI * 2; dCyl(0.004, 0.004, 0.22, r() < 0.4 ? D.foliage : D.foliageDry, x + Math.cos(a) * 0.04, y + 0.28, z + Math.sin(a) * 0.04, Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3); } }
function ciInk(x, y, z, r) { dBox(0.11, 0.02, 0.07, D.woodD, x, y + 0.01, z); dCyl(0.02, 0.02, 0.03, D.ink, x - 0.02, y + 0.03, z); dCyl(0.002, 0.002, 0.12, D.frameWood, x + 0.02, y + 0.07, z, 0.3, 0, 0.3); }
function ciCandle(x, y, z, r) { dCyl(0.03, 0.045, 0.05, D.gilt, x, y + 0.025, z); dCyl(0.015, 0.015, 0.13, D.wax, x, y + 0.11, z); }
function ciClock(x, y, z, r) { dBox(0.16, 0.2, 0.1, D.woodD, x, y + 0.1, z); dCyl(0.06, 0.06, 0.012, D.cream, x, y + 0.12, z + 0.051, Math.PI / 2); dSph(0.03, D.gilt, x, y + 0.21, z); }
function ciCandelabra(x, y, z, r) { dCyl(0.03, 0.05, 0.03, D.gilt, x, y + 0.015, z); dCyl(0.014, 0.014, 0.2, D.gilt, x, y + 0.12, z); for (let i = -1; i <= 1; i++) { dCyl(0.008, 0.008, 0.11, D.gilt, x + i * 0.06, y + 0.2, z, 0, 0, i * 0.5); dCyl(0.012, 0.012, 0.09, D.wax, x + i * 0.085, y + 0.26, z); } }
function ciJar(x, y, z, r) { const m = r() < 0.5 ? D.glass : D.greenGlass; dCyl(0.035, 0.038, 0.11, m, x, y + 0.055, z); dCyl(0.03, 0.03, 0.012, D.woodD, x, y + 0.116, z); }
const CLUT = { book: ciBooks, bottle: ciBottle, decanter: ciDecanter, glass: ciGlass, cup: ciCup, teapot: ciTeapot, plate: ciPlate, bowl: ciBowl, tureen: ciTureen, vase: ciVase, ink: ciInk, candle: ciCandle, clock: ciClock, candelabra: ciCandelabra, jar: ciJar };

function tableClutter(cx, top, cz, w, d, seed, menu) {
  const r = srng(seedOf(seed)); const items = menu || ['book', 'bottle', 'candle', 'cup', 'vase', 'bowl', 'ink'];
  const n = 2 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) { const kx = cx + (r() - 0.5) * Math.max(0.12, w - 0.34), kz = cz + (r() - 0.5) * Math.max(0.12, d - 0.34); (CLUT[items[Math.floor(r() * items.length)]] || ciBooks)(kx, top, kz, r); }
}

/* ---- wall paintings ---- */
function painting(x, y, z, ry, seed) {
  const r = srng(seedOf(seed));
  const wv = [0.42, 0.55, 0.68, 0.82][Math.floor(r() * 4)]; const hv = wv * (0.72 + r() * 0.5);
  dBox(wv + 0.08, hv + 0.08, 0.05, r() < 0.55 ? M.frameGold : D.frameWood, x, y, z, 0, ry, 0);
  const ti = Math.floor(r() * ART.length);
  const nx = Math.sin(ry), nz = Math.cos(ry);
  const g = new THREE.PlaneGeometry(wv, hv); g.rotateY(ry); g.translate(x + nx * 0.028, y, z + nz * 0.028);
  artBuckets[ti].push(g);
}
function blockedAt(px, pz, y) {
  for (const d of W.doors) { if (Math.abs(d.center.y - (y - 1.0)) > 2.6) continue; if (Math.hypot(px - d.center.x, pz - d.center.z) < 1.25) return true; }
  for (const w of W.windows) { if (Math.abs(LV[w.level].floor - (y - 1.95)) > 2) continue; if (Math.hypot(px - w.x, pz - w.z) < 1.05) return true; }
  return false;
}
function hangWall(x0, z0, x1, z1, y, ry, seed, step = 2.1, maxN = 40) {
  const len = Math.hypot(x1 - x0, z1 - z0); const n = Math.min(maxN, Math.max(1, Math.floor(len / step))); const r = srng(seedOf(seed));
  for (let i = 1; i <= n; i++) { const t = i / (n + 1); const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t; if (blockedAt(px, pz, y)) continue; if (r() < 0.12) continue; painting(px, y + (r() - 0.5) * 0.14, pz, ry, seed + 'p' + i); }
}
function hangRoom(id, y, sides) {
  const rm = W.roomById[id]; if (!rm) return; const ins = 0.17; const { wx0, wz0, wx1, wz1 } = rm;
  if (sides.includes('N')) hangWall(wx0 + 0.7, wz0 + ins, wx1 - 0.7, wz0 + ins, y, 0, 'N' + id);
  if (sides.includes('S')) hangWall(wx0 + 0.7, wz1 - ins, wx1 - 0.7, wz1 - ins, y, Math.PI, 'S' + id);
  if (sides.includes('W')) hangWall(wx0 + ins, wz0 + 0.7, wx0 + ins, wz1 - 0.7, y, Math.PI / 2, 'W' + id);
  if (sides.includes('E')) hangWall(wx1 - ins, wz0 + 0.7, wx1 - ins, wz1 - 0.7, y, -Math.PI / 2, 'E' + id);
}

/* ---- freestanding furniture (scene meshes + colliders, rotation-safe) ---- */
function bedsideTable(x, z, y, ry = 0) { const g = grp(x, y, z, ry); bx(g, 0.44, 0.5, 0.4, M.woodDark, 0, 0.27, 0); bx(g, 0.47, 0.03, 0.42, M.woodMid, 0, 0.52, 0); collideBox(g, 0.5, 0.45, 0.55); return y + 0.54; }
function washstand(x, z, y, ry = 0) {
  const g = grp(x, y, z, ry);
  bx(g, 0.85, 0.8, 0.45, M.woodMid, 0, 0.42, 0);
  bx(g, 0.9, 0.04, 0.5, M.woodDark, 0, 0.84, 0);
  bx(g, 0.9, 0.4, 0.03, M.woodMid, 0, 1.05, -0.22);      // splash-back
  cyl(g, 0.014, 0.014, 0.78, M.brass, 0.5, 0.9, 0.12, 6); // towel rail post
  // basin + ewer, as local meshes so rotation is free
  cyl(g, 0.17, 0.13, 0.1, M.porcelain || M.linen, -0.16, 0.9, 0.02, 12);
  cyl(g, 0.09, 0.11, 0.18, M.linen, 0.18, 0.94, 0.02, 10);
  cyl(g, 0.03, 0.02, 0.1, M.linen, 0.24, 1.06, 0.02, 6);
  collideBox(g, 0.9, 0.5, 0.9);
  return y + 0.86;
}
function foldingScreen(x, z, y, ry = 0, mat) { const g = grp(x, y, z, ry); for (let i = -1; i <= 1; i++) { const p = bx(g, 0.5, 1.6, 0.03, mat || M.fabricGreen, i * 0.46, 0.8, Math.abs(i) * 0.12); p.rotation.y = i * 0.34; } collideBox(g, 1.5, 0.45, 1.65); return g; }
function plantStand(x, z, y, dead = true) {
  const g = grp(x, y, z);
  cyl(g, 0.05, 0.08, 0.9, M.woodDark, 0, 0.45, 0, 8);
  cyl(g, 0.16, 0.13, 0.18, M.iron, 0, 0.98, 0, 10);
  const fol = new THREE.MeshStandardMaterial({ color: dead ? '#4a3a1e' : '#2c3a20', roughness: 1 });
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const s = cyl(g, 0.006, 0.006, 0.55, fol, Math.cos(a) * 0.05, 1.25, Math.sin(a) * 0.05, 8); s.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5); }
  collideBox(g, 0.35, 0.35, 1.1); return g;
}
function teaTrolley(x, z, y, ry = 0) {
  const g = grp(x, y, z, ry);
  bx(g, 0.75, 0.03, 0.45, M.woodDark, 0, 0.72, 0);
  bx(g, 0.75, 0.03, 0.45, M.woodDark, 0, 0.42, 0);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.02, 0.02, 0.7, M.woodDark, lx * 0.34, 0.37, lz * 0.2, 6);
  collideBox(g, 0.8, 0.5, 0.75);
  return { top: y + 0.735, low: y + 0.435 };
}
function standCandelabra(x, z, y, lit) {
  const g = grp(x, y, z);
  cyl(g, 0.16, 0.2, 0.06, M.brass, 0, 0.03, 0, 10);
  cyl(g, 0.03, 0.03, 1.3, M.brass, 0, 0.68, 0, 8);
  for (let i = -1; i <= 1; i++) { bx(g, 0.4, 0.02, 0.02, M.brass, i * 0.16, 1.32, 0); cyl(g, 0.02, 0.02, 0.12, M.candleWax, i * 0.2, 1.4, 0, 6); if (lit) flameMesh(g, i * 0.2, 1.48, 0, 0.9); }
  if (lit) candle(x, y + 1.45, z, { i: 5.5, r: 10, dy: 0 });
  collideBox(g, 0.42, 0.42, 1.5); return g;
}
function pedestalBust(x, z, y) {
  const g = grp(x, y, z);
  bx(g, 0.34, 1.0, 0.34, M.stone, 0, 0.5, 0);
  bx(g, 0.42, 0.06, 0.42, M.stone, 0, 1.03, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), M.marblePlain || M.stone); head.position.y = 1.28; head.scale.set(1, 1.2, 0.95); head.castShadow = true; g.add(head);
  bx(g, 0.34, 0.22, 0.2, M.marblePlain || M.stone, 0, 1.12, 0);
  collideBox(g, 0.42, 0.42, 1.5); return g;
}
function umbrellaStand(x, z, y) {
  const g = grp(x, y, z);
  cyl(g, 0.14, 0.15, 0.6, M.brassDark || M.iron, 0, 0.3, 0, 10);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const s = cyl(g, 0.018, 0.018, 0.95, i % 2 ? M.woodDark : M.iron, Math.cos(a) * 0.05, 0.55, Math.sin(a) * 0.05, 6); s.rotation.set(Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12); }
  collideBox(g, 0.34, 0.34, 0.62); return g;
}
function wallShelf(x, y, z, ry, len = 1.0) {
  const g = grp(x, y, z, ry);
  bx(g, len, 0.03, 0.2, M.woodDark, 0, 0, 0);
  for (const s of [-1, 1]) bx(g, 0.04, 0.14, 0.16, M.woodDark, s * (len / 2 - 0.05), -0.08, 0);
  // a few things on the shelf, as local meshes
  bx(g, 0.13, 0.06, 0.18, M.fabricRed, -len / 2 + 0.16, 0.045, 0);
  bx(g, 0.12, 0.05, 0.17, M.fabricGreen, -len / 2 + 0.16, 0.095, 0.01);
  cyl(g, 0.04, 0.05, 0.16, M.brass, len / 2 - 0.18, 0.1, 0, 8);
  cyl(g, 0.05, 0.06, 0.12, M.silver, 0, 0.08, 0, 10);
  return g;
}
function potRack(x, y, z, ry, len = 1.6) {
  const g = grp(x, y, z, ry);
  bx(g, len, 0.05, 0.05, M.iron, 0, 0, 0);
  for (let i = 0; i < 5; i++) { const px = -len / 2 + 0.2 + i * (len - 0.4) / 4; cyl(g, 0.008, 0.008, 0.2, M.iron, px, -0.12, 0, 6); cyl(g, 0.07 + (i % 2) * 0.03, 0.06, 0.12, i % 2 ? M.brassDark || M.iron : M.iron, px, -0.26, 0, 10); }
  return g;
}
function hangingHerbs(x, y, z) {
  const r = srng(seedOf('herb' + x + z));
  for (let i = 0; i < 3; i++) {
    const dx = (i - 1) * 0.12;
    dCyl(0.003, 0.003, 0.14, D.woodD, x + dx, y - 0.07, z, 0, 0, 0, 5);
    for (let j = 0; j < 5; j++) {
      const ox = (r() - 0.5) * 0.05, oz = (r() - 0.5) * 0.05;
      dCyl(0.004, 0.001, 0.22, D.foliage, x + dx + ox, y - 0.24, z + oz, (r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5, 5);
    }
  }
}
function cushion(x, y, z, ry, mat) { dBox(0.4, 0.14, 0.4, mat, x, y + 0.07, z, 0, ry, 0); }
function leanCanvas(x, y, z, ry, seed) { // an old picture propped against a wall (attic)
  const r = srng(seedOf(seed)); const wv = 0.6 + r() * 0.4, hv = 0.8 + r() * 0.5;
  const g = new THREE.BoxGeometry(wv, hv, 0.05); g.rotateX(0.14); g.rotateY(ry); g.translate(x, y + hv / 2 * 0.99, z); push(r() < 0.5 ? M.frameGold : D.frameWood, g);
}

function geoOk(g) {
  g.computeBoundingBox();
  const b = g.boundingBox;
  return b && isFinite(b.min.x) && isFinite(b.max.x) && isFinite(b.min.y) &&
    isFinite(b.max.y) && isFinite(b.min.z) && isFinite(b.max.z);
}
function flushDeco() {
  const merge = (geos, mat) => {
    const clean = geos.filter(geoOk);
    if (clean.length !== geos.length) console.warn('deco: skipped', geos.length - clean.length, 'bad geometries');
    if (!clean.length) return;
    const m = new THREE.Mesh(mergeGeometries(clean, false), mat);
    m.castShadow = false; m.receiveShadow = true;
    S.add(m);
  };
  for (const [mat, geos] of decoBuckets) if (geos.length) merge(geos, mat);
  ART.forEach((mat, i) => { if (artBuckets[i].length) merge(artBuckets[i], mat); });
}

/* ============================ furnishing ============================ */

export function furnish(world, mats, ctx) {
  M = mats; W = world; CTX = ctx; S = world.scene;
  const R = (id) => world.roomById[id];
  const F = LV.first.floor, G = 0, B = LV.basement.floor, A = LV.attic.floor;

  D = makeDecoMats();
  ART = makeArtTextures().map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }));
  decoBuckets = new Map();
  artBuckets = ART.map(() => []);

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

  /* ============================================================
     LIVED-IN PASS — paintings on the walls and things on every
     surface, so each room looks inhabited.
     ============================================================ */

  // --- paintings throughout ---
  const artSkip = new Set(['foyerVoid', 'galleryW', 'galleryS', 'galleryE', 'ballVoid', 'chapVoid', 'conserv']);
  for (const lvl of ['ground', 'first']) {
    for (const rm of W.roomsByLevel[lvl]) {
      if (rm.void || artSkip.has(rm.id)) continue;
      const y = LV[lvl].floor + 1.95;
      hangRoom(rm.id, y, ['N', 'S']);
      if ((rm.wx1 - rm.wx0) >= 11 || rm.tall) hangRoom(rm.id, y, ['W', 'E']);
    }
  }
  hangRoom('foyer', G + 4.8, ['W', 'E']);   // second, grander row in the hall
  hangRoom('ballroom', G + 4.7, ['N', 'S']);

  /* ---- GROUND FLOOR surfaces & extra furniture ---- */
  // Foyer
  tableClutter(25, 0.82, 36.8, 1.3, 1.3, 'foyerC', ['candle', 'vase', 'book']);
  umbrellaStand(35, 38.6, G);
  plantStand(35.5, 31.4, G);
  // Long corridor consoles
  for (const cx of [10, 26, 42]) tableClutter(cx, 0.79, 26.6, 0.9, 0.45, 'corrG' + cx, ['candle', 'vase', 'book']);
  plantStand(2.4, 27, G); plantStand(57.6, 27, G);
  plantStand(2.4, 13.2, G); plantStand(57.6, 13.2, G);
  // Library
  tableClutter(14.5, 1.34, 39.25, 1.5, 0.28, 'libM', ['clock', 'candle', 'candle', 'book']);
  tableClutter(14.2, 0.82, 33.8, 0.8, 0.8, 'libR', ['book', 'candle', 'glass']);
  tableClutter(10.5, 0.82, 36.5, 1.4, 0.7, 'libD', ['book', 'ink', 'candle']);
  wallShelf(8.37, 1.9, 32, Math.PI / 2, 1.1); wallShelf(8.37, 1.9, 38, Math.PI / 2, 1.1);
  plantStand(20.4, 31.2, G);
  // Study
  tableClutter(4, 0.82, 34, 1.5, 0.8, 'stdD', ['book', 'ink', 'candle']);
  tableClutter(0.95, 1.34, 34, 0.28, 1.4, 'stdM', ['clock', 'candle', 'book']);
  table(6.6, G, 38.4, 0.7, 0.5); tableClutter(6.6, 0.82, 38.4, 0.7, 0.5, 'stdS', ['book', 'candle']);
  plantStand(1.2, 38.5, G);
  // Dining
  tableClutter(44, 0.82, 32.6, 1.4, 0.8, 'dinA', ['plate', 'cup', 'glass']);
  tableClutter(44, 0.82, 34.8, 1.4, 0.8, 'dinB', ['tureen', 'decanter', 'plate']);
  tableClutter(44, 0.82, 37, 1.4, 0.8, 'dinC', ['plate', 'cup', 'glass']);
  tableClutter(39, 0.97, 30.75, 1.3, 0.45, 'dinDr1', ['plate', 'tureen', 'cup']);
  tableClutter(49.25, 0.97, 37.8, 0.45, 1.3, 'dinDr2', ['plate', 'cup', 'candle']);
  { const tt = teaTrolley(41, 38.6, G); tableClutter(41, tt.top, 38.6, 0.7, 0.4, 'dinTT', ['teapot', 'cup', 'cup']); }
  standCandelabra(48.6, 31.4, G, true);
  // Kitchen
  tableClutter(55, 0.82, 35, 1.2, 3.0, 'kitT', ['bowl', 'plate', 'bottle', 'jar', 'book']);
  potRack(55, 2.7, 33.6, 0, 1.8);
  hangingHerbs(52.5, 2.7, 31.2); hangingHerbs(58, 2.7, 31.2);
  tableClutter(58.55, 0.97, 36, 0.45, 1.3, 'kitDr', ['plate', 'cup', 'bowl', 'jar']);
  // Ballroom
  standCandelabra(2.4, 18, G, true); standCandelabra(2.4, 24, G, true);
  standCandelabra(15.6, 18, G, true); standCandelabra(15.6, 24, G, true);
  chair(1.2, G, 20, Math.PI / 2); chair(1.2, G, 22, Math.PI / 2);
  // Billiards & smoking
  { const t = table(26.6, G, 18, 0.7, 0.5); tableClutter(26.6, 0.79, 18, 0.7, 0.5, 'bilT', ['decanter', 'glass', 'glass']); }
  wallShelf(18.4, 1.8, 21, Math.PI / 2, 1.0);
  tableClutter(32, 0.82, 22.8, 1.05, 1.05, 'smkCards', ['glass', 'decanter', 'book']);
  tableClutter(32, 0.79, 20.6, 0.9, 0.9, 'smkT', ['book', 'candle', 'glass']);
  tableClutter(35.2, 1.34, 21, 0.28, 1.4, 'smkM', ['clock', 'candle']);
  cushion(30.5, 0.62, 21.5, 1.4, D.redCloth); cushion(33.5, 0.62, 21.6, -1.4, D.darkCloth);
  // Drawing room
  tableClutter(47.2, 1.34, 17.6, 0.28, 1.6, 'drwM', ['clock', 'candle', 'vase']);
  tableClutter(42, 0.82, 21.6, 1.1, 0.7, 'drwC', ['book', 'vase', 'cup']);
  cushion(41.4, 0.62, 20, 0, D.goldCloth); cushion(42.6, 0.62, 20, 0, D.blueCloth);
  { const t = table(38.4, G, 21.8, 0.5, 0.5); tableClutter(38.4, 0.79, 21.8, 0.5, 0.5, 'drwL1', ['candle']); }
  { const t = table(45.6, G, 21.8, 0.5, 0.5); tableClutter(45.6, 0.79, 21.8, 0.5, 0.5, 'drwL2', ['candle']); }
  { const tt = teaTrolley(44, 23.6, G); tableClutter(44, tt.top, 23.6, 0.7, 0.4, 'drwTT', ['teapot', 'cup', 'cup']); }
  // Conservatory (no wall art — glass house)
  plantStand(51, 18, G, false); plantStand(58, 18, G, false); plantStand(58, 24, G, false);
  // Chapel
  standCandelabra(2.2, 2.2, G, true); standCandelabra(10, 2.2, G, true);
  for (let i = 0; i < 3; i++) { dBox(0.18, 0.05, 0.24, D.leather, 6, 0.5, 4.5 + i * 1.9, 0, 0.2); dBox(0.18, 0.05, 0.24, D.books[2], 9.5, 0.5, 4.5 + i * 1.9, 0, -0.3); }
  // Music room
  tableClutter(16, 0.98, 5.4, 0.8, 0.6, 'musP', ['candelabra', 'book']);
  { const t = table(14, G, 9, 0.6, 0.5); tableClutter(14, 0.79, 9, 0.6, 0.5, 'musS', ['vase', 'candle']); }
  // Portrait gallery
  pedestalBust(26, 2.2, G); pedestalBust(34, 2.2, G); pedestalBust(26, 9.8, G); pedestalBust(34, 9.8, G);
  standCandelabra(25, 6, G, true); standCandelabra(35, 6, G, true);
  cushion(29, 0.55, 6, 0, D.redCloth); cushion(31, 0.55, 6, 0, D.goldCloth);
  // Servants' hall / scullery / larder
  tableClutter(41, 0.82, 5, 1.3, 1.4, 'srvT1', ['cup', 'teapot', 'plate']);
  tableClutter(41, 0.82, 7.5, 1.3, 1.4, 'srvT2', ['bowl', 'cup', 'jar']);
  tableClutter(44.5, 0.97, 0.95, 1.2, 0.45, 'srvDr', ['plate', 'cup', 'bowl']);
  wallShelf(46.35, 1.6, 4, Math.PI / 2, 1.0);
  hangingHerbs(54, 2.5, 1.6); hangingHerbs(57, 2.5, 1.6);
  for (let i = 0; i < 4; i++) ciJar(53 + i * 0.5, 1.42, 6.5, srng(seedOf('lard' + i)));

  /* ---- FIRST FLOOR surfaces & extra furniture ---- */
  // Master bedroom
  { const t = bedsideTable(42.3, 31, F); tableClutter(42.3, t, 31, 0.44, 0.4, 'mstB1', ['candle', 'book']); }
  { const t = bedsideTable(45.7, 31, F); tableClutter(45.7, t, 31, 0.44, 0.4, 'mstB2', ['candle', 'glass']); }
  washstand(40, 30.9, F, 0);
  foldingScreen(48.5, 37.8, F, Math.PI / 2, M.fabricRed);
  cushion(43.2, F + 0.66, 31.4, 0, D.cream); cushion(44.8, F + 0.66, 31.4, 0, D.cream);
  // Lady Constance's room
  { const t = bedsideTable(10.4, 31.5, F); tableClutter(10.4, t, 31.5, 0.44, 0.4, 'conB1', ['candle', 'vase']); }
  { const t = bedsideTable(13.6, 31.5, F); tableClutter(13.6, t, 31.5, 0.44, 0.4, 'conB2', ['candle', 'book']); }
  washstand(8.9, 37, F, Math.PI / 2);
  foldingScreen(20, 38, F, 0, M.fabricGreen);
  cushion(11.2, F + 0.66, 31.6, 0, D.cream); cushion(12.8, F + 0.66, 31.6, 0, D.cream);
  // Victor's room
  { const t = bedsideTable(24, 17.6, F); tableClutter(24, t, 17.6, 0.44, 0.4, 'vicB', ['bottle', 'glass']); }
  tableClutter(24, F + 0.72, 21.5, 1.0, 0.7, 'vicT', ['bottle', 'glass', 'decanter']);
  cushion(21, F + 0.62, 19, Math.PI / 2, D.greenCloth);
  // Blue room
  { const t = bedsideTable(32, 17.6, F); tableClutter(32, t, 17.6, 0.44, 0.4, 'blueB', ['candle', 'book']); }
  washstand(34.6, 24.4, F, 0);
  // Boudoir
  tableClutter(2, F + 0.82, 37.5, 1.5, 0.8, 'boudD', ['book', 'ink', 'candle', 'vase']);
  tableClutter(6, F + 0.82, 35, 0.8, 0.8, 'boudT', ['cup', 'teapot', 'vase']);
  cushion(3.5, F + 0.62, 32, 0.3, D.blueCloth); cushion(3.9, F + 0.62, 32.2, 0.3, D.goldCloth);
  // Nursery — toys
  { const t = 45.5, top = F + 0.72; tableClutter(45.5, top, 17.3, 0.7, 0.5, 'nurToys', ['cup', 'book', 'bowl']); }
  dSph(0.09, D.redCloth, 41.5, F + 0.09, 20.8, 0, 0, 0, 10);
  for (let i = 0; i < 4; i++) dBox(0.09, 0.09, 0.09, D.books[i + 2], 42.3 + (i % 2) * 0.12, F + 0.045 + Math.floor(i / 2) * 0.09, 20.2, 0, i * 0.4, 0);
  // Green room (a guest bedroom)
  bed(18, F, 3.5, 0, false);
  { const t = bedsideTable(20, 3.5, F); tableClutter(20, t, 3.5, 0.44, 0.4, 'grnB', ['candle', 'book']); }
  wardrobe(13, F, 1.2, 0);
  washstand(22.5, 1.1, F, 0);
  cushion(17.4, F + 0.6, 3.4, Math.PI / 2, D.cream); cushion(18.6, F + 0.6, 3.4, Math.PI / 2, D.cream);
  // Sewing room
  { const st = table(30, F, 3, 1.4, 0.8); tableClutter(30, F + 0.82, 3, 1.4, 0.8, 'sewT', ['book', 'candle', 'bowl']); }
  for (let i = 0; i < 4; i++) dCyl(0.03, 0.03, 0.06, D.books[i * 2], 29.4 + i * 0.3, F + 0.85, 3.2, Math.PI / 2, 0, 0); // spools
  dBox(0.5, 0.3, 0.18, D.blueCloth, 33.5, F + 0.15, 4.4); dBox(0.5, 0.28, 0.17, D.redCloth, 33.5, F + 0.44, 4.4); // fabric bolts
  dressForm(34.5, F, 2);
  chair(30, F, 4.6, Math.PI);
  // Sir Edmund's retreat (already story-furnished) — a little life
  tableClutter(41.5, F + 0.82, 1.4, 1.5, 0.8, 'retD', ['book', 'ink', 'candle']);
  { const t = bedsideTable(37, 3.5, F); tableClutter(37, t, 3.5, 0.44, 0.4, 'retB', ['candle', 'glass']); }
  // Housekeeper's room
  { const t = bedsideTable(48, 4, F); tableClutter(48, t, 4, 0.44, 0.4, 'gradB', ['candle', 'book']); }
  washstand(24.5, 1.1, F, 0);   // (dressing help for the sewing corridor end)

  /* ---- ATTIC — old canvases and lumber ---- */
  for (let i = 0; i < 7; i++) leanCanvas(26 + i * 4.6, A, 6.6, Math.PI + (Math.random() - 0.5) * 0.2, 'atCanvas' + i);
  crate(48, A, 12, 0.4); crate(49.4, A, 12.3, 1.1, 0.55); crate(48.6, A, 13.3, 0.6);
  { const bc = grp(52, A, 6); cyl(bc, 0.16, 0.16, 0.6, M.iron, 0, 1.4, 0, 10); cyl(bc, 0.014, 0.014, 1.0, M.iron, 0, 0.65, 0, 6); }
  chair(30, A, 4.5, 1.2);

  /* ---- BASEMENT — cellar clutter ---- */
  for (let i = 0; i < 5; i++) ciJar(51 + (i % 3) * 0.45, B + 0.86, 12 + Math.floor(i / 3) * 0.5, srng(seedOf('cel' + i)));
  wallShelf(49.6, B + 1.6, 13, Math.PI / 2, 1.2);
  leanCanvas(41, B, 22.6, 0.1, 'bC1'); leanCanvas(43, B, 22.6, -0.1, 'bC2');
  dBox(0.5, 0.4, 0.5, D.ink, 34, B + 0.2, 15.5); // coal scuttle
  cyl(grp(34.6, B, 15.5), 0.02, 0.02, 1.0, M.iron, 0, 0.5, 0, 6).rotation.z = 0.3; // shovel

  flushDeco();

  /* ------------ curtains on some windows ------------ */
  for (const wdw of W.windows) {
    if (wdw.level === 'basement' || wdw.level === 'attic') continue;
    const h = (wdw.x * 7 + wdw.z * 13) % 10;
    if (h < 4) curtains(wdw.x, LV[wdw.level].floor, wdw.z, wdw.isX);
  }
}
