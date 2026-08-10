// Deterministic, forkable random. CONTRACT §3: nothing in src/ calls Math.random().
//
// The forking is the whole point. A single shared stream means that adding one
// particle effect shifts every subsequent draw, so the recoil pattern moves and
// the visual regression goes red for a reason nobody can find. Each effect owns
// its own stream, seeded from the parent's seed and its own name, so streams are
// independent and reproducible in any order.

// xmur3 string hash -> 32-bit seed
function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export class Rng {
  constructor(seed = 'flare') {
    const s = typeof seed === 'number' ? seed >>> 0 : hashSeed(String(seed))();
    this.seed = s;
    this._s = s || 0x9e3779b9;
    this._forks = new Map();
  }

  // mulberry32 — small, fast, good enough, and identical across engines.
  next() {
    this._s = (this._s + 0x6d2b79f5) | 0;
    let t = this._s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * A FRESH stream, deterministically seeded from this parent and the name, with
   * no memoisation. Use this when the same name is drawn from more than once and
   * each draw must start from the same place — rebuilding a chamber, replaying a
   * pattern, re-running a generator.
   *
   * `fork` is memoised on purpose (a per-effect stream must be continuous across
   * a frame), and that is exactly wrong here: calling fork('build:intake') twice
   * hands back the SAME advanced stream, so the second build of a room is not the
   * first one. Two correct behaviours, two methods, rather than one method that
   * is subtly wrong at half its call sites.
   */
  derive(name) {
    return new Rng((this.seed ^ hashSeed(name)()) >>> 0);
  }

  /** Same name always returns the same child stream on this parent. */
  fork(name) {
    let child = this._forks.get(name);
    if (!child) {
      child = new Rng((this.seed ^ hashSeed(name)()) >>> 0);
      this._forks.set(name, child);
    }
    return child;
  }

  range(a, b) { return a + (b - a) * this.next(); }
  int(n) { return (this.next() * n) | 0; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  /** ±amount, uniform. */
  jitter(amount) { return (this.next() * 2 - 1) * amount; }
  pick(arr) { return arr[(this.next() * arr.length) | 0]; }

  /**
   * Uniform point in a disc of the given radius. TRAP (APEX weapons.js:143):
   * sampling `radius * u` clusters shots at the centre and does not produce a
   * uniform cone. sqrt(u) is the correction, and it is the difference between a
   * shotgun that patterns and one that snipes.
   */
  disc(radius, out) {
    const r = radius * Math.sqrt(this.next());
    const th = this.next() * Math.PI * 2;
    out.x = r * Math.cos(th);
    out.y = r * Math.sin(th);
    return out;
  }

  /** Reset to the original seed — used by the harness between deterministic runs. */
  reset() {
    this._s = this.seed || 0x9e3779b9;
    for (const child of this._forks.values()) child.reset();
  }
}

/** Stable spatial hash, for per-instance variation that must not change per frame. */
export function hash2(x, z) {
  let h = Math.imul(Math.round(x * 73.1) ^ 0x9e3779b9, 2246822507);
  h ^= Math.imul(Math.round(z * 91.7) ^ 0x85ebca6b, 3266489909);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
