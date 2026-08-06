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

const viewportCases = [
  { label: 'portrait-320', width: 320, height: 844 },
  { label: 'portrait-360', width: 360, height: 844 },
  { label: 'portrait-390', width: 390, height: 844 },
  { label: 'portrait-430', width: 430, height: 844 },
  { label: 'landscape-844', width: 844, height: 390 },
];
const controlIds = [
  'touch-fire',
  'touch-jump',
  'touch-dash',
  'touch-aim',
  'touch-swap',
  'touch-reload',
  'touch-slide',
  'touch-time',
  'touch-orb',
  'touch-pause',
];
const touchCopyTokens = [
  'LEFT THUMB',
  'DRAG RIGHT',
  'FIRE',
  'JUMP',
  'DASH',
  'AIM',
  'SWAP',
  'RELOAD',
  'SLIDE',
  'TIME',
  'ORB',
];

const report = {
  pass: false,
  chrome: { executablePath, renderer: null },
  viewports: [],
  wiring: null,
  pageErrors: [],
  consoleErrors: [],
  failures: [],
};

function fail(scope, message, details = undefined) {
  report.failures.push({ scope, message, ...(details === undefined ? {} : { details }) });
}

function check(condition, scope, message, details = undefined) {
  if (!condition) fail(scope, message, details);
}

function attachErrorCapture(page, label) {
  page.on('pageerror', (error) => report.pageErrors.push({ label, message: String(error) }));
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push({ label, message: message.text() });
  });
}

async function openTouchPage(browser, port, viewport, label) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    screen: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  attachErrorCapture(page, label);
  await page.bringToFront();
  const response = await page.goto(`http://127.0.0.1:${port}/relay-eclipse/`, {
    waitUntil: 'domcontentloaded',
  });
  check(response?.ok(), label, `Route did not return a successful response`, {
    status: response?.status(),
  });
  await page.waitForFunction(() => window.__RE?.ready === true, null, { timeout: 20_000 });
  const touchEnvironment = await page.evaluate(() => ({
    maxTouchPoints: navigator.maxTouchPoints,
    onTouchStart: 'ontouchstart' in window,
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    hudClass: document.querySelector('#hud')?.className || '',
    touchMode: document.querySelector('#hud')?.classList.contains('touch-mode') || false,
  }));
  check(touchEnvironment.touchMode, label, 'Game did not activate touch mode', touchEnvironment);
  if (!touchEnvironment.touchMode) throw new Error(`Touch emulation was not recognized: ${JSON.stringify(touchEnvironment)}`);
  return { context, page, cdp };
}

async function readRenderer(page) {
  return page.evaluate(() => {
    const gl = document.querySelector('#game')?.getContext('webgl2');
    if (!gl) return 'WebGL2 unavailable';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER) || 'renderer unavailable';
  });
}

