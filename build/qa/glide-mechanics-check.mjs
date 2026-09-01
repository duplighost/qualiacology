// GLIDE mechanics acceptance check.
//
// This deliberately drives physical keyboard events through Playwright. Direct
// calls to Player._tryGrabTree() are not sufficient: an older GLIDE regression
// passed helper assertions while the real ground/update loop still blocked tree
// grabs. The fixtures below only establish deterministic world positions; C,
// W, Ctrl, F, browser chords, climbing, and detachment all travel through the
// page's live input and animation-frame loops.
//
// Usage:
//   node build/qa/glide-mechanics-check.mjs [url] [optional-output-directory]
//
// Examples:
//   node build/qa/glide-mechanics-check.mjs http://127.0.0.1:4177/glide/
//   node build/qa/glide-mechanics-check.mjs http://127.0.0.1:4177/glide/ work/glide-qa

import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("../node_modules/playwright");

const requestedUrl = process.argv[2] || "http://127.0.0.1:4177/glide/";
const outputDirectory = process.argv[3] ? path.resolve(process.argv[3]) : "";
const target = new URL(requestedUrl);
// The default-spawn contract is intentionally the ordinary, hashless route.
target.hash = "";

if (outputDirectory) await mkdir(outputDirectory, { recursive: true });

const report = {
  target: target.href,
  startedAt: new Date().toISOString(),
  outputDirectory: outputDirectory || null,
  checks: [],
  phases: {},
  artifacts: {},
  browserErrors: [],
  badResponses: [],
};
const failures = [];

