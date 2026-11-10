// THE HOUSE IN YOUR HEAD: a candy-coloured mansion as a dollhouse cutaway, floating in lilac haze. The floor (and the
// stage lip) are the baked arena (tools/arena/arenas/rent-free.py); everything else is here, in real time:
// - rooms of flats (back, left, right; the side flats cut on the diagonal so the camera sees in) that FLY: the old
//   room's flats lift out of frame on wires, the new room's drop in with a thud and a breath of dust;
// - floors that roll out over the baked marble on the bar line, lit by the baked lightmap (they borrow its UVs);
// - your things (matte and real: walnut, brass, linen, velvet, marble), the light of each room as a function of song
//   time (so a rewind lands in the right light), pools of candle and lamp light, the haze.
import * as THREE from 'three';
import { Arena, LAYER } from '../../game/arena.js';
import * as P from './props.js';
import { flatTexture, parquetTexture, boardsTexture, concreteTexture, blueprintTexture, glowTexture, barsTexture, samplerTexture, leaseTexture, C, rng, kissTexture } from './paint.js';

export const SOCK = { W1: [-6.5, -7, 'back'], W2: [6.5, -7, 'back'], W3: [0, -7, 'back'], L1: [-11, -4.5, 'left'], L2: [-11, 2.5, 'left'], R1: [11, -4.5, 'right'], R2: [11, 2.5, 'right'] };
const BX = 11.2, BZ = -7.05, H = 6;          // flats' inner faces
const ease = (k) => k * k * (3 - 2 * k);
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
const cyl = (r0, r1, h, m, x = 0, y = 0, z = 0, seg = 20) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };

// ---------------------------------------------------------------------------------------------- when things are
// rooms by song time (the set at time t is a function of t: a rewind or a practice start lands in the right room)
export const ROOMS = [[0, 'foyer'], [10.70, 'gallery'], [61.13, 'ballroom'], [86.30, 'hall'], [95.58, 'bedroom'], [104.87, 'below'], [118.13, 'gallery'], [130.06, 'ballroom'], [168.52, 'foyer'], [218.58, 'ballroom'], [264.01, 'parlour'], [291.87, 'bedroom']];
export const roomAt = (t) => { let r = ROOMS[0][1]; for (const [a, n] of ROOMS) if (t >= a - 1e-3) r = n; return r; };
// the light: [time, state a, state b, k at that time] keyframes, blended linearly between keys of the same pair
const L = [];
const key = (t, a, b = a, k = 0, ex = 1, glow = null) => L.push({ t, a, b, k, ex, glow });
key(0, 'dark', 'foyer', 0.45); key(2.73, 'dark', 'foyer', 0.45); key(3.13, 'dark', 'foyer', 1.0);
key(10.70, 'foyer'); key(11.3, 'day');
key(21.30, 'day', 'day', 0, 1); key(21.36, 'day', 'day', 0, 0.8); key(21.65, 'day', 'day', 0, 1.0);
key(57.12, 'day', 'dusk', 0); key(59.77, 'day', 'dusk', 0.5); key(61.12, 'day', 'dusk', 0.5);
key(61.13, 'ball', 'ball', 0, 1.25); key(61.45, 'ball', 'ball', 0, 1.0);
key(86.30, 'ball'); key(86.70, 'hall');
key(95.58, 'hall'); key(96.0, 'moon');
key(104.86, 'moon'); key(104.87, 'dark');
key(118.13, 'dark', 'dusk', 0); key(118.8, 'dark', 'dusk', 1);
key(130.06, 'ball', 'ball', 0, 1.2); key(130.4, 'ball');
key(149.29, 'ball', 'dark', 0); key(157.25, 'ball', 'dark', 0.32); key(168.50, 'ball', 'dark', 0.32);
key(168.52, 'foyer', 'foyer', 0, 1.15); key(176.47, 'foyer', 'foyer', 0, 1.15); key(176.48, 'foyer', 'dark', 0.1); key(194.9, 'foyer', 'dark', 0.5); key(195.04, 'foyer', 'dark', 0.5); key(196.0, 'foyer', 'dark', 0.85);
key(196.36, 'dark'); key(218.57, 'dark');
key(218.58, 'ball', 'ball', 0, 1.35); key(249.40, 'ball', 'ball', 0, 1.35);
key(249.41, 'dark'); key(255.70, 'dark');
key(255.71, 'ball', 'ball', 0, 1.35); key(264.0, 'ball', 'ball', 0, 1.35);
key(264.01, 'ball', 'fire', 0); key(265.5, 'ball', 'fire', 1); key(265.6, 'fire');
key(291.87, 'fire', 'moon', 0); key(292.6, 'moon'); key(304.80, 'moon'); key(304.81, 'moon', 'dark', 0.45);
function lightAt(t) {
  let i = 0; while (i < L.length - 1 && L[i + 1].t <= t) i++;
  const A = L[i], B = L[i + 1];
  if (!B || A.a !== B.a || A.b !== B.b) return { a: A.a, b: A.b, k: A.k, ex: A.ex };
  const u = clamp01((t - A.t) / Math.max(1e-3, B.t - A.t));
  return { a: A.a, b: A.b, k: A.k + (B.k - A.k) * u, ex: A.ex + (B.ex - A.ex) * u };
}
// how the flats glow in each light (they're lit in real time; this is their painted light)
const GLOW = { foyer: ['#ffc8ee', 0.26], day: ['#fff0dc', 0.34], dusk: ['#ffb08a', 0.26], ball: ['#ffdcae', 0.3], hall: ['#ffc27a', 0.13], moon: ['#9db6ff', 0.14], fire: ['#ff9a60', 0.22], dark: ['#7a5aa0', 0.04] };
const HAZE = { foyer: ['#e7b8f0', '#6e3b8c'], day: ['#f3d8ff', '#8e5ab0'], dusk: ['#ffb7c8', '#6e3b8c'], ball: ['#f0c0f0', '#5a2a74'], hall: ['#6e3b8c', '#1c0c28'], moon: ['#5a5aa8', '#120c2c'], fire: ['#9a4a70', '#1c0c20'], dark: ['#3c1f50', '#0a0410'] };

// ---------------------------------------------------------------------------------------------- the haze
const HAZE_VS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const HAZE_FS = `uniform vec3 uLow, uHigh; uniform float uT, uK; varying vec3 vW;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main(){ vec3 d = normalize(vW - cameraPosition);
  float y = clamp(vW.y / 40.0 * 0.5 + 0.5, 0.0, 1.0);
  float roll = n(vW.xz * 0.06 + vec2(uT * 0.02, uT * 0.013)) * 0.6 + n(vW.xz * 0.15 - vec2(uT * 0.03, 0.0)) * 0.4;
  vec3 c = mix(uLow * (0.7 + 0.5 * roll), uHigh, smoothstep(0.38, 0.75, y));
  gl_FragColor = vec4(c * uK, 1.0); }`;

// ---------------------------------------------------------------------------------------------- the house
export class House {
  constructor(f) { this.f = f; }

