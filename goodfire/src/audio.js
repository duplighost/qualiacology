// GOODFIRE audio.js — Module C (the ear IS the HUD). Everything synthesized: Web Audio
// native nodes only, zero samples, zero libraries. Conforms to docs/spec-audio.md with
// canon-final §6/§9 overrides (GRANDMOTHER 20 s inbound; sacrifice = squelch + signature
// phrase + 300 ms gate-out, NO minor chord, NO woodblock; plant = trowel chuk, no tail;
// no continuous music during fires) and spec-verbs verb-sound overrides (D-triad tie-in,
// F-add9 starve, +7 st escape glide, 90 Hz stomp) — the task's binding enumeration.
//
// Determinism rails: ALL jitter from a local mulberry32(0xFEE1) — never the sim streams,
// never Math.random, never Date.now. The sim is read-only here. Everything is lazily
// constructed after unlock() (autoplay policy); before unlock every method is a safe no-op.
//
// Node budget: grains <= 24 concurrent (18 crackle + 6 soil lanes, skip-not-steal),
// chimes <= 6, bird phrases <= 3. One 25 ms lookahead pump drives all granular systems.

import { GRID, CELLS, TICK_HZ, FUEL, S, FLAG, F_BURNABLE, F_LOADMAX } from './canon.js';
import { mulberry32 } from './rng.js';
import { ZONE, ZONE_NAMES } from './map.js';

// ---- tiny math ----
const dB = (v) => Math.pow(10, v / 20);
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const st = (n) => Math.pow(2, n / 12);       // semitones -> ratio

// ---- audio-owned tuning (spec-audio Appendix A, with the binding overrides) ----
const AUD = Object.freeze({
  BUS: { wind: 0.90, fire: 1.00, birds: 0.80, bugs: 0.55, verbs: 0.90,
         embers: 1.00, ui: 0.85, gma: 1.60, music: 0.60 },
         // gma 1.60: the ONLY >1 bus — "loudest thing in the game" is structural
  GLUE:  { thresh: -18, knee: 12, ratio: 3,  atk: 0.020, rel: 0.25 }, // pumps at Crown on purpose
  LIMIT: { thresh: -6,  knee: 0,  ratio: 20, atk: 0.002, rel: 0.08 }, // brick wall so gma can't clip
  HP_HZ: 26,                       // rumble guard; the 36 Hz Crown sub must pass
  WIND: { base: 250, k: 22, exp: 1.55, max: 6500, // power curve: every 4 mph step stays audible
          gBase: 0.10, gK: 0.018, gMax: 0.60, tau: 0.35,
          panDownwind: 0.35, nsBright: 0.15,       // brightness = the only honest N/S cue in stereo
          gustAtk: 0.4, gustRel: 1.2, gustPan: 0.8, gustSec: 3.0, // PROVISIONAL: kernel gust events carry no duration
          grassBase: 0.05, grassK: 0.006 },
  FIRE: { radius: 96, attenD: 24, sectors: 12, fieldMs: 100,
          grainK: 6, grainMax: 160,                // g/s = k*sqrt(I): spot fires audible, Crown capped
          bbGrainK: 3, bbGrainMax: 40,             // the cooler band: you HEAR your own fire, lower + darker
          crownOn: 12, crownOff: 8, roarMax: 0.55, roarNorm: 80,
          subF1: 36, subF2: 39.5, subMax: 0.4,     // 3.5 Hz beat = the dread throb
          shelterLP: 800, shelterMul: 0.6, shelterTau: 0.6 }, // scars can't burn: safety is audible
  BUG:  { carBase: 3900, carK: 1600, grpBase: 1.2, grpK: 3.8, intraS: 0.055,
          lvlBase: 0.05, lvlK: 0.10, detune: 7, unease: 30, uneaseAt: 0.75,
          localK: 0.25,                            // walk into an unburned basin: pitch climbs — spatial foreshadow
          tickAt: 0.85, tickLambda: 0.8 },
  BIRD: { cpmK: 24, cpmExp: 1.15, cpmCap: 26, radius: 140, distD: 70,
          maxPhrases: 3, gateMs: 0.30,             // 300 ms gate-out on ceded/burning (task-binding)
          rollStep: 0.55, rollGain: 0.35, tickHz: 200, tickGain: 0.11,
          owlF: 340, owlDiv: 6, owlGain: 0.18 },   // owls PROVISIONAL-optional per task: implemented
  CHIME: { base: 1400, perTile: 40, crownSt: 5,    // pitch rises with flight distance; +5 st crown casts
           max: 6, showerMs: 0.25, showerN: 4 },
  GMA:  { fA: 84.0, fB: 84.0 * st(0.09 / 1),       // saws detuned ~9 cents (spec-verbs 8.2)
          formants: [90, 270, 540], lpFar: 400, lpNear: 2800,
          upSt: 4, downSt: 7, downSec: 4,          // +4 st build, snap-through, -7 st over 4 s
          duckDb: -8, duckAtk: 0.2, duckRel: 1.2,  // the sidechain hook: ALL others -8 dB (task-binding)
          rattleSec: 3, curtain: { lpFrom: 6000, lpTo: 900, sec: 2.0, gain: 0.7 },
          rumbleHz: 45, rumbleSec: 1.8 },
  POOL: { crackle: 18, soil: 6 },                  // 18+6 = the 24-grain hard cap
  SCHED: { intervalMs: 25, horizon: 0.12 },
  VIEW_W: 1280,                                    // PROVISIONAL: canon §8 logical stage width for pan mapping
});

// ---- D-mixolydian vocabulary (Hz) ----
const NOTE = { C2: 65.41, F2: 87.31, G2: 98.00, A2: 110.00, C3: 130.81, D3: 146.83,
  E3: 164.81, F3: 174.61, Fs3: 185.00, G3: 196.00, A3: 220.00, B3: 246.94, C4: 261.63,
  D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392.00, A4: 440.00, B4: 493.88, D5: 587.33,
  E5: 659.26, F5: 698.46, Fs5: 739.99, A5: 880.00, B5: 987.77, Fs6: 1479.98, B6: 1975.53,
  E7: 2637.02 };
const PENT = [NOTE.D5, NOTE.E5, NOTE.Fs5, NOTE.A5, NOTE.B5]; // trowel chuk pitch cycle

