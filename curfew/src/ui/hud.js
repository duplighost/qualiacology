// CURFEW — the wordless HUD. Manifest #22, id 'hud'. Owner: progression.
//
// ALEX'S LAW, WHICH OUTRANKS EVERY OTHER CONSIDERATION IN THIS FILE:
// "Delete words from game UI. Show state through in-world visuals so the player feels it,
// rather than reads it." So: no ammo counter, no health bar, no XP number, no level, no
// objective, no minimap, no damage numbers, no compass, no prompt, no name of anything.
// tests/progression.mjs walks every text node in the document during play and fails on one
// visible glyph. That test is not an obstacle to work around; it is this file's spec.
//
// WHAT IS ALLOWED TO EXIST, AND WHY EACH ONE EARNED IT
//   * A crosshair that IS the weapon's live cone in pixels. A static crosshair over a growing
//     cone is a lie the player will feel and never be able to name.
//   * A hit marker whose SHAPE says normal / armoured / weak point / kill. Shape, not colour:
//     a marker read by hue is a marker half the room cannot read, and shape survives being
//     4 px across in the corner of the eye.
//   * Health as a vignette and a tremor. Never a bar. The tremor is on the VIGNETTE, never on
//     the camera — "never take the camera away" is the horror law and it has no exceptions,
//     including for feedback the player would probably enjoy.
//   * A brief arc for the direction damage came from. It fades in under a second.
//   * A ring pulse when a mote lands, so getting paid reaches the screen even when the mote
//     arrives from behind you — and two slower rings for a card taken, three for a level.
//     Those two were added after the second audit: a purchase used to acknowledge itself with
//     a chime and nothing else, so with the audio lane disabled — every headless run — buying
//     a node was completely silent AND completely invisible. Speed and COUNT tell the three
//     apart; no hue and no glyph is involved.
//   * ONE screen-reader line, class "sr-only", which no sighted player ever sees.
//   * A pause card that DOES list the controls, because reading costs nothing when the game
//     is stopped, and because a game nobody can find the crouch key in is not scarier.
//
// WHAT IS DELIBERATELY NOT HERE: ammo. DESIGN says ammo is "the magazine window and the last
// three tracers" — both of those live on the gun, and the gun is weapons/viewmodel.js. The
// only ammo fact this file states is a DRY one: the centre pip goes hollow when the magazine
// is empty. That is a shape, it is at the point the eye is already on, and it says the one
// thing the player must not learn by pulling a silent trigger.
//
// donor: cinderbloom src/ui/hud.js:1392-1394 `_conePx` — "Half-angle degrees -> pixels at the
//   frame's centre", tan(deg) * (vh/2) / tan(vfov/2). That single line is what makes the
//   crosshair honest, and CFG has no equivalent because it is geometry, not taste.
// donor: cinderbloom src/ui/hud.js:1417-1455 — the three-pass reticle (wide soft shade, tight
//   hard outline, then ink) and the blade length growing with the gap so four marks keep
//   reading as ONE object. Written after a capture where the crosshair was invisible on a
//   blown-out rock: "a one-pixel outline cannot solve this."
// donor: cinderbloom src/ui/hud.js:1574-1680 `_drawMarker` — the grow/hold/fade envelope, the
//   deflect marker pointing INWARD so it reads as wrong pre-attentively, the kill marker as a
//   rotating ring plus a cross rather than more ticks, and the weak-point chevron pair.
// donor: cinderbloom src/game/combat.js:1298-1312 `_marker` — MARK_RANK, so a plain hit
//   arriving 40 ms after a kill cannot overwrite the kill.

import { CFG } from '../config.js';
import { clamp, clamp01, DEG, TAU } from '../engine/math.js';

/* ---------------------------------------------------------------- constants -- */
// No CFG.hud block exists; config.js belongs to the engine owner and is deep-frozen. Every
// number here is named, reasoned, and requested for a home in docs/HANDOFF.md P-4.

const RET_MAX = 640;            // CSS px of the reticle canvas, square, centred
const DPR_CAP = 2;

const MARK_LIFE = { normal: 0.210, weak: 0.240, armoured: 0.240, kill: 0.320 };
const MARK_RANK = { normal: 0, weak: 2, armoured: 1, kill: 3 };   // combat.js:1303
const MARK_POOL = 6;

