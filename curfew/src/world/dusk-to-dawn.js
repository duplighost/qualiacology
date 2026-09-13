// dusk-to-dawn — the county's pole lights, and the spine of round 22.
//
// ALEX, 2026-09-10: "Dusk-to-dawn lights. They're literally called that — barn and yard
// lights on photocells that turn on at dark and off at light. They've been on since it
// happened, and they're the one thing the hounds won't cross. They're burning out one at a
// time. That's your spine: money buys bulbs and lanterns from the merchant, and the player
// relights the county pole by pole, building a road home out of light. Depth becomes
// something you *earn by spending*, and you can't punch a bulb into existence."
//
// WHAT THIS IS. A photocell pole every ~150 m along every road in the county, on since the
// night it happened. Each one is a post, a hooded head over the verge, and a bead of light
// under the hood that throws a pool on the road. Every few minutes one of them, somewhere
// you cannot see, flickers for twenty seconds and dies. A dead pole is a dark pole: the
// post is still there, the head is still there, the pool is gone. Hold E under it with a
// bulb in your pocket and it comes back.
//
// WHAT IT DRAWS WITH. Nothing of its own. The county has 94 shader programs and no room
// for a 95th (tests/airlight.mjs pins it), so:
//
//   the posts and heads     places.matBody — the same Lambert every destination is built on
//   the bead and its column places.matGlow.clone() — the additive 'place-glow' material,
//                           so gfx/airlight.js's scan finds every pole on its own and gives
//                           it a halo and a ground pool with no registration here
//   the light itself        ONE borrowed rover at the nearest lit pole, like places.js's
//                           yard lamp. The census is untouched.
//
// A pole is "on" because its bead's VERTEX COLOUR is bright, and off because it is dark
// (airlight.js GLOW_ON_FLOOR / GLOW_ON_FULL). Switching a pole is one write into a colour
// attribute, the same write places.js's claim ripple makes. There is no other switch.
//
// WHAT IT PUBLISHES. ctx.shared.litPoles — one fixed array of {x, z, r, on}, one entry per
// pole, refreshed every step and never reallocated. Lane C's pressure species (the hounds)
// treat a lit pool as a fence: they steer round it and break off a chase at its edge. That
// is the whole meaning of the light, and it is taught by a hound stopping at it.
//
// WHAT IT SAVES. Through progress.flag(): 'd2d:out' (indices of dead poles), 'd2d:relit'
// (indices you brought back), 'd2d:bulbs' (how many you carry) and 'd2d:nextS' (seconds
// LEFT on the burnout clock, a countdown, never a stamp — mechanics.js's round-21 bug was
// a saved stamp ahead of a fresh session's clock, and this must not repeat it).
//
// Pole positions come from the frozen road polylines and ctx.rng.fork('dusk-to-dawn') and
// from nothing else — never the player, never the wall clock — so the index a save carries
// points at the same pole on the next boot.

import * as THREE from 'three';
import { CFG } from '../config.js';
import { clamp01, smoothstep } from '../engine/math.js';
import { kits, glowColumn, PANE_LAMP, GLOW, C as SITE_C } from './sites.js';
import { projectPlaceSurfaceUVs } from './place-surfaces.js';
import { MAJORS, minorSpacingScale } from './placedata.js';
import { DEALER_CAMPS } from './dealer-camps.js';

const D = CFG.duskToDawn || {};
// Every number has a literal fallback so the module runs if the block is ever trimmed.
const SPACING_M = D.spacingM ?? 150;
const SPACING_JITTER_M = D.spacingJitterM ?? 35;
const VERGE_M = D.vergeM ?? 6.3;
const HEAD_Y = D.headY ?? 4.6;
const POOL_R = D.poolR ?? 9.0;
const POOL_GAIN = D.poolGain ?? 3.0;
const KEEPOUT_MAJOR_M = D.keepoutMajorM ?? 30;
const KEEPOUT_MINOR_M = D.keepoutMinorM ?? 30;
const KEEPOUT_CAMP_M = D.keepoutCampM ?? 20;
const MIN_APART_M = D.minApartM ?? 60;
const BOOT_OUT_FRAC = D.bootOutFrac ?? 0.12;
const BURNOUT_EVERY_S = D.burnoutEveryS ?? 200;
const BURNOUT_JITTER_S = D.burnoutJitterS ?? 40;
const BURNOUT_MIN_DIST_M = D.burnoutMinDistM ?? 120;
const FLICKER_S = D.flickerS ?? 20;
const RIPPLE_S = D.rippleS ?? 1.2;
const HOLD_S = D.holdS ?? 1.6;
const REACH_M = D.reachM ?? 2.6;
const ROVER_R = D.roverR ?? 30;
const ROVER_I = D.roverI ?? 6.0;
const ROVER_DECAY = D.roverDecay ?? 0.85;
const MIN_POLES = D.minPoles ?? 40;

/* airlight clusters at most CLUSTER_MAX (28) lamps per glow mesh and silently drops the
 * rest, so the poles are merged in runs of this many. 16 keeps a run well under the cap
 * with room for the bead's two panes and the column to be clustered as ONE lamp. */
