// Hysteretic frame-time governor for Three.js r161.
//
// The governor deliberately knows very little about the game. It owns the
// renderer/composer pixel ratio and emits a small quality preset; the game owns
// the meaning of that preset (shadow distance, foliage density, particles,
// expensive post passes, and so on). Feed it requestAnimationFrame timestamps
// with frame(), or call start() to let it sample the browser's rAF cadence.

const DEFAULT_LEVELS = Object.freeze([
  Object.freeze({ name: 'low', particleScale: 0.5, foliageScale: 0.5, shadowScale: 0.55, postScale: 0.6 }),
  Object.freeze({ name: 'medium', particleScale: 0.7, foliageScale: 0.7, shadowScale: 0.72, postScale: 0.78 }),
  Object.freeze({ name: 'high', particleScale: 0.86, foliageScale: 0.86, shadowScale: 0.88, postScale: 0.9 }),
  Object.freeze({ name: 'ultra', particleScale: 1, foliageScale: 1, shadowScale: 1, postScale: 1 }),
]);

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const rounded = (value, places = 2) => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

function defaultDeviceDpr() {
  return typeof window === 'undefined' ? 1 : Math.max(0.25, window.devicePixelRatio || 1);
}

function qualityIndex(levels, requested) {
  if (Number.isInteger(requested)) return clamp(requested, 0, levels.length - 1);
  if (typeof requested === 'string') {
    const index = levels.findIndex((level) => level.name === requested.toLowerCase());
    if (index >= 0) return index;
  }
  return levels.length - 1;
}

function percentile90(samples) {
  if (!samples.length) return 0;
  const ordered = samples.slice().sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * 0.9) - 1)];
}

/**
 * Dynamic-resolution and coarse-quality governor.
 *
 * Three.js integration requirements:
 * - renderer must expose setPixelRatio() and setSize().
 * - resizeTargets may contain an EffectComposer, or a wrapper with both a
 *   .composer and a .setSize() method (the current post stack has this shape).
 * - onQualityChange applies the emitted preset to game-owned systems.
 */
