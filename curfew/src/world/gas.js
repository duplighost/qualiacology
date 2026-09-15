// CURFEW — GAS. The Eleven rewire.
//
// ALEX: "No inventory limit. One can fills the car to 100%. No partial cans, no meter, no
// tank stat. No prompt at full condition. E · USE GAS at a very visible filler cap. A short
// first-person pour with camera control kept. Cans are visible one-time world pickups.
// Keepers sell unlimited cans at 100 coins."
//
// This system owns all of it. The COUNT is progress's, because it is save state; the world
// cans, the cap targeting, the pour rig and every gas string live here. Before the rewire a
// broken car meant finding a mechanic and paying a bill, which was a trip to a shop. Now it
// means having thought about petrol, which is a thing you do while driving.
//
// WHY THE CAP HAS A RING. Every interactable in this game reads E for itself and the only
// arbitration is prompt rank, so the cap has to beat the door — car.js's _pollEnter returns
// early while `this.targeting` is set. And a cap you can press E at has to LOOK like one:
// car-coachwork.js draws an emissive ring that pulses only while a pour is actually possible.
// Ring off = not interactable = no prompt. That is the whole teaching, with no words in it.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BOSSES } from './boss-catalog.js';

/* ------------------------------------------------------------------ numbers -- */

// Car-local, on the rear quarter behind the wheel arch — where car-coachwork.js actually
// draws the filler door. The old (0.91, 1.24, 1.42) was the beltline, half of it in the
// window aperture, and it targeted a cap that was never merged into the car at all.
const CAP = Object.freeze({ x: 0.91, y: 0.95, z: 1.93 });
const CAP_RANGE = 2.6;          // metres from the cap's world point
const CAP_OUT = 0.45;           // how far off the quarter panel the sight line actually ends
// Loosened 0.60 -> 0.48 with the fuel door: you look at the door, not at the cap. It cannot
// go much wider than this — car.js _pollEnter returns early while targeting is set, so a cap
// that answers from the driver side is a car you cannot get into.
const CAP_DOT = 0.48;           // how squarely you have to be looking at it
const CAN_RANGE = 2.2;
const CAN_DOT = 0.55;
const POUR_S = 2.2;             // how long the rig is up; the gun is hidden for exactly this
const TIP_S = 0.6;              // how long the can takes to go over, and to come back
const TIP_RAD = 70 * Math.PI / 180;
const POUR_LEAVE = 2.0;         // walk this far from the cap and the pour ends early
const KEEPER_CAN_PRICE = 100;   // Alex's number
const CAN_BODY = 0.45;          // how much of its own body the sight ray may end inside

// Scratch for the sight ray. Allocated once: _stepCans runs every step the player is afoot.
const _org = { x: 0, y: 0, z: 0 };
const _ray = { x: 0, y: 0, z: 0 };

/* ------------------------------------------------------------- the can mesh -- */

// A red jerry can: body, spout, bar handle, and an unlit emissive cap so it is findable in a
// dark shed without ever being a light. Built ONCE and shared by every can in the county.
function buildCanGeometry() {
  const parts = [];
  const push = (g, x, y, z, rx = 0) => {
    if (rx) g.rotateX(rx);
    g.translate(x, y, z); parts.push(g);
  };
  push(new THREE.BoxGeometry(0.34, 0.46, 0.17), 0, 0.23, 0);
  push(new THREE.BoxGeometry(0.30, 0.40, 0.185), 0, 0.23, 0);        // the recessed face
  push(new THREE.CylinderGeometry(0.035, 0.035, 0.10, 12), 0.10, 0.49, 0);
  push(new THREE.CylinderGeometry(0.030, 0.030, 0.19, 12), 0.10, 0.56, -0.05, Math.PI / 2.6);
  for (const x of [-0.11, 0, 0.11]) {
    push(new THREE.CylinderGeometry(0.016, 0.016, 0.075, 8), x, 0.49, 0);
  }
  push(new THREE.BoxGeometry(0.30, 0.030, 0.030), 0, 0.525, 0);      // the bar handle
  const g = mergeGeometries(parts.map(p => p.toNonIndexed()), false);
  parts.forEach(p => p.dispose());
  return g;
}

