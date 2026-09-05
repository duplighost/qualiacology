// PAUSE — the one piece of music in CURFEW, and it plays only while the game is stopped.
//
// ROUND 13. Alex, seventh playtest: "The pause menu doesn't stop all the sounds. It would be
// nice if it did, and then there was some different fitting music in it." Measured before this
// round, the pause was exactly as loud as play: the bed loops, the radio, the breathing and the
// ringing shots all ran on under the card, because nothing in the audio lane knew about
// game:paused. Two things fix it, and both live in the audio lane:
//
//   THE MUTE lives in audio.js: one GainNode (pauseGain) between the clipper's make-up and the
//   master, taken to zero in about 120 ms on game:paused and back in 60 ms on resume. Nothing is
//   stopped or cut: the bed loops keep running under zero and the county comes back exactly
//   where it was. (bed.js rule 1 — a cut is an event; a mute is not a cut.)
//
//   THE PIECE lives here. A 24 s loop in D minor, baked from Float32Arrays like every other
//   sound in the project (there is no audio file), on its own bus connected to the master ABOVE
//   the mute so the pause cannot silence it. It starts when the card shows (pause:card, not
//   game:paused — the entry pause fires for a frame before the lock lands, and a tab hide is
//   not a card) and fades over 0.4 s when the card goes. A BufferSource is one-shot, so every
//   pause starts the loop from the top.
//
// What it sounds like: a bowed drone on D with a slow swell that never repeats inside the loop,
// and a four-note phrase (D F E D) that a second phrase answers (C D A D), each note a 250 ms
// glide into pitch — a bow, not a key. Low-passed at 2.2 kHz so it stays out of the 2.5-5.5 kHz
// band the earshot ticker owns. Quiet on purpose: pieceGain lands it around the bed's own
// level, and the number is in config.js for a fast retune. "nothing loud or anooying."
//
// NO `static id`: this is not a system. tests/reverse-manifest.mjs treats a static id as a
// manifest entry, and the SYSTEMS array does not change for a piece of music.
import { CFG } from '../config.js';
import { brownFill, biquad, sweepSine, damped, envAD, mixInto, normalizeTo } from './audio.js';

const P = CFG.audio.pause;

/**
 * A seamless loop: build the piece longer than the loop, then crossfade the overhang back
 * over the head (bed.js's loopify). Without it the seam clicks once a cycle.
 */
function loopify(b, sr, xfadeSec) {
  const x = Math.min(Math.round(xfadeSec * sr), (b.length / 3) | 0);
  const n = b.length - x;
  const out = new Float32Array(n);
  out.set(b.subarray(0, n));
  for (let i = 0; i < x; i++) {
    const t = i / x;
    out[i] = out[i] * t + b[n + i] * (1 - t);
  }
  return out;
}

export class PausePiece {
  constructor(ctx, audio) {
    this.ctx = ctx;
    this.A = audio;
    this.baked = false;
    this.bakeMs = 0;
    this.bus = null;        // GainNode -> master, above the mute
    this.src = null;        // the BufferSource while the card is up
    this.gain = P.pieceGain;
    this.starts = 0;
  }

  /** Called from audio._buildGraph once the master exists. */
  attach() {
    const A = this.A;
    if (!A.actx || !A.master || this.bus) return;
    this.bus = A.actx.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(A.master);
  }

  /* ---------------------------------------------------------------- bake -- */

