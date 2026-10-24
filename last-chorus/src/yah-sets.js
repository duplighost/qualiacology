// You Are Here: the things on the way up, built from code and lit like the woods around them
// (yah-trees.js's material). The trailhead's map board, the fingerpost, the empty hammock, the
// building that is a church but isn't, the circle of stones, the footbridge that's out, the
// boulder he'd know, the arrows every which way, the bench looking at the view, the cabin with
// its door open, the rock, the spring, the cairns, the fire tower on the top, the register box,
// the trail signs that carry the words, the street at the bottom and the house at the end of it.
// Every object faces +z (its front) with its base at y = 0; trail.js turns and places it.

import * as THREE from 'three';
import { GB, yahRng, yahNoise, lin, boulder } from './yah-trees.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const K = { solid: 0, leaf: 1, stone: 2, petal: 3, lit: 4 };

// ---------- primitives into a builder ----------
function put(gb, geo, col, kind = K.solid, jit = 0.06, f = 3, sway = 0) {
  gb.add(geo, (p) => { const v = 1 + jit * (yahNoise(p.x * f + 1.3, p.y * f, p.z * f) - 0.5) * 2; return [col[0] * v, col[1] * v, col[2] * v, kind, typeof sway === 'function' ? sway(p) : sway]; });
}
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r1, r0, h, n); g.translate(x, y + h / 2, z); return g; };
// a stick from a to b
function stick(a, b, r, n = 6, r1 = r) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r, L, n, 1, false); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// a gable roof over w (x) by d (z), eaves at y0, ridge h above, along z
function gable(gb, w, d, y0, h, col, over = 0.5, th = 0.22) {
  const half = w / 2 + over, slope = Math.hypot(half, h), ang = Math.atan2(h, half);
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(slope, th, d + over * 2);
    g.rotateZ(s * ang); g.translate(-s * half / 2, y0 + h / 2 + th / 2, 0);
    put(gb, g, col, K.solid, 0.1, 1.4);
  }
}
// the triangle at a gable's end, in the wall's colour
function gableEnd(gb, w, y0, h, z, col) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false }); g.translate(0, y0, z - 0.1);
  put(gb, g, col, K.solid, 0.04);
}
// clapboard: a wall face of boards, each a little in the shadow of the one above
function clapboard(gb, w, h, x, y, z, ry, col, board = 0.26) {
  const g = new THREE.PlaneGeometry(w, h, 1, Math.max(1, Math.round(h / board) * 2));
  g.rotateY(ry); g.translate(x, y + h / 2, z);
  gb.add(g, (p) => { const f = ((p.y - y) / board) % 1; const v = f < 0.25 ? 0.82 : 1.0; return [col[0] * v, col[1] * v, col[2] * v, K.solid, 0]; });
}
// a window: frame, muntins, the glass lit from inside (kind lit) or dark
function windowAt(gb, w, h, x, y, z, ry, lit, glassCol, trim = lin(0xf4f2ec), panes = [2, 3]) {
  const m = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);
  const g = new THREE.PlaneGeometry(w, h); g.applyMatrix4(m);
  put(gb, g, glassCol, lit ? K.lit : K.solid, 0.05);
  const add = (bw, bh, bx, by) => { const b = new THREE.BoxGeometry(bw, bh, 0.1); b.translate(bx, by, 0.04); b.applyMatrix4(m); put(gb, b, trim, K.solid, 0.02); };
  add(w + 0.24, 0.12, 0, h / 2 + 0.06); add(w + 0.3, 0.14, 0, -h / 2 - 0.07); add(0.12, h, -w / 2 - 0.06, 0); add(0.12, h, w / 2 + 0.06, 0);
  for (let i = 1; i < panes[0]; i++) add(0.04, h, -w / 2 + (w * i) / panes[0], 0);
  for (let i = 1; i < panes[1]; i++) add(w, 0.04, 0, -h / 2 + (h * i) / panes[1]);
}

// ---------- the trailhead's map board ----------
export function kiosk() {
  const gb = new GB();
  const wood = lin(0x6a4a2e), dark = lin(0x3e2a1a), roof = lin(0x3a4636);
  for (const x of [-2.35, 2.35]) put(gb, cyl(0.17, 0.15, 4.2, 8, x, 0, 0), wood, K.solid, 0.12, 6);
  put(gb, box(4.5, 2.7, 0.14, 0, 2.35, -0.05), dark, K.solid, 0.05);
  for (const [w, h, x, y] of [[4.7, 0.16, 0, 3.75], [4.7, 0.16, 0, 0.95], [0.16, 2.9, -2.27, 2.35], [0.16, 2.9, 2.27, 2.35]]) put(gb, box(w, h, 0.22, x, y, 0.02), wood, K.solid, 0.08);
  gable(gb, 5.4, 1.5, 4.0, 0.8, roof, 0.35, 0.12);
  put(gb, box(5.6, 0.2, 0.2, 0, 4.02, 0), dark);
  // a little shelf for the maps people take
  put(gb, box(1.2, 0.08, 0.35, 1.4, 1.0, 0.2), wood);
  return gb.build();
}
export function kioskFace() { const g = new THREE.PlaneGeometry(4.25, 2.45); g.translate(0, 2.35, 0.04); return g; }
// the map: the hill in contour lines, the brook, the trail in red dashes up to the top, and the dot
export function mapTexture() {
  const W = 1024, H = 590, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), R = yahRng(77);
  g.fillStyle = '#efe6cc'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(120,90,40,${0.03 + R() * 0.04})`; g.fillRect(R() * W, R() * H, 2, 2); }
  // the woods
  g.fillStyle = 'rgba(120,170,90,0.35)';
  for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(R() * W, 120 + R() * (H - 120), 50 + R() * 90, 30 + R() * 60, R() * 3, 0, Math.PI * 2); g.fill(); }
  // the hill in contours round the top
  const top = [770, 215];
  g.strokeStyle = 'rgba(150,100,50,0.75)';
  for (let k = 1; k <= 11; k++) {
    g.lineWidth = k % 5 ? 1.5 : 3; g.beginPath();
    for (let a = 0; a <= 64; a++) {
      const t = (a / 64) * Math.PI * 2, r = k * 30 * (1 + 0.18 * Math.sin(t * 3 + k * 0.7) + 0.08 * Math.sin(t * 7 + k));
      const x = top[0] + Math.cos(t) * r * 1.35, y = top[1] + Math.sin(t) * r * 0.85;
      if (a) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
  }
  // the brook
  g.strokeStyle = '#4a8ad0'; g.lineWidth = 5; g.beginPath(); g.moveTo(40, 300);
  for (let x = 40; x <= W; x += 30) g.lineTo(x, 300 + Math.sin(x * 0.012) * 50 + (x > 600 ? (x - 600) * 0.35 : 0));
  g.stroke();
  // the trail, in red dashes, from here to the top
  g.strokeStyle = '#d02828'; g.lineWidth = 7; g.setLineDash([16, 11]); g.beginPath();
  const path = [[170, 480], [250, 430], [300, 380], [380, 360], [430, 300], [520, 290], [560, 250], [640, 250], [700, 220], top];
  path.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.setLineDash([]);
  // the top
  g.fillStyle = '#3a2a1a'; g.beginPath(); g.moveTo(top[0], top[1] - 22); g.lineTo(top[0] - 18, top[1] + 10); g.lineTo(top[0] + 18, top[1] + 10); g.closePath(); g.fill();
  // the dot, and the words
  g.fillStyle = 'rgba(208,40,40,0.25)'; g.beginPath(); g.arc(170, 480, 46, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e02a2a'; g.beginPath(); g.arc(170, 480, 22, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(170, 480, 8, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1e3a24'; g.fillRect(0, 0, W, 112);
  g.font = '900 82px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#f6eed4'; g.fillText('YOU ARE HERE', W / 2, 60);
  g.fillStyle = '#e02a2a'; g.font = '900 34px "Arial Black", Impact, sans-serif'; g.textAlign = 'left'; g.fillText('◀ YOU ARE HERE', 210, 482);
  g.strokeStyle = '#3a2a1a'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
// a picture lit like everything else, fogged like everything else
export function pictureMaterial(tex) {
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: tex }, uLight: { value: new THREE.Color(1, 1, 1) }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.0013 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D uMap; uniform vec3 uLight, uFog, uCam; uniform float uFogDensity; varying vec2 vUv; varying vec3 vW;
      void main(){ vec3 c = texture2D(uMap, vUv).rgb; c = c * c * uLight; float d = length(uCam - vW); float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5)); gl_FragColor = vec4(mix(c, uFog, clamp(fog, 0.0, 1.0)), 1.0); }`,
  });
}

