// The back room's real-time pieces, built in three.js. Each builder returns { at(t), update(dt, t), ... }:
// at(t) puts the piece where the song has it at time t (rewinds, starts anywhere), update runs it.
// Game frame: x right, z toward the camera, y up. The play area is x -11..11, z -7..7.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LAYER } from '../../game/arena.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Rig } from '../../engine/character.js';

const TAU = Math.PI * 2;
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ease = (k) => k * k * (3 - 2 * k);
const step = (t, a, b) => clamp01((t - a) / Math.max(1e-4, b - a));
const rnd = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

export function materials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const phy = (o) => new THREE.MeshPhysicalMaterial(o);
  return {
    chrome: std({ color: 0xd8dde4, metalness: 1, roughness: 0.14 }),
    gold: std({ color: 0xe2ae4c, metalness: 1, roughness: 0.26 }),
    black: phy({ color: 0x0e080b, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }),
    orange: phy({ color: 0xff6a13, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05 }),
    velvet: phy({ color: 0x5a0a14, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xc0405a), sheenRoughness: 0.4, side: THREE.DoubleSide }),
    porcelain: phy({ color: 0xf4ece4, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4, sheenColor: new THREE.Color(0xffd0e0) }),
    bags: phy({ color: 0xffffff, vertexColors: true, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.1 }),
  };
}
function box(w, h, d, x = 0, y = 0, z = 0) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; }
function cyl(r0, r1, h, x, y, z, seg = 12) { const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(x, y, z); return g; }
function colorize(g, c) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
function strip(g) { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g.index ? g.toNonIndexed() : g; }
const merge = (gs) => mergeGeometries(gs.map(strip), false);
function canvasTex(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
// a mesh that lies on the floor and is drawn by the main camera only (decals, pools)
function floorDecal(mesh) { mesh.layers.set(LAYER.NO_REFLECT); mesh.renderOrder = 1; return mesh; }

// ================================================================================================ racks
// Four chrome rolling racks of bagged costumes, long axis along z: tall cover. They swing round on "party" (45.32),
// stand back at the gaslight (64.83), fall on "falling" (79.50), spring up across the room on "party" (98.66) and
// fly out at 165.33.
export const RACKS = [[-4.5, -2.4], [-4.5, 2.6], [4.5, -2.4], [4.5, 2.6]];
const BAG = [0x0e080b, 0xff6a13, 0x4a1a6a, 0xb01428, 0xe2ae4c, 0xf4ece4, 0x2a6a4a, 0x0e080b, 0xc87a8e, 0x6a2cff, 0x0e080b, 0xff6a13];
export function racks(R) {
  const f = R.f, M = R.mat;
  const chromeG = merge([
    box(0.06, 0.06, 3.2, -0.3, 0.1, 0), box(0.06, 0.06, 3.2, 0.3, 0.1, 0), box(0.66, 0.05, 0.06, 0, 0.1, -1.5), box(0.66, 0.05, 0.06, 0, 0.1, 1.5),
    cyl(0.025, 0.025, 1.65, 0, 0.92, -1.5), cyl(0.025, 0.025, 1.65, 0, 0.92, 1.5),
    (() => { const g = new THREE.CylinderGeometry(0.022, 0.022, 3.1, 10); g.rotateX(Math.PI / 2); g.translate(0, 1.72, 0); return g; })(),
    ...[[-0.3, -1.5], [0.3, -1.5], [-0.3, 1.5], [0.3, 1.5]].map(([x, z]) => cyl(0.045, 0.045, 0.04, x, 0.04, z, 10)),
  ]);
  const list = [];
  RACKS.forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(new THREE.Mesh(chromeG, M.chrome));
    // the bagged costumes: a garment under clear plastic, a hanger hook, a gold price tag at the shoulder
    const bags = [], cols = [];
    for (let k = 0; k < 11; k++) {
      const c = new THREE.Color(BAG[(k + i * 3) % BAG.length]);
      const zz = -1.35 + k * 0.27 + (rnd() - 0.5) * 0.04, len = 1.0 + rnd() * 0.3;
      const bg = box(0.52 + rnd() * 0.06, len, 0.07, 0, 1.62 - len / 2, zz);
      bg.rotateY((rnd() - 0.5) * 0.12);
      bags.push(colorize(bg, c)); cols.push(c);
      bags.push(colorize(box(0.02, 0.1, 0.02, 0, 1.68, zz), new THREE.Color(0.8, 0.8, 0.85)));
      bags.push(colorize(box(0.06, 0.04, 0.005, 0.2, 1.5, zz + 0.04), new THREE.Color(0xe2ae4c)));
    }
    const bagG = merge(bags);
    const bagM = new THREE.Mesh(bagG, M.bags.clone());
    bagM.castShadow = true;
    g.add(bagM);
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    R.group.add(g);
    // the collider stands where the rack does (a proxy: upright, fallen beside its line, or gone)
    const proxy = new THREE.Object3D(); R.stage.group.add(proxy);
    const piece = R.stage.add(proxy, { collider: { type: 'box', w: 0.7, d: 3.2 }, solid: true, tag: 'rack' });
    const base = bagG.attributes.color.array.slice();
    list.push({ g, proxy, piece, x, z, side: x < 0 ? 1 : -1, bagM, base, tall: true, gone: false,
      hits(px, pz) { const a = -g.rotation.y, ca = Math.cos(a), sa = Math.sin(a); const lx = (px - g.position.x) * ca - (pz - g.position.z) * sa, lz = (px - g.position.x) * sa + (pz - g.position.z) * ca; return Math.abs(lx) < 0.4 && Math.abs(lz) < 1.6 && !this.gone; } });
  });
  const T = { swing: 45.32, mend: 64.83, fall: 79.50, up: 98.66, fly: 165.33 };
  const api = {
    list, T,
    // where a rack is at song time t: yaw (0 along z, pi/2 across), tilt (lying on its side), lift (flown)
    pose(r, t) {
      let yaw = 0, tilt = 0, lift = 0;
      if (t < T.mend) yaw = Math.PI / 2 * ease(step(t, T.swing - 0.3, T.swing));
      if (t >= T.mend - 0.5 && t < T.mend) yaw = Math.PI / 2 * (1 - ease(step(t, T.mend - 0.5, T.mend)));
      if (t >= T.mend && t < T.up - 0.3) { const k = step(t, T.fall - 0.35, T.fall); tilt = r.side * Math.PI / 2 * k * k; }
      if (t >= T.up - 0.3) { const k = ease(step(t, T.up - 0.3, T.up)); tilt = r.side * Math.PI / 2 * (1 - k); yaw = Math.PI / 2 * k; }
      if (t >= T.fly - 0.2) lift = 9 * Math.pow(step(t, T.fly - 0.2, T.fly + 0.9), 2);
      return { yaw, tilt, lift };
    },
    at(t) { for (const r of list) this.place(r, t); },
    place(r, t) {
      const p = this.pose(r, t);
      r.g.position.set(r.x, p.lift, r.z);
      r.g.rotation.set(0, p.yaw, 0);
      r.g.rotateZ(-p.tilt);                   // tips over toward the runner, pivoting on its feet
      r.gone = p.lift > 2.5; r.g.visible = p.lift < 8.5;
      r.tall = Math.abs(p.tilt) < 0.4 && !r.gone;
      const fallen = Math.abs(p.tilt) > 1.2;
      r.proxy.position.set(fallen ? r.x + r.side * 0.88 : r.x, 0, r.z);
      r.proxy.rotation.set(0, Math.abs(p.yaw - Math.PI / 2) < 0.3 ? Math.PI / 2 : 0, 0);
      r.piece.col.w = fallen ? 1.75 : 0.7;
      r.piece.alive = !r.gone && (fallen || Math.abs(p.yaw) < 0.2 || Math.abs(p.yaw - Math.PI / 2) < 0.2) && (fallen || Math.abs(p.tilt) < 0.2);
    },
    update(dt, t) { for (const r of list) this.place(r, t); },
    black(k) {
      for (const r of list) { const a = r.bagM.geometry.attributes.color; for (let i = 0; i < a.array.length; i += 3) { const c = r.base; const isGold = c[i] > 0.85 && c[i + 1] > 0.6 && c[i + 1] < 0.75 && c[i + 2] < 0.35; const tr = isGold ? 1 : 0.02; a.array[i] = c[i] + (c[i] * tr - c[i]) * k; a.array[i + 1] = c[i + 1] + (c[i + 1] * tr - c[i + 1]) * k; a.array[i + 2] = c[i + 2] + (c[i + 2] * tr - c[i + 2]) * k; } a.needsUpdate = true; }
    },
  };
  return api;
}

