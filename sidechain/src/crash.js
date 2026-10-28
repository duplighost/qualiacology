// Kiss Me Like a Car Crash. One night, from the edge of town to the middle of the highway.
// The wreck on the shoulder with its hazards going, the cops at the bomb threat, the hill
// coming down on the landslide; over the freeway in the quiet; the strip; her doorstep, the
// lighter flipped in the dark, the window that goes on "break"; two cars meeting in the
// intersection on "crash", one flipping over her on "break my neck", the hill coming down
// again; the drywall with the secrets carved in it, the whiskey, the wreckage they tangled up
// in; the warning signs, the cross where somebody died; the climb with the helicopter's light
// on her, the pin, the city going off; and at the end, in the middle of the highway, the two
// cars kissing.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local } from './scenery.js';
import { paint, rgb, seeded, box } from './summer.js';
import { prepare, groundAt, Terrain } from './trail.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const TT = { aTint: 3 };
const TAU = Math.PI * 2;

// ---------- fog for our own materials (the scene has none: every shader does its own) ----------
const FOG = { uCcFog: { value: new THREE.Color(0x2a1236) }, uCcFogD: { value: 0.002 } };
function fogged(m, key, extra = '', lit = 0) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCcFog = FOG.uCcFog; sh.uniforms.uCcFogD = FOG.uCcFogD;
    if (extra) extra(sh);
    if (lit > 0) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + lit.toFixed(3) + ';');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uCcFog; uniform float uCcFogD;')
      .replace('#include <fog_fragment>', `float kcD = length(vViewPosition); float kcF = 1.0 - exp(-pow(kcD * uCcFogD, 1.5));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uCcFog, clamp(kcF, 0.0, 1.0));`);
  };
  m.customProgramCacheKey = () => 'kc' + key;
  return m;
}
// vertex-coloured; where a piece is marked as paint (attribute pk = 1) it takes the instance's tint
function paintable(opts, key) {
  const { lit = 0, ...o } = opts;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...o });
  return fogged(m, key, (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; attribute float pk; varying vec3 vTint; varying float vPk;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint; vPk = pk;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint; varying float vPk;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(vec3(1.0), vTint, vPk);');
  }, lit);
}
const VC = (M, key, opts) => { if (M[key]) return M[key]; const { lit = 0, ...o } = opts; return (M[key] = fogged(new THREE.MeshStandardMaterial({ vertexColors: true, ...o }), key, '', lit)); };
const PV = (M, key, opts) => M[key] || (M[key] = paintable(opts, key));
// mark a piece as paint (1) or not (0): every piece of a paintable model needs it
function pk(g, k) { const n = g.attributes.position.count; g.setAttribute('pk', new THREE.BufferAttribute(new Float32Array(n).fill(k), 1)); return g; }
const P1 = (g, c) => pk(paint(g, c), 1), P0 = (g, c) => pk(paint(g, c), 0);

// a side silhouette (z along, y up) pushed out across the width, edges rounded
function profile(points, width, round = 0.12) {
  const s = new THREE.Shape();
  points.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: width - round * 2, bevelEnabled: true, bevelThickness: round, bevelSize: round, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -(width - round * 2) / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}

// ---------- the cars ----------
const DARK = rgb(0x0a0b10), TYRE = rgb(0x070708), CHROME = rgb(0x8a8c94), HEAD = rgb(0xfff4dc), TAIL = rgb(0xc8141a), BODY = [0.92, 0.92, 0.92];
// a four-door with a long hood, nose to +z, 4.7 m: the paint takes the tint. crush > 0 folds
// the front in, buckles the roof and leaves it sat a little nose-down
function sedan(crush = 0, seed = 3) {
  const W = 1.86, parts = [];
  parts.push(P1(profile([[-2.3, 0.3], [2.28, 0.3], [2.36, 0.56], [2.26, 0.78], [1.05, 0.9], [-1.86, 0.97], [-2.3, 0.9], [-2.36, 0.56]], W, 0.14), BODY));
  parts.push(P0(profile([[1.02, 0.88], [0.3, 1.31], [-0.95, 1.33], [-1.82, 0.95]], W - 0.2, 0.07), DARK));
  parts.push(P1(box(W - 0.34, 0.06, 1.18, 0, 1.335, -0.33), BODY));
  for (const x of [-0.8, 0.8]) for (const z of [-1.42, 1.4]) {
    const t = cyl(0.34, 0.34, 0.26, 12, 0, 0, 0); t.rotateZ(Math.PI / 2); t.translate(x, 0.34, z); parts.push(P0(t, TYRE));
    const h = cyl(0.19, 0.19, 0.27, 8, 0, 0, 0); h.rotateZ(Math.PI / 2); h.translate(x, 0.34, z); parts.push(P0(h, CHROME));
  }
  parts.push(P0(box(1.86, 0.16, 0.2, 0, 0.42, 2.36), CHROME), P0(box(1.86, 0.16, 0.2, 0, 0.44, -2.42), CHROME));
  parts.push(P0(box(0.92, 0.16, 0.05, 0, 0.6, 2.35), DARK));
  for (const x of [-0.64, 0.64]) { parts.push(P0(box(0.4, 0.13, 0.06, x, 0.66, 2.3), HEAD)); parts.push(P0(box(0.42, 0.13, 0.06, x, 0.7, -2.37), TAIL)); }
  for (const s of [-1, 1]) parts.push(P1(box(0.06, 0.12, 0.2, s * 0.98, 0.98, 0.95), BODY));   // mirrors
  const g = merge(parts);
  if (crush > 0) {
    const R = seeded(seed), p = g.attributes.position.array, zc = 0.7;
    const n = (x, y, z) => Math.sin(x * 7.1 + z * 3.3 + seed) * Math.cos(y * 5.7 - z * 4.1) ;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2];
      if (z > zc) { const u = z - zc; p[i + 2] = zc + u * (1 - 0.42 * crush); p[i + 1] = y + crush * (0.16 * u * n(x, y, z) + 0.08 * u); p[i] = x * (1 + 0.05 * crush * n(z, x, y)); }
      if (y > 1.0) p[i + 1] = y - crush * 0.16 * (0.5 + 0.5 * n(x, z, y));
    }
    g.computeVertexNormals();
    void R;
  } else g.computeVertexNormals();
  return g;
}
// a black-and-white with its light bar
function cruiser() {
  const W = 1.88, parts = [];
  parts.push(P0(profile([[-2.32, 0.3], [2.3, 0.3], [2.38, 0.56], [2.28, 0.78], [1.05, 0.9], [-1.86, 0.97], [-2.32, 0.9], [-2.38, 0.56]], W, 0.14), rgb(0x0c0d14)));
  for (const s of [-1, 1]) parts.push(P0(box(0.04, 0.42, 2.4, s * 0.95, 0.66, -0.15), rgb(0xf2f2f6)));
  parts.push(P0(profile([[1.02, 0.88], [0.3, 1.31], [-0.95, 1.33], [-1.82, 0.95]], W - 0.2, 0.07), DARK));
  parts.push(P0(box(W - 0.34, 0.06, 1.18, 0, 1.335, -0.33), rgb(0xf2f2f6)));
  parts.push(P0(box(1.3, 0.12, 0.34, 0, 1.43, -0.3), rgb(0x16161c)));
  parts.push(P0(box(0.6, 0.14, 0.3, -0.33, 1.53, -0.3), rgb(0xff1830)), P0(box(0.6, 0.14, 0.3, 0.33, 1.53, -0.3), rgb(0x2050ff)));
  for (const x of [-0.8, 0.8]) for (const z of [-1.42, 1.4]) { const t = cyl(0.34, 0.34, 0.26, 12, 0, 0, 0); t.rotateZ(Math.PI / 2); t.translate(x, 0.34, z); parts.push(P0(t, TYRE)); }
  parts.push(P0(box(1.9, 0.2, 0.24, 0, 0.42, 2.36), rgb(0x1a1a20)), P0(box(1.88, 0.16, 0.2, 0, 0.44, -2.42), CHROME));
  for (const x of [-0.64, 0.64]) { parts.push(P0(box(0.4, 0.13, 0.06, x, 0.66, 2.3), HEAD)); parts.push(P0(box(0.42, 0.13, 0.06, x, 0.7, -2.37), TAIL)); }
  const g = merge(parts); g.computeVertexNormals(); return g;
}
// a stunt ramp: a steel wedge on its stand, chevrons up its face (the low end at -z)
function ramp() {
  const s = new THREE.Shape(); s.moveTo(-5, 0); s.lineTo(4, 0); s.lineTo(4, 3.2); s.lineTo(-5, 0.15);
  const g = new THREE.ExtrudeGeometry(s, { depth: 4.2, bevelEnabled: false }); g.translate(0, 0, -2.1); g.rotateY(-Math.PI / 2);
  const parts = [P0(g, rgb(0x3a3c44))];
  for (let k = 0; k < 4; k++) { const c = box(4.0, 0.04, 0.6, 0, 0.6 + k * 0.72, -2.4 + k * 2.0); c.rotateX(-0.34); parts.push(P0(c, rgb(k % 2 ? 0x101014 : 0xffc21a))); }
  return merge(parts);
}

