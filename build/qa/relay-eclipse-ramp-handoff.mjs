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
    const { Controller } = await import('./src/player/controller.js');
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
    const TAU = Math.PI * 2;
    const middleRadius = (relay.config.rampInnerRadius + relay.config.rampOuterRadius) * 0.5;
    const input = {
      moveAxis: () => ({ x: 0, z: 1 }),
      isDown: () => false,
      wasPressed: () => false,
    };

    function pointAt(t, radius = middleRadius) {
      const theta = relay.config.rampStartAngle + relay.config.rampTurns * TAU * t;
      const sample = relay.rampSurfaceAt(Math.cos(theta) * radius, Math.sin(theta) * radius, Infinity);
      return { x: Math.cos(theta) * radius, y: sample.y, z: Math.sin(theta) * radius, theta };
    }

    function makeController(point) {
      const controller = new Controller({ height: () => -1000 }, relay.colliders, 100, relay.platforms);
      controller.groundFn = relay.groundAt;
      controller.railConstraintFn = relay.resolveRampRail;
      controller.pos.set(point.x, point.y, point.z);
      controller.vel.set(0, 0, 0);
      controller.onGround = true;
      return controller;
    }

    function steeringYaw(controller, direction) {
      const x = controller.pos.x - relay.center.x;
      const z = controller.pos.z - relay.center.z;
      const radius = Math.hypot(x, z);
      const nx = x / radius;
      const nz = z / radius;
      const tangentX = direction > 0 ? -nz : nz;
      const tangentZ = direction > 0 ? nx : -nx;
      const radialCorrection = (middleRadius - radius) * 0.8;
      const dirX = tangentX + nx * radialCorrection;
      const dirZ = tangentZ + nz * radialCorrection;
      return Math.atan2(-dirX, -dirZ);
    }

    function simulateAscent(dt) {
      const controller = makeController(pointAt(0.9));
      const counts = {};
      let lastRampT = null;
      let minRampT = Infinity;
      let maxRampT = -Infinity;
      let maxVerticalStep = 0;
      let monotonicViolations = 0;
      let reachedDeck = false;
      let frames = 0;
      for (; frames < 900; frames++) {
        const beforeY = controller.pos.y;
        controller.update(dt, input, steeringYaw(controller, 1));
        maxVerticalStep = Math.max(maxVerticalStep, Math.abs(controller.pos.y - beforeY));
        const surface = relay.relaySurfaceAt(controller.pos.x, controller.pos.z, controller.pos.y + 0.25);
        const kind = surface?.kind || 'none';
        counts[kind] = (counts[kind] || 0) + 1;
        if (kind === 'spiral-ramp') {
          const sample = relay.rampSurfaceAt(controller.pos.x, controller.pos.z, controller.pos.y + 0.25);
          if (sample) {
            if (lastRampT !== null && sample.t + 1e-6 < lastRampT) monotonicViolations++;
            lastRampT = sample.t;
            minRampT = Math.min(minRampT, sample.t);
            maxRampT = Math.max(maxRampT, sample.t);
          }
        } else if (kind === 'moon-deck' && maxRampT > 0.99) {
          reachedDeck = true;
          break;
        }
      }
      return { frames: frames + 1, counts, minRampT, maxRampT, maxVerticalStep, monotonicViolations, reachedDeck };
    }

    function simulateDescent(dt) {
      const endAngle = relay.config.rampStartAngle + relay.config.rampTurns * TAU;
      const startAngle = endAngle + 0.08;
      const controller = makeController({
        x: Math.cos(startAngle) * middleRadius,
        y: relay.metrics.deckY,
        z: Math.sin(startAngle) * middleRadius,
      });
      const counts = {};
      let lastRampT = null;
      let minRampT = Infinity;
      let maxRampT = -Infinity;
      let maxVerticalStep = 0;
      let monotonicViolations = 0;
      let enteredRamp = false;
      let descended = false;
      let frames = 0;
      for (; frames < 900; frames++) {
        const beforeY = controller.pos.y;
        controller.update(dt, input, steeringYaw(controller, -1));
        maxVerticalStep = Math.max(maxVerticalStep, Math.abs(controller.pos.y - beforeY));
        const surface = relay.relaySurfaceAt(controller.pos.x, controller.pos.z, controller.pos.y + 0.25);
        const kind = surface?.kind || 'none';
        counts[kind] = (counts[kind] || 0) + 1;
        if (kind === 'spiral-ramp') {
          const sample = relay.rampSurfaceAt(controller.pos.x, controller.pos.z, controller.pos.y + 0.25);
          if (sample) {
            enteredRamp = true;
            if (lastRampT !== null && sample.t - 1e-6 > lastRampT) monotonicViolations++;
            lastRampT = sample.t;
            minRampT = Math.min(minRampT, sample.t);
            maxRampT = Math.max(maxRampT, sample.t);
            if (sample.t <= 0.9) {
              descended = true;
              break;
            }
          }
        }
      }
      return { frames: frames + 1, counts, minRampT, maxRampT, maxVerticalStep, monotonicViolations, enteredRamp, descended };
    }

    function meshHitsAt(x, z) {
      relay.meshes.moonDeck.updateMatrixWorld(true);
      const ray = new THREE.Raycaster(new THREE.Vector3(x, relay.metrics.deckY + 5, z), new THREE.Vector3(0, -1, 0));
      return ray.intersectObject(relay.meshes.moonDeck, false).length;
    }

    function probeRailAt(t, footLift = 0.03) {
      const theta = relay.config.rampStartAngle + relay.config.rampTurns * TAU * t;
      const nx = Math.cos(theta);
      const nz = Math.sin(theta);
      const railRadius = relay.config.rampOuterRadius - 0.08;
      const fromRadius = railRadius - 0.8;
      const toRadius = railRadius + 0.8;
      // One world-space angle crosses several helix turns. Derive the intended
      // turn's height from t instead of asking an infinite-height probe, which
      // would select the uppermost overlapping turn and test the wrong rail.
      const rampY = THREE.MathUtils.lerp(
        relay.config.lowerFloorY + 0.03,
        relay.config.deckY + 0.035,
        t,
      );
      const footY = rampY + footLift;
      const position = new THREE.Vector3(nx * toRadius, footY, nz * toRadius);
      const velocity = new THREE.Vector3(nx * (toRadius - fromRadius), 0, nz * (toRadius - fromRadius));
      const collided = relay.resolveRampRail(
        nx * fromRadius,
        nz * fromRadius,
        position,
        velocity,
        0.4,
        1.8,
        footY,
      );
      return {
        t,
        footLift,
        collided,
        resolvedRadius: Math.hypot(position.x, position.z),
        radialVelocity: velocity.x * nx + velocity.z * nz,
      };
    }

    const corridorT = (relay.metrics.deckEntryStartT + 1) * 0.5;
    const corridorPoint = pointAt(corridorT);
    const outsideTheta = relay.config.rampStartAngle + relay.config.rampTurns * TAU + 0.2;
    const outsidePoint = { x: Math.cos(outsideTheta) * middleRadius, z: Math.sin(outsideTheta) * middleRadius };
    const corridorProbe = relay.deckEntryCorridorAt(corridorPoint.x, corridorPoint.z);
    const geometry = {
      corridorRayHits: meshHitsAt(corridorPoint.x, corridorPoint.z),
      outsideRayHits: meshHitsAt(outsidePoint.x, outsidePoint.z),
    };
    const rail = {
      solid: [0.12, 0.38, 0.68, 0.92].map((t) => probeRailAt(t)),
      doorways: relay.railGaps.map((gap) => probeRailAt((gap.fromT + gap.toT) * 0.5)),
      clearedByJump: probeRailAt(0.38, 1.3),
    };
    const runs = [30, 60, 120].map((hz) => ({
      hz,
      ascent: simulateAscent(1 / hz),
      descent: simulateDescent(1 / hz),
    }));
    relay.dispose();
    return {
      renderer,
      metrics: {
        deckEntryStartT: relay.metrics.deckEntryStartT,
        deckEntryArcDegrees: relay.metrics.deckEntryArcDegrees,
        deckEntryHeadroom: relay.metrics.deckEntryHeadroom,
      },
      corridorProbe,
      geometry,
      rail,
      runs,
    };
  });

  assert.doesNotMatch(result.renderer, /SwiftShader|software/i, `Hardware renderer required; got ${result.renderer}`);
  assert.match(result.renderer, /Direct3D11|D3D11/i, `D3D11 renderer required; got ${result.renderer}`);
  assert.ok(result.corridorProbe, 'Deck-entry corridor probe did not recognize its own midpoint');
  assert.equal(result.geometry.corridorRayHits, 0, 'Visible deck still covers the ramp corridor');
  assert.ok(result.geometry.outsideRayHits > 0, 'Deck geometry is missing outside the corridor');
  for (const probe of result.rail.solid) {
    assert.equal(probe.collided, true, `Standing player crossed visible ramp rail at t=${probe.t}`);
    assert.ok(Math.abs(probe.radialVelocity) <= 1e-6, `Rail did not cancel outward velocity at t=${probe.t}`);
  }
  for (const probe of result.rail.doorways) {
    assert.equal(probe.collided, false, `Authored rail doorway blocked the player at t=${probe.t}`);
  }
  assert.equal(result.rail.clearedByJump.collided, false, 'Player above the visible handrail was blocked by an invisible wall');
  for (const run of result.runs) {
    assert.equal(run.ascent.reachedDeck, true, `${run.hz} Hz controller did not ascend from the ramp onto the moon deck`);
    assert.equal(run.ascent.monotonicViolations, 0, `${run.hz} Hz ramp t reversed during ascent`);
    assert.ok(run.ascent.maxRampT > 0.99, `${run.hz} Hz ascent left ramp too early at t=${run.ascent.maxRampT}`);
    assert.ok(run.ascent.maxVerticalStep <= 0.25, `${run.hz} Hz ascent snapped ${run.ascent.maxVerticalStep} m vertically`);
    assert.equal(run.descent.enteredRamp, true, `${run.hz} Hz controller could not enter the ramp from the moon deck`);
    assert.equal(run.descent.descended, true, `${run.hz} Hz controller did not descend past ramp t=0.9`);
    assert.equal(run.descent.monotonicViolations, 0, `${run.hz} Hz ramp t reversed during descent`);
    assert.ok(run.descent.maxRampT > 0.99, `${run.hz} Hz descent joined ramp too late at t=${run.descent.maxRampT}`);
    assert.ok(run.descent.maxVerticalStep <= 0.25, `${run.hz} Hz descent snapped ${run.descent.maxVerticalStep} m vertically`);
  }
  assert.deepEqual(pageErrors, [], 'Browser page errors were emitted');
  assert.deepEqual(consoleErrors, [], 'Browser console errors were emitted');

  console.log(JSON.stringify({ pass: true, ...result, pageErrors, consoleErrors }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
}
