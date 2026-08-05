// ember.js — the thing you are.
//
// The ember has almost no agency: a strong drag term pulls it toward whatever
// the air around it is doing. Its heat decides whether it rises or falls, how
// far it lights, and how long it has left. Moving air is the only steering
// wheel in the game, and moving air also cools it. That tension is the game.
//
// Collision runs against a CPU copy of the level's solid field rather than the
// GPU probes: the probe readback is a few frames stale, and an ember doing
// 200 cells/second will happily tunnel three cells into a wall in that time.

import { clamp, clamp01, approach } from './util.js';

export const EMBER = {
  drag: 7.6,            // how hard the air owns you
  // Neutral buoyancy sits high on purpose: a bright ember climbs, a fading one
  // sinks. Altitude is something you spend heat on.
  // These look large because they fight the drag term, which is strong by design:
  // at drag 7.6 an accel of A shifts the ember only A/7.6 cells/s against the air.
  buoy: 300.0,
  gravity: 258.0,       // neutral at heat ~0.86
  maxSink: 145.0,       // a dying ember falls, but not like a stone
  maxSpeed: 230,
  radius: 1.7,          // cells; collision is a disc, so it cannot slip into cracks

  baseCool: 0.062,      // the clock: ~33s of life with nothing to burn
  floorCool: 0.0085,    // a constant bleed, so a dying ember dies instead of lingering
  // Only turbulence strips a flame — drifting with the air costs nothing. The
  // floor is what makes movement VI's rule legible: riding is free, flailing is not.
  // Playing the game stirs the air, so this has to stay affordable: an ordinary
  // stroke should cost noticeably, and only real flailing should be fatal.
  windCool: 0.00110,    // per (cell/s) of air speed above the floor
  windFloor: 45.0,      // below this the air is just moving; above it, it strips you
  smokeCool: 0.055,
  humidCool: 0.95,
  waterCool: 1.8,

  // Heat comes from fire, never from the air the ember itself just warmed.
  absorb: 2.1,
  flameTarget: 1.26,
  nearCells: 4.0,       // innermost sample of the warmth spiral
  farCells: 23.0,       // outermost; beyond this a fire does not reach you

  maxHeat: 1.45,
  outAt: 0.060,

  bounce: 0.34,
  friction: 0.985,      // per sub-step while scraping a surface
  scrapeCool: 0.0016,
};

const RING = 9;   // samples on a sweeping spiral, see placeProbes

export class Ember {
  constructor() { this.g = null; this.reset(0, 0, 1); }

  /** Point at a level's static fields so collision can be exact. */
  bind(level) { this.g = { gw: level.gw, gh: level.gh, solid: level.solid }; }

  /**
   * Nearest open cell. Deep inside a thick wall the solidity gradient is flat,
   * so there is no direction to push along — this searches outward instead.
   */
  freeSpot(x, y) {
    if (this.solidAt(x, y) <= 0.45 && this.blockedAt(x, y) <= 0.75) return [x, y];
    for (let r = 1.5; r <= 48; r += 1.5) {
      for (let k = 0; k < 20; k++) {
        const a = (k / 20) * Math.PI * 2 + r * 0.61;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (this.blockedAt(px, py) <= 0.35) return [px, py];
      }
    }
    return [x, y];
  }

  reset(x, y, heat) {
    if (this.g) [x, y] = this.freeSpot(x, y);
    this.x = x; this.y = y;
    this.fx = x; this.fy = y;      // last position known to be in open air
    this.vx = 0; this.vy = 0;
    this.heat = heat;
    this.alive = true;
    this.age = 0;
    this.peril = 0;
    this.contact = 0;
    this.inWater = false;
    this.fieldHeat = 0;
    this.burnNear = 0;
    this.wind = 0;
    this.slip = 0;
    this.travel = 0;
    this.budget = null;
  }

