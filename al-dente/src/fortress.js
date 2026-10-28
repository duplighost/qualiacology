// Stage two: a fortress of DRY pasta. Dry pasta doesn't hold you; the cooked sheets hanging off it do.
// Route: landing -> rigatoni gatehouse -> courtyard -> banner up the inner wall -> rampart with rolling
// tortellini -> snapping peg ladder up the keep -> spring -> the drying rack -> the star.
import * as THREE from 'three';
import * as Shapes from './shapes.js';
import { Colliders } from './collide.js';
import { lasagnaStack, addSeaSky, buildHeaps, SEA } from './world.js';
import { FX, Plank, Spring, Pickups, Snail, rodGeometry, mergeWithShade } from './props.js';
import { grassOnTops, addWillow, addFlowers, addButterflies } from './kit.js';
import { mulberry32, clamp, lerp, TAU } from './util.js';

const FLOOR = 2.0;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

// Black dry tortellini rolling along the rampart. Stomp one and it cracks apart.
class Tortellini {
  constructor(scene, K, col, audio, { from, to, y, z, every = 3.1, speed = 3.3, max = 6 }) {
    this.col = col; this.audio = audio; this.from = from; this.to = to; this.y = y; this.z = z;
    this.every = every; this.speed = speed; this.t = 1.5;
    const geo = Shapes.tortellino({ size: 1.2 });
    this.outer = geo.userData.outer; this.ground = y - 0.6;
    this.items = [];
    for (let i = 0; i < max; i++) {
      const mesh = new THREE.Mesh(geo, K.beetDry);
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.visible = false;
      scene.add(mesh);
      const c = col.add({ type: 'sphere', x: 0, y: -99, z: 0, r: 0.56, surface: 'dry', sticky: false, noCamera: true, active: false,
        onTouch: (hero, k) => this.touch(it, hero, k) });
      const it = { mesh, c, live: false, x: 0, vy: 0, yy: 0, rot: 0, tick: 0, wob: Math.random() * 6 };
      this.items.push(it);
    }
    // shards for when one breaks
    this.shardGeo = new THREE.IcosahedronGeometry(0.12, 0);
    this.shards = new THREE.InstancedMesh(this.shardGeo, K.beetDry, 60);
    this.shards.frustumCulled = false; this.shards.castShadow = true;
    this.sh = [];
    for (let i = 0; i < 60; i++) { this.sh.push({ live: false, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), t: 0, s: 1 }); _m.makeScale(0, 0, 0); this.shards.setMatrixAt(i, _m); }
    scene.add(this.shards);
  }
  reset() { for (const it of this.items) this.kill(it); this.t = 1.5; }
  kill(it) { it.live = false; it.mesh.visible = false; it.c.active = false; }
  spawn() {
    const it = this.items.find(i => !i.live); if (!it) return;
    it.live = true; it.x = this.from; it.yy = this.y; it.vy = 0; it.rot = Math.random() * TAU; it.mesh.visible = true; it.c.active = true;
  }
  touch(it, hero, k) {
    if (!it.live || hero.state !== 'play') return;
    if (k.ny > 0.45 && hero.prevVel.y < -1) {
      hero.vel.y = 12; hero.cut = true; hero.grounded = false;
      this.shatter(it);
      return;
    }
    const dx = hero.pos.x - it.x, dz = hero.pos.z - this.z, l = Math.hypot(dx, dz) || 1;
    hero.vel.set(dx / l * 8, 6.5, dz / l * 8);
    hero.stun = 0.42; hero.grounded = false; hero.unstick?.();
    this.audio?.bonk();
  }
  shatter(it) {
    const p = new THREE.Vector3(it.x, it.yy, this.z);
    this.audio?.shatter?.(1);
    let n = 0;
    for (const s of this.sh) {
      if (s.live) continue;
      s.live = true; s.t = 0; s.s = 0.6 + Math.random() * 1.1;
      s.p.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.3) * 0.8, (Math.random() - 0.5) * 0.6));
      s.v.set((Math.random() - 0.5) * 6, 2 + Math.random() * 5, (Math.random() - 0.5) * 6);
      s.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      if (++n >= 16) break;
    }
    this.kill(it);
  }
  update(dt, hero) {
    this.t -= dt;
    if (this.t <= 0) { this.t = this.every * (0.85 + Math.random() * 0.3); this.spawn(); }
    for (const it of this.items) {
      if (!it.live) continue;
      it.x -= this.speed * dt;
      const off = it.x < this.to;
      if (off) { it.vy -= 30 * dt; it.yy += it.vy * dt; }
      if (it.yy < SEA - 1) { this.kill(it); continue; }
      it.rot += (this.speed / 0.52) * dt;
      it.wob += dt;
      // it rolls on its crest: plump belly down sits high, the crossed corners down sit low
      if (!off) it.yy = this.ground + this.outer(-Math.PI / 2 - it.rot);
      it.mesh.position.set(it.x, it.yy, this.z + Math.sin(it.wob * 1.7) * 0.06);
      it.mesh.rotation.set(0, 0, it.rot);
      it.c.x = it.x; it.c.y = it.yy; it.c.z = this.z; this.col.refreshSphere(it.c);
      // the dry ticks of rolling, louder close by
      it.tick -= dt;
      if (it.tick <= 0) {
        it.tick = 0.16 + Math.random() * 0.06;
        const d = hero.pos.distanceTo(it.mesh.position);
        if (d < 22 && !off) this.audio?.rollTick?.(clamp(1 - d / 22, 0, 1) * 0.9, 0.4 + Math.random() * 0.3);
      }
    }
    let dirty = false;
    for (let i = 0; i < this.sh.length; i++) {
      const s = this.sh[i]; if (!s.live) continue;
      dirty = true; s.t += dt; s.v.y -= 26 * dt; s.p.addScaledVector(s.v, dt);
      const floor = this.col.floorBelow(s.p.x, s.p.y + 0.2, s.p.z, 2);
      if (s.p.y < floor + 0.06) { s.p.y = floor + 0.06; s.v.multiplyScalar(0.35); s.v.y = Math.abs(s.v.y) * 0.4; }
      if (s.t > 5) { s.live = false; _m.makeScale(0, 0, 0); this.shards.setMatrixAt(i, _m); continue; }
      const k = s.t > 4 ? 1 - (s.t - 4) : 1;
      _q.setFromEuler(_e.set(s.r.x * s.t, s.r.y * s.t, s.r.z * s.t));
      _m.compose(s.p, _q, _s.set(s.s * k, s.s * 0.5 * k, s.s * 0.8 * k));
      this.shards.setMatrixAt(i, _m);
    }
    if (dirty) this.shards.instanceMatrix.needsUpdate = true;
  }
}

