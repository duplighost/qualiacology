// The rail: the swift's own flight path, hung in the air as a ribbon of light.
//
// The road is sampled from where the swift actually flew, so it always starts at the hand
// and is smooth by construction; the rider is parameterised along it by arc length and
// there is no collision to fight. The visible range [visStart, visEnd] is what the recall
// eats; the collapse front (uFront) is a bead brighter than the road so you can see it coming.
//
// The ribbon FACES THE CAMERA (the width is built in the vertex shader from the centre line
// and the tangent), so a road seen along its length from a low chase camera is never an
// invisible edge-on sliver. Physics only ever reads the centre line.
import * as THREE from 'three';
import { CFG } from './config.js';

const _t = new THREE.Vector3(), _r = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Vector3();

export const RAIL_COLOR = new THREE.Color(0xffb24a);
export const EMBER_COLOR = new THREE.Color(0xff8a2a);

const RibbonShader = {
  vertex: /* glsl */`
    attribute vec3 aTangent;
    attribute float aS;
    attribute float aSide;
    uniform float uMirror;
    uniform float uWaterY;
    uniform float uWidth;
    varying float vS; varying float vSide; varying float vY;
    void main() {
      vec3 c = position;
      if (uMirror > 0.5) { c.y = 2.0 * uWaterY - c.y; }
      vec3 toCam = cameraPosition - c;
      float dist = length(toCam);
      vec3 r = cross(aTangent, toCam);
      float rl = length(r);
      r = rl > 1e-4 ? r / rl : vec3(1.0, 0.0, 0.0);
      // a floor on the on-screen width: the road at 100 m is still a road, not a hairline
      float w = uWidth * (1.0 + dist * 0.006);
      vec3 p = c + r * (aSide * w * 0.5);
      vS = aS; vSide = aSide; vY = c.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragment: /* glsl */`
    precision highp float;
    uniform vec3 uColor;
    uniform float uVisStart, uVisEnd, uFront, uFrontBoost, uTime, uIntensity, uMirror, uFade, uPulse, uPulseS, uEmber, uRoadDim;
    varying float vS; varying float vSide; varying float vY;
    void main() {
      if (vS < uVisStart || vS > uVisEnd) discard;
      // MSAA can extrapolate a varying past the edge, and pow() of a negative is NaN --
      // and one NaN pixel turns the whole bloom chain black. Clamp.
      float edge = max(0.0, 1.0 - abs(vSide));
      float core = smoothstep(0.0, 0.55, edge);
      float glow = pow(edge, 0.6);
      // the collapse front: a bright bead that runs ahead of the eaten end
      float bead = 0.0;
      if (uFront > -0.5) { float d = abs(vS - uFront); bead = exp(-d * d / 9.0); }
      // the pulse that runs down the road when it becomes ready (perch -> feet) or on latch
      float pulse = 0.0;
      if (uPulse > 0.0) { float d = abs(vS - uPulseS); pulse = uPulse * exp(-d * d / 25.0); }
      // a slow travelling shimmer so a still rail is never a dead line
      float shimmer = 0.85 + 0.15 * sin(vS * 0.9 - uTime * 6.0);
      // The road's core clips after AgX + bloom (measured 225-235/255), so a 1.8x multiply is
      // invisible. While a front runs the doomed road dims to uRoadDim and the bead is drawn at
      // full strength pushed toward white: the 1.8x exists on screen (measured 1.9:1).
      float dim = (uFront > -0.5) ? uRoadDim : 1.0;
      vec3 road = uColor * (0.55 + 1.5 * core) * shimmer * (1.0 + pulse) * uIntensity * dim;
      vec3 hot = mix(uColor, vec3(1.0), 0.45) * (0.55 + 1.5 * core) * uIntensity * uFrontBoost;
      vec3 col = mix(road, hot, bead);
      float a = (0.35 + 0.65 * glow) * uFade;
      if (uMirror > 0.5) { a *= 0.42; col *= 0.7; }
      gl_FragColor = vec4(col, a);
    }
  `,
};

function makeMaterial(color, mirror = 0, width = CFG.rail.width) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color.clone() },
      uVisStart: { value: 0 }, uVisEnd: { value: 1e9 }, uFront: { value: -1 }, uFrontBoost: { value: CFG.recall.frontBoost },
      uTime: { value: 0 }, uIntensity: { value: 1 }, uMirror: { value: mirror }, uWaterY: { value: CFG.world.waterY }, uWidth: { value: width },
      uFade: { value: 1 }, uPulse: { value: 0 }, uPulseS: { value: 0 }, uEmber: { value: 0 }, uRoadDim: { value: CFG.recall.roadDim },
    },
    vertexShader: RibbonShader.vertex, fragmentShader: RibbonShader.fragment,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: true,
  });
}

// A ribbon geometry: two vertices per centre point (aSide -1/+1) that the vertex shader
// spreads to face the camera. Shared by the live rail and the ember field.
function makeRibbonGeometry(maxPoints) {
  const n = maxPoints * 2;
  const pos = new Float32Array(n * 3), tan = new Float32Array(n * 3), aS = new Float32Array(n), aSide = new Float32Array(n);
  for (let i = 0; i < maxPoints; i++) { aSide[i * 2] = -1; aSide[i * 2 + 1] = 1; }
  const idx = new Uint32Array((maxPoints - 1) * 6);
  for (let i = 0; i < maxPoints - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3, o = i * 6;
    idx[o] = a; idx[o + 1] = c; idx[o + 2] = b; idx[o + 3] = b; idx[o + 4] = c; idx[o + 5] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aTangent', new THREE.BufferAttribute(tan, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aS', new THREE.BufferAttribute(aS, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setDrawRange(0, 0);
  return { geo, pos, tan, aS, idx };
}

function writeVertexPair(buf, i, p, t, s) {
  const o = i * 6;
  buf.pos[o] = p.x; buf.pos[o + 1] = p.y; buf.pos[o + 2] = p.z; buf.pos[o + 3] = p.x; buf.pos[o + 4] = p.y; buf.pos[o + 5] = p.z;
  buf.tan[o] = t.x; buf.tan[o + 1] = t.y; buf.tan[o + 2] = t.z; buf.tan[o + 3] = t.x; buf.tan[o + 4] = t.y; buf.tan[o + 5] = t.z;
  buf.aS[i * 2] = s; buf.aS[i * 2 + 1] = s;
}

function markDirty(geo) {
  geo.attributes.position.needsUpdate = true; geo.attributes.aTangent.needsUpdate = true; geo.attributes.aS.needsUpdate = true;
}

export class Rail {
  constructor(scene, { maxPoints = 480, width = CFG.rail.width, color = RAIL_COLOR } = {}) {
    this.scene = scene;
    this.maxPoints = maxPoints;
    this.width = width;
    this.points = [];       // Vector3, sampled along the flight (spacing ~ridePointSpacing)
    this.cum = [];          // cumulative arc length per point
    this.total = 0;
    this.state = 'empty';   // empty | drawing | live | collapsing | gone
    this.visStart = 0; this.visEnd = 0;
    this.maxRidden = 0;     // furthest s the rider reached on this rail
    this.perchOwner = null; // a boss, when the swift is stuck to one
    this.anchorObject = null;

    this.buf = makeRibbonGeometry(maxPoints);
    this.geo = this.buf.geo;
    this.mat = makeMaterial(color, 0, width);
    this.matMirror = makeMaterial(color, 1, width);
    this.mesh = new THREE.Mesh(this.geo, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; this.mesh.name = 'rail';
    this.mirror = new THREE.Mesh(this.geo, this.matMirror); this.mirror.frustumCulled = false; this.mirror.renderOrder = 4; this.mirror.name = 'rail-mirror';
    this.mesh.visible = false; this.mirror.visible = false;
    scene.add(this.mesh); scene.add(this.mirror);
    this.pulse = 0; this.pulseS = 0; this.pulseDir = 1; this.pulseSpeed = 90;
    this.fade = 1;
  }

  get length() { return this.total; }
  get live() { return this.state === 'live' || this.state === 'collapsing' || this.state === 'drawing'; }

  begin(p0) {
    this.points.length = 0; this.cum.length = 0; this.total = 0;
    this.points.push(p0.clone()); this.cum.push(0);
    this.state = 'drawing'; this.visStart = 0; this.visEnd = 0; this.maxRidden = 0;
    this.perchOwner = null; this.anchorObject = null;
    this.mat.uniforms.uFront.value = -1; this.matMirror.uniforms.uFront.value = -1;
    this.fade = 1; this.pulse = 0;
    this.mesh.visible = true; this.mirror.visible = true;
    this._rebuild();
  }

  // Append a flight sample. Returns true if a point was added.
  push(p) {
    if (this.points.length >= this.maxPoints) return false;
    const last = this.points[this.points.length - 1];
    const d = last.distanceTo(p);
    if (d < CFG.rail.ridePointSpacing) return false;
    this.points.push(p.clone());
    this.total += d; this.cum.push(this.total);
    this.visEnd = this.total;
    this._writePoint(this.points.length - 1);
    if (this.points.length >= 2) this._writePoint(this.points.length - 2);
    this.geo.setDrawRange(0, (this.points.length - 1) * 6);
    markDirty(this.geo);
    return true;
  }

  // Replace all points (for living rails: an eel's back that moves every frame).
  setPoints(list) {
    this.points.length = 0; this.cum.length = 0; this.total = 0;
    for (let i = 0; i < list.length && i < this.maxPoints; i++) {
      const p = list[i];
      if (i > 0) this.total += this.points[i - 1].distanceTo(p);
      this.points.push(p.clone ? p.clone() : new THREE.Vector3(p.x, p.y, p.z));
      this.cum.push(this.total);
    }
    this.visStart = 0; this.visEnd = this.total;
    if (this.state === 'empty' || this.state === 'gone') this.state = 'live';
    this.mesh.visible = this.mirror.visible = true;
    this._rebuild();
  }

  finish(perchOwner = null) {
    if (this.points.length < 2) { this.state = 'gone'; this.mesh.visible = this.mirror.visible = false; return; }
    this.state = 'live';
    this.visEnd = this.total;
    this.perchOwner = perchOwner;
    this._rebuild();
    // "road ready": a pulse runs from the perch back to the feet
    this.pulse = 1; this.pulseS = this.total; this.pulseDir = -1;
  }

  startPulse(fromS, dir = 1) { this.pulse = 1; this.pulseS = fromS; this.pulseDir = dir; }

  // Move the far end (a perch on something that moved). Re-measures the last segment.
  moveEnd(p) {
    const n = this.points.length; if (n < 2) return;
    this.points[n - 1].copy(p);
    const d = this.points[n - 2].distanceTo(p);
    this.total = this.cum[n - 2] + d; this.cum[n - 1] = this.total;
    if (this.state === 'live') this.visEnd = this.total;
    else this.visEnd = Math.min(this.visEnd, this.total);
    this._writePoint(n - 1); this._writePoint(n - 2);
    markDirty(this.geo);
  }

  // The recall eats from the far end toward s = 0 (or toward the rider). front = current s.
  setFront(s) {
    this.state = 'collapsing';
    this.visEnd = Math.min(this.visEnd, s);
    this.mat.uniforms.uFront.value = s; this.matMirror.uniforms.uFront.value = s;
  }
  clearFront() { this.mat.uniforms.uFront.value = -1; this.matMirror.uniforms.uFront.value = -1; }

  vanish() {
    this.state = 'gone';
    this.mesh.visible = false; this.mirror.visible = false;
    this.clearFront();
    this.visStart = this.visEnd = 0;
  }

  // ---- queries ------------------------------------------------------------
  _seg(s) {
    const c = this.cum;
    let lo = 0, hi = c.length - 1;
    if (s <= 0) return 0;
    if (s >= this.total) return Math.max(0, c.length - 2);
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
    return lo;
  }

  pointAt(s, out = new THREE.Vector3()) {
    if (this.points.length === 0) return out.set(0, 0, 0);
    if (this.points.length === 1) return out.copy(this.points[0]);
    s = Math.max(0, Math.min(this.total, s));
    const i = this._seg(s);
    const a = this.points[i], b = this.points[Math.min(i + 1, this.points.length - 1)];
    const len = this.cum[i + 1] - this.cum[i] || 1;
    return out.copy(a).lerp(b, (s - this.cum[i]) / len);
  }

  tangentAt(s, out = new THREE.Vector3()) {
    if (this.points.length < 2) return out.set(0, 0, -1);
    s = Math.max(0, Math.min(this.total, s));
    const i = this._seg(s);
    // smoothed: average the two neighbouring segment directions
    const a = this.points[Math.max(0, i - 1)], b = this.points[i], c = this.points[Math.min(this.points.length - 1, i + 1)], d = this.points[Math.min(this.points.length - 1, i + 2)];
    _t.subVectors(c, a); _r.subVectors(d, b);
    out.addVectors(_t, _r);
    if (out.lengthSq() < 1e-6) out.subVectors(c, b);
    if (out.lengthSq() < 1e-6) out.set(0, 0, -1);
    return out.normalize();
  }

  // Nearest point on the visible part of the rail to p. Returns {s, dist}.
  closest(p, sMin = null, sMax = null) {
    const lo = sMin ?? this.visStart, hi = sMax ?? this.visEnd;
    let best = { s: 0, dist: Infinity };
    if (this.points.length < 2) return best;
    for (let i = 0; i < this.points.length - 1; i++) {
      if (this.cum[i + 1] < lo || this.cum[i] > hi) continue;
      const a = this.points[i], b = this.points[i + 1];
      _t.subVectors(b, a); const len2 = _t.lengthSq() || 1;
      _p.subVectors(p, a);
      let u = _p.dot(_t) / len2; u = Math.max(0, Math.min(1, u));
      _q.copy(a).addScaledVector(_t, u);
      const d = _q.distanceTo(p);
      if (d < best.dist) { const s = this.cum[i] + u * (this.cum[i + 1] - this.cum[i]); if (s >= lo && s <= hi) best = { s, dist: d }; }
    }
    return best;
  }

  endPoint(out = new THREE.Vector3()) { return this.points.length ? out.copy(this.points[this.points.length - 1]) : out.set(0, 0, 0); }

  // ---- mesh ---------------------------------------------------------------
  _writePoint(i) {
    const n = this.points.length;
    const p = this.points[i];
    if (n >= 2) {
      const a = this.points[Math.max(0, i - 1)], b = this.points[Math.min(n - 1, i + 1)];
      _t.subVectors(b, a);
      if (_t.lengthSq() < 1e-6) _t.set(0, 0, -1);
      _t.normalize();
    } else _t.set(0, 0, -1);
    writeVertexPair(this.buf, i, p, _t, this.cum[i]);
  }

  _rebuild() {
    for (let i = 0; i < this.points.length; i++) this._writePoint(i);
    this.geo.setDrawRange(0, Math.max(0, (this.points.length - 1) * 6));
    markDirty(this.geo);
    this.geo.computeBoundingSphere();
  }

  update(dt, time) {
    if (this.pulse > 0) {
      this.pulseS += this.pulseDir * this.pulseSpeed * dt;
      this.pulse = Math.max(0, this.pulse - dt * 1.1);
      if (this.pulseS < -10 || this.pulseS > this.total + 10) this.pulse = 0;
    }
    for (const m of [this.mat, this.matMirror]) {
      const u = m.uniforms;
      u.uVisStart.value = this.visStart; u.uVisEnd.value = this.visEnd;
      u.uTime.value = time; u.uPulse.value = this.pulse; u.uPulseS.value = this.pulseS; u.uFade.value = this.fade;
    }
  }

  dispose() { this.scene.remove(this.mesh); this.scene.remove(this.mirror); this.geo.dispose(); this.mat.dispose(); this.matMirror.dispose(); }
}

// Ember-lines: the permanent memory of everywhere you have ridden. One append-only ribbon
// buffer, dim, with a mirror in the water. The ending brightens it (setRecall).
export class EmberField {
  constructor(scene, { maxPoints = 24000, width = 0.42 } = {}) {
    this.scene = scene; this.maxPoints = maxPoints; this.width = width;
    this.count = 0; // points written
    this.buf = makeRibbonGeometry(maxPoints);
    this.geo = this.buf.geo;
    this.mat = makeMaterial(EMBER_COLOR, 0, width); this.mat.uniforms.uIntensity.value = 0.34;
    this.matMirror = makeMaterial(EMBER_COLOR, 1, width); this.matMirror.uniforms.uIntensity.value = 0.3;
    this.mesh = new THREE.Mesh(this.geo, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 3; this.mesh.name = 'embers';
    this.mirror = new THREE.Mesh(this.geo, this.matMirror); this.mirror.frustumCulled = false; this.mirror.renderOrder = 2; this.mirror.name = 'embers-mirror';
    scene.add(this.mesh); scene.add(this.mirror);
    this.segments = []; // {start, end, tag} index ranges, for boss spills
    this.triCount = 0;
    this.metres = 0;
  }

  // Copy the ridden stretch [s0, s1] of a rail into the field.
  appendFromRail(rail, s0, s1, tag = null) {
    if (s1 - s0 < 2) return null;
    const step = 1.0;
    const n = Math.floor((s1 - s0) / step) + 1;
    if (this.count + n + 1 >= this.maxPoints) return null;
    const startIdx = this.count;
    const p = new THREE.Vector3(), t = new THREE.Vector3();
    for (let k = 0; k <= n; k++) {
      const s = Math.min(s1, s0 + k * step);
      rail.pointAt(s, p); rail.tangentAt(s, t);
      const i = this.count;
      writeVertexPair(this.buf, i, p, t, this.metres + (s - s0));
      if (k > 0) {
        const a = (i - 1) * 2, b = a + 1, c = a + 2, d = a + 3, q = this.triCount * 3;
        this.buf.idx[q] = a; this.buf.idx[q + 1] = c; this.buf.idx[q + 2] = b; this.buf.idx[q + 3] = b; this.buf.idx[q + 4] = c; this.buf.idx[q + 5] = d;
        this.triCount += 2;
      }
      this.count++;
    }
    this.metres += (s1 - s0);
    const seg = { start: startIdx, end: this.count, tag };
    this.segments.push(seg);
    this.geo.setDrawRange(0, this.triCount * 3);
    markDirty(this.geo); this.geo.index.needsUpdate = true;
    this.geo.computeBoundingSphere();
    return seg;
  }

  // Remove segments with a tag (a boss's lines break into embers): collapse them to a point.
  removeTag(tag, out = null) {
    for (const seg of this.segments) {
      if (seg.tag !== tag || seg.dead) continue;
      seg.dead = true;
      for (let i = seg.start; i < seg.end; i++) {
        const o = i * 6;
        if (out) out.push(new THREE.Vector3(this.buf.pos[o], this.buf.pos[o + 1], this.buf.pos[o + 2]));
        // a zero tangent collapses the ribbon's width in the vertex shader
        this.buf.tan[o] = this.buf.tan[o + 1] = this.buf.tan[o + 2] = 0; this.buf.tan[o + 3] = this.buf.tan[o + 4] = this.buf.tan[o + 5] = 0;
        this.buf.aS[i * 2] = -1e6; this.buf.aS[i * 2 + 1] = -1e6; // and the fragment discards it
      }
    }
    markDirty(this.geo);
  }

  update(time) {
    for (const m of [this.mat, this.matMirror]) { m.uniforms.uTime.value = time; m.uniforms.uVisEnd.value = 1e9; }
  }

  // The ending: everything lights from the far end back toward the rider. recall in [0..1].
  setRecall(intensity) {
    this.mat.uniforms.uIntensity.value = 0.34 + 1.4 * intensity;
    this.matMirror.uniforms.uIntensity.value = 0.3 + 1.0 * intensity;
  }
}