function buildCapGeometry() {
  const g = new THREE.CylinderGeometry(0.036, 0.036, 0.024, 12);
  g.rotateX(Math.PI / 2); g.translate(0.10, 0.49, 0);
  return g;
}

/**
 * THE BAND. Alex, 2026-09-15: "make those canisters for gas really distinct looking so you
 * know you can pick them up."
 *
 * A dark red box in a dark garage is a dark red box. The county's petrol cans now carry a
 * painted cream band right round the waist and a second one up the spout, which is a real
 * thing painted on real fuel cans and reads as one silhouette at twenty metres under a
 * headlamp. It is paint, not light: no emissive, so it never becomes a lamp in a dark shed
 * and never promises a prompt the way the filler ring does.
 */
function buildBandGeometry() {
  const parts = [];
  const push = (g, x, y, z) => { g.translate(x, y, z); parts.push(g); };
  push(new THREE.BoxGeometry(0.352, 0.062, 0.197), 0, 0.255, 0);
  push(new THREE.BoxGeometry(0.046, 0.046, 0.046), 0.10, 0.435, 0);
  const g = mergeGeometries(parts.map(p => p.toNonIndexed()), false);
  parts.forEach(p => p.dispose());
  return g;
}

/* ================================================================== system == */

export class Gas {
  static id = 'gas';

  constructor(ctx) {
    this.ctx = ctx;
    // Every can the county has ever registered: { flag, x, y, z, yaw, mesh }. A taken one
    // keeps its row with mesh null, so nothing ever re-registers it.
    this.cans = [];
    this._seeded = false;
    // The cap. `targeting` is the one field another system reads (car.js _pollEnter).
    this.targeting = false;
    this.capX = 0; this.capY = 0; this.capZ = 0;
    this.reachX = 0; this.reachZ = 0;
    this._useRelease = false;
    // The pour.
    this.pouring = 0;            // seconds left; 0 = not pouring
    this.pourX = 0; this.pourZ = 0;
    this._glugT = 0;
    this._offs = [];
  }

  _sys(id) { return this.ctx.systems.get(id); }

  init() {
    this.group = new THREE.Group();
    this.group.name = 'gas-cans';
    this.ctx.scene.add(this.group);
    this.canGeo = buildCanGeometry();
    this.capGeo = buildCapGeometry();
    this.bandGeo = buildBandGeometry();
    // One material for every can in the county, one for every cap, one for every band. The
    // body was 0x5c1310, which is a dark brick and disappeared into an unlit garage; this is
    // the red a petrol can is actually painted, and still nowhere near glowing.
    this.canMat = new THREE.MeshStandardMaterial({ color: 0xa8281a, roughness: 0.58, metalness: 0.20 });
    this.canMat.name = 'gas-can';
    this.bandMat = new THREE.MeshStandardMaterial({ color: 0xd8cfb4, roughness: 0.80, metalness: 0.05 });
    this.bandMat.name = 'gas-can-band';
    this.capMat = new THREE.MeshStandardMaterial({
      color: 0xb6ab92, emissive: 0xffd9a2, emissiveIntensity: 0.55, roughness: 0.44, metalness: 0.30,
    });
    this.capMat.name = 'gas-can-cap';
    // A can you took is a can that stays taken: the flag is the memory, exactly as a stash's
    // is, and a reload rebuilds the county without it.
    this._offs.push(this.ctx.bus.on('save:loaded', () => { this._seeded = false; this._clear(); }));
  }

  ready() { return !!this.group; }

  /* ----------------------------------------------------------- the world -- */

  _clear() {
    for (const c of this.cans) this._hide(c);
    this.cans.length = 0;
  }

