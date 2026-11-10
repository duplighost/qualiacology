// Small real-time pieces for the highway: car bodies, floor light (headlight beams and pools drawn as additive
// light on the wet road), lens glows, the sky seen in the road, decals, fire.
import * as THREE from 'three';
import { LAYER } from '../../game/arena.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const clamp01 = (k) => Math.max(0, Math.min(1, k));
export const smooth = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ------------------------------------------------------------------------------------------ materials
export function lacquer(color, o = {}) { return new THREE.MeshPhysicalMaterial({ color, roughness: o.rough ?? 0.18, metalness: o.metal ?? 0, clearcoat: o.coat ?? 1, clearcoatRoughness: o.coatRough ?? 0.04, envMapIntensity: o.env ?? 1 }); }
export const MAT = {};
export function mats() {
  if (MAT.glass) return MAT;
  MAT.glass = new THREE.MeshPhysicalMaterial({ color: 0x040507, roughness: 0.03, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.02 });
  // the same cabin with its glass gone: crazed, matte, the dark inside showing (the car keeps its shape)
  MAT.glassOut = new THREE.MeshPhysicalMaterial({ color: 0x24272c, roughness: 0.62, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.55 });   // (the glass's own shader)
  MAT.chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.12, metalness: 1 });
  MAT.gold = new THREE.MeshStandardMaterial({ color: 0xffc35a, roughness: 0.22, metalness: 1 });
  MAT.copper = new THREE.MeshStandardMaterial({ color: 0xb8733a, roughness: 0.25, metalness: 1 });
  MAT.tyre = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.85 });
  MAT.dark = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.6, metalness: 0.2 });
  MAT.lens = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.8, 3.4) });
  MAT.lensOff = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.1, metalness: 0.6 });
  MAT.tail = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.05, 0.08) });
  return MAT;
}

// ------------------------------------------------------------------------------------------ cars
// a car on its own frame: +x forward (the nose at +len/2), y up, z across. Styles: 'gt' (YOU's long-hood coupe),
// 'fastback' (hers), 'sedan', 'van', 'hatch'. Returns { root, parts: { body, glass[], lensL, lensR, tail[] }, len, wid }
const SIL = {
  gt: [[-0.5, 0.3], [0.5, 0.3], [0.5, 0.55], [0.47, 0.64], [0.12, 0.7], [0.03, 0.72], [-0.5, 0.72]],
  fastback: [[-0.5, 0.3], [0.5, 0.3], [0.5, 0.56], [0.46, 0.66], [0.18, 0.71], [0.08, 0.72], [-0.5, 0.74]],
  sedan: [[-0.5, 0.3], [0.5, 0.3], [0.5, 0.58], [0.44, 0.7], [0.22, 0.74], [-0.42, 0.74], [-0.5, 0.68]],
  van: [[-0.5, 0.3], [0.5, 0.3], [0.5, 0.62], [0.42, 0.78], [-0.5, 0.8]],
  hatch: [[-0.5, 0.3], [0.5, 0.3], [0.5, 0.58], [0.43, 0.7], [0.2, 0.74], [-0.46, 0.74], [-0.5, 0.66]],
};
const CABIN = {   // greenhouse: [x0, x1 (fraction of length), top height (fraction of height), front rake, rear rake]
  gt: [-0.42, 0.05, 1.0, 0.16, 0.22], fastback: [-0.45, 0.1, 1.0, 0.14, 0.34], sedan: [-0.36, 0.2, 1.0, 0.12, 0.1],
  van: [-0.48, 0.38, 1.0, 0.06, 0.0], hatch: [-0.44, 0.18, 1.0, 0.12, 0.06],
};
function sideShape(pts) { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s; }

