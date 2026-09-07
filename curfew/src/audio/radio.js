// audio/radio.js — THE CAR RADIO. Owner: audio. Not a manifest system: bed.js owns it,
// the way vehicle/carbody.js is owned by vehicle/car.js.
//
// ALEX, 2026-09-07: "also, if we could put a couple radio stations in the car that absolutely
// fit the game, it would be badass." He then sent six files made for him by other models —
// four songs and two announcers — and said: "we have the announcers and a few songs by this
// point."
//
// THIS IS THE ONE PLACE THE PROJECT HAS AUDIO FILES. `audio/bed.js:33` says "Everything is
// synthesised — there is no audio file in this project." That was true and is now true of
// everything EXCEPT this file. His content supersedes the rule, and only here.
//
// The law this obeys is still bed.js's rule 5, unchanged:
//   "THERE IS NO MUSIC IN THE COUNTY. The car radio is the only non-diegetic-sounding thing
//    out there and it is diegetic — it comes out of a dashboard, band-limited, and it stops
//    when you leave the car."
// So every station goes through a band-pass and a little clipping before it reaches the world
// bus. A song at full bandwidth would be a soundtrack; a song through a 1970s dashboard
// speaker in a dead county is a signal from somebody who is not there any more.
//
// THE DIAL IS A BROADCAST, NOT A PLAYLIST. Each station runs on one shared clock, so tuning
// away and back lands you further into the song, exactly as a radio does. Nothing restarts.
// A station you have never chosen has still been playing since you got in.
//
// NOTHING LOADS UNTIL YOU FIRST SIT IN THE CAR. 22 MB of audio must never touch the boot
// path: cold boot is gated at 15 s (AGENTS.md) and this county boots in 5.4.

const BASE = 'assets/radio/';

// TWO STATIONS AND A DEAD BAND.
//
// The identities are Alex's, via GPT-5.1 Pro's radio brief (2026-09-07), and the six files
// he sent are those recordings. Pro's own player streams them from the web; this plays the
// copies he downloaded, out of assets/radio/.
//
//   88.3 PORCHLIGHT   "For the person still in the driveway."
//                     Mara, the overnight presenter. Warm guitar-led dream-pop. She is not
//                     frightened and she is not comforting you about anything in particular.
//                     "You don't have to talk. I'm glad you're there."
//   106.7 WRONG TURN  "Bad reception. Excellent taste."
//                     Cal, doing traffic for an empty county, losing patience with the deer.
//                     Dance-punk and garage rock. This is the one that makes you drive faster.
//
// Pro's line about why these two and not a horror drone: "neither station explains the
// horror. One makes the car feel less lonely. The other makes you want to drive faster."
// That is exactly right for this game and it is why there is no third scary station — the
// county is already the scary station, and it is on all the time.
//
// A STATION IS A SCHEDULE, NOT A LOOP. Each one runs presenter, song, song, round and round
// on the shared broadcast clock, so you tune in halfway through whatever is on and you never
// hear the same link twice in a row. The third position is an open carrier with nothing on
// it, which in a county where the sun did not come back is not a missing feature.
export const STATIONS = Object.freeze([
  {
    id: 'porchlight', dial: '88.3', name: 'PORCHLIGHT', kind: 'music',
    parts: [
      { file: 'voice-1.mp3', kind: 'voice' },
      { file: 'song-1.mp3', kind: 'music' },
      { file: 'song-2.mp3', kind: 'music' },
    ],
  },
  {
    id: 'wrong-turn', dial: '106.7', name: 'WRONG TURN', kind: 'music',
    parts: [
      { file: 'voice-2.wav', kind: 'voice' },
      { file: 'song-3.mp3', kind: 'music' },
      { file: 'song-4.mp3', kind: 'music' },
    ],
  },
  { id: 'dead', dial: '—', name: null, kind: 'dead', parts: [] },
]);

/** Every distinct file the dial can play, in load order. */
const FILES = (() => {
  const seen = [], out = [];
  for (const s of STATIONS) for (const p of s.parts) {
    if (!seen.includes(p.file)) { seen.push(p.file); out.push(p); }
  }
  return out;
})();

const TUNE_STATIC_S = 0.42;    // how long the hiss covers the change
const RETUNE_LOCKOUT = 0.18;   // s. A held key must not scrub the whole band in one frame.

export class Radio {
  /** @param A the audio system: needs actx, and a destination node to hang off. */
  constructor(A, rng) {
    this.A = A;
    this.rng = rng;
    this.index = 0;
    this.loaded = false;
    this.loading = false;
    this.failed = false;
    this.on = false;
    this._buf = Object.create(null);   // keyed by filename
    this._schedList = null; this._schedIndex = 0;
    this._src = null;
    this._staticSrc = null;
    this._epoch = 0;
    this._staticUntil = 0;
    this._partEndsAt = 0;
    this._lockout = 0;
    this._built = false;
    this.out = null;
    this.gain = null;
    this._staticGain = null;
  }