  // ── the static world, sampled exactly ────────────────────────────────────
  _field(x, y, c) {
    const g = this.g;
    if (!g) return 0;
    const gw = g.gw, gh = g.gh, S = g.solid;
    let gx = x - 0.5, gy = y - 0.5;
    if (gx < 0) gx = 0; else if (gx > gw - 1.001) gx = gw - 1.001;
    if (gy < 0) gy = 0; else if (gy > gh - 1.001) gy = gh - 1.001;
    const x0 = gx | 0, y0 = gy | 0;
    const fx = gx - x0, fy = gy - y0;
    const a = (y0 * gw + x0) * 4 + c, b = ((y0 + 1) * gw + x0) * 4 + c;
    return (S[a] * (1 - fx) + S[a + 4] * fx) * (1 - fy) + (S[b] * (1 - fx) + S[b + 4] * fx) * fy;
  }
  solidAt(x, y) { return this._field(x, y, 0); }
  /** Solidity of a small disc — keeps the ember out of cracks it would stick in. */
  blockedAt(x, y) {
    const r = EMBER.radius;
    let s = this._field(x, y, 0);
    s = Math.max(s, this._field(x + r, y, 0), this._field(x - r, y, 0));
    s = Math.max(s, this._field(x, y + r, 0), this._field(x, y - r, 0));
    return s;
  }
  matAt(x, y) { return this._field(x, y, 2); }
  /** Gradient of solidity — points into the wall. */
  gradAt(x, y) {
    const h = 0.9;
    return [
      (this.solidAt(x + h, y) - this.solidAt(x - h, y)) * 0.5,
      (this.solidAt(x, y + h) - this.solidAt(x, y - h)) * 0.5,
    ];
  }

  /**
   * Fire radiates, so "near a flame" has to mean a disc, not a ring. These sit
   * on a spiral that sweeps as the ember ages: rings at fixed radii leave gaps
   * a candle can sit in, and then you starve to death beside a lit wick.
   */
  placeProbes(fluid) {
    const iw = 1 / fluid.gw, ih = 1 / fluid.gh;
    fluid.setProbe(0, this.x * iw, this.y * ih);
    for (let k = 0; k < RING; k++) {
      const f = (k + 0.5) / RING;
      const r = EMBER.nearCells + f * (EMBER.farCells - EMBER.nearCells);
      const a = f * 15.09 + this.age * 1.7;      // ~2.4 turns across the spiral
      fluid.setProbe(1 + k, (this.x + Math.cos(a) * r) * iw, (this.y + Math.sin(a) * r) * ih);
    }
  }
  /** How much warmth a probe at spiral position k is worth. */
  static probeWeight(k) { return 1.0 - 0.5 * ((k + 0.5) / RING); }

  step(dt, fluid, level) {
    if (!this.alive) return;
    const E = EMBER;
    this.age += dt;

    const c0 = fluid.probe(0, 0);
    const c1 = fluid.probe(0, 1);
    const fvx = c0[0], fvy = c0[1];
    this.fieldHeat = c0[2];
    const smoke = c0[3];
    const humid = c1[2];
    let burn = c1[3];
    for (let k = 0; k < RING; k++) burn = Math.max(burn, fluid.probe(1 + k, 1)[3] * Ember.probeWeight(k));
    // smooth it: the spiral sweeps, so a raw read flickers as it passes a flame
    this.burnNear = burn > this.burnNear ? burn : approach(this.burnNear, burn, 4.5, dt);

    // ── carried, not driven
    const rvx = fvx - this.vx, rvy = fvy - this.vy;
    this.slip = Math.hypot(rvx, rvy);
    // Cooling follows how disturbed the air IS, not how fast the ember is
    // slipping through it — otherwise a sinking ember generates its own wind
    // and every fade turns into a death spiral.
    this.wind = Math.hypot(fvx, fvy);
    const k = 1 - Math.exp(-E.drag * dt);
    this.vx += rvx * k;
    this.vy += rvy * k;
    this.vy += Math.max(E.buoy * this.heat - E.gravity, -E.maxSink) * dt;

    let sp = Math.hypot(this.vx, this.vy);
    if (sp > E.maxSpeed) { const s = E.maxSpeed / sp; this.vx *= s; this.vy *= s; sp = E.maxSpeed; }

    this._move(dt, sp);

    // ── the long arithmetic of staying alight
    const cs = level.coolScale ?? 1;
    const lBase = (E.baseCool * this.heat + E.floorCool) * cs;
    const floor = level.windFloor ?? E.windFloor;
    const lWind = E.windCool * Math.max(0, this.wind - floor) * this.heat * (level.windCool ?? 1);
    const lSmoke = E.smokeCool * Math.min(smoke, 3) * this.heat;
    const lHumid = E.humidCool * Math.max(0, humid) * this.heat;
    const lWater = this.inWater ? E.waterCool : 0;
    this.heat -= (lBase + lWind + lSmoke + lHumid + lWater) * dt;

    let gain = 0;
    if (this.burnNear > 0.02 && this.heat < E.flameTarget) {
      gain = (E.flameTarget - this.heat) * E.absorb * Math.min(this.burnNear, 1);
      this.heat += gain * dt;
    }
    this.heat = clamp(this.heat, 0, E.maxHeat);
    this.budget = { base: lBase, wind: lWind, smoke: lSmoke, humid: lHumid, water: lWater, gain, burn };

    this.peril = approach(this.peril, clamp01(1 - this.heat / 0.42), 5.5, dt);
    this.contact = approach(this.contact, 0, 7, dt);
    if (this.heat <= E.outAt) { this.heat = 0; this.alive = false; }
  }

