// THE DOCTOR's two new patterns: the BLUFF (a lie) and the INVERSE (reverse psychology), and the FEINT (a body lie).
//  bluff: a telegraph identical to a real one that resolves nothing. On its end (always a beat with no drum) it cracks
//         like old glaze, drains and is gone in a quarter second, with her dry "tsk". Seen through (YOU stood in or
//         near it and didn't dash or press catch in its last beat): she's CAUGHT OUT.
//  inverse: the world flips negative, a white fill sweeps the whole floor toward the camera, and only the holes stay
//         true. At the end everything outside every hole is hit.
//  feint: a full thrust with its swish, no telegraph, no hitbox. Seen through if YOU doesn't flinch.
import * as THREE from 'three';
import { inShape } from '../../game/choreo.js';
import { LAYER } from '../../game/arena.js';
import { KIND } from '../../fx/telegraphs.js';
import { FEEL } from '../../game/player.js';
import { NEG, setHoles } from './neg.js';

const SHAPE_ID = { circle: 0, ring: 1, rect: 2, cone: 3, arc: 4 };

// ------------------------------------------------------------------------------------------ the crack
const CRACK_VS = /* glsl */`
uniform vec4 uShape;
varying vec2 vLocal;
void main() {
  int sh = int(uShape.x + 0.5);
  vec2 ext = sh == 2 ? vec2(uShape.y, uShape.z) : vec2(uShape.y, uShape.y);
  ext += 0.1;
  vLocal = position.xy * ext;
  vec4 wp = modelMatrix * vec4(position.x * ext.x, 0.0, position.y * ext.y, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const CRACK_FS = /* glsl */`
