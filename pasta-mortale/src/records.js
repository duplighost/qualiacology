const STORAGE_KEY = "pasta-mortale.records.v1";
const VERSION = 1;
const GRADE_ORDER = Object.freeze({ D: 0, C: 1, B: 2, A: 3, S: 4 });

function finite(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function emptyRecords() {
  return {
    version: VERSION,
    runs: 0,
    victories: 0,
    highScore: 0,
    bestTimeMs: null,
    bestGrade: "D",
    lastRun: null
  };
}

function sanitizeLastRun(value) {
  if (!value || typeof value !== "object") return null;
  return {
    result: ["victory", "defeated", "drowned"].includes(value.result) ? value.result : "defeated",
    score: Math.max(0, Math.floor(finite(value.score))),
    timeMs: Math.max(0, Math.floor(finite(value.timeMs))),
    grade: Object.hasOwn(GRADE_ORDER, value.grade) ? value.grade : "D",
    accuracy: clamp(finite(value.accuracy), 0, 100),
    kills: Math.max(0, Math.floor(finite(value.kills))),
    recordedAt: typeof value.recordedAt === "string" ? value.recordedAt : null
  };
}

export function sanitizePastaRecords(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const bestGrade = Object.hasOwn(GRADE_ORDER, source.bestGrade) ? source.bestGrade : "D";
  const bestTime = source.bestTimeMs == null ? null : Math.max(0, Math.floor(finite(source.bestTimeMs)));
  return {
    version: VERSION,
    runs: Math.max(0, Math.floor(finite(source.runs))),
    victories: Math.max(0, Math.floor(finite(source.victories))),
    highScore: Math.max(0, Math.floor(finite(source.highScore))),
    bestTimeMs: bestTime,
    bestGrade,
    lastRun: sanitizeLastRun(source.lastRun)
  };
}

export function loadPastaRecords(storage) {
  const target = resolveStorage(storage);
  try {
    const raw = target?.getItem?.(STORAGE_KEY);
    return raw ? sanitizePastaRecords(JSON.parse(raw)) : emptyRecords();
  } catch {
    return emptyRecords();
  }
}

export function gradePastaRun(run = {}) {
  const result = String(run.result || "defeated");
  const accuracy = clamp(finite(run.accuracy), 0, 100);
  const seconds = Math.max(0, finite(run.timeMs) / 1000);
  const kills = Math.max(0, finite(run.kills));
  if (result !== "victory") return kills >= 10 && accuracy >= 42 ? "B" : kills >= 4 ? "C" : "D";

  const healthRatio = clamp(finite(run.healthRatio, 0.5), 0, 1);
  const headshotRatio = clamp(finite(run.headshotRatio), 0, 1);
  const speed = clamp((720 - seconds) / 480, 0, 1);
  const score = 40 + accuracy * 0.24 + speed * 20 + healthRatio * 11 + headshotRatio * 5;
  if (score >= 86) return "S";
  if (score >= 74) return "A";
  if (score >= 62) return "B";
  return "C";
}

export function recordPastaRun(run = {}, storage) {
  const target = resolveStorage(storage);
  const before = loadPastaRecords(target);
  const normalized = {
    result: ["victory", "defeated", "drowned"].includes(run.result) ? run.result : "defeated",
    score: Math.max(0, Math.floor(finite(run.score))),
    timeMs: Math.max(0, Math.floor(finite(run.timeMs))),
    accuracy: clamp(finite(run.accuracy), 0, 100),
    kills: Math.max(0, Math.floor(finite(run.kills))),
    healthRatio: clamp(finite(run.healthRatio, 0.5), 0, 1),
    headshotRatio: clamp(finite(run.headshotRatio), 0, 1)
  };
  const grade = gradePastaRun(normalized);
  const victory = normalized.result === "victory";
  const newHighScore = normalized.score > before.highScore;
  const newBestTime = victory && (before.bestTimeMs == null || normalized.timeMs < before.bestTimeMs);
  const newBestGrade = GRADE_ORDER[grade] > GRADE_ORDER[before.bestGrade];
  const after = sanitizePastaRecords({
    ...before,
    runs: before.runs + 1,
    victories: before.victories + (victory ? 1 : 0),
    highScore: Math.max(before.highScore, normalized.score),
    bestTimeMs: newBestTime ? normalized.timeMs : before.bestTimeMs,
    bestGrade: newBestGrade ? grade : before.bestGrade,
    lastRun: {
      ...normalized,
      grade,
      recordedAt: new Date().toISOString()
    }
  });
  try {
    target?.setItem?.(STORAGE_KEY, JSON.stringify(after));
  } catch {
    // A service record is a bonus. Storage denial must never block the ending.
  }
  return { before, records: after, grade, newHighScore, newBestTime, newBestGrade };
}

export function resetPastaRecords(storage) {
  const target = resolveStorage(storage);
  try {
    target?.removeItem?.(STORAGE_KEY);
  } catch {
    // Return clean in-memory state even when storage is unavailable.
  }
  return emptyRecords();
}

export const PASTA_RECORDS_STORAGE_KEY = STORAGE_KEY;
