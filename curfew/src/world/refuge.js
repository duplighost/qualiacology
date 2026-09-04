// CURFEW — the refuge: the breaker you throw, the door you shut, the place you rest.
// ROUND 7, lane A. Manifest id `refuge`, constructed after `places`.
//
// Alex, 2026-09-03, the thing he most wants the county to have:
//
//   "It has to be clear when you've finished a safe place like the first one. maybe a
//    circuit board has a big thing that must be flipped on and you can rest in areas — the
//    first area near the spawn looks like it could serve as an example for this by having
//    you do that, and then it allows you to get inside and close the door and be safe where
//    there is a little sleeping bag and it looks kind of cozy"
//
// And from his fifth playtest, already half built and never finished: the skill node
// `quiet_3` "Shut the Door" installs a hook `onDoorShut` that NOTHING EVER FIRES from a real
// door. The primitive it calls, `enemies.loseTrail()`, already works.
//
// This system owns the STATE that geometry cannot hold: whether the breaker has been
// thrown, whether the door is open, how far it has swung, and whether you are resting. It
// must survive the station's chunk streaming out and back in, so nothing here may live on a
// mesh that places.js disposes. The station's static dress is dress-station.js, and this
// file imports its ANCHORS so the leaf and the frame cannot be built against two numbers.
//
// Nothing on screen says any of this in words (AGENTS.md rule 4). The breaker is a thing
// with a handle; the door is a door; the light coming on is the message.
//
// ============================================================================
// WHY THE BREAKER READS, AND WHY IT IS NOT BRIGHTER
// ============================================================================
// NEXT.md B2: the county's claim lever "washes out to white inside your own torch hotspot at
// exactly the range you stand to use it", and round 6 proved that fight cannot be won on
// albedo — at 560 cd at arm's length the bloom of whatever is BEHIND the fixture paints a
// wash over the middle of the frame and the grade's shoulder flattens everything to one
// plate. So this board does not try:
//
//   1. THE HOUSING IS THE DARKEST THING ON THE WALL. Plaster is 0.265 linear; this board is
//      0.010. A near-black rectangle on a pale wall is a silhouette, and a silhouette is the
//      one read a torch cannot destroy — the brighter the torch, the harder the edge.
//   2. THE HANDLE IS THE ONLY LONG DIAGONAL IN THE FRAME. Everything else at the Filling
//      Station is an axis-aligned box. A 0.62 m brass bar at 54 degrees off vertical, with a
//      horizontal stop above it and another below it, is a shape with no competitor.
//   3. THE PILOT IS DEAD BEFORE AND BURNS AFTER. Not dimmer — dead. The change of state is
//      carried by a pixel that was not there at all.
//   4. THE THROW IS 0.4 s OF MOVEMENT WITH A HEAVY SOUND AT THE END. Motion is the cheapest
//      legibility in the game (ART 4.2) and it is the only one that also feels like anything.
//
// It is bolted to the shop's east end wall, which is the wall you look straight at from the
// spawn (tests/shots/station-b1.png is 40% that one blank plane) — so the thing you cannot
// tell how to do is now the biggest dark shape in the first frame you ever see.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, clamp01 } from '../engine/math.js';
import { GLOW } from './sites.js';
import { ANCHORS } from './dress-station.js';

const SITE_ID = 'filling-station';

/* ------------------------------------------------------------------ refuge sites --
 * The Filling Station remains the authored first lesson. Round 9 gives that same physical
 * loop to two BUILDINGS THAT ALREADY EXIST INSIDE REAL MAJORS: the Drowned Light keeper's
 * cottage and the Relay equipment hut. These are not new destinations and they are not
 * decorative sheds promoted into fake majors. The transforms below are the exact shell
 * transforms in sites.js / dress-interiors.js.
 */
function compactAnchors(room, doorWidth, bagLocal) {
  const cy = Math.cos(room.yaw), sy = Math.sin(room.yaw);
  const at = (x, z) => ({ x: room.x + x * cy + z * sy, z: room.z - x * sy + z * cy });
  const front = -room.d * 0.5;
  const hinge = at(-doorWidth * 0.5, front);
  const mid = at(0, front);
  const board = at(doorWidth * 0.5 + 0.72, front - 0.03);
  const bag = at(bagLocal.x, bagLocal.z);
  const bulb = at(bagLocal.x, bagLocal.z + 0.12);
  const doorLamp = at(0, front - 0.18);
  return Object.freeze({
    breaker: Object.freeze({ x: board.x, z: board.z, footY: 0.78, faceYaw: room.yaw + Math.PI }),
    door: Object.freeze({
      hingeX: hinge.x, hingeZ: hinge.z, width: doorWidth, height: 2.42,
      yaw: room.yaw, open: -1.52, midX: mid.x, midZ: mid.z,
    }),
    bag: Object.freeze({ x: bag.x, z: bag.z, yaw: room.yaw + (bagLocal.yaw || 0) }),
    lamps: Object.freeze({
      bulb: Object.freeze({ x: bulb.x, y: 2.34, z: bulb.z }),
      door: Object.freeze({ x: doorLamp.x, y: 2.62, z: doorLamp.z }),
    }),
  });
}

const PRIMARY_SPEC = Object.freeze({
  id: SITE_ID, anchors: ANCHORS, buildBreaker: true, buildBag: false, xpPower: 90,
  lampIn: 18, lampOut: 10, lampDecay: 1.05,
  room: Object.freeze({ x: -10.5, z: 0.5, yaw: 0, w: 10, d: 7 }),
});
const EXTRA_SPECS = Object.freeze([
  Object.freeze({
    id: 'drowned-light', claimPowered: true, buildBreaker: false, buildBag: false,
    // Bright enough to be the safe island, low enough to leave wall texture and furniture
    // visible. The first cut at 22/13 flattened the cottage into a featureless white box.
    xpPower: 0, lampIn: 8.5, lampOut: 5.5,
    lampDecay: 1.28,
    room: Object.freeze({ x: 9, z: 3, yaw: 0.3, w: 9, d: 6.5 }),
    anchors: compactAnchors({ x: 9, z: 3, yaw: 0.3, w: 9, d: 6.5 }, 2.2,
      { x: -2.6, z: 0.9, yaw: 0 }),
  }),
  Object.freeze({
    id: 'relay', claimPowered: true, buildBreaker: false, buildBag: true,
    xpPower: 0, lampIn: 7.5, lampOut: 5.0,
    lampDecay: 1.32,
    room: Object.freeze({ x: -7.5, z: 6.5, yaw: 0, w: 6, d: 5 }),
    anchors: compactAnchors({ x: -7.5, z: 6.5, yaw: 0, w: 6, d: 5 }, 2.0,
      { x: -1.75, z: -0.25, yaw: 0 }),
  }),
]);

/* ------------------------------------------------------------------ the verbs -- */
const REACH_BREAKER = 2.30;      // m, ground distance to the handle
const REACH_DOOR = 2.40;         // m, to the middle of the doorway, from EITHER side
const REACH_BED = 1.90;          // m, to the middle of the bag. You stand BESIDE a bed to get
                                 // into it: at 1.25 the bag's own 1.06 m half-width put the
                                 // usable ring inside the mattress and it could not be reached
                                 // on foot at all (measured, tests/refuge.mjs walk section).
const FACE_MIN = 0.35;           // look-direction dot; a shallower cone than the claim's,
                                 // because you are inside a room and cannot back off
const HOLD_BREAKER = 0.50;       // s of hold before the handle goes over centre
const THROW_S = 0.40;            // s of swing after it does. Alex: nothing floaty.
const HOLD_REST = 0.45;          // s of hold on the bag before the screen starts to go

