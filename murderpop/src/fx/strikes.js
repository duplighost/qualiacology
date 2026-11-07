// What a hit looks like: the slash arc each strike leaves in the air, the star at the point of contact, rings that
// run out across the floor, the guard YOU holds up (a curved gold shield, brighter when something lands on it),
// her tell before she answers, and the solo's beat pips round the spotlight. All additive, all scaled by FXK
// (a dark room's raised exposure doesn't blow them out). Pooled: nothing is made mid-song after the first use.
import * as THREE from 'three';
import { FXK } from '../engine/post.js';

const QUAD = new THREE.PlaneGeometry(2, 2);
const VS = 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * (viewMatrix * (modelMatrix * vec4(position, 1.0))); }';
// a camera-facing quad (its centre from the model matrix, its size from the scale)
const VS_BILL = `varying vec2 vP; void main(){ vP = position.xy; vec4 c = viewMatrix * vec4(modelMatrix[3].xyz, 1.0); float s = length(modelMatrix[0].xyz); c.xy += position.xy * s; gl_Position = projectionMatrix * c; }`;

// the arc a cut leaves: a crescent, thick in the middle, its head running along it; dir sweeps it left or right
const SLASH_FS = /* glsl */`
uniform vec3 uC; uniform float uProg, uA, uHalf, uDir, uFxK, uIn;
varying vec2 vP;
void main() {
  float r = length(vP);
  float a = atan(vP.x, vP.y) * uDir;
  float u = (a + uHalf) / (2.0 * uHalf);                   // 0..1 along the arc, in the cut's direction
  if (u < 0.0 || u > 1.0 || r > 1.0) discard;
  float thick = (1.0 - uIn) * (0.25 + 0.75 * sin(3.14159 * clamp(u, 0.0, 1.0)));
  float inner = 1.0 - thick;
  float band = smoothstep(inner - 0.02, inner + 0.04, r) * (1.0 - smoothstep(0.96, 1.0, r));
  float head = uProg;
  float lit = smoothstep(head - 0.75, head, u) * (1.0 - smoothstep(head, head + 0.04, u));
  float edge = smoothstep(0.9, 0.985, r) * (1.0 - smoothstep(0.985, 1.0, r));
  float a2 = band * lit * (0.55 + 0.45 * smoothstep(inner, 1.0, r)) + edge * lit * 0.8;
  a2 *= uA;
  if (a2 < 0.004) discard;
  vec3 col = mix(uC, vec3(3.2, 3.0, 2.8), edge * 0.6 + smoothstep(head - 0.15, head, u) * 0.35);
  gl_FragColor = vec4(col * a2 * uFxK, a2);
}`;

// the star at the point of contact: spikes and a hot core
const STAR_FS = /* glsl */`
uniform vec3 uC; uniform float uA, uRot, uFxK;
varying vec2 vP;
void main() {
  float r = length(vP); if (r > 1.0) discard;
  float an = atan(vP.y, vP.x) + uRot;
  float spikes = pow(abs(cos(an * 2.0)), 60.0) * (1.0 - r) * 1.4 + pow(abs(cos(an * 2.0 + 0.785)), 90.0) * (1.0 - r) * 0.6;
  float core = exp(-r * r * 26.0);
  float halo = exp(-r * 4.5) * 0.25;
  float a = (spikes + core + halo) * uA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(mix(uC, vec3(3.0), core * 0.6) * a * uFxK, min(1.0, a));
}`;

// a ring running out across the floor
const RING_FS = /* glsl */`
uniform vec3 uC; uniform float uR, uW, uA, uFxK;
varying vec2 vP;
void main() {
  float d = length(vP);
  float w = max(uW, fwidth(d) * 1.5);
  float a = exp(-pow((d - uR) / w, 2.0)) * uA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uC * a * uFxK, a);
}`;

