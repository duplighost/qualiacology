import * as THREE from 'three';
import { createMachine, animateMachine, releaseMachine, disposeMachineLibrary, configureMachineMaterials } from './combat-visuals.js';

const RED = 0xff4738, AMBER = 0xffbb55, CYAN = 0x7beadd;
const UP = new THREE.Vector3(0, 1, 0);
const ENEMIES = Object.freeze({
  skitter: { hp: 28, radius: .64, height: .95, speed: 5.8, reach: 2.4, range: 4.25, windup: .58, delay: 1.3, xp: 14, score: 100, hint: 'Skitter cutters commit to a short lunge. Step aside, then send the lance back through them.' },
  rifle: { hp: 44, radius: .60, height: 1.65, speed: 2.3, reach: 10, range: 29, windup: .65, delay: 1.7, xp: 20, score: 140, hint: 'Rifle rigs mark their line before a three-shot burst. Keep moving or parry the rounds.' },
  shield: { hp: 68, radius: .91, height: 1.83, speed: 2.4, reach: 2.6, range: 4.7, windup: .86, delay: 2.1, xp: 28, score: 200, heavy: true, hint: 'Shield rigs protect their front. Throw past one and recall through the exposed rear coupling.' },
  mortar: { hp: 50, radius: .73, height: 1.95, speed: 1.65, reach: 14, range: 36, windup: .86, delay: 2.8, xp: 24, score: 180, hint: 'Mortar rigs mark the landing point. Move out of the circle; their shells can also be parried.' },
  hunter: { hp: 54, radius: .78, height: 1.2, speed: 4.3, reach: 7, range: 11.8, windup: .80, delay: 1.8, xp: 28, score: 200, hint: 'Hunter rigs crouch before a committed pounce. Dash across their path and punish the landing.' },
  furnace: { hp: 84, radius: .90, height: 2.2, speed: 1.8, reach: 6.4, range: 8.3, windup: .94, delay: 2.4, xp: 32, score: 250, heavy: true, hint: 'Furnace rigs cannot turn quickly while venting. Cross the cone and strike their cooling core.' },
  sniper: { hp: 40, radius: .58, height: 2.48, speed: 1.8, reach: 18, range: 49, windup: 1.22, delay: 3.2, xp: 26, score: 220, hint: 'Inspection masts hold a red sightline, then fire. Move after the line locks or parry the round.' },
  tether: { hp: 58, radius: .72, height: 1.89, speed: 1.95, reach: 8, range: 10.7, windup: 1.10, delay: 3.0, xp: 28, score: 230, hint: 'Cable winches sweep low across the floor. Jump over the cable or stagger the winch.' },
  prism: { hp: 64, radius: .71, height: 1.8, speed: 3.3, reach: 11, range: 27, windup: .88, delay: 2.0, xp: 32, score: 250, hint: 'Prism rigs split their shots into a fan. Read the gaps; reflected shots break their rhythm.' },
});

const BOSSES = Object.freeze({
  counterweight: { name: 'COUNTERWEIGHT', hp: 1900, radius: 2.28, height: 4.08, speed: 1.65, reach: 9, xp: 220, score: 2400, hint: 'Leave the marked floor, then recall through the amber winch after the slam. Jump its pressure rings.' },
  switchman: { name: 'THE SWITCHMAN', hp: 2800, radius: 1.8, height: 3.5, speed: 2.8, reach: 12, xp: 250, score: 2800, hint: 'Dash across the locked red charge lane. A missed charge overheats the brakes and opens its engine.' },
  glasskeeper: { name: 'GLASSKEEPER', hp: 3700, radius: 1.75, height: 3.6, speed: 1.7, reach: 12, xp: 270, score: 3000, hint: 'Read the glass fans and sweep gaps. Parry a lens round to force its shutters open.' },
  crucible: { name: 'CRUCIBLE', hp: 2700, radius: 2.05, height: 4.12, speed: 1.6, reach: 8, xp: 290, score: 3200, hint: 'Charge a core hit while the heat cone is winding up to rupture the vent. Otherwise cross the cone and strike while it cools.' },
  floodgate: { name: 'FLOODGATE', hp: 2350, radius: 1.95, height: 4.1, speed: 1.9, reach: 12, xp: 320, score: 3400, hint: 'Jump a low pressure ring to unbalance the turbine and open its core. Sidestep the high jets.' },
  warden: { name: 'THE WARDEN', hp: 3100, radius: 1.95, height: 4.6, speed: 2.5, reach: 13, xp: 350, score: 3900, hint: 'Parry a precision round from the red sightline to disable fire control and expose the optic. Cross its pursuit lane.' },
  heart: { name: 'THE HEART', hp: 4200, radius: 2.2, height: 4.05, speed: 0, reach: 12, xp: 600, score: 6500, hint: 'Keep a clear lane through the rotating volleys. Jump the low sweep, redirect a round, then drive the lance through the core.' },
});

const BOSS_ARMOR = Object.freeze({
  counterweight: [.55, .80], switchman: [.45, .65], glasskeeper: [.28, .40],
  crucible: [.55, .75], floodgate: [.48, .68], warden: [.38, .50], heart: [.55, .75],
});

const RULE_HINTS = {
  crosswind: 'Floor turbines are cycling. Jump the low pressure sweep.',
  blackout: 'Inspection beams lock before they fire. Watch the red line.',
  overpressure: 'Pressure is venting through the floor. Leave the marked circles.',
  risingwater: 'Pressure rings travel along the floor. Jump them as they reach you.',
  crossfire: 'Side conduits are discharging. The warning line shows the next volley.',
};

const bulletGeometry = new THREE.SphereGeometry(.115, 9, 6);
const bulletHostile = new THREE.MeshBasicMaterial({ color: 0xff664b, toneMapped: false });
const bulletFriendly = new THREE.MeshBasicMaterial({ color: 0x79ffe4, toneMapped: false });
const ringGeometry = new THREE.RingGeometry(.94, 1, 64);
const discGeometry = new THREE.CircleGeometry(1, 40);
const planeGeometry = new THREE.PlaneGeometry(1, 1);
let nextId = 1;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function flatDistance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function angleDelta(a, b) { return Math.atan2(Math.sin(b - a), Math.cos(b - a)); }
function atHeight(p, height) { return new THREE.Vector3(p.x, p.y + height, p.z); }
function hasSkill(player, meta, id) { return !!(meta?.skills?.has?.(id) || meta?.skills?.includes?.(id) || player?.hasSkill?.(id)); }
function distanceToSegment(point, a, b, out = null) {
  const x = b.x - a.x, y = b.y - a.y, z = b.z - a.z;
  const denom = x * x + y * y + z * z;
  const t = denom > 1e-9 ? clamp(((point.x - a.x) * x + (point.y - a.y) * y + (point.z - a.z) * z) / denom, 0, 1) : 0;
  const px = a.x + x * t, py = a.y + y * t, pz = a.z + z * t;
  out?.set(px, py, pz);
  return Math.hypot(point.x - px, point.y - py, point.z - pz);
}

export class Combat {
  constructor({ scene, world, effects, audio, onKill, onDamage, onMessage, onArenaClear, onBoss }) {
    this.scene = scene; this.world = world; this.effects = effects; this.audio = audio;
    configureMachineMaterials(world.materials);
    this.onKill = onKill || (() => {}); this.onDamage = onDamage || (() => {});
    this.onMessage = onMessage || (() => {}); this.onArenaClear = onArenaClear || (() => {}); this.onBoss = onBoss || (() => {});
    this.enemies = []; this.projectiles = []; this.hazards = []; this.sweeps = []; this.scheduled = [];
    this.activeArena = -1; this.cleared = new Set(); this.time = 0; this.player = null;
    this.seenTypes = new Set(); this.forkedPasses = new WeakSet(); this._bossUIAt = 0;
    this.group = new THREE.Group(); this.group.name = 'active-machinery'; this.scene.add(this.group);
  }

  load(sector, district, difficulty = 'standard') {
    this._clearEntities(); this.sector = sector; this.district = district; this.difficulty = difficulty;
    this.activeArena = -1; this.cleared.clear(); this.waveIndex = -1; this.wavePending = 0;
    this.spawnQueue = []; this.spawnTimer = 0; this.bossSpawned = false; this.arenaDone = false;
    this.time = 0; this.onBoss(null);
    this.damageScale = difficulty === 'story' || difficulty === 'easy' ? .62 : difficulty === 'hard' || difficulty === 'relentless' ? 1.20 : 1;
    this.attackScale = difficulty === 'story' || difficulty === 'easy' ? .84 : difficulty === 'hard' || difficulty === 'relentless' ? 1.10 : 1;
  }

