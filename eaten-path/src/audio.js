// audio.js — the entire soundscape, synthesized. No samples anywhere.
// Layers: footsteps in leaves, crickets/katydids that thin out with depth,
// owls, wind, forgotten machinery humming through HRTF panners, the forest
// creaking shut behind you, and a tape-transport wow/flutter on everything.
import * as THREE from 'three';

function fract(x) { return x - Math.floor(x); }

export class GameAudio {
  constructor() {
    this.ready = false;
    this.hums = new Map();
    this.biomeKind = 'corridor';
    this.tier = 0;
    this._owlT = 20; this._wailT = 90; this._cricketAcc = 0;
    this._windTarget = 0.5; this._windT = 0;
    this._fv = new THREE.Vector3();
  }

  init() {
    if (this.ready) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    this.ready = true;

    // master: everything -> wow/flutter delay -> lowpass -> compressor -> out
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    this.wow = ctx.createDelay(0.05); this.wow.delayTime.value = 0.006;
    const wowLFO = ctx.createOscillator(); wowLFO.frequency.value = 0.55;
    const wowDepth = ctx.createGain(); wowDepth.gain.value = 0.0007;
    wowLFO.connect(wowDepth).connect(this.wow.delayTime); wowLFO.start();
    const flutLFO = ctx.createOscillator(); flutLFO.frequency.value = 9.7;
    const flutDepth = ctx.createGain(); flutDepth.gain.value = 0.00012;
    flutLFO.connect(flutDepth).connect(this.wow.delayTime); flutLFO.start();
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 7200;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18; this.comp.ratio.value = 4; this.comp.knee.value = 12;
    this.master.connect(this.wow).connect(this.lp).connect(this.comp).connect(ctx.destination);

    // small dark reverb for the one-shots
    this.verb = ctx.createConvolver();
    this.verb.buffer = this._impulse(1.4, 2.8);
    this.verbGain = ctx.createGain(); this.verbGain.gain.value = 0.14;
    this.verb.connect(this.verbGain).connect(this.master);

    // tape hiss — always there, like the camcorder is trying
    const hiss = this._noiseSource();
    const hissHP = ctx.createBiquadFilter(); hissHP.type = 'highpass'; hissHP.frequency.value = 3000;
    this.hissGain = ctx.createGain(); this.hissGain.gain.value = 0.011;
    hiss.connect(hissHP).connect(this.hissGain).connect(this.master);

    // beds
    this.bedGain = ctx.createGain(); this.bedGain.gain.value = 1;
    this.bedGain.connect(this.master);
    const wind = this._noiseSource();
    this.windLP = ctx.createBiquadFilter(); this.windLP.type = 'lowpass'; this.windLP.frequency.value = 320; this.windLP.Q.value = 0.4;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0.05;
    wind.connect(this.windLP).connect(this.windGain).connect(this.bedGain);

    // deep drone — rises as the crickets give up
    this.droneOsc = ctx.createOscillator(); this.droneOsc.type = 'sawtooth'; this.droneOsc.frequency.value = 54;
    this.droneOsc2 = ctx.createOscillator(); this.droneOsc2.type = 'sine'; this.droneOsc2.frequency.value = 27.2;
    const droneLP = ctx.createBiquadFilter(); droneLP.type = 'lowpass'; droneLP.frequency.value = 160;
    this.droneGain = ctx.createGain(); this.droneGain.gain.value = 0;
    this.droneOsc.connect(droneLP); this.droneOsc2.connect(droneLP);
    droneLP.connect(this.droneGain).connect(this.bedGain);
    this.droneOsc.start(); this.droneOsc2.start();

    // sub for stings
    this.subOsc = ctx.createOscillator(); this.subOsc.type = 'sine'; this.subOsc.frequency.value = 42;
    this.subGain = ctx.createGain(); this.subGain.gain.value = 0;
    this.subOsc.connect(this.subGain).connect(this.master);
    this.subOsc.start();

    this._bakeBuffers();
  }

