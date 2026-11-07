// The set: a Saturday-morning cereal commercial shot on a breakfast table the size of a town square. The baked
// part (tools/arena/arenas/try-me-free.py: the tiled table, the shelf riser, the record's boxes, the bowl, the TV)
// and everything real-time on top of it: the gingham tablecloth (it burns, gets wet, and is pulled off), her
// box's window, the trapdoor pieces, the cover heaps, the work light of the darks, the marks of THE CUT, the TV.
// Every state is derived from the song time (setStateAt), so rewinds and ?at= put the commercial back.
import * as THREE from 'three';
import { Arena, LAYER } from '../../game/arena.js';
import * as P from './paint.js';
import { DARKS, inDark, darkStart, lightAt, CUTS, cutAt, PIECES, T1, T2, T3, GUILTY, PULL, FIRE, PUDDLE, FREEZE, BRIDGE } from './times.js';
import { setExpr } from './prize.js';
import { Sound } from './sound.js';
import { STUNTS } from './stunts.js';
import { DRESSING } from './dressing.js';

const clamp01 = (k) => Math.max(0, Math.min(1, k));
const clampZ = (z) => Math.max(-6.2, Math.min(6.5, z));
const FEEL_R = 0.42;
const _C = new THREE.Color(), _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
// a telegraph whose fill follows fill(t) while it's live (see moves.liveTele)
function liveTeleS(f, o) {
  const g = f.tele.add({ shape: o.shape, x: o.x, z: o.z, angle: o.angle || 0, w: o.w, h: o.h, param: o.param, kind: o.kind || 'white', start: f.t, end: f.t + 1, follow: o.follow });
  if (g.dead) return g;
  let landed = null;
  const F = () => Math.max(1e-3, Math.min(1, o.fill(f.t)));
  Object.defineProperty(g, 'start', { get: () => (landed !== null ? landed - 0.3 : f.t - 0.1), set() {} });
  Object.defineProperty(g, 'end', { get: () => (landed !== null ? landed : f.t - 0.1 + 0.1 / F()), set() {} });
  g.land = (t) => { landed = t; };
  return g;
}
const ease = (k) => k * k * (3 - 2 * k);
const easeOut = (k) => 1 - (1 - k) * (1 - k) * (1 - k);
const BOUNDS = { minX: -11.4, maxX: 11.0, minZ: -6.7, maxZ: 7.0 };
const BOWL = { x: -25.5, z: 0, r: 15.5 };
export const BOX = { x: 0, z: -8.8, w: 7, h: 12, d: 3, base: 1.2, win: { w: 2.6, h: 3.0, wy: 0.3 } };   // her box
export const INBOX = { x: 0, y: BOX.base + BOX.win.wy, z: -8.15 };   // where she stands in her packaging
export const P1 = { x: -6.5, z: 2.5 }, P2 = { x: 6.5, z: 2.5 };

// exposure per baked state (the open set takes the full sun: exposure x mean light ~ 0.3-0.45, like the kit's sample)
const EXPO = { offair: 1.6, commercial: 0.34, court: 0.7, funeral: 1.1, suburb: 1.3, tile: 0.23, sunset: 1.25 };
// a light state as the lite base shows it (and the characters' fill tint in the baked one)
const LOOK = {
  offair: { key: 0x000000, k: 0, hemi: 0x0b0d1a, h: 0.05, sky: ['#05060c', '#0b0d1a'] },
  commercial: { key: 0xfff1e0, k: 2.6, dir: [-0.45, 0.8, 0.4], hemi: 0xbfe0ff, h: 0.8, sky: ['#3a9cff', '#ffe4c8'] },
  court: { key: 0xffc98a, k: 2.5, dir: [0.5, 0.75, -0.2], hemi: 0xff3a5a, h: 0.35, sky: ['#5a0a12', '#ffb84a'] },
  funeral: { key: 0xffb060, k: 2.2, dir: [-0.3, 0.45, 0.85], hemi: 0xb8a0ff, h: 0.4, sky: ['#120818', '#c88a4a'] },
  suburb: { key: 0x9ab8ff, k: 1.8, dir: [-0.6, 0.7, -0.3], hemi: 0xffb070, h: 0.3, sky: ['#0a1430', '#3a4a8a'] },
  tile: { key: 0xf2f8ff, k: 2.6, dir: [0, 1, 0.15], hemi: 0xcfe6ff, h: 0.7, sky: ['#3a8ad8', '#bfe4f8'] },
  sunset: { key: 0xff9a6a, k: 2.5, dir: [0.5, 0.35, 0.8], hemi: 0xffd84a, h: 0.45, sky: ['#1a1a7a', '#ff8a6a'] },
};

