// Her attacks, on absolute song times (seconds), built on the shared patterns where they fit (area, lob, ring,
// spiral) and in here where they don't: the key ring that goes out and comes back, the blocks that fall where you'll
// be two beats from now, the kisses that close on a point, YOUR headlights sweeping the lakebed with the cover's
// shadows in them, the pour, the stops. Hazards the floor telegraphs can't carry are listed in f.lakeHz for the bot.
import * as THREE from 'three';
import { inShape } from '../../game/choreo.js';
import { FEEL } from '../../game/player.js';
import { walkable, floorAt, segCircle, SPOTS } from './lake.js';

const toward = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const TAU = Math.PI * 2;
// a projectile whose path is scripted: give it its true velocity for this frame and let the shared step carry it there
// (so the catch window, the collision and anything that reads motion all see where it is really going)
function drive(q, nx, nz, dt) {
  if (q._px === undefined) { q._px = q.x; q._pz = q.z; }
  const dx = nx - q._px, dz = nz - q._pz, d = Math.hypot(dx, dz);
  q.speed = d / Math.max(dt, 1e-4); if (d > 1e-5) q.angle = Math.atan2(dx, dz);
  q.x = q._px; q.z = q._pz; q._px = nx; q._pz = nz;
}

// a telegraphed area that lands at `end` (or fizzles, onFizzle, if its telegraph was cleared: nothing lands unseen).
// silent: no warning cue; sound: false, no landing slam (several areas landing on one instant need only one)
export function area(f, sh, { start, end, kind = 'white', damage = 1, melee = false, onImpact, onFizzle, silent = false, sound, follow = null } = {}) {
  return f.pat.area(f, { ...sh, kind, start: start ?? f.t, end, damage, melee, onImpact, onFizzle, silent, sound, follow });
}
// a telegraph that only shows (the thing that hurts is a projectile or a hazard of its own)
export function show(f, sh, start, end, kind = 'pink', follow = null) {
  const g = f.tele.add({ ...sh, kind, start, end, follow });
  if (start <= f.t + 0.01) f.cue(kind, sh);
  return g;
}

// ---------------------------------------------------------------------------------------------- the key ring
// thrown at tOut from her hand to YOUR spot (max 9 m), there at tTurn, hangs spinning to tHang, back on her finger at tBack.
// It cuts both ways; catch it on either pass and it goes back to her gold.
export function keyRing(f, L, { tOut, tTurn, tHang, tBack, lane = tOut - f.beat, max = 9, along = null }) {
  const b = f.boss, pl = f.player;
  const from = { x: b.x, z: b.z };
  let ang = along ?? toward(from, pl), dist = Math.min(max, Math.max(3, Math.hypot(pl.x - from.x, pl.z - from.z) + 0.6));
  const turn = { x: from.x + Math.sin(ang) * dist, z: from.z + Math.cos(ang) * dist };
  const w = walkable(turn.x, turn.z, 0.3); turn.x = w.x; turn.z = w.z; dist = Math.hypot(turn.x - from.x, turn.z - from.z); ang = toward(from, turn);
  show(f, { shape: 'rect', x: from.x, z: from.z, angle: ang, w: 0.5, h: dist }, Math.min(f.t, lane), tTurn, 'pink');
  f.after(Math.max(0, tOut - f.t), () => {
    L.solver.keysOn(false); L.snd.play('coins', b.x);
    if (b.rig) b.perform('OverhandThrow', { from: 0.25, to: 0.7, duration: Math.max(0.3, Math.min(0.7, tTurn - tOut)) });
    const hand = { x: b.x, z: b.z };
    const p = f.proj.spawn({ x: hand.x, z: hand.z, y: 1.3, speed: 0, angle: ang, kind: 'pink', shape: 'ring', size: 0.55, life: tBack - tOut + 0.3, spin: 14, tag: 'keys',
      fn: (q, dt) => {
        if (q.owner !== 'boss') return;
        const t = f.t; let nx, nz;
        if (t < tTurn) { const k = Math.max(0, (t - tOut) / (tTurn - tOut)); nx = hand.x + (turn.x - hand.x) * k; nz = hand.z + (turn.z - hand.z) * k; q.spin = 14; }
        else if (t < tHang) { nx = turn.x; nz = turn.z; q.spin = 26; }
        else { const k = Math.min(1, (t - tHang) / Math.max(0.05, tBack - tHang)); nx = turn.x + (b.x - turn.x) * k; nz = turn.z + (b.z - turn.z) * k; q.spin = 16; if (k >= 1) { q.dead = true; L.solver.keysOn(true); L.snd.play('coins', b.x, { gain: 0.6 }); } }
        drive(q, nx, nz, dt);
      },
      onDeath: () => {} });
    if (p) p.parryable = true;
    // caught: she gets it back a beat after it hits her
    f.at(tBack + f.beat * 1.2, () => L.solver.keysOn(true));
  });
  return turn;
}