  // ---------------- synthesis helpers ----------------

  _impulse(dur, decay) {
    const sr = this.ctx.sampleRate, n = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return buf;
  }

  _noiseSource() {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * 2, sr);
    const d = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < d.length; i++) { // pinkish
      const w = Math.random() * 2 - 1;
      b = 0.98 * b + 0.02 * w;
      d[i] = b * 3 + w * 0.15;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true; src.start();
    return src;
  }

  _mono(dur, fill) {
    const sr = this.ctx.sampleRate, n = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, n, sr);
    fill(buf.getChannelData(0), sr, n);
    return buf;
  }

  _bakeBuffers() {
    const R = Math.random;
    // leaf crunches — noise burst + crackle transients
    this.crunch = [];
    for (let v = 0; v < 6; v++) {
      this.crunch.push(this._mono(0.19, (d, sr, n) => {
        let lpv = 0;
        const nCr = 7 + Math.floor(R() * 8);
        const crs = Array.from({ length: nCr }, () => Math.floor(R() * n * 0.7));
        for (let i = 0; i < n; i++) {
          const env = Math.pow(1 - i / n, 1.6) * (i < 200 ? i / 200 : 1);
          const w = R() * 2 - 1;
          lpv = lpv + 0.25 * (w - lpv);
          d[i] = lpv * env * 0.7;
        }
        for (const c of crs) {
          const amp = 0.35 + R() * 0.5;
          for (let k = 0; k < 90 && c + k < n; k++) d[c + k] += (R() * 2 - 1) * amp * Math.pow(1 - k / 90, 3);
        }
      }));
    }
    // cricket chirps
    this.cricket = [];
    for (let v = 0; v < 3; v++) {
      const f0 = 4100 + v * 260;
      this.cricket.push(this._mono(0.42, (d, sr, n) => {
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const pulse = Math.max(0, Math.sin(2 * Math.PI * 21 * t)) ** 2;
          const grp = t < 0.36 ? Math.sin((Math.PI * t) / 0.36) : 0;
          d[i] = Math.sin(2 * Math.PI * f0 * t) * pulse * grp * 0.25;
        }
      }));
    }
    // katydid rasp
    this.katydid = this._mono(0.5, (d, sr, n) => {
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const gate = Math.max(0, Math.sin(2 * Math.PI * 27 * t)) > 0.4 ? 1 : 0;
        const env = Math.sin((Math.PI * t) / 0.5);
        d[i] = (R() * 2 - 1) * Math.sin(2 * Math.PI * 3100 * t) * gate * env * 0.2;
      }
    });
    // owl — two soft hoots
    this.owl = this._mono(1.1, (d, sr, n) => {
      const note = (t, t0, dur2, f) => {
        if (t < t0 || t > t0 + dur2) return 0;
        const k = (t - t0) / dur2;
        const env = Math.sin(Math.PI * k) ** 1.6;
        const vib = 1 + 0.012 * Math.sin(2 * Math.PI * 5.2 * t);
        return Math.sin(2 * Math.PI * f * vib * (t - t0)) * env;
      };
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        d[i] = (note(t, 0.02, 0.32, 331) + note(t, 0.5, 0.5, 306)) * 0.3;
      }
    });
    // distant wail — never explained
    this.wail = this._mono(2.6, (d, sr, n) => {
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const f = 560 - 170 * (t / 2.6);
        const env = Math.sin((Math.PI * t) / 2.6) ** 2;
        const trem = 0.8 + 0.2 * Math.sin(2 * Math.PI * 3.1 * t);
        d[i] = (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * (f * 1.007) * t)) * env * trem * 0.16;
      }
    });
    // car honk
    this.honkBuf = this._mono(0.75, (d, sr, n) => {
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const env = t < 0.03 ? t / 0.03 : t > 0.6 ? Math.max(0, 1 - (t - 0.6) / 0.15) : 1;
        const sq = (f) => Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.5 + 0.3 * Math.sin(2 * Math.PI * f * t);
        d[i] = (sq(349) + sq(440)) * env * 0.16;
      }
    });
    // rotary ring
    this.ringBuf = this._mono(1.5, (d, sr, n) => {
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const hammer = Math.max(0, Math.sin(2 * Math.PI * 19 * t)) ** 6;
        const env = t < 1.2 ? 1 : Math.max(0, 1 - (t - 1.2) / 0.3);
        d[i] = (Math.sin(2 * Math.PI * 1130 * t) + Math.sin(2 * Math.PI * 1420 * t)) * hammer * env * 0.14;
      }
    });
    // eye chitter
    this.chitter = this._mono(0.5, (d, sr, n) => {
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const tick = fract(t * 17) < 0.12 ? 1 : 0;
        d[i] = (R() * 2 - 1) * tick * Math.sin((Math.PI * t) / 0.5) * 0.08 * Math.sin(2 * Math.PI * 2600 * t);
      }
    });
    // wooden creaks
    this.creaks = [];
    for (let v = 0; v < 3; v++) {
      this.creaks.push(this._mono(0.9, (d, sr, n) => {
        let phase = 0;
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const f = 82 - 26 * t + v * 7;
          phase += (2 * Math.PI * f) / sr;
          const stick = fract(t * (30 - 20 * t)) < 0.5 ? 1 : 0.25; // stick-slip
          const env = Math.sin(Math.PI * Math.min(1, t / 0.9)) ** 0.7;
          d[i] = (Math.sin(phase) * 0.5 + (R() * 2 - 1) * 0.22) * stick * env * 0.33;
        }
      }));
    }
    // foliage rush — the path closing all at once
    this.rushBuf = this._mono(1.7, (d, sr, n) => {
      let lpv = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const env = (t < 0.5 ? t / 0.5 : Math.max(0, 1 - (t - 0.5) / 1.2)) ** 1.2;
        const w = R() * 2 - 1;
        lpv = lpv + 0.32 * (w - lpv);
        d[i] = lpv * env * 0.8;
      }
      for (let k = 0; k < 14; k++) {
        const c = Math.floor(R() * n * 0.6) + Math.floor(n * 0.1);
        for (let j = 0; j < 60 && c + j < n; j++) d[c + j] += (R() * 2 - 1) * 0.5 * Math.pow(1 - j / 60, 2);
      }
    });
    // sun-snap clunk
    this.clunkBuf = this._mono(0.16, (d, sr, n) => {
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * (92 - 240 * t) * t) * Math.pow(1 - i / n, 2.2) * 0.8;
        if (i < 130) d[i] += (R() * 2 - 1) * 0.4 * (1 - i / 130);
      }
    });
  }

  _panner(pos) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'exponential';
    p.refDistance = 2.4; p.rolloffFactor = 1.5; p.maxDistance = 90;
    p.positionX.value = pos.x; p.positionY.value = pos.y || 1.4; p.positionZ.value = pos.z;
    return p;
  }

  _play(buf, { pos = null, gain = 1, rate = 1, when = 0, verb = 0.4, dest = null } = {}) {
    if (!this.ready) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(g);
    let tail = g;
    if (pos) { const p = this._panner(pos); g.connect(p); tail = p; }
    tail.connect(dest || this.master);
    if (verb > 0) tail.connect(this.verb);
    src.start(this.ctx.currentTime + when);
    src.onended = () => { src.disconnect(); g.disconnect(); };
    return src;
  }

  // ---------------- continuous state ----------------

  setListener(pos, camera) {
    if (!this.ready) return;
    const L = this.ctx.listener, t = this.ctx.currentTime;
    const fwd = camera.getWorldDirection(this._fv);
    if (L.positionX) {
      L.positionX.setTargetAtTime(pos.x, t, 0.05);
      L.positionY.setTargetAtTime(1.6, t, 0.05);
      L.positionZ.setTargetAtTime(pos.z, t, 0.05);
      L.forwardX.setTargetAtTime(fwd.x, t, 0.05);
      L.forwardY.setTargetAtTime(fwd.y, t, 0.05);
      L.forwardZ.setTargetAtTime(fwd.z, t, 0.05);
      L.upX.setTargetAtTime(0, t, 0.05); L.upY.setTargetAtTime(1, t, 0.05); L.upZ.setTargetAtTime(0, t, 0.05);
    } else {
      L.setPosition(pos.x, 1.6, pos.z);
      L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
  }

  biome(kind) { this.biomeKind = kind; }

  update(dt, playerPos, camera, tier) {
    if (!this.ready) return;
    this.tier = tier;
    this.setListener(playerPos, camera);
    const cave = this.biomeKind === 'cave';
    const open = this.biomeKind === 'cemetery' || this.biomeKind === 'sunclear';

    // wind wanders; the canopy breathes
    this._windT -= dt;
    if (this._windT <= 0) { this._windT = 2 + Math.random() * 5; this._windTarget = 0.02 + Math.random() * (open ? 0.1 : 0.07); }
    const wg = this.windGain.gain;
    wg.setTargetAtTime(cave ? 0.012 : this._windTarget, this.ctx.currentTime, 1.2);

    // crickets thin out the deeper you go — then the drone takes over
    const cricketDensity = cave ? 0.15 : (open ? 3.2 : 2.2) * Math.max(0.08, 1 - tier * 0.32);
    this._cricketAcc += dt * cricketDensity;
    while (this._cricketAcc > 1) {
      this._cricketAcc -= 1;
      const az = Math.random() * Math.PI * 2, dist = 8 + Math.random() * 20;
      const pos = { x: playerPos.x + Math.cos(az) * dist, y: 0.4, z: playerPos.z + Math.sin(az) * dist };
      const buf = Math.random() < 0.75 ? this.cricket[(Math.random() * 3) | 0] : this.katydid;
      this._play(buf, { pos, gain: 0.5 + Math.random() * 0.5, rate: 0.94 + Math.random() * 0.12, verb: 0.15 });
    }
    this.droneGain.gain.setTargetAtTime(tier >= 1 ? 0.015 + tier * 0.013 : 0, this.ctx.currentTime, 3);

    // owls and worse
    this._owlT -= dt;
    if (this._owlT <= 0) {
      this._owlT = 22 + Math.random() * 48;
      const az = Math.random() * Math.PI * 2, dist = 18 + Math.random() * 30;
      this._play(this.owl, {
        pos: { x: playerPos.x + Math.cos(az) * dist, y: 6, z: playerPos.z + Math.sin(az) * dist },
        gain: 0.8, rate: 0.96 + Math.random() * 0.08, verb: 0.5,
      });
    }
    this._wailT -= dt;
    if (this._wailT <= 0) {
      this._wailT = 100 + Math.random() * 160;
      if (tier >= 1) this.distantCall(playerPos);
    }
  }

  // ---------------- one-shots & sources ----------------

  step(surface, hurry, speed) {
    if (!this.ready) return;
    const buf = this.crunch[(Math.random() * this.crunch.length) | 0];
    const leaves = surface === 'leaves';
    this._play(buf, {
      gain: (leaves ? 0.5 : 0.28) * (hurry ? 1.25 : 1),
      rate: (leaves ? 1 : 0.82) * (0.92 + Math.random() * 0.16),
      verb: 0.08,
    });
  }

  addHum(id, pos, loud) {
    if (!this.ready || this.hums.has(id)) return;
    const ctx = this.ctx;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 59.5;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 119;
    const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 420;
    const am = ctx.createOscillator(); am.frequency.value = 0.31;
    const amG = ctx.createGain(); amG.gain.value = 0.25;
    const g = ctx.createGain(); g.gain.value = 0;
    am.connect(amG).connect(g.gain);
    o1.connect(lp2); o2.connect(lp2); lp2.connect(g);
    const p = this._panner(pos);
    g.connect(p).connect(this.master);
    o1.start(); o2.start(); am.start();
    g.gain.setTargetAtTime(loud ? 0.6 : 0.3, ctx.currentTime, 1.5);
    this.hums.set(id, { nodes: [o1, o2, am], g, amG, p });
  }

  removeHum(id) {
    const h = this.hums.get(id);
    if (!h) return;
    const t = this.ctx.currentTime;
    h.g.gain.setTargetAtTime(0, t, 0.6);
    h.amG.gain.setTargetAtTime(0, t, 0.4); // the AM sums into g.gain — fade it too or the hum never dies
    setTimeout(() => { h.nodes.forEach((n) => { try { n.stop(); } catch {} }); h.p.disconnect(); }, 2500);
    this.hums.delete(id);
  }

  sealCreak(pos) { this._play(this.creaks[(Math.random() * 3) | 0], { pos, gain: 0.55, rate: 0.9 + Math.random() * 0.2, verb: 0.5 }); }

  sealRush(pos) {
    this._play(this.rushBuf, { pos, gain: 0.85, verb: 0.6 });
    this._play(this.creaks[0], { pos, gain: 0.7, rate: 0.8, when: 0.15 });
    this._play(this.creaks[1], { pos, gain: 0.6, rate: 0.7, when: 0.55 });
    this._duck(0.55, 3);
  }

  sealSting() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.subGain.gain.cancelScheduledValues(t);
    this.subGain.gain.setValueAtTime(0.0001, t);
    this.subGain.gain.exponentialRampToValueAtTime(0.4, t + 0.4);
    this.subGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
  }

  sunSnap() {
    if (!this.ready) return;
    this._play(this.clunkBuf, { gain: 0.9, verb: 0.3 });
    this._duck(0.2, 7);
    const t = this.ctx.currentTime;
    this.subGain.gain.cancelScheduledValues(t);
    this.subGain.gain.setValueAtTime(0.0001, t + 0.05);
    this.subGain.gain.exponentialRampToValueAtTime(0.5, t + 1.2);
    this.subGain.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
  }

  relight(pos) { this._play(this.clunkBuf, { pos: pos || null, gain: 0.5, rate: 1.6, verb: 0.4 }); }

  _duck(level, recover) {
    const t = this.ctx.currentTime;
    this.bedGain.gain.cancelScheduledValues(t);
    this.bedGain.gain.setValueAtTime(this.bedGain.gain.value, t);
    this.bedGain.gain.linearRampToValueAtTime(level, t + 0.08);
    this.bedGain.gain.setTargetAtTime(1, t + 0.5, recover / 3);
  }

  honk(pos, loud) { this._play(this.honkBuf, { pos, gain: loud ? 1.5 : 0.9, rate: 0.96 + Math.random() * 0.08, verb: 0.5 }); }
  carSputter(pos) {
    for (let i = 0; i < 5; i++) this._play(this.clunkBuf, { pos, gain: 0.3, rate: 0.5 + Math.random() * 0.3, when: i * 0.09 + Math.random() * 0.03 });
  }
  carDie(pos) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(310, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 1.4);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    const p = this._panner(pos);
    o.connect(g).connect(p).connect(this.master);
    o.start(t); o.stop(t + 1.6);
  }

  eyeChitter(pos) { this._play(this.chitter, { pos, gain: 0.8, rate: 0.9 + Math.random() * 0.25 }); }
  distantCall(playerPos) {
    if (!this.ready) return;
    const az = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 30;
    const p = playerPos || { x: 0, z: 0 };
    this._play(this.wail, { pos: { x: p.x + Math.cos(az) * dist, y: 3, z: p.z + Math.sin(az) * dist }, gain: 0.9, rate: 0.85 + Math.random() * 0.2, verb: 0.8 });
  }

  tvStatic(pos, on, key = 'tv') {
    if (!this.ready) return;
    this._tvs = this._tvs || new Map();
    if (on) {
      if (this._tvs.has(key)) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this._tvBuf || (this._tvBuf = this._mono(1.2, (d) => { for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.24; }));
      src.loop = true;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.4;
      const g = this.ctx.createGain(); g.gain.value = 0.0001;
      g.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.1);
      const p = this._panner(pos);
      src.connect(bp).connect(g).connect(p).connect(this.master);
      src.start();
      this._tvs.set(key, { src, g, p });
    } else if (this._tvs.has(key)) {
      const a = this._tvs.get(key); this._tvs.delete(key);
      a.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
      setTimeout(() => { try { a.src.stop(); } catch {} a.p.disconnect(); }, 500);
      this._play(this.clunkBuf, { pos, gain: 0.5, rate: 1.8 });
    }
  }

  radioSong(pos, dur) {
    if (!this.ready) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const p = this._panner(pos);
    const master = ctx.createGain(); master.gain.value = 0.5;
    master.connect(p).connect(this.master); master.connect(this.verb);
    // static bed
    const st = ctx.createBufferSource();
    st.buffer = this._tvBuf || (this._tvBuf = this._mono(1.2, (d) => { for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.24; }));
    st.loop = true;
    const stG = ctx.createGain(); stG.gain.value = 0.16;
    const stBP = ctx.createBiquadFilter(); stBP.type = 'bandpass'; stBP.frequency.value = 1400;
    st.connect(stBP).connect(stG).connect(master);
    st.start(t0); st.stop(t0 + dur);
    // a thin waltz nobody is broadcasting
    const scale = [0, 3, 5, 7, 10, 12];
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 1.6;
    bp.connect(master);
    let t = t0 + 0.4, step = 0;
    while (t < t0 + dur - 0.5) {
      const len = [0.42, 0.42, 0.84][step % 3];
      const f = 392 * Math.pow(2, scale[(Math.random() * scale.length) | 0] / 12) * (Math.random() < 0.12 ? 0.5 : 1);
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 22;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len * 0.92);
      o.connect(g).connect(bp);
      o.start(t); o.stop(t + len);
      t += len; step++;
    }
    setTimeout(() => { master.gain.setTargetAtTime(0, ctx.currentTime, 0.3); }, dur * 1000 - 400);
  }

  swingCreakLoop(pos, dur) {
    if (!this.ready) return;
    const n = Math.floor(dur / 1.43);
    for (let i = 0; i < n; i++) {
      this._play(this.creaks[i % 3], { pos, gain: 0.4 * (1 - i / n) + 0.1, rate: 1.4 + Math.random() * 0.2, when: i * 1.43 });
    }
  }

  lampBuzz(pos, dur) {
    if (!this.ready) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 118;
    const g = ctx.createGain(); g.gain.value = 0.05;
    const p = this._panner(pos);
    o.connect(g).connect(p).connect(this.master);
    o.start(t0); o.stop(t0 + dur);
    for (let t = 0.2; t < dur; t += 0.3 + Math.random() * 0.7) {
      g.gain.setValueAtTime(Math.random() < 0.3 ? 0.005 : 0.05, t0 + t);
    }
  }

  washerThump(pos, dur) {
    if (!this.ready) return;
    const n = Math.floor(dur / 0.62);
    for (let i = 0; i < n; i++) this._play(this.clunkBuf, { pos, gain: 0.55, rate: 0.6, when: i * 0.62 + Math.random() * 0.05 });
  }

  phoneRing(pos, dur) {
    if (!this.ready) return;
    for (let t = 0; t < dur; t += 3) this._play(this.ringBuf, { pos, gain: 0.75, when: t, verb: 0.6 });
  }
}
