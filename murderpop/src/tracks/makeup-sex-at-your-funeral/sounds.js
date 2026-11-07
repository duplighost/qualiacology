// THE MOURNER's own sounds: a few Kenney recordings (CC0, copied into assets/tracks/<id>/sfx) and small
// synthesized ones (the camera: shutter, flash pop, focus chirps, capacitor whine, Polaroid; a hearse horn, a
// music-box tine, a map ping). Everything goes through the game's sfx bus, quiet, panned to where it happens.
// Tonal sounds take their notes from the chord that's sounding (data/chords), so nothing fights the song.
const DIR = 'assets/tracks/makeup-sex-at-your-funeral/sfx/';
const REC = {
  woodHeavy: ['impactWood_heavy_000', 'impactWood_heavy_001'], woodLight: ['impactWood_light_000', 'impactWood_light_001'],
  plank: ['impactPlank_medium_000', 'impactPlank_medium_001'],
  glassHeavy: ['impactGlass_heavy_000', 'impactGlass_heavy_001'], glassMed: ['impactGlass_medium_000', 'impactGlass_medium_001'],
  glassLight: ['impactGlass_light_000', 'impactGlass_light_001', 'impactGlass_light_002'],
  metalHeavy: ['impactMetal_heavy_000', 'impactMetal_heavy_001'], metalLight: ['impactMetal_light_000'],
  stone: ['impactMining_000', 'impactMining_001'], soilHeavy: ['impactSoft_heavy_000', 'impactSoft_heavy_001'],
  soil: ['impactSoft_medium_000', 'impactSoft_medium_001'], plate: ['impactPlate_light_000', 'impactPlate_light_001'],
  plateHeavy: ['impactPlate_heavy_000'], bell: ['impactBell_heavy_000'], thudBody: ['impactPunch_heavy_000'], slap: ['impactPunch_medium_000'],
  heel: ['footstep_concrete_000', 'footstep_concrete_001', 'footstep_concrete_002'], heelGrass: ['footstep_grass_000', 'footstep_grass_001'],
  boots: ['footstep_wood_000', 'footstep_wood_001'], click: ['click_001', 'click_002'], ding: ['glass_001', 'glass_002', 'glass_003'],
  tick: ['tick_001'], torch: ['switch_001'], bookOpen: ['bookOpen'], bookClose: ['bookClose'], page: ['bookFlip1'],
  cloth: ['cloth1', 'cloth2'], creak: ['creak1', 'creak2'], door: ['doorClose_4'], metalClick: ['metalClick'], latch: ['metalLatch'], coins: ['handleCoins'],
};
// relative levels (linear), then everything is scaled by MASTER
const LEVEL = {
  woodHeavy: 0.55, woodLight: 0.5, plank: 0.5, glassHeavy: 0.42, glassMed: 0.42, glassLight: 0.4, metalHeavy: 0.38, metalLight: 0.4,
  stone: 0.5, soilHeavy: 0.55, soil: 0.5, plate: 0.45, plateHeavy: 0.45, bell: 0.3, thudBody: 0.5, slap: 0.55, heel: 0.22, heelGrass: 0.2,
  boots: 0.3, click: 0.45, ding: 0.28, tick: 0.3, torch: 0.5, bookOpen: 0.6, bookClose: 0.7, page: 0.5, cloth: 0.5, creak: 0.35, door: 0.55,
  metalClick: 0.45, latch: 0.4, coins: 0.35,
  shutter: 0.5, pop: 0.32, chirp: 0.16, led: 0.14, whir: 0.3, horn: 0.16, tine: 0.22, ping: 0.2, chime: 0.22, whump: 0.5, fizz: 0.22,
  rattle: 0.26, feedback: 0.06, rip: 0.4, crackle: 0.22, whoosh: 0.3, cork: 0.42, knock: 0.6, swell: 0.18, rumble: 0.22, smear: 0.4,
};
const MASTER = 1.0;

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let _seed = 99;
const rnd = () => ((_seed = (_seed * 16807) % 2147483647) / 2147483647);

function buf(ctx, sec, fn, ch = 1) {
  const n = Math.max(1, Math.floor(sec * ctx.sampleRate)), b = ctx.createBuffer(ch, n, ctx.sampleRate);
  for (let c = 0; c < ch; c++) { const d = b.getChannelData(c); fn(d, ctx.sampleRate, c); }
  return b;
}
// one-pole filters over a whole array
function lp(d, sr, f) { const a = Math.exp(-2 * Math.PI * f / sr); let y = 0; for (let i = 0; i < d.length; i++) { y = (1 - a) * d[i] + a * y; d[i] = y; } return d; }
function hp(d, sr, f) { const a = Math.exp(-2 * Math.PI * f / sr); let y = 0, x0 = 0; for (let i = 0; i < d.length; i++) { const x = d[i]; y = a * (y + x - x0); x0 = x; d[i] = y; } return d; }
function bp(d, sr, f) { return lp(hp(d, sr, f * 0.7), sr, f * 1.4); }
function norm(d, peak = 0.9) { let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < d.length; i++) d[i] *= peak / m; return d; }
const env = (t, a, dcy) => (t < a ? t / a : Math.exp(-(t - a) / dcy));