// the boomerang loop: a full circle of radius R through her and through YOUR spot, back in her hand at tBack
export function keyLoop(f, L, { tOut, tBack, R = 4.3 }) {
  const b = f.boss, pl = f.player;
  const from = { x: b.x, z: b.z };
  let d = Math.hypot(pl.x - from.x, pl.z - from.z); const a0 = toward(from, pl);
  const reach = Math.min(d, 2 * R - 0.1); const mid = { x: from.x + Math.sin(a0) * reach / 2, z: from.z + Math.cos(a0) * reach / 2 };
  const off = Math.sqrt(Math.max(0, R * R - (reach / 2) ** 2));
  // the side with more yard
  const sides = [1, -1].map((s) => ({ s, c: { x: mid.x + Math.cos(a0) * off * s, z: mid.z - Math.sin(a0) * off * s } }));
  const pick = sides.sort((u, v) => Math.hypot(u.c.x + 2, u.c.z) - Math.hypot(v.c.x + 2, v.c.z))[0];
  const c = pick.c, start = Math.atan2(from.x - c.x, from.z - c.z), dir = pick.s;
  show(f, { shape: 'ring', x: c.x, z: c.z, w: R + 0.5, param: 1.0 }, tOut, tBack, 'pink');
  f.after(Math.max(0, tOut - f.t), () => {
    L.solver.keysOn(false); L.snd.play('coins', b.x);
    if (b.rig) b.perform('OverhandThrow', { from: 0.25, to: 0.7, duration: 0.5 });
    f.proj.spawn({ x: from.x, z: from.z, y: 1.3, speed: 0, kind: 'pink', shape: 'ring', size: 0.55, life: tBack - tOut + 0.2, spin: 18, tag: 'keys',
      fn: (q, dt) => { if (q.owner !== 'boss') return; const k = Math.min(1, Math.max(0, (f.t - tOut) / (tBack - tOut))); const a = start + dir * k * TAU; drive(q, c.x + Math.sin(a) * R, c.z + Math.cos(a) * R, dt); if (k >= 1) { q.dead = true; L.solver.keysOn(true); } } });
    f.at(tBack + f.beat, () => L.solver.keysOn(true));
  });
}