export class PerformanceGovernor {
  constructor({
    renderer,
    resizeTargets = [],
    getViewport,
    onQualityChange,
    onResolutionChange,
    levels = DEFAULT_LEVELS,
    initialQuality = 'ultra',
    targetFps = 60,
    minDpr = 0.65,
    maxDpr = Math.min(defaultDeviceDpr(), 1.75),
    deviceDpr = defaultDeviceDpr(),
    resolutionStep = 0.08,
    sampleWindow = 120,
    minimumSamples = 36,
    degradeAfterMs = 1800,
    recoverAfterMs = 12000,
    degradeCooldownMs = 2600,
    recoverCooldownMs = 8000,
    autoStart = false,
    enabled = true,
  } = {}) {
    if (!renderer || typeof renderer.setPixelRatio !== 'function' || typeof renderer.setSize !== 'function') {
      throw new TypeError('PerformanceGovernor requires a Three.js renderer with setPixelRatio() and setSize().');
    }
    if (!Array.isArray(levels) || levels.length === 0) {
      throw new TypeError('PerformanceGovernor requires at least one quality level.');
    }

    this.renderer = renderer;
    this.resizeTargets = Array.from(new Set(resizeTargets.filter(Boolean)));
    this.getViewport = typeof getViewport === 'function' ? getViewport : () => {
      const canvas = this.renderer.domElement;
      const width = (canvas && canvas.clientWidth) || (typeof window !== 'undefined' && window.innerWidth) || 1;
      const height = (canvas && canvas.clientHeight) || (typeof window !== 'undefined' && window.innerHeight) || 1;
      return { width, height };
    };
    this.onQualityChange = typeof onQualityChange === 'function' ? onQualityChange : null;
    this.onResolutionChange = typeof onResolutionChange === 'function' ? onResolutionChange : null;

    this.levels = levels.map((level, index) => Object.freeze({
      ...level,
      name: String(level.name || `level-${index}`),
    }));
    this.targetFps = clamp(Number(targetFps) || 60, 24, 240);
    this.targetMs = 1000 / this.targetFps;
    this.deviceDpr = Math.max(0.25, Number(deviceDpr) || 1);
    const requestedMin = Math.max(0.25, Number(minDpr) || 0.65);
    const requestedMax = Math.max(0.25, Number(maxDpr) || this.deviceDpr);
    this.minDpr = Math.min(requestedMin, requestedMax);
    this.maxDpr = Math.max(requestedMin, requestedMax);
    this.resolutionStep = clamp(Number(resolutionStep) || 0.08, 0.02, 0.25);
    this.sampleWindow = Math.round(clamp(Number(sampleWindow) || 120, 30, 600));
    this.minimumSamples = Math.round(clamp(Number(minimumSamples) || 36, 12, this.sampleWindow));
    this.degradeAfterMs = Math.max(500, Number(degradeAfterMs) || 1800);
    this.recoverAfterMs = Math.max(4000, Number(recoverAfterMs) || 12000);
    this.degradeCooldownMs = Math.max(1000, Number(degradeCooldownMs) || 2600);
    this.recoverCooldownMs = Math.max(3000, Number(recoverCooldownMs) || 8000);
    this.enabled = Boolean(enabled);

    this.qualityIndex = qualityIndex(this.levels, initialQuality);
    this.resolutionScale = this._resolutionCeiling();
    this._lastAdaptiveAxis = 'quality'; // first pressure response lowers resolution
    this._manualLock = null;
    this._running = false;
    this._rafId = 0;
    this._lastNow = null;
    this._samples = [];
    this._sampleSum = 0;
    this._emaMs = 0;
    this._slowBudgetMs = 0;
    this._recoveryBudgetMs = 0;
    this._cooldownUntil = 0;
    this._lastAdjustment = null;
    this._width = 1;
    this._height = 1;
    this._lastAppliedDpr = null;
    this._lastAppliedQuality = null;
    this._boundRaf = (now) => {
      if (!this._running) return;
      this.frame(now);
      this._rafId = requestAnimationFrame(this._boundRaf);
    };
    this._boundVisibility = () => this.resetTiming('visibility');

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._boundVisibility, { passive: true });
    }

    this.resize();
    if (autoStart) this.start();
  }

  get quality() {
    return this.levels[this.qualityIndex];
  }

  get dpr() {
    if (this._manualLock && Number.isFinite(this._manualLock.dpr)) return this._manualLock.dpr;
    return clamp(this.deviceDpr * this.resolutionScale, this.minDpr, this.maxDpr);
  }

  _resolutionFloor() {
    return clamp(this.minDpr / this.deviceDpr, 0.25, 1);
  }

  _resolutionCeiling() {
    return clamp(this.maxDpr / this.deviceDpr, this._resolutionFloor(), 1);
  }

  start() {
    if (this._running) return this;
    if (typeof requestAnimationFrame !== 'function') {
      throw new Error('PerformanceGovernor.start() requires requestAnimationFrame; call frame(timestamp) manually outside a browser.');
    }
    this._running = true;
    this.resetTiming('start');
    this._rafId = requestAnimationFrame(this._boundRaf);
    return this;
  }

  stop() {
    this._running = false;
    if (this._rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._rafId);
    this._rafId = 0;
    return this;
  }

  /** Feed exactly one requestAnimationFrame timestamp per rendered frame. */
  frame(now) {
    if (!Number.isFinite(now)) return this.debugSnapshot();
    if (typeof document !== 'undefined' && document.hidden) {
      this._lastNow = now;
      return this.debugSnapshot(now);
    }
    if (this._lastNow === null) {
      this._lastNow = now;
      return this.debugSnapshot(now);
    }

    const elapsed = now - this._lastNow;
    this._lastNow = now;
    // A hidden/background tab, debugger pause, or clock discontinuity must not
    // punish quality. Real gameplay hitches below this ceiling still count.
    if (!(elapsed > 0) || elapsed > 250) {
      this._slowBudgetMs = 0;
      this._recoveryBudgetMs = 0;
      return this.debugSnapshot(now);
    }

    this._samples.push(elapsed);
    this._sampleSum += elapsed;
    if (this._samples.length > this.sampleWindow) this._sampleSum -= this._samples.shift();
    this._emaMs = this._emaMs === 0 ? elapsed : this._emaMs + (elapsed - this._emaMs) * 0.075;

    if (this._samples.length < this.minimumSamples || !this.enabled || this._manualLock) {
      return this.debugSnapshot(now);
    }

    const mean = this._sampleSum / this._samples.length;
    const p90 = percentile90(this._samples);
    const slow = this._emaMs > this.targetMs * 1.16 || mean > this.targetMs * 1.14 || p90 > this.targetMs * 1.42;
    // At a healthy 60 Hz VSync, 16.67 ms needs to count as headroom; recovery
    // gets its safety from the long dwell and cooldown, not an impossible 70 fps.
    const healthy = this._emaMs <= this.targetMs * 1.04 && mean <= this.targetMs * 1.04 && p90 <= this.targetMs * 1.15;

    this._slowBudgetMs = slow ? this._slowBudgetMs + elapsed : Math.max(0, this._slowBudgetMs - elapsed * 0.8);
    this._recoveryBudgetMs = healthy ? this._recoveryBudgetMs + elapsed : Math.max(0, this._recoveryBudgetMs - elapsed * 1.5);

    if (now < this._cooldownUntil) return this.debugSnapshot(now);
    if (this._slowBudgetMs >= this.degradeAfterMs) {
      if (this._adjust(-1, now)) this._cooldownUntil = now + this.degradeCooldownMs;
      this._slowBudgetMs = 0;
      this._recoveryBudgetMs = 0;
    } else if (this._recoveryBudgetMs >= this.recoverAfterMs) {
      if (this._adjust(1, now)) this._cooldownUntil = now + this.recoverCooldownMs;
      this._slowBudgetMs = 0;
      this._recoveryBudgetMs = 0;
    }
    return this.debugSnapshot(now);
  }

  _adjust(direction, now) {
    const floor = this._resolutionFloor();
    const ceiling = this._resolutionCeiling();
    const canLowerResolution = this.resolutionScale > floor + 0.001;
    const canLowerQuality = this.qualityIndex > 0;
    const canRaiseResolution = this.resolutionScale < ceiling - 0.001;
    const canRaiseQuality = this.qualityIndex < this.levels.length - 1;
    let axis = null;

    if (direction < 0) {
      if (canLowerResolution && (this._lastAdaptiveAxis !== 'resolution' || !canLowerQuality)) {
        this.resolutionScale = Math.max(floor, this.resolutionScale - this.resolutionStep);
        axis = 'resolution';
      } else if (canLowerQuality) {
        this.qualityIndex -= 1;
        axis = 'quality';
      } else if (canLowerResolution) {
        this.resolutionScale = Math.max(floor, this.resolutionScale - this.resolutionStep);
        axis = 'resolution';
      }
    } else if (canRaiseResolution && (this._lastAdaptiveAxis !== 'resolution' || !canRaiseQuality)) {
      this.resolutionScale = Math.min(ceiling, this.resolutionScale + this.resolutionStep);
      axis = 'resolution';
    } else if (canRaiseQuality) {
      this.qualityIndex += 1;
      axis = 'quality';
    } else if (canRaiseResolution) {
      this.resolutionScale = Math.min(ceiling, this.resolutionScale + this.resolutionStep);
      axis = 'resolution';
    }

    if (!axis) return false;
    this._lastAdaptiveAxis = axis;
    this._lastAdjustment = Object.freeze({
      direction: direction < 0 ? 'degrade' : 'recover',
      axis,
      atMs: rounded(now, 2),
    });
    this._apply(this._lastAdjustment.direction);
    return true;
  }

  /** Freeze adaptation at the current state, or apply an explicit lock. */
  lock({ dpr = this.dpr, quality = this.qualityIndex } = {}) {
    const lockedDpr = clamp(Number(dpr) || this.dpr, this.minDpr, this.maxDpr);
    this.qualityIndex = qualityIndex(this.levels, quality);
    this.resolutionScale = clamp(lockedDpr / this.deviceDpr, this._resolutionFloor(), this._resolutionCeiling());
    this._manualLock = Object.freeze({ dpr: lockedDpr, qualityIndex: this.qualityIndex });
    this.resetTiming('manual-lock');
    this._apply('manual-lock');
    return this.debugSnapshot();
  }

  /** Resume adaptation from the locked visual state. */
  unlock() {
    if (this._manualLock) {
      this.resolutionScale = clamp(this._manualLock.dpr / this.deviceDpr, this._resolutionFloor(), this._resolutionCeiling());
      this.qualityIndex = this._manualLock.qualityIndex;
    }
    this._manualLock = null;
    this.resetTiming('manual-unlock');
    this._apply('manual-unlock');
    return this.debugSnapshot();
  }

  setManualLock(value) {
    if (value === false || value === null) return this.unlock();
    if (value === true || value === undefined) return this.lock();
    return this.lock(value);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.resetTiming(this.enabled ? 'enabled' : 'disabled');
    return this.debugSnapshot();
  }

  /** Reapply renderer/composer sizes after a CSS viewport change. */
  resize(width, height, deviceDpr = this.deviceDpr) {
    if (Number.isFinite(deviceDpr)) {
      const previousDpr = this.dpr;
      this.deviceDpr = Math.max(0.25, deviceDpr);
      this.resolutionScale = clamp(previousDpr / this.deviceDpr, this._resolutionFloor(), this._resolutionCeiling());
    }
    const viewport = (!Number.isFinite(width) || !Number.isFinite(height)) ? this.getViewport() : { width, height };
    this._width = Math.max(1, Math.round(Number(viewport.width) || 1));
    this._height = Math.max(1, Math.round(Number(viewport.height) || 1));
    this._apply('resize');
    return this.debugSnapshot();
  }

  resetTiming(reason = 'reset') {
    this._lastNow = null;
    this._samples.length = 0;
    this._sampleSum = 0;
    this._emaMs = 0;
    this._slowBudgetMs = 0;
    this._recoveryBudgetMs = 0;
    this._cooldownUntil = 0;
    this._lastResetReason = reason;
    return this;
  }

  _apply(reason) {
    const dpr = this.dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this._width, this._height, false);

    for (const target of this.resizeTargets) {
      const pixelRatioTarget = target.composer || target;
      if (pixelRatioTarget !== this.renderer && typeof pixelRatioTarget.setPixelRatio === 'function') {
        pixelRatioTarget.setPixelRatio(dpr);
      }
      if (target !== this.renderer && typeof target.setSize === 'function') {
        target.setSize(this._width, this._height);
      }
    }

    if (this._lastAppliedQuality !== this.qualityIndex && this.onQualityChange) {
      this.onQualityChange(Object.freeze({
        index: this.qualityIndex,
        preset: this.quality,
        reason,
      }));
    }
    if (this._lastAppliedDpr !== dpr && this.onResolutionChange) {
      this.onResolutionChange(Object.freeze({
        dpr,
        scale: this.resolutionScale,
        width: this._width,
        height: this._height,
        reason,
      }));
    }
    this._lastAppliedQuality = this.qualityIndex;
    this._lastAppliedDpr = dpr;
  }

  /** Stable, JSON-safe diagnostics. No wall-clock reads occur here. */
  debugSnapshot(now = this._lastNow || 0) {
    const mean = this._samples.length ? this._sampleSum / this._samples.length : 0;
    return {
      version: 1,
      running: this._running,
      adaptiveEnabled: this.enabled,
      manualLock: Boolean(this._manualLock),
      visibility: typeof document === 'undefined' ? 'unknown' : document.visibilityState,
      targetFps: this.targetFps,
      qualityIndex: this.qualityIndex,
      qualityName: this.quality.name,
      dpr: rounded(this.dpr, 3),
      resolutionScale: rounded(this.resolutionScale, 3),
      minDpr: rounded(this.minDpr, 3),
      maxDpr: rounded(this.maxDpr, 3),
      viewport: { width: this._width, height: this._height },
      sampleCount: this._samples.length,
      meanMs: rounded(mean, 2),
      emaMs: rounded(this._emaMs, 2),
      p90Ms: rounded(percentile90(this._samples), 2),
      slowBudgetMs: rounded(this._slowBudgetMs, 1),
      recoveryBudgetMs: rounded(this._recoveryBudgetMs, 1),
      cooldownRemainingMs: rounded(Math.max(0, this._cooldownUntil - (Number(now) || 0)), 1),
      lastAdjustment: this._lastAdjustment,
      lastResetReason: this._lastResetReason || 'constructor',
    };
  }

  dispose() {
    this.stop();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this._boundVisibility);
  }
}

export const PERFORMANCE_QUALITY_LEVELS = DEFAULT_LEVELS;

export function createPerformanceGovernor(options) {
  return new PerformanceGovernor(options);
}
