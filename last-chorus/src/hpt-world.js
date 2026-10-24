// Heart of the Party, per frame. The ground comes up under her (trail.js terrain) so the city and
// the party stand round her; the string lights across the street; the heartbeat that goes out
// from her across the city on every beat of a chorus; the crowd's and the ribs' clocks.
// Driven from the finale (party.js HeartStage), which main.js builds and updates every frame.

import * as THREE from 'three';
import { prepare, groundAt, Terrain } from './trail.js';
import { HFOG, CROWD, RIB, clamp, smooth, TAU, VC, merge, paint, rgb, box, cyl } from './hpt-sets.js';
import { DISCO, heartGeo } from './hpt-pieces.js';
import './hpt-pieces2.js';
import { col, extend } from './scenery.js';

const fr = (x) => x - Math.floor(x);
const BLANK = {};
extend({
  layers: {
    // the zipper: a tooth on its strip of tape (the right-hand row; the left is the same turned
    // round), the slider with its pull
    hptTooth: (M) => [merge([paint(box(0.46, 0.16, 0.26, 0.12, 0, 0), rgb(0xf4cc64)), paint(box(0.86, 0.06, 0.5, 0.66, -0.04, 0), rgb(0x9a0a24))]), VC(M, 'hptBrassM', { roughness: 0.25, metalness: 0.7, lit: 0.5 }), 900, BLANK],
    hptSlider: (M) => [merge([paint(box(1.5, 0.7, 2.2, 0, 0.35, 0), rgb(0xf4cc64)), paint(box(1.9, 0.25, 1.2, 0, 0.12, 0.7), rgb(0xf4cc64)), paint(box(0.7, 0.16, 1.9, 0, 0.82, -1.3), rgb(0xf4cc64)), paint(box(1.0, 0.06, 1.5, 0, 0.84, -2.9), rgb(0xd8203a))]), VC(M, 'hptBrassM', { roughness: 0.25, metalness: 0.7, lit: 0.5 }), 2, BLANK],
    // money coming down: pale green paper, a darker middle, a white edge
    hptBill: (M) => [merge([paint(box(2.6, 0.03, 1.15, 0, 0, 0), rgb(0xf4f8ec)), paint(box(2.3, 0.035, 0.9, 0, 0, 0), rgb(0x8ad898)), paint(box(0.66, 0.04, 0.66, 0, 0, 0), rgb(0x3a8a4a))]), VC(M, 'hptPaperM', { roughness: 0.8, metalness: 0, lit: 0.75, side: THREE.DoubleSide }), 300, BLANK],
    // heart balloons on their strings (red, pink, gold, white: four kinds)
    hptBalloon0: (M) => [balloonGeo(0xe8102e), VC(M, 'hptLatexM', { roughness: 0.18, metalness: 0.1, lit: 0.5 }), 120, BLANK],
    hptBalloon1: (M) => [balloonGeo(0xff6fb0), VC(M, 'hptLatexM', { roughness: 0.18, metalness: 0.1, lit: 0.5 }), 120, BLANK],
    hptBalloon2: (M) => [balloonGeo(0xf0c040), VC(M, 'hptLatexM', { roughness: 0.18, metalness: 0.1, lit: 0.5 }), 120, BLANK],
    hptBalloon3: (M) => [balloonGeo(0xf6f0f4), VC(M, 'hptLatexM', { roughness: 0.18, metalness: 0.1, lit: 0.5 }), 120, BLANK],
  },
});
function balloonGeo(c) {
  const h = heartGeo(1.25, 0.9, 0.35); h.translate(0, 0, 0);
  const s = box(0.04, 5.5, 0.04, 0, -3.4, 0);
  const g = merge([paint(h, rgb(c)), paint(s, rgb(0xf4f0f8)), paint(cyl(0.12, 0.2, 0.3, 6, 0, -0.62, 0), rgb(c))]);
  g.computeVertexNormals(); return g;
}

