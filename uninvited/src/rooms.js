// Furnishing: a lived-in family home built from a small primitive prop kit, lit
// by whatever candles and torches the family found when the power went. Plus the
// one thing that ends the night: a dressmaker's form at the far bedroom window.
import * as THREE from 'three';
import { LV } from './world.js';
import { makeArtTextures } from './textures.js';

let M, W, S, CTX;
let FLOOR_Y = 0;   // floor height for group-based furniture; set per level in furnish()
const CANDLES = [], FLAMES = [];
let ART = [];
export function getCandles() { return CANDLES; }
export function getFlames() { return FLAMES; }

/* ---------------- helpers ---------------- */
function matOf(m) { return typeof m === 'string' ? (M[m] || M.plaster) : m; }
function mesh(geo, m, x, y, z, ry = 0, cast = true) {
  const o = new THREE.Mesh(geo, matOf(m));
  o.position.set(x, y, z); if (ry) o.rotation.y = ry;
  o.castShadow = cast; o.receiveShadow = true; S.add(o); return o;
}
function box(w, h, d, m, x, y, z, ry = 0) { return mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, ry); }
function cyl(rt, rb, h, seg, m, x, y, z) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z); }
function R(id) {
  const r = W.roomById[id];
  return { x0: r.wx0, x1: r.wx1, z0: r.wz0, z1: r.wz1, cx: r.cx, cz: r.cz, y: LV[r.level].floor, r };
}

function candle(x, y, z, color = 0xffb060, intensity = 5.5, r = 8.5) {
  CANDLES.push({ x, y: y + 0.12, z, color, intensity, r });
  cyl(0.03, 0.045, 0.15, 8, 'candleWax', x, y + 0.075, z);
  const f = mesh(new THREE.ConeGeometry(0.03, 0.09, 6), M.flame, x, y + 0.19, z, 0, false);
  f.scale.y = 1.9; FLAMES.push(f);
}
function nightlight(x, y, z) {
  CANDLES.push({ x, y: y + 0.05, z, color: 0xff9a5a, intensity: 2.6, r: 5 });
  const b = mesh(new THREE.SphereGeometry(0.05, 8, 8), M.flame, x, y + 0.05, z, 0, false);
}
function torchGlow(x, y, z) {  // a dropped/standing torch throwing cold light
  CANDLES.push({ x, y, z, color: 0xdfe8ff, intensity: 6, r: 9 });
}

function rug(cx, cz, w, d, m, y) { const o = box(w, 0.02, d, m, cx, y + 0.011, cz); o.castShadow = false; return o; }
function framedPic(x, y, z, ry, tex, w = 0.52, h = 0.64) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; S.add(g);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.07, h + 0.07, 0.04), M.woodDark);
  fr.castShadow = true; g.add(fr);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 }));
  p.position.z = 0.03; g.add(p);
  return g;
}

// hang art on a room's INTERIOR wall — facing + offset correct by construction.
// side 'N'|'S'|'E'|'W'; along 0..1 along the wall; yc = centre height above the floor.
function wallArt(roomId, side, along, texI, w = 0.5, h = 0.62, yc = 1.65) {
  const r = W.roomById[roomId]; if (!r) return null;
  const fy = LV[r.level].floor + yc, t = 0.15;
  let x, z, ry;
  if (side === 'N') { x = r.wx0 + (r.wx1 - r.wx0) * along; z = r.wz0 + t; ry = 0; }
  else if (side === 'S') { x = r.wx0 + (r.wx1 - r.wx0) * along; z = r.wz1 - t; ry = Math.PI; }
  else if (side === 'W') { x = r.wx0 + t; z = r.wz0 + (r.wz1 - r.wz0) * along; ry = Math.PI / 2; }
  else { x = r.wx1 - t; z = r.wz0 + (r.wz1 - r.wz0) * along; ry = -Math.PI / 2; }
  return framedPic(x, fy, z, ry, ART[texI % ART.length], w, h);
}

// small props for surfaces (topY = surface height)
function mug(x, y, z, m) { mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.08, 8), m || M.tileWhite, x, y + 0.04, z, 0, false); }
function bottle(x, y, z, m) {
  mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.15, 8), m || M.clothGreen, x, y + 0.075, z, 0, false);
  mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.05, 6), m || M.clothGreen, x, y + 0.17, z, 0, false);
}
function vase(x, y, z, m) {
  mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.2, 10), m || M.terracotta, x, y + 0.1, z, 0, false);
  const b = mesh(new THREE.SphereGeometry(0.055, 6, 5), M.clothPink, x, y + 0.26, z, 0, false); b.scale.y = 1.4;
}
function standFrame(x, y, z, ry, ti) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; S.add(g);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.02), M.brass); fr.position.y = 0.1; g.add(fr);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.13),
    new THREE.MeshStandardMaterial({ map: ART[(ti ?? ((x * 3) | 0)) % ART.length], roughness: 0.6 }));
  pic.position.set(0, 0.1, 0.011); g.add(pic);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.02), M.brass); leg.position.set(0, 0.06, -0.05); leg.rotation.x = 0.42; g.add(leg);
  return g;
}
function bowlOf(x, y, z, m) { mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.06, 12), m || M.tileWhite, x, y + 0.03, z, 0, false); }

// a dead light switch — you flick it, it clicks, nothing (the power is out)
function lightSwitch(x, y, z, ry) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; S.add(g);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.015), matOf('tileWhite')); g.add(plate);
  const toggle = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.05, 0.018), matOf('woodDark')); toggle.position.z = 0.014; g.add(toggle);
  CTX.interact(g, 'the light switch', () => { CTX.audio.unlock(); });   // click. nothing.
  return g;
}

