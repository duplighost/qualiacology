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
//   - every change of level is a STAIR of stepped solids, a ramp, or a ladder you climb;
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
// THE THIRD CUT, 2026-09-18. Alex, after playing it: "buildings in at least 2, likey 3 of
// the small towns have roofs that are on wrong", "eelwater had odd gates on the walkway that
// you had to jump over to get to homes", "highwood had what looked like unreachable houses.
// maybe completing the event should a ladder or stairs in highwood to that cool place with
// houses abouve the town. that would be cool if the towns had stuff like that too. where it
// opened up a new useful area in the town after beating the event." So:
//
//   - every roof is the county's own gable (Kit.gable, ends closed and collided, gableFloor
//     to walk it). The old one was two slabs leaned about the wrong axis: an X over an open,
//     flat-topped box, half sunk in the wall and half floating over it;
//   - every rail that is drawn is collided, and a rail STOPS where a path to a door begins.
//     The "gates" at Eelwater were the spine's rail running across the mouth of two spurs;
//   - nothing hovers and nothing is walked through: traps sit in the water on a line to a
//     stake, lanterns hang from a cord, piles stop under the boards, posts have colliders;
//   - each hamlet has ONE thing that is shut until it HOLDS, and it opens where you hear it:
//       EELWATER   the smokehouse door, barred -> it swings in: the fire, the eels over your
//                  head, a strongbox and a can of gas
//       THE CUT    the gate at the foot of the upper stair -> it swings out: the old quarry
//                  housing (an office with the wages box, a bunkhouse) and a bench over the road
//       HIGHWOOD   the ladder, hauled up to its top four rungs -> all thirteen come down to
//                  the ground: the platforms, three cabins, the bridges and the lookout
//
// THE HELD STATE (C12). A hamlet has held when progress.worldFlags 'hamlet-siege:<id>' is
// 'won' (hamlet-defence.js writes it), and the bodies read that when they build. The live
// moment is the bus: hamlet-defence emits 'hamlet:defended' {id}, and this file — wired once
// per bus from the first landmark build — opens the place through places.openGate(id), the
// same swing the Holdfast's paid gate uses: the leaves turn over 2.4 s under the 'door' cue
// and the body is rebuilt without its bar at 45%. Highwood's ladder has no leaves, so its
// body is rebuilt at once and this file sounds the rope and the foot where it came down.
//
// Each one has, at the road end (local +Z: places.js turns every site so the road it was
// placed from is on +Z), a LOOKOUT POST, a fire with benches, three authored ATTACK points
// for the defence (hamlet-defence.js), and one house with a BED and a door for the host.
// HAMLET_PLAN below is that shared anatomy, read by hamlet-life.js and hamlet-defence.js.
//
// SAME CONTRACT as sites.js's other BUILDERS: { landmark(api), body(api) } returning
// { solid, glow, moving, glowColour }. Every collider is emitted here beside the geometry it
// belongs to. Guarded for tests/sites.mjs's stub api (emit returns -1, heightAt constant, no
// flag, no gateOpen, no places behind it), and it keeps every flat glow pane under the
// 2 m^2 ledger.

// D17: where the gravel track to each hamlet actually runs. roads.js owns it and imports no
// three, so this direction is safe and there is no cycle — the two lit posts at the ends of
// the track are placed off the real polyline instead of off a second copy of the numbers.
import { HAMLET_TRACK_BY_SITE } from './roads.js';
// Inert cycles, the same as staged.js's and climbs-and-caches.js's: sites.js imports this
// file and calls makeHamletBuilders() while it evaluates, so NOTHING below may read a
// module-level const during that call — only inside a builder, long after every module has
// evaluated. gableFloor and sash are hoisted function declarations; PANE_WINDOW and PANE_LAMP
// are consts and are read only inside a builder; the caches module's exports are only ever
// called from inside a builder.
import { gableFloor, sash, PANE_WINDOW, PANE_LAMP } from './sites.js';
import { stash, gasCan, climbFace } from './climbs-and-caches.js';

/* ------------------------------------------------------------ the shared anatomy -- */
// Local coordinates in each hamlet's frame (+Z toward the road). `host` is the bedroom house;
// houseDoor()/houseInside() below turn it into the door point and the spot beside the bed.
// `y` on a point is metres above the pad the thing stands at (hamlet-life re-floors it).
// `opens` is the one thing that opens when the hamlet holds (where to sound it), and `view`
// is the place at the top of it you can see the county from.

