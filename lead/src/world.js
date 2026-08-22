/* The world.
 *
 * One continuous side-on route from a stoop to the sea, authored as a
 * polyline of ground nodes in metres plus a list of props sitting on it. No
 * procedural generation anywhere: every metre of this is placed. */

import { PX, C } from './config.js';
import { clamp, lerp } from './feel.js';

export class World {
  constructor(route) {
    this.nodes = route.ground;         // [{x, y}] metres, y up
    this.props = route.props.slice();
    this.chapters = route.chapters;
    this.gaps = route.gaps || [];
    this.length = this.nodes[this.nodes.length - 1].x;
    this._cache = { i: 0 };
    this.groundAt = this.groundAt.bind(this);
    this.slopeAt = this.slopeAt.bind(this);
  }

  /* Ground height in pixels at a pixel x. Larger y is lower on screen. */
  groundAt(xpx) {
    const x = xpx / PX;
    const n = this.nodes;
    let i = this._cache.i;
    if (i >= n.length - 1) i = n.length - 2;
    while (i > 0 && x < n[i].x) i--;
    while (i < n.length - 2 && x > n[i + 1].x) i++;
    this._cache.i = i;
    const a = n[i], b = n[i + 1];
    const t = clamp((x - a.x) / (b.x - a.x || 1e-6), 0, 1);
    /* Smoothstep between nodes: no hard creases to trip a foot on, and
     * hills that read as landforms rather than ramps. */
    const s = t * t * (3 - 2 * t);
    return -lerp(a.y, b.y, s) * PX;
  }

  slopeAt(xpx) {
    const d = PX * 0.25;
    /* Never sample across the lip of a gap: that is a cliff, and reporting it
     * as an eighty-nine degree hill leaves anyone who lands a marginal jump
     * stranded on the edge with no traction, being nudged back into it. */
    const a = this.gapAtX(xpx - d) ? this.groundAt(xpx) : this.groundAt(xpx - d);
    const b = this.gapAtX(xpx + d) ? this.groundAt(xpx) : this.groundAt(xpx + d);
    const span = (this.gapAtX(xpx - d) || this.gapAtX(xpx + d)) ? d : d * 2;
    return Math.atan2(b - a, span);
  }

  /* True where the ground is too steep for a kid to walk up unaided. This is
   * what forces the hand closed on the viaduct climb. */
  tooSteep(xpx, face) {
    const s = this.slopeAt(xpx);
    return -s * face > 0.62;           // ~35 degrees
  }

  /* Is this x over open air at all, regardless of height? Used to decide
   * where to leap from; inGap() is the separate question of having fallen. */
  gapAtX(xpx) {
    const x = xpx / PX;
    for (const g of this.gaps) if (x > g.x0 && x < g.x1) return g;
    return null;
  }

  inGap(xpx, ypx) {
    const x = xpx / PX;
    for (const g of this.gaps) {
      if (x > g.x0 + 0.2 && x < g.x1 - 0.2 && ypx > -g.lip * PX + 2.6 * PX) return g;
    }
    return null;
  }

  chapterAt(xpx) {
    const x = xpx / PX;
    let last = this.chapters[0];
    for (const c of this.chapters) if (x >= c.x) last = c;
    return last;
  }

  nearProps(xpx, radius) {
    const x = xpx / PX, r = radius;
    const out = [];
    for (const p of this.props) {
      if (p.dead) continue;
      if (Math.abs(p.x - x) <= r) out.push(p);
    }
    return out;
  }

  step(dt, game) {
    for (const p of this.props) {
      if (p.update) p.update(dt, game, this);
    }
  }
}

/* --- prop kinds --------------------------------------------------------

Every prop is a plain object with x (metres), kind, and optional behaviour.
`pull` is how badly the dog wants it, 0..1 — it is never displayed, but the
dog's head, ears and stance point straight at whatever is scoring highest, so
it is always visible on the body.
----------------------------------------------------------------------- */

export function prop(kind, x, extra = {}) {
  return { kind, x, y: 0, pull: 0, r: 3.0, t: 0, ...extra };
}

export const PROP_DEFAULTS = {
  pigeons:  { pull: 0.85, r: 12 },
  cat:      { pull: 0.90, r: 11 },
  gulls:    { pull: 0.80, r: 16 },
  otherdog: { pull: 0.95, r: 14 },
  cart:     { pull: 1.00, r: 9 },
  ball:     { pull: 0.72, r: 10 },
  puddle:   { pull: 0.34, r: 4 },
  lamppost: { pull: 0.30, r: 3 },
  grass:    { pull: 0.22, r: 3 },
  bin:      { pull: 0.26, r: 3 },
  hydrant:  { pull: 0.30, r: 3 },
  sprinkler:{ pull: 0.55, r: 6 },
  sea:      { pull: 0.60, r: 40 },
  sausage:  { pull: 0.93, r: 10 },
  tree:     { pull: 0.26, r: 3 },
  bench:    { pull: 0.20, r: 2.5 },
};

export function makeProp(kind, x, extra = {}) {
  return prop(kind, x, { ...(PROP_DEFAULTS[kind] || {}), ...extra });
}
