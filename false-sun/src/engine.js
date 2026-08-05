import { FIXED_DT, LIMITS, PLAYER, SAVE_VERSION } from './config.js';
import {
  ROOM_H,
  ROOM_ORDER,
  ROOM_W,
  DISTRICTS,
  ENEMY_ARCHETYPES,
  UPGRADES,
  getRoom,
} from './content.js';
import {
  clamp,
  closestPointOnSegment,
  createRng,
  dist,
  hashObject,
  normalize,
  pointInPolygon,
  resolveCircleRect,
  segmentCircleIntersection,
  segmentIntersection,
} from './math.js';
import {
  casterVertices,
  computeShadows,
  findContainingShadows,
  receiverCoverage,
  segmentShadowCuts,
} from './shadows.js';

const TAU = Math.PI * 2;
const EMPTY_INPUT = Object.freeze({
  moveX: 0,
  moveY: 0,
  aimX: 1,
  aimY: 0,
  fire: false,
  dashPressed: false,
  pinPressed: false,
  pausePressed: false,
});

const DISTRICT_BY_ID = new Map(DISTRICTS.map((district) => [district.id, district]));

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function requirementParts(requirement) {
  if (!requirement) return [null, null];
  const split = requirement.indexOf(':');
  return split < 0 ? [requirement, ''] : [requirement.slice(0, split), requirement.slice(split + 1)];
}

function roomProgress(state, roomId = state.roomId) {
  if (!state.world.rooms[roomId]) {
    state.world.rooms[roomId] = {
      destroyed: [],
      defeated: [],
      collected: [],
      activated: [],
      activatedReceivers: [],
      discovered: true,
      cleared: false,
    };
  }
  return state.world.rooms[roomId];
}

function includes(record, key, value) {
  return Array.isArray(record?.[key]) && record[key].includes(value);
}

function addUnique(record, key, value) {
  if (!Array.isArray(record[key])) record[key] = [];
  if (!record[key].includes(value)) record[key].push(value);
}

export function meetsRequirement(state, requirement) {
  if (!requirement) return true;
  const [kind, value] = requirementParts(requirement);
  if (kind === 'upgrade') return state.player.upgrades.includes(value);
  if (kind === 'boss') return state.world.bosses.includes(value);
  if (kind === 'break') {
    return Object.values(state.world.rooms).some((record) => record.destroyed?.includes(value));
  }
  if (kind === 'alignment') {
    return Object.values(state.world.rooms).some((record) => record.activated?.includes(value));
  }
  if (kind === 'night-names') return state.player.nightNames >= Number(value || 0);
  if (kind === 'secret') return state.player.secrets >= Number(value || 0);
  return state.player.upgrades.includes(requirement);
}

function makeEnemy(spec, index = 0) {
  const archetype = ENEMY_ARCHETYPES[spec.type] ?? ENEMY_ARCHETYPES.husk;
  const hp = finite(spec.hp, archetype.hp);
  return {
    ...clone(spec),
    id: spec.id ?? `${spec.type}-${index}`,
    archetype: archetype.id,
    name: archetype.name,
    x: finite(spec.x, ROOM_W * 0.5),
    y: finite(spec.y, ROOM_H * 0.5),
    previousX: finite(spec.x, ROOM_W * 0.5),
    previousY: finite(spec.y, ROOM_H * 0.5),
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    speed: finite(spec.speed, archetype.speed),
    radius: finite(spec.radius, archetype.radius),
    contact: finite(spec.contact, archetype.contact),
    score: finite(spec.score, archetype.score),
    boss: Boolean(archetype.boss),
    phase: 1,
    phaseCount: spec.phases ?? (archetype.boss ? 3 : 1),
    attackTimer: 0.55 + (index % 4) * 0.23,
    attackIndex: 0,
    lastPatternInterruptible: false,
    hurtTimer: 0,
    cutOpen: 0,
    dead: false,
    angle: index * 1.37,
    orbit: index % 2 ? 1 : -1,
    castsShadow: true,
    rivalSunX: finite(spec.x, ROOM_W * 0.5),
    rivalSunY: finite(spec.y, ROOM_H * 0.5),
  };
}

function makeBullet(state, options = {}) {
  if (state.bullets.length >= LIMITS.bullets) return null;
  const bullet = {
    id: `b${state.nextEntityId++}`,
    x: finite(options.x),
    y: finite(options.y),
    previousX: finite(options.x),
    previousY: finite(options.y),
    vx: finite(options.vx),
    vy: finite(options.vy),
    radius: finite(options.radius, 8),
    damage: finite(options.damage, 1),
    life: finite(options.life, 5),
    delay: Math.max(0, finite(options.delay)),
    hostile: options.hostile !== false,
    converted: false,
    castsShadow: options.castsShadow !== false,
    ownerId: options.ownerId ?? null,
    kind: options.kind ?? 'orb',
    phase: finite(options.phase),
  };
  state.bullets.push(bullet);
  return bullet;
}

function makeParticle(state, options = {}) {
  if (state.particles.length >= LIMITS.particles) state.particles.shift();
  state.particles.push({
    x: finite(options.x), y: finite(options.y),
    vx: finite(options.vx), vy: finite(options.vy),
    life: finite(options.life, 0.6), maxLife: finite(options.life, 0.6),
    size: finite(options.size, 4),
    kind: options.kind ?? 'spark',
    color: options.color ?? null,
  });
}

function burst(state, x, y, kind = 'spark', count = 10, speed = 170) {
  for (let index = 0; index < count; index += 1) {
    const angle = state.cosmeticRng.float() * TAU;
    const velocity = speed * (0.35 + state.cosmeticRng.float() * 0.75);
    makeParticle(state, {
      x, y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 0.25 + state.cosmeticRng.float() * 0.55,
      size: 2 + state.cosmeticRng.float() * 7,
      kind,
    });
  }
}

function emit(state, type, detail = {}) {
  state.events.push({ type, tick: state.tick, ...detail });
  if (state.events.length > 80) state.events.splice(0, state.events.length - 80);
}

function blankWorld() {
  return {
    rooms: {},
    bosses: [],
    discovered: [],
    playTime: 0,
    deaths: 0,
  };
}

export function createGame(options = {}) {
  const seed = Number(options.seed ?? 1337) >>> 0;
  const roomId = getRoom(options.roomId) ? options.roomId : ROOM_ORDER[0];
  const state = {
    version: SAVE_VERSION,
    seed,
    tick: 0,
    time: 0,
    mode: options.started ? 'playing' : 'title',
    paused: false,
    completed: false,
    trueEnding: false,
    transition: 0,
    flash: 0,
    shake: 0,
    freeze: 0,
    roomId,
    room: null,
    roomState: null,
    player: {
      x: 0, y: 0, previousX: 0, previousY: 0, vx: 0, vy: 0,
      radius: PLAYER.radius,
      hp: PLAYER.maxHp,
      maxHp: PLAYER.maxHp,
      invulnerable: 0,
      dashTimer: 0,
      dashCharges: PLAYER.dashCharges,
      maxDashCharges: PLAYER.dashCharges,
      dashRecharge: 0,
      heat: 0,
      overheated: false,
      inShadow: false,
      aimX: 1,
      aimY: 0,
      sunX: 0,
      sunY: 0,
      sunPinned: false,
      pinX: 0,
      pinY: 0,
      beamDamageBonus: 0,
      flow: 0,
      bestFlow: 0,
      score: 0,
      combo: 0,
      cuts: 0,
      kills: 0,
      secrets: 0,
      nightNames: 0,
      lenses: 0,
      dashShards: 0,
      upgrades: ['cut'],
      splitTimer: 0,
      splitSunX: 0,
      splitSunY: 0,
      cutChain: 0,
      cutChainTimer: 0,
      inUmbra: false,
      inHostileShadow: false,
      hitTimer: 0,
    },
    world: blankWorld(),
    enemies: [],
    bullets: [],
    particles: [],
    trails: [],
    shadows: [],
    beam: { active: false, fromX: 0, fromY: 0, toX: 0, toY: 0, hit: false },
    receivers: [],
    pickups: [],
    obstacles: [],
    hazards: [],
    events: [],
    metrics: {
      steps: 0,
      shots: 0,
      shadowCuts: 0,
      convertedBullets: 0,
      wallsBroken: 0,
      alignments: 0,
      transitions: 0,
      damageTaken: 0,
      maxEnemies: 0,
      maxBullets: 0,
    },
    nextEntityId: 1,
    rng: createRng(seed ^ 0x9e3779b9),
    cosmeticRng: createRng(seed ^ 0xa511e9b3),
    scenario: options.scenario ?? null,
  };
  loadRoom(state, roomId, { first: true });
  if (options.save) restoreGame(state, options.save);
  return state;
}

