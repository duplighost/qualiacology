// Integration/state validation, NOT a normal playthrough or a duration/fun test.
// Debug travel + forced enemy HP exercise real combat callbacks, wave scheduling,
// checkpoints, sector exits, localStorage, menus and ending/replay transitions.
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { newSave } from '../../../breakwater/src/storage.js';

const root = process.env.BREAKWATER_QA_OUT || `${tmpdir()}/breakwater-campaign-qa`;
mkdirSync(root, { recursive: true });
const key = 'qualiacology.breakwater.v1';
const url = process.env.BREAKWATER_QA_URL || 'http://127.0.0.1:4173/breakwater/?dev=1';
const report = {
  method: 'Simulated progression through the actual gameplay engine: debug travel, forced enemy HP=1, engine _damage, real fixed updates and UI clicks. This does not validate two hours of playtime, difficulty, encounter mastery or ordinary navigation.',
  generated: new Date().toISOString(), sectors: [], errors: [], checkpoints: 0,
};
const browser = await chromium.launch({ executablePath: process.env.BREAKWATER_CHROMIUM || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 960, height: 600 } });
const seed = newSave();
Object.assign(seed, { sector: 7, checkpoint: 1, unlockedSector: 9, xp: 987, level: 2, skillPoints: 2, skills: ['catchdrive'] });
Object.assign(seed.settings, { quality: 'low', volume: 0, music: 0, shake: 0 });
seed.stats.activeSeconds = 1234; seed.stats.kills = 19; seed.stats.score = 2900;
await context.addInitScript(({ key, seed }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed)); }, { key, seed });
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.stack || error.message));

const saved = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
const snapshot = () => page.evaluate(() => __BREAKWATER__.snapshot());
async function ready() {
  await page.waitForFunction(() => window.__BREAKWATER__?.ready, null, { timeout: 90000 });
}
async function playing() {
  await page.waitForFunction(() => __BREAKWATER__.snapshot().mode === 'playing', null, { timeout: 30000 });
}
async function clearArena(index) {
  return page.evaluate(({ index, key }) => {
    const d = __BREAKWATER__, a = d.world.arenas[index];
    if (!a) throw new Error(`Missing arena ${index}`);
    d.player.invuln = 10000;
    d.setPosition(a.center.x, a.center.y + .02, a.triggerZ - 1);
    d.step(1 / 60);
    if (d.combat.activeArena !== index) throw new Error(`Arena ${index} did not trigger; active ${d.combat.activeArena}`);
    let steps = 0, defeated = 0, bosses = [];
    while (!d.combat.cleared.has(index) && steps++ < 3000) {
      d.player.invuln = 10000;
      for (const enemy of [...d.combat.enemies]) {
        if (!enemy.alive) continue;
        if (enemy.boss) bosses.push(enemy.type);
        enemy.health = 1;
        d.combat._damage(enemy, 100, { source: d.player.position.clone(), parried: true, returning: true });
        if (!enemy.alive) defeated++;
      }
      d.step(.05);
      if (d.snapshot().mode !== 'playing') throw new Error(`Unexpected mode during simulated arena: ${d.snapshot().mode}`);
    }
    const state = d.snapshot(), stored = JSON.parse(localStorage.getItem(key));
    if (!d.combat.cleared.has(index)) throw new Error(`Arena ${index} stalled after ${steps} updates`);
    if (state.checkpoint !== index + 1 || stored.checkpoint !== index + 1) throw new Error(`Checkpoint not persisted: ${JSON.stringify({ state: state.checkpoint, stored: stored.checkpoint, expected: index + 1 })}`);
    const gate = d.world.solids.find(s => s.gate === index);
    if (gate?.active) throw new Error(`Arena ${index} cleared but its gate is still solid`);
    return { index, steps, defeated, bosses, checkpoint: state.checkpoint, savedSector: stored.sector, gateOpen: !gate?.active };
  }, { index, key });
}
async function exitSector() {
  return page.evaluate(() => {
    const d = __BREAKWATER__, exit = d.world.exit.clone();
    d.setPosition(exit.x, exit.y + .02, exit.z); d.player.invuln = 10000; d.step(1 / 60);
    return d.snapshot();
  });
}