// ---------- the hill and what comes down it ----------
function boulder(seed) {
  const g = new THREE.IcosahedronGeometry(1, 1).toNonIndexed(), p = g.attributes.position.array, R = seeded(seed);
  const k = [R() * 9, R() * 9, R() * 9];
  for (let i = 0; i < p.length; i += 3) { const x = p[i], y = p[i + 1], z = p[i + 2]; const d = 1 + 0.22 * Math.sin(x * 2.3 + k[0]) * Math.cos(y * 2.9 + k[1]) + 0.12 * Math.sin(z * 4.1 + k[2]); p[i] *= d * 1.15; p[i + 1] *= d * 0.85; p[i + 2] *= d; }
  g.computeVertexNormals();
  const c = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 9) { const v = 0.22 + R() * 0.16; const tone = [v * 1.05, v * 0.92, v * 0.8]; for (let j = 0; j < 3; j++) c.set(tone, i + j * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
// a steep hill of scree with a raw face where it lets go, its foot toward the road (+x)
function hill() {
  const g = new THREE.SphereGeometry(1, 40, 18, 0, TAU, 0, Math.PI / 2).toNonIndexed(), p = g.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    const n = 1 + 0.08 * Math.sin(x * 9 + z * 5) + 0.05 * Math.cos(z * 13 - x * 4);
    p[i] = x * 46 * n; p[i + 1] = Math.pow(Math.max(0, y), 0.8) * 38 * n; p[i + 2] = z * 70 * n;
  }
  g.computeVertexNormals();
  const c = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 9) {
    const x = (p[i] + p[i + 3] + p[i + 6]) / 3, y = (p[i + 1] + p[i + 4] + p[i + 7]) / 3, z = (p[i + 2] + p[i + 5] + p[i + 8]) / 3;
    const scar = x > 6 && Math.abs(z) < 34 && y < 34 ? 1 : 0;            // the face that lets go, toward the road
    const v = 0.5 + 0.5 * Math.sin(x * 0.7 + z * 0.3);
    const tone = scar ? [0.42 + 0.08 * v, 0.3 + 0.05 * v, 0.2] : (y > 30 ? [0.08, 0.12, 0.08] : [0.12 + 0.05 * v, 0.13 + 0.04 * v, 0.1]);
    for (let j = 0; j < 3; j++) c.set(tone, i + j * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

// ---------- the bomb threat: barricade, cones, tape ----------
function sawhorse() {
  const parts = [];
  for (const s of [-1, 1]) { const a = box(0.12, 1.2, 0.12, s * 1.3, 0.55, 0.2); a.rotateX(0.25); parts.push(paint(a, rgb(0xd8d8dc))); const b = box(0.12, 1.2, 0.12, s * 1.3, 0.55, -0.2); b.rotateX(-0.25); parts.push(paint(b, rgb(0xd8d8dc))); }
  for (let k = 0; k < 6; k++) parts.push(paint(box(0.5, 0.3, 0.05, -1.25 + k * 0.5, 1.05, 0), rgb(k % 2 ? 0xf4f4f4 : 0xff6a10)));
  return merge(parts);
}
function cone() {
  const parts = [paint(cyl(0.05, 0.3, 0.9, 12, 0, 0.47, 0), rgb(0xff5a0a)), paint(cyl(0.16, 0.22, 0.16, 12, 0, 0.5, 0), rgb(0xf2f2f2)), paint(box(0.7, 0.05, 0.7, 0, 0.025, 0), rgb(0x1a1a1a))];
  return merge(parts);
}

// ---------- the lighter: a chrome flip-top the size of a house, standing by the road ----------
// rounded like the real thing, brushed chrome darker toward its foot; the chimney with its rows of
// holes, the striker wheel, the hinge barrel down the back corner. Body 5.2 wide, 8.2 tall, 2.6 deep.
function roundedSlab(w, h, d, r) {
  const sh = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r;
  sh.moveTo(-x, -h / 2); sh.lineTo(x, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -y); sh.lineTo(w / 2, y);
  sh.quadraticCurveTo(w / 2, h / 2, x, h / 2); sh.lineTo(-x, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, y);
  sh.lineTo(-w / 2, -y); sh.quadraticCurveTo(-w / 2, -h / 2, -x, -h / 2);
  const g = new THREE.ExtrudeGeometry(sh, { depth: d - 0.3, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 3, curveSegments: 8 });
  g.translate(0, 0, -(d - 0.3) / 2);
  return g;
}
// chrome, brushed: lighter at the top, a little darker toward the foot
function brushed(g, top, bottom, y0, y1) {
  const p = g.attributes.position, n = p.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const k = clamp((p.getY(i) - y0) / (y1 - y0), 0, 1); for (let j = 0; j < 3; j++) c[i * 3 + j] = bottom[j] + (top[j] - bottom[j]) * k; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
function lighterBody() {
  const parts = [];
  const body = roundedSlab(5.2, 8.2, 2.6, 0.7); body.translate(0, 4.1, 0);
  parts.push(brushed(body, [0.86, 0.88, 0.92], [0.42, 0.44, 0.5], 0, 8.2));
  // the seam where the lid closes, and a band at the foot
  parts.push(paint(box(5.32, 0.1, 2.72, 0, 8.15, 0), rgb(0x5a5e68)), paint(box(5.32, 0.12, 2.72, 0, 0.5, 0), rgb(0x5a5e68)));
  // the hinge barrel down the back right corner
  parts.push(paint(cyl(0.22, 0.22, 2.4, 10, 2.62, 7.2, -1.05), rgb(0xb8bcc6)));
  // the chimney, its holes in rows, the wheel and its axle cheeks, the cam
  const ch = roundedSlab(3.0, 2.6, 1.7, 0.18); ch.translate(-0.9, 9.5, 0); parts.push(brushed(ch, [0.82, 0.84, 0.9], [0.62, 0.64, 0.7], 8.2, 10.8));
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) for (const z of [0.88, -0.88]) { const hole = cyl(0.17, 0.17, 0.08, 10, 0, 0, 0); hole.rotateX(Math.PI / 2); hole.translate(-2.0 + k * 0.72, 8.85 + r * 0.66, z); parts.push(paint(hole, rgb(0x101216))); }
  for (const z of [0.55, -0.55]) parts.push(paint(box(0.7, 1.6, 0.12, 1.25, 9.4, z), rgb(0xa8acb6)));
  const w = cyl(0.5, 0.5, 0.9, 18, 0, 0, 0); w.rotateX(Math.PI / 2); w.translate(1.25, 9.9, 0); parts.push(paint(w, rgb(0x6a6e78)));
  for (let k = 0; k < 18; k++) { const a = (k / 18) * TAU; const rib = box(0.08, 0.08, 0.92, 1.25 + Math.cos(a) * 0.5, 9.9 + Math.sin(a) * 0.5, 0); parts.push(paint(rib, rgb(0x3a3e46))); }
  parts.push(paint(box(0.5, 0.3, 1.2, 2.1, 8.4, 0), rgb(0x8a8e98)));
  // the wick
  parts.push(paint(cyl(0.18, 0.2, 0.7, 8, -0.9, 10.95, 0), rgb(0xe8dcc0)));
  const g = merge(parts); g.computeVertexNormals(); return g;
}
// the lid: hinged on the back right edge (x = 2.6, y = 8.2); open, it swings over to the right
function lighterLid() {
  const parts = [];
  const lid = roundedSlab(5.2, 3.6, 2.6, 0.7); lid.translate(-2.6, 1.8, 0);
  parts.push(brushed(lid, [0.9, 0.92, 0.96], [0.7, 0.72, 0.78], 0, 3.6));
  parts.push(paint(box(5.32, 0.1, 2.72, -2.6, 0.05, 0), rgb(0x5a5e68)));
  const g = merge(parts); g.computeVertexNormals(); return g;
}

// ---------- glass ----------
function shard() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0.5, 0, -0.32, -0.3, 0.02, 0.36, -0.22, -0.02]), 3));
  g.computeVertexNormals(); return g;
}
// a shop's big front window, in one piece, until it isn't
function pane() { const g = new THREE.PlaneGeometry(10, 5.2); g.translate(0, 3.2, 0); return g; }

