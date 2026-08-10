// ANALYTIC GROUND — one pure function per chamber, and it is the truth.
//
// SKYSHARD's discipline, imported wholesale: height is ONE expression. The mesh
// vertices, the player controller, enemy grounding, projectile impacts, scar
// placement, pickup rest height, contact blobs and spawn validation all call
// `groundAt(x, z, y)`. Physics and render cannot disagree by a millimetre because
// they are literally the same arithmetic.
//
// Two rules make that survive contact with the rest of the project:
//
//   NO THREE.JS. This module imports nothing but the tuning block and pure math,
//   so the geometry gate (tests/geometry.mjs) runs headless with no GPU in under
//   ten seconds. A ground function you cannot test without a browser is a ground
//   function nobody tests.
//
//   NO ALLOCATION. `groundAt` and `surfaceAt` are called per actor per substep.
//   Everything they touch is a number or a caller-supplied `out`. The only
//   allocation in this file happens once, inside `createGround`.
//
// The helix is authored here rather than in the chamber because the RAIL and the
// ramp are the same curve: the handrail is offset from `rampOuterR`, its doorways
// are parameterised in the same `t`, and the traversal harness drives that `t`.
// Two copies of a helix is two helices.

import { FEEL } from '../feel.js';
import { clamp, lerp, TAU } from '../core/math.js';

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this module. CONTRACT §5 — no tuning number is
// inlined at a use site, and the capsule/resolver numbers are not duplicated
// here at all: they live in FEEL.move and are read from there.
// ---------------------------------------------------------------------------
export const GROUND = Object.freeze({
  // Sentinels. A finite floor keeps every downstream expression finite; an
  // Infinity here turns one missing surface into NaN four systems away.
  none: -1e9,
  top: 1e9,
  eps: 1e-9,

  // A query returns the highest surface at or below `y + stepGrace`. 1.7 m is
  // deliberately larger than PLAYER_HEIGHT is tall in the vertical chambers:
  // it is what lets a body standing on turn N of the helix see turn N's deck
  // and not turn N+1's underside.
  stepGrace: 1.7,

  // Query lift. DESIGN: SELF queries lift 0.05; the 0.75 player lift is applied
  // ONLY to the player, or a walker correctly descending the helix misclassifies
  // itself as being on the deck above.
  selfLift: 0.05,
  playerLift: 0.75,

  // Finite-difference span for numeric slope probes on authored surfaces.
  sample: 0.32,

  // Default slab thickness for a room platform that does not declare one. It is
  // what `ceilingAt` bumps a head on from underneath.
  platformThickness: 0.3,

  kind: Object.freeze({
    void: 'void', floor: 'floor', ramp: 'ramp', deck: 'deck', platform: 'platform',
  }),

  // THE HELIX (chamber 2). Every number authored in docs/DESIGN.md, unchanged.
  //   surface y = lerp(lowerFloorY + surfaceLift, deckY + deckLift, t)
  //   rail centre radius = rampOuterR + railOffset, three doorways at railGaps.
  helix: Object.freeze({
    footprintRadius: 28,
    lowerFloorY: 0.28,
    deckY: 34,
    deckOuterR: 19.5,
    deckOpeningR: 5.15,      // the real hole: below this radius the deck is not there
    // The ramp arrives THROUGH the deck. Wherever a turn passes within this of
    // deck level, the deck is absent — otherwise the last 1.7 m of the climb has
    // the player's head inside the slab and groundAt reads the deck as the floor
    // while the body is still on the ramp. 2.4 = slab 0.3 + height 1.72 + 0.38
    // of head clearance. The mesh builder MUST call helixDeckPresent, not
    // re-derive this; two expressions is two decks.
    deckSlot: 2.4,
    rampInnerR: 6.55,
    rampOuterR: 10.35,
    rampTurns: 3.25,
    startAngle: -Math.PI / 2,
    segments: 144,
    thickness: 0.3,
    surfaceLift: 0.03,
    deckLift: 0.035,
    railGaps: Object.freeze([0.25, 0.5, 0.75]),
    railHalfT: 0.013,
    railTube: 0.07,
    railBandLo: 0.12,        // heights are RELATIVE to the ramp surface at that t
    railBandHi: 1.23,
    railOffset: 0.08,
    tierFloor: 0, tierRamp: 1, tierDeck: 2,
  }),

  // M0 GREYBOX: "one flat room built from groundAt". Deliberately boring — the
  // milestone is a question about light, not about level design.
  greybox: Object.freeze({
    id: 'greybox', shape: 'rect', floorY: 0, halfX: 24, halfZ: 24, tier: 0, wallHeight: 6, wallThickness: 0.6,
  }),
});

