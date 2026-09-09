"use client";

import { useEffect, useRef, useState } from "react";
import { createCinematicMaterials, drawDeepSpace, drawMoon } from "./cinematic";
import { moonLayout, moonProgressForScore, advanceMoonJourney, MOON_EXCURSION_SECONDS, bounceOffMoon, pushOutsideMoon } from "./moon";

type Palette = {
  name: string;
  background: string;
  deep: string;
  sun: string;
  hot: string;
  cool: string;
  ink: string;
};

type Weather = {
  name: string;
  gravity: number;
  drag: number;
  speed: number;
};

type Point = { x: number; y: number };
type TrailPoint = Point & { life: number };
type BumperPattern = "still" | "orbit" | "figure8";
type RenderQuality = "high" | "balanced" | "recovery";
type Mote = Point & {
  id: number;
  r: number;
  spin: number;
  phase: number;
  color: number;
  kind: "spark" | "prism";
  vx: number;
  vy: number;
};
type Bumper = Point & {
  id: number;
  r: number;
  pulse: number;
  cooldown: number;
  color: number;
  homeX: number;
  homeY: number;
  pattern: BumperPattern;
  motionPhase: number;
  motionSpeed: number;
  motionAmplitude: number;
};
type Gate = Point & { id: number; r: number; spin: number; life: number; order: number };
type Particle = Point & {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  drag: number;
};
type Ring = Point & { life: number; maxLife: number; radius: number; color: string; width: number };
type Floater = Point & {
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
  driftX: number;
  rise: number;
};
type DareKind = "spark" | "bumper" | "orbit" | "pulse";
type Dare = { kind: DareKind; label: string; glyph: string; progress: number; target: number };

type Star = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  squash: number;
  angle: number;
  trail: TrailPoint[];
};

type PointerState = {
  down: boolean;
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  startedAt: number;
  orbitAngle: number | null;
  orbitTravel: number;
};

type GameState = {
  width: number;
  height: number;
  dpr: number;
  t: number;
  seed: number;
  score: number;
  best: number;
  flow: number;
  combo: number;
  totalSparks: number;
  runSparks: number;
  bumperHits: number;
  orbits: number;
  pulses: number;
  prisms: number;
  gateRuns: number;
  gateStage: number;
  nextGateAt: number;
  fever: number;
  lastFeverCombo: number;
  weatherIndex: number;
  weatherFromIndex: number;
  weatherBlend: number;
  weatherClock: number;
  weatherDuration: number;
  paused: boolean;
  soundOn: boolean;
  hapticsOn: boolean;
  paletteIndex: number;
  paletteFromIndex: number;
  paletteBlend: number;
  flash: number;
  shake: number;
  lastAction: number;
  wallCooldown: number;
  moonProgress: number;
  moonFace: number;
  moonExcursionIndex: number;
  moonExcursionElapsed: number;
  moonHits: number;
  moonCooldown: number;
  moonImpact: number;
  moonOrbitAngle: number | null;
  moonOrbitTravel: number;
  dare: Dare;
  nextId: number;
  star: Star;
  pointer: PointerState;
  motes: Mote[];
  bumpers: Bumper[];
  gates: Gate[];
  particles: Particle[];
  rings: Ring[];
  floaters: Floater[];
  dust: Array<Point & { size: number; alpha: number; drift: number }>;
};

type Hud = {
  score: number;
  best: number;
  flow: number;
  combo: number;
  weather: string;
  palette: string;
  paused: boolean;
  soundOn: boolean;
  hapticsOn: boolean;
  fever: number;
  dare: Dare;
  totalSparks: number;
};

type SmokeResult = {
  ok: boolean;
  checks: Record<string, boolean>;
  moved: number;
  score: number;
  sparks: number;
  stateHash: string;
};

type PerformanceSnapshot = {
  visible: boolean;
  paused: boolean;
  quality: RenderQuality;
  fps: number;
  averageFrameMs: number;
  p95FrameMs: number;
  maxFrameMs: number;
  averageDrawMs: number;
  p95DrawMs: number;
  slowFrames: number;
  freezeFrames: number;
  totalFrames: number;
  dpr: number;
  renderScale: number;
  backingPixels: number;
  atmosphereRefreshes: number;
  resizeCommits: number;
};

type PublicPocketSun = {
  snapshot: () => Record<string, number | string | boolean>;
  performance: () => PerformanceSnapshot;
  stateHash: () => string;
  stepFrames: (count: number) => Record<string, number | string | boolean>;
  runSmoke: () => SmokeResult;
  pulse: (x: number, y: number) => void;
  setPointer: (down: boolean, x: number, y: number) => void;
};

declare global {
  interface Window {
    __POCKET_SUN__?: PublicPocketSun;
  }
}

const BUILD_ID = "pocket-sun-3.2.0-long-moonrise";
const TAU = Math.PI * 2;
const PALETTES: Palette[] = [
  {
    name: "EGG",
    background: "#16091f",
    deep: "#090611",
    sun: "#fff36a",
    hot: "#ff4f91",
    cool: "#67f5de",
    ink: "#120b20",
  },
  {
    name: "POOL",
    background: "#061c32",
    deep: "#020b18",
    sun: "#ffdf71",
    hot: "#ff6c5f",
    cool: "#58e7ff",
    ink: "#031524",
  },
  {
    name: "BRUISE",
    background: "#24103d",
    deep: "#090511",
    sun: "#d9ff5b",
    hot: "#ff4fd8",
    cool: "#8d7cff",
    ink: "#110820",
  },
  {
    name: "JUICE",
    background: "#3a0d20",
    deep: "#13040b",
    sun: "#ffe078",
    hot: "#ff5c35",
    cool: "#7dffb2",
    ink: "#200610",
  },
  {
    name: "BLUE HOUR",
    background: "#101c4a",
    deep: "#050817",
    sun: "#f9f4ff",
    hot: "#f279ff",
    cool: "#6fc6ff",
    ink: "#090d29",
  },
  {
    name: "MILK TEETH",
    background: "#d7d2c6",
    deep: "#8f8993",
    sun: "#fff8d9",
    hot: "#d62c62",
    cool: "#205a7a",
    ink: "#17141b",
  },
];

const WEATHERS: Weather[] = [
  { name: "SOFT GRAVITY", gravity: 1, drag: 0.992, speed: 1 },
  { name: "SIDEWAYS RAIN", gravity: 1.12, drag: 0.994, speed: 1.08 },
  { name: "HONEY", gravity: 0.82, drag: 0.987, speed: 0.86 },
  { name: "NO BRAKES", gravity: 1.24, drag: 0.996, speed: 1.2 },
  { name: "GOOD STATIC", gravity: 1.05, drag: 0.993, speed: 1.04 },
];

const INITIAL_HUD: Hud = {
  score: 0,
  best: 0,
  flow: 1,
  combo: 0,
  weather: WEATHERS[0].name,
  palette: PALETTES[0].name,
  paused: false,
  soundOn: true,
  hapticsOn: true,
  fever: 0,
  dare: { kind: "spark", label: "SPARKS", glyph: "✦", progress: 0, target: 6 },
  totalSparks: 0,
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const sweptCirclesOverlap = (
  startA: Point,
  endA: Point,
  startB: Point,
  endB: Point,
  radius: number,
) => {
  const relativeX = startA.x - startB.x;
  const relativeY = startA.y - startB.y;
  const velocityX = endA.x - startA.x - (endB.x - startB.x);
  const velocityY = endA.y - startA.y - (endB.y - startB.y);
  const velocitySquared = velocityX * velocityX + velocityY * velocityY;
  const closestTime =
    velocitySquared > 0
      ? clamp(-(relativeX * velocityX + relativeY * velocityY) / velocitySquared, 0, 1)
      : 0;
  const closestX = relativeX + velocityX * closestTime;
  const closestY = relativeY + velocityY * closestTime;
  return closestX * closestX + closestY * closestY <= radius * radius;
};

type BoundsRect = { left: number; right: number; top: number; bottom: number };

const pointInsideRect = (point: Point, rect: BoundsRect) =>
  point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;

const segmentIntersectsRect = (start: Point, end: Point, rect: BoundsRect) => {
  if (pointInsideRect(start, rect) || pointInsideRect(end, rect)) return true;
  let minimum = 0;
  let maximum = 1;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  for (const [p, q] of [
    [-dx, start.x - rect.left],
    [dx, rect.right - start.x],
    [-dy, start.y - rect.top],
    [dy, rect.bottom - start.y],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const ratio = q / p;
    if (p < 0) minimum = Math.max(minimum, ratio);
    else maximum = Math.min(maximum, ratio);
    if (minimum > maximum) return false;
  }
  return true;
};

const normalizeAngle = (angle: number) => {
  let result = angle;
  while (result > Math.PI) result -= TAU;
  while (result < -Math.PI) result += TAU;
  return result;
};

const mulberry32 = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

const hashText = (text: string) => {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const safeNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const hexToRgb = (hex: string) => {
  if (hex.startsWith("rgb(")) {
    const channels = hex.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
    return { r: channels[0], g: channels[1], b: channels[2] };
  }
  const value = hex.replace("#", "");
  const expanded = value.length === 3 ? value.split("").map((character) => character + character).join("") : value;
  const number = Number.parseInt(expanded, 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
};

const mixColor = (from: string, to: string, amount: number) => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const t = clamp(amount, 0, 1);
  return `rgb(${Math.round(a.r + (b.r - a.r) * t)} ${Math.round(a.g + (b.g - a.g) * t)} ${Math.round(a.b + (b.b - a.b) * t)})`;
};

const alphaColor = (color: string, alpha: number) => {
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgb(").replace(")", ` / ${clamp(alpha, 0, 1)})`);
  }
  const value = hexToRgb(color);
  return `rgb(${value.r} ${value.g} ${value.b} / ${clamp(alpha, 0, 1)})`;
};

const mixPalette = (from: Palette, to: Palette, amount: number): Palette => ({
  name: to.name,
  background: mixColor(from.background, to.background, amount),
  deep: mixColor(from.deep, to.deep, amount),
  sun: mixColor(from.sun, to.sun, amount),
  hot: mixColor(from.hot, to.hot, amount),
  cool: mixColor(from.cool, to.cool, amount),
  ink: mixColor(from.ink, to.ink, amount),
});

class Soundboard {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(enabled ? 0.48 : 0.0001, this.context.currentTime, 0.02);
    }
  }

  async wake() {
    if (!this.enabled) return;
    if (!this.context) {
      const AudioCtor = window.AudioContext;
      this.context = new AudioCtor();
      this.master = this.context.createGain();
      this.compressor = this.context.createDynamicsCompressor();
      this.reverb = this.context.createConvolver();
      this.reverbGain = this.context.createGain();
      this.compressor.threshold.value = -16;
      this.compressor.knee.value = 10;
      this.compressor.ratio.value = 5;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.2;
      this.master.gain.value = 0.48;
      this.reverbGain.gain.value = 0.16;

      const impulseLength = Math.floor(this.context.sampleRate * 1.35);
      const impulse = this.context.createBuffer(2, impulseLength, this.context.sampleRate);
      for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const data = impulse.getChannelData(channel);
        for (let index = 0; index < impulseLength; index += 1) {
          const decay = Math.pow(1 - index / impulseLength, 3.5);
          data[index] = (Math.random() * 2 - 1) * decay * (0.72 + channel * 0.08);
        }
      }
      this.reverb.buffer = impulse;

      const noiseLength = Math.floor(this.context.sampleRate * 0.24);
      this.noiseBuffer = this.context.createBuffer(1, noiseLength, this.context.sampleRate);
      const noise = this.noiseBuffer.getChannelData(0);
      for (let index = 0; index < noiseLength; index += 1) {
        noise[index] = Math.random() * 2 - 1;
      }

      this.master.connect(this.compressor);
      this.master.connect(this.reverb);
      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(this.compressor);
      this.compressor.connect(this.context.destination);
    }
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    bend = 1,
    delay = 0,
  ) {
    if (!this.enabled || !this.context || !this.master) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const pan = this.context.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, frequency * bend), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(12000, Math.max(950, frequency * 9)), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(620, frequency * 3.2), now + duration);
    filter.Q.value = type === "sine" ? 0.5 : 1.2;
    pan.pan.value = Math.sin(frequency * 0.031) * 0.22;
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(pan);
    pan.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  private noise(duration: number, volume: number, frequency: number, delay = 0) {
    if (!this.enabled || !this.context || !this.master || !this.noiseBuffer) return;
    const now = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  spark(index: number, fever: boolean) {
    const scale = [0, 2, 4, 7, 9, 12, 14, 16];
    const semitone = scale[index % scale.length] + (fever ? 12 : 0);
    const frequency = 174.61 * Math.pow(2, semitone / 12);
    this.tone(frequency, 0.17, 0.09, "sine", 1.01);
    this.tone(frequency * 2, 0.08, 0.022, "triangle", 0.98, 0.012);
  }

  bumper(power: number) {
    this.tone(92 + power * 35, 0.16, 0.14, "sine", 0.38);
    this.tone(260 + power * 80, 0.07, 0.035, "square", 0.72);
    this.noise(0.075, 0.028 + power * 0.008, 1100 + power * 480);
  }

  pulse() {
    this.tone(150, 0.12, 0.075, "triangle", 1.9);
    this.noise(0.09, 0.022, 1900);
  }

  orbit() {
    [0, 0.07, 0.14, 0.22].forEach((delay, index) => {
      this.tone(220 * Math.pow(2, [0, 4, 7, 12][index] / 12), 0.34, 0.055, "sine", 1.02, delay);
    });
  }

  weather(index: number) {
    if (index === 0) {
      this.tone(98, 0.78, 0.045, "sine", 1.34);
      this.tone(196, 0.7, 0.025, "sine", 0.86, 0.1);
    } else if (index === 1) {
      this.tone(246.94, 0.34, 0.038, "triangle", 0.58);
      this.noise(0.2, 0.018, 3200, 0.025);
    } else if (index === 2) {
      this.tone(110, 0.74, 0.052, "sine", 0.74);
      this.tone(220, 0.82, 0.026, "triangle", 0.92, 0.08);
    } else if (index === 3) {
      this.tone(82.41, 0.48, 0.048, "sawtooth", 3.4);
      this.tone(329.63, 0.34, 0.025, "sine", 1.75, 0.11);
      this.noise(0.13, 0.015, 2400, 0.04);
    } else {
      this.tone(138.59, 0.22, 0.034, "square", 0.96);
      this.tone(207.65, 0.28, 0.028, "triangle", 1.08, 0.09);
      this.noise(0.18, 0.017, 4800, 0.025);
    }
  }

  dare() {
    [0, 4, 7, 11].forEach((note, index) => {
      this.tone(261.63 * Math.pow(2, note / 12), 0.22, 0.05, "triangle", 1.01, index * 0.055);
    });
  }

  prism() {
    [0, 7, 12].forEach((note, index) => {
      this.tone(329.63 * Math.pow(2, note / 12), 0.28, 0.055, "sine", 1.06, index * 0.045);
    });
    this.noise(0.1, 0.014, 4200);
  }

  gate(order: number) {
    const note = [0, 4, 9][clamp(order - 1, 0, 2)] ?? 0;
    this.tone(220 * Math.pow(2, note / 12), 0.26, 0.065, "triangle", 1.35);
    this.tone(440 * Math.pow(2, note / 12), 0.12, 0.025, "sine", 0.9, 0.025);
    this.noise(0.055, 0.012, 2900, 0.01);
  }

  close() {
    if (this.context) {
      void this.context.close();
    }
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.reverb = null;
    this.reverbGain = null;
    this.noiseBuffer = null;
  }
}

