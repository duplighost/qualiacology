const DISTRICTS = Object.freeze({
  garden: Object.freeze({
    aliases: ["garden", "gilt", "the gilt garden"],
    tempo: 104,
    root: 55,
    drone: [1, 1.5, 2.25],
    scale: [1, 9 / 8, 4 / 3, 3 / 2, 16 / 9, 2],
    pattern: [0, 2, 4, 1, 3, 5, 2, 4],
    filter: 1850,
  }),
  bellworks: Object.freeze({
    aliases: ["bellworks", "bell", "the bellworks"],
    tempo: 122,
    root: 49,
    drone: [1, 2, 2.5],
    scale: [1, 6 / 5, 4 / 3, 3 / 2, 9 / 5, 2],
    pattern: [0, 4, 1, 3, 5, 2, 4, 1],
    filter: 1350,
  }),
  archive: Object.freeze({
    aliases: ["archive", "drowned", "the drowned archive"],
    tempo: 86,
    root: 58.27,
    drone: [1, 4 / 3, 2],
    scale: [1, 16 / 15, 4 / 3, 3 / 2, 8 / 5, 2],
    pattern: [0, 1, 3, 5, 2, 4, 1, 3],
    filter: 980,
  }),
  orchard: Object.freeze({
    aliases: ["orchard", "glass", "the glass orchard"],
    tempo: 116,
    root: 65.41,
    drone: [1, 5 / 4, 2],
    scale: [1, 5 / 4, 4 / 3, 3 / 2, 15 / 8, 2],
    pattern: [0, 3, 5, 2, 4, 1, 5, 3],
    filter: 2350,
  }),
  noon: Object.freeze({
    aliases: ["noon", "false noon", "your other noon", "final"],
    tempo: 132,
    root: 46.25,
    drone: [1, 7 / 5, 2],
    scale: [1, 16 / 15, 6 / 5, 7 / 5, 8 / 5, 2],
    pattern: [0, 5, 1, 4, 2, 5, 3, 1],
    filter: 1550,
  }),
});

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function resolveDistrict(value) {
  const target = String(value || "garden").trim().toLowerCase();
  for (const [key, district] of Object.entries(DISTRICTS)) {
    if (key === target || district.aliases.some((alias) => target.includes(alias))) return key;
  }
  return "garden";
}

function setParam(param, value, time, glide = 0.04) {
  if (!param) return;
  const safeValue = Number.isFinite(value) ? value : 0;
  try {
    param.cancelScheduledValues(time);
    param.setValueAtTime(param.value, time);
    param.linearRampToValueAtTime(safeValue, time + glide);
  } catch {
    param.value = safeValue;
  }
}

/**
 * Procedural Web Audio score and effects for FALSE SUN.
 *
 * The module keeps no authoritative state. It is safe to disable entirely in
 * automation, on unsupported browsers, or until a real user gesture unlocks it.
 */
