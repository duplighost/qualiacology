// Floor telegraphs: every attack draws its shape on the floor before it lands, and the shape fills
// to the exact moment of impact (the beat). One instanced mesh, shapes drawn as distance fields.
// Shapes: 0 circle, 1 ring, 2 rect (a lane / line), 3 cone (a wedge of a circle), 4 arc band.
// Colours say what to do: PINK = can be parried, WHITE = dodge it, GOLD = yours (the player's).
import * as THREE from 'three';
import { FXK } from '../engine/post.js';

export const KIND = { pink: new THREE.Color(3.2, 0.35, 1.25), white: new THREE.Color(1.25, 1.55, 1.9), gold: new THREE.Color(3.0, 1.9, 0.5), red: new THREE.Color(3.0, 0.25, 0.2) };
export const SHAPE = { circle: 0, ring: 1, rect: 2, cone: 3, arc: 4 };
const MAX = 256;

const VS = /* glsl */`
attribute vec4 aShape;   // shape, w, h, param (cone half-angle / ring thickness)
attribute vec4 aState;   // fill 0..1, alpha, flash, seed
attribute vec3 aColor;
varying vec2 vLocal; varying vec4 vShape; varying vec4 vState; varying vec3 vColor;
void main() {
  vShape = aShape; vState = aState; vColor = aColor;
  // the quad's extent: a lane is w across and h long; everything else is a disc of radius w
  int sh = int(aShape.x + 0.5);
  vec2 ext = sh == 2 ? vec2(aShape.y, aShape.z) : vec2(aShape.y, aShape.y);
  ext += 0.08;
  vLocal = position.xy * ext;
  vec4 wp = instanceMatrix * vec4(position.x * ext.x, 0.0, position.y * ext.y, 1.0);
  gl_Position = projectionMatrix * (viewMatrix * (modelMatrix * wp));
}`;

const FS = /* glsl */`
uniform float uTime; uniform float uFxK;
varying vec2 vLocal; varying vec4 vShape; varying vec4 vState; varying vec3 vColor;
float aaStep(float e, float x) { float w = fwidth(x) * 0.75; return smoothstep(e - w, e + w, x); }
void main() {
  int shape = int(vShape.x + 0.5);
  vec2 p = vLocal;                     // metres, shape-local; +y is the shape's forward
  float w = vShape.y, h = vShape.z, prm = vShape.w;
  float fill = vState.x, alpha = vState.y, flash = vState.z;
  float inside = 0.0, edge = 0.0, prog = 0.0;
  if (shape == 0) {          // circle of radius w
    float d = length(p) / w;
    inside = 1.0 - aaStep(1.0, d);
    edge = inside * aaStep(1.0 - 0.06 / w * 4.0, d);
    prog = 1.0 - aaStep(fill, d);
  } else if (shape == 1) {   // ring: outer radius w, thickness prm; the inside fills inward->outward
    float d = length(p);
    float inner = w - prm;
    inside = (1.0 - aaStep(w, d)) * aaStep(inner, d);
    edge = inside * (aaStep(w - 0.06, d) + 1.0 - aaStep(inner + 0.06, d));
    prog = inside * (1.0 - aaStep(inner + prm * fill, d));
  } else if (shape == 2) {   // rect: half width w, length h, starting at the origin going +y
    float fx = abs(p.x) / w, fy = p.y / h;
    inside = (1.0 - aaStep(1.0, fx)) * aaStep(0.0, fy) * (1.0 - aaStep(1.0, fy));
    edge = inside * max(aaStep(1.0 - 0.05 / w * 2.0, fx), 0.0);
    prog = inside * (1.0 - aaStep(fill, fy));
  } else if (shape == 3) {   // cone: radius w, half-angle prm, centred on +y
    float d = length(p) / w;
    float ang = abs(atan(p.x, p.y));
    inside = (1.0 - aaStep(1.0, d)) * (1.0 - aaStep(prm, ang));
    edge = inside * max(aaStep(1.0 - 0.05 / w * 3.0, d), aaStep(prm - 0.04 / max(0.5, d * w), ang));
    prog = inside * (1.0 - aaStep(fill, d));
  } else {                   // arc band: radius w, thickness h, half-angle prm
    float d = length(p);
    float ang = abs(atan(p.x, p.y));
    inside = (1.0 - aaStep(w, d)) * aaStep(w - h, d) * (1.0 - aaStep(prm, ang));
    edge = inside * max(aaStep(w - 0.06, d) + 1.0 - aaStep(w - h + 0.06, d), aaStep(prm - 0.05 / max(0.5, d), ang));
    prog = inside * (1.0 - aaStep(prm * fill, ang));
  }
  if (inside < 0.002 && edge < 0.002) discard;
  // a faint hatch inside, the filled part brighter, the rim brightest, all pulsing a little as it nears
  float hatch = 0.5 + 0.5 * sin((p.x + p.y) * 9.0);
  float near = smoothstep(0.6, 1.0, fill);
  // big shapes get a quieter fill so they never bloom into a blinding disc; the rim stays crisp
  float area = shape == 2 ? w * h : w * w;
  float quiet = 1.0 / (1.0 + area * 0.08);
  float a = inside * (0.07 + 0.04 * hatch) + prog * (0.14 + 0.26 * near) * (0.45 + 0.55 * quiet) + edge * (0.6 + 0.4 * near);
  a = clamp(a, 0.0, 1.0) * alpha;
  float rim = clamp(edge, 0.0, 1.0);
  vec3 col = vColor * (0.6 + 0.8 * near) + vec3(flash * (0.15 + 1.05 * quiet + 1.2 * rim));
  gl_FragColor = vec4(col * a * uFxK, a);
}`;