async function measureOnboarding(page) {
  return page.evaluate((expectedTokens) => {
    const rect = (element) => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return {
        x: Number(r.x.toFixed(2)),
        y: Number(r.y.toFixed(2)),
        width: Number(r.width.toFixed(2)),
        height: Number(r.height.toFixed(2)),
        right: Number(r.right.toFixed(2)),
        bottom: Number(r.bottom.toFixed(2)),
      };
    };
    const overlay = document.querySelector('#overlay');
    const card = document.querySelector('#overlay-card');
    const title = document.querySelector('#game-title');
    const controls = document.querySelector('#controls');
    const desktop = document.querySelector('.controls-desktop');
    const touch = document.querySelector('.controls-touch');
    const overlayStyle = getComputedStyle(overlay);
    const touchText = touch?.textContent.replace(/\s+/g, ' ').trim() || '';
    const cardRect = card?.getBoundingClientRect();
    const maxScrollTop = Math.max(0, overlay.scrollHeight - overlay.clientHeight);
    const bottomAtMaximumScroll = cardRect ? cardRect.bottom - maxScrollTop : Infinity;
    return {
      viewport: { width: innerWidth, height: innerHeight },
      touchMode: document.querySelector('#hud')?.classList.contains('touch-mode') || false,
      playText: document.querySelector('#play-btn')?.textContent.trim() || '',
      desktopDisplay: desktop ? getComputedStyle(desktop).display : 'missing',
      touchDisplay: touch ? getComputedStyle(touch).display : 'missing',
      copy: {
        text: touchText,
        expectedTokens: Object.fromEntries(expectedTokens.map((token) => [token, touchText.includes(token)])),
        containsDesktopWasd: touchText.includes('WASD'),
      },
      document: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
      },
      overlay: {
        clientWidth: overlay.clientWidth,
        scrollWidth: overlay.scrollWidth,
        clientHeight: overlay.clientHeight,
        scrollHeight: overlay.scrollHeight,
        overflowX: overlayStyle.overflowX,
        overflowY: overlayStyle.overflowY,
        maxScrollTop,
        cardBottomAtMaximumScroll: Number(bottomAtMaximumScroll.toFixed(2)),
      },
      card: rect(card),
      title: {
        ...rect(title),
        clientWidth: title?.clientWidth ?? -1,
        scrollWidth: title?.scrollWidth ?? -1,
      },
      controls: {
        ...rect(controls),
        clientWidth: controls?.clientWidth ?? -1,
        scrollWidth: controls?.scrollWidth ?? -1,
      },
    };
  }, touchCopyTokens);
}

function validateOnboarding(metrics, label) {
  const epsilon = 0.75;
  check(metrics.touchMode, label, 'HUD did not enter touch mode');
  check(metrics.playText === 'TAP TO PLAY', label, 'Touch CTA is not TAP TO PLAY', metrics.playText);
  check(metrics.desktopDisplay === 'none', label, 'Desktop onboarding copy remains visible', metrics.desktopDisplay);
  check(metrics.touchDisplay !== 'none' && metrics.touchDisplay !== 'missing', label, 'Touch onboarding copy is hidden', metrics.touchDisplay);
  for (const [token, present] of Object.entries(metrics.copy.expectedTokens)) {
    check(present, label, `Touch onboarding copy is missing ${token}`);
  }
  check(!metrics.copy.containsDesktopWasd, label, 'Touch onboarding copy contains desktop WASD instructions');
  check(metrics.document.scrollWidth <= metrics.document.clientWidth + epsilon, label, 'Document has horizontal overflow', metrics.document);
  check(metrics.overlay.scrollWidth <= metrics.overlay.clientWidth + epsilon, label, 'Onboarding overlay has horizontal overflow', metrics.overlay);
  check(metrics.card && metrics.card.x >= -epsilon && metrics.card.right <= metrics.viewport.width + epsilon,
    label, 'Onboarding card leaves the viewport horizontally', metrics.card);
  check(metrics.title && metrics.title.x >= metrics.card.x - epsilon && metrics.title.right <= metrics.card.right + epsilon,
    label, 'Title leaves the onboarding card', { title: metrics.title, card: metrics.card });
  check(metrics.title.scrollWidth <= metrics.title.clientWidth + epsilon,
    label, 'Title content overflows horizontally', metrics.title);
  check(metrics.controls.scrollWidth <= metrics.controls.clientWidth + epsilon,
    label, 'Instruction content overflows horizontally', metrics.controls);
  if (metrics.overlay.scrollHeight > metrics.overlay.clientHeight + epsilon) {
    check(['auto', 'scroll'].includes(metrics.overlay.overflowY), label,
      'Vertically overflowing onboarding is not scrollable', metrics.overlay);
    check(metrics.overlay.cardBottomAtMaximumScroll <= metrics.overlay.clientHeight + epsilon,
      label, 'Bottom of onboarding card cannot be reached by scrolling', metrics.overlay);
  } else {
    check(metrics.card.bottom <= metrics.viewport.height + epsilon,
      label, 'Onboarding card is clipped vertically', metrics.card);
  }
}