try {
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await ready();
  let stored = await saved();
  assert.equal(stored.sector, 7, 'Menu preview overwrote saved sector');
  assert.equal(stored.checkpoint, 1, 'Menu preview overwrote saved checkpoint');
  assert.equal(stored.xp, 987); assert.deepEqual(stored.skills, ['catchdrive']);
  await page.locator('#menu-panel [data-action="continue"]').click(); await playing();
  let state = await snapshot();
  assert.equal(state.sector, 7); assert.equal(state.checkpoint, 1); assert.deepEqual(state.cleared, [0]);
  await page.reload({ waitUntil: 'domcontentloaded' }); await ready();
  stored = await saved(); assert.equal(stored.sector, 7); assert.equal(stored.checkpoint, 1);
  report.savedReload = { sector: stored.sector, checkpoint: stored.checkpoint, xp: stored.xp, skills: stored.skills };
  console.log('Saved sector/checkpoint survived menu boot, Continue and reload.');

  await page.locator('#menu-panel [data-action="new-confirm"]').click();
  await page.locator('#confirm-panel [data-action="confirm"]').click(); await playing();
  assert.equal((await snapshot()).sector, 0);

  for (let sector = 0; sector < 25; sector++) {
    state = await snapshot(); assert.equal(state.sector, sector, `Wrong sector before ${sector}`);
    const arenaCount = await page.evaluate(() => __BREAKWATER__.world.arenas.length);
    assert.ok(arenaCount > 0, `Sector ${sector} has no arenas`);
    const result = { sector, name: state.sectorName, arenaCount, arenas: [] };
    for (let index = 0; index < arenaCount; index++) {
      result.arenas.push(await clearArena(index)); report.checkpoints++;
      if (sector === 0 && index === 0) {
        // Fatal damage passes through the real engine callback; only its strength
        // is controlled. UI Retry must preserve the actual cleared checkpoint.
        const death = await page.evaluate(() => {
          const d = __BREAKWATER__; d.player.health = 1; d.player.invuln = 0;
          d.combat._hurt(1000, d.player.position.clone(), 'integration-check');
          return { state: d.snapshot(), save: d.getSave() };
        });
        assert.equal(death.state.mode, 'dead'); assert.equal(death.state.health, 0);
        assert.equal(death.save.checkpoint, 1); assert.equal(death.save.stats.deaths, 1);
        await page.locator('#death-panel [data-action="restart"]').click(); await playing();
        const restart = await snapshot(); assert.equal(restart.sector, 0); assert.equal(restart.checkpoint, 1);
        assert.deepEqual(restart.cleared, [0]); assert.equal(restart.health, 100); assert.equal(restart.lance, 'held');
        report.deathRetry = { checkpoint: restart.checkpoint, health: restart.health, deaths: death.save.stats.deaths };
      }
    }
    const after = await exitSector();
    assert.equal(after.sector, sector === 24 ? 24 : sector + 1, `Sector ${sector} exit failed`);
    assert.equal(after.mode, sector === 24 ? 'ending' : 'playing');
    assert.equal(after.unlockedSector, sector === 24 ? 24 : sector + 1);
    result.after = { sector: after.sector, mode: after.mode, unlockedSector: after.unlockedSector };
    report.sectors.push(result);
    writeFileSync(`${root}/campaign-results.json`, JSON.stringify(report, null, 2));
    console.log(`Sector ${String(sector + 1).padStart(2, '0')} passed: ${arenaCount} checkpoints, ${result.arenas.reduce((n, a) => n + a.defeated, 0)} simulated defeats, ${after.mode}.`);
  }
  stored = await saved(); assert.equal(stored.completed, true); assert.equal(stored.sector, 24);
  assert.equal(stored.unlockedSector, 24); assert.equal(stored.stats.sectors.length, 25);
  assert.equal(new Set(stored.stats.sectors.map(s => s.sector)).size, 25);
  report.bosses = [...new Set(report.sectors.flatMap(s => s.arenas.flatMap(a => a.bosses)))].sort();
  assert.deepEqual(report.bosses, ['counterweight', 'crucible', 'floodgate', 'glasskeeper', 'heart', 'switchman', 'warden']);
  assert.equal(await page.locator('#ending-panel').isVisible(), true);
  await page.screenshot({ path: `${root}/ending.png`, animations: 'disabled' });
  report.ending = { completed: stored.completed, checkpoint: stored.checkpoint, sector: stored.sector, kills: stored.stats.kills, recordedSectors: stored.stats.sectors.length };

  // Revisit a chapter through the actual ending menu, then verify that a reload
  // and Continue resume this replay checkpoint rather than resetting to sector 0.
  await page.locator('#ending-panel [data-action="chapters"]').click();
  assert.equal(await page.locator('#chapters-panel [data-action="select-sector"][disabled]').count(), 0);
  await page.locator('#chapters-panel [data-action="select-sector"][data-index="12"]').click(); await playing();
  assert.equal((await snapshot()).sector, 12);
  const replayArena = await clearArena(0);
  await page.reload({ waitUntil: 'domcontentloaded' }); await ready();
  stored = await saved(); assert.equal(stored.completed, true); assert.equal(stored.sector, 12); assert.equal(stored.checkpoint, 1);
  await page.locator('#menu-panel [data-action="continue"]').click(); await playing();
  state = await snapshot();
  report.replay = { expectedSector: 12, actualSector: state.sector, expectedCheckpoint: 1, actualCheckpoint: state.checkpoint, arena: replayArena };
  assert.equal(state.sector, 12, 'Continue discarded progress in a replayed chapter after campaign completion');
  assert.equal(state.checkpoint, 1, 'Continue discarded replay checkpoint');
  assert.deepEqual(state.cleared, [0]);
  assert.equal(report.errors.length, 0, 'Browser raised runtime exceptions');
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack || error.message;
  try { report.failureState = await snapshot(); await page.screenshot({ path: `${root}/failure.png`, animations: 'disabled' }); } catch {}
  process.exitCode = 1;
} finally {
  writeFileSync(`${root}/campaign-results.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, sectors: report.sectors.length, checkpoints: report.checkpoints, ending: report.ending, replay: report.replay, failure: report.failure, errors: report.errors }, null, 2));
  await browser.close();
}