/* ---------------- furniture ---------------- */
function sofa(x, z, ry, m) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); g.rotation.y = ry; S.add(g);
  const add = (w, h, d, mm, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matOf(mm)); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; g.add(o); };
  add(1.9, 0.4, 0.85, m, 0, 0.35, 0);
  add(1.9, 0.5, 0.2, m, 0, 0.65, -0.32);
  add(0.2, 0.5, 0.85, m, -0.85, 0.55, 0);
  add(0.2, 0.5, 0.85, m, 0.85, 0.55, 0);
  add(1.5, 0.12, 0.6, m, 0, 0.56, 0.05);
  return g;
}
function armchair(x, z, ry, m) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); g.rotation.y = ry; S.add(g);
  const add = (w, h, d, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matOf(m)); o.position.set(px, py, pz); o.castShadow = true; g.add(o); };
  add(0.8, 0.4, 0.8, 0, 0.35, 0); add(0.8, 0.5, 0.18, 0, 0.65, -0.3);
  add(0.16, 0.4, 0.8, -0.4, 0.5, 0); add(0.16, 0.4, 0.8, 0.4, 0.5, 0);
  return g;
}
function lowTable(x, z, m, w = 1.1, d = 0.6) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); S.add(g);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), matOf(m)); top.position.y = 0.42; top.castShadow = true; g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.07), matOf(m)); l.position.set(sx * (w / 2 - 0.08), 0.21, sz * (d / 2 - 0.08)); g.add(l);
  }
  return g;
}
function table(x, z, m, w = 1.6, d = 1.0, h = 0.78) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); S.add(g);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), matOf(m)); top.position.y = h; top.castShadow = true; top.receiveShadow = true; g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.09, h, 0.09), matOf(m)); l.position.set(sx * (w / 2 - 0.12), h / 2, sz * (d / 2 - 0.12)); g.add(l);
  }
  return g;
}
function chair(x, z, ry, m) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); g.rotation.y = ry; S.add(g);
  const a = (w, h, d, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matOf(m)); o.position.set(px, py, pz); o.castShadow = true; g.add(o); };
  a(0.42, 0.06, 0.42, 0, 0.46, 0); a(0.42, 0.5, 0.06, 0, 0.72, -0.18);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) a(0.05, 0.46, 0.05, sx * 0.17, 0.23, sz * 0.17);
  return g;
}
function bed(x, z, ry, sheet, w = 1.5, l = 2.0) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); g.rotation.y = ry; S.add(g);
  const a = (ww, h, d, mm, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(ww, h, d), matOf(mm)); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; g.add(o); };
  a(w, 0.3, l, 'woodPale', 0, 0.3, 0);
  a(w, 0.18, l * 0.98, sheet, 0, 0.5, 0.02);
  a(w, 0.16, 0.5, 'linen', 0, 0.6, -l / 2 + 0.35);   // pillows
  a(w + 0.1, 0.7, 0.12, 'woodPale', 0, 0.5, -l / 2);  // headboard
  return g;
}
function wardrobe(x, z, ry, m = 'woodPale') {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); g.rotation.y = ry; S.add(g);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.6), matOf(m)); b.position.y = 1.0; b.castShadow = true; g.add(b);
  for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), M.brass); h.position.set(sx * 0.06, 1.05, 0.31); g.add(h); }
  return g;
}
function shelf(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); g.rotation.y = ry; S.add(g);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.32), matOf('woodPale')); b.position.y = 1.0; b.castShadow = true; g.add(b);
  for (let i = 0; i < 4; i++) {
    const row = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.26), M.bookRows[i % 3]); row.position.set(0, 0.4 + i * 0.44, 0.02); g.add(row);
  }
  return g;
}
function counter(x, z, ry, len = 3.6) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); g.rotation.y = ry; S.add(g);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.9, len), matOf('woodPale')); base.position.set(0, 0.45, 0); base.castShadow = true; base.receiveShadow = true; g.add(base);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, len), matOf('marblePlain')); top.position.set(0, 0.93, 0); g.add(top);
  return g;
}
function appliance(x, z, ry, m = 'metalWhite', w = 0.7, h = 1.7, d = 0.7) { return box(w, h, d, m, x, h / 2, z, ry); }
function tvUnit(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); g.rotation.y = ry; S.add(g);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.4), matOf('woodPale')); stand.position.y = 0.2; stand.castShadow = true; g.add(stand);
  const tv = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.06), matOf('screenOff')); tv.position.set(0, 0.95, 0); tv.castShadow = true; g.add(tv);
  return g;
}
function desk(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); g.rotation.y = ry; S.add(g);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 0.7), matOf('woodPale')); top.position.y = 0.75; top.castShadow = true; g.add(top);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.6), matOf('woodPale'));
  ped.position.set(0.4, 0.375, 0); ped.castShadow = true; g.add(ped);
  return g;
}
/* ---------------- fixtures & life (dead until the finale lights them) ---------------- */
function ceilingLight(x, ceilY, z) {
  const g = new THREE.Group(); g.position.set(x, ceilY, z); S.add(g);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), matOf('iron'));
  cord.position.y = -0.15; g.add(cord);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.16, 12, 1, true), matOf('shadeWarm'));
  shade.position.y = -0.34; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), matOf('bulbOff'));
  bulb.position.y = -0.4; g.add(bulb);
  return g;
}
function chandelier(x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); S.add(g);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), matOf('brass'));
  stem.position.y = 0.45; g.add(stem);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 20), matOf('brass'));
  ring.rotation.x = Math.PI / 2; g.add(ring);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), matOf('bulbOff'));
    bulb.position.set(Math.cos(a) * 0.42, 0.08, Math.sin(a) * 0.42);
    g.add(bulb);
  }
  return g;
}
function floorLamp(x, z) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); S.add(g);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.5, 8), matOf('iron'));
  pole.position.y = 0.75; pole.castShadow = true; g.add(pole);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 12, 1, true), matOf('shadeWarm'));
  shade.position.y = 1.56; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), matOf('bulbOff'));
  bulb.position.y = 1.48; g.add(bulb);
  return g;
}
function tableLamp(x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); S.add(g);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.24, 8), matOf('brass'));
  base.position.y = 0.12; g.add(base);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.16, 10, 1, true), matOf('shadeWarm'));
  shade.position.y = 0.31; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), matOf('bulbOff'));
  bulb.position.y = 0.26; g.add(bulb);
  return g;
}
function fireplace(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); g.rotation.y = ry; S.add(g);
  const a = (w, h, d, mm, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matOf(mm)); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  a(1.8, 1.2, 0.32, 'brick', 0, 0.6, 0);
  a(0.9, 0.8, 0.36, 'stoneDark', 0, 0.45, 0.01);       // firebox
  a(2.0, 0.1, 0.42, 'woodDark', 0, 1.24, 0.02);        // mantel
  a(0.8, 0.05, 0.3, 'iron', 0, 0.08, 0.08);            // grate
  return g;
}
function pianoUpright(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); g.rotation.y = ry; S.add(g);
  const a = (w, h, d, mm, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matOf(mm)); o.position.set(px, py, pz); o.castShadow = true; g.add(o); return o; };
  a(1.5, 1.3, 0.42, 'pianoBlack', 0, 0.65, 0);          // body
  a(1.4, 0.05, 0.3, 'linen', 0, 0.78, -0.32);           // keys
  a(1.5, 0.06, 0.34, 'pianoBlack', 0, 0.84, -0.3);      // key lid, open
  a(0.9, 0.5, 0.3, 'pianoBlack', 0, 0.25, -0.75);       // stool
  return g;
}
function plant(x, z, big) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); S.add(g);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.28, 10), matOf('terracotta'));
  pot.position.y = 0.14; pot.castShadow = true; g.add(pot);
  const bush = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.38 : 0.26, 8, 6), matOf('clothGreen'));
  bush.position.y = big ? 0.72 : 0.52; bush.scale.y = 1.5; bush.castShadow = true; g.add(bush);
  return g;
}
function coatRack(x, z) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); S.add(g);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 1.7, 8), matOf('woodDark'));
  pole.position.y = 0.85; pole.castShadow = true; g.add(pole);
  for (const [ry, mm] of [[0.4, 'clothNavy'], [2.4, 'robe'], [4.4, 'clothTeal']]) {
    const coat = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.62, 8, 1, true), matOf(mm));
    coat.position.set(Math.cos(ry) * 0.12, 1.32, Math.sin(ry) * 0.12);
    coat.castShadow = true; g.add(coat);
  }
  return g;
}
function shoeRow(x, z, ry, n) {
  const g = new THREE.Group(); g.position.set(x, FLOOR_Y, z); g.rotation.y = ry; S.add(g);
  const mats = ['iron', 'plasticRed', 'plasticBlue', 'hairBrown', 'clothPink', 'woodDark'];
  for (let i = 0; i < n; i++) {
    for (const sx of [-0.06, 0.06]) {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.24 - (i % 2) * 0.07), matOf(mats[i % mats.length]));
      shoe.position.set(i * 0.28 + sx, 0.045, 0);
      g.add(shoe);
    }
  }
  return g;
}
function wallMirror(x, y, z, ry, w = 0.5, h = 0.8) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; S.add(g);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.04), matOf('woodPale'));
  g.add(fr);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matOf('mirror'));
  m.position.z = 0.025; g.add(m);
  return g;
}
function clutterBooks(x, y, z, n) {
  for (let i = 0; i < n; i++) {
    const b = box(0.16, 0.035, 0.22, ['plasticRed', 'clothTeal', 'clothMustard', 'clothNavy'][i % 4], x + (i % 2) * 0.03, y + 0.02 + i * 0.037, z + (i % 3) * 0.02, (i % 3 - 1) * 0.2);
    b.castShadow = false;
  }
}
function teddy(x, y, z, ry) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; S.add(g);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), matOf('clothMustard'));
  body.position.y = 0.08; body.scale.y = 1.2; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), matOf('clothMustard'));
  head.position.y = 0.2; g.add(head);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), matOf('clothMustard'));
    ear.position.set(sx * 0.045, 0.245, 0); g.add(ear);
  }
  return g;
}
// curtains framing the inside of the real window openings
function curtainAll() {
  const skip = new Set(['kitchen', 'bath', 'sunroom', 'laundry', 'pantry', 'bootroom', 'garage']);
  for (const w of W.windows) {
    if (skip.has(w.room)) continue;
    const L = LV[w.level];
    const rodY = w.y + 1.95, topY = w.y + 1.9, len = 2.1;
    const inward = 0.24;                     // hang just inside the wall
    // which side of the wall is indoors? nudge toward the house centre
    const dx = w.isX ? 0 : (w.x < 30 ? inward : -inward);
    const dz = w.isX ? (w.z < 20 ? inward : -inward) : 0;
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 2.0, 6), matOf('woodDark'));
    rod.position.set(w.x + dx, rodY, w.z + dz);
    if (w.isX) rod.rotation.z = Math.PI / 2; else rod.rotation.x = Math.PI / 2;
    S.add(rod);
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.42, len), matOf('curtainHome'));
      panel.position.set(
        w.x + dx + (w.isX ? side * 0.75 : 0),
        topY - len / 2,
        w.z + dz + (w.isX ? 0 : side * 0.75));
      if (!w.isX) panel.rotation.y = Math.PI / 2;
      panel.castShadow = true;
      S.add(panel);
    }
  }
}

