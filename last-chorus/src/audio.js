// Sound: the song (decoded whole so the clock is sample-exact), the filter the
// ride opens and closes, and the board's own small sounds, all synthesized so
// they can be pitched into the song's key.

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class Sound {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    // (a phone gets a little more room in its audio buffer: under a busy game the smallest one can
    // run dry and the music stutters; the picture follows what's heard either way)
    let coarse = false; try { coarse = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches; } catch (e) { /* old browser */ }
    this.ctx = new AC({ latencyHint: coarse ? 'balanced' : 'interactive' });
    // an iPhone's silent switch mutes web audio unless the page says it's playing music
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* fine */ }
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

  // the song file: Opus in Ogg, or AAC where that won't decode (Safari before 18.4 can't, and some
  // later ones get the length wrong, so a length that doesn't match the beat map counts as a failure)
  async song(id, duration, onProgress) {
    const ogg = `assets/music/${id}.ogg`, m4a = `assets/music/${id}.m4a`;
    const probe = document.createElement('audio');
    const oggFirst = !!probe.canPlayType('audio/ogg; codecs=opus') || !probe.canPlayType('audio/mp4; codecs="mp4a.40.2"');
    let err = null;
    for (const url of oggFirst ? [ogg, m4a] : [m4a, ogg]) {
      try {
        const b = await this.decode(url, onProgress);
        if (!duration || Math.abs(b.duration - duration) < 1.5) return b;
        err = new Error(`${url}: decoded ${b.duration.toFixed(1)} s, the beat map says ${duration.toFixed(1)} s`);
      } catch (e) { err = e; }
      console.warn('song: trying the other file after', err && err.message);
    }
    throw err;
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

  // ---------- the song list's previews ----------
  // A little of the song you're on, from its first chorus: streamed through an audio element (not
  // decoded whole), faded in, looped every 24 s; moving on fades it out under the next. Two
  // elements made once and woken on the first press (a phone only lets one play that a finger
  // started), taking turns.
  _pvInit() {
    if (this._pvEls) return;
    this._pvEls = [0, 1].map(() => {
      const el = new Audio(); el.preload = 'auto';
      let src = null, g = null;
      try { src = this.ctx.createMediaElementSource(el); g = this.ctx.createGain(); g.gain.value = 0; src.connect(g).connect(this.master); } catch (e) { /* plays straight out instead */ }
      return { el, g, id: null, at: 0, on: false };
    });
    this._pvK = 0;
    const probe = document.createElement('audio');
    this._pvExt = probe.canPlayType('audio/ogg; codecs=opus') ? 'ogg' : 'm4a';
  }
  // on a finger or a key: wake the preview players (silently)
  unlockPreviews() {
    this._pvInit();
    for (const p of this._pvEls) { if (p.unlocked) continue; p.unlocked = true; const el = p.el; el.muted = true; const r = el.play(); if (r && r.catch) r.then(() => { if (!p.on) el.pause(); el.muted = false; }, () => { el.muted = false; }); else el.muted = false; }
  }
  preview(id, at) {
    this._pvInit();
    if (this.ctx.state !== 'running') { this.ctx.resume().then(() => { if (this.ctx.state === 'running') this.preview(id, at); }, () => { /* not yet */ }); return; }
    const cur = this._pvEls[this._pvK];
    if (cur.on && cur.id === id) return;
    this.stopPreview(0.45);
    this._pvK = 1 - this._pvK;
    const p = this._pvEls[this._pvK], el = p.el, c = this.ctx;
    p.id = id; p.at = at; p.on = true; p.token = (p.token || 0) + 1;
    const tok = p.token;
    const fadeIn = () => { if (p.g) { p.g.gain.cancelScheduledValues(c.currentTime); p.g.gain.setValueAtTime(p.g.gain.value, c.currentTime); p.g.gain.linearRampToValueAtTime(0.7, c.currentTime + 0.9); } else el.volume = 0.7; };
    el.src = `assets/music/${id}.${this._pvExt}`;
    const start = () => {
      if (p.token !== tok || !p.on) return;
      try { el.currentTime = at; } catch (e) { /* seeks once it can */ }
      const r = el.play(); if (r && r.catch) r.catch(() => { /* not allowed yet */ });
      fadeIn();
    };
    el.addEventListener('loadedmetadata', start, { once: true });
    el.load();
    // round again before it runs too long: down, back to the chorus, up
    clearInterval(this._pvTimer);
    this._pvTimer = setInterval(() => {
      if (!p.on || p.token !== tok) return;
      if (el.currentTime > at + 24 || el.ended) {
        if (p.g) { p.g.gain.cancelScheduledValues(c.currentTime); p.g.gain.setValueAtTime(p.g.gain.value, c.currentTime); p.g.gain.linearRampToValueAtTime(0, c.currentTime + 0.5); }
        setTimeout(() => { if (p.token !== tok || !p.on) return; try { el.currentTime = at; } catch (e) { /* fine */ } fadeIn(); }, 520);
      }
    }, 250);
  }
  stopPreview(fade = 0.5) {
    if (!this._pvEls) return;
    const c = this.ctx;
    for (const p of this._pvEls) {
      if (!p.on) continue;
      p.on = false;
      const tok = p.token;
      if (p.g) { p.g.gain.cancelScheduledValues(c.currentTime); p.g.gain.setValueAtTime(p.g.gain.value, c.currentTime); p.g.gain.linearRampToValueAtTime(0, c.currentTime + fade); }
      setTimeout(() => { if (p.token === tok && !p.on) { p.el.pause(); } }, fade * 1000 + 60);
    }
  }

  // play the song from offset seconds in. A negative offset starts it that far in the
  // future (a count-in): the clock runs from the offset and the music comes in at 0.
  play(buffer, offset = 0, fadeIn = 0) {
    this.stop();
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(this.songIn);
    const when = c.currentTime + 0.06;
    if (offset >= 0) src.start(when, offset);
    else src.start(when - offset, 0);
    this.t0 = when - offset;
    this.src = src; this.buffer = buffer;
    this._clockT = null; this._frozen = null;
    const g = this.songGain.gain;
    g.cancelScheduledValues(c.currentTime);
    if (fadeIn > 0) { g.setValueAtTime(0.0001, c.currentTime); g.exponentialRampToValueAtTime(1, when + fadeIn); }
    else g.setValueAtTime(1, c.currentTime);
  }

  stop() {
    if (this.src) { try { this.src.stop(); } catch (e) { /* already stopped */ } this.src.disconnect(); this.src = null; }
  }

  // pause: remember where the song is, stop it and put the whole context to sleep
  pause(songT) {
    this._frozen = songT;
    this.stop();
    try { this.ctx.suspend(); } catch (e) { /* fine */ }
  }
  // wake the context, waiting for it to really run (or giving up after a while)
  async wake(timeout = 2000) {
    const c = this.ctx;
    if (c.state === 'running') return true;
    try { await Promise.race([c.resume(), new Promise((r) => setTimeout(r, timeout))]); } catch (e) { /* tried */ }
    return c.state === 'running';
  }
  get running() { return this.ctx.state === 'running'; }

  // The time in the song coming out of the speakers, for the frame being drawn. now is that
  // frame's own timestamp (requestAnimationFrame's), so each frame moves on by exactly the time
  // between frames; the clock follows the audio by running a touch fast or slow, never by jumping
  // (a phone's audio clock is coarse and jittery, and following it step by step shook the picture),
  // and jumps only when it is well off (a stall, a seek). Asked twice in a frame, it answers the
  // same. While the song is stopped or the context isn't running it stands still.
  time(now) {
    const c = this.ctx;
    if (this._frozen != null) return this._frozen;
    if (c.state !== 'running') return this._clockT ?? (c.currentTime - this.t0);
    const pnow = performance.now();
    if (now === undefined) now = pnow;
    if (this._clockT != null && now === this._clockP) return this._clockT;
    // where the music coming out of the speakers was at now
    let a;
    const ts = c.getOutputTimestamp ? c.getOutputTimestamp() : null;
    if (ts && ts.performanceTime > 0 && ts.contextTime > 0) a = ts.contextTime + (now - ts.performanceTime) / 1000 - this.t0;
    else a = c.currentTime - (c.outputLatency || c.baseLatency || 0) - (pnow - now) / 1000 - this.t0;
    // an output stamp from before a pause can run far ahead: never trust one past what the context has actually played
    const played = c.currentTime - this.t0;
    if (a > played + 0.05) a = played;
    if (this._clockT == null || !(now > this._clockP)) { this._clockT = a; this._clockP = now; this._err = 0; return a; }
    const step = Math.min(0.1, (now - this._clockP) / 1000), pred = this._clockT + step;
    const err = a - pred;
    this._clockP = now;
    if (Math.abs(err) > 0.15) { this._clockT = a; this._err = 0; return a; }
    // (the error smoothed over a sixth of a second, then made up at most 4% faster or slower)
    this._err += (err - this._err) * Math.min(1, step * 6);
    this._clockT = pred + step * Math.max(-0.04, Math.min(0.04, this._err * 3));
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
    this._glide(this.hp.frequency, hp, 0.09, hp * 0.01);
    this._glide(this.lp.frequency, lp, muffle > 0.01 ? 0.03 : 0.09, lp * 0.01);
    this._glide(this.roomSend.gain, 0.06 + 0.5 * room + 0.25 * (1 - e), 0.15, 0.003);
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
    const s = clamp01((speed - 10) / 70);
    this._glide(this.windGain.gain, on * (0.015 + 0.09 * s * s + (air ? 0.03 : 0)), 0.15, 0.0005);
    this._glide(this.windBp.frequency, 260 + 900 * s + (air ? 300 : 0), 0.2, 4);
    const f = 42 + 50 * s + (press ? 6 : 0);
    this._glide(this.hum[0].frequency, f, 0.08, 0.25);
    this._glide(this.hum[1].frequency, f * 2.003, 0.08, 0.5);
    this._glide(this.humLp.frequency, 300 + 900 * s + (press ? 500 : 0), 0.06, 4);
    this._glide(this.humGain.gain, on * (air ? 0.002 : 0.006 + 0.007 * s), 0.12, 0.0002);
  }
  // A glide toward v, not every frame: an AudioParam keeps every target it's set, and a dozen set
  // every frame were a few percent of a phone's frame. Set again only when it's moved by more
  // than eps (a small move at most twenty times a second), and every half second regardless.
  _glide(p, v, tc, eps) {
    const now = this.ctx.currentTime, last = p._lcV;
    if (last !== undefined && now >= p._lcAt) {
      const d = Math.abs(v - last), since = now - p._lcAt;
      if (d <= eps && since < 0.5) return;
      if (d < eps * 20 && since < 0.05) return;
    }
    p._lcV = v; p._lcAt = now;
    p.setTargetAtTime(v, now, tc);
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
    this._glide(s.bp.frequency, 380 + 1500 * progress * progress, 0.05, 4);
    this._glide(s.g.gain, on ? 0.012 + 0.03 * progress : 0, on ? 0.06 : 0.03, 0.0005);
  }

  // on a rail: a low metal hiss under the music while she's on it
  grind(on) {
    const c = this.ctx, now = c.currentTime;
    if (!this._grind) {
      const n = c.createBufferSource(); n.buffer = this._noise; n.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.5; bp.frequency.value = 2600;
      const bp2 = c.createBiquadFilter(); bp2.type = 'peaking'; bp2.frequency.value = 5200; bp2.gain.value = 5; bp2.Q.value = 6;
      const g = c.createGain(); g.gain.value = 0;
      n.connect(bp).connect(bp2).connect(g).connect(this.sfx); n.start();
      this._grind = { g, bp };
    }
    const s = this._grind;
    s.g.gain.setTargetAtTime(on ? 0.035 : 0, now, on ? 0.02 : 0.06);
    s.bp.frequency.setTargetAtTime(on ? 2900 : 2200, now, 0.2);
  }

  // ... and held down on the rail it bites: louder, higher
  grindPress(k) {
    const s = this._grind;
    if (!s) return;
    const now = this.ctx.currentTime;
    s.g.gain.setTargetAtTime(k ? 0.06 : 0.035, now, 0.03);
    s.bp.frequency.setTargetAtTime(k ? 3900 : 2900, now, 0.05);
  }

  // the stop at the end: a soft hiss of spray off the edge, falling with her speed
  skid(level = 0) {
    const c = this.ctx, now = c.currentTime;
    if (!this._skid) {
      const n = c.createBufferSource(); n.buffer = this._noise; n.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8; bp.frequency.value = 1800;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
      const g = c.createGain(); g.gain.value = 0;
      n.connect(bp).connect(lp).connect(g).connect(this.sfx); n.start();
      this._skid = { bp, g };
    }
    const s = this._skid;
    this._glide(s.bp.frequency, 700 + 2600 * level, 0.06, 6);
    this._glide(s.g.gain, 0.09 * level, level > 0.01 ? 0.04 : 0.12, 0.0008);
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
    if (level > 0.001) this._glide(s.o.frequency, f, 0.03, 3);
    this._glide(s.g.gain, 0.035 * clamp01(level), 0.12, 0.0005);
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
  // a phone camera's shutter: two quick clicks
  shutter(level = 1) {
    const c = this.ctx, t = c.currentTime;
    [0, 0.07].forEach((dt, i) => {
      const n = c.createBufferSource(); n.buffer = this._noise;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = i ? 3200 : 2400; f.Q.value = 1.2;
      const g = c.createGain(); this._env(g, t + dt, 0.001, 0.14 * level, 0.035);
      n.connect(f).connect(g).connect(this.sfx); n.start(t + dt, Math.random()); n.stop(t + dt + 0.08);
    });
  }
  // a bell a way off: struck once, its partials ringing out, on a note of the song's key
  bell(level = 0.6, degree = 0) {
    const c = this.ctx, t = c.currentTime, f0 = this.note(degree, 1);
    [[0.5, 0.5, 4.5], [1, 1, 3.6], [1.19, 0.5, 2.6], [1.5, 0.45, 2.2], [2.0, 0.35, 1.8], [2.52, 0.2, 1.2], [3.0, 0.14, 0.9]].forEach(([m, k, d]) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f0 * m;
      const g = c.createGain(); this._env(g, t, 0.004, 0.05 * k * level, d);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + d + 0.1);
    });
  }
  // the school bell on the wall: the clapper going for a moment, then it stops
  ring(level = 0.4, dur = 0.7) {
    const c = this.ctx, t = c.currentTime;
    const out = c.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.06 * level, t + 0.015); out.gain.setValueAtTime(0.06 * level, t + dur); out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.45);
    const vca = c.createGain(); vca.gain.value = 0.5;
    const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 23;
    const depth = c.createGain(); depth.gain.value = 0.5; lfo.connect(depth).connect(vca.gain);
    [[1, 1], [2.76, 0.45], [5.4, 0.2], [8.93, 0.08]].forEach(([m, k]) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 1180 * m; const g = c.createGain(); g.gain.value = k; o.connect(g).connect(vca); o.start(t); o.stop(t + dur + 0.5); });
    vca.connect(out).connect(this.sfx); lfo.start(t); lfo.stop(t + dur + 0.5);
  }
  // the screens' own sounds, quiet and woody, in D major pentatonic (no song is playing):
  // move ticks walk up the scale with the list, pick is a small rising fifth, open/close a
  // breath of air, unlock a little run up, no a muted double knock
  ui(kind, i = 0) {
    const c = this.ctx;
    // (asleep until the first press: wake it and play this once it's up, so that first press is heard)
    if (c.state !== 'running') {
      if (!this._uiWaking) { this._uiWaking = true; c.resume().then(() => { this._uiWaking = false; if (c.state === 'running') this.ui(kind, i); }, () => { this._uiWaking = false; }); }
      return;
    }
    const t = c.currentTime;
    if (kind === 'move') { if (t - (this._uiT || 0) < 0.035) return; this._uiT = t; }
    if (kind === 'tick') { if (t - (this._tickT || 0) < 0.03) return; this._tickT = t; }
    const pent = [0, 2, 4, 7, 9];
    const hz = (deg, oct) => 293.66 * Math.pow(2, (pent[((deg % 5) + 5) % 5] + 12 * (Math.floor(deg / 5) + oct)) / 12);
    const tone = (f, at, peak, dec, type = 'sine') => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f;
      const g = c.createGain(); this._env(g, t + at, 0.003, peak, dec);
      o.connect(g).connect(this.sfx); o.start(t + at); o.stop(t + at + dec + 0.05);
    };
    const air = (from, to, peak, dur) => {
      const n = c.createBufferSource(); n.buffer = this._noise;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
      f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
      const g = c.createGain(); this._env(g, t, dur * 0.4, peak, dur * 0.6);
      n.connect(f).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + dur + 0.05);
    };
    if (kind === 'move') {
      tone(hz(i % 10, 1), 0, 0.045, 0.07);
      tone(hz(i % 10, 2), 0, 0.012, 0.03, 'triangle');
    } else if (kind === 'pick') {
      tone(hz(0, 1), 0, 0.07, 0.35); tone(hz(3, 1), 0.07, 0.08, 0.6); tone(hz(3, 2), 0.07, 0.016, 0.3, 'triangle');
    } else if (kind === 'open') {
      air(600, 2400, 0.1, 0.28); tone(hz(0, 0), 0.02, 0.05, 0.35);
    } else if (kind === 'close') {
      air(2200, 500, 0.08, 0.24); tone(hz(-2, 0), 0.02, 0.045, 0.3);
    } else if (kind === 'unlock') {
      [0, 2, 4, 5, 7].forEach((d, k) => tone(hz(d, 1), k * 0.06, 0.06, 0.5));
      tone(hz(7, 2), 0.3, 0.022, 0.9, 'triangle');
    } else if (kind === 'no') {
      tone(150, 0, 0.06, 0.06); tone(130, 0.09, 0.05, 0.07);
    } else if (kind === 'start') {
      // in from the title: a rush of air up, a low thump and a chord that opens out
      air(300, 3200, 0.14, 0.5);
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
      const g = c.createGain(); this._env(g, t, 0.004, 0.22, 0.32); o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.4);
      [0, 2, 4, 7].forEach((d, k) => tone(hz(d, 1), 0.05 + k * 0.045, 0.05, 0.9));
      tone(hz(5, 2), 0.25, 0.02, 1.1, 'triangle');
    } else if (kind === 'ride') {
      // RIDE: air pulled up hard and two notes going up into it
      air(500, 4200, 0.12, 0.34);
      tone(hz(0, 1), 0, 0.06, 0.22); tone(hz(4, 1), 0.08, 0.07, 0.5); tone(hz(4, 2), 0.08, 0.02, 0.4, 'triangle');
    } else if (kind === 'tick') {
      // the list going by under a finger or a wheel: a soft click, a little higher further down
      const n = c.createBufferSource(); n.buffer = this._noise;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.2; f.frequency.value = 2400 + 60 * (i % 12);
      const g = c.createGain(); this._env(g, t, 0.001, 0.05, 0.025);
      n.connect(f).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.05);
      tone(hz(i % 10, 2), 0, 0.008, 0.03, 'triangle');
    } else if (kind === 'gear') {
      // a rider or a board picked: a small click and a note
      air(1800, 2600, 0.05, 0.06);
      tone(hz(2 + (i % 3), 1), 0.01, 0.05, 0.28); tone(hz(2 + (i % 3), 2), 0.01, 0.012, 0.18, 'triangle');
    }
  }
  // a bubble of gum going: a soft pop
  pop(level = 0.5) {
    const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = this._noise;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.9;
    const g = c.createGain(); this._env(g, t, 0.001, 0.22 * level, 0.05);
    n.connect(f).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.1);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    const g2 = c.createGain(); this._env(g2, t, 0.002, 0.3 * level, 0.1);
    o.connect(g2).connect(this.sfx); o.start(t); o.stop(t + 0.15);
  }
  // a car meeting a car down the street: a short crunch of metal and a low knock, no louder than a snare
  impact(level = 0.6) {
    const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = this._noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8; bp.frequency.setValueAtTime(2600, t); bp.frequency.exponentialRampToValueAtTime(320, t + 0.32);
    const g = c.createGain(); this._env(g, t, 0.003, 0.16 * level, 0.36);
    n.connect(bp).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.45);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(105, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.22);
    const g2 = c.createGain(); this._env(g2, t, 0.004, 0.24 * level, 0.28);
    o.connect(g2).connect(this.sfx); o.start(t); o.stop(t + 0.36);
  }
  // a shop window going: a bright crack, then the pieces, each a little ping on the song's key
  glass(level = 0.6) {
    const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = this._noise;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3200;
    const g = c.createGain(); this._env(g, t, 0.001, 0.12 * level, 0.18);
    n.connect(hp).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.25);
    for (let i = 0; i < 7; i++) {
      const dt = 0.04 + i * 0.045 + Math.random() * 0.03;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = this.note([0, 4, 7, 9, 12, 14, 16][i % 7], 3);
      const gg = c.createGain(); this._env(gg, t + dt, 0.002, 0.018 * level, 0.22);
      o.connect(gg).connect(this.sfx); o.start(t + dt); o.stop(t + dt + 0.3);
    }
  }
  // a run broken: the needle dragged across the record, short, and the song ducks under it
  scratch(level = 0.7) {
    const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = this._noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6;
    bp.frequency.setValueAtTime(2400, t); bp.frequency.exponentialRampToValueAtTime(420, t + 0.09);
    bp.frequency.exponentialRampToValueAtTime(1500, t + 0.16); bp.frequency.exponentialRampToValueAtTime(300, t + 0.26);
    const g = c.createGain(); this._env(g, t, 0.004, 0.22 * level, 0.24);
    n.connect(bp).connect(g).connect(this.sfx); n.start(t, Math.random()); n.stop(t + 0.32);
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.09);
    o.frequency.exponentialRampToValueAtTime(240, t + 0.16); o.frequency.exponentialRampToValueAtTime(60, t + 0.26);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    const g2 = c.createGain(); this._env(g2, t, 0.004, 0.05 * level, 0.22);
    o.connect(lp).connect(g2).connect(this.sfx); o.start(t); o.stop(t + 0.3);
    this.duck(0.45, 0.45);
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
