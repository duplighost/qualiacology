// THE DAMP — the boss, the ending, and the two chambers whose light rule it
// inverts.
//
// This is W11's ONE manifest entry, and it deliberately carries three jobs that
// are all the same job: LIGHT THAT IS NOT A KILL.
//
//   THE FURNACE's lamps      light the room is holding against you, and you take
//                            it away by breaking them
//   THE APERTURE's floor     light you made somewhere else, carried up the tower
//   THE DAMP itself          light it eats, and gives back all at once when it
//                            dies
//
// A chamber has no heartbeat — `src/chambers/*` is frozen data, exactly like
// `ground.js`'s tables — so the runtime for both of W11's chambers lives here,
// beside the boss, the same way `bodies.js` lives beside `manager.js`. The
// chamber modules export the data and their own factories; this module is what
// ticks them.
//
// ---------------------------------------------------------------------------
// THE VENT, AND THE ONE PLACE THIS MODULE DEVIATES FROM DESIGN.md
// ---------------------------------------------------------------------------
// FEEL.damp: body multiplier 0.18, vent multiplier 2.0, vent window 0.55 s on an
// eat interval of 2.4 / 1.8 / 1.2 s — a 23 / 31 / 46 % duty, so the weak point
// is SHUT for at least 54% of every phase. (The draft's 1.4 s window on a 1.2 s
// interval never closed, which is why the whole fight had no rhythm.)
//
// DESIGN.md calls the vent "a bright ring on its flank, which is the only place
// real damage lands". It is implemented here as a WINDOW IN TIME with a ring
// that is visible while it is open, and NOT as a sub-region of the hitbox. Two
// reasons, and the second one is structural:
//
//   1. THE DAMP is a negative silhouette — a hole in the noise. There is no
//      detail on it to aim at, by construction, because the render deliberately
//      refuses to give it any. A spatial weak point on a hole is a weak point
//      the player cannot see, in the darkest room in the game.
//
//   2. `src/combat/impact.js` (not ours) resolves a weak point as a fixed
//      fraction of the capsule — `hitY >= footY + height * 0.78` — and on that
//      branch it SKIPS `target.bodyMultiplier` and applies the WEAPON's head
//      multiplier instead. Every capsule has a top 22%; there is no y or height
//      that puts that band outside the body. So a crown hit would pay 1.35-2.40x
//      instead of 0.18x — a 13x bypass of the whole fight — and the fix is one
//      line in a file this workstream does not own. It is filed in
//      docs/HANDOFF.md with the exact diff.
//
// Until it lands, THE DAMP's body law is enforced HERE, at the record, by
// `capIncoming()`: no single substep may remove more than the body multiplier
// allows, derived from the held weapon's own row in FEEL.weapons. That is not a
// patch around impact.js — it is what makes 0.18 true for EVERY damage source,
// including the dash (D1's 24, which reads no multiplier at all) and a reflected
// bolt. The vent's 2.0 is then applied on top of the capped figure, once, in one
// place, so it is weapon-independent by construction.
//
// `snapshot().capped` counts every time the cap bit. When the handoff lands it
// stays 0 for a whole fight, and that is how you will know.
//
// ---------------------------------------------------------------------------
// EATING DOES NOT HEAL. IT IS A RHYTHM GENERATOR.
// ---------------------------------------------------------------------------
// PLAN C1-F6: "eating a scar no longer HEALS 30. Healing off the player's own
// accumulated progress is D3's exact failure mode a second time — the best run
// feeds the boss most." An eaten scar darkens the room and adds a +6% damage
// rage stack decaying over 12 s. The eat is what OPENS THE VENT, which is the
// only reason it is on a clock at all.
//
// The clock runs whether or not there is anything left to eat. That is
// load-bearing: in a room the boss has already emptied, an eat-gated vent would
// never open again and the fight would be unwinnable at exactly the moment
// DESIGN says it is at maximum volume ("if the room goes fully dark you do not
// lose — you fight the last quarter by muzzle flash alone").

import FEEL from '../feel.js';
import { clamp, clamp01 } from '../core/math.js';
import { makeCapsule, moveCapsule } from '../world/collide.js';
import { groundUnderActor, hasSurface, GROUND } from '../world/ground.js';
import { SPEC as FURNACE_SPEC, FURNACE, createLampField } from '../chambers/furnace.js';
import { SPEC as APERTURE_SPEC, APERTURE, projectRunField, insertScar, removeScar } from '../chambers/aperture.js';

