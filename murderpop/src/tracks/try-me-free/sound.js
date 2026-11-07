// The commercial's own sounds, small and placed: breaker CHUNKs, the set's hum (only while it's on air), the
// tape-splice tick of THE CUT, the gaffer tape, cereal crunch, cardboard, the gavel's knock, the flash's charge
// and pop, the match and the fire, the sirens' pips, the shutter. Synthesised once into buffers, played through
// the game's sound output (so the volume settings apply). Quiet: they sit under her voice.
const SR = 44100;

export class Sound {
  constructor(f) {
    this.f = f;
    const lib = f.sfx && f.sfx.s;
    this.ctx = lib && lib.ctx; this.out = lib && lib.out; this.lib = lib;
    this.bufs = {}; this.hum = null; this.live = new Set(); this.on = !!(this.ctx && this.out);
    if (this.on) this._make();
  }
  _buf(sec, fn) {
    const n = Math.floor(sec * SR), b = this.ctx.createBuffer(1, n, SR), d = b.getChannelData(0);
    let seed = 1234567; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
    let lp = 0, lp2 = 0;
    for (let i = 0; i < n; i++) { const t = i / SR; d[i] = fn(t, rnd, (x, k) => (lp += (x - lp) * k), (x, k) => (lp2 += (x - lp2) * k)); }
    return b;
  }
  _make() {
    const B = this.bufs, ex = Math.exp, sin = Math.sin, PI2 = Math.PI * 2;
    // a deep breaker CHUNK: a low thump and a metal latch
    B.chunk = this._buf(0.5, (t, r, lp) => ex(-t * 9) * (sin(PI2 * 52 * t) * 0.9 + sin(PI2 * 31 * t) * 0.5) + lp(r(), 0.35) * ex(-t * 60) * 0.7 + sin(PI2 * 1800 * t) * ex(-t * 90) * 0.12);
    B.chunkOff = this._buf(0.35, (t, r, lp) => ex(-t * 14) * sin(PI2 * 44 * t) * 0.7 + lp(r(), 0.25) * ex(-t * 70) * 0.4);
    // the tape-splice tick, and a strip of gaffer tape torn
    B.splice = this._buf(0.06, (t, r) => (r() * ex(-t * 400) + sin(PI2 * 3200 * t) * ex(-t * 260) * 0.6) * 0.8);
    B.tape = this._buf(0.16, (t, r, lp) => lp(r(), 0.6) * (0.5 + 0.5 * sin(PI2 * 90 * t * (1 + t * 4))) * ex(-t * 18) * 0.5);
    // cereal: a crunch, a small crunch, cardboard
    B.crunch = this._buf(0.5, (t, r, lp) => lp(r() * (r() > 0.6 ? 1 : 0.15), 0.5) * ex(-t * 7) * 0.9);
    B.crunchSmall = this._buf(0.18, (t, r, lp) => lp(r() * (r() > 0.7 ? 1 : 0.1), 0.55) * ex(-t * 20) * 0.7);
    B.cardboard = this._buf(0.3, (t, r, lp) => (sin(PI2 * 120 * t) * 0.6 + lp(r(), 0.12) * 0.8) * ex(-t * 22));
    // the gavel: a hard wood knock alone in the silence
    B.gavel = this._buf(0.35, (t, r, lp) => (sin(PI2 * 410 * t) * 0.6 + sin(PI2 * 960 * t) * 0.25 + lp(r(), 0.4) * 0.4) * ex(-t * 30) + sin(PI2 * 80 * t) * ex(-t * 16) * 0.5);
    // GUILTY: the lacquer goes matte with a small glassy ting (long enough to hear under her voice, never a whistle)
    B.guilty = this._buf(0.22, (t, r) => sin(PI2 * 2400 * t) * ex(-t * 38) * 0.3 + sin(PI2 * 1210 * t) * ex(-t * 30) * 0.16 + r() * ex(-t * 500) * 0.12);
    // the flash: a capacitor charge (low, never shrill), strobe ticks, one POP
    B.charge = this._buf(2.6, (t, r) => { const ph = PI2 * (140 * t + 18.74 * t * t * t); return (sin(ph) + 0.3 * sin(2 * ph)) * 0.05 * Math.min(1, t * 3); });   // 140 -> 520 Hz
    B.tick = this._buf(0.05, (t, r) => r() * ex(-t * 300) * 0.5);
    // (a flashbulb: a soft darkened puff and a low thump, short; it was a long bright hiss)
    B.pop = this._buf(0.4, (t, r, lp) => lp(r(), 0.3) * ex(-t * 22) * 0.75 + sin(PI2 * 70 * t) * ex(-t * 12) * 0.6);
    // the match: a scratch and flare; the fire's whoomph
    B.match = this._buf(0.7, (t, r, lp) => (t < 0.18 ? r() * 0.7 * (0.6 + 0.4 * sin(PI2 * 40 * t)) : lp(r(), 0.3) * 0.45 * ex(-(t - 0.18) * 4)));
    B.whoomph = this._buf(1.3, (t, r, lp, lp2) => lp2(lp(r(), 0.08), 0.2) * 3.2 * Math.min(1, t * 9) * ex(-t * 2.6));
    B.crackle = this._buf(2.0, (t, r) => (r() > 0.985 ? r() : 0) * 0.6);
    // the siren's short pips; the shutter's chk-chk; the camera servo
    B.pip = this._buf(0.12, (t) => sin(PI2 * 1320 * t) * (t < 0.1 ? 1 : 0) * 0.22 * Math.min(1, t * 200));
    B.shutter = this._buf(0.22, (t, r) => r() * (ex(-t * 120) + (t > 0.09 ? ex(-(t - 0.09) * 120) : 0)) * 0.6);
    B.servo = this._buf(0.9, (t) => sin(PI2 * (180 + 60 * sin(PI2 * 3 * t)) * t) * 0.04);
    // the pour: a rushing cereal avalanche; the milk's slosh; a cereal pop; a cable creak
    B.pour = this._buf(1.2, (t, r, lp) => lp(r() * (r() > 0.3 ? 1 : 0.2), 0.45) * Math.min(1, t * 8) * ex(-t * 1.8) * 0.8);
    B.slosh = this._buf(1.6, (t, r, lp, lp2) => lp2(lp(r(), 0.05), 0.3) * 2.5 * sin(Math.PI * Math.min(1, t / 1.6)));
    B.popc = this._buf(0.1, (t, r) => (sin(PI2 * 700 * t * (1 - t * 3)) * 0.5 + r() * 0.3) * ex(-t * 50));
    B.creak = this._buf(0.4, (t) => sin(PI2 * (220 + 40 * sin(PI2 * 9 * t)) * t) * 0.06 * sin(Math.PI * t / 0.4));
    B.bubble = this._buf(0.12, (t) => sin(PI2 * (500 + 900 * t) * t) * ex(-t * 30) * 0.3);
    // a heartbeat with a little body above the sub, so small speakers carry it too
    B.heart = this._buf(0.3, (t) => (sin(PI2 * 48 * t) * 0.7 + sin(PI2 * 96 * t) * 0.3 + sin(PI2 * 150 * t) * 0.1) * ex(-t * 14));
    B.clack = this._buf(0.12, (t, r) => (sin(PI2 * 1800 * t) * 0.4 + r() * 0.3) * ex(-t * 70));
    B.thok = this._buf(0.2, (t, r, lp) => (sin(PI2 * 190 * t) * 0.7 + lp(r(), 0.3) * 0.3) * ex(-t * 28));
    // the set's faint electrical hum: room tone and a little lamp buzz
    B.hum = this._buf(2.0, (t, r, lp) => (sin(PI2 * 60 * t) * 0.3 + sin(PI2 * 120 * t) * 0.18 + sin(PI2 * 180 * t) * 0.06 + lp(r(), 0.02) * 0.6) * 0.06);
  }
  // a buffer at a place (x on the floor) now or at song time `at`
  play(name, x = 0, o = {}) {
    if (!this.on || !this.bufs[name]) return null;
    const c = this.ctx, src = c.createBufferSource(); src.buffer = this.bufs[name];
    src.playbackRate.value = o.rate ?? 1;
    const g = c.createGain(); g.gain.value = (o.gain ?? 1) * (VOL[name] ?? 0.5);
    const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, this.f.pan ? this.f.pan(x) * 0.85 : 0));
    src.connect(g).connect(p).connect(this.out);
    const when = o.in ? c.currentTime + o.in : c.currentTime;
    src.start(when);
    const h = { src, gain: g, pan: p, name };
    this.live.add(h);
    src.onended = () => { this.live.delete(h); src.disconnect(); g.disconnect(); p.disconnect(); };
    return h;
  }
  // fade out every playing copy of a sound (a charge that won't pop any more)
  cut(name) {
    if (!this.on) return;
    const now = this.ctx.currentTime;
    for (const h of this.live) if (h.name === name) { h.gain.gain.cancelScheduledValues(now); h.gain.gain.setTargetAtTime(0, now, 0.03); try { h.src.stop(now + 0.15); } catch (e) { /* stopped */ } }
  }
  dark(on, t) {
    if (!this.on) return;
    if (on) { this.creak(); }
    else this.play('chunk', 0, { gain: 1.1 });
  }
  creak() { this.play('creak', this.f.player ? this.f.player.x : 0); }
  update(f, dt, t, dark) {
    if (!this.on) return;
    const want = !dark && t > 2.07 && f.state === 'play';
    if (want && !this.hum) {
      const c = this.ctx, s = c.createBufferSource(); s.buffer = this.bufs.hum; s.loop = true;
      const g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(VOL.hum, c.currentTime, 0.05);
      s.connect(g).connect(this.out); s.start(); this.hum = { s, g };
    } else if (!want && this.hum) {
      const h = this.hum; this.hum = null; h.g.gain.cancelScheduledValues(this.ctx.currentTime); h.g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      try { h.s.stop(this.ctx.currentTime + 0.05); } catch (e) { /* stopped */ }
    }
  }
  dispose() { if (this.hum) { try { this.hum.s.stop(); } catch (e) { /* fine */ } this.hum = null; } }
}
const VOL = {
  chunk: 0.55, chunkOff: 0.35, splice: 0.32, tape: 0.22, crunch: 0.5, crunchSmall: 0.3, cardboard: 0.4, gavel: 0.5, guilty: 0.75,
  charge: 0.5, tick: 0.35, pop: 0.42, match: 0.4, whoomph: 0.55, crackle: 0.25, pip: 0.4, shutter: 0.42, servo: 0.5, pour: 0.42,
  slosh: 0.42, popc: 0.24, creak: 0.35, bubble: 0.3, heart: 0.6, clack: 0.35, thok: 0.5, hum: 0.12,
};