const H = GROUND.helix;

/** A surface exists here. Every consumer must ask before using the number. */
export const hasSurface = y => y > GROUND.none;

// ---------------------------------------------------------------------------
// HELIX PARAMETERISATION
//
// Exported as free functions because three different owners drive this same
// curve: W2 (the collider and the rail), W4/W9 (the ramp mesh) and the traversal
// harness. `t` runs 0..1 over `rampTurns` turns.
// ---------------------------------------------------------------------------

export const helixSweep = (h = H) => TAU * h.rampTurns;
export const helixAngleAt = (h, t) => h.startAngle + TAU * h.rampTurns * t;
export const helixRampY = (h, t) => lerp(h.lowerFloorY + h.surfaceLift, h.deckY + h.deckLift, t);
export const helixMidR = (h = H) => (h.rampInnerR + h.rampOuterR) * 0.5;
export const helixRailR = (h = H) => h.rampOuterR + h.railOffset;
/** Rise per radian — the constant that sets the ramp's slope at every radius. */
export const helixRisePerRadian = (h = H) =>
  (h.deckY + h.deckLift - h.lowerFloorY - h.surfaceLift) / (TAU * h.rampTurns);

/**
 * Is the deck solid at this (x,z)? False inside the central hole, outside the
 * deck's outer edge, and inside the SLOT the ramp emerges through. Exported so
 * the deck mesh is cut from the same expression the collider is — the whole
 * point of an analytic ground.
 */
export function helixDeckPresent(h, x, z) {
  const r = Math.sqrt(x * x + z * z);
  if (r < h.deckOpeningR || r > h.deckOuterR) return false;
  if (r < h.rampInnerR || r > h.rampOuterR) return true;
  const sweep = TAU * h.rampTurns;
  let phase = (Math.atan2(z, x) - h.startAngle) % TAU;
  if (phase < 0) phase += TAU;
  for (let k = 0; k <= h.rampTurns + 1; k++) {
    const a = phase + TAU * k;
    if (a > sweep + GROUND.eps) break;
    const y = helixRampY(h, a / sweep);
    if (y > h.deckY - h.deckSlot && y <= h.deckY + h.deckLift + GROUND.eps) return false;
  }
  return true;
}

/** True inside one of the three doorways cut through the handrail. */
export function helixRailGap(h, t) {
  const gaps = h.railGaps;
  for (let i = 0; i < gaps.length; i++) if (Math.abs(t - gaps[i]) <= h.railHalfT) return true;
  return false;
}

/** World point on the ramp centre-line (or any radius) at parameter t. */
export function helixPointAt(h, t, radius, out) {
  const a = helixAngleAt(h, t);
  out.x = Math.cos(a) * radius;
  out.y = helixRampY(h, t);
  out.z = Math.sin(a) * radius;
  return out;
}

/** Unit tangent along increasing t at the given radius. Drives the harness. */
export function helixTangentAt(h, t, radius, out) {
  const a = helixAngleAt(h, t);
  const sweep = TAU * h.rampTurns;
  const dx = -Math.sin(a) * radius * sweep;
  const dz = Math.cos(a) * radius * sweep;
  const dy = h.deckY + h.deckLift - h.lowerFloorY - h.surfaceLift;
  const inv = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);
  out.x = dx * inv; out.y = dy * inv; out.z = dz * inv;
  return out;
}

