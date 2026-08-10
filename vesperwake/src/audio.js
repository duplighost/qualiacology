/* audio.js — procedural sound. No files, no loading, no licences.
 *
 * The chapter music is a slow chaconne on a bell-like FM voice; the combat
 * sounds are short noise + resonant-filter hits so a whip reads as iron and a
 * guard reads as a bell being struck by mistake.
 */

/* `lift` equalises the three chapters. Measured on the master bus, chapter I
 * peaked at 0.12 and chapter III at 0.025 for identical gains — a low root
 * through an FM bell simply puts less energy where a meter (or an ear) reads
 * it. The multiplier is tuned against that measurement, not guessed. */
const SCALES = [
  /* I  Wake Orchard — aeolian on D */
  { root: 146.83, steps: [0, 3, 5, 7, 10, 12], bpm: 66, bass: [0, -2, -4, -5], lift: 1 },
  /* II Drowned Reliquary — dorian on A, slower */
  { root: 110.0, steps: [0, 2, 3, 7, 9, 10], bpm: 58, bass: [0, -3, 2, -5], lift: 2.7 },
  /* III Meridian Belfry — phrygian on E, driving */
  { root: 164.81, steps: [0, 1, 5, 7, 8, 12], bpm: 82, bass: [0, 1, -4, -2], lift: 3.1 },
];

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.noise = null;
    this.muted = false;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.levelIndex = 0;
    this.playingMusic = false;
  }

  ensure() {
    if (this.ctx && this.ctx.state !== 'closed') return this.ctx;
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain(); master.gain.value = this.muted ? 0 : 0.58;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 20; comp.ratio.value = 5;
    const music = ctx.createGain(); music.gain.value = 0.42;
    const sfx = ctx.createGain(); sfx.gain.value = 0.86;
    music.connect(comp); sfx.connect(comp); comp.connect(master); master.connect(ctx.destination);

    const len = Math.floor(ctx.sampleRate * 1.2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;

    this.ctx = ctx; this.master = master; this.musicBus = music; this.sfxBus = sfx; this.noise = buf;
    return ctx;
  }

  async unlock() {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch { /* ignore */ } }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.58, this.ctx.currentTime, 0.02);
  }

  isMuted() { return this.muted; }

  /* ---- primitives ---- */

  _noise({ start, dur, gain, type = 'bandpass', freq = 1400, q = 1.4, sweepTo = null }) {
    const ctx = this.ctx; if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(60, sweepTo), start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(start); src.stop(start + dur + 0.02);
  }

  _tone({ start, dur, freq, gain = 0.12, type = 'sine', to = null, bus = null, detune = 0 }) {
    const ctx = this.ctx; if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(start); o.stop(start + dur + 0.03);
  }

  /* An FM bell — the voice the whole game is tuned around. */
  _bell({ start, freq, dur = 2.2, gain = 0.1, bus = null, ratio = 2.76, index = 320 }) {
    const ctx = this.ctx; if (!ctx) return;
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    car.frequency.value = freq;
    mod.frequency.value = freq * ratio;
    modGain.gain.setValueAtTime(index, start);
    modGain.gain.exponentialRampToValueAtTime(1, start + dur * 0.55);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    mod.connect(modGain); modGain.connect(car.frequency);
    car.connect(g); g.connect(bus || this.sfxBus);
    mod.start(start); car.start(start);
    mod.stop(start + dur + 0.05); car.stop(start + dur + 0.05);
  }

  /* ---- effects ---- */

  play(name, param = 1) {
    const ctx = this.ensure();
    if (!ctx || ctx.state === 'closed') return;
    if (ctx.state === 'suspended') return;
    const t = ctx.currentTime + 0.001;
    switch (name) {
      /* These gains are measured on the master bus with an analyser, not
       * guessed, because nobody involved in writing this could hear it.
       *
       * The finding worth keeping: at a FIXED gain, a noise burst through
       * Q 1.1 comes out about three times quieter than through Q 0.7 — a
       * narrow bandpass throws most of the burst away. So every percussive
       * sound here is filtered wide and given a tuned body underneath, and
       * the mix test in tests/run.mjs holds the whole set inside one range. */
      case 'whip':
        this._noise({ start: t, dur: 0.12, gain: 0.30, freq: 2600 * param, sweepTo: 700, q: 0.7 });
        this._tone({ start: t, dur: 0.10, freq: 320 * param, to: 130, gain: 0.06, type: 'triangle' });
        break;
      case 'whipLow':
        this._noise({ start: t, dur: 0.13, gain: 0.30, freq: 1500, sweepTo: 420, q: 0.75 });
        this._tone({ start: t, dur: 0.11, freq: 210, to: 96, gain: 0.06, type: 'triangle' });
        break;
      case 'whipDive':
        this._noise({ start: t, dur: 0.20, gain: 0.30, freq: 900, sweepTo: 2600, q: 0.9 });
        this._tone({ start: t, dur: 0.18, freq: 260, to: 620, gain: 0.05, type: 'triangle' });
        break;
      case 'hit':
        this._noise({ start: t, dur: 0.09, gain: 0.22, freq: 900, sweepTo: 220, q: 0.7 });
        this._tone({ start: t, dur: 0.10, freq: 190, gain: 0.12, type: 'triangle', to: 90 });
        break;
      case 'heavy':
        this._noise({ start: t, dur: 0.16, gain: 0.26, freq: 620, sweepTo: 130, q: 0.8 });
        this._bell({ start: t, freq: 130, dur: 0.9, gain: 0.09, index: 420 });
        break;
      case 'guard':
        this._bell({ start: t, freq: 720, dur: 0.7, gain: 0.11, ratio: 3.9, index: 500 });
        this._noise({ start: t, dur: 0.07, gain: 0.16, freq: 3800, q: 2.2 });
        break;
      case 'kill':
        this._noise({ start: t, dur: 0.26, gain: 0.20, freq: 1400, sweepTo: 160, q: 0.7 });
        this._bell({ start: t, freq: 300, dur: 1.3, gain: 0.08 });
        break;
      case 'jump': this._tone({ start: t, dur: 0.13, freq: 300, to: 560, gain: 0.10, type: 'triangle' }); break;
      case 'land':
        this._noise({ start: t, dur: 0.09, gain: 0.22 * param, freq: 420, sweepTo: 130, q: 0.9 });
        this._tone({ start: t, dur: 0.08, freq: 150, to: 70, gain: 0.05 * param, type: 'sine' });
        break;
      case 'step': this._noise({ start: t, dur: 0.16, gain: 0.20, freq: 5200, sweepTo: 1400, q: 0.9 }); break;
      case 'perfect':
        this._bell({ start: t, freq: 1174, dur: 1.1, gain: 0.10, ratio: 1.41, index: 180 });
        this._tone({ start: t, dur: 0.22, freq: 1760, to: 2640, gain: 0.05, type: 'sine' });
        break;
      case 'pogo':
        this._tone({ start: t, dur: 0.16, freq: 420, to: 880, gain: 0.09, type: 'square' });
        this._noise({ start: t, dur: 0.08, gain: 0.12, freq: 2400, q: 1.6 });
        break;
      case 'tell': this._tone({ start: t, dur: 0.16, freq: 420 * param, to: 620 * param, gain: 0.075, type: 'sine' }); break;
      case 'hurt':
        this._noise({ start: t, dur: 0.24, gain: 0.22, freq: 700, sweepTo: 120, q: 0.6 });
        this._tone({ start: t, dur: 0.3, freq: 140, to: 70, gain: 0.10, type: 'sawtooth' });
        break;
      case 'pounce': this._noise({ start: t, dur: 0.18, gain: 0.32, freq: 700, sweepTo: 1900, q: 0.7 }); break;
      case 'dive': this._tone({ start: t, dur: 0.24, freq: 900, to: 300, gain: 0.09, type: 'sawtooth' }); break;
      case 'thrust': this._noise({ start: t, dur: 0.10, gain: 0.26, freq: 4200, sweepTo: 1800, q: 1.4 }); break;
      case 'shard': this._tone({ start: t, dur: 0.2, freq: 1400, to: 2100, gain: 0.10, type: 'triangle' }); break;
      case 'noteHigh': this._bell({ start: t, freq: 880, dur: 1.1, gain: 0.07, ratio: 2.1 }); break;
      case 'noteLow': this._bell({ start: t, freq: 220, dur: 1.4, gain: 0.08, ratio: 1.7 }); break;
      case 'slam':
        this._noise({ start: t, dur: 0.3, gain: 0.26, freq: 380, sweepTo: 70, q: 0.7 });
        this._bell({ start: t, freq: 98, dur: 1.6, gain: 0.10, index: 520 });
        break;
      case 'bellSwing': this._bell({ start: t, freq: 392, dur: 1.0, gain: 0.08, ratio: 2.4 }); break;
      case 'anchor': this._noise({ start: t, dur: 0.14, gain: 0.22, freq: 1100, sweepTo: 300, q: 0.75 }); break;
      case 'crumble': this._noise({ start: t, dur: 0.4, gain: 0.28, freq: 900, sweepTo: 260, q: 0.6 }); break;
      case 'break':
        this._noise({ start: t, dur: 0.3, gain: 0.20, freq: 2200, sweepTo: 300, q: 0.8 });
        break;
      case 'pickup':
        this._bell({ start: t, freq: 1046, dur: 0.9, gain: 0.09, ratio: 2.0, index: 140 });
        this._bell({ start: t + 0.08, freq: 1568, dur: 0.9, gain: 0.06, ratio: 2.0, index: 120 });
        break;
      case 'checkpoint':
        for (let i = 0; i < 3; i += 1) {
          this._bell({ start: t + i * 0.17, freq: [523, 659, 784][i], dur: 1.9, gain: 0.09, ratio: 2.0, index: 200 });
        }
        break;
      case 'door': this._bell({ start: t, freq: 174, dur: 2.6, gain: 0.085, index: 600 }); break;
      case 'toll':
        this._bell({ start: t, freq: 73.4, dur: 4.2, gain: 0.115, ratio: 2.76, index: 900 });
        this._bell({ start: t + 0.02, freq: 110, dur: 3.4, gain: 0.07, ratio: 3.1, index: 700 });
        break;
      default: break;
    }
  }

  /* ---- music ---- */

  startMusic(levelIndex) {
    this.stopMusic();
    const ctx = this.ensure();
    if (!ctx) return;
    this.levelIndex = levelIndex % SCALES.length;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.08;
    this.playingMusic = true;
    this._schedule();
    this.timer = window.setInterval(() => this._schedule(), 110);
  }

  stopMusic() {
    if (this.timer !== null) { window.clearInterval(this.timer); this.timer = null; }
    this.playingMusic = false;
  }

  _schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.playingMusic) return;
    const cfg = SCALES[this.levelIndex];
    const beat = 60 / cfg.bpm / 2;
    const horizon = ctx.currentTime + 0.4;
    if (this.nextTime < ctx.currentTime - 0.3) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < horizon) {
      const s = this.step;
      const t = this.nextTime;
      /* bass every four */
      if (s % 8 === 0) {
        const semis = cfg.bass[(s / 8) % cfg.bass.length];
        this._bell({ start: t, freq: cfg.root * 0.5 * (2 ** (semis / 12)), dur: 3.6, gain: 0.075 * cfg.lift, ratio: 2.0, index: 240, bus: this.musicBus });
      }
      /* a sparse upper voice */
      if (s % 4 === 2 || (s % 16 === 7)) {
        const pick = cfg.steps[(s * 3 + this.levelIndex) % cfg.steps.length];
        this._bell({
          start: t, freq: cfg.root * 2 * (2 ** (pick / 12)),
          dur: 1.9, gain: 0.035 * cfg.lift, ratio: 2.76, index: 120, bus: this.musicBus,
        });
      }
      this.nextTime += beat;
      this.step += 1;
    }
  }
}
