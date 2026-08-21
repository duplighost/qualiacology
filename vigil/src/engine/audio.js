// Audio: 100% synthesized at boot. The gunshot is four separately-scheduled
// layers (mechanical / body / tail / sub) with three decorrelations — 8 baked
// body variants, ±1.5% per-shot detune, 0–3 ms layer stagger, variant ring
// stepping +1..N-1 — because replaying one buffer at 725 RPM phase-locks into
// a drone. Scheduling is sample-accurate from the weapon's sub-frame clock:
// `when = now + pad − subT`, so the cadence is a rifle, not a sewing machine.
// The punch EQ (−3.5 dB at 400 Hz on everything EXCEPT the shot's own body
// bus) is the single highest-value line in the mix.

import * as THREE from 'three';
import { clamp, clamp01, lerp } from './math.js';

const SR = 44100;

export function create(ctx) {
  const A = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  const rng = ctx.rng.fork('audio');

  /* ---------------- graph ---------------- */
  const master = A.createGain(); master.gain.value = 0.85;
  const comp = A.createDynamicsCompressor();
  comp.threshold.value = -10; comp.ratio.value = 12; comp.attack.value = 0.002; comp.release.value = 0.18;
  const reflexGain = A.createGain();                    // auditory reflex dip
  const reflexLP = A.createBiquadFilter();
  reflexLP.type = 'lowpass'; reflexLP.frequency.value = 20000;
  master.connect(comp).connect(A.destination);
  reflexGain.connect(reflexLP).connect(master);

  const bodyBus = A.createGain();                       // bypasses the 400 Hz carve
  bodyBus.connect(reflexGain);
  const punchEQ = A.createBiquadFilter();
  punchEQ.type = 'peaking'; punchEQ.frequency.value = 400; punchEQ.Q.value = 1.1; punchEQ.gain.value = 0;
  const sfxBus = A.createGain();
  sfxBus.connect(punchEQ).connect(reflexGain);
  const ambBus = A.createGain();
  ambBus.gain.value = 0.5;
  ambBus.connect(punchEQ);

  /* ---------------- synth toolkit ---------------- */
  const buf = (sec) => A.createBuffer(1, Math.ceil(sec * SR), SR);
  function synth(sec, fn) {
    const b = buf(sec);
    const d = b.getChannelData(0);
    fn(d, d.length);
    return b;
  }
  const wn = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2147483648 - 1; }; };
  // RBJ bandpass with per-block coefficient sweep
  function bandpassSweep(data, f0, f1, sweepSec, Q) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
    const recalc = (f) => {
      const w = 2 * Math.PI * f / SR, alpha = Math.sin(w) / (2 * Q), cw = Math.cos(w);
      const a0 = 1 + alpha;
      b0 = alpha / a0; b1 = 0; b2 = -alpha / a0;
      a1 = -2 * cw / a0; a2 = (1 - alpha) / a0;
    };
    for (let i = 0; i < data.length; i++) {
      if (i % 32 === 0) {
        const t = i / SR;
        const f = t >= sweepSec ? f1 : f0 * Math.pow(f1 / f0, Math.pow(t / sweepSec, 1.7));
        recalc(f);
      }
      const x = data[i];
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      data[i] = y;
    }
  }
  const envExp = (data, attack, tau) => {
    for (let i = 0; i < data.length; i++) {
      const t = i / SR;
      data[i] *= (t < attack ? t / attack : Math.exp(-(t - attack) / tau));
    }
  };
  const tanhDrive = (data, k) => { for (let i = 0; i < data.length; i++) data[i] = Math.tanh(data[i] * k); };
  const norm = (data, peak = 0.98) => {
    let m = 0;
    for (let i = 0; i < data.length; i++) m = Math.max(m, Math.abs(data[i]));
    if (m > 0) for (let i = 0; i < data.length; i++) data[i] *= peak / m;
  };

  /* ---------------- bake the arsenal ---------------- */
  // BODY x8: transient + collapsing-bandpass crack + sine core + drive
  const bodyVars = [];
  for (let v = 0; v < 8; v++) {
    const cutScale = 1 + ((v / 7) * 2 - 1) * 0.06;
    const n = wn(1000 + v * 77);
    bodyVars.push(synth(0.34, (d, len) => {
      for (let i = 0; i < len; i++) d[i] = n();
      bandpassSweep(d, 2600 * cutScale, 620 * cutScale, 0.070, 0.85);
      envExp(d, 0.003, 0.030);
      // sine core 168 -> 52 Hz (the chest hit)
      let ph = 0;
      for (let i = 0; i < len; i++) {
        const t = i / SR;
        const f = lerp(168, 52, clamp01(t / 0.034));
        ph += 2 * Math.PI * f / SR;
        d[i] += Math.sin(ph) * Math.exp(-t / 0.034) * 0.9;
        // 0.7 ms full-band transient
        if (t < 0.0007) d[i] += n() * (1 - t / 0.0007) * 1.15;
      }
      tanhDrive(d, 2.4);
      norm(d);
    }));
  }
  // MECHANICAL x6: 3.2–8.6 kHz noise + sear click + bolt knock
  const mechVars = [];
  for (let v = 0; v < 6; v++) {
    const n = wn(2000 + v * 31);
    mechVars.push(synth(0.09, (d, len) => {
      for (let i = 0; i < len; i++) d[i] = n();
      bandpassSweep(d, 5600 * (1 + (v - 3) * 0.016), 3400, 0.02, 0.7);
      envExp(d, 0.004, 0.0085);
      let p1 = 0, p2 = 0;
      for (let i = 0; i < len; i++) {
        const t = i / SR;
        p1 += 2 * Math.PI * 1900 / SR; p2 += 2 * Math.PI * 620 / SR;
        d[i] += Math.sin(p1) * Math.exp(-t / 0.004) * 0.5;
        if (t > 0.012) d[i] += Math.sin(p2) * Math.exp(-(t - 0.012) / 0.006) * 0.4;
      }
      norm(d);
    }));
  }
  // TAILS: open moonfield (long, diffuse, low-mid) & under-deck (tight)
  const tailOpen = synth(1.25, (d, len) => {
    const n = wn(3001);
    for (let i = 0; i < len; i++) d[i] = n();
    bandpassSweep(d, 700, 240, 0.5, 0.5);
    envExp(d, 0.012, 0.30);
    norm(d, 0.8);
  });
  const tailClose = synth(0.55, (d, len) => {
    const n = wn(3002);
    for (let i = 0; i < len; i++) d[i] = n();
    bandpassSweep(d, 1400, 420, 0.2, 0.9);
    envExp(d, 0.006, 0.10);
    // two slapbacks
    for (let i = len - 1; i >= 0; i--) {
      const s1 = i - Math.floor(0.090 * SR), s2 = i - Math.floor(0.210 * SR);
      if (s1 > 0) d[i] += d[s1] * 0.30;
      if (s2 > 0) d[i] += d[s2] * 0.18;
    }
    norm(d, 0.8);
  });
  // SUB: 42 Hz
  const subBuf = synth(0.24, (d, len) => {
    let ph = 0;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      ph += 2 * Math.PI * 42 / SR;
      d[i] = Math.sin(ph) * (t < 0.008 ? t / 0.008 : Math.exp(-(t - 0.008) / 0.14));
    }
  });

  // generic one-shot maker: [freqs], noise band, env
  function clickBuf(seed, sec, tones, noiseBand, tau, drive = 0) {
    const n = wn(seed);
    return synth(sec, (d, len) => {
      if (noiseBand) {
        for (let i = 0; i < len; i++) d[i] = n() * 0.8;
        bandpassSweep(d, noiseBand[0], noiseBand[1], sec * 0.6, noiseBand[2] || 1);
      }
      const phases = tones.map(() => 0);
      for (let i = 0; i < len; i++) {
        const t = i / SR;
        for (let k = 0; k < tones.length; k++) {
          const [f, amp] = tones[k];
          phases[k] += 2 * Math.PI * f / SR;
          d[i] += Math.sin(phases[k]) * amp;
        }
        d[i] *= (t < 0.002 ? t / 0.002 : Math.exp(-(t - 0.002) / tau));
      }
      if (drive) tanhDrive(d, drive);
      norm(d);
    });
  }

  const B = {
    magRelease: clickBuf(41, 0.06, [[2650, 0.7]], [3000, 2000, 1.2], 0.012),
    magDrop: clickBuf(42, 0.14, [[420, 0.5], [640, 0.3]], null, 0.03, 1.5),
    magRise: clickBuf(43, 0.18, [[900, 0.2], [1800, 0.15]], [900, 2600, 0.8], 0.05),
    magContact: clickBuf(44, 0.08, [[760, 0.6]], null, 0.018, 1.4),
    magSeat: clickBuf(45, 0.16, [[1120, 0.7], [2340, 0.4], [470, 0.5], [168, 0.6]], [1800, 900, 1], 0.03, 2.2),
    boltRelease: clickBuf(46, 0.2, [[940, 0.7], [1870, 0.4], [372, 0.6], [96, 0.7]], [2600, 1200, 1], 0.035, 2.4),
    tug: clickBuf(47, 0.05, [[520, 0.4]], null, 0.012),
    dryClick: clickBuf(48, 0.055, [[1450, 0.5], [2900, 0.3]], null, 0.009),
    boltLock: clickBuf(49, 0.09, [[820, 0.6], [1640, 0.3]], null, 0.02, 1.6),
    heel: clickBuf(50, 0.09, [[92, 0.9], [140, 0.4]], null, 0.028, 1.4),
    pickup: clickBuf(60, 0.22, [[1244, 0.5], [1866, 0.35]], null, 0.07),
    podDrop: clickBuf(61, 0.6, [[120, 0.8], [80, 0.5]], [400, 150, 1], 0.2, 1.8),
    hurt: clickBuf(62, 0.25, [[180, 0.7], [90, 0.6]], [600, 250, 1], 0.07, 2.0),
    rumble: clickBuf(63, 1.2, [[46, 0.9], [62, 0.5]], null, 0.45, 1.8),
    markNormal: clickBuf(70, 0.045, [[2400, 0.8]], null, 0.008),
    markWeak: clickBuf(71, 0.09, [[3100, 0.8], [4650, 0.3]], null, 0.02),
    markDeflect: clickBuf(72, 0.07, [[900, 0.9]], null, 0.014, 1.6),
    boltFly: clickBuf(80, 0.5, [[320, 0.4], [480, 0.25]], [500, 900, 2], 0.2),
  };
  B.surf = [0, 1, 2, 3].map(i => clickBuf(90 + i, 0.13, [], [1200 + i * 180, 500, 0.7], 0.045));
  B.gear = [0, 1, 2, 3].map(i => clickBuf(96 + i, 0.11, [[4400 + i * 800, 0.3], [7600 + i * 500, 0.2]], [6000, 4200, 0.8], 0.03));
  B.tink = [0, 1, 2, 3].map(i => clickBuf(102 + i, 0.12, [[3100 + i * 700, 0.6], [5200 + i * 300, 0.3]], null, 0.03));
  B.impactRock = [0, 1, 2].map(i => clickBuf(110 + i, 0.16, [[300 + i * 60, 0.5]], [2400, 700, 0.8], 0.035, 1.6));
  B.impactMetal = [0, 1, 2].map(i => clickBuf(115 + i, 0.22, [[880, 0.7], [1505, 0.4], [2755, 0.3]], null, 0.05, 1.5));
  B.impactEnergy = [0, 1, 2].map(i => clickBuf(120 + i, 0.2, [[620 + i * 90, 0.5], [1240, 0.3]], [1600, 600, 1.4], 0.06));
  B.impactFlesh = [0, 1, 2].map(i => clickBuf(125 + i, 0.14, [[240, 0.6]], [900, 350, 0.9], 0.04, 1.9));
  // kill confirm: two-note 1.9 -> 2.6 kHz, 90 ms apart
  B.markKill = synth(0.24, (d, len) => {
    let p1 = 0, p2 = 0;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      p1 += 2 * Math.PI * 1900 / SR;
      p2 += 2 * Math.PI * 2600 / SR;
      if (t < 0.09) d[i] = Math.sin(p1) * Math.exp(-t / 0.03) * 0.8;
      else d[i] = Math.sin(p2) * Math.exp(-(t - 0.09) / 0.04) * 0.9;
    }
  });
  // species voices
  B.vocalThrall = [0, 1, 2].map(i => synth(0.4, (d, len) => {
    let ph = 0;
    const n = wn(300 + i);
    for (let k = 0; k < len; k++) {
      const t = k / SR;
      const chirp = Math.sin(t * (34 + i * 8)) > 0.2 ? 1 : 0;
      ph += 2 * Math.PI * (900 + Math.sin(t * 60) * 350 + i * 120) / SR;
      d[k] = Math.sin(ph) * chirp * Math.exp(-t / 0.22) * 0.7 + n() * 0.04 * chirp;
    }
  }));
  B.vocalWarden = [0, 1].map(i => synth(1.1, (d, len) => {
    let ph = 0;
    for (let k = 0; k < len; k++) {
      const t = k / SR;
      ph += 2 * Math.PI * (64 + i * 9 + Math.sin(t * 3.2) * 7) / SR;
      d[k] = (Math.sin(ph) + Math.sin(ph * 2.02) * 0.4 + Math.sin(ph * 2.98) * 0.2)
        * Math.min(t / 0.15, 1) * Math.exp(-t / 0.5) * 0.8;
    }
    tanhDrive(d, 1.8);
  }));
  B.vocalChorister = [0, 1].map(i => synth(1.6, (d, len) => {
    let p1 = 0, p2 = 0, p3 = 0;
    for (let k = 0; k < len; k++) {
      const t = k / SR;
      const f = 220 * (i ? 1.335 : 1);        // D-ish, then a fourth
      p1 += 2 * Math.PI * f / SR;
      p2 += 2 * Math.PI * (f * 1.007) / SR;
      p3 += 2 * Math.PI * (f * 2.01) / SR;
      d[k] = (Math.sin(p1) + Math.sin(p2) * 0.7 + Math.sin(p3) * 0.18)
        * Math.min(t / 0.4, 1) * Math.exp(-Math.max(0, t - 0.7) / 0.4) * 0.4;
    }
  }));
  B.telegraph = synth(0.36, (d, len) => {
    let ph = 0;
    for (let k = 0; k < len; k++) {
      const t = k / SR;
      ph += 2 * Math.PI * lerp(340, 980, t / 0.36) / SR;
      d[k] = (Math.sin(ph) * 0.6 + Math.sin(ph * 1.5) * 0.25) * Math.min(t / 0.03, 1) * (1 - t / 0.4);
    }
  });

  /* ---------------- playback ---------------- */
  function play(b, { gain = 1, rate = 1, when = 0, bus = sfxBus, pos = null } = {}) {
    const src = A.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = rate;
    const g = A.createGain();
    g.gain.value = gain;
    src.connect(g);
    let tail = g;
    if (pos) {
      const pan = new PannerNode(A, {
        panningModel: 'HRTF', distanceModel: 'inverse',
        refDistance: 8, rolloffFactor: 0.85, maxDistance: 110,
        positionX: pos.x, positionY: (pos.y ?? 0) + 0.8, positionZ: pos.z,
      });
      g.connect(pan);
      tail = pan;
    }
    tail.connect(bus);
    const t = when > 0 ? when : A.currentTime;
    src.start(t);
    // disconnect must outlive the buffer at any rate (never a fixed timeout)
    const life = (b.duration / rate + 0.25) * 1000 + Math.max(0, (t - A.currentTime) * 1000);
    setTimeout(() => { try { src.disconnect(); g.disconnect(); tail.disconnect(); } catch { /* closed */ } }, life);
    return src;
  }

  /* ---------------- gunshot ---------------- */
  let bodyRing = 0, mechRing = 0;
  let reflexDb = 0, sustainedShots = [];

  function gunshot(subT, lowAmmo) {
    const when = A.currentTime + Math.max(0.001, 0.026 - subT);
    bodyRing = (bodyRing + 1 + Math.floor(rng.next() * 6)) % 8;
    mechRing = (mechRing + 1 + Math.floor(rng.next() * 4)) % 6;
    const detune = 1 + (rng.next() * 2 - 1) * 0.015;
    const stag = () => rng.next() * 0.003;
    play(bodyVars[bodyRing], { gain: 0.9, rate: detune, when: when + stag(), bus: bodyBus });
    play(mechVars[mechRing], { gain: 0.9 * 0.2, rate: detune, when: when + stag() });
    // openness probe: under the deck = close tail
    const p = ctx.systems.player;
    const underDeck = p && Math.hypot(p.pos.x, p.pos.z) < 14 && p.eyeY < 8;
    play(underDeck ? tailClose : tailOpen, { gain: 0.34, rate: 1 + (detune - 1) * 0.5, when: when + stag() });
    play(subBuf, { gain: 0.5, when });
    if (lowAmmo) play(B.dryClick, { gain: 0.1, rate: 1.6, when });

    // punch EQ: duck ambience 5 dB + carve 400 Hz for 120 ms
    const t = when;
    ambBus.gain.cancelScheduledValues(t);
    ambBus.gain.setValueAtTime(ambBus.gain.value, t);
    ambBus.gain.linearRampToValueAtTime(0.28, t + 0.006);
    ambBus.gain.linearRampToValueAtTime(0.5, t + 0.196);
    punchEQ.gain.cancelScheduledValues(t);
    punchEQ.gain.setValueAtTime(-3.5, t);
    punchEQ.gain.setValueAtTime(-3.5, t + 0.12);
    punchEQ.gain.linearRampToValueAtTime(0, t + 0.18);

    // auditory reflex: -2.5 dB per shot, cap -6, LP under sustained fire
    reflexDb = Math.max(-6, reflexDb - 2.5);
    const now = ctx.time;
    sustainedShots.push(now);
    while (sustainedShots.length && now - sustainedShots[0] > 3) sustainedShots.shift();
    if (sustainedShots.length > 15) {
      reflexLP.frequency.cancelScheduledValues(A.currentTime);
      reflexLP.frequency.setValueAtTime(1600, A.currentTime);
      reflexLP.frequency.exponentialRampToValueAtTime(20000, A.currentTime + 0.9);
    }
  }

  /* ---------------- ambience ---------------- */
  const droneBuf = synth(6, (d, len) => {
    let p1 = 0, p2 = 0, p3 = 0;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      p1 += 2 * Math.PI * 51 / SR;
      p2 += 2 * Math.PI * 76.6 / SR;
      p3 += 2 * Math.PI * 102.3 / SR;
      const sw = 0.6 + 0.4 * Math.sin(2 * Math.PI * t / 6);
      d[i] = (Math.sin(p1) * 0.5 + Math.sin(p2) * 0.22 + Math.sin(p3) * 0.1) * sw * 0.35;
    }
  });
  let ambStarted = false;
  function startAmbience() {
    if (ambStarted) return;
    ambStarted = true;
    const src = A.createBufferSource();
    src.buffer = droneBuf;
    src.loop = true;
    const g = A.createGain();
    g.gain.value = 0.4;
    src.connect(g).connect(ambBus);
    src.start();
  }

  /* ---------------- event wiring ---------------- */
  const V = { thrall: B.vocalThrall, warden: B.vocalWarden, chorister: B.vocalChorister };
  function wire() {
    const bus = ctx.bus;
    bus.on('weapon:fire', ({ subT, lowAmmo }) => gunshot(subT, lowAmmo));
    bus.on('weapon:dryfire', () => play(B.dryClick, { gain: 0.5 }));
    bus.on('weapon:boltlock', () => play(B.boltLock, { gain: 0.4 }));
    bus.on('weapon:reload:beat', ({ name }) => {
      const map = {
        release: [B.magRelease, 0.45], drop: [B.magDrop, 0.5], enter: [B.magRise, 0.4],
        contact: [B.magContact, 0.5], seat: [B.magSeat, 0.65], boltrelease: [B.boltRelease, 0.7],
        tug: [B.tug, 0.3],
      };
      const m = map[name];
      if (m) play(m[0], { gain: m[1], rate: 1 + (rng.next() - 0.5) * 0.06 });
    });
    bus.on('player:step', ({ sprint, crouch }) => {
      const g = sprint ? 1.4 : crouch ? 0.5 : 1;
      play(B.heel, { gain: 0.22 * g, rate: 0.96 + rng.next() * 0.08 });
      play(B.surf[Math.floor(rng.next() * 4)], { gain: 0.16 * g, rate: 0.9 + rng.next() * 0.2 });
      play(B.gear[Math.floor(rng.next() * 4)], { gain: 0.12 * g, rate: 0.95 + rng.next() * 0.1 });
    });
    bus.on('player:land', ({ speed }) => {
      play(B.heel, { gain: clamp(speed / 14, 0.2, 0.7), rate: 0.8 });
      play(B.gear[0], { gain: 0.2, rate: 0.85 });
    });
    bus.on('player:hurt', () => play(B.hurt, { gain: 0.55 }));
    bus.on('player:slide', () => play(B.surf[2], { gain: 0.4, rate: 0.6 }));
    bus.on('brass:tink', ({ pos }) => play(B.tink[Math.floor(rng.next() * 4)], { gain: 0.12, pos }));
    bus.on('combat:marker', ({ kind, dense }) => {
      const g = dense ? 0.14 : 0.4;
      if (kind === 'kill') play(B.markKill, { gain: g });
      else if (kind === 'weak') play(B.markWeak, { gain: g });
      else if (kind === 'deflect') play(B.markDeflect, { gain: g * 0.9 });
      else play(B.markNormal, { gain: g * 0.8 });
    });
    bus.on('fx:impact', ({ kind, point, power }) => {
      const pool = kind === 'metal' ? B.impactMetal : kind === 'energy' ? B.impactEnergy
        : (kind === 'flesh' || kind === 'death') ? B.impactFlesh
        : kind === 'deflect' ? B.impactMetal : B.impactRock;
      play(pool[Math.floor(rng.next() * pool.length)], {
        gain: Math.pow(clamp01(power), 0.45) * 0.4,
        rate: 0.92 + rng.next() * 0.16,
        pos: point,
      });
    });
    bus.on('enemy:vocal', ({ species, pos }) => {
      const pool = V[species];
      play(pool[Math.floor(rng.next() * pool.length)], { gain: 0.5, rate: 0.94 + rng.next() * 0.12, pos });
    });
    bus.on('enemy:telegraph', ({ pos }) => play(B.telegraph, { gain: 0.55, pos }));
    bus.on('enemy:bolt', ({ pos }) => play(B.boltFly, { gain: 0.5, pos }));
    bus.on('enemy:rumble', () => play(B.rumble, { gain: 0.8 }));
    bus.on('enemy:die', ({ pos }) => play(B.impactFlesh[0], { gain: 0.5, rate: 0.6, pos }));
    bus.on('enemy:stagger', ({ pos }) => play(B.magSeat, { gain: 0.3, rate: 0.5, pos }));
    bus.on('combat:pickup', () => play(B.pickup, { gain: 0.35 }));
    bus.on('supply:drop', ({ pos }) => play(B.podDrop, { gain: 0.6, pos }));
    bus.on('supply:collect', () => play(B.pickup, { gain: 0.5, rate: 0.75 }));
    bus.on('wave:start', () => { startAmbience(); play(B.rumble, { gain: 0.3, rate: 1.6 }); });
    bus.on('run:won', () => play(B.vocalChorister[0], { gain: 0.7, rate: 1.5 }));
    bus.on('state', ({ next }) => {
      if (next === 'playing') { A.resume(); startAmbience(); }
    });
  }

  return {
    id: 'audio',
    wire,
    context: A,
    update(dt) {
      // reflex recovery over 200 ms
      if (reflexDb < 0) {
        reflexDb = Math.min(0, reflexDb + 30 * dt);
        reflexGain.gain.value = Math.pow(10, reflexDb / 20);
      }
      // listener follows the camera
      const cam = ctx.camera;
      const L = A.listener;
      if (L.positionX) {
        L.positionX.value = cam.position.x;
        L.positionY.value = cam.position.y;
        L.positionZ.value = cam.position.z;
        const fwd = ctx._audioFwd ??= new THREE.Vector3();
        cam.getWorldDirection(fwd);
        L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z;
        L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
      }
    },
  };
}
