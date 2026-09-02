// CURFEW — EARSHOT, and the two-stem creature voice. Owner: audio.
//
// EARSHOT is a 50 ms 3.2 kHz exponentially-decaying click, HRTF-panned from the thing you
// cannot see, whose INTER-TICK INTERVAL encodes distance: 0.18 + 0.72 * (1 - proximity)
// seconds, so the rhythm itself is the readout and it accelerates as the thing closes.
//
// The insight is SPECTRAL, not spatial. Generic HRTF resolves front-from-back using the
// 2.5-5.5 kHz pinna band, and every other continuous sound in this game is held below
// 1.6 kHz by a 4th-order lowpass on the world and creature busses (audio.js `mixLP`). So
// EARSHOT occupies a channel the mix never uses instead of making the mix busier, and it is
// SILENT whenever nothing is at your back. That silence is half of what makes it work: a
// ticker that always ticks is a fan, and you stop hearing a fan.
//
// THE GATE IS NOT AN ANGLE. FLARE's draft gated on a fixed 98.6 degree rear cone while the
// camera showed 108.5, leaving 44 degrees per side covered by neither, and put a fast unlit
// melee enemy in exactly that wedge. The gate here is THE VIEW FRUSTUM, computed from the
// same view-projection matrix the renderer uses, so REAR + FLANK is the exact complement of
// what is on screen and a wedge cannot exist at any FOV or aspect ratio.
//
// TWO STEMS PER BODY, which is how a pack becomes countable by ear:
//   IDENTITY  refDistance 14, always on, per-species timbre. What it IS.
//   PRESSURE  refDistance 5.5, rear-biased by 0.28, rises as it closes. What it is DOING.
// Enemies own a sound before they own a mesh, so a species can be heard, located and
// counted at 60 m in a night forest where its silhouette is a suggestion.
//
// donor: flare/src/audio/earshot.js:47-70 (multiplyVP + insideFrustum, the complement-by-
//   construction predicate), :77-113 (classify: REAR / FLANK / INSIDE, the flat-length
//   guard against a vertical normalize), :140-186 (update: top-K = 2 by urgency, per-target
//   cooldown slots in typed arrays, token bucket), :188-230 (_maybeTick: interval, volume,
//   elevation-as-playbackRate).
// donor: flare/src/feel.js:254-263 (dur 0.05, hz 3200, decay 180, refDist 9, rolloff 1.1,
//   maxDistance 60, tickBase 0.18, tickSpan 0.72, volBase 0.55, volSpan 0.45, targets 2,
//   flankInterval 1.6, flankVolume 0.7, tokensPerSec 14, tokenCap 10).
// donor: qualiacology/behind-you/index.html:1616-1620 (the click itself:
//   sin(t*3200*2pi) * exp(-t*180) * 0.5) and :1200-1229 (the identity + close-pressure pair
//   of looping HRTF PositionalAudios per enemy, exponential distance model, explicit volume
//   floors so a thing is always trackable on the sound stage).

import { CFG } from '../config.js';
import { clamp, clamp01 } from '../engine/math.js';
import {
  noiseFill, pinkFill, biquad, biquadSweep, envAD, fadeOut, fadeIn,
  damped, sweepSine, grains, normalizeTo, mixInto, toAudioBuffer,
} from './audio.js';

const E = CFG.audio.earshot;      // { band, lowpass, k, rearBias }
const BAND_LO_HZ = E.band[0];     // 2500 — the floor of the band nothing else may enter
const BAND_HI_HZ = E.band[1];     // 5500

/* --------------------------------------------------------------------------
   The tick numbers. CFG.audio.earshot carries the band, the lowpass, K and the
   rear bias; the cadence is FLARE's and has no home in CFG yet (requested in
   docs/HANDOFF.md).
   -------------------------------------------------------------------------- */
const TICK_HZ = 3200;             // the pinna click [behind-you index.html:1617]
const TICK_DUR = 0.05;
const TICK_DECAY = 180;
const TICK_BASE = 0.18;           // seconds at maximum proximity
const TICK_SPAN = 0.72;           // ... plus this at maximum distance
const VOL_BASE = 0.55, VOL_SPAN = 0.45;
const MAX_D = 60;                 // beyond this a thing behind you is not yet a threat
const REF_D = 9, ROLL = 1.1;
const FLANK_INTERVAL = 1.6, FLANK_VOLUME = 0.7, FLANK_URGENCY = 0.55;
const ELEV_DEADBAND = 0.30, ELEV_ABOVE = 1.22, ELEV_BELOW = 0.82;
const FLAT_GUARD = 0.75;
const TOKENS_PER_S = 14, TOKEN_CAP = 10;
const TRACK_SLOTS = 24;
const SEEN_TIMEOUT = 2.0;
const NO_TARGET_BACKOFF = 0.10;