// the guard: a curved band of light in front of her; x along the curve, y up it
const SHIELD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * (viewMatrix * (modelMatrix * vec4(position, 1.0))); }';
const SHIELD_FS = /* glsl */`
uniform vec3 uC; uniform float uA, uHit, uTime, uFxK;
varying vec2 vUv;
void main() {
  float sx = 1.0 - abs(vUv.x - 0.5) * 2.0;            // 1 in the middle, 0 at the sides
  float ex = 1.0 - smoothstep(0.0, 0.12, sx);
  float ey = 1.0 - smoothstep(0.0, 0.07, min(vUv.y, 1.0 - vUv.y));
  float lines = 0.5 + 0.5 * sin(vUv.y * 60.0 - uTime * 9.0);
  float fill = smoothstep(0.0, 0.3, sx) * (0.10 + 0.08 * lines) * smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
  float rim = max(ex, ey) * 0.65;
  float a = (fill + rim) * uA + (fill * 4.0 + rim * 1.2 + 0.25 * sx) * uHit;
  if (a < 0.004) discard;
  gl_FragColor = vec4(mix(uC, vec3(3.2, 3.0, 2.6), uHit * 0.5) * a * uFxK, min(1.0, a));
}`;

// the solo's pips: one per beat left, on the floor round YOU; the next to go breathes with the beat
const PIPS_FS = /* glsl */`
uniform vec3 uC; uniform float uN, uLeft, uPulse, uA, uFxK;
varying vec2 vP;
void main() {
  float r = length(vP);
  float an = atan(vP.x, vP.y);                          // 0 toward +z (the bottom of the screen)
  float stp = 6.28318 / uN;
  float k = floor((an + 3.14159 + stp * 0.5) / stp);
  float c = k * stp - 3.14159;
  vec2 q = vec2((an - c) * 0.9, r - 0.9) * 9.0;        // pip-local, roughly metres*9
  float diamond = 1.0 - smoothstep(0.75, 1.0, abs(q.x) + abs(q.y) * 1.4);
  // pips are counted round from the front: the one at the front goes last
  float idx = mod(k + uN * 0.5, uN);
  float on = step(idx + 0.5, uLeft);
  float next = step(abs(idx - (uLeft - 1.0)), 0.5);
  float a = diamond * (0.18 + 0.82 * on) * (1.0 + next * uPulse * 0.8) * uA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uC * a * uFxK, min(1.0, a));
}`;

const mat = (fs, uniforms, vs = VS, side = THREE.DoubleSide) => new THREE.ShaderMaterial({
  vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side,
  uniforms: { uFxK: FXK, ...uniforms },
});

export const SX_GOLD = new THREE.Color(3.0, 1.85, 0.5), SX_IVORY = new THREE.Color(2.1, 1.85, 1.55), SX_PINK = new THREE.Color(3.4, 0.45, 1.5), SX_WHITE = new THREE.Color(2.4, 2.7, 3.1);

