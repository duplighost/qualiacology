// Melee-opened moonstone caches. Everything visual is built once and driven
// through four instanced pools: shells, fracture seams, reward cores, and
// shards. Runtime strikes only mutate scalar/vector state and instance
// matrices, so breaking a rock cannot compile a material or allocate geometry
// in the middle of a fight.

import * as THREE from 'three';
import { TAU, clamp01, lerp } from '../engine/math.js';
import { createLunarSurface } from '../gfx/surfaces.js';

const ROCK_HP = 250;
const REVEAL_AT = 0.70;
const HOME_AT = 1.45;       // guarantees at least 750 ms of readable core time
const HOME_RADIUS = 12;
const COLLECT_RADIUS = 0.72;
const SEAMS_PER_ROCK = 3;
const SHARDS_PER_ROCK = 6;

// Quadrants keep both tiers' main approach lines clear. The four upper sites
// avoid the +/-X ramp language and sit outside the central spiral/opening; the
// field sites stay inside the satellite crash ring and away from the old
// bastion placements.
export const BREAKABLE_ROCK_SITES = Object.freeze([
  Object.freeze({ x: 11.6, z: 12.0, size: 1.10, yaw: 0.18, tier: 'upper', reward: 'cinder' }),
  Object.freeze({ x: -13.8, z: 10.4, size: 1.06, yaw: 1.04, tier: 'upper', reward: 'aegis' }),
  Object.freeze({ x: -11.4, z: -13.6, size: 1.14, yaw: 2.02, tier: 'upper', reward: 'cinder' }),
  Object.freeze({ x: 14.5, z: -10.8, size: 1.08, yaw: 2.78, tier: 'upper', reward: 'aegis' }),
  Object.freeze({ x: 24.0, z: 25.0, size: 1.12, yaw: 0.52, tier: 'field', reward: 'cinder' }),
  Object.freeze({ x: -31.0, z: 27.0, size: 1.08, yaw: 1.38, tier: 'field', reward: 'aegis' }),
  Object.freeze({ x: -29.0, z: -35.0, size: 1.16, yaw: 2.34, tier: 'field', reward: 'cinder' }),
  Object.freeze({ x: 45.0, z: -28.0, size: 1.10, yaw: 3.16, tier: 'field', reward: 'aegis' }),
]);

const UP = new THREE.Vector3(0, 1, 0);
const ZERO_SCALE = new THREE.Vector3(0, 0, 0);

function resultValue(result, before, after, fallback = 0) {
  if (Number.isFinite(result)) return Math.max(0, result);
  if (result && Number.isFinite(result.value)) return Math.max(0, result.value);
  if (Number.isFinite(before) && Number.isFinite(after)) return Math.max(0, after - before);
  return result === true ? fallback : 0;
}

/**
 * Build the eight fixed moonstone geodes.
 *
 * The returned `group` must be added to the scene by the world owner. `place`
 * is expected to return its registered collider; the spec fallback keeps this
 * helper testable in isolation while the world placement API is being wired.
 */
