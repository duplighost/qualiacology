/* Sound.
 *
 * A warm bed in D that thickens with your speed, a bowed layer that tracks
 * rope tension, and a brush hit on every single paw that lands — so the dog
 * is audibly playing the drums and the groove of the music is the rhythm of
 * its stride. Nothing is a stinger; nothing announces anything. */

import { Audio, hz } from './audio.js';
import { C, PX } from './config.js';
import { clamp, lerp } from './feel.js';

/* D dorian-ish. Warm, unresolved, walks forever. */
const ROOT = 50;                                   // D3
const SCALE = [0, 2, 3, 5, 7, 9, 10];
const CHORDS = [[0, 3, 7], [-2, 2, 5], [3, 7, 10], [-4, 0, 3]];

/* What a paw sounds like on each of the five things you walk across, and how
 * much the place around you rings. The renderer has switched the surface three
 * ways since the first day; the ear was never told. */
const SURFACE = {
  street:   { type: 'bandpass', freq: 1500, q: 1.1, dur: 1.0,  gain: 1.0,  send: 0.16 },
  crossing: { type: 'bandpass', freq: 1600, q: 1.1, dur: 1.0,  gain: 1.0,  send: 0.20 },
  park:     { type: 'lowpass',  freq: 700,  q: 0.8, dur: 1.45, gain: 0.62, send: 0.07 },
  viaduct:  { type: 'bandpass', freq: 1900, q: 2.2, dur: 0.85, gain: 1.05, send: 0.55 },
  beach:    { type: 'lowpass',  freq: 500,  q: 0.7, dur: 1.6,  gain: 0.55, send: 0.04 },
};

export class Sound {
  constructor() {
    this.a = new Audio();
    this.a.setTempo(C.audio.tempo);
    this.ready = false;
    this.tension = 0;
    this.bar = 0;
    this._paw = 0;
    this._step = 0;
  }

  boot() {
    if (this.ready) return;
    this.a.boot();
    if (!this.a.ready) return;
    this.ready = true;
    const A = this.a;

    /* Layer 1: a low pad that breathes on the bar. Always present once the
     * afternoon starts moving. */
    this.pad = A.addLayer((step, t, dest) => {
      if (step % 16 !== 0) return;
      const ch = CHORDS[(step / 16 | 0) % CHORDS.length];
      this.bar++;
      for (const n of ch) {
        A.tone(t, {
          freq: hz(ROOT + n), dur: 2.6, type: 'triangle', gain: 0.055,
          attack: 0.35, release: 2.2, dest, filter: { type: 'lowpass', freq: 900, to: 500 }
        });
        A.tone(t, {
          freq: hz(ROOT + 12 + n), dur: 2.4, type: 'sine', gain: 0.030,
          attack: 0.5, release: 1.9, dest
        });
      }
    }, 0.9);

    /* Layer 2: a plucked figure, in at a trot. */
    this.arp = A.addLayer((step, t, dest) => {
      const s = step % 16;
      if (s % 2 !== 0) return;
      const ch = CHORDS[(step / 16 | 0) % CHORDS.length];
      const seq = [0, 2, 1, 2, 0, 1, 2, 1];
      const n = ch[seq[(s / 2) | 0] % ch.length];
      A.pluck(t, hz(ROOT + 12 + n), { gain: 0.10, dur: 0.55, dest, bright: 6 });
    }, 0.95);

    /* Layer 3: a lead that only exists when you are actually flying. */
    this.lead = A.addLayer((step, t, dest) => {
      const s = step % 32;
      const fig = [0, null, 4, null, 7, null, 4, 2, null, null, 7, null, 9, null, 7, 4];
      const n = fig[(s / 2) | 0];
      if (s % 2 !== 0 || n == null) return;
      A.tone(t, {
        freq: hz(ROOT + 24 + SCALE[n % 7] + (n >= 7 ? 12 : 0)), dur: 0.4,
        type: 'triangle', gain: 0.075, attack: 0.01, release: 0.45, dest,
        filter: { type: 'lowpass', freq: 3600, to: 1600 }
      });
    }, 0.85);

    /* Tension: a bowed swell whose gain is the rope. It is not music — it is
     * the leash, and it is the only voice that answers the player's finger. */
    this.bow = A.addLayer((step, t, dest) => {
      if (step % 8 !== 0) return;
      A.tone(t, {
        freq: hz(ROOT + 7), dur: 1.4, type: 'sawtooth', gain: 0.09,
        attack: 0.18, release: 1.2, dest,
        filter: { type: 'lowpass', freq: 700, to: 380, q: 4 }
      });
    }, 1.0);

    A.layerOn(this.pad, 1.6);
  }