  _hide(c) {
    if (c.mesh) { this.group.remove(c.mesh); c.mesh = null; }
    const col = this._sys('collision');
    if (c.collider !== undefined && col && typeof col.removeChunk === 'function') {
      col.removeChunk('gascan:' + c.flag);
      c.collider = undefined;
    }
  }

  /** Put one can in the world, unless its flag says somebody already took it. */
  _place(flag, x, y, z, yaw) {
    for (let i = 0; i < this.cans.length; i++) if (this.cans[i].flag === flag) return;
    const pr = this._sys('progress');
    const taken = !!pr?.flag(flag);
    const rec = { flag, x, y, z, yaw: yaw || 0, mesh: null, taken };
    this.cans.push(rec);
    if (taken) return;
    const m = new THREE.Mesh(this.canGeo, this.canMat);
    m.position.set(x, y, z); m.rotation.y = rec.yaw;
    m.castShadow = true; m.name = 'gas-can:' + flag;
    m.add(new THREE.Mesh(this.capGeo, this.capMat));
    m.add(new THREE.Mesh(this.bandGeo, this.bandMat));
    this.group.add(m);
    rec.mesh = m;
    const col = this._sys('collision');
    if (col && typeof col.addCollider === 'function') {
      // Solid, not breakable, not standable: something you walk up to, never a step or a target.
      rec.collider = col.addCollider({
        kind: 'obb', x, z, halfX: 0.20, halfZ: 0.14, yaw: rec.yaw,
        y0: y - 0.05, y1: y + 0.60, tag: 'gascan',
      }, 'gascan:' + flag);
    }
  }

  /**
   * THE CANS THAT ARE NOT ON A DESTINATION: four boss approaches and the roadside wrecks.
   *
   * A boss ground is its own frame and has no site table, so those four come straight off the
   * catalogue: one on the county side of the arena at radius + 16 m, which is a thing you find
   * on the way in rather than a thing that starts the encounter. The wrecks are every third
   * one in the minor table — about three in the county, always beside a road, always where a
   * car already died, which is the only joke this system makes.
   */
  _seedWorld() {
    const terrain = this._sys('terrain');
    if (!terrain || typeof terrain.heightAt !== 'function') return;
    this._seeded = true;

    for (const id of ['furnace', 'blacktide', 'antler', 'lantern']) {
      const b = BOSSES.find(x => x.id === id);
      if (!b) continue;
      const len = Math.hypot(b.x, b.z) || 1;
      const ax = b.x - (b.x / len) * (b.radius + 16);
      const az = b.z - (b.z / len) * (b.radius + 16);
      this._place('gas:boss:' + id, ax, terrain.heightAt(ax, az), az, Math.atan2(-b.x, -b.z));
    }

    const places = this._sys('places');
    const minors = places && typeof places.minorList === 'function' ? places.minorList() : null;
    if (!minors) return;
    let n = 0;
    for (const m of minors) {
      if (m.kind !== 'wreck') continue;
      if (n++ % 3) continue;
      const x = m.x + Math.sin(m.yaw + 1.2) * 2.1;
      const z = m.z + Math.cos(m.yaw + 1.2) * 2.1;
      this._place('gas:wreck:' + m.i, x, terrain.heightAt(x, z), z, m.yaw);
    }
  }

  /**
   * The cans authored on a destination. places.js converts each row out of the site's own
   * local frame at dress time, exactly as it does a stash, and hands the world point over
   * here — so a can only exists once you have actually been where it is.
   */
  _seedSites() {
    const places = this._sys('places');
    const list = places && typeof places.gasCans === 'function' ? places.gasCans() : null;
    if (!list || list.length === this._siteCount) return;
    this._siteCount = list.length;
    for (const c of list) this._place(c.flag, c.x, c.y, c.z, c.yaw);
  }

  /* --------------------------------------------------------------- step -- */

