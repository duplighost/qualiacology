// Spiked: the people. One instanced crowd of tall dark figures, posed in the shader: the queue
// outside swaying with their phones up, the dancers bobbing through the verse and jumping
// with their hands up on every beat of the chorus, the watcher across the room who turns to
// follow her, the crowd turned to stone in the second chorus, and gone to light in the void.
// Everything here is drawn at the club's size: we are small in it.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { prepare, floorAt } from './trail.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// a person, 1.75 m, facing +z. aArm: -1/+1 for the arms (posed in the shader), aKind: 1 only
// on the dress-and-long-hair figures, 2 only on the others
function part(g, arm = 0, kind = 0) {
  g = g.index ? g.toNonIndexed() : g;
  const n = g.attributes.position.count;
  g.setAttribute('aArm', new THREE.BufferAttribute(new Float32Array(n).fill(arm), 1));
  g.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(n).fill(kind), 1));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}
function limb(r0, r1, a, b, seg = 7) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1);
  g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}
const ball = (r, sx, sy, sz, x, y, z, w = 10, h = 8) => { const g = new THREE.SphereGeometry(r, w, h); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const SHOULDER = [0.2, 1.41, 0];
export function figureGeometry() {
  const P = [];
  for (const s of [-1, 1]) {
    P.push(part(limb(0.078, 0.05, V3(s * 0.09, 0.93, 0), V3(s * 0.1, 0.08, 0.01))));
    P.push(part(ball(1, 0.05, 0.04, 0.12, s * 0.1, 0.04, 0.06, 7, 5)));
    // the arm, straight from the shoulder; the hand
    P.push(part(limb(0.047, 0.038, V3(s * 0.2, 1.41, 0), V3(s * 0.225, 1.12, 0.01)), s));
    P.push(part(limb(0.038, 0.03, V3(s * 0.225, 1.12, 0.01), V3(s * 0.24, 0.88, 0.03)), s * 2));
    P.push(part(ball(0.042, 1, 1.3, 0.8, s * 0.243, 0.84, 0.035, 6, 5), s * 2));
  }
  P.push(part(ball(1, 0.17, 0.11, 0.12, 0, 0.94, 0)));                                   // hips
  P.push(part(limb(0.125, 0.165, V3(0, 0.95, 0), V3(0, 1.43, 0), 9).scale(1, 1, 0.66)));  // torso
  P.push(part(ball(1, 0.21, 0.075, 0.11, 0, 1.41, 0)));                                   // shoulders
  P.push(part(limb(0.048, 0.044, V3(0, 1.45, 0), V3(0, 1.56, 0.01), 6)));                // neck
  P.push(part(ball(0.105, 0.92, 1.12, 1, 0, 1.65, 0.01, 12, 9)));                         // head
  // the ones in dresses, their hair long; the others, short hair and a jacket's hem
  P.push(part(new THREE.CylinderGeometry(0.135, 0.26, 0.46, 11, 1, true).translate(0, 0.73, 0).scale(1, 1, 0.8), 0, 1));
  P.push(part(ball(1, 0.125, 0.22, 0.1, 0, 1.53, -0.05), 0, 1));
  P.push(part(ball(0.112, 1, 0.75, 1.05, 0, 1.69, -0.005, 10, 6), 0, 2));
  P.push(part(limb(0.19, 0.172, V3(0, 0.86, 0), V3(0, 1.0, 0), 9).scale(1, 1, 0.66), 0, 2));
  const g = mergeGeometries(P, false);
  g.computeBoundingSphere();
  return g;
}

const VS = /* glsl */`
  attribute float aArm; attribute float aKind;
  attribute vec4 aSeed;     // seed, variant (0 dress, 1 not), mode, lag
  attribute vec3 aTint;
  uniform float uBeatF, uTime, uJump, uArms, uCrouch, uFreeze, uDissolve;
  varying vec3 vN; varying vec3 vW; varying vec3 vTint; varying vec3 vObj; varying float vMode; varying float vSeed;
  mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
  mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
  mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
  void main(){
    float s = aSeed.x, variant = aSeed.y, mode = aSeed.z, lag = aSeed.w;
    vSeed = s; vMode = mode; vTint = aTint; vObj = position;
    float hide = step(0.5, aKind) * step(aKind, 1.5) * step(0.5, variant) + step(1.5, aKind) * step(variant, 0.5);
    vec3 p = position, n = normal;
    // statues are always still; the dancers when the room freezes; the queue and the watcher never
    float frz = mode > 1.5 && mode < 2.5 ? 1.0 : (mode > 0.5 && mode < 1.5 ? uFreeze : 0.0);
    float T = mix(uTime, s * 53.0, frz);
    float f = mix(fract(uBeatF - lag), 0.2 + 0.6 * fract(s * 7.13), frz);
    float jumpAmt = mix(uJump, step(0.5, fract(s * 3.7)), frz);
    float armsAmt = mix(uArms, fract(s * 5.31), frz);
    float jump = 0.0, rL = 0.12, rR = 0.12, fL = 0.1, fR = 0.1, eL = 0.3, eR = 0.3, crouch = 0.0, twist = 0.0;
    float sw = sin(6.2832 * f + s * 6.0);
    if (mode < 0.5) {
      // waiting in line: a little sway; some with a phone up in front of them, some a drink
      float ph = step(0.62, s), dr = step(0.4, s) * (1.0 - ph);
      rR = mix(0.12, 0.22, ph); fR = mix(0.12, 0.95, ph) + 0.25 * dr; eR = mix(0.35, 1.55, ph) + 1.25 * dr;
      rL = 0.1; fL = 0.12; eL = 0.4 + 0.5 * step(0.2, fract(s * 3.3));
      twist = 0.09 * sin(T * 0.9 + s * 30.0);
      jump = 0.006 * sin(T * 1.7 + s * 20.0);
    } else if (mode > 3.5) {
      // the watcher, the man on the door: arms folded
      rL = -0.32; rR = -0.3; fL = 0.42; fR = 0.5; eL = 1.75; eR = 1.6;
    } else {
      float up = mode > 2.5 ? 1.0 : armsAmt;
      float ja = mode > 2.5 ? 0.45 + 0.55 * uJump : jumpAmt;
      float hop = 4.0 * f * (1.0 - f);
      jump = ja * hop * (0.11 + 0.12 * fract(s * 11.0)) + (1.0 - ja) * 0.025 * abs(sin(3.14159 * f + s));
      float one = step(0.8, fract(s * 9.1)), drink = step(0.55, fract(s * 4.7)) * (1.0 - up);
      // down: elbows bent, swinging with the beat (or a drink held up); up: hands in the air
      rL = mix(0.18 + 0.08 * sw, 2.62 + 0.2 * sin(T * 3.3 + s * 7.0), up * (1.0 - one));
      rR = mix(0.18 - 0.08 * sw, 2.5 + 0.25 * sin(T * 2.9 + s * 11.0), up);
      fL = mix(0.3 + 0.35 * sw, 0.25, up * (1.0 - one)) + one * up * (0.5 + 0.5 * hop);
      fR = mix(0.3 - 0.35 * sw + 0.2 * drink, 0.3 + 0.3 * fract(s * 4.1), up);
      eL = mix(1.25 + 0.35 * sw, 0.25, up * (1.0 - one)) + one * up * 1.2;
      eR = mix(1.25 - 0.35 * sw + 0.4 * drink, 0.2, up);
      if (mode > 2.5) { fL = 0.45; fR = 0.5; eL = 0.1; eR = 0.15; }
      crouch = uCrouch * (1.0 - frz) * (mode > 2.5 ? 0.0 : 1.0);
      twist = 0.3 * sin(T * 0.8 + s * 40.0) * (1.0 - up * 0.6);
    }
    float ck = 0.28 * crouch;
    if (abs(aArm) > 0.5) {
      float sd = sign(aArm);
      vec3 sh = vec3(sd * 0.2, 1.41, 0.0), el = vec3(sd * 0.225, 1.12, 0.01);
      float r = sd > 0.0 ? rR : rL, fw = sd > 0.0 ? fR : fL, eb = sd > 0.0 ? eR : eL;
      if (abs(aArm) > 1.5) { mat3 E = rotX(-eb); p = E * (p - el) + el; n = E * n; }
      mat3 R = rotX(-fw) * rotZ(sd * r);
      p = R * (p - sh) + sh; n = R * n;
      p.y -= 0.93 * ck;
    } else {
      // knees bent before the drop
      p.y = p.y < 0.93 ? p.y * (1.0 - ck) : p.y - 0.93 * ck;
    }
    mat3 Y = rotY(twist); p = Y * p; n = Y * n;
    p.y += jump;
    // in the void they come apart and drift up
    p.y += uDissolve * step(0.5, mode) * (0.4 + 0.8 * fract(s * 13.0)) * uDissolve;
    p *= 1.0 - hide;
    vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix * instanceMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const FS = /* glsl */`
  uniform vec3 uRimA, uRimB, uTop, uBelow, uAmb, uFog, uCam, uEdge;
  uniform float uFogDensity, uRimK, uStone, uDissolve, uStoneK;
  varying vec3 vN; varying vec3 vW; varying vec3 vTint; varying vec3 vObj; varying float vMode; varying float vSeed;
  float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  void main(){
    float diss = uDissolve * step(0.5, vMode) * step(vMode, 3.5);
    // (the noise only once they're coming apart: it's the costly part)
    float dn = 1.0, cut = -1.0;
    if (uDissolve > 0.001) { dn = n3(vObj * 11.0 + vSeed * 17.0) * 0.7 + n3(vObj * 31.0) * 0.3; cut = diss * 1.15 - 0.08; if (dn < cut) discard; }
    vec3 N = normalize(vN), V = normalize(uCam - vW);
    if (dot(N, V) < 0.0) N = -N;
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float rim = pow(1.0 - ndv, 2.6);
    vec3 rimC = mix(uRimA, uRimB, fract(vSeed * 3.31));
    vec3 lit = uTop * max(N.y, 0.0) + uBelow * max(-N.y, 0.0) + uAmb;
    vec3 col = vTint * lit + rimC * rim * uRimK;
    // stone: the statues always; the dancers when the second chorus freezes them
    float st = max(uStone * step(0.5, vMode) * step(vMode, 1.5), step(1.5, vMode) * step(vMode, 2.5));
    if (st > 0.001) {
      vec3 stone = vec3(0.52, 0.5, 0.48) * (0.7 + 0.3 * n3(vObj * 13.0 + vSeed * 5.0));
      float l = 0.3 + 0.7 * max(dot(N, normalize(vec3(0.25, 1.0, 0.35))), 0.0);
      vec3 sc = stone * l * uStoneK + rimC * rim * 0.45;
      col = mix(col, sc, st);
    }
    col += uEdge * smoothstep(0.1, 0.0, dn - cut) * step(0.001, diss) * 2.2;
    float d = length(uCam - vW);
    float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
    gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
  }`;

export function crowdMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBeatF: { value: 0 }, uTime: { value: 0 }, uJump: { value: 0 }, uArms: { value: 0 }, uCrouch: { value: 0 }, uFreeze: { value: 0 }, uDissolve: { value: 0 },
      uRimA: { value: new THREE.Color(0xff4fd8) }, uRimB: { value: new THREE.Color(0x40d8ff) }, uRimK: { value: 1 },
      uTop: { value: new THREE.Color(0.2, 0.18, 0.3) }, uBelow: { value: new THREE.Color(0.2, 0.1, 0.25) }, uAmb: { value: new THREE.Color(0.06, 0.05, 0.08) },
      uStone: { value: 0 }, uStoneK: { value: 1 }, uEdge: { value: new THREE.Color(0xff9ae8) },
      uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() },
    },
    vertexShader: VS, fragmentShader: FS,
  });
}

// where the hand with the phone ends up, in the figure's own space (the queue's pose)
const HAND = (() => {
  const v = new THREE.Vector3(0.243, 0.84, 0.035), el = new THREE.Vector3(0.225, 1.12, 0.01), sh = new THREE.Vector3(0.2, 1.41, 0);
  v.sub(el).applyAxisAngle(new THREE.Vector3(1, 0, 0), -1.55).add(el);
  v.sub(sh).applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.22).applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.95).add(sh);
  return v;
})();

// the crowd: rows of figures at song times, laid out each frame along the road as it is now
export class SpdCrowd {
  constructor(scene, course, plan, max = 900) {
    this.course = course; prepare(course, plan);
    const geo = figureGeometry();
    this.aSeed = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.aSeed.setUsage(THREE.DynamicDrawUsage);
    this.aTint = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3); this.aTint.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aSeed', this.aSeed); geo.setAttribute('aTint', this.aTint);
    this.mat = crowdMaterial();
    this.mesh = new THREE.InstancedMesh(geo, this.mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    scene.add(this.mesh);
    this.max = max;
    this.rows = [];
    this.lo = 0;
    this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._m = new THREE.Matrix4(); this._s = new THREE.Vector3(); this._h = new THREE.Vector3();
  }
  // a row: { t, figs: [{ x, rot, s, seed, variant, mode, lag, tint, dy, eyes, phone }] }
  addRow(row) { this.rows.push(row); }
  done() { this.rows.sort((a, b) => a.t - b.t); }

  // the frame: where she is, the beat, and how the room wants them to move
  update(S, camera, time, st) {
    const c = this.course, T = S.rider.t, track = S.track, rows = this.rows;
    const u = this.mat.uniforms;
    u.uTime.value = time; u.uBeatF.value = st.beatF; u.uJump.value = st.jump; u.uArms.value = st.arms; u.uCrouch.value = st.crouch;
    u.uFreeze.value = st.freeze; u.uStone.value = st.stone; u.uDissolve.value = st.dissolve; u.uRimK.value = st.rimK;
    u.uRimA.value.copy(st.rimA); u.uRimB.value.copy(st.rimB); u.uTop.value.copy(st.top); u.uBelow.value.copy(st.below); u.uAmb.value.copy(st.amb);
    u.uFog.value.set(S.P.fog); u.uFogDensity.value = S.P.fogDensity; u.uCam.value.copy(camera.position); u.uStoneK.value = st.stoneK ?? 1;
    while (this.lo < rows.length && rows[this.lo].t < T - 2.5) this.lo++;
    let n = 0;
    const p = this._p, m = this._m, q = this._q, e = this._e, sc = this._s, A = this.aSeed.array, B = this.aTint.array;
    const ahead = st.ahead ?? 14, rp = S.view && S.view.root ? S.view.root.position : null;
    this.eyes = this.eyes || []; this.eyes.length = 0;
    this.phones = this.phones || []; this.phones.length = 0;
    for (let i = this.lo; i < rows.length && n < this.max; i++) {
      const r = rows[i];
      if (r.t > T + ahead) break;
      track.ground(r.t, 0, p);
      const cx = p.x, cz = p.z, yaw = c.sample(r.t).yaw, ax = -Math.cos(yaw), az = Math.sin(yaw);
      const fy = floorAt(c, r.t) + (st.dropY || 0);
      for (const f of r.figs) {
        if (n >= this.max) break;
        p.set(cx + ax * f.x, fy + (f.dy || 0), cz + az * f.x);
        let y = yaw + f.rot;
        // the watcher turns to follow her
        if (f.mode === 4 && f.track && rp) y = Math.atan2(rp.x - p.x, rp.z - p.z);
        e.set(0, y, 0); q.setFromEuler(e);
        m.compose(p, q, sc.set(f.s, f.s, f.s));
        this.mesh.setMatrixAt(n, m);
        A[n * 4] = f.seed; A[n * 4 + 1] = f.variant; A[n * 4 + 2] = f.mode; A[n * 4 + 3] = f.lag;
        B[n * 3] = f.tint[0]; B[n * 3 + 1] = f.tint[1]; B[n * 3 + 2] = f.tint[2];
        if (f.eyes) { for (const sd of [-1, 1]) { this._h.set(sd * 0.04, 1.67, 0.1).applyMatrix4(m); this.eyes.push(this._h.x, this._h.y, this._h.z); } }
        if (f.mode === 0 && f.seed > 0.62) { this._h.copy(HAND).applyMatrix4(m); this.phones.push(this._h.x, this._h.y, this._h.z, f.s); }
        n++;
      }
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true; this.aSeed.needsUpdate = true; this.aTint.needsUpdate = true;
  }
}