// ---------- the drywall with the secrets carved in it ----------
let DRY_TEX = null;
function drywallTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 768;
  const g = c.getContext('2d');
  g.fillStyle = '#e8e2d6'; g.fillRect(0, 0, 1024, 768);
  // seams and screw heads
  g.strokeStyle = 'rgba(150,140,124,0.45)'; g.lineWidth = 4;
  for (const x of [256, 768]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 768); g.stroke(); }
  g.fillStyle = 'rgba(120,112,100,0.5)';
  for (let x = 40; x < 1024; x += 160) for (let y = 40; y < 768; y += 120) { g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
  // carved: scratched in, dark in the cut, a little light along one edge
  const carve = (fn, w = 7) => { g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#3a2a22'; g.lineWidth = w; fn(); g.stroke(); g.save(); g.translate(-2, -2); g.strokeStyle = 'rgba(255,250,240,0.6)'; g.lineWidth = w * 0.35; fn(); g.stroke(); g.restore(); };
  const heart = (x, y, s) => () => { g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35); g.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9); };
  carve(heart(512, 330, 150), 11);
  g.font = 'bold 120px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const word = (t, x, y, sz, rot) => { g.save(); g.translate(x, y); g.rotate(rot); g.font = `bold ${sz}px Georgia, serif`; g.lineWidth = 6; g.strokeStyle = '#3a2a22'; g.strokeText(t, 0, 0); g.lineWidth = 2; g.strokeStyle = 'rgba(255,250,240,0.6)'; g.strokeText(t, -2, -2); g.restore(); };
  word('A + J', 512, 320, 110, -0.04);
  word('FOREVER', 512, 560, 74, 0.03);
  // an arrow through it, tally marks, a crooked little heart, a date half scratched out
  carve(() => { g.beginPath(); g.moveTo(250, 470); g.lineTo(780, 200); g.moveTo(780, 200); g.lineTo(740, 196); g.moveTo(780, 200); g.lineTo(762, 236); }, 8);
  for (let k = 0; k < 4; k++) carve(() => { g.beginPath(); g.moveTo(120 + k * 22, 620); g.lineTo(126 + k * 22, 700); }, 6);
  carve(() => { g.beginPath(); g.moveTo(104, 700); g.lineTo(212, 626); }, 6);
  carve(heart(860, 610, 46), 6);
  word('3 AM', 840, 150, 60, 0.12);
  carve(() => { g.beginPath(); for (let k = 0; k < 9; k++) { g.moveTo(130 + k * 14, 120); g.lineTo(150 + k * 14, 190); } }, 4);
  // a fist-sized hole punched through, its torn paper edge
  g.fillStyle = '#120c0a'; g.beginPath();
  for (let i = 0; i <= 18; i++) { const a = (i / 18) * TAU, r = 58 + 16 * Math.sin(i * 2.7); const x = 170 + Math.cos(a) * r, y = 400 + Math.sin(a) * r * 0.85; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.fill(); g.strokeStyle = '#f6f2ea'; g.lineWidth = 6; g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
// a wall torn open from the outside: brick round a ragged hole, the drywall inside it
function drywallFrame() {
  const parts = [];
  const brick = rgb(0x6a2a24), mortar = rgb(0x3a1a18);
  parts.push(paint(box(30, 26, 1.2, 0, 13, -0.6), mortar));
  const R = seeded(77);
  for (let r = 0; r < 26; r++) for (let k = 0; k < 15; k++) {
    const x = -15 + k * 2 + (r % 2) + 1, y = 0.5 + r;
    const inHole = Math.abs(x) < 10.5 + R() * 1.4 && y > 4 + R() * 1.5 && y < 19.5 + R() * 1.4;
    if (inHole) continue;
    const v = 0.85 + R() * 0.3;
    parts.push(paint(box(1.9, 0.9, 0.3, x, y, 0.05), [brick[0] * v, brick[1] * v, brick[2] * v]));
  }
  // splintered studs across the hole
  for (const x of [-6, 0, 6]) { const s = box(0.5, 16, 0.5, x, 12, -0.9); parts.push(paint(s, rgb(0xb89a6a))); }
  const g = merge(parts); g.computeVertexNormals(); return g;
}
function drywallFace() { const g = new THREE.PlaneGeometry(21.5, 16); g.translate(0, 12, -1.3); return g; }

// ---------- the whiskey: a bottle the size of a water tower on the liquor store ----------
function bottle() {
  const pts = [[0, 0], [3.0, 0], [3.2, 0.4], [3.2, 9.0], [2.9, 10.4], [1.4, 12.2], [1.05, 13.4], [1.05, 16.2], [1.25, 16.5], [1.25, 17.4], [0, 17.4]].map(([r, y]) => new THREE.Vector2(r, y));
  const glass = new THREE.LatheGeometry(pts, 24);
  const parts = [paint(glass, rgb(0xc8721e))];
  const label = cyl(3.26, 3.26, 4.2, 24, 0, 4.6, 0); parts.push(paint(label, rgb(0x1a1612)));
  const lab2 = cyl(3.27, 3.27, 0.5, 24, 0, 6.9, 0); parts.push(paint(lab2, rgb(0xd8b060)));
  parts.push(paint(cyl(1.3, 1.3, 1.1, 18, 0, 17.9, 0), rgb(0x2a1a10)));
  const g = merge(parts); g.computeVertexNormals(); return g;
}

// ---------- the wreckage they tangled up in: guardrail twisted into an arch over the road ----------
function tangle() {
  const parts = [], R = seeded(19);
  for (let k = 0; k < 7; k++) {
    const pts = [];
    const ph = R() * TAU, amp = 2 + R() * 3, lift = 18 + R() * 9;
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, x = -34 + 68 * u;
      const y = Math.sin(Math.PI * u) * lift + Math.sin(u * 9 + ph) * amp * Math.sin(Math.PI * u);
      const z = Math.sin(u * 7 + ph * 2) * (2 + k * 0.6);
      pts.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 64, 0.32 + R() * 0.12, 6, false);
    tube.scale(1, 1, 1);
    const rust = R() < 0.4;
    parts.push(paint(tube, rust ? rgb(0x7a4a2a) : rgb(0xa8aeb8)));
    // the flat of the W-beam: a ribbon along the same line
    for (let i = 0; i < 24; i += 2) {
      const a = curve.getPoint(i / 24), b = curve.getPoint((i + 1) / 24);
      const d = b.clone().sub(a), len = d.length();
      const plate = box(len, 0.7, 0.12, 0, 0, 0);
      const m = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0));
      plate.rotateY(Math.PI / 2); plate.applyMatrix4(m); plate.translate((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.5, (a.z + b.z) / 2);
      parts.push(paint(plate, rust ? rgb(0x6a3a22) : rgb(0x9aa0aa)));
    }
  }
  // posts torn out of the ground where it starts
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const p = box(0.3, 2.6, 0.3, s * (33 - k * 1.6), 1.2, -2 + k * 1.3); p.rotateZ(s * (0.3 + R() * 0.5)); parts.push(paint(p, rgb(0x8a8e96))); }
  const g = merge(parts); g.computeVertexNormals(); return g;
}

// ---------- warning signs ----------
let WARN_TEX = null;
function warnTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = S * 2; c.height = S * 2;
  const g = c.getContext('2d');
  const sym = [
    (x, y) => { g.fillRect(x - 14, y - 70, 28, 92); g.beginPath(); g.arc(x, y + 50, 16, 0, TAU); g.fill(); },                                       // !
    (x, y) => { g.beginPath(); g.moveTo(x, y + 62); g.bezierCurveTo(x - 92, y - 4, x - 46, y - 86, x, y - 30); g.bezierCurveTo(x + 46, y - 86, x + 92, y - 4, x, y + 62); g.fill(); },   // a heart
    (x, y) => { g.lineWidth = 22; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 20, y + 70); g.bezierCurveTo(x - 20, y, x + 50, y + 10, x + 30, y - 50); g.stroke(); g.beginPath(); g.moveTo(x + 4, y - 58); g.lineTo(x + 34, y - 82); g.lineTo(x + 52, y - 44); g.closePath(); g.fill(); },   // a curve
    (x, y) => { g.beginPath(); g.moveTo(x - 70, y + 60); g.lineTo(x + 70, y + 60); g.lineTo(x + 70, y - 20); g.closePath(); g.fill(); for (const [dx, dy, r] of [[-30, -40, 14], [-4, -64, 11], [24, -20, 9]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); } },  // falling rocks
  ];
  for (let k = 0; k < 4; k++) {
    const cx = (k % 2) * S + S / 2, cy = Math.floor(k / 2) * S + S / 2;
    g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4);
    g.fillStyle = '#111111'; g.fillRect(-88, -88, 176, 176);
    g.fillStyle = '#ffc81a'; g.fillRect(-80, -80, 160, 160);
    g.restore();
    g.fillStyle = '#111111'; g.strokeStyle = '#111111';
    sym[k](cx, cy);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function warnPost() { const parts = [paint(box(0.18, 6.2, 0.18, 0, 3.1, -0.12), rgb(0x8a8c94))]; return merge(parts); }
function warnFace() { const g = new THREE.PlaneGeometry(3.4, 3.4); g.translate(0, 5.6, 0); return g; }
function warnMaterial() {
  const tex = WARN_TEX || (WARN_TEX = warnTexture());
  const m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.5, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  return fogged(m, 'Warn', (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aCell;').replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = uv * 0.5 + aCell * 0.5;\n#endif\n#ifdef USE_EMISSIVEMAP\n vEmissiveMapUv = uv * 0.5 + aCell * 0.5;\n#endif');
  });
}

// ---------- the cross by the road ----------
function memorial() {
  const parts = [], R = seeded(5);
  parts.push(paint(box(0.5, 6.4, 0.42, 0, 3.2, 0), rgb(0xf4f2ee)), paint(box(3.4, 0.5, 0.42, 0, 4.7, 0), rgb(0xf4f2ee)));
  // the wreath hung on it, the photo, flowers banked at its foot
  const wr = new THREE.TorusGeometry(0.95, 0.24, 6, 18); wr.translate(0, 4.3, 0.36); parts.push(paint(wr, rgb(0x2a4a24)));
  for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU; const f = new THREE.SphereGeometry(0.17, 6, 5); f.translate(Math.cos(a) * 0.95, 4.3 + Math.sin(a) * 0.95, 0.55); parts.push(paint(f, rgb([0xd8203a, 0xf6f2f0, 0xff7aa0][k % 3]))); }
  parts.push(paint(box(0.7, 0.9, 0.08, 0, 3.0, 0.26), rgb(0x1a1612)), paint(box(0.56, 0.74, 0.09, 0, 3.0, 0.27), rgb(0x8a7a6a)));
  for (let k = 0; k < 40; k++) { const x = (R() - 0.5) * 3.4, z = (R() - 0.2) * 2.2, y = 0.25 + R() * 0.5; const f = new THREE.SphereGeometry(0.2 + R() * 0.12, 6, 5); f.translate(x, y, z); parts.push(paint(f, rgb([0xd8203a, 0xf6f2f0, 0xff7aa0, 0xffd04a, 0x8a2a8a][k % 5]))); }
  for (let k = 0; k < 6; k++) { const x = -1.6 + k * 0.64, z = 1.3 + (k % 2) * 0.3; parts.push(paint(cyl(0.12, 0.12, 0.5 + (k % 3) * 0.2, 8, x, 0.3, z), rgb(0xf2ead8))); }
  const g = merge(parts); g.computeVertexNormals(); return g;
}