export function startGame(state) {
  if (state.mode === 'title') {
    state.mode = 'playing';
    state.paused = false;
    emit(state, 'started', { roomId: state.roomId });
  }
  return state;
}

function requirementVisible(state, requirement) {
  return !requirement || meetsRequirement(state, requirement);
}

export function loadRoom(state, roomId, options = {}) {
  const source = getRoom(roomId);
  if (!source) throw new Error(`Unknown room: ${roomId}`);
  const progress = roomProgress(state, roomId);
  state.roomId = roomId;
  state.room = clone(source);
  state.roomState = progress;
  if (!state.world.discovered.includes(roomId)) state.world.discovered.push(roomId);

  state.obstacles = state.room.obstacles
    .filter((item) => !progress.destroyed.includes(item.id))
    .map((item) => ({
      ...item,
      points: item.shape === 'poly'
        ? item.points.map((point) => (Array.isArray(point) ? { x: point[0], y: point[1] } : point))
        : item.points,
      currentHp: item.breakable ? item.hp : Infinity,
      angle: item.angle ?? 0,
    }));
  state.receivers = state.room.receivers.map((item) => ({
    ...item,
    charge: progress.activated.includes(item.alignment) || progress.activatedReceivers?.includes(item.id) ? 1 : 0,
    active: progress.activated.includes(item.alignment) || progress.activatedReceivers?.includes(item.id),
    singing: false,
  }));
  state.pickups = state.room.pickups
    .filter((item) => !progress.collected.includes(item.id))
    .map((item) => ({ ...item, bob: state.rng.float() * TAU, armed: item.type !== 'ending-key' }));
  state.hazards = state.room.hazards.map((item) => ({
    ...item,
    baseX: item.x,
    baseY: item.y,
    baseRadius: item.r,
    baseRotation: finite(item.rotation),
    rotation: finite(item.rotation),
    phase: Number.isFinite(item.phase) ? item.phase : state.rng.float() * TAU,
    active: true,
  }));
  state.enemies = state.room.enemies
    .filter((item) => !progress.defeated.includes(item.id))
    .filter((item) => requirementVisible(state, item.dormantUntil))
    .map((item, index) => makeEnemy(item, index));
  if (state.room.boss && !state.world.bosses.includes(state.room.boss.id)) {
    state.enemies.push(makeEnemy({ ...state.room.boss, id: state.room.boss.id }, state.enemies.length));
  }
  state.bullets = [];
  state.trails = [];
  state.shadows = [];
  state.player.sunPinned = false;
  const spawn = options.spawn ?? source.spawn;
  state.player.x = clamp(finite(spawn?.x, ROOM_W * 0.5), 35, ROOM_W - 35);
  state.player.y = clamp(finite(spawn?.y, ROOM_H * 0.5), 35, ROOM_H - 35);
  state.player.previousX = state.player.x;
  state.player.previousY = state.player.y;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.invulnerable = Math.max(state.player.invulnerable, 0.5);
  state.transition = options.first ? 0 : 1;
  updateSunAndShadows(state);
  if (!options.first) {
    state.metrics.transitions += 1;
    emit(state, 'room-enter', {
      roomId,
      name: source.name,
      district: source.district,
      inscription: source.inscription,
    });
  }
  return state;
}

function casterForObstacle(obstacle) {
  return {
    ...obstacle,
    casterId: obstacle.id,
    interactive: obstacle.interactive ?? obstacle.breakable ?? false,
  };
}

function updateSunAndShadows(state) {
  const player = state.player;
  if (player.sunPinned) {
    player.sunX = player.pinX;
    player.sunY = player.pinY;
  } else {
    player.sunX = player.x + player.aimX * PLAYER.sunOrbit;
    player.sunY = player.y + player.aimY * PLAYER.sunOrbit;
  }

  const casters = [];
  for (const obstacle of state.obstacles) {
    if (obstacle.castsShadow !== false) casters.push(casterForObstacle(obstacle));
  }
  for (const enemy of state.enemies) {
    if (!enemy.dead && enemy.castsShadow !== false) {
      casters.push({
        casterId: `enemy:${enemy.id}`,
        id: `enemy:${enemy.id}`,
        shape: 'circle', x: enemy.x, y: enemy.y, r: enemy.radius,
        interactive: true,
      });
    }
  }
  let bulletCasters = 0;
  for (const bullet of state.bullets) {
    if (bullet.hostile && bullet.castsShadow && bulletCasters < 48) {
      casters.push({
        casterId: `bullet:${bullet.id}`,
        id: `bullet:${bullet.id}`,
        shape: 'circle', x: bullet.x, y: bullet.y, r: bullet.radius + 2,
        interactive: true,
      });
      bulletCasters += 1;
    }
  }
  const bounds = { minX: 0, minY: 0, maxX: ROOM_W, maxY: ROOM_H };
  const primaryShadows = computeShadows(
    casters.slice(0, LIMITS.shadowCasters),
    { x: player.sunX, y: player.sunY },
    bounds,
  );
  const playerPoint = { x: player.x, y: player.y };
  const primaryContaining = findContainingShadows(playerPoint, primaryShadows);
  if (player.splitTimer > 0) {
    player.splitSunX = clamp(player.x - (player.sunX - player.x), 24, ROOM_W - 24);
    player.splitSunY = clamp(player.y - (player.sunY - player.y), 24, ROOM_H - 24);
    const secondaryShadows = computeShadows(
      casters.slice(0, LIMITS.shadowCasters),
      { x: player.splitSunX, y: player.splitSunY },
      bounds,
    ).map((shadow) => ({ ...shadow, splitLight: true }));
    const secondaryContaining = findContainingShadows(playerPoint, secondaryShadows);
    const primaryCasters = new Set(primaryContaining.map((shadow) => shadow.casterId));
    player.inUmbra = secondaryContaining.some((shadow) => primaryCasters.has(shadow.casterId));
    player.inShadow = primaryContaining.length > 0 || secondaryContaining.length > 0;
    state.shadows = [...primaryShadows, ...secondaryShadows];
  } else {
    player.splitSunX = player.sunX;
    player.splitSunY = player.sunY;
    player.inUmbra = false;
    player.inShadow = primaryContaining.length > 0;
    state.shadows = primaryShadows;
  }
  player.inHostileShadow = false;
  const hostileLights = state.enemies
    .filter((enemy) => !enemy.dead && (enemy.archetype === 'twin' || enemy.archetype === 'noon-guardian'))
    .slice(0, 3);
  for (const rival of hostileLights) {
    const orbitRadius = rival.archetype === 'noon-guardian' ? 176 : 94;
    rival.rivalSunY = clamp(rival.y + Math.sin(rival.angle + Math.PI) * orbitRadius, 24, ROOM_H - 24);
    rival.rivalSunX = clamp(rival.x + Math.cos(rival.angle + Math.PI) * orbitRadius, 24, ROOM_W - 24);
    const hostileShadows = computeShadows(
      casters.slice(0, 48),
      { x: rival.rivalSunX, y: rival.rivalSunY },
      bounds,
    ).map((shadow) => ({ ...shadow, hostileLight: true, interactive: false }));
    state.shadows.push(...hostileShadows);
    player.inHostileShadow ||= findContainingShadows(playerPoint, hostileShadows).length > 0;
  }
}

function obstacleEdges(obstacle) {
  if (obstacle.shape === 'circle') return [];
  const points = casterVertices(obstacle);
  return points.map((point, index) => [point, points[(index + 1) % points.length]]);
}

function resolveCirclePolygon(position, radius, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return position;
  let closest = null;
  let closestDistance = Infinity;
  for (let index = 0; index < polygon.length; index += 1) {
    const point = closestPointOnSegment(position, polygon[index], polygon[(index + 1) % polygon.length]);
    const distance = dist(position, point);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = point;
    }
  }
  const inside = pointInPolygon(position, polygon);
  if (!inside && closestDistance >= radius) return position;
  let direction = normalize({ x: position.x - closest.x, y: position.y - closest.y });
  if (Math.abs(direction.x) + Math.abs(direction.y) < 0.001) {
    const centroid = polygon.reduce((sum, point) => ({ x: sum.x + point.x / polygon.length, y: sum.y + point.y / polygon.length }), { x: 0, y: 0 });
    direction = normalize({ x: position.x - centroid.x, y: position.y - centroid.y });
  }
  const push = inside ? radius + closestDistance + 0.5 : radius - closestDistance + 0.5;
  return { x: position.x + direction.x * push, y: position.y + direction.y * push };
}

