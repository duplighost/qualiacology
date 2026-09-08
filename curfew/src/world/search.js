// CURFEW — GOING THROUGH A BODY. Owner: the search lane.
//
// Alex, 2026-09-07:
//
//   "we need a cash system. holding e on dead people should get you a few coins if you kill
//    them. or if you just find bodies."
//
// Search bodies and pay guarded tolls with E. Currency and feedback belong to progress;
// contextual price/balance belong to the shared prompt. A cashier borrows one existing
// rover lamp while nearby, released when the player leaves.
//
// TWO KINDS OF DEAD PERSON, ONE VERB:
//
//   1. A CORPSE YOU MADE. enemies.js keeps a killed body standing for CORPSE_UNSEARCHED_S
//      before it sinks, and nothing else in the game reads that state — `raycast` skips
//      anything not alive, and the director does not count it. `enemies.nearestCorpse()` is
//      the one door into it, added for this file.
//
//   2. A BODY THAT WAS ALWAYS DEAD. staged.js's scenes stand fallen bodies in the county as
//      pure scenery, welded into a site's one merged geometry — no enemy record, no AI, no
//      draw of their own. They are found through the collider they already emit, which is
//      why staged.js's `fallenBody` now tags itself 'body' instead of 'wood'.
//
// A searched body STAYS. You went through their pockets; you did not take them away. The
// scenery ones remember it in progress's worldFlags so a site that streams out and back does
// not pay twice; a corpse remembers it on its own record until the pool slot is reused.
//
// Payment is contextual and explicit: price, balance and any shortfall appear while
// looking at the cashier. Alex asked for the money system to be understandable.

import { CFG } from '../config.js';

/** How close you have to be. The breaker is 2.4 m and a body is on the floor, so this is
 *  tighter — you are standing over them, not near them. */
const SEARCH_R = 1.9;
/** cos of the angle you have to be facing them within. places' claim uses 0.5 (60 deg); a
 *  body is a small target and looking at it should be part of the verb. */
const SEARCH_FACE = 0.45;
/** Seconds of held E. Longer than a claim's 0.6 because this is a search, not a switch. */
const SEARCH_HOLD_S = 0.85;
/** How high above the body the glyph floats. A corpse lies down; the glyph must not be in
 *  the ground, and must not be where a door's glyph would be either. */
const GLYPH_Y = 0.62;

/** What a body has on them. Seeded per body, never Math.random. */
const PURSE_MIN = 2;
const PURSE_MAX = 7;
/** A body that was already dead when you found it has been out here a while, and somebody
 *  else may have been through it first. Sometimes there is nothing. */
const FOUND_EMPTY_CHANCE = 0.28;

/* --------------------------------------------------------------- THE TOLL --
 * Alex: "you have to pay someone at the door to get in. you can try to fight your way in,
 * but there are a lot of them."
 *
 * The same verb, one radius wider, because you are paying a man rather than kneeling over a
 * body. Price, purse and shortfall are visible before the hold. A refused hold gives
 * a dry click and requires release before retrying, without subtracting any money.
 */
const GATE_R = 3.0;
const GATE_HOLD_S = 1.1;
/** What the doorman wants. Roughly eight bodies' worth, or two strongboxes, or a long night
 *  of crates — enough that you have to have been doing something, not so much that the
 *  castle is gated behind a grind. */
const GATE_PRICE = 40;

export class Search {
  static id = 'search';

  constructor(ctx) {
    this.ctx = ctx;
    this.rng = ctx.rng.fork('search');

    // The scenery bodies, published by the staged/site builders through places. A flat array
    // rather than a spatial index: the county holds a few dozen, and the step below only ever
    // looks at the ones inside SEARCH_R of the player, which is a cheap linear pass.
    this.bodies = [];
    // and the doors you pay at. One today, and the shape holds for any number.
    this.gates = [];

    this.holdT = 0;
    this.holdKey = '';
    this._usePrev = false;
    this._releaseRequired = false;
    this._lamp = null; this._lampKey = '';
    this._promptP = { kind: '', x: 0, y: 0, z: 0, k: 0, label: 'E' };

    this._stat = { searched: 0, paid: 0, refused: 0, bodies: 0, tolls: 0, turnedAway: 0 };
  }

