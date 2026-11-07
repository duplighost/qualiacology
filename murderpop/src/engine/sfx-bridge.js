// The game's sound calls, played by the full library (src/engine/sfx.js). The fight, YOU and the stage call
// the same names they always have (swing, hit, catch, fire, cue...); this maps them onto the library's
// calls, which take { pan, intensity, ... }. A fight attaches itself so pans and song times are its own.
const UNARMED = ['jab', 'cross', 'hook'];

export class SfxBridge {
  constructor(lib) { this.s = lib; this.f = null; this._hums = new Map(); this._spot = null; }
  attach(f) { this.f = f; if (f && f.bm) this.s.setSong(f.bm, f.chords); }
  detach() { this.f = null; this.stopAll(); }
  _pan(x) { return this.f && this.f.pan ? this.f.pan(x) : 0; }
  update() { this.s.update && this.s.update(); for (const [r, h] of this._hums) { if (r.pos && h.set) h.set({ pan: this._pan(r.pos.x) }); } }
  stopAll() { this.s.stopAll && this.s.stopAll(0.1); this._hums.clear(); }

  // ---------- YOU ----------
  swing(st, pl) {
    const un = UNARMED.indexOf(st.name);
    this.s.strike(un >= 0 ? un : st.name, { unarmed: un >= 0, dir: Math.sin(pl.facing) >= 0 ? 1 : -1, pan: this._pan(pl.x) });
  }
  hit({ heavy, onBeat, pan = 0, crit, soft } = {}) { return this.s.impact({ weight: crit ? 'crit' : heavy ? 'heavy' : 'light', pan, intensity: soft ? 0.62 : onBeat ? 1.12 : 0.92 }); }
  returnHit(pan = 0) { return this.s.impact({ weight: 'heavy', gold: true, pan }); }
  catch(q, pan = 0) { return this.s.catch({ perfect: q === 'perfect', quality: q, pan }); }
  parry(q, pan = 0) { return this.s.parry({ pan, intensity: q === 'perfect' ? 1.1 : 0.95 }); }
  // a pink hit stopped on the held guard: a dull knock, a little ring of the copper
  block(pan = 0) { this.s.deflect({ pan, intensity: 0.85 }); return this.s.chip({ pan, intensity: 0.6 }); }
  // the finisher's and a send-back's burst of gold on her
  goldBurst(pan = 0) { return this.s.play('gold-burst', this.s._o({ pan })); }
  // she's thrown into a wall or a prop
  slamSet(pan = 0) { this.s.impact({ weight: 'heavy', pan, intensity: 1.05 }); return this.s.breakOff({ pan, intensity: 0.6 }); }
  throwBack(pan = 0, toPan = pan) { return this.s.throwBack({ pan, toPan }); }
  // her glaze going hard: a glassy ring; and cracking open on the beat
  harden(pan = 0) { this.s.play('k-latch', this.s._o({ pan, gain: 0.9, rate: 1.6 })); return this.s.deflect({ pan, intensity: 0.7 }); }
  crackGlaze(pan = 0) { this.s.chip({ pan, intensity: 1 }); return this.s.breakOff({ pan, intensity: 0.7 }); }
  ringThrow(r) { const h = this.s.ringThrow({ pan: this._pan(r.pos ? r.pos.x : 0) }); if (h) this._hums.set(r, h); }
  ringRecall(r) { this.s.ringReturn({ pan: this._pan(r.pos ? r.pos.x : 0) }); }
  ringCatch(r) { const h = this._hums.get(r); if (h && h.stop) h.stop(0.06); this._hums.delete(r); this.s.ringCatch({ pan: this._pan(r.pos ? r.pos.x : 0) }); }
  dash(pl) { return this.s.dash({ pan: this._pan(pl.x) }); }
  nearMiss(pl) { return this.s.nearMiss({ pan: this._pan(pl.x) }); }
  hurt(pan = 0, hearts = 5) { this.s.hurt({ pan, big: hearts <= 1 }); return this.s.heartLost({ pan }); }
  heartBack() { return this.s.heartBack({ t: this.f ? this.f.t : 0 }); }
  meterFull() { return this.s.meterFull(); }
  spotlight() { this._spot = this.s.spotlight({ dur: this.f && this.f.beat ? this.f.beat * 4 : 2 }); return this._spot; }
  death() { return this.s.death(); }
  rewind(dur = 1.2) { return this.s.rewind({ dur }); }
  glimmer(root, q, step = 0, level = 1) { return this.s.glimmer({ t: this.f ? this.f.t : 0, step, intensity: 0.85 + 0.15 * Math.min(1, level) }); }

  // ---------- her ----------
  cue(kind = 'white', pan = 0) { return this.s.telegraph(kind === 'pink' ? 'pink' : 'white', { pan }); }
  fire(shape = 'orb', pan = 0) { return this.s.bossShot(shape, { pan }); }
  windup(lead, pan = 0) { return this.s.windup({ lead, pan }); }
  impactArea(kind, pan = 0, hit) { return this.s.slam({ pan, intensity: hit === 'hit' ? 1.05 : 0.8 }); }
  wave(pan = 0) { return this.s.slam({ pan, intensity: 0.6 }); }
  beam(pan = 0) { return this.s.telegraph('white', { pan, intensity: 0.8 }); }
  break(pan = 0) { return this.s.breakOff({ pan }); }
  breakProp(pan = 0) { this.s.chip({ pan }); return this.s.breakOff({ pan, intensity: 0.65 }); }
  hitProp(pan = 0) { return this.s.chip({ pan, intensity: 0.8 }); }
  deflect(pan = 0) { return this.s.deflect({ pan }); }
  empty() { return this.s.breakOff({ intensity: 0.75 }); }
  shatter(pan = 0) { return this.s.shatter({ pan }); }

  // ---------- menus and the end ----------
  ui(kind = 'select') { if (kind === 'needle') return this.s.needleDrop(); if (kind === 'spin') return this.s.recordSpin(); return this.s.ui(kind); }
  // the menus: the surface of the record, quietly, while nothing else plays
  ambience(on) {
    if (on && !(this._amb && this._amb.alive)) this._amb = this.s.loop('crackle', { gain: 0.32, fadeIn: 1.2, out: this.s.uiOut });
    if (!on && this._amb) { this._amb.stop(0.4); this._amb = null; }
  }
  applause(k) { return this.s.applause(k); }
  stopApplause() { return this.s.stopApplause && this.s.stopApplause(); }
  music() {}
}