function resolveObstacles(state) {
  const player = state.player;
  let position = { x: player.x, y: player.y };
  for (let pass = 0; pass < 3; pass += 1) {
    for (const obstacle of state.obstacles) {
      if (obstacle.solid === false) continue;
      const rootPhase = player.dashTimer > 0
        && player.upgrades.includes('root-cut')
        && /living-root|root-and-bone/.test(String(obstacle.material ?? ''));
      if (rootPhase) continue;
      const before = position;
      if (obstacle.shape === 'circle') {
        const dx = position.x - obstacle.x;
        const dy = position.y - obstacle.y;
        const minimum = player.radius + obstacle.r;
        const distance = Math.hypot(dx, dy);
        if (distance < minimum) {
          const direction = distance > 0.0001 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };
          position = { x: obstacle.x + direction.x * minimum, y: obstacle.y + direction.y * minimum };
        }
      } else if (obstacle.shape === 'poly' || Math.abs(finite(obstacle.angle ?? obstacle.rotation)) > 0.0001) {
        position = resolveCirclePolygon(position, player.radius, casterVertices(obstacle));
      } else {
        const resolved = resolveCircleRect({ ...position, r: player.radius }, obstacle);
        position = { x: resolved.x, y: resolved.y };
      }
      if (position.x !== before.x && Math.sign(player.vx) !== Math.sign(position.x - before.x)) player.vx *= 0.25;
      if (position.y !== before.y && Math.sign(player.vy) !== Math.sign(position.y - before.y)) player.vy *= 0.25;
    }
  }
  player.x = clamp(position.x, player.radius, ROOM_W - player.radius);
  player.y = clamp(position.y, player.radius, ROOM_H - player.radius);
}

function pointInHazard(point, hazard, padding = 0) {
  if (hazard.shape === 'rect') {
    if (hazard.type === 'inward-horizon') {
      const edgeDistance = Math.min(point.x, point.y, ROOM_W - point.x, ROOM_H - point.y);
      return edgeDistance <= finite(hazard.thickness, 44) + padding;
    }
    const angle = -finite(hazard.rotation);
    const dx = point.x - hazard.x;
    const dy = point.y - hazard.y;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const localX = dx * cosine - dy * sine;
    const localY = dx * sine + dy * cosine;
    return Math.abs(localX) <= hazard.w * 0.5 + padding
      && Math.abs(localY) <= hazard.h * 0.5 + padding;
  }
  if (hazard.shape === 'poly') return pointInPolygon(point, hazard.points);
  if (String(hazard.type ?? '').includes('ring')) {
    const ringRadius = finite(hazard.r, 40);
    const thickness = finite(hazard.thickness, 20) + padding;
    return Math.abs(dist(point, hazard) - ringRadius) <= thickness;
  }
  return dist(point, hazard) <= finite(hazard.r, 40) + padding;
}

function damagePlayer(state, amount, source = 'hazard') {
  const player = state.player;
  if (player.invulnerable > 0 || state.mode !== 'playing') return false;
  player.hp = Math.max(0, player.hp - amount);
  player.invulnerable = 0.85;
  player.hitTimer = 0.4;
  state.flash = 0.45;
  state.shake = Math.max(state.shake, 0.7);
  state.metrics.damageTaken += amount;
  emit(state, 'player-hit', { amount, source, hp: player.hp });
  burst(state, player.x, player.y, 'hurt', 18, 220);
  if (player.hp <= 0) handleDeath(state);
  return true;
}

function handleDeath(state) {
  state.world.deaths += 1;
  state.mode = 'dead';
  state.freeze = 0.18;
  emit(state, 'death', { roomId: state.roomId, deaths: state.world.deaths });
}

export function respawn(state) {
  state.mode = 'playing';
  state.player.hp = state.player.maxHp;
  state.player.heat = 0;
  state.player.overheated = false;
  state.player.dashCharges = state.player.maxDashCharges;
  loadRoom(state, state.roomId, { first: false });
}

function obstacleIntersectionT(start, end, obstacle) {
  if (obstacle.shape === 'circle') {
    if (dist(start, obstacle) <= obstacle.r) return 0;
    const hits = segmentCircleIntersection(start, end, obstacle, obstacle.r);
    return hits.length ? Math.min(...hits.map((hit) => hit.t)) : null;
  }
  const vertices = casterVertices(obstacle);
  if (pointInPolygon(start, vertices)) return 0;
  const hits = obstacleEdges(obstacle)
    .map(([a, b]) => segmentIntersection(start, end, a, b))
    .filter(Boolean);
  return hits.length ? Math.min(...hits.map((hit) => hit.t)) : null;
}

function damageObstacle(state, obstacle, amount, kind) {
  if (!obstacle?.breakable) return false;
  obstacle.currentHp -= amount;
  burst(state, obstacle.x ?? ROOM_W * 0.5, obstacle.y ?? ROOM_H * 0.5, 'stone', 7, 120);
  if (obstacle.currentHp > 0) return true;
  const progress = roomProgress(state);
  addUnique(progress, 'destroyed', obstacle.id);
  state.obstacles = state.obstacles.filter((item) => item.id !== obstacle.id);
  state.metrics.wallsBroken += 1;
  state.player.flow = clamp(state.player.flow + 0.22, 0, 1);
  emit(state, 'wall-broken', {
    id: obstacle.id,
    target: obstacle.secretTarget,
    kind,
    title: 'THE WALL WAS HONEST',
    copy: obstacle.secretTarget ? 'There was always something behind it.' : 'A route opens.',
  });
  burst(state, obstacle.x ?? ROOM_W * 0.5, obstacle.y ?? ROOM_H * 0.5, 'wall-break', 28, 260);
  return true;
}

function enemyByCaster(state, casterId) {
  if (!casterId?.startsWith('enemy:')) return null;
  return state.enemies.find((enemy) => enemy.id === casterId.slice(6));
}

function bulletByCaster(state, casterId) {
  if (!casterId?.startsWith('bullet:')) return null;
  return state.bullets.find((bullet) => bullet.id === casterId.slice(7));
}

function damageEnemy(state, enemy, amount, kind = 'beam') {
  if (!enemy || enemy.dead || amount <= 0) return false;
  const bossAlignment = enemy.boss && state.room.boss?.id === enemy.id ? state.room.boss.alignment : null;
  if (bossAlignment && !roomProgress(state).activated.includes(bossAlignment)) {
    emit(state, 'shield-hit', { enemyId: enemy.id, alignment: bossAlignment, x: enemy.x, y: enemy.y });
    return false;
  }
  if (enemy.boss && kind === 'beam' && enemy.cutOpen <= 0) {
    emit(state, 'shield-hit', { enemyId: enemy.id, x: enemy.x, y: enemy.y });
    return false;
  }
  if (enemy.archetype === 'warden' && kind === 'beam' && enemy.cutOpen <= 0) {
    const shaded = findContainingShadows({ x: enemy.x, y: enemy.y }, state.shadows).length > 0;
    if (!shaded) {
      emit(state, 'shield-hit', { enemyId: enemy.id, x: enemy.x, y: enemy.y });
      return false;
    }
  }
  enemy.hp -= amount;
  enemy.hurtTimer = 0.14;
  enemy.cutOpen = Math.max(enemy.cutOpen, kind === 'cut' ? 1.15 : 0);
  state.freeze = Math.max(state.freeze, kind === 'cut' ? 0.042 : 0.014);
  state.shake = Math.max(state.shake, kind === 'cut' ? 0.42 : 0.12);
  burst(state, enemy.x, enemy.y, kind === 'cut' ? 'cut' : 'hit', kind === 'cut' ? 15 : 5, kind === 'cut' ? 250 : 110);
  emit(state, 'enemy-hit', { enemyId: enemy.id, amount, kind, hp: enemy.hp });
  if (enemy.hp <= 0) killEnemy(state, enemy, kind);
  return true;
}

function grantBossReward(state, enemy) {
  const boss = state.room.boss;
  if (!boss || boss.id !== enemy.id) return;
  if (!state.world.bosses.includes(boss.id)) state.world.bosses.push(boss.id);
  const [, upgrade] = requirementParts(boss.reward);
  if (upgrade && !state.player.upgrades.includes(upgrade)) {
    state.player.upgrades.push(upgrade);
    emit(state, 'upgrade', { id: upgrade, ...(UPGRADES[upgrade] ?? {}) });
  }
  emit(state, 'boss-defeated', { id: boss.id, name: enemy.name, reward: upgrade });
}

