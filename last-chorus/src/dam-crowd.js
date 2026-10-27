// Don't Anybody Move: the people at her party. One instanced crowd (Spiked's figure, posed and
// dressed here): dancers on the beat, people standing about with a drink, and the ones she sings
// about, each held in their own pose. They all run on the party's clock, which stops dead while
// the band is out ("don't anybody move") and picks up again when it comes back. The ones in the
// photograph are flash-lit and never move, with a blurred copy of each beside them.
// Everything is drawn at the house's size: we are small in it.

import * as THREE from 'three';
import { figureGeometry } from './spd-crowd.js';
import { prepare, floorAt } from './trail.js';

// a party's clothes, the colours of a June night
export const DAM_SHIRTS = [0xe8604a, 0xf2c14a, 0x4a8ad8, 0xf4f0e8, 0x2a2a30, 0xd84a8a, 0x5ac8a0, 0xffa060, 0x8a5ad8, 0xc83a3a, 0x6aa8e8, 0xe8d0a8];

const VS = /* glsl */`
  attribute float aArm; attribute float aKind;
  attribute vec4 aSeed;     // seed, variant (0 dress and long hair, 1 trousers and short hair), mode, lag
  attribute vec3 aTint;     // what they're wearing
  attribute vec4 aPose;     // held: right arm out, left arm out, right arm forward, left arm forward
  attribute vec4 aPose2;    // held: right elbow, left elbow, turn, lean back; (the cut: in aCut)
  attribute float aCut;     // half of her out of the picture
  uniform float uBeat, uT, uArms, uJump, uGhost;
  varying vec3 vN; varying vec3 vW; varying vec3 vTint; varying vec3 vObj; varying float vSeed; varying float vVar; varying float vKind; varying float vArm; varying float vCut; varying float vMode;
  mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
  mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
  mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
  void main(){
    float s = aSeed.x, variant = aSeed.y, mode = aSeed.z, lag = aSeed.w;
    vSeed = s; vVar = variant; vKind = aKind; vArm = aArm; vObj = position; vTint = aTint; vCut = aCut; vMode = mode;
    float hide = step(0.5, aKind) * step(aKind, 1.5) * step(0.5, variant) + step(1.5, aKind) * step(variant, 0.5);
    vec3 p = position, n = normal;
    float f = fract(uBeat - lag), sw = sin(6.2832 * f + s * 6.0), hop = 4.0 * f * (1.0 - f);
    float rL = 0.12, rR = 0.12, fL = 0.1, fR = 0.1, eL = 0.3, eR = 0.3, twist = 0.0, jump = 0.0, lean = 0.0, crouch = 0.0;
    if (mode < 0.5) {
      // dancing: elbows in, swinging on the beat; hands up for the stick-up; a hop on the big ones
      float up = uArms, one = step(0.78, fract(s * 9.1));
      float ja = uJump * step(0.35, fract(s * 3.7));
      jump = ja * hop * (0.12 + 0.1 * fract(s * 11.0)) + (1.0 - ja) * 0.03 * abs(sin(3.14159 * f + s));
      crouch = (1.0 - ja) * 0.18 * (1.0 - hop) * (1.0 - up);
      rL = mix(0.2 + 0.1 * sw, 2.6 + 0.15 * sin(uT * 3.1 + s * 7.0), up * (1.0 - one));
      rR = mix(0.2 - 0.1 * sw, 2.5 + 0.2 * sin(uT * 2.7 + s * 11.0), up);
      fL = mix(0.35 + 0.4 * sw, 0.25, up * (1.0 - one)) + one * up * 0.6;
      fR = mix(0.35 - 0.4 * sw, 0.3, up);
      eL = mix(1.3 + 0.35 * sw, 0.25, up * (1.0 - one)) + one * up * 1.3;
      eR = mix(1.3 - 0.35 * sw, 0.2, up);
      twist = 0.35 * sin(uT * 0.9 + s * 40.0) * (1.0 - up * 0.6) + 0.12 * sw;
    } else if (mode < 1.5) {
      // standing about: a drink up in one hand, the other talking; hands up for the stick-up too
      float up = uArms * step(0.3, fract(s * 2.9));
      float talk = sin(uT * 2.3 + s * 17.0);
      rR = mix(0.16, 2.45, up); fR = mix(0.75 + 0.1 * sin(uT * 0.9 + s * 5.0), 0.3, up); eR = mix(1.5, 0.2, up);
      rL = mix(0.14 + 0.1 * max(talk, 0.0), 2.55, up); fL = mix(0.2 + 0.45 * max(talk, 0.0), 0.25, up); eL = mix(0.5 + 0.8 * max(talk, 0.0), 0.25, up);
      twist = 0.3 * sin(uT * 0.45 + s * 20.0);
      jump = 0.015 * abs(sin(3.14159 * f + s * 3.0));
    } else {
      // held in one pose: the ones she sings about, the ones in the photograph
      rR = aPose.x; rL = aPose.y; fR = aPose.z; fL = aPose.w; eR = aPose2.x; eL = aPose2.y; twist = aPose2.z; lean = aPose2.w;
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
      p.y = p.y < 0.93 ? p.y * (1.0 - ck) : p.y - 0.93 * ck;
    }
    mat3 Y = rotY(twist); p = Y * p; n = Y * n;
    mat3 L = rotX(-lean); p = L * p; n = L * n;
    p.y += jump;
    p *= 1.0 - hide;
    vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix * instanceMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const FS = /* glsl */`
  uniform vec3 uTop, uBelow, uAmb, uRim, uFog, uCam;
  uniform float uFogDensity, uFlash, uGhost;
  varying vec3 vN; varying vec3 vW; varying vec3 vTint; varying vec3 vObj; varying float vSeed; varying float vVar; varying float vKind; varying float vArm; varying float vCut; varying float vMode;
  vec3 pick4(float k, vec3 a, vec3 b, vec3 c, vec3 d){ return k < 0.25 ? a : (k < 0.5 ? b : (k < 0.75 ? c : d)); }
  void main(){
    // half of her is out of the picture
    if (vCut > 0.5 && vObj.x > 0.0) discard;
    float s = vSeed, y = vObj.y, arm = abs(vArm);
    vec3 skin = mix(vec3(0.96, 0.78, 0.64), vec3(0.4, 0.26, 0.17), fract(s * 7.71));
    vec3 hair = pick4(fract(s * 3.31), vec3(0.12, 0.08, 0.05), vec3(0.05, 0.04, 0.04), vec3(0.78, 0.6, 0.32), vec3(0.45, 0.18, 0.08));
    vec3 legs = pick4(fract(s * 5.93), vec3(0.2, 0.3, 0.5), vec3(0.09, 0.09, 0.1), vec3(0.6, 0.52, 0.38), vec3(0.85, 0.83, 0.78));
    vec3 shoe = fract(s * 13.7) < 0.5 ? vec3(0.92, 0.9, 0.86) : vec3(0.1, 0.09, 0.09);
    float shortSleeve = step(0.35, fract(s * 2.13));
    vec3 col = vTint;
    if (vKind > 0.5 && vKind < 1.5) col = y > 1.3 ? hair : vTint;            // long hair; the dress
    else if (vKind > 1.5) col = y > 1.55 ? hair : vTint;                     // short hair; the jacket's hem
    else if (arm > 1.5) col = y < 0.9 ? skin : mix(vTint, skin, shortSleeve); // hands; forearms
    else if (arm > 0.5) col = vTint;                                         // upper arms
    else if (y > 1.45) col = skin;                                           // neck, face
    else if (y > 0.93) col = vTint;
    else if (y > 0.1) col = vVar < 0.5 ? skin : legs;                        // bare legs under a dress; trousers
    else col = shoe;
    vec3 N = normalize(vN), V = normalize(uCam - vW);
    if (dot(N, V) < 0.0) N = -N;
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float rim = pow(1.0 - ndv, 2.4);
    vec3 lit = uTop * (0.45 + 0.55 * max(N.y, 0.0)) + uBelow * max(-N.y, 0.0) + uAmb;
    // and the room's light on whatever faces us, so they stand out from the walls
    vec3 c = col * (lit * 1.15 + uTop * 0.55 * pow(ndv, 1.5)) + uRim * rim;
    // the flash on the camera: what faces it blown white, the rest gone dark
    c = mix(c, col * (0.25 + 2.3 * pow(ndv, 1.4)) + vec3(0.35) * pow(ndv, 6.0), uFlash);
    float d = length(uCam - vW);
    float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
    gl_FragColor = vec4(mix(c, uFog, clamp(fog, 0.0, 1.0)), uGhost > 0.5 ? 0.26 : 1.0);
  }`;

export function damCrowdMaterial(ghost = false) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBeat: { value: 0 }, uT: { value: 0 }, uArms: { value: 0 }, uJump: { value: 0 }, uGhost: { value: ghost ? 1 : 0 }, uFlash: { value: 0 },
      uTop: { value: new THREE.Color(0.9, 0.8, 0.7) }, uBelow: { value: new THREE.Color(0.25, 0.15, 0.12) }, uAmb: { value: new THREE.Color(0.12, 0.1, 0.1) }, uRim: { value: new THREE.Color(0.5, 0.35, 0.25) },
      uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() },
    },
    vertexShader: VS, fragmentShader: FS,
    transparent: ghost, depthWrite: !ghost,
  });
}

// the crowd: rows of people at song times, laid out each frame along the road as it is now.
// A row: { t, ground (on the street, not her floor), figs: [{ x, rot, s, seed, variant, mode, lag, tint, pose, pose2, cut, ghost, flash }] }
export class DamCrowd {
  constructor(scene, course, plan, max = 700, flash = false) {
    this.course = course; prepare(course, plan);
    this.max = max;
    const mk = (n, ghost) => {
      const geo = figureGeometry();
      const A = {};
      for (const [k, sz] of [['aSeed', 4], ['aTint', 3], ['aPose', 4], ['aPose2', 4], ['aCut', 1]]) { A[k] = new THREE.InstancedBufferAttribute(new Float32Array(n * sz), sz); A[k].setUsage(THREE.DynamicDrawUsage); geo.setAttribute(k, A[k]); }
      const mat = damCrowdMaterial(ghost);
      mat.uniforms.uFlash.value = flash ? 1 : 0;
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false; mesh.count = 0;
      if (ghost) mesh.renderOrder = 2;
      scene.add(mesh);
      return { mesh, mat, A, n: 0, max: n };
    };
    this.solid = mk(max, false);
    this.ghost = mk(Math.round(max * 0.6), true);
    this.both = [this.solid, this.ghost];
    this.rows = [];
    this.lo = 0;
    this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._m = new THREE.Matrix4(); this._s = new THREE.Vector3(); this._o = new THREE.Vector3();
  }
  addRow(row) { this.rows.push(row); }
  done() { this.rows.sort((a, b) => a.t - b.t); }

  _put(B, m, f, mode) {
    if (B.n >= B.max) return;
    const i = B.n++, A = B.A;
    B.mesh.setMatrixAt(i, m);
    A.aSeed.array[i * 4] = f.seed; A.aSeed.array[i * 4 + 1] = f.variant; A.aSeed.array[i * 4 + 2] = mode; A.aSeed.array[i * 4 + 3] = f.lag || 0;
    A.aTint.array[i * 3] = f.tint[0]; A.aTint.array[i * 3 + 1] = f.tint[1]; A.aTint.array[i * 3 + 2] = f.tint[2];
    const P = f.pose || ZERO4, Q = f.pose2 || ZERO4;
    for (let k = 0; k < 4; k++) { A.aPose.array[i * 4 + k] = P[k]; A.aPose2.array[i * 4 + k] = Q[k]; }
    A.aCut.array[i] = f.cut ? 1 : 0;
  }

  // the frame: where she is, the party's clock, and how the room wants them to move
  update(S, camera, st) {
    const c = this.course, T = S.rider.t, track = S.track, rows = this.rows;
    for (const B of this.both) {
      const u = B.mat.uniforms;
      u.uT.value = st.clock; u.uBeat.value = st.beat; u.uArms.value = st.arms; u.uJump.value = st.jump;
      u.uTop.value.copy(st.top); u.uBelow.value.copy(st.below); u.uAmb.value.copy(st.amb); u.uRim.value.copy(st.rim);
      u.uFog.value.set(S.P.fog); u.uFogDensity.value = S.P.fogDensity; u.uCam.value.copy(camera.position);
      if (st.flash !== undefined) u.uFlash.value = st.flash;
      B.n = 0;
    }
    while (this.lo < rows.length && rows[this.lo].t < T - 3) this.lo++;
    const p = this._p, m = this._m, q = this._q, e = this._e, sc = this._s;
    const ahead = st.ahead ?? 15;
    for (let i = this.lo; i < rows.length; i++) {
      const r = rows[i];
      if (r.t > T + ahead) break;
      if (r.from !== undefined && T < r.from) continue;
      if (r.to !== undefined && T > r.to) continue;
      track.ground(r.t, 0, p);
      const cx = p.x, cz = p.z, yaw = c.yawAt(r.t), ax = -Math.cos(yaw), az = Math.sin(yaw);
      const fy = r.ground ? 0 : floorAt(c, r.t);
      for (const f of r.figs) {
        p.set(cx + ax * f.x + Math.sin(yaw) * (f.z || 0), fy + (f.dy || 0), cz + az * f.x + Math.cos(yaw) * (f.z || 0));
        e.set(0, yaw + (f.rot || 0), 0); q.setFromEuler(e);
        m.compose(p, q, sc.set(f.s, f.s, f.s));
        // a held pose until its moment, then off dancing (the picture taken at the end)
        const mode = f.until !== undefined && (f.until === 'snap' ? S.town.damSnap : T > f.until) ? 0 : f.mode;
        this._put(this.solid, m, f, mode);
        if (f.ghost) {
          // the blur: the same pose a little to one side, see-through
          for (const g of f.ghost) {
            p.set(cx + ax * (f.x + g[0]) + Math.sin(yaw) * ((f.z || 0) + g[1]), fy + (f.dy || 0) + (g[2] || 0), cz + az * (f.x + g[0]) + Math.cos(yaw) * ((f.z || 0) + g[1]));
            e.set(0, yaw + (f.rot || 0) + (g[3] || 0), 0); q.setFromEuler(e);
            m.compose(p, q, sc.set(f.s, f.s, f.s));
            this._put(this.ghost, m, f, mode);
          }
        }
      }
    }
    for (const B of this.both) {
      B.mesh.count = B.n;
      B.mesh.visible = B.n > 0;
      if (!B.n) continue;
      // (only the part in use this frame goes up)
      const im = B.mesh.instanceMatrix; im.clearUpdateRanges(); im.addUpdateRange(0, B.n * 16); im.needsUpdate = true;
      for (const k in B.A) { const A = B.A[k]; A.clearUpdateRanges(); A.addUpdateRange(0, B.n * A.itemSize); A.needsUpdate = true; }
    }
  }
}
const ZERO4 = [0, 0, 0, 0];