  update(dt, game) {
    /* The two things the one-shots need to know: what is sounding under them,
     * and how the day has gone. Read here so a bell never has to guess. */
    this._trust = game.brain ? game.brain.trust : 0.5;

    /* Walk into the room rather than switch to it. A stone deck twenty metres
     * over open water should ring; grass and sand should swallow everything. */
    const ch = game.world.chapterAt(game.kid.x).id;
    if (ch !== this._room) {
      this._room = ch;
      const sf = SURFACE[ch];
      const AA = this.a;
      if (sf && AA.bus.world) AA.bus.world.send.gain.setTargetAtTime(sf.send, AA.now(), 2.0);
    }
    this._chord = CHORDS[((this.a.step / 16) | 0) % CHORDS.length];
    if (!this.ready) return;
    const A = this.a;
    const sp = Math.abs(game.kid.vx) / PX;
    const [a, b, c] = C.audio.layerSpeeds;

    setLayer(A, this.arp, sp > a || game.leash.towing > 0.3);
    setLayer(A, this.lead, sp > b);

    /* The bowed layer is the rope, continuously. */
    const want = game.unclipped ? 0 : clamp(game.leash.strain * 1.15, 0, 1);
    if (this.bow) {
      if (want > 0.05 && !this.bow.on) A.layerOn(this.bow, 0.25, want);
      else if (want <= 0.05 && this.bow.on) A.layerOff(this.bow, 0.5);
      else if (this.bow.on) this.bow.gain.gain.setTargetAtTime(want * 0.9, A.now(), 0.06);
    }

    /* Off the leash, the music opens out: the low pad stays, the busy layers
     * thin, and the sea comes up. That change is the ending's only fanfare. */
    if (game.unclipped && !this._opened) {
      this._opened = true;
      A.bus.music.send.gain.setTargetAtTime(0.42, A.now(), 1.2);
    }
  }

  /* --- one-shots --------------------------------------------------------
   * Every one of these exists because silence reads as broken. Any action
   * the player takes that does not qualify still answers. */

  first() { this.boot(); }

  /* A footfall. The old rate gate threw away every hit inside 35 ms, which is
   * precisely the paired beats that make a gallop a gallop rather than an even
   * patter — half the dog's feet never landed. Now a close second hit reads as
   * a flam instead of vanishing, and each paw gets a body under the noise:
   * this animal weighs thirty-eight kilos and it should not sound like a hiss.
   * Hinds are pitched lower than fronts, because the hinds are the drive. */
  paw(speed, leg = 0, pan = 0) {
    if (!this.ready) return;
    const now = this.a.now();
    const gap = now - this._paw;
    if (gap < 0.008) return;
    this._paw = now;
    const flam = clamp(gap / 0.05, 0.45, 1);
    const g = clamp(0.03 + speed * 0.022, 0.02, 0.13) * flam;
    /* What it is standing on. Pavement rings; grass and sand are dead and
     * soft; stone is bright and tight. */
    const SF = SURFACE[this._room] || SURFACE.street;
    this.a.noise(now + 0.004, {
      dur: 0.075 * SF.dur, gain: g * SF.gain, type: SF.type,
      freq: SF.freq + speed * 40, q: SF.q, bus: 'world', pan
    });
    this.a.tone(now + 0.004, {
      freq: leg < 2 ? 78 : 62, dur: 0.085, type: 'sine',
      gain: (0.018 + speed * 0.009) * flam, bus: 'world', pan
    });
  }

  /* A shoe on pavement. Softer and higher than a paw, and rate-limited only
   * enough to stop a same-frame double. */
  step(speed, pan = 0) {
    if (!this.ready) return;
    const now = this.a.now();
    if (now - this._step < 0.05) return;
    this._step = now;
    const g = clamp(0.012 + speed * 0.007, 0.010, 0.05);
    this.a.noise(now + 0.003, {
      dur: 0.05, gain: g, type: 'bandpass', freq: 2400, q: 1.6, bus: 'world', pan
    });
    this.a.tone(now + 0.003, {
      freq: 104, dur: 0.05, type: 'sine', gain: g * 0.5, bus: 'world', pan
    });
  }

