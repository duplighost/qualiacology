// THE RULE (design §1): "Don't hit her while she's pretty. Knock her evidence onto the bench, and when the gavel
// falls, she's yours."  PRETTY reflects. Her crimes leave EXHIBITS on the floor; strike one (or pass a ring
// through it) and it arcs in gold onto the GUILTY pan, landing on the next downbeat at least 0.6 s away, and the
// gavel falls with it: GUILTY for two bars (stagger, open, lipstick), then the gloss sweeps back.
import * as THREE from 'three';
import { FEEL, MOVES } from '../../game/player.js';

const TAU = Math.PI * 2;
const GOLD = new THREE.Color(3.2, 2.0, 0.55), PINKG = new THREE.Color(3.0, 1.2, 1.9);
// the post-choruses: delivered evidence waits on the pan for the shouted word
export const WAITS = [{ from: 49.985, word: 55.018, until: 58.115 }, { from: 99.531, word: 104.563, until: 107.645 }];
export const PAN = new THREE.Vector3(4.0, 3.25, -7.8);   // the GUILTY pan of Lady Justice's scales

// ------------------------------------------------------------------------------------------ exhibit meshes
const EXM = {};
function exMats() {
  if (EXM.gold) return EXM;
  EXM.gold = new THREE.MeshPhysicalMaterial({ color: 0xd8a443, metalness: 1, roughness: 0.25, emissive: new THREE.Color(0xffb040), emissiveIntensity: 0.25 });
  EXM.chrome = new THREE.MeshPhysicalMaterial({ color: 0xf0f2f6, metalness: 1, roughness: 0.08 });
  EXM.pearl = new THREE.MeshPhysicalMaterial({ color: 0xffd8e6, roughness: 0.22, clearcoat: 1, iridescence: 1 });
  EXM.paper = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.7, emissive: new THREE.Color(0xffd890), emissiveIntensity: 0.12 });
  EXM.bag = new THREE.MeshPhysicalMaterial({ color: 0xe8eef2, roughness: 0.12, transparent: true, opacity: 0.7, clearcoat: 1 });
  EXM.hoodie = new THREE.MeshStandardMaterial({ color: 0x7a2a3a, roughness: 0.9 });
  EXM.glass = new THREE.MeshPhysicalMaterial({ color: 0xff1a3a, roughness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1, emissive: new THREE.Color(0xff1030), emissiveIntensity: 0.6 });
  EXM.leather = new THREE.MeshPhysicalMaterial({ color: 0x5a3622, roughness: 0.32, clearcoat: 0.8 });
  EXM.mirror = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02 });
  EXM.photo = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  return EXM;
}
const mk = (g, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; return o; };
export function exhibitMesh(kind) {
  const m = exMats(), g = new THREE.Group();
  if (kind === 'knife') {                       // sticks upright in the marble, quivering
    g.add(mk(new THREE.BoxGeometry(0.035, 0.2, 0.006), m.chrome, 0, 0.1, 0));
    g.add(mk(new THREE.CapsuleGeometry(0.022, 0.15, 4, 10), m.pearl, 0, 0.3, 0));
  } else if (kind === 'zippo') {
    g.add(mk(new THREE.BoxGeometry(0.11, 0.15, 0.05), m.gold, 0, 0.075, 0, 0, 0.4, 0));
    g.add(mk(new THREE.BoxGeometry(0.11, 0.05, 0.05), m.gold, -0.02, 0.17, 0.02, 0, 0.4, -0.5));
  } else if (kind === 'key') {                  // the giant key, stuck in the floor at an angle
    const k = new THREE.Group(); k.rotation.z = 0.35; g.add(k);
    k.add(mk(new THREE.CylinderGeometry(0.045, 0.045, 1.0, 12), m.gold, 0, 0.5, 0));
    k.add(mk(new THREE.TorusGeometry(0.2, 0.05, 10, 30), m.gold, 0, 1.18, 0));
    k.add(mk(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 14), m.gold, 0, 0.92, 0));
  } else if (kind === 'hoodie') {               // your hoodie, bagged
    g.add(mk(new THREE.BoxGeometry(0.55, 0.18, 0.42), m.hoodie, 0, 0.09, 0));
    g.add(mk(new THREE.BoxGeometry(0.6, 0.24, 0.48), m.bag, 0, 0.12, 0));
  } else if (kind === 'heart') {                // a big red glass heart cracked in two
    const s = new THREE.Shape(); s.moveTo(0, -0.28); s.bezierCurveTo(0.4, 0.02, 0.28, 0.32, 0, 0.16); s.bezierCurveTo(-0.28, 0.32, -0.4, 0.02, 0, -0.28);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 });
    const a = mk(geo, m.glass, -0.04, 0.32, 0, 0, 0, 0.12), b = mk(geo, m.glass, 0.05, 0.3, 0.01, 0, 0, -0.1);
    a.scale.set(0.5, 1, 1); b.scale.set(0.5, 1, 1); a.position.x = -0.07; b.position.x = 0.07; g.add(a, b);
    g.userData.beat = true;
  } else if (kind === 'jacket') {               // your jacket, gold because it's yours
    g.add(mk(new THREE.BoxGeometry(0.7, 0.08, 0.5), m.leather, 0, 0.04, 0, 0, 0.3, 0));
    g.add(mk(new THREE.BoxGeometry(0.18, 0.06, 0.4), m.leather, 0.42, 0.03, 0.12, 0, -0.4, 0));
  } else if (kind === 'page') {                 // a scrap of the front page with her photo
    g.add(mk(new THREE.BoxGeometry(0.5, 0.01, 0.36), m.paper, 0, 0.02, 0, 0.1, 0.5, 0.05));
  } else if (kind === 'mugshot') {              // a polaroid
    g.add(mk(new THREE.BoxGeometry(0.3, 0.012, 0.36), m.photo, 0, 0.02, 0, 0.12, 0.3, 0));
  } else if (kind === 'shard') {                // a big mirror shard
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.3, 0.05); s.lineTo(0.12, 0.85); s.closePath();
    g.add(mk(new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false }), m.mirror, -0.12, 0, 0, 0, 0.6, 0.15));
  } else {
    g.add(mk(new THREE.BoxGeometry(0.2, 0.2, 0.2), m.gold, 0, 0.1, 0));
  }
  return g;
}

