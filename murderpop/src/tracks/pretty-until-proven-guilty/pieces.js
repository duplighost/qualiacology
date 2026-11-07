// Real-time set pieces for the Court of Public Opinion (design §4, §6). Each one is driven by song time and can be
// put back exactly as it is at any time t (rewinds, ?at=): setStateAt(t). The baked set is the shell; these are
// what moves: the pearl knife smiles, the motto on the bench, the giant key, the vanity and mirror flats...
import * as THREE from 'three';
import { zone } from './moves.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const KNIFE = new THREE.Color(0.75, 0.85, 1.05);   // the knives' circles: white, but quieter (a smile is many of them)
const ease = (k) => k * k * (3 - 2 * k);
const clamp01 = (k) => Math.max(0, Math.min(1, k));
export const M = {};
export function mats() {
  if (M.gold) return M;
  M.gold = new THREE.MeshPhysicalMaterial({ color: 0xd8a443, metalness: 1, roughness: 0.25 });
  M.brass = new THREE.MeshPhysicalMaterial({ color: 0xb88a3e, metalness: 1, roughness: 0.3 });
  M.chrome = new THREE.MeshPhysicalMaterial({ color: 0xf0f2f6, metalness: 1, roughness: 0.07 });
  M.pearl = new THREE.MeshPhysicalMaterial({ color: 0xffd6e4, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 1, iridescenceIOR: 1.6, sheen: 0.6, sheenColor: new THREE.Color(0xffb0d0) });
  M.lacquer = new THREE.MeshPhysicalMaterial({ color: 0x5a0f1e, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
  M.steel = new THREE.MeshPhysicalMaterial({ color: 0x2c3136, metalness: 0.8, roughness: 0.35 });
  M.cardboard = new THREE.MeshStandardMaterial({ color: 0xb48d5a, roughness: 0.85 });
  M.mirror = new THREE.MeshPhysicalMaterial({ color: 0xe8ecf2, metalness: 1, roughness: 0.03 });
  M.bulb = new THREE.MeshStandardMaterial({ color: 0x302010, emissive: new THREE.Color(0xffe2a8), emissiveIntensity: 2.5, roughness: 0.4 });
  M.plaster = new THREE.MeshStandardMaterial({ color: 0xefe4d2, roughness: 0.8 });
  M.black = new THREE.MeshPhysicalMaterial({ color: 0x19181a, metalness: 0.6, roughness: 0.35 });
  return M;
}
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = false; o.receiveShadow = true; return o; };

// ------------------------------------------------------------------------------------------ the knife smiles
// "Smile carved keen as a switchblade": pearl switchblades on brass stands rise through the marble in an arc around
// her, each with a white circle filling to its own flick. A court set piece: it runs even while she's guilty.
export class Knives {
  constructor(f, max = 48) {
    this.f = f; mats();
    const stand = new THREE.CylinderGeometry(0.035, 0.05, 1.0, 10); stand.translate(0, 0.5, 0);
    const handle = new THREE.CapsuleGeometry(0.03, 0.22, 4, 10); handle.rotateX(Math.PI / 2); handle.translate(0, 1.05, -0.1);
    const blade = new THREE.BufferGeometry();
    { const s = new THREE.Shape(); s.moveTo(0, -0.018); s.lineTo(0.26, -0.006); s.lineTo(0.3, 0.01); s.lineTo(0, 0.02); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: false }); g.translate(0, 0, -0.003); g.rotateY(-Math.PI / 2); blade.copy(g); }
    this.stands = new THREE.InstancedMesh(stand, M.brass, max); this.handles = new THREE.InstancedMesh(handle, M.pearl, max); this.blades = new THREE.InstancedMesh(blade, M.chrome, max);
    for (const m of [this.stands, this.handles, this.blades]) { m.count = 0; m.castShadow = false; m.frustumCulled = false; f.scene.add(m); }
    this.list = []; this.max = max; this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1, 1, 1); this._p = new THREE.Vector3(); this._e = new THREE.Euler();
  }
  // an arc of n knives at radius r around c, facing angle a0, spanning +-span degrees; rise [t0, t1]; flick times
  // from `flicks(i)`; retract at tOff. Zones: each knife's circle fills from `tele` to its flick.
  smile(o) {
    const f = this.f, n = o.n, span = o.span * Math.PI / 180, set = { o, knives: [] };
    for (let i = 0; i < n; i++) {
      const a = o.a0 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * 2 * span);
      const x = o.c.x + Math.sin(a) * o.r, z = o.c.z + Math.cos(a) * o.r;
      // a knife only rises through open marble: never through the bar rail, the boxes, the bench or a table
      if (f.arena && f.arena.resolve) { const p = f.arena.resolve(x, z, 0.3); if (Math.hypot(p.x - x, p.z - z) > 0.02) continue; }
      const k = { x, z, a, flick: o.flicks(i, n), set };
      set.knives.push(k); this.list.push(k);
      if (!o.silent) zone(f, { shape: 'circle', x, z, w: o.kr ?? 0.8, kind: 'knife', color: KNIFE, start: o.tele, end: k.flick, owner: 'court', silent: true, damage: 1, sound: false,
        onImpact: () => { f.ppg.snd.play('flick', { pan: f.pan(x), gain: 0.35, gate: 0.02 }); } });
    }
    // the smile's outline: a dim arc over the knives that rose (the knives' own circles carry the timing)
    if (o.arc && set.knives.length) {
      const rel = set.knives.map((k) => Math.atan2(Math.sin(k.a - o.a0), Math.cos(k.a - o.a0)));
      const lo = Math.min(...rel), hi = Math.max(...rel), pad = Math.min(span, 0.08 + 0.55 / o.r);
      const mid = o.a0 + (lo + hi) / 2, half = Math.min(span, (hi - lo) / 2 + pad);
      zone(f, { shape: 'arc', x: o.c.x, z: o.c.z, angle: mid, w: o.arc.w, h: o.arc.h, param: half, kind: 'dim', color: new THREE.Color(0.16, 0.18, 0.22), start: o.tele, end: o.arc.end, owner: 'court', noHurt: true, silent: true });
    }
    f.at(o.t0, () => { f.ppg.snd.play('clunk', { pan: f.pan(o.c.x), gain: 0.4, rate: 0.6 }); f.ppg.snd.play('chain', { pan: f.pan(o.c.x), gain: 0.3 }); });
    return set;
  }
  clear() { this.list = []; }
  update(t) {
    let n = 0; const M4 = this._m;
    for (const k of this.list) {
      const o = k.set.o;
      if (t < o.t0 - 0.01 || t > o.tOff + 0.5) continue;
      if (n >= this.max) break;
      const rise = t < o.tOff ? ease(clamp01((t - o.t0) / (o.t1 - o.t0))) : 1 - ease(clamp01((t - o.tOff) / 0.4));
      const y = -1.15 + 1.15 * rise;
      const open = clamp01((t - k.flick) / 0.06);
      const droop = o.droop ? 0.6 : 0;
      this._p.set(k.x, y, k.z);
      this._q.setFromEuler(this._e.set(0, k.a, 0));
      M4.compose(this._p, this._q, this._s);
      this.stands.setMatrixAt(n, M4); this.handles.setMatrixAt(n, M4);
      // the blade swings from folded (pointing back along the handle) to open, pointing out of the smile
      const bq = new THREE.Quaternion().setFromEuler(this._e.set(-Math.PI * (1 - open) + droop * open, k.a, 0, 'YXZ'));
      const tip = new THREE.Vector3(0, 1.05, 0.02).applyQuaternion(this._q).add(this._p);
      M4.compose(tip, bq, this._s);
      this.blades.setMatrixAt(n, M4);
      n++;
    }
    for (const m of [this.stands, this.handles, this.blades]) { m.count = n; m.instanceMatrix.needsUpdate = true; }
  }
  dispose() { for (const m of [this.stands, this.handles, this.blades]) this.f.scene.remove(m); }
}