export const HAMLET_PLAN = Object.freeze({
  eelwater: {
    post: { x: 0, z: 30, yaw: 0 },
    fire: [-7, 31],
    attack: [[-14, 36], [0, 39], [14, 36]],
    host: { x: -8, z: 9.95, yaw: 0, w: 5.4, d: 4.8, top: 0.55 },
    opens: { x: -5.99, z: -19, y: 0.57 },                    // the smokehouse door
  },
  'the-cut': {
    post: { x: 0, z: 28, yaw: 0 },
    fire: [-1, 12],
    attack: [[-16, 36], [0, 40], [16, 36]],
    host: { x: -9.5, z: 7, yaw: -Math.PI * 0.5, w: 6.2, d: 5.4, top: 0.157 },
    opens: { x: 6, z: -5.2, y: 3.4 },                        // the gate at the foot of the upper stair
    view: { x: -4, z: -11.4, y: 7.2, r: 3.0 },               // the bench over the road
  },
  highwood: {
    post: { x: 0, z: 25, yaw: 0 },
    fire: [0, 1],
    attack: [[-13, 30], [0, 33], [13, 30]],
    host: { x: -17, z: -4, yaw: -Math.PI * 0.5, w: 5.4, d: 4.8, top: 0.157 },
    opens: { x: -4.72, z: -9.6, y: 0, top: 6.4 },            // the ladder: its foot, and the lip
    view: { x: -8, z: 8, y: 8.8, r: 4.0 },                   // the lookout platform
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

/* ------------------------------------------------------------- the held state -- */
// Everything here runs at build time or on a bus event, never per frame.

const _heldLive = new Set();     // held in this page's life, before or without a saved flag
const _builtHeld = new Map();    // id -> the held state its body was last built with
const _wired = new WeakSet();    // buses this file already listens on

/** The places system behind a builder api, or null (every test stub). */
function placesOf(api) {
  const pl = api && api._self;
  return pl && typeof pl === 'object' && pl.ctx ? pl : null;
}
function sysOf(pl, id) {
  const sys = pl && pl.ctx && pl.ctx.systems;
  return sys && typeof sys.get === 'function' ? sys.get(id) : null;
}
/** Has hamlet `id` held? The save's word first, then this session's. */
function heldBy(pl, id) {
  if (_heldLive.has(id)) return true;
  const pr = sysOf(pl, 'progress');
  if (!pr || typeof pr.flag !== 'function') return false;
  return pr.flag('hamlet-siege:' + id) === 'won' || !!pr.flag('gate:' + id);
}
/** The body's question. A stub api with no places behind it is a hamlet that has not held. */
function held(api) {
  const id = api && api.site && api.site.id;
  if (!id) return false;
  if (_heldLive.has(id)) return true;
  if (typeof api.gateOpen === 'function' && api.gateOpen()) return true;
  const pl = placesOf(api);
  return pl ? heldBy(pl, id) : false;
}

/**
 * Put a hamlet's landmark leaves where the save says they are. places.js swings a 'gateLeaf'
 * by rec.gateK, which only its own openGate() ever sets and nothing restores: a door opened
 * last session would stand shut on every boot with its bar already gone from the body.
 */
function setLeaves(pl, id, open) {
  const rec = pl && pl.nodes && typeof pl.nodes.get === 'function' ? pl.nodes.get(id) : null;
  if (!rec || !rec.moving || rec.gateSwing) return;          // a live swing owns them
  let any = false;
  for (const mv of rec.moving) {
    if (!mv || mv.role !== 'gateLeaf') continue;
    any = true;
    mv.prev = mv.curr = open ? mv.open : 0;
  }
  if (any) rec.gateK = open ? 1 : 0;
}

/** Where a local point of hamlet `id` is in the world, or null. */
function worldOf(pl, id, lx, lz) {
  const rec = pl && pl.nodes && typeof pl.nodes.get === 'function' ? pl.nodes.get(id) : null;
  if (!rec || !rec.def) return null;
  const c = Math.cos(rec.yaw || 0), s = Math.sin(rec.yaw || 0);
  return { x: rec.def.x + lx * c + lz * s, z: rec.def.z - lx * s + lz * c, pad: rec.padY || 0 };
}

/** THE WIN, live. */
function defended(pl, ev) {
  const id = ev && ev.id;
  if (!id || !Object.prototype.hasOwnProperty.call(HAMLET_PLAN, id) || _heldLive.has(id)) return;
  _heldLive.add(id);
  const rec = pl.nodes && typeof pl.nodes.get === 'function' ? pl.nodes.get(id) : null;
  const leaves = !!(rec && rec.moving && rec.moving.some(mv => mv && mv.role === 'gateLeaf'));
  if (leaves && typeof pl.openGate === 'function') { pl.openGate(id); return; }
  // Highwood: nothing swings, the ladder is simply down in the rebuilt body — so the sound is
  // the whole of the moment. The rope running out at the lip, and the foot landing.
  if (typeof pl.rebuildSite === 'function') pl.rebuildSite(id);
  const o = HAMLET_PLAN[id].opens, w = o && worldOf(pl, id, o.x, o.z);
  const audio = sysOf(pl, 'audio');
  if (!w || !audio || typeof audio.dread !== 'function') return;
  audio.dread('cable-strain', w.x, w.pad + (o.top || 2), w.z, 0.5);
  audio.dread('door', w.x, w.pad + (o.y || 0) + 0.3, w.z, 0.7);
}

/** A save was read: the flags are the truth now. Rebuild only what was built the other way. */
function loaded(pl) {
  _heldLive.clear();
  for (const id of Object.keys(HAMLET_PLAN)) {
    const h = heldBy(pl, id);
    setLeaves(pl, id, h);
    if (_builtHeld.has(id) && _builtHeld.get(id) !== h && typeof pl.rebuildSite === 'function') pl.rebuildSite(id);
  }
}

/** Listen once per bus. Called from every hamlet build; the first one with places behind it wins. */
function wire(api) {
  const pl = placesOf(api), bus = pl && pl.ctx.bus;
  if (!bus || typeof bus.on !== 'function' || _wired.has(bus)) return;
  _wired.add(bus);
  bus.on('hamlet:defended', (ev) => defended(pl, ev));
  bus.on('save:loaded', () => loaded(pl));
}

/** Every body build: record what it was built as, and make the landmark agree with it. */
function heldForBody(api) {
  wire(api);
  const h = held(api);
  const id = api && api.site && api.site.id;
  if (id) _builtHeld.set(id, h);
  const pl = placesOf(api);
  if (pl && h) {
    const rec = pl.nodes && typeof pl.nodes.get === 'function' ? pl.nodes.get(id) : null;
    if (rec && !rec.gateSwing && (rec.gateK || 0) < 1) setLeaves(pl, id, true);
  }
  return h;
}

/* -------------------------------------------------------------------- the builders -- */

const ON_APRON = 0.037;   // sites.js ON_APRON (APRON_LIFT 0.025 + 0.012), pinned here: sites.js
                          // calls into this file while it is still evaluating, so its consts
                          // are not there to read at that moment
const RUN = 0.34;         // m per stair tread: a real step, deep enough for a boot
const RISE_MAX = 0.26;    // m: the tallest single rise before a stair reads as a ladder;
                          // well under the player's STEP_UP 0.45, so every tread is walked
const RIM = { eelwater: 41.6, 'the-cut': 42.9, highwood: 34.6 };   // placedata flat.radius x blend:
                          // inside this the pad is exactly level (measured with terrain.js);
                          // nothing standable is built outside it
const CUT_LOW = 3.4, CUT_HIGH = 7.2;   // the Cut's two terraces, shared by its face and its body

export function makeHamletBuilders({ kits, C, GLOW, groundY }) {
  // The glow kit takes a LINEAR [r, g, b]; GLOW.* are sRGB hexes and are only for the
  // glowColour a builder returns. Two different things, one letter apart, so they are named.
  const LAMP = [1, 0.70, 0.38];     // a filament behind dirty glass
  const EMBER = [1, 0.48, 0.15];    // fire, a kiln mouth, a cut pumpkin
  const CANDLE = [1, 0.62, 0.30];   // one flame on a bedside crate
  const P = {
    board: [0.078, 0.058, 0.040], post: [0.052, 0.040, 0.030],
    // the water is as dark as the fen at night: it has no shader of its own here, and every
    // step of albedo is another step of the plank grain it would otherwise show under a torch
    tar: [0.030, 0.029, 0.028], water: [0.007, 0.010, 0.011],
    glass: [0.008, 0.007, 0.006], soot: [0.020, 0.018, 0.017],
    shade: [0.024, 0.019, 0.014], reedDry: [0.080, 0.070, 0.044],
    needle: [0.024, 0.038, 0.030], needleDark: [0.012, 0.018, 0.015],
    plank: [0.092, 0.072, 0.050], slate: [0.048, 0.050, 0.052],
    lime: [0.148, 0.144, 0.130], dust: [0.120, 0.116, 0.104],
    stone: [0.074, 0.075, 0.070], rope: [0.104, 0.086, 0.056],
    iron: [0.058, 0.064, 0.066], moss: [0.038, 0.058, 0.046],
    pumpkin: [0.240, 0.108, 0.026], paper: [0.230, 0.222, 0.196],
    bark: [0.050, 0.038, 0.029], canvas: [0.126, 0.118, 0.098],
    mud: [0.040, 0.036, 0.030], blanket: [0.070, 0.036, 0.034],
    drum: [0.090, 0.050, 0.036], reed: [0.052, 0.062, 0.040],
    eel: [0.046, 0.033, 0.020], oilskin: [0.150, 0.118, 0.030],
    coat: [0.040, 0.036, 0.040], coat2: [0.060, 0.030, 0.026],
  };

  // Highwood's four pines, read by the landmark (trunk and crown) and the body (the collar
  // where a trunk leaves a cabin roof). `crown` is where the lowest bough rim hangs: over each
  // cabin it clears the ridge finials by the droop of the bough, and over the lookout it
  // clears a standing head.
  const HW_TREES = [
    { x: -9, z: -7, h: 21, crown: 11.2 },
    { x: 8, z: -6, h: 23, crown: 12.0 },
    { x: 10, z: 9, h: 20, crown: 12.8 },
    { x: -8, z: 8, h: 22, crown: 11.2 },
  ];
  const TRUNK_R0 = 0.92, TRUNK_R1 = 0.40;     // at the foot, and at `h`
  const trunkR = (t, above) => TRUNK_R0 + (TRUNK_R1 - TRUNK_R0) * Math.min(1, Math.max(0, above / t.h));

  // Light that falls off instead of ending (sites.js's profiles). Read only when a builder
  // runs; PANE_* are sites.js consts and do not exist while this factory is being called.
  const WINDOW_LIGHT = (u, v) => PANE_WINDOW(u, v) * 1.7;           // the lamp inside, up by the head
  const POOL = (u, v) => PANE_LAMP(u, v) * 0.9;                       // on the floor round a fire
  const FIRE_MOUTH = (u, v) => PANE_LAMP(u * 0.9, v * 0.8 + 0.35) * 1.6;   // hot at the hearth

  /**
   * A LIT WINDOW, the county's own (sites.js): near-black glass on the wall, the lamp light
   * over it falling off toward the sill, and a frame with a cross of glazing bars, a 15 cm
   * reveal, a sill and a lintel standing proud of the boards. They were flat orange boxes on
   * the planks, and under the torch the lit boards showed through the additive light, which
   * is a translucent sticker. (x, z) is on the wall's outer face; `ry` is the way it faces.
   * Drawn only: nothing here is proud of the wall by more than 0.24 m, well inside the reach
   * of any body that walks along it.
   */
  /** Fade a glow part to nothing at its top: heat going up into the dark, where a flat colour
   *  read as a lit lampshade sitting on the stack. Build time only. */
  const fadeUp = (g) => {
    const p = g.attributes.position, c = g.attributes.color;
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < p.count; i++) { const v = p.getY(i); if (v < y0) y0 = v; if (v > y1) y1 = v; }
    for (let i = 0; i < p.count; i++) {
      const f = 1 - (p.getY(i) - y0) / ((y1 - y0) || 1);
      c.setXYZ(i, c.getX(i) * f, c.getY(i) * f, c.getZ(i) * f);
    }
    return g;
  };

  const litWindow = (k, x, y, z, ry, w, h, frame) => {
    const fx = Math.sin(ry), fz = Math.cos(ry);
    k.solid.box(w + 0.08, h + 0.08, 0.02, x + fx * 0.010, y, z + fz * 0.010, P.glass, ry);
    k.glow.pane(w, h, x + fx * 0.045, y, z + fz * 0.045, WINDOW_LIGHT, ry, 0, 4, 5);
    sash(k.solid, w, h, x, y, z, frame || P.post, ry, 0, 2, 2, 0.06, 0.08);
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

  /** A lantern on a post: the emissive fitting; hamlet-life borrows the one real light. The
   *  post is a thing you walk round now, not through. */
  const lamp = (k, api, x, y, z, h, col) => {
    k.solid.box(0.12, h, 0.12, x, y + h * 0.5, z, col || P.post);
    k.solid.box(0.42, 0.10, 0.42, x, y + h + 0.06, z, P.iron);
    k.glow.cyl(0.24, 0.20, 0.50, 10, x, y + h - 0.28, z, LAMP);
    api.emit({ kind: 'circle', x, z, r: 0.09, y0: y - 0.1, y1: y + h + 0.1, tag: 'lamp' });
  };

  /** A member from A to B: a square timber (or a rope) whose long axis is its local Y. */
  const strut = (k, x0, y0, z0, x1, y1, z1, t, col) => {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    const L = Math.hypot(dx, dy, dz);
    k.solid.box(t, L, t, (x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5, col,
      Math.atan2(dx, dz), Math.atan2(Math.hypot(dx, dz), dy), 0);
  };

  /**
   * A RAIL between two points on a floor at `top`: a top rail, a mid rail, a post at each end
   * and about every 2 m — and ONE collider along it, because a rail you can walk through is a
   * picture of a rail. Never vaulted (climbable:false turns the vault off) and never crushed
   * ('rail' is on the car's breakable list and the drawing would stay standing).
   */
  const railRun = (k, api, ax, az, bx, bz, top, col) => {
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.3) return;
    const yaw = Math.atan2(bx - ax, bz - az);
    const mx = (ax + bx) * 0.5, mz = (az + bz) * 0.5;
    k.solid.box(0.07, 0.08, len, mx, top + 0.95, mz, col, yaw);
    k.solid.box(0.05, 0.06, len, mx, top + 0.50, mz, col, yaw);
    const m = Math.max(1, Math.round(len / 2.0));
    for (let j = 0; j <= m; j++) {
      const t = j / m;
      k.solid.box(0.09, 0.99, 0.09, ax + (bx - ax) * t, top + 0.495, az + (bz - az) * t, col);
    }
    api.emit({ kind: 'obb', x: mx, z: mz, halfX: 0.05, halfZ: len * 0.5, yaw,
      y0: top, y1: top + 1.0, tag: 'rail', climbable: false, breakable: false });
  };

  /** A lit pumpkin on the ground, and the thing you walk round. The car crushes by size, and
   *  a crushed collider would leave the pumpkin standing, so it is not breakable. */
  const pumpkin = (k, api, x, y, z) => {
    k.solid.cyl(0.26, 0.23, 0.36, 10, x, y + 0.18, z, P.pumpkin);
    k.glow.cyl(0.24, 0.21, 0.38, 9, x, y + 0.18, z, EMBER);
    api.emit({ kind: 'circle', x, z, r: 0.26, y0: y - 0.1, y1: y + 0.36, tag: 'wood', breakable: false });
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
   *
   * THE LANTERN IS THE BODY'S. places.js shows a landmark's glow only once the place is
   * claimed, and a hamlet never is (claim 'none'), so a lantern drawn here was never lit:
   * two dark posts. The body's glow burns for a `lit` place. So the post is drawn here, where
   * it reads from the road however far out you are, and `lampOnly` hangs its lantern from the
   * body, which is built whenever the hamlet's chunk is in the ring round you.
   */
  const wayIn = (k, api, lx, lz, yaw, lampOnly) => {
    const g = groundY(api, lx, lz);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const H = 5.2;
    // the hood and the lantern under it: the same fitting as every lamp in the hamlet,
    // one size up, so the pair reads as the village's own and not as county road furniture
    if (lampOnly) { k.glow.cyl(0.27, 0.22, 0.62, 10, lx, g + H - 0.33, lz, LAMP); return; }
    k.solid.box(0.17, H, 0.17, lx, g + H * 0.5, lz, P.post, yaw);
    k.solid.box(0.56, 0.12, 0.56, lx, g + H + 0.07, lz, P.iron, yaw);
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
  const trackMarkers = (k, api, lampOnly) => {
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
      wayIn(k, api, a[0] + ux * along - Math.cos(yaw) * OFF, a[1] + uz * along + Math.sin(yaw) * OFF, yaw + turn, lampOnly);
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
    // A bed of embers under the logs and a few tongues of flame off it, leaning as they burn.
    // It was one glowing drum 0.34 m tall, which read as a lit pot.
    k.glow.cyl(0.32, 0.44, 0.14, 10, x, y + 0.09, z, EMBER);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.71 + 0.4, r = 0.10 + (i & 1) * 0.09, fh = 0.46 + ((i * 5) % 3) * 0.13;
      const lean = 0.10 + (i % 2) * 0.08;
      k.glow.cone(0.13 - i * 0.015, fh, 5, x + Math.sin(a) * r, y + 0.13 + fh * 0.5, z + Math.cos(a) * r,
        i === 0 ? LAMP : EMBER, 0, lean * Math.cos(a), -lean * Math.sin(a));
    }
    // the light it throws on the ground: soft, gone before the edge (tests/sites.mjs holds
    // every horizontal additive pane under 2 m^2; a hard one is a glowing carpet from above)
    k.glow.pane(1.4, 1.4, x, y + 0.02, z, POOL, 0, -Math.PI * 0.5, 6, 6);
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
    // THE STAND. Collided as the filled block it always was, so there is nothing to crawl
    // under; drawn as what it is, because it is the first thing you see at the road end and
    // it read as a pale crate with a man on it: a deck of boards on four corner posts, a
    // fascia under the deck edge, an X of bracing on every face, and the boarding behind the
    // bracing in shadow.
    const foot = ground - 0.3, under = top - 0.14;
    api.emit({ kind: 'obb', x, z, halfX: 1.4, halfZ: 1.4, yaw, y0: foot, y1: top,
      tag: 'floor', standable: true, climbable: false });
    k.solid.box(2.8, 0.14, 2.8, x, top - 0.07, z, P.board, yaw);   // flush with the stair's top tread
    k.solid.box(2.62, under - foot, 2.62, x, (under + foot) * 0.5, z, P.shade, yaw);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const [px, pz] = at(sx * 1.29, sz * 1.29);
      k.solid.box(0.22, under - foot, 0.22, px, (under + foot) * 0.5, pz, P.post, yaw);
    }
    for (let f = 0; f < 4; f++) {
      const fa = f * Math.PI * 0.5, fc = Math.cos(fa), fs = Math.sin(fa);
      const face = (u, v) => at(u * fc + v * fs, -u * fs + v * fc);     // u along the face, v out of it
      const [fx, fz] = face(0, 1.42);
      k.solid.box(2.9, 0.20, 0.06, fx, under - 0.10, fz, P.board, yaw + fa);
      for (const sd of [-1, 1]) {
        const [ax, az] = face(-1.16 * sd, 1.345), [bx, bz] = face(1.16 * sd, 1.345);
        strut(k, ax, ground + 0.06, az, bx, under - 0.22, bz, 0.08, P.post);
      }
    }
    for (const [a, b] of [[[-1.3, 1.3], [1.3, 1.3]], [[1.3, 1.3], [1.3, -1.3]], [[-1.3, -1.3], [-1.3, 1.3]]]) {
      const [ax, az] = at(a[0], a[1]), [bx, bz] = at(b[0], b[1]);
      railRun(k, api, ax, az, bx, bz, top, P.post);
    }
    const [lx, lz] = at(1.15, 1.15);
    lamp(k, api, lx, top, lz, 2.3);
    const [bx, bz] = at(0, -1.4 - stairRun(ground, top));
    stair(k, api, bx, bz, yaw, ground, top, 1.3, col);
  };

  /**
   * A HOUSE. A filled plinth for a floor, four walls with a doorway on the frame's -Z, a
   * gabled roof, a lit window beside the door and one on the side. `bed` builds the host's
   * bed against the back wall (the point hamlet-defence carries you to is houseInside());
   * `leaf` stands the door open against the inside of the wall.
   *
   * THE ROOF is the county's own gable (Kit.gable): the ridge runs front to back over the
   * door, so the triangle closes over the doorway and reads as a house from the lane; the
   * eaves hang half a metre past the side walls; both triangles are drawn and collided at
   * the wall line, so nobody climbs into the attic; and gableFloor makes both pitches a
   * floor you can walk. Returns the house frame for whatever is hung inside it.
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
    // THE ROOF: about 31 degrees, the same pitch the county's other cottages carry.
    const rise = h.rise !== undefined ? h.rise : Math.min(1.8, Math.max(1.1, w * 0.30));
    k.solid.gable(w, d, top + hh, rise, x, 0, z, h.roof, yaw, { api, depth: d - 0.18, col: h.wall });
    gableFloor(api, x, z, w, d, top + hh, rise, yaw);
    // THE WINDOWS (litWindow). The front one sits between the doorway and the corner with a
    // hand's width clear of each: `half` is the surround plus the sill's oversail. The side one
    // is under the eave, and the eave's soffit hangs 0.47 m under the wall head, so its lintel
    // is kept under that on the low cabins (a 2.4 m wall puts the glass at 0.92-1.54 m).
    const fw = w < 5 ? 0.80 : 0.92, half = fw * 0.5 + 0.33;
    const lo = doorW * 0.5 + 0.10 + half, hi = hw - 0.05 - half;
    const [wx, wz] = at(Math.max(lo, (lo + hi) * 0.5), -hd);
    litWindow(k, wx, top + 1.55, wz, yaw + Math.PI, fw, 0.72, h.frame);
    const sh = 0.62, [sx, sz] = at(hw, 0.3);
    litWindow(k, sx, top + Math.min(1.55, hh - 0.86 - sh * 0.5), sz, yaw + Math.PI * 0.5, 0.80, sh, h.frame);
    if (h.chimney) {
      // up the inside of the side wall and out through the pitch, clear of the ridge
      const [cx, cz] = at(-hw + 0.5, -0.3), ch = hh + rise + 0.6;
      solid(k, api, 0.72, ch, 0.72, cx, top + ch * 0.5, cz, h.chimneyCol || h.wall, yaw, 'chimney');
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
    return { at, hw, hd, rise };
  };

  /**
   * A boardwalk run over the water: drawn as a thin deck on piles, collided as the filled
   * block from the water floor to the boards, so nothing fits in the 0.45 m under it.
   *
   * The piles go in PAIRS under the two edges and stop flush under the boards (they were on
   * the centreline, 0.15 m proud of the deck: a stub to trip on every three metres). The
   * rail comes in pieces round `gaps` ([from, to] metres along the run), so it never runs
   * across the mouth of a spur. `decks` collects every rectangle of board, for the traps.
   */
  const boards = (k, api, x0, z0, x1, z1, base, top, width, rail, gaps, decks) => {
    const mx = (x0 + x1) * 0.5, mz = (z0 + z1) * 0.5;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const yaw = Math.atan2(x1 - x0, z1 - z0);
    const c = Math.cos(yaw), s = Math.sin(yaw), ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    k.solid.box(width, 0.16, len, mx, top - 0.08, mz, P.board, yaw);
    api.emit({ kind: 'obb', x: mx, z: mz, halfX: width * 0.5, halfZ: len * 0.5, yaw,
      y0: base, y1: top, tag: 'deck', standable: true, climbable: false });
    if (decks) decks.push({ x: mx, z: mz, hx: width * 0.5, hz: len * 0.5, yaw });
    const n = Math.max(2, Math.round(len / 3.2)), eo = width * 0.5 - 0.10;
    const y0 = base - 0.15, y1 = top - 0.16;
    for (let i = 0; i <= n; i++) {
      const t = i / n, px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
      for (const sd of [-1, 1]) {
        k.solid.box(0.17, y1 - y0, 0.17, px + c * eo * sd, (y0 + y1) * 0.5, pz - s * eo * sd, P.post);
      }
    }
    if (!rail) return;
    const ro = width * 0.5 - 0.07;
    const cuts = [[-1, 0]].concat((gaps || []).slice().sort((a, b) => a[0] - b[0]), [[len, len + 1]]);
    for (let g = 0; g + 1 < cuts.length; g++) {
      const a = cuts[g][1], b = cuts[g + 1][0];
      if (b - a < 0.4) continue;
      railRun(k, api, x0 + ux * a + c * ro, z0 + uz * a - s * ro, x0 + ux * b + c * ro, z0 + uz * b - s * ro, top, P.post);
    }
  };

  /**
   * A house platform on stilts: drawn as boards on a ring of piles like the walkway (it was a
   * solid box with four piles buried inside it), collided as the same filled block, so the
   * 0.29 m of black water under the boards is something you see and never something you get
   * into.
   */
  const stilted = (k, api, w, d, x, z, yaw, base, top, decks) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    k.solid.box(w, 0.16, d, x, top - 0.08, z, P.board, yaw);
    api.emit({ kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw,
      y0: base, y1: top, tag: 'deck', standable: true, climbable: false });
    if (decks) decks.push({ x, z, hx: w * 0.5, hz: d * 0.5, yaw });
    const y0 = base - 0.15, y1 = top - 0.16, hx = w * 0.5 - 0.12, hz = d * 0.5 - 0.12;
    const nx = Math.max(1, Math.ceil(hx * 2 / 2.2)), nz = Math.max(1, Math.ceil(hz * 2 / 2.2));
    const pile = (lx, lz) => k.solid.box(0.18, y1 - y0, 0.18, x + lx * c + lz * s, (y0 + y1) * 0.5, z - lx * s + lz * c, P.post, yaw);
    for (let i = 0; i <= nx; i++) for (const sd of [-1, 1]) pile(-hx + i * (hx * 2 / nx), sd * hz);
    for (let j = 1; j < nz; j++) for (const sd of [-1, 1]) pile(sd * hx, -hz + j * (hz * 2 / nz));
  };

  /** Is (x, z) within `pad` metres of any recorded deck rectangle? */
  const nearDeck = (decks, x, z, pad) => {
    for (const q of decks) {
      const dx = x - q.x, dz = z - q.z, co = Math.cos(q.yaw), si = Math.sin(q.yaw);
      const lx = dx * co - dz * si, lz = dx * si + dz * co;
      if (Math.abs(lx) <= q.hx + pad && Math.abs(lz) <= q.hz + pad) return true;
    }
    return false;
  };

  /**
   * A leaf that has swung open is still a leaf: the collider for where it comes to rest,
   * emitted by the body once the hamlet holds. (hx, hz) is the hinge; (lx, lz) the leaf's
   * centre from the hinge and (halfX, halfZ) its half-size, both in the leaf's own frame as
   * the landmark draws it; `ang` the angle it swings to (the landmark's `open`). Three's
   * rotateY and collision's OBB yaw turn the same way, so the angle goes straight in.
   */
  const openLeaf = (api, hx, hz, lx, lz, halfX, halfZ, ang, y0, y1) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    api.emit({ kind: 'obb', x: hx + lx * c + lz * s, z: hz - lx * s + lz * c, halfX, halfZ,
      yaw: ang, y0, y1, tag: 'door', climbable: false, breakable: false });
  };

  return {

    /* ==================================================================== EELWATER == */
    // A fen village on low stilts. The WATER IS A FLOOR NOW: a black sheet 0.10 m over the
    // pad with its own standable collider, so you wade it ankle-deep and never fall through
    // it, and the boards ride 0.45 m over that with a stair at every end. The road side is
    // mud: the lookout post, the fire, the fuel drums. Everything else is over the water.
    stilts: {
      landmark(api) {
        wire(api);
        const k = kits(), y = api.padY;
        const WX = 0, WZ = -6, WR = 34;   // the water disc: its far edge at 40 m from the centre, inside RIM.eelwater
        k.solid.cyl(WR, WR, 0.08, 48, WX, y + 0.06, WZ, P.water);
        api.emit({ kind: 'circle', x: WX, z: WZ, r: WR, y0: y - 0.3, y1: y + 0.10, tag: 'floor',
          standable: true, climbable: false, authored: true });
        // the bank it is held in: a lip of mud from the ground up to the water, where the disc
        // used to end in a hard 8 cm rim like the edge of a stage. Drawn only; it is a slope of
        // 0.1 m over 1.6 m and a boot sinks that far into a fen bank.
        k.solid.tube(WR, WR + 1.6, 0.22, 48, WX, y - 0.01, WZ, P.mud);
        // reeds round the edge of it: the shoreline, and the reason it reads as a fen. Clumps
        // of blades, leaning out as reeds do (each was one 5-sided cone a metre and a half
        // across: a row of little tents).
        for (let i = 0; i < 26; i++) {
          const a = i * 0.2417 + 0.1, r = WR + 0.4 + (i % 3) * 0.7;
          const rx = WX + Math.sin(a) * r, rz = WZ + Math.cos(a) * r;
          if (Math.hypot(rx, rz) > RIM.eelwater - 1) continue;
          const nb = 6 + (i % 3);
          for (let b = 0; b < nb; b++) {
            const ba = b * 2.39996 + i * 0.9, off = 0.06 + (b % 3) * 0.11;
            const bh = 1.05 + ((i * 7 + b * 3) % 6) * 0.13, lean = 0.08 + (b % 4) * 0.05;
            const dx = Math.sin(ba), dz = Math.cos(ba);
            k.solid.cone(0.035, bh, 3, rx + dx * off, y - 0.04 + bh * 0.5, rz + dz * off,
              (b % 3) === 1 ? P.reedDry : P.reed, 0, lean * dz, -lean * dx);
          }
        }
        // the bell buoy: the far read, and the only thing above the houses. Its lamp is the
        // body's (a landmark glow is never lit at a place nobody claims; see wayIn).
        const bx = -22, bz = -19;
        k.solid.box(1.9, 0.30, 1.9, bx, y + 0.28, bz, P.iron);
        for (const side of [-1, 1]) for (const zz of [-1, 1]) {
          k.solid.box(0.11, 5.4, 0.11, bx + side * 0.62, y + 3.0, bz + zz * 0.62, P.iron, side * zz * 0.05);
        }
        k.solid.box(1.35, 0.20, 1.35, bx, y + 5.7, bz, P.iron);
        api.emit({ kind: 'circle', x: bx, z: bz, r: 1.1, y0: y, y1: y + 6.0, tag: 'metal' });
        // THE SMOKEHOUSE DOOR, on the landmark so it can swing (places.js 'gateLeaf'). Hung on
        // the north jamb of the east doorway, ledged and braced, and it swings IN when the
        // hamlet holds. Its bar and its collider are the body's (below).
        const DECK = y + 0.55;
        const leaf = kits().solid;
        leaf.box(0.07, 2.0, 1.36, 0, 1.0, -0.68, P.plank);
        for (const yy of [0.35, 1.0, 1.65]) leaf.box(0.09, 0.14, 1.30, 0.01, yy, -0.68, P.post);
        leaf.box(0.09, 1.52, 0.12, 0.01, 1.0, -0.68, P.post, 0, 0.72, 0);          // the brace
        k.moving.push({ geo: leaf.build(), role: 'gateLeaf', rate: 0, x: -5.99, y: DECK + 0.02, z: -18.3, open: 1.45 });
        trackMarkers(k, api);   // D17: the two lit posts at the ends of the gravel track
        return { solid: k.solid.build(), glow: k.glow.build(), moving: k.moving, glowColour: GLOW.lamp };
      },
      body(api) {
        const k = kits(), y = api.padY;
        const WATER = y + 0.10;          // the water floor (landmark)
        const DECK = y + 0.55;           // the boards: 0.45 m over the water
        const MUD = y;                   // the shore on the road side
        const open = heldForBody(api);
        const decks = [];

        // THE ROAD END, on the mud: the post, the fire, the drums.
        lookout(k, api, 0, 30, 0, MUD, P.board);
        fire(k, api, -7, 31, MUD + ON_APRON);
        fuel(k, api, 7.5, 31, MUD + ON_APRON, 0);
        lamp(k, api, -3.4, MUD, 33.6, 2.6);
        lamp(k, api, 3.4, MUD, 33.6, 2.6);

        // THE BOARDWALK. One spine from the shore to the far water, three spurs, and a
        // STAIR at every end: down to the mud at the shore, down to the water everywhere
        // else. Runs are split under 24 m half-lengths (collision's prop limit). The spine's
        // rail is on its west edge, and it STOPS at the mouth of the west spur (z 5.05-6.95)
        // and of the smokehouse spur (z -19.95..-18.05): a waist-high bar across the way to
        // three front doors was "the gate you had to jump over".
        boards(k, api, 0, 24, 0, 0.5, WATER, DECK, 1.9, true, [[16.85, 19.15]], decks);
        boards(k, api, 0, 0.5, 0, -24, WATER, DECK, 1.9, true, [[18.35, 20.65]], decks);
        boards(k, api, -0.9, 6, -21, 6, WATER, DECK, 1.9, false, null, decks);
        boards(k, api, 0.9, -6, 21, -6, WATER, DECK, 1.9, false, null, decks);
        boards(k, api, -0.9, -19, -4.4, -19, WATER, DECK, 1.9, false, null, decks);
        stair(k, api, 0, 24 + stairRun(MUD, DECK), Math.PI, MUD, DECK, 1.9, P.board);      // shore end, down to the mud
        stair(k, api, 0, -24 - stairRun(WATER, DECK), 0, WATER, DECK, 1.9, P.board);       // far end, down to the water
        stair(k, api, -21 - stairRun(WATER, DECK), 6, Math.PI * 0.5, WATER, DECK, 1.9, P.board);   // west spur end
        stair(k, api, 21 + stairRun(WATER, DECK), -6, -Math.PI * 0.5, WATER, DECK, 1.9, P.board);  // east spur end
        decks.push({ x: 0, z: 25.2, hx: 0.95, hz: 1.4, yaw: 0 }, { x: 0, z: -25.2, hx: 0.95, hz: 1.4, yaw: 0 },
          { x: -22.2, z: 6, hx: 1.4, hz: 0.95, yaw: 0 }, { x: 22.2, z: -6, hx: 1.4, hz: 0.95, yaw: 0 });

        // FIVE HOUSES on their own platforms, each lapping a spur by a board's width so there
        // is no gap of water at any door. Doors face the spur.
        const houses = [
          { x: -8, z: 9.95, yaw: 0, w: 5.4, d: 4.8, h: 2.75, bed: true, leaf: true, chimney: true },   // Ness: the host
          { x: -17, z: 9.95, yaw: 0, w: 4.8, d: 4.6, h: 2.6 },
          { x: -8, z: 2.05, yaw: Math.PI, w: 5.2, d: 4.8, h: 2.7 },
          { x: 8, z: -9.95, yaw: Math.PI, w: 5.2, d: 4.8, h: 2.7 },
          { x: 17, z: -9.95, yaw: Math.PI, w: 4.6, d: 4.4, h: 2.55 },
        ];
        for (const h of houses) {
          stilted(k, api, h.w + 1.8, h.d + 1.8, h.x, h.z, h.yaw, WATER, DECK, decks);
          house(k, api, { ...h, top: DECK + 0.02, base: DECK - 0.2, wall: P.plank, roof: P.tar, floorCol: P.board, chimneyCol: P.slate });
        }

        // THE SMOKEHOUSE, at the end of its spur. Its door faces the spur you come along
        // (yaw -PI/2: local -Z is world +X), where it used to face the open water with a
        // painted glow for a door on this side. Until the hamlet holds it is shut and barred.
        const sx = -8.4, sz = -19;
        stilted(k, api, 7.4, 6.6, sx, sz, 0, WATER, DECK, decks);
        house(k, api, { x: sx, z: sz, yaw: -Math.PI * 0.5, w: 5.6, d: 5.0, h: 3.1, top: DECK + 0.02, base: DECK - 0.2,
          wall: P.plank, roof: P.tar, floorCol: P.board, doorW: 1.4 });
        // THE STACK: from the floor against the back wall, up through the ridge — it used to
        // hang inside the room from nothing — with the firebox at its foot.
        const STX = sx - 1.80;
        solid(k, api, 1.05, 5.9, 1.05, STX, DECK + 0.02 + 2.95, sz, P.slate, 0, 'chimney');
        fadeUp(k.glow.tube(0.22, 0.42, 0.9, 9, STX, DECK + 6.38, sz, EMBER));    // the one warm chimney, heat off the pot
        // THE FIREBOX: an iron frame round a sooted mouth with the fire behind it, where it was
        // an iron slab with a glowing slab stuck on the front of it
        const FB = DECK + 0.49, FX = STX + 0.525;
        for (const sd of [-1, 1]) {
          k.solid.box(0.08, 0.07, 0.80, FX + 0.04, FB + sd * 0.285, sz, P.iron);
          k.solid.box(0.08, 0.50, 0.07, FX + 0.04, FB, sz + sd * 0.365, P.iron);
        }
        k.solid.box(0.02, 0.50, 0.66, FX + 0.01, FB, sz, P.soot);
        k.glow.pane(0.66, 0.50, FX + 0.035, FB, sz, FIRE_MOUTH, Math.PI * 0.5, 0, 4, 4);
        // and the light it lets out, on the boards in front of it
        k.glow.pane(1.3, 1.3, FX + 0.70, DECK + 0.035, sz, POOL, 0, -Math.PI * 0.5, 6, 6);
        // the racks, wall to wall across the room, and the eels on them over your head
        for (const rx of [-8.9, -7.6]) {
          k.solid.box(0.06, 0.06, 5.24, rx, DECK + 2.75, sz, P.post);
          for (let n = 0; n < 9; n++) {
            if (rx === -7.6 && n === 8) continue;
            k.solid.box(0.045, 0.62, 0.035, rx + ((n & 1) ? 0.03 : -0.03), DECK + 2.41, sz - 2.2 + n * 0.55, P.eel);
          }
        }
        // and at the end of the second rack, a child's oilskin, hung up to dry
        k.solid.box(0.10, 0.55, 0.36, -7.6, DECK + 2.445, sz + 2.2, P.oilskin);
        if (!open) {
          api.emit({ kind: 'obb', x: -5.99, z: sz, halfX: 0.10, halfZ: 0.72, yaw: 0,
            y0: DECK, y1: DECK + 2.07, tag: 'door', climbable: false, breakable: false });
          k.solid.box(0.10, 0.12, 1.72, -5.84, DECK + 1.12, sz, P.iron);         // the bar across it
          for (const oz of [-0.80, 0.80]) k.solid.box(0.10, 0.22, 0.08, -5.84, DECK + 1.12, sz + oz, P.iron);
        } else {
          // swung in against the room: the landmark leaf comes to rest here
          openLeaf(api, -5.99, -18.3, 0, -0.68, 0.05, 0.68, 1.45, DECK, DECK + 2.02);
          // and a can of gas by the stack, registered only now, so no prompt comes through a wall
          gasCan(k, api, { id: 'smokehouse', x: -9.95, z: -17.0, y: 0.57, yaw: 0.3 });
        }
        // the strongbox in the far corner, its lock plate to the door
        if (typeof api.flag === 'function') stash(k, api, { id: 'smokehouse', x: -9.95, z: -21.0, y: 0.57, yaw: Math.PI * 0.5 });

        // EEL TRAPS: in the open water and never on the boards, half sunk, each on a line to
        // a stake. The same spiral; a point within 1.2 m of any board is simply not used.
        for (let i = 0; i < 14; i++) {
          const a = i * 2.39996;
          const tx = Math.sin(a) * (9 + (i % 5) * 3.6), tz = -6 + Math.cos(a) * (10 + (i % 4) * 3.1);
          const ya = i * 0.4, fx = Math.sin(ya), fz = Math.cos(ya);
          const kx = tx - fx * 0.75, kz = tz - fz * 0.75;                            // the stake
          if (nearDeck(decks, tx, tz, 1.2) || nearDeck(decks, kx, kz, 1.2)) continue;
          if (Math.hypot(tx, tz) > RIM.eelwater - 3 || Math.hypot(tx, tz + 6) > 32) continue;
          k.solid.cyl(0.24, 0.10, 0.92, 9, tx, WATER + 0.04, tz, P.rope, ya, Math.PI * 0.46, 0);
          api.emit({ kind: 'obb', x: tx, z: tz, halfX: 0.25, halfZ: 0.47, yaw: ya, y0: WATER - 0.2, y1: WATER + 0.28, tag: 'wicker', breakable: false });
          k.solid.box(0.06, 1.30, 0.06, kx, WATER + 0.55, kz, P.post);
          api.emit({ kind: 'circle', x: kx, z: kz, r: 0.06, y0: WATER - 0.2, y1: WATER + 1.2, tag: 'post' });
          strut(k, kx, WATER + 1.12, kz, tx - fx * 0.30, WATER + 0.20, tz - fz * 0.30, 0.018, P.rope);
        }
        // the lanterns, hung on posts down the spine, standing in the water beside it
        for (const lz of [-22, -14, -3, 4, 12, 21]) lamp(k, api, 1.25, WATER, lz, 2.9);
        // the landmark's lamps, lit here (see wayIn): the buoy's, and the two on the track
        k.glow.cyl(0.46, 0.58, 0.88, 12, -22, y + 5.16, -19, LAMP);
        trackMarkers(k, api, true);
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
        wire(api);
        const k = kits(), y = api.padY;
        // THE FACE. Behind the terraces, stepping up and away — the road comes in from +Z and
        // this is what the hamlet has its back to. It rises FROM the upper terrace's back edge
        // (z -18.6), a first step of 1.35 m and every step after it; it used to start at 5.0 m,
        // under the terrace, and leave a 1.5 m slot behind the quarry housing to fall into.
        for (let i = 0; i < 9; i++) {
          const z = -20.1 - i * 2.6, h = CUT_HIGH + 1.35 * (i + 1);
          k.solid.box(46 - i * 1.4, h, 3.0, (i % 3 - 1) * 1.1, y + h * 0.5, z, i & 1 ? P.stone : P.slate, i * 0.006);
          api.emit({ kind: 'obb', x: (i % 3 - 1) * 1.1, z, halfX: (46 - i * 1.4) * 0.5, halfZ: 1.5,
            yaw: i * 0.006, y0: y - 0.4, y1: y + h, tag: 'stone', standable: true, climbable: false });
        }
        // THE LIME KILN, on the quarry floor west of the lane: a stone bottle with a fire in
        // the bottom of it, the first warm thing you see coming in from the road. ONE profile
        // now, swelling over the fire and drawing in to a sooted neck — it was six stepped
        // drums, which from the road is a wedding cake. 24 sides, so a side's edge lies on each
        // diagonal and the surface map has no smeared facet there.
        const kx = -19, kz = 14, kb = y;
        const KP = [[0, 3.30], [1.3, 3.40], [3.0, 3.06], [4.8, 2.36], [6.3, 1.62], [7.2, 1.33], [8.2, 1.30]];
        const kilnCol = (h) => {                     // stone at the foot, limewash, soot at the neck
          const a = Math.min(1, h / 4.5), b = Math.max(0, (h - 5.0) / 3.2);
          return P.stone.map((v, j) => (v + (P.lime[j] - v) * a) * (1 - b) + P.soot[j] * b);
        };
        for (let i = 0; i + 1 < KP.length; i++) {
          const [h0, r0] = KP[i], [h1, r1] = KP[i + 1];
          const g = k.solid.tube(r1, r0, h1 - h0, 24, kx, kb + (h0 + h1) * 0.5, kz, P.stone);
          const pos = g.attributes.position, col = g.attributes.color;
          for (let v = 0; v < pos.count; v++) col.setXYZ(v, ...kilnCol(pos.getY(v) - kb));
        }
        k.solid.cyl(1.46, 1.46, 0.28, 24, kx, kb + 8.32, kz, P.soot);            // the lip, over the mouth
        api.emit({ kind: 'circle', x: kx, z: kz, r: 3.4, y0: kb - 0.4, y1: kb + 8.46, tag: 'stone' });
        // THE MOUTH: an iron-framed arch proud of the swell, sooted inside, on a hearth stone.
        // The fire in it is the body's (a landmark glow is never lit at a place nobody claims).
        for (const sd of [-1, 1]) k.solid.box(0.30, 2.10, 0.90, kx + sd * 1.05, kb + 1.05, kz + 3.45, P.iron);
        k.solid.box(2.40, 0.42, 0.90, kx, kb + 1.89, kz + 3.45, P.iron);
        k.solid.box(1.80, 1.68, 0.06, kx, kb + 0.84, kz + 3.46, P.soot);
        k.solid.box(2.40, 0.12, 0.95, kx, kb + 0.06, kz + 3.475, P.soot);
        api.emit({ kind: 'obb', x: kx, z: kz + 3.475, halfX: 1.2, halfZ: 0.475, yaw: 0,
          y0: kb - 0.1, y1: kb + 2.1, tag: 'metal', climbable: false });
        // THE GATE at the foot of the upper stair: two field-gate leaves hung on the stone
        // piers the body builds, swinging OUT toward the lane when the hamlet holds.
        const GX = 6, GZ = -5.2, GW = 2.6;
        for (const sd of [-1, 1]) {
          const lk = kits().solid, reach = GW * 0.5 - 0.02;
          const ctr = -sd * reach * 0.5;
          for (const yy of [0.20, 0.80, 1.42]) lk.box(reach, 0.10, 0.07, ctr, yy, 0, P.board);
          lk.box(0.10, 1.55, 0.08, -sd * 0.05, 0.78, 0, P.board);
          lk.box(0.10, 1.55, 0.08, -sd * (reach - 0.05), 0.78, 0, P.board);
          lk.box(0.07, Math.hypot(reach - 0.1, 1.2), 0.06, ctr, 0.81, 0.01, P.board, 0, 0, sd * Math.atan2(reach - 0.1, 1.2));
          k.moving.push({ geo: lk.build(), role: 'gateLeaf', rate: 0, x: GX + sd * GW * 0.5, y: y + CUT_LOW, z: GZ, open: sd * 1.5 });
        }
        trackMarkers(k, api);   // D17: the two lit posts at the ends of the gravel track
        return { solid: k.solid.build(), glow: k.glow.build(), moving: k.moving, glowColour: GLOW.ember };
      },
      body(api) {
        const k = kits(), y = api.padY;
        const LOW = CUT_LOW, HIGH = CUT_HIGH;
        const GF = y + ON_APRON + 0.12;   // a cottage floor: one low step up off the dust
        const open = heldForBody(api);

        // THE TERRACES: filled blocks, BOTH from under the pad — the upper one is 7.7 m of
        // rock, not a shelf hung behind the lower one that you could walk in under from the
        // open ends. The lower one takes the ramp at its east end.
        block(k, api, 44, 9.5, 2, -5.75, y - 0.5, y + LOW, P.dust, 0, 'floor');
        block(k, api, 28, 8.1, -2, -14.55, y - 0.5, y + HIGH, P.dust, 0, 'floor');
        // stairs: the quarry floor up to the lower terrace at the lane, and lower to upper
        stair(k, api, 0, -1.0 + stairRun(y, y + LOW), Math.PI, y, y + LOW, 3.2, P.stone);
        stair(k, api, 6, -10.5 + stairRun(y + LOW, y + HIGH), Math.PI, y + LOW, y + HIGH, 2.6, P.stone);

        // THE GATE'S PIERS AND CHEEKS, always, and the gate itself until the hamlet holds.
        // The cheeks run down both sides of the first five treads: a tread you could step onto
        // from beside the stair is a tread the gate does not guard. Tread six is 1.52 m up.
        const GX = 6, GZ = -5.2, GW = 2.6;
        for (const sd of [-1, 1]) {
          const px = GX + sd * (GW * 0.5 + 0.25);
          solid(k, api, 0.5, 1.9, 0.5, px, y + LOW + 0.95, GZ, P.stone, 0, 'stone', { climbable: false });
          k.solid.box(0.62, 0.12, 0.62, px, y + LOW + 1.96, GZ, P.lime);
          solid(k, api, 0.3, 1.5, 1.8, GX + sd * (GW * 0.5 + 0.15), y + LOW + 0.75, GZ - 1.1, P.stone, 0, 'stone', { climbable: false });
        }
        if (!open) {
          // 1.62 m: over the vault's reach. Not breakable: the car can climb the ramp to here.
          api.emit({ kind: 'obb', x: GX, z: GZ, halfX: GW * 0.5, halfZ: 0.08, yaw: 0,
            y0: y + LOW - 0.1, y1: y + LOW + 1.62, tag: 'gate', climbable: false, breakable: false });
          k.solid.box(0.36, 0.30, 0.10, GX, y + LOW + 0.95, GZ + 0.08, P.iron);   // chain and lock
          k.solid.box(0.05, 0.05, 0.62, GX, y + LOW + 1.05, GZ + 0.07, P.iron, Math.PI * 0.5);
        } else {
          for (const sd of [-1, 1]) {
            const reach = GW * 0.5 - 0.02;
            openLeaf(api, GX + sd * GW * 0.5, GZ, -sd * reach * 0.5, 0, reach * 0.5, 0.05, sd * 1.5, y + LOW, y + LOW + 1.56);
          }
        }

        // THE RAMP the car climbs. 34 m for 3.3 m of rise is under 6 degrees, nothing to a
        // car and nothing to walk. Twelve overlapping slabs of fill, each solid from below
        // the pad to its top, so the wheels never find a seam and nobody walks under it.
        for (let i = 0; i < 12; i++) {
          const t = i / 11, z = 34 - t * 33.8, top = y + 0.1 + t * (LOW - 0.1);
          block(k, api, 7.2, 3.4, 21.5 - t * 1.0, z, y - 0.5, top, P.dust, 0.02, 'floor');
        }
        // a kerb of cut blocks down the ramp's outer edge, so its line reads at night — and
        // so it is a kerb and not a picture of one
        for (let i = 0; i < 11; i++) {
          const t = (i + 0.5) / 11, z = 34 - t * 33.8, top = y + 0.1 + t * (LOW - 0.1);
          solid(k, api, 0.5, 0.34, 1.1, 21.5 - t * 1.0 + 3.35, top + 0.17, z, P.lime, 0.02, 'kerb', { standable: true });
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
          house(k, api, { top: GF, base: y - 0.3, ...c, wall: P.stone, roof: P.slate, floorCol: P.dust, chimney: true, chimneyCol: P.stone, frame: P.lime });
          // a stack of cut blocks by every door, and one collider for the stack
          const cc = Math.cos(c.yaw), cs = Math.sin(c.yaw);
          const top = c.top !== undefined ? c.top : GF;
          const lx = c.w * 0.5 + 0.9, lz0 = -c.d * 0.5 - 0.2;
          for (let i = 0; i < 5; i++) {
            const lz = lz0 + (i % 2) * 0.12;
            k.solid.box(0.95, 0.34, 0.62, c.x + lx * cc + lz * cs, top + 0.17 + i * 0.34, c.z - lx * cs + lz * cc, P.lime, c.yaw + (i % 2 ? 0.05 : -0.05));
          }
          api.emit({ kind: 'obb', x: c.x + lx * cc + (lz0 + 0.06) * cs, z: c.z - lx * cs + (lz0 + 0.06) * cc,
            halfX: 0.50, halfZ: 0.37, yaw: c.yaw, y0: top - 0.1, y1: top + 1.70, tag: 'stone', standable: true });
        }

        // THE OLD QUARRY HOUSING, somebody's again once the hamlet holds. The west cottage is
        // the office: a desk, the ledger open on it, a cot, and the box the wages went in. The
        // east one is the bunkhouse: four bunks, one of them made.
        const UT = y + HIGH + 0.02;
        solid(k, api, 0.70, 0.76, 1.40, -12.2, UT + 0.38, -15.0, P.board, 0, 'wood', { standable: true });
        k.solid.box(0.42, 0.05, 0.30, -12.2, UT + 0.785, -14.8, P.paper, 0.2);
        solid(k, api, 1.90, 0.40, 0.80, -11.0, UT + 0.20, -16.35, P.post, 0, 'wood', { standable: true });
        k.solid.box(1.70, 0.08, 0.70, -11.0, UT + 0.44, -16.35, P.blanket);
        if (typeof api.flag === 'function') stash(k, api, { id: 'office', x: -8.5, z: -16.2, y: HIGH + 0.02, yaw: 0 });
        for (const [bx, made] of [[0.6, true], [2.9, false]]) {
          for (const bh of [0.30, 1.30]) {
            solid(k, api, 1.90, 0.12, 0.85, bx, UT + bh, -16.25, P.board, 0, 'wood', { standable: true });
          }
          for (const ox of [-0.9, 0.9]) for (const oz of [-0.38, 0.38]) {
            k.solid.box(0.07, 1.60, 0.07, bx + ox, UT + 0.80, -16.25 + oz, P.post);
          }
          if (made) k.solid.box(1.70, 0.10, 0.75, bx, UT + 0.41, -16.25, P.blanket);
        }
        // the bench at the terrace edge, facing the road lamps Meriel talks about
        solid(k, api, 1.8, 0.45, 0.42, -4, UT + 0.225, -11.4, P.board, 0, 'wood', { standable: true });

        // THE ROAD END: the post, the fire in the lane, the fuel by the ramp foot.
        lookout(k, api, 0, 28, 0, y, P.dust);
        fire(k, api, -1, 12, y + ON_APRON);
        fuel(k, api, 13, 24, y + ON_APRON, 0.3);

        // Lamps on posts down the lane and along both terrace edges, so the shape of the
        // cut reads at night. (The upper-terrace one at x 6 stood in the top of the stair;
        // it stands beside it now.)
        for (const [lx, lz, top] of [[-4, 22, 0], [4, 22, 0], [-4, 1, 0], [4.5, 1, 0],
          [-14, -1.6, LOW], [14, -1.6, LOW], [22, -1.6, LOW], [-8, -11.1, HIGH], [8.4, -11.1, HIGH]]) {
          lamp(k, api, lx, y + top, lz, 2.7, P.iron);
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
        api.emit({ kind: 'obb', x: -17, z: -6, halfX: 0.45, halfZ: 0.45, yaw: 0.18,
          y0: y + HIGH - 0.45, y1: y + HIGH + 0.25, tag: 'wood', climbable: false });

        // THE KILN'S FIRE, lit here (see wayIn): hot at the hearth of the landmark's mouth and
        // gone by the lintel, the light it throws on the dust in front, and the heat over the
        // lip. It was on the landmark, and so it never once burned.
        const kx = -19, kz = 14;
        k.glow.pane(1.80, 1.68, kx, y + 0.84, kz + 3.52, FIRE_MOUTH, 0, 0, 5, 5);
        k.glow.pane(1.3, 1.3, kx, y + 0.045, kz + 4.6, POOL, 0, -Math.PI * 0.5, 6, 6);
        fadeUp(k.glow.tube(0.95, 1.22, 1.3, 12, kx, y + 9.12, kz, EMBER));
        trackMarkers(k, api, true);
        void groundY;
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
      },
    },

    /* ==================================================================== HIGHWOOD == */
    // The platforms are still up in the big pines with the party on every rail, and the
    // people came down. Four cabins on the ground between the trunks, a fire, the long
    // table, and paper lanterns strung trunk to trunk. Pell: "Thirteen rungs. I counted them
    // coming down. I am not going back up." Until the hamlet holds the ladder is hauled up to
    // its top four rungs; after, all thirteen come down, and the platforms are a real place.
    treehouses: {
      landmark(api) {
        wire(api);
        const k = kits(), y = api.padY;
        // The four trunks, tall enough to read from the road with the platforms in them: wide
        // at the foot and drawn in to 0.40 m at the top, so from the ground they read as trees
        // and not as silos. Collided in bands that follow the taper, 3 cm proud of the bark,
        // so nobody stops 20 cm short of the tree inside a cabin.
        for (let n = 0; n < HW_TREES.length; n++) {
          const t = HW_TREES[n], { x, z, h } = t;
          k.solid.cyl(TRUNK_R1, TRUNK_R0, h, 12, x, y + h * 0.5, z, P.bark);
          const bands = [-0.5, 3.0, 6.2, 9.5, h];
          for (let b = 0; b + 1 < bands.length; b++) {
            api.emit({ kind: 'circle', x, z, r: b ? trunkR(t, bands[b]) + 0.03 : 0.95,
              y0: y + bands[b], y1: y + bands[b + 1], tag: 'tree' });
          }
          // THE CROWN. Six tiers of drooping bough from `crown` up and a spire over them, each
          // tier a skirt with a shaded underside rising back to the trunk, turned and leaned a
          // little on its own, with a few boughs breaking its rim. They were four flat-bottomed
          // octagons on a bare pole: lampshades from the road, parasols from the decks.
          const tip = h + 3.0, NT = 6, S = (tip - 3.2 - t.crown) / (NT - 1);
          for (let i = 0; i < NT; i++) {
            const q = (n * 7 + i * 3) % 5, R = 3.9 * (1 - 0.66 * i / NT) * (0.94 + q * 0.03);
            const yb = y + t.crown + i * S, seg = 7 + (i + n) % 3;
            const H = Math.min(S * 1.5 + 0.6, y + tip - 0.8 - yb);     // the top tier stays inside the spire
            const ry = i * 0.9 + n, lx = ((q - 2) * 0.02), lz = (((n + i) % 3) - 1) * 0.025;
            const ox = x + (q - 2) * 0.05, oz = z + (((i * 2 + n) % 3) - 1) * 0.06;
            k.solid.tube(0.30, R, H, seg, ox, yb + H * 0.5, oz, P.needle, ry, lz, lx);
            k.solid.tube(0.45, R * 0.96, 0.85, seg, ox, yb + 0.425, oz, P.needleDark, ry, lz, lx);
            if (i === 0) continue;            // the lowest rim stays clean over the cabins and the lookout
            for (let b = 0; b < 5; b++) {
              const ba = b * 1.2566 + i * 0.7 + n * 1.3, bl = 1.5 + ((b + i) % 3) * 0.3, droop = 0.35 + (b % 2) * 0.12;
              const dx = Math.sin(ba), dz = Math.cos(ba), reach = R - 0.4 + bl * 0.5 * Math.cos(droop);
              // laid along +X and dropped by `droop` (rz), then turned so +X points along ba
              k.solid.cone(0.34, bl, 4, ox + dx * reach, yb + 0.35 - bl * 0.5 * Math.sin(droop), oz + dz * reach,
                P.needle, ba - Math.PI * 0.5, 0, -(Math.PI * 0.5 + droop));
            }
          }
          k.solid.cone(1.15, 3.2, 8, x, y + tip - 1.6, z, P.needle, n * 0.7);
        }
        trackMarkers(k, api);   // D17: the two posts at the ends of the gravel track (lit by the body)
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.ember };
      },
      body(api) {
        const k = kits(), y = api.padY;
        const GF = y + ON_APRON + 0.12;
        const TRUNKS = [[-9, -7], [8, -6], [10, 9], [-8, 8]];
        const open = heldForBody(api);

        // THE PLATFORMS. Square 8.4 m decks on the four trunks, rising round the ring
        // 6.4 -> 7.2 -> 8.0 -> 8.8, a cabin round the trunk on the first three and the lookout
        // on the fourth. They were a backdrop you could not reach: bridges from trunk centre to
        // trunk centre, cabins that closed their own doors off round the tree, pumpkins and
        // lanterns in the air. Every edge is railed and collided now, except where a bridge or
        // the ladder arrives.
        const PW = 8.4, PH = PW * 0.5, GAP = 0.85;
        const PLAT = [
          { x: -9, z: -7, top: 6.4, cabin: -Math.PI * 0.5, gaps: { e: [-9.6, -4.5] } },
          { x: 8, z: -6, top: 7.2, cabin: Math.PI * 0.5, gaps: { w: [-4.5], n: [9] } },
          { x: 10, z: 9, top: 8.0, cabin: 0, gaps: { s: [9], w: [8.5] } },
          { x: -8, z: 8, top: 8.8, cabin: null, gaps: { e: [8.5] } },
        ];
        for (let i = 0; i < PLAT.length; i++) {
          const p = PLAT[i], T = y + p.top;
          k.solid.box(PW, 0.22, PW, p.x, T - 0.11, p.z, P.board);
          api.emit({ kind: 'obb', x: p.x, z: p.z, halfX: PH, halfZ: PH, yaw: 0,
            y0: T - 0.34, y1: T, tag: 'deck', standable: true, climbable: false });
          // joists under the edges, and four braces from the trunk out to the corners
          for (const sd of [-1, 1]) {
            k.solid.box(PW, 0.18, 0.16, p.x, T - 0.31, p.z + sd * (PH - 0.1), P.post);
            k.solid.box(0.16, 0.18, PW, p.x + sd * (PH - 0.1), T - 0.31, p.z, P.post);
          }
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            strut(k, p.x + sx * 0.55, T - 3.2, p.z + sz * 0.55, p.x + sx * (PH - 0.35), T - 0.40, p.z + sz * (PH - 0.35), 0.16, P.post);
          }
          // the rails, side by side, round the gaps
          const sides = {
            e: { a: [p.x + PH - 0.06, p.z - PH], b: [p.x + PH - 0.06, p.z + PH], axis: 1 },
            w: { a: [p.x - PH + 0.06, p.z - PH], b: [p.x - PH + 0.06, p.z + PH], axis: 1 },
            n: { a: [p.x - PH, p.z + PH - 0.06], b: [p.x + PH, p.z + PH - 0.06], axis: 0 },
            s: { a: [p.x - PH, p.z - PH + 0.06], b: [p.x + PH, p.z - PH + 0.06], axis: 0 },
          };
          for (const key of Object.keys(sides)) {
            const sd = sides[key], ax = sd.axis;
            const cuts = [sd.a[ax]];
            for (const g of (p.gaps[key] || []).slice().sort((u, v) => u - v)) cuts.push(g - GAP, g + GAP);
            cuts.push(sd.b[ax]);
            for (let c = 0; c + 1 < cuts.length; c += 2) {
              const u0 = cuts[c], u1 = cuts[c + 1];
              if (u1 - u0 < 0.3) continue;
              const A = sd.a.slice(), B = sd.a.slice();
              A[ax] = u0; B[ax] = u1;
              railRun(k, api, A[0], A[1], B[0], B[1], T, P.board);
            }
          }
          // JACK-O-LANTERNS, one on every corner post, sat on a cap. Still lit. Nobody blew
          // them out.
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            const cx = p.x + sx * (PH - 0.06), cz = p.z + sz * (PH - 0.06);
            k.solid.box(0.30, 0.05, 0.30, cx, T + 1.015, cz, P.post);
            k.solid.cyl(0.24, 0.21, 0.34, 10, cx, T + 1.21, cz, P.pumpkin);
            k.glow.cyl(0.22, 0.19, 0.36, 9, cx, T + 1.21, cz, EMBER);
          }
          if (p.cabin !== null) {
            // A CABIN ROUND THE TRUNK: 1.37 m clear between the trunk and the door wall and
            // 1.67 m to the side walls, so you walk round the tree that holds the room up.
            const hc = house(k, api, { x: p.x, z: p.z, yaw: p.cabin, w: 5.6, d: 5.0, h: 2.4,
              top: T + 0.02, base: T - 0.2, wall: P.plank, roof: P.tar, floorCol: P.board, doorW: 1.1 });
            // Where the trunk goes out through the ridge: a tarred collar round it, from under
            // both pitches to a hand over the ridge board, so the roof is fitted to its tree
            // and not run through by it. Collided, because the roof is a floor (gableFloor).
            const ridge = T + 0.02 + 2.4 + hc.rise, cr = trunkR(HW_TREES[i], ridge - y) + 0.08;
            k.solid.cyl(cr, cr + 0.03, 0.85, 12, p.x, ridge - 0.175, p.z, P.tar);
            api.emit({ kind: 'circle', x: p.x, z: p.z, r: cr + 0.03, y0: ridge - 0.6, y1: ridge + 0.25, tag: 'wood' });
            // the costume that came off first, on a nail by the door
            for (let b = 0; b < 5; b++) {
              const [qx, qz] = hc.at(-hc.hw * 0.55, -hc.hd - 0.011);
              k.solid.box(0.42 - Math.abs(b - 2) * 0.09, 0.05, 0.02, qx, T + 1.78 - b * 0.13, qz, P.paper, p.cabin);
            }
            if (i === 0) {
              // THE CLOAKROOM. Twelve pegs on the back wall. Eight coats. Eight came down.
              for (let n = 0; n < 12; n++) {
                const u = -2.35 + n * (4.7 / 11);
                const [qx, qz] = hc.at(u, hc.hd - 0.25);
                k.solid.box(0.04, 0.04, 0.14, qx, T + 1.80, qz, P.post, p.cabin);
                if (n % 3 !== 1) {
                  const [cx, cz] = hc.at(u, hc.hd - 0.28);
                  k.solid.box(0.40, 0.92, 0.08, cx, T + 1.32, cz, n & 1 ? P.coat : P.coat2, p.cabin);
                }
              }
              // the row of coats is a thing you brush against, not a thing you walk into
              const [rx, rz] = hc.at(0, hc.hd - 0.26);
              api.emit({ kind: 'obb', x: rx, z: rz, halfX: 2.55, halfZ: 0.08, yaw: p.cabin,
                y0: T + 0.84, y1: T + 1.82, tag: 'cloth', climbable: false });
            } else if (i === 1) {
              // THE PARTY. The table, the cake nobody cut, and three chairs for a band.
              // Against the side wall, 0.9 m clear of the trunk: the way round the tree stays open.
              const [tx, tz] = hc.at(2.2, 0);
              solid(k, api, 0.7, 0.76, 2.0, tx, T + 0.40, tz, P.plank, p.cabin, 'wood', { standable: true });
              k.solid.cyl(0.26, 0.26, 0.20, 12, tx, T + 0.88, tz, P.paper);
              for (let n = 0; n < 3; n++) {
                const [cx, cz] = hc.at(-2.2, -1.0 + n * 1.0);
                solid(k, api, 0.44, 0.46, 0.44, cx, T + 0.25, cz, P.post, p.cabin, 'wood', { standable: true });
                const [bx, bz] = hc.at(-2.44, -1.0 + n * 1.0);
                k.solid.box(0.05, 0.50, 0.44, bx, T + 0.73, bz, P.post, p.cabin);
              }
            } else if (i === 2) {
              // THE LOFT. Three bedrolls, a candle on a crate between two of them, and the
              // box the door money went in.
              for (const [u, v] of [[-1.9, 1.3], [1.9, 1.3], [-1.9, -1.0]]) {
                const [bx, bz] = hc.at(u, v);
                solid(k, api, 0.85, 0.14, 1.8, bx, T + 0.09, bz, P.canvas, p.cabin, 'cloth', { standable: true });
              }
              const [cx, cz] = hc.at(-2.25, 0.15);
              solid(k, api, 0.36, 0.36, 0.36, cx, T + 0.20, cz, P.post, p.cabin, 'wood');
              k.solid.cyl(0.03, 0.03, 0.12, 6, cx, T + 0.44, cz, P.paper);
              k.glow.cyl(0.035, 0.02, 0.08, 6, cx, T + 0.54, cz, CANDLE);
              if (typeof api.flag === 'function') {
                const [sxw, szw] = hc.at(1.9, -1.2);
                stash(k, api, { id: 'loft', x: sxw, z: szw, y: p.top + 0.02, yaw: p.cabin + Math.PI });
              }
            }
          } else {
            // THE LOOKOUT. A spyglass on a tripod, pointed at the road, and somewhere to sit.
            // The glass stands in the road-side corner, out of the view it is for (it stood
            // dead centre in it, and under the torch it was a white blot in the middle of the
            // county).
            const gx = p.x + PH - 1.05, gz = p.z + PH - 1.05, aim = 0.35;
            for (let n = 0; n < 3; n++) {
              const a = n * 2.094 + 0.3;
              strut(k, gx + Math.sin(a) * 0.42, T + 0.02, gz + Math.cos(a) * 0.42, gx, T + 1.28, gz, 0.04, P.post);
            }
            k.solid.cyl(0.055, 0.075, 0.95, 10, gx + Math.sin(aim) * 0.15, T + 1.36, gz + Math.cos(aim) * 0.15,
              P.iron, aim, Math.PI * 0.5 - 0.08, 0);
            api.emit({ kind: 'circle', x: gx, z: gz, r: 0.45, y0: T, y1: T + 1.45, tag: 'metal', climbable: false });
            solid(k, api, 1.6, 0.44, 0.42, p.x - 2.2, T + 0.22, p.z + PH - 1.1, P.board, 0, 'wood', { standable: true });
          }
          // paper lanterns on short poles off the mid-rail, where no bridge arrives
          for (const [key, lx, lz] of [['e', p.x + PH - 0.06, p.z], ['w', p.x - PH + 0.06, p.z],
            ['n', p.x, p.z + PH - 0.06], ['s', p.x, p.z - PH + 0.06]]) {
            const along = key === 'e' || key === 'w' ? lz : lx;
            if ((p.gaps[key] || []).some(g => Math.abs(g - along) < GAP + 0.3)) continue;
            if (p.cabin === null && key === 'n') continue;     // the lookout's view side: nothing in the way
            k.solid.box(0.05, 0.55, 0.05, lx, T + 1.265, lz, P.post);
            k.glow.cyl(0.11, 0.09, 0.19, 8, lx, T + 1.62, lz, EMBER);
          }
        }

        // THE ROPE BRIDGES, edge to edge now (they ran trunk centre to trunk centre, flat,
        // through both cabins), each a slope of boards whose collision is a stair of strips a
        // few centimetres a riser, with a collided rope rail either side.
        const bridge = (ax, az, ay, bx, bz, by, width) => {
          const len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az);
          const rise = by - ay, pitch = Math.atan2(rise, len), L = Math.hypot(len, rise);
          const ux = (bx - ax) / len, uz = (bz - az) / len, c = Math.cos(yaw), s = Math.sin(yaw);
          const mx = (ax + bx) * 0.5, mz = (az + bz) * 0.5, my = (ay + by) * 0.5;
          k.solid.box(width, 0.12, L, mx, my - 0.06, mz, P.board, yaw, -pitch, 0);
          const ns = Math.floor(len / 0.55);
          for (let i = 0; i < ns; i++) {
            const t = (i + 0.5) / ns;
            k.solid.box(width + 0.12, 0.04, 0.13, ax + ux * len * t, ay + rise * t + 0.005, az + uz * len * t, P.post, yaw);
          }
          const n = Math.max(Math.ceil(len / 1.0), Math.ceil(Math.abs(rise) / 0.2));
          for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n, top = ay + rise * t;
            api.emit({ kind: 'obb', x: ax + ux * len * t, z: az + uz * len * t, halfX: width * 0.5,
              halfZ: len / n * 0.5 + 0.02, yaw, y0: top - 0.34, y1: top, tag: 'deck', standable: true, climbable: false });
          }
          for (const side of [-1, 1]) {
            const ox = c * side * (width * 0.5 - 0.03), oz = -s * side * (width * 0.5 - 0.03);
            k.solid.box(0.06, 0.06, L, mx + ox, my + 0.95, mz + oz, P.rope, yaw, -pitch, 0);
            const m = Math.max(3, Math.round(len / 1.6));
            for (let j = 0; j <= m; j++) {
              const t = j / m;
              k.solid.box(0.05, 0.95, 0.05, ax + ux * len * t + ox, ay + rise * t + 0.475, az + uz * len * t + oz, P.rope);
            }
            api.emit({ kind: 'obb', x: mx + ox, z: mz + oz, halfX: 0.05, halfZ: len * 0.5, yaw,
              y0: Math.min(ay, by), y1: Math.max(ay, by) + 1.0, tag: 'rail', climbable: false, breakable: false });
          }
        };
        bridge(-9 + PH, -4.5, y + 6.4, 8 - PH, -4.5, y + 7.2, 1.5);
        bridge(9, -6 + PH, y + 7.2, 9, 9 - PH, y + 8.0, 1.5);
        bridge(10 - PH, 8.5, y + 8.0, -8 + PH, 8.5, y + 8.8, 1.5);

        // THE LADDER, on P0's east edge facing the table and the fire: the county's own climb
        // face (climbs-and-caches.js), one boarded 'wall' from under the ground to EXACTLY the
        // deck, so the pull at the top lands on the boards. From the ground to 6.4 m that is
        // thirteen rungs, the number Pell counted. Before the hamlet holds it is hauled up to
        // its top four and cannot be climbed, with the rope it came up on coiled beside it.
        {
          const TOP = 6.4, LZ = -9.6, FX = -9 + PH + 0.08;
          if (open) {
            climbFace(k, api, { x: FX, z: LZ, yaw: Math.PI * 0.5, base: -0.25, height: TOP + 0.25, width: 1.3 });
            // THE LANDING. The pull at the top of a climb lands only on a top the ledge probe
            // will take, and every deck up here is climbable:false (so nothing on the ground —
            // a cabin ridge, the winch basket — can fling a body onto one). This strip of
            // P0's boards, inside the gap in the rail and only while the ladder is down, is
            // the one place a hand can come over the lip. It is the deck, collided twice.
            api.emit({ kind: 'obb', x: FX - 0.08 - 0.55, z: LZ, halfX: 0.55, halfZ: 0.70, yaw: 0,
              y0: y + TOP - 0.34, y1: y + TOP, tag: 'deck', standable: true });
            // a lit pumpkin at its foot: the thing you see first from the fire
            pumpkin(k, api, FX + 0.75, y + ON_APRON, LZ + 0.9);
          } else {
            const stub = Object.assign({}, api, {
              emit: (sh) => api.emit(Object.assign({}, sh, { tag: 'wood', climbable: false })),
            });
            climbFace(k, stub, { x: FX, z: LZ, yaw: Math.PI * 0.5, base: TOP - 2.3, height: 2.3, width: 1.3 });
            k.solid.cyl(0.34, 0.34, 0.16, 12, FX - 0.75, y + TOP + 0.08, LZ + 1.1, P.rope);
            k.solid.cyl(0.20, 0.20, 0.17, 12, FX - 0.75, y + TOP + 0.085, LZ + 1.1, P.board);
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
        // paper lanterns strung trunk to trunk at head height and a half. The line SAGS with
        // them now and each one hangs on a cord from it (the line was straight at 3.4 m and
        // the lanterns hung 0.2-0.6 m under it from nothing).
        for (let s = 0; s < TRUNKS.length; s++) {
          const [ax, az] = TRUNKS[s], [bx, bz] = TRUNKS[(s + 1) % TRUNKS.length];
          const Y = (t) => y + 3.4 - Math.sin(t * Math.PI) * 0.35;
          let px = ax, pz = az, py = Y(0);
          for (let n = 1; n <= 7; n++) {
            const t = n / 7, qx = ax + (bx - ax) * t, qz = az + (bz - az) * t, qy = Y(t);
            strut(k, px, py, pz, qx, qy, qz, 0.03, P.rope);
            px = qx; pz = qz; py = qy;
          }
          for (let n = 1; n < 7; n++) {
            const t = n / 7, lx = ax + (bx - ax) * t, lz = az + (bz - az) * t, ly = Y(t);
            k.solid.box(0.015, 0.14, 0.015, lx, ly - 0.07, lz, P.rope);
            k.glow.cyl(0.12, 0.10, 0.20, 8, lx, ly - 0.24, lz, n % 2 ? EMBER : LAMP);
          }
        }
        // pumpkins at the foot of every trunk, cut and lit
        for (const [tx, tz] of TRUNKS) for (let n = 0; n < 3; n++) {
          const a = n * 2.1 + tx * 0.3;
          pumpkin(k, api, tx + Math.sin(a) * 1.35, y + ON_APRON, tz + Math.cos(a) * 1.35);
        }
        // THE ROAD END: the post and the lamps; the fuel by the winch.
        lookout(k, api, 0, 25, 0, y, P.board);
        for (const [lx, lz] of [[-6, 20], [6, 20], [-8, 3], [8, 3], [-14, -10], [15, -9]]) lamp(k, api, lx, y, lz, 2.7);

        // THE WINCH BASKET: how everything that is up there got up there, and the gas
        // person's post. The rope runs off the bar and on to the first platform's corner post.
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
        strut(k, 0, y + 8.16, -14.0, -9 + PH - 0.06, y + 6.9, -7 - PH + 0.06, 0.035, P.rope);
        fuel(k, api, 3.6, -12.4, y + ON_APRON, -0.4);
        trackMarkers(k, api, true);   // the lanterns on the track posts (see wayIn)
        void C; void groundY;
        return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.ember };
      },
    },
  };
}

export default makeHamletBuilders;
