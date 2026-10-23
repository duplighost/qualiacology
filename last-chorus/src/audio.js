// Sound: the song (decoded whole so the clock is sample-exact), the filter the
// ride opens and closes, and the board's own small sounds, all synthesized so
// they can be pitched into the song's key.

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class Sound {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;

    this.master = c.createGain();
    this.master.gain.value = 0.92;
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -4; lim.knee.value = 4; lim.ratio.value = 10;
    lim.attack.value = 0.002; lim.release.value = 0.12;
    this.master.connect(lim).connect(c.destination);

    // song chain: source -> hp -> lp -> gain -> master (+ a little room on the side)
    this.songIn = c.createGain();
    this.hp = c.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.frequency.value = 20; this.hp.Q.value = 0.5;
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = 0.5;
    this.songGain = c.createGain(); this.songGain.gain.value = 1;
    this.songIn.connect(this.hp).connect(this.lp).connect(this.songGain).connect(this.master);
    this.room = c.createConvolver();
    this.room.buffer = this._impulse(2.4, 2.2);
    this.roomSend = c.createGain(); this.roomSend.gain.value = 0;
    this.lp.connect(this.roomSend).connect(this.room).connect(this.master);

    this.sfx = c.createGain(); this.sfx.gain.value = 0.55;
    this.sfx.connect(this.master);
    this.sfxRoom = c.createGain(); this.sfxRoom.gain.value = 0.25;
    this.sfx.connect(this.sfxRoom).connect(this.room);

    this._noise = this._noiseBuffer(2);
    this._beds();

    this.src = null; this.t0 = 0; this.buffer = null;
    this.keyRoot = 0; this.keyMinor = false;
    this._clockT = null; this._clockP = 0;
  }

  async decode(url, onProgress) {
    const res = await fetch(url);
    const total = +res.headers.get('content-length') || 0;
    let got = 0; const chunks = [];
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      if (onProgress && total) onProgress(got / total);
    }
    const buf = new Uint8Array(got); let o = 0;
    for (const ch of chunks) { buf.set(ch, o); o += ch.length; }
    return await this.ctx.decodeAudioData(buf.buffer);
  }

  resume() { if (this.ctx.state !== 'running') return this.ctx.resume(); return Promise.resolve(); }

  play(buffer, offset = 0) {
    this.stop();
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(this.songIn);
    const when = c.currentTime + 0.06;
    src.start(when, Math.max(0, offset));
    this.t0 = when - offset;
    this.src = src; this.buffer = buffer;
    this._clockT = null;
    this.songGain.gain.cancelScheduledValues(c.currentTime);
    this.songGain.gain.setValueAtTime(1, c.currentTime);
  }

  stop() {
    if (this.src) { try { this.src.stop(); } catch (e) { /* already stopped */ } this.src.disconnect(); this.src = null; }
  }

  // The time in the song that is coming out of the speakers right now.
  // Smoothed so frames advance evenly, but never allowed to drift from the audio.
  time() {
    const c = this.ctx;
    let t;
    const ts = c.getOutputTimestamp ? c.getOutputTimestamp() : null;
    if (ts && ts.performanceTime > 0 && ts.contextTime > 0) {
      t = ts.contextTime + (performance.now() - ts.performanceTime) / 1000 - this.t0;
    } else {
      t = c.currentTime - (c.outputLatency || c.baseLatency || 0) - this.t0;
    }
    const now = performance.now();
    if (this._clockT == null) { this._clockT = t; this._clockP = now; return t; }
    const pred = this._clockT + (now - this._clockP) / 1000;
    const err = t - pred;
    this._clockT = Math.abs(err) > 0.06 ? t : pred + err * 0.08;
    this._clockP = now;
    return this._clockT;
  }

  // flow 0..1: how much of the band you've earned. 0 sounds like a cheap radio
  // two rooms away, 1 is the record.
  setFlow(flow, muffle = 0, room = 0) {
    const c = this.ctx, now = c.currentTime;
    const f = clamp01(flow);
    const e = f * f * (3 - 2 * f);
    const hp = Math.exp(lerp(Math.log(380), Math.log(18), e));
    let lp = Math.exp(lerp(Math.log(2400), Math.log(20000), e));
    lp = Math.exp(lerp(Math.log(lp), Math.log(520), clamp01(muffle)));
    this.hp.frequency.setTargetAtTime(hp, now, 0.09);
    this.lp.frequency.setTargetAtTime(lp, now, muffle > 0.01 ? 0.03 : 0.09);
    this.roomSend.gain.setTargetAtTime(0.06 + 0.5 * room + 0.25 * (1 - e), now, 0.15);
  }

  duck(depth = 0.5, time = 0.6) {
    const g = this.songGain.gain, now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(1 - depth, now + 0.03);
    g.setTargetAtTime(1, now + 0.08, time / 3);
  }

  setKey(root, minor) { this.keyRoot = root; this.keyMinor = minor; }

  // ---------- continuous beds: wind and board hum ----------
  _beds() {
    const c = this.ctx;
    const n = c.createBufferSource(); n.buffer = this._noise; n.loop = true;
    this.windBp = c.createBiquadFilter(); this.windBp.type = 'bandpass'; this.windBp.frequency.value = 600; this.windBp.Q.value = 0.7;
    this.windLp = c.createBiquadFilter(); this.windLp.type = 'lowpass'; this.windLp.frequency.value = 3000;
    this.windGain = c.createGain(); this.windGain.gain.value = 0;
    n.connect(this.windBp).connect(this.windLp).connect(this.windGain).connect(this.master);
    n.start();
    // board hum: two soft detuned triangles through a lowpass, pitch follows speed
    this.humGain = c.createGain(); this.humGain.gain.value = 0;
    this.humLp = c.createBiquadFilter(); this.humLp.type = 'lowpass'; this.humLp.frequency.value = 500; this.humLp.Q.value = 2;
    this.hum = [c.createOscillator(), c.createOscillator()];
    this.hum[0].type = 'triangle'; this.hum[1].type = 'triangle';
    this.hum.forEach((o, i) => { o.frequency.value = 55 * (i ? 1.005 : 1); o.connect(this.humLp); o.start(); });
    this.humLp.connect(this.humGain).connect(this.master);
  }

  setMotion(speed, air, press, on = 1) {
    const c = this.ctx, now = c.currentTime;
    const s = clamp01((speed - 10) / 70);
    this.windGain.gain.setTargetAtTime(on * (0.015 + 0.09 * s * s + (air ? 0.03 : 0)), now, 0.15);
    this.windBp.frequency.setTargetAtTime(260 + 900 * s + (air ? 300 : 0), now, 0.2);
    const f = 42 + 50 * s + (press ? 6 : 0);
    this.hum[0].frequency.setTargetAtTime(f, now, 0.08);
    this.hum[1].frequency.setTargetAtTime(f * 2.003, now, 0.08);
    this.humLp.frequency.setTargetAtTime(300 + 900 * s + (press ? 500 : 0), now, 0.06);
    this.humGain.gain.setTargetAtTime(on * (air ? 0.002 : 0.006 + 0.007 * s), now, 0.12);
  }

  // ---------- one-shots ----------
  _env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  // the pump landing in the valley on the beat: felt more than heard
  thump(q = 1) {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(125, t); o.frequency.exponentialRampToValueAtTime(62, t + 0.12);
    const g = c.createGain(); this._env(g, t, 0.004, 0.2 * q, 0.14);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.3);
    const n = c.createBufferSource(); n.buffer = this._noise;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g2 = c.createGain(); this._env(g2, t, 0.002, 0.12 * q, 0.09);
    n.connect(f).connect(g2).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.15);
  }

  // scrape: pressing on the way up brakes you
  scrape(amount) {
    const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = this._noise;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 1.4;
    const g = c.createGain(); this._env(g, t, 0.01, 0.05 * amount, 0.18);
    n.connect(f).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.25);
  }

  whoosh(strength = 1) {
    const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = this._noise;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1;
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.35);
    const g = c.createGain(); this._env(g, t, 0.05, 0.16 * strength, 0.4);
    n.connect(f).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.6);
  }

  land(quality, hard) {
    const c = this.ctx, t = c.currentTime;
    if (hard > 0.05) {
      const n = c.createBufferSource(); n.buffer = this._noise;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500 + 900 * hard;
      const g = c.createGain(); this._env(g, t, 0.002, 0.18 + 0.4 * hard, 0.25 + 0.2 * hard);
      n.connect(f).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.6);
      const o = c.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.3);
      const g2 = c.createGain(); this._env(g2, t, 0.003, 0.4 * hard + 0.1, 0.3);
      o.connect(g2).connect(this.sfx); o.start(t); o.stop(t + 0.4);
    } else {
      this.thump(0.6);
    }
    if (quality > 0.6) this.chime(quality, 2);
  }

  // a note of the song's key. degree in the major/minor pentatonic, octave offset
  note(degree, oct = 1) {
    const pent = this.keyMinor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
    const d = ((degree % 5) + 5) % 5, o = Math.floor(degree / 5);
    const semis = this.keyRoot + pent[d] + 12 * (o + oct);
    return 261.63 * Math.pow(2, (semis - 0) / 12) / 2;
  }

  chime(level = 1, degree = 0) {
    const c = this.ctx, t = c.currentTime;
    const f0 = this.note(degree, 2);
    [1, 2.01, 3.98].forEach((m, i) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f0 * m;
      const g = c.createGain(); this._env(g, t, 0.003, (0.06 / (i + 1)) * level, 0.9 / (i + 1));
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 1.2);
    });
  }

  pickup(degree) {
    const c = this.ctx, t = c.currentTime;
    // the melody wanders; keep it inside two octaves, turning back at the edges
    let d = ((degree % 18) + 18) % 18; if (d > 9) d = 18 - d;
    const f0 = this.note(d - 2, 2);
    // a glint on top so it reads even under a loud chorus
    const gl = c.createOscillator(); gl.type = 'sine'; gl.frequency.value = f0 * 4;
    const gg = c.createGain(); this._env(gg, t, 0.001, 0.025, 0.12);
    gl.connect(gg).connect(this.sfx); gl.start(t); gl.stop(t + 0.2);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f0;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f0 * 2;
    const g = c.createGain(); this._env(g, t, 0.002, 0.07, 0.5);
    const g2 = c.createGain(); this._env(g2, t, 0.002, 0.03, 0.3);
    o.connect(g).connect(this.sfx); o2.connect(g2).connect(this.sfx);
    o.start(t); o.stop(t + 0.7); o2.start(t); o2.stop(t + 0.5);
  }

  // a pump landed, judged when you let go. perfect: a punch on the beat with a bright
  // edge and a chord of the song's key; good: the punch and one note; early/late: a dull tock
  hit(grade, streak = 0) {
    const c = this.ctx, t = c.currentTime;
    if (grade === 'perfect' || grade === 'good') {
      const big = grade === 'perfect';
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(big ? 150 : 130, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.13);
      const g = c.createGain(); this._env(g, t, 0.003, big ? 0.34 : 0.24, 0.16);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.3);
      // the bright edge: a short click of filtered noise
      const n = c.createBufferSource(); n.buffer = this._noise;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = big ? 5200 : 3800; bp.Q.value = 0.8;
      const g2 = c.createGain(); this._env(g2, t, 0.001, big ? 0.16 : 0.09, 0.035);
      n.connect(bp).connect(g2).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.08);
      // the chord rises a step every eight in a row
      const lift = Math.min(4, Math.floor(streak / 8));
      const degs = big ? [lift, lift + 2, lift + 4] : [lift + 2];
      degs.forEach((d, i) => {
        const f0 = this.note(d, 2);
        const s = c.createOscillator(); s.type = i ? 'sine' : 'triangle'; s.frequency.value = f0;
        const gs = c.createGain(); this._env(gs, t + i * 0.012, 0.004, (big ? 0.05 : 0.04) / (1 + i * 0.4), big ? 0.55 : 0.35);
        s.connect(gs).connect(this.sfx); s.start(t); s.stop(t + 0.9);
      });
    } else if (grade === 'early' || grade === 'late') {
      const n = c.createBufferSource(); n.buffer = this._noise;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      const g = c.createGain(); this._env(g, t, 0.002, 0.08, 0.07);
      n.connect(lp).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.12);
    }
  }

  // eight in a row: a quick run up the key
  flourish(streak) {
    const c = this.ctx, t = c.currentTime;
    const base = Math.min(3, Math.floor(streak / 8) - 1);
    [0, 1, 2, 3, 5].forEach((d, i) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = this.note(base + d, 3);
      const g = c.createGain(); this._env(g, t + i * 0.045, 0.003, 0.035, 0.4);
      o.connect(g).connect(this.sfx); o.start(t + i * 0.045); o.stop(t + i * 0.045 + 0.5);
    });
  }

  // holding down a hill: a soft rush that rises the further down you get
  charge(on, progress = 0) {
    const c = this.ctx, now = c.currentTime;
    if (!this._charge) {
      const n = c.createBufferSource(); n.buffer = this._noise; n.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.6; bp.frequency.value = 400;
      const g = c.createGain(); g.gain.value = 0;
      n.connect(bp).connect(g).connect(this.sfx); n.start();
      this._charge = { bp, g };
    }
    const s = this._charge;
    s.bp.frequency.setTargetAtTime(380 + 1500 * progress * progress, now, 0.05);
    s.g.gain.setTargetAtTime(on ? 0.012 + 0.03 * progress : 0, now, on ? 0.06 : 0.03);
  }

  // a siren going past: a slow wail, quiet, higher coming toward you and lower going away
  siren(level, doppler = 1) {
    const c = this.ctx, now = c.currentTime;
    if (!this._siren) {
      if (level <= 0.001) return;
      const o = c.createOscillator(); o.type = 'sawtooth';
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
      const bp = c.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 1100; bp.gain.value = 6;
      const g = c.createGain(); g.gain.value = 0;
      o.connect(lp).connect(bp).connect(g).connect(this.sfx); o.start();
      this._siren = { o, g, t0: now };
    }
    const s = this._siren;
    const ph = ((now - s.t0) / 2.4) % 1;
    const f = (680 + 520 * (0.5 - 0.5 * Math.cos(ph * Math.PI * 2))) * doppler;
    s.o.frequency.setTargetAtTime(f, now, 0.03);
    s.g.gain.setTargetAtTime(0.035 * clamp01(level), now, 0.12);
  }

  // a heart monitor's beep, on the song's root
  beep(q = 1) {
    const c = this.ctx, t = c.currentTime;
    const f0 = this.note(0, 2), lvl = 0.045 * (0.45 + 0.55 * q);
    [[1, 1], [2, 0.18]].forEach(([m, k]) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f0 * m;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lvl * k, t + 0.005);
      g.gain.setValueAtTime(lvl * k, t + 0.085); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.2);
    });
  }

  // lub-dub: low, soft, felt more than heard
  heartbeat(level = 1) {
    const c = this.ctx, t0 = c.currentTime;
    [[0, 72, 44, 0.32], [0.24, 86, 52, 0.2]].forEach(([dt, f1, f2, k]) => {
      const t = t0 + dt;
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + 0.16);
      const g = c.createGain(); this._env(g, t, 0.008, k * level, 0.22);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.35);
    });
  }

  crash() {
    const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = this._noise;
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(4000, t); f.frequency.exponentialRampToValueAtTime(200, t + 0.8);
    const g = c.createGain(); this._env(g, t, 0.002, 0.5, 0.9);
    n.connect(f).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 1.1);
    this.duck(0.7, 1.4);
  }

  // thunder a way off: a low rolling rumble
  thunder(level = 1) {
    const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = this._noise; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(420, t); f.frequency.exponentialRampToValueAtTime(90, t + 2.6);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * level, t + 0.08);
    g.gain.setValueAtTime(0.5 * level, t + 0.3); g.gain.exponentialRampToValueAtTime(0.18 * level, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    n.connect(f).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 3.3);
  }
  // a knock you feel more than hear
  thud(level = 1) {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
    const g = c.createGain(); this._env(g, t, 0.003, 0.7 * level, 0.45);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.5);
    const n = c.createBufferSource(); n.buffer = this._noise;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const g2 = c.createGain(); this._env(g2, t, 0.002, 0.25 * level, 0.12);
    n.connect(f).connect(g2).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.2);
    this.duck(0.35, 0.5);
  }

  _noiseBuffer(sec) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  _impulse(sec, decay) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }
}