  async init() {
    const f = this.f;
    const arena = this.arena = await Arena.load('assets/arenas/rent-free/rent-free.json', f.app.renderer, f.scene, { camera: f.cam.cam });
    arena.prepareCamera(f.cam.cam);
    this.bounds = arena.bounds;
    this.group = new THREE.Group(); this.group.name = 'house'; f.scene.add(this.group);
    this.Y = P.yourMats();
    this.renderer = f.app.renderer;
    this._clip = this.renderer.localClippingEnabled; this.renderer.localClippingEnabled = true;
    this._floorMap();
    // the haze all round the house
    this.hazeU = { uLow: { value: new THREE.Color(HAZE.foyer[0]) }, uHigh: { value: new THREE.Color(HAZE.foyer[1]) }, uT: { value: 0 }, uK: { value: 0.8 } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), new THREE.ShaderMaterial({ uniforms: this.hazeU, vertexShader: HAZE_VS, fragmentShader: HAZE_FS, side: THREE.BackSide, depthWrite: false }));
    sky.layers.enable(LAYER.ARENA); sky.renderOrder = -10; this.group.add(sky); this.sky = sky;
    // lights for characters in the dark rooms (the set takes no real-time light: pools on the floor are decals)
    this.warm = new THREE.PointLight(0xffb060, 0, 9, 1.6); this.warm.position.set(0, 1.6, 0); f.scene.add(this.warm);
    this.cool = new THREE.PointLight(0x9db6ff, 0, 14, 1.2); this.cool.position.set(0, 5, -4); f.scene.add(this.cool);
    // pools of light on the floor (additive decals): candles, the lamp, follow-spots, gobos, window bars, slits
    this.pools = new Pools(this);
    // the rooms
    this.rooms = {};
    this.colliders = [];
    for (const name of ['foyer', 'gallery', 'ballroom', 'hall', 'bedroom', 'below', 'parlour']) this.rooms[name] = this._room(name);
    for (const r of Object.values(this.rooms)) { r.group.visible = false; this.group.add(r.group); }
    this.current = null; this.flying = [];
    this.floors = {};
    for (const [k, map] of [['parquet', parquetTexture()], ['boards', boardsTexture('#7a5236')], ['bedboards', boardsTexture('#9a7050', { rug: [0, -2.4, 6.4, 4.4, '#efe2e8', '#c9a4b8'] })], ['concrete', concreteTexture()], ['blueprint', blueprintTexture()], ['lease', leaseTexture()]]) this.floors[k] = this._overlay(map, k);
    this.signs = [];
    this.t = 0;
    return this;
  }

  // ---------------------------------------------------------------------------------------- floors lit by the bake
  _floorMap() {
    const fl = this.arena.mirrors[0];
    this.floorMesh = fl;
    const g = fl.geometry, P0 = g.attributes.position, U1 = g.attributes.uv1 || g.attributes.uv2;
    fl.updateMatrixWorld(true);
    // fit uv1 = a + b x + c z (an unwrapped plane is affine)
    const v = new THREE.Vector3(); const rows = [];
    for (let i = 0; i < P0.count; i++) { v.fromBufferAttribute(P0, i).applyMatrix4(fl.matrixWorld); rows.push([1, v.x, v.z, U1.getX(i), U1.getY(i)]); }
    const solve = (col) => {
      const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], y = [0, 0, 0];
      for (const r of rows) for (let a = 0; a < 3; a++) { y[a] += r[a] * r[col]; for (let b = 0; b < 3; b++) M[a][b] += r[a] * r[b]; }
      const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      const D = det(M) || 1e-9; const out = [];
      for (let k = 0; k < 3; k++) { const Mk = M.map((row, i) => row.map((x, j) => (j === k ? y[i] : x))); out.push(det(Mk) / D); }
      return out;
    };
    this.uvA = solve(3); this.uvB = solve(4);
    this.floorMat = fl.material;
  }
  // give a floor-level mesh (in world x, z) the bake's light: its uv1 from the fit, a patched material
  litOnFloor(mesh, mat, { mirror = false } = {}) {
    const g = mesh.geometry; mesh.updateMatrixWorld(true);
    const P0 = g.attributes.position, v = new THREE.Vector3();
    const uv1 = new Float32Array(P0.count * 2);
    for (let i = 0; i < P0.count; i++) { v.fromBufferAttribute(P0, i).applyMatrix4(mesh.matrixWorld); uv1[i * 2] = this.uvA[0] + this.uvA[1] * v.x + this.uvA[2] * v.z; uv1[i * 2 + 1] = this.uvB[0] + this.uvB[1] * v.x + this.uvB[2] * v.z; }
    g.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
    this.arena._patch(mat, mirror);
    mesh.material = mat;
    this.arena.mirrors.push(mesh);           // never drawn into the floor's own reflection
    return mesh;
  }
  _overlay(map, name) {
    const geo = new THREE.PlaneGeometry(23.2, 15.2); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshPhysicalMaterial({ map, roughness: name === 'concrete' ? 0.85 : name === 'blueprint' ? 0.6 : 0.16, clearcoat: name === 'parquet' ? 0.6 : 0, clearcoatRoughness: 0.08, envMapIntensity: 0.6, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    if (name === 'blueprint') { mat.emissive = new THREE.Color('#ffffff'); mat.emissiveMap = map; mat.emissiveIntensity = 0.0; }
    // two planes: the front edge as it rolls out over the old floor, and the back edge as it rolls away (to the marble)
    mat.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 9), new THREE.Plane(new THREE.Vector3(0, 0, 1), 9)];
    const m = new THREE.Mesh(geo, mat); m.position.y = 0.002; m.receiveShadow = false; m.renderOrder = 0; m.name = 'floor:' + name;
    this.group.add(m);
    this.litOnFloor(m, mat, { mirror: name === 'parquet' || name === 'boards' || name === 'bedboards' });
    m.visible = false;
    return { mesh: m, mat, plane: mat.clippingPlanes[0], back: mat.clippingPlanes[1] };
  }
  // which floor shows at time t, and how far it has rolled out (front edge z)
  _floorAt(t) {
    const R = (name, t0, beats = 4) => ({ name, t0, dur: beats * 0.3316 });
    // (to a null floor the old one rolls away from the back wall: the ink-in at 118.13 floods forward over two beats)
    const segs = [R(null, 0), R('parquet', 61.13), R('boards', 86.30, 2), R('bedboards', 95.58, 2), R('concrete', 104.87, 0.4), R('blueprint', 112.15, 6), R(null, 118.13, 2), R('parquet', 130.06), R('lease', 164.87, 2), R(null, 168.52, 2), R('parquet', 218.58, 2), R(null, 264.01, 3), R('bedboards', 291.87, 4)];
    // (her death scene changes the room off the clock: its floor comes with it)
    const OF = this.over && this.over.floor; if (OF) segs.push(R(OF.name, OF.t0, OF.beats));
    let cur = segs[0], prev = null;
    for (const s of segs) if (t >= s.t0 - 1e-3) { prev = cur; cur = s; }
    const k = cur.t0 <= (this._jumpT ?? -1) + 0.01 ? 1 : clamp01((t - cur.t0) / cur.dur);
    return { cur, prev: cur === segs[0] ? null : prev, k };
  }
  _updateFloors(t) {
    const { cur, prev, k } = this._floorAt(t);
    for (const [n, o] of Object.entries(this.floors)) {
      const isCur = cur.name === n, isPrev = prev && prev.name === n && k < 1;
      o.mesh.visible = !!(isCur || isPrev);
      o.back.constant = 9;
      if (isCur) o.plane.constant = -7.8 + 15.8 * ease(k);       // rolls out from the back wall to the rail
      else if (isPrev) { o.plane.constant = 9; if (!cur.name) o.back.constant = 7.8 - 15.8 * ease(k); }   // rolls away to the marble
      o.mesh.renderOrder = isCur ? 1 : 0;
      if (isPrev) o.mesh.position.y = 0.001; else o.mesh.position.y = 0.002;
    }
    // the old floor shows under the new one as it rolls; a 'null' floor is the baked marble
    if (this.floors.blueprint.mesh.visible) this.floors.blueprint.mat.emissiveIntensity = 0.55 * (cur.name === 'blueprint' ? ease(k) : 1);
  }

  // ---------------------------------------------------------------------------------------- the flats
  _flats(room, { paper, ink, wain = C.wainscot, dark = 0, stripe = false, seed = 1, backH = H }) {
    const g = new THREE.Group();
    const mats = [];
    const mk = (w, h) => {
      const map = flatTexture({ w, h, paper, ink, wain, dark, stripe, seed: seed + w });
      const m = new THREE.MeshStandardMaterial({ map, roughness: 0.82, emissive: new THREE.Color('#ffffff'), emissiveMap: map, emissiveIntensity: 0.4, envMapIntensity: 0.4 });
      mats.push(m); return m;
    };
    // back flat
    const bw = BX * 2 + 0.4;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(bw, backH), mk(bw, backH)); back.position.set(0, backH / 2, BZ); back.receiveShadow = true; g.add(back);
    const backing = box(bw, backH, 0.3, new THREE.MeshStandardMaterial({ color: '#3a2240', roughness: 0.9 }), 0, backH / 2, BZ - 0.16); backing.castShadow = false; g.add(backing);
    // side flats, cut on the diagonal: 6 m at the back to 1.1 m at the front
    for (const s of [-1, 1]) {
      const shape = new THREE.Shape();
      if (s < 0) { shape.moveTo(7.05, 0); shape.lineTo(-7.0, 0); shape.lineTo(-7.0, 1.1); shape.lineTo(7.05, backH); }
      else { shape.moveTo(-7.05, 0); shape.lineTo(7.0, 0); shape.lineTo(7.0, 1.1); shape.lineTo(-7.05, backH); }
      const sg = new THREE.ShapeGeometry(shape);
      const pa = sg.attributes.position.array, uv = sg.attributes.uv.array;
      for (let i = 0; i < pa.length / 3; i++) { uv[i * 2] = (s < 0 ? 7.05 - pa[i * 3] : pa[i * 3] + 7.05) / 14.05; uv[i * 2 + 1] = pa[i * 3 + 1] / backH; }
      const side = new THREE.Mesh(sg, mk(14.05, backH)); side.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; side.position.x = s * BX; side.receiveShadow = true; g.add(side);
      const ext = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
      const sb = new THREE.Mesh(ext, new THREE.MeshStandardMaterial({ color: '#3a2240', roughness: 0.9 })); sb.rotation.y = side.rotation.y; sb.position.x = s * (BX + 0.31); g.add(sb);
      // the gilt top edge of the cut
      const len = Math.hypot(14.05, backH - 1.1), ang = Math.atan2(backH - 1.1, 14.05);
      const edge = box(0.36, 0.12, len, this.giltMat(), s * (BX + 0.12), (backH + 1.1) / 2, 0.0); edge.rotation.x = -ang * (1) * 1; edge.rotation.x = ang; g.add(edge);
    }
    // the crown molding: a run of ivory vertebrae along the tops ("crown molding on your spine")
    g.add(this._spine(backH));
    // gilded plaster vault ribs springing from the wall tops, curving up out of frame ("vaulted ceilings in your panic")
    g.add(this._ribs(backH));
    room.flatMats = mats;
    return g;
  }
  giltMat() { return this._gilt || (this._gilt = new THREE.MeshStandardMaterial({ color: '#e9b949', metalness: 1, roughness: 0.3, envMapIntensity: 1.2 })); }
  _spine(backH) {
    if (!this._vert) {
      const parts = [];
      const body = new THREE.CylinderGeometry(0.09, 0.1, 0.16, 12); body.rotateX(Math.PI / 2); parts.push(body);
      const wing = new THREE.BoxGeometry(0.34, 0.05, 0.07); wing.translate(0, 0.02, 0); parts.push(wing);
      const spike = new THREE.ConeGeometry(0.05, 0.16, 8); spike.translate(0, 0.12, -0.02); parts.push(spike);
      for (const p of parts) { p.deleteAttribute('uv'); }
      this._vert = mergeGeo(parts);
      this._vertMat = new THREE.MeshStandardMaterial({ color: '#f4ead8', roughness: 0.55, emissive: new THREE.Color('#fff2e0'), emissiveIntensity: 0.12 });
    }
    const pts = [];
    for (let x = -BX + 0.2; x <= BX - 0.2; x += 0.3) pts.push([x, backH + 0.06, BZ + 0.08, 0, 0]);
    for (const s of [-1, 1]) { const n = 48; for (let i = 0; i <= n; i++) { const k = i / n; pts.push([s * (BX - 0.08), backH + 0.06 - (backH - 1.1) * k, -7.0 + 14 * k, s * Math.PI / 2, Math.atan2(backH - 1.1, 14) * -s * 0]); } }
    const im = new THREE.InstancedMesh(this._vert, this._vertMat, pts.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    pts.forEach(([x, y, z, ry], i) => { e.set(0, ry, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); });
    im.castShadow = true;
    return im;
  }
  _ribs(backH) {
    const g = new THREE.Group(), m = this.giltMat();
    for (const x of [-8.5, -3, 3, 8.5]) {
      const c = new THREE.CatmullRomCurve3([new THREE.Vector3(x, backH, BZ + 0.1), new THREE.Vector3(x * 0.95, backH + 3.2, BZ + 1.2), new THREE.Vector3(x * 0.82, backH + 6.5, BZ + 4.0), new THREE.Vector3(x * 0.6, backH + 9.5, BZ + 8.5)]);
      const t = new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.13, 8, false), m); t.castShadow = false; g.add(t);
    }
    return g;
  }

  // ---------------------------------------------------------------------------------------- your things
  _door(w = 1.2, h = 2.4, { double = false, knocker = false, slit = true } = {}) {
    const Y = this.Y, g = new THREE.Group();
    const frameM = new THREE.MeshStandardMaterial({ color: '#f1e8dc', roughness: 0.6 });
    g.add(box(w + 0.3, 0.16, 0.18, frameM, 0, h + 0.08, 0.05));
    for (const s of [-1, 1]) g.add(box(0.15, h, 0.18, frameM, s * (w / 2 + 0.07), h / 2, 0.05));
    const leaves = [];
    const nL = double ? 2 : 1, lw = w / nL;
    for (let i = 0; i < nL; i++) {
      const hinge = new THREE.Group(); const hx = double ? (i === 0 ? -w / 2 : w / 2) : -w / 2;
      hinge.position.set(hx, 0, 0.02);
      const leaf = new THREE.Group(); const dir = double && i === 1 ? -1 : 1;
      leaf.add(box(lw - 0.02, h - 0.02, 0.07, Y.oak, dir * lw / 2, h / 2, 0));
      for (const yy of [0.32, 0.68]) leaf.add(box(lw * 0.7, h * 0.26, 0.02, new THREE.MeshStandardMaterial({ color: '#7a4c28', roughness: 0.55 }), dir * lw / 2, h * yy, 0.045));
      { const kn = cyl(0.035, 0.035, 0.05, Y.brass, dir * (lw - 0.12), h * 0.47, 0.06, 10); kn.rotation.x = Math.PI / 2; leaf.add(kn); }
      if (knocker) { const k = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 20), Y.brass); k.position.set(dir * lw / 2, h * 0.62, 0.07); k.name = 'knocker'; leaf.add(k); }
      hinge.add(leaf); g.add(hinge); leaves.push({ hinge, dir });
    }
    if (slit) { const s = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.06), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.4, 0.6), transparent: true, opacity: 0.9, depthWrite: false })); s.rotation.x = -Math.PI / 2; s.position.set(0, 0.006, 0.12); s.name = 'slit'; g.add(s); g.userData.slit = s; }
    g.userData.leaves = leaves;
    return g;
  }
  // a door in a wall: side 'back' at x, 'left'/'right' at z; returns the door group
  _wallDoor(room, side, at, o = {}) {
    const d = this._door(o.w ?? 1.2, o.h ?? 2.4, o);
    if (side === 'back') d.position.set(at, 0, BZ + 0.02);
    else if (side === 'left') { d.position.set(-BX + 0.02, 0, at); d.rotation.y = Math.PI / 2; }
    else if (side === 'right') { d.position.set(BX - 0.02, 0, at); d.rotation.y = -Math.PI / 2; }
    room.flatsG.add(d);
    return d;
  }
  _window(room, side, at, { w = 1.6, h = 3.4, sill = 1.9, glow = '#fff3dc', moon = false } = {}) {
    const g = new THREE.Group(), fm = new THREE.MeshStandardMaterial({ color: '#f4ece2', roughness: 0.55 });
    const glass = new THREE.MeshBasicMaterial({ color: new THREE.Color(glow).multiplyScalar(1.4) });
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass); pane.position.set(0, sill + h / 2, 0.01); g.add(pane);
    const arch = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 24, 0, Math.PI), glass); arch.position.set(0, sill + h, 0.01); g.add(arch);
    g.add(box(0.08, h, 0.1, fm, 0, sill + h / 2, 0.04)); g.add(box(w, 0.07, 0.1, fm, 0, sill + h * 0.55, 0.04));
    for (const s of [-1, 1]) g.add(box(0.1, h, 0.14, fm, s * w / 2, sill + h / 2, 0.05));
    g.add(box(w + 0.3, 0.1, 0.25, fm, 0, sill - 0.03, 0.1));
    if (moon) { const mo = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.7, 3.2) })); mo.position.set(0.25, sill + h * 0.8, 0.02); g.add(mo); }
    if (side === 'back') g.position.set(at, 0, BZ + 0.02);
    else if (side === 'left') { g.position.set(-BX + 0.02, 0, at); g.rotation.y = Math.PI / 2; }
    else { g.position.set(BX - 0.02, 0, at); g.rotation.y = -Math.PI / 2; }
    g.userData.glass = glass; room.flatsG.add(g); room.windows = room.windows || []; room.windows.push(g);
    return g;
  }
  _col(room, x, z, r, tag = 'yours') { room.cols.push({ type: 'circle', x, z, r, tag }); }
  _colBox(room, x, z, hw, hd, tag = 'yours') { room.cols.push({ type: 'box', x, z, hw, hd, tag }); }
  _sockPlaque(room, sock, text) {
    const [x, z, side] = SOCK[sock]; const p = P.brassPlaque(text);
    if (side === 'back') p.position.set(x, 1.45, BZ + 0.03);        // where her portrait will hang (track.js PH)
    room.flatsG.add(p); room.plaques = room.plaques || {}; room.plaques[sock] = p; return p;
  }
  _console(room, x, z, rot = 0) {
    const Y = this.Y, g = new THREE.Group();
    g.add(box(1.4, 0.06, 0.45, Y.walnut, 0, 0.82, 0));
    for (const sx of [-0.62, 0.62]) for (const sz of [-0.18, 0.18]) g.add(box(0.05, 0.8, 0.05, Y.walnut, sx, 0.4, sz));
    g.position.set(x, 0, z); g.rotation.y = rot; room.floorG.add(g); this._colBox(room, x, z, 0.72, 0.25);
    return g;
  }
  _rug(room, x, z, r, col = '#c97a8a', ink = '#f3d6a0') {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = col; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
    g.strokeStyle = ink; g.lineWidth = 14; g.beginPath(); g.arc(256, 256, 228, 0, 7); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.arc(256, 256, 205, 0, 7); g.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillStyle = ink; g.beginPath(); g.ellipse(256 + Math.cos(a) * 120, 256 + Math.sin(a) * 120, 34, 14, a, 0, 7); g.fill(); }
    g.fillStyle = '#f7e4df'; g.beginPath(); g.arc(256, 256, 60, 0, 7); g.fill();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const geo = new THREE.CircleGeometry(r, 48); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, null); m.position.set(x, 0.006, z); m.userData.decal = true; room.floorG.add(m);
    this.litOnFloor(m, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    return m;
  }

  _room(name) {
    const room = { name, group: new THREE.Group(), cols: [], props: {} };
    room.group.name = 'room:' + name;
    // the flats and what's on them fly; furniture and rugs sink into the floor and rise out of it
    room.flatsG = new THREE.Group(); room.floorG = new THREE.Group(); room.group.add(room.flatsG, room.floorG);
    const Y = this.Y, R = room.floorG, W = room.flatsG;
    if (name === 'foyer') {
      W.add(this._flats(room, { paper: '#f4c9cf', ink: '#e59aaa', seed: 3 }));
      // the front door: oak double doors, a stained-glass fanlight over them, the brass bell box above that
      const d = this._wallDoor(room, 'back', 0, { w: 2.4, h: 3.2, double: true, slit: false });
      room.props.door = d;
      const fan = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40, 0, Math.PI), new THREE.MeshBasicMaterial({ map: fanlightTexture(), color: new THREE.Color(1.6, 1.4, 1.5) }));
      fan.position.set(0, 3.3, BZ + 0.03); W.add(fan); room.props.fan = fan;
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.08, 8, 40, Math.PI), new THREE.MeshStandardMaterial({ color: '#f1e8dc', roughness: 0.6 })); arch.position.set(0, 3.3, BZ + 0.06); W.add(arch);
      const bell = new THREE.Group(); bell.add(box(0.5, 0.36, 0.16, Y.brass, 0, 0, 0)); const ham = box(0.05, 0.22, 0.05, Y.brass, 0.12, 0.08, 0.1); ham.name = 'hammer'; bell.add(ham); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), Y.brass); dome.position.set(-0.08, 0.18, 0.06); bell.add(dome);
      bell.position.set(0, 4.95, BZ + 0.1); W.add(bell); room.props.bell = bell; room.props.hammer = ham;
      // the light behind the door: her silhouette in the fanlight before it opens
      const sil = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.9), new THREE.MeshBasicMaterial({ map: silhouetteTexture(), transparent: true, depthWrite: false, color: new THREE.Color(0.25, 0.1, 0.3) }));
      sil.position.set(0.1, 3.1, BZ + 0.035); W.add(sil); room.props.sil = sil;
      // lilac light, not white: she has to read against it as she poses in the doorway
      const doorway = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.62, 0.26, 0.72) })); doorway.position.set(0, 1.6, BZ + 0.012); W.add(doorway); room.props.doorway = doorway;
      // your coat on its stand; your console with an empty key bowl (you gave her the keys; nobody says so); a round rug
      const cs = new THREE.Group(); cs.add(cyl(0.035, 0.04, 1.9, Y.walnut, 0, 0.95, 0, 10)); cs.add(cyl(0.3, 0.32, 0.05, Y.walnut, 0, 0.03, 0, 16));
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const hk = box(0.24, 0.03, 0.03, Y.brass, Math.cos(a) * 0.1, 1.82, Math.sin(a) * 0.1); hk.rotation.y = -a; cs.add(hk); }
      const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.36, 1.25, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#2f7f7a', roughness: 0.9, side: THREE.DoubleSide })); coat.position.set(0.05, 1.18, 0.12); cs.add(coat);
      cs.position.set(-8.5, 0, -5.6); R.add(cs); this._col(room, -8.5, -5.6, 0.4);
      const con = this._console(room, 7.8, -6.2);
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), Y.brass); bowl.position.y = 1.02; bowl.rotation.x = Math.PI; con.add(bowl);
      room.props.rug = this._rug(room, 0, 0.6, 3.5);
      // party dressing (welcome home): bunting across the back wall and a giant lipstick kiss
      const party = new THREE.Group(); party.visible = false; W.add(party); room.props.party = party;
      const flagCols = ['#c86aff', '#ff8ac8', '#e9b949', '#fbf1e6'];
      for (let row = 0; row < 2; row++) for (let i = 0; i < 26; i++) { const x = -10.4 + i * 0.83, sag = Math.sin(i / 25 * Math.PI) * 0.7; const fl = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 3), new THREE.MeshStandardMaterial({ color: flagCols[(i + row) % 4], roughness: 0.6, emissive: new THREE.Color(flagCols[(i + row) % 4]), emissiveIntensity: 0.25 })); fl.rotation.x = Math.PI; fl.position.set(x, 5.3 - row * 0.9 - sag, BZ + 0.2); party.add(fl); }
      const bigKiss = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.1), new THREE.MeshStandardMaterial({ map: kissTexture(), transparent: true, roughness: 0.3 })); bigKiss.position.set(-5.2, 3.6, BZ + 0.04); bigKiss.rotation.z = 0.2; party.add(bigKiss);
      // the mirror: the back wall turns to glass panel by panel, then bursts
      const mir = new THREE.Group(); W.add(mir); room.props.mirror = mir;
      // (the candles aren't in the reflections, so in the dark the glass reflected nothing and read as purple wall:
      // two pale diagonal sheens on each panel say "mirror")
      const mm = new THREE.MeshStandardMaterial({ color: '#c9c3d8', metalness: 1, roughness: 0.04, envMapIntensity: 1.6, emissive: new THREE.Color('#ffffff'), emissiveMap: mirrorSheen(), emissiveIntensity: 0.4 });
      for (let i = 0; i < 10; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 5.6), mm); p.position.set(-9.9 + i * 2.2, 2.85, BZ + 0.05); p.visible = false; mir.add(p); }
      // candles: twelve in your brass candlesticks
      room.props.candles = this._candles(R);
      room.floor = null;
    } else if (name === 'gallery') {
      W.add(this._flats(room, { paper: '#bfe3cf', ink: '#8fc4ab', seed: 5 }));
      this._sockPlaque(room, 'W1', 'PEACE OF MIND'); this._sockPlaque(room, 'W2', 'SELF-ESTEEM'); this._sockPlaque(room, 'W3', 'JESUS');
      // a paler cross-shaped patch where a crucifix hung, and its nail
      const pale = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8f6ee'), transparent: true, opacity: 0.55, depthWrite: false });
      const cv = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.2), pale); cv.position.set(0, 3.85, BZ + 0.025); W.add(cv);
      const ch = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.2), pale); ch.position.set(0, 4.1, BZ + 0.026); W.add(ch);
      { const nail = cyl(0.012, 0.012, 0.06, Y.iron, 0, 4.42, BZ + 0.05, 6); nail.rotation.x = Math.PI / 2; W.add(nail); }
      // two marble columns flanking JESUS, high windows on the left wall throwing bars of sun
      for (const x of [-2.2, 2.2]) { const c = new THREE.Group(); c.add(cyl(0.3, 0.3, 5.6, Y.marble, 0, 2.9, 0, 24)); c.add(box(0.8, 0.3, 0.8, Y.marble, 0, 0.15, 0)); c.add(box(0.8, 0.3, 0.8, this.giltMat(), 0, 5.85, 0)); c.position.set(x, 0, -6.0); W.add(c); this._col(room, x, -6.0, 0.42); }
      for (const z of [-4.5, -0.5, 3.5]) this._window(room, 'left', z, { w: 1.8, h: 3.3, sill: 1.9 });
      // your console with your brass trophy, engraved CONFIDENCE
      const con = this._console(room, -4.6, -6.4);
      const tro = P.trophy(); tro.position.y = 0.85; con.add(tro); room.props.trophy = tro;
      // your wingback armchair (teal velvet, walnut); two low velvet benches
      const ac = P.armchair(); ac.position.set(-7.8, 0, 0.5); ac.rotation.y = Math.PI / 2; R.add(ac); this._col(room, -7.8, 0.5, 0.55); room.props.armchair = ac;
      for (const x of [-5, 5]) { const b = new THREE.Group(); b.add(box(1.8, 0.2, 0.55, Y.velvet, 0, 0.36, 0)); for (const sx of [-0.8, 0.8]) for (const sz of [-0.2, 0.2]) b.add(box(0.06, 0.28, 0.06, Y.walnut, sx, 0.14, sz)); b.position.set(x, 0, 5.2); R.add(b); this._colBox(room, x, 5.2, 0.92, 0.3); }
      this._wallDoor(room, 'left', -1.5); this._wallDoor(room, 'right', -1.5);
      room.floor = null;
    } else if (name === 'ballroom') {
      W.add(this._flats(room, { paper: '#f4c9cf', ink: '#e8a7b6', seed: 7 }));
      // the back wall: tall mirror panels between gilt pilasters
      const mm = new THREE.MeshStandardMaterial({ color: '#d8d0e6', metalness: 1, roughness: 0.05, envMapIntensity: 1.5 });
      for (let i = 0; i < 6; i++) { const x = -9.2 + i * 3.68; const p = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 4.6), mm); p.position.set(x, 3.2, BZ + 0.03); W.add(p); }
      for (let i = 0; i < 7; i++) { const x = -11.04 + i * 3.68; W.add(box(0.5, 5.6, 0.2, this.giltMat(), x, 2.8, BZ + 0.1)); }
      // three crystal chandeliers overhead
      room.props.chand = [];
      for (const x of [-6, 0, 6]) { const ch = this._chandelier(); ch.position.set(x, 12.5, -1.0); W.add(ch); room.props.chand.push(ch); }
      room.floor = 'parquet';
      // the grand ballroom's follow-spots are pools (this.pools)
      // your bedside lamp on a small walnut table (the one light)
      const lt = P.nightstand(true);
      lt.position.set(1.8, 0, -4.2); lt.visible = false; R.add(lt); room.props.lampTable = lt; this._col(room, 1.8, -4.2, 0.35);
    } else if (name === 'hall') {
      W.add(this._flats(room, { paper: '#8a5a6e', ink: '#6e4458', wain: '#5a3a26', dark: 0.25, seed: 9 }));
      room.doors = {};
      for (const [id, side, at, o] of [['B1', 'back', -6.5], ['B2', 'back', 0], ['B3', 'back', 6.5], ['L1d', 'left', -3.5], ['L2d', 'left', 3.0], ['R1d', 'right', -4.0]]) room.doors[id] = this._wallDoor(room, side, at, { knocker: true });
      // the staircase up the right wall, the cupboard under it (U), facing the room
      const st = new THREE.Group();
      for (let i = 0; i < 14; i++) { const z = 6.0 - i * 0.5; st.add(box(1.4, 0.3 + i * 0.3, 0.5, Y.walnutDark, 9.6, (0.3 + i * 0.3) / 2, z)); }
      { const rail = box(0.08, 0.12, 8.2, Y.walnut, 8.85, 3.4, 2.6); rail.rotation.x = Math.atan2(4.2, 7.0); st.add(rail); }
      W.add(st); this._colBox(room, 9.6, 2.6, 0.75, 3.7);
      const cup = this._door(0.9, 1.6, { knocker: true }); cup.position.set(8.86, 0, 3.6); cup.rotation.y = -Math.PI / 2; W.add(cup); room.doors.U = cup;
      room.doorAt = { B1: [-6.5, -6.4, 0, 1], B2: [0, -6.4, 0, 1], B3: [6.5, -6.4, 0, 1], L1d: [-10.4, -3.5, 1, 0], L2d: [-10.4, 3.0, 1, 0], R1d: [10.4, -4.0, -1, 0], U: [8.3, 3.6, -1, 0] };
      // the cut-outs of her in every doorway (a gag with no hitbox)
      room.cutouts = [];
      const cm = new THREE.MeshBasicMaterial({ map: cutoutTexture(), transparent: true, depthWrite: false, color: new THREE.Color(1.6, 1.3, 1.5) });
      for (const d of Object.values(room.doors)) { const c = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.2), cm); c.position.set(0, 1.1, -0.15); c.visible = false; d.add(c); room.cutouts.push(c); }
      // the brass lantern over the centre
      const lan = new THREE.Group(); lan.add(box(0.36, 0.5, 0.36, new THREE.MeshStandardMaterial({ color: '#ffd59a', emissive: new THREE.Color('#ffb060'), emissiveIntensity: 2.2 }), 0, 0, 0)); lan.add(box(0.44, 0.06, 0.44, Y.brass, 0, 0.28, 0)); lan.add(cyl(0.01, 0.01, 6, Y.brass, 0, 3.3, 0, 4));
      lan.position.set(0, 5.4, 0); W.add(lan);
      room.floor = 'boards';
    } else if (name === 'bedroom') {
      W.add(this._flats(room, { paper: '#a9b6dc', ink: '#8494c4', stripe: true, seed: 11 }));
      const bd = P.bed(); bd.position.set(0, 0, -5.8); R.add(bd); room.props.bed = bd; this._colBox(room, 0, -5.8, 1.12, 1.2);
      const nsL = P.nightstand(false); nsL.position.set(-1.8, 0, -6.5); R.add(nsL); this._col(room, -1.8, -6.5, 0.3);
      const clk = P.carriageClock(); clk.position.set(-1.8, 0.6, -6.5); R.add(clk); room.props.clock = clk;
      const nsR = P.nightstand(true); nsR.position.set(1.8, 0, -6.5); R.add(nsR); this._col(room, 1.8, -6.5, 0.3); room.props.lamp = nsR;
      const ph = P.framedPhoto(); ph.position.set(2.0, 0.6, -6.55); ph.rotation.y = -0.3; R.add(ph); room.props.photo = ph;
      for (const x of [-6.5, 6.5]) this._window(room, 'back', x, { w: 1.6, h: 3.4, sill: 0.8, glow: '#3a4aa0', moon: x > 0 });
      // the sheets, rearranged (they lift and turn over at three a.m.)
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.6, 8, 6), new THREE.MeshStandardMaterial({ color: '#f6eef4', roughness: 0.85, side: THREE.DoubleSide })); sheet.rotation.x = -Math.PI / 2; sheet.position.set(0, 0.64, -5.3); sheet.visible = false; R.add(sheet); room.props.sheet = sheet;
      room.floor = 'bedboards';
    } else if (name === 'below') {
      // the crawlspace: a lattice (yours) the full width; brick piers; pink insulation; then the attic, then a blueprint
      const lat = new THREE.Group();
      const lm = new THREE.MeshStandardMaterial({ color: '#8a6a48', roughness: 0.8 });
      for (let i = 0; i < 46; i++) { const x = -11 + i * 0.5; const s1 = box(0.06, 2.6, 0.06, lm, x, 1.25, -4.6); s1.rotation.z = 0.6; lat.add(s1); const s2 = box(0.06, 2.6, 0.06, lm, x, 1.25, -4.62); s2.rotation.z = -0.6; lat.add(s2); }
      lat.add(box(22.4, 0.12, 0.14, lm, 0, 2.4, -4.6)); lat.add(box(22.4, 0.12, 0.14, lm, 0, 0.06, -4.6));
      R.add(lat); room.props.lattice = lat;
      room.cols.push({ type: 'box', x: 0, z: -4.75, hw: 11.2, hd: 0.15, tag: 'lattice', until: 112.8 });
      for (const x of [-6.5, 6.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 1.0), brickMat()); p.position.set(x, 0.7, 0.5); p.castShadow = p.receiveShadow = true; R.add(p); this._colBox(room, x, 0.5, 0.5, 0.5); }
      const tuft = new THREE.MeshStandardMaterial({ color: '#f39ab8', roughness: 1 });
      const R2 = rng(4);
      for (let i = 0; i < 40; i++) { const x = -11 + R2() * 22, z = 4.7 + R2() * 0.6; const s = new THREE.Mesh(new THREE.SphereGeometry(0.25 + R2() * 0.25, 8, 6), tuft); s.position.set(x, 0.1, z); s.scale.y = 0.6; R.add(s); }
      for (const sx of [-1, 1]) for (let i = 0; i < 10; i++) { const z = -4 + i; const s = new THREE.Mesh(new THREE.SphereGeometry(0.3 + R2() * 0.2, 8, 6), tuft); s.position.set(sx * (10.8 + R2() * 0.3), 0.1, z); s.scale.y = 0.6; R.add(s); }
      this._colBox(room, 0, 4.85, 11.2, 0.25, 'tufts');
      // the attic: your tea chests along the walls, stencilled; a round window
      const att = new THREE.Group(); att.visible = false; R.add(att); room.props.attic = att;
      for (const [x, z, t] of [[-9.6, -2.5, 'PHOTOS'], [-9.6, 1.5, 'HER THINGS'], [9.6, -2.0, "DON'T"], [9.6, 2.2, 'PHOTOS']]) { const c = P.teaChest(t); c.position.set(x, 0, z); c.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; att.add(c); }
      const rw = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2.6) })); rw.position.set(0, 4.2, -7.0); att.add(rw);
      room.floor = 'concrete';
    } else if (name === 'parlour') {
      W.add(this._flats(room, { paper: '#f2d7c2', ink: '#e2b89e', seed: 13 }));
      // your marble fireplace in the right wall, the fire lit
      const fp = new THREE.Group();
      fp.add(box(0.5, 2.0, 2.6, Y.marble, 0, 1.0, 0)); fp.add(box(0.7, 0.18, 3.0, Y.marble, -0.1, 2.05, 0));
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), new THREE.MeshBasicMaterial({ color: '#120808' })); hole.rotation.y = -Math.PI / 2; hole.position.set(-0.26, 0.62, 0); fp.add(hole);
      // (a warm glow, not a white blot: at the fire state's exposure the old 3.2 bloomed over a third of the picture)
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 10, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.6, 0.15), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); fire.position.set(-0.32, 0.5, 0); fp.add(fire); room.props.fire = fire;
      fp.position.set(BX - 0.3, 0, -2.0); W.add(fp); this._colBox(room, BX - 0.35, -2.0, 0.4, 1.4);
      for (const z of [-4.2, 0.4]) { const ac = P.armchair(); ac.position.set(7.4, 0, z); ac.rotation.y = Math.PI / 2 + (z < 0 ? -0.5 : 0.5); R.add(ac); this._col(room, 7.4, z, 0.55); }
      R.add(box(1.0, 0.4, 0.6, Y.walnut, 6.2, 0.2, -1.9)); this._colBox(room, 6.2, -1.9, 0.5, 0.3);
      this._rug(room, 6.6, -1.9, 3.0, '#7a3a4e', '#e9b949');
      // three brass hook rails on the bare back wall (her key racks come down onto them)
      for (const x of [-6.5, 0, 6.5]) W.add(box(2.6, 0.08, 0.1, Y.brass, x, 1.95, BZ + 0.06));     // (low enough for the camera)
      this._wallDoor(room, 'left', -1.5);
      room.floor = null;
    }
    return room;
  }
  _chandelier() {
    const g = new THREE.Group(), Y = this.Y;
    g.add(cyl(0.012, 0.012, 3, Y.brass, 0, 1.5, 0, 4));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 8, 32), Y.brass); ring.rotation.x = Math.PI / 2; g.add(ring);
    const cm = new THREE.MeshStandardMaterial({ color: '#fff8f0', emissive: new THREE.Color('#ffdcae'), emissiveIntensity: 1.6, roughness: 0.1, metalness: 0.2 });
    const drop = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.07, 0), cm, 36);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 36; i++) { const a = i / 18 * Math.PI * 2, r = i < 18 ? 0.9 : 0.55; m4.makeTranslation(Math.cos(a) * r, -0.25 - (i % 3) * 0.12, Math.sin(a) * r); drop.setMatrixAt(i, m4); }
    g.add(drop);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), cm); core.position.y = -0.3; g.add(core);
    return g;
  }
  _candles(R) {
    const Y = this.Y, g = new THREE.Group(); g.visible = false; R.add(g);
    const flameM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 1.9, 0.6) });
    const pos = [[-7.5, -5.5], [-3.5, -5.8], [3.5, -5.8], [7.5, -5.5], [-9.5, -1.5], [9.5, -1.5], [-9.5, 3.0], [9.5, 3.0], [-4.0, 5.0], [4.0, 5.0], [-1.5, -3.5], [1.5, -3.5]];
    const list = [];
    for (const [x, z] of pos) {
      const c = new THREE.Group(); c.add(cyl(0.12, 0.16, 0.06, Y.brass, 0, 0.03, 0, 12)); c.add(cyl(0.025, 0.04, 0.8, Y.brass, 0, 0.43, 0, 8)); c.add(cyl(0.08, 0.05, 0.05, Y.brass, 0, 0.85, 0, 10));
      c.add(cyl(0.04, 0.04, 0.22, new THREE.MeshStandardMaterial({ color: '#f6eedc', roughness: 0.5 }), 0, 0.98, 0, 10));
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), flameM); fl.scale.set(1, 2.2, 1); fl.position.y = 1.14; fl.name = 'flame'; c.add(fl);
      c.position.set(x, 0, z); g.add(c); list.push({ c, fl, x, z });
    }
    return { g, list };
  }

  // ---------------------------------------------------------------------------------------- going places
  // the room at time t, instantly (a rewind, a practice start), or by flying the flats (the song moving on)
  goTo(room, { t = this.f.t, instant = false } = {}) {
    const name = room === 'party' || room === 'crowded' || room === 'dark' ? 'foyer' : room === 'grand' ? 'ballroom' : room;
    const next = this.rooms[name];
    if (!next) return;
    if (this.current === next && !instant) return;
    if (instant || !this.current) {
      for (const r of Object.values(this.rooms)) { r.group.visible = r === next; r.group.position.y = 0; this._rest(r, 1); }
      this.flying.length = 0;
    } else {
      const prev = this.current;
      this.flying = this.flying.filter((fl) => fl.room !== prev && fl.room !== next);
      if (name === 'below') {
        // the floor gives way: the bedroom shoots up past the camera fast, the crawlspace rises from below
        this.flying.push({ room: prev, t0: t, t1: t + 0.45, from: 0, to: 18, out: true, fast: true, whole: true });
        next.group.visible = true; this._rest(next, 0); next.group.position.y = -3;
        this.flying.push({ room: next, t0: t + 0.05, t1: t + 0.34, from: -3, to: 0, out: false, quiet: true, whole: true });
      } else if (prev.name === 'below') {
        prev.group.visible = false; this._rest(prev, 1);
        next.group.visible = true; this._rest(next, 1);
      } else {
        this.flying.push({ room: prev, t0: t, t1: t + 0.5, from: prev.flatsG.position.y, to: 11, out: true, props: 0.28 });
        next.group.visible = true; this._rest(next, 0); next.flatsG.position.y = 11;
        this.flying.push({ room: next, t0: t + 0.1, t1: t + 0.62, from: 11, to: 0, out: false, props: 0.36 });
        this.snd && this.snd('rf-wires', { x: 0, gain: 0.5, rate: 2.2 });
      }
    }
    this.current = next;
    this.colliders = next.cols;
  }
  // furniture on its lift: 0 sunk into the floor, 1 standing (rugs unroll)
  _rest(room, k) {
    room.group.position.y = 0; room.flatsG.position.y = 0;
    const e = k <= 0 ? 0.001 : k >= 1 ? 1 : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
    for (const o of room.floorG.children) { if (o.userData.decal) o.scale.set(Math.max(0.001, Math.min(1, k)), 1, Math.max(0.001, Math.min(1, k))); else o.scale.set(1, Math.max(0.001, e), 1); }
  }
  _updateFlying(t, dt) {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const fl = this.flying[i]; const k = clamp01((t - fl.t0) / (fl.t1 - fl.t0));
      if (t < fl.t0) continue;
      const e = fl.out ? k * k : 1 - Math.pow(1 - k, 3);
      const y = fl.from + (fl.to - fl.from) * e;
      if (fl.whole) fl.room.group.position.y = y; else fl.room.flatsG.position.y = y;
      if (fl.props !== undefined) {
        // her lift: furniture sinks as the flats go, rises once they've landed
        const kp = fl.out ? 1 - clamp01((t - fl.t0) / fl.props) : clamp01((t - fl.t1 + 0.08) / fl.props);
        this._rest(fl.room, kp); if (fl.whole) fl.room.group.position.y = y; else fl.room.flatsG.position.y = y;
      }
      if (k >= 1 && (fl.props === undefined || fl.out || t >= fl.t1 - 0.08 + fl.props)) {
        this.flying.splice(i, 1);
        if (fl.out) { fl.room.group.visible = false; this._rest(fl.room, 1); }
        else { this._rest(fl.room, 1); if (!fl.quiet) this.landed(fl.room); }
      }
    }
  }
  landed(room) {
    const f = this.f;
    f.cam.shake(0.3, 0.12);
    for (let x = -10; x <= 10; x += 2.5) f.fx.dust(x, -6.6, 3, new THREE.Color(0.85, 0.75, 0.8));
    for (let z = -6; z <= 5; z += 2.5) { f.fx.dust(-10.6, z, 2, new THREE.Color(0.85, 0.75, 0.8)); f.fx.dust(10.6, z, 2, new THREE.Color(0.85, 0.75, 0.8)); }
    this.snd && this.snd('rf-thud', { x: 0, gain: 0.8 });
  }
  setSnd(fn) { this.snd = fn; }

  // ---------------------------------------------------------------------------------------- her eviction (death.js)
  // Her death scene takes the house off the song's clock: the room it wants (the foyer and its front door) flies in to
  // land at `land`, whatever room the song is in; the scene works the front door (doorK: 0 shut .. 1 open), the light
  // (over.light(t) -> { a, b, k, ex }) and the floor itself. sceneClear() gives the house back to the song.
  sceneRoom(name, { t = this.t, land = t + 0.6, instant = false } = {}) {
    const next = this.rooms[name]; if (!next) return;
    const O = this.over || (this.over = {});
    O.room = name;
    if (this.current === next) return;
    // the floor rolls back to the marble under the old room as it goes
    O.floor = { name: next.floor, t0: instant ? t - 9 : t, beats: 1 };
    if (instant || !this.current) { this.goTo(name, { t, instant: true }); return; }
    const prev = this.current, d = Math.max(0.12, land - t);
    this.flying = this.flying.filter((fl) => fl.room !== prev && fl.room !== next);
    this.flying.push({ room: prev, t0: t, t1: t + Math.min(0.5, d * 0.9), from: prev.flatsG.position.y, to: 11, out: true, props: Math.min(0.28, d * 0.75) });
    next.group.visible = true; this._rest(next, 0); next.flatsG.position.y = 11;
    this.flying.push({ room: next, t0: t + d * 0.25, t1: land, from: 11, to: 0, out: false, props: 0.3, quiet: true });
    this.snd && this.snd('rf-wires', { x: 0, gain: 0.5, rate: 2.4 });
    this.current = next; this.colliders = next.cols;
  }
  sceneClear() {
    this.over = null; this.doorK = null;
    for (const s of this.signs || []) s.out = undefined;
  }
  // a sampler goes up into the flies with the room it hung in
  signOut(text, t = this.t) { for (const s of this.signs) if (s.text === text && s.out === undefined) s.out = t; }

  // ---------------------------------------------------------------------------------------- the hall of doors
  doorPoint(id) { const d = this.rooms.hall.doorAt[id]; return { x: d[0], z: d[1], nx: d[2], nz: d[3] }; }
  // a knock: the knocker jumps, the latch rattles, the slit of light under the door flares
  knock(id, t) {
    const d = this.rooms.hall.doors[id]; if (!d) return;
    d.traverse((o) => { if (o.name === 'knocker') { const k0 = o.rotation.x; this.anims.push({ t0: t, t1: t + 0.22, fn: (k) => { o.rotation.x = k0 - Math.sin(k * Math.PI) * 0.8; } }); } });
    const sl = d.userData.slit; if (sl) this.anims.push({ t0: t, t1: t + 0.5, fn: (k) => { sl.material.color.setRGB(2.2 + 4 * (1 - k), 1.4 + 2.6 * (1 - k), 0.6 + 1.2 * (1 - k)); } });
  }
  // a door bangs open (and swings back)
  doorOpen(id, t, hold = 0.6) {
    const d = this.rooms.hall.doors[id]; if (!d) return;
    for (const lf of d.userData.leaves) this.anims.push({ t0: t, t1: t + 0.12 + hold + 0.3, fn: (k) => { const u = (k * (0.42 + hold)); const o = u < 0.12 ? u / 0.12 : u < 0.12 + hold ? 1 : Math.max(0, 1 - (u - 0.12 - hold) / 0.3); lf.hinge.rotation.y = lf.dir * -1.6 * o; } });
  }
  // "It's me, everywhere!": all seven doors open on cut-outs of her, backlit; they slam shut
  doorsOpen(t0, t1, cutouts = true) {
    const R = this.rooms.hall;
    for (const id of Object.keys(R.doors)) this.doorOpen(id, t0, Math.max(0.05, t1 - t0 - 0.12));
    if (cutouts) { for (const c of R.cutouts) c.visible = true; this.anims.push({ t0, t1: t1 + 0.2, fn: (k) => { if (k >= 1) for (const c of R.cutouts) c.visible = false; } }); }
  }
  // every slit of light flares and goes out (the third knock comes from no door)
  slits(t, mode) {
    for (const d of Object.values(this.rooms.hall.doors)) { const sl = d.userData.slit; if (!sl) continue; this.anims.push({ t0: t, t1: t + 0.6, fn: (k) => { const v = mode === 'out' ? (k < 0.25 ? 1 + k * 8 : Math.max(0, 1 - (k - 0.25) * 2.2)) : 1; sl.material.color.setRGB(2.2 * v, 1.4 * v, 0.6 * v); } }); }
  }

  // ---------------------------------------------------------------------------------------- the set's events
  event(name, f, o = {}) {
    const R = this.rooms;
    if (name === 'plaques') { ['W1', 'W2', 'W3'].forEach((k, i) => { const p = R.gallery.plaques && R.gallery.plaques[k]; if (!p) return; const m = p.material[4]; this.anims.push({ t0: f.t + i * 0.11, t1: f.t + i * 0.11 + 0.45, fn: (q) => { m.emissiveIntensity = Math.sin(q * Math.PI) * 1.4; } }); }); }
    if (name === 'trophyUp') { const tr = R.gallery.props.trophy; if (tr) { const x0 = -4.6, z0 = -6.4; this.anims.push({ t0: f.t, t1: f.t + 0.3, fn: (q) => { tr.position.y = 0.85 + q * 1.2; if (q >= 1) tr.visible = false; } }); f.fx.glitter(x0, 1.2, z0, new THREE.Color(3, 2.2, 0.7), 14, 0.4); } }
    if (name === 'bell') { const h = R.foyer.props.hammer; this.anims.push({ t0: f.t, t1: f.t + 0.18, fn: (k) => { h.rotation.z = Math.sin(k * Math.PI) * 0.9; } }); R.foyer.props.fan.material.color.setRGB(2.6, 2.2, 2.4); this.anims.push({ t0: f.t, t1: f.t + 0.3, fn: (k) => R.foyer.props.fan.material.color.setRGB(1.6 + 1.0 * (1 - k), 1.4 + 0.8 * (1 - k), 1.5 + 0.9 * (1 - k)) }); }
  }

  // ---------------------------------------------------------------------------------------- per frame
  update(dt, t, f) {
    this.t = t;
    const A = this.arena, O = this.over;
    const L0 = O && O.light ? O.light(t, lightAt(t)) : lightAt(t);
    A.setState(L0.a, L0.b, L0.k);
    // the room that should be up (a jump in time puts it there at once); her death scene can ask for its own
    const want = O && O.room ? O.room : roomAt(t);
    const jump = this._lastT === undefined || Math.abs(t - this._lastT) > 0.5;
    if (jump) this._jumpT = t;
    if (!this.current || this.current.name !== want) this.goTo(want, { t, instant: jump || !this.current });
    this._lastT = t;
    this._updateFlying(t, dt);
    this._updateFloors(t);
    this._dress(t, dt, f);
    // the flats' painted light, the haze's tint
    const ga = GLOW[L0.a], gb = GLOW[L0.b];
    const gc = new THREE.Color(ga[0]).lerp(new THREE.Color(gb[0]), L0.k), gi = ga[1] + (gb[1] - ga[1]) * L0.k;
    for (const r of Object.values(this.rooms)) if (r.group.visible && r.flatMats) for (const m of r.flatMats) { m.emissive.copy(gc); m.emissiveIntensity = gi * (this.flatDim ?? 1); }
    if (this._vertMat) this._vertMat.emissiveIntensity = gi * 0.4;
    const ha = HAZE[L0.a], hb = HAZE[L0.b];
    this.hazeU.uLow.value.set(ha[0]).lerp(new THREE.Color(hb[0]), L0.k); this.hazeU.uHigh.value.set(ha[1]).lerp(new THREE.Color(hb[1]), L0.k); this.hazeU.uT.value = t;
    A.update(dt, f.cam.cam, f.player.root.position);
    f.app.post.fx.exposure = A.exposure * L0.ex * (this.exMul ?? 1);
    this.pools.update(t, dt);
    for (let i = this.anims.length - 1; i >= 0; i--) { const a = this.anims[i]; if (t < a.t0) continue; const k = clamp01((t - a.t0) / Math.max(1e-3, a.t1 - a.t0)); a.fn(k); if (k >= 1) this.anims.splice(i, 1); }
  }
  get anims() { return this._anims || (this._anims = []); }

  // dressing that follows song time (what's lit, open, shown) so any moment can be reconstructed
  _dress(t, dt, f) {
    const R = this.rooms;
    // the foyer: the door opens at 2.73; the doorway glows; her silhouette in the fanlight until then
    const fo = R.foyer.props;
    // (her death scene works the door itself: doorK is how far open it stands, set every frame, no easing)
    const scened = this.doorK !== null && this.doorK !== undefined;
    const open = scened ? this.doorK : t >= 2.73 && t < 6.06 ? clamp01((t - 2.73) / 0.4) : t >= 6.06 && t < 10.7 ? 1 - clamp01((t - 6.06) / 0.25) : 0;
    for (const lf of fo.door.userData.leaves) lf.hinge.rotation.y = lf.dir * -1.75 * (scened ? open : ease(open));
    fo.doorway.visible = open > 0.02;
    fo.sil.visible = t < 2.73;
    fo.party.visible = t >= 168.52 && t < 176.48;
    const cand = fo.candles;
    const candOn = t >= 196.36 && t < 218.58;
    cand.g.visible = candOn;
    if (candOn) {
      let k = clamp01((t - 196.36) / 1.0);
      if (t >= 205.97 && t < 206.63) k *= 0.1;               // "breath": the candles gutter
      if (t >= 214.93) k = 1 + clamp01((t - 214.93) / 2.6) * 0.8;
      for (const c of cand.list) { const fl = 0.85 + 0.15 * Math.sin(t * 17 + c.x * 3) * Math.sin(t * 11 + c.z); c.fl.scale.set(1, 2.2 * k * fl, 1); c.fl.visible = k > 0.15; }
      this.candleK = k;
    } else this.candleK = 0;
    const mir = fo.mirror; const mk = t >= 214.93 && t < 217.91 ? clamp01((t - 214.93) / 2.65) : 0;
    mir.children.forEach((p, i) => { p.visible = mk * 10 > i; });
    if (t >= 86.3 && t < 92.9 && R.hall.group.visible && !this._slitsOn) { this._slitsOn = true; for (const d of Object.values(R.hall.doors)) { const sl = d.userData.slit; if (sl) sl.material.color.setRGB(2.2, 1.4, 0.6); } }
    if (t < 86.3 || t >= 95.6) this._slitsOn = false;
    const tro = R.gallery.props.trophy; if (tro) { tro.visible = !(t >= 33.6 && t < 61.13); if (t < 33.27 || t >= 61.13) tro.position.y = 0.85; }
    // the ballroom: chandeliers dim with the mold, the lamp table for the sickest part
    const ba = R.ballroom.props;
    ba.lampTable.visible = t >= 217.58 && t < 264.01;
    // the bedroom: the clock's dial flashes on the strikes (the bells are the song)
    const be = R.bedroom.props;
    const strikes = [102.53, 102.87, 103.21];
    const dk = strikes.reduce((m, s) => Math.max(m, t >= s ? Math.max(0, 1 - (t - s) / 0.25) : 0), 0);
    be.clock.traverse((o) => { if (o.name === 'dial') o.material.emissiveIntensity = dk * 4; });
    be.sheet.visible = t >= 101.87 && t < 104.87;
    if (be.sheet.visible) { const k = clamp01((t - 101.87) / 2.4); be.sheet.position.y = 0.64 + Math.sin(k * Math.PI) * 1.6; be.sheet.rotation.x = -Math.PI / 2 + k * Math.PI; }
    const lampOn = !this.lampOut && ((t >= 95.58 && t < 104.87) || (t >= 291.87 && t < 304.81) || (t >= 249.41 && t < 264.01));   // lampOut: the finish popped it
    const shade = (o) => o.traverse((m) => { if (m.name === 'shade') m.material.emissiveIntensity = lampOn ? 1.2 : 0; if (m.name === 'bulb') m.visible = lampOn; });
    shade(be.lamp); shade(ba.lampTable);
    be.photo.rotation.x = t >= 101.22 && t < 104.87 ? -Math.PI / 2 + 0.05 : 0;      // laid face down
    // the attic dressing, then the blueprint (everything else drains to paper)
    const below = R.below.props;
    below.attic.visible = t >= 109.83 && t < 118.13;
    const blue = t >= 112.15 && t < 118.13;
    below.lattice.visible = !(t >= 112.8 && t < 118.13);
    if (R.below.group.visible) R.below.group.traverse((o) => { if (o.isMesh && o !== below.lattice && o.material && o.material.color && !o.userData.keep) { if (!o.userData.c0) o.userData.c0 = o.material.color.clone(); o.material.color.copy(blue ? new THREE.Color('#1a3e86') : o.userData.c0); } });
    // "in every corner": violet glints open in the corners as the dark falls; three are painted eyes, one is her
    if (!this.glints) {
      const gm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.0, 3.2) });
      this.glints = [[10.2, -6.3], [-10.2, 5.2], [10.2, 5.2]].map(([x, z]) => { const g = new THREE.Group(); for (const dx of [-0.07, 0.07]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), gm); e.position.set(dx, 0, 0); e.scale.set(1.6, 0.7, 1); g.add(e); } g.position.set(x, 1.75, z); g.lookAt(0, 1.75, 0); this.group.add(g); return g; });
    }
    const gOn = t >= 195.68 && t < 201.0;
    this.glints.forEach((g, i) => { g.visible = gOn && Math.sin(t * 2.1 + i * 2.3) > -0.85; g.scale.y = gOn ? Math.min(1, (t - 195.68 - i * 0.2) * 4) : 0.01; });
    // the parlour's fire
    const pa = R.parlour.props;
    pa.fire.scale.set(1, 0.85 + 0.25 * Math.sin(t * 13) * Math.sin(t * 7.3), 1);
    // lights for characters in the dark rooms
    const dark = (t >= 104.87 && t < 112.15) ? 0.6 : candOn ? 1.6 * Math.min(1, this.candleK) : (t >= 249.41 && t < 255.71) ? 1.0 : (t >= 264.01 && t < 291.87) ? 1.0 : (t >= 86.3 && t < 95.58) ? 0.7 : 0;
    this.warm.intensity = dark * 6;
    // (the fireside's: up at the mantel, not a metre over the floor, where it burned a white hot spot beside the fire)
    if (t >= 249.41 && t < 255.71) this.warm.position.set(1.8, 1.6, -4.2); else if (t >= 264.01 && t < 291.87) this.warm.position.set(9.2, 2.2, -2.2); else if (t >= 86.3 && t < 95.58) this.warm.position.set(0, 4.5, 0); else this.warm.position.set(f.player.x, 2.4, f.player.z + 1.2);
    this.cool.intensity = (t >= 95.58 && t < 118.13) || t >= 291.87 ? 4 : 0;
    // (out of the moonlit bedroom with her death scene: the moon's fill on the two of you goes with it)
    if (this.over && this.over.room && this.over.room !== 'bedroom') this.cool.intensity = this.over.cool ?? 0;
    this.flatDim = t >= 249.41 && t < 255.71 ? 0.2 : 1;
  }

  // ---------------------------------------------------------------------------------------- the floor plane
  resolve(x, z, r) {
    let p = this.arena.resolve(x, z, r);
    x = p.x; z = p.z;
    for (const c of this.extraCols && this.extraCols.length ? this.colliders.concat(this.extraCols) : this.colliders) {
      if (c.until !== undefined && this.t >= c.until) continue;
      if (c.type === 'circle') { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-5) { x = c.x + dx / d * m; z = c.z + dz / d * m; } }
      else { const lx = x - c.x, lz = z - c.z, hw = c.hw + r, hd = c.hd + r; if (Math.abs(lx) < hw && Math.abs(lz) < hd) { if (hw - Math.abs(lx) < hd - Math.abs(lz)) x = c.x + Math.sign(lx || 1) * hw; else z = c.z + Math.sign(lz || 1) * hd; } }
    }
    return { x, z };
  }
  // a strike on your things: a dull thud and a puff of dust, never a ghost-hit
  // (measured to the nearest point of the thing: the crawlspace's lattice and tufts run the room's whole width, and
  // measured from their middles every strike in the room thudded)
  strikeYours(x, z, ang, range, arc) {
    for (const c of this.colliders) {
      if (c.until !== undefined && this.t >= c.until) continue;
      let px, pz;
      if (c.type === 'circle') { const ox = x - c.x, oz = z - c.z, l = Math.hypot(ox, oz) || 1, k = Math.min(l, c.r) / l; px = c.x + ox * k; pz = c.z + oz * k; }
      else { px = Math.max(c.x - c.hw, Math.min(c.x + c.hw, x)); pz = Math.max(c.z - c.hd, Math.min(c.z + c.hd, z)); }
      const dx = px - x, dz = pz - z, d = Math.hypot(dx, dz);
      if (d > range * 0.8) continue;
      const a = Math.atan2(dx, dz); if (d > 0.4 && Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang))) > arc) continue;
      this.snd && this.snd('rf-thud', { x: px, gain: 0.85 });
      this.f.fx.dust(x + Math.sin(ang) * 1.2, z + Math.cos(ang) * 1.2, 6, new THREE.Color(0.8, 0.72, 0.66));
      return true;
    }
    return false;
  }
  // a stitched sampler on a wire: drops in as the line is sung, settles on its last word
  sampler(text, x, y, z, w, t0, t1, until, lines = null) {
    const g = new THREE.Group();
    const h = w * 420 / 1024;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: samplerTexture(text, { lines }), roughness: 0.95, emissive: new THREE.Color('#ffffff'), emissiveMap: samplerTexture(text, { lines }), emissiveIntensity: 0.25 }));
    g.add(m);
    const fr = this.giltMat();
    for (const [ww, hh, xx, yy] of [[w + 0.16, 0.08, 0, h / 2 + 0.04], [w + 0.16, 0.08, 0, -h / 2 - 0.04], [0.08, h, -w / 2 - 0.04, 0], [0.08, h, w / 2 + 0.04, 0]]) g.add(box(ww, hh, 0.06, fr, xx, yy, 0.02));
    for (const s of [-1, 1]) g.add(cyl(0.006, 0.006, 8, this.Y.brass, s * w * 0.35, h / 2 + 4, 0, 4));
    g.position.set(x, y + 8, z); this.group.add(g);
    const s = { g, x, y, z, t0, t1, until, text };
    this.signs.push(s);
    return s;
  }
  updateSigns(t) {
    for (const s of this.signs) {
      const on = t >= s.t0 - 0.01 && t < s.until && !(s.out !== undefined && t >= s.out + 0.4);
      s.g.visible = on;
      if (!on) continue;
      const k = clamp01((t - s.t0) / Math.max(0.05, s.t1 - s.t0));
      const e = 1 - Math.pow(1 - k, 3);
      s.g.position.y = s.y + 8 * (1 - e) + (k >= 1 ? Math.sin((t - s.t1) * 6) * 0.04 * Math.exp(-(t - s.t1) * 2) : 0);
      s.g.rotation.z = Math.sin(t * 1.3 + s.x) * 0.02 * (1 - e * 0.6);
      // (flown out with its room: up its wires)
      if (s.out !== undefined && t >= s.out) { const u = clamp01((t - s.out) / 0.4); s.g.position.y += 11 * u * u; }
    }
  }
  dispose() {
    this.f.scene.remove(this.group, this.warm, this.cool);
    this.pools.dispose();
    this.renderer.localClippingEnabled = this._clip;
    this.arena.dispose();
  }
}