export class StrikeFX {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group(); this.group.name = 'strike-fx'; scene.add(this.group);
    this.slashes = []; this.stars = []; this.rings = [];
    this.live = [];
    // the guard
    const L = 2.3, sg = new THREE.CylinderGeometry(0.78, 0.82, 1.25, 28, 1, true, -L / 2, L); sg.translate(0, 0.98, 0);
    this.shield = new THREE.Mesh(sg, mat(SHIELD_FS, { uC: { value: SX_GOLD.clone() }, uA: { value: 0 }, uHit: { value: 0 }, uTime: { value: 0 } }, SHIELD_VS));
    this.shield.renderOrder = 7; this.shield.visible = false; this.shield.frustumCulled = false; this.group.add(this.shield);
    this.guardK = 0;
    // the solo's pips
    this.pips = new THREE.Mesh(QUAD, mat(PIPS_FS, { uC: { value: SX_GOLD.clone() }, uN: { value: 8 }, uLeft: { value: 0 }, uPulse: { value: 0 }, uA: { value: 0 } }));
    this.pips.rotation.x = -Math.PI / 2; this.pips.scale.setScalar(2.7); this.pips.renderOrder = 3; this.pips.visible = false; this.group.add(this.pips);
    this.pipsK = 0;
    // the finale's rings round her, and the line at her outline they close to
    this.targets = [];
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(QUAD, mat(RING_FS, { uC: { value: SX_GOLD.clone() }, uR: { value: 0.5 }, uW: { value: 0.05 }, uA: { value: 0 } })); m.rotation.x = -Math.PI / 2; m.renderOrder = 3; m.frustumCulled = false; m.visible = false; this.group.add(m); this.targets.push(m); }
    this.targetLine = new THREE.Mesh(QUAD, mat(RING_FS, { uC: { value: new THREE.Color(2.6, 2.4, 2.1) }, uR: { value: 0.8 }, uW: { value: 0.02 }, uA: { value: 0 } }));
    this.targetLine.rotation.x = -Math.PI / 2; this.targetLine.renderOrder = 3; this.targetLine.frustumCulled = false; this.targetLine.visible = false; this.group.add(this.targetLine);
    // made now, hidden, so their shaders compile with the rest at load
    for (let i = 0; i < 6; i++) this._mkSlash();
    for (let i = 0; i < 8; i++) this._mkStar();
    for (let i = 0; i < 10; i++) this._mkRing();
  }

  _take(pool, make) { const m = pool.find((x) => !x.userData.busy) || (pool.length < 24 ? make() : pool[0]); m.userData.busy = true; m.visible = true; return m; }
  _mkSlash() { const s = new THREE.Mesh(QUAD, mat(SLASH_FS, { uC: { value: new THREE.Color() }, uProg: { value: 0 }, uA: { value: 0 }, uHalf: { value: 1.2 }, uDir: { value: 1 }, uIn: { value: 0.35 } })); s.renderOrder = 8; s.frustumCulled = false; s.visible = false; this.group.add(s); this.slashes.push(s); return s; }
  _mkStar() { const s = new THREE.Mesh(QUAD, mat(STAR_FS, { uC: { value: new THREE.Color() }, uA: { value: 0 }, uRot: { value: 0 } }, VS_BILL)); s.renderOrder = 9; s.frustumCulled = false; s.visible = false; this.group.add(s); this.stars.push(s); return s; }
  _mkRing() { const s = new THREE.Mesh(QUAD, mat(RING_FS, { uC: { value: new THREE.Color() }, uR: { value: 0 }, uW: { value: 0.06 }, uA: { value: 0 } })); s.rotation.x = -Math.PI / 2; s.renderOrder = 3; s.frustumCulled = false; s.visible = false; this.group.add(s); this.rings.push(s); return s; }

  // ---------- the cut ----------
  // x, z: YOU; ang: the cut's direction; o: { sweep: 1 | -1 | 0 (overhead), color, r, gold, big }
  slash(x, z, ang, o = {}) {
    const m = this._take(this.slashes, () => this._mkSlash());
    const U = m.material.uniforms, big = !!o.big;
    U.uC.value.copy(o.color || (o.gold ? SX_GOLD : SX_IVORY));
    U.uDir.value = o.sweep === -1 ? -1 : 1;
    U.uHalf.value = big ? 1.65 : o.sweep === 0 ? 1.0 : 1.25;
    U.uIn.value = big ? 0.25 : 0.42;
    const r = o.r ?? (big ? 2.1 : o.sweep === 0 ? 1.5 : 1.65);
    m.scale.set(r, r, r);
    if (o.sweep === 0 && !big) {
      // overhead: the arc stands up in the cut's own plane, centred forward-and-up, from behind her head down in front
      // (the quad's +x points along the cut, its +y tilted 0.6 rad from straight up toward the front)
      m.position.set(x, 1.1, z);
      m.rotation.set(0, ang - Math.PI / 2, -0.6, 'YXZ');
    } else {
      // flat, at the height of the blade: the quad's +y (the arc's middle) along the cut
      m.position.set(x, big ? 1.0 : 1.15, z);
      m.rotation.set(-Math.PI / 2, ang + Math.PI, 0, 'YXZ');
    }
    this.live.push({ m, kind: 'slash', t: 0, dur: big ? 0.2 : 0.14, U });
  }

  // ---------- the point of contact ----------
  impact(x, y, z, o = {}) {
    const p = o.power ?? 1;
    const m = this._take(this.stars, () => this._mkStar());
    m.material.uniforms.uC.value.copy(o.color || (o.gold ? SX_GOLD : SX_IVORY));
    m.material.uniforms.uRot.value = Math.random() * 3.14;
    m.position.set(x, y, z);
    this.live.push({ m, kind: 'star', t: 0, dur: 0.1 + 0.05 * p, size: 0.5 + 0.55 * p, U: m.material.uniforms });
    if (p >= 1) this.ring(x, z, o.gold ? SX_GOLD : SX_IVORY, 0.9 + 0.8 * p, 0.22 + 0.06 * p);
  }

  // ---------- a ring running out across the floor ----------
  ring(x, z, color, r = 2, dur = 0.32, w = 0.06) {
    const m = this._take(this.rings, () => this._mkRing());
    m.material.uniforms.uC.value.copy(color);
    m.position.set(x, 0.05, z); m.scale.setScalar(r * 1.15);
    this.live.push({ m, kind: 'ring', t: 0, dur, r, w, U: m.material.uniforms });
  }

  // ---------- her tell ----------
  tell(x, y, z) {
    this.impact(x, y, z, { color: SX_PINK, power: 0.9 });
    this.ring(x, z, SX_PINK, 1.6, 0.3, 0.05);
  }

  // ---------- the guard ----------
  updateGuard(dt, pl, t) {
    const want = pl && (pl.guarding || pl.catching) && pl.state !== 'dead' ? 1 : 0;
    this.guardK += (want - this.guardK) * Math.min(1, dt * (want ? 22 : 10));
    const hit = pl ? pl.blockK : 0;
    const vis = this.guardK > 0.01 || hit > 0.01;
    this.shield.visible = vis;
    if (!vis || !pl) return;
    this.shield.position.set(pl.x, 0, pl.z); this.shield.rotation.y = pl.facing;
    const s = 1 + hit * 0.12; this.shield.scale.set(s, 1, s);
    const U = this.shield.material.uniforms;
    U.uA.value = this.guardK * (pl.catching ? 1.4 : 1); U.uHit.value = hit; U.uTime.value = t;
  }

  // ---------- the finale ----------
  // list: [{ x, z, r, a, last, hit, rT }] from Finale.drawList(); pulse: the beat
  drawTargets(list, pulse = 0) {
    for (let i = 0; i < this.targets.length; i++) {
      const m = this.targets[i], d = list[i];
      if (!d || d.a <= 0.01) { m.visible = false; continue; }
      m.visible = true;
      const S = (Math.max(d.r, d.rT) + 0.35) * 1.15;
      m.position.set(d.x, 0.055, d.z); m.scale.setScalar(S);
      const U = m.material.uniforms;
      U.uR.value = d.r / S; U.uW.value = (d.last ? 0.13 : 0.075) / S;
      U.uA.value = d.a * (d.hit ? 1.15 : d.last ? 1.1 : 0.8);
      U.uC.value.copy(d.hit ? SX_GOLD : d.last ? SX_WHITE : SX_GOLD);
    }
    const on = list.length > 0;
    this.targetLine.visible = on;
    if (on) {
      const d = list[0], S = d.rT * 1.4;
      this.targetLine.position.set(d.x, 0.05, d.z); this.targetLine.scale.setScalar(S);
      const U = this.targetLine.material.uniforms; U.uR.value = d.rT / S; U.uW.value = 0.022 / S; U.uA.value = 0.35 + 0.5 * pulse;
    }
  }

  // ---------- the solo ----------
  soloBeats(left, n, pulse, pl, dt = 1 / 60) {
    this.pipsK += ((left > 0 ? 1 : 0) - this.pipsK) * Math.min(1, dt * 8);
    this.pips.visible = this.pipsK > 0.01 && !!pl;
    if (!this.pips.visible) return;
    const U = this.pips.material.uniforms;
    U.uN.value = n; U.uLeft.value = Math.ceil(left); U.uPulse.value = pulse; U.uA.value = this.pipsK;
    this.pips.position.set(pl.x, 0.045, pl.z);
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const e = this.live[i];
      e.t += dt;
      const k = Math.min(1, e.t / e.dur);
      if (e.kind === 'slash') { e.U.uProg.value = Math.min(1.08, k * 1.6); e.U.uA.value = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45; }
      else if (e.kind === 'star') { const s = e.size * (0.35 + 0.65 * Math.sqrt(k)); e.m.scale.setScalar(s); e.U.uA.value = (1 - k) * (1 - k); }
      else if (e.kind === 'ring') { e.U.uR.value = (0.15 + 0.85 * (1 - (1 - k) * (1 - k))) / 1.15; e.U.uW.value = e.w / (e.r * 1.15); e.U.uA.value = (1 - k) * 0.9; }
      if (k >= 1) { e.m.visible = false; e.m.userData.busy = false; this.live.splice(i, 1); }
    }
  }

  clear() { for (const e of this.live) { e.m.visible = false; e.m.userData.busy = false; } this.live.length = 0; this.guardK = 0; this.shield.visible = false; this.pipsK = 0; this.pips.visible = false; for (const m of this.targets) m.visible = false; this.targetLine.visible = false; }
}
