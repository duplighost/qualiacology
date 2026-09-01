// GLIDE mobile title + two-thumb brake/drop acceptance check.
//
// This drives real Chrome touch events through CDP. Fixture helpers only place
// the existing player on deterministic ground/air/tree states; every gesture,
// camera movement, held-source transition, and tree drop runs through GLIDE's
// live touch handlers and animation-frame loop.
//
// Usage:
//   node build/qa/glide-mobile-check.mjs [url] [optional-output-directory]

import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("../node_modules/playwright");

const requestedUrl = process.argv[2] || "http://127.0.0.1:4177/glide/";
const outputDirectory = process.argv[3] ? path.resolve(process.argv[3]) : "";
const target = new URL(requestedUrl);
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

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const round = (value, digits = 3) => Number.isFinite(value) ? Number(value.toFixed(digits)) : value;
const overlaps = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);

let browser;
let context;
let page;
let cdp;

const capture = async (name) => {
  if (!outputDirectory || !page || page.isClosed()) return null;
  const destination = path.join(outputDirectory, name);
  await page.screenshot({ path: destination, type: "png", animations: "allow" });
  report.artifacts[name] = destination;
  return destination;
};

const point = (id, x, y) => ({
  id,
  x,
  y,
  radiusX: 8,
  radiusY: 8,
  force: 0.7,
});

const dispatchTouch = async (type, touchPoints) => cdp.send("Input.dispatchTouchEvent", {
  type,
  touchPoints,
});

