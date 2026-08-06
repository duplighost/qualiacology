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
const profiles = [];
try {
  for (const profile of [
    { label: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
    { label: 'portrait', viewport: { width: 390, height: 844 }, mobile: true },
  ]) {
    const page = await browser.newPage({
      viewport: profile.viewport,
      isMobile: profile.mobile,
      hasTouch: profile.mobile,
      deviceScaleFactor: 1,
    });
    page.on('pageerror', (error) => pageErrors.push(`${profile.label}: ${error}`));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(`${profile.label}: ${message.text()}`);
    });

    await page.goto(`http://127.0.0.1:${port}/relay-eclipse/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__RE?.ready && document.body.dataset.relayEclipse === 'ready');
    await page.evaluate(async () => {
      await window.__RE.waitForAssets();
      await window.__RE.runSmoke();
      const game = window.__game;
      game.enemies.reset();
      game.enemies.active = false;
      game.hud.hideOverlay();
      game.hud.el.banner.classList.remove('show');
      game.hud.el.upgradeOverlay.classList.remove('show');
      game.state = 'playing';
      window.__RE.setAction('aim', true);
    });

    const weapons = [];
    for (const id of ['pistol', 'smg', 'shotgun', 'rifle']) {
      await page.evaluate((weaponId) => window.__game.weapons.switchTo(weaponId, true), id);
      await page.waitForFunction(() => {
        const viewmodel = window.__game.weapons._currentRealisticViewmodel();
        return viewmodel?._aim > 0.9999;
      }, null, { timeout: 4_000 });
      await page.waitForTimeout(80);

      const measurement = await page.evaluate(() => {
        const game = window.__game;
        const viewmodel = game.weapons._currentRealisticViewmodel();
        const canvas = document.querySelector('canvas');
        const gl = canvas?.getContext('webgl2');
        const debug = gl?.getExtension('WEBGL_debug_renderer_info');
        const renderer = debug
          ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
          : gl?.getParameter(gl.RENDERER) || 'unavailable';
        const point = viewmodel.weapon.position.clone().set(
          viewmodel.layout.opticX,
          viewmodel.layout.opticY,
          0,
        );
        viewmodel.weapon.updateWorldMatrix(true, false);
        viewmodel.weapon.localToWorld(point);
        viewmodel.camera.updateMatrixWorld(true);
        point.project(viewmodel.camera);
        const rect = canvas.getBoundingClientRect();
        const screenX = rect.left + (point.x * 0.5 + 0.5) * rect.width;
        const screenY = rect.top + (-point.y * 0.5 + 0.5) * rect.height;
        const centerX = rect.left + rect.width * 0.5;
        const centerY = rect.top + rect.height * 0.5;
        return {
          id: game.weapons.current,
          renderer,
          aim: viewmodel._aim,
          optic: [viewmodel.layout.opticX, viewmodel.layout.opticY],
          ads: [viewmodel.layout.adsX, viewmodel.layout.adsY],
          projected: [screenX, screenY],
          center: [centerX, centerY],
          delta: [screenX - centerX, screenY - centerY],
        };
      });

      assert.doesNotMatch(measurement.renderer, /SwiftShader|software/i, `${profile.label}/${id}: hardware renderer required`);
      assert.match(measurement.renderer, /Direct3D11|D3D11/i, `${profile.label}/${id}: D3D11 renderer required`);
      assert.ok(Math.abs(measurement.delta[0]) <= 2, `${profile.label}/${id}: optic is ${measurement.delta[0]} px off firing center horizontally`);
      assert.ok(Math.abs(measurement.delta[1]) <= 2, `${profile.label}/${id}: optic is ${measurement.delta[1]} px off firing center vertically`);
      weapons.push(measurement);
    }
    profiles.push({ label: profile.label, viewport: profile.viewport, weapons });
    await page.close();
  }

  assert.deepEqual(pageErrors, [], 'Browser page errors were emitted');
  assert.deepEqual(consoleErrors, [], 'Browser console errors were emitted');
  console.log(JSON.stringify({ pass: true, profiles, pageErrors, consoleErrors }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
}