  step(dt) {
    if (!this.ctx.playing || this.ctx.paused) { this.targeting = false; return; }
    if (!this._seeded) this._seedWorld();
    this._seedSites();

    const p = this._sys('player');
    if (!this.ctx.input.held('use')) this._useRelease = false;
    const use = this.ctx.input.held('use');

    if (this.pouring > 0) { this._stepPour(dt, p); return; }
    // In the seat, dead, or gone: the cap is nobody's business and its ring goes dark. Without
    // this the ring is left lit from the last frame you were standing beside it and glows at
    // you through the quarter window for the whole drive.
    if (!p || p.dead || this.ctx.shared.inCar) {
      this.targeting = false;
      this._sys('car')?.body?.setFiller?.(false, 0);
      return;
    }

    // The cap first: it outranks the cans, and it outranks the door.
    if (this._stepCap(p, use)) return;
    this._stepCans(p, use);
  }

  /* ------------------------------------------------------------ the cap -- */

  _capPoint(car) {
    const h = car.heading || 0;
    const fwx = -Math.sin(h), fwz = -Math.cos(h);
    const rx = Math.cos(h), rz = -Math.sin(h);
    // Local +z is the REAR of the car (forward is -Z; car.js's moth lens maps local -2.16 to
    // +fw*2.16), so the rear cap is MINUS the forward vector. With a plus, the cap was only
    // targetable at the front quarter while the ring glowed at the back.
    this.capX = car.x + rx * CAP.x - fwx * CAP.z;
    this.capY = car.y + CAP.y;
    this.capZ = car.z + rz * CAP.x - fwz * CAP.z;
    // AND A POINT IN THE AIR BESIDE IT. The cap is ON the car's skin, so a sight line that
    // ends there ends inside the car's own collider and segmentClear always answers false —
    // MEASURED: dist 1.5 m, dot 1.0, clear false, and the cap was never targetable at all.
    // What the test is actually for is a WALL between you and the car, so it aims at open air
    // half a metre out from the quarter panel.
    this.reachX = this.capX + rx * CAP_OUT;
    this.reachZ = this.capZ + rz * CAP_OUT;
  }

  _stepCap(p, use) {
    const car = this._sys('car');
    const pr = this._sys('progress');
    this.targeting = false;
    if (!car || !pr || !Number.isFinite(car.x) || car.mode !== 'idle') {
      car?.body?.setFiller?.(false, 0);
      return false;
    }
    this._capPoint(car);

    const cans = pr.gas();
    const worn = car.wear > 0.005;
    // The ring is the invitation and it is honest: it is lit only when pressing E would
    // actually do something. No can, or a car already at 100%, and the cap is just a cap.
    car.body?.setFiller?.(cans > 0 && worn, this.ctx.time?.t || 0);

    const dx = this.capX - p.pos.x, dz = this.capZ - p.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > CAP_RANGE) return false;
    const cam = this._sys('camera');
    if (!cam) return false;
    const dot = (dx * -Math.sin(cam.yaw) + dz * -Math.cos(cam.yaw)) / (d || 1);
    if (dot < CAP_DOT) return false;
    const col = this._sys('collision');
    if (col && typeof col.segmentClear === 'function'
        && !col.segmentClear(p.pos.x, p.eyeY, p.pos.z, this.reachX, this.capY, this.reachZ)) return false;

    // A FULL CAR SAYS NOTHING. Alex: "no prompt at full condition." Targeting still holds, so
    // one press at the cap can never open the door by accident.
    this.targeting = true;
    if (!worn) return true;

