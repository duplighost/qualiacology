// Attack helpers for THE DEFENDANT. Everything is on song seconds. Two owners: 'her' (fizzles while a verdict
// staggers her) and 'court' (set pieces: always run on the song, design §1.5).
//   zone: a telegraphed area that lands at `end` (the shared resolver: pink can be parried, white must be dodged)
//   send: a PINK catchable projectile to a circle, speed solved from the distance and clamped
//   shot: a WHITE lane that fills to the release, then a fast projectile crosses it
//   hazard: a shape that hurts for a while (fire, the key's lane, frozen floor)
import * as THREE from 'three';
import { blockable } from '../../game/kinds.js';
import { inShape } from '../../game/choreo.js';
import { FEEL } from '../../game/player.js';

export const toward = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
export const you = (f) => ({ x: f.player.x, z: f.player.z });
const clampTo = (f, p, m = 0.6) => ({ x: THREE.MathUtils.clamp(p.x, f.bounds.minX + m, f.bounds.maxX - m), z: THREE.MathUtils.clamp(p.z, f.bounds.minZ + m, f.bounds.maxZ - m) });
export { clampTo };

// ------------------------------------------------------------------------------------------ zone
// o: { shape, x, z, angle, w, h, param, kind, start, end, owner, damage, melee, onImpact(hit, sh), silent, sound,
//      follow, noHurt, cue }
export function zone(f, o) {
  o = blockable(o);
  const C = f.court;
  const owner = o.owner || 'her';
  const sh = { shape: o.shape, x: o.x, z: o.z, angle: o.angle || 0, w: o.w, h: o.h ?? o.w, param: o.param ?? 0.5 };
  const h = { sh, owner, dead: false, g: null, end: o.end };
  if (owner === 'her' && C && C.stagger) { h.dead = true; return h; }
  const s0 = o.start ?? f.t, start = f.encoreMode ? o.end - (o.end - s0) * 0.72 : s0;
  h.g = f.tele.add({ ...sh, kind: o.kind || 'white', start, end: o.end, color: o.color, follow: o.follow ? () => { const p = o.follow(); sh.x = p.x; sh.z = p.z; if (p.angle !== undefined) sh.angle = p.angle; return p; } : null });
  if (h.g && h.g.dead && f.suppress) { h.dead = true; return h; }
  if (!o.silent) {
    if (start > f.t + 0.02) f.at(start, () => { if (!h.dead) f.cue(o.kind || 'white', sh); });
    else f.cue(o.kind || 'white', sh);
  }
  C && C.zones.push(h);
  f.at(o.end, () => {
    if (C) C.zones = C.zones.filter((z) => z !== h);
    // nothing lands that you can't see: the spotlight (or a finish) cleared its telegraph
    if (h.g && h.g.dead) h.dead = true;
    if (h.dead) return;
    const hit = o.noHurt ? 'miss' : f.resolveArea(sh, o);
    o.onImpact && o.onImpact(hit, sh);
    if (o.sound !== false && !o.noHurt) f.sfx.impactArea && f.sfx.impactArea(o.kind, f.pan(sh.x), hit);
  });
  return h;
}

// ------------------------------------------------------------------------------------------ send (pink)
// o: { from, to, fire, arrive, r, size, shape, vmin, vmax, homing, life, owner, y, onFire, tele (false: no circle) }
export function send(f, o) {
  const fire = o.fire ?? f.t;
  const go = () => {
    const C = f.court;
    if ((o.owner || 'her') === 'her' && C && C.stagger) return;
    const from = typeof o.from === 'function' ? o.from() : (o.from || handOf(f));
    const to0 = typeof o.to === 'function' ? o.to() : (o.to || you(f));
    const to = clampTo(f, to0, 0.3);
    const dist = Math.max(0.2, Math.hypot(to.x - from.x, to.z - from.z));
    const dur = Math.max(0.05, (o.arrive ?? fire + 2 * f.beat) - f.t);
    const sp = THREE.MathUtils.clamp(dist / dur, o.vmin ?? 2, o.vmax ?? 9);
    const life = (o.homing ? (o.life ?? 4) : dist / sp + 0.04);
    if (o.tele !== false) zone(f, { shape: 'circle', x: to.x, z: to.z, w: o.r ?? 1.0, kind: 'pink', start: f.t, end: f.t + dist / sp, owner: o.owner, noHurt: true, silent: true });
    const p = f.proj.spawn({ x: from.x, z: from.z, y: o.y ?? 1.25, angle: toward(from, to), speed: sp, kind: 'pink', shape: o.shape || 'kiss', size: o.size ?? 0.42, life,
      homing: o.homing || 0, target: o.homing ? () => f.player : null, spin: o.spin ?? 2,
      onDeath: (q) => { if (q.owner === 'boss') { f.fx.glitter(q.x, 0.25, q.z, new THREE.Color(3, 0.8, 1.8), 6, 0.3); f.ppg && f.ppg.snd.play('pop', { pan: f.pan(q.x), gain: 0.35 }); } } });
    if (p && o.gold) p.dmgBack = o.gold;
    f.ppg && f.ppg.snd.play(o.sound || 'kiss', { pan: f.pan(from.x), gain: 0.55 });
    o.onFire && o.onFire(p);
  };
  if (fire > f.t + 0.005) f.at(fire, go); else go();
}