  /* ------------------------------------------------------------------ graph --
   * band-pass -> a soft saturator -> gain. One filter pair, two gains, no
   * per-station nodes: the dashboard is the same dashboard whatever is on it.
   * ------------------------------------------------------------------------ */
  build(destination) {
    const A = this.A;
    if (this._built || !A || !A.actx) return;
    const actx = A.actx;
    this.out = actx.createGain();
    this.out.gain.value = 1;
    // The dashboard. 220 Hz to 5.2 kHz: bed.js's own note says 300-3400, which is a
    // telephone and eats a song completely. This keeps the band obviously limited — no
    // sub, no air — while leaving enough that a tune is still music and not a mumble.
    const hp = actx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 220; hp.Q.value = 0.7;
    const lp = actx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = 0.7;
    // a small presence bump where a paper cone honks
    const mid = actx.createBiquadFilter();
    mid.type = 'peaking'; mid.frequency.value = 1750; mid.Q.value = 0.9; mid.gain.value = 3.5;

    this.gain = actx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(hp); hp.connect(mid); mid.connect(lp); lp.connect(this.out);

    // The static sits AFTER the band-pass on purpose: tuning noise is made in the set,
    // not received through the aerial, so it is not band-limited the same way.
    this._staticGain = actx.createGain();
    this._staticGain.gain.value = 0;
    this._staticGain.connect(this.out);

    if (destination) this.out.connect(destination);
    this._built = true;
    this._epoch = actx.currentTime;
    this._makeStatic();
  }