uniform vec4 uShape; uniform vec3 uCol; uniform float uAge;
varying vec2 vLocal;
float aaStep(float e, float x) { float w = fwidth(x) * 0.75; return smoothstep(e - w, e + w, x); }
vec2 h2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float vEdge(vec2 x) {
  vec2 n = floor(x), f = fract(x), mg = vec2(0.0), mr = vec2(0.0); float md = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)); vec2 r = g + h2(n + g) - f; float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; } }
  md = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) { vec2 g = mg + vec2(float(i), float(j)); vec2 r = g + h2(n + g) - f; vec2 dr = r - mr; if (dot(dr, dr) > 1e-5) md = min(md, dot(0.5 * (mr + r), normalize(dr))); }
  return md;
}
void main() {
  int shape = int(uShape.x + 0.5);
  vec2 p = vLocal; float w = uShape.y, h = uShape.z, prm = uShape.w;
  float inside = 0.0, edge = 0.0; vec2 c = vec2(0.0); float R = w;
  if (shape == 0) { float d = length(p) / w; inside = 1.0 - aaStep(1.0, d); edge = inside * aaStep(1.0 - 0.24 / w, d); }
  else if (shape == 1) { float d = length(p); inside = (1.0 - aaStep(w, d)) * aaStep(w - prm, d); edge = inside * (aaStep(w - 0.06, d) + 1.0 - aaStep(w - prm + 0.06, d)); c = vec2(0.0, w - prm * 0.5); }
  else if (shape == 2) { float fx = abs(p.x) / w, fy = p.y / h; inside = (1.0 - aaStep(1.0, fx)) * aaStep(0.0, fy) * (1.0 - aaStep(1.0, fy)); edge = inside * aaStep(1.0 - 0.1 / w, fx); c = vec2(0.0, h * 0.5); R = h * 0.5; }
  else if (shape == 3) { float d = length(p) / w; float ang = abs(atan(p.x, p.y)); inside = (1.0 - aaStep(1.0, d)) * (1.0 - aaStep(prm, ang)); edge = inside * aaStep(1.0 - 0.15 / w, d); c = vec2(0.0, w * 0.45); }
  else { float d = length(p); float ang = abs(atan(p.x, p.y)); inside = (1.0 - aaStep(w, d)) * aaStep(w - h, d) * (1.0 - aaStep(prm, ang)); edge = inside * 0.5; c = vec2(0.0, w - h * 0.5); }
  if (inside < 0.002) discard;
  float a = uAge;
  // the lines race out from the middle in 0.15 s; the colour drains; gone by 0.25
  vec2 q = p - c; float r = length(q);
  float front = clamp(a / 0.15, 0.0, 1.0) * (R + 0.6);
  float reveal = 1.0 - smoothstep(front - 0.25, front, r);
  vec2 cell = q * 2.1 + vec2(sin(q.y * 1.7) * 0.35, sin(q.x * 1.3) * 0.35);
  float e = vEdge(cell) / 2.1;
  float px = fwidth(e) + 1e-4;
  float line = 1.0 - smoothstep(0.012, 0.012 + px * 1.5, e);
  float ray = 1.0 - smoothstep(0.018, 0.018 + fwidth(q.x) * 1.5, abs(sin(atan(q.x, q.y) * 4.5 + r * 0.6) * r * 0.32));
  line = max(line, ray * smoothstep(0.2, 0.6, r)) * reveal;
  float drain = smoothstep(0.0, 0.16, a);
  float fade = 1.0 - smoothstep(0.1, 0.25, a);
  float l = dot(uCol, vec3(0.2126, 0.7152, 0.0722));
  vec3 base = mix(uCol * 1.3, vec3(l * 0.5), drain);
  float al = inside * (0.3 * (1.0 - drain * 0.7) + edge * 0.5 * (1.0 - drain)) + line * 0.95;
  vec3 col = base * (1.0 - line) + vec3(2.2, 2.1, 2.0) * line * (1.0 - drain * 0.6);
  al = clamp(al, 0.0, 1.0) * fade;
  gl_FragColor = vec4(col * al, al);
}`;

// ------------------------------------------------------------------------------------------ the inverse field
const FIELD_VS = /* glsl */`
varying vec2 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FIELD_FS = /* glsl */`
uniform float uFill, uFlash, uAlpha, uInk, uTime, uZ0, uZ1;
uniform vec4 uHole[5]; uniform int uHoleN; uniform vec3 uCol;
varying vec2 vW;
void main() {
  float front = mix(uZ0, uZ1, uFill);
  // the Rorschach's front is ink: lobes mirrored on x = 0
  float ax = abs(vW.x);
  float wob = uInk * (0.35 * sin(ax * 1.6 + 0.6) + 0.18 * sin(ax * 4.1 + 1.9) + 0.1 * sin(ax * 9.3)) ;
  float fz = front + wob;
  float covered = 1.0 - smoothstep(fz - 0.03, fz + 0.03, vW.y);
  float hd = 1e3;
  for (int i = 0; i < 5; i++) { if (i >= uHoleN) break; vec4 h = uHole[i]; float d = h.w < 0.5 ? length(vW - h.xy) - h.z : abs(vW.x - h.x) - h.z; hd = min(hd, d); }
  float px = fwidth(hd) + 1e-4;
  float inHole = 1.0 - smoothstep(-px, px, hd);
  float rim = (1.0 - smoothstep(0.0, 0.05 + px, abs(hd))) ;
  float near = smoothstep(0.55, 1.0, uFill);
  float hatch = 0.5 + 0.5 * sin((vW.x + vW.y) * 9.0);
  float a = covered * (1.0 - inHole) * (0.15 + 0.05 * hatch + 0.2 * near);
  float ahead = (1.0 - covered) * (1.0 - inHole) * 0.035;
  float edge = (1.0 - smoothstep(0.0, 0.07, abs(vW.y - fz))) * (1.0 - inHole) * step(uFill, 0.999);
  vec3 col = uCol * (0.7 + 0.8 * near) + vec3(uFlash * 3.0);
  vec4 o = vec4(col * (a + ahead), a + ahead);
  // ink at the front (Rorschach): a black glossy band leading the white
  float inkBand = uInk * (1.0 - smoothstep(0.0, 0.45, fz - vW.y + 0.05)) * covered * (1.0 - inHole);
  vec3 inkCol = vec3(0.01, 0.008, 0.015) + vec3(0.9) * (1.0 - smoothstep(0.0, 0.05, abs(fz - vW.y - 0.12)));
  o = mix(o, vec4(inkCol * 0.92, 0.92), inkBand);
  o += vec4(col, 1.0) * edge * 0.75 * (1.0 - uInk * 0.6);
  o += vec4(vec3(2.6, 2.7, 2.9), 1.0) * rim * (0.75 + 0.25 * near);
  o *= uAlpha;
  o.a = clamp(o.a, 0.0, 1.0);
  if (o.a < 0.004) discard;
  gl_FragColor = o;
}`;