/* ------------------------------------------------------------------ the handle -- */
const LEVER_UP = 0.95;           // rad from vertical, at rest: up and to the left
const LEVER_DOWN = 2.35;         // thrown: down and to the left
const LEVER_CREEP = 0.34;        // how far of the arc the HOLD moves it before it goes over
const LEVER_SNAP = 3.2;          // rad/s the handle falls back when you let go early
// The hinge, in the BOARD's own frame, and the bar's length. Sized so that BOTH ends of the
// swing land inside the 0.86 x 1.06 housing: at LEVER_UP the tip is at (-0.29, 0.90) and at
// LEVER_DOWN it is at (-0.24, 0.19), against a half-width of 0.43 and a top at 1.06. The
// first cut had a 0.62 m bar on a hinge at x 0 and the knob hung off the left cheek.
const LEVER_HX = 0.16;
const LEVER_HY = 0.58;
const LEVER_LEN = 0.56;

/* ------------------------------------------------------------------ the door -- */
const DOOR_SWING_S = 0.55;       // s from shut to fully open and back
const DOOR_SHUT_AT = 0.80;       // the collider exists at or above this k (0 open .. 1 shut)
const DOOR_LOSE_R = 0.0;         // metres inside which a body keeps you anyway. Zero: the
                                 // whole point is that the door is what ends the argument.

/* ------------------------------------------------------------------ resting -- */
const REST_FADE_IN = 0.95;       // s to black
const REST_BLACK = 0.55;         // s of nothing
const REST_FADE_OUT = 0.22;      // s back. "Getting up must be instant and clean."
const REST_CLOCK_S = 120;        // s of the county's 840 s cycle that pass while you sleep
const REST_XP = 0;               // resting pays no XP: it is not an achievement, it is a bed

/* ------------------------------------------------------------------ the light -- */
// One rover from lights.borrow(), walked from the bulb to the bulkhead when you step out of
// the room. NEVER a new light: the census is pinned at 13 (AGENTS.md).
const LAMP_IN_I = 18.0;          // a powered refuge is a warm island against the dark county
const LAMP_OUT_I = 10.0;         // the bulkhead makes the safe doorway legible from its yard
const LAMP_RANGE = 26.0;         // m from the shop centre; beyond it the rover goes back
const POWER_RAMP_S = 1.15;       // s for the lamps to come up after the throw

const DRAW_R = 320;              // m; beyond this the refuge's four meshes are not drawn

/* ------------------------------------------------------------------ palette -- */
// Linear albedos. FX_BOARD/FX_BRASS are places.js's own fixture numbers, deliberately reused:
// he learns one shape and one contrast for "the thing you throw", wherever he finds it.
const P_BOARD = [0.010, 0.010, 0.012];   // the housing: matte, nearly black
const P_PLATE = [0.024, 0.025, 0.028];
const P_IRON = [0.030, 0.032, 0.036];
const P_RUST = [0.176, 0.098, 0.062];
const P_BRASS = [0.40, 0.29, 0.11];      // the handle, and the door's
const P_DOOR = [0.118, 0.090, 0.066];    // the leaf: dark timber
const P_DOORBAR = [0.048, 0.048, 0.052]; // its ledges and braces

/* ------------------------------------------------------------ module scratch -- */
// The hot path allocates nothing.
const _v = new THREE.Vector3();
const _restPayload = { id: SITE_ID, x: 0, z: 0, seconds: 0 };
const _doorPayload = { id: SITE_ID, shut: true, x: 0, z: 0 };
const _powerPayload = { id: SITE_ID, on: true };
const _xpPayload = { amount: 0, x: 0, y: 0, z: 0, reason: 'refuge' };

/* ==========================================================================
   Geometry helpers. Every geometry carries a `color` attribute, because a
   geometry without one renders BLACK under vertexColors: true.
   ========================================================================== */
