// Boot STAY the way a player does and look at actual pixels.
//
// Same lesson as fetch-boot-check and ninefold-boot-check: counter checks pass
// happily on a blank canvas. STAY is 2D canvas, so this can read the context
// directly rather than round-tripping a screenshot.
//
// It also guards the one thing the site shell breaks here: STAY listens for
// pointerdown on the whole window, so the home pill has to NOT start a night.
//
// Usage: node build/qa/stay-boot-check.mjs http://localhost:4173/stay/

import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const target = process.argv[2] || 'http://localhost:4173/stay/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });

await page.goto(target, { waitUntil: 'load' });
await page.waitForTimeout(900);

// Nothing may leave the site. This is the assertion that stops the Google
// Fonts CDN creeping back into a game folder.
//
// Netlify injects its own instrumentation into deploy previews only
// (app.netlify.com/cdp/?deployID=...). That is the host serving the page, not
// something the game asked for, and it is absent in production - so it is
// excluded by exact host rather than by loosening the check.
const NETLIFY_PREVIEW_HOST = 'app.netlify.com';
const external = await page.evaluate((skipHost) => performance.getEntriesByType('resource')
  .map((e) => e.name)
  .filter((n) => !n.startsWith(location.origin))
  .filter((n) => { try { return new URL(n).host !== skipHost; } catch { return true; } }),
NETLIFY_PREVIEW_HOST);
assert.deepEqual(external, [], `STAY fetched something off-site:\n${external.join('\n')}`);

// The display face must actually be there - the title is set in it at 150px.
await page.evaluate(() => document.fonts.ready);
const fonts = await page.evaluate(() => ({
  archivo: document.fonts.check('400 100px "Archivo Black"'),
  fraunces: document.fonts.check('italic 300 16px "Fraunces"'),
}));
assert.equal(fonts.archivo, true, 'Archivo Black did not load - the title will fall back');
assert.equal(fonts.fraunces, true, 'Fraunces italic did not load - the epitaphs will fall back');

// Title screen first.
assert.equal(await page.locator('#title').isVisible(), true, 'no title screen');

// The home pill must be present, on top, and must NOT begin a night.
const pill = await page.evaluate(() => {
  const el = document.querySelector('.home-link');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { href: el.getAttribute('href'), onTop: !!top && (top === el || el.contains(top)) };
});
assert.ok(pill, 'the home pill is missing from the site shell');
assert.equal(pill.href, '/', 'the home pill does not point at the site root');
assert.equal(pill.onTop, true, 'the home pill is buried and cannot be clicked');
await page.dispatchEvent('.home-link', 'pointerdown');
await page.waitForTimeout(250);
assert.equal(await page.locator('#title').isVisible(), true,
  'pressing the home pill started a night - the window pointerdown handler is not excluding site chrome');

// Now actually play: hold in the middle of the screen.
await page.mouse.move(640, 360);
await page.mouse.down();
await page.waitForTimeout(4200);

const playing = await page.evaluate(() => ({
  titleHidden: document.querySelector('#title').classList.contains('hidden'),
  hudOn: document.querySelector('#hud').classList.contains('on'),
  clock: document.querySelector('#clock').textContent,
  guests: document.querySelectorAll('#guests .gdot').length,
}));
assert.equal(playing.titleHidden, true, 'holding did not start the night');
assert.equal(playing.hudOn, true, 'the HUD never came up');
assert.notEqual(playing.clock, '9:00 PM', `the clock never advanced (${playing.clock})`);
assert.ok(playing.guests > 0, 'nobody ever arrived');

// Look at the canvas. 2D context, so it can be read directly.
const pixels = await page.evaluate(() => {
  const c = document.querySelector('#cv');
  const ctx = c.getContext('2d');
  const x = Math.floor(c.width * 0.2), y = Math.floor(c.height * 0.2);
  const w = Math.floor(c.width * 0.6), h = Math.floor(c.height * 0.6);
  const d = ctx.getImageData(x, y, w, h).data;
  let sum = 0, min = 255, max = 0;
  const seen = new Set();
  for (let i = 0; i < d.length; i += 4) {
    const l = d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722;
    sum += l; if (l < min) min = l; if (l > max) max = l;
    seen.add((d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4));
  }
  return { mean: sum / (d.length / 4), min, max, distinctColours: seen.size };
});
assert.ok(pixels.mean > 4, `the room is essentially black (mean luminance ${pixels.mean.toFixed(2)})`);
assert.ok(pixels.max - pixels.min > 40,
  `flat fill, not a rendered scene (range ${(pixels.max - pixels.min).toFixed(1)})`);
assert.ok(pixels.distinctColours > 40,
  `too few distinct colours to be a lit room (${pixels.distinctColours})`);

await page.mouse.up();
assert.deepEqual(errors, [], `page reported errors:\n${errors.join('\n')}`);

console.log(`stay boot check passed: fonts loaded, clock ran to ${playing.clock}, `
  + `${playing.guests} guest(s), mean luminance ${pixels.mean.toFixed(1)}, `
  + `${pixels.distinctColours} distinct colours, home pill safe, 0 page errors`);

await browser.close();