// ================================================================================================ dress forms
// Porcelain torsos on tripods in costume sashes. Two strikes shatter one into glazed shards and glitter (a sliver
// of meter). Tall cover until broken. The gaslight (64.83) rebuilds them from their shards.
export const FORMS = [[-1.9, 3.4], [1.9, 3.4], [-7.2, -1.0], [7.2, 1.2], [-2.0, -4.4], [2.6, -4.4]];
export function dressForms(R) {
  const f = R.f, M = R.mat;
  const torso = new THREE.LatheGeometry([[0.0, 0.0], [0.17, 0.0], [0.2, 0.06], [0.19, 0.2], [0.14, 0.34], [0.17, 0.48], [0.2, 0.56], [0.17, 0.66], [0.07, 0.72], [0.05, 0.8], [0.06, 0.84], [0.0, 0.86]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
  torso.translate(0, 0.72, 0);
  const legs = merge([cyl(0.025, 0.025, 0.8, 0, 0.36, 0, 8), ...[0, 1, 2].map((k) => { const g = new THREE.CylinderGeometry(0.014, 0.014, 0.6, 6); g.rotateZ(1.05); g.rotateY(k * TAU / 3); g.translate(Math.cos(k * TAU / 3) * 0.24, 0.13, -Math.sin(k * TAU / 3) * 0.24); return g; })]);
  const sashM = new THREE.MeshPhysicalMaterial({ color: 0xff6a13, roughness: 0.35, clearcoat: 0.5, side: THREE.DoubleSide });
  const sashG = (() => { const g = new THREE.CylinderGeometry(0.205, 0.215, 0.09, 28, 1, true); g.rotateZ(0.5); g.translate(0, 1.1, 0); return g; })();
  const list = [];
  FORMS.forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rnd() * TAU;
    const t = new THREE.Mesh(torso, M.porcelain), l = new THREE.Mesh(legs, M.gold), s = new THREE.Mesh(sashG, i % 2 ? sashM : M.gold);
    for (const m of [t, l, s]) { m.castShadow = true; g.add(m); }
    R.stage.group.add(g);
    const piece = R.stage.add(g, { collider: { type: 'circle', r: 0.38 }, solid: true, tag: 'form',
      breakable: { hp: 2, chips: new THREE.Color(2.2, 2.1, 2.0), glitter: new THREE.Color(3, 2.2, 0.8), onBreak: () => { f.player.addMeter(0.05); R.snd.porcelain(x); } } });
    list.push({ g, piece, x, z });
  });
  return {
    list,
    at(t) { /* stage.reset() restores every form; nothing to derive */ },
    // the gaslight: every broken form rebuilds itself from its shards
    mend() { for (const p of list) if (!p.piece.alive) { p.piece.alive = true; p.piece.hp = 2; p.g.visible = true; p.g.scale.setScalar(0.01); R.keep(null, f.t + 0.6, { tick: (tt) => p.g.scale.setScalar(Math.max(0.01, ease(step(tt, f.t, f.t + 0.5)))) }); f.fx.glitter(p.x, 1.1, p.z, new THREE.Color(3, 2.2, 0.8), 16, 0.6); } },
  };
}

// ================================================================================================ curtains
// Oxblood velvet on gold rings at x = -9 across the three booths. Closed until "IN-to" (17.42), all open; the centre
// closes behind her on "ROOM" (18.15). Returns and rings go through the velvet and cut it: two ring passes or one
// return and it hangs open in tatters. The gaslight draws them again; on "SEE-through" (71.06) they go sheer.
export const BOOTHS = [-3.6, 0.0, 3.6];
export function curtains(R) {
  const f = R.f, M = R.mat;
  const W = 2.6, Hh = 2.5;
  const half = (() => { const g = new THREE.PlaneGeometry(W / 2, Hh, 24, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i); p.setZ(i, Math.sin((u / (W / 2) + 0.5) * 7 * Math.PI) * 0.05); } g.computeVertexNormals(); g.rotateY(Math.PI / 2); return g; })();
  const tatters = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#000'; for (let i = 0; i < 9; i++) { const x = rnd() * w, y0 = h * (0.25 + rnd() * 0.3); c.beginPath(); c.moveTo(x - 14, h); c.lineTo(x - 3, y0); c.lineTo(x + 5, y0 + 20); c.lineTo(x + 16, h); c.fill(); } }, false);
  const velvet = M.velvet, torn = velvet.clone(); torn.alphaMap = tatters; torn.alphaTest = 0.5;
  const sheerMat = new THREE.MeshPhysicalMaterial({ color: 0x5a0a14, roughness: 0.6, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const tornMat = torn;
  const list = BOOTHS.map((z, i) => {
    const g = new THREE.Group(); g.position.set(-9.05, 0.06, z);
    const a = new THREE.Mesh(half, velvet), b = new THREE.Mesh(half, velvet);
    a.position.set(0, Hh / 2, -W / 4); b.position.set(0, Hh / 2, W / 4);
    for (const m of [a, b]) { m.castShadow = true; g.add(m); }
    R.group.add(g);
    const proxy = new THREE.Object3D(); proxy.position.set(-9.05, 0, z); R.stage.group.add(proxy);
    const piece = R.stage.add(proxy, { collider: { type: 'box', w: 0.16, d: W }, solid: true, tag: 'curtain' });
    return { g, a, b, z, piece, open: 0, openT: 0, hp: 2, torn: false, sheer: false, lift: 0 };
  });
  const api = {
    list,
    centre: list[1],
    _set(c, open, torn, sheer, lift = 0) {
      c.open = open; c.torn = torn; c.sheer = sheer; c.lift = lift;
      c.a.material = c.b.material = sheer ? sheerMat : torn ? tornMat : velvet;
    },
    at(t) {
      for (const c of list) { c.hp = 2; c.anim = null; this._set(c, 0, false, false); }
      if (t >= 17.42 && t < 64.83) for (const c of list) this._set(c, 1, false, false);
      if (t >= 18.15 && t < 22.28) this._set(list[1], 0, false, false);
      if (t >= 22.28 && t < 64.83) this._set(list[1], 0.75, true, false);
      if (t >= 71.06) for (const c of list) this._set(c, 0, false, true, t >= 77.15 ? 0.5 : 0);
      if (t >= 144.99) for (const c of [list[0], list[2]]) this._set(c, 1, false, true, 0.5);
    },
    event(what, t) {
      if (what === 'open') for (const c of list) c.anim = { from: c.open, to: 1, t0: t, dur: 0.22 };
      else if (what === 'in') list[1].anim = { from: list[1].open, to: 0, t0: t, dur: 0.2 };
      else if (what === 'out') { const c = list[1]; c.torn = true; c.a.material = c.b.material = tornMat; c.anim = { from: c.open, to: 0.75, t0: t, dur: 0.25 }; }
      else if (what === 'mend') for (const c of list) { c.torn = false; c.a.material = c.b.material = velvet; c.anim = { from: c.open, to: 0, t0: t, dur: 0.4 }; }
      else if (what === 'sheer') for (const c of list) { c.sheer = true; c.a.material = c.b.material = sheerMat; }
      else if (what === 'rise') for (const c of list) c.lift = 0.5;
      else if (what === 'walk') for (const c of [list[0], list[2]]) c.anim = { from: c.open, to: 1, t0: t, dur: 0.25 };
    },
    // a return or a ring went through the centre curtain while she's in the booth
    cut(kind) {
      const c = list[1]; if (c.open > 0.6) return;
      c.hp -= kind === 'return' ? 2 : 1;
      f.fx.emit(10, { x: -9.05, y: 1.4, z: c.z, color: new THREE.Color(0.6, 0.05, 0.1), shape: 2, speed: 3, life: 0.8, size: 0.06, gravity: 6, up: 0.4 });
      R.snd.cloth(-9);
      if (c.hp <= 0) { c.torn = true; c.a.material = c.b.material = tornMat; c.anim = { from: c.open, to: 0.75, t0: f.t, dur: 0.25 }; }
    },
    update(dt, t) {
      for (const c of list) {
        if (c.anim) { const k = ease(step(t, c.anim.t0, c.anim.t0 + c.anim.dur)); c.open = c.anim.from + (c.anim.to - c.anim.from) * k; if (k >= 1) c.anim = null; }
        // open: each half gathers to its edge
        const s = 1 - 0.82 * c.open;
        c.a.scale.set(1, 1 - c.lift * 0.35, s); c.b.scale.set(1, 1 - c.lift * 0.35, s);
        c.a.position.set(0, Hh / 2 + c.lift * 0.42, -W / 2 + (W / 4) * s); c.b.position.set(0, Hh / 2 + c.lift * 0.42, W / 2 - (W / 4) * s);
        // sway a little
        const sw = Math.sin(t * 1.7 + c.z) * 0.02 * (1 - c.open);
        c.a.rotation.z = sw; c.b.rotation.z = -sw;
        c.piece.alive = c.open < 0.5;
      }
    },
  };
  return api;
}

// ================================================================================================ the pegboard wall
// Orange pegboard across the back of the room, rubber masks hanging on it in rows. On "live" (4.96) every mask turns
// its face to YOU at once. It flies out into the flies over two bars from 107.99, and the party is behind it.
export function pegboard(R) {
  const f = R.f;
  const tex = canvasTex(1024, 256, (c, w, h) => {
    c.fillStyle = '#e8590f'; c.fillRect(0, 0, w, h);
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,170,80,0.18)'); g.addColorStop(1, 'rgba(60,10,0,0.3)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#4a1504'; for (let y = 6; y < h; y += 12) for (let x = 6; x < w; x += 12) { c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill(); }
    c.fillStyle = '#e2ae4c'; c.fillRect(0, h - 10, w, 10); c.fillRect(0, 0, w, 6);
  });
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(4, 1);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(22.6, 5.2), mat); wall.position.set(0, 2.6, -7.06); wall.receiveShadow = true;
  const g = new THREE.Group(); g.add(wall);
  // masks: a rubber head (a squashed sphere), dark eye holes and mouth, five kinds of colour
  const head = new THREE.SphereGeometry(0.2, 16, 12); head.scale(0.85, 1.1, 0.55);
  const holes = merge([new THREE.SphereGeometry(0.04, 8, 6).translate(-0.07, 0.05, 0.1), new THREE.SphereGeometry(0.04, 8, 6).translate(0.07, 0.05, 0.1), new THREE.SphereGeometry(0.06, 8, 6).scale(1.4, 0.6, 1).translate(0, -0.1, 0.1)]);
  const MC = [0xd9cfc2, 0x3d7a3a, 0xb21e2a, 0x5a2a7a, 0xe0c060, 0xf4ece4, 0x2a2a2a];
  const pos = []; for (let row = 0; row < 3; row++) for (let i = 0; i < 16; i++) { const x = -10.2 + i * 1.36 + (row % 2) * 0.68; if (Math.abs(x) < 3.6 && row === 0) continue; pos.push([x, 2.2 + row * 0.95]); }
  const masks = new THREE.InstancedMesh(head, new THREE.MeshPhysicalMaterial({ roughness: 0.45, clearcoat: 0.3 }), pos.length);
  const eyes = new THREE.InstancedMesh(holes, new THREE.MeshBasicMaterial({ color: 0x050203 }), pos.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  pos.forEach(([x, y], i) => masks.setColorAt(i, new THREE.Color(MC[i % MC.length])));
  g.add(masks, eyes);
  R.group.add(g);
  const turnT = 4.96;
  const api = {
    g, mat,
    yaw: pos.map(() => (rnd() - 0.5) * 0.4), want: pos.map(() => 0),
    face(t) {
      const toYou = t >= turnT;
      pos.forEach(([x, y], i) => {
        let yaw = api.yaw[i], pitch = 0;
        if (toYou) { yaw = Math.atan2(f.player.x - x, f.player.z + 7.0) * 0.8; pitch = -0.35; }
        api.want[i] = yaw;
        e.set(pitch, yaw, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, y, -6.95), q, new THREE.Vector3(1, 1, 1));
        masks.setMatrixAt(i, m4); eyes.setMatrixAt(i, m4);
      });
      masks.instanceMatrix.needsUpdate = true; eyes.instanceMatrix.needsUpdate = true;
    },
    at(t) { this.lift(t); this.face(t); this.ticked = t >= turnT; },
    lift(t) { const k = step(t, 107.99, 110.65); g.position.y = 6.2 * ease(k); g.visible = k < 0.999; },
    update(dt, t) {
      this.lift(t);
      if (!this.ticked && t >= turnT) { this.ticked = true; R.snd.ticks(pos.map(([x]) => x)); }
      if (t >= turnT - 0.1 && g.visible) this.face(t);
      // the wall glows a little with the state's light (it is lit in real time, not in the bake)
      const L = R._lightsAt || { a: 'shop', b: 'shop', k: 0 };
      const lv = (n) => ({ till: 0.08, shop: 0.32, uv: 0.12, mirror: 0.12, dark: 0.02, hell: 0.14 }[n] ?? 0.2);
      mat.emissiveIntensity = (lv(L.a) * (1 - L.k) + lv(L.b) * L.k) * R.exposureK;
      mat.emissive.setRGB(L.a === 'uv' || L.b === 'uv' ? 0.6 : 1, L.a === 'hell' ? 0.25 : 0.75, L.a === 'uv' ? 1 : 0.6);
    },
    black(k) { mat.color.setRGB(1 - 0.97 * k, 1 - 0.97 * k, 1 - 0.97 * k); },
  };
  return api;
}