  land(v, pan = 0) {
    if (!this.ready) return;
    const t = this.a.now() + 0.004;
    this.a.noise(t, { dur: 0.16, gain: 0.06 + v * 0.14, type: 'lowpass', freq: 900, to: 200, bus: 'world', pan });
    this.a.tone(t, { freq: 90, dur: 0.14, type: 'sine', gain: 0.10 + v * 0.16, bus: 'world', pan });
  }

  jump(pan = 0) {
    if (!this.ready) return;
    this.a.noise(this.a.now() + 0.004, { dur: 0.10, gain: 0.05, type: 'highpass', freq: 900, bus: 'world', pan });
  }

  /* The rope arresting. A creak, a thump, and a duck of the music, so the
   * moment the leash takes over you hear the whole afternoon lean. */
  bite(amt, pan = 0) {
    if (!this.ready) return;
    const t = this.a.now() + 0.004;
    this.a.noise(t, { dur: 0.20, gain: 0.10 * amt, type: 'bandpass', freq: 340, to: 180, q: 6, bus: 'sfx', pan });
    this.a.tone(t, { freq: 150, dur: 0.22, type: 'triangle', gain: 0.16 * amt, glide: 0.45, bus: 'sfx', pan });
    this.a.duck('music', 1 - 0.35 * amt, 0.30);
  }

  strain() {
    if (!this.ready) return;
    this.a.tone(this.a.now() + 0.004, {
      freq: 120, dur: 1.1, type: 'sawtooth', gain: 0.10, attack: 0.2, release: 0.9,
      filter: { type: 'lowpass', freq: 500, to: 260, q: 5 }, bus: 'sfx'
    });
  }

  cough(pan = 0) {
    if (!this.ready) return;
    const t = this.a.now() + 0.004;
    this.a.noise(t, { dur: 0.13, gain: 0.13, type: 'bandpass', freq: 620, to: 300, q: 3, bus: 'sfx', pan });
    this.a.tone(t + 0.02, { freq: 210, dur: 0.10, type: 'sawtooth', gain: 0.07, glide: 0.6, bus: 'sfx', pan });
  }

  /* Closing your hand on a leash. Leather and a clip; opening it is the same
   * sound backwards, softer, plus the whir of rope paying out. */
  grip(on, pan = 0) {
    if (!this.ready) return;
    const t = this.a.now() + 0.004;
    if (on) {
      this.a.noise(t, { dur: 0.055, gain: 0.10, type: 'bandpass', freq: 2600, to: 1500, q: 5, bus: 'sfx', pan });
      this.a.tone(t, { freq: 240, dur: 0.07, type: 'triangle', gain: 0.05, glide: 0.7, bus: 'sfx', pan });
    } else {
      this.a.noise(t, { dur: 0.20, gain: 0.055, type: 'bandpass', freq: 900, to: 2400, q: 1.6, bus: 'sfx', pan });
    }
  }

  /* The look-back has no sound of its own — that is the point. What it gets
   * is one clean bell far down in the mix, quiet enough to be felt and not
   * noticed, so it never becomes a chime you farm. */
  lookBack() {
    if (!this.ready) return;
    /* It checks on you perhaps a hundred and thirty times in an afternoon. As
     * one fixed note that is a metronome; climbing, it is the arc of the day.
     * Only the pitch moves — a bell that also got louder would be a score. */
    const step = [19, 19, 24, 26, 31][Math.min(4, Math.floor((this._trust || 0.5) * 5))];
    this.a.bell(this.a.now() + 0.01, hz(ROOT + step), { gain: 0.030, dur: 2.4, bus: 'music' });
  }

  sync() {
    if (!this.ready) return;
    const t = this.a.now() + 0.005;
    this.a.bell(t, hz(ROOT + 24), { gain: 0.09, dur: 1.8 });
    this.a.bell(t + 0.06, hz(ROOT + 31), { gain: 0.06, dur: 1.6 });
  }

