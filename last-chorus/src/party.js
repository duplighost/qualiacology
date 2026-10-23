// Heart of the Party. A heart hangs over the city where the moon would be and
// beats as hard as you keep the beat. Garlands over the street, confetti in the
// choruses, an ambulance in the second verse, the route 19 bus in the bridge,
// rib arches over the last chorus, and at the end the stage under the heart.

import * as THREE from 'three';
import { extend, glowAt, poolAt, col, local } from './scenery.js';
import { buildAmbulance, buildBus } from './vehicles.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];

// ---------- the heart itself: the classic curve, extruded and rounded ----------
function heartGeometry() {
  const s = new THREE.Shape();
  const N = 96;
  for (let i = 0; i <= N; i++) {
    const t = i / N * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 5, bevelEnabled: true, bevelThickness: 5.5, bevelSize: 3.2, bevelSegments: 8, curveSegments: 48 });
  g.translate(0, 2.5, -2.5);   // centre the outline (y -17..12) and the depth
  g.computeVertexNormals();
  return g;
}

// ---------- the stage at the end ----------
export class HeartStage {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? 0;
    this.group = new THREE.Group(); scene.add(this.group);
    this.body = new THREE.Group(); this.group.add(this.body);
    this.size = cfg.size ?? 2.0;
    this.y = cfg.y ?? 62;
    this.mat = new THREE.MeshPhysicalMaterial({
      color: 0x6a0820, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.1,
      emissive: new THREE.Color(P.heart ?? 0xff2a50), emissiveIntensity: 0.4,
    });
    this.heart = new THREE.Mesh(heartGeometry(), this.mat);
    this.pivot = new THREE.Group(); this.pivot.position.y = this.y; this.pivot.add(this.heart);
    this.body.add(this.pivot);
    // the zipper down the front and back: teeth, and the pull at the top
    const teethG = new THREE.BoxGeometry(1.1, 0.42, 0.5);
    this.zipMat = new THREE.MeshStandardMaterial({ color: 0xffd9a0, metalness: 0.9, roughness: 0.25, emissive: new THREE.Color(0xffc070), emissiveIntensity: 0.3 });
    const nT = 46, teeth = new THREE.InstancedMesh(teethG, this.zipMat, nT * 2);
    const m = new THREE.Matrix4();
    for (let side = 0; side < 2; side++) for (let i = 0; i < nT; i++) {
      const y = 6.8 - i * 0.44, x = (i % 2 ? 0.42 : -0.42);
      const z = side ? -8.15 : 8.15;
      m.makeTranslation(x, y, z);
      teeth.setMatrixAt(side * nT + i, m);
    }
    this.pivot.add(teeth);
    const pull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.2, 0.5), this.zipMat);
    pull.position.set(0.2, 5.4, 8.5); pull.rotation.z = 0.25;
    this.pivot.add(pull);
    this.heart.scale.setScalar(1); this.pivot.scale.setScalar(this.size);

    // the stage: a round floor that lights from the rim in
    this.stageMat = new THREE.MeshStandardMaterial({ color: 0x1a1218, roughness: 0.4, metalness: 0.3, emissive: new THREE.Color(P.glow), emissiveIntensity: 0.05 });
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(46, 48, 2.4, 64), this.stageMat);
    stage.position.y = 1.2; this.body.add(stage);
    this.rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.edge) });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(47.2, 0.35, 6, 96), this.rimMat);
    rim.rotation.x = Math.PI / 2; rim.position.y = 2.45; this.body.add(rim);

    // searchlights from the rim, sweeping
    this.beams = [];
    const bg = new THREE.CylinderGeometry(13, 0.9, 640, 18, 1, true); bg.translate(0, 320, 0);
    const beamCols = [0xff4f8a, 0xffd27a, 0xff2a50, 0xffb3c8];
    for (let k = 0; k < 8; k++) {
      const mm = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(beamCols[k % 4]) }, uK: { value: 0 } },
        vertexShader: `varying float vH; varying vec3 vN; varying vec3 vV; varying float vD; void main(){ vH = position.y / 640.0; vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vD = length(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `uniform vec3 uColor; uniform float uK; varying float vH; varying vec3 vN; varying vec3 vV; varying float vD; void main(){ float e = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float a = (1.0 - vH) * (1.0 - vH) * e * uK * smoothstep(20.0, 140.0, vD); gl_FragColor = vec4(uColor * a * 0.5, 1.0); }`,
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(bg, mm); beam.frustumCulled = false;
      const a = k / 8 * Math.PI * 2 + 0.2;
      beam.position.set(Math.cos(a) * 44, 2.5, Math.sin(a) * 44);
      this.body.add(beam);
      this.beams.push({ beam, m: mm, phase: k * 0.9, a });
    }
    // the crowd is phone lights: a few hundred, swaying
    this.crowd = [];
    let seed = 7;
    const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 700; i++) {
      const a = R() * Math.PI * 2, r = 51 + Math.pow(R(), 1.6) * 60;
      this.crowd.push({ a, r, h: 1.5 + R() * 0.8, ph: R() * 6.28, c: R() < 0.75 ? [0.85, 0.92, 1] : col([0xff4f8a, 0xffd27a, 0xff2a50][Math.floor(R() * 3)]) });
    }
    this.lit = 0; this.earned = 0; this.fired = false; this.beat = 0;
    this.body.visible = false;
    this._p = new THREE.Vector3(); this._v = new THREE.Vector3();
  }

  fire(earned) { this.fired = true; this.earned = earned; }

  update(track, rider, songT, dt, fireworks) {
    const p = track.ground(this.t, this.x, this._p);
    this.group.position.copy(p);
    this.group.rotation.y = this.course.sample(this.t).yaw;
    // only once the far road is laid out this far; before that the heart lives in the sky
    this.near = smooth(this.t - 46, this.t - 34, rider.t);
    this.body.visible = this.near > 0.001;
    if (!this.body.visible) return;
    this.lit += ((this.fired ? 1 : 0.35) - this.lit) * Math.min(1, dt * 1.2);
    const b = this.beat;
    const s = this.size * (1 + 0.06 * b);
    this.pivot.scale.setScalar(s);
    // it turns to face whoever is looking at it, swaying a little
    const cam = this.camPos;
    const face = cam ? Math.atan2(cam.x - p.x, cam.z - p.z) - this.group.rotation.y : 0;
    this.pivot.rotation.y = face + Math.sin(songT * 0.25) * 0.15;
    this.mat.emissiveIntensity = (0.55 + 1.9 * b) * (0.45 + 0.55 * this.lit);
    this.zipMat.emissiveIntensity = 0.2 + 0.9 * b * this.lit;
    this.stageMat.emissiveIntensity = 0.04 + 0.3 * b * this.lit;
    for (const L of this.beams) {
      L.beam.rotation.set(Math.sin(songT * 0.5 + L.phase) * 0.42, 0, Math.cos(songT * 0.37 + L.phase * 1.3) * 0.42 - 0.12 * Math.sign(Math.cos(L.a)));
      L.m.uniforms.uK.value = this.lit * this.near * (0.55 + 0.45 * b);
    }
    const S = this.S; if (!S) return;
    const yaw = this.group.rotation.y, cy = Math.cos(yaw), sy = Math.sin(yaw);
    // heart light on the ground and a halo
    S.pool(p.x, 2.5, p.z, 120, col(this.P.heart ?? this.P.glow), (0.15 + 0.6 * b) * this.lit);
    const hy = this.y;
    S.glow(p.x, hy, p.z, 95 * (1 + 0.06 * b), col(this.P.heart ?? this.P.glow), (0.12 + 0.5 * b) * this.lit * this.near);
    // phone lights
    const crowdK = smooth(0, 1, this.lit) * this.near;
    if (crowdK > 0.01) {
      const bp = this.course.beatAt(songT);
      for (const c of this.crowd) {
        const sway = Math.sin(bp * Math.PI + c.ph) * 0.4;
        const lx = Math.cos(c.a) * c.r, lz = Math.sin(c.a) * c.r;
        const wx = p.x + lx * cy + lz * sy, wz = p.z - lx * sy + lz * cy;
        glowAt(S, wx + sway * cy, c.h + 0.15 * Math.sin(bp * Math.PI * 2 + c.ph), wz - sway * sy, 1.7, c.c, (0.6 + 0.7 * b) * crowdK);
      }
    }
    // fireworks over the field from the moment it lights
    if (this.fired && fireworks && this.earned > 0.05) {
      this.fwNext = (this.fwNext ?? 0) - dt;
      if (this.fwNext <= 0) {
        this.fwNext = 0.3 + Math.random() * 0.35 + (1 - this.earned) * 0.9;
        const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 90;
        const from = this._v.set(p.x + Math.cos(a) * r, 0, p.z + Math.sin(a) * r).clone();
        const to = from.clone(); to.y = 70 + Math.random() * 70;
        fireworks.launch(from, to, 0.9 + 0.7 * this.earned);
      }
    }
  }
}

// ---------- confetti in the air around you in the choruses ----------
export class Confetti {
  constructor(scene, colors, n = 1100) {
    this.n = n; this.on = 0;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.c = new Float32Array(n * 3); this.s = new Float32Array(n);
    const cs = colors.map((h) => new THREE.Color(h));
    for (let i = 0; i < n; i++) { const c = cs[i % cs.length]; this.c.set([c.r, c.g, c.b], i * 3); this.s[i] = Math.random(); this.p[i * 3 + 1] = -9999; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.c, 3));
    g.setAttribute('aS', new THREE.BufferAttribute(this.s, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uA: { value: 0 } },
      vertexShader: /* glsl */`attribute float aS; varying vec3 vC; varying float vF; uniform float uT;
        void main(){ vC = color; vF = abs(sin(uT * (3.0 + aS * 7.0) + aS * 40.0));
          vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(90.0 / -mv.z, 1.0, 9.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`uniform float uA; varying vec3 vC; varying float vF;
        void main(){ vec2 d = abs(gl_PointCoord - 0.5); if (d.x > 0.5 || d.y > 0.12 + 0.38 * vF) discard;
          gl_FragColor = vec4(vC * (0.35 + 1.1 * vF * vF) * uA, 1.0); }`,
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; scene.add(this.points);
    this.geo = g;
  }
  // burst: a cloud right in front of you (the drop)
  burst(cam, fwd, k = 1) {
    const n = Math.floor(this.n * 0.5 * k);
    for (let j = 0; j < n; j++) {
      const i = Math.floor(Math.random() * this.n);
      const d = 6 + Math.random() * 40;
      this.p[i * 3] = cam.position.x + fwd.x * d + (Math.random() - 0.5) * 40;
      this.p[i * 3 + 1] = cam.position.y + 2 + Math.random() * 22;
      this.p[i * 3 + 2] = cam.position.z + fwd.z * d + (Math.random() - 0.5) * 40;
    }
    this.on = Math.max(this.on, 0.9 * k);
  }
  update(cam, dt, t, on) {
    this.on += (on - this.on) * Math.min(1, dt * (on > this.on ? 3 : 0.8));
    this.mat.uniforms.uT.value = t; this.mat.uniforms.uA.value = this.on;
    this.points.visible = this.on > 0.01;
    if (!this.points.visible) return;
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    for (let i = 0; i < this.n; i++) {
      const y = this.p[i * 3 + 1];
      if (y < cy - 14 || y > cy + 40 || Math.abs(this.p[i * 3] - cx) > 48 || Math.abs(this.p[i * 3 + 2] - cz) > 48) {
        if (on < 0.05) { this.p[i * 3 + 1] = -9999; continue; }
        this.p[i * 3] = cx + (Math.random() - 0.5) * 96; this.p[i * 3 + 1] = cy + 4 + Math.random() * 30; this.p[i * 3 + 2] = cz + (Math.random() - 0.5) * 96;
        this.v[i * 3] = (Math.random() - 0.5) * 1.6; this.v[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
      }
      this.p[i * 3] += (this.v[i * 3] + Math.sin(t * 1.9 + i) * 0.7) * dt;
      this.p[i * 3 + 1] -= (1.3 + this.s[i] * 1.3) * dt;
      this.p[i * 3 + 2] += (this.v[i * 3 + 2] + Math.cos(t * 1.6 + i * 1.3) * 0.7) * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

// ---------- vehicles: the ambulance in the second verse, the 19 in the bridge ----------
export class Vehicles {
  // they ride the ribbon itself: anything down on the street is hidden under it
  constructor(scene, course, list) {
    this.course = course;
    this.list = list.map((v) => {
      const obj = v.kind === 'bus' ? buildBus(v.route || '19') : buildAmbulance();
      obj.visible = false; scene.add(obj);
      const lights = obj.userData.lights || [];
      return { ...v, obj, lights };
    });
    this._p = new THREE.Vector3(); this._f = new THREE.Vector3(); this._w = new THREE.Vector3(); this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
  }
  update(track, rider, songT, S) {
    for (const v of this.list) {
      const tau = v.at + v.rate * (songT - v.at);
      const show = songT > v.from && songT < v.to && tau > rider.t - 3 && tau < rider.t + 30;
      v.obj.visible = show;
      v.near = show ? Math.max(0, 1 - Math.abs(tau - rider.t) / 3) : 0;
      if (!show) continue;
      const w = this.course.sample(tau).width;
      const x = Math.sign(v.x) * Math.max(1.6, w - Math.abs(v.lane ?? 2.2));
      const p = track.at(tau, x, 0.02, this._p);
      const f = track.dirAt(tau, this._f);
      this._e.set(-Math.asin(clamp(f.y, -1, 1)), Math.atan2(f.x, f.z), -track.bankAt(tau));
      v.obj.position.copy(p); v.obj.rotation.copy(this._e);
      v.obj.updateMatrixWorld(true);
      if (!S) continue;
      for (const [ox, oy, oz, size, c, k, mode] of v.lights) {
        this._w.set(ox, oy, oz).applyMatrix4(v.obj.matrixWorld);
        glowAt(S, this._w.x, this._w.y, this._w.z, size, c, k, mode);
      }
    }
  }
}

// ---------- rib arches over the last chorus ----------
function ribMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(0xffd0e0) }, uGlow: { value: new THREE.Color(0xff2a55) }, uBeat: { value: 0 }, uFog: { value: new THREE.Color(0x200818) }, uFogDensity: { value: 0.0018 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */`
      attribute vec3 aWake; varying float vW; varying vec3 vWp; varying vec3 vN; varying float vU;
      void main(){ vW = aWake.x; vU = uv.x; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vWp = w.xyz;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCol, uGlow, uFog, uCam; uniform float uBeat, uFogDensity; varying float vW; varying vec3 vWp; varying vec3 vN; varying float vU;
      void main(){
        vec3 V = normalize(uCam - vWp);
        float face = abs(dot(normalize(vN), V));
        float k = 0.1 + 0.9 * vW;
        // bone white at the core, the heart's red at the edges, brighter on the kick
        vec3 c = mix(uGlow * 1.4, uCol * 1.6, pow(face, 1.5)) * k * (0.55 + 1.0 * uBeat * vW);
        // the tips where they meet the street fade into the dark
        c *= smoothstep(0.0, 0.08, vU) * smoothstep(1.0, 0.92, vU);
        float d = length(uCam - vWp); float fog = 1.0 - exp(-pow(d * uFogDensity, 1.6));
        gl_FragColor = vec4(mix(c, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
  });
}
function ribGeometry() {
  // a half ellipse across the street, flat like a rib
  const g = new THREE.TorusGeometry(1, 0.03, 6, 56, Math.PI);
  return g;
}

// ---------- kits and parts ----------
extend({
  layers: {
    ribArch: (M) => [ribGeometry(), (M.rib = ribMaterial()), 90, { aWake: 3 }],
  },
  kits: {
    // garlands of coloured bulbs strung between the lamp posts on both sides
    partystreet(S, z, R) {
      for (const side of [-1, 1]) {
        let prev = null;
        for (let t = z.from; t < z.to; t += 0.3) {
          const it = { t, x: side * 15.5, rot: 0, parts: 'garland', seed: R(), wake0: 0.35 };
          if (prev) prev.next = it;
          S.items.push(it); prev = it;
        }
      }
    },
    // ribs: an arch over the street every other beat
    ribs(S, z, R) {
      const c = S.course;
      for (let b = 0; b < c.beats.length; b++) {
        const t = c.beats[b];
        if (t < z.from || t > z.to || ((b - c.barPhase) % 2 + 2) % 2) continue;
        S.items.push({ t, x: 0, rot: 0, parts: 'rib', seed: R(), wake0: 0.15 });
      }
    },
    // a low city, so the heart shows over the roofs: blocks on the street, towers far back
    lowrise(S, z, R) {
      const greys = [0x9a8aa8, 0xb3a0b8, 0x8f8aa6, 0xa890a4, 0xc0aabc];
      const signs = ['BAR', 'OPEN', 'KISS', 'DANCING', 'LIVETONIGHT', 'ENCORE', 'HOTEL', 'DINER'];
      for (const side of [-1, 1]) {
        for (let t = z.from; t < z.to; t += 0.3 + R() * 0.25) {
          S.items.push({ t, x: side * (24 + R() * 5), rot: (side > 0 ? Math.PI / 2 : -Math.PI / 2) + (R() - 0.5) * 0.05, s: 0.85 + R() * 0.35, sy: 0.35 + R() * 0.55, parts: 'block', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.35 });
          // near the end of the street the back rows open up into the square around the stage
          if (z.clear && t > z.to - z.clear) continue;
          if (R() < 0.45) S.items.push({ t: t + R() * 0.2, x: side * (60 + R() * 60), rot: R() * 0.4, s: 0.8 + R() * 0.5, sy: 0.4 + R() * 0.7, parts: 'block', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.3 });
          if (R() < (z.tall ?? 0.25) * 0.5) S.items.push({ t: t + R() * 0.3, x: side * (110 + R() * 140), rot: R() * 0.4, s: 0.9 + R() * 0.4, sy: 0.6 + R() * 1.6, parts: 'tower', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.3 });
          if (z.signs !== false && R() < 0.2) S.items.push({ t, x: side * 18.5, s: 1, parts: 'sign', idx: S.atlas.index[pick(R, signs)], seed: R(), wake0: 0.4 });
        }
      }
      for (let t = z.from; t < z.to; t += 0.3) for (const side of [-1, 1]) S.items.push({ t, x: side * 15.5, rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, parts: 'lamp', seed: R(), dim: z.dark ? 0.3 : 1 });
    },
    // the hospital, its emergency sign facing the street
    hospital(S, z, R) {
      const side = Math.sign(z.x || -1);
      S.items.push({ t: z.from, x: z.x, rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, s: 1.5, sy: 1.25, parts: 'block', tint: col(0xd8dde4), seed: R(), wake0: 0.85, keepLit: false });
      S.items.push({ t: z.from - 0.35, x: z.x - side * 12, s: 1.35, parts: 'sign', idx: S.atlas.index.ER, seed: R(), wake0: 1, keepLit: true });
    },
  },
  parts: {
    garland(S, it, p, q, yaw) {
      if (!it.next || !S.track || it.t > (S.tNow ?? 0) + 20) return;
      const n = S._n || (S._n = new THREE.Vector3());
      S.track.ground(it.next.t, it.next.x, n);
      const lit = 0.6 + 1.3 * it.wakeNow;
      const P = S.P;
      const cs = [col(P.glow), col(P.edge), col(P.fret), col(P.windowAlt)];
      for (let k = 0; k < 8; k++) {
        const f = (k + 0.5) / 8, sag = Math.sin(f * Math.PI) * 1.3;
        glowAt(S, p.x + (n.x - p.x) * f, 7.0 - sag, p.z + (n.z - p.z) * f, 0.9, cs[(k + Math.floor(it.seed * 4)) % 4], lit, S.beatLamps ? 4 : 0);
      }
    },
    rib(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(22, 40, 22));
      S.layers.ribArch.add(m, { aWake: [it.wakeNow, it.seed, 0] });
    },
  },
});

// per-frame uniforms for the party's own materials
export function partyFrame(S, camera, beat) {
  const ribMat = S.town.mats.rib;
  if (ribMat) {
    ribMat.uniforms.uBeat.value = beat;
    ribMat.uniforms.uCam.value.copy(camera.position);
    ribMat.uniforms.uFog.value.set(S.P.fog); ribMat.uniforms.uFogDensity.value = S.P.fogDensity;
    ribMat.uniforms.uGlow.value.set(S.P.heart ?? S.P.glow); ribMat.uniforms.uCol.value.set(S.P.fret);
  }
}