const waitFrames = (count) => page.evaluate((frameCount) => new Promise((resolve) => {
  let remaining = frameCount;
  const frame = () => {
    remaining -= 1;
    if (remaining <= 0) resolve();
    else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}), count);

const installObservationBridge = () => page.evaluate(() => {
  const game = window.__GAME;
  const player = game.player;
  const rootData = document.documentElement.dataset;
  const api = { trace: null };

  const snapshot = () => {
    const biome = game.biomeAt(player.position.x, player.position.z);
    return {
      patch: game.__glideMotionPatchVersion || null,
      title: rootData.glideTitle || "",
      rightHold: rootData.glideRightHold || "",
      rightHoldReason: rootData.glideRightHoldReason || "",
      dropSources: rootData.glideDropSources || "",
      dropHeld: Boolean(game.__dropHeld),
      diveHeld: Boolean(game.__diveHeld),
      heldDatasets: {
        drop: rootData.glideDropHeld || "0",
        dive: rootData.glideDiveHeld || "0",
        ground: rootData.glideGroundLock || "0",
      },
      input: {
        moveId: game.input?._moveTouchId ?? null,
        lookId: game.input?._lookTouchId ?? null,
        moveX: game.input?.move?.x ?? null,
        moveY: game.input?.move?.y ?? null,
        action: Boolean(game.input?.action),
        actionEdge: Boolean(game.input?._actionEdge),
      },
      camera: {
        yaw: game.camera?.yaw ?? null,
        pitch: game.camera?.pitch ?? null,
      },
      player: {
        state: player.state,
        position: player.position.toArray(),
        velocity: player.velocity.toArray(),
        horizontalSpeed: Math.hypot(player.velocity.x || 0, player.velocity.z || 0),
        ground: biome.ground,
        groundClearance: player.position.y - (biome.ground + 0.28),
        hasClimbTree: Boolean(player.climbTree),
        hasClimbSegment: Boolean(player.climbSeg),
        grabCooldown: player._grabCooldown,
      },
    };
  };

  const clearFixtureInput = () => {
    game.__clearDropSources?.();
    game.input?.keys?.clear?.();
    game.input?.move?.set?.(0, 0);
    if (game.input) {
      game.input.action = false;
      game.input._actionEdge = false;
      game.input.sprint = false;
      game.input._lastRightTap = 0;
    }
    game.__manualLaunchRequested = false;
  };

  api.snapshot = snapshot;
  api.setGroundFixture = () => {
    clearFixtureInput();
    const biome = game.biomeAt(player.position.x, player.position.z);
    player.position.y = biome.ground + 0.28;
    player.velocity.set(0, 0, 0);
    player.state = "ground";
    player.climbTree = null;
    player.climbSeg = null;
    player.surfaceNormal.set(0, 1, 0);
    player.pitch = 0;
    player.roll = 0;
    player._grabCooldown = 3;
    return snapshot();
  };

  api.setAirFixture = () => {
    clearFixtureInput();
    const biome = game.biomeAt(player.position.x, player.position.z);
    player.position.y = biome.ground + 28.28;
    player.velocity.set(18, 0, 0);
    player.state = "air";
    player.climbTree = null;
    player.climbSeg = null;
    player.surfaceNormal.set(0, 1, 0);
    player.facing = Math.PI / 2;
    player.pitch = 0;
    player.roll = 0;
    player._grabCooldown = 999;
    return snapshot();
  };

  api.setClimbFixture = () => {
    clearFixtureInput();
    const trees = game.world?.activeTrees || [];
    let fixture = null;
    for (const tree of trees) {
      if (tree.giant || !tree.segments) continue;
      const segment = tree.segments.find((candidate) => (
        candidate.kind === "trunk"
        && Number.isFinite(candidate.a?.y)
        && Number.isFinite(candidate.b?.y)
        && candidate.b.y - candidate.a.y >= 12
      ));
      if (!segment) continue;
      fixture = { tree, segment };
      break;
    }
    if (!fixture) return null;
    const { tree, segment } = fixture;
    const height = Math.min(9, Math.max(6, (segment.b.y - segment.a.y) * 0.42));
    const radius = Number.isFinite(segment.r) ? segment.r : 0.8;
    player.position.set(segment.a.x + radius + 0.22, segment.a.y + height, segment.a.z);
    player.velocity.set(0, 0, 0);
    player.state = "climb";
    player.climbTree = tree;
    player.climbSeg = segment;
    player.surfaceNormal.set(1, 0, 0);
    player.facing = Math.PI / 2;
    player.pitch = 0;
    player.roll = 0;
    player._grabCooldown = 0;
    game.camera.yaw = player.facing;
    game.camera.updateBasis?.();
    return {
      ...snapshot(),
      fixture: {
        tree: { x: tree.x, z: tree.z, baseY: tree.baseY, topY: tree.topY },
        segment: { kind: segment.kind, radius, a: segment.a.toArray(), b: segment.b.toArray() },
      },
    };
  };

  api.startTrace = () => { api.trace = []; };
  api.stopTrace = () => {
    const trace = api.trace || [];
    api.trace = null;
    return trace;
  };
  const traceFrame = () => {
    if (api.trace) {
      api.trace.push({
        state: player.state,
        y: player.position.y,
        vy: player.velocity.y,
        hasClimbTree: Boolean(player.climbTree),
        hasClimbSegment: Boolean(player.climbSeg),
        dropHeld: Boolean(game.__dropHeld),
      });
    }
    requestAnimationFrame(traceFrame);
  };
  requestAnimationFrame(traceFrame);

  window.__GLIDE_MOBILE_QA__ = api;
});

const snapshot = () => page.evaluate(() => window.__GLIDE_MOBILE_QA__.snapshot());

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
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  page = await context.newPage();
  cdp = await context.newCDPSession(page);

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

  const delayedModule = "**/glide/assets/index-cute-fast-stable-v83.js*";
  await page.route(delayedModule, async (route) => {
    await delay(5_000);
    await route.continue();
  });
  const earlyResponse = await page.goto(target.href, { waitUntil: "commit", timeout: 120_000 });
  await page.waitForFunction(() => document.documentElement.dataset.glideTitle === "loading",
    null, { timeout: 5_000, polling: "raf" });
  await page.waitForFunction(() => {
    const image = document.querySelector("#veil .title-art");
    return image?.complete && image.naturalWidth >= 300;
  }, null, { timeout: 30_000, polling: "raf" });
  await capture("00-mobile-title-art.png");
  const earlyTap = point(1, 200, 420);
  await dispatchTouch("touchStart", [earlyTap]);
  await delay(30);
  await dispatchTouch("touchEnd", []);
  const earlyIntentState = await page.evaluate(() => document.documentElement.dataset.glideTitle || "");
  await page.waitForFunction(() => (
    document.documentElement.dataset.glideReady === "1"
    && document.documentElement.dataset.glideTitle === "entered"
    && document.querySelector("#veil")?.classList.contains("title-entered")
  ), null, { timeout: 120_000, polling: "raf" });
  const preReadyInput = await page.evaluate((intentState) => ({
    earlyIntentState: intentState,
    title: document.documentElement.dataset.glideTitle,
    classes: [...document.querySelector("#veil").classList],
    ariaHidden: document.querySelector("#veil").getAttribute("aria-hidden"),
  }), earlyIntentState);
  report.phases.preReadyInput = preReadyInput;
  check(earlyResponse?.ok(), `delayed-load route responds successfully (${earlyResponse?.status() ?? "no response"})`);
  check(preReadyInput.title === "entered"
    && ["loading-input", "entered"].includes(preReadyInput.earlyIntentState)
    && preReadyInput.classes.includes("title-entered")
    && preReadyInput.ariaHidden === "true",
  "input received during loading is remembered and dismisses the title when play becomes ready", preReadyInput);
  await page.unroute(delayedModule);

  const response = await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => {
    const image = document.querySelector("#veil .title-art");
    return image?.complete && image.naturalWidth >= 300;
  }, null, { timeout: 30_000, polling: "raf" });
  await page.waitForFunction(() => (
    window.__GAME?.player
    && window.__GAME?.world
    && window.__GAME?.__worldExpansion
    && document.documentElement.dataset.glideReady === "1"
    && document.documentElement.dataset.glideTitle === "ready"
  ), null, { timeout: 120_000, polling: "raf" });
  await installObservationBridge();
  await delay(2_000);

  const titleState = await page.evaluate(() => {
    const veil = document.querySelector("#veil");
    const title = document.querySelector("#glide-title");
    const art = document.querySelector("#veil .title-art");
    const home = document.querySelector(".home-link");
    const style = getComputedStyle(veil);
    const rect = title.getBoundingClientRect();
    const homeRect = home.getBoundingClientRect();
    return {
      text: title.textContent,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      veil: {
        classes: [...veil.classList],
        opacity: Number.parseFloat(style.opacity),
        visibility: style.visibility,
        ariaHidden: veil.getAttribute("aria-hidden"),
      },
      titleRect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      homeRect: { left: homeRect.left, top: homeRect.top, right: homeRect.right, bottom: homeRect.bottom, width: homeRect.width, height: homeRect.height },
      art: {
        complete: art.complete,
        naturalWidth: art.naturalWidth,
        naturalHeight: art.naturalHeight,
        currentSrc: art.currentSrc,
        opacity: Number.parseFloat(getComputedStyle(art).opacity),
      },
    };
  });
  report.phases.mobileTitle = titleState;
  await capture("01-mobile-title-ready.png");

  check(response?.ok(), `mobile route responds successfully (${response?.status() ?? "no response"})`);
  check(titleState.text === "GLIDE", "title screen contains only the GLIDE title");
  check(titleState.veil.classes.includes("title-ready")
    && !titleState.veil.classes.includes("title-entered")
    && titleState.veil.visibility !== "hidden"
    && titleState.veil.opacity >= 0.95,
  "title remains visibly present after the forest is ready", titleState.veil);
  check(titleState.veil.ariaHidden === null, "ready title remains exposed to assistive technology");
  check(titleState.art.complete && titleState.art.naturalWidth >= 300,
    "approved responsive GLIDE artwork loaded for the title handoff", titleState.art);
  check(titleState.titleRect.left >= 0 && titleState.titleRect.right <= titleState.viewport.width
    && titleState.titleRect.top >= 0 && titleState.titleRect.bottom <= titleState.viewport.height,
  "mobile title stays wholly inside the viewport", titleState.titleRect);
  check(Math.abs((titleState.titleRect.left + titleState.titleRect.right) / 2 - titleState.viewport.width / 2) <= 3,
    "mobile title is horizontally centered", titleState.titleRect);
  check(!overlaps(titleState.titleRect, titleState.homeRect), "mobile title does not overlap the Qualiacology home control");

  const leftStart = point(11, 78, 720);
  const leftForward = point(11, 78, 632);
  const rightBrake = point(22, 320, 690);

  await dispatchTouch("touchStart", [leftStart]);
  await delay(35);
  await dispatchTouch("touchMove", [leftForward]);
  await page.waitForFunction(() => (
    document.documentElement.dataset.glideTitle === "entered"
    && window.__GAME?.input?._moveTouchId !== null
    && window.__GAME?.input?.move?.y > 0.6
  ), null, { timeout: 2_000, polling: "raf" });
  const firstTouch = await snapshot();
  report.phases.firstTouch = firstTouch;
  check(firstTouch.title === "entered" && firstTouch.input.moveId !== null && firstTouch.input.moveY > 0.6,
    "the first left-thumb gesture dismisses the title and controls movement in the same gesture", firstTouch);
  await page.waitForFunction(() => Number.parseFloat(getComputedStyle(document.querySelector("#veil")).opacity || "1") <= 0.05,
    null, { timeout: 5_000, polling: "raf" });

  await dispatchTouch("touchMove", [leftForward, rightBrake]);
  await delay(20);
  const candidate = await snapshot();
  check(candidate.rightHold === "candidate" && !candidate.dropHeld,
    "stationary right thumb begins as a hold candidate without firing early", candidate);
  await page.waitForFunction(() => (
    document.documentElement.dataset.glideRightHold === "active"
    && window.__GAME?.__dropHeld === true
  ), null, { timeout: 2_000, polling: "raf" });
  const twoThumbActive = await snapshot();
  report.phases.twoThumbActive = twoThumbActive;
  check(twoThumbActive.dropHeld && twoThumbActive.diveHeld
    && twoThumbActive.heldDatasets.drop === "1"
    && twoThumbActive.heldDatasets.dive === "1"
    && twoThumbActive.heldDatasets.ground === "1"
    && twoThumbActive.dropSources.split(",").includes("right-hold"),
  "stationary right-thumb hold publishes the complete C brake/drop state", twoThumbActive);
  check(twoThumbActive.input.moveId !== null && twoThumbActive.input.lookId !== null
    && twoThumbActive.input.moveId !== twoThumbActive.input.lookId
    && twoThumbActive.input.moveY > 0.6,
  "left-thumb movement remains active while the right thumb holds C", twoThumbActive.input);

  await dispatchTouch("touchMove", [leftForward]);
  await page.waitForFunction(() => (
    window.__GAME?.__dropHeld === false
    && window.__GAME?.input?._moveTouchId !== null
    && window.__GAME?.input?.move?.y > 0.6
  ), null, { timeout: 2_000, polling: "raf" });
  const rightReleased = await snapshot();
  report.phases.rightReleased = rightReleased;
  check(!rightReleased.dropHeld && rightReleased.input.moveId !== null && rightReleased.input.moveY > 0.6,
    "releasing only the right thumb clears C without interrupting left-thumb movement", rightReleased);
  check(rightReleased.input.lookId === null,
    "releasing only the right thumb clears the native camera-touch owner", rightReleased.input);
  await dispatchTouch("touchEnd", []);
  await delay(380);
  const allTouchesReleased = await snapshot();
  report.phases.allTouchesReleased = allTouchesReleased;
  check(allTouchesReleased.input.moveId === null && allTouchesReleased.input.lookId === null
    && Math.abs(allTouchesReleased.input.moveX) < 0.001 && Math.abs(allTouchesReleased.input.moveY) < 0.001,
  "releasing the final thumb clears both native touch owners and movement", allTouchesReleased.input);

  const cancelLeftStart = point(21, 78, 720);
  const cancelLeftForward = point(21, 78, 632);
  const cancelRightHold = point(23, 320, 690);
  await dispatchTouch("touchStart", [cancelLeftStart]);
  await dispatchTouch("touchMove", [cancelLeftForward, cancelRightHold]);
  await page.waitForFunction(() => document.documentElement.dataset.glideRightHold === "active",
    null, { timeout: 2_000, polling: "raf" });
  await page.evaluate(() => {
    const canvas = window.__GAME.engine.renderer.domElement;
    const left = new Touch({
      identifier: 21,
      target: canvas,
      clientX: 78,
      clientY: 632,
      pageX: 78,
      pageY: 632,
      screenX: 78,
      screenY: 632,
      radiusX: 8,
      radiusY: 8,
      force: 0.7,
    });
    canvas.dispatchEvent(new TouchEvent("touchcancel", {
      bubbles: true,
      cancelable: true,
      changedTouches: [left],
      touches: [],
      targetTouches: [],
    }));
  });
  await waitFrames(2);
  const leftOnlyCancelled = await snapshot();
  report.phases.leftOnlyCancelled = leftOnlyCancelled;
  check(leftOnlyCancelled.dropHeld && leftOnlyCancelled.rightHold === "active"
    && leftOnlyCancelled.input.moveId === null && leftOnlyCancelled.input.lookId === 23,
  "cancelling only the left thumb does not cancel the right-thumb hold", leftOnlyCancelled);
  await dispatchTouch("touchCancel", []);
  await page.waitForFunction(() => !window.__GAME?.__dropHeld,
    null, { timeout: 2_000, polling: "raf" });
  await delay(380);

  const swipeStart = point(31, 310, 650);
  const swipeEnd = point(31, 370, 650);
  await page.evaluate(() => window.__GLIDE_MOBILE_QA__.setGroundFixture());
  await waitFrames(8);
  const cameraBeforeSwipe = await snapshot();
  await dispatchTouch("touchStart", [swipeStart]);
  await delay(35);
  await dispatchTouch("touchMove", [swipeEnd]);
  await delay(320);
  const cameraAfterSwipe = await snapshot();
  report.phases.cameraSwipe = { before: cameraBeforeSwipe, after: cameraAfterSwipe };
  check(!cameraAfterSwipe.dropHeld && cameraAfterSwipe.rightHoldReason === "camera-drag",
    "a right-thumb swipe cancels the hold candidate and never activates C", cameraAfterSwipe);
  check(Math.abs(cameraAfterSwipe.camera.yaw - cameraBeforeSwipe.camera.yaw) >= 0.08,
    `right-thumb swipe still turns the camera (yaw delta ${round(cameraAfterSwipe.camera.yaw - cameraBeforeSwipe.camera.yaw)})`);
  await dispatchTouch("touchEnd", []);
  await delay(380);

  const climbFixture = await page.evaluate(() => window.__GLIDE_MOBILE_QA__.setClimbFixture());
  report.phases.climbFixture = climbFixture;
  check(Boolean(climbFixture), "a real native trunk fixture is available for the mobile drop test", climbFixture);
  if (!climbFixture) throw new Error("No native trunk fixture was available");
  const treeHold = point(41, 322, 680);
  await dispatchTouch("touchStart", [treeHold]);
  await page.waitForFunction(() => document.documentElement.dataset.glideRightHold === "active",
    null, { timeout: 2_000, polling: "raf" });
  const treeDetached = await snapshot();
  await page.evaluate(() => window.__GLIDE_MOBILE_QA__.startTrace());
  await capture("02-mobile-tree-drop.png");
  let landed = true;
  try {
    await page.waitForFunction(() => window.__GAME?.player?.state === "ground",
      null, { timeout: 12_000, polling: "raf" });
  } catch {
    landed = false;
  }
  await waitFrames(6);
  const treeLanding = await snapshot();
  const treeTrace = await page.evaluate(() => window.__GLIDE_MOBILE_QA__.stopTrace());
  report.phases.treeDrop = { detached: treeDetached, landed, landing: treeLanding, trace: treeTrace };
  check(treeDetached.player.state === "air"
    && !treeDetached.player.hasClimbTree
    && !treeDetached.player.hasClimbSegment,
  "stationary right-thumb hold detaches the squirrel from a real tree", treeDetached.player);
  check(treeDetached.player.velocity[1] <= -3 && treeDetached.player.horizontalSpeed <= 10
    && treeDetached.player.grabCooldown >= 1,
  "mobile tree drop begins as a controlled fall with re-grab cooldown", treeDetached.player);
  check(landed && treeLanding.player.state === "ground", "held mobile drop reaches the ground");
  check(treeTrace.length >= 2
    && !treeTrace.some((sample) => sample.state === "climb" || sample.hasClimbTree || sample.hasClimbSegment),
  "held mobile drop never bounces or reattaches during the fall");
  await dispatchTouch("touchEnd", []);
  await page.waitForFunction(() => window.__GAME?.__dropHeld === false,
    null, { timeout: 2_000, polling: "raf" });
  await delay(300);

  await page.evaluate(() => window.__GLIDE_MOBILE_QA__.setAirFixture());
  const cancelHold = point(51, 320, 690);
  await dispatchTouch("touchStart", [cancelHold]);
  await page.waitForFunction(() => document.documentElement.dataset.glideRightHold === "active",
    null, { timeout: 2_000, polling: "raf" });
  await dispatchTouch("touchCancel", []);
  await page.waitForFunction(() => !window.__GAME?.__dropHeld,
    null, { timeout: 2_000, polling: "raf" });
  const afterCancel = await snapshot();
  report.phases.touchCancel = afterCancel;
  check(!afterCancel.dropHeld && afterCancel.rightHold === "idle"
    && afterCancel.rightHoldReason === "touch-cancel" && afterCancel.input.lookId === null,
    "touchcancel clears the mobile held state", afterCancel);
  await delay(300);

  const blurHold = point(52, 320, 690);
  await dispatchTouch("touchStart", [blurHold]);
  await page.waitForFunction(() => document.documentElement.dataset.glideRightHold === "active",
    null, { timeout: 2_000, polling: "raf" });
  await page.evaluate(() => window.dispatchEvent(new FocusEvent("blur")));
  await page.waitForFunction(() => !window.__GAME?.__dropHeld,
    null, { timeout: 2_000, polling: "raf" });
  const afterBlur = await snapshot();
  report.phases.blur = afterBlur;
  check(!afterBlur.dropHeld && afterBlur.rightHold === "idle" && afterBlur.rightHoldReason === "blur",
    "window blur clears the mobile held state", afterBlur);
  await dispatchTouch("touchCancel", []);
  await delay(320);

  await page.evaluate(() => window.__GLIDE_MOBILE_QA__.setAirFixture());
  await page.keyboard.down("KeyC");
  await page.waitForFunction(() => document.documentElement.dataset.glideDropSources.includes("keyboard-c"));
  const hybridHold = point(53, 320, 690);
  await dispatchTouch("touchStart", [hybridHold]);
  await page.waitForFunction(() => document.documentElement.dataset.glideRightHold === "active",
    null, { timeout: 2_000, polling: "raf" });
  const hybridBoth = await snapshot();
  await page.keyboard.up("KeyC");
  await waitFrames(3);
  const hybridKeyboardReleased = await snapshot();
  await dispatchTouch("touchEnd", []);
  await page.waitForFunction(() => !window.__GAME?.__dropHeld,
    null, { timeout: 2_000, polling: "raf" });
  const hybridReleased = await snapshot();
  report.phases.hybridSources = { both: hybridBoth, keyboardReleased: hybridKeyboardReleased, released: hybridReleased };
  check(hybridBoth.dropSources.includes("keyboard-c") && hybridBoth.dropSources.includes("right-hold"),
    "keyboard C and mobile hold can coexist as independent sources", hybridBoth.dropSources);
  check(hybridKeyboardReleased.dropHeld
    && !hybridKeyboardReleased.dropSources.includes("keyboard-c")
    && hybridKeyboardReleased.dropSources.includes("right-hold"),
  "releasing keyboard C does not clear a still-held right thumb", hybridKeyboardReleased);
  check(!hybridReleased.dropHeld && hybridReleased.dropSources === "",
    "the held state clears after both input sources release", hybridReleased);
  await delay(350);

  await page.evaluate(() => window.__GLIDE_MOBILE_QA__.setGroundFixture());
  const tapOne = point(61, 318, 688);
  await dispatchTouch("touchStart", [tapOne]);
  await delay(55);
  await dispatchTouch("touchEnd", []);
  await delay(120);
  const tapHold = point(62, 318, 688);
  await dispatchTouch("touchStart", [tapHold]);
  await page.waitForFunction(() => document.documentElement.dataset.glideRightHold === "active",
    null, { timeout: 2_000, polling: "raf" });
  const holdAfterTap = await snapshot();
  report.phases.holdAfterTap = holdAfterTap;
  check(holdAfterTap.dropHeld && !holdAfterTap.input.action && !holdAfterTap.input.actionEdge
    && holdAfterTap.player.state === "ground",
  "a stationary hold after a recent tap becomes C without triggering the old double-tap bounce", holdAfterTap);
  await dispatchTouch("touchEnd", []);
  await delay(360);

  await page.evaluate(() => window.__GLIDE_MOBILE_QA__.setGroundFixture());
  const quickOne = point(71, 318, 688);
  await dispatchTouch("touchStart", [quickOne]);
  await delay(50);
  await dispatchTouch("touchEnd", []);
  await delay(100);
  const quickTwo = point(72, 318, 688);
  await dispatchTouch("touchStart", [quickTwo]);
  await delay(65);
  await dispatchTouch("touchEnd", []);
  let nativeDoubleTapWorked = true;
  try {
    await page.waitForFunction(() => window.__GAME?.player?.state === "air",
      null, { timeout: 2_500, polling: "raf" });
  } catch {
    nativeDoubleTapWorked = false;
  }
  const doubleTap = await snapshot();
  report.phases.nativeDoubleTap = { worked: nativeDoubleTapWorked, state: doubleTap };
  check(nativeDoubleTapWorked && doubleTap.player.state === "air" && !doubleTap.dropHeld,
    "a genuine quick right-thumb double tap still performs the native action", doubleTap);

  await page.evaluate(() => window.__GLIDE_MOBILE_QA__.setClimbFixture());
  const treeTapOne = point(81, 318, 688);
  await dispatchTouch("touchStart", [treeTapOne]);
  await delay(50);
  await dispatchTouch("touchEnd", []);
  await delay(100);
  const treeTapTwo = point(82, 318, 688);
  await dispatchTouch("touchStart", [treeTapTwo]);
  await delay(65);
  await dispatchTouch("touchEnd", []);
  let nativeTreeDoubleTapWorked = true;
  try {
    await page.waitForFunction(() => window.__GAME?.player?.state === "air",
      null, { timeout: 2_500, polling: "raf" });
  } catch {
    nativeTreeDoubleTapWorked = false;
  }
  const treeDoubleTap = await snapshot();
  report.phases.nativeTreeDoubleTap = { worked: nativeTreeDoubleTapWorked, state: treeDoubleTap };
  check(nativeTreeDoubleTapWorked
    && treeDoubleTap.player.state === "air"
    && treeDoubleTap.player.velocity[1] > 0
    && !treeDoubleTap.dropHeld,
  "a genuine quick double tap still launches from a tree", treeDoubleTap);

  await context.close();
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page = await context.newPage();
  page.on("pageerror", (error) => report.browserErrors.push(`desktop pageerror: ${error?.message || error}`));
  page.on("console", (message) => {
    if (message.type() === "error") report.browserErrors.push(`desktop console.error: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    report.browserErrors.push(`desktop requestfailed: ${request.url()} (${request.failure()?.errorText || "unknown"})`);
  });
  page.on("response", (desktopRouteResponse) => {
    if (desktopRouteResponse.status() >= 400 && desktopRouteResponse.url().startsWith(sameOrigin)) {
      report.badResponses.push(`${desktopRouteResponse.status()} ${desktopRouteResponse.url()}`);
    }
  });
  const desktopResponse = await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => (
    document.documentElement.dataset.glideReady === "1"
    && document.documentElement.dataset.glideTitle === "ready"
  ), null, { timeout: 120_000, polling: "raf" });
  await delay(1_000);
  const desktopTitle = await page.evaluate(() => {
    const veil = document.querySelector("#veil");
    const title = document.querySelector("#glide-title");
    const rect = title.getBoundingClientRect();
    return {
      classes: [...veil.classList],
      opacity: Number.parseFloat(getComputedStyle(veil).opacity),
      visibility: getComputedStyle(veil).visibility,
      titleRect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
  report.phases.desktopTitle = desktopTitle;
  await capture("03-desktop-title-ready.png");
  check(desktopResponse?.ok(), `desktop route responds successfully (${desktopResponse?.status() ?? "no response"})`);
  check(desktopTitle.classes.includes("title-ready")
    && !desktopTitle.classes.includes("title-entered")
    && desktopTitle.opacity >= 0.95
    && desktopTitle.visibility !== "hidden",
  "desktop title remains visibly present until input", desktopTitle);
  check(desktopTitle.titleRect.left >= 0 && desktopTitle.titleRect.right <= desktopTitle.viewport.width
    && desktopTitle.titleRect.top >= 0 && desktopTitle.titleRect.bottom <= desktopTitle.viewport.height,
  "desktop title stays wholly inside the viewport", desktopTitle.titleRect);

  check(report.browserErrors.length === 0,
    `zero page, console, or request errors${report.browserErrors.length ? `: ${report.browserErrors.slice(0, 4).join(" | ")}` : ""}`);
  check(report.badResponses.length === 0,
    `zero same-origin HTTP errors${report.badResponses.length ? `: ${report.badResponses.slice(0, 4).join(" | ")}` : ""}`);
} catch (error) {
  report.fatalError = { message: error?.message || String(error), stack: error?.stack || null };
  check(false, `suite completed without a fatal harness error: ${report.fatalError.message}`);
  try { await capture("99-fatal.png"); } catch {}
} finally {
  try { await page?.keyboard?.up("KeyC"); } catch {}
  try { await cdp?.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] }); } catch {}
  try { await browser?.close(); } catch {}
}

report.finishedAt = new Date().toISOString();
report.passed = failures.length === 0;
report.failureCount = failures.length;
report.failures = failures;

if (outputDirectory) {
  const reportPath = path.join(outputDirectory, "glide-mobile-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  report.artifacts["glide-mobile-report.json"] = reportPath;
  console.log(`Report: ${reportPath}`);
}

console.log(failures.length
  ? `\nGLIDE MOBILE CHECK FAILED (${failures.length})`
  : `\nGLIDE MOBILE CHECK PASSED (${report.checks.length} checks)`);
process.exitCode = failures.length ? 1 : 0;
