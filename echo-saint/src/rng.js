/**
 * Small deterministic random toolkit for ECHO//SAINT.
 *
 * Gameplay should own one stream and cosmetics another (via `fork`) so adding
 * a spark or screen mote can never change a boss pattern. All methods are
 * dependency-free and work in browsers and Node.
 */

const UINT32_RANGE = 0x100000000;
const DEFAULT_SEED = 0xec405a17;

/** FNV-1a hash with an extra avalanche, returned as an unsigned 32-bit value. */
export function hashString(value) {
  const text = String(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** Convert strings, numbers, and bigints into a stable unsigned 32-bit seed. */
export function normalizeSeed(seed = DEFAULT_SEED) {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return Math.trunc(seed) >>> 0;
  }

  if (typeof seed === "bigint") {
    return Number(seed & 0xffffffffn) >>> 0;
  }

  if (seed === undefined || seed === null || seed === "") {
    return DEFAULT_SEED;
  }

  return hashString(seed);
}

/** Deterministically combine a root seed with any number of stream labels. */
export function mixSeed(seed, ...parts) {
  let mixed = normalizeSeed(seed);

  for (const part of parts) {
    const value = normalizeSeed(part);
    mixed ^= value + 0x9e3779b9 + ((mixed << 6) >>> 0) + (mixed >>> 2);
    mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad);
    mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
    mixed ^= mixed >>> 15;
  }

  return mixed >>> 0;
}

/** A best-effort non-deterministic seed for beginning a new run. */
export function randomSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const words = new Uint32Array(1);
    globalThis.crypto.getRandomValues(words);
    return words[0] >>> 0;
  }

  const clock = Date.now() >>> 0;
  const fineClock = Math.floor((globalThis.performance?.now?.() ?? 0) * 1000);
  return mixSeed(clock, fineClock, Math.floor(Math.random() * UINT32_RANGE));
}

/**
 * Standalone weighted selection. Items may expose a numeric `weight`, or a
 * custom accessor may be supplied. Zero/negative/non-finite weights are
 * ignored. Returns undefined for an empty or entirely weightless list.
 */
export function weightedPick(items, random = Math.random, getWeight = (item) => item?.weight ?? 1) {
  if (!Array.isArray(items) || items.length === 0) return undefined;

  let total = 0;
  const weights = items.map((item, index) => {
    const weight = Number(getWeight(item, index));
    const safeWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
    total += safeWeight;
    return safeWeight;
  });

  if (total <= 0) return undefined;
  let cursor = Math.min(0.9999999999999999, Math.max(0, random())) * total;

  for (let index = 0; index < items.length; index += 1) {
    cursor -= weights[index];
    if (cursor < 0) return items[index];
  }

  return items[items.length - 1];
}

export class SeededRng {
  constructor(seed = DEFAULT_SEED) {
    this.initialSeed = normalizeSeed(seed);
    this.state = this.initialSeed;
  }

  /** Mulberry32: one repeatable float in [0, 1). */
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  }

  random() {
    return this.next();
  }

  /** Float in [min, max). With one argument, returns [0, min). */
  float(min = 0, max = 1) {
    if (arguments.length === 1) {
      max = min;
      min = 0;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new TypeError("RNG.float bounds must be finite numbers");
    }
    if (max < min) [min, max] = [max, min];
    return min + (max - min) * this.next();
  }

  range(min = 0, max = 1) {
    return this.float(min, max);
  }

  /** Inclusive integer range. With one argument, returns an integer in [0, max]. */
  int(min = 0, max = min) {
    if (arguments.length === 1) min = 0;
    min = Math.ceil(Number(min));
    max = Math.floor(Number(max));
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new TypeError("RNG.int bounds must be finite numbers");
    }
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability = 0.5) {
    const chance = Number(probability);
    if (!Number.isFinite(chance)) return false;
    return this.next() < Math.min(1, Math.max(0, chance));
  }

  bool(probability = 0.5) {
    return this.chance(probability);
  }

  sign() {
    return this.chance() ? 1 : -1;
  }

  pick(items) {
    if (!Array.isArray(items) || items.length === 0) return undefined;
    return items[Math.floor(this.next() * items.length)];
  }

  weighted(items, getWeight = (item) => item?.weight ?? 1) {
    return weightedPick(items, () => this.next(), getWeight);
  }

  /** Return a shuffled copy, leaving authored content arrays untouched. */
  shuffle(items) {
    if (!Array.isArray(items)) throw new TypeError("RNG.shuffle expects an array");
    return this.shuffleInPlace([...items]);
  }

  shuffleInPlace(items) {
    if (!Array.isArray(items)) throw new TypeError("RNG.shuffleInPlace expects an array");
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = this.int(0, index);
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }

  /** Choose up to `count` unique items without changing the source array. */
  sample(items, count = 1) {
    if (!Array.isArray(items)) throw new TypeError("RNG.sample expects an array");
    const amount = Math.max(0, Math.min(items.length, Math.floor(count)));
    return this.shuffle(items).slice(0, amount);
  }

  /**
   * Produce an order-independent child stream. The same root seed and label
   * always yield the same sequence, regardless of how far the parent advanced.
   */
  fork(label) {
    return new SeededRng(mixSeed(this.initialSeed, label));
  }

  snapshot() {
    return { initialSeed: this.initialSeed >>> 0, state: this.state >>> 0 };
  }

  restore(snapshot) {
    if (typeof snapshot === "number" || typeof snapshot === "bigint" || typeof snapshot === "string") {
      const seed = normalizeSeed(snapshot);
      this.initialSeed = seed;
      this.state = seed;
      return this;
    }

    if (!snapshot || !Number.isFinite(snapshot.state)) {
      throw new TypeError("RNG.restore expects a snapshot or seed");
    }

    this.initialSeed = normalizeSeed(snapshot.initialSeed ?? this.initialSeed);
    this.state = normalizeSeed(snapshot.state);
    return this;
  }

  reset() {
    this.state = this.initialSeed;
    return this;
  }
}

export function createRng(seed = DEFAULT_SEED) {
  return new SeededRng(seed);
}

export const rngFromSeed = createRng;

export default createRng;
