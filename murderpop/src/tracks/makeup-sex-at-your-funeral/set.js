// The set: one soundstage footprint, eight looks. A Blender bake (tools/arena/arenas/makeup-sex-at-your-funeral.py)
// holds four sets side by side (the viewing room, the cemetery, the prep room, the chapel), each a movable
// group; the one that's on is moved to the middle. Everything that moves in the song (walls flying, floors
// rippling, headstones bursting up, the road unrolling) is a pure function of song time (evaluate(t)), so a
// rewind or a start anywhere puts the set exactly where it was. Attacks drive a few props on top (the casket
// the pallbearers carry, the kicked table, the hearses); a rewind clears those back to the timeline.
import * as THREE from 'three';
import { Arena, LAYER } from '../../game/arena.js';
import * as P from './props.js';

const URL_ARENA = 'assets/arenas/makeup-sex-at-your-funeral/makeup-sex-at-your-funeral.json';
export const OFFSET = { viewing: 0, cemetery: 80, prep: 160, chapel: 240 };

// the song's set lines (seconds, from the beat map; see the design's section 6)
export const TL = {
  doors: 2.118, candle: 21.999, studio: 32.106, walls: 54.583, turf: 56.854, eulogy: 78.046, chairs: 79.347, lectern: 80.650,
  prep: 92.383, door: 98.251, tilt: 101.845, level: 102.817, prepOut: 114.881, road: 116.831, belovedOut: 119.776, island: 127.274,
  chapel: 147.192, dark: 148.172, burst: 158.601, ring: 158.926, sunrise: 166.449, sunHigh: 190.320, wedding: 199.469, negative: 200.791,
};
const BEAT = 0.326;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, t) => { const k = clamp01((t - a) / (b - a)); return k * k * (3 - 2 * k); };
const backOut = (k) => { k = clamp01(k); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
// a piece that rises at t0 (over dur, overshooting) and sinks at t1: height offset (0 = up, -depth = gone)
function riseSink(t, t0, t1, { dur = 0.22, sink = 0.3, depth = 1.6, gentle = false } = {}) {
  if (t < t0 || t >= t1 + sink) return -depth;
  if (t < t0 + dur) { const k = (t - t0) / dur; return -depth * (1 - (gentle ? smooth(0, 1, k) : backOut(k))); }
  if (t >= t1) return -depth * smooth(t1, t1 + sink, t);
  return 0;
}

// headstone layouts
const STONES_B = [[-3.2, -1.5], [3.2, -1.5], [-7.5, -1.5], [7.5, -1.5], [-3.2, 3.0], [3.2, 3.0], [-7.5, 3.0], [7.5, 3.0]];
const STONES_E = [[-4.5, -4.4], [4.5, -4.4], [-8.5, -4.4], [8.5, -4.4], [-4.5, 4.6], [4.5, 4.6], [-8.5, 4.6], [8.5, 4.6]];
const STONES_G = [[-2.6, -4.2], [2.6, -4.2], [-6.4, -1.8], [6.4, -1.8], [-6.4, 2.4], [6.4, 2.4], [-2.6, 4.6], [2.6, 4.6]];
const KINDS = ['round', 'gothic', 'cross', 'round', 'gothic', 'round', 'cross', 'gothic'];
export const PEWS_A = [[-5.5, -1.2], [5.5, -1.2], [-5.5, 2.6], [5.5, 2.6]];
export const PEWS_F = [[-4.2, -1.2], [4.2, -1.2], [-4.2, 1.8], [4.2, 1.8]];
export const PEWS_H = [[-4.2, -0.8], [4.2, -0.8], [-4.2, 2.0], [4.2, 2.0]];
const CHAIRS = [[-6.2, -1.8], [-4.6, -1.8], [4.6, -1.8], [6.2, -1.8], [-6.2, -0.6], [-4.6, -0.6], [4.6, -0.6], [6.2, -0.6]];

// ------------------------------------------------------------------------------------------------ lite floors (before the bake)
function liteFloor(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  const R = P.rng(kind.length * 7);
  if (kind === 'marble') {
    g.fillStyle = '#0a080b'; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(230,220,230,${0.05 + R() * 0.12})`; g.lineWidth = 0.5 + R() * 2; g.beginPath(); let x = R() * 1024, y = R() * 1024; g.moveTo(x, y); for (let k = 0; k < 12; k++) { x += (R() - 0.3) * 90; y += (R() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
    // the gold sunburst round the casket (casket at z -5 -> v = (7-(-5))/14) and the blush runner
    const cx = 512, cy = (12 / 14) * 1024 * 0 + ((-5 + 7) / 14) * 1024;
    g.strokeStyle = 'rgba(224,176,76,0.7)'; g.lineWidth = 3; for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60); g.lineTo(cx + Math.cos(a) * (i % 2 ? 200 : 300), cy + Math.sin(a) * (i % 2 ? 200 : 300)); g.stroke(); }
    g.fillStyle = '#c98c98'; g.fillRect(512 - 56, ((-4.2 + 7) / 14) * 1024, 112, 1024);
  } else if (kind === 'turf') {
    g.fillStyle = '#2a3a2c'; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 30000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(90,70,120,0.18)' : 'rgba(70,120,70,0.2)'; g.fillRect(R() * 1024, R() * 1024, 2, 4); }
    for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(40,28,22,0.35)'; g.beginPath(); g.ellipse(R() * 1024, R() * 1024, 30 + R() * 60, 20 + R() * 40, R() * 3, 0, 7); g.fill(); }
  } else if (kind === 'tile') {
    g.fillStyle = '#e8ece8'; g.fillRect(0, 0, 1024, 1024); const s = 22;
    g.strokeStyle = 'rgba(120,130,125,0.6)'; g.lineWidth = 2;
    for (let y = 0; y < 1024 / (s * 1.5) + 1; y++) for (let x = 0; x < 1024 / (s * 1.732) + 1; x++) { const cx = x * s * 1.732 + (y % 2) * s * 0.866, cy = y * s * 1.5; g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); } g.closePath(); g.stroke(); }
    g.fillStyle = '#3a3a3e'; g.beginPath(); g.arc(512, 512, 18, 0, 7); g.fill();
  } else if (kind === 'stone') {
    g.fillStyle = '#1c1a20'; g.fillRect(0, 0, 1024, 1024);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) { const l = 22 + R() * 10; g.fillStyle = `rgb(${l},${l - 2},${l + 4})`; g.fillRect(x * 102 + (y % 2) * 51 + 2, y * 128 + 2, 98, 124); }
  } else {
    g.fillStyle = '#f3efe9'; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(190,180,170,${0.05 + R() * 0.1})`; g.lineWidth = 1 + R(); g.beginPath(); let x = R() * 1024, y = R() * 1024; g.moveTo(x, y); for (let k = 0; k < 10; k++) { x += (R() - 0.3) * 90; y += (R() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const rough = { marble: 0.08, turf: 0.85, tile: 0.25, stone: 0.6, white: 0.15 }[kind];
  const m = new THREE.Mesh(new THREE.PlaneGeometry(23, 15), new THREE.MeshStandardMaterial({ map: t, roughness: rough, metalness: 0 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  return m;
}

// ------------------------------------------------------------------------------------------------ the set
const WHITE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);

export class FuneralSet {
  constructor(f) {
    this.f = f;
    this.group = new THREE.Group(); this.group.name = 'funeral-set';
    f.scene.add(this.group);
    this.bounds = { minX: -11, maxX: 11, minZ: -7, maxZ: 7 };
    this.broken = new Set();          // breakable props broken so far (names), snapshotted per checkpoint
    this.override = new Map();        // prop name -> { x, z, y, rotY, visible } set by attacks (cleared on rewind)
    this.hp = new Map();
    this.t = -1;
    this.expK = 1; this.sat = 1;
    this.grade = { dusk: 1.05, candle: 1.0, studio: 0.95, night: 0.92, dawn: 0.95, prep: 0.78, '3am': 1.0, wedding: 1.2 };
  }

  async load() {
    const f = this.f;
    try {
      const r = await fetch(URL_ARENA, { method: 'HEAD' });
      if (!r.ok) throw new Error('no bake');
      this.arena = await Arena.load(URL_ARENA, f.app.renderer, f.scene, { camera: f.cam.cam, shadowSize: 4096 });
      this.arena.prepareCamera(f.cam.cam);
      this.baked = true;
    } catch (e) {
      this.arena = null; this.baked = false;
    }
    if (this.baked) this._setupBaked(); else this._setupLite();
    this._buildProps();
    this.evaluate(0, true);
  }

  // ---------- the baked arena: its groups are the sets ----------
  _setupBaked() {
    const a = this.arena;
    this.nodes = a.nodes;
    this.floors = {};
    const want = ['viewing', 'viewing_walls', 'viewing_props', 'viewing_door_l', 'viewing_door_r', 'cemetery', 'cemetery_gate_l', 'cemetery_gate_r', 'prep', 'prep_walls', 'chapel', 'chapel_walls'];
    this.home = {};
    for (const n of want) { const o = a.nodes[n]; if (o) this.home[n] = o.position.clone(); }
    // the floors (one mirror or matte plane per set) get a radial wipe so a ripple can change them
    a.group.traverse((o) => {
      if (!o.isMesh) return;
      const info = o.userData && o.userData.arena ? (typeof o.userData.arena === 'string' ? JSON.parse(o.userData.arena) : o.userData.arena) : {};
      if (info.mat && /_floor$/.test(info.mat)) { const set = info.mat.replace(/_floor$/, ''); this.floors[set] = o; this._wipePatch(o.material); }
    });
    this.key = a.key;
    // the prep room's white hex tile toned down to a grey-mint: her white lanes, circles and the door's line have to
    // read on it (the room stays its colour; only the floor's albedo comes down)
    if (this.floors.prep) this.floors.prep.material.color.multiplyScalar(0.45);
    // the light shafts are built for every window in the bake: the chapel's states shine through the chapel's
    for (const [name, o] of Object.entries(a.shafts || {})) if (name === '3am' || name === 'wedding') o.position.x -= OFFSET.chapel;
    this.neon = a.emissive.find((e) => e.name === 'v_neon') || null;
  }
  _wipePatch(mat) {
    if (mat.userData.wipe) return;
    const u = { uWipeC: { value: new THREE.Vector2() }, uWipeR: { value: 0 }, uWipeOn: { value: 0 } };
    mat.userData.wipe = u;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      prev && prev.call(mat, sh, r);
      Object.assign(sh.uniforms, u);
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform vec2 uWipeC; uniform float uWipeR, uWipeOn;\nvoid main() {\n  if ( uWipeOn > 0.5 && length( vArenaW.xz - uWipeC ) < uWipeR ) discard;');
    };
    const key = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
    mat.customProgramCacheKey = () => key + '-wipe';
    mat.needsUpdate = true;
  }

  // ---------- before the bake: plain floors and three real-time lights ----------
  _setupLite() {
    const g = this.group;
    this.liteFloors = { viewing: liteFloor('marble'), cemetery: liteFloor('turf'), prep: liteFloor('tile'), chapel: liteFloor('stone'), white: liteFloor('white') };
    for (const m of Object.values(this.liteFloors)) { m.visible = false; g.add(m); }
    const key = new THREE.DirectionalLight(0xffd6c0, 2.4); key.position.set(-6, 14, 7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -15, right: 15, top: 12, bottom: -12, near: 1, far: 50 }); key.shadow.bias = -0.0004;
    g.add(key, key.target); this.key = key;
    this.hemi = new THREE.HemisphereLight(0x8a80c0, 0x241418, 0.9); g.add(this.hemi);
    const rim = new THREE.DirectionalLight(0xff6ea8, 1.0); rim.position.set(6, 6, -10); g.add(rim);
  }

  // ---------- the real-time props ----------
  _buildProps() {
    const g = this.group, f = this.f;
    const add = (name, obj, o = {}) => { obj.name = name; g.add(obj); const p = { name, obj, foot: obj.userData.foot || null, cover: o.cover ?? !!obj.userData.foot, solid: o.solid ?? !!obj.userData.foot, hp: o.hp || 0, y0: 0, ...o }; this.props[name] = p; if (p.hp) this.hp.set(name, p.hp); return p; };
    this.props = {};
    add('casket', P.makeCasket(), { cover: true });
    if (!this.baked) add('catafalque', P.makeCatafalque());
    PEWS_A.forEach((_, i) => add('pew' + i, P.makePew('mahogany'), { hp: 6 }));
    this.pewMats = { mahogany: P.mats().mahogany, dark: P.mats().pewDark, white: P.mats().pewWhite };
    this.cushionMats = { mahogany: P.mats().velvetBlush, dark: P.mats().velvetPlum, white: P.mats().satinWhite };
    STONES_B.forEach((_, i) => add('stone' + i, P.makeHeadstone(KINDS[i], i)));
    add('beloved', P.makeBeloved());
    add('grave', P.makeGrave(), { cover: false, solid: false });
    add('lectern', P.makeLectern());
    add('canopy', P.makeCanopy(), { cover: false, solid: false });
    CHAIRS.forEach((_, i) => add('chair' + i, P.makeChair(), { hp: 1 }));
    add('table', P.makeTable());
    add('partition', P.makePartition(), { cover: true });
    add('trolley0', P.makeTrolley(2)); add('trolley1', P.makeTrolley(5));
    add('book', P.makeGuestBook(), { cover: false });
    add('road', P.makeRoad(), { cover: false, solid: false });
    add('island', P.makeIsland(), { cover: false });
    add('arch', P.makeArch(), { cover: false, solid: false });
    add('runnerW', P.makeRunner(0xf6f1ea, 9.2, 1.5), { cover: false, solid: false });
    add('board', P.makeLetterBoard(), { cover: false, solid: false });
    add('hymn', P.makeHymnBoard(), { cover: false, solid: false });
    add('rope', P.makeRope(false), { cover: false, solid: false });
    add('ropeW', P.makeRope(true), { cover: false, solid: false });
    // casters: props throw real-time shadows on the baked set like the characters do
    if (this.arena) for (const p of Object.values(this.props)) if (p.foot && p.name !== 'road') this.arena.addCaster(p.obj);
    else for (const p of Object.values(this.props)) p.obj.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  // a prop moved by an attack (the casket carried, the kicked table, BELOVED ridden); cleared on rewind
  drive(name, o) { this.override.set(name, { ...(this.override.get(name) || {}), ...o }); }
  release(name) { this.override.delete(name); }

  // ---------- breakables ----------
  // the four pews are one set of objects dressed three ways (the viewing room's, the 3 a.m. chapel's, the wedding's):
  // what you or the pallbearers break stays broken in that room only
  bkey(name, t = this.t) { return name.startsWith('pew') ? `${name}@${t < TL.chapel ? 'viewing' : t < TL.wedding ? 'chapel' : 'wedding'}` : name; }
  isBroken(name) { return this.broken.has(this.bkey(name)); }
  snapshot() { return { broken: new Set(this.broken), hp: new Map(this.hp) }; }
  restore(s) { this.broken = new Set(s.broken); this.hp = new Map(s.hp); this.override.clear(); this.evaluate(this.f.t, true); }
  hitProp(name, dmg = 1, ang = 0, by = 'you') {
    const p = this.props[name], key = this.bkey(name); if (!p || !p.hp || this.broken.has(key)) return false;
    const hp = (this.hp.get(key) ?? p.hp) - dmg; this.hp.set(key, hp);
    const f = this.f, o = p.obj;
    f.fx.chips(o.position.x, 0.7, o.position.z, new THREE.Color(1.2, 0.5, 0.35), 6, ang);
    if (hp <= 0) {
      this.broken.add(key);
      f.fx.chips(o.position.x, 0.7, o.position.z, name.startsWith('pew') ? new THREE.Color(0.9, 0.35, 0.22) : new THREE.Color(2.2, 2.2, 2.1), 30);
      f.cam.shake(0.35, 0.12);
      this.onBreak && this.onBreak(p, by);
      this.evaluate(f.t, true);
    } else this.onChip && this.onChip(p);
    return true;
  }
  strikeArc(x, z, ang, range, arc, s) {
    for (const p of Object.values(this.props)) {
      if (!p.hp || !p.active || !p.up || this.isBroken(p.name)) continue;      // (a pew or chair sunk under the floor isn't there to hit)
      const o = p.obj, dx = o.position.x - x, dz = o.position.z - z, d = Math.hypot(dx, dz);
      if (d > range + 1.0) continue;
      const da = Math.atan2(Math.sin(Math.atan2(dx, dz) - ang), Math.cos(Math.atan2(dx, dz) - ang));
      if (Math.abs(da) > arc && d > 1.2) continue;
      // the footprint edge must be in reach
      if (p.foot && p.foot.hx) { const ca = Math.cos(-o.rotation.y), sa = Math.sin(-o.rotation.y); const lx = (x - o.position.x) * ca + (z - o.position.z) * sa, lz = -(x - o.position.x) * sa + (z - o.position.z) * ca; const ex = Math.max(0, Math.abs(lx) - p.foot.hx), ez = Math.max(0, Math.abs(lz) - p.foot.hz); if (Math.hypot(ex, ez) > range * 0.7) continue; }
      this.hitProp(p.name, s && s.heavy ? 2 : 1, ang);
    }
  }

  // ---------- what is cover and what is solid right now ----------
  footprint(p, pad = 0) {
    const o = p.obj, ft = p.foot; if (!ft) return null;
    if (ft.r !== undefined) return { type: 'circle', x: o.position.x, z: o.position.z, r: ft.r + pad, name: p.name };
    const rot = o.rotation.y;
    const cx = ft.cx ? o.position.x + Math.cos(rot) * ft.cx : o.position.x, cz = ft.cx ? o.position.z - Math.sin(rot) * ft.cx : o.position.z;
    return { type: 'box', x: cx, z: cz, hx: ft.hx + pad, hz: ft.hz + pad, rot: -rot, name: p.name };
  }
  cover() {
    const out = [];
    for (const p of Object.values(this.props)) if (p.active && p.cover && p.up) { const fp = this.footprint(p); if (fp) out.push(fp); }
    if (this.extraCover) for (const c of this.extraCover()) out.push(c);
    return out;
  }
  solids() {
    const out = [];
    for (const p of Object.values(this.props)) { if (!p.active || !p.solid || !p.up) continue; if (this.ghost && (p.name === 'casket' || p.name === 'catafalque')) continue; const fp = this.footprint(p); if (fp) out.push(fp); }
    if (this.extraSolids) for (const c of this.extraSolids()) out.push(c);
    return out;
  }
  resolve(x, z, r = 0.35, ignore = null) {
    const b = this.bounds;
    for (const c of this.solids()) {
      if (ignore && c.name === ignore) continue;
      if (c.type === 'circle') { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), R = c.r + r; if (d < R && d > 1e-5) { x = c.x + dx / d * R; z = c.z + dz / d * R; } continue; }
      const ca = Math.cos(c.rot), sa = Math.sin(c.rot);
      let lx = (x - c.x) * ca + (z - c.z) * sa, lz = -(x - c.x) * sa + (z - c.z) * ca;
      const hx = c.hx + r, hz = c.hz + r;
      if (Math.abs(lx) < hx && Math.abs(lz) < hz) { if (hx - Math.abs(lx) < hz - Math.abs(lz)) lx = Math.sign(lx || 1) * hx; else lz = Math.sign(lz || 1) * hz; x = c.x + lx * ca - lz * sa; z = c.z + lx * sa + lz * ca; }
    }
    if (this.wall) { const w = this.wall; if (w.minX !== undefined && z > w.z0 && z < w.z1 && x < w.minX + r) x = w.minX + r; }
    x = Math.max(b.minX + r, Math.min(b.maxX - r, x)); z = Math.max(b.minZ + r, Math.min(b.maxZ - r, z));
    return { x, z };
  }

  // ---------- the timeline ----------
  // which set's floor is down, and the ripple into the next one: [t, set, centre, duration]
  static FLOORS = [[0, 'viewing'], [TL.turf, 'cemetery', [0, -4.6], 0.6], [TL.prep, 'prep', [0, -2.0], 0.33], [TL.road, 'cemetery', [-11, 0], 0.4], [TL.chapel, 'chapel', [0, -4], 0.65], [TL.burst, 'cemetery', [0, -4], 0.45], [TL.wedding, 'white', [0, 0], 0.06]];
  floorAt(t) { let cur = FuneralSet.FLOORS[0], prev = null; for (const e of FuneralSet.FLOORS) if (e[0] <= t) { prev = cur; cur = e; } return { cur, prev: cur === FuneralSet.FLOORS[0] ? null : prev }; }

  evaluate(t, force = false) {
    this.t = t;
    const props = this.props, ov = this.override;
    const set = (name, s) => {
      const p = props[name]; if (!p) return;
      const o = ov.get(name);
      const st = { visible: true, x: 0, z: 0, y: 0, rotY: 0, ...s, ...(o || {}) };
      const broken = this.broken.has(this.bkey(name, t));
      p.active = st.visible && !broken;
      p.up = st.y > -0.35;
      p.obj.visible = p.active && st.y > -1.5;
      p.obj.position.set(st.x, st.y + (st.lift || 0), st.z);
      p.obj.rotation.set(st.rotX || 0, st.rotY, st.rotZ || 0);
      if (st.scale !== undefined) p.obj.scale.setScalar(st.scale); else if (p.obj.scale.x !== 1 && !st.scaleX) p.obj.scale.setScalar(1);
      if (st.scaleX !== undefined) p.obj.scale.set(st.scaleX, 1, 1);
    };
    // the casket: on its catafalque, carried, in the grave, on the chapel bier
    const lidOpen = smooth(TL.candle, TL.candle + 0.3, t);
    let casket;
    if (t < TL.turf) casket = { x: 0, z: -5.0, y: 0.65, rotY: 0, visible: true };
    else if (t < TL.prep + 0.3) casket = { x: 0, z: -3.1, y: 0.65 - 1.6 * smooth(TL.turf, TL.turf + 0.3, t), rotY: Math.PI / 2, visible: t < TL.turf + 0.3 };
    else if (t < TL.road) casket = { visible: false };
    else if (t < TL.chapel) casket = { visible: false };
    else if (t < TL.burst) casket = { x: 0, z: -4.0, y: 0.75 * smooth(TL.chapel, TL.chapel + 0.65, t), rotY: 0, visible: true };
    else casket = { visible: false };
    set('casket', casket);
    const ck = props.casket.obj.userData;
    if (!ov.get('casket') || !ov.get('casket').lid) ck.lidFoot.rotation.x = -1.75 * lidOpen;
    if (!this.baked) set('catafalque', { x: 0, z: -5.0, y: riseSink(t, -1, TL.turf, { depth: 1.2 }), visible: t < TL.turf + 0.3 });
    // pews: the viewing room's (sink on the ripple), the chapel's (rise as it flies in), the wedding's (white)
    const pewMat = t >= TL.wedding ? 'white' : t >= TL.chapel ? 'dark' : 'mahogany';
    for (let i = 0; i < 4; i++) {
      let s;
      if (t < TL.chapel) s = { x: PEWS_A[i][0], z: PEWS_A[i][1], y: riseSink(t, -1, TL.turf, { depth: 1.2 }), rotY: 0 };
      else if (t < TL.wedding) s = { x: PEWS_F[i][0], z: PEWS_F[i][1], y: riseSink(t, TL.chapel, TL.burst, { dur: 0.6, depth: 1.2, gentle: true }), rotY: 0 };
      else s = { x: PEWS_H[i][0], z: PEWS_H[i][1], y: 0, rotY: 0 };
      set('pew' + i, s);
      const p = props['pew' + i];
      if (p.mat !== pewMat) { p.mat = pewMat; const mm = this.pewMats[pewMat], cm = this.cushionMats[pewMat]; p.obj.traverse((o) => { if (!o.isMesh) return; if (o.userData.cushion) o.material = cm; else if (o.material !== P.mats().satinWhite) o.material = mm; }); }
    }
    // headstones: the chorus 1 layout (the back row sinks a beat apart at the break), the procession, the dawn ring
    for (let i = 0; i < 8; i++) {
      const back = i < 4;
      let s;
      if (t < TL.prep + 0.3) { const sinkAt = back ? TL.eulogy + (i % 4) * BEAT : TL.prep; s = { x: STONES_B[i][0], z: STONES_B[i][1], y: riseSink(t, TL.turf + i * 0.01, sinkAt, { depth: 1.5 }) }; }
      else if (t < TL.chapel + 0.3) s = { x: STONES_E[i][0], z: STONES_E[i][1], y: riseSink(t, TL.road + i * 0.01, TL.chapel, { depth: 1.5 }) };
      else s = { x: STONES_G[i][0], z: STONES_G[i][1], y: riseSink(t, TL.ring + (i % 2) * BEAT, TL.wedding, { dur: 0.33, depth: 1.5, gentle: true }) };
      s.rotY = 0;
      set('stone' + i, s);
    }
    // BELOVED and the grave in front of it
    let bel;
    if (t < TL.prep + 0.3) bel = { x: 0, z: -4.6, y: riseSink(t, TL.turf, TL.prep, { depth: 1.8 }) };
    else if (t < TL.chapel + 0.3) bel = { x: 0, z: -4.6, y: riseSink(t, TL.road, TL.chapel, { depth: 1.8 }) };
    else bel = { x: 0, z: -5.6, y: riseSink(t, TL.burst, TL.wedding, { dur: 0.3, depth: 1.8 }) };
    set('beloved', bel);
    const graveOn = (t >= TL.turf && t < TL.prep) || (t >= TL.road && t < TL.chapel) || (t >= TL.burst && t < TL.wedding);
    set('grave', { x: 0, z: t >= TL.burst ? -4.2 : -3.1, y: 0, visible: graveOn, rotY: 0 });
    // the graveside service: the lectern, the chairs in pairs, the canopy
    set('lectern', { x: 0, z: -3.0, y: riseSink(t, TL.lectern, TL.prep, { depth: 1.4 }) });
    for (let i = 0; i < 8; i++) { const pair = [0, 2, 1, 3][Math.floor(i / 2) % 4]; set('chair' + i, { x: CHAIRS[i][0], z: CHAIRS[i][1], y: riseSink(t, TL.chairs + pair * BEAT, TL.prep, { dur: 0.16, depth: 1.0 }), rotY: 0 }); }
    set('canopy', { x: 0, z: -4.6, y: t < TL.eulogy ? 9 : t < TL.prep ? 9 * (1 - smooth(TL.eulogy, TL.eulogy + 4 * BEAT, t)) : 9 * smooth(TL.prep, TL.prep + 0.5, t), visible: t >= TL.eulogy && t < TL.prep + 0.6 });
    // the prep room
    const prepOn = t >= TL.prep - 0.01 && t < TL.road + 0.1;
    const prepY = (d) => riseSink(t, TL.prep, TL.prepOut + 4 * BEAT, { depth: d, dur: 0.2 });
    set('table', { x: 0, z: -2.0, y: prepY(1.2), visible: prepOn });
    const doorK = t < TL.door - 0.12 ? 0 : t < TL.door ? (t - TL.door + 0.12) / 0.12 : t < TL.level ? 1 : 1 - smooth(TL.level, TL.level + 0.4, t);
    set('partition', { x: 34.4 - doorK * 23, z: -1.4, y: t >= TL.level ? 3.2 * smooth(TL.level, TL.level + 0.4, t) : 0, visible: prepOn && t >= TL.door - 0.15 && t < TL.level + 0.45, lift: 0 });
    props.partition.up = props.partition.active && doorK > 0.98 && t < TL.level;
    const tiltK = t >= TL.tilt ? (() => { const k = clamp01((t - TL.tilt) / 1.5); return k * k * (2 - k); })() : 0;
    set('trolley0', { x: -8.0 + tiltK * 14, z: 2.2, y: prepY(1.2), visible: prepOn });
    set('trolley1', { x: -8.0 + tiltK * 14, z: 5.0, y: prepY(1.2), visible: prepOn });
    set('book', { x: 8.6, z: 3.4, y: prepY(1.4), visible: prepOn, rotY: -0.5 });
    // the procession: the road unrolls left to right on the slam, the island rises; both sink into the chapel
    const roadK = smooth(TL.road, TL.road + 0.4, t);
    set('road', { x: -17 + 17 * roadK, z: 0, y: t < TL.chapel ? 0 : -0.3 * smooth(TL.chapel, TL.chapel + 0.6, t), scaleX: Math.max(0.001, roadK), visible: t >= TL.road && t < TL.chapel + 0.6 });
    props.road.obj.position.x = -17 * (1 - roadK);
    set('island', { x: 0, z: 0, y: riseSink(t, TL.island, TL.chapel, { dur: 0.3, depth: 0.6, gentle: true }), visible: t >= TL.island - 0.01 && t < TL.chapel + 0.4 });
    // the wedding: the white rose arch where the casket stood, the white runner, the white rope
    set('arch', { x: 0, z: -4.6, y: 0, visible: t >= TL.wedding });
    set('runnerW', { x: 0, z: -0.1, y: 0, visible: t >= TL.wedding });
    set('rope', { x: 0, z: 0, y: 0, visible: t < TL.wedding });
    set('ropeW', { x: 0, z: 0, y: 0, visible: t >= TL.wedding });
    props.rope.obj.position.set(0, 0, 0); props.ropeW.obj.position.set(0, 0, 0);
    // the letter board (OPEN CASKET, OPEN BAR word by word) until the walls fly; the hymn board in the chapel
    set('board', { x: 9.6, z: -3.2, y: t < TL.walls ? 0 : 6 * smooth(TL.walls, TL.walls + 3 * BEAT, t), visible: t < TL.turf, rotY: -0.5 });
    const words = ['OPEN', 'CASKET,', 'OPEN', 'BAR'].filter((w, i) => t >= [22.0, 22.8, 23.74, 24.1][i]);
    if (props.board.words !== words.length) { props.board.words = words.length; props.board.obj.userData.draw(words); if (words.length && !force) this.onWord && this.onWord(words.length); }
    set('hymn', { x: -8.42, z: -2.0, y: 0, visible: t >= TL.chapel && t < TL.burst, rotY: Math.PI / 2 });
    // the bounds: 16 x 10 in the chapel and at the wedding (anyone outside is slid in over 2 beats)
    const small = (t >= TL.chapel && t < TL.burst) || t >= TL.wedding;
    const k = small ? smooth(t >= TL.wedding ? TL.wedding : TL.chapel, (t >= TL.wedding ? TL.wedding : TL.chapel) + 2 * BEAT, t) : (t >= TL.burst && t < TL.burst + 2 * BEAT ? 1 - smooth(TL.burst, TL.burst + 2 * BEAT, t) : 0);
    const b = this.bounds;
    b.minX = -11 + 3 * k; b.maxX = 11 - 3 * k; b.minZ = -7 + 1.5 * k; b.maxZ = 7 - 2.5 * k;
    // the bar counter is the left bound in the viewing room
    this.wall = t < TL.walls ? { minX: -10.4, z0: -5, z1: 3 } : null;
    this._sets(t);
  }

  // which set groups are where (baked), or which lite floor shows
  _sets(t) {
    const fl = this.floorAt(t);
    const cur = fl.cur, prev = fl.prev;
    const name = (s) => (s === 'white' ? 'chapel' : s);
    const ripple = prev && t < cur[0] + (cur[3] || 0.5) ? { from: prev[1], to: cur[1], c: cur[2] || [0, 0], k: clamp01((t - cur[0]) / (cur[3] || 0.5)) } : null;
    this.ripple = ripple;
    if (!this.baked) {
      for (const [k, m] of Object.entries(this.liteFloors)) m.visible = false;
      const show = (s, y = 0) => { const m = this.liteFloors[s]; m.visible = true; m.position.y = y; };
      if (ripple) { show(ripple.from, 0); show(ripple.to, -0.02); this._liteWipe(ripple); } else { show(cur[1], 0); this._liteWipe(null); }
      return;
    }
    // baked: move each set group into place (or away), wipe the outgoing floor
    const at = (n, on, dy = 0, dx = 0, dz = 0) => { const o = this.nodes[n]; if (!o) return; const set = n.split('_')[0]; const h = this.home[n]; o.visible = on; o.position.set(h.x - OFFSET[set] + dx, h.y + dy, h.z + dz); };
    const on = (s) => cur[1] === s || (s === 'chapel' && cur[1] === 'white') || (ripple && name(ripple.from) === s) || (ripple && name(ripple.to) === s);
    // the viewing room: walls fly (back up, sides out), the doors blow open, its props sink on the ripple
    const wallsK = smooth(TL.walls, TL.walls + 3 * BEAT, t);
    const vOn = t < TL.turf + 0.7;
    at('viewing', vOn && on('viewing'));
    at('viewing_props', vOn, -1.4 * smooth(TL.turf, TL.turf + 0.3, t));
    at('viewing_walls', vOn && wallsK < 1, 9 * wallsK, 0);
    for (const [n, sd] of [['viewing_door_l', -1], ['viewing_door_r', 1]]) { at(n, vOn && wallsK < 1, 9 * wallsK); const o = this.nodes[n]; if (o) o.rotation.y = sd * 1.9 * backOut((t - TL.doors) / 0.18) * (t >= TL.doors ? 1 : 0); }
    // the cemetery: revealed behind the flying walls, gone under the prep room, back for the procession and dawn
    const cOn = (t >= TL.walls && t < TL.prep + 0.4) || (t >= TL.prepOut && t < TL.chapel + 0.7) || (t >= TL.burst - 0.05 && t < TL.wedding + 0.05);
    at('cemetery', cOn);
    const gateK = t >= TL.island && t < TL.chapel ? smooth(TL.island, TL.island + 0.6, t) : (t >= 176.6 && t < 181 ? smooth(176.6, 177.0, t) * (1 - smooth(180.4, 181, t)) : 0);
    for (const [n, sd] of [['cemetery_gate_l', 1], ['cemetery_gate_r', -1]]) { at(n, cOn); const o = this.nodes[n]; if (o) o.rotation.y = sd * 1.4 * gateK; }
    // the prep room: the tile flats drop in on one beat, fly up during the chorus' drain
    const pOn = t >= TL.prep - BEAT && t < TL.road + 0.6;
    at('prep', pOn && on('prep'));
    const dropK = smooth(TL.prep - BEAT, TL.prep, t), upK = smooth(TL.prepOut, TL.prepOut + 4 * BEAT, t);
    at('prep_walls', pOn && upK < 1, 9 * (1 - dropK) + 9 * upK);
    // the chapel: flies in over 2 beats, its walls blow out on the casket's slam; white for the wedding
    const chOn = (t >= TL.chapel - 0.05 && t < TL.burst + 0.5) || t >= TL.wedding;
    at('chapel', chOn && on('chapel'));
    const inK = smooth(TL.chapel, TL.chapel + 2 * BEAT, t), outK = t >= TL.burst && t < TL.wedding ? smooth(TL.burst, TL.burst + 0.4, t) : 0;
    at('chapel_walls', chOn && outK < 1, 9 * (1 - inK) - 2.5 * outK * outK);
    if (this.nodes.chapel_walls) this.nodes.chapel_walls.scale.set(1 + outK * 0.6, 1, 1 + outK * 0.6);
    // the floors: the outgoing one is wiped open from the ripple's centre; the incoming one sits 2 cm below
    for (const [s, m] of Object.entries(this.floors || {})) { const u = m.material.userData.wipe; if (u) u.uWipeOn.value = 0; m.position.y = 0; }
    if (ripple) {
      const fo = this.floors[name(ripple.from)], fi = this.floors[name(ripple.to)];
      if (fo && fo !== fi) { const u = fo.material.userData.wipe; u.uWipeOn.value = 1; u.uWipeR.value = ripple.k * 30; u.uWipeC.value.set(ripple.c[0], ripple.c[1]); }
      if (fi && fi !== fo) fi.position.y = -0.02;
    }
    this._white(t >= TL.wedding);
  }
  _liteWipe(r) {
    for (const m of Object.values(this.liteFloors)) { const mat = m.material; if (!mat.userData.wipe) this._litePatch(mat); mat.userData.wipe.uWipeOn.value = 0; }
    if (!r) return;
    const m = this.liteFloors[r.from]; const u = m.material.userData.wipe; u.uWipeOn.value = 1; u.uWipeR.value = r.k * 30; u.uWipeC.value.set(r.c[0], r.c[1]);
  }
  _litePatch(mat) {
    const u = { uWipeC: { value: new THREE.Vector2() }, uWipeR: { value: 0 }, uWipeOn: { value: 0 } };
    mat.userData.wipe = u;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWipeW;').replace('#include <project_vertex>', '#include <project_vertex>\nvWipeW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWipeW; uniform vec2 uWipeC; uniform float uWipeR, uWipeOn;').replace('void main() {', 'void main() {\n  if (uWipeOn > 0.5 && length(vWipeW.xz - uWipeC) < uWipeR) discard;');
    };
    mat.customProgramCacheKey = () => 'mp4-wipe';
    mat.needsUpdate = true;
  }
  // the white wedding: every chapel material white (the bake keeps its light; the colour goes)
  _white(on) {
    if (this._isWhite === on || !this.nodes) return;
    this._isWhite = on;
    for (const n of ['chapel', 'chapel_walls']) {
      const o = this.nodes[n]; if (!o) continue;
      o.traverse((m) => {
        if (!m.isMesh || !m.material) return;
        const mat = m.material;
        if (!mat.userData.orig) mat.userData.orig = { map: mat.map, color: mat.color ? mat.color.clone() : null };
        // a plain white picture in place of the map (taking the map away would rebuild the shader mid-song)
        const o = mat.userData.orig;
        if (on) { if (o.map) { if (!o.white) { o.white = WHITE.clone(); o.white.channel = o.map.channel; o.white.needsUpdate = true; } mat.map = o.white; } mat.color && mat.color.setRGB(0.93, 0.9, 0.87); }
        else { mat.map = o.map; o.color && mat.color.copy(o.color); }
      });
    }
  }

  // ---------- the light, by song time ----------
  light(t) {
    const a = this.arena;
    let expK = 1, sat = 1;
    if (a) {
      const S = (n) => a.stateIndex[n] !== undefined;
      let s = ['dusk', 'dusk', 0];
      if (t < TL.candle) s = ['dusk', 'dusk', 0];
      else if (t < TL.studio) s = ['dusk', 'candle', smooth(TL.candle, TL.candle + BEAT, t)];
      else if (t < TL.walls) s = ['candle', 'studio', smooth(TL.studio, TL.studio + 0.1, t)];
      else if (t < TL.turf) s = ['studio', 'night', smooth(TL.walls, TL.walls + 4 * BEAT, t)];
      else if (t < TL.prep) s = ['night', 'night', 0];
      else if (t < TL.road) s = t < TL.prepOut ? ['prep', 'prep', 0] : ['prep', 'night', smooth(TL.prepOut, TL.prepOut + 4 * BEAT, t)];
      else if (t < TL.chapel) s = ['night', 'night', 0];
      else if (t < TL.burst) s = ['3am', '3am', 0];
      else if (t < TL.sunrise) s = ['night', 'dawn', smooth(TL.burst, TL.sunrise, t)];
      else if (t < TL.wedding) s = ['dawn', 'dawn', 0];
      else s = ['wedding', 'wedding', 0];
      if (!S(s[0]) || !S(s[1])) s = [a.states[0].name, a.states[0].name, 0];
      a.setState(s[0], s[1], s[2]);
      // the window shafts are seen from above here: a breath of them, not a fog bank
      for (const o of Object.values(a.shafts || {})) { const u = o.material.uniforms.uIntensity; u.value *= 0.3; o.visible = u.value > 0.001; }
      // moods on top: the tubes stutter on (two dips, never a strobe), every light cuts at 3 a.m., the sun climbs
      // (two soft dips 0.38 s apart, slower than 3 a second: a whole room blinking faster than that is a strobe)
      if (t >= TL.prep && t < TL.prep + 0.6) { const k = t - TL.prep; const dip = (a, b, d) => d * smooth(a, a + 0.03, k) * (1 - smooth(b - 0.03, b, k)); expK = 1 - dip(0.04, 0.14, 0.5) - dip(0.42, 0.53, 0.4); }
      // the bar's neon buzzes on with "bar"; in the pre the room pulses pink on the snares (beats 2 and 4)
      if (this.neon && t < 23.961) this.neon.mat.emissive.setRGB(0, 0, 0);
      if (t >= 42.853 && t < TL.walls && this.f.bm) { const ph = this.f.bm.beatAt(t) - this.f.bm.downbeat; const bi = Math.floor(ph); if (bi % 2 === 1) expK *= 1 + 0.07 * Math.exp(-(ph - bi) * 6); }
      if (t >= TL.dark && t < TL.burst) expK = 0.45;
      if (t >= TL.chapel && t < TL.dark) expK = 0.75;
      if (t >= TL.sunHigh && t < TL.wedding) { sat = 1.14; expK = 1.08; }
      if (t >= TL.wedding) sat = 0.9;            // the white wedding: less of the bake's beige, a cleaner white
      if (t >= TL.walls && t < TL.turf) expK = 1 - 0.35 * smooth(TL.walls, TL.walls + 2 * BEAT, t);
      // each set's own grade: the bake's exposures, tuned by eye from the game camera
      const grade = this.grade;
      expK *= (grade[s[0]] ?? 1) * (1 - s[2]) + (grade[s[1]] ?? 1) * s[2];
      const bloom = { dusk: 0.32, candle: 0.4, studio: 0.3, night: 0.3, dawn: 0.28, prep: 0.18, '3am': 0.45, wedding: 0.2 };
      this.bloom = (bloom[s[0]] ?? 0.3) * (1 - s[2]) + (bloom[s[1]] ?? 0.3) * s[2];
    }
    this.expK = expK; this.sat = sat;
  }

  update(dt, t, f) {
    this.evaluate(t);
    this.light(t);
    if (this.arena) {
      // the reflections are captured from the set: again once each set change has settled (and after a jump)
      const settle = [TL.turf + 0.8, TL.prep + 0.6, TL.road + 0.8, TL.chapel + 0.9, TL.burst + 0.7, TL.wedding + 0.8];
      const last = this._envLast ?? -1;
      if (Math.abs(t - last) > 0.5 ? true : settle.some((s) => last < s && t >= s)) { if (Math.abs(t - last) > 0.5) this._envSoon = 2; else this.arena._captureEnv(); }
      if (this._envSoon > 0 && --this._envSoon === 0) this.arena._captureEnv();
      this._envLast = t;
      this.arena.update(dt, f.cam.cam, f.player.root.position);
      f.app.post.fx.exposure = this.arena.exposure * this.expK;
    } else {
      f.app.post.fx.exposure = 1.0 * this.expK;
      if (this.hemi) this.hemi.intensity = t >= TL.dark && t < TL.burst ? 0.2 : 0.9;
    }
    const fx = f.app.post.fx; fx.saturation = this.sat;
    if (this._bloom0 === undefined) { this._bloom0 = fx.bloom; this._thr0 = fx.threshold; }
    if (this.arena) { fx.bloom = this.bloom ?? 0.3; fx.threshold = 1.15; }
  }

  // a compact picture of the set right now (tests: a rewind must land on the same set as a fresh start)
  signature() {
    const r = (v) => Math.round(v * 10) / 10;
    const props = Object.values(this.props).filter((p) => p.obj.visible).map((p) => `${p.name}:${r(p.obj.position.x)},${r(p.obj.position.y)},${r(p.obj.position.z)}`).sort();
    const nodes = this.nodes ? Object.entries(this.nodes).filter(([, o]) => o.visible).map(([n, o]) => `${n}:${r(o.position.x)},${r(o.position.y)},${r(o.position.z)}`).sort() : [];
    const st = this.arena ? `${this.arena.states[this.arena._blend.a].name}>${this.arena.states[this.arena._blend.b].name}@${r(this.arena._blend.k)}` : 'lite';
    const b = this.bounds;
    return { props, nodes, state: st, floor: this.floorAt(this.f.t).cur[1], bounds: [b.minX, b.maxX, b.minZ, b.maxZ].map(r).join(',') };
  }

  dispose() {
    this.f.scene.remove(this.group);
    if (this.arena) this.arena.dispose();
    const fx = this.f.app.post.fx; fx.saturation = 1; fx.exposure = 1; if (this._bloom0 !== undefined) { fx.bloom = this._bloom0; fx.threshold = this._thr0; }
  }
}
