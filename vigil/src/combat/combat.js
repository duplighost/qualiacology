// Combat: ballistics resolution + feedback state. The weapon owns the
// trigger; this file resolves what a fired ray hits (enemies first, then
// world), applies damage bands/zones, routes ALL feedback through fx.impact
// and the marker machine, runs the kill chain, and owns the ammo-from-kills
// economy. THE ONE LAW: every connecting shot removes >=1 hp and lights its
// target >=0.35 s — deflected never reads as ghosted.

import * as THREE from 'three';
import { TAU, clamp, clamp01, lerp } from '../engine/math.js';

const BANDS = [[26, 34], [44, 28], [70, 24], [Infinity, 20]];  // [maxRange, dmg], 2 m blends
const ZONES = { head: 1.60, torso: 1.00, limb: 0.85, plate: 0.55, vent: 2.40 };
const MARK_RANK = { normal: 0, deflect: 1, head: 2, weak: 3, kill: 4 };
const DROPS = { thrall: 14, chorister: 20, warden: 40, planet: 28 };
const MAX_DROPS = 16;

function bandDamage(dist) {
  for (let i = 0; i < BANDS.length; i++) {
    const [max, dmg] = BANDS[i];
    if (dist <= max - 2 || i === BANDS.length - 1) return dmg;
    if (dist <= max + 2) {
      const next = BANDS[i + 1][1];
      return lerp(dmg, next, (dist - (max - 2)) / 4);
    }
  }
  return BANDS[BANDS.length - 1][1];
}