const POLES_PER_RUN = 16;
/* A run never leaves its grid cell, so the frustum can drop it. See _build. */
const CELL_M = 400;
/* The head hangs this far out over the verge from the post, toward the road. */
const ARM_M = 0.9;
/* Steepest bank a pole will stand on; the same rule places.js uses for a minor. */
const MAX_SLOPE = 0.45;
/* A flicker rewrites the bead this often. Every step would be a strobe; every fourth is a
 * bad ballast. */
const FLICKER_EVERY = 4;
/* The rover at the nearest lit pole is taken inside ROVER_R and let go beyond this, so a
 * pole at exactly 30 m does not borrow and release every other step. */
const ROVER_DROP_R = ROVER_R * 1.5;
/* The relight flash: the same 14 cd / short ttl places.js uses on a claim, a little softer. */
const RELIGHT_FLASH_I = 12, RELIGHT_FLASH_S = 1.4;
/* How often the countdown is written to the save while nothing else happens, so a reload
 * mid-cycle resumes close to where it was. progress.flag() only marks the blob dirty;
 * the write itself is debounced there. */
const PERSIST_EVERY_S = 15;

const _prompt = { kind: 'hold', label: 'E', rank: 3, x: 0, y: 0, z: 0, k: 0,
  detail: '', subdetail: '', unavailable: false };
const _evt = { i: 0, x: 0, z: 0 };

export class DuskToDawn {
  static id = 'dusk-to-dawn';

  constructor(ctx) {
    this.ctx = ctx;
    this.rng = ctx.rng ? ctx.rng.fork('dusk-to-dawn') : null;
    this.poles = [];
    // THE CONTRACT. One array, its entries fixed objects, refreshed in place every step.
    // Published now so a reader before init gets an empty array rather than undefined.
    this.litPoles = [];
    if (ctx.shared) ctx.shared.litPoles = this.litPoles;
    this.group = null;
    this.runs = [];          // { glow, solid, geo, base } per merged run
    this._built = false;
    this._restored = false;
    this._bulbs = 0;
    this.nextS = this._span();
    this._persistT = PERSIST_EVERY_S;
    this._flickerN = 0;
    this._rover = null; this._roverI = -1;
    this.hold = 0; this._release = false; this._holdI = -1;
    this.nearest = -1;
    this._stepN = 0;
    this._notes = [];
    this.honestNight = false;
    this.photocellSweep = 0;
    this.wardenRegions = Object.create(null);
    if (ctx.bus && ctx.bus.on) {
      // progress inits after us and loads the save then: the pattern places.js:912 uses.
      this._offLoaded = ctx.bus.on('save:loaded', () => { this._restored = false; this._restore(); });
      this._offWarden = ctx.bus.on('enemy:killed', p => this._wardenKilled(p));
      this._offCycle = ctx.bus.on('phase:changed', p => {
        if (p?.phase === 'dusk' && p.prev) {
          this.wardenRegions = Object.create(null);
          this._progress()?.flag('d2d:warden-regions', {});
        }
      });
    }
  }

  _sys(id) { return this.ctx.systems ? this.ctx.systems.get(id) : null; }
  _note(s) { if (this._notes.length < 20) this._notes.push(s); }
  _span() {
    const j = this.rng ? (this.rng.next() * 2 - 1) * BURNOUT_JITTER_S : 0;
    return Math.max(30, BURNOUT_EVERY_S + j);
  }

  /* ----------------------------------------------------------------- init -- */

  async init() {
    this._place();
    this._build();
    this._built = true;
    // A save may already have loaded (a test constructs systems out of order); restore now
    // if progress has data, otherwise the bus or the first step will.
    this._restore();
    this._publish();
  }

