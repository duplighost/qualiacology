// Lays the course out in the world and draws the ribbon you ride.
// Behind you the ground is where you actually rode it. Ahead, it is placed by
// how fast you are going now, easing toward your average speed further out, so
// the far road breathes a little when you speed up but the near road never moves.

import * as THREE from 'three';
import { KIND_ID, RATE } from './course.js';

const R = 60;               // render samples per second of song (fine enough to draw the hold zones' edges sharp)
const BACK = 2.5;           // seconds of ribbon drawn behind
const AHEAD = 11;           // ... and ahead
const FAR = 45;             // coarse layout ahead for landmarks
const ACROSS = 12;          // vertices across the ribbon

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class Track {
  constructor(course, scene, palette) {
    this.c = course;
    this.N = Math.ceil((BACK + AHEAD) * R) + 3;
    this.Nf = Math.ceil(FAR * 4) + 2;
    // layout arrays for the window [t0w, t0w + N/R)
    this.wx = new Float32Array(this.N); this.wz = new Float32Array(this.N);
    this.fx = new Float32Array(this.Nf); this.fz = new Float32Array(this.Nf);
    this.t0w = 0; this.tNow = 0;
    this.frozen = new Map();     // render sample index -> [x, z] once ridden
    this.s = {};
    // What never changes about a row of road (all but where it's laid and how it was ridden),
    // worked out once a song, by the row's index k in song time from kLo: the ribbon copied it
    // out of the course, 800 rows a frame, and that was most of its cost on a phone.
    // (from a few seconds before the course to well past its end: the ribbon is drawn past the finish)
    this.kLo = Math.floor((course.t0 - 4) * R);
    const nk = this.nk = Math.ceil((course.t0 + (course.n - 1) / RATE + BACK + AHEAD + 30) * R) - this.kLo;
    const F = () => new Float32Array(nk);
    this.kY = F(); this.kVY = F(); this.kCY = F(); this.kSY = F(); this.kYR = F(); this.kW = F();
    this.kHold = F(); this.kGap = F(); this.kBeat = F(); this.kVD = F(); this.kCD = F();
    this.lit = F().fill(-1);     // flow when you passed (for the glow you leave), -1 not yet
    this.held = F().fill(-1);    // 1 if she was holding down as she passed it, 0 if not, -1 not yet
    const spb = 60 / course.chart.bpm, sm = {};
    for (let j = 0; j < nk; j++) {
      const tk = (this.kLo + j) / R;
      course.sample(tk, sm);
      this.kY[j] = sm.y; this.kVY[j] = sm.vy; this.kCY[j] = Math.cos(sm.yaw); this.kSY[j] = Math.sin(sm.yaw); this.kYR[j] = sm.yawRate;
      this.kW[j] = sm.width; this.kHold[j] = sm.hold; this.kGap[j] = sm.gap;
      // (how far from the nearest gate, never which side: the signed distance flips from + to −
      // halfway between two gates, and blended between rows that flip drew a gate line on every
      // hilltop and in the middle of every stretch with no hold zone)
      this.kBeat[j] = course.beatAt(tk); this.kVD[j] = Math.abs(course.gateDist(tk)) / spb; this.kCD[j] = Math.abs(course.crestDist(tk)) / spb;
    }
    this._buildMesh(scene, palette);
  }

  // a new run from the start line: forget what was ridden
  restart() { this.frozen.clear(); this.lit.fill(-1); this.held.fill(-1); this._lastK = undefined; }
  // a row's slot in the per-row arrays (clamped to the song)
  _j(k) { const j = k - this.kLo; return j < 0 ? 0 : j >= this.nk ? this.nk - 1 : j; }

  // where the rider is; called after physics each frame
  update(rider) {
    const c = this.c, t = rider.t;
    this.tNow = t;
    const k0 = Math.floor((t - BACK) * R);
    this.t0w = k0 / R;
    // freeze samples we have just passed at the rider's exact position path
    const kr = Math.floor(t * R);
    if (this._lastK === undefined) this._lastK = kr;
    if (!this.frozen.has(kr)) {
      // backfill: walk from rider back to the sample time along current heading
      for (let k = this._lastK; k <= kr; k++) {
        if (this.frozen.has(k)) continue;
        const tk = k / R;
        const back = (t - tk) * (rider.stopping ? rider.stopV0 : rider.v);
        const yaw = c.yawAt(tk);
        this.frozen.set(k, [rider.xz.x - Math.sin(yaw) * back, rider.xz.z - Math.cos(yaw) * back]);
        const j = this._j(k);
        this.lit[j] = rider.flow;
        this.held[j] = rider.press && !rider.stopping ? 1 : 0;
      }
      this._lastK = kr;
      // forget far past
      for (const key of this.frozen.keys()) { if (key < k0 - 4) this.frozen.delete(key); else break; }
    }
    // integrate ahead from the rider
    const v0 = rider.stopping ? rider.stopV0 : rider.v, va = rider.stopping ? rider.stopV0 : Math.max(rider.vAvg, 18);
    let x = rider.xz.x, z = rider.xz.z, tp = t;
    const N = this.N;
    for (let i = 0; i < N; i++) {
      const k = k0 + i, tk = k / R;
      if (tk <= t) {
        const f = this.frozen.get(k);
        if (f) { this.wx[i] = f[0]; this.wz[i] = f[1]; }
        else {
          const back = (t - tk) * (rider.stopping ? rider.stopV0 : rider.v), yaw = c.yawAt(tk);
          this.wx[i] = rider.xz.x - Math.sin(yaw) * back; this.wz[i] = rider.xz.z - Math.cos(yaw) * back;
        }
        continue;
      }
      // step from tp to tk with predicted speed (trapezoid)
      const dt = tk - tp;
      const tm = (tp + tk) / 2;
      const vp = v0 + (va - v0) * smooth(0, 3.2, tm - t);
      const yaw = c.yawAt(tm);
      x += Math.sin(yaw) * vp * dt; z += Math.cos(yaw) * vp * dt;
      this.wx[i] = x; this.wz[i] = z; tp = tk;
    }
    // coarse far layout continuing from the window's end
    this.tf0 = (k0 + N - 1) / R;
    this.fx[0] = this.wx[N - 1]; this.fz[0] = this.wz[N - 1];
    for (let i = 1; i < this.Nf; i++) {
      const ta = this.tf0 + (i - 1) / 4, tb = this.tf0 + i / 4;
      const yaw = c.yawAt((ta + tb) / 2);
      this.fx[i] = this.fx[i - 1] + Math.sin(yaw) * va * 0.25;
      this.fz[i] = this.fz[i - 1] + Math.cos(yaw) * va * 0.25;
    }
    this._writeMesh(rider);
  }

  // where the course's centre line is laid out at song time t: x and z into out (y untouched)
  _xz(t, out) {
    const fi = (t - this.t0w) * R;
    if (fi >= 0 && fi <= this.N - 1) {
      const i = Math.floor(fi), a = fi - i, j = Math.min(i + 1, this.N - 1);
      out.x = this.wx[i] + (this.wx[j] - this.wx[i]) * a;
      out.z = this.wz[i] + (this.wz[j] - this.wz[i]) * a;
    } else if (fi > this.N - 1) {
      const ff = (t - this.tf0) * 4;
      const i = clamp(Math.floor(ff), 0, this.Nf - 2), a = clamp(ff - i, 0, 1.5);
      out.x = this.fx[i] + (this.fx[i + 1] - this.fx[i]) * a;
      out.z = this.fz[i] + (this.fz[i + 1] - this.fz[i]) * a;
    } else {
      // behind the window: extrapolate backward from its start
      const yaw = this.c.yawAt(this.t0w);
      const back = (this.t0w - t) * 30;
      out.x = this.wx[0] - Math.sin(yaw) * back; out.z = this.wz[0] - Math.cos(yaw) * back;
    }
    return out;
  }

  // world position on the course at song time t, lateral offset x, height above ribbon h
  at(t, x = 0, h = 0, out = new THREE.Vector3()) {
    this._xz(t, out);
    const s = this.c.yyw(t, this.s3 || (this.s3 = {}));
    const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
    // right vector (x across): heading (sin,cos) rotated -90deg in plane
    const rx = -cy, rz = sy;   // right = forward x up
    if (x === 0) { out.y = s.y + h; return out; }
    const bank = clamp(Math.atan2(this.speedAt(t) * s.yawRate, 9.8) * 0.7, -0.36, 0.36);
    const cb = Math.cos(bank), sb = Math.sin(bank);
    out.set(out.x + rx * x * cb, s.y + x * sb + h, out.z + rz * x * cb);
    return out;
  }

  // ground-level point under the course at lateral offset x (no bank), y = 0
  ground(t, x = 0, out = new THREE.Vector3()) { this.groundYaw(t, x, out); return out; }
  // ... and the course's heading there, returned (the scenery wants both for every thing it places)
  groundYaw(t, x, out) {
    this._xz(t, out);
    const yaw = this.c.yawAt(t);
    out.x += -Math.cos(yaw) * x; out.z += Math.sin(yaw) * x; out.y = 0;
    return yaw;
  }

  // the ribbon banks into turns like a coordinated turn would at the speed laid out
  bankAt(t) {
    const s = this.c.yyw(t, this.s3 || (this.s3 = {}));
    return clamp(Math.atan2(this.speedAt(t) * s.yawRate, 9.8) * 0.7, -0.36, 0.36);
  }
  speedAt(t) {
    const fi = clamp((t - this.t0w) * R, 0, this.N - 2), i = Math.floor(fi);
    const dx = this.wx[i + 1] - this.wx[i], dz = this.wz[i + 1] - this.wz[i];
    return Math.max(10, Math.hypot(dx, dz) * R);
  }

  // forward direction (unit, including slope) at time t
  dirAt(t, out = new THREE.Vector3()) {
    const a = this.at(t - 0.03, 0, 0, new THREE.Vector3()), b = this.at(t + 0.03, 0, 0, out);
    return out.copy(b).sub(a).normalize();
  }

  _buildMesh(scene, palette) {
    const N = this.N, M = ACROSS;
    // The ribbon's numbers, one column of texels per row of road (where it is, which way across,
    // its normal, the beat, the hold zones...), written each frame and read by the vertex shader,
    // which builds the strip from them. Writing every vertex of the strip every frame was the
    // biggest single cost of a frame on a phone.
    this.rowData = new Float32Array(N * ROW_TEXELS * 4);
    const rt = new THREE.DataTexture(this.rowData, N, ROW_TEXELS, THREE.RGBAFormat, THREE.FloatType);
    rt.minFilter = THREE.NearestFilter; rt.magFilter = THREE.NearestFilter; rt.generateMipmaps = false; rt.needsUpdate = true;
    this.rowTex = rt;
    // the strip itself never changes: which row each vertex belongs to, and where across it
    const g = new THREE.BufferGeometry();
    const nv = N * (M + 1);
    const row = new Float32Array(nv), side = new Float32Array(nv);
    for (let i = 0; i < N; i++) for (let j = 0; j <= M; j++) { const o = i * (M + 1) + j; row[o] = i; side[o] = j / M * 2 - 1; }
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j, b = a + 1, c = a + (M + 1), d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));   // (unused: the shader places each vertex)
    g.setAttribute('aRow', new THREE.BufferAttribute(row, 1));
    g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    this.geo = g;
    // the hold zones' colour, pushed to read as a colour of its own against the road
    const hc = holdColour(palette);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uRows: { value: rt },
        uTime: { value: 0 }, uSong: { value: 0 }, uFlow: { value: 0.3 }, uBeatPhase: { value: 0 },
        uBase: { value: new THREE.Color(palette.ribbon) }, uEdge: { value: new THREE.Color(palette.edge) },
        uFret: { value: new THREE.Color(palette.fret) }, uGlow: { value: new THREE.Color(palette.glow) },
        uSky: { value: new THREE.Color(palette.horizon) }, uFogColor: { value: new THREE.Color(palette.fog) },
        uFogDensity: { value: palette.fogDensity }, uCam: { value: new THREE.Vector3() }, uPulse: { value: 0 }, uStyle: { value: palette.ribbonStyle ?? 0 },
        uHoldCol: { value: hc }, uWin: { value: 0.17 }, uGateCol: { value: new THREE.Color(palette.gate ?? palette.edge).lerp(new THREE.Color(1, 1, 1), palette.gate ? 0 : 0.55) }, uPress: { value: 0 }, uHit: { value: 0 }, uHitCol: { value: new THREE.Color(1, 0.85, 0.4) }, uDapple: { value: palette.dapple ?? 0 }, uShade: { value: palette.shade ?? 0 }, uSun: { value: new THREE.Color(palette.moon ?? 0xffffff) }, uSunDir: { value: new THREE.Vector3(...(palette.moonDir || [0, 1, 0])).normalize() },
        uStartT: { value: 0 }, uFinishT: { value: this.c.duration },
      },
      vertexShader: RIBBON_VS, fragmentShader: RIBBON_FS,
      side: THREE.DoubleSide, transparent: false,
    });
    const mesh = new THREE.Mesh(g, this.mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    this.mesh = mesh;

    // under-glow: a soft additive skirt under each edge so the ribbon reads at night (built from the same rows)
    const sg = new THREE.BufferGeometry();
    const srow = new Float32Array(N * 4), sedge = new Float32Array(N * 4 * 2);
    for (let i = 0; i < N; i++) for (let e = 0; e < 2; e++) for (let b = 0; b < 2; b++) {
      const o = i * 4 + e * 2 + b;
      srow[o] = i; sedge[o * 2] = e ? 1 : -1; sedge[o * 2 + 1] = b;
    }
    const sidx = [];
    for (let i = 0; i < N - 1; i++) for (const e of [0, 2]) {
      const a = i * 4 + e, b = a + 1, c = a + 4, d = c + 1;
      sidx.push(a, c, b, b, c, d);
    }
    sg.setIndex(sidx);
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 4 * 3), 3));
    sg.setAttribute('aRow', new THREE.BufferAttribute(srow, 1));
    sg.setAttribute('aEdge', new THREE.BufferAttribute(sedge, 2));
    this.skirtGeo = sg;
    this.skirtMat = new THREE.ShaderMaterial({
      uniforms: { uRows: this.mat.uniforms.uRows, uEdge: this.mat.uniforms.uEdge, uFlow: this.mat.uniforms.uFlow },
      vertexShader: SKIRT_VS,
      fragmentShader: `uniform vec3 uEdge; uniform float uFlow; varying float vF; void main(){ float a = vF; gl_FragColor = vec4(uEdge * a * (0.35 + 0.65*uFlow), 1.0);} `,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
    });
    const sk = new THREE.Mesh(sg, this.skirtMat); sk.frustumCulled = false; scene.add(sk);
  }

  _writeMesh(rider) {
    const N = this.N, c = this.c, D = this.rowData;
    const spb = 60 / c.chart.bpm;
    // distance along the ribbon, fixed to the world (anchored to how far you've ridden)
    const cum = this._cum || (this._cum = new Float32Array(N));
    for (let i = 1; i < N; i++) cum[i] = cum[i - 1] + Math.hypot(this.wx[i] - this.wx[i - 1], this.wz[i] - this.wz[i - 1]);
    const fr = (this.tNow - this.t0w) * R, ir = Math.min(N - 2, Math.max(0, Math.floor(fr)));
    const base = rider.stats.dist - (cum[ir] + (cum[ir + 1] - cum[ir]) * (fr - ir));
    const k00 = Math.floor(this.t0w * R);
    const O1 = N * 4, O2 = 2 * N * 4, O3 = 3 * N * 4, O4 = 4 * N * 4, O5 = 5 * N * 4;
    const kY = this.kY, kVY = this.kVY, kCY = this.kCY, kSY = this.kSY, kYR = this.kYR, kW = this.kW;
    const kHold = this.kHold, kGap = this.kGap, kBeat = this.kBeat, kVD = this.kVD, kCD = this.kCD, kLit = this.lit, kHeld = this.held;
    const wx = this.wx, wz = this.wz, tNow = this.tNow;
    for (let i = 0; i < N; i++) {
      const k = k00 + i, tk = k / R, j = this._j(k);
      const px = wx[i], pz = wz[i];
      const cy = kCY[j], sy = kSY[j], vy = kVY[j];
      const rx = -cy, rz = sy;   // right = forward x up
      const v = i + 1 < N ? Math.hypot(wx[i + 1] - px, wz[i + 1] - pz) * R : Math.hypot(px - wx[i - 1], pz - wz[i - 1]) * R;
      const vv = Math.max(v, 8);
      const bank = clamp(Math.atan2(vv * kYR[j], 9.8) * 0.7, -0.36, 0.36);
      const cb = Math.cos(bank), sb = Math.sin(bank);
      const slope = -vy / vv;               // + downhill
      // surface normal: tilt by slope (pitch) and bank (roll)
      const fwy = vy / vv, il = 1 / Math.sqrt(1 + fwy * fwy);   // (forward is (sy, fwy, cy), |(sy, cy)| = 1)
      const fx = sy * il, fy = fwy * il, fz = cy * il;
      const rlx = rx * cb, rly = sb, rlz = rz * cb;
      // n = right x forward
      let nx = rly * fz - rlz * fy, ny = rlz * fx - rlx * fz, nz = rlx * fy - rly * fx;
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const o = i * 4;
      D[o] = px; D[o + 1] = kY[j]; D[o + 2] = pz; D[o + 3] = kW[j];
      D[O1 + o] = rlx; D[O1 + o + 1] = rly; D[O1 + o + 2] = rlz; D[O1 + o + 3] = tk;
      D[O2 + o] = nx; D[O2 + o + 1] = ny; D[O2 + o + 2] = nz; D[O2 + o + 3] = cum[i] + base;
      D[O3 + o] = kBeat[j]; D[O3 + o + 1] = slope; D[O3 + o + 2] = kLit[j]; D[O3 + o + 3] = kVD[j];   // (in beats)
      D[O4 + o] = kHold[j]; D[O4 + o + 1] = kGap[j]; D[O4 + o + 2] = kCD[j]; D[O4 + o + 3] = kHeld[j];
      const dtk = tk - tNow;
      const fade = smooth(-BACK, -BACK + 1, dtk) * (1 - smooth(AHEAD - 3, AHEAD, dtk));
      D[O5 + o] = kGap[j] ? 0 : 0.16 * fade;
    }
    this.rowTex.needsUpdate = true;
    // the let-go window (a perfect release) either side of the gate, in beats
    this.mat.uniforms.uWin.value = 0.085 / spb;
    this.mat.uniforms.uSong.value = this.tNow;
  }
}