// ---------- a trail sign: two log posts, a routed board, a little roof (the words are the sign layer) ----------
export function trailSign() {
  const gb = new GB();
  const wood = lin(0x5e4026), dark = lin(0x2e1e10), roof = lin(0x3a3a30);
  // the posts run well down: a sign raised to stand over the trail still reaches the ground
  for (const x of [-2.75, 2.75]) put(gb, cyl(0.16, 0.14, 13.3, 8, x, -9.3, -0.05), wood, K.solid, 0.12, 6);
  put(gb, box(5.4, 1.8, 0.16, 0, 2.95, -0.1), dark, K.solid, 0.05);
  for (const [w, h, x, y] of [[5.6, 0.14, 0, 3.9], [5.6, 0.14, 0, 2.0], [0.14, 2.04, -2.73, 2.95], [0.14, 2.04, 2.73, 2.95]]) put(gb, box(w, h, 0.2, x, y, -0.04), wood, K.solid, 0.08);
  gable(gb, 6.0, 0.9, 4.0, 0.42, roof, 0.25, 0.1);
  return gb.build();
}
export function trailSignFace() { const g = new THREE.PlaneGeometry(5.2, 1.625); g.translate(0, 2.95, 0.0); return g; }

// ---------- the fingerpost where the trail meets the way out ----------
export function fingerpost() {
  const gb = new GB();
  const wood = lin(0x6a4a2e), dark = lin(0x3a2616);
  put(gb, box(0.24, 4.9, 0.24, 0, 2.45, 0), wood, K.solid, 0.1, 5);
  put(gb, cyl(0.05, 0.22, 0.3, 4, 0, 4.9, 0).rotateY(Math.PI / 4), dark);
  // two fingers, one up the trail (+z), one away to the side (-x); each a board with a point
  const finger = (y, ry, len) => {
    const s = new THREE.Shape(); s.moveTo(0, -0.38); s.lineTo(len, -0.38); s.lineTo(len + 0.45, 0); s.lineTo(len, 0.38); s.lineTo(0, 0.38); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false }); g.translate(0.1, 0, -0.04); g.rotateY(ry); g.translate(0, y, 0);
    put(gb, g, dark, K.solid, 0.05);
  };
  finger(4.1, -Math.PI / 2, 2.6);        // pointing up the trail
  finger(3.2, Math.PI, 2.6);             // pointing away
  return gb.build();
}
// the faces: [up the trail at 4.1 m, away at 3.2 m] as planes on each side of each finger
export function fingerFaces() {
  const out = [];
  for (const [y, ry] of [[4.1, -Math.PI / 2], [3.2, Math.PI]]) for (const s of [-1, 1]) {
    const g = new THREE.PlaneGeometry(2.4, 0.75);
    if (s < 0) g.rotateY(Math.PI);
    g.translate(1.45, 0, s * 0.05); g.rotateY(ry); g.translate(0, y, 0);
    out.push(g);
  }
  return out;
}

// ---------- the hammock nobody's in, along z between two trunks at z = +-2.9 ----------
export function hammock() {
  const gb = new GB();
  const rope = lin(0xd8ccb0), cloth = lin(0xc8502e), stripe = lin(0xf0e6d0);
  const sag = (z) => 1.25 - 0.62 * (1 - (z / 1.7) ** 2);
  // the ropes from the trunks to the ends
  for (const s of [-1, 1]) for (const dx of [-0.12, 0.12]) put(gb, stick(V(0, 1.95, s * 2.75), V(dx * 2.5, sag(s * 1.7) + 0.02, s * 1.7), 0.02, 4), rope, K.solid, 0, 1, (p) => 0.1);
  // the bed: a sheet hanging in a curve, its sides curling up
  const g = new THREE.PlaneGeometry(1.15, 3.4, 8, 16);
  g.rotateX(-Math.PI / 2);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i);
    const w = 1 - (z / 1.7) ** 2;
    P.setXYZ(i, x * (0.25 + 0.75 * Math.sqrt(Math.max(0, w))), sag(z) + 0.55 * (x / 0.575) ** 2 * w, z);
  }
  g.computeVertexNormals();
  gb.add(g, (p) => { const st = Math.abs(p.x) > 0.1 && Math.abs(p.x) < 0.18 ? 1 : 0; const c = st ? stripe : cloth; const v = 0.9 + 0.12 * yahNoise(p.z * 4, p.x * 9, 1); return [c[0] * v, c[1] * v, c[2] * v, K.solid, 0.18 * (1 - (p.z / 1.7) ** 2)]; });
  return gb.build();
}