  arrive(pan = 0) {
    if (!this.ready) return;
    const c = this._chord || CHORDS[0];
    this.a.pluck(this.a.now() + 0.005, hz(ROOT + 24 + c[(this.a.step | 0) % 3]), { gain: 0.09, dur: 0.7, bus: 'sfx', pan });
  }

  flock(pan = 0) {
    if (!this.ready) return;
    const t = this.a.now();
    for (let i = 0; i < 14; i++) {
      this.a.noise(t + i * 0.028 + Math.random() * 0.02, {
        dur: 0.08, gain: 0.05, type: 'bandpass', freq: 1400 + Math.random() * 2200, q: 3, bus: 'world'
      });
    }
  }

  honk(isCar, pan = 0) {
    if (!this.ready) return;
    const t = this.a.now() + 0.005;
    if (isCar) {
      this.a.tone(t, { freq: 330, dur: 0.34, type: 'square', gain: 0.06, bus: 'world', pan });
      this.a.tone(t, { freq: 415, dur: 0.34, type: 'square', gain: 0.045, bus: 'world', pan });
    } else {
      this.a.bell(t, 1480, { gain: 0.07, dur: 0.9, bus: 'world', pan });
      this.a.bell(t + 0.13, 1480, { gain: 0.05, dur: 0.8, bus: 'world', pan });
    }
  }

  crash(pan = 0) {
    if (!this.ready) return;
    const t = this.a.now() + 0.005;
    this.a.noise(t, { dur: 0.5, gain: 0.16, type: 'bandpass', freq: 2600, to: 400, q: 1.2, bus: 'sfx', pan });
    this.a.tone(t, { freq: 120, dur: 0.4, type: 'triangle', gain: 0.14, glide: 0.4, bus: 'sfx', pan });
    for (let i = 0; i < 6; i++) {
      this.a.noise(t + 0.1 + i * 0.09, { dur: 0.1, gain: 0.05, type: 'bandpass', freq: 900 + i * 300, q: 5, bus: 'sfx', pan });
    }
  }

  splash(pan = 0) {
    if (!this.ready) return;
    this.a.noise(this.a.now() + 0.005, { dur: 0.6, gain: 0.13, type: 'highpass', freq: 500, to: 2600, bus: 'sfx', pan });
  }

  sea() {
    if (!this.ready) return;
    /* The sea arrives as a bed, not an event. It just starts being there. */
    const A = this.a;
    if (this._sea) return;
    const src = A.ctx.createBufferSource();
    const n = A.ctx.sampleRate * 3;
    const buf = A.ctx.createBuffer(1, n, A.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { last = last * 0.94 + (Math.random() * 2 - 1) * 0.06; d[i] = last; }
    src.buffer = buf; src.loop = true;
    const f = A.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 800;
    const lfo = A.ctx.createOscillator(); lfo.frequency.value = 0.11;
    const lg = A.ctx.createGain(); lg.gain.value = 320;
    lfo.connect(lg); lg.connect(f.frequency);
    const g = A.ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(A.bus.world.gain);
    src.start(); lfo.start();
    g.gain.setTargetAtTime(0.5, A.now(), 6);
    this._sea = g;
  }

  cleared() {
    if (!this.ready) return;
    const t = this.a.now() + 0.005;
    this.a.bell(t, hz(ROOT + 19), { gain: 0.10, dur: 2.6 });
    this.a.bell(t + 0.09, hz(ROOT + 24), { gain: 0.07, dur: 2.2 });
  }

  unclip(pan = 0) {
    if (!this.ready) return;
    const t = this.a.now() + 0.005;
    /* One small metal click. It is the last sound the leash ever makes. */
    this.a.noise(t, { dur: 0.05, gain: 0.13, type: 'bandpass', freq: 3400, q: 9, bus: 'sfx', pan });
    this.a.bell(t + 0.02, 2100, { gain: 0.05, dur: 1.2, bus: 'sfx', pan });
  }

  wait() {
    if (!this.ready) return;
    this.a.bell(this.a.now() + 0.01, hz(ROOT + 12), { gain: 0.06, dur: 3.4 });
  }
}

function setLayer(A, L, on) {
  if (!L) return;
  if (on && !L.on) A.layerOn(L, 1.1);
  else if (!on && L.on) A.layerOff(L, 1.4);
}