// the dance floor: tiles that light in a different pattern every beat
const FLOOR_VS = `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FLOOR_FS = /* glsl */`
  uniform float uBeat, uBar, uK, uFrac, uAlong, uHptFogD; uniform vec3 uHptFog, uCam, uA, uB, uC, uD;
  varying vec2 vUv; varying vec3 vW;
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main(){
    vec2 q = vec2(vUv.x, vUv.y) / 3.6, id = floor(q), f = fract(q);
    float b = uBeat, pat = mod(b, 4.0);
    float on;
    if (pat < 0.5) on = mod(id.x + id.y + b, 2.0);
    else if (pat < 1.5) { float r = length(vec2(id.x, id.y - uAlong / 3.6)); on = step(abs(r - uFrac * 14.0), 1.2); }
    else if (pat < 2.5) on = step(mod(id.y + b * 2.0, 3.0), 0.5) + step(abs(id.x) , 0.5) * 0.0;
    else on = step(0.62, h2(id + b * 1.7));
    float k = (0.25 + 1.3 * exp(-uFrac * 3.5)) * on + 0.06;
    float pick = h2(id * 1.3 + floor(b / 4.0) * 7.0);
    vec3 c = pick < 0.25 ? uA : (pick < 0.5 ? uB : (pick < 0.75 ? uC : uD));
    float grout = smoothstep(0.0, 0.05, f.x) * smoothstep(1.0, 0.95, f.x) * smoothstep(0.0, 0.05, f.y) * smoothstep(1.0, 0.95, f.y);
    vec3 col = mix(vec3(0.015, 0.01, 0.02), c * k, grout) * uK;
    float d = length(uCam - vW); float fg = 1.0 - exp(-pow(d * uHptFogD, 1.5));
    gl_FragColor = vec4(mix(col, uHptFog, clamp(fg, 0.0, 1.0)), 1.0);
  }`;

const inSpan = (spans, t) => { for (const [a, b] of spans || []) if (t >= a && t < b) return true; return false; };
const spanK = (spans, t, fadeIn = 0.6, fadeOut = 0.8) => { let k = 0; for (const [a, b] of spans || []) k = Math.max(k, smooth(a - fadeIn, a, t) * (1 - smooth(b, b + fadeOut, t))); return k; };

// a ring of light on the ground and a low wall of it, going out from under her
const RING_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RING_FS = `uniform vec3 uC; uniform float uK; varying vec2 vUv;
  void main(){ float a = uK * pow(max(1.0 - vUv.y, 0.0), 1.6); a = (a == a) ? clamp(a, 0.0, 3.0) : 0.0; gl_FragColor = vec4(uC * a, 1.0); }`;
const FLAT_FS = `uniform vec3 uC; uniform float uK; varying vec2 vUv;
  void main(){ float a = uK * smoothstep(0.0, 0.7, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y)); a = (a == a) ? clamp(a, 0.0, 3.0) : 0.0; gl_FragColor = vec4(uC * a, 1.0); }`;

export class PartyWorld {
  constructor(scene, ctx) {
    const c = this.c = ctx.course, plan = this.plan = ctx.plan || {};
    this.town = ctx.town; this.P = ctx.P;
    this.cfg = plan.party || {};
    // layers first used mid-ride, made now so the loading card compiles them (no stall when they come)
    if (ctx.town) for (const k of ['hptTooth', 'hptSlider', 'hptBill', 'hptBalloon0', 'hptBalloon1', 'hptBalloon2', 'hptBalloon3']) void ctx.town.layers[k];
    prepare(c, plan);
    this.gy = (t, x) => groundAt(c, t, x);
    this.terrain = new Terrain(scene, c, ctx.P, plan);
    const tu = this.terrain.mat.uniforms; tu.uPath.value = 0; tu.uLawn.value = 0; tu.uDry.value = 0; tu.uWood.value = 0;
    const town = this.town;
    if (town) {
      town.floorFn = this.gy;
      for (const r of town.roadMeshes) r.floorFn = this.gy;
      // everything the scenery placed stands on the ground (its heights become heights above it)
      for (const it of town.items) {
        if (it.abs) continue;
        it.h = (it.h || 0) + this.gy(it.t, it.x);
        if (it.wake0 !== undefined && this.cfg.wake) it.wake0 = Math.max(it.wake0, this.cfg.wake);
        if (it.parts === 'lamp') it.dim = (it.dim ?? 1) * (this.cfg.lampDim ?? 0.55);
        // the ribs stand tall enough to clear her road where they are
        if (it.ribs) { const top = c.sample(it.t).y - it.h; it.sy = Math.max(0.9, (top + 17) / 30); }
      }
    }
    // the heartbeat rings: a few, reused
    this.rings = [];
    const flat = new THREE.RingGeometry(0.86, 1, 120, 1); flat.rotateX(-Math.PI / 2);
    { const uv = flat.attributes.uv, p = flat.attributes.position; for (let i = 0; i < uv.count; i++) uv.setY(i, (Math.hypot(p.getX(i), p.getZ(i)) - 0.86) / 0.14); }
    const wall = new THREE.CylinderGeometry(1, 1, 1, 120, 1, true); wall.translate(0, 0.5, 0);
    { const uv = wall.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); }
    for (let k = 0; k < 4; k++) {
      const mf = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(0xff2a50) }, uK: { value: 0 } }, vertexShader: RING_VS, fragmentShader: FLAT_FS, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const mw = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(0xff2a50) }, uK: { value: 0 } }, vertexShader: RING_VS, fragmentShader: RING_FS, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const a = new THREE.Mesh(flat, mf), b = new THREE.Mesh(wall, mw);
      for (const o of [a, b]) { o.frustumCulled = false; o.visible = false; o.renderOrder = 2; scene.add(o); }
      this.rings.push({ a, b, mf, mw, t0: -99, k: 0 });
    }
    this.ringNext = 0; this.lastBeat = -1;
    // the dance floor: the square while the band plays on its own
    if (this.cfg.floor) {
      const N = 90, M = 25; this.fN = N; this.fM = M;
      this.fCols = []; for (let j = 0; j < M; j++) this.fCols.push(-72 + (144 * j) / (M - 1));
      const g = new THREE.BufferGeometry();
      this.fPos = new Float32Array(N * M * 3); this.fUv = new Float32Array(N * M * 2);
      // wound so its faces look up (rows run forward, columns to her right)
      const idx = []; for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b2 = a + 1, c2 = a + M, d = c2 + 1; idx.push(a, b2, c2, b2, d, c2); }
      g.setIndex(idx);
      g.setAttribute('position', new THREE.BufferAttribute(this.fPos, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('uv', new THREE.BufferAttribute(this.fUv, 2).setUsage(THREE.DynamicDrawUsage));
      this.fMat = new THREE.ShaderMaterial({
        uniforms: { uBeat: { value: 0 }, uBar: { value: 0 }, uK: { value: 0 }, uFrac: { value: 0 }, uAlong: { value: 0 }, uCam: { value: new THREE.Vector3() },
          uA: { value: new THREE.Color(0xff2a8a) }, uB: { value: new THREE.Color(0x3ae8ff) }, uC: { value: new THREE.Color(0xffc040) }, uD: { value: new THREE.Color(0x9a4aff) }, ...HFOG },
        vertexShader: FLOOR_VS, fragmentShader: FLOOR_FS,
      });
      this.floor = new THREE.Mesh(g, this.fMat); this.floor.frustumCulled = false; this.floor.renderOrder = -2; this.floor.visible = false; scene.add(this.floor);
    }
    // the rails: the zipper down the middle, and one hung with party bulbs
    this.zip = (c.rails || []).find((r) => Math.abs(r.t0 - (this.cfg.zipper ?? -99)) < 0.3) || null;
    this.lightRails = (c.rails || []).filter((r) => (this.cfg.railLights || []).some((t0) => Math.abs(r.t0 - t0) < 0.3));
    this._m = new THREE.Matrix4(); this._hq = new THREE.Quaternion(); this._he = new THREE.Euler(0, 0, 0, 'YXZ'); this._s1 = new THREE.Vector3(1, 1, 1); this._w2 = new THREE.Vector3();
    this._p = new THREE.Vector3(); this._q = new THREE.Vector3(); this._w = new THREE.Vector3(); this._d = new THREE.Vector3();
    this.cam = { position: new THREE.Vector3() };
  }

  // the clocks; called once a frame before the scenery draws (from the finale's update)
  frame(track, rider, songT, dt, camPos, heartBeat, P) {
    const c = this.c, t = rider.t, cfg = this.cfg;
    this.P = P;
    if (camPos) this.cam.position.copy(camPos);
    this.terrain.update(track, rider, P, this.cam, 0);
    this.terrain.mat.uniforms.uWood.value = 0;
    // fog: the town's (the chorus lift pulls it back; the sign material has this frame's)
    const sm = this.town && this.town.mats.sign;
    HFOG.uHptFog.value.set(P.fog); HFOG.uHptFogD.value = sm ? sm.uniforms.uFogDensity.value : P.fogDensity;
    const sec = c.sectionAt(t), lifting = sec.kind === 'chorus' || sec.kind === 'final';
    const bp = c.beatAt(t);
    CROWD.uNow.value = t; CROWD.uBeatPos.value = bp; CROWD.uTime.value += dt;
    DISCO.uHptT.value += dt;
    // what the kick drum in the quiet hits with: her heartbeat (only when she pumps, there)
    if (this.town) this.town.heartPump = clamp(heartBeat, 0, 1);
    CROWD.uHands.value += ((inSpan(cfg.hands, t) ? 1 : 0) - CROWD.uHands.value) * Math.min(1, dt * 3);
    CROWD.uPhones.value += ((inSpan(cfg.phones, t) ? 1 : 0) - CROWD.uPhones.value) * Math.min(1, dt * 1.5);
    const e = c.sample(t).energy;
    CROWD.uJump.value = (lifting ? 1.0 : 0.55) * clamp(0.4 + e, 0.5, 1.4);
    RIB.uCam.value.copy(this.cam.position); RIB.uRed.value.set(P.heart ?? 0xff2a50);
    // a heartbeat goes out from under her on every beat of a chorus, as strong as she keeps it
    const b = Math.floor(bp);
    if (b !== this.lastBeat) {
      this.lastBeat = b;
      if (inSpan(cfg.rings, t) && rider.t > 0) {
        const r = this.rings[this.ringNext]; this.ringNext = (this.ringNext + 1) % this.rings.length;
        track.at(t, 0, 0, r.a.position); r.a.position.y = this.gy(t, 0) + 0.35; r.b.position.copy(r.a.position);
        r.t0 = t; r.k = 0.35 + 0.65 * clamp(heartBeat, 0, 1); r.bar = c.isBar(b);
      }
    }
    let newest = null;
    for (const r of this.rings) {
      const u = (t - r.t0) / 1.35;
      const on = u >= 0 && u < 1;
      r.a.visible = r.b.visible = on;
      if (!on) continue;
      const R = 10 + 190 * Math.pow(u, 0.75), fade = (1 - u) * (1 - u) * r.k * (r.bar ? 1.25 : 0.85);
      r.a.scale.set(R, 1, R); r.b.scale.set(R, 4 + 3 * (1 - u), R);
      r.mf.uniforms.uK.value = 0.55 * fade; r.mw.uniforms.uK.value = 0.38 * fade;
      r.mf.uniforms.uC.value.set(P.heart ?? 0xff2a50); r.mw.uniforms.uC.value.set(P.heart ?? 0xff2a50);
      if (!newest || r.t0 > newest.t0) { newest = r; r.R = R; r.fade = fade; }
    }
    // the crowd flushes red as the newest one goes through them
    if (newest) { CROWD.uRingC.value.copy(newest.a.position); CROWD.uRingR.value = newest.R; CROWD.uRingK.value = 1.1 * newest.fade; }
    else CROWD.uRingK.value = 0;
    CROWD.uRingCol.value.set(P.heart ?? 0xff2a50);
    // the dance floor, laid under the square from where she is to well ahead
    if (this.floor) {
      const [f0, f1] = cfg.floor, k = smooth(f0 - 1.2, f0 + 0.2, t) * (1 - smooth(f1 - 0.2, f1 + 1.2, t));
      const t0 = Math.max(f0 - 0.3, t - 4), t1 = Math.min(f1 + 0.3, t + 40);
      this.floor.visible = t1 > t0 + 0.2;
      if (this.floor.visible) {
        const N = this.fN, M = this.fM, w = this._w;
        for (let i = 0; i < N; i++) {
          const tt = t0 + ((t1 - t0) * i) / (N - 1);
          for (let j = 0; j < M; j++) {
            const x = this.fCols[j]; track.ground(tt, x, w);
            const o = (i * M + j) * 3; this.fPos[o] = w.x; this.fPos[o + 1] = this.gy(tt, x) + 0.32; this.fPos[o + 2] = w.z;
            this.fUv[(i * M + j) * 2] = x; this.fUv[(i * M + j) * 2 + 1] = tt * 40;
          }
        }
        const g = this.floor.geometry; g.attributes.position.needsUpdate = true; g.attributes.uv.needsUpdate = true;
        const u = this.fMat.uniforms; u.uK.value = Math.max(0.15, k); u.uBeat.value = b; u.uFrac.value = bp - b; u.uAlong.value = t * 40; u.uCam.value.copy(this.cam.position);
      }
    }
  }

  // drawn through the scenery's layers each frame
  draw(T, track, rider) {
    const t = rider.t, c = this.c, cfg = this.cfg, P = this.P;
    // ---- string lights across the street: bulbs on a sagging wire from one side to the other ----
    const fk = spanK(cfg.festoons, t + 6, 3, 1);
    if (fk > 0.01) {
      const sec = c.sectionAt(t), lifting = sec.kind === 'chorus' || sec.kind === 'final';
      const cols = [col(P.heart ?? 0xff2a50), col(P.edge), col(P.windowAlt), [1, 0.86, 0.6]];
      const bp = c.beatAt(t), pulse = Math.exp(-(bp - Math.floor(bp)) * 5);
      const every = cfg.festoonEvery ?? 0.55;
      const a = this._p, bq = this._q, w = this._w;
      const wave = cfg.festoonWave;
      for (let tf = Math.ceil((t - 0.6) / every) * every; tf < t + 13; tf += every) {
        let on = spanK(cfg.festoons, tf, 0.01, 0.01);
        // "there you are": they come back on in a wave that runs on ahead of her down the street
        if (wave && tf > wave - 3 && tf < wave + 14) { const onT = wave + Math.max(0, tf - wave) * 0.14; on *= smooth(onT, onT + 0.12, t); }
        if (on <= 0) continue;
        const ry = c.sample(tf).y, x0 = 17;
        const yEnd = Math.max(this.gy(tf, -x0), this.gy(tf, x0)) + 14;
        const top = Math.max(yEnd, ry + 9.5), sag = 2.8;
        track.ground(tf, -x0, a); track.ground(tf, x0, bq);
        const n = 15, ph = Math.round(tf / every);
        for (let k = 0; k <= n; k++) {
          const u = k / n, y = top - sag * Math.sin(Math.PI * u);
          w.set(a.x + (bq.x - a.x) * u, y, a.z + (bq.z - a.z) * u);
          const cc = cols[(((k + ph) % 4) + 4) % 4];
          const kk = (lifting ? 0.9 + 1.4 * pulse : 0.85) * on * fk;
          T.glow(w.x, w.y, w.z, 1.05, cc, kk);
        }
      }
    }
    const m = this._m, q = this._hq, e = this._he, s1 = this._s1, w = this._w, w2 = this._w2, cam = this.cam.position;
    const heartCol = col(P.heart ?? 0xff2a50);
    // ---- the zipper down the middle of the road: its teeth part behind the slider, red light in the seam ----
    const zr = this.zip;
    if (zr && t > zr.t0 - 9 && t < zr.t1 + 1.5) {
      // closed ahead of the slider (the two rows of teeth meshed down the middle), parted behind it
      // into a V with the heart's red light coming up through the seam
      const L = T.layers.hptTooth, Ls = T.layers.hptSlider, step = 0.0058;
      const slide = clamp(t + 0.1, zr.t0, zr.t1);
      for (let tt = Math.max(zr.t0, t - 0.7); tt < Math.min(zr.t1, t + 4.2); tt += step) {
        const k = Math.round((tt - zr.t0) / step), side = k % 2 ? 1 : -1;
        const open = tt < slide ? clamp((slide - tt) * 2.6, 0, 1) : 0, o2 = open * open * (3 - 2 * open);
        track.at(tt, zr.x + side * 2.2 * o2, zr.h - 0.2 + 0.25 * o2, w);
        e.set(0, c.sample(tt).yaw + (side < 0 ? Math.PI : 0), 0.45 * o2); m.compose(w, q.setFromEuler(e), s1); L.add(m);
        if (o2 > 0.04 && k % 8 === 0) { track.at(tt, zr.x, 0.15, w2); T.glow(w2.x, w2.y, w2.z, 1.2 + 2.4 * o2, heartCol, 2.0 * o2); }
      }
      track.at(slide, zr.x, zr.h - 0.32, w); e.set(0, c.sample(slide).yaw, 0); m.compose(w, q.setFromEuler(e), w2.set(1.3, 1.3, 1.3)); Ls.add(m);
      T.glow(w.x, w.y + 0.9, w.z, 2.6, [1, 0.85, 0.5], 1.3);
    }
    // ---- money coming down over the road: "so I tip like I won the lottery" ----
    const bl = cfg.bills;
    if (bl && t > bl[0] - 8 && t < bl[1] + 1) {
      const L = T.layers.hptBill;
      for (let i = 0; i < 280; i++) {
        const tb = bl[0] + fr(i * 0.6180339) * (bl[1] - bl[0]);
        if (tb < t - 0.4 || tb > t + 7) continue;
        const x = (fr(i * 0.3711) - 0.5) * 38, v = 2.4 + fr(i * 0.731) * 1.6;
        const y = c.sample(tb).y + 25 - v * Math.max(0, t - (tb - 8));
        const gy = this.gy(tb, x);
        if (y < gy + 0.15) continue;
        track.ground(tb, x, w); w.y = y;
        e.set(Math.sin(t * 3 + i) * 0.9, t * 1.6 + i, Math.sin(t * 2.3 + i * 1.7) * 0.7); m.compose(w, q.setFromEuler(e), s1); L.add(m);
      }
    }
    // ---- heart balloons going up out of the crowd all along the street ----
    for (const [b0, b1] of cfg.balloons || []) {
      if (t < b0 - 6 || t > b1 + 8) continue;
      for (let i = 0; i < 140; i++) {
        const tb = b0 + fr(i * 0.618034 + 0.13) * (b1 - b0);
        if (tb < t - 2 || tb > t + 16) continue;
        const side = i % 2 ? 1 : -1, x = side * (18 + fr(i * 0.3711) * 30);
        const rel = tb - 3.2 - fr(i * 0.291) * 2.2, up = Math.max(0, t - rel) * (3.0 + fr(i * 0.531) * 1.4);
        if (up > 75) continue;
        track.ground(tb, x, w); w.x += Math.sin(t * 1.1 + i) * 0.8; w.y = this.gy(tb, x) + 2.4 + up + Math.sin(t * 1.7 + i) * 0.3;
        e.set(Math.sin(t * 1.3 + i) * 0.14, Math.atan2(cam.x - w.x, cam.z - w.z) + Math.sin(t * 0.7 + i) * 0.3, Math.sin(t * 0.9 + i * 1.3) * 0.18);
        const sc = 0.9 + fr(i * 0.77) * 0.45; m.compose(w, q.setFromEuler(e), w2.set(sc, sc, sc));
        T.layers['hptBalloon' + (i % 4)].add(m);
      }
    }
    // ---- party bulbs along a rail, bright on the beat ----
    for (const r of this.lightRails) {
      if (t < r.t0 - 11 || t > r.t1 + 1) continue;
      const pulse = Math.exp(-fr(c.beatAt(t)) * 4), grind = rider.rail === r ? 0.6 : 0;
      const cols = [heartCol, col(P.edge), col(P.windowAlt), [1, 0.86, 0.6]];
      for (let tt = Math.max(r.t0, t - 0.6); tt < Math.min(r.t1, t + 10); tt += 0.02) {
        const k = Math.round((tt - r.t0) / 0.02);
        track.at(tt, r.x, r.h + 0.3, w);
        T.glow(w.x, w.y, w.z, 0.6, cols[k % 4], (0.6 + 1.3 * pulse) * (tt < t ? 0.5 : 1) + grind);
      }
    }
  }
}