  /**
   * Walk every road once and drop a pole every SPACING_M or so of arc length, on the verge,
   * alternating sides. Rejects a spot on a bank, on another road, or inside a major's,
   * minor's or dealer camp's ground. Deterministic: the polylines are frozen and the only
   * randomness is the forked rng, consumed in walk order.
   */
  _place() {
    const roads = this._sys('roads'), terrain = this._sys('terrain'), places = this._sys('places');
    if (!roads || typeof roads.routePolylines !== 'function' || !terrain) {
      this._note('no roads/terrain at init: no poles'); return;
    }
    const lines = roads.routePolylines();
    const minors = places && typeof places.minorList === 'function' ? places.minorList() : [];
    const rng = this.rng;
    const poles = this.poles;
    let side = 1;
    const tooNear = (x, z, list, r, kx, kz) => {
      const r2 = r * r;
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        const dx = o[kx] - x, dz = o[kz] - z;
        if (dx * dx + dz * dz < r2) return true;
      }
      return false;
    };
    for (let li = 0; li < lines.length; li++) {
      const pl = lines[li];
      if (!pl || pl.length < 2) continue;
      // Start part way into the first gap so a pole does not sit on every route's origin.
      let target = SPACING_M * (0.4 + (rng ? rng.next() * 0.4 : 0.2));
      let acc = 0;
      for (let s = 0; s + 1 < pl.length; s++) {
        const a = pl[s], b = pl[s + 1];
        const dx = b.x - a.x, dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        if (len < 1e-3) continue;
        const tx = dx / len, tz = dz / len;
        while (acc + len >= target) {
          const along = target - acc;
          const cx = a.x + tx * along, cz = a.z + tz * along;
          // The next gap, thinned toward the county's edge the way the minors are, so the
          // road home out of light runs the whole network but is sparser out there.
          const jitter = rng ? (rng.next() * 2 - 1) * SPACING_JITTER_M : 0;
          target += SPACING_M * minorSpacingScale(cx, cz) + jitter;
          side = -side;
          // Perpendicular to the segment: (-tz, tx) is the left-hand verge.
          const px = cx - tz * VERGE_M * side, pz = cz + tx * VERGE_M * side;
          if (typeof terrain.slopeAt === 'function' && terrain.slopeAt(px, pz) > MAX_SLOPE) continue;
          // On a junction the verge of one road is the asphalt of another.
          if (typeof roads.roadDistance === 'function' && roads.roadDistance(px, pz) < VERGE_M * 0.85) continue;
          if (tooNear(px, pz, MAJORS, KEEPOUT_MAJOR_M, 'x', 'z')) continue;
          if (tooNear(px, pz, minors, KEEPOUT_MINOR_M, 'x', 'z')) continue;
          if (tooNear(px, pz, DEALER_CAMPS, KEEPOUT_CAMP_M, 'x', 'z')) continue;
          if (tooNear(px, pz, poles, MIN_APART_M, 'x', 'z')) continue;
          const gy = terrain.heightAt(px, pz);
          // The head reaches back over the verge toward the road.
          const ax = tz * side, az = -tx * side;
          poles.push({
            i: poles.length, x: px, z: pz, gy, headY: gy + HEAD_Y,
            hx: px + ax * ARM_M, hz: pz + az * ARM_M, ax, az,
            lit: true, flickerT: 0, rippleT: -1, immune: false,
            run: -1, v0: 0, v1: 0,
          });
        }
        acc += len;
      }
    }
    // The ones that had already died before you arrived: a fixed fraction, chosen by the
    // same rng so it is the same set every boot. A saved relight overrides it.
    if (rng) {
      for (let i = 0; i < poles.length; i++) {
        if (rng.next() < BOOT_OUT_FRAC) poles[i].lit = false;
      }
    }
    for (let i = 0; i < poles.length; i++) {
      const p = poles[i];
      p.bootLit = p.lit;          // what the roll said; the save only records departures from it
      this.litPoles.push({ x: p.hx, z: p.hz, r: POOL_R, on: p.lit });
    }
  }

  /** Posts and heads on places.matBody, beads on a clone of places.matGlow, in runs. */
  _build() {
    const scene = this.ctx.scene, places = this._sys('places'), collision = this._sys('collision');
    if (!scene) { this._note('no ctx.scene'); return; }
    if (!places || !places.matBody || !places.matGlow) { this._note('places materials missing'); return; }
    this.group = new THREE.Group();
    this.group.name = 'dusk-to-dawn';
    scene.add(this.group);
    const poles = this.poles;
    // RUNS ARE GRID CELLS, NOT ROAD ORDER. The first cut merged poles in walk order and a run
    // of sixteen spanned two kilometres of road: every run's bounding sphere held the camera,
    // nothing was ever culled, and the county paid 52 draws for its poles from anywhere in it
    // (measured, tools/round22/check-E.mjs). Sorted into CELL_M cells first, a run is at most a
    // cell wide and the 900 m far plane and the moon's shadow box drop the ones behind you.
    const cellOf = (p) => Math.floor(p.x / CELL_M) * 65536 + Math.floor(p.z / CELL_M);
    const order = poles.map((p) => p.i).sort((a, b) => (cellOf(poles[a]) - cellOf(poles[b])) || (a - b));
    for (let r0 = 0; r0 < order.length;) {
      const cell = cellOf(poles[order[r0]]);
      let r1 = r0;
      while (r1 < order.length && r1 - r0 < POLES_PER_RUN && cellOf(poles[order[r1]]) === cell) r1++;
      const k = kits();
      const ranges = [];
      for (let oi = r0; oi < r1; oi++) {
        const i = order[oi];
        const p = poles[i];
        const yaw = Math.atan2(-p.az, p.ax);
        // The post, thicker at the foot, rusted; the arm out over the verge; the hood.
        k.solid.cyl(0.075, 0.11, HEAD_Y - 0.2, 8, p.x, p.gy + (HEAD_Y - 0.2) * 0.5, p.z, SITE_C.rust);
        k.solid.box(ARM_M + 0.2, 0.07, 0.07, p.x + p.ax * ARM_M * 0.5, p.headY + 0.22, p.z + p.az * ARM_M * 0.5, SITE_C.metal, yaw);
        k.solid.box(0.2, 0.14, 0.2, p.hx, p.headY + 0.26, p.hz, SITE_C.metal);
        k.solid.cone(0.32, 0.22, 10, p.hx, p.headY + 0.12, p.hz, SITE_C.metal);
        // The bead: two crossed vertical panes under the hood, and a short column of glow
        // falling from it. Vertical only — tests/sites.mjs forbids a horizontal glow sheet.
        const p0 = k.glow.parts.length;
        k.glow.pane(0.24, 0.24, p.hx, p.headY - 0.05, p.hz, PANE_LAMP, 0);
        k.glow.pane(0.24, 0.24, p.hx, p.headY - 0.05, p.hz, PANE_LAMP, Math.PI * 0.5);
        glowColumn(k.glow, p.hx, p.headY - 0.55, p.hz, 0.18, 0.55, 0.5);
        ranges.push({ i, p0, p1: k.glow.parts.length });
        if (collision && typeof collision.addCollider === 'function') {
          collision.addCollider({ kind: 'circle', x: p.x, z: p.z, r: 0.16, y0: p.gy - 0.3, y1: p.gy + HEAD_Y + 0.2, tag: 'metal' }, 'dusk-to-dawn');
        }
      }
      // Vertex ranges BEFORE the merge, while the parts still exist: mergeGeometries
      // concatenates attributes in array order (sites.js Kit.build does the same for breaks).
      const offs = new Array(k.glow.parts.length + 1);
      let off = 0;
      for (let j = 0; j < k.glow.parts.length; j++) { offs[j] = off; off += k.glow.parts[j].attributes.position.count; }
      offs[k.glow.parts.length] = off;
      const runIndex = this.runs.length;
      for (const rg of ranges) {
        const p = poles[rg.i];
        p.run = runIndex; p.v0 = offs[rg.p0]; p.v1 = offs[rg.p1];
      }
      const solidGeo = k.solid.build();
      const glowGeo = k.glow.build();
      let solid = null, glow = null;
      if (solidGeo) {
        projectPlaceSurfaceUVs(solidGeo, 3.2);
        solid = new THREE.Mesh(solidGeo, places.matBody);
        solid.name = 'd2d-poles-' + runIndex;
        solid.castShadow = true; solid.receiveShadow = true;
        this.group.add(solid);
      }
      let base = null;
      if (glowGeo) {
        // Material.copy keeps the name, and 'place-glow' is what airlight's scan looks for.
        glow = new THREE.Mesh(glowGeo, places.matGlow.clone());
        glow.material.color.set(GLOW.lamp);
        glow.name = 'd2d-glow-' + runIndex;
        glow.renderOrder = 4;
        // The pool under a 4.6 m head is a faint 8 m disc by airlight's own drop; this is the
        // pool the hounds refuse, so it has to be readable on the road. See airlight _seat1.
        glow.userData.air = { poolR: POOL_R, poolGain: POOL_GAIN };
        base = new Float32Array(glowGeo.attributes.color.array.length);
        base.set(glowGeo.attributes.color.array);
        this.group.add(glow);
      }
      this.runs.push({ solid, glow, geo: glowGeo, base });
      r0 = r1;
    }
    // Apply the boot state to the beads.
    for (let i = 0; i < poles.length; i++) if (!poles[i].lit) this._writePole(i, 0);
  }

  /**
   * THE ONE RUNTIME WRITE. Scale a pole's bead colours by k (0 out, 1 lit, between for a
   * flicker or the relight ripple) from the stored base, and flag the attribute. airlight
   * re-reads the brightest vertex on its next scan (<= 0.45 s) and fades the halo and pool.
   */
  _writePole(i, k) {
    const p = this.poles[i];
    if (!p || p.run < 0) return;
    const run = this.runs[p.run];
    if (!run || !run.geo) return;
    const col = run.geo.attributes.color, arr = col.array, base = run.base;
    for (let v = p.v0 * 3; v < p.v1 * 3; v++) arr[v] = base[v] * k;
    col.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- save -- */

  _progress() {
    const pr = this._sys('progress');
    return pr && typeof pr.flag === 'function' && pr.save && pr.save.data ? pr : null;
  }

  _restore() {
    if (this._restored || !this._built) return;
    const pr = this._progress();
    if (!pr) return;
    this._bulbs = Math.max(0, Number(pr.flag('d2d:bulbs')) || 0);
    const out = pr.flag('d2d:out'), relit = pr.flag('d2d:relit');
    const regions = pr.flag('d2d:warden-regions');
    if (regions && typeof regions === 'object') {
      this.wardenRegions = Object.create(null);
      for (const [key, row] of Object.entries(regions)) if (row && Number.isFinite(row.wait) && Number.isFinite(row.kills))
        this.wardenRegions[key] = { kills: Math.max(0, Math.min(3, row.kills)), wait: Math.max(0, row.wait) };
    }
    const nextS = Number(pr.flag('d2d:nextS'));
    if (Number.isFinite(nextS) && nextS > 0) this.nextS = Math.min(nextS, BURNOUT_EVERY_S + BURNOUT_JITTER_S);
    if (Array.isArray(out)) {
      for (const i of out) { const p = this.poles[i | 0]; if (p && p.lit) { p.lit = false; this._writePole(p.i, 0); } }
    }
    if (Array.isArray(relit)) {
      for (const i of relit) { const p = this.poles[i | 0]; if (!p) continue; p.relit = true; if (!p.lit) { p.lit = true; this._writePole(p.i, 1); } }   // relit stays set, or the next _persistLists() drops a bought light
    }
    this._restored = true;
    this._publish();
  }

  _persistLists() {
    const pr = this._progress();
    if (!pr) return;
    const out = [], relit = [];
    for (let i = 0; i < this.poles.length; i++) {
      const p = this.poles[i];
      // A pole the boot roll left dark is only worth remembering once it has changed.
      if (!p.lit && p.bootLit) out.push(i);
      if (p.lit && p.relit) relit.push(i);
    }
    pr.flag('d2d:out', out);
    pr.flag('d2d:relit', relit);
    pr.flag('d2d:nextS', Math.max(1, Math.round(this.nextS)));
  }

  /* ---------------------------------------------------------------- step -- */

  _publish() {
    const lp = this.litPoles, poles = this.poles;
    for (let i = 0; i < poles.length && i < lp.length; i++) {
      // A flickering pole still counts as lit until the bulb actually dies: the hounds
      // see the light go, not the warning.
      lp[i].on = poles[i].lit && !poles[i].daylightOff;
    }
    if (this.ctx.shared && this.ctx.shared.litPoles !== lp) this.ctx.shared.litPoles = lp;
  }

  step(dt) {
    if (!(dt > 0)) return;
    if (!this._restored) this._restore();
    this._stepN++;
    const playing = !!this.ctx.playing && !this.ctx.paused;
    for (const key in this.wardenRegions) {
      this.wardenRegions[key].wait = Math.max(0, this.wardenRegions[key].wait - dt);
    }

    /* ---- the ones that are dying, and the ones coming back ------------ */
    for (let i = 0; i < this.poles.length; i++) {
      const p = this.poles[i];
      if (p.flickerT > 0) {
        p.flickerT -= dt;
        if (p.flickerT <= 0) {
          p.flickerT = 0; p.lit = false; p.relit = false;
          this._writePole(i, 0);
          _evt.i = i; _evt.x = p.hx; _evt.z = p.hz;
          this.ctx.bus.emit('dusk-to-dawn:out', _evt);
          this._persistLists();
        } else if ((this._stepN + i) % FLICKER_EVERY === 0) {
          // A bad ballast: mostly on, dropping out at random, worse toward the end.
          const r = this.rng ? this.rng.next() : 0.5;
          const late = 1 - clamp01(p.flickerT / FLICKER_S);
          const k = r < 0.18 + 0.5 * late ? 0.12 + 0.2 * r : 0.55 + 0.45 * r;
          p.k = k;
          this._writePole(i, k);
        }
      } else if (p.rippleT >= 0) {
        p.rippleT += dt;
        const k = smoothstep(0, RIPPLE_S, p.rippleT);
        p.k = k;
        this._writePole(i, k);
        if (p.rippleT >= RIPPLE_S) { p.rippleT = -1; p.k = 1; this._writePole(i, 1); }
      }
    }

    /* ---- the clock: one at a time, out of sight ----------------------- */
    if (playing && this.poles.length && !this.honestNight && this.photocellSweep <= 0) {
      this.nextS -= dt;
      if (this.nextS <= 0) {
        this._burnoutPick();
        this.nextS = this._span();
        this._persistLists();
      }
      this._persistT -= dt;
      if (this._persistT <= 0) {
        this._persistT = PERSIST_EVERY_S;
        const pr = this._progress();
        if (pr) {
          pr.flag('d2d:nextS', Math.max(1, Math.round(this.nextS)));
          pr.flag('d2d:warden-regions', JSON.parse(JSON.stringify(this.wardenRegions)));
        }
      }
    }

    this._publish();

    /* ---- the player: the lamp over him and the verb under it ---------- */
    const player = this._sys('player');
    const pos = player && player.pos ? player.pos : null;
    if (!pos) return;
    this._roverStep(pos);
    if (playing) this._verbStep(dt, player, pos);
  }

  /** The nearest pole to a point, and the nearest LIT one. Both -1 when there is none. */
  _nearest(x, z, litOnly) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < this.poles.length; i++) {
      const p = this.poles[i];
      if (litOnly && (!p.lit || p.daylightOff)) continue;
      const dx = p.hx - x, dz = p.hz - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bd) { bd = d2; best = i; }
    }
    return best;
  }

  /**
   * Choose the next pole to die. Lit, not already dying, not one you have relit this cycle,
   * never within BURNOUT_MIN_DIST_M of you and never the nearest lit pole to you: you SEE
   * the county going dark somewhere down the road, not the light you are standing under.
   */
  _burnoutPick() {
    if (this.honestNight || this.photocellSweep > 0) return -1;
    const player = this._sys('player');
    const pos = player && player.pos ? player.pos : null;
    const nearLit = pos ? this._nearest(pos.x, pos.z, true) : -1;
    let n = 0;
    const min2 = BURNOUT_MIN_DIST_M * BURNOUT_MIN_DIST_M;
    for (let i = 0; i < this.poles.length; i++) {
      const p = this.poles[i];
      if (!p.lit || p.flickerT > 0 || p.immune || i === nearLit || this._regionResting(p)) continue;
      if (pos) { const dx = p.hx - pos.x, dz = p.hz - pos.z; if (dx * dx + dz * dz < min2) continue; }
      n++;
    }
    if (!n) {
      // Nothing eligible: the immunities have done their cycle's work; clear them and wait.
      for (let i = 0; i < this.poles.length; i++) this.poles[i].immune = false;
      return -1;
    }
    let pick = this.rng ? Math.floor(this.rng.next() * n) : 0;
    for (let i = 0; i < this.poles.length; i++) {
      const p = this.poles[i];
      if (!p.lit || p.flickerT > 0 || p.immune || i === nearLit || this._regionResting(p)) continue;
      if (pos) { const dx = p.hx - pos.x, dz = p.hz - pos.z; if (dx * dx + dz * dz < min2) continue; }
      if (pick-- === 0) { this._startFlicker(i); return i; }
    }
    return -1;
  }

  _startFlicker(i) {
    const p = this.poles[i];
    if (!p || !p.lit || p.flickerT > 0 || this.honestNight || this.photocellSweep > 0) return false;
    p.flickerT = FLICKER_S;
    p.rippleT = -1;
    this._seatWarden(p);
    // A relit pole's immunity is spent the cycle after it was granted.
    for (let j = 0; j < this.poles.length; j++) if (j !== i) this.poles[j].immune = false;
    _evt.i = i; _evt.x = p.hx; _evt.z = p.hz;
    this.ctx.bus.emit('dusk-to-dawn:flicker', _evt);
    const regional = this.wardenRegions[this._region(p.x, p.z)];
    if (regional) regional.wait = BURNOUT_EVERY_S * (1 + Math.min(3, regional.kills) * .75);
    return true;
  }

  _region(x, z) { return this._sys('terrain')?.regionAt?.(x, z)?.key || 'county'; }
  _regionResting(p) { return (this.wardenRegions[this._region(p.x, p.z)]?.wait || 0) > 0; }

  _seatWarden(pole) {
    const en = this._sys('enemies'), pos = this._sys('player')?.pos;
    if (!en?.spawn || !pos) return null;
    let nearby = null, total = 0, regional = false;
    const key = this._region(pole.x, pole.z);
    en.forEachAlive?.(e => {
      if (e.def?.id !== 'warden') return;
      total++;
      if (this._region(e.pos.x, e.pos.z) === key) regional = true;
      if (Math.hypot(e.pos.x - pole.x, e.pos.z - pole.z) <= 120) nearby = e;
    });
    if (nearby) {
      if (!nearby.aware || nearby.wardenWorkT > 0) { nearby.wardenLamp = pole.i; nearby.wardenWorkT = FLICKER_S; }
      return nearby;
    }
    // The remote county can lose a light without keeping unseen enemies in memory.
    // A visible failure gets one utility man, never a fresh crowd or a body in your pool.
    const dist = Math.hypot(pole.x - pos.x, pole.z - pos.z);
    if (dist > 280 || dist < 32 || total >= 2 || regional) return null;
    const terrain = this._sys('terrain'), col = this._sys('collision');
    const away = Math.atan2(pole.x - pos.x, pole.z - pos.z);
    for (const offset of [0, .65, -.65, 1.2, -1.2]) {
      const a = away + offset, x = pole.x + Math.sin(a) * 14, z = pole.z + Math.cos(a) * 14;
      if (Math.hypot(x - pos.x, z - pos.z) < 40) continue;
      if (terrain?.slopeAt?.(x, z) > .45 || col?.canOccupy && !col.canOccupy(x, z, .68, 2.65)) continue;
      if (this._sys('holdfast-life')?.contains?.(x, z)) continue;
      const zones = [this.ctx.shared?.litPoles, this.ctx.shared?.safeLightZones, this.ctx.shared?.territoryZones, this.ctx.shared?.bossZones];
      if (zones.some(rows => rows?.some(q => q.on && Math.hypot(x-q.x,z-q.z)<q.r+2))) continue;
      const e = en.spawn('warden', x, z, { awake: false, staged: true, yaw: Math.atan2(pole.x-x,pole.z-z) });
      if (e) { e.wardenLamp=pole.i; e.wardenWorkT=FLICKER_S; e.wardenRegion=key; }
      return e || null;
    }
    return null;
  }

  _wardenKilled(event) {
    if ((event?.e?.def?.id || event?.kind || event?.species) !== 'warden') return false;
    const pos = event.e?.pos || event;
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.z)) return false;
    const key = this._region(pos.x, pos.z);
    const row = this.wardenRegions[key] || (this.wardenRegions[key] = { kills: 0, wait: 0 });
    row.kills = Math.min(3, row.kills + 1);
    row.wait = Math.max(row.wait, BURNOUT_EVERY_S * (1 + row.kills * .75));
    // A utility man's death releases the pole already under his hand, too.
    for (const p of this.poles) if (p.flickerT > 0 && this._region(p.x, p.z) === key) {
      p.flickerT = 0; p.k = 1; this._writePole(p.i, 1);
    }
    this._progress()?.flag('d2d:warden-regions', JSON.parse(JSON.stringify(this.wardenRegions)));
    return true;
  }

  /** The Pacer may condemn a visible road light, never the pool protecting the player. */
  warnVisiblePole(visible) {
    if (this.honestNight || this.photocellSweep > 0) return -1;
    const pos = this._sys('player')?.pos;
    if (!pos || typeof visible !== 'function') return -1;
    const near = this._nearest(pos.x, pos.z, true);
    let best = -1, distance = Infinity;
    for (const p of this.poles) {
      const d = Math.hypot(p.hx - pos.x, p.hz - pos.z);
      if (!p.lit || p.immune || p.flickerT > 0 || p.i === near || this._regionResting(p)
        || d < 26 || d > 180 || !visible(p.hx, p.headY, p.hz)) continue;
      if (d < distance) { best = p.i; distance = d; }
    }
    if (best >= 0 && this._startFlicker(best)) return best;
    return -1;
  }

  /** Final honest night preserves every working bulb and cancels the hour's sabotage. */
  setHonestNight(on = true) {
    if (this.honestNight === !!on) return;
    this.honestNight = !!on;
    if (on) for (const p of this.poles) if (p.flickerT > 0) {
      p.flickerT = 0; p.k = 1; this._writePole(p.i, p.daylightOff ? 0 : 1);
    }
  }

  /** Photocells see morning from east to west; this never destroys or consumes a bulb. */
  setPhotocellSweep(k) {
    const next = clamp01(k);
    if (next === this.photocellSweep) return;
    this.photocellSweep = next;
    let east = -Infinity, west = Infinity;
    for (const p of this.poles) { east = Math.max(east, p.hx); west = Math.min(west, p.hx); }
    const edge = east - (east - west) * next;
    const pos = this._sys('player')?.pos;
    for (const p of this.poles) {
      const off = next > 0 && (next >= 1 || p.hx >= edge);
      if (!!p.daylightOff === off) continue;
      p.daylightOff = off;
      this._writePole(p.i, p.lit && !off ? 1 : 0);
      if (off && p.lit) {
        if (pos && Math.hypot(pos.x - p.hx, pos.z - p.hz) < 65) this._sys('audio')?.dread?.('door', p.hx, p.headY, p.hz, .18);
        this.ctx.bus?.emit('dusk-to-dawn:photocell', { i: p.i, x: p.hx, z: p.hz });
      }
    }
    this._publish();
  }

  /**
   * THE YARD LAMP, the same shape as places.js _lampStep: one rover, at the nearest lit pole
   * inside ROVER_R, let go when a different pole is nearest or none is inside ROVER_DROP_R.
   * The bead's own colour carries the far read; the rover is what puts light on YOU.
   */
  _roverStep(pos) {
    const lights = this._sys('lights');
    if (!lights || typeof lights.borrow !== 'function') return;
    const i = this._nearest(pos.x, pos.z, true);
    let want = -1;
    if (i >= 0) {
      const p = this.poles[i];
      const d = Math.hypot(p.hx - pos.x, p.hz - pos.z);
      if (d <= ROVER_R || (i === this._roverI && d <= ROVER_DROP_R)) want = i;
    }
    if (this._rover && (this._roverI !== want || this._rover.dead)) {
      lights.release(this._rover);
      this._rover = null; this._roverI = -1;
    }
    if (want >= 0 && !this._rover) {
      const p = this.poles[want];
      const h = lights.borrow('pole-lamp', p.hx, p.headY - 0.2, p.hz, GLOW.lamp, ROVER_I, 0);
      if (h) { h.decay = ROVER_DECAY; this._rover = h; this._roverI = want; }
    }
    // A dying pole's rover flickers with its bead; a relit one comes up with the ripple.
    if (this._rover) {
      const p = this.poles[this._roverI];
      const k = p.flickerT > 0 || p.rippleT >= 0 ? (p.k === undefined ? 1 : p.k) : 1;
      this._rover.peak = ROVER_I * k;
    }
  }

  /**
   * THE VERB. Stand under a dark pole, look at it, hold E with a bulb. The grammar is
   * mechanics.js's: the prompt every step there is a target, a release latch so a held key
   * fires once, the hold accumulating only while held and in reach. A lit pole shows no
   * prompt at all — there is nothing to do to it and a dead prompt would say otherwise.
   */
  _verbStep(dt, player, pos) {
    const inp = this.ctx.input;
    const use = !!(inp && typeof inp.held === 'function' && inp.held('use'));
    if (!use) this._release = false;
    const cam = this._sys('camera');
    let target = -1;
    if (!(this.ctx.shared && this.ctx.shared.inCar) && !(player.dead)) {
      const i = this._nearest(pos.x, pos.z, false);
      if (i >= 0) {
        const p = this.poles[i];
        const dx = p.x - pos.x, dz = p.z - pos.z, d = Math.hypot(dx, dz);
        if (d < REACH_M && Math.abs(pos.y - p.gy) < 2.0) {
          const yaw = cam && typeof cam.yaw === 'number' ? cam.yaw : 0;
          const dot = (dx * -Math.sin(yaw) + dz * -Math.cos(yaw)) / (d || 1);
          if (dot > 0.6 || d < 0.9) target = i;
        }
      }
    }
    this.nearest = target;
    if (target < 0) { this.hold = 0; this._holdI = -1; return; }
    const p = this.poles[target];
    if (p.lit || p.daylightOff) { this.hold = 0; this._holdI = -1; return; }
    if (this._holdI !== target) { this.hold = 0; this._holdI = target; }
    const bulbs = this._bulbs;
    _prompt.x = p.x; _prompt.y = p.gy + 1.5; _prompt.z = p.z;
    _prompt.k = this.hold / HOLD_S;
    _prompt.detail = bulbs > 0 ? 'REPLACE BULB' : 'NO BULB';
    _prompt.subdetail = bulbs > 0 ? (bulbs + (bulbs === 1 ? ' BULB' : ' BULBS')) : 'THE DEALER SELLS THEM';
    _prompt.unavailable = bulbs === 0;
    this.ctx.bus.emit('prompt', _prompt);
    if (!use || this._release || bulbs === 0) { this.hold = 0; return; }
    this.hold += dt;
    if (this.hold < HOLD_S) return;
    this.hold = 0; this._release = true;
    this.relight(target);
  }

  /* ----------------------------------------------------------------- api -- */

  /** Bring a dark pole back: the bulb is taken, the bead ripples up, a flash, the latch. */
  relight(i) {
    const p = this.poles[i];
    if (!p || p.lit) return false;
    if (!this.takeBulb()) return false;
    p.lit = true; p.relit = true; p.flickerT = 0; p.rippleT = 0; p.k = 0;
    // Bought light is not taken back within minutes: immune until the next burnout has
    // chosen someone else.
    p.immune = true;
    this._writePole(i, 0);
    const lights = this._sys('lights');
    if (lights && typeof lights.borrow === 'function') {
      lights.borrow('relight', p.hx, p.headY, p.hz, GLOW.lamp, RELIGHT_FLASH_I, RELIGHT_FLASH_S);
    }
    const audio = this._sys('audio');
    if (audio && typeof audio.dread === 'function') audio.dread('door', p.x, p.gy + 1.2, p.z, 0.7);
    this._persistLists();
    this._publish();
    _evt.i = i; _evt.x = p.hx; _evt.z = p.hz;
    this.ctx.bus.emit('dusk-to-dawn:relit', _evt);
    this.ctx.bus.emit('lamp:replaced', { i, x: p.hx, z: p.hz });
    return true;
  }

  /** Kill a pole now (tools and tests): the same path a natural burnout takes, minus the wait. */
  burnOut(i, instant) {
    const p = this.poles[i];
    if (!p || !p.lit) return false;
    if (instant) {
      p.flickerT = 0; p.lit = false; p.relit = false; p.rippleT = -1;
      this._writePole(i, 0);
      _evt.i = i; _evt.x = p.hx; _evt.z = p.hz;
      this.ctx.bus.emit('dusk-to-dawn:out', _evt);
      this._persistLists();
      this._publish();
      return true;
    }
    this._startFlicker(i);
    return true;
  }

  /** Force the picker, for a tool: returns the index chosen or -1. */
  pickBurnout() { return this._burnoutPick(); }

  bulbs() { return this._bulbs; }
  addBulb(n = 1) {
    this._bulbs = Math.max(0, this._bulbs + (n | 0));
    const pr = this._progress();
    if (pr) pr.flag('d2d:bulbs', this._bulbs);
    return this._bulbs;
  }
  takeBulb() {
    if (this._bulbs <= 0) return false;
    this._bulbs--;
    const pr = this._progress();
    if (pr) pr.flag('d2d:bulbs', this._bulbs);
    return true;
  }

  /** Copies, for tools, tests and a map: [{i, x, z, gy, lit, flicker, r}]. Off the hot path. */
  list() {
    return this.poles.map(p => ({ i: p.i, x: p.hx, z: p.hz, postX: p.x, postZ: p.z, gy: p.gy,
      lit: p.lit && !p.daylightOff, bulbWorking: p.lit, daylightOff: !!p.daylightOff, flicker: p.flickerT > 0, r: POOL_R }));
  }

  state() {
    let lit = 0, out = 0, flicker = 0;
    for (const p of this.poles) { if (p.lit) lit++; else out++; if (p.flickerT > 0) flicker++; }
    return { poles: this.poles.length, lit, out, flicker, bulbs: this._bulbs, nextS: this.nextS,
      nearest: this.nearest, hold: this.hold, rover: this._roverI, restored: this._restored,
      honestNight: this.honestNight, photocellSweep: this.photocellSweep,
      wardenRegions: JSON.parse(JSON.stringify(this.wardenRegions)), notes: this._notes.slice() };
  }

  ready() {
    // Built and in the scene. The pole COUNT is a design number, not a wiring fact: a county
    // whose roads yield fewer than MIN_POLES is measured by tools/round22/check-E.mjs, not
    // refused at boot, because a boot that refuses is a blank page (main.js's ready sweep).
    return this._built && !!(this.group && this.group.parent);
  }

  minPoles() { return MIN_POLES; }

  dispose() {
    if (this._offLoaded) this._offLoaded();
    this._offWarden?.(); this._offCycle?.();
    const lights = this._sys('lights');
    if (this._rover && lights && typeof lights.release === 'function') lights.release(this._rover);
    this._rover = null; this._roverI = -1;
    const col = this._sys('collision');
    if (col && typeof col.removeChunk === 'function') col.removeChunk('dusk-to-dawn');
    for (const r of this.runs) {
      if (r.solid) r.solid.geometry.dispose();
      if (r.glow) { r.glow.geometry.dispose(); r.glow.material.dispose(); }
    }
    this.runs.length = 0;
    if (this.group && this.group.parent) this.group.parent.remove(this.group);
    this.group = null;
    this.poles.length = 0;
    this.litPoles.length = 0;
  }
}

export default DuskToDawn;
