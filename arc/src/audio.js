// ARC audio. RALLY's law: the music lives only while you are on a rail or in the air; on a
// roof it thins to one pad; a fall hard-cuts it and the delay tail rings out. Latch adds a
// layer, the catch is the downbeat, layers gate on chain length. Every reward has a sound
// listener here (the listener audit checks it). The swift's chirps are the only HRTF voice.
import * as THREE from 'three';
import { AudioCore, NOTE, SCALES, degreeToSemi } from './audio-core.js';
import { CFG } from './config.js';

const ROOT = 146.83; // D3
const SCALE = SCALES.dorian;
const CHORDS = [[0, 2, 4], [3, 5, 7], [5, 7, 9], [4, 6, 8]]; // degrees of D dorian: Dm, G, Bm(7)ish, Am
const LEAD = [[0, 1, 2], [2, 1, 2], [4, 1, 4], [5, 1, 2], [4, 1, 2], [2, 1, 4], [0, 1, 2], [-1, 1, 2], [0, 1, 6]];

export class GameAudio {
  constructor(events) {
    this.core = new AudioCore();
    this.events = events;
    this.ready = false;
    this.mode = 'roof';       // roof | ride | air
    this.chain = 0;
    this.speed = 0;
    this.grind = null;
    this.wind = null;
    this.leadPos = 0; this.leadHold = 0;
    this.listenerPos = new THREE.Vector3(); this.listenerFwd = new THREE.Vector3(0, 0, -1);
    this.muted = false;
    this._bind();
  }

  unlock() {
    if (this.ready) { this.core.resume(); return; }
    const ctx = this.core.init();
    this.ready = true;
    for (const L of ['pad', 'bass', 'arp', 'hats', 'lead']) this.core.layer(L, 0);
    this.core.bpm = CFG.music.bpm;
    this.core.onStep = (t, six, bar, spb) => this._step(t, six, bar, spb);
    this.core.startClock();
    // the grind: a looping noise through a bandpass whose cutoff follows speed
    const s = ctx.createBufferSource(); s.buffer = this.core.noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(this.core.fx); s.start();
    this.grind = { src: s, filter: f, gain: g };
    // the wind: a lowpassed noise whose level follows air speed
    const s2 = ctx.createBufferSource(); s2.buffer = this.core.noiseBuf; s2.loop = true; s2.playbackRate.value = 0.5;
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 400;
    const g2 = ctx.createGain(); g2.gain.value = 0.0;
    s2.connect(f2); f2.connect(g2); g2.connect(this.core.ambient); s2.start();
    this.wind = { src: s2, filter: f2, gain: g2 };
    // the water floor: a very low, very quiet rumble
    this.floor = this.core.drone({ type: 'sine', freq: 38, gain: 0.05, lp: 120 });
  }

  setMuted(m) { this.muted = m; this.core.setMuted(m); }

  // ---- the music law ------------------------------------------------------------------
  setState({ mode, chain, speed }) { this.mode = mode; this.chain = chain; this.speed = speed; }

  _levels() {
    const on = this.mode !== 'roof';
    const L = CFG.music.layersAtChain;
    return {
      pad: on ? 0.28 : 0.16,
      bass: on ? 0.34 : 0,
      hats: on && this.chain >= L[1] ? 0.22 : 0,
      arp: on && this.chain >= L[2] ? 0.2 : (on ? 0.07 : 0),
      lead: on && this.chain >= L[3] ? 0.26 : 0,
    };
  }