function killEnemy(state, enemy, kind) {
  enemy.dead = true;
  enemy.hp = 0;
  const progress = roomProgress(state);
  if (!enemy.boss) addUnique(progress, 'defeated', enemy.id);
  state.player.score += enemy.score * (1 + state.player.flow * 2);
  state.player.kills += 1;
  state.player.flow = clamp(state.player.flow + (enemy.boss ? 0.5 : 0.13), 0, 1);
  state.player.combo += 1;
  state.player.dashRecharge = Math.max(0, state.player.dashRecharge - 0.6);
  if (state.player.dashCharges < state.player.maxDashCharges) state.player.dashCharges += 1;
  emit(state, 'enemy-killed', { enemyId: enemy.id, kind, boss: enemy.boss, x: enemy.x, y: enemy.y });
  burst(state, enemy.x, enemy.y, enemy.boss ? 'boss-death' : 'death', enemy.boss ? 64 : 22, enemy.boss ? 360 : 230);
  if (enemy.boss) grantBossReward(state, enemy);
}

function convertBullet(state, bullet, point) {
  if (!bullet || !bullet.hostile) return;
  bullet.hostile = false;
  bullet.converted = true;
  bullet.life = Math.max(bullet.life, 2.6);
  const target = nearestLivingEnemy(state, bullet);
  if (target) {
    const direction = normalize({ x: target.x - bullet.x, y: target.y - bullet.y });
    const speed = Math.max(420, Math.hypot(bullet.vx, bullet.vy) * 1.25);
    bullet.vx = direction.x * speed;
    bullet.vy = direction.y * speed;
  } else {
    bullet.vx *= -1.25;
    bullet.vy *= -1.25;
  }
  state.metrics.convertedBullets += 1;
  state.player.flow = clamp(state.player.flow + 0.08, 0, 1);
  emit(state, 'bullet-converted', { bulletId: bullet.id, x: point?.x ?? bullet.x, y: point?.y ?? bullet.y });
}

function nearestLivingEnemy(state, point) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const distance = dist(point, enemy);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = enemy;
    }
  }
  return nearest;
}

function processShadowCuts(state, from, to) {
  const cuts = segmentShadowCuts(from, to, state.shadows);
  let successful = 0;
  const splitPower = state.player.splitTimer > 0 ? 1.5 : 1;
  for (const cut of cuts) {
    if (!cut.interactive) continue;
    const point = cut.intersections?.[0] ?? cut.center;
    const enemy = enemyByCaster(state, cut.casterId);
    const bullet = bulletByCaster(state, cut.casterId);
    const obstacle = state.obstacles.find((item) => item.id === cut.casterId);
    if (enemy) {
      if (damageEnemy(state, enemy, (34 + state.player.dashShards * 3) * splitPower, 'cut')) {
        if (enemy.lastPatternInterruptible) {
          const before = state.bullets.length;
          state.bullets = state.bullets.filter((bullet) => bullet.ownerId !== enemy.id || !bullet.hostile);
          const cancelled = before - state.bullets.length;
          if (cancelled) emit(state, 'attack-interrupted', { enemyId: enemy.id, cancelled });
          enemy.lastPatternInterruptible = false;
        }
        successful += 1;
      }
    } else if (bullet) {
      convertBullet(state, bullet, point);
      successful += 1;
    } else if (obstacle?.breakable) {
      damageObstacle(state, obstacle, 32 * splitPower, 'cut');
      successful += 1;
    }
    if (successful && state.trails.length < LIMITS.trails) {
      state.trails.push({
        id: `t${state.nextEntityId++}`,
        x1: from.x, y1: from.y,
        x2: point.x, y2: point.y,
        life: 3.2,
        maxLife: 3.2,
        casterId: cut.casterId,
      });
    }
  }
  if (successful) {
    state.metrics.shadowCuts += successful;
    state.player.cuts += successful;
    state.player.flow = clamp(state.player.flow + 0.15 + successful * 0.04, 0, 1);
    state.player.bestFlow = Math.max(state.player.bestFlow, state.player.flow);
    state.player.dashRecharge = Math.max(0, state.player.dashRecharge - 0.8);
    if (state.player.dashCharges < state.player.maxDashCharges) state.player.dashCharges += 1;
    if (state.player.upgrades.includes('split')) {
      if (state.player.splitTimer > 0) {
        state.player.splitTimer = Math.min(7, state.player.splitTimer + successful * 0.28);
      } else {
        state.player.cutChain += successful;
        state.player.cutChainTimer = 2.5;
        if (state.player.cutChain >= 3) {
          state.player.cutChain = 0;
          state.player.cutChainTimer = 0;
          state.player.splitTimer = 5.5;
          emit(state, 'split-noon', { duration: state.player.splitTimer, x: to.x, y: to.y });
        }
      }
    }
    emit(state, 'shadow-cut', { count: successful, split: splitPower > 1, x: to.x, y: to.y });
  }
}

function updateBeam(state, input) {
  const player = state.player;
  state.beam.active = false;
  const canFire = input.fire && !player.overheated && state.mode === 'playing';
  if (!canFire) {
    const cooling = player.inShadow && !player.inHostileShadow ? PLAYER.heatCoolShade : PLAYER.heatCoolLight;
    player.heat = Math.max(0, player.heat - cooling * FIXED_DT);
    if (player.overheated && player.heat <= 0.24) {
      player.overheated = false;
      emit(state, 'cooled');
    }
    return;
  }

  player.heat = Math.min(1, player.heat + PLAYER.heatGain * FIXED_DT);
  if (player.heat >= 1) {
    player.overheated = true;
    emit(state, 'overheated');
  }
  const start = { x: player.sunX, y: player.sunY };
  let end = {
    x: start.x + player.aimX * PLAYER.beamRange,
    y: start.y + player.aimY * PLAYER.beamRange,
  };
  let nearestT = 1;
  let hitObstacle = null;
  for (const obstacle of state.obstacles) {
    const hitT = obstacleIntersectionT(start, end, obstacle);
    if (hitT === null) continue;
    const t = clamp(hitT, 0, 1);
    if (t < nearestT) {
      nearestT = t;
      hitObstacle = obstacle;
    }
  }
  if (hitObstacle) {
    end = {
      x: start.x + (end.x - start.x) * nearestT,
      y: start.y + (end.y - start.y) * nearestT,
    };
  }
  state.beam = {
    active: true,
    fromX: start.x, fromY: start.y,
    toX: end.x, toY: end.y,
    hit: false,
  };
  if (state.tick % PLAYER.beamCadence !== 0) return;
  state.metrics.shots += 1;
  const damage = PLAYER.beamDamage + player.beamDamageBonus;
  if (hitObstacle?.breakable) damageObstacle(state, hitObstacle, damage, 'beam');
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const intersections = segmentCircleIntersection(start, end, enemy, enemy.radius + PLAYER.beamWidth);
    if (intersections.length || dist(enemy, closestPointOnSegment(enemy, start, end)) <= enemy.radius + PLAYER.beamWidth) {
      if (damageEnemy(state, enemy, damage, 'beam')) state.beam.hit = true;
    }
  }
}

function shootPattern(state, enemy, pattern) {
  const player = state.player;
  const kind = pattern.kind ?? 'aimed';
  const phasePressure = enemy.boss ? Math.max(0, enemy.phase - 1) : 0;
  const count = (pattern.count ?? 1) + (phasePressure && /radial|spiral|lane|wall/.test(kind) ? phasePressure : 0);
  const speed = (pattern.speed ?? 220) * (1 + phasePressure * 0.1);
  const spread = pattern.spread ?? Math.PI / 3;
  const aim = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  if (kind === 'radial' || kind === 'radial-waves' || kind === 'spiral-pair' || kind === 'cross') {
    const offset = enemy.angle + (kind === 'spiral-pair' ? state.time * 0.8 : 0);
    for (let index = 0; index < count; index += 1) {
      const angle = offset + (index / count) * TAU;
      const waveSize = Math.max(1, Math.ceil(count / Math.max(1, pattern.waves ?? 1)));
      const wave = kind === 'radial-waves' ? Math.floor(index / waveSize) : 0;
      makeBullet(state, {
        x: enemy.x, y: enemy.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        ownerId: enemy.id, kind, delay: wave * 0.18,
      });
    }
    return;
  }
  if (kind === 'lane' || kind === 'sweeping-wall' || kind === 'boundary-wall') {
    for (let index = 0; index < count; index += 1) {
      const perpendicular = (index - (count - 1) * 0.5) * 48;
      makeBullet(state, {
        x: enemy.x + Math.cos(aim + Math.PI / 2) * perpendicular,
        y: enemy.y + Math.sin(aim + Math.PI / 2) * perpendicular,
        vx: Math.cos(aim) * speed,
        vy: Math.sin(aim) * speed,
        radius: 10,
        ownerId: enemy.id,
        kind,
      });
    }
    return;
  }
  if (kind === 'dash' || kind === 'dash-copy') {
    enemy.vx = Math.cos(aim) * speed;
    enemy.vy = Math.sin(aim) * speed;
    enemy.cutOpen = 0.65;
    emit(state, 'enemy-dash', { enemyId: enemy.id });
    return;
  }
  for (let index = 0; index < count; index += 1) {
    const angle = aim + (count === 1 ? 0 : (index / (count - 1) - 0.5) * spread);
    makeBullet(state, {
      x: enemy.x, y: enemy.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      ownerId: enemy.id, kind, delay: index * finite(pattern.interval),
    });
  }
}