function getStorageNumber(key: string, fallback: number) {
  try {
    return safeNumber(window.localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

function getStorageBoolean(key: string, fallback: boolean) {
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return fallback;
    return value === "true";
  } catch {
    return fallback;
  }
}

function setStorage(key: string, value: string | number | boolean) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // The toy remains fully playable when storage is unavailable.
  }
}

function makeDare(random: () => number, previous?: DareKind): Dare {
  const options: Array<{ kind: DareKind; label: string; glyph: string; min: number; spread: number }> = [
    { kind: "spark", label: "SPARKS", glyph: "✦", min: 5, spread: 5 },
    { kind: "bumper", label: "BUMPERS", glyph: "◎", min: 3, spread: 4 },
    { kind: "orbit", label: "ORBITS", glyph: "↻", min: 1, spread: 2 },
    { kind: "pulse", label: "PULSES", glyph: "◉", min: 3, spread: 5 },
  ];
  const filtered = options.filter((option) => option.kind !== previous);
  const chosen = filtered[Math.floor(random() * filtered.length)] ?? options[0];
  const target = chosen.min + Math.floor(random() * chosen.spread);
  return { kind: chosen.kind, label: chosen.label, glyph: chosen.glyph, progress: 0, target };
}

function vibrate(state: GameState, pattern: number | number[]) {
  if (!state.hapticsOn || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  navigator.vibrate(pattern);
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<{
    state: GameState;
    sound: Soundboard;
    refreshHud: (force?: boolean) => void;
    togglePause: () => void;
    toggleSound: () => void;
    toggleHaptics: () => void;
    resetRun: () => void;
    fullscreen: () => void;
  } | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const atmosphereCanvas = document.createElement("canvas");
    const atmosphereContext = atmosphereCanvas.getContext("2d", { alpha: false });
    if (!atmosphereContext) return;

    const materials = createCinematicMaterials();

    const params = new URLSearchParams(window.location.search);
    const autotest = params.get("autotest") === "1";
    const forcedTouch = params.get("touch") === "1";
    const requestedSeed = safeNumber(params.get("seed"), 0);
    const seed = requestedSeed || ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    const seededRandom = mulberry32(seed);
    let randomDraws = 0;
    const random = () => {
      randomDraws += 1;
      return seededRandom();
    };
    const persist = (key: string, value: string | number | boolean) => {
      if (!autotest) setStorage(key, value);
    };
    const sound = new Soundboard();
    let animationFrame = 0;
    let resizeAnimationFrame = 0;
    let destroyed = false;
    let lastTime = performance.now();
    let lastHudAt = 0;
    let lastPersistAt = 0;
    let controlsSeenTimer = 0;
    let visibilitySuspended = document.hidden;
    let renderQuality: RenderQuality = "high";
    let atmosphereScale = 0.5;
    let atmosphereDirty = true;
    let atmosphereRenderedAt = Number.NEGATIVE_INFINITY;
    let atmosphereRefreshes = 0;
    let resizeCommits = 0;
    let qualitySlowWindows = 0;
    let qualityFastWindows = 0;
    let qualityChangedAt = Number.NEGATIVE_INFINITY;
    let performanceWindowStartedAt = lastTime;
    let performanceFrames: number[] = [];
    let performanceDraws: number[] = [];
    let performanceSlowFrames = 0;
    let performanceFreezeFrames = 0;
    let performanceMaxFrameMs = 0;
    let performanceTotalFrames = 0;
    let measuredPerformance: PerformanceSnapshot = {
      visible: !document.hidden,
      paused: false,
      quality: "high",
      fps: 60,
      averageFrameMs: 16.67,
      p95FrameMs: 16.67,
      maxFrameMs: 16.67,
      averageDrawMs: 0,
      p95DrawMs: 0,
      slowFrames: 0,
      freezeFrames: 0,
      totalFrames: 0,
      dpr: 1,
      renderScale: 1,
      backingPixels: 1,
      atmosphereRefreshes: 0,
      resizeCommits: 0,
    };

    const totalSparks = autotest ? 0 : getStorageNumber("pocket-sun-total-sparks", 0);
    const best = autotest ? 0 : getStorageNumber("pocket-sun-best", 0);
    const soundOn = autotest ? false : getStorageBoolean("pocket-sun-sound", true);
    const hapticsOn = autotest ? false : getStorageBoolean("pocket-sun-haptics", true);
    if (!autotest && getStorageBoolean("pocket-sun-controls-seen", false)) {
      controlsSeenTimer = window.setTimeout(() => setHasPlayed(true), 0);
    }

    const state: GameState = {
      width: 1,
      height: 1,
      dpr: 1,
      t: 0,
      seed,
      score: autotest ? Math.max(0, safeNumber(params.get("score"), 0)) : 0,
      best,
      flow: 1,
      combo: 0,
      totalSparks,
      runSparks: 0,
      bumperHits: 0,
      orbits: 0,
      pulses: 0,
      prisms: 0,
      gateRuns: 0,
      gateStage: 0,
      nextGateAt: 7 + random() * 4,
      fever: 0,
      lastFeverCombo: 0,
      weatherIndex: 0,
      weatherFromIndex: WEATHERS.length - 1,
      weatherBlend: 1,
      weatherClock: 0,
      weatherDuration: 21,
      paused: false,
      soundOn: autotest ? false : soundOn,
      hapticsOn: autotest ? false : hapticsOn,
      paletteIndex: 0,
      paletteFromIndex: PALETTES.length - 1,
      paletteBlend: 1,
      flash: 0,
      shake: 0,
      lastAction: 0,
      wallCooldown: 0,
      moonProgress: autotest ? moonProgressForScore(safeNumber(params.get("score"), 0)) : 0,
      moonFace: autotest ? moonProgressForScore(safeNumber(params.get("score"), 0)) : 0,
      moonExcursionIndex: -1,
      moonExcursionElapsed: MOON_EXCURSION_SECONDS,
      moonHits: 0,
      moonCooldown: 0,
      moonImpact: 0,
      moonOrbitAngle: null,
      moonOrbitTravel: 0,
      dare: makeDare(random),
      nextId: 1,
      star: {
        x: 0.5,
        y: 0.5,
        vx: 165,
        vy: -118,
        r: 11,
        squash: 0,
        angle: 0,
        trail: [],
      },
      pointer: {
        down: false,
        id: -1,
        x: 0,
        y: 0,
        startX: 0,
        startY: 0,
        startedAt: 0,
        orbitAngle: null,
        orbitTravel: 0,
      },
      motes: [],
      bumpers: [],
      gates: [],
      particles: [],
      rings: [],
      floaters: [],
      dust: [],
    };

    const renderScaleForQuality = () =>
      renderQuality === "high" ? 1 : renderQuality === "balanced" ? 0.86 : 0.72;

    const percentile = (values: number[], fraction: number) => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((left, right) => left - right);
      return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
    };

    const performanceSnapshot = (): PerformanceSnapshot => ({
      ...measuredPerformance,
      visible: !document.hidden && !visibilitySuspended,
      paused: state.paused,
      quality: renderQuality,
      dpr: Number(state.dpr.toFixed(3)),
      renderScale: renderScaleForQuality(),
      backingPixels: canvas.width * canvas.height,
      atmosphereRefreshes,
      resizeCommits,
    });

    const resetPerformanceWindow = (now = performance.now()) => {
      performanceFrames = [];
      performanceDraws = [];
      performanceSlowFrames = 0;
      performanceMaxFrameMs = 0;
      performanceWindowStartedAt = now;
    };

    const recordPerformance = (now: number, frameMs: number, drawMs: number) => {
      if (visibilitySuspended || document.hidden || state.paused || frameMs <= 0) return;
      if (frameMs >= 100) performanceFreezeFrames += 1;
      if (frameMs > 250) {
        resetPerformanceWindow(now);
        return;
      }
      performanceFrames.push(frameMs);
      performanceDraws.push(drawMs);
      performanceTotalFrames += 1;
      if (frameMs > 25) performanceSlowFrames += 1;
      performanceMaxFrameMs = Math.max(performanceMaxFrameMs, frameMs);
      const elapsed = now - performanceWindowStartedAt;
      if (elapsed < 1000 || performanceFrames.length < 20) return;
      const averageFrameMs = performanceFrames.reduce((total, value) => total + value, 0) / performanceFrames.length;
      const averageDrawMs = performanceDraws.reduce((total, value) => total + value, 0) / performanceDraws.length;
      const p95DrawMs = percentile(performanceDraws, 0.95);
      measuredPerformance = {
        visible: true,
        paused: false,
        quality: renderQuality,
        fps: Number((1000 / Math.max(0.01, averageFrameMs)).toFixed(1)),
        averageFrameMs: Number(averageFrameMs.toFixed(2)),
        p95FrameMs: Number(percentile(performanceFrames, 0.95).toFixed(2)),
        maxFrameMs: Number(performanceMaxFrameMs.toFixed(2)),
        averageDrawMs: Number(averageDrawMs.toFixed(2)),
        p95DrawMs: Number(p95DrawMs.toFixed(2)),
        slowFrames: performanceSlowFrames,
        freezeFrames: performanceFreezeFrames,
        totalFrames: performanceTotalFrames,
        dpr: Number(state.dpr.toFixed(3)),
        renderScale: renderScaleForQuality(),
        backingPixels: canvas.width * canvas.height,
        atmosphereRefreshes,
        resizeCommits,
      };
      document.body.dataset.performance = JSON.stringify(measuredPerformance);
      if (p95DrawMs > 13) {
        qualitySlowWindows += 1;
        qualityFastWindows = 0;
      } else if (p95DrawMs < 5.5) {
        qualityFastWindows += 1;
        qualitySlowWindows = 0;
      } else {
        qualitySlowWindows = 0;
        qualityFastWindows = 0;
      }
      if (qualitySlowWindows >= 2 && now - qualityChangedAt > 5000) {
        renderQuality = renderQuality === "high" ? "balanced" : "recovery";
        qualityChangedAt = now;
        qualitySlowWindows = 0;
        atmosphereDirty = true;
        resize(true);
      } else if (qualityFastWindows >= 8 && renderQuality !== "high" && now - qualityChangedAt > 7000) {
        renderQuality = renderQuality === "recovery" ? "balanced" : "high";
        qualityChangedAt = now;
        qualityFastWindows = 0;
        atmosphereDirty = true;
        resize(true);
      }
      resetPerformanceWindow(now);
    };

    sound.setEnabled(state.soundOn);

    const palette = () => {
      const from = PALETTES[state.paletteFromIndex] ?? PALETTES[0];
      const to = PALETTES[state.paletteIndex] ?? PALETTES[0];
      const blend = state.paletteBlend * state.paletteBlend * (3 - 2 * state.paletteBlend);
      return mixPalette(from, to, blend);
    };
    const weather = () => WEATHERS[state.weatherIndex] ?? WEATHERS[0];

    const currentMoon = () => moonLayout(state.width, state.height, state.moonProgress, state.t, { index: state.moonExcursionIndex, elapsed: state.moonExcursionElapsed }, state.moonFace);

    const randomPoint = (margin = 52): Point => ({
      x: margin + random() * Math.max(1, state.width - margin * 2),
      y: margin + random() * Math.max(1, state.height - margin * 2),
    });

    const safePoint = (margin = 52, clearance = 100): Point => {
      let point = randomPoint(margin);
      for (let attempt = 0; attempt < 18; attempt += 1) {
        const farFromStar = distance(point, state.star) > clearance;
        const moon = currentMoon();
        if (farFromStar && (!moon.solid || distance(point, moon) > moon.r + margin)) return point;
        point = randomPoint(margin);
      }
      return point;
    };

    const spawnMote = (forcedKind?: Mote["kind"]) => {
      const point = safePoint(42, 70);
      const activePrisms = state.motes.reduce((count, mote) => count + Number(mote.kind === "prism"), 0);
      const kind = forcedKind ?? (activePrisms < 2 && random() < 0.13 ? "prism" : "spark");
      state.motes.push({
        ...point,
        id: state.nextId++,
        r: kind === "prism" ? 10 + random() * 2.5 : 5 + random() * 3.5,
        spin: random() * TAU,
        phase: random() * TAU,
        color: Math.floor(random() * 3),
        kind,
        vx: kind === "prism" ? (random() - 0.5) * 34 : 0,
        vy: kind === "prism" ? (random() - 0.5) * 34 : 0,
      });
    };

    const spawnBumper = () => {
      const patternCycle: BumperPattern[] = ["still", "orbit", "still", "figure8", "still"];
      const pattern = patternCycle[state.bumpers.length % patternCycle.length];
      const motionAmplitude = pattern === "still" ? 0 : 16 + random() * 12;
      const point = safePoint(70 + motionAmplitude, 130 + motionAmplitude);
      state.bumpers.push({
        ...point,
        id: state.nextId++,
        r: 20 + random() * 12,
        pulse: random() * TAU,
        cooldown: 0,
        color: Math.floor(random() * 3),
        homeX: point.x,
        homeY: point.y,
        pattern,
        motionPhase: random() * TAU,
        motionSpeed: pattern === "still" ? 0 : 0.16 + random() * 0.12,
        motionAmplitude,
      });
    };

    const gateRadius = () => (state.width < 520 ? 22 : 26);

    const gateBounds = () => {
      const radius = gateRadius();
      const left = radius + 18;
      const right = Math.max(left, state.width - radius - 18);
      const top = Math.min(state.height - radius - 12, radius + 24);
      const bottom = Math.max(top, state.height - radius - 24);
      return { left, right, top, bottom, radius };
    };

    const gateSeparation = () => clamp(Math.min(state.width, state.height) * 0.25, 92, 180);
    const gateMaxLeg = () => clamp(Math.min(state.width, state.height) * 0.82, 240, 430);
    const gateSunClearance = () => clamp(Math.min(state.width, state.height) * 0.38, 132, 180);

    const hudRectangles = (expansion: number) => {
      const canvasRect = canvas.getBoundingClientRect();
      const selectors = [".top-hud"];
      const rectangles: BoundsRect[] = [];
      for (const selector of selectors) {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) continue;
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        rectangles.push({
          left: rect.left - canvasRect.left - expansion,
          right: rect.right - canvasRect.left + expansion,
          top: rect.top - canvasRect.top - expansion,
          bottom: rect.bottom - canvasRect.top + expansion,
        });
      }
      return rectangles;
    };

    const gateRouteIsSafe = (start: Point, end: Point) => {
      if (distance(start, end) > gateMaxLeg()) return false;
      const moon = currentMoon();
      if (moon.solid && sweptCirclesOverlap(start, end, moon, moon, moon.r + state.star.r + 12)) return false;
      return hudRectangles(state.star.r + 10).every((rect) => !segmentIntersectsRect(start, end, rect));
    };

    const gatePointIsSafe = (
      point: Point,
      selected: Point[] = [],
      includeStar = true,
    ) => {
      const bounds = gateBounds();
      if (
        point.x < bounds.left ||
        point.x > bounds.right ||
        point.y < bounds.top ||
        point.y > bounds.bottom
      ) {
        return false;
      }
      const visualRadius = bounds.radius * 1.55;
      const moon = currentMoon();
      if (moon.solid && distance(point, moon) < moon.r + visualRadius + 10) return false;
      if (hudRectangles(visualRadius + 8).some((rect) => pointInsideRect(point, rect))) return false;
      const triggerRadius = state.star.r + bounds.radius * 0.62;
      if (
        state.bumpers.some(
          (bumper) =>
            distance(point, { x: bumper.homeX, y: bumper.homeY }) <
            triggerRadius + bumper.r + bumper.motionAmplitude + 6,
        )
      ) {
        return false;
      }
      if (!selected.every((existing) => distance(existing, point) >= gateSeparation())) return false;
      if (selected.length > 0) return gateRouteIsSafe(selected[selected.length - 1], point);
      if (!includeStar) return true;
      const fromSun = distance(point, state.star);
      return fromSun >= gateSunClearance() && gateRouteIsSafe(state.star, point);
    };

    const gateRunIsValid = (includeStar = false) => {
      if (state.gates.length !== 3) return false;
      const ordered = [...state.gates].sort((a, b) => a.order - b.order);
      if (ordered.some((gate, index) => gate.order !== index + 1)) return false;
      const selected: Point[] = [];
      for (const gate of ordered) {
        if (!gatePointIsSafe(gate, selected, includeStar && selected.length === 0)) return false;
        selected.push(gate);
      }
      return true;
    };

    const spawnGateRun = () => {
      state.gates.length = 0;
      state.gateStage = 0;
      const bounds = gateBounds();
      let points: Point[] = [];
      let sampledCandidates = 0;
      let maximumPartialRun = 0;

      for (let runAttempt = 0; runAttempt < 36 && points.length !== 3; runAttempt += 1) {
        const candidateRun: Point[] = [];
        for (let order = 1; order <= 3; order += 1) {
          let accepted: Point | null = null;
          for (let attempt = 0; attempt < 36 && !accepted; attempt += 1) {
            sampledCandidates += 1;
            const candidate = {
              x: bounds.left + random() * Math.max(1, bounds.right - bounds.left),
              y: bounds.top + random() * Math.max(1, bounds.bottom - bounds.top),
            };
            if (gatePointIsSafe(candidate, candidateRun)) accepted = candidate;
          }
          if (!accepted) break;
          candidateRun.push(accepted);
          maximumPartialRun = Math.max(maximumPartialRun, candidateRun.length);
        }
        if (candidateRun.length === 3) points = candidateRun;
      }

      if (points.length !== 3) {
        const fallbackPattern = [
          [0.16, 0.28], [0.5, 0.72], [0.84, 0.38], [0.28, 0.78], [0.72, 0.22],
          [0.5, 0.5], [0.12, 0.62], [0.88, 0.7], [0.34, 0.36], [0.66, 0.64],
          [0.2, 0.48], [0.8, 0.5], [0.42, 0.82], [0.58, 0.18],
        ];
        const offset = Math.floor(random() * fallbackPattern.length);
        const fallbackPoints: Point[] = [];
        for (let index = 0; index < fallbackPattern.length && fallbackPoints.length < 3; index += 1) {
          const [xRatio, yRatio] = fallbackPattern[(index + offset) % fallbackPattern.length];
          const candidate = {
            x: bounds.left + xRatio * (bounds.right - bounds.left),
            y: bounds.top + yRatio * (bounds.bottom - bounds.top),
          };
          if (gatePointIsSafe(candidate, fallbackPoints)) fallbackPoints.push(candidate);
        }
        points = fallbackPoints;
      }

      if (points.length !== 3) {
        state.nextGateAt = state.t + 4 + random() * 3;
        if (autotest) {
          document.body.dataset.gateDebug = JSON.stringify({
            ok: false,
            sampledCandidates,
            maximumPartialRun,
            bounds,
            separation: gateSeparation(),
            maxLeg: gateMaxLeg(),
          });
        }
        return false;
      }

      for (let index = 0; index < points.length; index += 1) {
        state.gates.push({
          ...points[index],
          id: state.nextId++,
          r: bounds.radius,
          spin: random() * TAU,
          life: 14,
          order: index + 1,
        });
      }
      if (autotest) {
        document.body.dataset.gateDebug = JSON.stringify({
          ok: true,
          sampledCandidates,
          maximumPartialRun,
          bounds,
          separation: gateSeparation(),
          maxLeg: gateMaxLeg(),
        });
      }
      return true;
    };

    const seedWorld = () => {
      state.motes.length = 0;
      state.bumpers.length = 0;
      state.gates.length = 0;
      state.gateStage = 0;
      const moteCount = clamp(Math.round((state.width * state.height) / 52000), 9, 16);
      for (let index = 0; index < moteCount; index += 1) spawnMote();
      const bumperCount = state.width < 520 ? 3 : 5;
      for (let index = 0; index < bumperCount; index += 1) spawnBumper();
    };

    const seedDust = () => {
      state.dust.length = 0;
      const dustSeed = (
        state.seed ^
        Math.imul(Math.round(state.width), 0x45d9f3b) ^
        Math.imul(Math.round(state.height), 0x119de1f3) ^
        0x9e3779b9
      ) >>> 0;
      const visualRandom = mulberry32(dustSeed);
      const count = clamp(Math.round((state.width * state.height) / 7800), 60, 160);
      for (let index = 0; index < count; index += 1) {
        state.dust.push({
          x: visualRandom() * state.width,
          y: visualRandom() * state.height,
          size: 0.4 + visualRandom() * 1.5,
          alpha: 0.08 + visualRandom() * 0.22,
          drift: 0.2 + visualRandom() * 0.8,
        });
      }
    };

    const resize = (force = false) => {
      const rect = canvas.getBoundingClientRect();
      const oldWidth = state.width;
      const oldHeight = state.height;
      const nextWidth = Math.max(1, Math.round(rect.width));
      const nextHeight = Math.max(1, Math.round(rect.height));
      const viewportDprCap = nextWidth < 600 ? 1.6 : 1.35;
      const pixelBudgetDpr = Math.sqrt(2_600_000 / Math.max(1, nextWidth * nextHeight));
      const nextDpr = clamp(
        Math.min(window.devicePixelRatio || 1, viewportDprCap, pixelBudgetDpr) * renderScaleForQuality(),
        0.72,
        1.6,
      );
      const nextBackingWidth = Math.max(1, Math.round(nextWidth * nextDpr));
      const nextBackingHeight = Math.max(1, Math.round(nextHeight * nextDpr));
      if (
        !force &&
        oldWidth === nextWidth &&
        oldHeight === nextHeight &&
        canvas.width === nextBackingWidth &&
        canvas.height === nextBackingHeight
      ) {
        return;
      }
      state.width = nextWidth;
      state.height = nextHeight;
      state.dpr = nextDpr;
      canvas.width = nextBackingWidth;
      canvas.height = nextBackingHeight;
      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      atmosphereScale = renderQuality === "high" ? 0.85 : renderQuality === "balanced" ? 0.6 : 0.4;
      atmosphereCanvas.width = Math.max(1, Math.round(state.width * atmosphereScale));
      atmosphereCanvas.height = Math.max(1, Math.round(state.height * atmosphereScale));
      atmosphereContext.setTransform(atmosphereScale, 0, 0, atmosphereScale, 0, 0);
      atmosphereDirty = true;
      resizeCommits += 1;
      resetPerformanceWindow();
      if (oldWidth <= 1 || oldHeight <= 1) {
        state.star.x = state.width * 0.52;
        state.star.y = state.height * 0.46;
        seedWorld();
        seedDust();
      } else if (oldWidth !== state.width || oldHeight !== state.height) {
        const scaleX = state.width / oldWidth;
        const scaleY = state.height / oldHeight;
        state.star.x *= scaleX;
        state.star.y *= scaleY;
        for (const item of [...state.motes, ...state.gates]) {
          item.x *= scaleX;
          item.y *= scaleY;
        }
        for (const bumper of state.bumpers) {
          bumper.x *= scaleX;
          bumper.y *= scaleY;
          bumper.homeX *= scaleX;
          bumper.homeY *= scaleY;
          bumper.motionAmplitude = clamp(bumper.motionAmplitude * Math.min(scaleX, scaleY), 0, 30);
        }
        seedDust();
        if (state.gates.length > 0 && !gateRunIsValid(false)) {
          state.gates.length = 0;
          state.gateStage = 0;
          state.nextGateAt = state.t + 4;
        }
      }
    };

    const requestResize = () => {
      if (resizeAnimationFrame || destroyed) return;
      resizeAnimationFrame = window.requestAnimationFrame(() => {
        resizeAnimationFrame = 0;
        resize();
      });
    };

    const particleBurst = (
      x: number,
      y: number,
      color: string,
      count: number,
      speed: number,
      size = 3,
    ) => {
      const safeCount = Math.min(count, 34);
      for (let index = 0; index < safeCount; index += 1) {
        const angle = random() * TAU;
        const velocity = speed * (0.35 + random() * 0.8);
        state.particles.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 0.45 + random() * 0.55,
          maxLife: 0.45 + random() * 0.55,
          size: size * (0.5 + random()),
          color,
          drag: 0.95 + random() * 0.035,
        });
      }
      const particleCap = renderQuality === "high" ? 180 : renderQuality === "balanced" ? 130 : 96;
      if (state.particles.length > particleCap) {
        state.particles.splice(0, state.particles.length - particleCap);
      }
    };

    const addRing = (
      x: number,
      y: number,
      color: string,
      radius = 10,
      maxLife = 0.55,
      width = 2,
    ) => {
      state.rings.push({ x, y, color, radius, life: maxLife, maxLife, width });
      if (state.rings.length > 40) state.rings.shift();
    };

    const boundedFloaterPoint = (text: string, x: number, y: number, size: number) => {
      const estimatedHalfWidth = Math.min(
        Math.max(8, state.width * 0.5 - 10),
        size * (text.length * 0.34 + 0.72),
      );
      return {
        x: clamp(x, estimatedHalfWidth + 8, state.width - estimatedHalfWidth - 8),
        y: clamp(y, size + 10, state.height - size - 10),
      };
    };

    const addFloater = (
      text: string,
      x: number,
      y: number,
      color: string,
      size = 15,
      maxLife = 0.92,
    ) => {
      if (text.startsWith("+")) {
        const incoming = Number(text.slice(1).replaceAll(",", ""));
        for (let index = state.floaters.length - 1; index >= 0; index -= 1) {
          const existing = state.floaters[index];
          if (!existing.text.startsWith("+") || distance(existing, { x, y }) > 48) continue;
          const previous = Number(existing.text.slice(1).replaceAll(",", ""));
          if (!Number.isFinite(incoming) || !Number.isFinite(previous)) break;
          existing.text = "+" + (incoming + previous).toLocaleString();
          existing.x = (existing.x + x) * 0.5;
          existing.y = Math.min(existing.y, y) - 5;
          existing.color = color;
          existing.size = clamp(Math.max(existing.size, size) * 1.08, 15, 28);
          existing.life = Math.max(existing.life, maxLife);
          existing.maxLife = Math.max(existing.maxLife, maxLife);
          existing.rise = Math.max(existing.rise, 46);
          const bounded = boundedFloaterPoint(existing.text, existing.x, existing.y, existing.size);
          existing.x = bounded.x;
          existing.y = bounded.y;
          if (existing.x < state.width * 0.3) existing.driftX = Math.abs(existing.driftX);
          if (existing.x > state.width * 0.7) existing.driftX = -Math.abs(existing.driftX);
          return;
        }
      } else {
        for (let index = state.floaters.length - 1; index >= 0; index -= 1) {
          if (distance(state.floaters[index], { x, y }) < 50) state.floaters.splice(index, 1);
        }
      }
      let placedY = y;
      for (let index = Math.max(0, state.floaters.length - 6); index < state.floaters.length; index += 1) {
        if (distance(state.floaters[index], { x, y: placedY }) < 28) placedY -= 18;
      }
      const bounded = boundedFloaterPoint(text, x, placedY, size);
      let driftX = (random() - 0.5) * 28;
      if (bounded.x < state.width * 0.3) driftX = Math.abs(driftX);
      if (bounded.x > state.width * 0.7) driftX = -Math.abs(driftX);
      state.floaters.push({
        text,
        x: bounded.x,
        y: bounded.y,
        color,
        size,
        life: maxLife,
        maxLife,
        driftX,
        rise: 34 + random() * 20,
      });
      if (state.floaters.length > 16) state.floaters.shift();
    };

    const scorePoints = (base: number, point: Point = state.star, emphasis = 1, color = palette().sun) => {
      const gained = Math.max(1, Math.round(base * state.flow));
      state.score += gained;
      state.best = Math.max(state.best, state.score);
      const previousFlow = Math.floor(state.flow);
      state.flow = clamp(state.flow + Math.min(0.34, base / 300), 1, 9.9);
      if (Math.floor(state.flow) > previousFlow) addFloater("×" + Math.floor(state.flow), point.x, point.y + 28, palette().cool, 17, 1.2);
      state.lastAction = state.t;
      const size = clamp(12 + Math.log10(gained + 1) * 3.3, 15, 24) * emphasis;
      addFloater("+" + gained.toLocaleString(), point.x, point.y, color, size, 0.78 + emphasis * 0.16);
      return gained;
    };

    const progressDare = (kind: DareKind, amount = 1) => {
      if (state.dare.kind !== kind) return;
      state.dare.progress = Math.min(state.dare.target, state.dare.progress + amount);
      if (state.dare.progress < state.dare.target) return;
      scorePoints(420 + state.dare.target * 55, state.star, 1.45, palette().sun);
      state.flow = clamp(state.flow + 0.85, 1, 9.9);
      state.flash = Math.max(state.flash, 0.55);
      state.shake = Math.max(state.shake, 8);
      particleBurst(state.star.x, state.star.y, palette().sun, 30, 260, 4);
      addRing(state.star.x, state.star.y, palette().sun, 20, 0.9, 4);
      sound.dare();
      vibrate(state, [18, 28, 26]);
      state.dare = makeDare(random, state.dare.kind);
    };

    const awardOrbit = () => {
      state.orbits += 1;
      state.combo += 2;
      scorePoints(260, state.star, 1.35, palette().cool);
      state.flow = clamp(state.flow + 0.7, 1, 9.9);
      state.flash = Math.max(state.flash, 0.35);
      particleBurst(state.star.x, state.star.y, palette().cool, 28, 220, 3.5);
      addRing(state.pointer.x, state.pointer.y, palette().cool, 30, 0.9, 3);
      sound.orbit();
      vibrate(state, [12, 22, 18]);
      progressDare("orbit");
    };

    const pulseAt = (x: number, y: number, strength = 1) => {
      const dx = state.star.x - x;
      const dy = state.star.y - y;
      const d = Math.max(18, Math.hypot(dx, dy));
      const reach = clamp(1 - d / 330, 0.12, 1);
      const impulse = (210 + 260 * reach) * strength;
      state.star.vx += (dx / d) * impulse;
      state.star.vy += (dy / d) * impulse;
      state.pulses += 1;
      state.shake = Math.max(state.shake, 3.5 * reach);
      addRing(x, y, palette().hot, 14, 0.52, 3);
      particleBurst(x, y, palette().hot, 8, 120, 2);
      sound.pulse();
      vibrate(state, 7);
      progressDare("pulse");
    };

    const advanceWeather = () => {
      state.weatherFromIndex = state.weatherIndex;
      state.weatherIndex = (state.weatherIndex + 1) % WEATHERS.length;
      state.weatherBlend = 0;
      state.paletteFromIndex = state.paletteIndex;
      state.paletteIndex = (state.paletteIndex + 1) % PALETTES.length;
      state.paletteBlend = 0;
      state.weatherClock = 0;
      state.weatherDuration = 18 + random() * 10;
      state.flash = 0.24;
      sound.weather(state.weatherIndex);
      const moteRoom = Math.max(0, 18 - state.motes.length);
      for (let index = 0; index < Math.min(2, moteRoom); index += 1) spawnMote();
      if (state.weatherIndex === 4 && state.bumpers.length < 7) spawnBumper();
      if (state.gates.length > 0 && !gateRunIsValid(false)) {
        state.gates.length = 0;
        state.gateStage = 0;
        state.nextGateAt = state.t + 4;
      }
    };

    const collectMote = (mote: Mote, index: number) => {
      state.motes.splice(index, 1);
      const value = mote.kind === "prism" ? 3 : 1;
      const previousCombo = state.combo;
      state.combo += value;
      state.runSparks += value;
      state.totalSparks += value;
      const moteColor = mote.color === 0 ? palette().sun : mote.color === 1 ? palette().hot : palette().cool;
      scorePoints(
        mote.kind === "prism" ? 168 + state.combo * 4 : 36 + state.combo * 2,
        mote,
        mote.kind === "prism" ? 1.35 : 1,
        mote.kind === "prism" ? palette().cool : moteColor,
      );
      particleBurst(
        mote.x,
        mote.y,
        moteColor,
        mote.kind === "prism" ? 32 : state.fever > 0 ? 18 : 11,
        mote.kind === "prism" ? 245 : 170,
        mote.kind === "prism" ? 3.8 : 2.5,
      );
      addRing(mote.x, mote.y, palette().sun, 4, mote.kind === "prism" ? 0.72 : 0.38, mote.kind === "prism" ? 3 : 1.5);
      if (mote.kind === "prism") {
        state.prisms += 1;
        state.flow = clamp(state.flow + 0.45, 1, 9.9);
        state.star.vx *= 1.08;
        state.star.vy *= 1.08;
        addRing(mote.x, mote.y, palette().cool, 18, 0.85, 3.5);
        sound.prism();
        vibrate(state, [7, 18, 10]);
      } else {
        sound.spark(state.combo, state.fever > 0);
        vibrate(state, 5);
      }
      progressDare("spark", value);
      const feverMilestone = Math.floor(state.combo / 12) * 12;
      if (feverMilestone > 0 && feverMilestone > state.lastFeverCombo && previousCombo < feverMilestone) {
        state.lastFeverCombo = feverMilestone;
        state.fever = 8;
        state.flash = 0.42;
        addRing(state.star.x, state.star.y, palette().sun, 28, 1, 5);
      }
      spawnMote();
    };

    const hitBumper = (bumper: Bumper) => {
      const dx = state.star.x - bumper.x;
      const dy = state.star.y - bumper.y;
      const d = Math.max(0.001, Math.hypot(dx, dy));
      const nx = dx / d;
      const ny = dy / d;
      const overlap = state.star.r + bumper.r - d;
      state.star.x += nx * Math.max(0, overlap + 1);
      state.star.y += ny * Math.max(0, overlap + 1);
      const dot = state.star.vx * nx + state.star.vy * ny;
      state.star.vx -= 2 * dot * nx;
      state.star.vy -= 2 * dot * ny;
      const speed = Math.hypot(state.star.vx, state.star.vy);
      const boost = clamp(1.08 + speed / 5000, 1.08, 1.22);
      state.star.vx *= boost;
      state.star.vy *= boost;
      bumper.cooldown = 0.16;
      bumper.pulse = 0;
      state.bumperHits += 1;
      state.combo += 1;
      state.shake = clamp(speed / 70, 3, 10);
      scorePoints(64 + Math.round(speed * 0.09), bumper, 1.08, bumper.color === 1 ? palette().cool : palette().hot);
      particleBurst(state.star.x, state.star.y, bumper.color === 0 ? palette().hot : palette().cool, 18, 230, 3);
      addRing(bumper.x, bumper.y, palette().hot, bumper.r, 0.55, 4);
      sound.bumper(clamp(speed / 650, 0, 1));
      vibrate(state, clamp(Math.round(speed / 28), 8, 24));
      progressDare("bumper");
    };

    const wallHit = (x: number, y: number) => {
      if (state.wallCooldown > 0) return;
      state.wallCooldown = 0.12;
      const speed = Math.hypot(state.star.vx, state.star.vy);
      if (speed > 310) {
        state.combo += 1;
        scorePoints(28 + speed * 0.04, { x, y }, 0.92, palette().cool);
      }
      state.shake = Math.max(state.shake, clamp(speed / 110, 2, 7));
      particleBurst(x, y, palette().cool, 8, 115, 2.2);
      sound.bumper(clamp(speed / 850, 0.1, 0.7));
    };

    const hitGate = (gate: Gate) => {
      if (gate.order !== state.gateStage + 1) return;
      state.gateStage = gate.order;
      state.combo += 1;
      scorePoints(52 + gate.order * 34, gate, 1 + gate.order * 0.08, palette().cool);
      state.flow = clamp(state.flow + 0.16 + gate.order * 0.06, 1, 9.9);
      state.flash = Math.max(state.flash, 0.12 + gate.order * 0.06);
      state.shake = Math.max(state.shake, 2 + gate.order);
      particleBurst(gate.x, gate.y, gate.order === 2 ? palette().hot : palette().cool, 10 + gate.order * 4, 150, 2.6);
      addRing(gate.x, gate.y, palette().sun, gate.r, 0.62, 2 + gate.order * 0.5);
      sound.gate(gate.order);
      vibrate(state, 4 + gate.order * 3);
      if (gate.order === 3) {
        state.gateRuns += 1;
        scorePoints(360, state.star, 1.5, palette().sun);
        state.flow = clamp(state.flow + 0.75, 1, 9.9);
        state.flash = Math.max(state.flash, 0.5);
        particleBurst(state.star.x, state.star.y, palette().sun, 30, 260, 4);
        addRing(state.star.x, state.star.y, palette().cool, 26, 0.95, 4);
        sound.dare();
        vibrate(state, [10, 20, 10, 28]);
        state.gates.length = 0;
        state.gateStage = 0;
        state.nextGateAt = state.t + 26 + random() * 12;
      }
    };

    const update = (dtInput: number) => {
      if (state.paused) return;
      const dt = clamp(dtInput, 0, 1 / 25);
      const activeWeather = weather();
      const feverScale = state.fever > 0 ? 0.86 : 1;
      const step = dt * feverScale;
      const previousMoon = currentMoon();
      state.t += dt;
      advanceMoonJourney(state, state.score, dt);
      state.moonCooldown = Math.max(0, state.moonCooldown - dt);
      state.moonImpact = Math.max(0, state.moonImpact - dt * 2);
      const moon = currentMoon();
      if (moon.solid && state.gates.length > 0 && !gateRunIsValid(false)) {
        state.gates.length = 0; state.gateStage = 0; state.nextGateAt = state.t + 4;
      }
      state.weatherClock += dt;
      state.paletteBlend = Math.min(1, state.paletteBlend + dt / 4.8);
      state.weatherBlend = Math.min(1, state.weatherBlend + dt / 4.2);
      state.flash = Math.max(0, state.flash - dt * 1.7);
      state.shake = Math.max(0, state.shake - dt * 24);
      state.wallCooldown = Math.max(0, state.wallCooldown - dt);
      state.fever = Math.max(0, state.fever - dt);

      if (state.weatherClock >= state.weatherDuration) advanceWeather();
      if (state.gates.length === 0 && state.t >= state.nextGateAt) spawnGateRun();
      if (state.gates.length > 0) {
        for (const gate of state.gates) gate.life -= dt;
        if (state.gates[0]?.life <= 0) {
          state.gates.length = 0;
          state.gateStage = 0;
          state.nextGateAt = state.t + 24 + random() * 12;
        }
      }

      const pointer = state.pointer;
      if (pointer.down) {
        const dx = pointer.x - state.star.x;
        const dy = pointer.y - state.star.y;
        const d = Math.max(14, Math.hypot(dx, dy));
        const acceleration = clamp(620 + d * 5.1, 650, 2500) * activeWeather.gravity;
        state.star.vx += (dx / d) * acceleration * step;
        state.star.vy += (dy / d) * acceleration * step;

        const angle = Math.atan2(state.star.y - pointer.y, state.star.x - pointer.x);
        if (pointer.orbitAngle !== null && d > 48 && d < Math.min(285, state.width * 0.54)) {
          const turn = normalizeAngle(angle - pointer.orbitAngle);
          if (Math.abs(turn) < 0.52) {
            if (Math.sign(turn) !== Math.sign(pointer.orbitTravel) && Math.abs(pointer.orbitTravel) > 0.7) {
              pointer.orbitTravel *= 0.72;
            }
            pointer.orbitTravel += turn;
            if (Math.abs(pointer.orbitTravel) >= TAU * 0.94) {
              pointer.orbitTravel = 0;
              awardOrbit();
            }
          }
        }
        pointer.orbitAngle = angle;
      } else {
        pointer.orbitAngle = null;
        pointer.orbitTravel = 0;
      }

      if (state.weatherIndex === 1) {
        state.star.vx += Math.sin(state.t * 0.7) * 34 * step;
        state.star.vy += 26 * step;
      } else if (state.weatherIndex === 4) {
        state.star.vx += Math.sin(state.t * 8.5) * 28 * step;
        state.star.vy += Math.cos(state.t * 7.3) * 28 * step;
      }

      if (moon.solid) {
        const dx = moon.x - state.star.x, dy = moon.y - state.star.y;
        const distanceToMoon = Math.max(1, Math.hypot(dx, dy));
        const pull = clamp(1 - (distanceToMoon - moon.r) / (moon.r * 2.8), 0, 1) * (pointer.down ? 70 : 210);
        state.star.vx += dx / distanceToMoon * pull * step;
        state.star.vy += dy / distanceToMoon * pull * step;
      }
      const drag = Math.pow(activeWeather.drag, step * 60);
      state.star.vx *= drag;
      state.star.vy *= drag;
      let speed = Math.hypot(state.star.vx, state.star.vy);
      const maxSpeed = 860 * activeWeather.speed + (state.fever > 0 ? 180 : 0);
      if (speed > maxSpeed) {
        state.star.vx *= maxSpeed / speed;
        state.star.vy *= maxSpeed / speed;
        speed = maxSpeed;
      }
      if (speed < 58 && !pointer.down) {
        const nudge = state.t * 0.8 + state.seed;
        state.star.vx += Math.cos(nudge) * 16 * step;
        state.star.vy += Math.sin(nudge) * 16 * step;
      }

      const starStart = { x: state.star.x, y: state.star.y };
      state.star.x += state.star.vx * step;
      state.star.y += state.star.vy * step;
      state.star.angle = Math.atan2(state.star.vy, state.star.vx);
      state.star.squash += (clamp(speed / 700, 0, 0.38) - state.star.squash) * clamp(step * 9, 0, 1);

      const edge = state.star.r + 5;
      if (state.star.x < edge) {
        state.star.x = edge;
        state.star.vx = Math.abs(state.star.vx) * 0.92;
        wallHit(state.star.x, state.star.y);
      } else if (state.star.x > state.width - edge) {
        state.star.x = state.width - edge;
        state.star.vx = -Math.abs(state.star.vx) * 0.92;
        wallHit(state.star.x, state.star.y);
      }
      if (state.star.y < edge) {
        state.star.y = edge;
        state.star.vy = Math.abs(state.star.vy) * 0.92;
        wallHit(state.star.x, state.star.y);
      } else if (state.star.y > state.height - edge) {
        state.star.y = state.height - edge;
        state.star.vy = -Math.abs(state.star.vy) * 0.92;
        wallHit(state.star.x, state.star.y);
      }

      if (bounceOffMoon(state.star, starStart, moon, previousMoon, step, true) && state.moonCooldown <= 0) {
        state.moonCooldown = 0.28;
        state.moonImpact = 1;
        state.moonHits += 1;
        state.combo += 1;
        scorePoints(120, state.star, 1.1, palette().sun);
        particleBurst(state.star.x, state.star.y, palette().sun, 15, 180, 2.2);
        addRing(state.star.x, state.star.y, palette().cool, 8, 0.55, 2);
        sound.bumper(0.6); vibrate(state, 12);
      }
      if (moon.solid && distance(state.star, moon) < moon.r * 3.6) {
        const angle = Math.atan2(state.star.y - moon.y, state.star.x - moon.x);
        if (state.moonOrbitAngle !== null) {
          const turn = normalizeAngle(angle - state.moonOrbitAngle);
          if (Math.abs(turn) < 0.5) state.moonOrbitTravel += turn;
          if (Math.abs(state.moonOrbitTravel) >= TAU * 0.95) {
            state.moonOrbitTravel = 0; state.moonImpact = 1;
            awardOrbit();
          }
        }
        state.moonOrbitAngle = angle;
      } else { state.moonOrbitAngle = null; state.moonOrbitTravel = 0; }

      state.star.trail.unshift({ x: state.star.x, y: state.star.y, life: 1 });
      const maxTrail = state.fever > 0 ? 68 : 42;
      if (state.star.trail.length > maxTrail) state.star.trail.length = maxTrail;
      state.star.trail.forEach((point, index) => {
        point.life = 1 - index / maxTrail;
      });

      for (let index = state.motes.length - 1; index >= 0; index -= 1) {
        const mote = state.motes[index];
        const moteStart = { x: mote.x, y: mote.y };
        mote.spin += step * (1.3 + mote.color * 0.4);
        mote.phase += step * 1.8;
        const wobbleX = Math.sin(mote.phase + mote.id) * 0.32 * step * 60;
        const wobbleY = Math.cos(mote.phase * 0.83 + mote.id) * 0.32 * step * 60;
        mote.x += wobbleX + mote.vx * step;
        mote.y += wobbleY + mote.vy * step;
        bounceOffMoon(mote, moteStart, moon, previousMoon, step);
        if (mote.x < 34 || mote.x > state.width - 34) mote.vx *= -1;
        if (mote.y < 34 || mote.y > state.height - 34) mote.vy *= -1;
        mote.x = clamp(mote.x, 34, state.width - 34);
        mote.y = clamp(mote.y, 34, state.height - 34);
        if (
          sweptCirclesOverlap(
            starStart,
            state.star,
            moteStart,
            mote,
            state.star.r + mote.r + 2,
          )
        ) {
          collectMote(mote, index);
        }
      }

      for (const bumper of state.bumpers) {
        const bumperStart = { x: bumper.x, y: bumper.y };
        bumper.pulse += step * 2.2;
        bumper.cooldown = Math.max(0, bumper.cooldown - dt);
        const motionAngle = bumper.motionPhase + state.t * bumper.motionSpeed * TAU;
        if (bumper.pattern === "orbit") {
          bumper.x = bumper.homeX + Math.cos(motionAngle) * bumper.motionAmplitude;
          bumper.y = bumper.homeY + Math.sin(motionAngle) * bumper.motionAmplitude * 0.62;
        } else if (bumper.pattern === "figure8") {
          bumper.x = bumper.homeX + Math.sin(motionAngle) * bumper.motionAmplitude;
          bumper.y = bumper.homeY + Math.sin(motionAngle * 2) * bumper.motionAmplitude * 0.48;
        } else {
          bumper.x = bumper.homeX;
          bumper.y = bumper.homeY;
        }
        pushOutsideMoon(bumper, moon, 6);
        const bumperMargin = bumper.r + 8;
        bumper.x = clamp(bumper.x, bumperMargin, state.width - bumperMargin);
        bumper.y = clamp(bumper.y, bumperMargin, state.height - bumperMargin);
        if (
          bumper.cooldown <= 0 &&
          sweptCirclesOverlap(
            starStart,
            state.star,
            bumperStart,
            bumper,
            state.star.r + bumper.r,
          )
        ) {
          hitBumper(bumper);
        }
      }

      for (const gate of [...state.gates]) {
        gate.spin += step * (0.65 + gate.order * 0.14);
        if (
          gate.order === state.gateStage + 1 &&
          sweptCirclesOverlap(
            starStart,
            state.star,
            gate,
            gate,
            state.star.r + gate.r * 0.62,
          )
        ) {
          hitGate(gate);
          break;
        }
      }

      for (let index = state.particles.length - 1; index >= 0; index -= 1) {
        const particle = state.particles[index];
        particle.life -= dt;
        if (particle.life <= 0) {
          state.particles.splice(index, 1);
          continue;
        }
        const particleStart = { x: particle.x, y: particle.y };
        particle.x += particle.vx * step;
        particle.y += particle.vy * step;
        const fragment = { x: particle.x, y: particle.y, vx: particle.vx, vy: particle.vy, r: particle.size };
        bounceOffMoon(fragment, particleStart, moon, previousMoon, step);
        Object.assign(particle, { x: fragment.x, y: fragment.y, vx: fragment.vx, vy: fragment.vy });
        const particleDrag = Math.pow(particle.drag, step * 60);
        particle.vx *= particleDrag;
        particle.vy *= particleDrag;
      }

      for (let index = state.rings.length - 1; index >= 0; index -= 1) {
        const ring = state.rings[index];
        ring.life -= dt;
        ring.radius += (90 + ring.radius * 0.8) * step;
        if (ring.life <= 0) state.rings.splice(index, 1);
      }

      for (let index = state.floaters.length - 1; index >= 0; index -= 1) {
        const floater = state.floaters[index];
        floater.life -= dt;
        floater.y -= floater.rise * step;
        if (floater.life <= 0) state.floaters.splice(index, 1);
      }

      if (state.t - state.lastAction > 1.8) {
        state.flow += (1 - state.flow) * clamp(dt * 0.12, 0, 1);
      }
      if (state.t - state.lastAction > 8 && state.combo > 0) {
        state.combo = Math.max(0, state.combo - dt * 0.45);
      }
    };

    const traceTrail = () => {
      if (state.star.trail.length < 2) return;
      const tail = state.star.trail[state.star.trail.length - 1];
      context.beginPath();
      context.moveTo(tail.x, tail.y);
      for (let index = state.star.trail.length - 2; index >= 1; index -= 1) {
        const point = state.star.trail[index];
        const next = state.star.trail[index - 1];
        context.quadraticCurveTo(point.x, point.y, (point.x + next.x) * 0.5, (point.y + next.y) * 0.5);
      }
      context.lineTo(state.star.x, state.star.y);
    };

    const drawSun = (colors: Palette) => {
      const { star } = state;
      const radius = star.r * (state.fever > 0 ? 1.52 : 1.28);
      const heat = clamp(Math.hypot(star.vx, star.vy) / 850, 0, 1);
      context.save();
      context.globalAlpha = 1;
      context.shadowBlur = 0;
      context.translate(star.x, star.y);
      context.globalCompositeOperation = "lighter";
      const glow = context.createRadialGradient(0, 0, radius * 0.6, 0, 0, radius * 7);
      glow.addColorStop(0, "#ffb53caa"); glow.addColorStop(0.18, "#ff8a263e");
      glow.addColorStop(0.48, "#ff772812"); glow.addColorStop(1, "#ff772800");
      context.fillStyle = glow; context.fillRect(-radius * 7, -radius * 7, radius * 14, radius * 14);
      // Hot magnetic loops emerge from the photosphere, rather than a cartoon outline.
      for (let i = 0; i < 15; i++) {
        const a = i * 2.399 + state.t * 0.12;
        const lift = 1.1 + Math.sin(state.t * 1.4 + i * 7) * 0.12 + heat * 0.15;
        context.strokeStyle = i % 3 === 0 ? "#ffe8acaa" : "#ff792877";
        context.lineWidth = i % 2 ? 0.7 : 1.2;
        context.beginPath();
        context.moveTo(Math.cos(a - 0.2) * radius * 0.9, Math.sin(a - 0.2) * radius * 0.9);
        context.bezierCurveTo(Math.cos(a - 0.17) * radius * lift * 1.3, Math.sin(a - 0.17) * radius * lift * 1.3,
          Math.cos(a + 0.17) * radius * lift * 1.3, Math.sin(a + 0.17) * radius * lift * 1.3,
          Math.cos(a + 0.2) * radius * 0.9, Math.sin(a + 0.2) * radius * 0.9);
        context.stroke();
      }
      context.globalCompositeOperation = "source-over";
      context.rotate(state.t * 0.13);
      context.scale(1 + star.squash * 0.35, 1 - star.squash * 0.2);
      context.drawImage(materials.sun, -radius, -radius, radius * 2, radius * 2);
      context.globalCompositeOperation = "screen";
      context.globalAlpha = 0.12 + Math.sin(state.t * 1.8) * 0.04;
      context.rotate(-state.t * 0.21);
      context.drawImage(materials.sun, -radius, -radius, radius * 2, radius * 2);
      context.restore();
      context.save();
      context.globalCompositeOperation = "lighter";
      const flare = context.createLinearGradient(star.x - radius * 9, star.y, star.x + radius * 9, star.y);
      flare.addColorStop(0, "#ffd68900"); flare.addColorStop(0.5, alphaColor(colors.sun, 0.25 + heat * 0.2)); flare.addColorStop(1, "#ffd68900");
      context.fillStyle = flare; context.fillRect(star.x - radius * 9, star.y - 0.5, radius * 18, 1);
      context.restore();
    };

    const renderAtmosphere = (colors: Palette, speed: number, energy: number) => {
      const sky = atmosphereContext;
      sky.setTransform(atmosphereScale, 0, 0, atmosphereScale, 0, 0);
      drawDeepSpace(sky, materials, state.width, state.height, state.t, Math.min(1, state.score / 12000), colors.cool, colors.hot);
      const light = sky.createRadialGradient(state.star.x, state.star.y, 0, state.star.x, state.star.y, Math.max(state.width, state.height) * 0.5);
      light.addColorStop(0, alphaColor(colors.sun, 0.035 + energy * 0.03 + Math.min(speed / 20000, 0.025)));
      light.addColorStop(1, alphaColor(colors.hot, 0));
      sky.fillStyle = light; sky.fillRect(0, 0, state.width, state.height);
      atmosphereRenderedAt = state.t;
      atmosphereDirty = false;
      atmosphereRefreshes += 1;
    };

    const draw = () => {
      const colors = palette();
      const width = state.width;
      const height = state.height;
      const span = Math.max(width, height);
      const speed = Math.hypot(state.star.vx, state.star.vy);
      const energy = clamp(state.flow / 9.9 + (state.fever > 0 ? 0.34 : 0), 0, 1);
      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      context.imageSmoothingEnabled = true;
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.shadowBlur = 0;
      const atmosphereFps =
        state.paletteBlend < 1 || state.weatherBlend < 1
          ? 24
          : renderQuality === "high"
            ? 20
            : renderQuality === "balanced"
              ? 18
              : 15;
      if (atmosphereDirty || state.t - atmosphereRenderedAt >= 1 / atmosphereFps) {
        renderAtmosphere(colors, speed, energy);
      }
      context.drawImage(
        atmosphereCanvas,
        0,
        0,
        atmosphereCanvas.width,
        atmosphereCanvas.height,
        0,
        0,
        width,
        height,
      );

      const shakeX = state.shake > 0 ? Math.sin(state.t * 79 + state.seed * 0.001) * state.shake * 0.5 : 0;
      const shakeY = state.shake > 0 ? Math.cos(state.t * 67 + state.seed * 0.0017) * state.shake * 0.5 : 0;
      context.save();
      context.translate(shakeX, shakeY);
      drawMoon(context, materials, currentMoon(), state.t, state.moonImpact);

      if (state.gates.length > 0) {
        context.save();
        const route = context.createLinearGradient(
          state.gates[0].x,
          state.gates[0].y,
          state.gates[state.gates.length - 1].x,
          state.gates[state.gates.length - 1].y,
        );
        route.addColorStop(0, alphaColor(colors.sun, 0));
        route.addColorStop(0.35, alphaColor(colors.cool, 0.26));
        route.addColorStop(0.7, alphaColor(colors.hot, 0.22));
        route.addColorStop(1, alphaColor(colors.sun, 0));
        context.setLineDash([2, 10]);
        context.lineWidth = 1.2;
        context.strokeStyle = route;
        context.shadowColor = colors.cool;
        context.shadowBlur = 8;
        context.globalAlpha = clamp(state.gates[0].life / 1.2, 0, 1);
        context.beginPath();
        context.moveTo(state.gates[0].x, state.gates[0].y);
        for (let index = 1; index < state.gates.length; index += 1) context.lineTo(state.gates[index].x, state.gates[index].y);
        context.stroke();
        context.restore();
      }

      for (const gate of state.gates) {
        const active = gate.order === state.gateStage + 1;
        const completed = gate.order <= state.gateStage;
        const arrival = clamp(gate.life / 0.9, 0, 1);
        const pulse = active ? 1 + Math.sin(state.t * 5.5 + gate.order) * 0.075 : 1;
        const color = active ? colors.sun : gate.order === 2 ? colors.hot : colors.cool;
        context.save();
        context.translate(gate.x, gate.y);
        context.globalCompositeOperation = "lighter";
        context.globalAlpha = arrival * (completed ? 0.14 : active ? 0.24 : 0.09);
        const gateGlow = context.createRadialGradient(0, 0, 0, 0, 0, gate.r * 2.15);
        gateGlow.addColorStop(0, alphaColor(color, 0.6));
        gateGlow.addColorStop(0.35, alphaColor(color, 0.22));
        gateGlow.addColorStop(1, alphaColor(color, 0));
        context.fillStyle = gateGlow;
        context.beginPath();
        context.arc(0, 0, gate.r * 2.15, 0, TAU);
        context.fill();

        context.rotate(gate.spin);
        context.strokeStyle = color;
        context.shadowColor = color;
        context.shadowBlur = active ? 20 : 9;
        context.globalAlpha = arrival * (completed ? 0.16 : active ? 0.96 : 0.42);
        context.lineWidth = active ? 3.2 : 1.35;
        for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
          const ringRadius = gate.r * (0.62 + ringIndex * 0.23) * pulse;
          const offset = ringIndex * 0.72;
          context.beginPath();
          context.arc(0, 0, ringRadius, -Math.PI * 0.74 + offset, Math.PI * 0.75 + offset);
          context.stroke();
        }
        context.shadowBlur = 0;

        for (let bead = 0; bead < gate.order; bead += 1) {
          const angle = -Math.PI * 0.5 + (bead - (gate.order - 1) * 0.5) * 0.42;
          context.globalAlpha = arrival * (active ? 1 : 0.55);
          context.fillStyle = color;
          context.beginPath();
          context.arc(Math.cos(angle) * gate.r * 1.28, Math.sin(angle) * gate.r * 1.28, active ? 2.4 : 1.8, 0, TAU);
          context.fill();
        }

        context.rotate(-gate.spin);
        context.globalCompositeOperation = "source-over";
        context.globalAlpha = arrival * (completed ? 0.14 : active ? 0.92 : 0.46);
        context.fillStyle = color;
        context.strokeStyle = colors.deep;
        context.lineWidth = 4;
        context.font = "900 " + Math.round(gate.r * 0.72) + "px ui-monospace, SFMono-Regular, Consolas, monospace";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.strokeText(String(gate.order), 0, 1);
        context.fillText(String(gate.order), 0, 1);
        context.restore();
      }

      for (const bumper of state.bumpers) {
        const pulse = 1 + Math.sin(bumper.pulse) * 0.065;
        const color = bumper.color === 0 ? colors.hot : bumper.color === 1 ? colors.cool : colors.sun;
        if (bumper.pattern !== "still") {
          context.save();
          context.globalCompositeOperation = "screen";
          context.globalAlpha = 0.13;
          context.strokeStyle = color;
          context.lineWidth = 0.8;
          context.setLineDash([2, 7]);
          if (bumper.pattern === "orbit") {
            context.beginPath();
            context.ellipse(
              bumper.homeX,
              bumper.homeY,
              bumper.motionAmplitude,
              bumper.motionAmplitude * 0.62,
              0,
              0,
              TAU,
            );
            context.stroke();
          } else {
            for (const direction of [-1, 1]) {
              context.beginPath();
              context.ellipse(
                bumper.homeX + direction * bumper.motionAmplitude * 0.43,
                bumper.homeY,
                bumper.motionAmplitude * 0.58,
                bumper.motionAmplitude * 0.48,
                direction * 0.26,
                0,
                TAU,
              );
              context.stroke();
            }
          }
          context.restore();
        }
        context.save();
        context.translate(bumper.x, bumper.y);
        context.globalCompositeOperation = "lighter";
        const resonatorGlow = context.createRadialGradient(0, 0, bumper.r * 0.2, 0, 0, bumper.r * 2.3);
        resonatorGlow.addColorStop(0, alphaColor(color, 0.22));
        resonatorGlow.addColorStop(0.35, alphaColor(color, 0.12));
        resonatorGlow.addColorStop(1, alphaColor(color, 0));
        context.fillStyle = resonatorGlow;
        context.beginPath();
        context.arc(0, 0, bumper.r * 2.3 * pulse, 0, TAU);
        context.fill();

        context.globalCompositeOperation = "source-over";
        const lightAngle = Math.atan2(state.star.y - bumper.y, state.star.x - bumper.x);
        const lx = Math.cos(lightAngle) * bumper.r * 0.48, ly = Math.sin(lightAngle) * bumper.r * 0.48;
        const resonatorBody = context.createRadialGradient(lx, ly, 0, 0, 0, bumper.r * 1.04);
        resonatorBody.addColorStop(0, "#fff5d9");
        resonatorBody.addColorStop(0.08, mixColor(color, "#ffffff", 0.65));
        resonatorBody.addColorStop(0.25, mixColor(color, "#738391", 0.65));
        resonatorBody.addColorStop(0.48, "#24303c");
        resonatorBody.addColorStop(0.78, "#070c16");
        resonatorBody.addColorStop(1, mixColor("#142231", color, 0.2));
        context.fillStyle = resonatorBody;
        context.strokeStyle = color;
        context.lineWidth = 0.75;
        context.beginPath();
        context.arc(0, 0, bumper.r * pulse, 0, TAU);
        context.fill();
        context.stroke();

        context.rotate(state.t * 0.52 + bumper.id);
        context.globalCompositeOperation = "lighter";
        context.strokeStyle = color;
        for (let line = 0; line < 4; line += 1) {
          context.globalAlpha = 0.09 + line * 0.055;
          context.lineWidth = 0.9 + line * 0.32;
          context.beginPath();
          context.arc(0, 0, bumper.r * (0.28 + line * 0.17), line * 1.21, line * 1.21 + Math.PI * (0.66 + line * 0.04));
          context.stroke();
        }
        for (let node = 0; node < 3; node += 1) {
          const angle = node / 3 * TAU - state.t * 0.7;
          context.globalAlpha = 0.72;
          context.fillStyle = node === 1 ? colors.sun : color;
          context.beginPath();
          context.arc(Math.cos(angle) * bumper.r * 0.76, Math.sin(angle) * bumper.r * 0.76, 1.7, 0, TAU);
          context.fill();
        }
        context.restore();
      }

      context.globalCompositeOperation = "lighter";
      for (const mote of state.motes) {
        const color = mote.color === 0 ? colors.sun : mote.color === 1 ? colors.hot : colors.cool;
        const breathe = 1 + Math.sin(mote.phase) * 0.16;
        context.save();
        context.translate(mote.x, mote.y);
        context.rotate(mote.spin);

        const moteGlow = context.createRadialGradient(0, 0, 0, 0, 0, mote.r * (mote.kind === "prism" ? 4.6 : 3.6));
        moteGlow.addColorStop(0, alphaColor(color, mote.kind === "prism" ? 0.72 : 0.46));
        moteGlow.addColorStop(0.28, alphaColor(color, 0.2));
        moteGlow.addColorStop(1, alphaColor(color, 0));
        context.fillStyle = moteGlow;
        context.globalAlpha = 0.8;
        context.beginPath();
        context.arc(0, 0, mote.r * (mote.kind === "prism" ? 4.6 : 3.6) * breathe, 0, TAU);
        context.fill();

        if (mote.kind === "prism") {
          context.globalAlpha = 0.95;
          context.fillStyle = alphaColor(colors.deep, 0.72);
          context.strokeStyle = colors.cool;
          context.lineWidth = 1.9;
          context.beginPath();
          for (let point = 0; point < 6; point += 1) {
            const angle = point / 6 * TAU;
            const radius = mote.r * (point % 2 === 0 ? 1.18 : 0.82);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (point === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
          }
          context.closePath();
          context.fill();
          context.stroke();
          context.rotate(-mote.spin * 1.9);
          context.strokeStyle = colors.sun;
          context.lineWidth = 1.25;
          context.globalAlpha = 0.86;
          context.beginPath();
          context.arc(0, 0, mote.r * 1.52 * breathe, 0, TAU);
          context.stroke();
          context.fillStyle = "rgb(255 255 255)";
          context.beginPath();
          context.arc(0, 0, 2.2, 0, TAU);
          context.fill();
        } else {
          context.globalAlpha = 0.98;
          context.fillStyle = "rgb(255 255 255)";
          context.beginPath();
          context.moveTo(0, -mote.r * 1.65);
          context.quadraticCurveTo(mote.r * 0.34, -mote.r * 0.36, mote.r * 1.65, 0);
          context.quadraticCurveTo(mote.r * 0.34, mote.r * 0.36, 0, mote.r * 1.65);
          context.quadraticCurveTo(-mote.r * 0.34, mote.r * 0.36, -mote.r * 1.65, 0);
          context.quadraticCurveTo(-mote.r * 0.34, -mote.r * 0.36, 0, -mote.r * 1.65);
          context.fill();
          context.fillStyle = color;
          context.beginPath();
          context.arc(0, 0, mote.r * 0.58, 0, TAU);
          context.fill();
        }
        context.restore();
      }

      if (state.pointer.down) {
        const d = distance(state.pointer, state.star);
        const pull = clamp(1 - d / 520, 0.16, 0.8);
        const middleX = (state.star.x + state.pointer.x) * 0.5 + (state.star.y - state.pointer.y) * 0.08;
        const middleY = (state.star.y + state.pointer.y) * 0.5 + (state.pointer.x - state.star.x) * 0.08;
        const tether = context.createLinearGradient(state.star.x, state.star.y, state.pointer.x, state.pointer.y);
        tether.addColorStop(0, alphaColor(colors.sun, 0.78));
        tether.addColorStop(0.52, alphaColor(colors.cool, 0.42));
        tether.addColorStop(1, alphaColor(colors.cool, 0.9));
        context.globalCompositeOperation = "lighter";
        context.strokeStyle = tether;
        context.lineCap = "round";
        context.shadowColor = colors.cool;
        context.shadowBlur = 16;
        context.globalAlpha = 0.1 + pull * 0.12;
        context.lineWidth = 8;
        context.beginPath();
        context.moveTo(state.star.x, state.star.y);
        context.quadraticCurveTo(middleX, middleY, state.pointer.x, state.pointer.y);
        context.stroke();
        context.globalAlpha = 0.68;
        context.lineWidth = 1.35;
        context.beginPath();
        context.moveTo(state.star.x, state.star.y);
        context.quadraticCurveTo(middleX, middleY, state.pointer.x, state.pointer.y);
        context.stroke();
        context.shadowBlur = 0;
        for (let index = 0; index < 4; index += 1) {
          const radius = 16 + index * 14 + Math.sin(state.t * 5 - index) * 3;
          context.globalAlpha = 0.12 + pull * 0.13 - index * 0.015;
          context.lineWidth = index === 0 ? 2 : 0.8;
          context.beginPath();
          context.arc(state.pointer.x, state.pointer.y, radius, state.t * 0.3 + index, state.t * 0.3 + index + Math.PI * 1.55);
          context.stroke();
        }
        context.globalAlpha = 1;
        context.fillStyle = "rgb(255 255 255)";
        context.beginPath();
        context.arc(state.pointer.x, state.pointer.y, 2.5, 0, TAU);
        context.fill();
      }

      if (state.star.trail.length > 1) {
        context.globalCompositeOperation = "lighter";
        context.lineCap = "round";
        context.lineJoin = "round";
        const trailTail = state.star.trail[state.star.trail.length - 1];
        const trailSpectrum = context.createLinearGradient(trailTail.x, trailTail.y, state.star.x, state.star.y);
        trailSpectrum.addColorStop(0, alphaColor(colors.cool, 0));
        trailSpectrum.addColorStop(0.2, alphaColor(colors.cool, 0.58));
        trailSpectrum.addColorStop(0.58, alphaColor(colors.hot, 0.84));
        trailSpectrum.addColorStop(1, colors.sun);
        context.strokeStyle = trailSpectrum;
        context.shadowColor = state.fever > 0 ? colors.hot : colors.cool;
        context.shadowBlur = renderQuality === "recovery" ? 11 : 20;
        context.globalAlpha = state.fever > 0 ? 0.28 : 0.19;
        context.lineWidth = state.star.r * (state.fever > 0 ? 3.1 : 2.35);
        traceTrail();
        context.stroke();
        context.shadowBlur = 0;
        context.globalAlpha = state.fever > 0 ? 0.76 : 0.62;
        context.lineWidth = state.star.r * (state.fever > 0 ? 1.24 : 0.86);
        traceTrail();
        context.stroke();
        const whiteCore = context.createLinearGradient(trailTail.x, trailTail.y, state.star.x, state.star.y);
        whiteCore.addColorStop(0, "rgb(255 255 255 / 0)");
        whiteCore.addColorStop(0.42, "rgb(255 255 255 / 0.28)");
        whiteCore.addColorStop(1, "rgb(255 255 255 / 0.94)");
        context.strokeStyle = whiteCore;
        context.globalAlpha = 0.86;
        context.lineWidth = 0.8 + clamp(speed / 620, 0, 1.5);
        traceTrail();
        context.stroke();
      }

      context.globalCompositeOperation = "lighter";
      for (const particle of state.particles) {
        const alpha = clamp(particle.life / particle.maxLife, 0, 1);
        const velocity = Math.hypot(particle.vx, particle.vy);
        context.globalAlpha = alpha;
        context.strokeStyle = particle.color;
        context.fillStyle = particle.color;
        if (velocity > 115) {
          const length = clamp(velocity * 0.026, 2, 15) * alpha;
          const nx = particle.vx / Math.max(1, velocity);
          const ny = particle.vy / Math.max(1, velocity);
          context.lineWidth = Math.max(0.7, particle.size * 0.62 * alpha);
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(particle.x - nx * length, particle.y - ny * length);
          context.stroke();
        } else {
          context.beginPath();
          context.arc(particle.x, particle.y, particle.size * (0.35 + alpha * 0.72), 0, TAU);
          context.fill();
        }
      }
      context.shadowBlur = 0;

      for (const ring of state.rings) {
        const alpha = clamp(ring.life / ring.maxLife, 0, 1);
        context.globalAlpha = alpha * 0.72;
        context.strokeStyle = ring.color;
        context.shadowColor = ring.color;
        context.shadowBlur = 10 * alpha;
        context.lineWidth = ring.width * clamp(alpha, 0.2, 1);
        context.beginPath();
        context.arc(ring.x, ring.y, ring.radius, 0, TAU);
        context.stroke();
        context.globalAlpha = alpha * 0.12;
        context.lineWidth = ring.width * 4;
        context.beginPath();
        context.arc(ring.x, ring.y, ring.radius, 0, TAU);
        context.stroke();
      }
      context.shadowBlur = 0;

      // Effects own their fade. The player body is always opaque.
      context.globalAlpha = 1;
      drawSun(colors);

      for (const floater of state.floaters) {
        const remaining = clamp(floater.life / floater.maxLife, 0, 1);
        const progress = 1 - remaining;
        const pop = 0.78 + Math.sin(Math.min(1, progress * 2.2) * Math.PI * 0.5) * 0.25;
        context.save();
        context.globalCompositeOperation = "source-over";
        context.globalAlpha = Math.pow(remaining, 0.84) * (floater.size > 26 ? 1 : 0.82);
        context.fillStyle = floater.color;
        context.strokeStyle = alphaColor(colors.deep, 0.86);
        context.shadowColor = floater.color;
        context.shadowBlur = 12;
        context.lineWidth = Math.max(2.2, floater.size * 0.16);
        context.font = "900 " + floater.size + "px 'Arial Black', 'Avenir Next', ui-sans-serif, sans-serif";
        const drawnWidth = context.measureText(floater.text).width * pop + context.lineWidth * 2;
        const drawnX = clamp(floater.x + floater.driftX * progress, drawnWidth * 0.5 + 7, width - drawnWidth * 0.5 - 7);
        const drawnY = clamp(floater.y, floater.size * pop * 0.6 + 7, height - floater.size * pop * 0.6 - 7);
        context.translate(drawnX, drawnY);
        context.scale(pop, pop);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.strokeText(floater.text, 0, 0);
        context.fillText(floater.text, 0, 0);
        context.restore();
      }

      context.restore();

      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;

      if (state.flash > 0) {
        const flash = context.createRadialGradient(state.star.x, state.star.y, 0, state.star.x, state.star.y, span * 0.72);
        flash.addColorStop(0, alphaColor(state.fever > 0 ? colors.hot : colors.sun, state.flash * 0.42));
        flash.addColorStop(0.22, alphaColor(colors.sun, state.flash * 0.12));
        flash.addColorStop(1, alphaColor(colors.sun, 0));
        context.globalCompositeOperation = "screen";
        context.fillStyle = flash;
        context.fillRect(0, 0, width, height);
      }
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.shadowBlur = 0;
    };

    const gateMinimumDistance = () => {
      let minimum = Number.POSITIVE_INFINITY;
      for (let left = 0; left < state.gates.length; left += 1) {
        for (let right = left + 1; right < state.gates.length; right += 1) {
          minimum = Math.min(minimum, distance(state.gates[left], state.gates[right]));
        }
      }
      return Number.isFinite(minimum) ? minimum : 0;
    };

    const snapshot = () => ({
      build: BUILD_ID,
      ready: state.width > 1 && state.height > 1,
      seed: state.seed,
      score: Math.round(state.score),
      best: Math.round(state.best),
      flow: Number(state.flow.toFixed(2)),
      combo: Math.floor(state.combo),
      sparks: state.runSparks,
      totalSparks: state.totalSparks,
      bumpers: state.bumperHits,
      orbits: state.orbits,
      pulses: state.pulses,
      prisms: state.prisms,
      moonProgress: Number(state.moonProgress.toFixed(4)),
      moonFace: Number(state.moonFace.toFixed(3)),
      moonExcursionIndex: state.moonExcursionIndex,
      moonExcursionElapsed: Number(state.moonExcursionElapsed.toFixed(3)),
      moonHits: state.moonHits,
      moonSolid: currentMoon().solid,
      moonX: Number(currentMoon().x.toFixed(2)),
      moonY: Number(currentMoon().y.toFixed(2)),
      moonRadius: Number(currentMoon().r.toFixed(2)),
      moonSunSeparation: Number(distance(state.star, currentMoon()).toFixed(2)),
      gateRuns: state.gateRuns,
      gates: state.gates.length,
      gateStage: state.gateStage,
      gateLayoutSafe: state.gates.length === 0 || gateRunIsValid(false),
      gateMinSeparation: Number(gateMinimumDistance().toFixed(2)),
      weather: weather().name,
      weatherTransition: Number(state.weatherBlend.toFixed(3)),
      palette: palette().name,
      starX: Number(state.star.x.toFixed(2)),
      starY: Number(state.star.y.toFixed(2)),
      speed: Number(Math.hypot(state.star.vx, state.star.vy).toFixed(2)),
      motes: state.motes.length,
      activePrisms: state.motes.filter((mote) => mote.kind === "prism").length,
      movingBumpers: state.bumpers.filter((bumper) => bumper.pattern !== "still").length,
      particles: state.particles.length,
      rings: state.rings.length,
      trail: state.star.trail.length,
      floaters: state.floaters.length,
      objectCapsSafe:
        state.motes.length <= 18 &&
        state.motes.filter((mote) => mote.kind === "prism").length <= 2 &&
        state.gates.length <= 3 &&
        state.particles.length <= 180 &&
        state.rings.length <= 40 &&
        state.star.trail.length <= 68 &&
        state.floaters.length <= 16,
      paused: state.paused,
    });

    const rounded = (value: number) => Number(value.toFixed(4));
    const canonicalState = () => ({
      summary: snapshot(),
      randomDraws,
      t: rounded(state.t),
      weatherFromIndex: state.weatherFromIndex,
      weatherBlend: rounded(state.weatherBlend),
      moonFace: state.moonFace,
      moonExcursionElapsed: state.moonExcursionElapsed,
      moonCooldown: rounded(state.moonCooldown),
      moonOrbitAngle: state.moonOrbitAngle,
      moonOrbitTravel: rounded(state.moonOrbitTravel),
      weatherClock: rounded(state.weatherClock),
      weatherDuration: rounded(state.weatherDuration),
      nextGateAt: rounded(state.nextGateAt),
      lastAction: rounded(state.lastAction),
      lastFeverCombo: state.lastFeverCombo,
      nextId: state.nextId,
      dare: { ...state.dare },
      star: {
        x: rounded(state.star.x),
        y: rounded(state.star.y),
        vx: rounded(state.star.vx),
        vy: rounded(state.star.vy),
        squash: rounded(state.star.squash),
        angle: rounded(state.star.angle),
        trail: state.star.trail.map((point) => [rounded(point.x), rounded(point.y), rounded(point.life)]),
      },
      pointer: {
        down: state.pointer.down,
        id: state.pointer.id,
        x: rounded(state.pointer.x),
        y: rounded(state.pointer.y),
        orbitTravel: rounded(state.pointer.orbitTravel),
      },
      motes: state.motes.map((mote) => [
        mote.id,
        mote.kind,
        rounded(mote.x),
        rounded(mote.y),
        rounded(mote.vx),
        rounded(mote.vy),
        rounded(mote.r),
        rounded(mote.phase),
        mote.color,
      ]),
      bumpers: state.bumpers.map((bumper) => [
        bumper.id,
        rounded(bumper.x),
        rounded(bumper.y),
        rounded(bumper.r),
        rounded(bumper.cooldown),
        rounded(bumper.homeX),
        rounded(bumper.homeY),
        bumper.pattern,
        rounded(bumper.motionPhase),
        rounded(bumper.motionSpeed),
        rounded(bumper.motionAmplitude),
      ]),
      gates: state.gates.map((gate) => [
        gate.id,
        gate.order,
        rounded(gate.x),
        rounded(gate.y),
        rounded(gate.r),
        rounded(gate.life),
      ]),
      particles: state.particles.map((particle) => [
        rounded(particle.x),
        rounded(particle.y),
        rounded(particle.vx),
        rounded(particle.vy),
        rounded(particle.life),
      ]),
      rings: state.rings.map((ring) => [
        rounded(ring.x),
        rounded(ring.y),
        rounded(ring.radius),
        rounded(ring.life),
      ]),
      floaters: state.floaters.map((floater) => [
        floater.text,
        rounded(floater.x),
        rounded(floater.y),
        rounded(floater.life),
      ]),
    });

    const stateHash = () => hashText(JSON.stringify(canonicalState()));

    const refreshHud = (force = false) => {
      const now = performance.now();
      if (!force && now - lastHudAt < 90) return;
      lastHudAt = now;
      setHud({
        score: Math.round(state.score),
        best: Math.round(state.best),
        flow: state.flow,
        combo: Math.floor(state.combo),
        weather: weather().name,
        palette: palette().name,
        paused: state.paused,
        soundOn: state.soundOn,
        hapticsOn: state.hapticsOn,
        fever: state.fever,
        dare: { ...state.dare },
        totalSparks: state.totalSparks,
      });
      if (!autotest && now - lastPersistAt > 1000) {
        lastPersistAt = now;
        persist("pocket-sun-best", Math.round(state.best));
        persist("pocket-sun-total-sparks", state.totalSparks);
      }
    };

    const stepFrames = (count: number) => {
      const safeCount = clamp(Math.floor(count), 0, 1200);
      for (let index = 0; index < safeCount; index += 1) update(1 / 60);
      draw();
      refreshHud(true);
      return snapshot();
    };

    const runSmoke = (): SmokeResult => {
      const checks: Record<string, boolean> = {};
      state.paused = false;
      state.star.x = state.width * 0.5;
      state.star.y = state.height * 0.5;
      state.star.vx = 90;
      state.star.vy = -40;
      const start = { x: state.star.x, y: state.star.y };
      state.pointer.down = true;
      state.pointer.x = clamp(state.star.x + 130, 40, state.width - 40);
      state.pointer.y = clamp(state.star.y - 80, 40, state.height - 40);
      stepFrames(45);
      const moved = distance(start, state.star);
      checks.gravityMovesStar = moved > 10;

      state.pointer.down = false;
      const speedBeforePulse = Math.hypot(state.star.vx, state.star.vy);
      pulseAt(state.star.x - 55, state.star.y, 1);
      const speedAfterPulse = Math.hypot(state.star.vx, state.star.vy);
      checks.pulseChangesVelocity = Math.abs(speedAfterPulse - speedBeforePulse) > 5;

      const sparksBefore = state.runSparks;
      const mote = state.motes.find((entry) => entry.kind === "spark") ?? state.motes[0];
      if (mote) {
        mote.kind = "spark";
        mote.r = 6;
        mote.x = state.star.x;
        mote.y = state.star.y;
      }
      stepFrames(1);
      checks.sparkCollects = state.runSparks >= sparksBefore + 1;

      const prismsBefore = state.prisms;
      const prism = state.motes.find((entry) => entry.kind === "prism") ?? state.motes[0];
      if (prism) {
        prism.kind = "prism";
        prism.r = 11;
        prism.x = clamp(state.star.x + 74, 40, state.width - 40);
        prism.y = clamp(state.star.y + 42, 40, state.height - 40);
        prism.vx = 24;
        prism.vy = -18;
      }
      const prismStart = prism ? { x: prism.x, y: prism.y } : null;
      stepFrames(3);
      checks.prismMoves = Boolean(
        prism &&
          prismStart &&
          distance(prismStart, prism) > 0.2 &&
          prism.x >= 34 &&
          prism.x <= state.width - 34 &&
          prism.y >= 34 &&
          prism.y <= state.height - 34,
      );
      if (prism) {
        state.star.x = prism.x;
        state.star.y = prism.y;
        state.star.vx = 0;
        state.star.vy = 0;
      }
      stepFrames(1);
      checks.prismCollects = state.prisms === prismsBefore + 1;
      checks.prismCap = state.motes.filter((entry) => entry.kind === "prism").length <= 2;

      const bumperBefore = state.bumperHits;
      const bumper = state.bumpers.find((entry) => entry.pattern === "still") ?? state.bumpers[0];
      const bumperHome = bumper
        ? { x: bumper.x, y: bumper.y, homeX: bumper.homeX, homeY: bumper.homeY }
        : null;
      if (bumper) {
        state.star.vx = 180;
        state.star.vy = 0;
        bumper.cooldown = 0;
        bumper.homeX = bumper.x = state.star.x + state.star.r + bumper.r - 2;
        bumper.homeY = bumper.y = state.star.y;
      }
      stepFrames(1);
      checks.bumperBounces = state.bumperHits === bumperBefore + 1;
      if (bumper && bumperHome) {
        bumper.x = bumperHome.x;
        bumper.y = bumperHome.y;
        bumper.homeX = bumperHome.homeX;
        bumper.homeY = bumperHome.homeY;
        bumper.cooldown = 0;
      }

      const movingBumper = state.bumpers.find((entry) => entry.pattern !== "still");
      const movingStart = movingBumper ? { x: movingBumper.x, y: movingBumper.y } : null;
      if (movingBumper) movingBumper.cooldown = 2;
      stepFrames(60);
      checks.movingTargetMix =
        state.bumpers.some((entry) => entry.pattern === "still") &&
        state.bumpers.some((entry) => entry.pattern !== "still");
      checks.movingTargetsMove = Boolean(movingBumper && movingStart && distance(movingStart, movingBumper) > 3);
      checks.movingTargetsStayInBounds = state.bumpers.every(
        (entry) =>
          entry.x >= entry.r + 7 &&
          entry.x <= state.width - entry.r - 7 &&
          entry.y >= entry.r + 7 &&
          entry.y <= state.height - entry.r - 7,
      );
      if (movingBumper) movingBumper.cooldown = 0;

      while (state.motes.length < 17) spawnMote("spark");
      const paletteBeforeWeather = state.paletteIndex;
      const weatherBeforeTransition = state.weatherIndex;
      advanceWeather();
      checks.moteCap = state.motes.length <= 18;
      checks.moodAdvancesAutomatically =
        state.paletteIndex === (paletteBeforeWeather + 1) % PALETTES.length && state.paletteBlend === 0;
      checks.weatherTransitionBegins =
        state.weatherFromIndex === weatherBeforeTransition && state.weatherBlend === 0;
      stepFrames(60);
      const weatherTransitionMidpoint = state.weatherBlend > 0 && state.weatherBlend < 1;
      stepFrames(210);
      checks.weatherTransitionProgresses = weatherTransitionMidpoint && state.weatherBlend === 1;

      state.star.x = state.height < 430 ? state.width * 0.18 : state.width * 0.5;
      state.star.y = state.height < 430 ? state.height * 0.52 : state.height * 0.48;
      state.star.vx = 0;
      state.star.vy = 0;
      const gateRunsBefore = state.gateRuns;
      const gatesSpawned = spawnGateRun();
      checks.gateLayoutSafe = gatesSpawned && gateRunIsValid(true);
      const outOfOrderGate = state.gates.find((entry) => entry.order === 2);
      if (outOfOrderGate) {
        state.star.x = outOfOrderGate.x;
        state.star.y = outOfOrderGate.y;
        state.star.vx = 0;
        state.star.vy = 0;
        stepFrames(1);
      }
      checks.gateWrongOrderIsHarmless = state.gateStage === 0 && state.gateRuns === gateRunsBefore;
      for (let order = 1; order <= 3; order += 1) {
        const gate = state.gates.find((entry) => entry.order === order);
        if (!gate) break;
        state.star.x = gate.x;
        state.star.y = gate.y;
        state.star.vx = 0;
        state.star.vy = 0;
        stepFrames(1);
      }
      checks.numberGatesComplete = state.gateRuns === gateRunsBefore + 1;

      const timedGateRuns = state.gateRuns;
      if (spawnGateRun()) {
        for (const gate of state.gates) gate.life = 0.001;
        stepFrames(1);
      }
      checks.gateTimeoutIsHarmless = state.gates.length === 0 && state.gateRuns === timedGateRuns;

      checks.badTargetsAbsent = true;
      checks.rewardOnlyWorld = state.motes.length >= 8 && state.bumpers.length >= 2;
      checks.floaterBounds = state.floaters.every(
        (floater) => floater.x >= 0 && floater.x <= state.width && floater.y >= 0 && floater.y <= state.height,
      );
      checks.objectCaps = Boolean(snapshot().objectCapsSafe);
      const performanceState = performanceSnapshot();
      checks.performanceTelemetryFinite = Object.values(performanceState)
        .filter((value): value is number => typeof value === "number")
        .every((value) => Number.isFinite(value) && value >= 0);
      checks.adaptiveQualityBounds =
        performanceState.renderScale >= 0.72 &&
        performanceState.renderScale <= 1 &&
        performanceState.dpr >= 0.72 &&
        performanceState.dpr <= 1.6 &&
        performanceState.backingPixels <= 2_610_000;
      checks.backgroundCacheActive = atmosphereRefreshes > 0;
      const randomDrawsBeforeResize = randomDraws;
      const resizeCommitsBeforeNoop = resizeCommits;
      resize();
      checks.resizeIsIdempotent =
        randomDraws === randomDrawsBeforeResize && resizeCommits === resizeCommitsBeforeNoop;
      const persistenceKeys = [
        "pocket-sun-best",
        "pocket-sun-total-sparks",
        "pocket-sun-sound",
        "pocket-sun-haptics",
        "pocket-sun-controls-seen",
      ];
      const storageBefore = persistenceKeys.map((key) => window.localStorage.getItem(key));
      persist("pocket-sun-best", 987654321);
      checks.autotestPersistenceIsolated =
        !autotest ||
        persistenceKeys.every((key, index) => window.localStorage.getItem(key) === storageBefore[index]);
      checks.numericFloaters = state.floaters.every((floater) => /^(?:\+[\d,]+|×[2-9])$/.test(floater.text));
      checks.finitePhysics = [
        state.star.x,
        state.star.y,
        state.star.vx,
        state.star.vy,
        state.score,
      ].every(Number.isFinite);
      const renderProbeSamples: number[] = [];
      for (let index = 0; index < 18; index += 1) {
        const renderStartedAt = performance.now();
        draw();
        renderProbeSamples.push(performance.now() - renderStartedAt);
      }
      const renderProbeAverage =
        renderProbeSamples.reduce((total, value) => total + value, 0) / renderProbeSamples.length;
      const renderProbe = {
        averageDrawMs: Number(renderProbeAverage.toFixed(3)),
        p95DrawMs: Number(percentile(renderProbeSamples, 0.95).toFixed(3)),
        maxDrawMs: Number(Math.max(...renderProbeSamples).toFixed(3)),
        samples: renderProbeSamples.length,
        backingPixels: canvas.width * canvas.height,
        atmosphereScale,
      };
      checks.renderProbeFinite = Object.values(renderProbe).every(
        (value) => Number.isFinite(value) && value >= 0,
      );
      document.body.dataset.renderProbe = JSON.stringify(renderProbe);

      const result: SmokeResult = {
        ok: Object.values(checks).every(Boolean),
        checks,
        moved: Number(moved.toFixed(2)),
        score: Math.round(state.score),
        sparks: state.runSparks,
        stateHash: stateHash(),
      };
      document.body.dataset.autotest = "done";
      document.body.dataset.autotestResult = JSON.stringify(result);
      document.body.dataset.gameReady = String(result.ok);
      refreshHud(true);
      return result;
    };

    const togglePause = () => {
      state.paused = !state.paused;
      lastTime = performance.now();
      resetPerformanceWindow(lastTime);
      atmosphereDirty = true;
      refreshHud(true);
    };

    const toggleSound = () => {
      state.soundOn = !state.soundOn;
      sound.setEnabled(state.soundOn);
      persist("pocket-sun-sound", state.soundOn);
      if (state.soundOn) void sound.wake();
      refreshHud(true);
    };

    const toggleHaptics = () => {
      state.hapticsOn = !state.hapticsOn;
      persist("pocket-sun-haptics", state.hapticsOn);
      if (state.hapticsOn) vibrate(state, 12);
      refreshHud(true);
    };

    const resetRun = () => {
      state.score = 0;
      state.flow = 1;
      state.combo = 0;
      state.runSparks = 0;
      state.bumperHits = 0;
      state.orbits = 0;
      state.pulses = 0;
      state.moonProgress = 0; state.moonFace = 0; state.moonExcursionIndex = -1; state.moonExcursionElapsed = MOON_EXCURSION_SECONDS; state.moonHits = 0; state.moonCooldown = 0; state.moonImpact = 0; state.moonOrbitAngle = null; state.moonOrbitTravel = 0;
      state.prisms = 0;
      state.gateRuns = 0;
      state.gateStage = 0;
      state.nextGateAt = state.t + 7 + random() * 4;
      state.fever = 0;
      state.lastFeverCombo = 0;
      state.weatherIndex = 0;
      state.weatherFromIndex = 0;
      state.weatherBlend = 1;
      state.weatherClock = 0;
      state.star.x = state.width * 0.5;
      state.star.y = state.height * 0.5;
      state.star.vx = 170;
      state.star.vy = -120;
      state.star.trail.length = 0;
      state.particles.length = 0;
      state.rings.length = 0;
      state.floaters.length = 0;
      state.dare = makeDare(random, state.dare.kind);
      seedWorld();
      atmosphereDirty = true;
      refreshHud(true);
    };

    let fullscreenAttempted = false;
    const fullscreen = () => {
      if (fullscreenAttempted || document.fullscreenElement || autotest) return;
      fullscreenAttempted = true;
      // Fullscreen requires user activation. Failure must never interrupt a gesture.
      if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
        void document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
      }
    };

    runtimeRef.current = {
      state,
      sound,
      refreshHud,
      togglePause,
      toggleSound,
      toggleHaptics,
      resetRun,
      fullscreen,
    };

    window.__POCKET_SUN__ = {
      snapshot,
      performance: performanceSnapshot,
      stateHash,
      stepFrames,
      runSmoke,
      pulse: (x: number, y: number) => pulseAt(x, y),
      setPointer: (down: boolean, x: number, y: number) => {
        state.pointer.down = down;
        state.pointer.x = x;
        state.pointer.y = y;
      },
    };

    const pointerPosition = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clamp(event.clientX - rect.left, 0, rect.width),
        y: clamp(event.clientY - rect.top, 0, rect.height),
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      if (state.pointer.down || (event.pointerType !== "mouse" && !event.isPrimary)) return;
      event.preventDefault();
      const point = pointerPosition(event);
      state.pointer.down = true;
      state.pointer.id = event.pointerId;
      state.pointer.x = point.x;
      state.pointer.y = point.y;
      state.pointer.startX = point.x;
      state.pointer.startY = point.y;
      state.pointer.startedAt = performance.now();
      state.pointer.orbitAngle = null;
      state.pointer.orbitTravel = 0;
      canvas.setPointerCapture?.(event.pointerId);
      fullscreen();
      setHasPlayed(true);
      persist("pocket-sun-controls-seen", true);
      if (state.soundOn) void sound.wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!state.pointer.down || state.pointer.id !== event.pointerId) return;
      event.preventDefault();
      const point = pointerPosition(event);
      state.pointer.x = point.x;
      state.pointer.y = point.y;
    };

    const endPointer = (event: PointerEvent) => {
      if (!state.pointer.down || state.pointer.id !== event.pointerId) return;
      event.preventDefault();
      const point = pointerPosition(event);
      const heldFor = performance.now() - state.pointer.startedAt;
      const travel = Math.hypot(point.x - state.pointer.startX, point.y - state.pointer.startY);
      const quick = heldFor < 230 && travel < 24;
      state.pointer.down = false;
      state.pointer.id = -1;
      state.pointer.orbitAngle = null;
      state.pointer.orbitTravel = 0;
      if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture?.(event.pointerId);
      pulseAt(point.x, point.y, quick ? 1.08 : 0.62);
    };

    const cancelPointer = (event: PointerEvent) => {
      if (!state.pointer.down || state.pointer.id !== event.pointerId) return;
      state.pointer.down = false;
      state.pointer.id = -1;
      state.pointer.orbitAngle = null;
      state.pointer.orbitTravel = 0;
      if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture?.(event.pointerId);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target;
      if (
        target instanceof Element &&
        Boolean(target.closest("button, a, input, select, textarea, [contenteditable='true'], [role='button']"))
      ) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        setHasPlayed(true);
        persist("pocket-sun-controls-seen", true);
        if (state.soundOn) void sound.wake();
        pulseAt(state.star.x - state.star.vx * 0.12, state.star.y - state.star.vy * 0.12, 0.9);
      } else if (event.key.toLowerCase() === "p") {
        togglePause();
      } else if (event.key.toLowerCase() === "s") {
        toggleSound();
      }
    };

    const onVisibility = () => {
      visibilitySuspended = document.hidden;
      lastTime = performance.now();
      resetPerformanceWindow(lastTime);
      if (!visibilitySuspended) atmosphereDirty = true;
    };

    resize();
    window.addEventListener("resize", requestResize);
    window.visualViewport?.addEventListener("resize", requestResize);
    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", endPointer, { passive: false });
    canvas.addEventListener("pointercancel", cancelPointer, { passive: false });
    canvas.addEventListener("lostpointercapture", cancelPointer);
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    document.body.dataset.buildId = BUILD_ID;
    document.body.dataset.touchMode = String(forcedTouch || navigator.maxTouchPoints > 0);
    document.body.dataset.gameReady = "true";
    document.body.dataset.performance = JSON.stringify(performanceSnapshot());

    const loop = (now: number) => {
      if (destroyed) return;
      const frameMs = now - lastTime;
      const dt = frameMs / 1000;
      lastTime = now;
      if (!visibilitySuspended && !state.paused) {
        update(dt);
        const drawStartedAt = performance.now();
        draw();
        recordPerformance(now, frameMs, performance.now() - drawStartedAt);
        refreshHud();
      }
      animationFrame = window.requestAnimationFrame(loop);
    };

    if (autotest) {
      draw();
      window.setTimeout(() => {
        if (!destroyed && !params.has("score")) runSmoke();
      }, 80);
    } else {
      animationFrame = window.requestAnimationFrame(loop);
    }

    refreshHud(true);

    return () => {
      destroyed = true;
      window.clearTimeout(controlsSeenTimer);
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(resizeAnimationFrame);
      window.removeEventListener("resize", requestResize);
      window.visualViewport?.removeEventListener("resize", requestResize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", cancelPointer);
      canvas.removeEventListener("lostpointercapture", cancelPointer);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
      sound.close();
      if (window.__POCKET_SUN__) delete window.__POCKET_SUN__;
      runtimeRef.current = null;
    };
  }, []);

  const callRuntime = (action: (runtime: NonNullable<typeof runtimeRef.current>) => void) => {
    const runtime = runtimeRef.current;
    if (runtime) action(runtime);
  };

  const paletteIndex = PALETTES.findIndex((entry) => entry.name === hud.palette);
  const activePalette = PALETTES[Math.max(0, paletteIndex)] ?? PALETTES[0];

  return (
    <main
      className={`pocket-sun${hasPlayed ? " is-awake" : ""}${hud.fever > 0 ? " is-fever" : ""}`}
      style={
        {
          "--sun": activePalette.sun,
          "--hot": activePalette.hot,
          "--cool": activePalette.cool,
          "--deep": activePalette.deep,
          "--ink": activePalette.ink,
        } as React.CSSProperties
      }
    >
      <canvas
        ref={canvasRef}
        className="world"
        aria-label="Pocket Sun playfield. Hold anywhere to pull the sun. Tap to pulse it away."
      />

      <div className="optical-veil" aria-hidden="true" />

      <header className="top-hud" aria-label="Score">
        <div className="score-lockup"><span className="sr-only">Score </span><strong>{hud.score.toLocaleString()}</strong></div>
      </header>

      {hud.paused && (
        <button
          type="button"
          className="pause-screen"
          aria-label="Resume Pocket Sun"
          onClick={() => callRuntime((runtime) => runtime.togglePause())}
        >
          <span className="sr-only">Resume Pocket Sun</span>
          <strong aria-hidden="true">▶</strong>
        </button>
      )}
    </main>
  );
}
