// The highway in real time, on top of the baked set: the two cars nose to nose, the live lane's traffic, the
// boulders, the warning barriers, the stopped cars that come through the K-rail, fire, flares, the message board,
// the light on the road (headlights, strobes, the lighter, the searchlight), the sky seen in the wet road.
// Almost everything here is a function of song time (update(t) puts it where it is at t), so a rewind to any section
// is exact; what play decides (what broke, where her car ended up) is snapshotted at each section and restored.
import * as THREE from 'three';
import { makeCar, mats, lacquer, MAT, Glows, flare, flareRegistry, flushFlares, Billboards, glowTexture, skyDome, beyond, decal, decalTex, Fires, clamp01, smooth, lerp, hash } from './kit.js';

export const FLOOR = { minX: -10.5, maxX: 10.9, minZ: -3.3, maxZ: 6.6 };
// the message board's dot font: 5 x 7, rows as 5-bit numbers
const FONT = (() => { const G = { A: '0e11111f111111', B: '1e11111e11111e', C: '0e11101010110e', D: '1e11111111111e', E: '1f10101e10101f', F: '1f10101e101010', G: '0e1110171111 0f', H: '1111111f111111', I: '0e04040404040e', J: '07020202021 20c', K: '11121418141211', L: '1010101010101f', M: '111b1515111111', N: '1111191513 1111', O: '0e11111111110e', P: '1e11111e101010', R: '1e11111e141211', S: '0f10100e01011e', T: '1f040404040404', U: '1111111111110e', V: '11111111110a04', W: '11111115151 50a', Y: '11110a04040404', "'": '04040800000000', ' ': '00000000000000' }; const out = {}; for (const [k, v] of Object.entries(G)) { const h = v.replace(/ /g, ''); out[k] = Array.from({ length: 7 }, (_, i) => parseInt(h.slice(i * 2, i * 2 + 2), 16)); } return out; })();
export const LANE_Z = -5.45, KRAIL_Z = -3.6, GUARD_Z = 6.8;
export const BOULDERS = [[-5.0, -1.4, 0.9], [2.4, -2.0, 0.8], [-4.6, 5.0, 0.8], [2.9, 5.2, 0.7]];
export const SLOTS = [[-2.6, -3.3, 1.5], [1.4, 1.6, 6.6], [-6.0, 1.6, 6.6], [4.4, -3.3, 0.3]];   // W1..W4: x, z0, z1
export const STOPPED_X = [-9.2, -4.6, 0.0, 4.6, 9.2];
export const YOU_CAR = { x: 7.4, z: 1.4, yaw: Math.PI, crumple: 0 };
const yawFor = (fx, fz) => Math.atan2(-fz, fx);          // a car's yaw so its nose (+x) points along (fx, fz)
const C = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
const WHITE = C('#eaf2ff'), PINKW = C('#ffe2ec'), RED = C('#ff2a3a'), BLUE = C('#2f55ff'), FLAME = C('#ffb35a'), FIRE = C('#ff7a2a'), AMBER = C('#ffb000'), SEARCH = C('#f4f8ff');

export class Road {
  constructor(f, arena, B) {
    this.f = f; this.arena = arena; this.B = B;
    const sc = this.scene = f.scene;
    mats();
    this.flareList = []; flareRegistry(this.flareList); this.flareBB = new Billboards(sc, glowTexture(), 160);
    this.group = new THREE.Group(); this.group.name = 'road'; sc.add(this.group);
    this.glows = new Glows(sc, 160);
    this.fires = new Fires(sc, 72);
    this.sky = skyDome(sc);
    this.far = beyond(sc, this.sky);
    this.t = 0;
    this.surfaces = [];          // crash surfaces and colliders: {type, shape:'box'|'circle', x, z, hx, hz, rot, r, on() }
    this._times();
    this._cars(); this._props(); this._boulders(); this._traffic(); this._barriers(); this._board(); this._decals(); this._petals();
    this.state = this.canonical();
    this.lighter = null;
  }

  // ------------------------------------------------------------------ the song's set times (design bars -> seconds)
  _times() {
    const B = this.B;
    this.T = {
      youLights: 0.126, herLight: B(1, 1), rumble: B(7, 2), slide: B(9, 1), lock8: B(8, 3), stopDip: B(14, 2), slam: B(15, 1),
      die: [B(25, 4), B(26, 1), B(26, 2), B(26, 3)], headsOff: B(26, 4), dark: B(27, 1), back: [B(30, 1), B(30, 3), B(31, 1), B(31, 3)], headsOn: B(32, 1),
      pre1: B(34, 1), engine: B(37, 4), carGo: B(38, 3), carCrash: B(39, 1), verse2: B(53, 1), fire: B(60, 2), fireOut: B(61, 4), pre2: B(62, 1),
      windows: B(65, 1), up: [B(66, 1), B(67, 1), B(68, 1), B(68, 3)], candles: B(68, 4), count: B(69, 1), down: [B(69, 1), B(69, 2), B(69, 3), B(69, 4)],
      stopped: B(70, 4), redden: B(70, 1), bridge: B(71, 1), pin: B(75, 3), build: B(76, 1), intrude: [B(77, 2), B(77, 4), B(78, 2), B(78, 4)],
      drop: B(79, 1), blast: B(80, 1), dawn: B(94, 1), goodbye: B(97, 1), lampsOut: [B(99, 1), B(101, 1), B(103, 1)], finish: B(106, 1), end: B(107, 1),
    };
    this.T.rocks = [B(46, 1), B(46, 3), B(47, 1)];
  }

