// THE SHOT: her rule. Every attack ends in a pose and a flash. She turns her back to you to take a selfie with
// your body in it: a WHITE cone opens from the phone (held 1.5 m beyond her, away from you) through her toward
// you, its axis locked when the pose starts. Be outside it, or behind something solid, when it flashes. Then she
// stands admiring the photo with her back to you, and that is when she breaks (strikes x1.5, see Mourner).
//
// Cover is the set's (pews, the casket, headstones, chairs, hearses...): a 2D footprint blocks the line from the
// phone to you. During the fill the floor shows the safe shadows behind every piece of cover, cut out of the cone.
// Dash through the cone right at the flash and the photo comes out blurred: no damage, a near miss, she fumes.
// Photographed: the hearts, and a Polaroid of you pops out and flutters to the floor at her feet.
import * as THREE from 'three';
import { inShape } from '../../game/choreo.js';
import { LAYER } from '../../game/arena.js';

export const VARIANT = {
  SNAP: { half: 0.36, fill: 2, hold: 2, dmg: 1, lift: 0.1 },
  SHOT: { half: 0.42, fill: 4, hold: 4, dmg: 1, lift: 0.13 },
  GROUP: { half: 0.62, fill: 4, hold: 4, dmg: 1, lift: 0.28 },
  MIRROR: { half: 0.42, fill: 4, hold: 4, dmg: 1, lift: 0.13 },
  BURST: { half: 0.32, fill: 2, hold: 0, dmg: 1, lift: 0.1 },
  TORCH: { half: 0.22, fill: 4, hold: 4, dmg: 1, lift: 0.12 },
  SUNRISE: { half: 1.0, fill: 11, hold: 4, dmg: 2, lift: 0.3 },
};
const R = 18;

// ------------------------------------------------------------------------------------------------ geometry
// 2D: does the segment a->b cross a cover footprint?
function segBox(ax, az, bx, bz, c) {
  // into the box frame
  const ca = Math.cos(c.rot || 0), sa = Math.sin(c.rot || 0);
  const tx = (x, z) => [(x - c.x) * ca + (z - c.z) * sa, -(x - c.x) * sa + (z - c.z) * ca];
  const [x0, z0] = tx(ax, az), [x1, z1] = tx(bx, bz);
  let t0 = 0, t1 = 1; const dx = x1 - x0, dz = z1 - z0;
  for (const [p, d, h] of [[x0, dx, c.hx], [z0, dz, c.hz]]) {
    if (Math.abs(d) < 1e-9) { if (Math.abs(p) > h) return false; continue; }
    let ta = (-h - p) / d, tb = (h - p) / d; if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return false;
  }
  return true;
}
function segCircle(ax, az, bx, bz, c) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / l2));
  const px = ax + dx * t, pz = az + dz * t;
  return (px - c.x) ** 2 + (pz - c.z) ** 2 < c.r * c.r;
}
export function blocked(ax, az, bx, bz, cover) {
  for (const c of cover) if (c.type === 'circle' ? segCircle(ax, az, bx, bz, c) : segBox(ax, az, bx, bz, c)) return c;
  return null;
}
// the corner points of a footprint (for its shadow from a point)
function corners(c) {
  if (c.type === 'circle') { const out = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; out.push([c.x + Math.cos(a) * c.r, c.z + Math.sin(a) * c.r]); } return out; }
  const ca = Math.cos(c.rot || 0), sa = Math.sin(c.rot || 0);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [c.x + u * c.hx * ca - v * c.hz * sa, c.z + u * c.hx * sa + v * c.hz * ca]);
}