// ---------- the helicopter ----------
function heliBody() {
  const parts = [];
  const f = new THREE.SphereGeometry(1, 16, 12); f.scale(1.25, 1.2, 2.4); f.translate(0, 1.6, 0.4); parts.push(paint(f, rgb(0x14182a)));
  const w = new THREE.SphereGeometry(1, 12, 8, 0, TAU, 0, Math.PI / 2.2); w.scale(1.05, 0.9, 1.4); w.rotateX(Math.PI / 2.4); w.translate(0, 1.85, 1.9); parts.push(paint(w, rgb(0x3a5a7a)));
  const boom = cyl(0.22, 0.42, 6.5, 8, 0, 0, 0); boom.rotateX(Math.PI / 2); boom.translate(0, 2.0, -4.6); parts.push(paint(boom, rgb(0x14182a)));
  parts.push(paint(box(0.12, 1.5, 0.9, 0, 2.6, -7.6), rgb(0x14182a)));
  parts.push(paint(box(2.8, 0.1, 0.12, 0, 1.15, 0.4), rgb(0xf2f2f6)));
  for (const s of [-1, 1]) { parts.push(paint(box(0.1, 0.1, 3.6, s * 1.05, 0.05, 0.3), rgb(0x2a2a30))); for (const z of [-0.6, 1.2]) parts.push(paint(box(0.08, 0.6, 0.08, s * 0.95, 0.35, z), rgb(0x2a2a30))); }
  parts.push(paint(cyl(0.3, 0.3, 0.6, 10, 0, 3.0, 0.3), rgb(0x2a2a30)));
  const g = merge(parts); g.computeVertexNormals(); return g;
}
function heliRotor() { const parts = [paint(box(11.5, 0.06, 0.34, 0, 3.32, 0.3), rgb(0x1a1a20)), paint(box(0.34, 0.06, 11.5, 0, 3.33, 0.3), rgb(0x1a1a20))]; return merge(parts); }

// ---------- the freeway under the jump ----------
function freeway() {
  const parts = [];
  parts.push(paint(box(420, 1.2, 34, 0, -0.6, 0), rgb(0x2a2830)));
  for (let x = -200; x <= 200; x += 25) for (const z of [-10, 10]) parts.push(paint(box(2.4, 12, 2.4, x, -7.2, z), rgb(0x4a4850)));
  for (let x = -200; x <= 200; x += 25) parts.push(paint(box(2.6, 1.6, 30, x, -2, 0), rgb(0x3a3840)));
  for (const z of [-17.2, 17.2]) parts.push(paint(box(420, 1.1, 0.5, 0, 0.55, z), rgb(0x8a8890)));
  parts.push(paint(box(420, 0.9, 0.6, 0, 0.45, 0), rgb(0x8a8890)));
  for (const z of [-12.5, -8.5, -4.5, 4.5, 8.5, 12.5]) for (let x = -205; x < 210; x += 9) parts.push(paint(box(4.2, 0.02, 0.18, x, 0.02, z), rgb(0xd8d4c8)));
  for (const z of [-1.4, 1.4]) parts.push(paint(box(420, 0.02, 0.18, 0, 0.02, z), rgb(0xffc21a)));
  const g = merge(parts); g.computeVertexNormals(); return g;
}

