// Boot ARC the way a player does and look at actual pixels.
//
// Same lesson as fetch-boot-check.mjs: counter checks pass while the page ships a black
// canvas. This clicks the real start button (no ?test), waits for the game to be playing,
// throws the swift with a real mouse press/release and a real right click, screenshots the
// composited page and decodes it on a 2D canvas to measure brightness, colour spread and
// the amber of the rail. Also: the home pill is on top on the title card and hidden while
// playing, and nothing is fetched off-site.
//
// Usage: node build/qa/arc-boot-check.mjs http://localhost:4173/arc/
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const target = process.argv[2] || 'http://localhost:4173/arc/';
const CHROME_ARGS = ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--mute-audio'];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: CHROME_ARGS });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const offsite = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
// Netlify injects its deploy-preview drawer (and its Segment/Bugsnag telemetry) into previews
// only; that is the host reaching out, not the game. Exact hosts, so a real leak still fails.
const NETLIFY_PREVIEW_HOSTS = new Set(['app.netlify.com', 'cdn.segment.com', 'api.segment.io', 'sessions.bugsnag.com', 'notify.bugsnag.com', 'netlify-cdp-loader.netlify.app']);
page.on('request', (r) => { const u = new URL(r.url()); const t = new URL(target); if (u.host !== t.host && !/^(data|blob):/.test(r.url()) && !NETLIFY_PREVIEW_HOSTS.has(u.host)) offsite.push(r.url()); });

await page.goto(target, { waitUntil: 'load' });
await page.waitForFunction(() => document.body.dataset.gameReady === 'true', null, { timeout: 120000 });
assert.notEqual(await page.evaluate(() => document.body.dataset.state), 'fatal', 'the game reported a fatal boot');

const pill = await page.evaluate(() => {
  const el = document.querySelector('.home-link'); if (!el) return null;
  const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { href: el.getAttribute('href'), onTop: !!top && (top === el || el.contains(top)), opacity: getComputedStyle(el).opacity };
});
assert.ok(pill, 'the home pill is missing'); assert.equal(pill.href, '/'); assert.equal(pill.onTop, true, 'the home pill is buried');

// real start click, then a real throw and a real call
await page.click('#start');
await page.waitForFunction(() => document.body.dataset.state === 'playing', null, { timeout: 20000 });
await page.waitForTimeout(800);
const hidden = await page.evaluate(() => getComputedStyle(document.querySelector('.home-link')).opacity);
assert.equal(Number(hidden), 0, 'the home pill should hide while playing');
await page.mouse.move(640, 360);
await page.mouse.down({ button: 'left' }); await page.waitForTimeout(600); await page.mouse.up({ button: 'left' });
await page.waitForTimeout(2600);
const st1 = await page.evaluate(() => window.__ARC.state());
assert.ok(st1.rider.thrown >= 1, 'the real mouse press did not throw');
assert.ok(st1.rail.total > 10, `the rail is only ${st1.rail.total.toFixed(1)} m`);
const shot = await page.screenshot({ animations: 'allow' });
await page.mouse.click(640, 360, { button: 'right' });
await page.waitForTimeout(1500);
const st2 = await page.evaluate(() => window.__ARC.state());
assert.ok(st2.rider.called >= 1, 'the real right click did not call');

const px = await page.evaluate(async (b64) => {
  const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `data:image/png;base64,${b64}`; });
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data; let sum = 0, amber = 0; const seen = new Set();
  for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2]; sum += r * 0.2126 + g * 0.7152 + b * 0.0722; if (r > 150 && g > 90 && b < 110 && r > b + 60) amber++; seen.add((r >> 4) << 8 | (g >> 4) << 4 | (b >> 4)); }
  return { mean: sum / (d.length / 4), amber, colours: seen.size };
}, shot.toString('base64'));
assert.ok(px.mean > 8, `frame too dark (mean ${px.mean.toFixed(1)})`);
assert.ok(px.colours > 60, `frame too flat (${px.colours} colours)`);
assert.ok(px.amber > 300, `no amber rail on screen (${px.amber} amber px)`);

const fatal = errors.filter(e => !/favicon/.test(e));
assert.equal(fatal.length, 0, `errors:\n${fatal.join('\n')}`);
assert.equal(offsite.length, 0, `off-site requests:\n${offsite.join('\n')}`);
console.log(`arc-boot-check PASS: thrown ${st2.rider.thrown} called ${st2.rider.called} rail ${st1.rail.total.toFixed(0)} m, frame mean ${px.mean.toFixed(1)} colours ${px.colours} amber ${px.amber}`);
await browser.close();