export function createAudio() {
  const rng = mulberry32(0xFEE1);   // ALL cosmetic jitter; sim streams are untouchable
  const log = [];                    // eventLog ring: {t, name}
  const rec = (name, t) => { log.push({ t, name }); if (log.length > 1024) log.splice(0, 512); };

  let ctx = null, unlocked = false, buffers = null;
  const bus = {};                    // name -> GainNode (post-user-gain node)
  const userGain = {};               // settings sliders, 0..1 multiplier on nominal
  let mixBus, sceneLP, shelterLP, convolver, verbReturn, masterGain;
  let simRef = null, lastView = null, scene = 'title';
  let cededSet = new Set();
  let anchor = null;                 // {ctxT, tick} — sim tick -> ctx time linear map
  const now = () => ctx ? ctx.currentTime : 0;
  const ctxTimeOf = (tick) => anchor ? anchor.ctxT + (tick - anchor.tick) / TICK_HZ : now() + 0.03;

  // ---------------------------------------------------------------- unlock + baking
  function unlock() {
    if (unlocked) { if (ctx && ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = (typeof AudioContext !== 'undefined') ? AudioContext
             : (typeof webkitAudioContext !== 'undefined') ? webkitAudioContext : null;
    if (!AC) return false; // headless Node: stay disabled, every method no-ops
    ctx = new AC({ latencyHint: 'interactive' }); // verb feedback must feel instant
    bake(); buildGraph(); buildLanes();
    unlocked = true;
    pumpTimer = setInterval(pump, AUD.SCHED.intervalMs); // Chris-Wilson lookahead
    if (ctx.state === 'suspended') ctx.resume();
    rec('unlock', now());
    applyScene(scene);
    return true;
  }

  function bake() { // once, seeded, reused forever. 4 s stereo loops + valley IR.
    const sr = ctx.sampleRate, len = (sr * 4) | 0;
    const WHITE = ctx.createBuffer(2, len, sr), PINK = ctx.createBuffer(2, len, sr),
          BROWN = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const w = WHITE.getChannelData(ch), p = PINK.getChannelData(ch), b = BROWN.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, acc = 0;
      for (let i = 0; i < len; i++) {
        const x = rng() * 2 - 1; w[i] = x;
        b0 = 0.997 * b0 + x * 0.029; b1 = 0.985 * b1 + x * 0.032; b2 = 0.95 * b2 + x * 0.048;
        p[i] = (b0 + b1 + b2 + x * 0.05) * 3.0;
        acc = (acc + 0.02 * x) * 0.998; b[i] = clamp(acc * 3.5, -1, 1);
      }
      for (const d of [w, p, b]) // equal-power crossfade: last 2048 into first (click-free loop)
        for (let i = 0; i < 2048; i++) {
          const f = i / 2048;
          d[i] = d[i] * Math.sin(f * Math.PI / 2) + d[len - 2048 + i] * Math.cos(f * Math.PI / 2);
        }
    }
    const irLen = (sr * 1.4) | 0, IR = ctx.createBuffer(2, irLen, sr);
    const k = 1 - Math.exp(-2 * Math.PI * 2500 / sr); // exact one-pole coefficient (spec §3.3)
    for (let ch = 0; ch < 2; ch++) {
      const d = IR.getChannelData(ch); let y = 0;
      for (let i = 0; i < irLen; i++) { const x = (rng() * 2 - 1) * Math.exp(-(i / sr) / 0.35); y += k * (x - y); d[i] = y; }
    }
    buffers = { WHITE, PINK, BROWN, IR };
  }

  function buildGraph() {
    masterGain = ctx.createGain(); masterGain.gain.value = 0.8; masterGain.connect(ctx.destination);
    const lim = ctx.createDynamicsCompressor(), gl = ctx.createDynamicsCompressor();
    lim.threshold.value = AUD.LIMIT.thresh; lim.knee.value = AUD.LIMIT.knee; lim.ratio.value = AUD.LIMIT.ratio;
    lim.attack.value = AUD.LIMIT.atk; lim.release.value = AUD.LIMIT.rel; lim.connect(masterGain);
    gl.threshold.value = AUD.GLUE.thresh; gl.knee.value = AUD.GLUE.knee; gl.ratio.value = AUD.GLUE.ratio;
    gl.attack.value = AUD.GLUE.atk; gl.release.value = AUD.GLUE.rel; gl.connect(lim);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = AUD.HP_HZ; hp.Q.value = 0.7; hp.connect(gl);
    sceneLP = ctx.createBiquadFilter(); sceneLP.type = 'lowpass'; sceneLP.frequency.value = 18000; sceneLP.connect(hp);
    mixBus = ctx.createGain(); mixBus.connect(sceneLP);
    for (const [n, g] of Object.entries(AUD.BUS)) {
      const b = ctx.createGain(); b.gain.value = g; userGain[n] = 1;
      bus[n] = b;
      if (n === 'fire') { // scar shelter (spec §7.5): step onto old black and the roar goes distant
        shelterLP = ctx.createBiquadFilter(); shelterLP.type = 'lowpass'; shelterLP.frequency.value = 20000;
        b.connect(shelterLP); shelterLP.connect(mixBus);
      } else b.connect(mixBus);
    }
    convolver = ctx.createConvolver(); convolver.buffer = buffers.IR;
    verbReturn = ctx.createGain(); verbReturn.gain.value = 0.5;
    convolver.connect(verbReturn); verbReturn.connect(mixBus);
  }
  const send = (node, amt) => { const g = ctx.createGain(); g.gain.value = amt; node.connect(g); g.connect(convolver); return g; };

  // ---------------------------------------------------------------- ducking (min wins, never multiply)
  const ducks = []; // {names:[bus], mul, until, atk, rel}
  const busTarget = {};
  function duck(names, ddb, atk, rel, hold) {
    if (!unlocked) return;
    ducks.push({ names, mul: dB(ddb), until: now() + hold, atk, rel });
    applyDucks();
  }
  function applyDucks() {
    const t = now();
    for (let k = ducks.length - 1; k >= 0; k--) if (ducks[k].until < t - 4) ducks.splice(k, 1);
    for (const n of Object.keys(bus)) {
      let m = 1, atk = 0.2, rel = 0.6;
      for (const d of ducks) if (d.names.includes(n)) {
        if (d.until > t) { if (d.mul < m) { m = d.mul; atk = d.atk; } rel = Math.max(rel, d.rel); }
        else if (d.until > t - 3) rel = Math.max(rel, d.rel); // a just-expired duck owns its release τ
      }
      if (scene === 'ledger' && (n === 'wind' || n === 'fire' || n === 'bugs' || n === 'verbs'))
        m = Math.min(m, dB(-18)); // ledger ceremony row (spec §4.2): the world steps back
      const target = AUD.BUS[n] * userGain[n] * m * sceneTrim(n);
      if (Math.abs((busTarget[n] ?? -1) - target) > 1e-4) {
        bus[n].gain.setTargetAtTime(target, t, target < (busTarget[n] ?? 1) ? atk : rel);
        busTarget[n] = target;
      }
    }
  }
  function sceneTrim(n) { // scene mix deltas (spec §17), applied structurally not by vibes
    let m = 1;
    const night = lastView && lastView.phase === 'NIGHT';
    if (night) { if (n === 'fire') m *= dB(2); if (n === 'bugs') m *= dB(3.5); if (n === 'wind') m *= 0.7; }
    if (scene === 'snow' && n === 'bugs') m = 0;
    if (scene === 'title' && (n === 'fire' || n === 'bugs' || n === 'birds' || n === 'verbs')) m = 0;
    return m;
  }

  // ---------------------------------------------------------------- grain lanes (skip, never steal)
  const lanes = { crackle: [], soil: [] };
  function buildLanes() {
    const mk = (dest) => {
      const inG = ctx.createGain(); inG.gain.value = 0;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
      const pan = ctx.createStereoPanner();
      inG.connect(bp); bp.connect(pan); pan.connect(dest);
      return { inG, bp, pan, freeAt: 0 };
    };
    for (let i = 0; i < AUD.POOL.crackle; i++) lanes.crackle.push(mk(bus.fire));
    for (let i = 0; i < AUD.POOL.soil; i++) lanes.soil.push(mk(bus.verbs));
  }
  function grain(set, t, o) { // o: {buf,dur,rate,bp,q,pan,gain,name}
    let L = null;
    for (const l of set) if (l.freeAt <= t) { L = l; break; }
    if (!L) return; // cap reached: SKIP (<=60 ms grains — skipping is inaudible, stealing clicks)
    L.freeAt = t + o.dur + 0.05;
    const src = ctx.createBufferSource(); src.buffer = buffers[o.buf];
    src.playbackRate.value = o.rate || 1;
    L.bp.frequency.setValueAtTime(o.bp, t); L.bp.Q.value = o.q ?? 1.2;
    L.pan.pan.setValueAtTime(clamp(o.pan || 0, -1, 1), t);
    const g = L.inG.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(o.gain, t + 0.001);
    g.setTargetAtTime(0, t + 0.001, o.dur / 3);
    const off = rng() * 3.5; // random read offset into the 4 s loop
    src.connect(L.inG); src.start(t, off, o.dur + 0.02); src.stop(t + o.dur + 0.03);
    rec(o.name || 'grain', t);
  }

  // ---------------------------------------------------------------- one-shot primitives
  // tone: one oscillator voice with envelope; opts: {type,f0,f1,curve,dur,atk,gain,tau,pan,
  //   dest,sendAmt,vib:{rate,depth},am:{rate,depth},lp,hp,name,exp}
  function tone(t, o) {
    if (!unlocked) return;
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine';
    if (o.curve) osc.frequency.setValueCurveAtTime(o.curve, t, o.dur); // curve owns the interval alone
    else {
      osc.frequency.setValueAtTime(o.f0, t);
      if (o.f1 && o.f1 !== o.f0) {
        if (o.exp) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
        else osc.frequency.linearRampToValueAtTime(o.f1, t + o.dur);
      }
    }
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.gain, t + (o.atk ?? 0.002));
    g.gain.setTargetAtTime(0, t + (o.atk ?? 0.002) + (o.hold || 0), o.tau ?? o.dur / 3);
    let tail = g;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); f.connect(g); }
    else osc.connect(g);
    if (o.hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; tail = ctx.createGain(); tail.gain.value = 1; g.connect(f); f.connect(tail); }
    const pan = ctx.createStereoPanner(); pan.pan.value = clamp(o.pan || 0, -1, 1);
    tail.connect(pan); pan.connect(o.dest || bus.ui);
    if (o.sendAmt) send(pan, o.sendAmt);
    if (o.vib) { const lfo = ctx.createOscillator(); lfo.frequency.value = o.vib.rate;
      const lg = ctx.createGain(); lg.gain.value = o.vib.depth; lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(t); lfo.stop(t + o.dur + 0.1); }
    if (o.am) { const lfo = ctx.createOscillator(); lfo.frequency.value = o.am.rate;
      const lg = ctx.createGain(); lg.gain.value = o.gain * o.am.depth; lfo.connect(lg); lg.connect(g.gain);
      lfo.start(t); lfo.stop(t + o.dur + 0.1); }
    osc.start(t); osc.stop(t + o.dur + (o.tailSec ?? 0.4));
    if (o.name) rec(o.name, t);
    return osc;
  }
  // burst: filtered noise one-shot; opts: {buf,dur,bp,q,lp,lpTo,hp,gain,atk,tau,pan,dest,sendAmt,name}
  function burst(t, o) {
    if (!unlocked) return;
    const src = ctx.createBufferSource(); src.buffer = buffers[o.buf || 'WHITE'];
    let node = src;
    if (o.bp) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = o.bp; f.Q.value = o.q ?? 1; node.connect(f); node = f; }
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t);
      if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, t + o.dur); node.connect(f); node = f; }
    if (o.hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; node.connect(f); node = f; }
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.gain, t + (o.atk ?? 0.002));
    g.gain.setTargetAtTime(0, t + (o.atk ?? 0.002) + (o.hold || 0), o.tau ?? o.dur / 3);
    const pan = ctx.createStereoPanner(); pan.pan.value = clamp(o.pan || 0, -1, 1);
    node.connect(g); g.connect(pan); pan.connect(o.dest || bus.ui);
    if (o.sendAmt) send(pan, o.sendAmt);
    // read offset leaves room for the whole burst inside the 4 s loop buffer
    src.start(t, rng() * Math.max(0.1, 3.9 - o.dur), o.dur + 0.05); src.stop(t + o.dur + 0.1);
    if (o.name) rec(o.name, t);
  }
  // chord player: shared by verbs/liturgy/ledger (spec §14 — one harmonic family)
  function playNotes(t, notes, o) {
    notes.forEach((f, i) => tone(t + i * (o.strum || 0), {
      type: o.wave || 'triangle', f0: f, dur: o.dur || 1.3, atk: o.atk ?? 0.003,
      gain: o.gain ?? 0.22, tau: o.tau ?? 0.45, pan: o.pan || 0, lp: o.lp,
      dest: o.dest || bus.ui, sendAmt: o.sendAmt ?? 0.22, name: o.name,
    }));
  }

  // pan from world position via camera at frame time (canon-final: events carry world
  // coords only; camera-space conversion at consumers)
  function panWorld(x, y) {
    const v = lastView;
    if (!v) return 0;
    if (v.camera && v.camera.worldToScreen) {
      const s = v.camera.worldToScreen({ x, y });
      return clamp((s.x / AUD.VIEW_W) * 2 - 1, -0.92, 0.92);
    }
    const cx = v.wardenPos ? v.wardenPos.x : GRID / 2;
    return clamp((x - cx) / 40, -0.92, 0.92); // fallback: 80-tile GROUND view, half-width 40
  }
  const cellPan = (cell) => panWorld((cell % GRID) + 0.5, ((cell / GRID) | 0) + 0.5);

  // ---------------------------------------------------------------- WIND BED (spec §6)
  // The single most load-bearing sound: you aim backburns by this.
  let windN = null; // {bedSrc,bedLP,bedG,bedPan,grassSrc,grassBP,grassG,grassPan,gustUntil}
  function buildWind() {
    const bedSrc = ctx.createBufferSource(); bedSrc.buffer = buffers.BROWN; bedSrc.loop = true;
    const bedLP = ctx.createBiquadFilter(); bedLP.type = 'lowpass'; bedLP.frequency.value = 400; bedLP.Q.value = 0.5;
    const bedHP = ctx.createBiquadFilter(); bedHP.type = 'highpass'; bedHP.frequency.value = 60; bedHP.Q.value = 0.7;
    const bedG = ctx.createGain(); bedG.gain.value = 0;
    const bedPan = ctx.createStereoPanner();
    bedSrc.connect(bedLP); bedLP.connect(bedHP); bedHP.connect(bedG); bedG.connect(bedPan); bedPan.connect(bus.wind);
    const grassSrc = ctx.createBufferSource(); grassSrc.buffer = buffers.WHITE; grassSrc.loop = true;
    const grassBP = ctx.createBiquadFilter(); grassBP.type = 'bandpass'; grassBP.frequency.value = 1200; grassBP.Q.value = 0.9;
    const grassG = ctx.createGain(); grassG.gain.value = 0;
    const grassPan = ctx.createStereoPanner();
    grassSrc.connect(grassBP); grassBP.connect(grassG); grassG.connect(grassPan); grassPan.connect(bus.wind);
    bedSrc.start(); grassSrc.start(); // run forever; silence = gain 0 (cheaper than start/stop, no clicks)
    windN = { bedLP, bedG, bedPan, grassBP, grassG, grassPan, gustUntil: 0 };
  }
  function windParams(mph, ty) {
    let cut = clamp(AUD.WIND.base + AUD.WIND.k * Math.pow(Math.max(0, mph), AUD.WIND.exp), AUD.WIND.base, AUD.WIND.max);
    cut *= (1 + AUD.WIND.nsBright * ty); // wind from screen-top is brighter (u.y = -ty; 1-0.15*u.y)
    if (scene === 'snow') cut = Math.min(cut, 900);
    const night = lastView && lastView.phase === 'NIGHT';
    if (night) cut *= 0.8;
    let g = clamp(AUD.WIND.gBase + AUD.WIND.gK * mph, AUD.WIND.gBase, AUD.WIND.gMax);
    if (night) g *= 0.7; if (scene === 'snow') g *= 0.8;
    return { cut, g };
  }
  function updateWind() {
    if (!windN || !lastView) return;
    const w = (lastView.sim && lastView.sim.wind) || { mphEffective: 6, tx: 0.5, ty: 0.5 };
    const t = now();
    if (t < windN.gustUntil) return; // gust envelope owns the params until it releases
    const p = windParams(w.mphEffective, w.ty);
    windN.bedLP.frequency.setTargetAtTime(p.cut, t, AUD.WIND.tau); // wind leans, never snaps
    windN.bedG.gain.setTargetAtTime(p.g, t, AUD.WIND.tau);
    // bed sits gently downwind: pan = toward.x * 0.35 (interfaces: N-up camera)
    windN.bedPan.pan.setTargetAtTime(clamp(w.tx * AUD.WIND.panDownwind, -0.35, 0.35), t, 0.5);
  }
  function onGust(peakMph) {
    if (!windN || !lastView) return;
    const w = (lastView.sim && lastView.sim.wind) || { tx: 0.5, ty: 0.5 };
    const t = now(), T = AUD.WIND.gustSec;
    windN.gustUntil = t + T + 0.5;
    const p = windParams(peakMph, w.ty);
    windN.bedLP.frequency.setTargetAtTime(p.cut, t, AUD.WIND.gustAtk);
    windN.bedG.gain.setTargetAtTime(p.g, t, AUD.WIND.gustAtk);
    // the direction telegraph: gusts TRAVEL upwind -> downwind across the stereo field
    const start = clamp(-w.tx * AUD.WIND.gustPan, -0.8, 0.8); // upwind side = -toward.x
    windN.bedPan.pan.cancelScheduledValues(t);
    windN.bedPan.pan.setValueAtTime(start, t);
    windN.bedPan.pan.linearRampToValueAtTime(-start, t + T);
    // grass hiss layer: BP center sweeps 1.2k -> 3k with the lean
    windN.grassG.gain.setTargetAtTime(AUD.WIND.grassBase + AUD.WIND.grassK * peakMph, t, 0.25);
    windN.grassG.gain.setTargetAtTime(0, t + T, 0.9);
    windN.grassBP.frequency.setValueAtTime(1200, t);
    windN.grassBP.frequency.linearRampToValueAtTime(3000, t + T);
    windN.grassPan.pan.setValueAtTime(start, t);
    windN.grassPan.pan.linearRampToValueAtTime(-start, t + T);
    rec('gust', t);
  }

  // ---------------------------------------------------------------- FIRE CRACKLE (spec §7)
  const field = { I: 0, bbI: 0, crownI: 0, sect: new Float32Array(12), meanD: new Float32Array(12),
    bbPan: 0, risk: 0, lastMs: 0 };
  let roarN = null; // {roarG, subG} — lazily built crown roar + sub
  function buildRoar() {
    const src = ctx.createBufferSource(); src.buffer = buffers.BROWN; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = 0.7;
    const roarG = ctx.createGain(); roarG.gain.value = 0;
    src.connect(lp); lp.connect(roarG); roarG.connect(bus.fire); src.start();
    const o1 = ctx.createOscillator(); o1.frequency.value = AUD.FIRE.subF1;
    const o2 = ctx.createOscillator(); o2.frequency.value = AUD.FIRE.subF2; // 3.5 Hz physical beat
    const subG = ctx.createGain(); subG.gain.value = 0;
    o1.connect(subG); o2.connect(subG); subG.connect(bus.fire); o1.start(); o2.start();
    roarN = { roarG, subG, on: false };
  }
  function scanField() {
    const v = lastView; if (!v || !v.sim) { field.I = field.bbI = field.crownI = 0; return; }
    const sim = v.sim, stA = sim.state, fl = sim.flags, prov = sim.provenance, w = sim.wind;
    const cx = v.wardenPos ? v.wardenPos.x : GRID / 2, cy = v.wardenPos ? v.wardenPos.y : GRID / 2;
    const R = AUD.FIRE.radius, D2 = AUD.FIRE.attenD * AUD.FIRE.attenD;
    let I = 0, bbI = 0, cI = 0;
    const sect = field.sect; sect.fill(0);
    const cnt = new Float32Array(12), dsum = new Float32Array(12);
    let sx = 0, sy = 0, sn = 0, fx = 0, fy = 0, fn = 0; // backburn strip + front centroids
    const y0 = Math.max(0, (cy - R) | 0), y1 = Math.min(GRID - 1, (cy + R) | 0);
    const x0 = Math.max(0, (cx - R) | 0), x1 = Math.min(GRID - 1, (cx + R) | 0);
    for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) { // every-2nd-cell lattice
      const i = y * GRID + x, s = stA[i];
      if (s !== S.BURNING && s !== S.EMBERCAST) continue;
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d2 = dx * dx + dy * dy;
      if (d2 > R * R) continue;
      const d = Math.sqrt(d2), A = 1 / (1 + d2 / D2);
      const crown = fl[i] & FLAG.CROWNING;
      const h = (s === S.BURNING ? 1 : 0.6) * (crown ? 2.2 : 1) * 4; // x4: lattice area weight
      const wgt = h * A;
      if (prov[i]) {
        bbI += wgt; sx += x * wgt; sy += y * wgt; sn += wgt;
        // front cell test (matches sim's frontage definition): unburned flammable downwind
        for (const [nx, ny] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (w.tx * nx + w.ty * ny <= 0.3) continue;
          const X = x + nx, Y = y + ny;
          if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
          const j = Y * GRID + X;
          if (stA[j] === S.UNBURNED && F_BURNABLE[sim.fuel[j]]) { fx += x * wgt; fy += y * wgt; fn += wgt; break; }
        }
      } else I += wgt;
      if (crown) cI += wgt;
      const k = ((Math.atan2(dy, dx) / Math.PI * 6 + 12) | 0) % 12;
      sect[k] += wgt; cnt[k]++; dsum[k] += d;
    }
    for (let k = 0; k < 12; k++) field.meanD[k] = cnt[k] ? dsum[k] / cnt[k] : 48;
    field.I = I; field.bbI = bbI; field.crownI = cI;
    // drone risk (canon-final §5, PROVISIONAL reading: front = the backburn's own live front,
    // strip = all its burning cells — risk rises when the front runs downwind of the strip)
    if (sn > 0) {
      field.bbPan = panWorld(sx / sn, sy / sn);
      if (fn > 0) {
        const vx = fx / fn - sx / sn, vy = fy / fn - sy / sn, L = Math.hypot(vx, vy) || 1;
        field.risk = clamp01(0.5 + 0.5 * (w.tx * vx / L + w.ty * vy / L));
      } else field.risk = 0.2;
    } else field.risk = 0;
    // crown roar + sub (hysteresis; slow attack — crown fire ARRIVES, it doesn't switch on)
    if (roarN) {
      if (!roarN.on && cI > AUD.FIRE.crownOn) roarN.on = true;
      if (roarN.on && cI < AUD.FIRE.crownOff) roarN.on = false;
      const target = roarN.on ? AUD.FIRE.roarMax * Math.min(1, cI / AUD.FIRE.roarNorm) : 0;
      const shel = (v.inScar || wardenInScar()) ? AUD.FIRE.shelterMul : 1;
      roarN.roarG.gain.setTargetAtTime(target * shel, now(), target > 0 ? 2.0 : 4.0);
      roarN.subG.gain.setTargetAtTime(AUD.FIRE.subMax * (target / AUD.FIRE.roarMax || 0), now(), target > 0 ? 2.0 : 4.0);
    }
    // scar shelter filter on the whole fire bus
    if (shelterLP) {
      const inScar = wardenInScar();
      shelterLP.frequency.setTargetAtTime(inScar ? AUD.FIRE.shelterLP : 20000, now(), AUD.FIRE.shelterTau);
    }
  }
  function wardenInScar() {
    const v = lastView;
    if (!v || !v.sim || !v.wardenPos) return false;
    const i = (v.wardenPos.y | 0) * GRID + (v.wardenPos.x | 0);
    return i >= 0 && i < CELLS && v.sim.fuel[i] === FUEL.SCAR;
  }
  let nextGrain = 0, nextBBGrain = 0;
  function pumpCrackle(until) {
    const t = now();
    const sampleSector = () => { // histogram-weighted sector pick -> pan + distance atten
      let tot = 0; for (let k = 0; k < 12; k++) tot += field.sect[k];
      if (tot <= 0) return { pan: 0, dist: 48 };
      let r = rng() * tot, k = 0;
      for (; k < 11; k++) { r -= field.sect[k]; if (r <= 0) break; }
      const ang = (k + 0.5) * Math.PI / 6;
      return { pan: Math.sin(ang) * 0.9 + (rng() - 0.5) * 0.15, dist: field.meanD[k] };
    };
    const night = lastView && lastView.phase === 'NIGHT';
    const emitBand = (rate, cool) => { // cool = the backburn band: darker, softer, slower
      let nx = cool ? nextBBGrain : nextGrain;
      if (rate <= 0) { if (cool) nextBBGrain = until; else nextGrain = until; return; }
      if (nx < t - 0.5) nx = t;
      while (nx < until) {
        const dur = (8 + rng() * 22) / 1000;
        const pop = rng() < 0.055;
        const sec = sampleSector();
        const bpC = (pop ? 2000 : 800 + rng() * 3200) * (cool ? 0.6 : 1) * (night ? 0.85 : 1);
        grain(lanes.crackle, nx, {
          buf: 'BROWN', dur: pop ? 0.004 : dur, rate: (0.7 + rng() * 0.7) * (cool ? 0.85 : 1),
          bp: bpC, q: pop ? 0.3 : 1.2, pan: sec.pan,
          gain: (0.5 + 0.5 * rng()) * (0.6 + 0.4 * Math.min(1, field.I / 50))
              * (1 / (1 + (sec.dist / 48) ** 2)) * (pop ? 1.6 : 1) * (cool ? 0.8 : 1),
          name: cool ? 'bbgrain' : 'grain',
        });
        nx += -Math.log(1 - rng()) / rate; // Poisson inter-grain
      }
      if (cool) nextBBGrain = nx; else nextGrain = nx;
    };
    emitBand(Math.min(AUD.FIRE.grainMax, AUD.FIRE.grainK * Math.sqrt(field.I)), false);
    emitBand(Math.min(AUD.FIRE.bbGrainMax, AUD.FIRE.bbGrainK * Math.sqrt(field.bbI)), true);
  }
  function ignitionBurst(t, pan) { // 3-grain burst: a state change you can timestamp by ear (spec §8)
    for (const dt of [0, 0.035, 0.08])
      grain(lanes.crackle, t + dt, { buf: 'BROWN', dur: 0.02 + rng() * 0.015, rate: 0.8 + rng() * 0.5,
        bp: 1000 + rng() * 2500, q: 1.2, pan, gain: 0.3, name: 'ignite' });
  }

  // ---------------------------------------------------------------- INSECT DRONE (spec §10)
  let bugN = null, localFuel = 0, localFuelAt = 0;
  function buildBugs() {
    const mkVoice = (panV) => {
      const osc = ctx.createOscillator(); osc.frequency.value = AUD.BUG.carBase;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = AUD.BUG.carBase; bp.Q.value = 4;
      const pg = ctx.createGain(); pg.gain.value = 0;
      const pan = ctx.createStereoPanner(); pan.pan.value = panV;
      osc.connect(bp); bp.connect(pg); pg.connect(pan); pan.connect(bus.bugs); osc.start();
      return { osc, bp, pg, next: 0 };
    };
    bugN = { v: [mkVoice(-0.35), mkVoice(0.35)], dEff: 0, nextTick: 0 };
  }
  function updateLocalFuel() { // 0..1 avg normalized unburned load, r=40 around camera (sparse lattice)
    const v = lastView; if (!v || !v.sim || !v.wardenPos) return;
    const sim = v.sim, cx = v.wardenPos.x | 0, cy = v.wardenPos.y | 0;
    let sum = 0, n = 0;
    for (let y = Math.max(0, cy - 40); y <= Math.min(GRID - 1, cy + 40); y += 4)
      for (let x = Math.max(0, cx - 40); x <= Math.min(GRID - 1, cx + 40); x += 4) {
        const i = y * GRID + x, f = sim.fuel[i];
        if (!F_BURNABLE[f] || sim.state[i] !== S.UNBURNED) continue;
        sum += clamp01(sim.load[i] / (F_LOADMAX[f] || 3)); n++;
      }
    localFuel = n ? sum / n : 0;
  }
  function pumpBugs(until) {
    if (!bugN || !lastView) return;
    const D = lastView.dryness ?? (lastView.sim ? lastView.sim.D : 0.5);
    const dEff = clamp(D + AUD.BUG.localK * localFuel, 0, 1.15);
    bugN.dEff = dEff;
    const car = AUD.BUG.carBase + AUD.BUG.carK * dEff;
    const lvl = AUD.BUG.lvlBase + AUD.BUG.lvlK * Math.min(dEff, 1);
    const det = dEff >= AUD.BUG.uneaseAt ? AUD.BUG.unease : AUD.BUG.detune; // two crickets slightly wrong
    const g = AUD.BUG.grpBase + AUD.BUG.grpK * dEff;
    const t = now();
    bugN.v.forEach((vc, k) => {
      const f = car * (k ? Math.pow(2, det / 1200) : 1);
      vc.osc.frequency.setTargetAtTime(f, t, 0.4);
      vc.bp.frequency.setTargetAtTime(f, t, 0.4);
      if (vc.next < t - 0.5) vc.next = t + rng() * 0.3;
      while (vc.next < until) { // group = 3 pulses, 55 ms apart (crickets change GROUP rate)
        for (let p = 0; p < 3; p++) {
          const tp = vc.next + p * AUD.BUG.intraS;
          vc.pg.gain.setTargetAtTime(lvl, tp, 0.004);
          vc.pg.gain.setTargetAtTime(0, tp + 0.014, 0.012);
        }
        vc.next += (1 / g) * (0.85 + rng() * 0.30);
      }
    });
    if (dEff >= AUD.BUG.tickAt) { // brittle-stem dry ticks
      if (bugN.nextTick < t - 0.5) bugN.nextTick = t;
      while (bugN.nextTick < until) {
        burst(bugN.nextTick, { buf: 'PINK', dur: 0.003, bp: 5000, q: 2, gain: 0.05,
          pan: rng() * 2 - 1, dest: bus.bugs, name: 'dryTick' });
        bugN.nextTick += -Math.log(1 - rng()) / AUD.BUG.tickLambda;
      }
    }
  }

  // ---------------------------------------------------------------- EMBERS (canon §4 + spec-verbs §9.1)
  const castRing = [];        // recent emberCast origins for flight-distance pitch
  const recentCatch = new Map(); // cell -> catchTick (for ignition bursts + shimmer)
  const catchTimes = [];      // shower clustering window
  let chimeActive = 0;
  function onEmberCast(e) {
    castRing.push({ x: e.from % GRID, y: (e.from / GRID) | 0, crown: e.crown, tick: e.tick });
    if (castRing.length > 48) castRing.shift();
  }
  function onEmberCatch(e) {
    const t = now() + 0.03;
    const x = e.cell % GRID, y = (e.cell / GRID) | 0;
    let dist = 8; // fallback flight distance
    for (let k = castRing.length - 1; k >= 0; k--) {
      const c = castRing[k];
      if (c.crown !== e.crown || e.tick - c.tick > 70) continue;
      dist = Math.hypot(x - c.x, y - c.y); break;
    }
    recentCatch.set(e.cell, e.tick);
    if (recentCatch.size > 64) recentCatch.delete(recentCatch.keys().next().value);
    // shower clustering: >4 catches in 250 ms coalesce into ONE strum (music, not panic)
    while (catchTimes.length && t - catchTimes[0] > AUD.CHIME.showerMs) catchTimes.shift();
    catchTimes.push(t);
    const pan = cellPan(e.cell);
    if (catchTimes.length > AUD.CHIME.showerN) { showerStrum(t, pan); return; }
    chime(t, pan, dist, e.crown);
  }
  function chime(t, pan, dist, crown) {
    if (chimeActive >= AUD.CHIME.max) return; // hard cap 6
    chimeActive++;
    // FM bell (spec-verbs 9.1): carrier 1400 + 40*tiles; crown casts ring +5 semitones
    const f = (AUD.CHIME.base + AUD.CHIME.perTile * dist) * (crown ? st(AUD.CHIME.crownSt) : 1);
    const car = ctx.createOscillator(); car.frequency.value = f;
    const mod = ctx.createOscillator(); mod.frequency.value = f * 3.01;
    const mg = ctx.createGain(); // PROVISIONAL: "index 6->0" read as deviation 0.9*f -> 0 (musical, not literal I*fm)
    mg.gain.setValueAtTime(f * 0.9, t); mg.gain.exponentialRampToValueAtTime(1, t + 0.35);
    mod.connect(mg); mg.connect(car.frequency);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.002); g.gain.setTargetAtTime(0, t + 0.002, 0.18);
    const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -0.92, 0.92);
    car.connect(g); g.connect(p); p.connect(bus.embers); send(p, 0.12);
    car.start(t); car.stop(t + 0.6); mod.start(t); mod.stop(t + 0.6);
    car.onended = () => { chimeActive = Math.max(0, chimeActive - 1); };
    burst(t, { buf: 'WHITE', dur: 0.008, bp: 6500, q: 1, gain: 0.12, pan, dest: bus.embers, name: 'spark' });
    // chime never buries: short duck on the beds (spec §4.2 ember row)
    duck(['wind', 'fire', 'bugs', 'birds', 'music'], -5, 0.04, 0.4, 0.35);
    rec('chime', t);
  }
  function showerStrum(t, pan) { // F#6, B6, E7 — still D-mixolydian; "many, over THERE"
    [NOTE.Fs6, NOTE.B6, NOTE.E7].forEach((f, i) => tone(t + i * 0.045, {
      type: 'triangle', f0: f, dur: 0.5, gain: 0.30, tau: 0.18,
      pan: clamp(pan + (i - 1) * 0.25, -0.92, 0.92), dest: bus.embers, sendAmt: 0.12, name: 'shower' }));
    squelch(t);
  }
  const shimmers = []; // {cell, atTick} — start the fuse hiss only if the glow still lives
  function pumpShimmers() {
    const v = lastView; if (!v || !v.sim) return;
    const tick = v.sim.tick;
    for (const [cell, ct] of recentCatch) {
      if (tick - ct === 60) shimmers.push({ cell, at: now() + 0.03 }); // last 1.0 s of the 3.0 s telegraph
      if (tick - ct > 95) recentCatch.delete(cell);
    }
    while (shimmers.length) {
      const s = shimmers.shift();
      if (!(v.sim.flags[s.cell] & FLAG.EMBER_GLOW)) continue; // stomped: no lie
      burst(s.at, { buf: 'WHITE', dur: 1.0, bp: 2000, q: 1.5, gain: 0.06, atk: 0.05, tau: 0.5,
        pan: cellPan(s.cell), dest: bus.embers, name: 'shimmer' });
      // rising = fuse: sweep the bandpass 2k -> 6k across the last second (spec §11.2)
    }
  }
  function onEmberFizzle(e) {
    const t = now() + 0.03, pan = cellPan(e.cell);
    if (e.water) burst(t, { buf: 'WHITE', dur: 0.25, lp: 3000, lpTo: 800, gain: 0.15, pan, dest: bus.embers, name: 'waterHiss' });
    else tone(t, { f0: 600, f1: 380, dur: 0.09, gain: 0.12, tau: 0.06, pan, dest: bus.embers, name: 'fizzle' });
    // relief has a sound; the player can stop sprinting
  }

  // ---------------------------------------------------------------- VERB SOUNDS
  // CUT: integrator calls cutTick({fuel, dragSpeed01, x, y}) once per cell converted.
  const CUT_CLS = { // spec-audio §12.1 bed classes
    grass: { bp: [1500, 3000], q: 1.4, rate: 50, dur: [10, 24] },
    brush: { bp: [600, 1500], q: 1.2, rate: 45, dur: [14, 30] },
    timber: { bp: [250, 900], q: 1.0, rate: 60, dur: [18, 40] },
  };
  const fuelCls = (f) => f === FUEL.GRASS ? 'grass'
    : (f === FUEL.BRUSH || f === FUEL.SLASH) ? 'brush' : 'timber';
  let cutState = { until: 0, cls: 'grass', speed: 1, pan: 0, next: 0 };
  let groanN = null;
  function cutTick(e) {
    if (!unlocked) return;
    const t = now() + 0.01, jit = 1 + (rng() * 2 - 1) * 0.04; // ±4%: repetition without machine-gun aliasing
    const pan = panWorld(e.x, e.y);
    cutState = { until: t + 0.3, cls: fuelCls(e.fuel), speed: clamp01(e.dragSpeed01 ?? 1), pan, next: cutState.next };
    switch (e.fuel) { // per-cell BITE (spec-verbs §5.5): the rake tells you what it's tearing
      case FUEL.GRASS: // zip-zip-zip
        burst(t, { buf: 'WHITE', dur: 0.08, hp: 3000, gain: 0.20, pan, dest: bus.verbs, name: 'bite' });
        for (const dt of [0.02, 0.05]) tone(t + dt, { f0: 140 * jit, dur: 0.01, gain: 0.18, pan, dest: bus.verbs });
        break;
      case FUEL.BRUSH: // crunch-CRACK
        burst(t, { buf: 'PINK', dur: 0.12, bp: 800 * jit, q: 1.2, gain: 0.24, pan, dest: bus.verbs, name: 'bite' });
        tone(t + 0.015, { type: 'square', f0: (90 + rng() * 50) * jit, dur: 0.03, gain: 0.22, pan, dest: bus.verbs });
        break;
      case FUEL.TIMBER: case FUEL.CROWN_CANOPY: // chopping among roots
        tone(t, { f0: 200 * jit, dur: 0.11, gain: 0.26, tau: 0.05, pan, dest: bus.verbs, name: 'bite' });
        if (rng() < 1 / 6) { // root-strike clank: metallic FM ping
          const c = tone(t + 0.02, { f0: 600 * jit, dur: 0.15, gain: 0.15, tau: 0.06, pan, dest: bus.verbs, name: 'clank' });
          if (c) { const m = ctx.createOscillator(); m.frequency.value = 600 * 2.76;
            const mg = ctx.createGain(); mg.gain.value = 400; m.connect(mg); mg.connect(c.frequency);
            m.start(t + 0.02); m.stop(t + 0.2); }
        }
        break;
      case FUEL.SLASH: // hauling junk; deliberately unpleasant
        tone(t, { type: 'square', f0: 300 * jit, dur: 0.07, gain: 0.16, pan, dest: bus.verbs, name: 'bite' });
        tone(t + 0.05, { type: 'square', f0: 450 * jit, dur: 0.07, gain: 0.14, pan, dest: bus.verbs });
        burst(t, { buf: 'PINK', dur: 0.14, bp: 500, q: 0.8, gain: 0.12, pan, dest: bus.verbs });
        break;
      default: // duff / riparian: fabric tearing, damp
        burst(t, { buf: 'BROWN', dur: 0.10, lp: 600, gain: 0.22, atk: 0.02, pan, dest: bus.verbs, name: 'bite' });
    }
  }
  function pumpCutBed(until) { // continuous soil-rip: resistance is audible
    const t = now();
    if (t > cutState.until) { if (groanN) { groanN.g.gain.setTargetAtTime(0, t, 0.08); } return; }
    const c = CUT_CLS[cutState.cls], sp = cutState.speed;
    const rate = c.rate * (0.35 + 0.65 * sp);
    if (cutState.next < t - 0.3) cutState.next = t;
    while (cutState.next < until) {
      grain(lanes.soil, cutState.next, {
        buf: 'PINK', dur: (c.dur[0] + rng() * (c.dur[1] - c.dur[0])) / 1000,
        rate: 0.8 + rng() * 0.5, bp: c.bp[0] + rng() * (c.bp[1] - c.bp[0]), q: c.q,
        pan: cutState.pan, gain: 0.22 * (1.6 - 0.6 * sp), // slow drag = slower, HEAVIER grains
        name: 'soil' });
      cutState.next += -Math.log(1 - rng()) / rate;
    }
    if (cutState.cls === 'timber') { // resistance groan while dragging heavy dirt
      if (!groanN) {
        const osc = ctx.createOscillator(); osc.frequency.value = 90;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 1.3;
        const lg = ctx.createGain(); lg.gain.value = 6; lfo.connect(lg); lg.connect(osc.frequency);
        const g = ctx.createGain(); g.gain.value = 0;
        osc.connect(g); g.connect(bus.verbs); osc.start(); lfo.start();
        groanN = { g };
      }
      groanN.g.gain.setTargetAtTime(0.10, t, 0.05);
    } else if (groanN) groanN.g.gain.setTargetAtTime(0, t, 0.08);
  }

  // BACKBURN lit-fuse drone (spec-verbs §6.2 + canon-final §5): the only unresolved sound
  let droneN = null, droneAlarmUntil = 0;
  function buildDrone() {
    const f = scene === 'rx' ? 73.42 : 110.0; // A2 fighting (unresolved 5th); D2 gardening (home)
    const s1 = ctx.createOscillator(); s1.type = 'sawtooth'; s1.frequency.value = f;
    const s2 = ctx.createOscillator(); s2.type = 'sawtooth'; s2.frequency.value = f + 0.8;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
    const g = ctx.createGain(); g.gain.value = 0;
    const pan = ctx.createStereoPanner();
    s1.connect(lp); s2.connect(lp); lp.connect(g); g.connect(pan); pan.connect(bus.verbs);
    s1.start(); s2.start();
    droneN = { s1, s2, lp, g, pan, base: f };
  }
  function updateDrone() {
    if (!lastView || !lastView.sim) return;
    const t = now();
    let frontage = 0;
    for (const v of lastView.sim.backburnFrontage.values()) frontage += v;
    if (frontage <= 0) { if (droneN) droneN.g.gain.setTargetAtTime(0, t, 0.6); return; }
    if (!droneN) buildDrone();
    if (t < droneAlarmUntil) return; // the alarm owns the drone during its spike
    const rx = scene === 'rx';
    const base = rx ? 73.42 : 110.0;
    const r = field.risk;
    const cut = rx ? 240 + 580 * r : 240 + 1160 * r;     // the fuse audibly shortens
    const beat = (0.8 + 4.0 * r) * (rx ? 0.5 : 1);
    // level: -30 dB at 2 front cells -> -16 dB at 60+ (spec-verbs 6.2)
    const lvl = dB(-30 + 14 * clamp01((frontage - 2) / 58));
    droneN.base = base;
    droneN.s1.frequency.setTargetAtTime(base, t, 0.4);
    droneN.s2.frequency.setTargetAtTime(base + beat, t, 0.4);
    droneN.lp.frequency.setTargetAtTime(cut, t, 0.4);
    droneN.g.gain.setTargetAtTime(lvl, t, 0.4);
    droneN.pan.pan.setTargetAtTime(field.bbPan, t, 0.5);
  }
  function onEscape() { // spec-verbs §6.4 (task-binding): +7 st glide + minor-second pings
    const t = now();
    if (droneN) {
      droneAlarmUntil = t + 2.2;
      for (const o of [droneN.s1, droneN.s2]) {
        o.frequency.cancelScheduledValues(t);
        o.frequency.setValueAtTime(droneN.base, t);
        o.frequency.exponentialRampToValueAtTime(droneN.base * st(7), t + 0.5);
        o.frequency.setTargetAtTime(droneN.base, t + 1.8, 0.4);
      }
      const g = droneN.g.gain; // 6 Hz tremolo, hand-scheduled (no leaked LFO nodes)
      for (let i = 0; i < 10; i++) {
        g.setTargetAtTime(dB(-14), t + i / 6, 0.02);
        g.setTargetAtTime(dB(-26), t + i / 6 + 0.083, 0.02);
      }
      g.setTargetAtTime(dB(-20), t + 1.8, 0.4);
    }
    for (let i = 0; i < 4; i++) { // E5/F5 minor-second pair, 900 ms interval, panned to the front
      tone(t + i * 0.9, { f0: NOTE.E5, dur: 0.12, gain: 0.28, tau: 0.08, pan: field.bbPan, dest: bus.ui, name: 'alarmPing' });
      tone(t + i * 0.9 + 0.13, { f0: NOTE.F5, dur: 0.12, gain: 0.26, tau: 0.08, pan: field.bbPan, dest: bus.ui });
    }
    duck(['wind', 'fire'], -3, 0.05, 0.6, 1.0);
    rec('escapeAlarm', t);
  }
  function onStarve() { // drone fades 1.5 s, then the F-add9 answers the question
    const t = now();
    if (droneN) droneN.g.gain.setTargetAtTime(0, t, 0.5);
    chordPlay('starve', t + 0.3);
  }

  // STOMP (spec-verbs §9.2, task-binding 90 Hz) / drip / cede / plant / misc UI
  function stompSound(cells, pan) {
    const t = now() + 0.01;
    tone(t, { f0: 90, dur: 0.12, gain: 0.35, tau: 0.08, pan, dest: bus.verbs, name: 'stomp' });
    burst(t + 0.02, { buf: 'WHITE', dur: 0.15 + 0.09 * cells, lp: 4000, lpTo: 600,
      gain: 0.2, pan, dest: bus.verbs, name: 'steam' }); // hiss length grows with cells killed
  }
  let cedeN = null, plantCount = 0, lastPlantPan = 0;
  function uiSound(name, opts = {}) {
    if (!unlocked) return;
    const t = now() + 0.01;
    const pan = opts.pan ?? (opts.x != null ? panWorld(opts.x, opts.y) : 0);
    switch (name) {
      case 'cedeTick': // counting to three before saying something you can't unsay
        tone(t, { f0: 800, dur: 0.03, gain: 0.08, pan: 0, dest: bus.ui, name: 'cedeTick' });
        burst(t, { buf: 'WHITE', dur: 0.02, bp: 2500, q: 2, gain: 0.05, dest: bus.ui });
        break;
      case 'cedeSwell': { // anticipatory weight; cancels SILENTLY (asking must be free)
        if (cedeN) break;
        const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = NOTE.C2;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.6);
        osc.connect(lp); lp.connect(g); g.connect(bus.ui); osc.start(t);
        cedeN = { osc, g };
        rec('cedeSwell', t);
        break;
      }
      case 'cedeCancel':
        if (cedeN) { cedeN.g.gain.cancelScheduledValues(t); cedeN.g.gain.setTargetAtTime(0, t, 0.01);
          cedeN.osc.stop(t + 0.1); cedeN = null; } // no sound, no penalty
        break;
      case 'stompThud': stompSound(opts.cells ?? 1, pan); break;
      case 'stompFizzle': // too big for boots — dull thud, no hiss, zero tutorial text
        tone(t, { f0: 60, dur: 0.1, gain: 0.25, tau: 0.06, pan, dest: bus.verbs, name: 'thudFizzle' });
        break;
      case 'scuff': burst(t, { buf: 'PINK', dur: 0.03, bp: 900, gain: 0.04, pan, dest: bus.verbs, name: 'scuff' }); break;
      case 'rakeSet': // the tool bites before the first step (press acknowledgment, 1 frame)
        tone(t, { f0: 200, dur: 0.03, gain: 0.18, pan, dest: bus.verbs, name: 'rakeSet' });
        burst(t, { buf: 'PINK', dur: 0.03, bp: 1800, q: 1.5, gain: 0.10, pan, dest: bus.verbs });
        break;
      case 'sizzle': // cut refused at burning cell: you can't rake flame
        burst(t, { buf: 'WHITE', dur: 0.15, hp: 3000, gain: 0.14, pan, dest: bus.verbs, name: 'sizzle' });
        break;
      case 'plant': { // trowel chuk + pentatonic pitch variation, NO sustained tail (canon §9)
        grain(lanes.soil, t, { buf: 'PINK', dur: 0.03, rate: 0.9, bp: 500, q: 1.0, pan, gain: 0.15, name: 'trowel' });
        tone(t + 0.03, { f0: 63, dur: 0.08, gain: 0.20, tau: 0.05, pan, dest: bus.verbs });
        tone(t + 0.05, { type: 'triangle', f0: PENT[(plantCount + (rng() * 2 | 0)) % 5], dur: 0.07,
          gain: 0.10, tau: 0.03, pan, dest: bus.ui, name: 'plant' }); // 30-70 ms: a pitch, not a melody
        plantCount++; lastPlantPan = pan;
        if (plantCount % 10 === 0) scheduleAnswerBird(t + 1.2 + (rng() * 0.8 - 0.4), -pan); // hope, rationed
        break;
      }
      case 'truck': { // the 90 s interlude ends diegetically: the truck, not a curtain
        burst(t, { buf: 'BROWN', dur: 2.2, lp: 160, gain: 0.25, atk: 0.3, tau: 0.8, pan: 0.4, dest: bus.ui, name: 'truck' });
        tone(t, { f0: 55, dur: 2.0, gain: 0.12, atk: 0.3, tau: 0.7, am: { rate: 9, depth: 0.5 }, pan: 0.4, dest: bus.ui });
        tone(t + 2.0, { f0: 120, dur: 0.05, gain: 0.15, pan: 0.4, dest: bus.ui }); // door thunk
        break;
      }
      case 'radioTick': // 18 chars/s soft type ticks live here; radio.js calls per char
        tone(t, { f0: 1400, dur: 0.006, gain: 0.032, pan: 0, dest: bus.ui, name: 'radioTick' });
        break;
      case 'dateStamp': // the ledger's date stamps down: two heavy hits
        for (const dt of [0, 0.09]) {
          tone(t + dt, { f0: 55, dur: 0.07, gain: 0.30, tau: 0.04, dest: bus.ui, name: 'dateStamp' });
          burst(t + dt, { buf: 'WHITE', dur: 0.01, gain: 0.18, dest: bus.ui });
        }
        break;
      default: rec('ui:' + name + ':unknown', t);
    }
  }
  function onDrip(e) { // arming click, panned at the cell
    const t = now() + 0.01, pan = cellPan(e.cell);
    tone(t, { type: 'square', f0: 2000, dur: 0.012, gain: 0.18, pan, dest: bus.verbs, name: 'dripClick' });
    burst(t, { buf: 'PINK', dur: 0.006, bp: 3000, q: 2, gain: 0.14, pan, dest: bus.verbs });
  }
  function onDripIgnite(e) { // 0.8 s later: the whoomp births a fire you then hear AS fire
    const t = now() + 0.01, pan = cellPan(e.cell);
    tone(t, { f0: 160, f1: 60, exp: true, dur: 0.18, gain: 0.4, tau: 0.12, pan, dest: bus.verbs, name: 'whoomp' });
    burst(t, { buf: 'BROWN', dur: 0.3, lp: 400, gain: 0.3, pan, dest: bus.verbs });
    ignitionBurst(t + 0.02, pan);
  }

  // ---------------------------------------------------------------- CHORDS (one family, two registers)
  function chordPlay(name, tAt) {
    if (!unlocked) return;
    const t = tAt ?? now() + 0.02;
    switch (name) {
      case 'tieIn': // task-binding (spec-verbs §5.6): 15 ms chunk + 70 Hz thump + D-triad, 900 ms
        burst(t, { buf: 'WHITE', dur: 0.015, gain: 0.35, dest: bus.ui, name: 'tieIn' });
        tone(t, { f0: 70, dur: 0.08, gain: 0.3, tau: 0.05, dest: bus.ui });
        playNotes(t + 0.01, [NOTE.D3, NOTE.A3, NOTE.D4], { gain: 0.30, tau: 0.9, dur: 1.4, strum: 0.012 });
        break;
      case 'starve': // F add9: warmth with one suspended note of memory in it
        playNotes(t, [NOTE.F2, NOTE.C3, NOTE.F3, NOTE.A3, NOTE.G4],
          { gain: 0.25, atk: 0.18, tau: 0.9, dur: 2.8, lp: 1200, name: 'starve' });
        playNotes(t, [NOTE.F2, NOTE.C3, NOTE.F3], { wave: 'sawtooth', gain: 0.10, atk: 0.18, tau: 0.9, dur: 2.8, lp: 1200 });
        break;
      case 'retardantHeld': // earned liturgy only (spec-verbs §8.3): tall chord, tie-in root family
        playNotes(t, [NOTE.D3, NOTE.A3, NOTE.E4, NOTE.A4],
          { gain: 0.25, atk: 0.4, tau: 0.8, dur: 2.0, sendAmt: 0.30, name: 'retardantHeld' });
        break;
      case 'ledger': // plagal G -> D: the tally cadence
        playNotes(t, [NOTE.G3, NOTE.B3, NOTE.D4], { gain: 0.22, dur: 0.6, tau: 0.3, name: 'ledger' });
        playNotes(t + 0.6, [NOTE.D3, NOTE.A3, NOTE.D4, NOTE.Fs4], { gain: 0.22, dur: 0.9, tau: 0.4 });
        break;
      case 'medal': { // D-C-G-D liturgy blocks; the final D adds B — ends inside the tie-in chord
        const prog = [[NOTE.D3, NOTE.Fs3, NOTE.A3], [NOTE.C3, NOTE.E3, NOTE.G3],
                      [NOTE.G2, NOTE.B3, NOTE.D4], [NOTE.D3, NOTE.Fs3, NOTE.A3, NOTE.B4]];
        prog.forEach((c, i) => playNotes(t + i * 0.7,
          c, { wave: 'sawtooth', gain: 0.25, lp: 2200, dur: 0.75, tau: 0.35, name: i === 0 ? 'medal' : undefined }));
        break;
      }
      default: rec('chord:' + name + ':unknown', t);
    }
  }

  // ---------------------------------------------------------------- RADIO primitives
  function squelch(tAt) {
    const t = tAt ?? now() + 0.01;
    burst(t, { buf: 'WHITE', dur: 0.035, bp: 1800, q: 1.2, gain: 0.22, dest: bus.ui, name: 'squelch' });
    burst(t, { buf: 'WHITE', dur: 0.003, gain: 0.15, dest: bus.ui });
  }
  function radioKey() { // squelch + PTT: even the radio is in the family (A = the 5th of D)
    if (!unlocked) return;
    const t = now() + 0.01;
    squelch(t);
    tone(t + 0.05, { f0: 880, dur: 0.05, gain: 0.16, dest: bus.ui, name: 'ptt' });
    duck(['music'], -4, 0.05, 0.5, 2.0);
  }
  function typeTick() { // ledger typewriter thunk — heavier than the radio's soft ticks
    if (!unlocked) return;
    const t = now() + 0.01;
    burst(t, { buf: 'WHITE', dur: 0.004, gain: 0.22, dest: bus.ui, name: 'typeTick' });
    tone(t, { f0: 65 * (1 + (rng() * 2 - 1) * 0.05), dur: 0.05, gain: 0.16, tau: 0.03, dest: bus.ui });
  }

  // ---------------------------------------------------------------- BIRDSONG (spec §9 + season §3)
  // Each zone owns a signature motif — a proper noun in sound. Density IS the health meter.
  // Syllable: {at, dur, f0, f1?, arch?, vib?{rate,depth01}, am?{rate,depth}, noise?, lp?, g?}
  const reps = (n, fn) => { const a = []; for (let i = 0; i < n; i++) a.push(fn(i)); return a; };
  const MOTIF = {
    [ZONE.MILLHAVEN]: (r) => reps(6 + (r() * 4 | 0), (i) => ({ // swallows: fast chirp swarm
      at: i * 0.07 + r() * 0.025, dur: 0.045, f0: 3000 + r() * 1800, f1: 3600 + r() * 1600 })),
    [ZONE.LARDER]: (r) => [{ at: 0, dur: 0.7, f0: 3300 + r() * 300, // varied thrush: single buzzed whistle, sparse
      am: { rate: 55, depth: 0.7 }, g: 0.8 }],
    [ZONE.DOGHAIR]: (r) => reps(5, (i) => ({ // kinglets: thin high tinkle, descending set
      at: i * 0.11, dur: 0.04, f0: 7200 - i * 260 + r() * 200, f1: 6800 - i * 260, g: 0.55 })),
    [ZONE.TIN_CAMP]: (r) => reps(5, (i) => ({ // rock wren: bouncing trill, accelerating
      at: i * (0.16 - i * 0.012), dur: 0.09, f0: 2700 + r() * 200, arch: 1.18 })),
    [ZONE.CAMAS]: (r) => [ // vesper sparrow: two low notes, then trill
      { at: 0, dur: 0.15, f0: 2000 + r() * 100 }, { at: 0.22, dur: 0.15, f0: 1800 + r() * 100 },
      { at: 0.45, dur: 0.5, f0: 3200 + r() * 200, vib: { rate: 11, depth: 0.06 } }],
    [ZONE.BRIDE_CREEK]: (r) => reps(4, (i) => ({ // yellow warbler: sweet-sweet-sweet, last two quick
      at: i < 3 ? i * 0.16 : 0.48 + (i - 3) * 0.09, dur: i < 3 ? 0.12 : 0.07,
      f0: 3200 + r() * 150, f1: 4200 + r() * 200 })),
    [ZONE.HASTY_DRAW]: (r) => [{ at: 0, dur: 0.9, f0: 7500 + r() * 400, // grasshopper sparrow: insect buzz
      am: { rate: 40, depth: 0.85 }, g: 0.45 }],
    [ZONE.EWE_BENCH]: (r) => { // meadowlark: 5-note FM flute warble — the map's best song
      const seq = [NOTE.D5 * 2, NOTE.B5, NOTE.A5, NOTE.Fs5, NOTE.E5];
      return seq.map((f, i) => ({ at: i * 0.17, dur: 0.14 + (i === 4 ? 0.1 : 0),
        f0: f * (1 + r() * 0.01), f1: f * (i % 2 ? 1.06 : 0.94),
        vib: { rate: 6.5, depth: 0.04 }, g: 1.0 }));
    },
    [ZONE.WICK_ORCHARD]: (r) => reps(4, (i) => ({ // robin: caroling arches, jaunty gaps
      at: i * 0.24, dur: 0.16, f0: 2200 + r() * 500, arch: 1.25 })),
    [ZONE.PREACHERS_KNOB]: (r) => reps(3, (i) => ({ // mourning dove: three low coos
      at: i * 0.42, dur: 0.32, f0: 480 - i * 30 + r() * 15, arch: 1.12, lp: 900, g: 0.9 })),
    [ZONE.HALLORAN_MILL]: (r) => reps(7 + (r() * 4 | 0), (i) => ({ // starlings: mechanical chatter
      at: i * 0.06 + r() * 0.03, dur: 0.03 + r() * 0.03,
      f0: 1500 + r() * 2500, f1: 1500 + r() * 2500, g: 0.6 })),
    [ZONE.STATIC_POINT]: (r) => [{ at: 0, dur: 0.24, f0: 320 + r() * 40, noise: true, // raven: one dry croak
      am: { rate: 90, depth: 0.6 }, lp: 700, g: 0.9 }],
    [ZONE.FAR_BANK]: null, // distance haze only (season §3)
    [ZONE.DITCH]: (r) => [ // PROVISIONAL: season table has no Ditch stem — chickadee two-note
      { at: 0, dur: 0.18, f0: 3800 }, { at: 0.24, dur: 0.2, f0: 3100 }],
  };
  const MATRIX_MOTIF = [ // unzoned slope: generic chickadee / junco bed
    (r) => [{ at: 0, dur: 0.18, f0: 3800 }, { at: 0.24, dur: 0.2, f0: 3100 }],
    (r) => [{ at: 0, dur: 0.6, f0: 4200 + r() * 300, am: { rate: 20, depth: 0.8 }, g: 0.7 }],
  ];
  const phraseEnds = []; // active-phrase accounting (cap 3; ceremonies bypass)
  const activePhrases = () => { const t = now(); let n = 0;
    for (let i = phraseEnds.length - 1; i >= 0; i--) { if (phraseEnds[i] > t) n++; else phraseEnds.splice(i, 1); }
    return n; };
  function playPhrase(t, syls, gainMul, pan, dest, force) {
    if (!syls || !syls.length) return 0;
    if (!force && activePhrases() >= AUD.BIRD.maxPhrases) return 0;
    let end = t;
    for (const s of syls) {
      const ts = t + s.at, g = 0.22 * gainMul * (s.g ?? 1);
      const jit = 1 + (rng() * 2 - 1) * 0.03; // live performance, not a sampler
      if (s.arch) { // 16-point arch contour (up to peak at 60%, back down)
        const c = new Float32Array(16);
        for (let k = 0; k < 16; k++) { const p = k / 15;
          c[k] = s.f0 * jit * (p < 0.6 ? 0.85 + (s.arch - 0.85) * (p / 0.6) : s.arch - (s.arch - 0.90) * ((p - 0.6) / 0.4)); }
        tone(ts, { f0: s.f0 * jit, curve: c, dur: s.dur, atk: 0.005, gain: g, tau: s.dur / 2.5,
          pan, hp: s.lp ? 0 : 1200, lp: s.lp, dest, sendAmt: 0.18, name: 'bird',
          vib: s.vib ? { rate: s.vib.rate, depth: s.f0 * s.vib.depth } : undefined,
          am: s.am ? { rate: s.am.rate, depth: s.am.depth } : undefined });
      } else if (s.noise) {
        burst(ts, { buf: 'PINK', dur: s.dur, bp: s.f0, q: 2, gain: g, atk: 0.01, pan, dest, name: 'bird' });
      } else {
        tone(ts, { f0: s.f0 * jit, f1: (s.f1 || s.f0) * jit, exp: true, dur: s.dur, atk: 0.005,
          gain: g, tau: s.dur / 2.5, pan, hp: s.lp ? 0 : 1200, lp: s.lp, dest, sendAmt: 0.18, name: 'bird',
          vib: s.vib ? { rate: s.vib.rate, depth: s.f0 * s.vib.depth } : undefined,
          am: s.am ? { rate: s.am.rate, depth: s.am.depth } : undefined });
      }
      end = Math.max(end, ts + s.dur + 0.3);
    }
    phraseEnds.push(end);
    return end - t;
  }
  function scheduleAnswerBird(t, pan) { // interlude: after every 10th seedling, p=0.6
    if (rng() >= 0.6) return;
    const healthy = []; for (let z = 1; z <= 14; z++) if (zoneHealth[z] > 0.5 && MOTIF[z]) healthy.push(z);
    const z = healthy.length ? healthy[(rng() * healthy.length) | 0] : ZONE.EWE_BENCH;
    if (MOTIF[z]) playPhrase(t, MOTIF[z](rng), 0.12 / 0.22, clamp(pan, -0.85, 0.85), bus.birds, true);
  }

  // zone health: amortized map scan (8 rows/frame) + incremental zoneStats for burning
  const NZ = 15;
  const zoneHealth = new Float32Array(NZ);
  const zoneMuted = new Uint8Array(NZ);   // gated out (burning/ceded); re-entry when state improves
  const zc = [];                          // zone centroids for pan + west->east roll-call order
  let zScanY = 0, zAcc = null;
  function ensureCentroids() {
    if (zc.length || !simRef) return;
    const sums = reps(NZ, () => ({ x: 0, y: 0, n: 0 }));
    for (let y = 0; y < GRID; y += 2) for (let x = 0; x < GRID; x += 2) {
      const z = simRef.zoneId[y * GRID + x]; if (z) { sums[z].x += x; sums[z].y += y; sums[z].n++; }
    }
    for (let z = 0; z < NZ; z++) zc[z] = sums[z].n ? { x: sums[z].x / sums[z].n, y: sums[z].y / sums[z].n } : { x: GRID / 2, y: GRID / 2 };
  }
  function scanZones() { // spec §9.3 HEALTH weights; regrown (1.0) sings MORE than never-burned (0.7)
    if (!simRef) return;
    if (!zAcc) zAcc = { w: new Float32Array(NZ), n: new Float32Array(NZ) };
    const W_SCAR = [0.05, 0.35, 0.60, 1.00]; // black, fireweed, shrub, thicket-planted
    for (let r = 0; r < 8; r++) {
      const y = zScanY;
      for (let x = 0; x < GRID; x++) {
        const i = y * GRID + x, z = simRef.zoneId[i], f = simRef.fuel[i];
        if (!z) continue;
        if (f === FUEL.SCAR) { zAcc.w[z] += W_SCAR[simRef.regrow[i]]; zAcc.n[z]++; }
        else if (F_BURNABLE[f]) { zAcc.w[z] += 0.70; zAcc.n[z]++; }
      }
      zScanY = (zScanY + 1) % GRID;
      if (zScanY === 0) { // sweep complete: commit
        for (let z = 1; z < NZ; z++) zoneHealth[z] = zAcc.n[z] ? zAcc.w[z] / zAcc.n[z] : 0;
        zAcc = null; break;
      }
    }
  }
  const nextCall = new Float64Array(NZ);
  let matrixNext = 0;
  function pumpBirds(until) {
    if (!simRef || !lastView) return;
    if (scene === 'title' || scene === 'ledger' || scene === 'snow') return;
    ensureCentroids();
    const t = now();
    const night = lastView.phase === 'NIGHT';
    const camx = lastView.wardenPos ? lastView.wardenPos.x : GRID / 2;
    const camy = lastView.wardenPos ? lastView.wardenPos.y : GRID / 2;
    for (let z = 1; z < NZ; z++) {
      const burning = simRef.zoneStats(z).burning > 0, ceded = cededSet.has(z);
      if (burning || ceded) {
        if (!zoneMuted[z]) { zoneMuted[z] = 1; rec('birdDropout:' + z, t); } // dropout is load-bearing
        nextCall[z] = 0; continue;
      }
      if (zoneMuted[z]) { if (zoneHealth[z] > 0.02) zoneMuted[z] = 0; else continue; }
      const h = zoneHealth[z];
      if (h <= 0.02 || !MOTIF[z]) continue;
      let cpm = Math.min(AUD.BIRD.cpmCap, AUD.BIRD.cpmK * Math.pow(h, AUD.BIRD.cpmExp));
      if (night) { if (h < 0.6) continue; cpm /= AUD.BIRD.owlDiv; } // songbirds sleep; owls keep the meter
      const dist = Math.hypot(zc[z].x - camx, zc[z].y - camy);
      if (dist > AUD.BIRD.radius) { nextCall[z] = 0; continue; }
      if (!nextCall[z] || nextCall[z] < t - 5) nextCall[z] = t + rng() * (60 / cpm);
      const g = (0.5 / (1 + (dist / AUD.BIRD.distD) ** 2)) / 0.22;
      const pan = clamp(panWorld(zc[z].x, zc[z].y), -0.85, 0.85);
      while (nextCall[z] < until) {
        if (night) playOwl(nextCall[z], pan, AUD.BIRD.owlGain / 0.22);
        else playPhrase(nextCall[z], MOTIF[z](rng), g, pan, bus.birds, false);
        nextCall[z] += -Math.log(1 - rng()) * (60 / cpm);
      }
    }
    // matrix bed: the unzoned slope hums along quietly (generic chickadee/junco)
    if (!night) {
      if (!matrixNext || matrixNext < t - 5) matrixNext = t + rng() * 8;
      while (matrixNext < until) {
        playPhrase(matrixNext, MATRIX_MOTIF[(rng() * 2) | 0](rng), 0.7, rng() * 1.4 - 0.7, bus.birds, false);
        matrixNext += -Math.log(1 - rng()) * 7;
      }
    }
  }
  function playOwl(t, pan, g) { // double hoot, LP'd — health audible at night, sparser and lower
    for (const dt of [0, 0.40]) {
      const c = new Float32Array(16);
      for (let k = 0; k < 16; k++) { const p = k / 15;
        c[k] = AUD.BIRD.owlF * (p < 0.5 ? 0.95 + 0.05 * (p / 0.5) : 1.0 - 0.05 * ((p - 0.5) / 0.5)); }
      tone(t + dt, { f0: AUD.BIRD.owlF, curve: c, dur: 0.18, atk: 0.02, gain: 0.22 * g, tau: 0.08,
        pan, lp: 900, dest: bus.birds, name: 'owl' });
    }
    phraseEnds.push(t + 0.8);
  }
  // SACRIFICE ceremony (canon-final §9, binding): squelch + template line (content's) +
  // the zone's signature phrase ONCE as it dies -> 300 ms gate-out. NO minor chord, NO woodblock.
  function setCeded(zoneIds) {
    const added = [];
    for (const z of zoneIds) if (!cededSet.has(z)) added.push(z);
    cededSet = new Set(zoneIds);
    if (!unlocked) return;
    for (const z of added) {
      const t = now() + 0.02;
      ensureCentroids();
      squelch(t);
      const pan = zc[z] ? clamp(panWorld(zc[z].x, zc[z].y), -0.85, 0.85) : 0;
      duck(['wind', 'fire', 'bugs', 'verbs', 'music'], -9, 0.6, 1.2, 2.6); // the world steps back to listen
      const durS = MOTIF[z] ? playPhrase(t + 0.45, MOTIF[z](rng), 0.4 / 0.22, pan, bus.birds, true) : 0;
      zoneMuted[z] = 1; // the stem gates out (300 ms handled by the scheduler simply never re-arming)
      if (cedeN) { cedeN.g.gain.setTargetAtTime(0, t, 0.05); cedeN.osc.stop(t + 0.4); cedeN = null; }
      rec('sacrifice:' + (ZONE_NAMES[z] || z), t);
      // 300 ms gate-out AFTER the phrase: a static click-off closes the channel
      burst(t + 0.45 + durS + 0.2, { buf: 'WHITE', dur: 0.02, bp: 1800, q: 1.2, gain: 0.2, dest: bus.ui, name: 'gateOut' });
    }
  }
  // Ledger roll-call (spec §9.6): west -> east, one voice or one absence tick per zone.
  // The sacrificed zones are COUNTED — silence with a timestamp.
  function rollCall(healths) {
    if (!unlocked) return 0;
    ensureCentroids();
    const t0 = now() + 0.2;
    const order = [];
    for (let z = 1; z < NZ; z++) if (MOTIF[z]) order.push(z); // stemless zones (Far Bank) are haze, not counted
    order.sort((a, b) => (zc[a] ? zc[a].x : 0) - (zc[b] ? zc[b].x : 0));
    order.forEach((z, i) => {
      const t = t0 + i * AUD.BIRD.rollStep;
      const h = healths ? (healthOf(healths, z) ?? zoneHealth[z]) : zoneHealth[z];
      const pan = clamp(((zc[z] ? zc[z].x : GRID / 2) / GRID) * 1.6 - 0.8, -0.8, 0.8);
      if (h > 0 && MOTIF[z] && !cededSet.has(z))
        playPhrase(t, MOTIF[z](rng), AUD.BIRD.rollGain / 0.22, pan, bus.birds, true);
      else
        tone(t, { f0: AUD.BIRD.tickHz, dur: 0.03, gain: AUD.BIRD.tickGain, pan, dest: bus.birds, name: 'absenceTick' });
    });
    return order.length * AUD.BIRD.rollStep + 0.6;
  }
  const healthOf = (h, z) => (h instanceof Map) ? h.get(z) : (Array.isArray(h) ? h[z] : h[z]);

  // ---------------------------------------------------------------- GRANDMOTHER (canon §6: 20 s inbound)
  // The loudest thing in the game — structurally (gma bus 1.6 into the limiter).
  let gmaActive = null;
  function grandmother(startTick, dropTick, vec) {
    if (!unlocked) return;
    const t0 = Math.max(now() + 0.05, ctxTimeOf(startTick));
    const tD = Math.max(t0 + 1, ctxTimeOf(dropTick)); // pitch-through lands EXACTLY at the drop tick
    const panFrom = vec ? panWorld(vec.x0, vec.y0) : -0.7;
    const panTo = vec ? panWorld(vec.x1, vec.y1) : 0.7;
    const master = ctx.createGain(); master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(dB(-40), t0 + 0.1);
    master.gain.exponentialRampToValueAtTime(dB(-8), tD);          // 20 s build: -40 -> -8 dB
    master.gain.exponentialRampToValueAtTime(dB(-40), tD + 8);     // recede
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(AUD.GMA.lpFar, t0);
    lp.frequency.exponentialRampToValueAtTime(AUD.GMA.lpNear, tD); // distance opens the airframe
    lp.frequency.exponentialRampToValueAtTime(AUD.GMA.lpFar, tD + 8);
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(panFrom, t0);
    pan.pan.linearRampToValueAtTime(panTo, tD + 6);                // pan along the drop vector
    lp.connect(master); master.connect(pan); pan.connect(bus.gma); send(pan, 0.30);
    const oscs = [];
    for (const base of [AUD.GMA.fA, AUD.GMA.fB]) { // twin detuned saws through 3 bandpasses: prop growl, not jet
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(base * st(2), t0);                 // approach: +2 -> +4 st glide up
      o.frequency.exponentialRampToValueAtTime(base * st(AUD.GMA.upSt), tD);
      o.frequency.exponentialRampToValueAtTime(base * st(AUD.GMA.upSt - AUD.GMA.downSt), tD + AUD.GMA.downSec);
      const og = ctx.createGain(); og.gain.value = 0.5; o.connect(og);
      for (const fc of AUD.GMA.formants) {
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fc; bp.Q.value = 1.8;
        og.connect(bp); bp.connect(lp);
      }
      o.start(t0); o.stop(tD + 10); oscs.push(o);
    }
    // airframe rattle: AM noise at 11 Hz, final 3 s of the run-in
    const rt = ctx.createBufferSource(); rt.buffer = buffers.WHITE; rt.loop = true;
    const rlp = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 3000;
    const rg = ctx.createGain(); rg.gain.setValueAtTime(0, t0);
    rg.gain.setTargetAtTime(0.12, tD - AUD.GMA.rattleSec, 0.4);
    rg.gain.setTargetAtTime(0, tD + 0.5, 0.5);
    const rlfo = ctx.createOscillator(); rlfo.frequency.value = 11;
    const rlg = ctx.createGain(); rlg.gain.value = 0.09; rlfo.connect(rlg); rlg.connect(rg.gain);
    rt.connect(rlp); rlp.connect(rg); rg.connect(pan);
    rt.start(t0); rt.stop(tD + 2); rlfo.start(t0); rlfo.stop(tD + 2);
    // sidechain hook (task-binding): ALL other buses -8 dB, 200 ms attack / 1.2 s release.
    // emberBus stays exempt — the chime outranks even her (clarity law 5, acceptance test 4).
    const victims = Object.keys(AUD.BUS).filter((n) => n !== 'gma' && n !== 'embers');
    const dt = Math.max(0, tD - 8 - now());
    if (dt < 0.05) duck(victims, AUD.GMA.duckDb, AUD.GMA.duckAtk, AUD.GMA.duckRel, (tD + 4) - now());
    else gmaActive = { duckAt: tD - 8, victims, until: tD + 4 };
    rec('grandmother', t0);
  }
  function onRetardantDrop(e) { // curtain + rumble ride the sim's own drop event (one truth)
    const t = now() + 0.03;
    const c = AUD.GMA.curtain;
    burst(t, { buf: 'WHITE', dur: c.sec, lp: c.lpFrom, lpTo: c.lpTo, gain: c.gain, atk: 0.3,
      hold: c.sec * 0.55, tau: 0.5, pan: 0, dest: bus.gma, name: 'curtain' }); // hiss becoming weight
    tone(t, { f0: AUD.GMA.rumbleHz, dur: AUD.GMA.rumbleSec, gain: 0.32, atk: 0.1, tau: 0.5, dest: bus.gma, name: 'rumble' });
    burst(t + 0.2, { buf: 'BROWN', dur: 1.4, lp: 300, gain: 0.2, atk: 0.2, dest: bus.gma });
  }

  // ---------------------------------------------------------------- THEME "the watch" (spec §15)
  // 6-bar loop (<8 bars, task-binding): 4 melody bars + 2 bars of wind — the gap is the point.
  // NEVER during fires; title / ledger / epilogue only.
  const THEME_BARS = [
    { lead: [[NOTE.A3, 2], [NOTE.D4, 1], [NOTE.E4, 1]], chord: 'D' },
    { lead: [[NOTE.Fs4, 3], [NOTE.E4, 1]], chord: 'D' },
    { lead: [[NOTE.G4, 2], [NOTE.Fs4, 1], [NOTE.E4, 1]], chord: 'G' },
    { lead: [[NOTE.D4, 4]], chord: 'D' },
    { lead: [], chord: null }, { lead: [], chord: null },
  ];
  const THEME_CHORDS = { D: [NOTE.D3, NOTE.Fs3, NOTE.A3], G: [NOTE.G3, NOTE.B3, NOTE.D4] };
  const THEME_BASS = { D: NOTE.D3 / 2, G: NOTE.G2 };
  const BEAT = 60 / 66, BAR = BEAT * 4;
  let themeNextBar = 0, themeBarIdx = 0;
  function pumpTheme(until) {
    if (scene !== 'title' && scene !== 'ledger' && scene !== 'epilogue') { themeNextBar = 0; return; }
    const t = now();
    if (!themeNextBar || themeNextBar < t - BAR) { themeNextBar = t + 0.1; themeBarIdx = 0; }
    while (themeNextBar < until + BAR * 0.5) {
      const bar = THEME_BARS[themeBarIdx % 6], tB = themeNextBar;
      const ledger = scene === 'ledger', epi = scene === 'epilogue';
      const trim = ledger ? dB(-8) : 1;
      if (bar.chord) {
        // pad: two saws detuned, LP 1.8k — whole-bar chords
        for (const f of THEME_CHORDS[bar.chord]) for (const cents of [-6, 6])
          tone(tB, { type: 'sawtooth', f0: f * Math.pow(2, cents / 1200), dur: BAR, atk: 0.3,
            gain: 0.10 * trim, tau: 0.8, lp: 1800, dest: bus.music, sendAmt: 0.22, name: 'pad' });
        tone(tB, { f0: THEME_BASS[bar.chord], dur: BAR, atk: 0.05, gain: 0.14 * trim, tau: 1.0, dest: bus.music });
      }
      if (!ledger) { // lead rests at the ledger; the roll-call sits where it would sing
        let bt = 0;
        for (const [f, beats] of bar.lead) {
          tone(tB + bt * BEAT, { type: 'triangle', f0: f, dur: beats * BEAT * 0.95, atk: 0.01,
            gain: 0.16, tau: 0.3, dest: bus.music, sendAmt: 0.22, name: 'lead' });
          if (epi) tone(tB + bt * BEAT, { type: 'triangle', f0: f * st(-9), dur: beats * BEAT * 0.95,
            atk: 0.01, gain: 0.13, tau: 0.3, dest: bus.music, sendAmt: 0.22 }); // doubled 6ths: spring, bigger once
          bt += beats;
        }
      }
      themeNextBar += BAR; themeBarIdx++;
    }
  }

  // ---------------------------------------------------------------- SNOW layer (spec §17.5)
  let snowN = null, snowNextTick = 0;
  function pumpSnow(until) {
    if (scene !== 'snow') { if (snowN) { snowN.g.gain.setTargetAtTime(0, now(), 2); } return; }
    if (!snowN) {
      const src = ctx.createBufferSource(); src.buffer = buffers.WHITE; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(lp); lp.connect(g); g.connect(bus.wind); src.start();
      snowN = { g };
    }
    snowN.g.gain.setTargetAtTime(0.03, now(), 3); // the soft white blanket
    if (!snowNextTick || snowNextTick < now() - 2) snowNextTick = now();
    while (snowNextTick < until) { // settling snow: sparse, tiny, everywhere
      burst(snowNextTick, { buf: 'WHITE', dur: 0.003, bp: 5000, q: 2, gain: 0.04,
        pan: rng() * 2 - 1, dest: bus.wind, name: 'snowTick' });
      snowNextTick += -Math.log(1 - rng()) / 0.15;
    }
  }

  // ---------------------------------------------------------------- scenes / frame / pump
  function applyScene(s) {
    scene = s;
    if (!unlocked) return;
    const t = now();
    // snow: everything gently lowpassed over 10 s; the season ends by subtraction
    const lpTarget = s === 'snow' ? 2600 : (lastView && lastView.phase === 'NIGHT' ? 12000 : 18000);
    sceneLP.frequency.setTargetAtTime(lpTarget, t, s === 'snow' ? 3.5 : 0.7);
    if (droneN && s !== 'fire' && s !== 'rx') droneN.g.gain.setTargetAtTime(0, t, 0.3);
    applyDucks();
    rec('scene:' + s, t);
  }
  const evQ = [];
  function attach(sim) {
    simRef = sim;
    sim.onEvent((e) => { if (unlocked) evQ.push(e); else if (e.type === 'emberCast') onEmberCast(e); });
  }
  function drainEvents() {
    for (const e of evQ) {
      switch (e.type) {
        case 'gust': onGust(e.peakMph); break;
        case 'emberCast': onEmberCast(e); break;
        case 'emberCatch': onEmberCatch(e); break;
        case 'emberFizzle': onEmberFizzle(e); break;
        case 'ignition': // burst only for ember-born fires: front ignitions are the crackle's job
          if (recentCatch.has(e.cell)) { recentCatch.delete(e.cell); ignitionBurst(now() + 0.02, cellPan(e.cell)); }
          break;
        case 'drip': onDrip(e); break;
        case 'dripIgnite': onDripIgnite(e); break;
        case 'stomp': stompSound(e.cells, lastView && lastView.wardenPos
          ? panWorld(lastView.wardenPos.x, lastView.wardenPos.y) : 0); break;
        case 'retardantDrop': onRetardantDrop(e); break;
        case 'backburnEscaped': onEscape(); break;
        case 'backburnStarved': onStarve(); break;
        case 'propanePop': // PROVISIONAL: one hard pop; the structure key carries no cell
          tone(now() + 0.02, { f0: 70, dur: 0.15, gain: 0.4, tau: 0.08, dest: bus.verbs, name: 'propanePop' });
          burst(now() + 0.02, { buf: 'WHITE', dur: 0.05, bp: 1200, q: 0.8, gain: 0.3, dest: bus.verbs });
          break;
        // structureThreatened/Ignited/Lost/Held, crownTransition, cellBurnout: the radio
        // and the crackle field already speak for these — no extra stingers (law 8).
      }
    }
    evQ.length = 0;
  }
  let fieldNext = 0, schedMs = 0, lastPhase = 'DAY';
  function frame(view) {
    if (!unlocked) return;
    const p0 = (typeof performance !== 'undefined') ? performance.now() : 0;
    lastView = view;
    if (view.scene && view.scene !== scene) applyScene(view.scene);
    if (view.phase && view.phase !== lastPhase) { lastPhase = view.phase; applyScene(scene); } // night mix follows dusk
    if (view.sim) {
      anchor = { ctxT: now(), tick: view.sim.tick };
      if (view.sim !== simRef) simRef = view.sim;
    }
    drainEvents();
    if (!windN) buildWind();
    if (!roarN) buildRoar();
    if (!bugN && scene !== 'title' && scene !== 'ledger' && scene !== 'snow') buildBugs();
    updateWind();
    const t = now();
    if (t >= fieldNext) { fieldNext = t + AUD.FIRE.fieldMs / 1000; scanField(); updateLocalFuel(); }
    scanZones();
    pumpShimmers();
    updateDrone();
    if (gmaActive && t >= gmaActive.duckAt) {
      duck(gmaActive.victims, AUD.GMA.duckDb, AUD.GMA.duckAtk, AUD.GMA.duckRel, gmaActive.until - t);
      gmaActive = null;
    }
    if (p0) schedMs = ((typeof performance !== 'undefined') ? performance.now() : 0) - p0;
  }
  let pumpTimer = null;
  function pump() { // the one 25 ms lookahead scheduler for everything granular
    if (!unlocked) return;
    const until = now() + AUD.SCHED.horizon;
    pumpCrackle(until);
    pumpCutBed(until);
    pumpBugs(until);
    pumpBirds(until);
    pumpTheme(until);
    pumpSnow(until);
    applyDucks();
  }

  // ---------------------------------------------------------------- public surface (interfaces.md C)
  return {
    unlock,
    frame,
    attach,
    setScene: applyScene,
    setCeded,
    grandmother,          // (startTick, dropTick, vec? {x0,y0,x1,y1}) — vec is an optional extension
    radioKey,
    typeTick,
    chord: (name) => chordPlay(name),
    ui: uiSound,          // 'cedeTick','cedeSwell','cedeCancel','stompThud','stompFizzle','scuff',
                          // 'rakeSet','sizzle','plant','truck','radioTick','dateStamp' (+ {x,y|pan,cells})
    cutTick,              // extension: {fuel, dragSpeed01, x, y} once per cell converted (bed + BITE)
    rollCall,             // extension: ledger roll-call; returns its duration in seconds
    eventLog: () => log.slice(),
    setMaster: (v) => { if (masterGain) masterGain.gain.setTargetAtTime(clamp01(v), now(), 0.05); },
    setBusGain: (name, v) => { if (bus[name]) { userGain[name] = clamp01(v); applyDucks(); } },
    buses: bus,
    state: () => ({ // debug/test window — not part of the module contract
      ctxTime: now(), schedMs, scene,
      windCutoffHz: windN ? windN.bedLP.frequency.value : 0,
      windPan: windN ? windN.bedPan.pan.value : 0,
      windGain: windN ? windN.bedG.gain.value : 0,
      grainRate: Math.min(AUD.FIRE.grainMax, AUD.FIRE.grainK * Math.sqrt(field.I)),
      crownRoarGain: roarN ? roarN.roarG.gain.value : 0,
      bugs: bugN ? { carrierHz: bugN.v[0].osc.frequency.value, dEff: bugN.dEff } : null,
      birds: { activePhrases: activePhrases(), zoneHealth: Array.from(zoneHealth) },
      backburnRisk: field.risk,
      busGains: Object.fromEntries(Object.entries(bus).map(([n, b]) => [n, b.gain.value])),
    }),
  };
}