export function makeCar(style, { len = 4.6, wid = 1.9, hei = 1.3, body, trim, lights = 'two' } = {}) {
  const M = mats();
  const root = new THREE.Group();
  const sil = SIL[style] || SIL.sedan;
  const bodyPts = sil.map(([x, y]) => [x * len, y * hei]);
  const bevel = 0.07;
  const flat = (g) => (g.index ? g.toNonIndexed() : g);
  const at = (g, x, y, z) => { g.translate(x, y, z); return flat(g); };
  const bg = new THREE.ExtrudeGeometry(sideShape(bodyPts), { depth: wid - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 });
  bg.translate(0, 0, -(wid - bevel * 2) / 2);
  // the greenhouse: a narrower tapered prism of black glass on the body
  const [c0, c1, , fr, rr] = CABIN[style] || CABIN.sedan;
  const yb = Math.max(...sil.slice(2).map((p) => p[1])) * hei - 0.02;
  const top = hei;
  const x0 = c0 * len, x1 = c1 * len;
  const cab = sideShape([[x0, yb], [x1, yb], [x1 - fr * len, top], [x0 + rr * len * 0.5, top]]);
  const cw = wid - 0.28;
  const cg = new THREE.ExtrudeGeometry(cab, { depth: cw - 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
  cg.translate(0, 0, -(cw - 0.1) / 2);
  const glass = new THREE.Mesh(cg, M.glass); glass.castShadow = true; root.add(glass);
  // the body and a roof panel in the body colour over the glass (from above it reads as a car, not a black box): one mesh
  const roofG = at(new THREE.BoxGeometry((x1 - fr * len) - (x0 + rr * len * 0.5) - 0.12, 0.035, cw - 0.12), ((x1 - fr * len) + (x0 + rr * len * 0.5)) / 2, top + 0.035, 0);
  const bodyM = new THREE.Mesh(mergeGeometries([flat(bg), roofG]), body); bodyM.castShadow = true; bodyM.receiveShadow = true; root.add(bodyM);
  // wheels: one mesh
  const wheels = [];
  for (const wx of [-0.32 * len, 0.32 * len]) for (const s of [-1, 1]) { const wg = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 20); wg.rotateX(Math.PI / 2); wheels.push(at(wg, wx, 0.33, s * (wid / 2 - 0.1))); }
  root.add(new THREE.Mesh(mergeGeometries(wheels), M.tyre));
  // trim: a chrome or gold strip along the beltline, bumpers: one mesh
  const tm = trim || M.chrome, tg = [];
  for (const s of [-1, 1]) tg.push(at(new THREE.BoxGeometry(len * 0.92, 0.035, 0.02), 0, yb - 0.06, s * (wid / 2 + 0.005)));
  for (const s of [-1, 1]) tg.push(at(new THREE.BoxGeometry(0.08, 0.12, wid * 0.96), s * (len / 2 + 0.03), 0.42, 0));
  root.add(new THREE.Mesh(mergeGeometries(tg), tm));
  // lights
  const lg = new THREE.CylinderGeometry(0.11, 0.11, 0.05, 16); lg.rotateZ(Math.PI / 2);
  const lensL = new THREE.Mesh(lg, M.lens), lensR = new THREE.Mesh(lg, lights === 'one' ? M.lensOff : M.lens);
  const ly = sil[2][1] * hei - 0.08;
  lensL.position.set(len / 2 + 0.01, ly, wid / 2 - 0.3); lensR.position.set(len / 2 + 0.01, ly, -(wid / 2 - 0.3));
  root.add(lensL, lensR);
  const tl = new THREE.Mesh(mergeGeometries([-1, 1].map((s) => at(new THREE.BoxGeometry(0.04, 0.08, 0.34), -len / 2 - 0.01, ly, s * (wid / 2 - 0.3)))), M.tail); root.add(tl);
  return { root, parts: { body: bodyM, glass: [glass], lensL, lensR, tail: [tl] }, len, wid, hei };
}

// ------------------------------------------------------------------------------------------ floor light
// Light on the wet road, additive, under the telegraphs: pools (round) and beams (headlights: a cone that widens and
// fades along its length). Drawn by the game camera only (not mirrored: the road doesn't reflect itself).
const GLOW_VS = /* glsl */`
attribute vec4 aG; attribute vec3 aC; varying vec2 vP; varying vec4 vG; varying vec3 vC;
void main() { vP = position.xy; vG = aG; vC = aC; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position.x, 0.0, -position.y, 1.0); }`;
const GLOW_FS = /* glsl */`
varying vec2 vP; varying vec4 vG; varying vec3 vC;
void main() {
  float a;
  if (vG.x < 0.5) { float d = length(vP); a = pow(max(0.0, 1.0 - d * d), 2.2); }
  else { float v = 0.5 - vP.y * 0.5; float hw = mix(vG.y, 1.0, v); float u = abs(vP.x) / hw;
    a = (1.0 - smoothstep(0.55, 1.0, u)) * pow(max(0.0, 1.0 - v), 1.35) * smoothstep(0.0, 0.08, v); }
  if (a < 0.002) discard;
  gl_FragColor = vec4(vC * a, 1.0);
}`;
export class Glows {
  constructor(scene, max = 128) {
    const g = new THREE.PlaneGeometry(2, 2);
    this.aG = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.aC = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.aG.setUsage(THREE.DynamicDrawUsage); this.aC.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aG', this.aG); g.setAttribute('aC', this.aC);
    this.mesh = new THREE.InstancedMesh(g, new THREE.ShaderMaterial({ vertexShader: GLOW_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), max);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 1; this.mesh.count = 0; this.mesh.layers.set(LAYER.NO_REFLECT);
    scene.add(this.mesh);
    this.max = max; this.n = 0; this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
  }
  begin() { this.n = 0; }
  _put(x, z, ang, sx, sz, mode, p1, c, k) {
    if (this.n >= this.max || k <= 0.001) return;
    const i = this.n++;
    this._q.setFromAxisAngle(_Y, ang); this._p.set(x, 0.012, z); this._s.set(sx, 1, sz);
    this._m.compose(this._p, this._q, this._s); this._m.toArray(this.mesh.instanceMatrix.array, i * 16);
    this.aG.array[i * 4] = mode; this.aG.array[i * 4 + 1] = p1;
    this.aC.array[i * 3] = c.r * k; this.aC.array[i * 3 + 1] = c.g * k; this.aC.array[i * 3 + 2] = c.b * k;
  }
  pool(x, z, r, c, k = 1, sx = 1) { this._put(x, z, 0, r * sx, r, 0, 0, c, k); }
  // a beam from (x, z) along angle (0 = +z), len long, `spread` wide at the far end, starting `w0` (fraction) wide
  beam(x, z, ang, len, spread, c, k = 1, w0 = 0.12) {
    const cx = x + Math.sin(ang) * len / 2, cz = z + Math.cos(ang) * len / 2;
    this._put(cx, cz, ang, spread / 2, len / 2, 1, w0, c, k);
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true; this.aG.needsUpdate = true; this.aC.needsUpdate = true;
  }
  dispose(scene) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
const _Y = new THREE.Vector3(0, 1, 0);

// ------------------------------------------------------------------------------------------ billboards (lens glows, flames): one draw each
// screen-facing quads in one instanced draw, additive, mirrored by the wet road. A flame (height given) stands on its
// point (anchored at the bottom); a glow is centred.
const BB_VS = /* glsl */`
attribute vec4 aPos; attribute vec4 aCol; varying vec2 vUv; varying vec3 vCol;
void main() { vUv = position.xy + 0.5; vCol = aCol.rgb; vec4 mv = viewMatrix * vec4(aPos.xyz, 1.0);
  mv.xy += aCol.a > 0.0 ? vec2(position.x * aPos.w, (position.y + 0.5) * aCol.a) : position.xy * aPos.w;
  gl_Position = projectionMatrix * mv; }`;
const BB_FS = /* glsl */`
uniform sampler2D map; varying vec2 vUv; varying vec3 vCol;
void main() { vec4 t = texture2D(map, vUv); float a = t.a; if (a < 0.004) discard; gl_FragColor = vec4(vCol * t.rgb * a, 1.0); }`;
export class Billboards {
  constructor(scene, map, max = 128) {
    const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1);
    g.index = q.index; g.setAttribute('position', q.attributes.position);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
    this.aPos.setUsage(THREE.DynamicDrawUsage); this.aCol.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aPos', this.aPos); g.setAttribute('aCol', this.aCol); g.instanceCount = 0;
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: BB_VS, fragmentShader: BB_FS, uniforms: { map: { value: map } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; scene.add(this.mesh);
    this.max = max; this.n = 0;
  }
  begin() { this.n = 0; }
  add(x, y, z, w, h, r, g, b) {
    if (this.n >= this.max) return; const i = this.n++;
    const P = this.aPos.array, C = this.aCol.array;
    P[i * 4] = x; P[i * 4 + 1] = y; P[i * 4 + 2] = z; P[i * 4 + 3] = w;
    C[i * 4] = r; C[i * 4 + 1] = g; C[i * 4 + 2] = b; C[i * 4 + 3] = h;
  }
  end() { this.mesh.geometry.instanceCount = this.n; this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; }
  dispose(scene) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,0.6)'); g.addColorStop(0.5, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c); return glowTex;
}
// a lens glow: an anchor that rides whatever it's attached to (its world scale is its size), drawn in one batch
let FLARES = [];
export function flareRegistry(list) { FLARES = list; }
export function flare(color, size = 0.8) {
  const a = new THREE.Object3D(); a.scale.setScalar(size);
  a.material = { opacity: 1, color: color.clone() };
  FLARES.push(a);
  return a;
}
const _fp = new THREE.Vector3(), _fs = new THREE.Vector3();
export function flushFlares(list, bb, scene) {
  bb.begin();
  for (const a of list) {
    let o = a, shown = true;
    while (o) { if (!o.visible) { shown = false; break; } if (!o.parent) break; o = o.parent; }
    if (!shown || o !== scene) continue;
    a.getWorldPosition(_fp); a.getWorldScale(_fs);
    const k = a.material.opacity, c = a.material.color;
    bb.add(_fp.x, _fp.y, _fp.z, _fs.x, 0, c.r * k, c.g * k, c.b * k);
  }
  bb.end();
}

// ------------------------------------------------------------------------------------------ the sky, seen only in the wet road
export function skyDome(scene) {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uTop, uHor; varying vec3 vD; void main(){ float k = smoothstep(-0.05, 0.6, vD.y); gl_FragColor = vec4(mix(uHor, uTop, k), 1.0); }' });
  const d = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), m);
  d.layers.set(LAYER.HIDDEN); d.frustumCulled = false; d.renderOrder = -10;
  scene.add(d);
  return d;
}

