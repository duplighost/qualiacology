// Unloaded: the factory's set-pieces, each on its line.
// The roll-up doors going up as the band comes in; the wax lips on the kitchen wall mouthing
// "drip-fed, lip-read"; a tower of sugar cubes built a block a beat ("watched me build a myth");
// the cotton candy spinning ("dream-stitched"); the knife switch thrown on "clean-switch"; the
// top hat and its rabbit on "trick"; the chocolate bar bitten on "bite"; razor blades dipped in
// pink, hung over the road; the records on the walls skipping with the stutter; the week on the
// wall with a lollipop stuck in every day ("whole week's hijacked"); the gingerbread men popping
// and locking; the hook let down on "come to me"; the chocolate bunny falling face first; and
// the mixing vat under the road where it breaks.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { prepare, floorAt, groundAt } from './trail.js';
import { paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
// facing the road, turned partway (radians) toward her as she comes, so it reads from far off
const FACE = (x, turn) => SIDE(x) + (x > 0 ? turn : -turn);
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const sph = (r, sx, sy, sz, x, y, z, w = 16, hh = 12) => { const g = new THREE.SphereGeometry(r, w, hh); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
function tube(a, b, r, n = 8) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
const onGround = (S, it) => { prepare(S.course, S.plan); if (it.h === undefined) it.h = groundAt(S.course, it.t, it.x); return it; };
const CANDY = [0xff5fb0, 0x6af0c8, 0xffd23a, 0xb070ff, 0xff8a3a, 0xff3a5a, 0x5ab0ff, 0xffffff];
const hexRGB = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
// this module's own Euler (yaw, then pitch, then roll): the scenery's shared one keeps its order
const E = (S) => S._cdyE || (S._cdyE = new THREE.Euler(0, 0, 0, 'YXZ'));
// a bump that rises fast and falls slower, for each time in a list
const bumps = (T, list, up = 0.06, down = 0.22) => { let k = 0; for (const t of list) { const d = T - t; if (d > -up && d < down) k = Math.max(k, d < 0 ? 1 + d / up : 1 - d / down); } return k; };

// vertex-coloured, lit a little by its own colour so it reads in a dim room
function litVC(M, key, opts, k) {
  return M[key] || (M[key] = (() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts });
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';'); };
    // the program is cached by this key: each strength of self-light gets its own
    m.customProgramCacheKey = () => 'cdyLit' + k.toFixed(2);
    return m;
  })());
}
// instanced, each its own colour (aTint), lit a little by it
function tintLit(M, key, opts, k) {
  return M[key] || (M[key] = (() => {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, ...opts });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';');
    };
    m.customProgramCacheKey = () => 'cdyTint' + k.toFixed(2);
    return m;
  })());
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// ---------- shapes ----------
const CDY = {
  // a roll-up door: steel slats in pink and white, a bottom bar, the handle
  door(hw, hh) {
    const parts = [], pink = rgb(0xff5fb0), white = rgb(0xf4eef2), dark = rgb(0x3a3440);
    const n = Math.round(hh / 1.2);
    for (let k = 0; k < n; k++) { parts.push(paint(box(2 * hw + 1.2, 1.1, 0.5, 0, k * (hh / n) + 0.55, 0), k % 2 ? white : pink)); parts.push(paint(box(2 * hw + 1.2, 0.12, 0.62, 0, (k + 1) * (hh / n), 0), dark)); }
    parts.push(paint(box(2 * hw + 1.4, 0.7, 0.8, 0, 0.35, 0), dark));
    for (const s of [-1, 1]) parts.push(paint(box(1.6, 0.5, 0.5, s * 3, 1.6, 0.45), rgb(0xe8c050)));
    return merge(parts);
  },
  // wax lips: the top lip in two lobes with a cupid's bow, the bottom lip full, a row of teeth
  lipTop() {
    const parts = [], red = rgb(0xe8102e);
    for (const s of [-1, 1]) { const g = sph(1, 4.6, 1.5, 1.9, s * 3.6, 0.9, 0, 22, 14); g.rotateZ(-s * 0.12); parts.push(paint(g, red)); }
    parts.push(paint(sph(1, 1.6, 1.1, 1.6, 0, 0.6, 0.2, 14, 10), red));
    for (let k = -3; k <= 3; k++) parts.push(paint(box(1.05, 1.1, 0.5, k * 1.15, -0.45, 0.9 - Math.abs(k) * 0.12), rgb(0xfaf6ee)));
    return merge(parts);
  },
  lipBottom() { const parts = [], red = rgb(0xd80c28); parts.push(paint(sph(1, 7.4, 1.9, 2.2, 0, -1.0, 0, 26, 14), red)); parts.push(paint(sph(1, 5.2, 0.9, 1.0, 0, -0.1, 0.7, 18, 10), rgb(0x4a0410))); return merge(parts); },
  // a sugar cube, a little worn at the edges (each a pastel of its own through aTint)
  cube() { const g = new THREE.BoxGeometry(4.2, 4.2, 4.2, 2, 2, 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const r = Math.hypot(x, y, z); const k = 1 - 0.05 * (r / 3.64); p.setXYZ(i, x * k, y * k, z * k); } g.computeVertexNormals(); return g; },
  star() { const pts = []; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + Math.PI / 2, r = k % 2 ? 1.6 : 3.8; pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); } const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 1.2, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.3, bevelSegments: 2 }); g.translate(0, 0, -0.6); return paint(g, rgb(0xffd23a)); },
  // the cotton candy machine: a steel bowl on its stand (the floss is its own layer)
  flossStand() {
    const parts = [], steel = rgb(0xd8dce4), pink = rgb(0xff5fb0), dark = rgb(0x2a2c32);
    parts.push(paint(cyl(5, 6, 6, 28, 0, 3, 0), pink)); parts.push(paint(new THREE.TorusGeometry(5.6, 0.3, 8, 28).rotateX(Math.PI / 2).translate(0, 5.8, 0), rgb(0xfff4f8)));
    const bowl = new THREE.CylinderGeometry(9, 6, 4, 36, 1, true); bowl.translate(0, 8, 0); parts.push(paint(bowl, steel));
    parts.push(paint(new THREE.TorusGeometry(9, 0.35, 8, 40).rotateX(Math.PI / 2).translate(0, 10, 0), steel));
    parts.push(paint(cyl(1.2, 1.2, 2, 14, 0, 7, 0), dark));
    return merge(parts);
  },
  // the knife switch: the slate, its clips, the hinge posts (the blades are their own layer)
  switchBoard() {
    const parts = [], slate = rgb(0x2a2a30), copper = rgb(0xd88a4a);
    parts.push(paint(box(12, 16, 1.2, 0, 8, 0), slate));
    parts.push(paint(box(12.6, 0.6, 1.4, 0, 16.2, 0), rgb(0x8a8e98))); parts.push(paint(box(12.6, 0.6, 1.4, 0, -0.2, 0), rgb(0x8a8e98)));
    for (const x of [-3, 3]) { parts.push(paint(box(1.2, 2.2, 1.6, x, 13.4, 1.2), copper)); parts.push(paint(box(1.6, 1.6, 1.8, x, 3.0, 1.2), copper)); }
    for (let k = 0; k < 4; k++) parts.push(paint(cyl(0.4, 0.4, 0.3, 10, -4.5 + k * 3, 15.2, 0.7).rotateX(Math.PI / 2), rgb(0xc8ccd4)));
    return merge(parts);
  },
  blades() { const parts = [], copper = rgb(0xe89a5a); for (const x of [-3, 3]) parts.push(paint(box(0.5, 10.6, 0.4, x, 5.3, 0), copper)); parts.push(paint(box(7.4, 0.6, 0.6, 0, 9.2, 0), rgb(0x1a1a1e))); parts.push(paint(box(1.4, 3.2, 1.4, 0, 10.8, 0.3), rgb(0xe0102a))); return merge(parts); },
  // the top hat: crown, brim, a pink band
  hat() {
    // on a round magician's table in a striped skirt
    const parts = [], black = rgb(0x121014), T = 7;
    for (let k = 0; k < 16; k++) { const a0 = (k / 16) * Math.PI * 2; const g = new THREE.CylinderGeometry(8.0, 8.8, T - 0.6, 3, 1, true, a0, Math.PI * 2 / 16); g.translate(0, (T - 0.6) / 2, 0); parts.push(paint(g, k % 2 ? rgb(0xfff4f8) : rgb(0xff3a8a))); }
    parts.push(paint(cyl(8.2, 8.2, 0.6, 40, 0, T - 0.3, 0), rgb(0xffd23a)));
    parts.push(paint(cyl(4.6, 4.2, 9, 32, 0, T + 5.2, 0), black)); parts.push(paint(cyl(4.7, 4.7, 0.3, 32, 0, T + 9.75, 0), rgb(0x2a1a22)));
    parts.push(paint(cyl(7.6, 7.6, 0.5, 40, 0, T + 0.75, 0), black)); parts.push(paint(cyl(4.42, 4.32, 1.6, 32, 0, T + 2.2, 0), rgb(0xff4fa8)));
    return merge(parts);
  },
  // a marshmallow rabbit: body, head, the ears, a pink nose
  rabbit() {
    const parts = [], w = rgb(0xfaf6f2), pink = rgb(0xff8ac0);
    parts.push(paint(sph(1, 2.6, 3.2, 2.4, 0, 3.2, 0), w)); parts.push(paint(sph(1, 2.1, 2.0, 2.0, 0, 7.4, 0.3), w));
    for (const s of [-1, 1]) { const e = sph(1, 0.7, 3.0, 0.45, s * 0.9, 10.6, 0, 12, 8); e.rotateZ(-s * 0.18); parts.push(paint(e, w)); const ei = sph(1, 0.4, 2.3, 0.2, s * 0.9, 10.6, 0.25, 10, 6); ei.rotateZ(-s * 0.18); parts.push(paint(ei, pink)); }
    parts.push(paint(sph(0.35, 1, 1, 1, 0, 7.6, 2.3, 8, 6), pink));
    for (const s of [-1, 1]) parts.push(paint(sph(0.28, 1, 1, 1, s * 0.75, 8.1, 2.0, 8, 6), rgb(0x1a1418)));
    return merge(parts);
  },
  // the chocolate bar: squares in their grid, its wrapper over the bottom; the bite is the chunk
  bar(bitten) {
    const parts = [], choc = rgb(0x5a2e1a), choc2 = rgb(0x4a2414), foil = rgb(0xff4fa8), paper = rgb(0xfff4f8);
    parts.push(paint(box(11, 20, 1.2, 0, 10, 0), choc2));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) {
      const cx = -3.5 + i * 3.5, cy = 5.6 + j * 2.95;
      if (bitten && ((i === 2 && j >= 4) || (i === 1 && j === 5))) continue;
      parts.push(paint(box(3.0, 2.5, 0.8, cx, cy, 0.9), choc)); parts.push(paint(box(2.5, 2.0, 0.3, cx, cy, 1.4), rgb(0x6a3820)));
    }
    if (bitten) { const R = seeded(9); for (let k = 0; k < 7; k++) { const a = 0.4 + k * 0.33, x = 2.2 + Math.cos(a) * 2.6, y = 18.0 - Math.sin(a) * 2.2; parts.push(paint(box(1.2 + R(), 1.0 + R() * 0.8, 1.0, x, y, 0.8), choc)); } }
    parts.push(paint(box(11.6, 7.4, 1.8, 0, 3.5, 0), foil)); parts.push(paint(box(11.7, 3.0, 1.9, 0, 3.6, 0), paper));
    return merge(parts);
  },
  // a crumb
  crumb() { return new THREE.BoxGeometry(0.6, 0.5, 0.5); },
  // the razor gantry over the road: two posts, the beam with its rollers; the blades swing
  gantry(span) {
    const parts = [], steel = rgb(0x6a6e78), yel = rgb(0xffc81a), dark = rgb(0x1a1a1e);
    for (const s of [-1, 1]) parts.push(paint(box(1.6, 30, 1.6, s * span, -1, 0), steel));
    parts.push(paint(box(2 * span + 2, 2.2, 2.4, 0, 14, 0), dark));
    for (let k = 0; k < 18; k++) parts.push(paint(box((2 * span + 2) / 18, 0.6, 2.5, -span - 1 + (k + 0.5) * (2 * span + 2) / 18, 12.8, 0), k % 2 ? yel : dark));
    return merge(parts);
  },
  // a razor blade, the old kind: a slotted steel plate, its bottom half dipped in pink
  blade() {
    const s = new THREE.Shape(); const W = 3.6, H = 2.2, r = 0.35;
    s.moveTo(-W + r, -H); s.lineTo(W - r, -H); s.quadraticCurveTo(W, -H, W, -H + r); s.lineTo(W, H - r); s.quadraticCurveTo(W, H, W - r, H); s.lineTo(-W + r, H); s.quadraticCurveTo(-W, H, -W, H - r); s.lineTo(-W, -H + r); s.quadraticCurveTo(-W, -H, -W + r, -H);
    const hole = new THREE.Path(); hole.moveTo(-2.4, -0.28); hole.lineTo(2.4, -0.28); hole.lineTo(2.4, 0.28); hole.lineTo(-2.4, 0.28); hole.lineTo(-2.4, -0.28); s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }); g.translate(0, 0, -0.06); g.rotateZ(Math.PI / 2);
    paint(g, rgb(0xd8dce6));
    const p = g.attributes.position, c = g.attributes.color;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.6) c.setXYZ(i, 1.0, 0.36, 0.66);
    // the pink it was dipped in: a thin coat over its lower half, a drip hanging off the edge
    const dip = new THREE.BoxGeometry(4.5, 3.4, 0.22); dip.translate(0, -1.95, 0); paint(dip, rgb(0xff4fa8));
    const drop = sph(1, 0.45, 0.8, 0.2, 0.9, -3.9, 0, 10, 8); paint(drop, rgb(0xff4fa8));
    return merge([g, dip, drop]);
  },
  // a turntable on the wall: its plinth, the tonearm's post (the record and arm turn)
  deck() {
    const parts = [], wood = rgb(0x2a1a22), chrome = rgb(0xd8dce4);
    parts.push(paint(box(24, 24, 3, 0, 0, -1.5), wood)); parts.push(paint(box(24.4, 0.6, 3.2, 0, 12, -1.4), chrome)); parts.push(paint(box(24.4, 0.6, 3.2, 0, -12, -1.4), chrome));
    parts.push(paint(cyl(10.6, 10.6, 1, 48, 0, 0, 0).rotateX(Math.PI / 2).translate(-1.5, 0, 0.2), rgb(0x8a8e98)));
    parts.push(paint(cyl(1.4, 1.4, 2, 16, 0, 0, 0).rotateX(Math.PI / 2).translate(9.0, 8.5, 0.8), chrome));
    for (const [x, y] of [[9.5, -9.5], [6.5, -9.5]]) parts.push(paint(cyl(0.9, 0.9, 0.6, 14, 0, 0, 0).rotateX(Math.PI / 2).translate(x, y, 0.4), rgb(0xff4fa8)));
    return merge(parts);
  },
  record() {
    // the disc: rings of grooves in pink candy, the label in the middle
    const g = new THREE.CylinderGeometry(10, 10, 0.4, 64, 1); g.rotateX(Math.PI / 2);
    const p = g.attributes.position, n = p.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const r = Math.hypot(p.getX(i), p.getY(i)); const lab = r < 3.6; const k = lab ? 1 : 0.75 + 0.25 * Math.sin(r * 9.0); const col = lab ? [1, 0.95, 0.75] : [1.0 * k, 0.32 * k, 0.62 * k]; c.set(col, i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const lab = new THREE.CircleGeometry(3.4, 32); lab.translate(0, 0, 0.21); paint(lab, rgb(0xfff2c0));
    const dot = new THREE.CircleGeometry(0.5, 12); dot.translate(0, 0, 0.22); paint(dot, rgb(0x1a1a1e));
    const sheen = new THREE.RingGeometry(4.5, 9.6, 48, 1, 0.3, 0.5); sheen.translate(0, 0, 0.215); paint(sheen, rgb(0xffb0d8));
    return merge([g, lab, dot, sheen]);
  },
  arm() { const parts = [], chrome = rgb(0xd8dce4); parts.push(paint(box(0.5, 13, 0.5, 0, -6.5, 0), chrome)); parts.push(paint(box(1.6, 2.2, 0.9, 0, -13.4, 0.2), rgb(0x1a1a1e))); parts.push(paint(cyl(0.8, 0.8, 1, 12, 0, 0, 0).rotateX(Math.PI / 2), chrome)); return merge(parts); },
  // the week on the wall: its frame (the face is a texture)
  weekFrame() { const parts = [], wood = rgb(0xf4eef2), red = rgb(0xe0102a); parts.push(paint(box(38, 18, 1, 0, 9, -0.6), wood)); parts.push(paint(box(38.6, 1, 1.4, 0, 18.2, -0.4), red)); parts.push(paint(box(38.6, 1, 1.4, 0, -0.2, -0.4), red)); for (const x of [-19, 19]) parts.push(paint(box(1, 19, 1.4, x, 9, -0.4), red)); return merge(parts); },
  weekFace() { const g = new THREE.PlaneGeometry(36.6, 16.6); g.translate(0, 9, 0.02); return g; },
  // a lollipop for sticking things with: swirl and stick
  stick() {
    const parts = [];
    for (let k = 0; k < 12; k++) for (const z of [0.35, -0.35]) { const w = new THREE.CircleGeometry(2.2, 5, (k / 12) * Math.PI * 2 + k * 0.1, Math.PI * 2 / 12); if (z < 0) w.rotateY(Math.PI); w.translate(0, 0, z); parts.push(paint(w, k % 2 ? [1, 1, 1] : [0.82, 0.82, 0.82])); }
    const rim = new THREE.CylinderGeometry(2.2, 2.2, 0.7, 28, 1, true); rim.rotateX(Math.PI / 2); parts.push(paint(rim, [1, 1, 1]));
    for (const g of parts) g.translate(0, 0, 0);
    const st = cyl(0.22, 0.22, 7, 8, 0, 0, 0); st.rotateX(Math.PI / 2); st.translate(0, 0, -4.2); parts.push(paint(st, rgb(0xf4f0ec)));
    return merge(parts);
  },
  // a gingerbread man: the cookie, its icing, buttons (the arms are their own layer)
  ginger() {
    const parts = [], g = rgb(0xb8682a), ice = rgb(0xfff8f0);
    parts.push(paint(sph(1, 2.3, 2.3, 0.9, 0, 9.6, 0, 18, 10), g));
    parts.push(paint(box(4.0, 4.6, 1.6, 0, 5.8, 0), g)); parts.push(paint(sph(1, 2.0, 1.2, 0.8, 0, 3.6, 0), g));
    for (const s of [-1, 1]) { const l = tube(V(s * 0.8, 3.6, 0), V(s * 1.8, 0.4, 0), 0.95, 10); parts.push(paint(l, g)); parts.push(paint(sph(1, 1.0, 0.7, 0.8, s * 1.85, 0.4, 0, 10, 6), g)); }
    for (const s of [-1, 1]) parts.push(paint(sph(0.32, 1, 1, 0.5, s * 0.8, 10.1, 0.9, 8, 6), ice));
    const smile = new THREE.TorusGeometry(0.9, 0.16, 6, 14, Math.PI); smile.rotateZ(Math.PI); smile.translate(0, 9.2, 0.92); parts.push(paint(smile, ice));
    for (const [y, c] of [[7.0, 0xff3a5a], [5.6, 0x6af0c8], [4.2, 0xffd23a]]) parts.push(paint(sph(0.45, 1, 1, 0.6, 0, y, 0.95, 10, 6), rgb(c)));
    for (const s of [-1, 1]) parts.push(paint(box(0.25, 0.25, 0.3, s * 1.7, 1.2, 0.85), ice));
    return merge(parts);
  },
  gArm() { const parts = [], g = rgb(0xb8682a); parts.push(paint(tube(V(0, 0, 0), V(3.4, 0, 0), 0.85, 10), g)); parts.push(paint(sph(1, 1.0, 0.9, 0.8, 3.5, 0, 0, 10, 6), g)); parts.push(paint(box(0.25, 1.1, 0.3, 2.6, 0, 0.8), rgb(0xfff8f0))); return merge(parts); },
  shelf(w) { const parts = [], wood = rgb(0xff5fb0); parts.push(paint(box(w, 1.2, 6, 0, 0, 0), wood)); parts.push(paint(box(w + 0.4, 0.4, 6.2, 0, 0.7, 0), rgb(0xfff4f8))); for (const x of [-w / 2 + 1, w / 2 - 1]) parts.push(paint(box(0.8, 9, 0.8, x, -4.6, 0), rgb(0x3a3440))); return merge(parts); },
  // the hook: its eye, the shank, the bend, the barb, a sweet on it for bait
  hook() {
    const parts = [], st = rgb(0xdfe4ec);
    parts.push(paint(new THREE.TorusGeometry(1.0, 0.32, 10, 22).translate(0, 0, 0), st));
    parts.push(paint(cyl(0.38, 0.38, 9, 12, 0, -5.4, 0), st));
    const bend = new THREE.TorusGeometry(2.6, 0.38, 10, 28, Math.PI * 1.15); bend.rotateZ(Math.PI); bend.translate(2.6, -9.9, 0); parts.push(paint(bend, st));
    parts.push(paint(cyl(0.38, 0.38, 3.6, 12, 5.2, -8.4, 0), st));
    const barb = new THREE.ConeGeometry(0.55, 1.6, 10); barb.rotateZ(0.6); barb.translate(4.7, -7.0, 0); parts.push(paint(barb, st));
    const mid = sph(1, 2.2, 1.6, 1.6, 2.6, -12.2, 0, 16, 10); paint(mid, rgb(0xff3a5a)); parts.push(mid);
    for (const s of [-1, 1]) { const c = new THREE.ConeGeometry(1.3, 2.0, 10); c.rotateZ(s * Math.PI / 2); c.translate(2.6 + s * 3.0, -12.2, 0); parts.push(paint(c, rgb(0xffd0e4))); }
    return merge(parts);
  },
  line(L) { return paint(cyl(0.09, 0.09, L, 6, 0, L / 2, 0), rgb(0xe8e8f0)); },
  // the chocolate bunny: sitting up, its ears, a pink foil bow at its neck
  bunny() {
    const parts = [], ch = rgb(0x6a361c), ch2 = rgb(0x5a2c16), foil = rgb(0xff4fa8);
    parts.push(paint(sph(1, 4.6, 5.4, 4.0, 0, 5.4, 0, 22, 14), ch));
    parts.push(paint(sph(1, 2.4, 1.6, 2.6, 0, 1.4, 2.4, 14, 10), ch2));
    parts.push(paint(sph(1, 3.2, 3.0, 3.0, 0, 12.6, 0.6, 20, 12), ch));
    for (const s of [-1, 1]) { const e = sph(1, 1.0, 4.4, 0.7, s * 1.5, 18.4, -0.2, 12, 8); e.rotateZ(-s * 0.16); parts.push(paint(e, ch)); }
    parts.push(paint(sph(1, 1.2, 1.0, 1.0, 0, 11.6, 3.4, 12, 8), ch2));
    for (const s of [-1, 1]) parts.push(paint(sph(0.5, 1, 1, 0.6, s * 1.25, 13.3, 3.2, 10, 6), rgb(0x2a140a)));
    parts.push(paint(new THREE.TorusGeometry(2.7, 0.55, 8, 28).rotateX(Math.PI / 2).translate(0, 9.9, 0.4), foil));
    for (const s of [-1, 1]) { const b = sph(1, 1.6, 1.0, 0.5, s * 1.3, 9.9, 3.1, 12, 8); b.rotateZ(s * 0.4); parts.push(paint(b, foil)); }
    return merge(parts);
  },
  // the vat the road breaks over: its wall, the rim, the walkway round it (the candy in it and
  // the paddle turning are their own layers)
  vat(R) {
    const parts = [], steel = rgb(0xb8bcc8), dark = rgb(0x4a4e58), yel = rgb(0xffc81a);
    const wall = new THREE.CylinderGeometry(R, R, 10, 64, 1, true); wall.translate(0, 5, 0); parts.push(paint(wall, steel));
    parts.push(paint(new THREE.TorusGeometry(R, 0.7, 10, 64).rotateX(Math.PI / 2).translate(0, 10, 0), steel));
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; parts.push(paint(box(1.2, 10, 1.2, Math.cos(a) * (R + 0.4), 5, Math.sin(a) * (R + 0.4)), dark)); }
    const walk = new THREE.RingGeometry(R + 1, R + 4, 64, 1); walk.rotateX(-Math.PI / 2); walk.translate(0, 9.2, 0); parts.push(paint(walk, dark));
    for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; parts.push(paint(box(0.25, 2.4, 0.25, Math.cos(a) * (R + 4), 10.4, Math.sin(a) * (R + 4)), yel)); }
    const rail = new THREE.TorusGeometry(R + 4, 0.18, 6, 64); rail.rotateX(Math.PI / 2); rail.translate(0, 11.6, 0); parts.push(paint(rail, yel));
    return merge(parts);
  },
  // the paddle: a short hub at the middle and two arms sweeping just over the candy (nothing up
  // where she flies)
  // the sign on the factory's roof: a wrapped sweet, its twists, on a steel frame
  roofSweet() {
    const parts = [], pink = rgb(0xff3a8a), white = rgb(0xfff2f8), steel = rgb(0x3a3440);
    // its stripes run diagonally round it, the way a twist of wrapper leaves them
    const mid = sph(1, 9, 5.6, 2.2, 0, 0, 0, 72, 36);
    { const p = mid.attributes.position, n = p.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const k = ((p.getX(i) * 0.3 + p.getY(i) * 0.42) % 2 + 2) % 2; col.set(k < 1 ? pink : white, i * 3); } mid.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
    parts.push(mid);
    for (const s of [-1, 1]) { const c = new THREE.ConeGeometry(5.2, 7.5, 18); c.rotateZ(s * Math.PI / 2); c.scale(1, 1, 0.35); c.translate(s * 12.2, 0, 0); parts.push(paint(c, pink)); }
    for (const x of [-10, 10]) parts.push(paint(box(0.8, 22, 0.8, x, -15, -1.5), steel));
    parts.push(paint(box(26, 0.8, 0.8, 0, -8, -1.5), steel));
    return merge(parts);
  },
  paddle(R) { const parts = [], st = rgb(0xd8dce4); parts.push(paint(cyl(1.4, 1.4, 6, 16, 0, 6.5, 0), st)); for (const s of [-1, 1]) { parts.push(paint(box(R * 0.85, 0.9, 1.2, s * R * 0.43, 8.4, 0), st)); parts.push(paint(box(1.2, 4, 1.0, s * R * 0.8, 6.8, 0), st)); } parts.push(paint(cyl(2.4, 2.8, 1.4, 16, 0, 9.9, 0), rgb(0xff4fa8))); return merge(parts); },
};