  /** Outward normal from the disc samples — reliable even flush against a face. */
  _pushDir(x, y) {
    const r = EMBER.radius;
    let nx = this._field(x - r, y, 0) - this._field(x + r, y, 0);
    let ny = this._field(x, y - r, 0) - this._field(x, y + r, 0);
    const l = Math.hypot(nx, ny);
    if (l < 1e-4) return [0, 0];
    return [nx / l, ny / l];
  }

  /**
   * Sub-stepped so a fast ember cannot step through a wall, and axis-separated
   * so it slides along a floor instead of sticking to it.
   */
  _move(dt, sp) {
    const E = EMBER, g = this.g;
    const n = Math.min(10, Math.max(1, Math.ceil((sp * dt) / 1.05)));
    const sdt = dt / n;
    this.inWater = false;
    for (let i = 0; i < n; i++) {
      let nx = this.x + this.vx * sdt, ny = this.y + this.vy * sdt;
      if (this.blockedAt(nx, ny) > 0.5) {
        const mat = this.matAt(nx, ny);
        if (mat > 0.62 && mat < 0.90) this.inWater = true;
        // slide: keep whichever axis is still free
        if (this.blockedAt(nx, this.y) <= 0.5) { ny = this.y; this.vy = -this.vy * E.bounce; }
        else if (this.blockedAt(this.x, ny) <= 0.5) { nx = this.x; this.vx = -this.vx * E.bounce; }
        else {
          const [px, py] = this._pushDir(this.x, this.y);
          const vn = this.vx * px + this.vy * py;
          // only ever cancel the component going into the wall — never the
          // tangential one, or an ember resting on a ledge can never leave it
          if (vn < 0) { this.vx -= vn * px * (1 + E.bounce); this.vy -= vn * py * (1 + E.bounce); }
          else if (px === 0 && py === 0) { this.vx *= -E.bounce; this.vy *= -E.bounce; }
          nx = this.x; ny = this.y;
        }
        this.vx *= E.friction; this.vy *= E.friction;
        this.contact = Math.min(1, this.contact + Math.min(1, sp / 140));
        this.heat -= E.scrapeCool * sp * sdt;
      }
      this.x = nx; this.y = ny;
    }
    // resolve any remaining overlap so next frame starts free
    let sep = 0;
    while (this.blockedAt(this.x, this.y) > 0.5 && sep++ < 12) {
      const [px, py] = this._pushDir(this.x, this.y);
      if (px === 0 && py === 0) break;
      this.x += px * 0.5; this.y += py * 0.5;
    }
    // only a centre genuinely inside rock counts as embedded
    let guard = 0;
    while (this.solidAt(this.x, this.y) > 0.5 && guard++ < 16) {
      const [gx, gy] = this.gradAt(this.x, this.y);
      const l = Math.hypot(gx, gy);
      if (l > 1e-4) { this.x -= (gx / l) * 0.8; this.y -= (gy / l) * 0.8; }
      else break;
    }
    if (this.solidAt(this.x, this.y) > 0.5) {
      const [px, py] = this.freeSpot(this.x, this.y);
      this.x = px; this.y = py; this.vx *= 0.2; this.vy *= 0.2;
    }
    if (g) {
      this.x = clamp(this.x, 1.2, g.gw - 1.2);
      this.y = clamp(this.y, 1.2, g.gh - 1.2);
    }
  }

  get speed() { return Math.hypot(this.vx, this.vy); }
  /** Visible radius in cells — a bright ember reads bigger. */
  get glow() { return 1.5 + this.heat * 2.9; }
}
