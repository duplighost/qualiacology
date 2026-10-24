// Boston's landmarks for Technically Thirty-Two, each built facing +z with its foot at y = 0:
// the State House with the gold dome, the Custom House tower and its clocks, the glass tower
// and the Pru, Old North's steeple, the weather beacon on its roof, the Zakim's towers, the
// Longfellow's salt-and-pepper towers, and the things the song passes on its way (the fire
// truck with its ladder up, the race's banner, the steam stacks, the el station, the rink).
// Every builder returns its pieces sorted by surface: brick, paint (vertex colours), gold,
// glass (window panes), stone (granite), mirror (curtain wall).

import * as THREE from 'three';
import { B, C, merge, seeded, muv, tr, pane, arcWall } from './bos-kit.js';

const WHITE = 0xece8de, IVORY = 0xe0d8c4, GOLD = 0xe0b24a, GREEN = 0x5a8a74, BLACK = 0x18181a, GRANITE = 0xb8b4aa;
const out = () => ({ brick: [], paint: [], gold: [], glass: [], stone: [], mirror: [] });
const done = (o) => { const r = {}; for (const k in o) if (o[k].length) r[k] = merge(o[k]); return r; };
// a column: shaft with a base and a capital
function column(o, x, y0, z, h, r, c = WHITE) {
  o.paint.push(tr(C(r * 0.86, r, h, 10, x, y0 + h / 2, z), c));
  o.paint.push(tr(B(r * 2.5, r * 0.5, r * 2.5, x, y0 + r * 0.25, z), c));
  o.paint.push(tr(B(r * 2.6, r * 0.6, r * 2.6, x, y0 + h - r * 0.3, z), c));
}
// a gabled pediment across x from -w/2..w/2 at height y, depth d, rise h
function pediment(o, w, h, y, z, d, c = WHITE) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, y, z - d / 2); o.paint.push(tr(g, c));
}
// windows in a grid on a wall facing +z at z, columns at xs, floors from y0 every fh
function grid(o, xs, ys, z, w, h, kind, R) { for (const y of ys) for (const x of xs) o.glass.push(pane(w, h, kind, R()).translate(x, y + h / 2, z)); }