// ------------------------------------------------------------------------------------------ the motto
// "PRETTY UNTIL PROVEN GUILTY", carved in gold leaf across the bench's face: dark until she sings it, then lit
// letter by letter (34.48-36.50, again at 83.98 and 137.70).
export class Motto {
  constructor(f) {
    this.f = f;
    const text = 'PRETTY UNTIL PROVEN GUILTY';
    const c = document.createElement('canvas'); c.width = 2048; c.height = 96; const g = c.getContext('2d');
    g.font = '700 70px "Archivo Black", "Arial Black", sans-serif'; g.textBaseline = 'middle';
    const spacing = 26; let w = 0; for (const ch of text) w += g.measureText(ch).width + spacing; w -= spacing;
    this.letters = []; let x = (2048 - w) / 2;
    for (const ch of text) { const cw = g.measureText(ch).width; this.letters.push({ ch, x0: x / 2048, x1: (x + cw) / 2048 }); x += cw + spacing; }
    g.fillStyle = '#fff'; x = (2048 - w) / 2; for (const ch of text) { g.fillText(ch, x, 52); x += g.measureText(ch).width + spacing; }
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
    this.mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTex: { value: tex }, uLit: { value: 0 }, uA: { value: 1 }, uT: { value: 0 } },
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D uTex; uniform float uLit, uA, uT; varying vec2 vU; void main(){ float m = texture2D(uTex, vU).r;
        float lit = smoothstep(uLit - 0.01, uLit, vU.x) < 0.5 ? 1.0 : 0.0;
        float glow = m * (0.08 + 0.92 * lit) * uA * (0.9 + 0.1 * sin(uT * 3.0 + vU.x * 9.0));
        gl_FragColor = vec4(vec3(1.0, 0.72, 0.28) * glow * 2.4, glow); }` });
    const plane = this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 8.2 * 96 / 2048), this.mat);
    plane.position.set(0, 1.17, -6.975); f.scene.add(plane);
    this.runs = [[34.48, 36.5], [83.98, 85.3], [137.7, 139.0]];
  }
  update(t) {
    let lit = 0;
    for (const [a, b] of this.runs) { if (t >= a) lit = Math.max(lit, clamp01((t - a) / (b - a))); }
    // the letters light one by one (left to right across the band)
    const n = this.letters.length, i = Math.floor(lit * n + 1e-6);
    this.mat.uniforms.uLit.value = lit >= 1 ? 1.01 : i > 0 ? this.letters[Math.min(n - 1, i - 1)].x1 + 0.002 : 0;
    // dark again in the blackouts
    const dark = (t > 46.9 && t < 49.98) || (t > 94.9 && t < 99.53) || (t > 135.14 && t < 137.7);
    this.mat.uniforms.uA.value += ((dark ? 0.25 : 1) - this.mat.uniforms.uA.value) * 0.2;
    this.mat.uniforms.uT.value = t;
  }
  dispose() { this.f.scene.remove(this.mesh); }
}

// ------------------------------------------------------------------------------------------ flats on the side walls
// VANITY (post 1): walls of vanity mirrors framed in bulbs revolve in front of the side walls. MIRROR ROOM (bridge):
// tall mirrors slide in to x = +-8, low vanity tables at z = 4, two big mirrors beside Lady Justice.
function bulbFrame(w, h, n) {
  const g = new THREE.Group();
  const mirror = box(w, h, 0.04, M.mirror); g.add(mirror);
  const fg = [];
  for (const [fw, fh, x, y] of [[w + 0.24, 0.12, 0, h / 2 + 0.06], [w + 0.24, 0.12, 0, -h / 2 - 0.06], [0.12, h, -w / 2 - 0.06, 0], [0.12, h, w / 2 + 0.06, 0]]) fg.push(new THREE.BoxGeometry(fw, fh, 0.08).translate(x, y, 0.02));
  const frame = new THREE.Mesh(mergeGeometries(fg), M.gold); frame.castShadow = false; g.add(frame);
  const geos = []; const geo = new THREE.SphereGeometry(0.055, 8, 6);
  const per = (len, k) => Math.max(2, Math.round(len / k));
  const put = (x, y) => { geos.push(geo.clone().translate(x, y, 0.08)); };
  const nx = per(w, 0.42), ny = per(h, 0.42);
  for (let i = 0; i <= nx; i++) { const x = -w / 2 + w * i / nx; put(x, h / 2 + 0.06); put(x, -h / 2 - 0.06); }
  for (let i = 1; i < ny; i++) { const y = -h / 2 + h * i / ny; put(-w / 2 - 0.06, y); put(w / 2 + 0.06, y); }
  const bulbs = [new THREE.Mesh(mergeGeometries(geos), M.bulb)]; g.add(bulbs[0]);
  g.userData.bulbs = bulbs;
  return g;
}
export class Flats {
  constructor(f) {
    this.f = f; mats();
    this.group = new THREE.Group(); this.group.name = 'ppg:flats'; f.scene.add(this.group);
    // VANITY: three mirrors a side on the side walls (revolving in)
    this.vanity = [];
    for (const s of [-1, 1]) for (const z of [-4.2, 0.2, 4.6]) {
      const m = bulbFrame(2.6, 2.6, 6); m.position.set(s * 13.05, 3.6, z); m.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      m.userData.home = m.rotation.y; this.group.add(m); this.vanity.push(m);
    }
    // MIRROR ROOM: tall mirrors (3 a side) that slide in to x = +-8, two big ones beside Lady Justice
    this.mirrors = [];
    for (const s of [-1, 1]) for (const z of [-4.4, -1.6, 1.2]) {
      const m = bulbFrame(2.0, 3.2, 6); m.position.set(s * 13.4, 1.75, z); m.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; m.userData.s = s; this.group.add(m); this.mirrors.push(m);
    }
    this.big = [];
    for (const s of [-1, 1]) { const m = bulbFrame(2.6, 4.4, 8); m.position.set(s * 6, 2.5, -7.6); m.visible = false; this.group.add(m); this.big.push(m); }
    this.tables = [];
    for (const x of [-5.5, 5.5]) { const tb = new THREE.Group(); tb.add(box(2.4, 0.08, 0.7, M.gold, 0, 0.78, 0)); tb.add(box(2.2, 0.72, 0.6, M.lacquer, 0, 0.38, 0)); tb.position.set(x, 0, 9); this.group.add(tb); this.tables.push(tb); }
    for (const m of [...this.vanity, ...this.mirrors, ...this.big]) m.visible = false;
  }
  // bulbs flare (the "pretty"s in post 1)
  flare(t) { this._flare = t; }
  update(t) {
    // VANITY 49.985-57.733: revolve in over a beat, out at 57.733
    const vin = clamp01((t - 49.985) / 0.4), vout = clamp01((t - 57.733) / 0.5);
    const vk = t < 49.985 ? 0 : t < 57.733 ? ease(vin) : 1 - ease(vout);
    for (const m of this.vanity) { m.visible = vk > 0.001; m.position.y = 3.6; m.scale.set(1, vk, 1); }
    // the bulbs chase and flare on each "pretty"
    const fl = this._flare !== undefined ? Math.exp(-Math.max(0, t - this._flare) * 6) : 0;
    M.bulb.emissiveIntensity = 2.2 + 3.5 * fl + (t > 113.47 && t < 121.2 ? 2.0 : 0);
    // MIRROR ROOM 105.719-121.215: slide in from the walls to x = +-8, out at 121.215
    const min = clamp01((t - 105.719) / 1.2), mout = clamp01((t - 121.215) / 1.0);
    const mk = t < 105.719 ? 0 : t < 121.215 ? ease(min) : 1 - ease(mout);
    for (const m of this.mirrors) { m.visible = mk > 0.001; m.position.x = m.userData.s * (13.4 - (13.4 - 8.15) * mk); }
    for (const m of this.big) m.visible = mk > 0.001;
    for (const tb of this.tables) { tb.visible = mk > 0.001; tb.position.z = 9 - (9 - 4.4) * mk; }
  }
  dispose() { this.f.scene.remove(this.group); }
}