const _v = new THREE.Vector3();

export class Lies {
  // hooks: { tsk(x, z), flip(), drone(start, end), fft(), smirk(), caught(), noWag() }
  constructor(f, hooks = {}) {
    this.f = f; this.h = hooks;
    this.group = new THREE.Group(); this.group.name = 'rpd-lies';
    f.scene.add(this.group);
    // crack meshes (a small pool)
    this.geo = new THREE.PlaneGeometry(2, 2);
    this.cracks = [];
    // the inverse field
    this.fieldU = {
      uFill: { value: 0 }, uFlash: { value: 0 }, uAlpha: { value: 0 }, uInk: { value: 0 }, uTime: { value: 0 },
      uZ0: { value: f.bounds.minZ - 0.6 }, uZ1: { value: f.bounds.maxZ + 0.6 },
      uHole: { value: Array.from({ length: 5 }, () => new THREE.Vector4(0, 0, -1, 0)) }, uHoleN: { value: 0 }, uCol: { value: KIND.white.clone() },
    };
    const b = f.bounds;
    const fg = new THREE.PlaneGeometry(b.maxX - b.minX + 1.2, b.maxZ - b.minZ + 1.2);
    fg.rotateX(-Math.PI / 2);
    this.field = new THREE.Mesh(fg, new THREE.ShaderMaterial({ vertexShader: FIELD_VS, fragmentShader: FIELD_FS, uniforms: this.fieldU, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, polygonOffset: true, polygonOffsetFactor: -3 }));
    this.field.position.set((b.minX + b.maxX) / 2, 0.018, (b.minZ + b.maxZ) / 2);
    this.field.renderOrder = 1; this.field.visible = false; this.field.frustumCulled = false;
    this.field.layers.set(LAYER.NO_REFLECT);
    this.group.add(this.field);
    this.inv = null;          // the active inverse { holes, start, end, ink, damage, resolved }
    this.envs = [];           // negative envelopes (static: song times) { on, snap, end, k, pre }
    this.lastDash = -9; this.lastCatch = -9; this._pc = -1; this._pDown = false;
    this.streak = 0; this.lastSeen = -9;
    this.caughtUntil = -1;
  }

  // ---------------------------------------------------------------- the player's flinches (dash or catch)
  watch() {
    const f = this.f, pl = f.player;
    if (pl.state === 'dash' && pl.st <= f.dt + 1e-4) this.lastDash = f.t;
    if (pl.catchT >= 0 && (this._pc < 0 || pl.catchT < this._pc)) this.lastCatch = f.t;
    this._pc = pl.catchT;
    const down = !!(f.input && f.input.isDown && f.input.isDown('parry'));
    if (down && !this._pDown) this.lastCatch = f.t;
    this._pDown = down;
  }
  flinched(t0, t1) { return (this.lastDash >= t0 && this.lastDash <= t1) || (this.lastCatch >= t0 && this.lastCatch <= t1); }