// the State House on its hill: the brick front with the arcade and the colonnade over it, the
// pediment, the drum and the gold dome with its ribs, the lantern and the gilded pinecone
export function stateHouse() {
  const o = out(), R = seeded(61);
  // the hill it stands on: terraces of snow and a granite wall with steps (base at y 0)
  o.stone.push(muv(B(110, 6, 70, 0, 3, -10)));
  o.stone.push(muv(B(60, 3, 12, 0, 1.5, 30)));
  for (let k = 0; k < 8; k++) o.stone.push(muv(B(24, 0.75 * (k + 1), 1.2, 0, 0.375 * (k + 1), 36 - k * 1.2)));
  const Y = 6;
  // the main block and its wings
  o.brick.push(muv(B(56, 16, 34, 0, Y + 8, -12)));
  for (const s of [-1, 1]) o.brick.push(muv(B(22, 13, 30, s * 38, Y + 6.5, -14)));
  // the arcade: a brick front of seven arches, two floors
  o.brick.push(muv(B(36, 10, 7, 0, Y + 5, 7.5)));
  for (let k = 0; k < 7; k++) { const x = -15.4 + k * 5.13; o.glass.push(pane(3.2, 5.6, 2, R()).translate(x, Y + 3.4, 11.02)); o.paint.push(tr(arcWall(1.6, Math.PI / 2, 0.3, 0, 0, 0, 8, true).rotateX(Math.PI / 2).translate(x, Y + 6.2, 11.1), WHITE)); }
  o.paint.push(tr(B(36.6, 0.6, 7.6, 0, Y + 10.2, 7.5), WHITE));
  // the colonnade on the terrace: ten columns in pairs, the entablature, the pediment
  for (let k = 0; k < 10; k++) { const x = -15.5 + k * 3.44; column(o, x, Y + 10.5, 10.2, 9.5, 0.62); }
  o.brick.push(muv(B(32, 9.5, 2, 0, Y + 15.25, 5.6)));
  for (let k = 0; k < 5; k++) o.glass.push(pane(1.8, 4.2, 1, R()).translate(-12 + k * 6, Y + 12.4, 6.62));
  o.paint.push(tr(B(37, 2.0, 8.2, 0, Y + 21, 8.0), WHITE));
  pediment(o, 37, 5.2, Y + 22, 8.0, 8.2, WHITE);
  // the windows of the main front and the wings
  for (const s of [-1, 1]) {
    grid(o, [s * 21, s * 25], [Y + 1.5, Y + 7, Y + 11.5], 5.02, 1.8, 3.2, 1, R);
    grid(o, [s * 30, s * 34, s * 38, s * 42, s * 46], [Y + 1.4, Y + 6.8], 1.02, 1.8, 3.0, 1, R);
  }
  o.paint.push(tr(B(56.6, 1.2, 34.6, 0, Y + 16.6, -12), WHITE));
  // the drum, the dome, the lantern, the pinecone
  const D = Y + 17;
  o.paint.push(tr(C(10.6, 10.6, 3.2, 32, 0, D + 1.6, -12), WHITE));
  o.paint.push(tr(C(9.8, 10.0, 5.4, 32, 0, D + 5.9, -12), IVORY));
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; o.glass.push(pane(1.2, 2.6, 3, R()).rotateY(a).translate(Math.sin(a) * 9.95, D + 5.6, -12 + Math.cos(a) * 9.95)); }
  o.paint.push(tr(C(10.3, 10.3, 0.8, 32, 0, D + 8.9, -12), WHITE));
  const dome = new THREE.SphereGeometry(9.6, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 1.08, 1); dome.translate(0, D + 9.2, -12); o.gold.push(dome);
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; const rib = new THREE.TorusGeometry(9.66, 0.16, 4, 20, Math.PI / 2); rib.rotateY(-Math.PI / 2); rib.scale(1, 1.08, 1); rib.rotateY(a); rib.translate(0, D + 9.2, -12); o.gold.push(rib); }
  o.paint.push(tr(C(2.6, 2.6, 3.6, 16, 0, D + 20.4, -12), WHITE));
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; o.paint.push(tr(C(0.22, 0.22, 3.6, 6, Math.sin(a) * 2.8, D + 20.4, -12 + Math.cos(a) * 2.8), WHITE)); }
  const cup = new THREE.SphereGeometry(2.9, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2); cup.translate(0, D + 22.2, -12); o.gold.push(cup);
  o.gold.push(new THREE.ConeGeometry(0.9, 2.6, 10).translate(0, D + 26.4, -12));
  o.gold.push(new THREE.SphereGeometry(0.85, 10, 8).translate(0, D + 25.2, -12));
  // the fence along the street and the flagpole
  for (let k = 0; k < 40; k++) o.paint.push(tr(B(0.12, 2.2, 0.12, -30 + k * 1.54, 7.1, 32), BLACK));
  o.paint.push(tr(B(62, 0.12, 0.12, 0, 8.1, 32), BLACK));
  return done(o);
}

