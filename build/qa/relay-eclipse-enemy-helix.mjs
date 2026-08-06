import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createStaticServer } from '../scripts/static-server.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);
const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));
assert.ok(executablePath, `System Chrome not found. Checked: ${chromeCandidates.join(', ')}`);

const server = await createStaticServer({ root: repoRoot, port: 0 });
const port = server.address().port;
const browser = await chromium.launch({
  executablePath,
  headless: false,
  args: [
    '--use-angle=d3d11',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ],
});

const pageErrors = [];
const consoleErrors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(`http://127.0.0.1:${port}/relay-eclipse/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__RE?.ready === true);

  const result = await page.evaluate(async () => {
    const THREE = await import('three');
    const { buildRelayStructure } = await import('./src/world/relay-structure.js');
    const { Enemy, EnemyManager } = await import('./src/enemies/enemy.js');
    const scene = new THREE.Scene();
    const textureLoader = { load: () => new THREE.Texture() };
    const relay = buildRelayStructure(scene, {
      center: new THREE.Vector3(0, 0, 0),
      baseY: 0,
      groundAt: () => -1000,
      textureLoader,
    });
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    const rendererInfo = gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer = rendererInfo
      ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)
      : gl?.getParameter(gl.RENDERER) || 'unavailable';
    const dt = 1 / 60;

    const noop = () => {};
    const fx = {
      addTrauma: noop,
      bloodBurst: noop,
      deathBurst: noop,
      impactLight: noop,
      shockwave: noop,
      debris: { emit: noop },
      smoke: { emit: noop },
      sparks: { emit: noop },
    };
    const audio = new Proxy({}, { get: () => noop });
    const world = {
      terrain: { height: () => -1000 },
      colliders: relay.colliders,
      playRadius: 80,
      relay,
      groundAt: relay.groundAt,
      spawnPoints: relay.spawnPoints,
      surfaceAt: () => null,
    };

    function seededRandom(seed) {
      let state = seed >>> 0;
      return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x100000000;
      };
    }

    function spawnPoint(tier) {
      const point = relay.spawnPoints.find((candidate) => candidate.tier === tier);
      if (!point) throw new Error(`Missing relay spawn point for tier ${tier}`);
      return point;
    }

    function makePursuit(type, direction, seed) {
      const targetTier = direction === 'up' ? 2 : 3;
      const startTier = direction === 'up' ? 1 : 4;
      const start = spawnPoint(startTier);
      const target = spawnPoint(targetTier);
      const player = {
        pos: new THREE.Vector3(target.x, target.y, target.z),
        radius: 0.4,
        damage: 0,
        damageEvents: 0,
        takeDamage(amount) { this.damage += amount; this.damageEvents++; },
      };
      const manager = new EnemyManager(scene, fx, audio, world, player);
      manager.wave = 1;
      let relocations = 0;
      const relocationEvents = [];
      let frames = 0;
      const originalRelocate = manager.relocate.bind(manager);
      manager.relocate = (enemy) => {
        const nav = relay.navigationAt(enemy.pos.x, enemy.pos.z, enemy.pos.y + 0.75);
        relocations++;
        relocationEvents.push({
          frame: frames,
          surface: nav?.kind || 'none',
          tier: nav?.tier ?? -1,
          x: enemy.pos.x,
          y: enemy.pos.y,
          z: enemy.pos.z,
          stallT: enemy._stallT || 0,
        });
        return originalRelocate(enemy);
      };

      const originalRandom = Math.random;
      Math.random = seededRandom(seed);
      let enemy;
      try {
        enemy = new Enemy(manager, type, new THREE.Vector3(start.x, start.y, start.z), 1, 1);
      } finally {
        Math.random = originalRandom;
      }
      enemy.spawnT = 1;
      enemy.group.scale.setScalar(1);
      manager.enemies.push(enemy);

      const bodyClearance = Math.max(0.16, enemy.def.radius * 0.62);
      const safeInner = relay.config.rampInnerRadius + bodyClearance;
      const safeOuter = relay.config.rampOuterRadius - bodyClearance;
      const physicalInner = relay.config.rampInnerRadius - 0.12;
      const physicalOuter = relay.config.rampOuterRadius + 0.12;
      const counts = {};
      let rampFrames = 0;
      let lowerArenaFrames = 0;
      let physicalRadiusViolations = 0;
      let unsafeRampFrames = 0;
      let consecutiveUnsafe = 0;
      let maxConsecutiveUnsafe = 0;
      let transitionUnsafeRampFrames = 0;
      let consecutiveTransitionUnsafe = 0;
      let maxConsecutiveTransitionUnsafe = 0;
      let minRadius = Infinity;
      let maxRadius = -Infinity;
      let minRampT = Infinity;
      let maxRampT = -Infinity;
      let lastRampT = null;
      let reverseDistance = 0;
      let maxReverseStep = 0;
      let meaningfulReverseSteps = 0;
      let minTier = Infinity;
      let maxTier = -Infinity;
      let maxStallT = 0;
      let corridorFrames = 0;
      let minEndpointDistance = Infinity;
      const checkpoints = [];
      const endpointAngle = relay.config.rampStartAngle + relay.config.rampTurns * Math.PI * 2;
      const endpointRadius = (relay.config.rampInnerRadius + relay.config.rampOuterRadius) * 0.5;
      const endpointX = relay.center.x + Math.cos(endpointAngle) * endpointRadius;
      const endpointZ = relay.center.z + Math.sin(endpointAngle) * endpointRadius;

      Math.random = seededRandom(seed ^ 0x9e3779b9);
      try {
        for (; frames < 3600; frames++) {
          manager.update(dt);
          const nav = relay.navigationAt(enemy.pos.x, enemy.pos.z, enemy.pos.y + 0.75);
          const kind = nav?.kind || 'none';
          counts[kind] = (counts[kind] || 0) + 1;
          if (kind === 'lower-arena') lowerArenaFrames++;
          if (nav && Number.isFinite(nav.tier)) {
            minTier = Math.min(minTier, nav.tier);
            maxTier = Math.max(maxTier, nav.tier);
          }
          if (relay.deckEntryCorridorAt(enemy.pos.x, enemy.pos.z)) corridorFrames++;
          minEndpointDistance = Math.min(minEndpointDistance, Math.hypot(enemy.pos.x - endpointX, enemy.pos.z - endpointZ));
          maxStallT = Math.max(maxStallT, enemy._stallT || 0);
          if (kind === 'spiral-ramp') {
            const ramp = relay.rampSurfaceAt(enemy.pos.x, enemy.pos.z, enemy.pos.y + 0.75);
            if (ramp) {
              rampFrames++;
              minRampT = Math.min(minRampT, ramp.t);
              maxRampT = Math.max(maxRampT, ramp.t);
              minRadius = Math.min(minRadius, ramp.radius);
              maxRadius = Math.max(maxRadius, ramp.radius);
              if (ramp.radius < physicalInner - 1e-5 || ramp.radius > physicalOuter + 1e-5) physicalRadiusViolations++;
              const unsafe = ramp.radius < safeInner - 1e-4 || ramp.radius > safeOuter + 1e-4;
              if (unsafe) {
                unsafeRampFrames++;
                consecutiveUnsafe++;
                maxConsecutiveUnsafe = Math.max(maxConsecutiveUnsafe, consecutiveUnsafe);
              } else {
                consecutiveUnsafe = 0;
              }
              if (unsafe && enemy._relayNeedsTransition) {
                transitionUnsafeRampFrames++;
                consecutiveTransitionUnsafe++;
                maxConsecutiveTransitionUnsafe = Math.max(maxConsecutiveTransitionUnsafe, consecutiveTransitionUnsafe);
              } else {
                consecutiveTransitionUnsafe = 0;
              }
              if (lastRampT !== null) {
                const reverse = direction === 'up' ? lastRampT - ramp.t : ramp.t - lastRampT;
                if (reverse > 0) {
                  reverseDistance += reverse;
                  maxReverseStep = Math.max(maxReverseStep, reverse);
                  if (reverse > 0.003) meaningfulReverseSteps++;
                }
              }
              lastRampT = ramp.t;
            }
          } else {
            consecutiveUnsafe = 0;
            consecutiveTransitionUnsafe = 0;
          }
          if (frames % 300 === 0) {
            checkpoints.push({
              frame: frames,
              surface: kind,
              tier: nav?.tier ?? -1,
              x: enemy.pos.x,
              y: enemy.pos.y,
              z: enemy.pos.z,
              radius: Math.hypot(enemy.pos.x - relay.center.x, enemy.pos.z - relay.center.z),
              endpointDistance: Math.hypot(enemy.pos.x - endpointX, enemy.pos.z - endpointZ),
              speed: Math.hypot(enemy.vel.x, enemy.vel.z),
              stallT: enemy._stallT || 0,
              chargeState: enemy._chgState,
              transition: enemy._relayNeedsTransition,
            });
          }
          if (player.damageEvents > 0) break;
        }
      } finally {
        Math.random = originalRandom;
      }

      const finalNav = relay.navigationAt(enemy.pos.x, enemy.pos.z, enemy.pos.y + 0.75);
      const horizontalDistance = Math.hypot(player.pos.x - enemy.pos.x, player.pos.z - enemy.pos.z);
      const verticalDistance = Math.abs(player.pos.y - enemy.pos.y);
      const report = {
        type,
        direction,
        seed,
        frames: frames + 1,
        seconds: (frames + 1) * dt,
        counts,
        rampFrames,
        lowerArenaFrames,
        physicalRadiusViolations,
        unsafeRampFrames,
        maxConsecutiveUnsafe,
        transitionUnsafeRampFrames,
        maxConsecutiveTransitionUnsafe,
        safeRadius: [safeInner, safeOuter],
        observedRadius: [minRadius, maxRadius],
        rampT: [minRampT, maxRampT],
        reverseDistance,
        maxReverseStep,
        meaningfulReverseSteps,
        tierRange: [minTier, maxTier],
        targetTier,
        finalSurface: finalNav?.kind || 'none',
        finalTier: finalNav?.tier ?? -1,
        horizontalDistance,
        verticalDistance,
        damageEvents: player.damageEvents,
        damage: player.damage,
        relocations,
        relocationEvents,
        maxStallT,
        corridorFrames,
        minEndpointDistance,
        checkpoints,
      };
      manager.reset();
      return report;
    }

    function makeForcedStall(type, direction, seed) {
      const targetTier = direction === 'up' ? 2 : 3;
      const startTier = direction === 'up' ? 1 : 4;
      const start = spawnPoint(startTier);
      const target = spawnPoint(targetTier);
      const player = {
        pos: new THREE.Vector3(target.x, target.y, target.z),
        radius: 0.4,
        damageEvents: 0,
        takeDamage() { this.damageEvents++; },
      };
      const manager = new EnemyManager(scene, fx, audio, world, player);
      manager.wave = 1;
      const relocationFrames = [];
      let frame = 0;
      const originalRelocate = manager.relocate.bind(manager);
      manager.relocate = (enemy) => { relocationFrames.push(frame); return originalRelocate(enemy); };
      const originalRandom = Math.random;
      Math.random = seededRandom(seed);
      let enemy;
      try {
        enemy = new Enemy(manager, type, new THREE.Vector3(start.x, start.y, start.z), 1, 1);
      } finally {
        Math.random = originalRandom;
      }
      enemy.spawnT = 1;
      enemy.speed = 0;
      enemy.vel.set(0, 0, 0);
      // This case isolates the stall watchdog. Natural pursuit cases above retain
      // the juggernaut's full charge behavior and catch motion-induced resets.
      enemy._chgCd = Infinity;
      enemy._chgState = 0;
      enemy.group.scale.setScalar(1);
      manager.enemies.push(enemy);
      const initialPdist = Math.hypot(player.pos.x - enemy.pos.x, player.pos.z - enemy.pos.z);
      let transitionFrames = 0;
      let maxStallT = 0;
      Math.random = seededRandom(seed ^ 0x85ebca6b);
      try {
        for (frame = 0; frame < 630; frame++) {
          manager.update(dt);
          if (enemy._relayNeedsTransition) transitionFrames++;
          maxStallT = Math.max(maxStallT, enemy._stallT || 0);
        }
      } finally {
        Math.random = originalRandom;
      }
      const finalNav = relay.navigationAt(enemy.pos.x, enemy.pos.z, enemy.pos.y + 0.75);
      const report = {
        type,
        direction,
        seed,
        initialPdist,
        transitionFrames,
        relocationFrames,
        maxStallT,
        finalSurface: finalNav?.kind || 'none',
        finalTier: finalNav?.tier ?? -1,
        targetTier,
      };
      manager.reset();
      return report;
    }

    function makeRelayToCaveTransition() {
      const start = spawnPoint(1);
      const target = spawnPoint(2);
      const entrance = { x: -36, z: 22 };
      const caveWorld = {
        ...world,
        entrances: [entrance],
        isUnder: (_x, _z, y) => y < -5,
      };
      const player = {
        pos: new THREE.Vector3(target.x, target.y, target.z),
        radius: 0.4,
        takeDamage: noop,
      };
      const manager = new EnemyManager(scene, fx, audio, caveWorld, player);
      manager.wave = 1;
      manager.playerUnder = false;
      manager.playerRelayNav = relay.navigationAt(player.pos.x, player.pos.z, player.pos.y + 0.75);
      manager.playerRampT = manager.playerRelayNav?.kind === 'spiral-ramp'
        ? relay.rampSurfaceAt(player.pos.x, player.pos.z, player.pos.y + 0.75)?.t ?? -1
        : -1;

      const enemy = new Enemy(manager, 'husk', new THREE.Vector3(start.x, start.y, start.z), 1, 1);
      enemy.spawnT = 1;
      enemy.group.scale.setScalar(1);
      manager.enemies.push(enemy);

      const relayTarget = enemy._seekPos(player);
      const relayState = {
        target: { x: relayTarget.x, z: relayTarget.z },
        onRamp: enemy._relayOnRamp,
        needsTransition: enemy._relayNeedsTransition,
      };

      player.pos.set(entrance.x * 0.5, -13, entrance.z * 0.5);
      manager.playerUnder = true;
      manager.playerRelayNav = null;
      manager.playerRampT = -1;
      const caveTarget = enemy._seekPos(player);
      const caveState = {
        target: { x: caveTarget.x, z: caveTarget.z },
        onRamp: enemy._relayOnRamp,
        needsTransition: enemy._relayNeedsTransition,
        radialClampWouldRun: enemy._relayOnRamp && enemy._relayNeedsTransition && !enemy.def.flyer,
      };

      manager.reset();
      return { relayState, caveState, entrance };
    }

    const pursuits = [
      makePursuit('husk', 'up', 0x11a1),
      makePursuit('juggernaut', 'up', 0x22b2),
      makePursuit('husk', 'down', 0x33c3),
      makePursuit('juggernaut', 'down', 0x44d4),
    ];
    const forcedStalls = [
      makeForcedStall('husk', 'up', 0x55e5),
      makeForcedStall('juggernaut', 'down', 0x66f6),
    ];
    const relayToCave = makeRelayToCaveTransition();
    relay.dispose();
    return { renderer, pursuits, forcedStalls, relayToCave };
  });

  let assertionsPassed = false;
  try {
    assert.doesNotMatch(result.renderer, /SwiftShader|software/i, `Hardware renderer required; got ${result.renderer}`);
    assert.match(result.renderer, /Direct3D11|D3D11/i, `D3D11 renderer required; got ${result.renderer}`);
    for (const run of result.pursuits) {
      const label = `${run.type} ${run.direction}`;
      assert.ok(run.rampFrames > 0, `${label}: enemy never entered the spiral ramp`);
      assert.equal(run.lowerArenaFrames, 0, `${label}: enemy fell to the lower arena`);
      assert.equal(run.physicalRadiusViolations, 0, `${label}: enemy left the physical ramp strip`);
      assert.ok(run.maxConsecutiveTransitionUnsafe <= 1, `${label}: radial recovery left enemy outside its body-safe strip for ${run.maxConsecutiveTransitionUnsafe} active-transition frames`);
      assert.equal(run.meaningfulReverseSteps, 0, `${label}: ramp progress reversed by up to ${run.maxReverseStep}`);
      assert.ok(run.reverseDistance < 0.06, `${label}: accumulated ${run.reverseDistance} reverse ramp progress`);
      if (run.direction === 'up') {
        assert.ok(run.rampT[0] < 0.28 && run.rampT[1] > 0.47, `${label}: insufficient upward ramp progress ${run.rampT}`);
      } else {
        assert.ok(run.rampT[1] > 0.97 && run.rampT[0] < 0.79, `${label}: insufficient downward ramp progress ${run.rampT}`);
      }
      assert.equal(run.relocations, 0, `${label}: normal pursuit required watchdog relocation`);
      assert.equal(run.damageEvents > 0, true, `${label}: enemy never reached attack range`);
      assert.equal(run.finalTier, run.targetTier, `${label}: attacked from wrong relay tier ${run.finalTier}`);
      assert.ok(run.horizontalDistance <= 2.4, `${label}: attack was not horizontally reachable (${run.horizontalDistance} m)`);
      assert.ok(run.verticalDistance <= 2.4, `${label}: attack was not vertically reachable (${run.verticalDistance} m)`);
      assert.ok(run.maxStallT < 9, `${label}: normal pursuit reached watchdog stall threshold`);
    }
    for (const run of result.forcedStalls) {
      const label = `${run.type} forced ${run.direction} stall`;
      assert.ok(run.initialPdist < 22, `${label}: setup did not exercise the old close-range relocation exemption`);
      assert.ok(run.transitionFrames > 0, `${label}: transition intent was never set`);
      assert.equal(run.relocationFrames.length, 1, `${label}: expected exactly one transition-aware relocation`);
      assert.ok(run.relocationFrames[0] >= 539 && run.relocationFrames[0] <= 550, `${label}: relocation fired outside the 9 s watchdog window at frame ${run.relocationFrames[0]}`);
      assert.equal(run.finalTier, run.targetTier, `${label}: relocation did not recover onto target tier`);
    }
    assert.equal(result.relayToCave.relayState.needsTransition, true, 'Relay-to-cave setup never established helix transition intent');
    assert.equal(result.relayToCave.caveState.onRamp, false, 'Cave pursuit inherited stale relay ramp state');
    assert.equal(result.relayToCave.caveState.needsTransition, false, 'Cave pursuit inherited stale relay transition intent');
    assert.equal(result.relayToCave.caveState.radialClampWouldRun, false, 'Cave pursuit would incorrectly run the relay radial clamp');
    assert.deepEqual(result.relayToCave.caveState.target, result.relayToCave.entrance, 'Surface walker did not switch its target to the cave entrance');
    assert.deepEqual(pageErrors, [], 'Browser page errors were emitted');
    assert.deepEqual(consoleErrors, [], 'Browser console errors were emitted');
    assertionsPassed = true;
  } finally {
    // Emit the full deterministic trajectories on both success and failure.
    console.log(JSON.stringify({ pass: assertionsPassed, ...result, pageErrors, consoleErrors }, null, 2));
  }
} finally {
  await browser.close();
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
}
