// RALLY — audio. 100% synthesized WebAudio, zero sample files (house standard).
// The core trick: the soundtrack is scheduled ONLY while the ball is alive. When a point
// dies, the dry music hard-cuts and a feedback-delay tail rings out. Scoring kills the song.
window.AUDIO = (() => {
  let ctx = null;
  let master, comp, musicDry, musicSend, delayA, delayFb, delayFilter;
  let whooshSrc, whooshBP, whooshGain, crowdSrc, crowdLP, crowdGain;
  let noiseBuf = null;

  // ---- music state ----
  let playing = false;
  let bpm = 100, root = 261.63, mode = [0, 2, 4, 5, 7, 9, 11], bright = 0.8, rivalId = 'pip';
  let next16 = 0, step = 0, barCount = 0;
  let layerGain = {};              // bass/arp/hats/lead gain nodes
  const LAYERS = ['bass', 'arp', 'hats', 'lead'];
  let onBar = null;                // finale hook: called each completed bar while playing
  let lookTimer = null;

  // per-rival lead phrases: [degree, octave, len-in-16ths]; authored, not random — identity
  const PHRASES = {
    pip:   [[0,1,2],[2,1,2],[4,1,4],[2,1,2],[4,1,2],[5,1,4],[4,1,2],[2,1,2],[0,1,4],[-1,1,4]],
    otto:  [[0,0,4],[0,0,2],[3,0,2],[4,0,4],[3,0,2],[0,0,2],[5,0,4],[4,0,4],[0,0,8]],
    viv:   [[0,1,1],[3,1,1],[5,1,2],[3,1,1],[6,1,1],[5,1,2],[3,1,2],[2,1,2],[0,1,2],[2,1,1],[3,1,1],[0,1,2]],
    sol:   [[0,1,6],[2,1,2],[3,1,6],[2,1,2],[4,1,8],[3,1,4],[0,1,8]],
    jules: [[0,1,2],[4,1,2],[6,1,2],[4,1,2],[7,1,4],[6,1,2],[4,1,2],[2,1,4],[4,1,4],[0,1,8]],
  };
  let phrasePos = 0, phraseHold = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.85;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.24;
    master.connect(comp); comp.connect(ctx.destination);

    // music bus: dry path (cuttable) + delay tail path (rings after the cut)
    musicDry = ctx.createGain(); musicDry.gain.value = 1;
    musicSend = ctx.createGain(); musicSend.gain.value = 0.34;
    delayA = ctx.createDelay(1.5); delayA.delayTime.value = 0.31;
    delayFb = ctx.createGain(); delayFb.gain.value = 0.52;
    delayFilter = ctx.createBiquadFilter(); delayFilter.type = 'lowpass'; delayFilter.frequency.value = 1600;
    musicDry.connect(master);
    musicSend.connect(delayA); delayA.connect(delayFilter); delayFilter.connect(delayFb);
    delayFb.connect(delayA); delayFilter.connect(master);

    for (const L of LAYERS) {
      const g = ctx.createGain(); g.gain.value = 0;
      g.connect(musicDry); g.connect(musicSend);
      layerGain[L] = g;
    }

    // shared noise buffer
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // whoosh: looping noise through a bandpass — the mitt's live speedometer
    whooshSrc = ctx.createBufferSource(); whooshSrc.buffer = noiseBuf; whooshSrc.loop = true;
    whooshBP = ctx.createBiquadFilter(); whooshBP.type = 'bandpass'; whooshBP.Q.value = 1.1; whooshBP.frequency.value = 400;
    whooshGain = ctx.createGain(); whooshGain.gain.value = 0;
    whooshSrc.connect(whooshBP); whooshBP.connect(whooshGain); whooshGain.connect(master);
    whooshSrc.start();

    // crowd: lowpassed noise swells with rally tension
    crowdSrc = ctx.createBufferSource(); crowdSrc.buffer = noiseBuf; crowdSrc.loop = true;
    crowdSrc.playbackRate.value = 0.31;
    crowdLP = ctx.createBiquadFilter(); crowdLP.type = 'lowpass'; crowdLP.frequency.value = 320; crowdLP.Q.value = 0.4;
    crowdGain = ctx.createGain(); crowdGain.gain.value = 0.012;
    crowdSrc.connect(crowdLP); crowdLP.connect(crowdGain); crowdGain.connect(master);
    crowdSrc.start();

    lookTimer = setInterval(schedule, 25);
  }

  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); }

  // degree (may exceed mode length or be negative) -> frequency
  function freqOf(degree, octave) {
    const n = mode.length;
    let d = degree, o = octave;
    while (d < 0) { d += n; o -= 1; }
    o += Math.floor(d / n); d = d % n;
    return root * Math.pow(2, o + mode[d] / 12);
  }

  function env(g, t, a, peak, dec, sus = 0.0001) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + dec);
  }

  function tone(t, freq, { type = 'sine', peak = 0.2, a = 0.005, dec = 0.2, dest = master, detune = 0, slideTo = 0, slideT = 0 } = {}) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + slideT);
    env(g, t, a, peak, dec);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + a + dec + 0.1);
  }

  function noiseHit(t, { peak = 0.2, dec = 0.08, freq = 1800, q = 1, type = 'bandpass', dest = master, rate = 1 } = {}) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = rate;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    const g = ctx.createGain();
    env(g, t, 0.002, peak, dec);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t); s.stop(t + dec + 0.15);
  }

  // ---- the scheduler (ported: rocket-shoes lookahead pattern) ----
  function schedule() {
    if (!playing || !ctx) return;
    const spb = 60 / bpm / 4; // seconds per 16th
    // if a stalled timer left us behind the clock, skip the missed steps —
    // never dump a batch of past-scheduled notes at once
    if (next16 < ctx.currentTime) next16 = ctx.currentTime + 0.06;
    while (next16 < ctx.currentTime + 0.14) {
      scheduleStep(step, next16, spb);
      next16 += spb;
      step++;
      if (step % 16 === 0) { barCount++; if (onBar) onBar(barCount); }
    }
  }

  function scheduleStep(s, t, spb) {
    const beat = Math.floor(s / 4) % 4, six = s % 16, sw = s % 4;
    // BASS — roots and fifths, octave down; style: on 1 & 3, pickup on 4.4
    if (six === 0 || six === 8) tone(t, freqOf(0, -2), { type: 'triangle', peak: 0.34, dec: spb * 5, dest: layerGain.bass });
    if (six === 12) tone(t, freqOf(4, -2), { type: 'triangle', peak: 0.26, dec: spb * 3.2, dest: layerGain.bass });
    if (six === 14) tone(t, freqOf(0, -1), { type: 'triangle', peak: 0.15, dec: spb * 1.6, dest: layerGain.bass });
    // ARP — 16ths climbing the triad, brightness sets the octave feel
    if (sw !== 3 || six % 8 === 7) {
      const seq = [0, 2, 4, 7];
      const deg = seq[(Math.floor(s / 2) + (s % 2) * 2) % 4];
      tone(t, freqOf(deg, bright > 0.7 ? 0 : -1), { type: 'square', peak: 0.052, a: 0.003, dec: spb * 1.4, dest: layerGain.arp, detune: 4 });
    }
    // HATS — noise ticks on 8ths, accent offbeats
    if (s % 2 === 0) {
      const off = six % 4 === 2;
      noiseHit(t, { peak: off ? 0.10 : 0.05, dec: off ? 0.05 : 0.025, freq: 8600, q: 0.8, type: 'highpass', dest: layerGain.hats, rate: 1.6 });
    }
    // LEAD — the rival's authored phrase
    if (phraseHold > 0) { phraseHold--; }
    else {
      const ph = PHRASES[rivalId] || PHRASES.pip;
      const [deg, oct, len] = ph[phrasePos % ph.length];
      tone(t, freqOf(deg, oct), { type: 'sine', peak: 0.16, a: 0.012, dec: spb * len * 1.15, dest: layerGain.lead, detune: 3 });
      tone(t, freqOf(deg, oct), { type: 'triangle', peak: 0.05, a: 0.012, dec: spb * len, dest: layerGain.lead, detune: -6 });
      phraseHold = len - 1;
      phrasePos++;
    }
  }

  // ---- public music controls ----
  function setRival(r) {
    rivalId = r.id; bpm = r.music.bpm; root = r.music.root; mode = r.music.mode; bright = r.music.bright;
    phrasePos = 0; phraseHold = 0;
  }

  function startMusic() {
    if (!ctx || playing) return;
    playing = true;
    step = 0; barCount = 0; phrasePos = 0; phraseHold = 0;
    next16 = ctx.currentTime + 0.06;
    musicDry.gain.cancelScheduledValues(ctx.currentTime);
    musicDry.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
  }

  // scoring kills the song: dry hard-cuts, the delay tail is what's left of it
  function cutMusic() {
    if (!ctx || !playing) return;
    playing = false;
    musicDry.gain.cancelScheduledValues(ctx.currentTime);
    musicDry.gain.setTargetAtTime(0, ctx.currentTime, 0.028);
    for (const L of LAYERS) layerGain[L].gain.setTargetAtTime(0, ctx.currentTime + 0.1, 0.2);
  }

  function setLayers(rally, force) {
    if (!ctx) return;
    const G = window.CFG.LAYER_GATES;
    const want = {
      bass: force || rally >= G.bass ? 0.9 : 0,
      arp:  force || rally >= G.arp ? 0.9 : 0,
      hats: force || rally >= G.hats ? 0.85 : 0,
      lead: force || rally >= G.lead ? 0.9 : 0,
    };
    for (const L of LAYERS) layerGain[L].gain.setTargetAtTime(want[L], ctx.currentTime, 0.12);
  }

  // ---- sfx ----
  function pok(speed, spinMag) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const v = clamp(speed / 1500, 0.12, 1);
    const f = 130 + v * 190 + Math.random() * 14;
    tone(t, f, { type: 'triangle', peak: 0.5 * v + 0.1, a: 0.002, dec: 0.09, slideTo: f * 0.62, slideT: 0.07 });
    noiseHit(t, { peak: 0.22 * v, dec: 0.03, freq: 2400, q: 0.7 });
    if (spinMag > 14) noiseHit(t, { peak: 0.08, dec: 0.11, freq: 5200, q: 3 }); // slice hiss
  }
  let crowdHold = 0;   // while ctx.currentTime < crowdHold, frame() leaves crowdGain alone
  function netThunk() {
    if (!ctx) return; const t = ctx.currentTime;
    tone(t, 82, { type: 'sine', peak: 0.4, dec: 0.3, slideTo: 46, slideT: 0.22 });
    noiseHit(t, { peak: 0.1, dec: 0.12, freq: 900, q: 1 });
    // crowd gasp: quick swell (crowdHold keeps frame() from stomping it same-tick)
    crowdGain.gain.cancelScheduledValues(t);
    crowdGain.gain.setTargetAtTime(0.09, t, 0.05);
    crowdGain.gain.setTargetAtTime(0.012, t + 0.35, 0.4);
    crowdHold = t + 1.0;
  }
  function bounceThud() {
    if (!ctx) return; const t = ctx.currentTime;
    tone(t, 110, { type: 'sine', peak: 0.3, dec: 0.16, slideTo: 60, slideT: 0.12 });
    noiseHit(t, { peak: 0.1, dec: 0.05, freq: 500, q: 0.6, type: 'lowpass' });
  }
  function toss() {
    if (!ctx) return;
    tone(ctx.currentTime, 620, { type: 'sine', peak: 0.1, dec: 0.1, slideTo: 880, slideT: 0.09 });
  }
  function callout(tier) {
    if (!ctx) return; const t = ctx.currentTime;
    const f = freqOf(0, 1) * (1 + tier * 0.02);
    tone(t, f, { type: 'sine', peak: 0.2, dec: 0.5, detune: 5 });
    tone(t, f * 1.5, { type: 'sine', peak: 0.12, dec: 0.4, detune: -4 });
  }
  function ui() { if (ctx) tone(ctx.currentTime, 720, { type: 'sine', peak: 0.07, dec: 0.06 }); }
  function saveSting() {
    if (!ctx) return; const t = ctx.currentTime;
    tone(t, freqOf(4, 0), { type: 'sawtooth', peak: 0.1, a: 0.01, dec: 0.35 });
    crowdGain.gain.cancelScheduledValues(t);
    crowdGain.gain.setTargetAtTime(0.11, t, 0.04);
    crowdGain.gain.setTargetAtTime(0.012, t + 0.5, 0.5);
    crowdHold = t + 1.3;
  }
  function burnout() {
    if (!ctx) return; const t = ctx.currentTime;
    noiseHit(t, { peak: 0.28, dec: 1.4, freq: 2600, q: 0.5, type: 'lowpass' });
    tone(t, 200, { type: 'sawtooth', peak: 0.12, dec: 1.2, slideTo: 38, slideT: 1.1 });
    for (let i = 0; i < 7; i++) noiseHit(t + 0.12 * i + Math.random() * 0.05, { peak: 0.09, dec: 0.04, freq: 4000 + Math.random() * 3000, q: 4 });
  }
  function finalChord() {
    if (!ctx) return; const t = ctx.currentTime;
    // lydian add9, wide and warm — held, then let the tail take it.
    // Voices go to MASTER, not musicDry: cutMusic() just zeroed the dry bus and the
    // chord must survive the cut (it IS the thing the cut makes room for).
    const degs = [[0, -1], [4, 0], [0, 0], [2, 0], [6, 0], [4, 1], [1, 1]];
    degs.forEach(([d, o], i) => {
      tone(t + i * 0.06, freqOf(d, o), { type: 'sine', peak: 0.16, a: 0.4, dec: 5.5, dest: master, detune: (i % 2 ? 4 : -4) });
      tone(t + i * 0.06, freqOf(d, o), { type: 'triangle', peak: 0.05, a: 0.6, dec: 6, dest: musicSend });
    });
  }

  // ---- continuous updates (called every frame) ----
  function frame(mittSpeed, tension) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const v = clamp((mittSpeed - 260) / 2100, 0, 1);
    whooshGain.gain.setTargetAtTime(v * v * 0.34, t, 0.03);
    whooshBP.frequency.setTargetAtTime(300 + v * 2100, t, 0.05);
    if (t >= crowdHold) crowdGain.gain.setTargetAtTime(0.012 + clamp(tension, 0, 1) * 0.05, t, 0.4);
  }

  let muted = false;
  function toggleMute() {
    muted = !muted;   // remembered even pre-init: pressing M on the title screen sticks
    if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.04);
    return muted;
  }

  return {
    init, resume, suspend, setRival, startMusic, cutMusic, setLayers, frame, toggleMute,
    pok, netThunk, bounceThud, toss, callout, ui, saveSting, burnout, finalChord,
    setOnBar: fn => { onBar = fn; },
    get playing() { return playing; },
    get ready() { return !!ctx; },
  };
})();