  _step(t, six, bar, spb) {
    const core = this.core; if (!this.ready) return;
    const lv = this._levels();
    for (const [name, level] of Object.entries(lv)) core.setLayer(name, level, six === 0 ? 0.08 : 0.25);
    const chord = CHORDS[bar % CHORDS.length];
    const freqOf = (deg, oct = 0) => NOTE(degreeToSemi(SCALE, deg, oct), ROOT);
    // pad: a chord every bar, held
    if (six === 0) for (const d of chord) { core.tone(t, freqOf(d, 0), { type: 'triangle', peak: 0.11, a: 0.25, dec: spb * 15, dest: core.layers.pad, detune: 5 }); core.tone(t, freqOf(d, 0), { type: 'sine', peak: 0.08, a: 0.35, dec: spb * 15, dest: core.layers.pad, detune: -6 }); }
    // bass: root on 1 and the and-of-2, fifth on 4
    if (six === 0 || six === 6) core.tone(t, freqOf(chord[0], -2), { type: 'triangle', peak: 0.38, dec: spb * 4, dest: core.layers.bass });
    if (six === 12) core.tone(t, freqOf(chord[0] + 4, -2), { type: 'triangle', peak: 0.26, dec: spb * 3, dest: core.layers.bass });
    // hats: off-beats, faster with speed
    if (six % 4 === 2 || (this.speed > 30 && six % 2 === 1)) core.noise(t, { peak: six % 4 === 2 ? 0.08 : 0.04, dec: 0.03, freq: 8200, q: 0.9, type: 'highpass', dest: core.layers.hats, rate: 1.7 });
    // arp: eighths through the chord, brighter with speed
    if (six % 2 === 0) { const d = chord[(six / 2) % 3] + (six >= 8 ? 7 : 0); core.tone(t, freqOf(d, 1), { type: 'square', peak: 0.05, a: 0.003, dec: spb * 1.4, dest: core.layers.arp, detune: 4 }); }
    // lead: an authored phrase, only at chain >= 6
    if (this.leadHold <= 0) {
      const [deg, oct, len] = LEAD[this.leadPos % LEAD.length]; this.leadPos++; this.leadHold = len;
      core.tone(t, freqOf(deg, oct), { type: 'sine', peak: 0.17, a: 0.012, dec: spb * len * 1.2, dest: core.layers.lead, detune: 3 });
      core.tone(t, freqOf(deg, oct), { type: 'triangle', peak: 0.05, a: 0.012, dec: spb * len, dest: core.layers.lead, detune: -6 });
    }
    this.leadHold--;
  }

  hardCut() { if (this.ready) this.core.hardCut(0.02); }

  // ---- spatial chirp ---------------------------------------------------------------------
  chirp(pos, hz, state) {
    const core = this.core; if (!this.ready) return;
    // float32 AudioParams: a finite double past 3.4e38 becomes Infinity and throws
    if (!Number.isFinite(pos.x + pos.y + pos.z) || !Number.isFinite(hz) || Math.abs(pos.x) + Math.abs(pos.y) + Math.abs(pos.z) > 1e6 || hz > 2e4) { if (!this._farSaid) { this._farSaid = true; console.error('ARC chirp out of range', JSON.stringify({ pos: [pos.x, pos.y, pos.z], hz, state })); } return; }
    const ctx = core.ctx, t = ctx.currentTime;
    const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 6; p.maxDistance = 400; p.rolloffFactor = 1.1;
    p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z;
    const g = ctx.createGain(); g.gain.value = state === 'returning' ? 0.5 : 0.36;
    p.connect(g); g.connect(core.fx);
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(hz, t); o.frequency.exponentialRampToValueAtTime(hz * (state === 'returning' ? 1.35 : 1.18), t + 0.06); o.frequency.exponentialRampToValueAtTime(hz * 0.9, t + 0.12);
    const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(1, t + 0.008); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(e); e.connect(p); o.start(t); o.stop(t + 0.16);
    setTimeout(() => { try { p.disconnect(); g.disconnect(); } catch { /* */ } }, 400);
  }

  updateListener(camPos, camFwd, camUp) {
    if (!this.ready) return;
    const L = this.core.ctx.listener;
    if (Math.abs(camPos.x) + Math.abs(camPos.y) + Math.abs(camPos.z) > 1e6 || !Number.isFinite(camPos.x + camPos.y + camPos.z + camFwd.x + camFwd.y + camFwd.z)) { if (!this._farCam) { this._farCam = true; console.error('ARC listener out of range', JSON.stringify({ cam: camPos.toArray(), fwd: camFwd.toArray() })); } return; }
    if (L.positionX) { L.positionX.value = camPos.x; L.positionY.value = camPos.y; L.positionZ.value = camPos.z; L.forwardX.value = camFwd.x; L.forwardY.value = camFwd.y; L.forwardZ.value = camFwd.z; L.upX.value = camUp.x; L.upY.value = camUp.y; L.upZ.value = camUp.z; }
    else { L.setPosition(camPos.x, camPos.y, camPos.z); L.setOrientation(camFwd.x, camFwd.y, camFwd.z, camUp.x, camUp.y, camUp.z); }
  }