// ================================================================================================ the party riser
// Behind the pegboard: a raised stage, a DJ's turntable spinning, jack-o'-lanterns, gold streamers, and twelve
// porcelain guests in cheap "sexy YOU" costumes (built by guests.js once the kit is loaded).
export function riser(R) {
  const g = new THREE.Group(); R.group.add(g);
  const M = R.mat;
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 32), new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.25, clearcoat: 1 }));
  plat.position.set(0, 1.68, -9.35); g.add(plat);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 24), new THREE.MeshStandardMaterial({ color: 0xff6a13, emissive: 0xff6a13, emissiveIntensity: 0.4 }));
  label.position.copy(plat.position); g.add(label);
  const lanternG = new THREE.SphereGeometry(0.16, 16, 10); lanternG.scale(1.1, 0.85, 1.1);
  const lanternM = new THREE.MeshStandardMaterial({ color: 0xff6a13, emissive: 0xff8a2a, emissiveIntensity: 0, roughness: 0.6 });
  const lanterns = new THREE.InstancedMesh(lanternG, lanternM, 9);
  for (let i = 0; i < 9; i++) { const m = new THREE.Matrix4().makeTranslation(-9 + i * 2.25, 0.78, -7.5); lanterns.setMatrixAt(i, m); }
  g.add(lanterns);
  // streamers: gold strips hanging from the flies
  const sm = new THREE.MeshStandardMaterial({ color: 0xe2ae4c, metalness: 1, roughness: 0.3, side: THREE.DoubleSide });
  const sg = []; for (let i = 0; i < 22; i++) { const p = new THREE.PlaneGeometry(0.08, 1.4 + rnd()); p.translate(-10.5 + i, 4.4 - rnd() * 0.4, -8 - rnd() * 2); p.rotateY(0); sg.push(p); }
  g.add(new THREE.Mesh(merge(sg), sm));
  g.visible = false;
  return {
    g, guests: null,
    at(t) { g.visible = t >= 107.5; this.update(0, t); },
    update(dt, t) {
      if (t >= 107.5 !== g.visible) g.visible = t >= 107.5;
      if (!g.visible) return;
      plat.rotation.y = label.rotation.y = t * 3.5;
      lanternM.emissiveIntensity = t >= 107.99 ? 0.45 : 0;
    },
  };
}