const ARC_LIFE = 0.90;          // damage direction
const ARC_POOL = 4;
const PULSE_LIFE = 0.30;        // a mote landed
const PULSE_POOL = 5;
// A NODE BOUGHT AND A LEVEL GAINED, and they are here for the reason the second audit found
// everywhere else: the only acknowledgement either of them had was a chime, and the chime is
// baked through the audio lane, which returns early with the AudioContext dead — every
// headless run, and any browser with autoplay hard-blocked. Buying a card is one of the four
// things Alex asked for by name and it must reach the screen without Web Audio.
// Still no words and no number: a slow ring is a different SHAPE from the mote's fast one,
// and the level ring is a slower, wider version of the same gesture, so the two read as the
// same family without either being labelled.
const GRANT_LIFE = 0.62;
const LEVEL_LIFE = 0.95;

// SOUND LEADS ANY READOUT BY 200 ms. The bed's hurt cue plays on the frame of the hit; the
// vignette does not move until this has elapsed, so the ear always gets there first and the
// eye confirms. A readout that arrives WITH its sound reads as a UI event; one that arrives
// after it reads as a consequence.
const READOUT_LEAD_S = 0.200;

const VIG_LAMBDA = 5.0;         // how fast the vignette follows the health band
const TREMOR_FROM_HP = 35;      // below this the frame starts to shake
const TREMOR_HZ = 8.5;
const TREMOR_PX = 2.6;          // at 0 hp. Never applied to the camera.

const SR_PERIOD_S = 2.0;        // the screen-reader line is rewritten at most this often

const INK = '#e8eef8';
const SHADE = 'rgba(4,6,9,0.72)';

const CONTROLS = [
  ['Move', 'W A S D'],
  ['Look', 'Mouse'],
  ['Fire', 'Left mouse'],
  ['Aim', 'Right mouse'],
  ['Melee', 'V or middle mouse'],
  ['Reload', 'R'],
  ['Sprint', 'Shift'],
  ['Crouch and slide', 'Ctrl or C'],
  ['Jump and mantle', 'Space'],
  ['Torch', 'F'],
  ['Pause', 'Esc'],
];

const CSS = `
/* NO BACKTICK MAY APPEAR IN THIS BLOCK. It is a template literal, and the CONTRACT's GLSL
   law is the same law here: one backtick in a comment closed the string and the module threw
   SyntaxError at import, taking the whole boot with it.
   Not "contain: strict": paint containment would clip the vignette's -3% overhang, which is
   the whole reason it overhangs. layout + style is all this subtree needs. */
#curfew-hud { position: fixed; inset: 0; z-index: 12; pointer-events: none;
              contain: layout style; }
#curfew-vig { position: absolute; inset: -3%; opacity: 0; will-change: opacity, transform;
              background: radial-gradient(ellipse at 50% 52%,
                rgba(0,0,0,0) 38%, rgba(6,3,3,0.55) 78%, rgba(9,2,2,0.92) 100%); }
#curfew-ret { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); }
#curfew-hud .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden;
              clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
#curfew-pause { position: fixed; inset: 0; z-index: 24; display: grid; place-items: center;
              background: rgba(5,7,10,0.86); pointer-events: auto;
              font: 400 14px/1.6 "Palatino Linotype", Palatino, Georgia, serif; color: #c9d4e6; }
#curfew-pause[hidden] { display: none !important; }
#curfew-pause .card { width: min(460px, 84vw); }
#curfew-pause dl { display: grid; grid-template-columns: 1fr auto; gap: 7px 26px; }
#curfew-pause dt { opacity: .52; letter-spacing: .12em; text-transform: uppercase;
              font-size: 11px; align-self: center; }
#curfew-pause dd { text-align: right; font-size: 13px; letter-spacing: .06em; opacity: .86; }
#curfew-pause .rule { height: 1px; background: #1b2431; margin: 0 0 18px; }
#curfew-pause .foot { margin-top: 22px; font-size: 11px; letter-spacing: .22em;
              text-transform: uppercase; opacity: .32; text-align: center; }
`;

/* -------------------------------------------------------------------- system -- */

export class Hud {
  static id = 'hud';

