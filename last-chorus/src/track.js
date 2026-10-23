// Lays the course out in the world and draws the ribbon you ride.
// Behind you the ground is where you actually rode it. Ahead, it is placed by
// how fast you are going now, easing toward your average speed further out, so
// the far road breathes a little when you speed up but the near road never moves.

import * as THREE from 'three';
import { KIND_ID } from './course.js';

const R = 30;               // render samples per second of song
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
    this.lit = new Map();        // render sample index -> flow when you passed (for the glow you leave)
    this.s = {};
    this._buildMesh(scene, palette);
  }

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
        const back = (t - tk) * rider.v;
        const yaw = c.sample(tk, this.s).yaw;
        this.frozen.set(k, [rider.xz.x - Math.sin(yaw) * back, rider.xz.z - Math.cos(yaw) * back]);
        this.lit.set(k, rider.flow);
      }
      this._lastK = kr;
      // forget far past
      for (const key of this.frozen.keys()) { if (key < k0 - 4) { this.frozen.delete(key); this.lit.delete(key); } else break; }
    }
    // integrate ahead from the rider
    const v0 = rider.v, va = Math.max(rider.vAvg, 18);
    let x = rider.xz.x, z = rider.xz.z, tp = t;
    const N = this.N;
    for (let i = 0; i < N; i++) {
      const k = k0 + i, tk = k / R;
      if (tk <= t) {
        const f = this.frozen.get(k);
        if (f) { this.wx[i] = f[0]; this.wz[i] = f[1]; }
        else {
          const back = (t - tk) * rider.v, yaw = c.sample(tk, this.s).yaw;
          this.wx[i] = rider.xz.x - Math.sin(yaw) * back; this.wz[i] = rider.xz.z - Math.cos(yaw) * back;
        }
        continue;
      }
      // step from tp to tk with predicted speed (trapezoid)
      const dt = tk - tp;
      const tm = (tp + tk) / 2;
      const vp = v0 + (va - v0) * smooth(0, 3.2, tm - t);
      const yaw = c.sample(tm, this.s).yaw;
      x += Math.sin(yaw) * vp * dt; z += Math.cos(yaw) * vp * dt;
      this.wx[i] = x; this.wz[i] = z; tp = tk;
    }
    // coarse far layout continuing from the window's end
    this.tf0 = (k0 + N - 1) / R;
    this.fx[0] = this.wx[N - 1]; this.fz[0] = this.wz[N - 1];
    for (let i = 1; i < this.Nf; i++) {
      const ta = this.tf0 + (i - 1) / 4, tb = this.tf0 + i / 4;
      const yaw = c.sample((ta + tb) / 2, this.s).yaw;
      this.fx[i] = this.fx[i - 1] + Math.sin(yaw) * va * 0.25;
      this.fz[i] = this.fz[i - 1] + Math.cos(yaw) * va * 0.25;
    }
    this._writeMesh(rider);
  }

  // world position on the course at song time t, lateral offset x, height above ribbon h
  at(t, x = 0, h = 0, out = new THREE.Vector3()) {
    const c = this.c;
    let px, pz;
    const fi = (t - this.t0w) * R;
    if (fi >= 0 && fi <= this.N - 1) {
      const i = Math.floor(fi), a = fi - i, j = Math.min(i + 1, this.N - 1);
      px = this.wx[i] + (this.wx[j] - this.wx[i]) * a;
      pz = this.wz[i] + (this.wz[j] - this.wz[i]) * a;
    } else if (fi > this.N - 1) {
      const ff = (t - this.tf0) * 4;
      const i = clamp(Math.floor(ff), 0, this.Nf - 2), a = clamp(ff - i, 0, 1.5);
      px = this.fx[i] + (this.fx[i + 1] - this.fx[i]) * a;
      pz = this.fz[i] + (this.fz[i + 1] - this.fz[i]) * a;
    } else {
      // behind the window: extrapolate backward from its start
      const yaw = c.sample(this.t0w, this.s).yaw;
      const back = (this.t0w - t) * 30;
      px = this.wx[0] - Math.sin(yaw) * back; pz = this.wz[0] - Math.cos(yaw) * back;
    }
    const s = c.sample(t, this.s);
    const bank = this.bankAt(t);
    const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
    // right vector (x across): heading (sin,cos) rotated -90deg in plane
    const rx = -cy, rz = sy;   // right = forward x up
    const cb = Math.cos(bank), sb = Math.sin(bank);
    out.set(px + rx * x * cb, s.y + x * sb + h, pz + rz * x * cb);
    return out;
  }

  // ground-level point under the course at lateral offset x (no bank), y = 0
  ground(t, x = 0, out = new THREE.Vector3()) {
    this.at(t, 0, 0, out);
    const yaw = this.c.sample(t, this.s).yaw;
    out.x += -Math.cos(yaw) * x; out.z += Math.sin(yaw) * x; out.y = 0;
    return out;
  }

  // the ribbon banks into turns like a coordinated turn would at the speed laid out
  bankAt(t) {
    const s = this.c.sample(t, this.s);
    const v = this.speedAt(t);
    return clamp(Math.atan2(v * s.yawRate, 9.8) * 0.7, -0.36, 0.36);
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
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * (M + 1) * 3);
    const nor = new Float32Array(N * (M + 1) * 3);
    const tim = new Float32Array(N * (M + 1));
    const side = new Float32Array(N * (M + 1));
    const misc = new Float32Array(N * (M + 1) * 4);   // beat, slope, lit, kind
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j, b = a + 1, c = a + (M + 1), d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aTime', new THREE.BufferAttribute(tim, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSide', new THREE.BufferAttribute(side, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aMisc', new THREE.BufferAttribute(misc, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aDist', new THREE.BufferAttribute(new Float32Array(N * (M + 1)), 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uSong: { value: 0 }, uFlow: { value: 0.3 }, uBeatPhase: { value: 0 },
        uBase: { value: new THREE.Color(palette.ribbon) }, uEdge: { value: new THREE.Color(palette.edge) },
        uFret: { value: new THREE.Color(palette.fret) }, uGlow: { value: new THREE.Color(palette.glow) },
        uSky: { value: new THREE.Color(palette.horizon) }, uFogColor: { value: new THREE.Color(palette.fog) },
        uFogDensity: { value: palette.fogDensity }, uCam: { value: new THREE.Vector3() }, uPulse: { value: 0 }, uStyle: { value: palette.ribbonStyle ?? 0 },
      },
      vertexShader: RIBBON_VS, fragmentShader: RIBBON_FS,
      side: THREE.DoubleSide, transparent: false,
    });
    const mesh = new THREE.Mesh(g, this.mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    this.mesh = mesh;

    // under-glow: a soft additive skirt under each edge so the ribbon reads at night
    const sg = new THREE.BufferGeometry();
    const sp = new Float32Array(N * 4 * 3), sa = new Float32Array(N * 4);
    const sidx = [];
    for (let i = 0; i < N - 1; i++) for (const e of [0, 2]) {
      const a = i * 4 + e, b = a + 1, c = a + 4, d = c + 1;
      sidx.push(a, c, b, b, c, d);
    }
    sg.setIndex(sidx);
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3).setUsage(THREE.DynamicDrawUsage));
    sg.setAttribute('aFade', new THREE.BufferAttribute(sa, 1).setUsage(THREE.DynamicDrawUsage));
    this.skirtGeo = sg;
    this.skirtMat = new THREE.ShaderMaterial({
      uniforms: { uEdge: this.mat.uniforms.uEdge, uFlow: this.mat.uniforms.uFlow },
      vertexShader: `attribute float aFade; varying float vF; void main(){ vF=aFade; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `uniform vec3 uEdge; uniform float uFlow; varying float vF; void main(){ float a = vF; gl_FragColor = vec4(uEdge * a * (0.35 + 0.65*uFlow), 1.0);} `,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
    });
    const sk = new THREE.Mesh(sg, this.skirtMat); sk.frustumCulled = false; scene.add(sk);
  }

  _writeMesh(rider) {
    const N = this.N, M = ACROSS, c = this.c;
    const pos = this.geo.attributes.position.array, nor = this.geo.attributes.normal.array;
    const tim = this.geo.attributes.aTime.array, side = this.geo.attributes.aSide.array, misc = this.geo.attributes.aMisc.array;
    const sp = this.skirtGeo.attributes.position.array, sa = this.skirtGeo.attributes.aFade.array;
    const s = this.s;
    // distance along the ribbon, fixed to the world (anchored to how far you've ridden)
    const dist = this.geo.attributes.aDist.array;
    const cum = this._cum || (this._cum = new Float32Array(N));
    for (let i = 1; i < N; i++) cum[i] = cum[i - 1] + Math.hypot(this.wx[i] - this.wx[i - 1], this.wz[i] - this.wz[i - 1]);
    const fr = (this.tNow - this.t0w) * R, ir = Math.min(N - 2, Math.max(0, Math.floor(fr)));
    const base = rider.stats.dist - (cum[ir] + (cum[ir + 1] - cum[ir]) * (fr - ir));
    for (let i = 0; i < N; i++) {
      const k = Math.floor(this.t0w * R) + i, tk = k / R;
      c.sample(tk, s);
      const px = this.wx[i], pz = this.wz[i];
      const yaw = s.yaw, cy = Math.cos(yaw), sy = Math.sin(yaw);
      const rx = -cy, rz = sy;   // right = forward x up
      const v = i + 1 < N ? Math.hypot(this.wx[i + 1] - px, this.wz[i + 1] - pz) * R : Math.hypot(px - this.wx[i - 1], pz - this.wz[i - 1]) * R;
      const vv = Math.max(v, 8);
      const bank = clamp(Math.atan2(vv * s.yawRate, 9.8) * 0.7, -0.36, 0.36);
      const cb = Math.cos(bank), sb = Math.sin(bank);
      const w = s.width;
      const slope = -s.vy / vv;               // + downhill
      // surface normal: tilt by slope (pitch) and bank (roll)
      const fwx = sy, fwz = cy, fwy = s.vy / vv;
      const fl = Math.hypot(fwx, fwy, fwz);
      const rlx = rx * cb, rly = sb, rlz = rz * cb;
      // n = right x forward
      let nx = rly * (fwz / fl) - rlz * (fwy / fl), ny = rlz * (fwx / fl) - rlx * (fwz / fl), nz = rlx * (fwy / fl) - rly * (fwx / fl);
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const beatPos = c.beatAt(tk);
      const lit = this.lit.has(k) ? this.lit.get(k) : -1;
      const vd = c.valleyDist(tk) / (60 / c.chart.bpm);   // in beats
      for (let j = 0; j <= M; j++) {
        const u = j / M * 2 - 1;
        // a shallow trough: edges curl up a little so it reads as a track
        const lip = Math.pow(Math.abs(u), 6) * 0.55;
        const xo = u * w;
        const o = (i * (M + 1) + j);
        pos[o * 3] = px + rlx * xo; pos[o * 3 + 1] = s.y + rly * xo + lip; pos[o * 3 + 2] = pz + rlz * xo;
        nor[o * 3] = nx; nor[o * 3 + 1] = ny; nor[o * 3 + 2] = nz;
        tim[o] = tk; side[o] = u;
        misc[o * 4] = beatPos; misc[o * 4 + 1] = slope; misc[o * 4 + 2] = lit; misc[o * 4 + 3] = vd;
        dist[o] = cum[i] + base;
      }
      // skirts hang from both edges
      for (let e = 0; e < 2; e++) {
        const u = e ? 1 : -1, xo = u * (w + 0.05);
        const bx = px + rlx * xo, by = s.y + rly * xo + 0.5, bz = pz + rlz * xo;
        const o = i * 4 + e * 2;
        sp[o * 3] = bx; sp[o * 3 + 1] = by; sp[o * 3 + 2] = bz;
        sp[(o + 1) * 3] = bx; sp[(o + 1) * 3 + 1] = by - 3.2; sp[(o + 1) * 3 + 2] = bz;
        const fade = smooth(-BACK, -BACK + 1, tk - this.tNow) * (1 - smooth(AHEAD - 3, AHEAD, tk - this.tNow));
        sa[o] = 0.16 * fade; sa[o + 1] = 0;
      }
    }
    for (const a of ['position', 'normal', 'aTime', 'aSide', 'aMisc', 'aDist']) this.geo.attributes[a].needsUpdate = true;
    this.skirtGeo.attributes.position.needsUpdate = true; this.skirtGeo.attributes.aFade.needsUpdate = true;
    this.mat.uniforms.uSong.value = this.tNow;
  }
}

const RIBBON_VS = /* glsl */`
attribute float aTime; attribute float aSide; attribute vec4 aMisc; attribute float aDist;
varying float vTime; varying float vSide; varying vec4 vMisc; varying vec3 vWorld; varying vec3 vN; varying float vDist;
void main(){
  vTime = aTime; vSide = aSide; vMisc = aMisc; vN = normal; vDist = aDist;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const RIBBON_FS = /* glsl */`
uniform float uTime, uSong, uFlow, uBeatPhase, uFogDensity, uPulse, uStyle;
uniform vec3 uBase, uEdge, uFret, uGlow, uSky, uFogColor, uCam;
varying float vTime; varying float vSide; varying vec4 vMisc; varying vec3 vWorld; varying vec3 vN; varying float vDist;
float aaLine(float d, float w){ float fw = fwidth(d); return 1.0 - smoothstep(w - fw, w + fw, abs(d)); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  float beat = vMisc.x, slope = vMisc.y, lit = vMisc.z, vd = vMisc.w;
  float ahead = vTime - uSong;
  vec3 V = normalize(uCam - vWorld);
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
  // glitter in the lacquer, fixed to the world so it streams past
  vec2 gp = vWorld.xz * 7.0;
  vec2 gc = floor(gp), gf = fract(gp) - 0.5;
  float gfw = length(fwidth(gp));
  float gl = step(0.93, h2(gc)) * smoothstep(0.22, 0.0, length(gf)) * (0.5 + 0.5 * sin(uTime * 7.0 + h2(gc + 7.0) * 40.0));
  col += uFret * gl * 0.9 * (1.0 - across) * (1.0 - smoothstep(0.15, 0.6, gfw));
  // downhill is lit faintly: that is where pressing pays
  float near = smoothstep(-0.1, 0.6, ahead) * (1.0 - smoothstep(5.0, 9.0, ahead));
  float down = smoothstep(0.02, 0.25, slope);
  col += uGlow * down * near * 0.16 * (1.0 - across);
  // every beat a hairline across; the bottom of every dip a bold bar
  float fb = fract(beat + 0.5) - 0.5;
  float approach = exp(-max(ahead, 0.0) * 0.45);
  col += uFret * aaLine(fb, 0.012) * (0.05 + 0.25 * approach) * (1.0 - across * 0.6) * smoothstep(0.02, 0.3, ahead);
  float vb = aaLine(vd, 0.07);
  float passed = smoothstep(0.15, -0.1, ahead);
  col += uEdge * vb * (0.25 + 1.1 * approach * (1.0 - passed) + passed * max(lit, 0.0) * 0.9);
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
  // fog
  float d = length(uCam - vWorld);
  float fog = 1.0 - exp(-pow(d * uFogDensity, 1.6));
  col = mix(col, uFogColor, clamp(fog, 0.0, 1.0));
  col *= 1.0 - smoothstep(8.5, 11.0, ahead);
  gl_FragColor = vec4(col, 1.0);
}`;