// ------------------------------------------------------------------------------------------ beyond the road
// What the stage camera sees past the far median and off both ends of the slab: the hill the freeway is cut into
// (the one that comes down on "bury"), the road going on, and the sky over the ridge. (Until 10 Nov the camera was
// high and never looked past the K-rail, so there was nothing there: with the low camera, a black void over a wet
// road full of dawn.) Drawn by the game camera only: the wet road goes on reflecting the sky dome above, as it was lit
// to. `sky`: the dome above's own colours (the same Color objects), dimmer and with the horizon's band drawn tight.
export function beyond(scene, sky) {
  const g = new THREE.Group(); g.name = 'beyond';
  const put = (m) => { m.layers.set(LAYER.NO_REFLECT); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; g.add(m); return m; };
  const su = sky.material.uniforms;
  const dome = put(new THREE.Mesh(new THREE.SphereGeometry(140, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { uTop: su.uTop, uHor: su.uHor, uGain: { value: 0.6 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uTop, uHor; uniform float uGain; varying vec3 vD; void main(){ float k = smoothstep(0.0, 0.36, vD.y); gl_FragColor = vec4(mix(uHor, uTop, k) * uGain, 1.0); }' })));
  dome.renderOrder = -9;
  // the hill: a faceted rise from the far shoulder (z -13) to a ridge 60 m back, dark scrub and rock
  const NX = 96, NZ = 15, X0 = -150, X1 = 150, pos = [], col = [];
  const dAt = (j) => 78 * Math.pow(j / NZ, 1.7);                      // rows crowd toward the road
  const hAt = (x, d, i, j) => {
    const big = 0.75 + 0.5 * (0.5 + 0.5 * Math.sin(x * 0.037 + 1.3)) * (0.6 + 0.4 * Math.sin(x * 0.011 + 4.0));
    return 2.4 * smooth(0, 5, d) + 8.6 * smooth(4, 62, d) * big + (j > 0 ? (hash(i * 7.3 + j * 19.1) - 0.5) * (0.35 + d * 0.022) : 0);
  };
  const P = (i, j) => { const x = lerp(X0, X1, i / NX) + (j > 0 ? (hash(i * 3.1 + j * 5.7) - 0.5) * 1.6 : 0), d = dAt(j); return [x, j === 0 ? -0.02 : hAt(x, d, i, j), -13.0 - d]; };
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const a = P(i, j), b = P(i + 1, j), c = P(i, j + 1), e = P(i + 1, j + 1);
    for (const [tri, seed] of [[[a, b, c], i * 2.3 + j * 11.7], [[b, e, c], i * 5.1 + j * 3.9 + 0.5]]) {
      // (dark, and nearly one tone: it's behind the two of you, not a picture of its own)
      const k = hash(seed), rock = k > 0.9;
      const c0 = rock ? [0.036 + 0.008 * hash(seed + 2), 0.034, 0.032] : [0.017 + 0.007 * k, 0.021 + 0.008 * k, 0.016 + 0.005 * k];
      for (const v of tri) { pos.push(v[0], v[1], v[2]); col.push(c0[0], c0[1], c0[2]); }
    }
  }
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); hg.computeVertexNormals();
  const ground = new THREE.MeshLambertMaterial({ vertexColors: true });
  put(new THREE.Mesh(hg, ground));
  // the road, the verge and the bank going on past both ends of the set (x beyond 17)
  const flat = new THREE.MeshLambertMaterial({ color: new THREE.Color(0.02, 0.02, 0.024) }), bank = new THREE.MeshLambertMaterial({ color: new THREE.Color(0.03, 0.036, 0.028) });
  for (const s of [-1, 1]) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(133, 20.2), flat); road.rotation.x = -Math.PI / 2; road.position.set(s * (17 + 66.5), -0.012, -2.9); put(road);
    const slope = new THREE.BufferGeometry(); const xa = s * 17, xb = s * 150;
    slope.setAttribute('position', new THREE.Float32BufferAttribute([xa, -0.012, 7.2, xb, -0.012, 7.2, xa, -7, 14, xb, -0.012, 7.2, xb, -7, 14, xa, -7, 14], 3));
    if (s > 0) slope.setIndex([0, 2, 1, 3, 5, 4]);
    slope.computeVertexNormals(); put(new THREE.Mesh(slope, bank));
  }
  scene.add(g);
  return { group: g, dome, dispose() { scene.remove(g); g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); } };
}