const check = (condition, message, details = undefined) => {
  const passed = Boolean(condition);
  report.checks.push({ passed, message, ...(details === undefined ? {} : { details }) });
  console.log(`${passed ? "PASS" : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
  return passed;
};

const finite = (value) => Number.isFinite(value);
const round = (value, digits = 3) => finite(value) ? Number(value.toFixed(digits)) : value;
const distance3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const summarizeTrace = (trace) => {
  const progress = trace.map((sample) => sample.progress);
  let minimumProgressStep = Infinity;
  for (let index = 1; index < progress.length; index += 1) {
    minimumProgressStep = Math.min(minimumProgressStep, progress[index] - progress[index - 1]);
  }
  return {
    frames: trace.length,
    states: [...new Set(trace.map((sample) => sample.state))],
    targetGrabbed: trace.some((sample) => sample.attachedTarget),
    anyClimbReference: trace.some((sample) => sample.hasClimbReference),
    maximumVy: trace.length ? Math.max(...trace.map((sample) => sample.vy)) : null,
    minimumVy: trace.length ? Math.min(...trace.map((sample) => sample.vy)) : null,
    maximumHorizontalSpeed: trace.length ? Math.max(...trace.map((sample) => sample.horizontalSpeed)) : null,
    maximumProgress: progress.length ? Math.max(...progress) : null,
    minimumProgressStep: finite(minimumProgressStep) ? minimumProgressStep : null,
    closestTargetDistance: trace.length ? Math.min(...trace.map((sample) => sample.targetDistance)) : null,
    first: trace[0] || null,
    last: trace.at(-1) || null,
  };
};

let browser;
let context;
let page;

const capture = async (name) => {
  if (!outputDirectory || !page || page.isClosed()) return null;
  const destination = path.join(outputDirectory, name);
  await page.screenshot({ path: destination, type: "png", animations: "allow" });
  report.artifacts[name] = destination;
  return destination;
};

const waitFrames = (count) => page.evaluate((frameCount) => new Promise((resolve) => {
  let remaining = frameCount;
  const frame = () => {
    remaining -= 1;
    if (remaining <= 0) resolve();
    else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}), count);

const releaseGameplayKeys = async () => {
  if (!page || page.isClosed()) return;
  for (const key of ["KeyW", "KeyC", "KeyF", "Space", "Control", "ControlRight"]) {
    try { await page.keyboard.up(key); } catch {}
  }
};

try {
  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--enable-gpu-rasterization",
      "--use-angle=d3d11",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--mute-audio",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  page = await context.newPage();

  const sameOrigin = target.origin;
  page.on("pageerror", (error) => report.browserErrors.push(`pageerror: ${error?.message || error}`));
  page.on("console", (message) => {
    if (message.type() === "error") report.browserErrors.push(`console.error: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    report.browserErrors.push(`requestfailed: ${request.url()} (${request.failure()?.errorText || "unknown"})`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().startsWith(sameOrigin)) {
      report.badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => (
    window.__GAME?.player
    && window.__GAME?.world
    && window.__GAME?.__worldExpansion
    && document.documentElement.dataset.glideReady === "1"
  ), null, { timeout: 120_000, polling: "raf" });
  await page.waitForFunction(() => (
    document.documentElement.dataset.glideTitle === "ready"
    && document.querySelector("#veil")?.classList.contains("title-ready")
    && !document.querySelector("#veil")?.classList.contains("title-entered")
  ), null, { timeout: 5_000, polling: "raf" });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => {
    const veil = document.querySelector("#veil");
    return document.documentElement.dataset.glideTitle === "entered"
      && veil?.classList.contains("title-entered")
      && Number.parseFloat(getComputedStyle(veil).opacity || "1") <= 0.05;
  }, null, { timeout: 5_000, polling: "raf" });

  // Install a small, read-only QA bridge. It owns deterministic fixtures and
  // observation only; every behavior under test still comes from real keys.
  await page.evaluate(() => {
    const game = window.__GAME;
    const player = game.player;
    const rootData = document.documentElement.dataset;

    const api = {
      game,
      tree: null,
      segment: null,
      approach: null,
      climbFixture: null,
      trace: null,
      keyAudit: [],
      airOrigin: { x: player.position.x, z: player.position.z },
    };

    const clearHeldFlags = () => {
      if (game.__clearDropSources) game.__clearDropSources();
      else {
        game.__dropHeld = false;
        game.__diveHeld = false;
        rootData.glideDropHeld = "0";
        rootData.glideDiveHeld = "0";
        rootData.glideGroundLock = "0";
      }
    };

    const clearInput = () => {
      game.input?.keys?.clear?.();
      game.input?.move?.set?.(0, 0);
      if (game.input) {
        game.input.action = false;
        game.input._actionEdge = false;
        game.input.sprint = false;
      }
      game.__manualLaunchRequested = false;
      clearHeldFlags();
    };

    api.snapshot = () => {
      const biome = game.biomeAt(player.position.x, player.position.z);
      return {
        patch: game.__glideMotionPatchVersion || null,
        state: player.state,
        position: player.position.toArray(),
        visualPosition: game.squirrel.group.position.toArray(),
        velocity: player.velocity.toArray(),
        horizontalSpeed: Math.hypot(player.velocity.x || 0, player.velocity.z || 0),
        speed: player.velocity.length(),
        ground: biome.ground,
        groundClearance: player.position.y - (biome.ground + 0.28),
        climbSegmentKind: player.climbSeg?.kind || null,
        hasClimbTree: Boolean(player.climbTree),
        hasClimbSegment: Boolean(player.climbSeg),
        attachedTarget: Boolean(api.tree && player.climbTree === api.tree),
        dropHeld: Boolean(game.__dropHeld),
        diveHeld: Boolean(game.__diveHeld),
        datasets: {
          ready: rootData.glideReady || "",
          state: rootData.glideState || "",
          highPerch: rootData.glideHighPerch || "0",
          dropHeld: rootData.glideDropHeld || "0",
          diveHeld: rootData.glideDiveHeld || "0",
          groundLock: rootData.glideGroundLock || "0",
          dropSources: rootData.glideDropSources || "",
          rightHold: rootData.glideRightHold || "",
          title: rootData.glideTitle || "",
        },
        inputKeys: [...(game.input?.keys || [])],
      };
    };

    api.bootSnapshot = () => {
      game.squirrel.group.updateWorldMatrix?.(true, true);
      let visibleMeshMinimumY = Infinity;
      game.squirrel.group.traverse((node) => {
        if (!node.isMesh || !node.visible) return;
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (!parent.visible) return;
        }
        node.geometry?.computeBoundingBox?.();
        const box = node.geometry?.boundingBox?.clone?.();
        if (!box) return;
        box.applyMatrix4(node.matrixWorld);
        visibleMeshMinimumY = Math.min(visibleMeshMinimumY, box.min.y);
      });
      return {
        ...api.snapshot(),
        visibleMeshMinimumY: Number.isFinite(visibleMeshMinimumY) ? visibleMeshMinimumY : null,
        startedAtHighPerch: Boolean(game.__startedAtHighPerch),
      };
    };

    api.setAirFixture = () => {
      clearInput();
      const x = api.airOrigin.x;
      const z = api.airOrigin.z;
      const ground = game.biomeAt(x, z).ground;
      player.position.set(x, ground + 35.28, z);
      player.velocity.set(24, 0, 0);
      player.state = "air";
      player.climbTree = null;
      player.climbSeg = null;
      player.surfaceNormal.set(0, 1, 0);
      player.facing = Math.PI / 2;
      player.pitch = 0;
      player.roll = 0;
      player._grabCooldown = 999;
      player._jumpBuf = -1;
      player._coyote = 0;
      game.camera.yaw = player.facing;
      game.camera.updateBasis?.();
      game.camera._idleLook = 0;
      game.world.update?.(player.position);
      return api.snapshot();
    };

    api.selectTree = () => {
      const trees = game.world.activeTrees || [];
      const origin = player.position;
      let best = null;

      for (const tree of trees) {
        if (tree.giant || !tree.segments || !Number.isFinite(tree.x) || !Number.isFinite(tree.z)) continue;
        const segment = tree.segments.find((candidate) => candidate.kind === "trunk");
        if (!segment || segment.b.y - segment.a.y < 12) continue;
        const playerDistance = Math.hypot(tree.x - origin.x, tree.z - origin.z);
        if (playerDistance > 140) continue;

        for (let angleIndex = 0; angleIndex < 16; angleIndex += 1) {
          const angle = angleIndex / 16 * Math.PI * 2;
          const dx = Math.sin(angle);
          const dz = Math.cos(angle);
          const approachDistance = segment.r + 4.5;
          const startX = segment.a.x - dx * approachDistance;
          const startZ = segment.a.z - dz * approachDistance;
          const startGround = game.biomeAt(startX, startZ).ground;
          const targetGround = game.biomeAt(segment.a.x, segment.a.z).ground;
          const slopeDelta = Math.abs(startGround - targetGround);
          if (startGround < 2 || targetGround < 2 || slopeDelta > 1.2) continue;

          let nearestOther = Infinity;
          for (const other of trees) {
            if (other === tree || !Number.isFinite(other.x) || !Number.isFinite(other.z)) continue;
            const fromStart = Math.hypot(other.x - startX, other.z - startZ);
            const fromTarget = Math.hypot(other.x - segment.a.x, other.z - segment.a.z);
            nearestOther = Math.min(nearestOther, fromStart, fromTarget);
          }
          if (nearestOther < 12) continue;

          const score = nearestOther - slopeDelta * 10 - playerDistance * 0.02;
          if (!best || score > best.score) {
            best = {
              tree,
              segment,
              startX,
              startZ,
              startGround,
              targetX: segment.a.x,
              targetZ: segment.a.z,
              targetGround,
              dx,
              dz,
              approachDistance,
              nearestOther,
              slopeDelta,
              playerDistance,
              score,
            };
          }
        }
      }

      if (!best) return null;
      api.tree = best.tree;
      api.segment = best.segment;
      api.approach = best;
      return {
        tree: {
          x: best.tree.x,
          z: best.tree.z,
          baseY: best.tree.baseY,
          topY: best.tree.topY,
          trunkRadius: best.tree.trunkRadius,
        },
        segment: {
          kind: best.segment.kind,
          radius: best.segment.r,
          a: best.segment.a.toArray(),
          b: best.segment.b.toArray(),
        },
        start: [best.startX, best.startGround + 0.28, best.startZ],
        target: [best.targetX, best.targetGround + 0.28, best.targetZ],
        direction: [best.dx, best.dz],
        approachDistance: best.approachDistance,
        nearestOther: best.nearestOther,
        slopeDelta: best.slopeDelta,
        playerDistance: best.playerDistance,
      };
    };

    api.placeApproach = () => {
      if (!api.approach || !api.tree || !api.segment) return null;
      clearInput();
      const fixture = api.approach;
      const ground = game.biomeAt(fixture.startX, fixture.startZ).ground;
      player.position.set(fixture.startX, ground + 0.28, fixture.startZ);
      player.velocity.set(0, 0, 0);
      player.state = "ground";
      player.climbTree = null;
      player.climbSeg = null;
      player.surfaceNormal.set(0, 1, 0);
      player.facing = Math.atan2(fixture.dx, fixture.dz);
      player.pitch = 0;
      player.roll = 0;
      player._grabCooldown = 0;
      player._jumpBuf = -1;
      player._coyote = 0;
      game.camera.yaw = player.facing;
      game.camera.updateBasis?.();
      game.camera._idleLook = 0;
      game.world.update?.(player.position);
      return {
        ...api.snapshot(),
        targetStillActive: game.world.activeTrees.includes(api.tree),
      };
    };

    api.startTrace = (label) => {
      api.trace = { label, samples: [] };
    };

    api.stopTrace = () => {
      const samples = api.trace?.samples || [];
      api.trace = null;
      return samples;
    };

    const traceFrame = (now) => {
      if (api.trace && api.approach) {
        const fixture = api.approach;
        const offsetX = player.position.x - fixture.startX;
        const offsetZ = player.position.z - fixture.startZ;
        api.trace.samples.push({
          now,
          state: player.state,
          position: player.position.toArray(),
          velocity: player.velocity.toArray(),
          vy: player.velocity.y,
          horizontalSpeed: Math.hypot(player.velocity.x || 0, player.velocity.z || 0),
          progress: offsetX * fixture.dx + offsetZ * fixture.dz,
          targetDistance: Math.hypot(player.position.x - fixture.targetX, player.position.z - fixture.targetZ),
          attachedTarget: player.climbTree === api.tree,
          hasClimbReference: Boolean(player.climbTree || player.climbSeg),
          dropHeld: Boolean(game.__dropHeld),
        });
      }
      requestAnimationFrame(traceFrame);
    };
    requestAnimationFrame(traceFrame);

    api.saveClimbFixture = () => {
      if (player.state !== "climb" || player.climbTree !== api.tree || !player.climbSeg) return null;
      api.climbFixture = {
        position: player.position.toArray(),
        surfaceNormal: player.surfaceNormal.toArray(),
        facing: player.facing,
        pitch: player.pitch,
        roll: player.roll,
        tree: player.climbTree,
        segment: player.climbSeg,
      };
      return api.snapshot();
    };

    api.restoreClimbFixture = () => {
      const fixture = api.climbFixture;
      if (!fixture) return null;
      clearInput();
      player.position.fromArray(fixture.position);
      player.velocity.set(0, 0, 0);
      player.state = "climb";
      player.climbTree = fixture.tree;
      player.climbSeg = fixture.segment;
      player.surfaceNormal.fromArray(fixture.surfaceNormal);
      player.facing = fixture.facing;
      player.pitch = fixture.pitch;
      player.roll = fixture.roll;
      player._grabCooldown = 0;
      player._jumpBuf = -1;
      player._coyote = 0;
      game.camera.yaw = player.facing;
      game.camera.updateBasis?.();
      game.camera._idleLook = 0;
      game.world.update?.(player.position);
      return api.snapshot();
    };

    api.clearKeyAudit = () => { api.keyAudit.length = 0; };
    api.readKeyAudit = () => api.keyAudit.slice();
    window.addEventListener("keydown", (event) => {
      if (!["ControlLeft", "ControlRight", "KeyF", "KeyC"].includes(event.code)) return;
      api.keyAudit.push({
        code: event.code,
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        defaultPrevented: event.defaultPrevented,
        dropHeld: Boolean(game.__dropHeld),
        state: player.state,
      });
    });

    api.forceUnpaused = () => {
      window.__GLIDE_PAUSED = false;
      document.querySelector("#pause-mark")?.classList.remove("show");
    };

    window.__GLIDE_MECHANICS_QA__ = api;
  });

  await waitFrames(30);

  // Phase 1: the ordinary route must begin truly grounded, not visually
  // disguised while its physics state is attached to a synthetic perch.
  const initial = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.bootSnapshot());
  await capture("01-default-ground.png");
  await waitFrames(30);
  const idleEnd = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.bootSnapshot());
  const idleDrift = distance3(initial.position, idleEnd.position);
  report.phases.defaultSpawn = { initial, idleEnd, idleDrift };

  check(initial.patch === "v84-mobile-hold-title", `v84 motion patch is active (${initial.patch})`);
  check(initial.state === "ground", `default spawn uses ground state (${initial.state})`);
  check(!initial.hasClimbTree && !initial.hasClimbSegment, "default spawn has no synthetic climb attachment");
  check(initial.datasets.highPerch === "0" && !initial.startedAtHighPerch, "default route does not start on the high perch");
  check(Math.abs(initial.groundClearance) <= 0.03,
    `player collider rests on terrain (clearance ${round(initial.groundClearance)})`);
  check(Math.abs(initial.visualPosition[1] - initial.ground) <= 0.04,
    `character transform rests on terrain (visual delta ${round(initial.visualPosition[1] - initial.ground)})`);
  check(initial.visibleMeshMinimumY !== null && Math.abs(initial.visibleMeshMinimumY - initial.ground) <= 0.10,
    `visible character meets terrain (mesh delta ${round(initial.visibleMeshMinimumY - initial.ground)})`);
  check(initial.speed < 0.05 && idleDrift < 0.03,
    `idle spawn remains settled (speed ${round(initial.speed)}, drift ${round(idleDrift)})`);

  // Phase 2: compare ordinary flight to the same fixture under a physical C.
  await releaseGameplayKeys();
  const neutralStart = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.setAirFixture());
  await waitFrames(36);
  const neutralEnd = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.snapshot());

  const cStart = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.setAirFixture());
  await page.keyboard.down("KeyC");
  await page.waitForFunction(() => window.__GAME.__dropHeld === true, null, { timeout: 2_000, polling: "raf" });
  await waitFrames(36);
  const cEnd = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.snapshot());
  await page.keyboard.up("KeyC");
  await waitFrames(3);
  const cReleased = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.snapshot());

  const neutralDeltaY = neutralEnd.position[1] - neutralStart.position[1];
  const cDeltaY = cEnd.position[1] - cStart.position[1];
  report.phases.airBrake = {
    neutralStart,
    neutralEnd,
    neutralDeltaY,
    cStart,
    cEnd,
    cDeltaY,
    released: cReleased,
  };

  check(cEnd.dropHeld && cEnd.diveHeld
    && cEnd.datasets.dropHeld === "1"
    && cEnd.datasets.diveHeld === "1"
    && cEnd.datasets.groundLock === "1", "physical C publishes the held brake/drop state");
  check(cEnd.state === "air", `high C fixture remains airborne during the comparison (${cEnd.state})`);
  check(cDeltaY <= neutralDeltaY - 0.6,
    `C descends faster than neutral flight (C ${round(cDeltaY)}, neutral ${round(neutralDeltaY)})`);
  check(cEnd.velocity[1] <= neutralEnd.velocity[1] - 4,
    `C produces deliberate downward velocity (C ${round(cEnd.velocity[1])}, neutral ${round(neutralEnd.velocity[1])})`);
  check(cEnd.horizontalSpeed <= 10.5 && cEnd.horizontalSpeed <= neutralEnd.horizontalSpeed * 0.60,
    `C brakes horizontal flight (C ${round(cEnd.horizontalSpeed)}, neutral ${round(neutralEnd.horizontalSpeed)})`);
  check(!cReleased.dropHeld && !cReleased.diveHeld
    && cReleased.datasets.dropHeld === "0"
    && cReleased.datasets.diveHeld === "0"
    && cReleased.datasets.groundLock === "0", "releasing C clears every held flag");

  // Phase 3: choose an isolated real trunk and prove C suppression through the
  // update loop, then replay the exact approach without C to prove normal tree
  // attachment was not disabled globally.
  const candidate = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.selectTree());
  report.phases.treeCandidate = candidate;
  check(Boolean(candidate), "an isolated deterministic native trunk fixture was found", candidate);
  if (!candidate) throw new Error("No isolated native trunk fixture was available");

  await releaseGameplayKeys();
  const suppressionSetup = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.placeApproach());
  check(suppressionSetup?.targetStillActive === true, "selected trunk remains active at the approach fixture");
  await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.startTrace("C suppression"));
  await page.keyboard.down("KeyC");
  await page.waitForFunction(() => window.__GAME.__dropHeld === true, null, { timeout: 2_000, polling: "raf" });
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(1_800);
  const suppressionHeld = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.snapshot());
  await capture("02-c-tree-suppression.png");
  const suppressionTrace = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.stopTrace());
  await page.keyboard.up("KeyW");
  await page.keyboard.up("KeyC");
  await waitFrames(3);
  const suppressionSummary = summarizeTrace(suppressionTrace);
  report.phases.treeSuppression = {
    setup: suppressionSetup,
    held: suppressionHeld,
    summary: suppressionSummary,
    trace: suppressionTrace,
  };

  check(suppressionHeld.dropHeld && suppressionHeld.datasets.dropHeld === "1", "C remained physically held for the trunk approach");
  check(suppressionSummary.frames >= 6, `C trunk approach traversed the live frame loop (${suppressionSummary.frames} frames)`);
  check(suppressionSummary.maximumProgress >= candidate.approachDistance - 0.8,
    `C approach physically reached the trunk (progress ${round(suppressionSummary.maximumProgress)} / ${round(candidate.approachDistance)})`);
  check(!suppressionSummary.targetGrabbed && !suppressionSummary.states.includes("climb")
    && !suppressionSummary.anyClimbReference, "held C suppresses automatic tree attachment");
  check(suppressionSummary.maximumVy <= 1.0,
    `held C does not bounce upward from the tree (max vy ${round(suppressionSummary.maximumVy)})`);
  check(suppressionSummary.maximumHorizontalSpeed <= 5.55,
    `held C enforces the ground brake (max speed ${round(suppressionSummary.maximumHorizontalSpeed)})`);
  check(suppressionSummary.minimumProgressStep === null || suppressionSummary.minimumProgressStep >= -0.5,
    `held C does not reverse/bounce away from the tree (worst step ${round(suppressionSummary.minimumProgressStep)})`);

  const neutralSetup = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.placeApproach());
  await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.startTrace("neutral tree grab"));
  let neutralGrabbed = true;
  await page.keyboard.down("KeyW");
  try {
    await page.waitForFunction(() => {
      const qa = window.__GLIDE_MECHANICS_QA__;
      return qa.game.player.state === "climb" && qa.game.player.climbTree === qa.tree;
    }, null, { timeout: 5_000, polling: "raf" });
  } catch {
    neutralGrabbed = false;
  } finally {
    await page.keyboard.up("KeyW");
  }
  await waitFrames(18);
  const neutralAttached = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.snapshot());
  const neutralTrace = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.stopTrace());
  const neutralSummary = summarizeTrace(neutralTrace);
  report.phases.neutralTreeGrab = {
    setup: neutralSetup,
    grabbed: neutralGrabbed,
    attached: neutralAttached,
    summary: neutralSummary,
    trace: neutralTrace,
  };

  check(neutralGrabbed && neutralSummary.targetGrabbed,
    `the identical approach without C grabs the target trunk (${neutralSummary.states.join(" -> ")})`);
  check(neutralAttached.state === "climb" && neutralAttached.attachedTarget
    && neutralAttached.hasClimbSegment, "neutral tree grab remains attached after W is released");
  check(neutralSummary.maximumHorizontalSpeed >= suppressionSummary.maximumHorizontalSpeed * 1.5,
    `neutral ground movement remains faster than held C (neutral ${round(neutralSummary.maximumHorizontalSpeed)}, C ${round(suppressionSummary.maximumHorizontalSpeed)})`);
  if (!neutralGrabbed || neutralAttached.state !== "climb" || !neutralAttached.attachedTarget) {
    throw new Error("Dependent climb fixture could not be acquired through real input");
  }

  // Move up the real trunk using W so the subsequent C test must visibly fall,
  // rather than being snapped from a few centimetres above the ground.
  const targetClimbY = candidate.tree.baseY + 8;
  let reachedDropHeight = true;
  await page.keyboard.down("KeyW");
  try {
    await page.waitForFunction((minimumY) => {
      const qa = window.__GLIDE_MECHANICS_QA__;
      return qa.game.player.state === "climb"
        && qa.game.player.climbTree === qa.tree
        && qa.game.player.position.y >= minimumY;
    }, targetClimbY, { timeout: 8_000, polling: "raf" });
  } catch {
    reachedDropHeight = false;
  } finally {
    await page.keyboard.up("KeyW");
  }
  await waitFrames(8);
  const highClimb = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.snapshot());
  const savedFixture = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.saveClimbFixture());
  report.phases.climbFixture = { targetClimbY, reachedDropHeight, highClimb, savedFixture };
  check(reachedDropHeight && highClimb.position[1] >= targetClimbY,
    `real W input climbs high enough for a fall (${round(highClimb.position[1])} >= ${round(targetClimbY)})`);
  check(highClimb.state === "climb" && highClimb.attachedTarget && Boolean(savedFixture),
    "high real-tree climb fixture remains attached and can be restored");
  if (!savedFixture) throw new Error("Could not save the real-tree climb fixture");

  // Phase 4: Ctrl/F and browser chords must not own GLIDE's drop behavior.
  const ownershipResults = [];
  const runOwnershipCase = async ({ name, action, matchEvent, cleanup }) => {
    await releaseGameplayKeys();
    await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.restoreClimbFixture());
    await waitFrames(6);
    await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.clearKeyAudit());
    await action();
    await waitFrames(8);
    const result = await page.evaluate(() => ({
      state: window.__GLIDE_MECHANICS_QA__.snapshot(),
      audit: window.__GLIDE_MECHANICS_QA__.readKeyAudit(),
    }));
    const relevant = result.audit.find(matchEvent);
    ownershipResults.push({ name, ...result, relevant: relevant || null });
    check(result.state.state === "climb" && result.state.attachedTarget
      && result.state.hasClimbTree && result.state.hasClimbSegment,
      `${name} does not detach from a tree`);
    check(!result.state.dropHeld && !result.state.diveHeld
      && result.state.datasets.dropHeld === "0" && result.state.datasets.diveHeld === "0",
      `${name} does not activate GLIDE's held C state`);
    check(Boolean(relevant), `${name} produced the expected real key event`, result.audit);
    check(Boolean(relevant) && relevant.defaultPrevented === false,
      `${name} remains unprevented for browser ownership`);
    check(!result.state.inputKeys.some((key) => ["ControlLeft", "ControlRight", "KeyF", "KeyC"].includes(key)),
      `${name} leaves no stuck gameplay key`);
    if (cleanup) await cleanup();
  };

  await runOwnershipCase({
    name: "plain left Ctrl",
    action: () => page.keyboard.press("Control"),
    // A Control keydown already reports ctrlKey=true for itself.
    matchEvent: (event) => event.code === "ControlLeft",
  });
  await runOwnershipCase({
    name: "plain right Ctrl",
    action: () => page.keyboard.press("ControlRight"),
    matchEvent: (event) => event.code === "ControlRight",
  });
  await runOwnershipCase({
    name: "plain F",
    action: () => page.keyboard.press("KeyF"),
    matchEvent: (event) => event.code === "KeyF" && !event.ctrlKey,
  });
  await runOwnershipCase({
    name: "Ctrl+C",
    action: async () => {
      await page.keyboard.down("Control");
      await page.keyboard.press("KeyC");
      await page.keyboard.up("Control");
    },
    matchEvent: (event) => event.code === "KeyC" && event.ctrlKey,
  });
  await runOwnershipCase({
    name: "Ctrl+F",
    action: async () => {
      await page.keyboard.down("Control");
      await page.keyboard.press("KeyF");
      await page.keyboard.up("Control");
    },
    matchEvent: (event) => event.code === "KeyF" && event.ctrlKey,
    cleanup: async () => {
      // Close native find UI if Chrome opened it. If Escape reached the page,
      // restore the explicit QA unpaused state before later physics checks.
      await page.keyboard.press("Escape");
      await page.bringToFront();
      await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.forceUnpaused());
    },
  });
  report.phases.browserOwnership = ownershipResults;

  // Losing focus while C is physically down must clear the held state. Start
  // with a real second-tab switch. Headless Chrome does not consistently emit
  // window blur for bringToFront(), so record that behavior and, when needed,
  // dispatch the same window event deterministically to cover GLIDE's handler.
  await page.bringToFront();
  await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.restoreClimbFixture());
  await waitFrames(4);
  const blank = await context.newPage();
  await page.bringToFront();
  await page.keyboard.down("KeyC");
  await page.waitForFunction(() => window.__GAME.__dropHeld === true, null, { timeout: 2_000, polling: "raf" });
  const beforeBlur = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.snapshot());
  await blank.bringToFront();
  await new Promise((resolve) => setTimeout(resolve, 250));
  const afterTabSwitch = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.snapshot());
  const syntheticBlurNeeded = afterTabSwitch.dropHeld || afterTabSwitch.diveHeld;
  if (syntheticBlurNeeded) {
    await page.evaluate(() => window.dispatchEvent(new FocusEvent("blur")));
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const afterBlur = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.snapshot());
  await page.bringToFront();
  await page.keyboard.up("KeyC");
  await blank.close();
  await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.forceUnpaused());
  report.phases.blurRelease = { beforeBlur, afterTabSwitch, syntheticBlurNeeded, afterBlur };
  check(beforeBlur.dropHeld && beforeBlur.datasets.dropHeld === "1", "physical C is held before the tab loses focus");
  check(!afterBlur.dropHeld && !afterBlur.diveHeld
    && afterBlur.datasets.dropHeld === "0"
    && afterBlur.datasets.diveHeld === "0"
    && afterBlur.datasets.groundLock === "0",
    `window blur clears every held C flag${syntheticBlurNeeded ? " (deterministic headless dispatch)" : " (native tab blur)"}`);

  // Phase 5: unmodified C is the one key that must detach and fall. Restore the
  // real high climb acquired above, then keep C physically held through landing.
  await releaseGameplayKeys();
  const dropStart = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.restoreClimbFixture());
  await waitFrames(4);
  await page.keyboard.down("KeyC");
  await page.waitForFunction(() => window.__GAME.__dropHeld === true, null, { timeout: 2_000, polling: "raf" });
  const detached = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.snapshot());
  await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.startTrace("C tree drop"));
  await capture("03-c-tree-drop.png");

  let landed = true;
  try {
    await page.waitForFunction(() => window.__GAME.player.state === "ground", null,
      { timeout: 12_000, polling: "raf" });
  } catch {
    landed = false;
  }
  await waitFrames(6);
  const landingTrace = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.stopTrace());
  const landing = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.snapshot());
  await capture("04-c-drop-landed.png");
  await page.keyboard.up("KeyC");
  await waitFrames(4);
  const afterDropRelease = await page.evaluate(() => window.__GLIDE_MECHANICS_QA__.snapshot());
  const landingSummary = summarizeTrace(landingTrace);
  report.phases.treeDrop = {
    start: dropStart,
    detached,
    landed,
    landing,
    released: afterDropRelease,
    summary: landingSummary,
    trace: landingTrace,
  };

  check(detached.state === "air" && !detached.hasClimbTree && !detached.hasClimbSegment,
    "plain physical C detaches from the real tree");
  check(detached.dropHeld && detached.velocity[1] <= -3,
    `C begins a genuine fall (vy ${round(detached.velocity[1])})`);
  check(detached.horizontalSpeed <= 10,
    `C tree drop does not launch horizontally (speed ${round(detached.horizontalSpeed)})`);
  check(landed && landing.state === "ground", "held C reaches the ground");
  check(landingSummary.frames >= 2 && !landingSummary.states.includes("climb")
    && !landingSummary.targetGrabbed && !landingSummary.anyClimbReference,
    "held C never regrabs or bounces back onto the tree during the fall");
  check(landingSummary.minimumVy !== null && landingSummary.minimumVy <= -3
    && landingSummary.maximumVy <= 1,
    `tree-drop trace stays downward (vy ${round(landingSummary.minimumVy)} to ${round(landingSummary.maximumVy)})`);
  check(Math.abs(landing.groundClearance) <= 0.06,
    `C drop finishes settled on terrain (clearance ${round(landing.groundClearance)})`);
  check(!afterDropRelease.dropHeld && !afterDropRelease.diveHeld
    && afterDropRelease.datasets.dropHeld === "0"
    && afterDropRelease.datasets.diveHeld === "0", "releasing C after landing clears the control state");

  check(report.browserErrors.length === 0,
    `zero page, console, or request errors${report.browserErrors.length ? `: ${report.browserErrors.slice(0, 4).join(" | ")}` : ""}`);
  check(report.badResponses.length === 0,
    `zero same-origin HTTP errors${report.badResponses.length ? `: ${report.badResponses.slice(0, 4).join(" | ")}` : ""}`);
} catch (error) {
  report.fatalError = { message: error?.message || String(error), stack: error?.stack || null };
  check(false, `suite completed without a fatal harness error: ${report.fatalError.message}`);
  try { await capture("99-fatal.png"); } catch {}
} finally {
  try { await releaseGameplayKeys(); } catch {}
  try { await browser?.close(); } catch {}
}

report.finishedAt = new Date().toISOString();
report.passed = failures.length === 0;
report.failureCount = failures.length;
report.failures = failures;

if (outputDirectory) {
  const reportPath = path.join(outputDirectory, "glide-mechanics-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  report.artifacts["glide-mechanics-report.json"] = reportPath;
  console.log(`Report: ${reportPath}`);
}

console.log(failures.length
  ? `\nGLIDE MECHANICS CHECK FAILED (${failures.length})`
  : `\nGLIDE MECHANICS CHECK PASSED (${report.checks.length} checks)`);
process.exitCode = failures.length ? 1 : 0;