  constructor(ctx) {
    this.ctx = ctx;
    this.enabled = typeof document !== 'undefined';

    this.root = null; this.vig = null; this.canvas = null; this.g = null;
    this.srEl = null; this.pauseEl = null;

    this.R = RET_MAX; this.dpr = 1;
    this.vw = 1600; this.vh = 900;

    // --- live readout, one object, mutated, never replaced -----------------------
    this.cone = 2.0;        // live spread half-angle, degrees
    this.conePx = 0;
    this.adsT = 0;
    this.dry = false;
    this.inCar = false;
    this.hp = CFG.player.health.max;
    this.hpShown = CFG.player.health.max;   // lags hp by READOUT_LEAD_S
    this.hpLead = 0;
    this.vigA = 0;
    this.tremor = 0;
    this._trX = 0; this._trY = 0;   // last APPLIED tremor offset, so the string is rare

    // --- pools. Nothing in step() or present() allocates. ------------------------
    this.marks = new Array(MARK_POOL);
    for (let i = 0; i < MARK_POOL; i++) this.marks[i] = { live: false, kind: 'normal', t: 0, seq: 0 };
    this.markSeq = 0;
    this.arcs = new Array(ARC_POOL);
    for (let i = 0; i < ARC_POOL; i++) this.arcs[i] = { live: false, rel: 0, amt: 0, t: 0 };
    this.pulses = new Array(PULSE_POOL);
    for (let i = 0; i < PULSE_POOL; i++) {
      this.pulses[i] = { live: false, t: 0, streak: 0, kind: 'mote', life: PULSE_LIFE };
    }

    this.paused = false;
    this.pauseBuilt = false;

    this.srT = 0; this.srLast = '';
    this._dirty = true;
    this._lastConePx = -1;
    this._unsub = [];
    this._onResize = null;
    this._t = 0;
  }

  /* ------------------------------------------------------------------- init -- */

  async init() {
    if (!this.enabled) return;

    const style = document.createElement('style');
    style.id = 'curfew-hud-css';
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'curfew-hud';
    // aria-hidden on the painted layers: a canvas of ticks is noise to a screen reader, and
    // the one line that IS for it lives outside this subtree.
    root.setAttribute('aria-hidden', 'true');

    const vig = document.createElement('div');
    vig.id = 'curfew-vig';
    root.appendChild(vig);

    const canvas = document.createElement('canvas');
    canvas.id = 'curfew-ret';
    root.appendChild(canvas);

    document.body.appendChild(root);

    // The screen-reader line is a SIBLING of the aria-hidden layer, and carries the class
    // tests/progression.mjs skips (/sr-only|visually-hidden/). It is the one place in CURFEW
    // where words are allowed during play, because nobody sees them.
    const sr = document.createElement('div');
    sr.id = 'curfew-sr';
    sr.className = 'sr-only';
    sr.setAttribute('role', 'status');
    sr.setAttribute('aria-live', 'polite');
    sr.textContent = 'Outside. Night.';
    document.body.appendChild(sr);

    this.root = root; this.vig = vig; this.canvas = canvas; this.srEl = sr;
    // NOT `desynchronized`: this canvas is only repainted when something moved, and a
    // low-latency surface is allowed to present a frame that was never redrawn.
    this.g = canvas.getContext('2d', { alpha: true });

    this._buildPause();
    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    this._wire();
  }

  ready() { return !this.enabled || !!(this.canvas && this.g && this.root && this.pauseEl); }

  dispose() {
    for (const off of this._unsub) { try { off(); } catch (e) { void e; } }
    this._unsub.length = 0;
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    for (const el of [this.root, this.srEl, this.pauseEl, document.getElementById('curfew-hud-css')]) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
    this.root = this.vig = this.canvas = this.g = this.srEl = this.pauseEl = null;
  }

  resize() {
    if (!this.canvas) return;
    this.vw = window.innerWidth || 1600;
    this.vh = window.innerHeight || 900;
    this.dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    this.R = Math.round(Math.min(RET_MAX, this.vw * 0.86, this.vh * 0.86));
    this.canvas.style.width = this.R + 'px';
    this.canvas.style.height = this.R + 'px';
    this.canvas.width = Math.round(this.R * this.dpr);
    this.canvas.height = Math.round(this.R * this.dpr);
    // Work in CSS pixels inside the canvas; the backing store scale is set once, here.
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._dirty = true;
  }

  /* -------------------------------------------------------------------- bus -- */

  _wire() {
    const b = this.ctx.bus;
    const on = (k, fn) => this._unsub.push(b.on(k, (p) => {
      try { fn(p || {}); } catch (e) { console.error('[hud] ' + k, e); }
    }));

    on('weapon:hit', (p) => {
      // Only a HIT ON A THING. Without this every round into a tree pops a marker and the
      // marker stops meaning anything, which is worse than having none.
      if (!p.enemy) return;
      const kind = p.killed ? 'kill' : p.deflected ? 'armoured' : (p.zone === 'head' ? 'weak' : 'normal');
      this._mark(kind);
    });

    on('player:hurt', (p) => this._arc(p));

    on('xp:gained', (p) => {
      if (p.reason !== 'kill') return;   // a road metre does not deserve a flash
      this._pulse('mote', PULSE_LIFE);
    });

    // A card is now yours. progression/progress.js emits this for a purchase AND for an
    // auto-granted tier-0, and both deserve the same mark: the auto-grant is the moment the
    // tree teaches itself, and a lesson nobody can see is not a lesson.
    on('node:bought', () => this._pulse('node', GRANT_LIFE));
    on('level:up', () => this._pulse('level', LEVEL_LIFE));

    on('player:died', () => { this.hpLead = 0; this.hp = 0; this._dirty = true; });
    on('input:clickthrough', () => { if (this.paused) this.pause(false); });
  }

