// Your Wife, My Number: the set-pieces of the second half, and the lyric boards as texts.
// The valet curb under its lit canopy, the house behind it with every window lit; the velvet
// rope down the line; one perfect slur (the martini going over); twelve dumb parts in grey, then
// her wink and a set of hearts; his clothes out of the window; the marble bathroom (the sink, the
// pearls, the mirror where my number writes itself in lipstick, the tub); floats in the pool you
// jump; brunch, the cloches lifting on the beat; the rumour (flashes in the hedge); the swans; the
// gold fountain; the cage of polished wood, all round you, splintered.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { groundAt, prepare } from './trail.js';
import { clamp, smooth, hash, TAU, V, rgb, seeded, merge, paint, shade, box, cyl, sph, lathe, tube, rbox, torus, roundRect, heartShape, vcMat, canvasTex, faceRoad, faceYaw, quat } from './ywn-lib.js';
import { beatInfo } from './ywn-place.js';

const GOLD = rgb(0xe0b84a), GOLD2 = rgb(0xc8962e), STONE = rgb(0xece4d4), RED = rgb(0xb8182a), WOOD = rgb(0x5a2410);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const spring = (f, k = 9, w = 16) => (f <= 0 ? 0 : 1 - Math.exp(-f * k) * Math.cos(f * w));

// the number in lipstick (for the bathroom mirror), the same hand as on the glass at the end
function lipTexture() {
  return canvasTex(1024, 320, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.save(); g.translate(430, 170); g.rotate(-0.06);
    g.font = 'italic 700 150px "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const R = seeded(9);
    for (let k = 0; k < 6; k++) { g.globalAlpha = 0.3; g.fillStyle = '#d01430'; g.fillText('555-0173', (R() - 0.5) * 5, (R() - 0.5) * 5); }
    g.globalAlpha = 0.92; g.fillStyle = '#c8102a'; g.fillText('555-0173', 0, 0); g.restore();
    g.save(); g.translate(900, 150); g.rotate(-0.2); g.fillStyle = '#c80e28'; g.globalAlpha = 0.92;
    g.beginPath(); g.moveTo(-80, 0); g.bezierCurveTo(-48, -44, -14, -30, 0, -14); g.bezierCurveTo(14, -30, 48, -44, 80, 0); g.bezierCurveTo(40, -5, -40, -5, -80, 0); g.fill();
    g.beginPath(); g.moveTo(-80, 5); g.bezierCurveTo(-40, 9, 40, 9, 80, 5); g.bezierCurveTo(48, 52, -48, 52, -80, 5); g.fill(); g.restore();
  });
}
let TX2 = null;
const tex2 = () => TX2 || (TX2 = { lip: lipTexture() });