async function measureControls(page) {
  await page.getByRole('button', { name: 'TAP TO PLAY' }).tap();
  await page.waitForFunction(() => !document.querySelector('#overlay')?.classList.contains('show'));
  await page.waitForTimeout(150);
  return page.evaluate((ids) => {
    const controls = ids.map((id) => {
      const element = document.getElementById(id);
      if (!element) return { id, missing: true };
      const r = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        id,
        missing: false,
        x: Number(r.x.toFixed(2)),
        y: Number(r.y.toFixed(2)),
        width: Number(r.width.toFixed(2)),
        height: Number(r.height.toFixed(2)),
        right: Number(r.right.toFixed(2)),
        bottom: Number(r.bottom.toFixed(2)),
        display: style.display,
        visibility: style.visibility,
        opacity: Number(style.opacity),
        pointerEvents: style.pointerEvents,
      };
    });
    const overlaps = [];
    for (let i = 0; i < controls.length; i++) {
      const a = controls[i];
      if (a.missing) continue;
      for (let j = i + 1; j < controls.length; j++) {
        const b = controls[j];
        if (b.missing) continue;
        const width = Math.min(a.right, b.right) - Math.max(a.x, b.x);
        const height = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
        if (width > 0.5 && height > 0.5) {
          overlaps.push({ a: a.id, b: b.id, width: Number(width.toFixed(2)), height: Number(height.toFixed(2)) });
        }
      }
    }
    const obstacleIds = ['hud-bottom-left', 'hud-bottom-right', 'slowmo-meter', 'dash-meter', 'hud-top'];
    const hudObstacles = obstacleIds.map((id) => {
      const element = document.getElementById(id);
      const r = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        id,
        x: Number(r.x.toFixed(2)),
        y: Number(r.y.toFixed(2)),
        right: Number(r.right.toFixed(2)),
        bottom: Number(r.bottom.toFixed(2)),
        width: Number(r.width.toFixed(2)),
        height: Number(r.height.toFixed(2)),
        visible: style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0,
      };
    });
    const hudOverlaps = [];
    for (const control of controls) {
      if (control.missing) continue;
      for (const obstacle of hudObstacles) {
        if (!obstacle.visible) continue;
        const width = Math.min(control.right, obstacle.right) - Math.max(control.x, obstacle.x);
        const height = Math.min(control.bottom, obstacle.bottom) - Math.max(control.y, obstacle.y);
        if (width > 0.5 && height > 0.5) {
          hudOverlaps.push({
            control: control.id,
            hud: obstacle.id,
            width: Number(width.toFixed(2)),
            height: Number(height.toFixed(2)),
          });
        }
      }
    }
    return {
      viewport: { width: innerWidth, height: innerHeight },
      discoveredButtonCount: document.querySelectorAll('#touch-controls button.tbtn').length,
      hudScrollWidth: document.querySelector('#hud').scrollWidth,
      controls,
      overlaps,
      hudObstacles,
      hudOverlaps,
    };
  }, controlIds);
}

function validateControls(metrics, label) {
  const epsilon = 0.75;
  check(metrics.discoveredButtonCount === controlIds.length, label,
    `Expected ${controlIds.length} touch buttons, found ${metrics.discoveredButtonCount}`);
  check(metrics.hudScrollWidth <= metrics.viewport.width + epsilon, label, 'Touch HUD has horizontal overflow', {
    scrollWidth: metrics.hudScrollWidth,
    viewportWidth: metrics.viewport.width,
  });
  for (const control of metrics.controls) {
    const scope = `${label}:${control.id}`;
    check(!control.missing, scope, 'Touch control is missing');
    if (control.missing) continue;
    check(control.display !== 'none' && control.visibility === 'visible' && control.opacity > 0,
      scope, 'Touch control is not visibly rendered', control);
    check(control.pointerEvents !== 'none', scope, 'Touch control does not accept pointer events', control.pointerEvents);
    check(control.width >= 44 - epsilon && control.height >= 44 - epsilon,
      scope, 'Touch target is smaller than 44px', { width: control.width, height: control.height });
    check(control.x >= -epsilon && control.y >= -epsilon
      && control.right <= metrics.viewport.width + epsilon
      && control.bottom <= metrics.viewport.height + epsilon,
    scope, 'Touch control leaves the viewport', control);
  }
  check(metrics.overlaps.length === 0, label, 'Touch controls overlap', metrics.overlaps);
  check(metrics.hudOverlaps.length === 0, label, 'Touch controls overlap HUD readouts', metrics.hudOverlaps);
}