// the synthesized set (made once per AudioContext)
function synthAll(ctx) {
  const S = {};
  // the shutter: a dry mechanical click-clack (two clicks 45 ms apart, a little body thump)
  S.shutter = [0, 1].map(() => buf(ctx, 0.16, (d, sr) => {
    for (let i = 0; i < d.length; i++) { const t = i / sr; const n = rnd() * 2 - 1; d[i] = n * (env(t, 0.0005, 0.004) + 0.8 * env(Math.max(0, t - 0.045), 0.0005, 0.006) * (t > 0.045 ? 1 : 0)); }
    bp(d, sr, 3200); const body = new Float32Array(d.length); for (let i = 0; i < d.length; i++) { const t = i / sr; body[i] = Math.sin(2 * Math.PI * 180 * t) * env(t, 0.001, 0.012) * 0.5; }
    for (let i = 0; i < d.length; i++) d[i] += body[i]; norm(d, 0.9);
  }));
  // the flash: a bright soft "pop" (high-passed noise, very short)
  S.pop = [buf(ctx, 0.12, (d, sr) => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (rnd() * 2 - 1) * env(t, 0.002, 0.018); } hp(d, sr, 2500); lp(d, sr, 11000); norm(d, 0.8); })];
  // a tiny LED tick (the b-b-b-b pre-flashes)
  S.led = [buf(ctx, 0.04, (d, sr) => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(2 * Math.PI * 5200 * t) * env(t, 0.0003, 0.004); } norm(d, 0.7); })];
  // the Polaroid: a small motor whirr and the clunk of the print
  S.whir = [buf(ctx, 0.62, (d, sr) => {
    for (let i = 0; i < d.length; i++) { const t = i / sr; const motor = Math.sign(Math.sin(2 * Math.PI * (95 + 30 * t) * t)) * 0.3 + (rnd() * 2 - 1) * 0.4; const e = t < 0.45 ? Math.min(1, t / 0.03) * (0.7 + 0.3 * Math.sin(t * 70)) : 0; d[i] = motor * e; }
    bp(d, sr, 900); for (let i = 0; i < d.length; i++) { const t = i / sr - 0.48; if (t > 0) d[i] += Math.sin(2 * Math.PI * 140 * t) * env(t, 0.001, 0.03) * 0.8; } norm(d, 0.8);
  })];
  // champagne cork: a pop with a hollow tone
  S.cork = [buf(ctx, 0.3, (d, sr) => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(2 * Math.PI * (520 - 900 * t) * t) * env(t, 0.001, 0.03) + (rnd() * 2 - 1) * env(t, 0.0005, 0.01) * 0.6; } norm(d, 0.85); })];
  // fizz (the foam): soft, high
  S.fizz = [buf(ctx, 1.2, (d, sr) => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (rnd() < 0.02 ? (rnd() * 2 - 1) : 0) * Math.exp(-t * 2.2); } hp(d, sr, 4000); norm(d, 0.6); })];
  // a paper rip
  S.rip = [buf(ctx, 0.4, (d, sr) => { let a = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; a = rnd() < 0.15 ? rnd() : a * 0.97; d[i] = (rnd() * 2 - 1) * a * env(t, 0.02, 0.18); } bp(d, sr, 2200); norm(d, 0.8); })];
  // glaze crazing: a fast spread of tiny glass ticks
  S.crackle = [buf(ctx, 0.7, (d, sr) => { for (let i = 0; i < d.length; i++) { const t = i / sr; const p = 0.004 + 0.02 * (1 - t / 0.7); d[i] = rnd() < p ? (rnd() * 2 - 1) : 0; } hp(d, sr, 3500); for (let i = 0; i < d.length; i++) d[i] *= Math.min(1, i / (0.05 * sr)) * (1 - i / d.length); norm(d, 0.7); })];
  // a filtered whoosh
  S.whoosh = [buf(ctx, 0.45, (d, sr) => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (rnd() * 2 - 1) * Math.sin(Math.PI * Math.min(1, t / 0.45)) ** 2; } bp(d, sr, 1100); norm(d, 0.7); })];
  // a pill-bottle rattle (a shaker)
  S.rattle = [buf(ctx, 0.5, (d, sr) => { for (let i = 0; i < d.length; i++) { const t = i / sr; const shake = Math.max(0, Math.sin(2 * Math.PI * 9 * t)) ** 6; d[i] = (rnd() < 0.08 ? (rnd() * 2 - 1) : 0) * shake; } bp(d, sr, 4200); norm(d, 0.75); })];
  // a wooden knock from inside the casket
  S.knock = [buf(ctx, 0.25, (d, sr) => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = Math.sin(2 * Math.PI * 160 * t) * env(t, 0.001, 0.03) + Math.sin(2 * Math.PI * 410 * t) * env(t, 0.001, 0.012) * 0.5 + (rnd() * 2 - 1) * env(t, 0.0005, 0.004) * 0.4; } lp(d, sr, 2500); norm(d, 0.9); })];
  // the smeared shutter (a blurred photo): half-reversed, dry "tch"
  S.smear = [buf(ctx, 0.3, (d, sr) => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (rnd() * 2 - 1) * (t < 0.2 ? (t / 0.2) ** 3 : env(t - 0.2, 0.0005, 0.01)); } bp(d, sr, 2800); norm(d, 0.7); })];
  // a low warm swell (the sunrise)
  S.swell = [buf(ctx, 2.2, (d, sr) => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (rnd() * 2 - 1) * Math.sin(Math.PI * t / 2.2) ** 2; } lp(d, sr, 700); lp(d, sr, 900); norm(d, 0.6); })];
  // an engine rumble (hearses), looped by hand
  S.rumble = [buf(ctx, 1.6, (d, sr) => { for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (Math.sin(2 * Math.PI * 46 * t) * 0.6 + Math.sin(2 * Math.PI * 92 * t + Math.sin(t * 40)) * 0.3 + (rnd() * 2 - 1) * 0.25) * Math.sin(Math.PI * t / 1.6); } lp(d, sr, 380); norm(d, 0.8); })];
  return S;
}