// ---------- geometry ----------
const SG = {
  // the porte-cochère: a lit canopy on four columns, the red carpet out to the curb, the valet's
  // podium with its lamp, the key box with the keys on their hooks (front +z to the road)
  porte() {
    const P = [];
    P.push(shade(box(22, 1.4, 16, 0, 10.2, 0), rgb(0xf2ece0), 0.85, 1.0));
    P.push(paint(box(22.6, 0.5, 16.6, 0, 11.1, 0), GOLD));
    for (const x of [-9.6, 9.6]) for (const z of [-6.6, 6.6]) { P.push(paint(cyl(0.75, 0.85, 9.4, 16, x, 4.9, z), STONE)); P.push(paint(box(2.0, 0.5, 2.0, x, 0.25, z), STONE)); P.push(paint(box(2.0, 0.5, 2.0, x, 9.6, z), STONE)); }
    P.push(paint(box(6, 0.12, 30, 0, 0.06, 7), rgb(0x9a1426)));
    for (const s of [-1, 1]) P.push(paint(box(0.4, 0.14, 30, s * 3.2, 0.08, 7), GOLD));
    P.push(paint(box(3.6, 4.2, 2.2, 7, 2.1, 9.5), rgb(0x1e3a2a))); P.push(paint(box(4.0, 0.3, 2.6, 7, 4.35, 9.5), GOLD));
    P.push(paint(cyl(0.08, 0.08, 1.2, 6, 8.2, 5.0, 9.0), rgb(0x2a2a2a)));
    P.push(paint(box(5.5, 7, 0.8, -7, 4.5, -6.5), rgb(0x2a2420)));
    for (let k = 0; k < 15; k++) P.push(paint(box(0.3, 1.0, 0.3, -9 + (k % 5) * 1.0, 6.4 - Math.floor(k / 5) * 1.8, -6.0), GOLD));
    return merge(P);
  },
  // the house behind the curb: a portico on six columns, a pediment, wings, a balustrade,
  // a slate roof; its windows are their own (lit) piece. Front +z.
  mansion() {
    const P = [], st = rgb(0xece4d4), slate = rgb(0x3a3e46);
    P.push(shade(box(44, 22, 20, 0, 11, 0), st, 0.82, 1.0));
    for (const s of [-1, 1]) { P.push(shade(box(30, 16, 16, s * 37, 8, -2), st, 0.82, 1.0)); P.push(shade(box(31, 6, 17, s * 37, 19, -2.5).translate(0, 0, 0), slate, 0.7, 1.0)); }
    P.push(shade(box(46, 8, 21, 0, 26, -0.5), slate, 0.7, 1.0));
    for (let k = 0; k < 6; k++) { const x = -12.5 + k * 5; P.push(paint(cyl(1.0, 1.15, 16, 16, x, 8.6, 13.5), rgb(0xf6f0e4))); P.push(paint(box(2.6, 0.8, 2.6, x, 0.4, 13.5), st)); P.push(paint(box(2.6, 0.8, 2.6, x, 16.9, 13.5), st)); }
    P.push(paint(box(32, 2.2, 6, 0, 18.4, 12.5), st));
    const ped = new THREE.Shape(); ped.moveTo(-16.5, 0); ped.lineTo(16.5, 0); ped.lineTo(0, 7); ped.closePath();
    const pg = new THREE.ExtrudeGeometry(ped, { depth: 5, bevelEnabled: false }); pg.translate(0, 19.5, 10); P.push(shade(pg, st, 0.85, 1.0));
    for (let k = 0; k < 4; k++) P.push(paint(box(36, 0.8, 7, 0, 0.4 + k * 0.8, 17 - k * 1.0), st));
    for (let k = 0; k < 40; k++) P.push(paint(box(0.4, 1.4, 0.4, -21.5 + k * 1.1, 22.7, 9.6), st));
    P.push(paint(box(44, 0.4, 0.6, 0, 23.5, 9.6), st));
    for (const x of [-15, -5, 5, 15]) P.push(paint(box(3, 3.6, 3, x, 30.6, 9.0), slate));
    for (const s of [-1, 1]) P.push(paint(box(3, 10, 3, s * 18, 33, -2), rgb(0x8a8078)));
    return merge(P);
  },
  // the mansion's windows: tall lit panes in rows, glazing bars dark
  mansionWin() {
    const P = [];
    const pane = (x, y, z, w, h) => P.push(box(w, h, 0.3, x, y, z));
    for (const y of [4.5, 12.5]) for (let k = 0; k < 7; k++) { const x = -18 + k * 6; if (Math.abs(x) < 14 && y < 8) continue; pane(x, y, 10.05, 2.6, 5); }
    for (const s of [-1, 1]) for (const y of [4.2, 11.4]) for (let k = 0; k < 4; k++) pane(s * (26 + k * 7), y, 6.05, 2.4, 4.4);
    for (const x of [-15, -5, 5, 15]) pane(x, 30.6, 10.55, 1.6, 2.2);
    pane(0, 5, 10.05, 4, 8);
    return paint(merge(P), [1, 0.7, 0.4]);
  },
  // a brass post with a ball on top (for the rope along the rail)
  stanchion() { return merge([paint(cyl(0.45, 0.55, 0.25, 12, 0, 0.12, 0), GOLD), paint(cyl(0.08, 0.08, 1.9, 8, 0, 1.0, 0), GOLD), paint(sph(0.16, 1, 1, 1, 0, 2.0, 0, 8, 6), GOLD)]); },
  rope() { const g = new THREE.CylinderGeometry(0.09, 0.09, 1, 6, 1, true); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.5); return paint(g, [0.62, 0.05, 0.1]); },
  // the martini: the cone of the glass on its stem, the olive on its pick (front +z)
  martini() {
    const P = [], gl = rgb(0xe8f0f4);
    P.push(paint(new THREE.CylinderGeometry(6, 0.3, 6, 32, 1, true).translate(0, 13, 0), gl));
    P.push(paint(cyl(0.35, 0.35, 10, 10, 0, 5, 0), gl)); P.push(paint(cyl(3.6, 3.8, 0.4, 32, 0, 0.2, 0), gl));
    P.push(paint(torus(6, 0.18, 6, 40).rotateX(Math.PI / 2).translate(0, 16, 0), gl));
    P.push(paint(new THREE.TorusGeometry(6, 0.2, 6, 8, 0.6).rotateX(Math.PI / 2).rotateY(1.2).translate(0, 16.05, 0), RED));
    P.push(paint(tube(V(-2.2, 10.6, 0.6), V(3.4, 18.2, -0.4), 0.12, 0.1, 5), GOLD));
    P.push(paint(sph(1.1, 1, 0.85, 0.85, 0.2, 13.4, 0.2, 14, 10), rgb(0x6a8a2a))); P.push(paint(sph(0.45, 1, 1, 1, 0.9, 13.8, 0.8, 8, 6), rgb(0xd83a1a)));
    return merge(P);
  },
  gin() { return cyl(5.1, 0.6, 0.06, 32, 0, 15.0, 0); },
  // a grey text: a bubble with its lines of nothing much on it (front +z)
  greyText() { return merge([shade(rbox(10, 3.4, 0.7, 1.4), rgb(0xc4c6cc), 0.85, 1.05), paint(box(7.2, 0.32, 0.2, -0.6, 0.7, 0.4), rgb(0x6a6c74)), paint(box(5.2, 0.32, 0.2, -1.6, -0.5, 0.4), rgb(0x6a6c74)), paint(new THREE.ConeGeometry(0.7, 1.2, 3).rotateZ(Math.PI * 0.75).translate(-4.6, -1.8, 0), rgb(0xc4c6cc))]); },
  // her text: pink, a winking face on it
  winkText() {
    const P = [];
    P.push(shade(rbox(13, 8, 1.0, 2.6), rgb(0xf8b8cc), 0.85, 1.05));
    P.push(paint(new THREE.ConeGeometry(1.2, 2.2, 3).rotateZ(-Math.PI * 0.75).translate(5.8, -4.2, 0), rgb(0xf8b8cc)));
    P.push(paint(sph(0.7, 1, 1.25, 0.4, -2.2, 1.4, 0.55, 12, 8), rgb(0x2a1418)));
    P.push(paint(new THREE.TorusGeometry(0.8, 0.22, 6, 14, Math.PI).rotateZ(Math.PI).translate(2.2, 1.6, 0.55), rgb(0x2a1418)));
    P.push(paint(new THREE.TorusGeometry(2.8, 0.3, 6, 20, Math.PI * 0.8).rotateZ(Math.PI + Math.PI * 0.1).translate(0, 0.2, 0.55), rgb(0x2a1418)));
    return merge(P);
  },
  heart() { const g = new THREE.ExtrudeGeometry(heartShape(1), { depth: 0.35, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.15, bevelSegments: 2, curveSegments: 12 }); g.translate(0, 0, -0.17); return paint(g, rgb(0xe8102e)); },
  // his things, thrown out: a shirt, a tie, a jacket (flat, they flutter)
  shirt() { const s = new THREE.Shape(); s.moveTo(-1.2, -2); s.lineTo(1.2, -2); s.lineTo(1.2, 0.8); s.lineTo(2.4, 0.2); s.lineTo(2.9, 1.0); s.lineTo(1.4, 2.2); s.lineTo(0.5, 2.1); s.lineTo(0, 1.6); s.lineTo(-0.5, 2.1); s.lineTo(-1.4, 2.2); s.lineTo(-2.9, 1.0); s.lineTo(-2.4, 0.2); s.lineTo(-1.2, 0.8); s.closePath(); return shade(new THREE.ShapeGeometry(s), [1, 1, 1], 0.8, 1.05); },
  tie() { const s = new THREE.Shape(); s.moveTo(-0.25, 1.8); s.lineTo(0.25, 1.8); s.lineTo(0.45, -1.4); s.lineTo(0, -1.9); s.lineTo(-0.45, -1.4); s.closePath(); return shade(new THREE.ShapeGeometry(s), [1, 1, 1], 0.8, 1.05); },
  // a facade with a window flung open, upstairs: where his things come out
  wing() {
    const P = [], st = rgb(0xece4d4);
    P.push(shade(box(40, 26, 6, 0, 13, -1), st, 0.82, 1.0));
    P.push(paint(box(40.6, 1.2, 6.6, 0, 26.2, -1), rgb(0xf6f0e4)));
    P.push(shade(box(41, 5, 7, 0, 29, -1.5), rgb(0x3a3e46), 0.7, 1.0));
    for (let k = 0; k < 5; k++) for (const y of [5, 14, 21]) { if (k === 2 && y === 21) continue; P.push(paint(box(3.6, 5.6, 0.3, -16 + k * 8, y, 2.0), rgb(0xf6f0e4))); }
    for (const s of [-1, 1]) { const sh = box(1.9, 6, 0.3, 0, 0, 0); sh.rotateY(s * 1.1); sh.translate(s * 2.9, 21, 2.8); P.push(paint(sh, rgb(0x1e3a2a))); }
    return merge(P);
  },
  // its windows, lit as the evening comes; the one flung open brightest
  wingWin() { const P = []; for (let k = 0; k < 5; k++) for (const y of [5, 14, 21]) P.push(box(k === 2 && y === 21 ? 4 : 3, k === 2 && y === 21 ? 6 : 5, 0.4, -16 + k * 8, y, 2.1)); return paint(merge(P), [0.95, 0.66, 0.38]); },
  // the marble bathroom: a pedestal basin with gold taps; a clawfoot tub full of foam; the vanity's
  // mirror in its gold frame (the glass and the writing are their own)
  sink() { return merge([paint(lathe([[0, 0], [4, 0], [3, 2], [2.6, 10], [6, 13], [9, 15.4], [9.4, 16], [0, 16]], 32), rgb(0xf2eee8)), paint(cyl(7.8, 7.8, 0.4, 32, 0, 15.6, 0), rgb(0xb8c8d0)), paint(tube(V(0, 15.8, -7), V(0, 20, -7), 0.6), GOLD), paint(tube(V(0, 20, -7), V(0, 20.6, -3.4), 0.6), GOLD), paint(sph(0.9, 1, 1, 1, 2.4, 18, -7, 8, 6), GOLD), paint(sph(0.9, 1, 1, 1, -2.4, 18, -7, 8, 6), GOLD)]); },
  tub() {
    const P = [];
    const body = lathe([[0, 0.2], [5.5, 0.4], [6.2, 2], [6.4, 6.4], [6.8, 7.0], [6.6, 7.2], [5.8, 6.6], [5.6, 1.4], [0, 1.4]], 28); body.scale(1, 1, 2.1); body.translate(0, 3, 0);
    P.push(paint(body, rgb(0xf6f4f0)));
    for (const x of [-4.4, 4.4]) for (const z of [-9.5, 9.5]) P.push(paint(sph(1.1, 1, 1.6, 1, x, 1.8, z, 10, 8), GOLD));
    const R = seeded(12); for (let k = 0; k < 40; k++) P.push(paint(sph(0.9 + R() * 1.2, 1, 0.7, 1, (R() - 0.5) * 9, 9.6 + R() * 1.2, (R() - 0.5) * 22, 8, 6), [1.1, 1.1, 1.12]));
    P.push(paint(tube(V(0, 10, -13.4), V(0, 15, -13.4), 0.5), GOLD)); P.push(paint(tube(V(0, 15, -13.4), V(0, 15, -10.5), 0.5), GOLD));
    return merge(P);
  },
  mirrorFrame() { const P = []; for (const [w, h, x, y] of [[25.4, 1.4, 0, 8.7], [25.4, 1.4, 0, -8.7], [1.4, 18.8, -12.7, 0], [1.4, 18.8, 12.7, 0]]) P.push(shade(box(w, h, 1.0, x, y, 0), GOLD, 0.8, 1.1)); P.push(paint(sph(1.8, 1.4, 1, 0.6, 0, 9.8, 0.3, 14, 8), GOLD2)); P.push(paint(box(30, 7, 7, 0, -12.5, -2), rgb(0xf0ece6))); P.push(paint(box(31, 0.6, 7.6, 0, -8.8, -2), rgb(0xe8e2da))); return merge(P); },
  pearl() { return sph(1, 1, 1, 1, 0, 0, 0, 14, 10); },
  // floats in the pool: a swan, a ring, a donut, a lilo (each its own)
  swanFloat() { const P = [shade(sph(2.6, 1, 0.7, 1.5, 0, 1.0, 0, 18, 12), [1, 1, 1], 0.8, 1.05)]; let p = V(0, 2.0, 2.8); for (let k = 0; k < 7; k++) { const n = V(0, p.y + 0.85, p.z + Math.sin(k * 0.5) * 0.5 - 0.15); P.push(paint(tube(p, n, 0.55, 0.5, 8), [1, 1, 1])); p = n; } P.push(paint(sph(0.75, 1, 0.9, 1.3, 0, p.y + 0.3, p.z + 0.4, 10, 8), [1, 1, 1])); P.push(paint(new THREE.ConeGeometry(0.35, 1.1, 8).rotateX(Math.PI / 2).translate(0, p.y + 0.2, p.z + 1.6), rgb(0xf08020))); for (const s of [-1, 1]) P.push(paint(sph(1.4, 0.5, 0.5, 1.4, s * 2.3, 1.6, -0.3, 10, 8), [0.96, 0.96, 0.98])); return merge(P); },
  ring() { const g = torus(1.9, 0.75, 10, 28).rotateX(Math.PI / 2).translate(0, 0.5, 0); const c = new Float32Array(g.attributes.position.count * 3), p = g.attributes.position.array; for (let i = 0; i < g.attributes.position.count; i++) { const a = Math.atan2(p[i * 3 + 2], p[i * 3]); const w = Math.floor((a + Math.PI) / (Math.PI / 4)) % 2; c.set(w ? [1, 1, 1] : [1, 0.25, 0.35], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; },
  donut() { const R = seeded(5), P = [paint(torus(2.0, 0.95, 10, 28).rotateX(Math.PI / 2).translate(0, 0.5, 0), rgb(0xf8a0c0))]; for (let k = 0; k < 30; k++) { const a = R() * TAU, r = 1.4 + R() * 1.2; P.push(paint(box(0.12, 0.12, 0.45, Math.cos(a) * r, 1.35, Math.sin(a) * r).rotateY(R() * 3), [[1, 1, 0.4], [0.4, 0.8, 1], [1, 1, 1], [0.5, 1, 0.5]][k % 4])); } return merge(P); },
  lilo() { const P = []; for (let k = 0; k < 6; k++) P.push(paint(rbox(1.1, 0.7, 6.4, 0.34, -2.75 + k * 1.1, 0.4, 0), k % 2 ? [1, 1, 1] : rgb(0x3aa8d8))); P.push(paint(rbox(6.6, 1.0, 1.6, 0.45, 0, 0.6, 3.6), rgb(0x3aa8d8))); return merge(P); },
  // a lounger and a striped parasol, poolside
  lounger() { return merge([paint(box(2.2, 0.5, 6, 0, 1.2, 0), rgb(0x8a5a32)), paint(box(2.0, 0.3, 5.6, 0, 1.6, 0), rgb(0xf6f2ea)), paint(box(2.0, 0.3, 2.2, 0, 2.6, -3.0).rotateX(0), rgb(0xf6f2ea)), ...[-0.9, 0.9].flatMap((x) => [-2.6, 2.6].map((z) => paint(box(0.2, 1.0, 0.2, x, 0.5, z), rgb(0x8a5a32))))]); },
  parasol() { const g = new THREE.ConeGeometry(5.2, 1.8, 16, 1, true).translate(0, 7.4, 0); const c = new Float32Array(g.attributes.position.count * 3), p = g.attributes.position.array; for (let i = 0; i < g.attributes.position.count; i++) { const a = Math.atan2(p[i * 3 + 2], p[i * 3]); c.set(Math.floor((a + Math.PI) / (TAU / 16)) % 2 ? [1, 1, 1] : rgb(0xe0b84a), i * 3); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return merge([g, paint(cyl(0.15, 0.15, 7.6, 6, 0, 3.8, 0), rgb(0xe8e0d0))]); },
  // brunch: the long table (along z), its cloth, the plates and glasses (cloches are their own)
  brunch() {
    const P = [], R = seeded(3);
    P.push(shade(box(9, 0.6, 46, 0, 6.2, 0), rgb(0xf8f4ec), 0.9, 1.05));
    for (const s of [-1, 1]) P.push(shade(box(0.2, 5.6, 46, s * 4.5, 3.4, 0), rgb(0xf4efe4), 0.75, 1.0));
    for (let k = 0; k < 8; k++) {
      const z = -19.6 + k * 5.6;
      for (const s of [-1, 1]) { P.push(paint(cyl(1.7, 1.7, 0.2, 24, s * 2.2, 6.6, z), rgb(0xfafafa))); P.push(paint(cyl(1.3, 1.3, 0.22, 24, s * 2.2, 6.7, z), rgb(0xe8c050))); P.push(paint(new THREE.CylinderGeometry(0.4, 0.1, 1.8, 10, 1, true).translate(s * 3.4, 8.2, z + 1.6), rgb(0xe8f0f4))); P.push(paint(cyl(0.05, 0.05, 1.2, 5, s * 3.4, 6.9, z + 1.6), rgb(0xe8f0f4))); }
    }
    for (const z of [-14, 0, 14]) { P.push(paint(cyl(0.3, 0.6, 4.4, 10, 0, 8.6, z), GOLD)); for (const s of [-1, 0, 1]) { P.push(paint(cyl(0.18, 0.18, 2.2, 6, s * 1.1, 11.6, z), [1, 0.97, 0.9])); } P.push(paint(box(2.4, 0.2, 0.3, 0, 10.6, z), GOLD)); }
    for (let k = 0; k < 3; k++) P.push(paint(cyl(2.4 - k * 0.7, 2.4 - k * 0.7, 0.15, 20, 0, 9.0 + k * 2.2, 7), [0.95, 0.95, 0.96]));
    P.push(paint(cyl(0.12, 0.12, 6.6, 6, 0, 9.6, 7), GOLD));
    for (let k = 0; k < 16; k++) { const a = R() * TAU, r = R() * 1.6; P.push(paint(sph(0.45, 1, 1, 1, Math.cos(a) * r, 9.6 + Math.floor(k / 6) * 2.2 + 0.3, 7 + Math.sin(a) * r, 8, 6), k % 3 ? rgb(0xc8102a) : rgb(0xf4c0d0))); }
    return merge(P);
  },
  cloche() { return merge([paint(sph(1.5, 1, 0.8, 1, 0, 0, 0, 18, 10).translate(0, 0, 0), [0.86, 0.88, 0.92]), paint(sph(0.3, 1, 1, 1, 0, 1.3, 0, 8, 6), GOLD)]).translate(0, 0, 0); },
  treat(k) { if (k === 0) return merge([paint(sph(0.75, 1, 0.9, 1, 0, 0.6, 0, 12, 8), rgb(0xd0102a)), paint(cyl(0.05, 0.05, 0.6, 5, 0, 1.4, 0), rgb(0x4a2a10))]); if (k === 1) return merge([paint(cyl(0.35, 0.35, 1.2, 12, 0, 0.6, 0), GOLD), paint(cyl(0.28, 0.28, 0.9, 12, 0, 1.6, 0), rgb(0xd0102a))]); return merge([paint(sph(0.4, 1, 1, 1, -0.3, 0.45, 0, 8, 6), rgb(0xb0101e)), paint(sph(0.4, 1, 1, 1, 0.35, 0.4, 0.1, 8, 6), rgb(0xb0101e)), paint(tube(V(-0.3, 0.8, 0), V(0.1, 1.6, 0), 0.04, 0.04, 4), rgb(0x3a5a1a)), paint(tube(V(0.35, 0.75, 0.1), V(0.1, 1.6, 0), 0.04, 0.04, 4), rgb(0x3a5a1a))]); },
  // a swan, gliding (front +z)
  swan() { const P = [shade(sph(1.2, 1, 0.75, 1.8, 0, 0.9, 0, 16, 10), [1, 1, 1], 0.8, 1.05)]; let p = V(0, 1.4, 1.6); const pts = [[0, 0.9, 0.3], [0, 0.9, 0.0], [0, 0.8, -0.3], [0, 0.6, -0.2], [0, 0.3, 0.3]]; for (const d of pts) { const n = V(0, p.y + d[1], p.z + d[2]); P.push(paint(tube(p, n, 0.32, 0.28, 8), [1, 1, 1])); p = n; } P.push(paint(sph(0.42, 1, 0.9, 1.4, 0, p.y, p.z + 0.2, 10, 8), [1, 1, 1])); P.push(paint(new THREE.ConeGeometry(0.18, 0.7, 8).rotateX(Math.PI / 2 + 0.3).translate(0, p.y - 0.15, p.z + 0.85), rgb(0xe86a1a))); P.push(paint(sph(1.0, 0.6, 0.6, 1.4, 0, 1.6, -1.1, 10, 8), [0.95, 0.95, 0.97])); return merge(P); },
  // the gold fountain: three basins on a column (its water is the gold drops)
  fountain() { return merge([shade(lathe([[0, 0], [11, 0], [11.4, 1.6], [10.8, 2.0], [2.2, 2.4], [1.6, 7], [6.6, 8.2], [7, 9.2], [1.2, 9.6], [1.0, 13.6], [3.8, 14.4], [4, 15.2], [0.8, 15.6], [0.6, 18.6], [1.2, 19.4], [0, 20]], 32), rgb(0xe8c050), 0.8, 1.1)]); },
  // one rib of the cage: a quarter of its arch (from the lawn up to the crown), polished wood
  rib() { const P = [], n = 10; for (let k = 0; k < n; k++) { const a0 = (k / n) * Math.PI / 2, a1 = ((k + 1) / n) * Math.PI / 2; P.push(paint(tube(V(Math.cos(a0), Math.sin(a0), 0), V(Math.cos(a1), Math.sin(a1), 0), 0.035, 0.035, 8), WOOD)); } P.push(paint(torus(0.05, 0.02, 6, 12).rotateY(Math.PI / 2).translate(Math.cos(0.6), Math.sin(0.6), 0), GOLD)); return merge(P); },
  bar() { return paint(cyl(0.35, 0.35, 1, 8, 0, 0.5, 0).rotateX(Math.PI / 2).translate(0, 0, 0), WOOD); },
  dome() { const P = []; for (const y of [0.6]) P.push(paint(torus(26, 1.1, 8, 64).rotateX(Math.PI / 2).translate(0, y, 0), WOOD)); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; for (let j = 0; j < 6; j++) { const u0 = j / 6, u1 = (j + 1) / 6; const p0 = V(Math.cos(a) * 26 * Math.cos(u0 * Math.PI / 2), 40 + 14.3 * Math.sin(u0 * Math.PI / 2), Math.sin(a) * 26 * Math.cos(u0 * Math.PI / 2)); const p1 = V(Math.cos(a) * 26 * Math.cos(u1 * Math.PI / 2), 40 + 14.3 * Math.sin(u1 * Math.PI / 2), Math.sin(a) * 26 * Math.cos(u1 * Math.PI / 2)); P.push(paint(tube(p0, p1, 0.6), WOOD)); } } P.push(paint(torus(26, 1.1, 8, 64).rotateX(Math.PI / 2).translate(0, 40, 0), WOOD)); P.push(paint(torus(3, 0.8, 8, 20).translate(0, 57, 0), GOLD)); return merge(P); },
  shard() { return paint(box(0.25, 2.2, 0.25), rgb(0x7a3a1a)); },
  // the lyric bubble: a rounded bubble with a little tail, a gold rim behind
  bubble() { const P = [rbox(26, 9.6, 1.0, 3.4)]; const t = new THREE.Shape(); t.moveTo(-1.6, 0); t.lineTo(1.6, 0); t.lineTo(-0.6, -3.2); t.closePath(); const tg = new THREE.ExtrudeGeometry(t, { depth: 0.9, bevelEnabled: false }); tg.translate(0, -4.6, -0.45); P.push(tg); return merge(P); },
  bubbleRim() { return paint(rbox(27, 10.6, 0.6, 3.8, 0, 0, -0.45), GOLD); },
  dots() { const P = [rbox(7, 3.6, 0.8, 1.6)]; return merge(P); },
};

// ---------- materials ----------
const vc = (key, o) => (M) => M[key] || (M[key] = vcMat(o));
const goldM = vc('ywnGoldM', { rough: 0.22, metal: 0.85, k: 0.9 });
const stoneM = vc('ywnStoneM', { rough: 0.8, k: 1.0 });
const houseM = vc('ywnHouseM', { rough: 0.6, k: 1.2 });
const glassyM = vc('ywnGlassyM', { rough: 0.08, metal: 0.3, k: 1.1 });
const plasticM = vc('ywnPlasticM', { rough: 0.25, metal: 0.05, k: 0.9 });
const flatM = (M) => M.ywnFlatM || (M.ywnFlatM = vcMat({ rough: 0.8, k: 1.0, tint: true, side: THREE.DoubleSide }));
const winM = (M) => M.ywnWinM || (M.ywnWinM = vcMat({ rough: 0.3, k: 0.2, glow: true }));
const pearlM = (M) => M.ywnPearlM || (M.ywnPearlM = new THREE.MeshStandardMaterial({ color: 0xf8f2ec, roughness: 0.12, metalness: 0.25, emissive: 0xfff4ec, emissiveIntensity: 0.35 }));
// the lyric bubbles: unlit, the same light as the words on them (and the beat in it)
function bubbleMat(M, key, hex) {
  return M[key] || (M[key] = new THREE.ShaderMaterial({
    uniforms: { uBg: { value: new THREE.Color(hex) }, uBeat: M.sign.uniforms.uBeat, uFogColor: M.sign.uniforms.uFogColor, uFogDensity: M.sign.uniforms.uFogDensity, uCam: M.sign.uniforms.uCam },
    vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform vec3 uBg, uFogColor, uCam; uniform float uBeat, uFogDensity; varying vec3 vW; varying vec3 vN; void main(){ vec3 V = normalize(uCam - vW); float rim = 1.0 - abs(dot(normalize(vN), V)); vec3 col = uBg * 2.2 * (0.85 + 0.35 * uBeat) * (1.0 - 0.25 * rim); float d = length(uCam - vW); float fog = 1.0 - exp(-pow(d * uFogDensity * 0.7, 1.5)); gl_FragColor = vec4(mix(col, uFogColor, clamp(fog, 0.0, 1.0)), 1.0); }',
  }));
}
const lipRevealM = (M) => M.ywnLipRM || (M.ywnLipRM = (() => {
  const m = new THREE.MeshBasicMaterial({ map: tex2().lip, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: new THREE.Color(1.2, 1.0, 1.0) });
  m.userData.reveal = { value: 0 };
  m.onBeforeCompile = (sh) => { sh.uniforms.uReveal = m.userData.reveal; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vRu;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRu = uv;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uReveal; varying vec2 vRu;').replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.a *= smoothstep(uReveal, uReveal - 0.03, vRu.x);'); };
  m.customProgramCacheKey = () => 'ywnLipR';
  return m;
})());
const mirrorM = (M) => M.ywnMirrorM || (M.ywnMirrorM = new THREE.ShaderMaterial({
  uniforms: { uCam: M.sign.uniforms.uCam },
  vertexShader: 'varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: 'uniform vec3 uCam; varying vec3 vW; varying vec2 vUv; void main(){ vec3 c = mix(vec3(0.42, 0.46, 0.5), vec3(0.86, 0.9, 0.94), smoothstep(0.0, 1.0, vUv.y + 0.2 * sin(vW.x * 0.05 + vW.z * 0.05))); c += vec3(0.25) * pow(max(sin((vUv.x + vUv.y) * 9.0 + (vW.x + vW.z) * 0.02), 0.0), 12.0); gl_FragColor = vec4(c, 1.0); }',
}));

