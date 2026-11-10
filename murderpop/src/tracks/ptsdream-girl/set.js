// The set: a soundstage (baked: tools/arena/arenas/ptsdream-girl.py) and your life's rooms flying in and out on
// cables on top of it, in real time. Everything you see here is a function of song time (so a rewind or ?at= puts
// it back exactly), plus a short log of what happened in play (the mirror you blew out, the things she broke)
// that a rewind trims back to the checkpoint.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Arena, LAYER } from '../../game/arena.js';
import { FEEL } from '../../game/player.js';
import * as P from './props.js';
import * as Q from './props2.js';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = (k) => k * k * (3 - 2 * k);
const C = (h) => new THREE.Color(h);
const WHITE = new THREE.Color(1, 1, 1);
const INF = 1e9;
const SCENE_DARK = 0.7;        // how far the stage's light comes down for her death scene (0: as it was, 1: the end's dark)

export async function buildSet(f, tr) { const s = new StageSet(f, tr); await s.build(); return s; }

// a piece of the set: lands at each slot's t0 dropping from the flies (or rising from the floor), leaves at t1
class Piece {
  constructor(set, obj, { name = '', col = null, H = 13, slots = [], rise = 0, solid = true, cable = 0 } = {}) {
    this.set = set; this.obj = obj; this.name = name; this.col = col; this.H = H; this.slots = slots; this.rise = rise; this.solid = solid;
    obj.visible = false; set.root.add(obj);
    this.active = null; this.y = 0;
    mergeStatic(obj);
    // only things big enough to matter throw shadows
    obj.traverse((o) => { if (o.isMesh) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const s = new THREE.Vector3(); o.getWorldScale(s); o.castShadow = o.castShadow && o.geometry.boundingSphere.radius * s.x > 0.3 && !(o.material && o.material.transparent); } });
    if (cable) for (const dx of [-cable, cable]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 16, 4), P.M('cable', { color: 0x111114, roughness: 0.6 })); c.position.set(dx, 8.5, 0); c.name = 'cable'; obj.add(c); (this.cables ||= []).push(c); }
  }
  pose(t) {
    for (const s of this.slots) {
      const dIn = s.rise || this.rise ? 0.9 : 0.42, dOut = s.sink || this.rise ? 0.7 : 0.45;
      const t0 = typeof s.t0 === 'function' ? s.t0() : s.t0, t1 = typeof s.t1 === 'function' ? s.t1() : (s.t1 ?? INF);
      if (t < t0 - dIn || t > t1 + dOut) continue;
      let y = 0;
      const riseH = this.rise || 3;
      if (t < t0) { const k = (t - (t0 - dIn)) / dIn; y = (s.rise || this.rise) ? -riseH * (1 - ease(k)) : this.H * (1 - k * k); }
      else if (t > t1) { const k = (t - t1) / dOut; y = (s.sink || this.rise) ? -riseH * k * k : this.H * (1 - Math.pow(1 - k, 3)); }
      else { const d = t - t0; if (!(s.rise || this.rise) && d < 0.16) y = 0.025 * Math.sin(Math.PI * d / 0.16); }
      return { s, y };
    }
    return null;
  }
  apply(t) {
    const p = this.pose(t);
    const o = this.obj;
    if (!p) { o.visible = false; this.active = null; return; }
    const s = p.s;
    o.visible = true;
    const x = typeof s.x === 'function' ? s.x(t) : s.x, z = typeof s.z === 'function' ? s.z(t) : s.z;
    o.position.set(x, p.y + (s.y || 0), z);
    o.rotation.y = typeof s.ry === 'function' ? s.ry(t) : (s.ry || 0);
    this.y = p.y; this.active = s;
    if (this.cables) for (const c of this.cables) c.visible = Math.abs(p.y) > 0.03;
  }
  get landed() { return this.active && Math.abs(this.y) < 0.35; }
}

class StageSet {
  constructor(f, tr) {
    this.f = f; this.tr = tr;
    this.root = new THREE.Group(); this.root.name = 'ptsd-set';
    this.pieces = []; this.byName = {};
    this.log = [];              // [t, kind, data]: what happened in play (trimmed on a rewind)
    this.blinks = []; this.bangs = []; this.tellsL = []; this.spots = []; this.stains = []; this.jobs = [];
    this.decalsL = [];
  }
  B(bar, beat = 1) { return this.f.bm.timeOfBar(bar, beat); }

  async build() {
    const f = this.f, B = (a, b) => this.B(a, b);
    // ---- the soundstage
    const arena = this.arena = await Arena.load('assets/arenas/ptsdream-girl/ptsdream-girl.json', f.app.renderer, f.scene, { camera: f.cam.cam });
    arena.prepareCamera(f.cam.cam);
    arena.setState('trigger');
    this.bounds = arena.bounds; this.room = arena.room;
    f.scene.add(this.root);
    this.floorMesh = arena.meshes.find((m) => /ptsd_floor/.test(m.name) || (m.material && /ptsd_floor/.test(m.material.name || '')));
    for (const m of arena.meshes) if (/ptsd_steel/.test(m.name) || (m.material && /ptsd_steel/.test(m.material.name || ''))) m.visible = false;
    this._floors();
    this._pieces();
    this._lights();
    this._decals();
    this.T = {
      storeIn: B(27, 1), stageIn: B(36, 1), stop: B(52, 1), bedLand: B(52, 4), officeIn: B(69, 1), exitE: B(76, 1), stage2: B(80, 1), head: B(96, 1), drain: B(111, 1),
      morning: B(112, 1), hush: B(122, 1), final: B(124, 1), table: B(143, 1), tableOut: B(145, 2), end: B(156, 1),
    };
    this._schedule();
    this._built = true;
  }