export class Sounds {
  constructor(f) {
    this.f = f;
    this.ctx = f.audio && f.audio.ctx;
    this.out = f.audio && f.audio.sfx;
    this.b = {}; this.last = new Map();
  }
  async load() {
    if (!this.ctx) return;
    Object.assign(this.b, synthAll(this.ctx));
    await Promise.all(Object.entries(REC).map(async ([k, files]) => {
      const out = [];
      for (const fn of files) {
        try { const r = await fetch(DIR + fn + '.ogg'); if (!r.ok) continue; out.push(await this.ctx.decodeAudioData(await r.arrayBuffer())); } catch (e) { /* a missing layer is left out */ }
      }
      if (out.length) this.b[k] = out;
    }));
  }
  pan(x) { return this.f.pan ? this.f.pan(x ?? 0) : 0; }
  // tools/mix-report.mjs names the shared library's sounds; these go straight to the bus, so they say who they are
  // too ('a4-<name>'). Only while that measurement runs (window.__mix); nothing otherwise.
  _log(name) { const M = typeof window !== 'undefined' ? window.__mix : null; if (M && M.calls) M.calls.push([+((this.f && this.f.t) || 0).toFixed(3), 'a4-' + name, 'track']); }

  // play a buffer: { x (pans), pan, gain, rate, delay (s), gate (s: skip if the same sound started closer than this) }
  play(name, o = {}) {
    const list = this.b[name]; if (!list || !this.ctx || !this.out) return null;
    const now = this.ctx.currentTime;
    const gate = o.gate ?? 0.03;
    const l = this.last.get(name) || -9;
    if (now + (o.delay || 0) - l < gate) return null;
    this.last.set(name, now + (o.delay || 0));
    this._log(name);
    const src = this.ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = (o.rate ?? 1) * (o.jitter === false ? 1 : 1 + (Math.random() - 0.5) * 0.06);
    const g = this.ctx.createGain(); g.gain.value = (o.gain ?? 1) * (LEVEL[name] ?? 0.4) * MASTER;
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (p) p.pan.value = Math.max(-1, Math.min(1, o.pan ?? (o.x !== undefined ? this.pan(o.x) : 0)));
    src.connect(g); if (p) { g.connect(p); p.connect(this.out); } else g.connect(this.out);
    src.start(now + (o.delay || 0));
    return { src, g };
  }

