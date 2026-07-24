// EVENSONG — synthesis. 100% generated: formant choir voices, organ ground, a cathedral
// impulse response built from shaped noise. No samples. No libraries.
//
// ARCHITECTURE (the RALLY lesson, generalized): the SIM owns musical time, in beats.
// Audio holds a beat->ctx.currentTime anchor and drift-corrects it gently every frame;
// a big drift (tab was hidden) re-anchors outright. With ?mute or no AudioContext this
// whole module becomes inert stubs — the game never branches on audio.
window.AUDIO = (function () {
  const A = { enabled: false, ready: false };
  const CFG = window.CFG, U = window.U;

  // vowel formant tables: [freqHz, q, gainDb] x3. 'mm' is a closed hum — dark + breathy.
  const VOWELS = {
    ee: [[270, 9, 0], [2300, 11, -9], [3000, 12, -14]],
    eh: [[530, 9, 0], [1850, 11, -8], [2500, 12, -14]],
    ah: [[660, 8, 0], [1120, 10, -7], [2550, 12, -13]],
    oh: [[430, 9, 0], [990, 10, -9], [2400, 12, -16]],
    oo: [[300, 9, 0], [870, 10, -11], [2250, 12, -18]],
    mm: [[250, 10, 0], [1000, 12, -16], [2200, 12, -22]],
  };
  // player vowel morph path (mouse X): oo -> ah -> ee
  const MORPH = ['oo', 'ah', 'ee'];

  let ctx = null, master = null, comp = null, wet = null, noiseBuf = null;
  let anchorBeat = 0, anchorTime = 0, spb = 60 / CFG.BPM;
  const voices = {};    // id -> FormantVoice
  const drones = {};    // id -> FormantVoice (sustained)
  let organ = null, organFig = null;   // the organ is monophonic — figuration gets its own quiet second instrument

  function makeNoise() {
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // cathedral IR: stereo decaying noise, progressively darker (one-pole lowpass whose
  // coefficient tightens along the tail). Built directly — no offline render needed.
  function makeIR(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const a = 0.12 + 0.5 * t;                       // more smoothing (darker) later in the tail
        lp += ((Math.random() * 2 - 1) - lp) * (1 - a);
        d[i] = lp * Math.pow(1 - t, 2.4) * 0.5;
      }
      // early reflections: a few sparse taps in the first 80ms
      for (let k = 0; k < 6; k++) {
        const at = Math.floor((0.015 + 0.011 * k) * ctx.sampleRate * (ch ? 1.06 : 1));
        if (at < len) d[at] += (0.35 - k * 0.05) * (k % 2 ? -1 : 1);
      }
    }
    return buf;
  }

  // ------------------------------------------------------------- FormantVoice
  // One persistent voice per singer. Sawtooth -> 3 parallel bandpass formants (+ a dark
  // fundamental bleed) + breath noise keyed to attacks. Frequency is SCHEDULED (legato
  // lines, notes connect); the envelope only re-attacks when a real gap precedes a note.
  function FormantVoice(opts) {
    const v = {};
    const bus = ctx.createGain(); bus.gain.value = 1;
    const env = ctx.createGain(); env.gain.value = 0;
    const out = ctx.createGain(); out.gain.value = U.dbToGain(opts.db);
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 220;
    const vibr = ctx.createOscillator(); vibr.type = 'sine'; vibr.frequency.value = opts.vibRate || 5;
    const vibG = ctx.createGain(); vibG.gain.value = 0;
    vibr.connect(vibG); vibG.connect(osc.detune);
    const filters = [], fgains = [];
    for (let i = 0; i < 3; i++) {
      const f = ctx.createBiquadFilter(); f.type = 'bandpass';
      const g = ctx.createGain();
      osc.connect(f); f.connect(g); g.connect(bus);
      filters.push(f); fgains.push(g);
    }
    const body = ctx.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 260;
    const bodyG = ctx.createGain(); bodyG.gain.value = 0.35;
    osc.connect(body); body.connect(bodyG); bodyG.connect(bus);
    const breathSrc = ctx.createBufferSource(); breathSrc.buffer = noiseBuf; breathSrc.loop = true;
    const breathF = ctx.createBiquadFilter(); breathF.type = 'bandpass'; breathF.frequency.value = 1400; breathF.Q.value = 0.7;
    const breathG = ctx.createGain(); breathG.gain.value = 0;
    breathSrc.connect(breathF); breathF.connect(breathG); breathG.connect(bus);
    bus.connect(env); env.connect(out); out.connect(comp); out.connect(wet);
    osc.start(); vibr.start(); breathSrc.start();

    v.out = out;
    v.setVowel = function (name, t, ramp) {
      const tab = VOWELS[name] || VOWELS.ah;
      t = t == null ? ctx.currentTime : t; ramp = ramp == null ? 0.06 : ramp;
      for (let i = 0; i < 3; i++) {
        filters[i].frequency.setTargetAtTime(tab[i][0] * (opts.formantShift || 1), t, ramp);
        filters[i].Q.setTargetAtTime(tab[i][1], t, ramp);
        fgains[i].gain.setTargetAtTime(U.dbToGain(tab[i][2]), t, ramp);
      }
    };
    // morph 0..1 across MORPH path (player only)
    v.setMorph = function (x01) {
      const t = ctx.currentTime, seg = U.clamp(x01, 0, 1) * (MORPH.length - 1);
      const i = Math.min(MORPH.length - 2, Math.floor(seg)), f = seg - i;
      const a = VOWELS[MORPH[i]], b = VOWELS[MORPH[i + 1]];
      for (let k = 0; k < 3; k++) {
        filters[k].frequency.setTargetAtTime(U.lerp(a[k][0], b[k][0], f) * (opts.formantShift || 1), t, 0.05);
        filters[k].Q.setTargetAtTime(U.lerp(a[k][1], b[k][1], f), t, 0.05);
        fgains[k].gain.setTargetAtTime(U.dbToGain(U.lerp(a[k][2], b[k][2], f)), t, 0.05);
      }
    };
    // scheduled note (souls, finale). legatoPrev: connect from previous note, no re-attack.
    // lastSchedF (not osc.frequency.value, which reads NOW) is the glide start — two chained
    // notes scheduled in one catch-up frame would otherwise both glide from a stale pitch.
    let lastSchedF = 220;
    v.noteOn = function (midi, t, durBeats, vel, legatoPrev, legatoNext) {
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      vel = vel == null ? 1 : vel;
      if (legatoPrev) {
        osc.frequency.setValueAtTime(lastSchedF, Math.max(t - CFG.GLIDE_S * 3, ctx.currentTime));
        try { osc.frequency.exponentialRampToValueAtTime(f, t); } catch (e) { osc.frequency.setValueAtTime(f, t); }
      } else {
        osc.frequency.setValueAtTime(f * 0.985, t);                     // tiny scoop into the note: human
        try { osc.frequency.exponentialRampToValueAtTime(f, t + 0.05); } catch (e) {}
        env.gain.setTargetAtTime(vel, t, CFG.ATTACK_S / 3);
        breathG.gain.setValueAtTime((opts.breath || 0.1) * 0.06 * vel, t);
        breathG.gain.setTargetAtTime((opts.breath || 0.1) * 0.012, t + 0.08, 0.15);
        vibG.gain.setValueAtTime(0, t);
        vibG.gain.setTargetAtTime(opts.vibDepth || 0, t + CFG.VIBRATO_DELAY_S, 0.4);
      }
      if (!legatoNext) {
        const tEnd = t + durBeats * spb;
        env.gain.setTargetAtTime(0, tEnd, CFG.RELEASE_S / 3);
      }
      lastSchedF = f;
    };
    // live control (player)
    let liveMidi = null, singing = false;
    v.setSinging = function (on) {
      if (on === singing) return;
      singing = on;
      const t = ctx.currentTime;
      if (on) {
        env.gain.setTargetAtTime(1, t, CFG.ATTACK_S / 3);
        breathG.gain.setValueAtTime((opts.breath || 0.12) * 0.06, t);
        breathG.gain.setTargetAtTime((opts.breath || 0.12) * 0.012, t + 0.08, 0.15);
        vibG.gain.setValueAtTime(0, t);
        vibG.gain.setTargetAtTime(opts.vibDepth || 10, t + CFG.VIBRATO_DELAY_S, 0.4);
      } else {
        env.gain.setTargetAtTime(0, t, CFG.RELEASE_S / 3);
      }
    };
    v.setPitch = function (midi) {
      if (midi === liveMidi) return;
      liveMidi = midi;
      const f = 440 * Math.pow(2, (midi - 69) / 12), t = ctx.currentTime;
      osc.frequency.setTargetAtTime(f, t, CFG.GLIDE_S);
      vibG.gain.setValueAtTime(0, t);                                    // new note: vibrato re-earns itself
      vibG.gain.setTargetAtTime(opts.vibDepth || 10, t + CFG.VIBRATO_DELAY_S, 0.4);
    };
    v.setGainDb = function (db, rampS) {
      out.gain.setTargetAtTime(U.dbToGain(db), ctx.currentTime, (rampS || 0.2) / 3);
    };
    v.fadeOut = function (rampS) { out.gain.setTargetAtTime(0.0001, ctx.currentTime, (rampS || 1) / 3); };
    v.holdAt = function (midi, t) {                                       // fermata: converge and stay
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      // wipe anything still scheduled (note releases racing the hold) — the hold owns the future now
      const now = ctx.currentTime;
      env.gain.cancelScheduledValues(now); env.gain.setValueAtTime(env.gain.value, now);
      osc.frequency.cancelScheduledValues(now); osc.frequency.setValueAtTime(osc.frequency.value, now);
      try { osc.frequency.exponentialRampToValueAtTime(f, Math.max(t, now + 0.05)); } catch (e) { osc.frequency.setValueAtTime(f, t); }
      env.gain.setTargetAtTime(0.9, Math.max(t, now + 0.02), 0.3);
      lastSchedF = f;
    };
    v.release = function (rampS) { env.gain.setTargetAtTime(0, ctx.currentTime, (rampS || CFG.RELEASE_S) / 3); };
    return v;
  }

  // ------------------------------------------------------------------- organ
  function Organ() {
    const o = {};
    const out = ctx.createGain(); out.gain.value = U.dbToGain(CFG.MIX_GROUND);
    out.connect(comp); out.connect(wet);
    function rank(mult, level, type) {
      const osc = ctx.createOscillator(); osc.type = type || 'sine';
      const g = ctx.createGain(); g.gain.value = 0;
      osc.connect(g); g.connect(out); osc.start();
      return { osc, g, mult, level };
    }
    const ranks = [rank(1, 0.9, 'sine'), rank(2, 0.5, 'sine'), rank(4, 0.12, 'triangle')];
    const chiffF = ctx.createBiquadFilter(); chiffF.type = 'bandpass'; chiffF.frequency.value = 700; chiffF.Q.value = 1.2;
    const chiffG = ctx.createGain(); chiffG.gain.value = 0;
    const chiffSrc = ctx.createBufferSource(); chiffSrc.buffer = noiseBuf; chiffSrc.loop = true;
    chiffSrc.connect(chiffF); chiffF.connect(chiffG); chiffG.connect(out); chiffSrc.start();
    o.note = function (midi, t, durBeats, vel) {
      vel = vel == null ? 1 : vel;
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      for (const r of ranks) {
        r.osc.frequency.setValueAtTime(f * r.mult, t);
        r.g.gain.setTargetAtTime(r.level * vel, t, 0.06);
        r.g.gain.setTargetAtTime(0, t + durBeats * spb - 0.05, 0.12);
      }
      chiffG.gain.setValueAtTime(0.05 * vel, t);
      chiffG.gain.setTargetAtTime(0, t + 0.03, 0.03);
    };
    o.holdAt = function (midis, t) {
      // fermata: retune rank 1/2 to the chord's two ground notes and hold. Cancel first —
      // any pre-scheduled bar note or release would otherwise win the automation timeline.
      const now = ctx.currentTime;
      for (const r of ranks) {
        r.osc.frequency.cancelScheduledValues(now); r.osc.frequency.setValueAtTime(r.osc.frequency.value, now);
        r.g.gain.cancelScheduledValues(now); r.g.gain.setValueAtTime(r.g.gain.value, now);
      }
      const tt = Math.max(t, now + 0.02);
      ranks[0].osc.frequency.setValueAtTime(440 * Math.pow(2, (midis[0] - 69) / 12), tt);
      ranks[1].osc.frequency.setValueAtTime(440 * Math.pow(2, (midis[1] - 69) / 12), tt);
      ranks[2].g.gain.setTargetAtTime(0, tt, 0.2);
      ranks[0].g.gain.setTargetAtTime(0.9, tt, 0.3);
      ranks[1].g.gain.setTargetAtTime(0.45, tt, 0.3);
    };
    o.fadeOut = function (rampS) { out.gain.setTargetAtTime(0.0001, ctx.currentTime, (rampS || 1) / 3); };
    o.out = out;
    return o;
  }

  // -------------------------------------------------------------------- public
  A.init = function () {
    if (A.ready || A.muted) return A.enabled;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC || new URLSearchParams(location.search).has('mute')) { A.muted = true; return false; }
      ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
      noiseBuf = makeNoise();
      master = ctx.createGain(); master.gain.value = U.dbToGain(CFG.MIX_MASTER);
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
      const conv = ctx.createConvolver(); conv.buffer = makeIR(CFG.REVERB_SECONDS);
      wet = ctx.createGain(); wet.gain.value = U.dbToGain(CFG.MIX_WET);
      wet.connect(conv); conv.connect(comp);
      comp.connect(master); master.connect(ctx.destination);
      // debug tap: lets tests confirm the choir is actually sounding (and not clipping)
      if (new URLSearchParams(location.search).has('debug')) {
        const an = ctx.createAnalyser(); an.fftSize = 2048;
        master.connect(an);
        const buf = new Float32Array(an.fftSize);
        A.rms = () => { an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return Math.sqrt(s / buf.length); };
        A.ctxState = () => ctx.state;
      }
      organ = Organ();
      organFig = Organ();
      organFig.out.gain.value = U.dbToGain(CFG.MIX_GROUND - 6);
      voices.player = FormantVoice({ db: CFG.MIX_PLAYER, vibRate: CFG.VIBRATO_RATE_HZ, vibDepth: CFG.VIBRATO_DEPTH_CENTS, breath: 0.14 });
      voices.player.setVowel('ah');
      for (const s of window.SCORE.SOULS) {
        voices[s.id] = FormantVoice({
          db: CFG.MIX_SOUL, vibRate: s.vibRate, vibDepth: s.vibDepth, breath: s.breath,
          formantShift: s.id === 'wren' ? 1.15 : s.id === 'thomas' ? 0.92 : 1,
        });
        voices[s.id].setVowel(s.vowel);
      }
      document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden) ctx.suspend(); else ctx.resume();
      });
      A.enabled = true; A.ready = true;
    } catch (e) { A.muted = true; A.enabled = false; }
    return A.enabled;
  };

  // beat <-> time anchor, drift-corrected each frame from the sim. The anchor headroom
  // (0.03) must stay BELOW the re-anchor threshold (0.09) or the servo hard re-anchors
  // every frame and scheduling jitters by a frame's worth of time.
  A.sync = function (mtBeats) {
    if (!A.enabled) return;
    if (anchorTime === 0) { anchorBeat = mtBeats; anchorTime = ctx.currentTime + 0.03; return; }
    const expected = A.beatToTime(mtBeats);
    const drift = expected - ctx.currentTime;
    if (Math.abs(drift) > 0.09) { anchorBeat = mtBeats; anchorTime = ctx.currentTime + 0.03; } // tab was hidden etc: re-anchor
    else anchorTime -= drift * 0.03;                                                           // gentle servo
  };
  A.beatToTime = function (beat) { return A.enabled ? anchorTime + (beat - anchorBeat) * spb : 0; };
  A.now = function () { return A.enabled ? ctx.currentTime : 0; };

  A.noteOn = function (id, midi, atBeat, durBeats, vel, legatoPrev, legatoNext) {
    if (!A.enabled) return;
    const v = voices[id]; if (!v) return;
    const t = Math.max(A.beatToTime(atBeat), ctx.currentTime + 0.005);
    v.noteOn(midi, t, durBeats, vel, legatoPrev, legatoNext);
  };
  A.groundNote = function (midi, atBeat, durBeats, vel) {
    if (!A.enabled) return;
    organ.note(midi, Math.max(A.beatToTime(atBeat), ctx.currentTime + 0.005), durBeats, vel);
  };
  A.figNote = function (midi, atBeat, durBeats, vel) {   // Eli's gift rides its own quiet instrument
    if (!A.enabled) return;
    organFig.note(midi, Math.max(A.beatToTime(atBeat), ctx.currentTime + 0.005), durBeats, vel);
  };
  A.player = {
    setSinging(on) { if (A.enabled) voices.player.setSinging(on); },
    setPitch(midi) { if (A.enabled) voices.player.setPitch(midi); },
    setMorph(x) { if (A.enabled) voices.player.setMorph(x); },
  };
  A.addDrone = function (id, gift) {
    if (!A.enabled || drones[id]) return;
    const v = FormantVoice({ db: gift.db, vibRate: 0, vibDepth: 0, breath: gift.breathy ? 0.6 : 0.08 });
    v.setVowel(gift.vowel || 'oo');
    v.noteOn(gift.midi, ctx.currentTime + 0.05, 9999, 0.8, false, true);   // holds until told otherwise
    v._gift = gift;
    drones[id] = v;
  };
  // "stay a while" re-lights the room after the peel faded everything to silence.
  A.restoreGround = function () {
    if (!A.enabled) return;
    organ.out.gain.setTargetAtTime(U.dbToGain(CFG.MIX_GROUND), ctx.currentTime, 0.5);
    for (const k in drones) {
      drones[k].out.gain.setTargetAtTime(U.dbToGain(drones[k]._gift.db), ctx.currentTime, 0.5);
      drones[k].noteOn(drones[k]._gift.midi, ctx.currentTime + 0.05, 9999, 0.8, false, true);
    }
  };
  A.liftDrone = function (id, semis, rampS) {          // Margaret's F -> F# at the Picardy
    const v = drones[id]; if (!A.enabled || !v) return;
    const gift = window.SCORE.SOULS.find(s => s.id === id).groundGift;
    v.holdAt(gift.midi + semis, ctx.currentTime + (rampS || 0.5));
  };
  // fade a singer out of the world. A soul takes its ground-gift drone with it;
  // 'ground' takes the organ and every drone still burning.
  A.fadeVoice = function (id, rampS) {
    if (!A.enabled) return;
    if (id === 'ground') {
      organ.fadeOut(rampS);
      for (const k in drones) drones[k].fadeOut(rampS);
      return;
    }
    if (voices[id]) voices[id].fadeOut(rampS);
    if (drones[id]) drones[id].fadeOut(rampS);
  };
  A.setVoiceGainDb = function (id, db, rampS) { if (A.enabled && voices[id]) voices[id].setGainDb(db, rampS); };
  A.holdChord = function (chord, atBeat) {             // { ground:[m,m], soulId: m, ... }
    if (!A.enabled) return;
    const t = Math.max(A.beatToTime(atBeat), ctx.currentTime + 0.005);
    for (const k in chord) {
      if (k === 'ground') organ.holdAt(chord[k], t);
      else if (voices[k]) voices[k].holdAt(chord[k], t);
    }
  };
  A.releaseAll = function (rampS) {
    if (!A.enabled) return;
    for (const k in voices) voices[k].release(rampS);
  };
  // a soft bell partial for resolved suspensions — quiet, high, brief. tension spent well.
  A.bloom = function (midi) {
    if (!A.enabled) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.value = 440 * Math.pow(2, (midi + 12 - 69) / 12);
    const g = ctx.createGain(); g.gain.value = 0;
    o.connect(g); g.connect(comp); g.connect(wet);
    g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.015);
    g.gain.setTargetAtTime(0, t + 0.05, 0.35);
    o.start(t); o.stop(t + 1.6);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  };

  return A;
})();