// the Custom House: the old granite custom house at its foot, the tower up out of it, the
// four clocks, the open gallery, the pyramid and its lantern
export function customHouse() {
  const o = out(), R = seeded(71);
  o.stone.push(muv(B(44, 18, 44, 0, 9, 0)));
  for (const z of [22.4]) for (let k = 0; k < 6; k++) column(o, -15 + k * 6, 1.5, z + 1.6, 15, 1.0, GRANITE);
  o.stone.push(muv(B(46, 3, 48, 0, 19.5, 0)));
  const S = 20, T0 = 21, T1 = 112;
  o.stone.push(muv(B(S, T1 - T0, S, 0, (T0 + T1) / 2, 0)));
  // vertical piers and the window strips between them, all four sides
  for (let side = 0; side < 4; side++) {
    const a = side * Math.PI / 2;
    for (let k = 0; k < 5; k++) {
      const x = -8 + k * 4;
      const g = B(1.1, T1 - T0, 0.8, x, (T0 + T1) / 2, S / 2 + 0.3); g.rotateY(a); o.stone.push(muv(g));
      if (k < 4) for (let f = 0; f < 26; f++) { const p = pane(2.4, 2.3, 3, R()); p.translate(x + 2, T0 + 1.2 + f * 3.45 + 1.15, S / 2 + 0.05); p.rotateY(a); o.glass.push(p); }
    }
  }
  // the clock stage
  o.stone.push(muv(B(S + 2, 14, S + 2, 0, T1 + 7, 0)));
  o.stone.push(muv(B(S + 3, 1.2, S + 3, 0, T1 + 14.6, 0)));
  // the gallery: columns round an open top, then the pyramid with its lantern
  for (let side = 0; side < 4; side++) for (let k = 0; k < 4; k++) { const g = C(0.5, 0.5, 6, 8, -7.5 + k * 5, T1 + 18.2, S / 2 - 0.5); g.rotateY(side * Math.PI / 2); o.stone.push(muv(g)); }
  o.stone.push(muv(B(S + 1, 1.0, S + 1, 0, T1 + 21.6, 0)));
  o.stone.push(muv(B(S - 4, 6, S - 4, 0, T1 + 18, 0)));
  const pyr = new THREE.ConeGeometry((S - 2) * 0.72, 16, 4); pyr.rotateY(Math.PI / 4); pyr.translate(0, T1 + 30, 0); o.mirror.push(pyr);
  o.paint.push(tr(C(0.9, 1.2, 4, 8, 0, T1 + 39.5, 0), GREEN));
  o.gold.push(new THREE.SphereGeometry(0.8, 8, 6).translate(0, T1 + 42, 0));
  return done(o);
}
export const CUSTOM_CLOCK_Y = 112 + 7;

