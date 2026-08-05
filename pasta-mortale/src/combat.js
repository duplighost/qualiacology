import * as THREE from "../vendor/three.module.js?v=r165";
const TYPE_DATA = Object.freeze({
  twirler: { name: "Fork-Face Twirler", health: 54, speed: 2.5, damage: 8, range: 1.55, cadence: 1.08, scale: 1, color: 0xe9b64f, role: "rush", sight: 24 },
  saucier: { name: "Marinara Saucier", health: 84, speed: 1.6, damage: 10, range: 17, cadence: 1.65, scale: 1.08, color: 0xf2bd5b, ranged: true, role: "suppress", sight: 30 },
  colossus: { name: "Carbonara Colossus", health: 205, speed: 1.04, damage: 20, range: 2.35, cadence: 1.52, scale: 1.5, color: 0xf1d99a, role: "hold", sight: 25 },
  noodlemancer: { name: "The Noodlemancer", health: 520, speed: 1.38, damage: 15, range: 21, cadence: 1.22, scale: 1.72, color: 0xffdc74, ranged: true, boss: true, role: "commander", sight: 38 }
});
const WAVE_DATA = [
  ["twirler", "twirler", "twirler", "twirler"],
  ["saucier", "twirler", "saucier", "colossus", "twirler"],
  ["twirler", "saucier", "twirler", "colossus", "saucier", "twirler"],
  ["noodlemancer"]
];
const clamp = THREE.MathUtils.clamp;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const HIP_POSITION = Object.freeze({ x: 0.32, y: -0.28, z: -0.58 });
const ADS_POSITION = Object.freeze({ x: 0.005, y: -0.215, z: -0.585 });
const EMERGENCY_MAG_SIZE = 15;
const EMERGENCY_RELOAD_DURATION = 2.2;
const MAX_RESERVE = 240;
const LOW_AMMO_THRESHOLD = 8;
const CRITICAL_AMMO_THRESHOLD = 3;
// Longer than one 9.5 RPM cadence window so a deliberate second click made
// during recoil is never eaten by fixed-step timing jitter.
const FIRE_BUFFER_DURATION = 0.14;
const AUTO_RELOAD_DELAY = 0.09;
const AMMO_SALVAGE = Object.freeze({ twirler: 6, saucier: 10, colossus: 18, noodlemancer: 30 });
const PUNCH_RANGE = 2.35;
const PUNCH_DURATION = 0.38;
const PUNCH_COOLDOWN = 0.56;
const PUNCH_IMPACT_DELAY = 0.095;
const PUNCH_CONE_DOT = Math.cos(THREE.MathUtils.degToRad(56));
const KEEP_OUT_DISTANCE = Object.freeze({
  twirler: 1.8,
  saucier: 1.95,
  colossus: 2.25,
  noodlemancer: 2.25
});
const LAST_HOSTILE_RELOCATION_FAILURE_TIME = 8;
// Fodder still punch-cooks into an instant spaghetti burst, but high-value
// pasta (the colossus and the three-phase boss) only take a bounded chunk so a
// single melee tap can no longer skip the entire climax fight.
const PUNCH_DAMAGE = 60;
const OPENING_LESSON_TIMEOUT = 15;
const OPENING_FLOOD_RAMP = 3;
const OPENING_RELEASE_DELAYS = Object.freeze([0.45, 1.05, 1.65]);
const EVENT_QUEUE_LIMIT = 96;
const ARCHETYPE_CUE_COLORS = Object.freeze({
  twirler: 0xffc34f,
  saucier: 0x43dfff,
  colossus: 0xfff0bd
});
const BOSS_PHASE_CUE_COLORS = Object.freeze([0, 0xffc34f, 0x43dfff, 0xfff0bd]);
const BOSS_PHASE_EMISSIVE_COLORS = Object.freeze([0, 0x4f2b05, 0x073843, 0x51462d]);

function cueColorFor(type, bossPhase = 1) {
  if (type === "noodlemancer") return BOSS_PHASE_CUE_COLORS[clamp(Math.round(finite(bossPhase, 1)), 1, 3)];
  return ARCHETYPE_CUE_COLORS[type] || ARCHETYPE_CUE_COLORS.twirler;
}