function touchPoint(id, x, y) {
  return { id, x, y, radiusX: 4, radiusY: 4, force: 1 };
}

async function dispatchTouch(session, type, points) {
  await session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
}

async function installInputProbe(page) {
  await page.evaluate(async () => {
    const { Input } = await import('./src/engine/input.js');
    const qa = window.__relayTouchQa = {
      input: null,
      heldEvents: [],
      moveSamples: [],
      lookSamples: [],
    };
    const originalSetHeld = Input.prototype.setHeld;
    const originalMoveAxis = Input.prototype.moveAxis;
    const originalConsumeLook = Input.prototype.consumeLook;
    Input.prototype.setHeld = function setHeldWithQa(action, down) {
      qa.input = this;
      const value = originalSetHeld.call(this, action, down);
      qa.heldEvents.push({ action, down: !!down, t: performance.now() });
      return value;
    };
    Input.prototype.moveAxis = function moveAxisWithQa() {
      qa.input = this;
      const value = originalMoveAxis.call(this);
      if (Math.hypot(value.x, value.z) > 0.01) qa.moveSamples.push({ ...value, t: performance.now() });
      return value;
    };
    Input.prototype.consumeLook = function consumeLookWithQa() {
      qa.input = this;
      const value = originalConsumeLook.call(this);
      if (Math.abs(value.yaw) + Math.abs(value.pitch) > 0.00001) qa.lookSamples.push({ ...value, t: performance.now() });
      return value;
    };
  });
  await page.waitForFunction(() => window.__relayTouchQa?.input);
}

async function readInputProbe(page) {
  return page.evaluate(() => {
    const qa = window.__relayTouchQa;
    const input = qa.input;
    return {
      heldEvents: qa.heldEvents.slice(),
      moveSamples: qa.moveSamples.slice(),
      lookSamples: qa.lookSamples.slice(),
      held: input ? Array.from(input.held) : [],
      moveId: input?._moveId ?? null,
      lookId: input?._lookId ?? null,
      touchMove: input ? { ...input.touchMove } : null,
      moveStick: input ? { ...input.moveStick } : null,
    };
  });
}