// ---------------------------------------------------------------------------------------------- two steps ahead
// a pink cinder block (with a bow) falls where YOU will be when it lands: your position plus your velocity times the wait
export function block(f, L, { place, land, r = 1.4, sink = false }) {
  f.after(Math.max(0, place - f.t), () => {
    if (f.suppress) return;   // she's blinded by YOUR spotlight: nothing falls
    const pl = f.player, dt = land - place;
    const p = walkable(pl.x + pl.vx * dt, pl.z + pl.vz * dt, 0.5);
    if (L.solver && f.boss.rig && !L.noFlick) f.boss.rig.upperOnce('Spell_Simple_Shoot', { duration: 0.4, from: 0.2, to: 0.7 });
    const blk = L.world.block(), o = blk.o, y0 = floorAt(p.x, p.z);
    o.position.set(p.x, 40, p.z); o.rotation.set(0, Math.random() * TAU, 0);
    L.snd.play('whistle', p.x, { gain: 0.8, at: Math.max(0, dt - 1.3) });
    const t0 = f.t;
    // the spotlight clears its telegraph (and so its impact): the block puffs away where it is, mid-air
    let done = false;
    const away = () => { if (done) return; done = true; L.live.delete(blk); if (o.visible && o.position.y < y0 + 9) L.world.particles.burst(8, { x: o.position.x, y: o.position.y + 0.2, z: o.position.z, speed: 1.6, up: 0.6, life: 0.6, size: 0.14, grow: 0.5, color: new THREE.Color(1.3, 0.55, 0.85), gravity: 0.3, shape: 0, alpha: 0.5 }); o.visible = false; blk.busy = false; };
    blk.fall = () => { if (f.suppress) { away(); return; } const k = Math.min(1, (f.t - t0) / dt); const e = Math.pow(Math.max(0, (k - 0.35) / 0.65), 2); o.position.y = sink ? y0 + 12 * (1 - e) : y0 + 0.16 + 22 * (1 - e); if (sink && Math.random() < 0.3) L.world.particles.add({ x: o.position.x, y: o.position.y + 0.3, z: o.position.z, vy: 1, life: 1.2, size: 0.06, color: new THREE.Color(0.7, 1, 1), shape: 2, wobble: 1 }); };
    L.live.add(blk);
    area(f, { shape: 'circle', x: p.x, z: p.z, w: r }, { start: f.t, end: land, kind: 'white', onImpact: () => {
      done = true; L.live.delete(blk); o.visible = false; blk.busy = false;
      L.snd.play('woodHeavy', p.x); L.snd.play('mining', p.x, { gain: 0.8 });
      f.fx.dust(p.x, p.z, 10, new THREE.Color(1.6, 0.6, 0.95)); f.fx.chips(p.x, 0.3, p.z, new THREE.Color(2.4, 0.9, 1.4), 14);
      L.world.particles.burst(16, { x: p.x, y: y0 + 0.2, z: p.z, speed: 2.4, up: 1.4, life: 0.9, size: 0.18, grow: 0.6, color: new THREE.Color(1.3, 0.55, 0.85), gravity: 0.6, shape: 0, alpha: 0.6 });
      f.cam.shake(0.25, 0.08);
    }, onFizzle: away });
  });
}

// ---------------------------------------------------------------------------------------------- the kiss ring
// n pink kisses appear round YOU at radius r (following you), lock onto that spot, and all arrive at it at `arrive`
export function kissRing(f, L, { appear, lock, arrive, n = 10, r = 5, rot = 0 }) {
  f.after(Math.max(0, appear - f.t), () => {
    const pl = f.player; const c = { x: pl.x, z: pl.z };
    show(f, { shape: 'ring', x: c.x, z: c.z, w: r + 0.25, param: 0.5 }, f.t, arrive, 'pink', () => (f.t < lock ? { x: pl.x, z: pl.z } : { x: c.x, z: c.z }));
    show(f, { shape: 'circle', x: c.x, z: c.z, w: 0.8 }, f.t, arrive, 'pink', () => (f.t < lock ? { x: pl.x, z: pl.z } : { x: c.x, z: c.z }));
    L.snd.play('kiss', c.x);
    for (let i = 0; i < n; i++) {
      const a = rot + i / n * TAU;
      f.proj.spawn({ x: c.x + Math.sin(a) * r, z: c.z + Math.cos(a) * r, y: 1.2, speed: 0, kind: 'pink', shape: 'kiss', size: 0.42, life: arrive - f.t + 0.08,
        fn: (q, dt) => {
          if (q.owner !== 'boss') return;
          if (f.t < lock) { c.x = pl.x; c.z = pl.z; }
          const k = f.t < lock ? 0 : Math.min(1, (f.t - lock) / (arrive - lock)), rr = r * (1 - k);
          drive(q, c.x + Math.sin(a) * rr, c.z + Math.cos(a) * rr, dt);
          if (k >= 1) { q.dead = true; }
        } });
    }
    f.at(arrive, () => { L.snd.play('pop', c.x); L.world.ripple && L.world.ripple(c.x, c.z, 0.8); });
  });
}