  // ---------------------------------------------------------------- floors: one painted canvas per room, swapped
  // under the baked light (the bake is the light falling on the stage; the paint is whatever floor is down)
  _floors() {
    const fm = this.floorMesh; if (!fm) { console.warn('ptsd: no floor mesh'); return; }
    const mat = fm.material;
    const flat = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1); flat.needsUpdate = true;
    this.floorBase = { map: mat.map, rough: mat.roughnessMap, metal: mat.metalnessMap, normal: mat.normalMap || flat, r: mat.roughness, m: mat.metalness };
    const paint = P.paintFloors();
    const T = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); t.flipY = false; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const orm = (r, m = 0, v = 0.05) => { const t = T(P.ormCanvas(r, m, v), false); return t; };
    const ripple = T(P.rippleNormal(), false); ripple.wrapS = ripple.wrapT = THREE.RepeatWrapping; ripple.repeat.set(6, 4);
    this.ripple = ripple;
    this.floorSets = {
      A: { map: T(paint.A), orm: orm(0.12), normal: flat, mirror: 0.8 },
      B: { map: T(paint.B), orm: orm(0.1), normal: flat, mirror: 1.0 },
      C: { map: this.floorBase.map, orm: this.floorBase.rough, metal: this.floorBase.metal, normal: this.floorBase.normal, mirror: 1.0 },
      D: { map: T(paint.D), orm: orm(0.92, 0, 0.1), normal: flat, mirror: 0.15 },
      E: { map: T(paint.E), orm: orm(0.42), normal: flat, mirror: 0.3 },
      F: { map: T(paint.F), orm: orm(0.03), normal: ripple, mirror: 1.0 },
    };
    if (!mat.normalMap) { mat.normalMap = flat; mat.needsUpdate = true; }
    if (!mat.roughnessMap) { mat.roughnessMap = this.floorSets.A.orm; mat.needsUpdate = true; }
    if (!mat.metalnessMap) { mat.metalnessMap = this.floorSets.A.orm; mat.needsUpdate = true; }
    this.curFloor = null;
    this.setFloor('A');
  }
  setFloor(k) {
    if (this.curFloor === k || !this.floorMesh) return;
    this.curFloor = k;
    const s = this.floorSets[k], m = this.floorMesh.material;
    m.map = s.map; m.roughnessMap = s.orm; m.metalnessMap = s.metal || s.orm; m.normalMap = s.normal;
    m.roughness = 1; m.metalness = 1;
    if (k === 'C') { m.roughness = this.floorBase.r; m.metalness = this.floorBase.m; }
    m.normalScale && m.normalScale.set(k === 'F' ? 0.6 : 1, k === 'F' ? 0.6 : 1);
    this.mirrorGain = s.mirror;
  }

  // ---------------------------------------------------------------- the pieces and when they're down
  _pieces() {
    const add = (name, obj, o) => { const p = new Piece(this, obj, { name, ...o }); this.pieces.push(p); this.byName[name] = p; return p; };
    this.add = add;
    // A: your place
    this.flatA = add('flatA', P.backFlatA(), { col: { type: 'box', w: 22.4, d: 0.2 }, cable: 8 });
    this.leftA = add('leftA', P.sideFlat(-1, '#f0e2d6', 3.2), { col: null, cable: 0 });
    this.rightA = add('rightA', P.sideFlat(1, '#f3efe8', 2.0, { glowName: 'bedroomGlow' }), { col: null });
    this.shower = add('shower', P.showerStall(), { col: { type: 'box', w: 2.2, d: 2.2 }, cable: 0.9 });
    this.bathDoor = add('bathDoor', P.doorFrame(), { col: { type: 'posts', pts: [[-0.66, 0], [0.66, 0]], r: 0.12 }, cable: 0.6 });
    this.kitchenDoor = add('kitchenDoor', P.doorFrame(), { col: { type: 'posts', pts: [[-0.66, 0], [0.66, 0]], r: 0.12 }, cable: 0.6 });
    this.islandP = add('island', P.island(), { col: { type: 'box', w: 3.2, d: 1.0 }, cable: 1.3 });
    this.fridgeP = add('fridge', P.fridge(), { col: { type: 'box', w: 0.85, d: 0.72 }, cable: 0.3 });
    this.coat = add('coat', P.coatStand(), { col: { type: 'circle', r: 0.25 } });
    this.jacket = add('jacket', P.coatStand(0x9fe8cc), { col: { type: 'circle', r: 0.25 } });
    this.boxes = [];
    for (let k = 0; k < 3; k++) { const b = add('box' + k, P.herBox(k), { col: { type: 'box', w: 0.6, d: 0.6 }, solid: k < 2 }); b.breakable = 2; this.boxes.push(b); }
    this.dishP = add('dish', P.dish(), { col: null });
    this.pinP = add('pin', P.pinModel(), { col: null });
    // A': the new girl's things
    this.things = {};
    for (const [n, mk, x, z] of [['plant', P.plant, 4.6, -1.0], ['candle', P.candle, -4.6, -1.0], ['mug', P.mugStool, 2.8, 4.6], ['flowers', P.flowers, -8.8, 1.6]]) {
      const p = add(n, mk(), { col: { type: 'circle', r: 0.3 } });
      this.things[n] = { name: n, piece: p, x, z, halo: null };
    }
    // B: the store
    this.flatB = add('flatB', Q.backFlatB(), { col: { type: 'box', w: 22.4, d: 0.2 }, cable: 8 });
    this.gondL = add('gondL', Q.gondola(), { col: { type: 'box', w: 1.0, d: 10.2 }, cable: 4 });
    this.gondR = add('gondR', Q.gondola(), { col: { type: 'box', w: 1.0, d: 10.2 }, cable: 4 });
    this.aisle = add('aisle', Q.aisleSign(), { col: null });
    this.checkoutP = add('checkout', Q.checkout(), { col: { type: 'box', w: 2.2, d: 0.8 }, cable: 0.9 });
    this.fluo = add('fluo', Q.fluoros(), { col: null });
    // the fluorescent banks hang between the camera and the aisle: only the vinyl's gloss shows them
    this.fluo.obj.traverse((o) => o.layers.set(LAYER.HIDDEN));
    // C: her stage
    this.exit = add('exit', Q.exitDoor(), { col: { type: 'posts', pts: [[-0.62, 0], [0.62, 0]], r: 0.14 }, cable: 0.6 });
    this.riserP = add('riser', Q.riser(), { col: null, rise: 0.3 });
    this.plinth = add('plinth', Q.plinthCushion(), { col: { type: 'circle', r: 0.36 }, rise: 1.2 });
    this.beacons = [[-10.2, -6.2], [10.2, -6.2], [-10.2, 6.0], [10.2, 6.0]].map(([x, z], i) => add('beacon' + i, Q.beacon(), { col: { type: 'circle', r: 0.22 } }));
    this.neon = add('neon', Q.dreamGirlNeon(), { col: null, cable: 4 });
    // D: the bedroom
    this.flatD = add('flatD', Q.backFlatD(), { col: { type: 'box', w: 22.4, d: 0.2 }, cable: 8 });
    this.leftD = add('leftD', P.sideFlat(-1, '#efe4cf', 1.5), { col: null });
    this.bedP = add('bed', Q.bed(), { col: { type: 'box', w: 2.4, d: 2.8 }, cable: 1.0 });
    this.nsL = add('nsL', Q.nightstand(true), { col: { type: 'box', w: 0.6, d: 0.5 } });
    this.nsR = add('nsR', Q.nightstand(false), { col: { type: 'box', w: 0.6, d: 0.5 } });
    this.lampPos = [[-9.5, -5.5], [-9.5, 0.5], [-6.0, 5.6], [6.0, 5.6], [9.5, 0.5], [9.5, -5.5]];
    this.lamps = this.lampPos.map((_, i) => add('lamp' + i, Q.floorLamp(), { col: { type: 'circle', r: 0.22 } }));
    this.flyBed = add('flyBed', Q.bed(), { col: { type: 'box', w: 2.4, d: 2.8 }, cable: 1.0 });
    // E: the office
    this.flatE = add('flatE', Q.backFlatE(), { col: { type: 'box', w: 22.4, d: 0.2 }, cable: 8 });
    this.chair = add('chair', Q.armchair(), { col: { type: 'box', w: 1.0, d: 0.9 }, cable: 0.5 });
    this.table1 = add('sideTable', Q.sideTable(), { col: { type: 'circle', r: 0.3 } });
    this.pad = add('pad', Q.legalPad(), { col: { type: 'box', w: 1.0, d: 0.5 }, cable: 0.5 });
    this.chaiseP = add('chaise', Q.chaise(), { col: { type: 'box', w: 1.9, d: 0.75 }, cable: 0.8 });
    // F: inside your head
    this.clock = add('clock', Q.giantClock(), { col: { type: 'circle', r: 1.0 }, rise: 3.2 });
    this.glassP = add('wineGlass', Q.wineGlass(), { col: { type: 'circle', r: 0.8 }, rise: 2.8 });
    this.camPos = [[-9.5, -4.5], [9.5, -4.5], [-9.5, 2.5], [9.5, 2.5], [-4.5, 6.3], [4.5, 6.3]];
    this.cams = this.camPos.map((_, i) => add('cam' + i, Q.cameraStalk(), { col: { type: 'circle', r: 0.2 }, rise: 3.4 }));
    this.horse = add('seahorse', Q.seahorse(), { col: { type: 'circle', r: 0.9 }, rise: 3.8 });
    // H: the dream
    this.tableP = add('table', Q.tableForTwo(), { col: { type: 'circle', r: 0.55 }, cable: 0.4 });
  }

  // every piece's slots: where it stands and when
  _schedule() {
    const T = this.T, B = (a, b) => this.B(a, b), out = (t) => t - 0.55;   // outgoing rooms leave just before the next lands
    const slot = (p, t0, t1, x, z, ry = 0, extra = {}) => { p.slots.push({ t0, t1, x, z, ry, ...extra }); };
    const A0 = -2, A1 = out(T.storeIn), A2 = T.morning, A3 = out(T.final);
    // the walls, doors and fridge of the morning go up on the final chorus's bang itself (they have nowhere else to be)
    for (const [p, x, z, ry] of [[this.flatA, 0, -7.08, 0], [this.leftA, -11.15, 0, 0], [this.rightA, 11.15, 0, 0], [this.bathDoor, -6.0, -2.5, 0], [this.kitchenDoor, 6.0, -2.5, 0], [this.fridgeP, 10.2, -6.4, 0]]) {
      slot(p, A0, A1, x, z, ry); slot(p, A2, T.final, x, z, ry);
    }
    slot(this.shower, A0, A1, -9.8, -5.9); slot(this.shower, A2, A3, -9.8, -5.9); slot(this.shower, T.final, INF, -9.8, -5.8);
    slot(this.islandP, A0, A1, 7.2, -4.1); slot(this.islandP, A2, A3, 7.2, -4.1); slot(this.islandP, T.final, INF, 8.8, -5.4, Math.PI / 2);
    slot(this.coat, A0, A1, -10.0, 5.6); slot(this.jacket, A2, A3, -10.0, 5.6);
    const bx = [[-7.6, 5.2, 0, 0.1], [-6.95, 5.25, 0, -0.2], [-7.3, 5.2, 0.6, 0.35]];
    this.boxes.forEach((b, k) => slot(b, A0, A1, bx[k][0], bx[k][1], bx[k][3], { y: bx[k][2] }));
    slot(this.dishP, A0, out(T.storeIn), 0, 0.5);
    for (const th of Object.values(this.things)) slot(th.piece, A2, () => (th.brokenAt ?? INF), th.x, th.z);
    // B: the store, 27:1 to the door blast. It flies up on the bang itself (she bangs through the EXIT while the
    // store is yanked up on its cables), not half a beat before it
    const B0 = T.storeIn, B1 = T.stageIn;
    slot(this.flatB, B0, B1, 0, -7.08);
    slot(this.gondL, B0, B1, (t) => -this.gondX(t), -0.5); slot(this.gondR, B0, B1, (t) => this.gondX(t), -0.5);
    slot(this.aisle, B0, B1, 0, -0.5); slot(this.checkoutP, B0, B1, 2.4, -6.0); slot(this.fluo, B0, B1, 0, 0);
    // C: her stage (every chorus), and G: everything
    // (the plinth stands between the EXIT door and the riser, on the line she walks out along on every chorus's
    // downbeat: it comes up out of the floor behind her once she's through, not in her way)
    for (const [c0, c1] of [[T.stageIn, out(T.stop) + 0.6], [T.stage2, out(T.head)], [T.final, INF]]) {
      slot(this.riserP, c0, c1, 0, -4.4); slot(this.plinth, c0 + 2.4, c1, 0, -5.8);
      this.beacons.forEach((b, i) => slot(b, c0, c1, [-10.2, 10.2, -10.2, 10.2][i], [-6.2, -6.2, 6.0, 6.0][i]));
      slot(this.neon, c0, c1, 0, -7.6);
    }
    // the EXIT door: in the store's back wall, then her stage; dropped into the office; dropped in at the hush
    slot(this.exit, B0, out(T.stop) + 0.6, 0, -6.92); slot(this.exit, T.exitE, out(T.head), 0, -6.92); slot(this.exit, T.hush, INF, 0, -6.92);
    // D: the bedroom comes down in the dark; the bed lands soft on 52:4
    const D0 = T.stop + 0.6, D1 = out(T.officeIn);
    slot(this.flatD, D0, D1, 0, -7.08); slot(this.leftD, D0, D1, -11.15, 0); slot(this.rightA, D0, D1, 11.15, 0);
    slot(this.bedP, T.bedLand, D1, 0, -3.8); slot(this.nsL, D0 + 0.3, D1, -1.9, -4.9); slot(this.nsR, D0 + 0.3, D1, 1.9, -4.9);
    this.lamps.forEach((l, i) => slot(l, D0 + 0.4 + i * 0.05, D1, this.lampPos[i][0], this.lampPos[i][1]));
    // the bed again in the final chorus (an island), and two lamps
    slot(this.bedP, T.final, INF, 9.2, 0.6, Math.PI / 2);
    slot(this.lamps[2], T.final, INF, -6.5, 6.2); slot(this.lamps[3], T.final, INF, 6.5, 6.2);
    // E: the office
    const E0 = T.officeIn, E1 = T.stage2;   // out on the bang, like the store
    slot(this.flatE, E0, E1, 0, -7.08); slot(this.chair, E0, E1, -5.5, -4.5, 0.6); slot(this.table1, E0, E1, -3.6, -4.8);
    slot(this.pad, E0, E1, -2.8, -5.6); slot(this.chaiseP, E0, E1, 5.0, -4.2, -0.3);
    slot(this.chair, T.final, INF, 8.4, 5.4, -2.2);
    // F: inside your head
    const F0 = T.head, F1 = T.drain;
    slot(this.clock, F0 + 0.5, F1, -7.5, -5.5, 0.3, { rise: true, sink: true }); slot(this.glassP, F0 + 0.7, F1, 7.5, -5.5, 0, { rise: true, sink: true });
    this.cams.forEach((c, i) => slot(c, B(103, 1), F1, this.camPos[i][0], this.camPos[i][1], 0, { rise: true, sink: true }));
    slot(this.horse, B(107, 1), F1, 0, -5.5, 0, { rise: true, sink: true });
    slot(this.horse, T.final, INF, -5.2, -6.4, 0.4);
    // H: the table for two
    slot(this.tableP, T.table, T.tableOut, 0, 0.8);
  }

  // the gondolas: start at x 3.6, lurch in on each beat of bar 28, slam home at x 2.0 on 29:1
  gondX(t) {
    const B = (a, b) => this.B(a, b);
    const steps = [[B(28, 1), 3.28], [B(28, 2), 2.96], [B(28, 3), 2.64], [B(28, 4), 2.32], [B(29, 1), 2.0]];
    let x = 3.6;
    for (const [tt, v] of steps) { if (t >= tt) { const k = clamp((t - tt) / 0.09, 0, 1); x = x + (v - x) * (1 - Math.pow(1 - k, 3)); } }
    return x;
  }

  // ---------------------------------------------------------------- lights for things (characters get the arena's key)
  _lights() {
    this.prac = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffffff, 0, 9, 1.6); l.castShadow = false; this.f.scene.add(l); return l; });
    this.spot = new THREE.SpotLight(0xffffff, 0, 16, 0.32, 0.6, 1.2); this.spot.position.set(0, 9, 2); this.f.scene.add(this.spot, this.spot.target);
    // the CODE RED / ALARM beacons from the ceiling: sweeping additive cones and their pools on the floor
    this.sweeps = [];
  }
  // decals: light pools, the neon grid, halos, the compass, lace
  _decals() {
    const poolTex = (() => { const c = P.canvas(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }); return new THREE.CanvasTexture(c); })();
    this.poolTex = poolTex;
    const pool = (r, color) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: poolTex, color: C(color), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.x = -Math.PI / 2; m.position.y = 0.015; m.renderOrder = 1; m.layers.set(LAYER.NO_REFLECT); this.root.add(m); return m; };
    this.pool = pool;
    this.lampPools = this.lampPos.map(([x, z]) => { const m = pool(2.5, 0xffd890); m.position.x = x; m.position.z = z; return m; });
    this.pools = { bottle: pool(1.6, 0xff2040), hall: pool(3.2, 0xffa860), moon: pool(3.0, 0x8aa0e0), vanity: pool(1.8, 0xffd6a0), cushion: pool(1.6, 0xffffff), work: pool(4, 0xffc070), sea: pool(6, 0x1a8ac8), candle: pool(1.4, 0xffb060), table: pool(1.6, 0xffb060), moonwater: pool(7.5, 0x5a6cb8) };
    // the neon grid of her stage: pink lines every 2 m
    const pos = [];
    const line = (x0, z0, x1, z1, w) => { const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz), nx = -dz / l * w, nz = dx / l * w; pos.push(x0 + nx, 0, z0 + nz, x1 + nx, 0, z1 + nz, x1 - nx, 0, z1 - nz, x0 + nx, 0, z0 + nz, x1 - nx, 0, z1 - nz, x0 - nx, 0, z0 - nz); };
    for (let x = -10; x <= 10; x += 2) line(x, -7, x, 7, 0.022);
    for (let z = -6; z <= 6; z += 2) line(-11, z, 11, z, 0.022);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.gridM = new THREE.MeshBasicMaterial({ color: C(0xff3a7a).multiplyScalar(2.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.grid = new THREE.Mesh(gg, this.gridM); this.grid.position.y = 0.012; this.grid.renderOrder = 1; this.root.add(this.grid);
    // the compass rose (bridge): gold, on the water
    const cc = P.canvas(1024, 1024, (g, w) => { g.translate(w / 2, w / 2); g.strokeStyle = 'rgba(255,200,90,1)'; g.lineWidth = 6; for (const r of [480, 440, 200]) { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); } for (let i = 0; i < 32; i++) { const a = i / 32 * TAU, L = i % 8 === 0 ? 470 : i % 4 === 0 ? 380 : 300; g.fillStyle = i % 2 ? 'rgba(255,200,90,0.55)' : 'rgba(255,220,140,0.95)'; g.beginPath(); g.moveTo(Math.cos(a) * L, Math.sin(a) * L); g.lineTo(Math.cos(a + 0.08) * 60, Math.sin(a + 0.08) * 60); g.lineTo(Math.cos(a - 0.08) * 60, Math.sin(a - 0.08) * 60); g.fill(); } });
    this.compassM = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cc), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: C(0xffffff).multiplyScalar(1.4) });
    this.compassD = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), this.compassM); this.compassD.rotation.x = -Math.PI / 2; this.compassD.position.y = 0.02; this.root.add(this.compassD);
    // healing halos round the new girl's things: a warm disc and a four-segment ring
    for (const th of Object.values(this.things)) {
      const h = pool(1.3, 0xffd8a0); h.position.set(th.x, 0.016, th.z);
      const segs = [];
      for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 24, 1, i * TAU / 4 + 0.06, TAU / 4 - 0.12), new THREE.MeshBasicMaterial({ color: C(0xffe0a0).multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); r.rotation.x = -Math.PI / 2; r.position.set(th.x, 0.02, th.z); this.root.add(r); segs.push(r); }
      th.halo = h; th.segs = segs;
    }
    // her red lace climbing the flats in the morning (verse 3)
    this.lace = [Q.laceSheet(22, 4.2), Q.laceSheet(14, 4.2), Q.laceSheet(14, 4.2)];
    this.lace[0].position.set(0, 0, -6.98); this.lace[1].position.set(-10.96, 0, 0); this.lace[1].rotation.y = Math.PI / 2; this.lace[2].position.set(10.96, 0, 0); this.lace[2].rotation.y = -Math.PI / 2;
    for (const l of this.lace) { l.visible = false; this.root.add(l); }
    // lyric signs written into the world: lipstick on the vanity mirror, the aisle sign, the legal pad
    this.signs = {
      lip1: this._written('THREE YEARS GONE,', { style: 'lip', h: 0.22, w: 1.25 }), lip2: this._written('BUT I STILL GOT THAT POWER', { style: 'lip', h: 0.16, w: 1.3, under: true }),
      aisle: this._written('PANIC ATTACK ON AISLE FOUR', { style: 'aisle', h: 0.16, w: 1.45 }),
      pad1: this._written('YOUR THERAPIST', { style: 'biro', h: 0.2, w: 1.0 }), pad2: this._written('KNOWS ME BY NAME', { style: 'biro', h: 0.2, w: 1.05, under2: true }),
    };
    this.flatA.obj.add(this.signs.lip1.m); this.signs.lip1.m.position.set(-6.4 - 0.62, 1.88, 0.115);
    this.flatA.obj.add(this.signs.lip2.m); this.signs.lip2.m.position.set(-6.4 - 0.65, 1.6, 0.115);
    const board = this.aisle.obj.userData.board; board.add(this.signs.aisle.m); this.signs.aisle.m.position.set(-0.72, -0.45, 0.04); this.signs.aisle.m.rotation.x = -0.25;
    const pad = this.pad.obj.userData.pad; pad.add(this.signs.pad1.m); pad.add(this.signs.pad2.m); this.signs.pad1.m.position.set(-0.5, 0.35, 0.025); this.signs.pad2.m.position.set(-0.52, 0.05, 0.025);
  }
  // a sign that writes itself left to right (lipstick, a sign's letters, biro)
  _written(text, { style, h, w, under = false, under2 = false }) {
    const S = { lip: { font: 'italic 800 110px Fraunces, Georgia, serif', fill: '#e0103a', glow: '#ff3050', k: 1.3 }, aisle: { font: '900 92px "Archivo Black", Arial Black, sans-serif', fill: '#ffffff', glow: '#9ad0ff', k: 2.2 }, biro: { font: 'italic 600 100px "Segoe Script", "Brush Script MT", cursive', fill: '#1a3aa8', glow: null, k: 1 } }[style];
    const c = P.canvas(1600, 200, (g, W, H) => { g.font = S.font; g.textBaseline = 'middle'; if (S.glow) { g.shadowColor = S.glow; g.shadowBlur = 16; } g.fillStyle = S.fill; g.fillText(text, 10, H / 2); const tw = g.measureText(text).width; if (under || under2) { g.strokeStyle = S.fill; g.lineWidth = 7; g.beginPath(); g.moveTo(under2 ? tw * 0.66 : tw * 0.62, H * 0.82); g.quadraticCurveTo(tw * 0.8, H * 0.92, tw + 8, H * 0.8); g.stroke(); if (under2) { g.beginPath(); g.moveTo(tw * 0.68, H * 0.92); g.lineTo(tw + 6, H * 0.9); g.stroke(); } } });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.ClampToEdgeWrapping;
    const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0.5, 0, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, color: C(0xffffff).multiplyScalar(S.k), opacity: 1 }));
    m.scale.set(w, h, 1); m.renderOrder = 4;
    return { m, t, w, set(k, a = 1) { k = clamp(k, 0, 1); m.visible = k > 0.001 && a > 0.001; t.repeat.x = k; m.scale.x = Math.max(1e-3, w * k); m.material.opacity = a; } };
  }

  // the aisle sign hangs between the eye and the fight: whenever it would hide you, her, or something landing, it ghosts
  _ghostAisle(t) {
    const au = this.aisle.obj.userData, f = this.f;
    const dtt = clamp(t - (au.lastT ?? t), 0, 0.1); au.lastT = t;
    let hide = 0;
    const cam = f.cam && f.cam.cam;
    if (this.aisle.active && cam) {
      const v = this._gv || (this._gv = new THREE.Vector3());
      au.board.updateWorldMatrix(true, false);
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const [cx, cy] of [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]]) { v.set(cx, cy, 0).applyMatrix4(au.board.matrixWorld).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      const behind = (wx, wy, wz, r) => { v.set(wx, wy, wz).project(cam); const px = v.x, py = v.y; v.set(wx + r, wy, wz).project(cam); const pr = Math.abs(v.x - px) + 0.03; return px > x0 - pr && px < x1 + pr && py > y0 - pr * 1.6 && py < y1 + pr * 1.6; };
      const pl = f.player, b = f.boss;
      if (pl && (behind(pl.x, 0.2, pl.z, 0.5) || behind(pl.x, 1.4, pl.z, 0.4))) hide = 1;
      else if (b && b.state !== 'gone' && (behind(b.x, 0.2, b.z, 0.6) || behind(b.x, 1.5, b.z, 0.5))) hide = 1;
      else for (const g of f.tele.list) { if (g.dead || t < g.start - 0.05 || t > g.end) continue; if (behind(g.x, 0, g.z, g.shape === 2 ? Math.max(g.w, g.h) : g.w)) { hide = 1; break; } }
    }
    au.fade = (au.fade ?? 0) + (hide - (au.fade ?? 0)) * Math.min(1, dtt * 12);
    const op = 1 - 0.8 * au.fade;
    // ghosted, it must not write depth: it draws before the telegraphs, and a see-through board that still writes
    // depth cuts them out (the door blast's cone lost its tip where she stands)
    for (const m of au.mats) { m.opacity = op; m.depthWrite = op > 0.99; }
    const sm = this.signs.aisle.m; if (sm.visible) sm.material.opacity *= op;
  }

  // ---------------------------------------------------------------- the per-frame set (a function of song time)
  update(dt, t, f) {
    // the finish: the fight stops the song clock at the last hit, but the end still plays out (the stage lights die,
    // the work light comes on, her last count's circle goes with the bottle), so after it the set keeps its own time
    if (f.state === 'finishing' && this.T) { this._postT = Math.max(this._postT ?? t, this.T.end) + dt; t = this._postT; }
    else this._postT = undefined;
    this._t = t;
    for (const p of this.pieces) p.apply(t);
    // the bed she drops on you, over the bedroom or the island's bed
    if (this.flyBed.active && this.bedP.active && this.T && t > this.T.final) this.bedP.obj.visible = false;
    this._room(t);
    this._look(t, dt);
    this._jobs(dt, t);
    // the arena: its own update (the key on YOU, the mirror, the casters)
    const arena = this.arena;
    arena.update(dt, f.cam.cam, f.player.root.position);
    arena.u.uMirrorGain.value *= (this.mirrorGain ?? 1);
    if (this.ripple && this.curFloor === 'F') { this.ripple.offset.x += dt * 0.02; this.ripple.offset.y += dt * 0.013; }
    // characters standing on the riser stand on it: YOU (on top of her own height: a jump is still a jump), and her
    // (her whole body lifted, whatever the song or a blow is doing with where she stands)
    const riserUp = this.riserP.landed;
    for (const who of [f.player, f.boss]) {
      const root = who && who.root; if (!root) continue;
      const on = riserUp && Math.hypot(who.x - 0, who.z + 4.4) < 2.15;
      root.userData.ptsdLift = (root.userData.ptsdLift || 0) + ((on ? 0.09 : 0) - (root.userData.ptsdLift || 0)) * Math.min(1, dt * 14);
      if (who === f.player) root.position.y = (who.y || 0) + root.userData.ptsdLift;
      else if (who.rig && who.rig.body) who.rig.body.y = root.userData.ptsdLift < 0.002 ? 0 : root.userData.ptsdLift;
    }
    f.tele.y = riserUp ? 0.11 : 0.02;
    this._plPrev = { x: f.player.x, z: f.player.z };
  }

  // which floor is down, the things that change with the song inside each room
  _room(t) {
    const T = this.T, B = (a, b) => this.B(a, b);
    // the floor under it all
    let fl = 'A';
    if (t >= T.storeIn - 0.05 && t < T.stageIn) fl = 'B'; else if (t >= T.stageIn && t < T.stop + 0.7) fl = 'C';
    else if (t >= T.stop + 0.7 && t < T.officeIn) fl = 'D'; else if (t >= T.officeIn && t < T.stage2) fl = 'E';
    else if (t >= T.stage2 && t < T.head + 1.6) fl = 'C'; else if (t >= T.head + 1.6 && t < T.drain + 1.6) fl = 'F';
    else if (t >= T.drain + 1.6 && t < T.final) fl = 'A'; else if (t >= T.final) fl = 'C';
    this.setFloor(fl);
    this._flood(t, T);
    // the neon grid on her stage
    const onC = (t >= T.stageIn && t < T.stop) || (t >= T.stage2 && t < T.head) || (t >= T.final && t < T.end + 1.4);
    const pulse = this.f.bm.pulse(t, 5);
    this.gridM.opacity = onC ? (0.55 + 0.35 * pulse) * (t >= T.end ? clamp(1 - (t - T.end) / 1.4, 0, 1) : 1) : 0;
    this.grid.visible = this.gridM.opacity > 0.01;
    // the gold mirror: dark glass; red when she's in it; gone when you blew it out
    const mir = this._mir || (this._mir = this.flatA.obj.getObjectByName('goldMirror'));
    if (mir) {
      const blown = this.loggedBefore('mirror', t);
      const u = mir.userData; u.glass.visible = !blown;
      const red = this.tellK('mirror', t) + (t > 3.76 && t < 14.6 ? 0.6 + 0.2 * Math.sin(t * 3) : 0) + this.tellK('face:mirror', t);
      u.glassM.emissive.setRGB(0.9 * red, 0.04 * red, 0.12 * red);
      this._herInGlass(mir, red > 0.05 ? red : 0, blown);
    }
    // the vanity: two toothbrushes in the morning
    const van = this._van || (this._van = this.flatA.obj.getObjectByName('vanity'));
    if (van) { van.userData.brush2.visible = t >= T.morning - 1; const r = this.tellK('face:vanity', t); van.userData.glassM.emissive.setRGB(0.9 * r, 0.05 * r, 0.12 * r); }
    this.fridgeP.obj.userData.note.visible = t >= T.morning - 1;
    // the shower stall: glows red when she's in it, cracks with each rattle, bursts
    const sh = this.shower.obj.userData;
    const inStall = this.tellK('stall', t) + ((t > B(18, 3) && t < B(20, 1)) ? 1 : 0) + this.tellK('face:stall', t);
    sh.frostM.emissive.setRGB(0.9 * Math.min(1, inStall), 0.04 * Math.min(1, inStall), 0.1 * Math.min(1, inStall));
    const crackK = this._crackK(t);
    sh.crackM.opacity = crackK;
    const burst = (t >= B(20, 1) && t < T.storeIn) || t >= B(126, 1);
    for (const p of sh.panes) p.visible = !burst;
    // the knife slot glows before she rises behind the island
    this.islandP.obj.userData.slotM.opacity = this.tellK('knife', t);
    // doors: gaps glow when she's about to come through
    const fr = this.leftA.obj.userData; fr.glow.material.opacity = this.tellK('front', t);
    fr.hinge.rotation.y = t > B(119, 1) - 0.05 && t < B(120, 3) ? -1.2 : 0;
    this.leftD.obj.userData.glow.material.opacity = 0;
    // the window: moonlight in your place; in the bedroom the blinds snap open on 55:1 and up at dawn
    const wA = this._winA || (this._winA = this.flatA.obj.getObjectByName('window')); if (wA) wA.userData.outM.color.setRGB(0.35, 0.42, 0.65).multiplyScalar(t >= T.morning ? 2.4 : 1);
    if (t >= T.morning && wA) wA.userData.outM.color.setRGB(1.6, 1.2, 1.0);
    const wD = this.flatD.obj.userData.win;
    if (wD) { const up = t >= B(65, 1) ? clamp((t - B(65, 1)) / 0.12, 0, 1) : 0; wD.userData.setBlinds(t >= B(55, 1), up); wD.userData.outM.color.setRGB(1, 1, 1).multiplyScalar(t >= B(65, 1) ? 1.8 : 0.9); }
    // the store: the aisle sign, the fluorescent banks (they blow bank by bank at the slam)
    const banks = this.fluo.obj.userData.banks;
    banks.forEach((b, i) => { const off = t >= B(33, 1) + i * 0.09; b.userData.tubeM.color.setRGB(1, 1.1, 1.05).multiplyScalar(off ? 0.02 : (t < T.storeIn + 0.25 ? (Math.sin(t * 90 + i) > 0 ? 0.9 : 0.1) : 0.9)); });
    // EXIT: the sign blinks with her count; the leaf bangs open on the chorus downbeat; its gap glows as a tell
    const ex = this.exit.obj.userData;
    let sign = 1;
    for (const tb of this.blinks) { const d = t - tb; if (d >= 0 && d < 0.3) sign = Math.max(sign, 2.6 - d * 5); }
    if (t > 57.6 && t < 57.72) sign = 0;
    if (this.tr.lightsOut) sign = 0;
    ex.signM.color.setRGB(sign * 2, sign * 2, sign * 2); ex.alarmM.color.setRGB(3 * sign, 0.3 * sign, 0.4 * sign);
    // the door bangs open on each chorus downbeat (the song's), and is shut again each time it drops in
    let open = 0;
    for (const [tb, shut] of [[T.stageIn, T.exitE - 0.6], [T.stage2, T.hush - 0.6], [T.final, INF]]) if (t >= tb && t < shut) open = clamp((t - tb) / 0.14, 0, 1);
    ex.hinge.rotation.y = -1.9 * (1 - Math.pow(1 - open, 3)) + (open > 0 && open < 1 ? Math.sin(open * 9) * 0.1 : 0);
    ex.gapM.opacity = this.tellK('exit', t);
    // the beacons turn; the riser's lamps
    const alarmOn = (t >= T.stageIn && t < T.stop) || (t >= T.stage2 && t < T.head) || (t >= T.final && t < T.end);
    if (!this.beaconPools) this.beaconPools = this.beacons.map(() => { const p = this.pool(2.2, 0xff1a2a); p.scale.set(1, 2.2, 1); return p; });
    this.beacons.forEach((b, i) => { const u = b.obj.userData, a = t * 3.2 + i * 1.3; u.spin.rotation.y = a; u.domeM.emissiveIntensity = alarmOn ? 1.6 + Math.sin(t * 20) * 0.4 : 0.2; const p = this.beaconPools[i]; p.visible = alarmOn && b.landed; p.material.opacity = 0.42; p.position.set(b.obj.position.x + Math.sin(a) * 3.2, 0.016, b.obj.position.z + Math.cos(a) * 3.2); p.rotation.z = -a; });
    // DREAM GIRL: burning pink in the choruses; a flicker through the gaps on "say my name"
    const nm = this.neon.obj.userData.m;
    // the end: her stage's lights die with the band, over 1.4 s (the neon, the riser's bulbs)
    const endK = t >= T.end ? clamp(1 - (t - T.end) / 1.4, 0, 1) : 1;
    nm.opacity = (this.neon.active ? 1 : 0) * endK;
    if (!this._bulbs) { this.riserP.obj.traverse((o) => { if (o.isInstancedMesh && !this._bulbs) this._bulbs = o; }); if (this._bulbs) this._bulbBase = this._bulbs.material.color.clone(); }
    if (this._bulbs) this._bulbs.material.color.copy(this._bulbBase).multiplyScalar(0.04 + 0.96 * endK);
    if (t > 128.46 && t < 128.74) { this.neon.obj.visible = true; this.neon.obj.position.set(0, 0, -7.6); nm.opacity = Math.sin(t * 60) > 0 ? 1 : 0.2; }
    // the bedroom: the alarm clock's green hands; lamps one per beat; L3 stutters; the phone glows
    const lampOn = (i) => { const tt = this._lampT ? this._lampT[i] : B(61, 1) + i * this.f.beat; return t >= tt && t < T.officeIn; };
    this.lamps.forEach((l, i) => {
      let on = lampOn(i) ? 1 : 0;
      if (i === 2 && t >= B(62, 2) && t < B(62, 3)) on = Math.sin(t * 70) > 0 ? 1 : 0.1;
      if (t >= T.final && (i === 2 || i === 3)) on = 0.8;
      l.obj.userData.shadeM.emissiveIntensity = on * 1.6; l.obj.userData.bulb.material.color.setRGB(on * 3, on * 2.4, on * 1.4);
      const pl = this.lampPools[i]; pl.material.opacity = on * 0.38 * (l.active ? 1 : 0); if (l.active) { pl.position.x = l.obj.position.x; pl.position.z = l.obj.position.z; }
    });
    const nsl = this.nsL.obj.userData, nsr = this.nsR.obj.userData;
    if (nsl.hands) for (const h of nsl.hands) h.material.color.setRGB(0.3, 2.4, 0.9);
    nsl.shadeM.emissiveIntensity = t >= B(54, 1) ? 0.8 : 0; nsr.shadeM.emissiveIntensity = t >= B(54, 1) ? 0.8 : 0;
    const phoneGlow = this.tellK('phone', t) + (t >= B(64, 1) && t < B(65, 1) ? 0 : 0);
    if (nsr.scrM) nsr.scrM.color.setRGB(0.4 + 2 * phoneGlow, 0.6 + 2 * phoneGlow, 1.0 + 2 * phoneGlow);
    if (nsr.phone) nsr.phone.visible = !(t >= B(64, 1) - 0.02 && t < T.officeIn);
    // the office: the lamp on the side table
    this.table1.obj.userData.shadeM.emissiveIntensity = (t >= B(68, 4) && t < B(77, 1)) ? 1.4 : 0;
    // the journal page turning: a curl of paper sweeping right to left on 74:1
    // (drawn as a job; see pageTurn)
    // inside your head: the glass tips four times and falls; the seahorse takes her initials
    const tilt = this.glassP.obj.userData.tilt;
    let tip = 0; for (let i = 0; i < 4; i++) if (t >= B(100, 1 + i)) tip = (i + 1) * 0.07;
    if (t >= B(101, 1)) tip = Math.min(1.45, 0.28 + (t - B(101, 1)) * 6);
    tilt.rotation.z = tip;
    this.horse.obj.userData.plateM.opacity = t >= B(109, 1) ? clamp((t - B(109, 1)) / 0.8, 0, 1) * 0.9 : 0;
    // the giant clock rings 3:47
    const ring = t >= B(98, 2) && t < B(98, 4);
    this.clock.obj.userData.body.rotation.z = ring ? Math.sin(t * 60) * 0.03 : 0;
    // cameras turn to follow you
    for (const c of this.cams) { const h = c.obj.userData.head; const pl = this.f.player; h.rotation.y = Math.atan2(pl.x - c.obj.position.x, pl.z - c.obj.position.z); }
    // the compass rose
    const cmp = this._compass;
    this.compassM.opacity = cmp && t >= cmp.t0 && t < cmp.t1 + 1.2 ? clamp((t - cmp.t0) / 0.5, 0, 1) * clamp((cmp.t1 + 1.2 - t) / 1.2, 0, 1) : 0;
    if (cmp) { this.compassD.position.set(cmp.x, 0.02, cmp.z); this.compassD.rotation.z = t * 0.1; }
    // lace climbing your walls in the morning
    const lk = t >= 188.0 && t < T.final + 0.5 ? clamp((t - 188.0) / 11.5, 0, 1) * 0.8 + (t >= B(119, 2) ? 0.2 : 0) : 0;
    // (each sheet rides its own wall up when the walls fly out)
    const laceOn = [this.flatA, this.leftA, this.rightA];
    this.lace.forEach((l, i) => { const w = laceOn[i]; l.visible = lk > 0.01 && w.active !== null; l.position.y = w.active ? w.obj.position.y : 0; l.scale.y = Math.max(0.001, lk); l.userData.t.repeat.y = (l.userData.h / 1.2) * lk; });
    // the new girl's things: halos while they stand (dim once they've healed you)
    for (const th of Object.values(this.things)) {
      const alive = th.piece.active && !(th.brokenAt !== undefined && th.brokenAt !== null && th.brokenAt <= t);
      const used = this.healedIn(th.name, t);
      th.halo.material.opacity = alive ? (used ? 0.12 : 0.45 + 0.1 * Math.sin(t * 3)) : 0;
      if (th.piece.active) { th.halo.position.set(th.piece.obj.position.x, 0.016, th.piece.obj.position.z); th.segs.forEach((s) => s.position.set(th.piece.obj.position.x, 0.02, th.piece.obj.position.z)); }
      th.segs.forEach((s, i) => { s.material.opacity = alive && th.prog > i ? 0.9 : 0; });
      if (th.name === 'candle') { const fl = th.piece.obj.userData.flame; if (fl) fl.visible = alive; }
    }
    // the written signs
    const W = (s, t0, t1, fade0 = INF, fade1 = INF, keep = 1) => { const k = clamp((t - t0) / (t1 - t0), 0, 1); const a = t < fade0 ? 1 : t < fade1 ? keep + (1 - keep) * (1 - (t - fade0) / (fade1 - fade0)) : keep; s.set(k, a); };
    W(this.signs.lip1, 33.26, 34.30, T.storeIn - 1, T.storeIn, 0.0); if (t >= T.morning - 1) this.signs.lip1.set(1, 0.35);
    W(this.signs.lip2, 34.76, 36.02, T.storeIn - 1, T.storeIn, 0.0); if (t >= T.morning - 1) this.signs.lip2.set(1, 0.35);
    W(this.signs.aisle, 46.80, 48.94); if (t >= 54.31) this.signs.aisle.set(1, 0);
    this._ghostAisle(t);
    W(this.signs.pad1, 115.12, 116.0); W(this.signs.pad2, 116.0, 117.04);
    // the bottle on its dish (until 'begin'), its pin (until the song's pop), the sealed ring round it
    const du = this.dishP.obj.userData; du.bottle.visible = t < B(7, 2.7) - 0.01;
    const pr = this._dishRing || (this._dishRing = du.bottle.getObjectByName('ring')); if (pr) pr.visible = t < B(4, 4.5);
    du.ringM.opacity = t < B(8, 1) ? 0.3 + 0.1 * Math.sin(t * 4) : 0;
    // the keepsake pin on the floor
    this._pinPose(t);
  }
  _flood(t, T) {
    if (!this.floodM) {
      this.floodM = new THREE.MeshPhysicalMaterial({ color: 0x050c18, roughness: 0.04, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.92, depthWrite: false });
      this.floodMesh = new THREE.Mesh(new THREE.RingGeometry(0.98, 1, 96, 1), this.floodM); this.floodMesh.rotation.x = -Math.PI / 2; this.floodMesh.position.y = 0.014; this.floodMesh.renderOrder = 1; this.root.add(this.floodMesh);
    }
    const bar = this.f.bm.periodAt(T.head) * 4, R = 15;
    let k = -1;
    if (t >= T.head && t < T.head + bar) k = (t - T.head) / bar;               // in from the edges
    else if (t >= T.drain && t < T.drain + bar) k = 1 - (t - T.drain) / bar;   // out to the edges
    this.floodMesh.visible = k >= 0;
    if (k >= 0) { const inner = Math.max(0.01, R * (1 - ease(k))); const g = this.floodMesh.geometry; if (Math.abs((g.parameters.innerRadius || 0) - inner) > 0.02) { g.dispose(); this.floodMesh.geometry = new THREE.RingGeometry(inner, R + 2, 96, 1); } }
  }
  _crackK(t) {
    const B = (a, b) => this.B(a, b);
    let k = 0;
    for (const bar of [19, 125]) for (let i = 0; i < 4; i++) if (t >= B(bar, 1 + i) && t < B(bar + 1, 1) + 0.05) k = Math.max(k, (i + 1) * 0.24);
    return k;
  }

  // ---------------------------------------------------------------- the light: arena state, tint, practicals
  _look(t, dt) {
    const f = this.f, T = this.T, B = (a, b) => this.B(a, b);
    if (!this._keys) {
      const K = []; const key = (tt, state, fade = 0.05, gain = [1, 1, 1], exp = 1) => K.push({ t: tt, state, fade, gain, exp });
      key(-9, 'trigger');
      key(10.02, 'trigger', 0.8, [1.16, 0.78, 0.8]);
      key(15.6, 'night', 0.5);
      key(T.storeIn, 'store', 0.05, [1, 1, 1], 0.42);
      key(49.33, 'store', 0.4, [1, 1, 1], 0.42);
      key(54.31, 'dark', 0.05, [1, 1, 1], 0.7);
      key(T.stageIn, 'alarm', 0.05, [1, 1, 1], 0.82);
      key(72.5, 'alarm', 0.6, [1.06, 0.88, 1.08], 0.82);
      key(79.12, 'alarm', 0.6, [1, 1, 1], 0.82);
      key(T.stop, 'dark', 0.05, [1, 1, 1], 0.6);
      key(87.81, 'october', 1.2, [1, 1, 1], 0.6);
      key(89.05, 'october', 0.3, [1, 1, 1], 1.4);
      key(100.63, 'october', 2.0, [1, 1, 1], 1.15);
      key(107.25, 'journal', 1.0, [0.84, 0.92, 1.18], 0.36);
      key(109.6, 'journal', 0.8, [1.16, 0.86, 0.9], 0.36);
      key(T.officeIn, 'office', 0.05);
      key(121.6, 'journal', 0.6, [1, 1, 1], 0.62);
      key(127.14, 'dark', 0.3, [1, 1, 1], 0.8);
      key(T.stage2, 'alarm', 0.05, [1, 1, 1], 0.82);
      key(145.32, 'alarm', 0.6, [1.06, 0.88, 1.08], 0.82);
      key(151.94, 'alarm', 0.6, [1, 1, 1], 0.82);
      key(T.head, 'head', 0.8, [1, 1, 1], 1.5);
      // WINE: a light grade only. The red is the wine on the water (its own tint, clearing over two bars); a heavy
      // grade turned every white shape pink here, and white means dodge
      key(164.6, 'head', 0.6, [1.1, 0.9, 0.94], 1.5);
      key(172.0, 'head', 0.6, [1, 1, 1], 1.5);
      key(176.6, 'head', 0.8, [0.78, 1.08, 1.25], 1.6);
      key(T.drain, 'morning', 1.6, [1, 1, 1], 0.55);
      key(T.morning, 'morning', 0.2);
      key(188.0, 'morning', 6.0, [1.18, 0.84, 0.9]);
      key(T.hush, 'dark', 0.3, [1, 1, 1], 0.8);
      key(T.final, 'alarm', 0.05, [1, 1, 1], 0.82);
      key(236.6, 'dream', 0.6);
      key(241.0, 'alarm', 0.5, [1, 1, 1], 0.82);
      key(T.end, 'dark', 1.4, [1, 0.92, 0.85], 0.9);
      this._keys = K;
    }
    const K = this._keys;
    let i = 0; while (i < K.length - 1 && K[i + 1].t <= t) i++;
    const cur = K[i], prev = K[Math.max(0, i - 1)];
    const k = cur.fade > 0 ? clamp((t - cur.t) / cur.fade, 0, 1) : 1;
    const kk = ease(k);
    // her death scene: the house lights come most of the way down on the two of you (her stage's neon and bulbs, the
    // follow spot and the bottle are the light), and stay down into the end's dark
    const sk = this.sceneK = (this.sceneK || 0) + ((this.tr.kill && this.tr.kill.on ? 1 : 0) - (this.sceneK || 0)) * Math.min(1, dt * 4);
    let stA = prev.state, stB = cur.state, stK = kk;
    if (sk > 0.002) { if (cur.state === 'dark' && t >= T.end) stK = Math.max(kk, SCENE_DARK * sk); else if (cur.state === 'alarm') { stA = 'alarm'; stB = 'dark'; stK = SCENE_DARK * sk; } }
    try { this.arena.setState(stA, stB, stK); } catch (e) { /* missing state */ }
    // the end: behind the dead stage the cyc goes pale dawn
    if (t >= T.end) {
      const kd = clamp((t - T.end - 0.6) / 2.4, 0, 1);
      const cyc = this._cycE || (this._cycE = (this.arena.emissive || []).find((e) => e.name === 'ptsd_cyc'));
      if (cyc && kd > 0) cyc.mat.emissive.lerp(this._dawn || (this._dawn = new THREE.Color(0.32, 0.29, 0.36)), kd);
    }
    const fx = f.app.post.fx;
    const gain = this._gain || (this._gain = new THREE.Color());
    gain.setRGB(prev.gain[0] + (cur.gain[0] - prev.gain[0]) * kk, prev.gain[1] + (cur.gain[1] - prev.gain[1]) * kk, prev.gain[2] + (cur.gain[2] - prev.gain[2]) * kk);
    let exp = prev.exp + (cur.exp - prev.exp) * kk;
    // PANIC: the tint pulses with each shelf lurch
    if (t >= 46.6 && t < 49.4) { const p = f.bm.pulse(t, 4); gain.setRGB(1 + 0.2 * p, 1 - 0.18 * p, 1 - 0.14 * p); }
    // SIREN: red and white on the beats (in her death scene it's a pulse in the light, not a wash over the picture)
    if (t >= 245.5 && t < T.end) { const ph = Math.floor(f.bm.beatAt(t)) % 2, p = f.bm.pulse(t, 6) * (1 - 0.6 * sk), w = 1 - 0.7 * sk; if (ph) gain.setRGB(1 + 0.3 * p, 1 - 0.2 * w, 1 - 0.2 * w); else gain.setRGB(1 + 0.15 * p, 1 + 0.15 * p, 1 + 0.15 * p); }
    // the song's silent instants: every light out
    if (this.tr.lightsOut || (t > 57.6 && t < 57.72)) exp *= 0.03;
    if (this.tr.blackout && t > 54.4 && t < 57.6) exp *= 0.75;
    fx.exposure = this.arena.exposure * exp;
    // bloom what's bright after the exposure, not before it (a white store lit hard and exposed down is not a glow)
    fx.threshold = Math.max(1, 1 / Math.max(0.05, fx.exposure));
    fx.gain.copy(gain);
    // the light that's in every room: practicals that light her and you (and the props)
    const L = this.prac, setL = (l, x, y, z, color, I, d = 9) => { l.position.set(x, y, z); l.color.set(color); l.intensity = I; l.distance = d; };
    for (const l of L) l.intensity = 0;
    const pools = this.pools; for (const p of Object.values(pools)) p.material.opacity = 0;
    const inA = t < T.storeIn || (t >= T.morning && t < T.final);
    if (t < 15.6) {
      const bottle = t < 14.57 ? 1 : 0;
      setL(L[0], 0, 0.4, 0.5, 0xff2040, 5 * bottle, 5); pools.bottle.position.set(0, 0.015, 0.5); pools.bottle.material.opacity = 0.45 * bottle;
      setL(L[1], -10.2, 2.2, 3.2, 0xffb070, 9, 10); pools.hall.position.set(-8.4, 0.015, 3.0); pools.hall.material.opacity = 0.32;
    } else if (inA) {
      const morning = t >= T.morning;
      setL(L[0], -6.4, 2.3, -6.2, 0xffd6a0, morning ? 3 : 6, 6); pools.vanity.position.set(-6.4, 0.015, -5.6); pools.vanity.material.opacity = morning ? 0.15 : 0.35;
      setL(L[1], 7.4, 1.9, -6.0, 0xffc68a, 4, 6);
      setL(L[2], -10.2, 2.2, 3.2, 0xffb070, morning ? 2 : 6, 9); pools.hall.position.set(-8.4, 0.015, 3.0); pools.hall.material.opacity = morning ? 0.08 : 0.25;
      if (!morning) { pools.moon.position.set(6.2, 0.015, -3.6); pools.moon.material.opacity = 0.3; setL(L[3], 7.6, 3.0, -5.0, 0x9ab0f0, 5, 9); }
      else if (this.things.candle.piece.active && !this.isBroken('candle', t)) { setL(L[3], -4.6, 0.8, -1.0, 0xffb060, 3, 4); pools.candle.position.set(-4.6, 0.015, -1.0); pools.candle.material.opacity = 0.4; }
      // CODE RED: four red cones sweep from the ceiling
    } else if (t >= T.storeIn && t < T.stageIn) {
      const on = t < B(33, 1) ? 1 : 0;
      for (let k2 = 0; k2 < 3; k2++) setL(L[k2], -3.4 + k2 * 3.4, 4.2, -0.5, 0xe8fff0, 3 * on, 10);
      if (t >= B(33, 1)) setL(L[3], 0, 2.6, -6.6, 0xff1a2a, 4, 8);
    } else if ((t >= T.stageIn && t < T.stop) || (t >= T.stage2 && t < T.head) || (t >= T.final && t < T.end)) {
      setL(L[0], 0, 3.0, -7.2, 0xff3a7a, 9, 12);
      setL(L[1], -9, 2.6, -5.5, 0xff1a3a, 5, 9); setL(L[2], 9, 2.6, -5.5, 0xff1a3a, 5, 9);
      const sp = this.spots.find((s) => t >= s.t0 && t < s.t1);
      if (sp) { pools.cushion.position.set(0, 0.015, -5.0); pools.cushion.material.opacity = 0.5; }
      if (t >= 236.36 && t < 240.5) { setL(L[3], 0, 1.1, 0.8, 0xffb060, 3, 4); pools.table.position.set(0, 0.015, 0.8); pools.table.material.opacity = 0.4; }
    } else if (t >= T.stop && t < T.officeIn) {
      setL(L[0], 6.0, 2.0, -6.2, 0xffa040, t >= 87.81 ? 6 : 0, 10);
      if (t >= B(54, 1)) {
        setL(L[1], -1.9, 1.1, -4.8, 0xffd090, 2.5, 4); setL(L[2], 1.9, 1.1, -4.8, 0xffd090, 2.5, 4);
        // the window lights the room from behind: a soft warm fill on the two of you from the street side, so
        // neither is a black cut-out on the carpet
        const b = f.boss, pl = f.player, seen = b && b.root.visible, mx = seen ? (pl.x + b.x) / 2 : pl.x, mz = seen ? (pl.z + b.z) / 2 : pl.z;
        setL(L[3], mx, 5.0, mz + 3.4, 0xffb27a, 3.5 * clamp((t - B(54, 1)) / 1.2, 0, 1), 15);
      }
    } else if (t >= T.officeIn && t < T.stage2) {
      setL(L[0], -3.6, 1.2, -4.6, 0xffc070, t < 127.14 ? 6 : 0, 7);
    } else if (t >= T.head && t < T.morning) {
      setL(L[0], 0, 2.4, -3.8, 0xffd0f0, t >= 176.6 ? 6 : 0, 8);
      if (t >= 176.6 && t < T.drain + 1) { pools.sea.position.set(0, 0.015, -2); pools.sea.material.opacity = 0.24; }
      // the low moon on the black water, and its cool light on the two of you (else she's a shadow on a void)
      const moonK = t < 176.6 ? clamp((t - T.head) / 1.6, 0, 1) : t >= T.drain ? 0.4 * clamp(1 - (t - T.drain) / 1.6, 0, 1) : 0.4;
      const b = f.boss, pl = f.player, mx = b ? (pl.x + b.x) / 2 : pl.x, mz = b ? (pl.z + b.z) / 2 : pl.z;
      // (from behind the camera: closer in, its reflection lay on the water in front of you as a big white glow)
      setL(L[1], mx, 7.0, mz + 7.5, 0x8c9ce8, 17 * moonK, 22);
      pools.moonwater.position.set(mx * 0.5, 0.015, -1.6 + mz * 0.3); pools.moonwater.material.opacity = 0.075 * moonK;
    }
    // CODE RED: four emergency beacons in the ceiling corners rake their red spots round the edge of the room. Deep
    // red, hard-edged and kept off the middle, so they read as light and never as a pink shape (the count is pink)
    const codeRed = t >= 10.02 && t < 14.57 ? clamp((t - 10.02) / 0.8, 0, 1) : t >= 14.57 && t < 14.9 ? 1 - (t - 14.57) / 0.33 : 0;
    if (!this.sweeps.length) {
      const spotTex = (() => { const c = P.canvas(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.62, 'rgba(255,255,255,0.88)'); gr.addColorStop(0.84, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }); return new THREE.CanvasTexture(c); })();
      for (let i = 0; i < 4; i++) { const p = this.pool(1.35, 0xff0814); p.material.map = spotTex; p.scale.set(2.0, 1, 1); this.sweeps.push(p); }
    }
    this.sweeps.forEach((s, i) => {
      const a = t * 1.15 + i * TAU / 4, rx = 7.6, rz = 4.7;
      s.material.opacity = codeRed * 0.28; s.visible = codeRed > 0.01;
      s.position.set(Math.sin(a) * rx, 0.016, 0.3 + Math.cos(a) * rz);
      s.rotation.z = Math.atan2(Math.sin(a) * rz, Math.cos(a) * rx);   // the long axis along the way it travels
    });
    // the follow spot on her in the alarm, or on the cushion at the crown search
    const alarm = (t >= T.stageIn && t < T.stop) || (t >= T.stage2 && t < T.head) || (t >= T.final && t < T.end);
    const b = f.boss;
    if (alarm && b && b.root.visible) {
      // (in her death scene it holds the two of you)
      const pl = f.player, sx = b.x + (pl.x - b.x) * 0.5 * sk, sz = b.z + (pl.z - b.z) * 0.5 * sk;
      this.spot.intensity = 60 + 50 * sk; this.spot.position.set(sx, 9, sz + 3); this.spot.target.position.set(sx, 0, sz); this.spot.color.setRGB(1, 0.95, 0.95);
    }
    else this.spot.intensity = 0;
    // the blackout: her lips and eyes, red, are all you see of her
    if (!this.faceGlow) { this.faceGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.poolTex, color: C(0xff1a30).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); this.faceGlow.scale.setScalar(0.5); this.root.add(this.faceGlow); }
    const dark = (t > 54.4 && t < 57.6) || (t >= T.stop && t < T.stop + 0.6);
    this.faceGlow.visible = !!(dark && b && b.root.visible);
    if (this.faceGlow.visible) { const hb = b.fig && b.fig.bones.Head; if (hb) hb.getWorldPosition(this.faceGlow.position); this.faceGlow.position.y += 0.05; this.faceGlow.material.opacity = 0.7 + 0.3 * Math.sin(t * 7); }
    // the end: a work light in the wings lays a warm beam to YOU
    // (a long low pool from the left wing to her feet, and a soft key from up in the wing: a beam, not a blaze)
    if (t >= T.end) {
      const k3 = clamp((t - T.end - 0.8) / 1.5, 0, 1), px = f.player.x, pz = f.player.z, x0 = -11.5, len = Math.max(2, px + 0.8 - x0);
      const wp = pools.work; wp.position.set((x0 + px + 0.8) / 2, 0.015, pz); wp.scale.set(len / 8, 0.42, 1); wp.rotation.z = 0; wp.material.opacity = 0.26 * k3;
      setL(L[3], -10.5, 3.6, pz, 0xffc070, 4.5 * k3, 18);
    } else if (pools.work.scale.x !== 1) pools.work.scale.set(1, 1, 1);
  }

  // ---------------------------------------------------------------- per-frame jobs (things in motion)
  job(j) { j.t = 0; this.jobs.push(j); return j; }
  _jobs(dt, t) {
    for (let i = this.jobs.length - 1; i >= 0; i--) { const j = this.jobs[i]; j.t += dt; if (j.update(dt, t) === false) { j.dispose && j.dispose(); this.jobs.splice(i, 1); } }
    // healing at the new girl's things (verse 3, and once more in the final chorus)
    this._heal(dt, t);
    // the lace ring's barrier
    if (this._lace) this._laceUpdate(t);
  }

  // ---------------------------------------------------------------- the log (what happened in play)
  note(kind, data) { this.log.push({ t: this._t ?? this.f.t, kind, data }); }
  loggedBefore(kind, t, data) { return this.log.some((e) => e.kind === kind && e.t <= t && (data === undefined || e.data === data)); }
  isBroken(name, t) { const th = this.things[name]; return !!th && th.brokenAt !== null && th.brokenAt !== undefined && th.brokenAt <= t; }
  healedIn(name, t) { const T = this.T; const win = t < T.final ? [T.morning - 2, T.final] : [T.final, INF]; return this.log.some((e) => e.kind === 'heal' && e.data === name && e.t >= win[0] && e.t < win[1] && e.t <= t); }
  tellK(name, t) { let k = 0; for (const e of this.tellsL) if (e.name === name && t >= e.t0 && t < e.t1 + 0.15) k = Math.max(k, t < e.t1 ? clamp((t - e.t0) / 0.12, 0, 1) * (0.8 + 0.2 * Math.sin(t * 30)) : 1 - (t - e.t1) / 0.15); return k; }

  // a rewind (or ?at=): the set as it is at song time t
  setStateAt(t) {
    this.log = this.log.filter((e) => e.t < t - 1e-3);
    this.blinks = []; this.tellsL = []; this.spots = [];
    for (const j of this.jobs) j.dispose && j.dispose();
    this.jobs.length = 0;
    for (const s of this.stains) { this.root.remove(s); s.geometry.dispose(); s.material.dispose(); }
    this.stains.length = 0;
    this._lace = null; this._compass = null;
    for (const th of Object.values(this.things)) { th.brokenAt = this.log.find((e) => e.kind === 'break' && e.data === th.name)?.t ?? null; th.prog = 0; th.acc = 0; }
    for (const b of this.boxes) { b.hp = this.log.filter((e) => e.kind === 'boxhit' && e.data === b.name).length; b.gone = b.hp >= 2; }
    this._pinT = null;
    this._applyBoxes();
    if (this.f.boss) this.update(0, t, this.f);
  }

  // ---------------------------------------------------------------- collision: the arena's, plus whatever is down
  _cols() {
    const out = [];
    for (const p of this.pieces) {
      if (!p.col || !p.landed || !p.solid || p.gone) continue;
      const o = p.obj, c = p.col;
      if (c.type === 'posts') { const ca = Math.cos(o.rotation.y), sa = Math.sin(o.rotation.y); for (const [lx, lz] of c.pts) out.push({ type: 'circle', x: o.position.x + lx * ca + lz * sa, z: o.position.z - lx * sa + lz * ca, r: c.r }); }
      else out.push({ ...c, x: o.position.x, z: o.position.z, ry: o.rotation.y, piece: p });
    }
    return out;
  }
  resolve(x, z, r) {
    const base = this.arena.resolve(x, z, r);
    x = base.x; z = base.z;
    for (const c of this._cols()) {
      if (c.type === 'circle') { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-5) { x = c.x + dx / d * m; z = c.z + dz / d * m; } }
      else {
        const a = -c.ry, ca = Math.cos(a), sa = Math.sin(a);
        let lx = (x - c.x) * ca - (z - c.z) * sa, lz = (x - c.x) * sa + (z - c.z) * ca;
        const hw = c.w / 2 + r, hd = c.d / 2 + r;
        if (Math.abs(lx) < hw && Math.abs(lz) < hd) { if (hw - Math.abs(lx) < hd - Math.abs(lz)) lx = Math.sign(lx || 1) * hw; else lz = Math.sign(lz || 1) * hd; x = c.x + lx * ca + lz * sa; z = c.z - lx * sa + lz * ca; }
      }
    }
    // the lace loop: a barrier only a dash crosses
    if (this._lace && Math.abs(r - FEEL.radius) < 1e-3) ({ x, z } = this._laceClamp(x, z));
    x = clamp(x, this.bounds.minX + r, this.bounds.maxX - r); z = clamp(z, this.bounds.minZ + r, this.bounds.maxZ - r);
    return { x, z };
  }
  // her shots stop at solid things
  blocks(x, z, r) {
    for (const c of this._cols()) {
      if (c.type === 'circle') { if (Math.hypot(x - c.x, z - c.z) < c.r + r) return true; }
      else { const a = -c.ry, ca = Math.cos(a), sa = Math.sin(a); const lx = (x - c.x) * ca - (z - c.z) * sa, lz = (x - c.x) * sa + (z - c.z) * ca; if (Math.abs(lx) < c.w / 2 + r && Math.abs(lz) < c.d / 2 + r && c.d < 5 && c.w < 5) return true; }
    }
    return false;
  }
  // a landing spot clear of solid things
  clearOf(x, z, m) {
    for (let it = 0; it < 6; it++) { const p = this.resolve(x, z, m); if (Math.hypot(p.x - x, p.z - z) < 1e-3) break; x = p.x; z = p.z; }
    return { x, z };
  }
  // is a body of radius m free to stand at (x, z)?
  free(x, z, m) { const p = this.resolve(x, z, m); return Math.abs(p.x - x) + Math.abs(p.z - z) < 0.02; }
  // the furthest open point on the straight line from (x0, z0) toward (x1, z1), for a body of radius m
  reach(x0, z0, x1, z1, m) {
    const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(d / 0.15)); let k0 = 0;
    for (let i = 1; i <= n; i++) { const k = i / n; if (!this.free(x0 + (x1 - x0) * k, z0 + (z1 - z0) * k, m)) break; k0 = k; }
    return { x: x0 + (x1 - x0) * k0, z: z0 + (z1 - z0) * k0 };
  }
  // everything uploaded and compiled before the needle drops: no hitch when a room first flies in
  warm(extra = [], fig = null) {
    const f = this.f, r = f.app.renderer;
    const texs = new Set();
    f.scene.traverse((o) => { if (!o.material) return; for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap']) if (m[k]) texs.add(m[k]); });
    for (const fl of Object.values(this.floorSets || {})) for (const t of [fl.map, fl.orm, fl.metal, fl.normal]) if (t) texs.add(t);
    // every lighting state's lightmap and keymap too, not on the first change of light
    for (const t of [...(this.arena.lightmaps || []), ...(this.arena.keymaps || [])]) if (t) texs.add(t);
    for (const t of texs) { try { r.initTexture(t); } catch (e) { /* fine */ } }
    const prev = this.pieces.map((p) => p.obj.visible);
    this.pieces.forEach((p) => { p.obj.visible = true; p.obj.traverse((o) => { o.visible = true; }); });
    const hid = []; this.root.traverse((o) => { if (!o.visible) { hid.push(o); o.visible = true; } });
    const held = this.tr.extra ? Object.values(this.tr.extra.held) : []; for (const o of held) o.visible = true;
    // the fight's own shaders that otherwise compile on first use, mid-move: the shockwave ring (the first stomp),
    // the ribbon trail (the first thrown ring), the spotlight cone
    const tmp = [];
    try { f.waves.push({ x: 0, z: -40, r: 0.5, speed: 0, band: 0.3, max: 9, kind: 'white', hit: true, damage: 0, _warm: true }); f._waves(0, f._ctx(0)); } catch (e) { /* fine */ }
    try { const trl = f.fx.trail(() => null); tmp.push(() => { f.fx.scene.remove(trl.mesh); trl.g.dispose(); const i = f.fx.trails.indexOf(trl); if (i >= 0) f.fx.trails.splice(i, 1); }); } catch (e) { /* fine */ }
    const fxv = [f.fx && f.fx.spotCone, f.fx && f.fx.spotPool].filter(Boolean).map((o) => [o, o.visible]); for (const [o] of fxv) o.visible = true;
    // her own break chunks, shatter shards, chips and glitter: her prepare compiled them for the screen, but the
    // picture is drawn into the post target and the floor's mirror, lit by this room (else: a freeze at the shatter)
    const fw = fig && fig.world, fwAdded = fw && !fw.parent; if (fwAdded) f.scene.add(fw);
    const fwVis = []; if (fw) fw.traverse((o) => { fwVis.push([o, o.visible]); o.visible = true; });
    // the journal's turning page
    const pageStand = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), this._pageMat()); pageStand.castShadow = true; this.root.add(pageStand);
    // the floor in each of its paints
    const cur = this.curFloor;
    for (const k of Object.keys(this.floorSets || {})) { this.curFloor = null; this.setFloor(k); r.compile(f.scene, f.cam.cam); }
    this.curFloor = null; this.setFloor(cur || 'A');
    r.compile(f.scene, f.cam.cam);
    // and as the floor's mirror and the picture's own target see it
    const prevRT = r.getRenderTarget();
    try { const mir = this.arena.mirror; if (mir) { r.setRenderTarget(mir.rt); r.compile(f.scene, mir.cam); } if (f.app.post && f.app.post.target) { r.setRenderTarget(f.app.post.target); r.compile(f.scene, f.cam.cam); } } catch (e) { console.warn('ptsd warm-up', e.message); }
    // draw everything once, unculled, the whole way a frame is drawn (casters, the floor's mirror, the picture and its
    // post passes): every piece's buffers and every pass's shader are on the card before the song starts
    try {
      const fc = []; f.scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine) { fc.push([o, o.frustumCulled]); o.frustumCulled = false; } });
      r.shadowMap.needsUpdate = true;
      try { this.arena.update(0, f.cam.cam, null); } catch (e) { /* fine */ }
      if (f.app.post && f.app.post.render) f.app.post.render(f.scene, f.cam.cam, 0); else r.render(f.scene, f.cam.cam);
      for (const [o, v] of fc) o.frustumCulled = v;
    } catch (e) { console.warn('ptsd warm-up draw', e.message); }
    r.setRenderTarget(prevRT);
    // the arena's env capture compiles its own variants on its second capture: do both now
    try { this.arena._captureEnv(); this.arena._captureEnv(); } catch (e) { /* fine */ }
    for (const o of held) o.visible = false;
    for (const o of hid) o.visible = false;
    this.pieces.forEach((p, i) => { p.obj.visible = prev[i]; });
    for (const o of extra) o.parent && o.parent.remove(o);
    for (const [o, v] of fxv) o.visible = v;
    for (const [o, v] of fwVis) o.visible = v;
    if (fwAdded) f.scene.remove(fw);
    this.root.remove(pageStand); pageStand.geometry.dispose();
    for (const undo of tmp) undo();
    for (let i = f.waves.length - 1; i >= 0; i--) if (f.waves[i]._warm) { f._dropWave(f.waves[i]); f.waves.splice(i, 1); }   // its material goes to the pool, compiled, for the first real ring
  }
  addCasters(...roots) { for (const r of roots) this.arena.addCaster(r); for (const p of this.pieces) if (p.obj && /bed|island|gond|shower|chair|chaise|clock|wineGlass|seahorse|table|fridge|plinth|checkout|box/.test(p.name)) this.arena.addCaster(p.obj); }
  // your strikes break her boxes and her hollow copies
  strikeArc(x, z, ang, range, arc, s) {
    for (const b of this.boxes) {
      if (!b.landed || b.gone) continue;
      const dx = b.obj.position.x - x, dz = b.obj.position.z - z, d = Math.hypot(dx, dz);
      if (d > range + 0.5) continue;
      const da = Math.atan2(Math.sin(Math.atan2(dx, dz) - ang), Math.cos(Math.atan2(dx, dz) - ang));
      if (Math.abs(da) > arc && d > 0.9) continue;
      this.note('boxhit', b.name); b.hp = (b.hp || 0) + 1;
      const f = this.f; f.fx.chips(b.obj.position.x, 0.5 + b.obj.position.y, b.obj.position.z, C(0xc49a68), 10, ang);
      f.sfx.hitProp && f.sfx.hitProp(f.pan(b.obj.position.x));
      if (b.hp >= 2) { b.gone = true; f.fx.chips(b.obj.position.x, 0.4, b.obj.position.z, C(0xd10a24).multiplyScalar(1.4), 24); f.fx.glitter(b.obj.position.x, 0.5, b.obj.position.z, C(0xff4060).multiplyScalar(2), 14, 0.8); f.sfx.breakProp && f.sfx.breakProp(f.pan(b.obj.position.x)); this._spill(b.obj.position.x, b.obj.position.z); }
      this._applyBoxes();
    }
    if (this._decoys) this._decoyStrike(x, z, ang, range, arc);
  }
  _applyBoxes() { for (const b of this.boxes) { if (b.obj) b.obj.traverse((o) => { if (o.isMesh) o.visible = !b.gone; }); } }
  // red lace, face-down photos and lipsticks spill out of a broken box
  _spill(x, z) {
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(i < 3 ? new THREE.PlaneGeometry(0.16, 0.2) : new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8), i < 3 ? P.M('photoBack', { color: 0xf4f0ea, roughness: 0.6, side: THREE.DoubleSide }) : P.M('lipstick', { color: 0xc0102a, roughness: 0.2, clearcoat: 1 }));
      if (i < 3) m.rotation.x = -Math.PI / 2; else m.rotation.z = Math.PI / 2;
      m.rotation.y = Math.random() * TAU; m.position.set(x + (Math.random() - 0.5) * 1.2, 0.01 + (i >= 3 ? 0.02 : 0), z + (Math.random() - 0.5) * 1.0);
      this.root.add(m); this.stains.push(m);
    }
    const lace = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), P.M('laceSpill', { color: 0xd10a24, roughness: 0.5, side: THREE.DoubleSide })); lace.rotation.x = -Math.PI / 2; lace.position.set(x, 0.012, z); lace.scale.set(1.4, 0.7, 1); this.root.add(lace); this.stains.push(lace);
  }

  // ---------------------------------------------------------------- tells and blinks (logged with times)
  tell(name, t0, t1) { this.tellsL.push({ name, t0, t1 }); if (name === 'lamp3') this.tr.snd.play('buzz', { x: -6 }); }
  exitBlink(t) { this.blinks.push(t); }
  doorBang(t) { if (!this.bangs.includes(t)) this.bangs.push(t); }
  cushionSpot(t0, t1) { this.spots.push({ t0, t1 }); }
  herInMirror() {}
  _herInGlass(mir, k, blown) {
    if (!this._glassFig) {
      const tex = (() => { const W = 128, H = 256, c = P.canvas(W, H, (g) => { g.translate(W / 2, 0); g.filter = 'blur(5px)'; g.fillStyle = 'rgba(255,40,70,0.95)'; g.beginPath(); g.ellipse(0, 40, 16, 19, 0, 0, TAU); g.moveTo(-18, 32); g.quadraticCurveTo(-32, 80, -24, 128); g.lineTo(24, 128); g.quadraticCurveTo(32, 80, 18, 32); g.moveTo(-24, 62); g.lineTo(24, 62); g.lineTo(18, 112); g.lineTo(-18, 112); g.moveTo(-16, 108); g.lineTo(16, 108); g.lineTo(50, 176); g.lineTo(-50, 176); g.moveTo(-14, 170); g.lineTo(-4, 170); g.lineTo(-7, 252); g.lineTo(-13, 252); g.moveTo(4, 170); g.lineTo(14, 170); g.lineTo(13, 252); g.lineTo(7, 252); g.fill(); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
      this._glassFig = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: C(0xffffff).multiplyScalar(1.6) }));
      this._glassFig.position.set(0, 1.25, 0.13); mir.add(this._glassFig);
    }
    this._glassFig.material.opacity = k; this._glassFig.visible = k > 0.02;
    if (blown) this._glassFig.material.opacity = k * 1.4;
  }

  // ---------------------------------------------------------------- the intro: the pin, the bottle, the mirror
  pinPop() {
    const f = this.f, pl = f.player;
    const tx = clamp(pl.x + 1.1, -10, 10), tz = clamp(pl.z - 0.6, -6, 6.5);
    this._pinT = { t0: f.t, x0: 0, z0: 0.5, x1: tx, z1: tz };
    this.note('pin', [tx, tz]);
  }
  _pinPose(t) {
    const o = this.pinP.obj;
    const e = this.log.find((x) => x.kind === 'pin' && x.t <= t) || null;
    const last = this.log.find((x) => x.kind === 'lastpin' && x.t <= t) || null;
    const src = last || e;
    if (!src || (e && !last && t > this.T.storeIn - 0.6)) { o.visible = false; return; }
    const [x1, z1] = src.data, k = clamp((t - src.t) / 0.75, 0, 1);
    const x0 = last ? this.f.boss.x : 0, z0 = last ? this.f.boss.z : 0.5;
    o.visible = true;
    o.position.set(x0 + (x1 - x0) * ease(k), Math.abs(Math.sin(k * Math.PI * 2.2)) * (1 - k) * 0.7 + 0.01, z0 + (z1 - z0) * ease(k));
    o.rotation.y = k * 9;
    o.scale.setScalar(1.6);
  }
  dishBottle() {}
  blowMirror(t) {
    this.note('mirror');
    const f = this.f;
    f.fx.glitter(0, 1.5, -6.8, C(0xffe0a0).multiplyScalar(2.5), 40, 1.2);
    f.fx.chips(0, 1.5, -6.8, C(0xcfd6e4).multiplyScalar(1.4), 30);
    this.tr.snd.play('smash', { x: 0 });
  }

  // ---------------------------------------------------------------- verse 1: the shower, the lipstick
  showerCount(ticks, burst, { apex }) {
    const f = this.f, pl = f.player, tr = this.tr;
    const ang = Math.atan2(pl.x - apex.x, pl.z - apex.z);
    // (cleared by the spotlight, or drawn under it: the glass holds, nothing flies)
    const tg = f.tele.add({ shape: 'cone', x: apex.x, z: apex.z, angle: ang, w: 9, param: 35 * Math.PI / 180, kind: 'white', start: f.t, end: burst });
    f.cue('white', apex);
    ticks.forEach((tk, i) => f.at(tk, () => { if (tg.dead) return; tr.snd.play('rattle', { x: apex.x }); tr.snd.play('crack', { x: apex.x, rate: 1 + i * 0.08 }); }));
    f.at(burst, () => {
      if (tr.wrecked || tg.dead) return;
      tr.snd.play('glassburst', { x: apex.x }); tr.snd.play('hiss', { x: apex.x });
      f.fx.glitter(apex.x, 1.3, apex.z, C(0xe8f4ff).multiplyScalar(2.2), 40, 1.0);
      for (let i = 0; i < 9; i++) { const a = ang + (i / 8 - 0.5) * 2 * 33 * Math.PI / 180 + (Math.random() - 0.5) * 0.04; f.proj.spawn({ x: apex.x + Math.sin(a) * 0.5, z: apex.z + Math.cos(a) * 0.5, y: 1.2, angle: a, speed: 13, kind: 'white', shape: 'shard', size: 0.42, life: 8.5 / 13, damage: 1 }); }
    });
  }
  lipstick() {}

  // ---------------------------------------------------------------- the store
  storeFootprints(t0, t1) {
    const f = this.f;
    for (const s of [-1, 1]) f.pat.area(f, { shape: 'rect', x: s * 3.6, z: -5.6, angle: 0, w: 0.55, h: 10.2, kind: 'white', start: t0, end: t1, damage: 1, onImpact: (hit) => { if (hit === 'hit') this._shoveOut(s * 3.6, 0.55); } });
    f.at(t1, () => { this.tr.snd.play('rack', { x: -4 }); this.tr.snd.play('rack', { x: 4 }); this.tr.snd.play('land', { x: 0 }); f.cam.shake(0.8, 0.2); });
  }
  _shoveOut(cx, hw) { const pl = this.f.player; const s = pl.x >= cx ? 1 : -1; pl.x = cx + s * (hw + FEEL.radius + 0.05); }
  aisleFour(ticks, slam) {
    const f = this.f, tr = this.tr;
    for (const s of [-1, 1]) f.pat.area(f, { shape: 'rect', x: s * 2.3, z: -5.6, angle: 0, w: 0.8, h: 10.2, kind: 'white', start: ticks[0], end: slam, damage: 1, onImpact: (hit) => { if (hit === 'hit') { const pl = f.player; pl.x = s * (1.5 - FEEL.radius - 0.05); } } });
    f.cue('white', { x: 0, z: 0 });
    ticks.forEach((tk) => f.at(tk, () => { tr.snd.play('rack', { x: -2.5, rate: 1.1 }); tr.snd.play('rack', { x: 2.5, rate: 1.05 }); f.cam.shake(0.35, 0.1); }));
    f.at(slam, () => { tr.snd.play('rack', { x: -2, rate: 0.85 }); tr.snd.play('rack', { x: 2, rate: 0.8 }); tr.snd.play('land', { x: 0 }); f.cam.shake(1.0, 0.22); f.cam.kick(1.4); });
  }
  barcode(t0, fires, { x0, x1, z0, z1 }) {
    const f = this.f, tr = this.tr, d = (z1 - z0) / 6;
    for (let k = 0; k < 6; k++) {
      const A = k % 2 === 0, za = z0 + k * d;
      const sh = { shape: 'rect', x: (x0 + x1) / 2, z: za, angle: 0, w: (x1 - x0) / 2, h: d };
      const [f1, f2] = A ? [fires[0], fires[2]] : [fires[1], fires[3]];
      f.pat.area(f, { ...sh, kind: 'white', start: t0, end: f1, damage: 1, sound: false, onImpact: () => tr.snd.play('zzt', { x: sh.x, rate: 1 + k * 0.03 }) });
      f.at(f1 + 0.01, () => { if (!tr.wrecked) f.pat.area(f, { ...sh, kind: 'white', start: f1 + 0.01, end: f2, damage: 1, sound: false, onImpact: () => tr.snd.play('zzt', { x: sh.x, rate: 1 + k * 0.03 }) }); });
    }
    // the printed bars themselves, black on the floor
    const bars = new THREE.Group();
    for (let i = 0; i < 40; i++) { const w = 0.03 + Math.random() * 0.12, x = x0 + (i + 0.5) * (x1 - x0) / 40; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, (z1 - z0) * 0.98), P.M('ink', { color: 0x050505, roughness: 0.4, transparent: true, opacity: 0.55, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.013, (z0 + z1) / 2); bars.add(m); }
    this.root.add(bars);
    const end = fires[3] + 0.6;
    this.job({ update: (dt, t) => { const k = clamp((t - t0) / 1.2, 0, 1); bars.children.forEach((m, i) => { m.visible = i / 40 < k; }); return t < end; }, dispose: () => { this.root.remove(bars); bars.traverse((o) => o.geometry && o.geometry.dispose()); } });
  }
  blowTubes(t) { const tr = this.tr; for (let i = 0; i < 3; i++) this.f.at(t + i * 0.09, () => tr.snd.play('tube', { x: -3.4 + i * 3.4 })); }

  // ---------------------------------------------------------------- her stage: the bed that drops on you
  dropBed(land, posFn, up) {
    const f = this.f;
    const pos = { x: 0, z: 0 };
    const p = this.flyBed;
    const s = { t0: land, t1: up, x: () => pos.x, z: () => pos.z, ry: 0, dyn: true };
    p.slots = [s];
    this.job({ update: (dt, t) => { if (t < land) { const q = posFn(); pos.x = q.x; pos.z = q.z; } return t < up + 0.6; }, dispose: () => { p.slots = []; } });
    f.at(up, () => this.tr.snd.play('fly', { x: pos.x }));
  }

  // ---------------------------------------------------------------- the bedroom
  petals(t, n) {
    const f = this.f;
    this.tr.snd.play('rustle', { x: 6 });
    if (t <= this.B(55, 1) + 0.01) this.tr.snd.play('thwack', { x: 6 });
    for (let i = 0; i < n; i++) {
      const src = { x: 6 + (i - 2) * 0.5, z: -6.6 };
      const a = Math.atan2(f.player.x - src.x, f.player.z - src.z) + (i - (n - 1) / 2) * 0.12;
      f.proj.spawn({ x: src.x, z: src.z, y: 1.8, angle: a, speed: 6.5, kind: 'pink', shape: 'petal', size: 0.42, wave: { amp: 0.7, freq: 1.1 }, delay: i * 0.06, life: 4.5 });
    }
  }
  // TILL YOU CRIED: the lace loop thrown over you (a barrier), tightening each beat, snapping shut
  laceRing(ticks, snap) {
    const f = this.f, tr = this.tr, pl = f.player;
    if (f.suppress) return;            // her spotlight: no loop is thrown
    const c = { x: pl.x, z: pl.z };
    const radii = [3.2, 2.6, 2.0, 1.4];
    const L = this._lace = { c, ticks, snap, radii, r: 3.2, inside: true, done: false };
    tr.snd.play('zip', { x: c.x });
    // where she holds the other end, 4 m off
    const b = f.boss; const a = Math.atan2(b.x - c.x, b.z - c.z) || 0;
    const hs = tr.her.floor(clamp(c.x + Math.sin(a) * 4.2, -10, 10), clamp(c.z + Math.cos(a) * 4.2, -6.5, 6.5));
    tr.her.place(hs.x, hs.z);
    b.behave = 'hold'; b.loop('Spell_Simple_Idle_Loop'); b.open(snap - f.t);
    const tg = f.tele.add({ shape: 'circle', x: c.x, z: c.z, w: 3.2, kind: 'white', start: f.t, end: snap });
    L.tg = tg;
    const ringM = new THREE.MeshPhysicalMaterial({ color: 0xd10a24, roughness: 0.4, emissive: C(0x500010), side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 6, 64), ringM); ring.rotation.x = Math.PI / 2; ring.position.set(c.x, 0.9, c.z); this.root.add(ring);
    // the lace's shadow on the floor: her deep red, not pink (pink is what you catch, and you can't catch this)
    const band = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 64), new THREE.MeshBasicMaterial({ color: C(0xa00616), transparent: true, opacity: 0.5, depthWrite: false })); band.rotation.x = -Math.PI / 2; band.position.set(c.x, 0.03, c.z); this.root.add(band);
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), ringM); this.root.add(rib);
    L.ring = ring; L.band = band; L.rib = rib;
    ticks.forEach((tk, i) => f.at(tk, () => { if (i > 0 && !L.done) tr.snd.play('ratchet', { x: c.x }); }));
    f.at(snap, () => {
      if (L.done) return;              // let go: the spotlight cleared it
      tr.snd.play('snap', { x: c.x });
      const d = Math.hypot(pl.x - c.x, pl.z - c.z);
      if (!tr.wrecked && !f.suppress && d < 1.4 + 0.2) {
        if (pl.invulnerable) { if (pl.state === 'dash') { pl.nearMiss(f._ctx(0)); f._good(70); } }
        else if (pl.hurt(f._ctx(0), 2, c.x, c.z, 'area')) f._hurt(c.x, c.z);
      }
      L.done = true;
    });
    this.job({ update: (dt, t) => !L.done || t < snap + 0.3, dispose: () => { this.root.remove(ring, band, rib); ring.geometry.dispose(); band.geometry.dispose(); rib.geometry.dispose(); if (this._lace === L) this._lace = null; } });
  }
  _laceUpdate(t) {
    const L = this._lace, f = this.f;
    // the spotlight cleared its shape (or it was thrown while the light was on her): the loop falls slack and goes
    if (!L.done && L.tg && L.tg.dead && t < L.snap) {
      L.done = L.slack = true;
      f.fx.glitter(L.c.x, 0.9, L.c.z, new THREE.Color(2.6, 0.3, 0.5), 24, 1.2);
      L.ring.visible = L.band.visible = L.rib.visible = false;
    }
    if (L.slack) return;
    let r = L.radii[0];
    for (let i = 0; i < 4; i++) if (t >= L.ticks[i]) { const k = clamp((t - L.ticks[i]) / 0.08, 0, 1); r = (i ? L.radii[i - 1] : L.radii[0]) + (L.radii[i] - (i ? L.radii[i - 1] : L.radii[0])) * k; }
    if (t >= L.snap) r = Math.max(0.05, 1.4 * (1 - (t - L.snap) / 0.1));
    L.r = r;
    if (L.tg) L.tg.w = r;
    L.ring.scale.setScalar(r); L.band.scale.setScalar(r);
    const b = f.boss, dx = L.c.x + 0 - b.x, dz = L.c.z - b.z, d = Math.hypot(dx, dz);
    L.rib.position.set((L.c.x + b.x) / 2 - dx / d * r / 2, 0.95, (L.c.z + b.z) / 2 - dz / d * r / 2);
    L.rib.scale.y = Math.max(0.1, d - r); L.rib.rotation.set(Math.PI / 2, 0, -Math.atan2(dx, dz)); L.rib.rotation.order = 'YXZ'; L.rib.rotation.set(Math.PI / 2, Math.atan2(dx, dz), 0);
    const pl = f.player; L.inside = Math.hypot(pl.x - L.c.x, pl.z - L.c.z) < r;
  }
  _laceClamp(x, z) {
    const L = this._lace, pl = this.f.player;
    if (!L || L.done || pl.state === 'dash') return { x, z };
    const prev = this._plPrev || { x, z };
    const was = Math.hypot(prev.x - L.c.x, prev.z - L.c.z), now = Math.hypot(x - L.c.x, z - L.c.z);
    const band = 0.25, r = L.r;
    if (was < r && now > r - band) { const k = (r - band) / Math.max(1e-4, now); return { x: L.c.x + (x - L.c.x) * k, z: L.c.z + (z - L.c.z) * k }; }
    if (was >= r && now < r + band) { const k = (r + band) / Math.max(1e-4, now); return { x: L.c.x + (x - L.c.x) * k, z: L.c.z + (z - L.c.z) * k }; }
    return { x, z };
  }
  lightsOn(ts) { this._lampT = ts; ts.forEach((tt, i) => this.f.at(tt, () => this.tr.snd.play('switch', { x: this.lampPos[i][0] }))); }
  // HER PHONE DINGS AT DAWN: four ticks, the ding; the blinds snap open; five stripes of dawn burn for a beat
  dawnStripes(ticks, burn, end) {
    const f = this.f, tr = this.tr;
    const a = -33 * Math.PI / 180, nx = Math.cos(a), nz = -Math.sin(a);
    const src = { x: 6, z: -7.4 };
    const lanes = [-5.6, -2.8, 0, 2.8, 5.6].map((o) => ({ x: src.x + nx * o, z: src.z + nz * o }));
    // only the stripes you can still see burn (the spotlight clears them)
    for (const s of lanes) s.tg = f.tele.add({ shape: 'rect', x: s.x, z: s.z, angle: a, w: 0.35, h: 18, kind: 'white', start: ticks[0], end: burn });
    const live = () => lanes.filter((s) => !s.tg.dead);
    f.cue('white', src);
    ticks.forEach((tk, i) => f.at(tk, () => { if (live().length) tr.snd.play(i === 3 ? 'ding' : 'notif', { x: 2 }); }));
    f.at(burn, () => {
      const on = live();
      if (tr.wrecked || !on.length) return;
      tr.snd.play('thwack', { x: 6 }); tr.snd.play('rush', { x: 6 });
      f.fx.flash(new THREE.Color(0.5, 0.55, 0.7), 0.8);
      for (const s of on) f.addBeam({ src: { x: s.x, z: s.z }, a0: a, a1: a, w: 0.35, h: 18, tOn: burn, tOff: end, kind: 'white', damage: 1, tele: null });
    });
  }
  officeFootprints(t0, t1) {
    const f = this.f;
    for (const [x, z, w, d] of [[-5.5, -4.5, 1.0, 0.9], [-3.6, -4.8, 0.6, 0.6], [-2.8, -5.6, 1.0, 0.5], [5.0, -4.2, 1.9, 0.75]]) f.pat.area(f, { shape: 'rect', x, z: z - d / 2, angle: 0, w: w / 2, h: d, kind: 'white', start: t0, end: t1, damage: 1, sound: false });
    f.at(t1, () => { this.tr.snd.play('land', { x: -4 }); this.tr.snd.play('land', { x: 5, rate: 0.9 }); });
  }
  legalPad() {}

  // ---------------------------------------------------------------- the office: the page turn, ink, the door
  pageTurn(ticks, turn) {
    const f = this.f, tr = this.tr;
    // (its shape cleared by the spotlight, or drawn under it: the page still turns, but it can't hurt)
    const tg = f.tele.add({ shape: 'rect', x: 10.5, z: -1.3, angle: -Math.PI / 2, w: 5.7, h: 21, kind: 'white', start: ticks[0], end: turn });
    f.cue('white', { x: 10.5, z: -1.3 });
    ticks.forEach((tk) => f.at(tk, () => { if (!tg.dead) tr.snd.play('flutter', { x: 9 }); }));
    const dur = f.bm.periodAt(turn);
    // the page: a tall curl of paper that sweeps right to left
    const pm = this._pageMat();
    const geo = new THREE.PlaneGeometry(1.6, 11.4, 8, 1); const pa = geo.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i); pa.setZ(i, -(x + 0.8) * (x + 0.8) * 0.7); } geo.computeVertexNormals();
    const page = new THREE.Mesh(geo, pm); page.rotation.x = -Math.PI / 2; page.castShadow = true; page.visible = false; this.root.add(page);
    let hit = false;
    this.job({ update: (dt, t) => {
      if (t < turn) return true;
      const k = clamp((t - turn) / dur, 0, 1), ex = 10.5 - 21 * k;
      page.visible = k < 1; page.position.set(ex, 0.6 + Math.sin(k * Math.PI) * 0.9, -1.3); page.rotation.y = Math.sin(k * Math.PI) * 0.6;
      const pl = f.player;
      if (!hit && !tr.wrecked && !tg.dead && !f.suppress && k < 1 && Math.abs(pl.x - ex) < 0.6 + FEEL.radius && pl.z < 4.4) {
        hit = true;
        if (pl.invulnerable) { if (pl.state === 'dash') { pl.nearMiss(f._ctx(0)); f._good(70); } }
        else if (pl.hurt(f._ctx(0), 1, ex + 1, pl.z, 'area')) f._hurt(ex, pl.z);
      }
      return k < 1 || t < turn + dur + 0.2;
    }, dispose: () => { this.root.remove(page); geo.dispose(); } });
    f.at(turn, () => { tr.snd.play('fwump', { x: 4 }); tr.snd.play('rush', { x: 0, rate: 0.8 }); f.cam.shake(0.4, 0.2); });
  }
  // one paper for every page turn (made, and its shader compiled, at load)
  _pageMat() {
    if (!this._pageM) {
      const pc = P.canvas(256, 512, (g, w, h) => { g.fillStyle = '#f2ead8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(110,150,200,0.5)'; g.lineWidth = 3; for (let y = 20; y < h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
      this._pageM = new THREE.MeshPhysicalMaterial({ map: new THREE.CanvasTexture(pc), roughness: 0.6, side: THREE.DoubleSide });
    }
    return this._pageM;
  }
  stain(x, z) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 20), P.M('stain', { color: 0x14206a, roughness: 0.3, transparent: true, opacity: 0.8, depthWrite: false }));
    const pa = m.geometry.attributes.position; for (let i = 1; i < pa.count; i++) { const k = 0.75 + Math.random() * 0.5; pa.setX(i, pa.getX(i) * k); pa.setY(i, pa.getY(i) * k); }
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.014, z); m.scale.setScalar(0.9); this.root.add(m); this.stains.push(m);
  }
  exitDrop(t0, t1) { const f = this.f; f.pat.area(f, { shape: 'rect', x: 0, z: -7.0, angle: 0, w: 0.75, h: 0.6, kind: 'white', start: t0, end: t1, damage: 1, sound: false }); f.at(t1, () => this.tr.snd.play('land', { x: 0 })); }
  dreamFlicker() {}

  // ---------------------------------------------------------------- the bridge
  clockRings(t) { this.tr.snd.play('bells', { x: -7.5 }); this.f.at(t + this.f.beat, () => this.tr.snd.play('bells', { x: -7.5 })); }
  wine(ticks, fall) {
    const f = this.f, tr = this.tr, src = { x: 7.5, z: -5.5 };
    ticks.forEach((tk) => f.at(tk, () => { tr.snd.play('clink', { x: src.x }); this._ripple(src.x, src.z, 0xffffff); }));
    f.at(fall, () => {
      tr.snd.play('slosh', { x: src.x }); tr.snd.play('glassburst', { x: src.x });
      // the wine runs out as one wave: a red front across the whole floor in 0.6 s
      // (under her spotlight the wine still spills, but no wave runs)
      const w = { x: src.x, z: src.z, r: 0.5, speed: 37, band: 0.8, max: 24, hit: false, off: f.suppress };
      const mat = new THREE.MeshBasicMaterial({ color: C(0xff1030).multiplyScalar(2.2), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 96), mat); m.rotation.x = -Math.PI / 2; m.position.set(src.x, 0.05, src.z); this.root.add(m);
      const tint = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: C(0x8a1030), transparent: true, opacity: 0.45, depthWrite: false })); tint.rotation.x = -Math.PI / 2; tint.position.set(src.x, 0.02, src.z); this.root.add(tint);
      const t0 = f.t, clear = f.bm.periodAt(f.t) * 8;
      this.job({ update: (dt, t) => {
        w.r = 0.5 + (t - t0) * w.speed;
        if (f.suppress) w.off = true;
        m.scale.setScalar(Math.min(w.r, w.max)); mat.opacity = w.r < w.max && !w.off ? 0.9 : 0;
        tint.scale.setScalar(Math.min(w.r, w.max)); tint.material.opacity = 0.45 * clamp(1 - (t - t0 - 0.6) / clear, 0, 1);
        const pl = f.player, d = Math.hypot(pl.x - w.x, pl.z - w.z);
        if (!w.hit && !w.off && !tr.wrecked && w.r < w.max && Math.abs(d - (w.r - w.band / 2)) < w.band / 2 + FEEL.radius * 0.6) {
          if (pl.invulnerable) { if (pl.state === 'dash' && !w.nm) { w.nm = true; pl.nearMiss(f._ctx(0)); f._good(60); } }
          else { w.hit = true; if (pl.hurt(f._ctx(0), 1, w.x, w.z, 'wave')) f._hurt(w.x, w.z); }
        }
        return t < t0 + 0.7 + clear;
      }, dispose: () => { this.root.remove(m, tint); m.geometry.dispose(); mat.dispose(); tint.geometry.dispose(); tint.material.dispose(); } });
    });
  }
  _ripple(x, z, color) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: C(color).multiplyScalar(1.5), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); this.root.add(m);
    const j = this.job({ update: () => { m.scale.setScalar(1 + j.t * 5); m.material.opacity = 0.6 * (1 - j.t / 0.8); return j.t < 0.8; }, dispose: () => { this.root.remove(m); m.geometry.dispose(); m.material.dispose(); } });
  }
  flood(x, z) { const f = this.f; f.fx.flash(new THREE.Color(0.25, 0.27, 0.32), 0.3); const p = this.pool(2, 0xe0e8ff); p.position.set(x, 0.016, z); p.material.opacity = 0.8; this.job({ update: (dt) => { p.material.opacity = Math.max(0, p.material.opacity - dt * 2); return p.material.opacity > 0.01; }, dispose: () => { this.root.remove(p); p.geometry.dispose(); p.material.dispose(); } }); }
  camerasRise(t) { this.tr.snd.play('servo', { x: -9 }); this.tr.snd.play('servo', { x: 9 }); this.tr.snd.play('lift', { x: 0 }); }
  cameraShots(ticks, fire) {
    const f = this.f, tr = this.tr;
    const lock = ticks[3];
    this.camPos.forEach(([x, z]) => {
      let ang = Math.atan2(f.player.x - x, f.player.z - z);
      f.pat.area(f, { shape: 'rect', x, z, angle: ang, w: 0.5, h: 26, kind: 'white', start: f.t, end: fire, damage: 1, sound: false,
        follow: () => { if (f.t < lock) ang = Math.atan2(f.player.x - x, f.player.z - z); return { x, z, angle: ang }; } });
    });
    f.cue('white', { x: 0, z: 0 });
    ticks.forEach((tk) => f.at(tk, () => tr.snd.play('shutter', { x: 0 })));
    f.at(fire, () => { tr.snd.play('zzt', { x: -6 }); tr.snd.play('zzt', { x: 6 }); f.fx.flash(new THREE.Color(0.4, 0.4, 0.45), 0.7); });
  }
  // EVERY WOMAN'S LAUGH: three hollow copies of her and her, on the diagonals; the fourth to laugh is her
  decoys(split, laughs, lunge) {
    const f = this.f, tr = this.tr, b = f.boss, pl = f.player;
    // (each on open floor: neither she nor a copy stands in the clock, the glass or a camera's stalk)
    const spots = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([dx, dz]) => tr.her.floor(clamp(pl.x + dx * 3.2, -10, 10), clamp(pl.z + dz * 3.2, -6.4, 6.4)));
    const realIdx = Math.floor(Math.random() * 4);
    const order = [0, 1, 2, 3].filter((i) => i !== realIdx); order.sort(() => Math.random() - 0.5); order.push(realIdx);
    const copies = [];
    let mk = null;
    try { mk = makeCopy(b); } catch (e) { console.warn('ptsd decoys', e.message); }
    spots.forEach((s, i) => {
      if (i === realIdx) return;
      const c = mk ? mk() : null; if (!c) return;
      c.root.position.set(s.x, 0, s.z); c.root.rotation.y = Math.atan2(pl.x - s.x, pl.z - s.z);
      f.scene.add(c.root); copies.push({ ...c, i, x: s.x, z: s.z, alive: true });
    });
    f.at(split, () => { tr.her.tear(b.x, b.z); tr.her.place(spots[realIdx].x, spots[realIdx].z); tr.her.hide(false); b.behave = 'hold'; for (const s of spots) tr.her.tear(s.x, s.z, 0.12); tr.snd.play('appear', { x: 0 }); });
    this._decoys = { copies, realIdx, lunge, called: false };
    laughs.forEach((tk, k) => f.at(tk, () => { const i = order[k]; const s = spots[i]; tr.snd.play('giggle', { x: s.x, rate: i === realIdx ? 0.84 : 1 }); f.fx.sparks(s.x, 1.9, s.z, new THREE.Color(3.5, 0.6, 1.4), 8); const c = copies.find((q) => q.i === i); if (c) c.flash = 1; else if (i === realIdx && b.fig) b.fig.setExpression('delight', { fade: 0.08 }); }));
    // the lunge: a white lane toward you from the real one, filling 106:4 to 107:1; hit her first and it's off
    f.at(laughs[3], () => { if (tr.wrecked || this._decoys.called) return; const ang = Math.atan2(pl.x - b.x, pl.z - b.z); const sh = { shape: 'rect', x: b.x, z: b.z, angle: ang, w: 0.8, h: 6 }; this._decoys.lane = f.pat.area(f, { ...sh, kind: 'white', start: f.t, end: lunge, damage: 1, melee: true }); tr.her.act('Sword_Dash', lunge, { contact: 0.6, dur: 0.5 }); this._decoys.ang = ang; });
    // the lunge goes down the lane you were shown, as far as the first thing standing in it
    f.at(lunge, () => { const D = this._decoys; if (!D) return; if (!D.called && !tr.wrecked) { const e = this.reach(b.x, b.z, clamp(b.x + Math.sin(D.ang) * 5.5, -10, 10), clamp(b.z + Math.cos(D.ang) * 5.5, -6.5, 6.5), b.radius * 0.8 + 0.04); b.moveTo(e.x, e.z, 0.15, { easing: 'in', through: true }); } });
    const hpAt = b.hp;
    this.job({ update: (dt, t) => {
      const D = this._decoys; if (!D) return false;
      for (const c of D.copies) { if (!c.alive) continue; c.mixer.update(dt); c.flash = (c.flash || 0) * Math.exp(-dt * 6); }
      if (!D.called && b.hp < hpAt - 1 && t < lunge) { D.called = true; tr.snd.play('crack', { x: b.x }); if (D.lane) D.lane.dead = true; }
      if (t > lunge + 0.6) { for (const c of D.copies) if (c.alive) { c.alive = false; f.fx.glitter(c.x, 1.2, c.z, new THREE.Color(3, 0.6, 1.5), 30, 0.9); f.scene.remove(c.root); } return false; }
      return true;
    }, dispose: () => { const D = this._decoys; if (D) for (const c of D.copies) f.scene.remove(c.root); this._decoys = null; } });
  }
  _decoyStrike(x, z, ang, range, arc) {
    const D = this._decoys, f = this.f;
    for (const c of D.copies) {
      if (!c.alive) continue;
      const dx = c.x - x, dz = c.z - z, d = Math.hypot(dx, dz);
      if (d > range + 0.6) continue;
      const da = Math.atan2(Math.sin(Math.atan2(dx, dz) - ang), Math.cos(Math.atan2(dx, dz) - ang));
      if (Math.abs(da) > arc && d > 0.9) continue;
      c.alive = false; f.scene.remove(c.root);
      f.fx.glitter(c.x, 1.3, c.z, new THREE.Color(3.4, 0.7, 1.6), 50, 1.1); f.fx.chips(c.x, 1.3, c.z, new THREE.Color(2, 1.9, 1.8), 14);
      this.tr.snd.play('glassburst', { x: c.x });
      f._good(80);
    }
  }
  seahorseRise() { this.tr.snd.play('lift', { x: 0, rate: 0.7 }); }
  // P T S D on the water: strokes 0.8 m wide, each letter 3.6 m tall (z -2.3 .. +1.3)
  initials(appear, carve) {
    const f = this.f, tr = this.tr;
    const zt = -2.3, zb = 1.3, hw = 0.4;
    const letters = {
      P: (cx) => [{ shape: 'rect', x: cx - 0.7, z: zb, angle: Math.PI, w: hw, h: 3.6 }, { shape: 'arc', x: cx - 0.7, z: zt + 1.0, angle: Math.PI / 2, w: 1.35, h: 0.8, param: Math.PI / 2 }],
      T: (cx) => [{ shape: 'rect', x: cx - 1.4, z: zt + hw, angle: Math.PI / 2, w: hw, h: 2.8 }, { shape: 'rect', x: cx, z: zb, angle: Math.PI, w: hw, h: 3.2 }],
      S: (cx) => [{ shape: 'arc', x: cx, z: zt + 0.9, angle: -3 * Math.PI / 4, w: 1.15, h: 0.75, param: 1.95 }, { shape: 'arc', x: cx, z: zb - 0.9, angle: Math.PI / 4, w: 1.15, h: 0.75, param: 1.95 }],
      D: (cx) => [{ shape: 'rect', x: cx - 1.0, z: zb, angle: Math.PI, w: hw, h: 3.6 }, { shape: 'arc', x: cx - 1.0, z: (zt + zb) / 2, angle: Math.PI / 2, w: 1.8, h: 0.8, param: Math.PI / 2 }],
    };
    const xs = [-7.5, -2.5, 2.5, 7.5];
    ['P', 'T', 'S', 'D'].forEach((L, i) => f.at(appear[i], () => {
      if (tr.wrecked) return;
      tr.snd.play('scrape', { x: xs[i], rate: 1 + i * 0.06 });
      for (const sh of letters[L](xs[i])) f.pat.area(f, { ...sh, kind: 'white', start: f.t, end: carve[i], damage: 1, sound: false, onImpact: () => {} });
      f.at(carve[i], () => { tr.snd.play('zzt', { x: xs[i] }); f.fx.glitter(xs[i], 0.3, -0.5, new THREE.Color(3.4, 1.4, 2.4), 18, 1.2); for (const sh of letters[L](xs[i])) this._glowStroke(sh); });
    }));
  }
  // a carved stroke glows on the water (harmless) until 109:1, when its light runs into the seahorse
  _glowStroke(sh) {
    let geo;
    if (sh.shape === 'rect') { geo = new THREE.PlaneGeometry(sh.w * 2, sh.h); geo.translate(0, sh.h / 2, 0); }
    else geo = new THREE.RingGeometry(sh.w - sh.h, sh.w, 32, 1, Math.PI / 2 - sh.param, sh.param * 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: C(0xff7ab0).multiplyScalar(1.6), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    // in the holder's frame +y of the shape runs along the shape's angle (0 = +z), lying flat
    m.rotation.x = Math.PI / 2;
    const holder = new THREE.Group(); holder.position.set(sh.x, 0.018, sh.z); holder.rotation.y = sh.angle; holder.add(m); this.root.add(holder);
    const t109 = this.B(109, 1);
    this.job({ update: (dt, t) => { m.material.opacity = t < t109 ? 0.45 : Math.max(0, 0.45 - (t - t109) * 0.6); return m.material.opacity > 0.01 && t < this.T.drain; }, dispose: () => { this.root.remove(holder); geo.dispose(); m.material.dispose(); } });
  }
  compass(t0, t1) { const b = this.f.boss; this._compass = { t0, t1, x: b.x, z: b.z }; this.tr.snd.play('chime', { x: b.x, rate: 0.8 }); }

  // ---------------------------------------------------------------- verse 3: the new girl's things
  thingAt(name) { const th = this.things[name]; return th ? { x: th.x, z: th.z } : null; }
  breakThing(name) {
    const th = this.things[name]; if (!th || th.brokenAt !== null) return;
    const f = this.f; th.brokenAt = f.t; this.note('break', name);
    const snd = { plant: 'potcrash', candle: 'snuff', mug: 'potcrash', flowers: 'glassburst' }[name];
    this.tr.snd.play(snd, { x: th.x });
    f.fx.chips(th.x, 0.5, th.z, { plant: C(0xc06a44), candle: C(0xf3ead8), mug: C(0xf2c53a), flowers: C(0xe8f0f4) }[name].multiplyScalar(1.4), 30);
    f.fx.glitter(th.x, 0.6, th.z, new THREE.Color(3, 0.3, 0.6), 30, 1.2);
  }
  frontDoorOpen(t) { this.tr.snd.play('latch', { x: -10.5 }); }
  laceSurge(t) { this.tr.snd.play('zip', { x: 0, rate: 0.7 }); }
  laceCracks(ticks) {
    const f = this.f, tr = this.tr;
    ticks.forEach((tk, i) => f.at(tk, () => {
      const b = f.boss, a = i * Math.PI / 2 + Math.PI / 4;
      tr.snd.play('crack', { x: b.x, rate: 0.7 + i * 0.05 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1), P.M('laceCrack', { color: 0xd10a24, emissive: C(0x600010), roughness: 0.4, transparent: true, opacity: 0.9, depthWrite: false }));
      const holder = new THREE.Group(); holder.position.set(b.x, 0.017, b.z); holder.rotation.y = a; m.rotation.x = Math.PI / 2; m.geometry.translate(0, 0.5, 0); holder.add(m); this.root.add(holder);
      const j = this.job({ update: () => { m.scale.y = Math.min(9, 0.3 + j.t * 22); return this.f.t < this.T.final; }, dispose: () => { this.root.remove(holder); m.geometry.dispose(); } });
    }));
  }
  _heal(dt, t) {
    const T = this.T, f = this.f, pl = f.player;
    const inWin = (t >= T.morning && t < T.final) || (t >= T.final && t < T.end);
    for (const th of Object.values(this.things)) {
      const alive = th.piece.active && !this.isBroken(th.name, t);
      if (!inWin || !alive || this.healedIn(th.name, t)) { th.prog = 0; th.acc = 0; continue; }
      const p = th.piece.obj.position;
      if (Math.hypot(pl.x - p.x, pl.z - p.z) < 1.3) {
        th.acc += dt;
        const seg = Math.floor(th.acc / Math.max(0.2, f.beat));
        if (seg > th.prog) { th.prog = seg; this.tr.snd.play('heal', { x: p.x, rate: 1 + seg * 0.06 }); }
        if (th.prog >= 4) { pl.heal(1); this.note('heal', th.name); f.sfx.heartBack && f.sfx.heartBack(); f.fx.glitter(pl.x, 1.4, pl.z, new THREE.Color(3, 2.4, 1.2), 20, 0.8); th.prog = 0; th.acc = 0; }
      } else { th.prog = 0; th.acc = 0; }
    }
  }
  faceIn(name, t) { this.tell('face:' + name, t, t + this.f.beat * 0.9); }

  // ---------------------------------------------------------------- the outro
  table(t0, t1, out) { const f = this.f; f.pat.area(f, { shape: 'circle', x: 0, z: 0.8, w: 1.3, kind: 'white', start: t0, end: t1, damage: 1, sound: false }); f.at(t1, () => this.tr.snd.play('land', { x: 0 })); f.at(out, () => this.tr.snd.play('fly', { x: 0 })); }
  flares(t) {
    const f = this.f;
    this.job({ update: (dt, tt) => { if (Math.random() < dt * 30) { const b = this.beacons[(Math.random() * 4) | 0]; if (b.landed) f.fx.sparks(b.obj.position.x, 2.6, b.obj.position.z, new THREE.Color(3.5, 0.4, 0.3), 3); } return tt < t + 6; } });
    this.tr.snd.play('hiss', { x: 0 });
  }
  lastPin(t) {
    const f = this.f, pl = f.player;
    this.note('lastpin', [clamp(pl.x + 0.5, -10.5, 10.5), clamp(pl.z + 0.4, -6.5, 6.5)]);
    this._lastCount = { t0: t };
  }
  lastTick(t, i) {
    const f = this.f, b = f.boss;
    f.fx.flash(new THREE.Color(0.3, 0.08, 0.16), 0.6);
    if (!this._lastRing) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(2.8, 64), new THREE.MeshBasicMaterial({ color: C(0xff3a8a).multiplyScalar(1.3), transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.03; this.root.add(m); this._lastRing = m;
      this.job({ update: (dt, tt) => { m.position.x = b.x; m.position.z = b.z; const k = clamp((tt - this.B(152, 1)) / (this.B(156, 1) - this.B(152, 1)), 0, 1); m.material.opacity = 0.15 + 0.35 * k + 0.2 * f.bm.pulse(tt, 3); m.scale.setScalar(0.15 + 0.85 * k); return tt < this.T.end; }, dispose: () => { this.root.remove(m); m.geometry.dispose(); m.material.dispose(); this._lastRing = null; } });
    }
  }
  wrecked() {}
  finish(t) {
    // the bottle at her heart goes off: pink and gold, a perfume cloud (her death scene has done it, and the pin, itself)
    if (this.tr.kill && this.tr.kill.on) return;
    const f = this.f, b = f.boss;
    this.tr.her.cloud(b.x, b.z, 3.2, new THREE.Color(1.0, 0.4, 0.55), 1.6);
    f.fx.glitter(b.x, 1.6, b.z, new THREE.Color(3.4, 2.1, 0.6), 60, 2.2);
    if (!this.log.some((e) => e.kind === 'lastpin')) this.note('lastpin', [clamp(f.player.x + 0.5, -10.5, 10.5), clamp(f.player.z + 0.4, -6.5, 6.5)]);
  }
  spotlight() {}
  onSection() {}

  dispose() {
    for (const j of this.jobs) j.dispose && j.dispose();
    this.f.scene.remove(this.root);
    for (const l of this.prac) this.f.scene.remove(l);
    this.f.scene.remove(this.spot, this.spot.target);
    this.f.app.post.fx.gain.setRGB(1, 1, 1); this.f.app.post.fx.threshold = 1;
    this.f.tele.y = 0.02;
    const hb = this.f.hud && this.f.hud.el && this.f.hud.el.boss; if (hb) { hb.style.opacity = ''; hb.style.transition = ''; }
    this.arena.dispose();
  }
}

// merge a piece's static meshes by material (fewer draw calls); anything the set animates (named in userData, or
// named itself) stays as it is
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const keep = new Set();
  const mark = (o) => o.traverse((c) => keep.add(c));
  root.traverse((o) => { if (o !== root && (o.name || (o.userData && Object.keys(o.userData).length))) mark(o); for (const v of Object.values(o.userData || {})) { if (v && v.isObject3D) mark(v); if (Array.isArray(v)) for (const w of v) if (w && w.isObject3D) mark(w); } });
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  root.traverse((o) => { if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || keep.has(o) || Array.isArray(o.material)) return; if (!groups.has(o.material)) groups.set(o.material, []); groups.get(o.material).push(o); });
  for (const [mat, list] of groups) {
    if (list.length < 2) continue;
    const geos = [];
    let ok = true;
    for (const m of list) { let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (!g.attributes.normal) g.computeVertexNormals(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)); geos.push(g); }
    let merged = null;
    try { merged = mergeGeometries(geos, false); } catch (e) { ok = false; }
    if (!ok || !merged) continue;
    const cast = list.some((m) => m.castShadow);
    for (const m of list) m.parent.remove(m);
    const mm = new THREE.Mesh(merged, mat); mm.castShadow = cast; mm.receiveShadow = true; root.add(mm);
  }
}

// a hollow copy of her: the same porcelain (sharing her geometry and glaze), its own skeleton and animation
function makeCopy(boss) {
  const fig = boss.fig; if (!fig) return null;
  return () => {
    const src = fig.model;
    const clone = cloneSkinned(src);
    const root = new THREE.Group(); root.add(clone);
    const mixer = new THREE.AnimationMixer(clone);
    const clip = fig.rig.kit.clips.Idle_Talking_Loop || fig.rig.kit.clips.Idle_Loop;
    if (clip) mixer.clipAction(clip).play();
    return { root, mixer };
  };
}
function cloneSkinned(source) {
  const map = new Map(), cl = source.clone(true);
  const srcBones = [], clBones = [];
  const walk = (a, b) => { map.set(a, b); for (let i = 0; i < a.children.length; i++) walk(a.children[i], b.children[i]); };
  walk(source, cl);
  cl.traverse((o) => { if (o.isSkinnedMesh) { const s = o.skeleton; const bones = s.bones.map((bn) => map.get(bn) || bn); o.bind(new THREE.Skeleton(bones, s.boneInverses), o.bindMatrix); } });
  void srcBones; void clBones;
  return cl;
}
