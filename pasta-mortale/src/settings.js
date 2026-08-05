const STORAGE_KEY = "pasta-mortale.settings.v1";
const SETTINGS_VERSION = 1;

export const DEFAULT_PASTA_SETTINGS = Object.freeze({
  version: SETTINGS_VERSION,
  quality: "auto",
  renderScale: 1,
  sensitivity: 1,
  invertY: false,
  fov: 66,
  masterVolume: 0.78,
  muted: false,
  cameraMotion: 1,
  lensIntensity: 1,
  reticleScale: 1,
  hudScale: 1,
  highContrast: false,
  reducedMotion: "auto"
});

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function clamp(value, minimum, maximum, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(maximum, Math.max(minimum, numeric)) : fallback;
}

function boolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function choice(value, allowed, fallback) {
  const normalized = String(value || "").toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

export function sanitizePastaSettings(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    version: SETTINGS_VERSION,
    quality: choice(source.quality, ["auto", "medium", "high", "low"], DEFAULT_PASTA_SETTINGS.quality),
    renderScale: clamp(source.renderScale, 0.7, 1, DEFAULT_PASTA_SETTINGS.renderScale),
    sensitivity: clamp(source.sensitivity, 0.35, 1.8, DEFAULT_PASTA_SETTINGS.sensitivity),
    invertY: boolean(source.invertY, DEFAULT_PASTA_SETTINGS.invertY),
    fov: clamp(source.fov, 58, 85, DEFAULT_PASTA_SETTINGS.fov),
    masterVolume: clamp(source.masterVolume, 0, 1, DEFAULT_PASTA_SETTINGS.masterVolume),
    muted: boolean(source.muted, DEFAULT_PASTA_SETTINGS.muted),
    cameraMotion: clamp(source.cameraMotion, 0, 1, DEFAULT_PASTA_SETTINGS.cameraMotion),
    lensIntensity: clamp(source.lensIntensity, 0, 1, DEFAULT_PASTA_SETTINGS.lensIntensity),
    reticleScale: clamp(source.reticleScale, 0.8, 1.4, DEFAULT_PASTA_SETTINGS.reticleScale),
    hudScale: clamp(source.hudScale, 0.85, 1.2, DEFAULT_PASTA_SETTINGS.hudScale),
    highContrast: boolean(source.highContrast, DEFAULT_PASTA_SETTINGS.highContrast),
    reducedMotion: choice(source.reducedMotion, ["auto", "on", "off"], DEFAULT_PASTA_SETTINGS.reducedMotion)
  };
}

export function loadPastaSettings(storage) {
  const target = resolveStorage(storage);
  try {
    const raw = target?.getItem?.(STORAGE_KEY);
    if (!raw) return sanitizePastaSettings(DEFAULT_PASTA_SETTINGS);
    const parsed = JSON.parse(raw);
    if (!parsed || Number(parsed.version) !== SETTINGS_VERSION) return sanitizePastaSettings(parsed);
    return sanitizePastaSettings(parsed);
  } catch {
    return sanitizePastaSettings(DEFAULT_PASTA_SETTINGS);
  }
}

export function savePastaSettings(value, storage) {
  const settings = sanitizePastaSettings(value);
  const target = resolveStorage(storage);
  try {
    target?.setItem?.(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Settings are optional. Private-mode and quota failures must never block play.
  }
  return settings;
}

export function resetPastaSettings(storage) {
  const target = resolveStorage(storage);
  try {
    target?.removeItem?.(STORAGE_KEY);
  } catch {
    // Keep the in-memory defaults even if storage is unavailable.
  }
  return sanitizePastaSettings(DEFAULT_PASTA_SETTINGS);
}

export function resolvePastaQuality(settings, mobileLike = false, queryValue = "") {
  const query = choice(queryValue, ["high", "medium", "low"], "");
  if (query) return query;
  const selected = choice(settings?.quality, ["auto", "medium", "high", "low"], "auto");
  return selected === "auto" ? (mobileLike ? "low" : "medium") : selected;
}

export function reducedMotionEnabled(settings, mediaQuery = null) {
  const selected = choice(settings?.reducedMotion, ["auto", "on", "off"], "auto");
  if (selected === "on") return true;
  if (selected === "off") return false;
  return Boolean(mediaQuery?.matches ?? globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

export const PASTA_SETTINGS_STORAGE_KEY = STORAGE_KEY;