// ------------------------------------------------------------------------------------------ shot (white)
// o: { from, angle | at, w, h, start, release, speed, size, shape, owner, damage }
export function shot(f, o) {
  const C = f.court;
  const from = o.from || { x: f.boss.x, z: f.boss.z };
  const ang = o.angle ?? toward(from, o.at || you(f));
  const h = o.h ?? 14;
  const z = zone(f, { shape: 'rect', x: from.x, z: from.z, angle: ang, w: o.w ?? 0.3, h, kind: 'white', start: o.start ?? f.t, end: o.release, owner: o.owner, noHurt: true, silent: o.silent });
  f.at(o.release, () => {
    if (z.dead) return;
    if ((o.owner || 'her') === 'her' && C && C.stagger) return;
    f.proj.spawn({ x: from.x + Math.sin(ang) * 0.4, z: from.z + Math.cos(ang) * 0.4, y: o.y ?? 1.2, angle: ang, speed: o.speed ?? 11, kind: 'white', shape: o.shape || 'card', size: o.size ?? 0.3, life: h / (o.speed ?? 11) + 0.1, damage: o.damage ?? 1, spin: o.spin ?? 0 });
    f.ppg && f.ppg.snd.play(o.sound || 'card', { pan: f.pan(from.x), gain: 0.5 });
  });
  return z;
}

// ------------------------------------------------------------------------------------------ hazard
// a shape that hurts while it's live: o: { shape: fn(t) -> sh | sh, t0, t1, damage, owner, kind }
export function hazard(f, o) {
  const C = f.court;
  const hz = { o, dead: false };
  (f.ppg.hazards || (f.ppg.hazards = [])).push(hz);
  return hz;
}
export function updateHazards(f) {
  const list = f.ppg.hazards; if (!list) return;
  const t = f.t, pl = f.player;
  for (let i = list.length - 1; i >= 0; i--) {
    const hz = list[i], o = hz.o;
    if (hz.dead || t > o.t1) { list.splice(i, 1); continue; }
    if (t < o.t0 || f.suppress) continue;
    if ((o.owner === 'her') && f.court.stagger) continue;
    const sh = typeof o.shape === 'function' ? o.shape(t) : o.shape;
    if (!sh) continue;
    if (inShape(sh, pl.x, pl.z, FEEL.radius * 0.75)) {
      if (pl.invulnerable) { if (pl.state === 'dash' && !hz.nm) { hz.nm = true; pl.nearMiss(f._ctx(0)); f._good && f._good(60); } }
      else if (pl.hurt(f._ctx(0), o.damage ?? 1, sh.x, sh.z, 'area')) { f._hurt(sh.x, sh.z); o.onHit && o.onHit(); }
    }
  }
}

// where her right hand is (for sends), from the figurine's bone if it has one
export function handOf(f, side = 'r') {
  const b = f.boss, bone = b.rig && b.rig.bones['hand_' + side];
  if (bone) { const p = bone.getWorldPosition(new THREE.Vector3()); return { x: p.x, z: p.z }; }
  return { x: b.x + Math.sin(b.facing) * 0.5, z: b.z + Math.cos(b.facing) * 0.5 };
}

// ------------------------------------------------------------------------------------------ gold marks
// A gold circle on the floor that isn't a threat (the jacket, the finish): drawn by us, not the telegraph layer,
// so it reads as "yours".
const MARK_GEO = new THREE.RingGeometry(0.0, 1, 64);
export function goldMark(f, o) {
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uK: { value: 0 }, uA: { value: 1 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uK, uA; varying vec2 vU; void main(){ float d = length(vU); float w = fwidth(d);
      float rim = 1.0 - smoothstep(0.0, w * 2.5, abs(d - 0.97));
      float fill = (1.0 - smoothstep(uK - w, uK + w, d)) * 0.28;
      float a = (rim * 0.95 + fill + 0.06) * uA * (1.0 - smoothstep(0.99, 1.0, d));
      gl_FragColor = vec4(vec3(3.0, 1.9, 0.5) * a, a); }` });
  const m = new THREE.Mesh(MARK_GEO, mat); m.rotation.x = -Math.PI / 2; m.position.set(o.x, 0.04, o.z); m.scale.setScalar(o.r ?? 1); m.renderOrder = 3;
  f.scene.add(m);
  const mk = { m, o };
  (f.ppg.marks || (f.ppg.marks = [])).push(mk);
  return mk;
}
export function updateMarks(f) {
  const list = f.ppg.marks; if (!list) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const { m, o } = list[i];
    const k = THREE.MathUtils.clamp((f.t - o.start) / Math.max(0.01, o.end - o.start), 0, 1);
    m.material.uniforms.uK.value = k;
    const after = f.t - o.end;
    m.material.uniforms.uA.value = f.t < o.start ? 0 : after > 0 ? Math.max(0, 1 - after / 0.25) : Math.min(1, (f.t - o.start) / 0.1);
    if (o.follow) { const p = o.follow(); m.position.x = p.x; m.position.z = p.z; }
    if (after > 0.25) { f.scene.remove(m); m.material.dispose(); list.splice(i, 1); }
  }
}
export function clearMarks(f) { for (const { m } of f.ppg.marks || []) { f.scene.remove(m); m.material.dispose(); } f.ppg.marks = []; f.ppg.hazards = []; }