// Two-stem voice pool. 10 bodies can be heard at once; past that the nearest ten
// own the stage, which is also as many as a listener can separate.
const VOICE_SLOTS = 10;
const IDENT_REF = 14;             // [DESIGN 4] identity refDist 14
const PRESS_REF = 5.5;            // [DESIGN 4] pressure refDist 5.5
const REAR_BIAS = E.rearBias;     // 0.28
const IDENT_FLOOR = 0.16;         // the exponential model never reaches zero; this is why
const VOICE_MAX_D = 90;           // [REUSE-MAP] maxDistance 60 -> 90 for a county

export const INSIDE = 0, FLANK = 1, REAR = 2;

/** out = proj * view, three column-major. Allocation-free. */
export function multiplyVP(out, proj, view) {
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += proj[k * 4 + r] * view[c * 4 + k];
      out[c * 4 + r] = s;
    }
  }
  return out;
}

/**
 * THE predicate. One implementation, read by both halves of the complement,
 * which is the entire reason no wedge can exist.
 * donor: flare/src/audio/earshot.js:62-71
 */
export function insideFrustum(vp, x, y, z) {
  const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
  if (cw <= 0) return false;
  const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
  if (cx < -cw || cx > cw) return false;
  const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
  if (cy < -cw || cy > cw) return false;
  const cz = vp[2] * x + vp[6] * y + vp[10] * z + vp[14];
  return cz >= -cw && cz <= cw;
}

/**
 * Per-species acoustic identity. Height drives the pitch of both stems, so the
 * four separated silhouette heights DESIGN asks for (0.90 / 1.10 / 2.05 / 4.40)
 * are audible before they are visible.
 */
export const SPECIES = {
  hound: { id: 'pant', f: 300, press: 'growl', pf: 150, rate: 1.10 },
  pallbearer: { id: 'drag', f: 150, press: 'breath', pf: 92, rate: 0.94 },
  hunter: { id: 'thin', f: 96, press: 'scrape', pf: 64, rate: 0.86 },
  drowned: { id: 'wet', f: 210, press: 'gurgle', pf: 110, rate: 0.90 },
  bearer: { id: 'chant', f: 175, press: 'breath', pf: 104, rate: 1.0 },
  poacher: { id: 'gear', f: 240, press: 'breath', pf: 120, rate: 1.02 },
  watcher: { id: 'thin', f: 128, press: 'scrape', pf: 72, rate: 0.80 },
  standing: { id: 'drag', f: 118, press: 'scrape', pf: 58, rate: 0.72 },
};
const SPECIES_KEYS = Object.keys(SPECIES);

export class Earshot {
  constructor(ctx, audio) {
    this.ctx = ctx;
    this.A = audio;
    // Forked, NEVER ctx.rng itself: drawing from the root stream here would
    // move every other seeded system in the game by one number.
    this.rng = ctx.rng.fork('earshot:voice');
    this.time = 0;
    this.tokens = TOKEN_CAP;
    this.ticks = 0;
    this.backoffUntil = 0;

    // Per-target cooldowns. Fixed size, linear scan, no Map and no allocation.
    this.slotId = new Float64Array(TRACK_SLOTS).fill(-1);
    this.slotNext = new Float64Array(TRACK_SLOTS);
    this.slotSeen = new Float64Array(TRACK_SLOTS);

    // Top-K = 2, kept as four scalars rather than a sorted array.
    this._bestI = -1; this._bestU = -1;
    this._secondI = -1; this._secondU = -1;

    // The view-projection matrix, rebuilt every present() from the live camera.
    this._vp = new Float64Array(16);
    this._cls = { region: INSIDE, dist: 0, flatLen: 0, elevation: 0, rearDot: 0 };

    // Scratch for the hostile sweep: a flat, reused list so reading enemies
    // costs no allocation per frame.
    this._hx = new Float64Array(64);
    this._hy = new Float64Array(64);
    this._hz = new Float64Array(64);
    this._hid = new Float64Array(64);
    this._hn = 0;
    this._hRef = new Array(64);
    // Hoisted ONCE. This used to be a closure built inside _gather(), which is
    // one function object allocated every frame for the life of the game — in a
    // file whose whole point is that the hot path allocates nothing.
    this._push = (e) => this._pushBody(e);

    this.voices = [];        // the two-stem rack
    this.tracked = new Map(); // id -> { e, slot }
    this._nextId = 1;
    this._log = [];
  }

  get sr() { return this.A.sr; }

  /* ---------------------------------------------------------------- bake -- */