// ---------------------------------------------------------------------------------------------- pools of light on the floor
// additive glows laid on the floor (they read as light on the baked set, which takes no real-time light)
class Pools {
  constructor(house) {
    this.h = house; const f = house.f;
    this.mat = new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1, 0.7, 0.4) });
    this.list = [];
    this.group = new THREE.Group(); f.scene.add(this.group);
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    this.geo = geo;
    this.bars = new THREE.Mesh(new THREE.PlaneGeometry(22, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: barsTexture('slits'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0.26, 0.16, 0.06) }));
    this.bars.position.y = 0.02; this.bars.visible = false; this.bars.rotation.y = 0.5; this.group.add(this.bars);
    for (const L of [this.group, this.bars]) L.layers.enable(LAYER.NO_REFLECT);
  }
  pool(color = '#ffb060') { const m = new THREE.Mesh(this.geo, this.mat.clone()); m.material.color.set(color); m.position.y = 0.025; m.renderOrder = 3; m.layers.set(LAYER.NO_REFLECT); this.group.add(m); return m; }
  update(t, dt) {
    const h = this.h;
    if (!this.cand) {
      this.cand = h.rooms.foyer.props.candles.list.map((c) => { const p = this.pool('#ffb060'); p.position.set(c.x, 0.025, c.z); p.scale.set(2.3, 1, 2.3); return p; });
      this.lamp = this.pool('#ffd8a0'); this.lamp.scale.set(10, 1, 10);
      this.spots = [0, 1, 2, 3].map(() => { const p = this.pool('#ffe6b8'); p.scale.set(4, 1, 4); return p; });
      this.gobos = Array.from({ length: 14 }, (_, i) => { const p = this.pool(i % 2 ? '#ff7ac8' : '#ffd27a'); p.scale.set(1.2, 1, 1.2); return p; });
      this.attic = this.pool('#b7c6ff'); this.attic.scale.set(5, 1, 4); this.attic.position.set(0, 0.025, -3.6);
    }
    const ck = h.candleK || 0;
    for (const p of this.cand) { p.visible = ck > 0.02; p.material.opacity = Math.min(1.4, ck) * (0.36 + 0.07 * Math.sin(t * 13 + p.position.x)); }
    // the one light: your lamp at (+1.8, -4.2), a pool of r 5
    const one = t >= 249.41 && t < 255.71;
    this.lamp.visible = one; if (one) { this.lamp.position.set(1.8, 0.025, -4.2); const flick = (t > 253.04 && t < 253.2) || (t > 253.7 && t < 253.86) ? 0.4 : 1; this.lamp.material.opacity = 0.42 * flick; }
    // the grand ballroom's four follow-spots sweeping
    const grand = (t >= 218.58 && t < 249.41) || (t >= 255.71 && t < 264.01);
    this.spots.forEach((p, i) => { p.visible = grand; if (grand) { const a = t * 0.6 + i * Math.PI / 2; p.position.set(Math.sin(a) * 6.5, 0.026, Math.cos(a * 1.3) * 3.5); p.material.opacity = 0.35; } });
    // the party: gobo dots turning on the beat
    const party = t >= 168.52 && t < 176.48;
    const beat = Math.floor((t - 168.52) / 0.3316);
    this.gobos.forEach((p, i) => { p.visible = party; if (party) { const a = i / 14 * Math.PI * 2 + beat * 0.22; const r = 3 + (i % 3) * 2.2; p.position.set(Math.cos(a) * r, 0.026, Math.sin(a) * r * 0.6); p.material.opacity = 0.45; } });
    // the crawlspace: hot slits of light through the floorboards above
    this.bars.visible = t >= 104.87 && t < 109.83; if (this.bars.visible) this.bars.material.opacity = clamp01((t - 105.21) / 0.3);
    this.attic.visible = t >= 109.83 && t < 112.15; this.attic.material.opacity = 0.35;
  }
  dispose() { this.h.f.scene.remove(this.group); }
}

