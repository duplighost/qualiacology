// FINALE — AUDIO. 100% procedural WebAudio, zero sample files, zero network fetches.
// Identity: a marching band possessed by a fireworks show. Low taiko/timpani booms, brass stabs,
// bell/celesta shimmer, and a 4-on-the-floor kick that exists ONLY during bosses. D minor -> D dorian.
//
// TWO HARD RULES IN THIS FILE:
//   1. THE FUSE WHISTLE ALWAYS WINS. It is the only audio cue for the core mechanic. Music ducks for
//      it, it is panned to the enemy's screen x, and if more than 6 windows are open we keep the 6
//      NEAREST THE PLAYER and make them LOUDER. A missed whistle is a missed window is a dead run.
//   2. EVERY PUBLIC METHOD MUST BE A SAFE NO-OP WHEN THERE IS NO AudioContext. Headless smoke tests
//      run with audio blocked/muted and call these from every corner of the engine. A throw here
//      does not "break the sound" — it breaks the whole game.
window.AUDIO = (() => {
  'use strict';

  const PLAY_W = (window.CFG && CFG.W) || 1280;      // pan space width; matches the fixed canvas
  const mkStream = (window.U && U.makeStream)        // independent RNG — must NEVER touch U.rngRun,
    ? U.makeStream                                    // or seeded gameplay stops reproducing
    : (seed) => { let s = seed >>> 0 || 1; return { next() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; } }; };

  // ---------------------------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------------------------
  let ctx = null;            // null until init() succeeds. EVERY method checks this.
  let failed = false;        // construction threw / unsupported. Never retry, never throw again.
  let muted = false;
  let running = false;       // a run is live (music scheduler ticking)

  let master = null, duckAll = null, comp = null;
  let busSFX = null, busMusic = null, busCrowd = null, musicDuck = null;
  let conv = null, convWet = null;
  let noiseBuf = null;

  let volMaster = 0.85, volMusic = 0.80, volSFX = 0.90;   // graph gains per spec 9.1

  // ---------------------------------------------------------------------------------------------
  // BOOT-TIME BUFFERS  (synthesized once; NOTHING is fetched)
  // ---------------------------------------------------------------------------------------------

  // Sky reverb IR: 1.6s stereo white noise * exp(-4.2t), hand-rolled one-pole lowpass (coef 0.35),
  // two independent RNG streams so L/R decorrelate into an actual stereo image instead of mono mush.
  function buildIR() {
    const sr = ctx.sampleRate;
    const len = (1.6 * sr) | 0;                      // 1.6s: an open-air stadium tail, not a cathedral
    const buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      const rng = mkStream(c === 0 ? 0x0A53F9C1 : 0x051E77B3);   // 2 streams = stereo decorrelation
      let z = 0;
      for (let i = 0; i < len; i++) {
        const n = (rng.next() * 2 - 1) * Math.exp(-4.2 * (i / sr));   // -4.2 => ~-36dB by 1.6s
        z += 0.35 * (n - z);                          // one-pole LP: kills the fizz, keeps the size
        d[i] = z;
      }
    }
    return buf;
  }

  // 2s of white noise, reused by every noise voice at a random offset. Building noise per-shot would
  // allocate a fresh AudioBuffer dozens of times a second during a cascade.
  function buildNoise() {
    const sr = ctx.sampleRate;
    const len = (2 * sr) | 0;                        // 2s: long enough that loop points are inaudible
    const b = ctx.createBuffer(1, len, sr);
    const d = b.getChannelData(0);
    const rng = mkStream(0x07F4A2C9);
    for (let i = 0; i < len; i++) d[i] = rng.next() * 2 - 1;
    return b;
  }

  // ---------------------------------------------------------------------------------------------
  // VOICE POOL — 24 concurrent one-shots, steal-oldest.
  // PAD, crowd and whistles are NOT pooled: they are sustained and must never be stolen.
  // ---------------------------------------------------------------------------------------------
  const VOICE_CAP = 24;                              // spec 9.1 budget; __FINALE.assert() checks <= 24
  const voices = new Array(VOICE_CAP);
  for (let i = 0; i < VOICE_CAP; i++) {
    voices[i] = { used: false, start: 0, end: 0, out: null, srcs: new Array(4), ns: 0 };
  }
  let voiceCount = 0;

  function releaseVoice(v) {
    for (let i = 0; i < v.ns; i++) v.srcs[i] = null;
    v.ns = 0; v.used = false; v.out = null; voiceCount--;
  }

  function pruneVoices(now) {
    for (let i = 0; i < VOICE_CAP; i++) {
      const v = voices[i];
      if (v.used && v.end <= now) releaseVoice(v);
    }
  }

  function hardStop(v, now) {
    try {
      v.out.gain.cancelScheduledValues(now);
      v.out.gain.setTargetAtTime(0.0001, now, 0.004);  // 4ms: fast enough to steal, slow enough to not click
    } catch (e) { /* node already torn down */ }
    for (let i = 0; i < v.ns; i++) { try { v.srcs[i].stop(now + 0.02); } catch (e) { /* not started */ } }
    releaseVoice(v);
  }

  // Returns a voice whose .out is a fresh GainNode already wired to `bus`, or null if the graph is down.
  function alloc(t, dur, bus) {
    if (!ctx) return null;
    const now = ctx.currentTime;
    pruneVoices(now);
    let v = null;
    for (let i = 0; i < VOICE_CAP; i++) if (!voices[i].used) { v = voices[i]; break; }
    if (!v) {                                        // steal OLDEST: newest sounds are the informative ones
      let oldest = voices[0];
      for (let i = 1; i < VOICE_CAP; i++) if (voices[i].used && voices[i].start < oldest.start) oldest = voices[i];
      hardStop(oldest, now);
      v = oldest;
    }
    v.used = true; v.start = t; v.end = t + dur; v.ns = 0; voiceCount++;
    const g = ctx.createGain();
    g.gain.value = 1;
    g.connect(bus || busSFX);
    v.out = g;
    return v;
  }

  function track(v, src) { if (v.ns < 4) v.srcs[v.ns++] = src; }

  // A one-shot noise source at a random offset into the shared buffer.
  let noisePhase = 0.137;
  function noiseSrc(t) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    noisePhase = (noisePhase * 7.13 + 0.31) % 1;     // cheap deterministic offset walk, no RNG call
    try { s.start(t, noisePhase * 1.8); } catch (e) { try { s.start(t); } catch (e2) { } }
    return s;
  }

  function panFor(x) {
    let p = (x / PLAY_W) * 2 - 1;
    if (p > 0.85) p = 0.85;                          // never hard-pan: a fully-left cue reads as "outside the game"
    if (p < -0.85) p = -0.85;
    return p;
  }

  // StereoPannerNode is not universal; fall back to a plain pass-through gain so nothing throws.
  function panner(x) {
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = panFor(x); return p; }
    return ctx.createGain();
  }

  // extra convolver send for the few sounds that want to sit far back in the sky
  function verbSend(node, amt) {
    if (!conv) return;
    const g = ctx.createGain();
    g.gain.value = amt;
    node.connect(g); g.connect(conv);
  }

  // ---------------------------------------------------------------------------------------------
  // MUSICAL MATERIAL
  // ---------------------------------------------------------------------------------------------
  const ROOT_MIDI = 38;                              // D2 — low enough for taiko weight, not sub-mud
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Act key centres, spec 9.2. Note F lydian and D dorian are the SAME pitch set — the difference is
  // where the chords sit, which is what KEY_CHORD_OFF encodes, over an unmoving D pedal in the BOOM.
  const SCALES = [
    [0, 2, 3, 5, 7, 8, 10],   // 0 — D natural minor      (ACT I  THE PIER)
    [0, 2, 3, 5, 7, 9, 10],   // 1 — D dorian             (ACT II THE CRANE YARD)
    [0, 2, 3, 5, 7, 9, 10],   // 2 — F lydian / D pedal   (ACT III THE CLOUD DECK)
    [0, 2, 3, 5, 7, 9, 10],   // 3 — D dorian             (ACT IV before the turn)
    [0, 2, 4, 5, 7, 9, 11],   // 4 — D MAJOR. The only major moment in the game. Showrunner phase 5.
  ];
  const KEY_CHORD_OFF = [0, 0, 3, 0, 0];             // key 2 voices its chords a minor 3rd up (F) over D
  let key = 0;

  function degMidi(deg, oct) {
    const s = SCALES[key];
    const o = Math.floor(deg / 7);
    let d = deg % 7; if (d < 0) d += 7;
    return ROOT_MIDI + 12 * (oct + o) + s[d];
  }
  const chordOff = () => KEY_CHORD_OFF[key];

  // ---- pattern parsing (boot-time only) ----
  const P = (s) => { const a = new Uint8Array(16); for (let i = 0; i < 16; i++) a[i] = s.charCodeAt(i) === 120 ? 1 : 0; return a; };
  const D = (s) => { const a = new Int8Array(16); for (let i = 0; i < 16; i++) { const c = s.charAt(i); a[i] = c === '.' ? -1 : (c.charCodeAt(0) - 48); } return a; };
  const OFF = P('................');
  const NONE = D('................');

  // 16 steps = 2 bars of 4/4 in 1/8 notes. Every section is bar-quantised so a crossfade can only
  // ever land on a downbeat — that is what stops section changes from sounding like a skipped record.
  const SECTIONS = {
    WAVE_A: {                                        // the default march: sparse, patient, room to hear whistles
      boom: P('x.....x.x.....x.'), kick: OFF, hat: OFF,
      brass: D('....0.......4...'), bell: D('..4.......2....6'),
      pad: 1, chords: [0, 5], hatDouble: 0,
    },
    WAVE_B: {                                        // tension: hats arrive, brass climbs the scale
      boom: P('x.....x.x...x.x.'), kick: OFF, hat: P('xxxxxxxxxxxxxxxx'),
      brass: D('0...2...4...6...'), bell: D('...4...6...8...9'),
      pad: 1, chords: [0, 3], hatDouble: 0,
    },
    RALLY: {                                         // BOOM on every beat, double-time hats. No gaps, no air.
      boom: P('x.x.x.x.x.x.x.x.'), kick: OFF, hat: P('xxxxxxxxxxxxxxxx'),
      brass: D('0.......4......7'), bell: D('.4...6...8...9..'),
      pad: 1, chords: [0, 4], hatDouble: 1,
    },
    BOSS_1: {                                        // the kick exists ONLY here and below: bosses have a pulse
      boom: P('x.......x.......'), kick: P('x.x.x.x.x.x.x.x.'), hat: P('.x.x.x.x.x.x.x.x'),
      brass: D('......0.......4.'), bell: D('...2.......6....'),
      pad: 1, chords: [0, 5], hatDouble: 0,
    },
    BOSS_2: {
      boom: P('x...x...x...x...'), kick: P('x.x.x.x.x.x.x.x.'), hat: P('.x.x.x.x.x.x.x.x'),
      brass: D('0.....2.4.....6.'), bell: D('...4...7...9...9'),
      pad: 1, chords: [0, 6], hatDouble: 0,
    },
    BOSS_3: {
      boom: P('x..x..x.x..x..x.'), kick: P('x.x.x.x.x.x.x.x.'), hat: P('xxxxxxxxxxxxxxxx'),
      brass: D('0..2..4..2..0...'), bell: D('.4.6.8.9.8.6.4.2'),
      pad: 1, chords: [0, 3], hatDouble: 0,
    },
    BOSS_4: {                                        // everything at once; this is the last thing you hear
      boom: P('x.x...x.x.x...x.'), kick: P('x.x.x.x.x.x.x.x.'), hat: P('xxxxxxxxxxxxxxxx'),
      brass: D('0.2.4.6.7.6.4.2.'), bell: D('.7.9.8.7.9.8.7.9'),
      pad: 1, chords: [0, 4], hatDouble: 1,
    },
    PHASE_STING: {                                   // one bar of BOOM + BRASS in unison, nothing else
      boom: P('x.......x.......'), kick: OFF, hat: OFF,
      brass: D('0.......0.......'), bell: NONE,
      pad: 1, chords: [0, 0], hatDouble: 0,
    },
    CLEAR: {                                         // the bow. Bells and pad, no percussion driving anything.
      boom: P('x...............'), kick: OFF, hat: OFF,
      brass: D('....2.......4...'), bell: D('0.2.4.7.9.7.4.2.'),
      pad: 1, chords: [0, 3], hatDouble: 0,
    },
    DEATH: {                                         // deliberate hole in the music. The silence IS the feedback.
      boom: OFF, kick: OFF, hat: OFF, brass: NONE, bell: NONE, pad: 0, chords: [0, 0], hatDouble: 0,
    },
    SILENT: {
      boom: OFF, kick: OFF, hat: OFF, brass: NONE, bell: NONE, pad: 0, chords: [0, 0], hatDouble: 0,
    },
  };

  let section = SECTIONS.SILENT, sectionName = 'SILENT';
  let pendingName = null;                            // swapped in on the next bar boundary
  let bossPhaseCount = 0;                            // counts phase stings; drives the Showrunner key turn

  // ---------------------------------------------------------------------------------------------
  // INSTRUMENTS (spec 9.2 recipes, verbatim)
  // ---------------------------------------------------------------------------------------------

  // BOOM: sine 55Hz body, pitch env 90->45 over 90ms, amp 0->1 in 3ms, 700ms decay, + 30ms HP noise crack.
  function boom(t, gain) {
    const v = alloc(t, 0.78, busMusic); if (!v) return;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.09);   // 90ms drop = the taiko "thump into pitch"
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.003);          // 3ms attack: any slower and it stops being a hit
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.70);
    o.connect(g); g.connect(v.out);
    o.start(t); o.stop(t + 0.78); track(v, o);

    const n = noiseSrc(t);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;  // stick, not body
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(gain * 0.55, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.030);  // 30ms transient
    n.connect(hp); hp.connect(ng); ng.connect(v.out);
    n.stop(t + 0.06); track(v, n);
  }

  // BRASS: 3 saws at -7/0/+7 cents, lowpass env 400->3200->900 over 180ms Q6, ADSR 8/120/0.6/220ms.
  function brass(t, freq, gain, dur) {
    const v = alloc(t, (dur || 0.24) + 0.30, busMusic); if (!v) return;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 6;                        // Q6 is the whole "brass" illusion
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(3200, t + 0.05); // the bite
    f.frequency.exponentialRampToValueAtTime(900, t + 0.18);  // then it sits back down into the mix
    const g = ctx.createGain();
    const d = dur || 0.24;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);          // A 8ms
    g.gain.exponentialRampToValueAtTime(gain * 0.6, t + 0.128); // D 120ms -> S 0.6
    g.gain.setValueAtTime(gain * 0.6, t + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.22);  // R 220ms
    f.connect(g); g.connect(v.out);
    const cents = -7;
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = cents + i * 7;                          // -7 / 0 / +7 cents: chorus without a chorus
      o.connect(f); o.start(t); o.stop(t + d + 0.26); track(v, o);
    }
  }

  // BELL: 2-op FM. Carrier sine, modulator at ratio 3.5 (inharmonic => celesta/glockenspiel, not organ).
  function bell(t, freq, gain) {
    const v = alloc(t, 0.95, busMusic); if (!v) return;
    const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = freq;
    const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = freq * 3.5;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(freq * 8, t);                      // index 8 => a bright metallic strike
    mg.gain.exponentialRampToValueAtTime(freq * 0.001, t + 0.40); // index -> 0 over 400ms => it "settles" into a sine
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.90);
    mod.connect(mg); mg.connect(car.frequency);
    car.connect(g); g.connect(v.out);
    mod.start(t); mod.stop(t + 0.95); track(v, mod);
    car.start(t); car.stop(t + 0.95); track(v, car);
  }

  // KICK (boss sections only): sine 120->48 over 55ms, 260ms decay. The heartbeat of a boss fight.
  function kick(t, gain) {
    const v = alloc(t, 0.30, busMusic); if (!v) return;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.055);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    o.connect(g); g.connect(v.out);
    o.start(t); o.stop(t + 0.30); track(v, o);
  }

  // HAT: noise through HP 7kHz, 35ms. Pure time-keeping, no tone.
  function hat(t, gain) {
    const v = alloc(t, 0.08, busMusic); if (!v) return;
    const n = noiseSrc(t);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    n.connect(hp); hp.connect(g); g.connect(v.out);
    n.stop(t + 0.07); track(v, n);
  }

  // PAD: persistent (never pooled, never stolen). 2 saws + 1 sine sub, LP 900, 0.12Hz LFO +/-260Hz.
  let padOscA = null, padOscB = null, padSub = null, padGain = null, padFilt = null, padLfo = null;
  function buildPad() {
    padFilt = ctx.createBiquadFilter(); padFilt.type = 'lowpass'; padFilt.frequency.value = 900; padFilt.Q.value = 0.7;
    padGain = ctx.createGain(); padGain.gain.value = 0;
    padFilt.connect(padGain); padGain.connect(busMusic);
    padOscA = ctx.createOscillator(); padOscA.type = 'sawtooth'; padOscA.detune.value = -5;
    padOscB = ctx.createOscillator(); padOscB.type = 'sawtooth'; padOscB.detune.value = 6;
    padSub = ctx.createOscillator(); padSub.type = 'sine';
    padOscA.connect(padFilt); padOscB.connect(padFilt); padSub.connect(padFilt);
    padLfo = ctx.createOscillator(); padLfo.type = 'sine'; padLfo.frequency.value = 0.12;  // 8.3s cycle: breathing, not wobbling
    const lg = ctx.createGain(); lg.gain.value = 260;          // +/-260Hz around 900 => the pad "opens" on its own
    padLfo.connect(lg); lg.connect(padFilt.frequency);
    const t = ctx.currentTime;
    try { padOscA.start(t); padOscB.start(t); padSub.start(t); padLfo.start(t); } catch (e) { }
  }
  function padChord(t, rootDeg, on) {
    if (!padGain) return;
    const off = chordOff();
    const fr = midi(degMidi(rootDeg + off, 2));
    const ff = midi(degMidi(rootDeg + off + 4, 2));            // scale-fifth: stays diatonic, never fights the key
    const fs = midi(degMidi(rootDeg + off, 1));
    padOscA.frequency.setTargetAtTime(fr, t, 0.05);            // 50ms glide: chord changes slide, they don't jump
    padOscB.frequency.setTargetAtTime(ff, t, 0.05);
    padSub.frequency.setTargetAtTime(fs, t, 0.05);
    padGain.gain.setTargetAtTime(on ? 0.055 : 0.0, t, 0.25);   // 0.055: felt, not heard, under everything
  }

  // ---------------------------------------------------------------------------------------------
  // MUSIC SCHEDULER — setInterval 25ms tick, 120ms horizon. NEVER rAF: rAF stalls when the tab
  // blurs and stutters under GC, and a music clock that stutters is worse than no music at all.
  // ---------------------------------------------------------------------------------------------
  const TICK_MS = 25;
  const HORIZON = 0.12;                              // 120ms lookahead: ~5 ticks of slack
  let timer = 0, nextT = 0, step = 0;
  let bpm = 124;                                     // ACT I default
  const eighth = () => 30 / bpm;                     // 60/bpm/2 seconds per 1/8 note
  let stingUntil = 0;                                // patterns are suppressed until this ctx time

  function scheduleStep(s, t) {
    const i = s % 16;
    if (i === 0 || i === 8) {                        // bar boundary: the ONLY place a section may change
      if (pendingName && SECTIONS[pendingName]) {
        sectionName = pendingName; section = SECTIONS[pendingName]; pendingName = null;
      }
      const bar = (i === 0) ? 0 : 1;
      padChord(t, section.chords[bar], !!section.pad);
    }
    if (t < stingUntil) return;                      // phase sting owns the bar; nothing else plays over it

    const bar = i < 8 ? 0 : 1;
    const root = section.chords[bar] + chordOff();

    if (section.boom[i]) boom(t, 0.42);              // 0.42: the loudest thing in the music bed, on purpose
    if (section.kick[i]) kick(t, 0.30);
    if (section.hat[i]) {
      hat(t, 0.055);                                 // 0.055: audible groove, never masks a whistle at 0.055
      if (section.hatDouble) hat(t + eighth() * 0.5, 0.038);   // the RALLY/BOSS_4 double-time shuffle
    }
    const bd = section.brass[i];
    if (bd >= 0) brass(t, midi(degMidi(root + bd, 2)), 0.085, eighth() * 1.5);
    const ld = section.bell[i];
    if (ld >= 0) bell(t, midi(degMidi(root + ld, 4)), 0.055);  // oct 4: the shimmer sits above every SFX
  }

  function tick() {
    if (!ctx || failed) return;
    const now = ctx.currentTime;
    if (!running || muted || ctx.state !== 'running' || sectionName === 'SILENT') {
      nextT = now + 0.05;                            // keep the clock glued to the present while idle
      return;
    }
    let guard = 0;
    while (nextT < now + HORIZON && guard++ < 32) {  // guard: a stalled/suspended clock must never spin here
      scheduleStep(step, nextT);
      nextT += eighth();
      step++;
    }
    if (nextT < now) {                               // tabbed out for a while: resync ON A BAR so we never
      nextT = now;                                   // resume mid-phrase
      step = Math.ceil(step / 8) * 8;
    }
  }

  function startSched() {
    if (timer || !ctx) return;
    nextT = ctx.currentTime + 0.06;                  // 60ms of runway so the first downbeat is never late
    step = 0;
    timer = setInterval(tick, TICK_MS);
  }
  function stopSched() {
    if (timer) { clearInterval(timer); timer = 0; }
  }

  // ---------------------------------------------------------------------------------------------
  // THE FUSE WHISTLE — the most important sound in the game (spec 9.3)
  // ---------------------------------------------------------------------------------------------
  const WH_CAP = 6;                                  // 6 simultaneous: past this the ear stops separating them
  const WH_GAIN = 0.055;                             // normal level
  const WH_GAIN_BOOST = 0.075;                       // when windows are being dropped, the survivors get louder
  const WH_DEFAULT_DUR = 0.9;                        // boss nodes pass {x,id} with no fuseMax; 0.9s matches them
  const whistles = new Array(WH_CAP);
  for (let i = 0; i < WH_CAP; i++) {
    whistles[i] = { busy: false, id: null, x: 0, endT: 0, osc: null, gain: null, pan: null };
  }
  let whBoost = false;
  let whActive = 0;

  function playerX() {
    const P2 = window.Player && Player.p;
    return P2 ? P2.x : PLAY_W * 0.5;
  }

  function whStop(w, now, fast) {
    if (!w.busy) return;
    const g = w.gain, o = w.osc;
    if (g) {
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0.0001, now + (fast ? 0.020 : 0.060));  // 60ms release per spec
      } catch (e) { }
    }
    if (o) { try { o.stop(now + (fast ? 0.03 : 0.08)); } catch (e) { } }
    w.busy = false; w.id = null; w.osc = null; w.gain = null; w.pan = null;
    whActive--;
    if (whActive < 0) whActive = 0;
  }

  function whSetBoost(on) {
    if (whBoost === on || !ctx) return;
    whBoost = on;
    const now = ctx.currentTime, lvl = on ? WH_GAIN_BOOST : WH_GAIN;
    for (let i = 0; i < WH_CAP; i++) {
      const w = whistles[i];
      if (!w.busy || !w.gain) continue;
      try {
        w.gain.gain.cancelScheduledValues(now);
        w.gain.gain.setValueAtTime(w.gain.gain.value, now);
        w.gain.gain.linearRampToValueAtTime(lvl, now + 0.04);
        w.gain.gain.setValueAtTime(lvl, Math.max(now + 0.04, w.endT - 0.06));
        w.gain.gain.linearRampToValueAtTime(0.0001, w.endT);
      } catch (e) { }
    }
  }

  // busMusic ducks to 0.72 whenever >= 1 whistle is live. 40ms attack / 180ms release.
  function updateDuck() {
    if (!musicDuck || !ctx) return;
    const now = ctx.currentTime;
    const want = whActive > 0 ? 0.72 : 1.0;
    if (Math.abs(musicDuck.gain.value - want) < 0.001) return;
    try {
      musicDuck.gain.cancelScheduledValues(now);
      musicDuck.gain.setValueAtTime(musicDuck.gain.value, now);
      musicDuck.gain.linearRampToValueAtTime(want, now + (want < 1 ? 0.040 : 0.180));
    } catch (e) { }
  }

  function whStart(w, e, dur, now) {
    const lvl = whBoost ? WH_GAIN_BOOST : WH_GAIN;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(380, now);
    o.frequency.exponentialRampToValueAtTime(1250, now + dur);  // rising = a countdown you can hear
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = 1;   // takes the glassy edge off the top end
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(lvl, now + 0.012);            // 12ms: instant, but no click
    g.gain.setValueAtTime(lvl, now + Math.max(0.02, dur - 0.06));
    g.gain.linearRampToValueAtTime(0.0001, now + dur);           // out over the last 60ms
    const p = panner(e.x || 0);
    o.connect(lp); lp.connect(g); g.connect(p); p.connect(busSFX);
    o.start(now); try { o.stop(now + dur + 0.10); } catch (er) { }
    w.busy = true; w.id = e.id; w.x = e.x || 0; w.endT = now + dur;
    w.osc = o; w.gain = g; w.pan = p;
    whActive++;
  }

  // ---------------------------------------------------------------------------------------------
  // CROWD (spec 9.5) — continuous bandpassed noise, gain by applause tier.
  // ---------------------------------------------------------------------------------------------
  const CROWD_TIER_GAIN = [0.02, 0.06, 0.12, 0.20, 0.32];   // QUIET / WARM / LOUD / ROAR / FINALE
  let crowdSrc = null, crowdBP = null, crowdGain = null;
  let swellSrc = null, swellBP = null, swellGain = null;
  let crowdTier = 0, swellT = 2.0, crowdHushT = 0;

  function buildCrowd() {
    crowdBP = ctx.createBiquadFilter(); crowdBP.type = 'bandpass';
    crowdBP.frequency.value = 900; crowdBP.Q.value = 0.8;     // 900Hz Q0.8 = the vowel band of a distant crowd
    crowdGain = ctx.createGain(); crowdGain.gain.value = CROWD_TIER_GAIN[0];
    crowdSrc = ctx.createBufferSource(); crowdSrc.buffer = noiseBuf; crowdSrc.loop = true;
    crowdSrc.connect(crowdBP); crowdBP.connect(crowdGain); crowdGain.connect(busCrowd);

    swellBP = ctx.createBiquadFilter(); swellBP.type = 'bandpass';
    swellBP.frequency.value = 900; swellBP.Q.value = 0.8;
    swellGain = ctx.createGain(); swellGain.gain.value = 0;
    swellSrc = ctx.createBufferSource(); swellSrc.buffer = noiseBuf; swellSrc.loop = true;
    swellSrc.loopStart = 0.5;                                 // offset loop so the two beds decorrelate
    swellSrc.connect(swellBP); swellBP.connect(swellGain); swellGain.connect(busCrowd);
    const t = ctx.currentTime;
    try { crowdSrc.start(t); swellSrc.start(t, 0.9); } catch (e) { }
  }

  function crowdSwell(amt, atk, dec, f0, f1) {
    if (!swellGain || !ctx) return;
    const t = ctx.currentTime;
    try {
      swellGain.gain.cancelScheduledValues(t);
      swellGain.gain.setValueAtTime(swellGain.gain.value, t);
      swellGain.gain.linearRampToValueAtTime(amt, t + atk);
      swellGain.gain.linearRampToValueAtTime(0.0, t + atk + dec);
      swellBP.frequency.cancelScheduledValues(t);
      swellBP.frequency.setValueAtTime(f0, t);
      swellBP.frequency.linearRampToValueAtTime(f1, t + atk + dec);
    } catch (e) { }
  }

  // ---------------------------------------------------------------------------------------------
  // SFX (spec 9.4)
  // ---------------------------------------------------------------------------------------------
  let shotN = 0;                                     // only every 3rd volley sounds (spec 9.4)
  const shotEnds = new Float32Array(8);              // max 8 concurrent shot voices
  let hitFrame = 0;                                  // petal-hit budget, reset every update()

  // ---------------------------------------------------------------------------------------------
  // INIT / GRAPH
  // ---------------------------------------------------------------------------------------------
  function init() {
    if (ctx || failed) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { failed = true; return; }
      ctx = new AC();
      if (!ctx) { failed = true; return; }

      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12;                    // 1000+ bullets means 1000+ chances to clip
      comp.knee.value = 12;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.18;
      comp.connect(ctx.destination);

      master = ctx.createGain(); master.gain.value = muted ? 0 : volMaster;
      master.connect(comp);

      duckAll = ctx.createGain(); duckAll.gain.value = 1;   // the death duck lives here, above every bus
      duckAll.connect(master);

      busSFX = ctx.createGain(); busSFX.gain.value = volSFX;
      musicDuck = ctx.createGain(); musicDuck.gain.value = 1;   // whistle duck target
      busMusic = ctx.createGain(); busMusic.gain.value = volMusic;
      busCrowd = ctx.createGain(); busCrowd.gain.value = 0.5;
      busSFX.connect(duckAll);
      busMusic.connect(musicDuck); musicDuck.connect(duckAll);
      busCrowd.connect(duckAll);

      noiseBuf = buildNoise();

      conv = ctx.createConvolver();
      conv.buffer = buildIR();
      convWet = ctx.createGain(); convWet.gain.value = 0.18;   // 0.18: sky, not swimming pool
      conv.connect(convWet); convWet.connect(duckAll);
      busSFX.connect(conv);
      busMusic.connect(conv);

      buildPad();
      buildCrowd();
    } catch (e) {
      // Blocked, unsupported, or out of hardware contexts. Degrade to a total no-op: the game is
      // fully playable in silence and MUST NOT throw a single time because of this file.
      failed = true; ctx = null;
    }
  }

  const ok = () => !!ctx && !failed;

  // ---------------------------------------------------------------------------------------------
  // PUBLIC API — every method early-returns without a context.
  // ---------------------------------------------------------------------------------------------
  const API = {

    init() { try { init(); } catch (e) { failed = true; ctx = null; } },

    resume() {
      try {
        init();
        if (!ok()) return;
        if (ctx.state !== 'running' && ctx.resume) {
          const p = ctx.resume();
          if (p && p.catch) p.catch(() => { });
        }
      } catch (e) { }
    },

    suspend() {
      try {
        if (!ok()) return;
        if (ctx.suspend) { const p = ctx.suspend(); if (p && p.catch) p.catch(() => { }); }
      } catch (e) { }
    },

    setMute(on) {
      muted = !!on;
      try {
        if (!ok()) return;
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(muted ? 0.0001 : volMaster, t + 0.05);  // 50ms so mute never clicks
      } catch (e) { }
    },

    // Options screen. 0..1 each; the spec graph gains are the ceilings.
    setVolumes(m, mu, sf) {
      if (typeof m === 'number') volMaster = 0.85 * Math.max(0, Math.min(1, m));
      if (typeof mu === 'number') volMusic = 0.80 * Math.max(0, Math.min(1, mu));
      if (typeof sf === 'number') volSFX = 0.90 * Math.max(0, Math.min(1, sf));
      try {
        if (!ok()) return;
        if (!muted) master.gain.value = volMaster;
        busMusic.gain.value = volMusic;
        busSFX.gain.value = volSFX;
      } catch (e) { }
    },

    startRun() {
      try {
        init();
        if (!ok()) return;
        running = true;
        bossPhaseCount = 0;
        stingUntil = 0;
        sectionName = 'WAVE_A'; section = SECTIONS.WAVE_A; pendingName = null;
        crowdTier = 0; crowdHushT = 0; swellT = 1.6;
        if (crowdGain) crowdGain.gain.setTargetAtTime(CROWD_TIER_GAIN[0], ctx.currentTime, 0.15);
        // Cancel any pending death-duck ramps before restoring full gain. death() schedules a dip at
        // t+1.30/+1.90; without this cancel, clicking "Again" within ~1.9s of dying lets that dip fire
        // ~0.8s into the fresh run — an unexplained global mix drop mid-gameplay.
        if (duckAll) { duckAll.gain.cancelScheduledValues(ctx.currentTime); duckAll.gain.setValueAtTime(1, ctx.currentTime); }
        startSched();
      } catch (e) { }
    },

    stopRun() {
      try {
        running = false;
        stopSched();
        if (!ok()) return;
        const now = ctx.currentTime;
        for (let i = 0; i < WH_CAP; i++) whStop(whistles[i], now, true);
        whActive = 0; whBoost = false;
        updateDuck();
        padChord(now, 0, false);
        if (crowdGain) crowdGain.gain.setTargetAtTime(0.0, now, 0.25);
        if (swellGain) { swellGain.gain.cancelScheduledValues(now); swellGain.gain.setTargetAtTime(0, now, 0.15); }
        sectionName = 'SILENT'; section = SECTIONS.SILENT; pendingName = null;
      } catch (e) { }
    },

    // Per-frame housekeeping ONLY. No synthesis happens here — music lives on the setInterval clock.
    update(dt) {
      hitFrame = 0;
      if (!ok()) return;
      try {
        const now = ctx.currentTime;
        pruneVoices(now);

        // retire finished whistles (their oscillators have already stopped themselves)
        for (let i = 0; i < WH_CAP; i++) {
          const w = whistles[i];
          if (w.busy && now >= w.endT) whStop(w, now, true);
        }
        if (whActive < WH_CAP && whBoost) whSetBoost(false);
        updateDuck();

        // crowd: random swells, rate scales with tier
        if (crowdHushT > 0) {
          crowdHushT -= dt;
          if (crowdHushT <= 0 && crowdGain) {
            crowdGain.gain.cancelScheduledValues(now);
            crowdGain.gain.setValueAtTime(crowdGain.gain.value, now);
            crowdGain.gain.linearRampToValueAtTime(CROWD_TIER_GAIN[crowdTier], now + 0.4);
          }
        } else if (running) {
          swellT -= dt;
          if (swellT <= 0) {
            // 1.2s..3.0s at FINALE, stretched toward 3.6s when the crowd is QUIET
            const lo = 1.2 + (4 - crowdTier) * 0.30;
            const hi = 3.0 + (4 - crowdTier) * 0.15;
            swellT = lo + Math.random() * (hi - lo);
            crowdSwell(0.10, 0.5, 0.9, 900, 900);   // 500ms attack / 900ms decay, +0.10 per spec
          }
        }
      } catch (e) { }
    },

    // ---- THE FUSE WHISTLE ----
    whistle(e) {
      if (!ok() || !e) return;
      try {
        if (muted) return;
        const now = ctx.currentTime;
        const dur = (typeof e.fuseMax === 'number' && e.fuseMax > 0.05) ? e.fuseMax : WH_DEFAULT_DUR;
        const ex = typeof e.x === 'number' ? e.x : PLAY_W * 0.5;
        const id = e.id;

        for (let i = 0; i < WH_CAP; i++) if (whistles[i].busy && whistles[i].id === id) return;  // already singing

        let free = null;
        for (let i = 0; i < WH_CAP; i++) if (!whistles[i].busy) { free = whistles[i]; break; }
        if (free) { whStart(free, { x: ex, id }, dur, now); return; }

        // All 6 busy: keep the 6 NEAREST THE PLAYER. A whistle you cannot reach is noise.
        const px = playerX();
        const mine = Math.abs(ex - px);
        let worst = null, worstD = -1;
        for (let i = 0; i < WH_CAP; i++) {
          const d = Math.abs(whistles[i].x - px);
          if (d > worstD) { worstD = d; worst = whistles[i]; }
        }
        whSetBoost(true);                             // contention means windows are being dropped: get LOUD
        if (worst && worstD > mine) {
          whStop(worst, now, true);
          whStart(worst, { x: ex, id }, dur, now);
        }
      } catch (er) { }
    },

    whistleOff(e) {
      if (!ok() || !e) return;
      try {
        const now = ctx.currentTime;
        const id = e.id;
        for (let i = 0; i < WH_CAP; i++) {
          const w = whistles[i];
          if (w.busy && w.id === id) { whStop(w, now, false); break; }
        }
        if (whActive < WH_CAP && whBoost) whSetBoost(false);
        updateDuck();
      } catch (er) { }
    },

    // ---- BLOOMS ----
    // BLUE: bright, wide, and it climbs with the chain. This is the sound of the game working.
    bloomBlue(petalCount, chain, x) {
      if (!ok() || muted) return;
      try {
        const t = ctx.currentTime;
        const n = petalCount || 0, c = chain || 0;
        const gain = Math.min(0.28, 0.10 + 0.004 * n);        // capped: a 40-petal bloom must not clip the mix
        const v = alloc(t, 0.34, busSFX); if (!v) return;
        const p = panner(typeof x === 'number' ? x : PLAY_W * 0.5);
        v.out.disconnect(); v.out.connect(p); p.connect(busSFX);

        const src = noiseSrc(t);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 4;
        const f0 = 1200 * Math.pow(2, Math.min(c, 30) / 24);  // chain raises the pitch: the cascade "ascends"
        bp.frequency.setValueAtTime(f0, t);
        bp.frequency.exponentialRampToValueAtTime(220, t + 0.22);
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        src.connect(bp); bp.connect(g); g.connect(v.out);
        src.stop(t + 0.26); track(v, src);

        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 62;  // the body-blow thump
        const og = ctx.createGain();
        og.gain.setValueAtTime(gain * 0.9, t);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(og); og.connect(v.out);
        o.start(t); o.stop(t + 0.20); track(v, o);

        if (c >= 8) {                                  // the crowd notices a real cascade (spec 9.5)
          crowdSwell(0.18, 0.15, 0.55, 700, 1400);
        }
      } catch (e) { }
    },

    // RED: duller by design. You should HEAR that you failed, without being punished by an alarm.
    bloomRed(bulletCount, x) {
      if (!ok() || muted) return;
      try {
        const t = ctx.currentTime;
        const v = alloc(t, 0.34, busSFX); if (!v) return;
        const p = panner(typeof x === 'number' ? x : PLAY_W * 0.5);
        v.out.disconnect(); v.out.connect(p); p.connect(busSFX);
        const gain = Math.min(0.20, 0.08 + 0.003 * (bulletCount || 0));  // lower ceiling than blue: it is a loss

        const src = noiseSrc(t);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;  // Q2 not Q4: blurrier, sadder
        bp.frequency.setValueAtTime(700, t);
        bp.frequency.exponentialRampToValueAtTime(180, t + 0.26);
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
        src.connect(bp); bp.connect(g); g.connect(v.out);
        src.stop(t + 0.30); track(v, src);

        const o = ctx.createOscillator(); o.type = 'sine';   // 40ms downward chirp = a deflating "nope"
        o.frequency.setValueAtTime(300, t);
        o.frequency.exponentialRampToValueAtTime(120, t + 0.04);
        const og = ctx.createGain();
        og.gain.setValueAtTime(gain * 0.7, t);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        o.connect(og); og.connect(v.out);
        o.start(t); o.stop(t + 0.06); track(v, o);
      } catch (e) { }
    },

    // Fuse-kill pop: 18ms HP noise burst + a BELL on the current scale degree, so pops stay in key.
    pop(x) {
      if (!ok() || muted) return;
      try {
        const t = ctx.currentTime;
        const v = alloc(t, 0.06, busSFX); if (!v) return;
        const p = panner(typeof x === 'number' ? x : PLAY_W * 0.5);
        v.out.disconnect(); v.out.connect(p); p.connect(busSFX);
        const src = noiseSrc(t);
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.09, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);   // 18ms: a click with a colour
        src.connect(hp); hp.connect(g); g.connect(v.out);
        src.stop(t + 0.04); track(v, src);
        // BELL at a scale degree picked from screen x, so a left-to-right STRING pops as a rising run
        const deg = ((typeof x === 'number' ? (x / PLAY_W) * 7 : 0) | 0);
        bell(t, midi(degMidi(deg + chordOff(), 4)), 0.030);
      } catch (e) { }
    },

    // Player gun. It is an IGNITER, not a weapon — it must never dominate. Only every 3rd volley sounds.
    shot() {
      if (!ok() || muted) return;
      try {
        shotN++;
        if (shotN % 3 !== 0) return;                  // 10 volleys/s would be a machine-gun; 3.3/s is a tick
        const t = ctx.currentTime;
        let live = 0, slot = -1;
        for (let i = 0; i < 8; i++) { if (shotEnds[i] > t) live++; else if (slot < 0) slot = i; }
        if (live >= 8 || slot < 0) return;            // max 8 concurrent
        shotEnds[slot] = t + 0.025;
        const v = alloc(t, 0.04, busSFX); if (!v) return;
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 900;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.028, t);              // 0.028: present in headphones, invisible under a bloom
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
        o.connect(g); g.connect(v.out);
        o.start(t); o.stop(t + 0.03); track(v, o);
      } catch (e) { }
    },

    // Petal hit. Budgeted to 6 per frame — a 5-pierce petal wall can land 50 hits in one tick.
    petalHit(x) {
      if (!ok() || muted) return;
      try {
        if (hitFrame >= 6) return;
        hitFrame++;
        const t = ctx.currentTime;
        const v = alloc(t, 0.02, busSFX); if (!v) return;
        const p = panner(typeof x === 'number' ? x : PLAY_W * 0.5);
        v.out.disconnect(); v.out.connect(p); p.connect(busSFX);
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 1400;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.02, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
        o.connect(g); g.connect(v.out);
        o.start(t); o.stop(t + 0.016); track(v, o);
      } catch (e) { }
    },

    // FLARE dash: an upward whoosh. Rising = movement you chose.
    flare() {
      if (!ok() || muted) return;
      try {
        const t = ctx.currentTime;
        const v = alloc(t, 0.24, busSFX); if (!v) return;
        const src = noiseSrc(t);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.6;
        bp.frequency.setValueAtTime(400, t);
        bp.frequency.exponentialRampToValueAtTime(2600, t + 0.18);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
        src.connect(bp); bp.connect(g); g.connect(v.out);
        src.stop(t + 0.24); track(v, src);
      } catch (e) { }
    },

    // MISFIRE: 1.2s downward noise sweep + 3 stacked BOOMs. The panic button must sound expensive.
    misfire() {
      if (!ok() || muted) return;
      try {
        const t = ctx.currentTime;
        const v = alloc(t, 1.30, busSFX); if (!v) return;
        const src = noiseSrc(t);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
        lp.frequency.setValueAtTime(6000, t);
        lp.frequency.exponentialRampToValueAtTime(200, t + 1.2);   // 6k -> 200 over 1.2s = the room closing
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.16, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.20);
        src.connect(lp); lp.connect(g); g.connect(v.out);
        verbSend(g, 0.4);
        src.stop(t + 1.30); track(v, src);
        boom(t, 0.40); boom(t + 0.040, 0.34); boom(t + 0.080, 0.28);  // 0/40/80ms: one impact with a tail of guilt
      } catch (e) { }
    },

    // Player death: everything ducks to 0.15 over 120ms, a bare 55Hz hum for 1.8s, crowd goes silent.
    death() {
      if (!ok()) return;
      try {
        const t = ctx.currentTime;
        if (duckAll) {
          duckAll.gain.cancelScheduledValues(t);
          duckAll.gain.setValueAtTime(duckAll.gain.value, t);
          duckAll.gain.linearRampToValueAtTime(0.15, t + 0.12);
          duckAll.gain.setValueAtTime(0.15, t + 1.30);
          duckAll.gain.linearRampToValueAtTime(1.0, t + 1.90);   // music is back by the next bar
        }
        for (let i = 0; i < WH_CAP; i++) whStop(whistles[i], t, true);
        whActive = 0; whSetBoost(false); updateDuck();

        if (!muted) {
          const v = alloc(t, 2.0, busSFX);
          if (v) {
            const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 55;  // 55Hz: felt in the chest, not heard
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.22, t + 0.06);
            g.gain.setValueAtTime(0.22, t + 1.40);
            g.gain.linearRampToValueAtTime(0.0001, t + 1.80);
            o.connect(g); g.connect(v.out);
            verbSend(g, 0.35);
            o.start(t); o.stop(t + 1.85); track(v, o);
          }
        }
        if (crowdGain) {                                // the crowd stops. That is the punishment.
          crowdGain.gain.cancelScheduledValues(t);
          crowdGain.gain.setValueAtTime(crowdGain.gain.value, t);
          crowdGain.gain.linearRampToValueAtTime(0.005, t + 0.20);
        }
        if (swellGain) { swellGain.gain.cancelScheduledValues(t); swellGain.gain.setValueAtTime(0, t); }
        crowdHushT = 2.0;                               // 2.0s of hush, then update() restores tier level
      } catch (e) { }
    },

    // Tier up: crowd swell + a BRASS stab on the tonic. The crowd IS the multiplier, so it announces it.
    tierUp(tier) {
      if (!ok()) return;
      try {
        const t = ctx.currentTime;
        const ti = Math.max(0, Math.min(4, tier | 0));
        crowdTier = ti;
        if (crowdGain) {
          crowdGain.gain.cancelScheduledValues(t);
          crowdGain.gain.setValueAtTime(crowdGain.gain.value, t);
          crowdGain.gain.linearRampToValueAtTime(CROWD_TIER_GAIN[ti], t + 0.4);   // 400ms ramp per spec
        }
        crowdSwell(0.10 + 0.03 * ti, 0.30, 0.80, 800, 1300);
        if (!muted) brass(t, midi(degMidi(chordOff(), 2)), 0.11 + 0.012 * ti, 0.30);  // stab on the TONIC
      } catch (e) { }
    },

    // Boss phase break: one bar of BOOM + BRASS in unison, and the normal pattern gets out of the way.
    phaseSting() {
      if (!ok()) return;
      try {
        bossPhaseCount++;
        // THE turn: Showrunner phase 5 lifts D dorian into D major. The only major key in the game,
        // and it lands exactly when the crowd stands up. `pendingName ||` matters: the section swap is
        // bar-quantised, so on the very first sting of the fight the swap has not landed yet.
        if ((pendingName || sectionName) === 'BOSS_4' && bossPhaseCount >= 5) key = 4;   // 1 sting per phase => sting 5 == phase 5
        if (muted) return;
        const t = ctx.currentTime;
        const bar = eighth() * 8;
        stingUntil = t + bar;                          // suppress the pattern for exactly one bar
        const f = midi(degMidi(chordOff(), 2));
        boom(t, 0.48);
        brass(t, f, 0.14, bar * 0.75);
        brass(t, f * 2, 0.09, bar * 0.75);             // octave doubling = "unison" with weight
        boom(t + bar * 0.5, 0.36);
        crowdSwell(0.12, 0.25, 0.70, 850, 1200);
      } catch (e) { }
    },

    // Salute / boss bang: the big far-away firework. Heavy reverb send puts it up in the sky.
    salute(x) {
      if (!ok() || muted) return;
      try {
        const t = ctx.currentTime;
        const v = alloc(t, 0.85, busSFX); if (!v) return;
        const p = panner(typeof x === 'number' ? x : PLAY_W * 0.5);
        v.out.disconnect(); v.out.connect(p); p.connect(busSFX);
        verbSend(v.out, 0.5);                          // send 0.5: this one is allowed to wash

        const src = noiseSrc(t);
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);   // 80ms crack
        src.connect(hp); hp.connect(g); g.connect(v.out);
        src.stop(t + 0.12); track(v, src);

        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 45;   // 45Hz: the shockwave
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.30, t);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 0.70);
        o.connect(og); og.connect(v.out);
        o.start(t); o.stop(t + 0.78); track(v, o);
      } catch (e) { }
    },

    // Sections crossfade on the next BAR. SILENT and DEATH are immediate — a hole in the music is a cue.
    setSection(name) {
      if (!name || !SECTIONS[name]) return;
      try {
        // BOSS_1..4 -> key 0..3, explicit and act-independent. Only on a GENUINE change, or a repeat
        // call during the Showrunner would demote D major back to dorian and undo the turn.
        if (/^BOSS_[1-4]$/.test(name) && name !== sectionName && name !== pendingName) {
          bossPhaseCount = 0;
          key = name.charCodeAt(5) - 49;
        }
        if (name === 'SILENT' || name === 'DEATH') {
          sectionName = name; section = SECTIONS[name]; pendingName = null;
          if (ok() && padGain) padChord(ctx.currentTime, 0, false);
          return;
        }
        if (name === sectionName) { pendingName = null; return; }
        pendingName = name;                            // applied by the scheduler on the downbeat
        if (!ok()) { sectionName = name; section = SECTIONS[name]; pendingName = null; }
      } catch (e) { }
    },

    setBpm(v) {
      const b = +v;
      if (!(b > 20 && b < 400)) return;               // sanity: a bad bpm would spin the lookahead loop
      bpm = b;
      // Acts are identified by their tempo (124/132/138/150 in CFG.ACTS), which keeps the key centre
      // in sync without this module needing to know anything about run structure.
      try {
        const acts = window.CFG && CFG.ACTS;
        if (acts && key !== 4) {                      // never demote the Showrunner's major turn
          let bi = 0, bd = 1e9;
          for (let i = 0; i < acts.length; i++) { const d = Math.abs(acts[i].bpm - b); if (d < bd) { bd = d; bi = i; } }
          if (bd <= 4) key = bi;                      // within 4 BPM = that act
        }
      } catch (e) { }
    },

    // Continuous crowd bed level, 400ms ramp (spec 9.5).
    setCrowd(tier) {
      const ti = Math.max(0, Math.min(4, (tier | 0)));
      crowdTier = ti;
      if (!ok() || !crowdGain) return;
      try {
        if (crowdHushT > 0) return;                   // do not fight the death hush
        const t = ctx.currentTime;
        crowdGain.gain.cancelScheduledValues(t);
        crowdGain.gain.setValueAtTime(crowdGain.gain.value, t);
        crowdGain.gain.linearRampToValueAtTime(CROWD_TIER_GAIN[ti], t + 0.4);
      } catch (e) { }
    },

    // ---- introspection (for __FINALE.assert / debug HUD) ----
    get voices() {
      if (!ok()) return 0;
      try { pruneVoices(ctx.currentTime); } catch (e) { }
      return voiceCount < 0 ? 0 : voiceCount;
    },
    get muted() { return muted; },
    get whistleCount() { return whActive; },
    get section() { return sectionName; },
    get bpm() { return bpm; },
    get key() { return key; },
    get bar() { return (step / 8) | 0; },
    get beat() { return ((step % 8) / 2) | 0; },
    get ready() { return ok(); },
    now() { return ok() ? ctx.currentTime : 0; },     // for the bar-clock-drift assert
  };

  return API;
})();
