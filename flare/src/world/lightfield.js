// THE LIGHT FIELD — the game's identity system.
//
// Every kill permanently lights the ground where it died. All authority lives in
// a world-space list of scars indexed into a uniform spatial hash; the rendered
// mesh is only a view of it. One query, `illuminationAt(x, y, z)`, is consumed by
// the visor iris, enemy accuracy and spot range, RUNNER homing, spawn validation,
// and the music mood filter.
//
// Two decisions from docs/DECISIONS.md are structural here, not cosmetic:
//
//   D5 — the query is 3-D. The draft was lightAt(x, z), which cannot describe a
//   34 m spiral where the fight you had two turns below is visible through the
//   shaft. It also is not a scar-density lookup any more: it returns an
//   illumination estimate that includes rover lights and the player's own flash,
//   because four systems were already treating it as if it did.
//
//   D3 — light is a TRADE. Enemy accuracy and spot range read this same function.
//   Lighting a room is a decision about where you want the fight to be legible,
//   paid for in how hard you get hit while standing there.

import { clamp01 } from '../core/math.js';
import { hash2 } from '../core/rng.js';
import { FEEL } from '../feel.js';

export const FIELD = Object.freeze({
  cell: 12,            // spatial hash cell, metres
  mergeDist: 6,        // repeat kills inside this merge instead of littering
  mergeDistSq: 36,
  maxScars: 140,       // past this the weakest merges into its nearest neighbour
  vertical: 4.5,       // vertical falloff half-height, metres
  totalClamp: 4.0,     // an illumination sum past this is clipped
  radiusMax: 7.5,
  intensityMax: 3.0,
});

// PACKED, not XOR-hashed. The classic `cx*73856093 ^ cy*19349663 ^ cz*83492791`
// is NOT injective: 582 of the 1521 cells in a 13x9x13 block collide (-6,-1,5 and
// -6,1,-5 both land on 61801504). illuminationAt visits a 3x3x3 neighbourhood, so
// when two of those 27 cells share a key, buckets.get() hands back the SAME array
// twice and every scar in it is summed twice — measured 0.4014 against a true
// 0.2007, exactly 2x, in some world cells and not others, with no visual tell.
//
// Five systems read this function (enemy accuracy and spot range, the iris, RUNNER
// homing, spawn validation, the mood filter), so a silent factor of two here is a
// factor of two in the whole game's difficulty, unevenly, with nothing in a
// screenshot to diagnose. Packing is collision-free for any world inside +/-512
// cells — +/-6 km at FIELD.cell 12, against a tower that is 28 m tall.
const CELL_BIAS = 512;
export const cellKey = (cx, cy, cz) =>
  ((((cx + CELL_BIAS) & 1023) * 1024) + ((cy + CELL_BIAS) & 1023)) * 1024 + ((cz + CELL_BIAS) & 1023);
const _key = cellKey;

export class LightField {
  constructor(rng) {
    this.rng = rng ? rng.fork('scar') : null;
    this.scars = [];              // {x,y,z,r,i,born,cell}
    this.buckets = new Map();     // cellKey -> array of scars
    this.dirty = true;            // the view needs a rebuild
    this.version = 0;             // bumped on any change; the mesh reads it
    this._probes = [];            // transient lights (rover, flash, bolts) added per frame
  }

  _cellOf(x, y, z) {
    const c = FIELD.cell;
    return _key(Math.floor(x / c), Math.floor(y / c), Math.floor(z / c));
  }

  _index(scar) {
    const k = this._cellOf(scar.x, scar.y, scar.z);
    scar.cell = k;
    let b = this.buckets.get(k);
    if (!b) { b = []; this.buckets.set(k, b); }
    // TRAP (mined from BEHIND YOU's mound list): pushing without this guard
    // double-indexes a scar whose radius grew, and its contribution doubles.
    if (b.indexOf(scar) === -1) b.push(scar);
  }

  _unindex(scar) {
    const b = this.buckets.get(scar.cell);
    if (!b) return;
    const i = b.indexOf(scar);
    if (i !== -1) b.splice(i, 1);
  }

  /**
   * Deposit a kill. Returns the scar that now represents this position — either a
   * new one, or the existing one it merged into.
   */
  deposit(x, y, z, radius, intensity) {
    const near = this._nearestWithin(x, y, z, FIELD.mergeDist);
    if (near) {
      const grew = Math.max(near.r, radius);
      const needsReindex = grew > near.r;
      near.i = Math.min(FIELD.intensityMax, near.i + intensity * 0.45);
      // RE-INDEX on radius growth or the hash misses the cells the scar now spans.
      if (needsReindex) { this._unindex(near); near.r = Math.min(FIELD.radiusMax, grew); this._index(near); }
      this.dirty = true; this.version++;
      return near;
    }

    const scar = { x, y, z, r: Math.min(FIELD.radiusMax, radius), i: Math.min(FIELD.intensityMax, intensity), born: 0, cell: 0 };
    this.scars.push(scar);
    this._index(scar);

    if (this.scars.length > FIELD.maxScars) this._cullWeakest();

    this.dirty = true; this.version++;
    return scar;
  }