// a clock face (canvas): white, black numerals and ticks; the hands are their own pieces
export function clockTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#e8e2d2'; g.beginPath(); g.arc(256, 256, 250, 0, 6.283); g.fill();
  g.strokeStyle = '#141414'; g.lineWidth = 14; g.beginPath(); g.arc(256, 256, 236, 0, 6.283); g.stroke();
  g.fillStyle = '#141414'; g.font = '700 54px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const N = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; g.save(); g.translate(256 + Math.sin(a) * 180, 256 - Math.cos(a) * 180); g.rotate(a); g.fillText(N[k], 0, 0); g.restore(); }
  for (let k = 0; k < 60; k++) { const a = k / 60 * 6.283; g.lineWidth = k % 5 ? 3 : 7; g.beginPath(); g.moveTo(256 + Math.sin(a) * 218, 256 - Math.cos(a) * 218); g.lineTo(256 + Math.sin(a) * 232, 256 - Math.cos(a) * 232); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// the glass tower: a sheer slab of mirror on a rhomboid plan, the slot up its narrow ends
export function glassTower(H = 240) {
  const o = out();
  const s = new THREE.Shape(); s.moveTo(-15, -46); s.lineTo(17, -40); s.lineTo(15, 46); s.lineTo(-17, 40); s.lineTo(-15, -46);
  const g = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: false }); g.rotateX(-Math.PI / 2); o.mirror.push(g);
  for (const z of [-43, 43]) o.paint.push(tr(B(0.8, H, 0.8, z > 0 ? -1 : 1, H / 2, z), 0x101418));
  return done(o);
}
// the Pru: a square tower of light stone and banded windows, the podium, the crown, the mast
export function pruTower() {
  const o = out(), H = 210;
  o.stone.push(muv(B(90, 14, 70, 0, 7, 0)));
  o.stone.push(muv(B(50, H, 50, 0, H / 2, 0)));
  for (let f = 0; f < 50; f++) for (let side = 0; side < 4; side++) { const g = B(48.4, 1.6, 0.4, 0, 16 + f * 3.9, 25.1); g.rotateY(side * Math.PI / 2); o.mirror.push(g); }
  o.stone.push(muv(B(46, 10, 46, 0, H + 5, 0)));
  o.paint.push(tr(B(1.2, 34, 1.2, 4, H + 27, 4), 0x9aa0a8));
  o.paint.push(tr(B(0.8, 22, 0.8, -6, H + 21, -6), 0x9aa0a8));
  return done(o);
}
// Old North: the brick tower, the white belfry and lantern, the spire, the weathervane
export function oldNorth() {
  const o = out(), R = seeded(81);
  o.brick.push(muv(B(16, 14, 34, 0, 7, -18)));
  const roof = new THREE.CylinderGeometry(0.1, 12, 6, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(0.7, 1, 1.5); roof.translate(0, 17, -18); o.mirror.push(roof);
  o.brick.push(muv(B(8.4, 26, 8.4, 0, 13, 0)));
  for (const y of [5, 12, 19]) o.glass.push(pane(1.6, 3.4, 1, R()).translate(0, y, 4.22));
  o.paint.push(tr(B(9, 1, 9, 0, 26.5, 0), WHITE));
  // the belfry: an arch each side
  o.paint.push(tr(B(7, 7.5, 7, 0, 30.75, 0), WHITE));
  for (let a = 0; a < 4; a++) { const p = pane(2.6, 4.6, 3, R()); p.translate(0, 30.4, 3.52); p.rotateY(a * Math.PI / 2); o.glass.push(p); }
  o.paint.push(tr(B(8, 0.8, 8, 0, 34.8, 0), WHITE));
  o.paint.push(tr(B(5.2, 5.5, 5.2, 0, 37.95, 0), WHITE));
  o.paint.push(tr(B(6, 0.6, 6, 0, 41, 0), WHITE));
  o.paint.push(tr(new THREE.CylinderGeometry(2.0, 2.4, 3, 8).translate(0, 42.8, 0), WHITE));
  o.paint.push(tr(new THREE.ConeGeometry(2.2, 15, 8).translate(0, 51.8, 0), WHITE));
  o.gold.push(new THREE.SphereGeometry(0.45, 8, 6).translate(0, 59.6, 0));
  o.gold.push(B(2.6, 0.5, 0.12, 0.6, 60.6, 0));
  return done(o);
}
export const OLDNORTH_BELL_Y = 30;
// a bell (bronze), hung at its top
export function bell() { const pts = [[0, 0], [0.5, 0.05], [0.62, -0.5], [0.7, -1.2], [1.05, -1.6], [1.1, -1.75], [0, -1.7]].map(([r, y]) => new THREE.Vector2(r, y)); const g = new THREE.LatheGeometry(pts, 16); g.computeVertexNormals(); return tr(g, 0xb0802a); }

// the weather beacon: a white terra-cotta building and the mast on its roof, its light in rings
export function beaconTower() {
  const o = out(), R = seeded(91);
  o.stone.push(muv(B(30, 48, 26, 0, 24, 0)));
  grid(o, [-11, -6.5, -2, 2.5, 7, 11.5].map((x) => x - 0.25), Array.from({ length: 12 }, (_, k) => 3 + k * 3.8), 13.02, 2.6, 2.6, 0, R);
  o.paint.push(tr(B(31, 1.2, 27, 0, 48.6, 0), IVORY));
  for (const [x, z] of [[-2, -2], [2, -2], [2, 2], [-2, 2]]) o.paint.push(tr(B(0.4, 34, 0.4, x * (1 - 0.0), 49 + 17, z), 0x8a8e94));
  for (let k = 0; k < 10; k++) o.paint.push(tr(B(4.4, 0.2, 4.4, 0, 51 + k * 3.2, 0), 0x8a8e94));
  o.paint.push(tr(B(0.3, 10, 0.3, 0, 88, 0), 0x8a8e94));
  return done(o);
}
export const BEACON_TOP = 49;

// one of the Zakim's towers: two legs leaning in to the deck and up together into one point,
// the deck between them (the cables are drawn live in cold.js from TOP down to the deck)
export function zakimTower() {
  const o = out(), H = 96, legX = 25;
  for (const s of [-1, 1]) {
    const a = new THREE.Vector3(s * legX, 0, 0), b = new THREE.Vector3(s * 2.2, H - 16, 0);
    const d = b.clone().sub(a), L = d.length();
    const g = new THREE.BoxGeometry(2.6, L, 3.4); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
    o.paint.push(tr(g, 0xe6e8ea));
  }
  o.paint.push(tr(B(5.4, 18, 3.8, 0, H - 9, 0), 0xe6e8ea));
  o.paint.push(tr(new THREE.ConeGeometry(2.2, 8, 4).rotateY(Math.PI / 4).translate(0, H + 4, 0), 0xe6e8ea));
  for (const s of [-1, 1]) o.paint.push(tr(B(5, 1.2, 5, s * legX, 0.6, 0), 0xb8bcc0));
  return done(o);
}
export const ZAKIM = { top: 92, legX: 25, deck: 8.5 };

// the Longfellow's salt-and-pepper towers: two round granite towers with their conical caps
// and their little windows, on a pier that goes down into the river
export function saltPepper() {
  const o = out(), R = seeded(101);
  o.stone.push(muv(B(16, 12, 12, 0, -2, 0)));
  for (const s of [-1, 1]) {
    o.stone.push(muv(C(3.2, 3.6, 16, 16, s * 4.2, 12, 0)));
    o.stone.push(muv(C(3.9, 3.9, 1.0, 16, s * 4.2, 20.5, 0)));
    o.mirror.push(new THREE.ConeGeometry(3.7, 6.5, 16).translate(s * 4.2, 24.2, 0));
    o.paint.push(tr(C(0.12, 0.12, 2.2, 5, s * 4.2, 28.4, 0), 0x3a4a44));
    for (let k = 0; k < 3; k++) for (let a = 0; a < 4; a++) { const p = pane(0.7, 1.3, 3, R()); p.translate(0, 9 + k * 4, 3.62); p.rotateY(a * Math.PI / 2); p.translate(s * 4.2, 0, 0); o.glass.push(p); }
  }
  o.stone.push(muv(B(14, 4, 6, 0, 6, 0)));
  return done(o);
}

// a fire engine at the kerb: the red body, the white cab roof, the light bar, the aerial
// ladder raised toward the top floor (the ladder points along -x, up at `pitch`)
export function fireTruck() {
  const o = out();
  const RED = 0xb0141a, CH = 0xd8d8d8;
  o.paint.push(tr(B(2.6, 2.4, 3, 0, 1.7, 5.5), RED));
  o.paint.push(tr(B(2.62, 0.5, 2.8, 0, 3.1, 5.5), WHITE));
  o.glass.push(pane(2.2, 1.0, 2, 0.3).translate(0, 2.3, 7.02));
  o.paint.push(tr(B(2.6, 2.0, 8.5, 0, 1.6, -0.5), RED));
  o.paint.push(tr(B(2.66, 0.3, 8.6, 0, 1.2, -0.5), CH));
  for (const z of [5.4, -1.5, -3.6]) for (const s of [-1, 1]) o.paint.push(tr(C(0.55, 0.55, 0.4, 12, s * 1.25, 0.55, z).rotateZ(Math.PI / 2), 0x141414));
  o.paint.push(tr(B(1.8, 0.25, 0.3, 0, 3.45, 6.0), 0xffffff));
  // the turntable and the ladder, two rails and their rungs, up to the top porch
  o.paint.push(tr(C(1.2, 1.4, 0.8, 12, 0, 3.0, -3.2), CH));
  const lad = [];
  for (const s of [-1, 1]) lad.push(B(0.16, 0.34, 13.5, s * 0.55, 0, 6.75));
  for (let k = 0; k < 21; k++) lad.push(B(1.1, 0.06, 0.06, 0, 0, 0.4 + k * 0.63));
  for (const g of lad) { g.rotateX(-0.9); g.rotateY(Math.PI / 2); g.translate(0, 3.4, -3.2); o.paint.push(tr(g, 0xe8e8e8)); }
  return done(o);
}
// the race: a banner over the road on two masts (the words are a sign face in cold.js)
export function raceGantry(span = 13, h = 19) {
  const o = out();
  for (const s of [-1, 1]) { o.paint.push(tr(C(0.35, 0.45, h + 2, 10, s * span, (h + 2) / 2, 0), 0x2050a0)); o.paint.push(tr(B(1.6, 0.6, 1.6, s * span, 0.3, 0), 0x2050a0)); }
  o.paint.push(tr(B(span * 2 + 0.8, 0.5, 0.5, 0, h + 1.8, 0), 0xe8c020));
  o.paint.push(tr(B(span * 2 + 0.8, 0.5, 0.5, 0, h - 3.3, 0), 0xe8c020));
  return done(o);
}
// a steam stack in the street: orange and white bands round a pipe out of the manhole
export function steamStack() {
  const o = out();
  for (let k = 0; k < 6; k++) o.paint.push(tr(C(0.55, 0.6, 0.5, 14, 0, 0.25 + k * 0.5, 0), k % 2 ? 0xf2f2ee : 0xf06a10));
  o.paint.push(tr(C(0.42, 0.42, 0.2, 12, 0, 3.1, 0), 0x2a2a2a));
  return done(o);
}
// the Pike in its trench, crossing under the road (along x): the lanes, the walls, the median
export function pike() {
  const o = out(), L = 360;
  o.paint.push(tr(B(L, 0.1, 30, 0, 0.05, 0), 0x2a2a2e));
  for (const z of [-15.5, 15.5]) { o.paint.push(tr(B(L, 2.2, 1.4, 0, 1.1, z), 0x9a968e)); o.paint.push(tr(B(L, 0.3, 1.8, 0, 2.35, z), 0x7a766e)); }
  o.paint.push(tr(B(L, 1.0, 0.6, 0, 0.5, 0), 0xb8b4aa));
  for (let k = 0; k < 60; k++) for (const z of [-9, -4.5, 4.5, 9]) o.paint.push(tr(B(3, 0.03, 0.18, -L / 2 + k * 6, 0.12, z), 0xe8e8e0));
  for (const z of [-13.4, 13.4]) o.paint.push(tr(B(L, 0.03, 0.18, 0, 0.12, z), 0xe8c838));
  return done(o);
}
// a diner: a stainless car with its red band and windows, and on its roof a coffee cup the
// size of a house, steaming (the cup comes from the pickup, scaled up)
export function diner(cupGeo) {
  const o = out(), R = seeded(121);
  o.paint.push(tr(B(20, 4.2, 7, 0, 2.6, 0), 0xc8ccd0));
  const roof = new THREE.CylinderGeometry(3.6, 3.6, 20, 16, 1, false, -Math.PI / 2, Math.PI); roof.rotateZ(Math.PI / 2); roof.scale(1, 0.4, 1); roof.translate(0, 4.7, 0); o.paint.push(tr(roof, 0xb8bcc0));
  o.paint.push(tr(B(20.1, 0.5, 7.1, 0, 1.3, 0), 0xb0141a)); o.paint.push(tr(B(20.1, 0.18, 7.1, 0, 4.4, 0), 0xb0141a));
  for (let k = 0; k < 8; k++) o.glass.push(pane(1.8, 1.6, 2, R()).translate(-8.4 + k * 2.4, 2.9, 3.52));
  o.paint.push(tr(B(1.4, 3.6, 0.2, 9.0, 2.3, 3.55), 0x8a8e94));
  o.paint.push(tr(B(20.4, 0.8, 7.4, 0, 0.4, 0), 0x3a3a3c));
  if (cupGeo) {
    const g = cupGeo.clone(), n = g.attributes.position.count;
    g.setAttribute('aK', new THREE.BufferAttribute(new Float32Array(n), 1));
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    g.scale(13, 13, 13); g.translate(0, 5.2 + 0.36 * 13, 0); o.paint.push(g);
  }
  // the sign on its post (the word is a sign face in cold.js)
  o.paint.push(tr(B(0.4, 9, 0.4, -11.5, 4.5, 4), 0x2a2a30));
  return done(o);
}
export const CUP_TOP = 5.2 + 0.36 * 13 + 0.5 * 13;
// the Frog Pond: an oval of ice with its boards and a rail, lamps round it, the warming hut
export function rink() {
  const o = out();
  // the ice is swept clear (its own material, the snow doesn't settle on it)
  const ice = new THREE.CircleGeometry(1, 48); ice.rotateX(-Math.PI / 2); ice.scale(36, 1, 18); ice.translate(0, 0.12, 0); o.mirror.push(tr(ice, 0x9cb6cc));
  for (let k = 0; k < 64; k++) {
    const a0 = k / 64 * Math.PI * 2, a1 = (k + 1) / 64 * Math.PI * 2;
    const p0 = new THREE.Vector3(Math.cos(a0) * 36.4, 0, Math.sin(a0) * 18.4), p1 = new THREE.Vector3(Math.cos(a1) * 36.4, 0, Math.sin(a1) * 18.4);
    const d = p1.clone().sub(p0), L = d.length();
    for (const [h, y, c] of [[1.1, 0.55, 0xf2f2f0], [0.14, 1.15, 0x2050a0]]) { const b = B(0.25, h, L + 0.05, 0, y, 0); b.rotateY(Math.atan2(d.x, d.z)); b.translate((p0.x + p1.x) / 2, 0, (p0.z + p1.z) / 2); o.paint.push(tr(b, c)); }
  }
  o.paint.push(tr(B(14, 4, 8, 0, 2, -30), 0x8a5a3a)); o.paint.push(tr(B(15, 0.6, 9, 0, 4.3, -30), 0x2a3a2e));
  return done(o);
}
// an el station: the platform at deck height outside the tracks, the iron posts, the curved
// copper roof, the head house with its arched windows and the stairs down
export function elStation(deck = 9.2) {
  const o = out(), R = seeded(111);
  o.stone.push(muv(B(5, 0.5, 60, -6.4, deck + 0.25, 0)));
  for (let k = 0; k < 9; k++) o.paint.push(tr(C(0.14, 0.18, 4.2, 8, -7.6, deck + 2.6, -24 + k * 6), 0x2a4a3a));
  const roof = new THREE.CylinderGeometry(4.2, 4.2, 58, 16, 1, true, -1.0, 2.0); roof.rotateX(Math.PI / 2); roof.scale(1, 0.4, 1); roof.translate(-6.6, deck + 3.7, 0); o.mirror.push(roof);
  o.brick.push(muv(B(9, 7, 12, -10.5, deck + 3.5, 18)));
  for (let k = 0; k < 3; k++) o.glass.push(pane(1.5, 3.2, 1, R()).rotateY(Math.PI / 2).translate(-6.0, deck + 3.4, 14 + k * 4));
  o.paint.push(tr(B(9.6, 0.8, 12.6, -10.5, deck + 7.3, 18), GREEN));
  for (let k = 0; k < 12; k++) o.stone.push(muv(B(2.4, deck * (k + 1) / 12, 1.0, -9.6, deck * (k + 1) / 24, -26 - k * 1.0)));
  for (let k = 0; k < 14; k++) o.paint.push(tr(B(0.06, 1.1, 0.06, -3.95, deck + 1.0, -26 + k * 4), BLACK));
  o.paint.push(tr(B(0.08, 0.08, 56, -3.95, deck + 1.55, 0), BLACK));
  return done(o);
}
