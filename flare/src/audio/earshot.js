// EARSHOT — the rear-only pinna ticker, and the system that makes the darkness
// playable.
//
// A 50 ms 3.2 kHz exponentially-decaying click, HRTF-panned from the threats you
// cannot see, whose INTER-TICK INTERVAL encodes distance. The insight is
// spectral, not spatial: generic HRTF resolves front-from-back using the
// 2.5-5.5 kHz pinna band, and every other sound in this game lives below
// 1.6 kHz — so EARSHOT occupies a channel the mix never uses instead of making
// the mix busier.
//
// D8 — THE WEDGE. The draft gated EARSHOT on a fixed 98.6 deg rear cone while
// the camera showed 108.5 deg, leaving 44 deg per side (54 in ADS) covered by
// neither, and put a 7.2 m/s unlit melee enemy in it. The gate is no longer an
// angle. EARSHOT fires for anything OUTSIDE THE CURRENT VIEW FRUSTUM, computed
// from the same view-projection matrix the renderer uses. The two regions are
// COMPLEMENTS BY CONSTRUCTION — `region === INSIDE` is literally
// `insideFrustum()` — so a wedge cannot exist at any FOV or aspect ratio, and
// tests/audio.mjs proves it by sampling the whole sphere at every FOV the game
// can reach.
//
// Outside the frustum splits two ways so they stay distinguishable (C3-F9):
// REAR (behind the lateral plane) ticks at full rate and volume; FLANK (outside
// the frustum but still in front of you — the band the old fixed cone lost)
// ticks 1.6x slower at 0.7 volume. Their union is exactly the complement.

import { FEEL } from '../feel.js';
import { clamp01 } from '../core/math.js';

const E = FEEL.audio.earshot;

export const EARSHOT = Object.freeze({
  attack: 0.0004,            // 0 -> peak in ~1.3 cycles: still a click, not a step
  elevDeadband: 0.30,        // sin(elevation) past this codes height in pitch
  trackSlots: 24,            // per-target cooldowns; the alive cap is 14
  logSize: 256,              // QA ring buffer: id, time, interval, volume, rate
  logStride: 5,
  noTargetBackoff: 0.10,
  seenTimeout: 2.0,
  flankUrgency: 0.55,        // a flank threat is real but a rear one is worse
});

export const INSIDE = 0;
export const FLANK = 1;
export const REAR = 2;

/** out = proj * view, three.js column-major. Allocation-free. */
export function multiplyVP(out, proj, view) {
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += proj[k * 4 + r] * view[c * 4 + k];
      out[c * 4 + r] = s;
    }
  }
  return out;
}

/**
 * THE predicate. One implementation, read by both halves of the complement —
 * which is the entire reason no wedge can exist.
 */
export function insideFrustum(vp, x, y, z) {
  const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
  if (cw <= 0) return false;
  const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
  if (cx < -cw || cx > cw) return false;
  const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
  if (cy < -cw || cy > cw) return false;
  const cz = vp[2] * x + vp[6] * y + vp[10] * z + vp[14];
  return cz >= -cw && cz <= cw;
}

const OUT = { region: INSIDE, dist: 0, flatLen: 0, elevation: 0, rearDot: 0, vertical: false };

/**
 * Classify a world point against the listener. `out` is reused; never allocate
 * in here, this runs per hostile per frame.
 */
export function classify(vp, ex, ey, ez, fx, fz, tx, ty, tz, out) {
  const o = out || OUT;
  const dx = tx - ex, dy = ty - ey, dz = tz - ez;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
  o.dist = dist;
  o.elevation = dy / dist;

  if (insideFrustum(vp, tx, ty, tz)) {
    o.region = INSIDE;
    o.flatLen = 0;
    o.rearDot = 0;
    o.vertical = false;
    return o;
  }

  // The normalize guard (C3-F9): on THE HELIX an enemy one turn above you
  // flattens to nearly nothing, and normalizing that is numerically garbage —
  // a jittering front/back flip on the one geometry the chamber is built from.
  const flatLen = Math.sqrt(dx * dx + dz * dz) / dist;
  o.flatLen = flatLen;
  if (flatLen < E.flatGuard) {
    o.vertical = true;
    o.rearDot = 1;
    o.region = REAR;       // you cannot see it and it is over your head. That is rear.
    return o;
  }

  o.vertical = false;
  const inv = 1 / (flatLen * dist);
  const rearDot = -(fx * dx + fz * dz) * inv;
  o.rearDot = rearDot;
  o.region = rearDot > 0 ? REAR : FLANK;
  return o;
}

export class Earshot {
  constructor(pool, bus) {
    this.pool = pool;
    this.bus = bus;
    this.time = 0;
    this.tokens = E.tokenCap;
    this.ticks = 0;
    this.backoffUntil = 0;
    this.hostileProviderIsDefault = true;

    // Per-target cooldowns, fixed size, linear scan. No Map, no allocation.
    this.slotId = new Float64Array(EARSHOT.trackSlots).fill(-1);
    this.slotNext = new Float64Array(EARSHOT.trackSlots);
    this.slotSeen = new Float64Array(EARSHOT.trackSlots);
    this.slotLast = new Float64Array(EARSHOT.trackSlots);

    // Top-K selection, K = 2, kept as two scalars rather than a sorted array.
    this._bestI = -1; this._bestU = 0;
    this._secondI = -1; this._secondU = 0;

    // QA ring: id, time, interval, volume, rate.
    this.log = new Float64Array(EARSHOT.logSize * EARSHOT.logStride);
    this.logHead = 0;
    this.logCount = 0;

    this._cls = { region: INSIDE, dist: 0, flatLen: 0, elevation: 0, rearDot: 0, vertical: false };
  }