  // ---------------------------------------------------------------- BLUFF
  // o: { shape, x, z, angle, w, h, param, kind ('white'|'pink'), start, end }
  bluff(o) {
    const f = this.f;
    const sh = { shape: o.shape, x: o.x, z: o.z, angle: o.angle || 0, w: o.w, h: o.h ?? o.w, param: o.param ?? 0.5 };
    const tg = f.tele.add({ ...sh, kind: o.kind || 'white', start: o.start ?? f.t, end: o.end, linger: 0 });
    if (tg.dead) return null;                       // the spotlight: she can't even lie
    f.cue(o.kind || 'white', sh);
    const lie = { sh, kind: o.kind || 'white', end: o.end, tg };
    f.at(o.end, () => this._crack(lie));
    return lie;
  }
  _crack(lie) {
    const f = this.f;
    if (f.suppress || (lie.tg && !f.tele.list.includes(lie.tg))) return;   // the spotlight blinded her: even the lie is gone
    this._crackMesh(lie.sh, lie.kind);
    this.h.tsk && this.h.tsk(lie.sh.x, lie.sh.z);
    this.h.smirk && this.h.smirk();
    // seen through: YOU in it or near it, and no flinch in its last beat
    const pl = f.player;
    const near = inShape(lie.sh, pl.x, pl.z, 2.5);
    if (near && !this.flinched(lie.end - f.beat, lie.end + 0.02) && pl.state !== 'dead' && !f.suppress) this.seen(lie.sh);
  }
  _crackMesh(sh, kind) {
    let m = this.cracks.find((c) => !c.visible);
    if (!m) {
      m = new THREE.Mesh(this.geo, new THREE.ShaderMaterial({ vertexShader: CRACK_VS, fragmentShader: CRACK_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { uShape: { value: new THREE.Vector4() }, uCol: { value: new THREE.Color() }, uAge: { value: 0 } },
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, polygonOffset: true, polygonOffsetFactor: -5 }));
      m.renderOrder = 3; m.frustumCulled = false; m.layers.set(LAYER.NO_REFLECT);
      this.group.add(m); this.cracks.push(m);
    }
    const u = m.material.uniforms;
    u.uShape.value.set(SHAPE_ID[sh.shape] ?? 0, sh.w, sh.h ?? sh.w, sh.param ?? 0.5);
    u.uCol.value.copy(KIND[kind] || KIND.white);
    u.uAge.value = 0;
    m.position.set(sh.x, 0.026, sh.z);
    m.rotation.set(0, sh.angle || 0, 0);
    m.userData.t0 = this.f.t;
    m.visible = true;
  }

  // she's seen through: the mask slips
  seen(sh) {
    const f = this.f, pl = f.player, b = f.boss;
    this.streak = (f.t - this.lastSeen < 1.4) ? this.streak + 1 : 0;
    this.lastSeen = f.t;
    f._glimmer && f._glimmer(2, false);
    pl.addMeter(0.12);
    f._good && f._good(80);
    this.caughtUntil = f.t + f.beat;
    this.h.caught && this.h.caught();
    if (Math.hypot(b.x - pl.x, b.z - pl.z) < 7 && b.state === 'perform') b.open(f.beat * 2);
  }

  // ---------------------------------------------------------------- FEINT
  // at song time t (a silent beat) she thrusts at YOU with the swish: no telegraph, no hitbox
  feint(t, { clip = 'Sword_Regular_A', lead = 0.24, dur = 0.43 } = {}) {
    const f = this.f;
    f.at(t - lead, () => { if (f.suppress) return; const b = f.boss; b.faceNow(f.player.x, f.player.z); b.perform(clip, { duration: dur, fade: 0.06 }); this.h.swish && this.h.swish(b.x); });
    f.at(t + 0.26, () => {
      if (f.suppress) return;
      if (!this.flinched(t - 0.25, t + 0.25) && f.player.state !== 'dead') this.seen(null);
    });
  }

