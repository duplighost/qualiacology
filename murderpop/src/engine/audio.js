// The song and the sounds around it.
// The song is decoded whole so the clock is sample-exact (SIDECHAIN's approach). On top of playing it:
// a tape stop (the record slowing to nothing), a rewind (the song itself played backwards, fast, back
// to a checkpoint, then on from there), a muffle (a lowpass for being hurt or paused), ducking, and a
// bus for the game's own sounds, which are mostly synthesized so they can sit in the song's key.

const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class Audio {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0.9;
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 3; lim.ratio.value = 12; lim.attack.value = 0.002; lim.release.value = 0.1;
    this.master.connect(lim).connect(c.destination);
    this.limiter = lim;

    // song chain: source -> songIn -> hp -> lp -> songGain -> musicVol -> master, plus a room send
    this.songIn = c.createGain();
    this.hp = c.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.frequency.value = 18; this.hp.Q.value = 0.5;
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = 0.6;
    this.songGain = c.createGain();
    this.musicVol = c.createGain(); this.musicVol.gain.value = 1;
    this.songIn.connect(this.hp).connect(this.lp).connect(this.songGain).connect(this.musicVol).connect(this.master);
    this.room = c.createConvolver(); this.room.buffer = this._impulse(2.2, 2.4);
    this.roomSend = c.createGain(); this.roomSend.gain.value = 0;
    this.lp.connect(this.roomSend).connect(this.room).connect(this.master);

    // game sounds
    this.sfx = c.createGain(); this.sfx.gain.value = 0.6;
    this.sfxVol = c.createGain(); this.sfxVol.gain.value = 1;
    // a catch on the game sounds: a single hit passes, a pile-up of six at once doesn't spike over the song (it
    // would push the master limiter down on the music)
    this.sfxCatch = c.createDynamicsCompressor();
    this.sfxCatch.threshold.value = -6; this.sfxCatch.knee.value = 6; this.sfxCatch.ratio.value = 6; this.sfxCatch.attack.value = 0.002; this.sfxCatch.release.value = 0.12;
    // (Web Audio adds makeup gain to a compressor: about +1.8 dB at these settings; taken back here)
    this.sfxMakeup = c.createGain(); this.sfxMakeup.gain.value = 0.812;
    // and the effects step back when the song goes quiet (a stop, a blackout): fight.js sets it from the song
    this.sfxDuck = c.createGain(); this.sfxDuck.gain.value = 1;
    this.sfx.connect(this.sfxCatch).connect(this.sfxMakeup).connect(this.sfxDuck).connect(this.sfxVol).connect(this.master);
    this.sfxRoom = c.createGain(); this.sfxRoom.gain.value = 0.18;
    this.sfx.connect(this.sfxRoom).connect(this.room);

    this.noise = this._noiseBuffer(2);
    this.src = null; this.buffer = null; this.t0 = 0; this.rate = 1;
    this._clockT = null; this._clockP = 0; this._frozen = null;
    this.reversed = null; // reversed copy of the song, made once per song for rewinds
    this.samples = new Map();
  }

  resume() { return this.ctx.state === 'running' ? Promise.resolve() : this.ctx.resume(); }
  get running() { return this.ctx.state === 'running'; }
  // the game sounds sit the same distance under every song: a quiet song brings them down, a loud one up a little
  // (from the song's average level; 0.6 is the bus's level for a song at -16.5 dB)
  levelFor(buffer) {
    let sum = 0, n = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) { const d = buffer.getChannelData(ch); for (let i = 0; i < d.length; i += 61) { sum += d[i] * d[i]; n++; } }
    const db = 10 * Math.log10(Math.max(1e-12, sum / Math.max(1, n)));
    const k = Math.min(1.12, Math.max(0.68, Math.pow(10, (db + 16.5) / 20)));
    return 0.6 * k;
  }
  // the song's loudness every 0.1 s (dB), held over its short dips between beats: for the effects' duck
  loudness(buffer) {
    const sr = buffer.sampleRate, win = Math.round(sr * 0.1), n = Math.floor(buffer.length / win);
    const chs = []; for (let c = 0; c < buffer.numberOfChannels; c++) chs.push(buffer.getChannelData(c));
    const raw = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0, k = 0;
      for (let j = i * win; j < (i + 1) * win; j += 8) { for (const d of chs) { s += d[j] * d[j]; k++; } }
      raw[i] = 10 * Math.log10(Math.max(1e-12, s / Math.max(1, k)));
    }
    const env = new Float32Array(n);
    for (let i = 0; i < n; i++) { let m = -120; for (let j = Math.max(0, i - 3); j <= Math.min(n - 1, i + 3); j++) m = Math.max(m, raw[j]); env[i] = m; }
    return env;
  }
  // how far the effects duck at song time t: none while the song is at -24 dB or louder, 8 dB by -38
  duckAt(env, t) {
    if (!env) return 1;
    const i = Math.max(0, Math.min(env.length - 1, Math.round((t + 0.1) * 10)));
    const k = Math.min(1, Math.max(0, (-24 - env[i]) / 14));
    return Math.pow(10, (-8 * k) / 20);
  }
  setVolumes(music, sfx) {
    this.musicVol.gain.setTargetAtTime(music, this.ctx.currentTime, 0.05);
    this.sfxVol.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.05);
  }

  // ---------- loading ----------
  async fetchBytes(url, onProgress) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(url + ' ' + res.status);
    const total = +res.headers.get('content-length') || 0;
    if (!res.body || !onProgress) return new Uint8Array(await res.arrayBuffer());
    const reader = res.body.getReader();
    const chunks = []; let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      if (total) onProgress(got / total);
    }
    const buf = new Uint8Array(got); let o = 0;
    for (const ch of chunks) { buf.set(ch, o); o += ch.length; }
    return buf;
  }

  // Opus in Ogg, or AAC where that won't decode; a length that doesn't match the beat map counts as a failure
  async loadSong(base, duration, onProgress) {
    const probe = document.createElement('audio');
    const oggFirst = !!probe.canPlayType('audio/ogg; codecs=opus') || !probe.canPlayType('audio/mp4; codecs="mp4a.40.2"');
    let err = null;
    for (const url of oggFirst ? [base + '.ogg', base + '.m4a'] : [base + '.m4a', base + '.ogg']) {
      try {
        const bytes = await this.fetchBytes(url, onProgress);
        const b = await this.ctx.decodeAudioData(bytes.buffer);
        if (!duration || Math.abs(b.duration - duration) < 1.5) return b;
        err = new Error(`${url}: decoded ${b.duration.toFixed(1)} s, beat map says ${duration.toFixed(1)} s`);
      } catch (e) { err = e; }
      console.warn('song: trying the other file after', err && err.message);
    }
    throw err;
  }

  async loadSample(name, url) {
    if (this.samples.has(name)) return this.samples.get(name);
    const bytes = await this.fetchBytes(url);
    const b = await this.ctx.decodeAudioData(bytes.buffer);
    this.samples.set(name, b);
    return b;
  }

  // ---------- the song ----------
  // play from offset seconds in; a negative offset is a count-in (the clock runs, the music comes in at 0)
  play(buffer, offset = 0, fadeIn = 0) {
    this.stop();
    const c = this.ctx;
    if (buffer !== this.buffer) this.reversed = null;
    this.buffer = buffer;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(this.songIn);
    const when = c.currentTime + 0.05;
    if (offset >= 0) src.start(when, offset); else src.start(when - offset, 0);
    this.t0 = when - offset; this.rate = 1;
    this.src = src; this._clockT = null; this._frozen = null; this._ramp = null;
    const g = this.songGain.gain;
    g.cancelScheduledValues(c.currentTime);
    if (fadeIn > 0) { g.setValueAtTime(0.0001, c.currentTime); g.exponentialRampToValueAtTime(1, when + fadeIn); } else g.setValueAtTime(1, c.currentTime);
  }

  stop() {
    if (this.src) { try { this.src.stop(); } catch (e) { /* stopped */ } this.src.disconnect(); this.src = null; }
    if (this._revSrc) { try { this._revSrc.stop(); } catch (e) { /* stopped */ } this._revSrc.disconnect(); this._revSrc = null; }
  }

  pause(songT) { this._frozen = songT; this.stop(); }
  resumeAt(songT) { if (this.buffer) this.play(this.buffer, songT, 0.08); }

  // The time in the song coming out of the speakers for the frame being drawn (now = rAF timestamp).
  // Moves on by exactly the time between frames, follows the audio by running up to 4% fast or slow,
  // and jumps only when well off. While frozen (paused, dead, rewinding) it returns the frozen time.
  time(now) {
    const c = this.ctx;
    if (this._frozen != null) return this._frozen;
    if (c.state !== 'running' || !this.src) return this._clockT ?? 0;
    const pnow = performance.now();
    if (now === undefined) now = pnow;
    if (this._clockT != null && now === this._clockP) return this._clockT;
    let a;
    const ts = c.getOutputTimestamp ? c.getOutputTimestamp() : null;
    if (ts && ts.performanceTime > 0 && ts.contextTime > 0) a = ts.contextTime + (now - ts.performanceTime) / 1000 - this.t0;
    else a = c.currentTime - (c.outputLatency || c.baseLatency || 0) - (pnow - now) / 1000 - this.t0;
    const played = c.currentTime - this.t0;
    if (a > played + 0.05) a = played;
    if (this._clockT == null || !(now > this._clockP)) { this._clockT = a; this._clockP = now; this._err = 0; return a; }
    const step = Math.min(0.1, (now - this._clockP) / 1000), pred = this._clockT + step;
    const err = a - pred;
    this._clockP = now;
    if (Math.abs(err) > 0.15) { this._clockT = a; this._err = 0; return a; }
    this._err += (err - this._err) * Math.min(1, step * 6);
    this._clockT = pred + step * Math.max(-0.04, Math.min(0.04, this._err * 3));
    return this._clockT;
  }

  // The record slows to a stop over `dur` seconds (death). Freezes the clock where it was.
  tapeStop(songT, dur = 0.7) {
    const c = this.ctx, now = c.currentTime;
    this._frozen = songT;
    if (!this.src) return;
    const r = this.src.playbackRate;
    r.cancelScheduledValues(now); r.setValueAtTime(1, now); r.exponentialRampToValueAtTime(0.02, now + dur);
    const g = this.songGain.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0.0001, now + dur);
    const s = this.src; this.src = null;
    setTimeout(() => { try { s.stop(); } catch (e) { /* fine */ } s.disconnect(); }, dur * 1000 + 50);
  }

  // The song played backwards from `from` to `to` over `dur` seconds (a DJ rewind), then on from `to`.
  // Returns a promise that resolves when the music is playing forwards again.
  rewind(from, to, dur = 1.2, onDone) {
    const c = this.ctx;
    if (!this.buffer) return Promise.resolve();
    if (!this.reversed) this.reversed = this._reverse(this.buffer);
    this.stop();
    const span = Math.max(0.1, from - to);
    const rate = Math.min(8, span / dur);
    const src = c.createBufferSource();
    src.buffer = this.reversed;
    src.connect(this.songIn);
    const D = this.buffer.duration;
    const startIn = Math.max(0, D - from); // reversed buffer: time D - from is song time `from`
    const now = c.currentTime;
    src.playbackRate.setValueAtTime(rate * 0.25, now);
    src.playbackRate.linearRampToValueAtTime(rate * 1.25, now + dur * 0.55);
    src.playbackRate.linearRampToValueAtTime(rate * 0.6, now + dur);
    const g = this.songGain.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(0.0001, now); g.exponentialRampToValueAtTime(0.7, now + 0.12);
    g.setValueAtTime(0.7, now + dur - 0.1); g.exponentialRampToValueAtTime(0.0001, now + dur);
    src.start(now, startIn, span * 1.2);
    this._revSrc = src;
    this._frozen = to;
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this._revSrc === src) { try { src.stop(); } catch (e) { /* fine */ } src.disconnect(); this._revSrc = null; }
        this.play(this.buffer, to, 0.04);
        if (onDone) onDone();
        resolve();
      }, dur * 1000);
    });
  }

  _reverse(buf) {
    const out = this.ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const a = buf.getChannelData(ch), b = out.getChannelData(ch);
      for (let i = 0, n = a.length; i < n; i++) b[i] = a[n - 1 - i];
    }
    return out;
  }

  // 0 = the record, 1 = underwater two rooms away
  muffle(k, tc = 0.05) {
    const f = Math.exp(Math.log(20000) + (Math.log(420) - Math.log(20000)) * clamp01(k));
    this.glide(this.lp.frequency, f, tc, f * 0.01);
  }
  setRoom(k) { this.glide(this.roomSend.gain, 0.4 * clamp01(k), 0.2, 0.002); }
  duck(depth = 0.4, recover = 0.5) {
    const g = this.songGain.gain, now = this.ctx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(1 - depth, now + 0.02);
    g.setTargetAtTime(1, now + 0.06, recover / 3);
  }

  // AudioParams keep every target they're given: only set again when it has moved (SIDECHAIN _glide)
  glide(p, v, tc, eps) {
    const now = this.ctx.currentTime, last = p._mpV;
    if (last !== undefined && now >= p._mpAt) {
      const d = Math.abs(v - last), since = now - p._mpAt;
      if (d <= eps && since < 0.5) return;
      if (d < eps * 20 && since < 0.05) return;
    }
    p._mpV = v; p._mpAt = now;
    p.setTargetAtTime(v, now, tc);
  }

  // ---------- building blocks for game sounds ----------
  env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  // a stereo panner at x in -1..1
  pan(x, dest = this.sfx) {
    const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, x)); p.connect(dest); return p;
  }
  tone(freq, { type = 'sine', a = 0.004, d = 0.2, peak = 0.2, at = 0, out = this.sfx, glideTo = 0, detune = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + a + d);
    const g = c.createGain(); this.env(g, t, a, peak, d);
    o.connect(g).connect(out); o.start(t); o.stop(t + a + d + 0.05);
    return g;
  }
  noiseBurst({ a = 0.002, d = 0.12, peak = 0.3, type = 'bandpass', f = 2000, q = 1, fTo = 0, at = 0, out = this.sfx, rate = 1 } = {}) {
    const c = this.ctx, t = c.currentTime + at;
    const n = c.createBufferSource(); n.buffer = this.noise; n.playbackRate.value = rate;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (fTo) fl.frequency.exponentialRampToValueAtTime(fTo, t + a + d);
    const g = c.createGain(); this.env(g, t, a, peak, d);
    n.connect(fl).connect(g).connect(out); n.start(t, Math.random() * 1.5); n.stop(t + a + d + 0.05);
    return g;
  }
  sample(name, { gain = 0.5, rate = 1, at = 0, out = this.sfx, pan = 0 } = {}) {
    const b = this.samples.get(name); if (!b) return;
    const c = this.ctx, t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
    const g = c.createGain(); g.gain.value = gain;
    const dest = pan ? this.pan(pan, out) : out;
    s.connect(g).connect(dest); s.start(t);
  }

  _noiseBuffer(sec) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  _impulse(sec, decay) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
}