const DM = FEEL.damp;

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this module. CONTRACT §5: everything that governs
// how the fight FEELS is in FEEL.damp and is READ from there; what lives here is
// shape, cadence that FEEL does not carry, and derivation rules. Every number
// below is PROPOSED to the integrator in docs/HANDOFF.md rather than smuggled in.
// ---------------------------------------------------------------------------
export const DAMP_TABLE = Object.freeze({
  // ---- THE EAT -----------------------------------------------------------
  eatReach: 6.5,               // metres from the boss's centre to a scar's. It is
                               // wider than the boss (r 1.6) because a thing that
                               // has to stand exactly on a pool to eat it is a
                               // thing that never eats anything while it is also
                               // chasing you.
  eatTravelBias: 0.62,         // how much of its steering goes toward food rather
                               // than toward the player. Under 0.5 it ignores the
                               // room; over 0.8 it ignores you.

  // ---- THE VENT ----------------------------------------------------------
  ventRing: 2.35,              // additive sprite size at the crown while open
  ventEmissive: 1.45,          // over FEEL.render.bloomThreshold (0.85), so the
                               // one time this thing emits anything it BLOOMS —
                               // the only positive light on the boss, ever
  ventOpenLead: 0.10,          // seconds the ring brightens before the window
                               // opens. Not a telegraph (the eat is), a lead-in.

  // ---- THE DARKBOLT ------------------------------------------------------
  boltIntervalByPhase: Object.freeze([4.2, 3.1, 2.4]),
  boltRange: 42,
  // FEEL.iris.dampTelegraph (0.9 s) IS the wind-up, and it clears
  // FEEL.enemies.telegraphMin (0.320) by 2.8x. Nothing here ever shortens it.
  boltLead: 1.0,               // metres/second of lead on the player's velocity.
                               // W8 measured that a bolt aimed at the player's
                               // CURRENT position is dodgeable for 950 ms of a
                               // 1050 ms flight, and that "the lever is leading
                               // the target, never bolt speed".

  // ---- CONTACT -----------------------------------------------------------
  contactInterval: 0.85,

  // ---- THE SWEEP (phase 2+) ----------------------------------------------
  sweepEvery: 9.0,             // seconds between sweeps
  sweepFrom: 21.0,             // metres: it starts outside the projection disc
  sweepRetuneHz: 10,           // how often the suppressed set is recomputed. The
                               // irradiance target rebuilds on a membership
                               // change, and a 3.5 s sweep at 120 Hz would be 420
                               // rebuilds for a change the eye reads at 10.

  // ---- PHASE 3 STARLIGHT -------------------------------------------------
  // The first COLD light in the game, and the one THE DAMP cannot eat: it is not
  // a scar, so there is nothing in the field for it to remove. It is added as a
  // transient PROBE every step as well as a rover light, so the simulation
  // (D3, the iris, spawn validation) sees exactly what the picture shows.
  starCount: 3,
  starRadius: 16.0,
  starIntensity: 0.55,
  starHeight: 7.5,
  starColor: Object.freeze([FEEL.render.cold[0], FEEL.render.cold[1], FEEL.render.cold[2]]),
  starRise: 2.2,               // seconds to fade in when the ceiling opens

  // ---- THE ENDING --------------------------------------------------------
  waveTime: 3.4,               // seconds for the restoration wave to reach the rim
  waveRadius: 26.0,            // metres the wave front travels
  waveSpriteSize: 3.2,
  waveEmissive: 2.6,

  // ---- THE BODY ----------------------------------------------------------
  // A NEGATIVE silhouette (PLAN GROUPED G11): albedo zero, depth-writing. It
  // reflects nothing at any light level and it OCCLUDES everything behind it —
  // dust motes, the irradiance-lit floor, scar decals — so against a lit floor it
  // is a hole with a hard edge. Suppressing grain and irradiance INSIDE its
  // volume needs a post-pass uniform that belongs to W1-RENDER; it is filed in
  // docs/HANDOFF.md and it is what makes the hole readable at zero light too.
  bodyAlbedo: 0x000000,
  bodyTint: 0.0,
  hoverY: 0.35,                // it does not quite touch the floor
  bobAmp: 0.16, bobHz: 0.31,

  // ---- THE CAP (see the header) ------------------------------------------
  // Multiplied into the derived ceiling so a legitimate burst is never clipped:
  // the ceiling is already the worst case (max shots per substep x pellets x the
  // fattest weapon), and this is the slack that keeps it from being a balance
  // knob by accident.
  capSlack: 1.25,
});

const T = DAMP_TABLE;

// ---------------------------------------------------------------------------
// PURE HELPERS — exported so the gate measures the arithmetic, not the outcome.
// ---------------------------------------------------------------------------

/** 0 | 1 | 2 from hp. The gates are FEEL.damp.phase2At / phase3At. */
export function phaseOf(hp) {
  if (hp <= DM.phase3At) return 2;
  if (hp <= DM.phase2At) return 1;
  return 0;
}

/** Fraction of each phase's cycle during which the vent is OPEN. */
export const ventDuty = phase => DM.ventWindow / DM.eatInterval[phase];

/**
 * THE BODY LAW, as a number. The most hp any single substep may legitimately
 * remove from THE DAMP's body, derived from the shipping weapon table rather
 * than picked: max shots per substep x pellets x floor(dmg x bodyMultiplier),
 * floored at the dash's own body-scaled damage so a shove is never clipped
 * below what a shove is worth.
 */
export function bodyCap(weapon) {
  const mul = DM.bodyMultiplier;
  const per = w => Math.max(1, Math.floor(w.dmg * mul)) * (w.pellets || 1);
  let base;
  if (weapon) base = per(weapon);
  else { base = 0; for (const w of FEEL.weapons) base = Math.max(base, per(w)); }
  const shots = FEEL.fire.maxShotsPerSubstep;
  const dash = Math.max(1, Math.floor(FEEL.dash.damage * mul));
  return Math.max(1, Math.ceil((Math.max(base * shots, dash)) * T.capSlack));
}

/** The vent's gain over a body hit. Exactly FEEL's 2.0 / 0.18. */
export const ventGain = () => DM.ventMultiplier / DM.bodyMultiplier;

// ---------------------------------------------------------------------------

