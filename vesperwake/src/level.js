/* level.js — the world model and the authoring DSL.
 *
 * Levels are hand-authored in code as a sequence of BEATS. A beat is one
 * designed idea: a jump you have to commit to, an enemy pair that only works
 * together, a moment of quiet before a fight. The builder exists so a beat can
 * be written in three lines and read back in one glance — because the level
 * design is the thing being iterated on, not the plumbing.
 *
 * Terrain kinds:
 *   solid     blocks from every direction
 *   ledge     one-way: land on it from above, jump up through it, drop with Down
 *   crumble   a ledge that falls away shortly after it takes your weight
 *   mover     a platform on a path; it carries whatever stands on it
 *   hazard    hurts on contact (water, gearteeth, the gorge)
 */

import { CELL } from './config.js';
import { clamp, overlaps } from './core.js';

let uid = 0;
const nextId = () => (uid += 1);

export class Builder {
  constructor(meta) {
    this.level = {
      width: 0,
      height: 720,
      spawn: { x: 80, y: 400 },
      /* meta wins: a chapter that declares its own height means it */
      ...meta,
      solids: [],
      ledges: [],
      crumbles: [],
      movers: [],
      hazards: [],
      props: [],
      front: [],
      back: [],
      breakables: [],
      enemies: [],
      pickups: [],
      checkpoints: [],
      zones: [],
      triggers: [],
      doors: [],
      gates: [],
      secrets: [],
      exit: null,
      bossArena: null,
    };
  }

  /* ---- terrain ---- */

  /** A run of ground. `y` is the WALKING SURFACE. */
  floor(x, w, y, tag = 'ground', depth = 260) {
    this.level.solids.push({ id: nextId(), x, y, w, h: depth, tag, kind: 'solid' });
    this._extend(x + w);
    return this;
  }

  block(x, y, w, h, tag = 'block') {
    this.level.solids.push({ id: nextId(), x, y, w, h, tag, kind: 'solid' });
    this._extend(x + w);
    return this;
  }

  /** Wall — same as block but tagged so painters can treat it vertically. */
  wall(x, y, w, h, tag = 'wall') { return this.block(x, y, w, h, tag); }

  ledge(x, y, w, tag = 'ledge', h = 14) {
    this.level.ledges.push({ id: nextId(), x, y, w, h, tag, kind: 'ledge' });
    this._extend(x + w);
    return this;
  }

  /** A ledge you are MEANT to fail to reach the first time. `shard` names the
   * ability that makes it possible, so the level can be checked honestly:
   * unreachable-by-design is a feature, unreachable-by-accident is a bug. */
  gatedLedge(x, y, w, tag, shard, h = 14) {
    this.level.ledges.push({ id: nextId(), x, y, w, h, tag, kind: 'ledge', gated: shard });
    this._extend(x + w);
    return this;
  }

  /** A ledge that gives way 0.55s after you stand on it, and returns after 3s. */
  crumble(x, y, w, tag = 'crumble', h = 14) {
    this.level.crumbles.push({
      id: nextId(), x, y, w, h, tag, kind: 'crumble',
      timer: 0, state: 'idle', respawn: 0, shake: 0,
    });
    this._extend(x + w);
    return this;
  }

  /** A platform that travels between two points. mode: 'loop' | 'pong' | 'trigger' */
  mover(x, y, w, opts = {}) {
    this.level.movers.push({
      id: nextId(), x, y, w, h: opts.h ?? 16,
      x0: x, y0: y,
      x1: opts.toX ?? x, y1: opts.toY ?? y,
      speed: opts.speed ?? 46,
      phase: opts.phase ?? 0,
      mode: opts.mode ?? 'pong',
      tag: opts.tag ?? 'mover',
      kind: 'mover',
      t: opts.phase ?? 0, dir: 1, vx: 0, vy: 0,
      wait: opts.wait ?? 0, waiting: 0,
      spin: opts.spin ?? 0,
    });
    this._extend(Math.max(x + w, (opts.toX ?? x) + w));
    return this;
  }

  /** A barrier that only a shard opens. The whole point of a metroidvania is
   * walking past one of these and coming back. */
  gate(x, y, w, h, shard, opts = {}) {
    this.level.gates.push({ id: nextId(), x, y, w, h, shard, open: false, glow: 0, ...opts });
    this._extend(x + w);
    return this;
  }

  hazard(x, y, w, h, kind = 'gorge') {
    this.level.hazards.push({ id: nextId(), x, y, w, h, kind, damage: kind === 'gorge' ? 999 : 16 });
    this._extend(x + w);
    return this;
  }

  /** A wall or urn that the whip destroys. Some hide things. */
  breakable(x, y, w, h, kind = 'urn', drop = null) {
    this.level.breakables.push({ id: nextId(), x, y, w, h, kind, drop, hp: kind === 'falsewall' ? 2 : 1, dead: false, flash: 0 });
    this._extend(x + w);
    return this;
  }

  /* ---- population ---- */

  enemy(kind, x, y, opts = {}) {
    this.level.enemies.push({ id: nextId(), kind, x, y, ...opts });
    this._extend(x + 60);
    return this;
  }

  prop(kind, x, y, opts = {}) { this.level.props.push({ id: nextId(), kind, x, y, ...opts }); this._extend(x); return this; }
  frontProp(kind, x, y, opts = {}) { this.level.front.push({ id: nextId(), kind, x, y, ...opts }); return this; }
  backProp(kind, x, y, opts = {}) { this.level.back.push({ id: nextId(), kind, x, y, ...opts }); return this; }

  pickup(kind, x, y, opts = {}) { this.level.pickups.push({ id: nextId(), kind, x, y, taken: false, bob: Math.random() * 6, ...opts }); return this; }