// ---------- the building that's a church, but isn't: a white meeting house with a steeple,
// someone's washing on a line, a dish on the wall, a mailbox, two plastic chairs ----------
export function church() {
  const gb = new GB();
  const white = lin(0xf2efe6), roof = lin(0x3a3a40), stone = lin(0x7e7a72), glass = lin(0x2a3442), red = lin(0x8a1e1a);
  const W = 11, D = 20, H = 7.6, F = 0.9;
  put(gb, box(W + 0.5, F, D + 0.5, 0, F / 2, 0), stone, K.stone, 0.15, 2);
  clapboard(gb, D, H, W / 2, F, 0, Math.PI / 2, white);
  clapboard(gb, D, H, -W / 2, F, 0, -Math.PI / 2, white);
  clapboard(gb, W, H, 0, F, D / 2, 0, white);
  clapboard(gb, W, H, 0, F, -D / 2, Math.PI, white);
  for (const [x, z] of [[W / 2, D / 2], [-W / 2, D / 2], [W / 2, -D / 2], [-W / 2, -D / 2]]) put(gb, box(0.3, H, 0.3, x, F + H / 2, z), white);
  // the roof: its ridge along the length (z), the slopes falling to either side
  gable(gb, W, D, F + H, 4.6, roof, 0.45, 0.25);
  gableEnd(gb, W, F + H, 4.6, D / 2 + 0.02, white); gableEnd(gb, W, F + H, 4.6, -D / 2 - 0.02, white);
  // tall windows, four a side, with arched heads
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const z = -6.6 + i * 4.4;
    windowAt(gb, 1.3, 3.2, s * (W / 2 + 0.02), F + 3.6, z, s > 0 ? Math.PI / 2 : -Math.PI / 2, false, glass, white, [2, 4]);
    const arch = new THREE.CircleGeometry(0.65, 10, 0, Math.PI); arch.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2); arch.translate(s * (W / 2 + 0.03), F + 5.2, z); put(gb, arch, glass, K.solid, 0.02);
  }
  // the front (-z): double door, painted red, a fanlight, steps
  put(gb, box(2.2, 3.1, 0.12, 0, F + 1.55, -D / 2 - 0.06), red, K.solid, 0.05);
  put(gb, box(0.06, 3.1, 0.16, 0, F + 1.55, -D / 2 - 0.1), lin(0x4a0e0c));
  put(gb, box(2.8, 0.25, 0.4, 0, F + 3.3, -D / 2 - 0.2), white);
  for (let k = 0; k < 3; k++) put(gb, box(3.6 - k * 0.4, 0.3, 1.4 - k * 0.4, 0, 0.15 + k * 0.3, -D / 2 - 0.9 + k * 0.2), stone, K.stone, 0.1);
  // the steeple on the front of the roof: tower, belfry, spire, and on the top a rooster, not a cross
  const tz = -D / 2 + 2.2, ty = F + H;
  clapboard(gb, 3.8, 5.6, 0, ty, tz - 1.9, Math.PI, white); clapboard(gb, 3.8, 5.6, 0, ty, tz + 1.9, 0, white);
  clapboard(gb, 3.8, 5.6, 1.9, ty, tz, Math.PI / 2, white); clapboard(gb, 3.8, 5.6, -1.9, ty, tz, -Math.PI / 2, white);
  put(gb, box(4.2, 0.4, 4.2, 0, ty + 5.8, tz), white);
  for (const [x, z] of [[1.5, 1.5], [-1.5, 1.5], [1.5, -1.5], [-1.5, -1.5]]) put(gb, box(0.4, 3.0, 0.4, x, ty + 7.5, tz + z), white);
  put(gb, box(2.6, 2.4, 2.6, 0, ty + 7.3, tz), lin(0x1a1a20));
  put(gb, box(3.9, 0.4, 3.9, 0, ty + 9.2, tz), white);
  const sp = new THREE.ConeGeometry(2.0, 8.5, 8); sp.rotateY(Math.PI / 8); sp.translate(0, ty + 9.4 + 4.25, tz); put(gb, sp, white, K.solid, 0.03);
  put(gb, box(0.08, 1.6, 0.08, 0, ty + 18.6, tz), lin(0x2a2a2a));
  const vane = new THREE.Shape(); vane.moveTo(-0.6, 0); vane.lineTo(0.5, 0); vane.lineTo(0.7, 0.4); vane.lineTo(0.35, 0.3); vane.lineTo(0.3, 0.75); vane.lineTo(0.05, 0.9); vane.lineTo(-0.1, 0.55); vane.lineTo(-0.6, 0.65); vane.closePath();
  const vg = new THREE.ExtrudeGeometry(vane, { depth: 0.05, bevelEnabled: false }); vg.translate(0, ty + 19.2, tz); put(gb, vg, lin(0x2a2a2a));
  // a dish on the wall that faces the trail (+x)
  const dish = new THREE.SphereGeometry(0.75, 14, 6, 0, Math.PI * 2, 0, 0.7); dish.rotateZ(-Math.PI / 2 - 0.4); dish.translate(W / 2 + 0.9, F + 6.2, 3); put(gb, dish, lin(0xd8d8dc), K.solid, 0.03);
  put(gb, stick(V(W / 2 + 0.02, F + 6.0, 3), V(W / 2 + 0.7, F + 6.2, 3), 0.04), lin(0x8a8a90));
  // the washing line on the trail side, with the washing
  for (const z of [-5, 5]) { put(gb, box(0.12, 2.4, 0.12, W / 2 + 5, 1.2, z), lin(0x8a8a90)); put(gb, box(0.1, 0.1, 0.9, W / 2 + 5, 2.35, z), lin(0x8a8a90)); }
  put(gb, stick(V(W / 2 + 5, 2.33, -5), V(W / 2 + 5, 2.2, 5), 0.012, 3), lin(0xe8e8e8));
  const clothes = [[0xd83a3a, 0.8, 0.9], [0x3a6ad8, 1.0, 0.75], [0xf2f2ee, 1.3, 0.7], [0xe8c03a, 0.7, 0.85], [0x5aa86a, 0.9, 0.9], [0xf2f2ee, 0.8, 0.6]];
  let z = -4.2;
  for (const [c, w, h] of clothes) { const g = new THREE.PlaneGeometry(w, h, 2, 2); g.rotateY(Math.PI / 2); g.translate(W / 2 + 5, 2.25 - h / 2 - 0.05 * Math.sin(z), z + w / 2); put(gb, g, lin(c), K.solid, 0.06, 3, (p) => 0.25 * (2.25 - p.y)); z += w + 0.35; }
  // the mailbox out by the trail
  put(gb, box(0.12, 1.2, 0.12, W / 2 + 13, 0.6, -D / 2 - 1.5), lin(0x6a4a2e));
  put(gb, box(0.5, 0.42, 0.9, W / 2 + 13, 1.38, -D / 2 - 1.5), lin(0x1a1a1e));
  put(gb, box(0.05, 0.35, 0.12, W / 2 + 13.28, 1.65, -D / 2 - 1.3), lin(0xd82020));
  // two white plastic chairs on the grass
  for (const [x, z2, r] of [[W / 2 + 2.5, -D / 2 + 1.5, 0.4], [W / 2 + 3.6, -D / 2 + 0.6, -0.3]]) {
    const ch = new GB();
    put(ch, box(0.56, 0.06, 0.5, 0, 0.42, 0), lin(0xf4f4f0)); put(ch, box(0.56, 0.5, 0.06, 0, 0.7, -0.25), lin(0xf4f4f0));
    for (const [lx, lz] of [[-0.25, -0.22], [0.25, -0.22], [-0.25, 0.22], [0.25, 0.22]]) put(ch, box(0.05, 0.42, 0.05, lx, 0.21, lz), lin(0xf4f4f0));
    const cg = ch.build(); cg.rotateY(r); cg.translate(x, 0, z2); gb.add(cg, (p, n) => { const i = 0; return [0.92, 0.92, 0.9, K.solid, 0]; });
  }
  return gb.build();
}