// how many RGBA texels a row of road takes in the row texture (see _writeMesh)
const ROW_TEXELS = 6;

// the hold zones' colour: the song's own, saturated and bright enough to read as a colour of its
// own against its road (into out, when the looks change it mid-song)
const _hsl = {};
export function holdColour(palette, out = new THREE.Color()) {
  out.set(palette.hold ?? palette.glow);
  out.getHSL(_hsl); out.setHSL(_hsl.h, Math.max(_hsl.s, 0.72), Math.min(0.62, Math.max(_hsl.l, 0.5)));
  return out;
}

const RIBBON_VS = /* glsl */`
uniform highp sampler2D uRows;
attribute float aRow; attribute float aSide;
varying float vTime; varying float vSide; varying vec4 vMisc; varying vec3 vWorld; varying vec3 vN; varying float vDist; varying float vHold; varying float vGap; varying vec2 vZone;
void main(){
  int i = int(aRow + 0.5);
  vec4 r0 = texelFetch(uRows, ivec2(i, 0), 0), r1 = texelFetch(uRows, ivec2(i, 1), 0), r2 = texelFetch(uRows, ivec2(i, 2), 0);
  vec4 r3 = texelFetch(uRows, ivec2(i, 3), 0), r4 = texelFetch(uRows, ivec2(i, 4), 0);
  float u = aSide, xo = u * r0.w;
  // a shallow trough: the edges curl up a little so it reads as a track
  float lip = pow(abs(u), 6.0) * 0.55;
  vec3 p = vec3(r0.x + r1.x * xo, r0.y + r1.y * xo + lip, r0.z + r1.z * xo);
  vTime = r1.w; vSide = u; vMisc = r3; vN = r2.xyz; vDist = r2.w; vHold = r4.x; vGap = r4.y; vZone = r4.zw;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SKIRT_VS = /* glsl */`