  // ---------------------------------------------------------------- INVERSE
  // holes: [{x, z, r, strip}] (or a function returning them at start); damage (hearts); ink: the Rorschach
  inverse({ holes, start, end, damage = 1, ink = false }) {
    const f = this.f;
    if (f.suppress) return null;
    const hs = typeof holes === 'function' ? holes() : holes;
    this.inv = { holes: hs, start, end, damage, ink, resolved: false };
    this.h.drone && this.h.drone(start, end);
    f.at(end, () => this._land());
    return this.inv;
  }
  inHole(x, z, r = 0) {
    const iv = this.inv; if (!iv) return false;
    return iv.holes.some((h) => (h.strip ? Math.abs(x - h.x) <= h.r - r : Math.hypot(x - h.x, z - h.z) <= h.r - r));
  }
  _land() {
    const f = this.f, iv = this.inv;
    if (!iv || iv.resolved) return;
    iv.resolved = true; iv.landT = f.t;
    this.h.fft && this.h.fft();
    if (f.suppress) return;
    const pl = f.player;
    if (!this.inHole(pl.x, pl.z, FEEL.radius * 0.8)) f.resolveArea({ shape: 'rect', x: -100, z: -100, angle: 0, w: 300, h: 300 }, { kind: 'white', damage: iv.damage });
  }

  // ---------------------------------------------------------------- the negative's envelope (pure song time)
  // env: { on, snap (full at), end, k (strength), pre (strength before the snap, for the slow fade-ins) }
  addEnv(e) { this.envs.push({ k: 1, pre: 0, ...e }); }
  negAt(t) {
    let k = 0, flash = 0;
    for (const e of this.envs) {
      if (t < e.on || t > e.end + 0.6) continue;
      let v;
      if (t < e.snap) v = e.pre * THREE.MathUtils.smoothstep(t, e.on, e.snap);
      else if (t <= e.end) v = Math.max(e.pre, THREE.MathUtils.smoothstep(t, e.snap, e.snap + 0.14)) * e.k;
      else { v = e.k * Math.max(0, 1 - (t - e.end) / 0.5); if (e.flash !== false) flash = Math.max(flash, 1 - (t - e.end) / 0.1); }
      k = Math.max(k, v);
    }
    return { k, flash: Math.max(0, flash) };
  }

  // ---------------------------------------------------------------- per frame
  update() {
    const f = this.f, t = f.t;
    this.watch();
    for (const m of this.cracks) {
      if (!m.visible) continue;
      const age = t - m.userData.t0;
      m.material.uniforms.uAge.value = age;
      if (age > 0.27 || age < -0.05) m.visible = false;
    }
    // the inverse field
    const iv = this.inv, u = this.fieldU;
    if (iv) {
      const after = iv.resolved ? t - iv.end : -1;
      if (t < iv.start - 0.05 || after > 0.3) { this.inv = null; this.field.visible = false; setHoles([]); }
      else {
        this.field.visible = !f.suppress;
        u.uFill.value = THREE.MathUtils.clamp((t - iv.start) / Math.max(0.01, iv.end - iv.start), 0, 1);
        u.uFlash.value = after > 0 ? Math.max(0, 1 - after / 0.1) : 0;
        u.uAlpha.value = after > 0 ? Math.max(0, 1 - after / 0.28) : Math.min(1, (t - iv.start) / 0.1);
        u.uInk.value = iv.ink ? 1 : 0;
        u.uTime.value = t;
        const H = u.uHole.value;
        iv.holes.forEach((h, i) => { if (i < 5) H[i].set(h.x, h.z, h.r, h.strip ? 1 : 0); });
        u.uHoleN.value = Math.min(5, iv.holes.length);
        setHoles(iv.holes);
      }
    } else { this.field.visible = false; }
    if (!this.inv) setHoles([]);
    const n = this.negAt(t);
    NEG.uRpdNeg.value = n.k;
    NEG.uRpdFlash.value = n.flash;
  }

  // a rewind (or a start in the middle): nothing of hers in the air
  reset() {
    this.inv = null; this.field.visible = false; setHoles([]);
    for (const m of this.cracks) m.visible = false;
    this.lastDash = this.lastCatch = -9; this.streak = 0; this.caughtUntil = -1;
  }
  dispose() { this.f.scene.remove(this.group); this.geo.dispose(); this.field.geometry.dispose(); this.field.material.dispose(); for (const m of this.cracks) m.material.dispose(); setHoles([]); NEG.uRpdNeg.value = 0; NEG.uRpdFlash.value = 0; }
}