    const pct = Math.max(0, Math.round((1 - car.wear) * 100));
    this.ctx.bus.emit('prompt', {
      kind: 'use', label: 'E', rank: 7, x: this.capX, y: this.capY + 0.10, z: this.capZ, k: 0,
      // ALEX, 2026-09-15: "You don't have to tell the player in the gas prompt on the car that
      // you can buy them." And NO GAS on the car's own filler read as the CAR being empty when
      // it meant the player was carrying nothing — which is the opposite end of the same
      // sentence. The cap says what the cap can do; the tank is the gauge's job.
      detail: cans > 0 ? 'USE GAS' : 'NO CAN',
      subdetail: cans > 0
        ? cans + (cans === 1 ? ' CAN · ' : ' CANS · ') + pct + '% → 100%'
        : pct + '% IN THE TANK',
      unavailable: cans <= 0,
    });
    if (!use || this._useRelease || cans <= 0) return true;
    this._useRelease = true;
    this._pour(car, pr);
    return true;
  }

  /* --------------------------------------------------------------- pour -- */

  /**
   * STATE FIRST, THEN THE SHOW. The can leaves the boot and the car is full on this frame;
   * the rig, the tipping and the glug are two and a bit seconds of decoration over a thing
   * that has already happened. A reload mid-pour keeps the full car, which is the only
   * ordering that can be right.
   */
  _pour(car, pr) {
    if (!pr.takeGas()) return;
    car.refuel();
    this.pouring = POUR_S;
    this.pourX = this.capX; this.pourZ = this.capZ;
    this._glugT = 0;
    this._sys('viewmodel')?.setPourRig?.(true);
    this.ctx.bus.emit('gas:pour', { x: this.capX, y: this.capY, z: this.capZ, cans: pr.gas() });
    this._sys('hud')?.readouts?.receipt?.('GAS USED · CAR 100%', 'repair');
  }

  _stepPour(dt, p) {
    this.targeting = true;                      // still ours: E must not open the door
    this.pouring -= dt;
    // Walking away ends it. The camera and the feet are never taken — Alex asked for the pour
    // to keep camera control, and a rig you can simply walk out of is the honest version.
    if (p && !this.ctx.shared.inCar
        && Math.hypot(p.pos.x - this.pourX, p.pos.z - this.pourZ) > POUR_LEAVE) this.pouring = 0;
    if (p && (p.dead || this.ctx.shared.inCar)) this.pouring = 0;

    const t = POUR_S - Math.max(0, this.pouring);
    // Over in TIP_S, held, then righted over the last TIP_S.
    const k = this.pouring <= 0 ? 0
      : t < TIP_S ? t / TIP_S
        : t > POUR_S - TIP_S ? Math.max(0, (POUR_S - t) / TIP_S) : 1;
    this._sys('viewmodel')?.setPourTip?.(k * TIP_RAD);

    // The glug: two soft ticks a second while it is actually pouring, out of the pooled
    // damage ring at a rate nothing else uses. No new bake.
    if (k > 0.75) {
      this._glugT -= dt;
      if (this._glugT <= 0) {
        this._glugT = 0.42;
        const a = this._sys('audio');
        if (a?.enabled && a.baked && !a.silent && a.has?.('dmg_ring0') && typeof a.spec === 'function') {
          const s = a.spec();
          s.x = this.pourX; s.y = this.capY; s.z = this.pourZ;
          s.gain = 0.16; s.rate = 0.17; s.bus = 'world'; s.send = 0.12;
          s.lpHz = 900; s.priority = 3; s.occl = false;
          a.play('dmg_ring0', s);
        }
      }
    }

    if (this.pouring <= 0) {
      this.pouring = 0;
      this._sys('viewmodel')?.setPourRig?.(false);
      this.ctx.bus.emit('gas:poured', {});
    }
  }

  /* --------------------------------------------------------------- cans -- */

  /**
   * THE CAN USED TO OCCLUDE ITSELF, and so the TAKE prompt had never once appeared.
   *
   * MEASURED 2026-09-15 at the Filling Station's bay rack, from six bearings: segmentClear()
   * false every time. Of course it was — the segment ENDS at (c.x, c.y + 0.3, c.z), which is
   * the middle of the can's own 0.40 x 0.28 x 0.65 m collider, so the line can never be clear.
   * scavenging.js:274 hit this exact bug and wrote a paragraph about it; this file never got
   * the same treatment. Cast at the can and accept if nothing solid stands in front of its own
   * surface, which is the thing the check was ever for: a wall between you and it.
   *
   * The knock-on was worse than a missing prompt. The can is crushable by size, so
   * collision.nearestBreakable() offered it to scavenging's hold-to-open verb instead, and the
   * only prompt a petrol can has ever shown a player is OPEN. 'gascan' is on that file's
   * NO_HOLD_TAG list now; a fuel can is not a box.
   */
  _canVisible(col, p, c) {
    if (!col) return true;
    const dx = c.x - p.pos.x, dy = (c.y + 0.28) - p.eyeY, dz = c.z - p.pos.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    if (typeof col.raycast !== 'function') return true;
    _ray.x = dx / len; _ray.y = dy / len; _ray.z = dz / len;
    _org.x = p.pos.x; _org.y = p.eyeY; _org.z = p.pos.z;
    const hit = col.raycast(_org, _ray, len, col.MASK ? col.MASK.SIGHT : 4);
    return !hit || hit.t >= len - CAN_BODY;
  }

  _stepCans(p, use) {
    const cam = this._sys('camera');
    if (!cam) return;
    const col = this._sys('collision');
    // PICKED BY WHERE YOU ARE LOOKING, not by which is nearer. The bay rack carries two cans
    // 0.70 m apart; by distance the front one answered from every stance a body can stand in
    // and the back one could not be taken at all.
    let best = null, bestDot = CAN_DOT;
    for (let i = 0; i < this.cans.length; i++) {
      const c = this.cans[i];
      if (!c.mesh) continue;
      const dx = c.x - p.pos.x, dz = c.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > CAN_RANGE || Math.abs(c.y - p.pos.y) > 2.2) continue;
      const dot = (dx * -Math.sin(cam.yaw) + dz * -Math.cos(cam.yaw)) / (d || 1);
      if (dot <= bestDot) continue;
      if (!this._canVisible(col, p, c)) continue;
      best = c; bestDot = dot;
    }
    if (!best) return;
    this.ctx.bus.emit('prompt', {
      kind: 'use', label: 'E', rank: 5, x: best.x, y: best.y + 0.55, z: best.z, k: 0,
      detail: 'GAS CAN', subdetail: 'TAKE',
    });
    if (!use || this._useRelease) return;
    this._useRelease = true;
    this._take(best);
  }

  _take(c) {
    const pr = this._sys('progress');
    if (!pr) return;
    pr.flag(c.flag, 1);
    pr.addGas(1);
    c.taken = true;
    this._hide(c);
    this.ctx.bus.emit('pickup', { kind: 'gas', x: c.x, y: c.y, z: c.z });
    this._sys('hud')?.readouts?.receipt?.('GAS CAN · ' + pr.gas() + ' CARRIED', 'pickup');
    // The pooled latch cue the rest of the county already uses for taking a thing.
    this._sys('audio')?.dread?.('door', c.x, c.y + 0.4, c.z, 0.28);
  }

  /* --------------------------------------------------------------- misc -- */

  /** What a keeper charges. One number, read by mechanics.js, so there is only one of it. */
  get canPrice() { return KEEPER_CAN_PRICE; }

  state() {
    let left = 0;
    for (const c of this.cans) if (c.mesh) left++;
    return {
      cans: this.cans.length,
      left,
      carried: this._sys('progress')?.gas?.() ?? 0,
      targeting: this.targeting,
      pouring: this.pouring > 0,
    };
  }

  dispose() {
    for (const off of this._offs) off?.();
    this._offs.length = 0;
    this._clear();
    this.group?.removeFromParent();
    this.canGeo?.dispose(); this.capGeo?.dispose(); this.bandGeo?.dispose();
    this.canMat?.dispose(); this.capMat?.dispose(); this.bandMat?.dispose();
  }
}

export default Gas;