uniform highp sampler2D uRows;
attribute float aRow; attribute vec2 aEdge;
varying float vF;
void main(){
  int i = int(aRow + 0.5);
  vec4 r0 = texelFetch(uRows, ivec2(i, 0), 0), r1 = texelFetch(uRows, ivec2(i, 1), 0), r5 = texelFetch(uRows, ivec2(i, 5), 0);
  float xo = aEdge.x * (r0.w + 0.05);
  vec3 p = vec3(r0.x + r1.x * xo, r0.y + r1.y * xo + 0.5 - 3.2 * aEdge.y, r0.z + r1.z * xo);
  vF = r5.x * (1.0 - aEdge.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const RIBBON_FS = /* glsl */`
uniform float uTime, uSong, uFlow, uBeatPhase, uFogDensity, uPulse, uStyle, uPress, uHit, uDapple, uShade, uStartT, uFinishT, uWin;
uniform vec3 uBase, uEdge, uFret, uGlow, uSky, uFogColor, uCam, uHoldCol, uGateCol, uHitCol, uSun, uSunDir;
varying float vTime; varying float vSide; varying vec4 vMisc; varying vec3 vWorld; varying vec3 vN; varying float vDist; varying float vHold; varying float vGap; varying vec2 vZone;
float aaLine(float d, float w){ float fw = fwidth(d); return 1.0 - smoothstep(w - fw, w + fw, abs(d)); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  // a gap: the road just isn't there (its broken ends glow)
  if (vGap > 0.5) discard;
  float beat = vMisc.x, slope = vMisc.y, lit = vMisc.z, vd = vMisc.w;
  float ahead = vTime - uSong;
  vec3 V = normalize(uCam - vWorld);
  // the last few metres in front of the camera: thin bright things there cross the bottom of the
  // screen in a frame or two (a phone held upright sees right down to them) and strobe, so they fade
  float camNear = smoothstep(2.2, 5.2, length(uCam - vWorld));
  vec3 N = normalize(vN);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);
  float across = abs(vSide);
  // body: dark lacquer, a little lighter down the middle (or, on the boardwalk, planks)
  vec3 col = uBase * (0.55 + 0.45 * (1.0 - across * across));
  if (uStyle > 0.5) {
    float pi = floor(vDist / 0.32), pf = fract(vDist / 0.32);
    float grain = h2(vec2(pi, floor(vSide * 3.0)));
    col = uBase * (0.6 + 0.55 * grain) * (0.45 + 0.55 * smoothstep(0.0, 0.07, pf) * smoothstep(1.0, 0.93, pf));
    col *= 0.85 + 0.15 * sin(vSide * 40.0 + grain * 6.0);
  }
  col += uSky * fres * 0.5;
  // daylight on the lacquer: sun through leaves (dapple), or the street's sun and shade between buildings
  if (uDapple + uShade > 0.001) {
    vec2 lp = vWorld.xz * 0.11 + vec2(uTime * 0.05, 0.0);
    float leaf = smoothstep(0.42, 0.62, sin(lp.x * 2.3 + sin(lp.y * 1.7)) * 0.5 + 0.5 * sin(lp.y * 2.9 + sin(lp.x * 1.3)));
    float bandId = floor(vDist / 26.0);
    float bandF = fract(vDist / 26.0);
    float gap = 0.25 + 0.5 * h2(vec2(bandId, 1.7));
    float sunny = smoothstep(0.0, 0.04, bandF - (1.0 - gap)) * smoothstep(1.0, 0.96, bandF);
    float lit = mix(1.0, leaf, uDapple) * mix(1.0, sunny, uShade);
    float ndl = max(dot(N, normalize(uSunDir)), 0.0);
    col *= mix(1.0, 0.5 + 0.5 * lit, min(1.0, uDapple + uShade));
    col += uSun * lit * ndl * (0.08 * uDapple + 0.2 * uShade) * (1.0 - across * 0.5);
  }
  // glitter in the lacquer, fixed to the world so it streams past
  vec2 gp = vWorld.xz * 7.0;
  vec2 gc = floor(gp), gf = fract(gp) - 0.5;
  float gfw = length(fwidth(gp));
  float gl = step(0.93, h2(gc)) * smoothstep(0.22, 0.0, length(gf)) * (0.5 + 0.5 * sin(uTime * 7.0 + h2(gc + 7.0) * 40.0));
  col += uFret * gl * 0.9 * (1.0 - across) * (1.0 - smoothstep(0.15, 0.6, gfw)) * camNear;
  // HOLD ZONES, each run downhill from the crest to the bottom of the dip: the road goes the
  // song's hold colour, building toward the bottom, chevrons pointing down it; a bright bar of it
  // across where it starts (press), the gate where it ends (let go, on the beat). Ridden, a
  // stretch you held through burns on behind you and one you didn't goes dark.
  float hz = smoothstep(-0.56, -0.44, vHold);
  float hp = clamp(vHold, 0.0, 1.0);
  float cdz = vZone.x, heldS = max(vZone.y, 0.0), rode = step(-0.5, vZone.y);
  float farK = 1.0 - smoothstep(6.5, 10.0, ahead);
  float seen = smoothstep(-2.4, -0.05, ahead) * farK;
  float lane = 1.0 - smoothstep(0.84, 0.88, across);
  float laneEdge = aaLine(across - 0.865, 0.014);
  float chev = fract(vDist / 2.2 - across * 0.85);
  float chevron = smoothstep(0.0, 0.05, chev) * (1.0 - smoothstep(0.2, 0.28, chev));
  float atHer = exp(-abs(ahead) * 5.0);
  // (softer right under the camera, so it never floods the bottom of the screen)
  float nearCam = smoothstep(0.0, 0.45, ahead);
  // (the chevrons and the start's bar are only drawn ahead of her, and fade before they reach the
  // camera: thin bright stripes sweeping under it strobed, a flash across the bottom of the screen)
  float chevK = smoothstep(0.08, 0.6, ahead) * camNear;
  // (coming up, a solid slab of the colour, so it reads from far off against the dark road the way
  // a long note does; ridden, a held one keeps a soft glow and a missed one goes dark, so the pink
  // under and behind her doesn't drown out the zones still coming. Filled bright from its first
  // row, its edges only a little brighter: bright edges round a dim middle bloomed into an outline
  // up the road, or a line, and read as something other than a space to hold)
  float fillA = (0.9 + 0.3 * hp + 0.14 * chevron * chevK) * (0.55 + 0.45 * nearCam);
  float fillR = mix(0.0, 0.13 + 0.1 * hp, heldS);
  float fill = mix(fillA, fillR, rode);
  col = mix(col, col * 0.5, hz * lane * seen * 0.7);
  col += uHoldCol * hz * lane * seen * fill;
  col += uHoldCol * hz * laneEdge * seen * (0.5 + 0.5 * hp) * mix(0.45 + 0.55 * nearCam, 0.1 + 0.4 * heldS, rode);
  // while you hold, it lights up round the board
  col += mix(uHoldCol, vec3(1.0), 0.2) * hz * uPress * exp(-abs(ahead) * 9.0) * lane * (0.3 + 0.4 * hp) * (1.0 - across * 0.6);
  // (no bar across where a zone starts, nor a glow leading up to it: a zone starts at a crest, so
  // from this side of the hill all that showed was the bar, a line alone on the hilltop with its
  // colour hidden beyond. The slab's own edge is its start. No hairline on every beat either: the
  // only line across the road is a zone's gate, where the colour you held ends)
  float approach = exp(-max(ahead, 0.0) * 0.45);
  // THE GATE at the bottom of each dip with a hold zone into it: let go here. A bright bar with a
  // soft band, pulsing on the beat as it nears, and either side of it, faintly, the window a perfect
  // release falls in. (Out as far as the zones are: beyond them a gate was a line on its own)
  float vb = aaLine(vd, 0.03);
  float band = exp(-abs(vd) * 30.0);
  float win = 1.0 - smoothstep(uWin * 0.85, uWin * 1.08, abs(vd));
  float passed = smoothstep(0.1, -0.05, ahead);
  float coming = (0.6 + 1.5 * approach) * (1.0 - passed) * (0.85 + 0.3 * uPulse) * (0.3 + 0.7 * smoothstep(0.02, 0.45, ahead)) * farK;
  col += uGateCol * (vb * 2.4 + band * 0.3 + win * 0.1 * lane) * coming * camNear;
  // what you cleared stays lit behind you; the one you just hit flares. Both fade out before
  // they reach the camera, so a hit never washes over the screen
  float behind = smoothstep(-0.045, -0.01, ahead);
  col += uGateCol * vb * passed * max(lit, 0.0) * 0.6 * behind * camNear;
  col += uHitCol * vb * uHit * 1.2 * behind * camNear;
  // lanes: two faint lines for speed
  col += uFret * aaLine(across - 0.36, 0.008) * 0.08;
  // rails
  float edge = smoothstep(0.88, 0.95, across);
  float rail = aaLine(across - 0.962, 0.016);
  float railK = (1.1 + 1.2 * uFlow + uPulse * 1.4) * (0.35 + 0.65 * exp(-max(ahead, 0.0) * 0.28));
  if (uStyle > 0.5) {
    // string lights: a bulb every metre and a bit along each rail
    float bf = fract(vDist / 1.4) - 0.5;
    float bulb = (1.0 - smoothstep(0.05, 0.16, length(vec2(bf * 1.4, (across - 0.962) * 8.0)))) ;
    col = mix(col, uBase * 0.5, edge * 0.6);
    col += uEdge * bulb * railK * 1.6 + uEdge * rail * 0.15;
  } else {
  col = mix(col, uEdge * 0.25, edge * 0.5);
  col += uEdge * rail * railK;
  }
  // what you rode well stays warm behind you
  col += uGlow * passed * max(lit, 0.0) * 0.06 * (1.0 - edge);
  // the broken edge of a gap burns
  col += uEdge * smoothstep(0.02, 0.45, vGap) * 3.0;
  // the chequered finish. (No white start line: it was a bar across the road that meant neither hold
  // nor let go; the gantry with the song's name over the road is the start)
  float df = vTime - uFinishT;
  if (abs(df) < 0.07) {
    float ch = mod(floor((vSide + 1.0) * 5.0) + floor(vDist / 0.95), 2.0);
    col = mix(col, mix(vec3(0.02), vec3(1.1), ch), 0.85 * (1.0 - edge));
  }
  // fog
  float d = length(uCam - vWorld);
  float fog = 1.0 - exp(-pow(d * uFogDensity, 1.6));
  col = mix(col, uFogColor, clamp(fog, 0.0, 1.0));
  col *= 1.0 - smoothstep(8.5, 11.0, ahead);
  gl_FragColor = vec4(col, 1.0);
}`;