  _slot(id) {
    let free = -1;
    for (let i = 0; i < EARSHOT.trackSlots; i++) {
      if (this.slotId[i] === id) return i;
      if (free < 0 && (this.slotId[i] < 0 || this.time - this.slotSeen[i] > EARSHOT.seenTimeout)) free = i;
    }
    if (free < 0) free = 0;
    this.slotId[free] = id;
    this.slotNext[free] = 0;
    this.slotLast[free] = 0;
    return free;
  }

  /**
   * `hostiles` is a flat array of { id, x, y, z }. `vp` is the live
   * view-projection matrix, `fx/fz` the camera's flattened forward.
   */
  update(dt, hostiles, vp, ex, ey, ez, fx, fz, audioNow) {
    this.time += dt;
    this.tokens = Math.min(E.tokenCap, this.tokens + dt * E.tokensPerSec);
    if (this.time < this.backoffUntil) return 0;

    this._bestI = -1; this._bestU = -1;
    this._secondI = -1; this._secondU = -1;

    const n = hostiles ? hostiles.length : 0;
    for (let i = 0; i < n; i++) {
      const h = hostiles[i];
      if (!h || h.dead) continue;
      const c = classify(vp, ex, ey, ez, fx, fz, h.x, h.y, h.z, this._cls);
      if (c.region === INSIDE) continue;
      if (c.dist > E.maxDistance) continue;
      const proximity = 1 - c.dist / E.maxDistance;
      const urgency = proximity * (c.region === REAR ? 1 : EARSHOT.flankUrgency);
      if (urgency > this._bestU) {
        this._secondI = this._bestI; this._secondU = this._bestU;
        this._bestI = i; this._bestU = urgency;
      } else if (urgency > this._secondU) {
        this._secondI = i; this._secondU = urgency;
      }
    }

    if (this._bestI < 0) { this.backoffUntil = this.time + EARSHOT.noTargetBackoff; return 0; }

    let fired = 0;
    fired += this._maybeTick(hostiles, this._bestI, vp, ex, ey, ez, fx, fz, audioNow);
    if (E.targets > 1 && this._secondI >= 0) {
      fired += this._maybeTick(hostiles, this._secondI, vp, ex, ey, ez, fx, fz, audioNow);
    }
    return fired;
  }

  _maybeTick(hostiles, index, vp, ex, ey, ez, fx, fz, audioNow) {
    const h = hostiles[index];
    const c = classify(vp, ex, ey, ez, fx, fz, h.x, h.y, h.z, this._cls);
    const slot = this._slot(h.id);
    this.slotSeen[slot] = this.time;
    if (this.time < this.slotNext[slot]) return 0;
    if (this.tokens < 1) return 0;

    const proximity = clamp01(1 - c.dist / E.maxDistance);
    const flank = c.region === FLANK;
    const interval = (E.tickBase + E.tickSpan * (1 - proximity)) * (flank ? E.flankInterval : 1);
    const volume = (E.volBase + E.volSpan * proximity) * (flank ? E.flankVolume : 1);

    // Elevation as playbackRate: HRTF carries no elevation below 1.6 kHz, and
    // pitch is the one cue that does. THE HELIX's whole premise is enemies above
    // and below you on the same ramp.
    let rate = 1;
    if (c.elevation > EARSHOT.elevDeadband) rate = E.elevAbove;
    else if (c.elevation < -EARSHOT.elevDeadband) rate = E.elevBelow;

    const s = this.pool.spec();
    s.when = audioNow;
    s.peak = E.amp * volume;
    s.attack = EARSHOT.attack;
    s.dur = E.dur / rate;
    s.decay = 1 / (E.decay * rate);
    s.tone = 1;
    s.toneType = 'sine';
    s.toneHz = E.hz * rate;
    this.pool.playAt('earshot', h.x, h.y, h.z, s);

    this.tokens -= 1;
    this.ticks++;
    const prev = this.slotLast[slot];
    const gap = prev > 0 ? this.time - prev : 0;
    this.slotLast[slot] = this.time;
    this.slotNext[slot] = this.time + interval;

    const k = this.logHead * EARSHOT.logStride;
    this.log[k] = h.id;
    this.log[k + 1] = this.time;
    this.log[k + 2] = gap;
    this.log[k + 3] = volume;
    this.log[k + 4] = rate;
    this.logHead = (this.logHead + 1) % EARSHOT.logSize;
    this.logCount++;
    return 1;
  }

  /** QA: the tick log as plain rows, newest last. Used by tests/audio.mjs. */
  rows() {
    const out = [];
    const n = Math.min(this.logCount, EARSHOT.logSize);
    const start = (this.logHead - n + EARSHOT.logSize) % EARSHOT.logSize;
    for (let i = 0; i < n; i++) {
      const k = ((start + i) % EARSHOT.logSize) * EARSHOT.logStride;
      out.push({
        id: this.log[k], time: this.log[k + 1], interval: this.log[k + 2],
        volume: this.log[k + 3], rate: this.log[k + 4],
      });
    }
    return out;
  }

  reset() {
    this.time = 0;
    this.tokens = E.tokenCap;
    this.ticks = 0;
    this.backoffUntil = 0;
    this.logHead = 0;
    this.logCount = 0;
    this.slotId.fill(-1);
    this.slotNext.fill(0);
    this.slotSeen.fill(0);
    this.slotLast.fill(0);
  }
}

export function createEarshot(pool, bus) { return new Earshot(pool, bus); }
