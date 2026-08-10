// Pooling. CONTRACT §4: five seconds of sustained fire must allocate under 64 KB.
//
// At 720 RPM a magazine is 32 tracers, 32 casings, 32 muzzle flashes and up to
// 256 impact particles inside 2.7 seconds. Allocating any of those per shot hands
// the GC a sawtooth that shows up as a stutter precisely during the fights the
// game is about — and it will read as "the engine is slow", not as "we allocated".

/**
 * Fixed-capacity object pool with a live/free split. Never grows: at capacity,
 * `take()` returns null and the caller decides what that means. That refusal is
 * deliberate — silently recycling the oldest live item is how a projectile
 * vanishes mid-flight, and in this game a vanished projectile is a light going
 * out of the room for no reason the player can see.
 */
export class Pool {
  constructor(capacity, factory, reset) {
    this.capacity = capacity;
    this.items = new Array(capacity);
    this.live = [];
    this.free = [];
    this.denied = 0;              // surfaced to the QA API; never silently swallowed
    this._reset = reset || null;
    for (let i = 0; i < capacity; i++) {
      const it = factory(i);
      it._poolIndex = i;
      it._live = false;
      this.items[i] = it;
      this.free.push(it);
    }
  }

  take() {
    const it = this.free.pop();
    if (!it) { this.denied++; return null; }
    it._live = true;
    this.live.push(it);
    return it;
  }

  release(it) {
    if (!it || !it._live) return false;
    it._live = false;
    const i = this.live.indexOf(it);
    if (i !== -1) { this.live[i] = this.live[this.live.length - 1]; this.live.pop(); }
    if (this._reset) this._reset(it);
    this.free.push(it);
    return true;
  }

  /**
   * Iterate live items backwards so a release during iteration is safe — the
   * swap-with-last removal above only ever moves an item we have already visited.
   */
  forEachLive(fn) {
    for (let i = this.live.length - 1; i >= 0; i--) fn(this.live[i], i);
  }

  releaseAll() { for (let i = this.live.length - 1; i >= 0; i--) this.release(this.live[i]); }

  get liveCount() { return this.live.length; }
  get freeCount() { return this.free.length; }
  get pressure() { return this.live.length / this.capacity; }
}

/**
 * A ring of preallocated scratch vectors, for the per-frame maths that would
 * otherwise allocate. Call `v()` freely inside a frame; never hold the result
 * across a frame boundary.
 */
export function scratchRing(THREE, count = 32) {
  const ring = new Array(count);
  for (let i = 0; i < count; i++) ring[i] = new THREE.Vector3();
  let cursor = 0;
  return {
    v() { const out = ring[cursor]; cursor = (cursor + 1) % count; return out; },
    reset() { cursor = 0; },
    size: count,
  };
}