// ---------------------------------------------------------------------------------------------- YOUR headlights, sweeping
// two white lanes from the car on the lakebed, 1.6 m apart, sweeping from a0 to a1; the stick, the posts and the
// topiary hearts throw shadows you can stand in. A live hazard: it hurts while it's on you.
const BEAM_FS = /* glsl */`
uniform vec2 uO[2]; uniform float uA, uK, uWarm; uniform vec4 uB[8]; uniform int uBN; varying vec3 vW;
void main() {
  vec2 p = vW.xz; float a = 0.0;
  for (int i = 0; i < 2; i++) {
    vec2 d = p - uO[i]; vec2 dir = vec2(sin(uA), cos(uA)); float along = dot(d, dir); float across = abs(d.x * dir.y - d.y * dir.x);
    if (along < 0.0 || along > 16.0) continue;
    float lane = 1.0 - smoothstep(0.46, 0.52, across);
    float soft = exp(-across * across * 1.2) * 0.35;
    float sh = 1.0;
    for (int k = 0; k < 8; k++) { if (k >= uBN) break; vec2 c = uB[k].xy; float r = uB[k].z; vec2 oc = c - uO[i]; float t = clamp(dot(oc, dir), 0.0, along); if (t >= along - 0.01 && dot(oc, dir) > along) continue; vec2 q = uO[i] + dir * t; if (dot(oc, dir) < along && length(q - c) < r) sh = 0.12; }
    a += (lane * (0.55 + 0.45 * smoothstep(16.0, 2.0, along)) + soft) * sh;
  }
  a *= uK; if (a < 0.01) discard;
  vec3 col = mix(vec3(1.25, 1.55, 1.9), vec3(1.6, 1.45, 1.1), uWarm);
  gl_FragColor = vec4(col * a, a);
}`;
export class Beams {
  constructor(f, L) {
    this.f = f; this.L = L; this.list = [];
    const u = { uO: { value: [new THREE.Vector2(), new THREE.Vector2()] }, uA: { value: 0 }, uK: { value: 0 }, uWarm: { value: 0 }, uB: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) }, uBN: { value: 0 } };
    const m = new THREE.ShaderMaterial({ vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }', fragmentShader: BEAM_FS, uniforms: u, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, polygonOffset: true, polygonOffsetFactor: -3 });
    const g = new THREE.PlaneGeometry(34, 22); g.rotateX(-Math.PI / 2); g.translate(-1, 0.04, 0);
    this.mesh = new THREE.Mesh(g, m); this.mesh.renderOrder = 2; this.mesh.visible = false; this.mesh.frustumCulled = false; f.scene.add(this.mesh); this.u = u;
    // volumetric shafts through the water from the lamps
    const cone = new THREE.ConeGeometry(0.75, 16, 20, 1, true); cone.translate(0, -8, 0); cone.rotateX(-Math.PI / 2);
    this.coneM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uK: { value: 0 } },
      vertexShader: 'varying float vZ; varying vec3 vN; varying vec3 vV; void main(){ vZ = position.z; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uK; varying float vZ; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN, vV)), 1.3); float a = uK * f * smoothstep(16.0, 1.0, vZ) * smoothstep(0.0, 0.6, vZ) * 0.16; gl_FragColor = vec4(vec3(1.0, 0.95, 0.8) * a, a); }' });
    this.cones = [0, 1].map(() => { const c = new THREE.Mesh(cone, this.coneM); c.renderOrder = 9; c.visible = false; f.scene.add(c); return c; });
  }
  // origin: the beams' middle (the car's lamps); a0 -> a1 radians (0 = +z), live from tOn to tOff, zone drawn from tDraw
  sweep({ tDraw, tOn, tOff, a0, a1, from = SPOTS.beamFrom }) {
    const f = this.f;
    const mid = (a0 + a1) / 2, half = Math.abs(a1 - a0) / 2 + 0.06;
    const warn = show(f, { shape: 'cone', x: from.x, z: from.z, angle: mid, w: 16, param: half }, tDraw, tOn, 'white');
    this.list.push({ tOn, tOff, a0, a1, from, warn });
    f.lakeHz.push({ kind: 'beams', start: tDraw, tOn, end: tOff, test: (x, z, t, pad) => this.hit(x, z, t, pad), escape: (x, z, t) => this.escape(x, z, t) });
  }
  angleAt(b, t) { const k = Math.min(1, Math.max(0, (t - b.tOn) / (b.tOff - b.tOn))); const e = k * k * (3 - 2 * k); return b.a0 + (b.a1 - b.a0) * e; }
  origins(b, a) { const n = { x: Math.cos(a), z: -Math.sin(a) }; return [{ x: b.from.x + n.x * 0.8, z: b.from.z + n.z * 0.8 }, { x: b.from.x - n.x * 0.8, z: b.from.z - n.z * 0.8 }]; }
  // is (x, z) in a beam's light at t (not in a shadow)
  hit(x, z, t, pad = FEEL.radius * 0.7) {
    for (const b of this.list) {
      if (t < b.tOn || t > b.tOff) continue;
      const a = this.angleAt(b, t), O = this.origins(b, a);
      for (const o of O) {
        if (!inShape({ shape: 'rect', x: o.x, z: o.z, angle: a, w: 0.5, h: 16 }, x, z, pad)) continue;
        if (this.L.world.beamBlockers().some((c) => segCircle(o.x, o.z, x, z, c.x, c.z, c.r) && Math.hypot(c.x - o.x, c.z - o.z) < Math.hypot(x - o.x, z - o.z))) continue;
        return true;
      }
    }
    return false;
  }
  escape(x, z, t) {
    for (const b of this.list) { if (t < b.tOn - 1 || t > b.tOff) continue; const a = this.angleAt(b, Math.min(b.tOff, t + 0.4)); const s = Math.sign((b.a1 - b.a0)) || 1; return { x: -Math.cos(a) * s, z: Math.sin(a) * s }; }
    return null;
  }
  clear() { this.list.length = 0; }
  update(dt, t) {
    const f = this.f, pl = f.player;
    // nothing lands unseen: a sweep whose warning YOUR spotlight cleared never comes on, and one that's on goes out
    // while she's blinded
    this.list = this.list.filter((b) => t <= b.tOff + 0.1 && f.t >= 0 && !(b.warn && b.warn.dead) && !(f.suppress && t >= b.tOn - 0.05));
    let live = null; for (const b of this.list) if (t >= b.tOn && t <= b.tOff) live = b;
    this.mesh.visible = !!live; for (const c of this.cones) c.visible = !!live;
    if (!live) return;
    const a = this.angleAt(live, t), O = this.origins(live, a);
    this.u.uA.value = a; this.u.uK.value = Math.min(1, (t - live.tOn) / 0.12, (live.tOff - t) / 0.12 + 0.2);
    O.forEach((o, i) => this.u.uO.value[i].set(o.x, o.z));
    const B = this.L.world.beamBlockers(); this.u.uBN.value = Math.min(8, B.length); B.slice(0, 8).forEach((c, i) => this.u.uB.value[i].set(c.x, c.z, c.r, 0));
    this.cones.forEach((c, i) => { c.position.set(O[i].x, 0.7, O[i].z + 0.6); c.rotation.set(0.04, a, 0, 'YXZ'); });
    this.coneM.uniforms.uK.value = this.u.uK.value;
    // on YOU: it burns while it's on you (dash through it for a near miss)
    if (this.hit(pl.x, pl.z, t)) {
      if (pl.invulnerable) { if (pl.state === 'dash' && !live._nm) { live._nm = true; pl.nearMiss(f._ctx(0)); f._good && f._good(60); } }
      else if ((live.cool || 0) <= t && pl.hurt(f._ctx(0), 1, live.from.x, live.from.z, 'beam')) { f._hurt(live.from.x, live.from.z); live.cool = t + 0.9; }
    }
  }
  dispose() { this.f.scene.remove(this.mesh, ...this.cones); this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.coneM.dispose(); }
}

