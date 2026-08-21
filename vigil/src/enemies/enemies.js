// Enemy manager: boot-built pools (spawn allocates nothing), a small state
// machine per enemy, squad tokens (max 3 committed attackers, ONE rationed
// leap), separation from a frozen snapshot, damped vertical ground-follow
// (never hard-snapped — Eclipse's jitter), the telegraph law (>=320 ms, tell
// on a shootable part, audio on frame 1, late attacks CANCELLED), budgeted
// flinch, threshold staggers, and deaths that decay their glow over 2.6 s so
// dead-vs-alive reads across the whole field.

import * as THREE from 'three';
import { TAU, DEG, clamp, clamp01, lerp, damp, dampAngle } from '../engine/math.js';
import { SPECIES, BUILDERS } from './species.js';
import { CFG as RELAY, rampWaypoints, onRamp } from '../world/structure.js';

const POOL = { thrall: 20, warden: 3, chorister: 6 };
const MAX_ATTACKERS = 2;   // the token that makes a pack a rhythm, not a blender
const FLINCH_BUDGET = 0.180;
const STAGGER_T = 0.620, STAGGER_IMMUNITY = 2.2, STAGGER_WINDOW = 0.4;
const BOLT_POOL = 8;

export function create(ctx) {
  const scene = ctx.scene;
  const world = ctx.systems.world;
  const rng = ctx.rng.fork('enemies');
  const all = [];
  let leapGroupLast = -99;
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
        leapCd: 0, leapVel: new THREE.Vector3(), airborne: false,
        ventT: rng.next() * 4.5, ventOpen: false,
        staggerT: 0, immuneT: 0, windowDmg: 0, windowT: 0,
        flinchT: 99, flinch: new THREE.Vector3(),
        deathT: 0, deathSpin: 0, glowBase: null,
        vocalT: 2 + rng.next() * 6,
        stallT: 0, stallPos: new THREE.Vector3(),
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
  const boltState = [];
  for (let i = 0; i < BOLT_POOL; i++) boltState.push({ live: false, age: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3() });
  let boltCursor = 0;
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s1 = new THREE.Vector3(1, 1, 1);

  function fireBolt(from, target, lead) {
    const b = boltState[boltCursor];
    boltCursor = (boltCursor + 1) % BOLT_POOL;
    b.live = true; b.age = 0;
    b.pos.copy(from);
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

  /* ---------------- spawn / despawn ---------------- */
  function spawn(species, x, z, opts = {}) {
    const e = all.find(o => o.species === species && !o.alive && o.state !== 'corpse');
    if (!e) return null;
    e.alive = true;
    e.state = 'approach';
    e.stateT = 0;
    e.hp = e.def.hp * (opts.hpScale || 1);
    e.pos.set(x, world.groundAt(x, z, 200), z);
    e.vel.set(0, 0, 0);
    e.yaw = Math.atan2(-(ctx.systems.player.pos.x - x), -(ctx.systems.player.pos.z - z));
    e.committed = false; e.airborne = false;
    e.staggerT = 0; e.immuneT = 0; e.windowDmg = 0;
    e.flinchT = 99; e.deathT = 0;
    e.stallT = 0; e.stallPos.copy(e.pos);
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
      const mf = e.species === 'warden' ? 3 : e.species === 'chorister' ? 1.6 : 1;
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
  function raycast(origin, dir, maxT) {
    let best = null;
    for (const e of all) {
      if (!e.alive) continue;
      const cy = Math.cos(e.yaw), sy = Math.sin(e.yaw);
      for (const z of e.built.zones) {
        // zone center in world space (rotate local by yaw)
        _c.set(
          e.pos.x + z.x * cy + z.z * sy,
          e.pos.y + z.y,
          e.pos.z - z.x * sy + z.z * cy,
        );
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
   * Tier routing: the deck is only reachable by ramp, so an enemy whose
   * target is on another tier walks the ramp instead of grinding into the
   * structure's flank. Waypoints are a full body-length ahead (the Eclipse
   * lesson: lookahead shorter than a frame's travel fights damped velocity
   * and produces the jitter) and the corridor is held by clamping the
   * steering target, never by writing position.
   */
  const onDeckTier = (y) => y > RELAY.deckY - 1.5;

  function tierWaypoint(e, targetX, targetZ, targetY) {
    const wantHigh = onDeckTier(targetY);
    const amHigh = onDeckTier(e.pos.y);
    const mySign = onRamp(e.pos.x, e.pos.z);
    // Standing on the slope itself always routes to an end, even when the
    // tiers already match: turning side-on partway up only grinds a body into
    // a rail.
    const midSlope = mySign !== 0
      && e.pos.y > RELAY.rampFootY + 1.0
      && e.pos.y < RELAY.deckY - 1.5;
    // Same tier and not mid-climb: go straight at the target. Without this
    // release, anything that finished a climb parked at the ramp head forever
    // and the wave could never end.
    if (wantHigh === amHigh && !midSlope) return null;

    const sign = mySign !== 0 ? mySign : (e.pos.x >= 0 ? 1 : -1);
    const wp = rampWaypoints(sign);
    const ax = Math.abs(e.pos.x);
    // "lined up with the corridor" — the only state from which driving at the
    // far end of the ramp is safe; otherwise walk around to the open mouth.
    const aligned = Math.abs(e.pos.z) < RELAY.rampW / 2 - 0.5;
    if (wantHigh) {
      if (aligned && ax > RELAY.rampHead && ax < RELAY.rampFoot + 5) return wp.head;
      return wp.foot;
    }
    if (aligned && ax > RELAY.rampHead - 0.5) return wp.foot;
    return wp.head;
  }

  function commitCount() {
    let n = 0;
    for (const e of all) if (e.alive && e.committed) n++;
    return n;
  }

  function updateEnemy(e, dt, snapN) {
    const p = ctx.systems.player;
    const def = e.def;
    const distToPlayer = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);

    e.flinchT += dt;
    e.windowT += dt;
    if (e.windowT > STAGGER_WINDOW) e.windowDmg = 0;
    e.immuneT = Math.max(0, e.immuneT - dt);
    e.leapCd = Math.max(0, e.leapCd - dt);
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
          const wp = tierWaypoint(e, p.pos.x, p.pos.z, p.pos.y);
          e.routing = !!wp;
          if (wp) {
            _tgt.set(wp.x, 0, wp.z);
          } else {
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
          let want = def.speed * (e.enraged ? 1.45 : 1);
          if (def.burstMs < 100) {
            e.burstT += dt;
            const cycle = def.burstMs + def.pauseMs;
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
          // on a ramp, shoving sideways walks bodies into the rails — let the
          // queue form along the climb instead (resolve on velocity, never pos)
          if (onRamp(e.pos.x, e.pos.z)) _sep.z *= 0.15;

          const desiredX = _to.x * want + _sep.x * 2.2;
          const desiredZ = _to.z * want + _sep.z * 2.2;
          e.vel.x = damp(e.vel.x, desiredX, 9, dt);
          e.vel.z = damp(e.vel.z, desiredZ, 9, dt);

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
          if (inBand && paused && reachable && e.stateT > 0.4 && commitCount() < MAX_ATTACKERS) {
            if (e.species === 'thrall') {
              const wantLeap = distToPlayer > def.lungeRange && distToPlayer < 14
                && e.leapCd <= 0 && (ctx.time - leapGroupLast) > 4.5;
              if (wantLeap || distToPlayer <= def.lungeRange) {
                e.attackKind = wantLeap ? 'leap' : 'lunge';
                if (wantLeap) { leapGroupLast = ctx.time; e.leapCd = def.leapCdInd; }
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
              if (e.attackKind === 'leap') {
                const T = clamp(d2p / 12.6, 0.20, 0.48);
                e.leapVel.set(
                  (p.pos.x + p.vel.x * 0.26 - e.pos.x) / T, 0,
                  (p.pos.z + p.vel.z * 0.26 - e.pos.z) / T,
                );
                const dy = world.groundAt(p.pos.x, p.pos.z, p.pos.y + 1) - e.pos.y;
                e.leapVel.y = dy / T + 0.5 * 15.8 * T;
                e.airborne = true;
                e.vel.copy(e.leapVel);
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
            _to.set(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z).normalize();
            const k = def.lungeSpeed * (0.25 + 0.75 * Math.pow(clamp01(e.stateT / def.lungeMs), 2));
            e.vel.x = _to.x * k; e.vel.z = _to.z * k;
            if (!e.struck && d2p < 1.9 + p.radius) {
              e.struck = true;
              p.hurt(def.dmg, _to);
              ctx.bus.emit('enemy:strike', { id: e.id, species: e.species });
            }
            if (e.stateT >= def.lungeMs) { e.state = 'recover'; e.stateT = 0; }
          } else if (e.attackKind === 'leap') {
            if (!e.airborne) {
              if (!e.struck && d2p < 2.8) {
                e.struck = true;
                _to.set(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z).normalize();
                p.hurt(def.dmg, _to);
                ctx.bus.emit('enemy:strike', { id: e.id, species: e.species });
              }
              e.state = 'recover'; e.stateT = 0;
            }
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
              fireBolt(_c, new THREE.Vector3(p.pos.x, world.groundAt(p.pos.x, p.pos.z, p.pos.y + 1) + 0.6, p.pos.z), p.vel);
              ctx.bus.emit('enemy:bolt', { pos: e.pos });
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

    // stall watchdog: relocate a walker that has moved <1.5 m in 9 s while far
    e.stallT += dt;
    if (e.stallT > 9) {
      if (e.pos.distanceTo(e.stallPos) < 1.5 && distToPlayer > 22) {
        const a = rng.next() * TAU;
        e.pos.set(p.pos.x + Math.cos(a) * 20, 0, p.pos.z + Math.sin(a) * 20);
        e.pos.y = world.groundAt(e.pos.x, e.pos.z, 200);
      }
      e.stallT = 0;
      e.stallPos.copy(e.pos);
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
      coil: e.state === 'windup' ? e.telegraphCharge * (e.attackKind === 'leap' ? 1 : 0.6) : 0,
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
        if (e.alive && n < 64) {
          snapX[n] = e.pos.x; snapZ[n] = e.pos.z; snapR[n] = e.def.radius;
          n++;
        }
      }
      for (const e of all) {
        if (e.alive) updateEnemy(e, dt, n);
        else if (e.state === 'corpse') updateCorpse(e, dt);
      }

      // bolts
      let dirty = false;
      for (let i = 0; i < BOLT_POOL; i++) {
        const b = boltState[i];
        if (!b.live) { _m4.makeScale(0, 0, 0); bolts.setMatrixAt(i, _m4); dirty = true; continue; }
        b.age += dt;
        b.vel.y -= 12 * dt;
        b.pos.addScaledVector(b.vel, dt);
        const g = world.groundAt(b.pos.x, b.pos.z, b.pos.y + 1);
        const hitGround = b.pos.y <= g + 0.1;
        const dx = p.pos.x - b.pos.x, dy = (p.pos.y + 0.9) - b.pos.y, dz = p.pos.z - b.pos.z;
        const hitPlayer = dx * dx + dy * dy + dz * dz < 1.45;   // ~1.05 + pad: dodging, not luck
        if (hitGround || hitPlayer || b.age > 6) {
          b.live = false;
          ctx.systems.fx.impact('energy', b.pos, new THREE.Vector3(0, 1, 0), 1.4);
          if (hitPlayer) p.hurt(SPECIES.chorister.dmg, new THREE.Vector3(dx, 0, dz).normalize().negate());
          ctx.bus.emit('enemy:boltland', { pos: b.pos, hitPlayer });
          continue;
        }
        const pulse = 1 + Math.sin(b.age * 21) * 0.2;
        _m4.compose(b.pos, _q, _s1.set(pulse, pulse, pulse));
        bolts.setMatrixAt(i, _m4);
        dirty = true;
      }
      if (dirty) bolts.instanceMatrix.needsUpdate = true;
    },
  };
}
