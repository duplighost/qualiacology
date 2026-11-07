// Projectiles: everything the boss throws and everything you throw back.
// Combat is on the floor plane (x, z); height is only for looks. Each projectile is a billboard
// drawn as a shape (orb, heart, petal, shard, ring, note, kiss) with a glow, plus a dot on the floor
// under it so you can read where it is from above. PINK = soft and round, catch it. WHITE = sharp,
// dodge it. GOLD = yours. Shape and brightness say it too, not only hue (Alex is slightly colourblind).
import * as THREE from 'three';
import { FXK } from '../engine/post.js';

export const SHAPES = { orb: 0, heart: 1, petal: 2, shard: 3, ring: 4, note: 5, kiss: 6, star: 7, pill: 8, card: 9 };
export const COLORS = {
  pink: new THREE.Color(4.0, 0.55, 1.6), white: new THREE.Color(2.4, 2.8, 3.4), gold: new THREE.Color(3.6, 2.2, 0.55),
  red: new THREE.Color(3.4, 0.3, 0.25), black: new THREE.Color(0.08, 0.05, 0.08),
};
const MAX = 768;

const VS = /* glsl */`
attribute vec4 aPos;    // x, y, z, size
attribute vec4 aLook;   // shape, spin angle, alpha, stretch (velocity-aligned length)
attribute vec3 aCol;
attribute vec2 aDir;    // screen-ish velocity direction for stretch
varying vec2 vUv; varying vec4 vLook; varying vec3 vCol;
void main() {
  vUv = position.xy; vLook = aLook; vCol = aCol;
  vec4 mv = viewMatrix * vec4(aPos.xyz, 1.0);
  float s = aPos.w;
  // rotate the quad by the spin, stretch along the motion a little
  float a = aLook.y; mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
  vec2 p = R * (position.xy * vec2(1.0, 1.0 + aLook.w));
  mv.xy += p * s;
  gl_Position = projectionMatrix * mv;
}`;

const FS = /* glsl */`
uniform float uFxK;
varying vec2 vUv; varying vec4 vLook; varying vec3 vCol;
float sdHeart(vec2 p) { p.y = -p.y + 0.25; p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)), dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y); }
void main() {
  int sh = int(vLook.x + 0.5);
  vec2 p = vUv;           // -1..1
  float d;                 // signed distance-ish, <0 inside
  if (sh == 0) d = length(p) - 0.55;
  else if (sh == 1) d = sdHeart(vec2(p.x, -p.y) * 1.35 + vec2(0.0, 0.35)) * 0.75;
  else if (sh == 2) { vec2 q = p; q.x *= 1.9; d = length(q) - 0.6; }                 // petal: long oval
  else if (sh == 3) { vec2 q = abs(p); d = (q.x * 2.2 + q.y * 0.9) - 0.9; }        // shard: thin diamond
  else if (sh == 4) d = abs(length(p) - 0.5) - 0.13;                                 // ring
  else if (sh == 5) { d = min(length(p - vec2(-0.15, -0.25)) - 0.3, max(abs(p.x - 0.12) - 0.07, abs(p.y - 0.15) - 0.5)); } // note
  else if (sh == 6) { // kiss: two lips, a cupid's bow on top
    vec2 q = p * vec2(0.85, 1.25);
    float up = length((q - vec2(-0.2, 0.08)) * vec2(1.0, 1.6)) - 0.32; up = min(up, length((q - vec2(0.2, 0.08)) * vec2(1.0, 1.6)) - 0.32);
    float lo = length((q - vec2(0.0, -0.12)) * vec2(0.7, 1.4)) - 0.36;
    d = min(up, lo); d = max(d, -(abs(q.y + 0.01) - 0.025)); }
  else if (sh == 7) { float an = atan(p.y, p.x); float r = 0.42 + 0.2 * cos(an * 5.0); d = length(p) - r; }        // star
  else if (sh == 8) { vec2 q = p; q.x = abs(q.x) - 0.25; d = length(vec2(max(q.x, 0.0), q.y)) - 0.32; }               // pill
  else { vec2 q = abs(p) - vec2(0.42, 0.58); d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.06; }               // card
  float aa = fwidth(d) * 1.2;
  float body = 1.0 - smoothstep(-aa, aa, d);
  float rim = (1.0 - smoothstep(-aa, aa, abs(d + 0.06) - 0.05)) * body;
  float glow = exp(-max(d, 0.0) * 5.5) * 0.55;
  float core = 1.0 - smoothstep(-0.45, 0.0, d);
  vec3 col = vCol * (0.55 + 0.6 * core) + vec3(1.0) * rim * 0.8 + vCol * glow * 0.6;
  float edge = smoothstep(1.0, 0.72, max(abs(p.x), abs(p.y)));
  glow *= edge;
  float a = max(body, glow) * vLook.z;
  if (a < 0.01) discard;
  gl_FragColor = vec4(col * a * uFxK, a);
}`;

