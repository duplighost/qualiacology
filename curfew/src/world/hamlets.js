// CURFEW — THREE HAMLETS. The Eleven rewire, rebuilt for D16.
//
// ALEX: "more little towns. Not like that big gates town, but places with a few smaller
// houses where people live. Each one very different. They must be related to some unique
// environment. Make 3 of them."
//
// And then, after playing the first cut: the ground was a giant flat plank you could walk
// under and pop through, everyone walked half sunk, and you could not get onto the walkway.
// So this is the second cut, and its one rule is THE FLOORS HOLD:
//
//   - every surface a person can stand on is a FILLED solid: drawn and collided from the
//     ground (or the floor under it) up to its top, `standable: true`, so there is never
//     air under a floor and nothing to walk under or pop through;
//   - every change of level is a STAIR of stepped solids, or the car ramp;
//   - nothing a player can reach is a collider-less plane. Eelwater's water is a standable
//     floor 0.10 m over the pad, the boards ride 0.45 m over it, and the two are 1.9 m apart
//     at most, which is the width of a boardwalk;
//   - people stand on the ground, or on those boards, and hamlet-life.js asks the collision
//     field for their feet instead of trusting a number typed here.
//
//   EELWATER   fen. Five houses on low platforms over shallow black water, a boardwalk
//              between them with a stair at every end, the smokehouse with the one warm
//              chimney, eel traps, and a bell buoy that answers the wind.
//   THE CUT    ridge. Four cottages on the quarry floor under two cut terraces, a lime kiln
//              that is the warmest thing for a mile, a rope hoist, and a ramp of quarry fill
//              the car climbs to park on the lower terrace, above the road.
//   HIGHWOOD   pines. The platforms are still up in the big trees — the party is still up
//              there, on every rail — but the people came down. Four cabins on the ground,
//              a fire, a long table, and lanterns strung between the trunks.
//
// Each one has, at the road end (local +Z: places.js turns every site so the road it was
// placed from is on +Z), a LOOKOUT POST, a fire with benches, three authored ATTACK points
// for the defence (hamlet-defence.js), and one house with a BED and a door for the host.
// HAMLET_PLAN below is that shared anatomy, read by hamlet-life.js and hamlet-defence.js.
//
// SAME CONTRACT as sites.js's other BUILDERS: { landmark(api), body(api) } returning
// { solid, glow, moving, glowColour }. Every collider is emitted here beside the geometry it
// belongs to. Guarded for tests/sites.mjs's stub api (emit returns -1, heightAt constant),
// and it keeps every flat glow pane under the 2 m^2 ledger.

// D17: where the gravel track to each hamlet actually runs. roads.js owns it and imports no
// three, so this direction is safe and there is no cycle — the two lit posts at the ends of
// the track are placed off the real polyline instead of off a second copy of the numbers.
import { HAMLET_TRACK_BY_SITE } from './roads.js';

/* ------------------------------------------------------------ the shared anatomy -- */
// Local coordinates in each hamlet's frame (+Z toward the road). `host` is the bedroom house;
// houseDoor()/houseInside() below turn it into the door point and the spot beside the bed.
// `y` on a point is metres above the pad the thing stands at (hamlet-life re-floors it).

export const HAMLET_PLAN = Object.freeze({
  eelwater: {
    post: { x: 0, z: 30, yaw: 0 },
    fire: [-7, 31],
    attack: [[-14, 36], [0, 39], [14, 36]],
    host: { x: -8, z: 9.95, yaw: 0, w: 5.4, d: 4.8, top: 0.55 },
  },
  'the-cut': {
    post: { x: 0, z: 28, yaw: 0 },
    fire: [-1, 12],
    attack: [[-16, 36], [0, 40], [16, 36]],
    host: { x: -9.5, z: 7, yaw: -Math.PI * 0.5, w: 6.2, d: 5.4, top: 0.157 },
  },
  highwood: {
    post: { x: 0, z: 25, yaw: 0 },
    fire: [0, 1],
    attack: [[-13, 30], [0, 33], [13, 30]],
    host: { x: -17, z: -4, yaw: -Math.PI * 0.5, w: 5.4, d: 4.8, top: 0.157 },
  },
});

/** A house-frame point in hamlet-local coordinates. The frame is the one every box here is
 *  drawn in: local +Z turned by `yaw` about Y. */
function houseAt(h, lx, lz) {
  const c = Math.cos(h.yaw || 0), s = Math.sin(h.yaw || 0);
  return { x: h.x + lx * c + lz * s, z: h.z - lx * s + lz * c };
}
/** Just outside the doorway, where 'E · COME INSIDE' is offered. */
export function houseDoor(h) { return houseAt(h, 0, -h.d * 0.5 - 0.55); }
/** Inside, in front of the bed: where the host's rest carries you. */
export function houseInside(h) { return houseAt(h, 0.35, h.d * 0.5 - 2.0); }

/* -------------------------------------------------------------------- the builders -- */

const ON_APRON = 0.037;   // sites.js ON_APRON (APRON_LIFT 0.025 + 0.012). sites.js imports this
                          // file, so it cannot be imported back; the number is pinned here.
const RUN = 0.34;         // m per stair tread: a real step, deep enough for a boot
const RISE_MAX = 0.26;    // m: the tallest single rise before a stair reads as a ladder;
                          // well under the player's STEP_UP 0.45, so every tread is walked
const RIM = { eelwater: 41.6, 'the-cut': 42.9, highwood: 34.6 };   // placedata flat.radius x blend:
                          // inside this the pad is exactly level (measured with terrain.js);
                          // nothing standable is built outside it

