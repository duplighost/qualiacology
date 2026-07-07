// ── VESPERBANE · audio.js ────────────────────────────────────────────
// Procedural WebAudio: SFX synth + adaptive chip-tune loop.
// Music gains layers as the player's VELOCITY tier rises.
'use strict';

class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    // scheduler state
    this.tempo = 138;
    this.step = 0;          // 16th-note counter
    this.nextTime = 0;
    this.intensity = 0;     // 0..3, from velocity tier
    this.started = false;
  }

  // must be called from a user gesture
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return; }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.34;
    this.musicGain.connect(this.master);
    this.nextTime = this.ctx.currentTime + 0.1;
    this.started = true;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    return this.muted;
  }

  // ── low-level voices ──────────────────────────────────────────────
  tone(freq, dur, type, vol, dest, slideTo, when) {
    if (!this.ctx || this.muted) return;
    const t = when !== undefined ? when : this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, vol, filterFreq, dest, when) {
    if (!this.ctx || this.muted) return;
    const t = when !== undefined ? when : this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = filterFreq || 800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    src.start(t);
  }

  // ── SFX vocabulary ────────────────────────────────────────────────
  sfx(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'jump':    this.tone(240, 0.12, 'square', 0.12, null, 460); break;
      case 'dash':    this.noise(0.16, 0.22, 1400); this.tone(180, 0.14, 'sawtooth', 0.07, null, 90); break;
      case 'slash':   this.noise(0.08, 0.20, 2600); this.tone(700, 0.06, 'square', 0.06, null, 300); break;
      case 'hit':     this.tone(200, 0.09, 'square', 0.16, null, 110); this.noise(0.06, 0.15, 900); break;
      case 'kill':    this.tone(160, 0.22, 'square', 0.18, null, 55); this.noise(0.18, 0.2, 500); break;
      case 'hurt':    this.tone(310, 0.24, 'sawtooth', 0.2, null, 70); this.noise(0.2, 0.16, 400); break;
      case 'death':   this.tone(300, 0.8, 'sawtooth', 0.22, null, 40); this.noise(0.5, 0.15, 300); break;
      case 'pickup':  this.tone(660, 0.08, 'square', 0.09, null, 990);
                      this.tone(990, 0.10, 'square', 0.07, null, 1320); break;
      case 'heart':   this.tone(520, 0.12, 'triangle', 0.16, null, 780);
                      this.tone(780, 0.18, 'triangle', 0.13, null, 1040); break;
      case 'candle':  this.tone(1200, 0.06, 'square', 0.07, null, 1800); this.noise(0.05, 0.1, 3000); break;
      case 'tier':    this.tone(440, 0.09, 'square', 0.1, null, 880);
                      this.tone(880, 0.12, 'square', 0.08, null, 1320); break;
      case 'check':   this.tone(392, 0.25, 'triangle', 0.14);
                      this.tone(494, 0.25, 'triangle', 0.12);
                      this.tone(587, 0.4, 'triangle', 0.12); break;
      case 'pogo':    this.tone(300, 0.1, 'square', 0.12, null, 600); break;
      case 'wallkick':this.noise(0.08, 0.14, 1800); this.tone(320, 0.08, 'square', 0.08, null, 480); break;
      case 'bell':    this.bell(220, 2.6, 0.5); break;
      case 'bellFinal': this.bell(220, 4.5, 0.6); this.bell(330, 4.5, 0.3); this.bell(110, 5, 0.4); break;
    }
  }

  bell(freq, dur, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    // inharmonic partials give the bell body
    const partials = [[1, 1], [2.01, 0.55], [2.74, 0.35], [3.76, 0.22], [5.4, 0.1]];
    for (const [ratio, amp] of partials) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * ratio;
      g.gain.setValueAtTime(vol * amp * 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.0006, t + dur * (1 - ratio * 0.08));
      o.connect(g); g.connect(this.sfxGain);
      o.start(t); o.stop(t + dur);
    }
  }

  // ── adaptive music loop ───────────────────────────────────────────
  // 32-step (2 bar) pattern in A minor, layered by intensity.
  update() {
    if (!this.ctx || this.muted) return;
    const spb = 60 / this.tempo / 4; // seconds per 16th
    // catch-up clamp: after a hidden tab (rAF paused, ctx clock kept
    // running) drop the backlog instead of replaying thousands of notes
    if (this.nextTime < this.ctx.currentTime) {
      const behind = Math.ceil((this.ctx.currentTime - this.nextTime) / spb);
      this.step += behind;                       // keep the pattern grid aligned
      this.nextTime += behind * spb;
    }
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.scheduleStep(this.step % 64, this.nextTime);
      this.nextTime += spb;
      this.step++;
    }
  }

  scheduleStep(s, t) {
    const A1 = 55, A2 = 110;
    // bass: brooding 8th pulse, root movement Am -> F -> C -> E
    const bassRoots = [A2, A2, 87.31, 87.31, 65.41, 65.41, 82.41, 82.41]; // per half-bar
    const half = Math.floor(s / 8);
    if (s % 2 === 0) {
      const f = bassRoots[half] * (s % 8 === 6 ? 1.5 : 1);
      this.tone(f, 0.11, 'square', 0.10, this.musicGain, null, t);
      this.tone(f / 2, 0.13, 'triangle', 0.12, this.musicGain, null, t);
    }
    // lead arpeggio at intensity >= 1
    if (this.intensity >= 1) {
      const arp = [220, 261.6, 329.6, 440, 329.6, 261.6, 220, 174.6,
                   220, 261.6, 349.2, 440, 523.3, 440, 349.2, 261.6];
      if (s % 2 === 1) {
        const f = arp[(s >> 1) % 16] * (this.intensity >= 3 ? 2 : 1);
        this.tone(f, 0.1, 'triangle', 0.055 + this.intensity * 0.01, this.musicGain, null, t);
      }
    }
    // hats at intensity >= 2
    if (this.intensity >= 2 && s % 2 === 0) {
      this.noise(0.03, s % 8 === 4 ? 0.05 : 0.028, 6000, this.musicGain, t);
    }
    // distant toll every 2 bars at low intensity, for atmosphere
    if (s === 0 && this.intensity === 0 && (this.step % 128 === 0)) {
      this.bell(110, 3, 0.12);
    }
  }
}

const audio = new AudioSys();