function tint(geo, col) {
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = col[0]; c[i * 3 + 1] = col[1]; c[i * 3 + 2] = col[2]; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
function merge(parts) {
  if (!parts.length) return null;
  const out = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (parts.length > 1) for (const g of parts) g.dispose();
  if (out) out.computeBoundingSphere();
  return out;
}
/** A soft halo column, sites.js glowColumn at prop scale, on the glow kit. */
function halo(parts, x, y, z, r, h, gain) {
  const g = new THREE.CylinderGeometry(r * 0.35, r, h, 8, 1, true);
  g.translate(0, h * 0.5, 0);
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  const py = g.attributes.position.array;
  for (let i = 0; i < n; i++) {
    const t = clamp(1 - py[i * 3 + 1] / h, 0, 1);
    const v = gain * t * t;
    c[i * 3] = v; c[i * 3 + 1] = v; c[i * 3 + 2] = v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.translate(x, y - h * 0.38, z);
  parts.push(g);
}
/** A bead: the hot core of a lamp, full white in the vertex colour. */
function bead(parts, x, y, z, r) {
  const g = new THREE.SphereGeometry(r, 10, 7);
  g.translate(x, y, z);
  parts.push(tint(g, [1, 1, 1]));
}

export class Refuge {
  static id = 'refuge';

  constructor(ctx, spec = PRIMARY_SPEC, owner = null) {
    this.ctx = ctx;
    this.spec = spec || PRIMARY_SPEC;
    this.siteId = this.spec.id;
    this.anchors = this.spec.anchors;
    this._owner = owner;
    // The manifest constructs one system. That root owns two additional, independently
    // persistent refuge units and presents them through the same public/test surface.
    this._units = owner ? null : [this];

    // --- state, all of it. None of this lives on a streamed mesh. -----------
    this.power = false;          // the breaker has been thrown
    this.powerK = 0;             // 0..1, the lamps coming up
    this.doorK = 1;              // 1 shut, 0 open. You wake with the door shut? No — see
                                 // init(): it starts OPEN, because a shut door you did not
                                 // shut teaches nothing.
    this.doorTarget = 0;
    this.doorColliderOn = '';        // '' | 'shut' | 'open' — where the leaf's collider is
    this.leverK = 0;             // 0 up .. 1 thrown
    this.throwT = -1;            // >= 0 while the 0.4 s swing runs

    this.holdKind = '';          // '' | 'breaker' | 'door' | 'bed'
    this.holdT = 0;
    this._usePrev = false;

    this.resting = false;
    this.restT = 0;
    this.restPhase = '';         // 'in' | 'black' | 'out'
    this.fade = 0;               // 0..1, what the overlay is showing
    this.restAnchorX = 0; this.restAnchorZ = 0; this.restAnchorY = 0;

    // counters a test can read without a screenshot
    this.stats = {
      throws: 0, doorShuts: 0, doorOpens: 0, rests: 0, refusals: 0,
      trailsLost: 0, hookRuns: 0, healed: 0,
    };

    // --- the scene side ----------------------------------------------------
    this.group = null;
    this.matBody = null; this.matGlow = null;
    this.solid = null;           // the breaker housing
    this.lever = null;           // its handle, pivoted
    this.leaf = null;            // the door leaf, pivoted
    this.glow = null;            // every lamp the breaker turns on, one mesh
    this._built = false;

    this.ox = 0; this.oz = 0; this.yaw = 0; this.padY = 0;
    this._cy = 1; this._sy = 0;
    this._ready = false;
    this._notes = [];

    this._lamp = null; this._lampWhere = '';
    this._overlay = null;

    // interpolation: simulation writes prev/curr, present() writes the transform
    this._leverPrev = 0; this._leverCurr = 0;
    this._doorPrev = 0; this._doorCurr = 0;
    this._fadePrev = 0; this._fadeCurr = 0;
  }

  _note(msg) { if (this._notes.length < 24) this._notes.push(msg); }
  _sys(id) { return this.ctx && this.ctx.systems ? this.ctx.systems.get(id) : null; }

  /* ------------------------------------------------------------------ frame -- */
  /** local -> world. The site group carries the same rotation, so this matches it. */
  _wx(lx, lz) { return this.ox + lx * this._cy + lz * this._sy; }
  _wz(lx, lz) { return this.oz - lx * this._sy + lz * this._cy; }
  /** world -> local, the exact inverse. */
  _lx(wx, wz) { return (wx - this.ox) * this._cy - (wz - this.oz) * this._sy; }
  _lz(wx, wz) { return (wx - this.ox) * this._sy + (wz - this.oz) * this._cy; }

  async init() {
    const places = this._sys('places');
    const rec = places && places.nodes ? places.nodes.get(this.siteId) : null;
    if (!rec) { this._note('places has no node for ' + this.siteId + ': the refuge cannot stand anywhere'); return; }
    this.ox = rec.def.x; this.oz = rec.def.z;
    this.yaw = rec.yaw || 0;
    this.padY = rec.padY || 0;
    this._cy = Math.cos(this.yaw); this._sy = Math.sin(this.yaw);

    this._build();
    this._restore();
    this._ready = true;
    if (!this._owner) {
      this._overlayInit();
      for (let i = 0; i < EXTRA_SPECS.length; i++) {
        const unit = new Refuge(this.ctx, EXTRA_SPECS[i], this);
        await unit.init();
        this._units.push(unit);
      }
    }
  }

  /* ==========================================================================
     BUILD. Two unmapped Lambert-vertexColor meshes and two additive ones.
     Round 9's place-body now owns mapped/bumped destination variants, so material
     names are not a program-identity claim; the measured boot/runtime census is.
     ========================================================================== */
  _build() {
    if (this._built) return;
    this._built = true;
    const scene = this.ctx && this.ctx.scene;

    this.matBody = new THREE.MeshLambertMaterial({
      vertexColors: true, dithering: true,
      side: THREE.DoubleSide, shadowSide: THREE.FrontSide,
    });
    this.matBody.name = 'refuge-body';
    this.matGlow = new THREE.MeshBasicMaterial({
      vertexColors: true, fog: false, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.matGlow.name = 'refuge-glow';

    this.group = new THREE.Group();
    this.group.name = 'refuge-' + this.siteId;
    this.group.position.set(this.ox, 0, this.oz);
    this.group.rotation.y = this.yaw;
    if (scene) scene.add(this.group);
    else this._note('ctx.scene missing at refuge init: nothing will be visible');

    if (this.spec.buildBreaker !== false) this._buildBreaker();
    this._buildDoor();
    if (this.spec.buildBag) this._buildBag();
    this._buildLamps();
  }

  /**
   * THE BOARD. Authored in its OWN frame — +Z out of the wall, +X right, +Y up — then turned
   * to face the forecourt and dropped on the wall, so every number below reads as a
   * measurement off a photograph of a real board rather than as world coordinates.
   */
  _buildBreaker() {
    const b = this.anchors.breaker;
    const y0 = this.padY + (Number.isFinite(b.footY) ? b.footY : 0.95);
    const parts = [];
    const put = (geo, col, x, y, z, rz) => {
      if (rz) geo.rotateZ(rz);
      geo.translate(x, y, z);
      parts.push(tint(geo, col));
    };
    // THE HOUSING IS A RECESS, not a plate. Four returns 0.34 m deep stand at ninety degrees
    // to the torch, so they take almost no N.L however hot the beam is: under a torch that
    // washes a plaster wall to 255 they are still the darkest pixels in the cone, and the
    // plate sits inside a hard black frame. This is the one read an exposure cannot take
    // away, and it is why the board is a box rather than a sign.
    const DEEP = 0.34;
    put(new THREE.BoxGeometry(0.86, 1.06, 0.07), P_BOARD, 0, 0.53, 0.035);        // the back
    put(new THREE.BoxGeometry(0.07, 1.06, DEEP), P_BOARD, -0.42, 0.53, DEEP * 0.5);
    put(new THREE.BoxGeometry(0.07, 1.06, DEEP), P_BOARD, 0.42, 0.53, DEEP * 0.5);
    put(new THREE.BoxGeometry(0.86, 0.07, DEEP), P_BOARD, 0, 1.06, DEEP * 0.5);   // top return
    put(new THREE.BoxGeometry(0.86, 0.07, DEEP), P_BOARD, 0, 0.00, DEEP * 0.5);   // bottom
    put(new THREE.BoxGeometry(1.02, 0.08, 0.42), P_RUST, 0, 1.14, 0.16);          // the hood
    put(new THREE.BoxGeometry(1.02, 0.07, 0.30), P_BOARD, 0, -0.05, 0.12);        // the sill
    // the face plate, and the fuse carriers on it: internal structure, so 0.9 m of black
    // reads as a made thing. Small, dark, in two rows, one of them missing.
    put(new THREE.BoxGeometry(0.70, 0.86, 0.02), P_PLATE, 0, 0.53, 0.085);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 1 && c === 3) continue;                      // the one that was pulled
        put(new THREE.BoxGeometry(0.085, 0.13, 0.045), r ? P_IRON : P_RUST,
          -0.26 + c * 0.13, 0.20 + r * 0.20, 0.105);
      }
    }
    // THE TWO STOPS. The only horizontals on the plate, above and below the swing, so the
    // handle's diagonal is unmistakable at a glance and its state is readable at 20 m.
    put(new THREE.BoxGeometry(0.22, 0.035, 0.07), P_IRON, -0.28, 0.95, 0.10);
    put(new THREE.BoxGeometry(0.22, 0.035, 0.07), P_IRON, -0.24, 0.13, 0.10);
    // the hinge boss the handle turns on
    put(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 10), P_IRON, LEVER_HX, LEVER_HY, 0.12, Math.PI * 0.5);
    // the pilot's bezel: a dark ring for the bead to be read against, torch or no torch
    put(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12, 1, true), P_BOARD, 0.32, 0.94, 0.11, Math.PI * 0.5);
    // two conduit glands out of the bottom
    for (const gx of [-0.22, 0.22]) put(new THREE.CylinderGeometry(0.035, 0.035, 0.10, 8), P_IRON, gx, -0.06, 0.06);

    const geo = merge(parts);
    if (geo) {
      geo.rotateY(b.faceYaw);
      geo.translate(this._boardX(), y0, this._boardZ());
      const m = new THREE.Mesh(geo, this.matBody);
      m.name = 'refuge-breaker-' + this.siteId;
      m.castShadow = true; m.receiveShadow = true;
      this.group.add(m);
      this.solid = m;
    }

    // THE HANDLE. Its own mesh with a pivot at the boss, authored UP from the origin so
    // rotation.z is the throw. 0.62 m: long enough to be the frame's only long diagonal.
    {
      const hp = [];
      const bar = new THREE.BoxGeometry(0.055, LEVER_LEN, 0.038);
      bar.translate(0, LEVER_LEN * 0.5, 0);
      hp.push(tint(bar, P_BRASS));
      const knob = new THREE.SphereGeometry(0.055, 10, 8);
      knob.translate(0, LEVER_LEN + 0.02, 0);
      hp.push(tint(knob, P_BRASS));
      const collar = new THREE.CylinderGeometry(0.062, 0.062, 0.05, 10);
      collar.rotateX(Math.PI * 0.5);
      collar.translate(0, 0.04, 0);
      hp.push(tint(collar, P_IRON));
      const g = merge(hp);
      const pivot = new THREE.Group();
      pivot.name = 'refuge-lever-' + this.siteId;
      const m = new THREE.Mesh(g, this.matBody);
      m.name = 'refuge-lever-mesh-' + this.siteId;
      m.castShadow = true;
      pivot.add(m);
      pivot.rotation.y = b.faceYaw;
      const hinge = this._boardToSite(LEVER_HX, LEVER_HY, 0.135);
      pivot.position.set(hinge.x, y0 + hinge.y, hinge.z);
      this.group.add(pivot);
      this.lever = pivot;
      // the mesh turns about the pivot's LOCAL z after the yaw, which is the board's plane
      this._leverMesh = m;
    }

    // where the hand goes, in world metres, for the reach test
    this.breakerWX = this._wx(b.x + 0.30 * this._faceNX(), b.z + 0.30 * this._faceNZ());
    this.breakerWZ = this._wz(b.x + 0.30 * this._faceNX(), b.z + 0.30 * this._faceNZ());
    this.breakerWY = y0 + LEVER_HY;
    // the outward normal of the board, in WORLD, for the facing test and the lamp
    this.breakerNX = Math.sin(this.yaw + b.faceYaw);
    this.breakerNZ = Math.cos(this.yaw + b.faceYaw);
  }

  _boardX() { return this.anchors.breaker.x; }
  _boardZ() { return this.anchors.breaker.z; }
  /** the board's outward normal in the SITE's local frame */
  _faceNX() { return Math.sin(this.anchors.breaker.faceYaw); }
  _faceNZ() { return Math.cos(this.anchors.breaker.faceYaw); }
  /**
   * A point in the BOARD's own frame (+X right across the plate, +Y up, +Z out of the wall)
   * into the site's local frame — the same rotateY(faceYaw) then translate that the housing
   * geometry gets, written once so a lamp and the ring it sits in cannot disagree.
   * Returns y as a height ABOVE the board's foot.
   */
  _boardToSite(bx, by, bz) {
    const fy = this.anchors.breaker.faceYaw, c = Math.cos(fy), s = Math.sin(fy);
    return { x: this._boardX() + c * bx + s * bz, y: by, z: this._boardZ() - s * bx + c * bz };
  }

  /**
   * THE DOOR. A ledged and braced timber leaf on its own pivot at the hinge jamb, authored
   * along +X so a NEGATIVE rotation.y swings it inward. It is heavy: three ledges, two
   * braces, a dark frame all round and a brass latch at the far edge, which is the one pale
   * thing on it and therefore the thing you aim at.
   */
  _buildDoor() {
    const d = this.anchors.door;
    const W = d.width, H = d.height;
    const parts = [];
    const put = (geo, col, x, y, z, ry) => {
      if (ry) geo.rotateY(ry);
      geo.translate(x, y, z);
      parts.push(tint(geo, col));
    };
    // the boards: seven planks with the joints showing, so the leaf is not one slab
    const n = 7, pw = W / n;
    for (let i = 0; i < n; i++) {
      put(new THREE.BoxGeometry(pw * 0.94, H, 0.075), P_DOOR, pw * (i + 0.5), H * 0.5, 0);
    }
    // three ledges and two braces: the diagonals say "shut" from across the forecourt
    for (const ly of [0.26, H * 0.5, H - 0.26]) {
      put(new THREE.BoxGeometry(W - 0.10, 0.15, 0.045), P_DOORBAR, W * 0.5, ly, 0.058);
    }
    for (const s of [0, 1]) {
      const len = Math.hypot(W - 0.30, H * 0.5 - 0.30);
      const a = Math.atan2(H * 0.5 - 0.30, W - 0.30) * (s ? -1 : 1);
      const g = new THREE.BoxGeometry(len, 0.11, 0.04);
      g.rotateZ(a);
      g.translate(W * 0.5, H * (s ? 0.75 : 0.25), 0.056);
      parts.push(tint(g, P_DOORBAR));
    }
    // the hinge straps, and the latch at the free edge
    for (const ly of [0.30, H - 0.30]) {
      put(new THREE.BoxGeometry(0.52, 0.10, 0.035), P_IRON, 0.28, ly, 0.062);
      put(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 8), P_IRON, 0.03, ly, 0.02);
    }
    put(new THREE.BoxGeometry(0.10, 0.22, 0.05), P_IRON, W - 0.12, 1.02, 0.070);
    // the latch handle: brass, a short horizontal, the only pale pixel on the leaf
    put(new THREE.CylinderGeometry(0.022, 0.022, 0.24, 8), P_BRASS, W - 0.20, 1.02, 0.115, Math.PI * 0.5);
    put(new THREE.SphereGeometry(0.036, 8, 6), P_BRASS, W - 0.31, 1.02, 0.115);

    const geo = merge(parts);
    const pivot = new THREE.Group();
    pivot.name = 'refuge-door-' + this.siteId;
    if (geo) {
      const m = new THREE.Mesh(geo, this.matBody);
      m.name = 'refuge-door-leaf-' + this.siteId;
      m.castShadow = true; m.receiveShadow = true;
      pivot.add(m);
    }
    pivot.position.set(d.hingeX, this.padY + 0.03, d.hingeZ);
    pivot.rotation.y = d.yaw || 0;
    this.group.add(pivot);
    this.leaf = pivot;

    this.doorWX = this._wx(d.midX, d.midZ);
    this.doorWZ = this._wz(d.midX, d.midZ);
    this.doorWY = this.padY;
  }

  /**
   * The two later refuge rooms already have authored furniture. What they did not have was
   * the one object that says "you can stop here" without a word: a sleeping bag. It is kept
   * low and dark so the powered bulb, not a pale mattress, carries the read.
   */
  _buildBag() {
    const b = this.anchors.bag;
    if (!b) return;
    const parts = [];
    const put = (geo, col, x, y, z) => {
      geo.rotateY(b.yaw || 0);
      geo.translate(b.x + x, this.padY + y, b.z + z);
      parts.push(tint(geo, col));
    };
    put(new THREE.BoxGeometry(1.08, 0.12, 2.12), [0.125, 0.070, 0.050], 0, 0.08, 0);
    put(new THREE.BoxGeometry(0.82, 0.18, 0.42), [0.112, 0.100, 0.080], 0, 0.19, -0.72);
    put(new THREE.BoxGeometry(1.00, 0.08, 0.50), [0.088, 0.052, 0.040], 0, 0.17, 0.68);
    const geo = merge(parts);
    if (!geo) return;
    const m = new THREE.Mesh(geo, this.matBody);
    m.name = 'refuge-bag-' + this.siteId;
    m.castShadow = true; m.receiveShadow = true;
    this.group.add(m);
  }

  /**
   * EVERY LAMP THE BREAKER TURNS ON, one additive mesh, opacity 0 until it is thrown. The
   * value structure inverts inside this room (ART 0.3): out there is the dark, in here is
   * the only warm thing in the frame. So the fittings are small and there are five of them,
   * rather than one big pane — light with SHAPE, which is the lesson the canopy's 86 m^2
   * orange trapezoid cost this project a round to learn.
   */
  _buildLamps() {
    const L = this.anchors.lamps;
    const y = this.padY;
    const parts = [];
    // 1. the pilot on the breaker. Small, hard, and the first thing that changes.
    //    The bezel is at BOARD-local (+0.30, 0.90, 0.11); _boardToSite turns that into the
    //    site frame with the same rotateY the housing geometry got, so the bead cannot end
    //    up behind its own ring.
    if (this.spec.buildBreaker !== false) {
      const q = this._boardToSite(0.32, 0.94, 0.145);
      const foot = Number.isFinite(this.anchors.breaker.footY) ? this.anchors.breaker.footY : 0.95;
      bead(parts, q.x, y + foot + q.y, q.z, 0.038);
      halo(parts, q.x, y + foot + q.y, q.z, 0.13, 0.34, 0.85);
    }
    // 2. the bulb over the bed. MEASURED first cut: a 0.34 x 0.80 halo overflowed its own
    //    0.20 m shade and put 6% of the frame over 150 from the bed — a lamp reads as a lamp
    //    because of the SHADE it is inside, so the halo has to stay inside it.
    if (L.bulb) {
      bead(parts, L.bulb.x, y + L.bulb.y, L.bulb.z, 0.050);
      halo(parts, L.bulb.x, y + L.bulb.y, L.bulb.z, 0.15, 0.34, 0.42);
    }
    // 3. the lamp on the crate, throwing down onto the bag
    if (L.table) {
      bead(parts, L.table.x, y + L.table.y + 0.10, L.table.z, 0.036);
      halo(parts, L.table.x, y + L.table.y + 0.10, L.table.z, 0.11, 0.22, 0.36);
    }
    // 4. the firebox, which is a fire and not a lamp: low, wide, warm
    if (L.stove) {
      const g = new THREE.PlaneGeometry(0.28, 0.22, 6, 5);
      const p = g.attributes.position, cnt = p.count;
      const c = new Float32Array(cnt * 3);
      for (let i = 0; i < cnt; i++) {
        const u = p.getX(i) / 0.14, v = p.getY(i) / 0.11;
        const k = clamp01((1 - Math.abs(u) * 0.9) * (1 - Math.abs(v) * 0.55)) * 0.9;
        c[i * 3] = k; c[i * 3 + 1] = k; c[i * 3 + 2] = k;
      }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      g.translate(L.stove.x, y + L.stove.y, L.stove.z - 0.28);
      parts.push(g);
      halo(parts, L.stove.x, y + L.stove.y, L.stove.z - 0.30, 0.20, 0.36, 0.55);
    }
    // 5. the strip over the counter: a tube, hot along the middle, dead at the caps
    if (L.counter) {
      const g = new THREE.PlaneGeometry(0.16, 1.10, 3, 10);
      const p = g.attributes.position, cnt = p.count;
      const c = new Float32Array(cnt * 3);
      for (let i = 0; i < cnt; i++) {
        const v = Math.abs(p.getY(i) / 0.55);
        const k = clamp01(1 - v * v) * 0.62;
        c[i * 3] = k; c[i * 3 + 1] = k; c[i * 3 + 2] = k;
      }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      g.rotateX(Math.PI * 0.5);
      g.translate(L.counter.x, y + L.counter.y + 0.05, L.counter.z);
      parts.push(g);
    }
    // 6. THE BULKHEAD OVER THE DOOR, on the OUTSIDE. This is the one lamp the forecourt can
    //    see, and it is the whole teaching beat: you throw the breaker on the east wall, a
    //    light comes on over a door you had not noticed, and you walk to it. No words.
    if (L.door) {
      const dl = L.door;
      const g = new THREE.PlaneGeometry(0.26, 0.17, 6, 4);
      const p = g.attributes.position, cnt = p.count;
      const c = new Float32Array(cnt * 3);
      for (let i = 0; i < cnt; i++) {
        const u = p.getX(i) / 0.13, v = p.getY(i) / 0.085;
        const k = clamp01((1 - u * u * 0.85) * (1 - v * v * 0.7));
        c[i * 3] = k; c[i * 3 + 1] = k; c[i * 3 + 2] = k;
      }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      const ry = (this.spec.room ? this.spec.room.yaw : 0) + Math.PI;
      const nx = Math.sin(ry), nz = Math.cos(ry);
      g.rotateY(ry);
      g.translate(dl.x + nx * 0.10, y + dl.y, dl.z + nz * 0.10);
      parts.push(g);
      halo(parts, dl.x + nx * 0.12, y + dl.y, dl.z + nz * 0.12, 0.30, 0.60, 0.70);
    }

    const geo = merge(parts);
    if (!geo) return;
    const m = new THREE.Mesh(geo, this.matGlow);
    m.name = this.siteId === SITE_ID ? 'refuge-glow' : 'refuge-glow-' + this.siteId;
    m.renderOrder = 4;
    this.group.add(m);
    this.glow = m;
    this.matGlow.color.set(GLOW.lamp);
    this.matGlow.opacity = 0;
    // VISIBLE AT ZERO OPACITY, never hidden. renderer.compile() walks traverseVisible
    // (main.js warm(), and MARROW's creature-park note beside it), so a mesh that is hidden at
    // boot links its program on the frame it first appears — which here is the frame the
    // player throws the breaker, i.e. exactly the frame that must not stutter. An additive
    // material at opacity 0 adds nothing to the picture and costs one draw call inside
    // DRAW_R. Measured by cache-key diff in tests/refuge.mjs: zero programs link on the throw.
    m.visible = true;
  }

  /* ==========================================================================
     THE BLACK. A DOM overlay, not a mesh: the viewmodel is drawn in its OWN
     scene with its own camera AFTER the composer (viewmodel.js:1646-1664), so a
     quad in the world scene would fade the county to black and leave the gun
     hanging in it. The overlay sits above the HUD (z-index 12) and below the
     shell (20) and the pause card (24), so pausing mid-rest still works.

     `luma()` samples the GL buffer with readPixels and therefore CANNOT SEE
     THIS. tests/refuge.mjs measures it with getComputedStyle and with a
     screenshot instead, and that limitation is written down here so nobody
     "fixes" a passing test by deleting the thing that works.
     ========================================================================== */
  _overlayInit() {
    if (typeof document === 'undefined' || !document.body) return;
    let el = document.getElementById('curfew-rest');
    if (!el) {
      el = document.createElement('div');
      el.id = 'curfew-rest';
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'position:fixed;inset:0;z-index:16;background:#000;opacity:0;'
        + 'pointer-events:none;display:none;will-change:opacity';
      document.body.appendChild(el);
    }
    this._overlay = el;
  }

  /* ==========================================================================
     SAVE. Three bits in progression's free-form worldFlags bag: whether the
     power is on, and how the door was left. It is the same channel the wilds'
     caches use, so nothing new persists and nothing new can go stale.
     ========================================================================== */
  _restore() {
    const prog = this._sys('progress');
    const v = prog && typeof prog.flag === 'function' ? prog.flag('refuge:' + this.siteId) : undefined;
    const bits = Number(v) || 0;
    const places = this._sys('places');
    this.power = this.spec.claimPowered
      ? !!(places && typeof places.isClaimed === 'function' && places.isClaimed(this.siteId))
      : (bits & 1) !== 0;
    this.powerK = this.power ? 1 : 0;
    // The door starts OPEN whatever the save says, unless the save says it was shut AND the
    // power is on. A shut door you did not shut teaches nothing, and the first thing this
    // whole feature has to do is teach.
    const wasShut = (bits & 2) !== 0 && this.power;
    this.doorK = wasShut ? 1 : 0;
    this.doorTarget = this.doorK;
    this.leverK = this.power ? 1 : 0;
    this._leverPrev = this._leverCurr = this.leverK;
    this._doorPrev = this._doorCurr = this.doorK;
    this._applyPowerNow();
    this._syncDoorCollider();
  }

  _save() {
    const prog = this._sys('progress');
    if (!prog || typeof prog.flag !== 'function') return;
    prog.flag('refuge:' + this.siteId, (this.power ? 1 : 0) | (this.doorK > DOOR_SHUT_AT ? 2 : 0));
  }

  /* ==========================================================================
     STEP
     ========================================================================== */
  step(dt) {
    if (this._owner) { this._stepOne(dt); return; }
    for (let i = 0; i < this._units.length; i++) this._units[i]._stepOne(dt);
  }

  _stepOne(dt) {
    if (!this._ready || !(dt > 0)) return;
    const player = this._sys('player');
    const p = player && player.pos ? player.pos : null;
    if (!p) return;

    // The two destination refuges use the destination's EXISTING completion fixture as
    // their panel. Claiming the lamp/cabinet brings the room up; no duplicate switch sits
    // beside the real one and no second reward path is invented.
    if (this.spec.claimPowered) {
      const places = this._sys('places');
      const on = !!(places && typeof places.isClaimed === 'function' && places.isClaimed(this.siteId));
      if (on !== this.power) {
        if (on) { this.leverK = 1; this._setPower(true); }
        else { this.power = false; this.leverK = 0; this._save(); }
      }
    }

    // --- resting takes the whole system over --------------------------------
    if (this.resting) { this._restStep(dt, player, p); this._cullStep(dt); return; }

    const inCar = !!(this.ctx.shared && this.ctx.shared.inCar);
    const px = p.x, pz = p.z, py = p.y;

    // --- the verb -----------------------------------------------------------
    const inp = this.ctx.input;
    const use = !inCar && !!(inp && typeof inp.held === 'function' && inp.held('use'));
    const pressed = use && !this._usePrev;
    this._usePrev = use;

    const cand = this._candidate(px, py, pz);

    if (!use) {
      this.holdKind = ''; this.holdT = 0;
    } else if (pressed) {
      if (cand === 'door') this._toggleDoor(px, pz);
      else if (cand === 'breaker' && this.spec.buildBreaker !== false && !this.power && this.throwT < 0) { this.holdKind = 'breaker'; this.holdT = 0; this._say('lantern', 0.85, this.breakerWX, this.breakerWY, this.breakerWZ); }
      else if (cand === 'bed') { this.holdKind = 'bed'; this.holdT = 0; }
      else if (cand === 'breaker' && this.power) { this.stats.refusals++; this._say('lanternGone', 0.6, this.breakerWX, this.breakerWY, this.breakerWZ); }
      else if (cand === 'bed-blocked') { this.stats.refusals++; this._say('lanternGone', 0.5, px, py + 1.2, pz); }
    } else if (this.holdKind) {
      if (cand !== this.holdKind) { this.holdKind = ''; this.holdT = 0; }
      else {
        this.holdT += dt;
        if (this.holdKind === 'breaker' && this.holdT >= HOLD_BREAKER) {
          this.holdKind = ''; this.holdT = 0;
          this.throwT = 0;                       // the 0.4 s swing begins
          this._say('branch', 0.55, this.breakerWX, this.breakerWY, this.breakerWZ);
        } else if (this.holdKind === 'bed' && this.holdT >= HOLD_REST) {
          this.holdKind = ''; this.holdT = 0;
          this._beginRest(p);
        }
      }
    }

    // --- the handle ---------------------------------------------------------
    this._leverPrev = this._leverCurr;
    if (this.throwT >= 0) {
      this.throwT += dt;
      const t = clamp01(this.throwT / THROW_S);
      // ease-OUT, so it goes over centre fast and arrives. Nothing floaty.
      this.leverK = LEVER_CREEP + (1 - LEVER_CREEP) * (1 - (1 - t) * (1 - t) * (1 - t));
      if (this.throwT >= THROW_S) { this.throwT = -1; this.leverK = 1; this._setPower(true); }
    } else if (this.power) {
      this.leverK = 1;
    } else {
      const target = this.holdKind === 'breaker' ? clamp01(this.holdT / HOLD_BREAKER) * LEVER_CREEP : 0;
      this.leverK = target >= this.leverK ? target : Math.max(target, this.leverK - LEVER_SNAP * dt);
    }
    this._leverCurr = this.leverK;

    // --- the door -----------------------------------------------------------
    this._doorPrev = this._doorCurr;
    if (this.doorK !== this.doorTarget) {
      const d = dt / DOOR_SWING_S;
      const was = this.doorK;
      this.doorK = this.doorTarget > this.doorK ? Math.min(this.doorTarget, this.doorK + d)
        : Math.max(this.doorTarget, this.doorK - d);
      if (was < 1 && this.doorK >= 1) this._onShut(px, pz);
      this._syncDoorCollider();
    }
    this._doorCurr = this.doorK;

    // --- the lamps coming up ------------------------------------------------
    if (this.power && this.powerK < 1) this.powerK = Math.min(1, this.powerK + dt / POWER_RAMP_S);
    else if (!this.power && this.powerK > 0) this.powerK = Math.max(0, this.powerK - dt / POWER_RAMP_S);

    this._lampStep(px, pz);
    this._cullStep(dt);
  }

  /**
   * Which of the three things is in reach and being looked at. One answer, so two verbs can
   * never fire on one press. Nearest wins, and the bed only counts when the room is actually
   * a refuge — power on and the door shut — which is the whole lesson stated as a condition.
   */
  _candidate(px, py, pz) {
    const cam = this._sys('camera');
    const lookX = cam ? -Math.sin(cam.yaw) : 0, lookZ = cam ? -Math.cos(cam.yaw) : -1;
    let best = '', bestD = Infinity;
    const test = (kind, wx, wy, wz, reach, needFace) => {
      const dx = wx - px, dz = wz - pz;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d >= reach) return;
      if (Math.abs(py - wy) > 2.6) return;
      if (needFace && d > 0.35) {
        const dot = (dx * lookX + dz * lookZ) / d;
        if (dot < FACE_MIN) return;
      }
      if (d < bestD) { bestD = d; best = kind; }
    };
    test('door', this.doorWX, this.doorWY, this.doorWZ, REACH_DOOR, true);
    if (this.spec.buildBreaker !== false) test('breaker', this.breakerWX, this.breakerWY - 0.65, this.breakerWZ, REACH_BREAKER, true);
    const b = this.anchors.bag;
    const bx = this._wx(b.x, b.z), bz = this._wz(b.x, b.z);
    test(this._canRest() ? 'bed' : 'bed-blocked', bx, this.padY, bz, REACH_BED, false);
    return best;
  }

  /** The bed only works when the place is safe. That IS the teaching. */
  _canRest() { return this.power && this.doorK >= DOOR_SHUT_AT; }

  /* ------------------------------------------------------------------ door -- */
  _toggleDoor(px, pz) {
    const shutting = this.doorTarget < 0.5;
    this.doorTarget = shutting ? 1 : 0;
    if (!shutting) {
      this.stats.doorOpens++;
      this._syncDoorCollider();
      this._say('door', 0.55, this.doorWX, this.doorWY + 1.1, this.doorWZ);
    } else {
      this._say('door', 0.45, this.doorWX, this.doorWY + 1.1, this.doorWZ);
    }
    void px; void pz;
  }

  /**
   * THE DOOR SHUT. This is the hook nothing has ever fired.
   *
   * Two effects, deliberately separate:
   *   - the BASE effect, which every player gets whether or not the tree has been touched:
   *     everything that cannot see you loses the trail. enemies.loseTrail() already refuses
   *     to silence anything with line of sight, and refuses the horror species outright, so
   *     "shutting the door" cannot sell the horror off a door hinge.
   *   - the NODE, quiet_3 "Shut the Door", through progression's onDoorShut hook, which
   *     additionally drops distant hunts at SHUT_DOOR_M. progress._doorShut() is the only
   *     runner and it is called here directly because progress owns the hook registry and
   *     this lane may not add a listener to a file it does not own. The request for a
   *     `door:shut` bus channel is in docs/ROUND-7/HANDOFF-A.md; until it exists, this is
   *     the guarded fallback and it works today.
   */
  _onShut(px, pz) {
    this.stats.doorShuts++;
    this._say('door', 1.0, this.doorWX, this.doorWY + 1.1, this.doorWZ);
    const enemies = this._sys('enemies');
    if (enemies && typeof enemies.loseTrail === 'function') {
      try { this.stats.trailsLost += enemies.loseTrail(px, pz, DOOR_LOSE_R) || 0; }
      catch (e) { this._note('loseTrail: ' + e.message); }
    }
    const prog = this._sys('progress');
    if (prog && typeof prog._doorShut === 'function') {
      try { prog._doorShut(); this.stats.hookRuns++; }
      catch (e) { this._note('onDoorShut: ' + e.message); }
    }
    _doorPayload.id = this.siteId; _doorPayload.shut = true; _doorPayload.x = px; _doorPayload.z = pz;
    this.ctx.bus.emit('door:shut', _doorPayload);
    this._save();
  }

  /**
   * The leaf's collider, in the two places a leaf ever RESTS: across the doorway when it is
   * shut, and standing back inside the room when it is open. While it swings there is none —
   * a collider that moves under a capsule pushes the body, and a door that shoves you across
   * a room is worse than a door you can walk through for half a second.
   *
   * The open position is not "no collider". An open leaf is 2.3 m of timber standing in the
   * room and you must not be able to walk through it; the first cut of this file could, and
   * it looked exactly like the walk-through trees CINDERBLOOM shipped.
   */
  _syncDoorCollider() {
    const col = this._sys('collision');
    if (!col || typeof col.addCollider !== 'function') return;
    const want = this.doorK >= DOOR_SHUT_AT ? 'shut' : (this.doorK <= 0.05 ? 'open' : '');
    if (want === this.doorColliderOn) return;
    this.doorColliderOn = want;
    const chunkId = 'refuge:door:' + this.siteId;
    if (typeof col.removeChunk === 'function') col.removeChunk(chunkId);
    if (!want) return;
    const d = this.anchors.door;
    // the leaf's midpoint and heading at this rest angle, in the site's local frame
    const th = want === 'shut' ? 0 : d.open;
    const h = d.width * 0.5;
    const base = d.yaw || 0;
    const lx = d.hingeX + h * Math.cos(base + th), lz = d.hingeZ - h * Math.sin(base + th);
    col.addCollider({
      kind: 'obb',
      x: this._wx(lx, lz), z: this._wz(lx, lz),
      halfX: h, halfZ: 0.09, yaw: this.yaw + base + th,
      y0: this.padY - 0.2, y1: this.padY + d.height,
      tag: 'wall', climbable: false,
    }, chunkId);
  }

  /* --------------------------------------------------------------- breaker -- */
  _setPower(on) {
    if (this.power === on) return;
    this.power = on;
    if (on) {
      this.stats.throws++;
      // the clunk. A breaker is a heavy thing arriving at a stop, not a click.
      this._say('door', 1.0, this.breakerWX, this.breakerWY, this.breakerWZ);
      this._say('branch', 0.7, this.breakerWX, this.breakerWY, this.breakerWZ);
      if ((this.spec.xpPower || 0) > 0) {
        _xpPayload.amount = this.spec.xpPower;
        _xpPayload.x = this.breakerWX; _xpPayload.y = this.breakerWY; _xpPayload.z = this.breakerWZ;
        this.ctx.bus.emit('xp:gained', _xpPayload);
      }
    }
    _powerPayload.id = this.siteId; _powerPayload.on = on;
    this.ctx.bus.emit('refuge:power', _powerPayload);
    this._save();
  }

  /** Set the lamps to their final state with no ramp — boot, and the save restore. */
  _applyPowerNow() {
    this.powerK = this.power ? 1 : 0;
    if (this.glow) {
      this.glow.visible = true;
      this.matGlow.opacity = this.powerK;
    }
  }

  /**
   * ONE ROVER, borrowed from lights.borrow() — the only way a dynamic light exists here
   * (AGENTS.md: the census is 13, allocated at boot, never added to). Released and re-taken
   * when you cross the doorway, because a handle's position is fixed once it is seated.
   */
  _lampStep(px, pz) {
    const lights = this._sys('lights');
    if (!lights || typeof lights.borrow !== 'function') return;
    const lx = this._lx(px, pz), lz = this._lz(px, pz);
    const room = this.spec.room || { x: -10.5, z: 0.5, yaw: 0, w: 10, d: 7 };
    const dx = lx - room.x, dz = lz - room.z;
    const near = this.powerK > 0.02 && (dx * dx + dz * dz) < LAMP_RANGE * LAMP_RANGE;
    if (!near) {
      if (this._lamp) {
        if (typeof lights.release === 'function') lights.release(this._lamp);
        this._lamp = null; this._lampWhere = '';
      }
      return;
    }
    if (!this._lamp) {
      const h = lights.borrow('refuge:' + this.siteId, px, this.padY + 2, pz, GLOW.lamp, 0.0001, 0);
      if (!h) return;                                    // pool empty: ask again next step
      this._lamp = h;
      this._lamp.decay = this.spec.lampDecay || 1.05;
    }
    // Inverse the room's sub-yaw inside the site's local frame. The outside/inside lamp
    // handoff follows the actual cottage/hut walls rather than the Filling Station's box.
    const rcy = Math.cos(room.yaw || 0), rsy = Math.sin(room.yaw || 0);
    const rx = dx * rcy - dz * rsy, rz = dx * rsy + dz * rcy;
    const edge = this._lampWhere === 'in' ? 0.34 : 0.12;
    const inside = Math.abs(rx) < room.w * 0.5 - edge && Math.abs(rz) < room.d * 0.5 - edge;
    this._lampWhere = inside ? 'in' : 'out';
    const L = this.anchors.lamps;
    const a = inside ? L.bulb : L.door;
    if (!a) return;
    // A handle's position and peak are READ every present (gfx/lights.js:857-868), so the
    // one rover is moved rather than released and re-borrowed. No reseat is forced: the
    // pool re-seats on its own clock and a light that walks is not a light that appeared.
    this._lamp.x = this._wx(a.x, a.z);
    this._lamp.y = this.padY + a.y - (inside ? 0.06 : 0.10);
    this._lamp.z = this._wz(a.x, a.z);
    this._lamp.peak = (inside ? (this.spec.lampIn || LAMP_IN_I) : (this.spec.lampOut || LAMP_OUT_I)) * this.powerK;
    this._lamp.decay = this.spec.lampDecay || 1.05;
  }

  /* ------------------------------------------------------------------ rest -- */
  _beginRest(p) {
    this.resting = true;
    this.restT = 0;
    this.restPhase = 'in';
    this.restAnchorX = p.x; this.restAnchorZ = p.z; this.restAnchorY = p.y;
    this.stats.rests++;
    _restPayload.id = this.siteId; _restPayload.x = p.x; _restPayload.z = p.z; _restPayload.seconds = REST_CLOCK_S;
    this.ctx.bus.emit('place:rest', _restPayload);
  }

  /**
   * The rest. Fade, then the whole beat happens on ONE frame at full black, then up fast.
   * While it runs the body is pinned: refuge steps BEFORE player in the manifest, so the
   * pin is re-applied every step and the most the controller can move you between two of
   * them is one frame of walk. Nothing may reach you: everything unaware is released again
   * at the black, on top of the door already having released it.
   */
  _restStep(dt, player, p) {
    this.restT += dt;
    this._fadePrev = this._fadeCurr;
    if (this.restPhase === 'in') {
      this.fade = clamp01(this.restT / REST_FADE_IN);
      if (this.restT >= REST_FADE_IN) {
        this.fade = 1;
        this.restPhase = 'black';
        this.restT = 0;
        this._sleep(player, p);
      }
    } else if (this.restPhase === 'black') {
      this.fade = 1;
      if (this.restT >= REST_BLACK) { this.restPhase = 'out'; this.restT = 0; }
    } else {
      this.fade = 1 - clamp01(this.restT / REST_FADE_OUT);
      if (this.restT >= REST_FADE_OUT) {
        this.fade = 0;
        this.resting = false;
        this.restPhase = '';
        this._usePrev = true;      // do not re-trigger on the key still being held
      }
    }
    this._fadeCurr = this.fade;
    // pin the body. Zero the velocity FIRST so the controller's own integration starts flat.
    if (player && player.vel) { player.vel.x = 0; player.vel.z = 0; if (player.vel.y > 0) player.vel.y = 0; }
    if (p) { p.x = this.restAnchorX; p.z = this.restAnchorZ; p.y = this.restAnchorY; }
    if (this.powerK < 1 && this.power) this.powerK = Math.min(1, this.powerK + dt / POWER_RAMP_S);
    this._lampStep(this.restAnchorX, this.restAnchorZ);
  }

  /** The one frame at full black on which everything actually happens. */
  _sleep(player, p) {
    // 1. healed
    if (player && typeof player.heal === 'function') {
      const before = player.hp;
      player.heal(player.hpMax);
      this.stats.healed += Math.max(0, player.hp - before);
    }
    // 2. time passes. clock.cycleT is the one clock; _recompute republishes the phase.
    const clock = this._sys('clock');
    if (clock && typeof clock.cycleT === 'number') {
      clock.cycleT += REST_CLOCK_S;
      if (typeof clock._recompute === 'function') { try { clock._recompute(); } catch (e) { this._note('clock: ' + e.message); } }
    }
    // 3. nothing reached you, and nothing is waiting when you get up
    const enemies = this._sys('enemies');
    if (enemies && typeof enemies.loseTrail === 'function') {
      try { this.stats.trailsLost += enemies.loseTrail(p ? p.x : 0, p ? p.z : 0, 0) || 0; } catch (e) { this._note('loseTrail: ' + e.message); }
    }
    if (REST_XP > 0) {
      _xpPayload.amount = REST_XP; _xpPayload.x = p ? p.x : 0; _xpPayload.y = p ? p.y : 0; _xpPayload.z = p ? p.z : 0;
      this.ctx.bus.emit('xp:gained', _xpPayload);
    }
    this._save();
  }

  /* ==========================================================================
     PRESENT. Simulation writes prev/curr; this is the only place a transform or
     an opacity is assigned (docs/CONTRACT.md — render interpolation, always).
     ========================================================================== */
  present(alpha) {
    if (this._owner) { this._presentOne(alpha); return; }
    let fade = 0;
    for (let i = 0; i < this._units.length; i++) fade = Math.max(fade, this._units[i]._presentOne(alpha));
    if (this._overlay) {
      const shown = fade > 0.002;
      this._overlay.style.display = shown ? 'block' : 'none';
      if (shown) this._overlay.style.opacity = String(fade);
    }
  }

  _presentOne(alpha) {
    if (!this._ready) return 0;
    const a = clamp01(alpha);
    const lever = this._leverPrev + (this._leverCurr - this._leverPrev) * a;
    const door = this._doorPrev + (this._doorCurr - this._doorPrev) * a;
    if (this._leverMesh) this._leverMesh.rotation.z = LEVER_UP + (LEVER_DOWN - LEVER_UP) * lever;
    if (this.leaf) {
      const d = this.anchors.door;
      this.leaf.rotation.y = (d.yaw || 0) + d.open * (1 - door);
    }
    if (this.glow) {
      this.matGlow.opacity = this.powerK;
      this.glow.visible = this.group.visible;
    }
    return this._fadePrev + (this._fadeCurr - this._fadePrev) * a;
  }

  /** Distance culling, done in the step so present() only ever reads it. */
  _cullStep(dt) {
    void dt;
    const cam = this.ctx.camera;
    if (!cam || !this.group) return;
    _v.set(this.ox, this.padY, this.oz);
    const d = _v.distanceTo(cam.position);
    this.group.visible = d < DRAW_R;
  }

  /* --------------------------------------------------------------- helpers -- */
  _say(kind, gain, x, y, z) {
    const audio = this._sys('audio');
    if (!audio || typeof audio.dread !== 'function') return;
    try { audio.dread(kind, x, y, z, gain); } catch (e) { this._note('audio: ' + e.message); }
  }

  /* ==========================================================================
     THE TEST SURFACE. Everything tests/refuge.mjs asserts is readable here, and
     every setter drives the same code path the player's key does.
     ========================================================================== */
  state(id = this.siteId) {
    if (!this._owner && id !== this.siteId) {
      const unit = this._units.find(u => u.siteId === id);
      return unit ? unit.state(unit.siteId) : null;
    }
    const b = this.anchors.bag;
    return {
      id: this.siteId, ready: this._ready, claimPowered: !!this.spec.claimPowered,
      power: this.power, powerK: +this.powerK.toFixed(3),
      lever: +this.leverK.toFixed(3), throwing: this.throwT >= 0,
      door: +this.doorK.toFixed(3), doorTarget: this.doorTarget, collider: this.doorColliderOn,
      resting: this.resting, restPhase: this.restPhase, fade: +this.fade.toFixed(3),
      canRest: this._canRest(),
      hold: this.holdKind, holdT: +this.holdT.toFixed(3),
      lamp: this._lampWhere || null,
      overlay: (this._overlay || (this._owner && this._owner._overlay))
        ? +(Number((this._overlay || this._owner._overlay).style.opacity) || 0).toFixed(3) : null,
      stats: this.stats,
      notes: this._notes.slice(),
      // world anchors, so a test can teleport to them without knowing the site's yaw
      at: {
        breaker: [this.breakerWX, this.breakerWY, this.breakerWZ],
        door: [this.doorWX, this.doorWY, this.doorWZ],
        // where the leaf STANDS when it is open, so a test can ask the collision field
        // whether an open door is still a solid object
        leafOpen: (() => {
          const d = this.anchors.door, th = d.open, h = d.width * 0.5, base = d.yaw || 0;
          const lx = d.hingeX + h * Math.cos(base + th), lz = d.hingeZ - h * Math.sin(base + th);
          return [this._wx(lx, lz), this._wz(lx, lz)];
        })(),
        bed: [this._wx(b.x, b.z), this.padY, this._wz(b.x, b.z)],
        normal: [this.breakerNX, this.breakerNZ],
        doorNormal: (() => {
          const d = this.anchors.door, a = this.yaw + (d.yaw || 0) + Math.PI;
          return [Math.sin(a), Math.cos(a)];
        })(),
        yaw: this.yaw, padY: this.padY,
      },
    };
  }

  /** Drive the verbs from a test without synthesising a keypress. */
  force(what, on, id = this.siteId) {
    if (!this._owner && id !== this.siteId) {
      const unit = this._units.find(u => u.siteId === id);
      return unit ? unit.force(what, on, unit.siteId) : false;
    }
    if (what === 'power') { if (on === false) { this.power = false; this.leverK = 0; this._applyPowerNow(); this._save(); } else { this.leverK = 1; this._setPower(true); this._applyPowerNow(); } return true; }
    if (what === 'door') { this.doorTarget = on === false ? 0 : 1; return true; }
    if (what === 'doorNow') {
      this.doorTarget = on === false ? 0 : 1;
      const was = this.doorK;
      this.doorK = this.doorTarget;
      this._doorPrev = this._doorCurr = this.doorK;
      if (was < 1 && this.doorK >= 1) {
        const p = this._sys('player');
        this._onShut(p && p.pos ? p.pos.x : 0, p && p.pos ? p.pos.z : 0);
      }
      this._syncDoorCollider();
      return true;
    }
    if (what === 'rest') {
      const p = this._sys('player');
      if (!p || !p.pos) return false;
      this._beginRest(p.pos);
      return true;
    }
    return false;
  }

  config(patch) {
    const r = patch && patch.refuge;
    if (!r) return;
    if (r.power !== undefined) this.force('power', !!r.power);
    if (r.door !== undefined) this.force('doorNow', !!r.door);
    if (!this._owner && r.sites) {
      for (const id of Object.keys(r.sites)) {
        const s = r.sites[id] || {};
        if (s.power !== undefined) this.force('power', !!s.power, id);
        if (s.door !== undefined) this.force('doorNow', !!s.door, id);
      }
    }
  }

  /** All three honest refuge loops, as copies. The station remains state()'s default. */
  refuges() {
    if (this._owner) return [this.state()];
    return this._units.map(u => u.state(u.siteId));
  }

  ready() { return true; }

  dispose() {
    if (!this._owner && this._units) {
      for (let i = 1; i < this._units.length; i++) this._units[i].dispose();
      this._units.length = 1;
    }
    if (this._lamp) {
      const lights = this._sys('lights');
      if (lights && typeof lights.release === 'function') lights.release(this._lamp);
      this._lamp = null; this._lampWhere = '';
    }
    const col = this._sys('collision');
    if (col && typeof col.removeChunk === 'function') col.removeChunk('refuge:door:' + this.siteId);
    this.doorColliderOn = '';
    if (this.group) {
      if (this.group.parent) this.group.parent.remove(this.group);
      this.group.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
      this.group = null;
    }
    if (this.matBody) { this.matBody.dispose(); this.matBody = null; }
    if (this.matGlow) { this.matGlow.dispose(); this.matGlow = null; }
    if (!this._owner && this._overlay && this._overlay.parentNode) this._overlay.parentNode.removeChild(this._overlay);
    this._overlay = null;
    this._ready = false;
  }
}

export default Refuge;