  bake() {
    const A = this.A;
    if (this.baked || !A.actx) return;
    const t0 = performance.now();
    const sr = P.sr;
    const r = this.ctx.rng.fork('audio:pause');
    const rn = () => r.next();
    const beat = P.beatS;
    const loopN = Math.round(P.seconds * sr);
    const xfade = 2.5;
    const N = loopN + Math.round(xfade * sr);
    const chans = [];

    // The phrase and its answer, on beats. D4 F4 E4 D4, then C4 D4 A3 D4.
    const CALL = [[0, 293.66], [2, 349.23], [4, 329.63], [6, 293.66]];
    const ANSWER = [[10, 261.63], [12, 293.66], [14, 220.0], [16, 293.66]];
    const NOTES = CALL.concat(ANSWER);

    for (let c = 0; c < 2; c++) {
      const b = new Float32Array(N);
      const det = c ? 1.0025 : 0.9975;            // 4 cents apart, one per ear: width, not chorus

      // ---- voice A, the bowed drone: partials on D2/D3/A2/A3 that never decay
      sweepSine(b, sr, 73.416 * det, 73.416 * det, 0.01, 1e6, 0.30);
      sweepSine(b, sr, 146.83 * det, 146.83 * det, 0.01, 1e6, 0.16);
      sweepSine(b, sr, 220.25 * det, 220.25 * det, 0.01, 1e6, 0.07);
      sweepSine(b, sr, 110.0 * det, 110.0 * det, 0.01, 1e6, 0.14);
      sweepSine(b, sr, 220.0 * det, 220.0 * det, 0.01, 1e6, 0.05);
      // the bow: brown noise banded at D3, so the drone has hair on it
      const bow = new Float32Array(N);
      brownFill(bow, rn, 0.6);
      biquad(bow, sr, 'bp', 146.8, 2.5, 0, 2);
      mixInto(b, bow, 0.9);
      // the swell, per 256-sample block: two periods that share no divisor with the loop
      const BLK = 256;
      for (let i = 0; i < N; i += BLK) {
        const t = i / sr;
        const g = 0.55 + 0.30 * Math.sin(2 * Math.PI * t / 9.0 + 1.3 * c) + 0.15 * Math.sin(2 * Math.PI * t / 13.7 + c);
        const end = Math.min(N, i + BLK);
        for (let k = i; k < end; k++) b[k] *= g;
      }

      // ---- voice B, the phrase that answers itself
      const tmpN = Math.round(4.5 * sr);
      for (let n = 0; n < NOTES.length; n++) {
        const at = NOTES[n][0], f = NOTES[n][1];
        const last = (n === 3 || n === 7);
        const tmp = new Float32Array(tmpN);
        sweepSine(tmp, sr, f * 0.985, f, 0.25, 1e6, 0.5);      // the bow finds the pitch
        sweepSine(tmp, sr, 2 * f, 2 * f, 0.01, 1e6, 0.10);
        damped(tmp, sr, f * 0.5, 1.6, 0.18);
        envAD(tmp, sr, 0.14, last ? 3.0 : 2.2, 0.5, 1.4);
        biquad(tmp, sr, 'lp', 1500, 0.7);
        mixInto(b, tmp, 0.55 * (c ? 0.9 : 1), Math.round(at * beat * sr));
      }

      // ---- the whole mix: out of the earshot band, no rumble, seamless
      biquad(b, sr, 'lp', 2200, 0.6);
      biquad(b, sr, 'hp', 45, 0.7);
      chans.push(normalizeTo(loopify(b, sr, xfade), 0.8));
    }

    A.reg('pause_piece', chans, sr);
    this.baked = true;
    this.bakeMs = performance.now() - t0;
  }

  /* ---------------------------------------------------------------- life -- */

  start(T) {
    const A = this.A;
    if (!A.actx || !this.bus || this.src) return;
    if (!this.baked) { try { this.bake(); } catch (e) { void e; return; } }
    const buf = A.buf.pause_piece;
    if (!buf) return;
    const c = A.actx;
    const t = Number.isFinite(T) ? Math.max(T, c.currentTime) : c.currentTime;
    try {
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(this.bus);
      src.start(t);
      this.src = src;
      const g = this.bus.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(0, t);
      g.setTargetAtTime(this.gain, t, P.pieceInTau);
      this.starts++;
    } catch (e) { void e; }
  }

  stop(T) {
    const A = this.A;
    if (!A.actx || !this.src) return;
    const c = A.actx;
    const t = Number.isFinite(T) ? Math.max(T, c.currentTime) : c.currentTime;
    const g = this.bus.gain;
    try {
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0, t + P.pieceOutS);
      this.src.stop(t + P.pieceOutS + 0.05);
    } catch (e) { void e; }
    this.src = null;
  }

  playing() { return !!this.src; }

  /** Live retune: __CURFEW.config({ audio: { pause: { pieceGain } } }). */
  setGain(v) {
    this.gain = Math.max(0, Math.min(1, +v || 0));
    if (this.src && this.bus) {
      const t = this.A.actx.currentTime;
      this.bus.gain.cancelScheduledValues(t);
      this.bus.gain.setTargetAtTime(this.gain, t, 0.05);
    }
  }

  state() {
    return { baked: this.baked, bakeMs: +this.bakeMs.toFixed(1), playing: !!this.src, starts: this.starts,
      gain: this.gain, busGain: this.bus ? +this.bus.gain.value.toFixed(3) : 0 };
  }

  dispose() {
    if (this.src) { try { this.src.stop(); } catch (e) { void e; } this.src = null; }
    if (this.bus) { try { this.bus.disconnect(); } catch (e) { void e; } this.bus = null; }
  }
}
