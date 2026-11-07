// The room's moments, called by the script on their beats (mixed into Room). Each one draws its own telegraph with
// moves.js and leaves its traces in room.live (cleared on a rewind), so a section replays exactly.
import * as THREE from 'three';
import * as M from './moves.js';
import { LAYER } from '../../game/arena.js';
import { RACKS, BINS, BOOTHS } from './props.js';

const { U, toward, TAU, clamp } = M;
const PINK = new THREE.Color(4, 0.6, 1.7), GOLD = new THREE.Color(3.2, 2.0, 0.55), WHITE = new THREE.Color(2.4, 2.6, 3.0), RED = new THREE.Color(3.4, 0.35, 0.25);
// the fishnet's cords: twenty-odd thin lanes that are nearly all rim, so in the normal white the lattice blooms the
// whole picture white as it lands. A quieter white (still the brightest thing on the floor), and no impact flash
const NET_WHITE = new THREE.Color(1.25, 1.55, 1.9).multiplyScalar(0.4);
const step = (t, a, b) => clamp((t - a) / Math.max(1e-4, b - a), 0, 1);
const ease = (k) => k * k * (3 - 2 * k);
const decal = (m) => { m.layers.set(LAYER.NO_REFLECT); m.renderOrder = 1; return m; };
const glowMat = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending });
function radial(inner, outer) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uA: { value: 1 }, uIn: { value: inner }, uOut: { value: outer } },
    vertexShader: 'varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uA; uniform vec3 uIn, uOut; varying vec2 vU; void main(){ float d = length(vU); if (d > 1.0) discard; vec3 c = mix(uIn, uOut, smoothstep(0.0, 1.0, d)); float rim = smoothstep(0.86, 1.0, d); gl_FragColor = vec4(mix(c, vec3(0.0), rim * 0.7), uA); }' });
}