// ================================================================================================ the mirror's glass
// The tri-fold mirror's three panels (their gilt frames and bulbs are baked). The bulbs flash on with "MIR-ror"
// (19.12); YOU's reflection lives in reflection.js. It bursts on the bar with no bass (85.31).
export const MIRROR = { x: -8.6, z: -5.4, face: Math.atan2(0.7, 0.7) };
export function mirrorGlass(R) {
  const f = R.f;
  const env = new THREE.MeshStandardMaterial({ color: 0x9a948c, metalness: 1, roughness: 0.03, envMapIntensity: 1.4 });
  const g = new THREE.Group(); R.group.add(g);
  const panels = [];
  [0.62, 0.0, -0.62].forEach((da, i) => {
    const a = MIRROR.face + da, off = (i - 1) * 1.08;
    const rx = Math.cos(MIRROR.face), rz = -Math.sin(MIRROR.face);
    const fw = i !== 1 ? 0.18 : 0;
    const cx = MIRROR.x + rx * off + Math.sin(MIRROR.face) * fw, cz = MIRROR.z + rz * off + Math.cos(MIRROR.face) * fw;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.6), env);
    p.position.set(cx + Math.sin(a) * 0.01, 1.42, cz + Math.cos(a) * 0.01); p.rotation.y = a;
    g.add(p); panels.push({ mesh: p, a, cx, cz });
  });
  return {
    g, panels, bulbsOn: false, burst: false,
    at(t) { this.bulbsOn = t >= 19.12; this.burst = t >= 85.31; for (const p of panels) p.mesh.visible = !this.burst; this.flicker = 0; },
    update(dt, t) {
      // the bulbs are a baked material; before "mirror" they stay dark, and they stutter as the glass cracks
      const on = this.bulbsOn && !this.burst ? 1 : this.burst ? 0.25 : 0;
      // (an irregular stutter, a few times a second: a failing contact, not a strobe)
      const crack = t >= 84.0 && t < 85.31 ? (Math.sin(t * 17) * Math.sin(t * 7.3) > -0.15 ? 1 : 0.5) : 1;
      for (const m of R.arenaMats.stc_bulbs || []) { m.userData.e0 ||= m.emissive.clone(); if (!this.bulbsOn) m.emissive.setRGB(0, 0, 0); else m.emissive.copy(m.userData.e0.clone().multiplyScalar(Math.max(on, 0.0) * crack + (on ? 0 : 0))).addScalar(on ? 0.6 * crack : 0); }
    },
    shatter() {
      this.burst = true; for (const p of panels) p.mesh.visible = false;
      for (const p of panels) { f.fx.emit(30, { x: p.cx, y: 1.4, z: p.cz, color: new THREE.Color(2.4, 2.5, 2.8), shape: 2, speed: 7, life: 1.0, size: 0.07, gravity: 12, angle: p.a, spread: 1.4, up: 0.4, bounce: 0.3 }); }
      R.snd.glass(MIRROR.x);
    },
  };
}

// ================================================================================================ the shutter, the bins
export function shutter(R) {
  const tex = canvasTex(64, 256, (c, w, h) => { c.fillStyle = '#8a8f96'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { c.fillStyle = '#5a5e66'; c.fillRect(0, y, w, 2); c.fillStyle = '#b8bec6'; c.fillRect(0, y + 2, w, 1); } });
  tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 6);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.3), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.7, roughness: 0.4 }));
  m.rotation.y = -Math.PI / 2; m.position.set(11.12, 1.65, 0); R.group.add(m);
  return {
    m, rattled: false,
    at(t) { this.place(t); this.rattled = t >= 69.36; },
    place(t) { const k = t < 69.36 ? 0 : t < 69.99 ? 0.85 * step(t, 69.36, 69.99) : 1; m.scale.y = Math.max(0.02, 1 - k); m.position.y = 3.3 - 1.65 * (1 - k); m.visible = k < 0.99; },
    update(dt, t) { this.place(t); if (!this.rattled && t >= 69.36) { this.rattled = true; R.snd.rattle(t); } },
  };
}
// two wire bins of costumes that roll out of the clearance bay at 69.99 and stand at (+8.4, -1.9), (+8.4, +2.1)
export const BINS = [[8.4, -1.9], [8.4, 2.1]];
export function bins(R) {
  const f = R.f, M = R.mat;
  const wire = merge([box(1.4, 0.04, 1.0, 0, 0.88, 0), box(1.4, 0.04, 0.04, 0, 0.45, -0.5), box(1.4, 0.04, 0.04, 0, 0.45, 0.5), box(0.04, 0.9, 1.0, -0.7, 0.45, 0), box(0.04, 0.9, 1.0, 0.7, 0.45, 0),
    ...[-0.6, -0.3, 0, 0.3, 0.6].map((x) => box(0.02, 0.9, 1.0, x, 0.45, 0))]);
  const stuff = merge([colorize(box(1.3, 0.5, 0.9, 0, 0.55, 0), new THREE.Color(0xff6a13)), colorize(box(0.5, 0.3, 0.4, -0.3, 0.9, 0.1), new THREE.Color(0x4a1a6a)), colorize(box(0.4, 0.25, 0.5, 0.3, 0.85, -0.1), new THREE.Color(0xe2ae4c)), colorize(box(0.6, 0.2, 0.3, 0.1, 0.95, 0.25), new THREE.Color(0xb01428))]);
  const list = BINS.map(([x, z], i) => {
    const g = new THREE.Group(); g.add(new THREE.Mesh(wire, M.chrome), new THREE.Mesh(stuff, M.bags));
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    R.stage.group.add(g);
    const piece = R.stage.add(g, { collider: { type: 'box', w: 1.4, d: 1.0 }, solid: true, tag: 'bin',
      breakable: { hp: 3, chips: new THREE.Color(2.0, 0.9, 0.3), onBreak: () => { f.player.addMeter(0.05); R.snd.wire(x); } } });
    return { g, piece, x, z };
  });
  const T0 = 69.99, T1 = 70.67, GONE = 75.33;
  return {
    list,
    at(t) { for (const b of list) this.place(b, t); },
    place(b, t) {
      const k = ease(step(t, T0, T1));
      b.g.position.set(12.6 + (b.x - 12.6) * k, 0, b.z);
      const show = t >= T0 - 0.05 && t < GONE;
      if (!show) { b.g.visible = false; b.piece.alive = false; }
      else if (b.piece.alive || t < T0 + 0.01) { b.g.visible = b.piece.alive = true; }
      b.piece.solid = k > 0.95;
    },
    update(dt, t) { for (const b of list) { if (t < T1 + 0.05 || t >= GONE - 0.02) this.place(b, t); } },
    whole() { return list.filter((b) => b.piece.alive && b.g.visible); },
  };
}

// ================================================================================================ the stock on the shelves
export function shelfBoxes(R) {
  const BC = [0xff6a13, 0x0e080b, 0x2a0a20, 0xf4ece4, 0xc87a8e, 0x4a1a6a, 0xe2ae4c, 0x8a1a2a];
  const g0 = new THREE.BoxGeometry(1, 1, 1);
  const items = [];
  for (const [z0, z1] of [[-7.0, -2.75], [2.75, 7.0]]) for (let k = 0; k < 6; k++) {
    let z = z0 + 0.08;
    while (z < z1 - 0.3) { const w = 0.35 + rnd() * 0.3, h = 0.3 + rnd() * 0.32, d = 0.4 + rnd() * 0.08; if (z + w > z1 - 0.06) break; items.push({ x: 10.68 - rnd() * 0.04, y: 0.155 + k * 0.72 + h / 2, z: z + w / 2, w: d, h, d: w, c: new THREE.Color(BC[Math.floor(rnd() * BC.length)]) }); z += w + 0.03; }
  }
  const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.4 });
  const mesh = new THREE.InstancedMesh(g0, mat, items.length);
  const m4 = new THREE.Matrix4();
  items.forEach((b, i) => { m4.compose(new THREE.Vector3(b.x, b.y, b.z), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d)); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, b.c); });
  mesh.castShadow = true; mesh.receiveShadow = true;
  R.group.add(mesh);
  return {
    mesh, items,
    at() {},
    black(k) { items.forEach((b, i) => { const c = b.c.clone().lerp(new THREE.Color(0x07050a), k * (i % 7 === 0 ? 0 : 1)); if (i % 7 === 0) c.lerp(new THREE.Color(0xe2ae4c), k); mesh.setColorAt(i, c); }); mesh.instanceColor.needsUpdate = true; },
  };
}