  /** A sun-disc: heals, sets the return point, and marks the map. */
  checkpoint(x, y) { this.level.checkpoints.push({ id: nextId(), x, y, lit: false }); this._extend(x); return this; }

  zone(name, x0, x1, opts = {}) { this.level.zones.push({ name, x0, x1, ...opts }); return this; }

  trigger(x, w, fn, opts = {}) { this.level.triggers.push({ id: nextId(), x, w, fn, once: opts.once !== false, fired: false }); return this; }

  spawn(x, y) { this.level.spawn = { x, y }; return this; }
  exit(x, y, w = 60, h = 120) { this.level.exit = { x, y, w, h }; this._extend(x + w); return this; }
  arena(x, y, w, h) { this.level.bossArena = { x, y, w, h }; this._extend(x + w); return this; }

  _extend(x) { if (x > this.level.width) this.level.width = x; }

  build() {
    this.level.width += 240;
    return this.level;
  }
}

/* ------------------------------------------------------------------ *
 * Runtime
 * ------------------------------------------------------------------ */

export function resetLevelRuntime(level) {
  for (const c of level.crumbles) { c.state = 'idle'; c.timer = 0; c.respawn = 0; c.shake = 0; }
  for (const m of level.movers) { m.t = m.phase; m.dir = 1; m.waiting = 0; m.vx = 0; m.vy = 0; m.x = m.x0; m.y = m.y0; }
  for (const b of level.breakables) { b.dead = false; b.hp = b.kind === 'falsewall' ? 2 : 1; b.flash = 0; }
  for (const p of level.pickups) { p.taken = false; }
  for (const t of level.triggers) { t.fired = false; }
  for (const c of level.checkpoints) { c.lit = false; }
}

export function updateTerrain(level, dt) {
  for (const c of level.crumbles) {
    if (c.state === 'shaking') {
      c.timer -= dt;
      c.shake = Math.min(1, c.shake + dt * 5);
      if (c.timer <= 0) { c.state = 'gone'; c.respawn = 3.0; c.shake = 0; }
    } else if (c.state === 'gone') {
      c.respawn -= dt;
      if (c.respawn <= 0) { c.state = 'idle'; c.shake = 0; }
    } else if (c.shake > 0) {
      c.shake = Math.max(0, c.shake - dt * 3);
    }
  }

  for (const m of level.movers) {
    const px = m.x; const py = m.y;
    if (m.waiting > 0) { m.waiting -= dt; m.vx = 0; m.vy = 0; continue; }
    const span = Math.hypot(m.x1 - m.x0, m.y1 - m.y0) || 1;
    m.t += (m.speed / span) * dt * m.dir;
    if (m.t >= 1) {
      m.t = 1;
      if (m.mode === 'loop') m.t = 0; else { m.dir = -1; m.waiting = m.wait; }
    } else if (m.t <= 0) {
      m.t = 0;
      if (m.mode !== 'loop') { m.dir = 1; m.waiting = m.wait; }
    }
    m.x = m.x0 + (m.x1 - m.x0) * m.t;
    m.y = m.y0 + (m.y1 - m.y0) * m.t;
    m.vx = (m.x - px) / Math.max(dt, 1e-6);
    m.vy = (m.y - py) / Math.max(dt, 1e-6);
    if (m.spin) m.angle = (m.angle ?? 0) + m.spin * dt;
  }

  for (const b of level.breakables) if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 4);
}

/* All currently-solid surfaces (solid blocks only — not one-way). */
export function solidsNear(level, box, pad = 48) {
  const out = [];
  const x0 = box.x - pad; const x1 = box.x + box.w + pad;
  for (const s of level.solids) if (s.x < x1 && s.x + s.w > x0) out.push(s);
  for (const g of level.gates) {
    if (g.open) continue;
    if (g.x < x1 && g.x + g.w > x0) out.push(g);
  }
  return out;
}

/* One-way surfaces: ledges, live crumbles, and movers. */
export function platformsNear(level, box, pad = 48) {
  const out = [];
  const x0 = box.x - pad; const x1 = box.x + box.w + pad;
  for (const p of level.ledges) if (p.x < x1 && p.x + p.w > x0) out.push(p);
  for (const c of level.crumbles) if (c.state !== 'gone' && c.x < x1 && c.x + c.w > x0) out.push(c);
  for (const m of level.movers) if (m.x < x1 && m.x + m.w > x0) out.push(m);
  for (const b of level.breakables) {
    if (b.dead || !b.standable) continue;
    if (b.x < x1 && b.x + b.w > x0) out.push(b);
  }
  return out;
}

export function hazardAt(level, box) {
  for (const h of level.hazards) if (overlaps(box, h)) return h;
  return null;
}

/* Snap a world x to the design grid — used by authoring helpers. */
export const gx = (n) => n * CELL;
export const gy = (n) => n * CELL;

/* Find the walking surface directly under a point (for placing things). */
export function groundUnder(level, x, fromY) {
  let best = Infinity;
  for (const s of level.solids) {
    if (x >= s.x && x <= s.x + s.w && s.y >= fromY - 2 && s.y < best) best = s.y;
  }
  for (const p of level.ledges) {
    if (x >= p.x && x <= p.x + p.w && p.y >= fromY - 2 && p.y < best) best = p.y;
  }
  return best === Infinity ? null : best;
}

export function zoneAt(level, x) {
  for (const z of level.zones) if (x >= z.x0 && x < z.x1) return z;
  return level.zones[0] ?? null;
}

export const clampToLevel = (level, x) => clamp(x, 0, level.width);