export function createAudio(options = {}) {
  const params = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  const disabled = Boolean(
    options.disabled
    || params.get("autotest") === "1"
    || params.get("mute") === "1"
    || !AudioContextClass,
  );

  let context = null;
  let graph = null;
  let unlocked = false;
  let destroyed = false;
  let intentionallySuspended = false;
  let districtKey = resolveDistrict(options.district);
  let targetFlow = 0;
  let currentFlow = 0;
  let heat = 0;
  let paused = false;
  let nextStepTime = 0;
  let stepIndex = 0;
  let noiseBuffer = null;
  let effectSerial = 0;
  const lastEffectAt = new Map();
  const persistentNodes = [];

  function makeNoiseBuffer() {
    const length = Math.max(1, Math.floor(context.sampleRate * 0.65));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x8f31a2d7;
    let previous = 0;
    for (let index = 0; index < length; index += 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const white = ((seed >>> 0) / 0xffffffff) * 2 - 1;
      previous = previous * 0.82 + white * 0.18;
      data[index] = white * 0.72 + previous * 0.28;
    }
    return buffer;
  }

  function createGraph() {
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const music = context.createGain();
    const ambience = context.createGain();
    const effects = context.createGain();
    const musicFilter = context.createBiquadFilter();
    const ambienceFilter = context.createBiquadFilter();

    master.gain.value = clamp(options.volume ?? 0.72);
    music.gain.value = 0.34;
    ambience.gain.value = 0.2;
    effects.gain.value = 0.64;

    compressor.threshold.value = -18;
    compressor.knee.value = 16;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.2;

    musicFilter.type = "lowpass";
    musicFilter.frequency.value = DISTRICTS[districtKey].filter;
    musicFilter.Q.value = 0.7;
    ambienceFilter.type = "lowpass";
    ambienceFilter.frequency.value = 780;
    ambienceFilter.Q.value = 0.45;

    music.connect(musicFilter).connect(master);
    ambience.connect(ambienceFilter).connect(master);
    effects.connect(master);
    master.connect(compressor).connect(context.destination);

    const droneVoices = DISTRICTS[districtKey].drone.map((ratio, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 0 ? "sine" : index === 1 ? "triangle" : "sine";
      oscillator.frequency.value = DISTRICTS[districtKey].root * ratio;
      oscillator.detune.value = index === 2 ? 5 : index === 1 ? -4 : 0;
      gain.gain.value = index === 0 ? 0.055 : 0.026;
      oscillator.connect(gain).connect(ambienceFilter);
      oscillator.start();
      persistentNodes.push(oscillator, gain);
      return { oscillator, gain };
    });

    const heatOscillator = context.createOscillator();
    const heatGain = context.createGain();
    const heatFilter = context.createBiquadFilter();
    heatOscillator.type = "sawtooth";
    heatOscillator.frequency.value = 73;
    heatGain.gain.value = 0.0001;
    heatFilter.type = "bandpass";
    heatFilter.frequency.value = 480;
    heatFilter.Q.value = 2.8;
    heatOscillator.connect(heatFilter).connect(heatGain).connect(ambience);
    heatOscillator.start();
    persistentNodes.push(heatOscillator, heatGain, heatFilter);

    noiseBuffer = makeNoiseBuffer();
    graph = {
      master,
      compressor,
      music,
      ambience,
      effects,
      musicFilter,
      ambienceFilter,
      droneVoices,
      heatOscillator,
      heatGain,
      heatFilter,
    };
    applyDistrict(true);
  }

  async function unlock() {
    if (disabled || destroyed) return false;
    try {
      if (!context) {
        context = new AudioContextClass({ latencyHint: "interactive" });
        createGraph();
      }
      if (context.state !== "running") await context.resume();
      unlocked = context.state === "running";
      intentionallySuspended = false;
      if (unlocked) nextStepTime = context.currentTime + 0.045;
      return unlocked;
    } catch {
      unlocked = false;
      return false;
    }
  }

  function applyDistrict(immediate = false) {
    if (!graph || !context) return;
    const now = context.currentTime;
    const district = DISTRICTS[districtKey];
    const glide = immediate ? 0.02 : 1.15;
    graph.droneVoices.forEach((voice, index) => {
      const ratio = district.drone[index % district.drone.length];
      setParam(voice.oscillator.frequency, district.root * ratio, now, glide);
    });
    setParam(graph.musicFilter.frequency, district.filter, now, immediate ? 0.02 : 0.8);
    setParam(graph.ambienceFilter.frequency, 620 + district.filter * 0.18, now, immediate ? 0.02 : 0.9);
    stepIndex = 0;
    nextStepTime = now + 0.04;
  }

  function setDistrict(value) {
    const next = resolveDistrict(value);
    if (next === districtKey) return districtKey;
    districtKey = next;
    applyDistrict(false);
    return districtKey;
  }

  function setFlow(value) {
    const numeric = Number(value) || 0;
    targetFlow = numeric <= 1 ? clamp(numeric) : clamp((numeric - 1) / 4);
    return targetFlow;
  }

  function scheduleTone({
    frequency,
    time = context.currentTime,
    duration = 0.12,
    volume = 0.08,
    type = "sine",
    destination = graph.effects,
    sweep = 1,
    filterFrequency = 0,
    attack = 0.006,
  }) {
    if (!context || context.state !== "running" || !Number.isFinite(frequency) || frequency <= 0) return;
    const start = Math.max(context.currentTime + 0.001, time);
    const stop = start + Math.max(0.018, duration);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    let tail = gain;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (sweep !== 1) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * sweep), stop);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(attack, duration * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);

    oscillator.connect(gain);
    if (filterFrequency > 0) {
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = filterFrequency;
      filter.Q.value = 0.8;
      gain.connect(filter);
      tail = filter;
    }
    tail.connect(destination);
    oscillator.start(start);
    oscillator.stop(stop + 0.02);
  }

  function scheduleNoise({
    time = context.currentTime,
    duration = 0.1,
    volume = 0.1,
    frequency = 900,
    type = "bandpass",
    sweep = 0.5,
  }) {
    if (!context || context.state !== "running" || !noiseBuffer) return;
    const start = Math.max(context.currentTime + 0.001, time);
    const stop = start + Math.max(0.025, duration);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = type;
    filter.frequency.setValueAtTime(Math.max(40, frequency), start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * sweep), stop);
    filter.Q.value = type === "bandpass" ? 1.2 : 0.5;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);
    source.connect(filter).connect(gain).connect(graph.effects);
    source.start(start, (effectSerial % 17) * 0.013);
    source.stop(stop + 0.02);
  }

  function scheduleMusic() {
    if (!context || !graph || context.state !== "running" || paused || intentionallySuspended) return;
    const district = DISTRICTS[districtKey];
    const stepSeconds = 60 / district.tempo / 2;
    const horizon = context.currentTime + 0.16;
    if (nextStepTime < context.currentTime - stepSeconds) nextStepTime = context.currentTime + 0.025;

    while (nextStepTime < horizon) {
      const position = stepIndex % 8;
      const degree = district.pattern[position] % district.scale.length;
      const ratio = district.scale[degree];
      const flow = currentFlow;

      if (position === 0 || position === 4) {
        scheduleTone({
          frequency: district.root * (position === 4 ? district.scale[2] : 1),
          time: nextStepTime,
          duration: stepSeconds * 1.75,
          volume: 0.038 + flow * 0.02,
          type: "triangle",
          destination: graph.music,
          filterFrequency: 680 + flow * 520,
          attack: 0.014,
        });
      }

      const melodicGate = flow > 0.62 || (flow > 0.22 && position % 2 === 0) || position === 2 || position === 6;
      if (melodicGate) {
        scheduleTone({
          frequency: district.root * 4 * ratio,
          time: nextStepTime + stepSeconds * 0.08,
          duration: stepSeconds * (0.45 + flow * 0.38),
          volume: 0.018 + flow * 0.028,
          type: districtKey === "bellworks" ? "square" : "sine",
          destination: graph.music,
          filterFrequency: district.filter + flow * 2100,
          attack: 0.004,
        });
      }

      if (flow > 0.45 && (position % 2 === 1 || flow > 0.82)) {
        scheduleNoise({
          time: nextStepTime,
          duration: 0.034,
          volume: 0.012 + flow * 0.012,
          frequency: districtKey === "archive" ? 1450 : 2600,
          type: "highpass",
          sweep: 0.72,
        });
      }

      stepIndex += 1;
      nextStepTime += stepSeconds;
    }
  }

  function normalizedEffectName(name) {
    return String(name || "ui").trim().toLowerCase().replace(/[\s_]+/g, "-");
  }

  function sfx(name, detail = {}) {
    if (!unlocked || destroyed || !context || !graph || context.state !== "running") return false;
    const effect = normalizedEffectName(name);
    const now = context.currentTime;
    const cooldown = effect === "burn" || effect === "beam" ? 0.065 : effect === "hit" ? 0.025 : 0.012;
    if (now - (lastEffectAt.get(effect) ?? -Infinity) < cooldown) return false;
    lastEffectAt.set(effect, now);
    effectSerial += 1;

    const intensity = clamp(detail.intensity ?? detail.power ?? 1, 0.05, 1.5);
    const variation = 1 + (((effectSerial * 37) % 17) - 8) * 0.0035;
    const root = DISTRICTS[districtKey].root * variation;

    switch (effect) {
      case "burn":
      case "beam":
      case "fire":
        scheduleTone({ frequency: 310 * variation, duration: 0.07, volume: 0.032 * intensity, type: "sawtooth", sweep: 0.78, filterFrequency: 2100 });
        scheduleNoise({ duration: 0.055, volume: 0.026 * intensity, frequency: 3200, type: "bandpass", sweep: 0.72 });
        break;
      case "dash":
        scheduleNoise({ duration: 0.18, volume: 0.12 * intensity, frequency: 1500, type: "bandpass", sweep: 0.2 });
        scheduleTone({ frequency: 135 * variation, duration: 0.16, volume: 0.075 * intensity, type: "triangle", sweep: 2.25, filterFrequency: 1800 });
        break;
      case "cut":
      case "shadow-cut":
        scheduleNoise({ duration: 0.095, volume: 0.15 * intensity, frequency: 5200, type: "highpass", sweep: 0.38 });
        scheduleTone({ frequency: root * 8, duration: 0.21, volume: 0.085 * intensity, type: "sine", sweep: 1.5 });
        scheduleTone({ frequency: root * 12, time: now + 0.025, duration: 0.16, volume: 0.05 * intensity, type: "triangle", sweep: 0.75 });
        break;
      case "pin":
        scheduleTone({ frequency: root * 5, duration: 0.28, volume: 0.075 * intensity, type: "sine", sweep: 0.5 });
        scheduleTone({ frequency: root * 8, time: now + 0.045, duration: 0.24, volume: 0.052 * intensity, type: "triangle", sweep: 1.01 });
        break;
      case "recall":
        scheduleTone({ frequency: root * 4, duration: 0.22, volume: 0.07 * intensity, type: "triangle", sweep: 2 });
        scheduleNoise({ duration: 0.13, volume: 0.055 * intensity, frequency: 1000, type: "bandpass", sweep: 2.4 });
        break;
      case "hurt":
      case "player-hit":
        scheduleNoise({ duration: 0.19, volume: 0.13 * intensity, frequency: 620, type: "lowpass", sweep: 0.32 });
        scheduleTone({ frequency: 165 * variation, duration: 0.2, volume: 0.08 * intensity, type: "sawtooth", sweep: 0.52, filterFrequency: 760 });
        break;
      case "hit":
      case "enemy-hit":
        scheduleNoise({ duration: 0.065, volume: 0.075 * intensity, frequency: 1900, type: "bandpass", sweep: 0.48 });
        scheduleTone({ frequency: 220 * variation, duration: 0.075, volume: 0.046 * intensity, type: "square", sweep: 0.72, filterFrequency: 1200 });
        break;
      case "kill":
      case "enemy-kill":
        scheduleTone({ frequency: root * 4, duration: 0.28, volume: 0.075 * intensity, type: "triangle", sweep: 2 });
        scheduleTone({ frequency: root * 6, time: now + 0.045, duration: 0.3, volume: 0.054 * intensity, type: "sine", sweep: 1.5 });
        scheduleNoise({ duration: 0.12, volume: 0.055 * intensity, frequency: 1100, type: "highpass", sweep: 1.7 });
        break;
      case "pickup":
      case "upgrade":
        [1, 4 / 3, 2].forEach((ratio, index) => scheduleTone({
          frequency: root * 6 * ratio,
          time: now + index * 0.075,
          duration: 0.34,
          volume: 0.052 * intensity,
          type: "sine",
          sweep: 1.01,
        }));
        break;
      case "receiver":
      case "glyph":
      case "secret":
        [1, 3 / 2, 2, 8 / 3].forEach((ratio, index) => scheduleTone({
          frequency: root * 5 * ratio,
          time: now + index * 0.06,
          duration: 0.42 - index * 0.04,
          volume: 0.043 * intensity,
          type: "sine",
          sweep: 1.003,
        }));
        break;
      case "wall-break":
      case "break":
        scheduleNoise({ duration: 0.32, volume: 0.18 * intensity, frequency: 520, type: "lowpass", sweep: 0.24 });
        scheduleTone({ frequency: 92 * variation, duration: 0.28, volume: 0.1 * intensity, type: "triangle", sweep: 0.48, filterFrequency: 480 });
        break;
      case "door":
      case "gate":
        scheduleTone({ frequency: root * 2, duration: 0.48, volume: 0.065 * intensity, type: "sawtooth", sweep: 0.5, filterFrequency: 820 });
        scheduleNoise({ duration: 0.38, volume: 0.075 * intensity, frequency: 740, type: "lowpass", sweep: 0.3 });
        break;
      case "overheat":
        scheduleTone({ frequency: 420, duration: 0.38, volume: 0.082, type: "square", sweep: 0.36, filterFrequency: 1700 });
        scheduleNoise({ duration: 0.22, volume: 0.08, frequency: 2500, type: "highpass", sweep: 0.42 });
        break;
      case "cool":
        scheduleTone({ frequency: root * 6, duration: 0.3, volume: 0.042, type: "sine", sweep: 0.74 });
        break;
      case "boss":
      case "guardian":
        scheduleTone({ frequency: root, duration: 0.8, volume: 0.11, type: "sawtooth", sweep: 0.5, filterFrequency: 600 });
        scheduleTone({ frequency: root * 1.5, time: now + 0.16, duration: 0.72, volume: 0.07, type: "triangle", sweep: 0.5 });
        break;
      case "death":
        scheduleNoise({ duration: 0.62, volume: 0.16, frequency: 1200, type: "bandpass", sweep: 0.08 });
        scheduleTone({ frequency: root * 3, duration: 0.72, volume: 0.085, type: "sine", sweep: 0.2 });
        break;
      case "pause":
      case "ui":
      default:
        scheduleTone({ frequency: root * 7, duration: 0.065, volume: 0.036 * intensity, type: "sine", sweep: 1.18 });
        break;
    }
    return true;
  }

  function update(deltaOrState = 1 / 60, possibleState = {}) {
    if (destroyed) return;
    let delta = Number(deltaOrState);
    let state = possibleState;
    if (deltaOrState && typeof deltaOrState === "object") {
      state = deltaOrState;
      delta = Number(state.dt ?? state.delta ?? 1 / 60);
    }
    if (!Number.isFinite(delta) || delta <= 0) delta = 1 / 60;
    delta = Math.min(delta, 0.25);

    if (state.district !== undefined) setDistrict(state.district);
    if (state.flow !== undefined) setFlow(state.flow);
    if (state.heat !== undefined) heat = clamp(state.heat > 1 ? state.heat / 100 : state.heat);
    if (state.paused !== undefined) paused = Boolean(state.paused);

    currentFlow += (targetFlow - currentFlow) * (1 - Math.exp(-delta * 5.5));
    if (!graph || !context) return;

    const now = context.currentTime;
    const masterVolume = state.volume === undefined
      ? clamp(options.volume ?? 0.72)
      : clamp(state.volume > 1 ? state.volume / 100 : state.volume);
    setParam(graph.master.gain, masterVolume, now, 0.08);
    setParam(graph.music.gain, paused ? 0.07 : 0.28 + currentFlow * 0.18, now, 0.12);
    setParam(graph.ambience.gain, paused ? 0.1 : 0.18 + currentFlow * 0.05, now, 0.15);
    setParam(graph.musicFilter.frequency, DISTRICTS[districtKey].filter + currentFlow * 2700, now, 0.1);
    setParam(graph.heatGain.gain, paused ? 0.0001 : 0.0001 + heat * heat * 0.045, now, 0.06);
    setParam(graph.heatOscillator.frequency, 62 + heat * 115, now, 0.08);
    setParam(graph.heatFilter.frequency, 360 + heat * 1500, now, 0.08);
    scheduleMusic();
  }

  async function suspend() {
    intentionallySuspended = true;
    if (!context || context.state === "closed") return true;
    try {
      await context.suspend();
      unlocked = false;
      return true;
    } catch {
      return false;
    }
  }

  async function resume() {
    intentionallySuspended = false;
    const result = await unlock();
    if (result && context) nextStepTime = context.currentTime + 0.04;
    return result;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    unlocked = false;
    for (const node of persistentNodes.splice(0)) {
      try { node.stop?.(); } catch { /* already stopped */ }
      try { node.disconnect?.(); } catch { /* already disconnected */ }
    }
    if (graph) {
      for (const node of Object.values(graph)) {
        if (Array.isArray(node)) continue;
        try { node?.disconnect?.(); } catch { /* already disconnected */ }
      }
    }
    if (context && context.state !== "closed") context.close().catch(() => {});
    graph = null;
    context = null;
    noiseBuffer = null;
  }

  return Object.freeze({
    unlock,
    setDistrict,
    setFlow,
    sfx,
    update,
    suspend,
    resume,
    destroy,
  });
}