export const EVENTS = {
  // ------------------------------------------------------------------------------------------ chorus pieces
  // the real tears: pink drops falling to circles round the package, and a couple near YOU
  tears(c, t0, t1, r = 2.2, n = 6, extra = 2) {
    const f = this.f, list = [], pts = [];
    const a0 = Math.random() * TAU;
    for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU; pts.push({ x: c.x + Math.sin(a) * r, z: c.z + Math.cos(a) * r }); }
    for (let i = 0, tries = 0; i < extra && tries < 40; tries++) {
      const a = Math.random() * TAU, d = 1.6 + Math.random() * 2.4;
      const p = { x: f.player.x + Math.sin(a) * d, z: f.player.z + Math.cos(a) * d };
      if (Math.hypot(p.x - c.x, p.z - c.z) < 1.1 + 0.55 + 0.25) continue;
      if (pts.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 1.25)) continue;
      pts.push(p); i++;
    }
    const dur = Math.max(0.1, t1 - t0);
    for (const p of pts) {
      p.x = clamp(p.x, -10.6, 10.6); p.z = clamp(p.z, -6.6, 6.6);
      const drop = f.proj.spawn({ x: p.x, z: p.z, y: 6, speed: 0, angle: 0, kind: 'pink', shape: 'petal', size: 0.26, owner: 'deco', life: dur + 0.05, fn: (q) => { const k = clamp((f.t - t0) / dur, 0, 1); q.y = 6 - 5.7 * k * k; } });
      const sh = M.circle(f, { at: p, start: t0, end: t1, w: 0.55, kind: 'pink', silent: true, sound: false,
        onCancel: () => { if (drop) drop.dead = true; },
        onImpact: (hit) => {
          if (drop) drop.dead = true;
          if (hit === 'parried') { const q = f.proj.spawn({ x: f.player.x, z: f.player.z, y: 1.2, angle: toward(f.player, f.boss), speed: 16, kind: 'gold', shape: 'petal', size: 0.3, owner: 'you', life: 3, homing: 7, target: () => f.boss }); if (q) q.dmgBack = 2 * U; }
          else this.splash(p);
        } });
      list.push({ sh, drop });
    }
    return list;
  },
  popTears(list) { for (const x of list) { if (x.sh.tele) x.sh.tele.dead = true; if (x.drop) x.drop.dead = true; this.f.fx.emit(6, { x: x.sh.x, y: 0.5, z: x.sh.z, color: PINK, shape: 0, speed: 1.5, life: 0.4, size: 0.14 }); } },
  splash(p) { this.f.fx.emit(5, { x: p.x, y: 0.1, z: p.z, color: PINK, shape: 4, speed: 1.6, life: 0.4, size: 0.06, gravity: 6, up: 0.6 }); },

  // a trapdoor: the lacquer hinges down into a pit lit orange from inside; a hole you can't walk into until `until`
  trapdoor(c, t0, t1, until) {
    const f = this.f;
    const p = { x: clamp(c.x, -10.3, 10.3), z: clamp(c.z, -6.3, 6.3) };
    this.snd.stretch(t0, t1, 0.5);
    M.circle(f, { at: p, start: t0, end: t1, w: 1.5, kind: 'white', onImpact: (hit) => {
      if (f.t > until) return;
      const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
      const hole = decal(new THREE.Mesh(new THREE.CircleGeometry(1.45, 48), radial(new THREE.Color(2.6, 0.9, 0.15), new THREE.Color(0.02, 0.005, 0.0))));
      hole.rotation.x = -Math.PI / 2; hole.position.y = 0.014; g.add(hole);
      const flapM = new THREE.MeshPhysicalMaterial({ color: 0x0b0608, roughness: 0.1, clearcoat: 1, side: THREE.DoubleSide });
      const flaps = [1, -1].map((s) => { const h = new THREE.Group(); h.position.set(s * 1.45, 0, 0); const m = new THREE.Mesh(new THREE.CircleGeometry(1.45, 24, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI), flapM); m.rotation.x = -Math.PI / 2; m.position.x = -s * 1.45; h.add(m); g.add(h); return { h, s }; });
      const proxy = new THREE.Object3D(); proxy.position.set(p.x, 0, p.z); this.stage.group.add(proxy);
      const piece = this.stage.add(proxy, { collider: { type: 'circle', r: 1.2 }, solid: true, tag: 'pit' });
      if (hit === 'hit') this.dropIn(p);
      const tOpen = f.t;
      this.keep(g, until + 0.4, {
        tick: (t) => { const k = t < until ? ease(step(t, tOpen, tOpen + 0.18)) : 1 - ease(step(t, until, until + 0.35)); for (const fl of flaps) fl.h.rotation.z = fl.s * k * 1.4; hole.material.uniforms.uA.value = k; },
        dispose: () => { this._unstage(piece); proxy.parent && proxy.parent.remove(proxy); },
      });
      this.snd.land(p);
      // a pit that opens under the reflection shatters it
      if (this.refl && this.refl.alive && Math.hypot(this.refl.x - p.x, this.refl.z - p.z) < 1.5) this.refl.shatter();
    } });
  },
  // YOU drops to the waist and pops back out
  dropIn(p) {
    const f = this.f, model = f.player.h.model, t0 = f.t;
    this.keep(null, t0 + 0.45, { tick: (t) => { const k = step(t, t0, t0 + 0.4); model.position.y = -0.85 * Math.sin(k * Math.PI); }, dispose: () => { model.position.y = 0; } });
  },
  _unstage(piece) { const i = this.stage.pieces.indexOf(piece); if (i >= 0) this.stage.pieces.splice(i, 1); },

  // a huge black fishnet with glowing white cords drops from the flies onto the seams (off 0) or half a tile over
  fishnet(off, t0, t1, burst = false) {
    const f = this.f, S = 3.0, L = 36, lanes = [];
    for (const dir of [0, 1]) for (let k = -5; k <= 5; k++) {
      const c = (S * k + off) * Math.SQRT2;
      const a = dir === 0 ? 3 * Math.PI / 4 : Math.PI / 4;
      const p0 = dir === 0 ? { x: c / 2, z: c / 2 } : { x: c / 2, z: -c / 2 };
      const sx = p0.x - Math.sin(a) * L / 2, sz = p0.z - Math.cos(a) * L / 2;
      // only the lanes that cross the floor
      if (Math.abs(c) > 18.5) continue;
      lanes.push(M.area(f, { shape: 'rect', x: sx, z: sz, angle: a, w: 0.25, h: L, kind: 'white', teleColor: NET_WHITE, start: t0, end: t1, linger: 0.001, silent: lanes.length > 0, sound: lanes.length === 0,
        onImpact: () => { if (this.refl && this.refl.alive && !burst) this.refl.netHit(); } }));
    }
    // the net itself: glowing cords, falling, its shadow sharpening into the telegraph
    const pos = [];
    for (const dir of [0, 1]) for (let k = -6; k <= 6; k++) {
      const c = (S * k + off) * Math.SQRT2;
      const a = dir === 0 ? 3 * Math.PI / 4 : Math.PI / 4, p0 = dir === 0 ? { x: c / 2, z: c / 2 } : { x: c / 2, z: -c / 2 };
      pos.push(p0.x - Math.sin(a) * L / 2, 0, p0.z - Math.cos(a) * L / 2, p0.x + Math.sin(a) * L / 2, 0, p0.z + Math.cos(a) * L / 2);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 1.7, 2.0), transparent: true, opacity: 0.0, depthWrite: false });
    const net = new THREE.LineSegments(geo, mat); net.layers.set(LAYER.NO_REFLECT); net.renderOrder = 8; net.frustumCulled = false;
    this.keep(net, t1 + (burst ? 0.05 : 0.5), {
      // (as it lands the cords pulse bright for a moment: that's the impact)
      tick: (t) => { const k = step(t, t0, t1); net.position.y = t < t1 ? 5.5 * (1 - k * k) + 0.06 : 0.06 + 4 * Math.pow(step(t, t1 + 0.1, t1 + 0.5), 2); mat.opacity = t < t1 ? 0.25 + 0.6 * k : 0.85 * (1 - step(t, t1 + 0.1, t1 + 0.5)); const p = t >= t1 && t < t1 + 0.12 ? 1 - (t - t1) / 0.12 : 0; mat.color.setRGB(1.6 + 1.4 * p, 1.7 + 1.4 * p, 2.0 + 1.4 * p); if (p > 0) mat.opacity = 1; },
      dispose: () => { geo.dispose(); mat.dispose(); if (burst && this.f.t >= t1 - 0.02) for (let i = 0; i < 6; i++) this.f.fx.glitter((Math.random() - 0.5) * 18, 0.3, (Math.random() - 0.5) * 10, WHITE, 20, 2.5); },
    });
    this.snd.whoosh();
  },

  // the racks swing round on "party": two cones back to back over the bow-tie each one sweeps
  // (one warning and one impact sound for all four racks, not one per shape)
  racksSwingTele(t0, t1) { let n = 0; for (const [x, z] of RACKS) for (const a of [Math.PI / 4, Math.PI / 4 + Math.PI]) { const q = n++ > 0; M.area(this.f, { shape: 'cone', x, z, angle: a, w: 1.9, param: 0.79, kind: 'white', start: t0, end: t1, silent: q, sound: !q, melee: true }); } this.snd.stretch(t0, t1, 0.8); },
  // the fallen racks spring back upright, turned across the room
  racksUpTele(t0, t1) { RACKS.forEach(([x, z], i) => M.area(this.f, { shape: 'rect', x: x - 1.6, z, angle: Math.PI / 2, w: 0.35, h: 3.2, kind: 'white', start: t0, end: t1, silent: i > 0, sound: i === 0 })); this.snd.stretch(t0, t1, 0.8); },
  // the racks topple sideways toward the runner
  racksFallTele(t0, t1) { RACKS.forEach(([x, z], i) => { const s = x < 0 ? 1 : -1; M.area(this.f, { shape: 'rect', x: x + s * 0.88, z: z - 1.6, angle: 0, w: 0.88, h: 3.2, kind: 'white', start: t0, end: t1, silent: i > 0, sound: i === 0 }); }); this.snd.stretch(t0, t1, 0.8); },

  // the scar cuts stay on the floor as glittering gold lines for two bars
  scar(sh, until) {
    const m = decal(new THREE.Mesh(new THREE.PlaneGeometry(0.06, sh.h), glowMat(new THREE.Color(1.6, 1.0, 0.3), 0.9)));
    m.geometry.translate(0, sh.h / 2, 0); m.geometry.rotateX(-Math.PI / 2); m.rotation.y = sh.angle + Math.PI; m.position.set(sh.x, 0.013, sh.z);
    const t0 = this.f.t;
    this.keep(m, until, { tick: (t) => { m.material.opacity = 0.9 * (0.6 + 0.4 * Math.sin(t * 20)) * (1 - step(t, until - 0.5, until)); }, tag: 'scar' });
  },
  // where she'll be: two glowing heel-prints 2.2 m from YOU, on the side away from the nearest wall
  heelPrints(d) {
    const f = this.f, pl = f.player;
    let best = null, bv = -1;
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const x = pl.x + Math.sin(a) * d, z = pl.z + Math.cos(a) * d; const v = Math.min(x + 11, 11 - x, z + 7, 7 - z); if (v > bv) { bv = v; best = { x, z }; } }
    return { x: clamp(best.x, -10.2, 10.2), z: clamp(best.z, -6.2, 6.2) };
  },
  keepPrints(p, until) {
    const g = new THREE.Group(); g.position.set(p.x, 0.014, p.z); g.rotation.y = toward(p, this.f.player);
    for (const s of [-1, 1]) { const m = decal(new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), glowMat(new THREE.Color(2.4, 1.6, 2.8)))); m.scale.set(1, 1.7, 1); m.rotation.x = -Math.PI / 2; m.position.set(s * 0.12, 0, 0.05); g.add(m); }
    this.keep(g, until + 0.2);
  },

  // ------------------------------------------------------------------------------------------ verse 2
  // the neglected package springs open on the band: a porcelain clown on a spring shoots up 2 m
  jackInTheBox(sh, t) {
    const f = this.f;
    const g = new THREE.Group(); g.position.set(sh.x, 0.3, sh.z);
    const pts = []; for (let i = 0; i <= 80; i++) { const k = i / 80; pts.push(new THREE.Vector3(Math.cos(k * 30) * 0.12, k * 1.8, Math.sin(k * 30) * 0.12)); }
    const spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.015, 6), this.mat.chrome);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), this.mat.porcelain); head.position.y = 1.95;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xd01020, clearcoat: 1 })); nose.position.set(0, 1.95, 0.27);
    g.add(spring, head, nose); g.scale.y = 0.05; g.visible = false;
    let twang = false;
    this.keep(g, t + 1.4, { tick: (tt) => {
      g.visible = tt >= t;
      if (tt < t) { g.scale.y = 0.05; return; }
      if (!twang) { twang = true; this.snd.wire(sh.x); this.snd.pop(); }
      const k = step(tt, t, t + 0.12), wob = Math.exp(-(tt - t) * 5) * Math.sin((tt - t) * 30) * 0.15;
      g.scale.y = Math.max(0.05, k + wob);
    } });
  },

  // her own left forearm, thrown like a boomerang: out on "MOM", hanging, back on "for-GETS"
  arm(t0, tOut, tHang, tBack) {
    const f = this.f, b = f.boss, C = f.clerk, pl = f.player;
    if (C.armGone()) { C.say('no', 2); return; }                     // notch 3 took it: she points the stump at YOU
    const from = { x: b.x, z: b.z }, tgt = { x: pl.x, z: pl.z };
    const len = Math.max(0.5, Math.hypot(tgt.x - from.x, tgt.z - from.z)), ang = toward(from, tgt);
    M.area(f, { shape: 'rect', x: from.x, z: from.z, angle: ang, w: 0.5, h: len, kind: 'pink', start: t0, end: tOut, damage: 0, sound: false, silent: true });
    const mesh = this.package('arm');
    let state = 'held', caughtQ = null;
    const circle = M.circle(f, { at: tgt, start: t0, end: tOut, w: 1.0, kind: 'pink', melee: true,
      onImpact: (hit) => { if (hit === 'parried') caughtQ = 'caught'; } });
    void circle;
    f.at(t0 + (tOut - t0) * 0.4, () => { C.armOff(true); this.snd.porcelain(b.x); state = 'out'; });
    f.at(tHang, () => { if (state === 'hang') M.area(f, { shape: 'rect', x: from.x, z: from.z, angle: ang, w: 0.5, h: len, kind: 'pink', start: tHang, end: tBack, damage: 0, sound: false }); });
    const pos = new THREE.Vector3();
    let hurtCool = -9;
    this.keep(mesh, tBack + 0.05, {
      tick: (t) => {
        if (state === 'held' || state === 'done') { mesh.visible = false; return; }
        mesh.visible = true;
        const k = t < tOut ? step(t, t0 + (tOut - t0) * 0.4, tOut) : t < tHang ? 1 : 1 - step(t, tHang, tBack);
        const ex = b.x + (tgt.x - b.x) * 0, ez = 0; void ex; void ez;
        const ax = (state === 'back' ? b.x : from.x), az = (state === 'back' ? b.z : from.z);
        pos.set(ax + (tgt.x - ax) * k, 1.3, az + (tgt.z - az) * k);
        mesh.position.copy(pos); mesh.rotation.y = t * 18;
        if (t >= tOut && state === 'out') { state = caughtQ ? 'caught' : 'hang'; if (caughtQ) this._armBack(mesh); }
        if (t >= tHang && state === 'hang') state = 'back';
        if (state === 'hang' && pl.catching && Math.hypot(pl.x - pos.x, pl.z - pos.z) < 0.6 + 0.42 && pl.tryCatch()) { const q = pl.tryCatch(); pl.caught(q, f._ctx(0)); f.fx.caught(pos.x, 1.3, pos.z, q === 'perfect'); f.sfx.catch && f.sfx.catch(q, f.pan(pos.x)); state = 'caught'; this._armBack(mesh, q === 'perfect'); return; }
        // it cuts whoever is on its lane; but on the way out, YOU standing in the catch circle is the circle's to
        // judge on "MOM" (caught, or hit), not the arm's on its way in
        const inCatch = state === 'out' && Math.hypot(pl.x - tgt.x, pl.z - tgt.z) <= 1.0 + 0.42 * 0.8;
        if ((state === 'out' || state === 'hang' || state === 'back') && t > hurtCool && !inCatch) { const r = M.touch(f, pos.x, pos.z, 0.45, { why: 'arm' }); if (r === 'hit') hurtCool = t + 0.6; }
        if (state === 'back' && t >= tBack - 0.02) { state = 'done'; C.armOff(false); this.snd.latch(b.x); }
      },
      dispose: () => { if (state !== 'done' && state !== 'caught' && f.t >= tBack - 0.05) C.armOff(false); },
    });
  },
  // the arm goes back at her, gold: it smashes into her, and she spends two beats screwing it back on
  _armBack(mesh, perfect) {
    const f = this.f, b = f.boss, C = f.clerk;
    mesh.visible = false;
    const q = f.proj.spawn({ x: f.player.x, z: f.player.z, y: 1.3, angle: toward(f.player, b), speed: 17, kind: 'gold', shape: 'shard', size: 0.5, owner: 'you', life: 3, homing: 7, target: () => b, spin: 8,
      onDeath: () => {} });
    if (q) q.dmgBack = (perfect ? 6 : 4) * U;
    f.after(0.45, () => { C.play('PickUp_Table', f.t, 2 * f.beat); b.open(2 * f.beat); f.after(2 * f.beat, () => { C.armOff(false); this.snd.latch(b.x); }); });
  },

  // the gaslight: the room puts itself back. Forms, runner, racks, curtains, the floor; her cracks turn gold
  gaslight() {
    const f = this.f;
    this.forms.mend();
    for (const l of this.live) if (l.tag === 'tear' || l.tag === 'scar' || l.tag === 'litter') l.until = Math.min(l.until, f.t + 0.25);
    this.curt.event('mend', f.t);
    f.clerk.gild();
    f.fx.flash(new THREE.Color(0.25, 0.2, 0.1), 1);
    this.snd.whoosh();
  },

  // the couple's costume: two hearts plant either side of the landing point, a ribbon tripwire between them
  tripwire(sh, from, tPlant, tUntil) {
    const f = this.f, pl = f.player;
    const a = toward(from, sh) + Math.PI / 2;
    const p1 = { x: clamp(sh.x + Math.sin(a) * 3, -10.6, 10.6), z: clamp(sh.z + Math.cos(a) * 3, -6.6, 6.6) };
    const p2 = { x: clamp(sh.x - Math.sin(a) * 3, -10.6, 10.6), z: clamp(sh.z - Math.cos(a) * 3, -6.6, 6.6) };
    const len = Math.hypot(p2.x - p1.x, p2.z - p1.z), ang = toward(p1, p2);
    M.area(f, { shape: 'rect', x: p1.x, z: p1.z, angle: ang, w: 0.2, h: len, kind: 'white', start: f.t, end: tPlant, damage: 0 });
    const hearts = [p1, p2].map((p) => { const m = this.package('heartbox'); m.position.set(sh.x, 0.25, sh.z); return { m, p }; });
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.7, 1.6) }));
    let live = true, cut = false;
    const pieces = [];
    for (const h of hearts) { this.stage.group.add(h.m); pieces.push(this.stage.add(h.m, { solid: false, breakable: { hp: 2, chips: PINK, onBreak: () => { cut = true; } } })); }
    let cool = -9;
    this.keep(rib, tUntil + 0.05, {
      tick: (t) => {
        const k = ease(step(t, tPlant - 0.25, tPlant));
        for (const h of hearts) if (h.m.visible) h.m.position.set(sh.x + (h.p.x - sh.x) * k, 0.25, sh.z + (h.p.z - sh.z) * k);
        const A = hearts[0].m.position, Bp = hearts[1].m.position;
        rib.position.set((A.x + Bp.x) / 2, 0.3, (A.z + Bp.z) / 2); rib.scale.z = Math.max(0.01, A.distanceTo(Bp)); rib.lookAt(Bp.x, 0.3, Bp.z);
        live = !cut && t >= tPlant && t < tUntil;
        // a ring thrown through the ribbon cuts it
        if (live) for (const r of pl.rings) if (r.state !== 'hand' && segDist(r.pos.x, r.pos.z, A, Bp) < 0.4) { cut = true; this.snd.cloth(r.pos.x); }
        rib.visible = !cut;
        if (live && t > cool && segDist(pl.x, pl.z, A, Bp) < 0.2 + 0.34) { const r = M.touch(f, pl.x, pl.z, 0.1, { why: 'tripwire' }); if (r === 'hit') cool = t + 1.2; }
        rib.material.color.setRGB(live ? 2.6 : 1.2, live ? 2.6 : 0.6, live ? 3.0 : 1.0);
      },
      dispose: () => { for (const h of hearts) h.m.parent && h.m.parent.remove(h.m); for (const p of pieces) this._unstage(p); },
    });
  },

  // a lit fuse: a hiss and a spark through the fill, then the boom
  fuse(sh, t1) {
    const f = this.f; let last = 0;
    this.keep(null, t1, { tick: (t) => { if (t - last > 0.05) { last = t; f.fx.sparks(sh.x, 0.5, sh.z, GOLD, 2); } } });
    this.snd.stretch(f.t, t1, 0.35);
  },
  boom(sh) { const f = this.f; f.fx.sparks(sh.x, 0.6, sh.z, new THREE.Color(3.4, 1.6, 0.4), 40); f.fx.chips(sh.x, 0.5, sh.z, new THREE.Color(1.8, 0.6, 0.2), 18); f.fx.flash(new THREE.Color(0.4, 0.2, 0.05), 1); f.cam.shake(0.6, 0.2); this.snd.thoom(); },
  // the bins roll out of the bay along their paths
  binsOut(t0, t1) { BINS.forEach(([x, z], i) => M.area(this.f, { shape: 'rect', x: 12.4, z, angle: -Math.PI / 2, w: 0.7, h: 12.4 - x + 0.7, kind: 'white', start: t0, end: t1, silent: i > 0, sound: i === 0 })); this.snd.stretch(t0, t1, 0.7); },
  binBurst(bn) {
    const f = this.f;
    bn.bursts = (bn.bursts || 0) + 1;
    f.fx.chips(bn.g.position.x, 0.9, bn.g.position.z, new THREE.Color(2.4, 1.0, 0.3), 12);
    this.snd.wire(bn.g.position.x);
    if (bn.bursts >= 2) { bn.piece.alive = false; bn.g.visible = false; f.fx.glitter(bn.g.position.x, 0.8, bn.g.position.z, GOLD, 20, 1); }
  },

  // ------------------------------------------------------------------------------------------ the party, the bridge
  guestThrower() { const g = this.guests && this.guests.thrower(); return g || { x: (Math.random() - 0.5) * 12, z: -7.8 }; },
  clang(b) {
    const m = new THREE.Group(); const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.42), this.mat.gold); m.add(blade);
    m.position.set(b.x + 0.4, 0.02, b.z + 0.3); m.rotation.y = Math.random() * 3;
    this.keep(m, 142.67);
    this.snd.wire(b.x);
  },
  uvBlink() { const t = this.f.t; this.blinks = (this.blinks || []).filter((x) => x[1] > t - 1); this.blinks.push([t, t + 0.12]); },
  runwayLights(t0, t1) {
    const g = new THREE.Group(); const dots = [];
    for (let i = 0; i < 8; i++) { const m = decal(new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), glowMat(new THREE.Color(3, 2.4, 1.4), 0))); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.015, -5.0 + i * 1.4); g.add(m); dots.push(m); }
    this.snd.runway(t1 - this.f.t - 0.6);
    this.keep(g, t1 + 0.3, { tick: (t) => { const k = step(t, t1 - 0.65, t1); dots.forEach((d, i) => { d.material.opacity = Math.max(0, 1 - Math.abs(k * 8 - i) * 0.6); }); } });
  },
  // the stamp: a receipt slammed down, and the floor ripples
  stamp(b) {
    const f = this.f;
    const ring = decal(new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 64), glowMat(new THREE.Color(2.2, 2.0, 1.8), 0.8))); ring.rotation.x = -Math.PI / 2; ring.position.set(b.x, 0.02, b.z);
    const t0 = f.t; this.keep(ring, t0 + 0.6, { tick: (t) => { const k = step(t, t0, t0 + 0.6); ring.scale.setScalar(1 + k * 5); ring.material.opacity = 0.8 * (1 - k); } });
    const paper = decal(new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), new THREE.MeshBasicMaterial({ color: 0xd8d2c6 }))); paper.rotation.x = -Math.PI / 2; paper.rotation.z = Math.random(); paper.position.set(b.x, 0.012, b.z);
    this.keep(paper, 169.33, { tag: 'litter' });
    this.snd.thoom();
  },
  // a wave of boxes off the right-hand shelving: eight circles, one on YOU, the rest weighted toward YOU's half
  avalanche(t0, t1) {
    const f = this.f, pl = f.player, pts = [{ x: clamp(pl.x, -10.4, 10.4), z: clamp(pl.z, -6.4, 6.4) }];
    for (let tries = 0; pts.length < 8 && tries < 200; tries++) {
      const x = clamp(pl.x + (Math.random() - 0.5) * 12, -10.4, 10.0), z = (Math.random() - 0.5) * 12.8;
      if (pts.some((q) => Math.hypot(q.x - x, q.z - z) < 1.5 + 2.0)) continue;
      pts.push({ x, z });
    }
    this.snd.stretch(t0, t1, 0.9);
    const dur = t1 - t0;
    for (const p of pts) {
      M.circle(f, { at: p, start: t0, end: t1, w: 1.0, kind: 'white', silent: p !== pts[0], sound: p === pts[0],
        onImpact: () => { f.fx.chips(p.x, 0.4, p.z, new THREE.Color(2.2, 1.0, 0.4), 8); f.fx.emit(10, { x: p.x, y: 0.4, z: p.z, color: new THREE.Color(1.6, 0.6, 2.2), shape: 4, speed: 3, life: 1, size: 0.1, gravity: 8, up: 1 }); } });
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.42), new THREE.MeshPhysicalMaterial({ color: [0xff6a13, 0x2a0a20, 0xc87a8e, 0x4a1a6a][Math.floor(Math.random() * 4)], roughness: 0.35, clearcoat: 0.4 }));
      box.castShadow = true;
      const sx = 10.6, sy = 1 + Math.random() * 3.2, sz = clamp(p.z, -6.8, 6.8);
      this.keep(box, t1 + 0.02, { tick: (t) => { const k = step(t, t0 + dur * 0.35, t1); box.visible = t > t0 + dur * 0.35; box.position.set(sx + (p.x - sx) * k, sy + (0.18 - sy) * k + 3 * k * (1 - k), sz + (p.z - sz) * k); box.rotation.set(k * 4, k * 3, 0); } });
    }
  },

  // ------------------------------------------------------------------------------------------ the tag, the till
  heroPackage(t0, t1) { this.hero && this.hero.drop(t0, t1); },
  heroLit() { this.hero && (this.hero.lit = this.f.t); },
  // a receipt shoots across the floor at YOU, unrolling as it goes; then it's paper lying there
  receipt(t0, t1, last) {
    const f = this.f, from = this.register.printerAt;
    const a = toward(from, f.player), len = 22;
    M.area(f, { shape: 'rect', x: from.x, z: from.z, angle: a, w: 0.45, h: len, kind: 'white', start: t0, end: t1 });
    const strip = decal(new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1), new THREE.MeshStandardMaterial({ color: 0xf2eee4, roughness: 0.6, emissive: 0xfff4ea, emissiveIntensity: 0.12 })));
    strip.geometry.translate(0, 0.5, 0); strip.geometry.rotateX(-Math.PI / 2);
    strip.rotation.y = a + Math.PI; strip.position.set(from.x, 0.011 + (last ? 0.002 : 0), from.z);
    if (last) this.footer.place(from, a, Math.hypot(f.player.x - from.x, f.player.z - from.z));
    this.keep(strip, 230, { tick: (t) => { const k = step(t, t1 - 0.25, t1); strip.scale.set(1, 1, Math.max(0.01, len * k)); }, tag: 'receipt' });
  },
  // the hellmouth: the floor round her cracks, red inside, for eight beats; then it erupts
  hellmouth(b, erupt) {
    const f = this.f;
    if (erupt) { f.fx.sparks(b.x, 0.4, b.z, RED, 50); f.fx.chips(b.x, 0.3, b.z, new THREE.Color(0.3, 0.05, 0.04), 40); f.fx.flash(new THREE.Color(0.4, 0.035, 0.02), 1); this.snd.thoom(); return; }
    const m = decal(new THREE.Mesh(new THREE.CircleGeometry(3.5, 64), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uK: { value: 0 }, uT: { value: 0 } },
      vertexShader: 'varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float uK, uT; varying vec2 vU;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){ float r = length(vU) / 3.5; float a = atan(vU.y, vU.x);
          float cr = 0.0; for (int i = 0; i < 9; i++) { float ai = float(i) * 0.698 + h(vec2(float(i), 1.0)) * 0.5; float d = abs(sin((a - ai) * 0.5)) * length(vU); float wig = sin(r * 23.0 + float(i)) * 0.04; cr = max(cr, smoothstep(0.05, 0.0, d + wig) * step(r, uK)); }
          float pulse = 0.6 + 0.4 * sin(uT * 18.85);
          vec3 c = vec3(3.0, 0.25, 0.15) * cr * pulse;
          gl_FragColor = vec4(c, cr); }` })));
    m.rotation.x = -Math.PI / 2; m.position.set(b.x, 0.017, b.z);
    const t0 = f.t;
    this.keep(m, 204.4, { tick: (t) => { m.material.uniforms.uK.value = 0.15 + 0.85 * step(t, t0, 203.99); m.material.uniforms.uT.value = t; } });
  },
};

function segDist(px, pz, A, B) {
  const vx = B.x - A.x, vz = B.z - A.z, l2 = vx * vx + vz * vz || 1e-6;
  const k = clamp(((px - A.x) * vx + (pz - A.z) * vz) / l2, 0, 1);
  return Math.hypot(px - (A.x + vx * k), pz - (A.z + vz * k));
}