// the candy in the vat: a swirl of pink and white turning
function swirlMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uA: { value: new THREE.Color(0xff4fa8) }, uB: { value: new THREE.Color(0xfff0f6) }, uBeat: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime, uBeat; uniform vec3 uA, uB; varying vec2 vP;
      void main(){ float r = length(vP), a = atan(vP.y, vP.x);
        float s = sin(a * 3.0 + r * 0.42 - uTime * 1.6);
        float k = smoothstep(-0.25, 0.25, s);
        vec3 c = mix(uA, uB, k) * (0.8 + 0.25 * sin(r * 1.3 - uTime * 3.0));
        c += vec3(1.0) * pow(max(0.0, sin(a * 3.0 + r * 0.42 - uTime * 1.6 + 0.7)), 24.0) * 0.4;
        c *= 1.0 + 0.25 * uBeat;
        gl_FragColor = vec4(c, 1.0); }`,
  });
}
let WEEKTEX = null;
function weekFace() {
  return canvasTex(1024, 464, (g, w, h) => {
    g.fillStyle = '#fbf4f6'; g.fillRect(0, 0, w, h);
    const D = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'], cw = w / 7;
    g.fillStyle = '#e0102a'; g.fillRect(0, 0, w, 74);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 0; k < 7; k++) {
      g.fillStyle = '#ffffff'; g.font = '800 46px Arial, sans-serif'; g.fillText(D[k], cw * (k + 0.5), 38);
      g.fillStyle = '#2a1a22'; g.font = '700 120px Georgia, serif'; g.fillText(String(12 + k), cw * (k + 0.5), 230);
      g.strokeStyle = 'rgba(40,20,30,0.35)'; g.lineWidth = 3; g.strokeRect(cw * k + 2, 76, cw - 4, h - 80);
    }
  });
}

const VC = (M, key, opts, k = 0.3) => litVC(M, key, { roughness: 0.45, metalness: 0.15, ...opts }, k);
extend({
  layers: {
    cdyDoor: (M) => [CDY.door(16, 30), VC(M, 'cdyDoorM', { roughness: 0.5, metalness: 0.4 }, 0.35), 2, {}],
    cdyDockDoor: (M) => [CDY.door(15, 26), VC(M, 'cdyDoorM', { roughness: 0.5, metalness: 0.4 }, 0.35), 2, {}],
    cdyLipTop: (M) => [CDY.lipTop(), VC(M, 'cdyLipM', { roughness: 0.15, metalness: 0.05 }, 0.75), 2, {}],
    cdyLipBot: (M) => [CDY.lipBottom(), VC(M, 'cdyLipM', { roughness: 0.15, metalness: 0.05 }, 0.75), 2, {}],
    cdyCube: (M) => [CDY.cube(), tintLit(M, 'cdyCubeM', { roughness: 0.5, metalness: 0 }, 0.55), 24, { aTint: 3 }],
    cdyStar: (M) => [CDY.star(), VC(M, 'cdyStarM', { roughness: 0.25, metalness: 0.5 }, 0.8), 2, {}],
    cdyFlossStand: (M) => [CDY.flossStand(), VC(M, 'cdyFlossStandM', { roughness: 0.3, metalness: 0.45 }, 0.3), 2, {}],
    cdyFloss: (M) => [new THREE.IcosahedronGeometry(1, 2), M.cdyFlossM || (M.cdyFlossM = new THREE.MeshStandardMaterial({ color: 0xffa8d4, emissive: 0xff5fb0, emissiveIntensity: 0.45, roughness: 1, transparent: true, opacity: 0.82, depthWrite: false })), 40, {}],
    cdySwitch: (M) => [CDY.switchBoard(), VC(M, 'cdySwitchM', { roughness: 0.5, metalness: 0.3 }, 0.3), 2, {}],
    cdyBlades: (M) => [CDY.blades(), VC(M, 'cdyBladesM', { roughness: 0.3, metalness: 0.6 }, 0.35), 2, {}],
    cdyHat: (M) => [CDY.hat(), VC(M, 'cdyHatM', { roughness: 0.45, metalness: 0.05 }, 0.6), 2, {}],
    cdyRabbit: (M) => [CDY.rabbit(), VC(M, 'cdyRabbitM', { roughness: 0.8, metalness: 0 }, 0.75), 2, {}],
    cdyBar: (M) => [CDY.bar(false), VC(M, 'cdyBarM', { roughness: 0.35, metalness: 0.1 }, 0.35), 2, {}],
    cdyBarBitten: (M) => [CDY.bar(true), VC(M, 'cdyBarM', { roughness: 0.35, metalness: 0.1 }, 0.35), 2, {}],
    cdyCrumb: (M) => [CDY.crumb(), M.cdyCrumbM || (M.cdyCrumbM = new THREE.MeshStandardMaterial({ color: 0x6a3820, emissive: 0x2a1408, roughness: 0.6 })), 40, {}],
    cdyGantry: (M) => [CDY.gantry(17), VC(M, 'cdyGantryM', { roughness: 0.5, metalness: 0.4 }, 0.25), 2, {}],
    cdyBlade: (M) => [CDY.blade(), VC(M, 'cdyBladeM', { roughness: 0.2, metalness: 0.6 }, 0.6), 12, {}],
    cdyDeck: (M) => [CDY.deck(), VC(M, 'cdyDeckM', { roughness: 0.4, metalness: 0.3 }, 0.55), 12, {}],
    cdyRecord: (M) => [CDY.record(), VC(M, 'cdyRecordM', { roughness: 0.15, metalness: 0.1 }, 0.95), 12, {}],
    cdyArm: (M) => [CDY.arm(), VC(M, 'cdyArmM', { roughness: 0.25, metalness: 0.7 }, 0.3), 12, {}],
    cdyWeekFrame: (M) => [CDY.weekFrame(), VC(M, 'cdyWeekM', { roughness: 0.5, metalness: 0.05 }, 0.4), 2, {}],
    cdyWeekFace: (M) => [CDY.weekFace(), M.cdyWeekFaceM || (M.cdyWeekFaceM = new THREE.MeshBasicMaterial({ map: (WEEKTEX = WEEKTEX || weekFace()), color: new THREE.Color(0.95, 0.92, 0.94) })), 2, {}],
    cdyStick: (M) => [CDY.stick(), M.cdyStickM || (M.cdyStickM = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, emissive: 0x2a2a2a }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(vTint, vec3(1.0), step(0.9, vColor.r));').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.45;'); }; m.customProgramCacheKey = () => 'cdyStick'; return m; })()), 16, { aTint: 3 }],
    cdyGinger: (M) => [CDY.ginger(), VC(M, 'cdyGingerM', { roughness: 0.75, metalness: 0 }, 0.7), 8, {}],
    cdyGArm: (M) => [CDY.gArm(), VC(M, 'cdyGingerM', { roughness: 0.75, metalness: 0 }, 0.7), 16, {}],
    cdyShelf: (M) => [CDY.shelf(34), VC(M, 'cdyShelfM', { roughness: 0.4, metalness: 0.1 }, 0.55), 2, {}],
    cdyHook: (M) => [CDY.hook(), VC(M, 'cdyHookM', { roughness: 0.12, metalness: 0.9 }, 0.35), 2, {}],
    cdyLine: (M) => [CDY.line(1), VC(M, 'cdyLineM', { roughness: 0.4, metalness: 0.2 }, 0.6), 4, {}],
    cdyBunny: (M) => [CDY.bunny(), VC(M, 'cdyBunnyM', { roughness: 0.28, metalness: 0.15 }, 1.6), 2, {}],
    cdyVat: (M) => [CDY.vat(24), VC(M, 'cdyVatM', { roughness: 0.3, metalness: 0.6 }, 0.25), 2, {}],
    cdySwirl: (M) => [(() => { const g = new THREE.CircleGeometry(24, 64); g.rotateX(-Math.PI / 2); return g; })(), M.cdySwirlM || (M.cdySwirlM = swirlMaterial()), 2, {}],
    cdyPaddle: (M) => [CDY.paddle(24), VC(M, 'cdyPaddleM', { roughness: 0.25, metalness: 0.7 }, 0.3), 2, {}],
    cdyRoofSweet: (M) => [CDY.roofSweet(), VC(M, 'cdyRoofM', { roughness: 0.3, metalness: 0.1 }, 1.1), 2, {}],
  },
  parts: {
    // a roll-up door in a wall's opening, going up (the light from inside spills out under it)
    cdyDoor(S, it, p) {
      const L = S.layers[it.dock ? 'cdyDockDoor' : 'cdyDoor'];
      const T = S.tNow ?? 0, k = smooth(it.open0, it.open1, T), hh = it.hh ?? 30;
      const yaw = S.course.sample(it.t).yaw; S._e.set(0, yaw, 0); const q = (S._cdq || (S._cdq = new THREE.Quaternion())).setFromEuler(S._e);
      const fy = floorAt(S.course, it.t);
      const w = local(p, yaw, 0, 0, it.inset ?? 0.9, S._o); w.y = fy + k * (hh - 1.5);
      S._m.compose(w, q, S._s.set(1, 1, 1)); if (k < 0.995) L.add(S._m);
      if (k > 0.01) { const g = local(p, yaw, 0, 0, -2, S._o); glowAt(S, g.x, fy + k * hh * 0.5, g.z, 30, it.light || [1, 0.7, 0.85], 0.35 * k); poolAt(S, g.x, fy + 0.1, g.z - 0, 40, it.light || [1, 0.7, 0.85], 0.45 * k); }
    },
    // the wax lips on the wall, talking: open on every syllable
    cdyLips(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, s = it.s ?? 1;
      const open = bumps(T, it.syl || [], 0.05, 0.2) + 0.12 * Math.max(0, Math.sin(T * 2.1));
      const c = local(p, yaw, 0, (it.y ?? 16) * s, 0, S._o).clone();
      S._m.compose(local(c, yaw, 0, 0.9 * open * s, 0, S._o), q, S._s.set(s, s, s)); S.layers.cdyLipTop.add(S._m);
      S._m.compose(local(c, yaw, 0, -2.8 * open * s, 0, S._o), q, S._s.set(s, s * (1 - 0.1 * open), s)); S.layers.cdyLipBot.add(S._m);
      glowAt(S, c.x, c.y, c.z, 22 * s, [1, 0.25, 0.35], 0.35 + 0.3 * open);
    },
    // the tower of sugar cubes, a cube landing on each beat until the star goes on top
    cdyMyth(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, cubes = S.layers.cdyCube, s = it.s ?? 1, beats = it.beats || [];
      const R = seeded(17), PAST = [0xff4fa8, 0x4fe8b8, 0xffd23a, 0xa070ff, 0xff8a3a, 0xff3a5a];
      let topY = 0;
      for (let k = 0; k < beats.length; k++) {
        const rx = (R() - 0.5) * 0.9, rz = (R() - 0.5) * 0.9, ry = (R() - 0.5) * 0.5, tint = hexRGB(PAST[k % PAST.length]);
        const d = T - beats[k];
        if (d < -0.32) continue;
        const fall = d < 0 ? (d / 0.32) * (d / 0.32) * 26 : 0;
        const sq = d >= 0 && d < 0.25 ? Math.sin(d / 0.25 * Math.PI) * 0.18 * (1 - d / 0.25) : 0;
        const y = (2.1 + k * 4.0) * s + fall * s;
        const w = local(p, yaw, rx * s, y, rz * s, S._o);
        S._e.set(0, yaw + ry, 0); const cq = (S._mq || (S._mq = new THREE.Quaternion())).setFromEuler(S._e);
        S._m.compose(w, cq, S._s.set(s * (1 + sq), s * (1 - sq), s * (1 + sq))); cubes.add(S._m, { aTint: tint });
        if (d >= 0 && d < 0.3) glowAt(S, w.x, w.y - 2 * s, w.z, 9 * s, [1, 0.95, 1], 1.2 * (1 - d / 0.3));
        topY = y;
      }
      const star = beats.length ? T - beats[beats.length - 1] : -1;
      const so = local(p, yaw, 0, topY + 6 * s, 0, S._o);
      S._e.set(0, T * 1.8, 0); const sq2 = (S._sq || (S._sq = new THREE.Quaternion())).setFromEuler(S._e);
      if (star > 0) { const g = Math.min(1, star / 0.25); S._m.compose(so, sq2, S._s.set(s * g, s * g, s * g)); S.layers.cdyStar.add(S._m); glowAt(S, so.x, so.y, so.z, 16 * s, [1, 0.85, 0.4], 1.0 * g); }
      else S.layers.cdyStar.add(S._m.makeScale(0, 0, 0));
    },
    // the cotton candy, spinning up out of its bowl
    cdyFloss(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, s = it.s ?? 1;
      S._m.compose(p, q, S._s.set(s, s, s)); S.layers.cdyFlossStand.add(S._m);
      const grow = 0.55 + 0.45 * smooth(it.from ?? 0, it.to ?? 1, T), R = seeded(23);
      for (let k = 0; k < 22; k++) {
        const a = R() * Math.PI * 2 + T * (1.6 + R() * 0.8), rr = (R() * 5.5) * grow * s, y = (12 + R() * 7 * grow) * s;
        const w = local(p, yaw, Math.cos(a) * rr, y, Math.sin(a) * rr, S._o); const sz = (2.4 + R() * 2.6) * grow * s;
        S._m.makeScale(sz, sz * 0.8, sz); S._m.setPosition(w); S.layers.cdyFloss.add(S._m);
      }
      const c = local(p, yaw, 0, 15 * s, 0, S._o); glowAt(S, c.x, c.y, c.z, 22 * s, [1, 0.55, 0.8], 0.45);
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + T * 9; const w = local(p, yaw, Math.cos(a) * 8.5 * s, 10.6 * s, Math.sin(a) * 8.5 * s, S._o); glowAt(S, w.x, w.y, w.z, 2.2 * s, [1, 0.8, 0.95], 0.8); }
    },
    // the knife switch: thrown up into its clips on the word; the sparks, and the lights coming on
    cdySwitch(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, s = it.s ?? 1;
      const w0 = local(p, yaw, 0, (it.y ?? 6) * s, 0, S._o).clone();
      S._m.compose(w0, q, S._s.set(s, s, s)); S.layers.cdySwitch.add(S._m);
      const k = smooth(it.throw - 0.25, it.throw, T), ang = 1.25 * (1 - k);
      E(S).set(ang, yaw, 0); const bq = (S._bq || (S._bq = new THREE.Quaternion())).setFromEuler(E(S));
      const hinge = local(w0, yaw, 0, 3.0 * s, 1.2 * s, S._o).clone();
      S._m.compose(hinge, bq, S._s.set(s, s, s)); S.layers.cdyBlades.add(S._m);
      const d = T - it.throw;
      if (d > 0 && d < 0.5) for (let j = 0; j < 10; j++) { const a = j * 2.4 + T * 30; const c = local(w0, yaw, Math.cos(a) * 5 * s, (13.4 + Math.sin(a) * 4) * s, 2 * s, S._o); glowAt(S, c.x, c.y, c.z, 2.6 * s, [1, 0.85, 0.5], 2.0 * (1 - d / 0.5)); }
      if (d > 0 && d < 0.25) { const c = local(w0, yaw, 0, 13 * s, 2 * s, S._o); glowAt(S, c.x, c.y, c.z, 40 * s, [0.9, 0.95, 1], 2.4 * (1 - d / 0.25)); }
      const lamp = local(w0, yaw, 0, 17.5 * s, 1 * s, S._o); glowAt(S, lamp.x, lamp.y, lamp.z, 3 * s, d > 0 ? [0.4, 1, 0.5] : [1, 0.15, 0.1], 1.4);
    },
    // the top hat; the rabbit out of it on "trick", in a puff
    cdyHat(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, s = it.s ?? 1;
      S._m.compose(p, q, S._s.set(s, s, s)); S.layers.cdyHat.add(S._m);
      const d = T - it.pop, k = d < 0 ? 0 : Math.min(1, d / 0.18), bob = d > 0.18 ? Math.sin((d - 0.18) * 9) * Math.exp(-(d - 0.18) * 3) * 0.6 : 0;
      const y = (5 + (11.5 + bob) * k) * s;
      const w = local(p, yaw, 0, y, 0, S._o);
      S._m.compose(w, q, S._s.set(s, s * (k > 0 ? 1 : 0.01), s)); S.layers.cdyRabbit.add(S._m);
      if (d > -0.02 && d < 0.6) { const kk = 1 - d / 0.6; for (let j = 0; j < 9; j++) { const a = j * 0.7; const c = local(p, yaw, Math.cos(a) * (5 + d * 14) * s, (17 + Math.sin(j * 1.3) * 2 + d * 6) * s, Math.sin(a) * (3 + d * 8) * s, S._o); glowAt(S, c.x, c.y, c.z, (6 + d * 12) * s, [1, 0.65, 0.88], 0.9 * kk * kk); } }
      // a spotlight on it from above, and the pool it makes
      const top = local(p, yaw, 0, 17 * s, 0, S._o); glowAt(S, top.x, top.y + 3 * s, top.z, 24 * s, [1, 0.6, 0.85], 0.45);
      poolAt(S, p.x, p.y + 0.1, p.z, 30 * s, [1, 0.75, 0.9], 0.7);
    },
    // the bar; the bite out of its corner on the word, and the crumbs
    cdyBar(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, s = it.s ?? 1, bitten = T >= it.bite;
      S._m.compose(p, q, S._s.set(s, s, s)); S.layers[bitten ? 'cdyBarBitten' : 'cdyBar'].add(S._m);
      if (!bitten) S.layers.cdyBarBitten.add(S._m.makeScale(0, 0, 0)); else S.layers.cdyBar.add(S._m.makeScale(0, 0, 0));
      const d = T - it.bite;
      if (d > 0 && d < 1.4) {
        const R = seeded(41);
        for (let j = 0; j < 16; j++) {
          const vx = (R() - 0.2) * 9, vy = 3 + R() * 9, vz = 2 + R() * 6, tt = d;
          const c = local(p, yaw, (2.5 + vx * tt) * s, (17.5 + vy * tt - 11 * tt * tt) * s, (1.5 + vz * tt) * s, S._o);
          E(S).set(tt * 7 + j, tt * 5, 0); const cq = (S._crq || (S._crq = new THREE.Quaternion())).setFromEuler(E(S));
          S._m.compose(c, cq, S._s.set(s * 1.6, s * 1.6, s * 1.6)); S.layers.cdyCrumb.add(S._m);
        }
      } else S.layers.cdyCrumb.add(S._m.makeScale(0, 0, 0));
      const c = local(p, yaw, 0, 12 * s, 3 * s, S._o); glowAt(S, c.x, c.y, c.z, 24 * s, [1, 0.6, 0.45], 0.3);
    },
    // the razor blades over the road, their bottoms dipped in pink, swinging on the beat
    cdyRazors(S, it, p) {
      const T = S.tNow ?? 0, sm = S.course.sample(it.t), yaw = sm.yaw, beat = S.beat ?? 0;
      S._e.set(0, yaw, 0); const gq = (S._rgq || (S._rgq = new THREE.Quaternion())).setFromEuler(S._e);
      const base = S._rgp || (S._rgp = new THREE.Vector3()); base.set(p.x, sm.y + (it.lift ?? 2), p.z);
      S._m.compose(base, gq, S._s.set(1, 1, 1)); S.layers.cdyGantry.add(S._m);
      for (let k = 0; k < 5; k++) {
        const x = -12 + k * 6, sw = Math.sin(T * 2.2 + k * 1.3) * 0.18 + beat * 0.12 * (k % 2 ? 1 : -1);
        const top = local(base, yaw, x, 12.4, 0, S._o).clone();
        E(S).set(sw, yaw + Math.sin(T * 1.3 + k) * 0.5, 0); const bq = (S._rbq || (S._rbq = new THREE.Quaternion())).setFromEuler(E(S));
        const w = top.clone().add(new THREE.Vector3(0, -5.6, 0).applyQuaternion(bq));
        S._m.compose(w, bq, S._s.set(1.3, 1.3, 1.3)); S.layers.cdyBlade.add(S._m);
        glowAt(S, w.x, w.y + 1.2, w.z, 3.4, [1, 1, 1], 0.4 + 0.9 * Math.pow(Math.max(0, Math.sin(T * 3 + k * 2.1)), 12));
      }
    },
    // a turntable on the wall, its pink record turning; the arm jumps back on every beat: the stutter
    cdyDeck(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, s = it.s ?? 1, c = S.course;
      const w0 = local(p, yaw, 0, (it.y ?? 20) * s, 0, S._o).clone();
      S._m.compose(w0, q, S._s.set(s, s, s)); S.layers.cdyDeck.add(S._m);
      const spin = T * 3.5;
      E(S).set(0, yaw, -spin); const rq = (S._drq || (S._drq = new THREE.Quaternion())).setFromEuler(E(S));
      const rc = local(w0, yaw, -1.5 * s, 0, 0.9 * s, S._o).clone();
      S._m.compose(rc, rq, S._s.set(s, s, s)); S.layers.cdyRecord.add(S._m);
      // the skip: the needle slides in over the beat, then jumps back out on the next
      const b = c.beatAt(T), f = b - Math.floor(b), stut = it.stutter && T > it.stutter[0] && T < it.stutter[1];
      const ang = stut ? 0.42 - 0.16 * f : 0.42 - 0.0016 * (T % 60);
      E(S).set(0, yaw, -ang); const aq = (S._daq || (S._daq = new THREE.Quaternion())).setFromEuler(E(S));
      const piv = local(w0, yaw, 9.0 * s, 8.5 * s, 1.9 * s, S._o).clone();
      S._m.compose(piv, aq, S._s.set(s, s, s)); S.layers.cdyArm.add(S._m);
      glowAt(S, rc.x, rc.y, rc.z, 15 * s, [1, 0.4, 0.75], 0.25 + (stut ? 0.5 * Math.exp(-f * 5) : 0));
      const ne = local(w0, yaw, 3.5 * s, -3.7 * s, 1.6 * s, S._o); glowAt(S, ne.x, ne.y, ne.z, 4 * s, [1, 0.95, 0.8], stut ? 1.6 * Math.exp(-f * 8) : 0.4);
    },
    // the week on the wall; a lollipop stuck into each day, one a beat
    cdyWeek(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, s = it.s ?? 1;
      const w0 = local(p, yaw, 0, (it.y ?? 9) * s, 0, S._o).clone();
      S._m.compose(w0, q, S._s.set(s, s, s)); S.layers.cdyWeekFrame.add(S._m); S.layers.cdyWeekFace.add(S._m);
      const hits = it.hits || [];
      for (let k = 0; k < 7; k++) {
        const d = T - (hits[k] ?? 1e9);
        if (d < -0.3) { S.layers.cdyStick.add(S._m.makeScale(0, 0, 0), { aTint: [1, 1, 1] }); continue; }
        const fly = d < 0 ? -d / 0.3 : 0, wob = d > 0 ? Math.sin(d * 30) * Math.exp(-d * 6) * 0.15 : 0;
        const x = (-15.7 + k * 5.23) * s;
        const w = local(w0, yaw, x, (7.5 + (k % 2) * 1.2) * s, (5.6 + fly * 30) * s, S._o);
        E(S).set(-0.12 + wob, yaw, (k - 3) * 0.08); const lq = (S._wkq || (S._wkq = new THREE.Quaternion())).setFromEuler(E(S));
        S._m.compose(w, lq, S._s.set(s * 1.1, s * 1.1, s * 1.1)); S.layers.cdyStick.add(S._m, { aTint: hexRGB(CANDY[k % 7]) });
        if (d > 0 && d < 0.25) glowAt(S, w.x, w.y, w.z, 8 * s, [1, 0.6, 0.85], 1.2 * (1 - d / 0.25));
      }
      glowAt(S, w0.x, w0.y + 9 * s, w0.z, 30 * s, [1, 0.9, 0.95], 0.2);
    },
    // gingerbread men on a shelf, popping and locking on the beat
    cdyGinger(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, s = it.s ?? 1, c = S.course;
      const w0 = local(p, yaw, 0, (it.y ?? 9) * s, 0, S._o).clone();
      S._m.compose(w0, q, S._s.set(s, s, s)); S.layers.cdyShelf.add(S._m);
      const b = c.beatAt(T), bi = Math.floor(b), f = b - bi, snap = 1 - Math.pow(1 - Math.min(1, f / 0.12), 3);
      const POSES = [[0.2, -0.2], [1.4, -1.4], [-0.6, 0.6], [1.4, 0.2], [-1.2, -1.2], [0.2, 1.4], [0.9, -0.9], [-0.2, -1.5]];
      for (let k = 0; k < 5; k++) {
        const x = (-12 + k * 6) * s, pa = POSES[(bi + k * 3) % 8], pb = POSES[(bi + 1 + k * 3) % 8];
        const tilt = ((bi + k) % 2 ? 0.12 : -0.12) * snap;
        const bw = local(w0, yaw, x, 0.6 * s, 0, S._o).clone();
        E(S).set(0, yaw, tilt); const gq = (S._ggq || (S._ggq = new THREE.Quaternion())).setFromEuler(E(S));
        S._m.compose(bw, gq, S._s.set(s, s, s)); S.layers.cdyGinger.add(S._m);
        for (const sd of [-1, 1]) {
          const ang = (pa[sd > 0 ? 0 : 1] + (pb[sd > 0 ? 0 : 1] - pa[sd > 0 ? 0 : 1]) * snap) * sd;
          const sh = local(bw, yaw, sd * 2.0 * s, 7.6 * s, 0, S._o).clone();
          E(S).set(0, yaw + (sd < 0 ? Math.PI : 0), ang * (sd < 0 ? -1 : 1) + tilt);
          const aq = (S._gaq || (S._gaq = new THREE.Quaternion())).setFromEuler(E(S));
          S._m.compose(sh, aq, S._s.set(s, s, s)); S.layers.cdyGArm.add(S._m);
        }
      }
      glowAt(S, w0.x, w0.y + 6 * s, w0.z, 34 * s, [1, 0.7, 0.45], 0.22 + 0.25 * (S.beat ?? 0));
    },
    // the hook, let down over the road on its line, a sweet on it for bait
    cdyHook(S, it, p) {
      const T = S.tNow ?? 0, sm = S.course.sample(it.t), yaw = sm.yaw;
      const k = smooth(it.down0, it.down1, T), bob = Math.sin(T * 2.3) * 0.6 + (T > it.down1 ? Math.sin((T - it.down1) * 7) * Math.exp(-(T - it.down1) * 2.5) * 1.6 : 0);
      const y = sm.y + (it.low ?? 9) + (1 - k) * 26 + bob;
      const w = S._hkp || (S._hkp = new THREE.Vector3()); w.set(p.x, y, p.z);
      // face-on to her as she comes, turning a little on its line
      E(S).set(0, yaw + Math.PI + Math.sin(T * 0.9) * 0.45, Math.sin(T * 1.7) * 0.08); const hq = (S._hkq || (S._hkq = new THREE.Quaternion())).setFromEuler(E(S));
      S._m.compose(w, hq, S._s.set(1.15, 1.15, 1.15)); S.layers.cdyHook.add(S._m);
      const L = 60; S._m.compose(S._o.set(w.x, y + 1.0, w.z), hq, S._s.set(1, L, 1)); S.layers.cdyLine.add(S._m);
      const bait = S._o.set(2.6 * 1.15, -12.2 * 1.15, 0).applyQuaternion(hq).add(w); glowAt(S, bait.x, bait.y, bait.z, 9, [1, 0.35, 0.5], 0.6 + 0.4 * (S.beat ?? 0));
      glowAt(S, w.x, y - 6, w.z, 3, [1, 1, 1], 0.5 + 0.8 * Math.pow(Math.max(0, Math.sin(T * 2.4)), 10));
    },
    // the chocolate bunny: it leans, goes over, and lands on its face on the beat
    cdyBunny(S, it, p, q, yaw) {
      const T = S.tNow ?? 0, s = it.s ?? 1;
      const u = clamp((T - it.tip) / (it.fall - it.tip), 0, 1), ang = (u * u) * 1.42;
      const d = T - it.fall, bounce = d > 0 ? Math.abs(Math.sin(d * 11)) * Math.exp(-d * 6) * 0.12 : 0;
      // over its front edge, toward the road
      const pivot = local(p, yaw, 0, 0, 4 * s, S._o).clone();
      E(S).set(ang - bounce, yaw, 0); const bq = (S._buq || (S._buq = new THREE.Quaternion())).setFromEuler(E(S));
      const off = new THREE.Vector3(0, 0, -4 * s).applyQuaternion(bq);
      S._m.compose(pivot.clone().add(off), bq, S._s.set(s, s, s)); S.layers.cdyBunny.add(S._m);
      if (d > 0 && d < 1.2) { const R = seeded(57); for (let j = 0; j < 14; j++) { const a = R() * Math.PI * 2, sp = 6 + R() * 10; const c = local(p, yaw, Math.cos(a) * sp * d * s, (1 + (8 + R() * 6) * d - 11 * d * d) * s, (12 + Math.sin(a) * sp * d) * s, S._o); if (c.y < p.y) continue; glowAt(S, c.x, c.y, c.z, 2.4 * s, [0.8, 0.45, 0.25], 0.7 * (1 - d / 1.2)); } }
      // in the dark it has a work light of its own on it
      const top = local(p, yaw, 0, 10 * s, 0, S._o); glowAt(S, top.x, top.y, top.z, 30 * s, [1, 0.6, 0.35], 0.45 * (it.lit ?? 1));
      const lp = local(p, yaw, 0, 0.2, 6 * s, S._o); poolAt(S, lp.x, lp.y, lp.z, 30 * s, [1, 0.62, 0.3], 0.8 * (it.lit ?? 1));
      if (d > 0 && d < 0.2) { const c = local(p, yaw, 0, 1 * s, 14 * s, S._o); glowAt(S, c.x, c.y, c.z, 30 * s, [1, 0.8, 0.6], 1.4 * (1 - d / 0.2)); }
    },
    // the sweet on the factory's roof, facing the street, its bulbs chasing round it on the beat
    cdyRoofSweet(S, it, p) {
      const T = S.tNow ?? 0, s = it.s ?? 1, yaw = S.course.sample(it.t).yaw + Math.PI;
      const c = S._rsc || (S._rsc = new THREE.Vector3()); c.set(p.x, floorAt(S.course, it.t) + (it.y ?? 80), p.z);
      S._e.set(0, yaw, 0); const rq = (S._rsq || (S._rsq = new THREE.Quaternion())).setFromEuler(S._e);
      S._m.compose(c, rq, S._s.set(s, s, s)); S.layers.cdyRoofSweet.add(S._m);
      const b = S.course.beatAt(Math.max(T, -3)), step = Math.floor(b * 2);
      for (let k = 0; k < 36; k++) {
        const a = k / 36 * Math.PI * 2, on = ((k + step) % 3) ? 1 : 0.25;
        const w = local(c, yaw, Math.cos(a) * 10.4 * s, Math.sin(a) * 6.6 * s, 2.6 * s, S._o);
        glowAt(S, w.x, w.y, w.z, 2.2 * s, [1, 0.85, 0.92], 1.1 * on);
      }
      glowAt(S, c.x, c.y, c.z, 46 * s, [1, 0.3, 0.6], 0.45 + 0.25 * (S.beat ?? 0));
    },
    // the mixing vat under the gap: the candy swirling, the paddle going round, its steam
    cdyVat(S, it, p) {
      const T = S.tNow ?? 0, fy = floorAt(S.course, it.t);
      const yaw = S.course.sample(it.t).yaw;
      S._e.set(0, yaw, 0); const vq = (S._vq || (S._vq = new THREE.Quaternion())).setFromEuler(S._e);
      const base = S._vbp || (S._vbp = new THREE.Vector3()); base.set(p.x, fy - 4, p.z);
      S._m.compose(base, vq, S._s.set(1, 1, 1)); S.layers.cdyVat.add(S._m);
      S._m.compose(S._o.set(base.x, base.y + 7.5, base.z), vq, S._s.set(1, 1, 1)); S.layers.cdySwirl.add(S._m);
      S._e.set(0, yaw + T * 0.9, 0); const pq = (S._vpq || (S._vpq = new THREE.Quaternion())).setFromEuler(S._e);
      S._m.compose(base, pq, S._s.set(1, 1, 1)); S.layers.cdyPaddle.add(S._m);
      const sw = S.layers.cdySwirl.mesh.material; if (sw.uniforms) { sw.uniforms.uTime.value = T; sw.uniforms.uBeat.value = S.beat ?? 0; }
      glowAt(S, base.x, base.y + 8, base.z, 40, [1, 0.45, 0.75], 0.18);
      poolAt(S, base.x, base.y + 7.6, base.z, 50, [1, 0.5, 0.8], 0.2);
      for (let k = 0; k < 8; k++) { const a = k * 0.8 + T * 0.3, r = 8 + (k % 3) * 5, h = ((T * 3 + k * 1.7) % 9); glowAt(S, base.x + Math.cos(a) * r, base.y + 9 + h, base.z + Math.sin(a) * r, 6 + h * 0.6, [1, 0.85, 0.95], 0.1 * (1 - h / 9)); }
    },
  },
  kits: {
    cdyRoofSweet(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, s: z.s ?? 1, y: z.y, parts: 'cdyRoofSweet', ahead: z.ahead ?? 60 }); },
    cdyDoor(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, open0: z.open0, open1: z.open1, hh: z.hh, dock: z.dock, inset: z.inset, light: z.light, parts: 'cdyDoor', ahead: z.ahead ?? 46 }); },
    cdyLips(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: FACE(z.x, z.turn ?? 0.45), s: z.s ?? 1, y: z.y, syl: z.syl, parts: 'cdyLips', ahead: z.ahead })); },
    cdyMyth(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, beats: z.beats, parts: 'cdyMyth', ahead: z.ahead })); },
    cdyFloss(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, from: z.grow?.[0], to: z.grow?.[1], parts: 'cdyFloss', ahead: z.ahead })); },
    cdySwitch(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: FACE(z.x, z.turn ?? 0.45), s: z.s ?? 1, y: z.y, throw: z.throw, parts: 'cdySwitch', ahead: z.ahead })); },
    cdyHat(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, pop: z.pop, parts: 'cdyHat', ahead: z.ahead })); },
    cdyBar(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: FACE(z.x, z.turn ?? 0.4), s: z.s ?? 1, bite: z.bite, parts: 'cdyBar', ahead: z.ahead })); },
    cdyRazors(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: 0, rot: 0, lift: z.lift, parts: 'cdyRazors', ahead: z.ahead ?? 40 }); },
    cdyDecks(S, z) { for (const [t, x] of z.at) S.items.push(onGround(S, { t, x, rot: FACE(x, z.turn ?? 0.6), s: z.s ?? 1, y: z.y, stutter: z.stutter, parts: 'cdyDeck', ahead: z.ahead })); },
    cdyWeek(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: FACE(z.x, z.turn ?? 0.35), s: z.s ?? 1, y: z.y, hits: z.hits, parts: 'cdyWeek', ahead: z.ahead })); },
    cdyGinger(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: FACE(z.x, z.turn ?? 0.45), s: z.s ?? 1, y: z.y, parts: 'cdyGinger', ahead: z.ahead })); },
    cdyHook(S, z) { prepare(S.course, S.plan); S.items.push({ t: z.at, x: z.x ?? 0, rot: 0, down0: z.down[0], down1: z.down[1], low: z.low, parts: 'cdyHook', ahead: z.ahead ?? 40 }); },
    cdyBunny(S, z) { S.items.push(onGround(S, { t: z.at, x: z.x, rot: SIDE(z.x), s: z.s ?? 1, tip: z.tip, fall: z.fall, lit: z.lit, parts: 'cdyBunny', ahead: z.ahead })); },
    // under the middle of the gap that starts at the given lip
    cdyVat(S, z) {
      prepare(S.course, S.plan);
      const g = (S.course.gaps || []).find((gg) => Math.abs(gg.lip - z.lip) < 0.3);
      const t = g ? (g.from + g.to) / 2 : z.lip + 0.8;
      S.items.push({ t, x: 0, rot: 0, parts: 'cdyVat', ahead: z.ahead ?? 46 });
    },
  },
});