export class Telegraphs {
  constructor(scene) {
    const geo = new THREE.PlaneGeometry(2, 2); // -1..1 in x,y; scaled per instance in the shader
    // the rect shape runs 0..1 in y, so shift its quad for that shape in the shader by using -1..1 and h*2
    this.aShape = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
    this.aState = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    for (const a of [this.aShape, this.aState, this.aColor]) a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aShape', this.aShape); geo.setAttribute('aState', this.aState); geo.setAttribute('aColor', this.aColor);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, uniforms: { uTime: { value: 0 }, uFxK: FXK },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, polygonOffset: true, polygonOffsetFactor: -4,
    });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, MAX);
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 2;
    scene.add(this.mesh);
    this.list = [];
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    this.y = 0.02;
  }

  // show a telegraph from `start` to `end` (song seconds): the shape fills to the end and flashes.
  // opts: {shape, x, z, angle (radians, 0 = +z), w, h, param, kind:'pink'|'white'|'gold', follow: fn()->{x,z,angle}, linger}
  add(o) {
    const t = { shape: SHAPE[o.shape] ?? o.shape ?? 0, x: o.x, z: o.z, angle: o.angle || 0, w: o.w || 1, h: o.h || o.w || 1, param: o.param || 0.5,
      kind: o.kind || 'pink', color: (KIND[o.kind || 'pink'] || o.color).clone(), start: o.start, end: o.end, linger: o.linger ?? 0.14, follow: o.follow || null, y: o.y ?? this.y, flash: o.flash ?? 1, dead: false };
    this.list.push(t);
    return t;
  }
  clear() { for (const g of this.list) g.dead = true; this.list.length = 0; this.mesh.count = 0; }

  update(t) {
    let n = 0;
    const A = this.aShape.array, S = this.aState.array, C = this.aColor.array;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const g = this.list[i];
      if (g.dead || t > g.end + g.linger) { this.list.splice(i, 1); continue; }
      if (t < g.start - 0.001 || n >= MAX) continue;
      if (g.follow) { const f = g.follow(); if (f) { g.x = f.x; g.z = f.z; if (f.angle !== undefined) g.angle = f.angle; } }
      const fill = Math.min(1, Math.max(0, (t - g.start) / Math.max(0.001, g.end - g.start)));
      const after = t - g.end;
      const fadeIn = Math.min(1, (t - g.start) / 0.08);
      const alpha = after > 0 ? Math.max(0, 1 - after / g.linger) : fadeIn;
      const flash = after > 0 ? Math.max(0, 1 - after / g.linger) : 0;
      // rect runs from its origin forward: shift its centre half a length forward
      let cx = g.x, cz = g.z;
      this._q.setFromAxisAngle(_Y, g.angle);
      this._p.set(cx, g.y, cz);
      this._m.compose(this._p, this._q, this._s);
      this._m.toArray(this.mesh.instanceMatrix.array, n * 16);
      const hh = g.shape === 2 ? g.h : g.h;
      A[n * 4] = g.shape; A[n * 4 + 1] = g.shape === 2 ? g.w : g.w; A[n * 4 + 2] = hh; A[n * 4 + 3] = g.param;
      S[n * 4] = fill; S[n * 4 + 1] = alpha; S[n * 4 + 2] = flash * g.flash; S[n * 4 + 3] = 0;
      C[n * 3] = g.color.r; C[n * 3 + 1] = g.color.g; C[n * 3 + 2] = g.color.b;
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.aShape.needsUpdate = true; this.aState.needsUpdate = true; this.aColor.needsUpdate = true;
    this.mat.uniforms.uTime.value = t;
  }
}
const _Y = new THREE.Vector3(0, 1, 0);
