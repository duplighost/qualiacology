// THE FACULTY OF REVERSE PSYCHOLOGY: a soundstage dressed as a university at night that travels through six sets.
// The baked stage (tools/arena/arenas/reverse-psychology-degree.py) never leaves; the sets fly in and out on top of it,
// built in pieces.js. Everything the set does is a function of song time (lightAt, and each piece's own curve), so a
// rewind or a start in the middle puts it right; only what YOU breaks is remembered (per checkpoint).
import * as THREE from 'three';
import { Arena } from '../../game/arena.js';
import { FEEL } from '../../game/player.js';
import { Shafts, Motes } from '../../fx/atmos.js';
import { NEG, negifyTree } from './neg.js';
import * as PC from './pieces.js';
import { Screen } from './paint.js';

const ARENA = 'assets/arenas/reverse-psychology-degree/reverse-psychology-degree.json';
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const lerp = THREE.MathUtils.lerp;
const kIn = (t, t0, d) => clamp01((t - t0) / d);
const eIn = (k) => k * k * k, eOut = (k) => 1 - (1 - k) ** 3, eIO = (k) => k * k * (3 - 2 * k);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

// the light through the song: [t, stateA, stateB, k, setDim, keyMul, envMul, ramp (s)]
const LIGHT = [
  [0, 'lecture', 'lecture', 0, 0.1, 0.25, 0.25],
  [2.15, 'lecture', 'lecture', 0, 1.0, 1.0, 1.0, 1.1],
  [21.27, 'lecture', 'lecture', 0, 0.12, 0.25, 0.3, 0.25],
  [23.39, 'lecture', 'lecture', 0, 1.15, 1.15, 1.1, 0.06],
  [40.41, 'lecture', 'night', 0.35, 0.42, 0.45, 0.6, 2.1],
  [48.88, 'night', 'night', 0, 1.0, 1.0, 1.0, 0.5],
  [85.0, 'night', 'night', 0, 0.75, 0.8, 0.9, 0.5],
  [93.48, 'night', 'night', 0, 0.05, 0.15, 0.2, 0.12],
  [99.86, 'lawn', 'lawn', 0, 1.0, 1.0, 1.0, 0.08],
  [114.70, 'lawn', 'night', 0.9, 0.5, 0.6, 0.6, 0.5],
  [125.33, 'lawn', 'lawn', 0, 1.12, 1.15, 1.1, 0.4],
  [133.85, 'night', 'night', 0, 0.75, 0.9, 0.8, 0.6],
  [144.46, 'lawn', 'lawn', 0, 1.3, 1.25, 1.2, 0.3],
  [166.24, 'exam', 'exam', 0, 0.55, 0.75, 0.7, 1.05],
  [179.99, 'exam', 'night', 0.5, 0.28, 0.4, 0.45, 0.55],
  [191.19, 'dawn', 'dawn', 0, 1.0, 1.0, 1.0, 0.25],
  [197.56, 'dawn', 'dawn', 0, 0.85, 0.9, 0.9, 2.0],
];
export function lightAt(t) {
  let i = 0; while (i < LIGHT.length - 1 && LIGHT[i + 1][0] <= t) i++;
  const cur = LIGHT[i], prev = LIGHT[Math.max(0, i - 1)];
  const k = i === 0 ? 1 : smooth(cur[0], cur[0] + (cur[7] ?? 0.4), t);
  return { cur, prev, k };
}
// the sky the floor reflects: [t, top, horizon, stars, moon]
const SKY = [[0, 0x0a0606, 0x140c0a, 0, 0], [48.88, 0x060a22, 0x1a2350, 1, 1], [93.48, 0x020203, 0x050508, 0.2, 0], [99.86, 0x110c26, 0x3a2448, 0.5, 0.6],
  [114.70, 0x050c2a, 0x14234e, 0.7, 0.4], [125.33, 0x1a1028, 0x4a2a3a, 0.4, 0.4], [133.85, 0x060a22, 0x1a2350, 1, 1], [144.46, 0x140e2a, 0x40284a, 0.5, 0.6],
  [166.24, 0x020203, 0x060608, 0, 0], [179.99, 0x05081a, 0x101838, 0.8, 0.8], [191.19, 0x2c2456, 0x8a4658, 0, 0]];

const CHAIRS = [[-3.6, 1.2], [3.6, 1.2], [-5.4, 1.2], [5.4, 1.2], [-3.6, 3.8], [3.6, 3.8], [-5.4, 3.8], [5.4, 3.8]];
const BOXES = [[-7.6, -3.0], [7.6, -3.0], [-7.6, 3.4], [7.6, 3.4]];
const SLABS = [[-7.0, -1.8], [-3.8, 2.4], [0, -2.6], [3.8, 2.4], [7.0, -1.8]];
const RIBBONS = [[-3.6, 110.48], [-1.2, 111.01], [1.2, 111.54], [3.6, 112.07]];
const ROW_FALL = [176.85, 177.38, 177.91, 178.43];

export class Campus {
  constructor(f, R) { this.f = f; this.R = R; this.cols = []; this.snaps = new Map(); this.fxList = []; this._gradOn = this._chairsOn = this._ribOn = this._slabsOn = true; }