  bake() {
    const A = this.A;
    const dsr = this.A.sr;                                  // device rate: the click only
    // Every creature loop is below 3 kHz and every one-shot below 4; baking them
    // at half the device rate halves the bake for nothing audible. The CLICK is
    // the exception and always will be: it lives at 3.2 kHz and the whole point
    // of it is the top of the spectrum.
    const sr = Math.max(16000, Math.round(dsr / 2));
    const r = this.ctx.rng.fork('earshot');
    const rn = () => r.next();
    const N = (s) => Math.round(s * sr);
    const reg = (n, ch) => A.reg(n, ch, sr);

    // THE CLICK. Written exactly as BEHIND YOU writes it, because that is the
    // sound Alex named as the single most important thing in that game.
    {
      const n = Math.round(TICK_DUR * dsr);
      const b = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / dsr;
        b[i] = Math.sin(t * TICK_HZ * Math.PI * 2) * Math.exp(-t * TICK_DECAY) * 0.5;
      }
      fadeOut(b, dsr, 0.004);
      A.reg('earshot', [b], dsr);
    }

    // ---- IDENTITY LOOPS. Long, quiet, characterful. What the thing IS.
    const ident = {
      pant: (b, f) => {          // a dog's breathing, four cycles
        for (let p = 0; p < 8; p++) {
          const at = p * 0.55 + (p % 2) * 0.06;
          const n = new Float32Array(N(0.34));
          noiseFill(n, rn);
          biquadSweep(n, sr, 'bp', f * 3.2, f * 1.4, 1.0, 0.16, 1.3);
          envAD(n, sr, 0.05, 0.11, 0.02, 1);
          mixInto(b, n, p % 2 ? 0.55 : 0.85, Math.round(at * sr));
        }
      },
      drag: (b, f) => {          // something heavy moving over ground
        pinkFill(b, rn, 0.8);
        biquad(b, sr, 'lp', f * 6, 0.7, 0, 2);
        biquad(b, sr, 'hp', f * 0.5, 0.7);
        for (let i = 0; i < b.length; i++) {
          const t = i / sr;
          b[i] *= 0.25 + 0.75 * Math.abs(Math.sin(t * 1.35));
        }
        for (let p = 0; p < 6; p++) {
          grains(b, sr, rn, { count: 8, from: p * 0.72, span: 0.22, len: [0.002, 0.008], hp: 200, lp: 2400, amp: 0.30, decay: 1.2 });
        }
      },
      thin: (b, f) => {          // a body that is too long. Almost nothing, on purpose.
        for (let h = 1; h <= 5; h += 2) {
          sweepSine(b, sr, f * h * 0.995, f * h * 1.005, 3.5, 1e6, 0.5 / h);
        }
        const n = new Float32Array(b.length);
        noiseFill(n, rn); biquad(n, sr, 'bp', f * 9, 1.2);
        mixInto(b, n, 0.10);
        for (let i = 0; i < b.length; i++) b[i] *= 0.6 + 0.4 * Math.sin(i / sr * 0.62);
      },
      wet: (b, f) => {
        for (let p = 0; p < 10; p++) {
          const at = p * 0.42 + rn() * 0.1;
          const n = new Float32Array(N(0.2));
          noiseFill(n, rn);
          biquad(n, sr, 'bp', f * (1.4 + rn()), 2.2);
          envAD(n, sr, 0.008, 0.06, 0, 1);
          mixInto(b, n, 0.6, Math.round(at * sr));
        }
        biquad(b, sr, 'lp', f * 8, 0.7);
      },
      chant: (b, f) => {         // a file of bearers, half-voiced
        for (let p = 0; p < 6; p++) {
          const at = p * 0.7;
          sweepSine(b, sr, f * (p % 2 ? 1.0 : 1.19), f * (p % 2 ? 0.98 : 1.16), 0.3, 0.28, 0.42, at);
        }
        biquad(b, sr, 'lp', 1400, 0.7);
        biquad(b, sr, 'hp', 120, 0.7);
      },
      gear: (b, f) => {          // a man carrying things
        for (let p = 0; p < 12; p++) {
          const at = p * 0.36 + rn() * 0.05;
          damped(b, sr, f * (7 + rn() * 4), 0.003, 0.35, 0, at);
          grains(b, sr, rn, { count: 3, from: at, span: 0.05, len: [0.0008, 0.003], hp: 1400, lp: 7000, amp: 0.22 });
        }
      },
    };
    const press = {
      growl: (b, f) => {
        sweepSine(b, sr, f, f * 0.97, 2.0, 1e6, 0.7);
        sweepSine(b, sr, f * 1.5, f * 1.47, 2.0, 1e6, 0.28);
        const n = new Float32Array(b.length);
        noiseFill(n, rn); biquad(n, sr, 'bp', f * 3, 1.0);
        mixInto(b, n, 0.35);
        for (let i = 0; i < b.length; i++) b[i] *= 0.55 + 0.45 * Math.abs(Math.sin(i / sr * 7.3));
      },
      breath: (b, f) => {
        for (let p = 0; p < 5; p++) {
          const at = p * 0.62;
          const n = new Float32Array(N(0.42));
          noiseFill(n, rn);
          biquadSweep(n, sr, 'bp', f * 5, f * 2.2, 0.9, 0.22, 1.2);
          envAD(n, sr, 0.09, 0.14, 0.02, 1);
          mixInto(b, n, 0.8, Math.round(at * sr));
        }
      },
      scrape: (b, f) => {
        noiseFill(b, rn, 0.7);
        biquad(b, sr, 'bp', f * 6, 0.8);
        for (let i = 0; i < b.length; i++) {
          const t = i / sr;
          b[i] *= 0.15 + 0.85 * Math.pow(Math.abs(Math.sin(t * 2.1)), 3);
        }
        for (let p = 0; p < 5; p++) damped(b, sr, f * 11, 0.02, 0.28, 0, p * 0.63 + 0.2);
      },
      gurgle: (b, f) => {
        for (let p = 0; p < 16; p++) {
          const at = p * 0.19 + rn() * 0.06;
          damped(b, sr, f * (1 + rn() * 1.6), 0.012, 0.5, 0, at);
        }
        biquad(b, sr, 'lp', f * 6, 0.7);
      },
    };