async function buttonCenter(page, id) {
  return page.evaluate((targetId) => {
    const r = document.getElementById(targetId).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, id);
}

async function testHeldButton(page, session, id, action, touchId) {
  await page.evaluate(() => { window.__relayTouchQa.heldEvents.length = 0; });
  const center = await buttonCenter(page, id);
  await dispatchTouch(session, 'touchStart', [touchPoint(touchId, center.x, center.y)]);
  await page.waitForTimeout(90);
  const during = await page.evaluate(({ targetId, targetAction }) => ({
    active: document.getElementById(targetId).classList.contains('active'),
    held: window.__relayTouchQa.input.held.has(targetAction),
    events: window.__relayTouchQa.heldEvents.slice(),
  }), { targetId: id, targetAction: action });
  await dispatchTouch(session, 'touchEnd', []);
  await page.waitForTimeout(90);
  const after = await page.evaluate(({ targetId, targetAction }) => ({
    active: document.getElementById(targetId).classList.contains('active'),
    held: window.__relayTouchQa.input.held.has(targetAction),
    events: window.__relayTouchQa.heldEvents.slice(),
  }), { targetId: id, targetAction: action });
  return { id, action, center, during, after };
}

function validateHeldButton(result, label) {
  check(result.during.active, label, `${result.id} does not show active state while held`, result);
  check(result.during.held, label, `${result.id} does not hold input action ${result.action}`, result);
  check(result.during.events.some((event) => event.action === result.action && event.down),
    label, `${result.id} did not emit ${result.action}=true`, result.during.events);
  check(!result.after.active, label, `${result.id} remains visually active after release`, result);
  check(!result.after.held, label, `${result.id} leaves ${result.action} held after release`, result);
  check(result.after.events.some((event) => event.action === result.action && !event.down),
    label, `${result.id} did not emit ${result.action}=false`, result.after.events);
}

async function runWiringChecks(browser, port) {
  const viewport = { width: 844, height: 390 };
  const { context, page, cdp: session } = await openTouchPage(browser, port, viewport, 'touch-wiring');
  try {
    await page.getByRole('button', { name: 'TAP TO PLAY' }).tap();
    await page.waitForFunction(() => !document.querySelector('#overlay')?.classList.contains('show'));
    await installInputProbe(page);
    await page.evaluate(() => {
      window.__relayTouchQa.moveSamples.length = 0;
      window.__relayTouchQa.lookSamples.length = 0;
    });
    const moveStart = touchPoint(1, 120, 180);
    const lookStart = touchPoint(2, 650, 180);
    const moveEnd = touchPoint(1, 162, 138);
    const lookEnd = touchPoint(2, 704, 148);
    await dispatchTouch(session, 'touchStart', [moveStart, lookStart]);
    await page.waitForTimeout(40);
    await dispatchTouch(session, 'touchMove', [moveEnd, lookEnd]);
    await page.waitForTimeout(140);
    const simultaneousDuring = await readInputProbe(page);
    await dispatchTouch(session, 'touchEnd', []);
    await page.waitForTimeout(100);
    const simultaneousAfter = await readInputProbe(page);

    const closestSampleGapMs = simultaneousDuring.moveSamples.reduce((closest, move) => (
      simultaneousDuring.lookSamples.reduce((inner, look) => Math.min(inner, Math.abs(move.t - look.t)), closest)
    ), Infinity);
    const simultaneous = {
      start: { move: moveStart, look: lookStart },
      moved: { move: moveEnd, look: lookEnd },
      during: simultaneousDuring,
      after: simultaneousAfter,
      closestMoveLookSampleGapMs: Number.isFinite(closestSampleGapMs)
        ? Number(closestSampleGapMs.toFixed(3))
        : null,
    };
    check(simultaneousDuring.moveId !== null && simultaneousDuring.lookId !== null,
      'touch-wiring:move-look', 'Move and look touches were not active simultaneously', simultaneousDuring);
    check(simultaneousDuring.moveSamples.length > 0,
      'touch-wiring:move-look', 'Simultaneous touch produced no movement input', simultaneousDuring);
    check(simultaneousDuring.lookSamples.length > 0,
      'touch-wiring:move-look', 'Simultaneous touch produced no look input', simultaneousDuring);
    check(Number.isFinite(closestSampleGapMs) && closestSampleGapMs <= 50,
      'touch-wiring:move-look', 'Move and look were not observed in the same frame window', { closestSampleGapMs });
    check(simultaneousAfter.moveId === null && simultaneousAfter.lookId === null,
      'touch-wiring:move-look', 'Move/look touch IDs remain captured after release', simultaneousAfter);
    check(Math.abs(simultaneousAfter.touchMove?.x || 0) < 0.001 && Math.abs(simultaneousAfter.touchMove?.z || 0) < 0.001,
      'touch-wiring:move-look', 'Movement remains non-zero after release', simultaneousAfter.touchMove);
    check(simultaneousAfter.moveStick?.active === false,
      'touch-wiring:move-look', 'Move-stick visual remains active after release', simultaneousAfter.moveStick);

    const slide = await testHeldButton(page, session, 'touch-slide', 'crouch', 11);
    validateHeldButton(slide, 'touch-wiring:slide');
    const time = await testHeldButton(page, session, 'touch-time', 'slowmo', 12);
    validateHeldButton(time, 'touch-wiring:time');

    const orbCenter = await buttonCenter(page, 'touch-orb');
    const orbBefore = await page.evaluate(() => Number(document.querySelector('#gren-num').textContent));
    await dispatchTouch(session, 'touchStart', [touchPoint(13, orbCenter.x, orbCenter.y)]);
    await page.waitForTimeout(90);
    const orbDuring = await page.evaluate(() => ({
      active: document.querySelector('#touch-orb').classList.contains('active'),
      grenades: Number(document.querySelector('#gren-num').textContent),
    }));
    await page.waitForTimeout(180);
    const orbHeld = await page.evaluate(() => ({
      active: document.querySelector('#touch-orb').classList.contains('active'),
      grenades: Number(document.querySelector('#gren-num').textContent),
    }));
    await dispatchTouch(session, 'touchEnd', []);
    await page.waitForTimeout(90);
    const orbAfter = await page.evaluate(() => ({
      active: document.querySelector('#touch-orb').classList.contains('active'),
      grenades: Number(document.querySelector('#gren-num').textContent),
    }));
    const orb = { center: orbCenter, before: orbBefore, during: orbDuring, held: orbHeld, after: orbAfter };
    check(orbDuring.active, 'touch-wiring:orb', 'ORB does not show active state on touchstart', orb);
    check(orbDuring.grenades === orbBefore - 1, 'touch-wiring:orb', 'ORB tap did not consume exactly one orb', orb);
    check(orbHeld.grenades === orbDuring.grenades, 'touch-wiring:orb', 'Holding ORB repeatedly consumed ammunition', orb);
    check(!orbAfter.active, 'touch-wiring:orb', 'ORB remains visually active after touchend', orb);
    check(orbAfter.grenades === orbDuring.grenades, 'touch-wiring:orb', 'ORB release changed ammunition', orb);

    return { viewport, simultaneous, slide, time, orb };
  } finally {
    await context.close();
  }
}

let server;
let browser;
try {
  check(Boolean(executablePath), 'environment', 'System Chrome was not found', chromeCandidates);
  if (!executablePath) throw new Error('System Chrome is required for this QA');
  server = await createStaticServer({ root: repoRoot, port: 0 });
  const port = server.address().port;
  browser = await chromium.launch({
    executablePath,
    headless: false,
    args: [
      '--use-angle=d3d11',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });

  for (const viewport of viewportCases) {
    const { context, page } = await openTouchPage(browser, port, viewport, viewport.label);
    try {
      if (!report.chrome.renderer) report.chrome.renderer = await readRenderer(page);
      const onboarding = await measureOnboarding(page);
      validateOnboarding(onboarding, `${viewport.label}:onboarding`);
      const controls = await measureControls(page);
      validateControls(controls, `${viewport.label}:controls`);
      report.viewports.push({ ...viewport, onboarding, controls });
    } finally {
      await context.close();
    }
  }

  check(!/SwiftShader|software/i.test(report.chrome.renderer || ''), 'environment',
    'Hardware renderer required; software renderer detected', report.chrome.renderer);
  check(/Direct3D11|D3D11/i.test(report.chrome.renderer || ''), 'environment',
    'D3D11 renderer required', report.chrome.renderer);
  report.wiring = await runWiringChecks(browser, port);
} catch (error) {
  fail('fatal', error?.message || String(error), error?.stack || String(error));
} finally {
  if (browser) await browser.close();
  if (server) {
    await new Promise((resolveClose) => server.close(() => resolveClose()));
  }
}

for (const error of report.pageErrors) fail(error.label, 'Browser page error', error.message);
for (const error of report.consoleErrors) fail(error.label, 'Browser console error', error.message);
report.pass = report.failures.length === 0;
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
