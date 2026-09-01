// Boot SPACEBOARDING the way a player does and look at actual pixels.
//
// Ported from ninefold-boot-check.mjs when SPACEBOARDING replaced NINEFOLD BURN
// on the shelf (2026-08-29). Same engine, same lesson, one different button:
// the start control reads DROP IN here, and the game needs a far longer boot
// budget because it prewarms its whole first loop before reporting ready.
//
// Same lesson as build/qa/fetch-boot-check.mjs: every in-repo counter check can
// pass while the page ships a black canvas. This one clicks IGNITE for real (no
// ?autotest, no ?stage), waits for the race to be running, screenshots the
// composited page, and then decodes that PNG inside the browser on a 2D canvas
// so it can actually measure brightness and colour spread. A WebGL context with
// preserveDrawingBuffer:false reads back black by construction, so sampling the
// game canvas directly would prove nothing - the screenshot is the evidence.
//
// Usage: node build/qa/spaceboarding-boot-check.mjs http://localhost:4173/spaceboarding/

import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const target = process.argv[2] || 'http://localhost:4173/spaceboarding/';
const CHROME_ARGS = [
  '--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization',
  '--use-angle=d3d11', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
];

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: CHROME_ARGS });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });

await page.goto(target, { waitUntil: 'load' });
await page.waitForFunction(() => document.body.dataset.gameReady === 'true', null, { timeout: 300000 });

const fatal = await page.evaluate(() => document.body.dataset.raceStatus === 'fatal');
assert.equal(fatal, false, 'the game reported a fatal boot');

// The site shell must be present and must not have been buried by the game UI.
const home = await page.evaluate(() => {
  const el = document.querySelector('.home-link');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { href: el.getAttribute('href'), onTop: !!top && (top === el || el.contains(top)) };
});
assert.ok(home, 'the home pill is missing from the site shell');
assert.equal(home.href, '/', 'the home pill does not point at the site root');
assert.equal(home.onTop, true, 'the home pill is buried under the game UI and cannot be clicked');

await page.click('#start');
await page.waitForFunction(() => document.body.dataset.raceStatus === 'racing', null, { timeout: 20000 });
await page.waitForTimeout(3500);

const status = await page.evaluate(() => document.body.dataset.raceStatus);
assert.equal(status, 'racing', `race did not stay running (status ${status})`);

const shot = await page.screenshot({ animations: 'allow' });

// Decode the screenshot on a 2D canvas - the only surface that can be read back.
const pixels = await page.evaluate(async (b64) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `data:image/png;base64,${b64}`; });
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  // Centre box only: ignore the HUD and the peripheral heat layer, so this
  // measures the world the player is steering through.
  const x = Math.floor(img.width * 0.25), y = Math.floor(img.height * 0.3);
  const w = Math.floor(img.width * 0.5), h = Math.floor(img.height * 0.45);
  const d = ctx.getImageData(x, y, w, h).data;
  let sum = 0, min = 255, max = 0;
  const seen = new Set();
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722);
    sum += l; if (l < min) min = l; if (l > max) max = l;
    seen.add((d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4));
  }
  return { mean: sum / (d.length / 4), min, max, distinctColours: seen.size };
}, shot.toString('base64'));

assert.ok(pixels.mean > 6, `the world is essentially black (mean luminance ${pixels.mean.toFixed(2)})`);
assert.ok(pixels.max - pixels.min > 40,
  `the world is a flat fill, not a rendered scene (range ${(pixels.max - pixels.min).toFixed(1)})`);
assert.ok(pixels.distinctColours > 60,
  `too few distinct colours to be a rendered world (${pixels.distinctColours})`);

assert.deepEqual(errors, [], `page reported errors:\n${errors.join('\n')}`);

console.log(`spaceboarding boot check passed: mean luminance ${pixels.mean.toFixed(1)}, `
  + `range ${(pixels.max - pixels.min).toFixed(0)}, ${pixels.distinctColours} distinct colours, `
  + `home pill clickable, 0 page errors`);

await browser.close();