// ---------- the circle of stones in the clearing: "start a cult" ----------
export function stoneCircle() {
  const gb = new GB();
  const R = yahRng(4242), n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (R() - 0.5) * 0.15, r = 6.5 + (R() - 0.5);
    const g = boulder(i % 3, false);
    const h = 2.6 + R() * 1.8;
    g.scale(0.55, h / 1.0, 0.32); g.rotateZ((R() - 0.5) * 0.12); g.rotateY(-a + Math.PI / 2); g.translate(Math.cos(a) * r, -0.2, Math.sin(a) * r);
    gb.add(g, (p, nn, idx) => { const c = g.attributes.color; return [c.getX(idx), c.getY(idx), c.getZ(idx), K.stone, 0]; });
  }
  const alt = boulder(4, true); alt.scale(1.3, 0.55, 0.9); gb.add(alt, (p, nn, idx) => { const c = alt.attributes.color; return [c.getX(idx), c.getY(idx), c.getZ(idx), K.stone, 0]; });
  return gb.build();
}

// ---------- the footbridge over the brook, out in the middle; it spans z from -L/2 to L/2 ----------
export function brokenBridge(L = 46, drop = 14, sides = [-1, 1]) {
  const gb = new GB();
  const wood = lin(0x6a5038), old = lin(0x4a3a2a), stone = lin(0x7a766e);
  for (const s of sides) {
    // the abutment, stone, at each rim
    put(gb, box(3.2, 3, 2.6, 0, -1.4, s * (L / 2 + 0.6)), stone, K.stone, 0.18, 1.5);
    // what's left of it each side: stringers, planks, a rail, the end hanging down into the gorge
    const reach = L * (s < 0 ? 0.33 : 0.27);
    for (const x of [-0.9, 0.9]) {
      put(gb, stick(V(x, 0.05, s * (L / 2)), V(x, -0.05, s * (L / 2 - reach)), 0.13, 6), old, K.solid, 0.1);
      put(gb, stick(V(x, -0.05, s * (L / 2 - reach)), V(x * 0.7, -drop * 0.35, s * (L / 2 - reach - 1.2)), 0.11, 6), old, K.solid, 0.1);
      put(gb, stick(V(x * 1.1, 0.05, s * (L / 2)), V(x * 1.1, 1.05, s * (L / 2)), 0.06, 5), wood);
      put(gb, stick(V(x * 1.1, 1.05, s * (L / 2)), V(x * 1.1, 0.9, s * (L / 2 - reach * 0.8)), 0.04, 4), wood);
    }
    for (let k = 0; k < Math.floor(reach / 0.55); k++) { const z = s * (L / 2 - 0.3 - k * 0.55); put(gb, box(2.2, 0.08, 0.42, 0, 0.17 - Math.abs(k * 0.004), z).rotateZ((k % 3 - 1) * 0.02), k % 4 ? wood : old, K.solid, 0.12, 4); }
    // two planks dangling from the break
    for (const x of [-0.5, 0.4]) put(gb, box(0.4, 2.2, 0.06, x, -1.1, s * (L / 2 - reach - 0.4)).rotateX(s * 0.2), old, K.solid, 0.1);
  }
  return gb.build();
}