export async function createPastaCombat(options = {}) {
  const scene = options.scene || new THREE.Scene();
  const camera = options.camera || new THREE.PerspectiveCamera(66, 1, 0.05, 140);
  const baseCameraFov = finite(camera.fov, 66);
  const baseCameraZoom = Math.max(0.01, finite(camera.zoom, 1));
  const adsCameraZoom = baseCameraZoom * 1.32;
  const quality = options.quality === "low" ? "low" : "high";
  const sampleSurfaceY = typeof options.sampleSurfaceY === "function" ? options.sampleSurfaceY : () => 0;
  const positionBlockedCallback = typeof options.isPositionBlocked === "function" ? options.isPositionBlocked : () => false;
  const resolveMovementCallback = typeof options.resolveMovement === "function"
    ? options.resolveMovement
    : (position, delta) => ({ x: finite(position?.x) + finite(delta?.x), y: finite(position?.y), z: finite(position?.z) + finite(delta?.z), blocked: false });
  const traceWorldCallback = typeof options.traceWorld === "function"
    ? options.traceWorld
    : (_from, to) => ({ blocked: false, fraction: 1, point: { x: finite(to?.x), y: finite(to?.y), z: finite(to?.z) } });
  const combatDataSource = typeof options.getCombatData === "function"
    ? options.getCombatData
    : () => options.combatData || null;
  const callbacks = { message: options.onMessage, damage: options.onDamage, victory: options.onVictory,
    defeat: options.onDefeat, splat: options.onLensSplat, audio: options.onAudio, punch: options.onPunchImpact };
  const enemies = [], projectiles = [], bombs = [], noodlePieces = [], effects = [], errors = [];
  const eventQueue = [];
  const raycaster = new THREE.Raycaster();
  const clockDirection = new THREE.Vector3();
  const worldCamera = new THREE.Vector3();
  const playerVelocity = new THREE.Vector3();
  const scratchA = new THREE.Vector3();
  const scratchB = new THREE.Vector3();
  const scratchC = new THREE.Vector3();
  const shotOrigin = new THREE.Vector3();
  const shotDirection = new THREE.Vector3();
  const aimEuler = new THREE.Euler(0, 0, 0, "YXZ");
  let nextEnemyId = 1, elapsed = 0, fireCooldown = 0, fireBufferTimer = 0, autoReloadTimer = 0, reloadTimer = 0, bombCooldown = 0;
  let punchCooldown = 0, punchTimer = 0, punchImpactPending = false, punchHitStop = 0;
  let punchTargetId = null, punchTargetDistance = null;
  let muzzleTimer = 0, recoil = 0, waveIndex = 0, waveTimer = 0.85, combatGrace = 0, enemyDamageCooldown = 0, enemyProjectileDamageCooldown = 0, wavesSuppressed = false;
  let squadThinkTimer = 0;
  let victory = false, defeated = false, firing = false, aiming = false, aimProgress = 0, lastKill = null;
  let triggerReleaseRequired = false;
  let reloadStage = 0;
  let eventSequence = 0;
  let lastEvent = null;
  let lastPlayer = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, eyeHeight: 1.62 };
  let lastPlayerSpeed = 0;
  let noodleCollisions = 0, noodleImpulses = 0;
  const player = { health: 100, maxHealth: 100, sauceArmor: 50, armor: 50 };
  const weapon = {
    ammo: 30, reserve: 180, magazineSize: 30, fireRate: 9.5,
    reloadDuration: 1.48, activeReloadDuration: 0, reloadMode: "idle",
    emergencyMagSize: EMERGENCY_MAG_SIZE, lowAmmoThreshold: LOW_AMMO_THRESHOLD,
    criticalAmmoThreshold: CRITICAL_AMMO_THRESHOLD, reloading: false, reloadProgress: 0, firing: false
  };
  const weaponTelemetry = {
    lastShotAt: -1,
    recentShotIntervalsMs: [],
    bufferedShots: 0,
    lowAmmoCueCount: 0,
    criticalAmmoCueCount: 0,
    emptyCueCount: 0,
    lastLowAmmoRound: null,
    autoReloads: 0,
    reloadStageEvents: 0
  };
  const punchTelemetry = {
    lastResult: "idle",
    lastTargetId: null,
    lastDistance: null,
    lastExplosionPieces: 0,
    lastExplosionEnergy: 0,
    lastImpactAt: -1
  };
  const stats = freshStats();
  const pendingWaveSpawns = [];
  let opening = freshOpeningState();
  const keepOutTelemetry = freshKeepOutTelemetry();
  const materials = {
    noodle: new THREE.MeshPhysicalMaterial({ color: 0xf5c76a, roughness: 0.32, metalness: 0.01, clearcoat: 0.52, clearcoatRoughness: 0.2 }),
    pale: new THREE.MeshPhysicalMaterial({ color: 0xffe7a6, roughness: 0.34, clearcoat: 0.44, clearcoatRoughness: 0.18 }),
    toasted: new THREE.MeshPhysicalMaterial({ color: 0xb86d20, roughness: 0.38, clearcoat: 0.35 }),
    sauce: new THREE.MeshPhysicalMaterial({ color: 0x9f160c, roughness: 0.2, metalness: 0.02, clearcoat: 0.9, clearcoatRoughness: 0.12, emissive: 0x2e0200 }),
    darkSauce: new THREE.MeshPhysicalMaterial({ color: 0x3b0906, roughness: 0.24, clearcoat: 0.65, clearcoatRoughness: 0.18 }),
    eye: new THREE.MeshBasicMaterial({ color: 0xfff0a8, toneMapped: false }),
    mouth: new THREE.MeshStandardMaterial({ color: 0x220201, roughness: 0.58 }),
    roleGold: new THREE.MeshBasicMaterial({ color: ARCHETYPE_CUE_COLORS.twirler, transparent: true, opacity: 0.78, depthWrite: false, toneMapped: false }),
    roleCyan: new THREE.MeshBasicMaterial({ color: ARCHETYPE_CUE_COLORS.saucier, transparent: true, opacity: 0.82, depthWrite: false, toneMapped: false }),
    roleCream: new THREE.MeshBasicMaterial({ color: ARCHETYPE_CUE_COLORS.colossus, transparent: true, opacity: 0.76, depthWrite: false, toneMapped: false }),
    hitbox: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  };
  const viewModel = buildViewModel();
  camera.add(viewModel.root);
  function combatData() {
    try {
      const value = combatDataSource?.();
      return value && typeof value === "object" ? value : null;
    } catch (error) {
      errors.push(`combatData: ${String(error?.message || error)}`.slice(0, 180));
      return null;
    }
  }
  function freshStats() {
    return {
      shots: 0, shotsFired: 0, hits: 0, hitsLanded: 0, headshots: 0, kills: 0,
      score: 0, damageDone: 0, damageTaken: 0, sauceThrows: 0, sauceBombs: 0, coverBlocks: 0,
      sauceKills: 0, reloads: 0, handRolls: 0, ammoSalvaged: 0, wavesCleared: 0, noodleImpulses: 0,
      tacticalTransitions: 0, coverUses: 0, flanks: 0, enemyShots: 0, bossPhaseTransitions: 0,
      navigationRecoveries: 0, navigationRelocations: 0, lastHostilePursuits: 0, lastHostileRelocations: 0,
      punchAttempts: 0, punchHits: 0, punchMisses: 0, punchKills: 0, punchExplosions: 0
    };
  } function freshKeepOutTelemetry() {
    return {
      nearestHostileDistance: null,
      currentIntrusionDuration: 0,
      longestIntrusionDuration: 0,
      currentPeakIntrusion: 0,
      peakIntrusion: 0,
      forcedSeparations: 0,
      forcedSeparationFrames: 0,
      estimatedCentralHostileCoverage: 0,
      peakEstimatedCentralHostileCoverage: 0
    };
  } function freshOpeningState() {
    return {
      active: true,
      protected: false,
      status: "waiting-wave",
      startedAt: null,
      deadlineAt: OPENING_LESSON_TIMEOUT,
      firstEnemyId: null,
      firstKillAt: null,
      completedAt: null,
      completionReason: null,
      firstReinforcementAt: null,
      lastReinforcementAt: null,
      releasedCount: 0,
      totalReinforcements: OPENING_RELEASE_DELAYS.length,
      floodScale: 0
    };
  } function call(kind, ...args) {
    try {
      if (typeof callbacks[kind] === "function") callbacks[kind](...args);
    } catch (error) {
      errors.push(`${kind}: ${String(error?.message || error)}`.slice(0, 180));
      if (errors.length > 12) errors.shift();
    }
  } function eventPoint(value, fallback = null) {
    if (!value || typeof value !== "object") return fallback;
    const x = Number(value.x);
    const y = Number(value.y);
    const z = Number(value.z);
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : fallback;
  } function emitEvent(type, payload = {}) {
    const event = {
      sequence: ++eventSequence,
      type: String(type || "unknown"),
      time: finite(elapsed),
      wave: Math.max(1, waveIndex || 1),
      ...payload
    };
    for (const key of ["origin", "position", "direction", "normal", "targetPosition"]) {
      if (event[key] != null) event[key] = eventPoint(event[key], null);
    }
    eventQueue.push(event);
    if (eventQueue.length > EVENT_QUEUE_LIMIT) eventQueue.splice(0, eventQueue.length - EVENT_QUEUE_LIMIT);
    lastEvent = event;
    return event;
  } function consumeEvents() {
    return eventQueue.splice(0).map((event) => ({ ...event }));
  } function buildViewModel() {
    const root = new THREE.Group();
    root.name = "Al Dente-12 spaghetti rifle";
    root.position.set(HIP_POSITION.x, HIP_POSITION.y, HIP_POSITION.z);
    const gun = new THREE.Group();
    gun.rotation.x = -0.035;
    root.add(gun);
    const barrelCluster = new THREE.Group();
    barrelCluster.position.z = -0.17;
    gun.add(barrelCluster);
    for (let i = 0; i < 11; i += 1) {
      const angle = i / 11 * Math.PI * 2;
      const ring = i < 7 ? 0.052 : 0.027;
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.024, 0.83 + (i % 3) * 0.025, quality === "low" ? 7 : 12),
        i % 4 === 0 ? materials.toasted : materials.noodle
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.rotation.z = Math.sin(angle) * 0.02;
      barrel.position.set(Math.cos(angle) * ring, Math.sin(angle) * ring, -0.12);
      barrel.castShadow = true;
      barrelCluster.add(barrel);
    }
    const receiver = new THREE.Mesh(new THREE.SphereGeometry(0.122, quality === "low" ? 12 : 20, 12), materials.sauce);
    receiver.scale.set(1.32, 0.9, 1.78);
    receiver.position.set(0, -0.006, 0.16);
    receiver.castShadow = true;
    gun.add(receiver);
    const receiverCoil = new THREE.Mesh(new THREE.TorusKnotGeometry(0.092, 0.023, quality === "low" ? 32 : 64, 8, 2, 3), materials.pale);
    receiverCoil.rotation.x = Math.PI / 2;
    receiverCoil.scale.set(1.18, 0.84, 1.08);
    receiverCoil.position.z = 0.12;
    gun.add(receiverCoil);
    const drum = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.038, 9, quality === "low" ? 16 : 28), materials.darkSauce);
    drum.rotation.y = Math.PI / 2;
    drum.position.set(-0.11, -0.055, 0.21);
    gun.add(drum);
    const stock = tube([[0, -0.015, 0.21], [0.055, -0.02, 0.38], [0.13, -0.07, 0.51]], 0.038, materials.toasted, 9);
    gun.add(stock);
    const sightStem = segment([0, 0.07, -0.29], [0, 0.135, -0.36], 0.011, materials.pale);
    const forkSight = new THREE.Group();
    forkSight.add(sightStem);
    for (let i = -1; i <= 1; i += 1) {
      forkSight.add(segment([i * 0.024, 0.128, -0.35], [i * 0.024, 0.19 - Math.abs(i) * 0.012, -0.39], 0.007, materials.pale));
    }
    gun.add(forkSight);
    const muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.092, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc54d, transparent: true, opacity: 0.9, toneMapped: false })
    );
    muzzle.scale.set(0.7, 0.7, 1.8);
    muzzle.position.z = -0.72;
    muzzle.visible = false;
    gun.add(muzzle);
    const arms = [];
    const addForearmBundle = (sign) => {
      const group = new THREE.Group();
      for (let i = 0; i < 4; i += 1) {
        const offset = (i - 1.5) * 0.018;
        group.add(tube([
          [sign * (0.64 + offset), -0.43, 0.13],
          [sign * (0.42 + offset * 0.4), -0.25 + Math.sin(i) * 0.012, -0.01],
          [sign * (0.16 + offset * 0.25), -0.09, 0.06 + i * 0.006]
        ], 0.027, i === 0 ? materials.toasted : materials.pale, 9));
      }
      const hand = new THREE.Mesh(new THREE.TorusKnotGeometry(0.052, 0.019, 32, 7, 2, 3), materials.noodle);
      hand.position.set(sign * 0.15, -0.09, 0.06);
      group.add(hand);
      root.add(group);
      arms.push(group);
    };
    addForearmBundle(-1);
    addForearmBundle(1);
    return { root, gun, muzzle, arms, strands: 23 };
  } function tube(points, radius, material, segments = 10) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const geometry = new THREE.TubeGeometry(curve, quality === "low" ? segments : segments * 2, radius, quality === "low" ? 5 : 8, false);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  } function segment(a, b, radius, material) {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.84, radius, direction.length(), quality === "low" ? 6 : 9),
      material
    );
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    return mesh;
  } function makeWetEnemyMaterial(data, type) {
    return new THREE.MeshPhysicalMaterial({
      color: data.color,
      roughness: type === "colossus" ? 0.4 : 0.28,
      metalness: 0.01,
      clearcoat: type === "noodlemancer" ? 0.82 : 0.62,
      clearcoatRoughness: 0.16,
      emissive: type === "noodlemancer" ? 0x3b1700 : 0x100300,
      emissiveIntensity: type === "noodlemancer" ? 0.9 : 0.28
    });
  } function markHit(mesh, id, part, hitMeshes) {
    mesh.userData = { ...mesh.userData, enemyId: id, hitPart: part };
    mesh.castShadow = mesh.material !== materials.hitbox;
    hitMeshes.push(mesh);
    return mesh;
  } function buildRoleAccent(type, s) {
    if (type === "noodlemancer") return null;
    const material = type === "saucier"
      ? materials.roleCyan
      : type === "colossus"
        ? materials.roleCream
        : materials.roleGold;
    const radius = (type === "colossus" ? 0.34 : type === "saucier" ? 0.31 : 0.23) * s;
    const accent = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.025 * s, quality === "low" ? 5 : 7, quality === "low" ? 18 : 28),
      material
    );
    accent.name = `${type} role silhouette accent`;
    if (type === "twirler") {
      // A low, compact belt makes the fast melee unit read as a tight knot
      // instead of another upright ranged silhouette.
      accent.position.set(0, 0.82 * s, 0);
      accent.rotation.x = Math.PI / 2;
      accent.scale.set(1.12, 1.12, 1.12);
    } else if (type === "saucier") {
      // A narrow cyan pressure-loop frames the backpack and ranged apparatus.
      accent.position.set(0, 1.12 * s, -0.1 * s);
      accent.scale.set(0.58, 1.38, 1);
    } else {
      // A broad cream yoke reinforces the heavy's width without touching its
      // hitboxes, locomotion footprint, or keep-out distance.
      accent.position.set(0, 1.34 * s, -0.08 * s);
      accent.scale.set(1.55, 0.66, 1);
    }
    accent.userData.cueBaseY = accent.position.y;
    accent.userData.cueScaleX = accent.scale.x;
    accent.userData.cueScaleY = accent.scale.y;
    accent.userData.cueScaleZ = accent.scale.z;
    accent.userData.cueBaseRotationZ = accent.rotation.z;
    return accent;
  } function buildPastaWeapon(type, s, bodyMaterial) {
    const root = new THREE.Group();
    root.position.set(type === "noodlemancer" ? 0.38 * s : 0, 1.04 * s, 0.27 * s);
    const ranged = TYPE_DATA[type].ranged;
    const telegraph = new THREE.Mesh(
      new THREE.SphereGeometry(0.075 * s, 10, 7),
      new THREE.MeshBasicMaterial({ color: cueColorFor(type), transparent: true, opacity: 0, toneMapped: false, depthWrite: false })
    );
    telegraph.visible = false;
    if (ranged) {
      const sauceReceiver = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 13, 9), materials.sauce);
      sauceReceiver.scale.set(1.35, 0.85, 1.55);
      root.add(sauceReceiver);
      const count = type === "noodlemancer" ? 9 : 6;
      for (let i = 0; i < count; i += 1) {
        const angle = i / count * Math.PI * 2;
        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018 * s, 0.026 * s, (type === "noodlemancer" ? 0.72 : 0.54) * s, 7),
          i % 3 === 0 ? materials.toasted : bodyMaterial
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(Math.cos(angle) * 0.055 * s, Math.sin(angle) * 0.055 * s, 0.24 * s);
        barrel.castShadow = true;
        root.add(barrel);
      }
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.095 * s, 0.115 * s, 0.32 * s, 12), materials.darkSauce);
      tank.rotation.z = Math.PI / 2;
      tank.position.set(-0.2 * s, -0.12 * s, -0.04 * s);
      root.add(tank);
      telegraph.position.z = (type === "noodlemancer" ? 0.63 : 0.51) * s;
      root.add(telegraph);
    } else {
      const handle = segment([0, 0.3 * s, 0.05 * s], [0, -0.6 * s, 0.38 * s], 0.035 * s, materials.toasted);
      root.add(handle);
      const forkHead = new THREE.Group();
      forkHead.position.set(0, -0.59 * s, 0.38 * s);
      const forkScale = type === "colossus" ? 1.45 : 1;
      forkHead.add(segment([-0.19 * s * forkScale, 0, 0], [0.19 * s * forkScale, 0, 0], 0.04 * s, materials.pale));
      for (let i = -2; i <= 2; i += 1) {
        forkHead.add(segment([i * 0.085 * s * forkScale, 0, 0], [i * 0.085 * s * forkScale, -0.34 * s * forkScale, 0.08 * s], 0.025 * s, materials.pale));
      }
      root.add(forkHead);
      telegraph.position.set(0, -0.72 * s, 0.42 * s);
      root.add(telegraph);
    }
    return { root, telegraph };
  } function buildEnemyMesh(type, id) {
    const data = TYPE_DATA[type];
    const s = data.scale;
    const root = new THREE.Group();
    root.name = `${data.name} ${id}`;
    const rig = new THREE.Group();
    root.add(rig);
    const enemyMaterial = makeWetEnemyMaterial(data, type);
    const accent = type === "saucier" ? materials.sauce : type === "colossus" ? materials.pale : materials.toasted;
    const hitMeshes = [];
    const strandMeshes = [];
    const torso = new THREE.Group();
    rig.add(torso);
    const roleAccent = buildRoleAccent(type, s);
    if (roleAccent) rig.add(roleAccent);
    const torsoCount = type === "noodlemancer" ? 18 : type === "colossus" ? 15 : 11;
    const torsoWidth = (type === "colossus" ? 0.38 : type === "noodlemancer" ? 0.34 : 0.27) * s;
    for (let i = 0; i < torsoCount; i += 1) {
      const lane = (i / Math.max(1, torsoCount - 1) - 0.5) * 2;
      const layer = i % 3;
      const x = lane * torsoWidth;
      const z = (layer - 1) * 0.075 * s + Math.sin(i * 2.1) * 0.025 * s;
      const strand = tube([
        [x * 0.72, 0.46 * s, z],
        [x * 1.04 + Math.sin(i) * 0.035 * s, 0.84 * s, z + Math.cos(i) * 0.055 * s],
        [x * 0.88, 1.25 * s, z * 0.55],
        [x * 0.54, 1.5 * s, z * 0.25]
      ], (type === "colossus" ? 0.052 : 0.041) * s, i % 5 === 0 ? accent : enemyMaterial, 10);
      markHit(strand, id, "body", hitMeshes);
      rig.add(strand);
      strandMeshes.push(strand);
    }
    const hips = new THREE.Mesh(new THREE.TorusKnotGeometry(0.18 * s, 0.065 * s, quality === "low" ? 36 : 64, 9, 2, 3), accent);
    hips.position.y = 0.55 * s;
    hips.scale.set(1.35, 0.72, 1.05);
    markHit(hips, id, "body", hitMeshes);
    rig.add(hips);
    const legGroups = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.15 * s, 0.53 * s, 0);
      for (let i = 0; i < (type === "colossus" ? 6 : 4); i += 1) {
        const strand = tube([
          [side * i * 0.006 * s, 0, 0],
          [side * (0.045 + i * 0.004) * s, -0.25 * s, Math.sin(i) * 0.025 * s],
          [side * (0.08 + i * 0.005) * s, -0.53 * s, 0.03 * s]
        ], (type === "colossus" ? 0.045 : 0.031) * s, i === 0 ? accent : enemyMaterial, 8);
        markHit(strand, id, "body", hitMeshes);
        leg.add(strand);
        strandMeshes.push(strand);
      }
      legGroups.push(leg);
      rig.add(leg);
    }
    const shoulderCoil = new THREE.Mesh(new THREE.TorusGeometry(0.31 * s, (type === "colossus" ? 0.1 : 0.066) * s, 9, quality === "low" ? 20 : 34), accent);
    shoulderCoil.position.y = 1.35 * s;
    shoulderCoil.rotation.x = Math.PI / 2;
    shoulderCoil.scale.x = type === "colossus" ? 1.4 : 1.12;
    markHit(shoulderCoil, id, "body", hitMeshes);
    rig.add(shoulderCoil);
    if (type === "colossus") {
      for (const side of [-1, 1]) {
        const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 12, 8), materials.pale);
        pauldron.scale.set(1.25, 0.72, 1);
        pauldron.position.set(side * 0.39 * s, 1.34 * s, 0);
        markHit(pauldron, id, "body", hitMeshes);
        rig.add(pauldron);
      }
    }
    const leftArm = new THREE.Group();
    const rightArm = new THREE.Group();
    for (const [side, arm] of [[-1, leftArm], [1, rightArm]]) {
      arm.position.set(side * 0.29 * s, 1.34 * s, 0);
      const gripX = data.ranged ? -side * 0.18 * s : side * 0.18 * s;
      const gripY = data.ranged ? -0.29 * s : -0.47 * s;
      const gripZ = data.ranged ? 0.28 * s : 0.2 * s;
      for (let i = 0; i < (type === "colossus" ? 6 : 4); i += 1) {
        const strand = tube([
          [0, i * 0.006 * s, 0],
          [side * 0.12 * s, -0.2 * s, 0.08 * s + i * 0.008 * s],
          [gripX + side * i * 0.005 * s, gripY, gripZ]
        ], (type === "colossus" ? 0.04 : 0.029) * s, i === 0 ? accent : enemyMaterial, 8);
        markHit(strand, id, "body", hitMeshes);
        arm.add(strand);
        strandMeshes.push(strand);
      }
      rig.add(arm);
    }
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.67 * s;
    rig.add(headGroup);
    const cranialTangle = new THREE.Mesh(
      new THREE.TorusKnotGeometry(
        0.145 * s,
        0.046 * s,
        quality === "low" ? 34 : 68,
        quality === "low" ? 7 : 10,
        type === "noodlemancer" ? 3 : 2,
        type === "colossus" ? 5 : 3
      ),
      enemyMaterial
    );
    cranialTangle.name = "wet tangled spaghetti cranium";
    cranialTangle.rotation.set(0.4, 0.25 + s * 0.1, 0.72);
    cranialTangle.scale.set(type === "colossus" ? 1.35 : 1.15, 1.08, 0.92);
    cranialTangle.position.z = -0.025 * s;
    markHit(cranialTangle, id, "head", hitMeshes);
    headGroup.add(cranialTangle);
    const headLoops = type === "noodlemancer" ? 7 : 5;
    for (let i = 0; i < headLoops; i += 1) {
      const loop = new THREE.Mesh(
        new THREE.TorusGeometry((0.17 + (i % 2) * 0.025) * s, (0.036 + (i % 3) * 0.005) * s, 8, quality === "low" ? 18 : 30),
        i % 4 === 0 ? accent : enemyMaterial
      );
      loop.position.y = (i - (headLoops - 1) / 2) * 0.055 * s;
      loop.rotation.z = i * 0.41;
      loop.scale.x = 1.06 + Math.sin(i) * 0.08;
      markHit(loop, id, "head", hitMeshes);
      headGroup.add(loop);
      strandMeshes.push(loop);
    }
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.145 * s, 14, 10), materials.darkSauce);
    face.scale.set(1.02, 0.83, 0.34);
    face.position.z = 0.155 * s;
    markHit(face, id, "head", hitMeshes);
    headGroup.add(face);
    const eyes = [];
    const eyeSpacing = type === "colossus" ? 0.082 : 0.07;
    for (const side of [-1, 1]) {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.052 * s, 10, 7), materials.mouth);
      socket.scale.set(1.15, 0.78, 0.5);
      socket.position.set(side * eyeSpacing * s, 0.035 * s, 0.205 * s);
      headGroup.add(socket);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022 * s, 9, 6), materials.eye);
      eye.position.set(side * eyeSpacing * s, 0.04 * s, 0.233 * s);
      headGroup.add(eye);
      eyes.push(eye);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.062 * s, 0.014 * s, 6, 16, Math.PI), materials.mouth);
    mouth.position.set(0, -0.064 * s, 0.224 * s);
    mouth.rotation.z = Math.PI;
    headGroup.add(mouth);
    if (type === "twirler") {
      for (let i = -1; i <= 1; i += 1) {
        const tine = segment([i * 0.045 * s, -0.04 * s, 0.22 * s], [i * 0.045 * s, -0.15 * s, 0.31 * s], 0.012 * s, materials.pale);
        headGroup.add(tine);
      }
    }
    const weapon = buildPastaWeapon(type, s, enemyMaterial);
    rig.add(weapon.root);
    let crown = null;
    let spellRing = null;
    if (type === "saucier") {
      const backpack = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.18 * s, 0.52 * s, 13), materials.sauce);
      backpack.position.set(0, 1.03 * s, -0.22 * s);
      backpack.rotation.x = 0.08;
      rig.add(backpack);
      const hose = tube([[-0.1 * s, 1.24 * s, -0.23 * s], [-0.3 * s, 1.05 * s, 0.02], [-0.16 * s, 0.98 * s, 0.25 * s]], 0.026 * s, materials.darkSauce, 9);
      rig.add(hose);
    }
    if (type === "noodlemancer") {
      crown = new THREE.Group();
      crown.position.y = 1.98 * s;
      for (let i = 0; i < 9; i += 1) {
        const angle = i / 9 * Math.PI * 2;
        crown.add(tube([
          [Math.cos(angle) * 0.14 * s, 0, Math.sin(angle) * 0.14 * s],
          [Math.cos(angle) * 0.23 * s, 0.18 * s, Math.sin(angle) * 0.23 * s],
          [Math.cos(angle + 0.3) * 0.12 * s, 0.34 * s + (i % 2) * 0.08 * s, Math.sin(angle + 0.3) * 0.12 * s]
        ], 0.025 * s, i % 3 === 0 ? materials.sauce : materials.pale, 8));
      }
      rig.add(crown);
      spellRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.52 * s, 0.022 * s, 7, quality === "low" ? 26 : 44),
        new THREE.MeshBasicMaterial({ color: cueColorFor(type), transparent: true, opacity: 0.58, toneMapped: false })
      );
      spellRing.position.y = 1.12 * s;
      spellRing.rotation.x = Math.PI / 2;
      rig.add(spellRing);
    }
    const bodyHit = new THREE.Mesh(new THREE.BoxGeometry(0.54 * s, 1.18 * s, 0.46 * s), materials.hitbox);
    bodyHit.position.y = 0.91 * s;
    markHit(bodyHit, id, "body", hitMeshes);
    rig.add(bodyHit);
    const headHit = new THREE.Mesh(new THREE.SphereGeometry(0.25 * s, 8, 6), materials.hitbox);
    headHit.position.y = 1.66 * s;
    markHit(headHit, id, "head", hitMeshes);
    rig.add(headHit);
    return {
      root, rig, torso, headGroup, hitMeshes, leftArm, rightArm, legGroups, strandMeshes,
      weapon: weapon.root, telegraph: weapon.telegraph, roleAccent, eyes, crown, spellRing,
      strands: strandMeshes.length + (type === "noodlemancer" ? 9 : 0), material: enemyMaterial
    };
  } function spawnEnemy(rawType = "twirler", position = null, stationary = false, autoSpawn = false) {
    const config = rawType && typeof rawType === "object" ? rawType : null;
    const requested = String(config?.type || rawType || "twirler").toLowerCase();
    const type = Object.hasOwn(TYPE_DATA, requested) ? requested : "twirler";
    const data = TYPE_DATA[type];
    const id = String(config?.id || `pasta-${nextEnemyId++}`);
    const mesh = buildEnemyMesh(type, id);
    const fallback = defaultSpawnPosition(enemies.length, type);
    const requestedPosition = config?.position || position || fallback;
    const pos = Boolean(config?.autoSpawn ?? autoSpawn)
      ? findSpawnPosition(requestedPosition, enemies.length, data.scale)
      : requestedPosition;
    const spawnX = finite(pos?.x, fallback.x);
    const spawnZ = finite(pos?.z, fallback.z);
    const spawnHintY = finite(pos?.y, fallback.y);
    const spawnGroundY = surfaceY(spawnX, spawnZ, spawnHintY);
    const footClearance = 0.035 * data.scale;
    mesh.root.position.set(spawnX, spawnGroundY + footClearance, spawnZ);
    scene.add(mesh.root);
    const maximum = Math.max(1, finite(config?.maxHealth ?? config?.health ?? config?.hp, data.health));
    const arenaData = combatData();
    const suppliedRoles = arenaData?.roles || arenaData?.tacticalRoles || arenaData?.roleAssignments || null;
    const suppliedRole = Array.isArray(suppliedRoles)
      ? suppliedRoles[enemies.length % Math.max(1, suppliedRoles.length)]
      : suppliedRoles?.[id] ?? suppliedRoles?.[type];
    const role = String(config?.role || suppliedRole || data.role || "rush");
    const enemy = {
      id, type, name: data.name, health: maximum, maxHealth: maximum, alive: true,
      stationary: Boolean(config?.stationary ?? stationary), boss: Boolean(data.boss), summoned: Boolean(config?.summoned), root: mesh.root,
      rig: mesh.rig, hitMeshes: mesh.hitMeshes, leftArm: mesh.leftArm, rightArm: mesh.rightArm,
      legGroups: mesh.legGroups, strandMeshes: mesh.strandMeshes, headGroup: mesh.headGroup,
      weaponMesh: mesh.weapon, telegraph: mesh.telegraph, roleAccent: mesh.roleAccent,
      eyes: mesh.eyes, crown: mesh.crown, spellRing: mesh.spellRing,
      material: mesh.material, strands: mesh.strands, speed: data.speed, damage: data.damage,
      range: data.range, cadence: data.cadence, ranged: Boolean(data.ranged), attackTimer: 0.35 + enemies.length * 0.12,
      wobbleSeed: nextEnemyId * 1.731, steerSign: enemies.length % 2 === 0 ? 1 : -1,
      impulse: new THREE.Vector3(), summonTimer: 6.5,
      spawnPosition: mesh.root.position.clone(),
      role, baseRole: role, roleLocked: Boolean(config?.role || suppliedRole), state: "spawn", previousState: "seek", stateTimer: 0.45 + enemies.length * 0.08,
      rethinkTimer: 0.1 + enemies.length * 0.07, memoryTimer: 0, targetVisible: false,
      lastSeen: mesh.root.position.clone(),
      goal: mesh.root.position.clone(),
      flankSign: enemies.length % 2 === 0 ? 1 : -1, coverScore: 0,
      attackWindup: 0, staggerTimer: 0, flashTimer: 0, suppression: 0,
      attackWindupMax: 0, bossPhase: 1, announcedPhase: 1, volleyIndex: 0, blockedTime: 0,
      stateTransitions: 0, shotsFired: 0, coverId: null, coverIntent: false,
      spawnWave: Math.max(0, Math.round(finite(config?.spawnWave, waveIndex))),
      spawnSlot: Math.max(0, Math.round(finite(config?.spawnSlot, enemies.length))),
      groundY: spawnGroundY, footClearance, grounded: true, supportId: null,
      groundCorrections: 0, lastValidGroundedPosition: mesh.root.position.clone(),
      navRouteId: null, navDirection: 0, navIndex: 0, navWaypoint: null,
      recoveryGoal: mesh.root.position.clone(), recoveryTimer: 0,
      stuckTimer: 0, recoveryStage: 0, navigationRecoveries: 0, navigationRelocations: 0,
      actualSpeed: 0, totalTravel: 0, unseenTimer: 0,
      lastHostileTimer: 0, pursuitMode: false, lastHostileFailedProgress: 0,
      lastHostileRelocated: false, lastHostileRelocationAt: null, lastHostileFailedAtRelocation: null,
      inViewCone: false, relativeYaw: 0, relativePitch: 0, horizontalHalfFov: 0, verticalHalfFov: 0,
      projectedCoverage: 0, centralCoverage: 0,
      keepOutDistance: finite(KEEP_OUT_DISTANCE[type], PUNCH_RANGE), keepOutIntrusion: 0,
      keepOutIntrusionTime: 0, keepOutLongestIntrusion: 0, keepOutPeakIntrusion: 0,
      keepOutForced: false, keepOutForcedThisFrame: false, keepOutForcedFrames: 0, forcedSeparations: 0,
      progressAnchor: mesh.root.position.clone(), progressGoal: mesh.root.position.clone(),
      progressGoalDistance: 0, progressTimer: 0, progressNavRouteId: null, progressNavIndex: 0
    };
    enemies.push(enemy);
    if (enemy.boss) {
      call("message", "THE NOODLEMANCER HAS FINISHED BOILING");
      call("audio", "bossSpawn", { intensity: 1.25, pan: 0 });
      emitEvent("bossSpawn", {
        enemyId: enemy.id,
        enemyType: enemy.type,
        health: finite(enemy.health),
        maxHealth: finite(enemy.maxHealth),
        position: enemy.root.position
      });
    }
    return enemyState(enemy);
  } function defaultSpawnPosition(index = 0, type = "twirler") {
    camera.getWorldPosition(worldCamera);
    const arenaData = combatData();
    const authoredWaves = arenaData?.waveSpawns || arenaData?.waves;
    const waveList = Array.isArray(authoredWaves?.[Math.max(0, waveIndex - 1)])
      ? authoredWaves[Math.max(0, waveIndex - 1)]
      : null;
    const bossSource = arenaData?.bossSpawn || arenaData?.boss || arenaData?.bossSpawns;
    const regularSource = waveList || arenaData?.enemySpawns || arenaData?.spawns;
    const source = type === "noodlemancer" ? bossSource : regularSource;
    const entries = Array.isArray(source) ? source : source && typeof source === "object" ? [source] : [];
    if (entries.length && index < entries.length) {
      const entry = entries[index];
      const position = entry?.position || entry;
      if (Number.isFinite(Number(position?.x)) && Number.isFinite(Number(position?.z))) {
        const x = finite(position.x);
        const z = finite(position.z);
        return { x, y: surfaceY(x, z, finite(position.y, worldCamera.y - 1.6)), z };
      }
    }
    const angle = index * 2.399 + waveIndex * 0.73;
    const distance = 7.5 + index % 3 * 1.8;
    const x = worldCamera.x + Math.sin(angle) * distance;
    const z = worldCamera.z + Math.cos(angle) * distance;
    return { x, y: surfaceY(x, z, worldCamera.y - 1.6), z };
  } function findSpawnPosition(preferred, index = 0, scale = 1) {
    camera.getWorldPosition(worldCamera);
    const arenaData = combatData();
    const candidates = [preferred];
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const angle = index * 2.399 + waveIndex * 0.73 + attempt * 2.083;
      const distance = 7.2 + attempt % 4 * 1.35;
      candidates.push({
        x: worldCamera.x + Math.sin(angle) * distance,
        z: worldCamera.z + Math.cos(angle) * distance
      });
    }
    let firstOpen = null;
    const bounds = arenaData?.arenaBounds || null;
    const bodyMargin = 0.52 * scale;
    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
      const candidate = candidates[candidateIndex];
      const x = finite(candidate?.x, worldCamera.x);
      const z = finite(candidate?.z, worldCamera.z);
      if (bounds && (
        x < finite(bounds.minX, -Infinity) + bodyMargin ||
        x > finite(bounds.maxX, Infinity) - bodyMargin ||
        z < finite(bounds.minZ, -Infinity) + bodyMargin ||
        z > finite(bounds.maxZ, Infinity) - bodyMargin
      )) continue;
      const y = surfaceY(x, z, finite(candidate?.y, worldCamera.y - 1.6));
      const position = { x, y, z };
      if (positionIsBlocked(position, 0.34 * scale, 1.9 * scale)) continue;
      firstOpen ||= position;
      // Authored tactical slots are deliberate. If the slot is physically
      // valid, preserve it even when cover hides it from the player.
      if (candidateIndex === 0) return position;
      const target = { x, y: y + 1.05 * scale, z };
      if (!worldTrace(worldCamera, target).blocked) return position;
    }
    return firstOpen || { x: finite(preferred?.x), y: finite(preferred?.y), z: finite(preferred?.z) };
  } function surfaceY(x, z, fallback = 0) {
    try {
      return finite(sampleSurfaceY(x, z, fallback), fallback);
    } catch (error) {
      return fallback;
    }
  } function positionIsBlocked(position, radius, height) {
    try {
      return Boolean(positionBlockedCallback(position, radius, height));
    } catch (error) {
      errors.push(`positionBlocked: ${String(error?.message || error)}`.slice(0, 180));
      return false;
    }
  } function resolveWorldMovement(position, delta, radius, height) {
    try {
      const result = resolveMovementCallback(position, delta, radius, height) || {};
      return {
        x: finite(result.x, finite(position?.x) + finite(delta?.x)),
        y: finite(result.y, finite(position?.y)),
        z: finite(result.z, finite(position?.z) + finite(delta?.z)),
        blocked: Boolean(result.blocked),
        supportId: result.supportId == null ? null : String(result.supportId)
      };
    } catch (error) {
      errors.push(`resolveMovement: ${String(error?.message || error)}`.slice(0, 180));
      return { x: finite(position?.x), y: finite(position?.y), z: finite(position?.z), blocked: true };
    }
  } function worldTrace(from, to) {
    try {
      const result = traceWorldCallback(from, to) || {};
      const point = result.point || to;
      return {
        blocked: Boolean(result.blocked),
        fraction: clamp(finite(result.fraction, result.blocked ? 0 : 1), 0, 1),
        point: new THREE.Vector3(finite(point?.x, to?.x), finite(point?.y, to?.y), finite(point?.z, to?.z))
      };
    } catch (error) {
      errors.push(`traceWorld: ${String(error?.message || error)}`.slice(0, 180));
      return { blocked: false, fraction: 1, point: new THREE.Vector3(finite(to?.x), finite(to?.y), finite(to?.z)) };
    }
  } function viewConeForPosition(position = {}, scaleValue = 1) {
    const scale = clamp(finite(scaleValue, 1), 0.25, 3);
    const cameraFov = THREE.MathUtils.degToRad(clamp(finite(camera.fov, baseCameraFov), 20, 130));
    const cameraZoom = Math.max(0.01, finite(camera.zoom, baseCameraZoom));
    const verticalFov = 2 * Math.atan(Math.tan(cameraFov * 0.5) / cameraZoom);
    const aspect = clamp(finite(camera.aspect, 1), 0.25, 5);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov * 0.5) * aspect);
    const dx = finite(position?.x) - lastPlayer.x;
    const dz = finite(position?.z) - lastPlayer.z;
    const horizontalDistance = Math.max(0.001, Math.hypot(dx, dz));
    const eyeY = lastPlayer.y + lastPlayer.eyeHeight;
    const dy = finite(position?.y, eyeY) - eyeY;
    const bearing = Math.atan2(-dx, -dz);
    const relativeYaw = Math.atan2(Math.sin(bearing - lastPlayer.yaw), Math.cos(bearing - lastPlayer.yaw));
    const targetPitch = Math.atan2(dy, horizontalDistance);
    const relativePitch = targetPitch - lastPlayer.pitch;
    const horizontalRadius = Math.atan2(0.46 * scale, horizontalDistance);
    const verticalRadius = Math.atan2(0.92 * scale, Math.max(0.001, Math.hypot(horizontalDistance, dy)));
    const horizontalHalfFov = horizontalFov * 0.5;
    const verticalHalfFov = verticalFov * 0.5;
    const inHorizontalCone = Math.abs(relativeYaw) <= horizontalHalfFov + horizontalRadius;
    const inVerticalCone = Math.abs(relativePitch) <= verticalHalfFov + verticalRadius;
    const inViewCone = inHorizontalCone && inVerticalCone && Math.abs(relativeYaw) < Math.PI * 0.5 + horizontalRadius;
    const projectedWidth = clamp(horizontalRadius / Math.max(0.001, horizontalHalfFov), 0, 1);
    const projectedHeight = clamp(verticalRadius / Math.max(0.001, verticalHalfFov), 0, 1);
    const projectedCoverage = inViewCone ? projectedWidth * projectedHeight * 100 : 0;
    const centralWeightX = clamp(1 - Math.abs(relativeYaw) / Math.max(0.001, horizontalHalfFov * 0.62), 0, 1);
    const centralWeightY = clamp(1 - Math.abs(relativePitch) / Math.max(0.001, verticalHalfFov * 0.62), 0, 1);
    return {
      inViewCone,
      inHorizontalCone,
      inVerticalCone,
      relativeYaw: finite(relativeYaw),
      relativePitch: finite(relativePitch),
      horizontalHalfFov: finite(horizontalHalfFov),
      verticalHalfFov: finite(verticalHalfFov),
      horizontalFov: finite(horizontalFov),
      verticalFov: finite(verticalFov),
      aspect,
      zoom: cameraZoom,
      distance: horizontalDistance,
      projectedCoverage: finite(projectedCoverage),
      centralCoverage: finite(projectedCoverage * centralWeightX * centralWeightY)
    };
  } function updateEnemyViewCone(enemy) {
    const scale = TYPE_DATA[enemy.type].scale;
    const view = viewConeForPosition({
      x: enemy.root.position.x,
      y: enemy.root.position.y + 1.05 * scale,
      z: enemy.root.position.z
    }, scale);
    enemy.inViewCone = view.inViewCone;
    enemy.relativeYaw = view.relativeYaw;
    enemy.relativePitch = view.relativePitch;
    enemy.horizontalHalfFov = view.horizontalHalfFov;
    enemy.verticalHalfFov = view.verticalHalfFov;
    enemy.projectedCoverage = view.projectedCoverage;
    enemy.centralCoverage = view.centralCoverage;
    return view;
  } function adjustEnemyDeltaForKeepOut(enemy, target, rawDelta, dt) {
    const origin = enemy.root.position;
    const minimum = finite(enemy.keepOutDistance, KEEP_OUT_DISTANCE[enemy.type] || PUNCH_RANGE);
    const fromPlayerX = origin.x - target.x;
    const fromPlayerZ = origin.z - target.z;
    const distance = Math.hypot(fromPlayerX, fromPlayerZ);
    let outwardX;
    let outwardZ;
    if (distance > 0.001) {
      outwardX = fromPlayerX / distance;
      outwardZ = fromPlayerZ / distance;
    } else {
      outwardX = -Math.sin(enemy.root.rotation.y || enemy.wobbleSeed);
      outwardZ = -Math.cos(enemy.root.rotation.y || enemy.wobbleSeed);
    }
    let x = finite(rawDelta?.x);
    let z = finite(rawDelta?.z);
    let radial = x * outwardX + z * outwardZ;
    let forced = false;
    let recoveryStep = 0;
    if (radial < 0 && distance + radial < minimum) {
      const allowedInward = Math.max(0, distance - minimum);
      if (-radial > allowedInward) {
        const correction = -allowedInward - radial;
        x += outwardX * correction;
        z += outwardZ * correction;
        radial = -allowedInward;
        forced = true;
      }
    }
    if (distance < minimum) {
      if (radial < 0) {
        x -= outwardX * radial;
        z -= outwardZ * radial;
      }
      const intrusion = minimum - distance;
      const recoverySpeed = clamp(0.55 + intrusion * 0.72, 0.55, Math.max(0.9, Math.min(2.05, enemy.speed * 0.86)));
      recoveryStep = Math.min(intrusion, recoverySpeed * Math.max(0, dt));
      x += outwardX * recoveryStep;
      z += outwardZ * recoveryStep;
      forced = true;
    }
    return { x, z, forced, recoveryStep, outwardX, outwardZ, distance, minimum };
  } function resolveEnemyMovementWithKeepOut(enemy, target, rawDelta, radius, height, dt) {
    const origin = enemy.root.position;
    const gate = adjustEnemyDeltaForKeepOut(enemy, target, rawDelta, dt);
    const originDistance = gate.distance;
    const validCandidate = (candidate) => {
      if (![candidate?.x, candidate?.y, candidate?.z].every(Number.isFinite)) return false;
      if (positionIsBlocked(candidate, radius, height)) return false;
      const nextDistance = Math.hypot(candidate.x - target.x, candidate.z - target.z);
      if (originDistance >= gate.minimum - 0.001 && nextDistance < gate.minimum - 0.003) return false;
      if (originDistance < gate.minimum && nextDistance < originDistance - 0.001) return false;
      return true;
    };
    let movement = resolveWorldMovement(origin, { x: gate.x, z: gate.z }, radius, height);
    if (!validCandidate(movement)) {
      movement = { x: origin.x, y: origin.y, z: origin.z, blocked: true, supportId: enemy.supportId };
    }
    let bestDistance = Math.hypot(movement.x - target.x, movement.z - target.z);
    if (originDistance < gate.minimum && bestDistance <= originDistance + 0.001 && gate.recoveryStep > 0) {
      for (const angle of [-0.58, 0.58]) {
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const sideX = gate.outwardX * cosine - gate.outwardZ * sine;
        const sideZ = gate.outwardX * sine + gate.outwardZ * cosine;
        const candidate = resolveWorldMovement(origin, {
          x: sideX * gate.recoveryStep,
          z: sideZ * gate.recoveryStep
        }, radius, height);
        if (!validCandidate(candidate)) continue;
        const candidateDistance = Math.hypot(candidate.x - target.x, candidate.z - target.z);
        if (candidateDistance > bestDistance + 0.001) {
          movement = candidate;
          bestDistance = candidateDistance;
        }
      }
    }
    return { ...movement, keepOutForced: gate.forced };
  } function finalizeEnemySpatialTelemetry(enemy, dt) {
    updateEnemyViewCone(enemy);
    const distance = Math.hypot(enemy.root.position.x - lastPlayer.x, enemy.root.position.z - lastPlayer.z);
    const intrusion = Math.max(0, enemy.keepOutDistance - distance);
    enemy.keepOutIntrusion = intrusion;
    if (intrusion > 0.002) {
      enemy.keepOutIntrusionTime += dt;
      enemy.keepOutLongestIntrusion = Math.max(enemy.keepOutLongestIntrusion, enemy.keepOutIntrusionTime);
      enemy.keepOutPeakIntrusion = Math.max(enemy.keepOutPeakIntrusion, intrusion);
    } else {
      enemy.keepOutIntrusionTime = 0;
    }
    if (enemy.keepOutForcedThisFrame) {
      enemy.keepOutForcedFrames += 1;
      keepOutTelemetry.forcedSeparationFrames += 1;
      if (!enemy.keepOutForced) {
        enemy.forcedSeparations += 1;
        keepOutTelemetry.forcedSeparations += 1;
      }
    }
    enemy.keepOutForced = Boolean(enemy.keepOutForcedThisFrame);
  } function refreshKeepOutTelemetry() {
    const living = enemies.filter((enemy) => enemy.alive);
    keepOutTelemetry.nearestHostileDistance = living.length
      ? Math.min(...living.map((enemy) => Math.hypot(enemy.root.position.x - lastPlayer.x, enemy.root.position.z - lastPlayer.z)))
      : null;
    keepOutTelemetry.currentIntrusionDuration = living.reduce((maximum, enemy) => Math.max(maximum, enemy.keepOutIntrusionTime), 0);
    keepOutTelemetry.longestIntrusionDuration = Math.max(
      keepOutTelemetry.longestIntrusionDuration,
      ...living.map((enemy) => enemy.keepOutLongestIntrusion),
      0
    );
    keepOutTelemetry.currentPeakIntrusion = living.reduce((maximum, enemy) => Math.max(maximum, enemy.keepOutIntrusion), 0);
    keepOutTelemetry.peakIntrusion = Math.max(
      keepOutTelemetry.peakIntrusion,
      ...living.map((enemy) => enemy.keepOutPeakIntrusion),
      0
    );
    keepOutTelemetry.estimatedCentralHostileCoverage = living.reduce((maximum, enemy) => Math.max(maximum, enemy.centralCoverage), 0);
    keepOutTelemetry.peakEstimatedCentralHostileCoverage = Math.max(
      keepOutTelemetry.peakEstimatedCentralHostileCoverage,
      keepOutTelemetry.estimatedCentralHostileCoverage
    );
  } function update(dtValue, timeValue, context = {}) {
    const dt = clamp(finite(dtValue), 0, 0.05);
    const time = finite(timeValue, elapsed);
    const combatInputActive = context.phase !== "paused" && context.phase !== "defeated" && context.phase !== "victory";
    const wantsFire = Boolean(context.fireHeld && combatInputActive);
    const firePressed = Boolean(context.firePressed && combatInputActive);
    const wantsAim = Boolean(context.aimHeld && combatInputActive);
    if (!wantsFire) triggerReleaseRequired = false;
    if (!combatInputActive) fireBufferTimer = 0;
    else if (firePressed && !triggerReleaseRequired) fireBufferTimer = Math.max(fireBufferTimer, FIRE_BUFFER_DURATION);
    const previousPlayerX = lastPlayer.x;
    const previousPlayerY = lastPlayer.y;
    const previousPlayerZ = lastPlayer.z;
    if (context.player) {
      lastPlayer = {
        x: finite(context.player.x, lastPlayer.x),
        y: finite(context.player.y, lastPlayer.y),
        z: finite(context.player.z, lastPlayer.z),
        yaw: finite(context.player.yaw, lastPlayer.yaw),
        pitch: finite(context.player.pitch, lastPlayer.pitch),
        eyeHeight: finite(context.player.currentEyeHeight ?? context.player.eyeHeight, lastPlayer.eyeHeight)
      };
      lastPlayerSpeed = clamp(finite(context.player.speed), 0, 12);
    } else {
      camera.getWorldPosition(worldCamera);
      lastPlayer = {
        x: worldCamera.x,
        y: worldCamera.y - 1.6,
        z: worldCamera.z,
        yaw: finite(camera.rotation?.y),
        pitch: finite(camera.rotation?.x),
        eyeHeight: 1.6
      };
      lastPlayerSpeed = 0;
    }
    if (dt > 0) {
      const velocityBlend = 1 - Math.exp(-dt * 8);
      scratchA.set(
        clamp((lastPlayer.x - previousPlayerX) / dt, -12, 12),
        clamp((lastPlayer.y - previousPlayerY) / dt, -12, 12),
        clamp((lastPlayer.z - previousPlayerZ) / dt, -12, 12)
      );
      playerVelocity.lerp(scratchA, velocityBlend);
    }
    if (dt <= 0 || defeated || victory) {
      aiming = Boolean(wantsAim && !weapon.reloading && punchTimer <= 0 && !defeated && !victory);
      firing = Boolean(wantsFire && !triggerReleaseRequired && !weapon.reloading && punchTimer <= 0 && !defeated && !victory);
      weapon.firing = firing;
      refreshPunchTarget();
      animateViewModel(0, time, context);
      return context.frameView ? getFrameState() : getState();
    }
    elapsed += dt;
    fireCooldown = Math.max(0, fireCooldown - dt);
    fireBufferTimer = Math.max(0, fireBufferTimer - dt);
    if (autoReloadTimer > 0) {
      autoReloadTimer = Math.max(0, autoReloadTimer - dt);
      if (autoReloadTimer <= 0 && weapon.ammo <= 0 && weapon.reserve > 0 && !weapon.reloading) {
        if (beginReload("auto")) weaponTelemetry.autoReloads += 1;
      }
    }
    bombCooldown = Math.max(0, bombCooldown - dt);
    combatGrace = Math.max(0, combatGrace - dt);
    enemyDamageCooldown = Math.max(0, enemyDamageCooldown - dt);
    enemyProjectileDamageCooldown = Math.max(0, enemyProjectileDamageCooldown - dt);
    squadThinkTimer = Math.max(0, squadThinkTimer - dt);
    muzzleTimer = Math.max(0, muzzleTimer - dt);
    recoil = Math.max(0, recoil - dt * 10.5);
    punchCooldown = Math.max(0, punchCooldown - dt);
    punchHitStop = Math.max(0, punchHitStop - dt);
    if (context.reloadRequested) beginReload("input");
    if (context.sauceRequested) throwSauceBomb();
    if (context.punchRequested) punch();
    updatePunch(dt);
    updateReload(dt);
    aiming = Boolean(wantsAim && !weapon.reloading && punchTimer <= 0);
    firing = Boolean(wantsFire && !triggerReleaseRequired && !weapon.reloading && punchTimer <= 0);
    weapon.firing = firing;
    const bufferedShot = fireBufferTimer > 0 && !triggerReleaseRequired;
    if ((firing || bufferedShot) && !weapon.reloading) {
      let guard = 0;
      while (fireCooldown <= 0 && guard++ < 2) {
        const fromBuffer = !wantsFire && fireBufferTimer > 0;
        const fired = shoot();
        if (fired || fromBuffer) {
          if (fromBuffer && fired) weaponTelemetry.bufferedShots += 1;
          fireBufferTimer = 0;
        }
        if (!wantsFire || !fired) break;
      }
      if (triggerReleaseRequired) {
        firing = false;
        weapon.firing = false;
      }
    }
    const simulationDt = punchHitStop > 0 ? 0 : dt;
    updateOpeningLesson(simulationDt);
    updateWaves(simulationDt);
    updateEnemies(simulationDt, time);
    updateProjectiles(simulationDt);
    updateBombs(simulationDt);
    updateNoodlePieces(simulationDt);
    updateEffects(dt);
    refreshPunchTarget();
    animateViewModel(dt, time, context);
    return context.frameView ? getFrameState() : getState();
  } function animateViewModel(dt, time, context) {
    const speed = clamp(finite(context?.player?.speed, lastPlayerSpeed), 0, 12);
    if (dt <= 0 && !aiming) aimProgress = 0;
    else {
      const aimResponse = 1 - Math.exp(-(aiming ? 20 : 24) * Math.max(0, dt));
      aimProgress = THREE.MathUtils.lerp(aimProgress, aiming ? 1 : 0, aimResponse);
      if (Math.abs(aimProgress - (aiming ? 1 : 0)) < 0.0005) aimProgress = aiming ? 1 : 0;
    }
    const adsBlend = THREE.MathUtils.smoothstep(aimProgress, 0, 1);
    const punchActive = punchTimer > 0;
    const punchProgress = punchActive ? clamp(1 - punchTimer / PUNCH_DURATION, 0, 1) : 0;
    const punchWindup = punchActive && punchProgress < 0.2
      ? THREE.MathUtils.smoothstep(punchProgress / 0.2, 0, 1)
      : 0;
    const punchStrike = !punchActive
      ? 0
      : punchProgress < 0.2
        ? 0
        : punchProgress < 0.43
          ? THREE.MathUtils.smoothstep((punchProgress - 0.2) / 0.23, 0, 1)
          : 1 - THREE.MathUtils.smoothstep((punchProgress - 0.43) / 0.57, 0, 1);
    const punchPose = Math.max(punchWindup * 0.38, punchStrike);
    const bobScale = THREE.MathUtils.lerp(1, 0.22, adsBlend);
    const bob = Math.sin(time * (7 + speed * 0.25)) * Math.min(0.014, speed * 0.0015) * bobScale;
    viewModel.root.position.x = THREE.MathUtils.lerp(HIP_POSITION.x, ADS_POSITION.x, adsBlend);
    viewModel.root.position.y = THREE.MathUtils.lerp(HIP_POSITION.y, ADS_POSITION.y, adsBlend) + bob - recoil * THREE.MathUtils.lerp(0.03, 0.014, adsBlend);
    viewModel.root.position.z = THREE.MathUtils.lerp(HIP_POSITION.z, ADS_POSITION.z, adsBlend) + recoil * THREE.MathUtils.lerp(0.075, 0.038, adsBlend);
    viewModel.root.scale.setScalar(THREE.MathUtils.lerp(1, 0.8, adsBlend));
    viewModel.root.rotation.x = recoil * THREE.MathUtils.lerp(0.06, 0.026, adsBlend);
    viewModel.root.rotation.z = bob * THREE.MathUtils.lerp(0.7, 0.18, adsBlend);
    viewModel.gun.position.set(-0.2 * punchPose, -0.14 * punchPose, 0.13 * punchPose);
    viewModel.gun.rotation.y = 0.48 * punchPose;
    const leftArm = viewModel.arms[0];
    const punchingArm = viewModel.arms[1];
    leftArm?.position.set(0.035 * punchPose, -0.025 * punchPose, 0.04 * punchPose);
    leftArm?.rotation.set(0, 0, -0.08 * punchPose);
    leftArm?.scale.setScalar(1);
    punchingArm?.position.set(-0.16 * punchStrike + 0.08 * punchWindup, 0.09 * punchStrike - 0.035 * punchWindup, -0.72 * punchStrike + 0.09 * punchWindup);
    punchingArm?.rotation.set(-0.18 * punchStrike, -0.3 * punchStrike, -0.32 * punchWindup + 0.12 * punchStrike);
    punchingArm?.scale.setScalar(1 + punchStrike * 0.13);

    // Movement owns camera.fov for sprint/depth effects. PerspectiveCamera.zoom changes
    // the true effective FOV without fighting that system, and remains smooth at render time.
    const targetZoom = THREE.MathUtils.lerp(baseCameraZoom, adsCameraZoom, adsBlend);
    if (Math.abs(finite(camera.zoom, baseCameraZoom) - targetZoom) > 0.0001) {
      camera.zoom = targetZoom;
      camera.updateProjectionMatrix?.();
    }
    viewModel.muzzle.visible = muzzleTimer > 0;
    if (viewModel.muzzle.material) viewModel.muzzle.material.opacity = clamp(muzzleTimer * 28, 0, 0.9);
  } function punch() {
    if (punchCooldown > 0 || punchTimer > 0 || defeated || victory) return false;
    punchCooldown = PUNCH_COOLDOWN;
    punchTimer = PUNCH_DURATION;
    punchImpactPending = true;
    punchTelemetry.lastResult = "swing";
    firing = false;
    aiming = false;
    weapon.firing = false;
    fireBufferTimer = 0;
    call("audio", "punchSwing", { intensity: 1.08, pan: 0.12 });
    return { performed: true, hit: false, cooldown: PUNCH_COOLDOWN, range: PUNCH_RANGE };
  } function updatePunch(dt) {
    if (punchTimer <= 0) return;
    punchTimer = Math.max(0, punchTimer - dt);
    const progress = PUNCH_DURATION - punchTimer;
    if (punchImpactPending && progress >= PUNCH_IMPACT_DELAY) resolvePunchImpact();
    if (punchTimer <= 0) punchImpactPending = false;
  } function findPunchTarget() {
    const forwardX = -Math.sin(lastPlayer.yaw);
    const forwardZ = -Math.cos(lastPlayer.yaw);
    const origin = new THREE.Vector3(lastPlayer.x, lastPlayer.y + Math.min(lastPlayer.eyeHeight, 1.18), lastPlayer.z);
    let best = null;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const scale = TYPE_DATA[enemy.type]?.scale || 1;
      const dx = enemy.root.position.x - lastPlayer.x;
      const dz = enemy.root.position.z - lastPlayer.z;
      const distance = Math.hypot(dx, dz);
      const effectiveRange = PUNCH_RANGE + Math.max(0, scale - 1) * 0.34;
      if (distance > effectiveRange || distance < 0.001) continue;
      const targetY = enemy.root.position.y + 0.9 * scale;
      if (Math.abs(targetY - origin.y) > 1.72 + Math.max(0, scale - 1) * 0.4) continue;
      const dot = (dx * forwardX + dz * forwardZ) / distance;
      if (dot < PUNCH_CONE_DOT) continue;
      const score = dot * 2.2 - distance * 0.28;
      if (best && score <= best.score) continue;
      const target = new THREE.Vector3(enemy.root.position.x, targetY, enemy.root.position.z);
      if (worldTrace(origin, target).blocked) continue;
      best = { enemy, distance, dot, score, target, forwardX, forwardZ };
    }
    return best;
  } function refreshPunchTarget() {
    const target = findPunchTarget();
    punchTargetId = target?.enemy?.id ?? null;
    punchTargetDistance = target ? target.distance : null;
    return target;
  } function resolvePunchImpact() {
    if (!punchImpactPending) return false;
    punchImpactPending = false;
    stats.punchAttempts += 1;
    punchTelemetry.lastImpactAt = elapsed;
    const target = refreshPunchTarget();
    if (!target) {
      stats.punchMisses += 1;
      punchTelemetry.lastResult = "miss";
      punchTelemetry.lastTargetId = null;
      punchTelemetry.lastDistance = null;
      punchTelemetry.lastExplosionPieces = 0;
      punchTelemetry.lastExplosionEnergy = 0;
      call("audio", "punchMiss", { intensity: 0.88, pan: 0.14 });
      call("punch", { performed: true, hit: false, killed: false, range: PUNCH_RANGE });
      return false;
    }
    const enemy = target.enemy;
    const targetId = enemy.id;
    const targetName = enemy.name;
    const wasAlive = enemy.alive;
    const piecesBefore = noodlePieces.length;
    const energyBefore = noodlePieces.reduce((sum, piece) => sum + piece.velocity.lengthSq() * 0.5, 0);
    stats.punchHits += 1;
    punchTelemetry.lastTargetId = targetId;
    punchTelemetry.lastDistance = target.distance;
    const hitPosition = target.target.clone();
    const punchDamage = enemy.boss || enemy.type === "colossus" ? PUNCH_DAMAGE : enemy.health + 1;
    damageEnemy(enemy, punchDamage, "punch", {
      position: hitPosition,
      origin: { x: lastPlayer.x, y: lastPlayer.y + lastPlayer.eyeHeight, z: lastPlayer.z },
      direction: { x: target.forwardX, y: 0, z: target.forwardZ }
    });
    const killed = wasAlive && !enemy.alive;
    const piecesAdded = Math.max(0, noodlePieces.length - piecesBefore);
    const energyAfter = noodlePieces.reduce((sum, piece) => sum + piece.velocity.lengthSq() * 0.5, 0);
    punchTelemetry.lastResult = killed ? "exploded" : "hit";
    punchTelemetry.lastExplosionPieces = killed ? piecesAdded : 0;
    punchTelemetry.lastExplosionEnergy = killed ? Math.max(0, energyAfter - energyBefore) : 0;
    if (killed) {
      stats.punchKills += 1;
      stats.punchExplosions += 1;
    }
    punchHitStop = killed ? 0.058 : 0.036;
    spawnPunchBurst(hitPosition, killed);
    call("audio", "punchHit", { intensity: killed ? 1.45 : 1.05, pan: clamp(target.dot * 0.08, -0.15, 0.15) });
    call("splat", {
      x: 0.5 + clamp((hitPosition.x - lastPlayer.x) / Math.max(0.01, PUNCH_RANGE), -1, 1) * 0.1,
      y: 0.48,
      intensity: killed ? 0.76 : 0.42,
      wetness: 1,
      sauce: killed ? 0.86 : 0.48,
      directionX: target.forwardX * 0.22,
      directionY: 0.72
    });
    call("punch", {
      performed: true, hit: true, killed, targetId, targetName,
      distance: target.distance, pieces: piecesAdded, energy: punchTelemetry.lastExplosionEnergy
    });
    return true;
  } function spawnPunchBurst(position, killed) {
    const material = new THREE.MeshBasicMaterial({
      color: killed ? 0xff8b32 : 0xffd47b,
      transparent: true,
      opacity: killed ? 0.9 : 0.64,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const burst = new THREE.Mesh(new THREE.SphereGeometry(0.34, quality === "low" ? 9 : 16, quality === "low" ? 6 : 10), material);
    burst.position.copy(position);
    burst.scale.setScalar(0.18);
    scene.add(burst);
    effects.push({ object: burst, life: killed ? 0.3 : 0.2, maxLife: killed ? 0.3 : 0.2, kind: "punchBurst" });
  } function shoot() {
    if (weapon.reloading || punchTimer > 0 || defeated || victory) return false;
    if (fireCooldown > 0) return false;
    if (weapon.ammo <= 0) {
      if (autoReloadTimer > 0) return false;
      call("audio", "dryFire", { intensity: 0.75, pan: 0 });
      beginReload("empty");
      fireCooldown = 0.18;
      return false;
    }
    weapon.ammo -= 1;
    stats.shots += 1;
    stats.shotsFired = stats.shots;
    if (weaponTelemetry.lastShotAt >= 0) {
      weaponTelemetry.recentShotIntervalsMs.push((elapsed - weaponTelemetry.lastShotAt) * 1000);
      if (weaponTelemetry.recentShotIntervalsMs.length > 16) weaponTelemetry.recentShotIntervalsMs.shift();
    }
    weaponTelemetry.lastShotAt = elapsed;
    fireCooldown += 1 / weapon.fireRate;
    muzzleTimer = 0.045;
    recoil = Math.min(1, recoil + 0.48);
    call("audio", "fire", {
      intensity: 0.92,
      pan: 0.08,
      ammo: weapon.ammo,
      magazineSize: weapon.magazineSize
    });
    if (weapon.ammo > 0 && weapon.ammo <= LOW_AMMO_THRESHOLD) {
      const urgency = 1 - weapon.ammo / LOW_AMMO_THRESHOLD;
      call("audio", "ammoTail", { intensity: 0.52 + urgency * 0.48, pan: 0.08, ammo: weapon.ammo });
      weaponTelemetry.lowAmmoCueCount += 1;
      weaponTelemetry.lastLowAmmoRound = weapon.ammo;
      if (weapon.ammo <= CRITICAL_AMMO_THRESHOLD) weaponTelemetry.criticalAmmoCueCount += 1;
      if (weapon.ammo === LOW_AMMO_THRESHOLD) call("audio", "ammoLow", { intensity: 0.82, pan: 0.08, ammo: weapon.ammo });
      if (weapon.ammo === CRITICAL_AMMO_THRESHOLD) call("audio", "ammoCritical", { intensity: 1, pan: 0.08, ammo: weapon.ammo });
    } else if (weapon.ammo === 0) {
      call("audio", "magEmpty", { intensity: 1.08, pan: 0.08, ammo: 0 });
      weaponTelemetry.emptyCueCount += 1;
      weaponTelemetry.lastLowAmmoRound = 0;
      if (weapon.reserve > 0) autoReloadTimer = AUTO_RELOAD_DELAY;
    }
    const spread = currentWeaponSpread();
    const spreadAngle = shotNoise(stats.shots, 0.73) * Math.PI * 2;
    const spreadRadius = Math.sqrt(shotNoise(stats.shots, 4.19)) * spread;
    aimEuler.set(lastPlayer.pitch, lastPlayer.yaw, 0, "YXZ");
    shotDirection.set(0, 0, -1).applyEuler(aimEuler).normalize();
    scratchB.set(1, 0, 0).applyEuler(aimEuler);
    scratchC.set(0, 1, 0).applyEuler(aimEuler);
    shotDirection
      .addScaledVector(scratchB, Math.cos(spreadAngle) * spreadRadius)
      .addScaledVector(scratchC, Math.sin(spreadAngle) * spreadRadius)
      .normalize();
    shotOrigin.set(lastPlayer.x, lastPlayer.y + lastPlayer.eyeHeight, lastPlayer.z);
    raycaster.set(shotOrigin, shotDirection);
    raycaster.far = 70;
    for (const enemy of enemies) {
      if (enemy.alive) enemy.root.updateWorldMatrix?.(true, true);
    }
    const targets = enemies.flatMap((enemy) => enemy.alive ? enemy.hitMeshes : []);
    const hit = raycaster.intersectObjects(targets, false)[0] || null;
    const origin = raycaster.ray.origin.clone();
    const intendedEnd = hit ? hit.point.clone() : raycaster.ray.at(55, new THREE.Vector3());
    const obstruction = worldTrace(origin, intendedEnd);
    const end = obstruction.blocked ? obstruction.point : intendedEnd;
    spawnTracer(origin, end, Boolean(hit && !obstruction.blocked));
    const hitEnemy = hit && !obstruction.blocked
      ? enemies.find((entry) => entry.id === hit.object.userData.enemyId && entry.alive) || null
      : null;
    emitEvent("shot", {
      origin,
      direction: shotDirection,
      position: end,
      blocked: Boolean(obstruction.blocked),
      hit: Boolean(hitEnemy),
      targetId: hitEnemy?.id || null,
      targetType: hitEnemy?.type || null,
      ammo: weapon.ammo
    });
    if (obstruction.blocked) {
      stats.coverBlocks += 1;
      return true;
    }
    if (!hit) return true;
    const enemy = hitEnemy;
    if (!enemy) return true;
    const headshot = hit.object.userData.hitPart === "head";
    const normal = hit.face?.normal?.clone?.();
    normal?.transformDirection?.(hit.object.matrixWorld);
    damageEnemy(enemy, headshot ? 36 : 18, headshot ? "headshot" : "bullet", {
      position: hit.point,
      normal,
      origin,
      direction: shotDirection
    });
    stats.hits += 1;
    stats.hitsLanded = stats.hits;
    if (headshot) stats.headshots += 1;
    call("audio", "enemyHit", { intensity: headshot ? 1.2 : 0.8, pan: 0 });
    return true;
  } function shotNoise(index, salt) {
    const value = Math.sin((finite(index) + 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return value - Math.floor(value);
  } function currentWeaponSpread() {
    const adsBlend = THREE.MathUtils.smoothstep(aimProgress, 0, 1);
    const movement = clamp(lastPlayerSpeed / 8, 0, 1);
    const baseSpread = THREE.MathUtils.lerp(0.0054, 0.00055, adsBlend);
    const movementSpread = movement * THREE.MathUtils.lerp(0.0018, 0.00042, adsBlend);
    const recoilSpread = recoil * THREE.MathUtils.lerp(0.0034, 0.00115, adsBlend);
    return finite(baseSpread + movementSpread + recoilSpread, 0.0054);
  } function spawnTracer(origin, end, hit) {
    const geometry = new THREE.BufferGeometry().setFromPoints([origin, end]);
    const material = new THREE.LineBasicMaterial({ color: hit ? 0xffe7a0 : 0xf4be42, transparent: true, opacity: 0.82 });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    effects.push({ object: line, life: 0.055, maxLife: 0.055, kind: "tracer" });
  } function beginReload(reason = "manual") {
    const handroll = weapon.ammo <= 0 && weapon.reserve <= 0;
    if (weapon.reloading || weapon.ammo >= weapon.magazineSize || defeated || victory) return false;
    if (!handroll && weapon.reserve <= 0) return false;
    weapon.reloading = true;
    weapon.firing = false;
    firing = false;
    // Normal magazines follow familiar FPS behavior: holding fire resumes once
    // the reload finishes. Only the emergency hand-roll requires a fresh
    // squeeze, because it is deliberately triggered from an absolute 0/0 dry fire.
    triggerReleaseRequired = handroll;
    fireBufferTimer = 0;
    autoReloadTimer = 0;
    reloadStage = 0;
    weapon.reloadMode = handroll ? "handroll" : "magazine";
    weapon.activeReloadDuration = handroll ? EMERGENCY_RELOAD_DURATION : weapon.reloadDuration;
    reloadTimer = weapon.activeReloadDuration;
    weapon.reloadProgress = 0;
    aiming = false;
    call("audio", "reloadStart", { intensity: handroll || reason === "empty" ? 1 : 0.78, pan: 0 });
    if (handroll) call("message", "HAND-ROLLING 15 FRESH ROUNDS // RELEASE FIRE");
    return true;
  } function updateReload(dt) {
    if (!weapon.reloading) return;
    reloadTimer = Math.max(0, reloadTimer - dt);
    weapon.reloadProgress = clamp(1 - reloadTimer / Math.max(0.01, weapon.activeReloadDuration), 0, 1);
    viewModel.gun.rotation.z = Math.sin(weapon.reloadProgress * Math.PI) * 0.8;
    if (weapon.reloadProgress >= 0.26 && reloadStage < 1) {
      reloadStage = 1;
      weaponTelemetry.reloadStageEvents += 1;
      call("audio", "reloadEject", { intensity: weapon.reloadMode === "handroll" ? 0.72 : 0.9, pan: -0.08 });
    }
    if (weapon.reloadProgress >= 0.64 && reloadStage < 2) {
      reloadStage = 2;
      weaponTelemetry.reloadStageEvents += 1;
      call("audio", "reloadInsert", { intensity: weapon.reloadMode === "handroll" ? 0.86 : 1, pan: 0.08 });
    }
    if (reloadTimer > 0) return;
    if (weapon.reloadMode === "handroll") {
      weapon.ammo = Math.max(weapon.ammo, Math.min(weapon.magazineSize, EMERGENCY_MAG_SIZE));
      stats.handRolls += 1;
      call("message", "15 FRESH ROUNDS // SQUEEZE AGAIN");
    } else {
      const needed = weapon.magazineSize - weapon.ammo;
      const moved = Math.min(needed, weapon.reserve);
      weapon.ammo += moved;
      weapon.reserve -= moved;
    }
    weapon.reloading = false;
    weapon.reloadProgress = 0;
    weapon.reloadMode = "idle";
    weapon.activeReloadDuration = 0;
    reloadStage = 3;
    viewModel.gun.rotation.z = 0;
    stats.reloads += 1;
    call("audio", "reloadEnd", { intensity: 0.9, pan: 0 });
  } function resetOpeningLesson() {
    pendingWaveSpawns.length = 0;
    opening = freshOpeningState();
  } function cancelOpeningLesson(reason = "cancelled") {
    pendingWaveSpawns.length = 0;
    opening.active = false;
    opening.protected = false;
    opening.status = String(reason || "cancelled");
    opening.completionReason ||= String(reason || "cancelled");
    opening.completedAt ??= elapsed;
    opening.floodScale = 1;
  } function beginOpeningLesson(list) {
    resetOpeningLesson();
    const arenaData = combatData();
    const lessonSource = arenaData?.openingLessonSpawn || { x: 0, y: 0, z: 13.2 };
    const lessonPosition = lessonSource?.position || lessonSource;
    const lesson = spawnEnemy({
      type: list[0] || "twirler",
      position: lessonPosition,
      autoSpawn: true,
      spawnWave: 1,
      spawnSlot: 0
    });
    opening.protected = true;
    opening.status = "lesson";
    opening.startedAt = elapsed;
    opening.deadlineAt = elapsed < 1
      ? OPENING_LESSON_TIMEOUT
      : elapsed + OPENING_LESSON_TIMEOUT;
    opening.firstEnemyId = lesson?.id || null;

    const authoredSpawns = arenaData?.waveSpawns?.[0] || arenaData?.waves?.[0] || [];
    for (let index = 0; index < OPENING_RELEASE_DELAYS.length; index += 1) {
      const type = list[index + 1] || "twirler";
      const source = authoredSpawns[index] || defaultSpawnPosition(index, type);
      pendingWaveSpawns.push({
        type,
        position: { x: finite(source?.x), y: finite(source?.y), z: finite(source?.z) },
        spawnSlot: index + 1,
        delay: OPENING_RELEASE_DELAYS[index],
        releaseAt: null
      });
    }
    return lesson;
  } function completeOpeningLesson(reason = "completed") {
    if (!opening.active || !opening.protected) return false;
    opening.protected = false;
    opening.status = "releasing";
    opening.completionReason = String(reason || "completed");
    opening.completedAt = elapsed;
    if (opening.completionReason === "first-kill") opening.firstKillAt = elapsed;
    opening.floodScale = 0;
    for (const pending of pendingWaveSpawns) pending.releaseAt = elapsed + pending.delay;
    call("message", opening.completionReason === "timeout"
      ? "THE REST OF THE POT BOILS OVER"
      : "FIRST SERVING DRAINED // THE KITCHEN ANSWERS");
    return true;
  } function updateOpeningLesson(dt) {
    if (!opening.active || dt <= 0) return;
    if (opening.protected && opening.deadlineAt != null && elapsed >= opening.deadlineAt) {
      completeOpeningLesson("timeout");
    }
    if (opening.protected || opening.completedAt == null) return;

    opening.floodScale = clamp((elapsed - opening.completedAt) / OPENING_FLOOD_RAMP, 0, 1);
    while (pendingWaveSpawns.length && pendingWaveSpawns[0].releaseAt <= elapsed) {
      const pending = pendingWaveSpawns.shift();
      spawnEnemy({
        type: pending.type,
        position: pending.position,
        autoSpawn: true,
        spawnWave: 1,
        spawnSlot: pending.spawnSlot
      });
      opening.releasedCount += 1;
      opening.firstReinforcementAt ??= elapsed;
      opening.lastReinforcementAt = elapsed;
    }
    if (!pendingWaveSpawns.length && opening.floodScale >= 1) {
      opening.active = false;
      opening.status = "complete";
    }
  } function updateWaves(dt) {
    if (wavesSuppressed || victory || defeated || opening.protected || pendingWaveSpawns.length ||
      (waveIndex > 0 && opening.active) || enemies.some((enemy) => enemy.alive)) return;
    waveTimer -= dt;
    if (waveTimer > 0) return;
    if (waveIndex >= WAVE_DATA.length) {
      win();
      return;
    }
    startWave(waveIndex + 1);
  } function startWave(index) {
    waveIndex = clamp(Math.round(finite(index, 1)), 1, WAVE_DATA.length);
    waveTimer = 1.6;
    combatGrace = Math.max(combatGrace, waveIndex === 1 ? 4.25 : 1.65);
    wavesSuppressed = false;
    const list = WAVE_DATA[waveIndex - 1];
    if (waveIndex === 1) beginOpeningLesson(list);
    else {
      pendingWaveSpawns.length = 0;
      opening.protected = false;
      opening.floodScale = 1;
      list.forEach((type, i) => spawnEnemy({
        type,
        position: defaultSpawnPosition(i, type),
        autoSpawn: true,
        spawnWave: waveIndex,
        spawnSlot: i
      }));
    }
    call("message", waveIndex === WAVE_DATA.length ? "FINAL WAVE // CUT THE MASTER STRAND" : `WAVE ${waveIndex} // THE WATER IS BOILING`);
    call("audio", "waveStart", { intensity: 0.8 + waveIndex * 0.12, pan: 0 });
    emitEvent("waveStart", {
      index: waveIndex,
      total: WAVE_DATA.length,
      composition: [...list],
      final: waveIndex === WAVE_DATA.length
    });
    return true;
  } function setEnemyState(enemy, state, duration = 0.8) {
    if (enemy.state !== state) {
      enemy.previousState = enemy.state === "telegraph" ? enemy.previousState : enemy.state;
      enemy.stateTransitions += 1;
      stats.tacticalTransitions += 1;
      if (state === "flank") stats.flanks += 1;
    }
    enemy.state = state;
    enemy.stateTimer = Math.max(0.05, finite(duration, 0.8));
  } function pursuitClosingDistance(enemy) {
    return enemy.ranged ? Math.max(8, enemy.range * 0.72) : 2.8;
  } function mustPursue(enemy, distance) {
    return Boolean(enemy.pursuitMode && distance > pursuitClosingDistance(enemy));
  } function coordinateSquad() {
    if (squadThinkTimer > 0) return;
    squadThinkTimer = 0.68;
    let rangedOrdinal = 0;
    let meleeOrdinal = 0;
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.boss) continue;
      const healthRatio = enemy.health / Math.max(1, enemy.maxHealth);
      if (healthRatio < 0.24 && enemy.type !== "colossus") {
        enemy.role = "retreat";
      } else if (enemy.roleLocked) {
        enemy.role = enemy.baseRole;
      } else if (enemy.type === "saucier") {
        enemy.role = rangedOrdinal++ % 2 === 0 ? "suppress" : "flank";
      } else if (enemy.type === "twirler") {
        enemy.role = meleeOrdinal++ % 3 === 2 ? "flank" : "rush";
      } else {
        enemy.role = healthRatio < 0.42 ? "hold" : (meleeOrdinal++ % 2 ? "flank" : "hold");
      }
    }
  } function updatePerception(enemy, target, distance, dt) {
    const data = TYPE_DATA[enemy.type];
    scratchA.set(enemy.root.position.x, enemy.root.position.y + 1.22 * data.scale, enemy.root.position.z);
    const canSee = distance <= data.sight && !worldTrace(scratchA, target).blocked;
    if (canSee) {
      enemy.lastSeen.copy(target);
      enemy.memoryTimer = enemy.boss ? 9 : 5.8;
      if (!enemy.targetVisible) enemy.rethinkTimer = 0;
    } else {
      enemy.memoryTimer = Math.max(0, enemy.memoryTimer - dt);
      if (enemy.targetVisible) enemy.rethinkTimer = Math.min(enemy.rethinkTimer, 0.18);
    }
    enemy.targetVisible = canSee;
    return canSee;
  } function findCoverGoal(enemy, target, preferDistance = 5) {
    const s = TYPE_DATA[enemy.type].scale;
    let bestScore = -Infinity;
    let bestX = enemy.root.position.x;
    let bestY = enemy.root.position.y;
    let bestZ = enemy.root.position.z;
    let bestId = null;
    const awayX = enemy.root.position.x - target.x;
    const awayZ = enemy.root.position.z - target.z;
    const awayLength = Math.max(0.001, Math.hypot(awayX, awayZ));
    const baseAngle = Math.atan2(awayZ / awayLength, awayX / awayLength);
    const arenaData = combatData();
    const providedNodes = arenaData?.coverNodes || arenaData?.cover || arenaData?.tacticalCover || [];
    if (Array.isArray(providedNodes)) {
      providedNodes.forEach((node, index) => {
        const position = node?.position || node;
        if (!Number.isFinite(Number(position?.x)) || !Number.isFinite(Number(position?.z))) return;
        const x = finite(position.x);
        const z = finite(position.z);
        const y = surfaceY(x, z, finite(position.y, enemy.root.position.y));
        if (positionIsBlocked({ x, y, z }, 0.34 * s, 1.8 * s)) return;
        scratchA.set(x, y + finite(node?.eyeHeight, 1.14 * s), z);
        if (!worldTrace(scratchA, target).blocked) return;
        const playerDistance = Math.hypot(x - target.x, z - target.z);
        const travel = Math.hypot(x - enemy.root.position.x, z - enemy.root.position.z);
        const roleBonus = node?.role === enemy.role || node?.roles?.includes?.(enemy.role) ? 1.1 : 0;
        const score = playerDistance * 0.62 - Math.abs(playerDistance - preferDistance) * 0.28 - travel * 0.38 + roleBonus;
        if (score <= bestScore) return;
        bestScore = score;
        bestX = x;
        bestY = y;
        bestZ = z;
        bestId = String(node?.id ?? `cover-${index}`);
      });
    }
    for (let i = 0; i < 14; i += 1) {
      const radius = 2.4 + i % 4 * 1.05;
      const angle = baseAngle + (i - 6.5) * 0.43;
      const x = enemy.root.position.x + Math.cos(angle) * radius;
      const z = enemy.root.position.z + Math.sin(angle) * radius;
      const y = surfaceY(x, z, enemy.root.position.y);
      if (positionIsBlocked({ x, y, z }, 0.34 * s, 1.8 * s)) continue;
      scratchA.set(x, y + 1.14 * s, z);
      const hidden = worldTrace(scratchA, target).blocked;
      if (!hidden) continue;
      const playerDistance = Math.hypot(x - target.x, z - target.z);
      const travel = Math.hypot(x - enemy.root.position.x, z - enemy.root.position.z);
      const score = playerDistance * 0.65 - Math.abs(playerDistance - preferDistance) * 0.3 - travel * 0.42 + (i % 2) * 0.08;
      if (score <= bestScore) continue;
      bestScore = score;
      bestX = x;
      bestY = y;
      bestZ = z;
      bestId = `sample-${i}`;
    }
    if (bestScore === -Infinity) {
      bestX = enemy.root.position.x + awayX / awayLength * preferDistance;
      bestZ = enemy.root.position.z + awayZ / awayLength * preferDistance;
      bestY = surfaceY(bestX, bestZ, enemy.root.position.y);
      enemy.coverScore = 0;
      enemy.coverIntent = false;
      enemy.coverId = null;
    } else {
      enemy.coverScore = bestScore;
      enemy.coverIntent = true;
      if (enemy.coverId !== bestId) stats.coverUses += 1;
      enemy.coverId = bestId;
    }
    enemy.goal.set(bestX, bestY, bestZ);
    constrainGoal(enemy.goal);
    return bestScore > -Infinity;
  } function constrainGoal(goal) {
    const arenaData = combatData();
    const bounds = arenaData?.arenaBounds || arenaData?.bounds || null;
    if (!bounds) return goal;
    const minX = finite(bounds.minX ?? bounds.min?.x, -Infinity);
    const maxX = finite(bounds.maxX ?? bounds.max?.x, Infinity);
    const minZ = finite(bounds.minZ ?? bounds.min?.z, -Infinity);
    const maxZ = finite(bounds.maxZ ?? bounds.max?.z, Infinity);
    goal.x = clamp(goal.x, minX, maxX);
    goal.z = clamp(goal.z, minZ, maxZ);
    return goal;
  } function findFlankGoal(enemy, target) {
    const toEnemyX = enemy.root.position.x - target.x;
    const toEnemyZ = enemy.root.position.z - target.z;
    const length = Math.max(0.001, Math.hypot(toEnemyX, toEnemyZ));
    const nx = toEnemyX / length;
    const nz = toEnemyZ / length;
    const sideX = -nz * enemy.flankSign;
    const sideZ = nx * enemy.flankSign;
    const desired = enemy.ranged ? Math.min(9, enemy.range * 0.58) : 3.5;
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const sideAmount = 4.2 + attempt * 0.7;
      const x = target.x + nx * desired + sideX * sideAmount;
      const z = target.z + nz * desired + sideZ * sideAmount;
      const y = surfaceY(x, z, enemy.root.position.y);
      if (!positionIsBlocked({ x, y, z }, 0.36 * TYPE_DATA[enemy.type].scale, 1.9 * TYPE_DATA[enemy.type].scale)) {
        enemy.goal.set(x, y, z);
        constrainGoal(enemy.goal);
        enemy.coverIntent = false;
        enemy.coverId = null;
        return true;
      }
      enemy.flankSign *= -1;
    }
    enemy.goal.copy(enemy.lastSeen);
    constrainGoal(enemy.goal);
    return false;
  } function planEnemy(enemy, target, distance) {
    const healthRatio = enemy.health / Math.max(1, enemy.maxHealth);
    enemy.rethinkTimer = 0.58 + shotNoise(enemy.id.length + Math.floor(elapsed * 2), enemy.wobbleSeed) * 0.62;
    if (enemy.stationary) {
      setEnemyState(enemy, "hold", 1.2);
      enemy.goal.copy(enemy.root.position);
      enemy.coverIntent = false;
      enemy.coverId = null;
      return;
    }
    if (enemy.boss) {
      if (enemy.bossPhase === 1) {
        setEnemyState(enemy, distance > 12 ? "seek" : "suppress", 0.8);
        if (distance > 12) enemy.goal.copy(enemy.lastSeen);
      } else if (enemy.bossPhase === 2) {
        setEnemyState(enemy, "flank", 1.15);
        findFlankGoal(enemy, target);
      } else if (distance > 6.2) {
        setEnemyState(enemy, "rush", 0.72);
        enemy.goal.copy(enemy.lastSeen);
      } else {
        setEnemyState(enemy, "hold", 0.6);
        findCoverGoal(enemy, target, 7);
      }
      if (enemy.state !== "hold") {
        enemy.coverIntent = false;
        enemy.coverId = null;
      }
      return;
    }
    // Once only one ordinary hostile remains, it must actively collapse the
    // encounter instead of preserving a tactically valid perch forever.
    if (mustPursue(enemy, distance)) {
      setEnemyState(enemy, "rush", 0.72);
      enemy.goal.copy(target);
      enemy.coverIntent = false;
      enemy.coverId = null;
      return;
    }
    if (enemy.role === "retreat" || (healthRatio < 0.22 && enemy.type !== "colossus")) {
      setEnemyState(enemy, "retreat", 1.35);
      findCoverGoal(enemy, target, enemy.ranged ? 11 : 7);
      return;
    }
    if (!enemy.targetVisible) {
      setEnemyState(enemy, "seek", enemy.memoryTimer > 0 ? 1 : 1.45);
      enemy.goal.copy(enemy.memoryTimer > 0 ? enemy.lastSeen : target);
      enemy.coverIntent = false;
      enemy.coverId = null;
      return;
    }
    if (enemy.role === "flank") {
      setEnemyState(enemy, "flank", 1.3);
      findFlankGoal(enemy, target);
    } else if (enemy.role === "suppress") {
      if (enemy.suppression > 0.62) {
        setEnemyState(enemy, "retreat", 1.1);
        findCoverGoal(enemy, target, 10);
      } else if (distance > enemy.range * 0.88 || distance < 4.2) {
        setEnemyState(enemy, distance < 4.2 ? "retreat" : "seek", 0.82);
        if (distance < 4.2) findCoverGoal(enemy, target, 9);
        else enemy.goal.copy(enemy.lastSeen);
      } else {
        setEnemyState(enemy, "suppress", 0.95);
        enemy.goal.copy(enemy.root.position);
      }
    } else if (enemy.role === "hold") {
      if (distance > Math.max(5, enemy.range * 0.9)) {
        setEnemyState(enemy, "seek", 0.9);
        enemy.goal.copy(enemy.lastSeen);
      } else {
        setEnemyState(enemy, "hold", 0.82);
        enemy.goal.copy(enemy.root.position);
      }
    } else {
      setEnemyState(enemy, "rush", 0.75);
      enemy.goal.copy(enemy.lastSeen);
    }
    if (enemy.state !== "retreat") {
      enemy.coverIntent = false;
      enemy.coverId = null;
    }
  } function movementGoalForState(enemy, target, distance, time) {
    if (enemy.state === "rush") enemy.goal.copy(enemy.pursuitMode || enemy.targetVisible ? target : enemy.lastSeen);
    if (enemy.state === "seek") {
      // Planning deliberately uses the live player once memory expires. Do not
      // overwrite that useful goal with `lastSeen`, which begins at spawn and
      // previously froze every occluded enemy in place forever.
      enemy.goal.copy(enemy.targetVisible || enemy.memoryTimer <= 0 ? target : enemy.lastSeen);
    }
    if (enemy.state === "suppress") {
      const tangentX = -(target.z - enemy.root.position.z) / Math.max(0.001, distance);
      const tangentZ = (target.x - enemy.root.position.x) / Math.max(0.001, distance);
      enemy.goal.set(
        enemy.root.position.x + tangentX * enemy.steerSign * 1.25,
        enemy.root.position.y,
        enemy.root.position.z + tangentZ * enemy.steerSign * 1.25
      );
    }
    if (enemy.state === "hold" && distance < Math.max(2.6, enemy.range * 0.42)) {
      const awayX = (enemy.root.position.x - target.x) / Math.max(0.001, distance);
      const awayZ = (enemy.root.position.z - target.z) / Math.max(0.001, distance);
      enemy.goal.set(enemy.root.position.x + awayX * 2, enemy.root.position.y, enemy.root.position.z + awayZ * 2);
    }
    if (enemy.state === "flank" && enemy.root.position.distanceToSquared(enemy.goal) < 1.4) {
      enemy.flankSign *= -1;
      findFlankGoal(enemy, target);
    }
  } function escapeRouteAt(position, groundY, fallbackX = 0) {
    if (finite(groundY) < 7) return null;
    const x = finite(position?.x);
    const z = finite(position?.z);
    if (Math.abs(x) <= 21.35 && z >= -7.4) return null;
    const sideX = Math.abs(x) > 1.1 ? x : finite(fallbackX);
    return sideX < 0 ? "westFloodEscape" : "eastFloodEscape";
  } function nearestRouteIndex(nodes, position, groundY = 0) {
    if (!Array.isArray(nodes) || !nodes.length) return 0;
    let bestIndex = 0;
    let bestScore = Infinity;
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const dx = finite(node?.x) - finite(position?.x);
      const dz = finite(node?.z) - finite(position?.z);
      const dy = finite(node?.y, groundY) - finite(groundY);
      const score = dx * dx + dz * dz + dy * dy * 2.4;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    return bestIndex;
  } function escapeNavigationPlan(enemy, target, targetGroundY, routes) {
    if (finite(enemy.groundY) < 7) return null;
    const enemyRoute = escapeRouteAt(enemy.root.position, enemy.groundY, target.x);
    const targetRoute = escapeRouteAt(target, targetGroundY, enemy.root.position.x);
    if (!enemyRoute && !targetRoute) return null;
    if (enemyRoute && targetRoute && enemyRoute === targetRoute) {
      const nodes = Array.isArray(routes?.[enemyRoute]) ? routes[enemyRoute] : null;
      if (!nodes?.length) return null;
      const enemyIndex = nearestRouteIndex(nodes, enemy.root.position, enemy.groundY);
      const targetIndex = nearestRouteIndex(nodes, target, targetGroundY);
      if (enemyIndex === targetIndex) return null;
      return { routeId: enemyRoute, direction: targetIndex > enemyIndex ? 1 : -1 };
    }
    if (enemyRoute && targetRoute) {
      // Opposite causeways meet at the crown apse. Follow the current side to
      // that junction, then the next frame replans down the player's side.
      return { routeId: enemyRoute, direction: 1 };
    }
    if (enemyRoute) return { routeId: enemyRoute, direction: -1 };
    return { routeId: targetRoute, direction: 1 };
  } function navigationZone(position, groundY) {
    if (finite(groundY) < 1.35) return "floor";
    if (finite(groundY) >= 7) return "upper";
    if (finite(position?.z) > -15 && Math.abs(finite(position?.x)) > 12) {
      return finite(position.x) < 0 ? "westGallery" : "eastGallery";
    }
    return "altar";
  } function routeIdForZone(zone, x = 0) {
    if (zone === "westGallery" || zone === "eastGallery") return zone;
    if (zone === "upper") return finite(x) < 0 ? "westUpper" : "eastUpper";
    if (zone === "altar") return finite(x) < 0 ? "westAltar" : "eastAltar";
    return null;
  } function clearNavigationRoute(enemy) {
    enemy.navRouteId = null;
    enemy.navDirection = 0;
    enemy.navIndex = 0;
    enemy.navWaypoint = null;
  } function navigationWaypoint(enemy, target, distance) {
    const routes = combatData()?.navigationRoutes;
    if (!routes || typeof routes !== "object") {
      clearNavigationRoute(enemy);
      return null;
    }
    const targetGroundY = surfaceY(target.x, target.z, lastPlayer.y);
    const escapePlan = escapeNavigationPlan(enemy, target, targetGroundY, routes);
    if (enemy.navRouteId && (
      (escapePlan && (enemy.navRouteId !== escapePlan.routeId || enemy.navDirection !== escapePlan.direction)) ||
      (!escapePlan && /FloodEscape$/.test(String(enemy.navRouteId)))
    )) {
      clearNavigationRoute(enemy);
    }
    // A selected cross-tier route is a commitment. Reclassifying the actor's
    // zone halfway down a ramp used to clear the route for one frame, turn the
    // actor uphill, and restart the same route at index zero forever.
    if (enemy.navRouteId && (enemy.navDirection === 1 || enemy.navDirection === -1)) {
      const activeNodes = Array.isArray(routes[enemy.navRouteId]) ? routes[enemy.navRouteId] : null;
      if (activeNodes?.length) {
        let activeNode = activeNodes[enemy.navIndex];
        let activeGuard = 0;
        while (activeNode && activeGuard++ < activeNodes.length) {
          const horizontal = Math.hypot(
            finite(activeNode.x) - enemy.root.position.x,
            finite(activeNode.z) - enemy.root.position.z
          );
          const vertical = Math.abs(finite(activeNode.y, enemy.groundY) - enemy.groundY);
          if (horizontal > 0.82 || vertical > 0.9) break;
          enemy.navIndex += enemy.navDirection;
          activeNode = activeNodes[enemy.navIndex];
        }
        if (activeNode) {
          enemy.navWaypoint = {
            x: finite(activeNode.x),
            y: finite(activeNode.y),
            z: finite(activeNode.z)
          };
          return enemy.navWaypoint;
        }
      }
      clearNavigationRoute(enemy);
    }
    // A ranged enemy with a clean shot is intentionally using its elevation,
    // not lost. Everyone else must bridge disconnected support tiers through
    // an authored stair route instead of steering through railings or open air.
    if (!mustPursue(enemy, distance) && !enemy.navRouteId && enemy.ranged && enemy.targetVisible && distance <= enemy.range + 2) {
      clearNavigationRoute(enemy);
      return null;
    }
    const enemyZone = navigationZone(enemy.root.position, enemy.groundY);
    const targetZone = navigationZone(target, targetGroundY);
    let routeId = null;
    let direction = 0;
    if (escapePlan) {
      routeId = escapePlan.routeId;
      direction = escapePlan.direction;
    } else if (enemyZone !== "floor" && enemyZone !== targetZone) {
      routeId = routeIdForZone(enemyZone, enemy.root.position.x);
      direction = 1;
    } else if (enemyZone === "floor" && targetZone !== "floor") {
      routeId = routeIdForZone(targetZone, lastPlayer.x);
      direction = -1;
    }
    const nodes = routeId && Array.isArray(routes[routeId]) ? routes[routeId] : null;
    if (!nodes?.length) {
      clearNavigationRoute(enemy);
      return null;
    }
    if (enemy.navRouteId !== routeId || enemy.navDirection !== direction) {
      enemy.navRouteId = routeId;
      enemy.navDirection = direction;
      enemy.navIndex = /FloodEscape$/.test(String(routeId))
        ? nearestRouteIndex(nodes, enemy.root.position, enemy.groundY)
        : direction > 0 ? 0 : nodes.length - 1;
    }
    let node = nodes[enemy.navIndex];
    let guard = 0;
    while (node && guard++ < nodes.length) {
      const horizontal = Math.hypot(
        finite(node.x) - enemy.root.position.x,
        finite(node.z) - enemy.root.position.z
      );
      const vertical = Math.abs(finite(node.y, enemy.groundY) - enemy.groundY);
      if (horizontal > 0.82 || vertical > 0.9) break;
      enemy.navIndex += direction;
      node = nodes[enemy.navIndex];
    }
    if (!node) {
      clearNavigationRoute(enemy);
      return null;
    }
    enemy.navWaypoint = { x: finite(node.x), y: finite(node.y), z: finite(node.z) };
    return enemy.navWaypoint;
  } function chooseRecoveryGoal(enemy, target, stage = 1) {
    const scale = TYPE_DATA[enemy.type].scale;
    const dx = target.x - enemy.root.position.x;
    const dz = target.z - enemy.root.position.z;
    const length = Math.max(0.001, Math.hypot(dx, dz));
    const forwardX = dx / length;
    const forwardZ = dz / length;
    const sideX = -forwardZ;
    const sideZ = forwardX;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const sign = (attempt % 2 === 0 ? 1 : -1) * enemy.steerSign;
      const lateral = 1.8 + Math.floor(attempt / 2) * 0.75 + stage * 0.35;
      const forward = 0.7 + (attempt % 3) * 0.5;
      const x = enemy.root.position.x + sideX * sign * lateral + forwardX * forward;
      const z = enemy.root.position.z + sideZ * sign * lateral + forwardZ * forward;
      const y = surfaceY(x, z, enemy.groundY);
      if (Math.abs(y - enemy.groundY) > 0.82) continue;
      if (positionIsBlocked({ x, y, z }, 0.36 * scale, 1.9 * scale)) continue;
      enemy.recoveryGoal.set(x, y, z);
      constrainGoal(enemy.recoveryGoal);
      enemy.recoveryTimer = 1.25 + stage * 0.35;
      enemy.goal.copy(enemy.recoveryGoal);
      enemy.navigationRecoveries += 1;
      stats.navigationRecoveries += 1;
      return true;
    }
    return false;
  } function relocateLostEnemy(enemy, target, options = {}) {
    const lastHostileRecovery = Boolean(options.lastHostile);
    if (enemy.boss || (lastHostileRecovery && enemy.lastHostileRelocated)) return false;
    const failedProgressAtRelocation = enemy.lastHostileFailedProgress;
    const arenaData = combatData();
    const enemyZone = navigationZone(enemy.root.position, enemy.groundY);
    const routeId = escapeRouteAt(enemy.root.position, enemy.groundY, target.x) ||
      routeIdForZone(enemyZone, enemy.root.position.x);
    const routeNodes = routeId && Array.isArray(arenaData?.navigationRoutes?.[routeId])
      ? arenaData.navigationRoutes[routeId]
      : [];
    const candidates = enemyZone === "floor"
      ? [...(arenaData?.recoveryNodes || [])]
      : [...routeNodes.slice(0, Math.min(3, routeNodes.length))];
    let best = null;
    let bestScore = -Infinity;
    const scale = TYPE_DATA[enemy.type].scale;
    for (const raw of candidates) {
      const x = finite(raw?.x, NaN);
      const z = finite(raw?.z, NaN);
      const hintY = finite(raw?.y, lastPlayer.y);
      if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
      const y = surfaceY(x, z, hintY);
      if (lastHostileRecovery && Math.abs(y - enemy.groundY) > 0.82) continue;
      if (lastHostileRecovery && navigationZone({ x, z }, y) !== enemyZone) continue;
      if (positionIsBlocked({ x, y, z }, 0.36 * scale, 1.9 * scale)) continue;
      if (enemies.some((other) => other !== enemy && other.alive &&
        Math.hypot(other.root.position.x - x, other.root.position.z - z) < 1.25 * scale)) continue;
      const playerDistance = Math.hypot(x - lastPlayer.x, z - lastPlayer.z);
      if (playerDistance < 4.5 || playerDistance > 23) continue;
      scratchA.set(x, y + 1.05 * scale, z);
      const visible = !worldTrace(target, scratchA).blocked;
      const inView = viewConeForPosition(scratchA, scale).inViewCone;
      // Recovery is fail-soft, not a jump scare: only relocate behind the
      // player or behind geometry, and always remain on the actor's tier.
      if (visible && inView) continue;
      if (lastHostileRecovery && inView) continue;
      const score = (visible ? 0 : 2.6) + (inView ? 0 : 1.4) - Math.abs(playerDistance - 10) * 0.24;
      if (score > bestScore) {
        bestScore = score;
        best = { x, y, z };
      }
    }
    if (!best) return false;
    enemy.root.position.set(best.x, best.y + enemy.footClearance, best.z);
    enemy.groundY = best.y;
    enemy.grounded = true;
    enemy.goal.copy(target);
    enemy.lastSeen.copy(target);
    enemy.memoryTimer = Math.max(enemy.memoryTimer, 2.2);
    enemy.rethinkTimer = 0;
    enemy.blockedTime = 0;
    enemy.stuckTimer = 0;
    enemy.lastHostileFailedProgress = 0;
    enemy.recoveryStage = 0;
    enemy.recoveryTimer = 0;
    enemy.navigationRelocations += 1;
    stats.navigationRelocations += 1;
    if (lastHostileRecovery) {
      enemy.lastHostileRelocated = true;
      enemy.lastHostileRelocationAt = elapsed;
      enemy.lastHostileFailedAtRelocation = failedProgressAtRelocation;
      stats.lastHostileRelocations += 1;
    }
    clearNavigationRoute(enemy);
    enemy.lastValidGroundedPosition.copy(enemy.root.position);
    enemy.progressAnchor.copy(enemy.root.position);
    enemy.progressGoal.copy(enemy.goal);
    enemy.progressGoalDistance = enemy.root.position.distanceTo(enemy.goal);
    enemy.progressTimer = 0;
    enemy.progressNavRouteId = null;
    enemy.progressNavIndex = 0;
    return true;
  } function updateEnemyNavigationProgress(enemy, moved, dt, target, distance) {
    enemy.actualSpeed = dt > 0 ? moved / dt : 0;
    enemy.totalTravel += moved;
    enemy.unseenTimer = enemy.targetVisible ? 0 : enemy.unseenTimer + dt;
    const goalDistance = Math.hypot(
      enemy.goal.x - enemy.root.position.x,
      enemy.goal.z - enemy.root.position.z
    );
    const closingPursuit = mustPursue(enemy, distance);
    const intentionallyHolding = enemy.stationary || enemy.state === "spawn" ||
      enemy.state === "telegraph" || enemy.state === "stagger" ||
      (!closingPursuit && enemy.state === "hold" && goalDistance <= 0.45) || distance <= 2.1 ||
      (!closingPursuit && enemy.ranged && enemy.targetVisible && distance <= enemy.range + 1.5);
    if (intentionallyHolding) {
      enemy.stuckTimer = Math.max(0, enemy.stuckTimer - dt * 3);
      enemy.lastHostileFailedProgress = closingPursuit
        ? Math.max(0, enemy.lastHostileFailedProgress - dt * 3)
        : 0;
      if (enemy.stuckTimer <= 0.05) enemy.recoveryStage = 0;
      enemy.progressAnchor.copy(enemy.root.position);
      enemy.progressGoal.copy(enemy.goal);
      enemy.progressGoalDistance = goalDistance;
      enemy.progressTimer = 0;
      enemy.progressNavRouteId = enemy.navRouteId;
      enemy.progressNavIndex = enemy.navIndex;
      return;
    }
    const goalShift = Math.hypot(
      enemy.goal.x - enemy.progressGoal.x,
      enemy.goal.z - enemy.progressGoal.z
    );
    if (goalShift > 1.4 && enemy.progressTimer > 0.08) {
      enemy.progressAnchor.copy(enemy.root.position);
      enemy.progressGoal.copy(enemy.goal);
      enemy.progressGoalDistance = goalDistance;
      enemy.progressTimer = 0;
      enemy.progressNavRouteId = enemy.navRouteId;
      enemy.progressNavIndex = enemy.navIndex;
      return;
    }
    enemy.progressTimer += dt;
    if (enemy.progressTimer < 0.85) return;
    const progressWindow = enemy.progressTimer;
    const netDisplacement = Math.hypot(
      enemy.root.position.x - enemy.progressAnchor.x,
      enemy.root.position.z - enemy.progressAnchor.z
    );
    const goalGain = enemy.progressGoalDistance - goalDistance;
    const routeAdvanced = enemy.navRouteId != null && enemy.navRouteId === enemy.progressNavRouteId && (
      enemy.navDirection > 0
        ? enemy.navIndex > enemy.progressNavIndex
        : enemy.navDirection < 0 && enemy.navIndex < enemy.progressNavIndex
    );
    // Path length alone lies: an actor can pace in a five-centimetre pocket
    // forever while logging metres of travel. Progress means closing on the
    // current waypoint, advancing a route, or actually arriving.
    const progressed = goalGain >= 0.16 || routeAdvanced || goalDistance <= 0.32;
    if (progressed) {
      enemy.stuckTimer = Math.max(0, enemy.stuckTimer - progressWindow * 2.25);
      if (closingPursuit) enemy.lastHostileFailedProgress = Math.max(0, enemy.lastHostileFailedProgress - progressWindow * 2.25);
      if (enemy.stuckTimer <= 0.05) enemy.recoveryStage = 0;
    } else {
      enemy.stuckTimer += progressWindow;
      if (closingPursuit) enemy.lastHostileFailedProgress += progressWindow;
      // Net displacement remains diagnostic, but circling without goal gain
      // intentionally does not reset the watchdog.
      void netDisplacement;
    }
    if (!closingPursuit) enemy.lastHostileFailedProgress = 0;
    if (enemy.stuckTimer >= 1 && enemy.recoveryStage < 1) {
      enemy.recoveryStage = 1;
      enemy.steerSign *= -1;
      enemy.flankSign *= -1;
      enemy.rethinkTimer = 0;
      chooseRecoveryGoal(enemy, target, 1);
    }
    if (enemy.stuckTimer >= 2.45 && enemy.recoveryStage < 2) {
      enemy.recoveryStage = 2;
      enemy.steerSign *= -1;
      enemy.rethinkTimer = 0;
      chooseRecoveryGoal(enemy, target, 2);
    }
    if (closingPursuit) {
      if (enemy.lastHostileFailedProgress >= LAST_HOSTILE_RELOCATION_FAILURE_TIME &&
        (!enemy.inViewCone || !enemy.targetVisible) && !enemy.lastHostileRelocated) {
        if (relocateLostEnemy(enemy, target, { lastHostile: true })) return;
      }
    } else if (enemy.stuckTimer >= 4.2 && !enemy.targetVisible && distance > 5) {
      if (relocateLostEnemy(enemy, target)) return;
    }
    enemy.progressAnchor.copy(enemy.root.position);
    enemy.progressGoal.copy(enemy.goal);
    enemy.progressGoalDistance = Math.hypot(
      enemy.goal.x - enemy.root.position.x,
      enemy.goal.z - enemy.root.position.z
    );
    enemy.progressTimer = 0;
    enemy.progressNavRouteId = enemy.navRouteId;
    enemy.progressNavIndex = enemy.navIndex;
  } function moveEnemy(enemy, target, distance, dt, time) {
    if (enemy.stationary) return;
    const keepOutOnly = enemy.state === "telegraph" || enemy.state === "stagger";
    if (keepOutOnly && distance >= enemy.keepOutDistance - 0.002) return;
    if (!keepOutOnly) movementGoalForState(enemy, target, distance, time);
    const navWaypoint = keepOutOnly ? null : navigationWaypoint(enemy, target, distance);
    if (!keepOutOnly && enemy.recoveryTimer > 0) enemy.goal.copy(enemy.recoveryGoal);
    else if (navWaypoint) enemy.goal.set(navWaypoint.x, navWaypoint.y, navWaypoint.z);
    let dx = keepOutOnly ? 0 : enemy.goal.x - enemy.root.position.x;
    let dz = keepOutOnly ? 0 : enemy.goal.z - enemy.root.position.z;
    let length = Math.hypot(dx, dz);
    const requiresKeepOutRecovery = distance < enemy.keepOutDistance - 0.002;
    if (length < 0.18 && !requiresKeepOutRecovery) return;
    let directionX = length >= 0.18 ? dx / length : 0;
    let directionZ = length >= 0.18 ? dz / length : 0;
    const separationRadius = 0.95 * TYPE_DATA[enemy.type].scale;
    for (const other of keepOutOnly ? [] : enemies) {
      if (other === enemy || !other.alive) continue;
      const ox = enemy.root.position.x - other.root.position.x;
      const oz = enemy.root.position.z - other.root.position.z;
      const separation = Math.hypot(ox, oz);
      if (separation <= 0.001 || separation >= separationRadius) continue;
      const force = (1 - separation / separationRadius) * 0.95;
      directionX += ox / separation * force;
      directionZ += oz / separation * force;
    }
    length = Math.hypot(directionX, directionZ);
    if (length > 0.001) {
      directionX /= length;
      directionZ /= length;
    }
    const stateScale = enemy.state === "rush" ? 1.18 : enemy.state === "retreat" ? 1.12 : enemy.state === "flank" ? 1.05 : 0.82;
    const pursuitScale = mustPursue(enemy, distance)
      ? clamp(1.24 + Math.max(0, distance - 12) * 0.022, 1.24, 1.72)
      : 1;
    const speed = enemy.speed * stateScale * pursuitScale * (1 + Math.sin(time * 2.2 + enemy.wobbleSeed) * 0.06);
    const radius = 0.34 * TYPE_DATA[enemy.type].scale;
    const height = 1.9 * TYPE_DATA[enemy.type].scale;
    const origin = enemy.root.position;
    let movement = resolveEnemyMovementWithKeepOut(enemy, target, {
      x: directionX * speed * dt + enemy.impulse.x * dt,
      z: directionZ * speed * dt + enemy.impulse.z * dt
    }, radius, height, dt);
    if (movement.blocked) {
      const tangentStep = speed * dt;
      const tangentPreferred = resolveEnemyMovementWithKeepOut(enemy, target, {
        x: -directionZ * tangentStep * enemy.steerSign + enemy.impulse.x * dt,
        z: directionX * tangentStep * enemy.steerSign + enemy.impulse.z * dt
      }, radius, height, dt);
      const travelDirect = (movement.x - origin.x) ** 2 + (movement.z - origin.z) ** 2;
      const travelPreferred = (tangentPreferred.x - origin.x) ** 2 + (tangentPreferred.z - origin.z) ** 2;
      if (travelPreferred > 0.000064 && travelPreferred >= travelDirect * 0.72) {
        movement = tangentPreferred;
      } else if (Math.max(travelDirect, travelPreferred) <= 0.000064) {
        const tangentAlternate = resolveEnemyMovementWithKeepOut(enemy, target, {
          x: directionZ * tangentStep * enemy.steerSign + enemy.impulse.x * dt,
          z: -directionX * tangentStep * enemy.steerSign + enemy.impulse.z * dt
        }, radius, height, dt);
        const travelAlternate = (tangentAlternate.x - origin.x) ** 2 + (tangentAlternate.z - origin.z) ** 2;
        if (travelAlternate > Math.max(travelDirect, travelPreferred)) {
          movement = tangentAlternate;
          enemy.steerSign *= -1;
        } else if (travelPreferred > travelDirect) {
          movement = tangentPreferred;
        }
      }
      const finalTravel = Math.hypot(movement.x - origin.x, movement.z - origin.z);
      if (finalTravel > 0.008) {
        // Persist the successful skirt direction. The old timer reversed every
        // half-second even while moving, making enemies pace against wide cover.
        enemy.blockedTime = Math.max(0, enemy.blockedTime - dt * 2.5);
      } else {
        enemy.blockedTime += dt;
      }
      if (enemy.blockedTime > 0.72) {
        enemy.steerSign *= -1;
        enemy.flankSign *= -1;
        enemy.rethinkTimer = 0;
        enemy.blockedTime = 0;
      }
    } else {
      enemy.blockedTime = Math.max(0, enemy.blockedTime - dt * 2);
    }
    enemy.root.position.x = movement.x;
    enemy.root.position.z = movement.z;
    enemy.keepOutForcedThisFrame = enemy.keepOutForcedThisFrame || Boolean(movement.keepOutForced);
    if (movement.supportId) enemy.supportId = movement.supportId;
  } function updateEnemyGrounding(enemy, dt) {
    const clearance = Math.max(0.02, finite(enemy.footClearance, 0.035));
    const feetHint = enemy.root.position.y - clearance;
    const groundY = surfaceY(enemy.root.position.x, enemy.root.position.z, feetHint);
    const desiredY = groundY + clearance;
    const wasBelow = enemy.root.position.y < desiredY - 0.03;
    let proposedY = enemy.root.position.y + Math.max(0, enemy.impulse.y) * dt;
    if (proposedY > desiredY) {
      // Ordinary locomotion hugs ramps exactly. Smoothing a fast pursuer's Y
      // made it hover 20cm above descending stairs and report ungrounded even
      // though its horizontal route was correct. Preserve smoothing only for
      // a real upward combat impulse.
      if (enemy.impulse.y <= 0.12) proposedY = desiredY;
      else proposedY += (desiredY - proposedY) * Math.min(1, dt * 8.5);
    }
    if (proposedY < desiredY) proposedY = desiredY;
    enemy.root.position.y = proposedY;
    enemy.groundY = groundY;
    enemy.grounded = Math.abs(proposedY - desiredY) <= 0.055;
    if (wasBelow) {
      enemy.groundCorrections += 1;
      enemy.impulse.y = Math.max(0, enemy.impulse.y);
    }
    if (enemy.grounded) enemy.lastValidGroundedPosition.copy(enemy.root.position);
  } function faceEnemyToward(enemy, target, dt) {
    const lookTarget = enemy.targetVisible ? target : enemy.goal;
    const dx = lookTarget.x - enemy.root.position.x;
    const dz = lookTarget.z - enemy.root.position.z;
    if (Math.abs(dx) + Math.abs(dz) < 0.001) return;
    const desired = Math.atan2(dx, dz);
    const delta = Math.atan2(Math.sin(desired - enemy.root.rotation.y), Math.cos(desired - enemy.root.rotation.y));
    enemy.root.rotation.y += delta * Math.min(1, dt * (enemy.state === "telegraph" ? 9 : 5.5));
  } function beginEnemyAttack(enemy) {
    enemy.previousState = enemy.state;
    setEnemyState(enemy, "telegraph", enemy.boss ? 0.52 : enemy.ranged ? 0.34 : 0.22);
    enemy.attackWindup = enemy.stateTimer;
    enemy.attackWindupMax = enemy.attackWindup;
    if (enemy.telegraph) {
      enemy.telegraph.material.color.setHex(cueColorFor(enemy.type, enemy.bossPhase));
      enemy.telegraph.visible = true;
      enemy.telegraph.material.opacity = 0.15;
    }
    call("audio", "enemyShot", {
      intensity: enemy.boss ? 0.62 : 0.24,
      pan: clamp((enemy.root.position.x - lastPlayer.x) / 12, -1, 1)
    });
    emitEvent("enemyTelegraph", {
      enemyId: enemy.id,
      enemyType: enemy.type,
      boss: Boolean(enemy.boss),
      ranged: Boolean(enemy.ranged),
      duration: finite(enemy.attackWindupMax),
      position: enemy.root.position,
      targetPosition: { x: lastPlayer.x, y: lastPlayer.y + lastPlayer.eyeHeight, z: lastPlayer.z }
    });
  } function finishEnemyAttack(enemy, target, distance) {
    if (enemy.telegraph) {
      enemy.telegraph.visible = false;
      enemy.telegraph.material.opacity = 0;
    }
    const data = TYPE_DATA[enemy.type];
    scratchA.set(enemy.root.position.x, enemy.root.position.y + 1.05 * data.scale, enemy.root.position.z);
    const clear = !worldTrace(scratchA, target).blocked;
    if (clear && distance <= enemy.range + (enemy.ranged ? 1 : 0.45)) {
      if (enemy.ranged && distance > 2.25) {
        if (enemy.boss) spawnBossVolley(enemy, target);
        else spawnEnemyProjectile(enemy, target, { prediction: enemy.role === "suppress" ? 0.72 : 0.5 });
      } else {
        damagePlayerFromEnemy(enemy.damage * (enemy.bossPhase === 3 ? 1.18 : 1), enemy.id);
        call("splat", { x: 0.5, y: 0.52, intensity: enemy.type === "colossus" ? 0.85 : 0.54, wetness: 0.6, sauce: 0.2, directionY: 0.3 });
      }
    }
    const cadenceScale = enemy.boss ? (enemy.bossPhase === 3 ? 0.62 : enemy.bossPhase === 2 ? 0.78 : 1) : 1;
    enemy.attackTimer = enemy.cadence * cadenceScale;
    setEnemyState(enemy, enemy.previousState === "telegraph" ? "hold" : enemy.previousState, 0.48);
  } function updateBoss(enemy, target, distance, time) {
    const healthRatio = enemy.health / Math.max(1, enemy.maxHealth);
    const phase = healthRatio > 0.68 ? 1 : healthRatio > 0.34 ? 2 : 3;
    const phaseCueColor = BOSS_PHASE_CUE_COLORS[phase];
    enemy.bossPhase = phase;
    enemy.material.emissive.setHex(BOSS_PHASE_EMISSIVE_COLORS[phase]);
    if (enemy.telegraph) enemy.telegraph.material.color.setHex(phaseCueColor);
    if (phase > enemy.announcedPhase) {
      enemy.announcedPhase = phase;
      stats.bossPhaseTransitions += 1;
      enemy.rethinkTimer = 0;
      enemy.summonTimer = Math.min(enemy.summonTimer, 1.25);
      // animateEnemy owns emissiveIntensity every frame, so a direct write here
      // is clobbered before it can render. Drive the flare through a decaying
      // timer the animator layers on top of the steady boss glow instead.
      enemy.phaseFlareTimer = 0.5;
      call("message", phase === 2 ? "THE NOODLEMANCER UNTWISTS REALITY" : "RAGU APOCALYPSE // THE LAST COURSE");
      call("audio", "bossSpawn", { intensity: phase === 2 ? 1.3 : 1.65, pan: 0 });
      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 10),
        new THREE.MeshBasicMaterial({ color: phaseCueColor, transparent: true, opacity: 0.54, depthWrite: false, toneMapped: false })
      );
      pulse.position.copy(enemy.root.position).add(scratchA.set(0, 1.3 * TYPE_DATA.noodlemancer.scale, 0));
      pulse.scale.setScalar(0.2);
      scene.add(pulse);
      effects.push({ object: pulse, life: 0.7, maxLife: 0.7, kind: "bossPulse" });
      emitEvent("bossPhase", {
        enemyId: enemy.id,
        phase,
        health: finite(enemy.health),
        maxHealth: finite(enemy.maxHealth),
        position: enemy.root.position
      });
    }
    if (enemy.spellRing) {
      enemy.spellRing.material.color.setHex(phaseCueColor);
      enemy.spellRing.rotation.z += (0.5 + phase * 0.35) * 0.016;
      const phaseScale = 1 + (phase - 1) * 0.13;
      const phaseFlare = enemy.phaseFlareTimer > 0 ? (enemy.phaseFlareTimer / 0.5) * 0.14 : 0;
      enemy.spellRing.scale.setScalar(phaseScale + phaseFlare + Math.sin(time * (2 + phase) + enemy.wobbleSeed) * 0.07);
      enemy.spellRing.material.opacity = 0.35 + phase * 0.12;
    }
    if (enemy.crown) {
      enemy.crown.rotation.y += 0.006 * phase;
      const crownFlare = enemy.phaseFlareTimer > 0 ? (enemy.phaseFlareTimer / 0.5) * 0.09 : 0;
      enemy.crown.scale.setScalar(1 + (phase - 1) * 0.055 + crownFlare);
    }
    if (enemy.summonTimer > 0) return;
    let living = 0;
    for (const entry of enemies) if (entry.alive) living += 1;
    const cap = phase === 1 ? 6 : phase === 2 ? 7 : 8;
    if (living < cap) {
      const summons = phase === 1 ? ["twirler"] : phase === 2 ? ["twirler", "twirler"] : ["saucier", living < 5 ? "colossus" : "twirler"];
      summons.forEach((type, index) => {
        scratchA.copy(enemy.root.position);
        const angle = time * 0.7 + index * Math.PI;
        scratchA.x += Math.sin(angle) * (2.8 + index);
        scratchA.z += Math.cos(angle) * (2.8 + index);
        spawnEnemy({
          type,
          position: { x: scratchA.x, y: scratchA.y, z: scratchA.z },
          autoSpawn: true,
          summoned: true,
          spawnWave: waveIndex,
          spawnSlot: enemies.length
        });
      });
      call("message", phase === 3 ? "THE MASTER SERVES HIS INNER CIRCLE" : "THE NOODLEMANCER PULLS FRESH STRANDS");
    }
    enemy.summonTimer = phase === 1 ? 8.2 : phase === 2 ? 7 : 5.8;
  } function animateEnemy(enemy, dt, time) {
    const locomotion = enemy.state === "rush" ? 1.35 : enemy.state === "flank" ? 1.12 : enemy.state === "retreat" ? 1.25 : 0.72;
    const stride = time * (4.2 + enemy.speed * 1.35) + enemy.wobbleSeed;
    const stagger = enemy.staggerTimer > 0 ? Math.sin((enemy.staggerTimer + 0.03) * 52) * 0.17 : 0;
    enemy.root.rotation.z = Math.sin(stride * 0.72) * 0.045 * locomotion + stagger;
    enemy.rig.position.y = Math.abs(Math.sin(stride)) * 0.045 * locomotion;
    enemy.rig.scale.y = 1 + Math.sin(stride * 2) * 0.018 * locomotion;
    enemy.headGroup.rotation.z = Math.sin(time * 2.6 + enemy.wobbleSeed) * 0.05 + stagger * 0.25;
    enemy.leftArm.rotation.z = Math.sin(stride) * 0.18 * locomotion - (enemy.state === "telegraph" ? 0.2 : 0);
    enemy.rightArm.rotation.z = -Math.sin(stride) * 0.18 * locomotion + (enemy.state === "telegraph" ? 0.2 : 0);
    enemy.legGroups[0].rotation.x = Math.sin(stride) * 0.2 * locomotion;
    enemy.legGroups[1].rotation.x = -Math.sin(stride) * 0.2 * locomotion;
    if (enemy.weaponMesh) enemy.weaponMesh.rotation.x = enemy.state === "telegraph" ? -0.1 + Math.sin(time * 24) * 0.035 : Math.sin(stride) * 0.025;
    const attackCharge = enemy.telegraph?.visible
      ? 1 - clamp(enemy.attackWindup / Math.max(0.01, enemy.attackWindupMax), 0, 1)
      : 0;
    if (enemy.telegraph?.visible) {
      const charge = attackCharge;
      enemy.telegraph.material.opacity = 0.18 + charge * 0.78;
      enemy.telegraph.scale.setScalar(0.7 + charge * 1.7 + Math.sin(time * 35) * 0.12);
    }
    if (enemy.roleAccent) {
      const cue = enemy.roleAccent.userData;
      const idlePulse = 1 + Math.sin(time * (enemy.type === "twirler" ? 3.1 : 2.1) + enemy.wobbleSeed) * 0.025;
      const chargePulse = 1 + attackCharge * (enemy.type === "colossus" ? 0.14 : 0.2);
      const pulse = idlePulse * chargePulse;
      enemy.roleAccent.scale.set(cue.cueScaleX * pulse, cue.cueScaleY * pulse, cue.cueScaleZ * pulse);
      enemy.roleAccent.position.y = cue.cueBaseY + Math.sin(time * 2.2 + enemy.wobbleSeed) * 0.008 + attackCharge * 0.025;
      enemy.roleAccent.rotation.z = cue.cueBaseRotationZ + (enemy.type === "saucier"
        ? Math.sin(time * 1.7 + enemy.wobbleSeed) * 0.08
        : enemy.type === "colossus"
          ? Math.sin(time * 0.9 + enemy.wobbleSeed) * 0.025
          : 0);
    }
    const blink = Math.sin(time * 1.7 + enemy.wobbleSeed * 4) > 0.985 ? 0.12 : 1;
    for (const eye of enemy.eyes) eye.scale.y = blink;
    enemy.flashTimer = Math.max(0, enemy.flashTimer - dt);
    enemy.suppression = Math.max(0, enemy.suppression - dt * 0.18);
    if (enemy.boss) enemy.phaseFlareTimer = Math.max(0, (enemy.phaseFlareTimer || 0) - dt);
    enemy.material.emissiveIntensity = enemy.flashTimer > 0
      ? 3.2
      : enemy.boss
        ? 0.9 + enemy.bossPhase * 0.62 + (enemy.phaseFlareTimer > 0 ? (enemy.phaseFlareTimer / 0.5) * 1.6 : 0)
        : 0.28;
  } function updateEnemies(dt, time) {
    scratchC.set(lastPlayer.x, lastPlayer.y + 0.9, lastPlayer.z);
    coordinateSquad();
    const livingHostiles = enemies.filter((enemy) => enemy.alive);
    const regularHostiles = livingHostiles.filter((enemy) => !enemy.boss && !enemy.summoned && !enemy.stationary);
    const lastRegularId = livingHostiles.length === 1 && regularHostiles.length === 1
      ? regularHostiles[0].id
      : null;
    for (const enemy of [...enemies]) {
      if (!enemy.alive) continue;
      enemy.keepOutForcedThisFrame = false;
      const wasPursuing = enemy.pursuitMode;
      if (lastRegularId === enemy.id) enemy.lastHostileTimer += dt;
      else {
        enemy.lastHostileTimer = 0;
        enemy.lastHostileFailedProgress = 0;
        enemy.lastHostileRelocated = false;
        enemy.lastHostileRelocationAt = null;
        enemy.lastHostileFailedAtRelocation = null;
      }
      enemy.pursuitMode = enemy.lastHostileTimer >= 2.4;
      if (enemy.pursuitMode && !wasPursuing) {
        stats.lastHostilePursuits += 1;
        enemy.rethinkTimer = 0;
        enemy.stateTimer = 0;
      }
      enemy.attackTimer -= dt;
      enemy.summonTimer -= dt;
      enemy.rethinkTimer -= dt;
      enemy.stateTimer -= dt;
      enemy.staggerTimer = Math.max(0, enemy.staggerTimer - dt);
      enemy.recoveryTimer = Math.max(0, enemy.recoveryTimer - dt);
      const dx = scratchC.x - enemy.root.position.x;
      const dz = scratchC.z - enemy.root.position.z;
      const distance = Math.max(0.001, Math.hypot(dx, dz));
      const startX = enemy.root.position.x;
      const startZ = enemy.root.position.z;
      updatePerception(enemy, scratchC, distance, dt);
      updateEnemyViewCone(enemy);
      if (enemy.boss) updateBoss(enemy, scratchC, distance, time);
      if (enemy.staggerTimer > 0) {
        enemy.state = "stagger";
      } else if (enemy.state === "stagger") {
        enemy.rethinkTimer = 0;
      }
      if (enemy.state === "telegraph") {
        // Telegraphs freeze normal pursuit, but an actor already inside the
        // player's keep-out radius must keep yielding during the windup.
        moveEnemy(enemy, scratchC, distance, dt, time);
        enemy.attackWindup -= dt;
        if (enemy.attackWindup <= 0) finishEnemyAttack(enemy, scratchC, distance);
      } else {
        if (enemy.rethinkTimer <= 0 || enemy.stateTimer <= 0) planEnemy(enemy, scratchC, distance);
        moveEnemy(enemy, scratchC, distance, dt, time);
        // A staggered or still-spawning enemy is forced into those states above
        // and never reaches finishEnemyAttack, so without this guard its expired
        // attackTimer re-triggers beginEnemyAttack every frame — machine-gunning
        // the enemyShot cue and flickering the telegraph until the stagger ends.
        if (combatGrace <= 0 && enemy.state !== "stagger" && enemy.state !== "spawn" &&
          enemy.targetVisible && enemy.attackTimer <= 0) {
          const attackDistance = enemy.ranged ? enemy.range : enemy.range + 0.32;
          if (distance <= attackDistance) beginEnemyAttack(enemy);
        }
      }
      // Grounding is an actor invariant, not a side effect of horizontal AI.
      // Stationary, telegraph, hold, and stagger states all pass through here.
      updateEnemyGrounding(enemy, dt);
      updateEnemyNavigationProgress(
        enemy,
        Math.hypot(enemy.root.position.x - startX, enemy.root.position.z - startZ),
        dt,
        scratchC,
        distance
      );
      faceEnemyToward(enemy, scratchC, dt);
      finalizeEnemySpatialTelemetry(enemy, dt);
      enemy.impulse.multiplyScalar(Math.pow(0.055, dt));
      animateEnemy(enemy, dt, time);
    }
    refreshKeepOutTelemetry();
  } function spawnBossVolley(enemy, target) {
    const phase = enemy.bossPhase;
    const offsets = phase === 1 ? [0] : phase === 2 ? [-0.105, 0, 0.105] : [-0.24, -0.12, 0, 0.12, 0.24];
    offsets.forEach((yawOffset, index) => spawnEnemyProjectile(enemy, target, {
      yawOffset,
      speed: 8.4 + phase * 0.75,
      damage: enemy.damage * (phase === 3 ? 0.74 : phase === 2 ? 0.82 : 1),
      prediction: phase === 3 ? 0.9 : 0.7,
      silent: index > 0
    }));
    enemy.volleyIndex += 1;
  } function spawnEnemyProjectile(enemy, target, config = {}) {
    const boss = Boolean(enemy.boss);
    const radius = boss ? 0.21 : 0.145;
    const core = new THREE.Mesh(new THREE.SphereGeometry(radius, quality === "low" ? 9 : 14, 9), materials.sauce);
    const mesh = new THREE.Group();
    mesh.add(core);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.1, radius * 0.16, 6, 14),
      new THREE.MeshBasicMaterial({ color: boss ? 0xff8b2c : 0xffca62, transparent: true, opacity: 0.82, toneMapped: false })
    );
    ring.rotation.y = Math.PI / 2;
    mesh.add(ring);
    const start = scratchA.set(enemy.root.position.x, enemy.root.position.y + 1.08 * TYPE_DATA[enemy.type].scale, enemy.root.position.z);
    mesh.position.copy(start);
    scene.add(mesh);
    const speed = finite(config.speed, boss ? 8.4 : 7.4);
    const distance = start.distanceTo(target);
    const leadTime = clamp(distance / speed, 0.08, 1.15) * finite(config.prediction, 0.56);
    scratchB.copy(target).addScaledVector(playerVelocity, leadTime);
    if (!boss) {
      const error = (shotNoise(Math.floor(elapsed * 19) + enemy.id.length, enemy.wobbleSeed) - 0.5) * (enemy.role === "suppress" ? 0.34 : 0.62);
      scratchB.x += error;
      scratchB.z -= error * 0.55;
    }
    const predictedTarget = scratchB.clone();
    const direction = scratchB.sub(start).normalize();
    if (config.yawOffset) direction.applyAxisAngle(THREE.Object3D.DEFAULT_UP, finite(config.yawOffset));
    projectiles.push({
      mesh,
      velocity: direction.clone().multiplyScalar(speed),
      life: boss ? 4.8 : 4,
      damage: finite(config.damage, enemy.damage),
      owner: enemy.id,
      ownerType: enemy.type
    });
    emitEvent("projectile", {
      enemyId: enemy.id,
      enemyType: enemy.type,
      boss,
      origin: start,
      direction,
      targetPosition: predictedTarget,
      speed,
      damage: finite(config.damage, enemy.damage)
    });
    enemy.shotsFired += 1;
    stats.enemyShots += 1;
    if (!config.silent) call("audio", "enemyShot", { intensity: boss ? 1.2 : 0.8, pan: clamp((enemy.root.position.x - lastPlayer.x) / 10, -1, 1) });
  } function updateProjectiles(dt) {
    const target = new THREE.Vector3(lastPlayer.x, lastPlayer.y + 0.9, lastPlayer.z);
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = projectiles[i];
      projectile.life -= dt;
      const previous = projectile.mesh.position.clone();
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      projectile.mesh.rotation.x += dt * 8;
      const obstruction = worldTrace(previous, projectile.mesh.position);
      if (obstruction.blocked) {
        stats.coverBlocks += 1;
        projectile.mesh.position.copy(obstruction.point);
        removeObject(projectile.mesh);
        projectiles.splice(i, 1);
        continue;
      }
      if (projectile.mesh.position.distanceToSquared(target) < 0.55 || projectile.life <= 0) {
        if (projectile.life > 0) {
          // Aim the damage indicator back along the projectile's actual travel
          // path. The shooter may have moved or died since firing, so resolving
          // direction from the owner's current actor position is both fragile
          // and visually misleading.
          const impactOrigin = projectile.mesh.position.clone();
          const projectileSpeed = projectile.velocity.length();
          if (projectileSpeed > 0.0001) impactOrigin.addScaledVector(projectile.velocity, -3 / projectileSpeed);
          damagePlayerFromEnemy(projectile.damage, projectile.owner, true, impactOrigin, projectile.ownerType);
          call("splat", { x: 0.5, y: 0.48, intensity: 0.72, wetness: 1, sauce: 1, directionY: 0.65 });
        }
        removeObject(projectile.mesh);
        projectiles.splice(i, 1);
      }
    }
  } function throwSauceBomb(config = {}) {
    if (bombCooldown > 0 || defeated || victory) return false;
    bombCooldown = 4.8;
    stats.sauceThrows += 1;
    stats.sauceBombs = stats.sauceThrows;
    camera.getWorldPosition(worldCamera);
    camera.getWorldDirection(clockDirection);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 9), materials.sauce);
    mesh.position.copy(worldCamera).addScaledVector(clockDirection, 0.65);
    scene.add(mesh);
    const velocity = clockDirection.clone().multiplyScalar(9.5);
    velocity.y += 3.6;
    if (config?.target && Number.isFinite(config.target.x)) {
      velocity.copy(new THREE.Vector3(config.target.x, finite(config.target.y, mesh.position.y), finite(config.target.z)).sub(mesh.position).normalize().multiplyScalar(10));
      velocity.y += 2;
    }
    bombs.push({ mesh, velocity, fuse: 0.62 });
    call("message", "SAUCE BOMB // MARINARA OUT");
    return true;
  } function updateBombs(dt) {
    for (let i = bombs.length - 1; i >= 0; i -= 1) {
      const bomb = bombs[i];
      bomb.fuse -= dt;
      bomb.velocity.y -= 12 * dt;
      const previous = bomb.mesh.position.clone();
      bomb.mesh.position.addScaledVector(bomb.velocity, dt);
      bomb.mesh.rotation.x += dt * 11;
      const obstruction = worldTrace(previous, bomb.mesh.position);
      if (obstruction.blocked) {
        stats.coverBlocks += 1;
        bomb.mesh.position.copy(obstruction.point);
        bomb.fuse = 0;
      }
      const floor = surfaceY(bomb.mesh.position.x, bomb.mesh.position.z, lastPlayer.y);
      if (bomb.mesh.position.y < floor + 0.2) {
        bomb.mesh.position.y = floor + 0.2;
        bomb.velocity.y = Math.abs(bomb.velocity.y) * 0.32;
        bomb.velocity.x *= 0.72;
        bomb.velocity.z *= 0.72;
      }
      if (bomb.fuse <= 0) {
        explodeSauce(bomb.mesh.position.clone());
        removeObject(bomb.mesh);
        bombs.splice(i, 1);
      }
    }
  } function explodeSauce(position) {
    let killed = 0;
    for (const enemy of [...enemies]) {
      const distance = enemy.root.position.distanceTo(position);
      if (distance > 5.8) continue;
      const target = enemy.root.position.clone().add(new THREE.Vector3(0, 0.9 * TYPE_DATA[enemy.type].scale, 0));
      if (worldTrace(position, target).blocked) continue;
      const wasAlive = enemy.alive;
      damageEnemy(enemy, 82 * (1 - distance / 8), "sauce", {
        position: enemy.root.position,
        origin: position,
        direction: enemy.root.position.clone().sub(position).normalize()
      });
      if (wasAlive && !enemy.alive) killed += 1;
      enemy.impulse.add(enemy.root.position.clone().sub(position).normalize().multiplyScalar(6));
      enemy.impulse.y += 3.5;
    }
    stats.sauceKills += killed;
    const burstMaterial = new THREE.MeshBasicMaterial({ color: 0xd52a14, transparent: true, opacity: 0.68, depthWrite: false });
    const burst = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), burstMaterial);
    burst.position.copy(position);
    burst.scale.setScalar(0.25);
    scene.add(burst);
    effects.push({ object: burst, life: 0.45, maxLife: 0.45, kind: "burst" });
    call("audio", "sauceBomb", { intensity: 1.25, pan: 0 });
    call("splat", { x: 0.5, y: 0.56, intensity: 0.82, wetness: 1, sauce: 1, directionY: 0.8 });
  } function damageEnemy(enemy, rawAmount, cause, eventContext = {}) {
    if (!enemy?.alive) return false;
    const amount = Math.max(0, finite(rawAmount));
    enemy.health = Math.max(0, enemy.health - amount);
    const killed = enemy.health <= 0;
    stats.damageDone += amount;
    enemy.flashTimer = Math.max(enemy.flashTimer, cause === "headshot" ? 0.16 : 0.09);
    enemy.suppression = clamp(enemy.suppression + amount / Math.max(40, enemy.maxHealth * 0.42), 0, 1.5);
    const knockX = enemy.root.position.x - lastPlayer.x;
    const knockZ = enemy.root.position.z - lastPlayer.z;
    const knockLength = Math.max(0.001, Math.hypot(knockX, knockZ));
    enemy.impulse.x += knockX / knockLength * Math.min(2.8, amount * 0.038);
    enemy.impulse.z += knockZ / knockLength * Math.min(2.8, amount * 0.038);
    emitEvent("hit", {
      enemyId: enemy.id,
      enemyType: enemy.type,
      boss: Boolean(enemy.boss),
      cause: String(cause || "unknown"),
      amount,
      health: finite(enemy.health),
      maxHealth: finite(enemy.maxHealth),
      killed,
      headshot: cause === "headshot",
      position: eventContext.position || enemy.root.position,
      normal: eventContext.normal || null,
      origin: eventContext.origin || { x: lastPlayer.x, y: lastPlayer.y + lastPlayer.eyeHeight, z: lastPlayer.z },
      direction: eventContext.direction || null
    });
    if (enemy.health > 0) {
      const canStagger = !enemy.boss || cause === "sauce" || amount >= 34;
      if (canStagger && amount >= (enemy.type === "colossus" ? 26 : 16)) {
        enemy.staggerTimer = enemy.boss ? 0.1 : clamp(0.12 + amount * 0.004, 0.16, 0.34);
        if (enemy.telegraph) {
          enemy.telegraph.visible = false;
          enemy.telegraph.material.opacity = 0;
        }
        enemy.attackWindup = 0;
        setEnemyState(enemy, "stagger", enemy.staggerTimer);
      }
      return true;
    }
    enemy.alive = false;
    if (enemy.telegraph) enemy.telegraph.visible = false;
    stats.kills += 1;
    stats.score += Math.round(enemy.maxHealth * (cause === "punch" ? 24 : cause === "headshot" ? 18 : 12));
    const salvageOffer = finite(AMMO_SALVAGE[enemy.type], 6);
    const ammoSalvaged = Math.max(0, Math.min(salvageOffer, MAX_RESERVE - weapon.reserve));
    weapon.reserve += ammoSalvaged;
    stats.ammoSalvaged += ammoSalvaged;
    lastKill = { id: enemy.id, name: enemy.name, type: enemy.type, cause: String(cause || "unknown"), ammoSalvaged };
    emitEvent("kill", {
      enemyId: enemy.id,
      enemyType: enemy.type,
      enemyName: enemy.name,
      boss: Boolean(enemy.boss),
      cause: String(cause || "unknown"),
      ammoSalvaged,
      position: eventContext.position || enemy.root.position
    });
    if (enemy.boss) {
      const court = enemies.filter((entry) => entry !== enemy && entry.alive && entry.summoned);
      for (const summon of court) {
        summon.alive = false;
        if (summon.telegraph) summon.telegraph.visible = false;
        spawnPunchBurst(summon.root.position.clone().add(new THREE.Vector3(0, 0.9 * TYPE_DATA[summon.type].scale, 0)), true);
        emitEvent("courtDismissed", {
          enemyId: summon.id,
          enemyType: summon.type,
          position: summon.root.position
        });
        removeEnemy(summon);
      }
      const dismissedIds = new Set([enemy.id, ...court.map((summon) => summon.id)]);
      const clearedProjectiles = [];
      for (let index = projectiles.length - 1; index >= 0; index -= 1) {
        if (!dismissedIds.has(projectiles[index].owner)) continue;
        const [projectile] = projectiles.splice(index, 1);
        clearedProjectiles.push(projectile);
        removeObject(projectile.mesh);
      }
      emitEvent("bossDeath", {
        enemyId: enemy.id,
        cause: String(cause || "unknown"),
        courtDismissed: court.length,
        projectilesCleared: clearedProjectiles.length,
        position: eventContext.position || enemy.root.position
      });
    }
    if (opening.protected && enemy.id === opening.firstEnemyId) completeOpeningLesson("first-kill");
    spawnDeathNoodles(enemy, cause);
    call("audio", "enemyDeath", { intensity: enemy.boss ? 1.4 : 0.9, pan: 0 });
    removeEnemy(enemy);
    if (enemies.every((entry) => !entry.alive) && !wavesSuppressed && !opening.protected && pendingWaveSpawns.length === 0) {
      stats.wavesCleared = Math.max(stats.wavesCleared, waveIndex);
      waveTimer = enemy.boss ? 1.1 : 1.65;
    }
    return true;
  } function spawnDeathNoodles(enemy, cause = "bullet") {
    const punched = cause === "punch";
    const count = punched
      ? quality === "low" ? 20 : enemy.boss ? 46 : 34
      : quality === "low" ? 10 : enemy.boss ? 28 : 18;
    const blastX = enemy.root.position.x - lastPlayer.x;
    const blastZ = enemy.root.position.z - lastPlayer.z;
    const blastLength = Math.max(0.001, Math.hypot(blastX, blastZ));
    const forwardX = blastX / blastLength;
    const forwardZ = blastZ / blastLength;
    for (let i = 0; i < count; i += 1) {
      const mesh = new THREE.Mesh(
        i % 5 === 0
          ? new THREE.TorusKnotGeometry(0.1 + i % 3 * 0.025, 0.022, quality === "low" ? 24 : 38, 6, 2, 3)
          : new THREE.CylinderGeometry(0.021, 0.032, 0.46 + i % 4 * 0.13, quality === "low" ? 6 : 8),
        i % 4 === 0 ? materials.sauce : i % 3 === 0 ? materials.toasted : materials.noodle
      );
      mesh.position.copy(enemy.root.position).add(new THREE.Vector3(
        (i % 3 - 1) * (punched ? 0.16 : 0.12),
        0.5 + (i % 4) * (punched ? 0.24 : 0.2),
        ((i * 2) % 3 - 1) * (punched ? 0.14 : 0.1)
      ));
      mesh.rotation.z = i * 0.8;
      scene.add(mesh);
      const angle = i / count * Math.PI * 2;
      const radial = punched ? 3.7 + i % 4 * 0.72 : 2.2 + i % 2;
      const forward = punched ? 4.2 + i % 3 * 0.62 : 0;
      noodlePieces.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * radial + forwardX * forward,
          punched ? 4.5 + i % 5 * 1.05 : 2.8 + i % 4,
          Math.sin(angle) * (punched ? radial : 2.2 + i % 3) + forwardZ * forward
        ),
        life: (punched ? 4.7 : 4) + (i % 3) * 0.4
      });
    }
    const saucePool = new THREE.Mesh(
      new THREE.CircleGeometry(punched ? enemy.boss ? 1.7 : 1.05 : enemy.boss ? 1.25 : 0.62, quality === "low" ? 18 : 32),
      new THREE.MeshPhysicalMaterial({ color: 0x8d1009, roughness: 0.16, clearcoat: 0.9, transparent: true, opacity: 0.8, depthWrite: false })
    );
    saucePool.rotation.x = -Math.PI / 2;
    saucePool.position.copy(enemy.root.position);
    saucePool.position.y = surfaceY(saucePool.position.x, saucePool.position.z, saucePool.position.y) + 0.025;
    saucePool.scale.set(0.15, 0.15, 0.15);
    scene.add(saucePool);
    effects.push({ object: saucePool, life: punched ? 6.2 : 5.4, maxLife: punched ? 6.2 : 5.4, kind: "saucePool" });
  } function updateNoodlePieces(dt) {
    for (let i = noodlePieces.length - 1; i >= 0; i -= 1) {
      const piece = noodlePieces[i];
      piece.life -= dt;
      piece.velocity.y -= 13 * dt;
      piece.mesh.position.addScaledVector(piece.velocity, dt);
      piece.mesh.rotation.x += piece.velocity.z * dt * 2;
      piece.mesh.rotation.z += piece.velocity.x * dt * 2;
      const floor = surfaceY(piece.mesh.position.x, piece.mesh.position.z, lastPlayer.y);
      if (piece.mesh.position.y < floor + 0.05) {
        piece.mesh.position.y = floor + 0.05;
        if (Math.abs(piece.velocity.y) > 0.7) noodleCollisions += 1;
        piece.velocity.y = Math.abs(piece.velocity.y) * 0.3;
        piece.velocity.x *= 0.76;
        piece.velocity.z *= 0.76;
      }
      if (piece.life <= 0) {
        removeObject(piece.mesh);
        noodlePieces.splice(i, 1);
      }
    }
  } function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i -= 1) {
      const effect = effects[i];
      effect.life -= dt;
      const ratio = clamp(effect.life / effect.maxLife, 0, 1);
      if (effect.object.material) {
        const baseOpacity = effect.kind === "burst" ? 0.68 : effect.kind === "punchBurst" ? 0.9 : effect.kind === "saucePool" ? 0.78 : effect.kind === "bossPulse" ? 0.54 : 0.82;
        effect.object.material.opacity = ratio * baseOpacity;
      }
      if (effect.kind === "burst") effect.object.scale.setScalar(0.25 + (1 - ratio) * 5.8);
      if (effect.kind === "punchBurst") effect.object.scale.setScalar(0.18 + (1 - ratio) * 3.8);
      if (effect.kind === "bossPulse") effect.object.scale.setScalar(0.2 + (1 - ratio) * 4.8);
      if (effect.kind === "saucePool") effect.object.scale.setScalar(Math.min(1, 0.15 + (1 - ratio) * 4.2));
      if (effect.life <= 0) {
        removeObject(effect.object);
        effects.splice(i, 1);
      }
    }
  } function damagePlayer(rawAmount, source = "enemy", explicitOrigin = null, sourceMeta = null) {
    if (defeated || victory) return false;
    const incoming = Math.max(0, finite(rawAmount));
    if (incoming <= 0) return false;
    const absorbed = Math.min(player.sauceArmor, incoming * 0.62);
    player.sauceArmor = Math.max(0, player.sauceArmor - absorbed);
    player.armor = player.sauceArmor;
    const healthDamage = incoming - absorbed;
    player.health = Math.max(0, player.health - healthDamage);
    stats.damageTaken += incoming;
    const sourceToken = String(source || "enemy");
    const attacker = enemies.find((enemy) => enemy.alive && String(enemy.id) === sourceToken) || null;
    const damageOrigin = eventPoint(explicitOrigin, null) || eventPoint(attacker?.root?.position, null);
    const sourceKind = String(sourceMeta?.kind || (
      sourceToken === "rising-spaghetti" ? "hazard" :
        sourceToken === "debug" ? "debug" :
          attacker ? "enemy" : "system"
    ));
    const sourceId = sourceMeta?.id != null
      ? String(sourceMeta.id)
      : attacker?.id != null ? String(attacker.id) : null;
    const enemyType = sourceMeta?.enemyType || attacker?.type || null;
    emitEvent("playerDamage", {
      source: sourceToken,
      sourceKind,
      sourceId,
      enemyType: enemyType == null ? null : String(enemyType),
      projectile: sourceKind === "projectile",
      amount: incoming,
      absorbed,
      healthDamage,
      health: finite(player.health),
      sauceArmor: finite(player.sauceArmor),
      origin: damageOrigin,
      position: { x: lastPlayer.x, y: lastPlayer.y + lastPlayer.eyeHeight, z: lastPlayer.z }
    });
    call("damage", incoming, source);
    call("audio", sourceToken === "rising-spaghetti" ? "spaghettiBurn" : "playerHit", {
      intensity: clamp(incoming / 18, 0.4, 1.35),
      pan: 0
    });
    if (player.health <= 0) {
      cancelOpeningLesson("defeated");
      defeated = true;
      firing = false;
      weapon.firing = false;
      call("message", "YOU HAVE BEEN OVERCOOKED");
      call("defeat", source);
    }
    return true;
  } function damagePlayerFromEnemy(rawAmount, source, projectile = false, origin = null, enemyType = null) {
    if (combatGrace > 0) return false;
    // Melee attackers share one 0.42s i-frame so a swarm cannot chew the player
    // down in a single frame. Projectiles get their own shorter, still-bounded
    // gate (1 hit / 0.2s) so the boss's escalating spread volleys register as a
    // real burst instead of collapsing into a single hit.
    if (projectile) {
      if (enemyProjectileDamageCooldown > 0) return false;
      enemyProjectileDamageCooldown = 0.2;
    } else {
      if (enemyDamageCooldown > 0) return false;
      enemyDamageCooldown = 0.42;
    }
    return damagePlayer(rawAmount, source, origin, {
      kind: projectile ? "projectile" : "enemy",
      id: source,
      enemyType
    });
  } function removeEnemy(enemy) {
    const index = enemies.indexOf(enemy);
    if (index >= 0) enemies.splice(index, 1);
    removeObject(enemy.root);
    enemy.material?.dispose?.();
  } function removeObject(object) {
    object?.parent?.remove(object);
    object?.traverse?.((child) => {
      child.geometry?.dispose?.();
      if (child.material && !Object.values(materials).includes(child.material)) child.material.dispose?.();
    });
  } function clearEnemies(suppressWaves = true) {
    for (const enemy of [...enemies]) removeEnemy(enemy);
    for (const projectile of projectiles.splice(0)) removeObject(projectile.mesh);
    punchTargetId = null;
    punchTargetDistance = null;
    wavesSuppressed = Boolean(suppressWaves);
    waveTimer = 1.2;
    keepOutTelemetry.nearestHostileDistance = null;
    keepOutTelemetry.currentIntrusionDuration = 0;
    keepOutTelemetry.currentPeakIntrusion = 0;
    keepOutTelemetry.estimatedCentralHostileCoverage = 0;
    cancelOpeningLesson(suppressWaves ? "cleared" : "superseded");
    return true;
  } function aimAtEnemy(id = null) {
    const enemy = enemies.find((entry) => entry.alive && (id == null || String(entry.id) === String(id))) || null;
    if (!enemy) return null;
    const scale = TYPE_DATA[enemy.type].scale;
    return {
      id: enemy.id,
      type: enemy.type,
      position: { x: enemy.root.position.x, y: enemy.root.position.y + 1.58 * scale, z: enemy.root.position.z }
    };
  } function defeatEnemy(id, cause = "debug") {
    const enemy = enemies.find((entry) => entry.alive && String(entry.id) === String(id)) || null;
    if (!enemy) return false;
    return damageEnemy(enemy, enemy.health + 1, String(cause || "debug"), {
      position: enemy.root.position
    });
  } function forceWave(index = 1) {
    clearEnemies(false);
    victory = false;
    defeated = false;
    return startWave(clamp(Math.round(finite(index, 1)), 1, WAVE_DATA.length));
  } function win() {
    if (victory) return true;
    cancelOpeningLesson("victory");
    victory = true;
    firing = false;
    weapon.firing = false;
    call("message", "AL DENTE. THE BASILICA IS YOURS.");
    call("victory");
    emitEvent("victory", {
      score: finite(stats.score),
      kills: finite(stats.kills),
      elapsed: finite(elapsed),
      position: { x: lastPlayer.x, y: lastPlayer.y + lastPlayer.eyeHeight, z: lastPlayer.z }
    });
    return true;
  } function applyNoodleImpulse(targetOrImpulse, impulseOrX, yValue, zValue) {
    let targetId = null;
    let source = null;
    if (typeof targetOrImpulse === "string" || typeof targetOrImpulse === "number") {
      targetId = String(targetOrImpulse);
      source = impulseOrX && typeof impulseOrX === "object" ? impulseOrX : { x: impulseOrX, y: yValue, z: zValue };
    } else if (targetOrImpulse && typeof targetOrImpulse === "object") {
      targetId = targetOrImpulse.id ?? targetOrImpulse.enemyId ?? null;
      source = targetOrImpulse.impulse || targetOrImpulse;
    } else {
      source = { x: impulseOrX, y: yValue, z: zValue };
    }
    const impulse = new THREE.Vector3(finite(source?.x), finite(source?.y, 2), finite(source?.z));
    let affected = 0;
    for (const enemy of enemies) {
      if (targetId != null && String(enemy.id) !== String(targetId)) continue;
      enemy.impulse.add(impulse);
      affected += 1;
    }
    if (targetId == null) {
      for (const piece of noodlePieces) {
        piece.velocity.add(impulse);
        affected += 1;
      }
    }
    if (affected > 0) {
      noodleImpulses += 1;
      stats.noodleImpulses = noodleImpulses;
    }
    return affected > 0;
  } function setAmmo(ammo = weapon.ammo, reserve = weapon.reserve) {
    weapon.ammo = clamp(Math.floor(finite(ammo, weapon.ammo)), 0, weapon.magazineSize);
    weapon.reserve = clamp(Math.floor(finite(reserve, weapon.reserve)), 0, MAX_RESERVE);
    weapon.reloading = false;
    weapon.reloadProgress = 0;
    weapon.reloadMode = "idle";
    weapon.activeReloadDuration = 0;
    weapon.firing = false;
    reloadTimer = 0;
    reloadStage = 0;
    fireBufferTimer = 0;
    autoReloadTimer = 0;
    firing = false;
    triggerReleaseRequired = false;
    viewModel.gun.rotation.z = 0;
    return { ammo: weapon.ammo, reserve: weapon.reserve };
  } function reset() {
    clearEnemies(false);
    for (const bomb of bombs.splice(0)) removeObject(bomb.mesh);
    for (const piece of noodlePieces.splice(0)) removeObject(piece.mesh);
    for (const effect of effects.splice(0)) removeObject(effect.object);
    Object.assign(player, { health: 100, maxHealth: 100, sauceArmor: 50, armor: 50 });
    Object.assign(weapon, {
      ammo: 30, reserve: 180, reloading: false, reloadProgress: 0, firing: false,
      activeReloadDuration: 0, reloadMode: "idle"
    });
    Object.assign(stats, freshStats());
    Object.assign(keepOutTelemetry, freshKeepOutTelemetry());
    elapsed = 0;
    fireCooldown = 0;
    fireBufferTimer = 0;
    autoReloadTimer = 0;
    reloadTimer = 0;
    reloadStage = 0;
    bombCooldown = 0;
    punchCooldown = 0;
    punchTimer = 0;
    punchImpactPending = false;
    punchHitStop = 0;
    punchTargetId = null;
    punchTargetDistance = null;
    muzzleTimer = 0;
    recoil = 0;
    waveIndex = 0;
    waveTimer = 0.85;
    resetOpeningLesson();
    combatGrace = 0;
    enemyDamageCooldown = 0;
    enemyProjectileDamageCooldown = 0;
    squadThinkTimer = 0;
    wavesSuppressed = false;
    victory = false;
    defeated = false;
    firing = false;
    triggerReleaseRequired = false;
    aiming = false;
    aimProgress = 0;
    lastPlayerSpeed = 0;
    playerVelocity.set(0, 0, 0);
    lastKill = null;
    noodleCollisions = 0;
    noodleImpulses = 0;
    eventQueue.length = 0;
    eventSequence = 0;
    lastEvent = null;
    Object.assign(weaponTelemetry, {
      lastShotAt: -1,
      recentShotIntervalsMs: [],
      bufferedShots: 0,
      lowAmmoCueCount: 0,
      criticalAmmoCueCount: 0,
      emptyCueCount: 0,
      lastLowAmmoRound: null,
      autoReloads: 0,
      reloadStageEvents: 0
    });
    Object.assign(punchTelemetry, {
      lastResult: "idle",
      lastTargetId: null,
      lastDistance: null,
      lastExplosionPieces: 0,
      lastExplosionEnergy: 0,
      lastImpactAt: -1
    });
    errors.length = 0;
    viewModel.gun.rotation.z = 0;
    viewModel.gun.rotation.y = 0;
    viewModel.gun.position.set(0, 0, 0);
    for (const arm of viewModel.arms) {
      arm.position.set(0, 0, 0);
      arm.rotation.set(0, 0, 0);
      arm.scale.setScalar(1);
    }
    viewModel.root.position.set(HIP_POSITION.x, HIP_POSITION.y, HIP_POSITION.z);
    viewModel.root.rotation.set(0, 0, 0);
    viewModel.root.scale.setScalar(1);
    viewModel.muzzle.visible = false;
    restoreBaseCameraFov();
    return getState();
  } function enemyState(enemy) {
    const position = enemy.root.position;
    return {
      id: enemy.id, enemyId: enemy.id, type: enemy.type, name: enemy.name,
      health: Math.max(0, finite(enemy.health)), hp: Math.max(0, finite(enemy.health)),
      maxHealth: finite(enemy.maxHealth, 1), alive: Boolean(enemy.alive), stationary: Boolean(enemy.stationary),
      boss: Boolean(enemy.boss), summoned: Boolean(enemy.summoned), scale: finite(TYPE_DATA[enemy.type].scale, 1),
      position: { x: finite(position.x), y: finite(position.y), z: finite(position.z) },
      spawnPosition: {
        x: finite(enemy.spawnPosition?.x), y: finite(enemy.spawnPosition?.y), z: finite(enemy.spawnPosition?.z)
      },
      distanceToPlayer: finite(Math.hypot(position.x - lastPlayer.x, position.z - lastPlayer.z)),
      strandCount: finite(enemy.strands), state: String(enemy.state), mode: String(enemy.state), role: String(enemy.role),
      awareness: enemy.targetVisible ? 1 : clamp(enemy.memoryTimer / (enemy.boss ? 9 : 5.8), 0, 1),
      targetVisible: Boolean(enemy.targetVisible), inViewCone: Boolean(enemy.inViewCone),
      relativeYaw: finite(enemy.relativeYaw), relativePitch: finite(enemy.relativePitch),
      horizontalHalfFov: finite(enemy.horizontalHalfFov), verticalHalfFov: finite(enemy.verticalHalfFov),
      projectedCoverage: finite(enemy.projectedCoverage), centralCoverage: finite(enemy.centralCoverage),
      lastSeen: {
        x: finite(enemy.lastSeen.x), y: finite(enemy.lastSeen.y), z: finite(enemy.lastSeen.z)
      },
      coverIntent: Boolean(enemy.coverIntent), coverId: enemy.coverId == null ? null : String(enemy.coverId),
      coverScore: finite(enemy.coverScore), suppression: finite(enemy.suppression),
      grounded: Boolean(enemy.grounded), supportId: enemy.supportId == null ? null : String(enemy.supportId),
      groundY: finite(enemy.groundY), groundError: finite(position.y - (enemy.groundY + enemy.footClearance)),
      groundCorrections: finite(enemy.groundCorrections), spawnWave: finite(enemy.spawnWave), spawnSlot: finite(enemy.spawnSlot),
      goal: { x: finite(enemy.goal.x), y: finite(enemy.goal.y), z: finite(enemy.goal.z) },
      goalDistance: finite(Math.hypot(enemy.goal.x - position.x, enemy.goal.z - position.z)),
      actualSpeed: finite(enemy.actualSpeed), totalTravel: finite(enemy.totalTravel), unseenTimer: finite(enemy.unseenTimer),
      lastHostileTimer: finite(enemy.lastHostileTimer), pursuitMode: Boolean(enemy.pursuitMode),
      lastHostileFailedProgress: finite(enemy.lastHostileFailedProgress),
      lastHostileRelocated: Boolean(enemy.lastHostileRelocated),
      lastHostileRelocationAt: enemy.lastHostileRelocationAt == null ? null : finite(enemy.lastHostileRelocationAt),
      lastHostileFailedAtRelocation: enemy.lastHostileFailedAtRelocation == null
        ? null
        : finite(enemy.lastHostileFailedAtRelocation),
      keepOut: {
        minimumDistance: finite(enemy.keepOutDistance),
        intrusion: finite(enemy.keepOutIntrusion),
        intrusionDuration: finite(enemy.keepOutIntrusionTime),
        longestIntrusionDuration: finite(enemy.keepOutLongestIntrusion),
        peakIntrusion: finite(enemy.keepOutPeakIntrusion),
        forced: Boolean(enemy.keepOutForced),
        forcedFrames: finite(enemy.keepOutForcedFrames),
        forcedSeparations: finite(enemy.forcedSeparations)
      },
      stuckTimer: finite(enemy.stuckTimer), blockedTime: finite(enemy.blockedTime),
      navRouteId: enemy.navRouteId == null ? null : String(enemy.navRouteId),
      navIndex: finite(enemy.navIndex), navDirection: finite(enemy.navDirection),
      navWaypoint: enemy.navWaypoint ? { ...enemy.navWaypoint } : null,
      navigationRecoveries: finite(enemy.navigationRecoveries), navigationRelocations: finite(enemy.navigationRelocations),
      stateTransitions: finite(enemy.stateTransitions), shotsFired: finite(enemy.shotsFired), bossPhase: finite(enemy.bossPhase, 1)
    };
  } function physicsState() {
    const kineticEnergy = noodlePieces.reduce((sum, piece) => sum + piece.velocity.lengthSq() * 0.5, 0);
    return {
      noodleCount: viewModel.strands + noodlePieces.length + enemies.reduce((sum, enemy) => sum + enemy.strands, 0),
      strandCount: viewModel.strands + noodlePieces.length + enemies.reduce((sum, enemy) => sum + enemy.strands, 0),
      activePieces: noodlePieces.length, collisions: noodleCollisions, impulses: noodleImpulses,
      kineticEnergy: finite(kineticEnergy), gravity: 13, projectiles: projectiles.length, bombs: bombs.length
    };
  }

  const frameState = {
    player,
    weapon: {},
    stats,
    enemies: [],
    livingEnemies: 0,
    enemyCount: 0,
    wave: { index: 1, number: 1, total: WAVE_DATA.length },
    waveIndex: 1,
    boss: {},
    opening: {},
    melee: {},
    punch: {},
    health: player.health,
    sauceArmor: player.sauceArmor,
    armor: player.sauceArmor,
    ammo: weapon.ammo,
    reserve: weapon.reserve,
    reloading: weapon.reloading,
    firing: false,
    aiming: false,
    score: 0,
    victory: false,
    defeated: false,
    lastKill: null
  };
  const frameEnemyState = {
    id: "",
    name: "",
    type: "",
    boss: false,
    summoned: false,
    stationary: false,
    inViewCone: false,
    targetVisible: false,
    position: { x: 0, y: 0, z: 0 },
    relativeYaw: 0,
    relativePitch: 0,
    distanceToPlayer: 0,
    scale: 1
  };

  function getFrameState() {
    let livingCount = 0;
    let onlyEnemy = null;
    let bossEnemy = null;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      livingCount += 1;
      onlyEnemy = livingCount === 1 ? enemy : null;
      if (enemy.boss) bossEnemy = enemy;
    }

    frameState.player = player;
    Object.assign(frameState.weapon, {
      ammo: weapon.ammo,
      reserve: weapon.reserve,
      reloading: weapon.reloading,
      reloadMode: weapon.reloadMode,
      firing: Boolean(firing && !weapon.reloading),
      aiming: Boolean(aiming),
      spread: currentWeaponSpread(),
      bombCooldown: finite(bombCooldown),
      lowAmmoThreshold: weapon.lowAmmoThreshold
    });
    frameState.stats = stats;
    frameState.health = player.health;
    frameState.sauceArmor = player.sauceArmor;
    frameState.armor = player.sauceArmor;
    frameState.ammo = weapon.ammo;
    frameState.reserve = weapon.reserve;
    frameState.reloading = weapon.reloading;
    frameState.firing = Boolean(firing && !weapon.reloading);
    frameState.aiming = Boolean(aiming);
    frameState.score = stats.score;
    frameState.livingEnemies = livingCount;
    frameState.enemyCount = livingCount;
    frameState.wave.index = Math.max(1, waveIndex);
    frameState.wave.number = Math.max(1, waveIndex);
    frameState.waveIndex = Math.max(1, waveIndex);

    frameState.enemies.length = 0;
    if (onlyEnemy) {
      const position = onlyEnemy.root?.position || lastPlayer;
      Object.assign(frameEnemyState, {
        id: onlyEnemy.id,
        name: onlyEnemy.name,
        type: onlyEnemy.type,
        boss: Boolean(onlyEnemy.boss),
        summoned: Boolean(onlyEnemy.summoned),
        stationary: Boolean(onlyEnemy.stationary),
        inViewCone: Boolean(onlyEnemy.inViewCone),
        targetVisible: Boolean(onlyEnemy.targetVisible),
        relativeYaw: finite(onlyEnemy.relativeYaw),
        relativePitch: finite(onlyEnemy.relativePitch),
        distanceToPlayer: finite(Math.hypot(position.x - lastPlayer.x, position.z - lastPlayer.z)),
        scale: finite(TYPE_DATA[onlyEnemy.type]?.scale, 1)
      });
      frameEnemyState.position.x = finite(position.x);
      frameEnemyState.position.y = finite(position.y);
      frameEnemyState.position.z = finite(position.z);
      frameState.enemies.push(frameEnemyState);
    }

    Object.assign(frameState.boss, bossEnemy ? {
      active: true,
      alive: true,
      id: bossEnemy.id,
      name: bossEnemy.name,
      health: finite(bossEnemy.health),
      hp: finite(bossEnemy.health),
      maxHealth: finite(bossEnemy.maxHealth),
      maxHp: finite(bossEnemy.maxHealth),
      phase: finite(bossEnemy.bossPhase, 1),
      state: String(bossEnemy.state)
    } : {
      active: false,
      alive: false,
      id: "",
      name: "The Noodlemancer",
      health: 0,
      hp: 0,
      maxHealth: TYPE_DATA.noodlemancer.health,
      maxHp: TYPE_DATA.noodlemancer.health,
      phase: 1,
      state: "idle"
    });

    Object.assign(frameState.opening, {
      status: String(opening.status || "inactive"),
      active: Boolean(opening.active),
      protected: Boolean(opening.protected),
      pendingCount: pendingWaveSpawns.length,
      waveGatePending: Boolean(opening.protected || pendingWaveSpawns.length)
    });
    Object.assign(frameState.melee, {
      active: punchTimer > 0,
      ready: punchCooldown <= 0 && punchTimer <= 0 && !defeated && !victory,
      remaining: finite(punchCooldown),
      cooldown: finite(punchCooldown),
      cooldownDuration: PUNCH_COOLDOWN,
      cooldownMax: PUNCH_COOLDOWN,
      targetId: punchTargetId,
      inRange: punchTargetId != null
    });
    frameState.punch = frameState.melee;
    frameState.victory = Boolean(victory);
    frameState.defeated = Boolean(defeated);
    frameState.lastKill = lastKill;
    return frameState;
  }

  function getState() {
    const enemyStates = enemies.filter((enemy) => enemy.alive).map(enemyState);
    const bossEnemy = enemies.find((enemy) => enemy.alive && enemy.boss);
    const physics = physicsState();
    const boss = bossEnemy ? {
      active: true, alive: true, id: bossEnemy.id, name: bossEnemy.name,
      health: finite(bossEnemy.health), hp: finite(bossEnemy.health), maxHealth: finite(bossEnemy.maxHealth), maxHp: finite(bossEnemy.maxHealth),
      phase: finite(bossEnemy.bossPhase, 1), state: String(bossEnemy.state)
    } : { active: false, alive: false, id: "", name: "The Noodlemancer", health: 0, hp: 0, maxHealth: TYPE_DATA.noodlemancer.health, maxHp: TYPE_DATA.noodlemancer.health };
    const spread = currentWeaponSpread();
    const effectiveFov = THREE.MathUtils.radToDeg(2 * Math.atan(
      Math.tan(THREE.MathUtils.degToRad(finite(camera.fov, baseCameraFov)) * 0.5) / Math.max(0.01, finite(camera.zoom, baseCameraZoom))
    ));
    const effectiveHorizontalFov = THREE.MathUtils.radToDeg(2 * Math.atan(
      Math.tan(THREE.MathUtils.degToRad(effectiveFov) * 0.5) * clamp(finite(camera.aspect, 1), 0.25, 5)
    ));
    const melee = {
      active: punchTimer > 0,
      ready: punchCooldown <= 0 && punchTimer <= 0 && !defeated && !victory,
      cooldown: finite(punchCooldown),
      remaining: finite(punchCooldown),
      cooldownDuration: PUNCH_COOLDOWN,
      cooldownMax: PUNCH_COOLDOWN,
      animationDuration: PUNCH_DURATION,
      progress: punchTimer > 0 ? clamp(1 - punchTimer / PUNCH_DURATION, 0, 1) : 0,
      range: PUNCH_RANGE,
      targetId: punchTargetId,
      targetDistance: punchTargetDistance == null ? null : finite(punchTargetDistance),
      inRange: punchTargetId != null,
      held: false,
      hitStop: finite(punchHitStop),
      ...punchTelemetry
    };
    const openingElapsed = opening.startedAt == null
      ? 0
      : Math.max(0, (opening.completedAt ?? elapsed) - opening.startedAt);
    const pendingSpawns = pendingWaveSpawns.map((pending) => ({
      type: pending.type,
      spawnSlot: pending.spawnSlot,
      delay: pending.delay,
      releaseAt: pending.releaseAt,
      releaseIn: pending.releaseAt == null ? null : Math.max(0, pending.releaseAt - elapsed),
      position: { ...pending.position }
    }));
    const openingState = {
      ...opening,
      elapsed: finite(openingElapsed),
      timeout: OPENING_LESSON_TIMEOUT,
      timeoutBasis: "run-start",
      timeoutIn: opening.protected && opening.deadlineAt != null
        ? Math.max(0, opening.deadlineAt - elapsed)
        : 0,
      floodRampDuration: OPENING_FLOOD_RAMP,
      pendingCount: pendingSpawns.length,
      pendingSpawns,
      waveGatePending: Boolean(opening.protected || pendingSpawns.length)
    };
    return {
      player: { ...player },
      weapon: {
        ...weapon,
        firing: Boolean(firing && !weapon.reloading),
        aiming: Boolean(aiming), aimProgress: finite(aimProgress), spread,
        accuracy: clamp(1 - spread / 0.02, 0, 1), effectiveFov: finite(effectiveFov, baseCameraFov),
        cooldown: finite(fireCooldown), fireBuffer: finite(fireBufferTimer), autoReloadIn: finite(autoReloadTimer), bombCooldown: finite(bombCooldown),
        triggerReleaseRequired: Boolean(triggerReleaseRequired),
        emergencyAmmoAvailable: weapon.ammo <= 0 && weapon.reserve <= 0,
        telemetry: {
          ...weaponTelemetry,
          recentShotIntervalsMs: [...weaponTelemetry.recentShotIntervalsMs]
        }
      },
      health: player.health, sauceArmor: player.sauceArmor, armor: player.sauceArmor,
      ammo: weapon.ammo, reserve: weapon.reserve, reloading: weapon.reloading,
      firing: Boolean(firing && !weapon.reloading), aiming: Boolean(aiming), aimProgress: finite(aimProgress),
      effectiveFov: finite(effectiveFov, baseCameraFov),
      enemies: enemyStates, livingEnemies: enemyStates.length, enemyCount: enemyStates.length,
      wave: { index: Math.max(1, waveIndex), number: Math.max(1, waveIndex), total: WAVE_DATA.length },
      waveIndex: Math.max(1, waveIndex), boss, stats: { ...stats }, score: stats.score,
      opening: openingState,
      pendingWaveSpawns: pendingSpawns,
      melee: { ...melee }, punch: { ...melee },
      tactical: {
        transitions: finite(stats.tacticalTransitions), coverUses: finite(stats.coverUses), flanks: finite(stats.flanks),
        enemyShots: finite(stats.enemyShots), bossPhaseTransitions: finite(stats.bossPhaseTransitions)
      },
      keepOut: {
        ...keepOutTelemetry,
        nearestHostileDistance: keepOutTelemetry.nearestHostileDistance == null
          ? null
          : finite(keepOutTelemetry.nearestHostileDistance),
        minimumDistances: { ...KEEP_OUT_DISTANCE },
        punchRange: PUNCH_RANGE
      },
      viewCone: {
        verticalFov: finite(effectiveFov, baseCameraFov),
        horizontalFov: finite(effectiveHorizontalFov, effectiveFov),
        aspect: finite(camera.aspect, 1),
        zoom: finite(camera.zoom, baseCameraZoom),
        yaw: finite(lastPlayer.yaw),
        pitch: finite(lastPlayer.pitch)
      },
      noodlePhysics: physics, physics: { ...physics }, visibleStrands: physics.strandCount,
      events: {
        queued: eventQueue.length,
        sequence: eventSequence,
        last: lastEvent ? { ...lastEvent } : null
      },
      victory: Boolean(victory), defeated: Boolean(defeated), lastKill: lastKill ? { ...lastKill } : null,
      elapsed: finite(elapsed), combatGrace: finite(combatGrace), enemyDamageCooldown: finite(enemyDamageCooldown), errors: [...errors]
    };
  } function restoreBaseCameraFov() {
    camera.fov = baseCameraFov;
    camera.zoom = baseCameraZoom;
    camera.updateProjectionMatrix?.();
  } function dispose() {
    restoreBaseCameraFov();
    clearEnemies(true);
    for (const bomb of bombs.splice(0)) removeObject(bomb.mesh);
    for (const piece of noodlePieces.splice(0)) removeObject(piece.mesh);
    for (const effect of effects.splice(0)) removeObject(effect.object);
    camera.remove(viewModel.root);
    removeObject(viewModel.root);
    for (const material of Object.values(materials)) material.dispose?.();
  }
  const api = {
    update, reset, dispose, fire: shoot, punch, beginReload, throwSauceBomb, damagePlayer,
    spawnEnemy, clearEnemies, aimAtEnemy, defeatEnemy, forceWave, win, getState, getFrameState, inspect: getState, consumeEvents,
    applyNoodleImpulse, setAmmo, viewConeForPosition,
    getFloodScale: () => clamp(finite(opening.floodScale, 1), 0, 1),
    releaseOpeningLesson: (reason = "debug") => completeOpeningLesson(String(reason || "debug")),
    defeatOpeningLesson: (cause = "debug") => {
      const lesson = enemies.find((enemy) => enemy.alive && enemy.id === opening.firstEnemyId);
      return lesson ? damageEnemy(lesson, lesson.health + 1, String(cause || "debug")) : false;
    },
    expireOpeningLesson: () => completeOpeningLesson("timeout")
  };
  reset();
  return api;
}