  startArena(index) {
    if (!this.sector?.arenas?.[index] || this.cleared.has(index) || (this.activeArena === index && !this.arenaDone)) return false;
    this._clearEntities(); this.activeArena = index; this.arenaDone = false;
    this.arenaDef = this.sector.arenas[index]; this.arena = this.world.arenas[index];
    if (!this.arena) { this.activeArena = -1; return false; }
    this.waveIndex = -1; this.wavePending = .7; this.spawnQueue = []; this.spawnTimer = 0; this.bossSpawned = false;
    this.ruleTimer = 7; this.world.setGate?.(index, false);
    const rule = this.arenaDef.rule;
    if (RULE_HINTS[rule]) this.onMessage(RULE_HINTS[rule]);
    this.audio?.sfx('gate', this.arena.center, .6);
    return true;
  }

  _clearEntities() {
    for (const e of this.enemies) releaseMachine(e.mesh);
    for (const p of this.projectiles) p.mesh.removeFromParent();
    for (const h of [...this.hazards, ...this.sweeps]) this._removeHazard(h);
    this.enemies.length = 0; this.projectiles.length = 0; this.hazards.length = 0; this.sweeps.length = 0;
    this.scheduled.length = 0; this.onBoss(null);
  }

  _queueNextWave() {
    const waves = this.arenaDef.waves || [];
    this.waveIndex++;
    if (this.waveIndex < waves.length) {
      let slot = 0;
      for (const entry of waves[this.waveIndex]) {
        if (!ENEMIES[entry.type]) continue;
        for (let i = 0; i < clamp(Math.floor(entry.count || 0), 0, 20); i++) this.spawnQueue.push({ type: entry.type, slot: slot++ });
      }
      this.spawnTimer = .10;
      if (!this.spawnQueue.length) this.wavePending = .1;
    } else if (this.arenaDef.boss && !this.bossSpawned && BOSSES[this.arenaDef.boss]) {
      this.bossSpawned = true; this._spawn(this.arenaDef.boss, 0, true);
    } else {
      this.arenaDone = true; this.cleared.add(this.activeArena);
      this.world.setGate?.(this.activeArena, true);
      for (const p of this.projectiles) p.mesh.removeFromParent(); this.projectiles.length = 0;
      for (const h of [...this.hazards, ...this.sweeps]) this._removeHazard(h);
      this.hazards.length = 0; this.sweeps.length = 0; this.scheduled.length = 0;
      this.onBoss(null); this.onArenaClear(this.activeArena);
    }
  }

  _spawn(type, slot, boss = false) {
    const def = boss ? BOSSES[type] : ENEMIES[type];
    const points = this.arena.spawnPoints || [];
    let preferred = points.length ? points[slot % points.length].clone() : this.arena.center.clone().add(new THREE.Vector3((slot % 3 - 1) * 4, 0, -7 - Math.floor(slot / 3) * 2));
    if (boss) preferred = this.arena.center.clone().add(new THREE.Vector3(0, 0, -Math.min(8, this.arena.length * .18)));
    const pos = this._findFree(preferred, def.radius, def.height, slot + 2, true);
    const mesh = createMachine(type, boss); mesh.position.copy(pos); this.group.add(mesh);
    const e = {
      id: `machine-${nextId++}`, type, boss, def, position: pos, mesh, alive: true,
      health: def.hp, maxHealth: def.hp, state: 'spawn', timer: boss ? 1.25 : .68,
      yaw: 0, side: slot % 2 ? -1 : 1, seed: slot * 1.79 + this.waveIndex * .83,
      cooldown: .65 + (slot % 4) * .23, attackKind: '', target: pos.clone(), attackDir: new THREE.Vector3(0, 0, 1),
      stun: 0, shieldDown: 0, exposed: 0, flash: 0, pinCooldown: 0, phase: 1, pattern: 0,
      impulse: new THREE.Vector3(), blockedFor: 0, lastAttack: this.time, speedVisual: 0, hitPlayer: false,
    };
    if (this.player) e.yaw = Math.atan2(this.player.position.x - pos.x, this.player.position.z - pos.z);
    e.mesh.rotation.y = e.yaw; this.enemies.push(e);
    this.effects?.ring(pos, boss ? AMBER : RED, boss ? 3.4 : 1.2, .85);
    this.audio?.sfx(boss ? 'boss' : 'telegraph', pos, boss ? 1 : .35);
    if (boss) { this.onMessage(def.hint); this.onBoss({ name: def.name, health: e.health, maxHealth: e.maxHealth, phase: 1 }); }
    else if (!this.seenTypes.has(type)) { this.seenTypes.add(type); if (this.seenTypes.size < 3 || this.waveIndex === 0) this.onMessage(def.hint); }
    return e;
  }

  _bounds(radius) {
    const c = this.arena.center, w = this.arena.width / 2 - radius - .35, l = this.arena.length / 2 - radius - .35;
    return { x0: c.x - Math.max(1, w), x1: c.x + Math.max(1, w), z0: c.z - Math.max(1, l), z1: c.z + Math.max(1, l) };
  }

  _floor(x, z, previous = Infinity) {
    const n = this.world.floorAt?.(x, z, previous);
    return Number.isFinite(n) ? n : -Infinity;
  }

  _free(x, z, radius, y, height) {
    const floor = this._floor(x, z, y + .55);
    if (!Number.isFinite(floor) || floor > y + .56 || floor < y - 1.3) return false;
    for (const b of this.world.solids || []) {
      if (b.active === false || b.maxY <= floor + .16 || b.minY >= floor + height) continue;
      const dx = x - clamp(x, b.minX, b.maxX), dz = z - clamp(z, b.minZ, b.maxZ);
      if (dx * dx + dz * dz < radius * radius) return false;
    }
    return true;
  }