function updateEnemy(state, enemy) {
  if (enemy.dead) return;
  const archetype = ENEMY_ARCHETYPES[enemy.archetype] ?? ENEMY_ARCHETYPES.husk;
  const player = state.player;
  enemy.previousX = enemy.x;
  enemy.previousY = enemy.y;
  enemy.hurtTimer = Math.max(0, enemy.hurtTimer - FIXED_DT);
  enemy.cutOpen = Math.max(0, enemy.cutOpen - FIXED_DT);
  enemy.attackTimer -= FIXED_DT;
  enemy.angle += FIXED_DT * (0.6 + (enemy.boss ? 0.18 : 0.35)) * enemy.orbit;

  const toPlayer = normalize({ x: player.x - enemy.x, y: player.y - enemy.y });
  const toSun = normalize({ x: player.sunX - enemy.x, y: player.sunY - enemy.y });
  const concealed = player.inShadow && !player.inHostileShadow && !enemy.boss && dist(enemy, player) > 340;
  const awareness = concealed ? 0.38 : 1;
  if (enemy.archetype === 'moth') {
    const tangent = { x: -toSun.y * enemy.orbit, y: toSun.x * enemy.orbit };
    enemy.vx += (toSun.x * 0.45 + tangent.x * 0.55) * enemy.speed * FIXED_DT * 3.2 * awareness;
    enemy.vy += (toSun.y * 0.45 + tangent.y * 0.55) * enemy.speed * FIXED_DT * 3.2 * awareness;
  } else if (enemy.archetype === 'needle') {
    const distance = dist(enemy, player);
    const sign = distance < 380 ? -1 : distance > 560 ? 1 : 0;
    enemy.vx += toPlayer.x * sign * enemy.speed * FIXED_DT * 3 * awareness;
    enemy.vy += toPlayer.y * sign * enemy.speed * FIXED_DT * 3 * awareness;
  } else if (enemy.archetype === 'bell' || enemy.archetype === 'bell-guardian') {
    enemy.vx *= 0.7;
    enemy.vy *= 0.7;
  } else if (enemy.archetype === 'reader-guardian') {
    const tangent = { x: -toPlayer.y, y: toPlayer.x };
    enemy.vx += tangent.x * enemy.speed * FIXED_DT * 2.4 * awareness;
    enemy.vy += tangent.y * enemy.speed * FIXED_DT * 2.4 * awareness;
  } else if (enemy.archetype === 'twin' || enemy.archetype === 'noon-guardian') {
    const mirrored = normalize({ x: player.x - player.aimX * 260 - enemy.x, y: player.y - player.aimY * 260 - enemy.y });
    enemy.vx += mirrored.x * enemy.speed * FIXED_DT * 2.6 * awareness;
    enemy.vy += mirrored.y * enemy.speed * FIXED_DT * 2.6 * awareness;
  } else {
    enemy.vx += toPlayer.x * enemy.speed * FIXED_DT * 2.5 * awareness;
    enemy.vy += toPlayer.y * enemy.speed * FIXED_DT * 2.5 * awareness;
  }

  const damping = Math.exp(-4.2 * FIXED_DT);
  enemy.vx *= damping;
  enemy.vy *= damping;
  const velocity = Math.hypot(enemy.vx, enemy.vy);
  const maximum = enemy.speed * (enemy.cutOpen > 0.5 ? 2.2 : 1);
  if (velocity > maximum) {
    enemy.vx = (enemy.vx / velocity) * maximum;
    enemy.vy = (enemy.vy / velocity) * maximum;
  }
  enemy.x = clamp(enemy.x + enemy.vx * FIXED_DT, enemy.radius, ROOM_W - enemy.radius);
  enemy.y = clamp(enemy.y + enemy.vy * FIXED_DT, enemy.radius, ROOM_H - enemy.radius);

  if (dist(enemy, player) < enemy.radius + player.radius + 3) damagePlayer(state, enemy.contact, enemy.id);
  if (enemy.attackTimer <= 0 && !concealed) {
    const patterns = archetype.bulletPatterns ?? [];
    const unlockedPatterns = enemy.boss
      ? clamp(1 + enemy.phase - 1, 1, Math.max(1, patterns.length))
      : Math.max(1, patterns.length);
    const pattern = patterns[enemy.attackIndex % unlockedPatterns] ?? { kind: 'aimed', count: 1, speed: 220, cooldown: 2 };
    shootPattern(state, enemy, pattern);
    enemy.lastPatternInterruptible = pattern.interruptibleByCut !== false;
    enemy.attackIndex += 1;
    enemy.attackTimer = (pattern.cooldown ?? 2) * (enemy.boss ? Math.max(0.68, 1 - (enemy.phase - 1) * 0.09) : 1);
    emit(state, 'enemy-attack', { enemyId: enemy.id, kind: pattern.kind });
  }
  if (enemy.boss) {
    const phase = clamp(Math.floor((1 - enemy.hp / enemy.maxHp) * enemy.phaseCount) + 1, 1, enemy.phaseCount);
    if (phase !== enemy.phase) {
      enemy.phase = phase;
      enemy.attackTimer = 0.2;
      emit(state, 'boss-phase', { enemyId: enemy.id, phase });
    }
  }
}

function updateBullets(state) {
  const player = state.player;
  for (const bullet of state.bullets) {
    bullet.previousX = bullet.x;
    bullet.previousY = bullet.y;
    bullet.life -= FIXED_DT;
    bullet.delay = Math.max(0, finite(bullet.delay) - FIXED_DT);
    if (bullet.delay > 0) continue;
    if (bullet.kind === 'aimed-curve') {
      const angle = 0.8 * FIXED_DT * (bullet.id.charCodeAt(1) % 2 ? 1 : -1);
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const vx = bullet.vx * cosine - bullet.vy * sine;
      bullet.vy = bullet.vx * sine + bullet.vy * cosine;
      bullet.vx = vx;
    }
    bullet.x += bullet.vx * FIXED_DT;
    bullet.y += bullet.vy * FIXED_DT;
    if (bullet.hostile) {
      if (dist(bullet, player) <= bullet.radius + player.radius) {
        if (damagePlayer(state, bullet.damage, bullet.id)) bullet.life = 0;
      }
    } else {
      const target = nearestLivingEnemy(state, bullet);
      if (target && dist(bullet, target) <= bullet.radius + target.radius) {
        damageEnemy(state, target, 18 + state.player.lenses * 2, 'echo');
        bullet.life = 0;
      }
    }
    if (bullet.x < -80 || bullet.y < -80 || bullet.x > ROOM_W + 80 || bullet.y > ROOM_H + 80) bullet.life = 0;
  }
  state.bullets = state.bullets.filter((bullet) => bullet.life > 0);
}