    const made = Object.create(null);
    for (let i = 0; i < SPECIES_KEYS.length; i++) {
      const S = SPECIES[SPECIES_KEYS[i]];
      if (!made['id_' + S.id]) {
        made['id_' + S.id] = 1;
        const b = new Float32Array(N(3.6));
        ident[S.id](b, S.f);
        fadeIn(b, sr, 0.05); fadeOut(b, sr, 0.05);
        A.buf['vid_' + S.id] = toAudioBuffer(A.actx, [normalizeTo(b, 0.75)], sr);
      }
      if (!made['pr_' + S.press]) {
        made['pr_' + S.press] = 1;
        const b = new Float32Array(N(3.1));
        press[S.press](b, S.pf);
        fadeIn(b, sr, 0.05); fadeOut(b, sr, 0.05);
        A.buf['vpr_' + S.press] = toAudioBuffer(A.actx, [normalizeTo(b, 0.8)], sr);
      }
    }

    // ---- one-shots a body owns: the telegraph, the hit, the death.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.55));
      // THE TELEGRAPH. It has to land on frame 1 of a >= 320 ms wind-up and it
      // has to be unmistakable, because it is the player's permission to move.
      sweepSine(b, sr, 900 - v * 120, 240, 0.14, 0.12, 0.8);
      const n = new Float32Array(b.length);
      noiseFill(n, rn);
      biquadSweep(n, sr, 'bp', 2600, 700, 1.3, 0.16, 1.5);
      envAD(n, sr, 0.004, 0.09, 0, 1);
      mixInto(b, n, 0.6);
      biquad(b, sr, 'hp', 160, 0.7);
      fadeOut(b, sr, 0.05);
      reg('tele' + v, [normalizeTo(b, 0.9)]);
    }
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.40));
      noiseFill(b, rn);
      biquadSweep(b, sr, 'bp', 1400, 320, 1.1, 0.10, 1.3);
      envAD(b, sr, 0.003, 0.07, 0, 1);
      sweepSine(b, sr, 180 - v * 20, 96, 0.10, 0.09, 0.55);
      fadeOut(b, sr, 0.04);
      reg('epain' + v, [normalizeTo(b, 0.85)]);
    }
    {
      const b = new Float32Array(N(1.3));
      sweepSine(b, sr, 210, 58, 0.55, 0.35, 0.9);
      const n = new Float32Array(b.length);
      noiseFill(n, rn);
      biquadSweep(n, sr, 'bp', 1600, 260, 0.9, 0.5, 1.2);
      envAD(n, sr, 0.02, 0.30, 0, 1);
      mixInto(b, n, 0.5);
      grains(b, sr, rn, { count: 14, from: 0.35, span: 0.5, len: [0.002, 0.008], hp: 200, lp: 2600, amp: 0.4 });
      fadeOut(b, sr, 0.10);
      reg('edeath', [normalizeTo(b, 0.9)]);
    }

    this._buildVoiceRack();
  }

  /**
   * The two-stem rack. Ten bodies can hold the stage at once. Both stems are
   * permanent looping sources with their own panner; only the GAIN moves, so
   * attaching a body costs one buffer swap and no node churn.
   * donor: qualiacology/behind-you/index.html:1201-1228
   */
  _buildVoiceRack() {
    const A = this.A;
    if (!A.actx) return;
    const c = A.actx;
    for (let i = 0; i < VOICE_SLOTS; i++) {
      const mk = (ref, roll) => {
        const pan = c.createPanner();
        pan.panningModel = 'HRTF';
        pan.distanceModel = 'exponential';
        pan.refDistance = ref; pan.rolloffFactor = roll; pan.maxDistance = VOICE_MAX_D;
        const gain = c.createGain(); gain.gain.value = 0;
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = 0.4;
        lp.connect(gain); gain.connect(pan); pan.connect(A.busCreatures);
        return { pan, gain, lp, src: null, buf: null };
      };
      this.voices.push({
        id: -1, e: null, species: 'hound',
        ident: mk(IDENT_REF, 1.45),
        press: mk(PRESS_REF, 1.9),
        rate: 1, dist: 999, rear: 0, alive: false,
      });
    }
  }

  /* ------------------------------------------------------------- attach -- */

  /**
   * A body arrives. It owns a sound BEFORE it owns a mesh: enemies.js may call
   * this from its spawn with nothing but a position and a species string, and
   * the pack is countable by ear from that instant.
   */
  attach(e) {
    if (!e || !this.A.actx || !this.A.baked) return null;
    if (e.audioId === undefined || e.audioId === null) e.audioId = this._nextId++;
    if (this.tracked.has(e.audioId)) return this.tracked.get(e.audioId);
    const species = SPECIES[e.species] ? e.species
      : SPECIES[e.kind] ? e.kind : 'hound';
    // Take a free slot, else steal the farthest — the nearest ten own the stage.
    let v = null, far = null;
    for (let i = 0; i < this.voices.length; i++) {
      const c = this.voices[i];
      if (!c.alive) { v = c; break; }
      if (!far || c.dist > far.dist) far = c;
    }
    if (!v) v = far;
    if (!v) return null;
    if (v.alive) this._stopVoice(v);
    v.alive = true; v.id = e.audioId; v.e = e; v.species = species;
    v.rate = SPECIES[species].rate;
    v.dist = 999; v.rear = 0;
    this._playStem(v.ident, 'vid_' + SPECIES[species].id, v.rate);
    this._playStem(v.press, 'vpr_' + SPECIES[species].press, v.rate);
    this.tracked.set(e.audioId, v);
    return v;
  }

  _playStem(st, name, rate) {
    const A = this.A;
    const buf = A.buf[name];
    if (!buf) return;
    try {
      if (st.src) { st.src.stop(); st.src = null; }
      const src = A.actx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.playbackRate.value = rate;
      src.connect(st.lp);
      // Start each body at its own phase, or a pack of three breathes in unison
      // and reads as one large thing instead of three separate ones.
      src.start(A.actx.currentTime, this.rng.next() * buf.duration);
      st.src = src;
    } catch (e) { void e; }
  }

  _stopVoice(v) {
    for (const st of [v.ident, v.press]) {
      if (st.src) { try { st.src.stop(); } catch (e) { void e; } st.src = null; }
      st.gain.gain.value = 0;
    }
    if (v.id >= 0) this.tracked.delete(v.id);
    v.alive = false; v.id = -1; v.e = null;
  }

  /** A body dies. The voice stops on the instant, and the death answers. */
  detach(e, died) {
    if (!e) return;
    const v = this.tracked.get(e.audioId);
    if (v) {
      if (died && this.A.baked && !this.A.silent) {
        const s = this.A.spec();
        s.x = e.x !== undefined ? e.x : (e.pos ? e.pos.x : 0);
        s.y = (e.y !== undefined ? e.y : (e.pos ? e.pos.y : 0)) + 0.9;
        s.z = e.z !== undefined ? e.z : (e.pos ? e.pos.z : 0);
        s.bus = 'creatures'; s.gain = 0.85; s.send = 0.4; s.priority = 1;
        s.rate = v.rate;
        this.A.play('edeath', s);
      }
      this._stopVoice(v);
    }
  }

  hurt(e, p) {
    const A = this.A;
    if (!A.baked || A.silent || !e) return;
    const v = this.tracked.get(e.audioId);
    const s = A.spec();
    s.x = e.x !== undefined ? e.x : (e.pos ? e.pos.x : 0);
    s.y = (e.y !== undefined ? e.y : (e.pos ? e.pos.y : 0)) + 1.0;
    s.z = e.z !== undefined ? e.z : (e.pos ? e.pos.z : 0);
    s.bus = 'creatures'; s.gain = 0.7; s.send = 0.3; s.priority = 1;
    s.rate = (v ? v.rate : 1) * (p && p.zone === 'head' ? 1.18 : 1);
    A.play('epain' + (((p && p.dmg) | 0) % 3), s);
  }

  /**
   * THE TELEGRAPH. DESIGN 4: ">= 320 ms telegraph on a shootable part with audio
   * on frame 1". Frame 1 means this call, not one scheduled later — a telegraph
   * whose sound arrives after the wind-up has started is a telegraph that lies.
   */
  telegraph(e, kind) {
    const A = this.A;
    if (!A.baked || A.silent || !e) return;
    const v = this.tracked.get(e.audioId);
    const s = A.spec();
    s.x = e.x !== undefined ? e.x : (e.pos ? e.pos.x : 0);
    s.y = (e.y !== undefined ? e.y : (e.pos ? e.pos.y : 0)) + 1.2;
    s.z = e.z !== undefined ? e.z : (e.pos ? e.pos.z : 0);
    s.bus = 'creatures'; s.gain = 0.9; s.send = 0.22;
    s.priority = 1;                     // threat audio always gets a reserved ray
    s.occl = false;                     // and it is NEVER muffled. It must be heard.
    s.rate = (v ? v.rate : 1) * (kind === 'lunge' ? 1.1 : 1);
    A.play('tele' + (kind === 'lunge' ? 0 : kind === 'swing' ? 1 : 2), s);
  }

  /* ------------------------------------------------------------ the loop -- */

  /**
   * Gather the live bodies into flat arrays. enemies.js is being written in
   * another lane, so accept every plausible shape and never assume a field.
   */
  _gather() {
    this._hn = 0;
    const en = this.ctx.systems ? this.ctx.systems.get('enemies') : null;
    if (!en) return;
    // TEST typeof, never truthiness. On the real Enemies class `.alive` is a
    // METHOD, so `en.alive || en.list || en.all` returned a FUNCTION: not an
    // array, so Array.isArray was false and this fell through to forEachAlive
    // BY LUCK. The luck runs out the day someone renames forEachAlive.
    // `.all` first, for the same reason tension.js puts it first: it is the live
    // array and it never allocates. `alive()` reuses one array, so it is safe to
    // call and unsafe to hold — which is fine, this loop does not hold it.
    let list = null;
    if (Array.isArray(en.all)) list = en.all;
    else if (typeof en.list === 'function') { const r = en.list(); if (Array.isArray(r)) list = r; }
    else if (Array.isArray(en.list)) list = en.list;
    else if (typeof en.alive === 'function') { const r = en.alive(); if (Array.isArray(r)) list = r; }
    else if (Array.isArray(en.alive)) list = en.alive;

    if (list) { for (let i = 0; i < list.length; i++) this._pushBody(list[i]); }
    else if (typeof en.forEachAlive === 'function') en.forEachAlive(this._push);
    else if (typeof en.forEach === 'function') en.forEach(this._push);
  }

  /**
   * A body is DEAD if it says so either way round. The enemies lane spells it
   * `alive === false` (pooled bodies are reused, so the flag is the truth and
   * the object is not); earlier drafts here spelled it `dead`. Reading only one
   * of the two spellings is how a corpse keeps breathing at you.
   */
  _isDead(e) { return !!e.dead || e.alive === false || e.state === 'corpse'; }

  _pushBody(e) {
    if (!e || this._hn >= 64 || this._isDead(e)) return;
    const x = e.x !== undefined ? e.x : (e.pos ? e.pos.x : undefined);
    if (x === undefined) return;
    const y = e.y !== undefined ? e.y : (e.pos ? e.pos.y : 0);
    const z = e.z !== undefined ? e.z : (e.pos ? e.pos.z : 0);
    if (e.audioId === undefined || e.audioId === null) this.attach(e);
    const i = this._hn++;
    this._hx[i] = x; this._hy[i] = y + 1.2; this._hz[i] = z;
    this._hid[i] = e.audioId === undefined ? -1 : e.audioId;
    this._hRef[i] = e;
  }

  /** Rebuild the view-projection matrix from the live camera. Present-time. */
  _updateVP() {
    const cam = this.ctx.camera;
    if (!cam || !cam.projectionMatrix || !cam.matrixWorldInverse) return false;
    multiplyVP(this._vp, cam.projectionMatrix.elements, cam.matrixWorldInverse.elements);
    return true;
  }

  /**
   * Classify a point against the listener. `out` is reused; this runs per body
   * per frame and allocates nothing.
   * donor: flare/src/audio/earshot.js:78-113
   */
  classify(ex, ey, ez, fx, fz, tx, ty, tz, out) {
    const o = out;
    const dx = tx - ex, dy = ty - ey, dz = tz - ez;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    o.dist = dist;
    o.elevation = dy / dist;
    if (insideFrustum(this._vp, tx, ty, tz)) {
      o.region = INSIDE; o.flatLen = 0; o.rearDot = 0;
      return o;
    }
    // The normalize guard: something directly over your head flattens to nearly
    // nothing and normalizing that jitters the front/back flip every frame.
    const flatLen = Math.sqrt(dx * dx + dz * dz) / dist;
    o.flatLen = flatLen;
    if (flatLen < FLAT_GUARD) {
      o.rearDot = 1; o.region = REAR;   // you cannot see it and it is above you
      return o;
    }
    const inv = 1 / (flatLen * dist);
    const rearDot = -(fx * dx + fz * dz) * inv;
    o.rearDot = rearDot;
    o.region = rearDot > 0 ? REAR : FLANK;
    return o;
  }

  _slot(id) {
    let free = -1;
    for (let i = 0; i < TRACK_SLOTS; i++) {
      if (this.slotId[i] === id) return i;
      if (free < 0 && (this.slotId[i] < 0 || this.time - this.slotSeen[i] > SEEN_TIMEOUT)) free = i;
    }
    if (free < 0) free = 0;
    this.slotId[free] = id;
    this.slotNext[free] = 0;
    return free;
  }

  step(dt) {
    const A = this.A;
    if (!A.enabled || !A.actx || !A.baked) return;
    this.time += dt;
    this.tokens = Math.min(TOKEN_CAP, this.tokens + dt * TOKENS_PER_S);
    this._gather();
    this._mixVoices(dt);
    if (A.silent) return;
    if (this.time < this.backoffUntil) return;
    this._tickRear();
  }

  present() {
    this._updateVP();
  }

  /**
   * THE TWO STEMS. Identity is flat with distance past its floor — a thing you
   * can hear is a thing you can count. Pressure is the one that moves: it rises
   * as the body closes and it is biased 0.28 toward your back, so the same
   * hound at the same distance is LOUDER behind you than in front, which is the
   * whole reason a pack can herd you.
   */
  _mixVoices(dt) {
    const A = this.A;
    const cam = this.ctx.camera;
    if (!cam) return;
    const T = A.actx.currentTime;
    const ex = cam.position.x, ey = cam.position.y, ez = cam.position.z;
    const m = cam.matrixWorld.elements;
    const fx = -m[8], fz = -m[10];
    const flen = Math.hypot(fx, fz) || 1;
    const nfx = fx / flen, nfz = fz / flen;

    for (let i = 0; i < this.voices.length; i++) {
      const v = this.voices[i];
      if (!v.alive) continue;
      const e = v.e;
      const x = e.x !== undefined ? e.x : (e.pos ? e.pos.x : 0);
      const y = (e.y !== undefined ? e.y : (e.pos ? e.pos.y : 0));
      const z = e.z !== undefined ? e.z : (e.pos ? e.pos.z : 0);
      if (this._isDead(e)) { this._stopVoice(v); continue; }

      const dx = x - ex, dy = (y + 1.1) - ey, dz = z - ez;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      v.dist = d;
      const rearDot = -(nfx * dx + nfz * dz) / Math.max(1e-6, Math.hypot(dx, dz));
      v.rear = clamp01(rearDot);

      for (const st of [v.ident, v.press]) {
        const p = st.pan;
        if (p.positionX) {
          // setTargetAtTime, not a hard write: a body stepping at 7.8 m/s moves
          // 0.13 m per frame and a hard write zippers the panner.
          p.positionX.setTargetAtTime(x, T, 0.03);
          p.positionY.setTargetAtTime(y + 1.1, T, 0.03);
          p.positionZ.setTargetAtTime(z, T, 0.03);
        } else p.setPosition(x, y + 1.1, z);
        // Air absorption on a loop too, or a hound at 70 m sounds like one at 7.
        st.lp.frequency.setTargetAtTime(
          clamp(20000 * Math.exp(-d / CFG.audio.airAbsorption), 400, 20000), T, 0.12);
      }

      // The exponential distance model never reaches zero, so audibility is
      // governed by explicit floors. That floor is why a thing is ALWAYS
      // trackable on the sound stage — BEHIND YOU's law, and FETCH's after it.
      const far = clamp01(1 - d / VOICE_MAX_D);
      const identG = (IDENT_FLOOR + 0.84 * far) * 0.34 * (e.alerted ? 1.25 : 1);
      const near = clamp01(1 - d / 18);
      const pressG = near * near * (0.30 + REAR_BIAS * v.rear) * (e.alerted ? 1.4 : 0.8);
      v.ident.gain.gain.setTargetAtTime(identG, T, 0.18);
      v.press.gain.gain.setTargetAtTime(pressG, T, 0.10);
    }
  }

  /** The rear ticker itself. K = 2 targets. */
  _tickRear() {
    const cam = this.ctx.camera;
    if (!cam) return;
    const ex = cam.position.x, ey = cam.position.y, ez = cam.position.z;
    const m = cam.matrixWorld.elements;
    let fx = -m[8], fz = -m[10];
    const fl = Math.hypot(fx, fz) || 1;
    fx /= fl; fz /= fl;

    this._bestI = -1; this._bestU = -1;
    this._secondI = -1; this._secondU = -1;
    for (let i = 0; i < this._hn; i++) {
      const c = this.classify(ex, ey, ez, fx, fz, this._hx[i], this._hy[i], this._hz[i], this._cls);
      if (c.region === INSIDE || c.dist > MAX_D) continue;
      const proximity = 1 - c.dist / MAX_D;
      const urgency = proximity * (c.region === REAR ? 1 : FLANK_URGENCY);
      if (urgency > this._bestU) {
        this._secondI = this._bestI; this._secondU = this._bestU;
        this._bestI = i; this._bestU = urgency;
      } else if (urgency > this._secondU) {
        this._secondI = i; this._secondU = urgency;
      }
    }
    if (this._bestI < 0) { this.backoffUntil = this.time + NO_TARGET_BACKOFF; return; }
    this._maybeTick(this._bestI, ex, ey, ez, fx, fz);
    if (E.k > 1 && this._secondI >= 0) this._maybeTick(this._secondI, ex, ey, ez, fx, fz);
  }

  _maybeTick(i, ex, ey, ez, fx, fz) {
    const A = this.A;
    const c = this.classify(ex, ey, ez, fx, fz, this._hx[i], this._hy[i], this._hz[i], this._cls);
    const id = this._hid[i];
    const slot = this._slot(id);
    this.slotSeen[slot] = this.time;
    if (this.time < this.slotNext[slot]) return;
    if (this.tokens < 1) return;

    const proximity = clamp01(1 - c.dist / MAX_D);
    const flank = c.region === FLANK;
    // THE READOUT: the interval IS the distance. 0.18 s on top of you,
    // 0.90 s at the edge of the world you can hear.
    const interval = (TICK_BASE + TICK_SPAN * (1 - proximity)) * (flank ? FLANK_INTERVAL : 1);
    const volume = (VOL_BASE + VOL_SPAN * proximity) * (flank ? FLANK_VOLUME : 1);

    // Elevation as playbackRate. HRTF carries no elevation cue below 1.6 kHz and
    // pitch is the one that does.
    let rate = 1;
    if (c.elevation > ELEV_DEADBAND) rate = ELEV_ABOVE;
    else if (c.elevation < -ELEV_DEADBAND) rate = ELEV_BELOW;

    const s = A.spec();
    s.x = this._hx[i]; s.y = this._hy[i]; s.z = this._hz[i];
    s.bus = 'earshot';           // bypasses the mix lowpass AND the band carve
    s.gain = volume;
    s.rate = rate;
    s.send = 0;                  // never reverberated; a reverberated cue is a smear
    s.air = false;               // and never air-absorbed: it must survive 60 m
    s.occl = false;              // and never occluded: a thing behind a trunk is worse
    s.ref = REF_D; s.roll = ROLL; s.maxDist = MAX_D;
    s.priority = 1;
    A.play('earshot', s);

    this.tokens -= 1;
    this.ticks++;
    this.slotNext[slot] = this.time + interval;
    if (this._log.length >= 128) this._log.shift();
    this._log.push({
      id, t: +this.time.toFixed(2), dist: +c.dist.toFixed(1),
      region: c.region === REAR ? 'rear' : 'flank',
      interval: +interval.toFixed(3), volume: +volume.toFixed(2), rate,
    });
  }

  /** QA: the tick log, newest last. */
  rows() { return this._log.slice(); }

  state() {
    let voices = 0;
    for (let i = 0; i < this.voices.length; i++) if (this.voices[i].alive) voices++;
    return {
      ticks: this.ticks,
      tokens: +this.tokens.toFixed(1),
      hostiles: this._hn,
      voices,
      slots: VOICE_SLOTS,
      band: [BAND_LO_HZ, BAND_HI_HZ],
      last: this._log.length ? this._log[this._log.length - 1] : null,
    };
  }

  reset() {
    this.time = 0; this.tokens = TOKEN_CAP; this.ticks = 0; this.backoffUntil = 0;
    this.slotId.fill(-1); this.slotNext.fill(0); this.slotSeen.fill(0);
    this._log.length = 0;
    for (let i = 0; i < this.voices.length; i++) if (this.voices[i].alive) this._stopVoice(this.voices[i]);
  }
}

export default Earshot;