// the soft gold pool under an exhibit (additive, on the floor; not mirrored)
export const POOL_GEO = new THREE.CircleGeometry(1, 48);
export function poolMaterial() {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uA: { value: 1 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uA, uT; varying vec2 vU; void main(){ float d = length(vU);
      float a = (exp(-d * d * 3.2) * 0.42 + smoothstep(0.82, 0.9, d) * (1.0 - smoothstep(0.92, 1.0, d)) * (0.5 + 0.2 * sin(uT * 5.0))) * uA;
      gl_FragColor = vec4(vec3(1.0, 0.68, 0.22) * a * 1.6, a); }` });
}

// ------------------------------------------------------------------------------------------ the court
export class Court {
  // f: the fight; o: { justice, sounds, boss (later) }
  constructor(f, o = {}) {
    this.f = f; this.justice = o.justice || null; this.snd = o.sounds || null;
    this.boss = null;
    this.state = 'pretty';
    this.gavelT = -99; this.until = -99; this.staggerUntil = -99; this.lipFrom = -99; this.lipBeats = 2; this.lipOn = false;
    this.smeared = false; this.windowEnd = -99; this.verdictHitUntil = -99; this.scripted = false; this.noLip = false;
    this.pending = [];      // verdicts scheduled (gavel strikes): {t, why}
    this.floor = []; this.flying = []; this.pan = []; this.waiting = [];
    this.zones = [];        // her telegraphs on the floor (they fizzle in a stagger)
    this.stats = { verdicts: 0, delivered: 0, deflects: 0, smears: 0 };
    this._deflectBar = -1; this._deflectN = 0; this._counterArmed = false; this._lastTink = -9;
    this.group = new THREE.Group(); this.group.name = 'ppg:exhibits'; f.scene.add(this.group);
    this.onVerdict = null; this.onPretty = null; this.onExhibit = null;
    this._glass();
    // the mirror flash where a strike glances off her: a four-point glint
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 20); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,235,245,0.55)'); rg.addColorStop(1, 'rgba(255,220,235,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.moveTo(32, 0); g.lineTo(34, 30); g.lineTo(64, 32); g.lineTo(34, 34); g.lineTo(32, 64); g.lineTo(30, 34); g.lineTo(0, 32); g.lineTo(30, 30); g.closePath(); g.fill();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    this.glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(2.2, 2.0, 2.1), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    this.glint.visible = false; this.glint.renderOrder = 9; this.group.add(this.glint);
  }
  get pretty() { return this.state === 'pretty'; }
  get stagger() { return this.state === 'guilty' && this.f.t < this.staggerUntil; }
  bm() { return this.f.bm; }
  beatsFrom(t, n) { const bm = this.f.bm; return bm.timeOf(bm.beatAt(t) + n); }
  nextDownbeat(t) { const bm = this.f.bm; const B = bm.beatAt(t) - bm.downbeat; return bm.timeOf(bm.downbeat + Math.ceil(B / 4 - 1e-6) * 4); }

  // ---------------------------------------------------------------- hits on her
  // a counter: the strike that spent the near miss's counter. YOU's strike takes it as it lands (player.js _strikeHit:
  // counterT goes to exactly 0, and the hit comes in heavy whatever the move was).
  isCounter(info) {
    const pl = this.f.player, def = MOVES[info.move];
    // a move that isn't heavy by itself came in heavy: only a counter does that
    if (info.heavy && def && !def.heavy && !def.finisher && !def.riposte) return true;
    // a heavy move (the lunge out of a dash, the slam): the counter was armed when I last looked, with more than this
    // frame left on it, and now it's spent
    return pl.counterT === 0 && (this._counterLeft || 0) - (this.f.dt || 0) > 1e-4;
  }
  deflect(info) {
    const f = this.f, b = this.boss, pl = f.player, t = f.t;
    this.stats.deflects++;
    // the mirror flash where it touched, the glass tink, a push back on YOU (strikes only). The fight's own deflect
    // (the boss emits it) adds the thud, the sparks, the hitstop and takes the combo: this is only the mirror.
    const ax = info.x ?? pl.x, az = info.z ?? pl.z;
    const dx = ax - b.x, dz = az - b.z, d = Math.hypot(dx, dz) || 1;
    const cx = b.x + dx / d * 0.55, cz = b.z + dz / d * 0.55;
    f.fx.glitter(cx, 1.4, cz, PINKG, 5, 0.25);
    this.mirrorFlash = 1; this.mirrorAt = new THREE.Vector3(cx, 1.4, cz);
    // the first glance in a bar rings clear; mashing on rings quieter (the fight's thud already says it every time)
    const bar0 = Math.floor((f.bm.beatAt(t) - f.bm.downbeat) / 4), again = bar0 === this._deflectBar && this._deflectN > 0;
    if (t - this._lastTink > 0.06) { this._lastTink = t; this.snd && this.snd.play('tink', { pan: f.pan(cx), gain: again ? 0.3 : 0.55 }); }
    if (info.kind === 'strike') {
      const nx = pl.x + (pl.x - b.x) / Math.max(0.01, Math.hypot(pl.x - b.x, pl.z - b.z)) * 0.6, nz = pl.z + (pl.z - b.z) / Math.max(0.01, Math.hypot(pl.x - b.x, pl.z - b.z)) * 0.6;
      const r = f.arena.resolve(nx, nz, FEEL.radius); pl.x = r.x; pl.z = r.z; pl.vx *= 0.2; pl.vz *= 0.2;
    }
    // she preens (chin up); on the second deflect in a bar she nods: she takes it as a compliment
    this.preen = 1;
    const bar = Math.floor((f.bm.beatAt(t) - f.bm.downbeat) / 4);
    if (bar !== this._deflectBar) { this._deflectBar = bar; this._deflectN = 0; }
    if (++this._deflectN === 2 && !b.busy && b.rig) b.rig.upperOnce('Yes', { duration: 0.7, fade: 0.1 });
  }
  // a hit that lands: the verdict hit (x1.5), the smeared lipstick (+1 bar, once per window)
  hitTaken(info) {
    const t = this.f.t;
    if (this.state === 'guilty' && info.kind === 'strike') {
      if (t <= this.verdictHitUntil) { info = { ...info, dmg: info.dmg * 1.5, heavy: true }; this.verdictHitUntil = -99; this.f.fx.glitter(this.boss.x, 1.6, this.boss.z, GOLD, 20, 0.6); }
      if (this.lipOn && info.onBeat && !this.smeared && !this.noLip) this._smear();
    }
    return info;
  }

  // ---------------------------------------------------------------- verdicts
  // schedule the gavel at song time t (Lady Justice raises it over the beat before). opts: { until, lipFrom,
  // stagger (beats), noLip, raise (time the arm starts up), why }
  verdict(t, opts = {}) {
    if (this.pending.some((p) => Math.abs(p.t - t) < 0.05)) return;
    const p = { t, ...opts }; this.pending.push(p);
    this.justice && this.justice.gavel(t, opts.raise, opts.peak);
    this.f.at(t, () => this._gavel(p));
  }
  _gavel(p) {
    const f = this.f, b = this.boss, t = f.t;
    this.pending = this.pending.filter((x) => x !== p);
    if (p.canceled) return;
    // the same crack every time (it's the tell); p.gain only where the song is nearly silent (the cold open)
    const g = p.gain ?? 1;
    this.snd && this.snd.play('gavel', { pan: f.pan(-2.4), gain: g });
    this.justice && this.justice.strike(t);
    // already guilty: the case grows instead (+1 bar, up to 3 bars in one window)
    if (this.state === 'guilty' && !p.scripted && t < this.until) { this._extend(4); this.stats.verdicts++; return; }
    const bm = f.bm;
    this.stats.verdicts++;
    this.state = 'guilty'; this.gavelT = t; this.scripted = !!p.scripted; this.noLip = !!p.noLip;
    this.lipBeats = (b && b.broken >= 3) ? 3 : 2;
    this.until = p.until ?? this.beatsFrom(t, 8 + (this.lipBeats - 2));
    this.windowEnd = p.until ?? this.beatsFrom(t, 12 + (this.lipBeats - 2));
    this.staggerUntil = p.stagger === 0 ? t : this.beatsFrom(t, p.stagger ?? 2);
    this.lipFrom = p.lipFrom ?? this.beatsFrom(this.until, -this.lipBeats);
    this.smeared = false; this.lipOn = false;
    this.verdictHitUntil = t + 0.25;
    // her telegraphs fizzle; she staggers
    if (this.staggerUntil > t) this.fizzle();
    if (b) {
      b.stop();
      if (this.staggerUntil > t && b.state !== 'desperate') b.perform('Hit_Knockback', { duration: Math.max(0.5, this.staggerUntil - t), fade: 0.06 });
      b.gloss && b.gloss.set(0, 40);
      b.fig && this.onFace && this.onFace('scandalized');
      f.fx.glitter(b.x, 1.7, b.z, PINKG, 34, 1.0);
      f.fx.glitter(b.x, 1.2, b.z, GOLD, 16, 0.8);
      this.snd && this.snd.play('crunch', { pan: f.pan(b.x), gain: 0.8 * g });
    }
    this.glass(false);
    this.onVerdict && this.onVerdict(t, p);
  }
  _extend(beats) {
    const f = this.f;
    if (this.state !== 'guilty') return;
    const cap = this.beatsFrom(this.gavelT, 12 + (this.lipBeats - 2));
    const nu = Math.min(cap, this.beatsFrom(this.until, beats));
    if (nu <= this.until + 0.01) return;
    this.until = nu; this.lipFrom = this.beatsFrom(nu, -this.lipBeats); this.lipOn = false;
    this.snd && this.snd.play('clunk', { pan: f.pan(PAN.x), gain: 0.7 });
    this.justice && this.justice.jolt();
  }
  _smear() {
    const f = this.f, b = this.boss;
    this.smeared = true; this.stats.smears++;
    this.until = this.beatsFrom(this.until, 4); this.lipFrom = this.beatsFrom(this.until, -this.lipBeats); this.lipOn = false;
    b && b.show && b.show('lipstick', false);
    b && b.stop();
    b && b.perform('Hit_Head', { duration: 0.45, fade: 0.05 });
    f.fx.sparks(b.x, 1.75, b.z, new THREE.Color(3.4, 0.3, 0.4), 16);
    this.onFace && this.onFace('scandalized');
    this.snd && this.snd.play('smear', { pan: f.pan(b.x), gain: 0.8 });
  }
  _pretty() {
    const f = this.f, b = this.boss;
    this.state = 'pretty'; this.lipOn = false; this.scripted = false;
    if (b) {
      b.gloss && b.gloss.set(1, 12);
      b.show && (b.show('lipstick', false), b.show('compact', false));
      this.onFace && this.onFace('smug');
      f.fx.glitter(b.x, 1.6, b.z, new THREE.Color(2.6, 2.4, 2.8), 14, 0.6);
    }
    this.snd && this.snd.play('shing', { pan: f.pan(b ? b.x : 0), gain: 0.7 });
    this.justice && this.justice.settle();
    this.glass(true);
    this.onPretty && this.onPretty(f.t);
  }
  // her death scene: nothing more is scheduled (death.js has the gavel), and the scales wait for the last word
  adjourn() {
    for (const p of this.pending) p.canceled = true;
    this.pending = []; this.noLip = true; this.lipOn = false;
    if (this.state === 'guilty') { this.state = 'pretty'; this.until = -99; }
  }
  // the last hit: GUILTY, for good
  close() { this.state = 'guilty'; this.until = Infinity; this.noLip = true; this.lipOn = false; this.glass(false); }
  // her telegraphs on the floor fizzle out (a verdict pauses her, not the court)
  fizzle() {
    for (const z of this.zones) { if (z.owner === 'court' || z.dead) continue; z.dead = true; if (z.g) z.g.dead = true; this.f.fx.sparks(z.sh.x, 0.1, z.sh.z, new THREE.Color(1.2, 1.2, 1.4), 4); }
    this.zones = this.zones.filter((z) => !z.dead);
  }

  // ---------------------------------------------------------------- exhibits
  // her crime leaves evidence at (x, z), at song time t (now by default)
  exhibit(kind, x, z, o = {}) {
    const f = this.f, t = o.t ?? f.t;
    const b = f.bounds; x = THREE.MathUtils.clamp(x, b.minX + 0.6, b.maxX - 0.6); z = THREE.MathUtils.clamp(z, b.minZ + 0.6, b.maxZ - 0.6);
    while (this.floor.length >= 2) this._retire(this.floor[0], true);
    const mesh = exhibitMesh(kind); mesh.position.set(x, 0, z); mesh.rotation.y = o.rot ?? (Math.random() * TAU);
    const pool = new THREE.Mesh(POOL_GEO, poolMaterial()); pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.035, z); pool.scale.setScalar(o.r ?? 0.85); pool.renderOrder = 3;
    if (f.arenaLayer !== undefined) pool.layers.set(f.arenaLayer);
    this.group.add(mesh, pool);
    const e = { kind, x, z, born: t - (o.age || 0), life: this.f.beat * 32, mesh, pool, r: o.r ?? 0.85, h: o.h ?? 0.4, quiver: kind === 'knife' || kind === 'key' ? 1 : 0 };
    this.floor.push(e);
    if (!o.silent) { this.snd && this.snd.play('chime', { pan: f.pan(x), gain: 0.55 }); f.fx.glitter(x, 0.5, z, GOLD, 10, 0.5); }
    this.onExhibit && this.onExhibit(e);
    return e;
  }
  _retire(e, fast) { e.sinking = fast ? 0.25 : 0.6; e.sinkT = 0; this.floor = this.floor.filter((x) => x !== e); this._sinking = (this._sinking || []).concat([e]); }
  _dispose(e) { this.group.remove(e.mesh, e.pool); e.pool.material.dispose(); }

  // struck (or a ring went through it): it arcs in gold onto the pan
  strikeExhibit(e) {
    const f = this.f, t = f.t;
    if (!this.floor.includes(e)) return;
    this.floor = this.floor.filter((x) => x !== e);
    this.stats.delivered++;
    const D = this.nextDownbeat(t + 0.6);
    const fl = { e, t0: t, t1: D, from: e.mesh.position.clone().setY(0.4), to: PAN.clone().add(new THREE.Vector3((this.pan.length % 3 - 1) * 0.18, 0.12 + Math.floor(this.pan.length / 3) * 0.07, 0)) };
    this.flying.push(fl);
    this.group.remove(e.pool);
    f.fx.sparks(e.x, 0.5, e.z, GOLD, 18); f.fx.glitter(e.x, 0.6, e.z, GOLD, 14, 0.5);
    f.cam.shake(0.25, 0.1);
    this.snd && this.snd.play('thwack', { pan: f.pan(e.x), gain: 0.8 });
    this.snd && this.snd.play('whoosh', { pan: f.pan(e.x), gain: 0.4 });
    f._good && f._good(80);
    // the gavel on that downbeat, unless the court waits for the word
    const w = WAITS.find((W) => D >= W.from - 1e-3 && D < W.word);
    if (w) { fl.wait = w; this.justice && this.justice.tremble(w.word); }
    else this.verdict(D, { why: e.kind });
  }
  // a strike's arc (from the arena): hit any exhibit inside it
  strikeArc(x, z, ang, range, arc) {
    let hit = false;
    for (const e of [...this.floor]) {
      const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz);
      if (d > range + e.r * 0.6) continue;
      const da = Math.atan2(Math.sin(Math.atan2(dx, dz) - ang), Math.cos(Math.atan2(dx, dz) - ang));
      if (Math.abs(da) > arc && d > 0.9) continue;
      this.strikeExhibit(e); hit = true;
    }
    return hit;
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const f = this.f, t = f.t, b = this.boss, bm = f.bm;
    // thrown rings through an exhibit
    for (const r of f.player.rings) {
      if (r.state === 'hand') continue;
      for (const e of [...this.floor]) if (Math.hypot(r.pos.x - e.x, r.pos.z - e.z) < 0.75 + e.r * 0.3) this.strikeExhibit(e);
    }
    // exhibits on the floor: quiver, breathe, beat; the last bar dims and sinks
    for (const e of [...this.floor]) {
      const age = t - e.born;
      e.pool.material.uniforms.uT.value = t;
      if (e.quiver > 0) { e.quiver = Math.max(0, 1 - age / 1.2); e.mesh.rotation.z = Math.sin(age * 55) * 0.08 * e.quiver; }
      if (e.mesh.userData.beat) { const p = bm.pulse(t, 8); e.mesh.scale.setScalar(1 + 0.08 * p); }
      const left = e.life - age, last = f.beat * 4;
      const k = THREE.MathUtils.clamp(left / last, 0, 1);
      e.pool.material.uniforms.uA.value = 0.35 + 0.65 * k;
      e.mesh.position.y = -(1 - k) * e.h * 0.8;
      if (left <= 0) { this._retire(e, false); }
    }
    for (const e of [...(this._sinking || [])]) {
      e.sinkT += dt; const k = Math.min(1, e.sinkT / e.sinking);
      e.mesh.position.y -= dt * 1.2; e.pool.material.uniforms.uA.value *= 0.9;
      if (k >= 1) { this._dispose(e); this._sinking = this._sinking.filter((x) => x !== e); }
    }
    // evidence in flight to the pan, in gold
    for (const fl of [...this.flying]) {
      const k = THREE.MathUtils.clamp((t - fl.t0) / Math.max(0.05, fl.t1 - fl.t0), 0, 1);
      const p = fl.from.clone().lerp(fl.to, k); p.y += Math.sin(k * Math.PI) * 3.2;
      fl.e.mesh.position.copy(p); fl.e.mesh.rotation.y += dt * 9; fl.e.mesh.scale.setScalar(1 - 0.55 * k);
      if (Math.random() < 0.5) f.fx.glitter(p.x, p.y, p.z, GOLD, 1, 0.1);
      if (k >= 1) {
        this.flying = this.flying.filter((x) => x !== fl);
        this.group.remove(fl.e.mesh);
        this.pan.push(fl.e.kind);
        this.justice && this.justice.panAdd(fl.e.kind, fl.e.mesh);
        this.snd && this.snd.play('clunk', { pan: f.pan(PAN.x), gain: 0.75 });
        if (fl.wait) this.waiting.push(fl.e.kind);
      }
    }
    // the shouted word: everything waiting comes down with the gavel
    for (const w of WAITS) {
      if (this.waiting.length && t >= w.word - 0.001 && t < w.word + 0.2 && !this.pending.some((p) => Math.abs(p.t - w.word) < 0.05) && this._wordDone !== w.word) {
        this._wordDone = w.word;
        this.waiting = [];
        this.verdict(w.word, { until: w.until, why: 'word', raise: w.word - 0.2 });
      }
    }
    // the window: lipstick, then pretty
    if (this.state === 'guilty') {
      if (!this.noLip && !this.lipOn && t >= this.lipFrom && t < this.until) this._lipstick();
      if (t >= this.until) this._pretty();
    }
    // counter bookkeeping (for isCounter): how long YOU's counter has left, as of the end of this frame
    this._counterLeft = f.player.counterT;
    this.mirrorFlash = Math.max(0, (this.mirrorFlash || 0) - dt * 7);
    this.glint.visible = this.mirrorFlash > 0.01 && !!this.mirrorAt;
    if (this.glint.visible) { const k = this.mirrorFlash; this.glint.position.copy(this.mirrorAt); this.glint.scale.setScalar(0.5 + 0.7 * Math.sqrt(1 - k) * k + 0.35 * k); this.glint.material.opacity = k; this.glint.material.rotation = (1 - k) * 0.5; }
    this.preen = Math.max(0, (this.preen || 0) - dt * 5);
    this._glassUpdate();
  }
  _lipstick() {
    const f = this.f, b = this.boss;
    this.lipOn = true;
    if (!b || b.state === 'desperate') return;
    const dur = Math.max(0.3, this.until - f.t);
    b.stop();
    b.perform('Consume', { duration: dur, fade: 0.12, speed: 1.7 });
    b.show && b.show('lipstick', true);
    if (b.broken < 3) { b.show && b.show('compact', true); b.props && b.props.compact.userData.open(1); }
    this.onFace && this.onFace('pout');
    this.snd && this.snd.play('click', { pan: f.pan(b.x), gain: 0.5 });
  }

  // ---------------------------------------------------------------- the boss bar's pink glass cover
  _glass() {
    const bar = document.querySelector('#hud .mp-bar');
    if (!bar) return;
    if (!document.getElementById('ppg-style')) {
      const st = document.createElement('style'); st.id = 'ppg-style';
      st.textContent = `.ppg-glass{position:absolute;inset:-3px -4px;border-radius:4px;pointer-events:none;background:linear-gradient(180deg,rgba(255,170,210,.55),rgba(255,90,160,.22) 55%,rgba(255,200,230,.4));box-shadow:0 0 10px rgba(255,90,170,.55),inset 0 1px 0 rgba(255,255,255,.85);border:1px solid rgba(255,210,235,.9);transition:opacity .08s;opacity:1}
      .ppg-glass::after{content:'';position:absolute;left:4%;top:12%;width:30%;height:28%;border-radius:3px;background:linear-gradient(90deg,rgba(255,255,255,.75),rgba(255,255,255,0));}
      .ppg-glass.off{opacity:0}
      .ppg-shard{position:absolute;width:10px;height:7px;background:rgba(255,160,210,.85);pointer-events:none;clip-path:polygon(0 0,100% 30%,40% 100%);}`;
      document.head.appendChild(st);
    }
    if (getComputedStyle(bar).position === 'static') bar.style.position = 'relative';
    this.glassEl = document.createElement('div'); this.glassEl.className = 'ppg-glass'; bar.appendChild(this.glassEl);
  }
  glass(on) {
    if (!this.glassEl) return;
    const was = !this.glassEl.classList.contains('off');
    this.glassEl.classList.toggle('off', !on);
    if (was && !on) {       // it bursts off: a few shards fly
      const bar = this.glassEl.parentElement;
      for (let i = 0; i < 10; i++) {
        const s = document.createElement('i'); s.className = 'ppg-shard';
        s.style.left = (10 + Math.random() * 80) + '%'; s.style.top = '0px';
        bar.appendChild(s);
        const dx = (Math.random() - 0.5) * 160, dy = -20 - Math.random() * 50, r = (Math.random() - 0.5) * 720;
        s.animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: `translate(${dx}px,${dy + 70}px) rotate(${r}deg)`, opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.2,.7,.4,1)' });
        setTimeout(() => s.remove(), 700);
      }
    }
  }
  _glassUpdate() {}

  // ---------------------------------------------------------------- rewinds
  snapshot() {
    const t = this.f.t;
    return { state: this.state, gavelT: this.gavelT, until: this.until, staggerUntil: this.staggerUntil, lipFrom: this.lipFrom, lipBeats: this.lipBeats,
      smeared: this.smeared, windowEnd: this.windowEnd, scripted: this.scripted, noLip: this.noLip,
      floor: this.floor.map((e) => ({ kind: e.kind, x: e.x, z: e.z, age: t - e.born, rot: e.mesh.rotation.y, r: e.r })),
      pan: [...this.pan, ...this.flying.map((fl) => fl.e.kind)], waiting: [...this.waiting], stats: { ...this.stats } };
  }
  restore(s, t) {
    for (const e of [...this.floor, ...(this._sinking || [])]) this._dispose(e);
    for (const fl of this.flying) this.group.remove(fl.e.mesh);
    this.floor = []; this._sinking = []; this.flying = []; this.pending = []; this.zones = [];
    if (!s) s = { state: 'pretty', floor: [], pan: [], waiting: [] };
    this.state = s.state; this.gavelT = s.gavelT ?? -99; this.until = s.until ?? -99; this.staggerUntil = s.staggerUntil ?? -99; this.lipFrom = s.lipFrom ?? -99;
    this.lipBeats = s.lipBeats ?? 2; this.smeared = !!s.smeared; this.windowEnd = s.windowEnd ?? -99; this.scripted = !!s.scripted; this.noLip = !!s.noLip;
    this.lipOn = false; this.verdictHitUntil = -99; this._wordDone = null; this.mirrorFlash = 0; this.preen = 0;
    for (const e of s.floor || []) this.exhibit(e.kind, e.x, e.z, { t, age: e.age, rot: e.rot, r: e.r, silent: true });
    this.pan = [...(s.pan || [])]; this.waiting = [...(s.waiting || [])];
    if (s.stats) this.stats = { ...s.stats };
    this.justice && this.justice.restorePan(this.pan);
    const b = this.boss;
    if (b && b.gloss) b.gloss.snap(this.state === 'pretty' ? 1 : 0);
    this.glass(this.state === 'pretty');
  }
  dispose() {
    this.f.scene.remove(this.group);
    if (this.glassEl) this.glassEl.remove();
  }
}