// ---------------------------------------------------------------------------------------------- the pour
// a narrow white stream from 3 m out to 9 m sweeping across a 100-degree zone centred on YOU; inside 3 m of her is safe,
// and a pole between you and her soaks it
export function pour(f, L, { tDraw, tOn, tOff }) {
  const b = f.boss, pl = f.player;
  const mid = toward(b, pl), half = 50 * Math.PI / 180;
  const warn = show(f, { shape: 'arc', x: b.x, z: b.z, angle: mid, w: 9, h: 6, param: half }, tDraw, tOn, 'white');
  const from = { x: b.x, z: b.z };
  const st = { tOn, tOff, a0: mid - half, a1: mid + half, cool: 0, nm: false, dead: false };
  const angleAt = (t) => st.a0 + (st.a1 - st.a0) * Math.min(1, Math.max(0, (t - tOn) / (tOff - tOn)));
  const test = (x, z, t, pad = FEEL.radius * 0.6) => {
    if (st.dead || t < tOn || t > tOff) return false;
    const a = angleAt(t); const d = Math.hypot(x - from.x, z - from.z);
    if (d < 3 - pad || d > 9 + pad) return false;
    const da = Math.atan2(Math.sin(toward(from, { x, z }) - a), Math.cos(toward(from, { x, z }) - a));
    if (Math.abs(da) > 0.105 + pad / Math.max(1, d)) return false;
    return !L.world.cover().some((c) => segCircle(from.x, from.z, x, z, c.x, c.z, c.r));
  };
  f.lakeHz.push({ kind: 'pour', start: tDraw, tOn, end: tOff, test, escape: (x, z, t) => { const a = angleAt(t + 0.3); const s = Math.sign(st.a1 - st.a0); return { x: -Math.cos(a) * s, z: Math.sin(a) * s }; } });
  const g = f.tele.add({ shape: 'cone', x: from.x, z: from.z, angle: st.a0, w: 9, param: 0.1, kind: 'white', start: tOn - 0.02, end: tOff, follow: () => ({ x: from.x, z: from.z, angle: angleAt(f.t) }) });
  f.after(Math.max(0, tOn - f.t), () => { if (!warn.dead && !g.dead) L.snd.play('pour', from.x); });
  L.ticks.push((dt, t) => {
    // nothing lands unseen: YOUR spotlight cleared the warning or the stream's own line, so she stops pouring
    if (warn.dead || g.dead) { st.dead = true; return false; }
    if (t < tOn || t > tOff + 0.05) return t <= tOff + 0.05;
    const a = angleAt(t);
    // the coffee: a steaming arc of drops along the stream
    for (let i = 0; i < 2; i++) { const d = 3 + Math.random() * 6; L.world.particles.add({ x: from.x + Math.sin(a) * d, y: 0.25 + Math.random() * 0.3, z: from.z + Math.cos(a) * d, vy: 0.7, life: 0.5, size: 0.05, grow: 0.12, color: new THREE.Color(0.85, 0.8, 0.75), shape: 0, alpha: 0.18 }); }
    if (Math.random() < 0.5) { const d = 3 + Math.random() * 6; L.world.particles.add({ x: from.x + Math.sin(a) * d, y: 1.0 + Math.random() * 0.4, z: from.z + Math.cos(a) * d, vy: -2, life: 0.35, size: 0.035, color: new THREE.Color(0.45, 0.27, 0.14), gravity: 9, shape: 1 }); }
    if (test(pl.x, pl.z, t)) {
      if (pl.invulnerable) { if (pl.state === 'dash' && !st.nm) { st.nm = true; pl.nearMiss(f._ctx(0)); f._good && f._good(60); } }
      else if (st.cool <= t && pl.hurt(f._ctx(0), 1, from.x, from.z, 'pour')) { f._hurt(from.x, from.z); st.cool = t + 0.9; }
    }
    return true;
  });
}

// ---------------------------------------------------------------------------------------------- her shots stop at cover
export function coverShots(f, L) {
  const cov = L.world.cover();
  for (const p of f.proj.list) {
    if (p.owner !== 'boss' || p.dead || p.tag === 'keys') continue;
    for (const c of cov) if (Math.hypot(p.x - c.x, p.z - c.z) < c.r + p.radius * 0.5) { p.dead = true; f.fx.sparks(p.x, p.y, p.z, new THREE.Color(1.6, 1.6, 1.8), 6); L.snd.play('soft', p.x, { gain: 0.4 }); break; }
  }
}