// ------------------------------------------------------------------------------------------------ the shadows on the floor
const SH_VS = /* glsl */`
varying vec2 vP;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SH_FS = /* glsl */`
uniform vec2 uApex; uniform float uAng, uHalf, uR, uK;
varying vec2 vP;
void main() {
  vec2 d = vP - uApex; float r = length(d);
  float a = atan(d.x, d.y) - uAng; a = atan(sin(a), cos(a));
  float inside = (1.0 - smoothstep(uHalf - 0.01, uHalf + 0.01, abs(a))) * (1.0 - smoothstep(uR - 0.3, uR, r));
  float a2 = inside * uK;
  if (a2 < 0.004) discard;
  gl_FragColor = vec4(0.02, 0.01, 0.03, a2);
}`;
class ShadowLayer {
  constructor(scene, max = 64) {
    this.max = max;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 6 * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({ vertexShader: SH_VS, fragmentShader: SH_FS, transparent: true, depthWrite: false, depthTest: true,
      uniforms: { uApex: { value: new THREE.Vector2() }, uAng: { value: 0 }, uHalf: { value: 0.4 }, uR: { value: R }, uK: { value: 0 } },
      polygonOffset: true, polygonOffsetFactor: -6 });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 3;
    this.mesh.layers.set(LAYER.NO_REFLECT);
    scene.add(this.mesh);
    this.n = 0;
  }
  // shadows of every footprint from apex (ax, az), inside the cone (ang, half), strength k
  draw(ax, az, ang, half, k, cover) {
    let n = 0; const P = this.pos, y = 0.035;
    for (const c of cover) {
      if (n >= this.max) break;
      const pts = corners(c);
      // the two silhouette points: extreme angles as seen from the apex
      let amin = Infinity, amax = -Infinity, pmin = null, pmax = null;
      const base = Math.atan2(c.x - ax, c.z - az);
      let near = Infinity;
      for (const [x, z] of pts) {
        let a = Math.atan2(x - ax, z - az) - base; a = Math.atan2(Math.sin(a), Math.cos(a));
        if (a < amin) { amin = a; pmin = [x, z]; } if (a > amax) { amax = a; pmax = [x, z]; }
        near = Math.min(near, Math.hypot(x - ax, z - az));
      }
      if (near < 0.4) continue;
      const far = (p) => { const dx = p[0] - ax, dz = p[1] - az, l = Math.hypot(dx, dz) || 1; return [ax + dx / l * (R + 1), az + dz / l * (R + 1)]; };
      const q0 = pmin, q1 = pmax, f0 = far(q0), f1 = far(q1);
      // the quad q0 f0 f1 q1 plus the footprint's centre fan (so the cover itself is inside its shadow)
      const quad = [q0, f0, f1, q0, f1, q1];
      for (const p of quad) { P[n * 3] = p[0]; P[n * 3 + 1] = y; P[n * 3 + 2] = p[1]; n++; }
      // and the footprint (two triangles for a box, a fan approximation for circles via its quad)
      if (c.type !== 'circle') { const [a, b, cc, d] = pts; for (const p of [a, b, cc, a, cc, d]) { P[n * 3] = p[0]; P[n * 3 + 1] = y; P[n * 3 + 2] = p[1]; n++; } }
    }
    this.n = n;
    this.mesh.geometry.setDrawRange(0, n);
    this.mesh.geometry.attributes.position.needsUpdate = true;
    const u = this.mat.uniforms; u.uApex.value.set(ax, az); u.uAng.value = ang; u.uHalf.value = half; u.uK.value = k;
    this.mesh.visible = n > 0 && k > 0.003;
  }
  hide() { this.mesh.visible = false; }
  dispose(scene) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); }
}

// ------------------------------------------------------------------------------------------------ Polaroids
const POLA_GEO = new THREE.PlaneGeometry(0.34, 0.41);
function polaroidTexture(photo, blurred) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 310; const g = c.getContext('2d');
  g.fillStyle = '#f4f0e8'; g.fillRect(0, 0, 256, 310);
  g.fillStyle = '#18121c'; g.fillRect(16, 16, 224, 224);
  if (photo) { g.save(); if (blurred) g.filter = 'blur(9px)'; g.drawImage(photo, 16, 16, 224, 224); g.restore(); }
  g.fillStyle = 'rgba(255,240,230,0.08)'; g.fillRect(16, 16, 224, 224);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { tex: t, canvas: c };
}

// ------------------------------------------------------------------------------------------------ the shots
export class Shots {
  // ctx: { boss, fig, sounds, cover(): [footprints], onPhoto(pol), onBlur(), onFlash(shot) }
  constructor(f, ctx) {
    this.f = f; this.ctx = ctx;
    this.list = [];
    this.shadows = new ShadowLayer(f.scene);
    this.polaroids = [];
    this.lastPhoto = null;          // the last picture she got of you (for the locket)
    this.lastBlurred = false;
    this.photoRT = new THREE.WebGLRenderTarget(256, 256, { colorSpace: THREE.SRGBColorSpace });
    this.photoCam = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
    this.photoCanvas = document.createElement('canvas'); this.photoCanvas.width = this.photoCanvas.height = 256;
    this.ledK = 0;
  }

  // a shot: { t0, t1 (the flash), variant, hold (beats), half, apex {x,z} | null (the phone, beyond her), at {x,z} (aim;
  //   default YOU at t0), follow (fn(t) -> {x, z, angle}: a moving beam, until lockT), lockT, dmg, pose, noBoss,
  //   sidestep (default true), onFlash(hit), onHold(), onEnd() }
  start(o) {
    const f = this.f, v = VARIANT[o.variant || 'SHOT'];
    // under your spotlight she can't take a picture: a shot that would start now never happens (its cone couldn't
    // be drawn, and a flash with no cone on the floor would be a hit you couldn't see coming)
    if (f.suppress) return null;
    const s = { ...o, v, half: o.half ?? v.half, dmg: o.dmg ?? v.dmg, holdBeats: o.hold ?? v.hold, done: false, flashed: false, blurred: false };
    const boss = f.boss;
    if (!o.noBoss && f.boss.state !== 'stagger') {
      // a clear line first: she sidesteps up to 3 m so cover doesn't hide you from her phone
      if (!o.apex && o.sidestep !== false) this._sidestep(s);
    }
    this._aim(s);
    s.tele = f.tele.add({ shape: 'cone', x: s.ax, z: s.az, angle: s.ang, w: R, param: s.half, kind: s.ghost ? 'grey' : 'white', color: new THREE.Color(0.55, 0.55, 0.6),
      start: s.t0, end: s.t1, linger: 0.07, follow: s.follow ? () => this._follow(s) : null });
    if (!s.ghost) f.cue('white', { x: s.ax });
    if (!o.noBoss) {
      boss.backTo = { x: s.ax + Math.sin(s.ang) * 30, z: s.az + Math.cos(s.ang) * 30 };   // her back to YOU (along the axis)
      this.ctx.onPose && this.ctx.onPose(s, 'raise');
    }
    // the focus-assist chirps on the fill's first two beats, the capacitor's whine under it
    const beat = f.beat;
    const snd = this.ctx.sounds;
    if (snd && !s.ghost && f.t <= s.t0 + 0.05) {
      snd.chirp(0, s.ax); f.at(s.t0 + beat, () => snd.chirp(1, s.ax));
      snd.whine(Math.max(0.1, s.t1 - f.t), s.ax, s.variant === 'SUNRISE' ? 1.8 : 1);
    }
    f.at(s.t1, () => this._flash(s));
    this.list.push(s);
    return s;
  }
  _aim(s) {
    const f = this.f, b = f.boss;
    const tgt = s.at || { x: f.player.x, z: f.player.z };
    if (s.apex) { s.ax = s.apex.x; s.az = s.apex.z; }
    else {
      const ux = tgt.x - b.x, uz = tgt.z - b.z, l = Math.hypot(ux, uz) || 1;
      s.ax = b.x - ux / l * 1.5; s.az = b.z - uz / l * 1.5;
    }
    s.ang = Math.atan2(tgt.x - s.ax, tgt.z - s.az);
  }
  _follow(s) {
    if (!s.follow) return null;
    const p = s.follow(this.f.t, s);
    if (p) { s.ax = p.x; s.az = p.z; if (p.angle !== undefined) s.ang = p.angle; }
    return { x: s.ax, z: s.az, angle: s.ang };
  }
  _sidestep(s) {
    const f = this.f, b = f.boss, cover = this.ctx.cover();
    const P = f.player;
    const test = (bx, bz) => { const ux = P.x - bx, uz = P.z - bz, l = Math.hypot(ux, uz) || 1; const ax = bx - ux / l * 1.5, az = bz - uz / l * 1.5; return !blocked(ax, az, P.x, P.z, cover); };
    if (test(b.x, b.z)) return;
    const ux = P.x - b.x, uz = P.z - b.z, l = Math.hypot(ux, uz) || 1, px = -uz / l, pz = ux / l;
    for (const d of [1, -1, 2, -2, 3, -3]) {
      const nx = b.x + px * d, nz = b.z + pz * d;
      const r = f.arena.resolve ? f.arena.resolve(nx, nz, 0.5) : { x: nx, z: nz };
      if (test(r.x, r.z)) { b.x = r.x; b.z = r.z; if (b.mark) { b.mark.x = r.x; b.mark.z = r.z; } b.snap(0.15); return; }
    }
  }
  // what the flash sees right now
  photographs(s) {
    const f = this.f, P = f.player;
    if (!inShape({ shape: 'cone', x: s.ax, z: s.az, angle: s.ang, w: R, param: s.half }, P.x, P.z, 0.3)) return 'out';
    if (blocked(s.ax, s.az, P.x, P.z, this.ctx.cover())) return 'covered';
    return 'in';
  }
  _flash(s) {
    const f = this.f;
    if (s.done || s.flashed) return;
    s.flashed = true;
    this.ctx.sounds && this.ctx.sounds.stopWhine();
    const boss = f.boss;
    const dead = boss.state === 'desperate' || s.ghost;
    if (f.suppress || !s.tele || s.tele.dead) { this._end(s, true); return; }        // the spotlight is on YOU (or wiped her cone): her shot fizzles
    const big = s.variant === 'GROUP' || s.variant === 'SUNRISE';
    // the flash itself: the LED blooms, the cone lights (the telegraph's own end flash), the screen lifts a little
    this.ledK = dead ? 0.35 : 1;
    if (!dead) f.fx.flash(new THREE.Color(1, 0.97, 0.94), s.v.lift);
    this.ctx.sounds && (dead ? this.ctx.sounds.play('pop', { x: s.ax, gain: 0.35, rate: 0.7 }) : this.ctx.sounds.snap(s.ax, big));
    let hit = 'miss';
    if (!dead) {
      const seen = this.photographs(s);
      const pl = f.player;
      if (seen === 'in') {
        if (pl.invulnerable && pl.state === 'dash') { hit = 'blurred'; s.blurred = true; pl.nearMiss(f._ctx(0)); f._good && f._good(80); this._photo(s, true); }
        else if (!pl.invulnerable && pl.hurt(f._ctx(0), s.dmg, s.ax, s.az, 'flash')) { hit = 'hit'; f._hurt(s.ax, s.az); this._photo(s, false); }
      }
    }
    s.onFlash && s.onFlash(hit, s);
    this.ctx.onFlash && this.ctx.onFlash(s, hit);
    // the hold: she admires the photo (a blurred one: she holds 2 beats longer, fuming)
    const beat = f.beat;
    s.tHold = f.t + (s.holdBeats + (s.blurred ? 2 : 0)) * beat;
    if (!s.noBoss && s.holdBeats > 0) { this.ctx.onPose && this.ctx.onPose(s, s.blurred ? 'fury' : 'hold'); f.at(s.tHold, () => this._end(s)); }
    else this._end(s);
  }
  _end(s, cancelled = false) {
    if (s.done) return;
    s.done = true;
    if (s.tele) s.tele.dead = s.tele.dead || cancelled;
    if (!s.noBoss && !this.list.some((x) => x !== s && !x.done && !x.noBoss)) { this.f.boss.backTo = null; this.ctx.onPose && this.ctx.onPose(s, 'release'); }
    s.onEnd && s.onEnd(s);
  }
  cancelAll() {
    for (const s of this.list) { if (!s.done) { s.done = true; if (s.tele) s.tele.dead = true; } }
    this.list.length = 0; this.shadows.hide(); this.f.boss.backTo = null;
    this.ctx.sounds && this.ctx.sounds.stopWhine();
  }
  get active() { return this.list.find((s) => !s.done && !s.flashed) || null; }
  get holding() { return this.list.find((s) => !s.done && s.flashed && !s.noBoss) || null; }

  // ---------- the photo ----------
  _photo(s, blurred) {
    const f = this.f, r = f.app.renderer, pl = f.player;
    // a picture of YOU from the phone (where the cone starts, 1.6 m up)
    const cam = this.photoCam;
    cam.position.set(s.ax, 1.6, s.az); cam.lookAt(pl.x, 1.15, pl.z);
    const d = Math.hypot(pl.x - s.ax, pl.z - s.az); cam.fov = THREE.MathUtils.clamp(2 * Math.atan(1.4 / Math.max(1, d)) * 180 / Math.PI, 14, 60); cam.updateProjectionMatrix();
    cam.layers.enableAll(); cam.layers.disable(LAYER.HIDDEN);
    let img = null;
    try {
      const prev = r.getRenderTarget();
      r.setRenderTarget(this.photoRT); r.clear(); r.render(f.scene, cam); r.setRenderTarget(prev);
      const px = new Uint8Array(256 * 256 * 4); r.readRenderTargetPixels(this.photoRT, 0, 0, 256, 256, px);
      const g = this.photoCanvas.getContext('2d'); const id = g.createImageData(256, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const i = ((255 - y) * 256 + x) * 4, j = (y * 256 + x) * 4; id.data[j] = Math.min(255, px[i] * 1.15); id.data[j + 1] = Math.min(255, px[i + 1] * 1.1); id.data[j + 2] = px[i + 2]; id.data[j + 3] = 255; }
      g.putImageData(id, 0, 0); img = this.photoCanvas;
    } catch (e) { img = null; }
    const { tex, canvas } = polaroidTexture(img, blurred);
    this.lastPhoto = canvas; this.lastBlurred = blurred;
    const m = new THREE.Mesh(POLA_GEO, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, side: THREE.DoubleSide }));
    m.castShadow = false; m.receiveShadow = true;
    const b = f.boss;
    const land = { x: b.x + (Math.random() - 0.5) * 1.6, z: b.z + 0.6 + Math.random() * 0.8 };
    m.position.set(b.x, 2.2, b.z);
    f.scene.add(m);
    const p = { m, t: 0, from: m.position.clone(), land, spin: (Math.random() - 0.5) * 6, rot: Math.random() * 6.28 };
    this.polaroids.push(p);
    if (this.polaroids.length > 14) { const o = this.polaroids.shift(); f.scene.remove(o.m); o.m.material.map.dispose(); o.m.material.dispose(); }
    this.ctx.sounds && this.ctx.sounds.play(blurred ? 'smear' : 'whir', { x: b.x, delay: blurred ? 0 : 0.05 });
    this.ctx.onPhoto && this.ctx.onPhoto(p, blurred);
  }
  clearPolaroids() { for (const p of this.polaroids) { this.f.scene.remove(p.m); p.m.material.map.dispose(); p.m.material.dispose(); } this.polaroids.length = 0; }

  update(dt) {
    const f = this.f;
    // the shadows of cover inside the cone that's filling
    const s = this.active;
    if (s && f.t >= s.t0 && !s.ghost) {
      if (s.follow) this._follow(s);
      const k = THREE.MathUtils.clamp((f.t - s.t0) / Math.max(0.01, s.t1 - s.t0), 0, 1);
      this.shadows.draw(s.ax, s.az, s.ang, s.half, 0.25 + 0.45 * k * k, this.ctx.cover());
    } else this.shadows.hide();
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].done) this.list.splice(i, 1);
    // the LED's bloom decays
    this.ledK = Math.max(0, this.ledK - dt * 7);
    // Polaroids flutter down
    for (const p of this.polaroids) {
      if (p.t >= 1) continue;
      p.t = Math.min(1, p.t + dt / 1.3);
      const k = p.t, e = 1 - (1 - k) * (1 - k);
      p.m.position.set(p.from.x + (p.land.x - p.from.x) * e + Math.sin(k * 9) * 0.25 * (1 - k), 0.02 + (p.from.y - 0.02) * (1 - k) * (1 - k * 0.3) + Math.sin(k * Math.PI) * 0.6, p.from.z + (p.land.z - p.from.z) * e);
      p.m.rotation.set(-Math.PI / 2 + Math.sin(k * 11) * 0.9 * (1 - k), p.rot + p.spin * k, Math.cos(k * 8) * 0.6 * (1 - k));
    }
  }
  dispose() {
    this.cancelAll(); this.clearPolaroids();
    this.shadows.dispose(this.f.scene); this.photoRT.dispose();
  }
}