  // ---------- tonal: notes from the chord that's sounding ----------
  chord(t = this.f.t) {
    const c = this.f.chords; if (!c || !c.beats || !this.f.bm) return [11, 'maj'];
    const i = Math.max(0, Math.min(c.beats.length - 1, Math.floor(this.f.bm.beatAt(t))));
    return c.beats[i];
  }
  // chord tone: step 0 root, 1 third, 2 fifth, 3 octave; oct: octave of the root (5 = around C5)
  note(step = 0, oct = 5, t) {
    const [root, q] = this.chord(t);
    const iv = [0, q === 'min' ? 3 : 4, 7, 12][((step % 4) + 4) % 4] + 12 * Math.floor(step / 4);
    return midiHz(12 * (oct + 1) + root + iv);
  }
  // a sine/tri blip through the bus (live oscillators: small, exact pitch)
  tone(freq, { dur = 0.12, type = 'sine', gain = 1, x, pan, delay = 0, attack = 0.004, glide = 0, name = 'chime' } = {}) {
    if (!this.ctx || !this.out) return;
    this._log(name);
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), t0 + dur);
    const g = this.ctx.createGain(); const lvl = gain * (LEVEL[name] ?? 0.2) * MASTER;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(lvl, t0 + attack); g.gain.exponentialRampToValueAtTime(Math.max(1e-4, lvl * 0.001), t0 + dur);
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (p) p.pan.value = Math.max(-1, Math.min(1, pan ?? (x !== undefined ? this.pan(x) : 0)));
    o.connect(g); if (p) { g.connect(p); p.connect(this.out); } else g.connect(this.out);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  // the focus-assist chirp: the chord's root, then its fifth
  chirp(step, x) { this.tone(this.note(step === 1 ? 2 : 0, 6), { dur: 0.07, type: 'sine', x, name: 'chirp' }); }
  // the flash capacitor: a thin rise, 2 -> 6 kHz over `dur`, very quiet, panned to her
  whine(dur, x, gain = 1) {
    if (!this.ctx || !this.out || dur <= 0.05) return;
    this._log('whine');
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(2000, t0); o.frequency.exponentialRampToValueAtTime(6000, t0 + dur);
    const g = this.ctx.createGain(); const lvl = 0.012 * gain * MASTER;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(lvl, t0 + dur * 0.8); g.gain.linearRampToValueAtTime(0, t0 + dur);
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null; if (p) p.pan.value = this.pan(x);
    o.connect(g); if (p) { g.connect(p); p.connect(this.out); } else g.connect(this.out);
    o.start(t0); o.stop(t0 + dur + 0.02);
    this._whine = { o, g, t0 };
  }
  stopWhine() { if (this._whine && this.ctx) { const w = this._whine; try { w.g.gain.cancelScheduledValues(this.ctx.currentTime); w.g.gain.setValueAtTime(0, this.ctx.currentTime); w.o.stop(); } catch (e) { /* gone */ } this._whine = null; } }
  // a music-box tine on a chord tone (her notes); caught: a gold chime an octave up
  tine(step, x) { this.tone(this.note(step, 6), { dur: 0.6, type: 'triangle', x, name: 'tine', attack: 0.002 }); }
  chime(x) { this.tone(this.note(0, 7), { dur: 0.5, type: 'sine', x, name: 'chime' }); this.tone(this.note(2, 7), { dur: 0.45, type: 'sine', x, delay: 0.05, name: 'chime', gain: 0.7 }); }
  // the map-app ping: two notes in key
  ping(x) { this.tone(this.note(2, 6), { dur: 0.16, x, name: 'ping' }); this.tone(this.note(0, 7), { dur: 0.3, x, delay: 0.11, name: 'ping' }); }
  // a hearse's horn: a soft minor third in key, 0.3 s, from its side
  // (triangle, not sawtooth: at full tilt it sounds every two beats and must not buzz)
  horn(x) { const r = this.note(0, 3); this.tone(r, { dur: 0.3, type: 'triangle', x, name: 'horn', attack: 0.02 }); this.tone(r * Math.pow(2, 3 / 12), { dur: 0.3, type: 'triangle', x, name: 'horn', attack: 0.02, gain: 0.8 }); }
  // a low whump under a band, in key
  whump(x) { this.tone(this.note(0, 1), { dur: 0.32, type: 'sine', x, name: 'whump', attack: 0.006, glide: 0.6 }); this.play('soil', { x, gain: 0.35 }); }
  // mic feedback (short, controlled)
  feedback(x, dur = 0.15) { this.tone(this.note(2, 6), { dur, type: 'sine', x, name: 'feedback', attack: dur * 0.6 }); }
  // the shutter and the flash pop
  snap(x, big = false) { this.play('shutter', { x, gain: big ? 1.1 : 1 }); this.play('click', { x, gain: 0.5, delay: 0.002 }); this.play('pop', { x, gain: big ? 1.15 : 0.9, delay: 0.005 }); }
  heel(x, turf) { this.play(turf ? 'heelGrass' : 'heel', { x, rate: turf ? 1.2 : 1.6, gain: 0.8, gate: 0.08 }); }
}