// ---------- arrows painted every which way round a trunk: "I bluffed in the right direction" ----------
export function arrowShape(s = 1) {
  const sh = new THREE.Shape();
  sh.moveTo(-0.09 * s, -0.3 * s); sh.lineTo(0.09 * s, -0.3 * s); sh.lineTo(0.09 * s, 0.05 * s); sh.lineTo(0.22 * s, 0.05 * s); sh.lineTo(0, 0.32 * s); sh.lineTo(-0.22 * s, 0.05 * s); sh.lineTo(-0.09 * s, 0.05 * s); sh.closePath();
  return sh;
}
// one arrow, flat, facing +z, pointing up (+y)
export function blaze() {
  const gb = new GB();
  const g = new THREE.ExtrudeGeometry(arrowShape(1.4), { depth: 0.03, bevelEnabled: false });
  put(gb, g, lin(0xfff6e0), K.solid, 0.03);
  return gb.build();
}
export function bluffTrunk() {
  const gb = new GB();
  const bark = lin(0x5a4a3c);
  // a big trunk with its arrows round it at the height of the trail
  put(gb, cyl(0.85, 0.7, 9, 12, 0, -0.5, 0), bark, K.solid, 0.18, 2.5);
  const R = yahRng(99), cols = [0xfff4e0, 0xffd23a, 0xff5a3a, 0x5ab8ff, 0xfff4e0, 0x8aff8a].map(lin);
  for (let i = 0; i < 16; i++) {
    const a = -1.2 + (i % 8) * 0.34 + (R() - 0.5) * 0.15, y = 2.2 + Math.floor(i / 8) * 1.5 + (R() - 0.5) * 0.6;
    const g = new THREE.ExtrudeGeometry(arrowShape(0.9 + R() * 0.6), { depth: 0.02, bevelEnabled: false });
    g.rotateZ(R() * Math.PI * 2); g.translate(0, 0, 0.82); g.rotateY(a); g.translate(0, y, 0);
    put(gb, g, cols[i % cols.length], K.solid, 0.02);
  }
  return gb.build();
}

// ---------- the bench where he'd rest, facing out at the view (+z) ----------
export function bench() {
  const gb = new GB();
  const wood = lin(0x8a6440), iron = lin(0x22201e);
  for (let i = 0; i < 3; i++) put(gb, box(2.0, 0.05, 0.13, 0, 0.47, -0.2 + i * 0.16), wood, K.solid, 0.08);
  for (let i = 0; i < 3; i++) { const g = box(2.0, 0.12, 0.05, 0, 0.66 + i * 0.16, -0.36); g.rotateX(-0.15); put(gb, g, wood, K.solid, 0.08); }
  for (const x of [-0.85, 0.85]) {
    put(gb, stick(V(x, 0, 0.2), V(x, 0.47, 0.15), 0.035), iron); put(gb, stick(V(x, 0, -0.3), V(x, 1.05, -0.42), 0.035), iron);
    put(gb, stick(V(x, 0.62, 0.22), V(x, 0.64, -0.36), 0.03), iron);
  }
  return gb.build();
}

// ---------- the cabin, its door wide open: "I'd still be inside" (front +z) ----------
export function cabin() {
  const gb = new GB();
  const log = lin(0x7a5a3a), dark = lin(0x4a3424), roof = lin(0x3e3a34), stone = lin(0x7a766e), warm = lin(0xffc070);
  const W = 7, D = 5.5, H = 3.2;
  put(gb, box(W + 0.4, 0.5, D + 0.4, 0, 0.25, 0), stone, K.stone, 0.15, 2);
  // walls of logs, the door hole in the front
  for (let k = 0; k < 10; k++) {
    const y = 0.5 + k * 0.32 + 0.16;
    for (const s of [-1, 1]) put(gb, stick(V(s * W / 2, y, -D / 2 - 0.3), V(s * W / 2, y, D / 2 + 0.3), 0.17, 6), k % 2 ? log : dark, K.solid, 0.1, 2);
    put(gb, stick(V(-W / 2 - 0.3, y, -D / 2), V(W / 2 + 0.3, y, -D / 2), 0.17, 6), k % 2 ? dark : log, K.solid, 0.1, 2);
    if (y < 2.6) { for (const [a, b] of [[-W / 2 - 0.3, -0.65], [0.65, W / 2 + 0.3]]) put(gb, stick(V(a, y, D / 2), V(b, y, D / 2), 0.17, 6), k % 2 ? dark : log, K.solid, 0.1, 2); }
    else put(gb, stick(V(-W / 2 - 0.3, y, D / 2), V(W / 2 + 0.3, y, D / 2), 0.17, 6), k % 2 ? dark : log, K.solid, 0.1, 2);
  }
  gable(gb, W, D + 1.6, 0.5 + H, 1.9, roof, 0.5, 0.18);
  gableEnd(gb, W, 0.5 + H, 1.9, D / 2 + 0.02, log); gableEnd(gb, W, 0.5 + H, 1.9, -D / 2 - 0.02, log);
  // the doorway: warm light inside, the door swung open against the wall
  put(gb, box(1.3, 2.2, 0.05, 0, 0.5 + 1.1, D / 2 - 0.25), warm, K.lit, 0.15);
  put(gb, box(0.08, 2.2, 1.2, -0.7, 0.5 + 1.1, D / 2 + 0.62), lin(0x5a3a22), K.solid, 0.08);
  // a lit window, a porch and its posts, a chair by the door
  windowAt(gb, 1.0, 0.9, 2.1, 2.2, D / 2 + 0.2, 0, true, warm, lin(0x3a2a1a), [2, 2]);
  put(gb, box(W + 0.6, 0.15, 2.2, 0, 0.5, D / 2 + 1.3), lin(0x6a4a30), K.solid, 0.1, 2);
  for (const x of [-W / 2, W / 2]) put(gb, stick(V(x, 0.5, D / 2 + 2.2), V(x, 0.5 + H, D / 2 + 2.2), 0.1, 6), log);
  put(gb, box(0.5, 0.06, 0.5, 1.6, 0.98, D / 2 + 1.2), lin(0x6a4a30)); put(gb, box(0.5, 0.6, 0.06, 1.6, 1.3, D / 2 + 0.98), lin(0x6a4a30));
  put(gb, box(0.6, 0.6, 0.6, -2.4, 4.5, -0.8), stone, K.stone, 0.2);
  put(gb, box(0.5, 2.0, 0.5, -2.4, 3.8, -0.8), stone, K.stone, 0.2);
  return gb.build();
}

// ---------- the rock that gets the leg: sharp granite with its edges catching the light, and on its
// edge, what it took ----------
export function theRock() {
  const gb = new GB();
  const g = new THREE.IcosahedronGeometry(1, 1);
  const P = g.attributes.position, R = yahRng(214);
  // sharp: big flat faces, pushed about, an edge up toward the trail
  const keep = new Map();
  for (let i = 0; i < P.count; i++) {
    const key = P.getX(i).toFixed(3) + P.getY(i).toFixed(3) + P.getZ(i).toFixed(3);
    if (!keep.has(key)) keep.set(key, 0.75 + R() * 0.5);
    const k = keep.get(key);
    let y = P.getY(i);
    P.setXYZ(i, P.getX(i) * 1.6 * k, Math.max(-0.2, y) * 1.9 * k + 0.4, P.getZ(i) * 1.1 * k);
  }
  g.computeVertexNormals();
  const granite = lin(0x8a867e), blood = lin(0x7a0a0a);
  gb.add(g, (p, n) => {
    const v = 0.8 + 0.3 * yahNoise(p.x * 4, p.y * 4, p.z * 4);
    // a few dark red drops on the top edge, on the side facing the trail
    const drop = p.y > 2.0 && p.z > 0.2 && yahNoise(p.x * 7, p.y * 7, p.z * 7) > 0.66;
    const c = drop ? blood : granite;
    return [c[0] * v, c[1] * v, c[2] * v, K.stone, 0];
  });
  return gb.build();
}

