// Enemy manager: boot-built pools (spawn allocates nothing), a small state
// machine per enemy, squad tokens (max 2 committed attackers), persistent
// three-tier routing, separation from a frozen snapshot, damped ground-follow
// (never hard-snapped — Eclipse's jitter), the telegraph law (>=320 ms, tell
// on a shootable part, audio on frame 1, late attacks CANCELLED), budgeted
// flinch, threshold staggers, and deaths that decay their glow over 2.6 s so
// dead-vs-alive reads across the whole field.

import * as THREE from 'three';
import { TAU, DEG, clamp, clamp01, lerp, damp, dampAngle } from '../engine/math.js';
import { SPECIES, BUILDERS } from './species.js';
import {
  CFG as RELAY, onRamp, onSpiral, tierForY, spiralWaypoints,
} from '../world/structure.js';

const POOL = { thrall: 20, warden: 3, chorister: 6, planet: 2 };
const MAX_ATTACKERS = 2;   // the token that makes a pack a rhythm, not a blender
const FLINCH_BUDGET = 0.180;
const STAGGER_T = 0.620, STAGGER_IMMUNITY = 2.2, STAGGER_WINDOW = 0.4;
const BOLT_POOL = 12;

export function create(ctx) {
  const scene = ctx.scene;
  const world = ctx.systems.world;
  const rng = ctx.rng.fork('enemies');
  const all = [];
  let lastProgress = 0;        // sim time of the last kill or spawn (stalemate watch)

  /* ---------------- build pools at boot ---------------- */
  let uid = 0;
  for (const [species, count] of Object.entries(POOL)) {
    for (let i = 0; i < count; i++) {
      const built = BUILDERS[species]();
      built.group.visible = false;
      scene.add(built.group);
      all.push({
        id: uid++, species, def: SPECIES[species], built,
        alive: false, state: 'dead',
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0,
        hp: 0, grounded: true,
        gait: 0, burstT: 0, moving: false,
        stateT: 0, attackKind: 'lunge', committed: false,
        attackCd: 0, attackDir: new THREE.Vector3(), airborne: false,
        aimDir: new THREE.Vector3(0, -0.2, 1),
        orbitAngle: 0, orbitRadius: 0, orbitAltitude: 0,
        orbitSpeed: 0, orbitDir: 1, attackGrace: 0, firePulse: 0,
        ventT: rng.next() * 4.5, ventOpen: false,
        staggerT: 0, immuneT: 0, windowDmg: 0, windowT: 0,
        flinchT: 99, flinch: new THREE.Vector3(),
        deathT: 0, deathSpin: 0, glowBase: null,
        vocalT: 2 + rng.next() * 6,
        stallT: 0, stallPos: new THREE.Vector3(),
        routing: false, routeMode: 'none', routeStage: 'none',
        routeSign: 1, routeSide: 1, routeGoalX: 0, routeGoalZ: 0,
        routeBest: Infinity, routeNoProgressT: 0, routeRetries: 0,
        routeDetour: false, routeDetourX: 0, routeDetourZ: 0,
        routeAvoidSide: uid % 2 ? 1 : -1,
        routeIndex: 0,
        relocations: 0,
        slotSeed: rng.next() * TAU,
      });
    }
  }
  // cache base emissive intensities for flash/decay math
  for (const e of all) {
    e.glowBase = e.built.glowMats.map(m => m.emissiveIntensity);
  }

  /* ---------------- chorister bolts (pooled) ---------------- */
  const boltGeo = new THREE.SphereGeometry(0.17, 8, 6);
  const boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.4, 4.0), toneMapped: false });
  const bolts = new THREE.InstancedMesh(boltGeo, boltMat, BOLT_POOL);
  bolts.frustumCulled = false;
  scene.add(bolts);
  const boltRingGeo = new THREE.TorusGeometry(0.30, 0.045, 5, 16);
  const boltRings = new THREE.InstancedMesh(boltRingGeo, boltMat, BOLT_POOL);
  boltRings.frustumCulled = false;
  scene.add(boltRings);
  const boltState = [];
  for (let i = 0; i < BOLT_POOL; i++) boltState.push({
    live: false, age: 0, pos: new THREE.Vector3(), prev: new THREE.Vector3(),
    vel: new THREE.Vector3(), gravity: 12, damage: 34, radius: 1.45,
    maxAge: 6, scale: 1, kind: 'chorister',
  });
  let boltCursor = 0;
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s1 = new THREE.Vector3(1, 1, 1);
  const _up = new THREE.Vector3(0, 1, 0), _zAxis = new THREE.Vector3(0, 0, 1);
  const _boltTravel = new THREE.Vector3(), _boltFacing = new THREE.Vector3();
  const _hurtDir = new THREE.Vector3();

  function fireBolt(from, target, lead) {
    const b = boltState[boltCursor];
    boltCursor = (boltCursor + 1) % BOLT_POOL;
    b.live = true; b.age = 0; b.kind = 'chorister';
    b.gravity = 12; b.damage = SPECIES.chorister.dmg; b.radius = 1.45;
    b.maxAge = 6; b.scale = 1;
    b.pos.copy(from);
    b.prev.copy(from);
    // lobbed ballistic solve: flat velocity toward the LED target point,
    // vy solves the drop over flight time. Leading 0.6x the player's velocity
    // makes strafing a dodge you must keep performing, not a stalemate.
    let tx = target.x, tz = target.z;
    const dist0 = Math.hypot(tx - from.x, tz - from.z);
    const T0 = clamp(dist0 / 9.0, 0.6, 3.2);
    if (lead) { tx += lead.x * T0 * 0.6; tz += lead.z * T0 * 0.6; }
    const dx = tx - from.x, dz = tz - from.z;
    const T = clamp(Math.hypot(dx, dz) / 9.0, 0.6, 3.2);
    b.vel.set(dx / T, (target.y - from.y) / T + 0.5 * 12 * T, dz / T);
  }

  function firePlanetBolt(from, target, lead) {
    const b = boltState[boltCursor];
    boltCursor = (boltCursor + 1) % BOLT_POOL;
    b.live = true; b.age = 0; b.kind = 'planet';
    b.gravity = 0; b.damage = SPECIES.planet.dmg; b.radius = 1.72;
    b.maxAge = 6.5; b.scale = 1.65;
    b.pos.copy(from); b.prev.copy(from);
    const dist = from.distanceTo(target);
    const travel = clamp(dist / SPECIES.planet.boltSpeed, 0.35, 3.4);
    _projectileTarget.copy(target);
    if (lead) _projectileTarget.addScaledVector(lead, Math.min(0.25, travel * 0.18));
    b.vel.subVectors(_projectileTarget, from).normalize().multiplyScalar(SPECIES.planet.boltSpeed);
  }

  /* ---------------- spawn / despawn ---------------- */
  function spawn(species, x, z, opts = {}) {
    const e = all.find(o => o.species === species && !o.alive && o.state !== 'corpse');
    if (!e) return null;
    e.alive = true;
    e.state = 'approach';
    e.stateT = 0;
    e.hp = e.def.hp * (opts.hpScale || 1);
    if (e.def.flying) {
      e.orbitAngle = Math.atan2(z, x);
      e.orbitRadius = clamp(Math.hypot(x, z) || e.def.orbitRMin, e.def.orbitRMin, e.def.orbitRMax);
      e.orbitAltitude = RELAY.upperY + lerp(e.def.orbitAltitudeMin, e.def.orbitAltitudeMax, rng.next());
      e.orbitSpeed = lerp(e.def.orbitAngularSpeedMin, e.def.orbitAngularSpeedMax, rng.next());
      e.orbitDir = e.id % 2 ? -1 : 1;
      e.attackGrace = e.def.initialAttackGrace;
      e.pos.set(x, opts.y ?? e.orbitAltitude, z);
      e.aimDir.set(0, -0.2, 1).normalize();
    } else {
      e.pos.set(x, world.groundAt(x, z, 200), z);
      e.attackGrace = 0;
    }
    e.vel.set(0, 0, 0);
    e.yaw = Math.atan2(-(ctx.systems.player.pos.x - x), -(ctx.systems.player.pos.z - z));
    e.committed = false; e.airborne = false; e.attackCd = 0; e.firePulse = 0;
    e.staggerT = 0; e.immuneT = 0; e.windowDmg = 0;
    e.flinchT = 99; e.deathT = 0;
    e.stallT = 0; e.stallPos.copy(e.pos);
    e.burstT = 0;
    e.routing = false; e.routeMode = 'none'; e.routeStage = 'none';
    e.routeBest = Infinity; e.routeNoProgressT = 0; e.routeRetries = 0;
    e.routeDetour = false; e.relocations = 0;
    e.routeIndex = 0;
    e.built.group.visible = true;
    e.enraged = false;
    lastProgress = ctx.time;
    for (let i = 0; i < e.built.glowMats.length; i++) e.built.glowMats[i].emissiveIntensity = e.glowBase[i];
    ctx.bus.emit('enemy:spawn', { id: e.id, species, pos: e.pos });
    return e;
  }

  function release(e) {
    e.alive = false;
    e.state = 'dead';
    e.enraged = false;
    e.routing = false; e.routeMode = 'none'; e.routeStage = 'none';
    e.routeDetour = false;
    e.built.group.visible = false;
  }

  /* ---------------- damage (combat calls this) ---------------- */
  function damageEnemy(e, amount, { zone, dir, point }) {
    if (!e.alive) return { killed: false, hpFrac: 0, species: e.species };
    let dmg = amount;
    if (e.staggerT > 0) dmg = Math.round(dmg * 1.25);
    dmg = Math.max(1, dmg);                       // THE ONE LAW
    e.hp -= dmg;

    // hit flash on the anatomy — every hit, unbudgeted, 60 ms
    for (let i = 0; i < e.built.glowMats.length; i++) {
      e.built.glowMats[i].emissiveIntensity = e.glowBase[i] * 3.2;
    }
    e.flashT = 0;

    // budgeted body flinch
    if (e.flinchT > FLINCH_BUDGET && e.staggerT <= 0) {
      e.flinchT = 0;
      e.flinch.copy(dir).multiplyScalar(0.09);
    }

    // stagger: 35% of max in a 400 ms window, or a weak hit >= 25%
    e.windowDmg += dmg;
    e.windowT = 0;
    const weakBig = zone === 'vent' && dmg >= e.def.hp * 0.25;
    if (e.immuneT <= 0 && e.staggerT <= 0 && (e.windowDmg >= e.def.hp * 0.35 || weakBig)) {
      e.staggerT = STAGGER_T;
      e.immuneT = STAGGER_T + STAGGER_IMMUNITY;
      e.committed = false;
      if (e.state === 'windup' || e.state === 'attack') { e.state = 'recover'; e.stateT = 0; }
      ctx.bus.emit('enemy:stagger', { species: e.species, pos: e.pos });
    }

    if (e.hp <= 0) {
      e.alive = false;
      e.state = 'corpse';
      e.deathT = 0;
      const J = clamp(dmg * 0.70, 8, 320);
      const mf = e.species === 'planet' ? 18 : e.species === 'warden' ? 3 : e.species === 'chorister' ? 1.6 : 1;
      e.vel.copy(dir).multiplyScalar(Math.min(J * 0.055 / mf, 7));
      e.vel.y = Math.max(e.vel.y, 1.2);
      e.airborne = true;
      e.deathSpin = (rng.next() - 0.5) * 6;
      lastProgress = ctx.time;
      ctx.bus.emit('enemy:die', { id: e.id, species: e.species, pos: e.pos });
      return { killed: true, hpFrac: 0, species: e.species };
    }
    return { killed: false, hpFrac: clamp01(e.hp / e.def.hp), species: e.species };
  }

  /* ---------------- bullet raycast vs sphere zones ---------------- */
  const _oc = new THREE.Vector3(), _c = new THREE.Vector3();
  const _projectileTarget = new THREE.Vector3();
  const _planetTarget = new THREE.Vector3(), _planetOrigin = new THREE.Vector3();
  const _planetRay = new THREE.Vector3();
  function raycast(origin, dir, maxT) {
    let best = null;
    for (const e of all) {
      if (!e.alive) continue;
      const cy = Math.cos(e.yaw), sy = Math.sin(e.yaw);
      for (const z of e.built.zones) {
        // zone center in world space (rotate local by yaw)
        if (z.aimed && e.def.flying) {
          _c.copy(e.pos).addScaledVector(e.aimDir, z.radialOffset || 0);
        } else {
          _c.set(
            e.pos.x + z.x * cy + z.z * sy,
            e.pos.y + z.y,
            e.pos.z - z.x * sy + z.z * cy,
          );
        }
        _oc.subVectors(_c, origin);
        const tca = _oc.dot(dir);
        if (tca < 0 || tca > maxT) continue;
        const d2 = _oc.lengthSq() - tca * tca;
        const r2 = z.r * z.r;
        if (d2 > r2) continue;
        const t = tca - Math.sqrt(r2 - d2);
        if (t < 0) continue;
        if (!best || t < best.t) {
          let zone = z.zone;
          if (zone === 'ventL' || zone === 'ventR') zone = e.ventOpen ? 'vent' : 'plate';
          best = { t, enemy: e, zone };
        }
      }
    }
    if (best) best.point = origin.clone().addScaledVector(dir, best.t);
    return best;
  }

  /* ---------------- per-frame AI + steering ---------------- */
  const snapX = new Float32Array(64), snapZ = new Float32Array(64), snapR = new Float32Array(64);
  const _sep = new THREE.Vector3(), _to = new THREE.Vector3(), _tgt = new THREE.Vector3();

  /**
   * Three-tier routing. Ground <-> deck owns the two broad ramps; deck <->
   * lunar tier owns one ordered helix. An enemy keeps its current transition
   * until it reaches a landing, so the height classifier can never make it
   * oscillate halfway up a slope. Position is never rewritten or teleported.
   */
  const ROUTE_SIDE_Z = RELAY.rampW / 2 + 1.5;
  const ROUTE_EXIT_X = RELAY.deckOut + 1.2;
  const ROUTE_BYPASS_X = RELAY.rampFoot + 1.2;
  const ROUTE_FOOT_X = RELAY.rampFoot + 2.4;
  const ROUTE_HEAD_X = RELAY.rampHead + 0.6;
  const ROUTE_REACH = 0.85;
  const SPIRAL_APPROACH_R = RELAY.spiralOuter + 1.42;
  const SPIRAL_UP = spiralWaypoints('up');
  const SPIRAL_DOWN = spiralWaypoints('down');

  function angleDelta(target, current) {
    let d = target - current;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return d;
  }

  function resetRoute(e) {
    e.routing = false;
    e.routeMode = 'none'; e.routeStage = 'none';
    e.routeBest = Infinity; e.routeNoProgressT = 0; e.routeRetries = 0;
    e.routeDetour = false;
    e.routeIndex = 0;
  }

  function setRouteStage(e, stage) {
    if (e.routeStage === stage) return;
    e.routeStage = stage;
    e.routeBest = Infinity; e.routeNoProgressT = 0; e.routeRetries = 0;
    e.routeDetour = false;
  }

  function nearestSpiralIndex(e, route) {
    let best = 0, bestD2 = Infinity;
    for (let i = 0; i < route.length; i++) {
      const p = route[i];
      const dx = e.pos.x - p.x, dz = e.pos.z - p.z;
      // Height matters enough to distinguish the two addresses on either side
      // of the seam, but not enough to reject a body damped below the surface.
      const dy = (e.pos.y - p.y) * 0.35;
      const d2 = dx * dx + dz * dz + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; best = i; }
    }
    return best;
  }

  function setRouteGoal(e, x, z) {
    if (Math.abs(e.routeGoalX - x) < 0.01 && Math.abs(e.routeGoalZ - z) < 0.01) return;
    e.routeGoalX = x; e.routeGoalZ = z;
    e.routeBest = Infinity; e.routeNoProgressT = 0;
    e.routeDetour = false;
  }

  function tryDetourCandidate(e, blocker, dx, dz, side, radius) {
    const px = -dz * side, pz = dx * side;
    let x = blocker.x + dx * radius * 0.78 + px * radius * 1.42;
    let z = blocker.z + dz * radius * 0.78 + pz * radius * 1.42;
    if (world.canOccupyCircle(x, z, e.def.radius, e.pos.y, 0.08)
        && world.corridorClear(e.pos.x, e.pos.z, x, z, e.def.radius, e.pos.y, 0.05)) {
      e.routeDetourX = x; e.routeDetourZ = z; return true;
    }

    // If the forward tangent is crowded, walk around the obstacle from the
    // body's current radial side. This is deterministic and produces an
    // actual path around a pylon rather than a hidden relocation.
    let rx = e.pos.x - blocker.x, rz = e.pos.z - blocker.z;
    const rl = Math.hypot(rx, rz) || 1;
    rx /= rl; rz /= rl;
    x = blocker.x + rx * radius + (-rz * side) * radius * 1.15;
    z = blocker.z + rz * radius + (rx * side) * radius * 1.15;
    if (world.canOccupyCircle(x, z, e.def.radius, e.pos.y, 0.05)
        && world.corridorClear(e.pos.x, e.pos.z, x, z, e.def.radius, e.pos.y, 0.02)) {
      e.routeDetourX = x; e.routeDetourZ = z; return true;
    }
    return false;
  }

  function beginCircleDetour(e, blocker, goalX, goalZ) {
    let dx = goalX - e.pos.x, dz = goalZ - e.pos.z;
    const dl = Math.hypot(dx, dz) || 1;
    dx /= dl; dz /= dl;
    const radius = blocker.r + e.def.radius + 0.34;
    const preferred = e.routeAvoidSide;
    if (!tryDetourCandidate(e, blocker, dx, dz, preferred, radius)
        && !tryDetourCandidate(e, blocker, dx, dz, -preferred, radius)) return false;
    e.routeDetour = true;
    e.routeBest = Infinity; e.routeNoProgressT = 0;
    return true;
  }

  function rampWaypoint(e, direction) {
    const mySign = onRamp(e.pos.x, e.pos.z);
    const midSlope = mySign !== 0
      && e.pos.y > RELAY.rampFootY + 1.0
      && e.pos.y < RELAY.deckY - 1.5;

    if (direction === 'up') {
      if (e.routeMode !== 'ramp-up') {
        e.routeMode = 'ramp-up'; e.routing = true;
        e.routeSign = e.pos.x >= 0 ? 1 : -1;
        e.routeSide = e.pos.z >= 0 ? 1 : -1;
        e.routeAvoidSide = e.id % 2 ? 1 : -1;
        const underDeck = Math.hypot(e.pos.x, e.pos.z) < RELAY.deckOut + 1.2;
        setRouteStage(e, underDeck ? 'exit' : (Math.abs(e.pos.z) > RELAY.rampW / 2 - 0.5 ? 'bypass' : 'foot'));
      }
      if (mySign !== 0 && midSlope) { e.routeSign = mySign; setRouteStage(e, 'head'); }

      let gx = 0, gz = 0;
      if (e.routeStage === 'exit') {
        gx = e.routeSign * ROUTE_EXIT_X; gz = e.routeSide * ROUTE_SIDE_Z;
        if (Math.hypot(e.pos.x - gx, e.pos.z - gz) < ROUTE_REACH) setRouteStage(e, 'bypass');
      }
      if (e.routeStage === 'bypass') {
        gx = e.routeSign * ROUTE_BYPASS_X; gz = e.routeSide * ROUTE_SIDE_Z;
        if (Math.hypot(e.pos.x - gx, e.pos.z - gz) < ROUTE_REACH) setRouteStage(e, 'foot');
      }
      if (e.routeStage === 'foot') {
        gx = e.routeSign * ROUTE_FOOT_X; gz = 0;
        if (mySign === e.routeSign || Math.hypot(e.pos.x - gx, e.pos.z) < ROUTE_REACH) setRouteStage(e, 'head');
      }
      if (e.routeStage === 'head') {
        gx = e.routeSign * ROUTE_HEAD_X; gz = 0;
      }
      setRouteGoal(e, gx, gz);
    } else {
      if (e.routeMode !== 'ramp-down') {
        e.routeMode = 'ramp-down'; e.routing = true;
        e.routeSign = mySign || (e.pos.x >= 0 ? 1 : -1);
        setRouteStage(e, 'head');
      }
      if (mySign === e.routeSign
          && Math.abs(e.pos.z) < RELAY.rampW / 2 - 0.5
          && Math.abs(e.pos.x) >= RELAY.rampHead - 0.5) setRouteStage(e, 'foot');
      if (e.routeStage === 'head') setRouteGoal(e, e.routeSign * ROUTE_HEAD_X, 0);
      else setRouteGoal(e, e.routeSign * ROUTE_FOOT_X, 0);
    }
    return midSlope;
  }

  function spiralWaypoint(e, direction) {
    const route = direction === 'up' ? SPIRAL_UP : SPIRAL_DOWN;
    const mode = `spiral-${direction}`;
    if (e.routeMode !== mode) {
      e.routeMode = mode;
      e.routing = true;
      // A body may share X/Z with a different flight above/below it. Resume
      // only if physically on the helix; otherwise circle on its current floor
      // to the correct guarded landing before crossing the rail opening.
      if (onSpiral(e.pos.x, e.pos.z, e.pos.y)) {
        e.routeStage = mode;
        e.routeIndex = nearestSpiralIndex(e, route);
      } else {
        e.routeStage = `${mode}-approach`;
        e.routeIndex = 0;
      }
      e.routeBest = Infinity; e.routeNoProgressT = 0; e.routeRetries = 0;
      e.routeDetour = false;
    }

    if (e.routeStage === `${mode}-approach`) {
      const targetA = direction === 'up' ? RELAY.spiralLowerA : RELAY.spiralUpperA;
      const currentA = Math.atan2(e.pos.z, e.pos.x);
      const radial = Math.hypot(e.pos.x, e.pos.z);
      const da = angleDelta(targetA, currentA);
      let goalA = currentA;
      if (Math.abs(radial - SPIRAL_APPROACH_R) <= 0.62) {
        goalA += clamp(da, -0.34, 0.34);
      }
      const gx = Math.cos(goalA) * SPIRAL_APPROACH_R;
      const gz = Math.sin(goalA) * SPIRAL_APPROACH_R;
      const close = Math.hypot(e.pos.x - gx, e.pos.z - gz) < 0.82;
      if (Math.abs(da) < 0.105 && Math.abs(radial - SPIRAL_APPROACH_R) < 0.82) {
        e.routeStage = mode;
        e.routeBest = Infinity; e.routeNoProgressT = 0; e.routeDetour = false;
      } else {
        setRouteGoal(e, gx, gz);
        if (close) { e.routeBest = Infinity; e.routeNoProgressT = 0; }
        return false;
      }
    }

    let goal = route[Math.min(e.routeIndex, route.length - 1)];
    let distance = Math.hypot(e.pos.x - goal.x, e.pos.z - goal.z);
    // Consume more than one close point after a coarse test step. This keeps
    // deterministic QA and clamped real frames on the exact same route.
    while (distance < (goal.landing ? 1.05 : 0.78) && e.routeIndex < route.length - 1) {
      e.routeIndex++;
      goal = route[e.routeIndex];
      distance = Math.hypot(e.pos.x - goal.x, e.pos.z - goal.z);
      e.routeBest = Infinity; e.routeNoProgressT = 0;
    }
    setRouteGoal(e, goal.x, goal.z);
    return e.routeIndex >= route.length - 1 && distance < 1.05;
  }

  /** Persistent tier route across both manufactured transitions. */
  function tierWaypoint(e, targetY, dt) {
    const targetTier = tierForY(targetY);
    const currentTier = tierForY(e.pos.y);
    const onHelix = onSpiral(e.pos.x, e.pos.z, e.pos.y)
      && e.pos.y > RELAY.deckY + 0.45
      && e.pos.y < RELAY.upperY - 0.45;
    const myRamp = onRamp(e.pos.x, e.pos.z);
    const midRamp = myRamp !== 0
      && e.pos.y > RELAY.rampFootY + 0.7
      && e.pos.y < RELAY.deckY - 0.8;

    let transition = null;
    if (onHelix || e.routeMode.startsWith('spiral-')) {
      transition = e.routeMode.startsWith('spiral-')
        ? e.routeMode
        : (targetY >= e.pos.y - 0.25 ? 'spiral-up' : 'spiral-down');
      // Once a landing is reached, re-evaluate the remaining tier chain.
      const done = spiralWaypoint(e, transition.endsWith('up') ? 'up' : 'down');
      if (done) {
        resetRoute(e);
        return tierWaypoint(e, targetY, dt);
      }
    } else if (midRamp || e.routeMode.startsWith('ramp-')) {
      transition = e.routeMode.startsWith('ramp-')
        ? e.routeMode
        : (targetTier > 0 && targetY >= e.pos.y - 0.25 ? 'ramp-up' : 'ramp-down');
      rampWaypoint(e, transition.endsWith('up') ? 'up' : 'down');
      if (!midRamp && ((transition === 'ramp-up' && currentTier >= 1)
          || (transition === 'ramp-down' && currentTier === 0))) {
        resetRoute(e);
        return tierWaypoint(e, targetY, dt);
      }
    } else if (currentTier < targetTier) {
      transition = currentTier === 0 ? 'ramp-up' : 'spiral-up';
      if (transition === 'ramp-up') rampWaypoint(e, 'up');
      else spiralWaypoint(e, 'up');
    } else if (currentTier > targetTier) {
      transition = currentTier === 2 ? 'spiral-down' : 'ramp-down';
      if (transition === 'ramp-down') rampWaypoint(e, 'down');
      else spiralWaypoint(e, 'down');
    } else {
      resetRoute(e);
      return false;
    }

    e.routing = true;
    if (e.routeDetour) {
      if (Math.hypot(e.pos.x - e.routeDetourX, e.pos.z - e.routeDetourZ) < ROUTE_REACH) {
        e.routeDetour = false; e.routeBest = Infinity; e.routeNoProgressT = 0;
      }
    }
    // The helical route is already a clearance-certified centreline. Generic
    // tangent detours would send bodies through its rails; collision plus the
    // ordered next point is the correct recovery there.
    const approachingSpiralLanding = e.routeStage.endsWith('-approach');
    if (!e.routeDetour && (!e.routeMode.startsWith('spiral-') || approachingSpiralLanding)) {
      const blocker = world.firstCircleBlocker(
        e.pos.x, e.pos.z, e.routeGoalX, e.routeGoalZ, e.def.radius, e.pos.y, 0.10,
      );
      if (blocker) beginCircleDetour(e, blocker, e.routeGoalX, e.routeGoalZ);
    }

    const tx = e.routeDetour ? e.routeDetourX : e.routeGoalX;
    const tz = e.routeDetour ? e.routeDetourZ : e.routeGoalZ;
    const remaining = Math.hypot(e.pos.x - tx, e.pos.z - tz);
    if (remaining < e.routeBest - 0.35) {
      e.routeBest = remaining; e.routeNoProgressT = 0;
    } else e.routeNoProgressT += dt;

    if (e.routeNoProgressT > 1.25) {
      e.routeRetries++;
      e.routeAvoidSide *= -1;
      e.routeDetour = false;
      if (e.routeRetries === 2 && (e.routeStage === 'exit' || e.routeStage === 'bypass')) e.routeSide *= -1;
      if (e.routeRetries >= 3 && e.routeMode === 'ramp-up') {
        e.routeSign *= -1; e.routeRetries = 0;
        setRouteStage(e, Math.hypot(e.pos.x, e.pos.z) < RELAY.deckOut + 1.2 ? 'exit' : 'bypass');
      } else if (e.routeRetries >= 3 && e.routeMode.startsWith('spiral-')) {
        const route = e.routeMode === 'spiral-up' ? SPIRAL_UP : SPIRAL_DOWN;
        if (onSpiral(e.pos.x, e.pos.z, e.pos.y)) {
          e.routeStage = e.routeMode;
          e.routeIndex = nearestSpiralIndex(e, route);
        } else {
          e.routeStage = `${e.routeMode}-approach`;
          e.routeIndex = 0;
        }
        e.routeRetries = 0;
      }
      e.routeBest = Infinity; e.routeNoProgressT = 0;
      ctx.bus.emit('enemy:route-replan', { id: e.id, stage: e.routeStage });
    }

    _tgt.set(tx, 0, tz);
    return true;
  }

  function commitCount() {
    let n = 0;
    for (const e of all) if (e.alive && e.committed) n++;
    return n;
  }

  function planetCommitCount() {
    let n = 0;
    for (const e of all) if (e.alive && e.species === 'planet' && e.committed) n++;
    return n;
  }

  function planetLineOfSight(e) {
    const p = ctx.systems.player;
    _planetTarget.set(p.pos.x, p.eyeY, p.pos.z);
    _planetOrigin.copy(e.pos).addScaledVector(e.aimDir, 1.92);
    _planetRay.subVectors(_planetTarget, _planetOrigin);
    const dist = _planetRay.length();
    if (dist < 1) return true;
    _planetRay.multiplyScalar(1 / dist);
    const maxT = Math.max(0, dist - p.radius - 0.35);
    const cHit = world.rayColliders(_planetOrigin, _planetRay, maxT);
    const gHit = world.marchGround(_planetOrigin, _planetRay, cHit ? cHit.t : maxT);
    return !cHit && !gHit;
  }

  function updatePlanet(e, dt) {
    const p = ctx.systems.player;
    const def = e.def;
    e.attackGrace = Math.max(0, e.attackGrace - dt);
    e.firePulse = Math.max(0, e.firePulse - dt * 6.5);

    // A slow, fully simulated world-space orbit. The body never follows the
    // camera and never enters ground routing/collision.
    const orbitScale = e.staggerT > 0 ? 0.28 : 1;
    e.orbitAngle += e.orbitSpeed * e.orbitDir * orbitScale * dt;
    const tx = Math.cos(e.orbitAngle) * e.orbitRadius;
    const tz = Math.sin(e.orbitAngle) * e.orbitRadius;
    let wantX = (tx - e.pos.x) * 1.15;
    let wantZ = (tz - e.pos.z) * 1.15;
    const wantSpeed = Math.hypot(wantX, wantZ);
    if (wantSpeed > 2.8) { wantX *= 2.8 / wantSpeed; wantZ *= 2.8 / wantSpeed; }
    e.vel.x = damp(e.vel.x, wantX, 2.5, dt);
    e.vel.z = damp(e.vel.z, wantZ, 2.5, dt);
    e.pos.x += e.vel.x * dt;
    e.pos.z += e.vel.z * dt;
    const hover = e.orbitAltitude + Math.sin(ctx.time * def.orbitBobHz + e.id * 1.7) * def.orbitBobAmp;
    e.pos.y = damp(e.pos.y, hover, 2.6, dt);

    _planetTarget.set(p.pos.x, p.eyeY, p.pos.z);
    e.aimDir.subVectors(_planetTarget, e.pos);
    const distance = e.aimDir.length();
    if (distance > 1e-5) e.aimDir.multiplyScalar(1 / distance);
    else e.aimDir.set(0, -1, 0);

    if (e.staggerT > 0) {
      e.staggerT = Math.max(0, e.staggerT - dt);
      e.telegraphCharge = 0;
      e.committed = false;
    } else if (e.state === 'approach') {
      e.stateT += dt;
      e.telegraphCharge = 0;
      if (e.attackGrace <= 0 && e.attackCd <= 0 && e.stateT > 0.6
          && distance >= def.engage[0] && distance <= def.engage[1]
          && commitCount() < MAX_ATTACKERS && planetCommitCount() < 1
          && planetLineOfSight(e)) {
        e.state = 'windup'; e.stateT = 0; e.committed = true;
        ctx.bus.emit('enemy:telegraph', {
          id: e.id, species: e.species, pos: e.pos, kind: 'planetBolt',
        });
      }
    } else if (e.state === 'windup') {
      e.stateT += dt;
      e.telegraphCharge = clamp01(e.stateT / def.telegraph);
      if (e.stateT >= def.telegraph) {
        if (!planetLineOfSight(e) || distance < def.engage[0] || distance > def.engage[1]) {
          e.state = 'recover'; e.stateT = 0; e.committed = false;
        } else {
          e.state = 'attack'; e.stateT = 0; e.struck = false;
          ctx.bus.emit('enemy:attack', {
            id: e.id, species: e.species, pos: e.pos, kind: 'planetBolt',
          });
        }
        e.telegraphCharge = 0;
      }
    } else if (e.state === 'attack') {
      e.stateT += dt;
      if (!e.struck && e.stateT >= def.releaseAt) {
        e.struck = true;
        _planetOrigin.copy(e.pos).addScaledVector(e.aimDir, 1.92);
        _planetTarget.set(p.pos.x, p.eyeY, p.pos.z);
        firePlanetBolt(_planetOrigin, _planetTarget, p.vel);
        e.firePulse = 1;
        ctx.bus.emit('enemy:planet-bolt', { species: 'planet', kind: 'planet', pos: e.pos });
      }
      if (e.stateT >= def.attack) { e.state = 'recover'; e.stateT = 0; }
    } else if (e.state === 'recover') {
      e.stateT += dt;
      e.committed = false;
      if (e.stateT >= def.recover) {
        e.state = 'approach'; e.stateT = 0; e.attackCd = 0.65;
      }
    }

    const b = e.built;
    b.group.position.copy(e.pos);
    b.group.rotation.set(0, 0, 0);
    b.animate(b.parts, {
      time: ctx.time + e.id,
      aimDir: e.aimDir,
      charge: e.telegraphCharge || 0,
      firePulse: e.firePulse,
      coil: e.telegraphCharge || 0,
      moveAmp: 0,
      gait: 0,
      bank: 0,
      swing: 0,
      ventOpen: 0,
    });
  }

  function updateEnemy(e, dt, snapN) {
    const p = ctx.systems.player;
    const def = e.def;
    const distToPlayer = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);

    e.flinchT += dt;
    e.windowT += dt;
    if (e.windowT > STAGGER_WINDOW) e.windowDmg = 0;
    e.immuneT = Math.max(0, e.immuneT - dt);
    e.attackCd = Math.max(0, e.attackCd - dt);
    if (e.flashT !== undefined && e.flashT < 0.2) {
      e.flashT += dt;
      if (e.flashT >= 0.06) {
        for (let i = 0; i < e.built.glowMats.length; i++) e.built.glowMats[i].emissiveIntensity = e.glowBase[i] * (e.telegraphCharge ? 1 + e.telegraphCharge * 2.4 : 1);
      }
    }

    // vocal cadence — never mid-attack
    e.vocalT -= dt;
    if (e.vocalT <= 0 && e.state !== 'windup' && e.state !== 'attack' && e.staggerT <= 0) {
      e.vocalT = (e.species === 'thrall' ? 5.5 : e.species === 'warden' ? 11 : 8) * (0.7 + rng.next() * 0.6) / 2.6;
      ctx.bus.emit('enemy:vocal', { species: e.species, pos: e.pos });
    }

    // warden vent duty cycle — the animal does not control it
    if (e.species === 'warden') {
      e.ventT = (e.ventT + dt) % def.ventCycle;
      e.ventOpen = e.ventT < def.ventOpen;
      e.built.ventMat.emissiveIntensity = e.ventOpen ? 2.9 : 0.55;
    }

    if (def.flying) {
      updatePlanet(e, dt);
      return;
    }

    // stagger lock
    if (e.staggerT > 0) {
      e.staggerT -= dt;
      e.vel.x = damp(e.vel.x, 0, 8, dt);
      e.vel.z = damp(e.vel.z, 0, 8, dt);
      e.telegraphCharge = 0;
    } else {
      switch (e.state) {
        case 'approach': {
          // target: ring slot around the player, or a ramp waypoint when the
          // player is on another tier (the deck is ONLY reachable by ramp)
          const standoff = e.enraged ? Math.min(def.standoff, 6) : def.standoff;
          const routing = tierWaypoint(e, p.pos.y, dt);
          if (!routing) {
            const slotA = e.slotSeed;
            _tgt.set(
              p.pos.x + Math.cos(slotA) * standoff,
              0,
              p.pos.z + Math.sin(slotA) * standoff,
            );
          }
          _to.set(_tgt.x - e.pos.x, 0, _tgt.z - e.pos.z);
          const toLen = _to.length();
          if (toLen > 0.6) _to.divideScalar(toLen); else _to.set(0, 0, 0);

          // thrall burst gait: 600 ms move / 350 ms pause; attack only in a pause
          let want = def.speed;
          if (def.burstMs < 100) {
            e.burstT += dt;
            // The stalemate breaker increases persistence, never top speed.
            const pause = e.enraged && e.species === 'thrall' ? 0.15 : def.pauseMs;
            const cycle = def.burstMs + pause;
            e.moving = (e.burstT % cycle) < def.burstMs;
            if (!e.moving) want = 0;
          } else e.moving = true;
          // a chorister backing off only matters when it can actually shoot;
          // while routing a ramp it commits to the climb
          if (e.species === 'chorister' && !e.enraged && !e.routing && distToPlayer < def.minRange) {
            _to.negate();
            want = def.speed * 0.8;
          }
          // routing enemies walk their line; no burst pauses on a ramp
          if (e.routing) { e.moving = true; want = def.speed; }

          // separation from the frozen snapshot — capped, not speed-scaled
          _sep.set(0, 0, 0);
          for (let i = 0; i < snapN; i++) {
            const dx = e.pos.x - snapX[i], dz = e.pos.z - snapZ[i];
            const d2 = dx * dx + dz * dz;
            const minD = e.def.radius + snapR[i] + 0.3;
            if (d2 > 1e-6 && d2 < minD * minD) {
              const d = Math.sqrt(d2);
              _sep.x += (dx / d) * (minD - d);
              _sep.z += (dz / d) * (minD - d);
            }
          }
          _sep.clampLength(0, 2.5);
          // On authored climbs, radial/lateral shoves walk bodies into solid
          // rails. Project onto the route tangent so a dense pack queues along
          // the path while still preserving physical separation.
          if (onRamp(e.pos.x, e.pos.z)) _sep.z *= 0.15;
          if (onSpiral(e.pos.x, e.pos.z, e.pos.y)) {
            const rr = Math.hypot(e.pos.x, e.pos.z) || 1;
            const tx = -e.pos.z / rr, tz = e.pos.x / rr;
            const along = _sep.x * tx + _sep.z * tz;
            _sep.x = tx * along;
            _sep.z = tz * along;
          }

          const desiredX = _to.x * want + _sep.x * 2.2;
          const desiredZ = _to.z * want + _sep.z * 2.2;
          let cappedX = desiredX, cappedZ = desiredZ;
          if (def.maxRunSpeed) {
            const desiredSpeed = Math.hypot(cappedX, cappedZ);
            if (desiredSpeed > def.maxRunSpeed) {
              const k = def.maxRunSpeed / desiredSpeed;
              cappedX *= k; cappedZ *= k;
            }
          }
          e.vel.x = damp(e.vel.x, cappedX, 9, dt);
          e.vel.z = damp(e.vel.z, cappedZ, 9, dt);
          // Attack motion is authored separately below. This cap applies only
          // inside ordinary approach/routing, including dense separation.
          if (def.maxRunSpeed) {
            const runSpeed = Math.hypot(e.vel.x, e.vel.z);
            if (runSpeed > def.maxRunSpeed) {
              const k = def.maxRunSpeed / runSpeed;
              e.vel.x *= k; e.vel.z *= k;
            }
          }

          // decide attacks (an enraged chorister fires from anywhere inside range)
          const inBand = e.enraged
            ? distToPlayer <= def.engage[1] + 2
            : distToPlayer >= def.engage[0] && distToPlayer <= def.engage[1] + 2;
          const paused = def.burstMs > 100 || !e.moving;
          // never commit to a melee swing at a target on another tier: the
          // enemy would stop dead on the ramp and whiff at thin air
          const reachable = e.species === 'chorister'
            ? true
            : Math.abs(p.pos.y - e.pos.y) < 2.5;
          if (inBand && paused && reachable && !e.routing
              && e.stateT > 0.4 && commitCount() < MAX_ATTACKERS) {
            if (e.species === 'thrall') {
              const clear = world.corridorClear(
                e.pos.x, e.pos.z, p.pos.x, p.pos.z, e.def.radius * 0.45, e.pos.y, 0.02,
              );
              if (distToPlayer <= def.lungeRange && e.attackCd <= 0 && clear) {
                e.attackKind = 'lunge';
                e.attackCd = def.lungeCooldown;
                e.state = 'windup'; e.stateT = 0; e.committed = true;
                ctx.bus.emit('enemy:telegraph', { id: e.id, species: e.species, pos: e.pos, kind: e.attackKind });
              }
            } else if (e.species === 'warden' && distToPlayer < def.strikeRange + 0.6) {
              e.attackKind = 'sweep';
              e.state = 'windup'; e.stateT = 0; e.committed = true;
              ctx.bus.emit('enemy:telegraph', { id: e.id, species: e.species, pos: e.pos, kind: 'sweep' });
            } else if (e.species === 'chorister' && distToPlayer > def.minRange) {
              e.attackKind = 'bolt';
              e.state = 'windup'; e.stateT = 0; e.committed = true;
              ctx.bus.emit('enemy:telegraph', { id: e.id, species: e.species, pos: e.pos, kind: 'bolt' });
            }
          }
          break;
        }
        case 'windup': {
          e.stateT += dt;
          e.vel.x = damp(e.vel.x, 0, 10, dt);
          e.vel.z = damp(e.vel.z, 0, 10, dt);
          e.telegraphCharge = clamp01(e.stateT / def.telegraph);
          for (let i = 0; i < e.built.glowMats.length; i++) {
            e.built.glowMats[i].emissiveIntensity = e.glowBase[i] * (1 + e.telegraphCharge * 2.4);
          }
          if (e.stateT >= def.telegraph) {
            // telegraph done — commit. If the player left range, CANCEL, never chase-strike.
            const d2p = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
            if (e.attackKind !== 'bolt' && d2p > def.engage[1] * 1.4 + 4) {
              e.state = 'recover'; e.stateT = 0; e.committed = false;
            } else {
              e.state = 'attack'; e.stateT = 0; e.struck = false;
              if (e.attackKind === 'lunge') {
                e.attackDir.set(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z).normalize();
              }
              ctx.bus.emit('enemy:attack', { id: e.id, species: e.species, pos: e.pos, kind: e.attackKind });
            }
            e.telegraphCharge = 0;
            for (let i = 0; i < e.built.glowMats.length; i++) e.built.glowMats[i].emissiveIntensity = e.glowBase[i];
          }
          break;
        }
        case 'attack': {
          e.stateT += dt;
          const d2p = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
          if (e.attackKind === 'lunge') {
            const k = def.lungeSpeed * (0.25 + 0.75 * Math.pow(clamp01(e.stateT / def.lungeMs), 2));
            e.vel.x = e.attackDir.x * k; e.vel.z = e.attackDir.z * k;
            const clear = world.corridorClear(
              e.pos.x, e.pos.z, p.pos.x, p.pos.z, e.def.radius * 0.35, e.pos.y, 0.01,
            );
            if (!e.struck && clear && d2p < 1.25 + p.radius) {
              e.struck = true;
              p.hurt(def.dmg, e.attackDir);
              ctx.bus.emit('enemy:strike', { id: e.id, species: e.species });
            }
            if (e.stateT >= def.lungeMs) { e.state = 'recover'; e.stateT = 0; }
          } else if (e.attackKind === 'sweep') {
            if (!e.struck && e.stateT >= def.strikeAt) {
              e.struck = true;
              _to.set(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z);
              const facing = Math.atan2(-_to.x, -_to.z);
              let dd = facing - e.yaw;
              while (dd > Math.PI) dd -= TAU;
              while (dd < -Math.PI) dd += TAU;
              if (d2p < def.strikeRange + p.radius && Math.abs(dd) < 1.0) {
                p.hurt(def.dmg, _to.normalize());
              }
              ctx.bus.emit('enemy:strike', { id: e.id, species: e.species });
            }
            if (e.stateT >= def.attack) { e.state = 'recover'; e.stateT = 0; }
          } else if (e.attackKind === 'bolt') {
            if (!e.struck && e.stateT >= def.releaseAt) {
              e.struck = true;
              _c.set(e.pos.x, e.pos.y + 1.62, e.pos.z);
              _projectileTarget.set(
                p.pos.x,
                world.groundAt(p.pos.x, p.pos.z, p.pos.y + 1) + 0.6,
                p.pos.z,
              );
              fireBolt(_c, _projectileTarget, p.vel);
              ctx.bus.emit('enemy:bolt', { pos: e.pos, species: e.species, kind: 'chorister' });
            }
            if (e.stateT >= def.attack) { e.state = 'recover'; e.stateT = 0; }
          }
          break;
        }
        case 'recover': {
          e.stateT += dt;
          e.committed = false;
          e.vel.x = damp(e.vel.x, 0, 6, dt);
          e.vel.z = damp(e.vel.z, 0, 6, dt);
          if (e.stateT >= def.recover) { e.state = 'approach'; e.stateT = 0; e.burstT = 0; }
          break;
        }
      }
      if (e.state === 'approach') e.stateT += dt;
    }

    // ---- integrate + collide + ground-follow (damped, never snapped)
    e.pos.x += e.vel.x * dt;
    e.pos.z += e.vel.z * dt;
    world.collideCircle(e.pos, def.radius, e.vel, e.pos.y);
    const g = world.groundAt(e.pos.x, e.pos.z, e.pos.y + 1.7);
    if (e.airborne) {
      e.vel.y -= 15.8 * dt;
      e.pos.y += e.vel.y * dt;
      if (e.pos.y <= g && e.vel.y <= 0) {
        e.pos.y = g;
        e.airborne = false;
        e.vel.y = 0;
        ctx.bus.emit('enemy:land', { species: e.species, pos: e.pos });
      }
    } else {
      e.pos.y = Math.abs(e.pos.y - g) > 2.5 ? g : damp(e.pos.y, g, 16, dt);
    }

    // facing
    const spd = Math.hypot(e.vel.x, e.vel.z);
    if (e.state === 'windup' || e.state === 'attack' || spd < 0.5) {
      const face = Math.atan2(-(p.pos.x - e.pos.x), -(p.pos.z - e.pos.z));
      e.yaw = dampAngle(e.yaw, face, 6, dt);
    } else if (spd > 0.5) {
      e.yaw = dampAngle(e.yaw, Math.atan2(-e.vel.x, -e.vel.z), 9, dt);
    }

    // Cross-tier routes recover by deterministic replanning above. The old
    // random relocation could never help an under-deck enemy because those
    // enemies are generally within its >22 m trigger. Keep a certified,
    // deterministic last resort only for genuinely remote same-tier walkers.
    if (e.routing) {
      e.stallT = 0;
      e.stallPos.copy(e.pos);
    } else {
      e.stallT += dt;
      if (e.stallT > 9) {
        if (e.pos.distanceTo(e.stallPos) < 1.5 && distToPlayer > 22) {
          for (let i = 0; i < 12; i++) {
            const a = e.slotSeed + i * 2.399963229728653;
            const x = p.pos.x + Math.cos(a) * 20;
            const z = p.pos.z + Math.sin(a) * 20;
            const y = world.terrainHeight(x, z);
            if (!world.canOccupyCircle(x, z, def.radius, y, 0.25)) continue;
            e.pos.set(x, world.groundAt(x, z, 200), z);
            e.vel.set(0, 0, 0);
            e.relocations++;
            ctx.bus.emit('enemy:relocate', { id: e.id, species: e.species, pos: e.pos });
            break;
          }
        }
        e.stallT = 0;
        e.stallPos.copy(e.pos);
      }
    }

    // ---- drive the mesh
    const b = e.built;
    b.group.position.copy(e.pos);
    b.group.rotation.y = e.yaw;
    e.gait += spd * dt * (e.species === 'thrall' ? 2.6 : 1.6);
    const bank = clamp((e.prevYaw !== undefined ? (e.yaw - e.prevYaw) / Math.max(dt, 1e-4) : 0) * -0.12, -0.5, 0.5);
    e.prevYaw = e.yaw;
    let swing = 0;
    if (e.species === 'warden') {
      if (e.state === 'windup') swing = -e.telegraphCharge * 0.5;
      else if (e.state === 'attack' && e.attackKind === 'sweep') swing = lerp(-0.5, 0.9, clamp01(e.stateT / def.attack));
    }
    b.animate(b.parts, {
      time: ctx.time + e.id,
      gait: e.gait,
      moveAmp: clamp01(spd / def.speed),
      coil: e.state === 'windup' ? e.telegraphCharge * 0.6 : 0,
      bank,
      swing,
      ventOpen: e.ventOpen ? 1 : 0,
    });
    // stagger + flinch read on the body
    if (e.staggerT > 0) {
      b.group.position.y = e.pos.y - 0.26 * Math.sin(Math.PI * clamp01(1 - e.staggerT / STAGGER_T));
      b.group.rotation.z = Math.sin(e.staggerT * 34) * 0.08;
    } else {
      b.group.rotation.z = 0;
    }
    if (e.flinchT < 0.35) {
      const f = e.flinchT < 0.09 ? e.flinchT / 0.09 : 1 - (e.flinchT - 0.09) / 0.26;
      b.group.position.addScaledVector(e.flinch, f);
    }
  }

  function updateCorpse(e, dt) {
    e.deathT += dt;
    const b = e.built;
    if (e.airborne || e.pos.y > world.terrainHeight(e.pos.x, e.pos.z) + 0.05) {
      e.vel.y -= 15.8 * dt;
      e.pos.addScaledVector(e.vel, dt);
      const g = world.groundAt(e.pos.x, e.pos.z, e.pos.y + 1);
      if (e.pos.y <= g) { e.pos.y = g; e.airborne = false; e.vel.multiplyScalar(0.3); }
    }
    b.group.position.copy(e.pos);
    const fall = clamp01(e.deathT / 0.55);
    b.group.rotation.z = fall * (Math.PI / 2) * (e.deathSpin > 0 ? 1 : -1) * 0.92;
    b.group.rotation.y = e.yaw + e.deathSpin * Math.min(e.deathT, 0.5);
    b.group.position.y = e.pos.y + 0.2 * (1 - fall);
    // the 2.6 s glow decay — dead reads across the basin
    const glow = Math.max(0, 1 - e.deathT / 2.6);
    for (let i = 0; i < b.glowMats.length; i++) {
      b.glowMats[i].emissiveIntensity = e.glowBase[i] * glow * glow;
    }
    // A siege moon has already fallen from 28–34 m and completed its full
    // 2.6 s glow death long before this point. Return that scarce two-actor
    // pool after the physical fall instead of reserving it for the grounded
    // roster's 45 s battlefield-history window; late Watch VIII/IX kills can
    // otherwise starve the next wave's authored sky order.
    if (e.species === 'planet' && e.deathT > 8) {
      release(e);
      return;
    }
    if (e.deathT > 45) {
      b.group.position.y -= dt * 0.33;      // sink, never pop
      if (e.deathT > 46.2) release(e);
    }
  }

  return {
    id: 'enemies',
    spawn,
    raycast,
    damage: damageEnemy,
    all,
    get aliveCount() { return all.reduce((n, e) => n + (e.alive ? 1 : 0), 0); },
    reset() {
      for (const e of all) release(e);
      for (const b of boltState) b.live = false;
    },
    warmup() {
      // one of each species visible for the boot shader compile
      for (const s of Object.keys(POOL)) {
        const e = all.find(o => o.species === s);
        e.built.group.visible = true;
        e.built.group.position.set(0, -60, 0);
      }
    },
    cooldownWarmup() {
      for (const e of all) if (!e.alive) e.built.group.visible = false;
    },

    update(dt) {
      const p = ctx.systems.player;

      // stalemate breaker: nothing spawning, nothing dying, a straggler
      // holding the wave hostage -> the fight comes to the player (and so
      // does its ammo drop). Telegraph law still holds; only urgency changes.
      const alive = this.aliveCount;
      const queued = ctx.systems.director?.queued ?? 0;
      if (alive > 0 && alive <= 3 && queued === 0 && ctx.time - lastProgress > 15) {
        for (const e of all) {
          if (e.alive && !e.enraged) {
            e.enraged = true;
            ctx.bus.emit('enemy:enrage', { id: e.id, species: e.species, pos: e.pos });
          }
        }
      }

      // frozen separation snapshot
      let n = 0;
      for (const e of all) {
        if (e.alive && !e.def.flying && n < 64) {
          snapX[n] = e.pos.x; snapZ[n] = e.pos.z; snapR[n] = e.def.radius;
          n++;
        }
      }
      for (const e of all) {
        if (e.alive) updateEnemy(e, dt, n);
        else if (e.state === 'corpse') updateCorpse(e, dt);
      }

      // pooled chorister/planet projectiles. Planet rounds are straight and
      // non-homing; the previous-to-current sweep makes every registered rail,
      // floor, and core meaningful cover even on a clamped 50 ms frame.
      let dirty = false;
      for (let i = 0; i < BOLT_POOL; i++) {
        const b = boltState[i];
        if (!b.live) {
          _m4.makeScale(0, 0, 0);
          bolts.setMatrixAt(i, _m4); boltRings.setMatrixAt(i, _m4);
          dirty = true; continue;
        }
        b.age += dt;
        b.prev.copy(b.pos);
        b.vel.y -= b.gravity * dt;
        b.pos.addScaledVector(b.vel, dt);
        _boltTravel.subVectors(b.pos, b.prev);
        const travel = _boltTravel.length();
        let worldT = Infinity;
        if (travel > 1e-6) {
          _boltTravel.multiplyScalar(1 / travel);
          const cHit = world.rayColliders(b.prev, _boltTravel, travel);
          const gHit = world.marchGround(b.prev, _boltTravel, cHit ? cHit.t : travel);
          if (cHit) worldT = cHit.t;
          if (gHit) worldT = Math.min(worldT, gHit.t);
        }
        const pcx = p.pos.x, pcy = p.pos.y + 0.9, pcz = p.pos.z;
        const sx = b.pos.x - b.prev.x, sy = b.pos.y - b.prev.y, sz = b.pos.z - b.prev.z;
        const ll = sx * sx + sy * sy + sz * sz;
        const playerU = ll > 1e-8 ? clamp(
          ((pcx - b.prev.x) * sx + (pcy - b.prev.y) * sy + (pcz - b.prev.z) * sz) / ll,
          0, 1,
        ) : 0;
        const qx = b.prev.x + sx * playerU, qy = b.prev.y + sy * playerU, qz = b.prev.z + sz * playerU;
        const pdx = pcx - qx, pdy = pcy - qy, pdz = pcz - qz;
        const playerT = playerU * travel;
        const hitPlayer = pdx * pdx + pdy * pdy + pdz * pdz < b.radius * b.radius
          && playerT <= worldT + 1e-4;
        const hitWorld = worldT <= travel + 1e-4;
        if (hitWorld || hitPlayer || b.age > b.maxAge) {
          if (hitWorld && travel > 1e-6) b.pos.copy(b.prev).addScaledVector(_boltTravel, worldT);
          b.live = false;
          ctx.systems.fx.impact('energy', b.pos, _up, b.kind === 'planet' ? 1.85 : 1.4);
          if (hitPlayer) {
            _hurtDir.set(b.pos.x - p.pos.x, 0, b.pos.z - p.pos.z).normalize();
            p.hurt(b.damage, _hurtDir);
          }
          ctx.bus.emit('enemy:boltland', { pos: b.pos, hitPlayer, species: b.kind, kind: b.kind });
          continue;
        }
        const pulse = 1 + Math.sin(b.age * 21) * 0.2;
        const coreScale = pulse * b.scale;
        _m4.compose(b.pos, _q.identity(), _s1.set(coreScale, coreScale, coreScale));
        bolts.setMatrixAt(i, _m4);
        if (b.kind === 'planet') {
          _boltFacing.copy(b.vel).normalize();
          _q.setFromUnitVectors(_zAxis, _boltFacing);
          const ringScale = b.scale * (1.0 + Math.sin(b.age * 15) * 0.13);
          _m4.compose(b.pos, _q, _s1.set(ringScale, ringScale, ringScale));
          boltRings.setMatrixAt(i, _m4);
        } else {
          _m4.makeScale(0, 0, 0); boltRings.setMatrixAt(i, _m4);
        }
        dirty = true;
      }
      if (dirty) {
        bolts.instanceMatrix.needsUpdate = true;
        boltRings.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