export function buildBreakableRocks(ctx, { place, groundAt, terrainHeight }) {
  const root = new THREE.Group();
  root.name = 'breakable-moonstones';

  const lunar = createLunarSurface(0xb7ea4);
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xa4afbd,
    map: lunar.color,
    bumpMap: lunar.bump,
    bumpScale: 0.14,
    roughnessMap: lunar.roughness,
    roughness: 0.96,
    metalness: 0.035,
  });
  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x49dff2,
    roughness: 0.30,
    metalness: 0.30,
    emissive: 0x35dfff,
    emissiveIntensity: 3.15,
    flatShading: true,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xbdf8ff,
    roughness: 0.24,
    metalness: 0.42,
    emissive: 0x35dfff,
    emissiveIntensity: 3.1,
    flatShading: true,
  });

  const shellGeo = new THREE.DodecahedronGeometry(1, 0);
  const seamGeo = new THREE.BoxGeometry(1, 1, 1);
  const coreGeo = new THREE.OctahedronGeometry(0.24, 0);
  const shardGeo = new THREE.TetrahedronGeometry(0.24, 0);

  const shells = new THREE.InstancedMesh(shellGeo, shellMat, BREAKABLE_ROCK_SITES.length);
  const seams = new THREE.InstancedMesh(
    seamGeo, seamMat, BREAKABLE_ROCK_SITES.length * SEAMS_PER_ROCK,
  );
  const cores = new THREE.InstancedMesh(coreGeo, coreMat, BREAKABLE_ROCK_SITES.length);
  const shards = new THREE.InstancedMesh(
    shardGeo, shellMat, BREAKABLE_ROCK_SITES.length * SHARDS_PER_ROCK,
  );
  for (const mesh of [shells, seams, cores, shards]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  shells.name = 'moonstone-shells';
  seams.name = 'moonstone-fractures';
  cores.name = 'moonstone-upgrade-cores';
  shards.name = 'moonstone-shards';
  shells.castShadow = true;
  shells.receiveShadow = true;
  shards.castShadow = true;
  shards.receiveShadow = true;
  seams.frustumCulled = false;
  cores.frustumCulled = false;
  shards.frustumCulled = false;
  root.add(shells, seams, cores, shards);

  const states = [];
  const shardStates = [];
  const seamStates = [];
  const byId = new Map();
  const heightAt = (site) => {
    const terrainY = terrainHeight(site.x, site.z);
    if (site.tier !== 'upper' || typeof groundAt !== 'function') return terrainY;
    // A high eligibility value selects the new upper one-way surface.
    return groundAt(site.x, site.z, 200);
  };

  for (let i = 0; i < BREAKABLE_ROCK_SITES.length; i++) {
    const site = BREAKABLE_ROCK_SITES[i];
    const y = heightAt(site);
    const colliderSpec = {
      kind: 'breakable-rock',
      surface: 'rock',
      breakableId: i,
      active: true,
      x: site.x,
      z: site.z,
      // DodecahedronGeometry(1) reaches ~0.989 horizontally after the shell's
      // X/Z scaling. Match that silhouette so edge-directed melee cannot pass
      // through visible stone and bodies do not clip into its outer facets.
      r: site.size * 0.99,
      yMin: y - 0.18,
      yMax: y + site.size * 1.62,
    };
    const collider = place(colliderSpec) || colliderSpec;
    // Preserve these fields if an older/custom placement wrapper returned a
    // reduced object. World collision/ray code keys off the same properties.
    collider.breakableId = i;
    collider.surface = 'rock';
    collider.active = true;

    const state = {
      id: i,
      site,
      collider,
      x: site.x,
      y,
      z: site.z,
      size: site.size,
      hp: ROCK_HP,
      maxHp: ROCK_HP,
      phase: 'intact',        // intact | cracked | reward | collected
      cracked: false,
      hitT: 0,
      rewardAge: 0,
      rewardKind: site.reward,
      corePos: new THREE.Vector3(site.x, y + site.size * 0.88, site.z),
      coreVel: new THREE.Vector3(),
      coreBaseY: y + site.size * 1.02,
      homing: false,
      collected: false,
      shardStart: i * SHARDS_PER_ROCK,
    };
    states.push(state);
    byId.set(i, state);

    for (let j = 0; j < SEAMS_PER_ROCK; j++) {
      const a = site.yaw + j * TAU / SEAMS_PER_ROCK;
      seamStates.push({
        rock: state,
        angle: a,
        // Sit on the shell rather than inside its dodecahedral silhouette;
        // the old 0.72 radius made a correctly cracked cache read as a black
        // rock from ordinary combat distance.
        x: site.x + Math.cos(a) * site.size * 0.91,
        y: y + site.size * (0.67 + j * 0.055),
        z: site.z + Math.sin(a) * site.size * 0.91,
      });
    }
    for (let j = 0; j < SHARDS_PER_ROCK; j++) {
      const a = site.yaw + j * TAU / SHARDS_PER_ROCK;
      shardStates.push({
        rock: state,
        live: false,
        age: 99,
        life: 1.0 + j * 0.055,
        spin: (j % 2 ? -1 : 1) * (4.8 + j * 0.7),
        axis: new THREE.Vector3(Math.sin(a), 0.6 + (j % 3) * 0.16, Math.cos(a)).normalize(),
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        q: new THREE.Quaternion(),
      });
    }
  }

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const toPlayer = new THREE.Vector3();

  function hideInstance(mesh, index) {
    m4.compose(pos.set(0, -200, 0), q.identity(), ZERO_SCALE);
    mesh.setMatrixAt(index, m4);
  }

  function updateShellsAndSeams() {
    for (let i = 0; i < states.length; i++) {
      const s = states[i];
      if (s.phase === 'intact' || s.phase === 'cracked') {
        const hit = s.hitT > 0 ? Math.sin((s.hitT / 0.18) * Math.PI * 4) * s.hitT * 0.16 : 0;
        pos.set(s.x + Math.cos(s.site.yaw) * hit, s.y + s.size * 0.75, s.z + Math.sin(s.site.yaw) * hit);
        q.setFromAxisAngle(UP, s.site.yaw + hit * 0.08);
        scale.set(s.size, s.size * 0.78, s.size * 0.91);
        m4.compose(pos, q, scale);
        shells.setMatrixAt(i, m4);
      } else hideInstance(shells, i);
    }
    shells.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < seamStates.length; i++) {
      const seam = seamStates[i];
      const s = seam.rock;
      if (s.phase !== 'intact' && s.phase !== 'cracked') {
        hideInstance(seams, i);
        continue;
      }
      const hot = s.cracked ? 1.0 + Math.sin(ctx.time * 11 + s.id) * 0.12 : 0.42;
      pos.set(seam.x, seam.y, seam.z);
      q.setFromAxisAngle(UP, -seam.angle);
      scale.set(s.size * 0.062 * hot, s.size * (0.34 + hot * 0.16), s.size * 0.105 * hot);
      m4.compose(pos, q, scale);
      seams.setMatrixAt(i, m4);
    }
    seams.instanceMatrix.needsUpdate = true;
  }

  function updateCores(dt) {
    const player = ctx.systems.player;
    for (let i = 0; i < states.length; i++) {
      const s = states[i];
      if (s.phase !== 'reward' || s.collected || s.rewardAge < REVEAL_AT) {
        hideInstance(cores, i);
        continue;
      }

      if (!s.homing) {
        s.corePos.set(
          s.x,
          s.coreBaseY + Math.sin((s.rewardAge - REVEAL_AT) * 4.6 + s.id) * 0.13,
          s.z,
        );
        if (s.rewardAge >= HOME_AT && player) {
          const dx = player.pos.x - s.corePos.x;
          const dz = player.pos.z - s.corePos.z;
          if (dx * dx + dz * dz <= HOME_RADIUS * HOME_RADIUS) s.homing = true;
        }
      }

      if (s.homing && player) {
        toPlayer.set(
          player.pos.x - s.corePos.x,
          player.pos.y + 0.95 - s.corePos.y,
          player.pos.z - s.corePos.z,
        );
        const d = toPlayer.length();
        if (d <= COLLECT_RADIUS) {
          collectUpgrade(s);
          hideInstance(cores, i);
          continue;
        }
        if (d > 1e-5) {
          const speedNow = lerp(5.8, 13.5, clamp01((HOME_RADIUS - d) / HOME_RADIUS));
          s.coreVel.lerp(toPlayer.multiplyScalar(speedNow / d), 1 - Math.exp(-7.5 * dt));
          s.corePos.addScaledVector(s.coreVel, dt);
        }
      }

      pos.copy(s.corePos);
      q.setFromAxisAngle(UP, ctx.time * 2.8 + s.id);
      const pulse = 1 + Math.sin(ctx.time * 7.2 + s.id) * 0.12;
      scale.setScalar(pulse);
      m4.compose(pos, q, scale);
      cores.setMatrixAt(i, m4);
    }
    cores.instanceMatrix.needsUpdate = true;
  }

  function updateShards(dt) {
    for (let i = 0; i < shardStates.length; i++) {
      const shard = shardStates[i];
      if (!shard.live) {
        hideInstance(shards, i);
        continue;
      }
      shard.age += dt;
      if (shard.age >= shard.life) {
        shard.live = false;
        hideInstance(shards, i);
        continue;
      }
      shard.vel.y -= 11.5 * dt;
      shard.pos.addScaledVector(shard.vel, dt);
      // Shards travel less than two metres, so the authored rock base is the
      // stable local floor on both lunar tiers. Sampling structureSurfaces()
      // for every shard would allocate its temporary surface list each frame.
      const floor = shard.rock.y;
      if (shard.pos.y < floor + 0.07) {
        shard.pos.y = floor + 0.07;
        if (shard.vel.y < 0) shard.vel.y *= -0.24;
        shard.vel.x *= Math.exp(-5.5 * dt);
        shard.vel.z *= Math.exp(-5.5 * dt);
      }
      shard.q.setFromAxisAngle(shard.axis, shard.age * shard.spin);
      const shrink = clamp01((shard.life - shard.age) / 0.32);
      scale.setScalar(shard.rock.size * (0.74 + (i % SHARDS_PER_ROCK) * 0.035) * shrink);
      m4.compose(shard.pos, shard.q, scale);
      shards.setMatrixAt(i, m4);
    }
    shards.instanceMatrix.needsUpdate = true;
  }

  function collectUpgrade(s) {
    if (s.collected) return;
    let value = 0;
    let applied = false;
    if (s.rewardKind === 'cinder') {
      const weapons = ctx.systems.weapons;
      const before = weapons?.ammoState?.().boostedRounds;
      const result = weapons?.empowerMagazine?.();
      const after = weapons?.ammoState?.().boostedRounds;
      value = resultValue(result, before, after, 1);
      applied = typeof weapons?.empowerMagazine === 'function'
        && (value > 0 || result === true || result?.applied === true);
    } else {
      const player = ctx.systems.player;
      const before = player?.shield;
      const result = player?.addShield?.(25);
      const after = player?.shield;
      value = resultValue(result, before, after, 25);
      applied = typeof player?.addShield === 'function'
        && (value > 0 || result === true || result?.applied === true);
    }
    s.collected = true;
    s.phase = 'collected';
    s.coreVel.set(0, 0, 0);
    ctx.bus.emit('rock:upgrade', {
      id: s.id,
      breakableId: s.id,
      kind: s.rewardKind,
      value,
      applied,
      pos: s.corePos,
    });
  }

  function kickShards(s) {
    for (let j = 0; j < SHARDS_PER_ROCK; j++) {
      const shard = shardStates[s.shardStart + j];
      const a = s.site.yaw + j * TAU / SHARDS_PER_ROCK;
      const speedNow = 2.5 + (j % 3) * 0.65;
      shard.live = true;
      shard.age = 0;
      shard.pos.set(
        s.x + Math.cos(a) * s.size * 0.26,
        s.y + s.size * (0.76 + (j % 2) * 0.10),
        s.z + Math.sin(a) * s.size * 0.26,
      );
      shard.vel.set(
        Math.cos(a) * speedNow,
        2.7 + (j % 2) * 1.25,
        Math.sin(a) * speedNow,
      );
    }
  }

  function strike(collider, damage, point, normal = UP) {
    const id = collider?.breakableId;
    const s = byId.get(id);
    if (!s || s.phase === 'reward' || s.phase === 'collected' || collider.active === false) return null;
    const dealt = Math.max(0, Number(damage) || 0);
    if (dealt <= 0) return { hit: false, broken: false, hp: s.hp, id: s.id };

    s.hp = Math.max(0, s.hp - dealt);
    s.hitT = 0.18;
    if (s.hp > 0) {
      if (!s.cracked) {
        s.cracked = true;
        s.phase = 'cracked';
        ctx.bus.emit('rock:crack', {
          id: s.id,
          breakableId: s.id,
          hp: s.hp,
          maxHp: s.maxHp,
          point,
          normal,
        });
      }
      ctx.bus.emit('rock:dust', { id: s.id, point, normal, power: 0.72 });
      ctx.systems.fx?.impact?.('rock', point, normal, 0.72);
      return { hit: true, cracked: s.cracked, broken: false, hp: s.hp, id: s.id };
    }

    s.phase = 'reward';
    s.rewardAge = 0;
    s.homing = false;
    s.collected = false;
    s.collider.active = false;
    s.corePos.set(s.x, s.coreBaseY, s.z);
    s.coreVel.set(0, 0, 0);
    kickShards(s);
    ctx.bus.emit('rock:break', {
      id: s.id,
      breakableId: s.id,
      point,
      normal,
      pos: s.corePos,
      upgrade: s.rewardKind,
    });
    ctx.bus.emit('rock:dust', { id: s.id, point, normal, power: 1.8 });
    ctx.systems.fx?.impact?.('rock', point, normal, 1.8);
    ctx.systems.camera?.addTrauma?.(0.13);
    return { hit: true, cracked: true, broken: true, hp: 0, id: s.id, upgrade: s.rewardKind };
  }

  function reset() {
    for (const s of states) {
      s.hp = s.maxHp;
      s.phase = 'intact';
      s.cracked = false;
      s.hitT = 0;
      s.rewardAge = 0;
      s.homing = false;
      s.collected = false;
      s.collider.active = true;
      s.corePos.set(s.x, s.coreBaseY, s.z);
      s.coreVel.set(0, 0, 0);
    }
    for (const shard of shardStates) {
      shard.live = false;
      shard.age = 99;
      shard.vel.set(0, 0, 0);
    }
    updateShellsAndSeams();
    updateCores(0);
    updateShards(0);
  }

  function update(dt) {
    for (const s of states) {
      if (s.hitT > 0) s.hitT = Math.max(0, s.hitT - dt);
      if (s.phase === 'reward') s.rewardAge += dt;
    }
    updateShellsAndSeams();
    updateCores(dt);
    updateShards(dt);
  }

  reset();
  shells.computeBoundingSphere?.();
  seams.computeBoundingSphere?.();
  cores.computeBoundingSphere?.();
  shards.computeBoundingSphere?.();

  return {
    group: root,
    root,
    strike,
    update,
    reset,
    states,
    sites: BREAKABLE_ROCK_SITES,
    meshes: { shells, seams, cores, shards },
  };
}
