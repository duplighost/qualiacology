// Unloaded: the sugar rush. What the factory does when a chorus hits.
// Candy cannons stand down both sides of every chorus, one for each beat, and each fires its
// volley across over the road on its beat, so she rides under arcs of sweets the whole way; a
// curtain of liquid candy pours across the road on a chorus's first beat and she bursts through
// it (four of them, a colour a bar, in the second); the hoppers over the road let go of their
// gumballs on every "unloaded"; and the rails are candy canes.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { prepare, floorAt } from './trail.js';
import { paint, rgb, seeded, box } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const cyl = (r0, r1, h, n, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, n); g.translate(x, y, z); return g; };
const G = 22;
const CANDY = [0xff5fb0, 0x6af0c8, 0xffd23a, 0xb070ff, 0xff8a3a, 0xff3a5a, 0x5ab0ff, 0xffffff];
const hexRGB = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };

// lit a little by its own colour, so it reads in a dim room
function litVC(opts, k) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';'); };
  m.customProgramCacheKey = () => 'cdyLit' + k.toFixed(2);
  return m;
}
// instanced, each its own colour (aTint), lit a little by it
function tintLit(opts, k) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aTint; varying vec3 vTint;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;').replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * ' + k.toFixed(2) + ';');
  };
  m.customProgramCacheKey = () => 'cdyTint' + k.toFixed(2);
  return m;
}
function instanced(scene, geo, mat, max, tint) {
  if (tint) { const a = new THREE.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aTint', a); }
  const m = new THREE.InstancedMesh(geo, mat, max);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; scene.add(m);
  return m;
}

// ---------- the cannon: a red drum, pink cheeks, a barrel in pink and white bands ----------
const EL = 0.62;                       // the barrel's tilt from upright, toward the road
const PIVOT = 4.6, BARREL = 8.6;
function cannonBase() {
  const parts = [], red = rgb(0xe0102a), white = rgb(0xf6f0f2), pink = rgb(0xff5fb0), gold = rgb(0xe8c050);
  parts.push(paint(cyl(3.2, 3.5, 2.4, 28, 0, 1.2, 0), red));
  parts.push(paint(new THREE.TorusGeometry(3.25, 0.28, 8, 28).rotateX(Math.PI / 2).translate(0, 2.45, 0), white));
  parts.push(paint(cyl(2.4, 3.0, 0.8, 28, 0, 2.8, 0), red));
  for (const s of [-1, 1]) {
    parts.push(paint(box(0.6, 3.6, 3.4, s * 1.95, 4.4, 0), pink));
    const h = cyl(0.7, 0.7, 0.5, 14, 0, 0, 0); h.rotateZ(Math.PI / 2); h.translate(s * 2.35, PIVOT, 0); parts.push(paint(h, gold));
  }
  return merge(parts);
}
function cannonBarrel() {
  // built upright from the pivot, then tilted toward +z (the road)
  const parts = [], pink = rgb(0xff4fa8), white = rgb(0xfff4f8), gold = rgb(0xe8c050);
  const n = 6, L = BARREL / n;
  for (let k = 0; k < n; k++) { const r0 = 1.55 - k * 0.04, r1 = 1.55 - (k + 1) * 0.04; parts.push(paint(cyl(r1, r0, L, 22, 0, k * L + L / 2 - 1.2, 0), k % 2 ? white : pink)); }
  parts.push(paint(cyl(1.75, 1.75, 0.5, 22, 0, BARREL - 1.2 + 0.1, 0), gold));
  parts.push(paint(cyl(1.0, 1.0, 0.08, 18, 0, BARREL - 1.2 + 0.38, 0), [0.08, 0.04, 0.06]));
  parts.push(paint(new THREE.SphereGeometry(1.7, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, -1.2, 0), pink));
  const g = merge(parts); g.rotateX(EL); g.translate(0, PIVOT, 0);
  return g;
}
const MUZZLE = new THREE.Vector3(0, PIVOT + (BARREL - 1.0) * Math.cos(EL), (BARREL - 1.0) * Math.sin(EL));

// a wrapped sweet: the middle, a twist of wrapper either side
function sweetGeo() {
  const parts = [];
  const mid = new THREE.SphereGeometry(0.62, 14, 10); mid.scale(1.35, 1, 1); parts.push(mid);
  for (const s of [-1, 1]) { const c = new THREE.ConeGeometry(0.52, 0.8, 10); c.rotateZ(s * Math.PI / 2); c.translate(s * 1.15, 0, 0); parts.push(c); }
  return merge(parts);
}

// ---------- the curtain: liquid candy falling, parting where she goes through ----------
const CURTAIN_VS = `varying vec2 vP; void main(){ vP = vec2(position.x, -position.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CURTAIN_FS = `uniform vec3 uCol; uniform float uTime, uSince, uPartX, uPartY, uTop, uFog, uK; uniform vec3 uFogCol; varying vec2 vP;
  float h1(float n){ return fract(sin(n) * 43758.5453); }
  float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
  void main(){
    float u = vP.x, v = vP.y;                    // across, and down from the trough (metres)
    // where she went through: a hole that opens fast, its edges pushed aside
    float r = uSince > 0.0 ? 2.4 + 3.4 * (1.0 - exp(-uSince * 5.0)) : 0.0;
    vec2 d = vec2(u - uPartX, (v - uPartY) * 0.55);
    float push = uSince > 0.0 ? 1.6 * exp(-length(d) * 0.3) * (1.0 - exp(-uSince * 6.0)) * sign(d.x) : 0.0;
    float uu = u - push + 0.35 * sin(v * 0.17 - uTime * 2.1 + u * 0.3);
    // a sheet of it, folded into soft vertical bands that hold still while it pours
    float band = n1(uu * 1.9 + 1.4 * n1(uu * 0.35 + 2.0));
    float fine = n1(uu * 7.3 + 3.0);
    vec3 c = uCol * (0.42 + 0.4 * band + 0.18 * fine);
    // the light running down it fast, in streaks
    float run = n1(v * 0.16 - uTime * 11.0 + uu * 0.8 + 9.0 * band);
    float spec = smoothstep(0.62, 0.95, run) * (0.35 + 0.65 * smoothstep(0.4, 0.9, band));
    c += vec3(1.0, 0.95, 0.98) * spec * 0.7;
    // ripples sliding down it
    float rip = pow(0.5 + 0.5 * sin(v * 1.6 - uTime * 22.0 + 6.0 * n1(uu * 0.6)), 14.0);
    c += uCol * rip * 0.35 + vec3(0.25) * rip * band;
    // where the sheet splits, it thins
    float split = smoothstep(0.78, 0.92, n1(uu * 0.9 + 5.0));
    float a = 0.9 - 0.45 * split - 0.15 * (1.0 - band);
    c = mix(c, uCol * 0.5, split * 0.5);
    // over the lip of the trough it runs thick and bright
    float lip = smoothstep(1.6, 0.0, v);
    c = mix(c, uCol * 1.15 + 0.15, lip * 0.5); a = max(a, lip * 0.97);
    float fl = n1(uu * 3.1 + 7.0);
    // thinning toward the bottom, where it breaks into drops
    a *= smoothstep(uTop + 1.0, uTop - 5.0, v + 3.0 * fl);
    a *= smoothstep(-0.2, 0.5, v);
    if (uSince > 0.0) a *= smoothstep(r, r + 1.8, length(d) + 0.6 * fl);
    a *= uK;
    if (a < 0.02) discard;
    c = mix(c, uFogCol, uFog);
    gl_FragColor = vec4(c, clamp(a * 0.9, 0.0, 1.0));
  }`;

// a gumball's way down: from the hopper's mouth, bouncing on the road or the floor, rolling off
function ballAt(tau, b, roadY, floorY, hw, out) {
  let x = b.x, z = b.z, y = b.y, vx = b.vx, vy = b.vy, vz = b.vz, t = tau;
  for (let k = 0; k < 4 && t > 0; k++) {
    const surf = Math.abs(x) < hw ? roadY : floorY;
    // time to reach the surface from here
    const disc = vy * vy + 2 * G * (y - surf);
    const th = disc > 0 ? (vy + Math.sqrt(disc)) / G : 0;
    if (t < th) { out.set(x + vx * t, y + vy * t - 0.5 * G * t * t, z + vz * t); return out; }
    x += vx * th; z += vz * th; y = surf; vy = -(vy - G * th) * 0.48; vx *= 0.8; vz *= 0.8; t -= th;
    // off the road's edge: it goes on down to the floor
    if (Math.abs(x) < hw && surf === roadY) vx += Math.sign(x || 1) * 2.5;
  }
  out.set(x + vx * Math.min(t, 1.5), Math.max(floorY, y), z + vz * Math.min(t, 1.5));
  return out;
}

export class CdyRush {
  constructor(scene, S, cfg = {}) {
    this.S = S; this.cfg = cfg;
    prepare(S.course, S.plan);
    const c = S.course;
    this.lead = cfg.lead ?? 1.45;
    this.flight = cfg.flight ?? 1.2;
    // a cannon for every beat of every chorus and final, a little ahead of the beat it fires on
    this.cannons = [];
    const wins = cfg.cannons || [];
    for (const w of wins) {
      for (let i = 0; i < c.beats.length; i++) {
        const tb = c.beats[i];
        if (tb < w.from || tb >= w.to) continue;
        const side = i % 2 ? 1 : -1;
        this.cannons.push({ fire: tb, t: tb + this.lead, x: side * (w.x ?? 30), side, i, seed: (i * 0.618) % 1 });
      }
    }
    this.cannons.sort((a, b) => a.t - b.t);
    const baseM = litVC({ roughness: 0.4, metalness: 0.25 }, 0.32);
    this.base = instanced(scene, cannonBase(), baseM, 40);
    this.barrel = instanced(scene, cannonBarrel(), litVC({ roughness: 0.3, metalness: 0.2 }, 0.4), 40);
    this.sweets = instanced(scene, sweetGeo(), tintLit({ roughness: 0.25, metalness: 0.1 }, 0.55), 160, true);
    this.gums = instanced(scene, new THREE.SphereGeometry(0.7, 12, 9), tintLit({ roughness: 0.18, metalness: 0.05 }, 0.5), 900, true);
    // the curtains
    this.curtains = (cfg.curtains || []).map((ct) => {
      const W = ct.w ?? 13, top = ct.top ?? 14;
      const sm = c.sample(ct.t), fy = floorAt(c, ct.t);
      const H = sm.y + top - fy + 0.5;
      // hung from the trough: y runs 0 at the trough down to -H (the shader takes metres down)
      const g = new THREE.PlaneGeometry(2 * W, H, 1, 1); g.translate(0, -H / 2, 0);
      const mat = new THREE.ShaderMaterial({ vertexShader: CURTAIN_VS, fragmentShader: CURTAIN_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { uCol: { value: new THREE.Color(ct.color ?? 0xff5fb0) }, uTime: { value: 0 }, uSince: { value: -1 }, uPartX: { value: 0 }, uPartY: { value: top }, uTop: { value: H }, uFog: { value: 0 }, uK: { value: 1 }, uFogCol: { value: new THREE.Color() } } });
      const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 2; scene.add(mesh);
      // its trough, and the legs it stands on
      const parts = [], steel = rgb(0xb8bcc8), dark = rgb(0x3a3e48), stripe = rgb(0xff4fa8), white = rgb(0xfff4f8);
      parts.push(paint(box(2 * W + 3, 1.6, 2.6, 0, 0.6, 0), steel));
      for (let k = 0; k < 14; k++) parts.push(paint(box((2 * W + 3) / 14, 0.5, 2.7, -W - 1.5 + (k + 0.5) * (2 * W + 3) / 14, 1.25, 0), k % 2 ? stripe : white));
      parts.push(paint(box(2 * W + 2.6, 0.3, 2.2, 0, 1.45, 0), hexRGB(ct.color ?? 0xff5fb0)));
      for (const s of [-1, 1]) { parts.push(paint(box(1.4, H + 2, 1.4, s * (W + 1.6), -H / 2 + 0.6, 0), dark)); parts.push(paint(box(2.4, 0.8, 2.4, s * (W + 1.6), -H + 0.2, 0), dark)); }
      const trough = new THREE.Mesh(merge(parts), litVC({ roughness: 0.35, metalness: 0.5 }, 0.25)); trough.frustumCulled = false; trough.visible = false; scene.add(trough);
      return { ...ct, W, top, H, mesh, mat, trough, passed: false };
    });
    // the hoppers over the road: their gumballs, each its own way down
    this.hoppers = (cfg.hoppers || []).map((hp, hi) => {
      const R = seeded(31 + hi * 7), N = hp.n ?? 200, balls = [];
      for (let i = 0; i < N; i++) {
        const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 1.6;
        balls.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, y: 0, vx: Math.cos(a) * (1 + R() * 5), vz: Math.sin(a) * (1 + R() * 4) + 2, vy: -1 - R() * 3, rel: (i / N) * (hp.pour ?? 0.9) + R() * 0.05, s: 0.7 + R() * 0.6, tint: hexRGB(CANDY[Math.floor(R() * CANDY.length)]) });
      }
      return { ...hp, balls };
    });
    const hg = (() => {
      const parts = [], pink = rgb(0xff4fa8), white = rgb(0xfff4f8), steel = rgb(0x9aa0aa);
      // a funnel: the bin, banded, narrowing to the gate; its rim; the chains up
      for (let k = 0; k < 5; k++) parts.push(paint(cyl(5.2, 5.2, 1.4, 28, 0, 5.6 + k * 1.4, 0), k % 2 ? white : pink));
      parts.push(paint(cyl(5.2, 1.6, 4.4, 28, 0, 3.4, 0), steel));
      parts.push(paint(new THREE.TorusGeometry(5.3, 0.3, 8, 32).rotateX(Math.PI / 2).translate(0, 12.6, 0), steel));
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.785; parts.push(paint(box(0.25, 22, 0.25, Math.cos(a) * 4.6, 23.5, Math.sin(a) * 4.6), rgb(0x6a6e78))); }
      return merge(parts);
    })();
    this.hopper = instanced(scene, hg, litVC({ roughness: 0.35, metalness: 0.35 }, 0.3), 4);
    this.gate = instanced(scene, paint(box(1.7, 0.25, 3.4, 0.85, 0, 0), rgb(0x9aa0aa)), litVC({ roughness: 0.4, metalness: 0.5 }, 0.2), 8);
    // the rails, as candy canes: a striped sleeve over the pipe
    this.railK = (S.course.rails || []).length > 0;
    if (this.railK) {
      const seg = new THREE.CylinderGeometry(0.17, 0.17, 1, 14, 1, true); seg.rotateX(Math.PI / 2); seg.translate(0, 0, 0.5);
      const a0 = new THREE.InstancedBufferAttribute(new Float32Array(900 * 2), 2); a0.setUsage(THREE.DynamicDrawUsage); seg.setAttribute('aRun', a0);
      this.caneMat = new THREE.ShaderMaterial({
        uniforms: { uBeat: { value: 0 }, uRide: { value: 0 } },
        vertexShader: `attribute vec2 aRun; varying float vS; varying float vA; varying vec3 vN; varying vec3 vV;
          void main(){ vS = aRun.x + position.z * aRun.y; vA = atan(position.y, position.x); vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * mat3(instanceMatrix) * vec3(position.xy, 0.0)); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform float uBeat, uRide; varying float vS; varying float vA; varying vec3 vN; varying vec3 vV;
          void main(){ float sv = vS * 0.55 + vA / 6.2832, st = fract(sv);
            float w = clamp(fwidth(sv), 0.001, 0.5);
            // red half and white half, the edges softened by how small they are on screen
            float k = smoothstep(0.5 - w, 0.5 + w, st) * (1.0 - smoothstep(1.0 - w, 1.0, st));
            k = mix(k, 0.5, smoothstep(0.25, 0.5, w));
            vec3 red = vec3(0.92, 0.06, 0.16), white = vec3(1.0, 0.97, 0.97);
            vec3 c = mix(white, red, k);
            float lam = 0.55 + 0.45 * max(0.0, dot(normalize(vN), normalize(vec3(0.3, 0.8, 0.5))));
            float rim = pow(1.0 - clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.0);
            c = c * lam * (0.9 + 0.5 * uBeat) + vec3(1.0, 0.6, 0.8) * rim * (0.4 + 0.8 * uBeat + 0.5 * uRide);
            gl_FragColor = vec4(c, 1.0); }`,
      });
      this.cane = new THREE.InstancedMesh(seg, this.caneMat, 900);
      this.cane.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.cane.frustumCulled = false; this.cane.count = 0; scene.add(this.cane);
      this.aRun = a0;
    }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._s = new THREE.Vector3(1, 1, 1);
    this._p = new THREE.Vector3(); this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._w = new THREE.Vector3(); this._d = new THREE.Vector3(); this._z = new THREE.Vector3(0, 0, 1);
    this.glows = [];
  }

  // the factory's own clock: how hard things run
  update(S, dt, camera, time) {
    const T = S.rider.t, c = S.course, tr = S.track;
    const m = this._m, q = this._q, e = this._e, s = this._s, p = this._p, w = this._w;
    this.glows.length = 0;
    // ---- the cannons and their volleys ----
    let nb = 0, nr = 0, ns = 0;
    for (const cn of this.cannons) {
      if (cn.t < T - 1.5) continue;
      if (cn.t > T + 30) break;
      if (nb >= 40) break;
      tr.ground(cn.t, cn.x, p); p.y = floorAt(c, cn.t);
      const yaw = c.sample(cn.t).yaw + (cn.side > 0 ? Math.PI / 2 : -Math.PI / 2);
      // the recoil: back on the shot, home over half a second
      const since = T - cn.fire, rk = since > 0 && since < 0.6 ? Math.exp(-since * 9) * (1 - Math.exp(-since * 60)) : 0;
      e.set(0, yaw, 0); q.setFromEuler(e); m.compose(p, q, s.set(1, 1, 1)); this.base.setMatrixAt(nb++, m);
      w.set(0, -rk * 1.1 * Math.cos(EL), -rk * 1.1 * Math.sin(EL)).applyQuaternion(q).add(p);
      m.compose(w, q, s.set(1, 1, 1)); this.barrel.setMatrixAt(nr++, m);
      const mz = this._a.copy(MUZZLE).applyQuaternion(q).add(p);
      // smoke and a flash at the muzzle
      if (since > -0.02 && since < 0.5) {
        const k = 1 - since / 0.5;
        this.glows.push([mz.x, mz.y + since * 4, mz.z, 3 + since * 14, [1, 0.6, 0.85], 1.6 * k * k]);
        this.glows.push([mz.x, mz.y, mz.z, 7, [1, 0.9, 0.7], since < 0.08 ? 2.4 : 0]);
      }
      // the volley: seven sweets on their arcs across
      if (since > 0 && since < this.flight * 1.2) {
        const R = seeded(1 + cn.i * 13);
        const top = c.sample(cn.t).y + 13;
        for (let j = 0; j < 7 && ns < 160; j++) {
          const F = this.flight * (0.85 + R() * 0.3), u = since / F;
          const fz = (R() - 0.5) * 16, fx = -cn.side * (20 + R() * 10), hy = top + (R() - 0.3) * 6;
          if (u >= 1) continue;
          tr.ground(cn.t + fz / Math.max(20, tr.speedAt(cn.t)), fx, this._b); const by = floorAt(c, cn.t) + 1;
          const x = mz.x + (this._b.x - mz.x) * u, z = mz.z + (this._b.z - mz.z) * u;
          const y0 = mz.y + (by - mz.y) * u, mid = (mz.y + by) / 2;
          const y = y0 + 4 * (hy - mid) * u * (1 - u);
          e.set(since * (5 + j), since * (3 + j * 0.7), since * 4); q.setFromEuler(e);
          const sc = 0.95 + R() * 0.5;
          m.compose(w.set(x, y, z), q, s.set(sc, sc, sc)); this.sweets.setMatrixAt(ns, m);
          this.sweets.geometry.attributes.aTint.array.set(hexRGB(CANDY[(cn.i + j) % CANDY.length]), ns * 3); ns++;
          if (j % 2 === 0) this.glows.push([x, y, z, 2.6, [1, 0.85, 0.95], 0.5]);
        }
      }
    }
    this.base.count = nb; this.barrel.count = nr; this.sweets.count = ns;
    for (const mm of [this.base, this.barrel, this.sweets]) mm.instanceMatrix.needsUpdate = true;
    this.sweets.geometry.attributes.aTint.needsUpdate = true;
    // ---- the curtains ----
    for (const ct of this.curtains) {
      const on = ct.t > T - 1.2 && ct.t < T + 32;
      ct.mesh.visible = on; ct.trough.visible = on;
      if (!on) continue;
      const sm = c.sample(ct.t), yaw = sm.yaw;
      tr.at(ct.t, 0, 0, p); p.y = sm.y + ct.top;
      e.set(0, yaw, 0); q.setFromEuler(e);
      ct.mesh.position.copy(p); ct.mesh.quaternion.copy(q);
      ct.trough.position.copy(p); ct.trough.quaternion.copy(q);
      const u = ct.mat.uniforms;
      u.uTime.value = time;
      // she goes through it: the hole opens where she is, and it splashes
      if (T >= ct.t && !ct.passed) {
        ct.passed = true; ct.passAt = time;
        u.uPartX.value = -S.rider.x; u.uPartY.value = ct.top - (S.rider.y - sm.y) - 1.2;
        if (S.sparks) {
          const sp = tr.at(T, S.rider.x, 1.2, this._d);
          const col = new THREE.Color(ct.color ?? 0xff5fb0).multiplyScalar(2.2);
          S.sparks.emit(sp, tr.dirAt(T, this._a).multiplyScalar(14).add(new THREE.Vector3(0, 4, 0)), col, 70, { spread: 9, life: 0.8, size: 0.32, grav: 14, up: 1.2 });
        }
      }
      if (T < ct.t - 0.05) { ct.passed = false; u.uSince.value = -1; }
      else if (ct.passed) u.uSince.value = Math.max(0.001, time - ct.passAt);
      const d = camera ? camera.position.distanceTo(p) : 40;
      u.uFog.value = clamp(1 - Math.exp(-Math.pow(d * (S.P.fogDensity ?? 0.002), 1.5)), 0, 1);
      u.uFogCol.value.set(S.P.fog);
      u.uK.value = clamp((ct.t - T + 1.2) / 0.6, 0, 1);
      this.glows.push([p.x, p.y + 1.2, p.z, 30, hexRGB(ct.color ?? 0xff5fb0), 0.35]);
    }
    // ---- the hoppers and their gumballs ----
    let nh = 0, ng = 0, gb = 0;
    const tint = this.gums.geometry.attributes.aTint.array;
    for (const hp of this.hoppers) {
      if (hp.t < T - 3 || hp.t > T + 34) continue;
      const sm = c.sample(hp.t), yaw = sm.yaw, top = sm.y + (hp.lift ?? 12);
      tr.at(hp.t, hp.x ?? 0, 0, p); p.y = top;
      e.set(0, yaw, 0); q.setFromEuler(e);
      m.compose(p, q, s.set(1, 1, 1)); if (nh < 4) this.hopper.setMatrixAt(nh++, m);
      // the gate: two flaps, hinged at the funnel's mouth, that fall open on the word
      const open = clamp((T - hp.release) / 0.18, 0, 1);
      for (const sd of [-1, 1]) {
        if (gb >= 8) break;
        this._a.set(sd * 1.6, 1.2, 0).applyQuaternion(q).add(p);
        this._e.set(0, yaw + (sd > 0 ? Math.PI : 0), -open * 1.9); this._q.setFromEuler(this._e);
        m.compose(this._a, this._q, s.set(1, 1, 1)); this.gate.setMatrixAt(gb++, m);
      }
      if (T < hp.release) { this.glows.push([p.x, p.y + 8, p.z, 16, [1, 0.6, 0.85], 0.25]); continue; }
      const roadY = sm.y - top, floorY = floorAt(c, hp.t) - top, hw = sm.width;
      for (const b of hp.balls) {
        const tau = T - hp.release - b.rel;
        if (tau <= 0 || tau > 3.2 || ng >= 900) continue;
        ballAt(tau, b, roadY, floorY, hw, this._b);
        w.set(this._b.x, this._b.y, this._b.z).applyQuaternion(q).add(p);
        m.makeScale(b.s, b.s, b.s); m.setPosition(w); this.gums.setMatrixAt(ng, m);
        tint.set(b.tint, ng * 3); ng++;
      }
      if (T - hp.release < 1.2) this.glows.push([p.x, p.y - 2, p.z, 18, [1, 0.7, 0.9], 0.6 * (1 - (T - hp.release) / 1.2)]);
    }
    this.hopper.count = nh; this.gate.count = gb; this.gums.count = ng;
    for (const mm of [this.hopper, this.gate, this.gums]) mm.instanceMatrix.needsUpdate = true;
    this.gums.geometry.attributes.aTint.needsUpdate = true;
    // ---- the candy canes over the rails ----
    if (this.railK) this._canes(S, T);
  }

  _canes(S, t) {
    const tr = S.track, m = this._m, q = this._q, s = this._s, a = this._a, b = this._b, d = this._d;
    let ns = 0;
    const run = this.aRun.array;
    for (const r of S.course.rails) {
      const from = Math.max(r.t0, t - 1.2), to = Math.min(r.t1, t + 11);
      if (to <= from) continue;
      // the stripes stay put on the cane: measure from its start every time
      let along = 0;
      tr.at(r.t0, r.x, r.h, a);
      for (let tt = r.t0 + 1 / 30; ns < 900; tt += 1 / 30) {
        const te = Math.min(tt, to);
        tr.at(te, r.x, r.h, b);
        d.copy(b).sub(a); const len = d.length();
        if (len > 1e-4) {
          if (te > from) {
            q.setFromUnitVectors(this._z, d.multiplyScalar(1 / len)); m.compose(a, q, s.set(1, 1, len)); this.cane.setMatrixAt(ns, m);
            run[ns * 2] = along; run[ns * 2 + 1] = len; ns++;
          }
          along += len;
        }
        a.copy(b);
        if (te >= to) break;
      }
    }
    this.cane.count = ns; this.cane.instanceMatrix.needsUpdate = true; this.aRun.needsUpdate = true;
    this.caneMat.uniforms.uBeat.value = clamp(S.town.beat || 0, 0, 1);
    this.caneMat.uniforms.uRide.value = S.rider.rail ? 1 : 0;
  }

  draw(T) { for (const g of this.glows) T.glow(g[0], g[1], g[2], g[3], g[4], g[5]); }
}