  update(dt, { mode, chain, speed, grinding, airSpeed, drag }) {
    this.setState({ mode, chain, speed });
    if (!this.ready) return;
    const t = this.core.now;
    if (this.grind) {
      const want = grinding ? 0.05 + Math.min(0.2, speed * 0.004) + drag * 0.12 : 0;
      this.grind.gain.gain.setTargetAtTime(want, t, 0.05);
      this.grind.filter.frequency.setTargetAtTime(500 + speed * 28 + drag * 900, t, 0.05);
    }
    if (this.wind) {
      const want = Math.min(0.24, Math.max(0, airSpeed - 10) * 0.007);
      this.wind.gain.gain.setTargetAtTime(want, t, 0.12);
      this.wind.filter.frequency.setTargetAtTime(300 + airSpeed * 22, t, 0.12);
    }
  }

  // ---- event listeners (tag: 'audio') -----------------------------------------------------
  _bind() {
    const E = this.events, c = this.core;
    const on = (name, fn) => E.on(name, (d) => { if (this.ready) fn(d, c.now, c); }, 'audio');
    on('charge', (d, t) => { c.tone(t, 220, { type: 'sine', peak: 0.05, a: 0.05, dec: 0.5, freqEnd: 440 }); });
    on('gather', (d, t) => { c.noise(t, { peak: 0.08, dec: 0.18, freq: 600, q: 1.2, freqEnd: 2400 }); });
    on('throw', (d, t) => { c.noise(t, { peak: 0.22, a: 0.01, dec: 0.45, freq: 900, q: 0.8, freqEnd: 3200, rate: 1.4 }); c.tone(t, 520 + d.speed * 4, { type: 'sine', peak: 0.09, a: 0.01, dec: 0.3, freqEnd: 900 }); });
    on('throwRefused', (d, t) => { c.tone(t, 110, { type: 'square', peak: 0.12, a: 0.004, dec: 0.09 }); c.noise(t, { peak: 0.08, dec: 0.06, freq: 300, q: 2 }); });
    on('callRefused', (d, t) => { c.tone(t, 150, { type: 'triangle', peak: 0.1, a: 0.004, dec: 0.1, freqEnd: 120 }); });
    on('stick', (d, t) => { c.noise(t, { peak: 0.18, dec: 0.12, freq: 700, q: 1.5 }); c.tone(t + 0.02, 880, { type: 'sine', peak: 0.13, a: 0.005, dec: 0.5 }); c.tone(t + 0.02, 1320, { type: 'sine', peak: 0.06, a: 0.005, dec: 0.7 }); });
    on('hang', (d, t) => { c.tone(t, 660, { type: 'sine', peak: 0.1, a: 0.02, dec: 0.6 }); c.tone(t + 0.08, 990, { type: 'sine', peak: 0.06, a: 0.02, dec: 0.7 }); });
    on('latch', (d, t) => { c.noise(t, { peak: 0.22, dec: 0.16, freq: 2600, q: 1.1, freqEnd: 900 }); c.tone(t, 330, { type: 'triangle', peak: 0.11, a: 0.005, dec: 0.25, freqEnd: 500 }); });
    on('unlatch', (d, t) => { c.noise(t, { peak: 0.1, dec: 0.2, freq: 1400, q: 0.9, freqEnd: 400 }); });
    on('pop', (d, t) => { c.noise(t, { peak: 0.16, dec: 0.12, freq: 1800, q: 1.3 }); c.tone(t, 260, { type: 'triangle', peak: 0.1, a: 0.004, dec: 0.18, freqEnd: 520 }); });
    on('grindStop', (d, t) => { if (d.landing) c.noise(t, { peak: 0.14, dec: 0.1, freq: 500, q: 1.0 }); });
    on('call', (d, t) => { c.tone(t, 640, { type: 'sine', peak: 0.12, a: 0.006, dec: 0.25, freqEnd: 1100 }); c.noise(t, { peak: 0.08, dec: 0.3, freq: 1200, q: 0.7, freqEnd: 3000 }); });
    on('earlyCall', (d, t) => { c.tone(t, 740, { type: 'sine', peak: 0.12, a: 0.005, dec: 0.2, freqEnd: 1300 }); });
    on('giveUp', (d, t) => { c.tone(t, 420, { type: 'sine', peak: 0.08, a: 0.05, dec: 0.5, freqEnd: 330 }); });
    on('catchSoft', (d, t) => { c.tone(t, 523, { type: 'sine', peak: 0.12, a: 0.005, dec: 0.4 }); c.tone(t, 659, { type: 'sine', peak: 0.08, a: 0.005, dec: 0.5 }); });
    on('catchDash', (d, t) => {
      // the downbeat: a rising chord pitched with speed, and a whoosh with a rise
      const k = THREE.MathUtils.clamp((d.speed - 30) / 22, 0, 1);
      const base = 392 * (1 + k * 0.5);
      for (const [i, r] of [1, 1.25, 1.5, 2].entries()) c.tone(t + i * 0.02, base * r, { type: i === 3 ? 'sine' : 'triangle', peak: 0.16 - i * 0.02, a: 0.02 + i * 0.03, dec: 0.9 });
      c.noise(t, { peak: 0.26, a: 0.12, dec: 0.5, freq: 600, q: 0.6, freqEnd: 4500, rate: 1.2 });
      c.tone(t, 90, { type: 'sine', peak: 0.3, a: 0.01, dec: 0.25, freqEnd: 40 });
    });
    on('fall', (d, t) => { this.hardCut(); c.noise(t, { peak: 0.3, a: 0.005, dec: 0.5, freq: 400, q: 0.7, freqEnd: 120, rate: 0.7 }); c.tone(t, 160, { type: 'sine', peak: 0.2, a: 0.01, dec: 0.6, freqEnd: 50 }); });
    on('respawn', (d, t) => { c.tone(t, 330, { type: 'sine', peak: 0.07, a: 0.05, dec: 0.4, freqEnd: 440 }); });
    on('lantern', (d, t) => { c.tone(t, 1760, { type: 'sine', peak: 0.16, a: 0.004, dec: 0.9, freqEnd: 880 }); c.noise(t, { peak: 0.2, a: 0.02, dec: 0.7, freq: 3000, q: 0.5, freqEnd: 200 }); c.tone(t + 0.05, 220, { type: 'triangle', peak: 0.14, a: 0.01, dec: 0.5, freqEnd: 110 }); });
    on('bossDown', (d, t) => { for (let i = 0; i < 5; i++) c.tone(t + i * 0.12, 220 * Math.pow(2, [0, 3, 7, 10, 12][i] / 12), { type: 'triangle', peak: 0.18, a: 0.02, dec: 1.6 }); c.tone(t, 55, { type: 'sine', peak: 0.35, a: 0.05, dec: 2.5, freqEnd: 30 }); });
    on('chapterWake', (d, t) => { for (let i = 0; i < 6; i++) c.tone(t + i * 0.18, 440 * Math.pow(2, [0, 2, 4, 7, 9, 12][i] / 12), { type: 'sine', peak: 0.12, a: 0.03, dec: 1.4 }); });
    on('wave', (d, t) => { c.tone(t, 48, { type: 'sine', peak: 0.4, a: 0.02, dec: 1.4, freqEnd: 28 }); c.noise(t, { peak: 0.12, a: 0.1, dec: 1.2, freq: 200, q: 0.5 }); });
    on('stabWarn', (d, t) => { c.tone(t, 180, { type: 'sawtooth', peak: 0.06, a: 0.2, dec: 1.0, freqEnd: 260 }); });
    on('stab', (d, t) => { c.noise(t, { peak: 0.3, a: 0.005, dec: 0.4, freq: 800, q: 0.6, freqEnd: 150 }); c.tone(t, 70, { type: 'sine', peak: 0.35, a: 0.005, dec: 0.5, freqEnd: 35 }); });
    on('surface', (d, t) => { c.noise(t, { peak: 0.2, a: 0.2, dec: 1.6, freq: 300, q: 0.4, freqEnd: 900, rate: 0.6 }); });
    on('dive', (d, t) => { c.noise(t, { peak: 0.2, a: 0.1, dec: 1.4, freq: 900, q: 0.4, freqEnd: 200, rate: 0.6 }); });
    on('ending', (d, t) => { for (let i = 0; i < 8; i++) c.tone(t + i * 0.5, 220 * Math.pow(2, [0, 4, 7, 11, 12, 14, 16, 19][i] / 12), { type: 'sine', peak: 0.14, a: 0.3, dec: 4 }); });
    on('endingStand', (d, t) => { c.tone(t, 40, { type: 'sine', peak: 0.4, a: 0.5, dec: 6, freqEnd: 24 }); c.noise(t, { peak: 0.2, a: 1.0, dec: 5, freq: 200, q: 0.3 }); });
    on('grindStart', (d, t) => { /* the grind loop carries this */ });
  }
}