  ready() { return true; }

  dispose() {
    const lights = this._sys('lights');
    if (this._lamp && lights) lights.release(this._lamp);
    this.bodies.length = 0; this.gates.length = 0;
  }

  _sys(id) { return this.ctx.systems.get(id); }

  /**
   * Register a body that was always dead. `key` must be stable across a stream-out and back
   * — the site id plus an index — because that is what remembers it has been searched.
   */
  addBody(key, x, y, z) {
    if (!key) return;
    for (let i = 0; i < this.bodies.length; i++) if (this.bodies[i].key === key) return;
    this.bodies.push({ key, x, y, z });
    this._stat.bodies = this.bodies.length;
  }

  /** Register a door with a price on it. The key is the place id; the paid flag is per place. */
  addGate(key, x, y, z, price) {
    if (!key) return;
    for (let i = 0; i < this.gates.length; i++) if (this.gates[i].key === key) return;
    this.gates.push({ key, x, y, z, price: price > 0 ? price : GATE_PRICE });
  }

  /** Has the toll been paid here? */
  gateOpen(key) {
    const prog = this._sys('progress');
    return !!(prog && typeof prog.flag === 'function' && prog.flag('gate:' + key));
  }

  /** Has this one been gone through? Scenery bodies remember it in the save. */
  _sceneryDone(key) {
    const prog = this._sys('progress');
    return !!(prog && typeof prog.flag === 'function' && prog.flag('bs:' + key));
  }

  step(dt) {
    const sh = this.ctx.shared;
    if (sh && sh.paused) return;
    const player = this._sys('player');
    const p = player && player.pos ? player.pos : null;
    if (!p) return;
    const inCar = !!(sh && sh.inCar);

    const inp = this.ctx.input;
    const use = !inCar && !!(inp && typeof inp.held === 'function' && inp.held('use'));

    this._gateLamp(p);
    this._checkDefeated();
    if (!use) this._releaseRequired = false;
    const cand = inCar ? null : this._candidate(p.x, p.y, p.z);

    if (!cand) { this.holdT = 0; this.holdKey = ''; this._usePrev = use; return; }

    const span = cand.kind === 'gate' ? GATE_HOLD_S : SEARCH_HOLD_S;
    const gy = cand.kind === 'gate' ? 1.15 : GLYPH_Y;

    // The glyph, every step there is a candidate. A step without one clears it, which is what
    // hud does when nothing emits.
    this._prompt(cand.x, cand.y + gy, cand.z,
      this.holdKey === cand.key ? this.holdT / span : 0, cand);

    if (!use || this._releaseRequired || cand.hostile) { this.holdT = 0; this.holdKey = ''; this._usePrev = false; return; }

    if (this.holdKey !== cand.key) { this.holdKey = cand.key; this.holdT = 0; }
    this.holdT += dt;
    this._usePrev = true;

    if (this.holdT >= span) {
      this.holdT = 0;
      this.holdKey = '';
      this._releaseRequired = true;
      if (cand.kind === 'gate') this._pay(cand);
      else this._take(cand);
    }
  }

  /** The nearest dead person in reach and in front of you. Corpses win ties: they are the
   *  ones with a clock on them. */
  _candidate(px, py, pz) {
    const cam = this._sys('camera');
    const yaw = cam ? cam.yaw : 0;
    // The camera's forward on the ground plane, the same convention places' claim uses.
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);

    let best = null, bestD = Infinity;

