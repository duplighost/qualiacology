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
  const GAME_VERSION = '3.4.0-guided-line';
  const QUALITY_STORAGE_KEY = 'kickball-lunar-quality-v2';
  const FIXED_DT = 1 / 120;
  const TAU = Math.PI * 2;
  const UP = new T.Vector3(0, 1, 0);
  const ZERO = new T.Vector3();

  const ui = {};
  [
    'hud', 'startOverlay', 'startButton', 'startActionHint', 'startKicker', 'startTitle', 'startCopy',
    'objectiveLabel', 'objectiveText', 'styleRank', 'styleFill', 'scoreValue',
    'bestValue', 'shieldPips', 'ballState', 'altitudeValue', 'jumpPips',
    'comboText', 'crosshair', 'hitMarker', 'damageVignette', 'chargeUI',
    'chargeFill', 'chargeText', 'promptToast', 'controlsHint', 'soundButton',
    'fullscreenButton', 'qualityButton', 'pauseOverlay', 'winOverlay',
    'winSummary', 'winTime', 'winScore', 'winRank', 'restartButton',
    'touchControls', 'movePad', 'lookPad', 'rightActionLabel',
    'touchJump', 'touchPause', 'pauseResumeButton', 'portraitHint', 'loadingMeter',
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
      this.buttons = { kick: false, snap: false, line: false, jump: false, spin: false, sprint: false, pause: false };
      this.edgePulses = { kick: false, snap: false, lineReleased: false, jump: false, spin: false, pause: false };
      this.previous = { kick: false, snap: false, line: false, jump: false, spin: false, pause: false };
      this.frame = {
        moveX: 0, moveZ: 0, lookX: 0, lookY: 0,
        kick: false, snap: false, line: false, jump: false, spin: false, sprint: false,
        kickPressed: false, kickReleased: false, snapPressed: false,
        linePressed: false, lineReleased: false,
        actionCancelled: false,
        jumpPressed: false, spinPressed: false, spinDirection: 0, spinPower: 1, pausePressed: false,
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
        if (event.button === 1) this.buttons.spin = true;
        event.preventDefault();
      });
      window.addEventListener('mouseup', event => {
        if (event.button === 0) this.buttons.kick = false;
        if (event.button === 2) this.endMouseLine(event);
        if (event.button === 1) this.buttons.spin = false;
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
      if (!this.mouseLineSpun && elapsed <= 260 && this.mouseLineMotion < 18) this.edgePulses.snap = true;
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
      // Full forward deflection is the touch sprint gesture. It preserves an
      // analog walk band while giving phones the same momentum route as Shift
      // and controller L3 without adding another thumb-blocking button.
      const touchSprint = this.touchEnabled && touchMagnitude > .84 && moveZ > .35;
      const sprint = touchSprint || gpSprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const pause = this.buttons.pause || this.keys.has('Escape') || this.keys.has('KeyP') || gpPause;
      Object.assign(this.frame, {
        moveX, moveZ, lookX: this.gamepadLook.x, lookY: this.gamepadLook.y, kick, snap, line, jump, spin, sprint,
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
    impact(strength = .5, material = 'rock') {
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
      const base = high ? 620 : 440;
      this.tone(base, .13, 'triangle', .06, base * 1.5);
      this.tone(base * 1.25, .2, 'sine', .04, base * 1.8, .05);
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
      const interval = 60000 / 102 / 2;
      const roots = [55, 65.41, 49, 73.42, 55, 82.41, 65.41, 49];
      this.sequence = setInterval(() => {
        if (!this.context || this.context.state !== 'running' || this.muted || !game || game.paused || game.won) return;
        const step = this.step++ % 16;
        const root = roots[Math.floor(step / 2) % roots.length];
        if (step % 4 === 0) this.tone(root, .48, 'sine', .045, root * .5, 0, this.music);
        if (step % 2 === 1) this.tone(root * 4, .22, 'triangle', .012, root * 5, 0, this.music);
        if (step % 8 === 6) this.tone(root * 6, .7, 'sine', .009, root * 8, 0, this.music);
      }, interval);
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
      scene.add(this.points);
    }
    burst(origin, color, amount = 14, speed = 9, life = .65, upward = .45) {
      const tint = color instanceof T.Color ? color : new T.Color(color);
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
        velocity.x *= drag;
        velocity.z *= drag;
        velocity.y -= 7.5 * dt;
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

  function terrainHeightAt(x, z) {
    let height = -2.8 + fbm(x * .012, z * .012, 5) * 3.3 + fbm(x * .041 + 11, z * .041 - 7, 3) * .8;
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
    return height;
  }

  function groundHeightAt(x, z) {
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
      this.makeFirstPersonRig();
      this.makeBallVisual();
      this.particles = new ParticleField(this.scene, this.quality === 'LOW' ? 520 : 900);
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
        colors[i * 3] = starColor.r;
        colors[i * 3 + 1] = starColor.g;
        colors[i * 3 + 2] = starColor.b;
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
      this.stars = new T.Points(geometry, new T.PointsMaterial({
        size: 1.7, sizeAttenuation: false, vertexColors: true,
        transparent: true, opacity: .96, depthWrite: false,
      }));
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
      }
      planet.userData.spinRate = randomRange(.008, .018, worldRandom);
      if (!this.planets) this.planets = [];
      this.planets.push(planet);
    }
    makeTerrain() {
      const size = 760;
      const segments = this.quality === 'LOW' ? 112 : 168;
      const geometry = new T.PlaneGeometry(size, size, segments, segments);
      geometry.rotateX(-Math.PI / 2);
      const positions = geometry.attributes.position;
      const colors = new Float32Array(positions.count * 3);
      const color = new T.Color();
      this.terrainSize = size;
      this.terrainSegments = segments;
      this.terrainHeights = new Float32Array(positions.count);
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), z = positions.getZ(i);
        const height = terrainHeightAt(x, z);
        positions.setY(i, height);
        this.terrainHeights[i] = height;
        const sampleX = terrainHeightAt(x + 1.4, z) - terrainHeightAt(x - 1.4, z);
        const sampleZ = terrainHeightAt(x, z + 1.4) - terrainHeightAt(x, z - 1.4);
        const slope = clamp(Math.hypot(sampleX, sampleZ) * .1, 0, 1);
        const tone = clamp(.54 + fbm(x * .035, z * .035, 3) * .16 - slope * .2 + height * .0008, .24, .78);
        color.setRGB(tone * .86, tone * .89, tone * .98);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
      geometry.computeVertexNormals();
      this.terrain = new T.Mesh(geometry, this.materials.regolith);
      this.terrain.receiveShadow = true;
      this.scene.add(this.terrain);

      const rockGeometry = new T.DodecahedronGeometry(1, 0);
      const rockCount = this.quality === 'LOW' ? 250 : this.quality === 'MED' ? 430 : 650;
      this.rockField = new T.InstancedMesh(rockGeometry, this.materials.rock, rockCount);
      this.rockField.receiveShadow = true;
      this.rockField.castShadow = this.quality === 'HIGH';
      const matrix = new T.Matrix4();
      const quaternion = new T.Quaternion();
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
        position.set(x, y + size * .35, z);
        quaternion.setFromEuler(new T.Euler(worldRandom() * TAU, worldRandom() * TAU, worldRandom() * TAU));
        scale.set(size * randomRange(.7, 1.35, worldRandom), size * randomRange(.45, 1.4, worldRandom), size * randomRange(.65, 1.5, worldRandom));
        matrix.compose(position, quaternion, scale);
        this.rockField.setMatrixAt(i, matrix);
      }
      this.rockField.instanceMatrix.needsUpdate = true;
      this.scene.add(this.rockField);
    }
    sampleTerrainHeight(x, z) {
      const size = this.terrainSize;
      const segments = this.terrainSegments;
      if (!this.terrainHeights || !size || !segments) return terrainHeightAt(x, z);
      const half = size / 2;
      const gx = clamp((clamp(x, -half, half) + half) / size * segments, 0, segments);
      const gz = clamp((clamp(z, -half, half) + half) / size * segments, 0, segments);
      const ix = Math.min(segments - 1, Math.floor(gx));
      const iz = Math.min(segments - 1, Math.floor(gz));
      const fx = gx - ix;
      const fz = gz - iz;
      const stride = segments + 1;
      const a = this.terrainHeights[ix + stride * iz];
      const b = this.terrainHeights[ix + stride * (iz + 1)];
      const c = this.terrainHeights[ix + 1 + stride * (iz + 1)];
      const d = this.terrainHeights[ix + 1 + stride * iz];
      // PlaneGeometry splits every quad along b--d (faces a,b,d and b,c,d).
      if (fx + fz <= 1) return a + (d - a) * fx + (b - a) * fz;
      return b * (1 - fx) + d * (1 - fz) + c * (fx + fz - 1);
    }
    terrainSlopeAt(x, z) {
      const radius = 1.25;
      const dx = (this.sampleTerrainHeight(x + radius, z) - this.sampleTerrainHeight(x - radius, z)) / (radius * 2);
      const dz = (this.sampleTerrainHeight(x, z + radius) - this.sampleTerrainHeight(x, z - radius)) / (radius * 2);
      return Math.hypot(dx, dz);
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
          torus, crystal, glow, used: false, pulse: worldRandom() * TAU,
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

      const fractureY = this.sampleTerrainHeight(0, -105) + 5.8;
      this.fracture = { active: true, position: new T.Vector3(0, fractureY, -105), width: 25, height: 12, shards: [] };
      this.fracture.group = new T.Group();
      this.fracture.group.position.copy(this.fracture.position);
      const shardMatrices = { violet: [], rock: [] };
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 7; col++) {
          const radius = randomRange(1.15, 2.25, worldRandom);
          const position = new T.Vector3((col - 3) * 3.3 + randomRange(-.45, .45, worldRandom), (row - 1.5) * 3 + randomRange(-.35, .35, worldRandom), randomRange(-.8, .8, worldRandom));
          const quaternion = new T.Quaternion().setFromEuler(new T.Euler(worldRandom() * TAU, worldRandom() * TAU, worldRandom() * TAU));
          const matrix = new T.Matrix4().compose(position, quaternion, new T.Vector3(radius, radius, radius * .58));
          shardMatrices[col % 3 === 0 ? 'violet' : 'rock'].push(matrix);
        }
      }
      for (const [kind, matrices] of Object.entries(shardMatrices)) {
        const shards = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), this.materials[kind], matrices.length);
        matrices.forEach((matrix, index) => shards.setMatrixAt(index, matrix));
        shards.instanceMatrix.needsUpdate = true;
        shards.castShadow = shards.receiveShadow = true;
        this.fracture.group.add(shards);
        this.fracture.shards.push(shards);
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
      for (let i = 0; i < 64; i++) {
        let x, z;
        for (let attempt = 0; attempt < 12; attempt++) {
          const pathBias = i < 30;
          x = pathBias ? randomRange(-34, 34, worldRandom) : randomRange(-175, 175, worldRandom);
          z = pathBias ? randomRange(-225, 125, worldRandom) : randomRange(-265, 155, worldRandom);
          if (!reserved.some(area => Math.hypot(x - area.x, z - area.z) < area.r) || attempt === 11) break;
        }
        const radius = randomRange(.65, 2.1, worldRandom);
        addSpec(x, z, radius, i % 7 === 0 ? 'violet' : 'rock', null, i % 13 === 0);
      }
      this.breakableMeshes = [];
      const geometry = new T.DodecahedronGeometry(1, 0);
      for (const kind of ['violet', 'rock']) {
        const entries = specs.filter(spec => spec.kind === kind);
        const mesh = new T.InstancedMesh(geometry, this.materials[kind], entries.length);
        entries.forEach((entry, index) => {
          entry.mesh = mesh;
          entry.instanceIndex = index;
          mesh.setMatrixAt(index, entry.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = this.quality === 'HIGH';
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.breakableMeshes.push(mesh);
      }
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
    makeBallVisual() {
      this.ballGroup = new T.Group();
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
      this.ballGroup.position.set(1, 2, 110);
      this.ballDisplayScale = .46;
      this.ballGroup.scale.setScalar(this.ballDisplayScale);
      this.scene.add(this.ballGroup);
      this.ballVisual = { shell, core, ringA, ringB };
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
      const scale = type === 'warden' ? 1.75 : type === 'brute' ? 1.46 : type === 'shield' ? 1.28 : type === 'floater' ? .96 : 1;
      const abdomenMaterial = type === 'warden' || type === 'floater' ? this.materials.violet : type === 'brute' ? this.materials.alienShell : this.materials.alien;
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
      const weak = new T.Mesh(new T.OctahedronGeometry(.24 * scale, 0), this.materials.gold);
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
      const glow = this.makeGlowSprite(type === 'warden' ? this.glowViolet : this.glowCyan, 3.8 * scale, .13);
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
      return floor;
    }
    insideBlocker(x, y, z, radius = .6, fromX = null, fromZ = null) {
      if (this.gate.active && Math.abs(z - this.gate.position.z) < 1 + radius && Math.abs(x) < this.gate.width / 2 + radius && Math.abs(y - this.gate.position.y) < this.gate.height / 2 + radius) return true;
      if (this.fracture.active && Math.abs(z - this.fracture.position.z) < 2.1 + radius && Math.abs(x) < this.fracture.width / 2 + radius && Math.abs(y - this.fracture.position.y) < this.fracture.height / 2 + radius) return true;
      for (const platform of this.platforms) {
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
      audio.impact(1, 'glass');
      return true;
    }
    openGate() {
      if (!this.gate.active) return;
      this.gate.active = false;
      this.gate.group.visible = false;
      this.particles.burst(this.gate.position, 0x65eeff, 48, 14, .85, .3);
      audio.score(true);
    }
    openGoal() {
      this.goal.open = true;
      this.goal.group.visible = true;
      this.particles.burst(this.goal.position, 0xffd76b, 60, 16, 1.2, .55);
      audio.score(true);
    }
    shatterBreakable(item, impact = 1) {
      if (!item.alive) return false;
      item.alive = false;
      item.mesh.setMatrixAt(item.instanceIndex, new T.Matrix4().makeScale(0, 0, 0));
      item.mesh.instanceMatrix.needsUpdate = true;
      this.particles.burst(item.position, item.mesh.material === this.materials.violet ? 0xba81ff : 0xbfc5d2, 14 + Math.floor(impact * 10), 8 + impact * 6, .75, .25);
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
      for (const item of this.breakables) {
        item.alive = true;
        item.mesh.setMatrixAt(item.instanceIndex, item.matrix);
      }
      this.breakableMeshes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
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
      this.stars.rotation.y += dt * .00035;
      this.starBand.rotation.y -= dt * .00018;
      this.anchors.forEach(anchor => {
        anchor.pulse += dt * (anchor.used ? 1.6 : 3.1);
        anchor.torus.rotation.z += dt * (anchor.used ? .4 : 1.35);
        anchor.crystal.rotation.y += dt * 1.6;
        anchor.crystal.position.y = Math.sin(anchor.pulse) * .18;
        anchor.glow.material.opacity = (anchor.used ? .18 : .58) + Math.sin(anchor.pulse) * .08;
        anchor.group.scale.setScalar(anchor.used ? .72 : 1 + Math.sin(anchor.pulse) * .025);
      });
      this.collectibles.forEach(pickup => {
        if (!pickup.active) return;
        pickup.group.rotation.y += dt * 1.8;
        pickup.group.position.y = pickup.position.y + Math.sin(this.elapsed * 2.8 + pickup.phase) * .22;
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
      }
      if (this.goal.open) {
        this.goal.group.rotation.z += dt * .48;
        this.goal.glow.material.opacity = .45 + Math.sin(this.elapsed * 3.4) * .12;
      }
      this.ballVisual.ringA.rotation.z += dt * (4 + gameState.ball.spin * .08);
      this.ballVisual.ringB.rotation.x += dt * (3.3 - gameState.ball.spin * .06);
      this.ballVisual.core.rotation.y += dt * 2.7;
      const targetBallScale = gameState.ball.mode === 'ready' ? .46 : 1;
      this.ballDisplayScale = damp(this.ballDisplayScale, targetBallScale, targetBallScale > this.ballDisplayScale ? 15 : 10, dt);
      this.ballGroup.scale.setScalar(this.ballDisplayScale);
      this.ballGlow.material.map = gameState.ball.mode === 'anchored' ? this.glowGold : gameState.ball.mode === 'returning' ? this.glowCyan : this.glowViolet;
      this.ballGlow.material.opacity = .34 + Math.min(.42, gameState.ball.velocity.length() * .012) + Math.sin(this.elapsed * 8) * .06;
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
      this.particles.update(dt);
      const target = gameState.player.position;
      this.sun.position.set(target.x - 130, target.y + 210, target.z + 110);
      this.sun.target.position.set(target.x, target.y, target.z - 35);
      this.sun.target.updateMatrixWorld();
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
          if (game) game.announce(`VISUAL ${next} // FRAME PACING`, '#83eeff');
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
      this.position = new T.Vector3(0, groundHeightAt(0, 120), 120);
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
      this.health = 5;
      this.invulnerable = 0;
      this.damageCooldown = 0;
      this.spinTimer = 0;
      this.spinCooldown = 0;
      this.spinAngle = 0;
      this.spinDirection = 1;
      this.spinPower = 1;
      this.grappling = false;
      this.landingKick = 0;
      this.checkpoint = this.position.clone();
      this.checkpointYaw = 0;
    }
  }

  class BallState {
    constructor(player) {
      this.position = player.position.clone().add(new T.Vector3(.05, .55, -3.1));
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
      this.radius = type === 'warden' ? 2.8 : type === 'brute' ? 2.05 : type === 'shield' ? 1.7 : type === 'floater' ? 1.3 : 1.25;
      this.maxHp = type === 'warden' ? 7 : type === 'brute' ? 3 : type === 'shield' ? 3 : 1;
      this.hp = this.maxHp;
      this.alive = true;
      this.phase = enemyRandom() * TAU;
      this.stun = 0;
      this.hitFlash = 0;
      this.attackCooldown = randomRange(.2, 1.1, enemyRandom);
      this.catchCooldown = 0;
      this.deadTimer = 0;
      this.summit = z < -100;
      this.visual = world.makeAlienMesh(type);
      this.visual.group.position.copy(this.position);
      this.visual.group.rotation.y = facing + Math.PI;
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
      this.toastTimer = 0;
      this.styleLabelTimer = 0;
      this.winTimer = null;
      this.pauseFocusVersion = 0;
      this.respawnCount = 0;
      this.stats = {
        kicks: 0, snaps: 0, spins: 0, doubleJumps: 0, meteorKicks: 0,
        anchorLinks: 0, breaks: 0, kills: 0, returnHits: 0, falls: 0,
      };
      this.bestTime = this.loadBest();
      this.forward = new T.Vector3();
      this.right = new T.Vector3();
      this.aimScratch = new T.Vector3();
      this.tempA = new T.Vector3();
      this.tempB = new T.Vector3();
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
      this.announce(input.touchEnabled ? 'LEFT THUMB MOVES // RIGHT THUMB GUIDES THE BALL' : 'LMB KICKS // RMB ENERGIZES THE LINE', '#83efff');
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
      this.toastTimer = 0;
      this.styleLabelTimer = 0;
      this.won = false;
      this.paused = false;
      this.started = wasStarted;
      this.respawnCount = 0;
      this.stats = {
        kicks: 0, snaps: 0, spins: 0, doubleJumps: 0, meteorKicks: 0,
        anchorLinks: 0, breaks: 0, kills: 0, returnHits: 0, falls: 0,
      };
      world.gate.active = true;
      world.gate.group.visible = true;
      world.fracture.active = true;
      world.fracture.group.visible = true;
      world.goal.open = false;
      world.goal.group.visible = false;
      world.anchors.forEach(anchor => { anchor.used = false; anchor.group.visible = true; });
      world.restoreBreakables();
      world.restorePlayground();
      this.spawnEnemies();
      world.particles.clear();
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
      ui.promptToast?.classList.add('hidden');
      if (ui.comboText) {
        ui.comboText.textContent = '';
        ui.comboText.classList.remove('active');
      }
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
    forwardFromView(target = this.forward) {
      const horizontal = Math.cos(this.player.pitch);
      return target.set(
        Math.sin(this.player.yaw) * horizontal,
        Math.sin(this.player.pitch),
        -Math.cos(this.player.yaw) * horizontal,
      ).normalize();
    }
    horizontalForward(target = this.forward) {
      return target.set(Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw)).normalize();
    }
    horizontalRight(target = this.right) {
      return target.set(Math.cos(this.player.yaw), 0, Math.sin(this.player.yaw)).normalize();
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
      this.updateEnemies(dt);
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
      player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
      if (edgeFrame && frame.jumpPressed) player.jumpBuffer = .15;
      if (player.grounded) player.coyote = .14;
      else player.coyote = Math.max(0, player.coyote - dt);

      const canGroundJump = player.coyote > 0 && player.jumpsUsed === 0;
      const canAirJump = !player.grounded && player.jumpsUsed < 2;
      if (player.jumpBuffer > 0 && (canGroundJump || canAirJump) && !player.grappling) {
        const second = !canGroundJump;
        player.jumpsUsed = second ? 2 : 1;
        player.velocity.y = second ? 19 : 16;
        player.grounded = false;
        player.coyote = 0;
        player.jumpBuffer = 0;
        if (second) {
          this.stats.doubleJumps++;
          this.addStyle(9, 260, 'DOUBLE MOON', '#ffd66b');
          world.particles.burst(player.position.clone().add(new T.Vector3(0, .3, 0)), 0xffd76b, 18, 7, .65, .15);
        } else {
          world.particles.burst(player.position.clone().add(new T.Vector3(0, .15, 0)), 0x8eeeff, 10, 4.5, .48, .08);
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
      const acceleration = player.grounded ? (sprinting ? 58 : 72) : 35;
      const horizontalVelocity = new T.Vector3(player.velocity.x, 0, player.velocity.z);
      if (!player.grappling) {
        if (moveAmount > .03) {
          const change = desiredVelocity.sub(horizontalVelocity);
          const maxChange = acceleration * dt;
          if (change.length() > maxChange) change.setLength(maxChange);
          player.velocity.x += change.x;
          player.velocity.z += change.z;
        } else {
          const drag = Math.exp(-(player.grounded ? 11.8 : 1.55) * dt);
          player.velocity.x *= drag;
          player.velocity.z *= drag;
        }
      }
      if (!frame.jump && player.velocity.y > 5.5) player.velocity.y -= 10 * dt;
      if (!player.grappling) player.velocity.y -= 15.2 * dt;
      player.runCycle += Math.hypot(player.velocity.x, player.velocity.z) * dt * .76;
      player.spinAngle += (player.spinTimer > 0 ? 13 + player.spinPower * 5 : 0) * dt;

      const currentFloor = world.floorHeight(player.position.x, player.position.z, player.position.y + 1);
      const nextX = player.position.x + player.velocity.x * dt;
      const nextZ = player.position.z + player.velocity.z * dt;
      const nextFloor = world.floorHeight(nextX, nextZ, player.position.y + 1);
      const stepHeight = nextFloor - player.position.y;
      const climbingTerrain = nextFloor > currentFloor + .005;
      const routeIncomplete = world.anchors.some(anchor => !anchor.used);
      const slopeBlocked = routeIncomplete && !player.grappling && climbingTerrain && world.terrainSlopeAt(nextX, nextZ) > .92 && player.position.y < nextFloor + 14;
      const blocked = world.insideBlocker(nextX, player.position.y + 1, nextZ, player.radius, player.position.x, player.position.z) || (stepHeight > 1.05 && !player.grappling) || slopeBlocked;
      if (!blocked) {
        player.position.x = nextX;
        player.position.z = nextZ;
      } else {
        const floorX = world.floorHeight(nextX, player.position.z, player.position.y + 1);
        const floorZ = world.floorHeight(player.position.x, nextZ, player.position.y + 1);
        const canMoveX = !world.insideBlocker(nextX, player.position.y + 1, player.position.z, player.radius, player.position.x, player.position.z) && floorX <= player.position.y + 1.05 && !(routeIncomplete && !player.grappling && floorX > currentFloor + .005 && world.terrainSlopeAt(nextX, player.position.z) > .92 && player.position.y < floorX + 14);
        const canMoveZ = !world.insideBlocker(player.position.x, player.position.y + 1, nextZ, player.radius, player.position.x, player.position.z) && floorZ <= player.position.y + 1.05 && !(routeIncomplete && !player.grappling && floorZ > currentFloor + .005 && world.terrainSlopeAt(player.position.x, nextZ) > .92 && player.position.y < floorZ + 14);
        if (canMoveX) player.position.x = nextX; else player.velocity.x *= -.05;
        if (canMoveZ) player.position.z = nextZ; else player.velocity.z *= -.05;
      }
      player.position.y += player.velocity.y * dt;
      const floor = world.floorHeight(player.position.x, player.position.z, player.position.y + 1.4);
      if (!player.grappling && player.position.y <= floor && player.velocity.y <= 0) {
        const landingSpeed = -player.velocity.y;
        const wasAirborne = !player.grounded;
        player.position.y = floor;
        player.velocity.y = 0;
        player.grounded = true;
        player.jumpsUsed = 0;
        if (wasAirborne && landingSpeed > 4) {
          player.landingKick = clamp(landingSpeed / 16, .18, 1);
          this.shake = Math.max(this.shake, clamp(landingSpeed * .012, .05, .24));
          world.particles.burst(player.position.clone().add(new T.Vector3(0, .08, 0)), 0xc9d2df, Math.floor(7 + landingSpeed), 4 + landingSpeed * .22, .55, .02);
        }
      } else if (player.position.y > floor + .04) {
        player.grounded = false;
      }
      for (const pad of world.launchPads) {
        if (pad.cooldown > 0 || Math.abs(player.position.y - pad.position.y) > 1.65) continue;
        if (Math.hypot(player.position.x - pad.position.x, player.position.z - pad.position.z) > pad.radius) continue;
        pad.cooldown = 1.05;
        player.velocity.y = Math.max(player.velocity.y, pad.impulse);
        const launchForward = this.horizontalForward(new T.Vector3());
        player.velocity.addScaledVector(launchForward, 5.8);
        player.grounded = false;
        player.jumpsUsed = 0;
        this.addStyle(7, 230, 'MOONSPRING', '#83efff');
        world.particles.burst(pad.position.clone().addScaledVector(UP, .35), 0x72efff, 28, 9, .72, .08);
        audio.jump(true);
        this.shake = Math.max(this.shake, .18);
      }
      player.position.x = clamp(player.position.x, -355, 355);
      player.position.z = clamp(player.position.z, -350, 340);
      if (player.position.y < -35 || !Number.isFinite(player.position.y)) this.respawnPlayer();
    }
    updateCamera(dt) {
      const player = this.player;
      const speed = Math.hypot(player.velocity.x, player.velocity.z);
      const bobAmount = player.grounded ? clamp(speed / 18, 0, 1) : 0;
      const bobY = Math.abs(Math.sin(player.runCycle * 1.9)) * .055 * bobAmount;
      const bobX = Math.sin(player.runCycle * .95) * .035 * bobAmount;
      this.shake = Math.max(0, this.shake - dt * 2.8);
      const shakeMagnitude = this.shake * this.shake;
      const shakeX = (cosmeticRandom() * 2 - 1) * shakeMagnitude * .055;
      const shakeY = (cosmeticRandom() * 2 - 1) * shakeMagnitude * .04;
      world.camera.position.set(player.position.x + bobX, player.position.y + player.eyeHeight + bobY - player.landingKick * .14, player.position.z);
      const spinRoll = player.spinTimer > 0 ? player.spinDirection * .065 * clamp(player.spinTimer * 5, 0, 1) : 0;
      this.cameraRoll = damp(this.cameraRoll, spinRoll, 10, dt);
      // Three cameras face local -Z, so their visual Y rotation is the inverse
      // of the positive-right yaw used by movement, aim, and ball steering.
      world.camera.rotation.set(player.pitch + shakeY, -player.yaw + shakeX, this.cameraRoll, 'YXZ');
      const speedFov = smoothstep(6, 19, speed) * 8;
      const actionFov = (player.grappling ? 6 : 0) + (player.spinTimer > 0 ? 4 : 0);
      world.camera.fov = damp(world.camera.fov, 76 + speedFov + actionFov, 7.5, dt);
      world.camera.updateProjectionMatrix();
    }
    launchBall(charge, forcedDirection = null, redirected = false) {
      const ball = this.ball;
      const player = this.player;
      const direction = forcedDirection ? forcedDirection.clone().normalize() : this.forwardFromView(new T.Vector3());
      const power = 24 + Math.pow(clamp(charge, 0, 1), .72) * 34;
      const airborne = !player.grounded || player.position.y > world.floorHeight(player.position.x, player.position.z, player.position.y + 1) + .25;
      const meteor = airborne && direction.y < -.36;
      ball.position.copy(world.camera.position).addScaledVector(direction, 1.25);
      ball.velocity.copy(direction).multiplyScalar(power).addScaledVector(player.velocity, .22);
      ball.mode = 'outbound';
      ball.flightTime = 0;
      ball.freeFlightTime = 0;
      ball.returnTime = 0;
      ball.launchCharge = charge;
      ball.outboundDuration = 1.28 + charge * 1.22;
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
        player.velocity.y = Math.max(player.velocity.y, 12.2 + charge * 4.2);
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
        direction: this.forwardFromView(new T.Vector3()),
        expires: this.time + 2.7,
      };
      if (this.ball.mode === 'outbound') this.beginReturn('queued');
      if (this.ball.mode === 'caught') this.ball.snapTimer = Math.max(this.ball.snapTimer, .28);
      this.announce('VOLLEY ARMED // CATCH AND FIRE', '#ffd66b');
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
          ball.flightSpinTimer = 1.05 + gesturePower * .42;
          ball.flightSpinDirection = chosenDirection;
          ball.flightSpinPower = gesturePower;
          ball.freeFlightTime = 0;
          this.addStyle(13, 560, chosenDirection > 0 ? 'CLOCKWISE AIRLINE' : 'COUNTER AIRLINE', '#bf83ff');
          this.announce('AIRBORNE ORBIT // KEEP AIMING THE LINE', '#d5a8ff');
        } else if (ball.mode === 'returning') {
          this.addStyle(11, 440, chosenDirection > 0 ? 'RIGHT RETURN ARC' : 'LEFT RETURN ARC', '#bf83ff');
          this.announce('RETURN CURVE FLIPPED // GUIDE IT HOME', '#d5a8ff');
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
        this.announce(chosenDirection > 0 ? 'CLOCKWISE LOOP BANKED' : 'COUNTER LOOP BANKED', '#d5a8ff');
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
        const center = this.orbitCenterScratch.copy(player.position).addScaledVector(UP, player.eyeHeight)
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
        this.announce(wrecked ? 'ORBIT SMASH // EVERYTHING IN REACH GETS HIT' : 'ORBIT ARMED // CLOSE THE DISTANCE', '#d5a8ff');
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
      if (incoming > 38) this.addStyle(6, 190, 'HOME AT MACH', '#83efff');
      if (this.queuedKick) {
        const queued = this.queuedKick;
        this.queuedKick = null;
        if (queued.expires >= this.time) this.launchBall(queued.charge, queued.direction, true);
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
      const start = this.tetherOrigin(this.lineOriginScratch).clone();
      const end = this.tetherEnd(this.lineEndScratch, start).clone();
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
          ball.freeFlightTime = this.lineHeld || ball.flightSpinTimer > 0
            ? Math.max(0, ball.freeFlightTime - dt * 2.4)
            : ball.freeFlightTime + dt;
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
            const steerStrength = (this.lineHeld ? 6.8 : 3.8)
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
          ball.velocity.y -= (this.lineHeld ? 3.2 : 5.25) * dt;
          ball.position.addScaledVector(ball.velocity, dt);
          const separation = ball.position.distanceTo(player.position);
          speed = ball.velocity.length();
          if (this.lineHeld && separation < 1.8 && ball.tetherWrapId === null) this.completeReturn();
          else if ((ball.freeFlightTime >= ball.outboundDuration && !this.lineHeld && ball.flightSpinTimer <= 0)
            || separation >= ball.maxRange * (this.lineHeld ? 1.24 : 1)
            || (ball.bounceCount > 0 && ball.freeFlightTime > .78 && !this.lineHeld)
            || (speed < 4.5 && !this.lineHeld)) this.beginReturn('auto');
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
        const snap = frame.snap || frame.line ? 1 : 0;
        const arcEnvelope = smoothstep(2.5, 12, distance) * (1 - smoothstep(38, 65, distance));
        const arc = ball.returnSide * arcEnvelope * (7.5 + Math.min(9, distance * .16)) * (1 - snap * .76);
        const desiredSpeed = 29 + Math.min(28, distance * .7) + snap * 17 + ball.curveBoost * 12;
        const desiredVelocity = direction.multiplyScalar(desiredSpeed).addScaledVector(right, arc);
        const acceleration = 112 + snap * 120 + ball.returnTime * 54;
        const change = desiredVelocity.sub(ball.velocity);
        const maxChange = acceleration * dt;
        if (change.length() > maxChange) change.setLength(maxChange);
        ball.velocity.add(change);
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
          || ball.returnTime > 3.4 || ball.returnStuck > 1.05) this.completeReturn();
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
      if (!anchor || anchor.used) {
        ball.anchor = null;
        ball.mode = 'returning';
        return;
      }
      ball.position.copy(anchor.position);
      ball.position.y += Math.sin(this.time * 8) * .13;
      ball.velocity.set(0, 0, 0);
      if (frame.line || frame.snap) {
        const nextTarget = ball.tetherPath[1] || anchor.position;
        const toAnchor = nextTarget.clone().sub(this.player.position);
        const distance = this.player.position.distanceTo(anchor.position);
        const pathDistance = Math.max(distance, ball.tetherPathLength);
        const direction = toAnchor.lengthSq() > .001 ? toAnchor.normalize() : UP.clone();
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
        if (cosmeticRandom() < dt * 42) world.particles.burst(this.player.position.clone().add(new T.Vector3(0, 1, 0)), 0x7befff, 1, 2.5, .35, 0);
        if (distance < 3.35 && ball.tetherWrapId === null) {
          anchor.used = true;
          this.stats.anchorLinks++;
          this.player.grappling = false;
          this.player.velocity.y = Math.max(this.player.velocity.y, 11.2);
          this.player.jumpsUsed = 0;
          const platform = world.platforms[anchor.index];
          this.player.checkpoint.set(platform.x, platform.top + .1, platform.z + 1.5);
          this.player.checkpointYaw = this.player.yaw;
          ball.anchor = null;
          ball.mode = 'returning';
          ball.returnTime = 0;
          ball.velocity.copy(this.player.velocity).multiplyScalar(.55);
          ball.lastReturnDistance = ball.position.distanceTo(this.player.position);
          this.addStyle(18 + anchor.index * 2, 850 + anchor.index * 160, `SLING LINK ${anchor.index + 1}/4`, anchor.index === 3 ? '#ffd66b' : '#83efff');
          world.particles.burst(anchor.position, anchor.index === 3 ? 0xffd66b : 0x7befff, 34, 13, .9, .3);
          audio.impact(1, 'anchor');
          this.shake = Math.max(this.shake, .24);
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
          this.announce('TETHER TIMED OUT // KICK THE SOCKET AGAIN', '#83efff');
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
      ball.position.copy(enemy.position).addScaledVector(UP, enemy.type === 'warden' ? 2.8 : 1.8).addScaledVector(front, enemy.radius + .72);
      ball.velocity.set(0, 0, 0);
      ball.spin += dt * 6;
      const snapFree = ball.snapTimer > .38;
      const autoFree = ball.catchTimer > 1.05;
      audio.recall(true, clamp(Math.max(ball.snapTimer / .38, ball.catchTimer / 1.05), 0, 1));
      if (snapFree || autoFree) {
        const direction = this.player.position.clone().addScaledVector(UP, 1.2).sub(ball.position).normalize();
        ball.caughtBy = null;
        ball.mode = 'returning';
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
    resolveBallWorld(previous) {
      const ball = this.ball;
      const floor = world.floorHeight(ball.position.x, ball.position.z, ball.position.y + 1);
      if (ball.position.y - ball.radius < floor) {
        const impact = Math.max(0, -ball.velocity.y);
        ball.position.y = floor + ball.radius;
        if (ball.velocity.y < 0) ball.velocity.y *= -.7;
        ball.velocity.x *= .965;
        ball.velocity.z *= .965;
        if (impact > 5) {
          ball.bounceCount++;
          world.particles.burst(ball.position.clone().addScaledVector(UP, -ball.radius), 0xbfc6d2, 5 + Math.floor(impact), 4 + impact * .35, .5, .05);
          audio.impact(clamp(impact / 28, .15, 1), 'rock');
          if (impact > 16) this.addStyle(3, 90, 'LUNAR BANK', '#83efff');
        }
      }

      // The climb pillars are true world solids for the signature ball too.
      // Resolve their cylindrical sides before route anchors so a fast kick can
      // bank around the mesa but cannot ghost through tens of metres of rock.
      for (const platform of world.platforms) {
        if (ball.position.y - ball.radius >= platform.top - .35) continue;
        const sideRadius = platform.radius * 1.03 + ball.radius;
        let dx = ball.position.x - platform.x;
        let dz = ball.position.z - platform.z;
        let distance = Math.hypot(dx, dz);
        if (distance >= sideRadius) continue;
        if (distance < 1e-5) {
          dx = previous.x - platform.x;
          dz = previous.z - platform.z;
          distance = Math.hypot(dx, dz);
          if (distance < 1e-5) {
            dx = -ball.velocity.x;
            dz = -ball.velocity.z;
            distance = Math.hypot(dx, dz) || 1;
          }
        }
        const nx = dx / distance;
        const nz = dz / distance;
        ball.position.x = platform.x + nx * sideRadius;
        ball.position.z = platform.z + nz * sideRadius;
        const along = ball.velocity.x * nx + ball.velocity.z * nz;
        if (along < 0) {
          ball.velocity.x -= nx * along * 1.78;
          ball.velocity.z -= nz * along * 1.78;
          ball.velocity.y *= .985;
          ball.spin += (ball.velocity.x * nz - ball.velocity.z * nx) * .08;
          ball.bounceCount++;
          const key = `pillar-${platform.id}`;
          if (!ball.collisionCooldown.has(key)) {
            ball.collisionCooldown.set(key, .1);
            world.particles.burst(ball.position, 0xc7d0dc, 12, 8, .48, .08);
            audio.impact(clamp(Math.abs(along) / 38, .2, 1), 'rock');
          }
        }
      }

      if (world.gate.active && Math.abs(ball.position.z - world.gate.position.z) < 1.35 + ball.radius && Math.abs(ball.position.x) < world.gate.width / 2 + ball.radius && Math.abs(ball.position.y - world.gate.position.y) < world.gate.height / 2 + ball.radius) {
        ball.position.z = previous.z;
        ball.velocity.z *= -1.02;
        ball.bounceCount++;
        world.particles.burst(ball.position, 0x72edff, 18, 8, .55, .08);
        audio.impact(.7, 'anchor');
      }
      if (world.fracture.active && Math.abs(ball.position.z - world.fracture.position.z) < 2.4 + ball.radius && Math.abs(ball.position.x) < world.fracture.width / 2 + ball.radius && Math.abs(ball.position.y - world.fracture.position.y) < world.fracture.height / 2 + ball.radius) {
        const speed = ball.velocity.length();
        const climbComplete = world.anchors.every(anchor => anchor.used);
        if (climbComplete && ball.mode === 'outbound' && ball.launchCharge >= .78 && speed > 29) {
          world.breakFracture(ball.position);
          this.stats.breaks++;
          this.addStyle(26, 2200, 'MOONBREAKER', '#ffd66b');
          this.hitStop = .055;
          this.shake = Math.max(this.shake, .58);
        } else {
          ball.position.z = previous.z;
          ball.velocity.z *= -1.06;
          ball.bounceCount++;
          this.announce(climbComplete ? 'FRACTURE NEEDS A FULL OUTBOUND KICK' : 'LOCK THE FOUR SLING ANCHORS FIRST', '#ffd66b');
          world.particles.burst(ball.position, 0xba84ff, 18, 9, .55, .08);
        }
      }

      for (const item of world.breakables) {
        if (!item.alive || ball.collisionCooldown.has(item.id)) continue;
        const distance = item.position.distanceTo(ball.position);
        if (distance > item.radius + ball.radius) continue;
        const speed = ball.velocity.length();
        if (speed > 10) {
          world.shatterBreakable(item, clamp(speed / 38, .2, 1));
          ball.collisionCooldown.set(item.id, .16);
          this.stats.breaks++;
          this.addStyle(2, 80, speed > 36 ? 'SHARD LINE' : null, '#c7d0dc');
          continue;
        }
        const normal = ball.position.clone().sub(item.position).normalize();
        const along = ball.velocity.dot(normal);
        if (along < 0) ball.velocity.addScaledVector(normal, -1.7 * along);
        ball.position.addScaledVector(normal, item.radius + ball.radius - distance + .02);
      }

      for (const nest of world.nests) {
        if (!nest.alive || ball.collisionCooldown.has(nest.id)) continue;
        const distance = nest.position.distanceTo(ball.position);
        if (distance > nest.radius + ball.radius) continue;
        const speed = ball.velocity.length();
        const normal = ball.position.clone().sub(nest.position).normalize();
        if (speed > 8) {
          const damage = ball.mode === 'returning' || ball.launchCharge > .86 || speed > 45 ? 2 : 1;
          const destroyed = world.damageNest(nest, damage, clamp(speed / 42, .25, 1));
          ball.collisionCooldown.set(nest.id, .24);
          const along = ball.velocity.dot(normal);
          if (along < 0) ball.velocity.addScaledVector(normal, -1.38 * along);
          this.shake = Math.max(this.shake, destroyed ? .5 : .24);
          this.hitStop = Math.max(this.hitStop, destroyed ? .065 : .032);
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
        if (ball.velocity.length() < 7) continue;
        if (world.strikeChime(chime)) {
          ball.collisionCooldown.set(chime.id, .25);
          this.addStyle(12, 760, 'MOON CHIME', '#ffd66b');
          this.shake = Math.max(this.shake, .18);
        }
      }

      if (ball.mode === 'outbound' && ball.velocity.length() >= 12) {
        const anchor = world.anchors.find(candidate => !candidate.used);
        const touchedAnchor = world.anchors.find(candidate => !candidate.used && ball.position.distanceTo(candidate.position) <= 4.4);
        if (touchedAnchor && touchedAnchor !== anchor) {
          const expected = (anchor?.index ?? 0) + 1;
          this.announce(`LINK ${expected} IS PULSING // FOLLOW THE CYAN ROUTE`, '#ffd66b');
          world.particles.burst(touchedAnchor.position, 0xffd66b, 18, 7, .58, .12);
          ball.collisionCooldown.set(touchedAnchor.id, .32);
          audio.impact(.55, 'anchor');
        }
        if (anchor && touchedAnchor === anchor) {
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
          this.player.velocity.y = Math.max(this.player.velocity.y, 3.8 + ball.launchCharge * 2.4);
          this.player.grounded = false;
          this.addStyle(12, 520, 'ANCHORED', '#83efff');
          world.particles.burst(anchor.position, 0x76efff, 26, 10, .72, .2);
          audio.impact(.9, 'anchor');
          this.announce(input.touchEnabled ? 'TETHER LOCKED // HOLD THE RIGHT SIDE TO PULL' : 'TETHER LOCKED // HOLD RMB TO PULL', '#83efff');
        }
      }

      if (world.goal.open && Math.abs(ball.position.z - world.goal.position.z) < 2.4 && Math.hypot(ball.position.x - world.goal.position.x, ball.position.y - world.goal.position.y) < world.goal.radius) {
        this.completeRun();
      }
      if (ball.position.y < -45 || ball.position.distanceTo(this.player.position) > 280) {
        ball.position.copy(this.player.position).add(new T.Vector3(0, 3, 4));
        ball.velocity.copy(this.player.position).sub(ball.position).setLength(32);
        ball.mode = 'returning';
        ball.returnTime = 0;
        ball.lastReturnDistance = ball.position.distanceTo(this.player.position);
      }
    }
    enemyFront(enemy, target = new T.Vector3()) {
      return target.set(Math.sin(enemy.facing), 0, Math.cos(enemy.facing)).normalize();
    }
    resolveBallEnemies() {
      const ball = this.ball;
      for (const enemy of this.enemies) {
        if (!enemy.alive || (enemy.summit && world.fracture.active) || ball.collisionCooldown.has(enemy.id) || ball.caughtBy) continue;
        const center = enemy.position.clone().addScaledVector(UP, enemy.radius * .7);
        const distance = center.distanceTo(ball.position);
        if (distance > enemy.radius + ball.radius) continue;
        const normal = ball.position.clone().sub(center).normalize();
        const speed = ball.velocity.length();
        const front = this.enemyFront(enemy, this.tempA);
        const frontness = normal.dot(front);
        const returnAttack = ball.mode === 'returning';
        const validHit = speed > 8;
        ball.collisionCooldown.set(enemy.id, .22);
        if (enemy.type !== 'shield' && enemy.type !== 'warden') {
          if (validHit) this.damageAlien(enemy, 1, returnAttack ? 'return' : 'kick');
          const along = ball.velocity.dot(normal);
          if (along < 0) ball.velocity.addScaledVector(normal, -1.45 * along);
          continue;
        }
        const protectedFront = frontness > .12;
        if (protectedFront) {
          if (enemy.type === 'warden' && ball.mode === 'outbound' && enemy.catchCooldown <= 0 && speed > 12) {
            ball.mode = 'caught';
            ball.caughtBy = enemy;
            ball.catchTimer = ball.snapTimer = 0;
            ball.velocity.set(0, 0, 0);
            enemy.catchCooldown = .8;
            this.announce('BALL STOLEN // HOLD RIGHT TO RIP IT FREE', '#bf83ff');
            world.particles.burst(ball.position, 0xbe83ff, 22, 9, .68, .12);
            audio.impact(.9, 'alien');
          } else {
            const along = ball.velocity.dot(normal);
            if (along < 0) ball.velocity.addScaledVector(normal, -1.78 * along);
            else ball.velocity.addScaledVector(front, 7);
            enemy.hitFlash = .5;
            this.announce('CARAPACE BLOCK // CURVE THE RETURN BEHIND IT', '#83efff');
            world.particles.burst(ball.position, 0x778cff, 15, 8, .52, .1);
            audio.impact(.62, 'alien');
          }
        } else if (returnAttack && validHit) {
          this.stats.returnHits++;
          this.damageAlien(enemy, 1, 'return');
          const along = ball.velocity.dot(normal);
          if (along < 0) ball.velocity.addScaledVector(normal, -1.25 * along);
        } else {
          const along = ball.velocity.dot(normal);
          if (along < 0) ball.velocity.addScaledVector(normal, -1.4 * along);
          this.announce('WEAK SIDE ONLY // MAKE THE RETURN THE WEAPON', '#ffd66b');
        }
      }
    }
    damageAlien(enemy, amount = 1, source = 'kick') {
      if (!enemy.alive || (enemy.summit && world.fracture.active)) return false;
      enemy.hp -= amount;
      enemy.hitFlash = 1;
      enemy.stun = enemy.type === 'warden' ? .28 : .52;
      const hitPosition = enemy.position.clone().addScaledVector(UP, enemy.radius * .75);
      world.particles.burst(hitPosition, source === 'spin' ? 0xbd83ff : source === 'return' ? 0xffd66b : 0x7aefff, enemy.type === 'warden' ? 30 : 20, 12, .78, .2);
      this.showHitMarker(enemy.hp <= 0);
      this.shake = Math.max(this.shake, enemy.type === 'warden' ? .31 : .22);
      this.hitStop = Math.max(this.hitStop, enemy.hp <= 0 ? .058 : .032);
      audio.impact(.75, 'alien');
      if (enemy.hp > 0) {
        const label = enemy.type === 'warden' ? `WARDEN ${enemy.hp}/${enemy.maxHp}` : enemy.type === 'shield' ? `BACK HIT ${enemy.hp}/${enemy.maxHp}` : 'ALIEN HIT';
        this.addStyle(source === 'return' ? 13 : 6, source === 'return' ? 620 : 240, label, source === 'return' ? '#ffd66b' : '#83efff');
        return true;
      }
      enemy.hp = 0;
      enemy.alive = false;
      enemy.deadTimer = .82;
      enemy.velocity.copy(enemy.position).sub(this.ball.position).normalize().multiplyScalar(10).addScaledVector(UP, 8);
      this.stats.kills++;
      this.addStyle(enemy.type === 'warden' ? 34 : enemy.type === 'shield' ? 25 : 12, enemy.type === 'warden' ? 5000 : enemy.type === 'shield' ? 2400 : 700, enemy.type === 'warden' ? 'CROWN SHATTERED' : enemy.type === 'shield' ? 'CARAPACE BROKEN' : 'MOONSMASH', '#ffd66b');
      world.particles.burst(hitPosition, 0xffdf79, enemy.type === 'warden' ? 72 : 36, enemy.type === 'warden' ? 24 : 16, 1.15, .45);
      audio.score(true);
      if (enemy === this.shieldEnemy) world.openGate();
      // The aperture opens only after the entire summit encounter is cleared.
      return true;
    }
    updateEnemies(dt) {
      const player = this.player;
      for (const enemy of this.enemies) {
        enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 3.8);
        enemy.stun = Math.max(0, enemy.stun - dt);
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
        enemy.catchCooldown = Math.max(0, enemy.catchCooldown - dt);
        const visual = enemy.visual;
        if (!enemy.alive) {
          enemy.deadTimer -= dt;
          enemy.position.addScaledVector(enemy.velocity, dt);
          enemy.velocity.y -= 13 * dt;
          enemy.velocity.multiplyScalar(Math.exp(-2.4 * dt));
          visual.group.position.copy(enemy.position);
          visual.group.rotation.x += dt * 5;
          visual.group.rotation.z += dt * 3.5;
          const scale = clamp(enemy.deadTimer / .82, 0, 1);
          visual.group.scale.setScalar(Math.pow(scale, .65));
          if (enemy.deadTimer <= 0) visual.group.visible = false;
          continue;
        }
        visual.group.visible = true;
        visual.group.scale.setScalar(1);
        const summitLocked = enemy.summit && world.fracture.active;
        const toPlayer = player.position.clone().sub(enemy.position);
        const horizontalDistance = Math.hypot(toPlayer.x, toPlayer.z);
        const activeRange = enemy.type === 'warden' ? 80 : enemy.type === 'floater' ? 58 : 46;
        if (!summitLocked && horizontalDistance < activeRange && enemy.stun <= 0) {
          const desiredFacing = Math.atan2(toPlayer.x, toPlayer.z);
          if (enemy.type === 'shield' || enemy.type === 'warden') {
            const target = this.ball.position.clone().sub(enemy.position);
            const faceBall = Math.atan2(target.x, target.z);
            enemy.facing += angleDelta(enemy.facing, faceBall) * (1 - Math.exp(-dt * (this.ball.mode === 'returning' ? 1.4 : 4.8)));
          } else {
            enemy.facing += angleDelta(enemy.facing, desiredFacing) * (1 - Math.exp(-dt * 6.5));
          }
          if (enemy.type === 'scuttler') {
            const direction = toPlayer.setY(0).normalize();
            const strafe = Math.sin(this.time * 2.2 + enemy.phase) * .35;
            direction.x += Math.cos(enemy.facing) * strafe;
            direction.z -= Math.sin(enemy.facing) * strafe;
            direction.normalize();
            enemy.velocity.x = damp(enemy.velocity.x, direction.x * 4.8, 5, dt);
            enemy.velocity.z = damp(enemy.velocity.z, direction.z * 4.8, 5, dt);
          } else if (enemy.type === 'floater') {
            const orbitAngle = this.time * .72 + enemy.phase;
            const direction = toPlayer.setY(0).normalize();
            direction.x += Math.cos(orbitAngle) * .82;
            direction.z += Math.sin(orbitAngle) * .82;
            direction.normalize();
            enemy.velocity.x = damp(enemy.velocity.x, direction.x * 3.8, 3.4, dt);
            enemy.velocity.z = damp(enemy.velocity.z, direction.z * 3.8, 3.4, dt);
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
        const hop = enemy.type === 'scuttler' ? Math.max(0, Math.sin(this.time * 5.2 + enemy.phase)) * .32
          : enemy.type === 'floater' ? 4.1 + Math.sin(this.time * 2.3 + enemy.phase) * .8
            : enemy.type === 'brute' ? Math.max(0, Math.sin(this.time * 2.2 + enemy.phase)) * .14
              : Math.sin(this.time * 1.7 + enemy.phase) * .06;
        enemy.position.y = floor + hop;
        visual.group.position.copy(enemy.position);
        visual.group.rotation.y = enemy.facing + Math.PI;
        visual.abdomen.scale.y = visual.scale * (.8 + hop * .08);
        visual.eye.material.emissiveIntensity = 3.8 + Math.sin(this.time * 5 + enemy.phase) * .9;
        visual.weak.visible = enemy.type === 'shield' || enemy.type === 'warden' || enemy.type === 'brute';
        if (visual.shield) visual.shield.material.emissiveIntensity = 1.7 + enemy.hitFlash * 5;
        const playerDistance = enemy.position.distanceTo(player.position);
        if (playerDistance < enemy.radius + player.radius + .6 && player.damageCooldown <= 0 && !summitLocked) {
          if (player.velocity.y < -3 && player.position.y > enemy.position.y + enemy.radius * .5) {
            this.damageAlien(enemy, 1, 'stomp');
            player.velocity.y = 12.8;
            player.jumpsUsed = Math.min(player.jumpsUsed, 1);
            this.addStyle(9, 330, 'LUNAR STOMP', '#83efff');
          } else {
            this.damagePlayer(enemy);
          }
        }
      }
    }
    updatePlaygroundInteractions(dt) {
      for (const pickup of world.collectibles) {
        if (!pickup.active) continue;
        const playerDistance = pickup.group.position.distanceTo(this.player.position.clone().addScaledVector(UP, .9));
        const ballDistance = pickup.group.position.distanceTo(this.ball.position);
        if (playerDistance > 2.1 && ballDistance > 1.65) continue;
        pickup.active = false;
        pickup.group.visible = false;
        this.player.health = Math.min(5, this.player.health + 1);
        this.player.jumpsUsed = 0;
        this.player.jumpBuffer = Math.max(this.player.jumpBuffer, .06);
        this.addStyle(8, 420, pickup.label, '#ffd66b');
        world.particles.burst(pickup.group.position, 0xffd66b, 28, 9, .82, .25);
        audio.score(true);
      }

      if (this.ball.mode !== 'outbound' && this.ball.mode !== 'returning') return;
      for (const pad of world.launchPads) {
        if (pad.cooldown > 0 || Math.abs(this.ball.position.y - pad.position.y) > 1.5) continue;
        if (Math.hypot(this.ball.position.x - pad.position.x, this.ball.position.z - pad.position.z) > pad.radius) continue;
        pad.cooldown = .48;
        this.ball.position.y = pad.position.y + this.ball.radius + .25;
        this.ball.velocity.y = Math.max(Math.abs(this.ball.velocity.y) * .72, pad.impulse * 1.22);
        this.ball.velocity.multiplyScalar(1.08);
        this.ball.bounceCount++;
        this.addStyle(6, 260, 'BALLSPRING', '#83efff');
        world.particles.burst(pad.position.clone().addScaledVector(UP, .45), 0x72efff, 24, 10, .68, .08);
        audio.impact(.8, 'anchor');
      }
    }
    damagePlayer(enemy) {
      const player = this.player;
      if (player.invulnerable > 0 || player.damageCooldown > 0) return;
      player.health = Math.max(0, player.health - 1);
      player.damageCooldown = .8;
      player.invulnerable = .45;
      const away = player.position.clone().sub(enemy.position).setY(.18).normalize();
      player.velocity.addScaledVector(away, 10);
      player.velocity.y = Math.max(player.velocity.y, 6.5);
      this.style = Math.max(0, this.style - 16);
      this.shake = Math.max(this.shake, .62);
      ui.damageVignette?.classList.add('active');
      setTimeout(() => ui.damageVignette?.classList.remove('active'), 180);
      audio.damage();
      if (player.health <= 0) this.respawnPlayer();
    }
    respawnPlayer() {
      const player = this.player;
      this.stats.falls++;
      this.respawnCount++;
      player.position.copy(player.checkpoint);
      player.velocity.set(0, 0, 0);
      player.yaw = player.checkpointYaw;
      player.pitch = -.05;
      player.health = 5;
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
      world.particles.burst(player.position.clone().addScaledVector(UP, 1), 0x83efff, 34, 10, .9, .35);
      this.announce('SUIT RECONSTITUTED // BALL LINK RESTORED', '#83efff');
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
      if (anchorsUsed === world.anchors.length && this.player.position.y > 52 && this.player.position.z < -48) {
        this.player.checkpoint.set(0, groundHeightAt(0, -82) + .1, -82);
        this.player.checkpointYaw = 0;
      }
      if (!world.fracture.active && this.player.position.z < -118) {
        this.player.checkpoint.set(0, groundHeightAt(0, -128) + .1, -128);
        this.player.checkpointYaw = 0;
      }
      if (this.missionPrerequisitesComplete() && !world.goal.open) world.openGoal();
      this.updateObjective();
    }
    updateObjective(force = false) {
      const basinAlive = this.enemies.filter(enemy => !enemy.summit && enemy.alive && enemy.type === 'scuttler').length;
      const anchorsUsed = world.anchors.filter(anchor => anchor.used).length;
      const summitAlive = this.enemies.filter(enemy => enemy.summit && enemy.alive).length;
      const inputKind = input.touchEnabled ? 'touch' : 'pointer';
      let key, label, text, stage;
      if (!this.started) {
        key = 'start'; stage = 0;
        label = 'MARE IMBRIUM // DROP ZONE';
        text = 'Wake the ball. Break the occupation.';
      } else if (basinAlive > 0) {
        const teachOrbit = basinAlive < 4 && this.stats.spins === 0;
        key = `basin-${basinAlive}-${teachOrbit ? 'orbit' : 'kick'}-${inputKind}`; stage = 1;
        label = 'LANDING CRATER // CONTACT';
        text = teachOrbit
          ? (input.touchEnabled ? 'DRAW A RIGHT-THUMB LOOP // ORBIT-SMASH THE CROWD' : 'HOLD RMB + DRAW A MOUSE LOOP // ORBIT-SMASH THE CROWD')
          : (input.touchEnabled
            ? `${basinAlive} SKITTER${basinAlive === 1 ? '' : 'S'} // RIGHT TAP KICKS // NEXT TAP CALLS`
            : `${basinAlive} SKITTER${basinAlive === 1 ? '' : 'S'} // LMB KICKS // RMB GUIDES / CALLS`);
      } else if (this.shieldEnemy.alive) {
        key = `shield-${this.shieldEnemy.hp}`; stage = 2;
        label = 'ORPHEUS GATE // CARAPACE SENTINEL';
        text = `Frontal kicks are armor food. Throw wide, guide with your aim, then tug the line through its gold back. HP ${this.shieldEnemy.hp}/${this.shieldEnemy.maxHp}.`;
      } else if (anchorsUsed < world.anchors.length) {
        key = `climb-${anchorsUsed}-${inputKind}`; stage = 3;
        label = 'ORPHEUS RIM // SIXTY-METRE ASCENT';
        text = `Kick the next cyan socket, then ${input.touchEnabled ? 'hold the right side' : 'hold RMB'} to ride the visible tether. Anchor ${anchorsUsed + 1}/${world.anchors.length}.`;
      } else if (world.fracture.active) {
        key = 'fracture'; stage = 4;
        label = 'CROWN FAULT // FRACTURE SEAM';
        text = 'The violet wall only breaks for a full-charge OUTBOUND impact. Put your whole moon into it.';
      } else if (summitAlive > 0) {
        key = `crown-${summitAlive}-${this.warden.hp}-${inputKind}`; stage = 5;
        label = 'OBSERVATORY CROWN // ALIEN WARDEN';
        text = `${summitAlive} alien${summitAlive === 1 ? '' : 's'} remain. The Warden catches frontal kicks; ${input.touchEnabled ? 'hold the right side' : 'hold RMB'} to rip the ball free.`;
      } else if (!this.won) {
        key = 'goal'; stage = 6;
        label = 'APOGEE APERTURE // OPEN';
        text = 'Send the ball through the gold orbital ring. The last throw still comes home.';
      } else {
        key = 'complete'; stage = 7;
        label = 'MOON // LIBERATED';
        text = 'The occupation is debris. The ball is already on its way back.';
      }
      this.stage = stage;
      if (!force && this.objectiveKey === key) return;
      this.objectiveKey = key;
      if (ui.objectiveLabel) ui.objectiveLabel.textContent = label;
      if (ui.objectiveText) ui.objectiveText.textContent = text;
    }
    styleRank() {
      if (this.style >= 92) return 'SS';
      if (this.style >= 72) return 'S';
      if (this.style >= 49) return 'A';
      if (this.style >= 25) return 'B';
      return 'C';
    }
    addStyle(amount, score = 0, label = null, color = '#83efff') {
      this.style = clamp(this.style + amount, 0, 100);
      this.styleHold = Math.max(this.styleHold, 1.05);
      this.score += Math.round(score);
      if (label) {
        if (ui.comboText) {
          ui.comboText.textContent = label;
          ui.comboText.style.color = color;
          ui.comboText.classList.add('active');
        }
        this.styleLabelTimer = 1.05;
      }
    }
    announce(message, color = '#83efff') {
      if (!ui.promptToast) return;
      ui.promptToast.textContent = message;
      ui.promptToast.style.color = color;
      ui.promptToast.classList.remove('hidden');
      this.toastTimer = 2.8;
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
      if (this.toastTimer > 0) {
        this.toastTimer -= dt;
        if (this.toastTimer <= 0) ui.promptToast?.classList.add('hidden');
      }
      if (this.styleLabelTimer > 0) {
        this.styleLabelTimer -= dt;
        if (this.styleLabelTimer <= 0 && ui.comboText) {
          ui.comboText.textContent = '';
          ui.comboText.classList.remove('active');
        }
      }
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
      if (speed > 1) world.ballGroup.lookAt(ball.position.clone().add(ball.velocity));
      world.update(FIXED_DT, this);
    }
    syncUI() {
      if (ui.styleFill) ui.styleFill.style.width = `${this.style}%`;
      if (ui.styleRank) ui.styleRank.textContent = this.styleRank();
      if (ui.scoreValue) ui.scoreValue.textContent = String(Math.max(0, Math.floor(this.score))).padStart(6, '0');
      if (ui.bestValue) ui.bestValue.textContent = `BEST ${this.bestTime ? formatTime(this.bestTime) : '--:--.--'}`;
      if (ui.ballState) {
        const labels = { ready: 'HOME', outbound: 'OUTBOUND', returning: 'RETURNING', anchored: 'ANCHORED', caught: 'STOLEN' };
        ui.ballState.textContent = this.lineHeld && this.ball.mode === 'outbound' ? 'GUIDED'
          : this.lineHeld && this.ball.mode === 'returning' ? 'REELING'
            : labels[this.ball.mode] || this.ball.mode.toUpperCase();
      }
      if (ui.altitudeValue) {
        const localGround = groundHeightAt(this.player.position.x, this.player.position.z);
        ui.altitudeValue.textContent = `${Math.max(0, this.player.position.y - localGround).toFixed(1).padStart(5, '0')} M`;
      }
      if (ui.shieldPips) {
        const activePips = Math.ceil(this.player.health / 2);
        const pips = [...ui.shieldPips.querySelectorAll('i')];
        pips.forEach((pip, index) => pip.classList.toggle('spent', index >= activePips));
        ui.shieldPips.setAttribute('aria-label', `Suit integrity ${this.player.health} of 5`);
      }
      if (ui.jumpPips) {
        const pips = [...ui.jumpPips.querySelectorAll('i')];
        pips.forEach((pip, index) => pip.classList.toggle('spent', index < this.player.jumpsUsed));
        ui.jumpPips.setAttribute('aria-label', `${Math.max(0, 2 - this.player.jumpsUsed)} jumps available`);
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
      if (ui.chargeText) ui.chargeText.textContent = this.charge > .96 ? 'MAXIMUM' : this.ball.mode === 'ready' ? 'CHARGE' : 'VOLLEY';
      if (ui.rightActionLabel) {
        const labels = {
          ready: this.charging ? 'HOLD CHARGE // DRAG AIM' : 'TAP KICK // HOLD CHARGE // LOOP SPIN',
          outbound: 'DRAG GUIDE // TAP CALL // HOLD LINE',
          returning: 'DRAG GUIDE // HOLD REEL',
          anchored: 'HOLD LINE // PULL',
          caught: 'HOLD LINE // RIP FREE',
        };
        ui.rightActionLabel.textContent = labels[this.ball.mode] || 'RIGHT THUMB // BALL';
      }
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
        if (anchorAim && ui.rightActionLabel) ui.rightActionLabel.textContent = 'SOCKET IN SIGHT // TAP OR HOLD KICK';
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
      const spot = spots[section] || spots.start;
      this.player.position.set(spot[0], spot[1] + .1, spot[2]);
      this.player.velocity.set(0, 0, 0);
      this.player.yaw = spot[3];
      this.player.pitch = Number.isFinite(spot[4]) ? spot[4] : -.04;
      this.player.checkpoint.copy(this.player.position);
      this.player.checkpointYaw = this.player.yaw;
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
          pausePressed: first && !!controls.pausePressed,
        };
        this.update(FIXED_DT, frame, first);
      }
      return this.getState();
    }
    getState() {
      return {
        version: GAME_VERSION,
        player: {
          x: this.player.position.x, y: this.player.position.y, z: this.player.position.z,
          vx: this.player.velocity.x, vy: this.player.velocity.y, vz: this.player.velocity.z,
          yaw: this.player.yaw, pitch: this.player.pitch, grounded: this.player.grounded,
          jumpsUsed: this.player.jumpsUsed, health: this.player.health,
          spinTimer: this.player.spinTimer, spinDirection: this.player.spinDirection,
          spinPower: this.player.spinPower, spinQueued: !!this.queuedSpin, grappling: this.player.grappling,
        },
        ball: {
          x: this.ball.position.x, y: this.ball.position.y, z: this.ball.position.z,
          vx: this.ball.velocity.x, vy: this.ball.velocity.y, vz: this.ball.velocity.z,
          mode: this.ball.mode, spin: this.ball.spin, flightTime: this.ball.flightTime, freeFlightTime: this.ball.freeFlightTime,
          returnTime: this.ball.returnTime, launchCharge: this.ball.launchCharge,
          anchored: !!this.ball.anchor, caught: !!this.ball.caughtBy,
          flightSpinTimer: this.ball.flightSpinTimer, flightSpinDirection: this.ball.flightSpinDirection,
          tetherPoints: this.ball.tetherPath.length, tetherPathLength: this.ball.tetherPathLength,
          tetherWrapId: this.ball.tetherWrapId,
        },
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
      kick: false, snap: false, line: false, jump: false, spin: false, sprint: false,
      kickPressed: false, kickReleased: false, snapPressed: false,
      linePressed: false, lineReleased: false,
      actionCancelled: false,
      jumpPressed: false, spinPressed: false, spinDirection: 0, spinPower: 1, pausePressed: false,
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
      check('touch-has-one-gameplay-button', touchButtons.length === 2 && touchButtons.includes('touchJump')
        && touchButtons.includes('touchPause') && !document.getElementById('touchKick') && !document.getElementById('touchSnap'), touchButtons);
      const touchStartHint = ui.startActionHint?.textContent;
      input.setTouchMode(false);
      const pointerStartHint = ui.startActionHint?.textContent;
      input.setTouchMode(true);
      check('start-copy-matches-current-input', touchStartHint === 'TAP TO ENTER'
        && pointerStartHint === 'CLICK TO LOCK VIEW', { touchStartHint, pointerStartHint });

      game.restart();
      game.updateObjective(true);
      const touchKickObjective = ui.objectiveText?.textContent || '';
      const orbitGuideTarget = game.enemies.find(enemy => !enemy.summit && enemy.type === 'scuttler' && enemy.alive);
      orbitGuideTarget.alive = false;
      orbitGuideTarget.visual.group.visible = false;
      game.updateObjective(true);
      const touchOrbitObjective = ui.objectiveText?.textContent || '';
      input.setTouchMode(false);
      game.updateObjective(true);
      const pointerOrbitObjective = ui.objectiveText?.textContent || '';
      check('objectives-teach-device-controls-and-orbit-purpose', touchKickObjective.includes('RIGHT TAP KICKS')
        && touchOrbitObjective.includes('RIGHT-THUMB LOOP') && touchOrbitObjective.includes('ORBIT-SMASH')
        && pointerOrbitObjective.includes('HOLD RMB + DRAW A MOUSE LOOP') && pointerOrbitObjective.includes('ORBIT-SMASH'), {
        touchKickObjective, touchOrbitObjective, pointerOrbitObjective,
      });
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
      game.player.position.set(wrapPlatform.x - wrapRadius - 9, wrapPlatform.top - game.player.eyeHeight - 2, wrapPlatform.z);
      game.player.yaw = Math.PI / 2;
      game.player.pitch = 0;
      game.updateCamera(FIXED_DT);
      game.ball.position.set(wrapPlatform.x + wrapRadius + 9, wrapPlatform.top - 2, wrapPlatform.z);
      game.ball.velocity.set(32, 0, 0);
      const wrappedPath = game.buildTetherPath(true).map(point => point.clone());
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
        minimumPillarClearance = Math.min(minimumPillarClearance,
          Math.hypot(game.ball.position.x - wrapPlatform.x, game.ball.position.z - wrapPlatform.z));
      }
      const physicalPillarRadius = wrapPlatform.radius * 1.03 + game.ball.radius;
      check('wrapped-return-follows-path-home-without-cutting-cliff', sawWrappedReturn
        && game.ball.mode === 'ready' && maxWrappedStuck < 1.05
        && minimumPillarClearance >= physicalPillarRadius - .03, {
        sawWrappedReturn, mode: game.ball.mode, maxWrappedStuck, minimumPillarClearance,
        physicalPillarRadius, wrappedReturnTicks,
      });

      game.player.position.y = wrapPlatform.top + 1.5;
      game.updateCamera(FIXED_DT);
      game.ball.position.set(wrapPlatform.x + wrapRadius + 9, wrapPlatform.top + 3.2, wrapPlatform.z);
      game.ball.velocity.set(32, 0, 0);
      const overCliffPath = game.buildTetherPath(true);
      check('energy-line-clears-over-cliff-cap', overCliffPath.length === 2 && game.ball.tetherWrapId === null, {
        points: overCliffPath.length, wrapId: game.ball.tetherWrapId,
      });

      const gate = world.gate;
      game.player.position.set(0, gate.position.y - game.player.eyeHeight, gate.position.z + 18);
      game.player.yaw = 0;
      game.player.pitch = 0;
      game.updateCamera(FIXED_DT);
      game.ball.position.set(0, gate.position.y, gate.position.z - 18);
      game.ball.velocity.set(0, 0, -30);
      const gateWrapPath = game.buildTetherPath(true).map(point => point.clone());
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
      check('held-energy-line-strengthens-reticle-guidance', linkedGuide.mode === 'outbound'
        && freeGuide.mode === 'outbound' && linkedGuide.aimDot > freeGuide.aimDot + .025, { freeGuide, linkedGuide });

      game.restart();
      game.started = true;
      game.updateCamera(FIXED_DT);
      game.launchBall(.8);
      game.stepWith(.72, { line: true, linePressed: true });
      check('held-energy-line-does-not-force-recall', game.ball.mode === 'outbound' && game.lineHeld, {
        mode: game.ball.mode, lineHeld: game.lineHeld, freeFlightTime: game.ball.freeFlightTime,
      });

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
          vy: game.ball.velocity.y,
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

      game.restart();
      game.started = true;
      world.anchors.forEach(item => { item.used = true; });
      game.ball.mode = 'outbound';
      game.ball.launchCharge = 1;
      game.ball.position.copy(world.fracture.position).add(new T.Vector3(0, 0, 1.7));
      game.ball.velocity.set(0, 0, -44);
      game.resolveBallWorld(game.ball.position.clone().add(new T.Vector3(0, 0, 3)));
      check('outbound-fracture-only', !world.fracture.active, { active: world.fracture.active, breaks: game.stats.breaks });

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
      game.player.position.copy(padTest.position);
      game.player.velocity.set(0, 0, 0);
      game.player.grounded = true;
      game.stepWith(FIXED_DT, {});
      check('launch-pad-restores-air-play', game.player.velocity.y >= padTest.impulse - .1 && game.player.jumpsUsed === 0 && !game.player.grounded, {
        velocityY: game.player.velocity.y, impulse: padTest.impulse, jumpsUsed: game.player.jumpsUsed, grounded: game.player.grounded,
      });

      game.restart();
      game.started = true;
      game.teleport('start');
      game.stepWith(1, {});
      const restartTraceA = game.enemies.map(enemy => [enemy.position.x, enemy.position.y, enemy.position.z]);
      game.cameraYawVelocity = 99;
      game.cameraRoll = .8;
      game.toastTimer = 4;
      game.restart();
      const resetFeedback = game.cameraYawVelocity === 0 && game.cameraRoll === 0 && game.toastTimer === 0;
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
    getState: () => game.getState(),
    getRenderStats: () => world.stats(),
    restart: () => game.restart(),
    start: () => game.start(false),
    teleport: section => game.teleport(section),
    stepWith: (seconds, controls) => game.stepWith(seconds, controls),
    step: seconds => game.stepWith(seconds, {}),
    runSmoke: () => runAutotest(),
    setQuality: level => {
      const normalized = String(level || '').toUpperCase();
      if (!world.qualityOrder.includes(normalized)) throw new Error(`Unknown quality ${level}`);
      world.applyQuality(normalized);
      return world.stats();
    },
    setPlayer(x, y, z) {
      game.player.position.set(finite(Number(x)), finite(Number(y)), finite(Number(z)));
      game.player.velocity.set(0, 0, 0);
      game.player.grounded = false;
      return game.getState();
    },
    setBall(x, y, z, vx = 0, vy = 0, vz = 0, mode = 'outbound') {
      if (!['ready', 'outbound', 'returning', 'anchored', 'caught'].includes(mode)) throw new Error(`Unknown ball mode ${mode}`);
      game.ball.position.set(finite(Number(x)), finite(Number(y)), finite(Number(z)));
      game.ball.velocity.set(finite(Number(vx)), finite(Number(vy)), finite(Number(vz)));
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
