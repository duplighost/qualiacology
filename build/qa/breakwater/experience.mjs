/**
 * BREAKWATER integration QA. This is development evidence, not shipped game code.
 * Real browser inputs are tested separately from developer-assisted enumeration.
 * No claim about campaign duration follows from loading or simulating sectors.
 *
 * From the repository root: node build/qa/breakwater/experience.mjs --help
 * Dependencies are the existing Playwright and @axe-core/playwright packages
 * in build/. No Python, image library, external server or new package is needed.
 * Chromium uses SwiftShader for repeatable cloud captures; its measured frame
 * times must never be reported as hardware-GPU performance.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = fileURLToPath(new globalThis.URL('../../../', import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const URL = option('url', process.env.BREAKWATER_QA_URL || 'http://127.0.0.1:4173/breakwater/?dev=1');
const OUTPUT = path.resolve(option('out', process.env.BREAKWATER_QA_OUT || process.env.BREAKWATER_QA_OUTPUT ||
  path.join(tmpdir(), `breakwater-qa-${new Date().toISOString().replaceAll(':', '-')}`)));
const CHROMIUM = option('chromium', process.env.BREAKWATER_CHROMIUM || process.env.BREAKWATER_QA_CHROMIUM || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH);
const WIDTH = Number(option('width', '1280')), HEIGHT = Number(option('height', '800'));
const FUNCTIONAL_QUALITY = option('functional-quality', 'high');
const WORLD_QUALITY = option('world-quality', 'high');
const CAPTURE_SIMULATION_SECONDS = Number(option('capture-simulation-seconds', '2'));
const CAPTURE_MIN_FRAMES = Number(option('capture-min-frames', '8'));
const sectorIndices = option('sectors', Array.from({ length: 25 }, (_, i) => i).join(',')).split(',').map(Number);
const SECRETS_ONLY = args.includes('--secrets-only');
const UI_ONLY = args.includes('--ui-only');
const NO_CAPTURES = args.includes('--no-captures');
const CAPTURES_ONLY = args.includes('--captures-only');
const SKIP_UI = args.includes('--skip-ui') || SECRETS_ONLY || CAPTURES_ONLY;
const REP_SECTORS = new Set([0, 4, 8, 12, 16, 20]);

if (args.includes('--help')) {
  console.log(`BREAKWATER browser experience QA
Usage: node build/qa/breakwater/experience.mjs [options]

Default: real UI/input/save checks, all 25 sector floor routes and secret
physics replays, plus six actual rendered district captures.

  --url=URL                    Game URL including ?dev=1
  --out=DIR                    Report/PNG directory (default: fresh OS temp folder)
  --chromium=PATH              Chromium executable (default: system or Playwright)
  --width=1280 --height=800    Browser viewport
  --ui-only                    Real input, accessibility, settings and save checks
  --skip-ui                    Only construction/navigation/render checks
  --secrets-only               Only secret access and return with Player physics
  --captures-only              Only rendered developer-assisted district views
  --no-captures                Skip district PNG captures during world checks
  --sectors=0,4,8,12,16,20     Selected sector indices (default: all 25)
  --functional-quality=low    Menu-selected profile for real input checks
  --world-quality=high        Profile for world/render checks
  --capture-min-frames=8       Continuous timing intervals before each PNG
  --capture-simulation-seconds=2
                               Actual fixed-step simulation before a capture;
                               recorded explicitly, never progression evidence

Environment: BREAKWATER_QA_URL, BREAKWATER_QA_OUT, BREAKWATER_CHROMIUM.
Aliases: BREAKWATER_QA_OUTPUT, BREAKWATER_QA_CHROMIUM,
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.
If no server answers a local HTTP URL, starts the repository static server at
that port and stops only that owned process afterward. Existing servers stay up.

Exit status is nonzero for unresolved assertions. report.json preserves raw
network notifications, decoded-payload hashes, source fingerprints, frame timing
and developer assistance. PNG readback alone briefly holds animation callbacks;
all preceding timing samples come from continuous rendering. No campaign-length,
normal-progression or hardware-smoothness claim follows from these checks.`);
  process.exit(0);
}
if (UI_ONLY && SKIP_UI) throw new Error('--ui-only cannot be combined with --skip-ui, --secrets-only or --captures-only.');
if (![WIDTH, HEIGHT].every(v => Number.isInteger(v) && v > 0)) throw new Error('Viewport dimensions must be positive integers.');
if (![FUNCTIONAL_QUALITY, WORLD_QUALITY].every(v => ['low', 'medium', 'high'].includes(v))) throw new Error('Quality must be low, medium or high.');
if (!sectorIndices.length || sectorIndices.some(v => !Number.isInteger(v) || v < 0 || v > 24)) throw new Error('Sector indices must be integers from 0 to 24.');
if (!Number.isInteger(CAPTURE_MIN_FRAMES) || CAPTURE_MIN_FRAMES < 1 || !Number.isFinite(CAPTURE_SIMULATION_SECONDS) || CAPTURE_SIMULATION_SECONDS < 0) throw new Error('Capture frame count and simulation seconds must be valid nonnegative values.');

const report = {
  startedAt: new Date().toISOString(), url: URL,
  environment: { rendererRequested: 'Chromium / ANGLE SwiftShader (CPU software renderer)', viewport: [WIDTH, HEIGHT], functionalQuality: FUNCTIONAL_QUALITY, worldQuality: WORLD_QUALITY },
  limitations: [
    'Software-renderer timing is measured in wall-clock frame intervals; it is not a hardware-GPU performance claim.',
    'Developer-assisted sector loading validates construction and capture only. It does not prove normal progression, combat balance, or two-hour campaign length.',
    'Screenshots document real rendered frames, including the gameplay camera; visual quality still requires human review.',
    'A finite floor at spawn or exit does not by itself establish that every route or secret is reachable.',
  ],
  checks: [], sectors: [], secrets: [], captures: [], networkFailures: [], httpErrors: [], pageErrors: [], consoleErrors: [], consoleWarnings: [],
};
let browser, context, page, ownedServer;
let mouseAt = { x: WIDTH / 2, y: HEIGHT / 2 };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const compactError = error => String(error?.stack || error);
const snapshot = () => page.evaluate(() => window.__BREAKWATER__.snapshot());
async function sourceFingerprints() {
  const names = ['main', 'world', 'player', 'weapon', 'input', 'combat', 'combat-visuals', 'effects', 'ui', 'materials', 'props', 'campaign', 'progression', 'storage', 'audio'];
  const files = [...names.map(name => [name, `breakwater/src/${name}.js`]), ['index.html', 'breakwater/index.html'], ['style.css', 'breakwater/style.css']];
  return Object.fromEntries(await Promise.all(files.map(async ([name, file]) => [name, createHash('sha256').update(await readFile(path.join(ROOT, file))).digest('hex')])));
}

function record(name, passed, details = {}) {
  const entry = { name, passed, ...details };
  report.checks.push(entry);
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${details.error ? `: ${details.error.split('\n')[0]}` : ''}`);
  return entry;
}
async function check(name, fn) {
  report.currentAction = name;
  const started = Date.now();
  let result;
  try { const details = await fn(); result = record(name, true, { wallMs: Date.now() - started, ...(details || {}) }); }
  catch (error) {
    let currentState;
    try { currentState = await page.evaluate(() => {
      const d = window.__BREAKWATER__;
      return d ? { snapshot: d.snapshot(), locked: d.input.locked, keys: [...d.input.keys], buttons: [...d.input.buttons],
        charge: d.weapon.charge, lanceDistance: d.weapon.distance, recentTrace: window.__qaTrace?.slice(-12) } : null;
    }); } catch {}
    result = record(name, false, { wallMs: Date.now() - started, action: report.currentAction, error: compactError(error), currentState });
  }
  await writeFile(path.join(OUTPUT, 'partial-report.json'), JSON.stringify(report, null, 2) + '\n');
  return result;
}
function requireCondition(condition, message) { if (!condition) throw new Error(message); }

async function ensureServer() {
  try {
    const response = await fetch(URL, { signal: AbortSignal.timeout(3500) });
    requireCondition(response.ok, `Existing server returned HTTP ${response.status}`);
    return;
  } catch (error) {
    // Do not replace a running service just because it returned an error.
    if (!/fetch failed|ECONNREFUSED/i.test(String(error))) throw error;
  }
  const target = new globalThis.URL(URL);
  if (target.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(target.hostname)) throw new Error('The configured game URL is unavailable; automatic startup only supports local HTTP URLs.');
  const port = Number(target.port || 80);
  console.log(`Starting the repository static server on port ${port}.`);
  ownedServer = spawn(process.execPath, ['build/scripts/static-server.mjs', '--root=.', `--port=${port}`], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
  });
  ownedServer.stderr.on('data', data => console.error(String(data).trim()));
  for (let i = 0; i < 30; i++) {
    await sleep(200);
    try { if ((await fetch(URL, { signal: AbortSignal.timeout(500) })).ok) return; } catch {}
  }
  throw new Error('Static server did not become available.');
}

async function boot() {
  await mkdir(OUTPUT, { recursive: true });
  report.sourceAtStart = await sourceFingerprints();
  await ensureServer();
  let executablePath = CHROMIUM;
  if (!executablePath && process.platform === 'linux') {
    for (const candidate of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
      try { await access(candidate); executablePath = candidate; break; } catch {}
    }
  }
  browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  page = await context.newPage();
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window), heldFrames = [];
    window.__qaHoldFrames = false;
    window.requestAnimationFrame = callback => nativeFrame(time => {
      if (window.__qaHoldFrames) heldFrames.push(callback); else callback(time);
    });
    window.__qaFreezeFrames = () => {
      window.__qaHoldFrames = true;
      return new Promise(resolve => nativeFrame(resolve));
    };
    window.__qaResumeFrames = () => {
      window.__qaHoldFrames = false;
      for (const callback of heldFrames.splice(0)) window.requestAnimationFrame(callback);
    };
    // Observe the bytes the loader actually decodes. Three wraps fetch streams
    // in a new Response, for which Chromium sometimes reports ERR_ABORTED even
    // after delivering the complete stream. Preserve failures unless these
    // exact decoded bytes and the resulting runtime asset both validate.
    window.__qaDecodedPayloads = [];
    const original = Response.prototype.arrayBuffer;
    Response.prototype.arrayBuffer = async function(...args) {
      const buffer = await original.apply(this, args);
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      window.__qaDecodedPayloads.push({ url: this.url || null, bytes: buffer.byteLength,
        sha256: [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('') });
      return buffer;
    };
  });
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => { report.pageErrors.push(error.message); console.error(`PAGE ERROR: ${error.message}`); });
  page.on('requestfailed', request => report.networkFailures.push({ url: request.url(), error: request.failure()?.errorText,
    time: new Date().toISOString(), action: report.currentAction || 'boot' }));
  page.on('response', response => { if (response.status() >= 400) report.httpErrors.push({ status: response.status(), url: response.url() }); });
  page.on('console', message => {
    if (message.type() === 'error') { report.consoleErrors.push(message.text()); console.error(`CONSOLE ERROR: ${message.text()}`); }
    if (message.type() === 'warning') report.consoleWarnings.push(message.text());
  });
  const started = Date.now();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  try {
    if (report.pageErrors.length) throw new Error(report.pageErrors.join('; '));
    await page.waitForFunction(() => window.__BREAKWATER__?.ready || document.querySelector('#load-status')?.textContent?.startsWith('Unable to start:'), null, { timeout: 65000 });
    requireCondition(await page.evaluate(() => !!window.__BREAKWATER__?.ready), 'Runtime displayed a startup failure.');
  }
  catch (error) {
    report.bootText = await page.locator('body').innerText();
    await page.screenshot({ path: path.join(OUTPUT, 'boot-failure.png') });
    throw new Error(`Game did not expose its ready API: ${report.bootText.slice(0, 700)}. ${error.message}`);
  }
  report.bootWallMs = Date.now() - started;
  report.environment.actual = await page.evaluate(() => {
    const d = window.__BREAKWATER__, gl = d.renderer.getContext(), extension = gl.getExtension('WEBGL_debug_renderer_info');
    return { vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      webgl: gl.getParameter(gl.VERSION), devicePixelRatio, renderPixelRatio: d.renderer.getPixelRatio(),
      buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], userAgent: navigator.userAgent };
  });
  await installTrace();
  await page.evaluate(() => window.__BREAKWATER__.world.ready || null);
}

async function installTrace() {
  // A read-only rAF observer records short-lived gameplay states between actions.
  // Avoid snapshot() here: copying diagnostic arrays every frame would skew timing.
  await page.evaluate(() => {
    window.__qaTrace = [];
    function observe(time) {
      const d = window.__BREAKWATER__;
      if (d) {
        window.__qaTrace.push({ time, panel: d.ui.activePanel, lance: d.weapon.state, charge: d.weapon.charge,
          distance: d.weapon.distance, dash: d.player.dashTime, dashCd: d.player.dashCd,
          sliding: d.player.sliding, grounded: d.player.grounded, velocityY: d.player.velocity.y,
          position: d.player.position.toArray(), yaw: d.player.yaw, pitch: d.player.pitch });
        if (window.__qaTrace.length > 1500) window.__qaTrace.shift();
      }
      requestAnimationFrame(observe);
    }
    requestAnimationFrame(observe);
  });
  await page.waitForFunction(() => window.__qaTrace?.length >= 3);
}

async function imageMetrics(filename) {
  // Decode the saved browser PNG in a separate 2D canvas. This measures actual
  // composited screenshot pixels without Python or a stale WebGL back-buffer.
  const imageURL = `data:image/png;base64,${(await readFile(filename)).toString('base64')}`;
  return page.evaluate(async imageURL => {
    const img = new Image(); img.src = imageURL; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 100;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = img.naturalWidth, h = img.naturalHeight;
    ctx.drawImage(img, w * .24, h * .25, w * .58, h * .47, 0, 0, 160, 100);
    const pixels = ctx.getImageData(0, 0, 160, 100).data, lumas = [], colors = new Set();
    let total = 0, black = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const luma = .2126 * r + .7152 * g + .0722 * b;
      total += luma; lumas.push(luma); if (luma < 5) black++;
      colors.add(`${r >> 3},${g >> 3},${b >> 3}`);
    }
    const mean = total / lumas.length;
    return { size: [w, h], centralMeanLuma: mean,
      centralLumaStdDev: Math.sqrt(lumas.reduce((sum, x) => sum + (x - mean) ** 2, 0) / lumas.length),
      centralNearBlackFraction: black / lumas.length, quantizedColors: colors.size };
  }, imageURL);
}

async function capture(name, extra = {}) {
  // UI panels have an intentional .22s opacity entrance; capture its settled state.
  await page.waitForFunction(() => [...document.querySelectorAll('.panel:not(.hidden)')]
    .every(el => getComputedStyle(el).display === 'none' || Number(getComputedStyle(el).opacity) >= .98));
  if (!extra.gameplayCamera) await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const filename = `${name}.png`;
  const full = path.join(OUTPUT, filename);
  if (extra.gameplayCamera) await page.evaluate(() => window.__qaFreezeFrames());
  try { await page.screenshot({ path: full, timeout: 45000 }); }
  finally { if (extra.gameplayCamera) await page.evaluate(() => window.__qaResumeFrames()); }
  const metrics = await imageMetrics(full);
  const item = { name, file: filename, ...extra, pixels: metrics, gameFramesHeldOnlyForScreenshot: !!extra.gameplayCamera };
  report.captures.push(item);
  return item;
}

async function axe(name) {
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const result = audit.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description,
    nodes: v.nodes.slice(0, 6).map(n => ({ html: n.html.slice(0, 450), target: n.target, failureSummary: n.failureSummary })) }));
  report.accessibility ||= {};
  report.accessibility[name] = result;
  return result;
}

async function clickFirst(selectors, fallbackName) {
  for (const selector of selectors) {
    const locator = page.locator(selector).filter({ visible: true });
    if (await locator.count() && await locator.first().isVisible()) {
      const bounds = await locator.first().boundingBox();
      if (bounds) mouseAt = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      await locator.first().click(); return selector;
    }
  }
  const byName = page.getByRole('button', { name: fallbackName });
  requireCondition(await byName.count() > 0, `No visible button matches ${fallbackName}`);
  const bounds = await byName.first().boundingBox();
  if (bounds) mouseAt = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  await byName.first().click();
  return `button name ${fallbackName}`;
}

async function realInputChecks() {
  await check('Menu: real rendering, semantic controls and unclipped layout', async () => {
    const state = await snapshot();
    requireCondition(state.mode === 'menu', `Expected menu, got ${state.mode}`);
    const semantic = await page.evaluate(() => {
      const names = [...document.querySelectorAll('button')].filter(el => !el.hidden && el.getClientRects().length)
        .map(el => ({ text: (el.getAttribute('aria-label') || el.textContent).trim(), disabled: el.disabled }));
      return { buttons: names, horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
        loadingHidden: document.querySelector('#loading')?.hidden,
        duplicateIds: [...new Set([...document.querySelectorAll('[id]')].map(el => el.id).filter((id, i, ids) => ids.indexOf(id) !== i))] };
    });
    requireCondition(semantic.loadingHidden, 'Loading overlay is still visible.');
    requireCondition(!semantic.horizontalOverflow, 'Menu overflows viewport horizontally.');
    requireCondition(!semantic.duplicateIds.length, `Duplicate DOM IDs: ${semantic.duplicateIds}`);
    requireCondition(semantic.buttons.length >= 2 && semantic.buttons.every(b => b.text), 'Missing/unnamed menu buttons.');
    const shot = await capture('01-menu');
    const violations = await axe('menu');
    record('Menu WCAG audit has no serious/critical violations', !violations.some(v => ['critical', 'serious'].includes(v.impact)), { violations });
    return { semantic, screenshot: shot.file, accessibilityViolationCount: violations.length };
  });

  if (FUNCTIONAL_QUALITY !== 'high') {
    await check('Apply explicit software-renderer functional-test quality through real settings UI', async () => {
      await page.locator('#menu-panel [data-action="settings"]').click();
      await page.locator('[data-setting="quality"]').selectOption(FUNCTIONAL_QUALITY);
      await page.locator('#settings-panel [data-action="back"]').click();
      return { quality: FUNCTIONAL_QUALITY, renderPixelRatio: await page.evaluate(() => window.__BREAKWATER__.renderer.getPixelRatio()),
        note: 'Initial menu capture used the default high setting; functional input tests use this declared lower software-renderer profile.' };
    });
  }

  await check('Start through an actual UI click and capture the mouse', async () => {
    const selector = await clickFirst(['[data-action="new"]', '[data-action="start"]', '#start-button', '[data-action="new-run"]'], /begin|new (?:run|game)|start/i);
    await page.waitForFunction(() => window.__BREAKWATER__.snapshot().mode === 'playing');
    await page.waitForFunction(() => window.__BREAKWATER__.input.locked, null, { timeout: 12000 });
    return { selector, snapshot: await snapshot() };
  });

  await check('Real WASD movement and pointer-lock mouse look', async () => {
    const before = await snapshot();
    const beforeAim = await page.evaluate(() => [window.__BREAKWATER__.player.yaw, window.__BREAKWATER__.player.pitch]);
    await page.keyboard.down('w');
    await page.waitForFunction(startZ => Math.abs(window.__BREAKWATER__.player.position.z - startZ) > 1.1, before.position[2], { timeout: 14000 });
    await page.keyboard.up('w');
    const pointerBefore = { ...mouseAt };
    await page.mouse.move(mouseAt.x + 35, mouseAt.y + 4, { steps: 3 });
    await page.waitForFunction(yaw => Math.abs(window.__BREAKWATER__.player.yaw - yaw) > .005, beforeAim[0], { timeout: 8000 });
    const observedAim = await page.evaluate(() => [window.__BREAKWATER__.player.yaw, window.__BREAKWATER__.player.pitch]);
    await page.mouse.move(pointerBefore.x, pointerBefore.y, { steps: 3 });
    const after = await snapshot();
    requireCondition(after.position.every(Number.isFinite), 'Movement produced a non-finite position.');
    requireCondition(after.position[1] > -5, 'Player fell beneath the route during initial movement.');
    return { start: before.position, end: after.position, displacement: Math.hypot(...after.position.map((v, i) => v - before.position[i])),
      observedAim };
  });

  await check('Real jump, dash and slide inputs reach their gameplay states', async () => {
    report.currentAction = 'jump: waiting for upward velocity';
    await page.keyboard.down('Space');
    await page.waitForFunction(() => window.__BREAKWATER__.player.velocity.y > 2, null, { timeout: 7000 });
    await page.keyboard.up('Space');
    report.currentAction = 'jump: waiting to land';
    await page.waitForFunction(() => window.__BREAKWATER__.player.grounded, null, { timeout: 12000 });
    await page.keyboard.down('w');
    report.currentAction = 'dash: waiting for cooldown activation';
    await page.keyboard.down('ShiftLeft');
    await page.waitForFunction(() => window.__BREAKWATER__.player.dashCd > .2, null, { timeout: 7000 });
    await page.keyboard.up('ShiftLeft');
    report.currentAction = 'dash: waiting for grounded movement';
    await page.waitForFunction(() => window.__BREAKWATER__.player.grounded && window.__BREAKWATER__.player.speed > 3, null, { timeout: 9000 });
    await page.keyboard.down('c');
    report.currentAction = 'slide: waiting for sliding state';
    await page.waitForFunction(() => window.__BREAKWATER__.player.sliding, null, { timeout: 7000 });
    await page.keyboard.up('c');
    await page.keyboard.up('w');
    return { observed: await page.evaluate(() => ({ jump: window.__qaTrace.some(s => s.velocityY > 2), dash: window.__qaTrace.some(s => s.dash > 0), slide: window.__qaTrace.some(s => s.sliding) })) };
  });

  await check('Real left/right mouse throw and recall complete a lance cycle', async () => {
    report.currentAction = 'lance: waiting for held mouse charge';
    await page.mouse.down({ button: 'left' });
    await page.waitForFunction(() => window.__BREAKWATER__.weapon.charge > .15, null, { timeout: 10000 });
    await page.mouse.up({ button: 'left' });
    report.currentAction = 'lance: waiting for outbound state';
    await page.waitForFunction(() => ['outbound', 'lodged'].includes(window.__BREAKWATER__.weapon.state), null, { timeout: 10000 });
    report.currentAction = 'lance: waiting for enough outward distance';
    await page.waitForFunction(() => window.__BREAKWATER__.weapon.distance >= 10 || window.__BREAKWATER__.weapon.state === 'lodged', null, { timeout: 12000 });
    const outward = await page.evaluate(() => ({ state: window.__BREAKWATER__.weapon.state, distance: window.__BREAKWATER__.weapon.distance }));
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
    report.currentAction = 'lance: waiting for return to hand';
    await page.waitForFunction(() => window.__BREAKWATER__.weapon.state === 'held', null, { timeout: 15000 });
    const states = await page.evaluate(() => [...new Set(window.__qaTrace.map(t => t.lance))]);
    requireCondition(states.includes('outbound'), 'No outbound state was observed after real input.');
    requireCondition(states.includes('returning'), 'No returning state was observed after real recall input.');
    const shot = await capture('02-first-person-after-input');
    requireCondition(shot.pixels.centralNearBlackFraction < .85 && shot.pixels.quantizedColors > 30, 'The gameplay viewport appears black/empty.');
    return { outward, observedStates: states, screenshot: shot.file, pixels: shot.pixels };
  });

  await check('Real Tab opens a keyboard-operable constellation; Escape/pause resumes', async () => {
    await page.keyboard.press('Tab');
    await page.waitForFunction(() => window.__BREAKWATER__.snapshot().mode === 'skills');
    await page.waitForFunction(() => document.activeElement?.classList.contains('skill-node'), null, { timeout: 10000 });
    const skillNames = await page.evaluate(() => [...document.querySelectorAll('button,[role="button"]')]
      .filter(el => el.getClientRects().length).map(el => ({ name: (el.getAttribute('aria-label') || el.textContent).trim(),
        tag: el.tagName, tabIndex: el.tabIndex, disabled: el.disabled || el.getAttribute('aria-disabled') === 'true' })));
    requireCondition(skillNames.some(b => /catch|drive|breaker|return/i.test(b.name)), 'No semantically named skill controls found.');
    await page.keyboard.press('ArrowDown');
    const focus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, name: (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || '').trim().slice(0, 160) }));
    requireCondition(!['BODY', 'HTML'].includes(focus.tag), 'Keyboard focus does not reach the skill interface.');
    // Buy through the actual semantically labelled node and button. No save edits.
    await page.locator('[data-action="select-skill"][data-skill="catchdrive"]').click();
    await page.locator('[data-action="buy-skill"]').click();
    await page.waitForFunction(() => window.__BREAKWATER__.getSave().skills.includes('catchdrive'));
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('qualiacology.breakwater.v1')));
    requireCondition(stored.skills.includes('catchdrive') && stored.skillPoints === 0, 'Purchased upgrade was not saved or consumed the wrong number of points.');
    const shot = await capture('03-constellation');
    const violations = await axe('skills');
    record('Constellation WCAG audit has no serious/critical violations', !violations.some(v => ['critical', 'serious'].includes(v.impact)), { violations });
    const resumeSelector = await clickFirst(['[data-action="exit-skills"]', '[data-action="resume"]', '[data-action="close-skills"]'], /return to|resume|back to (?:game|run)/i);
    await page.waitForFunction(() => window.__BREAKWATER__.snapshot().mode === 'playing');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__BREAKWATER__.snapshot().mode === 'paused');
    await capture('04-pause');
    await clickFirst(['[data-action="resume"]'], /resume|return to/i);
    await page.waitForFunction(() => window.__BREAKWATER__.snapshot().mode === 'playing');
    return { skillControls: skillNames, keyboardFocus: focus, boughtSkill: 'catchdrive', savedSkillPoints: stored.skillPoints,
      screenshot: shot.file, accessibilityViolationCount: violations.length, resumeSelector };
  });

  await check('Real settings controls apply and persist, then restore defaults', async () => {
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__BREAKWATER__.snapshot().mode === 'paused');
    await page.locator('#pause-panel [data-action="settings"]').click();
    const fov = page.locator('[data-setting="fov"]');
    await fov.focus();
    await fov.press('ArrowRight');
    await page.waitForFunction(() => window.__BREAKWATER__.getSave().settings.fov === 83);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('qualiacology.breakwater.v1')).settings);
    requireCondition(stored.fov === 83, 'FOV slider did not persist.');
    await fov.press('ArrowLeft');
    await page.locator('[data-setting="quality"]').selectOption('medium');
    await page.waitForFunction(() => window.__BREAKWATER__.getSave().settings.quality === 'medium');
    await page.locator('[data-setting="quality"]').selectOption(FUNCTIONAL_QUALITY);
    await capture('05-settings');
    await page.locator('#settings-panel [data-action="back"]').click();
    await page.locator('#pause-panel [data-action="resume"]').click();
    await page.waitForFunction(() => window.__BREAKWATER__.snapshot().mode === 'playing');
    return { persistedFovDuringTest: stored.fov, restored: await page.evaluate(() => window.__BREAKWATER__.getSave().settings) };
  });

  // Always release real input before independent world-construction inspection.
  for (const key of ['w', 'a', 's', 'd', 'Space', 'ShiftLeft', 'c']) await page.keyboard.up(key);
  await page.mouse.up({ button: 'left' });
  await page.mouse.up({ button: 'right' });
  report.realInputTrace = await page.evaluate(() => window.__qaTrace);

  await check('Saved skill/settings survive a browser reload and real Continue click', async () => {
    report.previousDocumentDecodedPayloads = await page.evaluate(() => window.__qaDecodedPayloads || []);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__BREAKWATER__?.ready, null, { timeout: 65000 });
    await installTrace();
    const saved = await page.evaluate(() => window.__BREAKWATER__.getSave());
    requireCondition(saved.skills.includes('catchdrive'), 'Skill missing after reloading saved progress.');
    requireCondition(saved.settings.fov === 82 && saved.settings.quality === FUNCTIONAL_QUALITY, 'Settings restoration missing after reload.');
    await page.locator('[data-action="continue"]').click();
    await page.waitForFunction(() => window.__BREAKWATER__.snapshot().mode === 'playing');
    return { skills: saved.skills, sector: saved.sector, checkpoint: saved.checkpoint };
  });
}

async function inspectSector(index) {
  await page.evaluate(index => window.__BREAKWATER__.loadSector(index, true), index);
  await page.waitForFunction(index => window.__BREAKWATER__.snapshot().sector === index, index);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const inspection = await page.evaluate(() => {
    const d = window.__BREAKWATER__, w = d.world, state = d.snapshot();
    const floor = point => {
      const value = w.floorAt(point.x, point.z, point.y);
      return Number.isFinite(value) ? value : null;
    };
    const overlap = point => w.solids.filter(b => b.active !== false && point.y + 1.72 > b.minY + .02 && point.y < b.maxY - .45 &&
      point.x + .36 > b.minX && point.x - .36 < b.maxX && point.z + .36 > b.minZ && point.z - .36 < b.maxZ).length;
    const arenas = w.arenas.map((a, i) => ({ index: i, center: a.center.toArray(), width: a.width, length: a.length,
      triggerZ: a.triggerZ, centerFloor: floor(a.center), spawnPoints: (a.spawnPoints || []).map(p => ({ position: p.toArray(), floor: floor(p), solidOverlap: overlap(p) })) }));
    // A bounded coarse walk-grid checks the physical main route with gates open.
    // It permits ramps/steps but deliberately does not credit swimming, jumping,
    // ladder teleports, enemy clearance or normal campaign progression.
    const stride = 1.25;
    const minX = Math.min(w.spawn.x, w.exit.x, ...w.arenas.map(a => a.center.x - a.width / 2)) - 5;
    const maxX = Math.max(w.spawn.x, w.exit.x, ...w.arenas.map(a => a.center.x + a.width / 2)) + 5;
    const minZ = w.exit.z - 3, maxZ = w.spawn.z + 3;
    const queue = [{ x: w.spawn.x, y: w.spawn.y, z: w.spawn.z, steps: 0 }];
    const seen = new Set();
    let routeFound = false, pathSteps = null, examined = 0;
    for (let cursor = 0; cursor < queue.length && cursor < 18000; cursor++) {
      const p = queue[cursor]; examined++;
      if (Math.hypot(p.x - w.exit.x, p.z - w.exit.z) < 2.5 && Math.abs(p.y - w.exit.y) < .65) { routeFound = true; pathSteps = p.steps; break; }
      for (const [dx, dz] of [[stride, 0], [-stride, 0], [0, stride], [0, -stride]]) {
        const x = p.x + dx, z = p.z + dz;
        if (x < minX || x > maxX || z < minZ || z > maxZ) continue;
        const y = w.floorAt(x, z, p.y);
        if (!Number.isFinite(y) || y - p.y > .58 || p.y - y > 1.0) continue;
        const key = `${Math.round((x - w.spawn.x) / stride)},${Math.round((z - w.spawn.z) / stride)},${Math.round(y * 4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const q = { x, y, z, steps: p.steps + 1 };
        if (overlap(q)) continue;
        queue.push(q);
      }
    }
    let sceneMeshes = 0, sceneLights = 0, invalidTransforms = 0;
    d.scene.traverse(o => { if (o.isMesh) sceneMeshes++; if (o.isLight) sceneLights++; if (![o.position.x, o.position.y, o.position.z, o.scale.x, o.scale.y, o.scale.z].every(Number.isFinite)) invalidTransforms++; });
    return { index: state.sector, name: state.sectorName, mode: state.mode, spawn: w.spawn.toArray(), spawnFloor: floor(w.spawn),
      spawnSolidOverlap: overlap(w.spawn), exit: w.exit.toArray(), exitFloor: floor(w.exit), arenas,
      player: { position: state.position, health: state.health, grounded: state.grounded },
      solids: w.solids.length, activeSolids: w.solids.filter(s => s.active !== false).length,
      pickups: w.pickups.map(p => ({ id: p.id, type: p.type, position: p.position.toArray() })),
      sceneMeshes, sceneLights, invalidTransforms, memory: { ...d.renderer.info.memory },
      load: state.diagnostics.loads.at(-1), assetErrors: state.diagnostics.assetErrors, runtimeErrors: state.diagnostics.errors,
      environment: !!d.scene.environment, fog: d.scene.fog?.type || null,
      navigation: { coarseWalkRouteFound: routeFound, gridMetres: stride, examined, pathSteps,
        note: 'Open-gate walk-grid diagnostic; no jumping, swimming or ladders credited, not a player completion run.' },
    };
  });
  report.sectors.push(inspection);
  requireCondition(inspection.index === index, `Loaded ${inspection.index}, requested ${index}`);
  requireCondition(inspection.spawnFloor !== null && inspection.exitFloor !== null, 'Spawn or exit has no finite accessible floor.');
  requireCondition(inspection.spawnSolidOverlap === 0, `Spawn overlaps ${inspection.spawnSolidOverlap} blocking solids.`);
  requireCondition(inspection.invalidTransforms === 0, 'Scene includes non-finite transforms.');
  requireCondition(inspection.arenas.length >= 2, 'Sector has too few arenas.');
  requireCondition(inspection.arenas.every(a => a.width > 0 && a.length > 0 && Number.isFinite(a.triggerZ)), 'Invalid arena dimensions/trigger.');
  requireCondition(inspection.arenas.every(a => a.spawnPoints.length && a.spawnPoints.every(p => p.floor !== null)), 'Enemy spawn point is unsupported by a floor.');
  requireCondition(inspection.navigation.coarseWalkRouteFound, `No coarse walk route found from spawn to exit (${inspection.navigation.examined} grid nodes); inspect route geometry.`);
  requireCondition(inspection.assetErrors.length === 0 && inspection.runtimeErrors.length === 0, 'Game diagnostics contains asset/runtime errors.');
  return { sector: index, sectorName: inspection.name, solids: inspection.solids, meshes: inspection.sceneMeshes, arenas: inspection.arenas.length };
}

async function inspectSecrets(index, load = false) {
  if (load) await page.evaluate(index => window.__BREAKWATER__.loadSector(index, false), index);
  const results = await page.evaluate(async () => {
    const d = window.__BREAKWATER__, w = d.world;
    const { Player } = await import('/breakwater/src/player.js');
    return w.pickups.filter(p => p.type === 'secret').map(secret => {
      const arena = w.arenas.reduce((best, a) => Math.abs(a.center.z - secret.position.z) < Math.abs(best.center.z - secret.position.z) ? a : best);
      const stride = .4, radius = .36, height = 1.72;
      const bounds = { minX: arena.center.x - arena.width / 2 - 4, maxX: secret.position.x + 5,
        minZ: arena.center.z - arena.length / 2 - 4, maxZ: arena.center.z + arena.length / 2 + 4 };
      const solids = w.solids.filter(b => b.active !== false && b.maxX >= bounds.minX - 1 && b.minX <= bounds.maxX + 1 && b.maxZ >= bounds.minZ - 1 && b.minZ <= bounds.maxZ + 1);
      const blocked = p => solids.some(b => p.y + height > b.minY + .02 && p.y < b.maxY - .45 &&
        p.x + radius > b.minX && p.x - radius < b.maxX && p.z + radius > b.minZ && p.z - radius < b.maxZ);
      const seed = { x: arena.center.x, y: arena.center.y, z: arena.center.z + arena.length / 2 + 1 };
      seed.y = w.floorAt(seed.x, seed.z, seed.y);
      const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      // Each walk edge is swept at 10 cm and must work in both directions.
      // The standing body matches Player.step(), and pickup uses the real 1.8 m radius.
      const walk = (from, x, z) => {
        let y = from.y;
        const samples = Math.max(4, Math.ceil(Math.hypot(x - from.x, z - from.z) / .1));
        for (let step = 1; step <= samples; step++) {
          const t = step / samples, q = { x: from.x + (x - from.x) * t, z: from.z + (z - from.z) * t };
          q.y = w.floorAt(q.x, q.z, y);
          if (!Number.isFinite(q.y) || Math.abs(q.y - y) > .58 || blocked(q)) return null;
          y = q.y;
        }
        return { x, y, z };
      };
      const key = p => `${Math.round((p.x - seed.x) / stride)},${Math.round((p.z - seed.z) / stride)},${Math.round(p.y * 10)}`;
      const queue = [{ ...seed, previous: -1 }], seen = new Set([key(seed)]);
      let endpoint = -1, examined = 0, goalJoin = null;
      if (Number.isFinite(seed.y) && !blocked(seed)) {
        for (let cursor = 0; cursor < queue.length && cursor < 40000; cursor++) {
          const p = queue[cursor]; examined++;
          if (distance(p, secret.position) < 1.79) { endpoint = cursor; break; }
          // A pickup on a desk can leave a narrow valid approach crescent.
          // Refine near-goal positions continuously instead of calling grid
          // quantization a blocked secret.
          if (distance(p, secret.position) < 3) {
            for (let angle = 0; angle < 32; angle++) {
              const radians = angle / 32 * Math.PI * 2;
              const q = walk(p, secret.position.x + Math.cos(radians) * .9, secret.position.z + Math.sin(radians) * .9);
              if (q && distance(q, secret.position) < 1.79 && walk(q, p.x, p.z)) { endpoint = cursor; goalJoin = q; break; }
            }
            if (endpoint >= 0) break;
          }
          for (const [dx, dz] of [[stride, 0], [-stride, 0], [0, stride], [0, -stride]]) {
            const x = p.x + dx, z = p.z + dz;
            if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) continue;
            const q = walk(p, x, z);
            if (!q || !walk(q, p.x, p.z)) continue;
            const k = key(q);
            if (seen.has(k)) continue;
            seen.add(k); queue.push({ ...q, previous: cursor });
          }
        }
      }
      const route = [];
      for (let cursor = endpoint; cursor >= 0; cursor = queue[cursor].previous) {
        const { x, y, z } = queue[cursor]; route.push({ x, y, z });
      }
      route.reverse();
      if (goalJoin) route.push(goalJoin);
      // Replay the returned geometry route with the actual unmodified Player
      // class at fixed60 Hz. This is a physics diagnostic, not real-input proof.
      const replay = path => {
        if (!path.length) return { passed: false, error: 'No walk route available.' };
        const axis = { x: 0, z: 0 };
        const input = { axis: () => axis, pressed: () => false, down: () => false, look: () => ({ x: 0, y: 0 }) };
        let fell = false, frames = 0, largestSupportedHeightDifference = 0;
        const actor = new Player(w, input, { sfx() {} }, { burst() {} }, () => { fell = true; });
        actor.reset(d.player.position.clone().set(path[0].x, path[0].y, path[0].z));
        for (let i = 1; i < path.length; i++) {
          const target = path[i]; let reached = false;
          for (let frame = 0; frame < 120; frame++) {
            const dx = target.x - actor.position.x, dz = target.z - actor.position.z;
            const horizontal = Math.hypot(dx, dz);
            // Player also supports the tops of solids up to .46 m above the
            // floor polygons. Let real physics establish that support surface.
            const supportedDifference = Math.abs(target.y - actor.position.y);
            if (horizontal < .035 && supportedDifference < .46) {
              largestSupportedHeightDifference = Math.max(largestSupportedHeightDifference, supportedDifference);
              reached = true; break;
            }
            const speedFraction = Math.min(.4, horizontal * 1.8);
            axis.x = horizontal > .001 ? dx / horizontal * speedFraction : 0;
            axis.z = horizontal > .001 ? -dz / horizontal * speedFraction : 0;
            actor.step(1 / 60); frames++;
            if (fell) break;
          }
          if (!reached) return { passed: false, waypoint: i, target, actual: actor.position.toArray(), fell, frames };
        }
        return { passed: !fell, position: actor.position.toArray(), frames, largestSupportedHeightDifference,
          pickupDistance: actor.position.distanceTo(secret.position) };
      };
      const outbound = replay(route), returnTrip = outbound.passed ? replay([...route].reverse()) : { passed: false, error: 'Outbound route did not replay.' };
      return { sector: w.sector.index, id: secret.id, pickup: secret.position.toArray(), approach: [seed.x, seed.y, seed.z],
        gridMetres: stride, examined, walkRouteFound: endpoint >= 0, routePoints: route.length,
        outbound, returnTrip, route, closestExploredMetres: queue.reduce((best, p) => Math.min(best, distance(p, secret.position)), Infinity),
        closestExploredPoint: queue.reduce((best, p) => distance(p, secret.position) < distance(best, secret.position) ? p : best),
        baselineJumpNeeded: endpoint >= 0 ? false : null, note: 'Developer-assisted open-gate geometry and actual Player physics replay; walking only, no skill, swimming, ladder, teleport or campaign-duration credit.' };
    });
  });
  report.secrets.push(...results);
  requireCondition(results.length > 0, `Sector ${index} has no secret pickup.`);
  for (const result of results) {
    requireCondition(result.walkRouteFound, `${result.id}: no standing-body walk route; closest explored ${result.closestExploredMetres.toFixed(2)} m from pickup ${result.pickup}.`);
    requireCondition(result.outbound.passed && result.outbound.pickupDistance < 1.8, `${result.id}: actual Player could not reach pickup: ${JSON.stringify(result.outbound)}.`);
    requireCondition(result.returnTrip.passed, `${result.id}: actual Player could not return to main approach: ${JSON.stringify(result.returnTrip)}.`);
  }
  return { sector: index, secrets: results.map(r => ({ id: r.id, pickup: r.pickup, routePoints: r.routePoints,
    outboundFrames: r.outbound.frames, returnFrames: r.returnTrip.frames, baselineJumpNeeded: r.baselineJumpNeeded })) };
}

function timingStats(intervals) {
  const valid = intervals.filter(x => Number.isFinite(x) && x > 0), sorted = [...valid].sort((a, b) => a - b);
  const mean = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  const quantile = p => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] : null;
  return { sampleFrames: valid.length, meanFrameMs: mean, medianFrameMs: quantile(.5), p95FrameMs: quantile(.95),
    approximateWallClockFps: mean ? 1000 / mean : null, framesOver50ms: valid.filter(v => v > 50).length,
    framesOver100ms: valid.filter(v => v > 100).length };
}

async function representativeCapture(index) {
  // Developer placement is used only to observe each district from a gameplay
  // camera near its first arena. It is not counted as movement/progression QA.
  const requestedPoses = { 0: [-4, 8, -.22, .06], 4: [-7, 6, -.35, .18], 8: [6, 7, .22, .06],
    12: [-3, 8, -.30, .11], 16: [4, 8, .35, .10], 20: [-5, 8, -.28, .15] };
  const pose = await page.evaluate(({ offset, simulationSeconds }) => {
    const d = window.__BREAKWATER__, a = d.world.arenas[0];
    let x = a.center.x + offset[0], z = a.center.z + offset[1];
    const valid = (xx, zz) => {
      const y = d.world.floorAt(xx, zz, a.center.y);
      return Number.isFinite(y) && !d.world.solids.some(b => b.active !== false && y + 1.72 > b.minY + .02 && y < b.maxY - .45 &&
        xx + .36 > b.minX && xx - .36 < b.maxX && zz + .36 > b.minZ && zz - .36 < b.maxZ);
    };
    const requested = [x, z];
    if (!valid(x, z)) {
      const candidates = [];
      for (let dx = -4; dx <= 4; dx += .5) for (let dz = -4; dz <= 4; dz += .5) if (valid(x + dx, z + dz)) candidates.push([x + dx, z + dz, dx * dx + dz * dz]);
      candidates.sort((a, b) => a[2] - b[2]);
      if (!candidates.length) throw new Error('Requested capture area has no safe standing point.');
      [x, z] = candidates[0];
    }
    const floor = d.world.floorAt(x, z, a.center.y);
    d.setPosition(x, floor + .02, z); d.setAim(offset[2], offset[3]);
    // Actual fixed-step gameplay simulation releases the normal wave queue.
    // This avoids waiting dozens of CPU-rendered frames for the .7 s gate beat;
    // record it explicitly, never as input/progression or duration evidence.
    for (let frame = 0; frame < Math.round(simulationSeconds * 60); frame++) d.step(1 / 60);
    return { requestedXZ: requested, selected: [x, floor + .02, z], yaw: offset[2], pitch: offset[3] };
  }, { offset: requestedPoses[index] || [0, 8, 0, .04], simulationSeconds: CAPTURE_SIMULATION_SECONDS });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const firstTime = await page.evaluate(() => performance.now());
  let sampleWindowTimedOut = false;
  try { await page.waitForFunction(({ start, frames }) => window.__qaTrace.filter(x => x.time >= start).length >= frames + 1,
    { start: firstTime, frames: CAPTURE_MIN_FRAMES }, { timeout: 30000 }); }
  catch { sampleWindowTimedOut = true; }
  const observations = await page.evaluate(start => ({
    intervals: window.__qaTrace.filter(x => x.time >= start).map((x, i, all) => i ? x.time - all[i - 1].time : null).filter(Boolean),
    enemies: window.__BREAKWATER__.snapshot().enemyCount,
    mode: window.__BREAKWATER__.snapshot().mode,
    health: window.__BREAKWATER__.player.health,
    drawCalls: window.__BREAKWATER__.renderer.info.render.calls,
    triangles: window.__BREAKWATER__.renderer.info.render.triangles,
    renderedPixelRatio: window.__BREAKWATER__.renderer.getPixelRatio(),
    position: window.__BREAKWATER__.player.position.toArray(),
  }), firstTime);
  const file = `district-${String(index / 4 + 1).padStart(2, '0')}-sector-${String(index).padStart(2, '0')}`;
  const shot = await capture(file, { sector: index, gameplayCamera: true, developerPlacement: true,
    pose, sampleWindowTimedOut, developerSimulationSeconds: CAPTURE_SIMULATION_SECONDS,
    observations: { ...observations, intervals: undefined }, softwareTiming: timingStats(observations.intervals) });
  requireCondition(shot.pixels.centralMeanLuma > 5 && shot.pixels.centralNearBlackFraction < .85 && shot.pixels.quantizedColors > 30,
    `District ${index} central rendered area appears black/empty: ${JSON.stringify(shot.pixels)}`);
  return { sector: index, screenshot: shot.file, pixels: shot.pixels, softwareTiming: shot.softwareTiming,
    enemiesInSimulation: observations.enemies, note: 'Not a normal-progression or campaign-duration test.' };
}

async function worldChecks() {
  // Reset any menus/pressed keys without using this reset as evidence of UI input.
  await page.evaluate(quality => { window.__BREAKWATER__.input.clear(); window.__BREAKWATER__.settings({ quality, shake: 0 }); }, SECRETS_ONLY ? 'low' : WORLD_QUALITY);
  for (const index of sectorIndices) {
    if (CAPTURES_ONLY) {
      await page.evaluate(index => window.__BREAKWATER__.loadSector(index, true), index);
      await check(`Rendered district evidence and software timing: sector ${index}`, () => representativeCapture(index));
      continue;
    }
    if (SECRETS_ONLY) {
      await check(`Secret access and return: sector ${String(index).padStart(2, '0')}`, () => inspectSecrets(index, true));
      continue;
    }
    const result = await check(`Developer enumeration: sector ${String(index).padStart(2, '0')} constructs with valid floors`, () => inspectSector(index));
    await check(`Secret access and return: sector ${String(index).padStart(2, '0')}`, () => inspectSecrets(index));
    if (!NO_CAPTURES && REP_SECTORS.has(index) && report.sectors.at(-1)?.index === index) {
      await check(`Rendered district evidence and software timing: sector ${index}`, () => representativeCapture(index));
    }
  }
  if (sectorIndices.length === 25 && !SECRETS_ONLY && !CAPTURES_ONLY) {
    const baseline = report.sectors.find(s => s.index === 0)?.memory;
    await page.evaluate(() => window.__BREAKWATER__.loadSector(0, true));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const after = await page.evaluate(() => ({ ...window.__BREAKWATER__.renderer.info.memory }));
    report.memoryReturnToFirstSector = { before: baseline, after, note: 'Different combat states can retain a small number of legitimate effect/weapon geometries.' };
  }
  report.finalSnapshot = await snapshot();
}

async function validateNetworkNotifications() {
  const runtime = await page.evaluate(() => ({
    payloads: window.__qaDecodedPayloads || [],
    sky: !!window.__BREAKWATER__?.world?._photoSky,
    props: window.__BREAKWATER__?.world?.props ? {
      names: window.__BREAKWATER__.world.props.names,
      errors: window.__BREAKWATER__.world.props.errors,
      stats: window.__BREAKWATER__.world.props.stats,
    } : null,
  }));
  runtime.payloads.push(...(report.previousDocumentDecodedPayloads || []));
  report.decodedPayloads = runtime.payloads;
  report.loadedAssetState = { sky: runtime.sky, props: runtime.props };
  for (const failure of report.networkFailures) {
    const pathname = new globalThis.URL(failure.url).pathname;
    const known = pathname === '/breakwater/assets/sky/coastal-clouds-2k.hdr' ? runtime.sky :
      /^\/breakwater\/assets\/props\/[^/]+\/[^/]+\.(?:gltf|glb|bin)$/.test(pathname) && runtime.props?.stats?.models >= 6 &&
        runtime.props?.stats?.models === runtime.props?.names?.length && !runtime.props?.errors?.length;
    if (failure.error !== 'net::ERR_ABORTED' || !known) continue;
    const file = await readFile(path.join(ROOT, pathname));
    const sha256 = createHash('sha256').update(file).digest('hex');
    const decoded = runtime.payloads.find(p => p.bytes === file.length && p.sha256 === sha256);
    if (decoded) {
      failure.validatedLoaded = true;
      failure.bytes = file.length;
      failure.sha256 = sha256;
      failure.note = 'Chromium reported an aborted underlying streamed request, but the exact complete bytes were observed in Response.arrayBuffer(), matched the local source SHA-256, and the asset successfully decoded into the ready world.';
    }
  }
  const unresolved = report.networkFailures.filter(f => !f.validatedLoaded);
  record('No unresolved page, HTTP, network or console errors', !report.pageErrors.length && !report.httpErrors.length && !unresolved.length && !report.consoleErrors.length,
    { pageErrors: report.pageErrors, httpErrors: report.httpErrors, unresolvedNetworkFailures: unresolved,
      validatedStreamAbortNotifications: report.networkFailures.filter(f => f.validatedLoaded), consoleErrors: report.consoleErrors });
}

async function writeSummary() {
  report.finishedAt = new Date().toISOString();
  report.sourceAtEnd = await sourceFingerprints();
  report.changedDuringRun = Object.keys(report.sourceAtStart || {}).filter(name => report.sourceAtStart[name] !== report.sourceAtEnd[name]);
  report.summary = {
    passed: report.checks.filter(c => c.passed).length,
    failed: report.checks.filter(c => !c.passed).length,
    sectorsInspected: report.sectors.length,
    pageErrors: report.pageErrors.length, httpErrors: report.httpErrors.length,
    networkFailures: report.networkFailures.filter(f => !f.validatedLoaded).length,
    validatedStreamAbortNotifications: report.networkFailures.filter(f => f.validatedLoaded).length, consoleErrors: report.consoleErrors.length,
  };
  await mkdir(OUTPUT, { recursive: true });
  const districts = report.captures.filter(c => c.name.startsWith('district-'));
  if (districts.length) {
    try {
      const items = await Promise.all(districts.map(async c => ({ name: c.name,
        src: `data:image/png;base64,${(await readFile(path.join(OUTPUT, c.file))).toString('base64')}` })));
      const dataURL = await page.evaluate(async items => {
        const canvas = document.createElement('canvas'), tileW = 640, tileH = 426;
        canvas.width = tileW * 3; canvas.height = tileH * Math.ceil(items.length / 3);
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#0c1317'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px sans-serif'; ctx.fillStyle = '#ebdbc0';
        for (let i = 0; i < items.length; i++) {
          const img = new Image(); img.src = items[i].src; await img.decode();
          const scale = Math.min(tileW / img.naturalWidth, 400 / img.naturalHeight);
          const x = i % 3 * tileW, y = Math.floor(i / 3) * tileH;
          ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
          ctx.fillText(items[i].name, x + 10, y + 417);
        }
        return canvas.toDataURL('image/jpeg', .94);
      }, items);
      await writeFile(path.join(OUTPUT, 'district-contact-sheet.jpg'), Buffer.from(dataURL.split(',')[1], 'base64'));
      report.districtContactSheet = 'district-contact-sheet.jpg';
    } catch (error) { report.contactSheetError = String(error); }
  }
  await writeFile(path.join(OUTPUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  const lines = [
    '# BREAKWATER integration QA', '',
    `Run: ${report.startedAt}`, `URL: ${report.url}`, '',
    `Checks: ${report.summary.passed} passed; ${report.summary.failed} failed. Sectors inspected: ${report.summary.sectorsInspected}.`,
    `Runtime errors: ${report.summary.pageErrors} page; ${report.summary.consoleErrors} console; ${report.summary.httpErrors} HTTP; ${report.summary.networkFailures} network.`, '',
    ...report.limitations.map(s => `- ${s}`), '',
    '## Failed checks', '',
    ...report.checks.filter(c => !c.passed).map(c => `- **${c.name}**: ${c.error?.split('\n')[0] || 'Failed'}`), '',
    '## Rendered evidence', '',
    ...report.captures.map(c => `- [${c.name}](${c.file})${c.softwareTiming ? ` — software renderer median ${c.softwareTiming.medianFrameMs?.toFixed(1)} ms, p95 ${c.softwareTiming.p95FrameMs?.toFixed(1)} ms (${c.softwareTiming.sampleFrames} frames).` : ''}`), '',
    ...(report.districtContactSheet ? [`[Six-district contact sheet](${report.districtContactSheet})`, ''] : []),
    'Full structured evidence: [report.json](report.json).', '',
  ];
  await writeFile(path.join(OUTPUT, 'REPORT.md'), lines.join('\n'));
  console.log(JSON.stringify({ output: OUTPUT, summary: report.summary }, null, 2));
}

try {
  await boot();
  record('Game booted with real Chromium WebGL', true, { wallMs: report.bootWallMs, environment: report.environment.actual });
  if (!SKIP_UI) await realInputChecks();
  if (!UI_ONLY) await worldChecks();
  await validateNetworkNotifications();
} catch (error) {
  record('Harness/boot completion', false, { error: compactError(error) });
} finally {
  try { await writeSummary(); } finally {
    await browser?.close();
    if (ownedServer) ownedServer.kill('SIGTERM');
  }
}
process.exitCode = report.checks.some(c => !c.passed) || report.pageErrors.length || report.httpErrors.length ? 1 : 0;
