// DUET — audio. 100% synthesized WebAudio, zero samples. D Dorian @ 126 BPM.
// Layers open as CLOSENESS rises; the song lives only while the duel does; a hit cuts it mid-bar (RALLY rule).
window.AUDIO = (() => {
  let ctx = null, master, comp, musicBus, delay, delayGain, verb, verbGain;
  let noiseBuf;
  const LAYERS = ['heart', 'lead', 'drone', 'partner', 'arp', 'pad', 'unison'];
  const lg = {};                 // layer GainNodes
  const tg = {};                 // JS mirror of target gains (so scheduler can skip silent layers)
  let active = false, gated = false, muted = false;
  let step = 0, nextT = 0, look = null;
  let curdle = 0;                // Rupture dissonance 0..1
  let stingerVariant = null, stingerAt = 0;

  const BPM = CFG.BPM, SPB16 = 60 / BPM / 4;
  const D = 146.83;             // D3
  const PENT = [0, 3, 5, 7, 10];                 // D minor pentatonic (D F G A C)
  const clampG = (v) => Math.max(0.0001, v);
  const ramp = (x, a, b) => U.clamp((x - a) / (b - a), 0, 1);
  const mod = (a, n) => ((a % n) + n) % n;                 // safe modulo (JS % keeps sign)
  const pfreq = (deg, oct = 0) => { if (!Number.isFinite(deg)) deg = 0; return D * Math.pow(2, oct + Math.floor(deg / 5) + PENT[mod(deg, 5)] / 12); };
  const now = () => ctx ? ctx.currentTime : 0;

  function init() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 1; musicBus.connect(master);

    // shared sends: dotted-8th delay + small synth reverb
    delay = ctx.createDelay(1.0); delay.delayTime.value = SPB16 * 6;      // dotted 8th
    delayGain = ctx.createGain(); delayGain.gain.value = 0.3;
    delay.connect(delayGain); delayGain.connect(delay); delayGain.connect(master);
    verb = ctx.createConvolver(); verb.buffer = impulse(1.6, 2.4);
    verbGain = ctx.createGain(); verbGain.gain.value = 0.5; verb.connect(verbGain); verbGain.connect(master);

    const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;

    for (const L of LAYERS) { const g = ctx.createGain(); g.gain.value = 0; g.connect(musicBus); lg[L] = g; tg[L] = 0; }
    lg.lead.connect(delay); lg.unison.connect(verb); lg.pad.connect(verb);

    look = setInterval(schedule, 25);
  }
  function impulse(dur, decay) {
    const len = ctx.sampleRate * dur, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = b.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function resume() { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); }
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }
  function setMute(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.03); }

  // ---- synth primitives ----
  function env(g, t, a, peak, dec, sus = 0.0001) {
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(clampG(sus), t + a + dec);
  }
  function tone(t, f, o = {}) {
    if (!ctx || !Number.isFinite(f) || f <= 0) return;      // never feed a bad frequency to the graph
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t); osc.detune.value = o.detune || 0;
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t + (o.slideT || 0.1));
    if (o.fm) { const m = ctx.createOscillator(), mg = ctx.createGain();
      m.frequency.value = f * o.fm; mg.gain.value = f * (o.fmIndex || 1); m.connect(mg); mg.connect(osc.frequency);
      m.start(t); m.stop(t + (o.a || 0.005) + (o.dec || 0.2) + 0.1); }
    env(g, t, o.a || 0.005, o.peak || 0.2, o.dec || 0.2, o.sus);
    osc.connect(g); g.connect(o.dest || master); osc.start(t); osc.stop(t + (o.a || 0.005) + (o.dec || 0.2) + 0.15);
  }
  function noise(t, o = {}) {
    if (!ctx) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1800, t); f.Q.value = o.q || 1;
    if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + (o.dec || 0.2));
    const g = ctx.createGain(); env(g, t, o.a || 0.002, o.peak || 0.2, o.dec || 0.1);
    s.connect(f); f.connect(g); g.connect(o.dest || master); s.start(t); s.stop(t + (o.dec || 0.1) + 0.2);
  }

  // ---- adaptive layer targets (the conductor's output) ----
  function frame(cl, un, mvt) {
    if (!ctx) return;
    if (gated && cl > 0.06) { gated = false; }                    // re-earn the song by returning to the graze
    curdle = (mvt >= 3 && mvt <= 3) ? U.clamp((cl > 0.3 ? 1 - (cl - 0.3) / 0.5 : 1), 0, 1) : 0;
    const on = active && !gated;
    tg.heart  = on ? 0.9 : 0;
    tg.lead   = on ? 0.8 : 0;
    tg.drone  = on ? ramp(cl, 0.15, 0.45) * 0.7 : 0;
    tg.partner= on ? ramp(cl, 0.30, 0.6) * 0.7 : 0;
    tg.arp    = on ? ramp(cl, 0.50, 0.75) * 0.45 : 0;
    tg.pad    = on ? ramp(cl, 0.70, 0.9) * 0.55 : 0;
    tg.unison = on ? Math.max(ramp(cl, 0.9, 1.0), un) * 0.8 : 0;
    for (const L of LAYERS) lg[L].gain.setTargetAtTime(clampG(tg[L]), now(), 0.14);
  }

  // ---- scheduler ----
  function schedule() {
    if (!ctx || !active || gated) return;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.06;
    while (nextT < ctx.currentTime + 0.12) { composeStep(step, nextT); nextT += SPB16; step++; }
  }
  const LEAD = [0, 2, 4, 2, 3, 1, 0, -1];      // pentatonic-degree phrase (2 bars, 8 notes)
  const CHORD = [0, 2, 4];                        // i triad-ish in pentatonic degrees
  function composeStep(n, t) {
    const s16 = n % 16, bar = Math.floor(n / 16);
    // HEART — lub/dub on beats 1 and 3, tighter+louder with closeness (approx via tg.heart)
    if (s16 === 0 || s16 === 8) {
      const dub = s16 === 0;
      tone(t, dub ? 55 : 50, { type: 'sine', peak: 0.5, a: 0.002, dec: 0.12, slideTo: dub ? 30 : 30, slideT: 0.09, dest: lg.heart });
      tone(t + 0.085, dub ? 41 : 40, { type: 'sine', peak: 0.34, a: 0.002, dec: 0.10, slideTo: 26, slideT: 0.08, dest: lg.heart });
    }
    if (s16 % 2 === 0) noise(t, { type: 'highpass', freq: 500, q: 0.7, peak: 0.015, dec: 0.03, rate: 1.5, dest: lg.heart });
    // LEAD — sparse plucked motif every half-beat
    if (tg.lead > 0.03 && (s16 % 4 === 0 || s16 === 10)) {
      const deg = LEAD[mod(Math.floor(n / 2), LEAD.length)];
      pluck(t, pfreq(deg, 1), 0.14, lg.lead);
    }
    // DRONE — long detuned saws every 2 bars
    if (tg.drone > 0.03 && s16 === 0 && bar % 2 === 0) {
      tone(t, pfreq(0, -1), { type: 'sawtooth', peak: 0.16, a: 1.2, dec: SPB16 * 30, detune: -7, dest: lg.drone });
      tone(t, pfreq(4, -1), { type: 'sawtooth', peak: 0.10, a: 1.2, dec: SPB16 * 30, detune: 7, dest: lg.drone });
    }
    // PARTNER — answers the lead a bar late, warm (E/B color); curdles sharp in Rupture
    if (tg.partner > 0.03 && (s16 === 4 || s16 === 12)) {
      const deg = LEAD[mod(Math.floor((n - 16) / 2), LEAD.length)];
      tone(t, pfreq(deg, 1) * (s16 === 12 ? 1.5 : 1.335), { type: 'sine', fm: 3.5, fmIndex: 2.2, peak: 0.09,
        a: 0.02, dec: 0.5, detune: 35 * curdle, dest: lg.partner });
    }
    // ARP — fast 16th square of the chord
    if (tg.arp > 0.03) {
      const deg = CHORD[mod(n, CHORD.length)];
      tone(t, pfreq(deg, 2), { type: 'square', peak: 0.05, a: 0.001, dec: 0.06, dest: lg.arp });
    }
    // PAD — sustained stack once a bar
    if (tg.pad > 0.03 && s16 === 0) {
      [0, 2, 4].forEach((dg, i) => tone(t, pfreq(dg, 0), { type: 'triangle', peak: 0.06, a: 0.6, dec: SPB16 * 15, detune: (i - 1) * 6, dest: lg.pad }));
    }
    // UNISON — octave-doubled motif locked with partner
    if (tg.unison > 0.03 && s16 % 4 === 0) {
      const deg = LEAD[mod(Math.floor(n / 2), LEAD.length)];
      tone(t, pfreq(deg, 1), { type: 'sine', peak: 0.1, a: 0.01, dec: 0.4, dest: lg.unison });
      tone(t, pfreq(deg, 2), { type: 'sine', peak: 0.06, a: 0.01, dec: 0.4, dest: lg.unison });
    }
  }
  function pluck(t, f, peak, dest) {
    noise(t, { peak: peak * 0.5, dec: 0.03, freq: f * 3, q: 6, dest });
    tone(t, f, { type: 'triangle', peak, a: 0.004, dec: 0.24, detune: 3, dest, fm: 2, fmIndex: 0.6 });
    tone(t, f, { type: 'sine', peak: peak * 0.5, a: 0.004, dec: 0.6, detune: -4, dest });
  }

  // ---- run lifecycle ----
  function startRun() { if (!ctx) return; active = true; gated = false; step = 0; nextT = ctx.currentTime + 0.08; matchStart(); }
  function stopRun() { active = false; for (const L of LAYERS) lg[L].gain.setTargetAtTime(0.0001, now(), 0.2); }
  // RALLY rule: hard-gate mid-bar; delay/reverb tails ring out into the empty room; no restart until re-graze.
  function deathGate() {
    if (!ctx) return; gated = true;
    for (const L of LAYERS) { lg[L].gain.cancelScheduledValues(now()); lg[L].gain.setTargetAtTime(0.0001, now(), 0.012); }
    playerHit();
  }

  // ---- stinger (the partner steps up at each movement) ----
  function stinger(variant) {
    if (!ctx) return; const t = now();
    const tonic = variant === 'rupture' ? pfreq(0, 0) : pfreq(0, 1);
    noise(t, { type: 'bandpass', freq: 200, freqTo: 6000, q: 4, a: 0.02, peak: 0.14, dec: 1.4 });
    [0, 4, 7].forEach((dg, i) => tone(t, pfreq(dg % 5, 0) * (dg >= 7 ? 2 : 1), { type: 'sawtooth', peak: 0.07, a: 0.02, dec: 1.2, detune: (i - 1) * 9, dest: master }));
    const ratio = variant === 'rupture' ? 1.414 : 2.0;
    tone(t + 1.2, tonic, { type: 'sine', fm: ratio, fmIndex: 3, peak: 0.3, a: 0.001, dec: 1.8, dest: master });
    tone(t + 1.2, 90, { type: 'sine', peak: 0.4, a: 0.001, dec: 0.5, slideTo: 45, slideT: 0.4, dest: master });
  }

  // ---- SFX ----
  function grazeTick(cl) { if (!ctx) return; const t = now(); const deg = Math.floor(cl * 8);
    tone(t, pfreq(deg, 2), { type: 'sine', peak: 0.06, a: 0.001, dec: 0.04, dest: master });
    tone(t, pfreq(deg, 3), { type: 'triangle', peak: 0.02, a: 0.001, dec: 0.03, dest: master }); }
  function tierUp() { if (!ctx) return; const t = now(); tone(t, pfreq(0, 2), { peak: 0.1, a: 0.003, dec: 0.18, dest: master }); tone(t + 0.05, pfreq(3, 2), { peak: 0.09, a: 0.003, dec: 0.2, dest: master }); }
  function fire(cl) { if (!ctx) return; const t = now(); tone(t, 700, { type: 'triangle', peak: 0.02 + cl * 0.01, a: 0.001, dec: 0.05, slideTo: 500, slideT: 0.05, dest: master }); }
  function shotConnect() { if (!ctx) return; tone(now(), 900, { type: 'sine', fm: 2, fmIndex: 0.5, peak: 0.05, a: 0.001, dec: 0.12, dest: master }); }
  function harmonize() { if (!ctx) return; const t = now();
    noise(t, { type: 'lowpass', freq: 8000, freqTo: 200, q: 1, a: 0.005, peak: 0.25, dec: 0.6 });
    [0, 2, 4].forEach((dg, i) => tone(t, pfreq(dg, 0), { type: 'triangle', peak: 0.12, a: 0.005, dec: 1.2, detune: (i - 1) * 8, dest: master }));
    tone(t, 80, { type: 'sine', peak: 0.3, a: 0.001, dec: 0.5, slideTo: 40, slideT: 0.4, dest: master }); }
  function sparks(x) { if (!ctx) return; const t = now(); for (let i = 0; i < 4; i++) tone(t + i * 0.05, 2000 + i * 300, { type: 'sine', peak: 0.05, a: 0.001, dec: 0.06, dest: master }); }
  function harvest(mult) { if (!ctx) return; const t = now(); const f = 1600 * (1 + Math.min(mult, 12) * 0.02); tone(t, f, { type: 'sine', peak: 0.06, a: 0.001, dec: 0.05, dest: master }); tone(t, f * 2, { type: 'sine', peak: 0.03, a: 0.001, dec: 0.05, dest: master }); }
  function focus(on) { if (!ctx) return; const t = now(); if (on) noise(t, { type: 'bandpass', freq: 600, freqTo: 1800, q: 2, a: 0.15, peak: 0.05, dec: 0.2 }); else noise(t, { type: 'bandpass', freq: 1800, freqTo: 400, q: 2, a: 0.02, peak: 0.04, dec: 0.2 }); }
  function playerHit() { if (!ctx) return; const t = now();
    tone(t, 120, { type: 'sine', peak: 0.4, a: 0.001, dec: 0.35, slideTo: 30, slideT: 0.3, dest: master });
    noise(t, { type: 'bandpass', freq: 400, q: 1, peak: 0.22, dec: 0.08, dest: master });
    tone(t, 3000, { type: 'sawtooth', peak: 0.06, a: 0, dec: 0.06, dest: master }); }
  function movementClear() { if (!ctx) return; const t = now(); [0, 2, 4].forEach((dg, i) => tone(t + i * 0.02, pfreq(dg, 0), { type: 'triangle', peak: 0.1, a: 0.02, dec: 1.5, dest: lg.pad || master })); }
  function unisonAchieved() { if (!ctx) return; const t = now(); [0, 4, 7, 9].forEach((dg) => tone(t, pfreq(dg % 5, 1) * (dg >= 7 ? 2 : 1), { type: 'sine', peak: 0.08, a: 0.4, dec: 3, dest: master })); }
  function partnerTell() { if (!ctx) return; const t = now(); tone(t, 100, { type: 'sine', peak: 0.08, a: 0.05, dec: 0.5, slideTo: 180, slideT: 0.5, dest: master }); }
  function matchStart() { if (!ctx) return; const t = now(); tone(t, pfreq(0, 1), { type: 'sine', fm: 2, fmIndex: 1, peak: 0.16, a: 0.001, dec: 0.9, dest: master }); tone(t + 0.28, pfreq(3, 1), { type: 'sine', fm: 2, fmIndex: 1, peak: 0.14, a: 0.001, dec: 0.9, dest: master }); }
  function uiMove() { if (!ctx) return; tone(now(), 800, { type: 'sine', peak: 0.05, a: 0.001, dec: 0.08, dest: master }); }

  // debug/introspection
  function getLayerGains() { const o = {}; for (const L of LAYERS) o[L] = lg[L] ? +lg[L].gain.value.toFixed(3) : 0; return o; }
  // semantic: the song is "silent" the instant it's cut/inactive (the physical tail may still ring out)
  function isSilent() { if (!ctx) return true; return !active || gated; }

  return {
    init, resume, suspend, setMute, frame, startRun, stopRun, deathGate, stinger,
    grazeTick, tierUp, fire, shotConnect, harmonize, sparks, harvest, focus, playerHit,
    movementClear, unisonAchieved, partnerTell, matchStart, uiMove,
    getLayerGains, isSilent, get ready(){ return !!ctx; }, get active(){ return active; },
  };
})();