// ---------- the spring: a pipe out of the rock, water into a stone basin, a cup on a nail ----------
export function spring() {
  const gb = new GB();
  const g = boulder(1, true); g.scale(2.2, 2.6, 1.6); g.translate(0, 0, -1.6);
  gb.add(g, (p, nn, idx) => { const c = g.attributes.color; return [c.getX(idx), c.getY(idx), c.getZ(idx), K.stone, 0]; });
  put(gb, stick(V(0, 1.15, -0.3), V(0, 1.1, 0.55), 0.05, 8), lin(0x5a4a3e));
  // the basin: a ring of stones round still water
  const R = yahRng(31);
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, b = boulder(i % 3, true); b.scale(0.32, 0.4, 0.3); b.rotateY(a); b.translate(Math.cos(a) * 0.95, 0, 1.1 + Math.sin(a) * 0.7); gb.add(b, (p, nn, idx) => { const c = b.attributes.color; return [c.getX(idx), c.getY(idx), c.getZ(idx), K.stone, 0]; }); }
  put(gb, cyl(0.03, 0.03, 0.12, 6, 0.35, 1.25, -0.25).rotateX(0), lin(0x2a2a2a));
  put(gb, cyl(0.07, 0.06, 0.14, 10, 0.35, 1.05, -0.2), lin(0xb8bcc4));
  return gb.build();
}
// the water: falling from the pipe and lying in the basin (drawn with the water material)
export function springWater() {
  const fall = new THREE.PlaneGeometry(0.1, 1.0, 1, 4); fall.translate(0, 0.5, 0); fall.rotateY(Math.PI / 2);
  const P = fall.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i); P.setZ(i, 0.55 + (1 - y) * 0.25); P.setY(i, 0.25 + y * 0.85); }
  const pool = new THREE.CircleGeometry(0.85, 18); pool.rotateX(-Math.PI / 2); pool.scale(1, 1, 0.75); pool.translate(0, 0.28, 1.1);
  const g = new THREE.BufferGeometry();
  const a = fall.toNonIndexed(), b = pool.toNonIndexed();
  const pos = new Float32Array([...a.attributes.position.array, ...b.attributes.position.array]);
  const uv = new Float32Array([...a.attributes.uv.array, ...b.attributes.uv.array]);
  const kind = new Float32Array(pos.length / 3); kind.fill(1, 0, a.attributes.position.count);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('aFall', new THREE.BufferAttribute(kind, 1));
  return g;
}

// ---------- a cairn: flat stones stacked ----------
export function cairn(variant = 0) {
  const gb = new GB();
  const R = yahRng(55 + variant * 9);
  let y = 0;
  const n = 6 + variant;
  for (let i = 0; i < n; i++) {
    const f = i / n, r = 0.75 * (1 - f * 0.65) * (0.85 + R() * 0.3), h = 0.22 + R() * 0.12;
    const g = new THREE.IcosahedronGeometry(1, 1); g.scale(r, h, r * (0.8 + R() * 0.3)); g.rotateY(R() * 3); g.translate((R() - 0.5) * 0.15, y + h * 0.8, (R() - 0.5) * 0.15);
    const c = lin([0x8e8a84, 0x9a968e, 0x7a766e][i % 3]);
    gb.add(g, (p, nn) => { nn.copy(p).sub(V(0, y + h * 0.8, 0)).normalize(); const v = 0.85 + 0.25 * yahNoise(p.x * 5, p.y * 5, p.z * 5); return [c[0] * v, c[1] * v, c[2] * v, K.stone, 0]; });
    y += h * 1.45;
  }
  return gb.build();
}

// ---------- the fire tower on the top: steel legs, braces, stairs, the cab with windows all round ----------
export function fireTower() {
  const gb = new GB();
  const steel = lin(0x6a6e74), cab = lin(0x8a6a4a), roof = lin(0x3a3e42), glass = lin(0xffd8a0);
  const Hc = 19, b0 = 3.6, b1 = 1.7;
  const leg = (sx, sz, y) => V(sx * (b0 + (b1 - b0) * y / Hc), y, sz * (b0 + (b1 - b0) * y / Hc));
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) put(gb, stick(leg(sx, sz, 0), leg(sx, sz, Hc), 0.12, 5), steel, K.solid, 0.04);
  for (let k = 0; k < 5; k++) {
    const y0 = (k / 5) * Hc, y1 = ((k + 1) / 5) * Hc;
    for (const [a, b] of [[[1, 1], [-1, 1]], [[-1, 1], [-1, -1]], [[-1, -1], [1, -1]], [[1, -1], [1, 1]]]) {
      put(gb, stick(leg(a[0], a[1], y0), leg(b[0], b[1], y1), 0.05, 4), steel);
      put(gb, stick(leg(b[0], b[1], y0), leg(a[0], a[1], y1), 0.05, 4), steel);
      put(gb, stick(leg(a[0], a[1], y1), leg(b[0], b[1], y1), 0.06, 4), steel);
    }
    // the stairs zigzag up the middle
    const s = k % 2 ? 1 : -1;
    put(gb, stick(V(-s * 0.9, y0 + 0.2, 0.2), V(s * 0.9, y1, 0.2), 0.32, 4).scale(1, 1, 1), lin(0x4a4e54), K.solid, 0.03);
  }
  // the cab
  const cy = Hc;
  put(gb, box(4.4, 0.3, 4.4, 0, cy + 0.15, 0), cab);
  put(gb, box(4.0, 1.0, 4.0, 0, cy + 0.8, 0), cab, K.solid, 0.08);
  for (const [x, z, ry] of [[0, 2.01, 0], [0, -2.01, Math.PI], [2.01, 0, Math.PI / 2], [-2.01, 0, -Math.PI / 2]]) windowAt(gb, 3.4, 1.2, x, cy + 1.95, z, ry, true, glass, lin(0xe8e2d4), [4, 1]);
  for (const [x, z] of [[1.95, 1.95], [-1.95, 1.95], [1.95, -1.95], [-1.95, -1.95]]) put(gb, box(0.16, 1.4, 0.16, x, cy + 1.95, z), cab);
  const r = new THREE.ConeGeometry(3.4, 1.4, 4); r.rotateY(Math.PI / 4); r.translate(0, cy + 3.35, 0); put(gb, r, roof, K.solid, 0.05);
  put(gb, box(0.06, 2.4, 0.06, 0, cy + 5.1, 0), steel);
  // the catwalk rail round the cab
  for (const [x, z, w, d] of [[0, 2.5, 5.0, 0.06], [0, -2.5, 5.0, 0.06], [2.5, 0, 0.06, 5.0], [-2.5, 0, 0.06, 5.0]]) { put(gb, box(w, 0.06, d, x, cy + 1.2, z), steel); put(gb, box(w, 0.12, d, x, cy + 0.3, z), steel); }
  return gb.build();
}