extend({
  layers: {
    ywnPorte: (M) => [SG.porte(), houseM(M), 3, {}],
    ywnMansion: (M) => [SG.mansion(), houseM(M), 3, {}],
    ywnMansionWin: (M) => [SG.mansionWin(), winM(M), 3, { aGlow: 1 }],
    ywnStanchion: (M) => [SG.stanchion(), goldM(M), 60, {}],
    ywnRope: (M) => [SG.rope(), vc('ywnVelvetM', { rough: 0.9, k: 0.6 })(M), 60, {}],
    ywnMartini: (M) => [SG.martini(), glassyM(M), 3, {}],
    ywnGin: (M) => [SG.gin(), M.ywnGinM || (M.ywnGinM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 1.15, 1.2), transparent: true, opacity: 0.6, depthWrite: false })), 3, {}],
    ywnGrey: (M) => [SG.greyText(), vc('ywnTextM', { rough: 0.5, k: 1.4 })(M), 14, {}],
    ywnWink: (M) => [SG.winkText(), vc('ywnTextM', { rough: 0.5, k: 1.4 })(M), 3, {}],
    ywnHeartFly: (M) => [SG.heart(), plasticM(M), 40, {}],
    ywnShirt: (M) => [SG.shirt(), flatM(M), 40, { aTint: 3 }],
    ywnTie: (M) => [SG.tie(), flatM(M), 40, { aTint: 3 }],
    ywnFacade: (M) => [SG.wing(), houseM(M), 3, {}],
    ywnFacadeWin: (M) => [SG.wingWin(), winM(M), 3, { aGlow: 1 }],
    ywnSink: (M) => [SG.sink(), vc('ywnPorcelainM', { rough: 0.15, metal: 0.2, k: 0.8 })(M), 3, {}],
    ywnTub: (M) => [SG.tub(), vc('ywnPorcelainM', { rough: 0.15, metal: 0.2, k: 0.8 })(M), 3, {}],
    ywnMirrorFrame: (M) => [SG.mirrorFrame(), goldM(M), 3, {}],
    ywnMirror: (M) => [new THREE.PlaneGeometry(24, 16), mirrorM(M), 3, {}],
    ywnLipWrite: (M) => [(() => { const g = new THREE.PlaneGeometry(22, 6.9); g.translate(0, 1, 0.06); return g; })(), lipRevealM(M), 3, {}],
    ywnPearl: (M) => [SG.pearl(), pearlM(M), 1000, {}],
    ywnSwanFloat: (M) => [SG.swanFloat(), plasticM(M), 8, {}],
    ywnRing: (M) => [SG.ring(), plasticM(M), 16, {}],
    ywnDonut: (M) => [SG.donut(), plasticM(M), 8, {}],
    ywnLilo: (M) => [SG.lilo(), plasticM(M), 8, {}],
    ywnLounger: (M) => [SG.lounger(), vc('ywnClothM', { rough: 0.85, k: 1.4 })(M), 60, {}],
    ywnParasol: (M) => [SG.parasol(), vc('ywnClothM2', { rough: 0.85, k: 1.2, side: THREE.DoubleSide })(M), 40, {}],
    ywnBrunch: (M) => [SG.brunch(), vc('ywnClothM', { rough: 0.85, k: 1.4 })(M), 3, {}],
    ywnCloche: (M) => [SG.cloche(), vc('ywnSilverM', { rough: 0.15, metal: 0.9, k: 0.9 })(M), 24, {}],
    ywnTreat0: (M) => [SG.treat(0), plasticM(M), 12, {}],
    ywnTreat1: (M) => [SG.treat(1), plasticM(M), 12, {}],
    ywnTreat2: (M) => [SG.treat(2), plasticM(M), 12, {}],
    ywnSwan: (M) => [SG.swan(), vc('ywnDoveM', { rough: 0.7, k: 0.8 })(M), 12, {}],
    ywnFountain: (M) => [SG.fountain(), goldM(M), 3, {}],
    ywnRib: (M) => [SG.rib(), vc('ywnWoodM', { rough: 0.18, metal: 0.25, k: 0.8 })(M), 260, {}],
    ywnBar: (M) => [SG.bar(), vc('ywnWoodM', { rough: 0.18, metal: 0.25, k: 0.8 })(M), 400, {}],
    ywnDome: (M) => [SG.dome(), vc('ywnWoodM', { rough: 0.18, metal: 0.25, k: 0.8 })(M), 3, {}],
    ywnShard: (M) => [SG.shard(), vc('ywnWoodM', { rough: 0.18, metal: 0.25, k: 0.8 })(M), 260, {}],
    ywnBubble: (M) => [SG.bubble(), bubbleMat(M, 'ywnBubbleM', (M.P && M.P.ywnBubble) || 0x76705e), 24, {}],
    ywnBubbleRim: (M) => [SG.bubbleRim(), goldM(M), 24, {}],
    ywnBubbleFace: (M) => [(() => { const g = new THREE.PlaneGeometry(7.5, 2.35); g.scale(23 / 7.5, 7.2 / 2.35, 1); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); g.translate(0, 0, 0.56); return g; })(), M.sign, 24, { aIdx: 1, aWake: 2 }],
    ywnDots: (M) => [SG.dots(), bubbleMat(M, 'ywnBubbleM', (M.P && M.P.ywnBubble) || 0x76705e), 6, {}],
    ywnDot: (M) => [sph(0.6, 1, 1, 0.5, 0, 0, 0.5, 10, 8), M.ywnDotM || (M.ywnDotM = new THREE.MeshBasicMaterial({ color: 0x2a2a30 })), 24, {}],
  },
  parts: {
    // the porte-cochère and the valet curb; its lights under the canopy
    ywnPorte(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnPorte; if (!S.track) return;
      const s = it.s ?? 1, m = S._m; m.compose(p, q, S._s.set(s, s, s)); L.ywnPorte.add(m);
      const k = 0.6 + 0.8 * (S.ywnK ? S.ywnK.lamps : 0.5);
      for (const x of [-6, 0, 6]) for (const z of [-4, 4]) { const w = local(p, yaw, x * s, 9.3 * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, 2.2 * s, [1, 0.85, 0.6], k); }
      const w = local(p, yaw, 8.2 * s, 5.8 * s, 9.0 * s, S._o); glowAt(S, w.x, w.y, w.z, 1.6 * s, [1, 0.9, 0.6], 1.4 * k);
      poolAt(S, p.x, p.y + 0.12, p.z, 30 * s, [1, 0.82, 0.55], 0.6 * k);
      // the keys catch the light, one a beat
      const bi = beatInfo(S), kk = bi.i % 15, kw = local(p, yaw, (-9 + (kk % 5)) * s, (6.4 - Math.floor(kk / 5) * 1.8) * s, -5.8 * s, S._o); glowAt(S, kw.x, kw.y, kw.z, 1.4 * s, [1, 0.9, 0.6], 1.6 * bi.pulse);
    },
    // the house, every window lit as the evening comes
    ywnMansion(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnMansion; void L.ywnMansionWin; if (!S.track) return;
      const s = it.s ?? 1, m = S._m, k = 0.3 + 1.4 * (S.ywnK ? S.ywnK.lamps : 0.5);
      m.compose(p, q, S._s.set(s, s, s)); L.ywnMansion.add(m); L.ywnMansionWin.add(m, { aGlow: k });
      const w = local(p, yaw, 0, 12 * s, 16 * s, S._o); glowAt(S, w.x, w.y, w.z, 60 * s, [1, 0.82, 0.55], 0.12 * k);
      for (const x of [-14, 14]) { const g = local(p, yaw, x * s, 15 * s, 17 * s, S._o); glowAt(S, g.x, g.y, g.z, 3 * s, [1, 0.85, 0.55], 0.9 * k); }
    },
    // his clothes out of the upstairs window, fluttering down onto the lawn
    ywnClothes(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnFacade; void L.ywnFacadeWin; void L.ywnShirt; void L.ywnTie; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      m.compose(p, q, S._s.set(s, s, s)); L.ywnFacade.add(m); L.ywnFacadeWin.add(m, { aGlow: 0.3 + 1.3 * (S.ywnK ? S.ywnK.lamps : 0.5) });
      // (the wall's front is +z, to the road: out of the window is +z, along it is x)
      const R = seeded(44);
      for (let k = 0; k < (it.n ?? 22); k++) {
        const t0 = it.at + k * 0.11 + R() * 0.05, f = T - t0, kind = R() < 0.65 ? 'ywnShirt' : 'ywnTie';
        const tint = kind === 'ywnShirt' ? [[1, 1, 1], [0.7, 0.82, 1], [1, 0.8, 0.86], [0.92, 0.92, 0.86]][k % 4] : [[0.7, 0.06, 0.12], [0.1, 0.12, 0.35], [0.85, 0.7, 0.2]][k % 3];
        const vz = 4 + R() * 7, vx = (R() - 0.5) * 9, vy = 3 + R() * 4, drag = 0.9;
        if (f < 0) continue;
        const fall = Math.min(f, 6), e = 1 - Math.exp(-drag * fall);
        const z = 2.8 + vz * e / drag + Math.sin(fall * 2.3 + k) * 1.2, x = vx * e / drag + Math.cos(fall * 1.7 + k) * 1.0;
        let y = 21 + vy * e / drag - 5.5 * fall, rx, ry, rz;
        if (y < 0.3 / s) { y = 0.3 / s; rx = -Math.PI / 2; ry = k; rz = 0; }
        else { rx = Math.sin(fall * 3 + k) * 1.2 - 0.6; ry = fall * 1.6 + k; rz = Math.cos(fall * 2.6 + k) * 0.9; }
        const w = local(p, yaw, x * s, y * s, z * s, S._o);
        m.compose(w, quat(S, '_ywnQcl', yaw + ry, rx, rz), S._s.set(s * 2.4, s * 2.4, s * 2.4)); L[kind].add(m, { aTint: tint });
      }
      const g = local(p, yaw, 0, 21 * s, 2.6 * s, S._o); glowAt(S, g.x, g.y, g.z, 8 * s, [1, 0.8, 0.5], 0.6);
    },
    // the martini, going over on "slur"
    ywnMartini(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnMartini; void L.ywnGin; void L.ywnFizz; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, fy = faceYaw(S, it, 0.5), f = T - it.tip;
      const tilt = f < 0 ? Math.sin(T * 2.1) * 0.03 : 0.42 * (1 - Math.exp(-f * 4)) + 0.06 * Math.exp(-f * 2) * Math.sin(f * 14);
      const side = it.x > 0 ? 1 : -1;
      const bq = quat(S, '_ywnQm', fy, 0, side * tilt);
      m.compose(p, bq, S._s.set(s, s, s)); L.ywnMartini.add(m); L.ywnGin.add(m);
      if (f > 0 && f < 2.2) {
        // the low point of the rim, where it pours (toward the road)
        const th = side * tilt, x0 = -6 * side, X = x0 * Math.cos(th) - 16 * Math.sin(th), Y = x0 * Math.sin(th) + 16 * Math.cos(th);
        const rim = local(p, fy, X * s, Y * s, 0, S._ywnRim || (S._ywnRim = new THREE.Vector3())), dir = -side;
        for (let j = 0; j < 16; j++) { const u = ((j / 16) + f * 1.5) % 1, w = local(rim, fy, dir * 5 * u * s, -14 * u * u * s, (hash(j) - 0.5) * 2 * s, S._o); m.compose(w, quat(S, '_ywnQg', fy), S._s.set(1.6 * s, 2.4 * s, 1.6 * s)); L.ywnFizz.add(m); }
      }
      glowAt(S, p.x, p.y + 14 * s, p.z, 22 * s, [0.85, 0.95, 1], 0.18);
    },
    // twelve dumb parts: grey texts popping up one an eighth, the old ones pushed up the stack
    ywnChat(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnGrey; void L.ywnWink; void L.ywnHeartFly; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, fy = faceYaw(S, it, 0.3), fq = quat(S, '_ywnQch', fy);
      const n = it.at.length, base = local(p, fy, 0, (it.h0 ?? 0) * s, 0, S._ywnCb || (S._ywnCb = new THREE.Vector3()));
      for (let k = 0; k < n; k++) {
        const f = T - it.at[k]; if (f < 0) continue;
        let up = 0; for (let j = k + 1; j < n; j++) up += 4.0 * spring(T - it.at[j], 14, 18) * (T > it.at[j] ? 1 : 0);
        const sc = spring(f, 12, 20) * s;
        const w = local(base, fy, (k % 2 ? 0.8 : -0.8) * s, up * s, 0, S._o);
        m.compose(w, fq, S._s.set(sc, sc, sc)); L.ywnGrey.add(m);
      }
      // her answer: the wink, then the hearts out of it
      if (it.wink !== undefined && T > it.wink) {
        const f = T - it.wink, sc = spring(f, 10, 16) * s;
        const w = local(p, fy, (it.wx ?? -40) * s, (it.wy ?? 8) * s, 0, S._ywnWk || (S._ywnWk = new THREE.Vector3()));
        m.compose(w, fq, S._s.set(sc * 1.2, sc * 1.2, sc * 1.2)); L.ywnWink.add(m);
        glowAt(S, w.x, w.y, w.z, 22 * s, [1, 0.6, 0.75], 0.25);
        if (T > it.hearts) {
          const g = T - it.hearts, R = seeded(8);
          for (let k = 0; k < 18; k++) {
            const a = R() * TAU, sp = 6 + R() * 10, d = Math.max(0, g - R() * 0.6);
            if (d <= 0 || d > 3.2) continue;
            const hw = local(w, fy, Math.cos(a) * sp * d, (Math.sin(a) * 0.5 + 0.9) * sp * d - 2 * d * d, 2 + d * 3, S._o);
            const hs = (1.4 + R()) * s * Math.min(1, d * 4) * (1 - smooth(2.4, 3.2, d));
            m.compose(hw, quat(S, '_ywnQhf', fy + Math.sin(d * 3 + k) * 0.6, 0, Math.sin(d * 4 + k) * 0.4), S._s.set(hs, hs, hs)); L.ywnHeartFly.add(m);
          }
        }
      }
    },
    // the velvet rope along the rail: brass posts either side of it, red rope swagged between
    ywnRope(S, it) {
      const L = S.layers; void L.ywnStanchion; void L.ywnRope; if (!S.track) return;
      const m = S._m, a = S._ywnRa || (S._ywnRa = new THREE.Vector3()), b = S._ywnRb || (S._ywnRb = new THREE.Vector3()), d = S._ywnRd || (S._ywnRd = new THREE.Vector3());
      const T = S.tNow ?? 0, zq = S._ywnRq || (S._ywnRq = new THREE.Quaternion()), z0 = S._ywnZ0 || (S._ywnZ0 = new THREE.Vector3(0, 0, 1));
      for (const side of [-1, 1]) {
        for (let t = it.t0; t < it.t1; t += 0.25) {
          if (t < T - 1 || t > T + 7) continue;
          S.track.at(t, it.x + side * 1.7, 0, a); m.compose(a, quat(S, '_ywnQst', S.course.sample(t).yaw), S._s.set(1, 1, 1)); L.ywnStanchion.add(m);
          S.track.at(t + 0.25, it.x + side * 1.7, 0, b);
          // a swag in three pieces
          for (let j = 0; j < 3; j++) {
            const u0 = j / 3, u1 = (j + 1) / 3, s0 = 1.85 - Math.sin(Math.PI * u0) * 0.6, s1 = 1.85 - Math.sin(Math.PI * u1) * 0.6;
            const pa = S._o.set(a.x + (b.x - a.x) * u0, a.y + (b.y - a.y) * u0 + s0, a.z + (b.z - a.z) * u0);
            d.set(a.x + (b.x - a.x) * u1 - pa.x, a.y + (b.y - a.y) * u1 + s1 - pa.y, a.z + (b.z - a.z) * u1 - pa.z);
            const len = d.length(); zq.setFromUnitVectors(z0, d.multiplyScalar(1 / len));
            m.compose(pa, zq, S._s.set(1, 1, len)); L.ywnRope.add(m);
          }
        }
      }
    },
    // the marble sink, the pearls slipping over its edge
    ywnSink(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnSink; void L.ywnPearl; if (!S.track) return;
      const s = it.s ?? 1, m = S._m, fy = faceYaw(S, it, 0.6), fq = quat(S, '_ywnQsk', fy);
      m.compose(p, fq, S._s.set(s, s, s)); L.ywnSink.add(m);
      const T = S.tNow ?? 0;
      for (let j = 0; j < 26; j++) { const u = j / 25, slip = Math.max(0, T - (it.slip ?? 1e9)) * 0.25; const v = Math.min(1, u + slip); const w = local(p, fy, (-8 + v * 10) * s, (16.4 - Math.sin(v * Math.PI) * 2 - (v > 0.7 ? (v - 0.7) * 30 : 0)) * s, (5 + (v > 0.7 ? (v - 0.7) * 6 : 0)) * s, S._o); w.y = Math.max(w.y, p.y + 0.8 * s); m.compose(w, fq, S._s.set(0.75 * s, 0.75 * s, 0.75 * s)); L.ywnPearl.add(m); }
      glowAt(S, p.x, p.y + 18 * s, p.z, 26 * s, [1, 0.97, 0.9], 0.25); poolAt(S, p.x, p.y + 0.12, p.z, 30 * s, [1, 0.95, 0.9], 0.3);
    },
    // the vanity mirror: my number writes itself in lipstick across it, then the kiss
    ywnMirror(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnMirrorFrame; void L.ywnMirror; void L.ywnLipWrite; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, fy = faceYaw(S, it, 0.5), fq = quat(S, '_ywnQmr', fy);
      const c = local(p, fy, 0, 22 * s, 0, S._ywnMc || (S._ywnMc = new THREE.Vector3()));
      m.compose(c, fq, S._s.set(s, s, s)); L.ywnMirrorFrame.add(m); L.ywnMirror.add(m); L.ywnLipWrite.add(m);
      const mt = L.ywnLipWrite.mesh.material; if (mt.userData.reveal) mt.userData.reveal.value = 0.02 + 0.8 * smooth(it.w0, it.w1, T) + 0.2 * smooth(it.kiss, it.kiss + 0.15, T);
      for (const x of [-15, 15]) { const g = local(c, fy, x * s, 4 * s, 1 * s, S._o); glowAt(S, g.x, g.y, g.z, 4 * s, [1, 0.85, 0.6], 1.0); }
    },
    ywnTub(S, it, p, q) { const L = S.layers; void L.ywnTub; if (!S.track) return; const s = it.s ?? 1, m = S._m; m.compose(p, q, S._s.set(s, s, s)); L.ywnTub.add(m); glowAt(S, p.x, p.y + 10 * s, p.z, 24 * s, [1, 0.95, 0.9], 0.2); },
    // loose pearls rolling over the bathroom floor
    ywnPearls(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnPearl; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, R = seeded((it.seed * 1000) | 0);
      for (let j = 0; j < 30; j++) { const x0 = (R() - 0.5) * 60, z0 = (R() - 0.5) * 40, v = (R() - 0.5) * 6; if (Math.abs(x0) < 9) continue; const x = x0 + Math.sin(T * 0.8 + j) * 2 + v * ((T * 0.3) % 1); const w = local(p, yaw, x, 1.2, z0, S._o); m.compose(w, q, S._s.set(1.2, 1.2, 1.2)); L.ywnPearl.add(m); }
    },
    // floats on the pool under the jump, bobbing, turning slowly
    ywnFloat(S, it, p, q, yaw) {
      const L = S.layers; for (const k of ['ywnSwanFloat', 'ywnRing', 'ywnDonut', 'ywnLilo']) void L[k]; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, w = S._o.copy(p); w.y += 0.35 + Math.sin(T * 1.7 + it.seed * 9) * 0.25;
      m.compose(w, quat(S, '_ywnQfl', yaw + T * 0.15 * (it.seed - 0.5) + it.seed * 6, Math.sin(T * 1.3 + it.seed) * 0.06, Math.cos(T * 1.1 + it.seed) * 0.06), S._s.set(s, s, s));
      L[['ywnSwanFloat', 'ywnRing', 'ywnDonut', 'ywnLilo'][it.v]].add(m);
    },
    ywnLounger(S, it, p, q) { const L = S.layers; void L.ywnLounger; void L.ywnParasol; if (!S.track) return; const m = S._m; m.compose(p, q, S._s.set(1.3, 1.3, 1.3)); L.ywnLounger.add(m); if (it.parasol) { const w = local(p, S.course.sample(it.t).yaw, 0, 0, -4, S._o); m.compose(w, q, S._s.set(1.2, 1.2, 1.2)); L.ywnParasol.add(m); } },
    // brunch: the cloches come up off the plates on the beat, down the table; on "wicked" they fly
    ywnBrunch(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnBrunch; void L.ywnCloche; void L.ywnTreat0; void L.ywnTreat1; void L.ywnTreat2; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m; const ay = yaw + (it.x > 0 ? 0 : Math.PI);
      m.compose(p, quat(S, '_ywnQbr', ay), S._s.set(s, s, s)); L.ywnBrunch.add(m);
      const c = S.course;
      for (let k = 0; k < 16; k++) {
        const zl = -19.6 + Math.floor(k / 2) * 5.6, xl = (k % 2 ? 1 : -1) * 2.2;
        const plate = local(p, ay, xl * s, 6.9 * s, zl * s, S._o);
        const tl = c.timeOfBeat(Math.round(c.beatAt(it.lift)) + Math.floor(k / 2));
        const f = T - tl, wk = T - it.wicked;
        let lift = f > 0 ? 3.2 * spring(f, 10, 14) : 0, spin = 0, tilt = f > 0 ? 0.5 * Math.min(1, f * 4) : 0;
        if (wk > 0) { lift += 18 * wk - 9 * wk * wk + 6; spin = wk * (6 + k); tilt += wk * 3; }
        if (lift > -10) { const w = S._ywnCl || (S._ywnCl = new THREE.Vector3()); w.copy(plate); w.y += lift * s; m.compose(w, quat(S, '_ywnQcl2', ay + spin, tilt, 0), S._s.set(s, s, s)); L.ywnCloche.add(m); }
        m.compose(plate, quat(S, '_ywnQtr', ay + k), S._s.set(s, s, s)); L['ywnTreat' + (k % 3)].add(m);
        if (f > 0 && f < 0.4) glowAt(S, plate.x, plate.y + 1.5 * s, plate.z, 5 * s, [1, 0.95, 0.85], 1.0 * (1 - f / 0.4));
      }
      for (const z of [-14, 0, 14]) for (const dx of [-1.1, 0, 1.1]) { const w = local(p, ay, dx * s, 13 * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, 1.4 * s, [1, 0.75, 0.4], 1.1); }
      poolAt(S, p.x, p.y + 0.12, p.z, 40 * s, [1, 0.85, 0.6], 0.3);
    },
    // the rumour: camera flashes going off in the hedge on the eighths
    ywnFlashes(S, it, p, q, yaw) {
      if (!S.track) return;
      const T = S.tNow ?? 0; if (T < it.from || T > it.to) return;
      const c = S.course, e = c.beatAt(T) * 2, i = Math.floor(e), f = e - i;
      for (let k = 0; k < 3; k++) { const r = hash(i * 3 + k + it.seed * 50); if (r < 0.25) continue; const w = local(p, yaw, 0, (3 + r * 10), (hash(i + k * 7) - 0.5) * 30, S._o); glowAt(S, w.x, w.y, w.z, 9 + 6 * r, [0.92, 0.96, 1], 2.6 * Math.exp(-f * 6)); glowAt(S, w.x, w.y, w.z, 2.2, [1, 1, 1], 3 * Math.exp(-f * 12)); }
    },
    // the swans on the canal, gliding
    ywnSwans(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnSwan; if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m;
      for (let k = 0; k < (it.n ?? 5); k++) { const w = local(p, yaw, Math.sin(k * 2.1) * 3.4, 0.2 + Math.sin(T * 1.5 + k) * 0.08, k * 11 - (T * 1.2) % 11, S._o); m.compose(w, quat(S, '_ywnQsw', yaw + Math.PI + Math.sin(T * 0.4 + k) * 0.2), S._s.set(5, 5, 5)); L.ywnSwan.add(m); }
    },
    // the gold fountain, its jets up on the beat
    ywnFountain(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnFountain; void L.ywnFizz; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, bi = beatInfo(S);
      m.compose(p, q, S._s.set(s, s, s)); L.ywnFountain.add(m);
      const h = 10 + 9 * bi.pulse;
      for (let j = 0; j < 28; j++) {
        const a = j / 28 * TAU, u = ((T * 0.9 + hash(j)) % 1), r = 1.5 + 8 * u, y = 20 + h * 4 * u * (1 - u) * 0.6 - 6 * u * u;
        const w = local(p, yaw, Math.cos(a) * r * s, y * s, Math.sin(a) * r * s, S._o); m.compose(w, quat(S, '_ywnQft', a), S._s.set(1.6 * s, 2.4 * s, 1.6 * s)); L.ywnFizz.add(m);
      }
      glowAt(S, p.x, p.y + (20 + h * 0.5) * s, p.z, (14 + 8 * bi.pulse) * s, [1, 0.85, 0.45], 0.5 + 0.6 * bi.pulse);
      poolAt(S, p.x, p.y + 0.12, p.z, 40 * s, [1, 0.8, 0.4], 0.4);
    },
    // the cage of polished wood: an arch of it over the road (four quarter ribs), bars along to the
    // next arch; at "splintered" it all goes, every piece out and away from her
    ywnCageRib(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnRib; void L.ywnBar; void L.ywnShard; if (!S.track) return;
      const T = S.tNow ?? 0, f = T - it.burst, m = S._m, R = seeded((it.t * 100) | 0);
      const W = it.w, H = it.hh, base = p.y;
      // four pieces: a post each side up to where the arch springs, and the arch's two halves
      for (let k = 0; k < 4; k++) {
        const sd = k < 2 ? -1 : 1, up = k % 2;
        let dx = 0, dy = 0, dz = 0, rx = 0, rz = 0;
        if (f > 0) { const v = 18 + R() * 16; dx = sd * v * f * (0.6 + up * 0.6); dy = (8 + R() * 14) * f - 11 * f * f; dz = (R() - 0.3) * 20 * f; rx = f * (R() - 0.5) * 8; rz = f * sd * (2 + R() * 5); }
        else { R(); R(); R(); R(); R(); }
        if (f > 2.2) continue;
        if (up === 0) {
          const w = local(p, yaw, sd * W + dx, dy, dz, S._o);
          m.compose(w, quat(S, '_ywnQr' + k, yaw, -Math.PI / 2 + rx, rz), S._s.set(1.6, 1.6, H * 0.45)); L.ywnBar.add(m);
        } else {
          const w = local(p, yaw, dx, H * 0.45 + dy, dz, S._o);
          m.compose(w, quat(S, '_ywnQr' + k, yaw + (sd > 0 ? 0 : Math.PI), rx, rz), S._s.set(W, H * 0.55, 14)); L.ywnRib.add(m);
        }
      }
      // bars along the top to the next arch
      if (f <= 0 && it.next !== undefined) {
        const b = S.track.ground(it.next, 0, S._ywnNb || (S._ywnNb = new THREE.Vector3()));
        for (let j = 0; j < 7; j++) {
          const a = (j / 6) * Math.PI, x = Math.cos(a) * W, y = H * 0.45 + Math.sin(a) * H * 0.55;
          const pa = local(p, yaw, x, y, 0, S._o);
          const nb = S._ywnNc || (S._ywnNc = new THREE.Vector3()); local(b, S.course.sample(it.next).yaw, x, 0, 0, nb); nb.y = groundAt(S.course, it.next, 0) + y;
          const d = nb.sub(pa), len = d.length(); if (len < 0.01) continue;
          const zq = S._ywnZq || (S._ywnZq = new THREE.Quaternion()); zq.setFromUnitVectors(S._ywnZ1 || (S._ywnZ1 = new THREE.Vector3(0, 0, 1)), d.multiplyScalar(1 / len));
          m.compose(pa, zq, S._s.set(0.7, 0.7, len)); L.ywnBar.add(m);
        }
      }
      // splinters off it as it goes
      if (f > 0 && f < 1.6) for (let j = 0; j < 8; j++) { const a = R() * Math.PI, v = 14 + R() * 20; const w = local(p, yaw, Math.cos(a) * (W + v * f), H * 0.45 + Math.sin(a) * H * 0.5 + 10 * f - 11 * f * f, (R() - 0.5) * 14 * f, S._o); m.compose(w, quat(S, '_ywnQsp', yaw + f * 9 + j, f * 7, j), S._s.set(1.4, 1.4, 1.4)); L.ywnShard.add(m); }
      if (f > 0 && f < 0.4 && Math.round(it.t / 0.13) % 5 === 0) glowAt(S, p.x, base + H * 0.95, p.z, 9, [1, 0.8, 0.5], 0.8 * (1 - f / 0.4));
      if (f <= 0) for (const sd of [-1, 1]) { const g = local(p, yaw, sd * W * 0.7, H * 0.85, 0, S._o); glowAt(S, g.x, g.y, g.z, 2.2, [1, 0.85, 0.55], 0.5); }
    },
    // the cage itself at the end of its arches: bars round the road under a dome and a gold ring;
    // at "splintered" every bar goes out and away, the dome with them
    ywnCageDome(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnBar; void L.ywnDome; void L.ywnShard; if (!S.track) return;
      const T = S.tNow ?? 0, f = Math.max(0, T - it.burst), m = S._m, s = it.s ?? 1, H = it.hh;
      if (f > 2.4) return;
      const sy = H / 40;
      if (f <= 0) { m.compose(p, q, S._s.set(s, sy, s)); L.ywnDome.add(m); }
      else { const w = S._o.copy(p); w.y += 30 * f * sy - 11 * f * f; m.compose(w, quat(S, '_ywnQdm', yaw + f * 2, f * 0.8, f * 0.5), S._s.set(s, sy, s)); L.ywnDome.add(m); }
      for (let j = 0; j < 36; j++) {
        const a = j / 36 * TAU, r = 26 * s; if (Math.abs(Math.cos(a)) < 0.3) continue;
        const d = f * (30 + hash(j) * 30), up = f * (18 + hash(j * 3) * 20) - 20 * f * f;
        const w = local(p, yaw, Math.cos(a) * (r + d), up, Math.sin(a) * (r + d), S._o);
        m.compose(w, quat(S, '_ywnQdb', a, -Math.PI / 2 + f * (hash(j * 5) - 0.5) * 6, f * (hash(j * 7) - 0.5) * 6), S._s.set(1.6, 1.6, 40 * sy * (f > 0 ? 0.35 + 0.65 * hash(j * 11) : 1))); L.ywnBar.add(m);
      }
      if (f > 0 && f < 1.2) for (let j = 0; j < 30; j++) { const a = hash(j * 13) * TAU, v = 20 + hash(j) * 30; const w = local(p, yaw, Math.cos(a) * (20 + v * f), 18 * sy + 14 * f - 11 * f * f + hash(j * 3) * 20, Math.sin(a) * (20 + v * f), S._o); m.compose(w, quat(S, '_ywnQds', a + f * 8, f * 9, j), S._s.set(1.8, 1.8, 1.8)); L.ywnShard.add(m); }
      if (f <= 0) glowAt(S, p.x, p.y + 44 * sy, p.z, 16 * s, [1, 0.85, 0.6], 0.2);
      else if (f < 0.45) glowAt(S, p.x, p.y + 38 * sy, p.z, 18, [1, 0.85, 0.6], 0.9 * (1 - f / 0.45));
    },
    // the lyric, as a text: it's typing, then it lands (a pop), and it stays up there over the road
    ywnBubble(S, it, p) {
      const L = S.layers; void L.ywnBubble; void L.ywnBubbleRim; void L.ywnBubbleFace; void L.ywnDots; void L.ywnDot; if (!S.track) return;
      const T = S.tNow ?? 0, sung = it.sung ?? (it.t - 1.4), m = S._m, s = it.s ?? 1;
      const fy = S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -0.12 : 0.12), fq = quat(S, '_ywnQbb', fy, 0, Math.sin(T * 1.1 + it.t) * 0.02);
      const w = S._ywnBw || (S._ywnBw = new THREE.Vector3()); w.copy(p); w.y = S.course.sample(it.t).y + (it.h || 13);
      if (T < sung - 1.2) return;
      if (T < sung) {
        // the dots
        m.compose(w, fq, S._s.set(s, s, s)); L.ywnDots.add(m);
        for (let k = 0; k < 3; k++) { const d = local(w, fy, (k - 1) * 1.9 * s, (0.5 * Math.max(0, Math.sin(T * 9 - k * 0.9))) * s, 0, S._o); m.compose(d, fq, S._s.set(s, s, s)); L.ywnDot.add(m); }
        return;
      }
      const k = spring(T - sung, 11, 17) * s;
      m.compose(w, fq, S._s.set(k, k, k)); L.ywnBubble.add(m); L.ywnBubbleRim.add(m); L.ywnBubbleFace.add(m, { aIdx: it.idx, aWake: [1, 0] });
      if (T - sung < 0.3) glowAt(S, w.x, w.y, w.z, 30 * s, [1, 0.92, 0.7], 0.5 * (1 - (T - sung) / 0.3));
    },
  },
  kits: {
    // { at: [{ t, x, kind, ... }] }
    ywnSet2(S, z) {
      const PARTS_OF = { porte: 'ywnPorte', mansion: 'ywnMansion', clothes: 'ywnClothes', martini: 'ywnMartini', chat: 'ywnChat', sink: 'ywnSink', mirror: 'ywnMirror', tub: 'ywnTub', brunch: 'ywnBrunch', flashes: 'ywnFlashes', swans: 'ywnSwans', fountain: 'ywnFountain' };
      for (const a of z.at) { const parts = PARTS_OF[a.kind]; if (!parts) continue; S.items.push({ ...a, rot: a.rot ?? SIDE(a.x), s: a.s ?? 1, parts, seed: a.seed ?? 0.5, ahead: a.ahead ?? 40 }); }
    },
    // the velvet rope along a rail: { rail: [t0, t1], x }
    ywnRope(S, z) { const c = S.course, b0 = Math.round(c.beatAt(z.rail[0])), b1 = b0 + (z.beats ?? 8); S.items.push({ t: c.beats[b0], x: z.x ?? 0, rot: 0, t0: c.beats[b0], t1: c.beats[b1], parts: 'ywnRope', abs: true, ahead: 10 }); },
    ywnPearls(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 1.0) S.items.push({ t, x: 0, rot: 0, seed: R(), parts: 'ywnPearls', ahead: 30 }); },
    // the pool: floats on the water, loungers and parasols along its sides
    ywnPool(S, z, R) {
      for (let k = 0; k < (z.n ?? 14); k++) { const t = z.from + R() * (z.to - z.from), x = (R() < 0.5 ? -1 : 1) * (6 + R() * (z.w ?? 34)); S.items.push({ t, x, rot: R() * 6.28, v: Math.floor(R() * 4), s: 1.4 + R() * 0.5, seed: R(), parts: 'ywnFloat', h: 0.15, ahead: 30 }); }
      for (let t = z.from - 0.3; t < z.to + 0.3; t += 0.22) for (const side of [-1, 1]) S.items.push({ t, x: side * ((z.w ?? 34) + 12 + R() * 3), rot: SIDE(side) + Math.PI / 2, parasol: R() < 0.45, parts: 'ywnLounger', ahead: 30 });
    },
    // the cage: arches from a to b, bars between them, all bursting at `burst`
    ywnCage(S, z) {
      const c = S.course, ts = []; prepare(c, S.plan);
      for (let t = z.from; t <= z.to; t += z.every ?? 0.12) ts.push(t);
      ts.forEach((t, i) => { const g = groundAt(c, t, 0), y = c.sample(t).y; S.items.push({ t, x: 0, rot: 0, w: z.w ?? 15, hh: Math.max(16, y - g + (z.over ?? 14)), burst: z.burst + (z.ripple ?? 0) * Math.abs(t - z.to), next: ts[i + 1], parts: 'ywnCageRib', ahead: 30 }); });
      if (z.dome !== undefined) { const g = groundAt(c, z.dome, 0), y = c.sample(z.dome).y; S.items.push({ t: z.dome, x: 0, rot: 0, s: z.ds ?? 0.75, hh: Math.max(30, y - g + 26), burst: z.burst, parts: 'ywnCageDome', ahead: 30 }); }
    },
    ywnFlash(S, z) { for (const [from, to, x, at] of z.at) S.items.push({ t: at, x, rot: 0, from, to, seed: Math.abs(x) * 0.01, parts: 'ywnFlashes', ahead: 30 }); },
  },
});
