// game.js — movements, camera, objectives, and the loop that binds the
// simulation to a hand on a mouse.

import { GLX } from './gl.js';
import { Fluid, PARAMS } from './fluid.js';
import { Renderer } from './render.js';
import { Ember, EMBER } from './ember.js';
import { buildLevel, MOVEMENTS, META } from './levels.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { clamp, clamp01, approach, lerp, smoothstep } from './util.js';

const PROBE_TARGET0 = 10;
const MAX_TARGETS = 34;
const PROBE_REACH = 47;
const SAVE_KEY = 'wick.progress.v1';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.glx = new GLX(canvas);
    this.fluid = new Fluid(this.glx);
    this.renderer = new Renderer(this.glx);
    this.ember = new Ember();
    this.ui = new UI();
    this.audio = new Audio();

    this.state = 'boot';
    this.time = 0;
    this.levelTime = 0;
    this.acc = 0;
    this.level = null;
    this.levelCache = new Map();
    this.titleMode = false;
    this.testMode = false;
    this.timeScale = 1;

    // input
    this.ptr = { x: 0, y: 0, px: 0, py: 0, down: false, inside: false, moved: false, seen: false };
    this.hand = { x: 0, y: 0, vx: 0, vy: 0 };
    this.sink = 0;

    this.cam = { x: 0, y: 0, tx: 0, ty: 0 };
    this.fire = 0;
    this.flashEnergy = 0;
    this._lastFieldHeat = 0;
    this._flashCool = 0;
    this.unrest = 0;
    this.deaths = 0;
    this.litCount = 0;
    this.checkpoint = null;

    this.progress = this._load();
    this._bindInput();
  }

  _load() {
    try { const v = JSON.parse(localStorage.getItem(SAVE_KEY)); if (v && typeof v.unlocked === 'number') return v; } catch {}
    return { unlocked: 0, finished: false };
  }
  _save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.progress)); } catch {} }

  // ────────────────────────────────────────────────────────────────── input
  _bindInput() {
    const c = this.canvas;
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      this.ptr.x = e.clientX - r.left;
      this.ptr.y = e.clientY - r.top;
      this.ptr.inside = true;
      this.ptr.moved = true;
      this.ptr.seen = true;
    };
    c.addEventListener('pointermove', (e) => { pos(e); }, { passive: true });
    c.addEventListener('pointerdown', (e) => {
      pos(e); this.ptr.down = true;
      this.audio.start();
      c.setPointerCapture && c.setPointerCapture(e.pointerId);
      if (this.state === 'title') this.beginRun();
    });
    window.addEventListener('pointerup', () => { this.ptr.down = false; });
    c.addEventListener('pointerleave', () => { this.ptr.inside = false; });
    window.addEventListener('keydown', (e) => {
      this.audio.start();
      if (e.key === 'm' || e.key === 'M') this.audio.setMuted(!this.audio.muted);
      if (e.key === 'Escape' && (this.state === 'play' || this.state === 'dying')) this.toMenu();
      if (e.key === 'r' || e.key === 'R') { if (this.state === 'play') this.rewind(true); }
      if (e.key === ' ' && this.state === 'title') { e.preventDefault(); this.beginRun(); }
    });
    window.addEventListener('blur', () => { this.ptr.down = false; });
  }

  /** Screen pixels -> grid uv, through the letterboxed viewport and the camera. */
  screenToGrid(px, py) {
    const vp = this.renderer.viewport;
    const dpr = this.dpr || 1;
    const x = (px * dpr - vp[0]) / vp[2];
    const y = 1 - (py * dpr - vp[1]) / vp[3];
    const c = this.camUv;
    return [c[0] + clamp01(x) * c[2], c[1] + clamp01(y) * c[3]];
  }

  // ───────────────────────────────────────────────────────────────── levels
  level_(id) {
    let L = this.levelCache.get(id);
    if (!L) { L = buildLevel(id); this.levelCache.set(id, L); }
    return L;
  }

  loadMovement(id, { keepLit = false } = {}) {
    const L = this.level_(id);
    this.fluid.applySim(L.sim);
    if (!keepLit) for (const t of L.targets) { t.lit = false; t.litAt = -1; }
    L.medium = L.medium0.slice();
    L.fuel = L.fuel0.slice();
    if (keepLit) {
      // relight everything you had already reached, so a rewind never costs progress
      for (const t of L.targets) if (t.lit) this._paintHeat(L, t.x, t.y, 3.0, 3.0);
    }
    this.level = L;
    this.fluid.load(L);
    this.fluid.rain = L.rain;
    this.fluid.ventGain = L.ventGain;
    this.fluid.clearGusts();
    this.renderer.allocForGrid(L.gw, L.gh);

    const cp = this.checkpoint && keepLit ? this.checkpoint : { x: L.spawn[0], y: L.spawn[1] };
    this.ember.bind(L);
    this.ember.reset(cp.x, cp.y, L.startHeat);
    this.levelTime = 0;
    this.litCount = L.targets.filter((t) => t.lit).length;
    this.fire = 0; this.flashEnergy = 0; this._lastFieldHeat = 0;
    this.cam.x = this.cam.tx = 0; this.cam.y = this.cam.ty = 0;
    this._updateCamera(1, true);
    this.hand.x = cp.x; this.hand.y = cp.y + 24;
    this.hand.vx = this.hand.vy = 0;
    this.resize();
    this.audio.setMovement(id);
    this.ui.setWicks(this.titleMode ? 0 : L.targets.length, this.litCount);
  }

  _paintHeat(L, cx, cy, r, amount) {
    const gw = L.gw, gh = L.gh, M = L.medium;
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(gh - 1, Math.ceil(cy + r)); y++)
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(gw - 1, Math.ceil(cx + r)); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= r) M[(y * gw + x) * 4] = Math.max(M[(y * gw + x) * 4], amount * (1 - d / r));
      }
  }

  // ────────────────────────────────────────────────────────────────── flow
  async boot() {
    this.titleMode = true;
    this.loadMovement('strike');
    this.state = 'title';
    this.renderer.p.fade = 0;
    this.ui.blackout(false, 1400);
    await wait(140);
    this.ui.showTitle(true);
  }

  async beginRun() {
    if (this._transitioning) return;
    if (this.progress.unlocked > 0 || this.progress.finished) { this.toMenu(); return; }
    await this.startMovement('strike');
  }

  async toMenu() {
    if (this._transitioning) return;
    this._transitioning = true;
    this.state = 'menu';
    this.ui.showTitle(false);
    this.ui.hint('');
    this.ui.setWicks(0, 0);
    this.audio.duck(0.45);
    const items = MOVEMENTS.map((id, i) => ({
      id, available: i <= this.progress.unlocked,
      label: (META[id].numeral + '  ' + (META[id].name || '·')).trim(),
    }));
    this.ui.menu(items, (id) => { this.ui.hideMenu(); this.startMovement(id); });
    this._transitioning = false;
  }

  async startMovement(id) {
    if (this._transitioning && this.state !== 'menu') return;
    this._transitioning = true;
    this.audio.start();
    this.ui.hideMenu();
    this.ui.showTitle(false);
    this.ui.hint('');
    this.audio.duck(0.35, 0.4);
    this.ui.blackout(true, 700);
    await wait(760);

    this.titleMode = false;
    this.testMode = this.testMode || false;
    this.checkpoint = null;
    this.deaths = 0;
    this.unrest = 0;
    this.loadMovement(id);
    this.renderer.p.fade = 0;

    const m = META[id];
    this.ui.card(m.numeral, m.name);
    this.ui.blackout(false, 900);
    await wait(1900);
    this.ui.hideCard();
    await wait(700);

    this.state = 'play';
    this.audio.duck(1.0, 1.2);
    this._transitioning = false;
    this._hints = null;
  }

  async completeMovement() {
    if (this.state !== 'play') return;
    this.state = 'won';
    const idx = MOVEMENTS.indexOf(this.level.id);
    if (idx + 1 > this.progress.unlocked) { this.progress.unlocked = Math.min(idx + 1, MOVEMENTS.length - 1); this._save(); }
    this.audio.bell(1.2, 7);
    this.audio.bell(0.9, 9);
    this._transitioning = true;

    if (this.level.id === 'hands') { await this._ending(); return; }

    await wait(1700);
    this.ui.blackout(true, 1500);
    await wait(1600);
    const next = MOVEMENTS[idx + 1];
    this._transitioning = false;
    if (next) await this.startMovement(next);
    else await this.toMenu();
  }

  async _ending() {
    // it goes up, and you let it
    this.state = 'end';
    this.audio.duck(1.0, 2.0);
    for (let i = 0; i < 5; i++) { this.audio.bell(0.55 - i * 0.06, 2 + i * 2); await wait(1150); }
    this.ui.blackout(true, 4200);
    await wait(4400);
    this.progress.finished = true;
    this.progress.unlocked = MOVEMENTS.length - 1;
    this._save();
    this.ui.card('', 'WICK');
    await wait(3600);
    this.ui.hideCard();
    await wait(1200);
    this._transitioning = false;
    this.titleMode = true;
    this.loadMovement('strike');
    this.state = 'menu';
    this.renderer.p.fade = 0;
    this.ui.blackout(false, 1800);
    await this.toMenu();
  }

  async die() {
    if (this.state !== 'play') return;
    this.state = 'dying';
    this.deaths++;
    this.audio.extinguish();
    this.audio.duck(0.5, 0.5);
    await wait(1500);
    this.rewind();
    await wait(60);
    this.audio.duck(1.0, 0.8);
    this.state = 'play';
  }

  rewind(manual = false) {
    const L = this.level;
    const lit = L.targets.filter((t) => t.lit);
    if (lit.length) {
      const last = lit[lit.length - 1];
      this.checkpoint = { x: last.x, y: last.y + 7 };
    } else this.checkpoint = { x: L.spawn[0], y: L.spawn[1] };
    if (manual) this.deaths++;
    this.loadMovement(L.id, { keepLit: true });
    this.renderer.p.fade = 0.15;
  }

  // ───────────────────────────────────────────────────────────────── camera
  _updateCamera(dt, snap = false) {
    const L = this.level, e = this.ember;
    const vw = Math.min(L.view[0], L.gw), vh = Math.min(L.view[1], L.gh);
    let tx = L.gw / 2, ty = L.gh / 2;
    const lead = 0.30;
    if (L.camera === 'follow') { tx = e.x + e.vx * lead; ty = e.y + e.vy * lead; }
    else if (L.camera === 'followY') { ty = e.y + e.vy * lead; }
    else if (L.camera === 'followX') { tx = e.x + e.vx * lead; }
    tx = clamp(tx, vw / 2, L.gw - vw / 2);
    ty = clamp(ty, vh / 2, L.gh - vh / 2);
    this.cam.tx = tx; this.cam.ty = ty;
    if (snap) { this.cam.x = tx; this.cam.y = ty; }
    else {
      this.cam.x = approach(this.cam.x, tx, 4.2, dt);
      this.cam.y = approach(this.cam.y, ty, 4.2, dt);
    }
    this.camUv = [
      (this.cam.x - vw / 2) / L.gw, (this.cam.y - vh / 2) / L.gh,
      vw / L.gw, vh / L.gh,
    ];
    this.viewCells = [vw, vh];
  }

  // ─────────────────────────────────────────────────────────────────── loop
  resize() {
    const c = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    const w = Math.max(2, Math.round(c.clientWidth * dpr));
    const h = Math.max(2, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const L = this.level;
    const aspect = L ? Math.min(L.view[0], L.gw) / Math.min(L.view[1], L.gh) : 16 / 9;
    this.renderer.resize(w, h, aspect);
  }

  frame(nowMs) {
    const now = nowMs / 1000;
    if (this._last === undefined) this._last = now;
    let dt = Math.min(now - this._last, 0.1);
    this._last = now;
    if (this.canvas.clientWidth !== this._cw || this.canvas.clientHeight !== this._ch) {
      this._cw = this.canvas.clientWidth; this._ch = this.canvas.clientHeight;
      this.resize();
    }
    this.tick(dt);
    this.render();
  }

  tick(dt) {
    if (!this.level) return;
    const P = this.fluid.p;
    this.timeScale = approach(this.timeScale, this.state === 'play' && this.ember.peril > 0.55 ? 0.86 : 1, 4, dt);
    this.acc += dt * this.timeScale;
    let steps = 0;
    while (this.acc >= P.dt && steps < P.maxSubSteps) {
      this.tickFixed(P.dt, false);
      this.acc -= P.dt;
      steps++;
    }
    if (this.acc > P.dt) this.acc = P.dt;
    this._updateCamera(dt);
    this._updateHandUi();
    this._updateAudio(dt);
  }

  /** One fixed simulation step, plus everything downstream of it. */
  tickFixed(dt, sync) {
    const L = this.level, f = this.fluid, e = this.ember, P = this.fluid.p;
    this.time += dt;
    this.levelTime += dt;

    // ── the hand
    const live = this.state === 'play' || this.state === 'title' || this.state === 'won';
    let hx = this.hand.x, hy = this.hand.y;
    if (this.testHand) { hx = this.testHand[0]; hy = this.testHand[1]; }
    else if (this.ptr.seen && this.ptr.inside) {
      const [u, v] = this.screenToGrid(this.ptr.x, this.ptr.y);
      hx = u * L.gw; hy = v * L.gh;
    }
    const nvx = (hx - this.hand.x) / dt, nvy = (hy - this.hand.y) / dt;
    this.hand.vx = approach(this.hand.vx, nvx, 13, dt);
    this.hand.vy = approach(this.hand.vy, nvy, 13, dt);
    this.hand.x = hx; this.hand.y = hy;

    let sp = Math.hypot(this.hand.vx, this.hand.vy);
    if (sp > P.pointerMaxSpeed) { const k = P.pointerMaxSpeed / sp; this.hand.vx *= k; this.hand.vy *= k; sp = P.pointerMaxSpeed; }

    const holding = live && (this.testHand ? this.testDown : (this.ptr.down && this.ptr.inside));
    this.sink = approach(this.sink, holding ? P.sink : 0, holding ? 11 : 15, dt);

    const gain = live ? P.pointerForce : 0;
    f.pointer = [clamp01(this.hand.x / L.gw), clamp01(this.hand.y / L.gh)];
    f.handActive = live && (sp > 12 || holding);
    f.pointerForce = [this.hand.vx * gain, this.hand.vy * gain];
    f.sink = this.sink;
    this.unrest += (sp * gain * 0.000012 + this.sink * 0.010) * dt;

    if (L.tick) L.tick(this.levelTime, f, this);

    // ── the ember is a heat source inside the sim, not just a passenger
    f.ember.uv = [clamp01(e.x / L.gw), clamp01(e.y / L.gh)];
    f.ember.heat = e.alive ? e.heat : 0;

    // ── simulate
    f.step(dt);
    this._placeProbes();
    f.readProbes(sync);

    if (this.state === 'play' || this.state === 'title') e.step(dt, f, L);
    else { e.step(dt, f, L); }

    if (this.titleMode) {
      if (!e.alive || e.heat < 0.88) { e.heat = Math.max(e.heat, 0.95); e.alive = true; }
      return;
    }

    // ── objectives
    if (this.state === 'play') {
      const n = Math.min(L.targets.length, MAX_TARGETS);
      for (let i = 0; i < n; i++) {
        const t = L.targets[i];
        if (t.lit) continue;
        const heat = f.probe(PROBE_TARGET0 + i, 0)[2];
        if (heat > 0.80) {
          t.lit = true; t.litAt = this.levelTime;
          this.litCount++;
          this.audio.bell(1.0);
          this.renderer.p.flash = Math.max(this.renderer.p.flash, 0.28);
          this.ui.setWicks(L.targets.length, this.litCount);
          this.checkpoint = { x: t.x, y: t.y + 7 };
        }
      }
      const allLit = L.targets.every((t) => t.lit);
      let reached = true;
      if (L.reach) reached = Math.hypot(e.x - L.reach.x, e.y - L.reach.y) < L.reach.r;
      if (allLit && reached) this.completeMovement();
      if (!e.alive) this.die();

      // Hints fire on a clock OR on what you have actually managed, so they
      // turn up when they are relevant rather than when a timer says so.
      const hs = this._hints || (this._hints = { seen: new Set(), until: 0 });
      for (let i = 0; i < L.hints.length; i++) {
        if (hs.seen.has(i)) continue;
        const h = L.hints[i];
        if (h.when ? h.when(this) : this.levelTime >= (h.at || 0)) {
          hs.seen.add(i);
          this.ui.hint(h.text);
          hs.until = this.levelTime + (h.hold || 11);
        }
      }
      if (hs.until && this.levelTime > hs.until) { this.ui.hint(''); hs.until = 0; }
    }

    // ── how much of the world is actually on fire, for the ears
    let fire = clamp(e.fieldHeat, 0, 3) * 0.42;
    for (const t of L.targets) {
      if (!t.lit) continue;
      const d = Math.hypot(t.x - e.x, t.y - e.y);
      fire += 0.55 * Math.exp(-(d * d) / (105 * 105));
    }
    const jump = e.fieldHeat - this._lastFieldHeat;
    this._lastFieldHeat = e.fieldHeat;
    this._flashCool = Math.max(0, this._flashCool - dt);
    if (jump > 0.55 && this._flashCool <= 0) {
      this.flashEnergy = Math.min(2.4, this.flashEnergy + 1.1);
      this._flashCool = 0.9;
      this.audio.flashover(clamp(jump, 0.3, 1.2));
      this.renderer.p.flash = Math.max(this.renderer.p.flash, 0.22);
    }
    this.flashEnergy = approach(this.flashEnergy, 0, 1.3, dt);
    this.fire = approach(this.fire, fire + this.flashEnergy, 3.2, dt);
    this.renderer.p.flash = approach(this.renderer.p.flash, 0, 3.4, dt);
  }

  _placeProbes() {
    const f = this.fluid, L = this.level;
    this.ember.placeProbes(f);
    const n = Math.min(L.targets.length, MAX_TARGETS);
    for (let i = 0; i < n; i++) {
      const t = L.targets[i];
      f.setProbe(PROBE_TARGET0 + i, t.x / L.gw, t.y / L.gh);
    }
    if (L.reach) f.setProbe(PROBE_REACH, L.reach.x / L.gw, L.reach.y / L.gh);
  }

  _updateHandUi() {
    const vp = this.renderer.viewport, dpr = this.dpr || 1;
    const show = (this.state === 'play' || this.state === 'title') && this.ptr.seen && this.ptr.inside;
    this.ui.setHand(this.ptr.x, this.ptr.y, this.ptr.down, show);
    void vp;
  }

  _updateAudio(dt) {
    const e = this.ember, L = this.level;
    const panning = clamp((e.x - this.cam.x) / (this.viewCells ? this.viewCells[0] / 2 : 160), -1, 1);
    this.audio.update({
      fire: this.fire,
      ember: e.alive ? e.heat : 0,
      wind: e.wind,
      peril: this.state === 'play' ? e.peril : 0,
      breath: this.sink / Math.max(this.fluid.p.sink, 1e-3),
      rain: L.rain > 0 ? clamp01(L.rain / 0.075) : 0,
      voice: L.id === 'hands' && !this.titleMode ? clamp01((this.ember.y - L.gh * 0.25) / (L.gh * 0.55)) : 0,
      panning,
      dt,
    });
  }

  render() {
    if (!this.level) return;
    const r = this.renderer, e = this.ember;
    r.p.desatAdd = this.state === 'play' ? e.peril * 0.55 : 0;
    const targetFade = (this.state === 'dying') ? 0.22 : 1;
    r.p.fade = approach(r.p.fade, targetFade, this.state === 'dying' ? 2.6 : 1.5, 1 / 60);
    r.frame(this.fluid, e, this.camUv, this.level.grade, this.time);
  }

  // ─────────────────────────────────────────────────────────── test harness
  /** Deterministic stepping with synchronous probe reads — used by tests. */
  advanceForTest(seconds) {
    const n = Math.max(1, Math.round(seconds * 60));
    for (let i = 0; i < n; i++) {
      this.tickFixed(1 / 60, true);
      this._updateCamera(1 / 60);
    }
    this._updateAudio(1 / 60);
  }

  stats() {
    const e = this.ember, L = this.level;
    return {
      state: this.state, level: L ? L.id : null, t: +this.levelTime.toFixed(2),
      x: +e.x.toFixed(1), y: +e.y.toFixed(1), heat: +e.heat.toFixed(3),
      vx: +e.vx.toFixed(1), vy: +e.vy.toFixed(1), speed: +e.speed.toFixed(1),
      wind: +e.wind.toFixed(1), fieldHeat: +e.fieldHeat.toFixed(3), peril: +e.peril.toFixed(2),
      burnNear: +e.burnNear.toFixed(2),
      alive: e.alive, lit: this.litCount, targets: L ? L.targets.length : 0,
      fire: +this.fire.toFixed(2), unrest: +this.unrest.toFixed(3), deaths: this.deaths,
      budget: e.budget ? Object.fromEntries(Object.entries(e.budget).map(([k, v]) => [k, +v.toFixed(3)])) : null,
      grid: L ? [L.gw, L.gh] : null, drawCalls: this.glx.drawCalls,
    };
  }
}

export { MOVEMENTS, META, EMBER, PARAMS, clamp, clamp01, lerp, smoothstep };