// ---------- registered with the scenery ----------
extend({
  layers: {
    kcCar: (M) => [sedan(0), PV(M, 'kcPaint', { roughness: 0.32, metalness: 0.35, emissive: 0x0a0a0e, lit: 0.34 }), 90, TT],
    kcCrushed: (M) => [sedan(1, 7), PV(M, 'kcPaint', { roughness: 0.32, metalness: 0.35, emissive: 0x0a0a0e, lit: 0.34 }), 40, TT],
    kcCop: (M) => [cruiser(), VC(M, 'kcVC', { roughness: 0.4, metalness: 0.25, emissive: 0x0a0a10, lit: 0.42 }), 48, {}],
    kcRamp: (M) => [ramp(), VC(M, 'kcVC', { roughness: 0.4, metalness: 0.25, emissive: 0x0a0a10, lit: 0.42 }), 4, {}],
    kcRock: (M) => [boulder(11), VC(M, 'kcRockM', { roughness: 0.95, metalness: 0, flatShading: true, emissive: 0x0a0806, lit: 0.36 }), 90, {}],
    kcHill: (M) => [hill(), VC(M, 'kcRockM', { roughness: 0.95, metalness: 0, flatShading: true, emissive: 0x0a0806, lit: 0.36 }), 3, {}],
    kcHorse: (M) => [sawhorse(), VC(M, 'kcVC', { roughness: 0.4, metalness: 0.25, emissive: 0x0a0a10, lit: 0.42 }), 30, {}],
    kcCone: (M) => [cone(), VC(M, 'kcVC', { roughness: 0.4, metalness: 0.25, emissive: 0x0a0a10, lit: 0.42 }), 60, {}],
    kcTape: (M) => [(() => { const g = new THREE.BoxGeometry(1, 0.12, 0.02); g.translate(0.5, 0, 0); return g; })(), M.kcTapeM || (M.kcTapeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd21a).multiplyScalar(1.3), side: THREE.DoubleSide })), 60, {}],
    kcLighter: (M) => [lighterBody(), VC(M, 'kcChrome', { roughness: 0.28, metalness: 0.55, emissive: 0x14161c, lit: 0.3 }), 2, {}],
    kcLid: (M) => [lighterLid(), VC(M, 'kcChrome', { roughness: 0.28, metalness: 0.55, emissive: 0x14161c, lit: 0.3 }), 2, {}],
    kcShard: (M) => [shard(), M.kcGlassM || (M.kcGlassM = fogged(new THREE.MeshStandardMaterial({ color: 0xd8ecff, roughness: 0.05, metalness: 0.6, emissive: 0x5a7a9a, transparent: true, opacity: 0.8, side: THREE.DoubleSide }), 'Glass')), 400, {}],
    kcPane: (M) => [pane(), M.kcPaneM || (M.kcPaneM = fogged(new THREE.MeshStandardMaterial({ color: 0x9ab8d8, roughness: 0.05, metalness: 0.7, emissive: 0x24384a, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), 'Pane')), 4, {}],
    kcDry: (M) => [drywallFrame(), VC(M, 'kcBrick', { roughness: 0.9, metalness: 0, emissive: 0x0a0505, lit: 0.4 }), 2, {}],
    kcDryFace: (M) => [drywallFace(), M.kcDryM || (M.kcDryM = fogged(new THREE.MeshStandardMaterial({ map: (DRY_TEX = DRY_TEX || drywallTexture()), emissiveMap: DRY_TEX, emissive: 0xffe8c8, emissiveIntensity: 0.45, roughness: 0.9 }), 'Dry')), 2, {}],
    kcBottle: (M) => [bottle(), VC(M, 'kcAmber', { roughness: 0.15, metalness: 0.2, emissive: 0x6a2a04, transparent: true, opacity: 0.92 }), 2, {}],
    kcTangle: (M) => [tangle(), VC(M, 'kcSteel', { roughness: 0.45, metalness: 0.3, emissive: 0x0c0c10, lit: 0.48 }), 2, {}],
    kcWarnPost: (M) => [warnPost(), VC(M, 'kcVC', { roughness: 0.4, metalness: 0.25, emissive: 0x0a0a10, lit: 0.42 }), 40, {}],
    kcWarnFace: (M) => [warnFace(), M.kcWarnM || (M.kcWarnM = warnMaterial()), 40, { aCell: 2 }],
    kcCross: (M) => [memorial(), VC(M, 'kcMatte', { roughness: 0.8, metalness: 0, emissive: 0x1a1816, lit: 0.5 }), 2, {}],
    kcHeli: (M) => [heliBody(), VC(M, 'kcVC', { roughness: 0.4, metalness: 0.25, emissive: 0x0a0a10, lit: 0.42 }), 2, {}],
    kcRotor: (M) => [heliRotor(), VC(M, 'kcVC', { roughness: 0.4, metalness: 0.25, emissive: 0x0a0a10, lit: 0.42 }), 2, {}],
    kcFreeway: (M) => [freeway(), VC(M, 'kcRoadM', { roughness: 0.85, metalness: 0, emissive: 0x0a0a0e, lit: 0.3 }), 2, {}],
  },
  parts: {
    kcWreck(S, it, p, q, yaw) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.kcCrushed.add(m, { aTint: it.tint });
      // hazards going, the headlights still on and pointing the wrong way
      const on = Math.sin((S.tNow ?? 0) * TAU * 1.1 + it.seed * 9) > 0 ? 1 : 0, c = Math.cos(yaw), s = Math.sin(yaw);
      const at = (lx, ly, lz) => [p.x + lx * c + lz * s, p.y + ly, p.z - lx * s + lz * c];
      for (const [x, z] of [[0.75, 2.0], [-0.75, 2.0], [0.75, -2.3], [-0.75, -2.3]]) { const w = at(x, 0.7, z); glowAt(S, w[0], w[1], w[2], 1.5, [1, 0.55, 0.1], 2.2 * on); }
      const h = at(0.5, 0.7, 2.3); glowAt(S, h[0], h[1], h[2], 3.0, [1, 0.95, 0.85], 1.6);
      poolAt(S, p.x, p.y + 0.05, p.z, 11, [1, 0.5, 0.12], 0.25 + 0.5 * on);
      if (it.burn) {
        const T = S.tNow ?? 0;
        for (let k = 0; k < 5; k++) { const f = 0.6 + 0.4 * Math.sin(T * (17 + k * 3) + k * 2.1); const w = at((k - 2) * 0.3, 1.0 + k * 0.35 + 0.2 * Math.sin(T * 9 + k), 1.6 - k * 0.1); glowAt(S, w[0], w[1], w[2], 2.4 - k * 0.25, [1, 0.42 + k * 0.06, 0.08], 1.6 * f); }
        poolAt(S, p.x, p.y + 0.06, p.z, 18, [1, 0.45, 0.1], 0.6);
      }
    },
    kcParkedCop(S, it, p, q, yaw) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.kcCop.add(m);
      const c = Math.cos(yaw), s = Math.sin(yaw);
      for (const [x, mode, colr] of [[0.33, 2, [1, 0.06, 0.1]], [-0.33, 3, [0.12, 0.3, 1]]]) glowAt(S, p.x + x * c + -0.3 * s, p.y + 1.55, p.z - x * s + -0.3 * c, 2.4, colr, 2.6, mode);
      poolAt(S, p.x, p.y + 0.05, p.z, 14, [0.6, 0.15, 0.6], 0.45);
    },
    kcHorse(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1.4, 1.4, 1.4)); S.layers.kcHorse.add(m); if (it.lamp) glowAt(S, p.x, p.y + 1.7, p.z, 1.0, [1, 0.6, 0.1], 2.0, 1); },
    kcCone(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1.3, 1.3, 1.3)); S.layers.kcCone.add(m); },
    // tape strung between two points along the road (it.len metres, turned by it.rot)
    kcTape(S, it, p, q) { const m = S._m; p.y = 1.1 + (it.h || 0); m.compose(p, q, S._s.set(it.len, 1, 1)); S.layers.kcTape.add(m); },
    kcHill(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s ?? 1, it.sy ?? 1, it.s ?? 1)); S.layers.kcHill.add(m); },
    kcRamp(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.kcRamp.add(m); for (const s of [-1, 1]) { const w = S._o.set(p.x, p.y + 3.6, p.z); glowAt(S, w.x, w.y, w.z, 2, [1, 0.8, 0.3], 0.6 * (s > 0 ? 1 : 0.6)); } },
    kcDry(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.kcDry.add(m); S.layers.kcDryFace.add(m);
      // a bare bulb hanging in the hole
      glowAt(S, p.x, p.y + 19 * s, p.z, 3.5, [1, 0.85, 0.6], 1.3); glowAt(S, p.x, p.y + 12 * s, p.z, 26 * s, [1, 0.8, 0.55], 0.18);
    },
    kcBottle(S, it, p, q) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.kcBottle.add(m);
      const k = 0.7 + 0.5 * (S.beat || 0);
      glowAt(S, p.x, p.y + 6 * s, p.z, 16 * s, [1, 0.55, 0.12], 0.5 * k); glowAt(S, p.x, p.y + 14 * s, p.z, 8 * s, [1, 0.62, 0.2], 0.4 * k);
    },
    kcTangle(S, it, p, q, yaw) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.kcTangle.add(m);
      // crushed cars caught in it, their hazards still going
      const T = S.tNow ?? 0, on = Math.sin(T * TAU * 1.2) > 0 ? 1 : 0, c = Math.cos(yaw), s = Math.sin(yaw);
      for (const [lx, ly, lz, ry, rz, tint] of [[-20, 14, 1, 0.6, 0.9, [0.9, 0.2, 0.3]], [8, 21, -1, -0.4, -0.3, [0.25, 0.4, 0.9]], [24, 10, 2, 1.9, -1.1, [0.95, 0.9, 0.85]]]) {
        const w = S._o.set(p.x + lx * c + lz * s, p.y + ly, p.z - lx * s + lz * c);
        S._e.set(0.3, yaw + ry, rz); const cq = (S._qcc || (S._qcc = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(w, cq, S._s.set(1.6, 1.6, 1.6)); S.layers.kcCrushed.add(m, { aTint: tint });
        glowAt(S, w.x, w.y + 0.8, w.z, 2.2, [1, 0.55, 0.1], 2.0 * on);
      }
    },
    kcWarn(S, it, p, q) {
      const m = S._m, s = it.s ?? 1; m.compose(p, faceRoadQ(S, it), S._s.set(s, s, s)); S.layers.kcWarnPost.add(m); S.layers.kcWarnFace.add(m, { aCell: [it.cell % 2, 1 - (it.cell >> 1)] });
      glowAt(S, p.x, p.y + 7.9 * s, p.z, 1.6 * s, [1, 0.7, 0.1], 2.4, 4);
    },
    kcCross(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1; m.compose(p, faceRoadQ(S, it), S._s.set(s, s, s)); S.layers.kcCross.add(m);
      const T = S.tNow ?? 0, fy = S.course.sample(it.t).yaw + Math.PI + (it.x > 0 ? -0.5 : 0.5);
      for (let k = 0; k < 6; k++) { const w = local(p, fy, (-1.6 + k * 0.64) * s, (0.7 + (k % 3) * 0.2) * s, (1.3 + (k % 2) * 0.3) * s, S._o); const f = 0.75 + 0.25 * Math.sin(T * 11 + k * 1.9); glowAt(S, w.x, w.y, w.z, 0.8 * s, [1, 0.7, 0.35], 1.6 * f); }
      poolAt(S, p.x, p.y + 0.05, p.z, 9 * s, [1, 0.62, 0.3], 0.7);
      glowAt(S, p.x, p.y + 4.5 * s, p.z, 7 * s, [1, 0.9, 0.8], 0.25);
    },
    kcFreeway(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.kcFreeway.add(m); },
  },
  kits: {
    // a wreck on the shoulder (or several), hazards going; burn: flames under the hood
    kcWrecks(S, z) { for (const w of z.at) S.items.push({ t: w[0], x: w[1], rot: w[2] ?? 0.4, parts: 'kcWreck', tint: col(w[3] ?? 0xd8d0e0), seed: Math.random(), burn: z.burn, ahead: 30 }); },
    // the bomb threat: black-and-whites across a side street, sawhorses, cones, the tape
    kcCops(S, z, R) {
      const side = z.side ?? 1, t = z.at, x0 = side * (z.x ?? 20);
      const dt = (d) => d / 42;    // metres along to song time, roughly, at her speed
      S.items.push({ t: t - dt(6), x: x0, rot: Math.PI / 2 + 0.6, parts: 'kcParkedCop', ahead: 34 });
      S.items.push({ t: t + dt(5), x: x0 + side * 3, rot: Math.PI / 2 - 0.8, parts: 'kcParkedCop', ahead: 34 });
      S.items.push({ t: t + dt(14), x: x0 + side * 9, rot: 0.2, parts: 'kcParkedCop', ahead: 34 });
      for (let k = 0; k < 5; k++) S.items.push({ t: t - dt(12) + dt(k * 6), x: x0 - side * 6, rot: 0, parts: 'kcHorse', lamp: k % 2 === 0, ahead: 34 });
      for (let k = 0; k < 9; k++) S.items.push({ t: t - dt(16) + dt(k * 4), x: x0 - side * (9 + (k % 2) * 0.8), rot: 0, parts: 'kcCone', ahead: 30 });
      for (let k = 0; k < 3; k++) S.items.push({ t: t - dt(14) + dt(k * 10), x: x0 - side * 5, rot: Math.PI / 2, len: 9, h: k % 2 ? 0.3 : 0, parts: 'kcTape', ahead: 30 });
    },
    // the hill that comes down (the rocks are the world's: they move)
    kcHill(S, z) { const x = z.x ?? -78; S.items.push({ t: z.at, x, rot: x < 0 ? Math.PI : 0, s: z.s ?? 1, sy: z.sy ?? 1, parts: 'kcHill' }); },
    // the ramp's high end faces the road; its lip is 4 m in from where it stands
    kcRamp(S, z) { S.items.push({ t: z.at, x: z.x, rot: z.x > 0 ? Math.PI / 2 : -Math.PI / 2, parts: 'kcRamp', ahead: 30 }); },
    // the lighter's building (the lighter itself is the world's: it flips open)
    kcLighterBlock(S, z) { S.items.push({ t: z.at, x: z.x, rot: z.x > 0 ? Math.PI / 2 : -Math.PI / 2, s: 1.1, sy: z.sy ?? 0.9, parts: 'block', tint: col(0x7a7090), seed: 0.3, wake0: 0.5, noShop: false }); },
    // the hole faces her as she comes, turned a little to the road
    kcDrywall(S, z) { S.items.push({ t: z.at, x: z.x, rot: Math.PI + (z.x > 0 ? -0.6 : 0.6), s: z.s ?? 1, parts: 'kcDry', ahead: 30 }); },
    kcWhiskey(S, z) {
      S.items.push({ t: z.at, x: z.x, rot: z.x > 0 ? Math.PI / 2 : -Math.PI / 2, s: 1, parts: 'shop', tint: col(0x5a4a6a), seed: 0.4, idx: S.atlas.index.LIQUOR, wake0: 0.9 });
      S.items.push({ t: z.at + 0.02, x: z.x + (z.x > 0 ? 4 : -4), h: 5, rot: 0, s: z.s ?? 1.1, parts: 'kcBottle', ahead: 34 });   // on the shop's roof
    },
    kcTangle(S, z) { S.items.push({ t: z.at, x: 0, rot: Math.PI / 2, parts: 'kcTangle', ahead: 30 }); },
    // the shop whose window goes on "break": its front where the pane stands
    kcShopFront(S, z) { const sd = z.x > 0 ? 1 : -1, sc = z.s ?? 1; S.items.push({ t: z.at, x: z.x + sd * 5.2 * sc, rot: sd > 0 ? Math.PI / 2 : -Math.PI / 2, s: sc, parts: 'shop', tint: col(z.tint ?? 0xf6c1d9), seed: 0.7, idx: S.atlas.index[z.sign ?? 'FLOWERS'], wake0: 1 }); },
    kcWarnings(S, z) { let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 0.5) { const side = k % 2 ? -1 : 1; S.items.push({ t, x: side * (z.x ?? 14), s: z.s ?? 1.5, cell: z.cells ? z.cells[k % z.cells.length] : k % 4, parts: 'kcWarn', ahead: 26 }); k++; } },
    kcCross(S, z) { S.items.push({ t: z.at, x: z.x ?? 15, s: z.s ?? 1.6, parts: 'kcCross', ahead: 30 }); },
    kcFreeway(S, z) { S.items.push({ t: z.at, x: 0, h: z.h ?? 5, rot: 0, parts: 'kcFreeway' }); },
    // a canyon of lit signs either side, on poles as tall as the road is high
    kcNeon(S, z, R) {
      const keys = z.signs || ['HOTEL', 'BAR', 'KISS', 'OPEN', 'DINER', 'LIQUOR', 'DANCING', 'LIVETONIGHT', 'CHAPEL', 'ER', 'TOWING', 'BODYSHOP'];
      let k = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.28) {
        const side = k++ % 2 ? 1 : -1;
        S.items.push({ t: t + R() * 0.08, x: side * ((z.x ?? 19) + R() * 3), s: (z.s ?? 1.3) * (0.85 + R() * 0.35), parts: 'sign', idx: S.atlas.index[keys[Math.floor(R() * keys.length)]], seed: R(), wake0: 1, keepLit: true });
      }
    },
    // black-and-whites pulled over all along the shoulders, lights going
    // (onRibbon: pulled over on the edges of her road itself, up where she is)
    kcCopRow(S, z, R) {
      let k = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.55) {
        const side = k++ % 2 ? 1 : -1;
        if (z.onRibbon) { const c = S.course.sample(t); S.items.push({ t, x: side * (c.width - 1.6), h: c.y + 0.02, abs: true, rot: side * (0.25 + R() * 0.35), parts: 'kcParkedCop', ahead: 30 }); }
        else S.items.push({ t, x: side * ((z.x ?? 20) + R() * 2), rot: side * (0.5 + R() * 0.8), parts: 'kcParkedCop', ahead: 30 });
      }
    },
  },
});