// ---------------------------------------------------------------------------------------------- small textures
let _fan = null, _sil = null, _cut = null, _brick = null, _sheen = null;
// a mirror panel's sheen: black (adds nothing) but for two soft diagonal streaks of pale lilac light and a thin bright one
function mirrorSheen() {
  if (_sheen) return _sheen;
  const c = document.createElement('canvas'); c.width = 128; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 512);
  const streak = (x0, w, a) => { const gr = g.createLinearGradient(x0, 0, x0 + w, 0); gr.addColorStop(0, 'rgba(150,140,190,0)'); gr.addColorStop(0.5, `rgba(150,140,190,${a})`); gr.addColorStop(1, 'rgba(150,140,190,0)'); g.save(); g.translate(64, 256); g.rotate(-0.42); g.translate(-64, -256); g.fillStyle = gr; g.fillRect(x0, -200, w, 912); g.restore(); };
  streak(-10, 46, 0.55); streak(52, 12, 0.8); streak(86, 30, 0.35);
  _sheen = new THREE.CanvasTexture(c); _sheen.colorSpace = THREE.SRGBColorSpace; return _sheen;
}
function fanlightTexture() {
  if (_fan) return _fan;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  const cols = ['#c86aff', '#ff8ac8', '#e9b949', '#ffb3e6', '#8e3fd0', '#ffd27a'];
  for (let i = 0; i < 12; i++) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(256, 256); g.arc(256, 256, 256, Math.PI + i / 12 * Math.PI, Math.PI + (i + 1) / 12 * Math.PI); g.closePath(); g.fill(); }
  g.fillStyle = '#ffe6a0'; g.beginPath(); g.arc(256, 256, 70, Math.PI, 0); g.fill();
  g.strokeStyle = '#3a2a20'; g.lineWidth = 6; for (let i = 0; i <= 12; i++) { const a = Math.PI + i / 12 * Math.PI; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.cos(a) * 256, 256 + Math.sin(a) * 256); g.stroke(); }
  g.beginPath(); g.arc(256, 256, 70, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(256, 256, 180, Math.PI, 0); g.stroke();
  _fan = new THREE.CanvasTexture(c); _fan.colorSpace = THREE.SRGBColorSpace; return _fan;
}
function silhouetteTexture() {
  if (_sil) return _sil;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.beginPath(); g.ellipse(64, 46, 30, 30, 0, 0, 7); g.fill(); g.fillRect(52, 70, 24, 20); g.beginPath(); g.moveTo(28, 90); g.lineTo(100, 90); g.lineTo(112, 256); g.lineTo(16, 256); g.fill();
  g.beginPath(); g.moveTo(96, 96); g.lineTo(124, 40); g.lineTo(116, 36); g.lineTo(90, 92); g.fill();
  _sil = new THREE.CanvasTexture(c); return _sil;
}
function cutoutTexture() {
  if (_cut) return _cut;
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#f0d8ff'); gr.addColorStop(1, '#a050d8');
  g.fillStyle = '#f0e2c0'; g.beginPath(); g.ellipse(128, 70, 62, 56, 0, 0, 7); g.fill();
  g.fillStyle = '#f7e4df'; g.beginPath(); g.ellipse(128, 96, 36, 44, 0, 0, 7); g.fill();
  g.fillStyle = '#c0102a'; g.beginPath(); g.ellipse(128, 118, 12, 6, 0, 0, 7); g.fill();
  g.fillStyle = gr; g.beginPath(); g.moveTo(70, 150); g.lineTo(186, 150); g.lineTo(220, 500); g.lineTo(36, 500); g.closePath(); g.fill();
  g.fillStyle = '#e9b949'; g.fillRect(84, 250, 88, 14);
  g.strokeStyle = '#3a1a40'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 506);
  _cut = new THREE.CanvasTexture(c); _cut.colorSpace = THREE.SRGBColorSpace; return _cut;
}
function brickMat() {
  if (_brick) return _brick;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); const R = rng(8);
  g.fillStyle = '#d8c8b8'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = -64; x < 256; x += 64) { const o = (y / 32) % 2 ? 32 : 0; g.fillStyle = `hsl(${8 + R() * 10},${45 + R() * 15}%,${36 + R() * 10}%)`; g.fillRect(x + o + 2, y + 2, 60, 28); }
  _brick = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), roughness: 0.9 }); _brick.map.colorSpace = THREE.SRGBColorSpace; return _brick;
}
function mergeGeo(parts) {
  // a tiny merge for non-indexed and indexed BufferGeometries with position + normal
  let n = 0, ni = 0; for (const p of parts) { n += p.attributes.position.count; ni += p.index ? p.index.count : p.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), idx = new Uint32Array(ni); let o = 0, oi = 0;
  for (const p of parts) { pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3); if (p.index) { for (let i = 0; i < p.index.count; i++) idx[oi + i] = p.index.array[i] + o; oi += p.index.count; } else { for (let i = 0; i < p.attributes.position.count; i++) idx[oi + i] = o + i; oi += p.attributes.position.count; } o += p.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1)); return g;
}