  /* ------------------------------------------------------------------ events -- */

  /** donor: cinderbloom combat.js:1300-1303 — a lesser marker never overwrites a live kill. */
  _mark(kind) {
    let slot = null, oldest = -1;
    for (let i = 0; i < MARK_POOL; i++) {
      const m = this.marks[i];
      if (!m.live) { slot = m; break; }
      if (m.t > oldest) { oldest = m.t; slot = m; }
    }
    // Rank guard: if a higher-ranked marker is still young, let it finish.
    for (let i = 0; i < MARK_POOL; i++) {
      const m = this.marks[i];
      if (m.live && m.t < 0.21 && MARK_RANK[m.kind] > MARK_RANK[kind]) return;
    }
    slot.live = true; slot.kind = kind; slot.t = 0; slot.seq = ++this.markSeq;
    this._dirty = true;
  }

  /**
   * The bearing the hit came FROM, relative to where you are looking.
   * `fromDir` is whatever enemies.js:1098 passed to player.hurt() — a THREE.Vector3 pointing
   * along the blow, i.e. away from the attacker. The source is therefore its negation. The
   * screen-right axis is derived from the aim vector rather than assumed:
   *   forward f = (fx, 0, fz); right = f x up = (-fz, 0, fx), which is +X for the default
   *   camera looking down -Z, so it really is screen right.
   * ASSUMPTION, flagged in HANDOFF P-1: the sign of `fromDir`. If an arc ever points at the
   * thing that hit you instead of away from it, negate `sx`/`sz` here and nothing else moves.
   */
  _arc(p) {
    const d = p.fromDir;
    if (!d || !Number.isFinite(d.x)) return;
    const cam = this.ctx.systems.get('camera');
    if (!cam) return;
    let fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);      // camera.js:149 aimDir, flat
    const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
    let sx = -d.x, sz = -d.z;
    const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
    const rel = Math.atan2(-sx * fz + sz * fx, sx * fx + sz * fz);