function updateParticlesAndTrails(state) {
  for (const particle of state.particles) {
    particle.life -= FIXED_DT;
    particle.x += particle.vx * FIXED_DT;
    particle.y += particle.vy * FIXED_DT;
    particle.vx *= 0.975;
    particle.vy *= 0.975;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
  for (const trail of state.trails) trail.life -= FIXED_DT;
  state.trails = state.trails.filter((trail) => trail.life > 0);
}

function updateRotatingObstacles(state) {
  for (const obstacle of state.obstacles) {
    if (obstacle.rotationSpeed) obstacle.angle = finite(obstacle.angle) + obstacle.rotationSpeed * FIXED_DT;
  }
}

function updateReceivers(state) {
  const progress = roomProgress(state);
  for (const receiver of state.receivers) {
    if (receiver.active) continue;
    const coverage = receiverCoverage({ ...receiver, requiredCasterId: receiver.requiredCaster }, state.shadows);
    receiver.singing = coverage >= 0.5;
    receiver.charge = clamp(receiver.charge + (receiver.singing ? FIXED_DT * 1.7 : -FIXED_DT * 0.65), 0, 1);
    if (receiver.charge >= 1) {
      receiver.active = true;
      receiver.singing = true;
      if (!Array.isArray(progress.activatedReceivers)) progress.activatedReceivers = [];
      addUnique(progress, 'activatedReceivers', receiver.id);
      emit(state, 'receiver-latched', { receiverId: receiver.id, alignment: receiver.alignment, tone: receiver.tone });
    }
  }
  const grouped = new Map();
  for (const receiver of state.receivers) {
    if (!grouped.has(receiver.alignment)) grouped.set(receiver.alignment, []);
    grouped.get(receiver.alignment).push(receiver);
  }
  for (const [alignment, receivers] of grouped) {
    if (progress.activated.includes(alignment)) continue;
    if (!receivers.length || !receivers.every((receiver) => receiver.active)) continue;
    for (const receiver of state.receivers.filter((item) => item.alignment === alignment)) receiver.active = true;
    addUnique(progress, 'activated', alignment);
    state.metrics.alignments += 1;
    state.player.flow = clamp(state.player.flow + 0.25, 0, 1);
    const targets = [...new Set(receivers.map((receiver) => receiver.target).filter(Boolean))];
    for (const target of targets) {
      const obstacle = state.obstacles.find((item) => item.id === target);
      if (obstacle) {
        addUnique(progress, 'destroyed', obstacle.id);
        state.obstacles = state.obstacles.filter((item) => item.id !== obstacle.id);
      }
    }
    emit(state, 'alignment', { alignment, targets, title: 'THE SHADOW SINGS', copy: 'A real route remembers its shape.' });
  }
}

function collectPickup(state, pickup) {
  const progress = roomProgress(state);
  addUnique(progress, 'collected', pickup.id);
  const player = state.player;
  if (pickup.type === 'health-knot') {
    player.maxHp += Number(pickup.value || 1);
    player.hp = player.maxHp;
  } else if (pickup.type === 'beam-lens') {
    player.lenses += 1;
    player.beamDamageBonus += Number(pickup.value || 0.06) * 100;
  } else if (pickup.type === 'dash-shard') {
    player.dashShards += 1;
    if (player.dashShards % 3 === 0) player.maxDashCharges += 1;
    player.dashCharges = player.maxDashCharges;
  } else if (pickup.type === 'night-name') {
    player.nightNames += Number(pickup.value || 1);
    player.secrets += 1;
  } else if (pickup.type === 'ability') {
    const id = String(pickup.value);
    if (!player.upgrades.includes(id)) {
      player.upgrades.push(id);
      emit(state, 'upgrade', { id, ...(UPGRADES[id] ?? {}) });
    }
  } else {
    player.secrets += pickup.secret ? 1 : 0;
  }
  player.flow = clamp(player.flow + 0.18, 0, 1);
  emit(state, 'pickup', { id: pickup.id, kind: pickup.type, value: pickup.value, secret: pickup.secret });
  burst(state, pickup.x, pickup.y, 'pickup', 24, 190);
}

function updatePickups(state) {
  for (const pickup of state.pickups) {
    pickup.bob += FIXED_DT * 2.2;
    if (!meetsRequirement(state, pickup.requires)) continue;
    if (pickup.type === 'ending-key' && !pickup.armed) {
      // Force a deliberate post-fight approach. A guardian killed on the
      // center point cannot emit upgrade and ending overlays in the same tick.
      if (dist(pickup, state.player) > state.player.radius + 70) pickup.armed = true;
      continue;
    }
    if (dist(pickup, state.player) <= state.player.radius + 30) collectPickup(state, pickup);
  }
  const collected = roomProgress(state).collected;
  state.pickups = state.pickups.filter((pickup) => !collected.includes(pickup.id));
}

function exitOpen(state, exit) {
  if (exit.bossGate && state.enemies.some((enemy) => enemy.boss && !enemy.dead)) return false;
  return meetsRequirement(state, exit.requires);
}

function exitContact(state, exit) {
  const player = state.player;
  const half = exit.span * 0.5;
  if (exit.side === 'east') return player.x >= ROOM_W - player.radius - 1 && Math.abs(player.y - exit.at) <= half;
  if (exit.side === 'west') return player.x <= player.radius + 1 && Math.abs(player.y - exit.at) <= half;
  if (exit.side === 'north') return player.y <= player.radius + 1 && Math.abs(player.x - exit.at) <= half;
  if (exit.side === 'south') return player.y >= ROOM_H - player.radius - 1 && Math.abs(player.x - exit.at) <= half;
  return false;
}

function reverseSpawn(exit) {
  if (exit.side === 'east') return { x: ROOM_W - 46, y: exit.at };
  if (exit.side === 'west') return { x: 46, y: exit.at };
  if (exit.side === 'north') return { x: exit.at, y: 46 };
  return { x: exit.at, y: ROOM_H - 46 };
}

function checkExits(state) {
  for (const exit of state.room.exits) {
    if (!exitContact(state, exit)) continue;
    if (!exitOpen(state, exit)) {
      if (exit.side === 'east') state.player.x = ROOM_W - state.player.radius - 2;
      if (exit.side === 'west') state.player.x = state.player.radius + 2;
      if (exit.side === 'north') state.player.y = state.player.radius + 2;
      if (exit.side === 'south') state.player.y = ROOM_H - state.player.radius - 2;
      emit(state, 'gate-locked', { exitId: exit.id, requirement: exit.requires });
      return;
    }
    const destination = getRoom(exit.to);
    const reverse = destination?.exits?.find((candidate) => candidate.to === state.roomId);
    loadRoom(state, exit.to, { spawn: reverse ? reverseSpawn(reverse) : destination.spawn });
    return;
  }
}

function updateRoomClear(state) {
  const progress = roomProgress(state);
  const living = state.enemies.filter((enemy) => !enemy.dead);
  if (!progress.cleared && living.length === 0) {
    progress.cleared = true;
    emit(state, 'room-clear', { roomId: state.roomId });
  }
}

function updatePlayer(state, input) {
  const player = state.player;
  player.previousX = player.x;
  player.previousY = player.y;
  player.invulnerable = Math.max(0, player.invulnerable - FIXED_DT);
  player.hitTimer = Math.max(0, player.hitTimer - FIXED_DT);
  player.splitTimer = Math.max(0, player.splitTimer - FIXED_DT);
  player.cutChainTimer = Math.max(0, player.cutChainTimer - FIXED_DT);
  if (player.cutChainTimer <= 0) player.cutChain = 0;

  const aim = normalize({ x: finite(input.aimX, player.aimX), y: finite(input.aimY, player.aimY) });
  if (Math.abs(aim.x) + Math.abs(aim.y) > 0.01) {
    player.aimX = aim.x;
    player.aimY = aim.y;
  }
  const move = normalize({ x: finite(input.moveX), y: finite(input.moveY) });

  if (input.pinPressed) {
    const canPin = player.upgrades.includes('pin') || state.room.boss?.trialUpgrade === 'pin';
    if (canPin) {
      player.sunPinned = !player.sunPinned;
      if (player.sunPinned) {
        player.pinX = clamp(player.x + player.aimX * PLAYER.sunPinRange, 30, ROOM_W - 30);
        player.pinY = clamp(player.y + player.aimY * PLAYER.sunPinRange, 30, ROOM_H - 30);
      }
      emit(state, player.sunPinned ? 'sun-pinned' : 'sun-recalled', { x: player.pinX, y: player.pinY });
    } else emit(state, 'ability-locked', { id: 'pin' });
  }

  if (input.dashPressed && player.dashCharges >= 1 && player.dashTimer <= 0) {
    const direction = Math.hypot(move.x, move.y) > 0.1 ? move : { x: player.aimX, y: player.aimY };
    const shadeMultiplier = player.inShadow && !player.inHostileShadow ? 1.18 : 1;
    player.vx = direction.x * PLAYER.dashSpeed * shadeMultiplier;
    player.vy = direction.y * PLAYER.dashSpeed * shadeMultiplier;
    player.dashTimer = PLAYER.dashDuration;
    player.invulnerable = Math.max(player.invulnerable, PLAYER.dashInvulnerability);
    player.dashCharges -= 1;
    player.dashRecharge = Math.max(player.dashRecharge, PLAYER.dashRecharge);
    emit(state, 'dash', { shaded: player.inShadow && !player.inHostileShadow });
  }

  if (player.dashTimer > 0) {
    player.dashTimer -= FIXED_DT;
  } else {
    const speed = player.inShadow && !player.inHostileShadow ? PLAYER.shadeSpeed : PLAYER.speed;
    player.vx += move.x * PLAYER.acceleration * FIXED_DT;
    player.vy += move.y * PLAYER.acceleration * FIXED_DT;
    const damping = Math.exp(-PLAYER.friction * FIXED_DT);
    player.vx *= damping;
    player.vy *= damping;
    const velocity = Math.hypot(player.vx, player.vy);
    if (velocity > speed) {
      player.vx = (player.vx / velocity) * speed;
      player.vy = (player.vy / velocity) * speed;
    }
  }
  player.x += player.vx * FIXED_DT;
  player.y += player.vy * FIXED_DT;
  resolveObstacles(state);
  if (player.dashTimer > 0) {
    processShadowCuts(state, { x: player.previousX, y: player.previousY }, { x: player.x, y: player.y });
  }

  if (player.dashCharges < player.maxDashCharges) {
    player.dashRecharge -= FIXED_DT;
    if (player.dashRecharge <= 0) {
      player.dashCharges += 1;
      player.dashRecharge = player.dashCharges < player.maxDashCharges ? PLAYER.dashRecharge : 0;
      emit(state, 'dash-ready');
    }
  }
}

function updateHazards(state) {
  for (const hazard of state.hazards) {
    hazard.phase += FIXED_DT;
    const period = finite(hazard.period);
    hazard.active = period <= 0 || ((hazard.phase % period) + period) % period >= period * 0.48;
    hazard.x = hazard.baseX;
    hazard.y = hazard.baseY;
    hazard.r = hazard.baseRadius;
    hazard.rotation = hazard.baseRotation;
    const speed = finite(hazard.speed);
    if (/sweeping-clapper|hostile-light-sweep/.test(hazard.type)) {
      hazard.rotation += hazard.phase * speed;
    } else if (hazard.type === 'sliding-page-wall') {
      hazard.x += Math.sin(hazard.phase * Math.max(0.25, Math.abs(speed)) * 2.4) * 250;
    } else if (hazard.type === 'closing-iris') {
      const closing = 0.5 + Math.sin((hazard.phase / Math.max(0.1, period)) * TAU) * 0.5;
      hazard.r = 215 + closing * 105;
      hazard.active = closing > 0.56;
    }
    if (!hazard.active) continue;
    if (!pointInHazard(state.player, hazard, state.player.radius * 0.45)) continue;
    if (hazard.status === 'slow') {
      state.player.vx *= 0.92;
      state.player.vy *= 0.92;
    } else if (hazard.damage) damagePlayer(state, hazard.damage, hazard.id);
  }
}

function updateFlow(state) {
  const player = state.player;
  const speed = Math.hypot(player.vx, player.vy);
  const trailNear = state.trails.some((trail) => dist(player, closestPointOnSegment(player, { x: trail.x1, y: trail.y1 }, { x: trail.x2, y: trail.y2 })) < 42);
  if (trailNear) {
    player.flow = clamp(player.flow + FIXED_DT * 0.12, 0, 1);
    const multiplier = 1 + FIXED_DT * 1.4;
    player.vx *= multiplier;
    player.vy *= multiplier;
  } else {
    const decay = speed > PLAYER.speed * 0.7 || (player.inShadow && !player.inHostileShadow) ? 0.018 : 0.075;
    player.flow = Math.max(0, player.flow - FIXED_DT * decay);
  }
  player.bestFlow = Math.max(player.bestFlow, player.flow);
}

export function stepGame(state, input = EMPTY_INPUT) {
  if (!state || state.completed) return state;
  if (input.pausePressed && state.mode !== 'title' && state.mode !== 'dead') {
    state.paused = !state.paused;
    emit(state, state.paused ? 'paused' : 'resumed');
  }
  if (state.paused || state.mode === 'title' || state.mode === 'dead' || state.mode === 'upgrade') return state;
  if (state.freeze > 0) {
    state.freeze = Math.max(0, state.freeze - FIXED_DT);
    updateParticlesAndTrails(state);
    return state;
  }

  state.tick += 1;
  state.time += FIXED_DT;
  state.world.playTime += FIXED_DT;
  state.metrics.steps += 1;
  state.transition = Math.max(0, state.transition - FIXED_DT * 2.7);
  state.flash = Math.max(0, state.flash - FIXED_DT * 2.4);
  state.shake = Math.max(0, state.shake - FIXED_DT * 2.8);

  updateRotatingObstacles(state);
  updateSunAndShadows(state);
  updatePlayer(state, input);
  updateSunAndShadows(state);
  updateBeam(state, input);
  for (const enemy of state.enemies) updateEnemy(state, enemy);
  updateBullets(state);
  updateSunAndShadows(state);
  updateReceivers(state);
  updatePickups(state);
  updateHazards(state);
  updateFlow(state);
  updateParticlesAndTrails(state);
  checkExits(state);
  updateRoomClear(state);

  state.enemies = state.enemies.filter((enemy) => !enemy.dead || enemy.hurtTimer > -0.5);
  state.metrics.maxEnemies = Math.max(state.metrics.maxEnemies, state.enemies.filter((enemy) => !enemy.dead).length);
  state.metrics.maxBullets = Math.max(state.metrics.maxBullets, state.bullets.length);
  return state;
}

export function stepFrames(state, frames, input = EMPTY_INPUT) {
  const count = clamp(Math.floor(frames), 0, 36000);
  for (let index = 0; index < count; index += 1) {
    const frameInput = typeof input === 'function' ? input(index, state) : input;
    stepGame(state, frameInput ?? EMPTY_INPUT);
  }
  return state;
}

export function drainEvents(state) {
  return state.events.splice(0, state.events.length);
}

export function getSnapshot(state) {
  const living = state.enemies.filter((enemy) => !enemy.dead);
  const boss = living.find((enemy) => enemy.boss);
  return {
    version: state.version,
    seed: state.seed,
    tick: state.tick,
    mode: state.mode,
    paused: state.paused,
    roomId: state.roomId,
    district: state.room?.district ?? null,
    player: {
      x: Number(state.player.x.toFixed(3)),
      y: Number(state.player.y.toFixed(3)),
      vx: Number(state.player.vx.toFixed(3)),
      vy: Number(state.player.vy.toFixed(3)),
      aimX: Number(state.player.aimX.toFixed(4)),
      aimY: Number(state.player.aimY.toFixed(4)),
      hp: state.mode === 'dead' ? state.player.maxHp : clamp(state.player.hp, 1, state.player.maxHp),
      maxHp: state.player.maxHp,
      heat: Number(state.player.heat.toFixed(4)),
      overheated: state.player.overheated,
      inShadow: state.player.inShadow,
      inUmbra: state.player.inUmbra,
      inHostileShadow: state.player.inHostileShadow,
      splitTimer: Number(state.player.splitTimer.toFixed(3)),
      cutChain: state.player.cutChain,
      dashCharges: state.player.dashCharges,
      maxDashCharges: state.player.maxDashCharges,
      sunPinned: state.player.sunPinned,
      flow: Number(state.player.flow.toFixed(4)),
      cuts: state.player.cuts,
      kills: state.player.kills,
      nightNames: state.player.nightNames,
      secrets: state.player.secrets,
      upgrades: [...state.player.upgrades].sort(),
    },
    room: {
      enemies: living.length,
      bullets: state.bullets.length,
      shadows: state.shadows.length,
      obstacles: state.obstacles.length,
      receiversActive: state.receivers.filter((receiver) => receiver.active).length,
      pickups: state.pickups.length,
    },
    boss: boss ? { id: boss.id, hp: Math.max(0, boss.hp), maxHp: boss.maxHp, phase: boss.phase } : null,
    world: {
      discovered: [...state.world.discovered].sort(),
      bosses: [...state.world.bosses].sort(),
      deaths: state.world.deaths,
    },
    metrics: { ...state.metrics },
  };
}

export function stateHash(state) {
  return hashObject(getSnapshot(state));
}

export function serializeGame(state) {
  return {
    version: SAVE_VERSION,
    seed: state.seed,
    roomId: state.roomId,
    completed: Boolean(state.completed),
    trueEnding: Boolean(state.trueEnding),
    player: {
      hp: state.mode === 'dead' ? state.player.maxHp : clamp(state.player.hp, 1, state.player.maxHp),
      maxHp: state.player.maxHp,
      maxDashCharges: state.player.maxDashCharges,
      beamDamageBonus: state.player.beamDamageBonus,
      score: state.player.score,
      bestFlow: state.player.bestFlow,
      cuts: state.player.cuts,
      kills: state.player.kills,
      secrets: state.player.secrets,
      nightNames: state.player.nightNames,
      lenses: state.player.lenses,
      dashShards: state.player.dashShards,
      upgrades: [...state.player.upgrades],
    },
    world: clone(state.world),
    rngState: state.rng.getState(),
  };
}

export function restoreGame(state, payload) {
  if (!payload || payload.version !== SAVE_VERSION || !getRoom(payload.roomId)) return false;
  state.world = { ...blankWorld(), ...clone(payload.world) };
  state.completed = Boolean(payload.completed);
  state.trueEnding = Boolean(payload.trueEnding);
  Object.assign(state.player, payload.player ?? {});
  state.player.hp = clamp(finite(state.player.hp, state.player.maxHp), 1, state.player.maxHp);
  state.player.upgrades = Array.isArray(payload.player?.upgrades) ? [...new Set(payload.player.upgrades)] : ['cut'];
  if (!state.player.upgrades.includes('cut')) state.player.upgrades.unshift('cut');
  if (Number.isFinite(payload.rngState)) state.rng.setState(payload.rngState);
  loadRoom(state, payload.roomId, { first: true });
  state.mode = state.completed ? 'ending' : 'playing';
  return true;
}

export function setScenario(state, name = 'shadow-lab') {
  state.scenario = name;
  state.mode = 'playing';
  state.paused = false;
  if (name === 'shadow-lab' || name === 'smoke') {
    state.room = {
      ...state.room,
      name: 'The Proof Room',
      exits: [],
      inscription: 'If the edge moves, the law is alive.',
    };
    state.player.x = 360;
    state.player.y = 450;
    state.player.previousX = 360;
    state.player.previousY = 450;
    state.player.aimX = 0;
    state.player.aimY = -1;
    state.player.upgrades = [...new Set([...state.player.upgrades, 'pin'])];
    state.obstacles = [
      { id: 'qa-pillar', shape: 'circle', x: 790, y: 450, r: 70, solid: true, castsShadow: true, interactive: true, material: 'bone-sundial', currentHp: Infinity },
      { id: 'qa-wall', shape: 'rect', x: 1220, y: 450, w: 70, h: 250, solid: true, castsShadow: true, breakable: true, hp: 20, currentHp: 20, secretTarget: 'qa-lens', interactive: true, material: 'cracked-cream-stone' },
    ];
    state.enemies = [makeEnemy({ id: 'qa-husk', type: 'husk', x: 960, y: 450, speed: 0 }, 0)];
    state.enemies[0].attackTimer = 999;
    state.receivers = [{ id: 'qa-receiver', x: 1060, y: 450, radius: 30, alignment: 'qa-song', target: null, requiredCaster: 'qa-pillar', charge: 0, active: false }];
    state.pickups = [{ id: 'qa-lens', type: 'beam-lens', x: 1300, y: 450, value: 0.06, requires: 'break:qa-wall', bob: 0 }];
    state.hazards = [];
    state.bullets = [];
    state.trails = [];
    updateSunAndShadows(state);
  } else if (name === 'stress') {
    state.enemies = [];
    state.bullets = [];
    for (let index = 0; index < 42; index += 1) {
      const angle = (index / 42) * TAU;
      state.enemies.push(makeEnemy({
        id: `stress-${index}`,
        type: index % 5 === 0 ? 'bell' : index % 3 === 0 ? 'needle' : 'moth',
        x: 800 + Math.cos(angle) * (220 + (index % 4) * 70),
        y: 450 + Math.sin(angle) * (180 + (index % 4) * 48),
      }, index));
    }
    for (let index = 0; index < 120; index += 1) {
      const angle = (index / 120) * TAU;
      makeBullet(state, { x: 800, y: 450, vx: Math.cos(angle) * (150 + index % 5 * 24), vy: Math.sin(angle) * (150 + index % 5 * 24) });
    }
    updateSunAndShadows(state);
  } else if (name === 'boss') {
    const bossRoom = ROOM_ORDER.find((id) => getRoom(id)?.boss) ?? state.roomId;
    loadRoom(state, bossRoom);
    state.player.upgrades = [...new Set([...state.player.upgrades, 'root-cut', 'pin', 'edge-sight', 'split'])];
  }
  return state;
}

export function runSmoke(seed = 1337) {
  const state = createGame({ seed, started: true });
  setScenario(state, 'smoke');
  const checks = {};
  const initial = getSnapshot(state);
  stepFrames(state, 45, { ...EMPTY_INPUT, moveX: 1, aimX: 1, aimY: 0 });
  checks.movement = state.player.x > initial.player.x + 20;
  const heatBefore = state.player.heat;
  stepFrames(state, 100, { ...EMPTY_INPUT, fire: true, aimX: 1, aimY: 0 });
  checks.heldFire = state.metrics.shots >= 8 && state.player.heat > heatBefore;
  checks.overheat = state.player.overheated;
  stepFrames(state, 220, { ...EMPTY_INPUT, fire: false, aimX: 1, aimY: 0 });
  checks.cooling = state.player.heat < 0.2 && !state.player.overheated;
  stepFrames(state, 120, EMPTY_INPUT);
  checks.receiverAlignment = state.metrics.alignments >= 1 && state.receivers.every((receiver) => receiver.active);
  checks.shadowAuthority = state.shadows.length >= 2 && state.shadows.every((shadow) => shadow.polygon.length >= 3);

  const cutState = createGame({ seed, started: true });
  setScenario(cutState, 'smoke');
  Object.assign(cutState.player, {
    sunPinned: true, pinX: 500, pinY: 450,
    x: 1080, y: 360, previousX: 1080, previousY: 360,
    dashCharges: 2,
  });
  stepGame(cutState, { ...EMPTY_INPUT, moveY: 1, aimX: 1, aimY: 0, dashPressed: true });
  stepFrames(cutState, 12, { ...EMPTY_INPUT, moveY: 1, aimX: 1, aimY: 0 });
  checks.shadowCut = cutState.metrics.shadowCuts >= 1 && cutState.player.cuts >= 1;
  checks.dashRefund = cutState.player.dashCharges >= 1;

  const wallState = createGame({ seed, started: true });
  setScenario(wallState, 'smoke');
  wallState.enemies = [];
  Object.assign(wallState.player, {
    sunPinned: true, pinX: 1000, pinY: 450,
    x: 850, y: 450, previousX: 850, previousY: 450,
    aimX: 1, aimY: 0,
  });
  stepFrames(wallState, 30, { ...EMPTY_INPUT, fire: true, aimX: 1, aimY: 0 });
  checks.realWallBreak = wallState.metrics.wallsBroken === 1
    && !wallState.obstacles.some((obstacle) => obstacle.id === 'qa-wall')
    && wallState.pickups.some((pickup) => pickup.id === 'qa-lens');

  const conversionState = createGame({ seed, started: true });
  setScenario(conversionState, 'smoke');
  conversionState.enemies = [];
  conversionState.obstacles = [];
  conversionState.bullets = [{
    id: 'qa-bullet', x: 860, y: 450, previousX: 860, previousY: 450,
    vx: 0, vy: 0, radius: 12, damage: 1, life: 99,
    hostile: true, converted: false, castsShadow: true, ownerId: null, kind: 'orb',
  }];
  Object.assign(conversionState.player, {
    sunPinned: true, pinX: 500, pinY: 450,
    x: 1020, y: 350, previousX: 1020, previousY: 350,
    dashCharges: 2,
  });
  stepGame(conversionState, { ...EMPTY_INPUT, moveY: 1, aimX: 1, aimY: 0, dashPressed: true });
  stepFrames(conversionState, 12, { ...EMPTY_INPUT, moveY: 1, aimX: 1, aimY: 0 });
  checks.dangerConversion = conversionState.metrics.convertedBullets === 1
    && conversionState.bullets.some((bullet) => bullet.converted && !bullet.hostile);

  const transitionState = createGame({ seed, started: true });
  transitionState.player.x = ROOM_W - transitionState.player.radius;
  transitionState.player.y = 450;
  transitionState.player.previousX = transitionState.player.x;
  transitionState.player.previousY = transitionState.player.y;
  stepFrames(transitionState, 3, { ...EMPTY_INPUT, moveX: 1 });
  checks.roomTransition = transitionState.roomId === 'gg-lattice'
    && transitionState.player.x < 100
    && transitionState.metrics.transitions === 1;

  const serialized = serializeGame(state);
  const restored = createGame({ seed: 1, started: true });
  checks.saveRestore = restoreGame(restored, serialized) && restored.roomId === state.roomId && restored.player.upgrades.includes('pin');
  const twinA = createGame({ seed, started: true });
  const twinB = createGame({ seed, started: true });
  setScenario(twinA, 'smoke');
  setScenario(twinB, 'smoke');
  const script = (index) => ({ ...EMPTY_INPUT, moveY: index < 30 ? -1 : 0, aimX: Math.cos(index * 0.02), aimY: Math.sin(index * 0.02), fire: index % 4 < 2, dashPressed: index === 40 });
  stepFrames(twinA, 120, script);
  stepFrames(twinB, 120, script);
  checks.deterministic = stateHash(twinA) === stateHash(twinB);
  const passed = Object.values(checks).every(Boolean);
  return {
    passed,
    checks,
    snapshot: getSnapshot(state),
    stateHash: stateHash(state),
    twinHash: stateHash(twinA),
    evidence: {
      cuts: cutState.metrics.shadowCuts,
      convertedBullets: conversionState.metrics.convertedBullets,
      wallsBroken: wallState.metrics.wallsBroken,
      transitionRoom: transitionState.roomId,
    },
  };
}

export function getDistrict(state) {
  return DISTRICT_BY_ID.get(state.room?.district) ?? DISTRICTS[0];
}

export { EMPTY_INPUT };