  // ------------------------------------------------------------------ the two cars
  _cars() {
    // YOU's car: an ivory long-hood GT, copper trim, nose at x 5.1 facing -x, driver's door open on the +z side
    const ivory = lacquer(0xefe6d6, { rough: 0.22 });
    const you = this.you = makeCar('gt', { len: 4.7, wid: 1.9, hei: 1.3, body: ivory, trim: MAT.copper });
    you.root.position.set(7.4, 0, 1.4); you.root.rotation.y = Math.PI; this.group.add(you.root);
    // the open door: a panel hinged at (8.6, 2.35), its edge out at about (7.6, 3.4)
    const door = new THREE.Group(); door.position.set(-(8.6 - 7.4), 0, -(2.35 - 1.4));     // in the car's frame (turned pi: x and z flip)
    const dp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.62, 0.06), ivory); dp.position.set(0.7, 0.62, 0); dp.castShadow = true; door.add(dp);
    const dg = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.36, 0.03), MAT.glass); dg.position.set(0.66, 1.08, 0); door.add(dg);
    door.rotation.y = 0.81; you.root.add(door);
    you.door = door; you.doorGlass = dg;
    // her car: a cherry-pink porcelain fastback, gold-leaf chrome, black-mirror windows, ONE headlight lit
    const cherry = lacquer(0xe8336d, { rough: 0.1, coatRough: 0.03 });
    const her = this.her = makeCar('fastback', { len: 4.6, wid: 1.9, hei: 1.3, body: cherry, trim: MAT.gold, lights: 'one' });
    her.root.position.set(-7.6, 0, 1.4); her.root.rotation.y = 0; this.group.add(her.root);
    // lens glows (mirrored in the wet road)
    you.flareL = flare(WHITE.clone().multiplyScalar(0.8), 0.6); you.flareR = flare(WHITE.clone().multiplyScalar(0.8), 0.6);
    you.parts.lensL.add(you.flareL); you.parts.lensR.add(you.flareR);
    her.flareL = flare(PINKW.clone().multiplyScalar(0.9), 0.65); her.parts.lensL.add(her.flareL);
    // her car's eventual wreck pose (where it stopped), crumple. (lit: the wreck's one light is back on; blaze: how
    // bright; y, pitch, roll: its body rocking on its springs. Her last bars use these: death.js.)
    this.herCar = { mode: 'parked', x: -7.6, z: 1.4, yaw: 0, crumple: 0 };
    // YOU's car sits where YOU left it all song; her last bars shunt it (death.js)
    this.youCar = { ...YOU_CAR };
    you.root.rotation.order = 'YZX'; her.root.rotation.order = 'YZX';
    this.surfaces.push(this.youSurf = { type: 'car', name: 'you', shape: 'box', x: 7.4, z: 1.4, hx: 2.35, hz: 0.95, rot: 0, on: () => true, hits: 0 });
    this.surfaces.push(this.herSurf = { type: 'car', name: 'her', shape: 'box', x: -7.6, z: 1.4, hx: 2.3, hz: 0.95, rot: 0, on: () => this.herCar.mode !== 'driving', hits: 0 });
    // the message board's trailer (baked into the set; YOU's floor test already has it): she can't walk through it
    // either, and a charge that ends in it is a crash like any other
    this.surfaces.push({ type: 'board', name: 'board', shape: 'box', x: 9.4, z: 5.6, hx: 0.75, hz: 1.25, rot: 0, on: () => true, hits: 0 });
    // breakables on YOU's car, in the order she takes them (pre 1)
    this.youBreak = [
      { name: 'headL', obj: you.parts.lensL, at: [5.08, 0.95] }, { name: 'headR', obj: you.parts.lensR, at: [5.08, 1.85] },
      { name: 'windscreen', obj: null, at: [6.6, 1.4] }, { name: 'mirror', obj: null, at: [6.9, 2.4] },     // (the cabin stays: update() crazes it)
      { name: 'doorGlass', obj: dg, at: [8.1, 3.0] },
    ];
  }

  // ------------------------------------------------------------------ props: the suitcase, cones, sawhorses, flares, the cross's candles, the pin
  _props() {
    const g = this.group;
    // YOU's suitcase, half open, a copper silk scarf spilling out
    const sc = this.suitcase = new THREE.Group(); sc.position.set(9.0, 0, 3.9); sc.rotation.y = 0.4;
    const shell = lacquer(0xf3ecdf, { rough: 0.25 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.5), shell); base.position.y = 0.06; base.castShadow = true; sc.add(base);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.5), shell); lid.position.set(0, 0.2, -0.32); lid.rotation.x = -1.1; lid.castShadow = true; sc.add(lid);
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.7), new THREE.MeshPhysicalMaterial({ color: 0xc87a3e, roughness: 0.3, sheen: 1, sheenColor: new THREE.Color(0xffc080) })); scarf.position.set(0.15, 0.03, 0.45); scarf.rotation.set(0, 0.5, 0.1); sc.add(scarf);
    sc.lid = lid; g.add(sc);
    // cones along lane 1
    const coneM = new THREE.MeshStandardMaterial({ color: 0xff5a14, roughness: 0.5 }), band = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 });
    this.cones = [-8, -4, 0, 4, 8].map((x) => {
      const c = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.62, 16), coneM); body.position.y = 0.36; body.castShadow = true; c.add(body);
      const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.125, 0.09, 16), band); b2.position.y = 0.4; c.add(b2);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.4), coneM); foot.position.y = 0.02; c.add(foot);
      c.position.set(x, 0, -2.9); g.add(c);
      return { obj: c, home: [x, -2.9], st: 'up', vx: 0, vy: 0, vz: 0, spin: 0 };
    });
    // sawhorses at the roadblock
    const stripe = decalTex((x, s) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f0eee8' : '#e0661c'; x.beginPath(); x.moveTo(i * s / 4 - s, s); x.lineTo(i * s / 4 - s / 2, 0); x.lineTo(i * s / 4 - s / 4, 0); x.lineTo(i * s / 4 - s * 0.75, s); x.fill(); } }, 64);
    const boardM = new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.5 }), legM = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.6 });
    this.horses = [-1.8, 1.6, 5.0].map((z) => {
      const h = new THREE.Group();
      const bd = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 1.4), boardM); bd.position.y = 0.82; bd.castShadow = true; h.add(bd);
      for (const dz of [-0.55, 0.55]) for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), legM); l.position.set(0.12 * s, 0.48, dz); l.rotation.z = -0.22 * s; h.add(l); }
      h.position.set(10.45, 0, z); g.add(h);
      return { obj: h, home: [10.45, z], st: 'up', vx: 0, vy: 0, vz: 0, spin: 0 };
    });
    // road flares: a line in front of the roadblock, and the two edge lines lit in the countdown
    this.flares = [];
    const addFlare = (x, z, t0) => { const s = flare(C('#ff3020', 3.2), 0.55); s.position.set(x, 0.12, z); s.visible = false; g.add(s); this.flares.push({ s, x, z, t0 }); };
    for (let i = 0; i < 5; i++) addFlare(10.25 + (i % 2) * 0.25, -2.6 + i * 2.1, -1);
    for (let i = 0; i < 8; i++) { const k = this.B(69, 1) + i * (this.B(70, 4) - this.B(69, 1)) / 8; addFlare(-9.5 + i * 2.7, -3.05, k); addFlare(9.5 - i * 2.7, 6.35, k + 0.05); }
    // the cross's three candles (lit from "where")
    this.candles = [0, 1, 2].map((i) => { const s = flare(C('#ffb35a', 2.4), 0.32); s.position.set(-1.6 - 0.18 + i * 0.18, 0.12, 6.25); s.visible = false; g.add(s); return s; });
    // the pin: her grenade's gold pull ring, lying on the road from "pin" to the end
    const pin = this.pin = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 8, 24), MAT.gold); ring.rotation.x = Math.PI / 2; ring.position.y = 0.008; pin.add(ring);
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), MAT.gold); sp.rotation.z = Math.PI / 2; sp.position.set(0.06, 0.006, 0.01); pin.add(sp);
    const glint = flare(C('#ffd890', 2.0), 0.18); glint.position.y = 0.05; pin.add(glint); pin.glint = glint;
    pin.visible = false; g.add(pin);
    this.pinAt = { x: 0, z: 1.5 };
  }

  // ------------------------------------------------------------------ boulders: the hill comes down on "bury"
  _boulders() {
    const rockGeo = (r, seed) => {
      const g = new THREE.IcosahedronGeometry(r, 2); const p = g.attributes.position; const col = new Float32Array(p.count * 3); const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 0.78 + 0.32 * hash(Math.floor(v.x * 7 + seed) * 13 + Math.floor(v.y * 7) * 7 + Math.floor(v.z * 7) * 3); v.multiplyScalar(n); v.y *= 0.82; p.setXYZ(i, v.x, v.y, v.z); const fresh = hash(i * 0.37 + seed) > 0.8 ? 1 : 0; const c = fresh ? [0.25, 0.23, 0.22] : [0.04, 0.04, 0.045]; col.set(c, i * 3); }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
    };
    const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2, flatShading: true });
    this.rocks = BOULDERS.map(([x, z, r], i) => {
      const o = new THREE.Mesh(rockGeo(r, i * 3.1), m); o.castShadow = true; o.receiveShadow = true; o.visible = false; this.group.add(o);
      const s = { type: 'boulder', shape: 'circle', x, z, r: r * 0.92, on: () => o.visible && s.hits < 2, hits: 0, obj: o, i };
      this.surfaces.push(s);
      return { obj: o, x, z, r, s, from: [x + 2.5 - i * 1.2, -11.5 + i * 0.8], spin: new THREE.Vector3(hash(i) - 0.5, hash(i + 3) - 0.5, hash(i + 7) - 0.5).normalize() };
    });
    // the one that lands on YOU's spot (and shatters to gravel), and the three that roll across in chorus 2
    this.youRock = new THREE.Mesh(rockGeo(0.7, 9.9), m); this.youRock.visible = false; this.youRock.castShadow = true; this.group.add(this.youRock);
    this.youRockAt = { x: 0, z: 0 };
    this.rollers = [0, 1, 2].map((i) => { const o = new THREE.Mesh(rockGeo(0.95, 20 + i), m); o.visible = false; o.castShadow = true; this.group.add(o); return { obj: o, x: [-6, 3, 0][i] }; });
    // the dirt slump against the K-rail behind them
    const dirtT = decalTex((x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(58,46,36,0.95)'); g.addColorStop(0.6, 'rgba(48,38,30,0.75)'); g.addColorStop(1, 'rgba(40,32,26,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); for (let i = 0; i < 70; i++) { const k = 30 + Math.random() * 25; x.fillStyle = `rgba(${k},${k * 0.85},${k * 0.7},0.55)`; x.beginPath(); x.arc(s * 0.15 + Math.random() * s * 0.7, s * 0.15 + Math.random() * s * 0.7, 1 + Math.random() * 2.5, 0, 7); x.fill(); } });
    this.dirtTex = dirtT;
    this.slump = [-7, -1.5, 3.5].map((x, i) => { const d = decal(dirtT, 4.2 + i, 1.6); d.position.set(x, 0.01, -2.85); d.visible = false; this.group.add(d); return d; });
  }

  // ------------------------------------------------------------------ the live lane: a deterministic schedule (x is a function of t)
  _traffic() {
    const styles = ['sedan', 'hatch', 'sedan', 'van', 'hatch', 'sedan'];
    const paints = [0x1b1e24, 0x6e7378, 0xd9d6cf, 0x2a3b55, 0x5a1a22, 0x14161a, 0xb7b2a6, 0x3d4a3a];
    this.pool = [];
    for (let i = 0; i < 14; i++) {
      const car = makeCar(styles[i % styles.length], { len: 4.3 + (i % 3) * 0.2, wid: 1.8, hei: styles[i % styles.length] === 'van' ? 1.8 : 1.35, body: lacquer(paints[i % paints.length], { rough: 0.3 }) });
      car.root.visible = false; this.group.add(car.root);
      car.flareL = flare(WHITE.clone().multiplyScalar(0.55), 0.42); car.flareR = flare(WHITE.clone().multiplyScalar(0.55), 0.42);
      car.parts.lensL.add(car.flareL); car.parts.lensR.add(car.flareR);
      this.pool.push(car);
    }
    // the schedule: when each car is at x = +19, its speed. Density by section.
    const S = []; let t = -2; let k = 0;
    const T = this.T;
    while (t < 140) {
      let gap, v;
      if (t < T.slide) { gap = 2.8; v = 18; }
      else if (t < T.pre1) { gap = 1.4; v = 22; }
      else if (t < T.verse2) { gap = 0.75; v = 26; }
      else if (t < T.count - 3.5) { gap = 1.4; v = 22; }
      else if (t < T.blast) { t = T.blast + 0.3; continue; }
      else if (t < T.dawn) { gap = 0.55 + hash(k * 1.7) * 0.6; v = 28 + hash(k * 2.3) * 8; }
      else if (t < 138.2) { gap = 2.2 + hash(k) * 1.2; v = 24; }
      else break;
      S.push({ t0: t + hash(k * 0.91) * 0.25, v, m: k % 12 });
      t += gap; k++;
    }
    this.sched = S;
    // the five that stop and turn to watch (brake from 69.1, stopped by 70.4), four of them come through the K-rail
    this.stopped = STOPPED_X.map((xs, i) => {
      const car = makeCar(['sedan', 'hatch', 'sedan', 'van', 'sedan'][i], { len: 4.4, wid: 1.85, hei: i === 3 ? 1.8 : 1.35, body: lacquer([0x22262c, 0x8a8f94, 0x3a1018, 0xd6d2c8, 0x17191d][i], { rough: 0.3 }) });
      car.root.visible = false; this.group.add(car.root);
      car.flareL = flare(WHITE.clone().multiplyScalar(0.6), 0.45); car.flareR = flare(WHITE.clone().multiplyScalar(0.6), 0.45);
      car.parts.lensL.add(car.flareL); car.parts.lensR.add(car.flareR);
      const a = (xs > 0 ? -1 : xs < 0 ? 1 : 0) * 40 * Math.PI / 180;      // watching: facing +z, turned 40 deg toward the middle
      const s = { type: 'car', name: 'intruder' + i, shape: 'box', x: xs, z: -2.3, hx: 2.2, hz: 0.95, rot: Math.PI / 2, on: () => false, hits: 0 };
      this.surfaces.push(s);
      return { car, xs, watch: yawFor(Math.sin(a), Math.cos(a)), fx: Math.sin(a), fz: Math.cos(a), intr: [1, 3, -1, 2, 0][i], s };   // intr: index into T.intrude (-1: the one that drives away)
    });
  }

  // ------------------------------------------------------------------ roses: spilled from the truck's burst door, a few falling through the headlights
  _petals() {
    const N = this.nPetal = 420;
    const g = new THREE.PlaneGeometry(0.09, 0.07); g.translate(0, 0, 0);
    const m = new THREE.MeshStandardMaterial({ roughness: 0.45, side: THREE.DoubleSide, vertexColors: false });
    const im = this.petalMesh = new THREE.InstancedMesh(g, m, N); im.castShadow = false; im.receiveShadow = false; im.frustumCulled = false;
    const cols = [new THREE.Color('#e8336d'), new THREE.Color('#f7b6c8'), new THREE.Color('#9c1432')];
    this.petal = [];
    for (let i = 0; i < N; i++) {
      // a fan from the truck door at (-10.5, -2.6) out to x -3 across z -3.3 .. 2.5, thickest by the door
      const u = Math.pow(hash(i * 1.37), 1.7), v = hash(i * 2.91);
      const x = -10.3 + u * 7.4, z = -3.1 + v * (1.2 + u * 4.6);
      const air = i < 70;
      const p = { x, z, y: air ? 2 + hash(i * 5.1) * 7 : 0.012, hx: x, hz: z, vx: 0, vy: 0, vz: 0, rx: hash(i) * 6, ry: hash(i * 3) * 6, rz: 0, air, fall: air, seed: hash(i * 7.7) * 10 };
      if (air) { p.x = -6 + hash(i * 9.3) * 14; p.z = -3 + hash(i * 4.4) * 9; p.hx = p.x; p.hz = p.z; }
      this.petal.push(p);
      im.setColorAt(i, cols[i % 3]);
    }
    im.instanceColor.needsUpdate = true;
    this.group.add(im);
    this._pm = new THREE.Matrix4(); this._pq = new THREE.Quaternion(); this._pe = new THREE.Euler(); this._pv = new THREE.Vector3(); this._ps = new THREE.Vector3(1, 1, 1);
  }
  // something fast passed (x, z) going (dx, dz) at speed v: petals near it fly up and settle
  gust(x, z, dx, dz, v, r = 1.6) {
    for (const p of this.petal) {
      if (p.fall) continue;
      const d = Math.hypot(p.x - x, p.z - z); if (d > r) continue;
      const k = (1 - d / r) * Math.min(1, v / 14);
      p.fall = true; p.vx = dx * v * 0.25 * k + (hash(p.seed) - 0.5) * 2; p.vz = dz * v * 0.25 * k + (hash(p.seed + 1) - 0.5) * 2; p.vy = 1.5 + 3.5 * k;
    }
  }
  _petalsTick(dt, t) {
    const im = this.petalMesh, M = this._pm;
    for (let i = 0; i < this.petal.length; i++) {
      const p = this.petal[i];
      if (p.fall) {
        if (p.air && t < 0.05) { p.y = 2 + hash(i * 5.1) * 7; }
        p.vy = Math.max(-0.9, p.vy - 3.2 * dt); p.vx *= Math.exp(-dt * 1.5); p.vz *= Math.exp(-dt * 1.5);
        p.x += (p.vx + Math.sin(t * 1.3 + p.seed) * 0.35) * dt; p.z += (p.vz + Math.cos(t * 1.1 + p.seed) * 0.2) * dt; p.y += p.vy * dt;
        p.rx += dt * (2 + p.seed * 0.3); p.ry += dt * 1.7;
        if (p.y <= 0.012) { p.y = 0.012; p.fall = false; p.air = false; p.rx = Math.PI / 2; }
      }
      this._pe.set(p.fall ? p.rx : -Math.PI / 2, p.ry, 0); this._pq.setFromEuler(this._pe); this._pv.set(p.x, p.y, p.z);
      M.compose(this._pv, this._pq, this._ps); im.setMatrixAt(i, M);
    }
    im.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------------ the warning barriers (pre 2)
  _barriers() {
    const chev = decalTex((x, s) => { x.fillStyle = '#0b0b0b'; x.fillRect(0, 0, s, s); x.fillStyle = '#ffb000'; for (let i = -2; i < 6; i++) { x.beginPath(); x.moveTo(i * s / 4, 0); x.lineTo(i * s / 4 + s / 8, 0); x.lineTo(i * s / 4 + s / 8 + s / 4, s / 2); x.lineTo(i * s / 4 + s / 8, s); x.lineTo(i * s / 4, s); x.lineTo(i * s / 4 + s / 4, s / 2); x.fill(); } }, 128);
    chev.wrapS = THREE.RepeatWrapping;
    this.walls = SLOTS.map(([x, z0, z1], i) => {
      const len = z1 - z0;
      const t2 = chev.clone(); t2.needsUpdate = true; t2.repeat.set(len / 1.2, 1); t2.wrapS = THREE.RepeatWrapping;
      const m = new THREE.MeshStandardMaterial({ map: t2, roughness: 0.4, metalness: 0.3 });
      const o = new THREE.Group();
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.95, len - 0.1), [MAT.dark, MAT.dark, MAT.dark, MAT.dark, m, m]);
      // the chevrons face the camera (+z ... the long faces are +x/-x): use the side faces
      p.material = [m, m, MAT.dark, MAT.dark, MAT.dark, MAT.dark];
      p.position.y = 0.475; p.castShadow = true; o.add(p);
      const lamps = [];
      for (let k = 0; k < 3; k++) { const l = flare(C('#ffb000', 2.6), 0.4); l.position.set(0, 1.0, (k - 1) * (len / 3)); o.add(l); lamps.push(l); }
      o.position.set(x, -1.0, (z0 + z1) / 2); o.visible = false; this.group.add(o);
      const s = { type: 'barrier', shape: 'box', x, z: (z0 + z1) / 2, hx: 0.15, hz: len / 2, rot: 0, on: () => o.visible && o.position.y > -0.5, hits: 0, obj: o };
      this.surfaces.push(s);
      return { obj: o, lamps, s, x, z: (z0 + z1) / 2, len };
    });
  }

  // ------------------------------------------------------------------ the message board: amber dot matrix
  _board() {
    const W = 108, H = 54;
    const cv = document.createElement('canvas'); cv.width = W * 6; cv.height = H * 6;
    this.boardCv = cv; this.boardTex = new THREE.CanvasTexture(cv); this.boardTex.colorSpace = THREE.SRGBColorSpace;
    this.boardSrc = document.createElement('canvas'); this.boardSrc.width = W; this.boardSrc.height = H;
    const m = new THREE.MeshBasicMaterial({ map: this.boardTex, color: new THREE.Color(1.8, 1.8, 1.8) });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), m);
    const a = this.arena && this.arena.anchors && this.arena.anchors.board;
    const pos = a ? a.position : new THREE.Vector3(9.4, 2.0, 5.8);
    pl.position.set(pos.x, pos.y, pos.z + 0.09); pl.rotation.x = -25 * Math.PI / 180;
    this.group.add(pl); this.boardMesh = pl;
    this.page = null;
  }
  _drawPage(page) {
    if (this.page === page) return; this.page = page;
    this._pages = this._pages || new Map();
    if (this._pages.has(page)) { this.boardTex.image = this._pages.get(page); this.boardTex.needsUpdate = true; return; }
    const src = this.boardSrc, sx = src.getContext('2d', { willReadFrequently: true }), W = src.width, H = src.height;
    sx.clearRect(0, 0, W, H); sx.fillStyle = '#fff';
    if (page && page.startsWith('heart')) {
      const big = page === 'heart1', s = big ? 1.0 : 0.8;
      sx.save(); sx.translate(W / 2, H / 2 + 2); sx.scale(s, s); sx.beginPath(); sx.moveTo(0, 14); sx.bezierCurveTo(-26, -4, -12, -22, 0, -9); sx.bezierCurveTo(12, -22, 26, -4, 0, 14); sx.fill(); sx.restore();
    } else if (page === 'chevrons') {
      for (let i = -1; i < 6; i++) { sx.beginPath(); const x0 = i * 18 + 4; sx.moveTo(x0, 8); sx.lineTo(x0 + 8, 8); sx.lineTo(x0 + 18, 24); sx.lineTo(x0 + 8, 40); sx.lineTo(x0, 40); sx.lineTo(x0 + 10, 24); sx.fill(); }
    } else if (page) {
      const lines = page.split('/').map((l) => l.trim());
      const sc = lines.every((l) => l.length * 6 * 2 - 2 <= W) ? 2 : 1;
      const lh = 7 * sc + 4 * sc, y0 = Math.round((H - (lines.length * lh - 4 * sc)) / 2);
      lines.forEach((l, i) => { let x = Math.round((W - (l.length * 6 - 1) * sc) / 2); for (const ch of l) { const gl = FONT[ch] || FONT[' ']; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r] & (16 >> c)) sx.fillRect(x + c * sc, y0 + i * lh + r * sc, sc, sc); x += 6 * sc; } });
    }
    const d = sx.getImageData(0, 0, W, H).data;
    const cv = document.createElement('canvas'); cv.width = this.boardCv.width; cv.height = this.boardCv.height;
    const c = cv.getContext('2d'), k = cv.width / W;
    c.fillStyle = '#060402'; c.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const on = d[(y * W + x) * 4 + 3] > 110;
      c.fillStyle = on ? '#ffb020' : '#1a1206';
      c.beginPath(); c.arc(x * k + k / 2, y * k + k / 2, k * 0.38, 0, Math.PI * 2); c.fill();
    }
    this._pages.set(page, cv);
    this.boardTex.image = cv; this.boardTex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ decals: dirt spills, whiskey puddles, scorch, gouges, the crater
  _decals() {
    this.puddleTex = decalTex((x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(150,80,20,0.85)'); g.addColorStop(0.7, 'rgba(120,60,15,0.6)'); g.addColorStop(1, 'rgba(90,40,10,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(s / 2, s / 2, s / 2, s * 0.42, 0.3, 0, 7); x.fill(); });
    this.scorchTex = decalTex((x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(5,4,4,0.95)'); g.addColorStop(0.6, 'rgba(12,8,6,0.7)'); g.addColorStop(1, 'rgba(10,6,4,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); });
    this.gougeTex = decalTex((x, s) => { x.strokeStyle = 'rgba(210,200,185,0.9)'; x.lineWidth = 3; x.lineCap = 'round';
      // a heart, a tally
      x.beginPath(); x.moveTo(40, 80); x.bezierCurveTo(10, 55, 25, 25, 40, 45); x.bezierCurveTo(55, 25, 70, 55, 40, 80); x.stroke();
      for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(80 + i * 7, 35); x.lineTo(82 + i * 7, 85); x.stroke(); } x.beginPath(); x.moveTo(74, 75); x.lineTo(118, 42); x.stroke(); });
    this.marks = [];          // live decals made by play: {kind, x, z, obj}
  }
  addMark(kind, x, z, o = {}) {
    const tex = { dirt: this.dirtTex, puddle: this.puddleTex, scorch: this.scorchTex, crater: this.scorchTex }[kind];
    const r = o.r ?? (kind === 'dirt' ? 2.0 : kind === 'puddle' ? 1.2 : kind === 'crater' ? 1.6 : 1.0);
    this.lit = this.lit || [];
    const d = decal(tex, r * 2, r * 2, { opacity: kind === 'puddle' ? 0.9 : 0.85 });
    if (kind === 'puddle') { d.material = new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.05, clearcoat: 1, color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -2 }); }
    d.position.set(x, 0.009 + this.marks.length * 0.0002, z); d.rotation.z = o.rot ?? hash(x * 3.1 + z) * 6.28;
    this.group.add(d); if (kind !== 'puddle') this.lit.push(d.material);
    const m = { kind, x, z, r, obj: d, t: this.f.t };
    this.marks.push(m); return m;
  }
  clearMarks(keep = () => false) { for (let i = this.marks.length - 1; i >= 0; i--) { const m = this.marks[i]; if (!keep(m)) { this.group.remove(m.obj); m.obj.material.dispose(); m.obj.geometry.dispose(); this.marks.splice(i, 1); } } }
  // the gouges along a wall after the carve
  carveMarks(wall) {
    this.clearGouges();
    const z = wall === 'krail' ? -3.28 : 6.55;
    this.gouges = [];
    for (let i = 0; i < 7; i++) {
      const d = decal(this.gougeTex, 0.6, 0.6, { opacity: 0.55 });
      if (wall === 'krail') { d.rotation.set(-0.12, 0, 0); d.position.set(-9 + i * 3, 0.42, z + 0.04); }       // gouged into the K-rail's face
      else { d.rotation.set(0, Math.PI, 0); d.position.set(-9 + i * 3, 0.5, z); }
      this.group.add(d); this.gouges.push(d);
    }
    this.state.carve = wall;
  }
  clearGouges() { if (this.gouges) for (const d of this.gouges) this.group.remove(d); this.gouges = null; }

  // ------------------------------------------------------------------ collision for YOU (chained after the arena's own)
  resolve(x, z, r) {
    for (const s of this.surfaces) {
      if (!s.on()) continue;
      if (s.shape === 'circle') {
        const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz), m = s.r + r;
        if (d < m && d > 1e-5) { x = s.x + dx / d * m; z = s.z + dz / d * m; }
      } else {
        const c = Math.cos(s.rot), sn = Math.sin(s.rot);
        let lx = (x - s.x) * c - (z - s.z) * sn, lz = (x - s.x) * sn + (z - s.z) * c;
        const hx = s.hx + r, hz = s.hz + r;
        if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
          if (hx - Math.abs(lx) < hz - Math.abs(lz)) lx = Math.sign(lx || 1) * hx; else lz = Math.sign(lz || 1) * hz;
          x = s.x + lx * c + lz * sn; z = s.z - lx * sn + lz * c;
        }
      }
    }
    return { x, z };
  }
  // the first crash surface along a ray from (x, z) in unit direction (dx, dz): {d, type, s, nx, nz}. r: her body.
  ray(x, z, dx, dz, r = 0.45, max = 60) {
    let best = { d: max, type: 'none', s: null, nx: -dx, nz: -dz };
    const take = (d, type, s, nx, nz) => { if (d > 0.05 && d < best.d) best = { d, type, s, nx, nz }; };
    // the floor's edges: the K-rail, the guardrail, the truck, the roadblock
    const F = FLOOR;
    if (dz < -1e-6) take((F.minZ + r - z) / dz, 'krail', null, 0, 1);
    if (dz > 1e-6) take((F.maxZ - r - z) / dz, 'guardrail', null, 0, -1);
    if (dx < -1e-6) take((F.minX + r - x) / dx, 'truck', null, 1, 0);
    if (dx > 1e-6) take((F.maxX - r - x) / dx, 'roadblock', null, -1, 0);
    for (const s of this.surfaces) {
      if (!s.on()) continue;
      if (s.shape === 'circle') {
        const ox = x - s.x, oz = z - s.z, R = s.r + r, b = ox * dx + oz * dz, c = ox * ox + oz * oz - R * R, disc = b * b - c;
        if (disc < 0 || c < 0) continue;
        const d = -b - Math.sqrt(disc); take(d, s.type, s, (ox + dx * d) / R, (oz + dz * d) / R);
      } else {
        const c = Math.cos(s.rot), sn = Math.sin(s.rot);
        const lx = (x - s.x) * c - (z - s.z) * sn, lz = (x - s.x) * sn + (z - s.z) * c;
        const ldx = dx * c - dz * sn, ldz = dx * sn + dz * c;
        const hx = s.hx + r, hz = s.hz + r;
        if (Math.abs(lx) < hx && Math.abs(lz) < hz) continue;
        let t0 = -Infinity, t1 = Infinity, ax = 0, az = 0;
        for (const [o, d, h, axis] of [[lx, ldx, hx, 0], [lz, ldz, hz, 1]]) {
          if (Math.abs(d) < 1e-9) { if (Math.abs(o) > h) t0 = Infinity; continue; }
          let ta = (-h - o) / d, tb = (h - o) / d, sg = -1; if (ta > tb) { [ta, tb] = [tb, ta]; sg = 1; }
          if (ta > t0) { t0 = ta; ax = axis === 0 ? sg : 0; az = axis === 1 ? sg : 0; }
          t1 = Math.min(t1, tb);
        }
        if (t0 <= t1 && t0 >= 0) take(t0, s.type, s, ax * c + az * sn, -ax * sn + az * c);
      }
    }
    return best;
  }
  // the cars and wrecks on the floor (windows, pounces)
  carSpots() {
    const out = [{ x: 7.4, z: 1.4, s: this.youSurf }];
    if (this.herCar.mode !== 'driving') out.push({ x: this.herCar.x, z: this.herCar.z, s: this.herSurf });
    return out;
  }

  // ------------------------------------------------------------------ what play decides: snapshot / restore / canonical
  canonical(t = 0) {
    const T = this.T;
    const smashed = t >= this.B(37, 4) + 0.2;
    return {
      herCar: t < this.B(38, 1) ? { mode: 'parked', x: -7.6, z: 1.4, yaw: 0, crumple: 0 } : { mode: 'wreck', x: 4.0, z: 1.6, yaw: 0.35, crumple: 1 },
      youBroken: smashed ? this.youBreak.map((b) => b.name).concat(['suitcase']) : [],
      cones: this.cones.map((c) => (smashed ? 'down' : 'up')), horses: this.horses.map(() => (smashed ? 'down' : 'up')),
      rocks: BOULDERS.map(() => 0), carve: t >= this.B(54, 4) ? 'krail' : null, marks: [], pin: { x: 0, z: 1.5 }, youRock: { x: 6, z: 3 },
      rollX: [-6, 3, 0],
    };
  }
  snapshot() {
    return {
      herCar: { ...this.herCar }, youBroken: [...this.state.youBroken], cones: this.cones.map((c) => (c.st === 'up' ? 'up' : 'down')), horses: this.horses.map((c) => (c.st === 'up' ? 'up' : 'down')),
      rocks: this.rocks.map((r) => r.s.hits), carve: this.state.carve, marks: this.marks.filter((m) => m.kind !== 'puddle').map((m) => ({ kind: m.kind, x: m.x, z: m.z, r: m.r })),
      pin: { ...this.pinAt }, youRock: { ...this.youRockAt }, rollX: this.rollers.map((r) => r.x),
    };
  }
  restore(s) {
    this.state = { youBroken: [...s.youBroken], carve: s.carve };
    this.herCar = { ...s.herCar };
    this.youCar = { ...YOU_CAR };
    this.cones.forEach((c, i) => { c.st = s.cones[i] === 'up' ? 'up' : 'gone'; c.obj.position.set(c.home[0], 0, c.home[1]); c.obj.rotation.set(0, 0, 0); c.obj.visible = c.st === 'up'; });
    this.horses.forEach((c, i) => { c.st = s.horses[i] === 'up' ? 'up' : 'gone'; c.obj.position.set(c.home[0], 0, c.home[1]); c.obj.rotation.set(0, 0, 0); c.obj.visible = c.st === 'up'; });
    this.rocks.forEach((r, i) => { r.s.hits = s.rocks[i]; r.obj.scale.setScalar(s.rocks[i] ? 0.9 : 1); });
    this.clearMarks();
    for (const m of s.marks) this.addMark(m.kind, m.x, m.z, { r: m.r });
    this.puddles = [];
    if (s.carve) this.carveMarks(s.carve); else this.clearGouges();
    this.pinAt = { ...s.pin }; this.youRockAt = { ...s.youRock };
    this.rollers.forEach((r, i) => { r.x = s.rollX[i]; });
    for (const b of this.youBreak) { if (b.obj) b.obj.visible = !this.state.youBroken.includes(b.name); }
    this.suitcase.lid.visible = !this.state.youBroken.includes('suitcase');
    this.burning = null;
  }
  breakYou(name) {
    if (this.state.youBroken.includes(name)) return false;
    this.state.youBroken.push(name);
    const b = this.youBreak.find((q) => q.name === name);
    if (b && b.obj) b.obj.visible = false;
    if (name === 'suitcase') this.suitcase.lid.visible = false;
    return true;
  }
  youBroken(name) { return this.state.youBroken.includes(name); }

  // the two cars where their state has them, and their colliders with them (a collider turns with the body: resolve
  // and ray take local x along the nose, (cos yaw, -sin yaw); and it crumples with it)
  placeCars() {
    const hc = this.herCar, her = this.her, yc = this.youCar, you = this.you;
    her.root.position.set(hc.x, hc.y || 0, hc.z); her.root.rotation.set(hc.roll || 0, hc.yaw, hc.pitch || 0);
    her.root.scale.set(1 - 0.18 * hc.crumple, 1 - 0.12 * hc.crumple, 1);
    this.herSurf.x = hc.x; this.herSurf.z = hc.z; this.herSurf.rot = hc.yaw; this.herSurf.hx = 2.3 * (1 - 0.18 * hc.crumple);
    you.root.position.set(yc.x, yc.y || 0, yc.z); you.root.rotation.set(yc.roll || 0, yc.yaw, yc.pitch || 0);
    you.root.scale.set(1 - 0.18 * yc.crumple, 1 - 0.12 * yc.crumple, 1);
    this.youSurf.x = yc.x; this.youSurf.z = yc.z; this.youSurf.rot = yc.yaw - Math.PI; this.youSurf.hx = 2.35 * (1 - 0.18 * yc.crumple);
  }

  // ------------------------------------------------------------------ per frame: everything where it is at song time t
  update(dt, t, f) {
    this.t = t;
    const T = this.T, beat = f.bm ? f.bm.beatAt(t) : 0, inBeat = beat - Math.floor(beat), barBeat = ((Math.floor(beat) - 1) % 4 + 4) % 4;   // 0..3 = beats 1..4
    const g = this.glows; g.begin(); this.fires.begin();
    // ---- the light state (baked states blended) and the sky in the road
    this._light(t, f);
    // ---- YOU's car: its headlights; its door still swinging from when YOU got out
    this.windowsOut = t >= T.windows;
    if (t < 5) this.you.door.rotation.y = 0.81 + 0.12 * Math.exp(-t * 1.6) * Math.sin(t * 7.5);
    const youOn = (t >= T.youLights && t < T.headsOff) || (t >= T.headsOn);
    const you = this.you;
    for (const [name, lens, fl, z] of [['headL', you.parts.lensL, you.flareL, 0.95], ['headR', you.parts.lensR, you.flareR, 1.85]]) {
      const ok = youOn && !this.youBroken(name) && !this.windowsOut;
      lens.visible = !this.youBroken(name); fl.visible = ok;
      if (ok) g.beam(5.1, z, -Math.PI / 2, 14, 4.2, WHITE, 0.085 * (t < T.youLights + 0.08 ? (t - T.youLights) / 0.08 : 1));
    }
    you.parts.glass[0].material = !this.youBroken('windscreen') && !this.windowsOut ? MAT.glass : MAT.glassOut;
    you.doorGlass.visible = !this.youBroken('doorGlass') && !this.windowsOut;
    // ---- her car: parked (its one headlight), driving (moves.js drives it), or a wreck (whose light comes back on
    // for her last bars)
    const hc = this.herCar, her = this.her;
    this.placeCars();
    her.parts.glass[0].material = this.windowsOut && hc.mode === 'wreck' ? MAT.glassOut : MAT.glass;
    const herOn = (hc.mode !== 'wreck' || hc.lit) && ((t >= T.herLight && t < T.headsOff) || t >= T.headsOn);
    her.flareL.visible = herOn; her.parts.lensL.material = herOn ? MAT.lens : MAT.lensOff;
    if (herOn) {
      const blaze = (t >= T.engine ? 1.8 : 1) * (hc.blaze ?? 1);
      const fx = Math.cos(hc.yaw), fz = -Math.sin(hc.yaw), nose = 2.3 * (1 - 0.18 * hc.crumple);
      const lx = hc.x + fx * nose - fz * 0.6, lz = hc.z + fz * nose + fx * 0.6;
      g.beam(lx, lz, Math.atan2(fx, fz), 14, 4.0, PINKW, 0.085 * blaze * (t < T.herLight + 0.1 ? (t - T.herLight) / 0.1 : 1));
      her.flareL.scale.setScalar(0.65 * blaze);
    }
    // ---- strobes at the roadblock: red on beats 1 and 3, blue on 2 and 4
    const strobeK = this._strobeK(t);
    if (strobeK > 0) {
      const red = barBeat % 2 === 0, k = strobeK * Math.max(0, 1 - inBeat * 1.6);
      const wide = t >= T.pre1 && t < T.verse2 ? 1.6 : 1;
      g.pool(12.2, red ? -1.2 : 3.6, 5.5 * wide, red ? RED : BLUE, 0.16 * k, 1.3);
      this._emit('strobe_red', red ? 6 * k : 0); this._emit('strobe_blue', red ? 0 : 8 * k);
    } else { this._emit('strobe_red', 0); this._emit('strobe_blue', 0); }
    // ---- the lamps' lenses (each dies on its own beat)
    this._lamps(t);
    // ---- the board
    this._boardAt(t, f, barBeat, inBeat);
    // ---- boulders: they come down on "bury"
    this._rocks(t, dt);
    // ---- the live lane
    this._live(t);
    this._petalsTick(dt, t);
    // ---- barriers
    this._walls(t, barBeat, inBeat);
    // ---- props: cones and sawhorses knocked flying
    for (const c of [...this.cones, ...this.horses]) {
      if (c.st !== 'flying') continue;
      c.vy -= 18 * dt; c.obj.position.x += c.vx * dt; c.obj.position.y += c.vy * dt; c.obj.position.z += c.vz * dt; c.obj.rotation.x += c.spin * dt; c.obj.rotation.z += c.spin * 0.7 * dt;
      if (c.obj.position.y < 0) { c.obj.position.y = 0; c.vy = Math.abs(c.vy) * 0.3; c.vx *= 0.6; c.vz *= 0.6; c.spin *= 0.5; if (Math.abs(c.vy) < 0.6) { c.st = 'down'; c.obj.rotation.x = Math.PI / 2; } }
    }
    // ---- flares, candles, the pin
    for (const fl of this.flares) { const on = fl.t0 < 0 ? t < T.dawn + 6 : (t >= fl.t0 && t < T.dawn + 8); fl.s.visible = on; if (on) { const k = 0.8 + 0.2 * Math.sin(t * 23 + fl.x); fl.s.material.opacity = k; g.pool(fl.x, fl.z, 1.3, RED, 0.1 * k); } }
    const cand = t >= T.candles; for (const c of this.candles) { c.visible = cand; if (cand) c.material.opacity = 0.75 + 0.25 * Math.sin(t * 13 + c.position.x * 9); }
    if (cand) g.pool(-1.6, 6.2, 1.1, FLAME, 0.25 + (t < T.candles + 0.3 ? 0.4 * (1 - (t - T.candles) / 0.3) : 0));
    this.pin.visible = t >= T.pin; if (this.pin.visible) { this.pin.position.set(this.pinAt.x, 0, this.pinAt.z); this.pin.glint.material.opacity = 0.5 + 0.5 * Math.max(0, Math.sin(t * 2.2)); }
    // ---- fire in the puddles (60.2 -> 61.4) and on the wrecks (the final chorus)
    if (this.puddles) for (const p of this.puddles) { if (t >= T.fire && t < T.fireOut) { const k = Math.min(1, (t - T.fire) / 0.15) * Math.min(1, (T.fireOut - t) / 0.3); for (let j = 0; j < 3; j++) this.fires.flame(p.x + Math.cos(j * 2.1) * 0.5, 0.0, p.z + Math.sin(j * 2.1) * 0.4, 1.3, k, p.x + j, t); g.pool(p.x, p.z, 3.2, FIRE, 0.18 * k * (0.8 + 0.2 * Math.sin(t * 19 + p.z))); } }
    // ---- the lighter in YOU's hand (verse 1's dark)
    if (this.lighterOn) { const p = f.player; const k = 0.85 + 0.15 * Math.sin(t * 21) * Math.sin(t * 13.7); g.pool(p.x, p.z, 3.0, FLAME, 0.075 * k); }
    // ---- the searchlight follows the midpoint between you (the bridge)
    if (t >= T.bridge && t < T.blast) { const mx = (f.player.x + f.boss.x) / 2, mz = (f.player.z + f.boss.z) / 2; this._search = this._search || { x: mx, z: mz }; const kk = 1 - Math.exp(-dt * 3); this._search.x += (mx - this._search.x) * kk; this._search.z += (mz - this._search.z) * kk; g.pool(this._search.x, this._search.z, 4.4, SEARCH, 0.14); }
    // ---- extra light from track code (her eyes' beam, crash sparks...)
    if (this.extra) for (const e of this.extra) e(g, t);
    g.end(); this.fires.end();
    flushFlares(this.flareList, this.flareBB, this.f.scene);
  }

  _emit(name, k) {
    if (!this.arena || !this.arena.emissive) return;
    if (!this._em) { this._em = {}; for (const e of this.arena.emissive) (this._em[e.name] ||= []).push(e.mat); }
    const list = this._em[name]; if (!list) return;
    for (const m of list) { m.emissive.copy(m.userData.kmlBase || (m.userData.kmlBase = m.emissive.clone().setScalar(1))); m.emissive.setRGB(...(name === 'strobe_red' ? [1, 0.06, 0.08] : name === 'strobe_blue' ? [0.1, 0.22, 1] : [1, 0.45, 0.12])).multiplyScalar(k); }
  }
  _strobeK(t) {
    const T = this.T;
    if (t >= T.headsOff && t < T.back[3]) return 0;
    if (t >= T.bridge && t < T.blast) return 0;
    if (t >= T.dawn) return Math.max(0, 1 - (t - T.dawn) / 6);
    return 1;
  }
  _lampOn(i, t) {
    const T = this.T;
    // the order they die in verse 1: x -12, -4, 4, 12 (index 0..3); back in the same order; at dawn 0, 1, 2 go out, 3 holds
    if (t >= T.die[i] && t < T.back[i]) {
      return false;
    }
    if (t >= T.back[i] && t < T.back[i] + 0.25) return Math.sin((t - T.back[i]) * 90) > 0;   // a flicker as it catches
    if (i < 3 && t >= T.lampsOut[i]) return false;
    if (t >= T.drop && t < T.blast) return false;
    return true;
  }
  _lamps(t) {
    const T = this.T;
    for (let i = 0; i < 4; i++) {
      let k = this._lampOn(i, t) ? 1 : 0;
      if (t >= T.bridge && t < T.blast) k *= 0.3;
      if (t >= T.stopDip && t < T.slam) k *= 0.8;
      this._emitLamp(i, k * 26);
    }
  }
  _emitLamp(i, k) {
    if (!this.arena || !this.arena.emissive) return;
    if (!this._em) { this._em = {}; for (const e of this.arena.emissive) (this._em[e.name] ||= []).push(e.mat); }
    const list = this._em['sodium_glow' + i]; if (!list) return;
    for (const m of list) m.emissive.setRGB(1, 0.37, 0.065).multiplyScalar(k);
  }
  // which baked lighting state is showing at t (a, b, k), and the sky's colour in the road
  stateAt(t) {
    const T = this.T;
    // how dark lamp i leaves the road: out from its beat, and as it catches the road comes up smoothly (only the lamp
    // head flickers: the whole road strobing at 14 Hz was a room-wide flash)
    const deadK = (i) => (t < T.die[i] ? 0 : t < T.back[i] ? 1 : Math.max(0, 1 - (t - T.back[i]) / 0.3));
    if (t < T.stopDip) return ['sodium', 'sodium', 0];
    if (t < T.slam) return ['sodium', 'dark', 0.2];
    if (t < T.die[0]) return ['sodium', 'sodium', 0];
    if (t < T.back[3] + 0.3) { let n = 0; for (let i = 0; i < 4; i++) n += deadK(i); return ['sodium', 'dark', Math.round(n / 4 * 20) / 20]; }
    if (t < T.pre2) return ['sodium', 'sodium', 0];
    if (t < T.bridge) return ['sodium', 'dark', 0.3];
    if (t < T.drop) return ['stopped', 'stopped', 0];
    if (t < T.blast) return ['search', 'search', 0];
    if (t < T.dawn) return ['fire', 'fire', 0];
    return ['fire', 'dawn', Math.round(smooth(T.dawn, T.dawn + 7, t) * 20) / 20];
  }
  skyAt(t) {
    const T = this.T;
    const top = new THREE.Color(), hor = new THREE.Color();
    const set = (a, b) => { top.set(a); hor.set(b); };
    if (t < T.die[0]) set('#0a0a20', '#2a2a6a');
    else if (t < T.back[3]) set('#04040c', '#12122e');
    else if (t < T.redden) set('#0a0a20', '#2a2a6a');
    else if (t < T.blast) { const k = smooth(T.redden, T.intrude[3], t); top.set('#0a0a20').lerp(new THREE.Color('#5a0c1c'), k); hor.set('#2a2a6a').lerp(new THREE.Color('#7a1020'), k); if (t >= T.drop) { top.multiplyScalar(0.5); hor.multiplyScalar(0.5); } }
    else if (t < T.dawn) { const k = smooth(T.blast, T.dawn, t); top.set('#2a0820'); hor.set('#ff4fb0').lerp(new THREE.Color('#ff9a3a'), k).multiplyScalar(0.42); }
    // first light: the black road is lit by what it reflects, so the sky has to go pale for the road to (lilac over,
    // peach low)
    else { const k = smooth(T.dawn, T.dawn + 9, t); top.set('#2a0820').lerp(new THREE.Color('#b49ac4'), k); hor.set('#ff9a3a').multiplyScalar(0.42).lerp(new THREE.Color('#f2c4a8').multiplyScalar(0.85), k); }
    return { top, hor };
  }
  _light(t, f) {
    const [a, b, k] = this.stateAt(t);
    const LIT = { sodium: 0.55, dark: 0.07, stopped: 0.35, search: 0.18, fire: 0.6, dawn: 0.8 };
    this.litK = (LIT[a] ?? 0.5) * (1 - k) + (LIT[b] ?? 0.5) * k;
    if (this.lit) for (const m of this.lit) m.color.setScalar(this.litK);
    if (this.gouges) for (const d of this.gouges) d.material.color.setScalar(this.litK * 0.75);
    if (this.arena) { this.arena.setState(a, b, k); }
    const s = this.skyAt(t);
    this.sky.material.uniforms.uTop.value.copy(s.top); this.sky.material.uniforms.uHor.value.copy(s.hor);
    if (t >= this.T.blast && t < this.T.blast + 0.3) { const fl = 1 - (t - this.T.blast) / 0.3; this.sky.material.uniforms.uHor.value.lerp(new THREE.Color(1.7, 1.65, 1.6), fl * fl); }
    // the sky the camera sees over the ridge: night's is dim, first light's is the brightest thing in the picture
    this.far.dome.material.uniforms.uGain.value = lerp(0.5, 0.82, t >= this.T.dawn ? smooth(this.T.dawn, this.T.dawn + 9, t) : 0);
  }

  _boardAt(t, f, barBeat, inBeat) {
    const T = this.T, B = this.B;
    let page;
    if (t >= B(11, 3) && t < B(13, 3)) page = "DON'T CARE / IF YOU KILL ME";
    else if (t >= B(13, 3) && t < T.stopDip) page = 'JUST PLEASE / DON\'T SAY GOODBYE';
    else if (t >= T.stopDip && t < T.slam) page = '';
    else if (t >= T.headsOff && t < T.headsOn) page = '';
    else if (t >= T.up[0] && t < T.up[2]) page = 'IF LOVE IS / JUST A WARNING';
    else if (t >= T.count && t < T.stopped) page = (Math.floor((t - T.count) / (f.beat / 2)) % 2) ? 'chevrons' : '';
    else if (t >= T.stopped && t < T.blast) page = '';
    else if (t >= T.goodbye) page = 'JUST SAY / GOODBYE';
    else page = inBeat < 0.35 ? 'heart1' : 'heart0';
    this._drawPage(page);
  }

  _rocks(t, dt) {
    const T = this.T;
    const t0 = T.lock8, t1 = T.slide;
    for (const [i, r] of this.rocks.entries()) {
      const o = r.obj;
      if (t < t0) { o.visible = false; continue; }
      if (r.s.hits >= 2) { o.visible = false; continue; }
      o.visible = true;
      if (t < t1) {
        // over the live lane in two bounces: a hop in the lane, then over the K-rail onto its spot
        const k = (t - t0) / (t1 - t0);
        const [fx, fz] = r.from, mx = lerp(fx, r.x, 0.55), mz = LANE_Z;
        let x, y, z;
        if (k < 0.45) { const u = k / 0.45; x = lerp(fx, mx, u); z = lerp(fz, mz, u); y = 7 * (1 - u) * (1 - u) + 0.0 + 2.2 * 4 * u * (1 - u) * 0.3; }
        else { const u = (k - 0.45) / 0.55; x = lerp(mx, r.x, u); z = lerp(mz, r.z, u); y = r.r * 0.7 + 3.2 * 4 * u * (1 - u); }
        o.position.set(x, Math.max(r.r * 0.7, y), z);
        o.rotation.setFromVector3(r.spin.clone().multiplyScalar(k * 9));
      } else { o.position.set(r.x, r.r * 0.7, r.z); if (t < t1 + 0.05) o.rotation.setFromVector3(r.spin.clone().multiplyScalar(9)); }
    }
    // the one aimed at YOU: it lands on the spot locked at 8.3 and bursts to gravel
    const yr = this.youRock;
    if (t >= t0 && t < t1 + 0.02) { const k = (t - t0) / (t1 - t0); yr.visible = true; yr.position.set(lerp(this.youRockAt.x + 3, this.youRockAt.x, k), 0.5 + 6 * (1 - k * k), lerp(-10, this.youRockAt.z, k)); yr.rotation.x = k * 7; }
    else yr.visible = false;
    for (const d of this.slump) d.visible = t >= t1;
    const L = this.litK ?? 1; for (const d of this.slump) d.material.color.setScalar(L);
    // chorus 2's rolling rocks: over the K-rail on 47.1, across in one beat, over the guardrail and away
    const [r0, rl, r1] = T.rocks;
    for (const r of this.rollers) {
      const o = r.obj;
      if (t < rl - 0.5 || t > r1 + 0.9) { o.visible = false; continue; }
      o.visible = true;
      const beat = (r1 - rl) / 2;
      let z, y;
      if (t < r1) { const u = clamp01((t - (rl - 0.5)) / (r1 - (rl - 0.5))); z = lerp(-9, -3.6, u); y = 0.9 + Math.sin(u * Math.PI) * 1.2; }
      else { const u = (t - r1) / beat; z = -3.0 + u * 10.5; y = 0.9 - Math.max(0, z - 7) * 0.8; }
      o.position.set(r.x, y, z); o.rotation.x = (t - rl) * 9;
    }
  }

  _live(t) {
    const T = this.T, g = this.glows;
    for (const c of this.pool) c.root.visible = false;
    const used = new Set();
    for (const e of this.sched) {
      if (t < e.t0 - 0.1) break;
      const x = 19 - e.v * (t - e.t0);
      if (x < -21) continue;
      const slot = e.m % this.pool.length; if (used.has(slot)) continue; used.add(slot);
      const car = this.pool[slot];
      car.root.visible = true; car.root.position.set(x, 0, LANE_Z); car.root.rotation.y = Math.PI;
      this._headlights(car, x, LANE_Z, -1, 0, this._dark(t) ? 0.07 : 0.035, t);
    }
    // the five that stop: braking from the count-in, stopped by 70.4, turning to watch on 71.1
    const ts = T.stopped, D = 2.6, v = 18;
    for (const [i, s] of this.stopped.entries()) {
      const car = s.car;
      const tIn = ts - D - (19 - s.xs - v * D / 2) / v;
      const ti = s.intr >= 0 ? T.intrude[s.intr] : Infinity;
      // the K-rail segment it comes through goes over
      const segName = { '-9.2': 'krail_l2', '9.2': 'krail_r2', '-4.6': 'krail_l1', '4.6': 'krail_r1' }[String(s.xs)];
      const seg = segName && this.arena && this.arena.anchors[segName] && this.arena.anchors[segName].node;
      if (seg) { seg.userData.home = seg.userData.home || seg.position.clone(); const k = t >= ti - 0.05 ? smooth(ti - 0.05, ti + 0.12, t) : 0; seg.rotation.x = k * 1.32; seg.position.set(seg.userData.home.x, seg.userData.home.y, seg.userData.home.z + k * 0.45); }
      if (t < tIn) { car.root.visible = false; s.s.on = () => false; continue; }
      car.root.visible = true;
      let x = s.xs, z = LANE_Z, yaw = Math.PI, braking = false;
      if (t < ts - D) x = s.xs + v * D / 2 + v * (ts - D - t);
      else if (t < ts) { const u = (ts - t) / D; x = s.xs + v * D / 2 * u * u; braking = true; }
      // turning to watch
      if (t >= T.bridge) { const k = smooth(T.bridge, T.bridge + 0.25, t); yaw = lerp(Math.PI, s.watch, k); }
      // through the K-rail on its snare, 3.2 m into the floor
      let up = 0;
      if (t >= ti - 0.12 && t < T.blast) { const k = smooth(ti - 0.12, ti + 0.05, t); yaw = lerp(s.watch, -Math.PI / 2, k); z = lerp(LANE_Z, -2.3, k); }
      if (t >= T.blast) {
        if (s.intr < 0) { // the one in the middle drives away
          const u = t - T.blast; x = s.xs - 6 * u * u; yaw = Math.PI;
          if (x < -22) { car.root.visible = false; continue; }
        } else {
          const u = clamp01((t - T.blast) / 0.55);
          yaw = -Math.PI / 2; z = lerp(-2.3, -4.3, u); up = Math.sin(u * Math.PI) * 2.2;
          car.root.rotation.set(u * Math.PI, 0, 0);
        }
      }
      car.root.rotation.order = 'YXZ';
      if (t >= T.blast && s.intr >= 0) { const u = clamp01((t - T.blast) / 0.55); car.root.rotation.set(Math.PI * u, yaw, 0); car.root.position.set(x, up + car.hei * smooth(0.5, 1, u), z); }
      else { car.root.rotation.set(0, yaw, 0); car.root.position.set(x, up, z); }
      s.s.on = () => (t >= ti && t < T.blast) || (t >= T.blast + 0.5 && s.intr >= 0);
      s.s.x = x; s.s.z = t >= T.blast && s.intr >= 0 ? -4.3 : z; s.s.rot = Math.PI / 2;
      // lights: brake lights while braking, headlights on watch (a step brighter every beat of the build)
      for (const tl of car.parts.tail) tl.material = MAT.tail;
      const dead = t >= T.blast && s.intr >= 0;
      const fx = Math.cos(car.root.rotation.y), fz = -Math.sin(car.root.rotation.y);
      let k = t >= T.bridge ? 0.025 : 0.035;
      if (t >= T.build && t < T.drop) k += 0.012 * Math.floor((t - T.build) / this.f.beat);
      if (t >= T.drop && t < T.blast) k = 0;
      car.flareL.visible = car.flareR.visible = !dead && k > 0;
      if (!dead && k > 0) this._headlights(car, x, z, fx, fz, k, t);
      // burning upside down through the final chorus
      if (dead) { const fk = t < T.dawn ? 1 : Math.max(0, 1 - (t - T.dawn) / 6); for (let j = 0; j < 4; j++) this.fires.flame(x + (j - 1.5) * 0.9, 1.4, -4.3 + Math.sin(j * 2.3) * 0.4, 1.6 + hash(j + i) * 0.8, fk, i * 4 + j, t); g.pool(x, -3.6, 4.5, FIRE, 0.16 * fk * (0.85 + 0.15 * Math.sin(t * 17 + i))); }
    }
  }
  _headlights(car, x, z, fx, fz, k, t) {
    const L = car.len / 2, w = 0.6, ang = Math.atan2(fx, fz);
    // in the dark the beams lean toward YOU's floor, so a passing car sweeps light across it
    const lean = fz === 0 && this._dark(t) ? 0.3 * -fx : 0;
    for (const s of [-1, 1]) {
      const hx = x + fx * L - fz * w * s, hz = z + fz * L + fx * w * s;
      this.glows.beam(hx, hz, ang + lean, 13, 4.5, WHITE, k);
    }
    this.glows.pool(x, z, 3.2, WHITE, k * 0.3);
  }
  _dark(t) { return t >= this.T.headsOff && t < this.T.back[3]; }

  _walls(t, barBeat, inBeat) {
    const T = this.T;
    for (const [i, w] of this.walls.entries()) {
      const tu = T.up[i], td = T.down[3 - i];   // they sink W4, W3, W2, W1
      let y = -1.0;
      if (t >= tu - 0.05 && t < td + 0.3) {
        const kUp = smooth(tu - 0.05, tu + 0.12, t), kDn = t >= td ? smooth(td, td + 0.3, t) : 0;
        y = -1.0 + (kUp - kDn) * 1.0;
      }
      w.obj.visible = y > -0.98; w.obj.position.y = y;
      const lit = w.obj.visible && y > -0.4;
      const pulse = 0.55 + 0.45 * Math.max(0, 1 - inBeat * 2);
      for (const l of w.lamps) { l.visible = lit; l.material.opacity = pulse; }
      if (lit) this.glows.pool(w.x, w.z, w.len * 0.55, AMBER, 0.08 * pulse, 0.45);
      w.s.x = w.x; w.s.z = w.z;
    }
  }

  // ------------------------------------------------------------------ things play does to the set
  knock(x, z, r, dirX, dirZ, speed = 8) {
    if (speed > 6) this.gust(x, z, dirX, dirZ, speed, r + 0.9);
    for (const c of [...this.cones, ...this.horses]) {
      if (c.st !== 'up') continue;
      if (Math.hypot(c.obj.position.x - x, c.obj.position.z - z) > r) continue;
      c.st = 'flying'; c.vx = dirX * speed * 0.6 + (hash(c.home[0]) - 0.5) * 3; c.vz = dirZ * speed * 0.6 + (hash(c.home[1]) - 0.5) * 3; c.vy = 4 + speed * 0.2; c.spin = 9;
      this.f.fx.chips(c.obj.position.x, 0.5, c.obj.position.z, new THREE.Color(2.4, 0.7, 0.2), 8);
    }
  }
  setPuddles(list) { this.puddles = list; }
  dispose() {
    this.f.scene.remove(this.group); this.glows.dispose(this.f.scene); this.fires.dispose(this.f.scene); this.f.scene.remove(this.sky); this.far.dispose(); this.flareBB.dispose(this.f.scene); this.flareList.length = 0;
  }
}