  _makeStatic() {
    const actx = this.A.actx;
    if (!actx || this._staticBuf) return;
    const sr = actx.sampleRate, n = Math.floor(sr * 1.6);
    const buf = actx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      // pink-ish: a one-pole on white, so it is a hiss and not a cymbal
      // One seeded PRNG, forked by name (CONTRACT). Never a bare random here: the tuning
      // hiss is asserted by tests/radio.mjs and a flaky buffer is a flaky assertion.
      const w = this.rng.next() * 2 - 1;
      last = last * 0.86 + w * 0.14;
      // carrier warble, so it reads as a set between stations rather than tape noise
      d[i] = (last * 2.4 + w * 0.25) * (0.75 + 0.25 * Math.sin(i / sr * 37));
    }
    this._staticBuf = buf;
  }

  /* ---------------------------------------------------------------- loading -- */
  /** Idempotent. Kicks off fetch+decode of every file on the dial; resolves when all settle. */
  async ensureLoaded() {
    if (this.loaded || this.loading) return;
    this.loading = true;
    const actx = this.A && this.A.actx;
    if (!actx) { this.loading = false; return; }
    await Promise.all(FILES.map(async (p) => {
      try {
        const res = await fetch(BASE + p.file);
        if (!res.ok) throw new Error('http ' + res.status);
        const bytes = await res.arrayBuffer();
        this._buf[p.file] = await actx.decodeAudioData(bytes);
      } catch (e) {
        // A file that will not load is an item that is not in the schedule tonight. It must
        // never take the car's audio, or the game, down with it.
        void e; this._buf[p.file] = null;
      }
    }));
    this.loaded = true;
    this.loading = false;
    this.failed = FILES.every(p => !this._buf[p.file]);
    if (this.on) this._play(false);
  }

  /** The parts of a station that actually decoded, with their durations. */
  _schedule(i) {
    const st = STATIONS[i];
    const out = [];
    for (const p of st.parts) {
      const b = this._buf[p.file];
      if (b) out.push({ buf: b, kind: p.kind, file: p.file, dur: b.duration });
    }
    return out;
  }

  /** Where this station is RIGHT NOW on the shared broadcast clock. */
  _atNow(i, t) {
    const sched = this._schedule(i);
    if (!sched.length) return null;
    let total = 0;
    for (const s of sched) total += s.dur;
    if (!(total > 0)) return null;
    let pos = ((t - this._epoch) % total + total) % total;
    for (let k = 0; k < sched.length; k++) {
      if (pos < sched[k].dur) return { part: sched[k], k, offset: pos, sched };
      pos -= sched[k].dur;
    }
    return { part: sched[0], k: 0, offset: 0, sched };
  }

  /* ----------------------------------------------------------------- verbs -- */
  /** Sat down. Start whatever the dial is already on, from where the broadcast is now. */
  start() {
    if (this.on) return;
    this.on = true;
    if (!this.loaded) { this.ensureLoaded(); return; }
    this._play(false);
  }

  /** Got out. bed.js rule 5: the radio does not follow you into the county. */
  stop() {
    this.on = false;
    this._partEndsAt = 0;
    this._stopSource();
    if (this.gain) this.gain.gain.value = 0;
    if (this._staticGain) this._staticGain.gain.value = 0;
  }

  /** Turn the knob. `dir` is +1 or -1. Returns the new index. */
  tune(dir) {
    if (this._lockout > 0) return this.index;
    this._lockout = RETUNE_LOCKOUT;
    const n = STATIONS.length;
    this.index = ((this.index + (dir < 0 ? -1 : 1)) % n + n) % n;
    if (this.on) this._play(true);
    return this.index;
  }

  /** 0..1 across the dial — the needle position the dashboard draws. No words. */
  dialT() { return STATIONS.length > 1 ? this.index / (STATIONS.length - 1) : 0; }

  station() { return STATIONS[this.index]; }

  update(dt) {
    if (this._lockout > 0) this._lockout = Math.max(0, this._lockout - dt);
    const actx = this.A && this.A.actx;
    if (!actx || !this._built) return;
    const T = actx.currentTime;
    // the static skirt closing after a tune
    if (this._staticUntil > 0 && T >= this._staticUntil) {
      this._staticUntil = 0;
      this._staticGain.gain.setTargetAtTime(0, T, 0.05);
    }
    // THE HANDOVER. Mara finishes, the record starts. Polled against the context clock
    // rather than hung off onended, for the reason in _playPart.
    if (this.on && this._src && this._partEndsAt > 0 && T >= this._partEndsAt) {
      const sched = this._schedList;
      if (sched && sched.length) {
        const k = (this._schedIndex + 1) % sched.length;
        this._stopSource();
        this._playPart({ part: sched[k], k, offset: 0, sched }, T, false);
      } else {
        this._partEndsAt = 0;
      }
    }
  }

  _stopSource() {
    if (this._src) { try { this._src.stop(); } catch (e) { void e; } this._src = null; }
  }

  _play(withStatic) {
    const actx = this.A && this.A.actx;
    if (!actx || !this._built) return;
    const T = actx.currentTime;
    this._stopSource();

    if (withStatic && this._staticBuf) {
      if (this._staticSrc) { try { this._staticSrc.stop(); } catch (e) { void e; } }
      const s = actx.createBufferSource();
      s.buffer = this._staticBuf; s.loop = true;
      s.connect(this._staticGain);
      s.start(T);
      this._staticSrc = s;
      this._staticGain.gain.cancelScheduledValues(T);
      this._staticGain.gain.setValueAtTime(0.085, T);
      this._staticUntil = T + TUNE_STATIC_S;
    }

    // THE BROADCAST CLOCK. Where this station is right now, not where you left it: tuning
    // away and back lands you further into the record, exactly as a radio does.
    const now = this._atNow(this.index, T);
    if (!now) {
      // dead air, or a station whose whole schedule failed to load. The carrier is still on.
      this.gain.gain.cancelScheduledValues(T);
      this.gain.gain.setTargetAtTime(0, T, 0.08);
      if (this._staticBuf && !this._staticSrc) {
        const s = actx.createBufferSource();
        s.buffer = this._staticBuf; s.loop = true;
        s.connect(this._staticGain); s.start(T);
        this._staticSrc = s;
      }
      this._staticGain.gain.cancelScheduledValues(T);
      this._staticGain.gain.setTargetAtTime(0.030, T + (withStatic ? TUNE_STATIC_S : 0), 0.15);
      this._staticUntil = 0;
      return;
    }
    this._playPart(now, T, withStatic);
  }

  /**
   * Put one item of a station's schedule on air. The handover to the next item is done by
   * update() against the clock, NEVER by onended: tests/audio.mjs:10 forbids it, and it is
   * right to — "onended does not fire reliably under frame spikes, and a pool that leaks on
   * a hitch goes silent exactly when the game gets loud". A radio that stops handing over
   * after one stutter is exactly that failure wearing a different hat.
   */
  _playPart(at, T, withStatic) {
    const actx = this.A.actx;
    const { part, k, offset, sched } = at;
    const src = actx.createBufferSource();
    src.buffer = part.buf;
    src.loop = false;
    try { src.start(T, offset); } catch (e) { void e; try { src.start(T); } catch (e2) { void e2; } }
    src.connect(this.gain);
    this._src = src;
    this._schedIndex = k;
    this._schedList = sched;
    // When this item is due to end, in context time. update() watches this and starts the
    // next one; a late frame makes the handover late, never absent.
    this._partEndsAt = T + Math.max(0.05, part.dur - offset);
    // The presenter sits a little above the records: a voice through a dashboard speaker
    // loses more to the band-pass than a full mix does.
    const level = part.kind === 'voice' ? 0.30 : 0.22;
    this.gain.gain.cancelScheduledValues(T);
    this.gain.gain.setValueAtTime(this.gain.gain.value, T);
    this.gain.gain.setTargetAtTime(level, T + (withStatic ? TUNE_STATIC_S * 0.6 : 0), 0.12);
  }

  /** What is on air right now — the station and whether it is a voice or a record. */
  nowPlaying() {
    const st = STATIONS[this.index];
    const p = this._schedList && this._schedList[this._schedIndex];
    return { station: st.id, dial: st.dial, name: st.name, part: p ? p.file : null, kind: p ? p.kind : st.kind };
  }

  dispose() {
    this._stopSource();
    if (this._staticSrc) { try { this._staticSrc.stop(); } catch (e) { void e; } this._staticSrc = null; }
    this._built = false;
  }
}