// turned to the rider coming up the road, a little toward the road
function faceRoadQ(S, it) {
  const h = S.course.sample(it.t).yaw;
  S._e.set(0, h + Math.PI + (it.x > 0 ? -0.5 : 0.5), 0);
  return (S._qcf || (S._qcf = new THREE.Quaternion())).setFromEuler(S._e);
}

// ---------- the world: what moves ----------
// the helicopter's searchlight: a cone, bright at the lamp, gone by the ground
const BEAM_VS = `varying float vL; varying vec3 vN; varying vec3 vV; varying vec3 vA; void main(){ vL = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); vA = normalize(normalMatrix * vec3(0.0, 1.0, 0.0)); gl_Position = projectionMatrix * mv; }`;
const BEAM_FS = `uniform vec3 uC; uniform float uK; varying float vL; varying vec3 vN; varying vec3 vV; varying vec3 vA;
void main(){ vec3 V = normalize(vV); float f = abs(dot(normalize(vN), V)); float end = 1.0 - smoothstep(0.55, 0.92, abs(dot(normalize(vA), V)));
  float a = pow(f, 2.0) * pow(max(1.0 - vL, 0.0), 1.4) * smoothstep(0.0, 0.03, vL) * uK * end; a = (a == a) ? clamp(a, 0.0, 4.0) : 0.0; gl_FragColor = vec4(uC * a, 1.0); }`;