    let slot = null, oldest = -1;
    for (let i = 0; i < ARC_POOL; i++) {
      const a = this.arcs[i];
      if (!a.live) { slot = a; break; }
      if (a.t > oldest) { oldest = a.t; slot = a; }
    }
    slot.live = true; slot.rel = rel; slot.amt = clamp((p.amount || 10) / 30, 0.35, 1.6); slot.t = 0;
    this._dirty = true;
  }

  /**
   * One pool, three shapes. A grant must never be evicted by the mote storm a shotgun into a
   * pack throws, so a live 'node'/'level' ring is only ever recycled by another one of its
   * own kind — the same rank idea as MARK_RANK, one pool down.
   */
  _pulse(kind, life) {
    const k = kind || 'mote';
    const big = k !== 'mote';
    let slot = null, oldest = -1;
    for (let i = 0; i < PULSE_POOL; i++) {
      const q = this.pulses[i];
      if (!q.live) { slot = q; break; }
      if (!big && q.kind !== 'mote') continue;         // never steal a grant for a mote
      if (q.t > oldest) { oldest = q.t; slot = q; }
    }
    if (!slot) return;                                  // all five are grants: let them finish
    const prog = this.ctx.systems.get('progress');
    slot.live = true; slot.t = 0; slot.kind = k;
    slot.life = life || PULSE_LIFE;
    slot.streak = (!big && prog) ? prog.streak : 0;
    this._dirty = true;
  }

  /* ------------------------------------------------------------------- pause -- */

  _buildPause() {
    const card = document.createElement('div');
    card.id = 'curfew-pause';
    card.hidden = true;

    const wrap = document.createElement('div');
    wrap.className = 'card';
    const rule = document.createElement('div');
    rule.className = 'rule';
    wrap.appendChild(rule);

    const dl = document.createElement('dl');
    for (const [what, how] of CONTROLS) {
      const dt = document.createElement('dt'); dt.textContent = what;
      const dd = document.createElement('dd'); dd.textContent = how;
      dl.appendChild(dt); dl.appendChild(dd);
    }
    wrap.appendChild(dl);

    const foot = document.createElement('div');
    foot.className = 'foot';
    foot.textContent = 'click to go back out';
    wrap.appendChild(foot);

    card.appendChild(wrap);
    card.addEventListener('mousedown', (e) => { e.preventDefault(); this.pause(false); });
    document.body.appendChild(card);
    this.pauseEl = card;
    this.pauseBuilt = true;
  }

  /**
   * Shown ONLY on an explicit menu press (Esc), never on a lost pointer lock — a headless
   * page that never acquires lock would otherwise sit on a card full of words, and words on
   * screen during play is the one thing this file may not do.
   *
   * NOTE: this stops nothing. The loop is main.js's and this file may not touch it. The card
   * dims the world and takes the pointer; a request for the engine to gate simStep on
   * hud.isPaused() is filed in docs/HANDOFF.md P-1.
   */
  pause(on) {
    const v = !!on;
    if (v === this.paused) return;
    this.paused = v;
    if (this.pauseEl) this.pauseEl.hidden = !v;
    if (!v && this.ctx.input && this.ctx.input.requestLock) this.ctx.input.requestLock();
    this._dirty = true;
  }

  isPaused() { return this.paused; }

  /* -------------------------------------------------------------------- loop -- */

  step(dt) {
    this._t += dt;
    const inp = this.ctx.input;
    if (inp && inp.pressed && inp.pressed('menu')) this.pause(!this.paused);

    for (let i = 0; i < MARK_POOL; i++) {
      const m = this.marks[i];
      if (!m.live) continue;
      m.t += dt;
      if (m.t > (MARK_LIFE[m.kind] || 0.21)) m.live = false;
      this._dirty = true;
    }
    for (let i = 0; i < ARC_POOL; i++) {
      const a = this.arcs[i];
      if (!a.live) continue;
      a.t += dt;
      if (a.t > ARC_LIFE) a.live = false;
      this._dirty = true;
    }
    for (let i = 0; i < PULSE_POOL; i++) {
      const q = this.pulses[i];
      if (!q.live) continue;
      q.t += dt;
      if (q.t > (q.life || PULSE_LIFE)) q.live = false;
      this._dirty = true;
    }

    // Health: the ear first, the eye 200 ms later.
    const player = this.ctx.systems.get('player');
    if (player) {
      const hp = player.hp;
      // ONLY a drop arms the lead. controller.js:539 regenerates hp EVERY step, so arming on
      // any change at all would re-arm the 200 ms timer every frame and the vignette would
      // freeze at the value it had when the regen started and never open back up.
      if (hp < this.hp - 0.01) this.hpLead = READOUT_LEAD_S;
      this.hp = hp;
      if (this.hpLead > 0) this.hpLead -= dt;
      else this.hpShown += (this.hp - this.hpShown) * (1 - Math.exp(-VIG_LAMBDA * dt));
    }

    this.srT += dt;
  }

  present(alpha) {
    void alpha;
    if (!this.enabled || !this.g || !this.ctx.ready) return;

    this._readWeapon();
    this._paintVignette();
    this._speak();

    // Repaint only when something moved. A full 640 px clear every frame for a crosshair that
    // has not changed is the kind of cost that is invisible until it is 2 ms.
    if (!this._dirty && Math.abs(this.conePx - this._lastConePx) < 0.25) return;
    this._lastConePx = this.conePx;
    this._dirty = false;
    this._paintReticle();
  }

  /* ------------------------------------------------------------------ reads -- */

  _readWeapon() {
    const w = this.ctx.systems.get('weapons');
    const sh = this.ctx.shared;
    const car = !!(sh && sh.inCar);
    if (car !== this.inCar) { this.inCar = car; this._dirty = true; }
    if (!w) { this.conePx = 0; return; }
    this.cone = typeof w.spreadDeg === 'number' ? w.spreadDeg : this.cone;
    // ADS fades the crosshair out, so a change in it must repaint even at a steady cone.
    const ads = typeof w.adsT === 'number' ? w.adsT : 0;
    if (Math.abs(ads - this.adsT) > 0.004) { this.adsT = ads; this._dirty = true; }
    const dry = (w.ammo | 0) <= 0 && !w.reloading;
    if (dry !== this.dry) { this.dry = dry; this._dirty = true; }
    this.conePx = this._conePx(this.cone);
  }

  /** donor: cinderbloom src/ui/hud.js:1392-1394, verbatim geometry. */
  _conePx(deg) {
    const cam = this.ctx.camera;
    const vfov = ((cam && cam.fov) || CFG.render.fov) * DEG;
    return Math.tan(clamp(deg, 0, 25) * DEG) * (this.vh * 0.5) / Math.tan(vfov * 0.5);
  }

  /* --------------------------------------------------------------- vignette -- */

  _paintVignette() {
    if (!this.vig) return;
    const max = CFG.player.health.max;
    const frac = clamp01(this.hpShown / max);
    // Nothing at full health. The vignette is not a permanent frame decoration; it is a
    // thing that CLOSES, and it can only read as closing if it starts absent.
    const a = Math.pow(1 - frac, 1.7) * 0.95;
    if (Math.abs(a - this.vigA) > 0.002) {
      this.vigA = a;
      this.vig.style.opacity = a.toFixed(3);
    }

    const hp = this.hpShown;
    const tr = hp >= TREMOR_FROM_HP ? 0 : clamp01((TREMOR_FROM_HP - hp) / TREMOR_FROM_HP);
    if (tr <= 0 && this.tremor <= 0) return;
    this.tremor = tr;
    if (tr <= 0) {
      this.vig.style.transform = '';
      this._trX = this._trY = 0;
      return;
    }
    // THE TREMOR IS ON THE FRAME, NOT THE CAMERA. "Never take the camera away."
    const t = this._t;
    const dx = Math.sin(t * TAU * TREMOR_HZ) * TREMOR_PX * tr;
    const dy = Math.sin(t * TAU * TREMOR_HZ * 1.37 + 1.1) * TREMOR_PX * tr * 0.7;
    // A whole transform STRING built and assigned every frame, for a 2.6 px shake nobody can
    // resolve to a tenth of a pixel: sub-pixel writes are style recalcs the player cannot
    // see. Cache the last applied offset and only rewrite past a whole pixel — the tremor
    // reads identically and the string is built only on the frames it is used.
    if (Math.abs(dx - this._trX) < 1 && Math.abs(dy - this._trY) < 1) return;
    this._trX = dx; this._trY = dy;
    this.vig.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
  }

  /* ------------------------------------------------------------- the reticle -- */

  _paintReticle() {
    const g = this.g, R = this.R, c = R * 0.5;
    g.clearRect(0, 0, R, R);
    if (this.paused) return;

    const u = Math.max(1, R / 640);          // one design pixel at the reference size
    const ads = clamp01(this.adsT);

    /* ---- crosshair: the cone, in pixels ------------------------------------ */
    // Fades out into the sights, because a reticle over an aperture is two aiming marks and
    // two aiming marks is worse than one. In the car there is no gun to aim, so no crosshair.
    const ch = (1 - ads * ads) * (this.inCar ? 0 : 1);
    if (ch > 0.01) {
      const gap = Math.max(3.4 * u, this.conePx);
      // The blades grow with the gap so four marks keep reading as one object rather than as
      // four unrelated specks. cinderbloom hud.js:1423-1427.
      const len = (9.5 + 4.5 * clamp01(this.conePx / 46)) * u;
      const wIn = 2.6 * u, wOut = 1.2 * u;
      // Three passes. Over a torch-blown near wall a one-pixel outline does nothing; the
      // reticle has to carry its own local darkening. cinderbloom hud.js:1409-1416.
      for (let pass = 0; pass < 3; pass++) {
        const grow = pass === 0 ? 2.4 * u : pass === 1 ? 1.0 * u : 0;
        g.globalAlpha = ch * (pass === 0 ? 0.20 : pass === 1 ? 0.58 : 0.94);
        g.fillStyle = pass === 2 ? INK : SHADE;
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI * 0.5;
          const ca = Math.cos(a), sa = Math.sin(a);
          const r0 = gap - grow, r1 = gap + len + grow;
          const h0 = wIn * 0.5 + grow, h1 = wOut * 0.5 + grow;
          g.beginPath();
          g.moveTo(c + ca * r0 - sa * h0, c + sa * r0 + ca * h0);
          g.lineTo(c + ca * r0 + sa * h0, c + sa * r0 - ca * h0);
          g.lineTo(c + ca * r1 + sa * h1, c + sa * r1 - ca * h1);
          g.lineTo(c + ca * r1 - sa * h1, c + sa * r1 + ca * h1);
          g.closePath();
          g.fill();
        }
        // The centre pip never moves with the cone: at full bloom it is the only thing saying
        // where the barrel actually points. HOLLOW when the magazine is dry — the one ammo
        // fact this file states, and it is a shape, not a number.
        g.beginPath();
        if (this.dry) {
          g.arc(c, c, 2.6 * u + grow * 0.55, 0, TAU);
          g.arc(c, c, Math.max(0.4, 1.3 * u - grow * 0.2), 0, TAU, true);
        } else {
          g.arc(c, c, 1.6 * u + grow * 0.55, 0, TAU);
        }
        g.fill();
      }
      g.globalAlpha = 1;
    }

    /* ---- hit markers -------------------------------------------------------- */
    for (let i = 0; i < MARK_POOL; i++) if (this.marks[i].live) this._drawMark(g, c, this.marks[i], u);

    /* ---- a mote landed, a card taken, a level gained ------------------------- */
    // Three readings of one gesture, separated by SPEED and COUNT rather than by hue: the
    // mote is one fast thin ring, a card is two rings that open slowly behind each other, a
    // level is three, slower and wider still. Nothing is written, nothing is named, and every
    // one of them survives the audio lane being dead.
    for (let i = 0; i < PULSE_POOL; i++) {
      const q = this.pulses[i];
      if (!q.live) continue;
      const life = q.life || PULSE_LIFE;
      const t = clamp01(q.t / life);
      const rings = q.kind === 'level' ? 3 : q.kind === 'node' ? 2 : 1;
      // The grant eases OUT (fast then settling) so it reads as arriving rather than as an
      // expanding shockwave, which is what the mote's linear ring already is.
      const e = rings === 1 ? t : 1 - Math.pow(1 - t, 2.2);
      const base = rings === 1 ? 5 + 26 * t + q.streak * 1.1 : 7 + (rings === 3 ? 74 : 52) * e;
      g.strokeStyle = INK;
      for (let k = 0; k < rings; k++) {
        // Each ring lags the one before it by a fifth of the life, so they open in sequence.
        const lag = clamp01((t - k * 0.18) / Math.max(0.001, 1 - k * 0.18));
        if (lag <= 0) continue;
        const rr = (base * (1 - k * 0.24)) * u;
        if (rr <= 0.5) continue;
        g.globalAlpha = (1 - lag) * (rings === 1 ? 0.26 : 0.30);
        g.lineWidth = Math.max(0.8, (1.5 - lag) * u);
        g.beginPath(); g.arc(c, c, rr, 0, TAU); g.stroke();
      }
    }

    /* ---- damage direction --------------------------------------------------- */
    const dr = R * 0.30;
    for (let i = 0; i < ARC_POOL; i++) {
      const a = this.arcs[i];
      if (!a.live) continue;
      const t = clamp01(a.t / ARC_LIFE);
      // Full for the first fifth, then out. A directional cue that lingers becomes wallpaper.
      const al = (t < 0.2 ? 1 : 1 - (t - 0.2) / 0.8) * 0.78;
      const span = (0.22 + 0.14 * a.amt);
      const mid = a.rel - Math.PI * 0.5;      // canvas 0 rad is screen right; ahead is -90
      g.globalAlpha = al * 0.55;
      g.strokeStyle = SHADE;
      g.lineWidth = 7.5 * u;
      g.beginPath(); g.arc(c, c, dr, mid - span, mid + span); g.stroke();
      g.globalAlpha = al;
      g.strokeStyle = INK;
      g.lineWidth = 3.0 * u * a.amt;
      g.beginPath(); g.arc(c, c, dr, mid - span, mid + span); g.stroke();
    }

    g.globalAlpha = 1;
  }

  /**
   * FOUR TICKS, AND THE SHAPE IS THE MESSAGE.
   *   normal   four diagonal ticks pointing out
   *   weak     the same, plus two outer chevrons — a COUNT change, the most legible thing a
   *            small mark can do (cinderbloom hud.js:1661-1670)
   *   armoured the ticks point INWARD, so it reads as wrong before it reads as anything
   *   kill     a ring and a cross: a different CLASS of shape, not a bigger tick
   * donor: cinderbloom src/ui/hud.js:1574-1680.
   */
  _drawMark(g, c, m, u) {
    const kind = m.kind;
    const total = MARK_LIFE[kind] || 0.21;
    const grow = kind === 'kill' ? 0.070 : 0.055;
    const hold = kind === 'kill' ? 0.090 : 0.040;
    const age = m.t;
    let gt = 1, alpha = 1;
    if (age < grow) { gt = age / grow; }
    else if (age >= grow + hold) alpha = clamp01(1 - (age - grow - hold) / Math.max(0.001, total - grow - hold));
    if (alpha <= 0) return;

    // Motion is what the eye catches in the periphery, before any shape resolves: 3 px out
    // to 8 px, with the kill overshooting instead of easing.
    const e = kind === 'kill' ? 1 - Math.pow(1 - gt, 3) : gt * (2 - gt);
    const over = kind === 'kill' ? 1 + 0.14 * Math.sin(Math.PI * gt) : 1;
    const R0 = (3 + 5 * e) * u * over;
    const L = 9 * u;

    for (let pass = 0; pass < 2; pass++) {
      g.globalAlpha = alpha * (pass === 0 ? 0.62 : 1);
      g.strokeStyle = pass === 0 ? SHADE : INK;
      g.lineWidth = (pass === 0 ? 3.6 : 1.9) * u;
      g.lineCap = 'butt';
      g.beginPath();

      if (kind === 'armoured') {
        for (let i = 0; i < 4; i++) {
          const a = Math.PI * 0.25 + i * Math.PI * 0.5;
          const ca = Math.cos(a), sa = Math.sin(a);
          const rOut = R0 + L, rIn = R0 + L * 0.30, wing = L * 0.52;
          g.moveTo(c + ca * rOut - sa * wing, c + sa * rOut + ca * wing);
          g.lineTo(c + ca * rIn, c + sa * rIn);
          g.lineTo(c + ca * rOut + sa * wing, c + sa * rOut - ca * wing);
        }
      } else if (kind === 'kill') {
        const rot = 0.38 * e;
        const Rk = R0 + L * 0.62;
        g.moveTo(c + Math.cos(rot) * Rk, c + Math.sin(rot) * Rk);
        g.arc(c, c, Rk, rot, rot + TAU);
        const rr = R0 + L * 0.30;
        g.moveTo(c - rr, c); g.lineTo(c + rr, c);
        g.moveTo(c, c - rr); g.lineTo(c, c + rr);
      } else {
        for (let i = 0; i < 4; i++) {
          const a = Math.PI * 0.25 + i * Math.PI * 0.5;
          const ca = Math.cos(a), sa = Math.sin(a);
          g.moveTo(c + ca * R0, c + sa * R0);
          g.lineTo(c + ca * (R0 + L), c + sa * (R0 + L));
        }
        if (kind === 'weak') {
          for (let i = 0; i < 2; i++) {
            const a = Math.PI * 0.25 + i * Math.PI;
            const ca = Math.cos(a), sa = Math.sin(a);
            const rr = R0 + L * 1.75, wing = L * 0.42;
            g.moveTo(c + ca * rr - sa * wing, c + sa * rr + ca * wing);
            g.lineTo(c + ca * (rr + L * 0.5), c + sa * (rr + L * 0.5));
            g.lineTo(c + ca * rr + sa * wing, c + sa * rr - ca * wing);
          }
        }
      }
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  /* ------------------------------------------------------------ screen reader -- */

  /**
   * The one line of words that exists during play, and no sighted player can reach it. It is
   * deliberately coarse — bands, not numbers — because it is a substitute for a vignette and
   * a tremor, and those are bands too.
   */
  _speak() {
    if (!this.srEl || this.srT < SR_PERIOD_S) return;
    this.srT = 0;
    const max = CFG.player.health.max;
    const f = clamp01(this.hpShown / max);
    const health = f > 0.92 ? 'Unhurt' : f > 0.66 ? 'Grazed' : f > 0.4 ? 'Hurt' : f > 0.15 ? 'Badly hurt' : 'Nearly gone';
    const w = this.ctx.systems.get('weapons');
    const ammo = !w ? '' : ((w.ammo | 0) <= 0 ? ', magazine empty'
      : (w.ammo | 0) <= 3 ? ', magazine nearly empty' : '');
    const prog = this.ctx.systems.get('progress');
    const carry = prog && prog.carryStep >= 0
      ? [', carrying a little', ', carrying a good deal', ', carrying a great deal'][prog.carryStep] : '';
    const line = health + ammo + carry + '.';
    if (line === this.srLast) return;
    this.srLast = line;
    this.srEl.textContent = line;
  }

  /* ------------------------------------------------------------- test surface -- */

  state() {
    let marks = 0, arcs = 0, pulses = 0, grants = 0;
    for (let i = 0; i < MARK_POOL; i++) if (this.marks[i].live) marks++;
    for (let i = 0; i < ARC_POOL; i++) if (this.arcs[i].live) arcs++;
    for (let i = 0; i < PULSE_POOL; i++) {
      const q = this.pulses[i];
      if (!q.live) continue;
      pulses++;
      if (q.kind !== 'mote') grants++;   // a bought card reached the screen, audio or not
    }
    return {
      coneDeg: +this.cone.toFixed(3), conePx: +this.conePx.toFixed(2),
      adsT: +this.adsT.toFixed(3), dry: this.dry, inCar: this.inCar,
      hp: this.hp, hpShown: +this.hpShown.toFixed(1),
      vignette: +this.vigA.toFixed(3), tremor: +this.tremor.toFixed(3),
      marks, arcs, pulses, grants, paused: this.paused,
      canvas: { r: this.R, dpr: this.dpr },
      // The only text this system owns, so a test can assert its content and its invisibility
      // in the same breath.
      sr: this.srLast,
    };
  }

  config(patch) {
    const p = patch && patch.hud;
    if (!p) return;
    if (p.paused !== undefined) this.pause(!!p.paused);
  }
}

export default Hud;