export function buildFortress(scene, K, audio) {
  const col = new Colliders(() => -3.0);
  const S = { id: 'fortress', scene, colliders: col, zones: [], supports: [], tube: null };
  const SS = addSeaSky(scene, K); S.skyMat = SS.skyMat;
  buildHeaps(scene, K, { seed: 7, cx0: 0, cz0: 8, turn: 0.55 });
  const fx = new FX(scene, K, audio); S.fx = fx;

  const stack = (o) => {
    const cooked = !!o.cooked;
    const g = lasagnaStack({ w: o.w, d: o.d, y0: o.y0, y1: o.y1, seed: o.seed, lh: o.lh ?? (cooked ? 0.24 : 0.27), rc: o.rc ?? (cooked ? 0.7 : 0.3),
      bulgeK: o.bulgeK ?? (cooked ? 1 : 0.45), rufK: o.rufK ?? (cooked ? 1 : 1.25), driftK: o.driftK ?? (cooked ? 1 : 1.15), verde: o.verde ?? 0, bands: o.bands, bandColor: cooked ? null : WHEAT, tint: o.tint ?? null });
    const m = new THREE.Mesh(g, cooked ? K.sheet : K.dryStack);
    m.position.set(o.x, 0, o.z); m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    const c = col.add({ type: 'box', id: o.id, x: o.x, y: (o.y0 + o.y1) / 2, z: o.z, hx: o.w / 2, hy: (o.y1 - o.y0) / 2, hz: o.d / 2,
      sticky: cooked, surface: cooked ? 'cooked' : 'dry', safe: o.safe ?? true });
    return c;
  };
  const WHEAT = new THREE.Color(0.8, 0.6, 0.43);
  const amber = new THREE.Color(1.0, 0.97, 0.9), deep = new THREE.Color(0.93, 0.84, 0.7);
  const dryBands = (L) => (L % 9) === 4;

  // ---------------------------------------------------------------- the ground plan
  stack({ id: 'landing', x: 0, z: 42, w: 14, d: 16, y0: -1.4, y1: FLOOR, cooked: true, bands: (L) => (L % 8) < 1, seed: 21 });
  stack({ id: 'floor', x: 0, z: 11, w: 50, d: 46, y0: -1.4, y1: FLOOR, seed: 22, tint: deep });
  stack({ id: 'southW', x: -14.3, z: 28.5, w: 23.4, d: 3, y0: 1.9, y1: 10, seed: 23, tint: amber, bands: dryBands });
  stack({ id: 'southE', x: 14.3, z: 28.5, w: 23.4, d: 3, y0: 1.9, y1: 10, seed: 24, tint: amber, bands: dryBands });
  stack({ id: 'west', x: -24.5, z: 7.5, w: 3, d: 39, y0: 1.9, y1: 10, seed: 25, tint: amber, bands: dryBands });
  stack({ id: 'east', x: 24.5, z: 7.5, w: 3, d: 39, y0: 1.9, y1: 10, seed: 26, tint: amber, bands: dryBands });
  stack({ id: 'north', x: -6, z: -13.5, w: 40, d: 3, y0: 1.9, y1: 10, seed: 27, tint: amber, bands: dryBands });
  stack({ id: 'inner', x: 0, z: 10, w: 46, d: 4, y0: 1.9, y1: 6.2, seed: 28, tint: amber });
  stack({ id: 'keep', x: 17, z: -2, w: 12, d: 20, y0: 1.9, y1: 20, seed: 29, tint: amber, bands: dryBands });
  stack({ id: 'ledge', x: 20.85, z: 9.9, w: 3.5, d: 3.8, y0: 10.8, y1: 11.3, cooked: true, seed: 30, rc: 0.3, safe: false });

  // dry lasagna paving on everything you walk on, laid like flagstones
  const SW = 2.6, SL = 5.2;
  const pave = Shapes.lasagnaRiccia({ width: SW, length: SL, thickness: 0.05, ruffleAmp: 0.05, ruffleWaves: 8, ruffleWidth: 0.2 });
  const blocks = [[-23.2, 23.2, 7.8, 12.2], [10.8, 23.2, -12.2, 8.2], [-26, -2.6, 26.8, 30.2], [2.6, 26, 26.8, 30.2], [-26, -22.8, -15, 27], [22.8, 26, -15, 27], [-26, 14, -15.2, -11.8]];
  const gateC = { x: 0, z: 28.5, r: 3.0 };
  const hits = (cx, cz, hw, hl) => {
    for (const [x0, x1, z0, z1] of blocks) if (cx + hw > x0 && cx - hw < x1 && cz + hl > z0 && cz - hl < z1) return true;
    const dx = Math.max(Math.abs(cx - gateC.x) - hw, 0), dz = Math.max(Math.abs(cz - gateC.z) - hl, 0);
    return Math.hypot(dx, dz) < gateC.r;
  };
  const slabs = [];
  const prnd = mulberry32(31);
  // alongX: the sheet runs along x; w: scale across
  const paveRect = (x0, x1, z0, z1, y, alongX, w = 1, check = true) => {
    const ax = alongX ? SL : SW * w, az = alongX ? SW * w : SL;
    const nx = Math.max(1, Math.round((x1 - x0) / (ax + 0.12))), nz = Math.max(1, Math.round((z1 - z0) / (az + 0.12)));
    const sx = (x1 - x0) / nx, sz = (z1 - z0) / nz;
    for (let i = 0; i < nz; i++) for (let j = 0; j < nx; j++) {
      const shift = alongX ? ((i % 2) * 0.5 - 0.25) * sx * 0.5 : 0, shiftZ = alongX ? 0 : ((j % 2) * 0.5 - 0.25) * sz * 0.5;
      const cx = x0 + (j + 0.5) * sx + shift + (prnd() - 0.5) * 0.12, cz = z0 + (i + 0.5) * sz + shiftZ + (prnd() - 0.5) * 0.12;
      if (cx - ax / 2 < x0 - 0.3 || cx + ax / 2 > x1 + 0.3 || cz - az / 2 < z0 - 0.3 || cz + az / 2 > z1 + 0.3) continue;
      if (check && hits(cx, cz, ax / 2 - 0.15, az / 2 - 0.15)) continue;
      slabs.push([cx, y, cz, (alongX ? Math.PI / 2 : 0) + (prnd() - 0.5) * 0.06, w]);
    }
  };
  paveRect(-24.8, 24.8, 30.2, 34, FLOOR, true);            // outside the gate
  paveRect(-23, 23, 12.2, 26.8, FLOOR, false);             // the courtyard
  paveRect(-23, 10.8, -11.8, 7.8, FLOOR, false);           // the north yard
  paveRect(-22.8, 22.8, 8.5, 11.3, 6.2, true, 1, false);   // the rampart (merlons sit on the south edge)
  paveRect(11.2, 22.8, -11.8, 7.8, 20, false, 1, false);   // the keep top
  paveRect(-25.8, -2.8, 27.6, 29.4, 10, true, 0.7, false); // outer wall tops
  paveRect(2.8, 25.8, 27.6, 29.4, 10, true, 0.7, false);
  paveRect(-25.6, -23.4, -11.6, 26.6, 10, false, 0.7, false);
  paveRect(23.4, 25.6, -11.6, 26.6, 10, false, 0.7, false);
  paveRect(-25.6, 10.6, -14.4, -12.6, 10, true, 0.7, false);
  const paving = new THREE.InstancedMesh(pave, K.drySheet, slabs.length);
  const pc = new THREE.Color();
  slabs.forEach(([x, y, z, a, w], i) => {
    _m.compose(_p.set(x, y + 0.03 + (i % 7) * 0.004, z), _q.setFromEuler(_e.set(0, a, 0)), _s.set(w, 1, 1)); paving.setMatrixAt(i, _m);
    const v = 0.9 + prnd() * 0.14; paving.setColorAt(i, pc.setRGB(v, v * (0.97 + prnd() * 0.04), v * (0.9 + prnd() * 0.1)));
  });
  paving.receiveShadow = true; scene.add(paving);

  // ---------------------------------------------------------------- the gatehouse: a dry rigatoni you walk through
  const gate = { x: 0, z: 28.5, r0: 2.3, r1: 2.9, y0: FLOOR - 0.05, h: 9 };
  const doors = [{ angle: Math.PI / 2, halfWidth: 0.45, height: 2.9 }, { angle: -Math.PI / 2, halfWidth: 0.45, height: 2.9 }];
  const gm = new THREE.Mesh(Shapes.rigatoniTower({ innerRadius: gate.r0, outerRadius: gate.r1, height: gate.h, ridges: 34, notches: doors }), K.dryBig);
  gm.position.set(gate.x, gate.y0, gate.z); gm.castShadow = true; gm.receiveShadow = true; scene.add(gm);
  col.add({ type: 'tube', x: gate.x, z: gate.z, r0: gate.r0, r1: gate.r1, y0: gate.y0, y1: gate.y0 + gate.h, notches: doors.map(d => ({ angle: d.angle, half: d.halfWidth, h: d.height })), sticky: false, surface: 'dry', safe: true });

  // ---------------------------------------------------------------- cooked banners: the only grip on the dry walls
  const banner = (x, top, z, drop, face, seed, collide = true) => {
    // a fat fold so it hangs clear of the ruffled layers behind it
    const g = Shapes.drapedSheet({ width: 2.6, drop, flap: 0.7, fold: 0.32, seed });
    const m = new THREE.Mesh(g, K.banner);
    m.position.set(x, top + 0.07, z); m.rotation.y = face > 0 ? 0 : Math.PI;
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
    if (collide) col.add({ type: 'box', x, y: top - drop / 2, z: z + face * 0.33, hx: 1.3, hy: drop / 2, hz: 0.05, sticky: true, surface: 'cooked', safe: false });
  };
  banner(0, 6.2, 12.0, 3.3, 1, 41);          // up the inner wall from the courtyard
  banner(-10, 6.2, 8.0, 3.3, -1, 42);        // and back up from the north yard
  banner(-12, 10, 30.0, 3.4, 1, 43, false);  // on the outer wall, out of reach
  banner(12, 10, 30.0, 3.4, 1, 44, false);

  // ---------------------------------------------------------------- penne battlements
  const penneG = Shapes.penne({ radius: 0.33, length: 1.5, wall: 0.07, ridges: 14 });
  const merlons = [];
  for (let x = -21; x <= 21; x += 2.4) { if (Math.abs(x) < 2.2 || x > 14) continue; merlons.push([x, 6.2, 11.55, true]); }
  for (let x = -22; x <= 22; x += 2.6) { if (Math.abs(x) < 3.4) continue; merlons.push([x, 10, 29.6, false]); merlons.push([x, 10, -14.6, false]); }
  for (let z = -11; z <= 27; z += 2.6) { merlons.push([-25.6, 10, z, false]); merlons.push([25.6, 10, z, false]); }
  const merlonIM = new THREE.InstancedMesh(penneG, K.dryBig, merlons.length);
  merlons.forEach(([x, y, z, c], i) => {
    _m.compose(_p.set(x, y + 0.72, z), _q.setFromEuler(_e.set(0, i * 0.7, Math.PI / 2)), _s.set(1, 1, 1)); merlonIM.setMatrixAt(i, _m);
    if (c) col.add({ type: 'cyl', x, z, r: 0.34, y0: y, y1: y + 1.45, surface: 'dry', sticky: false });
  });
  merlonIM.castShadow = true; merlonIM.receiveShadow = true; scene.add(merlonIM);

  // ---------------------------------------------------------------- rolling tortellini on the rampart
  const tort = new Tortellini(scene, K, col, audio, { from: 22.4, to: -23.2, y: 6.2 + 0.6, z: 10.0 });
  S.tort = tort;

  // ---------------------------------------------------------------- the peg stair: dry bundles that snap
  const pegs = [];
  [[12.0, 7.55], [14.8, 8.8], [17.6, 10.05]].forEach(([x, y], i) => {
    pegs.push(new Plank(scene, K, col, fx, audio, { x, y, z: 8.65, len: 1.3, rods: 15, rot: Math.PI / 2, crack: 0.25, brk: 0.85, seed: 70 + i, regrow: 2.2, cantilever: true }));
  });
  const spring = new Spring(scene, K.tomato, col, audio, { x: 21.2, y: 10.75, z: 9.6, power: 24.5, wide: 1.35, keep: 0.1 });

  // ---------------------------------------------------------------- the drying rack on the keep
  const rackX = 18, top = 20;
  const postG = Shapes.rodBundle({ count: 22, length: 1, rodRadius: 0.05, bundleRadius: 0.4, twist: 0.3, flareBottom: 0.5, flareTop: 0.25, seed: 50 });
  const posts = [[14.3, -3.5, 33], [21.7, -3.5, 33], [14.3, -0.5, 28.6], [21.7, -0.5, 28.6]];
  const postIM = new THREE.InstancedMesh(postG, K.dryShade, posts.length);
  posts.forEach(([x, z, y1], i) => {
    _m.compose(_p.set(x, top - 0.1, z), _q.identity(), _s.set(1, y1 - top + 0.1, 1)); postIM.setMatrixAt(i, _m);
    col.add({ type: 'cyl', x, z, r: 0.42, y0: top, y1, surface: 'dry', sticky: false });
  });
  postIM.castShadow = true; postIM.receiveShadow = true; scene.add(postIM);
  const barGeo = (() => {
    const geos = [], shades = [], rnd = mulberry32(51);
    for (let i = 0; i < 10; i++) {
      const g = rodGeometry(7.7 + (rnd() - 0.5) * 0.3, 0.085, 10, 6);
      g.translate((rnd() - 0.5) * 0.1, -0.13 + (i % 2) * 0.17, -0.62 + Math.floor(i / 2) * 0.31);
      geos.push(g); shades.push(rnd());
    }
    return mergeWithShade(geos, shades);
  })();
  const bars = [[24, -3.5], [28, -0.5], [32, -3.5]];
  for (const [y, z] of bars) {
    const m = new THREE.Mesh(barGeo, K.dryShade); m.position.set(rackX, y, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    col.add({ type: 'box', x: rackX, y, z, hx: 3.85, hy: 0.25, hz: 0.72, surface: 'dry', sticky: false, safe: false });
  }
  stack({ id: 'perch', x: rackX, z: -3.5, w: 3.2, d: 2.2, y0: 32.2, y1: 32.65, seed: 52, rc: 0.25, tint: amber, safe: false });
  // the hanging sheets (cooked: they hold you)
  const sheet = (x, foldY, faceZ, drop, face, seed) => {
    const g = Shapes.drapedSheet({ width: 3.0, drop, flap: 0.55, ruffle: 0.06, seed });
    const m = new THREE.Mesh(g, K.banner);
    m.position.set(x, foldY + 0.004, faceZ - face * 0.12); m.rotation.y = face > 0 ? 0 : Math.PI;
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
    col.add({ type: 'box', x, y: foldY - drop / 2, z: faceZ + face * 0.04, hx: 1.5, hy: drop / 2, hz: 0.05, sticky: true, surface: 'cooked', safe: false });
  };
  sheet(rackX, 24.25, -2.78, 3.85, 1, 61);  // A: from the keep top up to bar 1
  sheet(rackX, 28.25, -1.22, 3.65, -1, 62); // B: from bar 1 across to bar 2
  sheet(rackX, 32.65, -2.4, 4.05, 1, 63);   // C: from bar 2 up to the perch

  // the star in its nest on the perch
  const nest = new THREE.Mesh(Shapes.nido({ radius: 1.0, height: 0.5, ribbons: 22, ribbonWidth: 0.11, ribbonThickness: 0.024, seed: 64 }), K.nest);
  nest.position.set(rackX, 32.63, -3.5); nest.castShadow = true; nest.receiveShadow = true; scene.add(nest);
  const star = new THREE.Mesh(Shapes.stellina({ outerRadius: 1.0, innerRadius: 0.53, thickness: 0.34, points: 5, holeRadius: 0.11 }), K.star);
  star.position.set(rackX, 33.85, -3.5); star.rotation.y = Math.PI / 2; star.castShadow = true; star.receiveShadow = true; scene.add(star);
  S.star = { mesh: star, home: star.position.clone(), taken: false };

  // ---------------------------------------------------------------- living things on the landing; rubble in the yard
  grassOnTops(scene, K, [{ x: 0, z: 42, w: 14, d: 16, y: FLOOR, density: 0.6 }], 81);
  addFlowers(scene, K, [[-4, 44.5, FLOOR, 1.8], [4.5, 47, FLOOR, 1.4]], 82);
  addWillow(scene, K, col, -5, FLOOR, 47.5, { seed: 83 });
  addWillow(scene, K, col, 5.2, FLOOR, 37.5, { seed: 84, scale: 0.85 });
  const flies = addButterflies(scene, K, col, [[-4, 3.2, 44], [4, 3.1, 46], [rackX, 34.5, -3]], 10, 85);
  const snail = new Snail(scene, K, col, audio, { x: 2.5, y: 4, z: 41.5, r: 3, start: 1 });
  const rub = mulberry32(86);
  const rubble = new THREE.InstancedMesh(rodGeometry(1, 0.072, 8, 1), K.dry, 40);
  for (let i = 0; i < 40; i++) {
    const nearWall = rub() < 0.5;
    const x = nearWall ? -22.5 + rub() * 2 : -20 + rub() * 30, z = nearWall ? -10 + rub() * 36 : 14 + rub() * 12;
    _m.compose(_p.set(x, FLOOR + 0.1, z), _q.setFromEuler(_e.set(0, rub() * TAU, (rub() - 0.5) * 0.3)), _s.set(0.4 + rub() * 1.6, 1, 1));
    rubble.setMatrixAt(i, _m);
  }
  rubble.castShadow = true; scene.add(rubble);

  // ---------------------------------------------------------------- rotelle along the way
  const R = 0.36;
  const spots = [
    [0, FLOOR + R, 40], [-2, FLOOR + R, 36], [2, FLOOR + R, 32.6], [0, FLOOR + R, 28.5],
    [0, FLOOR + R, 22], [-6, FLOOR + R, 19], [6, FLOOR + R, 19], [0, FLOOR + R, 16],
    [0.65, 3.8, 12.18, [0, 0, 1]], [-0.65, 5.1, 12.18, [0, 0, 1]],
    [4, 6.2 + R, 9.4], [8, 6.2 + R, 9.4], [12, 6.2 + R, 9.4],
    [12.0, 7.72 + R, 8.65], [14.8, 8.97 + R, 8.65], [17.6, 10.22 + R, 8.65], [19.6, 11.3 + R, 8.75],
    [18, top + R, 5], [15.5, top + R, 2], [20.5, top + R, 2],
    [18.7, 22.0, -2.78, [0, 0, 1]], [17.3, 26.2, -1.22, [0, 0, -1]], [18.7, 30.4, -2.28, [0, 0, 1]],
    [-10, FLOOR + R, -4], [-16, FLOOR + R, 2],
  ];
  const pickups = new Pickups(scene, K, audio, spots);
  S.pickups = pickups;

  // ---------------------------------------------------------------- camera hints
  S.zones.push({ id: 'pegs', x0: 10, x1: 24, z0: 7.4, z1: 12.5, y0: 6.0, y1: 16, yaw: 0, pitch: 0.12, dist: 9.5 });
  S.zones.push({ id: 'rack', x0: 13, x1: 23, z0: -5.2, z1: 1.6, y0: 20.6, y1: 37, yaw: Math.PI / 2, pitch: 0.1, dist: 11 });

  S.spawn = new THREE.Vector3(0, FLOOR + 0.46, 46);
  S.facing = Math.PI;
  const st = S.star.home;
  S.intro = {
    len: 6.6,
    fly: new THREE.CatmullRomCurve3([st.clone().add(new THREE.Vector3(3.6, 0.6, 3.4)), new THREE.Vector3(27, 29, 8), new THREE.Vector3(9, 15, 19),
      new THREE.Vector3(0, 11, 24), new THREE.Vector3(0, 8, 38), new THREE.Vector3(0, 5.6, 53.5)], false, 'centripetal'),
    look: new THREE.CatmullRomCurve3([st.clone(), st.clone().add(new THREE.Vector3(0, -2, 0)), new THREE.Vector3(19, 13, 9),
      new THREE.Vector3(0, 6, 12), new THREE.Vector3(0, 3.5, 30), new THREE.Vector3(0, 2.6, 40)], false, 'centripetal'),
  };

  const heroNear = (hero, x0, x1, z0, z1, y0) => hero.pos.x > x0 && hero.pos.x < x1 && hero.pos.z > z0 && hero.pos.z < z1 && hero.pos.y > y0;
  S.update = (dt, time, hero) => {
    fx.update(dt, col);
    tort.update(dt, hero);
    for (const p of pegs) p.update(dt, Math.abs(hero.pos.x - p.pos.x) < 1.7 && Math.abs(hero.pos.y - p.pos.y) < 1.0 && hero.pos.z < 9.8);
    spring.update(dt);
    snail.update(dt, null);
    pickups.update(dt, time, hero);
    flies.update(dt, time, hero);
    if (!S.star.taken) { star.rotation.y = Math.PI / 2 + Math.sin(time * 0.45) * 0.35; star.rotation.z = Math.sin(time * 0.8) * 0.04; }
  };
  S.fixed = () => {};
  S.resetBreakables = () => { for (const p of pegs) p.reset(); };
  S.pegs = pegs;
  S.reset = () => { S.resetBreakables(); tort.reset(); pickups.reset(); S.star.taken = false; star.position.copy(S.star.home); };
  return S;
}