/**
 * Which turn of the ramp is a body at (x,z,y) standing on? Returns t in 0..1, or
 * -1 if no turn passes at or below `y + stepGrace` here. This is the inverse the
 * rail resolver needs: the handrail's doorway is a property of t, and a given
 * (x,z) sits under three or four different values of t.
 */
export function helixTAt(h, x, z, y) {
  const sweep = TAU * h.rampTurns;
  let phase = (Math.atan2(z, x) - h.startAngle) % TAU;
  if (phase < 0) phase += TAU;
  const ceiling = y + GROUND.stepGrace;
  let best = -1, bestY = GROUND.none;
  for (let k = 0; k <= h.rampTurns + 1; k++) {
    const a = phase + TAU * k;
    if (a > sweep + GROUND.eps) break;
    const t = a / sweep;
    const sy = helixRampY(h, t);
    if (sy <= ceiling && sy > bestY) { bestY = sy; best = t; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// SURFACE RECORD — module scratch, so `surfaceAt` allocates nothing when the
// caller does not supply an `out`. Callers that keep the result across a call
// must pass their own object; that rule is why the field is named `_scratch`.
// ---------------------------------------------------------------------------
function newSurface() {
  return {
    found: false, y: GROUND.none, kind: GROUND.kind.void, tier: 0,
    nx: 0, ny: 1, nz: 0, slopeCos: 1, slope: 0, walkable: true, t: -1,
  };
}
const _scratch = newSurface();
export { newSurface };

function setSurface(out, y, kind, tier, nx, ny, nz, t) {
  out.found = y > GROUND.none;
  out.y = y; out.kind = kind; out.tier = tier;
  out.nx = nx; out.ny = ny; out.nz = nz;
  out.slopeCos = ny;
  out.slope = Math.acos(clamp(ny, -1, 1));
  out.walkable = ny >= FEEL.move.maxSlopeCos;
  out.t = t;
  return out;
}

// ---------------------------------------------------------------------------
// HELIX GROUND
// ---------------------------------------------------------------------------
function makeHelixGround(spec) {
  const h = spec.helix || H;
  const sweep = TAU * h.rampTurns;
  const rise = helixRisePerRadian(h);
  const turnsToScan = Math.ceil(h.rampTurns) + 1;

  function rampCandidate(x, z, ceiling) {
    // Highest turn of the ramp at or below `ceiling`, at this (x,z).
    let phase = (Math.atan2(z, x) - h.startAngle) % TAU;
    if (phase < 0) phase += TAU;
    let bestY = GROUND.none, bestT = -1;
    for (let k = 0; k <= turnsToScan; k++) {
      const a = phase + TAU * k;
      if (a > sweep + GROUND.eps) break;
      const t = a / sweep;
      const sy = helixRampY(h, t);
      if (sy <= ceiling && sy > bestY) { bestY = sy; bestT = t; }
    }
    return bestT < 0 ? GROUND.none : (_rampT = bestT, bestY);
  }
  let _rampT = -1;

  function groundAt(x, z, y) {
    const r2 = x * x + z * z;
    if (r2 > h.footprintRadius * h.footprintRadius) return GROUND.none;
    const ceiling = (y === undefined ? GROUND.top : y) + GROUND.stepGrace;
    let best = GROUND.none;
    if (h.lowerFloorY <= ceiling) best = h.lowerFloorY;
    const r = Math.sqrt(r2);
    if (h.deckY <= ceiling && h.deckY > best && helixDeckPresent(h, x, z)) best = h.deckY;
    if (r >= h.rampInnerR && r <= h.rampOuterR) {
      const ry = rampCandidate(x, z, ceiling);
      if (ry > best) best = ry;
    }
    return best;
  }

  function surfaceAt(x, z, y, out = _scratch) {
    const r2 = x * x + z * z;
    if (r2 > h.footprintRadius * h.footprintRadius) return setSurface(out, GROUND.none, GROUND.kind.void, 0, 0, 1, 0, -1);
    const ceiling = (y === undefined ? GROUND.top : y) + GROUND.stepGrace;
    const r = Math.sqrt(r2);

    let best = GROUND.none, kind = GROUND.kind.void, tier = h.tierFloor, t = -1;
    if (h.lowerFloorY <= ceiling) { best = h.lowerFloorY; kind = GROUND.kind.floor; tier = h.tierFloor; }
    if (h.deckY <= ceiling && h.deckY > best && helixDeckPresent(h, x, z)) {
      best = h.deckY; kind = GROUND.kind.deck; tier = h.tierDeck; t = -1;
    }
    if (r >= h.rampInnerR && r <= h.rampOuterR) {
      const ry = rampCandidate(x, z, ceiling);
      if (ry > best) { best = ry; kind = GROUND.kind.ramp; tier = h.tierRamp; t = _rampT; }
    }
    if (best === GROUND.none) return setSurface(out, GROUND.none, GROUND.kind.void, 0, 0, 1, 0, -1);
    if (kind !== GROUND.kind.ramp) return setSurface(out, best, kind, tier, 0, 1, 0, -1);

    // Helicoid normal, analytic: with y independent of radius, the surface is
    // S(r,a) = (r cos a, y0 + rise*a, r sin a) and n = (rise*sin a, r, -rise*cos a).
    const a = Math.atan2(z, x);
    const inv = 1 / Math.sqrt(rise * rise + r2);
    return setSurface(out, best, kind, tier, rise * Math.sin(a) * inv, r * inv, -rise * Math.cos(a) * inv, t);
  }

  /** Highest analytic surface strictly inside [lo, hi] — the swept support test. */
  function highestBetween(x, z, lo, hi) {
    const r2 = x * x + z * z;
    if (r2 > h.footprintRadius * h.footprintRadius) return GROUND.none;
    const r = Math.sqrt(r2);
    let best = GROUND.none;
    if (h.lowerFloorY >= lo && h.lowerFloorY <= hi) best = h.lowerFloorY;
    if (h.deckY >= lo && h.deckY <= hi && h.deckY > best && helixDeckPresent(h, x, z)) best = h.deckY;
    if (r >= h.rampInnerR && r <= h.rampOuterR) {
      let phase = (Math.atan2(z, x) - h.startAngle) % TAU;
      if (phase < 0) phase += TAU;
      for (let k = 0; k <= turnsToScan; k++) {
        const a = phase + TAU * k;
        if (a > sweep + GROUND.eps) break;
        const sy = helixRampY(h, a / sweep);
        if (sy >= lo && sy <= hi && sy > best) best = sy;
      }
    }
    return best;
  }

  /** Lowest solid underside strictly above `y`. Head clearance under the deck. */
  function ceilingAt(x, z, y) {
    const r2 = x * x + z * z;
    if (r2 > h.footprintRadius * h.footprintRadius) return GROUND.top;
    const r = Math.sqrt(r2);
    let best = GROUND.top;
    if (helixDeckPresent(h, x, z)) {
      const under = h.deckY - h.thickness;
      if (under > y && under < best) best = under;
    }
    if (r >= h.rampInnerR && r <= h.rampOuterR) {
      let phase = (Math.atan2(z, x) - h.startAngle) % TAU;
      if (phase < 0) phase += TAU;
      for (let k = 0; k <= turnsToScan; k++) {
        const a = phase + TAU * k;
        if (a > sweep + GROUND.eps) break;
        const under = helixRampY(h, a / sweep) - h.thickness;
        if (under > y && under < best) best = under;
      }
    }
    return best;
  }

  const inBounds = (x, z) => x * x + z * z <= h.footprintRadius * h.footprintRadius;

  return Object.freeze({
    id: spec.id || 'helix', shape: 'helix', helix: h, spec,
    groundAt, surfaceAt, highestBetween, ceilingAt, inBounds,
    tierMax: h.tierDeck,
    bounds: Object.freeze({
      minX: -h.footprintRadius, maxX: h.footprintRadius,
      minZ: -h.footprintRadius, maxZ: h.footprintRadius,
      minY: h.lowerFloorY, maxY: h.deckY + h.deckLift,
    }),
  });
}

// ---------------------------------------------------------------------------
// ROOM GROUND — a floor plus axis-aligned platforms plus linear ramps. Enough
// for the greybox, for a mezzanine, and for an authored incline; a chamber that
// needs more than this passes its own evaluator through `createGround`.
// ---------------------------------------------------------------------------
function makeRoomGround(spec) {
  const platforms = spec.platforms || [];
  const ramps = spec.ramps || [];
  const disc = spec.shape === 'disc';
  const radius = spec.radius || 0;
  const halfX = spec.halfX || 0, halfZ = spec.halfZ || 0;
  const floorTier = spec.tier || 0;
  // A missing floorY is a NaN that propagates into every consumer's height and
  // never names itself. Fail here instead, where the spec is.
  const floorY = spec.floorY;
  if (!Number.isFinite(floorY)) throw new Error(`createGround("${spec.id}"): floorY must be a finite number, got ${floorY}`);
  if (!disc && !(halfX > 0 && halfZ > 0)) throw new Error(`createGround("${spec.id}"): a rect room needs halfX and halfZ`);
  if (disc && !(radius > 0)) throw new Error(`createGround("${spec.id}"): a disc room needs a radius`);

  // Precomputed per-ramp basis, so the query does no per-call setup.
  const rampData = ramps.map(rp => {
    const dx = rp.bx - rp.ax, dz = rp.bz - rp.az;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const ux = dx / len, uz = dz / len;
    const k = (rp.by - rp.ay) / len;            // rise per metre along the ramp
    const inv = 1 / Math.sqrt(1 + k * k);
    return {
      ax: rp.ax, az: rp.az, ay: rp.ay, by: rp.by, ux, uz, len, halfW: rp.halfW, k,
      tier: rp.tier || 0, nx: -ux * k * inv, ny: inv, nz: -uz * k * inv,
    };
  });

  const inFootprint = disc
    ? (x, z) => x * x + z * z <= radius * radius
    : (x, z) => x >= -halfX && x <= halfX && z >= -halfZ && z <= halfZ;

  function platformY(x, z, i) {
    const p = platforms[i];
    if (x < p.x - p.hx || x > p.x + p.hx || z < p.z - p.hz || z > p.z + p.hz) return GROUND.none;
    return p.y;
  }

  function rampY(x, z, i) {
    const rp = rampData[i];
    const dx = x - rp.ax, dz = z - rp.az;
    const u = dx * rp.ux + dz * rp.uz;
    if (u < 0 || u > rp.len) return GROUND.none;
    const v = dx * -rp.uz + dz * rp.ux;
    if (v < -rp.halfW || v > rp.halfW) return GROUND.none;
    return rp.ay + rp.k * u;
  }

  function groundAt(x, z, y) {
    if (!inFootprint(x, z)) return GROUND.none;
    const ceiling = (y === undefined ? GROUND.top : y) + GROUND.stepGrace;
    let best = floorY <= ceiling ? floorY : GROUND.none;
    for (let i = 0; i < platforms.length; i++) {
      const py = platformY(x, z, i);
      if (py > best && py <= ceiling) best = py;
    }
    for (let i = 0; i < rampData.length; i++) {
      const ry = rampY(x, z, i);
      if (ry > best && ry <= ceiling) best = ry;
    }
    return best;
  }

  function surfaceAt(x, z, y, out = _scratch) {
    if (!inFootprint(x, z)) return setSurface(out, GROUND.none, GROUND.kind.void, 0, 0, 1, 0, -1);
    const ceiling = (y === undefined ? GROUND.top : y) + GROUND.stepGrace;
    let best = GROUND.none, kind = GROUND.kind.void, tier = floorTier, hit = -1, isRamp = false;
    if (floorY <= ceiling) { best = floorY; kind = GROUND.kind.floor; }
    for (let i = 0; i < platforms.length; i++) {
      const py = platformY(x, z, i);
      if (py > best && py <= ceiling) { best = py; kind = GROUND.kind.platform; tier = platforms[i].tier || 0; isRamp = false; }
    }
    for (let i = 0; i < rampData.length; i++) {
      const ry = rampY(x, z, i);
      if (ry > best && ry <= ceiling) { best = ry; kind = GROUND.kind.ramp; tier = rampData[i].tier; hit = i; isRamp = true; }
    }
    if (best === GROUND.none) return setSurface(out, GROUND.none, GROUND.kind.void, 0, 0, 1, 0, -1);
    if (!isRamp) return setSurface(out, best, kind, tier, 0, 1, 0, -1);
    const rp = rampData[hit];
    return setSurface(out, best, kind, tier, rp.nx, rp.ny, rp.nz, -1);
  }

  function highestBetween(x, z, lo, hi) {
    if (!inFootprint(x, z)) return GROUND.none;
    let best = GROUND.none;
    if (floorY >= lo && floorY <= hi) best = floorY;
    for (let i = 0; i < platforms.length; i++) {
      const py = platformY(x, z, i);
      if (py > best && py >= lo && py <= hi) best = py;
    }
    for (let i = 0; i < rampData.length; i++) {
      const ry = rampY(x, z, i);
      if (ry > best && ry >= lo && ry <= hi) best = ry;
    }
    return best;
  }

  function ceilingAt(x, z, y) {
    let best = GROUND.top;
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (x < p.x - p.hx || x > p.x + p.hx || z < p.z - p.hz || z > p.z + p.hz) continue;
      const under = p.y - (p.thickness || GROUND.platformThickness);
      if (under > y && under < best) best = under;
    }
    return best;
  }

  let tierMax = floorTier;
  for (const p of platforms) tierMax = Math.max(tierMax, p.tier || 0);
  for (const rp of rampData) tierMax = Math.max(tierMax, rp.tier);

  return Object.freeze({
    id: spec.id || 'room', shape: spec.shape || 'rect', helix: null, spec,
    groundAt, surfaceAt, highestBetween, ceilingAt, inFootprint,
    inBounds: inFootprint, tierMax,
    bounds: Object.freeze(disc
      ? { minX: -radius, maxX: radius, minZ: -radius, maxZ: radius, minY: floorY, maxY: floorY + (spec.wallHeight || 0) }
      : { minX: -halfX, maxX: halfX, minZ: -halfZ, maxZ: halfZ, minY: floorY, maxY: floorY + (spec.wallHeight || 0) }),
  });
}

// ---------------------------------------------------------------------------
// REGISTRY. Chambers register their own ground spec at build; W2 ships only the
// two it owns outright (the greybox M0 needs, and the helix, whose rail belongs
// to the collider). `groundFor` throws rather than silently handing back a flat
// plane — a chamber quietly running on the wrong ground is exactly the class of
// failure CONTRACT §2 exists to prevent.
// ---------------------------------------------------------------------------
const registry = new Map();

export function createGround(spec) {
  if (typeof spec === 'string') return groundFor(spec);
  if (spec && typeof spec.groundAt === 'function') return spec;      // already an evaluator
  if (!spec) throw new Error('createGround: no spec');
  return spec.shape === 'helix' ? makeHelixGround(spec) : makeRoomGround(spec);
}

export function registerGround(id, spec) {
  registry.set(id, createGround(spec));
  return registry.get(id);
}

export function groundFor(id) {
  const g = registry.get(id);
  if (!g) throw new Error(`groundFor("${id}"): no ground registered. Chambers must registerGround() at build.`);
  return g;
}

export const hasGround = id => registry.has(id);
export const groundIds = () => [...registry.keys()];

registerGround('greybox', GROUND.greybox);
registerGround('helix', { id: 'helix', shape: 'helix', helix: GROUND.helix });

/**
 * The lift rule, in one place so nobody re-derives it wrong: a body querying its
 * OWN support lifts 0.05; only the player lifts 0.75. DESIGN is explicit that
 * applying the player lift to a walker descending the helix makes it think it is
 * standing on the deck ten metres above its feet.
 */
export const groundUnderActor = (g, x, z, y, isPlayer) =>
  g.groundAt(x, z, y + (isPlayer ? GROUND.playerLift : GROUND.selfLift));

export default GROUND;