export function makeHamletBuilders({ kits, C, GLOW, groundY }) {
  // The glow kit takes a LINEAR [r, g, b]; GLOW.* are sRGB hexes and are only for the
  // glowColour a builder returns. Two different things, one letter apart, so they are named.
  const LAMP = [1, 0.70, 0.38];     // a filament behind dirty glass
  const EMBER = [1, 0.48, 0.15];    // fire, a kiln mouth, a cut pumpkin
  const CANDLE = [1, 0.62, 0.30];   // one flame on a bedside crate
  const P = {
    board: [0.078, 0.058, 0.040], post: [0.052, 0.040, 0.030],
    tar: [0.030, 0.029, 0.028], water: [0.014, 0.020, 0.022],
    plank: [0.092, 0.072, 0.050], slate: [0.048, 0.050, 0.052],
    lime: [0.148, 0.144, 0.130], dust: [0.120, 0.116, 0.104],
    stone: [0.074, 0.075, 0.070], rope: [0.104, 0.086, 0.056],
    iron: [0.058, 0.064, 0.066], moss: [0.038, 0.058, 0.046],
    pumpkin: [0.240, 0.108, 0.026], paper: [0.230, 0.222, 0.196],
    bark: [0.062, 0.048, 0.036], canvas: [0.126, 0.118, 0.098],
    mud: [0.040, 0.036, 0.030], blanket: [0.070, 0.036, 0.034],
    drum: [0.090, 0.050, 0.036], reed: [0.052, 0.062, 0.040],
  };

  /** A box and its collider in one call, so geometry and collision cannot disagree. */
  const solid = (k, api, w, h, d, x, y, z, col, yaw, tag, extra) => {
    k.solid.box(w, h, d, x, y, z, col, yaw || 0);
    api.emit(Object.assign({
      kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw: yaw || 0,
      y0: y - h * 0.5, y1: y + h * 0.5, tag: tag || 'wood',
    }, extra || null));
  };

  /**
   * A FILLED floor. Drawn and collided from `base` (at or under the ground it stands on) up
   * to `top`, standable. This is the whole fix for "you could walk under it": there is no
   * under.
   */
  const block = (k, api, w, d, x, z, base, top, col, yaw, tag) => {
    const h = top - base;
    k.solid.box(w, h, d, x, base + h * 0.5, z, col, yaw || 0);
    api.emit({ kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw: yaw || 0,
      y0: base, y1: top, tag: tag || 'floor', standable: true, climbable: false });
  };

  /**
   * A STAIR: stepped filled solids climbing along +Z of its own frame, bottom tread at
   * (x, z) on `bottom`, top tread level with `top`. Returns the run, so a caller can put the
   * bottom where the top has to land.
   */
  const stair = (k, api, x, z, yaw, bottom, top, width, col) => {
    const n = Math.max(1, Math.ceil((top - bottom) / RISE_MAX)), rise = (top - bottom) / n;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (let i = 0; i < n; i++) {
      const lz = (i + 0.5) * RUN;
      block(k, api, width, RUN + 0.02, x + lz * s, z + lz * c, bottom - 0.25, bottom + (i + 1) * rise, col, yaw, 'step');
    }
    return n * RUN;
  };
  const stairRun = (bottom, top) => Math.max(1, Math.ceil((top - bottom) / RISE_MAX)) * RUN;

  /** A lantern on a post: the emissive fitting; hamlet-life borrows the one real light. */
  const lamp = (k, x, y, z, h, col) => {
    k.solid.box(0.12, h, 0.12, x, y + h * 0.5, z, col || P.post);
    k.solid.box(0.42, 0.10, 0.42, x, y + h + 0.06, z, P.iron);
    k.glow.cyl(0.24, 0.20, 0.50, 10, x, y + h - 0.28, z, LAMP);
  };

  /**
   * D17 — THE WAY IN, at both ends of the gravel track roads.js runs to this hamlet.
   *
   * The problem this answers was measured, not guessed: the three hamlets sat 95-136 m off
   * the nearest centreline with no spur, no junction and nothing at the roadside, so from a
   * car at night there was no reason to believe a village was over there and no way to drive
   * to it if you did. roads.js is the way to drive; this is the pair of things you SEE.
   *
   * One marker where the track leaves the asphalt and one where it stops at the pad: a post,
   * a hooded lantern on top of it, and a whitewashed board under that, turned across the
   * track so headlights coming down the road take it flat. Both go in the LANDMARK, which
   * places.js builds once into a group that is never streamed and never culled — so they
   * draw from the road however far out you are, which a body in a chunk would not.
   *
   * No words on it. Two lit posts sixty to a hundred and twenty metres apart with a gravel
   * road between them is the whole sentence.
   */
  const wayIn = (k, api, lx, lz, yaw) => {
    const g = groundY(api, lx, lz);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const H = 5.2;
    k.solid.box(0.17, H, 0.17, lx, g + H * 0.5, lz, P.post, yaw);
    // the hood and the lantern under it: the same fitting as every lamp in the hamlet,
    // one size up, so the pair reads as the village's own and not as county road furniture
    k.solid.box(0.56, 0.12, 0.56, lx, g + H + 0.07, lz, P.iron, yaw);
    k.glow.cyl(0.27, 0.22, 0.62, 10, lx, g + H - 0.33, lz, LAMP);
    // THE WHITEWASHED BOARD. P.paper is the brightest albedo in this palette; square across
    // the track, so a headlight on the road hits it flat instead of edge-on.
    k.solid.box(1.30, 0.62, 0.07, lx + s * 0.11, g + 2.45, lz + c * 0.11, P.paper, yaw);
    k.solid.box(1.34, 0.08, 0.10, lx + s * 0.12, g + 2.80, lz + c * 0.12, P.post, yaw);
    for (const side of [-1, 1]) {
      k.solid.box(1.05, 0.09, 0.09, lx + side * 0.42 * c, g + 0.72, lz - side * 0.42 * s, P.post, yaw, 0, side * 0.62);
    }
    api.emit({ kind: 'circle', x: lx, z: lz, r: 0.34, y0: g - 0.4, y1: g + H, tag: 'wood' });
  };

  /**
   * Both markers for one hamlet, taken off the REAL track polyline roads.js authored (which
   * is bowed, and by up to 7 m near the junction — a marker placed against the straight
   * junction-to-centre chord instead landed 1.4 m from the county loop's own centreline,
   * which is inside its asphalt). The polyline is in world coordinates; the landmark frame is
   * the site's, so each point is rotated back into local here — the inverse of api.wx/wz,
   * which is that same rotation transposed. A hamlet with no track builds nothing.
   */
  const trackMarkers = (k, api) => {
    const pts = HAMLET_TRACK_BY_SITE[api.site.id];
    if (!pts || pts.length < 2) return;
    const cy = Math.cos(api.yaw), sy = Math.sin(api.yaw);
    const local = (p) => {
      const dx = p[0] - api.site.x, dz = p[1] - api.site.z;
      return [dx * cy - dz * sy, dx * sy + dz * cy];
    };
    const OFF = 3.4;      // m off the 4 m gravel: clear of it, close enough to belong to it
    /**
     * A post beside the track, `along` metres from control point `i` toward control point `j`
     * and OFF metres to one side of the line between them, turned `turn` off that heading.
     */
    const beside = (i, j, along, turn) => {
      const a = local(pts[i]), b = local(pts[j]);
      const ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez) || 1;
      const ux = ex / L, uz = ez / L;
      // heading 0 is +Z and forward is (sin, cos), so a tangent as a heading is atan2(ux, uz)
      const yaw = Math.atan2(ux, uz);
      wayIn(k, api, a[0] + ux * along - Math.cos(yaw) * OFF, a[1] + uz * along + Math.sin(yaw) * OFF, yaw + turn);
    };
    // AT THE JUNCTION, twelve metres in off the asphalt. The reader is on the county road
    // driving ACROSS the mouth of the track, so the board turns square to the gravel and
    // shows a flat face to traffic coming either way. Twelve, not nought: a post 3.4 m off
    // the track AT the mouth is 1.4-1.7 m off the county road's own centreline, which is
    // inside its asphalt — measured, and the reason this walks in before it steps aside.
    beside(0, 1, 12, Math.PI * 0.5);
    // AT THE ROAD END, where you get out of the car: the board faces back up the track you
    // came down, and the lookout post and the fire are the next things past it.
    beside(pts.length - 1, pts.length - 2, 0, Math.PI);
  };

  /** The fire: a stone ring, embers, two log benches. The rover light sits over it. */
  const fire = (k, api, x, z, y) => {
    for (let i = 0; i < 9; i++) {
      const a = i * (Math.PI * 2 / 9);
      k.solid.cyl(0.17, 0.20, 0.24, 7, x + Math.sin(a) * 0.66, y + 0.12, z + Math.cos(a) * 0.66, P.stone, a);
    }
    api.emit({ kind: 'circle', x, z, r: 0.78, y0: y - 0.2, y1: y + 0.34, tag: 'stone', standable: true, climbable: false });
    k.solid.box(0.14, 0.14, 0.95, x, y + 0.14, z, P.post, 0.5);
    k.solid.box(0.14, 0.14, 0.90, x, y + 0.22, z, P.post, -0.7);
    k.glow.cyl(0.36, 0.44, 0.34, 10, x, y + 0.22, z, EMBER);
    // 1.2 x 1.2: tests/sites.mjs holds every horizontal additive pane in the county under
    // 2 m^2, because a big flat one is a glowing carpet from above.
    k.glow.box(1.2, 0.08, 1.2, x, y + 0.04, z, EMBER);
    for (const side of [-1, 1]) {
      solid(k, api, 0.42, 0.40, 2.2, x + side * 1.9, y + 0.20, z, P.post, 0, 'wood');
    }
  };

  /** Two fuel drums and a hand pump: where the gas person stands. */
  const fuel = (k, api, x, z, y, yaw) => {
    const c = Math.cos(yaw || 0), s = Math.sin(yaw || 0);
    for (const o of [-0.4, 0.4]) {
      const dx = x + o * c, dz = z - o * s;
      k.solid.cyl(0.30, 0.30, 0.88, 12, dx, y + 0.44, dz, P.drum);
      k.solid.cyl(0.31, 0.31, 0.05, 12, dx, y + 0.62, dz, P.iron);
      api.emit({ kind: 'circle', x: dx, z: dz, r: 0.32, y0: y - 0.1, y1: y + 0.88, tag: 'drum', standable: true });
    }
    const px = x + 1.0 * c, pz = z - 1.0 * s;
    solid(k, api, 0.26, 1.1, 0.26, px, y + 0.55, pz, P.iron, yaw, 'metal');
    k.solid.box(0.06, 0.06, 0.7, px, y + 1.05, pz, P.iron, (yaw || 0) + 0.9);
  };

  /**
   * THE LOOKOUT POST at the road end: a 2.8 m square platform 1.2 m up (filled), a rail on
   * the three open sides, a lantern on the road corner, and a stair down the hamlet side.
   * The lookout stands on it; that is where 'E · STAND WITH US' is asked.
   */
  const lookout = (k, api, x, z, yaw, ground, col) => {
    const top = ground + 1.2, c = Math.cos(yaw), s = Math.sin(yaw);
    const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    block(k, api, 2.8, 2.8, x, z, ground - 0.3, top, col, yaw, 'floor');
    for (const [lx, lz, lw, ld] of [[0, 1.3, 2.8, 0.09], [1.3, 0, 0.09, 2.8], [-1.3, 0, 0.09, 2.8]]) {
      const [rx, rz] = at(lx, lz);
      k.solid.box(lw, 0.09, ld, rx, top + 1.0, rz, P.post, yaw);
    }
    for (const [lx, lz] of [[-1.3, 1.3], [1.3, 1.3], [-1.3, -1.3], [1.3, -1.3]]) {
      const [px, pz] = at(lx, lz);
      k.solid.box(0.11, 1.05, 0.11, px, top + 0.52, pz, P.post, yaw);
    }
    const [lx, lz] = at(1.15, 1.15);
    lamp(k, lx, top, lz, 2.3);
    const [bx, bz] = at(0, -1.4 - stairRun(ground, top));
    stair(k, api, bx, bz, yaw, ground, top, 1.3, col);
  };

  /**
   * A HOUSE. A filled plinth for a floor, four walls with a doorway on the frame's -Z, a
   * pitched roof, a lit window beside the door and one on the side. `bed` builds the host's
   * bed against the back wall (the point hamlet-defence carries you to is houseInside());
   * `leaf` stands the door open against the inside of the wall.
   */
  const house = (k, api, h) => {
    const { x, z, w, d, top } = h, yaw = h.yaw || 0, hh = h.h, hw = w * 0.5, hd = d * 0.5;
    const base = h.base !== undefined ? h.base : top - 0.40;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const doorW = h.doorW || 1.25;
    block(k, api, w + 0.5, d + 0.5, x, z, base, top, h.floorCol || h.wall, yaw, 'floor');
    let [px, pz] = at(0, hd - 0.09);
    solid(k, api, w, hh, 0.18, px, top + hh * 0.5, pz, h.wall, yaw, 'wall');
    for (const side of [-1, 1]) {
      [px, pz] = at(side * (hw - 0.09), 0);
      solid(k, api, 0.18, hh, d, px, top + hh * 0.5, pz, h.wall, yaw, 'wall');
    }
    const cheek = (w - doorW) * 0.5;
    for (const side of [-1, 1]) {
      [px, pz] = at(side * (hw - cheek * 0.5), -(hd - 0.09));
      solid(k, api, cheek, hh, 0.18, px, top + hh * 0.5, pz, h.wall, yaw, 'wall');
    }
    [px, pz] = at(0, -(hd - 0.09));
    solid(k, api, doorW, hh - 2.05, 0.18, px, top + 2.05 + (hh - 2.05) * 0.5, pz, h.wall, yaw, 'lintel');
    for (const side of [-1, 1]) {
      const [rx, rz] = at(0, side * hd * 0.5);
      k.solid.box(w + 0.6, 0.11, d * 0.62, rx, top + hh + 0.46, rz, h.roof, yaw, 0, side * 0.42);
    }
    [px, pz] = at(0, 0);
    k.solid.box(w + 0.7, 0.14, 0.24, px, top + hh + 0.90, pz, h.roof, yaw);
    api.emit({ kind: 'obb', x: px, z: pz, halfX: (w + 0.6) * 0.5, halfZ: hd, yaw,
      y0: top + hh + 0.30, y1: top + hh + 0.98, tag: 'roof', standable: true, climbable: false });
    const [wx, wz] = at(hw * 0.55, -hd - 0.02);
    k.glow.box(0.92, 0.72, 0.05, wx, top + 1.55, wz, LAMP, yaw);
    const [sx, sz] = at(hw + 0.02, 0.3);
    k.glow.box(0.05, 0.66, 0.84, sx, top + 1.55, sz, LAMP, yaw);
    if (h.chimney) {
      const [cx, cz] = at(-hw + 0.5, -0.3);
      solid(k, api, 0.72, hh + 1.9, 0.72, cx, top + (hh + 1.9) * 0.5, cz, h.chimneyCol || h.wall, yaw, 'chimney');
    }
    if (h.leaf) {
      const [lx, lz] = at(-doorW * 0.5 - 0.02, -hd + 0.57);
      solid(k, api, 0.06, 2.0, 0.95, lx, top + 1.0, lz, h.leafCol || h.roof, yaw, 'door');
    }
    if (h.bed) {
      const bx = 0.35, bz = hd - 0.75;
      let [qx, qz] = at(bx, bz);
      k.solid.box(1.95, 0.36, 0.95, qx, top + 0.18, qz, P.post, yaw);
      k.solid.box(1.75, 0.12, 0.82, qx, top + 0.42, qz, P.blanket, yaw);
      api.emit({ kind: 'obb', x: qx, z: qz, halfX: 0.98, halfZ: 0.48, yaw,
        y0: top, y1: top + 0.48, tag: 'wood', standable: true, climbable: false });
      [qx, qz] = at(bx - 0.68, bz);
      k.solid.box(0.42, 0.10, 0.55, qx, top + 0.53, qz, P.paper, yaw);
      [qx, qz] = at(bx + 1.32, bz + 0.12);
      solid(k, api, 0.46, 0.46, 0.46, qx, top + 0.23, qz, P.post, yaw, 'wood');
      k.solid.cyl(0.03, 0.03, 0.12, 6, qx, top + 0.52, qz, P.paper);
      k.glow.cyl(0.035, 0.02, 0.08, 6, qx, top + 0.62, qz, CANDLE);
    }
  };

  /** A boardwalk run over the water: drawn as a thin deck on posts, collided as the filled
   *  block from the water floor to the boards, so nothing fits in the 0.45 m under it. */
  const boards = (k, api, x0, z0, x1, z1, base, top, width, rail) => {
    const mx = (x0 + x1) * 0.5, mz = (z0 + z1) * 0.5;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const yaw = Math.atan2(x1 - x0, z1 - z0);
    k.solid.box(width, 0.16, len, mx, top - 0.08, mz, P.board, yaw);
    api.emit({ kind: 'obb', x: mx, z: mz, halfX: width * 0.5, halfZ: len * 0.5, yaw,
      y0: base, y1: top, tag: 'deck', standable: true, climbable: false });
    const n = Math.max(2, Math.round(len / 3.2)), c = Math.cos(yaw), s = Math.sin(yaw);
    for (let i = 0; i <= n; i++) {
      const t = i / n, px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
      k.solid.box(0.17, top - base + 0.3, 0.17, px, (top + base) * 0.5, pz, P.post);
      if (rail && i % 2 === 0) {
        k.solid.box(0.09, 0.95, 0.09, px + c * (width * 0.5 - 0.07), top + 0.48, pz - s * (width * 0.5 - 0.07), P.post);
      }
    }
    if (rail) k.solid.box(0.07, 0.08, len, mx + c * (width * 0.5 - 0.07), top + 0.92, mz - s * (width * 0.5 - 0.07), P.post, yaw);
  };

  return {

    /* ==================================================================== EELWATER == */
    // A fen village on low stilts. The WATER IS A FLOOR NOW: a black sheet 0.10 m over the
    // pad with its own standable collider, so you wade it ankle-deep and never fall through
    // it, and the boards ride 0.45 m over that with a stair at every end. The road side is
    // mud: the lookout post, the fire, the fuel drums. Everything else is over the water.
    stilts: {
      landmark(api) {
        const k = kits(), y = api.padY;
        const WX = 0, WZ = -6, WR = 34;   // the water disc: its far edge at 40 m from the centre, inside RIM.eelwater
        k.solid.cyl(WR, WR, 0.08, 48, WX, y + 0.06, WZ, P.water);
        api.emit({ kind: 'circle', x: WX, z: WZ, r: WR, y0: y - 0.3, y1: y + 0.10, tag: 'floor',
          standable: true, climbable: false, authored: true });
        // reeds round the edge of it: the shoreline, and the reason it reads as a fen
        for (let i = 0; i < 26; i++) {
          const a = i * 0.2417 + 0.1, r = WR + 0.4 + (i % 3) * 0.7;
          const rx = WX + Math.sin(a) * r, rz = WZ + Math.cos(a) * r;
          if (Math.hypot(rx, rz) > RIM.eelwater - 1) continue;
          k.solid.cone(0.55 + (i % 2) * 0.2, 1.3 + (i % 3) * 0.25, 5, rx, y + 0.62, rz, P.reed, i * 0.7);
        }
        // the bell buoy: the far read, and the only thing above the houses
        const bx = -22, bz = -19;
        k.solid.box(1.9, 0.30, 1.9, bx, y + 0.28, bz, P.iron);
        for (const side of [-1, 1]) for (const zz of [-1, 1]) {
          k.solid.box(0.11, 5.4, 0.11, bx + side * 0.62, y + 3.0, bz + zz * 0.62, P.iron, side * zz * 0.05);
        }
        k.solid.box(1.35, 0.20, 1.35, bx, y + 5.7, bz, P.iron);
        k.glow.cyl(0.46, 0.58, 0.88, 12, bx, y + 5.16, bz, LAMP);
        api.emit({ kind: 'circle', x: bx, z: bz, r: 1.1, y0: y, y1: y + 6.0, tag: 'metal' });
        trackMarkers(k, api);   // D17: the two lit posts at the ends of the gravel track
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
      },
      body(api) {
        const k = kits(), y = api.padY;
        const WATER = y + 0.10;          // the water floor (landmark)
        const DECK = y + 0.55;           // the boards: 0.45 m over the water
        const MUD = y;                   // the shore on the road side

        // THE ROAD END, on the mud: the post, the fire, the drums.
        lookout(k, api, 0, 30, 0, MUD, P.board);
        fire(k, api, -7, 31, MUD + ON_APRON);
        fuel(k, api, 7.5, 31, MUD + ON_APRON, 0);
        lamp(k, -3.4, MUD, 33.6, 2.6);
        lamp(k, 3.4, MUD, 33.6, 2.6);

        // THE BOARDWALK. One spine from the shore to the far water, three spurs, and a
        // STAIR at every end: down to the mud at the shore, down to the water everywhere
        // else. Runs are split under 24 m half-lengths (collision's prop limit).
        boards(k, api, 0, 24, 0, 0.5, WATER, DECK, 1.9, true);
        boards(k, api, 0, 0.5, 0, -24, WATER, DECK, 1.9, true);
        boards(k, api, -0.9, 6, -21, 6, WATER, DECK, 1.9, false);
        boards(k, api, 0.9, -6, 21, -6, WATER, DECK, 1.9, false);
        boards(k, api, -0.9, -19, -4.4, -19, WATER, DECK, 1.9, false);
        stair(k, api, 0, 24 + stairRun(MUD, DECK), Math.PI, MUD, DECK, 1.9, P.board);      // shore end, down to the mud
        stair(k, api, 0, -24 - stairRun(WATER, DECK), 0, WATER, DECK, 1.9, P.board);       // far end, down to the water
        stair(k, api, -21 - stairRun(WATER, DECK), 6, Math.PI * 0.5, WATER, DECK, 1.9, P.board);   // west spur end
        stair(k, api, 21 + stairRun(WATER, DECK), -6, -Math.PI * 0.5, WATER, DECK, 1.9, P.board);  // east spur end

        // FIVE HOUSES on their own filled platforms, each platform lapping a spur by a
        // board's width so there is no gap of water at any door. Doors face the spur.
        const houses = [
          { x: -8, z: 9.95, yaw: 0, w: 5.4, d: 4.8, h: 2.75, bed: true, leaf: true, chimney: true },   // Ness: the host
          { x: -17, z: 9.95, yaw: 0, w: 4.8, d: 4.6, h: 2.6 },
          { x: -8, z: 2.05, yaw: Math.PI, w: 5.2, d: 4.8, h: 2.7 },
          { x: 8, z: -9.95, yaw: Math.PI, w: 5.2, d: 4.8, h: 2.7 },
          { x: 17, z: -9.95, yaw: Math.PI, w: 4.6, d: 4.4, h: 2.55 },
        ];
        for (const h of houses) {
          block(k, api, h.w + 1.8, h.d + 1.8, h.x, h.z, WATER, DECK, P.board, h.yaw, 'deck');
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            k.solid.box(0.20, DECK - WATER + 0.4, 0.20, h.x + sx * (h.w * 0.5 + 0.7), (DECK + WATER) * 0.5, h.z + sz * (h.d * 0.5 + 0.7), P.post);
          }
          house(k, api, { ...h, top: DECK + 0.02, base: DECK - 0.2, wall: P.plank, roof: P.tar, floorCol: P.board, chimneyCol: P.slate });
        }

        // THE SMOKEHOUSE, off the far end of the spine; its chimney is the one warm thing.
        const sx = -8.4, sz = -19;
        block(k, api, 7.4, 6.6, sx, sz, WATER, DECK, P.board, 0, 'deck');
        for (const ox of [-1, 1]) for (const oz of [-1, 1]) {
          k.solid.box(0.22, DECK - WATER + 0.4, 0.22, sx + ox * 3.2, (DECK + WATER) * 0.5, sz + oz * 2.8, P.post);
        }
        house(k, api, { x: sx, z: sz, yaw: Math.PI * 0.5, w: 5.6, d: 5.0, h: 3.1, top: DECK + 0.02, base: DECK - 0.2,
          wall: P.plank, roof: P.tar, floorCol: P.board, doorW: 1.4 });
        solid(k, api, 1.05, 3.4, 1.05, sx + 1.8, DECK + 3.9, sz + 1.6, P.slate, 0.12, 'chimney');
        k.glow.box(0.92, 0.42, 0.92, sx + 1.8, DECK + 5.62, sz + 1.6, EMBER);
        k.glow.box(0.06, 1.10, 1.4, sx + 2.9, DECK + 1.15, sz, EMBER);        // the open door, on the spur side
        k.glow.box(1.10, 0.10, 1.10, sx, DECK + 0.04, sz, EMBER);             // 1.21 m^2 of firelight on the boards

        // EEL TRAPS: wicker cones on the water, on lines off the posts. Not standable, not
        // in the way — the thing that says what these people eat and how.
        for (let i = 0; i < 14; i++) {
          const a = i * 2.39996;
          const tx = Math.sin(a) * (9 + (i % 5) * 3.6), tz = -6 + Math.cos(a) * (10 + (i % 4) * 3.1);
          k.solid.cyl(0.24, 0.10, 0.92, 9, tx, WATER + 0.42, tz, P.rope, i * 0.4, Math.PI * 0.46, 0);
          k.solid.box(0.06, 0.06, 1.15, tx, WATER + 0.78, tz, P.post, i * 0.4);
        }
        // the lanterns, hung on posts down the spine, standing in the water beside it
        for (const lz of [-22, -14, -3, 4, 12, 21]) lamp(k, 1.25, WATER, lz, 2.9);
        void groundY;
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
      },
    },

    /* ===================================================================== THE CUT == */
    // Cottages on the quarry floor under two cut terraces. The terraces are SOLID now:
    // blocks of stone from the pad to their tops, with a stair up each, so a person on one
    // is standing on rock and nobody walks under a hung slab. The RAMP is quarry fill the
    // car climbs to the lower terrace, the only place in the county you park above the road.
    'quarry-cut': {
      landmark(api) {
        const k = kits(), y = api.padY;
        // THE FACE. Behind the terraces, stepping up and away — the road comes in from +Z and
        // this is what the hamlet has its back to.
        for (let i = 0; i < 9; i++) {
          const z = -19 - i * 2.6, h = 5.0 + i * 1.35;
          k.solid.box(46 - i * 1.4, h, 3.0, (i % 3 - 1) * 1.1, y + h * 0.5, z, i & 1 ? P.stone : P.slate, i * 0.006);
          api.emit({ kind: 'obb', x: (i % 3 - 1) * 1.1, z, halfX: (46 - i * 1.4) * 0.5, halfZ: 1.5,
            yaw: i * 0.006, y0: y - 0.4, y1: y + h, tag: 'stone', standable: true, climbable: false });
        }
        // THE LIME KILN, on the quarry floor west of the lane: a stone bottle with a fire in
        // the bottom of it, the first warm thing you see coming in from the road.
        const kx = -19, kz = 14, kb = y;
        for (let i = 0; i < 6; i++) {
          const r = 3.3 - i * 0.42;
          k.solid.cyl(r, r - 0.25, 1.35, 14, kx, kb + 0.68 + i * 1.3, kz, i & 1 ? P.lime : P.stone);
        }
        api.emit({ kind: 'circle', x: kx, z: kz, r: 3.4, y0: kb - 0.4, y1: kb + 8.4, tag: 'stone' });
        k.solid.box(2.4, 2.3, 0.9, kx, kb + 1.15, kz + 3.1, P.iron);
        k.glow.box(2.05, 1.85, 0.35, kx, kb + 1.08, kz + 3.40, EMBER);
        // 1.4 x 1.4, not 3.2 x 3.2: tests/sites.mjs holds the county to 2 square metres of
        // HORIZONTAL additive pane anywhere, because a big flat one is a glowing carpet from
        // above and reads as a bug rather than as firelight.
        k.glow.box(1.4, 0.10, 1.4, kx, kb + 0.06, kz + 2.0, EMBER);       // firelight on the dust
        k.glow.cyl(1.35, 1.95, 1.1, 12, kx, kb + 8.4, kz, EMBER);         // the plume off the top
        trackMarkers(k, api);   // D17: the two lit posts at the ends of the gravel track
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.ember };
      },
      body(api) {
        const k = kits(), y = api.padY;
        const LOW = 3.4, HIGH = 7.2;
        const GF = y + ON_APRON + 0.12;   // a cottage floor: one low step up off the dust

        // THE TERRACES: filled blocks, BOTH from under the pad — the upper one is 7.7 m of
        // rock, not a shelf hung behind the lower one that you could walk in under from the
        // open ends. The lower one takes the ramp at its east end.
        block(k, api, 44, 9.5, 2, -5.75, y - 0.5, y + LOW, P.dust, 0, 'floor');
        block(k, api, 28, 8.1, -2, -14.55, y - 0.5, y + HIGH, P.dust, 0, 'floor');
        // stairs: the quarry floor up to the lower terrace at the lane, and lower to upper
        stair(k, api, 0, -1.0 + stairRun(y, y + LOW), Math.PI, y, y + LOW, 3.2, P.stone);
        stair(k, api, 6, -10.5 + stairRun(y + LOW, y + HIGH), Math.PI, y + LOW, y + HIGH, 2.6, P.stone);

        // THE RAMP the car climbs. 34 m for 3.3 m of rise is under 6 degrees, nothing to a
        // car and nothing to walk. Twelve overlapping slabs of fill, each solid from below
        // the pad to its top, so the wheels never find a seam and nobody walks under it.
        for (let i = 0; i < 12; i++) {
          const t = i / 11, z = 34 - t * 33.8, top = y + 0.1 + t * (LOW - 0.1);
          block(k, api, 7.2, 3.4, 21.5 - t * 1.0, z, y - 0.5, top, P.dust, 0.02, 'floor');
        }
        // a kerb of cut blocks down the ramp's outer edge, so its line reads at night
        for (let i = 0; i < 11; i++) {
          const t = (i + 0.5) / 11, z = 34 - t * 33.8, top = y + 0.1 + t * (LOW - 0.1);
          k.solid.box(0.5, 0.34, 1.1, 21.5 - t * 1.0 + 3.35, top + 0.17, z, P.lime, 0.02);
        }

        // FOUR COTTAGES on the quarry floor, two a side of the lane, doors to the lane.
        const cots = [
          { x: -9.5, z: 7, yaw: -Math.PI * 0.5, w: 6.2, d: 5.4, h: 2.9, bed: true, leaf: true },   // Ilke: the host
          { x: -9.5, z: 17, yaw: -Math.PI * 0.5, w: 5.8, d: 5.2, h: 2.8 },
          { x: 9, z: 7, yaw: Math.PI * 0.5, w: 6.0, d: 5.2, h: 2.85 },
          { x: 9, z: 17, yaw: Math.PI * 0.5, w: 5.6, d: 5.0, h: 2.75 },
          // and two up on the upper terrace, backs to the face: the old quarry housing
          { x: -10, z: -14.5, yaw: Math.PI, w: 5.6, d: 5.0, h: 2.75, top: y + HIGH + 0.02, base: y + HIGH - 0.2 },
          { x: 2, z: -14.5, yaw: Math.PI, w: 5.4, d: 4.8, h: 2.7, top: y + HIGH + 0.02, base: y + HIGH - 0.2 },
        ];
        for (const c of cots) {
          house(k, api, { top: GF, base: y - 0.3, ...c, wall: P.stone, roof: P.slate, floorCol: P.dust, chimney: true, chimneyCol: P.stone });
          // a stack of cut blocks by every door
          const cc = Math.cos(c.yaw), cs = Math.sin(c.yaw);
          const top = c.top !== undefined ? c.top : GF;
          for (let i = 0; i < 5; i++) {
            const lx = c.w * 0.5 + 0.9, lz = -c.d * 0.5 - 0.2 + (i % 2) * 0.12;
            k.solid.box(0.95, 0.34, 0.62, c.x + lx * cc + lz * cs, top + 0.17 + i * 0.34, c.z - lx * cs + lz * cc, P.lime, c.yaw + (i % 2 ? 0.05 : -0.05));
          }
        }

        // THE ROAD END: the post, the fire in the lane, the fuel by the ramp foot.
        lookout(k, api, 0, 28, 0, y, P.dust);
        fire(k, api, -1, 12, y + ON_APRON);
        fuel(k, api, 13, 24, y + ON_APRON, 0.3);

        // Lamps on posts down the lane and along both terrace edges, so the shape of the
        // cut reads at night.
        for (const [lx, lz, top] of [[-4, 22, 0], [4, 22, 0], [-4, 1, 0], [4.5, 1, 0],
          [-14, -1.6, LOW], [14, -1.6, LOW], [22, -1.6, LOW], [-8, -11.1, HIGH], [6, -11.1, HIGH]]) {
          lamp(k, lx, y + top, lz, 2.7, P.iron);
        }

        // THE ROPE HOIST at the west end of the lower terrace: a timber gantry with a
        // hanging block, the one piece of machinery in the hamlet and how the upper
        // terrace was ever built.
        for (const side of [-1, 1]) {
          k.solid.box(0.28, HIGH - LOW + 3.0, 0.28, -17 + side * 1.6, y + LOW + (HIGH - LOW + 3.0) * 0.5, -6, P.board);
          api.emit({ kind: 'obb', x: -17 + side * 1.6, z: -6, halfX: 0.18, halfZ: 0.18, yaw: 0,
            y0: y + LOW, y1: y + HIGH + 3.0, tag: 'wood' });
        }
        k.solid.box(4.4, 0.34, 0.34, -17, y + HIGH + 2.8, -6, P.board);
        k.solid.box(0.10, 2.4, 0.10, -17, y + HIGH + 1.5, -6, P.rope);
        k.solid.box(0.9, 0.7, 0.9, -17, y + HIGH - 0.1, -6, P.board, 0.18);
        void groundY;
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
      },
    },

    /* ==================================================================== HIGHWOOD == */
    // The platforms are still up in the big pines with the party on every rail, and the
    // people came down. Four cabins on the ground between the trunks, a fire, the long
    // table, and paper lanterns strung trunk to trunk. The ladder is gone: what is up there
    // is the backdrop, and everyone you can talk to is on the ground.
    treehouses: {
      landmark(api) {
        const k = kits(), y = api.padY;
        // The four trunks, tall enough to read from the road with the platforms in them.
        for (const [x, z, h] of [[-9, -7, 21], [8, -6, 23], [10, 9, 20], [-8, 8, 22]]) {
          k.solid.cyl(0.92, 0.62, h, 10, x, y + h * 0.5, z, P.bark);
          api.emit({ kind: 'circle', x, z, r: 0.95, y0: y - 0.5, y1: y + h, tag: 'tree' });
          // the crown, so the silhouette is a pine and not a pole
          for (let i = 0; i < 4; i++) {
            k.solid.cyl(3.4 - i * 0.7, 0.9, 3.0, 9, x, y + h - 4.2 + i * 2.5, z, P.moss);
          }
        }
        trackMarkers(k, api);   // D17: the two lit posts at the ends of the gravel track
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.ember };
      },
      body(api) {
        const k = kits(), y = api.padY;
        const GF = y + ON_APRON + 0.12;
        const TRUNKS = [[-9, -7], [8, -6], [10, 9], [-8, 8]];

        // THE PLATFORMS, as they were: decoration now, nine metres up, out of reach. Their
        // colliders stay so a shot fired up at a lantern stops at the boards.
        const PLAT = [
          { x: -9, z: -7, top: 6.4, w: 7.0, d: 6.4 },
          { x: 8, z: -6, top: 8.2, w: 6.6, d: 6.2 },
          { x: 10, z: 9, top: 7.0, w: 6.4, d: 6.0 },
          { x: -8, z: 8, top: 9.0, w: 6.8, d: 6.4 },
        ];
        for (let i = 0; i < PLAT.length; i++) {
          const p = PLAT[i];
          k.solid.box(p.w, 0.22, p.d, p.x, y + p.top - 0.11, p.z, P.board);
          api.emit({ kind: 'obb', x: p.x, z: p.z, halfX: p.w * 0.5, halfZ: p.d * 0.5, yaw: 0,
            y0: y + p.top - 0.34, y1: y + p.top, tag: 'deck', standable: true, climbable: false });
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            k.solid.box(0.16, 2.2, 0.16, p.x + sx * (p.w * 0.42), y + p.top - 1.4, p.z + sz * (p.d * 0.42), P.board, sx * 0.2);
          }
          for (const [ox, oz, lw, ld] of [[0, p.d * 0.5, p.w, 0.12], [0, -p.d * 0.5, p.w, 0.12],
            [p.w * 0.5, 0, 0.12, p.d], [-p.w * 0.5, 0, 0.12, p.d]]) {
            k.solid.box(lw, 0.10, ld, p.x + ox, y + p.top + 0.98, p.z + oz, P.board);
            for (let n = 0; n < 4; n++) {
              const t = (n + 0.5) / 4 - 0.5;
              k.solid.box(0.10, 1.0, 0.10, p.x + ox + (lw > ld ? t * lw : 0),
                y + p.top + 0.5, p.z + oz + (ld > lw ? t * ld : 0), P.board);
            }
          }
          // a cabin on each, with a lit window and a paper skeleton in it
          house(k, api, { x: p.x, z: p.z + 0.3, yaw: i * Math.PI * 0.5, w: p.w - 2.0, d: p.d - 2.2, h: 2.4,
            top: y + p.top + 0.02, base: y + p.top - 0.2, wall: P.plank, roof: P.tar, floorCol: P.board, doorW: 1.1 });
          for (let n = 0; n < 3; n++) {
            k.glow.cyl(0.11, 0.09, 0.19, 8, p.x - 1.6 + n * 1.6, y + p.top + 2.18, p.z - p.d * 0.42, EMBER);
            k.solid.box(0.05, 0.22, 0.05, p.x - 1.6 + n * 1.6, y + p.top + 2.40, p.z - p.d * 0.42, P.rope);
          }
          for (let b = 0; b < 5; b++) {
            k.solid.box(0.42 - Math.abs(b - 2) * 0.09, 0.05, 0.02,
              p.x, y + p.top + 1.78 - b * 0.13, p.z - p.d * 0.5 + 0.86, P.paper, i * Math.PI * 0.5);
          }
          // JACK-O-LANTERNS on the rail. Still lit. Nobody blew them out.
          for (let n = 0; n < 4; n++) {
            const a = n * Math.PI * 0.5 + 0.4;
            const lx = p.x + Math.sin(a) * (p.w * 0.42), lz = p.z + Math.cos(a) * (p.d * 0.42);
            k.solid.cyl(0.24, 0.21, 0.34, 10, lx, y + p.top + 1.20, lz, P.pumpkin);
            k.glow.cyl(0.22, 0.19, 0.36, 9, lx, y + p.top + 1.20, lz, EMBER);
          }
        }
        // THE ROPE BRIDGES between them, as they were.
        for (const [a, b] of [[0, 1], [1, 2], [2, 3]]) {
          const A = PLAT[a], B = PLAT[b];
          const mx = (A.x + B.x) * 0.5, mz = (A.z + B.z) * 0.5;
          const top = (A.top + B.top) * 0.5;
          const len = Math.hypot(B.x - A.x, B.z - A.z);
          const yaw = Math.atan2(B.x - A.x, B.z - A.z);
          k.solid.box(1.5, 0.22, len, mx, y + top - 0.11, mz, P.board, yaw);
          api.emit({ kind: 'obb', x: mx, z: mz, halfX: 0.75, halfZ: len * 0.5, yaw,
            y0: y + top - 0.34, y1: y + top, tag: 'deck', standable: true, climbable: false });
          for (const side of [-1, 1]) {
            const rx = mx + Math.cos(yaw) * side * 0.72, rz = mz - Math.sin(yaw) * side * 0.72;
            k.solid.box(0.07, 0.07, len, rx, y + top + 0.95, rz, P.rope, yaw);
            const n = Math.max(3, Math.round(len / 2.2));
            for (let i = 0; i <= n; i++) {
              const t = i / n - 0.5;
              k.solid.box(0.05, 0.95, 0.05, rx + Math.sin(yaw) * t * len, y + top + 0.48, rz + Math.cos(yaw) * t * len, P.rope);
            }
          }
        }

        // THE GROUND. Four cabins between the trunks, doors to the fire.
        const cabins = [
          { x: -17, z: -4, yaw: -Math.PI * 0.5, w: 5.4, d: 4.8, h: 2.6, bed: true, leaf: true, chimney: true },   // Wren: the host
          { x: 17, z: -2, yaw: Math.PI * 0.5, w: 5.2, d: 4.6, h: 2.55 },
          { x: -13, z: 15, yaw: 0, w: 5.4, d: 4.8, h: 2.6 },
          { x: 14, z: 16, yaw: 0, w: 5.0, d: 4.6, h: 2.5 },
        ];
        for (const c of cabins) {
          house(k, api, { ...c, top: GF, base: y - 0.3, wall: P.plank, roof: P.tar, floorCol: P.board, chimneyCol: P.stone, doorW: 1.15 });
        }
        fire(k, api, 0, 1, y + ON_APRON);
        // THE LONG TABLE: the party's table, still laid. Benches either side, pumpkins on it.
        solid(k, api, 3.8, 0.12, 0.95, 0, y + ON_APRON + 0.78, -5.5, P.plank, 0, 'wood');
        for (const ox of [-1.5, 1.5]) solid(k, api, 0.18, 0.72, 0.85, ox, y + ON_APRON + 0.36, -5.5, P.post, 0, 'wood');
        for (const side of [-1, 1]) solid(k, api, 3.4, 0.36, 0.34, 0, y + ON_APRON + 0.18, -5.5 + side * 0.95, P.post, 0, 'wood');
        for (let n = 0; n < 3; n++) {
          const px = -1.2 + n * 1.2;
          k.solid.cyl(0.22, 0.19, 0.30, 10, px, y + ON_APRON + 0.99, -5.5, P.pumpkin);
          k.glow.cyl(0.20, 0.17, 0.32, 9, px, y + ON_APRON + 0.99, -5.5, EMBER);
        }
        // paper lanterns strung trunk to trunk at head height and a half: the party's light
        for (let s = 0; s < TRUNKS.length; s++) {
          const [ax, az] = TRUNKS[s], [bx, bz] = TRUNKS[(s + 1) % TRUNKS.length];
          const len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az);
          k.solid.box(0.03, 0.03, len, (ax + bx) * 0.5, y + 3.4, (az + bz) * 0.5, P.rope, yaw);
          for (let n = 1; n < 7; n++) {
            const t = n / 7, sag = Math.sin(t * Math.PI) * 0.35;
            k.glow.cyl(0.12, 0.10, 0.20, 8, ax + (bx - ax) * t, y + 3.18 - sag, az + (bz - az) * t, n % 2 ? EMBER : LAMP);
          }
        }
        // pumpkins at the foot of every trunk, cut and lit
        for (const [tx, tz] of TRUNKS) for (let n = 0; n < 3; n++) {
          const a = n * 2.1 + tx * 0.3, px = tx + Math.sin(a) * 1.35, pz = tz + Math.cos(a) * 1.35;
          k.solid.cyl(0.26, 0.23, 0.36, 10, px, y + ON_APRON + 0.18, pz, P.pumpkin);
          k.glow.cyl(0.24, 0.21, 0.38, 9, px, y + ON_APRON + 0.18, pz, EMBER);
        }
        // THE ROAD END: the post and the lamps; the fuel by the winch.
        lookout(k, api, 0, 25, 0, y, P.board);
        for (const [lx, lz] of [[-6, 20], [6, 20], [-8, 3], [8, 3], [-14, -10], [15, -9]]) lamp(k, lx, y, lz, 2.7);

        // THE WINCH BASKET: how everything that is up there got up there, and the gas
        // person's post. The rope still runs up to the first platform.
        k.solid.box(1.9, 1.1, 1.9, 0, y + 0.55, -14.0, P.canvas, 0.08);
        api.emit({ kind: 'obb', x: 0, z: -14.0, halfX: 0.95, halfZ: 0.95, yaw: 0.08,
          y0: y - 0.3, y1: y + 1.1, tag: 'wood', standable: true });
        for (const side of [-1, 1]) {
          k.solid.box(0.22, 8.4, 0.22, side * 1.5, y + 4.2, -14.0, P.board);
          api.emit({ kind: 'obb', x: side * 1.5, z: -14.0, halfX: 0.14, halfZ: 0.14, yaw: 0,
            y0: y - 0.3, y1: y + 8.4, tag: 'wood' });
        }
        k.solid.box(3.6, 0.28, 0.28, 0, y + 8.3, -14.0, P.board);
        k.solid.box(0.07, 7.0, 0.07, 0, y + 4.7, -14.0, P.rope);
        fuel(k, api, 3.6, -12.4, y + ON_APRON, -0.4);
        void C; void groundY;
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.ember };
      },
    },
  };
}

export default makeHamletBuilders;
