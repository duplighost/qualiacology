import { chromium } from 'playwright';

// Usage (with the repository static server already running):
//   node qa/lunar-guided-release.mjs http://127.0.0.1:4174/kick-ball-lunar-velocity/
const base = process.argv[2] || 'http://127.0.0.1:4174/kick-ball-lunar-velocity/';
const chargeScreenshotPath = process.env.LUNAR_QA_CHARGE_SCREENSHOT || '';
const failures = [];
const checks = [];
const diagnostics = {};
const check = (name, condition, detail = null) => {
  const passed = !!condition;
  checks.push({ name, passed, detail });
  if (!passed) failures.push(name);
};
const waitForGame = async page => {
  await page.waitForFunction(() => document.body.dataset.boot === 'ready'
    && document.body.dataset.firstFrame === 'true'
    && document.body.dataset.started === 'true', null, { timeout: 30000 });
};
const rectsOverlap = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 });
  const desktop = await desktopContext.newPage();
  const desktopErrors = [];
  desktop.on('pageerror', error => desktopErrors.push(`pageerror: ${error.message}`));
  desktop.on('console', message => {
    if (message.type() === 'error') desktopErrors.push(`console: ${message.text()}`);
  });
  await desktop.goto(`${base}?autostart&quality=HIGH&releaseqa=desktop`, { waitUntil: 'domcontentloaded' });
  await waitForGame(desktop);
  const desktopBoot = await desktop.evaluate(() => ({
    version: window.KICKBALL?.version,
    state: window.KICKBALL?.getState(),
    canvas: document.getElementById('gameCanvas')?.getBoundingClientRect().toJSON(),
  }));
  check('desktop-real-chrome-boots', desktopBoot.version === '3.4.0-guided-line'
    && desktopBoot.state?.started && desktopBoot.canvas?.width === 1440, desktopBoot);

  const canvasBox = await desktop.locator('#gameCanvas').boundingBox();
  const centerX = canvasBox.x + canvasBox.width / 2;
  const centerY = canvasBox.y + canvasBox.height / 2;
  // Production desktop intentionally consumes the first canvas gesture to
  // acquire pointer lock. Exercise that real entry path before gameplay input.
  const ensurePointerLock = async () => {
    if (await desktop.evaluate(() => document.pointerLockElement === document.getElementById('gameCanvas'))) return;
    await desktop.mouse.click(centerX, centerY);
    await desktop.waitForFunction(() => document.pointerLockElement === document.getElementById('gameCanvas'), null, { timeout: 5000 });
    await desktop.waitForTimeout(80);
  };
  await ensurePointerLock();
  const pointerLocked = await desktop.evaluate(() => document.pointerLockElement === document.getElementById('gameCanvas'));
  check('desktop-real-pointer-lock-acquired', pointerLocked, pointerLocked);
  await desktop.mouse.move(centerX, centerY);
  await ensurePointerLock();
  await desktop.mouse.down({ button: 'left' });
  await desktop.waitForTimeout(360);
  const chargedRing = await desktop.evaluate(() => {
    const ring = document.getElementById('chargeUI');
    const fill = document.getElementById('chargeFill');
    const rect = ring.getBoundingClientRect();
    return {
      active: ring.classList.contains('active'),
      ariaHidden: ring.getAttribute('aria-hidden'),
      anchor: ring.dataset.anchor,
      value: Number(ring.getAttribute('aria-valuenow')),
      dash: Number(fill.style.strokeDashoffset),
      rect: rect.toJSON(),
      pointerLocked: document.pointerLockElement === document.getElementById('gameCanvas'),
      paused: window.KICKBALL.getState().paused,
    };
  });
  if (chargeScreenshotPath) await desktop.screenshot({ path: chargeScreenshotPath });
  check('desktop-real-hold-shows-circular-charge', chargedRing.active && chargedRing.ariaHidden === 'false'
    && chargedRing.anchor === 'ball'
    && chargedRing.value >= 35 && chargedRing.value <= 75 && chargedRing.dash > 20 && chargedRing.dash < 65
    && chargedRing.rect.width === chargedRing.rect.height, chargedRing);
  await desktop.mouse.up({ button: 'left' });
  await desktop.waitForTimeout(120);
  const launched = await desktop.evaluate(() => window.KICKBALL.getState());
  check('desktop-real-release-launches', launched.ball.mode === 'outbound' && launched.stats.kicks === 1, launched.ball);

  await ensurePointerLock();
  await desktop.mouse.down({ button: 'right' });
  await desktop.waitForTimeout(110);
  const linkedBeforeAim = await desktop.evaluate(() => window.KICKBALL.getState());
  await desktop.mouse.move(centerX + 150, centerY - 20, { steps: 5 });
  await desktop.waitForTimeout(120);
  const linkedAfterAim = await desktop.evaluate(() => window.KICKBALL.getState());
  const aimVelocityDelta = Math.hypot(
    linkedAfterAim.ball.vx - linkedBeforeAim.ball.vx,
    linkedAfterAim.ball.vy - linkedBeforeAim.ball.vy,
    linkedAfterAim.ball.vz - linkedBeforeAim.ball.vz,
  );
  check('desktop-rmb-holds-line-and-guides-live-ball', linkedBeforeAim.lineHeld && linkedBeforeAim.lineActive
    && linkedBeforeAim.ball.tetherPoints >= 2 && linkedAfterAim.ball.mode === 'outbound'
    && Math.abs(linkedAfterAim.player.yaw - linkedBeforeAim.player.yaw) > .08 && aimVelocityDelta > 2, {
    before: linkedBeforeAim, after: linkedAfterAim, aimVelocityDelta,
  });

  const mouseLoopBefore = await desktop.evaluate(() => Number(document.body.dataset.mouseLoopCount) || 0);
  const radius = 54;
  await desktop.mouse.move(centerX + radius, centerY);
  for (let index = 1; index <= 32; index++) {
    const angle = index / 32 * Math.PI * 2;
    await desktop.mouse.move(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
    await desktop.waitForTimeout(11);
  }
  await desktop.waitForTimeout(80);
  const mouseSpin = await desktop.evaluate(() => ({
    count: Number(document.body.dataset.mouseLoopCount) || 0,
    direction: Number(document.body.dataset.mouseLoopDirection) || 0,
    state: window.KICKBALL.getState(),
  }));
  check('desktop-rmb-loop-spins-ball-while-outbound', mouseSpin.count > mouseLoopBefore
    && Math.abs(mouseSpin.direction) === 1 && mouseSpin.state.ball.mode === 'outbound'
    && mouseSpin.state.ball.flightSpinTimer > .5 && mouseSpin.state.player.spinTimer === 0, mouseSpin);
  await desktop.mouse.up({ button: 'right' });
  await desktop.waitForTimeout(80);
  const afterLoopRelease = await desktop.evaluate(() => window.KICKBALL.getState());
  check('desktop-loop-release-does-not-secretly-recall', afterLoopRelease.ball.mode === 'outbound', afterLoopRelease.ball);
  await desktop.mouse.click(centerX, centerY, { button: 'right', delay: 55 });
  await desktop.waitForTimeout(90);
  const afterQuickCall = await desktop.evaluate(() => window.KICKBALL.getState());
  check('desktop-quick-rmb-release-calls-ball', afterQuickCall.stats.kicks === 1
    && (afterQuickCall.ball.mode === 'returning' || afterQuickCall.ball.mode === 'ready'), afterQuickCall.ball);

  const performanceSample = await desktop.evaluate(() => new Promise(resolve => {
    const deltas = [];
    let previous = performance.now();
    const sample = now => {
      const delta = now - previous;
      previous = now;
      if (delta > 0 && delta < 100) deltas.push(delta);
      if (deltas.length < 240) requestAnimationFrame(sample);
      else {
        const sorted = [...deltas].sort((a, b) => a - b);
        const meanMs = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
        const gl = document.getElementById('gameCanvas').getContext('webgl2');
        const ext = gl?.getExtension('WEBGL_debug_renderer_info');
        resolve({
          frames: deltas.length,
          meanMs,
          meanFps: 1000 / meanMs,
          p95Ms: sorted[Math.floor(sorted.length * .95)],
          renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER),
          render: window.KICKBALL.getRenderStats(),
        });
      }
    };
    requestAnimationFrame(sample);
  }));
  diagnostics.performance = performanceSample;
  check('desktop-real-chrome-frame-sample-is-stable', performanceSample.frames === 240
    && performanceSample.meanFps >= 30 && performanceSample.p95Ms < 45, performanceSample);
  check('desktop-has-no-runtime-errors', desktopErrors.length === 0, desktopErrors);
  await desktopContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const mobile = await mobileContext.newPage();
  const mobileErrors = [];
  mobile.on('pageerror', error => mobileErrors.push(`pageerror: ${error.message}`));
  mobile.on('console', message => {
    if (message.type() === 'error') mobileErrors.push(`console: ${message.text()}`);
  });
  await mobile.goto(`${base}?autostart&touch&quality=MED&releaseqa=mobile`, { waitUntil: 'domcontentloaded' });
  await waitForGame(mobile);
  const mobileLayout = await mobile.evaluate(() => {
    const ids = [...document.querySelectorAll('#touchControls button')].map(button => button.id);
    const jump = document.getElementById('touchJump').getBoundingClientRect();
    const charge = document.getElementById('chargeUI').getBoundingClientRect();
    return {
      ids,
      jump: jump.toJSON(),
      charge: charge.toJSON(),
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
  check('mobile-landscape-keeps-minimal-free-thumb-layout', mobileLayout.ids.length === 2
    && mobileLayout.ids.includes('touchJump') && mobileLayout.ids.includes('touchPause')
    && !rectsOverlap(mobileLayout.jump, mobileLayout.charge), mobileLayout);

  await mobile.touchscreen.tap(650, 185);
  await mobile.waitForTimeout(100);
  const mobileKick = await mobile.evaluate(() => window.KICKBALL.getState());
  check('mobile-right-tap-kicks-home-ball', mobileKick.ball.mode === 'outbound' && mobileKick.stats.kicks === 1, mobileKick.ball);

  const mobileCdp = await mobileContext.newCDPSession(mobile);
  const touchPoint = (x, y, id = 1) => ({ x, y, id, radiusX: 8, radiusY: 8, force: .7 });
  await mobileCdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint(640, 190)] });
  await mobile.waitForTimeout(210);
  const mobileHeldLine = await mobile.evaluate(() => window.KICKBALL.getState());
  check('mobile-away-hold-energizes-line', mobileHeldLine.lineHeld && mobileHeldLine.lineActive
    && mobileHeldLine.ball.mode === 'outbound' && mobileHeldLine.ball.tetherPoints >= 2, mobileHeldLine);
  await mobileCdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobile.waitForTimeout(70);
  const mobileAfterHold = await mobile.evaluate(() => window.KICKBALL.getState());
  check('mobile-hold-release-does-not-call', mobileAfterHold.ball.mode === 'outbound', mobileAfterHold.ball);

  const touchLoopBefore = await mobile.evaluate(() => Number(document.body.dataset.touchLoopCount) || 0);
  const loopCenterX = 650;
  const loopCenterY = 190;
  const loopRadius = 42;
  await mobileCdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [touchPoint(loopCenterX + loopRadius, loopCenterY, 2)],
  });
  for (let index = 1; index <= 30; index++) {
    const angle = index / 30 * Math.PI * 2;
    await mobileCdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [touchPoint(loopCenterX + Math.cos(angle) * loopRadius, loopCenterY + Math.sin(angle) * loopRadius, 2)],
    });
    await mobile.waitForTimeout(12);
  }
  await mobile.waitForTimeout(60);
  const mobileSpin = await mobile.evaluate(() => ({
    count: Number(document.body.dataset.touchLoopCount) || 0,
    direction: Number(document.body.dataset.touchLoopDirection) || 0,
    state: window.KICKBALL.getState(),
  }));
  check('mobile-right-thumb-loop-spins-live-ball', mobileSpin.count > touchLoopBefore
    && Math.abs(mobileSpin.direction) === 1 && mobileSpin.state.ball.mode === 'outbound'
    && mobileSpin.state.ball.flightSpinTimer > .5, mobileSpin);
  await mobileCdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  await mobile.evaluate(() => window.KICKBALL.restart());
  await mobile.waitForTimeout(70);
  await mobileCdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint(650, 190, 3)] });
  await mobile.waitForTimeout(220);
  const mobileCharge = await mobile.evaluate(() => ({
    state: window.KICKBALL.getState(),
    active: document.getElementById('chargeUI').classList.contains('active'),
    value: Number(document.getElementById('chargeUI').getAttribute('aria-valuenow')),
  }));
  await mobileCdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await mobile.waitForTimeout(90);
  const mobileCancelled = await mobile.evaluate(() => ({
    state: window.KICKBALL.getState(),
    active: document.getElementById('chargeUI').classList.contains('active'),
    ariaHidden: document.getElementById('chargeUI').getAttribute('aria-hidden'),
  }));
  check('mobile-hold-charges-circular-ring', mobileCharge.active && mobileCharge.value > 0
    && mobileCharge.state.ball.mode === 'ready', mobileCharge);
  check('mobile-touch-cancel-clears-without-kick', !mobileCancelled.active && mobileCancelled.ariaHidden === 'true'
    && mobileCancelled.state.ball.mode === 'ready' && mobileCancelled.state.stats.kicks === 0, mobileCancelled);
  check('mobile-has-no-runtime-errors', mobileErrors.length === 0, mobileErrors);
  await mobileContext.close();

  const portraitContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const portrait = await portraitContext.newPage();
  await portrait.goto(`${base}?autostart&touch&quality=LOW&releaseqa=portrait`, { waitUntil: 'domcontentloaded' });
  await waitForGame(portrait);
  const portraitLayout = await portrait.evaluate(() => {
    const ring = document.getElementById('chargeUI').getBoundingClientRect();
    const jump = document.getElementById('touchJump').getBoundingClientRect();
    const crosshair = document.getElementById('crosshair').getBoundingClientRect();
    return {
      ring: ring.toJSON(), jump: jump.toJSON(), crosshair: crosshair.toJSON(),
      buttonCount: document.querySelectorAll('#touchControls button').length,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
  check('mobile-portrait-keeps-ball-feedback-clear-of-jump-and-aim', portraitLayout.buttonCount === 2
    && portraitLayout.ring.left >= 0 && portraitLayout.ring.right <= portraitLayout.viewport.width
    && !rectsOverlap(portraitLayout.ring, portraitLayout.jump)
    && !rectsOverlap(portraitLayout.ring, portraitLayout.crosshair), portraitLayout);
  await portraitContext.close();
} finally {
  await browser.close();
}

const result = { passed: failures.length === 0, checks, failures, diagnostics };
console.log(JSON.stringify({
  passed: result.passed,
  failures: result.failures,
  checks: result.checks.map(({ name, passed }) => ({ name, passed })),
  diagnostics: result.diagnostics,
}, null, 2));
if (!result.passed) process.exitCode = 1;