  _nearestWithin(x, y, z, dist) {
    let best = null, bestD = dist * dist;
    const c = FIELD.cell;
    const cx = Math.floor(x / c), cy = Math.floor(y / c), cz = Math.floor(z / c);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) for (let oz = -1; oz <= 1; oz++) {
      const b = this.buckets.get(_key(cx + ox, cy + oy, cz + oz));
      if (!b) continue;
      for (let k = 0; k < b.length; k++) {
        const s = b[k];
        const dx = s.x - x, dy = s.y - y, dz = s.z - z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bestD) { bestD = d; best = s; }
      }
    }
    return best;
  }

  _cullWeakest() {
    let worst = 0;
    for (let k = 1; k < this.scars.length; k++) if (this.scars[k].i < this.scars[worst].i) worst = k;
    const s = this.scars[worst];
    this._unindex(s);
    this.scars.splice(worst, 1);
    // Its light is not destroyed, it is given to its nearest neighbour — the
    // field's total brightness is a record of the run and must not shrink.
    const host = this._nearestWithin(s.x, s.y, s.z, 1e9);
    if (host) host.i = Math.min(FIELD.intensityMax, host.i + s.i * 0.35);
  }

  /**
   * Transient light sources for this frame: rover lights, the muzzle flash,
   * enemy bolts. Cleared every frame by `beginFrame`.
   */
  addProbe(x, y, z, radius, intensity) {
    this._probes.push(x, y, z, radius, intensity);
  }
  beginFrame() { this._probes.length = 0; }

  /**
   * THE query. Reads one 3x3x3 cell neighbourhood plus this frame's transient
   * probes. Flat-topped dome falloff, tangent at the rim, so a scar's edge does
   * not produce a visible ring in the enemy-accuracy field.
   */
  illuminationAt(x, y, z) {
    let sum = 0;
    const c = FIELD.cell;
    const cx = Math.floor(x / c), cy = Math.floor(y / c), cz = Math.floor(z / c);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) for (let oz = -1; oz <= 1; oz++) {
      const b = this.buckets.get(_key(cx + ox, cy + oy, cz + oz));
      if (!b) continue;
      for (let k = 0; k < b.length; k++) {
        const s = b[k];
        const dx = s.x - x, dz = s.z - z;
        const dy = (s.y - y) / FIELD.vertical * s.r;   // vertical falloff is tighter than horizontal
        const d2 = dx * dx + dy * dy + dz * dz;
        const r2 = s.r * s.r;
        if (d2 >= r2) continue;
        const t = 1 - d2 / r2;
        sum += s.i * t * t;
      }
    }
    for (let p = 0; p < this._probes.length; p += 5) {
      const dx = this._probes[p] - x, dy = this._probes[p + 1] - y, dz = this._probes[p + 2] - z;
      const r = this._probes[p + 3];
      const d2 = dx * dx + dy * dy + dz * dz;
      const r2 = r * r;
      if (d2 >= r2) continue;
      const t = 1 - d2 / r2;
      sum += this._probes[p + 4] * t * t;
    }
    return sum > FIELD.totalClamp ? FIELD.totalClamp : sum;
  }

  /**
   * Normalised 0..1 — the ONE curve every consumer reads (D3's accuracy and
   * spot-range trades, the iris target, spawn scoring, the mood filter).
   *
   * This used to divide by 1.6, which is a different curve from FEEL.field.normK
   * and disagreed with it by 47% at a single HUSK scar (0.625 vs 0.423). Three
   * systems had open-coded the exponential rather than trust a method whose name
   * promised the same thing — so the game had two definitions of "how lit is
   * this", and which one you got depended on which module asked.
   *
   * 0.42 at one scar, 0.75 at four, 0.93 at ten.
   */
  litAt(x, y, z) { return clamp01(1 - Math.exp(-this.illuminationAt(x, y, z) * FEEL.field.normK)); }

  /** Breathing scale for the decal view. Stable per scar, so it does not shimmer. */
  breathe(scar, t) { return 0.86 + Math.sin(t * 1.6 + hash2(scar.x, scar.z) * 6.283) * 0.09; }

  get count() { return this.scars.length; }

  /** Total light made this run. The end card's only number. */
  get total() {
    let s = 0;
    for (let k = 0; k < this.scars.length; k++) s += this.scars[k].i;
    return s;
  }

  reset() {
    this.scars.length = 0;
    this.buckets.clear();
    this._probes.length = 0;
    this.dirty = true;
    this.version++;
  }
}