// ================================================================================================ the moving heads
// Four moving-head spotlights at the corners of the ceiling rig: beams of light (additive cones) that swing round and
// converge on someone. Her spotlight before YOU has one (32.00-33.33), on the mirror's burst, onto YOU at the truth.
const BEAM_VS = `varying float vY; varying vec3 vN; varying vec3 vW; void main(){ vY = uv.y; vN = normalize(normalMatrix * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const BEAM_FS = `uniform vec3 uC; uniform float uA; varying float vY; varying vec3 vN; varying vec3 vW;
  void main(){ float edge = pow(abs(vN.z), 1.6); float a = uA * edge * (0.25 + 0.75 * vY) * smoothstep(0.0, 0.15, vY); gl_FragColor = vec4(uC * a, a); }`;
export function movingHeads(R) {
  const f = R.f;
  const corners = [[-10.4, 4.9, -6.6], [10.4, 4.9, -6.6], [-10.4, 4.9, 6.4], [10.4, 4.9, 6.4]];
  const g = new THREE.Group(); R.group.add(g);
  const beams = corners.map(([x, y, z], i) => {
    const geo = new THREE.CylinderGeometry(0.06, 0.9, 1, 24, 1, true); geo.translate(0, -0.5, 0); geo.rotateX(-Math.PI / 2);   // along +z, apex at 0
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: BEAM_VS, fragmentShader: BEAM_FS, uniforms: { uC: { value: new THREE.Color(1.0, 0.95, 0.9) }, uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.layers.set(LAYER.NO_REFLECT); m.renderOrder = 9; m.frustumCulled = false;
    g.add(m);
    return { m, from: new THREE.Vector3(x, y, z), aim: new THREE.Vector3(x * 0.4, 0, z * 0.4), cur: new THREE.Vector3(x * 0.4, 0, z * 0.4), a: 0 };
  });
  // the pool where they meet
  const pool = floorDecal(new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uA; varying vec2 vU; void main(){ float d = length(vU); float a = uA * smoothstep(1.0, 0.3, d); gl_FragColor = vec4(vec3(1.0,0.96,0.9) * a, a); }' })));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.015; g.add(pool);
  const api = {
    beams, pool, target: null, t0: 0, t1: 0, toYou: false, strobe: false,
    focus(who, t0, t1) { this.target = who; this.t0 = t0; this.t1 = t1; },
    at(t) { this.target = null; this.toYou = false; },
    update(dt, t) {
      // when do they show: her spotlight, YOU's spotlight (or the meter full), the truth, the black light's strobes
      const full = f.player.meter >= 1 && t > 33.33;
      let who = null, k = 0, alpha = 0;
      if (this.target && t >= this.t0 && t < this.t1 + 0.35) { who = this.target; k = step(t, this.t0, this.t1); alpha = 0.25 + 0.75 * k; if (t > this.t1) alpha *= 1 - step(t, this.t1, this.t1 + 0.35); }
      else if (f.spotUntil > 0 || this.toYou) { who = f.player; k = 1; alpha = 0.9; }
      else if (t >= 179.99 && t < 182.66) { who = f.player; k = step(t, 179.99, 181.99); alpha = 0.3 + 0.6 * k; }
      else if (full) { who = f.player; k = 0.5; alpha = 0.22 + 0.08 * Math.sin(t * 6); }
      for (const [i, b] of beams.entries()) {
        let aim;
        if (who) aim = new THREE.Vector3(who.x + Math.sin(i * 2.1) * (1 - k) * 4, 0, who.z + Math.cos(i * 1.7) * (1 - k) * 4);
        else aim = new THREE.Vector3(b.from.x * 0.45 + Math.sin(t * 0.4 + i) * 3, 0, b.from.z * 0.45 + Math.cos(t * 0.33 + i * 2) * 2);
        b.cur.lerp(aim, Math.min(1, dt * (who ? 7 : 1.5)));
        const d = b.cur.clone().sub(b.from), len = d.length();
        b.m.scale.set(0.5 + len * 0.05, 0.5 + len * 0.05, len);
        b.m.lookAt(b.cur);
        b.a += ((who ? alpha : 0) - b.a) * Math.min(1, dt * 8);
        b.m.material.uniforms.uA.value = b.a * 0.16;
        b.m.visible = b.a > 0.01;
      }
      pool.material.uniforms.uA.value = who ? alpha * 0.35 * k : 0;
      if (who) { pool.position.x = who.x; pool.position.z = who.z; pool.scale.setScalar(1.1 + (1 - k) * 2); }
    },
  };
  return api;
}

// ================================================================================================ the register
// An old brass register on the counter with pop-up number flags ($29.99), and a receipt printer beside it.
export function register(R) {
  const M = R.mat;
  const g = new THREE.Group(); g.position.set(1.8, 1.05, -6.15); R.group.add(g);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89a4a, metalness: 1, roughness: 0.3 });
  g.add(new THREE.Mesh(merge([box(0.62, 0.28, 0.5, 0, 0.14, 0), (() => { const b = box(0.62, 0.18, 0.3, 0, 0.32, -0.08); return b; })(), box(0.5, 0.06, 0.2, 0, 0.26, 0.2)]), brass));
  const keys = new THREE.Mesh(box(0.46, 0.03, 0.18, 0, 0.3, 0.17), new THREE.MeshStandardMaterial({ color: 0xf4ece4, roughness: 0.4 }));
  keys.rotation.x = -0.4; g.add(keys);
  // the flags: six little plates in a row, each a printed character, hidden until they pop up
  const chars = ['$', '2', '9', '.', '9', '9'];
  const flags = chars.map((ch, i) => {
    const t = canvasTex(64, 96, (c, w, h) => { c.fillStyle = '#f6efe2'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c89a4a'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); c.fillStyle = '#b01428'; c.font = 'bold 64px "Archivo Black", Arial Black, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, w / 2, h / 2 + 4); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.13), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
    m.position.set(-0.22 + i * 0.088, 0.5, -0.15); g.add(m);
    return { m, at: i < 3 ? 183.82 : 184.48 };
  });
  // the receipt printer
  const printer = new THREE.Mesh(box(0.28, 0.16, 0.3, 0.55, 0.08, 0.02), M.black); g.add(printer);
  return {
    g, flags, printerAt: new THREE.Vector3(2.35, 1.2, -5.95),
    at(t) { for (const fl of flags) fl.m.position.y = t >= fl.at ? 0.5 : 0.36; this.rung = t >= 183.32; },
    update(dt, t) {
      for (const fl of flags) { const k = step(t, fl.at, fl.at + 0.08); fl.m.position.y = 0.36 + 0.14 * k + (k > 0 && k < 1 ? 0.02 : 0); }
      if (!this.rung && t >= 183.32) { this.rung = true; R.snd.bell(); }
    },
  };
}

// ================================================================================================ the jack-o'-lanterns on the cases
export function lanterns(R) {
  const geo = new THREE.SphereGeometry(0.16, 16, 10); geo.scale(1.15, 0.85, 1.15);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff6a13, emissive: 0xff7a1a, emissiveIntensity: 0, roughness: 0.6 });
  const xs = [-9, -6.4, -3.8, 3.8, 6.4, 9];
  const mesh = new THREE.InstancedMesh(geo, mat, xs.length);
  xs.forEach((x, i) => mesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 1.07, 6.6)));
  R.group.add(mesh);
  return { at(t) { this.update(0, t); }, update(dt, t) { const uv = (t >= 33.33 && t < 54.66) || (t >= 86.65 && t < 182.66); mat.emissiveIntensity = t >= 192.0 ? 2.2 : uv ? 1.0 : 0; } };
}

// ================================================================================================ confetti cannons
export function cannons(R) {
  const f = R.f;
  const pts = [[-10.6, -6.6], [10.6, -6.6], [-10.6, 6.6], [10.6, 6.6]];
  const COL = [new THREE.Color(3, 1.4, 0.4), new THREE.Color(3, 2.2, 0.8), new THREE.Color(2.4, 0.5, 1.6), new THREE.Color(2.2, 2.2, 2.4), new THREE.Color(1.2, 0.6, 2.8)];
  return {
    fire(t) {
      for (const [x, z] of pts) for (const c of COL) f.fx.emit(10, { x, y: 0.4, z, color: c, shape: 4, speed: 9, life: 2.2, size: 0.07, gravity: 3.5, angle: Math.atan2(-x, -z), spread: 0.7, up: 2.2, upVar: 0.6, drag: 1.4 });
      R.snd.pop();
    },
  };
}

// ================================================================================================ the returns sign (lyric sign 1)
// A store-policy board over the counter, neon tube script on two lines; each word lights as it's sung.
export function returnsSign(R) {
  const words = [['YOU', 49.10, 102.46], ["CAN'T", 49.62, 102.94], ['RETURN', 49.88, 103.20], ['IT', 50.14, 103.46], ['BUT', 50.34, 103.64], ['YOU', 50.48, 103.78], ['CAN', 50.60, 103.92], ['MAKE', 50.82, 104.12], ['IT', 50.98, 104.32], ['CUTE', 51.14, 104.48]];
  // a store-policy placard across the counter's front, where she rings you up (it reflects in the floor)
  const g = new THREE.Group(); g.position.set(0, 0.56, -5.47); R.group.add(g);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.86), new THREE.MeshPhysicalMaterial({ color: 0x0e080b, roughness: 0.2, clearcoat: 1 }));
  g.add(board);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 0.96), R.mat.gold); frame.position.z = -0.005; g.add(frame);
  const font = 'italic 700 92px Fraunces, Georgia, serif';
  const meas = document.createElement('canvas').getContext('2d'); meas.font = font;
  const lines = [words.slice(0, 4), words.slice(4)];
  const list = [];
  lines.forEach((ln, li) => {
    const widths = ln.map(([w]) => meas.measureText(w).width + 30);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = -total / 2;
    ln.forEach(([w, t1, t2], k) => {
      const tex = canvasTex(Math.ceil(widths[k]) + 40, 140, (c, cw, ch) => { c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#ff2e88'; c.shadowBlur = 22; c.fillStyle = '#ffd0e8'; c.fillText(w, cw / 2, ch / 2); c.shadowBlur = 0; c.fillStyle = '#fff4fa'; c.fillText(w, cw / 2, ch / 2); });
      const sc = 0.0032;
      const m = new THREE.Mesh(new THREE.PlaneGeometry((widths[k] + 40) * sc, 140 * sc), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: new THREE.Color(0.15, 0.08, 0.12) }));
      m.position.set((x + widths[k] / 2) * sc, li === 0 ? 0.19 : -0.2, 0.012);
      x += widths[k];
      g.add(m);
      list.push({ m, times: [t1, t2] });
    });
  });
  return {
    g, flicker: 0,
    at() { this.flicker = 0; },
    update(dt, t) {
      for (const w of list) {
        let on = 0;
        for (const tt of w.times) { if (t >= tt && t < tt + 6.0) on = Math.max(on, 1 - 0.65 * step(t, tt + 3.0, tt + 6.0)); }
        if (t >= 55 && on < 0.35) on = 0.35;              // between the choruses it stays dimly lit
        if (this.flicker > t) on *= Math.sin(t * 31) * Math.sin(t * 9) > -0.2 ? 1 : 0.3;
        const k = 0.15 + on * 2.6;
        w.m.material.color.setRGB(k, k * 0.92, k);
      }
    },
  };
}

// ================================================================================================ the follow spot (the bridge)
export function followPool(R) {
  const f = R.f;
  const pool = floorDecal(new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uA; varying vec2 vU; void main(){ float d = length(vU); float a = uA * (smoothstep(1.0, 0.82, d) * 0.85 + 0.15 * smoothstep(1.0, 0.0, d)); gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * a, a); }' })));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.016; pool.scale.setScalar(2.1); R.group.add(pool);
  // the light on the characters is the arena's own real-time lamp, turned to follow her (aim(), after the arena's update)
  return {
    on: 0,
    at(t) { this.update(0, t); },
    update(dt, t) {
      const on = t >= 129.33 && t < 141.15 && !(t >= 139.70 && t < 139.80) ? 1 : 0;
      this.on = on;
      pool.visible = on > 0;
      if (on) { const b = f.boss; pool.position.x += (b.x - pool.position.x) * Math.min(1, dt * 8 + (dt === 0 ? 1 : 0)); pool.position.z += (b.z + 0.25 - pool.position.z) * Math.min(1, dt * 8 + (dt === 0 ? 1 : 0)); pool.material.uniforms.uA.value = 0.16; }
    },
    aim(arena) {
      const lamp = arena && arena.lamp; if (!lamp || !this.on) return;
      const b = f.boss;
      lamp.position.set(b.x, 10.5, b.z + 3.6); lamp.target.position.set(b.x, 0.8, b.z);
      lamp.angle = 0.3; lamp.penumbra = 0.55; lamp.color.setRGB(1, 0.97, 0.92); lamp.intensity = 460; lamp.shadow.autoUpdate = true;
      lamp.updateMatrixWorld(); lamp.target.updateMatrixWorld();
    },
  };
}

// ================================================================================================ packages
// The things she throws: clamshell blister packs with a printed card (a picture, never a word), a bow; accessories;
// FINAL SALE boxes, black and gold with corners. A pool, so a throw costs nothing.
const CARD = {
  barrel: (c, w, h) => { c.fillStyle = '#ffd34a'; c.fillRect(0, 0, w, h); c.fillStyle = '#7a4a1a'; c.fillRect(w * 0.28, h * 0.45, w * 0.44, h * 0.38); c.fillStyle = '#5a3210'; for (let i = 0; i < 3; i++) c.fillRect(w * 0.28, h * (0.5 + i * 0.12), w * 0.44, 6); c.fillStyle = '#f4d0b0'; c.beginPath(); c.arc(w / 2, h * 0.33, w * 0.11, 0, TAU); c.fill(); c.fillStyle = '#b01428'; c.fillRect(w * 0.38, h * 0.18, w * 0.24, h * 0.06); },
  tie: (c, w, h) => { c.fillStyle = '#9fd3e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a2a6a'; c.beginPath(); c.moveTo(w * 0.45, h * 0.2); c.lineTo(w * 0.55, h * 0.2); c.lineTo(w * 0.6, h * 0.75); c.lineTo(w * 0.5, h * 0.88); c.lineTo(w * 0.4, h * 0.75); c.fill(); c.fillStyle = '#c8a030'; for (let i = 0; i < 4; i++) c.fillRect(w * 0.44, h * (0.35 + i * 0.12), w * 0.12, 5); },
  crayon: (c, w, h) => { c.fillStyle = '#fffdf2'; c.fillRect(0, 0, w, h); c.lineWidth = 7; c.strokeStyle = '#e03a2a'; c.beginPath(); c.moveTo(w * 0.2, h * 0.75); c.lineTo(w * 0.35, h * 0.45); c.lineTo(w * 0.5, h * 0.75); c.stroke(); c.strokeStyle = '#2a6ae0'; c.beginPath(); c.arc(w * 0.7, h * 0.4, w * 0.12, 0, TAU); c.stroke(); c.strokeStyle = '#f0c020'; c.beginPath(); c.arc(w * 0.25, h * 0.22, w * 0.08, 0, TAU); c.stroke(); },
  heart: (c, w, h) => { c.fillStyle = '#ffd6e6'; c.fillRect(0, 0, w, h); c.fillStyle = '#e01a5a'; c.beginPath(); c.moveTo(w / 2, h * 0.78); c.bezierCurveTo(w * 0.05, h * 0.5, w * 0.25, h * 0.15, w / 2, h * 0.35); c.bezierCurveTo(w * 0.75, h * 0.15, w * 0.95, h * 0.5, w / 2, h * 0.78); c.fill(); },
  box: (c, w, h) => { c.fillStyle = '#ff6a13'; c.fillRect(0, 0, w, h); c.fillStyle = '#0e080b'; c.fillRect(w * 0.15, h * 0.2, w * 0.7, h * 0.55); c.fillStyle = '#f4ece4'; c.beginPath(); c.arc(w / 2, h * 0.42, w * 0.14, 0, TAU); c.fill(); },
  bomb: (c, w, h) => { c.fillStyle = '#ff3a2a'; c.fillRect(0, 0, w, h); c.fillStyle = '#0e080b'; c.beginPath(); c.arc(w / 2, h * 0.55, w * 0.25, 0, TAU); c.fill(); c.strokeStyle = '#e2ae4c'; c.lineWidth = 6; c.beginPath(); c.moveTo(w * 0.62, h * 0.33); c.quadraticCurveTo(w * 0.75, h * 0.15, w * 0.85, h * 0.2); c.stroke(); },
  title: (c, w, h) => { c.fillStyle = '#0e080b'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff6a13'; c.fillRect(0, h * 0.82, w, h * 0.18); c.fillStyle = '#e2ae4c'; c.fillRect(0, 0, w, h * 0.06); c.fillStyle = '#f4ece4'; c.beginPath(); c.ellipse(w / 2, h * 0.45, w * 0.2, h * 0.28, 0, 0, TAU); c.fill(); c.fillStyle = '#8a2e14'; c.beginPath(); c.ellipse(w / 2, h * 0.3, w * 0.24, h * 0.16, 0, 0, TAU); c.fill(); },
  final: (c, w, h) => { c.fillStyle = '#0a0608'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e2ae4c'; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = '#f4ece4'; c.fillRect(w * 0.25, h * 0.4, w * 0.5, h * 0.2); },
};
export function packageFactory(R) {
  const cache = {};
  const blister = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.35, clearcoat: 1, depthWrite: false });
  const bowM = new THREE.MeshPhysicalMaterial({ color: 0xff3fa0, roughness: 0.3, clearcoat: 1 });
  const geo = (kind) => {
    if (cache[kind]) return cache[kind];
    const big = kind === 'title', fin = kind === 'final';
    const W = big ? 0.9 : 0.5, Hh = big ? 1.2 : 0.7;
    const tex = canvasTex(128, 180, CARD[kind] || CARD.box);
    const card = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 });
    const parts = [];
    parts.push(new THREE.Mesh(new THREE.BoxGeometry(W, Hh, 0.03), card));
    if (!fin) { const bl = new THREE.Mesh(new THREE.CapsuleGeometry(W * 0.32, Hh * 0.35, 4, 12), blister); bl.scale.z = 0.35; bl.position.z = 0.06; parts.push(bl); const bow = new THREE.Mesh(new THREE.TorusGeometry(W * 0.12, W * 0.04, 8, 16), bowM); bow.position.set(W * 0.3, Hh * 0.42, 0.03); parts.push(bow); }
    else { const corner = new THREE.Mesh(new THREE.BoxGeometry(W * 1.04, Hh * 1.04, 0.2), new THREE.MeshPhysicalMaterial({ color: 0x0a0608, roughness: 0.2, clearcoat: 1 })); corner.position.z = -0.1; parts.push(corner); }
    cache[kind] = parts; return parts;
  };
  const acc = {
    brooch: () => new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshStandardMaterial({ color: 0xe2ae4c, metalness: 1, roughness: 0.2 })),
    lipstick: () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0xe2ae4c, metalness: 1, roughness: 0.25 })); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.1, 12), new THREE.MeshPhysicalMaterial({ color: 0xb01428, roughness: 0.2, clearcoat: 1 })); s.position.y = 0.16; g.add(b, s); return g; },
    heartbox: () => { const s = new THREE.Shape(); s.moveTo(0, -0.2); s.bezierCurveTo(-0.3, 0.05, -0.15, 0.3, 0, 0.12); s.bezierCurveTo(0.15, 0.3, 0.3, 0.05, 0, -0.2); const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }); g.center(); return new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0xe01a5a, roughness: 0.25, clearcoat: 1 })); },
    shoe: () => { const g = new THREE.Group(); const sole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.28), new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: 0.1, clearcoat: 1 })); const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0xe2ae4c, metalness: 1, roughness: 0.25 })); heel.position.set(0, -0.06, -0.11); g.add(sole, heel); return g; },
    arm: () => { const g = new THREE.LatheGeometry([[0, 0], [0.04, 0.0], [0.05, 0.1], [0.045, 0.3], [0.035, 0.38], [0.05, 0.45], [0, 0.48]].map(([r, y]) => new THREE.Vector2(r, y)), 14); g.rotateZ(Math.PI / 2); return new THREE.Mesh(g, R.mat.porcelain); },
  };
  const api = {
    make(kind = 'box') {
      let obj;
      if (acc[kind]) obj = acc[kind]();
      else { obj = new THREE.Group(); for (const p of geo(kind)) obj.add(p.clone()); }
      obj.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      obj.userData.kind = kind;
      return obj;
    },
  };
  // one of every package, hidden in the room for the whole fight: their shaders compile at load and stay alive,
  // so the first of each kind she throws doesn't stop the game to compile (it did, for 60-150 ms each)
  const keep = new THREE.Group(); keep.name = 'package-keepers'; keep.visible = false;
  for (const k of [...Object.keys(CARD), ...Object.keys(acc)]) keep.add(api.make(k));
  R.group.add(keep);
  return api;
}

// ================================================================================================ small things
// the floor tears along a Divorce lane: a jagged dark gash with a gold rim
let tearTex = null;
export function tearDecal(R, sh) {
  tearTex ||= canvasTex(64, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    let x = w / 2; const pts = [];
    for (let y = 0; y <= h; y += 8) { x = w / 2 + Math.sin(y * 0.05) * 6 + (rnd() - 0.5) * 18; pts.push([x, y]); }
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(226,174,76,0.9)'; c.lineWidth = 16; c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.stroke();
    c.strokeStyle = 'rgba(8,2,4,1)'; c.lineWidth = 10; c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.stroke();
  });
  const len = Math.min(sh.h, 26);
  const m = floorDecal(new THREE.Mesh(new THREE.PlaneGeometry(0.4, len), new THREE.MeshBasicMaterial({ map: tearTex, transparent: true, depthWrite: false })));
  m.geometry.translate(0, len / 2, 0); m.geometry.rotateX(-Math.PI / 2);
  // after rotateX the length runs along local -z: turn it to run along the lane
  m.rotation.y = sh.angle + Math.PI; m.position.set(sh.x, 0.012, sh.z);
  return m;
}
// the yellow tape line that wraps round YOU (or her)
export function tapeRing(R, c) {
  const tex = canvasTex(512, 16, (g, w, h) => { g.fillStyle = '#f2d04a'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a120a'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 2, x % 40 === 0 ? 8 : 4); });
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(6, 1);
  const m = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.025, 4, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, transparent: true, opacity: 0.9, emissive: 0xf2d04a, emissiveIntensity: 0.35 }));
  m.rotation.x = Math.PI / 2; m.position.set(c.x, 0.9, c.z);
  return m;
}
// the giant one-size-fits-all hoop gown that drops over her (22.66) and falls apart (27.66)
// its material is made at load (transparent from the start, so the fade at the end needs no new shader) and kept
// on a hidden stand-in in the room, so the gown's first frame doesn't stop the game to compile it
export function dressMaterial(R) {
  if (R._dressMat) return R._dressMat;
  const tex = canvasTex(512, 64, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#ff6a13' : '#0e080b'; c.fillRect(i * w / 16, 0, w / 16, h); } c.fillStyle = '#e2ae4c'; c.fillRect(0, h - 8, w, 8); });
  const mat = R._dressMat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 0.8, sheen: 0.6, sheenColor: new THREE.Color(0xffa060), side: THREE.DoubleSide, transparent: true, opacity: 1 });
  const stand = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.2, 1), new THREE.Vector2(1, 0)], 8), mat); stand.visible = false; stand.castShadow = true; R.group.add(stand);
  return mat;
}
export function giantDress(R, t0) {
  const f = R.f, b = f.boss;
  const mat = dressMaterial(R); mat.opacity = 1;
  const prof = []; for (let i = 0; i <= 16; i++) { const k = i / 16; const y = 1.32 * (1 - k); const r = 0.2 + 1.3 * Math.pow(k, 1.6) + Math.sin(k * 40) * 0.015 * k; prof.push(new THREE.Vector2(r, y)); }
  const geo = new THREE.LatheGeometry(prof, 48);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i));
  const g = new THREE.Group(); const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m);
  const hem = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 6, 64), R.mat.gold); hem.rotation.x = Math.PI / 2; hem.position.y = 0.02; g.add(hem);
  R.group.add(g);
  let flareT = -9, gone = -1;
  R.dressFlare = () => { flareT = f.t; };
  R.dressGone = () => { gone = f.t; R.snd.cloth(b.x); f.fx.emit(60, { x: b.x, y: 1.0, z: b.z, color: new THREE.Color(1.6, 0.5, 0.1), shape: 4, speed: 4, life: 1.4, size: 0.12, gravity: 4, up: 1.2, drag: 1.5 }); };
  R.keep(g, 27.66 + 0.6, {
    tick: (t) => {
      g.position.set(b.x, 0, b.z);
      const drop = step(t, t0, t0 + 0.25); g.position.y = 6 * (1 - drop * drop);
      const fl = Math.max(0, 1 - (t - flareT) / 0.35); const s = 1 + 0.35 * fl * fl;
      g.scale.set(s, 1, s);
      if (gone > 0) { const k = step(t, gone, gone + 0.5); g.scale.set(s * (1 + k), 1 - k * 0.9, s * (1 + k)); mat.opacity = 1 - k; }
    },
    dispose: () => { geo.dispose(); R.dressFlare = null; R.dressGone = null; },
  });
}

// ================================================================================================ the hero package
// A giant clamshell comes down over the riser on "sexy trauma costume" (lands 170.99): its cover a glossy photo of
// YOU, pin-up, with the product's name across the top. The costume everyone has been wearing is her.
export function heroPackage(R) {
  const f = R.f, pl = f.player;
  // the photo: YOU, rendered once into a texture
  const rt = new THREE.WebGLRenderTarget(512, 1024, { colorSpace: THREE.SRGBColorSpace });
  try {
    const scene = new THREE.Scene();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(4, 6), new THREE.MeshBasicMaterial({ map: canvasTex(64, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ff8ab8'); g.addColorStop(0.6, '#ffd2a6'); g.addColorStop(1, '#ff6a13'); c.fillStyle = g; c.fillRect(0, 0, w, h); }) }));
    bg.position.set(0, 1.0, -1.2); scene.add(bg);
    const model = SkeletonUtils.clone(pl.h.model); const rig = new Rig(pl.rig.kit, model);
    rig.play('Idle_FoldArms_Loop', { fade: 0, offset: 0.3 }); rig.mixer.update(0.01);
    model.traverse((m) => { if (m.isMesh) m.frustumCulled = false; });
    rig.root.rotation.y = 0.35; scene.add(rig.root);
    scene.add(new THREE.HemisphereLight(0xffe8f0, 0x40202a, 1.6));
    const key = new THREE.DirectionalLight(0xfff0e0, 3.2); key.position.set(1.5, 2.5, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0xff70b0, 2.5); rim.position.set(-2, 2, -2); scene.add(rim);
    const cam = new THREE.PerspectiveCamera(24, 0.5, 0.1, 30); cam.position.set(0.3, 1.25, 4.6); cam.lookAt(0, 0.98, 0);
    const r = f.app.renderer, prev = r.getRenderTarget();
    r.setRenderTarget(rt); r.setClearColor(0xff8ab8, 1); r.clear(); r.render(scene, cam); r.setRenderTarget(prev); r.setClearColor(0x07040a, 1);
  } catch (e) { console.warn('hero package photo', e.message); }
  // It stands on the riser's front edge, left of the counter, turned a little toward the room: the band behind the
  // counter is the top of the game camera's picture, so a 6 m box at the back of the riser was never in it. This one
  // (a doll box a head taller than her, the photo life-size) is in frame whenever the fight is at the counter (the
  // till), and clear of the boss bar, the DJ desk, the lanterns and the guests.
  // (hung from the flies tipped toward the room like a display, so its top, the name, is in the tag's picture too)
  const g = new THREE.Group(); g.position.set(HERO.x, 12, HERO.z); g.rotation.set(HERO.tilt, 0.35, 0); R.group.add(g);
  const box = new THREE.Group(); box.scale.setScalar(HERO.s); box.position.y = -0.6 * HERO.s; g.add(box);
  const back = new THREE.Mesh(new THREE.BoxGeometry(3.0, 6.0, 0.25), new THREE.MeshPhysicalMaterial({ color: 0xff6a13, roughness: 0.2, clearcoat: 1 })); back.position.y = 3.6; box.add(back);
  const photoM = new THREE.MeshStandardMaterial({ map: rt.texture, roughness: 0.25, emissive: 0xffffff, emissiveMap: rt.texture, emissiveIntensity: 0.35 });
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 4.6), photoM); photo.position.set(0, 3.3, 0.14); box.add(photo);
  const nameT = canvasTex(1024, 256, (c, w, h) => { c.fillStyle = '#0e080b'; c.fillRect(0, 0, w, h); c.fillStyle = '#e2ae4c'; c.fillRect(0, h - 14, w, 14); c.font = '900 92px "Archivo Black", Arial Black, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ff6a13'; c.fillText('SEXY TRAUMA', w / 2, h * 0.32); c.fillStyle = '#f4ece4'; c.fillText('COSTUME', w / 2, h * 0.72); });
  const nameM = new THREE.MeshStandardMaterial({ map: nameT, emissive: 0xffffff, emissiveMap: nameT, emissiveIntensity: 0.6 });
  const name = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), nameM); name.position.set(0, 6.05, 0.15); box.add(name);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(3.0, 6.0, 0.8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.12, clearcoat: 1, depthWrite: false })); shell.position.set(0, 3.6, 0.42); box.add(shell);
  box.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  g.visible = false;
  let t0 = -1, t1 = -1, slammed = false;
  return {
    g, lit: -1,
    drop(a, b) { t0 = a; t1 = b; slammed = false; },
    at(t) { t0 = 169.33; t1 = 170.99; slammed = t >= t1; this.lit = t >= 179.99 ? 179.99 : -1; this.update(0, t); },
    update(dt, t) {
      if (t0 < 0 || t < t0) { g.visible = false; return; }
      g.visible = t < 214.9 || true;
      const k = M_step(t, t0, t1); g.position.y = HERO.y + 11 * (1 - k * k);
      if (!slammed && t >= t1) { slammed = true; f.cam.shake(0.3, 0.25); R.snd.thoom(); f.fx.emit(30, { x: HERO.x, y: 0.8, z: HERO.z + 0.3, color: new THREE.Color(1.4, 1.2, 1.1), shape: 0, speed: 3, life: 0.8, size: 0.4, gravity: -0.4, up: 0.2 }); }
      const glow = this.lit > 0 ? 0.35 + 1.4 * M_step(t, this.lit, this.lit + 1.0) : 0.35;
      photoM.emissiveIntensity = glow; nameM.emissiveIntensity = 0.6 + glow * 0.5;
    },
  };
}
const M_step = (t, a, b) => clamp01((t - a) / Math.max(1e-4, b - a));
// where the hero package stands (its base, on the riser's front edge), its scale (1 = the design's 3 x 6 m) and its
// tip toward the room (between two of the riser's front-row guests, at x -6.4 and -3.2, so no dancer's arms go
// through it; left of the boss bar in the tag's picture)
export const HERO = { x: -4.4, z: -7.35, s: 0.38, tilt: 0.3, y: 0.7 };

// ================================================================================================ the receipt's footer (lyric sign 3)
// Where a shop prints THANK YOU, COME AGAIN, she prints this, word by word, on the last receipt lying across the floor.
export function footer(R) {
  const words = [['SEE', 197.16], ['YOU', 198.24], ['BACK', 198.54], ['HERE', 199.20], ['WHEN', 199.88], ["YOU'RE", 200.46], ['READY', 201.38], ['FOR', 201.88], ['HELL', 203.56]];
  const tex = canvasTex(64, 64, (c) => { c.fillStyle = '#f2eee4'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#d8d0c0'; for (let y = 4; y < 64; y += 9) c.fillRect(6, y, 52, 2); });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const g = new THREE.Group(); R.group.add(g);
  const list = words.map(([w, t]) => {
    const tx = canvasTex(256, 64, (c, cw, ch) => { c.clearRect(0, 0, cw, ch); c.font = '700 46px "Courier New", Courier, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#16100c'; c.fillText(w, cw / 2, ch / 2 + 2); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, color: new THREE.Color(1, 1, 1) }));
    m.rotation.x = -Math.PI / 2; m.layers.set(LAYER.NO_REFLECT); m.renderOrder = 2; g.add(m);
    return { m, t };
  });
  return {
    tex, g,
    // lay the words along the last receipt, from YOU's end back toward the printer
    place(from, a, dist) { const d0 = Math.max(2, dist - 3.6); list.forEach((w, i) => { const d = d0 + i * 0.36; w.m.position.set(from.x + Math.sin(a) * d, 0.016, from.z + Math.cos(a) * d); }); this.placed = true; },
    at(t) { this.placed = false; this.update(0, t); },
    update(dt, t) { for (const w of list) { const on = this.placed && t >= w.t; w.m.visible = on; if (on) { const k = clamp01((t - w.t) / 0.25); w.m.material.opacity = k; w.m.material.color.setScalar(1.0 + 1.6 * (1 - k)); } } },
  };
}

// ================================================================================================ the mirror ball's specks, the black light's glow
// The mirror ball comes down at 118.66 (bridge A): slow specks of light wheel across everything. And under the black
// light anything white or gold glows: a violet fill on the porcelain (one hemisphere light, always there).
export function partyLight(R) {
  const f = R.f;
  const tex = canvasTex(512, 512, (c, w, h) => { c.clearRect(0, 0, w, h); let s = 99; const rr = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 260; i++) { const x = rr() * w, y = rr() * h, r = 1.5 + rr() * 3; const g = c.createRadialGradient(x, y, 0, x, y, r * 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2, 0, Math.PI * 2); c.fill(); } }, false);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 3);
  const specks = floorDecal(new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0.9, 0.85, 1.0), opacity: 0 })));
  specks.rotation.x = -Math.PI / 2; specks.position.set(0, 0.018, -1); R.group.add(specks);
  const hemi = new THREE.HemisphereLight(0x7a4cff, 0x140818, 0); R.group.add(hemi);
  const LV = { till: [0.32, 0xffb070], shop: [0.25, 0xfff0e0], uv: [1.5, 0x7a4cff], mirror: [0.3, 0xffe2b0], dark: [0.06, 0xfff0e0], hell: [0.35, 0xff3020] };
  return {
    at(t) { this.update(0, t); },
    update(dt, t) {
      const on = t >= 118.66 && t < 129.33 ? Math.min(1, (t - 118.66) / 1.2) : 0;
      specks.visible = on > 0; specks.material.opacity = on * 0.45 * R.exposureK; specks.rotation.z = t * 0.12;
      const L = R._lightsAt || { a: 'shop', b: 'shop', k: 0 };
      const A = LV[L.a] || LV.shop, B = LV[L.b] || LV.shop;
      hemi.intensity = (A[0] * (1 - L.k) + B[0] * L.k) * Math.min(1.2, R.exposureK);
      hemi.color.set(L.k > 0.5 ? B[1] : A[1]);
    },
  };
}