// ---------------------------------------------------------------- the tablecloth's shader
const CLOTH_PARS = /* glsl */`
uniform float uTime, uPullT, uScorch, uWetX, uBurnOn, uFlare;
uniform vec4 uFire;      // x, z, start, speed
uniform vec4 uPuddle;    // x, z, r, gold rim on
uniform vec4 uWork;      // x, y, z, intensity
varying vec3 vClothW;
float clothHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;
const CLOTH_VERT = /* glsl */`
{
  vec4 wq = modelMatrix * vec4(transformed, 1.0);
  float k = clamp(uPullT / 0.35, 0.0, 1.0);
  if (uPullT > 0.0) {
    float e = k * k;
    float z0 = wq.z;
    wq.z += e * 26.0 + sin(k * 3.14159) * 0.4;
    wq.y += (0.34 + 0.32 * sin(z0 * 0.9 - k * 14.0)) * sin(k * 3.14159) + k * 0.6;
    if (wq.z > 7.5) wq.y -= (wq.z - 7.5) * 0.85;
    transformed = (inverse(modelMatrix) * wq).xyz;
  }
  vClothW = wq.xyz;
}
`;
const CLOTH_FRAG = /* glsl */`
{
  // the fire: square by square along the check, from where she dropped the match
  vec2 sq = floor(vClothW.xz / 0.8) * 0.8 + 0.4;
  float dFire = length(sq - uFire.xy);
  float inPuddle = step(length(vClothW.xz - uPuddle.xy), uPuddle.z + 0.2);
  float lit = uBurnOn * step(uFire.z + dFire / uFire.w, uTime) * (1.0 - step(length(sq - uPuddle.xy), uPuddle.z + 0.45));
  float edge = 1.0 - smoothstep(0.0, 0.07, min(min(fract(vClothW.x / 0.8), 1.0 - fract(vClothW.x / 0.8)), min(fract(vClothW.z / 0.8), 1.0 - fract(vClothW.z / 0.8))));
  float flick = 0.6 + 0.4 * sin(uTime * 23.0 + clothHash(sq) * 40.0) * sin(uTime * 7.0 + clothHash(sq + 3.1) * 9.0);
  // scorched: brown char, blistered
  vec2 cq = vClothW.xz * 2.3; vec2 ci = floor(cq), cf = fract(cq); cf = cf * cf * (3.0 - 2.0 * cf);
  float ch = mix(mix(clothHash(ci), clothHash(ci + vec2(1, 0)), cf.x), mix(clothHash(ci + vec2(0, 1)), clothHash(ci + vec2(1, 1)), cf.x), cf.y);
  vec3 burnt = mix(vec3(0.16, 0.07, 0.03), vec3(0.42, 0.22, 0.09), ch * 0.6 + 0.2 * sin(vClothW.x * 3.0 + vClothW.z * 2.0));
  float sc = uScorch * (1.0 - step(length(vClothW.xz - uPuddle.xy), uPuddle.z + 0.35)) * smoothstep(0.0, 1.0, 1.0 - dFire / 40.0 + 0.6);
  diffuseColor.rgb = mix(diffuseColor.rgb, burnt * diffuseColor.rgb * 1.6 + burnt * 0.5, clamp(sc, 0.0, 1.0) * 0.85);
  // milk on the table: whiter, wetter
  float wet = 1.0 - smoothstep(uWetX - 0.5, uWetX + 0.2, vClothW.x);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.96, 0.95, 0.92), wet * 0.35);
  vClothFire = vec3(lit, edge, flick);
  vClothWet = wet;
}
`;

export async function buildSet(f) { const s = new CerealSet(f); await s.load(); return s; }

export class CerealSet {
  constructor(f) {
    this.f = f; this.group = new THREE.Group(); this.group.name = 'cereal-set'; f.scene.add(this.group);
    this.t = 0; this.lastT = -1; this.dark = false; this.stateName = '';
    this.pieces = {}; this.breakables = []; this.marks = []; this.cutouts = [];
    this.fxList = []; this.rings = []; this.movers = [];
    this.sound = new Sound(f);
  }

  async load() {
    const f = this.f;
    try {
      this.arena = await Arena.load('assets/arenas/try-me-free/try-me-free.json', f.app.renderer, f.scene, { camera: f.cam.cam });
      this.arena.prepareCamera(f.cam.cam);
      this.arena.setState('offair');
    } catch (e) { console.warn('try-me-free: no baked set yet, the lite one:', e.message); this.arena = null; }
    if (!this.arena) this._lite();
    this._cloth();
    this._herBox();
    this._pieces();
    this._heaps();
    this._worklight();
    this._marks();
    this._cyclorama();
    this._dressing();
    const self = this;
    this.world = {
      arena: this.arena, bounds: { ...BOUNDS },
      room: this.arena ? this.arena.room : { min: new THREE.Vector3(-12, 0, -8), max: new THREE.Vector3(12, 14, 8) },
      resolve: (x, z, r) => self.resolve(x, z, r),
      strikeArc: (x, z, ang, range, arc, s, ff) => self.strikeArc(x, z, ang, range, arc, s),
      update: (dt, t, ff) => self.update(ff, dt, t),
      dispose: () => self.dispose(),
    };
  }

  // ---------------------------------------------------------------- the lite base (until the bake exists)
  _lite() {
    const g = new THREE.Group(); this.group.add(g); this.lite = g;
    // the bare table: white porcelain tile
    const [c, x] = P.canvas(256, 256); x.fillStyle = '#c9cfd4'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#f7f9fb'; x.fillRect(4, 4, 248, 248);
    const tt = P.tex(c, { repeat: [60 / 0.6, 30 / 0.6] });
    this.tileMat = new THREE.MeshPhysicalMaterial({ map: tt, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), this.tileMat); floor.rotation.x = -Math.PI / 2; floor.position.set(-12, -0.01, -5); floor.receiveShadow = true; g.add(floor);
    // the shelf riser and its price strip
    const white = new THREE.MeshPhysicalMaterial({ color: 0xf4f0ea, roughness: 0.5 });
    const riser = new THREE.Mesh(new THREE.BoxGeometry(46, 1.2, 6), white); riser.position.set(11.3, 0.6, -10); riser.receiveShadow = true; g.add(riser);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(46, 0.32), new THREE.MeshStandardMaterial({ map: P.priceStrip(), roughness: 0.4 })); strip.position.set(11.3, 0.9, -6.99); g.add(strip);
    // the bowl's wall
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(BOWL.r, BOWL.r - 0.6, 2.8, 96, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xfbf8f2, roughness: 0.12, clearcoat: 1, side: THREE.DoubleSide }));
    bowl.position.set(BOWL.x, 1.4, BOWL.z); g.add(bowl);
    const milk = new THREE.Mesh(new THREE.CircleGeometry(BOWL.r - 0.3, 96), new THREE.MeshPhysicalMaterial({ color: 0xf6f4ee, roughness: 0.15, clearcoat: 1 }));
    milk.rotation.x = -Math.PI / 2; milk.position.set(BOWL.x, 2.2, BOWL.z); g.add(milk);
    // the record's boxes
    const boxes = [['ppg', -6.0], ['ifyd', 6.5], ['msayf', 12], ['rent', 17.5]];
    for (const [k, bx] of boxes) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(4.5, 10, 2.5), [0, 0, 0, 0, 1, 0].map((i) => (i ? new THREE.MeshPhysicalMaterial({ map: P.recordBox(k), roughness: 0.35, clearcoat: 0.4 }) : new THREE.MeshPhysicalMaterial({ color: P.BOXES[k].bg, roughness: 0.4 }))));
      m.position.set(bx, 1.2 + 5, -7.6 - 1.25); g.add(m);
    }
    // light
    this.key = new THREE.DirectionalLight(0xffffff, 2); this.key.castShadow = true; this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, near: 1, far: 60 }); this.key.shadow.bias = -0.0004;
    this.hemi = new THREE.HemisphereLight(0xbfe0ff, 0x402020, 0.6);
    g.add(this.key, this.key.target, this.hemi);
  }

  // ---------------------------------------------------------------- the gingham tablecloth
  _cloth() {
    const x0 = -14.5, x1 = 11.5, z0 = -7.0, z1 = 7.5, nx = 104, nz = 58;
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz); geo.rotateX(-Math.PI / 2); geo.translate((x0 + x1) / 2, 0.004, (z0 + z1) / 2);
    // world-aligned UVs: 1.6 m per gingham repeat (0.8 m checks)
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 1.6, -pos.getZ(i) / 1.6);
    const map = P.gingham(); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(1, 1);
    const U = this.clothU = {
      uTime: { value: 0 }, uPullT: { value: 0 }, uScorch: { value: 0 }, uWetX: { value: -99 }, uBurnOn: { value: 0 }, uFlare: { value: 0 },
      uFire: { value: new THREE.Vector4(-3, -2, 1e9, FIRE.speed) }, uPuddle: { value: new THREE.Vector4(PUDDLE.x, PUDDLE.z, PUDDLE.r, 0) }, uWork: { value: new THREE.Vector4(0, 4, 0, 0) },
    };
    const mat = this.clothMat = new THREE.MeshPhysicalMaterial({ map, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.22, envMapIntensity: 0.8 });
    if (this.arena) {
      // the cloth takes the floor's baked light: its lightmap UVs from the floor's (an affine map of x, z)
      const fl = this.arena.meshes.find((m) => /tile_floor/.test(m.name) && m.geometry.attributes.uv1);
      if (fl) {
        const fit = affineFit(fl);
        const uv1 = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) { const X = pos.getX(i), Z = pos.getZ(i); uv1[i * 2] = fit[0] * X + fit[1] * Z + fit[2]; uv1[i * 2 + 1] = fit[3] * X + fit[4] * Z + fit[5]; }
        geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
        this.floorMesh = fl;
        fl.material.color.setRGB(0.3, 0.32, 0.36); fl.material.roughness = 0.03; fl.material.clearcoat = 1; fl.material.clearcoatRoughness = 0.02;
        this.arena._patch(mat, true);
      }
    }
    const base = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (base) base(sh, r);
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + CLOTH_PARS)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + CLOTH_VERT);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + CLOTH_PARS + '\nvec3 vClothFire; float vClothWet;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n' + CLOTH_FRAG)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.05, vClothWet);')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          {
            float lit = vClothFire.x, edge = vClothFire.y, fl = vClothFire.z;
            totalEmissiveRadiance += lit * (vec3(1.25, 1.45, 1.8) * (0.22 + 0.25 * edge) + vec3(2.6, 0.9, 0.25) * edge * fl * 0.9) * (1.0 + uFlare * 0.9);
            float pd = length(vClothW.xz - uPuddle.xy);
            totalEmissiveRadiance += vec3(3.0, 1.9, 0.5) * uPuddle.w * (1.0 - smoothstep(0.0, 0.09, abs(pd - uPuddle.z - 0.12))) * 1.4;
            vec3 wl = uWork.xyz - vClothW; float wd = length(wl);
            totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.62, 0.3) * uWork.w * 3.2 / (1.0 + wd * wd * 0.45) * smoothstep(7.5, 2.0, wd);
          }`);
    };
    mat.customProgramCacheKey = () => 'tmf-cloth' + (this.arena ? '-arena' : '');
    const cloth = this.cloth = new THREE.Mesh(geo, mat); cloth.receiveShadow = true; cloth.name = 'tablecloth'; cloth.frustumCulled = false;
    this.group.add(cloth);
    if (this.arena && this.arena.mirrors) this.arena.mirrors.push(cloth);
    // the rolled hems along the right and front edges (part of the cloth)
    const hemMap = P.gingham(); hemMap.repeat.set(16, 0.25); const hemMat = new THREE.MeshPhysicalMaterial({ map: hemMap, roughness: 0.3, clearcoat: 0.5 });
    const hems = new THREE.Group();
    const hr = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, z1 - z0, 16, 1), hemMat); hr.rotation.x = Math.PI / 2; hr.position.set(11.5, 0.1, (z0 + z1) / 2); hems.add(hr);
    const hf = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, x1 - x0 + 0.35, 16, 1), hemMat); hf.rotation.z = Math.PI / 2; hf.position.set((x0 + x1) / 2 + 0.17, 0.1, 7.5); hems.add(hf);
    hems.traverse((o) => { o.castShadow = false; o.receiveShadow = true; });
    this.hems = hems; this.group.add(hems);
    // the coffee puddle she planted
    const pm = new THREE.MeshPhysicalMaterial({ color: 0x2a1206, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.95 });
    const pg = new THREE.CircleGeometry(PUDDLE.r, 48); const pp = pg.attributes.position;
    for (let i = 1; i < pp.count; i++) { const a = Math.atan2(pp.getY(i), pp.getX(i)); const k = 1 + 0.12 * Math.sin(a * 3 + 1) + 0.07 * Math.sin(a * 7); pp.setXY(i, pp.getX(i) * k, pp.getY(i) * k); }
    this.puddle = new THREE.Mesh(pg, pm); this.puddle.rotation.x = -Math.PI / 2; this.puddle.position.set(PUDDLE.x, 0.012, PUDDLE.z); this.puddle.visible = false;
    this.puddle.layers.set(LAYER.NO_REFLECT); this.group.add(this.puddle);
  }

  // ---------------------------------------------------------------- her box: the window she stands in, in the dark
  _herBox() {
    const g = this.boxG = new THREE.Group(); g.position.set(BOX.x, BOX.base, BOX.z + BOX.d / 2); this.group.add(g);   // pivot: the bottom front edge
    // the printed front (with the window cut out), a hair proud of the baked box
    const front = new THREE.Mesh(new THREE.PlaneGeometry(BOX.w, BOX.h), new THREE.MeshPhysicalMaterial({ map: P.heroBox({ win: BOX.win }), transparent: true, alphaTest: 0.5, roughness: 0.32, clearcoat: 0.5 }));
    front.position.set(0, BOX.h / 2, 0.012); g.add(front); this.boxFront = front;
    if (!this.arena) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(BOX.w, BOX.h, BOX.d), new THREE.MeshPhysicalMaterial({ color: 0xffd21a, roughness: 0.4 }));
      body.position.set(0, BOX.h / 2, -BOX.d / 2 - 0.01); g.add(body);
      // the hole: the lite box is solid, so carve a dark interior box in front of it
    }
    // the inside of the window: a display tray (sky and clouds), the cold tube
    const ww = BOX.win.w, wh = BOX.win.h, wy = BOX.win.wy;
    const inner = new THREE.Group(); inner.position.set(0, wy, 0); g.add(inner);
    const tray = new THREE.Mesh(new THREE.PlaneGeometry(ww + 0.4, wh + 0.4), new THREE.MeshStandardMaterial({ map: P.trayArt(), roughness: 0.6 }));
    tray.position.set(0, wh / 2, -1.25); inner.add(tray); this.tray = tray;
    const sideM = new THREE.MeshStandardMaterial({ color: 0xffe9a8, roughness: 0.7, side: THREE.DoubleSide });
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, wh + 0.4), sideM); w.rotation.y = -s * Math.PI / 2; w.position.set(s * (ww / 2 + 0.2), wh / 2, -0.62); inner.add(w); }
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(ww + 0.4, 1.3), sideM); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -0.62); inner.add(fl);
    const roof = fl.clone(); roof.rotation.x = Math.PI / 2; roof.position.y = wh + 0.2; inner.add(roof);
    this.tube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, ww - 0.2, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5.6, 6.4) }));
    this.tube.rotation.z = Math.PI / 2; this.tube.position.set(0, wh + 0.05, -0.3); inner.add(this.tube);
    this.tubeLight = { intensity: 0 };   // the bake's off-air key is this tube: it lights her in real time
    // cellophane over the window: a faint iridescent sheet
    const cel = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1, depthWrite: false }));
    cel.position.set(0, wy + wh / 2, 0.02); g.add(cel); this.cello = cel;
    // marquee bulbs round its edge, chasing
    const n = 64, bulbs = this.bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
    const per = 2 * (BOX.w + BOX.h); const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      let d = (i / n) * per, x, y;
      if (d < BOX.w) { x = -BOX.w / 2 + d; y = BOX.h - 0.15; } else if ((d -= BOX.w) < BOX.h) { x = BOX.w / 2 - 0.15; y = BOX.h - d; } else if ((d -= BOX.h) < BOX.w) { x = BOX.w / 2 - d; y = 0.15; } else { d -= BOX.w; x = -BOX.w / 2 + 0.15; y = d; }
      m4.makeTranslation(x, y, 0.06); bulbs.setMatrixAt(i, m4); bulbs.setColorAt(i, new THREE.Color(0, 0, 0));
    }
    g.add(bulbs);
  }

  // ---------------------------------------------------------------- set pieces from the trapdoors
  _pieces() {
    const lac = (c, r = 0.16, glow = 0) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, clearcoat: 1, clearcoatRoughness: 0.05, emissive: c, emissiveIntensity: glow });
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xf0c860, metalness: 1, roughness: 0.25 });
    const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe8edf2, metalness: 1, roughness: 0.08 });
    const box = (w, h, d, m, x = 0, y = h / 2, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
    const mk = (name, at, col, build) => { const g = new THREE.Group(); g.position.set(at.x, -3, at.z); build(g); g.visible = false; this.group.add(g); this.pieces[name] = { g, at: { ...at }, col, up: 0 }; return g; };
    // a lacquer slab with a thin gold edge (from the high camera the tops are most of what shows: they read as the
    // piece's colour, not as a gold lid)
    const slab = (w, h, d, m, x, y, z, e = 0.05) => {
      const s = new THREE.Group(); s.position.set(x, y, z);
      s.add(box(w - 2 * e, h, d - 2 * e, m, 0, 0));
      for (const sx of [-1, 1]) s.add(box(e, h + 0.01, d, gold, sx * (w / 2 - e / 2), 0));
      for (const sz of [-1, 1]) s.add(box(w, h + 0.01, e, gold, 0, 0, sz * (d / 2 - e / 2)));
      return s;
    };
    // the judge's bench: red lacquer, gold trim, a printed seal
    mk('bench', T1, { type: 'box', hx: 1.5, hz: 0.8 }, (g) => {
      const red = lac(0xe0102c, 0.12, 0.1);
      g.add(box(3, 1.3, 1.6, red)); g.add(slab(3.1, 0.12, 1.7, red, 0, 1.36)); g.add(box(3.2, 0.12, 1.8, gold, 0, 0.06)); for (const x of [-1.2, 1.2]) g.add(box(0.12, 1.2, 0.05, gold, x, 0.66, 0.81));
      const seal = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshStandardMaterial({ map: P.badgeTex(), transparent: true, alphaTest: 0.5 })); seal.position.set(0, 0.7, 0.81); g.add(seal);
    });
    mk('lectern', T1, { type: 'box', hx: 0.75, hz: 0.5 }, (g) => {
      const black = lac(0x16101a); g.add(box(1.3, 1.4, 0.9, black)); const top = slab(1.5, 0.12, 1.1, black, 0, 1.45, 0); top.rotation.x = -0.25; g.add(top);
    });
    mk('casket', T2, { type: 'box', hx: 1.2, hz: 0.6 }, (g) => {
      g.add(box(2.4, 0.8, 1.1, lac(0x0d0a0c))); g.add(box(2.2, 0.06, 0.95, lac(0xff8ab0, 0.5), 0, 0.8));
      const lid = box(2.4, 0.1, 1.1, lac(0x0d0a0c), 0, 1.35, -0.5); lid.rotation.x = -1.1; g.add(lid);
      for (const x of [-0.8, 0, 0.8]) g.add(box(0.3, 0.06, 1.2, gold, x, 0.4));
    });
    mk('bar', T3, { type: 'box', hx: 1.0, hz: 0.5 }, (g) => {
      g.add(box(2.0, 0.06, 0.9, chrome, 0, 0.9)); g.add(box(2.0, 0.06, 0.9, chrome, 0, 0.35));
      for (const x of [-0.95, 0.95]) for (const z of [-0.4, 0.4]) g.add(box(0.05, 0.9, 0.05, chrome, x, 0.45, z));
      for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.42, 14), new THREE.MeshPhysicalMaterial({ color: i % 2 ? 0xffffff : 0xffa21a, roughness: 0.1, clearcoat: 1 })); b.position.set(-0.7 + i * 0.35, 1.14, 0); g.add(b); }
    });
    mk('mug', T3, { type: 'circle', r: 0.95 }, (g) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.75, 1.5, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xfbf8f2, roughness: 0.1, clearcoat: 1, side: THREE.DoubleSide, emissive: 0xfbf8f2, emissiveIntensity: 0.22 })); m.position.y = 0.75; g.add(m);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 40), lac(0xe8202e)); rim.rotation.x = Math.PI / 2; rim.position.y = 1.5; g.add(rim);
      const cof = new THREE.Mesh(new THREE.CircleGeometry(0.8, 32), new THREE.MeshPhysicalMaterial({ color: 0x2a1206, roughness: 0.05, clearcoat: 1 })); cof.rotation.x = -Math.PI / 2; cof.position.y = 1.3; g.add(cof); g.userData.coffee = cof;
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.09, 10, 24, Math.PI * 1.2), new THREE.MeshPhysicalMaterial({ color: 0xfbf8f2, roughness: 0.1, clearcoat: 1, emissive: 0xfbf8f2, emissiveIntensity: 0.22 })); h.position.set(0.95, 0.8, 0); h.rotation.z = -Math.PI * 0.6; g.add(h);
    });
    mk('guestbook', T2, { type: 'box', hx: 0.5, hz: 0.4 }, (g) => {
      g.add(box(0.12, 1.1, 0.12, gold, 0, 0.55)); const tp = box(0.9, 0.06, 0.7, lac(0x0d0a0c), 0, 1.15); tp.rotation.x = -0.4; g.add(tp);
      const pg = box(0.8, 0.02, 0.6, new THREE.MeshStandardMaterial({ color: 0xfff6ee }), 0, 1.2); pg.rotation.x = -0.4; g.add(pg);
    });
    // two courtroom pews at x +-7, z -4..+2
    for (const s of [-1, 1]) {
      mk('pew' + (s < 0 ? 'L' : 'R'), { x: 7 * s, z: -1 }, { type: 'box', hx: 0.5, hz: 3 }, (g) => {
        const red = lac(0xe0102c, 0.12, 0.1); g.add(box(1, 0.5, 6, red)); g.add(box(0.15, 1.1, 6, red, -0.45 * s, 0.55)); for (const ex of [-0.5, 0.5]) g.add(box(0.05, 0.03, 6.05, gold, ex, 0.505)); g.add(box(0.18, 0.05, 6.05, gold, -0.45 * s, 1.12));
      });
    }
  }
  pieceUp(name, t) {
    // 0 (down) .. 1 (up): rises 0.8 s from its time, sinks 0.6 s at its end; gone at once in a dark
    const key = name.startsWith('pew') ? 'pews' : name;
    let k = 0;
    for (const [a, b] of PIECES[key] || []) {
      if (t < a || t >= b + 0.6) continue;
      const end = DARKS.some((d) => Math.abs(d[0] - b) < 0.02);
      k = Math.max(k, t < b ? easeOut(clamp01((t - a) / 0.8)) : end ? 0 : 1 - ease(clamp01((t - b) / 0.6)));
    }
    return k;
  }

  // ---------------------------------------------------------------- cover: heaps of giant frosted loops
  _heaps() {
    const cols = [0xff3a4a, 0xffd21a, 0xff8a1a, 0xa85aff, 0x3ab8ff, 0xff6ab0];
    const loopGeo = new THREE.TorusGeometry(0.36, 0.17, 14, 28);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 });
    for (const [name, at] of [['P1', P1], ['P2', P2]]) {
      const n = 22, im = new THREE.InstancedMesh(loopGeo, mat, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), rnd = P.rng(name === 'P1' ? 5 : 9);
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.95, h = (1 - r / 1.05) * 0.85 + rnd() * 0.15;
        q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3));
        m4.compose(new THREE.Vector3(Math.cos(a) * r, 0.15 + h, Math.sin(a) * r), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m4);
        im.setColorAt(i, new THREE.Color(cols[i % cols.length]));
      }
      im.castShadow = im.receiveShadow = true;
      const g = new THREE.Group(); g.position.set(at.x, 0, at.z); g.add(im); this.group.add(g);
      this.breakables.push({ name, g, at, r: 1.1, hp: 3, max: 3, alive: true, color: new THREE.Color(2.6, 1.6, 1.4), kind: 'heap' });
    }
    // mail-in parcels (S6): one-hit cover until the dark
    const card = new THREE.MeshPhysicalMaterial({ color: 0xc8955a, roughness: 0.7 });
    const tape = new THREE.MeshPhysicalMaterial({ color: 0xe8202e, roughness: 0.4, clearcoat: 0.5 });
    this.parcels = [];
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), card); b.position.y = 0.6; b.castShadow = b.receiveShadow = true; g.add(b);
      const t1 = new THREE.Mesh(new THREE.BoxGeometry(1.22, 1.22, 0.2), tape); t1.position.y = 0.6; g.add(t1);
      g.visible = false; this.group.add(g);
      const p = { name: 'parcel' + i, g, at: { x: 0, z: 0 }, r: 0.75, hp: 1, max: 1, alive: false, color: new THREE.Color(1.6, 1.1, 0.7), kind: 'parcel', box: true };
      this.parcels.push(p); this.breakables.push(p);
    }
  }

  // ---------------------------------------------------------------- the work light (the darks)
  _worklight() {
    const g = this.work = new THREE.Group(); this.group.add(g);
    const cage = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: 0x2a2420, wireframe: true }));
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.1, 1.1) }));
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 12, 6), new THREE.MeshBasicMaterial({ color: 0x15110e })); cable.position.y = 6.2;
    g.add(cage, bulb, cable); this.workBulb = bulb;
    // the light itself rides its own trolley (see update): the bulb hangs over YOU, the light stops short of the shelf
    this.workLight = new THREE.PointLight(0xffb46b, 0, 9, 1.6); this.workLight.castShadow = false; this.group.add(this.workLight);
    this.workAt = new THREE.Vector3(0, 16, 4.2);
    g.position.set(0, 16, 4.2); this.workY = 16;
    // its pool on the bare tile (the baked floor takes no real-time light; the tablecloth paints its own pool): the
    // same falloff as the cloth's, laid on the floor once the cloth is gone
    this.workPoolU = { uK: { value: 0 }, uH: { value: 4.2 } };
    const pm = new THREE.ShaderMaterial({ uniforms: this.workPoolU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uK, uH; varying vec2 vP;
        void main(){ float d2 = dot(vP, vP) + uH * uH, wd = sqrt(d2);
          float e = 3.2 / (1.0 + d2 * 0.45) * smoothstep(7.5, 2.0, wd) * 0.45 * uK;
          gl_FragColor = vec4(vec3(1.0, 0.62, 0.3) * e, 1.0); }` });
    this.workPool = new THREE.Mesh(new THREE.CircleGeometry(6, 48), pm); this.workPool.rotation.x = -Math.PI / 2; this.workPool.position.y = 0.014;
    this.workPool.renderOrder = 1; this.workPool.visible = false; this.workPool.layers.set(LAYER.NO_REFLECT); this.group.add(this.workPool);
  }

  // ---------------------------------------------------------------- THE CUT's marks and cut-outs
  _marks() {
    this.tapeTex = {};
    for (const [k, c] of Object.entries({ self: ['#ffd21a'], defendant: ['#ff2a3a'], mourner: ['#141014', '#f0c860'], ex: ['#3a6aff'] })) this.tapeTex[k] = P.tapeT(c[0], c[1]);
    this.silTex = P.silhouette();
    this.markPool = [];
    // every mark the script will lay, with its time (shown a beat ahead of its cut, until the next dark)
    this.markList = CUTS.filter((c) => !c[4]?.nomark && !c[4]?.entrance).map((c) => ({ t: c[0], x: c[2], z: c[3], costume: c[1] }));
    for (let i = 0; i < 10; i++) this._markMesh(i).visible = false;
    this.cutMat = new THREE.MeshBasicMaterial({ map: this.silTex, transparent: true, alphaTest: 0.4, color: new THREE.Color(3, 3, 3), depthWrite: false });
    this.cutGeo = new THREE.PlaneGeometry(1.5, 3.0);
    const warmCut = new THREE.Mesh(this.cutGeo, this.cutMat); warmCut.visible = false; warmCut.position.y = -30; this.group.add(warmCut);
  }
  _markMesh(i) {
    if (!this.markPool[i]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: this.tapeTex.self, transparent: true, alphaTest: 0.3, roughness: 0.2, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.01; m.layers.set(LAYER.NO_REFLECT); this.group.add(m); this.markPool[i] = m;
    }
    return this.markPool[i];
  }

  // the painted sky behind the boxes
  _cyclorama() {
    this.skyU = { uA: { value: new THREE.Color('#3a9cff') }, uB: { value: new THREE.Color('#ffe4c8') }, uK: { value: 1 } };
    const m = new THREE.ShaderMaterial({ uniforms: this.skyU, side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uA, uB; uniform float uK; varying vec3 vP; void main(){ float h = clamp(vP.y / 40.0 + 0.1, 0.0, 1.0); vec3 c = mix(uB, uA, pow(h, 0.7)) * uK; gl_FragColor = vec4(c, 1.0); }' });
    const sky = this.sky = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 70, 48, 1, true, Math.PI * 0.6, Math.PI * 0.8), m);
    sky.position.set(0, 20, 12); sky.renderOrder = -10; this.group.add(sky);
  }

  // compile every material the fight will show, with and without the work light, so nothing stalls mid-song
  warm(f) {
    const r = f.app.renderer, cam = f.cam.cam, hidden = [];
    // the things made on first use: make them now (hidden), so their shaders compile with the rest
    this._washMesh();
    this.rays(f, 0, -40, 0, 1, 1); this.cerealRing(f, 0, -40, 0, 0.1); this.rings.length = 0;
    this._toyCar('hearse'); this._toyCar('ambulance');
    if (!this.chyronTex) this.chyronTex = P.chyron();
    const warmers = [new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.chyronTex, transparent: true, side: THREE.DoubleSide, color: new THREE.Color(1.4, 1.4, 1.4) })), this._bombMesh(),
      new THREE.Sprite(new THREE.SpriteMaterial({ map: P.letter('R'), color: new THREE.Color(1.3, 1.3, 1.3) })),
      new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 1.2), this.swipeM || (this.swipeM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, clearcoat: 1, emissive: 0xbfd8ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 }))),
      new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1, 4, 8), this.foamM || (this.foamM = new THREE.MeshPhysicalMaterial({ color: 0xf6f4ee, roughness: 0.3, clearcoat: 1, emissive: 0xcfe0ff, emissiveIntensity: 0.35 })))];
    for (const w of warmers) { w.position.set(0, -30, 0); this.group.add(w); }
    if (this.washM) this.washM.visible = true;
    const show = (root) => root.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    show(this.group); if (this.prize) { show(this.prize.fig.root); if (!this.prize.fig.world.parent) f.scene.add(this.prize.fig.world); }
    try { r.compile(f.scene, cam); } catch (e) { console.warn('warm', e.message); }
    // a real frame with everything shown (the post pipeline and the floor's mirror): first draws cost on the GPU too
    try {
      for (const t of Object.values(this.tapeTex)) r.initTexture(t);
      if (this.arena) { for (const t of [...this.arena.lightmaps, ...this.arena.keymaps]) r.initTexture(t); this.arena.update(0, cam, f.player.root.position); }
      const culled = []; f.scene.traverse((o) => { if (o.frustumCulled && (o.isMesh || o.isSprite || o.isPoints)) { culled.push(o); o.frustumCulled = false; } });
      f.app.post.render(f.scene, cam, 0);
      for (const o of culled) o.frustumCulled = true;
    } catch (e) { console.warn('warm frame', e.message); }
    // the arena's env capture renders its set with no lights and (after the first) an env map: compile those variants now
    if (this.arena && this.arena._captureEnv) { try { this.arena._captureEnv(); this.arena._captureEnv(); } catch (e) { console.warn('warm env', e.message); } }
    for (const o of hidden) o.visible = false;
    for (const w of warmers) this.group.remove(w);
    for (const e of this.fxList) this.group.remove(e.obj); this.fxList.length = 0;
    if (this.washM) this.washM.visible = false;
  }
  attachBoss(prize) {
    this.prize = prize; prize.boss.arena = null;
    if (this.arena) { this.arena.addCaster(this.f.player.root); this.arena.addCaster(prize.fig.root); }
    prize.boss.onGuilty = () => { this.guiltyUntil = Math.max(this.guiltyUntil || -9, this.f.t + this.f.beat * 4); this.sound.play('guilty', prize.boss.x); };
    prize.boss.on('deflect', (h) => this._deflected(h));
    prize.boss.on('hit', (h) => this._hit(h));
  }

  // ---------------------------------------------------------------- collisions and strikes
  resolve(x, z, r) {
    let p = this.arena ? this.arena.resolve(x, z, r) : { x: Math.max(BOUNDS.minX + r, Math.min(BOUNDS.maxX - r, x)), z: Math.max(BOUNDS.minZ + r, Math.min(BOUNDS.maxZ - r, z)) };
    x = p.x; z = p.z;
    if (!this.arena) { const dx = x - BOWL.x, dz = z - BOWL.z, d = Math.hypot(dx, dz), m = BOWL.r + r; if (d < m) { x = BOWL.x + dx / d * m; z = BOWL.z + dz / d * m; } }
    const circle = (cx, cz, R) => { const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz), m = R + r; if (d < m && d > 1e-5) { x = cx + dx / d * m; z = cz + dz / d * m; } };
    const boxc = (cx, cz, hx, hz) => { const lx = x - cx, lz = z - cz; if (Math.abs(lx) < hx + r && Math.abs(lz) < hz + r) { const px = hx + r - Math.abs(lx), pz = hz + r - Math.abs(lz); if (px < pz) x = cx + Math.sign(lx || 1) * (hx + r); else z = cz + Math.sign(lz || 1) * (hz + r); } };
    for (const [, p] of Object.entries(this.pieces)) { if (p.up < 0.6 || !p.g.visible) continue; if (p.col.type === 'circle') circle(p.g.position.x, p.g.position.z, p.col.r); else boxc(p.g.position.x, p.g.position.z, p.col.hx, p.col.hz); }
    for (const b of this.breakables) { if (!b.alive) continue; if (b.box) boxc(b.at.x, b.at.z, 0.6, 0.6); else circle(b.at.x, b.at.z, b.r); }
    return { x, z };
  }
  // shadow casters for the flash and blockers for her shots: [{x, z, r, h}]
  covers() {
    const out = [];
    for (const b of this.breakables) if (b.alive) out.push({ x: b.at.x, z: b.at.z, r: b.box ? 0.7 : b.r, h: b.box ? 1.2 : 1.1 });
    for (const [name, p] of Object.entries(this.pieces)) if (p.up > 0.6 && p.g.visible) out.push({ x: p.g.position.x, z: p.g.position.z, r: p.col.type === 'circle' ? p.col.r : Math.min(p.col.hx, p.col.hz) * 1.1, h: name === 'casket' ? 0.9 : 1.3, hx: p.col.hx, hz: p.col.hz });
    return out;
  }
  strikeArc(x, z, ang, range, arc, s) {
    for (const b of this.breakables) {
      if (!b.alive) continue;
      const dx = b.at.x - x, dz = b.at.z - z, d = Math.hypot(dx, dz);
      if (d > range + b.r) continue;
      const da = Math.atan2(Math.sin(Math.atan2(dx, dz) - ang), Math.cos(Math.atan2(dx, dz) - ang));
      if (Math.abs(da) > arc && d > b.r + 0.4) continue;
      this.hitBreakable(b, s && s.heavy ? 2 : 1, ang);
    }
  }
  hitBreakable(b, dmg, ang = 0) {
    const f = this.f;
    b.hp -= dmg;
    f.fx.chips(b.at.x, 0.8, b.at.z, b.color, 10, ang);
    if (b.hp <= 0) {
      b.alive = false; b.g.visible = false;
      f.fx.chips(b.at.x, 0.8, b.at.z, b.color, 30); f.fx.glitter(b.at.x, 0.9, b.at.z, new THREE.Color(3, 2.6, 2.2), 30, 1.1);
      f.cam.shake(0.35, 0.12);
      this.sound.play(b.kind === 'heap' ? 'crunch' : 'cardboard', b.at.x);
      f._good && f._good(60);
      if (b.kind === 'heap') f.player.meter = Math.min(1, f.player.meter + 0.05);
    } else { this.sound.play(b.kind === 'heap' ? 'crunchSmall' : 'cardboard', b.at.x); }
  }

  // ---------------------------------------------------------------- the boss's reactions
  _deflected(h) {
    const pr = this.prize; if (!pr) return;
    pr.ripple(0xff3a5a, 0.8);
    if (!pr.boss.busy) pr.fig.rig.upperOnce('Sword_Block', { duration: 0.32, weight: 0.8 });
    if (Math.random() < 0.35 && !pr.boss.busy) pr.boss.perform('Idle_No_Loop', { duration: this.f.beat * 2 });
  }
  _hit(h) {
    const pr = this.prize, f = this.f; if (!pr) return;
    const heavy = h.heavy || h.kind === 'return';
    if (h.kind === 'return') { pr.fig.hitAt(new THREE.Vector3(pr.boss.x, 1.5, pr.boss.z), new THREE.Vector3(0, 0, -1), { power: 1.7 }); f.fx.glitter(pr.boss.x, 1.6, pr.boss.z, new THREE.Color(3.6, 2.2, 0.55), 18, 0.8); }
    if (!pr.boss.busy) pr.fig.rig.upperOnce(heavy ? 'Hit_Knockback' : (Math.random() < 0.5 ? 'Hit_Chest' : 'Hit_Head'), { duration: heavy ? 0.45 : 0.28, weight: heavy ? 0.85 : 0.6 });
    if (heavy) { const keep = pr.fig.exprName; setExpr(pr.fig, 'ow', 0.02); this._owUntil = f.t + 0.07; this._owBack = keep === 'ow' ? 'grin' : keep; }
  }

  // ---------------------------------------------------------------- the commercial at song time t
  setStateAt(f, t, hard = false) {
    const pr = this.prize, b = pr && pr.boss;
    this.lastT = t;
    // pieces: up or down
    for (const [name, p] of Object.entries(this.pieces)) { p.up = this.pieceUp(name, t); }
    // cover re-forms in the darks and on rewinds
    for (const h of this.breakables) if (h.kind === 'heap') { h.alive = true; h.hp = h.max; h.g.visible = true; }
    for (const p of this.parcels) { p.alive = false; p.g.visible = false; }
    // marks since the last dark; nothing in flight survives a rewind
    this.cutouts.forEach((c) => { c.mesh.visible = false; this.group.remove(c.mesh); }); this.cutouts.length = 0;
    for (const e of this.fxList) this.group.remove(e.obj); this.fxList.length = 0;
    this.rings.length = 0; for (const m of this.movers) m.end && m.end(); this.movers.length = 0;
    this.washSpan = null; this.camAim = null; this.frostSpan = null; this.tilePop = null; this._out = 0; this._spotT = -9;
    this._clearPolaroids();
    this.tilts.length = 0; this.spills.length = 0; this._spillDirty = true; this.drops.length = 0;
    for (const p of this.parcels) p.falling = false;
    this.ringRoll = null; this.prizeRing.visible = false; this.cello.visible = true;
    if (this.keyMesh) this.keyMesh.visible = false;
    // her: costume, place, face
    if (b) {
      const c = cutAt(t);
      b.stop(); b.lockFacing = false; b.intangible = false; b.frozen = false; b.lookAt = null;
      b.walkClip = b.runClip = t >= 211.9 ? 'Slide_Loop' : 'Walk_Formal_Loop'; if (t < 211.9) b.runClip = 'Jog_Fwd_Loop';
      f.app.post.fx.vhs = 0;
      pr.fig.rig.timeScale = 1;
      if (t < 6.57) { this._hideBoss(true); b.place(0, -5.6, 0); }
      else if (c) {
        this._hideBoss(false);
        pr.dress(c[1]);
        const pos = this.restPos(t, c);
        b.place(pos.x, pos.z, Math.atan2(f.player.x - pos.x, f.player.z - pos.z));
        const idle = c[4]?.idle || (c[1] === 'self' ? 'Idle_Talking_Loop' : 'Idle_Talking_Loop');
        b.idle = idle; b.loop(idle);
        setExpr(pr.fig, c[4]?.face || 'grin', 0.05);
      }
      pr.restoreProps(b.broken);
    }
    this.guiltyUntil = -9; this._still = 0; if (f.player) f.player.walk = false;
    this._dark = null; this.dark = false;
    this.update(f, 0, t, true);
  }
  // where she stands at t if nothing moved her since her last cut
  restPos(t, c) {
    if (t >= 7.27 && t < 13.48) return { x: 0, z: -3 };
    return { x: c[2], z: c[3] };
  }
  _hideBoss(on) {
    const b = this.prize.boss;
    b.root.visible = !on; b.intangible = on;
  }

  // ---------------------------------------------------------------- per frame
  update(f, dt, t = f.t, force = false) {
    // after the finish the song clock stops; the set keeps its own
    if (f.state === 'finishing' || f.state === 'done') { this.postT = (this.postT ?? f.t) + dt; t = this.postT; } else this.postT = undefined;
    if (!force && Math.abs(t - this.lastT) > 0.75 && this.lastT >= 0) { this.setStateAt(f, t); return; }
    if (!force && this.lastT < 0) { this.setStateAt(f, t); return; }
    this.lastT = t; this.t = t;
    const pr = this.prize, b = pr && pr.boss;
    const dark = inDark(t);
    // ---- the dark: in one frame
    if (dark !== this.dark) this._setDark(f, dark, t);
    if (dark && b && t < 289.5) { if (t > 289.1 && b.z !== INBOX.z) b.place(INBOX.x, INBOX.z, Math.PI); b.root.position.set(INBOX.x, INBOX.y, INBOX.z); }
    // ---- in the dark, standing still for two beats, YOU lowers her rings: nothing to fight
    { const pl = f.player, still = Math.hypot(pl.vx || 0, pl.vz || 0) < 0.3 && pl.state === 'free';
      this._still = dark && still ? (this._still || 0) + dt : 0;
      const lower = this._still > 2 * (f.beat || 0.35);
      if (lower !== !!pl.walk) pl.walk = lower; }
    // ---- lighting
    const L = lightAt(t);
    this._light(f, L[1], t - L[0], t, dark);
    // ---- pieces
    for (const [name, p] of Object.entries(this.pieces)) {
      p.up = this.pieceUp(name, t);
      let x = p.at.x;
      if (name.startsWith('pew')) { const s = name === 'pewL' ? -1 : 1; const k = ease(clamp01((t - 178.80) / 0.26)); x = s * (7 - 3.5 * k); }
      p.g.position.set(x, -1.7 * (1 - p.up), p.at.z);
      p.g.visible = p.up > 0.001;
    }
    // ---- the cloth: fire, scorch, the puddle, wet, the pull
    const U = this.clothU; U.uTime.value = t;
    U.uBurnOn.value = t >= FIRE.drop && t < FIRE.ignite + 0.45 ? 1 : 0;
    U.uFire.value.z = FIRE.drop;
    U.uFlare.value = t >= FIRE.ignite && t < FIRE.ignite + 0.45 ? Math.max(0, 1 - (t - FIRE.ignite) / 0.45) : 0;
    U.uScorch.value = t >= FIRE.ignite && t < FIRE.scorchUntil ? clamp01((t - FIRE.ignite) / 0.4) : 0;
    const pudOn = t >= PUDDLE.t0 && t < PUDDLE.t1;
    this.puddle.visible = pudOn;
    if (pudOn) { const k = clamp01((t - PUDDLE.t0) / 0.4), dry = clamp01((t - (PUDDLE.t1 - 1.5)) / 1.5); this.puddle.scale.setScalar(0.3 + 0.7 * easeOut(k)); this.puddle.material.opacity = 0.95 * (1 - dry); }
    U.uPuddle.value.w = t >= FIRE.drop && t < FIRE.ignite + 0.3 ? 1 : 0;
    U.uWetX.value = t >= 158.56 && t < 163.43 ? -10 + 8 * (t - 158.56) : -99;
    const pullT = t - PULL;
    U.uPullT.value = pullT > 0 ? pullT : 0;
    this.cloth.visible = pullT < 0.4; this.hems.visible = pullT < 0.05;
    if (this.floorMesh) this.floorMesh.visible = pullT >= 0;
    // ---- her box: the cold tube in the dark, the marquee chase
    const chase = !dark && t > 2.07 && !(t >= FREEZE[0] && t < FREEZE[1]);
    const C = _C, nb = this.bulbs.count, full = t >= 126.03 && t < 138.49 || t >= 271.9;
    const beatPh = f.bm ? f.bm.beatAt(t) : t * 2.9;
    for (let i = 0; i < nb; i++) {
      let k = 0;
      if (chase) k = full ? 0.6 + 0.4 * (((i + Math.floor(beatPh * 2)) % 3) === 0 ? 1 : 0) : (((i + Math.floor(beatPh)) % 4) === 0 ? 1 : 0.25);
      else if (t >= 289.54 && t < 292.39) k = i / nb > (t - 291.34) / 1.05 ? 1 : 0;
      else k = 0.07;
      C.setRGB(4.2 * k, 3.4 * k, 1.8 * k); this.bulbs.setColorAt(i, C);
    }
    this.bulbs.instanceColor.needsUpdate = true;
    // ---- the work light: down over one beat in a dark, following YOU
    const want = dark || t < 2.07 || t >= 289.17 ? 4.2 : 16;
    this.workY += (want - this.workY) * Math.min(1, dt * (want < this.workY ? 7 : 3));
    const pl = f.player;
    // the bulb hangs over YOU; the light's own rail stops short of the shelf, so it never sits right in front of the
    // boxes (it blew their fronts out white when YOU walked to the back) and the bulb never hangs over her head on
    // screen there
    const kf = Math.min(1, dt * 3.2);
    this.work.position.x += (pl.x - this.work.position.x) * kf;
    this.work.position.z += (pl.z - this.work.position.z) * kf;
    this.work.position.y = this.workY;
    const W = this.workAt; W.x = this.work.position.x; W.z += (Math.max(-4.2, pl.z) - W.z) * kf; W.y = this.workY;
    this.workLight.position.copy(W);
    const wk = clamp01((16 - this.workY) / 11.8);
    this.workLight.intensity = 40 * wk; this.workBulb.visible = wk > 0.02;
    this.workPool.visible = !!this.arena && t >= PULL + 0.4 && wk > 0.02;
    if (this.workPool.visible) { this.workPool.position.set(W.x, 0.014, W.z); this.workPoolU.uK.value = wk; this.workPoolU.uH.value = this.workY; }
    U.uWork.value.set(W.x, this.workY, W.z, this.arena ? wk : 0);
    // ---- marks since the last dark (laid a beat before each cut)
    const since = darkStart(t);
    let mi = 0;
    for (const m of this.markList) {
      if (dark) break;
      const lay = m.t - (f.beat || 0.35);
      if (lay > t || lay < since) continue;
      const mesh = this._markMesh(mi++); mesh.visible = true; mesh.position.set(m.x, 0.012, m.z + 0.9); mesh.material.map = this.tapeTex[m.costume]; mesh.userData.tex = m.costume;
      mesh.rotation.z = 0;
    }
    for (let i = mi; i < this.markPool.length; i++) this.markPool[i].visible = false;
    // ---- cut-outs (three frames of white where she was)
    for (let i = this.cutouts.length - 1; i >= 0; i--) { const c = this.cutouts[i]; if (t - c.t > 0.06 || t < c.t) { c.mesh.visible = false; this.group.remove(c.mesh); this.cutouts.splice(i, 1); } }
    // ---- her guard: PRETTY while she's the Defendant (except guilty spans and a bar after a gold return)
    if (b) {
      const guilty = GUILTY.some(([a, c]) => t >= a && t < c) || t < (this.guiltyUntil || -9);
      const pretty = pr.costume === 'defendant' && !guilty && !dark && !b.blinded;
      b.guard = pretty ? 'pretty' : null;
      pr.sheen(!(pr.costume === 'defendant' && guilty));
      if (pretty && f.bm) { const bi = Math.floor(f.bm.beatAt(t)); if (bi !== this._sheenBeat) { this._sheenBeat = bi; pr.ripple(0xff3a5a, 0.3); } }
      if (this._owUntil && t > this._owUntil) { setExpr(pr.fig, this._owBack || 'grin', 0.05); this._owUntil = 0; }
      // the bar empty: she plays on like a chewed tape
      if (b.state === 'desperate' && !b.frozen && f.state === 'play') { const step = 1 / 12, before = this._tape || 0; this._tape = before + dt; pr.fig.rig.timeScale = Math.floor(this._tape / step) > Math.floor(before / step) ? step / Math.max(dt, 1e-3) : 0; }
      pr.haloLight.intensity = !pr.props.halo.userData.broken && pr.costume === 'self' && !dark ? (t >= 37.38 && t < 53.64 ? 1.6 : 0.45) : 0;
      pr.update(dt);
    }
    // ---- the shots she throws stop at cover
    for (const q of f.proj.list) {
      if (q.promoteAt && t >= q.promoteAt) { q.promoteAt = 0; q.owner = 'boss'; }
      if (q.owner !== 'boss' || q.dead || q.noCover) continue;
      for (const c of this.breakables) if (c.alive && Math.hypot(q.x - c.at.x, q.z - c.at.z) < c.r + q.radius * 0.5) { q.dead = true; f.fx.chips(q.x, 0.9, q.z, q.color.clone().multiplyScalar(0.6), 5); break; }
    }
    // ---- short effects: rays, the rolling cereal rings, movers (cars), the flash's wash
    for (let i = this.fxList.length - 1; i >= 0; i--) {
      const e = this.fxList[i], k = (t - e.t0) / e.dur;
      if (k >= 1 || k < 0) { this.group.remove(e.obj); this.fxList.splice(i, 1); continue; }
      if (e.kind === 'rays') e.obj.traverse((o) => { if (o.material) o.material.opacity = 0.6 * (1 - k) * (1 - k); });
    }
    if (this.ringMesh) {
      const m4 = _m4, q = _q, v = _v, s = _s;
      let n = 0;
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i], R = 0.5 + r.speed * (t - r.t0);
        if (R > r.max || t < r.t0) { this.rings.splice(i, 1); continue; }
        const cnt = Math.min(48, Math.round(R * 4.2));
        for (let j = 0; j < cnt && n < this.ringMesh.instanceMatrix.count; j++) {
          const a = j / cnt * Math.PI * 2 + i * 0.3;
          v.set(r.x + Math.sin(a) * R, 0.3, r.z + Math.cos(a) * R);
          if (v.z < -6.9 || v.x < -11.6 || v.x > 11.3 || v.z > 7.2) continue;
          q.setFromEuler(_e.set((t - r.t0) * 9 + j, a, 0, 'YXZ')); s.setScalar(1 - Math.max(0, R - r.max + 2) / 2);
          m4.compose(v, q, s); this.ringMesh.setMatrixAt(n++, m4);
        }
      }
      this.ringMesh.count = n; this.ringMesh.instanceMatrix.needsUpdate = true;
    }
    for (let i = this.movers.length - 1; i >= 0; i--) { const m = this.movers[i]; if (t > m.until || t < (m.from ?? -1)) { m.end && m.end(); this.movers.splice(i, 1); continue; } m.tick(t, dt); }
    if (this.washM) {
      const w = this.washSpan;
      const on = w && t >= w.t0 && t < w.t1 + 0.25 && !dark;
      this.washM.visible = !!on;
      if (on) {
        const L = w.camAt(); this.washU.uCam.value.set(L.x, L.y, L.z);
        this.washU.uK.value = clamp01((t - w.t0) / (w.t1 - w.t0)); this.washU.uFlash.value = t >= w.t1 ? Math.max(0, 1 - (t - w.t1) / 0.22) : 0;
        const occ = this._occluders(f); this.washU.uN.value = occ.length;
        occ.forEach((o, j) => this.washU.uOcc.value[j].set(o.x, o.z, o.r, o.h));
      }
    }
    this._dressUpdate(f, dt, t, dark);
    // ---- the bridge: the camera eases closer (the fight follows its section's close flag)
    if (f.lastSection) f.lastSection.close = t >= BRIDGE[0] && t < BRIDGE[1];
    // ---- sugar confetti drifting at full chorus
    if (!dark && ((t >= 126.03 && t < 138.49) || (t >= 271.9 && t < 282.92)) && !(t >= FREEZE[0] && t < FREEZE[1]) && Math.random() < dt * 9) {
      const C = [new THREE.Color(3, 0.9, 1.2), new THREE.Color(3, 2.6, 0.6), new THREE.Color(0.8, 1.6, 3), new THREE.Color(2.6, 2.6, 2.6)];
      f.fx.glitter(f.player.x + (Math.random() - 0.5) * 18, 7 + Math.random() * 2, f.player.z + (Math.random() - 0.6) * 12, C[Math.floor(Math.random() * 4)], 3, 2.5);
    }
    // ---- her name and bar appear with her
    const hudB = f.hud && f.hud.el && f.hud.el.boss; if (hudB) hudB.style.visibility = t < 6.57 ? 'hidden' : 'visible';
    // ---- the sky
    this.sound.update(f, dt, t, dark);
  }

  _setDark(f, on, t) {
    this.dark = on;
    const pr = this.prize, b = pr && pr.boss, pl = f.player;
    const hud = f.hud && f.hud.el && f.hud.el.boss; if (hud) { hud.style.transition = 'opacity 0.05s'; hud.style.opacity = on ? '0.25' : '1'; }
    if (on) {
      this._darkT0 = t; this._clearPolaroids();
      // nothing starts and nothing lands: anything in flight vanishes with the cut
      f.proj.clear('boss'); f.tele.clear();
      for (const w of f.waves) { if (f._dropWave) f._dropWave(w); else if (w.mesh) f.scene.remove(w.mesh); } f.waves.length = 0;
      this.rings.length = 0;
      // the mail-in parcels go with the lights
      for (const p of this.parcels) { p.alive = false; p.falling = false; p.g.visible = false; }
      if (b) {
        b.stop(); b.intangible = true; b.root.visible = true; b.lockFacing = true;
        // she stands in her window; the camera frames her a little behind it so the whole lit window stays in the
        // picture wherever YOU is (her body is put back in the window every frame, see update)
        b.place(INBOX.x, INBOX.z - 1.7, Math.PI); b.root.position.set(INBOX.x, INBOX.y, INBOX.z);
        b.idle = 'Idle_Loop'; b.loop('Idle_Loop'); setExpr(pr.fig, 'grin', 0.01);
      }
      // the stage lights can't swing onto YOU in the dark: a spotlight that was on ends, and its meter comes back after
      const spot = f.spotUntil > 0;
      if (spot && f._endSpotlight) f._endSpotlight();
      // (kept if already held: a seek and the rewind hook both put the set in place, so this can run twice at once)
      if (this._meter === undefined) this._meter = spot ? 1 : pl.meter;
      if (pl.meter >= 1) pl.meter = 0.999;
      if (this._creakT !== t) { this._creakT = t; this.sound.dark(true, t); }
    } else {
      if (b && t < 289.5) { b.root.position.y = 0; b.lockFacing = false; b.intangible = t < 6.57; }
      if (this._meter !== undefined) { pl.meter = Math.max(pl.meter, this._meter); this._meter = undefined; }
      for (const h of this.breakables) if (h.kind === 'heap') { h.alive = true; h.hp = h.max; h.g.visible = true; }
      for (const p of this.parcels) { p.alive = false; p.g.visible = false; }
      if (t > 1) this.sound.dark(false, t);
      // back on in one frame, mid-pose, as if nothing happened
      if (b && t > 6.57 && t < 289.5) { const c = cutAt(t); if (c) { pr.dress(c[1]); const pos = this.restPos(t, c); b.place(pos.x, pos.z); setExpr(pr.fig, c[4]?.face || 'grin', 0.01); } }
    }
  }

  _light(f, name, dtIn, t, dark) {
    const key = name + (name === 'finale' ? Math.floor(Math.max(0, t - 290.27) / 0.36) : '');
    const baked = { bank1: ['offair', 'commercial', 0.3], bank2: ['offair', 'commercial', 0.55], bank3: ['offair', 'commercial', 0.8], livestream: ['offair', 'commercial', 0.42], quiet: ['suburb', 'offair', 0.5], quiet2: ['tile', 'offair', 0.5] };
    let a = name, bb = name, k = 0;
    if (baked[name]) [a, bb, k] = baked[name];
    if (name === 'finale') { const off = clamp01(Math.floor(Math.max(0, t - 290.27) / 0.36 + 1) / 4); a = 'commercial'; bb = 'offair'; k = t < 290.27 ? 0 : off; }
    if (this.arena) {
      if (key !== this.stateName) { this.stateName = key; this.arena.setState(a, bb, k); }
      this.arena.update(f.dt || 0, f.cam.cam, f.player.root.position);
      const fx = f.app.post.fx;
      fx.exposure = (EXPO[a] ?? 1) * (1 - k) + (EXPO[bb] ?? 1) * k;
      // a blend with the dark is the lit state dimmed (the banks coming on one by one, the livestream's set at 40%,
      // the Ex's quiet at half, the banks going out at the end), not the dark brought up to full brightness
      if (k > 0 && k < 0.999 && (a === 'offair') !== (bb === 'offair')) fx.exposure = EXPO[a === 'offair' ? bb : a] ?? 1;
      // bloom picks its highlights before the exposure: on this bright set (exposure ~0.3) the whole white gingham
      // was over the threshold and the picture went milky. Scale the threshold with the exposure.
      if (this._thr0 === undefined) this._thr0 = fx.threshold;
      fx.threshold = Math.max(1, 1.1 / Math.max(0.05, fx.exposure));
    } else {
      const A = LOOK[a], B = LOOK[bb];
      const ka = new THREE.Color(A.key).multiplyScalar(A.k * (1 - k)).add(new THREE.Color(B.key).multiplyScalar(B.k * k));
      this.key.color.copy(ka); this.key.intensity = 1;
      const d = new THREE.Vector3(...(A.dir || B.dir || [0, 1, 0])).normalize();
      this.key.position.set(d.x * 30, d.y * 30, d.z * 30); this.key.target.position.set(0, 0, 0);
      this.hemi.color.set(A.hemi).lerp(new THREE.Color(B.hemi), k); this.hemi.intensity = A.h * (1 - k) + B.h * k;
      f.app.post.fx.exposure = 1;
    }
    // the sky turns
    const A = LOOK[a] || LOOK.offair, B = LOOK[bb] || LOOK.offair;
    this.skyU.uA.value.set(A.sky[0]).lerp(new THREE.Color(B.sky[0]), k); this.skyU.uB.value.set(A.sky[1]).lerp(new THREE.Color(B.sky[1]), k);
    this.skyU.uK.value = name === 'offair' ? 0.02 : name === 'livestream' ? 0.35 : 1;
    // the cold tube inside her box: only off air
    const tubeOn = (name === 'offair' && t > 1) && !(t >= 289.17 && t < 289.54);
    this.tube.visible = tubeOn; this.tubeLight.intensity = tubeOn ? 6 : 0;
  }

  // ---------------------------------------------------------------- THE CUT
  cut(f, costume, x, z, o = {}) {
    const pr = this.prize, b = pr.boss;
    // three frames of a flat white cut-out where she was
    if (b.root.visible && !b.intangible) {
      const m = new THREE.Mesh(this.cutGeo, this.cutMat);
      m.position.set(b.x, 1.5, b.z); m.lookAt(f.cam.cam.position.x, 1.5 + (f.cam.cam.position.y - 1.5) * 0.25, f.cam.cam.position.z); this.group.add(m);
      this.cutouts.push({ mesh: m, t: f.t });
    }
    this._hideBoss(false);
    pr.dress(costume);
    b.stop(); b.place(x, z, Math.atan2(f.player.x - x, f.player.z - z));
    if (o.idle) b.idle = o.idle; else b.idle = 'Idle_Talking_Loop';
    b.loop(o.clip || b.idleClip, { fade: 0.05 });
    setExpr(pr.fig, o.face || 'grin', 0.03);
    this.sound.play('splice', x);
    if (o.mini) pr.show('mini', true);
  }
  layMark(f, x) { this.sound.play('tape', x); }

  // ---------------------------------------------------------------- effects the script calls
  // the starburst's rays: blades of light for 0.12 s
  rays(f, x, z, rot, n, r) {
    if (!this.rayMat) this.rayMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 1.05, 1.25), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const g = new THREE.Group(); g.position.set(x, 0.05, z);
    if (!this.rayGeo) { this.rayGeo = new THREE.PlaneGeometry(0.45, 1); this.rayGeo.translate(0, 0.5, 0); this.rayGeo.rotateX(Math.PI / 2); }
    // blades of light from a metre out (nothing piles up at her centre), low over the floor
    for (let i = 0; i < n; i++) { const a = rot + i * Math.PI * 2 / n, p = new THREE.Mesh(this.rayGeo, this.rayMat); p.scale.set(1, 1, r - 1); p.position.set(Math.sin(a), 0.25, Math.cos(a)); p.rotation.y = a; g.add(p); }
    g.layers.set(LAYER.NO_REFLECT); g.traverse((o) => o.layers.set(LAYER.NO_REFLECT));
    this.group.add(g); this.fxList.push({ obj: g, t0: f.t, dur: 0.16, kind: 'rays' });
  }
  // the gavel's wave as a rolling ring of giant cereal loops
  cerealRing(f, x, z, speed, max) {
    if (!this.ringMesh) {
      const n = 48; this.ringMesh = new THREE.InstancedMesh(new THREE.TorusGeometry(0.22, 0.1, 8, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, clearcoat: 0.4 }), n * 3);
      const cols = [0xff3a4a, 0xffd21a, 0xff8a1a, 0xa85aff, 0x3ab8ff, 0xff6ab0];
      for (let i = 0; i < n * 3; i++) this.ringMesh.setColorAt(i, new THREE.Color(cols[i % 6]));
      this.ringMesh.count = 0; this.ringMesh.frustumCulled = false; this.group.add(this.ringMesh);
    }
    this.rings.push({ x, z, t0: f.t, speed, max });
  }
  crater(f, x, z) { f.fx.chips(x, 0.2, z, new THREE.Color(1.6, 1.2, 0.7), 10); }
  cameraPan(f, get, t1) { this.camAim = { get, t1 }; }
  strobe(f, k) { f.fx.flash(new THREE.Color(0.3, 0.3, 0.34), k); }
  // a Polaroid of YOU spits out of her camera and lies on the floor until the next dark
  polaroid(f) {
    if (!this.polTex) {
      const [c, g] = P.canvas(128, 152);
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, 128, 152);
      const grd = g.createLinearGradient(0, 10, 0, 118); grd.addColorStop(0, '#f2e6ff'); grd.addColorStop(1, '#c8b8d8'); g.fillStyle = grd; g.fillRect(10, 10, 108, 108);
      g.fillStyle = '#2a1a14'; g.beginPath(); g.arc(64, 44, 13, 0, Math.PI * 2); g.fill();          // her, caught in the flash
      g.fillStyle = '#8a4a2a'; g.beginPath(); g.ellipse(64, 40, 17, 12, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#efe6d6'; g.beginPath(); g.moveTo(44, 118); g.lineTo(50, 66); g.lineTo(78, 66); g.lineTo(86, 118); g.fill();
      this.polTex = P.tex(c); this.polMat = new THREE.MeshStandardMaterial({ map: this.polTex, roughness: 0.5 });
    }
    const b = this.prize.boss, pl = f.player, a = Math.atan2(pl.x - b.x, pl.z - b.z);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.5), this.polMat);
    m.rotation.set(-Math.PI / 2, 0, Math.random() * 2 - 1); m.position.set(b.x + Math.sin(a) * 1.4, 0.015, b.z + Math.cos(a) * 1.4);
    m.layers.set(LAYER.NO_REFLECT); this.group.add(m); (this.polaroids ||= []).push(m);
    this.sound.play('shutter', b.x, { rate: 0.7, gain: 0.6 });
  }
  _clearPolaroids() { for (const m of this.polaroids || []) { this.group.remove(m); m.geometry.dispose(); } if (this.polaroids) this.polaroids.length = 0; }
  // the flash's wash: white over everything the toy camera can see, the shadows cut out with gold rims
  _washMesh() {
    if (this.washM) return this.washM;
    const N = 12;
    this.washU = { uK: { value: 0 }, uFlash: { value: 0 }, uCam: { value: new THREE.Vector3() }, uOcc: { value: Array.from({ length: N }, () => new THREE.Vector4()) }, uN: { value: 0 } };
    const m = new THREE.ShaderMaterial({ uniforms: this.washU, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uK, uFlash; uniform vec3 uCam; uniform vec4 uOcc[${N}]; uniform int uN; varying vec3 vW;
        float sh(vec2 p, float grow) {
          vec2 L = uCam.xz; vec2 v = p - L; float len = length(v); vec2 d = v / max(len, 1e-3); float s = 0.0;
          for (int i = 0; i < ${N}; i++) { if (i >= uN) break; vec4 o = uOcc[i]; vec2 c = o.xy - L; float t = dot(c, d);
            if (t < 0.0 || t > len + o.z) continue; float dd = length(c - d * t); float y = uCam.y * (1.0 - t / max(len, 1e-3));
            if (dd < o.z + grow && y < o.w + grow * 0.5 && len > t) s = 1.0; }
          return s; }
        void main(){ vec2 p = vW.xz; float s = sh(p, 0.0); float rim = clamp(sh(p, 0.14) - sh(p, -0.1), 0.0, 1.0);
          float lit = 1.0 - s; float k = uK;
          // lit floor whitens toward the flash; shadows darken; their edges are gold (the flash itself soft: the
          // floor stays a little visible through it)
          float aL = lit * (0.1 + 0.42 * k * k) + lit * uFlash * 0.2;
          float aS = s * (0.18 + 0.3 * k) * (1.0 - rim);
          float aR = rim * (0.35 + 0.6 * k);
          vec3 c = vec3(1.3, 1.4, 1.65) * aL * (1.0 + uFlash * 0.35) + vec3(2.8, 1.75, 0.42) * aR;
          float a = clamp(aL + aS + aR, 0.0, 1.0);
          gl_FragColor = vec4(c, a); }` });
    const w = this.washM = new THREE.Mesh(new THREE.PlaneGeometry(23.5, 15), m); w.rotation.x = -Math.PI / 2; w.position.set(-0.2, 0.03, 0.15); w.renderOrder = 3; w.visible = false;
    w.layers.set(LAYER.NO_REFLECT); this.group.add(w);
    return w;
  }
  _occluders(f) {
    const out = [];
    for (const c of this.covers()) {
      if (c.hx && c.hz && Math.max(c.hx, c.hz) > Math.min(c.hx, c.hz) * 1.4) { const along = c.hx > c.hz; const n = Math.ceil(Math.max(c.hx, c.hz) / Math.min(c.hx, c.hz)); const r = Math.min(c.hx, c.hz) * 1.05; for (let i = 0; i < n; i++) { const u = (i + 0.5) / n * 2 - 1, L = Math.max(c.hx, c.hz) - r; out.push({ x: c.x + (along ? u * L : 0), z: c.z + (along ? 0 : u * L), r, h: c.h }); } }
      else out.push(c);
    }
    const b = this.prize.boss; out.push({ x: b.x, z: b.z, r: 0.5, h: 2.6 });
    return out.slice(0, 12);
  }
  wash(f, t0, t1, camAt) { this._washMesh(); this.washSpan = { t0, t1, camAt }; }
  inShadow(f, x, z, L) {
    const p = { x, z };
    for (const o of this._occluders(f)) {
      const vx = p.x - L.x, vz = p.z - L.z, len = Math.hypot(vx, vz) || 1e-3, dx = vx / len, dz = vz / len;
      const cx = o.x - L.x, cz = o.z - L.z, t = cx * dx + cz * dz;
      if (t < 0 || t > len) continue;
      const dd = Math.hypot(cx - dx * t, cz - dz * t), y = L.y * (1 - t / len);
      if (dd < o.r + 0.05 && y < o.h) return true;
    }
    return false;
  }
  // the toy hearse: a lane across the arena at YOU's z, locked; it drives through, crossing x 0 on tCross
  hearse(f, tLock, tCross) {
    const pl = f.player; let lz = clampZ(pl.z);
    const nose = (t) => 16 * (tCross - t);
    const g = this._toyCar('hearse');
    const tele = this._liveTele(f, { shape: 'rect', x: 11.2, z: lz, angle: -Math.PI / 2, w: 0.85, h: 22.6, kind: 'white',
      fill: (t) => (t < tLock ? 0 : (11.2 - nose(t)) / 22.6), follow: () => { if (f.t < tLock) lz = clampZ(pl.z); return { x: 11.2, z: lz }; } });
    if (tele.dead) return;   // sent in the spotlight: it never comes
    f.cue('white', { x: 11 });
    let done = false;
    this.movers.push({ until: tCross + 1.2, tick: (t) => {
      const x = nose(t); g.visible = t >= tLock && x > -14; g.position.set(x + 1.2, 0, lz); g.rotation.y = -Math.PI / 2;
      if (t >= tLock && !done && Math.abs(pl.z - lz) < 0.8 + FEEL_R && pl.x < x + 2.4 && pl.x > x - 0.2) { done = true; this._strike(f, 'white', 1); }
      if (t > tCross + 0.7) tele.dead = true;
    }, end: () => { g.visible = false; tele.dead = true; }, quash: true });
    f.at(tLock, () => this.sound.play('pour', 11, { rate: 1.8, gain: 0.5 }));
  }
  _toyCar(kind) {
    if (this.cars && this.cars[kind]) return this.cars[kind];
    this.cars = this.cars || {};
    const lac = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04 });
    const g = new THREE.Group(), body = kind === 'hearse' ? lac(0x0d0a0c) : lac(0xfbfbfb);
    const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    box(2.4, 0.55, 1.0, body, 0, 0.45, 0); box(1.6, 0.5, 0.92, body, -0.25, 0.95, 0);
    box(2.42, 0.06, 1.02, new THREE.MeshPhysicalMaterial({ color: kind === 'hearse' ? 0xf0c860 : 0xe8202e, metalness: kind === 'hearse' ? 1 : 0, roughness: 0.25, clearcoat: 1 }), 0, 0.62, 0);
    box(1.5, 0.3, 0.94, new THREE.MeshPhysicalMaterial({ color: kind === 'hearse' ? 0xfff6ee : 0x7ab8ff, roughness: 0.3, emissive: kind === 'hearse' ? 0x000000 : 0x000000 }), -0.25, 1.0, 0);
    for (const x of [-0.8, 0.8]) for (const z of [-0.5, 0.5]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 16), lac(0x151215)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.24, z); g.add(w); }
    if (kind === 'ambulance') { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.4, 0.3) })); bl.position.set(-0.25, 1.28, 0); g.add(bl); g.userData.beacon = bl; }
    g.scale.setScalar(1); g.visible = false; this.group.add(g);
    return (this.cars[kind] = g);
  }
  _liveTele(f, o) { return liveTeleS(f, o); }
  _strike(f, kind, dmg) { const pl = f.player; return f.resolveArea({ shape: 'circle', x: pl.x, z: pl.z, w: 0.6, h: 0.6, angle: 0, param: 0 }, { kind, damage: dmg }); }
  // she stands up out of the prize packet on the pile
  entrance(f) {
    const pr = this.prize, b = pr.boss;
    this._hideBoss(false); pr.dress('self');
    b.place(0, -5.6, 0); b.perform('Spell_Simple_Enter', { duration: 0.35, then: 'Idle_Talking_Loop' }); setExpr(pr.fig, 'grin', 0.02);
    f.fx.glitter(0, 1.2, -5.6, new THREE.Color(3.4, 2.6, 1.0), 50, 1.4); f.fx.chips(0, 0.8, -5.6, new THREE.Color(2.6, 2.4, 2.2), 24);
    this.sound.play('crunch', 0, { gain: 1.1 }); this.sound.play('pop', 0, { rate: 1.3, gain: 0.6 });
    this.packetBurst = f.t;
  }

  // ---------------------------------------------------------------- hooks
  onBreak(f, i) {
    const pr = this.prize, b = pr.boss;
    b.perform('Idle_Shield_Break', { duration: f.beat * 2 });
    if (i === 0) pr.breakProp('pigtail');
    if (i === 1) pr.breakProp('halo');
  }
  onEmpty(f) {}
  onFinish(f) { this.finish(f); }
  onEncore(f) { this.encore(f); }
  onSpotlight(f, on) { if (this.prize) this.prize.boss.blinded = on; if (on) this._quash(f); }
  // the spotlight takes back what was coming, as it does in every fight (her telegraphs and shots go): the set
  // pieces she sent go too, and her flash, her frost and her hand-made strikes check quashed() and fizzle
  _quash(f) {
    this._spotT = f.t;
    this.washSpan = null; this.frostSpan = null;
    // her waves already rolling go too (the shared spotlight leaves them, and they'd hit through it), with their cereal
    for (const w of f.waves) { if (f._dropWave) f._dropWave(w); else if (w.mesh) f.scene.remove(w.mesh); } f.waves.length = 0;
    this.rings.length = 0;
    for (const p of this.parcels) if (p.falling) { p.falling = false; p.g.visible = false; }
    for (let i = this.movers.length - 1; i >= 0; i--) { const m = this.movers[i]; if (m.quash) { m.end && m.end(); this.movers.splice(i, 1); } }
    this.sound.cut('charge');
  }
  // did the spotlight come on since t0 (or was it on at t0: `sup`)? then what she started at t0 doesn't land
  quashed(t0, sup = false) { return sup || (this._spotT ?? -9) >= t0 - 1e-4; }

  dispose() {
    if (this.f.player) this.f.player.walk = false;
    this.f.scene.remove(this.group);
    if (this.arena) this.arena.dispose();
    const hud = this.f.hud && this.f.hud.el && this.f.hud.el.boss; if (hud) { hud.style.opacity = '1'; hud.style.visibility = 'visible'; }
    const fx = this.f.app.post.fx; if (this._thr0 !== undefined) fx.threshold = this._thr0; fx.exposure = 1;
    this.sound.dispose();
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}