// ---------- the register box on its post, its lid up, the notebook in it ----------
export function register() {
  const gb = new GB();
  const wood = lin(0x6a4a2e), dark = lin(0x3a2616);
  put(gb, box(0.16, 1.3, 0.16, 0, 0.65, 0), wood, K.solid, 0.1, 5);
  put(gb, box(0.7, 0.45, 0.45, 0, 1.5, 0), dark, K.solid, 0.06);
  put(gb, box(0.74, 0.05, 0.5, 0, 1.9, -0.35).rotateX(-1.1), dark);
  put(gb, box(0.5, 0.04, 0.36, 0, 1.72, 0.0).rotateX(-0.15), lin(0xf4f0e4), K.lit, 0.02);
  return gb.build();
}

// ---------- the street at the bottom: old houses with porches; the lit windows are their own layer ----------
// kind 0: a colonial, two floors, the chimney in the middle; kind 1: a cape with dormers
export function house(kind, walls, trimC = 0xf4f2ec) {
  const gb = new GB();
  const wall = lin(walls), trim = lin(trimC), roofC = lin(0x34343a), brick = lin(0x7a3a2a), stone = lin(0x6e6a64);
  const W = kind ? 10 : 11, D = 8, H = kind ? 3.4 : 6.0, pitch = kind ? 4.4 : 3.2;
  put(gb, box(W + 0.3, 0.7, D + 0.3, 0, 0.35, 0), stone, K.stone, 0.15, 2);
  clapboard(gb, W, H, 0, 0.7, D / 2, 0, wall); clapboard(gb, W, H, 0, 0.7, -D / 2, Math.PI, wall);
  clapboard(gb, D, H, W / 2, 0.7, 0, Math.PI / 2, wall); clapboard(gb, D, H, -W / 2, 0.7, 0, -Math.PI / 2, wall);
  for (const [x, z] of [[W / 2, D / 2], [-W / 2, D / 2], [W / 2, -D / 2], [-W / 2, -D / 2]]) put(gb, box(0.22, H, 0.22, x, 0.7 + H / 2, z), trim);
  // the roof runs along x here: build it along z and turn it
  const rg = new GB(); gable(rg, D, W, 0.7 + H, pitch, roofC, 0.4, 0.22); const rgeo = rg.build(); rgeo.rotateY(Math.PI / 2);
  gb.add(rgeo, (p, n, i) => { const c = rgeo.attributes.color; return [c.getX(i), c.getY(i), c.getZ(i), K.solid, 0]; });
  const eg = new GB(); gableEnd(eg, D, 0.7 + H, pitch, W / 2 + 0.02, wall); gableEnd(eg, D, 0.7 + H, pitch, -W / 2 - 0.02, wall);
  const egeo = eg.build(); egeo.rotateY(Math.PI / 2); gb.add(egeo, (p, n, i) => { const c = egeo.attributes.color; return [c.getX(i), c.getY(i), c.getZ(i), K.solid, 0]; });
  put(gb, box(1.1, 3.2, 1.1, kind ? -2.5 : 0, 0.7 + H + pitch - 1.0, 0), brick, K.stone, 0.12, 3);
  // shutters beside the windows (the glass itself is the windows layer)
  const floors = kind ? [1.9] : [1.9, 4.6];
  for (const y of floors) for (const x of [-3.6, -1.6, 1.6, 3.6]) { if (!kind && y < 3 && Math.abs(x) < 2) continue; for (const s of [-1, 1]) put(gb, box(0.42, 1.5, 0.06, x + s * 0.72, 0.7 + y, D / 2 + 0.05), lin(0x2a3a2e)); }
  if (kind) for (const x of [-2.4, 2.4]) {
    // dormers on the cape, their little roofs running back into the big one
    put(gb, box(1.8, 1.6, 2.2, x, 0.7 + H + 1.2, D / 2 - 1.3), wall);
    const dr = new GB(); gable(dr, 1.8, 2.3, 0.7 + H + 2.0, 0.7, roofC, 0.15, 0.12);
    const dg = dr.build(); dg.translate(x, 0, D / 2 - 1.3);
    gb.add(dg, (p, n) => [roofC[0], roofC[1], roofC[2], K.solid, 0]);
  }
  // the front door, its light, the porch with posts and a roof, the steps
  put(gb, box(1.15, 2.2, 0.1, 0, 0.7 + 1.1, D / 2 + 0.05), lin(kind ? 0x2a3a5a : 0x5a1a1a), K.solid, 0.05);
  put(gb, box(3.6, 0.18, 2.4, 0, 0.7, D / 2 + 1.2), lin(0x8a8a86), K.solid, 0.05);
  for (const x of [-1.6, 1.6]) put(gb, cyl(0.1, 0.1, 2.6, 8, x, 0.78, D / 2 + 2.2), trim);
  put(gb, box(3.9, 0.16, 2.7, 0, 3.45, D / 2 + 1.25), roofC);
  put(gb, box(3.7, 0.22, 0.1, 0, 3.3, D / 2 + 2.45), trim);
  for (let k = 0; k < 3; k++) put(gb, box(1.8, 0.22, 0.4, 0, 0.11 + k * 0.22, D / 2 + 2.7 - k * 0.3), stone, K.stone, 0.1);
  return gb.build();
}
// the house's windows, glass only (lit from inside)
export function houseWindows(kind) {
  const gb = new GB();
  const D = 8, H = kind ? 3.4 : 6.0;
  const glass = [1, 0.82, 0.52];
  const floors = kind ? [1.9] : [1.9, 4.6];
  for (const y of floors) for (const x of [-3.6, -1.6, 1.6, 3.6]) { if (!kind && y < 3 && Math.abs(x) < 2) continue; windowAt(gb, 1.0, 1.45, x, 0.7 + y, D / 2 + 0.03, 0, true, glass, lin(0xf4f2ec), [2, 3]); }
  for (const x of [-2.4, 2.4]) if (kind) windowAt(gb, 0.9, 0.9, x, 0.7 + H + 1.2, D / 2 - 0.18, 0, true, glass, lin(0xf4f2ec), [2, 2]);
  // the side windows, so it's lit seen from up the street
  for (const s of [-1, 1]) for (const z of [-1.8, 1.8]) windowAt(gb, 1.0, 1.4, s * (kind ? 5.03 : 5.53), 0.7 + 1.9, z, s * Math.PI / 2, true, glass, lin(0xf4f2ec), [2, 3]);
  return gb.build();
}
// a picket fence, a length of 6 m along x
export function picket() {
  const gb = new GB(); const w = lin(0xf2f0ea);
  for (const y of [0.35, 0.8]) put(gb, box(6, 0.08, 0.05, 0, y, 0), w);
  for (let i = 0; i < 24; i++) { const x = -2.9 + i * 0.25; put(gb, box(0.08, 1.0, 0.03, x, 0.5, 0.04), w); put(gb, new THREE.ConeGeometry(0.06, 0.12, 4).rotateY(Math.PI / 4).translate(x, 1.06, 0.04), w); }
  return gb.build();
}
// an iron lamp post with its lantern (the light is a glow)
export function lampPost() {
  const gb = new GB(); const iron = lin(0x1e1e22);
  put(gb, cyl(0.12, 0.08, 3.6, 8, 0, 0, 0), iron); put(gb, cyl(0.2, 0.2, 0.3, 8, 0, 0, 0), iron);
  put(gb, new THREE.CylinderGeometry(0.28, 0.2, 0.6, 6, 1, true).translate(0, 3.95, 0), lin(0xffd8a0), K.lit);
  put(gb, new THREE.ConeGeometry(0.4, 0.35, 6).translate(0, 4.42, 0), iron);
  return gb.build();
}
// a mailbox on its post
export function mailbox() {
  const gb = new GB();
  put(gb, box(0.12, 1.15, 0.12, 0, 0.57, 0), lin(0x6a4a2e));
  put(gb, box(0.48, 0.4, 0.8, 0, 1.3, 0), lin(0x2a2a30)); put(gb, cyl(0.24, 0.24, 0.8, 10, 0, 0, 0).rotateX(Math.PI / 2).translate(0, 1.5, 0.4), lin(0x2a2a30));
  put(gb, box(0.04, 0.3, 0.1, 0.26, 1.55, 0.2), lin(0xd02020));
  return gb.build();
}
// the stone wall that holds a lot up over the street, fieldstone in courses with a granite cap, and
// the steps up through it in the middle (front at +z, its top at y = 0, reaching down to -h)
export function retainingWall(w = 34, h = 10) {
  const gb = new GB();
  const R = yahRng(1313);
  const face = new THREE.PlaneGeometry(w, h, Math.round(w * 1.4), Math.round(h * 2.2));
  face.translate(0, -h / 2, 0.6);
  const cols = [0x8a857c, 0x7a766e, 0x9a958a, 0x6e6a62, 0x847a6c].map(lin);
  gb.add(face, (p) => { const row = Math.floor(-p.y / 0.45), cx = Math.floor((p.x + (row % 2) * 0.35) / 0.7); const k = h3i(cx, row); const c = cols[Math.floor(k * cols.length)]; const v = 0.75 + 0.35 * yahNoise(p.x * 3, p.y * 3, 1); return [c[0] * v, c[1] * v, c[2] * v, K.stone, 0]; });
  put(gb, box(w + 0.4, 0.3, 1.5, 0, 0.05, 0), lin(0x8e8a84), K.stone, 0.12, 2);
  // the steps up along the face of it, granite slabs, and their iron rail
  const n = 20, rise = h / n;
  for (let k = 0; k < n; k++) put(gb, box(0.72, rise * (k + 1), 1.5, 9.5 - k * 0.66, -h + rise * (k + 1) / 2, 1.35), lin(0x9a968e), K.stone, 0.1, 2);
  put(gb, stick(V(9.5, -h + 1.0, 2.05), V(9.5 - (n - 1) * 0.66, 1.0, 2.05), 0.04, 5), lin(0x1e1e22));
  for (let k = 0; k <= n; k += 4) put(gb, stick(V(9.5 - k * 0.66, -h + rise * k, 2.05), V(9.5 - k * 0.66, -h + rise * k + 1.0, 2.05), 0.03, 4), lin(0x1e1e22));
  return gb.build();
}
const h3i = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// hydrangeas: big round heads of blue and pink in August
export function hydrangea(pink) {
  const gb = new GB(); const R = yahRng(pink ? 7 : 8);
  const leaf = lin(0x3e5e26), bloom = lin(pink ? 0xe890b8 : 0x7a9ae8);
  for (let i = 0; i < 7; i++) { const g = new THREE.IcosahedronGeometry(0.55, 1); const x = (R() - 0.5) * 1.4, z = (R() - 0.5) * 1.0, y = 0.45 + R() * 0.3; g.translate(x, y, z); gb.add(g, (p, n) => { n.copy(p).sub(V(x, y, z)).normalize(); return [leaf[0], leaf[1], leaf[2], K.leaf, 0.08]; }); }
  for (let i = 0; i < 11; i++) { const g = new THREE.IcosahedronGeometry(0.26, 1); const x = (R() - 0.5) * 1.5, z = (R() - 0.5) * 1.1, y = 0.85 + R() * 0.3; g.translate(x, y, z); gb.add(g, (p, n) => { n.copy(p).sub(V(x, y, z)).normalize(); const v = 0.85 + 0.3 * R(); return [bloom[0] * v, bloom[1] * v, bloom[2] * v, K.petal, 0.1]; }); }
  return gb.build();
}