    const facing = (x, z, reach) => {
      const dx = x - px, dz = z - pz;
      const d = Math.hypot(dx, dz);
      if (d > (reach || SEARCH_R)) return -1;
      if (d < 0.15) return d;                       // standing on top of them counts
      return (dx / d) * fx + (dz / d) * fz >= SEARCH_FACE ? d : -1;
    };

    // THE DOOR FIRST. It is the biggest thing in reach and the one you are certainly looking
    // at; a body lying beside the gatehouse must never steal the toll's glyph.
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i];
      if (Math.abs(g.y - py) > 2.4) continue;
      if (this.gateOpen(g.key)) continue;           // paid: the leaves are open, there is no verb
      const d = facing(g.x, g.z, GATE_R);
      if (d < 0 || d >= bestD) continue;
      bestD = d;
      best = { kind: 'gate', key: 'g' + g.key, flag: g.key, price: g.price, hostile: !!this._sys('progress')?.flag('gate-hostile:' + g.key), x: g.x, y: g.y, z: g.z };
    }

    if (best) return best;
    const enemies = this._sys('enemies');
    if (enemies && typeof enemies.nearestCorpse === 'function') {
      const e = enemies.nearestCorpse(px, pz, SEARCH_R);
      if (e) {
        const d = facing(e.pos.x, e.pos.z);
        if (d >= 0 && d < bestD) {
          bestD = d;
          best = { kind: 'corpse', e, key: 'c' + e.id, x: e.pos.x, y: e.pos.y, z: e.pos.z };
        }
      }
    }

    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      if (Math.abs(b.y - py) > 3.2) continue;       // a body on another floor is not in reach
      const d = facing(b.x, b.z);
      if (d < 0 || d >= bestD) continue;
      if (this._sceneryDone(b.key)) continue;
      bestD = d;
      best = { kind: 'found', key: 'b' + b.key, flag: b.key, x: b.x, y: b.y, z: b.z };
    }

    return best;
  }

  /** Pay out. The coin channel is the only thing this lane emits. */
  _take(cand) {
    const prog = this._sys('progress');
    this._stat.searched++;

    let n = PURSE_MIN + Math.floor(this.rng.next() * (PURSE_MAX - PURSE_MIN + 1));
    if (cand.kind === 'found') {
      // Somebody may have been here first. A body with nothing on it is a beat, not a bug:
      // the search still happened, the sound still played, and the county is poorer for it.
      if (this.rng.next() < FOUND_EMPTY_CHANCE) n = 0;
      if (prog && typeof prog.flag === 'function') prog.flag('bs:' + cand.flag, 1);
    } else {
      const enemies = this._sys('enemies');
      if (enemies && typeof enemies.markSearched === 'function') enemies.markSearched(cand.e);
    }

    // The cloth-and-buckle sound happens whether or not there was money in it, because the
    // verb has to answer even when the answer is nothing.
    const audio = this._sys('audio');
    if (audio && typeof audio.dread === 'function') {
      audio.dread('branch', cand.x, cand.y + 0.4, cand.z, 0.42);
    }

    if (n > 0) {
      this._stat.paid += n;
      this.ctx.bus.emit('pickup:coin', {
        n, x: cand.x, y: cand.y + 0.5, z: cand.z, reason: cand.kind,
      });
    } else {
      this._stat.refused++;
    }
  }

  /**
   * THE TOLL. Alex: "you have to pay someone at the door to get in."
   *
   * Price and available money are visible before committing the hold. A failed
   * attempt requires release, so holding E cannot repeatedly refuse or charge.
   */
  _pay(cand) {
    const prog = this._sys('progress');
    const audio = this._sys('audio');
    const paid = !!(prog && typeof prog.spendCash === 'function' && prog.spendCash(cand.price, 'toll'));

    if (!paid) {
      this._stat.turnedAway++;
      if (audio && typeof audio.dread === 'function') audio.dread('lantern', cand.x, cand.y, cand.z, 0.30);
      this.ctx.bus.emit('gate:refused', { id: cand.flag, price: cand.price, have: prog ? prog.cash() : 0 });
      return;
    }

    this._stat.tolls++;
    if (prog && typeof prog.flag === 'function') prog.flag('gate:' + cand.flag, 1);
    if (audio && typeof audio.dread === 'function') audio.dread('lantern', cand.x, cand.y, cand.z, 0.85);
    // The place rebuilds without its gate collider and without its leaves the next time its
    // chunk streams — and a paid gate is paid for the life of the save. Asking places to
    // rebuild NOW is what makes it feel like the door opened rather than like it forgot to.
    const places = this._sys('places');
    if (places && typeof places.rebuildSite === 'function') places.rebuildSite(cand.flag);
    this.ctx.bus.emit('gate:opened', { id: cand.flag, price: cand.price });
  }

  _prompt(x, y, z, k, cand) {
    const P = this._promptP;
    P.kind = 'hold'; P.x = x; P.y = y; P.z = z;
    P.k = k > 1 ? 1 : (k < 0 ? 0 : k);
    P.label = 'E'; P.rank = cand?.kind === 'gate' ? 3 : 2;
    P.detail = ''; P.subdetail = ''; P.unavailable = false;
    if (cand?.kind === 'gate') {
      const have = this._sys('progress')?.cash() || 0;
      const need = Math.max(0, cand.price - have);
      P.detail = cand.hostile ? 'THE GUARDS ARE HOSTILE' : 'HOLD E · PAY ' + cand.price + ' COINS';
      P.subdetail = cand.hostile ? 'DEFEAT THE GUARDS TO OPEN THE GATE' : 'YOU HAVE ' + have + (need ? ' · NEED ' + need + ' MORE' : ' · PERMANENT ACCESS');
      P.unavailable = need > 0 || cand.hostile;
    }
    this.ctx.bus.emit('prompt', P);
  }

  _gateLamp(p) {
    let target = null, nearest = 42 * 42;
    for (const g of this.gates) {
      const d = (g.x - p.x) ** 2 + (g.z - p.z) ** 2;
      if (d < nearest) { nearest = d; target = g; }
    }
    const lights = this._sys('lights');
    if (!lights) return;
    if (this._lamp && this._lampKey !== target?.key) {
      lights.release(this._lamp); this._lamp = null; this._lampKey = '';
    }
    if (target && !this._lamp) {
      this._lamp = lights.borrow('gate-cashier', target.x, target.y + 2.6, target.z + 0.35, 0xffc382, 6.5, 0);
      if (this._lamp) { this._lamp.decay = 2.0; this._lampKey = target.key; }
    }
  }

  _checkDefeated() {
    const places = this._sys('places'), prog = this._sys('progress');
    if (!places?.gateDefeated || !prog) return;
    for (const g of this.gates) {
      if (this.gateOpen(g.key) || !places.gateDefeated(g.key)) continue;
      prog.flag('gate:' + g.key, 1);
      places.rebuildSite(g.key);
      this.ctx.bus.emit('gate:opened', { id: g.key, price: 0, fought: true });
    }
  }

  /** The test surface. Nothing here allocates on a hot path. */
  state() {
    return {
      bodies: this.bodies.length,
      gates: this.gates.map((g) => ({ key: g.key, price: g.price, open: this.gateOpen(g.key) })),
      holding: this.holdKey,
      holdT: +this.holdT.toFixed(3),
      searched: this._stat.searched,
      paid: this._stat.paid,
      empties: this._stat.refused,
      tolls: this._stat.tolls,
      turnedAway: this._stat.turnedAway,
      reach: SEARCH_R, holdS: SEARCH_HOLD_S,
      gateReach: GATE_R, gateHoldS: GATE_HOLD_S, gatePrice: GATE_PRICE,
    };
  }

  config(patch) {
    void patch; void CFG;
    return null;
  }
}

export default Search;