function dressForm(x, y, z, ry) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; S.add(g);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.05, 14), matOf('metalSteel')); base.position.y = 0.03; g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.0, 8), matOf('metalSteel')); pole.position.y = 0.55; g.add(pole);
  const dress = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.0, 14, 1, true), matOf('paleDress')); dress.position.y = 0.92; dress.castShadow = true; g.add(dress);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 4, 8), matOf('mannequin')); torso.position.y = 1.28; torso.scale.z = 0.68; torso.castShadow = true; g.add(torso);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), matOf('mannequin')); knob.position.y = 1.55; g.add(knob);
  return g;
}

/* ---------------- the house ---------------- */
export function furnish(world, mats, ctx) {
  M = mats; W = world; CTX = ctx; S = world.scene;
  ART = makeArtTextures();
  const pic = (i) => ART[i % ART.length];

  /* ===== GROUND ===== */
  FLOOR_Y = 0;
  // entrance hall — the way in, the stairs, a chandelier dead overhead
  {
    const console = box(1.3, 0.8, 0.4, 'woodPale', 22.62, 0.4, 37.3, Math.PI / 2);
    framedPic(22.2, 2.0, 31.9, Math.PI / 2, pic(6), 0.6, 0.74);
    cyl(0.12, 0.1, 0.06, 12, 'brass', 22.62, 0.86, 37.3);
    CTX.examine(console, 'the hall table', "Car keys in a bowl. Post on the mat. People who mean to come back.");
    torchGlow(30, 1.4, 37);   // the torch you brought, on the floor by the door
    chandelier(30, 6.5, 35);
    wallMirror(37.8, 1.8, 37.2, -Math.PI / 2, 0.6, 0.9);
    coatRack(23.4, 38.6);
    shoeRow(26, 39.3, 0, 4);
    // big family portraits watching the stairs
    framedPic(22.2, 5.4, 33, Math.PI / 2, pic(0), 0.7, 0.9);
    framedPic(37.8, 5.4, 37, -Math.PI / 2, pic(5), 0.7, 0.9);
  }
  // living room — sofas, telly, a real hearth, the family piano
  {
    rug(9, 35, 4.4, 3, 'carpetWarm', 0);
    sofa(9, 37.6, Math.PI, 'sofaBlue');
    sofa(4.5, 35, Math.PI / 2, 'sofaBlue');
    lowTable(9, 35, 'woodPale');
    const tv = tvUnit(9, 31.2, 0);
    let tvScreen = null; tv.traverse(o => { if (o.isMesh && o.material === M.screenOff) tvScreen = o; });
    CTX.interact(tv, 'switch on the television', () => {
      if (!tvScreen || tv.userData.flickering) return;   // ignore repeat use mid-flicker
      tv.userData.flickering = true;
      CTX.audio.static(0.14, 1.2);
      CTX.fx.fearTarget = Math.max(CTX.fx.fearTarget, 0.32);
      let n = 0;
      const iv = setInterval(() => {
        tvScreen.material = (n % 2 ? M.screenGlow : M.screenOff);
        if (++n > 8) {
          clearInterval(iv); tvScreen.material = M.screenOff; tv.userData.flickering = false;
          if (!CTX.events.finale.active && CTX.fx.fearTarget <= 0.32) CTX.fx.fearTarget = 0;
        }
      }, 135);
    });
    lightSwitch(0.22, 1.35, 33, Math.PI / 2);         // by the door — dead
    armchair(15, 33, -Math.PI / 2, 'sofaGrey');
    framedPic(0.25, 1.9, 33, Math.PI / 2, pic(0), 0.7, 0.55);
    framedPic(0.25, 1.9, 37, Math.PI / 2, pic(3), 0.55, 0.68);
    candle(9, 0.5, 35, 0xffb060, 5.5, 9);   // on the coffee table
    const hearth = fireplace(14, 30.35, 0);   // on the north wall, clear of the doors
    CTX.examine(hearth, 'the fireplace', 'Ash in the grate. Cold — but not old. Someone had a fire tonight.');
    framedPic(14, 2.15, 30.16, 0, pic(1), 0.5, 0.6);
    const piano = pianoUpright(16, 39.35, 0);
    CTX.interact(piano, 'touch the keys', () => {
      CTX.audio.pianoNote(233.1, 0.16);
      setTimeout(() => CTX.audio.pianoNote(246.9, 0.13), 120);
      setTimeout(() => CTX.audio.pianoNote(220.0, 0.11), 210);
      CTX.fx.fearTarget = Math.max(CTX.fx.fearTarget, 0.24);
      setTimeout(() => { if (!CTX.events.finale.active && CTX.fx.fearTarget <= 0.24) CTX.fx.fearTarget = 0; }, 1800);
    });
    floorLamp(16.6, 34.4);
    plant(1.6, 30.9, true);
    clutterBooks(8.8, 0.47, 34.8, 3);
    teddy(7.7, 0.62, 37.5, 0.6);
    ceilingLight(6, 3.9, 35);
  }
  // dining room — table set for four, sideboard, family photos
  {
    table(44, 35, 'woodPale', 2.0, 1.0);
    for (const dx of [-0.7, 0, 0.7]) { chair(44 + dx, 33.6, 0, 'woodPale'); chair(44 + dx, 36.4, Math.PI, 'woodPale'); }
    box(2.0, 0.9, 0.5, 'woodPale', 44, 0.45, 39.4);
    const fp = framedPic(44, 1.9, 39.7, Math.PI, pic(5), 0.6, 0.5);
    CTX.examine(fp, 'a photograph', "A family. All done up, squinting at the sun. Whoever they were. Long gone.");
    candle(44.5, 0.92, 39.4, 0xffb060, 4.5, 8);   // on the sideboard
    // places still laid
    for (const [px, pz] of [[43.4, 34.5], [44.6, 34.5], [43.4, 35.5], [44.6, 35.5]])
      cyl(0.11, 0.11, 0.02, 12, 'linen', px, 0.83, pz);
    ceilingLight(44, 3.9, 35);
    plant(39.4, 39, false);
  }
  // kitchen — counters, uppers, the sink under the window (the mother works here)
  {
    counter(59.2, 34.5, 0, 6.6);             // east wall run, length along z
    box(0.7, 0.12, 0.9, 'metalSteel', 59.2, 0.96, 33);   // sink, set into the counter
    appliance(50.6, 38.6, 0, 'metalWhite');  // fridge, against the inner wall
    box(0.72, 0.6, 0.72, 'metalSteel', 59.2, 0.45, 31.8); // oven in the run
    // upper cabinets on the piers between the windows, + a kettle
    box(0.45, 0.75, 2.6, 'woodPale', 59.55, 2.15, 33);
    box(0.45, 0.75, 2.6, 'woodPale', 59.55, 2.15, 37);
    cyl(0.09, 0.11, 0.2, 10, 'metalSteel', 59.2, 1.03, 34.6);
    // the children's drawings on the fridge
    for (const [py, pz] of [[1.55, 38.4], [1.25, 38.8]]) {
      mesh(new THREE.PlaneGeometry(0.22, 0.28), M.paper, 50.97, py, pz, Math.PI / 2, false);
      mesh(new THREE.BoxGeometry(0.012, 0.03, 0.03), M.plasticRed, 50.99, py + 0.12, pz, 0, false);
    }
    table(53, 35, 'woodPale', 1.4, 0.9, 0.76);
    chair(53, 33.8, 0, 'woodPale'); chair(53, 36.2, Math.PI, 'woodPale');
    // fruit bowl
    cyl(0.15, 0.1, 0.07, 12, 'woodDark', 53, 0.85, 35);
    for (const [fx, fm] of [[-0.05, 'plasticRed'], [0.05, 'plasticYel'], [0, 'plasticGrn']])
      mesh(new THREE.SphereGeometry(0.045, 8, 8), M[fm], 53 + fx, 0.92, 35 + fx * 0.6, 0, false);
    candle(59.1, 0.93, 36, 0xffb060, 5, 8);    // her candle on the counter by the sink
    ceilingLight(55, 3.9, 35);
  }
  // study/den — the father paces here; a desk, shelves, his candle
  {
    desk(3, 20, Math.PI / 2);
    armchair(8, 24, Math.PI, 'sofaGrey');
    shelf(1.6, 18, Math.PI / 2);
    shelf(1.6, 24, Math.PI / 2);
    framedPic(6, 1.9, 16.3, 0, pic(7), 0.5, 0.6);
    candle(3, 0.82, 20, 0xffb060, 4.5, 8);
    tableLamp(3, 0.79, 20.3);
    clutterBooks(2.95, 0.8, 19.6, 2);
    ceilingLight(6, 3.9, 21);
    plant(10.5, 17, false);
  }
  // family room — sofas, toys on the rug, a toy chest
  {
    rug(20, 21, 4, 3, 'carpetGrey', 0);
    sofa(20, 24, Math.PI, 'sofaGrey');
    lowTable(20, 21, 'woodPale');
    box(0.3, 0.3, 0.3, 'plasticRed', 18.5, 0.15, 19.5);
    box(0.25, 0.25, 0.25, 'plasticBlue', 21.2, 0.13, 20);
    box(0.9, 0.5, 0.5, 'plasticBlue', 25.5, 0.25, 17.5);   // toy chest
    teddy(19, 0.02, 20, -0.8);
    candle(20, 0.5, 21, 0xffb060, 4, 7);
    ceilingLight(20, 3.9, 21);
    floorLamp(13.4, 24.6);
  }
  // the back rooms and halls — lights overhead, life in the corners
  {
    ceilingLight(33, 3.9, 21);            // back hall
    ceilingLight(43, 3.9, 21);            // utility
    cyl(0.22, 0.18, 0.4, 10, 'linen', 39, 0.2, 17.5);   // laundry basket
    const pile = mesh(new THREE.SphereGeometry(0.18, 8, 6), M.robe, 39, 0.44, 17.5, 0, false);
    pile.scale.y = 0.5;
    ceilingLight(10, 3.9, 28); ceilingLight(30, 3.9, 28); ceilingLight(50, 3.9, 28);  // hall
    plant(39.3, 26.7, false);
    ceilingLight(26, 3.9, 7);             // pantry
    ceilingLight(40, 3.9, 7);             // playroom
    ceilingLight(54, 3.9, 7);             // boot room
    ceilingLight(10, 3.9, 8);             // garage
    // garage workbench, on the pier between the windows
    box(2.2, 0.9, 0.6, 'woodDark', 5, 0.45, 1.2);
    box(1.8, 1.0, 0.06, 'woodPale', 5, 1.8, 0.43);
    // boot room: the family's coats and boots
    coatRack(58.4, 2.4);
    shoeRow(50.5, 1.6, 0, 5);
  }
  // sun room — wicker chairs, plants under the glass roof
  {
    armchair(52, 20, 0, 'fabricCream'); armchair(56, 20, 0, 'fabricCream');
    for (const [px, pz] of [[50, 24], [58, 24], [54, 17]]) {
      cyl(0.22, 0.26, 0.4, 8, 'woodDark', px, 0.2, pz);
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), matOf('clothGreen')); bush.position.set(px, 0.75, pz); bush.scale.y = 1.4; bush.castShadow = true; S.add(bush);
    }
  }
  // playroom — the boy's train set on the floor
  {
    rug(40, 8, 5, 4, 'carpetGrey', 0);
    const loop = new THREE.Group(); loop.position.set(40, 0.02, 6); S.add(loop);
    const tr = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.05, 6, 24), matOf('woodDark'));
    tr.rotation.x = Math.PI / 2; tr.position.y = 0.03; loop.add(tr);
    const train = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.18), matOf('plasticRed')); train.position.set(41.1, 0.12, 6); train.castShadow = true; S.add(train);
    box(1.2, 1.2, 0.35, 'wallKidBlue', 33.2, 0.6, 4); // toy shelf
    box(0.4, 0.4, 0.4, 'plasticYel', 44, 0.2, 4);
    box(0.9, 0.5, 0.5, 'plasticRed', 34, 0.25, 12);   // toy chest
    teddy(42.5, 0.02, 8.5, 1.2);
    // crayon drawings left on the rug
    for (const [px, pz, rr] of [[38.5, 9.5, 0.4], [41, 10.2, -0.7], [39.6, 6.2, 1.9]])
      mesh(new THREE.PlaneGeometry(0.24, 0.3), M.paper, px, 0.035, pz, rr, false).rotation.x = -Math.PI / 2;
    CTX.examine(train, 'a toy train', "Kid's train set, laid out on the floor. Left mid-game. Kids don't just… stop, do they.");
    nightlight(46, 0.2, 12);
  }
  // hall — a long runner and pictures at either end
  {
    rug(30, 28, 36, 1.4, 'runner', 0);
    framedPic(0.25, 2.0, 28, Math.PI / 2, pic(1), 0.5, 0.62);
    framedPic(59.75, 2.0, 28.5, -Math.PI / 2, pic(2), 0.5, 0.62);
  }
  // garage / pantry / boot room — sparse, working spaces
  {
    box(2.2, 1.4, 4.5, 'screenOff', 10, 0.7, 8);   // a car in the garage
    box(2.3, 0.4, 4.6, 'iron', 10, 0.2, 8);
    box(1.0, 2.0, 0.45, 'metalWhite', 26, 1.0, 1.2); // pantry shelving
    box(1.0, 2.0, 0.45, 'woodPale', 54, 1.0, 1.2);   // boot room cupboard
  }
  // utility — washer + dryer
  {
    appliance(40, 24.6, 0, 'metalWhite', 0.7, 0.9, 0.7);
    appliance(41, 24.6, 0, 'metalWhite', 0.7, 0.9, 0.7);
  }

  /* ===== FIRST FLOOR ===== */
  FLOOR_Y = 4.2;
  // the landing — a runner, a console, the girl drifts here (a nightlight for her)
  {
    ceilingLight(10, 7.4, 28); ceilingLight(30, 7.4, 28); ceilingLight(50, 7.4, 28);
    ceilingLight(30, 7.4, 39);            // gallery over the stairs
    plant(23, 39, false);
    rug(30, 28, 40, 1.6, 'runner', 4.2);
    const con = box(1.1, 0.8, 0.35, 'woodPale', 4, 4.6, 27, 0);
    framedPic(4, 5.9, 26.3, 0, pic(4), 0.5, 0.6);
    nightlight(22, 4.4, 27);
    // little shoes by a door — the detail the prowler misreads
    box(0.12, 0.06, 0.24, 'plasticRed', 12.6, 4.24, 26.4);
    box(0.12, 0.06, 0.24, 'plasticBlue', 12.9, 4.24, 26.4);
  }
  // the long hall to the master — a runner, framed photos climbing away
  {
    rug(29, 17, 1.3, 16, 'runner', 4.2);
    framedPic(28.16, 6.0, 13, Math.PI / 2, pic(5), 0.42, 0.52);
    framedPic(28.16, 6.0, 21, Math.PI / 2, pic(0), 0.42, 0.52);
    framedPic(29.84, 6.0, 17, -Math.PI / 2, pic(3), 0.42, 0.52);
  }
  // boy's room
  {
    bed(4, 11, 0, 'pjBlue', 1.2, 1.9);
    wardrobe(2, 24, Math.PI / 2);
    box(1.0, 1.0, 0.32, 'wallKidBlue', 13.68, 0.6 + 4.2, 22, -Math.PI / 2); // shelf on the east wall
    box(0.3, 0.3, 0.3, 'plasticGrn', 8, 4.35, 20);
    teddy(4, 4.92, 10.4, 0.4);                      // on his pillow
    framedPic(0.4, 6.0, 13, Math.PI / 2, pic(2), 0.5, 0.62);  // a poster, on the pier
    for (const [px, pz] of [[6.5, 14], [7.4, 15]])
      box(0.22, 0.22, 0.22, 'plasticRed', px, 4.31, pz, 0.5);
    nightlight(11, 4.4, 11);
    ceilingLight(7, 7.4, 17);
  }
  // girl's room
  {
    bed(53, 11, 0, 'clothPink', 1.2, 1.9);
    wardrobe(58, 24, -Math.PI / 2);
    // a doll's house
    const dh = box(0.8, 0.9, 0.5, 'wallKidPink', 47, 4.65, 23);
    CTX.examine(dh, "the doll's house", '');
    // the music box — wind it and the lullaby that drifts the house plays close
    const mbox = box(0.2, 0.13, 0.15, 'brass', 47, 5.17, 23);
    CTX.interact(mbox, 'wind the music box', () => {
      CTX.audio.musicBox(0.34);
      CTX.fx.fearTarget = Math.max(CTX.fx.fearTarget, 0.26);
      setTimeout(() => { if (!CTX.events.finale.active && CTX.fx.fearTarget <= 0.26) CTX.fx.fearTarget = 0; }, 3200);
    });
    teddy(53, 4.92, 10.4, -0.4);
    framedPic(59.6, 6.0, 13, -Math.PI / 2, pic(4), 0.5, 0.62);
    rug(53, 17, 2, 1.6, 'carpetWarm', 4.2);
    nightlight(50, 4.4, 11);
    ceilingLight(53, 7.4, 17);
  }
  // bathroom
  {
    box(0.7, 0.5, 1.5, 'tileWhite', 16, 4.45, 11);   // bath
    box(0.5, 0.4, 0.4, 'tileWhite', 26, 4.4, 11);    // sink
    box(0.4, 0.7, 0.5, 'tileWhite', 26, 4.55, 13);   // toilet
    wallMirror(27.8, 5.8, 11, -Math.PI / 2, 0.5, 0.6);
    box(0.06, 0.5, 0.4, 'towel', 27.85, 5.1, 14.5);  // towels on the rail
    box(0.06, 0.46, 0.36, 'linen', 27.8, 5.08, 15.0);
    rug(17.5, 13, 0.9, 0.6, 'linen', 4.2);           // bath mat
    ceilingLight(21, 7.4, 17);
  }
  // parents' study upstairs
  {
    desk(39, 11, 0);
    shelf(45.4, 22, -Math.PI / 2);
    armchair(43, 22, Math.PI, 'sofaGrey');
    tableLamp(39.4, 4.99, 10.9);
    clutterBooks(38.5, 5.0, 11.1, 3);
    ceilingLight(38, 7.4, 17);
  }
  // guest room + a spare bedroom flanking the master
  {
    bed(6, 4, 0, 'fabricCream', 1.4, 2.0);
    wardrobe(22, 6, -Math.PI / 2);
    ceilingLight(11, 7.4, 4);
    bed(54, 4, 0, 'sofaGrey', 1.4, 2.0);
    box(0.5, 0.5, 0.4, 'woodPale', 51.8, 4.45, 2.3);
    tableLamp(51.8, 4.7, 2.3);
    ceilingLight(48, 7.4, 4);
    ceilingLight(29, 7.4, 17);              // the long hall's one dim pendant
  }
  // the master bedroom — the far room. A bed, a dresser, a sewing corner,
  // and the shape at the window.
  {
    bed(26, 5, 0, 'sofaBlue', 1.6, 2.1);
    wardrobe(34.5, 6, -Math.PI / 2);
    box(0.5, 0.5, 0.4, 'woodPale', 26, 4.45, 2.3);  // nightstand
    tableLamp(26, 4.7, 2.3);
    // dresser with a mirror on the pier above it
    box(1.2, 0.9, 0.5, 'woodPale', 33.5, 4.65, 0.9);
    wallMirror(33.5, 6.1, 0.26, 0, 0.7, 0.7);
    // the end-of-bed bench, clothes over it
    box(1.2, 0.45, 0.4, 'woodPale', 26, 4.42, 6.6);
    const clothes = mesh(new THREE.SphereGeometry(0.25, 8, 6), M.robe, 26.3, 4.72, 6.6, 0, false);
    clothes.scale.y = 0.4;
    // the sewing corner — in hindsight, the whole ghost
    const sew = box(0.9, 0.75, 0.5, 'woodPale', 27.6, 4.575, 1.0);
    box(0.34, 0.3, 0.14, 'iron', 27.5, 5.1, 1.0);              // the machine
    cyl(0.05, 0.05, 0.4, 8, 'clothPink', 27.85, 5.15, 0.9);    // fabric bolts, on the table
    cyl(0.05, 0.05, 0.4, 8, 'clothTeal', 27.95, 5.15, 1.1);
    CTX.examine(sew, 'a sewing table', 'A sewing machine. Pins, fabric, patterns. Somebody makes things here.');
    ceilingLight(30, 7.4, 4.5);
    // THE THING: a dressmaker's form squarely in the north window, framed by
    // its curtains, pale against the treeline
    dressForm(31, 4.2, 1.4, Math.PI);
    // a cold, wrong glow that spills through the open door and down the whole
    // hall — the pale blue light that pulls you toward the room
    const draw = new THREE.PointLight(0xbcd4ff, 3.4, 17, 1.5);
    draw.position.set(31, 5.2, 3.2);
    S.add(draw);
    CTX.props.masterGlow = draw;
  }

  /* ===== dressing pass: art on the walls, clutter on the surfaces, and life
     in the rooms that were bare ===== */

  // --- GROUND: art on interior walls ---
  wallArt('living', 'N', 0.5, 0, 0.6, 0.74);
  wallArt('living', 'N', 0.8, 3, 0.5, 0.62);
  wallArt('dining', 'N', 0.22, 4);
  wallArt('dining', 'N', 0.78, 6);
  wallArt('dining', 'W', 0.16, 2, 0.44, 0.56);
  wallArt('kitchen', 'N', 0.22, 1, 0.42, 0.42);
  wallArt('study', 'E', 0.35, 7);
  wallArt('study', 'E', 0.72, 2, 0.44, 0.56);
  wallArt('family', 'S', 0.5, 3);
  wallArt('family', 'E', 0.7, 1, 0.44, 0.56);
  wallArt('foyer', 'E', 0.24, 6, 0.5, 0.62);
  wallArt('backhall', 'N', 0.85, 5, 0.42, 0.52);   // 0.5 sat on the playroom door
  wallArt('sunroom', 'N', 0.3, 0, 0.44, 0.56);

  // --- GROUND: clutter on surfaces ---
  clutterBooks(8.6, 0.46, 35.3, 3); mug(9.5, 0.46, 34.7, M.clothMaroon);
  standFrame(21.35, 1.29, 34.6, -Math.PI / 2, 5); standFrame(21.35, 1.29, 35.5, -Math.PI / 2, 2);  // mantel
  bowlOf(44, 0.83, 35, M.brass);
  standFrame(44.6, 0.9, 39.4, Math.PI, 0); vase(43.3, 0.9, 39.4, M.terracotta);                    // sideboard
  for (const kz of [32.6, 33.4, 36.6]) mug(59.0, 0.965, kz, [M.clothPink, M.clothTeal, M.clothMustard][(kz | 0) % 3]);
  box(0.12, 0.18, 0.07, 'woodDark', 59.0, 1.05, 37.6);            // knife block
  bottle(58.95, 0.965, 34.2, M.clothGreen);
  mug(3.5, 0.79, 20.3, M.clothNavy); clutterBooks(2.7, 0.79, 20.4, 2);                              // study desk
  clutterBooks(20, 0.46, 21.2, 3); mug(20.6, 0.46, 20.6, M.clothTeal);                              // family table
  standFrame(22.62, 0.8, 37.4, Math.PI / 2, 4); standFrame(22.62, 0.8, 36.7, Math.PI / 2, 1);       // foyer console

  // --- GROUND: fill the bare rooms (correct world bounds this time) ---
  FLOOR_Y = 0;
  // back hall (now x32-38 — the west end became the cellar stairs) — a bench, plant, mirror
  box(1.2, 0.42, 0.4, 'woodPale', 35, 0.21, 25); plant(36.6, 18, false);
  wallMirror(37.8, 1.6, 20, -Math.PI / 2, 0.4, 0.7);
  lightSwitch(32.2, 1.35, 21, Math.PI / 2);   // by the cellar door — also dead
  // utility (x38-48, z16-26) — cabinet + detergents + a hanging rail (washer/dryer at ~40,24.6)
  box(0.4, 1.8, 1.8, 'metalWhite', 38.4, 0.9, 18);
  for (const [sz, sm] of [[17.4, 'clothTeal'], [18.0, 'clothPink'], [18.7, 'clothMustard']]) bottle(38.5, 1.85, sz, M[sm]);
  const rail = cyl(0.02, 0.02, 2.6, 6, 'iron', 39, 1.9, 21); rail.rotation.x = Math.PI / 2;   // rail along z
  for (const [hz, hm] of [[20.4, 'clothNavy'], [21.2, 'robe'], [22.0, 'clothTeal']]) mesh(new THREE.ConeGeometry(0.16, 0.6, 8, 1, true), M[hm], 39, 1.55, hz, 0, true);
  // pantry (x20-32, z0-16) — W-wall shelving loaded with jars
  box(0.35, 2.4, 5, 'woodPale', 20.4, 1.2, 8);
  for (const py of [0.7, 1.2, 1.7, 2.1]) for (let j = 0; j < 5; j++) bottle(20.75, py, 6 + j * 0.9, [M.clothGreen, M.terracotta, M.clothMustard, M.brass, M.clothMaroon][j]);
  // sun room (x48-60, z16-26) — more plants, a side table, a watering can
  plant(50.5, 22, true); plant(58, 18, false);
  lowTable(52, 24, 'woodPale'); mug(52, 0.46, 24, M.terracotta);
  cyl(0.09, 0.12, 0.18, 8, 'metalSteel', 50, 0.29, 24);          // watering can
  // garage (x0-20, z0-16) — W-wall shelving, paint tins, a spare wheel on the N wall
  box(0.35, 1.8, 3, 'metalWhite', 0.4, 0.9, 8);
  for (const gz of [7, 8.5, 9.8]) bottle(0.75, 1.05, gz, M.iron);
  const wheel = cyl(0.4, 0.4, 0.06, 16, 'iron', 13, 1.4, 0.4); wheel.rotation.x = Math.PI / 2;   // on a pier (x13), not the window at x15

  // --- FIRST FLOOR: art + clutter ---
  FLOOR_Y = 4.2;
  wallArt('master', 'W', 0.35, 5, 0.5, 0.62);
  wallArt('master', 'E', 0.7, 0, 0.5, 0.62);
  wallArt('boy', 'E', 0.4, 2);
  wallArt('girl', 'W', 0.4, 4);
  wallArt('guest', 'S', 0.75, 1);      // 0.3 sat on the boy's-room door
  wallArt('parents', 'S', 0.3, 3);     // 0.7 sat on the girl's-room door
  wallArt('studyUp', 'S', 0.5, 7);
  wallArt('bath', 'N', 0.5, 4, 0.36, 0.36);
  // clutter on the upstairs surfaces
  mug(25.82, 4.71, 2.18, M.clothTeal); standFrame(26.18, 4.71, 2.2, -0.5, 1);   // master nightstand (clear of the lamp)
  bottle(33.2, 5.1, 0.9, M.clothPink); standFrame(33.8, 5.1, 0.9, Math.PI, 4);  // master dresser
  standFrame(39.4, 5.03, 11.1, 0, 2); mug(38.9, 5.03, 11.1, M.clothNavy);   // studyUp desk
  standFrame(52.12, 4.71, 2.2, -0.4, 5);                                    // spare-room nightstand (offset from the lamp)
  // fuller bookshelves upstairs
  for (const bz of [21.6, 22.4]) clutterBooks(45.2, 5.0 + (bz === 22.4 ? 0.44 : 0), bz, 3);   // studyUp shelf top rows

  /* ===== BASEMENT: the cold cellar ===== */
  FLOOR_Y = -3.2;
  const bY = -3.2;
  // storage cellar (x14-24, z24-32) — dust-sheeted furniture, boxes, a wine rack
  for (const [sx, sz, sw, sd, sh] of [[17, 27, 1.5, 0.9, 1.0], [20.5, 30.5, 1.1, 1.1, 0.8], [16, 30.5, 1.0, 0.8, 1.1]]) {
    const sheet = box(sw, sh, sd, 'sheet', sx, bY + sh / 2, sz);   // a shape under a dust sheet
    CTX.examine(sheet, 'a dust sheet', '');
  }
  for (const [bx, bz, n] of [[22, 25, 3], [15, 25.4, 2], [22.5, 31, 2]])
    for (let k = 0; k < n; k++) box(0.5, 0.4, 0.5, 'woodPale', bx, bY + 0.2 + k * 0.42, bz, k * 0.3);
  // wine rack against the west wall
  box(0.4, 1.3, 1.7, 'woodDark', 14.5, bY + 0.65, 28);
  for (let r = 0; r < 4; r++) for (let cc = 0; cc < 3; cc++) {
    const b = cyl(0.04, 0.045, 0.28, 7, 'clothGreen', 14.7, bY + 0.35 + r * 0.28, 27.4 + cc * 0.42); b.rotation.z = Math.PI / 2; b.castShadow = false;
  }
  // metal shelving with junk against the east wall
  box(0.35, 1.9, 2.4, 'metalWhite', 23.6, bY + 0.95, 28);
  for (const jz of [27.4, 28.4, 29.4]) bottle(23.2, bY + 1.05, jz, M.iron);
  // an old bicycle
  for (const wz of [24.7, 25.6]) { const w = cyl(0.32, 0.32, 0.05, 14, 'iron', 15.5, bY + 0.35, wz); w.rotation.x = Math.PI / 2; }
  box(0.05, 0.6, 0.9, 'iron', 15.5, bY + 0.55, 25.1);

  // boiler room (x26-32, z28-32) — boiler, hot-water tank, pipes, THE FUSE BOX
  cyl(0.35, 0.35, 1.7, 12, 'iron', 30, bY + 0.85, 30.5);
  cyl(0.05, 0.05, 1.3, 8, 'iron', 30, bY + 1.9, 30.5);          // flue
  cyl(0.3, 0.3, 1.5, 12, 'metalSteel', 27.2, bY + 0.75, 30.8);  // hot-water tank
  for (const py of [bY + 2.0, bY + 2.1]) { const p = cyl(0.03, 0.03, 4.5, 6, 'iron', 29, py, 29.4); p.rotation.z = Math.PI / 2; }
  const fuse = box(0.32, 0.42, 0.13, 'metalWhite', 26.25, bY + 1.5, 30, Math.PI / 2);
  box(0.05, 0.09, 0.04, 'woodDark', 26.4, bY + 1.42, 30);       // the main lever — thrown down, off
  CTX.interact(fuse, 'the fuse box', () => {
    CTX.audio.unlock();                                          // you try the main. dead. nothing.
    CTX.fx.fearTarget = Math.max(CTX.fx.fearTarget, 0.22);
    setTimeout(() => { if (!CTX.events.finale.active && CTX.fx.fearTarget <= 0.22) CTX.fx.fearTarget = 0; }, 1800);
  });

  // the landing — a dead bare bulb (lights at the breaker-throw), a broom, coal sack.
  // NOTE: hang the bulb over the FLAT landing floor (x26-28), not over the ramp.
  mesh(new THREE.SphereGeometry(0.05, 8, 8), M.bulbOff, 27, -0.82, 25);
  const bulbCord = cyl(0.008, 0.008, 0.28, 6, 'iron', 27, -0.68, 25); bulbCord.castShadow = false;
  box(0.05, 1.5, 0.05, 'woodDark', 31.2, bY + 0.75, 27.3, 0.15);   // broom leaning past the stair foot
  const sack = mesh(new THREE.SphereGeometry(0.3, 8, 6), M.fabricDark, 27, bY + 0.28, 27, 0, true); sack.scale.y = 0.9;
  // patch the exposed wall-gap band (y -0.7..0) on the open east face of the shaft
  const patch = box(0.14, 0.74, 10, 'stoneDark', 31.95, -0.33, 21); patch.receiveShadow = true;

  // curtains for every window in the lived-in rooms
  curtainAll();
}