  _findFree(origin, radius, height, seed, avoidPlayer = false, preferSight = false) {
    const b = this._bounds(radius), base = Number.isFinite(origin.y) ? origin.y : this.arena.center.y;
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < 90; i++) {
      const r = i === 0 ? 0 : 1.1 + (i % 15) * .76;
      const a = seed * 1.72 + i * 2.399963;
      const x = clamp(origin.x + Math.sin(a) * r, b.x0, b.x1), z = clamp(origin.z + Math.cos(a) * r, b.z0, b.z1);
      const y = this._floor(x, z, base + .6);
      if (!Number.isFinite(y) || !this._free(x, z, radius, y, height)) continue;
      let closest = Infinity;
      for (const e of this.enemies) if (e.alive) closest = Math.min(closest, Math.hypot(e.position.x - x, e.position.z - z) - e.def.radius - radius);
      const playerDist = this.player ? Math.hypot(this.player.position.x - x, this.player.position.z - z) : 20;
      const visible = !preferSight || !this.player || !this.world.rayBlocked?.(new THREE.Vector3(x, y + Math.min(1.4, height * .65), z), atHeight(this.player.position, .95));
      const score = -r * .35 + Math.min(closest, 3) + (avoidPlayer ? Math.min(playerDist, 10) : 0) + (preferSight && visible ? 15 : 0);
      if (score > bestScore) { bestScore = score; best = new THREE.Vector3(x, y, z); }
      if (i === 0 && closest > .3 && (!avoidPlayer || playerDist >= 7) && visible) break;
    }
    return best || new THREE.Vector3(clamp(origin.x, b.x0, b.x1), Number.isFinite(this._floor(origin.x, origin.z)) ? this._floor(origin.x, origin.z) : base, clamp(origin.z, b.z0, b.z1));
  }

  _move(e, dx, dz, dt, speed, charge = false) {
    const len = Math.hypot(dx, dz); if (len < .001 || speed <= 0) { e.speedVisual = 0; return false; }
    dx /= len; dz /= len;
    const b = this._bounds(e.def.radius), step = speed * dt;
    const angles = charge ? [0] : [0, e.side * .45, -e.side * .45, e.side * .94, -e.side * .94, e.side * 1.45];
    const oldX = e.position.x, oldZ = e.position.z;
    let moved = false;
    for (const a of angles) {
      const ca = Math.cos(a), sa = Math.sin(a), vx = dx * ca - dz * sa, vz = dx * sa + dz * ca;
      let x = clamp(oldX + vx * step, b.x0, b.x1), z = clamp(oldZ + vz * step, b.z0, b.z1);
      if (Math.hypot(x - oldX, z - oldZ) < step * .25 || !this._free(x, z, e.def.radius * .87, e.position.y, e.def.height)) continue;
      // Soft separation never changes a charge's committed direction.
      if (!charge) for (const other of this.enemies) {
        if (!other.alive || other === e) continue;
        const ox = x - other.position.x, oz = z - other.position.z, d = Math.hypot(ox, oz), r = (e.def.radius + other.def.radius) * .86;
        if (d < r && d > .02) {
          const push = Math.min((r - d) * .14, dt * 1.9), nx = x + ox / d * push, nz = z + oz / d * push;
          if (this._free(nx, nz, e.def.radius * .85, e.position.y, e.def.height)) { x = clamp(nx, b.x0, b.x1); z = clamp(nz, b.z0, b.z1); }
        }
      }
      e.position.x = x; e.position.z = z;
      const floor = this._floor(x, z, e.position.y + .55); if (Number.isFinite(floor)) e.position.y = floor;
      moved = true; break;
    }
    e.speedVisual = Math.hypot(e.position.x - oldX, e.position.z - oldZ) / Math.max(dt, .001);
    e.blockedFor = moved ? Math.max(0, e.blockedFor - dt * 3) : e.blockedFor + dt;
    return moved;
  }

  _face(e, target, dt, rate = 5) {
    const desired = Math.atan2(target.x - e.position.x, target.z - e.position.z);
    e.yaw += clamp(angleDelta(e.yaw, desired), -rate * dt, rate * dt);
  }

  _lineOfSight(e, target = this.player.position) {
    return !this.world.rayBlocked?.(atHeight(e.position, Math.min(1.4, e.def.height * .65)), atHeight(target, .95));
  }

  _predict(seconds = .22) {
    const p = this.player.position.clone(), velocity = this.player.velocity;
    if (velocity) { p.x += clamp(velocity.x * seconds, -3.5, 3.5); p.z += clamp(velocity.z * seconds, -3.5, 3.5); }
    return p;
  }

  update(dt, player) {
    dt = clamp(dt, 0, .05); this.time += dt; this.player = player;
    if (!player?.position) return;
    const active = this.activeArena >= 0 && !this.arenaDone;
    if (active) {
      if (this.wavePending > 0) { this.wavePending -= dt; if (this.wavePending <= 0) this._queueNextWave(); }
      if (this.spawnQueue.length) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.enemies.filter((e) => e.alive).length < 13) {
          const next = this.spawnQueue.shift(); this._spawn(next.type, next.slot); this.spawnTimer = .24;
        }
      }
      this.ruleTimer -= dt;
      if (this.arenaDef.rule && this.ruleTimer <= 0 && !this.bossSpawned && this.enemies.some((e) => e.alive)) { this._arenaRule(this.arenaDef.rule); this.ruleTimer = 15.5; }
    }
    for (let i = this.scheduled.length - 1; i >= 0; i--) {
      const event = this.scheduled[i]; event.t -= dt;
      if (!event.owner?.alive && event.owner) { this.scheduled.splice(i, 1); continue; }
      if (event.t <= 0) { this.scheduled.splice(i, 1); event.run(); }
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) {
        e.deathT -= dt; e.mesh.rotation.z += dt * e.side * .65; e.mesh.position.y -= dt * .30;
        if (e.deathT <= 0) { releaseMachine(e.mesh); this.enemies.splice(i, 1); }
        continue;
      }
      for (const key of ['stun', 'exposed', 'flash', 'shieldDown', 'pinCooldown', 'returnCounter', 'parryStaggerCooldown', 'impactAnimation', 'recoil']) e[key] = Math.max(0, (e[key] || 0) - dt);
      if (e.impulse.lengthSq() > .04) { this._move(e, e.impulse.x, e.impulse.z, dt, e.impulse.length()); e.impulse.multiplyScalar(Math.exp(-7 * dt)); }
      if (e.stun <= 0) this._updateEnemy(e, dt);
      e.mesh.position.copy(e.position); e.mesh.rotation.y = e.yaw;
      if (e.type === 'hunter' && e.state === 'attack') e.mesh.position.y += Math.sin(clamp(e.attackAge / .72, 0, 1) * Math.PI) * .8;
      animateMachine(e, this.time + e.seed, dt);
      if (e.boss && this.time >= this._bossUIAt) { this._bossUIAt = this.time + .08; this.onBoss({ name: e.def.name, health: e.health, maxHealth: e.maxHealth, phase: e.phase }); }
    }
    this._updateProjectiles(dt); this._updateHazards(dt); this._updateSweeps(dt);
    if (active && !this.arenaDone && this.wavePending <= 0 && this.spawnQueue.length === 0 && !this.enemies.some((e) => e.alive)) this.wavePending = .95;
  }

  _updateEnemy(e, dt) {
    e.timer -= dt; e.cooldown -= dt;
    if (e.state === 'spawn') { if (e.timer <= 0) { e.state = 'hunt'; e.cooldown = .55; } return; }
    if (e.state === 'windup') {
      this._face(e, e.target, dt, e.boss ? 2.8 : 4.5);
      if (e.timer <= 0) e.boss ? this._executeBoss(e) : this._executeNormal(e);
      return;
    }
    if (e.state === 'attack') { this._activeAttack(e, dt); return; }
    if (e.state === 'recover') { if (e.timer <= 0) { e.state = 'hunt'; e.cooldown = e.boss ? .50 : e.def.delay * .5; } return; }
    const p = this.player.position, dx = p.x - e.position.x, dz = p.z - e.position.z, d = Math.max(.01, Math.hypot(dx, dz));
    this._face(e, p, dt, e.type === 'shield' ? 1.65 : e.boss ? 1.6 : 4.8);
    const los = this._lineOfSight(e), ideal = e.def.reach;
    let toward = d > ideal + 1 || !los ? 1 : d < ideal - 2 ? -.70 : 0;
    let strafe = toward === 0 && !e.def.heavy && e.type !== 'sniper' ? e.side * .57 : 0;
    if (e.type === 'skitter') strafe = Math.sin(this.time * 2.8 + e.seed) * .48;
    if (e.type === 'shield') { toward = d > 2.2 ? 1 : 0; strafe = 0; }
    if (e.boss) { strafe *= .4; toward = !los ? .7 : d > ideal + 3 ? .55 : d < ideal - 4 ? -.3 : 0; }
    this._move(e, dx / d * toward + dz / d * strafe, dz / d * toward - dx / d * strafe, dt, e.def.speed);
    if (e.cooldown <= 0 && los && d < (e.def.range || 45)) {
      e.boss ? this._beginBoss(e) : this._beginNormal(e);
    } else if ((e.blockedFor > 3.5 || (!los && this.time - e.lastAttack > 8)) && this.time - e.lastAttack > 8) {
      // A defeated wave must never leave one unreachable rig behind a column.
      // Visible reassembly is harmless for .8 s and never occurs near the player.
      const toCenter = this.arena.center.clone().lerp(p, .30), target = this._findFree(toCenter, e.def.radius, e.def.height, e.seed + this.time, true, true);
      if (flatDistance(target, p) > 6.5 && flatDistance(target, e.position) > 1) {
        this.effects?.burst(atHeight(e.position, .6), AMBER, 10, .7); this.effects?.ring(target, RED, 1.3, .85);
        e.position.copy(target); e.state = 'spawn'; e.timer = .85; e.blockedFor = 0; e.lastAttack = this.time;
      }
    }
  }

  _beginNormal(e) {
    e.state = 'windup'; e.timer = e.def.windup / this.attackScale;
    // First encounter gives the player extra room to read its initial tools.
    if (this.sector.index === 0) e.timer *= 1.18;
    e.target.copy(this._predict(e.type === 'sniper' ? 0 : .18));
    e.attackDir.subVectors(e.target, e.position); e.attackDir.y = 0; e.attackDir.normalize(); e.hitPlayer = false;
    const type = e.type;
    if (type === 'mortar') this._hazard('disc', e.target, null, { radius: 2.4, delay: e.timer + .95, owner: e, visualOnly: true });
    else if (type === 'furnace') this._hazard('cone', e.position, e.target, { radius: 8.5, angle: .46, delay: e.timer, owner: e, visualOnly: true });
    else if (type === 'tether') this._hazard('disc', e.position, null, { radius: 11, delay: e.timer, owner: e, visualOnly: true, outlineOnly: true });
    else this._hazard('line', e.position, e.target, { width: type === 'hunter' ? 1.7 : type === 'shield' ? 2.2 : type === 'skitter' ? 1.0 : .15, delay: e.timer, owner: e, visualOnly: true });
    this.audio?.sfx('telegraph', e.position, type === 'sniper' ? .85 : .44);
  }

  _executeNormal(e) {
    e.lastAttack = this.time; e.attackAge = 0; const type = e.type;
    if (type === 'skitter' || type === 'hunter' || type === 'shield') {
      e.state = 'attack'; e.timer = type === 'skitter' ? .35 : type === 'hunter' ? .72 : .48;
      e.chargeSpeed = type === 'skitter' ? 10 : type === 'hunter' ? 15.5 : 7.7;
    } else if (type === 'furnace') { e.state = 'attack'; e.timer = 1.27; e.tick = 0; }
    else if (type === 'tether') {
      const start = Math.atan2(e.attackDir.x, e.attackDir.z) - .88;
      this._sweep(e.position, 11, start, 1.15, 1.65, e, .40, 18);
      this._recover(e, 1.8);
    } else if (type === 'mortar') {
      this._lob(e, e.target, 2.65, 21); this._recover(e, .90);
    } else if (type === 'rifle') {
      for (let i = 0; i < 3; i++) this._schedule(i * .17, e, () => this._shoot(e, e.target, 20, 11, (i - 1) * .032));
      this._recover(e, .85);
    } else if (type === 'sniper') {
      this._shoot(e, e.target, 48, 25, 0, { radius: .17 }); this._recover(e, 1.35);
    } else {
      for (const spread of [-.25, 0, .25]) this._shoot(e, e.target, 15, 13, spread);
      e.side *= -1; this._recover(e, .9);
    }
  }

  _recover(e, duration, expose = false) {
    e.state = 'recover'; e.timer = duration; e.speedVisual = 0;
    if (expose || e.type === 'furnace') e.exposed = Math.max(e.exposed, duration);
  }

  _counterOpen(e, duration, message, stagger = 0) {
    e.exposed = Math.max(e.exposed, duration);
    if (stagger) this._stagger(e, stagger);
    this.effects?.ring(e.position, AMBER, e.def.radius + .9, .38);
    this.effects?.burst(atHeight(e.position, e.def.height * .58), CYAN, 13, .85);
    this.audio?.sfx('parry', e.position, .85);
    if (this.time - (e.lastCounterMessage ?? -10) > 2) { this.onMessage(message); e.lastCounterMessage = this.time; }
  }

  _activeAttack(e, dt) {
    e.attackAge = (e.attackAge || 0) + dt;
    if (e.chargeSpeed) {
      const previous = e.position.clone(), moved = this._move(e, e.attackDir.x, e.attackDir.z, dt, e.chargeSpeed, true);
      const p = this.player.position;
      const a = atHeight(previous, .85), b = atHeight(e.position, .85), chest = atHeight(p, .85);
      if (!e.hitPlayer && distanceToSegment(chest, a, b) < e.def.radius + .55 && Math.abs(p.y - e.position.y) < 1.55) {
        e.hitPlayer = true; this._hurt(e.boss ? 29 : e.type === 'hunter' ? 20 : e.type === 'shield' ? 18 : 12, e.position, 'ram');
      }
      if (!moved || e.timer <= 0) {
        e.chargeSpeed = 0; this.effects?.burst(atHeight(e.position, .3), AMBER, e.boss ? 22 : 8, e.boss ? 1.2 : .5);
        this.audio?.sfx('impact', e.position, e.boss ? 1 : .5);
        this._recover(e, e.boss ? 2.55 : 1.12, !e.boss);
        if (e.type === 'switchman' && !e.hitPlayer) this._counterOpen(e, 3.1, 'BRAKES OVERHEATED · Strike the amber engine.');
        else if (e.type === 'warden' && !e.hitPlayer) e.exposed = Math.max(e.exposed, 1.35);
      }
    } else if (e.type === 'furnace' || e.attackKind === 'furnace-cone') {
      e.tick -= dt;
      if (e.tick <= 0) {
        e.tick = .19;
        const muzzle = atHeight(e.position, 1.05), end = muzzle.clone().addScaledVector(e.attackDir, e.boss ? 12 : 8.5);
        this.effects?.trail(muzzle, end, 0xffa54e, e.boss ? .20 : .10, .19);
        this.effects?.burst(end, 0xffad52, e.boss ? 9 : 4, .55);
        this._coneHit(e.position, e.attackDir, e.boss ? 12 : 8.5, .47, e.boss ? 17 : 10, e);
      }
      if (e.timer <= 0) this._recover(e, e.boss ? 2.45 : 1.45, true);
    } else if (e.timer <= 0) this._recover(e, e.boss ? 2.0 : .7, true);
  }

  _beginBoss(e) {
    const patterns = {
      counterweight: ['weight-slam', 'weight-rings', 'weight-cross'],
      switchman: ['rail-charge', 'crossing-fire', 'rail-charge', 'signal-mines'],
      glasskeeper: ['glass-fan', 'lens-sweep', 'glass-orbit'],
      crucible: ['furnace-cone', 'slag-rain', 'hammer'],
      floodgate: ['pressure-rings', 'water-jet', 'sluice-cross'],
      warden: ['execution-lines', 'pursuit', 'lockdown'],
      heart: e.phase === 1 ? ['heart-spiral', 'heart-anchors'] : e.phase === 2 ? ['heart-cross', 'heart-spiral', 'heart-anchors'] : ['heart-cross', 'heart-spiral', 'heart-surge', 'heart-anchors'],
    };
    const kinds = patterns[e.type]; e.attackKind = kinds[e.pattern++ % kinds.length];
    // Select an attack that actually reaches the player. A short cone fired at
    // an empty patch of floor teaches standing still instead of reading tells.
    const distance = flatDistance(e.position, this.player.position);
    if (e.attackKind === 'furnace-cone' && distance > 11.25) e.attackKind = 'slag-rain';
    if (e.attackKind === 'rail-charge' && distance > 25) e.attackKind = 'crossing-fire';
    if (e.attackKind === 'pursuit' && distance > 21.5) e.attackKind = 'execution-lines';
    e.state = 'windup'; e.timer = (e.attackKind.includes('charge') || e.attackKind === 'pursuit' ? 1.20 : 1.03) / this.attackScale;
    e.target.copy(this._predict(.13)); e.attackDir.subVectors(e.target, e.position); e.attackDir.y = 0; e.attackDir.normalize();
    e.hitPlayer = false; e.chargeSpeed = 0; e.attackTargets = [];
    const k = e.attackKind;
    if (['weight-slam', 'slag-rain', 'heart-anchors', 'signal-mines'].includes(k)) {
      const count = k === 'weight-slam' ? 1 : e.phase === 3 ? 5 : 3;
      for (let i = 0; i < count; i++) {
        const target = e.target.clone();
        if (i > 0) target.add(new THREE.Vector3(Math.sin(i * 2.4 + e.seed) * (2.5 + i), 0, Math.cos(i * 2.4 + e.seed) * (2.5 + i)));
        target.y = this._floor(target.x, target.z); if (!Number.isFinite(target.y)) target.y = e.position.y;
        e.attackTargets.push(target);
        this._hazard('disc', target, null, { radius: k === 'weight-slam' ? 3.8 : 2.65, delay: e.timer + i * .22 + (k === 'slag-rain' ? 1.03 : 0), owner: e, visualOnly: true });
      }
    } else if (['weight-rings', 'pressure-rings', 'hammer', 'heart-surge', 'glass-orbit', 'lockdown', 'heart-cross'].includes(k)) {
      this._hazard('disc', e.position, null, { radius: k === 'hammer' ? 5 : 12, delay: e.timer, owner: e, visualOnly: true, outlineOnly: true });
    } else if (['rail-charge', 'pursuit', 'water-jet'].includes(k)) {
      const end = e.position.clone().addScaledVector(e.attackDir, k === 'water-jet' ? 31 : 28);
      this._hazard('line', e.position, end, { width: k === 'water-jet' ? 3.2 : e.def.radius * 2, delay: e.timer, owner: e, visualOnly: true });
    } else if (k === 'furnace-cone') this._hazard('cone', e.position, e.target, { radius: 12, angle: .47, delay: e.timer, owner: e, visualOnly: true });
    else if (k === 'weight-cross' || k === 'sluice-cross') {
      for (const axis of k === 'weight-cross' ? ['x', 'z'] : ['x']) {
        const a = e.target.clone(), b = e.target.clone(); a[axis] -= 14; b[axis] += 14;
        this._hazard('line', a, b, { width: k === 'weight-cross' ? 2.4 : 3, delay: e.timer, owner: e, visualOnly: true });
      }
    } else {
      this._hazard('cone', e.position, e.target, { radius: 16, angle: k === 'glass-fan' ? .68 : .45, delay: e.timer, owner: e, visualOnly: true, outlineOnly: true });
    }
    this.audio?.sfx('telegraph', e.position, 1.05);
  }

  _executeBoss(e) {
    e.lastAttack = this.time; e.attackAge = 0; const k = e.attackKind, phase = e.phase;
    if (k.startsWith('weight-') || k === 'hammer' || k.includes('rings') || k === 'heart-surge') e.impactAnimation = .55;
    if (k === 'rail-charge' || k === 'pursuit') { e.state = 'attack'; e.timer = 1.22; e.chargeSpeed = k === 'rail-charge' ? 22 : 18.5; return; }
    if (k === 'furnace-cone') { e.state = 'attack'; e.timer = 1.55; e.tick = 0; return; }
    if (k === 'weight-slam') {
      this._blast(e.attackTargets[0], 3.8, 28, e, true);
      this._counterOpen(e, 2.65, 'WINCH RELEASED · Recall through the amber coupling.');
      e.returnCounter = 2.65;
      if (phase > 1) this._schedule(.55, e, () => this._pressureRing(e.attackTargets[0], 19, 9, 16, e));
    } else if (k === 'weight-rings' || k === 'pressure-rings' || k === 'hammer' || k === 'heart-surge') {
      const count = k === 'hammer' ? 1 : k === 'weight-rings' ? phase > 1 ? 2 : 1 : 2 + (phase > 1 ? 1 : 0);
      if (k === 'hammer') this._blast(e.position, 4.8, 24, e, true);
      for (let i = 0; i < count; i++) this._schedule(i * .90, e, () => this._pressureRing(e.position.clone(), 27, k === 'pressure-rings' ? 10.5 : 9, 19, e));
      if (k === 'heart-surge') for (let i = 0; i < 3; i++) this._schedule(.6 + i * .55, e, () => this._shoot(e, this._predict(0), 26, 17));
    } else if (k === 'weight-cross') {
      for (const axis of ['x', 'z']) {
        const a = e.target.clone(), b = e.target.clone(); a[axis] -= 14; b[axis] += 14;
        this._lineHit(a, b, 2.4, 24, e, true); this.effects?.trail(atHeight(a, .18), atHeight(b, .18), RED, .16, .35);
      }
    } else if (k === 'crossing-fire') {
      for (let i = 0; i < 4; i++) this._schedule(i * .31, e, () => { for (const s of i % 2 ? [-.18, 0, .18] : [-.27, -.09, .09, .27]) this._shoot(e, e.target, 18 + phase, 15, s); });
    } else if (k === 'signal-mines' || k === 'heart-anchors' || k === 'slag-rain') {
      e.attackTargets.forEach((target, i) => this._schedule(i * .22, e, () => {
        if (k === 'slag-rain') this._lob(e, target, 2.8, 24);
        else { this._blast(target, 2.65, 24, e, true); if (k === 'heart-anchors' && phase > 1) this._pressureRing(target, 7, 6, 12, e); }
      }));
    } else if (k === 'glass-fan') {
      for (let row = 0; row < 3; row++) this._schedule(row * .46, e, () => {
        for (let i = -3; i <= 3; i++) if (!(row % 2 === 0 && i === 0)) this._shoot(e, e.target, 12.5 + phase, 14, i * .18);
      });
    } else if (k === 'lens-sweep') {
      const count = 5 + phase * 2;
      for (let i = 0; i < count; i++) this._schedule(i * .18, e, () => this._shoot(e, e.target, 24, 17, (i - (count - 1) / 2) * .15));
    } else if (k === 'glass-orbit' || k === 'lockdown' || k === 'heart-spiral') {
      const volleys = k === 'heart-spiral' ? 5 : 2, count = k === 'lockdown' ? 10 : 12;
      for (let j = 0; j < volleys; j++) this._schedule(j * .42, e, () => {
        for (let i = 0; i < count; i++) {
          const angle = i / count * Math.PI * 2 + j * .17 + e.yaw;
          const target = e.position.clone().add(new THREE.Vector3(Math.sin(angle) * 15, 0, Math.cos(angle) * 15));
          this._shoot(e, target, k === 'lockdown' ? 16 : 10.5 + phase, 13, 0, { height: 1.02 });
        }
      });
    } else if (k === 'water-jet') {
      for (let i = 0; i < 6; i++) this._schedule(i * .13, e, () => {
        for (const angle of [-.075, 0, .075]) this._shoot(e, e.target, 28, 15, angle, { radius: .19, height: 1.5 });
      });
    } else if (k === 'sluice-cross') {
      const c = this.arena.center, w = this.arena.width * .5 - 1;
      for (let i = 0; i < 3; i++) this._schedule(i * .65, e, () => {
        const origin = new THREE.Vector3(c.x - w, this._floor(c.x, c.z), e.target.z - 4 + i * 4);
        this._sweep(origin, w * 2, Math.PI / 2 - .22, .24, 1.65, e, .43, 18);
      });
    } else if (k === 'execution-lines') {
      for (let i = 0; i < 3; i++) {
        const target = e.target.clone(); target.x += (i - 1) * 3.8;
        this._schedule(i * .26, e, () => this._shoot(e, target, 39, 21, 0, { radius: .17 }));
      }
      if (phase === 3) this._schedule(.95, e, () => { for (const s of [-.28, 0, .28]) this._shoot(e, this._predict(0), 19, 13, s); });
    } else if (k === 'heart-cross') {
      for (let i = 0; i < 4; i++) this._sweep(e.position, 20, e.yaw + i * Math.PI / 2, .47 + phase * .05, 2.5, e, .40, 21);
    }
    const duration = ['heart-spiral', 'heart-cross', 'pressure-rings'].includes(k) ? 2.9 : 2.15;
    this._recover(e, duration, e.type === 'heart' && k === 'heart-anchors');
    this.audio?.sfx('shot', e.position, 1.0);
  }

  _schedule(delay, owner, run) { if (this.scheduled.length < 100) this.scheduled.push({ t: delay, owner, run }); }

  _shoot(e, target, speed, damage, spread = 0, options = {}) {
    if (!e.alive) return;
    e.recoil = .16;
    const muzzles = { rifle: 1.29, sniper: 2.13, prism: 1.33, glasskeeper: 2.17, warden: 2.91, heart: 2.54, floodgate: 1.50, switchman: 1.5 };
    const origin = atHeight(e.position, options.height ?? muzzles[e.type] ?? Math.min(1.5, e.def.height * .70));
    const to = atHeight(target, options.height ? options.height : .95).sub(origin).normalize();
    to.applyAxisAngle(UP, spread); origin.addScaledVector(to, e.def.radius * .75);
    this._projectile(origin, to.multiplyScalar(speed), damage, e, { signature: e.attackKind, ...options });
    this.audio?.sfx('shot', origin, e.boss ? .5 : .35);
  }

  _lob(e, target, radius, damage) {
    const origin = atHeight(e.position, e.boss ? 2.8 : 1.7), flight = 1.03;
    const velocity = target.clone().sub(origin).multiplyScalar(1 / flight); velocity.y += 10 * flight;
    this._projectile(origin, velocity, damage, e, { gravity: 20, splash: radius, radius: .23, life: 3 });
    this.audio?.sfx('shot', origin, .65);
  }

  _projectile(position, velocity, damage, owner, opts = {}) {
    if (this.projectiles.length >= 96) return null;
    const mesh = new THREE.Mesh(bulletGeometry, bulletHostile);
    mesh.position.copy(position); const sz = (opts.radius || .13) / .115; mesh.scale.set(sz, sz, sz * 1.8);
    this.group.add(mesh);
    const p = { position: position.clone(), previous: position.clone(), velocity: velocity.clone(), mesh, damage, owner,
      radius: opts.radius || .13, gravity: opts.gravity || 0, splash: opts.splash || 0, life: opts.life || 4.4,
      friendly: false, hitIds: new Set(), trailTimer: 0, homing: null, age: 0, signature: opts.signature || '' };
    this.projectiles.push(p); return p;
  }

  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]; p.life -= dt; p.age += dt; p.previous.copy(p.position);
      if (p.friendly && p.homing?.alive) {
        const desired = atHeight(p.homing.position, p.homing.def.height * .52).sub(p.position).normalize().multiplyScalar(37);
        p.velocity.lerp(desired, Math.min(1, dt * 12));
      }
      p.velocity.y -= p.gravity * dt; p.position.addScaledVector(p.velocity, dt);
      let gone = p.life <= 0;
      const floor = this._floor(p.position.x, p.position.z);
      if (!gone && (p.age > .055 && this.world.rayBlocked?.(p.previous, p.position) || Number.isFinite(floor) && p.position.y < floor + .06)) {
        if (p.splash) this._blast(p.position, p.splash, p.damage, p.owner, false);
        else this.effects?.burst(p.position, p.friendly ? CYAN : RED, 4, .3);
        gone = true;
      }
      if (!gone && p.friendly) {
        gone = this.hitSegment(p.previous, p.position, p.damage, { hitIds: p.hitIds, parried: true, returning: false, reflectedAttack: p.signature, source: p.previous, radius: p.radius + .10 }) > 0;
      } else if (!gone) {
        const chest = atHeight(this.player.position, .88), head = atHeight(this.player.position, 1.45);
        if (Math.min(distanceToSegment(chest, p.previous, p.position), distanceToSegment(head, p.previous, p.position)) < .42 + p.radius) {
          this._hurt(p.damage, p.owner?.position || p.previous, p.splash ? 'mortar' : 'projectile');
          this.effects?.burst(p.position, RED, 6, .35); gone = true;
        }
      }
      if (gone) { p.mesh.removeFromParent(); this.projectiles.splice(i, 1); continue; }
      p.mesh.position.copy(p.position); p.mesh.lookAt(p.position.clone().add(p.velocity));
      p.trailTimer -= dt;
      if (p.trailTimer <= 0) { this.effects?.trail(p.previous, p.position, p.friendly ? CYAN : RED, .045, .10); p.trailTimer = .045; }
    }
  }

  _makeWarning(shape, position, target, options) {
    const group = new THREE.Group(); group.position.copy(position); group.position.y += .045;
    const material = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: .62, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const fill = material.clone(); fill.opacity = .075;
    if (shape === 'disc') {
      const edge = new THREE.Mesh(ringGeometry, material); edge.rotation.x = -Math.PI / 2; edge.scale.setScalar(options.radius); group.add(edge);
      if (!options.outlineOnly) { const face = new THREE.Mesh(discGeometry, fill); face.rotation.x = -Math.PI / 2; face.scale.setScalar(options.radius); group.add(face); }
    } else if (shape === 'line') {
      const dx = target.x - position.x, dz = target.z - position.z, length = Math.hypot(dx, dz);
      group.position.x = (position.x + target.x) / 2; group.position.z = (position.z + target.z) / 2; group.rotation.y = Math.atan2(dx, dz);
      const face = new THREE.Mesh(planeGeometry, fill); face.rotation.x = -Math.PI / 2; face.scale.set(options.width, length, 1); group.add(face);
      for (const s of [-1, 1]) { const edge = new THREE.Mesh(planeGeometry, material); edge.rotation.x = -Math.PI / 2; edge.position.x = s * options.width / 2; edge.scale.set(.045, length, 1); group.add(edge); }
    } else {
      group.rotation.y = Math.atan2(target.x - position.x, target.z - position.z);
      const geometry = new THREE.RingGeometry(.2, options.radius, 32, 1, -Math.PI / 2 - options.angle, options.angle * 2);
      const face = new THREE.Mesh(geometry, fill); face.rotation.x = -Math.PI / 2; face.userData.ownedGeometry = true; group.add(face);
      for (const side of [-1, 1]) {
        const line = new THREE.Mesh(planeGeometry, material); line.rotation.x = -Math.PI / 2; line.rotation.z = side * options.angle;
        line.position.set(Math.sin(side * options.angle) * options.radius / 2, 0, Math.cos(side * options.angle) * options.radius / 2);
        line.scale.set(.05, options.radius, 1); group.add(line);
      }
    }
    group.userData.materials = [material, fill]; this.group.add(group); return group;
  }

  _hazard(shape, position, target, options = {}) {
    const o = { radius: 2.5, width: .2, angle: .45, delay: 1, damage: 0, ...options };
    const p = position.clone(), floor = this._floor(p.x, p.z, p.y + .7); if (Number.isFinite(floor)) p.y = floor;
    const h = { shape, position: p, target: target?.clone(), ...o, total: o.delay, time: o.delay, fired: false, mesh: this._makeWarning(shape, p, target, o) };
    this.hazards.push(h); return h;
  }

  _removeHazard(h) {
    h.mesh?.removeFromParent();
    h.mesh?.traverse((m) => { if (m.userData.ownedGeometry) m.geometry.dispose(); });
    h.mesh?.userData.materials?.forEach((m) => m.dispose());
  }

  _updateHazards(dt) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]; h.time -= dt;
      if (h.owner && (!h.owner.alive || h.owner.stun > 0)) { this._removeHazard(h); this.hazards.splice(i, 1); continue; }
      const pulse = .43 + .27 * Math.sin(this.time * (h.time < .30 ? 32 : 12));
      h.mesh.userData.materials[0].opacity = pulse;
      h.mesh.userData.materials[1].opacity = .065 + clamp(1 - h.time / h.total, 0, 1) * .10;
      if (!h.fired && h.time <= 0) {
        h.fired = true;
        if (h.fire) h.fire();
        else if (!h.visualOnly && h.damage) {
          if (h.shape === 'disc') this._blast(h.position, h.radius, h.damage, h.owner, !!h.jumpable);
          else if (h.shape === 'line') this._lineHit(h.position, h.target, h.width, h.damage, h.owner, !!h.jumpable);
        }
      }
      if (h.time < -.20) { this._removeHazard(h); this.hazards.splice(i, 1); }
    }
  }

  _pressureRing(position, radius, speed, damage, owner) {
    const group = new THREE.Group(); group.position.copy(position); group.position.y += .13;
    const material = new THREE.MeshBasicMaterial({ color: owner?.type === 'floodgate' ? 0xf5a26b : RED, transparent: true, opacity: .82, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(ringGeometry, material); mesh.rotation.x = -Math.PI / 2; group.add(mesh); group.userData.materials = [material]; this.group.add(group);
    this.sweeps.push({ kind: 'ring', mesh: group, position: position.clone(), radius: .7, maxRadius: radius, speed, damage, owner, hit: false, life: radius / speed + .1 });
    this.audio?.sfx('impact', position, .7);
  }

  _sweep(position, length, angle, angularSpeed, duration, owner, height, damage) {
    const group = new THREE.Group(); this.group.add(group); group.userData.materials = [];
    this.sweeps.push({ kind: 'cable', mesh: group, position: position.clone(), length, angle, angularSpeed, life: duration, owner, height, damage, hitCooldown: 0, trailTimer: 0 });
  }

  _updateSweeps(dt) {
    const player = this.player;
    for (let i = this.sweeps.length - 1; i >= 0; i--) {
      const s = this.sweeps[i]; s.life -= dt;
      if (s.life <= 0 || s.owner && !s.owner.alive) { this._removeHazard(s); this.sweeps.splice(i, 1); continue; }
      if (s.kind === 'ring') {
        const previous = s.radius; s.radius += s.speed * dt; s.mesh.scale.set(s.radius, 1, s.radius);
        const dist = flatDistance(player.position, s.position), height = player.position.y - s.position.y;
        if (!s.hit && dist >= previous - .6 && dist <= s.radius + .55 && !this.world.rayBlocked?.(atHeight(s.position, .3), atHeight(player.position, .4))) {
          if (height < .70 && height > -.60) { s.hit = true; this._hurt(s.damage, s.position, 'pressure-wave'); }
          else if (s.owner?.type === 'floodgate' && height >= .70 && height < 4 && !player.grounded) {
            s.hit = true; this._counterOpen(s.owner, 2.4, 'PRESSURE LOST · Strike the amber turbine.');
          }
        }
      } else {
        if (s.owner?.stun > 0) { this._removeHazard(s); this.sweeps.splice(i, 1); continue; }
        s.angle += s.angularSpeed * dt; s.hitCooldown -= dt; s.trailTimer -= dt;
        const a = atHeight(s.position, s.height), b = a.clone().add(new THREE.Vector3(Math.sin(s.angle) * s.length, 0, Math.cos(s.angle) * s.length));
        if (s.trailTimer <= 0) { this.effects?.trail(a, b, RED, .065, .10); s.trailTimer = .055; }
        const ground = new THREE.Vector3(player.position.x, a.y, player.position.z);
        if (s.hitCooldown <= 0 && player.position.y - s.position.y < .76 && distanceToSegment(ground, a, b) < .51 && !this.world.rayBlocked?.(a, atHeight(player.position, .4))) {
          s.hitCooldown = .9; this._hurt(s.damage, s.position, 'cable-sweep');
        }
      }
    }
  }

  _hurt(amount, source, kind) {
    if (!this.player || this.player.health <= 0 || this.player.invuln > 0) return;
    this.onDamage(Math.round(amount * this.damageScale), source.clone(), kind);
  }

  _blast(position, radius, damage, owner, jumpable = false) {
    this.effects?.ring(position, RED, radius, .40); this.effects?.burst(atHeight(position, .24), AMBER, owner?.boss ? 24 : 14, 1.1);
    this.audio?.sfx('impact', position, owner?.boss ? .9 : .6);
    const player = this.player; if (!player) return;
    const height = player.position.y - position.y;
    if (flatDistance(player.position, position) < radius + .27 && height < (jumpable ? .72 : 2.6) && height > -1.0 && !this.world.rayBlocked?.(atHeight(position, .45), atHeight(player.position, .65))) this._hurt(damage, position, jumpable ? 'ground-impact' : 'explosion');
  }

  _lineHit(a, b, width, damage, owner, jumpable = false) {
    const p = this.player.position, flat = new THREE.Vector3(p.x, a.y, p.z);
    if (distanceToSegment(flat, a, b) < width / 2 + .35 && p.y - a.y < (jumpable ? .74 : 2.5)) this._hurt(damage, owner?.position || a, jumpable ? 'ground-impact' : 'beam');
  }

  _coneHit(position, dir, radius, angle, damage, owner) {
    const p = this.player.position, dx = p.x - position.x, dz = p.z - position.z, dist = Math.hypot(dx, dz);
    if (dist > radius || Math.abs(p.y - position.y) > 2.2 || dist < .001) return;
    if ((dx * dir.x + dz * dir.z) / dist > Math.cos(angle) && !this.world.rayBlocked?.(atHeight(position, 1), atHeight(p, .8))) this._hurt(damage, owner?.position || position, 'heat');
  }

  _arenaRule(rule) {
    const c = this.arena.center, p = this._predict(.10), half = this.arena.width * .5 - .75;
    this.audio?.sfx('telegraph', p, .45);
    if (rule === 'overpressure') {
      for (let i = 0; i < 2; i++) this._hazard('disc', p.clone().add(new THREE.Vector3(i * 4 - 1.5, 0, i * -2)), null, { radius: 2.8, delay: 1.45 + i * .23, damage: 16, jumpable: true });
    } else if (rule === 'risingwater') {
      const source = new THREE.Vector3(c.x, c.y, c.z - this.arena.length * .3);
      this._hazard('disc', source, null, { radius: 2.6, delay: 1.35, outlineOnly: true, fire: () => this._pressureRing(source, 34, 8.5, 15, null) });
    } else if (rule === 'crosswind') {
      const source = new THREE.Vector3(c.x - half, c.y, p.z - 3);
      const end = source.clone().add(new THREE.Vector3(half * 2, 0, 0));
      this._hazard('line', source, end, { width: 1.4, delay: 1.35, fire: () => this._sweep(source, half * 2, Math.PI / 2 - .3, .31, 2, null, .38, 14) });
    } else {
      const source = new THREE.Vector3(c.x + (Math.sin(this.time) > 0 ? half : -half), c.y, c.z - 7);
      const target = atHeight(p, 1), origin = atHeight(source, 1.4);
      this._hazard('line', source, p, { width: rule === 'blackout' ? .22 : .7, delay: 1.35, fire: () => {
        const v = target.clone().sub(origin).normalize();
        if (rule === 'crossfire') for (const a of [-.10, 0, .10]) this._projectile(origin, v.clone().applyAxisAngle(UP, a).multiplyScalar(19), 13, null);
        else this._projectile(origin, v.multiplyScalar(31), 18, null);
      } });
    }
  }

  _dragReturn(a, b, meta) {
    const pass = meta.hitIds || meta;
    for (const e of this.enemies) {
      if (!e.alive || e.boss || e.def.heavy || e.state === 'spawn' || e.dragPass === pass) continue;
      const center = atHeight(e.position, e.def.height * .52), linePoint = new THREE.Vector3();
      const distance = distanceToSegment(center, a, b, linePoint);
      // A narrow, bounded attraction shapes the next piercing line even when
      // the contacted target dies. It never damages or pulls through cover.
      if (distance > 2.5 || this.world.rayBlocked?.(linePoint, center)) continue;
      const direction = linePoint.clone().sub(center); direction.y = 0;
      if (direction.lengthSq() < .04) continue;
      e.dragPass = pass;
      e.impulse.addScaledVector(direction.normalize(), 5 + 3 * (1 - distance / 2.5));
      if (e.impulse.lengthSq() > 64) e.impulse.setLength(8);
      this.effects?.trail(linePoint, center, CYAN, .055, .18);
    }
  }

  hitSegment(a, b, damage, meta = {}) {
    let hits = 0;
    const hitIds = meta.hitIds, width = meta.radius || .13;
    // Support either a fresh Set or a cleared/reused Set for each weapon pass.
    if (hitIds && hitIds.size === 0) this.forkedPasses.delete(hitIds);
    if (meta.returning && hasSkill(this.player, meta, 'drag')) this._dragReturn(a, b, meta);
    for (const e of this.enemies) {
      if (!e.alive || e.state === 'spawn' || hitIds?.has(e.id)) continue;
      const center = atHeight(e.position, e.def.height * .52), closest = new THREE.Vector3();
      const distance = distanceToSegment(center, a, b, closest);
      const lower = atHeight(e.position, e.def.height * .24), upper = atHeight(e.position, e.def.height * .80);
      if (Math.min(distance, distanceToSegment(lower, a, b), distanceToSegment(upper, a, b)) > e.def.radius + width) continue;
      if (this.world.rayBlocked?.(a, closest)) continue;
      hitIds?.add(e.id); hits++;
      e.mesh.updateMatrixWorld(true);
      const core = e.mesh.userData.parts.cores[0], corePos = new THREE.Vector3();
      let coreHit = false;
      if (core) {
        core.getWorldPosition(corePos);
        // The lance pierces the whole assembly. Its first 60 Hz segment often
        // enters the broad body sphere before reaching the visible coupling.
        // Classify that entering trajectory through the body, rather than
        // randomly losing a core hit because the pass ID was consumed early.
        const direction = b.clone().sub(a).normalize();
        const throughBody = b.clone().addScaledVector(direction, e.def.radius * 2 + .25);
        coreHit = distanceToSegment(corePos, a, throughBody) < (e.boss ? .57 : .25) + width;
      }
      this._damage(e, damage, { ...meta, source: a, point: closest, coreHit });
      if (e.alive && meta.returning && hasSkill(this.player, meta, 'drag') && !e.def.heavy && !e.boss) {
        e.impulse.copy(this.player.position).sub(e.position); e.impulse.y = 0; e.impulse.normalize().multiplyScalar(8);
      }
      const pass = hitIds || meta;
      if (meta.charged && hasSkill(this.player, meta, 'fork') && !this.forkedPasses.has(pass)) {
        const next = this.enemies.filter((v) => v !== e && v.alive && v.state !== 'spawn' && !hitIds?.has(v.id) && flatDistance(v.position, e.position) < 5.5 && !this.world.rayBlocked?.(atHeight(e.position, 1), atHeight(v.position, 1))).sort((x, y) => flatDistance(x.position, e.position) - flatDistance(y.position, e.position))[0];
        if (next) {
          this.forkedPasses.add(pass); hitIds?.add(next.id); this.effects?.trail(atHeight(e.position, 1), atHeight(next.position, 1), CYAN, .095, .22);
          this._damage(next, damage * .60, { source: e.position, returning: !!meta.returning, chained: true });
        }
      }
    }
    return hits;
  }

  _damage(e, amount, meta = {}) {
    if (!e.alive || amount <= 0) return;
    let multiplier = 1, blocked = false;
    const source = meta.source || this.player?.position || e.position;
    const dx = source.x - e.position.x, dz = source.z - e.position.z, len = Math.max(.01, Math.hypot(dx, dz));
    const front = (dx * Math.sin(e.yaw) + dz * Math.cos(e.yaw)) / len;
    if (e.type === 'shield' && e.shieldDown <= 0 && front > .15) {
      if (meta.returning && hasSkill(this.player, meta, 'breaker')) { e.shieldDown = 4.0; this._stagger(e, .95); this.effects?.burst(atHeight(e.position, 1), AMBER, 16, 1.4); }
      else { multiplier = .18; blocked = true; }
    } else if (e.type === 'shield' && front <= .15) multiplier = 1.5;
    if (e.boss) {
      // Armor has a readable mechanical counter; it is never an invulnerability
      // timer. The unupgraded lance can always chip it while seeking an opening.
      const armor = BOSS_ARMOR[e.type];
      const open = e.exposed > 0 || e.stun > 0;
      multiplier *= open ? (meta.coreHit ? e.type === 'glasskeeper' || e.type === 'warden' ? 2.0 : 1.8 : 1.2) : armor[meta.coreHit ? 1 : 0];
      if (e.type === 'counterweight' && e.returnCounter > 0 && meta.returning) multiplier *= 1.4;
      if (e.type === 'crucible' && e.state === 'windup' && e.attackKind === 'furnace-cone' && meta.charged && meta.coreHit) {
        this._counterOpen(e, 3.0, 'VENT RUPTURED · Heat cycle interrupted.', .85); multiplier = 1.7;
      }
      if (meta.parried) {
        const precision = e.type === 'warden' && meta.reflectedAttack === 'execution-lines';
        const duration = e.type === 'glasskeeper' ? 3.4 : precision ? 3.7 : e.type === 'warden' ? 1.3 : e.type === 'heart' ? 2.0 : 0;
        const message = e.type === 'glasskeeper' ? 'SHUTTERS OPEN · Strike the amber lens.' : precision ? 'FIRE CONTROL DISABLED · Strike the optic.' : 'SYSTEM INTERRUPTED · Core exposed.';
        const interrupt = e.parryStaggerCooldown > 0 ? 0 : precision ? .95 : duration ? .58 : .22;
        if (duration) this._counterOpen(e, duration, message, interrupt);
        else if (interrupt) this._stagger(e, interrupt);
        if (interrupt) e.parryStaggerCooldown = 2.6;
        multiplier = 1.25;
      }
    }
    if (meta.charged && hasSkill(this.player, meta, 'pin') && e.pinCooldown <= 0) {
      this._stagger(e, e.boss ? .65 : 1.05); e.pinCooldown = e.boss ? 4.2 : 1.2; e.exposed = Math.max(e.exposed, e.boss ? 1.8 : 1.1);
    } else if (meta.charged && !e.def.heavy && !e.boss) this._stagger(e, .38);
    if (meta.parried && !e.boss) this._stagger(e, .78);
    const dealt = Math.max(1, Math.round(amount * multiplier));
    e.health = Math.max(0, e.health - dealt); e.flash = .12;
    const point = meta.point || atHeight(e.position, e.def.height * .52);
    this.effects?.burst(point, blocked ? AMBER : CYAN, blocked ? 7 : meta.charged ? 18 : 10, meta.charged ? 1.1 : .7);
    this.audio?.sfx(blocked ? 'impact' : 'hit', point, blocked ? .55 : .8);
    if (e.boss && e.health > 0) {
      const phase = e.health / e.maxHealth > .67 ? 1 : e.health / e.maxHealth > .34 ? 2 : 3;
      if (phase !== e.phase) {
        // A new phase answers damage with a new readable tactic. Free stun and
        // exposure here let one opening erase every phase without seeing it.
        e.phase = phase; e.exposed = 0; e.returnCounter = 0; e.stun = 0; e.parryStaggerCooldown = Math.max(e.parryStaggerCooldown || 0, 1.4);
        for (let i = this.scheduled.length - 1; i >= 0; i--) if (this.scheduled[i].owner === e) this.scheduled.splice(i, 1);
        for (let i = this.hazards.length - 1; i >= 0; i--) if (this.hazards[i].owner === e) { this._removeHazard(this.hazards[i]); this.hazards.splice(i, 1); }
        e.pattern = e.type === 'heart' ? phase === 2 ? 0 : 2 : e.type === 'switchman' && phase === 3 ? 3 : phase - 1;
        this._beginBoss(e);
        this.effects?.ring(e.position, AMBER, 4, .65); this.audio?.sfx('boss', e.position, .8);
        this.onMessage(e.type === 'heart'
          ? phase === 2 ? 'THE HEART · Cable array active. Jump the rotating sweep.' : 'THE HEART · Final surge. Jump the rings; redirect the rounds.'
          : `${e.def.name} · ${phase === 2 ? 'Secondary systems active.' : 'Final pressure cycle.'}`);
      }
      this.onBoss({ name: e.def.name, health: e.health, maxHealth: e.maxHealth, phase: e.phase });
    }
    if (e.health <= 0) this._kill(e, meta);
  }

  _stagger(e, duration) {
    e.stun = Math.max(e.stun, duration); e.state = 'recover'; e.timer = duration + (e.boss ? .8 : .25); e.chargeSpeed = 0;
    for (let i = this.scheduled.length - 1; i >= 0; i--) if (this.scheduled[i].owner === e) this.scheduled.splice(i, 1);
  }

  _kill(e, meta) {
    e.alive = false; e.deathT = e.boss ? 1.35 : .62; e.health = 0;
    this.effects?.burst(atHeight(e.position, e.def.height * .5), e.boss ? AMBER : CYAN, e.boss ? 48 : 18, e.boss ? 2.1 : 1.15);
    this.effects?.ring(e.position, e.boss ? AMBER : CYAN, e.boss ? 5 : 1.3, e.boss ? .7 : .3);
    this.audio?.sfx(e.boss ? 'boss' : 'kill', e.position, e.boss ? 1 : .75);
    e.mesh.userData.parts.cores.forEach((core) => { core.material.emissiveIntensity = 0; core.material.color.setHex(0x202a29); });
    this.onKill({ type: e.type, position: e.position.clone(), xp: e.def.xp, score: e.def.score, boss: e.boss, returning: !!meta.returning });
    if (e.boss) this.onBoss(null);
  }

  pulse(center, radius, damage, meta = {}) {
    let count = 0;
    if (meta.chain) {
      const targets = this.enemies.filter((e) => e.alive && e.state !== 'spawn' && !meta.hitIds?.has(e.id)
        && center.distanceTo(atHeight(e.position, .7)) < radius + e.def.radius
        && !this.world.rayBlocked?.(center, atHeight(e.position, .9)));
      targets.sort((a, b) => a.position.distanceToSquared(center) - b.position.distanceToSquared(center));
      const target = targets[0];
      if (!target) return 0;
      meta.hitIds?.add(target.id);
      const end = atHeight(target.position, target.def.height * .52);
      this.effects?.trail(center, end, CYAN, .11, .25);
      this.effects?.burst(end, CYAN, 12, .7);
      this._damage(target, damage, { source: center, chained: true });
      if (target.alive) this._stagger(target, target.boss ? .28 : .75);
      return 1;
    }
    for (const e of this.enemies) {
      if (!e.alive || e.state === 'spawn' || center.distanceTo(atHeight(e.position, .5)) > radius + e.def.radius || this.world.rayBlocked?.(atHeight(center, .3), atHeight(e.position, .7))) continue;
      if (meta.hitIds?.has(e.id)) continue;
      meta.hitIds?.add(e.id); count++;
      if (damage > 0) this._damage(e, damage, { ...meta, source: center });
      if (e.alive && (!meta.dash || this.time - (e.lastDashStagger ?? -10) > .3)) {
        const duration = meta.stun || .72;
        this._stagger(e, e.boss ? Math.min(.4, duration) : duration);
        if (meta.dash) e.lastDashStagger = this.time;
      }
    }
    if (!meta.dash) this.effects?.ring(center, CYAN, radius, .32);
    return count;
  }

  parry(playerPos, aimDir, boosted = false) {
    // Public callers may supply their view origin or their body origin.
    const eye = this.player && playerPos.y > this.player.position.y + .7 ? playerPos.clone() : atHeight(playerPos, 1.05);
    let count = 0;
    for (const p of this.projectiles) {
      if (p.friendly) continue;
      const to = p.position.clone().sub(eye), distance = to.length();
      if (distance > 4.0 || distance > .65 && to.normalize().dot(aimDir) < .05) continue;
      if (p.velocity.dot(eye.clone().sub(p.position)) < -1 && distance > 1.2) continue;
      p.friendly = true; p.gravity = 0; p.splash = 0; p.damage = boosted ? 110 : 55; p.life = 3.2;
      p.homing = p.owner?.alive ? p.owner : this.nearest(playerPos, 60);
      const direction = p.homing ? atHeight(p.homing.position, p.homing.def.height * .52).sub(p.position).normalize() : aimDir.clone();
      p.velocity.copy(direction).multiplyScalar(37); p.mesh.material = bulletFriendly; count++;
    }
    if (count) { this.effects?.ring(eye, CYAN, 1.6, .25); this.effects?.burst(eye, CYAN, 14, .9); this.audio?.sfx('parry', eye, 1); }
    return count;
  }

  nearest(position, maxDist = Infinity) {
    let nearest = null, closest = maxDist;
    for (const e of this.enemies) {
      if (!e.alive || e.state === 'spawn') continue;
      const distance = position.distanceTo(e.position);
      if (distance < closest && !this.world.rayBlocked?.(atHeight(position, .9), atHeight(e.position, e.def.height * .5))) { closest = distance; nearest = e; }
    }
    return nearest;
  }

  dispose() { this._clearEntities(); this.group.removeFromParent(); disposeMachineLibrary(); }
}

export { ENEMIES as ENEMY_TYPES, BOSSES as BOSS_TYPES };