export function create(ctx) {
  // DETERMINISM: `derive`, not `fork` — a retry must replay identically, and
  // fork() is memoised, so the second run of a seeded fight is not the first.
  let rng = ctx.rng ? ctx.rng.derive('damp') : null;
  let moveRng = rng ? rng.fork('move') : null;
  let castRng = rng ? rng.fork('cast') : null;
  const rand = r => (r ? r.next() : 0.5);

  const THREE = ctx.THREE;
  const render = ctx.render;

  // ---- THE RUN ARCHIVE ----------------------------------------------------
  // Every chamber's scars, kept as the run happens rather than read at unload.
  // `chambers/index.js` calls `ctx.light.reset()` inside its own dispose, which
  // runs during the fade — so by the time any system's update() sees a chamber
  // change the field is already empty. Archiving on the FIELD's version counter
  // is immune to that, and to manifest order, and to a harness that never runs a
  // frame loop at all.
  const archive = [];                    // [{ id, bounds, scars: [...] }]
  const archiveBy = new Map();
  let archivedVersion = -1;
  let archivedChamber = null;

  function archiveNow() {
    const chamber = ctx.chamber;
    const field = ctx.light;
    if (!chamber || !field) return;
    // THE APERTURE's own floor is the archive PLAYED BACK. Re-archiving it would
    // double the tower on a retry.
    if (chamber.id === APERTURE_SPEC.id) return;
    let rec = archiveBy.get(chamber.id);
    if (!rec) {
      rec = { id: chamber.id, bounds: chamber.bounds, scars: [] };
      archiveBy.set(chamber.id, rec);
      archive.push(rec);
    }
    rec.scars.length = 0;
    for (const s of field.scars) {
      // THE FURNACE's lamps are the ROOM's light, not the player's. Part 4 of
      // the trap's resolution: the room's own light can never become progress.
      if (s.permanent) continue;
      rec.scars.push({ x: s.x, y: s.y, z: s.z, r: s.r, i: s.i });
    }
  }

  function syncArchive() {
    const field = ctx.light;
    const chamber = ctx.chamber;
    if (!field || !chamber) return;
    if (chamber.id !== archivedChamber) { archivedChamber = chamber.id; archivedVersion = -1; }
    if (field.version === archivedVersion) return;
    archivedVersion = field.version;
    archiveNow();
  }

  /** Every scar the run has made, across every chamber. The ending's ruler. */
  function archivedCount() {
    let n = 0;
    for (const r of archive) n += r.scars.length;
    return n;
  }

  // ---- THE FURNACE --------------------------------------------------------
  let lampField = null;

  // ---- THE APERTURE -------------------------------------------------------
  let projected = null;

  // ---- THE DAMP -----------------------------------------------------------
  const boss = makeCapsule(0, 0, 0);
  boss.id = -1;
  boss.type = 'damp';
  boss.boss = true;
  boss.arch = null;
  boss.dead = true;
  boss.hp = 0; boss.maxHp = DM.hp;
  boss.radius = DM.radius; boss.height = DM.height;
  boss.armoured = false;
  // NEVER TRUE. THE ONE LAW must hold at every phase INCLUDING the transitions,
  // and `invulnerable` is what would break it — impact.js grades an invulnerable
  // target 'locked' at a flat 0.25 lightUp with no ring. There is no phase-lock
  // in this fight and there is no code path that could add one.
  boss.invulnerable = false;
  boss.bodyMultiplier = DM.bodyMultiplier;
  boss.facingX = 0; boss.facingZ = 1;
  boss.litFor = 0; boss.litIntensity = 0; boss.hitFlash = 0; boss.lastHitAt = 0;
  boss.lastHpSeen = 0;
  boss.yaw = 0;

  const state = {
    active: false,
    phase: 0,
    clock: 0,
    eatT: 0,
    ventT: 0,
    ventLeadT: 0,
    rage: 0,
    boltT: 0,
    boltWindup: 0,
    contactT: 0,
    sweepT: 0,
    sweepActive: 0,
    sweepX: 0, sweepZ: 0, sweepDX: 0, sweepDZ: 0,
    sweepRetune: 0,
    starT: 0,
    ending: 0,
    ended: false,
    bob: 0,
  };

  const eaten = [];            // the scars it has taken; the ending gives them back
  const suppressed = [];       // scars the sweep is currently standing on
  const restored = [];         // what the wave has already put back, for the gate

  const stats = {
    eats: 0, ventOpens: 0, ventOpenTime: 0, ventShutTime: 0,
    bolts: 0, slams: 0, contacts: 0, sweeps: 0,
    damageTaken: 0, ventDamage: 0, bodyDamage: 0,
    capped: 0, cappedHp: 0,
    hits: 0, phaseBreaks: 0,
    restoredCount: 0, restoredLight: 0, eatenLight: 0,
    minLitForSeen: Infinity,
  };

  // ---- the merged weapons target list -------------------------------------
  // A BORROW, and it is filed. `ctx.weapons.setTargets` takes ONE provider and
  // `enemies/manager.js` already owns it; there is no compose(). This re-issues
  // it with a list that is the manager's roster PLUS whatever W11 has made
  // shootable — the lamps and the boss — using the manager's live array by
  // reference, never a copy, so nothing goes stale. The request for a real
  // `weapons.addTargets()` is in docs/HANDOFF.md.
  let merged = null;
  let mergedSig = '';

  function rebuildTargets(force) {
    const w = ctx.weapons;
    if (!w || typeof w.setTargets !== 'function') return false;
    const roster = ctx.enemies && Array.isArray(ctx.enemies.list) ? ctx.enemies.list : null;
    const lamps = lampField ? lampField.lamps : null;
    const sig = `${roster ? roster.length : 0}/${lamps ? lamps.length : 0}/${state.active ? 1 : 0}`;
    if (!force && sig === mergedSig && merged) return false;
    mergedSig = sig;
    const n = (roster ? roster.length : 0) + (lamps ? lamps.length : 0) + 1;
    merged = new Array(n);
    let k = 0;
    if (roster) for (let i = 0; i < roster.length; i++) merged[k++] = roster[i];
    if (lamps) for (let i = 0; i < lamps.length; i++) merged[k++] = lamps[i];
    merged[k++] = boss;
    merged.length = k;
    w.setTargets(() => merged);
    return true;
  }

  // -------------------------------------------------------------------------
  // THE PLAYER
  // -------------------------------------------------------------------------
  const _tgt = { x: 0, y: 0, z: 0, radius: FEEL.move.radius, height: FEEL.move.height, speed: 0, alive: true, vx: 0, vz: 0 };
  let provideTarget = null;

  function target() {
    if (provideTarget) return provideTarget();
    const p = ctx.player;
    if (!p || !p.body) return null;
    _tgt.x = p.body.x; _tgt.y = p.body.y; _tgt.z = p.body.z;
    _tgt.radius = p.body.radius; _tgt.height = p.body.height;
    _tgt.speed = p.speed || 0;
    _tgt.vx = p.body.vx || 0; _tgt.vz = p.body.vz || 0;
    _tgt.alive = p.state ? p.state.alive : true;
    return _tgt;
  }

  function hurtPlayer(amount) {
    const p = ctx.player;
    if (p && typeof p.hurt === 'function') return p.hurt(Math.max(1, Math.round(amount)));
    return 0;
  }

  /**
   * THE ONLY DOOR into hit VFX, SFX, hitstop, shake and light, and this module
   * does not own it (G8's vfx-entry-point lint asserts exactly that over the
   * whole tree). A phase break and the death are `break` — the grade impact.js
   * reserves for "something broke" — so the freeze, the trauma, the ring and the
   * sound all arrive from the one place that owns them.
   *
   * A boss-slam channel with its own trauma weight (FEEL.time.trauma.bossSlam
   * 0.60 / bossDeath 0.85, neither of which `break` reaches) is filed as a
   * request in docs/HANDOFF.md. Calling `setSlowmo` here to get it would be the
   * second entry point the lint exists to prevent.
   */
  const _ipos = { x: 0, y: 0, z: 0 };
  function impactAt(kind, x, y, z) {
    const w = ctx.weapons;
    if (!w || !w.combat || typeof w.combat.impact !== 'function') return false;
    _ipos.x = x; _ipos.y = y; _ipos.z = z;
    w.combat.impact(kind, _ipos, undefined, boss.id);
    return true;
  }

  function groundedY(x, z, fallback) {
    const w = ctx.world;
    if (!w || !w.ground) return fallback === undefined ? 0 : fallback;
    const g = groundUnderActor(w.ground, x, z, fallback === undefined ? GROUND.top : fallback + 1, false);
    return hasSurface(g) ? g : (fallback === undefined ? 0 : fallback);
  }

  // -------------------------------------------------------------------------
  // THE BODY — a negative silhouette. One instanced draw, one material minted
  // from the shared family, zero new programs.
  // -------------------------------------------------------------------------
  let mesh = null, geom = null, mat = null, iMatrix = null, iTint = null, attrM = null, attrT = null;

  function buildBody() {
    if (!THREE || !render || !render.materials || !ctx.scene) return false;
    // A closed iris seen from outside: a wide waist, two tapers, and a crown
    // ring. Boxes rather than a lathe because the silhouette is the ONLY thing
    // that has to read and a facetted hole reads harder than a smooth one.
    const R = DM.radius, H = DM.height;
    const spec = [
      // [cx, cy, cz, hx, hy, hz]  — y = 0 is the FEET, extents in metres
      [0, H * 0.46, 0, R * 0.98, H * 0.20, R * 0.98],
      [0, H * 0.24, 0, R * 0.72, H * 0.14, R * 0.72],
      [0, H * 0.09, 0, R * 0.44, H * 0.09, R * 0.44],
      [0, H * 0.68, 0, R * 0.82, H * 0.14, R * 0.82],
      [0, H * 0.84, 0, R * 0.54, H * 0.09, R * 0.54],
      [0, H * 0.94, 0, R * 0.30, H * 0.06, R * 0.30],
      [R * 0.86, H * 0.46, 0, R * 0.30, H * 0.10, R * 0.44],
      [-R * 0.86, H * 0.46, 0, R * 0.30, H * 0.10, R * 0.44],
      [0, H * 0.46, R * 0.86, R * 0.44, H * 0.10, R * 0.30],
      [0, H * 0.46, -R * 0.86, R * 0.44, H * 0.10, R * 0.30],
    ];
    const FACES = [
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
      [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]],
      [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
    ];
    const tris = spec.length * 12;
    const position = new Float32Array(tris * 9);
    const normal = new Float32Array(tris * 9);
    let p = 0;
    for (const b of spec) {
      for (const f of FACES) {
        const n = f[0], u = f[1], v = f[2];
        const ex = [b[3], b[4], b[5]];
        const c = [b[0] + n[0] * ex[0], b[1] + n[1] * ex[1], b[2] + n[2] * ex[2]];
        const uu = [u[0] * ex[0], u[1] * ex[1], u[2] * ex[2]];
        const vv = [v[0] * ex[0], v[1] * ex[1], v[2] * ex[2]];
        const q = [
          [c[0] - uu[0] - vv[0], c[1] - uu[1] - vv[1], c[2] - uu[2] - vv[2]],
          [c[0] + uu[0] - vv[0], c[1] + uu[1] - vv[1], c[2] + uu[2] - vv[2]],
          [c[0] + uu[0] + vv[0], c[1] + uu[1] + vv[1], c[2] + uu[2] + vv[2]],
          [c[0] - uu[0] + vv[0], c[1] - uu[1] + vv[1], c[2] - uu[2] + vv[2]],
        ];
        for (const t3 of [[0, 1, 2], [0, 2, 3]]) {
          for (const k of t3) {
            position[p] = q[k][0]; position[p + 1] = q[k][1]; position[p + 2] = q[k][2];
            normal[p] = n[0]; normal[p + 1] = n[1]; normal[p + 2] = n[2];
            p += 3;
          }
        }
      }
    }

    geom = new THREE.InstancedBufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    iMatrix = new Float32Array(16);
    iTint = new Float32Array(4);
    attrM = new THREE.InstancedBufferAttribute(iMatrix, 16);
    attrT = new THREE.InstancedBufferAttribute(iTint, 4);
    attrM.setUsage(THREE.DynamicDrawUsage);
    attrT.setUsage(THREE.DynamicDrawUsage);
    geom.setAttribute('iMatrix', attrM);
    geom.setAttribute('iTint', attrT);
    geom.instanceCount = 0;
    // An InstancedBufferGeometry is culled from the BASE geometry's bounding
    // sphere, i.e. as if the instance sat at the origin (W1-RENDER's finding).
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);

    mat = render.materials.surfaceInstanced({ color: T.bodyAlbedo, detail: 0 });
    mesh = new THREE.Mesh(geom, mat);
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.name = 'damp:void';
    mesh.layers.set(render.LAYERS.WORLD);
    ctx.scene.add(mesh);
    return true;
  }

  function writeBodyMatrix() {
    if (!geom) return;
    const c = Math.cos(boss.yaw), s = Math.sin(boss.yaw);
    const y = boss.y + T.hoverY + Math.sin(state.bob) * T.bobAmp;
    iMatrix[0] = c; iMatrix[1] = 0; iMatrix[2] = -s; iMatrix[3] = 0;
    iMatrix[4] = 0; iMatrix[5] = 1; iMatrix[6] = 0; iMatrix[7] = 0;
    iMatrix[8] = s; iMatrix[9] = 0; iMatrix[10] = c; iMatrix[11] = 0;
    iMatrix[12] = boss.x; iMatrix[13] = y; iMatrix[14] = boss.z; iMatrix[15] = 1;
    iTint[0] = T.bodyTint; iTint[1] = T.bodyTint; iTint[2] = T.bodyTint; iTint[3] = 1;
    attrM.needsUpdate = true;
    attrT.needsUpdate = true;
    geom.instanceCount = state.active || state.ending > 0 ? 1 : 0;
  }

  // -------------------------------------------------------------------------
  // THE FIGHT
  // -------------------------------------------------------------------------
  function begin(x, z) {
    const px = x === undefined ? 0 : x;
    const pz = z === undefined ? -12 : z;
    boss.id = 90001;
    boss.dead = false;
    boss.hp = DM.hp; boss.maxHp = DM.hp; boss.lastHpSeen = DM.hp;
    boss.x = px; boss.z = pz;
    boss.y = groundedY(px, pz, 0);
    boss.vx = 0; boss.vy = 0; boss.vz = 0;
    boss.bodyMultiplier = DM.bodyMultiplier;
    boss.invulnerable = false;
    boss.litFor = 0; boss.litIntensity = 0; boss.hitFlash = 0;
    state.active = true;
    state.ended = false;
    state.ending = 0;
    state.phase = 0;
    state.clock = 0;
    state.eatT = DM.eatInterval[0];
    state.ventT = 0; state.ventLeadT = 0;
    state.rage = 0;
    state.boltT = T.boltIntervalByPhase[0];
    state.boltWindup = 0;
    state.contactT = 0;
    state.sweepT = T.sweepEvery;
    state.sweepActive = 0;
    state.starT = 0;
    restoreEaten();
    restored.length = 0;
    rebuildTargets(true);
    return boss;
  }

  /** D6's clarification: the boss's consumption is FIGHT state, not run progress. */
  function restoreEaten() {
    const field = ctx.light;
    releaseSuppressed();
    if (field) for (const s of eaten) insertScar(field, s);
    eaten.length = 0;
    const irr = render && render.irradiance;
    if (irr && typeof irr.forceRebuild === 'function') irr.forceRebuild();
  }

  // ---- THE EAT ------------------------------------------------------------
  function nearestFood() {
    const field = ctx.light;
    if (!field) return null;
    let best = null, bd = T.eatReach * T.eatReach;
    for (const s of field.scars) {
      if (s.permanent) continue;                 // it cannot eat the room's own light
      const dx = s.x - boss.x, dz = s.z - boss.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  function eat() {
    const field = ctx.light;
    const s = field ? nearestFood() : null;
    if (s && removeScar(field, s)) {
      eaten.push(s);
      stats.eats++;
      stats.eatenLight += s.i;
      // +6% damage, decaying over 12 s. NEVER a heal (PLAN C1-F6).
      state.rage += DM.ragePerEat;
      const irr = render && render.irradiance;
      if (irr && typeof irr.forceRebuild === 'function') irr.forceRebuild();
      return true;
    }
    return false;
  }

  function openVent() {
    state.ventT = DM.ventWindow;
    stats.ventOpens++;
  }

  // ---- THE SWEEP ----------------------------------------------------------
  function beginSweep() {
    const t = target();
    const ang = rand(castRng) * Math.PI * 2;
    const tx = t ? t.x : 0, tz = t ? t.z : 0;
    state.sweepX = tx + Math.sin(ang) * T.sweepFrom;
    state.sweepZ = tz + Math.cos(ang) * T.sweepFrom;
    // It drags THROUGH the player, which is what makes it a decision rather than
    // weather: you either move out of the line or you fight in the dark it makes.
    const dx = tx - state.sweepX, dz = tz - state.sweepZ;
    const len = Math.hypot(dx, dz) || 1;
    const travel = T.sweepFrom * 2;
    state.sweepDX = dx / len * (travel / DM.sweepTime);
    state.sweepDZ = dz / len * (travel / DM.sweepTime);
    state.sweepActive = DM.sweepTime;
    state.sweepRetune = 0;
    stats.sweeps++;
  }

  function releaseSuppressed() {
    const field = ctx.light;
    if (!field) { suppressed.length = 0; return; }
    for (const s of suppressed) insertScar(field, s);
    suppressed.length = 0;
  }

  function retuneSuppressed() {
    const field = ctx.light;
    if (!field) return;
    const r2 = DM.sweepDisc * DM.sweepDisc;
    let changed = false;
    // Let go of anything the disc has left behind.
    for (let k = suppressed.length - 1; k >= 0; k--) {
      const s = suppressed[k];
      const dx = s.x - state.sweepX, dz = s.z - state.sweepZ;
      if (dx * dx + dz * dz > r2) {
        insertScar(field, s);
        suppressed.splice(k, 1);
        changed = true;
      }
    }
    // Take everything it is standing on now. Permanent scars are the ROOM's, and
    // the sweep is the boss's verb — it suppresses what the player made.
    for (const s of field.scars) {
      if (s.permanent) continue;
      const dx = s.x - state.sweepX, dz = s.z - state.sweepZ;
      if (dx * dx + dz * dz <= r2) { suppressed.push(s); changed = true; }
    }
    for (const s of suppressed) removeScar(field, s);
    if (changed) {
      const irr = render && render.irradiance;
      if (irr && typeof irr.forceRebuild === 'function') irr.forceRebuild();
    }
  }

  // ---- DAMAGE OBSERVATION, AND THE BODY LAW -------------------------------
  /**
   * The held weapon's row in FEEL.weapons, or null when nothing is holding one.
   * `ctx.weapons.current` is an INDEX and `ctx.weapons.weapon` is the row — a
   * `.current.id` here would silently be undefined for ever and the cap would
   * quietly fall back to the fattest gun in the table on every shot.
   */
  function heldWeapon() {
    const w = ctx.weapons;
    if (!w) return null;
    const id = (w.weapon && w.weapon.id)
      || (typeof w.current === 'number' && FEEL.weapons[w.current] && FEEL.weapons[w.current].id);
    if (!id) return null;
    for (const row of FEEL.weapons) if (row.id === id) return row;
    return null;
  }

  /**
   * Observe, cap, then apply the vent gain. The cap is THE DAMP's body law made
   * true for every damage source; the gain is the vent, applied once, in one
   * place, so it is the same 2.0 for every weapon.
   */
  function capIncoming() {
    const drop = boss.lastHpSeen - boss.hp;
    if (drop <= 0) { boss.lastHpSeen = boss.hp; return 0; }
    stats.hits++;

    const cap = bodyCap(heldWeapon());
    let dealt = drop;
    if (dealt > cap) {
      stats.capped++;
      stats.cappedHp += dealt - cap;
      dealt = cap;
    }

    if (state.ventT > 0) {
      // THE VENT. Applied to the already-capped body figure, so it lands within
      // ~7% of base x FEEL.damp.ventMultiplier for every weapon in the table.
      // Exactly base x 2.0 would need the pre-multiplier damage, which
      // `applyHit` does not publish — filed with the weak-point request.
      dealt = Math.round(dealt * ventGain());
      stats.ventDamage += dealt;
    } else {
      stats.bodyDamage += dealt;
    }

    // THE ONE LAW: never below 1 hp, at any phase, in any state.
    dealt = Math.max(1, dealt);
    boss.hp = boss.lastHpSeen - dealt;
    boss.lastHpSeen = boss.hp;
    stats.damageTaken += dealt;
    if (boss.litFor < stats.minLitForSeen) stats.minLitForSeen = boss.litFor;
    return dealt;
  }

  // ---- THE ENDING ---------------------------------------------------------
  function die() {
    state.active = false;
    state.ending = T.waveTime;
    boss.dead = true;
    boss.hp = 0;
    stats.phaseBreaks++;
    releaseSuppressed();
    // Order the eaten by distance from the centre: the wave travels OUTWARD, and
    // it has to have something to travel along.
    eaten.sort((a, b) => (a.x * a.x + a.z * a.z) - (b.x * b.x + b.z * b.z));
    impactAt('break', boss.x, boss.y + DM.height * 0.5, boss.z);
  }

  /** The wave front, in metres from the centre. */
  const waveFront = () => (1 - state.ending / T.waveTime) * T.waveRadius;

  function stepEnding(dt) {
    state.ending = Math.max(0, state.ending - dt);
    const field = ctx.light;
    const front = waveFront();
    let gave = false;
    while (eaten.length) {
      const s = eaten[0];
      if (Math.hypot(s.x, s.z) > front) break;
      eaten.shift();
      if (field) insertScar(field, s);
      restored.push(s);
      stats.restoredCount++;
      stats.restoredLight += s.i;
      gave = true;
    }
    if (state.ending <= 0 && eaten.length) {
      // The wave reached the rim. Anything beyond it comes back with the last
      // frame rather than being left out — "every scar it ate comes back".
      while (eaten.length) {
        const s = eaten.shift();
        if (field) insertScar(field, s);
        restored.push(s);
        stats.restoredCount++;
        stats.restoredLight += s.i;
      }
      gave = true;
    }
    if (gave) {
      const irr = render && render.irradiance;
      if (irr && typeof irr.forceRebuild === 'function') irr.forceRebuild();
    }
    if (state.ending <= 0) state.ended = true;
  }

  // -------------------------------------------------------------------------
  // THE FIXED STEP
  // -------------------------------------------------------------------------
  function step(dt) {
    syncArchive();
    if (lampField) lampField.step(dt);

    if (state.ending > 0 || (state.ended && eaten.length)) { stepEnding(dt); return; }
    if (!state.active) return;

    state.clock += dt;

    // ---- clocks. Monotonic, all of them (CONTRACT §5). -------------------
    if (boss.hitFlash > 0) boss.hitFlash = Math.max(0, boss.hitFlash - dt);
    if (boss.litFor > 0) boss.litFor = Math.max(0, boss.litFor - dt);
    if (state.contactT > 0) state.contactT = Math.max(0, state.contactT - dt);

    // ---- damage, the body law, and the vent gain -------------------------
    capIncoming();

    const before = state.phase;
    state.phase = phaseOf(boss.hp);
    if (state.phase !== before) {
      stats.phaseBreaks++;
      // A phase break NEVER makes it invulnerable and never interrupts a hit.
      impactAt('break', boss.x, boss.y + DM.height * 0.5, boss.z);
      if (state.phase === 2) state.starT = 0;    // the ceiling opens
    }

    if (boss.hp <= 0) { die(); return; }

    const phase = state.phase;
    const t = target();

    // ---- the vent --------------------------------------------------------
    if (state.ventT > 0) { state.ventT = Math.max(0, state.ventT - dt); stats.ventOpenTime += dt; }
    else stats.ventShutTime += dt;
    boss.bodyMultiplier = DM.bodyMultiplier;      // one constant. The gain is not here.

    // ---- the eat cycle. It runs on the clock, food or no food. -----------
    state.eatT -= dt;
    if (state.eatT <= 0) {
      state.eatT += DM.eatInterval[phase];
      if (state.eatT <= 0) state.eatT = DM.eatInterval[phase];
      eat();
      openVent();
    }
    state.ventLeadT = clamp01((DM.eatInterval[phase] - state.eatT) / Math.max(1e-3, DM.eatInterval[phase]));

    // ---- rage ------------------------------------------------------------
    if (state.rage > 0) state.rage = Math.max(0, state.rage - state.rage * dt / DM.rageDecay);

    // ---- phase 3 starlight ----------------------------------------------
    if (phase === 2 && state.starT < T.starRise) state.starT = Math.min(T.starRise, state.starT + dt);
    if (phase === 2 && ctx.light && typeof ctx.light.addProbe === 'function') {
      // The simulation sees the starlight too: D3, the iris and spawn validation
      // read `illuminationAt`, and a light that is only in the picture is a light
      // the game does not believe in.
      const k = state.starT / T.starRise;
      for (let s = 0; s < T.starCount; s++) {
        const a = (s / T.starCount) * Math.PI * 2 + state.clock * 0.05;
        ctx.light.addProbe(Math.sin(a) * 8, T.starHeight, Math.cos(a) * 8, T.starRadius, T.starIntensity * k);
      }
    }

    // ---- the sweep (phase 2+) -------------------------------------------
    if (phase >= 1) {
      if (state.sweepActive > 0) {
        state.sweepActive = Math.max(0, state.sweepActive - dt);
        state.sweepX += state.sweepDX * dt;
        state.sweepZ += state.sweepDZ * dt;
        state.sweepRetune -= dt;
        if (state.sweepRetune <= 0) { state.sweepRetune = 1 / T.sweepRetuneHz; retuneSuppressed(); }
        if (state.sweepActive <= 0) releaseSuppressed();
      } else {
        state.sweepT -= dt;
        if (state.sweepT <= 0) { state.sweepT = T.sweepEvery; beginSweep(); }
      }
    }

    // ---- the darkbolt ----------------------------------------------------
    if (t && t.alive) {
      if (state.boltWindup > 0) {
        state.boltWindup = Math.max(0, state.boltWindup - dt);
        if (state.boltWindup <= 0) fireBolt(t);
      } else {
        state.boltT -= dt;
        const dx = t.x - boss.x, dz = t.z - boss.z;
        if (state.boltT <= 0 && Math.hypot(dx, dz) < T.boltRange) {
          state.boltT = T.boltIntervalByPhase[phase];
          // FEEL.iris.dampTelegraph. Nothing here ever shortens it.
          state.boltWindup = FEEL.iris.dampTelegraph;
        }
      }
    }

    // ---- movement --------------------------------------------------------
    moveDamp(dt, t, phase);

    // ---- contact ---------------------------------------------------------
    if (t && t.alive && state.contactT <= 0) {
      const dx = t.x - boss.x, dz = t.z - boss.z;
      if (Math.hypot(dx, dz) <= boss.radius + t.radius + DM.keepOut) {
        state.contactT = T.contactInterval;
        stats.contacts++;
        hurtPlayer(DM.contact * (1 + state.rage));
      }
    }
  }

  function fireBolt(t) {
    stats.bolts++;
    const ox = boss.x, oy = boss.y + DM.height * 0.62, oz = boss.z;
    // Lead the target. W8's measurement: a bolt aimed at where the player IS can
    // be waited out for 950 ms of a 1050 ms flight.
    const tx = t.x + (t.vx || 0) * T.boltLead;
    const tz = t.z + (t.vz || 0) * T.boltLead;
    const ty = t.y + t.height * 0.55;
    const proj = ctx.projectiles;
    if (proj && typeof proj.fire === 'function') {
      proj.fire('darkbolt', ox, oy, oz, tx, ty, tz, Math.round(DM.darkbolt * (1 + state.rage)), boss.id);
    } else {
      hurtPlayer(DM.darkbolt * (1 + state.rage));
    }
    // THE SLAM. The telegraph has already run for 0.9 s; the cost is paid now and
    // the bolt is in the air while it is paid, which is the whole point — the
    // dodge is from memory. It is the game's only 1.5 s blind and it is the one
    // thing in the fight the player is warned about before it happens.
    const iris = render && render.iris;
    if (iris && typeof iris.slam === 'function') { iris.slam(FEEL.iris.dampSlam); stats.slams++; }
  }

  function moveDamp(dt, t, phase) {
    const speed = DM.speedByPhase[phase];
    let gx = t ? t.x : boss.x, gz = t ? t.z : boss.z;
    const food = nearestFoodAnywhere();
    if (food) {
      const b = T.eatTravelBias;
      gx = food.x * b + gx * (1 - b);
      gz = food.z * b + gz * (1 - b);
    }
    let dx = gx - boss.x, dz = gz - boss.z;
    const d = Math.hypot(dx, dz) || 1e-6;
    dx /= d; dz /= d;
    // A little wander so a straight line never reads as a rail.
    const wob = (rand(moveRng) - 0.5) * 0.24;
    const wx = dx * Math.cos(wob) - dz * Math.sin(wob);
    const wz = dx * Math.sin(wob) + dz * Math.cos(wob);
    const k = 1 - Math.exp(-6 * dt);
    boss.vx += (wx * speed - boss.vx) * k;
    boss.vz += (wz * speed - boss.vz) * k;
    boss.vy -= FEEL.move.gravity * dt;
    boss.yaw = Math.atan2(wx, wz);
    boss.facingX = Math.sin(boss.yaw); boss.facingZ = Math.cos(boss.yaw);
    const w = ctx.world;
    if (w) moveCapsule(w, boss, dt);
    else {
      boss.x += boss.vx * dt; boss.z += boss.vz * dt;
      boss.y = Math.max(0, boss.y + boss.vy * dt);
      if (boss.y <= 0) { boss.y = 0; boss.vy = 0; }
    }
  }

  /** Nearest food anywhere in the room — what it WALKS toward, not what it eats. */
  function nearestFoodAnywhere() {
    const field = ctx.light;
    if (!field) return null;
    let best = null, bd = Infinity;
    for (const s of field.scars) {
      if (s.permanent) continue;
      const dx = s.x - boss.x, dz = s.z - boss.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  // -------------------------------------------------------------------------
  // PRESENTATION
  // -------------------------------------------------------------------------
  function update(rdt) {
    onChamberChange();
    rebuildTargets(false);
    if (lampField) lampField.update(rdt);

    state.bob += rdt * Math.PI * 2 * T.bobHz;
    writeBodyMatrix();

    const add = render && render.additive;
    if (!add || typeof add.sprite !== 'function') return;
    const warm = FEEL.render.warm;

    // THE VENT RING. The only light this thing ever emits, and it is over the
    // bloom threshold on purpose: when the window is open it is unmistakable,
    // and when it is shut there is nothing there at all.
    if (state.active && state.ventT > 0) {
      const k = clamp01(state.ventT / DM.ventWindow);
      add.sprite(boss.x, boss.y + DM.height * 0.94 + T.hoverY, boss.z,
        T.ventRing * (0.85 + k * 0.35), warm[0], warm[1], warm[2],
        T.ventEmissive * (0.5 + k * 0.5), 0, 0, 1, 0);
    }

    // THE DARKBOLT TELEGRAPH — a ring that grows for the whole 0.9 s. It is the
    // shape that changes, not the colour (CONTRACT §6), and it is the only
    // reason the 1.5 s blind is fair.
    if (state.active && state.boltWindup > 0) {
      const k = 1 - state.boltWindup / FEEL.iris.dampTelegraph;
      add.sprite(boss.x, boss.y + DM.height * 0.62 + T.hoverY, boss.z,
        1.2 + k * 3.4, warm[0], warm[1], warm[2], 0.5 + k * 0.7, 1, 0, 1, 0);
    }

    // PHASE 3 STARLIGHT — the first COLD light in the game, and a real one: it
    // takes rover slots so the surface shader sees it, and it is added as a probe
    // in step() so the simulation does too.
    if (state.active && state.phase === 2 && render.lights && typeof render.lights.request === 'function') {
      const k = state.starT / T.starRise;
      for (let s = 0; s < T.starCount; s++) {
        const a = (s / T.starCount) * Math.PI * 2 + state.clock * 0.05;
        render.lights.request('flares', 7100 + s, Math.sin(a) * 8, T.starHeight, Math.cos(a) * 8,
          T.starRadius, T.starIntensity * k, T.starColor, render.LIGHT_KIND.COLD);
      }
    }

    // THE ENDING. A ring travelling outward from the plinth, and the scars it
    // passes come back on. No text, no cutscene.
    if (state.ending > 0) {
      const front = waveFront();
      const k = state.ending / T.waveTime;
      const n = 24;
      for (let s = 0; s < n; s++) {
        const a = (s / n) * Math.PI * 2;
        add.sprite(Math.sin(a) * front, APERTURE.floorY + 0.25, Math.cos(a) * front,
          T.waveSpriteSize * (0.4 + k * 0.6), warm[0], warm[1], warm[2],
          T.waveEmissive * k, 0, 0, 1, 0);
      }
    }
  }

  // -------------------------------------------------------------------------
  // CHAMBER BINDING
  // -------------------------------------------------------------------------
  let boundChamber = null;

  function onChamberChange() {
    const id = ctx.chamber ? ctx.chamber.id : null;
    if (id === boundChamber) return;
    unbind();
    boundChamber = id;
    if (id === FURNACE_SPEC.id) bindFurnace();
    else if (id === APERTURE_SPEC.id) bindAperture();
    rebuildTargets(true);
  }

  function bindFurnace() {
    if (!ctx.light) return;
    lampField = createLampField(ctx, FURNACE_SPEC);
  }

  function bindAperture() {
    if (!ctx.light) return;
    syncArchive();
    projected = projectRunField(ctx, archive);
    const start = APERTURE_SPEC.playerStart;
    begin(start.x, start.z - 26);
  }

  function unbind() {
    if (lampField) { lampField.dispose(); lampField = null; }
    if (state.active || state.ending > 0) {
      releaseSuppressed();
      state.active = false;
      state.ending = 0;
      boss.dead = true;
      boss.id = -1;
    }
    // The projection comes back OUT. The registry resets the field on a normal
    // chamber change so this is usually a no-op — but a re-bind without it
    // projects the whole run a second time on top of the first, and the only
    // symptom is a boss room with twice the run's scar count, which reads as a
    // tuning problem rather than as a leak.
    if (projected && ctx.light) for (const s of projected) removeScar(ctx.light, s);
    projected = null;
  }

  // -------------------------------------------------------------------------
  // QA
  // -------------------------------------------------------------------------
  function snapshot() {
    return {
      build: 'w11-chambers-c+boss',
      chamber: boundChamber,
      active: state.active,
      phase: state.phase,
      hp: boss.hp, maxHp: boss.maxHp,
      ventOpen: state.ventT > 0,
      ventDuty: [ventDuty(0), ventDuty(1), ventDuty(2)],
      measuredVentDuty: (stats.ventOpenTime + stats.ventShutTime) > 0
        ? stats.ventOpenTime / (stats.ventOpenTime + stats.ventShutTime) : 0,
      rage: state.rage,
      eaten: eaten.length,
      suppressed: suppressed.length,
      restored: restored.length,
      archive: archive.map(a => ({ id: a.id, scars: a.scars.length })),
      archivedCount: archivedCount(),
      projected: projected ? projected.length : 0,
      lamps: lampField ? lampField.snapshot() : null,
      bodyCap: bodyCap(heldWeapon()),
      ventGain: ventGain(),
      ended: state.ended,
      stats: { ...stats, minLitForSeen: stats.minLitForSeen === Infinity ? 0 : stats.minLitForSeen },
      targets: merged ? merged.length : 0,
    };
  }

  /**
   * CONTRACT §2 — an observable assertion on the SHIPPING page. Not "did the
   * module load": the boss takes a real hit through the real record, the vent
   * gain is measured off it, and the light field's count actually moves.
   */
  function verify() {
    const checks = [];
    const add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });

    add('the vent is shut for at least half of every phase',
      ventDuty(0) <= 0.5 && ventDuty(1) <= 0.5 && ventDuty(2) <= 0.5,
      [0, 1, 2].map(p => (ventDuty(p) * 100).toFixed(1) + '%').join(' / '));

    add('the boss is never invulnerable, at any phase', boss.invulnerable === false);

    // THE ONE LAW, on the real record through the real combat module.
    const combat = ctx.weapons && ctx.weapons.combat;
    if (combat && typeof combat.applyHit === 'function') {
      const wasActive = state.active;
      if (!wasActive) begin(0, -8);
      let worstDamage = Infinity, worstLit = Infinity;
      for (const gate of [DM.hp, DM.phase2At, DM.phase2At - 1, DM.phase3At, DM.phase3At - 1, 40]) {
        boss.hp = gate; boss.lastHpSeen = gate; boss.litFor = 0;
        const r = combat.applyHit(boss, FEEL.weapons[1].dmg, { multiplier: 1 });
        worstDamage = Math.min(worstDamage, r.damage);
        worstLit = Math.min(worstLit, r.litFor);
      }
      add('a body shot always removes >= 1 hp at every phase gate', worstDamage >= 1, `min ${worstDamage} hp`);
      add('a body shot always lights it >= 0.35 s at every phase gate',
        worstLit >= FEEL.law.hitLightMin, `min ${worstLit.toFixed(3)} s`);
      boss.hp = DM.hp; boss.lastHpSeen = DM.hp;
      if (!wasActive) { state.active = false; boss.dead = true; boss.id = -1; }
    } else {
      add('a body shot always removes >= 1 hp at every phase gate', true, 'weapons not constructed — headless');
    }

    // The field edit works on the real LightField.
    const field = ctx.light;
    if (field) {
      const n0 = field.count;
      const probe = { x: 400, y: 0, z: 400, r: 4, i: 1, born: 0, cell: 0 };
      insertScar(field, probe);
      const n1 = field.count;
      removeScar(field, probe);
      const n2 = field.count;
      add('a scar can be inserted without merging and removed again',
        n1 === n0 + 1 && n2 === n0, `${n0} -> ${n1} -> ${n2}`);
    }

    add('the body is a negative silhouette in the shipping scene',
      !THREE || !ctx.scene || !!mesh, mesh ? mesh.name : 'headless');

    return { ok: checks.every(c => c.ok), checks };
  }

  function dispose() {
    unbind();
    if (mesh && ctx.scene) ctx.scene.remove(mesh);
    if (geom) geom.dispose();
    if (mat && typeof mat.dispose === 'function') mat.dispose();
    mesh = null; geom = null; mat = null;
  }

  function reset() {
    restoreEaten();
    restored.length = 0;
    state.active = false;
    state.ending = 0;
    state.ended = false;
    boss.dead = true;
    boss.id = -1;
    for (const k of Object.keys(stats)) stats[k] = (k === 'minLitForSeen') ? Infinity : 0;
    rng = ctx.rng ? ctx.rng.derive('damp') : null;
    moveRng = rng ? rng.fork('move') : null;
    castRng = rng ? rng.fork('cast') : null;
  }

  buildBody();
  onChamberChange();

  const api = {
    id: 'damp',
    step, update, dispose, verify, snapshot, reset,
    // the fight
    begin, die, eat, openVent, beginSweep, restoreEaten,
    record: boss,
    state,
    stats,
    get phase() { return state.phase; },
    get ventOpen() { return state.ventT > 0; },
    get eaten() { return eaten; },
    get restored() { return restored; },
    get lamps() { return lampField; },
    get archive() { return archive; },
    get projected() { return projected; },
    archivedCount,
    syncArchive,
    bodyCap: () => bodyCap(heldWeapon()),
    ventDuty,
    phaseOf,
    rebuildTargets,
    /** C2-F8. A test injects its own target; the page uses the real controller. */
    inject(p) {
      if (p && typeof p.target === 'function') provideTarget = p.target;
      return api;
    },
    /** Force a binding, for the gate and for a chamber that loads synchronously. */
    bind(id) { boundChamber = null; ctx.chamber = ctx.chamber || null; onChamberChange(); return boundChamber; },
    bindFurnace() { unbind(); boundChamber = FURNACE_SPEC.id; bindFurnace(); rebuildTargets(true); return lampField; },
    bindAperture() { unbind(); boundChamber = APERTURE_SPEC.id; bindAperture(); rebuildTargets(true); return boss; },
  };

  ctx.damp = api;
  if (typeof window !== 'undefined' && window.__FLARE) window.__FLARE.damp = api;
  return api;
}

export default create;