  async load() {
    const f = this.f;
    const arena = this.arena = await Arena.load(ARENA, f.app.renderer, f.scene, { camera: f.cam.cam });
    arena.prepareCamera(f.cam.cam);
    arena.setState('lecture');
    negifyTree(arena.group, { holes: true, dim: true });
    const G = this.group = new THREE.Group(); G.name = 'rpd-set'; f.scene.add(G);
    const K = this.K = PC.materials();
    // ---- the sky the floor reflects
    this.sky = PC.sky(); G.add(this.sky.mesh);
    // ---- S1 the lecture theatre: the screen, the projector's beam, the shadow lecture
    this.screen = new Screen(); this.screen.draw(0);
    this.th = PC.theatre(K, this.screen); G.add(this.th.group);
    this.shafts = new Shafts(f.scene);
    this.beam = this.shafts.add({ x: 0, y: 1.0, z: 8.4, dir: new THREE.Vector3(0, 0.9, -16.3), len: 16.35, box: true, w0: 0.3, d0: 0.22, w1: 9.6, d1: 3.3, color: new THREE.Color(0.86, 0.9, 1.0), k: 0.3, soft: 2.2 });
    this.motes = new Motes(f.scene, { n: 260, box: [-5, 0.4, -7.5, 5, 3.6, 8], color: new THREE.Color(1.6, 1.7, 1.9), size: 0.025, k: 0 });
    this.dotWall = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.3, 0.25), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.dotWall.position.z = -7.86; this.dotWall.userData.rpdTrue = true; G.add(this.dotWall);
    this.dotFloor = PC.decal(0.22, 0.22, PC.glowMat(new THREE.Color(5, 0.35, 0.3)), { y: 0.02, order: 4 }); G.add(this.dotFloor);
    // ---- S2 the quad; S2c the couch
    this.qd = PC.quad(K); G.add(this.qd.group);
    this.cu = PC.couch(K); G.add(this.cu.group);
    this.pool = PC.decal(4.0, 4.0, PC.glowMat(new THREE.Color(1.0, 0.55, 0.22)), { x: 0.9, z: -0.1 }); G.add(this.pool);
    this.brain = PC.brain(); G.add(this.brain.mesh);
    // the seal's inlay lit from within (the brain, the outro's line, the finish): cropped from the stage's inlay drawing
    try {
      const img = new Image(); img.src = 'assets/tracks/reverse-psychology-degree/inlay.png'; await img.decode();
      const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
      const s = img.width / 22.4, cx = 11.2 * s, cz = 7.2 * s, r = 3.12 * s;
      g.drawImage(img, cx - r, cz - r, r * 2, r * 2, 0, 0, 1024, 1024);
      const d = g.getImageData(0, 0, 1024, 1024); for (let i = 0; i < d.data.length; i += 4) { const v = d.data[i]; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0);
      const tx = new THREE.CanvasTexture(c); tx.anisotropy = 8;
      this.sealGlow = PC.decal(6.24, 6.24, PC.glowMat(new THREE.Color(2.6, 1.7, 0.5), { tex: tx }), { y: 0.013, order: 1 }); G.add(this.sealGlow);
    } catch (e) { console.warn('seal glow', e.message); }
    // ---- S3 commencement: festoons, the podium and banner, graduates, chairs, ribbons, call boxes, dissertations
    this.lw = PC.lawn(K); G.add(this.lw.group);
    this.gradSpots = [];
    for (const sx of [-1, 1]) for (const [rank, x] of [[0, 11.95], [1, 12.65], [2, 13.35]]) for (let i = 0; i < 18; i++) this.gradSpots.push({ x: sx * x, z: -6.4 + i * 0.75, rank, side: sx });
    for (let i = 0; i < 15; i++) this.gradSpots.push({ x: -5.25 + i * 0.75, z: -8.2, rank: 3, side: 0 });
    for (let i = 0; i < 26; i++) this.gradSpots.push({ x: -12 + i * 0.96 + (i % 2) * 0.3, z: -10.2 - (i % 3) * 0.8, rank: 4, side: 0 });
    this.gr = PC.graduates(K, this.gradSpots); G.add(this.gr.lo, this.gr.up, this.gr.caps);
    this.ch = PC.chairs(K, CHAIRS); G.add(this.ch.wood, this.ch.caps);
    this.chairs = CHAIRS.map(([x, z], i) => ({ i, x, z, alive: true, brokeT: -1, dir: 0 }));
    this.ribbons = RIBBONS.map(([z, cut]) => {
      const halves = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.012).translate(-s * 5.5, 0, 0), K.satin); m.position.set(s * 11, 1.0, z); G.add(m); return m; });
      return { z, cut, halves };
    });
    this.cb = PC.callBoxes(K, BOXES); G.add(this.cb.group);
    this.cbPools = BOXES.map(([x, z]) => { const d = PC.decal(4.8, 4.8, PC.glowMat(new THREE.Color(0.25, 0.42, 1.0)), { x, z }); G.add(d); return d; });
    this.ringing = new Set(); this.burnt = -1; this.burnT = -9;
    this.ds = PC.dissertations(K, SLABS); G.add(this.ds.group);
    // ---- S4 the cloister
    this.cl = PC.cloister(K); G.add(this.cl.group);
    // the moon through the arcades, as light added to the floor (multiplying a floor this dark showed nothing): pale
    // bars and arch shapes, the columns and spandrels left dark. A low moon, so the pattern reaches the middle.
    this.clShadow = PC.decal(22.4, 14.4, new THREE.MeshBasicMaterial({ map: PC.cloisterShadow(new THREE.Vector3(0.85, 0.3, -0.35)), color: new THREE.Color(0.045, 0.058, 0.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 }), { y: 0.011, order: 1 }); G.add(this.clShadow);
    // ---- S5b the exam hall
    this.ex = PC.examHall(K); G.add(this.ex.group);
    this.desks = PC.desks(K); G.add(this.desks);
    // ---- small things: stamps, wax seals, caps that fall like blades, pages
    this.stamps = []; this.seals = []; this.blades = []; this.tears = [];
    this.sealTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#5a0a14'; x.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = 54 + (i % 2) * 6; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } x.fill(); x.strokeStyle = '#8e1a26'; x.lineWidth = 5; x.beginPath(); x.arc(64, 64, 36, 0, Math.PI * 2); x.stroke(); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; })();
    // the set's materials (not the decals, the beam, the lamps that glow on their own) go negative with her
    negifyTree(G, { holes: false, dim: true });
    this._scrollMesh();                // her degree, rolled: built now (hidden) so it costs nothing when she lets it go
    // one of each small thing her attacks leave, made now (setStateAt hides them) so the warm-up compiles them too
    this.stamp(f, { x: 0, z: 0 }, -10, -9); this.waxSeal(f, { x: 0, z: 0 }); this.capBlade(f, { x: 0, z: 0 }, -10, -9); this.tear(f, { x: 0, z: 0 }, -10, -9);
    this._starMesh();
    // colliders that join the stage's
    this._colliders();
    const self = this;
    return {
      arena, bounds: arena.bounds, room: arena.room,
      resolve: (x, z, r) => self.resolve(x, z, r),
      strikeArc: (x, z, ang, range, arc, s) => self.strikeArc(x, z, ang, range, arc, s),
      update(dt, t, ff) { self.update(dt, t, ff); },
      dispose() { self.dispose(); },
    };
  }
  attachBoss(b) { this.arena.addCaster(this.f.player.root); this.arena.addCaster(b.root); }

  // ---------------------------------------------------------------- what stands on the stage
  _colliders() {
    const C = (o) => this.cols.push(o);
    C({ box: true, x: -5.0, z: -5.6, hx: 0.55, hz: 0.35, on: (t) => t < 48.95 });
    C({ box: true, x: 0, z: 0.8, hx: 1.0, hz: 0.4, rot: -15 * Math.PI / 180, on: (t) => t >= 93.7 && t < 99.95 });
    C({ box: true, x: -1.9, z: -0.5, hx: 0.45, hz: 0.45, rot: Math.atan2(1.9, 1.3), on: (t) => t >= 93.7 && t < 99.95 });
    C({ x: 1.4, z: -0.4, r: 0.26, on: (t) => t >= 93.7 && t < 99.95 });
    C({ box: true, x: 0, z: -6.6, hx: 0.5, hz: 0.3, on: (t) => t >= 100.1 && t < 166.3 });
    for (const c of this.chairs) C({ box: true, x: c.x, z: c.z, hx: 0.26, hz: 0.26, on: (t) => t >= 100.0 && t < 125.4 && c.alive, chair: c });
    BOXES.forEach(([x, z]) => C({ box: true, x, z, hx: 0.24, hz: 0.24, on: (t) => t >= 114.95 && t < 125.5 }));
    this.slabs = this.ds.list;
    for (const s of this.slabs) C({ box: true, x: s.x, z: s.z, hx: 0.7, hz: 0.22, on: (t) => t >= 125.6 && t < 144.6 && s.alive && !s.topple, slab: s });
    PC.DESK_ROWS.forEach((z, r) => PC.DESK_COLS.forEach((x) => C({ box: true, x, z: z + 0.05, hx: 0.55, hz: 0.38, on: (t) => t >= 172.3 && t < ROW_FALL[r] })));
    C({ box: true, x: 0, z: -6.8, hx: 0.8, hz: 0.42, on: (t) => t >= 166.5 && t < 191.19 });
  }
  resolve(x, z, r) {
    const p = this.arena.resolve(x, z, r), t = this.f.t;
    let px = p.x, pz = p.z;
    for (const c of this.cols) {
      if (!c.on(t)) continue;
      if (!c.box) { const dx = px - c.x, dz = pz - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-5) { px = c.x + dx / d * m; pz = c.z + dz / d * m; } continue; }
      const a = -(c.rot || 0), ca = Math.cos(a), sa = Math.sin(a);
      let lx = (px - c.x) * ca - (pz - c.z) * sa, lz = (px - c.x) * sa + (pz - c.z) * ca;
      const hx = c.hx + r, hz = c.hz + r;
      if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
        if (hx - Math.abs(lx) < hz - Math.abs(lz)) lx = Math.sign(lx || 1) * hx; else lz = Math.sign(lz || 1) * hz;
        px = c.x + lx * ca + lz * sa; pz = c.z - lx * sa + lz * ca;
      }
    }
    // keep it on the stage after the push
    const b = this.arena.bounds;
    px = Math.max(b.minX + r, Math.min(b.maxX - r, px)); pz = Math.max(b.minZ + r, Math.min(b.maxZ - r, pz));
    p.x = px; p.z = pz;
    return p;
  }
  // YOUR strikes break chairs and dissertations
  strikeArc(x, z, ang, range, arc, s) {
    const t = this.f.t;
    for (const c of this.cols) {
      if (!c.on(t) || !(c.chair || c.slab)) continue;
      const dx = c.x - x, dz = c.z - z, d = Math.hypot(dx, dz);
      if (d > range + Math.max(c.hx, c.hz)) continue;
      if (Math.abs(angDiff(Math.atan2(dx, dz), ang)) > arc && d > 1.0) continue;
      if (c.chair) this.breakChair(c.chair, Math.atan2(dx, dz));
      else this.hitSlab(c.slab, s && s.heavy ? 2 : 1, Math.atan2(dx, dz));
    }
  }
  breakChair(c, dir) {
    const f = this.f;
    if (!c.alive) return;
    c.alive = false; c.brokeT = f.t; c.dir = dir;
    f.fx.chips(c.x, 0.6, c.z, new THREE.Color(2.0, 1.9, 1.7), 14, dir);
    this.R.snd.play('clack', { x: c.x, rate: 1.6, gain: 0.7 });
    f.cam.shake(0.25, 0.1);
  }
  hitSlab(s, dmg, dir) {
    const f = this.f;
    if (!s.alive) return;
    s.hp -= dmg;
    f.fx.chips(s.x, 1.2, s.z, new THREE.Color(1.6, 0.25, 0.3), 8, dir);
    this.R.snd.play('thunk', { x: s.x, gain: 0.6, rate: 1.3 });
    if (s.hp <= 0) { this._pages(s.x, s.z, 1.2); s.alive = false; this.R.snd.lib('k-page', { x: s.x }); f.player.addMeter(0.10); f._good && f._good(60); f.cam.shake(0.35, 0.12); }
  }
  _pages(x, z, y = 1.0) { const f = this.f; f.fx.emit(36, { x, y, z, color: new THREE.Color(2.2, 2.1, 1.9), shape: 2, speed: 4, life: 1.6, size: 0.12, gravity: 3, up: 1.2, jitter: 0.8, drag: 1.6 }); f.fx.glitter(x, y, z, new THREE.Color(3, 2.2, 0.7), 10, 0.8); }

  // ---------------------------------------------------------------- the light
  _light(t) {
    const { cur, prev, k } = lightAt(t);
    const a = this.arena;
    const pa = prev[1], pb = prev[2], pk = prev[3], ca = cur[1], cb = cur[2], ck = cur[3];
    let sa, sb, sk;
    if (k >= 1 || (pa === ca && pb === cb && Math.abs(pk - ck) < 1e-3)) { sa = ca; sb = cb; sk = ck; }
    else if (pa === pb && ca === cb) { sa = pa; sb = ca; sk = k; }
    else if (pb === ca) { sa = pa; sb = ca; sk = lerp(pk, 1, k); }
    else if (pa === ca) { sa = ca; sb = cb; sk = lerp(pk, ck, k); }
    else if (pa === pb) { sa = pa; sb = cb === pa ? ca : cb; sk = k * (cb === pa ? 1 : ck); }
    else { sa = k < 0.5 ? pa : ca; sb = k < 0.5 ? pb : cb; sk = k < 0.5 ? pk : ck; }
    a.setState(sa, sb, sk);
    this.dim = lerp(prev[4], cur[4], k);
    this.keyMul = lerp(prev[5], cur[5], k);
    this.envMul = lerp(prev[6], cur[6], k);
    // the sky
    let i = 0; while (i < SKY.length - 1 && SKY[i + 1][0] <= t) i++;
    const S = SKY[i], Sp = SKY[Math.max(0, i - 1)], sk2 = i === 0 ? 1 : smooth(S[0], S[0] + 0.6, t);
    const u = this.sky.u;
    u.uTop.value.set(Sp[1]).lerp(_c.set(S[1]), sk2); u.uHor.value.set(Sp[2]).lerp(_c.set(S[2]), sk2);
    u.uStars.value = lerp(Sp[3], S[3], sk2); u.uMoon.value = lerp(Sp[4], S[4], sk2);
  }
  // the arena's lamp (unused by these sun-lit states): the projector in the lecture, then the analyst's lamp
  _lamp(t) {
    const L = this.arena.lamp;
    let on = 0;
    if (t < 49.2) {
      on = (t < 48.88 ? 1 : 1 - (t - 48.88) / 0.3) * (t > 40.41 ? 1.3 : 1);
      L.position.set(0, 1.0, 8.4); L.target.position.set(0, 1.9, -7.9);
      L.angle = 0.33; L.penumbra = 0.18; L.color.set(0xdde6ff); L.decay = 0; L.intensity = 2.2 * on;
    } else if (t >= 93.48 && t < 100.3) {
      on = t < 99.86 ? smooth(93.48, 93.7, t) : 1 - smooth(99.86, 100.2, t);
      L.position.set(1.4, 2.05, -0.4); L.target.position.set(0.2, 0, 0.2);
      L.angle = 1.1; L.penumbra = 0.6; L.color.set(0xffa860); L.decay = 2; L.intensity = 26 * on;
    }
    if (on > 0.001) { L.updateMatrixWorld(); L.target.updateMatrixWorld(); L.shadow.autoUpdate = true; }
  }

  setStateAt(t) {
    // breakables as they were at the checkpoint (or whole, the first time through)
    const snap = this.snaps.get(Math.round(t * 100));
    this.chairs.forEach((c, i) => { c.alive = snap ? snap.chairs[i] : true; c.brokeT = c.alive ? -1 : -100; if (c.alive) c.dir = 0; });
    this.slabs.forEach((s, i) => { s.alive = snap ? snap.slabs[i].alive : true; s.hp = snap ? snap.slabs[i].hp : 3; s.topple = null; });
    this.ringing.clear(); this.burnt = -1; this.burnT = -9;
    for (const o of [...this.stamps, ...this.seals, ...this.blades, ...this.tears]) { o.mesh.visible = false; o.on = false; }
    this.letgo = null; if (this.scroll) this.scroll.visible = false;
    this.starFall = null; this.finAge = undefined; if (this.fallStar) this.fallStar.visible = false;
    this.update(0, t, this.f);
  }
  onSection(f, sec) {
    this.snaps.set(Math.round(sec.t0 * 100), { chairs: this.chairs.map((c) => c.alive), slabs: this.slabs.map((s) => ({ alive: s.alive && !s.topple, hp: s.hp })) });
  }

  // ---------------------------------------------------------------- every frame: the whole set from song time
  update(dt, t, f) {
    if (this.finAge !== undefined) this.finAge += dt;
    this._light(t);
    NEG.uRpdDim.value = this.dim;
    const neg = NEG.uRpdNeg.value;
    NEG.uRpdNeg.value = 0;              // the mirror and the env capture see the world true
    this.arena.sun.intensity *= this.keyMul;
    this._lamp(t);
    f.scene.environmentIntensity = this.envMul;
    this._theatre(t, f);
    this._quad(t, f);
    this._couch(t, f);
    this._lawn(t, f);
    this._cloister(t);
    this._exam(t, f);
    this._small(t, f, dt);
    this._block(t, f);
    this._name(t, f);
    this.shafts.update(dt); this.motes.update(dt);
    this.arena.update(dt, f.cam.cam, f.player.root.position);
    NEG.uRpdNeg.value = neg;
    f.app.post.fx.exposure = this.arena.exposure;
    f.app.post.fx.threshold = 1.0 + 1.6 * neg;
  }

  _theatre(t, f) {
    const th = this.th;
    const on = t < 50.5;
    th.group.visible = on;
    this.dotWall.visible = this.dotFloor.visible = false;
    if (!on) { this.shafts.set(this.beam, 0); this.motes.mat.uniforms.uK.value = t >= 180.0 && t < 191.19 ? 0.55 * smooth(180.0, 181.0, t) : 0; return; }
    const fly = eIn(kIn(t, 48.88, 0.5)), slide = eIn(kIn(t, 48.88, 0.8));
    th.flats.position.y = 9 * fly;
    th.halves.forEach((h, i) => { const s = i ? 1 : -1, k = eOut(kIn(t, 48.88, 0.35)); h.position.x = s * (2.4 + 1.8 * k); h.rotation.z = -s * 0.25 * k; });
    th.tiers.forEach((g, i) => { const s = i ? 1 : -1; g.position.set(s * 6 * slide, -3 * slide, 0); });
    th.lectern.position.y = -1.4 * eIn(kIn(t, 48.88, 0.45));
    // the lamps ripple on back row to front, die in the stop, slam back with the band
    th.lampPos.forEach((L, i) => {
      const back = 8 - L.row;                        // z = 6.4 - 1.6 row: row 8 is the back
      let k = smooth(2.15 + back * 0.1375 - 0.04, 2.15 + back * 0.1375 + 0.04, t);
      if (t >= 21.27 && t < 23.39) k *= 1 - smooth(21.27 + (L.sx > 0 ? 0.12 : 0), 21.27 + (L.sx > 0 ? 0.25 : 0.12), t);
      if (t >= 40.41) k *= lerp(1, 0.2, smooth(40.41, 42.5, t));
      th.shade.setColorAt(i, _c.setRGB(0.35 * k * 1.8, 1.0 * k * 1.8, 0.5 * k * 1.8));
    });
    th.shade.instanceColor.needsUpdate = true;
    // the screen: the first slide (the line she sings), her diagrams every two bars, then the Rorschach
    if (t < 4.86) this.screen.draw(0);
    else if (t < 44.06) this.screen.draw(1 + Math.floor((t - 4.86) / 4.248) % 4);
    else this.screen.draw('ink', clamp01((t - 44.3) / 4.4));
    // the projector's beam and its dust
    const beamK = t < 48.88 ? (t < 2.15 ? 0.5 : t > 40.41 ? 0.45 : 0.28) : 0;
    this.shafts.set(this.beam, beamK); this.motes.mat.uniforms.uK.value = t < 48.88 ? 0.8 : 0;
    // her laser dot: circling YOUR shadow's head, tapping it, then down the wall and across the floor to YOUR feet
    const pl = f.player;
    if (t < 4.29) {
      const head = this._shadowHead(pl);
      if (t < 2.15) {
        const tap = [0.52, 1.07, 1.61].some((q) => t >= q && t < q + 0.09);
        const a = t * 5.3;
        this.dotWall.position.set(head.x + Math.cos(a) * (tap ? 0 : 0.22), head.y + Math.sin(a) * (tap ? 0 : 0.18), -7.86);
        this.dotWall.scale.setScalar(tap ? 1.8 : 1);
        this.dotWall.visible = true;
      } else if (t < 3.0) {
        const k = eIO(kIn(t, 2.15, 0.85));
        this.dotWall.position.set(head.x * (1 - k), lerp(head.y, 0.05, k), -7.86); this.dotWall.scale.setScalar(1); this.dotWall.visible = true;
      } else {
        const k = eIO(kIn(t, 3.0, 0.77));
        this.dotFloor.position.set(pl.x * k, 0.02, lerp(-7.7, pl.z + 0.35, k)); this.dotFloor.visible = true;
      }
    }
  }
  // where the head of YOUR shadow falls on the screen (the projector at 0, 1.0, 8.4)
  _shadowHead(pl) {
    const P = { x: 0, y: 1.0, z: 8.4 }, H = { x: pl.x, y: 1.72, z: pl.z };
    const k = (-7.86 - P.z) / (H.z - P.z || -1);
    return { x: P.x + (H.x - P.x) * k, y: Math.min(3.5, P.y + (H.y - P.y) * k) };
  }

  _quad(t, f) {
    const q = this.qd;
    const out = (t >= 48.88 && t < 166.24) || t >= 179.99;
    q.group.visible = out;
    if (!out) return;
    q.hedges.visible = (t >= 48.88 && t < 99.86) || t >= 191.19;
    q.posts.visible = t < 166.24 || t >= 191.19;
    q.far.visible = true;
    // the clock tower's hands run backwards
    q.hands[0].rotation.z = t * 0.035; q.hands[1].rotation.z = t * 0.42;
  }

  _couch(t, f) {
    const c = this.cu;
    const up = eOut(kIn(t, 93.48, 0.54)) * (1 - eIn(kIn(t, 99.86, 0.5)));
    c.group.visible = up > 0.001;
    c.group.position.y = -1.7 * (1 - up);
    this.pool.visible = t >= 93.48 && t < 100.1;
    if (this.pool.visible) this.pool.material.opacity = smooth(93.5, 93.8, t) * (1 - smooth(99.86, 100.1, t)) * 0.55;
    // the brain over the quad
    const bk = t >= 85.0 && t < 93.48 ? smooth(85.0, 85.4, t) : 0;
    this.brain.mesh.visible = bk > 0; this.brain.u.uK.value = bk; this.brain.u.uT.value = t;
    if (this.sealGlow) {
      const pulse = 0.85 + 0.15 * Math.sin(t * 5.9);
      // the finish: it flares, then settles to a gleam the gold star can be seen on (real time: the song clock stops)
      const fin = this.finAge !== undefined ? 0.3 + 0.7 * Math.max(0, 1 - this.finAge / 1.3) : 0;
      const k = Math.max(bk * 0.7, t >= 191.19 ? 0.18 : 0, t >= 194.58 && t < 198.3 ? smooth(194.58, 194.9, t) * (1 - smooth(197.96, 198.3, t)) * 0.9 : 0, fin);
      this.sealGlow.visible = k > 0.005; this.sealGlow.material.opacity = k * pulse;
    }
  }

  _lawn(t, f) {
    const L = this.lw;
    const on = t >= 99.86 && t < 166.24;
    L.group.visible = on;
    // festoons: on with the slam; 30 % in the blue stop; dim in the cloister; full for the final chorus
    const fest = !on ? 0 : t < 114.70 ? 1 : t < 125.33 ? 0.3 : t < 133.85 ? 1 : t < 144.46 ? 0.25 : 1.25;
    if (on) { for (let i = 0; i < L.nb; i++) { const tw = 0.9 + 0.1 * Math.sin(t * 3 + i * 1.7); L.bulbs.setColorAt(i, _c.setRGB(3.4 * fest * tw, 2.4 * fest * tw, 1.2 * fest * tw)); } L.bulbs.instanceColor.needsUpdate = true; }
    const rise = eOut(kIn(t, 99.86, 0.5));
    L.podium.position.y = -1.3 * (1 - rise);
    L.bigStar.visible = t >= 112.60 && t < 133.85;
    if (L.bigStar.visible) { const k = kIn(t, 112.60, 0.5); L.bigStar.scale.setScalar(0.8 * (1 + 0.3 * (1 - k) * Math.cos(k * 18))); }
    if ((t >= 99.5 && t < 167) || t >= 190.5 || this._gradOn) { this._graduates(t); this._gradOn = (t >= 99.5 && t < 167) || t >= 190.5; }
    if (t >= 99.5 && t < 126.5 || this._chairsOn) { this._chairs(t); this._chairsOn = t >= 99.5 && t < 126.5; }
    if (t >= 108 && t < 113.5 || this._ribOn) { this._ribbons(t); this._ribOn = t >= 108 && t < 113.5; }
    this._callBoxes(t, f);
    if (t >= 125 && t < 146.5 || this._slabsOn) { this._slabs(t, f); this._slabsOn = t >= 125 && t < 146.5; }
  }
  _graduates(t) {
    const G = this.gr, spots = this.gradSpots;
    const s3 = t >= 99.86 && t < 166.24, s5 = t >= 144.46 && t < 166.24, dawn = t >= 191.19;
    const rise = eOut(kIn(t, 99.86, 0.6));
    const capsOn = (t >= 99.86 && t < 129.06) || (t >= 144.46 && t < 165.18);
    const toss = t >= 129.06 && t < 131.5 ? t - 129.06 : -1;
    spots.forEach((p, i) => {
      let vis = false, y = 0, dark = false;
      if (p.rank <= 1) vis = s3;
      else if (p.rank <= 3) vis = s5;
      else vis = dawn;
      if (p.rank <= 1 && s3) y = -2.2 * (1 - rise);
      if (p.rank >= 2 && s5) y = -2.2 * (1 - eOut(kIn(t, 144.46, 0.6)));
      if (p.rank === 4) { y = -2.2 * (1 - eOut(kIn(t, 191.19, 1.2))); dark = true; }
      const face = Math.atan2(-p.x, -p.z);
      // the bow: a wave from the far corners to the near ones
      const bowT = 164.75 + (p.z + 8) / 16 * 0.4;
      const bow = t >= bowT && t < 167 ? Math.sin(Math.min(1, (t - bowT) / 0.9) * Math.PI) : 0;
      const sc = vis ? 1 : 0;
      _q.setFromEuler(_e.set(0, face, 0));
      _m.compose(_v.set(p.x, y, p.z), _q, _s.setScalar(sc)); G.lo.setMatrixAt(i, _m);
      _q.setFromEuler(_e.set(0.75 * bow, face, 0, 'YXZ'));
      _m.compose(_v.set(p.x, y + 0.95, p.z), _q, _s.setScalar(sc)); G.up.setMatrixAt(i, _m);
      // caps on heads (they fly at the toss, slide off at the bow)
      let cs = vis && capsOn && !dark ? 1 : 0;
      _v.set(p.x, y + 0.95 + 0.97, p.z);
      if (toss >= 0 && vis && p.rank <= 1) { cs = 1; _v.y += toss * 7 - 1.2 * toss * toss; _v.x += Math.sin(i) * toss * 0.6; _q.setFromEuler(_e.set(toss * 9 + i, toss * 7, 0)); }
      else _q.setFromEuler(_e.set(0.75 * bow, face, 0, 'YXZ'));
      _m.compose(_v, _q, _s.setScalar(cs)); G.caps.setMatrixAt(i, _m);
    });
    G.lo.instanceMatrix.needsUpdate = G.up.instanceMatrix.needsUpdate = G.caps.instanceMatrix.needsUpdate = true;
  }
  _chairs(t) {
    const C = this.ch, up = eOut(kIn(t, 99.86, 0.25)) * (1 - eIn(kIn(t, 125.33, 0.45)));
    this.chairs.forEach((c, i) => {
      const vis = up > 0.001;
      let y = -1.0 * (1 - up), rx = 0, ox = 0, oz = 0;
      if (!c.alive) { const k = c.brokeT < -50 ? 1 : eOut(kIn(t, c.brokeT, 0.35)); rx = -Math.PI / 2 * k; ox = Math.sin(c.dir) * 0.9 * k; oz = Math.cos(c.dir) * 0.9 * k; y += 0.02; }
      _q.setFromEuler(_e.set(rx, c.dir || 0, 0, 'YXZ'));
      _m.compose(_v.set(c.x + ox, y, c.z + oz), _q, _s.setScalar(vis ? 1 : 0)); C.wood.setMatrixAt(i, _m);
      // the cap flips up when the chair folds
      let cy = y, cr = 0;
      if (!c.alive) { const k = c.brokeT < -50 ? 1 : kIn(t, c.brokeT, 0.7); cy = y + Math.sin(k * Math.PI) * 1.1 - 0.45 * k; cr = k * 9; }
      _q.setFromEuler(_e.set(cr, 0.3 + i, 0));
      _m.compose(_v.set(c.x + ox * 1.3, cy, c.z + oz * 1.3), _q, _s.setScalar(vis ? 1 : 0)); C.caps.setMatrixAt(i, _m);
    });
    C.wood.instanceMatrix.needsUpdate = C.caps.instanceMatrix.needsUpdate = true;
  }
  _ribbons(t) {
    for (const r of this.ribbons) {
      const on = t >= 108.35 && t < r.cut + 0.5;
      const stretch = eOut(kIn(t, 108.35, 0.3));
      r.halves.forEach((h, i) => {
        h.visible = on;
        if (!on) return;
        const back = t >= r.cut ? eOut(kIn(t, r.cut, 0.35)) : 0;
        h.scale.set(Math.max(0.001, stretch * (1 - back)), 1, 1);
        h.rotation.y = back * (i ? -0.4 : 0.4) * Math.sin(back * 7);
      });
    }
  }
  _callBoxes(t, f) {
    const up = eOut(kIn(t, 114.70, 0.52)) * (1 - eIn(kIn(t, 125.33, 0.5)));
    const vis = up > 0.001;
    this.cb.group.visible = vis;
    this.cb.group.position.y = -2.8 * (1 - up);
    this.cb.list.forEach((b, i) => {
      const ring = this.ringing.has(i), strobe = ring ? (Math.sin(t * Math.PI * 8) > 0 ? 1.6 : 0.4) : 1;
      const dead = this.burnt === i && t >= this.burnT;
      b.globe.material.color.setRGB(0.23 * 3 * strobe, 0.42 * 3 * strobe, 1.0 * 3 * strobe).multiplyScalar(dead ? 0.05 : 1);
      // the globe blinks hard (the phone's light); its 4.8 m pool on the floor only swells with it (a hard 4 Hz square
      // on pools that size was a strobe at the edge of the picture)
      const pool = this.cbPools[i];
      pool.visible = vis && t < 125.33 && !dead;
      if (pool.visible) pool.material.opacity = up * 0.55 * (ring ? 0.8 + 0.2 * Math.sin(t * Math.PI * 8) : 1);
    });
    // the ring of the box that burns
    if (this.burnRing) { const k = (t - this.burnT) / 0.6; this.burnRing.visible = k >= 0 && k < 1; if (this.burnRing.visible) { this.burnRing.scale.setScalar(0.5 + k * 3.2); this.burnRing.material.opacity = 1 - k; } }
    if (vis && this.ringing.size && this._trill === undefined) this._trill = this.R.snd.loop('trill', { gain: 0.6 });
    if ((!vis || !this.ringing.size) && this._trill) { this._trill.stop(0.05); this._trill = undefined; }
  }
  _slabs(t, f) {
    const up = eOut(kIn(t, 125.33, 0.53)) * (1 - eIn(kIn(t, 144.46, 0.5)));
    const vis = up > 0.001;
    this.ds.group.visible = vis;
    this.slabs.forEach((s) => {
      s.pivot.visible = vis && (s.alive || (s.topple && t < s.topple.e));
      s.pivot.position.y = -2.4 * (1 - up);
      // a topple: it creaks over through the fill, then falls flat on the beat toward where YOU stood
      if (s.topple) {
        const { a, s0, e } = s.topple;
        const k = t < e - 0.18 ? 0.18 * smooth(s0, e - 0.18, t) : 0.18 + 0.82 * eIn(kIn(t, e - 0.18, 0.18));
        s.pivot.rotation.set(0, 0, 0);
        _q.setFromAxisAngle(_v.set(Math.cos(a), 0, -Math.sin(a)), k * Math.PI / 2);
        s.pivot.quaternion.copy(_q);
      } else s.pivot.quaternion.identity();
    });
    // balloons over the slabs still standing, let go on "let go"
    const B = this.ds.balloons;
    const tied = t >= 133.85 && t < 146;
    let n = 0;
    this.slabs.forEach((s, si) => {
      for (let j = 0; j < 6; j++, n++) {
        const show = tied && s.alive && !s.topple && vis;
        const fl = t >= 141.28 ? (t - 141.28) : 0;
        const ph = si * 1.3 + j * 0.9;
        _v.set(s.x + Math.sin(ph) * 0.5 + Math.sin(t * 0.8 + ph) * 0.06 + fl * Math.sin(ph) * 0.4, 2.8 + (j % 3) * 0.35 + Math.sin(t * 1.3 + ph) * 0.05 + fl * (1.4 + j * 0.15) * fl * 0.6 + fl * 1.2, s.z + Math.cos(ph) * 0.2);
        _m.compose(_v, _q.identity(), _s.setScalar(show ? (t < 134.3 ? eOut(kIn(t, 133.85, 0.45)) : 1) : 0));
        B.setMatrixAt(n, _m);
      }
    });
    B.instanceMatrix.needsUpdate = true;
  }
  _cloister(t) {
    const lower = eOut(kIn(t, 133.85, 0.6)), up = eIn(kIn(t, 144.46, 0.5));
    const on = t >= 133.85 && t < 145.2;
    this.cl.group.visible = on;
    this.cl.group.position.y = 7 * (1 - lower) + 9 * up;
    this.clShadow.visible = t >= 134.0 && t < 144.6;
    if (this.clShadow.visible) this.clShadow.material.opacity = smooth(134.0, 134.5, t) * (1 - smooth(144.3, 144.6, t));
  }
  _exam(t, f) {
    const E = this.ex;
    const on = t >= 166.24;
    E.group.visible = on;
    if (on) {
      const fly = eOut(kIn(t, 166.24, 0.5));
      for (const w of E.walls) {
        const t0 = w.side === 'left' ? 179.46 : w.side === 'right' ? 179.73 : 179.99;
        const fall = eIn(kIn(t, t0 - 0.45, 0.45));
        w.pivot.position.y = 8 * (1 - fly);
        w.pivot.rotation.x = -Math.PI / 2 * fall;
      }
      E.hands[0].rotation.z = t * 0.05; E.hands[1].rotation.z = t * 0.6;
      // the strips flicker on beat by beat; swing and die when the walls go
      E.strips.forEach((s, i) => {
        const row = Math.floor(i / 3);
        let k = t < 166.24 + row * 0.265 ? 0 : (t < 166.24 + row * 0.265 + 0.2 ? (Math.sin(t * 90) > 0 ? 1 : 0.1) : 1);
        let broken = false;
        if (t >= 179.46) { const edge = (i === 0 || i === 11 || i === 5); if (t >= 179.99 && !edge) k = 0; else if (t >= 179.99) { broken = true; k = Math.sin(t * 23 + i) > 0.6 ? 1 : 0.05; } }
        if (t >= 191.19) k = 0;
        s.s.visible = k > 0 || broken;
        s.s.rotation.z = t >= 179.46 ? Math.sin((t - 179.46) * 6 + i) * 0.25 * Math.exp(-(t - 179.46) * 0.5) + (broken ? 0.35 : 0) : 0;
        s.tube.material.color.setRGB(2.6 * k, 2.75 * k, 3.0 * k);
      });
      E.desk.visible = t < 191.19;
    }
    // the desks: they rise, the rows fall forward like dominoes (far row first), they lie there until dawn
    const D = this.desks;
    const show = t >= 172.08 && t < 191.19;
    D.visible = show;
    if (show) {
      let n = 0;
      PC.DESK_ROWS.forEach((z, r) => PC.DESK_COLS.forEach((x, ci) => {
        const rise = eOut(kIn(t, 172.08, 0.53));
        const e = ROW_FALL[r], s0 = e - 1.06;
        const creak = smooth(s0, e - 0.15, t) * (0.12 + 0.03 * Math.sin(t * 40 + ci));
        const fall = t >= e - 0.15 ? 0.12 + 0.88 * eIn(kIn(t, e - 0.15, 0.15)) : creak;
        _q.setFromEuler(_e.set(fall * Math.PI / 2 * 0.98, (ci % 2 ? 0.04 : -0.04) * fall, 0));
        _m.compose(_v.set(x, -0.8 * (1 - rise) + 0.02, z + 0.38), _q, _s.set(1, 1, 1));
        _m.multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.38));
        D.setMatrixAt(n++, _m);
      }));
      D.instanceMatrix.needsUpdate = true;
    }
  }

  // ---------------------------------------------------------------- her projectiles stop at chairs and dissertations
  _block(t, f) {
    if (!(t >= 100 && t < 144.6)) return;
    for (const p of f.proj.list) {
      if (p.owner !== 'boss' || p.dead) continue;
      for (const c of this.cols) {
        if (!(c.chair || c.slab) || !c.on(t)) continue;
        if (Math.abs(p.x - c.x) < c.hx + p.radius && Math.abs(p.z - c.z) < c.hz + p.radius) {
          p.dead = true;
          if (c.chair) this.breakChair(c.chair, p.angle); else f.fx.chips(p.x, 1.0, p.z, new THREE.Color(1.6, 0.3, 0.3), 5, p.angle + Math.PI);
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------- the small things her attacks leave
  _small(t, f, dt) {
    for (const s of this.stamps) {
      const m = s.mesh; if (!s.on) continue;
      const k = (t - s.s) / (s.e - s.s);
      if (t > s.e + 0.6 || k < -0.1 || !s.on) { m.visible = false; s.on = false; continue; }
      // it waits out of the picture while its circle fills, slams in the last instant, lifts straight away
      const drop = t < s.e ? 14 - 13.85 * eIn(clamp01((t - (s.e - 0.22)) / 0.22)) : 0.15 + 14 * eIn(clamp01((t - s.e - 0.08) / 0.4));
      m.visible = t >= s.e - 0.2 && drop < 9;
      m.position.set(s.x, drop, s.z); m.rotation.y = (1 - clamp01(k)) * 1.2;
    }
    for (const s of this.seals) { const m = s.mesh; if (!m.visible) continue; const age = t - s.t; if (age < 0 || age > 8.5) { m.visible = false; continue; } m.material.opacity = Math.min(1, (8.5 - age) / 1.5) * 0.92; }
    for (const b of this.blades) {
      const m = b.mesh; if (!m.visible) continue;
      if (t < b.e - 0.5 || t > b.e + 1.1) { m.visible = false; continue; }
      if (t < b.e) { const k = clamp01((t - (b.e - 0.5)) / 0.5); m.position.set(b.x, 7.5 - 7.3 * eIn(k), b.z); m.rotation.set(0.35, t * 22, 0.9); }
      else { m.position.set(b.x, 0.12, b.z); m.rotation.set(0.35, b.e * 22, 0.9); if (!b.shat && t > b.e + 1.06) { b.shat = true; f.fx.chips(b.x, 0.2, b.z, new THREE.Color(2, 2, 2.1), 12); } }
    }
    for (const r of this.tears) { const m = r.mesh; if (!m.visible) continue; if (t > r.e || t < r.s) { m.visible = false; continue; } const k = (t - r.s) / (r.e - r.s); m.position.set(r.x, 6.5 - 6.4 * k * k, r.z); m.rotation.y = t * 3; }
    // the diploma she lets go: it floats to YOU, glowing pink, and does nothing either way
    if (this.letgo) this._letgo(t, f, dt);
    if (this.starFall) this._starFall(t, f, dt);
  }

  // ---------------------------------------------------------------- hooks from the choreography
  boxes() { return BOXES.map(([x, z]) => ({ x, z })); }
  aisles() { return [-6.6, -3.3, 0, 3.3, 6.6]; }
  laserTap(f) { f.fx.sparks(this.dotWall.position.x, this.dotWall.position.y, -7.8, new THREE.Color(4, 0.4, 0.3), 4); }
  glint(f) { const b = f.boss; f.fx.sparks(b.x + Math.sin(b.facing) * 1.2, 1.5, b.z + Math.cos(b.facing) * 1.2, new THREE.Color(4, 0.3, 0.3), 6); }
  inkblot() {}
  detonate(f) {
    // the ink jumps up from the whole floor outside the strip and bursts into black glitter
    for (let i = 0; i < 22; i++) {
      const x = (i % 2 ? 1 : -1) * (1.6 + Math.random() * 9), z = -6.5 + Math.random() * 13;
      f.fx.emit(10, { x, y: 0.1, z, color: new THREE.Color(0.02, 0.015, 0.03), shape: 2, speed: 5, life: 0.9, size: 0.14, gravity: 12, up: 2.2, jitter: 0.5, drag: 0.4 });
      f.fx.glitter(x, 0.5, z, new THREE.Color(0.25, 0.22, 0.3), 6, 0.8);
    }
    f.cam.shake(0.9, 0.25);
  }
  stamp(f, p, s, e) {
    let st = this.stamps.find((q) => !q.on);
    if (!st) {
      const g = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.16, 40), this.K.brass); disc.position.y = 0.08; g.add(disc);
      const face = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), this.K.gold); face.rotation.x = Math.PI / 2; face.position.y = -0.002; g.add(face);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.4, 12), this.K.walnut); handle.position.y = 0.85; g.add(handle);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10), this.K.walnut); knob.position.y = 1.65; g.add(knob);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.group.add(g); st = { mesh: g }; this.stamps.push(st);
    }
    Object.assign(st, { x: p.x, z: p.z, s, e, on: true }); st.mesh.visible = false;
  }
  waxSeal(f, p) {
    let s = this.seals.find((q) => !q.mesh.visible);
    // dark crimson wax under the set's light (the dimmer, the negative): never a pink circle, which would mean "catch"
    if (!s) { const m = PC.decal(1.4, 1.4, new THREE.MeshBasicMaterial({ map: this.sealTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), { y: 0.014, order: 1 }); negifyTree(m, { holes: false, dim: true }); this.group.add(m); s = { mesh: m }; this.seals.push(s); }
    s.mesh.position.set(p.x, 0.014, p.z); s.mesh.rotation.z = Math.random() * 6; s.t = f.t; s.mesh.visible = true;
  }
  dust(f, p) { f.fx.dust(p.x, p.z, 14, new THREE.Color(0.55, 0.5, 0.46)); f.fx.chips(p.x, 0.1, p.z, new THREE.Color(0.5, 0.42, 0.36), 8); }
  tear(f, p, s, e) {
    let r = this.tears.find((q) => !q.mesh.visible);
    if (!r) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10).scale(0.7, 1.4, 0.7), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 0.6, 1.6) })); m.userData.rpdTrue = true; this.group.add(m); r = { mesh: m }; this.tears.push(r); }
    Object.assign(r, { x: p.x, z: p.z, s: e - 0.55, e }); r.mesh.visible = false; r.mesh.visible = true;
  }
  cutRibbon() {}
  slapStar(f) { f.cam.shake(0.3, 0.1); this.R.snd.play('thunk', { x: 2.7, gain: 0.5, rate: 1.5 }); }
  ring(f, list) { this.ringing = new Set(list); }
  burn(f, i) {
    this.burnt = i; this.burnT = f.t;
    if (!this.burnRing) { this.burnRing = PC.decal(1.6, 1.6, PC.glowMat(new THREE.Color(2.2, 2.8, 4.5)), { y: 0.03, order: 4 }); this.group.add(this.burnRing); }
    const [x, z] = BOXES[i]; this.burnRing.position.set(x, 0.03, z);
    f.fx.sparks(x, 1.5, z, new THREE.Color(2.4, 2.8, 4.5), 30); f.fx.glitter(x, 2.6, z, new THREE.Color(2, 2.6, 4), 20, 1.2);
  }
  // the slab nearest YOU (k = 0) or the next (k = 1) topples toward where YOU stand
  topple(f, k, s, e) {
    const pl = f.player;
    const live = this.slabs.filter((q) => q.alive && !q.topple && f.t >= 125.6).map((q) => ({ q, d: Math.hypot(q.x - pl.x, q.z - pl.z) })).sort((a, b) => a.d - b.d);
    const pick = live[0]; if (!pick) return null;
    const sl = pick.q, a = Math.atan2(pl.x - sl.x, pl.z - sl.z);
    sl.topple = { a, s0: s, e };
    return { x: sl.x, z: sl.z, ang: a, slab: sl };
  }
  slabLands(f, sl) { const s = sl.slab; const x = s.x + Math.sin(sl.ang) * 1.3, z = s.z + Math.cos(sl.ang) * 1.3; this._pages(x, z, 0.4); s.alive = false; f.cam.shake(0.5, 0.15); }
  tossCaps(f) { this.R.snd.play('swish', { x: 0, gain: 0.8, rate: 0.7 }); }
  capBlade(f, p, s, e) {
    let b = this.blades.find((q) => !q.mesh.visible);
    if (!b) {
      const g = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.42), this.K.black); g.add(board);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.012, 0.46), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.5, 2.8) })); g.add(edge);
      edge.userData.rpdTrue = true;
      this.group.add(g); b = { mesh: g }; this.blades.push(b);
    }
    Object.assign(b, { x: p.x, z: p.z, s, e, shat: false }); b.mesh.visible = true;
  }
  releaseBalloons() {}
  // "making you doubt your own damn name": the HUD's name mirrors letter by letter, then flips back
  mirrorName() {}
  _name(t, f) {
    const el = f.hud && f.hud.el && f.hud.el.name; if (!el) return;
    const name = f.boss.name, rev = name.split('').reverse().join('');
    let s = name;
    if (t >= 157.21 && t < 159.34) { const n = Math.min(name.length, Math.floor((t - 157.21) / (158.28 - 157.21) * name.length)); s = rev.slice(0, n) + name.slice(n); }
    if (el.textContent !== s) el.textContent = s;
  }
  bow(f, cue, at) {
    // every other graduate's cap skids in toward the middle: white cards on the floor
    const pts = this.gradSpots.filter((p) => p.rank === 0).filter((_, i) => i % 2 === 0);
    for (const p of pts) f.tele.add({ shape: 'circle', x: p.x * 0.93, z: p.z, w: 0.35, kind: 'white', start: cue, end: at });
    f.cue('white', { x: 0 }); this.R.snd.lib('k-cloth', { x: 0, gain: 0.6, rate: 0.6 });
    f.at(at, () => {
      for (const p of pts) {
        const x = p.x * 0.93, z = p.z, d = Math.hypot(x, z), a = Math.atan2(-x, -z);
        f.proj.spawn({ x, z, y: 0.25, angle: a, speed: 6.5, kind: 'white', shape: 'card', size: 0.4, spin: 6, life: d / 6.5 });
      }
      f.sfx.fire && f.sfx.fire('card', 0, 'white');
    });
  }
  aisleCards(f, x) { for (let i = 0; i < 3; i++) f.proj.spawn({ x, z: -7.2 - i * 0.6, y: 0.9, angle: 0, speed: 22, kind: 'white', shape: 'card', size: 0.36, spin: 8, owner: 'deco', life: 0.9, fn: (p, dt) => { p.z += 22 * dt; } }); this.R.snd.lib('k-page', { x, gain: 0.5 }); }
  clockStrike(f) { this.R.snd.play('tsing', { x: 0, rate: 0.5, gain: 1.4 }); f.cam.shake(0.2, 0.1); }
  diploma() {}
  _scrollMesh() {
    if (!this.scroll) {
      // the rolled degree (it spins and rolls) and its pink glow, a billboard that never turns with it (as a child of the
      // spinning scroll it turned edge-on and smeared into a white streak)
      const g = new THREE.Group(), roll = new THREE.Group();
      roll.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 16).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.5, emissive: 0x401020 })));
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.011, 6, 16), new THREE.MeshStandardMaterial({ color: 0x8e0e1f, roughness: 0.4 })); bow.rotation.y = Math.PI / 2; roll.add(bow);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), PC.glowMat(new THREE.Color(2.6, 0.32, 1.0)));
      g.add(roll, glow); g.userData.roll = roll; g.userData.glow = glow;
      g.visible = false;
      this.group.add(g); this.scroll = g;
    }
    return this.scroll;
  }
  letGo(f) {
    const b = f.boss;
    const hand = b.fig && b.fig.bones && b.fig.bones.hand_r;
    const p = hand ? hand.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(b.x, 1.4, b.z);
    const d = this.R.fig.acc.find((a) => a.name === 'rpdDiploma'); if (d) for (const o of d.objects) o.visible = false;
    const s = this._scrollMesh();
    s.position.copy(p); s.visible = true; s.userData.roll.rotation.set(0, 0, 0);
    this.letgo = { phase: 'float', t0: f.t, age: 0 };
  }
  _letgo(t, f, dt) {
    const s = this.scroll, pl = f.player, L = this.letgo, roll = s.userData.roll;
    L.age += dt;                                   // its own clock: it goes on drifting after the finish stops the song
    const glow = s.userData.glow; glow.quaternion.copy(f.cam.cam.quaternion);
    if (L.phase === 'float') {
      const dx = pl.x - s.position.x, dz = pl.z - s.position.z, d = Math.hypot(dx, dz);
      s.position.x += dx / (d || 1) * 1.6 * dt; s.position.z += dz / (d || 1) * 1.6 * dt; s.position.y += (1.2 - s.position.y) * Math.min(1, dt * 2);
      roll.rotation.y += dt * 1.2;
      glow.material.opacity = 0.55 + 0.2 * Math.sin(L.age * 6);
      // caught: it crumbles to chalk in YOUR hand, her quietest tsk, no gold
      if (d < FEEL.catchRadius && pl.catchT >= 0 && pl.catchT < 0.2) { L.phase = 'gone'; s.visible = false; f.fx.chips(s.position.x, 1.2, s.position.z, new THREE.Color(2.2, 2.2, 2.1), 16); f.fx.dust(s.position.x, s.position.z, 8, new THREE.Color(0.9, 0.9, 0.88)); this.R.snd.play('tsk', { x: s.position.x, gain: 0.35 }); }
      else if (d < 0.55) { L.phase = 'drop'; L.vx = dx / (d || 1) * 0.8; L.vz = dz / (d || 1) * 0.8; L.vy = 0; }
    } else if (L.phase === 'drop') {
      L.vy -= 9.8 * dt; s.position.y = Math.max(0.03, s.position.y + L.vy * dt);
      s.position.x += L.vx * dt; s.position.z += L.vz * dt;
      // it rolls across its own axis, the way a dropped scroll does
      if (s.position.y <= 0.031) { L.vx *= 0.97; L.vz *= 0.97; L.spin = (L.spin || 0) + Math.hypot(L.vx, L.vz) * dt / 0.035; roll.rotation.set(L.spin, Math.atan2(L.vx, L.vz), 0, 'YXZ'); }
      glow.material.opacity = Math.max(0, glow.material.opacity - dt);
    }
  }
  // the gold star doesn't break: it flutters down and comes to rest by the seal, glinting
  // the keepsake, built at load (hidden) so the warm-up compiles it: the sticker over her heart, made big enough to
  // read from the camera (a real 5.5 cm sticker is a few pixels), with its own gold glow
  _starMesh() {
    if (this.fallStar) return this.fallStar;
    const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.105 : 0.25; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.006, bevelSegments: 1 });
    geo.translate(0, 0, -0.008);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.14) p.setZ(i, p.getZ(i) + (p.getY(i) - 0.14) * 0.35);   // one point creased
    geo.computeVertexNormals();
    const star = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 1, roughness: 0.18, emissive: 0x8a5a14, emissiveIntensity: 1.4 }));
    star.castShadow = true;
    // a pool of gold light on the floor under it once it has landed (a glow over it whited the star out)
    const glow = PC.decal(1.4, 1.4, PC.glowMat(new THREE.Color(2.0, 1.3, 0.38)), { y: -0.016, order: 1 });
    glow.visible = false;
    const g = new THREE.Group(); g.add(star, glow); g.visible = false;
    this.group.add(g);
    this.fallStar = g; this.fallStar.userData.star = star; this.fallStar.userData.glow = glow;
    return g;
  }
  finish(f) {
    const b = f.boss, st = this.R.fig.acc.find((a) => a.name === 'rpdStar');
    const p = st && st.objects[0] ? st.objects[0].getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(b.x, 1.6, b.z);
    const g = this._starMesh();
    g.position.copy(p); g.visible = true;
    // it comes to rest on the seal: toward its middle, drifting at most 2.4 m
    const to = new THREE.Vector3(-p.x, 0, -p.z); if (to.length() > 2.4) to.setLength(2.4);
    to.add(new THREE.Vector3(p.x, 0.02, p.z));
    // on its own clock: the fight stops the song clock at the finish, so anything on song time stands still from here
    this.starFall = { age: 0, from: p.clone(), to };
    this.finAge = 0;
  }
  _starFall(t, f, dt) {
    const S = this.starFall; S.age += dt;
    const a = S.age, k = clamp01(a / 1.5), g = this.fallStar, star = g.userData.star, glow = g.userData.glow;
    g.position.lerpVectors(S.from, S.to, k);
    g.position.x += Math.sin(k * 9) * 0.3 * (1 - k); g.position.y = lerp(S.from.y, 0.03, 1 - (1 - k) * (1 - k));
    // slow tumbles on the way down, then flat and face up, catching the dawn
    if (k < 1) star.rotation.set(a * 4.2, a * 2.3, a * 2.9);
    else star.rotation.set(-Math.PI / 2, 0, 0.4);
    glow.visible = k >= 1;
    if (glow.visible) glow.material.opacity = 0.45 + 0.2 * Math.sin((a - 1.5) * 3.1);
    if (k >= 1 && !S.glint) { S.glint = true; f.fx.glitter(g.position.x, 0.15, g.position.z, new THREE.Color(3, 2.2, 0.6), 18, 0.45); this.R.snd.play('tsing', { x: g.position.x, rate: 1.5, gain: 0.5 }); }
  }
  // notch 3: the sticker sheet bursts and twelve gold stars soar into YOU
  starsToYou(f) {
    const b = f.boss;
    // a burst out of the sheet, then a magnet that only gets stronger: every star lands in YOU within about 0.6 s
    // (a turn-limited homing at this speed circled YOU instead)
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      f.proj.spawn({ x: b.x + Math.sin(a) * 0.6, z: b.z + Math.cos(a) * 0.6, y: 1.2, angle: a, speed: 5 + (i % 3), kind: 'gold', shape: 'star', size: 0.28, owner: 'deco', life: 1.6, spin: 5,
        fn: (p, dt) => {
          if (p.age < 0.2) { p.x += Math.sin(p.angle) * p.speed * dt; p.z += Math.cos(p.angle) * p.speed * dt; p.y += 2.4 * dt; p.speed *= Math.exp(-6 * dt); return; }
          const pull = Math.min(1, dt * (4 + (p.age - 0.2) * 32));
          p.x += (f.player.x - p.x) * pull; p.z += (f.player.z - p.z) * pull; p.y += (1.1 - p.y) * pull;
          if (Math.hypot(f.player.x - p.x, f.player.z - p.z) < 0.3) { p.dead = true; f.fx.glitter(f.player.x, 1.1, f.player.z, new THREE.Color(3, 2.3, 0.7), 2, 0.25); }
        } });
    }
    this.R.snd.play('tsing', { x: b.x, rate: 1.6, gain: 0.6 });
  }
  spotlight() {}

  dispose() {
    const f = this.f;
    if (this._trill) this._trill.stop(0.05);
    this.R.snd && this.R.snd.stopAll();
    NEG.uRpdNeg.value = 0; NEG.uRpdDim.value = 1; NEG.uRpdFlash.value = 0;
    f.scene.environmentIntensity = 1;
    f.app.post.fx.threshold = 1.0;
    if (f.hud && f.hud.el && f.hud.el.name) f.hud.el.name.textContent = f.boss ? f.boss.name : '';
    this.shafts.dispose(); this.motes.dispose();
    this.R.lies && this.R.lies.dispose(); this.R.flashes && this.R.flashes.dispose();
    f.scene.remove(this.group);
    this.arena.dispose();
  }
}