export class CrashWorld {
  constructor(scene, S) {
    this.S = S;
    const cfg = (S.plan && S.plan.crash) || {};
    this.cfg = cfg;
    // the ground comes up under her, so the town is round her and not far down below:
    // everything the scenery placed stands on it (its heights become heights above it)
    const c = S.course;
    prepare(c, S.plan);
    this.gy = (t, x) => groundAt(c, t, x);
    this.terrain = new Terrain(scene, c, S.P, S.plan);
    const tu = this.terrain.mat.uniforms; tu.uPath.value = 0; tu.uLawn.value = 0; tu.uDry.value = 0; tu.uWood.value = 0;
    // the layers only draw() uses are made now, so the loading card compiles their shaders
    // (made on first use, the glass at the first crash stalled the ride while it compiled)
    if (S.town) for (const k of ['kcCrushed', 'kcCar', 'kcShard', 'kcRotor', 'kcRock', 'kcPane', 'kcLighter', 'kcLid', 'kcHeli']) void S.town.layers[k];
    if (S.town) {
      S.town.floorFn = this.gy;
      for (const r of S.town.roadMeshes) r.floorFn = this.gy;
      // the street lamps in a row either side: a warm pool each, not a row of floodlights
      for (const it of S.town.items) { if (!it.abs) it.h = (it.h || 0) + this.gy(it.t, it.x); if (it.wake0 !== undefined) it.wake0 = Math.max(it.wake0, cfg.wake ?? 0.7); if (it.parts === 'lamp') it.dim = (it.dim ?? 1) * (cfg.lampDim ?? 0.4); }
    }
    this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._m = new THREE.Matrix4(); this._s = new THREE.Vector3(1, 1, 1); this._o = new THREE.Vector3(); this._d = new THREE.Vector3();
    // rocks for each slide: where each starts on the hill, how big, when it lets go
    this.slides = (cfg.slides || []).map((sl, si) => {
      const R = seeded(31 + si * 7), rocks = [];
      for (let k = 0; k < (sl.n ?? 18); k++) rocks.push({ dz: (R() - 0.5) * 2.2, x0: -(44 + R() * 16), y0: 22 + R() * 12, x1: -(13 + R() * 10), r: 1.1 + R() * 2.2, delay: R() * 0.9, dur: 1.5 + R() * 0.8, bounces: 2 + Math.floor(R() * 3), spin: 0.6 + R(), car: k < (sl.cars ?? 0), tint: col([0xd84060, 0x5a8ad8, 0xe8e0d0, 0x3a3a44][k % 4]) });
      return { ...sl, rocks };
    });
    // glass from the shop windows, and from the crashes
    this.bursts = [];
    for (const sh of cfg.shatters || []) this.bursts.push(this._burst(sh.at, sh.t, sh.x, sh.s ?? 1, sh.n ?? 110, sh.x > 0 ? -1 : 1, 1));
    for (const mt of cfg.meets || []) { const b = this._burst(mt.at, mt.t, 0, 1, 80, 0, 2); b.ribbon = true; this.bursts.push(b); }
    // the searchlight
    if (cfg.heli) {
      const g = new THREE.CylinderGeometry(0.4, 7.5, 1, 20, 1, true); g.translate(0, -0.5, 0);
      { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); }
      this.beamMat = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(0xdfeaff) }, uK: { value: 0 } }, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      this.beam = new THREE.Mesh(g, this.beamMat); this.beam.frustumCulled = false; this.beam.visible = false;
      scene.add(this.beam);
    }
    this.heliPos = new THREE.Vector3(); this.heliOn = 0;
  }
  // a pane's worth of glass: each piece with its own way out
  _burst(at, t, x, h, n, dir, kind) {
    const R = seeded(Math.floor(at * 100)), pieces = [];
    for (let k = 0; k < n; k++) {
      const a = R() * TAU;
      const vx = kind === 1 ? dir * (6 + R() * 14) : Math.cos(a) * (4 + R() * 9);
      // h is the pane's scale for a window: its pieces start all over it
      pieces.push({ ox: kind === 1 ? (R() - 0.5) * 0.2 : 0, oz: kind === 1 ? (R() - 0.5) * 10 * h : (R() - 0.5) * 2, oy: kind === 1 ? (0.8 + R() * 5) * h : 0.8 + R() * 0.6, vx, vy: kind === 1 ? 3 + R() * 9 : 2 + R() * 7, vz: kind === 1 ? (R() - 0.5) * 7 : Math.sin(a) * (4 + R() * 9), spin: [R() * 9, R() * 9, R() * 9], s: kind === 1 ? (0.5 + R() * 1.0) * Math.sqrt(h) : 0.25 + R() * 0.4, glint: R() });
    }
    return { at, t, x, h, pieces, kind };
  }

  update(S, dt, camera) {
    FOG.uCcFog.value.set(S.P.fog); FOG.uCcFogD.value = S.P.fogDensity;
    this.view = S.view;
    this.terrain.update(S.track, S.rider, S.P, camera, 0);
    this.terrain.mat.uniforms.uWood.value = 0;
    // the wreck at the end stands on the ground too
    if (S.finale && !S.finale.groundFn) S.finale.groundFn = this.gy;
    // the helicopter hangs ahead and to the left of her as she climbs, its light on her
    const hc = this.cfg.heli, t = S.rider.t;
    if (hc && this.beam) {
      const on = smooth(hc.from, hc.from + 2, t) * (1 - smooth(hc.to - 1.5, hc.to, t));
      this.heliOn = on;
      this.beam.visible = on > 0.01;
      if (this.beam.visible) {
        const ta = t + 1.6, y = S.course.sample(ta).y;
        S.track.ground(ta, -26 + 4 * Math.sin(t * 0.6), this.heliPos); this.heliPos.y = y + 24 + 2 * Math.sin(t * 0.9);
        // aim at her, a little behind where she is, swinging as if it's hunting for her
        const r = S.view.root.position;
        const tgt = this._d.copy(r); tgt.y -= 0.6; tgt.x += Math.sin(t * 1.3) * 1.5 * (1 - on * 0.5); tgt.z += Math.cos(t * 1.1) * 1.5 * (1 - on * 0.5);
        const dir = this._o.copy(tgt).sub(this.heliPos); const len = dir.length();
        this.beam.position.copy(this.heliPos);
        this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
        this.beam.scale.set(1, len * 1.15, 1);
        this.beamMat.uniforms.uK.value = 0.55 * on;
      }
    }
  }

  // drawn each frame through the scenery's layers: the rocks, the stunts, the glass, the lighter
  draw(T) {
    const S = this.S, t = S.rider.t, cfg = this.cfg, m = this._m, q = this._q, e = this._e, s = this._s, p = this._p;
    const L = T.layers;
    // ---- the slides: rocks (and cars, the second time) come down the hill on the beat ----
    for (const sl of this.slides) {
      if (t < sl.at - 8 || t > sl.at + 14) continue;
      const yaw = S.course.sample(sl.t).yaw;
      for (const r of sl.rocks) {
        const u = clamp((t - sl.at - r.delay) / r.dur, 0, 1), eu = u * u * (3 - 2 * u) * 0.35 + u * 0.65;
        const x = r.x0 + (r.x1 - r.x0) * eu;
        const slopeY = r.y0 * (1 - eu) + r.r * 0.8 * eu;
        const bounce = Math.abs(Math.sin(u * Math.PI * r.bounces)) * (1 - u) * 3.5;
        S.track.ground(sl.t + r.dz, x, p); p.y = this.gy(sl.t + r.dz, x) + slopeY + bounce + r.r * 0.7;
        const roll = (x - r.x0) / r.r * r.spin;
        e.set(roll * 0.4, yaw + r.dz * 3, roll); q.setFromEuler(e);
        if (r.car) { m.compose(p, q, s.set(1.4, 1.4, 1.4)); L.kcCrushed.add(m, { aTint: r.tint }); }
        else { m.compose(p, q, s.set(r.r, r.r, r.r)); L.kcRock.add(m); }
        // dust where it lands, while it's moving
        if (u > 0.05 && u < 1) T.glow(p.x, p.y - r.r * 0.6, p.z, 4 + r.r * 2, [0.55, 0.42, 0.32], 0.12 * (1 - u));
      }
    }
    // ---- two cars meet head-on on her road, on the beat ----
    // one comes down it the wrong way, at her; one goes her way ahead of her, slower. They meet
    // a second or so ahead of her, spin off the sides and drop to the street, burning, before she
    // gets there.
    for (const mt of cfg.meets || []) {
      if (t < mt.at - 6 || t > mt.at + 12) continue;
      const d = t - mt.at, spd = S.track.speedAt(mt.t), hl = 2.45 * 1.3 / spd;
      const kW = mt.kW ?? 0.45, kF = mt.kF ?? 0.3;
      const sw = S.course.sample(mt.t).width ?? 7.5;
      for (const who of [1, -1]) {
        let tc, x = 0, y, spin = 0, roll = 0, crushed = d >= 0;
        if (d < 0) { tc = mt.t + who * (hl - d * (who > 0 ? kW : kF)); y = S.course.sample(tc).y + 0.05; }
        else {
          // thrown sideways off the ribbon, turning; over the edge they fall to the street
          const side = who > 0 ? -1 : 1, u = Math.min(1, d / 0.55), e3 = 1 - Math.pow(1 - u, 3);
          tc = mt.t + who * (hl + 0.05 * e3);
          x = side * (sw + 6) * e3;
          spin = side * 2.2 * e3; roll = side * 0.6 * Math.min(1, d * 1.5);
          const ry = S.course.sample(tc).y, gy = this.gy(tc, x);
          const off = Math.max(0, Math.abs(x) - sw - 1);
          const tf = d - 0.42;
          y = off > 0 && tf > 0 ? Math.max(gy, ry - 9.8 * tf * tf * 1.6) : ry + 0.05 + Math.sin(Math.min(1, d * 3) * Math.PI) * 0.8;
          if (y <= gy + 0.01) roll = side * 0.25;
        }
        S.track.ground(tc, x, p); p.y = y;
        const yaw = S.course.sample(tc).yaw;
        const head = yaw + (who > 0 ? Math.PI : 0) + spin;
        e.set(0, head, roll); q.setFromEuler(e);
        m.compose(p, q, s.set(1.3, 1.3, 1.3));
        (crushed ? L.kcCrushed : L.kcCar).add(m, { aTint: col(who > 0 ? (mt.a ?? 0xff2f86) : (mt.b ?? 0xa9dcff)) });
        const fx = Math.sin(head), fz = Math.cos(head);
        for (const sd of [-0.75, 0.75]) T.glow(p.x + fx * 3.0 + fz * sd, p.y + 0.85, p.z + fz * 3.0 - fx * sd, 2.6, [1, 0.95, 0.85], crushed ? 0.7 : 2.2);
        T.glow(p.x - fx * 3.1, p.y + 0.9, p.z - fz * 3.1, 1.8, [1, 0.08, 0.1], 1.4);
        if (!crushed) T.pool(p.x + fx * 8, p.y + 0.08, p.z + fz * 8, 13, [1, 0.92, 0.75], 0.8);
        // down on the street: on fire
        if (crushed && d > 0.7) {
          const T0 = S.tNow ?? t;
          for (let j = 0; j < 5; j++) { const f = 0.6 + 0.4 * Math.sin(T0 * (15 + j * 3) + j + who); T.glow(p.x + Math.sin(j * 2.1) * 0.8, p.y + 1.2 + j * 0.6, p.z + Math.cos(j * 1.7) * 0.8, 3.2 - j * 0.35, [1, 0.45 + j * 0.06, 0.08], 1.8 * f); }
          T.pool(p.x, p.y + 0.07, p.z, 22, [1, 0.45, 0.1], 0.8);
        }
      }
      // the hit, where they met: a white flash, then sparks out from it over her road
      if (d > -0.05 && d < 1.1) {
        S.track.ground(mt.t, 0, p); const ry = S.course.sample(mt.t).y;
        const k = 1 - d / 1.1;
        T.glow(p.x, ry + 1.6, p.z, 22 * (0.35 + k), [1, 0.86, 0.62], 2.6 * k * k);
        for (let j = 0; j < 36; j++) { const a = j * 2.39996, r = d * (14 + (j % 5) * 4); T.glow(p.x + Math.cos(a) * r, ry + 1 + Math.abs(Math.sin(a * 3)) * r * 0.8 - d * d * 7, p.z + Math.sin(a) * r, 1.1, [1, 0.6 + 0.3 * (j % 2), 0.2], 2.8 * k); }
        T.pool(p.x, ry + 0.1, p.z, 34, [1, 0.6, 0.3], 1.1 * k);
      }
    }
    // ---- a car off a ramp, rolling over her on "break my neck" ----
    for (const f of cfg.flips || []) {
      if (t < f.at - 6 || t > f.at + 6) continue;
      const yaw = S.course.sample(f.t).yaw, dur = f.dur ?? 1.4, t0 = f.at - dur / 2;
      const u = (t - t0) / dur;
      let x, y, roll = 0, pitch = 0;
      const gy = 3.2;     // the ramp's lip
      if (u < 0) { x = f.x0 + (f.x0 > 0 ? 1 : -1) * (-u) * dur * 30; y = gy * clamp(1 + u * 3, 0, 1); }
      else if (u <= 1) { x = f.x0 + (f.x1 - f.x0) * u; y = gy + (f.peak ?? 22) * 4 * u * (1 - u) - gy * u * u; roll = (f.turns ?? 1.5) * TAU * u; pitch = 0.25 * Math.sin(u * Math.PI); }
      else { const k = 1 - Math.exp(-(u - 1) * dur * 2.5); x = f.x1 + (f.x1 - f.x0 > 0 ? 1 : -1) * 9 * k; y = 0; roll = (f.turns ?? 1.5) * TAU; }
      S.track.ground(f.t, x, p); const fg = this.gy(f.t, x); p.y = fg + y;
      const head = yaw + (f.x1 < f.x0 ? Math.PI / 2 : -Math.PI / 2);
      e.set(pitch, head, roll); q.setFromEuler(e);
      m.compose(p, q, s.set(1.3, 1.3, 1.3));
      (u > 1 ? L.kcCrushed : L.kcCar).add(m, { aTint: col(f.tint ?? 0xffd04a) });
      if (u > 0 && u < 1) for (let j = 1; j < 8; j++) { const uj = u - j * 0.025; if (uj < 0) break; const xj = f.x0 + (f.x1 - f.x0) * uj; S.track.ground(f.t, xj, this._d); T.glow(this._d.x, this.gy(f.t, xj) + 3.2 + (f.peak ?? 22) * 4 * uj * (1 - uj) - 3.2 * uj * uj, this._d.z, 1.4 - j * 0.12, [1, 0.7, 0.3], 1.8 * (1 - j / 8)); }
      const fx = Math.sin(head), fz = Math.cos(head);
      // headlights small enough not to swallow it; its paint lit from below by the street
      for (const sd of [-0.7, 0.7]) T.glow(p.x + fx * 3 + fz * sd, p.y + 0.8, p.z + fz * 3 - fx * sd, 1.4, [1, 0.95, 0.85], 0.9);
      T.glow(p.x - fx * 3, p.y + 0.8, p.z - fz * 3, 1.4, [1, 0.1, 0.1], 0.9);
      if (u > 1 && u < 1.6) { const k = 1 - (u - 1) / 0.6; T.glow(p.x, fg + 1, p.z, 10, [1, 0.75, 0.4], 1.6 * k); for (let j = 0; j < 12; j++) T.glow(p.x - fx * j * 0.8, fg + 0.4, p.z - fz * j * 0.8, 1.0, [1, 0.6, 0.2], 2 * k * (1 - j / 12)); }
    }
    // ---- glass: the shop windows on "break", the windscreens on "crash" ----
    for (const b of this.bursts) {
      const d = t - b.at;
      if (d < -8 || d > 5) continue;
      const yaw = S.course.sample(b.t).yaw, c = Math.cos(yaw), sn = Math.sin(yaw);
      S.track.ground(b.t, b.x, this._o); const bg = b.ribbon ? S.course.sample(b.t).y : this.gy(b.t, b.x); this._o.y = bg;
      if (b.kind === 1 && d < 0) {
        // the pane, whole, catching the light
        e.set(0, yaw + (b.x > 0 ? -Math.PI / 2 : Math.PI / 2), 0); q.setFromEuler(e);
        m.compose(this._o, q, s.set(b.h, b.h, b.h)); L.kcPane.add(m);
        continue;
      }
      if (d < 0) continue;
      for (const pc of b.pieces) {
        const lx = pc.ox + pc.vx * d, ly = pc.oy + pc.vy * d - 9.8 * d * d, lz = pc.oz + pc.vz * d;
        if (ly < 0.05) continue;
        // lx across the road (toward it is -x on the right), lz along
        p.set(this._o.x + (-c) * lx + sn * lz, bg + ly, this._o.z + sn * lx + c * lz);
        e.set(pc.spin[0] * d, pc.spin[1] * d, pc.spin[2] * d); q.setFromEuler(e);
        m.compose(p, q, s.set(pc.s, pc.s, pc.s)); L.kcShard.add(m);
        if (pc.glint > 0.7) T.glow(p.x, p.y, p.z, 0.7, [0.85, 0.95, 1], 1.8 * Math.max(0, 1 - d * 0.6) * (0.5 + 0.5 * Math.sin(d * 20 + pc.glint * 40)));
      }
    }
    // ---- the lighter: the lid flips open on "flipped", the flame on "dark" ----
    const lt = cfg.lighter;
    if (lt && t > lt.at - 30 && t < lt.at + 12) {
      const yaw = S.course.sample(lt.t).yaw;
      S.track.ground(lt.t, lt.x, p); p.y = this.gy(lt.t, lt.x) + lt.h;
      // its face to her as she comes up the road, a little toward the road
      const ly = yaw + Math.PI + (lt.x > 0 ? -0.6 : 0.6);
      e.set(0, ly, 0); q.setFromEuler(e);
      m.compose(p, q, s.set(lt.s ?? 1, lt.s ?? 1, lt.s ?? 1)); L.kcLighter.add(m);
      const open = smooth(lt.at, lt.at + 0.22, t), sc = lt.s ?? 1;
      // the lid on its hinge at the top right corner
      const hy = ly, hc = Math.cos(hy), hs = Math.sin(hy);
      const hx = 2.6 * sc;
      this._d.set(p.x + hx * hc, p.y + 8.2 * sc, p.z - hx * hs);
      e.set(0, hy, -open * 2.55); q.setFromEuler(e);
      m.compose(this._d, q, s.set(sc, sc, sc)); L.kcLid.add(m);
      // the flame: tall, wobbling, lighting the roof
      const fire = smooth(lt.at + 0.35, lt.at + 0.6, t) * (1 - smooth(lt.at + 9, lt.at + 10, t));
      if (fire > 0.01) {
        const T0 = S.tNow ?? t;
        for (let k = 0; k < 8; k++) {
          // a tall teardrop of flame: wide and white-gold at the wick, narrow and orange at its tip, licking
          const wob = Math.sin(T0 * (7 + k) + k) * 0.35 * k * 0.22;
          const fx = p.x + (-0.9 * sc) * hc + wob * hs * sc, fz = p.z - (-0.9 * sc) * hs + wob * hc * sc;
          const sz = (4.2 - Math.abs(k - 2) * 0.45) * sc;
          T.glow(fx, p.y + (11.8 + k * 1.15) * sc, fz, sz, [1, 0.62 + 0.04 * (3 - Math.min(3, k)), 0.18 + 0.02 * k], (2.2 - k * 0.2) * fire * (0.8 + 0.2 * Math.sin(T0 * 23 + k * 3)));
        }
        T.glow(p.x + (-0.9 * sc) * hc, p.y + 11.4 * sc, p.z - (-0.9 * sc) * hs, 1.1 * sc, [0.35, 0.55, 1], 1.6 * fire);
        T.glow(p.x, p.y + 12 * sc, p.z, 34 * sc, [1, 0.55, 0.18], 0.35 * fire);
        T.pool(p.x, p.y + 0.1, p.z, 30 * sc, [1, 0.6, 0.2], 0.9 * fire);
      }
    }
    // ---- the helicopter ----
    if (this.heliOn > 0.01) {
      const hp = this.heliPos, yaw = S.course.sample(t).yaw + Math.PI * 0.85;
      e.set(0.12, yaw, 0.05 * Math.sin(t)); q.setFromEuler(e);
      m.compose(hp, q, s.set(1.6, 1.6, 1.6)); L.kcHeli.add(m);
      e.set(0.12, yaw + t * 31, 0.05 * Math.sin(t)); q.setFromEuler(e);
      m.compose(hp, q, s.set(1.6, 1.6, 1.6)); L.kcRotor.add(m);
      const blink = Math.sin(t * TAU * 1.5) > 0.6 ? 1 : 0;
      T.glow(hp.x, hp.y - 0.4, hp.z, 3.2, [0.95, 0.97, 1], 2.2 * this.heliOn);
      T.glow(hp.x, hp.y + 2.4, hp.z, 1.6, [1, 0.1, 0.1], 2.4 * blink);
      // the light on her, on the road around her
      if (this.view) { const r = this.view.root.position; T.pool(r.x, r.y - 0.35, r.z, 9, [0.9, 0.95, 1], 0.9 * this.heliOn); }
    }
    // ---- the freeway under the jump: both ways, every lane ----
    const fw = cfg.freeway;
    if (fw && t > fw.t - 12 && t < fw.t + 6) {
      const yaw = S.course.sample(fw.t).yaw, c = Math.cos(yaw), sn = Math.sin(yaw);
      S.track.ground(fw.t, 0, this._o);
      const T0 = S.tNow ?? t, fgy = this.gy(fw.t, 0);
      for (const [lane, dir] of [[-14.5, 1], [-10.5, 1], [-6.5, 1], [-2.6, 1], [2.6, -1], [6.5, -1], [10.5, -1], [14.5, -1]]) {
        for (let k = 0; k < 9; k++) {
          const ph = ((T0 * (24 + (lane % 3) * 3) * dir / 400 + k / 9 + lane * 0.137) % 1 + 1) % 1;
          const along = -200 + 400 * ph;          // across the course, the freeway's length
          // the freeway runs across the road: its +along is the rider's right
          p.set(this._o.x + (-c) * along + sn * lane, fgy + (fw.h ?? 5), this._o.z + sn * along + c * lane);
          const head = yaw + (dir > 0 ? -Math.PI / 2 : Math.PI / 2);
          e.set(0, head, 0); q.setFromEuler(e);
          m.compose(p, q, s.set(1, 1, 1)); L.kcCar.add(m, { aTint: col([0xd8d0e0, 0x3a3a44, 0xff6a8a, 0x8ab8ff, 0xf2e2b0][(k + Math.abs(lane | 0)) % 5]) });
          const fx = Math.sin(head), fz = Math.cos(head);
          T.glow(p.x + fx * 2.4, p.y + 0.65, p.z + fz * 2.4, 3.2, [1, 0.94, 0.8], 2.0);
          T.glow(p.x - fx * 2.4, p.y + 0.7, p.z - fz * 2.4, 2.6, [1, 0.08, 0.1], 1.8);
        }
      }
      // sodium lamps along both edges
      const fh = fgy + (fw.h ?? 5);
      for (let k = -8; k <= 8; k++) for (const side of [-1, 1]) { const along = k * 25; p.set(this._o.x + (-c) * along + sn * side * 17, fh + 9, this._o.z + sn * along + c * side * 17); T.glow(p.x, p.y, p.z, 4.2, [1, 0.62, 0.25], 1.6); T.pool(p.x, fh + 0.05, p.z, 18, [1, 0.6, 0.25], 0.8); }
    }
  }
}