export function create(ctx) {
  // NB: enemies is constructed AFTER combat in the SYSTEMS manifest, so it
  // must be read lazily at call time — never captured here.
  const _muzzle = new THREE.Vector3(), _n = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3();
  const _meleePoint = new THREE.Vector3(), _meleeNormal = new THREE.Vector3();
  let marker = null;               // {kind, age, strength, hpFrac}
  let markerTimes = [];

  /* ---------------- ammo drops (pooled, homing) ---------------- */
  const dropGeo = new THREE.OctahedronGeometry(0.16, 0);
  const dropMat = new THREE.MeshStandardMaterial({
    color: 0x11333f, roughness: 0.4, metalness: 0.3,
    emissive: 0x35dfff, emissiveIntensity: 2.1,
  });
  const drops = new THREE.InstancedMesh(dropGeo, dropMat, MAX_DROPS);
  drops.frustumCulled = false;
  ctx.scene.add(drops);
  const dropState = [];
  for (let i = 0; i < MAX_DROPS; i++) dropState.push({ live: false, age: 0, amount: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3() });
  let dropCursor = 0;
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);

  function spawnDrop(point, dir, amount) {
    const d = dropState[dropCursor];
    dropCursor = (dropCursor + 1) % MAX_DROPS;
    d.live = true; d.age = 0; d.amount = amount;
    d.pos.copy(point);
    d.vel.copy(dir).multiplyScalar(2.6);
    d.vel.y = Math.max(d.vel.y, 1.4);
  }

  function setMarker(kind, strength, hpFrac) {
    const now = ctx.time;
    markerTimes.push(now);
    while (markerTimes.length && now - markerTimes[0] > 0.4) markerTimes.shift();
    if (marker && marker.age < 0.21 && MARK_RANK[marker.kind] > MARK_RANK[kind]) return;
    marker = { kind, age: 0, strength, hpFrac };
    ctx.bus.emit('combat:marker', { kind, strength, hpFrac, dense: markerTimes.length >= 3 });
  }

  /* ---------------- the shot ---------------- */
  ctx.bus.on('weapon:fire', ({ dir, origin, tracer, boosted = false, damageMult = 1, tracerPower = 1 }) => {
    const world = ctx.systems.world;
    const enemies = ctx.systems.enemies;
    const MAXT = 300;

    const eHit = enemies.raycast(origin, dir, MAXT);
    const cHit = world.rayColliders(origin, dir, eHit ? eHit.t : MAXT);
    const gHit = world.marchGround(origin, dir, cHit ? cHit.t : (eHit ? eHit.t : MAXT));

    // muzzle world point for the tracer (the ray left the eye; the tracer is
    // dressing that appears to leave the barrel)
    const cam = ctx.systems.camera;
    _muzzle.copy(origin)
      .addScaledVector(_v.set(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)), 0.55)
      .addScaledVector(_v.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)), 0.14);
    _muzzle.y -= 0.1;

    let endT = MAXT;
    if (gHit) endT = gHit.t;
    if (cHit) endT = Math.min(endT, cHit.t);
    if (eHit) endT = Math.min(endT, eHit.t);

    if (tracer) ctx.systems.fx.tracer(_muzzle, dir, Math.max(endT - 0.4, 2), tracerPower);

    if (eHit && eHit.t <= endT + 0.01) {
      const dist = eHit.t;
      const zoneMult = ZONES[eHit.zone] ?? 1;
      let dmg = bandDamage(dist) * zoneMult * damageMult;
      dmg = Math.max(1, Math.round(dmg));          // THE ONE LAW: >= 1 hp, always
      const res = enemies.damage(eHit.enemy, dmg, { zone: eHit.zone, dir, point: eHit.point, dist });
      const deflected = eHit.zone === 'plate';
      const shotPower = boosted ? 1.30 : 1;
      // The siege-moon is readable by material as well as marker: crust
      // fractures like rock, while a placed aperture hit discharges energy.
      const impactKind = eHit.enemy.species === 'planet'
        ? (eHit.zone === 'vent' ? 'energy' : 'rock')
        : (deflected ? 'deflect' : 'flesh');
      ctx.systems.fx.impact(impactKind, eHit.point, _v.copy(dir).negate(), (deflected ? 0.7 : 1) * shotPower);
      if (res.killed) {
        setMarker('kill', dmg / 34, 0);
        ctx.systems.fx.hitstop(0.07);
        ctx.systems.fx.impact('death', eHit.point, _n, boosted ? 1.18 : 1);
        spawnDrop(eHit.point, dir, DROPS[res.species] ?? 16);
        ctx.bus.emit('combat:kill', { species: res.species, point: eHit.point, zone: eHit.zone, boosted, damage: dmg });
      } else {
        setMarker(deflected ? 'deflect' : eHit.zone === 'vent' ? 'weak' : eHit.zone === 'head' ? 'head' : 'normal', dmg / 34, res.hpFrac);
      }
      ctx.bus.emit('combat:hit', { zone: eHit.zone, deflected, dist, killed: res.killed, boosted, damage: dmg, damageMult });
      return;
    }
    if (cHit && (!gHit || cHit.t <= gHit.t)) {
      ctx.systems.fx.impact(cHit.kind, cHit.point, _v.copy(dir).negate(), boosted ? 1.30 : 1);
      ctx.bus.emit('combat:surface', { kind: cHit.kind, point: cHit.point, boosted });
      return;
    }
    if (gHit) {
      ctx.systems.fx.impact(gHit.kind, gHit.point, _n, boosted ? 1.30 : 1);
      ctx.bus.emit('combat:surface', { kind: gHit.kind, point: gHit.point, boosted });
    }
  });

  return {
    id: 'combat',
    get marker() { return marker; },

    /**
     * Melee damage resolution. The weapon owns the swing and the target lock;
     * this owns damage + feedback, so there is exactly one path into each.
     * Flat damage, no zone multipliers — a buttstroke is not aimed.
     */
    meleeStrike(enemy, damage) {
      _v.set(enemy.pos.x - ctx.systems.player.pos.x, 0, enemy.pos.z - ctx.systems.player.pos.z).normalize();
      _meleePoint.set(
        enemy.pos.x - _v.x * enemy.def.radius,
        enemy.pos.y + enemy.def.height * 0.5,
        enemy.pos.z - _v.z * enemy.def.radius,
      );
      const res = ctx.systems.enemies.damage(enemy, damage, { zone: 'torso', dir: _v, point: _meleePoint, dist: 2 });
      ctx.systems.fx.impact('meleeFlesh', _meleePoint, _meleeNormal.copy(_v).negate(), 1.75);
      ctx.systems.camera.addTrauma(0.28);
      if (res.killed) {
        setMarker('kill', damage / 34, 0);
        ctx.systems.fx.impact('death', _meleePoint, _n, 1);
        spawnDrop(_meleePoint, _v, DROPS[res.species] ?? 16);
        ctx.bus.emit('combat:kill', { species: res.species, point: _meleePoint, zone: 'melee' });
      } else {
        setMarker('normal', damage / 34, res.hpFrac);
      }
      ctx.bus.emit('combat:melee', {
        outcome: 'enemy', killed: res.killed, species: res.species,
        damage, point: _meleePoint,
      });
      return res;
    },

    /**
     * Resolve the butt against solid world geometry after enemy lock fails.
     * Technology owns the metal response even when its generic collider kind
     * predates the surface tag; natural colliders and terrain stay hard rock.
     */
    meleeSurface(origin, dir, range, damage = 130, damageReach = range) {
      const world = ctx.systems.world;
      const cHit = world.rayColliders(origin, dir, range);
      // marchGround samples every 0.7 m. Give it one look-ahead sample so a
      // short 2.05 m melee ray cannot end between samples, then enforce the
      // authored reach here before resolving anything.
      const marched = world.marchGround(origin, dir, range + 0.7);
      const gHit = marched && marched.t <= range ? marched : null;
      let hit = null;
      if (cHit && (!gHit || cHit.t <= gHit.t)) {
        hit = cHit;
        const technology = cHit.kind === 'metal'
          || cHit.collider?.surface === 'metal'
          || cHit.collider?.kind === 'field-bastion';
        hit.kind = technology ? 'metal' : 'rock';
        const isBreakable = cHit.collider?.breakableId !== undefined;
        // Breakables own their one rock burst so a crack/break does not also
        // pay the generic surface impact cost. The assisted target trace may
        // remain longer than the physical buttstroke to preserve cover, but
        // only a collider inside the authored reach may take melee damage.
        if (!isBreakable) {
          ctx.systems.fx.impact(hit.kind, hit.point, _meleeNormal.copy(dir).negate(), 1.25);
        }
        if (isBreakable && cHit.t <= damageReach + 1e-4) {
          hit.breakable = world.strikeBreakable?.(
            cHit.collider, damage, hit.point, _meleeNormal.copy(dir).negate(),
          ) || null;
        }
      } else if (gHit) {
        hit = gHit;
        ctx.systems.fx.impact(hit.kind, hit.point, _n, 1.18);
      }
      if (hit) ctx.bus.emit('combat:melee:surface', {
        kind: hit.kind, point: hit.point, breakable: hit.breakable || null,
      });
      return hit;
    },
    reset() {
      marker = null;
      markerTimes.length = 0;
      for (const d of dropState) d.live = false;
    },

    update(dt) {
      if (marker) {
        marker.age += dt;
        if (marker.age > (marker.kind === 'kill' ? 0.26 : 0.21)) marker = null;
      }

      // drops: 0.28 s free flight, then home on the player from 26 m
      const p = ctx.systems.player;
      const world = ctx.systems.world;
      const wep = ctx.systems.weapons;
      let dirty = false;
      for (let i = 0; i < MAX_DROPS; i++) {
        const d = dropState[i];
        if (!d.live) { _m4.makeScale(0, 0, 0); drops.setMatrixAt(i, _m4); dirty = true; continue; }
        d.age += dt;
        if (d.age > 45) { d.live = false; continue; }
        _v.set(p.pos.x - d.pos.x, p.pos.y + 1.0 - d.pos.y, p.pos.z - d.pos.z);
        const dist = _v.length();
        // seek from 26 m — in a horde you are always retreating; ammo that
        // waits where the corpse fell is ammo you never get
        if (d.age > 0.28 && dist < 26) {
          const speed = lerp(6, 17, clamp01((26 - dist) / 22)) + (d.age > 3 ? 8 : 0);
          d.vel.lerp(_v.normalize().multiplyScalar(speed), 1 - Math.exp(-6 * dt));
        } else {
          d.vel.y -= 9 * dt;
        }
        d.pos.addScaledVector(d.vel, dt);
        const g = world.groundAt(d.pos.x, d.pos.z, d.pos.y + 1);
        if (d.pos.y < g + 0.15) { d.pos.y = g + 0.15; if (d.vel.y < 0) d.vel.y *= -0.3; }
        if (dist < 0.85) {
          d.live = false;
          const got = wep.addReserve(d.amount);
          ctx.bus.emit('combat:pickup', { amount: got });
        }
        _q.setFromAxisAngle(_n, (d.age * 2.2) % TAU);
        const pulse = 1 + Math.sin(d.age * 6) * 0.12;
        _m4.compose(d.pos, _q, _s.set(pulse, pulse, pulse));
        drops.setMatrixAt(i, _m4);
        dirty = true;
      }
      if (dirty) drops.instanceMatrix.needsUpdate = true;
    },
  };
}
