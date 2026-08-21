(() => {
  'use strict';

  /*
   * KICK BALL // LUNAR VELOCITY
   * A first-person lunar action-platformer built around one persistent ball.
   * Three.js r161 is vendored locally as a classic global in vendor/three.min.js.
   */

  const T = globalThis.THREE;
  const canvas = document.getElementById('gameCanvas');
  const fatal = message => {
    document.body.dataset.boot = 'failed';
    const overlay = document.getElementById('startOverlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      const title = document.getElementById('startTitle');
      const copy = document.getElementById('startCopy');
      if (title) title.textContent = 'THE MOON DID NOT BOOT';
      if (copy) copy.textContent = message;
    }
  };
  if (!T || !canvas) {
    fatal(!T ? 'The local Three.js runtime is missing.' : 'The game canvas is missing.');
    return;
  }

  const params = new URLSearchParams(location.search);
  const TEST_MODE = params.has('autotest');
  const AUTO_START = TEST_MODE || params.has('autostart');
  const FORCE_TOUCH = params.has('touch');
  const GAME_VERSION = '5.0.0-moonkick';
  const FEEL_PROFILE = Object.freeze({
    name: 'zip-core',
    // Reconstructs the pre-guided-line cadence while retaining the current
    // centered ball, circular meter, dense moon, tether routing, and effects.
    outboundBase: .62,
    outboundCharge: .50,
    controlledClockScale: .50,
    // Holding RMB briefly is how a quick call is performed. The clock only
    // slows once the hold outlives the quick-call window, so reaching for
    // the recall can never be the thing that keeps the ball away longer.
    controlledClockGrace: .27,
    hardAwayBase: 1.35,
    hardAwayCharge: .45,
    bounceReturnTime: .52,
    freeGuideStrength: 9.5,
    linkedGuideStrength: 13.5,
    linkedRangeMultiplier: 1.08,
    controlledGravity: 4.4,
    freeGravity: 5.25,
    flightSpinBase: .72,
    flightSpinPower: .18,
    returnFallback: 2.65,
    returnStuckFallback: .72,
    // MOONBREAK 2.1 return law: the ball flies home at least this fast, keeps
    // most of the speed the throw earned, and a called return stays hot for
    // its whole flight instead of cooling off with a 0.12 s input buffer.
    returnSpeedFloor: 36,
    returnSpeedRetention: .93,
    returnSpeedCap: 68,
    returnSnapBonus: 17,
    // A CALLED return zips from anywhere: beyond reachStart metres the snap
    // bonus grows per metre and the cap lifts, so RMB from 70 m tears home.
    returnSnapReachStart: 15,
    returnSnapReachRate: .5,
    returnSnapCap: 98,
    // Exponential velocity bend (MOONBREAK 2.1's exact steering law). A rate
    // instead of an accel cap: the wronger the velocity, the harder it is
    // corrected, so a recalled ball whips around instead of coasting 5 m
    // further away while a 200 m/s² budget slowly wins the argument.
    returnBendRate: 9,
    returnSnapBendRate: 15,
  });
  const QUALITY_STORAGE_KEY = 'kickball-lunar-quality-v2';
  const FIXED_DT = 1 / 120;
  const TAU = Math.PI * 2;
  const UP = new T.Vector3(0, 1, 0);
  const ZERO = new T.Vector3();
  const EMPTY_SOLIDS = Object.freeze([]);
  const ONE_SCALE = new T.Vector3(1, 1, 1);
  const WHITE = new T.Color(0xffffff);
  const ZERO_MATRIX = new T.Matrix4().makeScale(0, 0, 0);

  // ---- RADIAL GRAVITY ------------------------------------------------------
  // Turning this moon into a real sphere means gravity stops being -Y and
  // starts pointing at a centre. That is the single change that killed the
  // 5.0 build's cadence, so it gets tested BEFORE anything is rewritten
  // around it: ?radial=1 swaps only the gravity direction, on the real code,
  // and tests/cadence.mjs then says whether the return law still holds.
  //
  // The centre sits PLANET_RADIUS below the origin so the surface the player
  // already stands on is the surface of the sphere -- nothing else moves.
  // ?radial=<R> is now only a radius override for experiments.
  const PLANET_RADIUS = Number(params.get('radial')) > 1 ? Number(params.get('radial')) : 420;
  const RADIAL_GRAVITY = true;
  const PLANET_CENTRE = new T.Vector3(0, -PLANET_RADIUS, 0);
  const upScratch = new T.Vector3();
  // Local up at a point. Flat mode returns world +Y, so every call site can be
  // converted ahead of the switch being thrown and behave identically.
  function upAt(position, target = upScratch) {
    if (!RADIAL_GRAVITY) return target.copy(UP);
    target.copy(position).sub(PLANET_CENTRE);
    const length = target.length();
    return length > 1e-6 ? target.multiplyScalar(1 / length) : target.copy(UP);
  }

  // ---- THE CHART -----------------------------------------------------------
  // One azimuthal-equidistant chart maps the authored plane onto the sphere:
  // planar distance from the origin becomes arc distance from the chart pole,
  // so every authored coordinate in this file keeps meaning exactly what it
  // meant on the flat build. Content records stay in chart coordinates for
  // ever; only meshes get lifted. The player and ball live in world space and
  // convert at the query boundary.
  //
  // While SPHERE_WORLD is false every mapping below is the identity, which is
  // how each call site gets converted -- and proven untouched by the whole
  // suite -- before the switch is thrown. RADIAL_GRAVITY bends gravity;
  // SPHERE_WORLD bends the world. The cadence proof needed them separable.
  const SPHERE_WORLD = true;
  const PLANET = Object.freeze({
    radius: PLANET_RADIUS,
    centre: PLANET_CENTRE,
    antipode: Math.PI * PLANET_RADIUS,
  });
  const dirScratch = new T.Vector3();
  // Unit radial direction at a world position (world +Y while flat).
  function dirAt(position, target = dirScratch) {
    if (!SPHERE_WORLD) return target.copy(UP);
    target.copy(position).sub(PLANET_CENTRE);
    const length = target.length();
    return length > 1e-6 ? target.multiplyScalar(1 / length) : target.copy(UP);
  }
  // Radial altitude above the sphere datum (plain world Y while flat).
  function altAt(position) {
    if (!SPHERE_WORLD) return position.y;
    return Math.hypot(position.x, position.y + PLANET.radius, position.z) - PLANET.radius;
  }
  // Rewrite a world position's radial altitude in place (plain .y while flat).
  function setAltAt(position, value) {
    if (!SPHERE_WORLD) { position.y = value; return position; }
    const dir = dirAt(position, dirScratch);
    return position.copy(dir).multiplyScalar(PLANET.radius + value).add(PLANET.centre);
  }
  // Chart coordinates of a world position. Writes x/z onto target.
  function chartAt(position, target) {
    if (!SPHERE_WORLD) { target.x = position.x; target.z = position.z; return target; }
    const py = position.y + PLANET.radius;
    const horizontal = Math.hypot(position.x, position.z);
    if (horizontal < 1e-9) {
      target.x = 0;
      target.z = py < 0 ? PLANET.antipode : 0;
      return target;
    }
    const rho = PLANET.radius * Math.atan2(horizontal, py);
    target.x = position.x * (rho / horizontal);
    target.z = position.z * (rho / horizontal);
    return target;
  }
  // Chart point + radial altitude back to a world position.
  function chartLift(x, alt, z, target) {
    if (!SPHERE_WORLD) return target.set(x, alt, z);
    const rho = Math.hypot(x, z);
    if (rho < 1e-9) return target.set(0, alt, 0);
    const theta = rho / PLANET.radius;
    const reach = (PLANET.radius + alt) * Math.sin(theta);
    target.set(x * (reach / rho), (PLANET.radius + alt) * Math.cos(theta) - PLANET.radius, z * (reach / rho));
    return target;
  }
  // In-place converters between a world-space Vector3 and its chart
  // representation (x = chart x, y = radial altitude, z = chart z). Identity
  // while flat; used by solvers that run legacy planar math in chart space.
  const chartVecScratch = { x: 0, z: 0 };
  function toChartVec(v) {
    if (!SPHERE_WORLD) return v;
    const alt = altAt(v);
    chartAt(v, chartVecScratch);
    return v.set(chartVecScratch.x, alt, chartVecScratch.z);
  }
  function fromChartVec(v) {
    if (!SPHERE_WORLD) return v;
    return chartLift(v.x, v.y, v.z, v);
  }
  // The orientation that stands a +Y-built object up on the sphere at a chart
  // point: the minimal rotation carrying world +Y to the local vertical --
  // which is exactly the chart frame's own basis (great-circle transport of
  // the pole frame), so chart-space yaws compose with it directly.
  const liftQuatDirScratch = new T.Vector3();
  function liftQuatAt(chartX, chartZ, target) {
    if (!SPHERE_WORLD) return target.identity();
    return target.setFromUnitVectors(UP, chartDirAt(chartX, chartZ, liftQuatDirScratch));
  }
  // Unit radial direction of a chart point.
  function chartDirAt(x, z, target) {
    if (!SPHERE_WORLD) return target.copy(UP);
    const rho = Math.hypot(x, z);
    if (rho < 1e-9) return target.copy(UP);
    const theta = rho / PLANET.radius;
    const reach = Math.sin(theta);
    return target.set(x * (reach / rho), Math.cos(theta), z * (reach / rho));
  }
  // The local orthonormal tangent frame whose axes are the chart's own X and Z
  // directions carried along the great circle from the pole. At the origin it
  // is the world frame exactly; while SPHERE_WORLD is false it is the world
  // frame everywhere. Physics responses computed in chart components map back
  // to world space through ex/up/ez.
  class ChartFrame {
    constructor() {
      this.x = 0;
      this.z = 0;
      this.alt = 0;
      this.up = new T.Vector3(0, 1, 0);
      this.ex = new T.Vector3(1, 0, 0);
      this.ez = new T.Vector3(0, 0, 1);
      this.sr = new T.Vector3();
      this.sp = new T.Vector3();
    }
  }
  function chartFrameAt(position, frame) {
    chartAt(position, frame);
    frame.alt = altAt(position);
    if (!SPHERE_WORLD) {
      frame.up.set(0, 1, 0);
      frame.ex.set(1, 0, 0);
      frame.ez.set(0, 0, 1);
      return frame;
    }
    const up = dirAt(position, frame.up);
    const rho = Math.hypot(frame.x, frame.z);
    if (rho < 1e-6 || Math.hypot(up.x, up.z) < 1e-9) {
      frame.ex.set(1, 0, 0);
      frame.ez.set(0, 0, 1);
      return frame;
    }
    // Azimuthal direction and away-from-pole direction on the surface.
    frame.sp.set(-up.z, 0, up.x).normalize();
    frame.sr.crossVectors(up, frame.sp);
    const ax = frame.x / rho, az = frame.z / rho;
    frame.ex.copy(frame.sr).multiplyScalar(ax).addScaledVector(frame.sp, -az);
    frame.ez.copy(frame.sr).multiplyScalar(az).addScaledVector(frame.sp, ax);
    return frame;
  }
  // Vertical-speed accessors against a local up. The fast path keeps the flat
  // build bit-identical: with up = +Y these are literally the old .y accesses.
  function vspeedOf(velocity, up) {
    if (up.x === 0 && up.z === 0 && up.y === 1) return velocity.y;
    return velocity.dot(up);
  }
  function setVspeed(velocity, up, value) {
    if (up.x === 0 && up.z === 0 && up.y === 1) { velocity.y = value; return velocity; }
    return velocity.addScaledVector(up, value - velocity.dot(up));
  }
  // Tangential (horizontal) part of a vector against a local up, into target.
  function tangentOf(vector, up, target) {
    if (up.x === 0 && up.z === 0 && up.y === 1) return target.set(vector.x, 0, vector.z);
    return target.copy(vector).addScaledVector(up, -vector.dot(up));
  }

  // The moon is a real sphere now, so it needs no help looking like one: its
  // limb is actual geometry and its horizon is actual curvature. The camera-
  // relative curvature shader that faked both on the flat build is gone --
  // left in, it would bend an already-curved world a second time.
  //
  // skyMaterial() survives with one job: marking the things that are NOT on
  // the moon, so the lift onto the sphere leaves them where they are.
  function skyMaterial(object) {
    object.traverse?.(node => { node.userData.kbSky = true; });
    if (object.userData) object.userData.kbSky = true;
    return object;
  }

  const ui = {};
  [
    'hud', 'startOverlay', 'startButton', 'startActionHint', 'startKicker', 'startTitle', 'startCopy',
    'crosshair', 'hitMarker', 'damageVignette', 'visorFrost', 'rewardFlash', 'srState',
    'stoneCounter', 'stoneCount', 'coreCounter', 'suitMeter',
    'chargeUI', 'chargeFill', 'controlsHint', 'soundButton',
    'fullscreenButton', 'qualityButton', 'pauseOverlay', 'winOverlay',
    'winSummary', 'winTime', 'winScore', 'winRank', 'restartButton',
    'touchControls', 'movePad', 'lookPad',
    'touchJump', 'touchGrapple', 'touchPause', 'pauseResumeButton', 'loadingMeter',
  ].forEach(id => { ui[id] = document.getElementById(id); });

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const invLerp = (a, b, v) => (v - a) / ((b - a) || 1);
  const smoothstep = (a, b, v) => {
    const t = clamp(invLerp(a, b, v), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const smootherstep = (a, b, v) => {
    const t = clamp(invLerp(a, b, v), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));
  const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const finite = v => Number.isFinite(v) ? v : 0;
  const formatTime = value => {
    if (!Number.isFinite(value)) return '--:--.--';
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    const centis = Math.floor((value * 100) % 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  };

  function mulberry32(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let n = value;
      n = Math.imul(n ^ (n >>> 15), n | 1);
      n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
  }

  const worldRandom = mulberry32(0xB00BCAFE);
  const cosmeticRandom = mulberry32(0xA11E701D);
  let enemyRandom = mulberry32(0xE11E5EED);
  const randomRange = (min, max, rng = cosmeticRandom) => min + (max - min) * rng();

  function hash2(x, z) {
    const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
    return value - Math.floor(value);
  }

  function valueNoise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = x - ix, fz = z - iz;
    const sx = fx * fx * (3 - 2 * fx);
    const sz = fz * fz * (3 - 2 * fz);
    const a = hash2(ix, iz), b = hash2(ix + 1, iz);
    const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
    return lerp(lerp(a, b, sx), lerp(c, d, sx), sz) * 2 - 1;
  }

  function fbm(x, z, octaves = 5) {
    let value = 0, amplitude = .5, frequency = 1;
    for (let i = 0; i < octaves; i++) {
      value += valueNoise(x * frequency, z * frequency) * amplitude;
      frequency *= 2.03;
      amplitude *= .5;
    }
    return value;
  }

  // Noise in three dimensions, sampled on the surface of the sphere itself.
  // A flat heightfield wrapped onto a ball always has two poles and a seam,
  // and the usual fix -- fading the terrain to a constant near them -- is just
  // melting the far side into a featureless plain. This has no poles and no
  // seam, so the moon has real ground on every part of it.
  function hash3(x, y, z) {
    let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h ^= h >>> 13;
    return ((h >>> 0) % 100000) / 100000;
  }
  function valueNoise3(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const sz = fz * fz * (3 - 2 * fz);
    const c00 = lerp(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), sx);
    const c10 = lerp(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), sx);
    const c01 = lerp(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), sx);
    const c11 = lerp(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), sx);
    return lerp(lerp(c00, c10, sy), lerp(c01, c11, sy), sz) * 2 - 1;
  }
  function fbm3(x, y, z, octaves = 5) {
    let value = 0, amplitude = .5, frequency = 1;
    for (let i = 0; i < octaves; i++) {
      value += valueNoise3(x * frequency, y * frequency, z * frequency) * amplitude;
      frequency *= 2.03;
      amplitude *= .5;
    }
    return value;
  }

  function radialTexture(inner, outer = 'rgba(0,0,0,0)', size = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const context = c.getContext('2d');
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(.22, inner);
    gradient.addColorStop(1, outer);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    return texture;
  }

  function makeRegolithTextures() {
    const size = 768;
    const colorCanvas = document.createElement('canvas');
    const heightCanvas = document.createElement('canvas');
    colorCanvas.width = colorCanvas.height = size;
    heightCanvas.width = heightCanvas.height = size;
    const colorContext = colorCanvas.getContext('2d');
    const heightContext = heightCanvas.getContext('2d');
    const colorImage = colorContext.createImageData(size, size);
    const heightImage = heightContext.createImageData(size, size);
    const colorData = colorImage.data;
    const heightData = heightImage.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const large = fbm(x / 92, y / 92, 5);
        const grit = valueNoise(x / 6.5, y / 6.5) * .34;
        const pin = hash2(x * 1.7, y * 2.1) > .985 ? -.32 : 0;
        const h = clamp(.54 + large * .22 + grit * .17 + pin, 0, 1);
        const i = (y * size + x) * 4;
        const warmth = valueNoise(x / 180, y / 180) * 5;
        colorData[i] = clamp(113 + h * 86 + warmth, 0, 255);
        colorData[i + 1] = clamp(119 + h * 88 + warmth * .72, 0, 255);
        colorData[i + 2] = clamp(130 + h * 91 + warmth * .28, 0, 255);
        colorData[i + 3] = 255;
        const height = Math.floor(h * 255);
        heightData[i] = heightData[i + 1] = heightData[i + 2] = height;
        heightData[i + 3] = 255;
      }
    }
    colorContext.putImageData(colorImage, 0, 0);
    heightContext.putImageData(heightImage, 0, 0);
    for (let i = 0; i < 115; i++) {
      const x = worldRandom() * size, y = worldRandom() * size;
      const radius = 2 + Math.pow(worldRandom(), 2.2) * 25;
      const gradient = colorContext.createRadialGradient(x, y, radius * .12, x, y, radius);
      gradient.addColorStop(0, 'rgba(28,32,39,.42)');
      gradient.addColorStop(.62, 'rgba(58,62,72,.25)');
      gradient.addColorStop(.78, 'rgba(225,230,236,.22)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      colorContext.fillStyle = gradient;
      colorContext.beginPath();
      colorContext.arc(x, y, radius, 0, TAU);
      colorContext.fill();
    }
    const color = new T.CanvasTexture(colorCanvas);
    color.colorSpace = T.SRGBColorSpace;
    color.wrapS = color.wrapT = T.RepeatWrapping;
    color.repeat.set(28, 28);
    const bump = new T.CanvasTexture(heightCanvas);
    bump.wrapS = bump.wrapT = T.RepeatWrapping;
    bump.repeat.copy(color.repeat);
    return { color, bump };
  }

  function analyzeLoopGesture(points) {
    if (!Array.isArray(points) || points.length < 7) {
      return { matched: false, direction: 0, power: 0, path: 0, turn: 0, elapsed: 0, closure: Infinity, spanX: 0, spanY: 0 };
    }
    let path = 0;
    let turn = 0;
    let minX = points[0].x, maxX = points[0].x;
    let minY = points[0].y, maxY = points[0].y;
    let previousSegment = null;
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
      const dx = point.x - points[i - 1].x;
      const dy = point.y - points[i - 1].y;
      const length = Math.hypot(dx, dy);
      if (length < 1.5) continue;
      path += length;
      const segment = { x: dx / length, y: dy / length };
      if (previousSegment) {
        const cross = previousSegment.x * segment.y - previousSegment.y * segment.x;
        const dot = clamp(previousSegment.x * segment.x + previousSegment.y * segment.y, -1, 1);
        turn += Math.atan2(cross, dot);
      }
      previousSegment = segment;
    }
    const first = points[0];
    const last = points[points.length - 1];
    const elapsed = Math.max(0, last.t - first.t);
    const closure = Math.hypot(last.x - first.x, last.y - first.y);
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const winding = Math.abs(turn);
    const closureLimit = Math.max(34, Math.min(48, Math.max(spanX, spanY) * .78));
    const matched = path >= 105 && winding >= 5.15 && spanX >= 30 && spanY >= 30
      && elapsed >= 100 && elapsed <= 1350 && closure <= closureLimit;
    const speed = elapsed > 0 ? path / elapsed : 0;
    const power = matched ? clamp(.82 + (winding - 5.15) * .16 + Math.max(0, speed - .18) * .42, .82, 1.25) : 0;
    return { matched, direction: matched ? (turn >= 0 ? 1 : -1) : 0, power, path, turn, elapsed, closure, closureLimit, spanX, spanY };
  }

  function analyzeRecentLoopGesture(points) {
    if (!Array.isArray(points) || points.length < 7) return analyzeLoopGesture(points);
    const lastTime = points[points.length - 1].t;
    let best = null;
    let bestScore = Infinity;
    for (let start = 0; start <= points.length - 7; start++) {
      const elapsed = lastTime - points[start].t;
      if (elapsed > 1350) continue;
      if (elapsed < 100) break;
      const result = analyzeLoopGesture(points.slice(start));
      if (!result.matched) continue;
      const span = Math.max(1, result.spanX, result.spanY);
      const score = result.closure / span * 2.2 + Math.abs(Math.abs(result.turn) - TAU) / TAU;
      if (score < bestScore) { best = result; bestScore = score; }
    }
    return best || analyzeLoopGesture(points);
  }

  class TouchSurface {
    constructor(element, kind = 'move') {
      this.element = element;
      this.kind = kind;
      this.isLook = kind === 'look';
      this.visual = element ? element.querySelector('.touch-pad') : null;
      this.knob = element ? element.querySelector('.touchKnob') : null;
      this.pointerId = null;
      this.anchor = new T.Vector2();
      this.last = new T.Vector2();
      this.value = new T.Vector2();
      this.delta = new T.Vector2();
      this.gesturePoints = [];
      this.loopPulse = false;
      this.loopDirection = 0;
      this.loopPower = 0;
      this.loopLatched = false;
      this.releaseTimer = 0;
      this.loopTimer = 0;
      this.actionTimer = 0;
      this.actionHold = false;
      this.actionReleased = false;
      this.actionCancelled = false;
      this.actionContext = null;
      this.tapPulse = false;
      this.totalMotion = 0;
      this.downTime = 0;
      if (!element) return;
      element.addEventListener('pointerdown', event => this.down(event));
      element.addEventListener('pointermove', event => this.move(event));
      element.addEventListener('pointerup', event => this.up(event));
      element.addEventListener('pointercancel', event => this.cancel(event));
      element.addEventListener('lostpointercapture', event => this.cancel(event));
    }
    eventTime(event) {
      return Number.isFinite(event.timeStamp) ? event.timeStamp : performance.now();
    }
    down(event) {
      if (this.pointerId !== null) return;
      document.body.classList.remove('using-gamepad');
      this.pointerId = event.pointerId;
      this.anchor.set(event.clientX, event.clientY);
      this.last.copy(this.anchor);
      this.value.set(0, 0);
      this.totalMotion = 0;
      this.downTime = this.eventTime(event);
      this.actionReleased = false;
      this.actionCancelled = false;
      this.actionContext = this.isLook && game?.ball?.mode === 'ready' ? 'home' : this.isLook ? 'away' : null;
      this.gesturePoints = this.isLook ? [{ x: event.clientX, y: event.clientY, t: this.eventTime(event) }] : [];
      this.loopLatched = false;
      if (this.isLook) {
        if (this.actionTimer) clearTimeout(this.actionTimer);
        this.actionTimer = setTimeout(() => {
          if (this.pointerId !== event.pointerId || this.totalMotion > 16 || this.loopLatched) return;
          this.actionHold = true;
          this.element?.classList.add('is-holding');
        }, 155);
      }
      if (this.releaseTimer) clearTimeout(this.releaseTimer);
      this.positionVisual(event.clientX, event.clientY, true);
      try { this.element.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault();
    }
    move(event) {
      if (event.pointerId !== this.pointerId) return;
      const x = event.clientX;
      const y = event.clientY;
      const dx = x - this.last.x;
      const dy = y - this.last.y;
      this.totalMotion += Math.hypot(dx, dy);
      if (this.isLook) {
        this.delta.x += dx;
        this.delta.y += dy;
        this.trackLoop(x, y, this.eventTime(event));
        if (!this.actionHold && this.totalMotion > 16 && this.actionTimer) {
          clearTimeout(this.actionTimer);
          this.actionTimer = 0;
        }
      }
      this.updateDeflection(x, y);
      this.last.set(x, y);
      event.preventDefault();
    }
    up(event) {
      this.finish(event, false);
    }
    cancel(event) {
      this.finish(event, true);
    }
    finish(event, cancelled = false) {
      if (event.pointerId !== this.pointerId) return;
      const releasedAt = this.eventTime(event);
      const wasLoop = this.loopLatched;
      const wasHold = this.actionHold;
      if (this.actionTimer) clearTimeout(this.actionTimer);
      this.actionTimer = 0;
      if (this.isLook) {
        if (cancelled) this.actionCancelled = true;
        else if (wasHold) this.actionReleased = true;
        else if (!wasLoop && this.totalMotion < 16 && releasedAt - this.downTime <= 360) this.tapPulse = true;
        this.actionHold = false;
        this.element?.classList.remove('is-holding');
      }
      this.pointerId = null;
      this.value.set(0, 0);
      this.gesturePoints.length = 0;
      this.loopLatched = false;
      if (this.knob) this.knob.style.transform = 'translate3d(0,0,0)';
      this.positionVisual(0, 0, false);
      event.preventDefault();
    }
    updateDeflection(x, y) {
      const visualSize = this.visual ? Math.min(this.visual.offsetWidth || 128, this.visual.offsetHeight || 128) : 128;
      const max = Math.max(38, visualSize * .34);
      let dx = x - this.anchor.x;
      let dy = y - this.anchor.y;
      if (!this.isLook && this.element) {
        const rect = this.element.getBoundingClientRect();
        const roomX = dx < 0 ? this.anchor.x - rect.left : rect.right - this.anchor.x;
        const roomY = dy < 0 ? this.anchor.y - rect.top : rect.bottom - this.anchor.y;
        const scaleX = Math.max(8, Math.min(max, roomX));
        const scaleY = Math.max(8, Math.min(max, roomY));
        let valueX = dx / scaleX;
        let valueY = dy / scaleY;
        const valueLength = Math.hypot(valueX, valueY);
        if (valueLength > 1) { valueX /= valueLength; valueY /= valueLength; }
        this.value.set(valueX, valueY);
        dx = valueX * max;
        dy = valueY * max;
      } else {
        const length = Math.hypot(dx, dy);
        if (length > max) { dx *= max / length; dy *= max / length; }
        this.value.set(dx / max, dy / max);
      }
      if (this.knob) this.knob.style.transform = `translate3d(${dx}px,${dy}px,0)`;
    }
    trackLoop(x, y, t) {
      const previous = this.gesturePoints[this.gesturePoints.length - 1];
      if (previous && Math.hypot(x - previous.x, y - previous.y) < 2.5) return;
      this.gesturePoints.push({ x, y, t });
      while (this.gesturePoints.length > 8 && t - this.gesturePoints[0].t > 1500) this.gesturePoints.shift();
      if (this.gesturePoints.length > 96) this.gesturePoints.shift();
      // Once a stationary touch has committed to charge/pull, it cannot be
      // reclassified as orbit halfway through the same gesture. A loop begins
      // with motion and cancels the hold timer before that commitment.
      if (this.loopLatched || this.actionHold) return;
      const result = analyzeRecentLoopGesture(this.gesturePoints);
      if (!result.matched) return;
      this.loopLatched = true;
      this.loopPulse = true;
      this.loopDirection = result.direction;
      this.loopPower = result.power;
      document.body.dataset.touchLoopDirection = String(result.direction);
      document.body.dataset.touchLoopPower = result.power.toFixed(3);
      document.body.dataset.touchLoopCount = String((Number(document.body.dataset.touchLoopCount) || 0) + 1);
      this.element?.classList.add('is-loop');
      if (this.loopTimer) clearTimeout(this.loopTimer);
      this.loopTimer = setTimeout(() => this.element?.classList.remove('is-loop'), 320);
    }
    positionVisual(clientX, clientY, active) {
      if (!this.element || !this.visual) return;
      this.element.classList.toggle('is-active', active);
      if (active) {
        const rect = this.element.getBoundingClientRect();
        const half = Math.min((this.visual.offsetWidth || 128) * .5, rect.width * .5);
        const x = clamp(clientX - rect.left, half, rect.width - half);
        const y = clamp(clientY - rect.top, half, Math.max(half, rect.height - half - 22));
        this.visual.style.left = `${x}px`;
        this.visual.style.top = `${y}px`;
      } else {
        this.releaseTimer = setTimeout(() => {
          if (this.pointerId !== null || !this.visual) return;
          this.visual.style.removeProperty('left');
          this.visual.style.removeProperty('top');
        }, 180);
      }
    }
    consumeDelta(target) {
      target.copy(this.delta);
      this.delta.set(0, 0);
      return target;
    }
    consumeLoop() {
      const result = { active: this.loopPulse, direction: this.loopDirection, power: this.loopPower };
      this.loopPulse = false;
      return result;
    }
    consumeAction() {
      const result = {
        tap: this.tapPulse,
        hold: this.actionHold,
        released: this.actionReleased,
        cancelled: this.actionCancelled,
        context: this.actionContext,
        active: this.pointerId !== null,
        moved: this.totalMotion > 16,
      };
      this.tapPulse = false;
      this.actionReleased = false;
      this.actionCancelled = false;
      if (this.pointerId === null) this.actionContext = null;
      return result;
    }
    reset() {
      this.pointerId = null;
      this.value.set(0, 0);
      this.delta.set(0, 0);
      this.gesturePoints.length = 0;
      this.loopPulse = false;
      this.loopDirection = 0;
      this.loopPower = 0;
      this.loopLatched = false;
      this.tapPulse = false;
      this.actionHold = false;
      this.actionReleased = false;
      this.actionCancelled = false;
      this.actionContext = null;
      this.totalMotion = 0;
      this.downTime = 0;
      if (this.actionTimer) clearTimeout(this.actionTimer);
      this.actionTimer = 0;
      this.element?.classList.remove('is-active', 'is-loop', 'is-holding');
      if (this.knob) this.knob.style.transform = 'translate3d(0,0,0)';
      if (this.visual) {
        this.visual.style.removeProperty('left');
        this.visual.style.removeProperty('top');
      }
    }
  }

  class InputManager {
    constructor() {
      this.keys = new Set();
      this.buttons = { kick: false, snap: false, line: false, jump: false, spin: false, grapple: false, sprint: false, pause: false };
      this.edgePulses = { kick: false, snap: false, lineReleased: false, jump: false, spin: false, grapple: false, pause: false };
      this.previous = { kick: false, snap: false, line: false, jump: false, spin: false, grapple: false, pause: false };
      this.frame = {
        moveX: 0, moveZ: 0, lookX: 0, lookY: 0,
        kick: false, snap: false, line: false, jump: false, spin: false, grapple: false, sprint: false,
        kickPressed: false, kickReleased: false, snapPressed: false,
        linePressed: false, lineReleased: false,
        actionCancelled: false,
        jumpPressed: false, spinPressed: false, spinDirection: 0, spinPower: 1,
        grapplePressed: false, pausePressed: false,
      };
      this.mouseLook = new T.Vector2();
      this.lookScratch = new T.Vector2();
      this.pendingLook = new T.Vector2();
      this.gamepadLook = new T.Vector2();
      this.mouseLineStartedAt = 0;
      this.mouseLineMotion = 0;
      this.mouseLineCursor = new T.Vector2();
      this.mouseLinePoints = [];
      this.mouseLoop = { active: false, direction: 0, power: 0 };
      this.mouseLoopCooldownUntil = 0;
      this.mouseLineSpun = false;
      this.moveStick = new TouchSurface(ui.movePad, 'move');
      this.lookStick = new TouchSurface(ui.lookPad, 'look');
      this.primaryTouch = matchMedia('(pointer: coarse)').matches;
      this.hasTouch = FORCE_TOUCH || this.primaryTouch || (navigator.maxTouchPoints > 0 && matchMedia('(any-pointer: coarse)').matches);
      // A touchscreen laptop is not automatically a touch-only game. Start from
      // the primary pointer, then switch modes when the player actually uses a
      // finger or mouse so neither input path can strand the other.
      this.touchEnabled = FORCE_TOUCH || this.primaryTouch;
      this.lastGamepadPause = false;
      this.lastGamepadActivate = false;
      this.consumeGamepadActivate = false;
      this.bind();
    }
    bind() {
      window.addEventListener('pointerdown', event => this.handleGlobalPointerDown(event), { capture: true, passive: false });
      window.addEventListener('pointermove', event => this.bridgeGlobalTouch('move', event), { capture: true, passive: false });
      window.addEventListener('pointerup', event => this.bridgeGlobalTouch('up', event), { capture: true, passive: false });
      window.addEventListener('pointercancel', event => this.bridgeGlobalTouch('cancel', event), { capture: true, passive: false });
      window.addEventListener('keydown', event => {
        document.body.classList.remove('using-gamepad');
        const interactiveTarget = event.target instanceof Element && !!event.target.closest('button, a, input, select, textarea, [role="button"]');
        if (interactiveTarget && !['Escape', 'KeyP', 'KeyR', 'KeyM', 'KeyG'].includes(event.code)) return;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
        // The browser owns Escape while pointer lock is active. Enqueuing it as
        // a second pause edge can immediately undo the pointerlockchange pause.
        const browserOwnsEscape = event.code === 'Escape' && document.pointerLockElement === canvas;
        if (!browserOwnsEscape) this.keys.add(event.code);
        audio.ensure();
        if (event.code === 'KeyM' && !event.repeat) audio.toggle();
        if (event.code === 'KeyR' && !event.repeat && game) {
          game.restart();
          if (game.started && !this.touchEnabled && !TEST_MODE && document.pointerLockElement !== canvas) requestGamePointerLock();
        }
        if (event.code === 'KeyG' && !event.repeat && world) world.cycleQuality();
        if (event.code === 'Enter' && event.altKey && !event.repeat) toggleFullscreen();
      });
      window.addEventListener('keyup', event => this.keys.delete(event.code));
      window.addEventListener('blur', () => this.resetTransient());
      canvas.addEventListener('mousedown', event => {
        document.body.classList.remove('using-gamepad');
        if (!game || !game.started) return;
        audio.ensure();
        const needsPointerLock = !this.touchEnabled && !TEST_MODE && document.pointerLockElement !== canvas;
        if (needsPointerLock) {
          requestGamePointerLock();
          event.preventDefault();
          return;
        }
        if (event.button === 0) this.buttons.kick = true;
        if (event.button === 2) {
          this.buttons.line = true;
          this.beginMouseLine(event);
        }
        // Middle mouse is THE GRAPPLE. It used to be a mid-air spin that
        // changed nothing you could feel; the button is worth more than that.
        if (event.button === 1) this.buttons.grapple = true;
        event.preventDefault();
      });
      window.addEventListener('mouseup', event => {
        if (event.button === 0) this.buttons.kick = false;
        if (event.button === 2) this.endMouseLine(event);
        if (event.button === 1) this.buttons.grapple = false;
      });
      window.addEventListener('mousemove', event => {
        if (event.movementX || event.movementY) document.body.classList.remove('using-gamepad');
        if (document.pointerLockElement === canvas || (AUTO_START && !this.touchEnabled)) {
          this.mouseLook.x += event.movementX || 0;
          this.mouseLook.y += event.movementY || 0;
          if (this.buttons.line) this.trackMouseLine(event);
        }
      }, { passive: true });
      canvas.addEventListener('contextmenu', event => event.preventDefault());
      this.bindButton(ui.touchJump, 'jump');
      this.bindButton(ui.touchGrapple, 'grapple');
      this.bindButton(ui.touchPause, 'pause');
      document.addEventListener('pointerlockchange', () => {
        document.body.classList.toggle('pointer-locked', document.pointerLockElement === canvas);
        if (document.pointerLockElement !== canvas) {
          this.keys.delete('Escape');
          if (game?.started && !game.paused && !game.won && !this.touchEnabled && !TEST_MODE) game.togglePause();
        }
      });
      this.setTouchMode(this.touchEnabled);
    }
    beginMouseLine(event) {
      this.mouseLineStartedAt = Number.isFinite(event.timeStamp) ? event.timeStamp : performance.now();
      this.mouseLineMotion = 0;
      this.mouseLineCursor.set(0, 0);
      this.mouseLinePoints = [{ x: 0, y: 0, t: this.mouseLineStartedAt }];
      this.mouseLineSpun = false;
    }
    trackMouseLine(event) {
      const dx = finite(Number(event.movementX));
      const dy = finite(Number(event.movementY));
      if (!dx && !dy) return;
      const now = Number.isFinite(event.timeStamp) ? event.timeStamp : performance.now();
      this.mouseLineMotion += Math.hypot(dx, dy);
      this.mouseLineCursor.x += dx;
      this.mouseLineCursor.y += dy;
      const point = { x: this.mouseLineCursor.x, y: this.mouseLineCursor.y, t: now };
      const previous = this.mouseLinePoints[this.mouseLinePoints.length - 1];
      if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= 2.5) this.mouseLinePoints.push(point);
      while (this.mouseLinePoints.length > 8 && now - this.mouseLinePoints[0].t > 1500) this.mouseLinePoints.shift();
      if (this.mouseLinePoints.length > 96) this.mouseLinePoints.shift();
      if (now < this.mouseLoopCooldownUntil) return;
      const result = analyzeRecentLoopGesture(this.mouseLinePoints);
      if (!result.matched) return;
      this.mouseLoop = { active: true, direction: result.direction, power: result.power };
      this.mouseLineSpun = true;
      this.mouseLoopCooldownUntil = now + 260;
      this.mouseLinePoints = [point];
      document.body.dataset.mouseLoopDirection = String(result.direction);
      document.body.dataset.mouseLoopCount = String((Number(document.body.dataset.mouseLoopCount) || 0) + 1);
    }
    endMouseLine(event) {
      if (!this.buttons.line) return;
      const endedAt = Number.isFinite(event.timeStamp) ? event.timeStamp : performance.now();
      const elapsed = Math.max(0, endedAt - this.mouseLineStartedAt);
      this.buttons.line = false;
      this.edgePulses.lineReleased = true;
      // Duration alone decides a quick call. The old 18 px motion gate silently
      // ate recalls whenever the click landed mid aim-sweep, which on a real
      // mouse is most of the time the player wants the ball back.
      if (!this.mouseLineSpun && elapsed <= 260) this.edgePulses.snap = true;
      this.mouseLinePoints.length = 0;
    }
    handleGlobalPointerDown(event) {
      if (event.pointerType === 'mouse' && !FORCE_TOUCH) {
        this.setTouchMode(false);
        return;
      }
      if (event.pointerType !== 'touch') return;
      const wasTouchEnabled = this.touchEnabled;
      this.setTouchMode(true);
      const targetIsInteractive = event.target instanceof Element
        && !!event.target.closest('#touchControls, button, a, input, select, textarea, [role="button"]');
      if (wasTouchEnabled || targetIsInteractive || !game?.started || game.paused || game.won) return;
      const surface = event.clientX < window.innerWidth * .5 ? this.moveStick : this.lookStick;
      surface.down(event);
    }
    bridgeGlobalTouch(method, event) {
      if (event.pointerType !== 'touch') return;
      for (const surface of [this.moveStick, this.lookStick]) {
        if (surface.pointerId !== event.pointerId) continue;
        const targetIsSurface = event.target instanceof Node && surface.element?.contains(event.target);
        if (!targetIsSurface) surface[method](event);
      }
    }
    setTouchMode(enabled) {
      const next = FORCE_TOUCH || !!enabled;
      if (ui.startActionHint) ui.startActionHint.textContent = next ? 'TAP TO ENTER' : 'CLICK TO LOCK VIEW';
      if (this.touchEnabled === next && document.body.classList.contains('touch-enabled') === next) return;
      this.touchEnabled = next;
      document.body.classList.toggle('touch-enabled', next);
      if (next) {
        if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      } else {
        this.moveStick.reset();
        this.lookStick.reset();
      }
    }
    bindButton(element, action) {
      if (!element) return;
      const down = event => {
        document.body.classList.remove('using-gamepad');
        this.buttons[action] = true;
        if (action in this.edgePulses) this.edgePulses[action] = true;
        audio.ensure();
        try { element.setPointerCapture(event.pointerId); } catch (_) {}
        event.preventDefault();
      };
      const up = event => { this.buttons[action] = false; event.preventDefault(); };
      element.addEventListener('pointerdown', down);
      element.addEventListener('pointerup', up);
      element.addEventListener('pointercancel', up);
      element.addEventListener('lostpointercapture', up);
    }
    poll() {
      let moveX = 0, moveZ = 0;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveX -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveZ += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveZ -= 1;
      const touchMagnitude = this.moveStick.value.length();
      if (touchMagnitude > .08) {
        moveX = this.moveStick.value.x;
        moveZ = -this.moveStick.value.y;
      }

      let gpKick = false, gpSnap = false, gpJump = false, gpSpin = false, gpPause = false, gpSprint = false;
      let gpLookX = 0, gpLookY = 0;
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = [...pads].find(candidate => candidate && candidate.connected);
      if (pad) {
        const deadzone = value => Math.abs(value) < .15 ? 0 : Math.sign(value) * (Math.abs(value) - .15) / .85;
        const lx = deadzone(pad.axes[0] || 0), ly = deadzone(pad.axes[1] || 0);
        gpLookX = deadzone(pad.axes[2] || 0);
        gpLookY = deadzone(pad.axes[3] || 0);
        if (Math.hypot(lx, ly) > .08) { moveX = lx; moveZ = -ly; }
        gpJump = !!pad.buttons[0]?.pressed;
        gpSpin = !!(pad.buttons[1]?.pressed || pad.buttons[2]?.pressed);
        gpSprint = !!pad.buttons[10]?.pressed;
        gpSnap = !!(pad.buttons[6] && pad.buttons[6].value > .22);
        gpKick = !!(pad.buttons[7] && pad.buttons[7].value > .22);
        gpPause = !!pad.buttons[9]?.pressed;
        const gamepadActive = Math.hypot(lx, ly, gpLookX, gpLookY) > .12 || gpJump || gpSpin || gpSprint || gpSnap || gpKick || gpPause;
        if (gamepadActive) document.body.classList.add('using-gamepad');
      }
      const gamepadActivate = gpJump || gpPause;
      if (this.consumeGamepadActivate) {
        gpJump = false;
        gpPause = false;
        if (!gamepadActivate) this.consumeGamepadActivate = false;
      } else if (game && gamepadActivate && !this.lastGamepadActivate) {
        if (!game.started) {
          game.start(false);
          this.consumeGamepadActivate = true;
          gpJump = false;
          gpPause = false;
        } else if (game.won) {
          game.restart();
          this.consumeGamepadActivate = true;
          gpJump = false;
          gpPause = false;
        }
      }
      this.lastGamepadActivate = gamepadActivate;
      const moveLength = Math.hypot(moveX, moveZ);
      if (moveLength > 1) { moveX /= moveLength; moveZ /= moveLength; }
      this.lookStick.consumeDelta(this.lookScratch);
      // Mouse and touch both use relative movement. Touch is deliberately a
      // free swipe surface rather than a held right stick: the view stops when
      // the thumb stops, so landing anywhere on the right never causes a snap.
      this.pendingLook.x += this.mouseLook.x * .00215 + this.lookScratch.x * .00415;
      this.pendingLook.y += this.mouseLook.y * .00215 + this.lookScratch.y * .00365;
      this.gamepadLook.set(
        gpLookX * .035,
        gpLookY * .03,
      );
      this.mouseLook.set(0, 0);

      const loop = this.lookStick.consumeLoop();
      const rightAction = this.lookStick.consumeAction();
      const mouseLoop = { ...this.mouseLoop };
      this.mouseLoop.active = false;
      const actionHome = rightAction.context === 'home';
      const touchTapKick = this.touchEnabled && rightAction.tap && actionHome;
      const touchHoldKick = this.touchEnabled && rightAction.hold && actionHome;
      const touchTapCall = this.touchEnabled && rightAction.tap && !actionHome;
      // Away gestures keep the intent they had on pointer-down. A held reel
      // cannot silently become a HOME charge when the ball reaches the player.
      const touchLine = this.touchEnabled && !actionHome
        && (rightAction.hold || (rightAction.active && rightAction.moved));

      const kick = this.buttons.kick || gpKick || this.keys.has('KeyF') || touchHoldKick;
      const snap = this.buttons.snap || this.keys.has('KeyE') || touchTapCall;
      const line = this.buttons.line || gpSnap || touchLine;
      const jump = this.buttons.jump || gpJump || this.keys.has('Space');
      const spin = loop.active || mouseLoop.active || this.buttons.spin || gpSpin || this.keys.has('KeyQ');
      const grapple = this.buttons.grapple || this.keys.has('KeyC');
      // Full forward deflection is the touch sprint gesture. It preserves an
      // analog walk band while giving phones the same momentum route as Shift
      // and controller L3 without adding another thumb-blocking button.
      const touchSprint = this.touchEnabled && touchMagnitude > .84 && moveZ > .35;
      const sprint = touchSprint || gpSprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const pause = this.buttons.pause || this.keys.has('Escape') || this.keys.has('KeyP') || gpPause;
      Object.assign(this.frame, {
        moveX, moveZ, lookX: this.gamepadLook.x, lookY: this.gamepadLook.y, kick, snap, line, jump, spin, grapple, sprint,
        kickPressed: touchTapKick || this.edgePulses.kick || (kick && !this.previous.kick),
        kickReleased: !rightAction.cancelled && (touchTapKick || (rightAction.released && actionHome) || (!kick && this.previous.kick)),
        snapPressed: touchTapCall || this.edgePulses.snap || (snap && !this.previous.snap) || (gpSnap && !this.previous.line),
        linePressed: line && !this.previous.line,
        lineReleased: !rightAction.cancelled
          && (this.edgePulses.lineReleased || (rightAction.released && !actionHome) || (!line && this.previous.line)),
        actionCancelled: rightAction.cancelled,
        jumpPressed: this.edgePulses.jump || (jump && !this.previous.jump),
        spinPressed: loop.active || mouseLoop.active || this.edgePulses.spin || (spin && !this.previous.spin),
        spinDirection: loop.active ? loop.direction : mouseLoop.active ? mouseLoop.direction : 0,
        spinPower: loop.active ? loop.power : mouseLoop.active ? mouseLoop.power : 1,
        grapplePressed: this.edgePulses.grapple || (grapple && !this.previous.grapple),
        pausePressed: this.edgePulses.pause || (pause && !this.previous.pause),
      });
      Object.keys(this.edgePulses).forEach(key => { this.edgePulses[key] = false; });
      this.lastGamepadPause = gpPause;
      return this.frame;
    }
    prepareStep(firstStep) {
      this.frame.lookX = this.gamepadLook.x + (firstStep ? this.pendingLook.x : 0);
      this.frame.lookY = this.gamepadLook.y + (firstStep ? this.pendingLook.y : 0);
      return this.frame;
    }
    resetTransient() {
      this.keys.clear();
      Object.keys(this.buttons).forEach(key => { this.buttons[key] = false; });
      Object.keys(this.edgePulses).forEach(key => { this.edgePulses[key] = false; });
      Object.keys(this.previous).forEach(key => { this.previous[key] = false; });
      this.mouseLook.set(0, 0);
      this.pendingLook.set(0, 0);
      this.lookScratch.set(0, 0);
      this.mouseLineStartedAt = 0;
      this.mouseLineMotion = 0;
      this.mouseLineCursor.set(0, 0);
      this.mouseLinePoints.length = 0;
      this.mouseLineSpun = false;
      this.mouseLoop = { active: false, direction: 0, power: 0 };
      this.consumeGamepadActivate = false;
      this.moveStick.reset();
      this.lookStick.reset();
      game?.cancelCharge();
    }
    endFrame() {
      this.previous.kick = this.frame.kick;
      this.previous.snap = this.frame.snap;
      this.previous.line = this.frame.line;
      this.previous.jump = this.frame.jump;
      this.previous.spin = this.frame.spin;
      this.previous.grapple = this.frame.grapple;
      this.previous.pause = this.buttons.pause || this.keys.has('Escape') || this.keys.has('KeyP') || this.lastGamepadPause;
      this.pendingLook.set(0, 0);
    }
  }

  class AudioEngine {
    constructor() {
      this.context = null;
      this.master = null;
      this.fx = null;
      this.music = null;
      this.muted = false;
      this.sequence = null;
      this.step = 0;
      this.recallOsc = null;
      this.recallGain = null;
      try { this.muted = localStorage.getItem('kickball-lunar-muted') === '1'; } catch (_) {}
      this.syncButton();
    }
    ensure() {
      if (TEST_MODE) return;
      if (this.context) {
        if (this.context.state === 'suspended') this.context.resume().catch(() => {});
        return;
      }
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      try {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.fx = this.context.createGain();
        this.music = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : .76;
        this.fx.gain.value = .88;
        this.music.gain.value = .12;
        this.fx.connect(this.master);
        this.music.connect(this.master);
        this.master.connect(this.context.destination);
        this.startMusic();
      } catch (_) { this.context = null; }
    }
    toggle() {
      this.muted = !this.muted;
      if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : .76, this.context.currentTime, .03);
      try { localStorage.setItem('kickball-lunar-muted', this.muted ? '1' : '0'); } catch (_) {}
      this.syncButton();
    }
    syncButton() { if (ui.soundButton) ui.soundButton.textContent = this.muted ? 'SOUND OFF' : 'SOUND ON'; }
    tone(frequency, duration, type = 'sine', volume = .08, endFrequency = null, delay = 0, target = this.fx) {
      if (!this.context || !target) return;
      const when = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(Math.max(20, frequency), when);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), when + duration);
      gain.gain.setValueAtTime(.0001, when);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), when + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
      oscillator.connect(gain);
      gain.connect(target);
      oscillator.start(when);
      oscillator.stop(when + duration + .03);
    }
    noise(duration = .08, volume = .07, filterFrequency = 1200, delay = 0) {
      if (!this.context || !this.fx) return;
      const count = Math.max(1, Math.floor(this.context.sampleRate * duration));
      const buffer = this.context.createBuffer(1, count, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < count; i++) data[i] = (cosmeticRandom() * 2 - 1) * Math.pow(1 - i / count, .8);
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.value = filterFrequency;
      filter.Q.value = .72;
      const when = this.context.currentTime + delay;
      gain.gain.setValueAtTime(volume, when);
      gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.fx);
      source.start(when);
    }
    kick(power = .5) {
      this.ensure();
      this.tone(104 + power * 38, .17, 'sine', .18 + power * .13, 35);
      this.tone(470 + power * 250, .065, 'triangle', .045 + power * .04, 170);
      this.noise(.055, .04 + power * .04, 1800);
    }
    // Flight recorder for phantom sounds: in test mode every impact records
    // when it fired and where the ball was, so a repeating "something keeps
    // colliding" pattern can be traced to its source instead of guessed at.
    note(kind, detail) {
      if (!TEST_MODE) return;
      this.log = this.log || [];
      const state = typeof game !== 'undefined' && game ? {
        t: +game.time.toFixed(3), mode: game.ball?.mode,
        bx: +game.ball?.position.x.toFixed(1), by: +game.ball?.position.y.toFixed(1), bz: +game.ball?.position.z.toFixed(1),
      } : {};
      this.log.push({ kind, detail, ...state });
      if (this.log.length > 600) this.log.splice(0, 200);
    }
    impact(strength = .5, material = 'rock') {
      this.note('impact', material);
      this.ensure();
      const value = clamp(strength, 0, 1);
      if (material === 'alien') {
        this.tone(240 + value * 190, .14, 'square', .07 + value * .07, 82);
        this.tone(780, .09, 'triangle', .03 + value * .035, 290);
      } else if (material === 'anchor') {
        this.tone(420, .28, 'sine', .07, 970);
        this.tone(840, .22, 'triangle', .035, 540, .035);
      } else if (material === 'glass') {
        this.tone(990, .4, 'sine', .06 + value * .06, 430);
        this.tone(1430, .24, 'triangle', .04, 760, .02);
        this.noise(.13, .06, 3200);
      } else {
        this.tone(76 + value * 45, .16, 'sine', .1 + value * .1, 31);
        this.noise(.1, .07 + value * .08, 680);
      }
    }
    jump(second = false) {
      this.note('jump', second);
      this.ensure();
      this.tone(second ? 430 : 280, .13, 'triangle', .055, second ? 880 : 570);
    }
    spin() {
      this.ensure();
      this.tone(180, .42, 'sawtooth', .055, 760);
      this.tone(520, .3, 'sine', .035, 980, .08);
    }
    score(high = false) {
      this.ensure();
      if (high) {
        // A found treasure: a little major arpeggio in the music's own key.
        this.tone(587.33, .3, 'sine', .05, null, 0, this.music);
        this.tone(739.99, .3, 'sine', .045, null, .07, this.music);
        this.tone(880, .44, 'sine', .05, null, .14, this.music);
        this.tone(1174.66, .6, 'sine', .035, null, .21, this.music);
        return;
      }
      // The run: D-major pentatonic climbing while the streak lasts.
      const now = performance.now();
      if (now - (this.runLast || 0) > 2600) this.runIndex = 0;
      this.runLast = now;
      const penta = [587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51, 1479.98, 1760, 1975.53];
      const note = penta[Math.min(this.runIndex++, penta.length - 1)];
      this.tone(note, .2, 'triangle', .055, null, 0, this.music);
      this.tone(note * 2, .13, 'sine', .018, null, .02, this.music);
    }
    damage() {
      this.ensure();
      this.tone(92, .28, 'sawtooth', .11, 39);
      this.noise(.12, .1, 530);
    }
    win() {
      this.ensure();
      [0, 4, 7, 12, 16].forEach((semitone, index) => {
        const frequency = 330 * Math.pow(2, semitone / 12);
        this.tone(frequency, .58, 'triangle', .055, frequency * 1.35, index * .09);
      });
    }
    recall(active, tension = 0) {
      if (!this.context || !this.fx) return;
      const now = this.context.currentTime;
      if (active && !this.recallOsc) {
        this.recallOsc = this.context.createOscillator();
        this.recallGain = this.context.createGain();
        this.recallOsc.type = 'sine';
        this.recallOsc.frequency.value = 110;
        this.recallGain.gain.value = .0001;
        this.recallOsc.connect(this.recallGain);
        this.recallGain.connect(this.fx);
        this.recallOsc.start();
      }
      if (this.recallOsc && this.recallGain) {
        this.recallOsc.frequency.setTargetAtTime(110 + tension * 240, now, .025);
        this.recallGain.gain.setTargetAtTime(active ? .012 + tension * .05 : .0001, now, .025);
        if (!active) {
          const oscillator = this.recallOsc, gain = this.recallGain;
          this.recallOsc = this.recallGain = null;
          setTimeout(() => { try { oscillator.stop(); gain.disconnect(); } catch (_) {} }, 190);
        }
      }
    }
    startMusic() {
      if (this.sequence || !this.context) return;
      const context = this.context;
      // THE PAD: four voices that glide between chords instead of retriggering
      // -- D / A(add9) / Bm / G, the slow breath under everything.
      this.chords = [
        [73.42, 110, 185, 277.18],   // Dmaj7
        [55, 110, 164.81, 277.18],   // A add9
        [61.74, 92.5, 146.83, 293.66], // Bm add9
        [49, 98, 146.83, 185],       // G maj (wide)
      ];
      this.chordIndex = 0;
      this.padGain = context.createGain();
      this.padGain.gain.value = 0;
      const padFilter = context.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.value = 520;
      padFilter.Q.value = .4;
      this.padFilter = padFilter;
      this.padGain.connect(padFilter);
      padFilter.connect(this.music);
      this.padVoices = this.chords[0].map((freq, i) => {
        const osc = context.createOscillator();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        const g = context.createGain();
        g.gain.value = i === 0 ? .35 : .24;
        osc.connect(g);
        g.connect(this.padGain);
        osc.start();
        return osc;
      });
      // Detuned shimmer twin for the top voice.
      const shimmer = context.createOscillator();
      shimmer.type = 'sine';
      shimmer.frequency.value = this.chords[0][3] * 1.005;
      const shimmerGain = context.createGain();
      shimmerGain.gain.value = .12;
      shimmer.connect(shimmerGain);
      shimmerGain.connect(this.padGain);
      shimmer.start();
      this.padShimmer = shimmer;
      // THE SPACE: one feedback delay that every bell falls into.
      this.bellSend = context.createGain();
      this.bellSend.gain.value = .9;
      const delay = context.createDelay(1.2);
      delay.delayTime.value = .41;
      const feedback = context.createGain();
      feedback.gain.value = .38;
      const damp = context.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2400;
      this.bellSend.connect(delay);
      delay.connect(damp);
      damp.connect(feedback);
      feedback.connect(delay);
      damp.connect(this.music);
      // THE THREAT: a low pulse that only exists near something hostile.
      this.threat = 0;
      this.threatGain = context.createGain();
      this.threatGain.gain.value = 0;
      const threatOsc = context.createOscillator();
      threatOsc.type = 'sawtooth';
      threatOsc.frequency.value = 55;
      const threatFilter = context.createBiquadFilter();
      threatFilter.type = 'lowpass';
      threatFilter.frequency.value = 240;
      threatOsc.connect(threatFilter);
      threatFilter.connect(this.threatGain);
      threatOsc.start();
      this.threatGain.connect(this.music);
      this.threatLevel = 0;
      this.threatBeat = 0;
      // THE CLOCK: chord changes and sparse bells. D-major pentatonic, an
      // octave wider once the moon's heart has been sung to rest.
      let beat = 0;
      this.sequence = setInterval(() => {
        if (!this.context || this.context.state !== 'running' || this.muted || !game || !game.started || game.paused || game.won) {
          if (this.padGain) this.padGain.gain.setTargetAtTime(0, context.currentTime, .4);
          if (this.threatGain) this.threatGain.gain.setTargetAtTime(0, context.currentTime, .3);
          return;
        }
        const now = context.currentTime;
        this.padGain.gain.setTargetAtTime(.5, now, 1.2);
        beat++;
        if (beat % 10 === 0) {
          this.chordIndex = (this.chordIndex + 1) % this.chords.length;
          const chord = this.chords[this.chordIndex];
          this.padVoices.forEach((osc, i) => osc.frequency.setTargetAtTime(chord[i], now, 1.4));
          this.padShimmer.frequency.setTargetAtTime(chord[3] * 1.005, now, 1.4);
        }
        // Filter breathes with the chord cycle.
        this.padFilter.frequency.setTargetAtTime(430 + Math.sin(beat * .35) * 160, now, .9);
        // A bell, sometimes. Sparse is the whole point.
        if (Math.random() < .34) {
          const penta = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99];
          const wide = game.endgameComplete ? [...penta, 880, 987.77, 1174.66] : penta;
          const note = wide[Math.floor(Math.random() * wide.length)];
          const osc = context.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = note;
          const g = context.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(.05, now + .02);
          g.gain.exponentialRampToValueAtTime(.0001, now + 2.6);
          const partial = context.createOscillator();
          partial.type = 'sine';
          partial.frequency.value = note * 3.01;
          const pg = context.createGain();
          pg.gain.setValueAtTime(0, now);
          pg.gain.linearRampToValueAtTime(.012, now + .015);
          pg.gain.exponentialRampToValueAtTime(.0001, now + 1.1);
          osc.connect(g); partial.connect(pg);
          g.connect(this.bellSend); pg.connect(this.bellSend);
          osc.start(now); partial.start(now);
          osc.stop(now + 2.8); partial.stop(now + 1.3);
        }
        // Threat follows what the game reported since last tick; the pulse
        // lives HERE (the first cut summed an LFO into the gain param, which
        // droned at fixed depth even at threat zero).
        this.threatBeat++;
        this.threatGain.gain.setTargetAtTime(this.threatLevel * .055 * (1 + .35 * Math.sin(this.threatBeat * 1.9)), now, .4);
      }, 1200);
    }
    setThreat(level) {
      this.threatLevel = clamp(level, 0, 1);
    }
  }

  class ParticleField {
    constructor(scene, count = 900) {
      this.count = count;
      this.cursor = 0;
      this.life = new Float32Array(count);
      this.maxLife = new Float32Array(count);
      this.velocity = Array.from({ length: count }, () => new T.Vector3());
      this.position = new Float32Array(count * 3);
      this.color = new Float32Array(count * 3);
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.BufferAttribute(this.position, 3).setUsage(T.DynamicDrawUsage));
      geometry.setAttribute('color', new T.BufferAttribute(this.color, 3).setUsage(T.DynamicDrawUsage));
      geometry.setDrawRange(0, count);
      const material = new T.PointsMaterial({
        size: .34,
        map: radialTexture('rgba(255,255,255,1)'),
        transparent: true,
        opacity: .94,
        depthWrite: false,
        vertexColors: true,
        blending: T.AdditiveBlending,
        sizeAttenuation: true,
      });
      this.points = new T.Points(geometry, material);
      this.points.frustumCulled = false;
      this.points.userData.kbLifted = true;
      scene.add(this.points);
    }
    burst(origin, color, amount = 14, speed = 9, life = .65, upward = .45) {
      const tint = color instanceof T.Color ? color : new T.Color(color);
      // On the sphere the spray's upward bias points along the local vertical
      // at the burst origin instead of world +Y.
      if (SPHERE_WORLD) {
        this.burstQuat = this.burstQuat || new T.Quaternion();
        this.burstDir = this.burstDir || new T.Vector3();
        this.burstQuat.setFromUnitVectors(UP, dirAt(origin, this.burstDir));
      }
      for (let n = 0; n < amount; n++) {
        const index = this.cursor++ % this.count;
        const offset = index * 3;
        const theta = cosmeticRandom() * TAU;
        const vertical = randomRange(-.18, 1, cosmeticRandom);
        const horizontal = Math.sqrt(Math.max(0, 1 - vertical * vertical));
        const force = speed * randomRange(.28, 1, cosmeticRandom);
        this.position[offset] = origin.x + randomRange(-.12, .12);
        this.position[offset + 1] = origin.y + randomRange(-.08, .18);
        this.position[offset + 2] = origin.z + randomRange(-.12, .12);
        this.velocity[index].set(Math.cos(theta) * horizontal * force, (vertical + upward) * force, Math.sin(theta) * horizontal * force);
        if (SPHERE_WORLD) this.velocity[index].applyQuaternion(this.burstQuat);
        this.color[offset] = tint.r;
        this.color[offset + 1] = tint.g;
        this.color[offset + 2] = tint.b;
        this.life[index] = this.maxLife[index] = life * randomRange(.55, 1.15);
      }
    }
    update(dt) {
      for (let index = 0; index < this.count; index++) {
        const offset = index * 3;
        if (this.life[index] <= 0) {
          this.position[offset + 1] = -9999;
          continue;
        }
        this.life[index] -= dt;
        const velocity = this.velocity[index];
        const drag = Math.exp(-2.4 * dt);
        if (SPHERE_WORLD) {
          // Gravity along the particle's own local vertical; drag tangential.
          let ux = this.position[offset], uy = this.position[offset + 1] + PLANET.radius, uz = this.position[offset + 2];
          const len = Math.hypot(ux, uy, uz) || 1;
          ux /= len; uy /= len; uz /= len;
          const vUp = velocity.x * ux + velocity.y * uy + velocity.z * uz;
          velocity.x = (velocity.x - ux * vUp) * drag + ux * (vUp - 7.5 * dt);
          velocity.y = (velocity.y - uy * vUp) * drag + uy * (vUp - 7.5 * dt);
          velocity.z = (velocity.z - uz * vUp) * drag + uz * (vUp - 7.5 * dt);
        } else {
          velocity.x *= drag;
          velocity.z *= drag;
          velocity.y -= 7.5 * dt;
        }
        this.position[offset] += velocity.x * dt;
        this.position[offset + 1] += velocity.y * dt;
        this.position[offset + 2] += velocity.z * dt;
        const fade = clamp(this.life[index] / this.maxLife[index], 0, 1);
        this.color[offset] *= .985;
        this.color[offset + 1] *= .985;
        this.color[offset + 2] *= .985;
        if (fade <= 0) this.position[offset + 1] = -9999;
      }
      this.points.geometry.attributes.position.needsUpdate = true;
      this.points.geometry.attributes.color.needsUpdate = true;
    }
    clear() {
      this.cursor = 0;
      this.life.fill(0);
      this.maxLife.fill(0);
      for (let index = 0; index < this.count; index++) {
        this.position[index * 3 + 1] = -9999;
        this.velocity[index].set(0, 0, 0);
      }
      this.points.geometry.attributes.position.needsUpdate = true;
      this.points.geometry.attributes.color.needsUpdate = true;
    }
  }

  // Pooled expanding (or collapsing) light rings. This is the build's grammar
  // for "something just happened here" now that no words are printed: rings
  // grow outward for a success and shrink inward for a refusal, and they are
  // always billboarded so the meaning survives any viewing angle.
  class RingField {
    constructor(scene, count = 18) {
      this.rings = [];
      const geometry = new T.RingGeometry(.72, 1, 40);
      for (let index = 0; index < count; index++) {
        const material = new T.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0, side: T.DoubleSide,
          depthWrite: false, blending: T.AdditiveBlending,
        });
        const mesh = new T.Mesh(geometry, material);
        mesh.visible = false;
        mesh.frustumCulled = false;
        scene.add(mesh);
        this.rings.push({ mesh, material, life: 0, maxLife: 0, radius: 1, inward: false });
      }
      this.cursor = 0;
    }
    spawn(position, color, radius = 4, life = .4, inward = false) {
      const ring = this.rings[this.cursor++ % this.rings.length];
      ring.mesh.position.copy(position);
      ring.mesh.visible = true;
      ring.material.color.copy(color instanceof T.Color ? color : new T.Color(color));
      ring.life = ring.maxLife = life;
      ring.radius = radius;
      ring.inward = inward;
      return ring;
    }
    update(dt, camera) {
      for (const ring of this.rings) {
        if (ring.life <= 0) {
          if (ring.mesh.visible) ring.mesh.visible = false;
          continue;
        }
        ring.life -= dt;
        const progress = clamp(1 - ring.life / ring.maxLife, 0, 1);
        const eased = ring.inward ? 1 - progress : progress;
        const scale = Math.max(.001, ring.radius * (.18 + eased * .82));
        ring.mesh.scale.setScalar(scale);
        ring.material.opacity = (1 - progress) * (ring.inward ? .85 : .7);
        if (camera) ring.mesh.quaternion.copy(camera.quaternion);
        if (ring.life <= 0) ring.mesh.visible = false;
      }
    }
    clear() {
      for (const ring of this.rings) {
        ring.life = 0;
        ring.mesh.visible = false;
      }
    }
  }

  let audio = new AudioEngine();
  let input = null;
  let world = null;
  let game = null;

  const CRATERS = [
    { x: 0, z: 105, radius: 62, depth: 7.5, rim: 2.1 },
    { x: -74, z: 91, radius: 27, depth: 5.2, rim: 1.4 },
    { x: 82, z: 112, radius: 33, depth: 6.4, rim: 1.8 },
    { x: -128, z: -75, radius: 46, depth: 8.2, rim: 2.2 },
    { x: 122, z: -88, radius: 56, depth: 9.5, rim: 2.6 },
    { x: -34, z: -186, radius: 31, depth: 4.8, rim: 1.7 },
    { x: 72, z: -222, radius: 24, depth: 4.2, rim: 1.1 },
  ];

  // Three authored places, each with its own geology. The moon should read as
  // a world with regions you can name from the horizon, not one grey plain
  // wearing scattered props. Each entry is both the landform and the anchor
  // every other part of that region is positioned against.
  const REGIONS = [
    {
      id: 'glassworks',
      name: 'THE GLASSWORKS',
      // A raised silica shelf, wind-planed flat on top, so the spire forest
      // reads as a skyline from the whole eastern half of the map.
      x: 175, z: 50, radius: 88, kind: 'shelf', height: 12, flat: .58,
      tint: 0x9ff4ff,
      core: 'ember',
    },
    {
      id: 'hollow',
      name: 'THE HOLLOW',
      // A terraced sinkhole. Everywhere else on the moon you climb; here the
      // prize is at the bottom and the descent is the puzzle.
      x: -215, z: 20, radius: 94, kind: 'sink', depth: 48, terraces: 5,
      tint: 0xc79bff,
      core: 'piton',
    },
    {
      id: 'orrery',
      name: 'THE ORRERY',
      // A shallow gold pan inside a broken ring wall, behind the drop zone:
      // the one region the player has to turn around and go back for.
      x: 150, z: 232, radius: 80, kind: 'pan', depth: 7, wall: 10,
      tint: 0xffd66b,
      core: 'comet',
    },
  ];

  // CORES_ARE_TROPHIES.
  //
  // These used to be permanent upgrades: EMBER made bounces gain speed, COMET
  // made a full charge pierce, KITE let you glide, PITON let the ball stick.
  // They are now things you FIND, not things you become. The pickups are still
  // out there, still beautiful, still worth the trip, and they still orbit the
  // ball once you have them -- they simply do not change what you can do.
  //
  // The reason is that a moveset which arrives in pieces means most of the game
  // is played with an incomplete one, and the best verb of the four spent the
  // whole first act locked in a sinkhole. That verb -- stick the ball, reel
  // yourself to it -- is now the grapple on middle mouse, yours from the first
  // second (see GRAPPLE_PROFILE). The other three are gone as mechanics: they
  // were either invisible in play or a second answer to a question the grapple
  // already answers better.
  //
  // `color` and `id` are still live: they are what the trophy looks like.
  const BALL_CORES = {
    colossus: {
      id: 'colossus',
      // THE COLOSSUS's cracked stone: another pure trophy.
      color: 0xc9a06a,
    },
    roc: {
      id: 'roc',
      // THE ROC's feather: pure trophy, like everything else the bosses give.
      color: 0xffb42a,
    },
    ember: {
      id: 'ember',
      color: 0xff7a3c,
      // Bounces feed the ball instead of bleeding it: the moon becomes a
      // pinball table and ricochets turn into the strongest shot in the game.
      bounceGain: 1.22,
      bounceCap: 72,
    },
    piton: {
      id: 'piton',
      color: 0x63f0ff,
      // A charged kick sticks the ball to ANY surface, and holding the line
      // reels you to it. Every cliff on the moon becomes a climbing hold.
      minCharge: .45,
    },
    kite: {
      id: 'kite',
      color: 0x8bffca,
      // Hold the line while falling and the ball drags you forward instead of
      // down. The sky stops being a set of islands and becomes one place.
      glideFall: 3.4,
      glidePull: 26,
    },
    comet: {
      id: 'comet',
      color: 0xffd66b,
      // A full-charge kick stops for nothing: it punches through whatever it
      // hits and keeps going, so a lined-up row is one shot instead of five.
      minCharge: .82,
      pierceDamage: 2,
    },
  };

  // THE GRAPPLE. One verb, on the middle mouse button, available from the
  // first second of the game. Kick the ball at anything, press the button, and
  // it bites -- then reels you to it.
  //
  // HELD IS ARMED. There is no window to hit and nothing to time: hold the
  // button and the ball bites the next thing it touches, for as long as you
  // keep holding it. A generous window is still a timing test, and the
  // difficulty here belongs in choosing WHERE to stick, never in when to
  // press. The old PITON wanted a held line AND a >45% charge AND contact all
  // in the same instant, which read as luck rather than as a move you own.
  //
  // The one timer left runs the other way: tapping just AFTER a bounce still
  // catches that bounce, so being slightly late is not a miss either.
  const GRAPPLE_PROFILE = Object.freeze({
    releaseTail: .12,          // held is armed; this only bridges frame edges
    contactMemory: .78,        // pressed late: a contact this recent still bites
    contactMemoryDistance: 15, // ...if the ball has not travelled further than this since
    reelGrace: .55,            // keep reeling after the button comes up
    cooldown: .22,
    // Middle click with the ball in hand THROWS a grapple shot: it sticks to
    // the first thing it touches, no second button, no timing. This is its
    // launch charge -- the old "45% charge" grapple's reach, minus the setup.
    shotCharge: .45,
  });

  // Places, not props. Each landmark is one silhouette you can see from far
  // off, one verb you understand the instant you touch it, and one reward for
  // doing it well. They exist because a moon made of identical grey rocks
  // gives you no reason to go anywhere — the answer to an empty map is
  // somewhere to GO, not more scatter in the way.
  const LANDMARKS = [
    { id: 'arch', kind: 'arch', name: 'THE ARCH', x: -120, z: 150, tint: 0x8fe9ff },
    { id: 'geysers', kind: 'geysers', name: 'GEYSER FLATS', x: 255, z: -70, tint: 0xffd66b },
    { id: 'dish', kind: 'dish', name: 'THE DISH', x: -150, z: -290, tint: 0x7befff },
    { id: 'lodestone', kind: 'lodestone', name: 'THE LODESTONE', x: 70, z: 300, tint: 0xbf83ff },
    { id: 'grove', kind: 'grove', name: 'CHIME GROVE', x: -300, z: -170, tint: 0xffd66b },
    { id: 'garden', kind: 'garden', name: 'BLOOM GARDEN', x: 300, z: 140, tint: 0xff7ad0 },
  ];

  // ---- THE SKYFIELD ------------------------------------------------------
  // The moon came apart and the pieces never fell. Flat-topped slabs hang at
  // four heights, and every one is walkable ground.
  //
  // The load-bearing rule: they catch you from ABOVE and let you through from
  // BELOW. Kicking the ball straight down while airborne is how a player gets
  // up here — it is the first move anyone discovers on their own — and solid
  // undersides would punish exactly that. Same one-way contract the cliff
  // pillars already use, so it is nothing new to learn.
  const SKY_TIERS = [
    { name: 'shelf', height: 36, count: 11, spread: [70, 240], radius: [13, 22] },
    { name: 'reach', height: 82, count: 9, spread: [55, 195], radius: [11, 19] },
    { name: 'high', height: 134, count: 6, spread: [40, 140], radius: [10, 16] },
    { name: 'crown', height: 188, count: 1, spread: [0, 0], radius: [26, 26] },
    // The sky got bigger: two GIANT islands over the cap, shelves over the
    // walks to the far sights so no latitude is empty overhead, and THE
    // PERCH -- a lone colossal slab where something with wings lives.
    { name: 'isle', height: 118, count: 2, spread: [95, 175], radius: [36, 46] },
    { name: 'farshelf', height: 46, count: 5, spread: [40, 150], radius: [12, 20], at: { x: 0, z: 900 } },
    { name: 'ribway', height: 62, count: 4, spread: [30, 120], radius: [11, 17], at: { x: 540, z: 400 } },
    { name: 'needleway', height: 92, count: 3, spread: [35, 110], radius: [12, 16], at: { x: -640, z: -230 } },
    { name: 'perch', height: 150, count: 1, spread: [0, 0], radius: [56, 56], at: { x: -80, z: 780 } },
    // The sky covers the whole moon now: shelves over every remaining route.
    { name: 'orchardway', height: 66, count: 3, spread: [30, 110], radius: [11, 17], at: { x: -440, z: 460 } },
    { name: 'snowway', height: 74, count: 4, spread: [40, 160], radius: [12, 18], at: { x: 300, z: -600 } },
    { name: 'bowlway', height: 58, count: 3, spread: [50, 130], radius: [12, 17], at: { x: 0, z: 660 } },
    { name: 'westway', height: 88, count: 3, spread: [40, 140], radius: [12, 16], at: { x: -320, z: -520 } },
  ];

  // What each slab is FOR. Assigned round-robin so no two neighbours share a
  // job and every tier has a mix of things to do and ways to leave.
  const SKY_ROLES = ['cache', 'ring', 'vent', 'anchor', 'spinner', 'ring', 'cache', 'anchor'];

  // Authored sky STRUCTURES: exact compositions, because "more slabs" is not
  // the same as "shapes that are fun". Heights are offsets above local ground.
  const SKY_STRUCTURES = (() => {
    const list = [];
    // THE HELIX: a spiral stair of eight small decks over THE RILLE's end,
    // crowned with a wide cache platform.
    for (let i = 0; i < 8; i++) {
      const angle = i * .85;
      list.push({
        x: -300 + Math.cos(angle) * 24, z: 300 + Math.sin(angle) * 24,
        lift: 20 + i * 11, radius: 7.5, role: i % 3 === 0 ? 'vent' : 'anchor',
      });
    }
    list.push({ x: -300, z: 300, lift: 116, radius: 14, role: 'cache' });
    // THE ARCHWAY: two piers and a spanning deck over THE DOMES' saddle.
    list.push({ x: 430, z: 95, lift: 26, radius: 8, role: 'anchor' });
    list.push({ x: 462, z: 117, lift: 26, radius: 8, role: 'anchor' });
    list.push({ x: 446, z: 106, lift: 42, radius: 13, role: 'cache', body: 6 });
    // THE CORONET: a ring of six decks over THE FINS with a jewel at centre.
    for (let i = 0; i < 6; i++) {
      const angle = i * (Math.PI / 3);
      list.push({
        x: 270 + Math.cos(angle) * 34, z: -312 + Math.sin(angle) * 34,
        lift: 86 + (i % 2) * 9, radius: 8.5, role: i % 2 ? 'cache' : 'vent',
      });
    }
    list.push({ x: 270, z: -312, lift: 104, radius: 6.5, role: 'spinner' });
    return list;
  })();

  function regionShape(region, x, z) {
    const distance = Math.hypot(x - region.x, z - region.z);
    if (distance > region.radius * 1.24) return 0;
    if (region.kind === 'shelf') {
      return region.height * smootherstep(region.radius, region.radius * region.flat, distance);
    }
    if (region.kind === 'sink') {
      // Quantised falloff makes real terraces with rounded lips, which is what
      // turns a hole into a descent the player can actually plan a route down.
      const inward = clamp(1 - distance / region.radius, 0, 1);
      const scaled = inward * region.terraces;
      const step = Math.floor(scaled);
      const lip = smootherstep(0, .34, scaled - step);
      return -region.depth * ((step + lip) / region.terraces);
    }
    if (region.kind === 'pan') {
      const rim = Math.abs(distance / region.radius - 1);
      const bowl = -region.depth * smootherstep(region.radius, region.radius * .3, distance);
      return bowl + (rim < .16 ? region.wall * (1 - rim / .16) : 0);
    }
    return 0;
  }

  function terrainHeightAt(x, z) {
    let height = -2.8 + fbm(x * .012, z * .012, 5) * 3.3 + fbm(x * .041 + 11, z * .041 - 7, 3) * .8
      + sculptedAt(x, z);
    for (const crater of CRATERS) {
      const distance = Math.hypot(x - crater.x, z - crater.z);
      const normalized = distance / crater.radius;
      if (normalized < 1) {
        const bowl = Math.pow(1 - normalized, 2);
        height -= crater.depth * bowl;
      }
      const rimDistance = Math.abs(normalized - 1);
      if (rimDistance < .18) height += crater.rim * (1 - rimDistance / .18);
    }
    // Orpheus Rim: a true sixty-metre mesa, climbed via four ball anchors.
    const mesaDistance = Math.hypot(x * 1.03, (z + 150) * .94);
    height += 59 * smootherstep(148, 100, mesaDistance);
    // A broken northern crown keeps the silhouette geological rather than cylindrical.
    height += Math.max(0, valueNoise(x * .018 - 4, z * .018 + 9)) * smoothstep(150, 80, mesaDistance) * 4.5;
    for (const region of REGIONS) height += regionShape(region, x, z);
    return height;
  }

  // The terrain law of the WHOLE moon, by unit direction. Inside the authored
  // cap it IS the authored height field, bit-exact -- the crossfade only
  // begins past every authored feature (craters, mesa and regions all live
  // inside r < 400). Outside, 3D value noise sampled on the sphere itself,
  // tuned to the same two bands and amplitudes as the authored base layer so
  // the handover is invisible. Render and collision both call this: what you
  // see and what you stand on are the same number by construction.
  const CAP_FULL = 430;
  const CAP_FADE = 560;

  // ---- THE FAR SIDE --------------------------------------------------------
  // Sights spread around the globe, authored in direction space: analytic,
  // seam-free, and the same law for rendering and collision. Heights obey the
  // sphere's own visibility law -- a thing h metres tall crests the horizon
  // roughly 29*sqrt(h) metres away -- so from anywhere on the moon something
  // is always just showing over the limb, and walking toward it makes it rise.
  const FAR_SIGHTS = (() => {
    const at = (x, z) => chartDirAt(x, z, new T.Vector3()).clone();
    const ribA = at(360, 540);
    const ribB = at(720, 260);
    const ribMid = ribA.clone().add(ribB).normalize();
    return {
      stair: at(0, -640),          // five terraces climbing out of the summit road
      needle: at(-700, -260),      // one impossible spire; grapple it in stages
      orchard: at(-430, 470),      // a stand of spires to thread at speed
      bowl: at(0, 1130),           // a deep ice crater near the antipode
      montA: at(620, -520),        // two true mountains for the horizon
      montB: at(-260, 900),
      ribA, ribB, ribMid,
      ribNormal: ribA.clone().cross(ribB).normalize(),
      ribHalfArc: PLANET.radius * ribA.angleTo(ribB) / 2,
    };
  })();
  const FAR_CRATERS = [
    { x: 240, z: 780, radius: 60, depth: 9, rim: 2.6 },
    { x: -520, z: -640, radius: 44, depth: 7, rim: 2.2 },
    { x: 860, z: -140, radius: 34, depth: 5.5, rim: 1.8 },
    { x: -840, z: 330, radius: 52, depth: 8.5, rim: 2.4 },
    { x: 90, z: -960, radius: 38, depth: 6, rim: 2 },
  ].map(crater => ({ ...crater, dir: chartDirAt(crater.x, crater.z, new T.Vector3()).clone() }));
  // Session-4 landforms live in PLANAR chart coordinates and apply through
  // sculptedAt() on BOTH terrain paths -- several of them straddle the
  // authored-cap boundary (rho 430-560), where far-only features are muted
  // to nothing. That bug shipped a cave with no cavity.
  const SCULPT_PITS = [
    // THE RILLE: four overlapping pits, one snaking canyon.
    { x: -560, z: -20, radius: 36, depth: 11, rim: 3 },
    { x: -470, z: 90, radius: 36, depth: 12, rim: 3 },
    { x: -380, z: 200, radius: 34, depth: 11, rim: 3 },
    { x: -300, z: 300, radius: 30, depth: 9, rim: 2.6 },
    // THE GRABEN: the dark quarter's sunken heart, with two deep pits.
    { x: -520, z: 100, radius: 110, depth: 10, rim: 4 },
    { x: -540, z: 80, radius: 30, depth: 22, rim: 2 },
    { x: -490, z: 140, radius: 26, depth: 20, rim: 2 },
    // Cave trench: two overlapping pits east of the mesa, roofed by makeCaves.
    { x: 375, z: -145, radius: 30, depth: 20, rim: 2 },
    { x: 391, z: -129, radius: 30, depth: 20, rim: 2 },
  ];
  const SCULPT_BUMPS = [
    { x: 430, z: 60, radius: 58, height: 17 },
    { x: 505, z: 145, radius: 48, height: 14 },
    { x: 375, z: 165, radius: 42, height: 12 },
    { x: 250, z: -380, radius: 24, height: 15 }, { x: 292, z: -348, radius: 24, height: 15 }, { x: 334, z: -316, radius: 24, height: 15 },
    { x: 228, z: -310, radius: 22, height: 12 }, { x: 270, z: -278, radius: 22, height: 12 }, { x: 312, z: -246, radius: 22, height: 12 },
  ];
  function sculptedAt(x, z) {
    let height = 0;
    for (const pit of SCULPT_PITS) {
      const normalized = Math.hypot(x - pit.x, z - pit.z) / pit.radius;
      if (normalized < 1) height -= pit.depth * Math.pow(1 - normalized, 2);
      const rimDistance = Math.abs(normalized - 1);
      if (rimDistance < .18) height += pit.rim * (1 - rimDistance / .18);
    }
    for (const bump of SCULPT_BUMPS) {
      const distance = Math.hypot(x - bump.x, z - bump.z);
      if (distance < bump.radius) height += bump.height * Math.pow(smoothstep(bump.radius, 4, distance), 1.15);
    }
    return height;
  }
  const arcTo = (dir, sightDir) => PLANET.radius * Math.acos(clamp(dir.dot(sightDir), -1, 1));
  // (Session-4 domes and fins live in SCULPT_BUMPS above, applied on both
  // terrain paths through sculptedAt.)
  function farElevation(dir) {
    let height = 0;
    for (const crater of FAR_CRATERS) {
      const normalized = arcTo(dir, crater.dir) / crater.radius;
      if (normalized < 1) height -= crater.depth * Math.pow(1 - normalized, 2);
      const rimDistance = Math.abs(normalized - 1);
      if (rimDistance < .18) height += crater.rim * (1 - rimDistance / .18);
    }
    // THE STAIR: five terraces, 90 m top to toe -- pure movement.
    // Lip blend width stays comfortably above the 3.7 m mesh spacing, so the
    // drawn terrace edge and the walked terrace edge are the same edge.
    const stairDistance = arcTo(dir, FAR_SIGHTS.stair);
    if (stairDistance < 175) {
      for (let k = 0; k < 5; k++) height += 18 * smoothstep(138 - k * 26 + 9, 138 - k * 26 - 9, stairDistance);
    }
    // THE RIB: a 40 m ridge running between two ends -- a road, not a wall.
    const ribOffset = Math.abs(Math.asin(clamp(dir.dot(FAR_SIGHTS.ribNormal), -1, 1))) * PLANET.radius;
    if (ribOffset < 46) {
      const along = smoothstep(FAR_SIGHTS.ribHalfArc + 46, FAR_SIGHTS.ribHalfArc - 26, arcTo(dir, FAR_SIGHTS.ribMid));
      height += 40 * smoothstep(34, 5, ribOffset) * along;
    }
    // Mounds under THE NEEDLE and THE ORCHARD so the verbs start on a rise.
    height += 24 * smoothstep(70, 8, arcTo(dir, FAR_SIGHTS.needle));
    height += 13 * smoothstep(90, 15, arcTo(dir, FAR_SIGHTS.orchard));
    // Two true mountains: the far horizon has somewhere to be.
    height += 92 * Math.pow(smoothstep(150, 0, arcTo(dir, FAR_SIGHTS.montA)), 1.5);
    height += 74 * Math.pow(smoothstep(130, 0, arcTo(dir, FAR_SIGHTS.montB)), 1.5);
    // Session-4 landforms, in the same chart the authored cap speaks.
    {
      const horizontal = Math.hypot(dir.x, dir.z);
      if (horizontal > 1e-9) {
        const rho = PLANET.radius * Math.atan2(horizontal, dir.y);
        height += sculptedAt(dir.x * (rho / horizontal), dir.z * (rho / horizontal));
      }
    }
    // THE BOWL: rim up, floor down; the ice flattening happens in elevationAt.
    const bowlDistance = arcTo(dir, FAR_SIGHTS.bowl);
    if (bowlDistance < 150) {
      const rimDistance = Math.abs(bowlDistance - 96) / 20;
      if (rimDistance < 1) height += 13 * (1 - rimDistance);
      height -= 20 * smoothstep(92, 30, bowlDistance);
    }
    return height;
  }
  // THE ICE FIELD: a whole frozen region around THE BOWL. Wide weight drives
  // the look and the slide; the narrow rink weight still flattens only the
  // bowl floor itself.
  function iceWeightAt(dir) {
    return smoothstep(210, 95, arcTo(dir, FAR_SIGHTS.bowl));
  }
  function rinkWeightAt(dir) {
    return smoothstep(66, 34, arcTo(dir, FAR_SIGHTS.bowl));
  }
  // THE SNOW COUNTRY: the southern quarter around THE STAIR and the great
  // mountain. Bright ground, falling snow, soft landings.
  const SNOW_CENTRE = chartDirAt(280, -620, new T.Vector3()).clone();
  function snowWeightAt(dir) {
    return smoothstep(360, 210, arcTo(dir, SNOW_CENTRE));
  }
  // THE DARK QUARTER: the one part of this moon the sun forgets. Charcoal
  // ground, dim light, glowing crystals -- and the dead astronauts walk here.
  const DARK_CENTRE = chartDirAt(-520, 100, new T.Vector3()).clone();
  function darkWeightAt(dir) {
    return smoothstep(250, 130, arcTo(dir, DARK_CENTRE));
  }
  // THE HOLE TO THE END OF THE MOON. Once every boss is down and enough
  // crescents are gathered, the ice cracks and a shaft opens through THE
  // BOWL's floor -- the same law feeds render and collision, so the way down
  // is exactly what you see.
  const MOONHOLE = { open: false, depth: -88 };
  // THE THIN PLACES. Three cracked plates of crust; break one open, drop in,
  // and you fall THROUGH the moon and land on the exact opposite side.
  const CRUST_HOLES = [
    { x: 455, z: 55 }, { x: -180, z: 640 }, { x: 140, z: -810 },
  ].map(hole => ({ ...hole, dir: chartDirAt(hole.x, hole.z, new T.Vector3()).clone(), open: false }));

  function elevationAt(dir) {
    const horizontal = Math.hypot(dir.x, dir.z);
    const rho = PLANET.radius * Math.atan2(horizontal, dir.y);
    let authored = 0;
    let authoredWeight = 0;
    if (horizontal < 1e-9) {
      if (dir.y > 0) return terrainHeightAt(0, 0);
    } else if (rho < CAP_FADE) {
      authored = terrainHeightAt(dir.x * (rho / horizontal), dir.z * (rho / horizontal));
      authoredWeight = 1 - smoothstep(CAP_FULL, CAP_FADE, rho);
      if (authoredWeight >= 1) return authored;
    }
    let base = -2.8 + fbm3(dir.x * 5.06, dir.y * 5.06, dir.z * 5.06, 5) * 3.3
      + fbm3(dir.x * 17.2 + 11, dir.y * 17.2 - 7, dir.z * 17.2, 3) * .8
      + farElevation(dir);
    const ice = rinkWeightAt(dir);
    if (ice > 0) base = lerp(base, -16, ice);
    if (MOONHOLE.open) {
      const shaft = smoothstep(34, 15, arcTo(dir, FAR_SIGHTS.bowl));
      if (shaft > 0) base = lerp(base, MOONHOLE.depth, shaft);
    }
    let blended = lerp(base, authored, authoredWeight);
    // THE THIN PLACES carve wherever they are -- including inside the
    // authored-cap blend band, which mutes far-only features.
    for (const hole of CRUST_HOLES) {
      if (!hole.open) continue;
      const shaft = smoothstep(20, 6, arcTo(dir, hole.dir));
      if (shaft > 0) blended = lerp(blended, -46, shaft);
    }
    return blended;
  }

  const groundDirScratch = new T.Vector3();
  const shadeDirScratch = new T.Vector3();
  const absorbPoint = new T.Vector3();
  const absorbUp = new T.Vector3();
  const snowballScratch = new T.Vector3();
  const snowballMatrix = new T.Matrix4();
  const absorbQuat = new T.Quaternion();
  const absorbScale = new T.Vector3();
  const absorbMatrix = new T.Matrix4();
  const snowPoint = new T.Vector3();
  const snowEast = new T.Vector3();
  const snowNorth = new T.Vector3();
  function groundHeightAt(x, z) {
    if (SPHERE_WORLD) {
      // Bit-exact authored heights inside the cap; the seam-free law outside.
      if (Math.hypot(x, z) < CAP_FULL) return terrainHeightAt(x, z);
      return elevationAt(chartDirAt(x, z, groundDirScratch));
    }
    return world?.sampleTerrainHeight ? world.sampleTerrainHeight(x, z) : terrainHeightAt(x, z);
  }

  function mergeStaticGeometries(sources) {
    const geometries = sources.map(source => {
      const geometry = source.index ? source.toNonIndexed() : source.clone();
      source.dispose();
      return geometry;
    });
    const merged = new T.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const attributes = geometries.map(geometry => geometry.getAttribute(name));
      if (attributes.some(attribute => !attribute)) continue;
      const itemSize = attributes[0].itemSize;
      const length = attributes.reduce((total, attribute) => total + attribute.array.length, 0);
      const array = new Float32Array(length);
      let offset = 0;
      for (const attribute of attributes) {
        array.set(attribute.array, offset);
        offset += attribute.array.length;
      }
      merged.setAttribute(name, new T.BufferAttribute(array, itemSize));
    }
    geometries.forEach(geometry => geometry.dispose());
    merged.computeBoundingSphere();
    return merged;
  }

  class LunarWorld {
    constructor() {
      this.scene = new T.Scene();
      this.scene.background = new T.Color(0x000005);
      this.scene.fog = new T.FogExp2(0x02020a, .00072);
      this.camera = new T.PerspectiveCamera(76, 1, .05, 2400);
      this.camera.rotation.order = 'YXZ';
      this.fxScratch = new T.Vector3();
      this.fxScratchB = new T.Vector3();
      this.scene.add(this.camera);
      try {
        this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
      } catch (error) {
        fatal(`WebGL could not start: ${error.message || error}`);
        throw error;
      }
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.18;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      this.renderer.setClearColor(0x000005, 1);
      this.qualityOrder = ['LOW', 'MED', 'HIGH'];
      let rememberedQuality = 'HIGH';
      try { rememberedQuality = localStorage.getItem(QUALITY_STORAGE_KEY) || 'HIGH'; } catch (_) {}
      const requested = (params.get('quality') || rememberedQuality).toUpperCase();
      this.quality = this.qualityOrder.includes(requested) ? requested : 'HIGH';
      this.frameSamples = [];
      this.autoReduced = false;
      this.autoReductionCooldown = 0;
      this.materials = {};
      this.platforms = [];
      this.anchors = [];
      this.breakables = [];
      this.collectibles = [];
      this.nests = [];
      this.launchPads = [];
      this.moonChimes = [];
      this.enemies = [];
      this.elapsed = 0;
      this.makeMaterials();
      this.makeLights();
      this.makeSky();
      this.makeTerrain();
      this.makeCliffRoute();
      this.makeCourseObjects();
      this.makeBreakableField();
      this.makePlaygroundFeatures();
      this.makeLandmarks();
      this.makeRegions();
      this.makeSkyfield();
      this.makeLaunchRings();
      this.makeFarSights();
      this.makeRoc();
      this.makeColossus();
      this.makeFullMoons();
      this.makeBiomeProps();
      this.makeCrustPlates();
      this.makeCaves();
      this.makeFirstPersonRig();
      this.makeBallVisual();
      this.makeBeacon();
      this.liftWorld();
      this.particles = new ParticleField(this.scene, this.quality === 'LOW' ? 520 : 900);
      this.ringField = new RingField(this.scene, this.quality === 'LOW' ? 10 : 18);
      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive: true });
      this.applyQuality(this.quality, false);
    }
    makeMaterials() {
      const textures = makeRegolithTextures();
      textures.color.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      this.materials.regolith = new T.MeshStandardMaterial({
        map: textures.color,
        bumpMap: textures.bump,
        bumpScale: 1.05,
        vertexColors: true,
        roughness: .96,
        metalness: .035,
        color: 0xd4d9e2,
      });
      this.materials.rock = new T.MeshStandardMaterial({ color: 0x777d8c, roughness: .94, metalness: .04 });
      this.materials.darkRock = new T.MeshStandardMaterial({
        color: 0x626978, roughness: .97, metalness: .02,
        emissive: 0x0d1120, emissiveIntensity: .16,
        map: this.materials.regolith.map, bumpMap: this.materials.regolith.bumpMap, bumpScale: .72,
      });
      this.materials.glass = new T.MeshPhysicalMaterial({
        color: 0x6ddfff, emissive: 0x116a8c, emissiveIntensity: 2.6,
        metalness: .08, roughness: .16, transmission: .2, transparent: true, opacity: .82,
      });
      this.materials.violet = new T.MeshStandardMaterial({ color: 0x7b5bca, roughness: .34, metalness: .52 });
      this.materials.alien = new T.MeshStandardMaterial({ color: 0x2b194d, roughness: .42, metalness: .3 });
      this.materials.alienShell = new T.MeshStandardMaterial({ color: 0x6953ad, roughness: .3, metalness: .62 });
      this.materials.cyan = new T.MeshStandardMaterial({ color: 0x6eeeff, emissive: 0x1dbbd6, emissiveIntensity: 3.8, roughness: .18, metalness: .5 });
      this.materials.gold = new T.MeshStandardMaterial({ color: 0xffd76f, emissive: 0xd78c18, emissiveIntensity: 3.2, roughness: .22, metalness: .62 });
      this.materials.black = new T.MeshStandardMaterial({ color: 0x080813, roughness: .24, metalness: .8 });
      this.glowCyan = radialTexture('rgba(120,242,255,1)', 'rgba(25,118,255,0)');
      this.glowGold = radialTexture('rgba(255,226,116,1)', 'rgba(255,110,26,0)');
      this.glowViolet = radialTexture('rgba(202,134,255,1)', 'rgba(79,23,255,0)');
    }
    makeLights() {
      this.ambient = new T.HemisphereLight(0x98bdff, 0x090610, .43);
      this.scene.add(this.ambient);
      this.sun = new T.DirectionalLight(0xfff1d6, 4.65);
      this.sun.position.set(-130, 210, 110);
      this.sun.castShadow = true;
      this.sun.shadow.camera.near = 10;
      this.sun.shadow.camera.far = 540;
      this.sun.shadow.camera.left = -155;
      this.sun.shadow.camera.right = 155;
      this.sun.shadow.camera.top = 155;
      this.sun.shadow.camera.bottom = -155;
      this.sun.shadow.bias = -.00022;
      this.sun.shadow.normalBias = .035;
      this.scene.add(this.sun);
      this.scene.add(this.sun.target);
      this.rimLight = new T.DirectionalLight(0x6254ff, 1.1);
      this.rimLight.position.set(170, 90, -210);
      this.scene.add(this.rimLight);
    }
    makeGlowSprite(texture, scale, opacity = 1) {
      const sprite = new T.Sprite(new T.SpriteMaterial({
        map: texture, color: 0xffffff, transparent: true, opacity,
        depthWrite: false, blending: T.AdditiveBlending,
      }));
      sprite.scale.setScalar(scale);
      return sprite;
    }
    makeSky() {
      const count = this.quality === 'LOW' ? 2200 : 5200;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      // Two per-star attributes drive the twinkle: how big it is, and where in
      // its own cycle it currently sits. A sky where every star is the same
      // size and perfectly still reads as a texture; this reads as depth.
      const twinkle = new Float32Array(count * 2);
      const starColor = new T.Color();
      for (let i = 0; i < count; i++) {
        const z = randomRange(-1, 1, worldRandom);
        const angle = worldRandom() * TAU;
        const radius = randomRange(1000, 1700, worldRandom);
        const planar = Math.sqrt(1 - z * z);
        positions[i * 3] = Math.cos(angle) * planar * radius;
        positions[i * 3 + 1] = z * radius;
        positions[i * 3 + 2] = Math.sin(angle) * planar * radius;
        const choice = worldRandom();
        if (choice < .12) starColor.setRGB(.52, .82, 1);
        else if (choice < .22) starColor.setRGB(1, .82, .54);
        else if (choice < .28) starColor.setRGB(.88, .61, 1);
        else starColor.setRGB(.82 + worldRandom() * .18, .85 + worldRandom() * .15, 1);
        // Steep power curve: mostly faint pinpricks, a handful of real stars.
        const magnitude = Math.pow(worldRandom(), 3.4);
        const brightness = .55 + magnitude * .45;
        colors[i * 3] = starColor.r * brightness;
        colors[i * 3 + 1] = starColor.g * brightness;
        colors[i * 3 + 2] = starColor.b * brightness;
        twinkle[i * 2] = .55 + magnitude * 1.9;
        twinkle[i * 2 + 1] = worldRandom() * TAU;
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
      geometry.setAttribute('kbTwinkle', new T.BufferAttribute(twinkle, 2));
      // A soft round sprite, not a bare point: once stars have real magnitudes
      // the big ones are several pixels across, and an untextured point is a
      // square. Squares in the sky are the fastest way to look cheap.
      const starMaterial = new T.PointsMaterial({
        map: radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 64),
        size: 3.2, sizeAttenuation: false, vertexColors: true,
        transparent: true, opacity: .96, depthWrite: false,
      });
      this.skyTime = { value: 0 };
      starMaterial.onBeforeCompile = shader => {
        shader.uniforms.kbTime = this.skyTime;
        shader.vertexShader = shader.vertexShader
          .replace('void main() {', 'attribute vec2 kbTwinkle;\nuniform float kbTime;\nvoid main() {')
          .replace('gl_PointSize = size;', 'gl_PointSize = size * kbTwinkle.x * (0.84 + 0.16 * sin(kbTime * 2.4 + kbTwinkle.y));');
      };
      this.stars = new T.Points(geometry, starMaterial);
      this.scene.add(this.stars);

      // A dense diagonal stellar band makes the backdrop feel like a dark planetarium.
      const bandCount = 1500;
      const bandPositions = new Float32Array(bandCount * 3);
      const bandColors = new Float32Array(bandCount * 3);
      for (let i = 0; i < bandCount; i++) {
        const angle = worldRandom() * TAU;
        const latitude = randomRange(-.085, .085, worldRandom) + Math.sin(angle * 2) * .018;
        const radius = randomRange(1120, 1540, worldRandom);
        bandPositions[i * 3] = Math.cos(angle) * Math.cos(latitude) * radius;
        bandPositions[i * 3 + 1] = Math.sin(latitude) * radius + Math.sin(angle) * 210;
        bandPositions[i * 3 + 2] = Math.sin(angle) * Math.cos(latitude) * radius;
        bandColors[i * 3] = .34 + worldRandom() * .28;
        bandColors[i * 3 + 1] = .46 + worldRandom() * .3;
        bandColors[i * 3 + 2] = .7 + worldRandom() * .3;
      }
      const bandGeometry = new T.BufferGeometry();
      bandGeometry.setAttribute('position', new T.BufferAttribute(bandPositions, 3));
      bandGeometry.setAttribute('color', new T.BufferAttribute(bandColors, 3));
      this.starBand = new T.Points(bandGeometry, new T.PointsMaterial({
        size: 1.25, sizeAttenuation: false, vertexColors: true,
        transparent: true, opacity: .43, depthWrite: false, blending: T.AdditiveBlending,
      }));
      this.starBand.rotation.z = -.28;
      this.scene.add(this.starBand);
      skyMaterial(this.stars);
      skyMaterial(this.starBand);

      this.makePlanet({
        position: new T.Vector3(390, 290, -770), radius: 118,
        colors: ['#0c1b4b', '#155fc6', '#2bd9cf', '#e8e9d4', '#8366f5'],
        atmosphere: 0x59dfff, rings: false, tilt: -.18,
      });
      this.makePlanet({
        position: new T.Vector3(-590, 175, -860), radius: 175,
        colors: ['#26123e', '#673ca7', '#f08bc4', '#edc071', '#5146a9'],
        atmosphere: 0xd98dff, rings: true, tilt: .47,
      });

      const sunDisk = this.makeGlowSprite(this.glowGold, 90, .7);
      sunDisk.position.set(-720, 820, 420);
      this.scene.add(sunDisk);
      const sunCore = this.makeGlowSprite(this.glowGold, 24, 1);
      sunCore.position.copy(sunDisk.position);
      this.scene.add(sunCore);

      this.makeNebulae();
      this.makeHomeWorld();
      this.makeMeteors();
    }
    // Deep colour behind the stars. Four enormous additive sprites, which cost
    // four draw calls and turn a black backdrop into a place.
    makeNebulae() {
      const clouds = [
        { at: [-1250, 420, -900], scale: 1500, tint: [92, 58, 210], second: [40, 150, 220] },
        { at: [980, 300, -1180], scale: 1250, tint: [190, 60, 150], second: [70, 40, 190] },
        { at: [420, -180, 1350], scale: 1400, tint: [36, 120, 200], second: [24, 60, 170] },
        { at: [-1050, -260, 950], scale: 1100, tint: [150, 70, 220], second: [30, 90, 200] },
      ];
      for (const cloud of clouds) {
        // 1024 with a blur pass: at 256 the texel grid of the additive
        // low-alpha blobs survived magnification as a faint quilt of squares
        // across the whole sky -- Alex reported it twice. Same worldRandom
        // draw count as before; only the canvas work changed.
        const size = 512;
        const canvasElement = document.createElement('canvas');
        canvasElement.width = canvasElement.height = size;
        const context = canvasElement.getContext('2d');
        // Layered soft blobs: a nebula is lumpy, and a single radial gradient
        // reads as a lens flare instead of a cloud.
        for (let i = 0; i < 26; i++) {
          const cx = size * (.5 + randomRange(-.3, .3, worldRandom));
          const cy = size * (.5 + randomRange(-.3, .3, worldRandom));
          const r = size * randomRange(.1, .34, worldRandom);
          const mix = worldRandom();
          const tint = mix < .55 ? cloud.tint : cloud.second;
          const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, r);
          gradient.addColorStop(0, `rgba(${tint[0]},${tint[1]},${tint[2]},${randomRange(.11, .24, worldRandom)})`);
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          context.fillStyle = gradient;
          context.fillRect(0, 0, size, size);
        }
        // A soft mask at the rim so the square sprite never shows its edges.
        const mask = context.createRadialGradient(size / 2, size / 2, size * .18, size / 2, size / 2, size * .5);
        mask.addColorStop(0, 'rgba(0,0,0,0)');
        mask.addColorStop(1, 'rgba(0,0,0,1)');
        context.globalCompositeOperation = 'destination-out';
        context.fillStyle = mask;
        context.fillRect(0, 0, size, size);
        // Final smoothing: one blurred self-draw erases any remaining
        // per-texel quantization noise before the sky ever sees it.
        const smoothed = document.createElement('canvas');
        smoothed.width = smoothed.height = size;
        const smoothContext = smoothed.getContext('2d');
        smoothContext.filter = 'blur(5px)';
        smoothContext.drawImage(canvasElement, 0, 0);
        const texture = new T.CanvasTexture(smoothed);
        texture.colorSpace = T.SRGBColorSpace;
        const sprite = new T.Sprite(new T.SpriteMaterial({
          map: texture, transparent: true, opacity: .95,
          depthWrite: false, depthTest: false, blending: T.AdditiveBlending,
        }));
        sprite.scale.setScalar(cloud.scale);
        sprite.position.set(cloud.at[0], cloud.at[1], cloud.at[2]);
        sprite.renderOrder = -10;
        this.scene.add(sprite);
      }
    }
    // The world you came from, hanging over the eastern rim. Every other object
    // in this sky is invented; this one is the reason the moon means anything.
    makeHomeWorld() {
      const width = 1024, height = 512;
      const canvasElement = document.createElement('canvas');
      canvasElement.width = width;
      canvasElement.height = height;
      const context = canvasElement.getContext('2d');
      const image = context.createImageData(width, height);
      const data = image.data;
      // Build the elevation field first and threshold it at a percentile of its
      // own range. Picking an absolute cutoff means guessing what fbm() returns,
      // and guessing wrong gives you an all-ocean planet with no continents.
      const field = new Float32Array(width * height);
      let low = Infinity, high = -Infinity;
      for (let y = 0; y < height; y++) {
        const lat = (y / height) * 2 - 1;
        for (let x = 0; x < width; x++) {
          const nx = x / width * 9;
          const ny = y / height * 5;
          const value = fbm(nx, ny, 5) + fbm(nx * 2.4 + 30, ny * 2.4 - 12, 3) * .34 - Math.abs(lat) * .28;
          field[y * width + x] = value;
          if (value < low) low = value;
          if (value > high) high = value;
        }
      }
      const shoreline = low + (high - low) * .62;
      const span = (high - low) || 1;
      for (let y = 0; y < height; y++) {
        // Latitude squash keeps continents from smearing at the poles.
        const lat = (y / height) * 2 - 1;
        for (let x = 0; x < width; x++) {
          const land = .52 + (field[y * width + x] - shoreline) / span;
          const i = (y * width + x) * 4;
          const ice = Math.abs(lat) > .82 ? smoothstep(.82, .95, Math.abs(lat)) : 0;
          // Tuned bright. This is drawn against black, through ACES tone
          // mapping, at a fifth of the screen: a realistic albedo reads as a
          // dark grey ball, and the continents disappear entirely.
          if (land > .52) {
            // Interiors go dry and pale, coasts stay green. Flat green reads
            // as moss on a marble rather than as a world with weather.
            const inland = clamp((land - .52) / .22, 0, 1);
            const arid = smoothstep(.1, .55, Math.abs(lat)) * .55 + inland * .45;
            data[i] = lerp(74, 186, arid);
            data[i + 1] = lerp(136, 158, arid);
            data[i + 2] = lerp(72, 104, arid);
          } else {
            const deep = clamp((.52 - land) / .3, 0, 1);
            data[i] = lerp(58, 20, deep);
            data[i + 1] = lerp(140, 76, deep);
            data[i + 2] = lerp(214, 168, deep);
          }
          if (ice > 0) {
            data[i] = lerp(data[i], 236, ice);
            data[i + 1] = lerp(data[i + 1], 242, ice);
            data[i + 2] = lerp(data[i + 2], 252, ice);
          }
          data[i + 3] = 255;
        }
      }
      context.putImageData(image, 0, 0);
      // Cloud bands on top, so the planet reads as alive rather than painted.
      context.globalCompositeOperation = 'screen';
      for (let i = 0; i < 80; i++) {
        const cx = worldRandom() * width;
        const cy = worldRandom() * height;
        const r = randomRange(10, 58, worldRandom);
        const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, `rgba(255,255,255,${randomRange(.12, .3, worldRandom)})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = gradient;
        context.beginPath();
        context.ellipse(cx, cy, r * 1.9, r * .58, 0, 0, TAU);
        context.fill();
      }
      const texture = new T.CanvasTexture(canvasElement);
      texture.colorSpace = T.SRGBColorSpace;
      // High enough to clear the mesa, the skyfield and the spires, so it is
      // never a thing peeking out from behind scenery. Look up and it is there.
      const radius = 240;
      const position = new T.Vector3(500, 950, -820);
      // Lit by its own map rather than by the scene's sun. A directional light
      // aimed at the moon leaves a distant sphere almost black on the wrong
      // side, and this is the one object in the sky that has to read instantly.
      const earth = new T.Mesh(
        new T.SphereGeometry(radius, 72, 48),
        new T.MeshStandardMaterial({
          map: texture, roughness: .92, metalness: .02,
          emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 1,
        }),
      );
      earth.position.copy(position);
      this.homeEarth = earth;
      earth.rotation.z = .41;
      this.scene.add(earth);
      const air = new T.Mesh(
        new T.SphereGeometry(radius * 1.045, 48, 32),
        new T.MeshBasicMaterial({ color: 0x7cc9ff, transparent: true, opacity: .2, side: T.BackSide, blending: T.AdditiveBlending }),
      );
      air.position.copy(position);
      this.scene.add(air);
      const halo = this.makeGlowSprite(radialTexture('rgba(124,201,255,.5)'), radius * 3.1, .42);
      halo.position.copy(position);
      this.scene.add(halo);
      skyMaterial(earth);
      skyMaterial(air);
      earth.userData.spinRate = .0045;
      if (!this.planets) this.planets = [];
      this.planets.push(earth);
    }
    // Meteors. Nothing in this sky moved before; now something does, rarely
    // enough that catching one still feels like catching one.
    makeMeteors() {
      this.meteors = [];
      const count = this.quality === 'LOW' ? 2 : 4;
      for (let i = 0; i < count; i++) {
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
        const line = new T.Line(geometry, new T.LineBasicMaterial({
          color: 0xdfefff, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending,
        }));
        line.frustumCulled = false;
        this.scene.add(line);
        skyMaterial(line);
        this.meteors.push({
          line,
          from: new T.Vector3(),
          direction: new T.Vector3(),
          life: 0,
          span: 1,
          length: 90,
          wait: randomRange(2, 26, worldRandom) + i * 7,
        });
      }
    }
    updateMeteors(dt) {
      if (!this.meteors) return;
      for (const meteor of this.meteors) {
        if (meteor.life > 0) {
          meteor.life -= dt;
          const t = 1 - meteor.life / meteor.span;
          const head = this.tempSkyA = this.tempSkyA || new T.Vector3();
          head.copy(meteor.from).addScaledVector(meteor.direction, t * 1500);
          const positions = meteor.line.geometry.attributes.position;
          positions.setXYZ(0, head.x, head.y, head.z);
          positions.setXYZ(1,
            head.x - meteor.direction.x * meteor.length,
            head.y - meteor.direction.y * meteor.length,
            head.z - meteor.direction.z * meteor.length);
          positions.needsUpdate = true;
          // Fade in fast, out slow, so it streaks rather than blinks.
          meteor.line.material.opacity = clamp(Math.sin(t * Math.PI) * 1.5, 0, .95);
          if (meteor.life <= 0) {
            meteor.line.material.opacity = 0;
            meteor.wait = randomRange(8, 34, cosmeticRandom);
          }
          continue;
        }
        meteor.wait -= dt;
        if (meteor.wait > 0) continue;
        const angle = cosmeticRandom() * TAU;
        const height = randomRange(.15, .75, cosmeticRandom);
        meteor.from.set(Math.cos(angle) * 1400, height * 1200, Math.sin(angle) * 1400);
        meteor.direction.set(
          randomRange(-1, 1, cosmeticRandom),
          randomRange(-.55, -.12, cosmeticRandom),
          randomRange(-1, 1, cosmeticRandom)).normalize();
        meteor.span = randomRange(.9, 1.9, cosmeticRandom);
        meteor.life = meteor.span;
        meteor.length = randomRange(60, 165, cosmeticRandom);
      }
    }
    makePlanet(options) {
      const width = 1024, height = 512;
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = width;
      textureCanvas.height = height;
      const context = textureCanvas.getContext('2d');
      const gradient = context.createLinearGradient(0, 0, 0, height);
      options.colors.forEach((color, index) => gradient.addColorStop(index / (options.colors.length - 1), color));
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'screen';
      for (let i = 0; i < 42; i++) {
        const y = worldRandom() * height;
        const thickness = randomRange(2, 28, worldRandom);
        context.fillStyle = `rgba(${Math.floor(randomRange(80, 255, worldRandom))},${Math.floor(randomRange(80, 230, worldRandom))},255,${randomRange(.015, .12, worldRandom)})`;
        context.fillRect(0, y, width, thickness);
      }
      context.globalCompositeOperation = 'multiply';
      for (let i = 0; i < 28; i++) {
        const x = worldRandom() * width, y = worldRandom() * height;
        const rx = randomRange(20, 130, worldRandom), ry = randomRange(4, 22, worldRandom);
        context.fillStyle = `rgba(10,5,30,${randomRange(.025, .15, worldRandom)})`;
        context.beginPath();
        context.ellipse(x, y, rx, ry, randomRange(-.2, .2, worldRandom), 0, TAU);
        context.fill();
      }
      const texture = new T.CanvasTexture(textureCanvas);
      texture.colorSpace = T.SRGBColorSpace;
      const planet = new T.Mesh(
        new T.SphereGeometry(options.radius, 64, 40),
        new T.MeshStandardMaterial({ map: texture, roughness: .78, metalness: .02, emissive: options.atmosphere, emissiveIntensity: .055 }),
      );
      planet.position.copy(options.position);
      planet.rotation.z = options.tilt;
      this.scene.add(planet);
      const atmosphere = new T.Mesh(
        new T.SphereGeometry(options.radius * 1.055, 48, 32),
        new T.MeshBasicMaterial({ color: options.atmosphere, transparent: true, opacity: .14, side: T.BackSide, blending: T.AdditiveBlending }),
      );
      atmosphere.position.copy(options.position);
      this.scene.add(atmosphere);
      const glow = this.makeGlowSprite(radialTexture(`rgba(${new T.Color(options.atmosphere).r * 255},${new T.Color(options.atmosphere).g * 255},${new T.Color(options.atmosphere).b * 255},.62)`), options.radius * 2.85, .4);
      glow.position.copy(options.position).add(new T.Vector3(0, 0, 8));
      this.scene.add(glow);
      if (options.rings) {
        const rings = new T.Mesh(
          new T.RingGeometry(options.radius * 1.28, options.radius * 1.92, 128, 4),
          new T.MeshBasicMaterial({ color: 0xdcc6ff, transparent: true, opacity: .3, side: T.DoubleSide, depthWrite: false }),
        );
        rings.position.copy(options.position);
        rings.rotation.set(Math.PI / 2.55, .18, options.tilt);
        this.scene.add(rings);
        skyMaterial(rings);
      }
      planet.userData.spinRate = randomRange(.008, .018, worldRandom);
      if (!this.planets) this.planets = [];
      this.planets.push(planet);
      skyMaterial(planet);
      skyMaterial(atmosphere);
    }
    makeTerrain() {
      // THE MOON ITSELF. A subdivided icosahedron displaced radially by the
      // same height law collision samples -- no poles, no seam, no edge, and
      // every face the same size. Detail 7 puts vertices ~3.7 m apart, finer
      // than the flat build's 4.5 m grid, which is what keeps a crater rim a
      // rim and a mesa edge an edge. Normals are analytic (radial minus the
      // tangent height gradient), so the duplicated vertices of a polyhedron
      // geometry still shade as one smooth surface.
      // THE MOON, actually dense this time. Three r161 subdivides
      // PolyhedronGeometry LINEARLY (detail+1 segments per edge), so the old
      // "detail 7" moon was secretly 642 unique vertices with ~59 m facets
      // that the texture and smooth normals disguised -- which is exactly why
      // authored craters and terraces existed under your feet but not before
      // your eyes. Detail 127 = 128 segments per icosahedron edge: 163,842
      // unique vertices, ~3.6 m spacing, finer than the flat build's 4.5 m
      // grid. The non-indexed buffer carries ~983k entries (each vertex
      // duplicated across faces), so every expensive evaluation runs once per
      // UNIQUE vertex through a cache, and normals accumulate from the real
      // displaced faces -- what shades is what is drawn is what is walked.
      const geometry = new T.IcosahedronGeometry(1, 127);
      const positions = geometry.attributes.position;
      const entryCount = positions.count;
      const colors = new Float32Array(entryCount * 3);
      const normals = new Float32Array(entryCount * 3);
      const dir = new T.Vector3();
      this.terrainSize = 760;
      this.terrainSegments = 168;
      this.terrainHeights = null;
      const unique = new Map();
      const entryKeys = new Array(entryCount);
      const keyOf = (x, y, z) => Math.round(x * 2e5) + ':' + Math.round(y * 2e5) + ':' + Math.round(z * 2e5);
      // pass 1: displacement -- one elevation evaluation per unique vertex
      for (let i = 0; i < entryCount; i++) {
        const ux = positions.getX(i), uy = positions.getY(i), uz = positions.getZ(i);
        const inv = 1 / Math.hypot(ux, uy, uz);
        const dx = ux * inv, dy = uy * inv, dz = uz * inv;
        const key = keyOf(dx, dy, dz);
        entryKeys[i] = key;
        let record = unique.get(key);
        if (!record) {
          dir.set(dx, dy, dz);
          record = { dx, dy, dz, height: elevationAt(dir), nx: 0, ny: 0, nz: 0, r: 0, g: 0, b: 0 };
          unique.set(key, record);
        }
        const reach = PLANET.radius + record.height;
        positions.setXYZ(i,
          dx * reach + PLANET.centre.x,
          dy * reach + PLANET.centre.y,
          dz * reach + PLANET.centre.z);
      }
      // pass 2: smooth normals accumulated from the real displaced faces
      {
        const pa = new T.Vector3(), pb = new T.Vector3(), pc = new T.Vector3();
        const edgeA = new T.Vector3(), edgeB = new T.Vector3(), face = new T.Vector3();
        for (let i = 0; i < entryCount; i += 3) {
          pa.set(positions.getX(i), positions.getY(i), positions.getZ(i));
          pb.set(positions.getX(i + 1), positions.getY(i + 1), positions.getZ(i + 1));
          pc.set(positions.getX(i + 2), positions.getY(i + 2), positions.getZ(i + 2));
          face.crossVectors(edgeA.subVectors(pb, pa), edgeB.subVectors(pc, pa));
          for (let k = 0; k < 3; k++) {
            const record = unique.get(entryKeys[i + k]);
            record.nx += face.x;
            record.ny += face.y;
            record.nz += face.z;
          }
        }
      }
      // pass 3: tone, once per unique vertex, slope read from the real normal
      this.shadeTerrainRecord = record => {
        const length = Math.hypot(record.nx, record.ny, record.nz) || 1;
        record.nx /= length;
        record.ny /= length;
        record.nz /= length;
        const radial = record.nx * record.dx + record.ny * record.dy + record.nz * record.dz;
        const gradient = Math.sqrt(Math.max(0, 1 - radial * radial)) / Math.max(.2, Math.abs(radial));
        const slope = clamp(gradient * 2.8 * .1, 0, 1);
        const horizontal = Math.hypot(record.dx, record.dz);
        const rho = PLANET.radius * Math.atan2(horizontal, record.dy);
        const px = horizontal > 1e-9 ? record.dx * (rho / horizontal) : 0;
        const pz = horizontal > 1e-9 ? record.dz * (rho / horizontal) : 0;
        const capWeight = 1 - smoothstep(CAP_FULL, CAP_FADE, rho);
        const mottle = capWeight >= 1 ? fbm(px * .035, pz * .035, 3)
          : lerp(fbm3(record.dx * 14.7, record.dy * 14.7 + 5, record.dz * 14.7, 3), fbm(px * .035, pz * .035, 3), capWeight);
        const tone = clamp(.54 + mottle * .16 - slope * .2 + record.height * .0008, .24, .78);
        let r = tone * .86, g = tone * .89, b = tone * .98;
        // THE ICE FIELD: glacial blue-white with bright frozen veins. Alex
        // walked past the old tint without noticing it, which means it did
        // not exist. sqrt() pulls the read out to the fringe.
        shadeDirScratch.set(record.dx, record.dy, record.dz);
        const iceW = iceWeightAt(shadeDirScratch);
        if (iceW > 0) {
          const iceV = Math.sqrt(iceW);
          r = lerp(r, .58, iceV); g = lerp(g, .86, iceV); b = lerp(b, 1.34, iceV);
          const vein = fbm3(record.dx * 46, record.dy * 46 + 3, record.dz * 46, 2);
          if (Math.abs(vein - .5) < .05) {
            const shine = (1 - Math.abs(vein - .5) / .05) * iceV * .3;
            r += shine; g += shine; b += shine * 1.1;
          }
        }
        const snowW = snowWeightAt(shadeDirScratch);
        if (snowW > 0) { r = lerp(r, .94, snowW * .92); g = lerp(g, .96, snowW * .92); b = lerp(b, 1.06, snowW * .92); }
        // THE DARK QUARTER: the ground itself goes out.
        const darkW = darkWeightAt(shadeDirScratch);
        if (darkW > 0) {
          r *= 1 - darkW * .68; g *= 1 - darkW * .64; b *= 1 - darkW * .42;
          const lichen = fbm3(record.dx * 33, record.dy * 33 - 7, record.dz * 33, 2);
          if (lichen > .62) { g += darkW * (lichen - .62) * .5; b += darkW * (lichen - .62) * .7; }
        }
        // the deeper the open shaft, the darker the rock
        if (MOONHOLE.open) {
          const sink = clamp((-16 - record.height) / 60, 0, 1)
            * smoothstep(40, 20, arcTo(shadeDirScratch, FAR_SIGHTS.bowl));
          if (sink > 0) { r *= 1 - sink * .62; g *= 1 - sink * .58; b *= 1 - sink * .38; }
        }
        record.r = r;
        record.g = g;
        record.b = b;
      };
      for (const record of unique.values()) this.shadeTerrainRecord(record);
      for (let i = 0; i < entryCount; i++) {
        const record = unique.get(entryKeys[i]);
        normals[i * 3] = record.nx;
        normals[i * 3 + 1] = record.ny;
        normals[i * 3 + 2] = record.nz;
        colors[i * 3] = record.r;
        colors[i * 3 + 1] = record.g;
        colors[i * 3 + 2] = record.b;
      }
      geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
      geometry.setAttribute('normal', new T.BufferAttribute(normals, 3));
      geometry.computeBoundingSphere();
      this.terrainUnique = unique;
      this.terrainKeys = entryKeys;
      this.terrain = new T.Mesh(geometry, this.materials.regolith);
      this.terrain.receiveShadow = true;
      this.terrain.userData.kbLifted = true;
      this.scene.add(this.terrain);

      const rockGeometry = new T.DodecahedronGeometry(1, 0);
      const rockCount = this.quality === 'LOW' ? 250 : this.quality === 'MED' ? 430 : 650;
      this.rockField = new T.InstancedMesh(rockGeometry, this.materials.rock, rockCount);
      this.rockField.userData.kbLifted = true;
      this.rockField.receiveShadow = true;
      this.rockField.castShadow = this.quality === 'HIGH';
      // Every scatter rock is a real, smashable object. They used to be
      // intangible copies of the breakable moonrocks — same geometry, same
      // material, zero collision — which broke the one law the destruction
      // system must keep: if it looks like a moonrock, the ball shatters it.
      this.rockFieldData = [];
      const matrix = new T.Matrix4();
      const quaternion = new T.Quaternion();
      const liftQ = new T.Quaternion();
      const scale = new T.Vector3();
      const position = new T.Vector3();
      for (let i = 0; i < rockCount; i++) {
        let x, z;
        for (let attempt = 0; attempt < 8; attempt++) {
          x = randomRange(-350, 350, worldRandom);
          z = randomRange(-350, 330, worldRandom);
          const protectedCourse = Math.abs(x) < (z > 30 ? 25 : 42) && z < 165 && z > -255;
          if (!protectedCourse || attempt === 7) break;
        }
        const y = this.sampleTerrainHeight(x, z);
        const size = randomRange(.25, 2.7, worldRandom) * (worldRandom() > .96 ? 2.4 : 1);
        chartLift(x, y + size * .35, z, position);
        quaternion.setFromEuler(new T.Euler(worldRandom() * TAU, worldRandom() * TAU, worldRandom() * TAU));
        quaternion.premultiply(liftQuatAt(x, z, liftQ));
        scale.set(size * randomRange(.7, 1.35, worldRandom), size * randomRange(.45, 1.4, worldRandom), size * randomRange(.65, 1.5, worldRandom));
        matrix.compose(position, quaternion, scale);
        this.rockField.setMatrixAt(i, matrix);
        this.rockFieldData.push({
          index: i,
          position: position.clone(),
          hitRadiusSq: (size * 1.1 + .5) ** 2,
          size,
          matrix: matrix.clone(),
          alive: true,
        });
      }
      this.rockField.instanceMatrix.needsUpdate = true;
      this.scene.add(this.rockField);
      this.makeOuterRocks();
      this.makeMoondrops();
    }
    // MOONDROPS. The moon is much bigger now, and a bigger moon with nothing
    // in it is just a longer walk. These are the reason to go out there.
    //
    // No counter anywhere: what you have collected orbits the ball and makes
    // it burn brighter, so your progress is the thing you are already looking
    // at. Shape, motion and brightness carry it -- never hue.
    makeMoondrops() {
      // MOONCRESCENTS: the collectible. Little golden crystal crescents that
      // spin and bob everywhere on the moon -- and spill out of everything
      // that breaks, dies, or lights. `poolSize` extra instanced slots are
      // reserved for the spills, so a boss fountain costs zero draw calls.
      const count = this.quality === 'LOW' ? 150 : 260;
      this.stonePoolSize = this.quality === 'LOW' ? 110 : 200;
      const material = new T.MeshStandardMaterial({
        color: 0xffe9b0, emissive: 0xffb42a, emissiveIntensity: 1.9,
        roughness: .16, metalness: .72, flatShading: true,
      });
      // Bob and spin in the vertex shader. Writing 190 instance matrices every
      // frame to do this on the CPU would cost more than the drops are worth.
      const phases = new Float32Array(count + this.stonePoolSize);
      material.onBeforeCompile = shader => {
        shader.uniforms.kbTime = this.skyTime;
        shader.vertexShader = shader.vertexShader
          .replace('void main() {', 'attribute float kbPhase;\nuniform float kbTime;\nvoid main() {')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
	float kbSpin = kbTime * 1.7 + kbPhase;
	float kbS = sin( kbSpin ), kbC = cos( kbSpin );
	transformed.xz = mat2( kbC, -kbS, kbS, kbC ) * transformed.xz;
	transformed.y += sin( kbTime * 2.1 + kbPhase ) * 0.28;`);
      };
      // A REAL crescent: two circle arcs meeting at the horns, extruded and
      // bevelled into a chunky faceted gem (flat shading does the sparkle).
      const crescentShape = new T.Shape();
      crescentShape.absarc(0, 0, .6, 1.039, 5.244, false);
      crescentShape.absarc(.25, 0, .52, -1.466, 1.466, true);
      const crescent = new T.ExtrudeGeometry(crescentShape, {
        depth: .16, curveSegments: 12,
        bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 1,
      });
      crescent.center();
      this.moondropMesh = new T.InstancedMesh(crescent, material, count + this.stonePoolSize);
      this.moondropMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      this.moondrops = [];
      const matrix = new T.Matrix4();
      const position = new T.Vector3();
      // Scattered across the old map, but CLUSTERED out on the apron. Spread
      // evenly, the far drops work out to one per 240 m of empty plain, which
      // is not a collectible -- it is a speck you happen to pass. In clusters,
      // walking out to the rim pays with a whole constellation at once.
      // The collectible layer is the road network now: clusters sit at the
      // feet of the far sights and along the walks between them, so a trail
      // of light always leads somewhere. Essentials first: LOW only draws
      // the first ten. (Session 3 deliberately re-rolled the worldRandom
      // stream -- the whole downstream world reshuffled once, and the suite
      // re-validated it. Do not "restore" the old draw count.)
      const trailSpots = [
        { x: 0, z: -560 }, { x: 0, z: -662 },            // THE STAIR, foot and crest
        { x: -620, z: -240 }, { x: -698, z: -276 },      // the walk to THE NEEDLE
        { x: -430, z: 470 },                              // THE ORCHARD
        { x: 360, z: 540 }, { x: 720, z: 260 },           // both ends of THE RIB
        { x: 0, z: 1032 }, { x: 20, z: 1128 },            // THE BOWL, rim and ice
        { x: 610, z: -505 },                              // the mountain col
        { x: -440, z: 380 }, { x: 540, z: 405 },          // approach walks
        { x: -70, z: 1010 }, { x: -255, z: 895 },         // bowl west, second col
        { x: -80, z: 730 },                               // under THE PERCH
        { x: 200, z: -560 },                              // deep snow country
        { x: 0, z: 700 }, { x: -300, z: -450 },           // the long walks between
        { x: 383, z: -137 }, { x: -540, z: 80 },          // inside the crystal caves
        { x: -470, z: 90 }, { x: -380, z: 200 },          // down THE RILLE's spine
        { x: 455, z: 60 }, { x: -520, z: 105 },           // the thin place, the graben
      ];
      const clusterCount = this.quality === 'LOW' ? 10 : trailSpots.length;
      const clusters = [];
      for (let i = 0; i < clusterCount; i++) {
        const spot = trailSpots[i % trailSpots.length];
        const angle = worldRandom() * TAU;
        const reach = randomRange(4, 26, worldRandom);
        clusters.push({ x: spot.x + Math.cos(angle) * reach, z: spot.z + Math.sin(angle) * reach });
      }
      const clustered = clusterCount * 7;
      for (let i = 0; i < count; i++) {
        let x = 0, z = 0;
        if (i < clustered) {
          const cluster = clusters[Math.floor(i / 7)];
          const angle = worldRandom() * TAU;
          const spread = Math.sqrt(worldRandom()) * 17;
          x = cluster.x + Math.cos(angle) * spread;
          z = cluster.z + Math.sin(angle) * spread;
        } else {
          for (let attempt = 0; attempt < 10; attempt++) {
            x = randomRange(-355, 355, worldRandom);
            z = randomRange(-355, 335, worldRandom);
            // Keep the opening course clear; the first thing you see should be
            // the moon, not a corridor of pickups.
            const onCourse = Math.abs(x) < 26 && z < 150 && z > 40;
            if (!onCourse || attempt === 9) break;
          }
        }
        const y = groundHeightAt(x, z) + randomRange(1.3, 2.6, worldRandom);
        position.set(x, y, z);
        matrix.makeTranslation(x, y, z);
        this.moondropMesh.setMatrixAt(i, matrix);
        phases[i] = worldRandom() * TAU;
        this.moondrops.push({ index: i, position: position.clone(), alive: true, matrix: matrix.clone() });
      }
      // The spill pool: pre-hidden slots that spawnStones hands out. Records
      // live in the same array so collection code never knows the difference.
      this.stoneSlots = [];
      for (let slot = 0; slot < this.stonePoolSize; slot++) {
        const index = count + slot;
        this.moondropMesh.setMatrixAt(index, ZERO_MATRIX);
        phases[index] = (index * 2.399) % TAU;
        const record = { index, position: new T.Vector3(), alive: false, spilled: true, matrix: ZERO_MATRIX.clone() };
        this.moondrops.push(record);
        this.stoneSlots.push(record);
      }
      this.stoneCursor = 0;
      this.moondropMesh.geometry.setAttribute('kbPhase', new T.InstancedBufferAttribute(phases, 1));
      this.moondropMesh.instanceMatrix.needsUpdate = true;
      this.moondropMesh.frustumCulled = false;
      this.scene.add(this.moondropMesh);
    }
    // Spill crescents from a world point: rocks, enemies, bosses, beacons,
    // finished landmarks -- everything that gives, gives these. Slots recycle
    // oldest-first, so a long spree never runs dry, only ephemeral.
    spawnStones(at, amount = 2, spread = 2.2) {
      if (!this.stoneSlots || !this.stoneSlots.length) return;
      const matrix = new T.Matrix4();
      const position = new T.Vector3();
      const quaternion = new T.Quaternion();
      const dir = new T.Vector3();
      const east = new T.Vector3();
      const north = new T.Vector3();
      for (let n = 0; n < amount; n++) {
        const record = this.stoneSlots[this.stoneCursor % this.stoneSlots.length];
        this.stoneCursor++;
        if (this.absorbing?.length) {
          for (let a = this.absorbing.length - 1; a >= 0; a--) {
            if (this.absorbing[a].index === record.index) this.absorbing.splice(a, 1);
          }
        }
        dirAt(at, dir);
        east.set(-dir.z, 0, dir.x);
        if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
        east.normalize();
        north.crossVectors(dir, east);
        const angle = (n / Math.max(1, amount)) * TAU + this.elapsed * 2.1;
        const reach = spread * (.35 + .65 * ((n * 53 % 97) / 97));
        position.copy(at)
          .addScaledVector(east, Math.cos(angle) * reach)
          .addScaledVector(north, Math.sin(angle) * reach)
          .addScaledVector(dir, 1.3);
        record.position.copy(position);
        record.alive = true;
        quaternion.setFromUnitVectors(UP, dir);
        matrix.compose(position, quaternion, ONE_SCALE);
        record.matrix.copy(matrix);
        this.moondropMesh.setMatrixAt(record.index, matrix);
      }
      this.moondropMesh.instanceMatrix.needsUpdate = true;
      this.particles.burst(at, 0xffd66b, Math.min(18, 6 + amount * 2), 8, .6, .3);
    }
    // Lobbed snowballs: chart-space ballistics, an instanced pool of eight.
    throwSnowball(fromChart, targetChart) {
      if (!this.snowballMesh) {
        this.snowballs = [];
        this.snowballMesh = new T.InstancedMesh(
          new T.IcosahedronGeometry(.42, 1),
          new T.MeshStandardMaterial({ color: 0xf4f8ff, roughness: .85, emissive: 0x8a9ab8, emissiveIntensity: .3 }),
          8,
        );
        this.snowballMesh.userData.kbLifted = true;
        this.snowballMesh.frustumCulled = false;
        for (let i = 0; i < 8; i++) this.snowballMesh.setMatrixAt(i, ZERO_MATRIX);
        this.scene.add(this.snowballMesh);
        for (let i = 0; i < 8; i++) this.snowballs.push({ alive: false, position: new T.Vector3(), velocity: new T.Vector3() });
      }
      const ball = this.snowballs.find(entry => !entry.alive) || this.snowballs[0];
      ball.alive = true;
      ball.t = 0;
      ball.position.copy(fromChart).setY(fromChart.y + 2.4);
      const dx = targetChart.x - fromChart.x;
      const dz = targetChart.z - fromChart.z;
      const distance = Math.max(4, Math.hypot(dx, dz));
      const flight = clamp(distance / 16, .8, 2.2);
      ball.velocity.set(
        dx / flight,
        (targetChart.y - ball.position.y) / flight + 7 * flight,
        dz / flight,
      );
    }
    updateSnowballs(dt, gameState) {
      if (!this.snowballs) return;
      const matrix = snowballMatrix;
      let any = false;
      for (let i = 0; i < this.snowballs.length; i++) {
        const ball = this.snowballs[i];
        if (!ball.alive) continue;
        any = true;
        ball.t += dt;
        ball.velocity.y -= 14 * dt;
        ball.position.addScaledVector(ball.velocity, dt);
        const playerChart = toChartVec(snowballScratch.copy(gameState.player.position));
        const hit = Math.hypot(ball.position.x - playerChart.x, ball.position.z - playerChart.z) < 1.7
          && Math.abs(ball.position.y - playerChart.y) < 2.4;
        const grounded = ball.position.y <= this.floorHeight(ball.position.x, ball.position.z, ball.position.y + .5) + .3;
        if (hit || grounded || ball.t > 3.5) {
          ball.alive = false;
          this.snowballMesh.setMatrixAt(i, ZERO_MATRIX);
          const at = chartLift(ball.position.x, ball.position.y, ball.position.z, snowballScratch);
          this.particles.burst(at, 0xf4f8ff, 12, 5, .5, .14);
          if (hit && gameState.started && !gameState.paused && !gameState.won
            && gameState.player.damageCooldown <= 0) gameState.damagePlayer({ position: ball.position });
          continue;
        }
        chartLift(ball.position.x, ball.position.y, ball.position.z, snowballScratch);
        matrix.makeTranslation(snowballScratch.x, snowballScratch.y, snowballScratch.z);
        this.snowballMesh.setMatrixAt(i, matrix);
      }
      if (any || this.snowballDirty) this.snowballMesh.instanceMatrix.needsUpdate = true;
      this.snowballDirty = any;
    }
    // A boss core rises from the kill, spins for a beat, then streaks to the
    // ball. The grant itself is instant (state never waits on a cosmetic);
    // this is the ceremony that makes the grant readable.
    spawnTrophy(at, color) {
      this.flyingTrophies = this.flyingTrophies || [];
      const mesh = new T.Mesh(
        new T.OctahedronGeometry(.95, 0),
        new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.6, roughness: .3, metalness: .4 }),
      );
      const glow = this.makeGlowSprite(this.glowGold, 5.5, .5);
      glow.material = glow.material.clone();
      glow.material.color.set(color);
      mesh.add(glow);
      mesh.position.copy(at);
      this.scene.add(mesh);
      this.flyingTrophies.push({ mesh, from: at.clone(), up: dirAt(at, new T.Vector3()).clone(), t: 0 });
    }
    takeMoondrop(drop) {
      if (!drop.alive) return false;
      drop.alive = false;
      // The suck-in: the crescent streaks into the ball over a fifth of a
      // second instead of blinking away. world.update animates it home.
      this.absorbing = this.absorbing || [];
      this.absorbing.push({ index: drop.index, from: drop.position.clone(), t: 0 });
      this.particles.burst(drop.position, 0x9defff, 10, 7, .45, .18);
      this.pulseRing(drop.position, new T.Color(0xffd66b), 2.4, .22);
      return true;
    }
    // FULL MOONS. The rare collectible: a pearl in a gold ring, worth five
    // crescents, placed at DESTINATIONS -- summit decks, sky caches, the ends
    // of long walks -- so wanting one is wanting to go somewhere. No
    // worldRandom draws: authored, so nothing downstream shifts.
    makeFullMoons() {
      const spots = [
        { x: 0, z: -662 },                       // THE STAIR crest
        { x: -700, z: -276, deck: true },        // THE NEEDLE's point
        { x: -430, z: 470 },                     // THE ORCHARD heart
        { x: 720, z: 260 },                      // THE RIB's far end
        { x: 0, z: 1130 },                       // the rink, mid-ice
        { x: 620, z: -520 },                     // the COLOSSUS's peak
        { x: 280, z: -620 },                     // deep snow country
        { x: -80, z: 780, deck: true },          // THE PERCH
        { x: 0, z: 160, deck: true },            // first sky road
        { x: -440, z: 460, deck: true },         // orchardway
        { x: 300, z: -600, deck: true },         // snowway
        { x: 0, z: 660, deck: true },            // bowlway
        { x: -320, z: -520, deck: true },        // westway
        { x: 540, z: 400, deck: true },          // ribway
        { x: -640, z: -230, deck: true },        // needleway
        { x: 0, z: 700 }, { x: -300, z: -450 },  // the long walks
        { x: 0, z: -350 }, { x: -550, z: 100 },
        { x: 420, z: 90 }, { x: -180, z: 640 },
        { x: 150, z: 300 }, { x: 500, z: -100 },
        { x: -350, z: -80 }, { x: 250, z: 900 },
        { x: -150, z: 1000 }, { x: 700, z: -100 },
        { x: -500, z: -420 }, { x: 100, z: -800 },
        { x: 388, z: -132 }, { x: -544, z: 84 },          // deep in the caves
        { x: -470, z: 92 },                               // THE RILLE's bend
        { x: 430, z: 62 },                                // THE DOMES' saddle
      ];
      const orbMaterial = new T.MeshStandardMaterial({
        color: 0xf6f4ff, emissive: 0xb8c8ff, emissiveIntensity: 1.5,
        roughness: .18, metalness: .3,
      });
      const ringMaterial = new T.MeshStandardMaterial({
        color: 0xffe9b0, emissive: 0xffb42a, emissiveIntensity: 2.1,
        roughness: .2, metalness: .7,
      });
      const moonPhases = new Float32Array(spots.length);
      for (let i = 0; i < spots.length; i++) moonPhases[i] = (i * 2.399) % TAU;
      const bobShader = shader => {
        shader.uniforms.kbTime = this.skyTime;
        shader.vertexShader = shader.vertexShader
          .replace('void main() {', 'attribute float kbPhase;\nuniform float kbTime;\nvoid main() {')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
	float kbSpin = kbTime * 1.1 + kbPhase;
	float kbS = sin( kbSpin ), kbC = cos( kbSpin );
	transformed.xz = mat2( kbC, -kbS, kbS, kbC ) * transformed.xz;
	transformed.y += sin( kbTime * 1.6 + kbPhase ) * 0.42;`);
      };
      orbMaterial.onBeforeCompile = bobShader;
      ringMaterial.onBeforeCompile = bobShader;
      const orbGeometry = new T.IcosahedronGeometry(.62, 2);
      const ringGeometry = new T.TorusGeometry(1.02, .07, 8, 40);
      ringGeometry.rotateX(Math.PI / 2 - .36);
      this.fullMoonOrb = new T.InstancedMesh(orbGeometry, orbMaterial, spots.length);
      this.fullMoonRing = new T.InstancedMesh(ringGeometry, ringMaterial, spots.length);
      const matrix = new T.Matrix4();
      const position = new T.Vector3();
      const quaternion = new T.Quaternion();
      this.fullmoons = [];
      const decks = [...(this.sky || []), ...(this.platforms || [])];
      spots.forEach((spot, index) => {
        let alt = this.sampleTerrainHeight(spot.x, spot.z) + 2;
        if (spot.deck) {
          let best = null, bestD = 46;
          for (const deck of decks) {
            const d = Math.hypot(deck.x - spot.x, deck.z - spot.z);
            if (d < bestD) { bestD = d; best = deck; }
          }
          if (best) { spot.x = best.x; spot.z = best.z; alt = best.top + 2; }
        }
        chartLift(spot.x, alt, spot.z, position);
        liftQuatAt(spot.x, spot.z, quaternion);
        matrix.compose(position, quaternion, ONE_SCALE);
        this.fullMoonOrb.setMatrixAt(index, matrix);
        this.fullMoonRing.setMatrixAt(index, matrix);
        this.fullmoons.push({ index, alive: true, position: position.clone(), matrix: matrix.clone() });
      });
      this.fullMoonOrb.geometry.setAttribute('kbPhase', new T.InstancedBufferAttribute(moonPhases, 1));
      this.fullMoonRing.geometry.setAttribute('kbPhase', new T.InstancedBufferAttribute(moonPhases.slice(), 1));
      for (const mesh of [this.fullMoonOrb, this.fullMoonRing]) {
        mesh.userData.kbLifted = true;
        mesh.frustumCulled = false;
        this.scene.add(mesh);
      }
    }
    // Props that make the biomes readable from a distance: frozen spikes
    // ringing the ice field, glowing crystals lighting the dark quarter.
    // Deterministic golden-angle scatter -- zero worldRandom draws.
    makeBiomeProps() {
      const iceGlass = new T.MeshPhysicalMaterial({
        color: 0xcfeaff, emissive: 0x2a6f9e, emissiveIntensity: .9,
        metalness: .08, roughness: .1, transmission: .4, thickness: 2,
        transparent: true, opacity: .9, clearcoat: 1, clearcoatRoughness: .05,
      });
      const spikeGeometry = new T.ConeGeometry(1, 1, 6, 1);
      spikeGeometry.translate(0, .5, 0);
      const spikes = [];
      const spikeScratch = new T.Vector3();
      for (let i = 0; i < 46; i++) {
        const angle = i * 2.39996;
        const reach = 55 + ((i * 47) % 97) * 1.35;
        const spikeX = Math.cos(angle) * reach * 2.2;
        const spikeZ = 1130 + Math.sin(angle) * reach;
        // Skip the endgame shaft's footprint: a spike there would float
        // mid-air the moment the moon opens.
        if (arcTo(chartDirAt(spikeX, spikeZ, spikeScratch), FAR_SIGHTS.bowl) < 42) continue;
        spikes.push({
          x: spikeX,
          z: spikeZ,
          radius: 1 + ((i * 31) % 17) * .16,
          height: 4 + ((i * 53) % 23) * .8,
          tilt: (((i * 29) % 13) - 6) * .045,
        });
      }
      const spikeMesh = new T.InstancedMesh(spikeGeometry, iceGlass, spikes.length);
      const matrix = new T.Matrix4();
      const position = new T.Vector3();
      const quaternion = new T.Quaternion();
      const tiltQuat = new T.Quaternion();
      const scale = new T.Vector3();
      spikes.forEach((spec, index) => {
        const ground = this.sampleTerrainHeight(spec.x, spec.z);
        chartLift(spec.x, ground - .8, spec.z, position);
        liftQuatAt(spec.x, spec.z, quaternion);
        tiltQuat.setFromEuler(new T.Euler(spec.tilt, spec.x, spec.tilt * 1.7));
        quaternion.multiply(tiltQuat);
        scale.set(spec.radius, spec.height, spec.radius);
        matrix.compose(position, quaternion, scale);
        spikeMesh.setMatrixAt(index, matrix);
      });
      spikeMesh.userData.kbLifted = true;
      spikeMesh.castShadow = true;
      this.scene.add(spikeMesh);
      // Crystals: violet-cyan light sources scattered through the graben.
      const crystalMaterial = new T.MeshStandardMaterial({
        color: 0xb9a7ff, emissive: 0x8b5cf6, emissiveIntensity: 2.4,
        roughness: .18, metalness: .2, flatShading: true,
      });
      const crystalGeometry = new T.ConeGeometry(.8, 3.2, 5, 1);
      crystalGeometry.translate(0, 1.6, 0);
      const crystals = [];
      for (let i = 0; i < 34; i++) {
        const angle = i * 2.39996 + 1.3;
        const reach = 18 + ((i * 41) % 89) * 1.5;
        crystals.push({
          x: -520 + Math.cos(angle) * reach * 1.35,
          z: 100 + Math.sin(angle) * reach,
          scale: .7 + ((i * 37) % 19) * .09,
          tilt: (((i * 23) % 11) - 5) * .09,
        });
      }
      const crystalMesh = new T.InstancedMesh(crystalGeometry, crystalMaterial, crystals.length);
      crystals.forEach((spec, index) => {
        const ground = this.sampleTerrainHeight(spec.x, spec.z);
        chartLift(spec.x, ground - .4, spec.z, position);
        liftQuatAt(spec.x, spec.z, quaternion);
        tiltQuat.setFromEuler(new T.Euler(spec.tilt, spec.x * 2.1, spec.tilt * 1.4));
        quaternion.multiply(tiltQuat);
        scale.setScalar(spec.scale);
        matrix.compose(position, quaternion, scale);
        crystalMesh.setMatrixAt(index, matrix);
      });
      crystalMesh.userData.kbLifted = true;
      this.scene.add(crystalMesh);
      const crystalGlow = this.makeGlowSprite(this.glowViolet, 30, .3);
      chartLift(-520, this.sampleTerrainHeight(-520, 100) + 8, 100, crystalGlow.position);
      crystalGlow.userData.kbLifted = true;
      this.scene.add(crystalGlow);
    }
    // The visible promise: a plate of cracked obsidian flush with the ground,
    // veins glowing brighter with every solid hit until it gives.
    // THE CRYSTAL CAVES: the chunk-4 trenches get rock roofs (thin-body
    // slabs, so the interior stays walkable and the roof is still a deck),
    // violet light inside, and the crystal breakables under them.
    makeCaves() {
      const roofs = [
        { x: 372, z: -148, radius: 15 }, { x: 383, z: -137, radius: 15 }, { x: 394, z: -126, radius: 15 },
        { x: -533, z: 72, radius: 15 }, { x: -547, z: 88, radius: 15 },
        { x: -486, z: 142, radius: 13 },
      ];
      const roofGeometry = new T.DodecahedronGeometry(1, 0);
      const roofMesh = new T.InstancedMesh(roofGeometry, this.materials.darkRock, roofs.length);
      const matrix = new T.Matrix4();
      const position = new T.Vector3();
      const quaternion = new T.Quaternion();
      const scale = new T.Vector3();
      roofs.forEach((roof, index) => {
        // Rim height, sampled OUTSIDE the pit so the roof sits flush with the
        // surrounding ground rather than sinking into the hole it covers.
        const rim = Math.max(
          this.sampleTerrainHeight(roof.x + roof.radius + 26, roof.z),
          this.sampleTerrainHeight(roof.x - roof.radius - 26, roof.z),
          this.sampleTerrainHeight(roof.x, roof.z + roof.radius + 26),
          this.sampleTerrainHeight(roof.x, roof.z - roof.radius - 26),
        );
        chartLift(roof.x, rim + .8, roof.z, position);
        liftQuatAt(roof.x, roof.z, quaternion);
        scale.set(roof.radius * 1.12, 2.6, roof.radius * 1.12);
        matrix.compose(position, quaternion, scale);
        roofMesh.setMatrixAt(index, matrix);
        this.sky.push({
          id: `cave-roof-${index}`, x: roof.x, z: roof.z,
          radius: roof.radius, top: rim + 1.6, body: 4.2, inert: true, cooldown: 0,
          position: new T.Vector3(roof.x, rim + 1.6, roof.z),
        });
      });
      roofMesh.userData.kbLifted = true;
      roofMesh.castShadow = true;
      roofMesh.receiveShadow = true;
      this.scene.add(roofMesh);
      for (const at of [[383, -137, -9], [-540, 80, -12], [-488, 142, -10]]) {
        const glow = this.makeGlowSprite(this.glowViolet, 16, .4);
        chartLift(at[0], at[2] + 4, at[1], glow.position);
        glow.userData.kbLifted = true;
        this.scene.add(glow);
      }
    }
    makeCrustPlates() {
      this.crustPlates = [];
      for (const hole of CRUST_HOLES) {
        const group = new T.Group();
        const plate = new T.Mesh(
          new T.CircleGeometry(7.2, 26),
          new T.MeshStandardMaterial({
            color: 0x191423, emissive: 0x36214f, emissiveIntensity: .5,
            roughness: .5, metalness: .3, flatShading: true,
          }),
        );
        plate.rotation.x = -Math.PI / 2;
        group.add(plate);
        const veins = new T.Mesh(
          new T.RingGeometry(1.4, 6.6, 8, 2),
          new T.MeshBasicMaterial({
            color: 0xa96bff, transparent: true, opacity: .3,
            depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
            wireframe: true,
          }),
        );
        veins.rotation.x = -Math.PI / 2;
        veins.position.y = .1;
        group.add(veins);
        const ground = this.sampleTerrainHeight(hole.x, hole.z);
        chartLift(hole.x, ground + .25, hole.z, group.position);
        liftQuatAt(hole.x, hole.z, group.quaternion);
        group.userData.kbLifted = true;
        this.scene.add(group);
        this.crustPlates.push({
          hole, group, veins,
          position: group.position.clone(), maxHp: 5, hp: 5,
        });
      }
    }
    takeFullMoon(moon) {
      if (!moon.alive) return false;
      moon.alive = false;
      this.moonAbsorbing = this.moonAbsorbing || [];
      this.moonAbsorbing.push({ index: moon.index, from: moon.position.clone(), t: 0 });
      this.particles.burst(moon.position, 0xdfe8ff, 26, 10, .9, .3);
      this.pulseRing(moon.position, new T.Color(0xf6f4ff), 5, .5);
      return true;
    }
    restoreMoondrops() {
      if (!this.moondrops) return;
      if (this.absorbing) this.absorbing.length = 0;
      if (this.moonAbsorbing) this.moonAbsorbing.length = 0;
      if (this.fullmoons) {
        for (const moon of this.fullmoons) {
          if (!moon.alive) {
            this.fullMoonOrb.setMatrixAt(moon.index, moon.matrix);
            this.fullMoonRing.setMatrixAt(moon.index, moon.matrix);
          }
          moon.alive = true;
        }
        this.fullMoonOrb.instanceMatrix.needsUpdate = true;
        this.fullMoonRing.instanceMatrix.needsUpdate = true;
      }
      for (const drop of this.moondrops) {
        if (drop.spilled) {
          // Spilled crescents are ephemeral: a restart clears the ground.
          drop.alive = false;
          this.moondropMesh.setMatrixAt(drop.index, ZERO_MATRIX);
          continue;
        }
        if (!drop.alive) this.moondropMesh.setMatrixAt(drop.index, drop.matrix);
        drop.alive = true;
      }
      this.stoneCursor = 0;
      this.moondropMesh.instanceMatrix.needsUpdate = true;
    }
    // Scatter for the whole sphere. One instanced mesh, one draw call. The
    // far side of a moon with nothing on it is just a longer walk, so the
    // old wander-band rocks now punctuate every latitude -- deliberately
    // sparse and non-collidable: punctuation, not content.
    makeOuterRocks() {
      const count = this.quality === 'LOW' ? 220 : 460;
      const mesh = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), this.materials.rock, count);
      const matrix = new T.Matrix4();
      const quaternion = new T.Quaternion();
      const lift = new T.Quaternion();
      const scale = new T.Vector3();
      const position = new T.Vector3();
      const dir = new T.Vector3();
      // Every far rock is a real, smashable object -- "if it looks like a
      // moonrock, the ball shatters it" holds on every latitude.
      this.outerRockData = [];
      // Uniform over the sphere outside the authored cap (cos-latitude draw).
      const capY = Math.cos(450 / PLANET.radius);
      for (let i = 0; i < count; i++) {
        const y = lerp(-1, capY, worldRandom());
        const azimuth = worldRandom() * TAU;
        const ring = Math.sqrt(Math.max(0, 1 - y * y));
        dir.set(Math.cos(azimuth) * ring, y, Math.sin(azimuth) * ring);
        const size = randomRange(.4, 3.4, worldRandom) * (worldRandom() > .93 ? 2.8 : 1);
        position.copy(dir).multiplyScalar(PLANET.radius + elevationAt(dir) + size * .34).add(PLANET.centre);
        quaternion.setFromEuler(new T.Euler(worldRandom() * TAU, worldRandom() * TAU, worldRandom() * TAU));
        quaternion.premultiply(lift.setFromUnitVectors(UP, dir));
        scale.set(size * randomRange(.7, 1.4, worldRandom), size * randomRange(.45, 1.4, worldRandom), size * randomRange(.65, 1.5, worldRandom));
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(i, matrix);
        this.outerRockData.push({
          index: i, mesh, position: position.clone(),
          hitRadiusSq: (size * 1.1 + .5) ** 2, size,
          matrix: matrix.clone(), alive: true,
        });
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.userData.kbLifted = true;
      this.outerRocks = mesh;
      this.scene.add(mesh);
    }
    // THE NEEDLE and THE ORCHARD stand up out of their far-side mounds as
    // real solids: the ball banks off them, the tether wraps them, and the
    // grapple climbs them -- they join this.platforms, so every verb that
    // works on the cliff pillars works out here for free. THE BOWL's floor
    // gets its ice sheen. No randomness: the far side is authored.
    makeFarSights() {
      const specs = [{ x: -700, z: -260, radius: 7, height: 160 }];
      const orchard = { x: -430, z: 470 };
      for (let i = 0; i < 11; i++) {
        const angle = i * 2.3999632 + .7;
        const reach = 14 + (i % 4) * 16;
        specs.push({
          x: orchard.x + Math.cos(angle) * reach,
          z: orchard.z + Math.sin(angle) * reach,
          radius: 2.2 + (i % 3) * .9,
          height: 42 + ((i * 37) % 48),
        });
      }
      const iceGlass = new T.MeshPhysicalMaterial({
        color: 0xcfeaff, emissive: 0x2a6f9e, emissiveIntensity: .7,
        metalness: .08, roughness: .12, transmission: .35, thickness: 2,
        transparent: true, opacity: .88, clearcoat: 1, clearcoatRoughness: .06,
      });
      const geometry = new T.ConeGeometry(1, 1, 9, 4);
      geometry.translate(0, .5, 0);
      const mesh = new T.InstancedMesh(geometry, iceGlass, specs.length);
      const matrix = new T.Matrix4();
      const position = new T.Vector3();
      const quaternion = new T.Quaternion();
      const scale = new T.Vector3();
      specs.forEach((spec, index) => {
        const ground = this.sampleTerrainHeight(spec.x, spec.z);
        chartLift(spec.x, ground - 1.5, spec.z, position);
        liftQuatAt(spec.x, spec.z, quaternion);
        scale.set(spec.radius, spec.height + 1.5, spec.radius);
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(index, matrix);
        this.platforms.push({
          id: `sight-${index}`, x: spec.x, z: spec.z,
          radius: spec.radius * .82, top: ground + spec.height,
        });
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.userData.kbLifted = true;
      this.farSights = mesh;
      this.scene.add(mesh);
      const sheen = new T.Mesh(
        new T.CircleGeometry(58, 48),
        new T.MeshPhysicalMaterial({
          color: 0xbfe8ff, metalness: .1, roughness: .05, clearcoat: 1, clearcoatRoughness: .03,
          transparent: true, opacity: .38, depthWrite: false,
        }),
      );
      chartLift(0, -15.55, 1130, sheen.position);
      liftQuatAt(0, 1130, sheen.quaternion)
        .multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2));
      sheen.userData.kbLifted = true;
      this.iceSheen = sheen;
      this.scene.add(sheen);
    }
    smashFieldRock(rock, impact = 1) {
      if (!rock.alive) return false;
      rock.alive = false;
      const mesh = rock.mesh || this.rockField;
      mesh.setMatrixAt(rock.index, new T.Matrix4().makeScale(0, 0, 0));
      mesh.instanceMatrix.needsUpdate = true;
      this.particles.burst(rock.position, 0xbfc5d2, 8 + Math.floor(impact * 8), 6 + impact * 5, .6, .2);
      audio.impact(clamp(impact * .8, .15, .8), 'rock');
      this.spawnStones(rock.position, 1, 1.5);
      return true;
    }
    restoreRockField() {
      for (const field of [this.rockFieldData, this.outerRockData]) {
        if (!field) continue;
        for (const rock of field) {
          const mesh = rock.mesh || this.rockField;
          if (!rock.alive) mesh.setMatrixAt(rock.index, rock.matrix);
          rock.alive = true;
        }
      }
      if (this.rockField) this.rockField.instanceMatrix.needsUpdate = true;
      if (this.outerRocks) this.outerRocks.instanceMatrix.needsUpdate = true;
    }
    sampleTerrainHeight(x, z) {
      // The terrain is analytic now -- an icosphere displaced by this exact
      // function -- so the height under your feet and the height on screen
      // are the same number by construction. No cached grid, and no way for
      // them to drift apart at the edges, because there are no edges.
      if (Math.hypot(x, z) < CAP_FULL) return terrainHeightAt(x, z);
      return elevationAt(chartDirAt(x, z, groundDirScratch));
    }
    terrainSlopeAt(x, z) {
      const radius = 1.25;
      const dx = (this.sampleTerrainHeight(x + radius, z) - this.sampleTerrainHeight(x - radius, z)) / (radius * 2);
      const dz = (this.sampleTerrainHeight(x, z + radius) - this.sampleTerrainHeight(x, z - radius)) / (radius * 2);
      return Math.hypot(dx, dz);
    }
    // ---- THE LIFT ----------------------------------------------------------
    // The whole authored world is built in chart coordinates by the make*
    // functions below, exactly as it always was -- then this one pass stands
    // it all up on the sphere. Three shapes of object, three treatments:
    // positioned objects move and tilt as rigid units (children ride along);
    // instanced meshes lift per instance; merged/baked geometry lifts per
    // vertex with its normals rotated to match. Origin-groups (skyfield,
    // landmarks, regions) hold absolutely-positioned children, so the pass
    // recurses into them instead of moving the group. After the meshes, the
    // world-point records that gameplay reads 3D distances against are lifted
    // through the identical map, so what you see is what you hit.
    liftNode(object) {
      if (!object || object.userData.kbSky || object.userData.kbLifted) return;
      object.userData.kbLifted = true;
      if (object.userData.kbOriginGroup) {
        for (const child of [...object.children]) this.liftNode(child);
        return;
      }
      if (object.isInstancedMesh) {
        const matrix = new T.Matrix4();
        const position = new T.Vector3();
        const quaternion = new T.Quaternion();
        const lift = new T.Quaternion();
        const scale = new T.Vector3();
        for (let i = 0; i < object.count; i++) {
          object.getMatrixAt(i, matrix);
          matrix.decompose(position, quaternion, scale);
          const cx = position.x, cz = position.z;
          chartLift(cx, position.y, cz, position);
          quaternion.premultiply(liftQuatAt(cx, cz, lift));
          matrix.compose(position, quaternion, scale);
          object.setMatrixAt(i, matrix);
        }
        object.instanceMatrix.needsUpdate = true;
        object.frustumCulled = false;
        return;
      }
      if (object.userData.kbWorldGeometry && object.geometry?.attributes?.position) {
        const attribute = object.geometry.attributes.position;
        const normalAttribute = object.geometry.attributes.normal;
        const point = new T.Vector3();
        const normal = new T.Vector3();
        const lift = new T.Quaternion();
        for (let i = 0; i < attribute.count; i++) {
          const cx = attribute.getX(i), cz = attribute.getZ(i);
          chartLift(cx, attribute.getY(i), cz, point);
          attribute.setXYZ(i, point.x, point.y, point.z);
          if (normalAttribute) {
            normal.set(normalAttribute.getX(i), normalAttribute.getY(i), normalAttribute.getZ(i));
            normal.applyQuaternion(liftQuatAt(cx, cz, lift));
            normalAttribute.setXYZ(i, normal.x, normal.y, normal.z);
          }
        }
        attribute.needsUpdate = true;
        if (normalAttribute) normalAttribute.needsUpdate = true;
        object.geometry.computeBoundingSphere();
        object.frustumCulled = false;
        return;
      }
      const cx = object.position.x, cz = object.position.z;
      chartLift(cx, object.position.y, cz, object.position);
      object.quaternion.premultiply(liftQuatAt(cx, cz, this.liftQuatScratch));
    }
    liftWorld() {
      if (!SPHERE_WORLD) return;
      this.liftQuatScratch = new T.Quaternion();
      // Wells need a fixed tangent basis for lap counting; capture chart
      // coordinates before anything moves.
      for (const mark of this.landmarks) {
        if (mark.well) {
          const q = liftQuatAt(mark.well.centre.x, mark.well.centre.z, new T.Quaternion());
          mark.well.e1 = new T.Vector3(1, 0, 0).applyQuaternion(q);
          mark.well.e2 = new T.Vector3(0, 0, 1).applyQuaternion(q);
        }
      }
      for (const child of [...this.scene.children]) this.liftNode(child);
      // World-point records, through the identical map the meshes took.
      const liftVec = v => fromChartVec(v);
      this.anchors.forEach(anchor => anchor.position.copy(anchor.group.position));
      this.breakables.forEach(item => {
        liftVec(item.position);
        item.mesh.getMatrixAt(item.instanceIndex, item.matrix);
      });
      if (this.moondrops) {
        for (const drop of this.moondrops) {
          liftVec(drop.position);
          this.moondropMesh.getMatrixAt(drop.index, drop.matrix);
        }
      }
      this.collectibles.forEach(pickup => liftVec(pickup.position));
      this.nests.forEach(nest => liftVec(nest.position));
      this.moonChimes.forEach(chime => liftVec(chime.position));
      for (const mark of this.landmarks) {
        liftVec(mark.position);
        if (mark.bowl) liftVec(mark.bowl.centre);
        if (mark.well) liftVec(mark.well.centre);
      }
      for (const slab of this.sky) {
        liftVec(slab.position);
        if (slab.skyAnchor) liftVec(slab.skyAnchor.position);
      }
      this.skyRings.forEach(ring => {
        const q = liftQuatAt(ring.position.x, ring.position.z, new T.Quaternion());
        ring.toward.applyQuaternion(q);
        liftVec(ring.position);
      });
      for (const region of this.regions) {
        if (region.boss) region.boss.position.copy(region.boss.group.position);
      }
      // The fracture's per-piece world points, recomputed through the lifted
      // group so chip feedback lands on the actual wall.
      const pieceLocal = new T.Vector3();
      for (const piece of this.fracture.pieces) {
        pieceLocal.setFromMatrixPosition(piece.matrix);
        piece.world.copy(pieceLocal).applyQuaternion(this.fracture.group.quaternion).add(this.fracture.group.position);
      }
    }
    makeIrregularPillar(platform) {
      const height = platform.top - this.sampleTerrainHeight(platform.x, platform.z) + 15;
      const geometry = new T.CylinderGeometry(platform.radius * .78, platform.radius * 1.14, height, 18, 9, false);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
        const radial = Math.hypot(x, z);
        if (radial > platform.radius * .4) {
          const angle = Math.atan2(z, x);
          const strata = Math.sin(y * .72 + platform.x * .1) * .035;
          const distortion = 1 + valueNoise(angle * 2.4 + platform.x, y * .07 + platform.z) * .18 + strata;
          positions.setX(i, x * distortion);
          positions.setZ(i, z * distortion);
        }
      }
      geometry.computeVertexNormals();
      const mesh = new T.Mesh(geometry, this.materials.darkRock);
      mesh.position.set(platform.x, platform.top - height / 2, platform.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      platform.mesh = mesh;
      const cap = new T.Mesh(new T.CylinderGeometry(platform.radius * .77, platform.radius * .82, .75, 32), this.materials.regolith);
      cap.position.set(platform.x, platform.top - .24, platform.z);
      cap.receiveShadow = true;
      cap.castShadow = true;
      this.scene.add(cap);
      platform.cap = cap;
    }
    makeCliffRoute() {
      this.platforms = [
        { id: 'ledge-1', x: -18, z: 8, radius: 13, top: 14 },
        { id: 'ledge-2', x: 17, z: -9, radius: 13.5, top: 31 },
        { id: 'ledge-3', x: -15, z: -27, radius: 14, top: 47 },
        { id: 'ledge-4', x: 12, z: -48, radius: 16, top: 62 },
      ];
      this.platforms.forEach(platform => this.makeIrregularPillar(platform));
      this.platforms.forEach((platform, index) => {
        const group = new T.Group();
        const torus = new T.Mesh(new T.TorusGeometry(1.65, .18, 12, 40), this.materials.cyan);
        group.add(torus);
        const crystal = new T.Mesh(new T.OctahedronGeometry(.72, 0), index === this.platforms.length - 1 ? this.materials.gold : this.materials.cyan);
        group.add(crystal);
        const glow = this.makeGlowSprite(index === this.platforms.length - 1 ? this.glowGold : this.glowCyan, 6.4, .72);
        group.add(glow);
        const beam = new T.Mesh(
          new T.CylinderGeometry(.055, .18, 5.8, 8),
          index === this.platforms.length - 1 ? this.materials.gold : this.materials.cyan,
        );
        beam.position.y = -3.2;
        group.add(beam);
        const beacon = new T.PointLight(index === this.platforms.length - 1 ? 0xffc85c : 0x6defff, 5.5, 15, 2);
        group.add(beacon);
        // Hang sockets on the player-facing cliff lips so the climb reads from below.
        group.position.set(platform.x * .58, platform.top + 5.1, platform.z + platform.radius * .82);
        group.traverse(object => { if (object.isMesh) object.castShadow = true; });
        this.scene.add(group);
        this.anchors.push({
          id: `anchor-${index + 1}`, index, position: group.position.clone(), group,
          torus, crystal, glow, used: false, beckon: 0, pulse: worldRandom() * TAU,
        });
      });
    }
    makeCourseObjects() {
      const gateY = this.sampleTerrainHeight(0, 43) + 5.4;
      this.gate = { active: true, position: new T.Vector3(0, gateY, 43), width: 24, height: 10 };
      this.gate.group = new T.Group();
      this.gate.group.position.copy(this.gate.position);
      const field = new T.Mesh(
        new T.PlaneGeometry(this.gate.width, this.gate.height, 22, 10),
        new T.MeshBasicMaterial({ color: 0x5eeaff, transparent: true, opacity: .24, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }),
      );
      field.rotation.y = 0;
      this.gate.field = field;
      this.gate.group.add(field);
      for (const side of [-1, 1]) {
        const pylon = new T.Mesh(new T.CylinderGeometry(.9, 1.5, 12, 8), this.materials.black);
        pylon.position.x = side * (this.gate.width / 2 + .7);
        pylon.castShadow = true;
        this.gate.group.add(pylon);
        const strip = new T.Mesh(new T.CylinderGeometry(.15, .15, 10.5, 8), this.materials.cyan);
        strip.position.copy(pylon.position);
        strip.position.z = .55;
        this.gate.group.add(strip);
      }
      this.gate.glow = this.makeGlowSprite(this.glowCyan, 24, .28);
      this.gate.group.add(this.gate.glow);
      this.scene.add(this.gate.group);
      // The gate is powered BY the sentinel standing in front of it. Without a
      // visible link the player just meets an invisible wall and a separate
      // unrelated crab; with one, the answer to "what opens this" is drawn on
      // the floor in front of them. Hitting the gate flares the leash, so even
      // a wrong action points at the right one.
      const leashGeometry = new T.BufferGeometry();
      leashGeometry.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
      this.gate.leash = new T.Line(leashGeometry, new T.LineBasicMaterial({
        color: 0x8ff4ff, transparent: true, opacity: .55, depthWrite: false, blending: T.AdditiveBlending,
      }));
      this.gate.leash.frustumCulled = false;
      this.gate.leash.userData.kbLifted = true;
      this.gate.leashFlash = 0;
      this.scene.add(this.gate.leash);

      const fractureY = this.sampleTerrainHeight(0, -105) + 5.8;
      this.fracture = {
        active: true, position: new T.Vector3(0, fractureY, -105), width: 25, height: 12,
        shards: [], pieces: [], maxHp: 14, hp: 14,
      };
      this.fracture.group = new T.Group();
      this.fracture.group.position.copy(this.fracture.position);
      // The wall must NOT wear the breakable-moonrock materials. It used to be
      // visually identical to the rocks the player one-taps from the first
      // minute, while secretly being a progression door — the single biggest
      // "why won't this multicolored wall break" confusion. Sealed obsidian
      // with a violet burn reads as its own thing, and the emissive channel
      // doubles as the locked/exposed state light.
      this.materials.sealDark = new T.MeshStandardMaterial({ color: 0x18102c, roughness: .48, metalness: .58, emissive: 0x5a1fd0, emissiveIntensity: .38 });
      this.materials.sealLight = new T.MeshStandardMaterial({ color: 0x2c1a4e, roughness: .4, metalness: .64, emissive: 0x7b2bff, emissiveIntensity: .38 });
      const shardMatrices = { sealLight: [], sealDark: [] };
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 7; col++) {
          const radius = randomRange(1.15, 2.25, worldRandom);
          const position = new T.Vector3((col - 3) * 3.3 + randomRange(-.45, .45, worldRandom), (row - 1.5) * 3 + randomRange(-.35, .35, worldRandom), randomRange(-.8, .8, worldRandom));
          const quaternion = new T.Quaternion().setFromEuler(new T.Euler(worldRandom() * TAU, worldRandom() * TAU, worldRandom() * TAU));
          const matrix = new T.Matrix4().compose(position, quaternion, new T.Vector3(radius, radius, radius * .58));
          shardMatrices[col % 3 === 0 ? 'sealLight' : 'sealDark'].push(matrix);
        }
      }
      for (const [kind, matrices] of Object.entries(shardMatrices)) {
        const shards = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), this.materials[kind], matrices.length);
        matrices.forEach((matrix, index) => {
          shards.setMatrixAt(index, matrix);
          // Remember each chunk so damage can physically take it away. The
          // wall's health is then something you SEE getting smaller.
          const local = new T.Vector3().setFromMatrixPosition(matrix);
          this.fracture.pieces.push({
            mesh: shards, slot: index, matrix, gone: false,
            world: local.clone().add(this.fracture.position),
          });
        });
        shards.instanceMatrix.needsUpdate = true;
        shards.castShadow = shards.receiveShadow = true;
        this.fracture.group.add(shards);
        this.fracture.shards.push(shards);
      }
      // Chip order is the shuffled build order, so the wall crumbles in a
      // scattered, natural way instead of dissolving column by column.
      for (let i = this.fracture.pieces.length - 1; i > 0; i--) {
        const j = Math.floor(worldRandom() * (i + 1));
        const swap = this.fracture.pieces[i];
        this.fracture.pieces[i] = this.fracture.pieces[j];
        this.fracture.pieces[j] = swap;
      }
      const fractureGlow = this.makeGlowSprite(this.glowViolet, 22, .23);
      this.fracture.group.add(fractureGlow);
      this.scene.add(this.fracture.group);

      const goalY = this.sampleTerrainHeight(0, -229) + 6.5;
      this.goal = { open: false, position: new T.Vector3(0, goalY, -229), radius: 5.7, group: new T.Group() };
      this.goal.group.position.copy(this.goal.position);
      const outer = new T.Mesh(new T.TorusGeometry(6.8, .58, 18, 72), this.materials.gold);
      this.goal.group.add(outer);
      const inner = new T.Mesh(new T.RingGeometry(.3, 5.65, 64), new T.MeshBasicMaterial({ color: 0xffd96b, transparent: true, opacity: .19, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
      this.goal.group.add(inner);
      this.goal.glow = this.makeGlowSprite(this.glowGold, 25, .52);
      this.goal.group.add(this.goal.glow);
      this.goal.group.visible = false;
      this.scene.add(this.goal.group);

      // Cyan stakes redundantly mark the intended route without turning the moon into a neon court.
      const routePositions = [];
      for (const z of [112, 86, 60, 34, 18, -83, -128, -160, -196, -220]) {
        for (const x of [-13, 13]) {
          const y = this.sampleTerrainHeight(x, z);
          routePositions.push(new T.Vector3(x, y, z));
        }
      }
      const postInstances = new T.InstancedMesh(new T.CylinderGeometry(.08, .13, 2.6, 7), this.materials.black, routePositions.length);
      const lampInstances = new T.InstancedMesh(new T.SphereGeometry(.18, 10, 7), this.materials.cyan, routePositions.length);
      const matrix = new T.Matrix4();
      routePositions.forEach((position, index) => {
        postInstances.setMatrixAt(index, matrix.makeTranslation(position.x, position.y + 1.3, position.z));
        lampInstances.setMatrixAt(index, matrix.makeTranslation(position.x, position.y + 2.6, position.z));
      });
      postInstances.instanceMatrix.needsUpdate = true;
      lampInstances.instanceMatrix.needsUpdate = true;
      const glowGeometry = new T.BufferGeometry();
      const glowPositions = new Float32Array(routePositions.length * 3);
      routePositions.forEach((position, index) => {
        glowPositions[index * 3] = position.x;
        glowPositions[index * 3 + 1] = position.y + 2.6;
        glowPositions[index * 3 + 2] = position.z;
      });
      glowGeometry.setAttribute('position', new T.BufferAttribute(glowPositions, 3));
      const glows = new T.Points(glowGeometry, new T.PointsMaterial({
        color: 0xa5f7ff, size: 2.15, sizeAttenuation: true, map: this.glowCyan,
        transparent: true, opacity: .62, depthWrite: false, blending: T.AdditiveBlending,
      }));
      glows.userData.kbWorldGeometry = true;
      this.scene.add(postInstances, lampInstances, glows);
      this.routeLights = { posts: postInstances, lamps: lampInstances, glows };
    }
    makeBreakableField() {
      const specs = [];
      const addSpec = (x, z, radius, kind = 'rock', top = null, reward = false) => {
        const floor = top == null ? this.sampleTerrainHeight(x, z) : top;
        const position = new T.Vector3(x, floor + radius * .72, z);
        const quaternion = new T.Quaternion().setFromEuler(new T.Euler(worldRandom() * TAU, worldRandom() * TAU, worldRandom() * TAU));
        const scale = new T.Vector3(radius * randomRange(.7, 1.35, worldRandom), radius * randomRange(.7, 1.55, worldRandom), radius * randomRange(.7, 1.35, worldRandom));
        const matrix = new T.Matrix4().compose(position, quaternion, scale);
        specs.push({ id: `moonrock-${specs.length}`, kind, position, radius: radius * 1.15, matrix, alive: true, reward });
      };

      // Authored smash lines put physical toys inside the opening sightline and
      // on every landing instead of leaving all interaction to random scatter.
      const authored = [
        [-7, 108, 1.35, 'rock'], [-2, 106, 1.7, 'violet', null, true], [4, 104, 1.25, 'rock'], [9, 101, 1.7, 'rock'],
        [-13, 96, 1.2, 'rock'], [-7, 94, 1.85, 'rock'], [1, 92, 1.45, 'violet', null, true], [8, 89, 1.25, 'rock'], [14, 86, 1.7, 'rock'],
        [-17, 79, 1.3, 'rock'], [-10, 77, 1.8, 'rock'], [6, 74, 1.5, 'violet'], [13, 71, 1.25, 'rock'],
        [-22, 57, 1.55, 'rock'], [-17, 54, 1.2, 'violet', null, true], [18, 52, 1.65, 'rock'], [24, 49, 1.25, 'rock'],
        [-21, 8, 1.35, 'rock', 14], [-17, 8, 1.55, 'violet', 14, true], [-14, 10, 1.05, 'rock', 14],
        [14, -9, 1.35, 'rock', 31], [18, -8, 1.65, 'violet', 31, true], [21, -11, 1.05, 'rock', 31],
        [-18, -27, 1.25, 'rock', 47], [-14, -26, 1.7, 'violet', 47, true], [-10, -29, 1.1, 'rock', 47],
        [8, -48, 1.35, 'rock', 62], [12, -47, 1.8, 'violet', 62, true], [16, -50, 1.2, 'rock', 62],
        [-28, -126, 1.3, 'rock'], [-23, -129, 1.8, 'violet', null, true], [25, -151, 1.45, 'rock'], [30, -154, 1.7, 'rock'],
      ];
      authored.forEach(spec => addSpec(...spec));

      const reserved = [
        { x: 0, z: 105, r: 17 }, { x: 0, z: 60, r: 16 }, { x: 0, z: -150, r: 34 },
      ];
      // Rocks are punctuation, not content. A previous pass answered "the map
      // feels empty" by scattering hundreds more of them everywhere, which
      // just made the emptiness denser: if every square kilometre holds the
      // same grey lump, there is still no reason to walk anywhere. Rocks now
      // cluster only along the travelled route and around the landmarks, as
      // things to ping the ball off while you are already going somewhere.
      // The reason to cross the moon lives in LANDMARKS, not here.
      const clusterCount = this.quality === 'LOW' ? 12 : 18;
      for (let cluster = 0; cluster < clusterCount; cluster++) {
        let cx = 0;
        let cz = 0;
        for (let attempt = 0; attempt < 12; attempt++) {
          cx = randomRange(-52, 52, worldRandom);
          cz = randomRange(-235, 135, worldRandom);
          const clearOfReserved = !reserved.some(area => Math.hypot(cx - area.x, cz - area.z) < area.r);
          if (clearOfReserved || attempt === 11) break;
        }
        const members = 3 + Math.floor(worldRandom() * 4);
        for (let n = 0; n < members; n++) {
          const angle = worldRandom() * TAU;
          const spread = randomRange(1.8, 7.5, worldRandom);
          addSpec(
            cx + Math.cos(angle) * spread,
            cz + Math.sin(angle) * spread,
            randomRange(.7, 2.2, worldRandom),
            'rock', null,
            n === 0 && cluster % 3 === 0,
          );
        }
      }
      // A knot of breakables at the foot of every landmark, so arriving
      // somewhere always gives you something to hit on the way in.
      for (const mark of LANDMARKS) {
        for (let n = 0; n < 5; n++) {
          const angle = n * 1.9 + mark.x;
          const spread = randomRange(9, 17, worldRandom);
          addSpec(
            mark.x + Math.cos(angle) * spread,
            mark.z + Math.sin(angle) * spread,
            randomRange(.8, 2, worldRandom),
            'rock', null, n === 0,
          );
        }
      }
      // ...and at the foot of every far sight, because the far side is a
      // destination now, not a walk.
      const farKnots = [
        [0, -640], [-700, -260], [-430, 470], [360, 540], [720, 260],
        [0, 1032], [620, -520], [-260, 900], [-80, 720],
      ];
      for (const [knotX, knotZ] of farKnots) {
        for (let n = 0; n < 6; n++) {
          const angle = n * 1.7 + knotX * .01;
          const spread = randomRange(10, 22, worldRandom);
          addSpec(
            knotX + Math.cos(angle) * spread,
            knotZ + Math.sin(angle) * spread,
            randomRange(.8, 2.1, worldRandom),
            'rock', null, n === 0,
          );
        }
      }
      // THE CRYSTAL CAVES: breakables that live under the roofed trenches --
      // tall glowing crystals instead of round rocks, so shape still carries
      // the meaning. Smashing one pays like a rock but SOUNDS like a bell.
      const caveCrystals = [
        [372, -152, 1.6, 'crystal'], [378, -144, 2.1, 'crystal', null, true], [385, -136, 1.4, 'crystal'],
        [390, -130, 1.9, 'crystal'], [396, -122, 1.5, 'crystal', null, true], [368, -142, 1.2, 'crystal'],
        [-548, 74, 1.7, 'crystal'], [-540, 82, 2.2, 'crystal', null, true], [-532, 90, 1.5, 'crystal'],
        [-526, 96, 1.8, 'crystal'], [-490, 138, 1.6, 'crystal', null, true], [-484, 146, 1.3, 'crystal'],
      ];
      caveCrystals.forEach(spec => addSpec(...spec));
      // ONE rock material for every breakable. The old build split them into
      // two colours that meant nothing mechanically — and the player this is
      // made for is colourblind, so it was a distinction that cost him
      // attention and paid him nothing. Meaning now lives in SHAPE: a rock
      // carrying a reward wears a crystal spur you can see from any angle and
      // in any palette.
      this.breakableMeshes = [];
      const rockSpecs = specs.filter(spec => spec.kind !== 'crystal');
      const crystalSpecs = specs.filter(spec => spec.kind === 'crystal');
      const geometry = new T.DodecahedronGeometry(1, 0);
      const mesh = new T.InstancedMesh(geometry, this.materials.rock, rockSpecs.length);
      rockSpecs.forEach((entry, index) => {
        entry.mesh = mesh;
        entry.instanceIndex = index;
        mesh.setMatrixAt(index, entry.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = this.quality === 'HIGH';
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.breakableMeshes.push(mesh);
      if (crystalSpecs.length) {
        const crystalGeometry = new T.ConeGeometry(.55, 2.6, 5, 1);
        crystalGeometry.translate(0, .9, 0);
        const crystalMaterial = new T.MeshStandardMaterial({
          color: 0x9fe8ff, emissive: 0x3fb9e8, emissiveIntensity: 1.7,
          roughness: .14, metalness: .25, flatShading: true,
        });
        const crystalMesh = new T.InstancedMesh(crystalGeometry, crystalMaterial, crystalSpecs.length);
        crystalSpecs.forEach((entry, index) => {
          entry.mesh = crystalMesh;
          entry.instanceIndex = index;
          crystalMesh.setMatrixAt(index, entry.matrix);
        });
        crystalMesh.instanceMatrix.needsUpdate = true;
        crystalMesh.castShadow = this.quality === 'HIGH';
        this.scene.add(crystalMesh);
        this.breakableMeshes.push(crystalMesh);
      }

      const rewards = specs.filter(spec => spec.reward);
      const spurGeometry = new T.ConeGeometry(.34, 1.5, 5);
      const spurs = new T.InstancedMesh(spurGeometry, this.materials.cyan, rewards.length);
      const spurMatrix = new T.Matrix4();
      rewards.forEach((entry, index) => {
        spurs.setMatrixAt(index, spurMatrix.makeTranslation(
          entry.position.x, entry.position.y + entry.radius * .9, entry.position.z,
        ));
        entry.spur = { mesh: spurs, index };
      });
      spurs.instanceMatrix.needsUpdate = true;
      this.scene.add(spurs);
      this.rewardSpurs = spurs;
      this.breakables.push(...specs);
    }
    makePlaygroundFeatures() {
      const addPickup = (position, active = true, label = 'MOON SHARD') => {
        const group = new T.Group();
        const core = new T.Mesh(new T.OctahedronGeometry(.48, 0), this.materials.gold);
        const ring = new T.Mesh(new T.TorusGeometry(.72, .055, 8, 32), this.materials.cyan);
        ring.rotation.x = Math.PI / 2;
        const glow = this.makeGlowSprite(this.glowGold, 3.8, .46);
        group.add(core, ring, glow);
        group.position.copy(position);
        group.visible = active;
        this.scene.add(group);
        const pickup = { id: `shard-${this.collectibles.length}`, group, core, ring, glow, position: position.clone(), active, initialActive: active, label, phase: worldRandom() * TAU };
        this.collectibles.push(pickup);
        return pickup;
      };

      for (const item of this.breakables) {
        if (!item.reward) continue;
        item.rewardPickup = addPickup(item.position.clone().add(new T.Vector3(0, 1.8, 0)), false, item.kind === 'violet' ? 'VIOLET CACHE' : 'MOON SHARD');
      }
      [
        [-43, 3], [48, -31], [-61, -73], [70, -138], [-42, -203], [34, -238],
      ].forEach(([x, z], index) => addPickup(new T.Vector3(x, this.sampleTerrainHeight(x, z) + 2.1, z), true, index % 2 ? 'HIDDEN ORBIT' : 'MOON SHARD'));

      const nestSpecs = [
        { id: 'impact-nest', x: 24, z: 96, hp: 2 },
        { id: 'side-nest', x: -58, z: 18, hp: 3 },
        { id: 'rift-nest', x: 64, z: -78, hp: 3 },
        { id: 'crown-nest', x: -42, z: -166, hp: 4 },
      ];
      for (const spec of nestSpecs) {
        const group = new T.Group();
        const core = new T.Mesh(new T.IcosahedronGeometry(1.65, 2), this.materials.alien);
        core.scale.set(1.25, 1.5, 1.15);
        core.position.y = 1.35;
        core.castShadow = true;
        group.add(core);
        const crown = new T.Mesh(new T.TorusKnotGeometry(1.28, .22, 64, 8, 2, 3), this.materials.violet);
        crown.position.y = 1.55;
        crown.scale.y = .72;
        group.add(crown);
        for (let index = 0; index < 7; index++) {
          const angle = index / 7 * TAU;
          const tendril = new T.Mesh(new T.CapsuleGeometry(.14, 2.5, 5, 8), index % 2 ? this.materials.alienShell : this.materials.violet);
          tendril.rotation.set(Math.PI / 2.45, 0, -angle + Math.PI / 2);
          tendril.position.set(Math.cos(angle) * 1.5, .42, Math.sin(angle) * 1.5);
          group.add(tendril);
        }
        const weak = new T.Mesh(new T.OctahedronGeometry(.48, 0), this.materials.gold);
        weak.position.y = 2.9;
        group.add(weak);
        const glow = this.makeGlowSprite(this.glowViolet, 8.5, .3);
        glow.position.y = 1.4;
        group.add(glow);
        const y = this.sampleTerrainHeight(spec.x, spec.z);
        group.position.set(spec.x, y, spec.z);
        group.traverse(object => { if (object.isMesh) object.castShadow = true; });
        this.scene.add(group);
        const nest = { ...spec, maxHp: spec.hp, group, core, crown, weak, glow, position: new T.Vector3(spec.x, y + 1.45, spec.z), radius: 2.6, alive: true, hitFlash: 0, phase: worldRandom() * TAU };
        nest.drop = addPickup(new T.Vector3(spec.x, y + 3.4, spec.z), false, 'XENO HEART');
        this.nests.push(nest);
      }

      const padSpecs = [
        [-26, 88, 17], [29, 31, 19], [-34, -66, 20], [44, -118, 18], [-55, -191, 21], [48, -221, 19],
      ];
      for (const [x, z, impulse] of padSpecs) {
        const y = this.sampleTerrainHeight(x, z) + .12;
        const group = new T.Group();
        const ring = new T.Mesh(new T.TorusGeometry(2.7, .18, 10, 52), this.materials.cyan);
        ring.rotation.x = Math.PI / 2;
        const inner = new T.Mesh(new T.CylinderGeometry(2.15, 2.35, .18, 32), new T.MeshStandardMaterial({ color: 0x182a3d, emissive: 0x126f88, emissiveIntensity: 1.8, roughness: .38, metalness: .62 }));
        group.add(ring, inner);
        group.position.set(x, y, z);
        this.scene.add(group);
        this.launchPads.push({ id: `launch-pad-${this.launchPads.length}`, group, ring, inner, position: new T.Vector3(x, y, z), radius: 2.85, impulse, cooldown: 0, phase: worldRandom() * TAU });
      }

      // THE RIM SPRINGS. A ring of much stronger pads sitting just past the
      // old map edge, all the way round. They are visible from inside the map,
      // which is the whole job: the answer to "why would I go out there" has
      // to be something you can SEE from in here, and the answer to "how" has
      // to be better than walking. Hit one and the wander band is two seconds
      // away instead of thirty.
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * TAU + .21;
        const reach = 402 + (i % 3) * 26;
        const x = Math.cos(angle) * reach;
        const z = Math.sin(angle) * reach;
        const y = this.sampleTerrainHeight(x, z) + .12;
        const group = new T.Group();
        const ring = new T.Mesh(new T.TorusGeometry(3.4, .22, 10, 52), this.materials.gold);
        ring.rotation.x = Math.PI / 2;
        const inner = new T.Mesh(
          new T.CylinderGeometry(2.7, 2.95, .2, 32),
          new T.MeshStandardMaterial({ color: 0x2c2312, emissive: 0xc07a12, emissiveIntensity: 2.1, roughness: .38, metalness: .62 }),
        );
        group.add(ring, inner);
        group.position.set(x, y, z);
        this.scene.add(group);
        this.launchPads.push({
          id: `rim-spring-${i}`, group, ring, inner,
          position: new T.Vector3(x, y, z), radius: 3.5, impulse: 27, cooldown: 0,
          phase: worldRandom() * TAU,
        });
      }

      const chimeSpecs = [[-32, 64], [38, 4], [-48, -94], [51, -143], [-28, -214]];
      for (const [x, z] of chimeSpecs) {
        const y = this.sampleTerrainHeight(x, z) + 5.4;
        const group = new T.Group();
        const ring = new T.Mesh(new T.TorusGeometry(1.5, .14, 10, 48), this.materials.gold);
        const crystal = new T.Mesh(new T.OctahedronGeometry(.58, 0), this.materials.cyan);
        const beam = new T.Mesh(new T.CylinderGeometry(.04, .04, 5.2, 6), this.materials.cyan);
        beam.position.y = 2.65;
        group.add(ring, crystal, beam);
        group.position.set(x, y, z);
        this.scene.add(group);
        const chime = { id: `moon-chime-${this.moonChimes.length}`, group, ring, crystal, position: new T.Vector3(x, y, z), radius: 1.8, used: false, phase: worldRandom() * TAU };
        chime.drop = addPickup(new T.Vector3(x, y + 1.2, z), false, 'CHIME STAR');
        this.moonChimes.push(chime);
      }

      // A readable side shrine makes one optional route look intentional from
      // the basin instead of like another random rock pile.
      this.sideShrine = new T.Group();
      const shrineX = -58, shrineZ = 18, shrineY = this.sampleTerrainHeight(shrineX, shrineZ);
      for (const side of [-1, 1]) {
        const pillar = new T.Mesh(new T.BoxGeometry(2.2, 9.5, 2.2), this.materials.darkRock);
        pillar.position.set(side * 5.2, 4.75, 0);
        pillar.rotation.z = side * .08;
        pillar.castShadow = true;
        this.sideShrine.add(pillar);
      }
      const lintel = new T.Mesh(new T.BoxGeometry(12.5, 2.1, 2.5), this.materials.darkRock);
      lintel.position.y = 9.2;
      lintel.castShadow = true;
      this.sideShrine.add(lintel);
      this.sideShrine.position.set(shrineX, shrineY, shrineZ);
      this.scene.add(this.sideShrine);
    }
    makeFirstPersonRig() {
      this.rig = new T.Group();
      this.rig.position.set(0, -.43, -1.28);
      this.rig.scale.setScalar(.72);
      this.camera.add(this.rig);
      const suitFabric = new T.MeshStandardMaterial({
        color: 0x9da9b6, emissive: 0x0b1017, emissiveIntensity: .24,
        roughness: .78, metalness: .08,
      });
      const jointMaterial = new T.MeshStandardMaterial({ color: 0x121927, roughness: .5, metalness: .48 });
      const gloveShell = new T.MeshStandardMaterial({
        color: 0xd6dde1, emissive: 0x151b20, emissiveIntensity: .16,
        roughness: .62, metalness: .1,
      });
      const palmMaterial = new T.MeshStandardMaterial({ color: 0x202a35, roughness: .82, metalness: .05 });
      const suitLight = new T.MeshStandardMaterial({
        color: 0x9cf6ff, emissive: 0x42ddef, emissiveIntensity: 2.2,
        roughness: .26, metalness: .24,
      });
      const makeArm = side => {
        const arm = new T.Group();
        const angle = side * .3;
        const forearm = new T.Mesh(new T.CapsuleGeometry(.165, .67, 6, 14), suitFabric);
        forearm.rotation.z = angle;
        forearm.position.set(side * .69, -.48, -.31);
        arm.add(forearm);

        const elbow = new T.Mesh(new T.CylinderGeometry(.19, .18, .14, 14), jointMaterial);
        elbow.rotation.z = angle;
        elbow.position.set(side * .8, -.78, -.28);
        arm.add(elbow);

        const cuff = new T.Mesh(new T.CylinderGeometry(.205, .185, .17, 16), jointMaterial);
        cuff.rotation.z = angle;
        cuff.position.set(side * .55, -.17, -.43);
        arm.add(cuff);
        const cuffLight = new T.Mesh(new T.CylinderGeometry(.202, .202, .035, 18, 1, true), suitLight);
        cuffLight.rotation.z = angle;
        cuffLight.position.set(side * .55, -.17, -.43);
        arm.add(cuffLight);

        const glove = new T.Mesh(new T.SphereGeometry(.19, 18, 13), gloveShell);
        glove.scale.set(.92, .72, 1.24);
        glove.position.set(side * .45, -.055, -.57);
        arm.add(glove);
        const palm = new T.Mesh(new T.BoxGeometry(.18, .105, .19, 2, 1, 2), palmMaterial);
        palm.position.set(side * .45, -.085, -.395);
        palm.rotation.z = -angle * .35;
        arm.add(palm);

        const wristScreen = new T.Mesh(new T.BoxGeometry(.12, .065, .018), suitLight);
        wristScreen.position.set(side * .62, -.31, -.135);
        wristScreen.rotation.z = angle;
        arm.add(wristScreen);
        return arm;
      };
      this.leftArm = makeArm(-1);
      this.rightArm = makeArm(1);
      this.leftArm.visible = false;
      this.rightArm.visible = false;
      this.rig.add(this.leftArm, this.rightArm);
      this.boot = new T.Group();
      // View-model materials must be private: the depth-test override below must
      // never leak into world pylons, goal trim, or gold anchor hardware.
      const bootMaterial = this.materials.black.clone();
      const soleMaterial = this.materials.gold.clone();
      const bootMesh = new T.Mesh(new T.CapsuleGeometry(.21, .42, 6, 14), bootMaterial);
      bootMesh.rotation.x = Math.PI / 2;
      bootMesh.scale.set(1, 1, 1.12);
      bootMesh.position.z = -.2;
      const toe = new T.Mesh(new T.SphereGeometry(.235, 16, 10), suitFabric);
      toe.scale.set(1, .72, 1.22);
      toe.position.set(0, -.015, -.53);
      const sole = new T.Mesh(new T.BoxGeometry(.4, .075, .82, 2, 1, 3), soleMaterial);
      sole.position.set(0, -.2, -.22);
      this.boot.add(bootMesh, toe, sole);
      this.boot.position.set(.18, -.92, -.28);
      this.boot.visible = false;
      this.rig.add(this.boot);
      this.rig.traverse(object => {
        if (object.isMesh) { object.renderOrder = 20; object.material.depthTest = false; object.frustumCulled = false; }
      });
    }
    // ---- THE SKYFIELD ----------------------------------------------------
    makeSkyfield() {
      this.sky = [];
      // A touch of self-illumination so the undersides do not read as flat
      // black cut-outs. The sun is above them and the player spends a lot of
      // time underneath looking up; without this they are silhouettes.
      const rock = new T.MeshStandardMaterial({
        color: 0x8a919e, roughness: .93, metalness: .05,
        emissive: 0x1d2333, emissiveIntensity: 1,
        map: this.materials.regolith.map, bumpMap: this.materials.regolith.bumpMap, bumpScale: .9,
      });
      const cap = new T.MeshStandardMaterial({
        color: 0xb9c0cd, roughness: .9, metalness: .04,
        map: this.materials.regolith.map, bumpMap: this.materials.regolith.bumpMap, bumpScale: .7,
      });
      this.materials.skyRock = rock;
      // The slabs never move, so all twenty-seven bodies collapse into ONE
      // draw call and all twenty-seven decks into another. Left as individual
      // meshes they cost ~165 extra draws and pushed the spawn view to 30 fps
      // at HIGH, which the adaptive quality system then papered over by
      // dropping render scale. Merging fixes the cause instead of the symptom.
      const bodyParts = [];
      const deckParts = [];
      let index = 0;
      for (const tier of SKY_TIERS) {
        for (let n = 0; n < tier.count; n++) {
          // Golden angle again: rings of slabs that never line up into a grid,
          // and never stack directly on top of each other.
          const angle = index * 2.3999632 + tier.height * .07;
          const reach = tier.spread[0] + (tier.count > 1 ? (n / (tier.count - 1)) : 0) * (tier.spread[1] - tier.spread[0]);
          const x = Math.cos(angle) * reach + (tier.at ? tier.at.x : 0);
          const z = Math.sin(angle) * reach + (tier.at ? tier.at.z : -40);
          const radius = tier.radius[0] + valueNoise(x * .05, z * .05) * (tier.radius[1] - tier.radius[0]);
          // Float ABOVE everything underneath. Terrain alone is not enough:
          // the 60 m mesa swallowed two slabs whole (sealing their undersides,
          // since terrain is not one-way), and the Glassworks spires speared
          // straight through others. Clear the ground AND any standing
          // structure by a comfortable margin.
          const ground = this.sampleTerrainHeight(x, z);
          let top = Math.max(
            tier.height + valueNoise(x * .09 + 3, z * .09) * 22 - 8,
            ground + 26,
          );
          for (const solid of this.regionSolids(x, z)) {
            if (Math.hypot(x - solid.x, z - solid.z) > radius + solid.radius + 4) continue;
            top = Math.max(top, solid.top + 16);
          }
          const slab = new T.Group();
          slab.userData.kbOriginGroup = true;
          this.scene.add(slab);
          bodyParts.push(this.skySlabGeometry(x, z, top, radius, false));
          deckParts.push(this.skySlabGeometry(x, z, top, radius, true));
          const role = tier.name === 'crown' ? 'crown' : SKY_ROLES[index % SKY_ROLES.length];
          const mark = {
            id: `sky-${index}`, index, tier: tier.name, role,
            x, z, top, radius,
            position: new T.Vector3(x, top, z),
            group: slab, lit: false, cooldown: 0,
          };
          this.buildSkyFurniture(mark);
          this.sky.push(mark);
          index++;
        }
      }
      for (const spec of SKY_STRUCTURES) {
        const ground = this.sampleTerrainHeight(spec.x, spec.z);
        const top = ground + spec.lift;
        const slab = new T.Group();
        slab.userData.kbOriginGroup = true;
        this.scene.add(slab);
        bodyParts.push(this.skySlabGeometry(spec.x, spec.z, top, spec.radius, false));
        deckParts.push(this.skySlabGeometry(spec.x, spec.z, top, spec.radius, true));
        const mark = {
          id: `sky-${index}`, index, tier: 'structure', role: spec.role,
          x: spec.x, z: spec.z, top, radius: spec.radius,
          position: new T.Vector3(spec.x, top, spec.z),
          group: slab, lit: false, cooldown: 0,
        };
        if (spec.body) mark.body = spec.body;
        this.buildSkyFurniture(mark);
        this.sky.push(mark);
        index++;
      }
      const bodyMesh = new T.Mesh(mergeStaticGeometries(bodyParts), rock);
      bodyMesh.userData.kbWorldGeometry = true;
      bodyMesh.receiveShadow = true;
      bodyMesh.frustumCulled = false;
      this.scene.add(bodyMesh);
      const deckMesh = new T.Mesh(mergeStaticGeometries(deckParts), cap);
      deckMesh.userData.kbWorldGeometry = true;
      deckMesh.receiveShadow = true;
      deckMesh.frustumCulled = false;
      this.scene.add(deckMesh);
      this.skyMeshes = [bodyMesh, deckMesh];

      // Rings hang BETWEEN slabs, not on them: they are the road, and a road
      // has to be visible from the place you are standing before you jump.
      this.skyRings = [];
      for (const mark of this.sky) {
        if (mark.role !== 'ring') continue;
        const partner = this.sky.find(other => other !== mark
          && other.top > mark.top + 12
          && Math.hypot(other.x - mark.x, other.z - mark.z) < 150);
        if (!partner) continue;
        const mid = new T.Vector3((mark.x + partner.x) / 2, (mark.top + partner.top) / 2 + 16, (mark.z + partner.z) / 2);
        const toward = new T.Vector3(partner.x - mark.x, partner.top - mark.top, partner.z - mark.z).normalize();
        const ring = new T.Mesh(
          new T.TorusGeometry(6.5, .75, 10, 40),
          new T.MeshBasicMaterial({ color: 0x8fe9ff, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false }),
        );
        ring.position.copy(mid);
        ring.lookAt(mid.clone().add(toward));
        this.scene.add(ring);
        const halo = this.makeGlowSprite(this.glowCyan, 20, .3);
        halo.position.copy(mid);
        this.scene.add(halo);
        this.skyRings.push({ mesh: ring, halo, position: mid, toward, radius: 6.5, cooldown: 0 });
      }
    }
    // A pillar of light stands over the opened hole -- the "something
    // happened, over THERE" signal, visible across the moon like the beacon.
    makeHolePillar(at) {
      if (this.holePillar) { this.holePillar.visible = true; return; }
      const pillar = new T.Mesh(
        new T.CylinderGeometry(1.2, 3.4, 220, 12, 1, true),
        new T.MeshBasicMaterial({
          color: 0x9defff, transparent: true, opacity: .34, side: T.DoubleSide,
          depthWrite: false, blending: T.AdditiveBlending,
        }),
      );
      pillar.position.copy(at).addScaledVector(dirAt(at, this.fxScratch), 108);
      pillar.quaternion.setFromUnitVectors(UP, dirAt(at, this.fxScratch));
      pillar.userData.kbLifted = true;
      this.holePillar = pillar;
      this.scene.add(pillar);
    }
    // Victory cosmetics. The ball takes the heart's look -- deep space with a
    // burning cyan core -- and every planet in the sky gets a face drawn onto
    // its own texture, smiling. Not much changes. That is the point.
    dressMoonheartBall() {
      const visual = this.ballVisual;
      if (!visual) return;
      visual.core.material = new T.MeshStandardMaterial({
        color: 0x0d1834, emissive: 0x63e4ff, emissiveIntensity: 3.8,
        roughness: .2, metalness: .5,
      });
      visual.ringA.material = visual.ringA.material.clone();
      visual.ringB.material = visual.ringB.material.clone();
      visual.ringA.material.color?.set(0x9defff);
      visual.ringB.material.color?.set(0xbf83ff);
    }
    drawSmiles() {
      const faces = [...(this.planets || []), this.homeEarth].filter(Boolean);
      for (const planet of faces) {
        const texture = planet.material.map;
        const canvas = texture?.image;
        const context = canvas?.getContext?.('2d');
        if (!context) continue;
        const w = canvas.width;
        const h = canvas.height;
        context.globalCompositeOperation = 'source-over';
        context.fillStyle = 'rgba(10, 16, 38, .85)';
        for (const side of [-1, 1]) {
          context.beginPath();
          context.ellipse(w * .5 + side * w * .055, h * .42, w * .015, h * .05, 0, 0, TAU);
          context.fill();
        }
        context.strokeStyle = 'rgba(10, 16, 38, .85)';
        context.lineWidth = h * .022;
        context.lineCap = 'round';
        context.beginPath();
        context.arc(w * .5, h * .48, w * .07, Math.PI * .12, Math.PI * .88);
        context.stroke();
        texture.needsUpdate = true;
      }
    }
    // Re-displace the built terrain around a direction after the height law
    // changed there (the moonhole opening -- or resealing on restart). The
    // unique-vertex cache from makeTerrain makes this a bounded recompute:
    // heights and shading re-derive from the CURRENT law, so the same call
    // both carves and heals. Local normals go analytic (finite differences of
    // the live ground law), which matches the carved collision exactly.
    reDisplaceTerrain(centreDir, arcRadius) {
      const positions = this.terrain.geometry.attributes.position;
      const normals = this.terrain.geometry.attributes.normal;
      const colors = this.terrain.geometry.attributes.color;
      const dir = new T.Vector3();
      const sp = new T.Vector3();
      const sr = new T.Vector3();
      const ex = new T.Vector3();
      const ez = new T.Vector3();
      const normal = new T.Vector3();
      const touched = new Set();
      for (const [key, record] of this.terrainUnique) {
        dir.set(record.dx, record.dy, record.dz);
        if (arcTo(dir, centreDir) > arcRadius) continue;
        record.height = elevationAt(dir);
        const horizontal = Math.hypot(record.dx, record.dz);
        let px = 0, pz = 0;
        if (horizontal > 1e-9) {
          const rho = PLANET.radius * Math.atan2(horizontal, record.dy);
          px = record.dx * (rho / horizontal);
          pz = record.dz * (rho / horizontal);
          sp.set(-record.dz / horizontal, 0, record.dx / horizontal);
          sr.crossVectors(dir, sp);
          const ax = px / rho, az = pz / rho;
          ex.copy(sr).multiplyScalar(ax).addScaledVector(sp, -az);
          ez.copy(sr).multiplyScalar(az).addScaledVector(sp, ax);
        } else {
          ex.set(1, 0, 0);
          ez.set(0, 0, 1);
        }
        const dhdx = (groundHeightAt(px + 1.4, pz) - groundHeightAt(px - 1.4, pz)) / 2.8;
        const dhdz = (groundHeightAt(px, pz + 1.4) - groundHeightAt(px, pz - 1.4)) / 2.8;
        normal.copy(dir).addScaledVector(ex, -dhdx).addScaledVector(ez, -dhdz).normalize();
        record.nx = normal.x;
        record.ny = normal.y;
        record.nz = normal.z;
        this.shadeTerrainRecord(record);
        touched.add(key);
      }
      if (!touched.size) return;
      for (let i = 0; i < this.terrainKeys.length; i++) {
        const key = this.terrainKeys[i];
        if (!touched.has(key)) continue;
        const record = this.terrainUnique.get(key);
        const reach = PLANET.radius + record.height;
        positions.setXYZ(i,
          record.dx * reach + PLANET.centre.x,
          record.dy * reach + PLANET.centre.y,
          record.dz * reach + PLANET.centre.z);
        normals.setXYZ(i, record.nx, record.ny, record.nz);
        colors.setXYZ(i, record.r, record.g, record.b);
      }
      positions.needsUpdate = true;
      normals.needsUpdate = true;
      colors.needsUpdate = true;
      this.terrain.geometry.computeBoundingSphere();
    }
    // THE MOONHEART. The final boss, at the bottom of the hole to the end of
    // the moon: a crystal core inside two tilted rings of orbiting shards.
    // The shards are the health -- smash all six, then strike the bared heart
    // twice. Pure Great Wheel grammar in three dimensions.
    makeMoonheart() {
      if (this.moonheart) return this.moonheart;
      const centre = chartLift(0, MOONHOLE.depth + 9, 1130, new T.Vector3());
      const up = dirAt(centre, new T.Vector3()).clone();
      const group = new T.Group();
      group.position.copy(centre);
      group.quaternion.setFromUnitVectors(UP, up);
      const core = new T.Mesh(
        new T.IcosahedronGeometry(3.8, 1),
        new T.MeshPhysicalMaterial({
          color: 0xbfe8ff, emissive: 0x63e4ff, emissiveIntensity: 2.2,
          metalness: .15, roughness: .08, transmission: .45, transparent: true, opacity: .92,
        }),
      );
      group.add(core);
      const glow = this.makeGlowSprite(this.glowCyan, 30, .5);
      group.add(glow);
      const nodes = [];
      for (let i = 0; i < 8; i++) {
        const mesh = new T.Mesh(new T.OctahedronGeometry(1.35, 0), this.materials.violet);
        mesh.castShadow = true;
        group.add(mesh);
        nodes.push({ mesh, phase: (i / 8) * TAU, ring: i % 2, alive: true });
      }
      group.userData.kbLifted = true;
      this.scene.add(group);
      this.moonheart = {
        group, core, glow, nodes, up,
        position: centre.clone(), alive: true, exposed: false,
        coreHp: 3, exposedTimer: 0, spin: 0, hitFlash: 0,
      };
      return this.moonheart;
    }
    // THE COLOSSUS. A stone titan enthroned on the great mountain's peak:
    // it winds up, STOMPS a shockwave that flings anyone grounded nearby,
    // and in the stagger after each stomp the gold core on its back stands
    // bared -- strike it then for double. Every solid hit still takes one.
    makeColossus() {
      const peakX = 620, peakZ = -520;
      const ground = this.sampleTerrainHeight(peakX, peakZ);
      const group = new T.Group();
      const stone = new T.MeshStandardMaterial({
        color: 0x6a6154, emissive: 0x33241a, emissiveIntensity: .5,
        roughness: .96, metalness: .04, flatShading: true,
      });
      const hips = new T.Mesh(new T.DodecahedronGeometry(3.4, 0), stone);
      hips.scale.set(1.25, .9, 1);
      hips.position.y = 3.4;
      hips.castShadow = true;
      group.add(hips);
      const chest = new T.Mesh(new T.DodecahedronGeometry(3.1, 0), stone);
      chest.scale.set(1.45, 1.1, 1.05);
      chest.position.y = 7.6;
      chest.castShadow = true;
      group.add(chest);
      const head = new T.Mesh(new T.DodecahedronGeometry(1.35, 0), stone);
      head.position.y = 10.9;
      group.add(head);
      const eyeLeft = new T.Mesh(new T.SphereGeometry(.28, 10, 8), this.materials.cyan);
      eyeLeft.position.set(-.5, 11.1, -1.1);
      group.add(eyeLeft);
      const eyeRight = eyeLeft.clone();
      eyeRight.position.x = .5;
      group.add(eyeRight);
      const arms = [];
      for (const side of [-1, 1]) {
        const shoulder = new T.Group();
        shoulder.position.set(side * 4.4, 8.8, 0);
        const arm = new T.Mesh(new T.BoxGeometry(1.9, 6.8, 2.3), stone);
        arm.position.y = -3;
        arm.castShadow = true;
        shoulder.add(arm);
        group.add(shoulder);
        arms.push(shoulder);
      }
      const weak = new T.Mesh(new T.OctahedronGeometry(1.15, 0), this.materials.gold.clone());
      weak.position.set(0, 8.2, 2.6);
      group.add(weak);
      const glow = this.makeGlowSprite(this.glowGold, 10, .28);
      glow.position.copy(weak.position);
      group.add(glow);
      chartLift(peakX, ground, peakZ, group.position);
      liftQuatAt(peakX, peakZ, group.quaternion);
      group.userData.kbLifted = true;
      this.scene.add(group);
      this.colossus = {
        group, arms, weak, chest,
        x: peakX, z: peakZ, ground,
        position: group.position.clone(), up: dirAt(group.position, new T.Vector3()).clone(),
        alive: true, maxHp: 7, hp: 7,
        mode: 'idle', modeTimer: 0, exposed: 0, hitFlash: 0, deadTimer: 0,
      };
    }
    // THE ROC. A flying boss: it circles THE PERCH -- the lone colossal slab
    // over the far side -- rears, and dives at whoever stands there. Its
    // whole body takes hits (the one combat law), and a strike from ABOVE,
    // onto the gold eye it carries on its back, takes double.
    makeRoc() {
      const perch = this.sky.find(slab => slab.tier === 'perch');
      if (!perch) return;
      const group = new T.Group();
      const feathers = new T.MeshStandardMaterial({
        color: 0x3a2f52, emissive: 0x8a5bd0, emissiveIntensity: .85,
        roughness: .62, metalness: .18,
      });
      const body = new T.Mesh(new T.IcosahedronGeometry(3.1, 1), feathers);
      body.scale.set(1.5, .85, 1.1);
      body.castShadow = true;
      group.add(body);
      const head = new T.Mesh(new T.ConeGeometry(1.15, 3.2, 8), feathers);
      head.rotation.x = -Math.PI / 2;
      head.position.set(0, .6, -4.2);
      group.add(head);
      const tail = new T.Mesh(new T.ConeGeometry(1.5, 5.2, 6), feathers);
      tail.rotation.x = Math.PI / 2;
      tail.position.set(0, .2, 4.6);
      group.add(tail);
      const wings = [];
      for (const side of [-1, 1]) {
        const shoulder = new T.Group();
        shoulder.position.set(side * 2.4, .9, 0);
        const wing = new T.Mesh(new T.BoxGeometry(9.5, .5, 4.6), feathers);
        wing.position.x = side * 5.1;
        wing.castShadow = true;
        shoulder.add(wing);
        group.add(shoulder);
        wings.push(shoulder);
      }
      const weak = new T.Mesh(new T.OctahedronGeometry(1.2, 0), this.materials.gold.clone());
      weak.position.set(0, 2.4, .4);
      group.add(weak);
      const glow = this.makeGlowSprite(this.glowGold, 12, .3);
      glow.position.copy(weak.position);
      group.add(glow);
      group.userData.kbLifted = true;
      this.scene.add(group);
      this.roc = {
        group, wings, weak, body, perch,
        alive: true, maxHp: 6, hp: 6,
        angle: 0, radius: 46, altitude: perch.top + 32, speed: .34,
        mode: 'circle', modeTimer: 0,
        position: new T.Vector3(), chartPos: new T.Vector3(), up: new T.Vector3(),
        diveVelocity: new T.Vector3(),
        hitFlash: 0, deadTimer: 0,
      };
    }
    // LAUNCH RINGS: planet-ring hoops strung between distant sky clusters.
    // Fly through one and it hurls you along the great circle toward its
    // partner in a real suborbital arc -- while flung, the player's orbital
    // float is deliberately allowed, because the ride IS the reward. Both
    // rings of a pair aim at each other, so every road runs both ways.
    makeLaunchRings() {
      this.launchRings = [];
      const pairs = [
        [{ x: 0, z: 160, alt: 148 }, { x: 0, z: 830, alt: 118 }],
        [{ x: 500, z: 380, alt: 108 }, { x: -30, z: 860, alt: 128 }],
        [{ x: -600, z: -210, alt: 132 }, { x: -60, z: -30, alt: 142 }],
        [{ x: -430, z: 420, alt: 118 }, { x: -640, z: -180, alt: 138 }],
        [{ x: 60, z: -600, alt: 128 }, { x: 600, z: -470, alt: 148 }],
        [{ x: 0, z: 1000, alt: 108 }, { x: -90, z: 760, alt: 172 }],
        [{ x: 700, z: 300, alt: 118 }, { x: 260, z: -560, alt: 138 }],
        // Ring ROADS: consecutive pairs read as one line in the sky -- ride
        // the chain structure to structure.
        [{ x: -300, z: 300, alt: 150 }, { x: -66, z: 126, alt: 158 }],   // helix out
        [{ x: -30, z: 92, alt: 156 }, { x: 270, z: -312, alt: 128 }],    // ...to the coronet
        [{ x: 446, z: 106, alt: 78 }, { x: 606, z: -194, alt: 128 }],    // archway out
        [{ x: 578, z: -228, alt: 126 }, { x: 620, z: -520, alt: 150 }],  // ...to the peak
      ];
      const ringMaterial = new T.MeshBasicMaterial({
        color: 0x9fd8ff, transparent: true, opacity: .34, side: T.DoubleSide,
        depthWrite: false, blending: T.AdditiveBlending,
      });
      const rimMaterial = new T.MeshStandardMaterial({
        color: 0xffe9b0, emissive: 0xffb42a, emissiveIntensity: 1.6,
        metalness: .7, roughness: .25,
      });
      // A ring must hang CLEAR of every slab near its column, or the launch
      // face-plants into an island two seconds in.
      const clearAlt = spec => {
        let alt = spec.alt;
        for (const slab of this.sky) {
          if (Math.hypot(spec.x - slab.x, spec.z - slab.z) < slab.radius + 30) alt = Math.max(alt, slab.top + 24);
        }
        return alt;
      };
      for (const [a, b] of pairs) {
        const worldA = chartLift(a.x, clearAlt(a), a.z, new T.Vector3());
        const worldB = chartLift(b.x, clearAlt(b), b.z, new T.Vector3());
        const build = (at, partner) => {
          const up = dirAt(at, new T.Vector3()).clone();
          const toward = tangentOf(partner.clone().sub(at), up, new T.Vector3()).normalize()
            .addScaledVector(up, .42).normalize();
          const group = new T.Group();
          const band = new T.Mesh(new T.RingGeometry(9.5, 15.5, 64, 1), ringMaterial);
          const rim = new T.Mesh(new T.TorusGeometry(15.8, .9, 10, 64), rimMaterial);
          const rimInner = new T.Mesh(new T.TorusGeometry(9.2, .55, 10, 64), rimMaterial);
          group.add(band, rim, rimInner);
          group.position.copy(at);
          group.up.copy(up);
          group.lookAt(at.clone().add(toward));
          group.userData.kbLifted = true;
          this.scene.add(group);
          const halo = this.makeGlowSprite(this.glowCyan, 42, .22);
          halo.position.copy(at);
          halo.userData.kbLifted = true;
          this.scene.add(halo);
          this.launchRings.push({ group, halo, position: at.clone(), toward, radius: 15.5, fling: 74, cooldown: 0 });
        };
        build(worldA, worldB);
        build(worldB, worldA);
        // the two ends of one road share arrival immunity
        this.launchRings[this.launchRings.length - 2].partner = this.launchRings[this.launchRings.length - 1];
        this.launchRings[this.launchRings.length - 1].partner = this.launchRings[this.launchRings.length - 2];
      }
    }
    // Returns world-space geometry for one slab, ready to be merged with the
    // rest. `deck` picks the flat walkable cap instead of the boulder body.
    skySlabGeometry(x, z, top, radius, deck) {
      if (deck) {
        const cap = new T.CylinderGeometry(radius, radius * .99, .8, 22);
        cap.translate(x, top - .4, z);
        return cap;
      }
      const depth = 8 + radius * .42;
      // A broken CHUNK of moon: blunt underside, planed flat on top. A steep
      // taper turned these into hanging funnels that read as light fittings
      // rather than rock, so the base stays wide and the noise stays loud.
      const geometry = new T.CylinderGeometry(radius, radius * .66, depth, 13, 3);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i);
        const py = positions.getY(i);
        const pz = positions.getZ(i);
        if (py > depth * .42) continue; // keep the top rim crisp and walkable
        const wobble = 1 + valueNoise(px * .26 + x, pz * .26 + z) * .62;
        positions.setX(i, px * wobble);
        positions.setZ(i, pz * wobble);
        positions.setY(i, py - Math.abs(valueNoise(px * .17, pz * .17)) * 5.2);
      }
      geometry.computeVertexNormals();
      geometry.translate(x, top - depth / 2, z);
      return geometry;
    }
    // One job per slab, and the job is legible from the deck you land on.
    buildSkyFurniture(mark) {
      const group = mark.group;
      // Every slab carries a plinth that lights the first time you stand on
      // it. Unlit versus lit is brightness and motion, never colour, and the
      // count of lit plinths across the sky is the whole progress display.
      const plinth = new T.Mesh(
        new T.CylinderGeometry(.8, 1.3, 3.2, 6),
        new T.MeshStandardMaterial({ color: 0x1b1f2b, emissive: 0x2f6ea8, emissiveIntensity: .35, roughness: .4, metalness: .7 }),
      );
      plinth.position.set(mark.x, mark.top + 1.6, mark.z);
      group.add(plinth);
      const flame = new T.Mesh(
        new T.OctahedronGeometry(.85, 0),
        new T.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd66b, emissiveIntensity: .2, roughness: .3, metalness: .2 }),
      );
      flame.position.set(mark.x, mark.top + 4.1, mark.z);
      group.add(flame);
      mark.plinth = plinth;
      mark.flame = flame;

      if (mark.role === 'cache') {
        // A knot of crystal to smash. Pure toy, instant payoff.
        mark.cache = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + mark.index;
          const cx = mark.x + Math.cos(a) * mark.radius * .55;
          const cz = mark.z + Math.sin(a) * mark.radius * .55;
          const shard = new T.Mesh(
            new T.OctahedronGeometry(1.5, 0),
            new T.MeshStandardMaterial({ color: 0x2a4a63, emissive: 0x54d8ff, emissiveIntensity: 1.6, roughness: .25, metalness: .5 }),
          );
          shard.position.set(cx, mark.top + 1.5, cz);
          group.add(shard);
          mark.cache.push({ mesh: shard, x: cx, z: cz, y: mark.top + 1.5, alive: true, radius: 2.2 });
        }
      }
      if (mark.role === 'vent') {
        // A vent that throws you at the tier above.
        const pad = new T.Mesh(
          new T.CylinderGeometry(4.2, 4.6, .5, 20),
          new T.MeshStandardMaterial({ color: 0x2c2618, emissive: 0xffae2b, emissiveIntensity: 1.2, roughness: .5, metalness: .5 }),
        );
        pad.position.set(mark.x, mark.top + .5, mark.z);
        group.add(pad);
        const plume = new T.Mesh(
          new T.CylinderGeometry(3.4, 4.6, 44, 14, 1, true),
          new T.MeshBasicMaterial({ color: 0xfff0c4, transparent: true, opacity: .1, side: T.FrontSide, depthWrite: false, blending: T.AdditiveBlending }),
        );
        plume.position.set(mark.x, mark.top + 22, mark.z);
        group.add(plume);
        mark.vent = { pad, plume, radius: 4.6 };
      }
      if (mark.role === 'anchor') {
        // A pylon you kick and reel yourself to, from any other slab in range.
        const pylon = new T.Mesh(new T.CylinderGeometry(.5, .9, 7, 7), this.materials.black);
        pylon.position.set(mark.x, mark.top + 3.5, mark.z);
        group.add(pylon);
        const eye = new T.Mesh(new T.TorusGeometry(1.9, .3, 10, 28), this.materials.cyan);
        eye.position.set(mark.x, mark.top + 7.4, mark.z);
        group.add(eye);
        const glow = this.makeGlowSprite(this.glowCyan, 9, .5);
        glow.position.copy(eye.position);
        group.add(glow);
        mark.skyAnchor = { eye, glow, position: eye.position.clone(), radius: 4.4 };
      }
      if (mark.role === 'spinner') {
        // A turning arm. Time your landing, or ride it and let it throw you.
        const hub = new T.Mesh(new T.CylinderGeometry(1.1, 1.4, 2.4, 8), this.materials.black);
        hub.position.set(mark.x, mark.top + 1.2, mark.z);
        group.add(hub);
        const arm = new T.Mesh(
          new T.BoxGeometry(mark.radius * 1.7, 1.1, 2.2),
          new T.MeshStandardMaterial({ color: 0x2b2620, emissive: 0xff7a3c, emissiveIntensity: .8, roughness: .5, metalness: .7 }),
        );
        arm.position.set(mark.x, mark.top + 2.4, mark.z);
        group.add(arm);
        mark.spinner = { arm, angle: mark.index, speed: .9 + (mark.index % 3) * .35, reach: mark.radius * .85 };
      }
      if (mark.role === 'crown') {
        // The top of the sky. What is up here is the reason to climb it.
        const ring = new T.Mesh(new T.TorusGeometry(11, .9, 12, 60), this.materials.gold);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(mark.x, mark.top + 7, mark.z);
        group.add(ring);
        const prize = new T.Mesh(
          new T.IcosahedronGeometry(3.2, 1),
          new T.MeshStandardMaterial({ color: 0x0d2a24, emissive: BALL_CORES.kite.color, emissiveIntensity: 2.4, roughness: .2, metalness: .7 }),
        );
        prize.position.set(mark.x, mark.top + 7, mark.z);
        group.add(prize);
        const glow = this.makeGlowSprite(this.glowCyan, 34, .5);
        glow.position.copy(prize.position);
        group.add(glow);
        mark.crown = { ring, prize, glow, taken: false, radius: 6 };
      }
    }
    // ---- LANDMARKS -------------------------------------------------------
    makeLandmarks() {
      this.landmarks = [];
      for (const spec of LANDMARKS) {
        const mark = {
          ...spec,
          y: this.sampleTerrainHeight(spec.x, spec.z),
          group: new T.Group(),
          done: false,
          parts: [],
        };
        mark.group.userData.kbOriginGroup = true;
        mark.position = new T.Vector3(mark.x, mark.y, mark.z);
        this.scene.add(mark.group);
        this[`build${spec.kind[0].toUpperCase()}${spec.kind.slice(1)}`](mark);
        // A completed landmark lights a permanent pillar of its own colour, so
        // the map visibly fills in with everywhere you have already been.
        const flare = this.makeGlowSprite(this.glowGold, 16, 0);
        flare.position.set(mark.x, mark.y + 9, mark.z);
        mark.flare = flare;
        this.scene.add(flare);
        this.landmarks.push(mark);
      }
    }
    buildArch(mark) {
      // A stone arch you fly through. The eye is the reward: hit it carrying
      // speed and it hands you more.
      const stone = new T.MeshStandardMaterial({ color: 0x5b6270, roughness: .92, metalness: .05 });
      const span = 26;
      const arch = new T.Mesh(new T.TorusGeometry(span, 4.2, 12, 40, Math.PI), stone);
      arch.position.set(mark.x, mark.y, mark.z);
      arch.castShadow = true;
      mark.group.add(arch);
      for (const side of [-1, 1]) {
        const leg = new T.Mesh(new T.CylinderGeometry(5.2, 7.4, 10, 10), stone);
        leg.position.set(mark.x + side * span, mark.y - 4, mark.z);
        leg.castShadow = true;
        mark.group.add(leg);
      }
      // The eye is a ring of light hung INSIDE the opening, well clear of the
      // ground, so it reads as a window to aim yourself through. Sized to the
      // arch it sank halfway into the regolith and read as debris.
      const eyeRadius = 11;
      const eyeHeight = mark.y + 13;
      const eye = new T.Mesh(
        new T.TorusGeometry(eyeRadius, .6, 8, 48),
        new T.MeshBasicMaterial({ color: mark.tint, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false }),
      );
      eye.position.set(mark.x, eyeHeight, mark.z);
      mark.group.add(eye);
      mark.eye = eye;
      const halo = this.makeGlowSprite(this.glowCyan, eyeRadius * 2.4, .16);
      halo.position.copy(eye.position);
      mark.group.add(halo);
      mark.gate = { centre: new T.Vector3(mark.x, eyeHeight, mark.z), radius: eyeRadius, thickness: 5 };
      mark.cooldown = 0;
    }
    buildGeysers(mark) {
      // Vents that fire on a stagger. The ground itself becomes a launcher,
      // and the timing is drawn in dust before it matters.
      const rim = new T.MeshStandardMaterial({ color: 0x4a4335, emissive: 0x744c12, emissiveIntensity: .5, roughness: .8, metalness: .3 });
      mark.vents = [];
      for (let i = 0; i < 6; i++) {
        const angle = i * 2.3999632;
        const spread = 12 + i * 6.5;
        const x = mark.x + Math.cos(angle) * spread;
        const z = mark.z + Math.sin(angle) * spread;
        const base = this.sampleTerrainHeight(x, z);
        const cone = new T.Mesh(new T.CylinderGeometry(3.4, 5.6, 3.2, 12, 1, true), rim);
        cone.position.set(x, base + 1.2, z);
        mark.group.add(cone);
        const plume = new T.Mesh(
          new T.CylinderGeometry(2.6, 4.2, 40, 12, 1, true),
          new T.MeshBasicMaterial({ color: 0xfff0c4, transparent: true, opacity: 0, side: T.FrontSide, depthWrite: false, blending: T.AdditiveBlending }),
        );
        plume.position.set(x, base + 20, z);
        mark.group.add(plume);
        mark.vents.push({ x, z, base, plume, phase: i * 1.05, radius: 5.6, fired: false });
      }
      mark.ridden = new Set();
    }
    buildDish(mark) {
      // A parabolic antenna that eats a ball and spits it out at a speed you
      // cannot reach by kicking. It is a toy first and a weapon second.
      const shell = new T.MeshStandardMaterial({ color: 0x1a1e28, roughness: .3, metalness: .9, side: T.DoubleSide });
      const dish = new T.Mesh(new T.SphereGeometry(17, 32, 16, 0, TAU, 0, Math.PI / 2.35), shell);
      dish.rotation.x = Math.PI;
      dish.position.set(mark.x, mark.y + 15, mark.z);
      dish.castShadow = true;
      mark.group.add(dish);
      const mast = new T.Mesh(new T.CylinderGeometry(1.1, 2.4, 16, 8), shell);
      mast.position.set(mark.x, mark.y + 6, mark.z);
      mark.group.add(mast);
      const lip = new T.Mesh(
        new T.TorusGeometry(17, .6, 8, 56),
        new T.MeshBasicMaterial({ color: mark.tint, transparent: true, opacity: .45, blending: T.AdditiveBlending, depthWrite: false }),
      );
      lip.rotation.x = Math.PI / 2;
      lip.position.set(mark.x, mark.y + 15, mark.z);
      mark.group.add(lip);
      mark.lip = lip;
      const feed = new T.Mesh(new T.OctahedronGeometry(1.6, 0), this.materials.gold);
      feed.position.set(mark.x, mark.y + 24, mark.z);
      mark.group.add(feed);
      mark.feed = feed;
      mark.bowl = { centre: new T.Vector3(mark.x, mark.y + 16.5, mark.z), radius: 17 };
      mark.charge = 0;
    }
    buildLodestone(mark) {
      // A floating mass that bends anything passing near it. Throw across its
      // face and the ball curves; hold the line and you swing around it.
      const core = new T.Mesh(
        new T.IcosahedronGeometry(5.6, 2),
        new T.MeshStandardMaterial({ color: 0x0a0710, emissive: 0x6a24d8, emissiveIntensity: 1.1, roughness: .25, metalness: .95 }),
      );
      core.position.set(mark.x, mark.y + 22, mark.z);
      mark.group.add(core);
      mark.core = core;
      mark.rings = [];
      for (let i = 0; i < 3; i++) {
        const ring = new T.Mesh(
          new T.TorusGeometry(9 + i * 3.4, .28, 6, 48),
          new T.MeshBasicMaterial({ color: mark.tint, transparent: true, opacity: .34, blending: T.AdditiveBlending, depthWrite: false }),
        );
        ring.position.copy(core.position);
        ring.rotation.set(i * .8, i * 1.3, i * .5);
        mark.group.add(ring);
        mark.rings.push(ring);
      }
      const glow = this.makeGlowSprite(this.glowViolet, 30, .4);
      glow.position.copy(core.position);
      mark.group.add(glow);
      mark.well = { centre: core.position.clone(), radius: 34, orbit: 11 };
      mark.orbitAngle = null;
      mark.orbitTurns = 0;
    }
    buildGrove(mark) {
      // Rods that ring when struck. The reward is a chain: light every one
      // before the ball comes home.
      mark.rods = [];
      for (let i = 0; i < 12; i++) {
        const angle = i * .72;
        const spread = 8 + i * 2.6;
        const x = mark.x + Math.cos(angle) * spread;
        const z = mark.z + Math.sin(angle) * spread;
        const base = this.sampleTerrainHeight(x, z);
        const height = 9 + (i % 4) * 3.5;
        const material = new T.MeshStandardMaterial({
          color: 0x2b3550, emissive: 0x2f6ea8, emissiveIntensity: .5, roughness: .3, metalness: .85,
        });
        const rod = new T.Mesh(new T.CylinderGeometry(.75, 1.05, height, 8), material);
        rod.position.set(x, base + height / 2, z);
        rod.castShadow = true;
        mark.group.add(rod);
        mark.rods.push({ mesh: rod, material, x, z, base, height, radius: 1.6, lit: 0, index: i });
      }
    }
    buildGarden(mark) {
      // Crystal blooms that set each other off. One good hit should cascade
      // across the whole field, which is the most satisfying thing a static
      // object can possibly do.
      mark.blooms = [];
      for (let i = 0; i < 16; i++) {
        const angle = i * 2.3999632;
        const spread = 6 + Math.sqrt(i / 16) * 26;
        const x = mark.x + Math.cos(angle) * spread;
        const z = mark.z + Math.sin(angle) * spread;
        const base = this.sampleTerrainHeight(x, z);
        const material = new T.MeshStandardMaterial({
          color: 0x5c1c48, emissive: 0xff5fb4, emissiveIntensity: 1.5, roughness: .3, metalness: .3,
        });
        const bloom = new T.Group();
        for (let petal = 0; petal < 5; petal++) {
          const blade = new T.Mesh(new T.ConeGeometry(.62, 3.4, 4), material);
          const pa = (petal / 5) * TAU;
          blade.position.set(Math.cos(pa) * .8, 1.5, Math.sin(pa) * .8);
          blade.rotation.set(Math.sin(pa) * .5, -pa, -Math.cos(pa) * .5);
          bloom.add(blade);
        }
        bloom.position.set(x, base, z);
        mark.group.add(bloom);
        mark.blooms.push({ group: bloom, material, x, z, base, radius: 3, open: false, fuse: 0, index: i, neighbours: [] });
      }
      // Wire each bloom to its four nearest siblings instead of using a fixed
      // radius. A radius has to be re-tuned every time the field's shape
      // changes, and when it is even slightly too small the outer blooms
      // silently orphan themselves and the cascade can never finish — which
      // is exactly the "looks like it should do something" failure this whole
      // pass exists to eliminate.
      for (const bloom of mark.blooms) {
        bloom.neighbours = mark.blooms
          .filter(other => other !== bloom)
          .sort((a, b) => Math.hypot(a.x - bloom.x, a.z - bloom.z) - Math.hypot(b.x - bloom.x, b.z - bloom.z))
          .slice(0, 4);
      }
      mark.chain = 0;
    }
    // ---- REGIONS ---------------------------------------------------------
    // Three destinations, each built from its own geometry and its own idea.
    // None of this is shared scatter: a forest of ringing glass, a sinkhole
    // you descend, and a ring of derelict machinery that still turns.
    makeRegions() {
      this.regions = [];
      for (const spec of REGIONS) {
        const region = {
          ...spec,
          position: new T.Vector3(spec.x, this.sampleTerrainHeight(spec.x, spec.z), spec.z),
          group: new T.Group(),
          pillars: [],
          movers: [],
          boss: null,
          spawns: [],
        };
        region.group.userData.kbOriginGroup = true;
        this.scene.add(region.group);
        if (spec.id === 'glassworks') this.buildGlassworks(region);
        else if (spec.id === 'hollow') this.buildHollow(region);
        else if (spec.id === 'orrery') this.buildOrrery(region);
        this.regions.push(region);
      }
    }
    // Solid geometry belonging to a region is only consulted when the query is
    // inside that region's footprint. Everywhere else on the moon it costs one
    // distance test instead of thirty.
    regionSolids(x, z) {
      const regions = this.regions;
      if (!regions) return EMPTY_SOLIDS;
      for (const region of regions) {
        if (!region.pillars.length) continue;
        if (Math.hypot(x - region.x, z - region.z) > region.radius * 1.34) continue;
        return region.pillars;
      }
      return EMPTY_SOLIDS;
    }
    buildGlassworks(region) {
      // Everything here is one material so the whole shelf reads as a single
      // substance: cold, lit from within, and obviously hard.
      const glass = new T.MeshPhysicalMaterial({
        color: 0x8fe9ff, emissive: 0x1d7ba6, emissiveIntensity: 1.15,
        metalness: .08, roughness: .06, transmission: .5, thickness: 2.6,
        transparent: true, opacity: .76, clearcoat: 1, clearcoatRoughness: .04,
      });
      region.material = glass;
      const count = this.quality === 'LOW' ? 20 : 32;
      for (let i = 0; i < count; i++) {
        // Golden-angle placement: dense at the middle, thinning outward, and
        // never in rows. A grid would read as level geometry; this reads grown.
        const angle = i * 2.3999632;
        const spread = 19 + Math.sqrt((i + .5) / count) * 68;
        const x = region.x + Math.cos(angle) * spread;
        const z = region.z + Math.sin(angle) * spread;
        const base = this.sampleTerrainHeight(x, z);
        // Three builds of spire — needle, column, and blade — so the forest
        // has a skyline instead of thirty copies of one cone.
        const build = i % 3;
        const tall = i % 5 === 0;
        const height = (build === 1 ? 30 : 22) + valueNoise(x * .06, z * .06) * 18 + (tall ? 26 : 0);
        const radius = (build === 2 ? 2.4 : 1.7) + height * .052;
        const taper = build === 0 ? .12 : build === 1 ? .62 : .34;
        const spire = new T.Mesh(new T.CylinderGeometry(radius * taper, radius, height, build === 2 ? 4 : 6, 1), glass);
        spire.position.set(x, base + height / 2 - 1.4, z);
        spire.rotation.y = angle;
        spire.rotation.z = (valueNoise(x * .19, z * .19) - .5) * .24;
        spire.castShadow = true;
        region.group.add(spire);
        region.pillars.push({
          id: `spire-${i}`, x, z, radius: radius * .86, top: base + height - 1.4, bounce: 2.35,
        });
        const cap = this.makeGlowSprite(this.glowCyan, radius * 4.2, .34);
        cap.position.set(x, base + height - 1.6, z);
        region.group.add(cap);
      }
      // Mirror pools: flat, still, and bright enough to make the floor read as
      // silica rather than more regolith.
      for (let i = 0; i < 5; i++) {
        const angle = i * 1.9 + .6;
        const spread = 26 + i * 11;
        const x = region.x + Math.cos(angle) * spread;
        const z = region.z + Math.sin(angle) * spread;
        const pool = new T.Mesh(
          new T.CircleGeometry(6 + i * 1.7, 30),
          new T.MeshPhysicalMaterial({
            color: 0x2a7f9c, emissive: 0x0d4e6b, emissiveIntensity: .9,
            metalness: .95, roughness: .04, transparent: true, opacity: .68,
          }),
        );
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(x, this.sampleTerrainHeight(x, z) + .06, z);
        region.group.add(pool);
      }
      region.spawns = [
        { type: 'shardling', x: region.x - 34, z: region.z + 22 },
        { type: 'shardling', x: region.x + 29, z: region.z - 18 },
        { type: 'shardling', x: region.x + 8, z: region.z + 41 },
        { type: 'shardling', x: region.x - 46, z: region.z - 30 },
        { type: 'shardling', x: region.x + 44, z: region.z + 34 },
      ];
      region.boss = this.buildChandelier(region);
    }
    // THE CHANDELIER: a glass heart hung in the middle of the spire forest,
    // shielded by plates that always turn to face the player. A straight kick
    // is refused by design; the only way in is a ricochet off a spire, which
    // is exactly the skill the region exists to teach.
    buildChandelier(region) {
      const group = new T.Group();
      const height = this.sampleTerrainHeight(region.x, region.z) + 26;
      group.position.set(region.x, height, region.z);
      const heart = new T.Mesh(
        new T.IcosahedronGeometry(3.4, 1),
        new T.MeshPhysicalMaterial({
          color: 0xd8fbff, emissive: 0x2fb6e0, emissiveIntensity: 2.6,
          metalness: .2, roughness: .08, transmission: .35, transparent: true, opacity: .9,
        }),
      );
      group.add(heart);
      const glow = this.makeGlowSprite(this.glowCyan, 22, .5);
      group.add(glow);
      const plates = [];
      for (let i = 0; i < 5; i++) {
        const plate = new T.Mesh(new T.BoxGeometry(4.4, 6.2, .5), region.material);
        plate.castShadow = true;
        group.add(plate);
        plates.push({ mesh: plate, phase: (i / 5) * TAU });
      }
      // A slow ring of light on the ground says "the thing up there is the
      // reason you came" without a marker or a line of text.
      const halo = new T.Mesh(
        new T.RingGeometry(9, 11.5, 48),
        new T.MeshBasicMaterial({ color: 0x8fe9ff, transparent: true, opacity: .2, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }),
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(region.x, this.sampleTerrainHeight(region.x, region.z) + .3, region.z);
      region.group.add(halo);
      region.group.add(group);
      return {
        id: 'chandelier', region: region.id, group, heart, plates, halo, glow,
        position: group.position.clone(), radius: 3.9, maxHp: 5, hp: 5,
        alive: true, spin: 0, exposed: 0,
      };
    }
    buildHollow(region) {
      // Light has to come from inside a hole. Bioluminescent stalks climb the
      // terraces, so the descent is lit by the thing that lives down there.
      // Restrained emissive: at full strength these blew out to flat white and
      // read as painted plastic instead of something glowing in the dark.
      const stalkMaterial = new T.MeshStandardMaterial({
        color: 0x2d1350, emissive: 0x7d2fd6, emissiveIntensity: .95, roughness: .55, metalness: .18,
      });
      region.material = stalkMaterial;
      const count = this.quality === 'LOW' ? 26 : 44;
      for (let i = 0; i < count; i++) {
        const angle = i * 2.3999632;
        const spread = 22 + ((i * 37) % 68);
        const x = region.x + Math.cos(angle) * spread;
        const z = region.z + Math.sin(angle) * spread;
        const base = this.sampleTerrainHeight(x, z);
        // Tall enough to be architecture. At stick-scale they read as litter;
        // at this size the hole is lit by something clearly growing in it.
        const height = 7 + valueNoise(x * .12, z * .12) * 11;
        const thickness = .5 + height * .045;
        const stalk = new T.Mesh(new T.CapsuleGeometry(thickness, height, 5, 10), stalkMaterial);
        stalk.position.set(x, base + height * .6, z);
        stalk.rotation.z = (valueNoise(x * .3, z * .3) - .5) * .55;
        stalk.rotation.x = (valueNoise(x * .27 + 5, z * .27) - .5) * .4;
        stalk.castShadow = true;
        region.group.add(stalk);
        const cap = new T.Mesh(
          new T.SphereGeometry(thickness * 2.1, 12, 8),
          new T.MeshStandardMaterial({ color: 0x3d1a70, emissive: 0xb463ff, emissiveIntensity: 1.9, roughness: .4, metalness: .1 }),
        );
        cap.position.set(x, base + height + thickness, z);
        cap.scale.y = .72;
        region.group.add(cap);
        const bulb = this.makeGlowSprite(this.glowViolet, 6.8, .4);
        bulb.position.copy(cap.position);
        region.group.add(bulb);
      }
      // Updraft columns: the way back out, and visible from the floor so the
      // descent never feels like a trap.
      region.updrafts = [];
      for (let i = 0; i < 3; i++) {
        const angle = i * (TAU / 3) + .4;
        const x = region.x + Math.cos(angle) * 44;
        const z = region.z + Math.sin(angle) * 44;
        const column = new T.Mesh(
          new T.CylinderGeometry(5.2, 6.4, 62, 20, 1, true),
          new T.MeshBasicMaterial({
            color: 0xc79bff, transparent: true, opacity: .12, side: T.FrontSide,
            depthWrite: false, blending: T.AdditiveBlending,
          }),
        );
        const floor = this.sampleTerrainHeight(x, z);
        column.position.set(x, floor + 31, z);
        region.group.add(column);
        region.updrafts.push({ x, z, radius: 6.4, base: floor, top: floor + 62, force: 33, mesh: column });
      }
      region.spawns = [
        { type: 'clinger', x: region.x - 52, z: region.z + 12 },
        { type: 'clinger', x: region.x + 47, z: region.z - 26 },
        { type: 'clinger', x: region.x - 20, z: region.z - 55 },
        { type: 'clinger', x: region.x + 24, z: region.z + 52 },
        { type: 'clinger', x: region.x - 8, z: region.z + 18 },
        { type: 'clinger', x: region.x + 12, z: region.z - 12 },
      ];
      region.boss = this.buildWellheart(region);
    }
    // THE WELLHEART: it sits at the bottom, armoured, and only opens to
    // breathe. Hit the open sac. Everything about the fight is timing, which
    // is what a hole with one floor and no cover should be about.
    buildWellheart(region) {
      const group = new T.Group();
      const floor = this.sampleTerrainHeight(region.x, region.z);
      group.position.set(region.x, floor + 3.4, region.z);
      const shell = new T.Mesh(
        new T.SphereGeometry(5.2, 24, 18),
        new T.MeshStandardMaterial({ color: 0x1a1030, emissive: 0x2a1050, emissiveIntensity: .5, roughness: .62, metalness: .35 }),
      );
      shell.castShadow = true;
      group.add(shell);
      const sac = new T.Mesh(
        new T.SphereGeometry(3.1, 20, 14),
        new T.MeshStandardMaterial({ color: 0xff6bd0, emissive: 0xff3ea8, emissiveIntensity: 3.2, roughness: .3, metalness: .1 }),
      );
      group.add(sac);
      const petals = [];
      for (let i = 0; i < 6; i++) {
        const petal = new T.Mesh(
          new T.ConeGeometry(1.9, 6.4, 5),
          new T.MeshStandardMaterial({ color: 0x241442, emissive: 0x51219c, emissiveIntensity: .8, roughness: .5, metalness: .4 }),
        );
        petal.castShadow = true;
        group.add(petal);
        petals.push({ mesh: petal, phase: (i / 6) * TAU });
      }
      const glow = this.makeGlowSprite(this.glowViolet, 26, .38);
      group.add(glow);
      region.group.add(group);
      return {
        id: 'wellheart', region: region.id, group, shell, sac, petals, glow,
        position: group.position.clone(), radius: 5.4, maxHp: 6, hp: 6,
        alive: true, spin: 0, exposed: 0, cycle: 0,
      };
    }
    buildOrrery(region) {
      // Machinery, not geology: gold and black, still turning after whoever
      // built it stopped. The rings are the landmark AND the staircase.
      // Near-black, hard, and only lit along its own gold seams. A warmer base
      // colour turned the whole structure terracotta and read as pottery
      // instead of the machinery it is supposed to be.
      const stone = new T.MeshStandardMaterial({
        color: 0x0d0c10, roughness: .34, metalness: .96,
      });
      const seam = new T.MeshStandardMaterial({
        color: 0xffca62, emissive: 0xffa41f, emissiveIntensity: 2.6, roughness: .28, metalness: .7,
      });
      region.material = stone;
      region.seam = seam;
      const centre = this.sampleTerrainHeight(region.x, region.z);
      region.rings = [];
      for (let i = 0; i < 3; i++) {
        const radius = 26 + i * 17;
        const ring = new T.Mesh(new T.TorusGeometry(radius, 1.9 - i * .28, 10, 64), stone);
        ring.position.set(region.x, centre + 12 + i * 9, region.z);
        ring.rotation.x = Math.PI / 2 + (i - 1) * .42;
        ring.rotation.z = i * .5;
        ring.castShadow = true;
        // The gold seam has to ride the OUTER equator of the ring. Sharing the
        // ring's major radius buries it inside the tube where it lights
        // nothing, which is how the whole structure first read as dead stone.
        const tube = 1.9 - i * .28;
        const track = new T.Mesh(new T.TorusGeometry(radius + tube * .78, tube * .3, 6, 72), seam);
        ring.add(track);
        region.group.add(ring);
        region.rings.push({ mesh: ring, speed: .12 - i * .028, radius });
      }
      // Orbiting platforms are the region's traversal: real moving ground that
      // carries the player up through the rings.
      for (let i = 0; i < 6; i++) {
        const tier = i % 3;
        const orbit = 26 + tier * 17;
        const plate = new T.Mesh(new T.CylinderGeometry(4.4, 5, 1.1, 8), stone);
        plate.castShadow = true;
        plate.receiveShadow = true;
        region.group.add(plate);
        const lamp = new T.Mesh(new T.OctahedronGeometry(.62, 0), this.materials.gold);
        lamp.position.y = 1.5;
        plate.add(lamp);
        region.movers.push({
          mesh: plate, orbit, tier,
          angle: (i / 6) * TAU, speed: .28 - tier * .06,
          height: centre + 9 + tier * 9, radius: 4.6,
        });
      }
      // Half-buried monoliths break the silhouette so the pan is not a bowl.
      for (let i = 0; i < 9; i++) {
        const angle = i * 2.3999632 + 1.1;
        const spread = 52 + ((i * 23) % 26);
        const x = region.x + Math.cos(angle) * spread;
        const z = region.z + Math.sin(angle) * spread;
        const base = this.sampleTerrainHeight(x, z);
        const height = 7 + valueNoise(x * .1, z * .1) * 9;
        const slab = new T.Mesh(new T.BoxGeometry(3.4, height, 1.5), stone);
        slab.position.set(x, base + height * .38, z);
        slab.rotation.y = angle;
        slab.rotation.z = (valueNoise(x * .4, z * .4) - .5) * .38;
        slab.castShadow = true;
        region.group.add(slab);
        region.pillars.push({ id: `monolith-${i}`, x, z, radius: 2, top: base + height * .88, bounce: 1.6 });
      }
      region.spawns = [
        { type: 'watcher', x: region.x - 30, z: region.z + 26 },
        { type: 'watcher', x: region.x + 33, z: region.z - 20 },
        { type: 'watcher', x: region.x + 4, z: region.z - 44 },
        { type: 'brute', x: region.x - 44, z: region.z - 40 },
      ];
      region.boss = this.buildGreatWheel(region);
    }
    // THE GREAT WHEEL: four hubs riding the rings. Break one and the rest
    // speed up, so the fight is a rhythm that keeps tightening — and the
    // whole thing is airborne, which forces the player onto the platforms.
    buildGreatWheel(region) {
      const group = new T.Group();
      const centre = this.sampleTerrainHeight(region.x, region.z);
      group.position.set(region.x, centre + 30, region.z);
      const hub = new T.Mesh(
        new T.IcosahedronGeometry(4.2, 1),
        new T.MeshStandardMaterial({ color: 0x141009, emissive: 0xffae2b, emissiveIntensity: 1.4, roughness: .4, metalness: .8 }),
      );
      group.add(hub);
      const glow = this.makeGlowSprite(this.glowGold, 24, .45);
      group.add(glow);
      const nodes = [];
      for (let i = 0; i < 4; i++) {
        const node = new T.Mesh(new T.OctahedronGeometry(1.9, 0), this.materials.gold.clone());
        group.add(node);
        nodes.push({ mesh: node, phase: (i / 4) * TAU, alive: true, orbit: 13 + (i % 2) * 5 });
      }
      region.group.add(group);
      return {
        id: 'greatwheel', region: region.id, group, hub, nodes, glow,
        position: group.position.clone(), radius: 4.6, maxHp: 4, hp: 4,
        alive: true, spin: 0, exposed: 1,
      };
    }
    makeBallVisual() {
      this.ballGroup = new T.Group();
      this.ballGroup.userData.kbLifted = true;
      const shell = new T.Mesh(
        new T.SphereGeometry(.72, 32, 24),
        new T.MeshPhysicalMaterial({
          color: 0xb8f8ff, emissive: 0x1596bb, emissiveIntensity: 2.25,
          metalness: .35, roughness: .12, clearcoat: 1, clearcoatRoughness: .08,
          transparent: true, opacity: .94,
        }),
      );
      shell.castShadow = true;
      shell.receiveShadow = true;
      this.ballGroup.add(shell);
      const core = new T.Mesh(new T.IcosahedronGeometry(.42, 2), this.materials.violet);
      this.ballGroup.add(core);
      const ringA = new T.Mesh(new T.TorusGeometry(.82, .065, 10, 48), this.materials.gold);
      const ringB = new T.Mesh(new T.TorusGeometry(.82, .045, 10, 48), this.materials.cyan);
      ringA.rotation.x = Math.PI / 2;
      ringB.rotation.y = Math.PI / 2;
      this.ballGroup.add(ringA, ringB);
      this.ballGlow = this.makeGlowSprite(this.glowCyan, 4.5, .48);
      this.ballGroup.add(this.ballGlow);
      // Earned cores orbit the ball forever after. Progress is a thing the
      // player watches spinning in front of them, not a number on a panel.
      const coreShards = {};
      for (const [id, spec] of Object.entries(BALL_CORES)) {
        const shard = new T.Mesh(
          new T.OctahedronGeometry(.3, 0),
          new T.MeshStandardMaterial({
            color: spec.color, emissive: spec.color, emissiveIntensity: 1.4,
            roughness: .2, metalness: .6,
          }),
        );
        shard.add(this.makeGlowSprite(this.glowGold, 1.1, .22));
        shard.visible = false;
        this.ballGroup.add(shard);
        coreShards[id] = shard;
      }
      // Collected moondrops ride with the ball. Six is the visible cap; past
      // that the halo keeps growing, so the ball reads as "loaded" without
      // turning into a swarm you cannot see the ball through.
      const dropMotes = [];
      for (let i = 0; i < 6; i++) {
        const mote = new T.Mesh(
          new T.OctahedronGeometry(.17, 0),
          new T.MeshStandardMaterial({ color: 0xd8f6ff, emissive: 0x76e8ff, emissiveIntensity: 4.2, roughness: .2, metalness: .5 }),
        );
        mote.visible = false;
        this.ballGroup.add(mote);
        dropMotes.push(mote);
      }
      this.ballGroup.position.set(1, 2, 110);
      this.ballDisplayScale = .46;
      this.ballGroup.scale.setScalar(this.ballDisplayScale);
      this.scene.add(this.ballGroup);
      this.ballVisual = { shell, core, ringA, ringB, coreShards, dropMotes };
      const trailGeometry = new T.BufferGeometry();
      this.trailPositions = new Float32Array(64 * 3);
      trailGeometry.setAttribute('position', new T.BufferAttribute(this.trailPositions, 3).setUsage(T.DynamicDrawUsage));
      trailGeometry.setDrawRange(0, 0);
      this.ballTrail = new T.Line(
        trailGeometry,
        new T.LineBasicMaterial({ color: 0x62edff, transparent: true, opacity: .74, depthWrite: false, blending: T.AdditiveBlending }),
      );
      this.ballTrail.frustumCulled = false;
      this.scene.add(this.ballTrail);
      const tetherGeometry = new T.BufferGeometry();
      this.tetherPositions = new Float32Array(32 * 3);
      tetherGeometry.setAttribute('position', new T.BufferAttribute(this.tetherPositions, 3).setUsage(T.DynamicDrawUsage));
      tetherGeometry.setDrawRange(0, 0);
      this.ballTether = new T.Line(
        tetherGeometry,
        new T.LineBasicMaterial({ color: 0x72efff, transparent: true, opacity: .9, depthWrite: false, blending: T.AdditiveBlending }),
      );
      this.ballTether.visible = false;
      this.ballTether.frustumCulled = false;
      this.ballTetherNodes = new T.Points(
        tetherGeometry,
        new T.PointsMaterial({ color: 0x9af5ff, size: .19, sizeAttenuation: true, transparent: true, opacity: .82, depthWrite: false, blending: T.AdditiveBlending }),
      );
      this.ballTetherNodes.visible = false;
      this.ballTetherNodes.frustumCulled = false;
      this.scene.add(this.ballTether, this.ballTetherNodes);
    }
    makeAlienMesh(type = 'scuttler') {
      const group = new T.Group();
      const scale = type === 'warden' ? 1.75 : type === 'brute' ? 1.46 : type === 'drifter' ? 1.42
        : type === 'shield' ? 1.28 : type === 'floater' ? .96 : type === 'skater' ? .92 : 1;
      if (!this.materials.frost) {
        this.materials.frost = new T.MeshPhysicalMaterial({
          color: 0xbfe6ff, emissive: 0x2a6f9e, emissiveIntensity: .9,
          metalness: .1, roughness: .12, clearcoat: 1, clearcoatRoughness: .08,
        });
        this.materials.snowHide = new T.MeshStandardMaterial({
          color: 0xe9edf6, emissive: 0x5a6c8a, emissiveIntensity: .35,
          roughness: .95, metalness: .02,
        });
      }
      if (type === 'snowman') {
        // Three stacked snowballs, coal eyes, a carrot, stick arms. It lobs
        // real snowballs and pops a segment per hit. Pure snow-country joy.
        const group = new T.Group();
        const balls = [];
        const sizes = [1.15, .82, .55];
        let stackY = 0;
        for (let i = 0; i < 3; i++) {
          stackY += (i === 0 ? sizes[0] * .8 : sizes[i - 1] * .62 + sizes[i] * .62);
          const ballMesh = new T.Mesh(new T.IcosahedronGeometry(sizes[i], 2), this.materials.snowHide);
          ballMesh.position.y = stackY;
          ballMesh.castShadow = true;
          group.add(ballMesh);
          balls.push(ballMesh);
        }
        const headY = balls[2].position.y;
        const eye = new T.Mesh(new T.SphereGeometry(.09, 8, 6), new T.MeshStandardMaterial({ color: 0x10131a, roughness: .4 }));
        eye.position.set(-.18, headY + .12, -.48);
        group.add(eye);
        const eye2 = eye.clone();
        eye2.position.x = .18;
        group.add(eye2);
        const carrot = new T.Mesh(new T.ConeGeometry(.11, .62, 7), new T.MeshStandardMaterial({ color: 0xe8842e, roughness: .7 }));
        carrot.rotation.x = -Math.PI / 2;
        carrot.position.set(0, headY - .04, -.75);
        group.add(carrot);
        for (const side of [-1, 1]) {
          const arm = new T.Mesh(new T.CapsuleGeometry(.05, 1.1, 3, 6), new T.MeshStandardMaterial({ color: 0x4a3421, roughness: .95 }));
          arm.rotation.z = side * 1.25;
          arm.position.set(side * 1.05, balls[1].position.y + .25, 0);
          group.add(arm);
        }
        const weak = new T.Mesh(new T.OctahedronGeometry(.22, 0), this.materials.gold.clone());
        weak.visible = false;
        group.add(weak);
        group.userData.snowballs = balls;
        group.userData.headBits = [eye, eye2, carrot];
        return { group, abdomen: balls[0], head: balls[2], eye, weak, legs: [], shield: null, scale: 1.2 };
      }
      if (type === 'phantom') {
        // A dead astronaut, walking. White suit, black visor, a red light
        // still breathing on the chest. The mirror of the player, and harder
        // than anything else that walks.
        if (!this.materials.suit) {
          this.materials.suit = new T.MeshStandardMaterial({ color: 0xd8dde6, roughness: .6, metalness: .08 });
          this.materials.visor = new T.MeshPhysicalMaterial({
            color: 0x05070c, roughness: .08, metalness: .4, clearcoat: 1, emissive: 0x101822, emissiveIntensity: .4,
          });
        }
        const group = new T.Group();
        const torso = new T.Mesh(new T.CapsuleGeometry(.52, 1, 6, 12), this.materials.suit);
        torso.position.y = 1.35;
        torso.castShadow = true;
        group.add(torso);
        const helmet = new T.Mesh(new T.SphereGeometry(.42, 16, 12), this.materials.suit);
        helmet.position.y = 2.35;
        group.add(helmet);
        const eye = new T.Mesh(new T.SphereGeometry(.3, 14, 10), this.materials.visor);
        eye.position.set(0, 2.37, -.2);
        eye.scale.set(1, .8, .82);
        group.add(eye);
        const pack = new T.Mesh(new T.BoxGeometry(.7, .95, .4), this.materials.suit);
        pack.position.set(0, 1.55, .58);
        group.add(pack);
        const heart = new T.Mesh(
          new T.SphereGeometry(.1, 8, 6),
          new T.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff2222, emissiveIntensity: 3 }),
        );
        heart.position.set(.2, 1.7, -.5);
        group.add(heart);
        for (const side of [-1, 1]) {
          const leg = new T.Mesh(new T.CapsuleGeometry(.17, .72, 4, 8), this.materials.suit);
          leg.position.set(side * .26, .5, 0);
          group.add(leg);
          const arm = new T.Mesh(new T.CapsuleGeometry(.13, .78, 4, 8), this.materials.suit);
          arm.position.set(side * .68, 1.5, 0);
          arm.rotation.z = side * .22;
          group.add(arm);
        }
        const weak = new T.Mesh(new T.OctahedronGeometry(.24, 0), this.materials.gold.clone());
        weak.position.set(0, 1.62, .84);
        weak.visible = true;
        group.add(weak);
        const glow = this.makeGlowSprite(this.glowViolet, 3.4, .1);
        glow.position.y = 1.4;
        group.add(glow);
        return { group, abdomen: torso, head: helmet, eye, weak, legs: [], shield: null, scale: 1.15 };
      }
      const abdomenMaterial = type === 'warden' || type === 'floater' ? this.materials.violet
        : type === 'brute' ? this.materials.alienShell
          : type === 'skater' ? this.materials.frost
            : type === 'drifter' ? this.materials.snowHide : this.materials.alien;
      const abdomen = new T.Mesh(new T.IcosahedronGeometry(.84 * scale, 1), abdomenMaterial);
      abdomen.scale.set(1.05, .8, 1.25);
      abdomen.position.y = 1.2 * scale;
      abdomen.castShadow = true;
      group.add(abdomen);
      const shellParts = [];
      const headGeometry = new T.DodecahedronGeometry(.5 * scale, 1);
      headGeometry.scale(1.1, .8, .92);
      headGeometry.translate(0, 1.55 * scale, -.72 * scale);
      shellParts.push(headGeometry);
      const eye = new T.Mesh(new T.SphereGeometry(.18 * scale, 12, 8), this.materials.cyan);
      eye.position.set(0, 1.62 * scale, -1.13 * scale);
      group.add(eye);
      // The weak core sits on the BACK (local +z is away from `facing`) and
      // owns its material so a single enemy can flare it after blocking a
      // hit. That flare is how the game teaches "go around" without a toast.
      const weak = new T.Mesh(new T.OctahedronGeometry(.24 * scale, 0), this.materials.gold.clone());
      weak.position.set(0, 1.22 * scale, .98 * scale);
      weak.visible = type === 'shield' || type === 'warden' || type === 'brute';
      group.add(weak);
      const legCount = type === 'floater' ? 3 : type === 'brute' ? 8 : 6;
      for (let i = 0; i < legCount; i++) {
        const side = i < legCount / 2 ? -1 : 1;
        const local = i % Math.ceil(legCount / 2);
        const legGeometry = new T.CapsuleGeometry(.08 * scale, .8 * scale, 4, 7);
        legGeometry.rotateX((local - 1) * .32);
        legGeometry.rotateZ(side * (.72 + local * .1));
        legGeometry.translate(side * (.65 + local * .12) * scale, .55 * scale, (local - 1) * .55 * scale);
        shellParts.push(legGeometry);
      }
      const shell = new T.Mesh(mergeStaticGeometries(shellParts), this.materials.alienShell);
      shell.castShadow = true;
      group.add(shell);
      let shield = null;
      if (type === 'shield' || type === 'warden') {
        shield = new T.Mesh(
          new T.CylinderGeometry((type === 'warden' ? 1.65 : 1.2) * scale, (type === 'warden' ? 1.65 : 1.2) * scale, .2, 32),
          new T.MeshPhysicalMaterial({ color: 0x748dff, emissive: 0x2638ad, emissiveIntensity: 2.1, roughness: .18, metalness: .72, transparent: true, opacity: .86 }),
        );
        shield.rotation.x = Math.PI / 2;
        shield.position.set(0, 1.3 * scale, -1.25 * scale);
        group.add(shield);
      }
      if (type === 'floater') {
        const halo = new T.Mesh(new T.TorusGeometry(1.18, .12, 10, 42), this.materials.cyan);
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 1.2;
        group.add(halo);
        const lowerCore = new T.Mesh(new T.OctahedronGeometry(.34, 0), this.materials.gold);
        lowerCore.position.y = .05;
        group.add(lowerCore);
      }
      if (type === 'brute') {
        for (const side of [-1, 1]) {
          const horn = new T.Mesh(new T.ConeGeometry(.24, 1.2, 8), this.materials.gold);
          horn.position.set(side * .72, 2.15, -.62);
          horn.rotation.z = side * -.58;
          group.add(horn);
        }
      }
      // Region species read as their own material before they read as enemies,
      // so a silhouette on the horizon tells you which place you are looking at.
      if (type === 'shardling') {
        // Mirror-plated: it survives a lazy ball and shatters from a fast one,
        // which is the same "hit it hard" law the moonrocks already taught.
        for (let i = 0; i < 5; i++) {
          const plate = new T.Mesh(
            new T.TetrahedronGeometry(.72, 0),
            new T.MeshPhysicalMaterial({
              color: 0xdcfbff, emissive: 0x2aa7cf, emissiveIntensity: 1.5,
              metalness: .95, roughness: .04, transparent: true, opacity: .88,
            }),
          );
          const angle = (i / 5) * TAU;
          plate.position.set(Math.cos(angle) * 1.05, 1.15 + Math.sin(angle * 2) * .3, Math.sin(angle) * 1.05);
          plate.rotation.set(angle, angle * 1.7, angle * .6);
          group.add(plate);
        }
      }
      if (type === 'clinger') {
        const sacMaterial = new T.MeshStandardMaterial({
          color: 0x35135c, emissive: 0xb659ff, emissiveIntensity: 1.9, roughness: .48, metalness: .2,
        });
        const sac = new T.Mesh(new T.SphereGeometry(.92, 16, 12), sacMaterial);
        sac.position.y = 1.25;
        group.add(sac);
        for (let i = 0; i < 4; i++) {
          const hook = new T.Mesh(new T.ConeGeometry(.16, 1.1, 5), sacMaterial);
          const angle = (i / 4) * TAU + .4;
          hook.position.set(Math.cos(angle) * .8, 1.9, Math.sin(angle) * .8);
          hook.rotation.z = Math.cos(angle) * .7;
          hook.rotation.x = -Math.sin(angle) * .7;
          group.add(hook);
        }
      }
      if (type === 'watcher') {
        const iris = new T.Mesh(
          new T.SphereGeometry(1.05, 20, 14),
          new T.MeshStandardMaterial({ color: 0x120d06, emissive: 0xffb340, emissiveIntensity: 2.2, roughness: .3, metalness: .7 }),
        );
        iris.position.y = 1.7;
        group.add(iris);
        const halo = new T.Mesh(new T.TorusGeometry(1.6, .1, 8, 40), this.materials.gold);
        halo.position.y = 1.7;
        halo.rotation.x = Math.PI / 2.4;
        group.add(halo);
      }
      const glow = this.makeGlowSprite(
        type === 'warden' ? this.glowViolet : type === 'watcher' ? this.glowGold
          : type === 'clinger' ? this.glowViolet : this.glowCyan,
        3.8 * scale, .13,
      );
      glow.position.y = 1.15 * scale;
      group.add(glow);
      return { group, abdomen, head: shell, eye, weak, legs: [], shield, scale };
    }
    floorHeight(x, z, currentY = Infinity) {
      let floor = this.sampleTerrainHeight(x, z);
      for (const platform of this.platforms) {
        const distance = Math.hypot(x - platform.x, z - platform.z);
        if (distance < platform.radius * .82 && currentY >= platform.top - 2.4) floor = Math.max(floor, platform.top);
      }
      for (const solid of this.regionSolids(x, z)) {
        const distance = Math.hypot(x - solid.x, z - solid.z);
        if (distance < solid.radius * .82 && currentY >= solid.top - 2.4) floor = Math.max(floor, solid.top);
      }
      // Orbiting plates in THE ORRERY are real ground: you ride them upward.
      // mover.at is the plate's chart-space pose (the mesh is its lifted
      // image); before the first update tick the mesh position IS chart.
      for (const mover of this.movingPlatforms(x, z)) {
        const at = mover.at || mover.mesh.position;
        if (currentY < at.y - 1.6) continue;
        if (Math.hypot(x - at.x, z - at.z) >= mover.radius) continue;
        floor = Math.max(floor, at.y + .55);
      }
      // Sky slabs catch from above and pass through from below, so kicking the
      // ball down under yourself still throws you up through the whole stack.
      for (const slab of this.sky || EMPTY_SOLIDS) {
        if (currentY < slab.top - 1.5) continue;
        if (Math.hypot(x - slab.x, z - slab.z) >= slab.radius) continue;
        floor = Math.max(floor, slab.top);
      }
      return floor;
    }
    movingPlatforms(x, z) {
      const regions = this.regions;
      if (!regions) return EMPTY_SOLIDS;
      for (const region of regions) {
        if (!region.movers.length) continue;
        if (Math.hypot(x - region.x, z - region.z) > region.radius * 1.34) continue;
        return region.movers;
      }
      return EMPTY_SOLIDS;
    }
    insideBlocker(x, y, z, radius = .6, fromX = null, fromZ = null) {
      if (this.gate.active && Math.abs(z - this.gate.position.z) < 1 + radius && Math.abs(x) < this.gate.width / 2 + radius && Math.abs(y - this.gate.position.y) < this.gate.height / 2 + radius) return true;
      if (this.fracture.active && Math.abs(z - this.fracture.position.z) < 2.1 + radius && Math.abs(x) < this.fracture.width / 2 + radius && Math.abs(y - this.fracture.position.y) < this.fracture.height / 2 + radius) return true;
      // Two explicit loops rather than a merged array: this runs for the
      // player and the ball on every fixed step, and the concatenation would
      // allocate 120 throwaway arrays a second for nothing.
      if (this.blockedByColumns(this.platforms, x, y, z, radius, fromX, fromZ)) return true;
      if (this.blockedByColumns(this.regionSolids(x, z), x, y, z, radius, fromX, fromZ)) return true;
      // Sky slabs are SOLID: their sides and undersides push back. The band
      // test keeps the ground beneath them walkable; the escape clause works
      // like the columns' so a recovery inside the shell can still walk out.
      for (const slab of this.sky || EMPTY_SOLIDS) {
        const bottom = slab.top - (slab.body ?? (8 + slab.radius * .42));
        if (y <= bottom - .1 || y >= slab.top - .35) continue;
        const sideRadius = slab.radius * .92 + radius;
        const nextDistance = Math.hypot(x - slab.x, z - slab.z);
        if (nextDistance >= sideRadius) continue;
        const currentDistance = Number.isFinite(fromX) && Number.isFinite(fromZ)
          ? Math.hypot(fromX - slab.x, fromZ - slab.z)
          : Infinity;
        if (currentDistance < sideRadius && nextDistance > currentDistance + 1e-6) continue;
        return true;
      }
      return false;
    }
    blockedByColumns(columns, x, y, z, radius, fromX, fromZ) {
      for (const platform of columns) {
        if (y >= platform.top - .35) continue;
        const sideRadius = platform.radius * 1.03 + radius;
        const nextDistance = Math.hypot(x - platform.x, z - platform.z);
        if (nextDistance >= sideRadius) continue;
        // If a sling, fall, or debug recovery places the player inside the
        // irregular collision shell, outward motion must remain an escape path.
        const currentDistance = Number.isFinite(fromX) && Number.isFinite(fromZ)
          ? Math.hypot(fromX - platform.x, fromZ - platform.z)
          : Infinity;
        if (currentDistance < sideRadius && nextDistance > currentDistance + 1e-6) continue;
        return true;
      }
      return false;
    }
    breakFracture(origin = this.fracture.position) {
      if (!this.fracture.active) return false;
      this.fracture.active = false;
      this.fracture.group.visible = false;
      this.particles.burst(origin, 0xc490ff, 78, 22, 1.1, .35);
      this.particles.burst(origin, 0xffd674, 38, 17, .9, .5);
      this.spawnStones(origin, 6, 3.5);
      audio.impact(1, 'glass');
      return true;
    }
    // Knock a piece out of the seam wall. Shards are hidden one at a time, so
    // the wall's remaining health is legible from across the crater with no
    // bar, no colour coding, and nothing to read: it is simply smaller.
    chipFracture(amount = 1, origin = this.fracture.position) {
      if (!this.fracture.active) return false;
      this.fracture.hp = Math.max(0, this.fracture.hp - amount);
      const total = this.fracture.pieces.length;
      const shouldBeGone = Math.round((1 - this.fracture.hp / this.fracture.maxHp) * total);
      const hidden = new T.Matrix4().makeScale(0, 0, 0);
      for (let index = 0; index < total; index++) {
        const piece = this.fracture.pieces[index];
        if (piece.gone || index >= shouldBeGone) continue;
        piece.gone = true;
        piece.mesh.setMatrixAt(piece.slot, hidden);
        piece.mesh.instanceMatrix.needsUpdate = true;
        this.particles.burst(piece.world, 0xc490ff, 16, 12, .7, .3);
      }
      this.particles.burst(origin, 0xd9a4ff, 22, 14, .7, .25);
      audio.impact(.8, 'rock');
      if (this.fracture.hp > 0) return false;
      return this.breakFracture(origin);
    }
    openGate() {
      if (!this.gate.active) return;
      this.gate.active = false;
      this.gate.group.visible = false;
      if (this.gate.leash) this.gate.leash.visible = false;
      const gateWorld = chartLift(this.gate.position.x, this.gate.position.y, this.gate.position.z, new T.Vector3());
      this.particles.burst(gateWorld, 0x65eeff, 48, 14, .85, .3);
      this.spawnStones(gateWorld, 4, 3);
      audio.score(true);
    }
    openGoal() {
      this.goal.open = true;
      this.goal.group.visible = true;
      this.particles.burst(this.goal.position, 0xffd76b, 60, 16, 1.2, .55);
      audio.score(true);
    }
    pulseRing(position, color, radius = 4, life = .4, inward = false) {
      this.ringField.spawn(position, color, radius, life, inward);
    }
    // The objective marker: a column of light standing on the moon. It answers
    // "where now?" from anywhere on the map without printing a sentence.
    makeBeacon() {
      const group = new T.Group();
      // Slender and pale. A wide, saturated column adds its tint to the black
      // sky and reads as a dirty opaque bar planted in front of the player
      // rather than as light — which is worse than no marker at all.
      const column = new T.Mesh(
        new T.CylinderGeometry(.5, 1.5, 150, 14, 1, true),
        new T.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0, side: T.DoubleSide,
          depthWrite: false, blending: T.AdditiveBlending,
        }),
      );
      column.position.y = 75;
      column.frustumCulled = false;
      group.add(column);
      const base = new T.Mesh(
        new T.RingGeometry(2.4, 4.6, 40),
        new T.MeshBasicMaterial({
          color: 0x7befff, transparent: true, opacity: 0, side: T.DoubleSide,
          depthWrite: false, blending: T.AdditiveBlending,
        }),
      );
      base.rotation.x = -Math.PI / 2;
      base.position.y = .4;
      group.add(base);
      group.visible = false;
      this.scene.add(group);
      this.beacon = { group, column, base, target: null, strength: 0, tint: new T.Color(0x7befff) };
    }
    setBeacon(position, tint = 0x7befff) {
      if (!this.beacon) return;
      this.beacon.target = position ? this.beacon.target?.copy(position) || position.clone() : null;
      if (position) this.beacon.tint.set(tint);
    }
    updateBeacon(dt, playerPosition) {
      const beacon = this.beacon;
      if (!beacon) return;
      const wanted = beacon.target ? 1 : 0;
      beacon.strength = damp(beacon.strength, wanted, 3.4, dt);
      if (beacon.strength < .01) {
        beacon.group.visible = false;
        return;
      }
      beacon.group.visible = true;
      if (beacon.target) {
        chartLift(beacon.target.x, this.floorHeight(beacon.target.x, beacon.target.z, beacon.target.y), beacon.target.z, beacon.group.position);
        liftQuatAt(beacon.target.x, beacon.target.z, beacon.group.quaternion);
      }
      // Near the objective the column steps out of the way; far from it, it
      // burns bright enough to navigate by.
      const distance = playerPosition ? beacon.group.position.distanceTo(playerPosition) : 120;
      const range = smoothstep(14, 70, distance);
      const breathe = .55 + Math.sin(this.elapsed * 1.9) * .16;
      // The shaft stays near-white so it always reads as light; the ring on
      // the ground carries the colour.
      beacon.column.material.color.copy(beacon.tint).lerp(WHITE, .72);
      beacon.base.material.color.copy(beacon.tint);
      beacon.column.material.opacity = beacon.strength * range * .07 * breathe;
      beacon.base.material.opacity = beacon.strength * (.24 + (1 - range) * .12) * breathe;
      beacon.base.scale.setScalar(1 + Math.sin(this.elapsed * 2.4) * .05);
    }
    shatterBreakable(item, impact = 1) {
      if (!item.alive) return false;
      item.alive = false;
      const hidden = new T.Matrix4().makeScale(0, 0, 0);
      item.mesh.setMatrixAt(item.instanceIndex, hidden);
      item.mesh.instanceMatrix.needsUpdate = true;
      if (item.spur) {
        item.spur.mesh.setMatrixAt(item.spur.index, hidden);
        item.spur.mesh.instanceMatrix.needsUpdate = true;
      }
      this.particles.burst(item.position, item.reward ? 0x7befff : 0xbfc5d2, 14 + Math.floor(impact * 10), 8 + impact * 6, .75, .25);
      this.spawnStones(item.position, item.reward ? 2 : 1, 1.8);
      if (item.rewardPickup) {
        item.rewardPickup.active = true;
        item.rewardPickup.group.visible = true;
      }
      audio.impact(clamp(impact, .2, 1), 'rock');
      return true;
    }
    damageNest(nest, amount = 1, impact = 1) {
      if (!nest?.alive) return false;
      nest.hp -= amount;
      nest.hitFlash = 1;
      this.particles.burst(nest.position, nest.hp <= 0 ? 0xffd66b : 0xbd83ff, nest.hp <= 0 ? 64 : 24, 10 + impact * 7, nest.hp <= 0 ? 1.2 : .72, .22);
      audio.impact(clamp(.45 + impact * .5, .4, 1), 'alien');
      if (nest.hp > 0) return false;
      nest.hp = 0;
      nest.alive = false;
      nest.group.visible = false;
      nest.drop.active = true;
      nest.drop.group.visible = true;
      this.spawnStones(nest.position, 4, 3);
      audio.score(true);
      return true;
    }
    strikeChime(chime) {
      if (!chime || chime.used) return false;
      chime.used = true;
      chime.drop.active = true;
      chime.drop.group.visible = true;
      chime.ring.material = this.materials.cyan;
      this.particles.burst(chime.position, 0xffd66b, 34, 12, .85, .28);
      audio.score(true);
      return true;
    }
    restoreBreakables() {
      const spurMatrix = new T.Matrix4();
      for (const item of this.breakables) {
        item.alive = true;
        item.mesh.setMatrixAt(item.instanceIndex, item.matrix);
        if (item.spur) {
          item.spur.mesh.setMatrixAt(item.spur.index, spurMatrix.makeTranslation(
            item.position.x, item.position.y + item.radius * .9, item.position.z,
          ));
        }
      }
      this.breakableMeshes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
      if (this.rewardSpurs) this.rewardSpurs.instanceMatrix.needsUpdate = true;
    }
    restorePlayground() {
      for (const pickup of this.collectibles) {
        pickup.active = pickup.initialActive;
        pickup.group.visible = pickup.active;
      }
      for (const item of this.breakables) {
        if (!item.rewardPickup) continue;
        item.rewardPickup.active = false;
        item.rewardPickup.group.visible = false;
      }
      for (const nest of this.nests) {
        nest.hp = nest.maxHp;
        nest.alive = true;
        nest.hitFlash = 0;
        nest.group.visible = true;
        nest.drop.active = false;
        nest.drop.group.visible = false;
      }
      for (const chime of this.moonChimes) {
        chime.used = false;
        chime.ring.material = this.materials.gold;
        chime.drop.active = false;
        chime.drop.group.visible = false;
      }
      for (const pad of this.launchPads) pad.cooldown = 0;
    }
    applyQuality(level, persist = true) {
      this.quality = level;
      const nativeDpr = Math.min(devicePixelRatio || 1, 1.5);
      const renderScale = level === 'HIGH' ? .9 : level === 'MED' ? .7 : .52;
      this.renderScale = renderScale;
      this.renderer.setPixelRatio(Math.max(.5, nativeDpr * renderScale));
      this.renderer.shadowMap.enabled = level !== 'LOW';
      this.sun.shadow.mapSize.set(level === 'HIGH' ? 2048 : 1024, level === 'HIGH' ? 2048 : 1024);
      if (this.rockField) this.rockField.castShadow = level === 'HIGH';
      this.breakableMeshes?.forEach(mesh => { mesh.castShadow = level === 'HIGH'; });
      if (ui.qualityButton) ui.qualityButton.textContent = `VISUAL ${level}`;
      if (persist) {
        try { localStorage.setItem(QUALITY_STORAGE_KEY, level); } catch (_) {}
      }
      this.resize();
    }
    cycleQuality() {
      const index = this.qualityOrder.indexOf(this.quality);
      this.applyQuality(this.qualityOrder[(index + 1) % this.qualityOrder.length]);
    }
    resize() {
      const width = Math.max(320, canvas.clientWidth || innerWidth);
      const height = Math.max(240, canvas.clientHeight || innerHeight);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
    setTrail(points, mode) {
      const count = Math.min(64, points.length);
      for (let i = 0; i < count; i++) {
        this.trailPositions[i * 3] = points[i].x;
        this.trailPositions[i * 3 + 1] = points[i].y;
        this.trailPositions[i * 3 + 2] = points[i].z;
      }
      this.ballTrail.geometry.setDrawRange(0, count);
      this.ballTrail.geometry.attributes.position.needsUpdate = true;
      this.ballTrail.material.color.set(mode === 'returning' ? 0x65edff : mode === 'anchored' ? 0xffd66b : 0xbd78ff);
    }
    update(dt, gameState) {
      this.elapsed += dt;
      if (this.planets) this.planets.forEach(planet => { planet.rotation.y += planet.userData.spinRate * dt; });
      if (this.skyTime) this.skyTime.value = this.elapsed;
      this.updateMeteors(dt);
      this.stars.rotation.y += dt * .00035;
      this.starBand.rotation.y -= dt * .00018;
      this.anchors.forEach(anchor => {
        // `beckon` is set when the player kicks a socket that is not yet live:
        // the correct one brightens and swells, pulling the eye to the answer.
        anchor.beckon = Math.max(0, anchor.beckon - dt);
        anchor.pulse += dt * (anchor.used ? 1.6 : 3.1 + anchor.beckon * 5);
        anchor.torus.rotation.z += dt * (anchor.used ? .4 : 1.35 + anchor.beckon * 3.4);
        anchor.crystal.rotation.y += dt * 1.6;
        anchor.crystal.position.y = Math.sin(anchor.pulse) * .18;
        anchor.glow.material.opacity = (anchor.used ? .18 : .58) + Math.sin(anchor.pulse) * .08 + anchor.beckon * .5;
        anchor.group.scale.setScalar((anchor.used ? .72 : 1 + Math.sin(anchor.pulse) * .025) + anchor.beckon * .3);
      });
      this.collectibles.forEach(pickup => {
        if (!pickup.active) return;
        pickup.group.rotateY(dt * 1.8);
        pickup.group.position.copy(pickup.position)
          .addScaledVector(dirAt(pickup.position, this.fxScratch), Math.sin(this.elapsed * 2.8 + pickup.phase) * .22);
        pickup.ring.rotation.z += dt * 1.5;
        pickup.glow.material.opacity = .35 + Math.sin(this.elapsed * 4 + pickup.phase) * .11;
      });
      this.nests.forEach(nest => {
        if (!nest.alive) return;
        nest.hitFlash = Math.max(0, nest.hitFlash - dt * 3.6);
        nest.core.scale.set(1.25 + nest.hitFlash * .16, 1.5 - nest.hitFlash * .12 + Math.sin(this.elapsed * 2.3 + nest.phase) * .05, 1.15 + nest.hitFlash * .16);
        nest.crown.rotation.y += dt * (1.15 + nest.hitFlash * 3);
        nest.weak.rotation.y -= dt * 2.4;
        nest.glow.material.opacity = .22 + Math.sin(this.elapsed * 3.6 + nest.phase) * .08 + nest.hitFlash * .28;
      });
      this.launchPads.forEach(pad => {
        pad.cooldown = Math.max(0, pad.cooldown - dt);
        pad.ring.rotation.z += dt * (pad.cooldown > 0 ? 4.8 : 1.35);
        pad.inner.material.emissiveIntensity = (pad.cooldown > 0 ? 3.8 : 1.65) + Math.sin(this.elapsed * 4 + pad.phase) * .35;
      });
      this.moonChimes.forEach(chime => {
        chime.ring.rotation.z += dt * (chime.used ? 2.8 : .72);
        chime.crystal.rotation.y -= dt * 1.8;
        chime.crystal.position.y = Math.sin(this.elapsed * 3.2 + chime.phase) * .18;
      });
      if (this.gate.active) {
        this.gate.field.material.opacity = .18 + Math.sin(this.elapsed * 4.2) * .07;
        this.gate.glow.material.opacity = .2 + Math.sin(this.elapsed * 3.1) * .08;
        // Draw the power leash from the sentinel to the gate it is holding up.
        const keeper = gameState.shieldEnemy;
        if (keeper?.alive) {
          const points = this.gate.leash.geometry.attributes.position;
          const keeperTop = fromChartVec(this.fxScratch.copy(keeper.position));
          keeperTop.addScaledVector(dirAt(keeperTop, this.fxScratchB), 1.6);
          points.setXYZ(0, keeperTop.x, keeperTop.y, keeperTop.z);
          const gateWorld = chartLift(this.gate.position.x, this.gate.position.y, this.gate.position.z, this.fxScratchB);
          points.setXYZ(1, gateWorld.x, gateWorld.y, gateWorld.z);
          points.needsUpdate = true;
          this.gate.leash.geometry.computeBoundingSphere();
          this.gate.leashFlash = Math.max(0, this.gate.leashFlash - dt * 1.6);
          this.gate.leash.material.opacity = .3 + Math.sin(this.elapsed * 5.4) * .12 + this.gate.leashFlash * .65;
          this.gate.leash.visible = true;
        } else {
          this.gate.leash.visible = false;
        }
      }
      if (this.fracture.active && this.materials.sealDark) {
        // Locked: a dim violet smoulder. Exposed (all four anchors linked):
        // a hard bright pulse — the wall itself tells you it can break now.
        const exposed = this.anchors.every(anchor => anchor.used);
        const pulse = exposed ? 1.35 + Math.sin(this.elapsed * 5.2) * .65 : .38;
        this.materials.sealDark.emissiveIntensity = pulse;
        this.materials.sealLight.emissiveIntensity = pulse;
      }
      if (this.goal.open) {
        this.goal.group.rotateZ(dt * .48);
        this.goal.glow.material.opacity = .45 + Math.sin(this.elapsed * 3.4) * .12;
      }
      this.ballVisual.ringA.rotation.z += dt * (4 + gameState.ball.spin * .08);
      this.ballVisual.ringB.rotation.x += dt * (3.3 - gameState.ball.spin * .06);
      this.ballVisual.core.rotation.y += dt * 2.7;
      // Earned cores orbit the ball. This is the entire progression display:
      // one, then two, then three lights circling the thing in your hands.
      const owned = gameState.cores;
      let coreIndex = 0;
      const coreCount = owned ? owned.size : 0;
      for (const [id, shard] of Object.entries(this.ballVisual.coreShards)) {
        const has = !!owned && owned.has(id);
        shard.visible = has;
        if (!has) continue;
        const angle = this.elapsed * 2.1 + (coreIndex / Math.max(1, coreCount)) * TAU;
        shard.position.set(Math.cos(angle) * 1.35, Math.sin(angle * 2.3) * .42, Math.sin(angle) * 1.35);
        shard.rotation.set(angle * 1.7, angle, 0);
        coreIndex++;
      }
      // Moondrops ride an inner, faster orbit than the cores, tilted the other
      // way, so a loaded ball reads as two rings turning against each other.
      const drops = gameState.drops || 0;
      const moteCount = Math.min(this.ballVisual.dropMotes.length, drops);
      for (let i = 0; i < this.ballVisual.dropMotes.length; i++) {
        const mote = this.ballVisual.dropMotes[i];
        mote.visible = i < moteCount;
        if (!mote.visible) continue;
        const angle = -this.elapsed * 3.4 + (i / moteCount) * TAU;
        mote.position.set(Math.cos(angle) * .96, Math.sin(angle * 1.7) * .66, Math.sin(angle) * .96);
        mote.rotation.set(angle * 2.2, -angle, 0);
      }
      const targetBallScale = gameState.ball.mode === 'ready' ? .46 : 1;
      this.ballDisplayScale = damp(this.ballDisplayScale, targetBallScale, targetBallScale > this.ballDisplayScale ? 15 : 10, dt);
      this.ballGroup.scale.setScalar(this.ballDisplayScale);
      this.ballGlow.material.map = gameState.ball.mode === 'anchored' ? this.glowGold : gameState.ball.mode === 'returning' ? this.glowCyan : this.glowViolet;
      // Past the six visible motes the halo keeps growing, so collecting the
      // fortieth drop still shows up on the ball. This is the whole counter.
      const load = Math.min(1, drops / 46);
      this.ballGlow.scale.setScalar(4.5 + load * 3.4);
      this.ballGlow.material.opacity = .34 + load * .3 + Math.min(.42, gameState.ball.velocity.length() * .012) + Math.sin(this.elapsed * 8) * .06;
      // Ember heat and comet state are written on the ball, so "this shot is
      // special" is something the player sees rather than remembers.
      const heat = clamp(gameState.ball.emberHeat || 0, 0, 1);
      const cometOn = gameState.ball.comet ? 1 : 0;
      this.ballVisual.shell.material.emissive.setRGB(.08 + heat * .82 + cometOn * .62, .59 - heat * .3 + cometOn * .3, .73 - heat * .58);
      this.ballVisual.shell.material.emissiveIntensity = 2.25 + heat * 3.4 + cometOn * 2.2;
      this.rig.position.x = Math.sin(gameState.player.runCycle * .5) * .018;
      this.rig.position.y = -.25 + Math.abs(Math.sin(gameState.player.runCycle)) * -.025;
      const catchDistance = gameState.ball.position.distanceTo(gameState.player.position);
      const catching = gameState.ball.mode === 'returning' && catchDistance < 5.2;
      this.leftArm.visible = catching;
      this.rightArm.visible = false;
      if (catching) {
        const catchT = 1 - clamp((catchDistance - 1.5) / 3.7, 0, 1);
        this.leftArm.position.set(-.18 - catchT * .16, -.28 + catchT * .12, -.38 - catchT * .5);
        this.leftArm.rotation.z = -.18 + catchT * .28;
      }
      this.boot.visible = gameState.kickVisual > 0;
      if (this.boot.visible) {
        const t = 1 - gameState.kickVisual;
        this.boot.position.z = -.35 - Math.sin(t * Math.PI) * 1.25;
        this.boot.rotation.x = -.2 - Math.sin(t * Math.PI) * .42;
      }
      const tetherPath = gameState.ball.tetherPath || [];
      if (gameState.lineActive && tetherPath.length >= 2) {
        const count = Math.min(32, tetherPath.length);
        for (let index = 0; index < count; index++) {
          const point = tetherPath[index];
          this.tetherPositions[index * 3] = point.x;
          this.tetherPositions[index * 3 + 1] = point.y;
          this.tetherPositions[index * 3 + 2] = point.z;
        }
        this.ballTether.geometry.setDrawRange(0, count);
        this.ballTether.geometry.attributes.position.needsUpdate = true;
        const caught = gameState.ball.mode === 'caught';
        const taut = gameState.player.grappling || gameState.lineHeld;
        const color = caught ? 0xc58aff : taut ? 0xffd66b : 0x72efff;
        this.ballTether.material.color.set(color);
        this.ballTetherNodes.material.color.set(caught ? 0xf0bdff : taut ? 0xffec9b : 0xa6f8ff);
        this.ballTether.material.opacity = taut ? .98 : .58 + Math.sin(this.elapsed * 9) * .16;
        this.ballTetherNodes.material.opacity = taut ? .92 : .58;
        this.ballTether.visible = true;
        this.ballTetherNodes.visible = true;
      } else {
        this.ballTether.visible = false;
        this.ballTetherNodes.visible = false;
        this.ballTether.geometry.setDrawRange(0, 0);
      }
      // Falling snow, only where it snows: one recycled Points cloud that
      // follows the player through the snow country.
      {
        const snowHere = SPHERE_WORLD ? snowWeightAt(dirAt(gameState.player.position, this.fxScratch)) : 0;
        if (snowHere > .25 && !this.snowField) {
          const count = 420;
          const snowGeometry = new T.BufferGeometry();
          const snowPositions = new Float32Array(count * 3);
          snowGeometry.setAttribute('position', new T.BufferAttribute(snowPositions, 3));
          this.snowField = new T.Points(snowGeometry, new T.PointsMaterial({
            color: 0xf4f8ff, size: 5.5, sizeAttenuation: false,
            map: radialTexture('rgba(255,255,255,.95)', 'rgba(255,255,255,0)', 32),
            transparent: true, opacity: .8, depthWrite: false,
          }));
          this.snowField.frustumCulled = false;
          this.snowField.userData.kbLifted = true;
          this.snowFall = new Float32Array(count);
          for (let i = 0; i < count; i++) this.snowFall[i] = cosmeticRandom();
          this.scene.add(this.snowField);
        }
        if (this.snowField) {
          this.snowField.visible = snowHere > .12;
          if (this.snowField.visible) {
            const up = dirAt(gameState.player.position, this.fxScratch);
            const positions = this.snowField.geometry.attributes.position;
            const count = positions.count;
            for (let i = 0; i < count; i++) {
              this.snowFall[i] -= dt * (.045 + (i % 7) * .006);
              if (this.snowFall[i] <= 0) this.snowFall[i] += 1;
              const angle = i * 2.3999632;
              const reach = 6 + (i % 11) * 3.4;
              const sway = Math.sin(this.elapsed * .9 + i) * 1.7;
              snowPoint.copy(gameState.player.position)
                .addScaledVector(up, this.snowFall[i] * 34 - 4)
                .addScaledVector(snowEast.set(-up.z, 0, up.x).normalize(), Math.cos(angle) * reach + sway)
                .addScaledVector(snowNorth.crossVectors(up, snowEast), Math.sin(angle) * reach);
              positions.setXYZ(i, snowPoint.x, snowPoint.y, snowPoint.z);
            }
            positions.needsUpdate = true;
          }
        }
      }
      this.updateSnowballs(dt, gameState);
      if (this.absorbing?.length) {
        // Two beats, not one: the crescent pops up and SPINS where you found
        // it (so drops buried in a kill are still seen), then streaks home.
        const target = gameState.ball.position;
        for (let i = this.absorbing.length - 1; i >= 0; i--) {
          const grab = this.absorbing[i];
          grab.t += dt * 2.4;
          if (grab.t >= 1) {
            this.moondropMesh.setMatrixAt(grab.index, ZERO_MATRIX);
            this.absorbing.splice(i, 1);
            continue;
          }
          dirAt(grab.from, absorbUp);
          absorbQuat.setFromAxisAngle(absorbUp, grab.t * 15);
          if (grab.t < .45) {
            const pop = grab.t / .45;
            absorbPoint.copy(grab.from).addScaledVector(absorbUp, Math.sin(pop * Math.PI * .5) * 1.4);
            absorbScale.setScalar(1 + pop * .45);
          } else {
            const dive = (grab.t - .45) / .55;
            absorbPoint.copy(grab.from).addScaledVector(absorbUp, 1.4).lerp(target, dive * dive);
            absorbScale.setScalar(1.45 - dive * 1.1);
          }
          absorbMatrix.compose(absorbPoint, absorbQuat, absorbScale);
          this.moondropMesh.setMatrixAt(grab.index, absorbMatrix);
        }
        this.moondropMesh.instanceMatrix.needsUpdate = true;
      }
      if (this.moonAbsorbing?.length) {
        const target = gameState.ball.position;
        for (let i = this.moonAbsorbing.length - 1; i >= 0; i--) {
          const grab = this.moonAbsorbing[i];
          grab.t += dt * 1.9;
          if (grab.t >= 1) {
            this.fullMoonOrb.setMatrixAt(grab.index, ZERO_MATRIX);
            this.fullMoonRing.setMatrixAt(grab.index, ZERO_MATRIX);
            this.moonAbsorbing.splice(i, 1);
            continue;
          }
          dirAt(grab.from, absorbUp);
          absorbQuat.setFromAxisAngle(absorbUp, grab.t * 11);
          if (grab.t < .45) {
            const pop = grab.t / .45;
            absorbPoint.copy(grab.from).addScaledVector(absorbUp, Math.sin(pop * Math.PI * .5) * 2.2);
            absorbScale.setScalar(1 + pop * .6);
          } else {
            const dive = (grab.t - .45) / .55;
            absorbPoint.copy(grab.from).addScaledVector(absorbUp, 2.2).lerp(target, dive * dive);
            absorbScale.setScalar(1.6 - dive * 1.3);
          }
          absorbMatrix.compose(absorbPoint, absorbQuat, absorbScale);
          this.fullMoonOrb.setMatrixAt(grab.index, absorbMatrix);
          this.fullMoonRing.setMatrixAt(grab.index, absorbMatrix);
        }
        this.fullMoonOrb.instanceMatrix.needsUpdate = true;
        this.fullMoonRing.instanceMatrix.needsUpdate = true;
      }
      if (this.flyingTrophies?.length) {
        const ballAt = gameState.ball.position;
        for (let i = this.flyingTrophies.length - 1; i >= 0; i--) {
          const fly = this.flyingTrophies[i];
          fly.t += dt;
          fly.mesh.rotateOnWorldAxis(fly.up, dt * (4 + fly.t * 5));
          if (fly.t < .95) {
            const rise = fly.t / .95;
            fly.mesh.position.copy(fly.from).addScaledVector(fly.up, Math.sin(rise * Math.PI * .5) * 5.5);
            fly.mesh.scale.setScalar(1 + rise * .5);
          } else if (fly.t < 1.35) {
            const dive = (fly.t - .95) / .4;
            fly.mesh.position.copy(fly.from).addScaledVector(fly.up, 5.5).lerp(ballAt, dive * dive);
            fly.mesh.scale.setScalar(1.5 - dive * 1.15);
          } else {
            this.pulseRing(ballAt, new T.Color(fly.mesh.material.color.getHex()), 5, .4);
            audio.score(true);
            this.scene.remove(fly.mesh);
            fly.mesh.geometry.dispose();
            fly.mesh.material.dispose();
            const flyGlow = fly.mesh.children[0];
            if (flyGlow?.material) flyGlow.material.dispose();
            this.flyingTrophies.splice(i, 1);
          }
        }
      }
      this.particles.update(dt);
      this.ringField.update(dt, this.camera);
      this.updateBeacon(dt, gameState.player.position);
      // The sun is a follow-light: its offset from the player is built in the
      // player's local frame, so lighting and shadows read the same anywhere
      // on the sphere -- there is no unplayable dark side.
      const target = gameState.player.position;
      this.fxScratch.set(-130, 210, 110);
      this.fxScratchB.set(0, 0, -35);
      if (SPHERE_WORLD) {
        this.fxScratch.applyQuaternion(gameState.player.frame);
        this.fxScratchB.applyQuaternion(gameState.player.frame);
      }
      this.sun.position.copy(target).add(this.fxScratch);
      this.sun.target.position.copy(target).add(this.fxScratchB);
      this.sun.target.updateMatrixWorld();
      // In THE DARK QUARTER the light itself dims and cools.
      const darkHere = SPHERE_WORLD ? darkWeightAt(dirAt(target, this.fxScratch)) : 0;
      this.sun.intensity = 4.65 * (1 - darkHere * .58);
      this.ambient.intensity = .43 * (1 - darkHere * .35);
    }
    noteFrame(delta) {
      if (TEST_MODE || this.quality === 'LOW') return;
      // Background tabs, launch hitches, and debugger pauses are not evidence
      // that the player's GPU needs a permanent visual downgrade.
      if (document.hidden || delta <= 0 || delta > .1) {
        this.frameSamples.length = 0;
        return;
      }
      this.autoReductionCooldown = Math.max(0, this.autoReductionCooldown - delta);
      if (this.autoReductionCooldown > 0) return;
      this.frameSamples.push(delta);
      if (this.frameSamples.length > 300) this.frameSamples.shift();
      if (this.frameSamples.length === 300) {
        const sorted = [...this.frameSamples].sort((a, b) => a - b);
        const p80 = sorted[Math.floor(sorted.length * .8)];
        if (p80 > .032) {
          const next = this.quality === 'HIGH' ? 'MED' : 'LOW';
          this.applyQuality(next, false);
          this.autoReduced = true;
          this.autoReductionCooldown = 3;
          this.frameSamples.length = 0;
          // The HUD purge deleted announce(); this call survived it and threw
          // every time the pacing guard fired -- i.e. on exactly the machines
          // that could least afford an exception in the frame loop. A quality
          // drop is not something the player needs told in words anyway.
        }
      }
    }
    render() { this.renderer.render(this.scene, this.camera); }
    stats() {
      const info = this.renderer.info;
      const drawingBuffer = this.renderer.getDrawingBufferSize(new T.Vector2());
      return {
        quality: this.quality,
        calls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        pixelRatio: this.renderer.getPixelRatio(),
        renderScale: this.renderScale,
        drawingBuffer: [drawingBuffer.x, drawingBuffer.y],
      };
    }
  }

  class PlayerState {
    constructor() {
      this.position = chartLift(0, groundHeightAt(0, 120), 120, new T.Vector3());
      this.velocity = new T.Vector3();
      this.yaw = 0;
      this.pitch = -.055;
      this.radius = .56;
      this.eyeHeight = 1.72;
      this.grounded = true;
      this.jumpsUsed = 0;
      this.jumpBuffer = 0;
      this.coyote = .14;
      this.runCycle = 0;
      this.maxHealth = 5;
      this.health = this.maxHealth;
      this.invulnerable = 0;
      this.damageCooldown = 0;
      this.spinTimer = 0;
      this.spinCooldown = 0;
      this.spinAngle = 0;
      this.spinDirection = 1;
      this.spinPower = 1;
      this.grappling = false;
      this.landingKick = 0;
      this.flung = 0;
      this.checkpoint = this.position.clone();
      this.checkpointYaw = 0;
      // Local vertical and tangent frame. On the sphere the frame is
      // parallel-transported as the player walks, so yaw/pitch keep their
      // meaning while "up" slowly becomes somewhere else. The frame maps
      // local axes -> world; local +Y is always `up`. Spawn starts on the
      // canonical chart frame at the spawn point.
      this.up = new T.Vector3(0, 1, 0);
      this.frame = new T.Quaternion();
      if (SPHERE_WORLD) {
        chartDirAt(0, 120, this.up);
        liftQuatAt(0, 120, this.frame);
      }
      this.checkpointUp = this.up.clone();
      this.checkpointFrame = this.frame.clone();
    }
  }

  class BallState {
    constructor(player) {
      const restOffset = new T.Vector3(.05, .55, -3.1);
      if (SPHERE_WORLD) restOffset.applyQuaternion(player.frame);
      this.position = player.position.clone().add(restOffset);
      this.velocity = new T.Vector3();
      this.radius = .72;
      this.mode = 'ready'; // ready | outbound | returning | anchored | caught
      this.spin = 0;
      this.flightTime = 0;
      this.freeFlightTime = 0;
      this.returnTime = 0;
      this.outboundDuration = .72;
      this.maxRange = 45;
      this.launchCharge = 0;
      this.launchOrigin = this.position.clone();
      this.returnSide = 1;
      this.anchor = null;
      this.anchorCharge = 0;
      this.caughtBy = null;
      this.catchTimer = 0;
      this.snapTimer = 0;
      this.anchorTimer = 0;
      this.returnStuck = 0;
      this.lastReturnDistance = 0;
      this.lastFlightSpeed = 0;
      this.snapReturn = false;
      this.grappleShot = false;
      this.emberHeat = 0;
      this.comet = false;
      this.pinned = null;
      this.collisionCooldown = new Map();
      this.trail = [];
      this.curveBoost = 0;
      this.bounceCount = 0;
      this.returnReason = 'auto';
      this.flightSpinTimer = 0;
      this.flightSpinDirection = 1;
      this.flightSpinPower = 1;
      this.tetherPath = [];
      this.tetherPathLength = 0;
      this.tetherWrapId = null;
      this.tetherWrapSide = 1;
      this.lastTetherPathLength = Infinity;
    }
  }

  class AlienState {
    constructor(id, type, x, z, facing = 0) {
      this.id = id;
      this.type = type;
      this.position = new T.Vector3(x, groundHeightAt(x, z), z);
      this.velocity = new T.Vector3();
      this.facing = facing;
      this.radius = type === 'warden' ? 2.8 : type === 'brute' ? 2.05 : type === 'shield' ? 1.7
        : type === 'watcher' ? 1.55 : type === 'clinger' ? 1.35 : type === 'floater' ? 1.3
          : type === 'drifter' ? 2.7 : type === 'shardling' ? 1.1 : type === 'skater' ? 2.6
            : type === 'snowman' ? 2.6 : type === 'phantom' ? 1.7 : 1.25;
      this.maxHp = type === 'warden' ? 7 : type === 'brute' ? 3 : type === 'shield' ? 3
        : type === 'watcher' ? 2 : type === 'clinger' ? 2 : type === 'drifter' ? 3
          : type === 'shardling' ? 2 : type === 'skater' ? 2
            : type === 'snowman' ? 3 : type === 'phantom' ? 4 : 1;
      this.hp = this.maxHp;
      this.alive = true;
      this.phase = enemyRandom() * TAU;
      this.stun = 0;
      this.hitFlash = 0;
      this.weakPulse = 0;
      this.dropping = 0;
      this.tensing = 0;
      this.beamHot = 0;
      this.attackCooldown = randomRange(.2, 1.1, enemyRandom);
      this.catchCooldown = 0;
      this.deadTimer = 0;
      this.summit = z < -100 && Math.hypot(x, z) < 300;
      this.visual = world.makeAlienMesh(type);
      fromChartVec(this.visual.group.position.copy(this.position));
      liftQuatAt(this.position.x, this.position.z, this.visual.group.quaternion)
        .multiply(new T.Quaternion().setFromAxisAngle(UP, facing + Math.PI));
      world.scene.add(this.visual.group);
      world.enemies.push(this);
    }
  }

  class GameController {
    constructor() {
      this.player = new PlayerState();
      this.ball = new BallState(this.player);
      this.enemies = [];
      this.started = false;
      this.paused = false;
      this.won = false;
      this.time = 0;
      this.score = 0;
      this.style = 0;
      this.styleHold = 0;
      this.stage = 0;
      this.objectiveKey = '';
      this.charge = 0;
      this.charging = false;
      this.queuedKick = null;
      this.queuedSpin = null;
      this.snapHeld = false;
      this.snapBuffer = 0;
      this.lineHeld = false;
      this.lineActive = false;
      this.lineHoldTime = 0;
      this.kickVisual = 0;
      this.shake = 0;
      this.cameraRoll = 0;
      this.cameraYawVelocity = 0;
      this.cameraPitchVelocity = 0;
      this.lastYaw = 0;
      this.hitStop = 0;
      this.rewardFlash = 0;
      this.lastTrick = null;
      this.lastSrState = '';
      this.cores = new Set();
      this.drops = 0;
      this.winTimer = null;
      this.pauseFocusVersion = 0;
      this.respawnCount = 0;
      this.stats = {
        kicks: 0, snaps: 0, spins: 0, doubleJumps: 0, meteorKicks: 0,
        anchorLinks: 0, breaks: 0, kills: 0, returnHits: 0, falls: 0, cores: 0, landmarks: 0, skyLit: 0,
      };
      this.bestTime = this.loadBest();
      this.forward = new T.Vector3();
      this.right = new T.Vector3();
      this.aimScratch = new T.Vector3();
      this.tempA = new T.Vector3();
      this.tempB = new T.Vector3();
      this.tempC = new T.Vector3();
      // Dedicated ready-ball scratch vectors keep the output target independent.
      // Passing tempA as both the output and the forward vector used to multiply
      // the camera position and fling the HOME ball hundreds of metres away.
      this.readyForwardScratch = new T.Vector3();
      this.readyRightScratch = new T.Vector3();
      this.readyUpScratch = new T.Vector3();
      this.chargeProjectionScratch = new T.Vector3();
      this.lineOriginScratch = new T.Vector3();
      this.lineEndScratch = new T.Vector3();
      this.lineTravelScratch = new T.Vector3();
      this.linePullScratch = new T.Vector3();
      this.pitonNormalScratch = new T.Vector3();
      this.ballUpScratch = new T.Vector3();
      this.playerUpScratch = new T.Vector3();
      // Chart-frame scratches: the player's and ball's authored-plane
      // coordinates plus local tangent axes, refreshed once per fixed step and
      // reused by every collision/trigger query in that step.
      this.playerChart = new ChartFrame();
      this.ballChart = new ChartFrame();
      this.queryChart = new ChartFrame();
      this.playerChartVec = new T.Vector3();
      this.ballChartVec = new T.Vector3();
      this.transportQuat = new T.Quaternion();
      this.frameEuler = new T.Euler(0, 0, 0, 'YXZ');
      this.frameQuat = new T.Quaternion();
      this.tangentScratch = new T.Vector3();
      this.vspeedScratch = new T.Vector3();
      this.pitonCooldown = 0;
      this.grappleArmed = 0;
      this.grappleReel = 0;
      this.endgameOpen = false;
      this.endgameComplete = false;
      // A moon whose heart was already found keeps its face: the cosmic ball
      // and the smiling planets persist across sessions.
      try {
        if (localStorage.getItem('moonkick-heart-v1')) {
          world.dressMoonheartBall();
          world.drawSmiles();
        }
      } catch (ignored) { void ignored; }
      this.lastContact = null;
      this.guidePointScratch = new T.Vector3();
      this.guideDirectionScratch = new T.Vector3();
      this.flightRadialScratch = new T.Vector3();
      this.flightTangentScratch = new T.Vector3();
      this.orbitForwardScratch = new T.Vector3();
      this.orbitRightScratch = new T.Vector3();
      this.orbitUpScratch = new T.Vector3();
      this.orbitCenterScratch = new T.Vector3();
      this.orbitOffsetScratch = new T.Vector3();
      this.orbitTargetScratch = new T.Vector3();
      this.spawnEnemies();
      this.syncWorldVisuals();
      this.updateObjective(true);
      this.syncUI();
      this.setGameplayInert(true);
    }
    loadBest() {
      try {
        const value = Number(localStorage.getItem('kickball-lunar-best-time'));
        return Number.isFinite(value) && value > 0 ? value : null;
      } catch (_) { return null; }
    }
    saveBest() {
      if (!this.bestTime || this.time < this.bestTime) {
        this.bestTime = this.time;
        try { localStorage.setItem('kickball-lunar-best-time', String(this.bestTime)); } catch (_) {}
      }
    }
    spawnEnemies() {
      enemyRandom = mulberry32(0xE11E5EED);
      const sharedMaterials = new Set(Object.values(world.materials));
      for (const enemy of world.enemies) {
        world.scene.remove(enemy.visual.group);
        enemy.visual.group.traverse(object => {
          object.geometry?.dispose?.();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            if (material && !sharedMaterials.has(material)) material.dispose?.();
          }
        });
      }
      world.enemies.length = 0;
      this.enemies = [
        new AlienState('skitter-1', 'scuttler', -9, 101, Math.PI),
        new AlienState('skitter-2', 'scuttler', 10, 91, Math.PI),
        new AlienState('skitter-3', 'scuttler', -12, 76, Math.PI),
        new AlienState('skitter-4', 'scuttler', 12, 69, Math.PI),
        new AlienState('impact-floater', 'floater', 18, 103, Math.PI),
        new AlienState('ridge-floater', 'floater', -23, 73, Math.PI),
        new AlienState('side-brute', 'brute', -51, 22, Math.PI * .5),
        new AlienState('rift-brute', 'brute', 56, -72, -Math.PI * .5),
        new AlienState('carapace-sentinel', 'shield', 0, 53, 0),
        new AlienState('crown-skitter-1', 'scuttler', -18, -132, 0),
        new AlienState('crown-skitter-2', 'scuttler', 18, -139, 0),
        new AlienState('crown-skitter-3', 'scuttler', -15, -161, 0),
        new AlienState('crown-skitter-4', 'scuttler', 16, -174, 0),
        new AlienState('crown-floater-1', 'floater', -31, -151, 0),
        new AlienState('crown-floater-2', 'floater', 34, -181, 0),
        new AlienState('crown-brute', 'brute', 26, -196, 0),
        new AlienState('crown-warden', 'warden', 0, -191, 0),
      ];
      // Region garrisons. They are deliberately outside the main mission's
      // clear conditions: these places are worth visiting for what they give
      // you, not because a checklist says to.
      for (const region of world.regions) {
        region.spawns.forEach((spawn, index) => {
          this.enemies.push(new AlienState(`${region.id}-${spawn.type}-${index}`, spawn.type, spawn.x, spawn.z, index * 1.4));
        });
        if (region.boss) this.resetBoss(region.boss);
      }
      if (world.roc) {
        const roc = world.roc;
        roc.alive = true;
        roc.hp = roc.maxHp;
        roc.mode = 'circle';
        roc.modeTimer = 0;
        roc.deadTimer = 0;
        roc.hitFlash = 0;
        roc.group.visible = true;
        roc.group.scale.setScalar(1);
      }
      if (world.colossus) {
        const titan = world.colossus;
        titan.alive = true;
        titan.hp = titan.maxHp;
        titan.mode = 'idle';
        titan.modeTimer = 0;
        titan.exposed = 0;
        titan.hitFlash = 0;
        titan.deadTimer = 0;
        titan.group.visible = true;
        titan.group.scale.setScalar(1);
        titan.weak.material.emissiveIntensity = 1.9;
      }
      for (const plate of world.crustPlates || []) {
        if (plate.hole.open) {
          plate.hole.open = false;
          world.reDisplaceTerrain(plate.hole.dir, 30);
        }
        plate.hp = plate.maxHp;
        plate.group.visible = true;
        plate.veins.material.opacity = .3;
        plate.group.children[0].material.emissiveIntensity = .5;
      }
      if (this.endgameOpen) {
        // Reseal the moon: the flag flips first so reDisplaceTerrain samples
        // the closed law, restoring render AND collision together.
        this.endgameOpen = false;
        this.endgameComplete = false;
        MOONHOLE.open = false;
        world.reDisplaceTerrain(FAR_SIGHTS.bowl, 46);
        if (world.iceSheen) world.iceSheen.visible = true;
        if (world.holePillar) world.holePillar.visible = false;
      }
      if (world.moonheart) {
        const heart = world.moonheart;
        heart.alive = true;
        heart.exposed = false;
        heart.coreHp = 3;
        heart.exposedTimer = 0;
        heart.spin = 0;
        heart.hitFlash = 0;
        heart.core.material.emissiveIntensity = 2.2;
        heart.core.scale.setScalar(1);
        for (const node of heart.nodes) {
          node.alive = true;
          node.mesh.visible = true;
        }
      }
      // The far side has garrisons now: skaters carve the ice field,
      // drifters lurk in the snow country, and every sight has something
      // living on it. (They activate by proximity like everything else.)
      const farSpawns = [
        ['skater', 0, 908], ['skater', -64, 932], ['skater', 72, 946], ['skater', -24, 876], ['skater', 118, 896],
        ['drifter', 34, -598], ['drifter', -48, -668], ['drifter', 214, -640], ['drifter', 596, -478],
        ['scuttler', -678, -228], ['shardling', -722, -298], ['floater', -652, -288],
        ['scuttler', -428, 432], ['shardling', -392, 498], ['floater', -468, 502],
        ['scuttler', 356, 522], ['shardling', 702, 282], ['floater', 542, 398],
        ['brute', 642, -538], ['watcher', -4, -706], ['watcher', 98, 902], ['clinger', -602, -252],
        // THE DARK QUARTER: dead astronauts walk the graben. Harder than
        // anything else on foot, lit only by the crystals.
        ['phantom', -540, 76], ['phantom', -498, 138], ['phantom', -560, 130],
        ['phantom', -472, 66], ['phantom', -524, 178], ['phantom', -586, 92],
        ['watcher', -516, 52], ['brute', -462, 118],
        // Snowmen in the snow country, lobbing.
        ['snowman', 246, -588], ['snowman', 302, -646], ['snowman', 200, -662],
        ['snowman', 344, -580], ['snowman', 270, -540], ['snowman', 150, -600],
        // Ambush pockets in the new landforms.
        ['scuttler', -472, 88], ['clinger', -538, 84],           // dark cave mouth
        ['shardling', 380, -140], ['shardling', 392, -128],      // crystal cave
        ['scuttler', -466, 96], ['clinger', -378, 198],          // THE RILLE
        ['scuttler', -556, -16], ['shardling', -302, 296],
        ['shardling', 432, 66], ['shardling', 502, 140],         // THE DOMES
        ['brute', 288, -344], ['brute', 268, -282],              // THE FINS
        // Sky garrisons: floaters hover over the decks, scuttlers patrol them.
        ['floater', -80, 780, 'deck'], ['floater', 0, 160, 'deck'],
        ['floater', 300, -600, 'deck'], ['floater', 540, 400, 'deck'],
        ['floater', 0, 660, 'deck'], ['floater', -440, 460, 'deck'],
        ['scuttler', -320, -520, 'deck'], ['scuttler', -640, -230, 'deck'],
      ];
      farSpawns.forEach(([type, x, z, deck], index) => {
        const enemy = new AlienState(`far-${type}-${index}`, type, x, z, index * .9);
        if (deck === 'deck') {
          let best = null, bestD = 50;
          for (const slab of world.sky || []) {
            const d = Math.hypot(slab.x - x, slab.z - z);
            if (d < bestD) { bestD = d; best = slab; }
          }
          if (best) {
            enemy.position.x = best.x;
            enemy.position.z = best.z;
            enemy.position.y = best.top + .2;
          }
        }
        this.enemies.push(enemy);
      });
      this.shieldEnemy = this.enemies.find(enemy => enemy.type === 'shield');
      this.warden = this.enemies.find(enemy => enemy.type === 'warden');
    }
    start(requestLock = true) {
      if (this.won) return;
      this.started = true;
      this.paused = false;
      document.body.dataset.started = 'true';
      ui.startOverlay?.classList.add('hidden');
      ui.startOverlay?.setAttribute('aria-hidden', 'true');
      ui.pauseOverlay?.classList.add('hidden');
      this.setGameplayInert(false);
      this.pauseFocusVersion++;
      canvas.focus({ preventScroll: true });
      audio.ensure();
      if (requestLock && !input.touchEnabled && !TEST_MODE) requestGamePointerLock();
      this.updateObjective(true);
    }
    restart() {
      if (this.winTimer) { clearTimeout(this.winTimer); this.winTimer = null; }
      this.pauseFocusVersion++;
      const wasStarted = this.started || AUTO_START;
      this.player = new PlayerState();
      this.ball = new BallState(this.player);
      this.time = 0;
      this.score = 0;
      this.style = 0;
      this.styleHold = 0;
      this.stage = 0;
      this.objectiveKey = '';
      this.charge = 0;
      this.charging = false;
      this.queuedKick = null;
      this.queuedSpin = null;
      this.snapHeld = false;
      this.snapBuffer = 0;
      this.lineHeld = false;
      this.lineActive = false;
      this.lineHoldTime = 0;
      this.kickVisual = 0;
      this.shake = 0;
      this.cameraRoll = 0;
      this.cameraYawVelocity = 0;
      this.cameraPitchVelocity = 0;
      this.lastYaw = 0;
      this.hitStop = 0;
      this.rewardFlash = 0;
      this.lastTrick = null;
      this.cores.clear();
      this.drops = 0;
      this.won = false;
      this.paused = false;
      this.started = wasStarted;
      this.respawnCount = 0;
      this.stats = {
        kicks: 0, snaps: 0, spins: 0, doubleJumps: 0, meteorKicks: 0,
        anchorLinks: 0, breaks: 0, kills: 0, returnHits: 0, falls: 0, cores: 0, landmarks: 0, skyLit: 0,
      };
      world.gate.active = true;
      world.gate.group.visible = true;
      world.fracture.active = true;
      world.fracture.group.visible = true;
      world.goal.open = false;
      world.goal.group.visible = false;
      world.anchors.forEach(anchor => { anchor.used = false; anchor.group.visible = true; });
      world.restoreBreakables();
      world.restoreRockField();
      world.restoreMoondrops();
      if (world.flyingTrophies) {
        for (const fly of world.flyingTrophies) {
          world.scene.remove(fly.mesh);
          fly.mesh.geometry.dispose();
          fly.mesh.material.dispose();
          const glow = fly.mesh.children[0];
          if (glow?.material) glow.material.dispose();
        }
        world.flyingTrophies.length = 0;
      }
      if (world.snowballs) {
        for (let i = 0; i < world.snowballs.length; i++) {
          world.snowballs[i].alive = false;
          world.snowballMesh.setMatrixAt(i, ZERO_MATRIX);
        }
        world.snowballMesh.instanceMatrix.needsUpdate = true;
      }
      world.restorePlayground();
      this.spawnEnemies();
      world.particles.clear();
      world.ringField.clear();
      world.ballGroup.visible = true;
      world.ballGroup.position.copy(this.ball.position);
      world.setTrail([], 'ready');
      ui.pauseOverlay?.classList.add('hidden');
      ui.pauseOverlay?.setAttribute('aria-hidden', 'true');
      ui.winOverlay?.classList.add('hidden');
      ui.winOverlay?.setAttribute('aria-hidden', 'true');
      ui.damageVignette?.classList.remove('active');
      ui.hitMarker?.classList.remove('active');
      if (ui.hitMarker) ui.hitMarker.style.filter = '';
      if (ui.visorFrost) ui.visorFrost.style.opacity = '0';
      if (ui.rewardFlash) ui.rewardFlash.style.opacity = '0';
      if (!wasStarted) {
        ui.startOverlay?.classList.remove('hidden');
        ui.startOverlay?.setAttribute('aria-hidden', 'false');
      }
      this.setGameplayInert(!wasStarted);
      this.updateObjective(true);
      // A restart can follow a teleport or a full run. Realign the camera and
      // HOME ball in the same frame so neither launch physics nor the circular
      // meter inherit the previous location for one deceptive tick.
      this.updateCamera(FIXED_DT);
      this.ball.position.copy(this.readyBallTarget(new T.Vector3()));
      this.ball.velocity.set(0, 0, 0);
      this.syncWorldVisuals();
      this.syncUI();
      if (wasStarted) canvas.focus({ preventScroll: true });
    }
    togglePause() {
      if (!this.started || this.won) return;
      this.paused = !this.paused;
      if (this.paused) {
        this.cancelCharge();
        this.lineHeld = false;
        this.lineActive = false;
        this.ball.tetherPath.length = 0;
      }
      this.setGameplayInert(this.paused);
      ui.pauseOverlay?.classList.toggle('hidden', !this.paused);
      ui.pauseOverlay?.setAttribute('aria-hidden', this.paused ? 'false' : 'true');
      if (this.paused && document.pointerLockElement === canvas) document.exitPointerLock?.();
      if (!this.paused && !input.touchEnabled && !TEST_MODE) requestGamePointerLock();
      const focusVersion = ++this.pauseFocusVersion;
      if (this.paused) {
        setTimeout(() => {
          if (this.paused && this.pauseFocusVersion === focusVersion) ui.pauseResumeButton?.focus({ preventScroll: true });
        }, 32);
      } else canvas.focus({ preventScroll: true });
      audio.recall(false, 0);
    }
    cancelCharge() {
      this.charging = false;
      this.charge = 0;
      ui.chargeUI?.classList.remove('active');
      ui.chargeUI?.setAttribute('aria-hidden', 'true');
    }
    setGameplayInert(inert) {
      canvas.inert = !!inert;
      if (ui.hud) ui.hud.inert = !!inert;
      if (ui.touchControls) ui.touchControls.inert = !!inert;
    }
    // The three view/movement basis vectors. The trig is unchanged from the
    // flat build; the player's frame quaternion then carries the result into
    // the local tangent plane (identity while SPHERE_WORLD is off, so flat
    // behavior is bit-identical).
    forwardFromView(target = this.forward) {
      const horizontal = Math.cos(this.player.pitch);
      target.set(
        Math.sin(this.player.yaw) * horizontal,
        Math.sin(this.player.pitch),
        -Math.cos(this.player.yaw) * horizontal,
      ).normalize();
      if (SPHERE_WORLD) target.applyQuaternion(this.player.frame);
      return target;
    }
    horizontalForward(target = this.forward) {
      target.set(Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw)).normalize();
      if (SPHERE_WORLD) target.applyQuaternion(this.player.frame);
      return target;
    }
    horizontalRight(target = this.right) {
      target.set(Math.cos(this.player.yaw), 0, Math.sin(this.player.yaw)).normalize();
      if (SPHERE_WORLD) target.applyQuaternion(this.player.frame);
      return target;
    }
    update(dt, frame, edgeFrame = true) {
      if (edgeFrame && frame.pausePressed) this.togglePause();
      if (!this.started || this.paused) {
        this.updateCamera(dt);
        this.syncWorldVisuals();
        this.syncUI();
        return;
      }
      if (this.won) {
        // Keep the signature promise: the ball still comes home after the finish.
        this.updateBall(dt, { ...frame, kick: false, snap: false }, edgeFrame);
        this.updateCamera(dt);
        this.syncWorldVisuals();
        this.syncUI();
        return;
      }
      const yawBefore = this.player.yaw;
      const pitchBefore = this.player.pitch;
      this.player.yaw += frame.lookX;
      this.player.pitch = clamp(this.player.pitch - frame.lookY, -1.42, 1.42);
      this.cameraYawVelocity = damp(this.cameraYawVelocity, angleDelta(yawBefore, this.player.yaw) / Math.max(dt, .0001), 13, dt);
      this.cameraPitchVelocity = damp(this.cameraPitchVelocity, (this.player.pitch - pitchBefore) / Math.max(dt, .0001), 13, dt);
      this.lastYaw = this.player.yaw;
      this.lineHeld = !!frame.line;
      this.lineHoldTime = this.lineHeld ? this.lineHoldTime + dt : 0;
      if (edgeFrame && frame.snapPressed && this.ball.mode !== 'ready') {
        this.stats.snaps++;
        this.snapBuffer = Math.max(this.snapBuffer, .12);
        // A quick call always means "come back" — even from a tether socket.
        // Holding the button still pulls the player; only the tap recalls.
        // (frame.snap stays false on a quick-click release, so held E/RMB
        // pull grammar is untouched.)
        if (this.ball.mode === 'anchored' && !frame.snap && !frame.line) {
          const ball = this.ball;
          ball.anchor = null;
          ball.anchorTimer = 0;
          ball.mode = 'returning';
          ball.returnReason = 'snap';
          ball.snapReturn = true;
          ball.returnTime = 0;
          ball.returnStuck = 0;
          ball.lastReturnDistance = ball.position.distanceTo(this.player.position);
          ball.lastTetherPathLength = Infinity;
          world.particles.burst(ball.position, 0x75efff, 14, 7, .55, .1);
        }
        // While an enemy holds the ball, every tap fights the grip too.
        if (this.ball.mode === 'caught') this.ball.snapTimer += .2;
      }
      if (edgeFrame && frame.actionCancelled) this.cancelCharge();

      if (edgeFrame && frame.kickPressed) {
        this.charging = true;
        this.charge = 0;
      }
      if (this.charging && frame.kick) this.charge = clamp(this.charge + dt / .68, 0, 1);
      if (edgeFrame && frame.kickReleased && this.charging) {
        const homeNearCamera = this.ball.position.distanceTo(world.camera.position) < 5.25;
        if (this.ball.mode === 'ready' && homeNearCamera) this.launchBall(this.charge);
        else this.queueKick(this.charge);
        this.charging = false;
        this.charge = 0;
      }
      if (!frame.kick && !this.charging) this.charge = 0;
      if (edgeFrame && frame.spinPressed) this.startSpin(frame.spinDirection, frame.spinPower);
      // THE GRAPPLE. Holding the button IS the arming -- no window, no timing.
      // While it is down the ball bites whatever it touches; when it comes up
      // the reel keeps running a beat so letting go early never drops you.
      this.pitonCooldown = Math.max(0, this.pitonCooldown - dt);
      if (frame.grapple) {
        this.grappleArmed = GRAPPLE_PROFILE.releaseTail;
        this.grappleReel = GRAPPLE_PROFILE.reelGrace;
      } else {
        this.grappleArmed = Math.max(0, this.grappleArmed - dt);
        this.grappleReel = Math.max(0, this.grappleReel - dt);
      }
      if (edgeFrame && frame.grapplePressed) {
        // MIDDLE CLICK IS THE WHOLE GRAPPLE. Ball in hand: throw a shot that
        // sticks to the first thing it touches. Ball in flight or a moment
        // after a bounce: bite now. Held: reel. One button, no timing.
        if (this.ball.mode === 'ready' && !this.charging) this.launchBall(GRAPPLE_PROFILE.shotCharge, null, false, true);
        else this.pressGrapple();
      }
      if (edgeFrame && frame.jumpPressed) this.player.jumpBuffer = Math.max(this.player.jumpBuffer, .15);

      // Edge inputs are captured above before hit stop freezes simulation. This
      // keeps quick KICK/JUMP/SPIN/SNAP taps from disappearing inside impact frames.
      if (this.hitStop > 0) {
        this.hitStop -= dt;
        this.updateCamera(dt * .18);
        this.syncWorldVisuals();
        this.syncUI();
        return;
      }

      this.time += dt;
      const bufferedSnap = this.snapBuffer > 0;
      const actionFrame = bufferedSnap && !frame.snap ? { ...frame, snap: true } : frame;
      this.snapBuffer = Math.max(0, this.snapBuffer - dt);
      this.snapHeld = actionFrame.snap;
      this.lineHeld = !!actionFrame.line;

      this.updatePlayer(dt, actionFrame, edgeFrame);
      this.updateBall(dt, actionFrame, edgeFrame);
      this.collectMoondrops();
      this.updateRegions(dt);
      this.updateLandmarks(dt);
      this.updateSky(dt);
      this.updateEnemies(dt);
      this.updateRoc(dt);
      this.updateColossus(dt);
      this.updateEndgame(dt);
      this.updateCrustTransit();
      this.updateThreatMusic();
      this.updatePlaygroundInteractions(dt);
      this.updateProgression();
      this.updateCamera(dt);
      this.decayFeedback(dt);
      this.validate();
      this.syncWorldVisuals();
      this.syncUI();
    }
    updatePlayer(dt, frame, edgeFrame) {
      const player = this.player;
      player.invulnerable = Math.max(0, player.invulnerable - dt);
      player.damageCooldown = Math.max(0, player.damageCooldown - dt);
      player.spinCooldown = Math.max(0, player.spinCooldown - dt);
      player.spinTimer = Math.max(0, player.spinTimer - dt);
      if (this.queuedSpin) {
        if (this.time > this.queuedSpin.expires) this.queuedSpin = null;
        else if (player.spinCooldown <= 0) {
          const queued = this.queuedSpin;
          this.queuedSpin = null;
          this.startSpin(queued.direction, queued.power);
        }
      }
      player.landingKick = Math.max(0, player.landingKick - dt * 2.8);
      player.flung = Math.max(0, player.flung - dt);
      player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
      if (edgeFrame && frame.jumpPressed) player.jumpBuffer = .15;
      if (player.grounded) player.coyote = .14;
      else player.coyote = Math.max(0, player.coyote - dt);

      const canGroundJump = player.coyote > 0 && player.jumpsUsed === 0;
      const canAirJump = !player.grounded && player.jumpsUsed < 2;
      if (player.jumpBuffer > 0 && (canGroundJump || canAirJump) && !player.grappling) {
        const second = !canGroundJump;
        player.jumpsUsed = second ? 2 : 1;
        setVspeed(player.velocity, player.up, second ? 19 : 16);
        player.grounded = false;
        player.coyote = 0;
        player.jumpBuffer = 0;
        if (second) {
          this.stats.doubleJumps++;
          this.addStyle(9, 260, 'DOUBLE MOON', '#ffd66b');
          world.particles.burst(player.position.clone().addScaledVector(player.up, .3), 0xffd76b, 18, 7, .65, .15);
        } else {
          world.particles.burst(player.position.clone().addScaledVector(player.up, .15), 0x8eeeff, 10, 4.5, .48, .08);
        }
        audio.jump(second);
      }

      const forward = this.horizontalForward(this.tempA);
      const right = this.horizontalRight(this.tempB);
      const desiredDirection = new T.Vector3()
        .addScaledVector(forward, frame.moveZ)
        .addScaledVector(right, frame.moveX);
      if (desiredDirection.lengthSq() > 1) desiredDirection.normalize();
      const moveAmount = desiredDirection.length();
      const sprinting = frame.sprint && frame.moveZ > .25;
      const maxSpeed = sprinting ? 18.5 : 12.4;
      const desiredVelocity = desiredDirection.multiplyScalar(maxSpeed);
      // THE ICE FIELD: grounded control goes drifty -- push builds slowly and
      // momentum carries. Normal ground is untouched.
      this.jumpHeldNow = !!frame.jump;
      let iciness = player.grounded && SPHERE_WORLD ? iceWeightAt(dirAt(player.position, this.tempC)) : 0;
      if (iciness > 0 && MOONHOLE.open) iciness *= smoothstep(30, 40, arcTo(this.tempC, FAR_SIGHTS.bowl));
      const acceleration = (player.grounded ? (sprinting ? 58 : 72) : 35) * (1 - iciness * .62);
      const horizontalVelocity = tangentOf(player.velocity, player.up, new T.Vector3());
      if (!player.grappling) {
        if (moveAmount > .03 && player.flung <= 0) {
          const change = desiredVelocity.sub(horizontalVelocity);
          const maxChange = acceleration * dt;
          if (change.length() > maxChange) change.setLength(maxChange);
          player.velocity.add(change);
        } else {
          // While FLUNG by a launch ring, the air lets go: the whole point of
          // an orbital road is that the speed survives the ride.
          const drag = Math.exp(-(player.grounded ? lerp(11.8, 1.7, iciness) : (player.flung > 0 ? .1 : 1.55)) * dt);
          const vUp = vspeedOf(player.velocity, player.up);
          player.velocity.copy(horizontalVelocity.multiplyScalar(drag)).addScaledVector(player.up, vUp);
        }
      }
      if (!frame.jump && vspeedOf(player.velocity, player.up) > 5.5) player.velocity.addScaledVector(player.up, -10 * dt);
      // The KITE glide was a second traversal answer that only existed after a
      // long climb. The grapple is now the one answer, and you have it from the
      // first second, so this is gone. See CORES_ARE_TROPHIES.
      this.gliding = false;
      if (!player.grappling) {
        // The sphere's uninvited gift: at speed, level flight is half an
        // orbit, and 15.2 of gravity FEELS like 11 -- "the player is just
        // floating so long". Cancel the orbital term while airborne so your
        // weight is the same at every speed, exactly like the flat moon the
        // jump was tuned on. (The ball keeps its orbital flights -- that is
        // the long throw over the horizon -- this is only the player's boots.)
        const up = upAt(player.position, this.playerUpScratch);
        let gravity = 15.2;
        if (SPHERE_WORLD && !player.grounded && player.flung <= 0) {
          gravity += tangentOf(player.velocity, up, this.tangentScratch).lengthSq() / (PLANET.radius + altAt(player.position));
        }
        player.velocity.addScaledVector(up, -gravity * dt);
      }
      player.runCycle += tangentOf(player.velocity, player.up, this.tangentScratch).length() * dt * .76;
      player.spinAngle += (player.spinTimer > 0 ? 13 + player.spinPower * 5 : 0) * dt;

      // One chart frame per step: the player's authored-plane coordinates and
      // local tangent axes. Every floor/blocker query below runs verbatim on
      // chart numbers -- the same numbers the world was authored and tuned in.
      // The tangent move itself happens in world space (a real step along the
      // sphere), so motion is isotropic everywhere; only the queries chart.
      const pf = chartFrameAt(player.position, this.playerChart);
      const vTan = tangentOf(player.velocity, pf.up, this.tangentScratch);
      const currentFloor = world.floorHeight(pf.x, pf.z, pf.alt + 1);
      const stepped = new T.Vector3().copy(player.position).addScaledVector(vTan, dt);
      if (SPHERE_WORLD) setAltAt(stepped, pf.alt);
      const nextChart = chartAt(stepped, this.queryChart);
      const nextFloor = world.floorHeight(nextChart.x, nextChart.z, pf.alt + 1);
      const stepHeight = nextFloor - pf.alt;
      const climbingTerrain = nextFloor > currentFloor + .005;
      const routeIncomplete = world.anchors.some(anchor => !anchor.used);
      const slopeBlocked = routeIncomplete && !player.grappling && climbingTerrain && world.terrainSlopeAt(nextChart.x, nextChart.z) > .92 && pf.alt < nextFloor + 14;
      const blocked = world.insideBlocker(nextChart.x, pf.alt + 1, nextChart.z, player.radius, pf.x, pf.z) || (stepHeight > 1.05 && !player.grappling) || slopeBlocked;
      if (!blocked) {
        player.position.copy(stepped);
      } else {
        // Axis-split wall slide, expressed on the two local tangent axes that
        // correspond to the authored X and Z. Same decisions, same -.05 kick.
        const vex = vTan.dot(pf.ex);
        const vez = vTan.dot(pf.ez);
        const steppedX = new T.Vector3().copy(player.position).addScaledVector(pf.ex, vex * dt);
        const steppedZ = new T.Vector3().copy(player.position).addScaledVector(pf.ez, vez * dt);
        if (SPHERE_WORLD) { setAltAt(steppedX, pf.alt); setAltAt(steppedZ, pf.alt); }
        const chartX = chartAt(steppedX, { x: 0, z: 0 });
        const chartZ = chartAt(steppedZ, { x: 0, z: 0 });
        const floorX = world.floorHeight(chartX.x, chartX.z, pf.alt + 1);
        const floorZ = world.floorHeight(chartZ.x, chartZ.z, pf.alt + 1);
        const canMoveX = !world.insideBlocker(chartX.x, pf.alt + 1, chartX.z, player.radius, pf.x, pf.z) && floorX <= pf.alt + 1.05 && !(routeIncomplete && !player.grappling && floorX > currentFloor + .005 && world.terrainSlopeAt(chartX.x, chartX.z) > .92 && pf.alt < floorX + 14);
        const canMoveZ = !world.insideBlocker(chartZ.x, pf.alt + 1, chartZ.z, player.radius, pf.x, pf.z) && floorZ <= pf.alt + 1.05 && !(routeIncomplete && !player.grappling && floorZ > currentFloor + .005 && world.terrainSlopeAt(chartZ.x, chartZ.z) > .92 && pf.alt < floorZ + 14);
        if (canMoveX) player.position.copy(steppedX); else player.velocity.addScaledVector(pf.ex, -1.05 * vex);
        if (canMoveZ) player.position.addScaledVector(pf.ez, vez * dt); else player.velocity.addScaledVector(pf.ez, -1.05 * vez);
        if (SPHERE_WORLD) setAltAt(player.position, pf.alt);
      }
      player.position.addScaledVector(pf.up, vspeedOf(player.velocity, pf.up) * dt);
      chartFrameAt(player.position, pf);
      // SOLID SKY: rising into a slab's underside stops you cold. (They were
      // one-way catchers; "the sky platforms feel weird if they're not solid".)
      if (vspeedOf(player.velocity, pf.up) > 0) {
        const crown = pf.alt + 1.9;
        for (const slab of world.sky || EMPTY_SOLIDS) {
          const slabBottom = slab.top - (slab.body ?? (8 + slab.radius * .42));
          if (crown <= slabBottom || pf.alt >= slabBottom) continue;
          if (Math.hypot(pf.x - slab.x, pf.z - slab.z) >= slab.radius * .92) continue;
          setAltAt(player.position, slabBottom - 1.9);
          pf.alt = slabBottom - 1.9;
          setVspeed(player.velocity, pf.up, 0);
          break;
        }
      }
      const floor = world.floorHeight(pf.x, pf.z, pf.alt + 1.4);
      if (!player.grappling && pf.alt <= floor && vspeedOf(player.velocity, pf.up) <= 0) {
        const landingSpeed = -vspeedOf(player.velocity, pf.up);
        const wasAirborne = !player.grounded;
        setAltAt(player.position, floor);
        pf.alt = floor;
        setVspeed(player.velocity, pf.up, 0);
        player.grounded = true;
        player.jumpsUsed = 0;
        player.flung = 0;
        if (wasAirborne && landingSpeed > 4) {
          // THE SNOW COUNTRY: deep powder swallows the landing -- a white
          // poof instead of a kick and a shake.
          const onTerrain = floor - groundHeightAt(pf.x, pf.z) < 1.5;
          const snowiness = onTerrain && SPHERE_WORLD ? snowWeightAt(dirAt(player.position, this.tempC)) : 0;
          if (snowiness > .45) {
            world.particles.burst(player.position.clone().addScaledVector(pf.up, .12), 0xf4f8ff, Math.floor(10 + landingSpeed), 3 + landingSpeed * .14, .8, .12);
          } else {
            player.landingKick = clamp(landingSpeed / 16, .18, 1);
            this.shake = Math.max(this.shake, clamp(landingSpeed * .012, .05, .24));
            world.particles.burst(player.position.clone().addScaledVector(pf.up, .08), 0xc9d2df, Math.floor(7 + landingSpeed), 4 + landingSpeed * .22, .55, .02);
          }
        }
      } else if (pf.alt > floor + .04) {
        player.grounded = false;
      }
      for (const pad of world.launchPads) {
        if (pad.cooldown > 0 || Math.abs(pf.alt - pad.position.y) > 1.65) continue;
        if (Math.hypot(pf.x - pad.position.x, pf.z - pad.position.z) > pad.radius) continue;
        pad.cooldown = 1.05;
        setVspeed(player.velocity, pf.up, Math.max(vspeedOf(player.velocity, pf.up), pad.impulse));
        const launchForward = this.horizontalForward(new T.Vector3());
        player.velocity.addScaledVector(launchForward, 5.8);
        player.grounded = false;
        player.jumpsUsed = 0;
        this.addStyle(7, 230, 'MOONSPRING', '#83efff');
        world.particles.burst(chartLift(pad.position.x, pad.position.y + .35, pad.position.z, new T.Vector3()), 0x72efff, 28, 9, .72, .08);
        audio.jump(true);
        this.shake = Math.max(this.shake, .18);
      }
      // There is no fence. There is nowhere to fence: keep walking in any
      // direction and you arrive back where you started, because the moon is
      // a ball. Every version of this game until now ended at an invisible
      // wall, and that wall is a large part of what made it read as a table.
      // "Fell out of the world" has to mean fell through the ground under you,
      // not fell below a fixed altitude — otherwise a deep region like THE
      // HOLLOW would delete the player for successfully reaching its floor.
      const localGround = groundHeightAt(pf.x, pf.z);
      if (pf.alt < localGround - 30 || !Number.isFinite(pf.alt) || !Number.isFinite(pf.x + pf.z)) this.respawnPlayer();
      else if (SPHERE_WORLD) {
        // Parallel transport: carry the player's frame (and velocity, so the
        // vertical/horizontal split stays consistent) through the up change
        // this step produced. Input yaw is untouched -- cameraYawVelocity
        // must only ever see the mouse.
        const newUp = dirAt(player.position, this.playerUpScratch);
        this.transportQuat.setFromUnitVectors(player.up, newUp);
        player.frame.premultiply(this.transportQuat);
        player.velocity.applyQuaternion(this.transportQuat);
        player.up.copy(newUp);
      }
    }
    updateCamera(dt) {
      const player = this.player;
      const speed = tangentOf(player.velocity, player.up, this.tangentScratch).length();
      const bobAmount = player.grounded ? clamp(speed / 18, 0, 1) : 0;
      const bobY = Math.abs(Math.sin(player.runCycle * 1.9)) * .055 * bobAmount;
      const bobX = Math.sin(player.runCycle * .95) * .035 * bobAmount;
      this.shake = Math.max(0, this.shake - dt * 2.8);
      const shakeMagnitude = this.shake * this.shake;
      const shakeX = (cosmeticRandom() * 2 - 1) * shakeMagnitude * .055;
      const shakeY = (cosmeticRandom() * 2 - 1) * shakeMagnitude * .04;
      this.tangentScratch.set(bobX, player.eyeHeight + bobY - player.landingKick * .14, 0);
      if (SPHERE_WORLD) this.tangentScratch.applyQuaternion(player.frame);
      world.camera.position.copy(player.position).add(this.tangentScratch);
      const spinRoll = player.spinTimer > 0 ? player.spinDirection * .065 * clamp(player.spinTimer * 5, 0, 1) : 0;
      this.cameraRoll = damp(this.cameraRoll, spinRoll, 10, dt);
      // Three cameras face local -Z, so their visual Y rotation is the inverse
      // of the positive-right yaw used by movement, aim, and ball steering.
      // On the sphere the same yaw/pitch/roll composition happens inside the
      // player's transported frame; shake stays a small local-axis wobble.
      this.frameEuler.set(player.pitch + shakeY, -player.yaw + shakeX, this.cameraRoll, 'YXZ');
      world.camera.quaternion.setFromEuler(this.frameEuler);
      if (SPHERE_WORLD) world.camera.quaternion.premultiply(player.frame);
      const speedFov = smoothstep(6, 19, speed) * 8;
      const actionFov = (player.grappling ? 6 : 0) + (player.spinTimer > 0 ? 4 : 0);
      world.camera.fov = damp(world.camera.fov, 76 + speedFov + actionFov, 7.5, dt);
      world.camera.updateProjectionMatrix();
    }
    launchBall(charge, forcedDirection = null, redirected = false, grappleShot = false) {
      const ball = this.ball;
      const player = this.player;
      ball.grappleShot = grappleShot;
      const direction = forcedDirection ? forcedDirection.clone().normalize() : this.forwardFromView(new T.Vector3());
      const power = 24 + Math.pow(clamp(charge, 0, 1), .72) * 34;
      const launchChart = chartFrameAt(player.position, this.queryChart);
      const airborne = !player.grounded || launchChart.alt > world.floorHeight(launchChart.x, launchChart.z, launchChart.alt + 1) + .25;
      const meteor = !grappleShot && airborne && vspeedOf(direction, player.up) < -.36;
      ball.position.copy(world.camera.position).addScaledVector(direction, 1.25);
      ball.velocity.copy(direction).multiplyScalar(power).addScaledVector(player.velocity, .22);
      ball.mode = 'outbound';
      ball.flightTime = 0;
      ball.freeFlightTime = 0;
      ball.returnTime = 0;
      ball.launchCharge = charge;
      ball.lastFlightSpeed = power;
      ball.snapReturn = false;
      ball.emberHeat = 0;
      // Cores no longer change what the player can do. See CORES_ARE_TROPHIES.
      ball.comet = false;
      ball.outboundDuration = FEEL_PROFILE.outboundBase + charge * FEEL_PROFILE.outboundCharge;
      ball.maxRange = 46 + charge * 48;
      ball.launchOrigin.copy(player.position);
      ball.returnSide = this.stats.kicks % 2 === 0 ? 1 : -1;
      ball.anchor = null;
      ball.caughtBy = null;
      ball.bounceCount = 0;
      ball.curveBoost = 0;
      ball.flightSpinTimer = 0;
      ball.flightSpinDirection = ball.returnSide;
      ball.flightSpinPower = 1;
      ball.tetherPath.length = 0;
      ball.tetherPathLength = 0;
      ball.tetherWrapId = null;
      ball.spin = clamp(this.cameraYawVelocity * .65, -22, 22) + ball.returnSide * (5 + charge * 8);
      ball.collisionCooldown.clear();
      this.stats.kicks++;
      this.kickVisual = 1;
      this.shake = Math.max(this.shake, .12 + charge * .22);
      if (meteor) {
        setVspeed(player.velocity, player.up, Math.max(vspeedOf(player.velocity, player.up), 12.2 + charge * 4.2));
        player.jumpsUsed = Math.min(player.jumpsUsed, 1);
        this.stats.meteorKicks++;
        this.addStyle(17, 720, 'METEOR REBOUND', '#ffd66b');
      } else if (airborne) {
        this.addStyle(9, 330, redirected ? 'AIR REDIRECT' : 'AIR KICK', '#83efff');
      } else if (charge > .94) {
        this.addStyle(10, 430, 'FULL SEND', '#ffd66b');
      } else if (redirected) {
        this.addStyle(8, 300, 'REDIRECT', '#bf83ff');
      }
      world.particles.burst(ball.position, charge > .8 ? 0xffd66b : 0x7befff, 12 + Math.floor(charge * 14), 9 + charge * 11, .7, .15);
      audio.kick(charge);
    }
    queueKick(charge) {
      this.queuedKick = {
        charge: Math.max(.22, charge),
        // No stored ray: the volley fires along the CURRENT aim at catch time.
        // A direction frozen 1-2 s before the catch always felt off-target.
        expires: this.time + 4,
      };
      if (this.ball.mode === 'outbound') this.beginReturn('queued');
      if (this.ball.mode === 'caught') this.ball.snapTimer = Math.max(this.ball.snapTimer, .28);
      this.addStyle(4, 120);
    }
    startSpin(direction = 0, power = 1) {
      const player = this.player;
      const gesturePower = clamp(finite(Number(power)) || 1, .74, 1.25);
      const chosenDirection = Math.sign(finite(Number(direction))) || Math.sign(this.cameraYawVelocity) || (this.stats.spins % 2 === 0 ? 1 : -1);
      if (this.ball.mode !== 'ready') {
        const ball = this.ball;
        this.stats.spins++;
        audio.spin();
        ball.returnSide = chosenDirection;
        ball.spin += chosenDirection * (27 + gesturePower * 15);
        ball.curveBoost = Math.max(ball.curveBoost, 1 + gesturePower * .38);
        if (ball.mode === 'outbound') {
          ball.flightSpinTimer = FEEL_PROFILE.flightSpinBase + gesturePower * FEEL_PROFILE.flightSpinPower;
          ball.flightSpinDirection = chosenDirection;
          ball.flightSpinPower = gesturePower;
          // A loop bends the current throw; it never rewinds the throw clock.
          // That old reset was the main route to multi-second ball sabbaticals.
          this.addStyle(13, 560, chosenDirection > 0 ? 'CLOCKWISE AIRLINE' : 'COUNTER AIRLINE', '#bf83ff');
        } else if (ball.mode === 'returning') {
          this.addStyle(11, 440, chosenDirection > 0 ? 'RIGHT RETURN ARC' : 'LEFT RETURN ARC', '#bf83ff');
        } else if (ball.mode === 'caught') {
          ball.snapTimer += .2 + gesturePower * .16;
          this.addStyle(8, 260, 'LINE TORQUE', '#bf83ff');
        } else {
          this.addStyle(6, 180, 'TETHER TORQUE', '#bf83ff');
        }
        this.shake = Math.max(this.shake, .13);
        world.particles.burst(ball.position, 0xbd83ff, 22, 8, .72, .14);
        return true;
      }
      if (player.spinCooldown > 0) {
        this.queuedSpin = {
          direction: chosenDirection,
          power: gesturePower,
          expires: this.time + player.spinCooldown + .18,
        };
        return false;
      }
      this.queuedSpin = null;
      player.spinCooldown = .72 + gesturePower * .18;
      player.spinTimer = .62 + gesturePower * .2;
      player.spinAngle = 0;
      player.spinDirection = chosenDirection;
      player.spinPower = gesturePower;
      this.stats.spins++;
      audio.spin();
      if (this.ball.mode === 'ready') {
        const forward = this.forwardFromView(this.orbitForwardScratch);
        const right = this.horizontalRight(this.orbitRightScratch);
        const up = this.orbitUpScratch.copy(right).cross(forward).normalize();
        const center = this.orbitCenterScratch.copy(player.position).addScaledVector(player.up, player.eyeHeight)
          .addScaledVector(forward, 3.05).addScaledVector(up, -.15);
        const offset = this.orbitOffsetScratch.copy(this.ball.position).sub(center);
        const phase = Math.atan2(-offset.dot(up) / .68, offset.dot(right));
        player.spinAngle = phase * chosenDirection;
        this.ball.spin += chosenDirection * (22 + gesturePower * 14);
        const boostForward = this.horizontalForward(new T.Vector3());
        player.velocity.addScaledVector(boostForward, 2.7 + gesturePower * 1.25);
        let hits = 0;
        for (const enemy of this.enemies) {
          if (!enemy.alive || (enemy.summit && world.fracture.active) || enemy.position.distanceTo(player.position) > 4.7 + gesturePower * .55 + enemy.radius) continue;
          this.damageAlien(enemy, 1, 'spin');
          hits++;
        }
        let rocks = 0;
        for (const item of world.breakables) {
          if (!item.alive || item.position.distanceTo(player.position) > 6.4 + gesturePower * 1.4 + item.radius) continue;
          if (world.shatterBreakable(item, .82 + gesturePower * .15)) {
            this.stats.breaks++;
            rocks++;
          }
        }
        let structures = 0;
        for (const nest of world.nests) {
          if (!nest.alive || nest.position.distanceTo(player.position) > 7.8 + nest.radius) continue;
          if (world.damageNest(nest, 1, .8)) {
            this.stats.breaks++;
            structures++;
          }
        }
        for (const chime of world.moonChimes) {
          if (chime.used || chime.position.distanceTo(player.position) > 7.6 + chime.radius) continue;
          if (world.strikeChime(chime)) structures++;
        }
        const wrecked = hits + rocks + structures;
        this.addStyle(7 + hits * 5 + Math.min(10, rocks) + structures * 3, 220 + hits * 300 + rocks * 90 + structures * 280,
          wrecked ? `ORBIT SMASH x${wrecked}` : (chosenDirection > 0 ? 'CLOCKWISE ORBIT' : 'COUNTER ORBIT'), '#bf83ff');
        for (let index = 0; index < 10; index++) {
          const angle = index / 10 * TAU;
          const point = player.position.clone().add(new T.Vector3(Math.cos(angle) * 4.8, 1.1, Math.sin(angle) * 4.8));
          world.particles.burst(point, index % 2 ? 0xbd83ff : 0x72efff, 2, 4.5, .55, .04);
        }
      }
      this.shake = Math.max(this.shake, .17);
      world.particles.burst(player.position.clone().add(new T.Vector3(0, 1, 0)), 0xbd83ff, 24, 9, .78, .16);
      return true;
    }
    beginReturn(reason = 'auto') {
      const ball = this.ball;
      if (ball.mode === 'ready' || ball.mode === 'returning' || ball.mode === 'anchored' || ball.mode === 'caught') return;
      ball.mode = 'returning';
      ball.returnReason = reason;
      // A deliberately called ball (tap call or armed volley) keeps the hot
      // return profile for its entire flight — speed bonus, tight line, no
      // lazy side arc — instead of losing it when the input buffer expires.
      ball.snapReturn = reason === 'snap' || reason === 'queued';
      ball.returnTime = 0;
      ball.lastReturnDistance = ball.position.distanceTo(this.player.position);
      ball.lastTetherPathLength = Infinity;
      ball.returnStuck = 0;
      if (reason === 'snap' || reason === 'queued' || reason === 'spin') {
        world.particles.burst(ball.position, reason === 'spin' ? 0xbd83ff : 0x75efff, 14, 7, .55, .1);
      }
    }
    completeReturn() {
      const ball = this.ball;
      const player = this.player;
      const target = this.readyBallTarget(new T.Vector3());
      const incoming = ball.velocity.length();
      ball.mode = 'ready';
      ball.position.copy(target);
      ball.velocity.copy(player.velocity).multiplyScalar(.18);
      ball.snapReturn = false;
      ball.grappleShot = false;
      ball.comet = false;
      ball.emberHeat = 0;
      ball.flightTime = ball.freeFlightTime = ball.returnTime = 0;
      ball.anchor = null;
      ball.caughtBy = null;
      ball.bounceCount = 0;
      ball.curveBoost = 0;
      ball.flightSpinTimer = 0;
      ball.tetherPath.length = 0;
      ball.tetherPathLength = 0;
      ball.tetherWrapId = null;
      ball.lastTetherPathLength = Infinity;
      ball.spin *= .58;
      world.particles.burst(ball.position, 0x7ff3ff, incoming > 35 ? 16 : 8, 5.5, .48, .12);
      // CATCH-BOOST. The single best thing about this game is that the ball
      // comes screaming back to your hand, so catching it is now also how you
      // travel: a fast catch throws you where you are looking and refunds a
      // jump. Kick, steer, call it home, ride the catch — the loop the player
      // already loves IS the movement engine, and crossing the moon becomes
      // something you do with the ball rather than in spite of it.
      if (incoming > 26) {
        const boost = clamp((incoming - 26) * .46, 0, 19);
        const aim = this.forwardFromView(this.tempA);
        player.velocity.addScaledVector(aim, boost);
        setVspeed(player.velocity, player.up, Math.max(vspeedOf(player.velocity, player.up), boost * .42));
        player.jumpsUsed = Math.min(player.jumpsUsed, 1);
        player.grounded = false;
        this.shake = Math.max(this.shake, .1 + boost * .012);
        world.pulseRing(ball.position, new T.Color(0x9ff3ff), 3 + boost * .3, .26);
        if (incoming > 44) this.addStyle(9, 300, 'SLINGSHOT CATCH', '#83efff');
      }
      if (incoming > 38) this.addStyle(6, 190, 'HOME AT MACH', '#83efff');
      if (this.queuedKick) {
        const queued = this.queuedKick;
        this.queuedKick = null;
        if (queued.expires >= this.time) this.launchBall(queued.charge, null, true);
      }
    }
    readyBallTarget(target) {
      const forward = this.forwardFromView(this.readyForwardScratch);
      const right = this.horizontalRight(this.readyRightScratch);
      const up = this.readyUpScratch.copy(right).cross(forward).normalize();
      return target.copy(world.camera.position)
        // Cradle HOME directly below the aim ray. The ball now reads as the
        // thing being aimed rather than a floating right-side HUD ornament.
        .addScaledVector(forward, 3.15)
        .addScaledVector(up, -1)
        .addScaledVector(right, .05);
    }
    tetherOrigin(target) {
      const forward = this.forwardFromView(this.readyForwardScratch);
      const right = this.horizontalRight(this.readyRightScratch);
      const up = this.readyUpScratch.copy(right).cross(forward).normalize();
      return target.copy(world.camera.position)
        .addScaledVector(forward, .22)
        .addScaledVector(right, .28)
        .addScaledVector(up, -.34);
    }
    tetherEnd(target, origin) {
      const ball = this.ball;
      const travel = this.lineTravelScratch;
      if (ball.velocity.lengthSq() > 4) travel.copy(ball.velocity).normalize();
      else travel.copy(ball.position).sub(origin).normalize();
      return target.copy(ball.position).addScaledVector(travel, -ball.radius * .82);
    }
    buildTetherPath(active = this.lineActive) {
      const ball = this.ball;
      if (!active) {
        ball.tetherPath.length = 0;
        ball.tetherPathLength = 0;
        ball.tetherWrapId = null;
        return ball.tetherPath;
      }
      // The wrap solver runs in chart coordinates -- the space the platforms,
      // gate and fracture are authored in -- and the finished path is lifted
      // back to world points at the end. While flat, both maps are identity.
      const start = this.tetherOrigin(this.lineOriginScratch).clone();
      const end = toChartVec(this.tetherEnd(this.lineEndScratch, start).clone());
      toChartVec(start);
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const horizontalLengthSq = dx * dx + dz * dz;

      // The two authored progression walls are finite-height physical slabs.
      // When the line crosses one, carry the same authoritative path over its
      // cap. Returning physics consumes this path too, so the boomerang cannot
      // get trapped hammering the far face while its line lies about the route.
      let blockedBarrier = null;
      if (Math.abs(dz) > .001) {
        const barriers = [
          { id: 'gate', item: world.gate, halfDepth: 1.35 },
          { id: 'fracture', item: world.fracture, halfDepth: 2.4 },
        ];
        for (const barrier of barriers) {
          if (!barrier.item.active) continue;
          const t = (barrier.item.position.z - start.z) / dz;
          if (t <= .025 || t >= .975) continue;
          const crossingX = start.x + dx * t;
          const crossingY = start.y + (end.y - start.y) * t;
          const halfWidth = barrier.item.width / 2 + ball.radius;
          const halfHeight = barrier.item.height / 2 + ball.radius;
          if (Math.abs(crossingX - barrier.item.position.x) >= halfWidth
            || Math.abs(crossingY - barrier.item.position.y) >= halfHeight) continue;
          if (!blockedBarrier || t < blockedBarrier.t) blockedBarrier = { ...barrier, t, crossingX };
        }
      }
      if (blockedBarrier) {
        const { id, item, halfDepth, crossingX } = blockedBarrier;
        const side = Math.sign(start.z - item.position.z) || 1;
        const capY = item.position.y + item.height / 2 + ball.radius + .24;
        const clearZ = halfDepth + ball.radius + .24;
        const path = [
          start,
          new T.Vector3(crossingX, capY, item.position.z + side * clearZ),
          new T.Vector3(crossingX, capY, item.position.z - side * clearZ),
          end,
        ];
        if (SPHERE_WORLD) for (const point of path) fromChartVec(point);
        ball.tetherPath = path;
        ball.tetherPathLength = 0;
        for (let index = 1; index < path.length; index++) ball.tetherPathLength += path[index].distanceTo(path[index - 1]);
        ball.tetherWrapId = id;
        ball.tetherWrapSide = side;
        return path;
      }

      let blocked = null;
      if (horizontalLengthSq > .001) {
        for (const platform of world.platforms) {
          const radius = platform.radius * 1.22 + .12;
          const t = clamp(((platform.x - start.x) * dx + (platform.z - start.z) * dz) / horizontalLengthSq, 0, 1);
          if (t <= .025 || t >= .975) continue;
          const closestX = start.x + dx * t;
          const closestZ = start.z + dz * t;
          const distance = Math.hypot(closestX - platform.x, closestZ - platform.z);
          const crossingY = start.y + (end.y - start.y) * t;
          if (distance >= radius || crossingY > platform.top + .28) continue;
          const startDistance = Math.hypot(start.x - platform.x, start.z - platform.z);
          const endDistance = Math.hypot(end.x - platform.x, end.z - platform.z);
          if (startDistance <= radius + .02 || endDistance <= radius + .02) continue;
          if (!blocked || t < blocked.t) blocked = { platform, radius, t, startDistance, endDistance };
        }
      }

      let path = [start, end];
      if (blocked) {
        const { platform, radius, startDistance, endDistance } = blocked;
        const makeRoute = side => {
          const thetaStart = Math.atan2(start.z - platform.z, start.x - platform.x);
          const thetaEnd = Math.atan2(end.z - platform.z, end.x - platform.x);
          const alphaStart = Math.acos(clamp(radius / startDistance, -1, 1));
          const alphaEnd = Math.acos(clamp(radius / endDistance, -1, 1));
          const angleStart = thetaStart - side * alphaStart;
          const angleEnd = thetaEnd + side * alphaEnd;
          let delta = angleEnd - angleStart;
          if (side > 0) {
            while (delta > 0) delta -= TAU;
            while (delta <= -TAU) delta += TAU;
          } else {
            while (delta < 0) delta += TAU;
            while (delta >= TAU) delta -= TAU;
          }
          const steps = clamp(Math.ceil(Math.abs(delta) / (Math.PI / 10)), 2, 16);
          const route = [start];
          for (let index = 0; index <= steps; index++) {
            const progress = index / steps;
            const angle = angleStart + delta * progress;
            route.push(new T.Vector3(
              platform.x + Math.cos(angle) * (radius + .025),
              start.y + (end.y - start.y) * progress,
              platform.z + Math.sin(angle) * (radius + .025),
            ));
          }
          route.push(end);
          let length = 0;
          for (let index = 1; index < route.length; index++) length += route[index].distanceTo(route[index - 1]);
          return { route, length, side };
        };
        const positive = makeRoute(1);
        const negative = makeRoute(-1);
        let chosen;
        if (ball.tetherWrapId === platform.id) chosen = ball.tetherWrapSide > 0 ? positive : negative;
        else if (Math.abs(positive.length - negative.length) < .08) {
          const velocityCross = dx * ball.velocity.z - dz * ball.velocity.x;
          chosen = (Math.sign(velocityCross) || ball.returnSide || 1) > 0 ? positive : negative;
        } else chosen = positive.length < negative.length ? positive : negative;
        path = chosen.route;
        ball.tetherWrapId = platform.id;
        ball.tetherWrapSide = chosen.side;
      } else {
        ball.tetherWrapId = null;
      }
      if (SPHERE_WORLD) for (const point of path) fromChartVec(point);
      ball.tetherPath = path;
      ball.tetherPathLength = 0;
      for (let index = 1; index < path.length; index++) ball.tetherPathLength += path[index].distanceTo(path[index - 1]);
      return path;
    }
    refreshTetherEndpoints() {
      const path = this.ball.tetherPath;
      if (!this.lineActive || path.length < 2) return path;
      const origin = this.tetherOrigin(this.lineOriginScratch);
      path[0].copy(origin);
      path[path.length - 1].copy(this.tetherEnd(this.lineEndScratch, origin));
      this.ball.tetherPathLength = 0;
      for (let index = 1; index < path.length; index++) {
        this.ball.tetherPathLength += path[index].distanceTo(path[index - 1]);
      }
      return path;
    }
    orbitBallTarget(angle, power, target) {
      const forward = this.forwardFromView(this.orbitForwardScratch);
      const right = this.horizontalRight(this.orbitRightScratch);
      const up = this.orbitUpScratch.copy(right).cross(forward).normalize();
      const radius = 2.05 + power * .3;
      return target.copy(world.camera.position)
        .addScaledVector(forward, 3.05 + Math.sin(angle * 2) * .22)
        .addScaledVector(up, -.15)
        .addScaledVector(right, Math.cos(angle) * radius)
        .addScaledVector(up, -Math.sin(angle) * radius * .68);
    }
    updateBall(dt, frame) {
      const ball = this.ball;
      const player = this.player;
      const modeAtStart = ball.mode;
      for (const [key, value] of ball.collisionCooldown) {
        const next = value - dt;
        if (next <= 0) ball.collisionCooldown.delete(key); else ball.collisionCooldown.set(key, next);
      }
      ball.curveBoost = Math.max(0, ball.curveBoost - dt * .62);
      ball.flightSpinTimer = Math.max(0, ball.flightSpinTimer - dt);
      player.grappling = false;
      const previous = ball.position.clone();
      this.lineActive = this.lineHeld || ball.mode === 'returning' || ball.mode === 'anchored'
        || ball.mode === 'caught' || ball.flightSpinTimer > 0 || player.spinTimer > 0;
      this.buildTetherPath(this.lineActive);

      if (ball.mode === 'ready') {
        if (player.spinTimer > 0) {
          const angle = player.spinAngle * player.spinDirection;
          const target = this.orbitBallTarget(angle, player.spinPower, this.orbitTargetScratch);
          ball.position.lerp(target, 1 - Math.exp(-35 * dt));
          ball.velocity.copy(ball.position).sub(previous).multiplyScalar(1 / Math.max(dt, .0001));
          ball.spin += player.spinDirection * dt * 42;
        } else {
          const target = this.readyBallTarget(this.tempA);
          const spring = 1 - Math.exp(-dt * 22);
          ball.position.lerp(target, spring);
          ball.velocity.copy(player.velocity).multiplyScalar(.2);
          ball.spin = damp(ball.spin, 2.2, 4, dt);
        }
      } else if (ball.mode === 'outbound') {
        ball.flightTime += dt;
        if (frame.snap) this.beginReturn('snap');
        if (ball.mode === 'outbound') {
          const heldPastGrace = this.lineHeld && this.lineHoldTime > FEEL_PROFILE.controlledClockGrace;
          const controlledFlight = heldPastGrace || ball.flightSpinTimer > 0;
          ball.freeFlightTime += dt * (controlledFlight ? FEEL_PROFILE.controlledClockScale : 1);
          let speed = ball.velocity.length();
          if (speed > 5) {
            const currentDirection = ball.velocity.clone().normalize();
            const viewForward = this.forwardFromView(this.tempA);
            const cameraDistance = ball.position.distanceTo(world.camera.position);
            const guideDistance = clamp(cameraDistance + 10, 18, 95);
            const guidePoint = this.guidePointScratch.copy(world.camera.position).addScaledVector(viewForward, guideDistance);
            const desiredDirection = this.guideDirectionScratch.copy(guidePoint).sub(ball.position).normalize();
            if (ball.flightSpinTimer > 0) {
              const spinRadial = this.flightRadialScratch.copy(ball.position).sub(world.camera.position);
              spinRadial.addScaledVector(viewForward, -spinRadial.dot(viewForward));
              if (spinRadial.lengthSq() < .36) spinRadial.copy(this.horizontalRight(this.tempB)).multiplyScalar(2.25);
              const spinTangent = this.flightTangentScratch.copy(viewForward).cross(spinRadial).normalize()
                .multiplyScalar(ball.flightSpinDirection);
              // A loop changes the desired flight helix, not merely a force
              // that the ordinary aim solver erases one tick later.
              desiredDirection.addScaledVector(spinTangent, .28 + ball.flightSpinPower * .12).normalize();
            }
            // Direction-space steering must remain quick without erasing the
            // ball's inertia. RMB roughly doubles authority; a fast view sweep
            // adds a bounded impulse, while remote spin can still bend the path
            // instead of being normalized out on the following tick.
            const steerStrength = (this.lineHeld ? FEEL_PROFILE.linkedGuideStrength : FEEL_PROFILE.freeGuideStrength)
              + Math.min(5.2, Math.abs(this.cameraYawVelocity) * .16 + Math.abs(this.cameraPitchVelocity) * .12)
              + ball.curveBoost * 2.6;
            const steered = desiredDirection.sub(currentDirection);
            const maxSteer = steerStrength * dt;
            if (steered.length() > maxSteer) steered.setLength(maxSteer);
            currentDirection.add(steered).normalize();
            ball.velocity.copy(currentDirection).multiplyScalar(speed);
            ball.spin = damp(ball.spin, clamp(this.cameraYawVelocity * 1.45, -38, 38), 5.5, dt);
          }
          if (this.lineHeld && ball.tetherPath.length >= 2) {
            const pullTarget = ball.tetherPath[Math.max(0, ball.tetherPath.length - 2)];
            const pull = this.linePullScratch.copy(pullTarget).sub(ball.position);
            const pullDistance = pull.length();
            if (pullDistance > .001) {
              pull.multiplyScalar(1 / pullDistance);
              ball.velocity.addScaledVector(pull, (10 + Math.min(24, ball.tetherPathLength * .24)) * dt);
            }
          }
          if (ball.flightSpinTimer > 0) {
            const axis = this.forwardFromView(this.tempA);
            const cameraToBall = this.flightRadialScratch.copy(ball.position).sub(world.camera.position);
            const along = clamp(cameraToBall.dot(axis), 5, 100);
            const orbitCenter = this.guidePointScratch.copy(world.camera.position).addScaledVector(axis, along);
            const radial = this.flightRadialScratch.copy(ball.position).sub(orbitCenter);
            radial.addScaledVector(axis, -radial.dot(axis));
            if (radial.lengthSq() < .36) radial.copy(this.horizontalRight(this.tempB)).multiplyScalar(2.25);
            const radius = Math.max(.6, radial.length());
            const tangent = this.flightTangentScratch.copy(axis).cross(radial).normalize().multiplyScalar(ball.flightSpinDirection);
            const orbitForce = (38 + ball.flightSpinPower * 30) * smoothstep(0, .18, ball.flightSpinTimer);
            ball.velocity.addScaledVector(tangent, orbitForce * dt);
            ball.velocity.addScaledVector(radial, -(9 + ball.flightSpinPower * 5) / radius * dt);
            ball.spin += ball.flightSpinDirection * dt * (34 + ball.flightSpinPower * 22);
          }
          if (ball.velocity.length() > 72) ball.velocity.setLength(72);
          ball.velocity.addScaledVector(upAt(ball.position, this.ballUpScratch),
            -(this.lineHeld ? FEEL_PROFILE.controlledGravity : FEEL_PROFILE.freeGravity) * dt);
          ball.position.addScaledVector(ball.velocity, dt);
          const separation = ball.position.distanceTo(player.position);
          speed = ball.velocity.length();
          ball.lastFlightSpeed = speed;
          if (this.lineHeld && separation < 1.8 && ball.tetherWrapId === null) this.completeReturn();
          else {
            const hardAwayLimit = FEEL_PROFILE.hardAwayBase + ball.launchCharge * FEEL_PROFILE.hardAwayCharge;
            if (ball.freeFlightTime >= ball.outboundDuration
              || ball.flightTime >= hardAwayLimit
              || separation >= ball.maxRange * (this.lineHeld ? FEEL_PROFILE.linkedRangeMultiplier : 1)
              || (ball.bounceCount > 0 && ball.freeFlightTime > FEEL_PROFILE.bounceReturnTime)
              || speed < 4.5) this.beginReturn('auto');
          }
        }
      }

      if (ball.mode === 'returning') {
        ball.returnTime += dt;
        const wrapped = ball.tetherWrapId !== null && ball.tetherPath.length > 2;
        const target = wrapped
          ? ball.tetherPath[Math.max(1, ball.tetherPath.length - 2)].clone()
          : this.readyBallTarget(new T.Vector3());
        const toTarget = target.sub(ball.position);
        const distance = toTarget.length();
        const direction = distance > .001 ? toTarget.multiplyScalar(1 / distance) : new T.Vector3(0, 0, -1);
        const right = this.horizontalRight(this.tempB);
        const snap = ball.snapReturn || frame.snap || frame.line ? 1 : 0;
        const arcEnvelope = smoothstep(2.5, 12, distance) * (1 - smoothstep(38, 65, distance));
        const arc = ball.returnSide * arcEnvelope * (7.5 + Math.min(9, distance * .16)) * (1 - snap * .76);
        // MOONBREAK 2.1's return law: never slower than the floor, keep most of
        // the speed the throw earned, and never decelerate on approach. The old
        // distance-proportional formula made the last ten metres a slow swoop.
        const earnedSpeed = Math.max(FEEL_PROFILE.returnSpeedFloor, (ball.lastFlightSpeed || 0) * FEEL_PROFILE.returnSpeedRetention);
        const snapReach = snap * Math.max(0, distance - FEEL_PROFILE.returnSnapReachStart) * FEEL_PROFILE.returnSnapReachRate;
        const desiredSpeed = Math.min(
          snap ? FEEL_PROFILE.returnSnapCap : FEEL_PROFILE.returnSpeedCap,
          earnedSpeed + snap * FEEL_PROFILE.returnSnapBonus + snapReach + ball.curveBoost * 12);
        const desiredVelocity = direction.multiplyScalar(desiredSpeed).addScaledVector(right, arc);
        const bendRate = snap ? FEEL_PROFILE.returnSnapBendRate : FEEL_PROFILE.returnBendRate;
        ball.velocity.lerp(desiredVelocity, 1 - Math.exp(-bendRate * dt));
        ball.position.addScaledVector(ball.velocity, dt);
        ball.spin = damp(ball.spin, ball.returnSide * (19 + arc * .55), 8, dt);
        const nowDistance = ball.position.distanceTo(player.position);
        const returnProgressDistance = wrapped ? ball.tetherPathLength : nowDistance;
        const previousProgressDistance = wrapped ? ball.lastTetherPathLength : ball.lastReturnDistance;
        if (returnProgressDistance >= previousProgressDistance - .025) ball.returnStuck += dt;
        else ball.returnStuck = Math.max(0, ball.returnStuck - dt * 1.7);
        ball.lastReturnDistance = nowDistance;
        ball.lastTetherPathLength = returnProgressDistance;
        audio.recall(true, clamp(nowDistance / 42, 0, 1));
        if ((!wrapped && (distance < .72 || nowDistance < 1.45))
          || ball.returnTime > FEEL_PROFILE.returnFallback || ball.returnStuck > FEEL_PROFILE.returnStuckFallback) this.completeReturn();
      } else if (ball.mode === 'anchored') {
        this.updateAnchoredBall(dt, frame);
      } else if (ball.mode === 'caught') {
        this.updateCaughtBall(dt, frame);
      } else {
        audio.recall(false, 0);
      }

      if (ball.mode === 'outbound' || ball.mode === 'returning') {
        this.resolveBallWorld(previous);
        this.resolveBallEnemies();
        this.resolveBallRoc();
        this.resolveBallColossus();
        this.resolveBallCrust();
        this.resolveBallMoonheart();
      }
      const nextLineActive = this.lineHeld || ball.mode === 'returning' || ball.mode === 'anchored'
        || ball.mode === 'caught' || ball.flightSpinTimer > 0 || player.spinTimer > 0;
      // The path solved at tick entry is the authoritative physics/render path.
      // Re-solve only when the tick changed state or line visibility; ordinary
      // flight must not allocate and scan the same colliders two or three times.
      const lineStateChanged = nextLineActive !== this.lineActive;
      this.lineActive = nextLineActive;
      if (ball.mode !== modeAtStart || lineStateChanged) this.buildTetherPath(this.lineActive);
      this.updateBallTrail(dt);
    }
    updateAnchoredBall(dt, frame) {
      const ball = this.ball;
      const anchor = ball.anchor;
      if (!anchor) {
        ball.mode = 'returning';
        return;
      }
      // Anchor positions are world points (authored sockets get lifted onto
      // the sphere with the rest of the content; grapple pitons are born in
      // world space). The ball hangs there and bobs along the local vertical.
      const anchorWorld = anchor.position;
      ball.position.copy(anchorWorld);
      ball.position.addScaledVector(dirAt(anchorWorld, this.ballUpScratch), Math.sin(this.time * 8) * .13);
      ball.velocity.set(0, 0, 0);
      // A grapple bite is reeled with the same button that set it. Ordinary
      // route anchors keep their original line/call grammar untouched.
      const reeling = frame.line || frame.snap || (anchor.synthetic && this.grappleReel > 0);
      if (reeling) {
        const nextTarget = ball.tetherPath[1] || anchorWorld;
        const toAnchor = nextTarget.clone().sub(this.player.position);
        const distance = this.player.position.distanceTo(anchorWorld);
        const pathDistance = Math.max(distance, ball.tetherPathLength);
        const direction = toAnchor.lengthSq() > .001 ? toAnchor.normalize() : this.player.up.clone();
        const desiredSpeed = Math.min(34, (17 + pathDistance * .42) * (.9 + ball.anchorCharge * .24));
        const desiredVelocity = direction.multiplyScalar(desiredSpeed);
        this.player.velocity.lerp(desiredVelocity, 1 - Math.exp(-dt * 9.2));
        this.player.grappling = true;
        this.player.grounded = false;
        this.player.jumpsUsed = Math.min(this.player.jumpsUsed, 1);
        this.shake = Math.max(this.shake, .055 + clamp(distance / 80, 0, .08));
        audio.recall(true, clamp(distance / 45, 0, 1));
        if (pathDistance < ball.lastTetherPathLength - .025) ball.anchorTimer = Math.max(0, ball.anchorTimer - dt * .55);
        else ball.anchorTimer += dt * .18;
        ball.lastTetherPathLength = pathDistance;
        if (cosmeticRandom() < dt * 42) world.particles.burst(this.player.position.clone().addScaledVector(this.player.up, 1), 0x7befff, 1, 2.5, .35, 0);
        if (distance < 3.35 && ball.tetherWrapId === null) {
          const firstLink = !anchor.used;
          anchor.used = true;
          this.player.grappling = false;
          setVspeed(this.player.velocity, this.player.up, Math.max(vspeedOf(this.player.velocity, this.player.up), 11.2));
          this.player.jumpsUsed = 0;
          ball.anchor = null;
          ball.mode = 'returning';
          ball.returnTime = 0;
          ball.velocity.copy(this.player.velocity).multiplyScalar(.55);
          ball.lastReturnDistance = ball.position.distanceTo(this.player.position);
          if (firstLink) {
            this.stats.anchorLinks++;
            const platform = world.platforms[anchor.index];
            chartLift(platform.x, platform.top + .1, platform.z + 1.5, this.player.checkpoint);
            this.saveCheckpointFrame();
            this.addStyle(18 + anchor.index * 2, 850 + anchor.index * 160, `SLING LINK ${anchor.index + 1}/4`, anchor.index === 3 ? '#ffd66b' : '#83efff');
            world.particles.burst(anchorWorld, anchor.index === 3 ? 0xffd66b : 0x7befff, 34, 13, .9, .3);
            audio.impact(1, 'anchor');
            this.shake = Math.max(this.shake, .24);
          } else {
            this.addStyle(8, 260, 'GRAVITY SLING', '#83efff');
            world.particles.burst(anchorWorld, 0x7befff, 18, 9, .6, .18);
            audio.impact(.7, 'anchor');
            this.shake = Math.max(this.shake, .16);
          }
        }
      } else {
        this.player.grappling = false;
        audio.recall(false, 0);
        ball.anchorTimer += dt;
        ball.lastTetherPathLength = ball.tetherPathLength;
        if (ball.anchorTimer > 4.8) {
          ball.anchor = null;
          ball.mode = 'returning';
          ball.returnTime = 0;
          ball.lastReturnDistance = ball.position.distanceTo(this.player.position);
        }
      }
    }
    updateCaughtBall(dt, frame) {
      const ball = this.ball;
      const enemy = ball.caughtBy;
      if (!enemy || !enemy.alive) {
        ball.caughtBy = null;
        ball.mode = 'returning';
        return;
      }
      ball.catchTimer += dt;
      if (frame.line || frame.snap) ball.snapTimer += dt;
      else ball.snapTimer = Math.max(0, ball.snapTimer - dt * 1.2);
      const front = this.enemyFront(enemy, this.tempA);
      fromChartVec(ball.position.copy(enemy.position));
      ball.position.addScaledVector(dirAt(ball.position, this.ballUpScratch), enemy.type === 'warden' ? 2.8 : 1.8).addScaledVector(front, enemy.radius + .72);
      ball.velocity.set(0, 0, 0);
      ball.spin += dt * 6;
      const snapFree = ball.snapTimer > .38;
      const autoFree = ball.catchTimer > 1.05;
      audio.recall(true, clamp(Math.max(ball.snapTimer / .38, ball.catchTimer / 1.05), 0, 1));
      if (snapFree || autoFree) {
        const direction = this.player.position.clone().addScaledVector(this.player.up, 1.2).sub(ball.position).normalize();
        ball.caughtBy = null;
        ball.mode = 'returning';
        ball.snapReturn = snapFree;
        ball.catchTimer = ball.snapTimer = 0;
        ball.velocity.copy(direction).multiplyScalar(snapFree ? 46 : 32);
        ball.returnTime = 0;
        ball.lastReturnDistance = ball.position.distanceTo(this.player.position);
        enemy.catchCooldown = 1.15;
        enemy.stun = snapFree ? .6 : .3;
        if (snapFree) {
          this.addStyle(19, 920, 'RIPPED FREE', '#bf83ff');
          world.particles.burst(ball.position, 0x81efff, 28, 14, .8, .18);
          audio.spin();
          this.shake = Math.max(this.shake, .28);
        }
      }
    }
    // Shared cylinder-side resolution for every standing solid on the moon.
    // `restitution` of 0 means "use the column's own bounce", which is how a
    // glass spire can return more energy than a rock does.
    resolveBallColumns(columns, previous, restitution, tint, material) {
      const ball = this.ball;
      // The cylinder sides are worked in chart space -- the coordinates the
      // columns are authored in. Push-outs re-lift through the local tangent
      // frame, so on the sphere every column stands along its own vertical.
      for (const platform of columns) {
        const bc = chartFrameAt(ball.position, this.ballChart);
        if (bc.alt - ball.radius >= platform.top - .35) continue;
        const sideRadius = platform.radius * 1.03 + ball.radius;
        const vex = ball.velocity.dot(bc.ex);
        const vez = ball.velocity.dot(bc.ez);
        let dx = bc.x - platform.x;
        let dz = bc.z - platform.z;
        let distance = Math.hypot(dx, dz);
        if (distance >= sideRadius) continue;
        if (distance < 1e-5) {
          const pc = chartAt(previous, this.queryChart);
          dx = pc.x - platform.x;
          dz = pc.z - platform.z;
          distance = Math.hypot(dx, dz);
          if (distance < 1e-5) {
            dx = -vex;
            dz = -vez;
            distance = Math.hypot(dx, dz) || 1;
          }
        }
        const nx = dx / distance;
        const nz = dz / distance;
        chartLift(platform.x + nx * sideRadius, bc.alt, platform.z + nz * sideRadius, ball.position);
        const along = vex * nx + vez * nz;
        if (along >= 0) continue;
        const worldNormal = this.pitonNormalScratch.copy(bc.ex).multiplyScalar(nx).addScaledVector(bc.ez, nz);
        this.noteBallContact(ball.position, worldNormal);
        if (this.tryPiton(ball.position, worldNormal)) return;
        const bounce = restitution || platform.bounce || 1.78;
        ball.velocity.addScaledVector(bc.ex, -nx * along * bounce).addScaledVector(bc.ez, -nz * along * bounce);
        setVspeed(ball.velocity, bc.up, vspeedOf(ball.velocity, bc.up) * .985);
        ball.spin += (ball.velocity.dot(bc.ex) * nz - ball.velocity.dot(bc.ez) * nx) * .08;
        ball.bounceCount++;
        this.onBallBounce(ball.position);
        const key = `pillar-${platform.id}`;
        if (!ball.collisionCooldown.has(key)) {
          ball.collisionCooldown.set(key, .1);
          world.particles.burst(ball.position, tint, 12, 8, .48, .08);
          audio.impact(clamp(Math.abs(along) / 38, .2, 1), material);
        }
      }
    }
    // The slabs are SOLID for the ball too: the deck is ground (floorHeight
    // already says so), and the sides and underside reflect -- or BITE, if
    // this flight is a grapple: sticking under a slab and reeling up onto it
    // is now the sky-climb verb. No trap is possible: a ball pinging between
    // a slab and anything else trips the double-bounce return clock, and a
    // returning ball that stops making progress teleports home on the
    // return-stuck fallback, same as always. Returns true if the ball bit.
    resolveBallSlabs() {
      const ball = this.ball;
      for (const slab of world.sky || EMPTY_SOLIDS) {
        const bc = chartFrameAt(ball.position, this.ballChart);
        const slabBottom = slab.top - (slab.body ?? (8 + slab.radius * .42));
        if (bc.alt - ball.radius >= slab.top - .35 || bc.alt + ball.radius <= slabBottom) continue;
        const dx = bc.x - slab.x;
        const dz = bc.z - slab.z;
        const side = Math.hypot(dx, dz);
        const sideRadius = slab.radius * .92 + ball.radius;
        if (side >= sideRadius) continue;
        const key = `slab-${slab.id}`;
        const underPenetration = bc.alt + ball.radius - slabBottom;
        const sidePenetration = sideRadius - side;
        if (underPenetration < sidePenetration && vspeedOf(ball.velocity, bc.up) > 0) {
          setAltAt(ball.position, slabBottom - ball.radius);
          const downNormal = this.pitonNormalScratch.copy(bc.up).multiplyScalar(-1);
          this.noteBallContact(ball.position, downNormal);
          if (this.tryPiton(ball.position, downNormal)) return true;
          const vy = vspeedOf(ball.velocity, bc.up);
          setVspeed(ball.velocity, bc.up, vy * -.7);
          ball.bounceCount++;
          this.onBallBounce(ball.position);
          if (!ball.collisionCooldown.has(key)) {
            ball.collisionCooldown.set(key, .12);
            world.particles.burst(ball.position, 0xaab4c4, 8, 6, .45, .05);
            audio.impact(clamp(Math.abs(vy) / 30, .15, .8), 'rock');
          }
          continue;
        }
        if (side <= 1e-5) continue;
        const nx = dx / side;
        const nz = dz / side;
        chartLift(slab.x + nx * sideRadius, bc.alt, slab.z + nz * sideRadius, ball.position);
        const vex = ball.velocity.dot(bc.ex);
        const vez = ball.velocity.dot(bc.ez);
        const along = vex * nx + vez * nz;
        if (along >= 0) continue;
        const worldNormal = this.pitonNormalScratch.copy(bc.ex).multiplyScalar(nx).addScaledVector(bc.ez, nz);
        this.noteBallContact(ball.position, worldNormal);
        if (this.tryPiton(ball.position, worldNormal)) return true;
        ball.velocity.addScaledVector(bc.ex, -nx * along * 1.78).addScaledVector(bc.ez, -nz * along * 1.78);
        ball.bounceCount++;
        this.onBallBounce(ball.position);
        if (!ball.collisionCooldown.has(key)) {
          ball.collisionCooldown.set(key, .12);
          audio.impact(clamp(Math.abs(along) / 38, .15, .9), 'rock');
        }
      }
      return false;
    }
    // The ball is the hand, so the ball is what picks things up -- but walking
    // into a drop counts too. Making the player miss a collectible they walked
    // straight through would be a rule nobody asked for.
    collectMoondrops() {
      const drops = world.moondrops;
      if (!drops) return;
      const ball = this.ball.position;
      const player = this.player.position;
      // Magnet reach: shoot the ball NEAR a crescent and it takes it. Only a
      // ball IN FLIGHT magnetizes; carried, it keeps the old close reach so
      // walking into a drop is still the player's own act.
      const flying = this.ball.mode === 'outbound' || this.ball.mode === 'returning';
      const ballReach = flying ? 6.2 + this.ball.velocity.length() * .03 : 2.4;
      const ballReachSq = ballReach * ballReach;
      for (const drop of drops) {
        if (!drop.alive) continue;
        const taken = drop.position.distanceToSquared(ball) < ballReachSq
          || drop.position.distanceToSquared(player) < 7.3;
        if (!taken || !world.takeMoondrop(drop)) continue;
        this.drops++;
        this.score += 60;
        audio.score(false);
        // Every sixth is worth a beat of its own: the ball visibly gains a
        // ring of light, and a run of five feels like it is building to it.
        if (this.drops % 6 === 0) {
          this.shake = Math.max(this.shake, .12);
          world.pulseRing(ball, new T.Color(0x9defff), 6.5, .42);
        }
      }
      // FULL MOONS: worth five, and the take is worth a real beat.
      if (world.fullmoons) {
        const moonReachSq = (flying ? ballReach + 1.6 : 3.4) ** 2;
        for (const moon of world.fullmoons) {
          if (!moon.alive) continue;
          const taken = moon.position.distanceToSquared(ball) < moonReachSq
            || moon.position.distanceToSquared(player) < 10.9;
          if (!taken || !world.takeFullMoon(moon)) continue;
          this.drops += 5;
          this.score += 400;
          this.stats.fullmoons = (this.stats.fullmoons || 0) + 1;
          audio.score(true);
          this.shake = Math.max(this.shake, .16);
          world.pulseRing(ball, new T.Color(0xf6f4ff), 9, .5);
        }
      }
    }
    // Every ball contact is remembered for a moment, so pressing the grapple
    // just AFTER the bounce works exactly as well as pressing it just before.
    noteBallContact(contact, normal = null) {
      this.lastContact = this.lastContact || { position: new T.Vector3(), normal: new T.Vector3(), time: -99 };
      this.lastContact.position.copy(contact);
      if (normal) this.lastContact.normal.copy(normal); else this.lastContact.normal.copy(UP);
      this.lastContact.time = this.time;
    }
    // Pressing the button: holding it is what arms the grapple, so all this
    // has to do is catch a bounce that already happened a moment ago.
    pressGrapple() {
      this.grappleArmed = GRAPPLE_PROFILE.releaseTail;
      const ball = this.ball;
      if (ball.mode !== 'outbound') return false;
      const memory = this.lastContact;
      if (!memory || this.time - memory.time > GRAPPLE_PROFILE.contactMemory) return false;
      if (ball.position.distanceTo(memory.position) > GRAPPLE_PROFILE.contactMemoryDistance) return false;
      return this.tryPiton(memory.position, memory.normal);
    }
    // THE GRAPPLE turns every surface on the moon into an anchor socket.
    // It reuses the sling machinery wholesale: a synthetic anchor marked
    // `used` so it grants the pull without claiming a route checkpoint.
    tryPiton(contact, normal = null) {
      const ball = this.ball;
      if (ball.mode !== 'outbound') return false;
      // Sticking is a DECISION, not a property of the ball: either this flight
      // IS a grapple shot (middle click threw it), or the button is armed.
      // Without that, every bounce you ever make would stick, which is a
      // downgrade dressed as an upgrade.
      if (this.grappleArmed <= 0 && !ball.grappleShot) return false;
      if (this.pitonCooldown > 0) return false;
      const position = contact.clone();
      if (normal) position.addScaledVector(normal, ball.radius * .6);
      ball.mode = 'anchored';
      ball.anchor = { id: 'piton', index: -1, position, used: true, synthetic: true };
      ball.anchorCharge = ball.launchCharge;
      ball.anchorTimer = 0;
      ball.lastTetherPathLength = Infinity;
      ball.velocity.set(0, 0, 0);
      ball.position.copy(position);
      this.pitonCooldown = GRAPPLE_PROFILE.cooldown;
      // The reel keeps running for a beat after you let go, so a fumbled
      // button never drops you mid-swing.
      this.grappleReel = Math.max(this.grappleReel, GRAPPLE_PROFILE.reelGrace);
      this.lineActive = true;
      this.buildTetherPath(true);
      world.pulseRing(position, new T.Color(BALL_CORES.piton.color), 4.5, .3);
      world.particles.burst(position, BALL_CORES.piton.color, 18, 8, .5, .1);
      audio.impact(.8, 'anchor');
      this.addStyle(6, 180, 'PITON', '#63f0ff');
      return true;
    }
    // One place decides what a bounce is worth.
    //
    // Baseline: a bounce loses almost nothing. The ball is supposed to ping
    // between things standing near each other, and a ball that sheds a third
    // of its speed on every contact dies after two hits and stops being fun.
    // EMBER then turns "keeps its pace" into "gains pace" as a real upgrade.
    onBallBounce(position) {
      const ball = this.ball;
      const speed = ball.velocity.length();
      if (speed < 6) return;
      // EMBER used to raise this gain and cap. See CORES_ARE_TROPHIES.
      const next = Math.min(58, Math.max(speed, speed * 1.06));
      ball.velocity.setLength(next);
      // A bounce is a beat: the ball flashes and the surface rings, so
      // ricochet chains read as a rhythm you are playing rather than noise.
      world.pulseRing(position, new T.Color(0xbfe6ff), 2.2, .18);
    }
    resolveBallWorld(previous) {
      const ball = this.ball;
      const bc = chartFrameAt(ball.position, this.ballChart);
      const floor = world.floorHeight(bc.x, bc.z, bc.alt + 1);
      if (bc.alt - ball.radius < floor) {
        const up = bc.up;
        const impact = Math.max(0, -vspeedOf(ball.velocity, up));
        setAltAt(ball.position, floor + ball.radius);
        // No impact threshold on the grapple: a gentle touchdown is still a
        // surface, and "it only bites if you hit hard enough" is exactly the
        // invisible rule that made the old version feel like luck.
        // The reflection axis is the LOCAL VERTICAL, not the terrain normal --
        // the flat build reflected about +Y even on slopes, and that behavior
        // is part of how banking off the ground feels.
        this.noteBallContact(ball.position, up);
        if (this.tryPiton(ball.position, up)) return;
        const vy = vspeedOf(ball.velocity, up);
        if (vy < 0) setVspeed(ball.velocity, up, vy * -.7);
        const keptVy = vspeedOf(ball.velocity, up);
        const tangential = tangentOf(ball.velocity, up, this.tempC).multiplyScalar(.965);
        ball.velocity.copy(tangential).addScaledVector(up, keptVy);
        if (impact > 5) {
          ball.bounceCount++;
          this.onBallBounce(ball.position);
          world.particles.burst(ball.position.clone().addScaledVector(up, -ball.radius), 0xbfc6d2, 5 + Math.floor(impact), 4 + impact * .35, .5, .05);
          audio.impact(clamp(impact / 28, .15, 1), 'rock');
          if (impact > 16) this.addStyle(3, 90, 'LUNAR BANK', '#83efff');
        }
      }

      // The climb pillars are true world solids for the signature ball too.
      // Resolve their cylindrical sides before route anchors so a fast kick can
      // bank around the mesa but cannot ghost through tens of metres of rock.
      this.resolveBallColumns(world.platforms, previous, 1.78, 0xc7d0dc, 'rock');
      // Region geometry answers the same way, but glass gives the ball MORE
      // than it arrived with — that is the whole point of THE GLASSWORKS.
      const regionGate = chartAt(ball.position, this.queryChart);
      this.resolveBallColumns(world.regionSolids(regionGate.x, regionGate.z), previous, 0, 0x9ff4ff, 'glass');
      if (this.resolveBallSlabs()) return;

      const gc = chartFrameAt(ball.position, this.ballChart);
      if (world.gate.active && Math.abs(gc.z - world.gate.position.z) < 1.35 + ball.radius && Math.abs(gc.x) < world.gate.width / 2 + ball.radius && Math.abs(gc.alt - world.gate.position.y) < world.gate.height / 2 + ball.radius) {
        chartLift(gc.x, gc.alt, chartAt(previous, this.queryChart).z, ball.position);
        ball.velocity.addScaledVector(gc.ez, ball.velocity.dot(gc.ez) * -2.02);
        ball.bounceCount++;
        // Refused — and the refusal points at its own cause: the leash to the
        // sentinel lights up and the sentinel's weak core flares.
        this.impact('locked', ball.position, 0x72edff);
        world.gate.leashFlash = 1;
        if (this.shieldEnemy?.alive) this.shieldEnemy.weakPulse = 1.6;
      }
      const fc = chartFrameAt(ball.position, this.ballChart);
      if (world.fracture.active && Math.abs(fc.z - world.fracture.position.z) < 2.4 + ball.radius && Math.abs(fc.x) < world.fracture.width / 2 + ball.radius && Math.abs(fc.alt - world.fracture.position.y) < world.fracture.height / 2 + ball.radius) {
        const speed = ball.velocity.length();
        // It is a WALL. You knock chunks out of it until it falls down. It was
        // previously a progression door with four invisible unlock conditions
        // wearing breakable-rock paint, and it is the single object on this
        // moon that confused its player most. Now every solid hit visibly
        // removes a piece, so the wall answers the only question that matters:
        // "is this working?" — yes, and here is how much is left.
        if (speed > 12 && !ball.collisionCooldown.has('fracture')) {
          ball.collisionCooldown.set('fracture', .18);
          const heavy = speed > 34 || ball.launchCharge > .7 ? 2 : 1;
          world.chipFracture(heavy, ball.position);
          this.stats.breaks++;
          if (world.fracture.active) {
            this.impact('hurt', ball.position, 0xd9a4ff);
            this.addStyle(4, 130);
          } else {
            this.impact('break', ball.position, 0xffd66b);
            this.addStyle(26, 2200, 'MOONBREAKER', '#ffd66b');
            this.shake = Math.max(this.shake, .78);
          }
        }
        if (world.fracture.active) {
          chartLift(fc.x, fc.alt, chartAt(previous, this.queryChart).z, ball.position);
          ball.velocity.addScaledVector(fc.ez, ball.velocity.dot(fc.ez) * -2.06);
          ball.bounceCount++;
          this.onBallBounce(ball.position);
        }
      }

      for (const item of world.breakables) {
        if (!item.alive || ball.collisionCooldown.has(item.id)) continue;
        const distance = item.position.distanceTo(ball.position);
        if (distance > item.radius + ball.radius) continue;
        const speed = ball.velocity.length();
        // One law the player can trust: a moving ball breaks a moonrock. The
        // old 10 m/s gate let slow rebounds nudge rocks that "should" shatter.
        if (speed > 6) {
          world.shatterBreakable(item, clamp(speed / 38, .2, 1));
          ball.collisionCooldown.set(item.id, .16);
          this.stats.breaks++;
          this.impact('break', item.position, item.reward ? 0x7befff : 0xc7d0dc);
          this.addStyle(2, 80, speed > 36 ? 'SHARD LINE' : null, '#c7d0dc');
          // Keep the pace so the ball carries on into the next one instead of
          // dying in the rubble of the first.
          if (!ball.comet) ball.velocity.setLength(Math.max(speed * .94, 18));
          continue;
        }
        // A comet does not get deflected by scenery: it goes through.
        if (ball.comet) continue;
        const normal = ball.position.clone().sub(item.position).normalize();
        const along = ball.velocity.dot(normal);
        if (along < 0) ball.velocity.addScaledVector(normal, -1.7 * along);
        ball.position.addScaledVector(normal, item.radius + ball.radius - distance + .02);
        this.onBallBounce(ball.position);
      }

      {
        const ballSpeedSq = ball.velocity.lengthSq();
        if (ballSpeedSq > 36) {
          const impact = clamp(Math.sqrt(ballSpeedSq) / 38, .15, 1);
          for (const field of [world.rockFieldData, world.outerRockData]) {
            if (!field) continue;
            for (const rock of field) {
              if (!rock.alive) continue;
              if (ball.position.distanceToSquared(rock.position) > rock.hitRadiusSq) continue;
              if (!world.smashFieldRock(rock, impact)) continue;
              this.stats.breaks++;
              this.impact('break', rock.position, 0xc7d0dc);
            }
          }
        }
      }

      for (const nest of world.nests) {
        if (!nest.alive || ball.collisionCooldown.has(nest.id)) continue;
        const distance = nest.position.distanceTo(ball.position);
        if (distance > nest.radius + ball.radius) continue;
        const speed = ball.velocity.length();
        const normal = ball.position.clone().sub(nest.position).normalize();
        if (speed > 8) {
          // The gold octahedron on top is a REAL weak point now. It always
          // advertised double damage and never checked where the ball hit.
          const nestUp = dirAt(nest.position, this.ballUpScratch);
          const nestRel = this.tempC.copy(ball.position).sub(nest.position);
          const nestLift = nestRel.dot(nestUp);
          const weakHit = nestLift > 1.1
            && nestRel.addScaledVector(nestUp, -nestLift).length() < 1.5;
          const damage = weakHit || ball.mode === 'returning' || ball.launchCharge > .86 || speed > 45 ? 2 : 1;
          if (weakHit) {
            this.addStyle(6, 240, 'WEAK CORE', '#ffd66b');
            world.particles.burst(nest.position.clone().addScaledVector(nestUp, 2.9), 0xffd66b, 16, 9, .6, .16);
          }
          const destroyed = world.damageNest(nest, damage, clamp(speed / 42, .25, 1));
          ball.collisionCooldown.set(nest.id, .24);
          const along = ball.velocity.dot(normal);
          if (along < 0) ball.velocity.addScaledVector(normal, -1.38 * along);
          this.impact(destroyed ? 'break' : 'hurt', nest.position, 0xbd83ff);
          if (destroyed) {
            this.stats.breaks++;
            this.addStyle(22, 1800, 'XENO NEST SHATTERED', '#ffd66b');
          } else {
            this.addStyle(6, 260, `NEST ${nest.hp}/${nest.maxHp}`, '#bf83ff');
          }
        } else {
          const along = ball.velocity.dot(normal);
          if (along < 0) ball.velocity.addScaledVector(normal, -1.5 * along);
        }
      }

      for (const chime of world.moonChimes) {
        if (chime.used || ball.collisionCooldown.has(chime.id)) continue;
        if (chime.position.distanceTo(ball.position) > chime.radius + ball.radius) continue;
        if (ball.velocity.length() < 6) continue;
        if (world.strikeChime(chime)) {
          ball.collisionCooldown.set(chime.id, .25);
          this.addStyle(12, 760, 'MOON CHIME', '#ffd66b');
          this.shake = Math.max(this.shake, .18);
        }
      }

      if (ball.mode === 'outbound' && ball.velocity.length() >= 12) {
        const nextLink = world.anchors.find(candidate => !candidate.used);
        // Sockets stay live forever. One-shot consumable anchors killed the
        // climb verb: an identical-looking socket that ignores an identical
        // kick reads as broken. Order still gates PROGRESSION (the first link
        // of each new socket), but any already-linked socket is always a
        // reusable grapple point.
        const touchedAnchor = world.anchors.find(candidate => !ball.collisionCooldown.has(candidate.id)
          && ball.position.distanceTo(candidate.position) <= 4.4);
        const wrongOrder = touchedAnchor && !touchedAnchor.used && nextLink && touchedAnchor !== nextLink;
        if (wrongOrder) {
          // Reject here, then flare the socket that IS live so the eye is
          // pulled to the right target instead of being told about it.
          this.sealCue(touchedAnchor.position, 0x8f9bbf);
          if (nextLink) {
            nextLink.beckon = 1.8;
            world.pulseRing(nextLink.position, new T.Color(0x7befff), 9, .55);
          }
          ball.collisionCooldown.set(touchedAnchor.id, .32);
        }
        const anchor = touchedAnchor && !wrongOrder ? touchedAnchor : null;
        if (anchor) {
          ball.mode = 'anchored';
          ball.anchor = anchor;
          ball.anchorCharge = ball.launchCharge;
          ball.anchorTimer = 0;
          ball.lastTetherPathLength = Infinity;
          ball.velocity.set(0, 0, 0);
          ball.position.copy(anchor.position);
          // The socket collision happens after the normal ball update. Build
          // the newly physical line immediately so the very first anchored
          // frame cannot flash without its connection.
          this.lineActive = true;
          this.buildTetherPath(true);
          const firstTug = anchor.position.clone().sub(this.player.position).normalize();
          this.player.velocity.addScaledVector(firstTug, 6.5 + ball.launchCharge * 4.5);
          setVspeed(this.player.velocity, this.player.up, Math.max(vspeedOf(this.player.velocity, this.player.up), 3.8 + ball.launchCharge * 2.4));
          this.player.grounded = false;
          this.addStyle(12, 520, 'ANCHORED', '#83efff');
          world.particles.burst(anchor.position, 0x76efff, 26, 10, .72, .2);
          audio.impact(.9, 'anchor');
        }
      }

      const tail = chartFrameAt(ball.position, this.ballChart);
      if (world.goal.open && Math.abs(tail.z - world.goal.position.z) < 2.4 && Math.hypot(tail.x - world.goal.position.x, tail.alt - world.goal.position.y) < world.goal.radius) {
        this.completeRun();
      }
      if (tail.alt < groundHeightAt(tail.x, tail.z) - 40
        || ball.position.distanceTo(this.player.position) > 280) {
        const recover = this.tempC.set(0, 3, 4);
        if (SPHERE_WORLD) recover.applyQuaternion(this.player.frame);
        ball.position.copy(this.player.position).add(recover);
        ball.velocity.copy(this.player.position).sub(ball.position).setLength(32);
        ball.mode = 'returning';
        ball.returnTime = 0;
        ball.lastReturnDistance = ball.position.distanceTo(this.player.position);
      }
    }
    enemyFront(enemy, target = new T.Vector3()) {
      target.set(Math.sin(enemy.facing), 0, Math.cos(enemy.facing)).normalize();
      if (SPHERE_WORLD) target.applyQuaternion(liftQuatAt(enemy.position.x, enemy.position.z, this.frameQuat));
      return target;
    }
    resolveBallEnemies() {
      const ball = this.ball;
      for (const enemy of this.enemies) {
        if (!enemy.alive || ball.collisionCooldown.has(enemy.id) || ball.caughtBy) continue;
        const center = fromChartVec(enemy.position.clone());
        center.addScaledVector(dirAt(center, this.tempB), enemy.radius * .7);
        const distance = center.distanceTo(ball.position);
        if (distance > enemy.radius + ball.radius) continue;
        const normal = ball.position.clone().sub(center).normalize();
        if (enemy.summit && world.fracture.active) {
          // Progression-locked enemies used to be intangible ghosts the ball
          // sailed through with zero feedback — it read as broken collision.
          // Now they physically deflect the ball and say why nothing died.
          ball.collisionCooldown.set(enemy.id, .4);
          const blockedAlong = ball.velocity.dot(normal);
          if (blockedAlong < 0) ball.velocity.addScaledVector(normal, -1.4 * blockedAlong);
          enemy.hitFlash = .4;
          this.sealCue(ball.position, 0xbf83ff);
          continue;
        }
        const speed = ball.velocity.length();
        const front = this.enemyFront(enemy, this.tempA);
        const frontness = normal.dot(front);
        const returnAttack = ball.mode === 'returning';
        const validHit = speed > 8;
        ball.collisionCooldown.set(enemy.id, .22);
        // THE ONE COMBAT LAW: a solid hit always takes something off. Speed
        // and angle decide HOW MUCH, never whether. Every "armour blocks it
        // entirely" rule this game used to have produced the same experience
        // — a hit that looked correct and did nothing — and that is the thing
        // that made the moon feel broken rather than hard.
        if (!validHit) {
          const glance = ball.velocity.dot(normal);
          if (glance < 0) ball.velocity.addScaledVector(normal, -1.4 * glance);
          this.impact('graze', ball.position);
          continue;
        }
        const armoured = (enemy.type === 'shield' || enemy.type === 'warden') && frontness > .5;
        if (armoured && enemy.type === 'warden' && ball.mode === 'outbound' && enemy.catchCooldown <= 0 && speed > 12) {
          ball.mode = 'caught';
          ball.caughtBy = enemy;
          ball.catchTimer = ball.snapTimer = 0;
          ball.velocity.set(0, 0, 0);
          enemy.catchCooldown = .8;
          enemy.weakPulse = 1.7;
          world.particles.burst(ball.position, 0xbe83ff, 22, 9, .68, .12);
          audio.impact(.9, 'alien');
          continue;
        }
        // Fast balls hit harder; mirror-plated shardlings simply need more
        // speed to fold in one blow instead of two.
        let damage = ball.comet ? BALL_CORES.comet.pierceDamage : 1;
        if (speed > 34) damage++;
        if (armoured) {
          // The armoured face still yields, at half rate and with a shower of
          // sparks instead of a wound — and it lights its own back up so the
          // better answer is visible rather than explained.
          damage = Math.max(1, Math.floor(damage / 2));
          enemy.weakPulse = 1.7;
          this.impact('graze', ball.position);
        } else if (returnAttack) {
          this.stats.returnHits++;
        }
        this.damageAlien(enemy, damage, returnAttack ? 'return' : 'kick');
        if (!ball.comet) {
          const along = ball.velocity.dot(normal);
          if (along < 0) ball.velocity.addScaledVector(normal, -(armoured ? 1.78 : 1.25) * along);
        }
      }
    }
    damageAlien(enemy, amount = 1, source = 'kick') {
      if (!enemy.alive || (enemy.summit && world.fracture.active)) return false;
      enemy.hp -= amount;
      enemy.hitFlash = 1;
      enemy.stun = enemy.type === 'warden' ? .28 : .52;
      // Getting hit visibly moves it. A creature that takes damage without
      // budging is the main reason a hit reads as "nothing happened".
      const ballChart = toChartVec(this.tempB.copy(this.ball.position));
      const knock = this.tempA.copy(enemy.position).sub(ballChart).setY(0);
      if (knock.lengthSq() > 1e-6) enemy.velocity.addScaledVector(knock.normalize(), 5 + amount * 3);
      const hitPosition = fromChartVec(enemy.position.clone());
      hitPosition.addScaledVector(dirAt(hitPosition, this.tempC), enemy.radius * .75);
      this.impact(enemy.hp <= 0 ? 'break' : 'hurt', hitPosition,
        source === 'spin' ? 0xbd83ff : source === 'return' ? 0xffd66b : 0x7aefff);
      if (enemy.hp > 0) {
        const label = enemy.type === 'warden' ? `WARDEN ${enemy.hp}/${enemy.maxHp}` : enemy.type === 'shield' ? `BACK HIT ${enemy.hp}/${enemy.maxHp}` : 'ALIEN HIT';
        this.addStyle(source === 'return' ? 13 : 6, source === 'return' ? 620 : 240, label, source === 'return' ? '#ffd66b' : '#83efff');
        return true;
      }
      enemy.hp = 0;
      enemy.alive = false;
      enemy.deadTimer = .82;
      enemy.velocity.copy(enemy.position).sub(ballChart).normalize().multiplyScalar(10).addScaledVector(UP, 8);
      this.stats.kills++;
      this.addStyle(enemy.type === 'warden' ? 34 : enemy.type === 'shield' ? 25 : 12, enemy.type === 'warden' ? 5000 : enemy.type === 'shield' ? 2400 : 700, enemy.type === 'warden' ? 'CROWN SHATTERED' : enemy.type === 'shield' ? 'CARAPACE BROKEN' : 'MOONSMASH', '#ffd66b');
      world.particles.burst(hitPosition, 0xffdf79, enemy.type === 'warden' ? 72 : 36, enemy.type === 'warden' ? 24 : 16, 1.15, .45);
      world.spawnStones(hitPosition, clamp(1 + enemy.maxHp, 2, 6), 2.6);
      audio.score(true);
      if (enemy === this.shieldEnemy) world.openGate();
      // The aperture opens only after the entire summit encounter is cleared.
      return true;
    }
    // ---- THE SKYFIELD ----------------------------------------------------
    updateSky(dt) {
      const player = this.player;
      const ball = this.ball;
      // Chart mirrors for the slab volumes below. Sky rings and sky anchors
      // are world-point records (they get lifted with the content), so their
      // 3D distance grammar stays untouched.
      const pcv = toChartVec(this.playerChartVec.copy(player.position));
      const bcv = toChartVec(this.ballChartVec.copy(ball.position));
      for (const ring of world.launchRings || EMPTY_SOLIDS) {
        ring.cooldown = Math.max(0, ring.cooldown - dt);
        ring.group.rotateZ(dt * .22);
        ring.halo.material.opacity = .16 + Math.sin(this.time * 1.7 + ring.position.x) * .07;
        if (ring.cooldown > 0) continue;
        if (player.position.distanceTo(ring.position) < ring.radius + 2) {
          player.velocity.copy(ring.toward).multiplyScalar(ring.fling);
          player.flung = 5;
          player.jumpsUsed = 0;
          player.grounded = false;
          ring.cooldown = 1.4;
          if (ring.partner) ring.partner.cooldown = Math.max(ring.partner.cooldown, 6);
          this.impact('break', ring.position, 0x9fd8ff);
          world.pulseRing(ring.position, new T.Color(0x9fd8ff), 30, .6);
          this.shake = Math.max(this.shake, .4);
          this.addStyle(16, 700, 'ORBITAL ROAD', '#9fd8ff');
        } else if (ball.position.distanceTo(ring.position) < ring.radius
          && (ball.mode === 'outbound' || ball.mode === 'returning')) {
          ball.velocity.addScaledVector(ring.toward, 40);
          ring.cooldown = .6;
          world.pulseRing(ring.position, new T.Color(0x9fd8ff), 14, .35);
        }
      }
      for (const ring of world.skyRings) {
        ring.cooldown = Math.max(0, ring.cooldown - dt);
        ring.mesh.rotateZ(dt * .5);
        const pulse = .42 + Math.sin(this.time * 2.4 + ring.position.x) * .13;
        ring.mesh.material.opacity = pulse;
        ring.halo.material.opacity = pulse * .55;
        if (ring.cooldown > 0) continue;
        // Fly through and it throws you the way it points. This is the road
        // between slabs, and it costs nothing but arriving with some speed.
        if (player.position.distanceTo(ring.position) < ring.radius + 1.4) {
          player.velocity.copy(ring.toward).multiplyScalar(44);
          player.jumpsUsed = 0;
          player.grounded = false;
          ring.cooldown = .8;
          this.impact('hurt', ring.position, 0x8fe9ff);
          world.pulseRing(ring.position, new T.Color(0x8fe9ff), 16, .4);
          this.addStyle(12, 460, 'RING SHOT', '#8fe9ff');
        } else if (ball.position.distanceTo(ring.position) < ring.radius + 1
          && (ball.mode === 'outbound' || ball.mode === 'returning')) {
          ball.velocity.addScaledVector(ring.toward, 26);
          ring.cooldown = .5;
          world.pulseRing(ring.position, new T.Color(0x8fe9ff), 9, .3);
        }
      }
      for (const slab of world.sky) {
        if (slab.inert) continue;
        slab.cooldown = Math.max(0, slab.cooldown - dt);
        const nearSq = player.position.distanceToSquared(slab.position);
        // Two cull rings. The lit-flame constellation (plinth + flame, two
        // small meshes) reads out to 640 m; the ROLE furniture -- 44 m vent
        // plumes, cache knots, spinners -- is the additive-overdraw bomb and
        // hides beyond 380 m (the sphere hides things; the frustum does not).
        const showFurniture = nearSq < 640 * 640;
        if (slab.group.visible !== showFurniture) slab.group.visible = showFurniture;
        if (!showFurniture) continue;
        const showRoles = nearSq < 380 * 380;
        if (slab.roleShown !== showRoles) {
          slab.roleShown = showRoles;
          for (const child of slab.group.children) {
            if (child === slab.plinth || child === slab.flame) continue;
            // Never resurrect a smashed cache shard's mesh.
            if (showRoles && slab.cache && slab.cache.some(entry => entry.mesh === child && !entry.alive)) continue;
            child.visible = showRoles;
          }
        }
        const near = nearSq < 260 * 260;
        // The plinth flame keeps turning whether or not you are close, so the
        // lit ones read as a constellation from the ground.
        slab.flameSpin = (slab.flameSpin || 0) + dt * (slab.lit ? 2.6 : .5);
        chartLift(slab.x, slab.top + 4.1 + (slab.lit ? Math.sin(this.time * 2 + slab.index) * .3 : 0), slab.z, slab.flame.position);
        liftQuatAt(slab.x, slab.z, slab.flame.quaternion).multiply(this.frameQuat.setFromAxisAngle(UP, slab.flameSpin));
        slab.flame.material.emissiveIntensity = slab.lit ? 3.4 + Math.sin(this.time * 3 + slab.index) * .8 : .2;
        slab.plinth.material.emissiveIntensity = slab.lit ? 2.2 : .35;
        if (!near) continue;

        const standing = Math.abs(pcv.y - slab.top) < 2.6
          && Math.hypot(pcv.x - slab.x, pcv.z - slab.z) < slab.radius;
        if (standing && !slab.lit) {
          slab.lit = true;
          this.stats.skyLit++;
          this.impact('hurt', slab.flame.position, 0xffd66b);
          world.pulseRing(slab.flame.position, new T.Color(0xffd66b), 12, .5);
          world.spawnStones(slab.flame.position, 3, 2.4);
          this.addStyle(9, 340, 'BEACON LIT', '#ffd66b');
        }
        if (slab.vent && standing) {
          slab.vent.plume.material.opacity = .1 + Math.sin(this.time * 6) * .05;
          if (slab.cooldown <= 0 && Math.hypot(pcv.x - slab.x, pcv.z - slab.z) < slab.vent.radius) {
            setVspeed(player.velocity, player.up, 46);
            player.jumpsUsed = 0;
            player.grounded = false;
            slab.cooldown = 1.1;
            this.impact('hurt', player.position, 0xffae2b);
            this.addStyle(11, 420, 'UPDRAFT', '#ffd66b');
          }
        }
        if (slab.spinner) {
          slab.spinner.angle += dt * slab.spinner.speed;
          liftQuatAt(slab.x, slab.z, slab.spinner.arm.quaternion).multiply(this.frameQuat.setFromAxisAngle(UP, slab.spinner.angle));
          // Ride it or eat it: the arm sweeps you off your feet, hard.
          if (standing && slab.cooldown <= 0) {
            const armDirection = this.tempA.set(Math.cos(slab.spinner.angle), 0, -Math.sin(slab.spinner.angle));
            const toPlayer = this.tempB.set(pcv.x - slab.x, 0, pcv.z - slab.z);
            const along = toPlayer.dot(armDirection);
            if (Math.abs(along) < slab.spinner.reach && toPlayer.lengthSq() > 1 && Math.abs(toPlayer.length() - Math.abs(along)) < 2.2) {
              const fling = this.tempA.set(-armDirection.z, 0, armDirection.x).multiplyScalar(Math.sign(along) || 1);
              if (SPHERE_WORLD) {
                const pf = this.playerChart;
                fling.copy(this.tempB.copy(pf.ex).multiplyScalar(fling.x).addScaledVector(pf.ez, fling.z));
              }
              player.velocity.addScaledVector(fling, 34);
              setVspeed(player.velocity, player.up, Math.max(vspeedOf(player.velocity, player.up), 13));
              player.jumpsUsed = Math.min(player.jumpsUsed, 1);
              player.grounded = false;
              slab.cooldown = .9;
              this.impact('graze', player.position, 0xff7a3c);
              this.addStyle(10, 380, 'SWEPT', '#ff7a3c');
            }
          }
        }
        if (slab.cache) {
          for (const shard of slab.cache) {
            if (!shard.alive) continue;
            shard.mesh.rotateY(dt * 1.6);
            if (ball.mode !== 'outbound' && ball.mode !== 'returning') continue;
            if (Math.abs(bcv.y - shard.y) > 3) continue;
            if (Math.hypot(bcv.x - shard.x, bcv.z - shard.z) > shard.radius + ball.radius) continue;
            shard.alive = false;
            shard.mesh.visible = false;
            this.stats.breaks++;
            this.impact('break', shard.mesh.position, 0x54d8ff);
            this.addStyle(5, 190);
            if (slab.cache.every(entry => !entry.alive)) {
              this.addStyle(16, 780, 'CACHE CRACKED', '#54d8ff');
              this.player.maxHealth = Math.min(9, this.player.maxHealth + 1);
              this.player.health = this.player.maxHealth;
            }
          }
        }
        if (slab.skyAnchor) {
          slab.skyAnchor.eye.rotateZ(dt * 1.1);
          slab.skyAnchor.glow.material.opacity = .4 + Math.sin(this.time * 2.6 + slab.index) * .14;
          // A kicked ball sticks here and the line reels you across. Same
          // grammar as the cliff sockets, so nothing new to learn.
          if (ball.mode === 'outbound' && ball.velocity.length() >= 12
            && !ball.collisionCooldown.has(slab.id)
            && ball.position.distanceTo(slab.skyAnchor.position) <= slab.skyAnchor.radius) {
            ball.collisionCooldown.set(slab.id, .5);
            ball.mode = 'anchored';
            ball.anchor = { id: slab.id, index: -1, position: slab.skyAnchor.position.clone(), used: true, synthetic: true };
            ball.anchorCharge = ball.launchCharge;
            ball.anchorTimer = 0;
            ball.lastTetherPathLength = Infinity;
            ball.velocity.set(0, 0, 0);
            ball.position.copy(slab.skyAnchor.position);
            this.lineActive = true;
            this.buildTetherPath(true);
            this.impact('hurt', slab.skyAnchor.position, 0x63f0ff);
            this.addStyle(10, 360, 'SKY LINK', '#63f0ff');
          }
        }
        if (slab.crown && !slab.crown.taken) {
          slab.crown.ring.rotateZ(dt * .6);
          slab.crown.prize.rotateY(dt * 1.3);
          chartLift(slab.x, slab.top + 7 + Math.sin(this.time * 1.6) * .5, slab.z, slab.crown.prize.position);
          slab.crown.glow.material.opacity = .4 + Math.sin(this.time * 2.2) * .14;
          if (player.position.distanceTo(slab.crown.prize.position) < slab.crown.radius) {
            slab.crown.taken = true;
            slab.crown.prize.visible = false;
            slab.crown.glow.visible = false;
            this.grantKite(slab.crown.prize.position.clone());
          }
        }
      }
    }
    grantKite(at) {
      const spec = BALL_CORES.kite;
      if (this.cores.has(spec.id)) return;
      this.cores.add(spec.id);
      this.stats.cores++;
      this.rewardFlash = 1;
      if (ui.rewardFlash) ui.rewardFlash.style.setProperty('--reward-tint', `#${spec.color.toString(16).padStart(6, '0')}`);
      this.hitStop = Math.max(this.hitStop, .1);
      this.shake = Math.max(this.shake, .8);
      this.addStyle(34, 6000, 'KITE CORE', '#8bffca');
      world.particles.burst(at, spec.color, 120, 26, 1.5, .4);
      world.pulseRing(at, new T.Color(spec.color), 30, .9);
      audio.win();
    }
    // ---- LANDMARKS -------------------------------------------------------
    // Every landmark answers on contact and rewards doing it well. None of
    // them gate anything: they exist to make crossing the moon worth doing.
    updateLandmarks(dt) {
      const player = this.player;
      const ball = this.ball;
      toChartVec(this.playerChartVec.copy(player.position));
      toChartVec(this.ballChartVec.copy(ball.position));
      for (const mark of world.landmarks) {
        mark.cooldown = Math.max(0, (mark.cooldown || 0) - dt);
        if (mark.flare) {
          mark.flare.material.opacity = mark.done ? .34 + Math.sin(this.time * 1.7) * .1 : 0;
        }
        const near = player.position.distanceToSquared(mark.position) < 220 * 220;
        if (!near) continue;
        if (mark.kind === 'arch') this.updateArch(mark, dt);
        else if (mark.kind === 'geysers') this.updateGeysers(mark, dt);
        else if (mark.kind === 'dish') this.updateDish(mark, dt);
        else if (mark.kind === 'lodestone') this.updateLodestone(mark, dt);
        else if (mark.kind === 'grove') this.updateGrove(mark, dt);
        else if (mark.kind === 'garden') this.updateGarden(mark, dt);
      }
      void ball;
    }
    // Flying through the eye of THE ARCH pays you in speed.
    updateArch(mark, dt) {
      mark.eye.rotateZ(dt * .35);
      const gate = mark.gate;
      const pass = body => {
        const dz = Math.abs(body.z - gate.centre.z);
        if (dz > gate.thickness) return false;
        return Math.hypot(body.x - gate.centre.x, body.y - gate.centre.y) < gate.radius;
      };
      if (mark.cooldown <= 0 && pass(this.playerChartVec)) {
        const forward = this.horizontalForward(this.tempA);
        const speed = tangentOf(this.player.velocity, this.player.up, this.tempB).length();
        this.player.velocity.addScaledVector(forward, 14 + Math.min(16, speed * .5));
        setVspeed(this.player.velocity, this.player.up, Math.max(vspeedOf(this.player.velocity, this.player.up), 9));
        this.player.jumpsUsed = 0;
        mark.cooldown = .9;
        this.impact('hurt', this.player.position, mark.tint);
        world.pulseRing(fromChartVec(this.tempB.copy(gate.centre)), new T.Color(mark.tint), gate.radius * 2, .5);
        this.addStyle(14, 620, 'THROUGH THE EYE', '#8fe9ff');
        this.completeLandmark(mark);
      }
      if (pass(this.ballChartVec) && this.ball.mode === 'outbound' && !this.ball.collisionCooldown.has(mark.id)) {
        this.ball.collisionCooldown.set(mark.id, .6);
        this.ball.velocity.multiplyScalar(1.3);
        world.pulseRing(this.ball.position, new T.Color(mark.tint), 8, .3);
        this.addStyle(8, 260, 'THREADED', '#8fe9ff');
      }
    }
    // GEYSER FLATS: vents fire on a stagger and throw whatever is standing on
    // them straight up. The plume telegraphs the launch before it happens.
    updateGeysers(mark, dt) {
      for (const vent of mark.vents) {
        const cycle = (this.time * .55 + vent.phase) % 3.4;
        const winding = cycle > 2.4 && cycle <= 3;
        const firing = cycle > 3;
        vent.plume.material.opacity = firing ? .5 : winding ? .12 + (cycle - 2.4) * .2 : .03;
        vent.plume.scale.set(1, firing ? 1 : .35 + (winding ? (cycle - 2.4) * .8 : 0), 1);
        if (!firing) { vent.fired = false; continue; }
        if (vent.fired) continue;
        vent.fired = true;
        const lifts = body => Math.hypot(body.x - vent.x, body.z - vent.z) < vent.radius && body.y < vent.base + 6;
        if (lifts(this.playerChartVec)) {
          setVspeed(this.player.velocity, this.player.up, 34);
          this.player.jumpsUsed = 0;
          this.player.grounded = false;
          mark.ridden.add(vent.phase);
          this.impact('hurt', this.player.position, mark.tint);
          this.addStyle(10, 380, 'GEYSER RIDE', '#ffd66b');
          if (mark.ridden.size >= 3) this.completeLandmark(mark);
        }
        if (lifts(this.ballChartVec) && (this.ball.mode === 'outbound' || this.ball.mode === 'returning')) {
          const ballUp = dirAt(this.ball.position, this.ballUpScratch);
          setVspeed(this.ball.velocity, ballUp, Math.max(vspeedOf(this.ball.velocity, ballUp), 30));
        }
        // The vents used to thump at FULL volume from anywhere inside the
        // landmark's 220 m update range -- the audio engine has no distance
        // falloff, so from across the flats it read as a phantom pair of
        // collisions repeating forever. Now the thump fades with distance and
        // is silent past 80 m.
        const ventAt = chartLift(vent.x, vent.base + 1.5, vent.z, new T.Vector3());
        world.particles.burst(ventAt, 0xfff0c4, 26, 20, .8, 1.4);
        const ventDistance = ventAt.distanceTo(this.player.position);
        if (ventDistance < 80) audio.impact(.5 * (1 - ventDistance / 80), 'rock');
      }
    }
    // THE DISH swallows a ball, spins it up the bowl, and fires it back out
    // faster than any kick can. Free speed, but you have to land the shot.
    updateDish(mark, dt) {
      mark.feed.rotateY(dt * 2.2);
      mark.lip.material.opacity = .35 + Math.sin(this.time * 2.4) * .12 + mark.charge * .4;
      const ball = this.ball;
      const bowl = mark.bowl;
      const bowlUp = dirAt(bowl.centre, this.ballUpScratch);
      const inside = ball.position.distanceTo(bowl.centre) < bowl.radius
        && this.tempC.copy(ball.position).sub(bowl.centre).dot(bowlUp) < 9
        && (ball.mode === 'outbound' || ball.mode === 'returning');
      if (!inside) {
        mark.charge = Math.max(0, mark.charge - dt);
        return;
      }
      mark.charge = Math.min(1, mark.charge + dt * 1.5);
      // Swirl it inward and upward: visibly winding up, not teleporting.
      const radial = this.tempA.copy(ball.position).sub(bowl.centre);
      radial.addScaledVector(bowlUp, -radial.dot(bowlUp));
      const distance = Math.max(.6, radial.length());
      radial.multiplyScalar(1 / distance);
      const tangent = this.tempB.crossVectors(radial, bowlUp);
      ball.velocity.addScaledVector(tangent, 88 * dt);
      ball.velocity.addScaledVector(radial, -46 * dt);
      ball.velocity.addScaledVector(bowlUp, 12 * dt);
      if (mark.charge < 1) return;
      // Full: launch it out of the dish along the player's aim, screaming.
      mark.charge = 0;
      const aim = this.forwardFromView(this.tempA);
      ball.position.copy(bowl.centre).addScaledVector(bowlUp, 10);
      ball.velocity.copy(aim).multiplyScalar(78);
      ball.mode = 'outbound';
      ball.flightTime = 0;
      ball.freeFlightTime = 0;
      ball.emberHeat = 1;
      this.impact('break', ball.position, mark.tint);
      world.pulseRing(bowl.centre, new T.Color(mark.tint), 26, .5);
      this.addStyle(16, 700, 'SLINGSHOT', '#7befff');
      this.completeLandmark(mark);
    }
    // THE LODESTONE bends the ball into orbit. Complete a lap and it pays.
    updateLodestone(mark, dt) {
      mark.core.rotateY(dt * .4);
      mark.rings.forEach((ring, index) => { ring.rotateZ(dt * (.3 + index * .18)); });
      const ball = this.ball;
      if (ball.mode !== 'outbound' && ball.mode !== 'returning') {
        mark.orbitAngle = null;
        mark.orbitTurns = 0;
        return;
      }
      const well = mark.well;
      const offset = this.tempA.copy(ball.position).sub(well.centre);
      const distance = offset.length();
      if (distance > well.radius) {
        mark.orbitAngle = null;
        mark.orbitTurns = 0;
        return;
      }
      // Pull toward the orbit shell rather than the centre, so the ball wraps
      // around the stone instead of face-planting into it.
      const pull = (distance - well.orbit) * 5.5;
      offset.multiplyScalar(1 / Math.max(.001, distance));
      ball.velocity.addScaledVector(offset, -pull * dt);
      const wellUp = dirAt(well.centre, this.ballUpScratch);
      const tangent = this.tempB.crossVectors(offset, wellUp).normalize();
      ball.velocity.addScaledVector(tangent, 34 * dt);
      // Lap angle in the well's own tangent plane (e1/e2 stored at lift time;
      // world axes while flat).
      const angle = SPHERE_WORLD && well.e1
        ? Math.atan2(offset.dot(well.e2), offset.dot(well.e1))
        : Math.atan2(offset.z, offset.x);
      if (mark.orbitAngle !== null) {
        mark.orbitTurns += Math.abs(angleDelta(mark.orbitAngle, angle));
        if (mark.orbitTurns > TAU && !mark.done) {
          this.addStyle(18, 820, 'SLUNG THE STONE', '#bf83ff');
          world.pulseRing(well.centre, new T.Color(mark.tint), 24, .5);
          this.completeLandmark(mark);
        }
      }
      mark.orbitAngle = angle;
    }
    // CHIME GROVE: ring every rod before the ball comes home.
    updateGrove(mark, dt) {
      let lit = 0;
      for (const rod of mark.rods) {
        rod.lit = Math.max(0, rod.lit - dt * .7);
        rod.material.emissiveIntensity = .5 + rod.lit * 5;
        rod.mesh.scale.set(1 + rod.lit * .12, 1, 1 + rod.lit * .12);
        if (rod.lit > 0) lit++;
      }
      const ball = this.ball;
      if (ball.mode !== 'outbound' && ball.mode !== 'returning') return;
      const groveChart = chartFrameAt(ball.position, this.ballChart);
      for (const rod of mark.rods) {
        if (ball.collisionCooldown.has(`rod-${rod.index}`)) continue;
        if (groveChart.alt < rod.base - 1 || groveChart.alt > rod.base + rod.height + 1) continue;
        if (Math.hypot(groveChart.x - rod.x, groveChart.z - rod.z) > rod.radius + ball.radius) continue;
        ball.collisionCooldown.set(`rod-${rod.index}`, .25);
        const nx = groveChart.x - rod.x, nz = groveChart.z - rod.z;
        const nl = Math.hypot(nx, nz) || 1;
        const normal = this.tempA.copy(groveChart.ex).multiplyScalar(nx / nl).addScaledVector(groveChart.ez, nz / nl);
        const along = ball.velocity.dot(normal);
        if (along < 0) ball.velocity.addScaledVector(normal, -1.9 * along);
        this.onBallBounce(ball.position);
        rod.lit = 1;
        world.pulseRing(ball.position, new T.Color(mark.tint), 3.4, .22);
        audio.chime ? audio.chime(rod.index) : audio.impact(.4, 'glass');
        this.addStyle(3, 90);
        const nowLit = mark.rods.filter(entry => entry.lit > 0).length;
        if (nowLit >= mark.rods.length) {
          this.addStyle(22, 1400, 'FULL PEAL', '#ffd66b');
          world.pulseRing(mark.position, new T.Color(mark.tint), 40, .6);
          this.completeLandmark(mark);
        }
      }
      void lit;
    }
    // BLOOM GARDEN: one hit should set off the whole field.
    updateGarden(mark, dt) {
      let opened = 0;
      for (const bloom of mark.blooms) {
        if (bloom.open) opened++;
        if (bloom.fuse > 0) {
          bloom.fuse -= dt;
          if (bloom.fuse <= 0) this.burstBloom(mark, bloom);
        }
        const target = bloom.open ? 0 : 1;
        bloom.group.scale.lerp(this.tempA.set(target, target, target), 1 - Math.exp(-4 * dt));
        bloom.material.emissiveIntensity = 1.5 + (bloom.fuse > 0 ? 5 : 0);
      }
      if (opened >= mark.blooms.length && !mark.done) {
        this.addStyle(24, 1600, 'GARDEN CLEARED', '#ff7ad0');
        world.pulseRing(mark.position, new T.Color(mark.tint), 46, .7);
        this.completeLandmark(mark);
      }
      // Blooms regrow once the field has been cleared and left alone.
      if (opened >= mark.blooms.length && mark.done) {
        mark.regrow = (mark.regrow || 0) + dt;
        if (mark.regrow > 8) {
          mark.regrow = 0;
          mark.chain = 0;
          for (const bloom of mark.blooms) bloom.open = false;
        }
      }
      const ball = this.ball;
      if (ball.mode !== 'outbound' && ball.mode !== 'returning') return;
      const gardenChart = toChartVec(this.ballChartVec.copy(ball.position));
      for (const bloom of mark.blooms) {
        if (bloom.open || bloom.fuse > 0) continue;
        if (Math.abs(gardenChart.y - (bloom.base + 1.8)) > 3.4) continue;
        if (Math.hypot(gardenChart.x - bloom.x, gardenChart.z - bloom.z) > bloom.radius + ball.radius) continue;
        this.burstBloom(mark, bloom);
      }
    }
    burstBloom(mark, bloom) {
      if (bloom.open) return;
      bloom.open = true;
      bloom.fuse = 0;
      mark.chain++;
      const at = chartLift(bloom.x, bloom.base + 1.8, bloom.z, new T.Vector3());
      this.impact('break', at, mark.tint);
      world.particles.burst(at, 0xff7ad0, 26, 13, .8, .35);
      // Light the fuse on every neighbour: the cascade is the whole point.
      for (const other of bloom.neighbours) {
        if (other.open || other.fuse > 0) continue;
        other.fuse = .16;
      }
      this.addStyle(4 + Math.min(14, mark.chain), 120 + mark.chain * 60,
        mark.chain > 4 ? `CASCADE x${mark.chain}` : null, '#ff7ad0');
    }
    completeLandmark(mark) {
      if (mark.done) return;
      mark.done = true;
      this.stats.landmarks++;
      this.rewardFlash = Math.max(this.rewardFlash, .7);
      if (ui.rewardFlash) ui.rewardFlash.style.setProperty('--reward-tint', `#${mark.tint.toString(16).padStart(6, '0')}`);
      this.shake = Math.max(this.shake, .5);
      const markUp = dirAt(mark.position, this.tempB);
      world.particles.burst(mark.position.clone().addScaledVector(markUp, 6), mark.tint, 70, 18, 1.3, .5);
      world.pulseRing(mark.position.clone().addScaledVector(markUp, 4), new T.Color(mark.tint), 30, .7);
      world.spawnStones(mark.position.clone().addScaledVector(markUp, 2), 5, 4);
      audio.score(true);
      // Health is the reward for exploring: the moon makes you tougher.
      this.player.maxHealth = Math.min(9, this.player.maxHealth + 1);
      this.player.health = this.player.maxHealth;
    }
    resetBoss(boss) {
      boss.hp = boss.maxHp;
      boss.alive = true;
      boss.spin = 0;
      boss.exposed = boss.id === 'greatwheel' ? 1 : 0;
      boss.cycle = 0;
      boss.group.visible = true;
      boss.group.scale.setScalar(1);
      if (boss.nodes) boss.nodes.forEach(node => { node.alive = true; node.mesh.visible = true; });
      if (boss.halo) boss.halo.material.opacity = .2;
    }
    // Each boss is its own idea. They share only this loop and the reward, so
    // fighting one teaches nothing about fighting the next except the ball.
    updateRegions(dt) {
      this.pitonCooldown = Math.max(0, this.pitonCooldown - dt);
      const riderChart = toChartVec(this.playerChartVec.copy(this.player.position));
      for (const region of world.regions) {
        for (const mover of region.movers) {
          // The mover's logical pose lives in chart coordinates (mover.at);
          // the mesh is the lifted image of it. floorHeight reads mover.at.
          const at = mover.at || (mover.at = new T.Vector3());
          const wasX = at.x;
          const wasZ = at.z;
          const wasY = at.y;
          mover.angle += mover.speed * dt;
          at.set(
            region.x + Math.cos(mover.angle) * mover.orbit,
            mover.height + Math.sin(mover.angle * 2 + mover.tier) * 2.4,
            region.z + Math.sin(mover.angle) * mover.orbit,
          );
          fromChartVec(mover.mesh.position.copy(at));
          liftQuatAt(at.x, at.z, mover.mesh.quaternion).multiply(this.frameQuat.setFromAxisAngle(UP, -mover.angle));
          // Carry whoever is riding. Without this the plate slides out from
          // under the player every frame, which is why it never felt like
          // ground you could stand on — you were technically standing, and
          // then instantly not.
          const onBoard = Math.abs(riderChart.y - (at.y + .55)) < 1.4
            && Math.hypot(riderChart.x - wasX, riderChart.z - wasZ) < mover.radius;
          if (onBoard) {
            riderChart.x += at.x - wasX;
            riderChart.z += at.z - wasZ;
            riderChart.y += at.y - wasY;
            fromChartVec(this.player.position.copy(riderChart));
            toChartVec(riderChart.copy(this.player.position));
          }
        }
        for (const ring of region.rings || []) ring.mesh.rotateZ(ring.speed * dt);
        // Updraft columns are the way back out of THE HOLLOW. They also carry
        // the ball, so a throw into one comes back over the lip instead of
        // rattling around at the bottom.
        for (const draft of region.updrafts || []) {
          const lift = (body, strength) => {
            if (body.y < draft.base - 2 || body.y > draft.top) return false;
            return Math.hypot(body.x - draft.x, body.z - draft.z) < draft.radius * strength;
          };
          if (lift(riderChart, 1)) {
            const vy = vspeedOf(this.player.velocity, this.player.up);
            setVspeed(this.player.velocity, this.player.up, Math.min(draft.force, vy + draft.force * 2.1 * dt));
            this.player.jumpsUsed = 0;
            this.player.grounded = false;
          }
          const draftBall = toChartVec(this.ballChartVec.copy(this.ball.position));
          if (lift(draftBall, 1.1) && (this.ball.mode === 'outbound' || this.ball.mode === 'returning')) {
            const ballUp = dirAt(this.ball.position, this.ballUpScratch);
            const bvy = vspeedOf(this.ball.velocity, ballUp);
            setVspeed(this.ball.velocity, ballUp, Math.min(draft.force, bvy + draft.force * 1.6 * dt));
          }
          draft.mesh.material.opacity = .1 + Math.sin(this.time * 2.1 + draft.x) * .035;
        }
        const boss = region.boss;
        if (!boss) continue;
        boss.spin += dt;
        if (!boss.alive) {
          boss.group.scale.setScalar(Math.max(0, boss.group.scale.x - dt * 1.4));
          if (boss.group.scale.x <= .01) boss.group.visible = false;
          continue;
        }
        if (boss.id === 'chandelier') this.updateChandelier(boss, dt);
        else if (boss.id === 'wellheart') this.updateWellheart(boss, dt);
        else if (boss.id === 'greatwheel') this.updateGreatWheel(boss, dt);
        this.resolveBossHit(region, boss);
      }
    }
    updateChandelier(boss, dt) {
      // Five plates turn around the heart on a fixed carousel, and you shoot
      // through the GAPS. The old version guarded whichever side the player
      // stood on, which was invisible, unlearnable, and — because the guard
      // was a flat horizontal cone — trivially bypassed by shooting up at it
      // from directly underneath. A moving fence you can see is a fight; an
      // invisible hemisphere is a riddle with no clue in it.
      const wounded = 1 - boss.hp / boss.maxHp;
      boss.carousel = boss.spin * (.85 + wounded * .75);
      boss.plateHalfWidth = .42;
      for (const plate of boss.plates) {
        const angle = boss.carousel + plate.phase;
        plate.angle = angle;
        plate.mesh.position.set(Math.sin(angle) * 6.2, Math.sin(boss.spin * 1.3 + plate.phase) * .9, Math.cos(angle) * 6.2);
        plate.mesh.rotation.y = angle;
        // Ease a struck plate back out of its recoil squash.
        plate.mesh.scale.lerp(ONE_SCALE, 1 - Math.exp(-7 * dt));
      }
      boss.heart.rotation.y += dt * .7;
      boss.heart.scale.setScalar(1 + Math.sin(boss.spin * 3) * .05 + wounded * .12);
      boss.glow.material.opacity = .4 + wounded * .3 + Math.sin(boss.spin * 4) * .08;
      boss.halo.material.opacity = .16 + wounded * .2 + Math.sin(boss.spin * 2) * .05;
    }
    // Which plate, if any, is standing in the way of a ball arriving from
    // `approach` (a unit vector pointing from the boss toward the ball).
    chandelierBlocker(boss, approach) {
      // The plates' angles are group-local; measure the approach in the same
      // frame once the boss group stands on the sphere.
      const local = this.tempC.copy(approach);
      if (SPHERE_WORLD) local.applyQuaternion(this.frameQuat.copy(boss.group.quaternion).invert());
      const bearing = Math.atan2(local.x, local.z);
      for (const plate of boss.plates) {
        if (Math.abs(angleDelta(plate.angle, bearing)) < boss.plateHalfWidth) return plate;
      }
      return null;
    }
    updateWellheart(boss, dt) {
      // It breathes. Shut it is a stone shell; open it is a burning core on a
      // stalk. The states have to be unmistakable from across the pit — a
      // thing that only changes its brightness a little just reads as "a blob
      // that does nothing", which is exactly how this one landed.
      boss.cycle += dt * (.55 + (1 - boss.hp / boss.maxHp) * .5);
      const breath = Math.sin(boss.cycle);
      boss.exposed = breath > .25 ? 1 : 0;
      const open = clamp(breath * 1.4 * .5 + .5, 0, 1);
      for (const petal of boss.petals) {
        // Petals fold flat over the core when shut and peel right back when
        // open, so the silhouette itself changes shape rather than shading.
        const lean = -.15 + open * 2.05;
        petal.mesh.position.set(
          Math.cos(petal.phase) * (2.1 + open * 4.4),
          3.1 - open * 3.4,
          Math.sin(petal.phase) * (2.1 + open * 4.4),
        );
        petal.mesh.rotation.set(Math.sin(petal.phase) * lean, -petal.phase, -Math.cos(petal.phase) * lean);
      }
      // The core rises out of the shell on the open beat: a target that comes
      // to meet you is legible in a way a colour change never is.
      boss.sac.position.y = -1.4 + open * 4.2;
      boss.sac.scale.setScalar(.35 + open * 1.15);
      boss.sac.material.emissiveIntensity = .4 + open * 5.4;
      boss.shell.scale.set(1 + open * .06, 1 - open * .3, 1 + open * .06);
      boss.glow.material.opacity = .1 + open * .62;
    }
    updateGreatWheel(boss, dt) {
      // Four hubs riding the rings. Every one you break makes the rest turn
      // faster, so the fight tightens into a rhythm test — and it is all in
      // the air, which forces the player onto the orbiting plates.
      const broken = boss.nodes.filter(node => !node.alive).length;
      const speed = .55 + broken * .42;
      for (const node of boss.nodes) {
        if (!node.alive) continue;
        const angle = boss.spin * speed + node.phase;
        node.mesh.position.set(
          Math.cos(angle) * node.orbit,
          Math.sin(angle * 1.6 + node.phase) * 4.2,
          Math.sin(angle) * node.orbit,
        );
        node.mesh.rotation.set(angle, angle * 1.4, 0);
        node.mesh.material.emissiveIntensity = 2.6 + Math.sin(boss.spin * 5 + node.phase) * 1.2;
      }
      boss.hub.rotation.y += dt * (.4 + broken * .3);
      boss.glow.material.opacity = .35 + broken * .12;
    }
    // Bosses take hits from the one object the game is about, under whatever
    // rule their own design imposes.
    resolveBossHit(region, boss) {
      const ball = this.ball;
      if (ball.mode !== 'outbound' && ball.mode !== 'returning') return;
      const speed = ball.velocity.length();
      if (speed < 9) return;
      if (boss.id === 'greatwheel') {
        for (const node of boss.nodes) {
          if (!node.alive) continue;
          const worldPosition = this.tempA.copy(node.mesh.position);
          if (SPHERE_WORLD) worldPosition.applyQuaternion(boss.group.quaternion);
          worldPosition.add(boss.group.position);
          if (worldPosition.distanceTo(ball.position) > 2.6 + ball.radius) continue;
          node.alive = false;
          node.mesh.visible = false;
          boss.hp--;
          this.onBossDamaged(region, boss, worldPosition, 0xffd66b);
          const away = this.tempB.copy(ball.position).sub(worldPosition).normalize();
          if (!ball.comet) ball.velocity.addScaledVector(away, speed * .8);
          break;
        }
        return;
      }
      if (ball.collisionCooldown.has(boss.id)) return;
      const distance = boss.position.distanceTo(ball.position);
      if (distance > boss.radius + ball.radius + (boss.id === 'chandelier' ? 1.4 : 0)) return;
      ball.collisionCooldown.set(boss.id, .3);
      if (boss.id === 'chandelier') {
        const approach = this.tempA.copy(ball.position).sub(boss.position).normalize();
        const plate = this.chandelierBlocker(boss, approach);
        if (plate) {
          // You can see exactly what stopped it, and it rings and recoils.
          const along = ball.velocity.dot(approach);
          if (along < 0) ball.velocity.addScaledVector(approach, -1.85 * along);
          this.onBallBounce(ball.position);
          this.impact('locked', ball.position, 0x9ff4ff);
          plate.mesh.scale.set(1.18, .86, 1.18);
          audio.impact(.7, 'glass');
          return;
        }
      }
      if (boss.id === 'wellheart' && !boss.exposed) {
        const away = this.tempA.copy(ball.position).sub(boss.position).normalize();
        const along = ball.velocity.dot(away);
        if (along < 0) ball.velocity.addScaledVector(away, -1.8 * along);
        this.sealCue(ball.position, 0x8a5bd0);
        return;
      }
      boss.hp -= ball.comet ? BALL_CORES.comet.pierceDamage : 1;
      this.onBossDamaged(region, boss, ball.position.clone(), region.tint);
      const away = this.tempA.copy(ball.position).sub(boss.position).normalize();
      if (!ball.comet) ball.velocity.addScaledVector(away, speed * .9);
    }
    onBossDamaged(region, boss, at, tint) {
      this.hitStop = Math.max(this.hitStop, .05);
      this.shake = Math.max(this.shake, .34);
      this.showHitMarker(boss.hp <= 0);
      world.particles.burst(at, tint, 30, 13, .8, .2);
      world.pulseRing(at, new T.Color(tint), 7, .38);
      audio.impact(1, 'alien');
      this.addStyle(16, 900, 'CORE STRUCK', '#ffd66b');
      if (boss.hp > 0) return;
      boss.alive = false;
      world.spawnStones(boss.position, 12, 7);
      this.grantCore(region, boss);
    }
    // The payoff. A core is a permanent new verb for the ball, and it starts
    // orbiting the ball immediately — the player sees the reward on the object
    // they are already looking at, and never reads a word about it.
    grantCore(region, boss) {
      const spec = BALL_CORES[region.core];
      if (!spec || this.cores.has(spec.id)) return;
      this.cores.add(spec.id);
      this.stats.cores++;
      this.rewardFlash = 1;
      if (ui.rewardFlash) ui.rewardFlash.style.setProperty('--reward-tint', `#${spec.color.toString(16).padStart(6, '0')}`);
      this.hitStop = Math.max(this.hitStop, .1);
      this.shake = Math.max(this.shake, .8);
      this.addStyle(34, 6000, `${spec.id.toUpperCase()} CORE`, `#${spec.color.toString(16).padStart(6, '0')}`);
      world.particles.burst(boss.position, spec.color, 120, 26, 1.5, .4);
      world.spawnTrophy(boss.position, spec.color);
      world.particles.burst(boss.position, 0xffffff, 50, 18, 1.1, .5);
      world.pulseRing(boss.position, new T.Color(spec.color), 26, .9);
      world.pulseRing(this.ball.position, new T.Color(spec.color), 12, .7);
      audio.win();
    }
    updateEnemies(dt) {
      const player = this.player;
      // Enemies live and steer entirely in chart coordinates -- the space
      // their homes, leashes and speeds were authored in. The player and ball
      // are mirrored into that space once per step; only the visual pose and
      // outward effects are lifted onto the sphere.
      toChartVec(this.playerChartVec.copy(player.position));
      toChartVec(this.ballChartVec.copy(this.ball.position));
      for (const enemy of this.enemies) {
        enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 3.8);
        enemy.weakPulse = Math.max(0, enemy.weakPulse - dt);
        enemy.stun = Math.max(0, enemy.stun - dt);
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
        enemy.catchCooldown = Math.max(0, enemy.catchCooldown - dt);
        const visual = enemy.visual;
        if (!enemy.alive) {
          enemy.deadTimer -= dt;
          enemy.position.addScaledVector(enemy.velocity, dt);
          enemy.velocity.y -= 13 * dt;
          enemy.velocity.multiplyScalar(Math.exp(-2.4 * dt));
          fromChartVec(visual.group.position.copy(enemy.position));
          visual.group.rotateX(dt * 5);
          visual.group.rotateZ(dt * 3.5);
          const scale = clamp(enemy.deadTimer / .82, 0, 1);
          visual.group.scale.setScalar(Math.pow(scale, .65));
          if (enemy.deadTimer <= 0) visual.group.visible = false;
          continue;
        }
        const summitLocked = enemy.summit && world.fracture.active;
        const toPlayer = this.playerChartVec.clone().sub(enemy.position);
        const horizontalDistance = Math.hypot(toPlayer.x, toPlayer.z);
        // The far side's garrisons live INSIDE the view frustum even when the
        // moon itself hides them (the sphere curves away, the frustum does
        // not), so every distant enemy was still a handful of draw calls.
        // Beyond ~340 chart-m nothing is visible OR active: skip it whole.
        if (horizontalDistance > 340) {
          if (visual.group.visible) visual.group.visible = false;
          enemy.tensing = 0;
          enemy.dropping = 0;
          continue;
        }
        visual.group.visible = true;
        visual.group.scale.setScalar(1);
        const activeRange = enemy.type === 'warden' ? 80 : enemy.type === 'floater' ? 58 : 46;
        if (!summitLocked && horizontalDistance < activeRange && enemy.stun <= 0) {
          const desiredFacing = Math.atan2(toPlayer.x, toPlayer.z);
          if (enemy.type === 'shield' || enemy.type === 'warden') {
            const target = this.ballChartVec.clone().sub(enemy.position);
            const faceBall = Math.atan2(target.x, target.z);
            enemy.facing += angleDelta(enemy.facing, faceBall) * (1 - Math.exp(-dt * (this.ball.mode === 'returning' ? 1.4 : 4.8)));
          } else {
            enemy.facing += angleDelta(enemy.facing, desiredFacing) * (1 - Math.exp(-dt * 6.5));
          }
          if (enemy.type === 'skater') {
            // Carves long gliding arcs: strong push, almost no grip -- the
            // same drift the player feels on the ice, weaponized.
            const carve = toPlayer.setY(0).normalize();
            const lean = Math.sin(this.time * 1.4 + enemy.phase) * 1.1;
            carve.x += Math.cos(enemy.facing) * lean;
            carve.z -= Math.sin(enemy.facing) * lean;
            carve.normalize();
            enemy.velocity.x = damp(enemy.velocity.x, carve.x * 19, 1.1, dt);
            enemy.velocity.z = damp(enemy.velocity.z, carve.z * 19, 1.1, dt);
          } else if (enemy.type === 'drifter') {
            // Lurks hull-down in the powder, then surges. The rise IS the
            // telegraph: it stands up before it comes for you.
            if (horizontalDistance < 24 && enemy.attackCooldown <= 0 && enemy.tensing <= 0 && enemy.dropping <= 0) {
              enemy.tensing = .9;
              enemy.attackCooldown = 6;
            }
            if (enemy.tensing > 0) {
              enemy.tensing = Math.max(0, enemy.tensing - dt);
              if (enemy.tensing === 0) {
                enemy.dropping = 2.2;
                world.pulseRing(fromChartVec(this.tempC.copy(enemy.position)), new T.Color(0xe9edf6), 6, .35, true);
                audio.impact(.55, 'alien');
              }
            }
            const surge = enemy.dropping > 0 ? 11.5 : 1;
            const direction = toPlayer.setY(0).normalize();
            enemy.velocity.x = damp(enemy.velocity.x, direction.x * surge, 2.4, dt);
            enemy.velocity.z = damp(enemy.velocity.z, direction.z * surge, 2.4, dt);
          } else if (enemy.type === 'snowman') {
            // Waddles, TENSES (the vibrate is the telegraph), then LOBS.
            const direction = toPlayer.setY(0).normalize();
            const braking = enemy.tensing > 0 ? 0 : 2.4;
            enemy.velocity.x = damp(enemy.velocity.x, direction.x * braking, 2, dt);
            enemy.velocity.z = damp(enemy.velocity.z, direction.z * braking, 2, dt);
            if (horizontalDistance < 52 && enemy.attackCooldown <= 0 && enemy.tensing <= 0) {
              enemy.tensing = .55;
              enemy.attackCooldown = 4.4;
            }
            if (enemy.tensing > 0) {
              enemy.tensing = Math.max(0, enemy.tensing - dt);
              if (enemy.tensing === 0) {
                world.throwSnowball(enemy.position, this.playerChartVec);
                audio.impact(.4, 'alien');
              }
            }
          } else if (enemy.type === 'phantom') {
            // Pursues with a sidestep weave, and RUSHES after a short stand-up
            // -- the drifter's telegraph grammar, worn by a dead astronaut.
            if (horizontalDistance < 30 && enemy.attackCooldown <= 0 && enemy.tensing <= 0 && enemy.dropping <= 0) {
              enemy.tensing = .6;
              enemy.attackCooldown = 5;
            }
            if (enemy.tensing > 0) {
              enemy.tensing = Math.max(0, enemy.tensing - dt);
              if (enemy.tensing === 0) {
                enemy.dropping = 1.4;
                world.pulseRing(fromChartVec(this.tempC.copy(enemy.position)), new T.Color(0xff4444), 5, .3, true);
                audio.impact(.5, 'alien');
              }
            }
            const rush = enemy.dropping > 0 ? 13 : 5.6;
            const direction = toPlayer.setY(0).normalize();
            const weave = Math.sin(this.time * 1.9 + enemy.phase) * (enemy.dropping > 0 ? 0 : .55);
            const wx = direction.x + direction.z * weave;
            const wz = direction.z - direction.x * weave;
            enemy.velocity.x = damp(enemy.velocity.x, wx * rush, 3, dt);
            enemy.velocity.z = damp(enemy.velocity.z, wz * rush, 3, dt);
          } else if (enemy.type === 'scuttler') {
            const direction = toPlayer.setY(0).normalize();
            const strafe = Math.sin(this.time * 2.2 + enemy.phase) * .35;
            direction.x += Math.cos(enemy.facing) * strafe;
            direction.z -= Math.sin(enemy.facing) * strafe;
            direction.normalize();
            enemy.velocity.x = damp(enemy.velocity.x, direction.x * 4.8, 5, dt);
            enemy.velocity.z = damp(enemy.velocity.z, direction.z * 4.8, 5, dt);
          } else if (enemy.type === 'shardling') {
            // Darts in fast, then flicks sideways: hard to hit with a slow
            // ball, easy to catch with one already screaming off a spire.
            const dart = toPlayer.setY(0).normalize();
            const flick = Math.sin(this.time * 3.4 + enemy.phase);
            dart.x += Math.cos(enemy.facing + 1.57) * flick * 1.3;
            dart.z -= Math.sin(enemy.facing + 1.57) * flick * 1.3;
            dart.normalize();
            enemy.velocity.x = damp(enemy.velocity.x, dart.x * 9.2, 6.5, dt);
            enemy.velocity.z = damp(enemy.velocity.z, dart.z * 9.2, 6.5, dt);
          } else if (enemy.type === 'clinger') {
            // Waits above until you come near, tenses for a beat where you can
            // still get out, then drops. The old 7-metre trigger was tighter
            // than the player's own body plus the enemy's, so in practice it
            // never fired and the whole species did nothing.
            if (horizontalDistance < 16 && enemy.attackCooldown <= 0 && enemy.tensing <= 0 && enemy.dropping <= 0) {
              enemy.tensing = .55;
              enemy.attackCooldown = 5;
            }
            if (enemy.tensing > 0) {
              enemy.tensing = Math.max(0, enemy.tensing - dt);
              if (enemy.tensing === 0) {
                enemy.dropping = 2.4;
                world.pulseRing(fromChartVec(this.tempC.copy(enemy.position)), new T.Color(0xb463ff), 5, .3, true);
                audio.impact(.5, 'alien');
              }
            }
            const chase = enemy.dropping > 0 ? 6.2 : 1.1;
            const direction = toPlayer.setY(0).normalize();
            enemy.velocity.x = damp(enemy.velocity.x, direction.x * chase, 3, dt);
            enemy.velocity.z = damp(enemy.velocity.z, direction.z * chase, 3, dt);
          } else if (enemy.type === 'watcher') {
            // It attacks your CONTROL, not your health: while it has line of
            // sight on the ball it shoves the ball off your aim. In a game
            // about steering, that makes it the first thing you want dead.
            const orbit = this.time * .5 + enemy.phase;
            const direction = toPlayer.setY(0).normalize();
            direction.x += Math.cos(orbit) * 1.15;
            direction.z += Math.sin(orbit) * 1.15;
            direction.normalize();
            enemy.velocity.x = damp(enemy.velocity.x, direction.x * 2.6, 2.6, dt);
            enemy.velocity.z = damp(enemy.velocity.z, direction.z * 2.6, 2.6, dt);
            const ball = this.ball;
            if (ball.mode === 'outbound') {
              const push = this.tempB.copy(ball.position).sub(fromChartVec(this.tempC.copy(enemy.position)));
              const reach = push.length();
              if (reach > .5 && reach < 34) {
                push.multiplyScalar(1 / reach);
                ball.velocity.addScaledVector(push, (26 - reach * .5) * dt);
                enemy.beamHot = .35;
              }
            }
          } else if (enemy.type === 'floater') {
            // It circles, then commits to a dive. Previously it only drifted,
            // so a player could stand next to one indefinitely and never learn
            // what it was for — the definition of an object that raises the
            // question "does this do anything at all?".
            if (horizontalDistance < 20 && enemy.attackCooldown <= 0 && enemy.tensing <= 0 && enemy.dropping <= 0) {
              enemy.tensing = .5;
              enemy.attackCooldown = 4.5;
            }
            if (enemy.tensing > 0) {
              enemy.tensing = Math.max(0, enemy.tensing - dt);
              if (enemy.tensing === 0) {
                enemy.dropping = 1.5;
                world.pulseRing(fromChartVec(this.tempC.copy(enemy.position)), new T.Color(0x83efff), 4.5, .28, true);
                audio.impact(.45, 'alien');
              }
            }
            const orbitAngle = this.time * .72 + enemy.phase;
            const direction = toPlayer.setY(0).normalize();
            if (enemy.dropping <= 0) {
              direction.x += Math.cos(orbitAngle) * .82;
              direction.z += Math.sin(orbitAngle) * .82;
              direction.normalize();
            }
            const rush = enemy.dropping > 0 ? 11 : 3.8;
            enemy.velocity.x = damp(enemy.velocity.x, direction.x * rush, enemy.dropping > 0 ? 6 : 3.4, dt);
            enemy.velocity.z = damp(enemy.velocity.z, direction.z * rush, enemy.dropping > 0 ? 6 : 3.4, dt);
          } else if (enemy.type === 'brute') {
            const direction = toPlayer.setY(0).normalize();
            enemy.velocity.x = damp(enemy.velocity.x, direction.x * 2.15, 2.8, dt);
            enemy.velocity.z = damp(enemy.velocity.z, direction.z * 2.15, 2.8, dt);
          } else if (enemy.type === 'warden') {
            enemy.velocity.x = damp(enemy.velocity.x, Math.cos(this.time * .72 + enemy.phase) * 4.2, 3.2, dt);
            enemy.velocity.z = damp(enemy.velocity.z, Math.sin(this.time * .5 + enemy.phase) * 2.1, 3.2, dt);
          } else {
            enemy.velocity.x *= Math.exp(-5 * dt);
            enemy.velocity.z *= Math.exp(-5 * dt);
          }
        } else {
          enemy.velocity.x *= Math.exp(-4 * dt);
          enemy.velocity.z *= Math.exp(-4 * dt);
        }
        enemy.position.x += enemy.velocity.x * dt;
        enemy.position.z += enemy.velocity.z * dt;
        const floor = world.floorHeight(enemy.position.x, enemy.position.z, enemy.position.y + 2);
        if (enemy.dropping > 0) enemy.dropping = Math.max(0, enemy.dropping - dt);
        if (enemy.tensing > 0 && (summitLocked || horizontalDistance >= activeRange || enemy.stun > 0)) enemy.tensing = 0;
        const hop = enemy.type === 'skater' ? .06
          : enemy.type === 'snowman'
            ? (enemy.tensing > 0 ? .55 + Math.sin(this.time * 24) * .14 : Math.abs(Math.sin(this.time * 3.1 + enemy.phase)) * .22)
          : enemy.type === 'phantom' ? (enemy.tensing > 0 ? .5 + Math.sin(this.time * 26) * .1 : .02)
          : enemy.type === 'drifter'
            ? (enemy.dropping > 0 ? .9 : (enemy.tensing > 0 ? .7 + Math.sin(this.time * 22) * .18 : -.85))
            : enemy.type === 'scuttler' ? Math.max(0, Math.sin(this.time * 5.2 + enemy.phase)) * .32
          // A floater rears UP as it winds up, then comes down on the dive, so
          // the attack is announced by its height before it is dangerous.
          : enemy.type === 'floater'
            ? (enemy.dropping > 0 ? 1.5
              : (enemy.tensing > 0 ? 6.4 + Math.sin(this.time * 30) * .3 : 4.1 + Math.sin(this.time * 2.3 + enemy.phase) * .8))
            : enemy.type === 'shardling' ? 5.6 + Math.sin(this.time * 3.1 + enemy.phase) * 1.5
              : enemy.type === 'watcher' ? 7.4 + Math.sin(this.time * 1.4 + enemy.phase) * 1.1
                // A clinger hangs high, twitches downward while it tenses so
                // the drop is telegraphed, then rides the floor.
                : enemy.type === 'clinger'
                  ? (enemy.dropping > 0 ? .3
                    : (enemy.tensing > 0 ? 8.2 + Math.sin(this.time * 34) * .55 : 9.5 + Math.sin(this.time * 1.1 + enemy.phase) * .6))
                  : enemy.type === 'brute' ? Math.max(0, Math.sin(this.time * 2.2 + enemy.phase)) * .14
                    : Math.sin(this.time * 1.7 + enemy.phase) * .06;
        enemy.position.y = enemy.type === 'clinger'
          ? damp(enemy.position.y, floor + hop, enemy.dropping > 0 ? 9 : 2.4, dt)
          : floor + hop;
        fromChartVec(visual.group.position.copy(enemy.position));
        liftQuatAt(enemy.position.x, enemy.position.z, visual.group.quaternion)
          .multiply(this.frameQuat.setFromAxisAngle(UP, enemy.facing + Math.PI));
        visual.abdomen.scale.y = visual.scale * (.8 + hop * .08);
        // The phantom's visor keeps its own dead calm; every other eye pulses.
        if (enemy.type !== 'phantom') visual.eye.material.emissiveIntensity = 3.8 + Math.sin(this.time * 5 + enemy.phase) * .9;
        visual.weak.visible = enemy.type === 'shield' || enemy.type === 'warden' || enemy.type === 'brute' || enemy.type === 'phantom';
        // Snowmen pop a segment per hit: body balls (and the face with the
        // head) vanish as hp falls.
        if (enemy.type === 'snowman' && visual.group.userData.snowballs) {
          visual.group.userData.snowballs.forEach((ballMesh, i) => { ballMesh.visible = i < enemy.hp; });
          const headOn = enemy.hp >= 3;
          for (const bit of visual.group.userData.headBits) bit.visible = headOn;
        }
        if (visual.weak.visible) {
          // Damage is written on the armour: the core burns brighter and beats
          // faster the closer this thing is to breaking, so a player can read
          // an enemy's health across the crater without a bar.
          const wounded = 1 - clamp(enemy.hp / enemy.maxHp, 0, 1);
          const beckon = enemy.weakPulse > 0 ? enemy.weakPulse : 0;
          const beat = Math.sin(this.time * (4 + wounded * 7 + beckon * 5)) * .5 + .5;
          visual.weak.material.emissiveIntensity = 1.9 + wounded * 3.4 + beat * (.6 + beckon * 4.2);
          visual.weak.scale.setScalar(1 + wounded * .3 + beckon * .55 + beat * .08);
        }
        if (visual.shield) visual.shield.material.emissiveIntensity = 1.7 + enemy.hitFlash * 5;
        const playerDistance = enemy.position.distanceTo(this.playerChartVec);
        if (playerDistance < enemy.radius + player.radius + .6 && player.damageCooldown <= 0 && !summitLocked) {
          if (vspeedOf(player.velocity, player.up) < -3 && this.playerChartVec.y > enemy.position.y + enemy.radius * .5) {
            this.damageAlien(enemy, 1, 'stomp');
            setVspeed(player.velocity, player.up, 12.8);
            player.jumpsUsed = Math.min(player.jumpsUsed, 1);
            this.addStyle(9, 330, 'LUNAR STOMP', '#83efff');
          } else {
            this.damagePlayer(enemy);
          }
        }
      }
    }
    updateRoc(dt) {
      const roc = world.roc;
      if (!roc) return;
      const player = this.player;
      roc.hitFlash = Math.max(0, roc.hitFlash - dt * 3.4);
      if (!roc.alive) {
        if (roc.deadTimer > 0) {
          roc.deadTimer -= dt;
          roc.position.addScaledVector(roc.diveVelocity, dt);
          roc.diveVelocity.addScaledVector(dirAt(roc.position, this.tempC), -12 * dt);
          roc.group.position.copy(roc.position);
          roc.group.rotateZ(dt * 4.2);
          roc.group.scale.setScalar(Math.max(.01, roc.deadTimer / 1.4));
          if (roc.deadTimer <= 0) roc.group.visible = false;
        }
        return;
      }
      const wounded = 1 - roc.hp / roc.maxHp;
      roc.modeTimer += dt;
      const perch = roc.perch;
      if (roc.mode === 'circle') {
        roc.angle += dt * roc.speed * (1 + wounded * .7);
        const bob = Math.sin(this.time * 1.3) * 3;
        roc.chartPos.set(
          perch.x + Math.cos(roc.angle) * roc.radius,
          roc.altitude + bob,
          perch.z + Math.sin(roc.angle) * roc.radius,
        );
        fromChartVec(roc.position.copy(roc.chartPos));
        // rear up and dive when someone is standing on the perch
        const playerChart = toChartVec(this.playerChartVec.copy(player.position));
        const onPerch = Math.hypot(playerChart.x - perch.x, playerChart.z - perch.z) < perch.radius + 26
          && Math.abs(playerChart.y - perch.top) < 40;
        if (onPerch && roc.modeTimer > 5.2) {
          roc.mode = 'rear';
          roc.modeTimer = 0;
          audio.impact(.6, 'alien');
          world.pulseRing(roc.position, new T.Color(0xffb42a), 9, .4, true);
        }
      } else if (roc.mode === 'rear') {
        roc.position.addScaledVector(dirAt(roc.position, this.tempC), 9 * dt);
        roc.weak.material.emissiveIntensity = 2.4 + Math.sin(this.time * 26) * 1.4;
        if (roc.modeTimer > .75) {
          roc.mode = 'dive';
          roc.modeTimer = 0;
          roc.diveVelocity.copy(player.position).sub(roc.position).normalize().multiplyScalar(46);
          audio.impact(.9, 'alien');
        }
      } else if (roc.mode === 'dive') {
        roc.position.addScaledVector(roc.diveVelocity, dt);
        if (player.damageCooldown <= 0 && roc.position.distanceTo(player.position) < 4.4) {
          const shim = toChartVec(this.vspeedScratch.copy(roc.position));
          this.damagePlayer({ position: shim, radius: 3.4 });
        }
        if (roc.modeTimer > 1.25) {
          roc.mode = 'climb';
          roc.modeTimer = 0;
        }
      } else {
        // climb back onto the circle
        const bob = Math.sin(this.time * 1.3) * 3;
        roc.chartPos.set(
          perch.x + Math.cos(roc.angle) * roc.radius,
          roc.altitude + bob,
          perch.z + Math.sin(roc.angle) * roc.radius,
        );
        const home = fromChartVec(this.tempC.copy(roc.chartPos));
        roc.position.lerp(home, 1 - Math.exp(-2.2 * dt));
        if (roc.modeTimer > 1.6) roc.mode = 'circle';
      }
      toChartVec(roc.chartPos.copy(roc.position));
      dirAt(roc.position, roc.up);
      // pose: stand on the local vertical, face along the flight circle
      liftQuatAt(roc.chartPos.x, roc.chartPos.z, roc.group.quaternion)
        .multiply(this.frameQuat.setFromAxisAngle(UP, -roc.angle));
      roc.group.position.copy(roc.position);
      const flap = Math.sin(this.time * (roc.mode === 'dive' ? 13 : 6.2)) * (roc.mode === 'dive' ? .18 : .52);
      roc.wings[0].rotation.z = flap;
      roc.wings[1].rotation.z = -flap;
      roc.body.material.emissiveIntensity = .85 + roc.hitFlash * 2.6 + wounded * .5;
      if (roc.mode !== 'rear') roc.weak.material.emissiveIntensity = 1.9 + wounded * 2.2 + Math.sin(this.time * (4 + wounded * 6)) * .6;
    }
    // How much danger the music should admit to: nearest living boss wins.
    feelThreat(position, reach) {
      const away = arcTo(this.threatPlayerDir, dirAt(position, this.tempB));
      if (away < reach) this.threatNow = Math.max(this.threatNow, 1 - away / reach);
    }
    updateThreatMusic() {
      this.threatPlayerDir = dirAt(this.player.position, this.tempC);
      this.threatNow = 0;
      if (world.colossus?.alive) this.feelThreat(world.colossus.position, 65);
      if (world.roc?.alive) this.feelThreat(world.roc.position, 70);
      if (this.endgameOpen && world.moonheart?.alive) this.feelThreat(world.moonheart.position, 55);
      for (const region of world.regions) {
        if (region.boss?.alive && region.boss.engaged !== false) this.feelThreat(region.boss.position, 50);
      }
      audio.setThreat(this.threatNow);
    }
    updateColossus(dt) {
      const titan = world.colossus;
      if (!titan) return;
      titan.hitFlash = Math.max(0, titan.hitFlash - dt * 3.2);
      titan.chest.material.emissiveIntensity = .5 + titan.hitFlash * 2.6;
      if (!titan.alive) {
        if (titan.deadTimer > 0) {
          titan.deadTimer -= dt;
          titan.group.scale.setScalar(Math.max(.01, titan.deadTimer / 1.6));
          if (titan.deadTimer <= 0) titan.group.visible = false;
        }
        return;
      }
      const wounded = 1 - titan.hp / titan.maxHp;
      titan.modeTimer += dt;
      titan.exposed = Math.max(0, titan.exposed - dt);
      const trueAway = arcTo(dirAt(this.player.position, this.tempC), titan.up);
      const near = trueAway < 60;
      if (titan.mode === 'idle') {
        titan.arms[0].rotation.x = Math.sin(this.time * .8) * .1;
        titan.arms[1].rotation.x = Math.sin(this.time * .8 + 1.4) * .1;
        if (near && titan.modeTimer > 3.6 - wounded * 1.4) {
          titan.mode = 'windup';
          titan.modeTimer = 0;
          audio.impact(.6, 'rock');
        }
      } else if (titan.mode === 'windup') {
        const raise = Math.min(1, titan.modeTimer / .8);
        titan.arms[0].rotation.x = -2.2 * raise;
        titan.arms[1].rotation.x = -2.2 * raise;
        titan.weak.material.emissiveIntensity = 3.2 + Math.sin(this.time * 22) * 1.2;
        if (titan.modeTimer >= .8) {
          titan.mode = 'stomp';
          titan.modeTimer = 0;
          titan.arms[0].rotation.x = .5;
          titan.arms[1].rotation.x = .5;
          titan.exposed = 2.2;
          // THE STOMP: a shockwave along the ground. Grounded and close =
          // flung; airborne rides it out -- jumping the wave is the dance.
          world.pulseRing(titan.position, new T.Color(0xc9a06a), 30, .6);
          world.particles.burst(titan.position, 0xc9a06a, 40, 16, .9, .25);
          audio.impact(1, 'rock');
          this.shake = Math.max(this.shake, .5);
          if (this.player.grounded && trueAway < 30) {
            setVspeed(this.player.velocity, this.player.up, Math.max(vspeedOf(this.player.velocity, this.player.up), 15));
            this.player.grounded = false;
            if (trueAway < 12 && this.player.damageCooldown <= 0) this.damagePlayer({ position: toChartVec(this.vspeedScratch.copy(titan.position)) });
          }
        }
      } else {
        // stagger: the core stands bared
        titan.weak.material.emissiveIntensity = 4.4 + Math.sin(this.time * 9) * 1.4;
        if (titan.modeTimer > 2.2) {
          titan.mode = 'idle';
          titan.modeTimer = 0;
          titan.weak.material.emissiveIntensity = 1.9;
        }
      }
      titan.chest.rotation.y = Math.sin(this.time * .5) * .08;
    }
    resolveBallCrust() {
      const ball = this.ball;
      if (ball.mode !== 'outbound' && ball.mode !== 'returning') return;
      for (const plate of world.crustPlates || []) {
        if (plate.hole.open || ball.collisionCooldown.has(plate.hole)) continue;
        if (plate.position.distanceTo(ball.position) > 7.4 + ball.radius) continue;
        const speed = ball.velocity.length();
        if (speed <= 8) continue;
        ball.collisionCooldown.set(plate.hole, .3);
        plate.hp -= speed > 42 ? 2 : 1;
        const cracked = 1 - Math.max(0, plate.hp) / plate.maxHp;
        plate.veins.material.opacity = .3 + cracked * .65;
        plate.group.children[0].material.emissiveIntensity = .5 + cracked * 1.6;
        this.showHitMarker(plate.hp <= 0);
        world.particles.burst(ball.position, 0xa96bff, 18, 9, .7, .2);
        audio.impact(.9, 'rock');
        this.shake = Math.max(this.shake, .22);
        if (plate.hp > 0) continue;
        // THE MOON IS OPEN. Fall in, fall THROUGH, come out the other side.
        plate.hole.open = true;
        plate.group.visible = false;
        world.reDisplaceTerrain(plate.hole.dir, 30);
        world.pulseRing(plate.position, new T.Color(0xa96bff), 18, .8);
        world.particles.burst(plate.position, 0xc9a7ff, 60, 18, 1.2, .3);
        audio.impact(1, 'rock');
        audio.score(true);
        this.shake = Math.max(this.shake, .7);
        this.addStyle(24, 1800, 'THE MOON IS THIN HERE', '#c9a7ff');
      }
    }
    // Falling deep inside a thin place hands you to the far side of the moon.
    updateCrustTransit() {
      const playerDir = dirAt(this.player.position, this.tempC);
      for (const hole of CRUST_HOLES) {
        if (!hole.open) continue;
        if (arcTo(playerDir, hole.dir) > 11 || altAt(this.player.position) > -30) continue;
        const exitDir = this.tempB.copy(hole.dir).negate();
        this.player.position.copy(PLANET_CENTRE).addScaledVector(exitDir, PLANET.radius + 52);
        this.player.velocity.copy(exitDir).multiplyScalar(-4);
        this.player.grounded = false;
        this.player.jumpsUsed = 0;
        if (this.ball.mode !== 'ready') {
          this.ball.position.copy(PLANET_CENTRE).addScaledVector(exitDir, PLANET.radius + 55);
          this.ball.velocity.set(0, 0, 0);
          this.ball.mode = 'returning';
        }
        this.rewardFlash = 1;
        if (ui.rewardFlash) ui.rewardFlash.style.setProperty('--reward-tint', '#ffffff');
        world.pulseRing(this.player.position, new T.Color(0xc9a7ff), 14, .8);
        audio.impact(1, 'rock');
        audio.score(true);
        this.shake = Math.max(this.shake, .55);
        this.addStyle(20, 1400, 'THROUGH THE MOON', '#c9a7ff');
        return;
      }
    }
    resolveBallColossus() {
      const titan = world.colossus;
      const ball = this.ball;
      if (!titan?.alive || ball.collisionCooldown.has('colossus')) return;
      if (ball.mode !== 'outbound' && ball.mode !== 'returning') return;
      const centre = this.tempC.copy(titan.position).addScaledVector(titan.up, 7);
      const distance = centre.distanceTo(ball.position);
      if (distance > 5.6 + ball.radius) return;
      const speed = ball.velocity.length();
      const normal = this.tempA.copy(ball.position).sub(centre).normalize();
      ball.collisionCooldown.set('colossus', .3);
      if (speed <= 8) {
        const glance = ball.velocity.dot(normal);
        if (glance < 0) ball.velocity.addScaledVector(normal, -1.6 * glance);
        this.impact('graze', ball.position);
        return;
      }
      const back = this.tempB.set(0, 0, 1).applyQuaternion(titan.group.quaternion);
      const bared = titan.exposed > 0 && normal.dot(back) > .2;
      const damage = (bared ? 2 : 1) + (speed > 42 ? 1 : 0);
      titan.hp -= damage;
      titan.hitFlash = 1;
      this.hitStop = Math.max(this.hitStop, .05);
      this.shake = Math.max(this.shake, .3);
      this.showHitMarker(titan.hp <= 0);
      world.particles.burst(ball.position, 0xc9a06a, 24, 11, .8, .2);
      world.pulseRing(ball.position, new T.Color(0xc9a06a), 6, .35);
      audio.impact(1, 'rock');
      this.addStyle(bared ? 18 : 12, bared ? 950 : 600, bared ? 'CORE OF THE MOUNTAIN' : 'COLOSSUS STRUCK', '#c9a06a');
      const along = ball.velocity.dot(normal);
      if (along < 0 && !ball.comet) ball.velocity.addScaledVector(normal, -1.6 * along);
      if (titan.hp > 0) return;
      titan.alive = false;
      titan.deadTimer = 1.6;
      titan.weak.material.emissiveIntensity = 1.9;
      world.spawnStones(centre, 14, 9);
      this.stats.kills++;
      this.rewardFlash = 1;
      if (ui.rewardFlash) ui.rewardFlash.style.setProperty('--reward-tint', '#c9a06a');
      this.cores.add('colossus');
      this.stats.cores++;
      world.spawnTrophy(centre, 0xc9a06a);
      this.addStyle(34, 5200, 'THE COLOSSUS FALLS', '#ffd66b');
      world.pulseRing(centre, new T.Color(0xc9a06a), 30, .8);
      audio.win();
      this.shake = Math.max(this.shake, .8);
    }
    resolveBallRoc() {
      const roc = world.roc;
      const ball = this.ball;
      if (!roc?.alive || ball.collisionCooldown.has('roc')) return;
      if (ball.mode !== 'outbound' && ball.mode !== 'returning') return;
      const distance = roc.position.distanceTo(ball.position);
      if (distance > 4.6 + ball.radius) return;
      const speed = ball.velocity.length();
      const normal = this.tempA.copy(ball.position).sub(roc.position).normalize();
      ball.collisionCooldown.set('roc', .3);
      if (speed <= 8) {
        const glance = ball.velocity.dot(normal);
        if (glance < 0) ball.velocity.addScaledVector(normal, -1.4 * glance);
        this.impact('graze', ball.position);
        return;
      }
      // from ABOVE, onto the gold eye on its back: double
      const fromAbove = normal.dot(roc.up) > .5;
      const damage = (fromAbove ? 2 : 1) + (speed > 40 ? 1 : 0);
      roc.hp -= damage;
      roc.hitFlash = 1;
      this.hitStop = Math.max(this.hitStop, .05);
      this.shake = Math.max(this.shake, .3);
      this.showHitMarker(roc.hp <= 0);
      world.particles.burst(ball.position, 0xffb42a, 26, 12, .8, .2);
      world.pulseRing(ball.position, new T.Color(0xffb42a), 6, .35);
      audio.impact(1, 'alien');
      this.addStyle(fromAbove ? 18 : 12, fromAbove ? 950 : 600, fromAbove ? 'TALON STRIKE' : 'ROC STRUCK', '#ffb42a');
      const along = ball.velocity.dot(normal);
      if (along < 0 && !ball.comet) ball.velocity.addScaledVector(normal, -1.5 * along);
      if (roc.hp > 0) return;
      roc.alive = false;
      roc.deadTimer = 1.4;
      roc.diveVelocity.copy(normal).multiplyScalar(9);
      world.spawnStones(roc.position, 14, 9);
      this.stats.kills++;
      this.rewardFlash = 1;
      if (ui.rewardFlash) ui.rewardFlash.style.setProperty('--reward-tint', '#ffb42a');
      this.cores.add('roc');
      this.stats.cores++;
      world.spawnTrophy(roc.position, 0xffb42a);
      this.addStyle(34, 5200, 'THE ROC FALLS', '#ffd66b');
      world.pulseRing(roc.position, new T.Color(0xffb42a), 30, .8);
      audio.win();
      this.shake = Math.max(this.shake, .8);
    }
    // ---- THE END OF THE MOON ---------------------------------------------
    // Every boss down -- the three regions and THE ROC -- plus 90 crescents
    // gathered (not all of them; there are hundreds), and the ice over THE
    // BOWL cracks open into a shaft to the moon's heart.
    updateEndgame(dt) {
      if (!this.endgameOpen) {
        const bossesDown = world.regions.filter(region => region.boss && !region.boss.alive).length
          + (world.roc && !world.roc.alive ? 1 : 0)
          + (world.colossus && !world.colossus.alive ? 1 : 0);
        if (bossesDown >= 4 && this.drops >= 200) this.openMoonHole();
        return;
      }
      const heart = world.moonheart;
      if (heart && heart.alive) this.updateMoonheart(dt);
      if (world.holePillar) {
        world.holePillar.visible = !this.endgameComplete
          && arcTo(dirAt(this.player.position, this.playerUpScratch), FAR_SIGHTS.bowl) > 60;
      }
      if (!this.endgameComplete) return;
      // The way back up -- but only while JUMP is held. Alex wanted back DOWN
      // after the win and the old always-on draft kept spitting him out;
      // now falling in with jump released is a normal fall.
      const pAlt = altAt(this.player.position);
      if (this.jumpHeldNow && pAlt > MOONHOLE.depth - 3 && pAlt < -6
        && arcTo(dirAt(this.player.position, this.playerUpScratch), FAR_SIGHTS.bowl) < 15) {
        const vy = vspeedOf(this.player.velocity, this.player.up);
        setVspeed(this.player.velocity, this.player.up, Math.min(48, vy + 48 * 2.4 * dt));
        this.player.jumpsUsed = 0;
        this.player.grounded = false;
      }
      const bAlt = altAt(this.ball.position);
      if ((this.ball.mode === 'outbound' || this.ball.mode === 'returning')
        && bAlt > MOONHOLE.depth - 3 && bAlt < -6
        && arcTo(dirAt(this.ball.position, this.ballUpScratch), FAR_SIGHTS.bowl) < 16) {
        const ballUp = dirAt(this.ball.position, this.ballUpScratch);
        const bvy = vspeedOf(this.ball.velocity, ballUp);
        setVspeed(this.ball.velocity, ballUp, Math.min(48, bvy + 48 * 1.8 * dt));
      }
    }
    openMoonHole() {
      this.endgameOpen = true;
      MOONHOLE.open = true;
      world.reDisplaceTerrain(FAR_SIGHTS.bowl, 46);
      world.makeMoonheart();
      if (world.iceSheen) world.iceSheen.visible = false;
      const mouth = chartLift(0, -15, 1130, new T.Vector3());
      world.particles.burst(mouth, 0x9defff, 90, 26, 1.6, .5);
      world.particles.burst(mouth, 0xbf83ff, 50, 20, 1.2, .4);
      world.pulseRing(mouth, new T.Color(0x9defff), 60, 1);
      // You HEAR the moon open, wherever you are: three deep quakes and a
      // fanfare, and a pillar of light stands over the hole until you enter.
      audio.impact(1, 'rock');
      setTimeout(() => audio.impact(1, 'rock'), 260);
      setTimeout(() => audio.impact(.9, 'rock'), 560);
      setTimeout(() => audio.win(), 820);
      world.makeHolePillar(mouth);
      this.hitStop = Math.max(this.hitStop, .12);
      this.shake = 1;
      this.addStyle(30, 4000, 'THE MOON OPENS', '#9defff');
    }
    updateMoonheart(dt) {
      const heart = world.moonheart;
      heart.spin += dt;
      heart.hitFlash = Math.max(0, heart.hitFlash - dt * 3);
      const broken = heart.nodes.filter(node => !node.alive).length;
      heart.exposed = broken >= heart.nodes.length;
      // Dawdle while it stands bared and it re-armours: after nine seconds
      // exposed with no core strike, two shards regrow.
      if (heart.exposed) {
        heart.exposedTimer += dt;
        if (heart.exposedTimer > 9) {
          heart.exposedTimer = 0;
          let regrown = 0;
          for (const node of heart.nodes) {
            if (regrown >= 2) break;
            if (node.alive) continue;
            node.alive = true;
            node.mesh.visible = true;
            regrown++;
          }
          world.particles.burst(heart.position, 0xbf83ff, 30, 12, .8, .3);
          audio.impact(.7, 'glass');
        }
      } else {
        heart.exposedTimer = 0;
      }
      const speed = .7 + broken * .22;
      for (const node of heart.nodes) {
        if (!node.alive) continue;
        const angle = heart.spin * speed + node.phase;
        const reach = 11 + node.ring * 3.5;
        node.mesh.position.set(
          Math.cos(angle) * reach,
          Math.sin(angle * (node.ring ? 1.35 : 1)) * (node.ring ? 5.5 : 3.2),
          Math.sin(angle) * reach * (node.ring ? .72 : 1),
        );
        node.mesh.rotation.set(angle, angle * 1.3, 0);
      }
      heart.core.rotation.y += dt * (.5 + broken * .25);
      heart.core.material.emissiveIntensity = heart.exposed
        ? 4.6 + Math.sin(this.time * 9) * 1.7
        : 2 + broken * .4 + heart.hitFlash * 2.4;
      heart.core.scale.setScalar(1 + Math.sin(heart.spin * (2 + broken)) * .05 + heart.hitFlash * .12);
    }
    resolveBallMoonheart() {
      const heart = world.moonheart;
      const ball = this.ball;
      if (!heart?.alive) return;
      if (ball.mode !== 'outbound' && ball.mode !== 'returning') return;
      const speed = ball.velocity.length();
      // shards first: each one takes one solid hit
      for (const node of heart.nodes) {
        if (!node.alive || ball.collisionCooldown.has('heart-' + node.phase)) continue;
        const worldPosition = this.tempA.copy(node.mesh.position)
          .applyQuaternion(heart.group.quaternion).add(heart.group.position);
        if (worldPosition.distanceTo(ball.position) > 2.3 + ball.radius) continue;
        ball.collisionCooldown.set('heart-' + node.phase, .3);
        if (speed <= 9) continue;
        node.alive = false;
        node.mesh.visible = false;
        world.spawnStones(worldPosition, 3, 2.5);
        this.impact('break', worldPosition, 0xbf83ff);
        this.showHitMarker(false);
        this.addStyle(14, 700, 'SHARD DOWN', '#bf83ff');
        const away = this.tempB.copy(ball.position).sub(worldPosition).normalize();
        const along = ball.velocity.dot(away);
        if (along < 0) ball.velocity.addScaledVector(away, -1.6 * along);
        return;
      }
      // then the bared heart
      if (ball.collisionCooldown.has('moonheart')) return;
      const coreDistance = heart.position.distanceTo(ball.position);
      if (coreDistance > 4.8 + ball.radius) return;
      ball.collisionCooldown.set('moonheart', .35);
      const away = this.tempA.copy(ball.position).sub(heart.position).normalize();
      if (!heart.exposed || speed <= 9) {
        const along = ball.velocity.dot(away);
        if (along < 0) ball.velocity.addScaledVector(away, -1.8 * along);
        this.sealCue(ball.position, 0x63e4ff);
        return;
      }
      heart.coreHp--;
      heart.exposedTimer = 0;
      heart.hitFlash = 1;
      this.hitStop = Math.max(this.hitStop, .08);
      this.shake = Math.max(this.shake, .5);
      this.showHitMarker(heart.coreHp <= 0);
      world.particles.burst(ball.position, 0x63e4ff, 40, 16, 1, .3);
      world.pulseRing(ball.position, new T.Color(0x63e4ff), 12, .5);
      audio.impact(1, 'glass');
      this.addStyle(22, 1600, 'HEART STRUCK', '#9defff');
      const along = ball.velocity.dot(away);
      if (along < 0 && !ball.comet) ball.velocity.addScaledVector(away, -1.6 * along);
      if (heart.coreHp > 0) return;
      this.completeEndgame();
    }
    completeEndgame() {
      const heart = world.moonheart;
      this.endgameComplete = true;
      heart.alive = false;
      heart.exposed = false;
      for (const node of heart.nodes) node.mesh.visible = false;
      // the heart survives as a gentle light at the bottom of the world
      heart.core.material.emissiveIntensity = 1.2;
      heart.core.scale.setScalar(1.4);
      world.spawnStones(heart.position, 24, 10);
      world.dressMoonheartBall();
      world.drawSmiles();
      try { localStorage.setItem('moonkick-heart-v1', '1'); } catch (ignored) { void ignored; }
      this.rewardFlash = 1;
      if (ui.rewardFlash) ui.rewardFlash.style.setProperty('--reward-tint', '#9defff');
      this.hitStop = Math.max(this.hitStop, .14);
      this.shake = 1;
      world.pulseRing(heart.position, new T.Color(0x9defff), 40, 1.1);
      audio.win();
      this.addStyle(50, 20000, 'THE END OF THE MOON', '#9defff');
    }
    updatePlaygroundInteractions(dt) {
      for (const pickup of world.collectibles) {
        if (!pickup.active) continue;
        const playerDistance = pickup.group.position.distanceTo(this.player.position.clone().addScaledVector(this.player.up, .9));
        const ballDistance = pickup.group.position.distanceTo(this.ball.position);
        if (playerDistance > 2.1 && ballDistance > 1.65) continue;
        pickup.active = false;
        pickup.group.visible = false;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
        this.player.jumpsUsed = 0;
        this.player.jumpBuffer = Math.max(this.player.jumpBuffer, .06);
        this.addStyle(8, 420, pickup.label, '#ffd66b');
        world.particles.burst(pickup.group.position, 0xffd66b, 28, 9, .82, .25);
        audio.score(true);
      }

      if (this.ball.mode !== 'outbound' && this.ball.mode !== 'returning') return;
      const bp = chartFrameAt(this.ball.position, this.ballChart);
      for (const pad of world.launchPads) {
        if (pad.cooldown > 0 || Math.abs(bp.alt - pad.position.y) > 1.5) continue;
        if (Math.hypot(bp.x - pad.position.x, bp.z - pad.position.z) > pad.radius) continue;
        pad.cooldown = .48;
        setAltAt(this.ball.position, pad.position.y + this.ball.radius + .25);
        setVspeed(this.ball.velocity, bp.up, Math.max(Math.abs(vspeedOf(this.ball.velocity, bp.up)) * .72, pad.impulse * 1.22));
        this.ball.velocity.multiplyScalar(1.08);
        this.ball.bounceCount++;
        this.addStyle(6, 260, 'BALLSPRING', '#83efff');
        world.particles.burst(chartLift(pad.position.x, pad.position.y + .45, pad.position.z, this.tempC), 0x72efff, 24, 10, .68, .08);
        audio.impact(.8, 'anchor');
      }
    }
    damagePlayer(enemy) {
      const player = this.player;
      if (player.invulnerable > 0 || player.damageCooldown > 0) return;
      player.health = Math.max(0, player.health - 1);
      player.damageCooldown = .8;
      player.invulnerable = .45;
      const delta = this.tempB.copy(player.position).sub(fromChartVec(this.tempC.copy(enemy.position)));
      const away = tangentOf(delta, player.up, new T.Vector3()).addScaledVector(player.up, .18).normalize();
      player.velocity.addScaledVector(away, 10);
      setVspeed(player.velocity, player.up, Math.max(vspeedOf(player.velocity, player.up), 6.5));
      this.style = Math.max(0, this.style - 16);
      this.shake = Math.max(this.shake, .62);
      ui.damageVignette?.classList.add('active');
      setTimeout(() => ui.damageVignette?.classList.remove('active'), 180);
      audio.damage();
      if (player.health <= 0) this.respawnPlayer();
    }
    // Remember the frame a checkpoint was earned in, so respawning restores
    // the same sense of "which way is forward" -- checkpointYaw is an angle
    // inside this frame. A transport fix-up at restore re-seats the frame on
    // the exact checkpoint vertical.
    saveCheckpointFrame() {
      this.player.checkpointYaw = this.player.yaw;
      this.player.checkpointUp.copy(this.player.up);
      this.player.checkpointFrame.copy(this.player.frame);
    }
    respawnPlayer() {
      const player = this.player;
      this.stats.falls++;
      this.respawnCount++;
      player.position.copy(player.checkpoint);
      player.velocity.set(0, 0, 0);
      player.yaw = player.checkpointYaw;
      player.up.copy(player.checkpointUp);
      player.frame.copy(player.checkpointFrame);
      if (SPHERE_WORLD) {
        const trueUp = dirAt(player.position, this.playerUpScratch);
        this.transportQuat.setFromUnitVectors(player.up, trueUp);
        player.frame.premultiply(this.transportQuat);
        player.up.copy(trueUp);
      }
      player.pitch = -.05;
      player.health = player.maxHealth;
      player.grounded = false;
      player.jumpsUsed = 0;
      player.invulnerable = 1.4;
      player.grappling = false;
      player.spinTimer = 0;
      player.spinCooldown = 0;
      player.spinAngle = 0;
      player.spinDirection = 1;
      player.spinPower = 1;
      this.style = Math.max(0, this.style - 24);
      this.ball = new BallState(player);
      this.queuedKick = null;
      this.queuedSpin = null;
      this.charging = false;
      this.charge = 0;
      this.lineHeld = false;
      this.lineActive = false;
      this.lineHoldTime = 0;
      this.cameraRoll = 0;
      this.cameraPitchVelocity = 0;
      world.ballGroup.position.copy(this.ball.position);
      world.particles.burst(player.position.clone().addScaledVector(player.up, 1), 0x83efff, 34, 10, .9, .35);
      audio.damage();
    }
    updateBallTrail(dt) {
      const ball = this.ball;
      const speed = ball.velocity.length();
      if (speed > 6 || ball.mode === 'returning' || ball.mode === 'anchored' || this.player.spinTimer > 0) {
        ball.trail.unshift(ball.position.clone());
      }
      const maximum = ball.mode === 'returning' ? 58 : 42;
      while (ball.trail.length > maximum) ball.trail.pop();
      if (ball.mode === 'ready' && this.player.spinTimer <= 0) {
        const remove = Math.ceil(dt * 100);
        if (remove > 0) ball.trail.splice(Math.max(0, ball.trail.length - remove), remove);
      }
      world.setTrail(ball.trail, ball.mode);
    }
    missionPrerequisitesComplete() {
      const basinCleared = !this.enemies.some(enemy => !enemy.summit && enemy.type === 'scuttler' && enemy.alive);
      const summitCleared = !this.enemies.some(enemy => enemy.summit && enemy.alive);
      return basinCleared
        && !this.shieldEnemy.alive
        && world.anchors.every(anchor => anchor.used)
        && !world.fracture.active
        && summitCleared;
    }
    updateProgression() {
      const anchorsUsed = world.anchors.filter(anchor => anchor.used).length;
      const summitAlive = this.enemies.filter(enemy => enemy.summit && enemy.alive).length;
      const progressChart = toChartVec(this.playerChartVec.copy(this.player.position));
      if (anchorsUsed === world.anchors.length && progressChart.y > 52 && progressChart.z < -48) {
        chartLift(0, groundHeightAt(0, -82) + .1, -82, this.player.checkpoint);
        this.saveCheckpointFrame();
        this.player.checkpointYaw = 0;
      }
      if (!world.fracture.active && progressChart.z < -118) {
        chartLift(0, groundHeightAt(0, -128) + .1, -128, this.player.checkpoint);
        this.saveCheckpointFrame();
        this.player.checkpointYaw = 0;
      }
      if (this.missionPrerequisitesComplete() && !world.goal.open) world.openGoal();
      this.updateObjective();
    }
    // Where to go is answered by a beam of light standing in the world, not by
    // a sentence at the top of the screen. The beacon moves as the run
    // progresses and takes the colour of whatever is waiting there.
    updateObjective(force = false) {
      const basinAlive = this.enemies.filter(enemy => !enemy.summit && enemy.alive && enemy.type === 'scuttler').length;
      const anchorsUsed = world.anchors.filter(anchor => anchor.used).length;
      const summitAlive = this.enemies.filter(enemy => enemy.summit && enemy.alive).length;
      let key, stage, focus, tint;
      if (!this.started) {
        key = 'start'; stage = 0;
        focus = null;
      } else if (basinAlive > 0) {
        key = `basin-${basinAlive}`; stage = 1;
        focus = this.enemies.find(enemy => !enemy.summit && enemy.alive && enemy.type === 'scuttler')?.position;
        tint = 0xff9c6b;
      } else if (this.shieldEnemy.alive) {
        key = `shield-${this.shieldEnemy.hp}`; stage = 2;
        focus = this.shieldEnemy.position;
        tint = 0xff9c6b;
      } else if (anchorsUsed < world.anchors.length) {
        key = `climb-${anchorsUsed}`; stage = 3;
        // Anchor records are world points; the beacon speaks chart.
        const nextAnchor = world.anchors.find(anchor => !anchor.used);
        focus = nextAnchor ? toChartVec(new T.Vector3().copy(nextAnchor.position)) : null;
        tint = 0x7befff;
      } else if (world.fracture.active) {
        key = 'fracture'; stage = 4;
        focus = world.fracture.position;
        tint = 0xbf83ff;
      } else if (summitAlive > 0) {
        key = `crown-${summitAlive}-${this.warden.hp}`; stage = 5;
        focus = (this.warden.alive ? this.warden : this.enemies.find(enemy => enemy.summit && enemy.alive))?.position;
        tint = 0xff9c6b;
      } else if (!this.won) {
        key = 'goal'; stage = 6;
        focus = world.goal.position;
        tint = 0xffd66b;
      } else {
        key = 'complete'; stage = 7;
        focus = null;
      }
      this.stage = stage;
      world.setBeacon(focus, tint);
      if (!force && this.objectiveKey === key) return;
      this.objectiveKey = key;
    }
    styleRank() {
      if (this.style >= 92) return 'SS';
      if (this.style >= 72) return 'S';
      if (this.style >= 49) return 'A';
      if (this.style >= 25) return 'B';
      return 'C';
    }
    // `label` and `color` no longer print anything on screen. They name the
    // trick for the screen-reader line and the end-of-run summary, and the
    // colour tints the world-space burst so a great play still reads loudly
    // without asking the player to look away from the moon and read a word.
    addStyle(amount, score = 0, label = null, color = '#83efff') {
      this.style = clamp(this.style + amount, 0, 100);
      this.styleHold = Math.max(this.styleHold, 1.05);
      this.score += Math.round(score);
      if (label) {
        this.lastTrick = label;
        if (amount >= 12) this.flourish(new T.Color(color), amount);
      }
    }
    // A big play blooms light around the ball instead of naming itself.
    flourish(color, amount = 12) {
      const strength = clamp(amount / 34, .25, 1);
      world.particles.burst(this.ball.position, color.getHex(), Math.round(14 + strength * 30), 9 + strength * 14, .8, .2);
      this.shake = Math.max(this.shake, .1 + strength * .16);
      world.pulseRing(this.ball.position, color, 2.4 + strength * 5.5, .42);
    }
    // ---- THE IMPACT LANGUAGE --------------------------------------------
    // Every single contact the ball makes answers in this vocabulary, and the
    // outcomes are deliberately built to be un-confusable at a glance:
    //
    //   'break'  destroyed it   — hard time-stop, white bloom, wide fast ring
    //   'hurt'   damaged it     — short time-stop, bright bloom, ring outward
    //   'graze'  armour ate it  — NO time-stop, thin spark shower, hard kick
    //   'locked' cannot yet     — NO time-stop, dull thud, ring collapses IN
    //
    // The load-bearing distinction is time: if the game stutters, you hurt it.
    // If it doesn't, you didn't. That reads instantly and needs no colour,
    // which matters because colour is the one channel we cannot rely on.
    impact(kind, position, tint = 0x9fe8ff) {
      const at = position.clone ? position.clone() : new T.Vector3().copy(position);
      if (kind === 'break') {
        this.hitStop = Math.max(this.hitStop, .085);
        this.shake = Math.max(this.shake, .46);
        world.particles.burst(at, 0xffffff, 26, 18, .7, .3);
        world.particles.burst(at, tint, 34, 14, .95, .35);
        world.pulseRing(at, new T.Color(0xffffff), 13, .34);
        this.showHitMarker(true);
        audio.impact(1, 'alien');
        return;
      }
      if (kind === 'hurt') {
        this.hitStop = Math.max(this.hitStop, .05);
        this.shake = Math.max(this.shake, .28);
        world.particles.burst(at, 0xffffff, 12, 14, .5, .25);
        world.particles.burst(at, tint, 18, 11, .7, .25);
        world.pulseRing(at, new T.Color(0xffffff), 6.5, .26);
        this.showHitMarker(false);
        audio.impact(.82, 'alien');
        return;
      }
      if (kind === 'graze') {
        // Armour still gives ground, so this never means "nothing happened" —
        // it means "that was the hard way round".
        this.shake = Math.max(this.shake, .11);
        world.particles.burst(at, 0xdfe9ff, 14, 16, .34, .1);
        world.pulseRing(at, new T.Color(0xdfe9ff), 2.8, .2);
        audio.impact(.44, 'rock');
        return;
      }
      // 'locked'
      this.shake = Math.max(this.shake, .13);
      world.particles.burst(at, 0x8593b5, 10, 6, .42, .06);
      world.pulseRing(at, new T.Color(0x8593b5), 3.6, .3, true);
      audio.impact(.38, 'anchor');
    }
    sealCue(position, color = 0xbf83ff) {
      this.impact('locked', position, color);
    }
    showHitMarker(lethal = false) {
      if (!ui.hitMarker) return;
      ui.hitMarker.classList.add('active');
      ui.hitMarker.style.filter = lethal ? 'drop-shadow(0 0 9px #fff)' : '';
      setTimeout(() => {
        ui.hitMarker?.classList.remove('active');
        if (ui.hitMarker) ui.hitMarker.style.filter = '';
      }, lethal ? 150 : 90);
    }
    decayFeedback(dt) {
      if (this.styleHold > 0) this.styleHold -= dt;
      else this.style = Math.max(0, this.style - dt * (this.style > 70 ? 6.4 : 3.4));
      this.kickVisual = Math.max(0, this.kickVisual - dt * 4.2);
      this.rewardFlash = Math.max(0, this.rewardFlash - dt * 1.35);
    }
    completeRun() {
      if (this.won || !this.missionPrerequisitesComplete() || !world.goal.open) return false;
      this.won = true;
      this.cancelCharge();
      this.setGameplayInert(true);
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      if (this.ball.mode === 'outbound') this.beginReturn('finish');
      this.addStyle(34, Math.max(1800, 15000 - this.time * 70), 'ORBIT CLEAN', '#ffd66b');
      this.saveBest();
      audio.win();
      this.shake = .9;
      world.particles.burst(world.goal.position, 0xffd66b, 110, 28, 1.5, .45);
      world.particles.burst(world.goal.position, 0x74efff, 80, 22, 1.25, .3);
      if (ui.winTime) ui.winTime.textContent = formatTime(this.time);
      if (ui.winScore) ui.winScore.textContent = String(Math.floor(this.score)).padStart(6, '0');
      if (ui.winRank) ui.winRank.textContent = this.styleRank();
      if (ui.winSummary) {
        const clean = this.respawnCount === 0 ? 'No suit reconstruction. The cliff never owned you.' : `${this.respawnCount} suit reconstruction${this.respawnCount === 1 ? '' : 's'}, and the moon still lost.`;
        ui.winSummary.textContent = `${clean} ${this.stats.kills} aliens shattered, ${this.stats.anchorLinks} sling links, ${this.stats.meteorKicks} meteor rebounds.`;
      }
      this.winTimer = setTimeout(() => {
        if (!this.won) return;
        ui.winOverlay?.classList.remove('hidden');
        ui.winOverlay?.setAttribute('aria-hidden', 'false');
        ui.restartButton?.focus({ preventScroll: true });
      }, 780);
      this.updateObjective(true);
      return true;
    }
    syncWorldVisuals() {
      const ball = this.ball;
      // Physics solves obstruction topology once per tick. Refresh the cheap
      // attachment endpoints after camera/player/ball integration so the line
      // still meets the emitter and rear socket exactly at render time.
      this.refreshTetherEndpoints();
      world.ballGroup.position.copy(ball.position);
      const speed = ball.velocity.length();
      const stretch = 1 + smoothstep(18, 65, speed) * .38;
      world.ballGroup.scale.set(1 / Math.sqrt(stretch), 1 / Math.sqrt(stretch), stretch);
      if (speed > 1) {
        if (SPHERE_WORLD) world.ballGroup.up.copy(dirAt(ball.position, this.ballUpScratch));
        world.ballGroup.lookAt(ball.position.clone().add(ball.velocity));
      }
      world.update(FIXED_DT, this);
    }
    syncUI() {
      // The crescent counter: the one number the HUD prints, by explicit
      // amendment to the no-HUD law (Alex, 2026-08-20).
      if (ui.stoneCount && this.lastStoneCount !== this.drops) {
        const previousDrops = this.lastStoneCount;
        this.lastStoneCount = this.drops;
        ui.stoneCount.textContent = String(this.drops);
        if (ui.stoneCounter) {
          ui.stoneCounter.classList.remove('bump');
          ui.stoneCounter.classList.remove('milestone');
          void ui.stoneCounter.offsetWidth;
          ui.stoneCounter.classList.add('bump');
          if (Math.floor(this.drops / 50) > Math.floor(previousDrops / 50)) ui.stoneCounter.classList.add('milestone');
        }
      }
      // Boss trophy sockets: build once from the core table, then light
      // each socket in its core's colour the moment that core is owned.
      if (ui.coreCounter) {
        if (!ui.coreCounter.childElementCount) {
          for (const id of ['ember', 'piton', 'kite', 'comet', 'roc', 'colossus']) {
            const socket = document.createElement('i');
            socket.className = 'core-socket';
            socket.dataset.core = id;
            socket.style.setProperty('--core-tint', `#${BALL_CORES[id].color.toString(16).padStart(6, '0')}`);
            ui.coreCounter.appendChild(socket);
          }
        }
        if (this.lastCoreCount !== this.cores.size) {
          this.lastCoreCount = this.cores.size;
          for (const socket of ui.coreCounter.children) {
            const owned = this.cores.has(socket.dataset.core);
            if (owned && !socket.classList.contains('lit')) {
              socket.classList.add('lit');
              socket.classList.remove('flash');
              void socket.offsetWidth;
              socket.classList.add('flash');
            } else if (!owned) {
              socket.classList.remove('lit', 'flash');
            }
          }
        }
      }
      // Suit lights, bottom right: one glass pip per hit point. The visor
      // frost stays; this is the countable copy of the same fact.
      if (ui.suitMeter) {
        if (ui.suitMeter.childElementCount !== this.player.maxHealth) {
          ui.suitMeter.textContent = '';
          for (let i = 0; i < this.player.maxHealth; i++) {
            const pip = document.createElement('i');
            pip.className = 'suit-pip';
            ui.suitMeter.appendChild(pip);
          }
          this.lastShownHealth = this.player.maxHealth;
        }
        if (this.lastShownHealth !== this.player.health) {
          const fell = this.player.health < this.lastShownHealth;
          this.lastShownHealth = this.player.health;
          [...ui.suitMeter.children].forEach((pip, index) => {
            pip.classList.toggle('lost', index >= this.player.health);
          });
          if (fell && ui.suitMeter.children[this.player.health]) {
            const pip = ui.suitMeter.children[this.player.health];
            pip.classList.remove('crack');
            void pip.offsetWidth;
            pip.classList.add('crack');
          }
        }
        ui.suitMeter.dataset.critical = String(this.player.health <= 1 && this.started && !this.won);
      }
      // Suit integrity is peripheral vision, not a pip row: the visor frosts
      // red as health falls, and the last hit point breathes.
      if (ui.visorFrost) {
        const missing = clamp(1 - this.player.health / this.player.maxHealth, 0, 1);
        const critical = this.player.health <= 1 ? .12 + Math.sin(this.time * 5.4) * .1 : 0;
        ui.visorFrost.style.opacity = String(clamp(missing * missing * 1.15 + critical, 0, 1));
      }
      if (ui.rewardFlash) {
        ui.rewardFlash.style.opacity = String(clamp(this.rewardFlash, 0, 1));
      }
      // The only text in the build: an off-screen status line so the game
      // stays narratable for screen readers that cannot see the world cues.
      if (ui.srState) {
        const line = `${this.ball.mode} ball, suit ${this.player.health} of ${this.player.maxHealth}`;
        if (line !== this.lastSrState) {
          this.lastSrState = line;
          ui.srState.textContent = line;
        }
      }
      if (ui.chargeUI) {
        ui.chargeUI.classList.toggle('active', this.charging);
        ui.chargeUI.setAttribute('aria-hidden', this.charging ? 'false' : 'true');
        ui.chargeUI.dataset.max = this.charge > .96 ? 'true' : 'false';
        ui.chargeUI.setAttribute('aria-valuenow', String(Math.round(this.charge * 100)));
        let anchor = 'aim';
        let x = 50;
        let y = 50;
        if (this.ball.mode === 'ready') {
          const projected = this.chargeProjectionScratch.copy(this.ball.position).project(world.camera);
          if (Number.isFinite(projected.x) && Number.isFinite(projected.y) && projected.z > -1 && projected.z < 1) {
            x = clamp((projected.x * .5 + .5) * 100, 7, 93);
            y = clamp((-projected.y * .5 + .5) * 100, 9, 91);
            anchor = 'ball';
          }
        }
        ui.chargeUI.dataset.anchor = anchor;
        ui.chargeUI.style.left = `${x}%`;
        ui.chargeUI.style.top = `${y}%`;
      }
      if (ui.chargeFill) ui.chargeFill.style.strokeDashoffset = String(100 - this.charge * 100);
      if (ui.crosshair) {
        ui.crosshair.dataset.ball = this.ball.mode;
        ui.crosshair.dataset.line = this.lineActive ? 'true' : 'false';
        const nextAnchor = world.anchors.find(anchor => !anchor.used);
        let anchorAim = false;
        if (nextAnchor && this.ball.mode === 'ready') {
          const toAnchor = nextAnchor.position.clone().sub(world.camera.position);
          const distance = toAnchor.length();
          anchorAim = distance < 92 && toAnchor.normalize().dot(this.forwardFromView(new T.Vector3())) > .982;
        }
        ui.crosshair.dataset.target = anchorAim ? 'anchor' : 'world';
        ui.crosshair.style.transform = `translate(-50%, -50%) scale(${1 + this.charge * .08})`;
        ui.crosshair.style.opacity = this.paused || !this.started ? '.3' : '.9';
      }
    }
    validate() {
      const values = [
        ...this.player.position.toArray(), ...this.player.velocity.toArray(), this.player.yaw, this.player.pitch,
        ...this.ball.position.toArray(), ...this.ball.velocity.toArray(), this.score, this.style, this.time,
      ];
      for (const enemy of this.enemies) values.push(...enemy.position.toArray(), ...enemy.velocity.toArray(), enemy.hp, enemy.facing);
      const validMode = ['ready', 'outbound', 'returning', 'anchored', 'caught'].includes(this.ball.mode);
      if (values.every(Number.isFinite) && validMode) return;
      console.error('KICK BALL finite-state guard restored the current checkpoint.');
      this.respawnPlayer();
    }
    teleport(section = 'start') {
      const spots = {
        start: [0, groundHeightAt(0, 120), 120, 0],
        shield: [0, groundHeightAt(0, 67), 67, 0],
        cliff: [0, groundHeightAt(0, 31), 31, 0, .28],
        summit: [0, groundHeightAt(0, -84), -84, 0],
        fracture: [0, groundHeightAt(0, -91), -91, 0],
        keeper: [0, groundHeightAt(0, -160), -160, 0],
        goal: [0, groundHeightAt(0, -214), -214, 0],
      };
      // Regions get their own drop points, facing their landmark.
      for (const entry of REGIONS) {
        const z = entry.z + entry.radius * .8;
        spots[entry.id] = [entry.x, groundHeightAt(entry.x, z), z, Math.PI];
      }
      const spot = spots[section] || spots.start;
      // Spots are authored chart coordinates; a teleport also re-seats the
      // player's frame on the canonical chart frame there, so yaw keeps its
      // authored meaning anywhere on the sphere.
      chartLift(spot[0], spot[1] + .1, spot[2], this.player.position);
      if (SPHERE_WORLD) {
        dirAt(this.player.position, this.player.up);
        liftQuatAt(spot[0], spot[2], this.player.frame);
      }
      this.player.velocity.set(0, 0, 0);
      this.player.yaw = spot[3];
      this.player.pitch = Number.isFinite(spot[4]) ? spot[4] : -.04;
      this.player.checkpoint.copy(this.player.position);
      this.saveCheckpointFrame();
      this.ball = new BallState(this.player);
      this.queuedKick = null;
      this.queuedSpin = null;
      this.player.spinTimer = 0;
      this.player.spinCooldown = 0;
      this.player.spinAngle = 0;
      this.player.spinDirection = 1;
      this.player.spinPower = 1;
      this.charging = false;
      this.charge = 0;
      this.lineHeld = false;
      this.lineActive = false;
      this.lineHoldTime = 0;
      this.cameraRoll = 0;
      this.cameraPitchVelocity = 0;
      this.updateCamera(FIXED_DT);
      this.syncWorldVisuals();
    }
    stepWith(seconds = .1, controls = {}) {
      const ticks = Math.max(1, Math.min(3600, Math.round(Number(seconds) / FIXED_DT)));
      for (let i = 0; i < ticks; i++) {
        const first = i === 0;
        const frame = {
          moveX: finite(Number(controls.moveX || 0)),
          moveZ: finite(Number(controls.moveZ || 0)),
          lookX: first ? finite(Number(controls.lookX || 0)) : 0,
          lookY: first ? finite(Number(controls.lookY || 0)) : 0,
          kick: !!controls.kick,
          snap: !!controls.snap,
          line: !!controls.line,
          jump: !!controls.jump,
          spin: !!controls.spin,
          grapple: !!controls.grapple,
          sprint: !!controls.sprint,
          kickPressed: first && !!controls.kickPressed,
          kickReleased: first && !!controls.kickReleased,
          snapPressed: first && !!controls.snapPressed,
          linePressed: first && !!controls.linePressed,
          lineReleased: first && !!controls.lineReleased,
          actionCancelled: first && !!controls.actionCancelled,
          jumpPressed: first && !!controls.jumpPressed,
          spinPressed: first && !!controls.spinPressed,
          spinDirection: first ? finite(Number(controls.spinDirection || 0)) : 0,
          spinPower: first ? finite(Number(controls.spinPower || 1)) : 1,
          grapplePressed: first && !!controls.grapplePressed,
          pausePressed: first && !!controls.pausePressed,
        };
        this.update(FIXED_DT, frame, first);
      }
      return this.getState();
    }
    getState() {
      return {
        version: GAME_VERSION,
        feelProfile: FEEL_PROFILE.name,
        feel: { ...FEEL_PROFILE },
        player: {
          x: this.player.position.x, y: this.player.position.y, z: this.player.position.z,
          vx: this.player.velocity.x, vy: this.player.velocity.y, vz: this.player.velocity.z,
          yaw: this.player.yaw, pitch: this.player.pitch, grounded: this.player.grounded,
          jumpsUsed: this.player.jumpsUsed, health: this.player.health,
          spinTimer: this.player.spinTimer, spinDirection: this.player.spinDirection,
          spinPower: this.player.spinPower, spinQueued: !!this.queuedSpin, grappling: this.player.grappling,
          // Authored-chart pose and local vertical speed, so checks can keep
          // asserting the numbers the game was tuned in on any topology.
          chart: (() => { const c = toChartVec(new T.Vector3().copy(this.player.position)); return { x: c.x, alt: c.y, z: c.z }; })(),
          vspeed: vspeedOf(this.player.velocity, this.player.up),
        },
        ball: {
          x: this.ball.position.x, y: this.ball.position.y, z: this.ball.position.z,
          vx: this.ball.velocity.x, vy: this.ball.velocity.y, vz: this.ball.velocity.z,
          chart: (() => { const c = toChartVec(new T.Vector3().copy(this.ball.position)); return { x: c.x, alt: c.y, z: c.z }; })(),
          mode: this.ball.mode, spin: this.ball.spin, flightTime: this.ball.flightTime, freeFlightTime: this.ball.freeFlightTime,
          returnTime: this.ball.returnTime, launchCharge: this.ball.launchCharge,
          snapReturn: !!this.ball.snapReturn, lastFlightSpeed: this.ball.lastFlightSpeed,
          emberHeat: this.ball.emberHeat, comet: !!this.ball.comet,
          anchored: !!this.ball.anchor, caught: !!this.ball.caughtBy,
          flightSpinTimer: this.ball.flightSpinTimer, flightSpinDirection: this.ball.flightSpinDirection,
          tetherPoints: this.ball.tetherPath.length, tetherPathLength: this.ball.tetherPathLength,
          tetherWrapId: this.ball.tetherWrapId,
        },
        cores: [...this.cores],
        drops: this.drops,
        endgame: { open: this.endgameOpen, complete: this.endgameComplete },
        dropsRemaining: world.moondrops ? world.moondrops.filter(drop => drop.alive).length : 0,
        sky: world.sky.map(slab => ({
          id: slab.id, tier: slab.tier, role: slab.role,
          x: slab.x, y: slab.top, z: slab.z, radius: slab.radius, lit: slab.lit,
        })),
        landmarks: world.landmarks.map(mark => ({
          id: mark.id, kind: mark.kind, name: mark.name,
          x: mark.x, y: mark.y, z: mark.z, done: mark.done,
        })),
        regions: world.regions.map(region => ({
          id: region.id, core: region.core,
          bossAlive: !!region.boss?.alive, bossHp: region.boss?.hp ?? 0,
        })),
        stage: this.stage,
        objective: this.objectiveKey,
        score: this.score,
        style: this.style,
        rank: this.styleRank(),
        time: this.time,
        started: this.started,
        paused: this.paused,
        won: this.won,
        queuedKick: !!this.queuedKick,
        lineHeld: this.lineHeld,
        lineActive: this.lineActive,
        gateActive: world.gate.active,
        fractureActive: world.fracture.active,
        goalOpen: world.goal.open,
        anchorsUsed: world.anchors.filter(anchor => anchor.used).length,
        playground: {
          breakablesAlive: world.breakables.filter(item => item.alive).length,
          nestsAlive: world.nests.filter(item => item.alive).length,
          chimesStruck: world.moonChimes.filter(item => item.used).length,
          pickupsActive: world.collectibles.filter(item => item.active).length,
          launchPads: world.launchPads.length,
        },
        enemies: this.enemies.map(enemy => ({ id: enemy.id, type: enemy.type, hp: enemy.hp, alive: enemy.alive, x: enemy.position.x, y: enemy.position.y, z: enemy.position.z })),
        stats: { ...this.stats },
        render: world.stats(),
      };
    }
  }

  function toggleFullscreen() {
    const root = document.getElementById('gameRoot');
    if (!document.fullscreenElement) {
      const request = root?.requestFullscreen || root?.webkitRequestFullscreen;
      if (request) Promise.resolve(request.call(root)).catch(() => {});
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) Promise.resolve(exit.call(document)).catch(() => {});
    }
  }

  function requestGamePointerLock() {
    try {
      const pending = canvas.requestPointerLock?.();
      pending?.catch?.(() => {});
    } catch (_) {}
  }

  function neutralFrame() {
    return {
      moveX: 0, moveZ: 0, lookX: 0, lookY: 0,
      kick: false, snap: false, line: false, jump: false, spin: false, grapple: false, sprint: false,
      kickPressed: false, kickReleased: false, snapPressed: false,
      linePressed: false, lineReleased: false,
      actionCancelled: false,
      jumpPressed: false, spinPressed: false, spinDirection: 0, spinPower: 1,
      grapplePressed: false, pausePressed: false,
    };
  }

  function runAutotest() {
    const checks = [];
    const failures = [];
    const check = (name, condition, detail = null) => {
      const passed = !!condition;
      checks.push({ name, passed, detail });
      if (!passed) failures.push(name);
    };
    try {
      check('three-runtime-r161', T.REVISION === '161', T.REVISION);
      check('webgl-renderer-started', !!world.renderer.getContext(), world.stats());
      const startingQuality = world.quality;
      const transientQuality = startingQuality === 'HIGH' ? 'MED' : 'HIGH';
      let storedQualityBefore = null;
      let storedQualityAfter = null;
      try { storedQualityBefore = localStorage.getItem(QUALITY_STORAGE_KEY); } catch (_) {}
      world.applyQuality(transientQuality, false);
      const transientQualityStats = world.stats();
      try { storedQualityAfter = localStorage.getItem(QUALITY_STORAGE_KEY); } catch (_) {}
      world.applyQuality(startingQuality, false);
      check('automatic-quality-change-is-session-only-and-resizes', transientQualityStats.quality === transientQuality
        && transientQualityStats.renderScale === (transientQuality === 'HIGH' ? .9 : .7)
        && storedQualityAfter === storedQualityBefore, {
        startingQuality, transientQuality, transientQualityStats, storedQualityBefore, storedQualityAfter,
      });
      check('world-materials-keep-depth-test', world.materials.black.depthTest && world.materials.gold.depthTest, {
        black: world.materials.black.depthTest, gold: world.materials.gold.depthTest,
      });
      const terrainParityPoints = [[240, 120], [-210, -45], [86, -248]];
      const terrainParityError = Math.max(...terrainParityPoints.map(([x, z]) => Math.abs(groundHeightAt(x, z) - world.sampleTerrainHeight(x, z))));
      check('physics-uses-render-heightfield', terrainParityError < 1e-6, terrainParityError);
      const originalTouchMode = input.touchEnabled;
      input.setTouchMode(true);
      input.moveStick.value.set(0, -1);
      const touchSprintFrame = input.poll();
      check('touch-full-stick-enables-sprint', touchSprintFrame.sprint && touchSprintFrame.moveZ > .99, {
        sprint: touchSprintFrame.sprint, moveZ: touchSprintFrame.moveZ,
      });
      input.endFrame();
      const fakeTouch = (pointerId, clientX, clientY, timeStamp) => ({
        pointerId, clientX, clientY, timeStamp, preventDefault() {},
      });
      input.moveStick.down(fakeTouch(101, 80, 520, 0));
      input.lookStick.down(fakeTouch(202, 250, 400, 0));
      input.moveStick.move(fakeTouch(101, 80, 466, 80));
      input.lookStick.move(fakeTouch(202, 314, 400, 80));
      const simultaneousTouch = {
        movePointer: input.moveStick.pointerId,
        lookPointer: input.lookStick.pointerId,
        moveZ: -input.moveStick.value.y,
        lookX: input.lookStick.delta.x,
      };
      check('touch-zones-own-simultaneous-thumbs', simultaneousTouch.movePointer === 101
        && simultaneousTouch.lookPointer === 202 && simultaneousTouch.moveZ > .9 && simultaneousTouch.lookX === 64,
      simultaneousTouch);
      input.moveStick.up(fakeTouch(101, 80, 466, 100));
      input.lookStick.up(fakeTouch(202, 314, 400, 100));
      input.lookStick.delta.set(0, 0);

      const moveRect = ui.movePad.getBoundingClientRect();
      const edgeY = moveRect.top + moveRect.height * .55;
      input.moveStick.down(fakeTouch(303, moveRect.left + 8, edgeY, 0));
      const clampedVisualLeft = parseFloat(input.moveStick.visual?.style.left || '0');
      input.moveStick.move(fakeTouch(303, moveRect.left, edgeY, 40));
      const edgeLeftValue = input.moveStick.value.x;
      input.moveStick.up(fakeTouch(303, moveRect.left, edgeY, 50));
      input.moveStick.down(fakeTouch(304, moveRect.right - 8, edgeY, 60));
      input.moveStick.move(fakeTouch(304, moveRect.right, edgeY, 100));
      const edgeRightValue = input.moveStick.value.x;
      input.moveStick.up(fakeTouch(304, moveRect.right, edgeY, 110));
      const visualHalf = Math.min((input.moveStick.visual?.offsetWidth || 128) * .5, moveRect.width * .5);
      check('touch-edge-origins-keep-full-range', edgeLeftValue < -.98 && edgeRightValue > .98
        && clampedVisualLeft >= visualHalf - .5, {
        edgeLeftValue, edgeRightValue, clampedVisualLeft, visualHalf,
      });

      input.touchEnabled = false;
      document.body.classList.remove('touch-enabled');
      const hybridDown = { ...fakeTouch(305, 34, edgeY, 0), pointerType: 'touch', target: canvas };
      input.handleGlobalPointerDown(hybridDown);
      input.bridgeGlobalTouch('move', { ...fakeTouch(305, 34, edgeY - 44, 60), pointerType: 'touch', target: canvas });
      const hybridFirstTouch = {
        enabled: input.touchEnabled,
        owner: input.moveStick.pointerId,
        moveZ: -input.moveStick.value.y,
      };
      input.bridgeGlobalTouch('up', { ...fakeTouch(305, 34, edgeY - 44, 80), pointerType: 'touch', target: canvas });
      check('hybrid-first-touch-enters-and-controls', hybridFirstTouch.enabled && hybridFirstTouch.owner === 305
        && hybridFirstTouch.moveZ > .95, hybridFirstTouch);
      input.setTouchMode(true);

      input.lookStick.delta.set(80, 0);
      input.poll();
      const rightSwipeLook = input.prepareStep(true).lookX;
      input.endFrame();
      input.poll();
      const stoppedSwipeLook = input.prepareStep(true).lookX;
      check('touch-right-swipe-is-positive-and-stops', rightSwipeLook > .3 && Math.abs(stoppedSwipeLook) < 1e-6, {
        rightSwipeLook, stoppedSwipeLook,
      });
      input.endFrame();
      input.lookStick.delta.set(0, 80);
      input.poll();
      const downSwipeLook = input.prepareStep(true).lookY;
      check('touch-down-swipe-looks-down', downSwipeLook > .25, downSwipeLook);
      input.endFrame();

      const touchButtons = [...document.querySelectorAll('#touchControls button')].map(button => button.id);
      // Two gameplay buttons and a pause. Kick and call stay on the ball hand;
      // the grapple gets a button because touch has no middle mouse.
      check('touch-has-two-gameplay-buttons', touchButtons.length === 3 && touchButtons.includes('touchJump')
        && touchButtons.includes('touchGrapple') && touchButtons.includes('touchPause')
        && !document.getElementById('touchKick') && !document.getElementById('touchSnap'), touchButtons);
      const touchStartHint = ui.startActionHint?.textContent;
      input.setTouchMode(false);
      const pointerStartHint = ui.startActionHint?.textContent;
      input.setTouchMode(true);
      check('start-copy-matches-current-input', touchStartHint === 'TAP TO ENTER'
        && pointerStartHint === 'CLICK TO LOCK VIEW', { touchStartHint, pointerStartHint });

      // The objective is a light column in the world, not a sentence. It has
      // to actually stand on whatever the run currently wants from the player.
      game.restart();
      game.started = true;
      game.updateObjective(true);
      const basinTarget = game.enemies.find(enemy => !enemy.summit && enemy.type === 'scuttler' && enemy.alive);
      const beaconOnBasin = world.beacon.target
        && world.beacon.target.distanceTo(basinTarget.position) < .001;
      game.enemies.forEach(enemy => {
        if (enemy.summit || enemy.type !== 'scuttler') return;
        enemy.alive = false;
        enemy.visual.group.visible = false;
      });
      game.updateObjective(true);
      const beaconOnSentinel = world.beacon.target
        && world.beacon.target.distanceTo(game.shieldEnemy.position) < .001;
      game.shieldEnemy.alive = false;
      game.updateObjective(true);
      // Anchor records are world points; the beacon target speaks chart.
      const anchorChart = toChartVec(new T.Vector3().copy(world.anchors[0].position));
      const beaconOnClimb = world.beacon.target
        && world.beacon.target.distanceTo(anchorChart) < .001;
      check('objective-beacon-stands-on-the-current-goal',
        beaconOnBasin && beaconOnSentinel && beaconOnClimb,
        { beaconOnBasin, beaconOnSentinel, beaconOnClimb });

      // The HUD purge is a design contract, not a preference: nothing in the
      // playing field may print words at the player. The screen-reader mirror
      // is exempt precisely because it is never rendered.
      // One exemption by explicit amendment (Alex, 2026-08-20): the crescent
      // counter prints a NUMBER. Words remain forbidden.
      const visibleHudText = [...(ui.hud?.children || [])]
        .filter(node => !node.classList.contains('sr-only') && node.id !== 'stoneCounter')
        .map(node => node.textContent || '')
        .join('')
        .replace(/\s+/g, '');
      const counterIsNumeric = /^\d+$/.test(ui.stoneCount?.textContent || '');
      check('hud-prints-no-words-during-play', visibleHudText === '' && counterIsNumeric, { visibleHudText, counterIsNumeric });

      game.restart();
      input.setTouchMode(true);

      game.ball.mode = 'ready';
      input.lookStick.actionContext = 'home';
      input.lookStick.tapPulse = true;
      const touchHomeTap = { ...input.poll() };
      input.endFrame();
      game.ball.mode = 'outbound';
      input.lookStick.actionContext = 'away';
      input.lookStick.tapPulse = true;
      const touchAwayTap = { ...input.poll() };
      input.endFrame();
      game.ball.mode = 'ready';
      input.lookStick.actionContext = 'home';
      input.lookStick.actionHold = true;
      const touchHomeHold = { ...input.poll() };
      input.endFrame();
      input.lookStick.actionHold = false;
      input.poll(); input.endFrame();
      game.ball.mode = 'anchored';
      input.lookStick.actionContext = 'away';
      input.lookStick.actionHold = true;
      const touchAnchorHold = { ...input.poll() };
      input.lookStick.actionHold = false;
      input.endFrame();
      game.ball.mode = 'ready';
      check('right-tap-is-contextual-kick-or-call', touchHomeTap.kickPressed && touchHomeTap.kickReleased && !touchHomeTap.snapPressed
        && touchAwayTap.snapPressed && !touchAwayTap.kickPressed, { touchHomeTap, touchAwayTap });
      check('right-hold-is-contextual-charge-or-pull', touchHomeHold.kick && !touchHomeHold.snap
        && touchAnchorHold.line && !touchAnchorHold.snap && !touchAnchorHold.kick, { touchHomeHold, touchAnchorHold });

      input.buttons.line = true;
      const desktopLineModes = ['ready', 'outbound', 'returning', 'anchored', 'caught'].map(mode => {
        game.ball.mode = mode;
        const frame = { ...input.poll() };
        input.endFrame();
        return { mode, line: frame.line, snap: frame.snap };
      });
      input.buttons.line = false;
      input.poll(); input.endFrame();
      check('rmb-hold-is-one-line-action-in-every-ball-mode', desktopLineModes.every(sample => sample.line && !sample.snap), desktopLineModes);

      input.lookStick.reset();
      game.ball.mode = 'outbound';
      input.lookStick.down(fakeTouch(390, 260, 360, 0));
      if (input.lookStick.actionTimer) clearTimeout(input.lookStick.actionTimer);
      input.lookStick.actionTimer = 0;
      input.lookStick.actionHold = true;
      game.ball.mode = 'ready';
      const latchedAwayHold = { ...input.poll() };
      input.endFrame();
      input.lookStick.cancel(fakeTouch(390, 260, 360, 220));
      const cancelledAwayHold = { ...input.poll() };
      input.endFrame();
      check('touch-intent-stays-away-through-return-home', latchedAwayHold.line
        && !latchedAwayHold.kick && !latchedAwayHold.kickPressed, latchedAwayHold);
      check('cancelled-touch-never-fires-a-kick', cancelledAwayHold.actionCancelled
        && !cancelledAwayHold.lineReleased && !cancelledAwayHold.kickReleased
        && !cancelledAwayHold.kickPressed, cancelledAwayHold);
      input.lookStick.reset();

      const makeLoop = (direction, stepMs = 20) => Array.from({ length: 29 }, (_, index) => {
        const angle = direction * index / 28 * TAU;
        return { x: 200 + Math.cos(angle) * 31, y: 180 + Math.sin(angle) * 31, t: index * stepMs };
      });
      const clockwiseLoop = analyzeLoopGesture(makeLoop(1));
      const counterLoop = analyzeLoopGesture(makeLoop(-1));
      const deliberateSlowLoop = analyzeLoopGesture(makeLoop(1, 40));
      const lookHoldThenLoop = [
        ...Array.from({ length: 61 }, (_, index) => ({ x: 111 + index * 2, y: 180, t: index * 20 })),
        ...makeLoop(-1).map(point => ({ ...point, t: point.t + 1220 })),
      ];
      const delayedLoop = analyzeRecentLoopGesture(lookHoldThenLoop);
      const feedLiveTrace = (points, pointerId) => {
        input.lookStick.reset();
        const first = points[0];
        input.lookStick.down(fakeTouch(pointerId, first.x, first.y, first.t));
        for (let index = 1; index < points.length; index++) {
          const point = points[index];
          input.lookStick.move(fakeTouch(pointerId, point.x, point.y, point.t));
        }
        const result = input.lookStick.consumeLoop();
        const last = points[points.length - 1];
        input.lookStick.up(fakeTouch(pointerId, last.x, last.y, last.t + 1));
        return result;
      };
      const liveClockwise = feedLiveTrace(makeLoop(1), 401);
      const liveCounter = feedLiveTrace(makeLoop(-1), 402);
      const liveSlowPower = feedLiveTrace(makeLoop(1, 28), 403);
      const liveFastPower = feedLiveTrace(makeLoop(1, 12), 404);
      const liveDelayed = feedLiveTrace(lookHoldThenLoop, 405);
      input.lookStick.reset();
      const chargeLoopTrace = makeLoop(1);
      input.lookStick.down(fakeTouch(406, chargeLoopTrace[0].x, chargeLoopTrace[0].y, chargeLoopTrace[0].t));
      if (input.lookStick.actionTimer) clearTimeout(input.lookStick.actionTimer);
      input.lookStick.actionTimer = 0;
      input.lookStick.actionHold = true;
      for (let index = 1; index < chargeLoopTrace.length; index++) {
        const point = chargeLoopTrace[index];
        input.lookStick.move(fakeTouch(406, point.x, point.y, point.t));
      }
      const committedChargeLoop = input.lookStick.consumeLoop();
      const chargeLoopEnd = chargeLoopTrace[chargeLoopTrace.length - 1];
      input.lookStick.up(fakeTouch(406, chargeLoopEnd.x, chargeLoopEnd.y, chargeLoopEnd.t + 1));
      const ordinarySwipe = analyzeLoopGesture(Array.from({ length: 12 }, (_, index) => ({ x: 20 + index * 14, y: 100 + index * 2, t: index * 24 })));
      const cHook = analyzeRecentLoopGesture(Array.from({ length: 23 }, (_, index) => {
        const angle = index / 22 * Math.PI * 1.22;
        return { x: 180 + Math.cos(angle) * 38, y: 180 + Math.sin(angle) * 38, t: index * 22 };
      }));
      const sCorrection = analyzeRecentLoopGesture(Array.from({ length: 25 }, (_, index) => ({
        x: 90 + index * 7, y: 180 + Math.sin(index / 24 * Math.PI * 2) * 34, t: index * 20,
      })));
      const horizontalScrub = analyzeRecentLoopGesture(Array.from({ length: 25 }, (_, index) => ({
        x: 180 + (index % 4 < 2 ? 48 : -48), y: 180 + Math.sin(index) * 4, t: index * 18,
      })));
      check('touch-loop-recognizes-both-directions', clockwiseLoop.matched && clockwiseLoop.direction === 1
        && counterLoop.matched && counterLoop.direction === -1, { clockwiseLoop, counterLoop });
      check('touch-loop-recovers-after-look-hold', delayedLoop.matched && delayedLoop.direction === -1
        && delayedLoop.elapsed <= 950 && Math.abs(delayedLoop.power - counterLoop.power) < .04, delayedLoop);
      check('touch-live-loop-lifecycle-is-signed', liveClockwise.active && liveClockwise.direction === 1
        && liveCounter.active && liveCounter.direction === -1 && liveDelayed.active && liveDelayed.direction === -1, {
        liveClockwise, liveCounter, liveDelayed,
      });
      check('touch-live-loop-speed-controls-power', liveFastPower.active && liveSlowPower.active
        && liveFastPower.power > liveSlowPower.power + .05, { liveSlowPower, liveFastPower });
      check('committed-charge-does-not-become-orbit', !committedChargeLoop.active, committedChargeLoop);
      check('touch-loop-rejects-ordinary-swipe', !ordinarySwipe.matched, ordinarySwipe);
      check('touch-loop-rejects-common-aim-corrections', !cHook.matched && !sCorrection.matched
        && !horizontalScrub.matched, { cHook, sCorrection, horizontalScrub });
      check('touch-loop-allows-deliberate-slow-circle', deliberateSlowLoop.matched
        && deliberateSlowLoop.elapsed > 950 && deliberateSlowLoop.elapsed <= 1350, deliberateSlowLoop);

      input.lookStick.loopPulse = true;
      input.lookStick.loopDirection = -1;
      input.lookStick.loopPower = 1.1;
      const gestureSpinFrame = input.poll();
      check('touch-loop-queues-signed-spin', gestureSpinFrame.spinPressed && gestureSpinFrame.spinDirection === -1
        && gestureSpinFrame.spinPower > 1, {
        spinPressed: gestureSpinFrame.spinPressed, direction: gestureSpinFrame.spinDirection, power: gestureSpinFrame.spinPower,
      });
      input.resetTransient();
      input.setTouchMode(originalTouchMode);

      game.start(false);
      check('launch-focuses-gameplay-canvas', document.activeElement === canvas, {
        activeElement: document.activeElement?.id || document.activeElement?.tagName,
      });
      game.player.yaw = .63;
      game.player.pitch = .19;
      game.updateCamera(FIXED_DT);
      world.camera.updateMatrixWorld(true);
      const renderedForward = world.camera.getWorldDirection(new T.Vector3());
      const gameplayForward = game.forwardFromView(new T.Vector3());
      const cameraAimDot = renderedForward.dot(gameplayForward);
      check('rendered-camera-matches-gameplay-aim', cameraAimDot > .999999, {
        dot: cameraAimDot, rendered: renderedForward.toArray(), gameplay: gameplayForward.toArray(),
      });
      game.togglePause();
      ui.pauseResumeButton?.focus({ preventScroll: true });
      ui.pauseResumeButton?.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', key: 'p', bubbles: true }));
      const focusedPauseFrame = input.poll();
      if (focusedPauseFrame.pausePressed) game.togglePause();
      check('p-resumes-from-focused-pause-button', !game.paused && document.activeElement === canvas, {
        paused: game.paused, activeElement: document.activeElement?.id || document.activeElement?.tagName,
      });
      input.resetTransient();

      game.restart();
      game.started = true;
      game.teleport('start');
      game.stepWith(FIXED_DT, {});
      const homeScreenSamples = [];
      for (const [yaw, pitch] of [[0, -1.25], [.9, -.45], [-1.6, 0], [2.35, .7], [-.4, 1.25]]) {
        game.player.yaw = yaw;
        game.player.pitch = pitch;
        game.updateCamera(.25);
        world.camera.updateMatrixWorld(true);
        game.ball.position.copy(game.readyBallTarget(new T.Vector3()));
        const projected = game.ball.position.clone().project(world.camera);
        homeScreenSamples.push({ yaw, pitch, x: projected.x, y: projected.y, z: projected.z });
      }
      check('home-ball-is-centered-below-aim-across-look', homeScreenSamples.every(sample => Math.abs(sample.x) < .03
        && sample.y < -.2 && sample.y > -.78 && sample.z > -1 && sample.z < 1), homeScreenSamples);

      const pitchLaunches = [];
      for (const pitch of [-1.42, -1, 0, 1, 1.42]) {
        game.restart();
        game.started = true;
        game.player.pitch = pitch;
        game.updateCamera(FIXED_DT);
        game.ball.position.copy(game.readyBallTarget(new T.Vector3()));
        game.stepWith(FIXED_DT, { kick: true, kickPressed: true });
        game.stepWith(FIXED_DT, { kickReleased: true });
        pitchLaunches.push({ pitch, mode: game.ball.mode, cameraDistance: game.ball.position.distanceTo(world.camera.position) });
      }
      check('home-ball-launches-at-every-valid-pitch', pitchLaunches.every(sample => sample.mode === 'outbound'), pitchLaunches);

      game.restart();
      game.started = true;
      game.updateCamera(FIXED_DT);
      game.ball.position.copy(game.readyBallTarget(new T.Vector3()));
      world.camera.updateMatrixWorld(true);
      game.stepWith(.34, { kick: true, kickPressed: true });
      const ringProjection = game.ball.position.clone().project(world.camera);
      const ringProgress = {
        active: ui.chargeUI?.classList.contains('active'),
        ariaHidden: ui.chargeUI?.getAttribute('aria-hidden'),
        anchor: ui.chargeUI?.dataset.anchor,
        value: Number(ui.chargeUI?.getAttribute('aria-valuenow')),
        dash: Number(ui.chargeFill?.style.strokeDashoffset),
        left: Number.parseFloat(ui.chargeUI?.style.left || ''),
        top: Number.parseFloat(ui.chargeUI?.style.top || ''),
        expectedLeft: (ringProjection.x * .5 + .5) * 100,
        expectedTop: (-ringProjection.y * .5 + .5) * 100,
      };
      check('circular-charge-ring-follows-home-ball', ringProgress.active && ringProgress.ariaHidden === 'false'
        && ringProgress.anchor === 'ball'
        && ringProgress.value >= 48 && ringProgress.value <= 53 && ringProgress.dash >= 47 && ringProgress.dash <= 52
        && Math.abs(ringProgress.left - ringProgress.expectedLeft) < .2
        && Math.abs(ringProgress.top - ringProgress.expectedTop) < .2, ringProgress);
      game.stepWith(FIXED_DT, { actionCancelled: true });
      check('charge-ring-clears-on-cancel', !game.charging && game.charge === 0
        && !ui.chargeUI?.classList.contains('active') && ui.chargeUI?.getAttribute('aria-hidden') === 'true'
        && Number(ui.chargeFill?.style.strokeDashoffset) === 100, {
        charging: game.charging, charge: game.charge, active: ui.chargeUI?.classList.contains('active'),
        ariaHidden: ui.chargeUI?.getAttribute('aria-hidden'), dash: ui.chargeFill?.style.strokeDashoffset,
      });

      game.restart();
      game.started = true;
      game.teleport('start');
      game.stepWith(FIXED_DT, {});
      const readyBallDistance = game.ball.position.distanceTo(game.player.position);
      check('home-ball-stays-in-reach', game.ball.mode === 'ready' && readyBallDistance < 5, {
        mode: game.ball.mode, distance: readyBallDistance, player: game.player.position.toArray(), ball: game.ball.position.toArray(),
      });
      check('idle-first-person-view-is-clear', !world.leftArm.visible && !world.rightArm.visible && !world.boot.visible, {
        leftArm: world.leftArm.visible, rightArm: world.rightArm.visible, boot: world.boot.visible,
      });
      check('moon-playground-is-dense-and-reactive', world.breakables.length >= 90 && world.nests.length >= 4
        && world.launchPads.length >= 6 && world.moonChimes.length >= 5 && world.collectibles.length >= 12, {
        breakables: world.breakables.length, nests: world.nests.length, launchPads: world.launchPads.length,
        chimes: world.moonChimes.length, collectibles: world.collectibles.length,
      });
      const startZ = game.player.position.z;
      game.stepWith(.55, { moveZ: 1, sprint: true });
      check('first-person-movement', game.player.position.z < startZ - 2.2, { startZ, endZ: game.player.position.z });

      game.teleport('start');
      game.player.grounded = true;
      const baseY = game.player.position.y;
      game.stepWith(FIXED_DT, { jump: true, jumpPressed: true });
      const firstImpulse = game.player.velocity.y;
      game.stepWith(.18, { jump: true });
      game.stepWith(FIXED_DT, { jump: true, jumpPressed: true });
      const secondImpulse = game.player.velocity.y;
      const usedAfterSecond = game.player.jumpsUsed;
      const beforeThird = game.player.velocity.y;
      game.stepWith(FIXED_DT, { jump: true, jumpPressed: true });
      check('high-first-jump', firstImpulse > 15, firstImpulse);
      check('high-double-jump', usedAfterSecond === 2 && secondImpulse > 18, { usedAfterSecond, secondImpulse });
      check('third-jump-rejected', game.player.jumpsUsed === 2 && game.player.velocity.y <= beforeThird + .01, { beforeThird, after: game.player.velocity.y });
      let apex = game.player.position.y;
      for (let i = 0; i < 420; i++) {
        game.stepWith(FIXED_DT, {});
        apex = Math.max(apex, game.player.position.y);
      }
      check('double-jump-clears-nine-metres', apex - baseY > 9, { baseY, apex, clearance: apex - baseY });

      game.restart();
      game.started = true;
      game.teleport('cliff');
      const cliffWalkStartY = game.player.position.y;
      game.stepWith(5, { moveZ: 1 });
      const cliffWalkGain = game.player.position.y - cliffWalkStartY;
      check('steep-cliff-requires-ball-route', cliffWalkGain < 12 && world.anchors.every(item => !item.used), {
        gain: cliffWalkGain, player: game.player.position.toArray(), anchorsUsed: world.anchors.filter(item => item.used).length,
      });
      game.player.position.set(-18, groundHeightAt(-18, 25) + .1, 25);
      game.player.velocity.set(0, 0, 0);
      game.player.yaw = 0;
      game.player.grounded = true;
      game.stepWith(3, { moveZ: 1, sprint: true });
      check('cliff-pillars-have-solid-sides', game.player.position.z > 20, game.player.position.toArray());

      const escapePlatform = world.platforms[0];
      const escapeStartRadius = escapePlatform.radius * .9;
      game.player.position.set(
        escapePlatform.x,
        groundHeightAt(escapePlatform.x, escapePlatform.z + escapeStartRadius) + .1,
        escapePlatform.z + escapeStartRadius,
      );
      game.player.velocity.set(0, 0, 0);
      game.player.yaw = Math.PI;
      game.player.grounded = true;
      game.stepWith(.75, { moveZ: 1, sprint: true });
      const escapeEndRadius = Math.hypot(game.player.position.x - escapePlatform.x, game.player.position.z - escapePlatform.z);
      check('player-can-escape-cliff-collider', escapeEndRadius > escapeStartRadius + 2, {
        startRadius: escapeStartRadius, endRadius: escapeEndRadius, player: game.player.position.toArray(),
      });

      game.ball.mode = 'outbound';
      game.ball.launchCharge = 1;
      game.ball.flightTime = 0;
      game.ball.position.set(-18, 8, 25);
      game.ball.velocity.set(0, 0, -40);
      game.ball.collisionCooldown.clear();
      game.player.pitch = 0;
      let pillarImpactZ = null;
      let pillarReboundZ = null;
      for (let i = 0; i < 60 && game.ball.bounceCount === 0; i++) {
        game.stepWith(FIXED_DT, {});
        if (game.ball.bounceCount > 0) {
          pillarImpactZ = game.ball.position.z;
          pillarReboundZ = game.ball.velocity.z;
        }
      }
      check('ball-banks-off-cliff-pillars', pillarImpactZ > 21.5 && pillarReboundZ > 0, {
        impactZ: pillarImpactZ, reboundZ: pillarReboundZ, bounces: game.ball.bounceCount,
      });

      game.restart();
      game.started = true;
      game.teleport('cliff');
      let jumpSpamPeak = game.player.position.y;
      for (let i = 0; i < 3600; i++) {
        const jumpNow = game.player.grounded || (game.player.jumpsUsed === 1 && game.player.velocity.y < 3.5);
        game.stepWith(FIXED_DT, { moveZ: 1, sprint: true, jump: jumpNow, jumpPressed: jumpNow });
        jumpSpamPeak = Math.max(jumpSpamPeak, game.player.position.y);
      }
      check('jump-spam-cannot-bypass-mesa', game.player.position.z > -25 && jumpSpamPeak < 24 && world.anchors.every(item => !item.used), {
        player: game.player.position.toArray(), peakY: jumpSpamPeak, anchorsUsed: world.anchors.filter(item => item.used).length,
      });

      game.restart();
      game.started = true;
      game.launchBall(.9);
      check('charged-kick-outbound', game.ball.mode === 'outbound' && game.ball.velocity.length() > 40, { mode: game.ball.mode, speed: game.ball.velocity.length() });
      const directionBeforeCurve = game.ball.velocity.clone().normalize();
      game.stepWith(.14, { lookX: .55 });
      const directionAfterCurve = game.ball.velocity.clone().normalize();
      check('live-camera-curve', directionBeforeCurve.dot(directionAfterCurve) < .995, directionBeforeCurve.dot(directionAfterCurve));
      game.stepWith(FIXED_DT, { snap: true, snapPressed: true });
      check('snap-enters-return', game.ball.mode === 'returning', game.ball.mode);
      game.stepWith(2.8, { snap: true });
      check('ball-comes-home', game.ball.mode === 'ready', {
        mode: game.ball.mode,
        returnTime: game.ball.returnTime,
        position: game.ball.position.toArray(),
        velocity: game.ball.velocity.toArray(),
        distanceToPlayer: game.ball.position.distanceTo(game.player.position),
        tetherPoints: game.ball.tetherPath.length,
        tetherWrapId: game.ball.tetherWrapId,
      });

      game.restart();
      game.started = true;
      game.updateCamera(FIXED_DT);
      const clearLineOrigin = game.tetherOrigin(new T.Vector3());
      game.ball.mode = 'outbound';
      game.ball.position.copy(clearLineOrigin).add(new T.Vector3(3, 1, -18));
      game.ball.velocity.set(3, 0, -34);
      game.lineActive = true;
      const clearLinePath = game.buildTetherPath(true).map(point => point.clone());
      const rearSocketOffset = clearLinePath[clearLinePath.length - 1].clone().sub(game.ball.position);
      const rearSocketDot = rearSocketOffset.dot(game.ball.velocity.clone().normalize());
      game.syncWorldVisuals();
      const renderedPathError = Math.max(...clearLinePath.flatMap((point, index) => [
        Math.abs(world.tetherPositions[index * 3] - point.x),
        Math.abs(world.tetherPositions[index * 3 + 1] - point.y),
        Math.abs(world.tetherPositions[index * 3 + 2] - point.z),
      ]));
      check('energy-line-is-direct-and-attaches-to-ball-rear', clearLinePath.length === 2
        && Math.abs(rearSocketOffset.length() - game.ball.radius * .82) < 1e-6 && rearSocketDot < -.5, {
        points: clearLinePath.length, rearOffset: rearSocketOffset.toArray(), rearSocketDot,
      });
      check('energy-line-render-uses-authoritative-path', world.ballTether.visible
        && world.ballTether.geometry.drawRange.count === clearLinePath.length && renderedPathError < 1e-5, {
        visible: world.ballTether.visible, drawCount: world.ballTether.geometry.drawRange.count,
        pathCount: clearLinePath.length, renderedPathError,
      });
      game.stepWith(FIXED_DT, { line: true, linePressed: true });
      const liveOrigin = game.tetherOrigin(new T.Vector3());
      const liveEnd = game.tetherEnd(new T.Vector3(), liveOrigin);
      const livePathEnd = game.ball.tetherPath[game.ball.tetherPath.length - 1];
      const liveDrawIndex = (world.ballTether.geometry.drawRange.count - 1) * 3;
      const movingEndpointError = Math.max(
        livePathEnd.distanceTo(liveEnd),
        Math.abs(world.tetherPositions[liveDrawIndex] - liveEnd.x),
        Math.abs(world.tetherPositions[liveDrawIndex + 1] - liveEnd.y),
        Math.abs(world.tetherPositions[liveDrawIndex + 2] - liveEnd.z),
      );
      check('moving-energy-line-meets-current-rear-socket', movingEndpointError < 1e-5, {
        movingEndpointError, pathEnd: livePathEnd.toArray(), expectedEnd: liveEnd.toArray(),
      });

      const wrapPlatform = world.platforms[0];
      const wrapRadius = wrapPlatform.radius * 1.22 + .12;
      const placeChart = (target, x, alt, z) => chartLift(x, alt, z, target);
      placeChart(game.player.position, wrapPlatform.x - wrapRadius - 9, wrapPlatform.top - game.player.eyeHeight - 2, wrapPlatform.z);
      if (SPHERE_WORLD) {
        dirAt(game.player.position, game.player.up);
        liftQuatAt(wrapPlatform.x - wrapRadius - 9, wrapPlatform.z, game.player.frame);
      }
      game.player.yaw = Math.PI / 2;
      game.player.pitch = 0;
      game.updateCamera(FIXED_DT);
      placeChart(game.ball.position, wrapPlatform.x + wrapRadius + 9, wrapPlatform.top - 2, wrapPlatform.z);
      game.ball.velocity.set(32, 0, 0);
      if (SPHERE_WORLD) game.ball.velocity.applyQuaternion(liftQuatAt(wrapPlatform.x + wrapRadius + 9, wrapPlatform.z, new T.Quaternion()));
      const wrappedPath = game.buildTetherPath(true).map(point => toChartVec(point.clone()));
      const wrappedLength = game.ball.tetherPathLength;
      const wrappedSide = game.ball.tetherWrapSide;
      const wrappedDirect = wrappedPath[0].distanceTo(wrappedPath[wrappedPath.length - 1]);
      const wrapContactError = Math.min(...wrappedPath.slice(1, -1).map(point => Math.abs(
        Math.hypot(point.x - wrapPlatform.x, point.z - wrapPlatform.z) - (wrapRadius + .025)
      )));
      game.ball.position.z += .01;
      game.buildTetherPath(true);
      const stableWrapSide = game.ball.tetherWrapSide;
      check('energy-line-wraps-real-cliff-collider', wrappedPath.length > 3 && game.ball.tetherWrapId === wrapPlatform.id
        && wrappedLength > wrappedDirect + .1 && wrapContactError < .001, {
        points: wrappedPath.length, wrapId: game.ball.tetherWrapId, platform: wrapPlatform.id,
        wrappedLength, wrappedDirect, wrapContactError,
      });
      check('energy-line-wrap-side-is-stable', stableWrapSide === wrappedSide, { wrappedSide, stableWrapSide });

      game.ball.position.set(wrapPlatform.x + wrapRadius + 9, wrapPlatform.top - 2, wrapPlatform.z);
      game.ball.velocity.set(0, 0, 0);
      game.ball.mode = 'outbound';
      game.beginReturn('snap');
      let sawWrappedReturn = false;
      let maxWrappedStuck = 0;
      let minimumPillarClearance = Infinity;
      let wrappedReturnTicks = 0;
      for (; wrappedReturnTicks < 480 && game.ball.mode !== 'ready'; wrappedReturnTicks++) {
        game.stepWith(FIXED_DT, { line: true, linePressed: wrappedReturnTicks === 0 });
        if (game.ball.tetherWrapId === wrapPlatform.id) {
          sawWrappedReturn = true;
          maxWrappedStuck = Math.max(maxWrappedStuck, game.ball.returnStuck);
        }
        const clearChart = toChartVec(new T.Vector3().copy(game.ball.position));
        minimumPillarClearance = Math.min(minimumPillarClearance,
          Math.hypot(clearChart.x - wrapPlatform.x, clearChart.z - wrapPlatform.z));
      }
      const physicalPillarRadius = wrapPlatform.radius * 1.03 + game.ball.radius;
      check('wrapped-return-follows-path-home-without-cutting-cliff', sawWrappedReturn
        && game.ball.mode === 'ready' && maxWrappedStuck < 1.05
        && minimumPillarClearance >= physicalPillarRadius - .03, {
        sawWrappedReturn, mode: game.ball.mode, maxWrappedStuck, minimumPillarClearance,
        physicalPillarRadius, wrappedReturnTicks,
      });

      setAltAt(game.player.position, wrapPlatform.top + 1.5);
      game.updateCamera(FIXED_DT);
      chartLift(wrapPlatform.x + wrapRadius + 9, wrapPlatform.top + 3.2, wrapPlatform.z, game.ball.position);
      game.ball.velocity.set(32, 0, 0);
      if (SPHERE_WORLD) game.ball.velocity.applyQuaternion(liftQuatAt(wrapPlatform.x + wrapRadius + 9, wrapPlatform.z, new T.Quaternion()));
      const overCliffPath = game.buildTetherPath(true);
      check('energy-line-clears-over-cliff-cap', overCliffPath.length === 2 && game.ball.tetherWrapId === null, {
        points: overCliffPath.length, wrapId: game.ball.tetherWrapId,
      });

      const gate = world.gate;
      KICKBALL.setPlayer(0, gate.position.y - game.player.eyeHeight, gate.position.z + 18);
      game.player.yaw = 0;
      game.player.pitch = 0;
      game.updateCamera(FIXED_DT);
      KICKBALL.setBall(0, gate.position.y, gate.position.z - 18, 0, 0, -30);
      const gateWrapPath = game.buildTetherPath(true).map(point => toChartVec(point.clone()));
      check('energy-line-routes-over-finite-progression-wall', gateWrapPath.length === 4
        && game.ball.tetherWrapId === 'gate'
        && gateWrapPath[1].y > gate.position.y + gate.height / 2 + game.ball.radius, {
        points: gateWrapPath.map(point => point.toArray()), wrapId: game.ball.tetherWrapId,
      });

      const simulateAimGuide = linked => {
        game.restart();
        game.started = true;
        game.player.yaw = 0;
        game.player.pitch = 0;
        game.updateCamera(FIXED_DT);
        game.ball.position.copy(game.readyBallTarget(new T.Vector3()));
        game.launchBall(.82);
        game.stepWith(.05, { lookX: .62, line: linked, linePressed: linked });
        const newAim = game.forwardFromView(new T.Vector3());
        return {
          mode: game.ball.mode,
          aimDot: game.ball.velocity.clone().normalize().dot(newAim),
          velocity: game.ball.velocity.toArray(),
          position: game.ball.position.toArray(),
        };
      };
      const freeGuide = simulateAimGuide(false);
      const linkedGuide = simulateAimGuide(true);
      const linkedGuideVelocityDelta = Math.hypot(
        linkedGuide.velocity[0] - freeGuide.velocity[0],
        linkedGuide.velocity[1] - freeGuide.velocity[1],
        linkedGuide.velocity[2] - freeGuide.velocity[2],
      );
      check('held-energy-line-strengthens-reticle-guidance', linkedGuide.mode === 'outbound'
        && freeGuide.mode === 'outbound' && linkedGuide.aimDot > freeGuide.aimDot + .001
        && linkedGuideVelocityDelta > 5, { freeGuide, linkedGuide, linkedGuideVelocityDelta });

      game.restart();
      game.started = true;
      game.updateCamera(FIXED_DT);
      game.launchBall(.8);
      game.stepWith(.72, { line: true, linePressed: true });
      check('held-energy-line-does-not-force-recall', game.ball.mode === 'outbound' && game.lineHeld, {
        mode: game.ball.mode, lineHeld: game.lineHeld, freeFlightTime: game.ball.freeFlightTime,
      });

      const measureOutboundCadence = (charge, controls = {}) => {
        game.restart();
        game.started = true;
        game.player.position.set(0, 100, 0);
        game.player.velocity.set(0, 0, 0);
        game.player.grounded = false;
        game.player.yaw = 0;
        game.player.pitch = .08;
        game.updateCamera(FIXED_DT);
        game.launchBall(charge);
        game.ball.maxRange = 10000;
        let ticks = 0;
        while (game.ball.mode === 'outbound' && ticks < 600) {
          game.stepWith(FIXED_DT, controls);
          ticks++;
        }
        return {
          charge,
          seconds: ticks * FIXED_DT,
          mode: game.ball.mode,
          flightTime: game.ball.flightTime,
          freeFlightTime: game.ball.freeFlightTime,
          outboundDuration: game.ball.outboundDuration,
        };
      };
      const fastTapCadence = measureOutboundCadence(0);
      const fastFullCadence = measureOutboundCadence(1);
      const controlledFullCadence = measureOutboundCadence(1, { line: true });
      check('fast-core-restores-short-automatic-return-window', fastTapCadence.mode === 'returning'
        && fastTapCadence.seconds >= .57 && fastTapCadence.seconds <= .70
        && fastFullCadence.mode === 'returning' && fastFullCadence.seconds >= 1.05 && fastFullCadence.seconds <= 1.20,
      { fastTapCadence, fastFullCadence });
      check('held-control-has-a-hard-away-cap', controlledFullCadence.mode === 'returning'
        && controlledFullCadence.seconds <= 1.84, controlledFullCadence);

      game.restart();
      game.started = true;
      game.player.position.set(0, 100, 0);
      game.player.velocity.set(0, 0, 0);
      game.player.grounded = false;
      game.updateCamera(FIXED_DT);
      game.launchBall(.7);
      game.ball.maxRange = 10000;
      game.stepWith(.31, {});
      const clockBeforeSpin = game.ball.freeFlightTime;
      game.startSpin(1, 1);
      const clockAfterSpin = game.ball.freeFlightTime;
      game.stepWith(.35, { line: true });
      check('airborne-spin-never-resets-flight-clock', clockAfterSpin >= clockBeforeSpin - 1e-6
        && game.ball.freeFlightTime > clockAfterSpin, {
        clockBeforeSpin, clockAfterSpin, clockLater: game.ball.freeFlightTime, mode: game.ball.mode,
      });

      game.restart();
      game.started = true;
      game.updateCamera(FIXED_DT);
      game.launchBall(.4);
      game.stepWith(FIXED_DT, { snap: true, snapPressed: true });
      check('quick-call-enters-return-on-the-next-fixed-step', game.ball.mode === 'returning'
        && game.ball.returnReason === 'snap', { mode: game.ball.mode, reason: game.ball.returnReason });

      // --- zip-core regression fence -------------------------------------
      // The return leg IS the fantasy. These pin the 2.1-derived return law
      // so the ball can never quietly go back to swooping home slowly.
      game.restart();
      game.started = true;
      game.player.position.set(0, 100, 0);
      game.player.velocity.set(0, 0, 0);
      game.player.grounded = false;
      game.player.yaw = 0;
      game.player.pitch = .08;
      game.updateCamera(FIXED_DT);
      game.launchBall(1);
      game.ball.maxRange = 10000;
      game.stepWith(.5, {});
      game.stepWith(FIXED_DT, { snap: true, snapPressed: true });
      game.stepWith(.2, {});
      const hotReturn = {
        mode: game.ball.mode,
        snapReturn: game.ball.snapReturn,
        speed: game.ball.velocity.length(),
      };
      check('called-return-stays-hot-for-its-whole-flight', hotReturn.mode === 'returning'
        && hotReturn.snapReturn && hotReturn.speed > 42, hotReturn);

      game.restart();
      game.started = true;
      game.player.position.set(0, 100, 0);
      game.player.velocity.set(0, 0, 0);
      game.player.grounded = false;
      game.updateCamera(FIXED_DT);
      game.launchBall(0);
      game.ball.maxRange = 10000;
      for (let i = 0; i < 600 && game.ball.mode === 'outbound'; i++) game.stepWith(FIXED_DT, {});
      // Sample after the turnaround: the exponential bend momentarily dips
      // through low speeds while the velocity reverses, which is the whip.
      game.stepWith(.35, {});
      const floorReturn = { mode: game.ball.mode, speed: game.ball.velocity.length() };
      check('auto-return-respects-the-speed-floor', floorReturn.mode !== 'returning'
        || floorReturn.speed > 30, floorReturn);

      game.restart();
      game.started = true;
      game.updateCamera(FIXED_DT);
      const tapAnchor = world.anchors[0];
      game.ball.mode = 'anchored';
      game.ball.anchor = tapAnchor;
      game.ball.anchorCharge = 1;
      game.ball.anchorTimer = 0;
      game.ball.position.copy(tapAnchor.position);
      game.ball.velocity.set(0, 0, 0);
      game.stepWith(FIXED_DT, { snapPressed: true });
      check('anchored-tap-recall-frees-the-ball', game.ball.mode === 'returning'
        && !game.ball.anchor && game.ball.snapReturn === true,
      { mode: game.ball.mode, anchored: !!game.ball.anchor, snapReturn: game.ball.snapReturn });

      game.restart();
      game.started = true;
      game.updateCamera(FIXED_DT);
      const shieldTarget = game.shieldEnemy;
      shieldTarget.facing = 0;
      const shieldCenter = fromChartVec(shieldTarget.position.clone());
      shieldCenter.addScaledVector(dirAt(shieldCenter, new T.Vector3()), shieldTarget.radius * .7);
      const shieldFront = game.enemyFront(shieldTarget, new T.Vector3());
      game.ball.mode = 'outbound';
      game.ball.collisionCooldown.clear();
      game.ball.position.copy(shieldCenter).addScaledVector(shieldFront, -(shieldTarget.radius + game.ball.radius * .55));
      game.ball.velocity.copy(shieldFront).multiplyScalar(20);
      const shieldHpBefore = shieldTarget.hp;
      game.resolveBallEnemies();
      check('outbound-kick-into-the-weak-side-damages-shield', shieldTarget.hp === shieldHpBefore - 1,
        { before: shieldHpBefore, after: shieldTarget.hp });

      game.restart();
      game.started = true;
      const fieldRock = world.rockFieldData.find(rock => rock.alive);
      game.ball.mode = 'outbound';
      game.ball.collisionCooldown.clear();
      game.ball.position.copy(fieldRock.position);
      game.ball.velocity.set(20, 0, 0);
      game.resolveBallWorld(game.ball.position.clone());
      check('scatter-rocks-are-real-and-smashable', fieldRock.alive === false, {
        alive: fieldRock.alive, rocks: world.rockFieldData.length,
      });

      game.restart();
      game.started = true;
      const reAnchor = world.anchors[0];
      reAnchor.used = true;
      game.ball.mode = 'outbound';
      game.ball.launchCharge = .5;
      game.ball.collisionCooldown.clear();
      game.ball.position.copy(reAnchor.position);
      game.ball.velocity.set(0, 0, 20);
      game.resolveBallWorld(game.ball.position.clone());
      check('linked-anchors-stay-reusable-grapple-points', game.ball.mode === 'anchored'
        && game.ball.anchor === reAnchor, { mode: game.ball.mode });

      // --- region fence ---------------------------------------------------
      // Each place has to actually BE its idea in the terrain, not just have
      // props parked on the same flat plain as everything else.
      const shelf = REGIONS.find(entry => entry.id === 'glassworks');
      const sink = REGIONS.find(entry => entry.id === 'hollow');
      const pan = REGIONS.find(entry => entry.id === 'orrery');
      const shelfRise = terrainHeightAt(shelf.x, shelf.z) - terrainHeightAt(shelf.x + shelf.radius * 1.5, shelf.z);
      const sinkDrop = terrainHeightAt(sink.x + sink.radius * 1.5, sink.z) - terrainHeightAt(sink.x, sink.z);
      const panWall = terrainHeightAt(pan.x + pan.radius, pan.z) - terrainHeightAt(pan.x, pan.z);
      check('regions-are-real-landforms', shelfRise > 8 && sinkDrop > 30 && panWall > 8,
        { shelfRise, sinkDrop, panWall });
      check('every-region-has-a-boss-and-a-garrison',
        world.regions.length === 3
        && world.regions.every(entry => entry.boss && entry.boss.alive && entry.spawns.length >= 4)
        && new Set(world.regions.map(entry => entry.core)).size === 3,
        world.regions.map(entry => ({ id: entry.id, spawns: entry.spawns.length, core: entry.core })));

      // THE CHANDELIER must refuse a ball arriving from the player's side and
      // accept one that comes in off a spire, then hand over its core. This
      // runs the real hit path, not the reward function in isolation.
      game.restart();
      game.started = true;
      const emberRegion = world.regions.find(entry => entry.core === 'ember');
      const chandelier = emberRegion.boss;
      game.player.position.set(chandelier.position.x, chandelier.position.y, chandelier.position.z + 30);
      game.updateRegions(FIXED_DT);
      const straightOn = chandelier.position.clone().add(new T.Vector3(0, 0, chandelier.radius + .7));
      game.ball.mode = 'outbound';
      game.ball.collisionCooldown.clear();
      game.ball.position.copy(straightOn);
      game.ball.velocity.set(0, 0, -40);
      game.resolveBossHit(emberRegion, chandelier);
      const guardedHpHeld = chandelier.hp === chandelier.maxHp;
      // Now come in from behind it, the way a ricochet would.
      let ricochetHits = 0;
      for (let i = 0; i < chandelier.maxHp; i++) {
        game.ball.collisionCooldown.clear();
        game.ball.mode = 'outbound';
        game.ball.position.copy(chandelier.position).add(new T.Vector3(0, 0, -(chandelier.radius + .7)));
        game.ball.velocity.set(0, 0, 40);
        game.resolveBossHit(emberRegion, chandelier);
        ricochetHits++;
        if (!chandelier.alive) break;
      }
      const earnedEmber = game.cores.has('ember') && !chandelier.alive;
      check('a-boss-hands-over-its-core', guardedHpHeld && earnedEmber && game.stats.cores === 1,
        { guardedHpHeld, earnedEmber, ricochetHits, cores: [...game.cores] });

      // You have to be able to WALK to the far moondrops. The fence used to be
      // a square at the old map edge, and this check exists because widening
      // the drawn world without widening the fence puts collectibles behind an
      // invisible wall -- the exact bug this replaced.
      game.restart();
      game.started = true;
      const outpost = [-877, 616];
      KICKBALL.setPlayer(outpost[0], groundHeightAt(outpost[0], outpost[1]) + 1, outpost[1]);
      game.stepWith(.5, {});
      const outpostChart = toChartVec(new T.Vector3().copy(game.player.position));
      const stayedOut = Math.hypot(outpostChart.x, outpostChart.z) > 800;
      // ...and the ground out there has to be the ground that is drawn.
      const drawnFloor = elevationAt(chartDirAt(outpost[0], outpost[1], new T.Vector3()));
      const walkedFloor = world.sampleTerrainHeight(outpost[0], outpost[1]);
      const farDrops = world.moondrops.filter(d => {
        const c = toChartVec(new T.Vector3().copy(d.position));
        return Math.hypot(c.x, c.z) > 400;
      }).length;
      check('the-moon-is-walkable-past-the-old-map-edge',
        stayedOut && Math.abs(drawnFloor - walkedFloor) < 1e-6 && farDrops > 20,
        { at: [outpostChart.x, outpostChart.y, outpostChart.z].map(v => +v.toFixed(1)), drawnFloor, walkedFloor, farDrops });

      // --- sphere battery -------------------------------------------------
      // The moon is a ball. These are the facts every failed attempt broke:
      // you can walk THROUGH the antipode and keep going; the verbs work on
      // the far side exactly as they do at spawn; and steering the camera is
      // the only thing that ever moves the yaw the ball-steering reads.
      game.restart();
      game.started = true;
      KICKBALL.setPlayer(0, groundHeightAt(0, 1240) + .1, 1240);
      game.player.yaw = Math.PI; // facing +Z: straight at the antipode ring
      let walkGrounded = 0;
      let walkTicks = 0;
      let maxYawDrift = 0;
      const yawBefore = game.player.yaw;
      for (let leg = 0; leg < 40; leg++) {
        game.stepWith(.5, { moveZ: 1, sprint: true });
        walkTicks += 60;
        if (game.player.grounded) walkGrounded++;
        maxYawDrift = Math.max(maxYawDrift, Math.abs(angleDelta(yawBefore, game.player.yaw)));
      }
      const crossedChart = toChartVec(new T.Vector3().copy(game.player.position));
      const crossedDistance = Math.hypot(crossedChart.x, crossedChart.z);
      const walkFinite = [game.player.position, game.player.velocity]
        .every(vector => Number.isFinite(vector.x + vector.y + vector.z));
      // 20 seconds of sprint (~300m+) starting 80m short of the antipode must
      // carry the player THROUGH it and out the far side, on the ground, with
      // the yaw untouched by the frame transport.
      check('walking-through-the-antipode-just-works',
        walkFinite && crossedDistance < 1240 - 60 && walkGrounded > 30 && maxYawDrift < 1e-9,
        { crossedDistance: +crossedDistance.toFixed(0), walkGrounded, maxYawDrift, chartZ: +crossedChart.z.toFixed(0) });

      // The verbs, standing on the far side of the moon: jump, double jump,
      // kick, meteor rebound, grapple bite. Same numbers as at spawn.
      game.restart();
      game.started = true;
      KICKBALL.setPlayer(300, groundHeightAt(300, 900) + .1, 900);
      game.stepWith(.4, {});
      const farGrounded = game.player.grounded;
      game.stepWith(FIXED_DT, { jumpPressed: true, jump: true });
      const farJump = vspeedOf(game.player.velocity, game.player.up);
      game.stepWith(.2, { jump: true });
      game.stepWith(FIXED_DT, { jumpPressed: true, jump: true });
      const farDouble = vspeedOf(game.player.velocity, game.player.up);
      check('far-side-jumps-are-spawn-jumps', farGrounded && farJump > 15 && farJump < 16.5 && farDouble > 18 && farDouble < 19.5,
        { farGrounded, farJump: +farJump.toFixed(2), farDouble: +farDouble.toFixed(2) });
      game.stepWith(1.2, {});
      game.player.pitch = -1.2;
      game.stepWith(FIXED_DT, { jumpPressed: true, jump: true });
      game.stepWith(FIXED_DT, { kick: true, kickPressed: true });
      game.stepWith(FIXED_DT, { kickReleased: true });
      const farMeteor = game.stats.meteorKicks > 0 || vspeedOf(game.player.velocity, game.player.up) > 11;
      check('far-side-meteor-rebound-fires', farMeteor,
        { vspeed: +vspeedOf(game.player.velocity, game.player.up).toFixed(2), meteors: game.stats.meteorKicks });
      game.player.pitch = 0;
      game.stepWith(1.5, {});
      const farSpot = toChartVec(game.player.position.clone());
      KICKBALL.setBall(farSpot.x + 4, groundHeightAt(farSpot.x + 4, farSpot.z - 2) + .2, farSpot.z - 2, 0, -20, 0);
      game.ball.launchCharge = 0;
      game.pitonCooldown = 0;
      game.stepWith(FIXED_DT, { grapple: true, grapplePressed: true });
      game.resolveBallWorld(game.ball.position.clone());
      check('far-side-grapple-bites', game.ball.mode === 'anchored' && !!game.ball.anchor?.synthetic,
        { mode: game.ball.mode });
      // MIDDLE CLICK IS THE WHOLE GRAPPLE: with the ball in hand it throws a
      // shot that sticks to the first thing it touches. One button, no arming.
      game.restart();
      game.started = true;
      KICKBALL.setPlayer(0, groundHeightAt(0, 120) + 1, 120);
      game.player.yaw = 0;
      game.player.pitch = -.9; // aim hard at the ground ahead
      game.updateCamera(FIXED_DT);
      game.stepWith(FIXED_DT, { grapplePressed: true });
      const shotFlying = game.ball.mode === 'outbound' && game.ball.grappleShot === true;
      let shotTicks = 0;
      for (; shotTicks < 240 && game.ball.mode === 'outbound'; shotTicks++) game.stepWith(FIXED_DT, {});
      check('middle-click-throws-a-shot-that-sticks-by-itself',
        shotFlying && game.ball.mode === 'anchored' && !!game.ball.anchor?.synthetic,
        { shotFlying, mode: game.ball.mode, ticks: shotTicks });
      game.player.pitch = -.05;
      game.stepWith(FIXED_DT, { snapPressed: true });
      game.stepWith(1.5, {});

      // Airborne weight is speed-independent: the orbital term is cancelled,
      // so falling at sprint-plus speed pulls exactly like standing still.
      // (This is the "player is just floating so long" fix, pinned.)
      KICKBALL.setPlayer(0, 200, 0);
      game.player.velocity.set(34, 0, 0);
      game.player.grounded = false;
      const vspeedBefore = vspeedOf(game.player.velocity, game.player.up);
      game.stepWith(1, {});
      const vspeedAfter = vspeedOf(game.player.velocity, game.player.up);
      check('airborne-weight-does-not-fade-with-speed',
        Math.abs((vspeedBefore - vspeedAfter) - 15.2) < 1,
        { fell: +(vspeedBefore - vspeedAfter).toFixed(2) });

      // Leave no armed grapple behind for the checks downstream.
      game.grappleArmed = 0;
      game.grappleReel = 0;

      // The far side has somewhere to GO: the needle is a real climbable
      // solid, the stair actually climbs, the bowl is a real pit with a
      // frozen floor, and the moondrop trail leads out there.
      const needleTop = world.floorHeight(-700, -260, 4000);
      const needleGround = groundHeightAt(-700, -260);
      const stairClimb = groundHeightAt(0, -662) - groundHeightAt(0, -500);
      const bowlDrop = groundHeightAt(0, 1034) - groundHeightAt(0, 1130);
      const ribMidChart = toChartVec(FAR_SIGHTS.ribMid.clone().multiplyScalar(PLANET.radius).add(PLANET.centre));
      const ribRise = groundHeightAt(ribMidChart.x, ribMidChart.z)
        - Math.min(groundHeightAt(ribMidChart.x + 43, ribMidChart.z + 55), groundHeightAt(ribMidChart.x - 43, ribMidChart.z - 55));
      const farTrail = world.moondrops.filter(drop => {
        const c = toChartVec(new T.Vector3().copy(drop.position));
        return Math.hypot(c.x - -700, c.z - -260) < 40 || Math.hypot(c.x, c.z - -640) < 60
          || Math.hypot(c.x, c.z - 1130) < 60;
      }).length;
      check('the-far-side-has-somewhere-to-go',
        needleTop > needleGround + 120 && stairClimb > 55 && bowlDrop > 14 && ribRise > 20 && farTrail >= 7,
        { needleTop: +needleTop.toFixed(0), stairClimb: +stairClimb.toFixed(1), bowlDrop: +bowlDrop.toFixed(1), ribRise: +ribRise.toFixed(1), farTrail });

      // ORBITAL ROADS: a launch ring hurls the player a real distance along
      // the surface, the ride survives (finite, alive), and it ends on the
      // ground -- flung is a state, not a fate.
      game.restart();
      game.started = true;
      const road0 = world.launchRings[0];
      const roadStart = toChartVec(new T.Vector3().copy(road0.position));
      KICKBALL.setPlayer(roadStart.x, roadStart.y, roadStart.z);
      road0.cooldown = 0;
      game.updateSky(FIXED_DT);
      const flungNow = game.player.flung > 0 && game.player.velocity.length() > 60;
      let flightTicks = 0;
      for (; flightTicks < 120 * 18 && !game.player.grounded; flightTicks++) game.stepWith(FIXED_DT, {});
      const flungEnd = toChartVec(new T.Vector3().copy(game.player.position));
      const flungDistance = Math.hypot(flungEnd.x - roadStart.x, flungEnd.z - roadStart.z);
      const flungFinite = Number.isFinite(game.player.position.x + game.player.position.y + game.player.position.z);
      check('launch-rings-are-orbital-roads',
        flungNow && flungFinite && game.player.grounded && flungDistance > 180,
        { flungNow, flungDistance: +flungDistance.toFixed(0), ticks: flightTicks, landedAt: [+flungEnd.x.toFixed(0), +flungEnd.z.toFixed(0)] });

      // The drawn moon and the walked moon must be the same moon: the MESH
      // itself has to carry the far features, not just the collision law.
      // (The old "detail 7" icosphere was secretly 642 vertices -- every
      // crater and terrace was a collision-only phantom. Never again.)
      const meshHeightsNear = (chartX, chartZ, arcRadius) => {
        const centre = chartDirAt(chartX, chartZ, new T.Vector3());
        const meshPositions = world.terrain.geometry.attributes.position;
        const probe = new T.Vector3();
        let low = Infinity;
        let high = -Infinity;
        for (let i = 0; i < meshPositions.count; i += 3) {
          probe.set(
            meshPositions.getX(i) - PLANET.centre.x,
            meshPositions.getY(i) - PLANET.centre.y,
            meshPositions.getZ(i) - PLANET.centre.z);
          const reach = probe.length();
          probe.multiplyScalar(1 / reach);
          if (arcTo(probe, centre) > arcRadius) continue;
          const height = reach - PLANET.radius;
          if (height < low) low = height;
          if (height > high) high = height;
        }
        return { low, high };
      };
      const stairMesh = meshHeightsNear(0, -655, 20);
      const craterMesh = meshHeightsNear(240, 780, 18);
      const craterFloor = groundHeightAt(240, 780);
      check('the-drawn-moon-is-the-walked-moon',
        stairMesh.high > 70 && Math.abs(craterMesh.low - craterFloor) < 3.5,
        { stairMeshHigh: +stairMesh.high.toFixed(1), craterMeshLow: +craterMesh.low.toFixed(1), craterFloor: +craterFloor.toFixed(1) });

      // THE ICE FIELD slides and THE SNOW COUNTRY cushions -- zones change
      // how the ground answers, and normal ground stays exactly itself.
      game.restart();
      game.started = true;
      KICKBALL.setPlayer(0, groundHeightAt(0, 1000) + .1, 1000);
      game.stepWith(.4, {});
      game.player.velocity.copy(game.player.up).multiplyScalar(0);
      game.player.velocity.addScaledVector(game.horizontalForward(new T.Vector3()), 10);
      game.player.grounded = true;
      game.stepWith(.5, {});
      const iceKept = tangentOf(game.player.velocity, game.player.up, new T.Vector3()).length();
      KICKBALL.setPlayer(0, groundHeightAt(0, 120) + .1, 120);
      game.stepWith(.4, {});
      game.player.velocity.addScaledVector(game.horizontalForward(new T.Vector3()), 10);
      game.player.grounded = true;
      game.stepWith(.5, {});
      const rockKept = tangentOf(game.player.velocity, game.player.up, new T.Vector3()).length();
      check('the-ice-field-actually-slides', iceKept > rockKept * 4 && rockKept < 1,
        { iceKept: +iceKept.toFixed(2), rockKept: +rockKept.toFixed(2) });
      KICKBALL.setPlayer(220, groundHeightAt(220, -640) + 24, -640);
      game.player.velocity.copy(game.player.up).multiplyScalar(-16);
      game.player.grounded = false;
      let snowTicks = 0;
      for (; snowTicks < 360 && !game.player.grounded; snowTicks++) game.stepWith(FIXED_DT, {});
      check('the-snow-country-swallows-landings', game.player.grounded && game.player.landingKick === 0,
        { landingKick: game.player.landingKick, snowTicks });

      // THE MAGNET: a ball passing NEAR a crescent takes it.
      game.restart();
      game.started = true;
      const magnetDrop = world.moondrops.find(drop => drop.alive && !drop.spilled);
      const magnetChart = toChartVec(new T.Vector3().copy(magnetDrop.position));
      KICKBALL.setBall(magnetChart.x + 5, magnetChart.y, magnetChart.z, 0, 0, 0);
      game.ball.mode = 'outbound';
      const magnetBefore = game.drops;
      game.collectMoondrops();
      check('crescents-magnet-to-a-near-ball', game.drops > magnetBefore && !magnetDrop.alive,
        { taken: !magnetDrop.alive, drops: game.drops });

      // THE COLOSSUS: it stomps a wave you can jump, bares its core in the
      // stagger for double, and its fall pays out a sixth trophy.
      game.restart();
      game.started = true;
      const titan = world.colossus;
      KICKBALL.setPlayer(titan.x + 14, titan.ground + .1, titan.z);
      game.player.grounded = true;
      let sawWindup = false;
      let sawStomp = false;
      let stompLift = 0;
      for (let tick = 0; tick < 120 * 8 && !sawStomp; tick++) {
        game.stepWith(FIXED_DT, {});
        if (titan.mode === 'windup') sawWindup = true;
        if (titan.exposed > 0) {
          sawStomp = true;
          stompLift = vspeedOf(game.player.velocity, game.player.up);
        }
      }
      const strikeTitan = fromBack => {
        const centre = titan.position.clone().addScaledVector(titan.up, 7);
        const back = new T.Vector3(0, 0, 1).applyQuaternion(titan.group.quaternion);
        const offset = fromBack ? back : back.clone().multiplyScalar(-1);
        game.ball.mode = 'outbound';
        game.ball.collisionCooldown.clear();
        game.ball.position.copy(centre).addScaledVector(offset, 3);
        game.ball.velocity.copy(offset).multiplyScalar(-20);
        const before = titan.hp;
        game.resolveBallColossus();
        return before - titan.hp;
      };
      titan.exposed = 2.2;
      const baredHit = strikeTitan(true);
      titan.exposed = 0;
      const frontHit = strikeTitan(false);
      let titanSwings = 0;
      while (titan.alive && titanSwings++ < 12) { titan.exposed = 0; strikeTitan(false); }
      check('the-colossus-stomps-bares-and-falls',
        sawWindup && sawStomp && stompLift > 8 && baredHit > frontHit && !titan.alive && game.cores.has('colossus'),
        { sawWindup, sawStomp, stompLift: +stompLift.toFixed(1), baredHit, frontHit, trophy: game.cores.has('colossus') });

      // THE SUIT LIGHTS: pips mirror health, sockets mirror cores.
      game.restart();
      game.started = true;
      game.stepWith(FIXED_DT, {});
      const pipsBefore = ui.suitMeter ? ui.suitMeter.childElementCount : -1;
      game.player.damageCooldown = 0;
      game.damagePlayer({ position: toChartVec(new T.Vector3().copy(game.player.position)) });
      game.stepWith(FIXED_DT, {});
      const lostPips = ui.suitMeter ? [...ui.suitMeter.children].filter(pip => pip.classList.contains('lost')).length : -1;
      check('the-suit-writes-its-pips',
        pipsBefore === game.player.maxHealth && lostPips === game.player.maxHealth - game.player.health && lostPips > 0,
        { pipsBefore, lostPips, health: game.player.health, max: game.player.maxHealth });

      // FULL MOONS: a flying ball drinks one and it pays five.
      game.restart();
      game.started = true;
      const fullMoon = world.fullmoons.find(moon => moon.alive);
      KICKBALL.setBall(0, 0, 0, 0, 0, 0);
      game.ball.position.copy(fullMoon.position);
      game.ball.mode = 'outbound';
      const moonPayBefore = game.drops;
      game.collectMoondrops();
      check('full-moons-pay-five',
        game.drops >= moonPayBefore + 5 && !fullMoon.alive,
        { paid: game.drops - moonPayBefore, taken: !fullMoon.alive });
      game.restart();
      check('full-moons-respawn-on-restart', world.fullmoons.every(moon => moon.alive),
        { alive: world.fullmoons.filter(moon => moon.alive).length, total: world.fullmoons.length });

      // THE THIN PLACES: break a crust crustPlate, fall in, come out the exact
      // opposite side of the moon.
      game.restart();
      game.started = true;
      const crustPlate = world.crustPlates[0];
      const plateGroundBefore = groundHeightAt(crustPlate.hole.x, crustPlate.hole.z);
      let plateSwings = 0;
      while (!crustPlate.hole.open && plateSwings++ < 12) {
        game.ball.mode = 'outbound';
        game.ball.collisionCooldown.clear();
        game.ball.position.copy(crustPlate.position).addScaledVector(dirAt(crustPlate.position, new T.Vector3()), 2);
        game.ball.velocity.copy(dirAt(crustPlate.position, new T.Vector3())).multiplyScalar(-20);
        game.resolveBallCrust();
      }
      const plateGroundOpen = groundHeightAt(crustPlate.hole.x, crustPlate.hole.z);
      KICKBALL.setPlayer(crustPlate.hole.x, -34, crustPlate.hole.z);
      game.stepWith(FIXED_DT * 2, {});
      const playerAfterTransit = game.player.position.clone();
      const throughDot = dirAt(game.player.position, new T.Vector3()).dot(crustPlate.hole.dir);
      game.restart();
      const plateGroundResealed = groundHeightAt(crustPlate.hole.x, crustPlate.hole.z);
      check('the-moon-is-thin-here',
        crustPlate.hole.open === false && plateGroundBefore > -20 && plateGroundOpen < -38
        && throughDot < -.98 && Math.abs(plateGroundResealed - plateGroundBefore) < .5,
        {
          swings: plateSwings, opened: plateGroundOpen < -38, throughDot: +throughDot.toFixed(3),
          resealed: +plateGroundResealed.toFixed(1), before: +plateGroundBefore.toFixed(1),
          endedAt: toChartVec(new T.Vector3().copy(playerAfterTransit)).toArray().map(v => +v.toFixed(1)),

        });

      // THE CRYSTAL CAVES: a real room -- pit floor below, solid roof deck
      // above, and the inside is the pit, not the roof.
      const caveRoof = world.sky.find(slab => slab.id === 'cave-roof-1');
      const caveFloor = groundHeightAt(caveRoof.x, caveRoof.z);
      check('the-caves-are-rooms',
        !!caveRoof && caveFloor < caveRoof.top - 8
        && world.floorHeight(caveRoof.x, caveRoof.z, caveRoof.top + 5) === caveRoof.top
        && world.floorHeight(caveRoof.x, caveRoof.z, caveFloor + 2) < caveRoof.top - 6,
        { floor: +caveFloor.toFixed(1), roof: +caveRoof.top.toFixed(1) });

      // SNOWMEN lob, PHANTOMS rush: the new species actually do their verbs.
      game.restart();
      game.started = true;
      const snowman = game.enemies.find(enemy => enemy.type === 'snowman' && enemy.alive);
      KICKBALL.setPlayer(snowman.position.x + 20, groundHeightAt(snowman.position.x + 20, snowman.position.z) + .1, snowman.position.z);
      snowman.attackCooldown = 0;
      snowman.stun = 0;
      for (let tick = 0; tick < 240 && !(world.snowballs || []).some(entry => entry.alive); tick++) game.stepWith(FIXED_DT, {});
      const lobbed = (world.snowballs || []).some(entry => entry.alive);
      const phantom = game.enemies.find(enemy => enemy.type === 'phantom' && enemy.alive);
      KICKBALL.setPlayer(phantom.position.x + 16, groundHeightAt(phantom.position.x + 16, phantom.position.z) + .1, phantom.position.z);
      phantom.attackCooldown = 0;
      phantom.stun = 0;
      let sawRush = false;
      for (let tick = 0; tick < 360 && !sawRush; tick++) {
        game.stepWith(FIXED_DT, {});
        if (phantom.dropping > 0) sawRush = true;
      }
      check('snowmen-lob-and-phantoms-rush', lobbed && sawRush, { lobbed, sawRush });

      // THE ROC: it flies, every solid hit takes something off, a talon
      // strike from above takes more, and killing it pays a fountain and a
      // fifth trophy.
      game.restart();
      game.started = true;
      const roc = world.roc;
      const rocBefore = roc.position.clone();
      game.updateRoc(1.2);
      const rocFlies = roc.position.distanceTo(rocBefore) > 2;
      const strikeRoc = above => {
        game.ball.mode = 'outbound';
        game.ball.collisionCooldown.clear();
        const offset = above ? roc.up.clone() : tangentOf(new T.Vector3(1, 0, 0), roc.up, new T.Vector3()).normalize();
        game.ball.position.copy(roc.position).addScaledVector(offset, 2.2);
        game.ball.velocity.copy(offset).multiplyScalar(-20);
        const before = roc.hp;
        game.resolveBallRoc();
        return before - roc.hp;
      };
      const sideHit = strikeRoc(false);
      const aboveHit = strikeRoc(true);
      let rocSwings = 0;
      while (roc.alive && rocSwings++ < 12) strikeRoc(rocSwings % 2 === 0);
      const rocPaid = world.moondrops.filter(drop => drop.spilled && drop.alive).length;
      check('the-roc-flies-fights-fair-and-pays-out',
        rocFlies && sideHit >= 1 && aboveHit > sideHit && !roc.alive && game.cores.has('roc') && rocPaid >= 10,
        { rocFlies, sideHit, aboveHit, alive: roc.alive, trophy: game.cores.has('roc'), rocPaid });

      // COLLECTATHON: everything that breaks spills crescents, the spills are
      // collectable, and the counter counts them.
      game.restart();
      game.started = true;
      const spillRock = world.breakables.find(item => item.alive);
      const stonesBefore = world.moondrops.filter(drop => drop.spilled && drop.alive).length;
      world.shatterBreakable(spillRock, 1);
      const stonesAfter = world.moondrops.filter(drop => drop.spilled && drop.alive).length;
      const dropsBefore = game.drops;
      const spilledStone = world.moondrops.find(drop => drop.spilled && drop.alive);
      game.ball.position.copy(spilledStone.position);
      game.ball.velocity.set(0, 0, 0);
      game.ball.mode = 'outbound';
      game.collectMoondrops();
      game.syncUI();
      check('everything-spills-crescents-and-the-counter-counts',
        stonesAfter > stonesBefore && game.drops === dropsBefore + 1
        && ui.stoneCount?.textContent === String(game.drops),
        { stonesBefore, stonesAfter, drops: game.drops, counter: ui.stoneCount?.textContent });

      // The rim springs have to actually fling you, or they are nine gold
      // rings decorating a walk.
      game.restart();
      game.started = true;
      const spring = world.launchPads.find(pad => pad.id.startsWith('rim-spring'));
      KICKBALL.setPlayer(spring.position.x, spring.position.y + .4, spring.position.z);
      game.player.velocity.copy(game.player.up).multiplyScalar(-1);
      game.player.grounded = true;
      spring.cooldown = 0;
      game.stepWith(FIXED_DT * 2, {});
      const sprung = vspeedOf(game.player.velocity, game.player.up);
      check('rim-springs-throw-you-into-the-wander-band',
        !!spring && sprung > 20 && Math.hypot(spring.position.x, spring.position.z) > 380,
        { sprung: +sprung.toFixed(1), reach: +Math.hypot(spring.position.x, spring.position.z).toFixed(0) });

      // CORES_ARE_TROPHIES: holding every core must not change one number about
      // how the ball or the player behaves. This is the check that keeps a
      // "small buff while we're here" from creeping back in.
      game.restart();
      game.started = true;
      game.ball.mode = 'outbound';
      game.ball.velocity.set(0, 0, 30);
      game.onBallBounce(game.ball.position);
      const bounceWithoutCores = game.ball.velocity.length();
      game.restart();
      game.started = true;
      for (const id of Object.keys(BALL_CORES)) game.cores.add(id);
      game.ball.mode = 'outbound';
      game.ball.velocity.set(0, 0, 30);
      game.onBallBounce(game.ball.position);
      const bounceWithCores = game.ball.velocity.length();
      game.updateCamera(FIXED_DT);
      game.launchBall(1);
      check('cores-are-trophies-not-upgrades',
        Math.abs(bounceWithCores - bounceWithoutCores) < 1e-9 && game.ball.comet === false,
        { bounceWithoutCores, bounceWithCores, comet: game.ball.comet, cores: [...game.cores] });

      // THE GRAPPLE bites on an unarmed... nothing. The button is the decision.
      game.restart();
      game.started = true;
      KICKBALL.setPlayer(0, groundHeightAt(0, 120) + 1, 120);
      const dropBall = () => {
        game.ball.mode = 'outbound';
        game.ball.launchCharge = 0;
        game.ball.velocity.set(0, -20, 0);
        if (SPHERE_WORLD) game.ball.velocity.applyQuaternion(liftQuatAt(4, 118, new T.Quaternion()));
        chartLift(4, groundHeightAt(4, 118) + .2, 118, game.ball.position);
        game.pitonCooldown = 0;
      };
      // Driven through the actual button, not by poking the flag, because
      // "held is armed" IS the contract now and a test that sets the internal
      // timer by hand would keep passing if that wiring broke.
      dropBall();
      game.stepWith(FIXED_DT, {});
      const bouncedUnheld = game.ball.mode === 'outbound';
      // Held: an uncharged kick has to bite on the very next contact. The old
      // rule wanted a 45% charge and a held line; neither is required now, and
      // there is no window to hit either.
      dropBall();
      game.stepWith(FIXED_DT, { grapple: true, grapplePressed: true });
      game.resolveBallWorld(game.ball.position.clone());
      const pinnedHeld = game.ball.mode === 'anchored' && !!game.ball.anchor?.synthetic;
      check('grapple-bites-uncharged-whenever-the-button-is-held', bouncedUnheld && pinnedHeld,
        { bouncedUnheld, pinnedHeld });

      // Still holding it a full second later: still armed. A window would have
      // expired by now, and expiring is the thing this must never do.
      dropBall();
      game.stepWith(1.4, { grapple: true });
      dropBall();
      game.resolveBallWorld(game.ball.position.clone());
      check('grapple-never-times-out-while-held', game.ball.mode === 'anchored',
        { mode: game.ball.mode, armed: +game.grappleArmed.toFixed(3) });

      // Armed AFTER the contact: the bounce already happened, and pressing the
      // button late still catches it. This is the "gigantic window" contract.
      game.restart();
      game.started = true;
      KICKBALL.setPlayer(0, groundHeightAt(0, 120) + 1, 120);
      dropBall();
      game.grappleArmed = 0;
      game.resolveBallWorld(game.ball.position.clone());
      const missedIt = game.ball.mode === 'outbound';
      // Stay inside bounceReturnTime here: a bounced ball starts for home at
      // 0.52 s no matter what, so a longer wait would be testing that law and
      // not this one. The far edge of the window is pinned separately below.
      game.stepWith(.3, {});
      const stillOut = game.ball.mode === 'outbound';
      const lateBite = stillOut ? game.pressGrapple() : false;
      check('grapple-catches-a-contact-that-already-happened',
        missedIt && stillOut && lateBite && game.ball.mode === 'anchored',
        { missedIt, stillOut, lateBite, mode: game.ball.mode, memoryAge: game.time - (game.lastContact?.time ?? -99) });

      // ...and the reel keeps running after the button is released.
      const reelOnBite = game.grappleReel > 0;
      game.stepWith(GRAPPLE_PROFILE.reelGrace * .5, {});
      check('grapple-reel-survives-letting-go', reelOnBite && game.grappleReel > 0,
        { reelOnBite, grace: GRAPPLE_PROFILE.reelGrace, remaining: +game.grappleReel.toFixed(3) });

      // The far edge: a memory older than the window must NOT bite, or the
      // grapple becomes "press it whenever, something will happen".
      game.restart();
      game.started = true;
      dropBall();
      game.grappleArmed = 0;
      game.resolveBallWorld(game.ball.position.clone());
      game.lastContact.time = game.time - GRAPPLE_PROFILE.contactMemory - .05;
      const staleBite = game.pressGrapple();
      check('grapple-ignores-a-contact-past-the-window', staleBite === false && game.ball.mode === 'outbound',
        { staleBite, mode: game.ball.mode });

      // And a tap recall still pulls the ball back off the wall.
      game.restart();
      game.started = true;
      KICKBALL.setPlayer(0, groundHeightAt(0, 120) + 1, 120);
      dropBall();
      game.grappleArmed = GRAPPLE_PROFILE.releaseTail;
      game.resolveBallWorld(game.ball.position.clone());
      const readyToRecall = game.ball.mode === 'anchored';
      game.grappleReel = 0;
      game.stepWith(FIXED_DT, { snapPressed: true });
      check('grapple-anchor-releases-on-recall', readyToRecall && game.ball.mode === 'returning',
        { readyToRecall, mode: game.ball.mode });

      // THE HOLLOW has to be escapable: its updrafts must carry the player.
      game.restart();
      game.started = true;
      const hollow = world.regions.find(entry => entry.id === 'hollow');
      const draft = hollow.updrafts[0];
      KICKBALL.setPlayer(draft.x, draft.base + 3, draft.z);
      game.updateRegions(.4);
      const hollowLift = vspeedOf(game.player.velocity, game.player.up);
      check('hollow-updrafts-carry-the-player-back-out', hollowLift > 5,
        { lift: hollowLift });

      // THE ORRERY's plates have to be ground you can stand on.
      const orrery = world.regions.find(entry => entry.id === 'orrery');
      const plate = orrery.movers[0];
      const plateAt = plate.at || plate.mesh.position;
      const plateFloor = world.floorHeight(plateAt.x, plateAt.z, plateAt.y + 1);
      check('orrery-plates-are-standable-moving-ground', plateFloor > plateAt.y,
        { plateFloor, plateY: plateAt.y });

      // THE ONE COMBAT LAW. A slow hit must still take something off, a fast
      // hit must take more, and an armoured face must never absorb a hit for
      // free. "Correct-looking hit does nothing" is the bug this fences off.
      game.restart();
      game.started = true;
      const lawTargets = [];
      const strike = (enemy, speed, behind) => {
        const centre = fromChartVec(enemy.position.clone());
        centre.addScaledVector(dirAt(centre, new T.Vector3()), enemy.radius * .7);
        const front = game.enemyFront(enemy, new T.Vector3());
        const offset = front.clone().multiplyScalar(behind ? -(enemy.radius) : enemy.radius);
        game.ball.mode = 'outbound';
        game.ball.comet = false;
        game.ball.collisionCooldown.clear();
        game.ball.position.copy(centre).add(offset);
        game.ball.velocity.copy(offset).normalize().multiplyScalar(-speed);
        const before = enemy.hp;
        game.resolveBallEnemies();
        return before - enemy.hp;
      };
      for (const type of ['shardling', 'clinger', 'watcher', 'shield', 'brute', 'skater', 'drifter', 'snowman', 'phantom']) {
        const enemy = game.enemies.find(item => item.type === type && item.alive);
        if (!enemy) continue;
        enemy.hp = enemy.maxHp = 40;
        const slow = strike(enemy, 14, true);
        const fast = strike(enemy, 46, true);
        const armouredFace = strike(enemy, 46, false);
        lawTargets.push({ type, slow, fast, armouredFace });
      }
      check('every-solid-hit-takes-something-off',
        lawTargets.length >= 5
        && lawTargets.every(entry => entry.slow >= 1 && entry.fast > entry.slow && entry.armouredFace >= 1),
        lawTargets);

      // Integration: actually stand in each region and play. Region geometry,
      // moving ground, updrafts and boss loops all run against the real ball
      // for several seconds; nothing may go non-finite and the ball must still
      // obey the one law that matters — it comes home.
      const regionPlay = [];
      for (const entry of REGIONS) {
        game.restart();
        game.started = true;
        game.teleport(entry.id);
        let homeVisits = 0;
        let worstAway = 0;
        let away = 0;
        for (let beat = 0; beat < 6; beat++) {
          game.stepWith(FIXED_DT, { kick: true, kickPressed: true });
          game.stepWith(.3, { kick: true });
          game.stepWith(FIXED_DT, { kickReleased: true });
          for (let tick = 0; tick < 300; tick++) {
            game.stepWith(FIXED_DT, { lookX: tick < 40 ? .006 : 0 });
            if (game.ball.mode === 'ready') { homeVisits++; break; }
            away += FIXED_DT;
          }
          worstAway = Math.max(worstAway, away);
          away = 0;
        }
        const numbers = [
          ...game.player.position.toArray(), ...game.player.velocity.toArray(),
          ...game.ball.position.toArray(), ...game.ball.velocity.toArray(),
        ];
        regionPlay.push({
          id: entry.id, homeVisits, worstAway: +worstAway.toFixed(2),
          finite: numbers.every(Number.isFinite),
        });
      }
      check('every-region-is-playable-and-the-ball-still-comes-home',
        regionPlay.every(entry => entry.finite && entry.homeVisits >= 5 && entry.worstAway < 3),
        regionPlay);

      // --- landmark fence -------------------------------------------------
      // Six places, six different verbs, all reachable and all completable.
      // The failure this guards against is the one the player actually named:
      // scenery that looks like it does something and does nothing.
      check('landmarks-are-six-distinct-places-spread-across-the-moon',
        world.landmarks.length === 6
        && new Set(world.landmarks.map(mark => mark.kind)).size === 6
        && world.landmarks.every(mark => world.landmarks
          .every(other => other === mark || mark.position.distanceTo(other.position) > 120)),
        world.landmarks.map(mark => ({ id: mark.id, x: mark.x, z: mark.z })));

      const landmarkRuns = [];
      const findMark = id => world.landmarks.find(mark => mark.id === id);
      const runMark = (id, drive) => {
        game.restart();
        game.started = true;
        const mark = findMark(id);
        // Landmarks sleep until the player is within 220 m, so a test that
        // drives one has to actually be standing there.
        KICKBALL.setPlayer(mark.x, mark.y + 2, mark.z + 20);
        drive(mark);
        landmarkRuns.push({ id, done: mark.done });
      };

      runMark('arch', mark => {
        chartLift(mark.gate.centre.x, mark.gate.centre.y, mark.gate.centre.z, game.player.position);
        game.player.velocity.set(0, 0, -14);
        if (SPHERE_WORLD) game.player.velocity.applyQuaternion(liftQuatAt(mark.gate.centre.x, mark.gate.centre.z, new T.Quaternion()));
        game.updateLandmarks(FIXED_DT);
      });
      runMark('geysers', mark => {
        // Ride three different vents; each fires on its own stagger.
        for (let step = 0; step < 2400 && !mark.done; step++) {
          const vent = mark.vents[step % mark.vents.length];
          chartLift(vent.x, vent.base + 1, vent.z, game.player.position);
          game.time += FIXED_DT;
          game.updateLandmarks(FIXED_DT);
        }
      });
      runMark('dish', mark => {
        for (let step = 0; step < 400 && !mark.done; step++) {
          game.ball.mode = 'outbound';
          game.ball.position.copy(mark.bowl.centre);
          game.updateLandmarks(FIXED_DT);
        }
      });
      runMark('lodestone', mark => {
        const well = mark.well;
        for (let step = 0; step < 900 && !mark.done; step++) {
          // Walk the ball around the stone at orbit radius: the landmark has
          // to notice a completed lap.
          const angle = step * .05;
          game.ball.mode = 'outbound';
          game.ball.position.set(
            well.centre.x + Math.cos(angle) * well.orbit,
            well.centre.y,
            well.centre.z + Math.sin(angle) * well.orbit,
          );
          game.updateLandmarks(FIXED_DT);
        }
      });
      runMark('grove', mark => {
        for (const rod of mark.rods) {
          game.ball.collisionCooldown.clear();
          KICKBALL.setBall(rod.x + rod.radius, rod.base + rod.height * .5, rod.z, -20, 0, 0);
          game.updateLandmarks(FIXED_DT);
        }
      });
      runMark('garden', mark => {
        const seed = mark.blooms[0];
        KICKBALL.setBall(seed.x, seed.base + 1.8, seed.z, 0, 0, 12);
        game.updateLandmarks(FIXED_DT);
        // Park the ball out of reach so ONLY the cascade can clear the field.
        chartLift(mark.x + 400, 50, mark.z, game.ball.position);
        for (let step = 0; step < 900 && !mark.done; step++) game.updateLandmarks(FIXED_DT);
      });
      check('every-landmark-can-actually-be-completed',
        landmarkRuns.length === 6 && landmarkRuns.every(entry => entry.done), landmarkRuns);

      // Catching a fast ball has to throw the player. This is the verb that
      // makes crossing the moon fun rather than a walk between set pieces.
      game.restart();
      game.started = true;
      KICKBALL.setPlayer(0, groundHeightAt(0, 120) + 6, 120);
      game.ball.mode = 'returning';
      game.ball.velocity.set(0, 0, -52);
      if (SPHERE_WORLD) game.ball.velocity.applyQuaternion(liftQuatAt(0, 120, new T.Quaternion()));
      const beforeCatch = game.player.velocity.length();
      game.completeReturn();
      const afterCatch = game.player.velocity.length();
      check('catching-a-fast-ball-slings-the-player', beforeCatch < .01 && afterCatch > 8,
        { beforeCatch, afterCatch: +afterCatch.toFixed(2) });

      // --- skyfield fence -------------------------------------------------
      const slabHeights = world.sky.map(slab => slab.top).sort((a, b) => a - b);
      check('the-sky-is-a-real-archipelago-at-many-heights',
        world.sky.length >= 38
        && new Set(world.sky.map(slab => slab.tier)).size >= 8
        && slabHeights[0] < 40 && slabHeights[slabHeights.length - 1] > 170
        && world.skyRings.length >= 3,
        { slabs: world.sky.length, rings: world.skyRings.length,
          lowest: +slabHeights[0].toFixed(1), highest: +slabHeights[slabHeights.length - 1].toFixed(1) });

      // Every slab is real rock now: walkable ground from above, a solid body
      // from the side and below, and never a phantom floor that yanks a ball
      // up through the deck.
      const solidSky = world.sky.map(slab => {
        const slabBottom = slab.top - (slab.body ?? (8 + slab.radius * .42));
        return {
          id: slab.id,
          deck: world.floorHeight(slab.x, slab.z, slab.top + 1) >= slab.top - .01,
          noPhantomFloor: world.floorHeight(slab.x, slab.z, slab.top - 12) < slab.top - .01,
          blocksBody: world.insideBlocker(slab.x, (slabBottom + slab.top) / 2, slab.z, .56),
        };
      });
      check('sky-slabs-are-solid-ground-above-and-rock-below',
        solidSky.every(entry => entry.deck && entry.noPhantomFloor && entry.blocksBody),
        solidSky.filter(entry => !entry.deck || !entry.noPhantomFloor || !entry.blocksBody).slice(0, 4));

      // No slab may be speared by a spire or buried in the mesa: standing on
      // one has to mean standing in open sky, not inside another object.
      const speared = world.sky.filter(slab => {
        if (slab.inert) return false;
        for (const solid of world.regionSolids(slab.x, slab.z)) {
          if (Math.hypot(slab.x - solid.x, slab.z - solid.z) > slab.radius + solid.radius) continue;
          if (solid.top > slab.top - 6) return true;
        }
        return world.sampleTerrainHeight(slab.x, slab.z) > slab.top - 12;
      }).map(slab => slab.id);
      check('no-sky-slab-is-buried-in-terrain-or-speared-by-a-spire',
        speared.length === 0, { speared });

      // Every slab has a job, and the jobs are spread across the sky.
      const roles = {};
      for (const slab of world.sky) roles[slab.role] = (roles[slab.role] || 0) + 1;
      check('every-sky-slab-has-something-to-do',
        world.sky.every(slab => slab.inert || (slab.plinth && slab.flame))
        && Object.keys(roles).length >= 5
        && roles.crown === 1,
        roles);

      // Landing lights the beacon; the count of lit beacons is the display.
      game.restart();
      game.started = true;
      const litTarget = world.sky.find(slab => slab.role === 'cache');
      KICKBALL.setPlayer(litTarget.x, litTarget.top, litTarget.z);
      game.updateSky(FIXED_DT);
      check('landing-on-a-slab-lights-its-beacon', litTarget.lit && game.stats.skyLit === 1,
        { lit: litTarget.lit, count: game.stats.skyLit });

      // Boost rings are the road between slabs: they must throw the player.
      game.restart();
      game.started = true;
      const road = world.skyRings[0];
      const roadChart = toChartVec(new T.Vector3().copy(road.position));
      KICKBALL.setPlayer(roadChart.x, roadChart.y, roadChart.z);
      road.cooldown = 0;
      game.updateSky(FIXED_DT);
      check('boost-rings-throw-the-player-along-their-axis',
        game.player.velocity.length() > 30
        && game.player.velocity.clone().normalize().dot(road.toward) > .95,
        { speed: +game.player.velocity.length().toFixed(1) });

      // Vents launch, and sky anchors take a kicked ball so the line can reel
      // you across open air.
      game.restart();
      game.started = true;
      const ventSlab = world.sky.find(slab => slab.vent);
      KICKBALL.setPlayer(ventSlab.x, ventSlab.top, ventSlab.z);
      ventSlab.cooldown = 0;
      game.updateSky(FIXED_DT);
      const ventLift = vspeedOf(game.player.velocity, game.player.up);
      const anchorSlab = world.sky.find(slab => slab.skyAnchor);
      KICKBALL.setPlayer(anchorSlab.x, anchorSlab.top, anchorSlab.z);
      game.ball.mode = 'outbound';
      game.ball.launchCharge = .8;
      game.ball.collisionCooldown.clear();
      game.ball.position.copy(anchorSlab.skyAnchor.position);
      game.ball.velocity.set(0, 0, 20);
      game.updateSky(FIXED_DT);
      check('vents-launch-and-sky-anchors-catch-the-ball',
        ventLift > 30 && game.ball.mode === 'anchored' && !!game.ball.anchor?.synthetic,
        { ventLift: +ventLift.toFixed(1), ballMode: game.ball.mode });

      // THE CROWN still hands over the KITE trophy -- the climb has to pay --
      // but holding it must not turn a fall into a glide any more. Falling is
      // falling; the grapple is how you deal with it.
      game.restart();
      game.started = true;
      const crownSlab = world.sky.find(slab => slab.crown);
      game.player.position.copy(crownSlab.crown.prize.position);
      game.updateSky(FIXED_DT);
      const gotKite = game.cores.has('kite');
      KICKBALL.setPlayer(0, 400, 0);
      game.player.velocity.set(0, -30, 0);
      game.player.grounded = false;
      game.ball.mode = 'outbound';
      game.updatePlayer(FIXED_DT, { ...neutralFrame(), line: true }, false);
      const glideFall = vspeedOf(game.player.velocity, game.player.up);
      check('the-crown-grants-the-kite-trophy-and-no-glide',
        gotKite && game.gliding === false && glideFall < -30,
        { gotKite, gliding: game.gliding, glideFall: +glideFall.toFixed(2) });

      // --- playtest fence -------------------------------------------------
      // Each of these is something a real player hit and reported. They are
      // pinned here so the fix cannot quietly rot back out.

      // THE CHANDELIER was beaten by shooting up at it from directly beneath,
      // because its guard was a flat horizontal cone with no vertical term.
      // Its plates must block by where they actually ARE, from any elevation.
      game.restart();
      game.started = true;
      const chandelierRegion = world.regions.find(entry => entry.id === 'glassworks');
      const wheelBoss = chandelierRegion.boss;
      game.updateRegions(FIXED_DT);
      let blockedFromBelow = 0;
      let openFromBelow = 0;
      for (let step = 0; step < 40; step++) {
        game.updateRegions(.05);
        // Straight up from underneath, along each plate's bearing in turn.
        const bearing = (step / 40) * TAU;
        const approach = new T.Vector3(Math.sin(bearing) * .18, -.97, Math.cos(bearing) * .18).normalize();
        if (game.chandelierBlocker(wheelBoss, approach)) blockedFromBelow++;
        else openFromBelow++;
      }
      check('chandelier-cannot-be-cheesed-from-underneath',
        blockedFromBelow > 0 && openFromBelow > 0,
        { blockedFromBelow, openFromBelow });

      // Clingers reportedly never dropped: the trigger was tighter than the
      // player's own body plus the enemy's.
      game.restart();
      game.started = true;
      const clinger = game.enemies.find(enemy => enemy.type === 'clinger');
      clinger.attackCooldown = 0;
      KICKBALL.setPlayer(clinger.position.x + 3, clinger.position.y, clinger.position.z);
      let tensed = false;
      for (let step = 0; step < 200 && clinger.dropping <= 0; step++) {
        game.updateEnemies(FIXED_DT);
        if (clinger.tensing > 0) tensed = true;
      }
      check('clingers-telegraph-then-actually-drop', tensed && clinger.dropping > 0,
        { tensed, dropping: clinger.dropping });

      // The orrery plates were standable in principle and useless in practice,
      // because they slid out from under the player every single frame.
      game.restart();
      game.started = true;
      const ridePlate = world.regions.find(entry => entry.id === 'orrery').movers[0];
      const rideAt = ridePlate.at || ridePlate.mesh.position;
      KICKBALL.setPlayer(rideAt.x, rideAt.y + .55, rideAt.z);
      const plateBefore = ridePlate.mesh.position.clone();
      const riderBefore = game.player.position.clone();
      for (let step = 0; step < 40; step++) game.updateRegions(FIXED_DT);
      const plateMoved = ridePlate.mesh.position.distanceTo(plateBefore);
      const riderMoved = game.player.position.distanceTo(riderBefore);
      check('orrery-plates-carry-their-rider',
        plateMoved > .05 && Math.abs(riderMoved - plateMoved) < plateMoved * .35,
        { plateMoved: +plateMoved.toFixed(3), riderMoved: +riderMoved.toFixed(3) });

      // "Was there still a see-through wall somewhere? I don't know what that
      // did." The gate must visibly draw its power from the sentinel.
      game.restart();
      game.started = true;
      game.updateCamera(FIXED_DT);
      world.update(FIXED_DT, game);
      const leashLive = !!world.gate.leash?.visible && world.gate.active;
      game.damageAlien(game.shieldEnemy, 99, 'kick');
      world.update(FIXED_DT, game);
      check('the-gate-shows-what-powers-it',
        leashLive && !world.gate.active && !world.gate.leash.visible,
        { leashLive, gateActive: world.gate.active });

      // Two rock colours that meant nothing, to a colourblind player. Meaning
      // now lives in shape: one material, and reward rocks wear a spur.
      const rockMaterials = new Set(world.breakables.map(item => item.mesh.material.uuid));
      const rockGeometries = new Set(world.breakables.map(item => item.mesh.geometry.uuid));
      const spurred = world.breakables.filter(item => item.spur).length;
      const rewarded = world.breakables.filter(item => item.reward).length;
      check('breakables-speak-in-shape-not-colour',
        rockMaterials.size === rockGeometries.size && spurred === rewarded && spurred > 0,
        { materials: rockMaterials.size, geometries: rockGeometries.size, spurred, rewarded });

      const simulateFlightSpin = direction => {
        game.restart();
        game.started = true;
        game.player.yaw = 0;
        game.player.pitch = 0;
        game.updateCamera(FIXED_DT);
        game.launchBall(.75);
        game.ball.position.x += 2;
        game.startSpin(direction, 1);
        game.stepWith(.24, { line: true });
        return {
          mode: game.ball.mode,
          vy: vspeedOf(game.ball.velocity, dirAt(game.ball.position, new T.Vector3())),
          spinTimer: game.ball.flightSpinTimer,
          spinDirection: game.ball.flightSpinDirection,
          playerSpinTimer: game.player.spinTimer,
        };
      };
      const clockwiseFlight = simulateFlightSpin(1);
      const counterFlight = simulateFlightSpin(-1);
      check('signed-airborne-spin-curves-while-staying-outbound', clockwiseFlight.mode === 'outbound'
        && counterFlight.mode === 'outbound' && clockwiseFlight.spinDirection === 1 && counterFlight.spinDirection === -1
        && Math.sign(clockwiseFlight.vy) === -Math.sign(counterFlight.vy)
        && Math.abs(clockwiseFlight.vy) > 10 && Math.abs(counterFlight.vy) > 10
        && clockwiseFlight.playerSpinTimer === 0
        && counterFlight.playerSpinTimer === 0, { clockwiseFlight, counterFlight });

      game.restart();
      game.started = true;
      game.updateCamera(FIXED_DT);
      game.launchBall(.7);
      game.beginReturn('snap');
      game.startSpin(-1, 1);
      check('return-spin-changes-arc-without-changing-mode', game.ball.mode === 'returning'
        && game.ball.returnSide === -1, { mode: game.ball.mode, returnSide: game.ball.returnSide });

      game.restart();
      game.started = true;
      game.ball.mode = 'outbound';
      game.ball.launchCharge = 1;
      game.ball.position.set(0, world.gate.position.y + world.gate.height / 2 + 5, world.gate.position.z);
      game.ball.velocity.set(0, 0, -30);
      game.resolveBallWorld(game.ball.position.clone().add(new T.Vector3(0, 0, 2)));
      const highGateVelocity = game.ball.velocity.z;
      game.ball.position.set(0, world.fracture.position.y + world.fracture.height / 2 + 5, world.fracture.position.z);
      game.ball.velocity.set(0, 0, -36);
      game.resolveBallWorld(game.ball.position.clone().add(new T.Vector3(0, 0, 2)));
      check('aerial-ball-clears-finite-walls', highGateVelocity < 0 && game.ball.velocity.z < 0 && world.fracture.active, {
        gateVelocity: highGateVelocity, fractureVelocity: game.ball.velocity.z,
      });

      game.restart();
      game.started = true;
      game.launchBall(.72);
      game.queueKick(.84);
      let sawRedirect = false;
      for (let i = 0; i < 520; i++) {
        game.stepWith(FIXED_DT, {});
        if (game.stats.kicks >= 2 && game.ball.mode === 'outbound') { sawRedirect = true; break; }
      }
      check('queued-volley-redirects', sawRedirect, { kicks: game.stats.kicks, mode: game.ball.mode });

      game.restart();
      game.started = true;
      const sampleOrbitInView = yaw => {
        game.player.yaw = yaw;
        game.player.pitch = -.12;
        game.player.spinTimer = 0;
        game.cameraRoll = 0;
        game.shake = 0;
        game.updateCamera(.25);
        world.camera.updateMatrixWorld(true);
        const forward = game.forwardFromView(new T.Vector3());
        const right = game.horizontalRight(new T.Vector3());
        const up = right.clone().cross(forward).normalize();
        const center = world.camera.position.clone().addScaledVector(forward, 3.05).addScaledVector(up, -.15);
        const target = game.orbitBallTarget(.68, 1, new T.Vector3());
        const offset = target.clone().sub(center);
        const screenStart = game.orbitBallTarget(0, 1, new T.Vector3()).project(world.camera);
        const screenNext = game.orbitBallTarget(.08, 1, new T.Vector3()).project(world.camera);
        return {
          local: [offset.dot(right), offset.dot(up), offset.dot(forward)],
          clockwiseScreenDown: screenNext.y < screenStart.y,
        };
      };
      const orbitSamples = [0, Math.PI / 2, Math.PI, -Math.PI / 2].map(sampleOrbitInView);
      const orbitBase = orbitSamples[0].local;
      const orbitBasisError = Math.max(...orbitSamples.flatMap(sample => sample.local.map((value, index) => Math.abs(value - orbitBase[index]))));
      check('spin-orbit-is-camera-relative-and-clockwise', orbitBasisError < 1e-6
        && orbitSamples.every(sample => sample.clockwiseScreenDown), { orbitBasisError, orbitSamples });

      game.restart();
      game.started = true;
      game.player.yaw = .82;
      game.player.pitch = -.16;
      game.updateCamera(.25);
      game.ball.position.copy(game.readyBallTarget(new T.Vector3()));
      const readyBeforeSpin = game.ball.position.clone();
      game.startSpin(1, 1);
      game.updateBall(FIXED_DT, neutralFrame());
      const orbitEntryDistance = game.ball.position.distanceTo(readyBeforeSpin);
      check('spin-orbit-enters-without-teleport', orbitEntryDistance < .35, {
        distance: orbitEntryDistance, before: readyBeforeSpin.toArray(), after: game.ball.position.toArray(),
      });

      game.restart();
      game.started = true;
      game.startSpin(-1, 1.15);
      check('signed-orbit-spin-move', game.player.spinTimer > .8 && game.player.spinDirection === -1
        && game.player.spinPower > 1 && game.ball.spin < 0 && game.stats.spins === 1, {
        timer: game.player.spinTimer, direction: game.player.spinDirection, power: game.player.spinPower,
        ballSpin: game.ball.spin, spins: game.stats.spins,
      });
      game.stepWith(.62, {});
      check('counter-spin-persists-through-orbit', game.player.spinTimer > .15 && game.player.spinDirection === -1
        && game.ball.spin < -50, {
        timer: game.player.spinTimer, direction: game.player.spinDirection, ballSpin: game.ball.spin,
      });

      game.restart();
      game.started = true;
      const orbitRock = world.breakables.find(item => item.alive);
      game.player.position.copy(orbitRock.position);
      game.ball.position.copy(game.readyBallTarget(new T.Vector3()));
      game.startSpin(1, 1);
      check('orbit-smash-breaks-nearby-world', !orbitRock.alive && game.stats.breaks > 0, {
        alive: orbitRock.alive, breaks: game.stats.breaks,
      });

      game.restart();
      game.started = true;
      game.startSpin(1, .9);
      game.startSpin(-1, 1.05);
      const loopWasBanked = !!game.queuedSpin;
      game.stepWith(1.12, {});
      check('cooldown-loop-is-banked-not-swallowed', loopWasBanked && !game.queuedSpin
        && game.stats.spins === 2 && game.player.spinDirection === -1, {
        loopWasBanked, queued: !!game.queuedSpin, spins: game.stats.spins, direction: game.player.spinDirection,
      });

      game.restart();
      game.started = true;
      game.startSpin(1, 1);
      game.startSpin(-1, 1);
      game.respawnPlayer();
      const respawnSpinReset = !game.queuedSpin && game.player.spinTimer === 0 && game.player.spinCooldown === 0
        && game.player.spinDirection === 1 && game.ball.mode === 'ready';
      game.startSpin(-1, 1);
      game.startSpin(1, 1);
      game.teleport('start');
      const teleportSpinReset = !game.queuedSpin && game.player.spinTimer === 0 && game.player.spinCooldown === 0
        && game.player.spinDirection === 1 && game.ball.mode === 'ready';
      check('reconstitution-clears-banked-spin', respawnSpinReset && teleportSpinReset, {
        respawnSpinReset, teleportSpinReset,
      });

      game.restart();
      game.started = true;
      game.ball.mode = 'outbound';
      game.ball.position.set(8, game.player.position.y + 2, game.player.position.z - 16);
      game.startSpin(1, .9);
      const positiveFlightSpin = {
        mode: game.ball.mode, direction: game.ball.flightSpinDirection,
        timer: game.ball.flightSpinTimer, spin: game.ball.spin, curveBoost: game.ball.curveBoost,
      };
      game.restart();
      game.started = true;
      game.ball.mode = 'outbound';
      game.ball.position.set(8, game.player.position.y + 2, game.player.position.z - 16);
      game.startSpin(-1, .9);
      const negativeFlightSpin = {
        mode: game.ball.mode, direction: game.ball.flightSpinDirection,
        timer: game.ball.flightSpinTimer, spin: game.ball.spin, curveBoost: game.ball.curveBoost,
      };
      check('signed-flight-spin-preserves-outbound-control', positiveFlightSpin.mode === 'outbound'
        && positiveFlightSpin.direction === 1 && positiveFlightSpin.timer > .7 && positiveFlightSpin.spin > 0
        && negativeFlightSpin.mode === 'outbound' && negativeFlightSpin.direction === -1
        && negativeFlightSpin.timer > .7 && negativeFlightSpin.spin < 0,
      { positiveFlightSpin, negativeFlightSpin });

      game.restart();
      game.started = true;
      for (const enemy of game.enemies) {
        if (!enemy.summit && (enemy.type === 'scuttler' || enemy.type === 'shield')) {
          enemy.alive = false;
          enemy.hp = 0;
          enemy.visual.group.visible = false;
        }
      }
      const anchor = world.anchors[0];
      game.player.position.copy(anchor.position).add(new T.Vector3(0, -4.5, 3.8));
      game.player.velocity.set(0, 0, 0);
      game.ball.mode = 'outbound';
      game.ball.launchCharge = .62;
      game.ball.position.copy(anchor.position);
      game.ball.velocity.set(0, 0, -34);
      game.resolveBallWorld(anchor.position.clone().add(new T.Vector3(0, 0, 1)));
      game.syncWorldVisuals();
      check('quick-kick-connects-first-anchor-with-tug', game.ball.mode === 'anchored' && game.ball.anchor === anchor
        && game.player.velocity.length() > 5 && world.ballTether.visible, {
        mode: game.ball.mode, charge: game.ball.launchCharge, playerSpeed: game.player.velocity.length(), tether: world.ballTether.visible,
      });
      const laterAnchor = world.anchors[1];
      game.ball.anchor = null;
      game.ball.mode = 'outbound';
      game.ball.launchCharge = .92;
      game.ball.position.copy(laterAnchor.position);
      game.ball.velocity.set(0, 0, -44);
      game.resolveBallWorld(laterAnchor.position.clone().add(new T.Vector3(0, 0, 1)));
      check('anchors-enforce-climb-order', game.ball.mode === 'outbound' && !game.ball.anchor, {
        attempted: laterAnchor.id, expected: anchor.id, mode: game.ball.mode,
      });
      game.ball.anchor = null;
      game.ball.mode = 'outbound';
      game.ball.launchCharge = .92;
      game.ball.position.copy(anchor.position);
      game.ball.velocity.set(0, 0, -44);
      game.resolveBallWorld(anchor.position.clone().add(new T.Vector3(0, 0, 1)));
      check('charged-kick-connects-anchor', game.ball.mode === 'anchored' && game.ball.anchor === anchor, {
        mode: game.ball.mode, charge: game.ball.launchCharge,
      });
      for (let i = 0; i < 240 && !anchor.used; i++) game.stepWith(FIXED_DT, { snap: true, snapPressed: i === 0 });
      check('anchor-pull-platforming', anchor.used && game.stats.anchorLinks === 1, { used: anchor.used, links: game.stats.anchorLinks, player: game.player.position.toArray() });

      // The seam wall is a WALL: hit it and a chunk comes out, every time, no
      // preconditions. It used to be a progression door with four invisible
      // unlock rules wearing rock paint, which read to its player as simply
      // broken. Chunks must visibly disappear as its health falls.
      game.restart();
      game.started = true;
      const wallStart = world.fracture.hp;
      let wallHits = 0;
      let wallGoneAt = 0;
      while (world.fracture.active && wallHits < 40) {
        const wallMode = wallHits % 2 === 0 ? 'outbound' : 'returning';
        game.ball.collisionCooldown.clear();
        KICKBALL.setBall(world.fracture.position.x, world.fracture.position.y, world.fracture.position.z + 1.7, 0, 0, -24, wallMode);
        game.ball.launchCharge = 0;
        game.resolveBallWorld(chartLift(world.fracture.position.x, world.fracture.position.y, world.fracture.position.z + 4.7, new T.Vector3()));
        wallHits++;
        if (wallHits === 3) wallGoneAt = world.fracture.pieces.filter(piece => piece.gone).length;
      }
      check('the-seam-wall-is-a-wall-you-smash-apart',
        wallStart > 1 && !world.fracture.active && wallHits > 3 && wallHits <= 40 && wallGoneAt > 0,
        { wallStart, wallHits, piecesGoneAfter3Hits: wallGoneAt });

      game.restart();
      game.started = true;
      const lockedSummitEnemy = game.enemies.find(enemy => enemy.summit);
      const lockedSummitHp = lockedSummitEnemy.hp;
      const lockedDamageAccepted = game.damageAlien(lockedSummitEnemy, 1, 'spin');
      world.goal.open = true;
      world.goal.group.visible = true;
      const earlyWinAccepted = game.completeRun();
      check('mission-order-blocks-early-summit-and-win', !lockedDamageAccepted && lockedSummitEnemy.hp === lockedSummitHp && !earlyWinAccepted && !game.won, {
        lockedDamageAccepted, hp: lockedSummitEnemy.hp, earlyWinAccepted, won: game.won,
      });

      game.restart();
      game.started = true;
      const testAlien = game.enemies.find(enemy => enemy.type === 'scuttler');
      game.damageAlien(testAlien, 1, 'spin');
      check('alien-kill-path', !testAlien.alive && testAlien.hp === 0, { alive: testAlien.alive, hp: testAlien.hp });

      const rewardRock = world.breakables.find(item => item.rewardPickup);
      world.shatterBreakable(rewardRock, 1);
      const nestTest = world.nests[0];
      world.damageNest(nestTest, nestTest.maxHp, 1);
      const chimeTest = world.moonChimes[0];
      world.strikeChime(chimeTest);
      check('destruction-reveals-real-rewards', rewardRock.rewardPickup.active && rewardRock.rewardPickup.group.visible
        && !nestTest.alive && nestTest.drop.active && chimeTest.used && chimeTest.drop.active, {
        rockDrop: rewardRock.rewardPickup.active, nestAlive: nestTest.alive, nestDrop: nestTest.drop.active,
        chimeUsed: chimeTest.used, chimeDrop: chimeTest.drop.active,
      });

      game.restart();
      game.started = true;
      const padTest = world.launchPads[0];
      KICKBALL.setPlayer(padTest.position.x, padTest.position.y, padTest.position.z);
      game.player.grounded = true;
      game.stepWith(FIXED_DT, {});
      const padLift = vspeedOf(game.player.velocity, game.player.up);
      check('launch-pad-restores-air-play', padLift >= padTest.impulse - .1 && game.player.jumpsUsed === 0 && !game.player.grounded, {
        velocityY: padLift, impulse: padTest.impulse, jumpsUsed: game.player.jumpsUsed, grounded: game.player.grounded,
      });

      game.restart();
      game.started = true;
      game.teleport('start');
      game.stepWith(1, {});
      const restartTraceA = game.enemies.map(enemy => [enemy.position.x, enemy.position.y, enemy.position.z]);
      game.cameraYawVelocity = 99;
      game.cameraRoll = .8;
      game.rewardFlash = 1;
      game.restart();
      const resetFeedback = game.cameraYawVelocity === 0 && game.cameraRoll === 0 && game.rewardFlash === 0;
      game.started = true;
      game.teleport('start');
      game.stepWith(1, {});
      const restartTraceB = game.enemies.map(enemy => [enemy.position.x, enemy.position.y, enemy.position.z]);
      const restartTraceError = Math.max(...restartTraceA.flatMap((point, index) => point.map((value, axis) => Math.abs(value - restartTraceB[index][axis]))));
      check('restart-is-gameplay-deterministic', resetFeedback && restartTraceError < 1e-6, {
        resetFeedback, maxEnemyPositionError: restartTraceError,
      });

      game.restart();
      game.started = true;
      const stressRandom = mulberry32(1337);
      for (let i = 0; i < 720; i++) {
        if (i % 120 === 8 && game.ball.mode === 'ready') game.launchBall(stressRandom());
        if (i % 170 === 45) game.startSpin();
        game.stepWith(FIXED_DT, {
          moveX: Math.sin(i * .07), moveZ: Math.cos(i * .041),
          lookX: (stressRandom() - .5) * .035,
          jump: i % 83 < 3, jumpPressed: i % 83 === 0,
          snap: i % 131 > 118, snapPressed: i % 131 === 119,
        });
      }
      const state = game.getState();
      const finiteState = [
        state.player.x, state.player.y, state.player.z, state.player.vx, state.player.vy, state.player.vz,
        state.ball.x, state.ball.y, state.ball.z, state.ball.vx, state.ball.vy, state.ball.vz,
      ].every(Number.isFinite);
      check('mixed-input-finite-stress', finiteState && ['ready', 'outbound', 'returning', 'anchored', 'caught'].includes(state.ball.mode), { finiteState, mode: state.ball.mode });
      world.render();
      const renderStats = world.stats();
      check('render-budget-observable', renderStats.calls > 0 && renderStats.triangles > 10000 && renderStats.textures > 0, renderStats);
      // Normalize the renderer cache with a fully visible, freshly spawned cast
      // before measuring repeated restart disposal. Dead/hidden stress-test aliens
      // otherwise make the baseline artificially low until their first render.
      game.restart();
      world.render();
      const geometriesBeforeRestartStress = world.renderer.info.memory.geometries;
      for (let i = 0; i < 4; i++) game.restart();
      world.render();
      const geometriesAfterRestartStress = world.renderer.info.memory.geometries;
      check('restart-releases-alien-geometry', geometriesAfterRestartStress <= geometriesBeforeRestartStress + 1, {
        before: geometriesBeforeRestartStress, after: geometriesAfterRestartStress,
      });

      // THE END OF THE MOON, driven start to finish. Every boss down + 90
      // crescents -> the ice cracks open into a real shaft; kill the heart's
      // six shards and strike it twice; the ball goes cosmic, the planets
      // smile, and the shaft itself blows you back out. Runs LAST because the
      // opened hole permanently re-carves the bowl.
      game.restart();
      game.started = true;
      for (const region of world.regions) { region.boss.hp = 0; region.boss.alive = false; }
      world.roc.hp = 0;
      world.roc.alive = false;
      game.drops = 200;
      const iceBefore = groundHeightAt(0, 1130);
      game.stepWith(FIXED_DT * 2, {});
      const holeOpened = game.endgameOpen && MOONHOLE.open;
      const iceAfter = groundHeightAt(0, 1130);
      const shaftMesh = meshHeightsNear(0, 1130, 14);
      const heart = world.moonheart;
      const smashHeart = () => {
        const target = heart.nodes.find(node => node.alive);
        let at;
        if (target) {
          at = target.mesh.position.clone().applyQuaternion(heart.group.quaternion).add(heart.group.position);
        } else {
          at = heart.position.clone();
        }
        const away = dirAt(at, new T.Vector3()).clone();
        game.ball.mode = 'outbound';
        game.ball.collisionCooldown.clear();
        game.ball.position.copy(at).addScaledVector(away, 1.6);
        game.ball.velocity.copy(away).multiplyScalar(-20);
        game.updateMoonheart(FIXED_DT);
        game.resolveBallMoonheart();
      };
      let heartSwings = 0;
      while (heart.alive && heartSwings++ < 24) smashHeart();
      // stand OFF-AXIS in the pit (the old chart-metric updraft only worked
      // in a 4 m strip; the arc-metric one must fill the floor)
      const pitPlayerStart = MOONHOLE.depth + 2;
      KICKBALL.setPlayer(31, pitPlayerStart, 1127);
      // The post-victory updraft is HOLD-JUMP now (Alex wanted back down too)
      game.stepWith(2.2, { jump: true });
      const pitAlt = altAt(game.player.position);
      check('the-end-of-the-moon-opens-fights-and-smiles',
        holeOpened && iceBefore > -30 && iceAfter < -70
        && shaftMesh.low < -70
        && game.endgameComplete && !heart.alive
        && pitAlt > pitPlayerStart + 12,
        { holeOpened, iceBefore: +iceBefore.toFixed(1), iceAfter: +iceAfter.toFixed(1),
          shaftMeshLow: +shaftMesh.low.toFixed(1),
          complete: game.endgameComplete, heartSwings, liftedTo: +pitAlt.toFixed(1) });
    } catch (error) {
      failures.push('autotest-exception');
      checks.push({ name: 'autotest-exception', passed: false, detail: String(error?.stack || error) });
    }
    game.restart();
    game.started = true;
    game.teleport(params.get('section') || 'start');
    const result = { passed: failures.length === 0, checks, failures, state: game.getState() };
    document.body.dataset.autotestResult = result.passed ? 'pass' : 'fail';
    document.body.dataset.autotestDetails = JSON.stringify(result);
    document.title = `[AUTOTEST ${result.passed ? 'PASS' : 'FAIL'} ${checks.filter(item => item.passed).length}/${checks.length}] KICK BALL // LUNAR VELOCITY`;
    return result;
  }

  // Yield two task boundaries so the complete launch panel can paint before the
  // synchronous procedural world build occupies the main thread on first load.
  requestAnimationFrame(() => setTimeout(() => {
  try {
    world = new LunarWorld();
    input = new InputManager();
    game = new GameController();
  } catch (error) {
    console.error(error);
    fatal(`The lunar renderer failed during boot: ${error.message || error}`);
    return;
  }

  ui.startButton?.addEventListener('click', () => game.start(true));
  ui.restartButton?.addEventListener('click', () => {
    game.restart();
    if (!input.touchEnabled && !TEST_MODE) requestGamePointerLock();
  });
  ui.pauseResumeButton?.addEventListener('click', () => game.togglePause());
  ui.soundButton?.addEventListener('click', () => { audio.ensure(); audio.toggle(); });
  ui.fullscreenButton?.addEventListener('click', toggleFullscreen);
  ui.qualityButton?.addEventListener('click', () => world.cycleQuality());
  canvas.addEventListener('click', () => {
    if (game.started && !game.paused && !input.touchEnabled && !TEST_MODE && document.pointerLockElement !== canvas) requestGamePointerLock();
  });
  document.addEventListener('visibilitychange', () => {
    world?.frameSamples?.splice(0);
    accumulator = 0;
    lastFrame = performance.now();
    if (document.hidden) {
      audio.recall(false, 0);
      input.resetTransient();
    }
  });

  if (ui.loadingMeter) {
    ui.loadingMeter.style.width = '100%';
    ui.loadingMeter.parentElement?.setAttribute('aria-valuenow', '100');
  }
  document.body.dataset.boot = 'ready';
  if (!AUTO_START) ui.startButton?.focus({ preventScroll: true });

  window.KICKBALL = Object.freeze({
    version: GAME_VERSION,
    feelProfile: FEEL_PROFILE,
    // Live handles for harnesses and shot scripts. Not reachable from play.
    debugWorld: () => world,
    debugGame: () => game,
    planetRadius: () => PLANET.radius,
    chartOf: (x, y, z) => { const c = toChartVec(new T.Vector3(x, y, z)); return { x: c.x, alt: c.y, z: c.z }; },
    liftOf: (x, alt, z) => { const v = chartLift(x, alt, z, new T.Vector3()); return { x: v.x, y: v.y, z: v.z }; },
    getState: () => game.getState(),
    getRenderStats: () => world.stats(),
    audioLog: () => (audio.log || []).slice(),
    restart: () => game.restart(),
    start: () => game.start(false),
    teleport: section => game.teleport(section),
    // Debug shortcut so a core's effect can be felt without clearing its
    // region first. Not reachable from play.
    grantAllCores: () => {
      for (const region of world.regions) game.cores.add(region.core);
      return [...game.cores];
    },
    stepWith: (seconds, controls) => game.stepWith(seconds, controls),
    step: seconds => game.stepWith(seconds, {}),
    runSmoke: () => runAutotest(),
    setQuality: level => {
      const normalized = String(level || '').toUpperCase();
      if (!world.qualityOrder.includes(normalized)) throw new Error(`Unknown quality ${level}`);
      world.applyQuality(normalized);
      return world.stats();
    },
    // setPlayer/setBall speak AUTHORED CHART coordinates (x, altitude, z) --
    // the same numbers every harness script was written in. On the sphere the
    // inputs are lifted; velocities are chart-frame components.
    setPlayer(x, y, z) {
      const cx = finite(Number(x)), cy = finite(Number(y)), cz = finite(Number(z));
      chartLift(cx, cy, cz, game.player.position);
      if (SPHERE_WORLD) {
        dirAt(game.player.position, game.player.up);
        liftQuatAt(cx, cz, game.player.frame);
      }
      game.player.velocity.set(0, 0, 0);
      game.player.grounded = false;
      return game.getState();
    },
    setBall(x, y, z, vx = 0, vy = 0, vz = 0, mode = 'outbound') {
      if (!['ready', 'outbound', 'returning', 'anchored', 'caught'].includes(mode)) throw new Error(`Unknown ball mode ${mode}`);
      const cx = finite(Number(x)), cy = finite(Number(y)), cz = finite(Number(z));
      chartLift(cx, cy, cz, game.ball.position);
      game.ball.velocity.set(finite(Number(vx)), finite(Number(vy)), finite(Number(vz)));
      if (SPHERE_WORLD) game.ball.velocity.applyQuaternion(liftQuatAt(cx, cz, new T.Quaternion()));
      game.ball.mode = mode;
      game.ball.anchor = null;
      game.ball.caughtBy = null;
      game.ball.collisionCooldown.clear();
      return game.getState();
    },
  });

  let accumulator = 0;
  let lastFrame = performance.now();
  let firstRenderedFrame = false;
  function frame(now) {
    const rawDelta = Math.max(0, (now - lastFrame) / 1000);
    lastFrame = now;
    const delta = clamp(rawDelta, 0, .05);
    world.noteFrame(rawDelta);
    if (!TEST_MODE) {
      accumulator = Math.min(accumulator + delta, FIXED_DT * 10);
      input.poll();
      let firstStep = true;
      let steps = 0;
      while (accumulator >= FIXED_DT && steps < 10) {
        game.update(FIXED_DT, input.prepareStep(firstStep), firstStep);
        accumulator -= FIXED_DT;
        firstStep = false;
        steps++;
      }
      if (steps > 0) input.endFrame();
    }
    world.render();
    if (!firstRenderedFrame) {
      firstRenderedFrame = true;
      document.body.dataset.firstFrame = 'true';
    }
    requestAnimationFrame(frame);
  }

  if (AUTO_START) {
    game.start(false);
    game.teleport(params.get('section') || 'start');
  }
  requestAnimationFrame(frame);
  if (TEST_MODE) setTimeout(() => runAutotest(), 50);
  }, 0));
})();