const DOT_VS = /* glsl */`
attribute vec4 aDot; // x, z, radius, alpha
attribute vec3 aCol;
varying vec2 vUv; varying float vA; varying vec3 vCol;
void main() { vUv = position.xy; vA = aDot.w; vCol = aCol;
  vec3 wp = vec3(aDot.x + position.x * aDot.z, 0.03, aDot.y + position.y * aDot.z);
  gl_Position = projectionMatrix * (viewMatrix * vec4(wp, 1.0)); }`;
const DOT_FS = /* glsl */`
uniform float uFxK;
varying vec2 vUv; varying float vA; varying vec3 vCol;
void main() { float r = length(vUv); float a = (smoothstep(1.0, 0.55, r) * 0.45 + smoothstep(1.0, 0.9, r) * smoothstep(0.8, 0.9, r) * 0.6) * vA;
  if (a < 0.01) discard; gl_FragColor = vec4(vCol * 0.35 * a * uFxK, a * 0.8); }`;

export class Projectiles {
  constructor(scene) {
    this.list = [];
    const geo = new THREE.PlaneGeometry(2, 2);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
    this.aLook = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.aDir = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 2), 2);
    for (const a of [this.aPos, this.aLook, this.aCol, this.aDir]) a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aPos', this.aPos); geo.setAttribute('aLook', this.aLook); geo.setAttribute('aCol', this.aCol); geo.setAttribute('aDir', this.aDir);
    const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uFxK: FXK }, transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    scene.add(this.mesh);
    const dgeo = new THREE.PlaneGeometry(2, 2);
    this.aDot = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
    this.aDotCol = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.aDot.setUsage(THREE.DynamicDrawUsage); this.aDotCol.setUsage(THREE.DynamicDrawUsage);
    dgeo.setAttribute('aDot', this.aDot); dgeo.setAttribute('aCol', this.aDotCol);
    const dmat = new THREE.ShaderMaterial({ vertexShader: DOT_VS, fragmentShader: DOT_FS, uniforms: { uFxK: FXK }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, polygonOffset: true, polygonOffsetFactor: -2 });
    this.dots = new THREE.InstancedMesh(dgeo, dmat, MAX); this.dots.count = 0; this.dots.frustumCulled = false; this.dots.renderOrder = 3;
    scene.add(this.dots);
    this.onHit = null;   // (p, target) => void, set by the fight
  }

  // p: {x, z, y=1, vx, vz, speed, angle, kind:'pink'|'white'|'gold', shape, size=0.32, radius=0.3, life=6,
  //     damage=1, owner:'boss'|'player', homing: turn rate rad/s, target: fn->{x,z}, accel, curve (rad/s),
  //     wave: {amp, freq}, delay (s before it moves), parryable (default: kind==='pink'), spin, onDeath}
  spawn(o) {
    // (src/game/kinds.js) her shots can be blocked or sent back: a white one is pink unless a track marks it hard
    if ((o.owner || 'boss') === 'boss' && o.kind === 'white' && !o.hard) o = { ...o, kind: 'pink' };
    if (this.list.length >= MAX) return null;
    const speed = o.speed ?? Math.hypot(o.vx || 0, o.vz || 0);
    const angle = o.angle ?? Math.atan2(o.vx || 0, o.vz || 1);
    const p = {
      x: o.x, z: o.z, y: o.y ?? 1.0, speed, angle, kind: o.kind || 'pink', shape: SHAPES[o.shape ?? 'orb'] ?? o.shape,
      size: o.size ?? 0.34, radius: o.radius ?? (o.size ?? 0.34) * 0.85, life: o.life ?? 7, age: 0, damage: o.damage ?? 1,
      owner: o.owner || 'boss', homing: o.homing || 0, target: o.target || null, accel: o.accel || 0, curve: o.curve || 0,
      wave: o.wave || null, delay: o.delay || 0, parryable: o.parryable ?? ((o.kind || 'pink') === 'pink'), spin: o.spin ?? 0,
      rot: o.rot ?? 0, color: (COLORS[o.kind || 'pink'] || COLORS.pink).clone(), dead: false, hitList: null, onDeath: o.onDeath || null,
      grow: o.grow || 0, maxSpeed: o.maxSpeed ?? 60, minSpeed: o.minSpeed ?? 0, fadeIn: o.fadeIn ?? 0.08, tag: o.tag || '', data: o.data || null,
      bounce: o.bounce || 0, pierce: o.pierce || false, ox: 0, oz: 0, fn: o.fn || null,
    };
    if (o.color) p.color.copy(o.color);
    this.list.push(p);
    return p;
  }

  clear(owner) { if (!owner) this.list.length = 0; else this.list = this.list.filter((p) => p.owner !== owner); }

  // turn a boss projectile into the player's, sent back at `toward` (the parry's rebuttal)
  reflect(p, toward, { speed = 1.5, kind = 'gold', damage = 1 } = {}) {
    p.owner = 'player'; p.kind = kind; p.color.copy(COLORS[kind]); p.parryable = false;
    p.angle = Math.atan2(toward.x - p.x, toward.z - p.z);
    p.speed = Math.max(14, p.speed * speed); p.homing = 9; p.target = () => toward; p.damage = damage;
    p.life = 3; p.age = 0; p.delay = 0; p.curve = 0; p.wave = null; p.accel = 0; p.size *= 1.15;
  }

  // dt in game seconds; bounds: {minX, maxX, minZ, maxZ} kills things that leave the arena
  update(dt, bounds, hurtTest) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.age += dt;
      if (p.dead || p.age > p.life) { if (p.onDeath && !p.dead) p.onDeath(p); list.splice(i, 1); continue; }
      p.rot += p.spin * dt;
      if (p.fn) { p.fn(p, dt); if (p.owner === 'deco') continue; }
      if (p.age < p.delay) continue;
      if (p.homing && p.target) {
        const tg = p.target();
        if (tg) {
          const want = Math.atan2(tg.x - p.x, tg.z - p.z);
          let da = want - p.angle; da = Math.atan2(Math.sin(da), Math.cos(da));
          const m = p.homing * dt; p.angle += Math.max(-m, Math.min(m, da));
        }
      }
      if (p.curve) p.angle += p.curve * dt;
      if (p.accel) p.speed = Math.max(p.minSpeed, Math.min(p.maxSpeed, p.speed + p.accel * dt));
      const sx = Math.sin(p.angle), cz = Math.cos(p.angle);
      p.x += sx * p.speed * dt; p.z += cz * p.speed * dt;
      if (p.wave) { const w = Math.sin((p.age - p.delay) * p.wave.freq * Math.PI * 2) * p.wave.amp; const nx = w - p.ox; p.x += cz * nx; p.z -= sx * nx; p.ox = w; }
      if (p.grow) { p.size += p.grow * dt; p.radius = p.size * 0.85; }
      if (bounds && (p.x < bounds.minX - 2 || p.x > bounds.maxX + 2 || p.z < bounds.minZ - 2 || p.z > bounds.maxZ + 2)) {
        if (p.bounce > 0) {
          p.bounce--; if (p.x < bounds.minX || p.x > bounds.maxX) p.angle = -p.angle; else p.angle = Math.PI - p.angle;
          p.x = Math.max(bounds.minX - 1.9, Math.min(bounds.maxX + 1.9, p.x)); p.z = Math.max(bounds.minZ - 1.9, Math.min(bounds.maxZ + 1.9, p.z));
        } else { p.dead = true; continue; }
      }
      if (hurtTest) hurtTest(p);
    }
  }

  // write instance data; t = time (for pulsing)
  draw(t) {
    const P = this.aPos.array, L = this.aLook.array, C = this.aCol.array, D = this.aDot.array, DC = this.aDotCol.array;
    let n = 0;
    for (const p of this.list) {
      if (n >= MAX) break;
      const fade = Math.min(1, p.age / p.fadeIn) * Math.min(1, (p.life - p.age) / 0.15);
      const waiting = p.age < p.delay;
      const pulse = waiting ? 0.85 + 0.15 * Math.sin(t * 30) : 1;
      P[n * 4] = p.x; P[n * 4 + 1] = p.y; P[n * 4 + 2] = p.z; P[n * 4 + 3] = p.size * pulse;
      // spin: shards and petals point along their motion; others use their own spin
      const pointy = p.shape === 3 || p.shape === 2 || p.shape === 8;
      L[n * 4] = p.shape; L[n * 4 + 1] = pointy ? Math.PI - p.angle + this.viewYaw : p.rot; L[n * 4 + 2] = fade; L[n * 4 + 3] = pointy ? 0.2 : 0;
      C[n * 3] = p.color.r; C[n * 3 + 1] = p.color.g; C[n * 3 + 2] = p.color.b;
      D[n * 4] = p.x; D[n * 4 + 1] = p.z; D[n * 4 + 2] = p.radius * 1.15; D[n * 4 + 3] = fade;
      DC[n * 3] = p.color.r; DC[n * 3 + 1] = p.color.g; DC[n * 3 + 2] = p.color.b;
      n++;
    }
    this.mesh.count = n; this.dots.count = n;
    this.aPos.needsUpdate = this.aLook.needsUpdate = this.aCol.needsUpdate = true;
    this.aDot.needsUpdate = this.aDotCol.needsUpdate = true;
  }
}
Projectiles.prototype.viewYaw = 0;