Object.assign(CerealSet.prototype, STUNTS, DRESSING);

// least-squares affine map (x, z) -> (u, v) of a mesh's lightmap UVs
function affineFit(mesh) {
  const g = mesh.geometry, p = g.attributes.position, uv = g.attributes.uv1;
  mesh.updateWorldMatrix(true, false);
  const v = new THREE.Vector3();
  let Sxx = 0, Sxz = 0, Szz = 0, Sx = 0, Sz = 0, n = 0, Sux = 0, Suz = 0, Su = 0, Svx = 0, Svz = 0, Sv = 0;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
    const x = v.x, z = v.z, u = uv.getX(i), w = uv.getY(i);
    Sxx += x * x; Sxz += x * z; Szz += z * z; Sx += x; Sz += z; n++;
    Sux += u * x; Suz += u * z; Su += u; Svx += w * x; Svz += w * z; Sv += w;
  }
  const Mt = new THREE.Matrix3().set(Sxx, Sxz, Sx, Sxz, Szz, Sz, Sx, Sz, n).invert();
  const solve = (a, b, c) => new THREE.Vector3(a, b, c).applyMatrix3(Mt);
  const U = solve(Sux, Suz, Su), V = solve(Svx, Svz, Sv);
  return [U.x, U.y, U.z, V.x, V.y, V.z];
}