// ------------------------------------------------------------------------------------------ floor decals (painted textures, not mirrored)
export function decalTex(draw, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  draw(x, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function decal(tex, w, h, { opacity = 1, additive = false, color = 0xffffff } = {}) {
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity, color, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -2 });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.rotation.x = -Math.PI / 2; p.position.y = 0.008; p.renderOrder = 0;
  p.layers.set(LAYER.NO_REFLECT);
  return p;
}

// ------------------------------------------------------------------------------------------ fire: flickering sprites
let fireTex = null;
function fireTexture() {
  if (fireTex) return fireTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 96, 2, 32, 80, 60); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.25, 'rgba(255,170,60,0.9)'); g.addColorStop(0.6, 'rgba(255,80,20,0.35)'); g.addColorStop(1, 'rgba(120,20,0,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(32, 2); x.bezierCurveTo(60, 50, 64, 100, 32, 126); x.bezierCurveTo(0, 100, 4, 50, 32, 2); x.fill();
  fireTex = new THREE.CanvasTexture(c); return fireTex;
}
export class Fires {
  constructor(scene, max = 96) { this.bb = new Billboards(scene, fireTexture(), max); this.bb.mesh.renderOrder = 7; }
  begin() { this.bb.begin(); }
  // a flame at (x, y, z), h tall, k strength, seed for its flicker
  flame(x, y, z, h, k, seed, t) {
    if (k <= 0.01) return;
    const fl = 0.75 + 0.25 * Math.sin(t * 17 + seed * 9) * Math.sin(t * 11.3 + seed * 3), a = Math.min(1, k * 1.2);
    this.bb.add(x, y, z, h * 0.36 * (0.9 + 0.2 * fl), Math.max(0.01, h * fl * k), 1.25 * a, 0.75 * a, 0.38 * a);
  }
  end() { this.bb.end(); }
  dispose(scene) { this.bb.dispose(scene); }
}
