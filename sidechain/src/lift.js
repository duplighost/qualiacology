// The chorus lift. Every chorus (and the final ones) opens up the same way, and each song tunes
// it (entry.lift): on its first beat a flash in the song's colour, a shockwave out to the rails
// and the camera kicked wide; all through it more bloom and colour, the fog pulled back so you
// see further, the air rushing past, a breath of light on every beat. A song can stand
// searchlights out along both sides that swing with the beat, in its own colours.

import * as THREE from 'three';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// a shaft of light reads from the side; looking straight down one it would be a white disc, so
// it fades as it turns toward the camera (vA: the beam's axis in view space)
const BEAM_VS = `attribute float aK; varying float vL; varying float vK; varying vec3 vN; varying vec3 vV; varying vec3 vC; varying vec3 vA; attribute vec3 aCol;
void main(){ vL = uv.y; vK = aK; vC = aCol; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vA = normalize(normalMatrix * mat3(instanceMatrix) * vec3(0.0, 1.0, 0.0)); gl_Position = projectionMatrix * mv; }`;
const BEAM_FS = `varying float vL; varying float vK; varying vec3 vN; varying vec3 vV; varying vec3 vC; varying vec3 vA;
void main(){ vec3 V = normalize(vV); float f = abs(dot(normalize(vN), V)); float end = 1.0 - smoothstep(0.5, 0.9, abs(dot(normalize(vA), V)));
  // up out of the dark over its first fifth (a lamp seen from above would bloom into a white ball), gone by the far end
  float a = pow(f, 3.0) * pow(max(1.0 - vL, 0.0), 1.2) * smoothstep(0.0, 0.22, vL) * vK * end;
  // never let a bad value through: one NaN in the HDR target becomes a white bloom with black holes
  a = (a == a) ? clamp(a, 0.0, 4.0) : 0.0; if (vK <= 0.0) discard; gl_FragColor = vec4(vC * a, 1.0); }`;

export class Lift {
  constructor(scene, course, P, entry) {
    this.course = course;
    this.cfg = entry.lift || {};
    this.k = 0;            // how far into the lift we are, 0..1
    this.drop = 0;         // the first beat's hit, decaying
    this.sec = null;
    this.fired = new Set();
    // the searchlights: a pool stood at fixed song times along both sides while a chorus is on
    const bc = this.cfg.beams;
    this.beamsOn = !!bc;
    if (this.beamsOn) {
      const opt = bc === true ? {} : bc;
      this.beamX = opt.x ?? 40; this.beamEvery = opt.every ?? 1.1; this.beamLen = opt.len ?? 130; this.beamTop = opt.r ?? 3.2; this.beamY = opt.y ?? 16;
      const cols = (opt.colors || [P.edge, P.glow, P.fret]).map((c) => new THREE.Color(c));
      this.cols = cols;
      const g = new THREE.CylinderGeometry(this.beamTop, 0.35, this.beamLen, 14, 1, true); g.translate(0, this.beamLen / 2, 0);

      this.N = 18;
      this.aK = new THREE.InstancedBufferAttribute(new Float32Array(this.N), 1); this.aK.setUsage(THREE.DynamicDrawUsage);
      this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(this.N * 3), 3); this.aCol.setUsage(THREE.DynamicDrawUsage);
      // the cylinder's own uv.y runs 1 at its top to 0 at its bottom: 0 at the lamp, as the shader wants
      g.setAttribute('aK', this.aK); g.setAttribute('aCol', this.aCol);
      this.beamMat = new THREE.ShaderMaterial({ vertexShader: BEAM_VS, fragmentShader: BEAM_FS, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      this.beams = new THREE.InstancedMesh(g, this.beamMat, this.N);
      this.beams.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.beams.frustumCulled = false; this.beams.count = 0;
      scene.add(this.beams);
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    }
  }

  // which sections lift: choruses and finals, unless a song says otherwise
  lifts(sec) { return (this.cfg.kinds || ['chorus', 'final']).includes(sec.kind); }

  // call once a frame while riding; returns true on the frame a lift's first beat lands
  update(S, dt, beatPulse, riding) {
    const r = S.rider, t = r.t, c = this.course;
    const sec = c.sectionAt(t);
    const on = riding && this.lifts(sec);
    // in over a beat, out over two (and early out if the section's about to end)
    const spb = 60 / (c.chart.bpm || 120);
    const want = on ? clamp((sec.tb - t) / (2 * spb), 0, 1) * (this.cfg.k ?? 1) : 0;
    this.k += (want - this.k) * Math.min(1, dt * (want > this.k ? 1 / spb : 0.5 / spb));
    let hit = false;
    if (on && !this.fired.has(sec.ta) && t >= sec.ta && t < sec.ta + 0.5) { this.fired.add(sec.ta); this.drop = 1; hit = true; this.sec = sec; }
    this.drop *= Math.exp(-dt * 2.6);
    this.beat = beatPulse * this.k;
    if (this.beamsOn) this._beams(S, t, sec, on);
    return hit;
  }

  _beams(S, t, sec, on) {
    const c = this.course, T = S.track;
    let n = 0;
    // stood every beamEvery seconds of song through each lifting section, from a little before you get there
    const from = Math.ceil((t - 2) / this.beamEvery) * this.beamEvery;
    const bpos = c.beatAt(t), bf = bpos - Math.floor(bpos);
    for (let tb = from; tb < t + 14 && n < this.N; tb += this.beamEvery) {
      const s = c.sectionAt(tb);
      if (!this.lifts(s)) continue;
      const kk = Math.min(1, (tb - s.ta) / 0.6 + 0.2) * Math.min(1, (s.tb - tb) / 0.8) * Math.min(1, (t + 14 - tb) / 4);
      if (kk <= 0) continue;
      const i = Math.round(tb / this.beamEvery);
      for (const side of [-1, 1]) {
        if (n >= this.N) break;
        const bx = side * (this.beamX + (i % 3) * 6);
        T.ground(tb, bx, this._p); this._p.y = (S.town && S.town.floorFn ? S.town.floorFn(tb, bx) : 0) + this.beamY;
        // each beam leans out and swings across on the beat, the two sides mirrored
        const swing = Math.sin((Math.floor(bpos) % 2 ? 1 : -1) * (1 - Math.pow(1 - bf, 3)) * 1.2 + i * 0.7) * 0.32;
        const yaw = c.sample(tb).yaw;
        this._e.set(-0.18 - 0.1 * ((i + (side > 0 ? 1 : 0)) % 2), yaw, side * (0.28 + swing));
        this._q.setFromEuler(this._e);
        this._m.compose(this._p, this._q, this._s);
        this.beams.setMatrixAt(n, this._m);
        const col = this.cols[(i + (side > 0 ? 1 : 0)) % this.cols.length];
        // only while the lift is on: standing dark until then
        const k = kk * (0.4 * this.k + 0.3 * this.beat) * (this.cfg.beamK ?? 1);
        this.aK.array[n] = k; this.aCol.array.set([col.r, col.g, col.b], n * 3);
        n++;
      }
    }
    this.beams.count = n;
    this.beams.instanceMatrix.needsUpdate = true; this.aK.needsUpdate = true; this.aCol.needsUpdate = true;
  }
}
