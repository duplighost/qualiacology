// Behavioral regressions for defects found during BREAKWATER implementation.
// Run from the site root: node build/qa/breakwater/regression.mjs
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const game = resolve(process.env.BREAKWATER_ROOT || fileURLToPath(new URL('../../../breakwater', import.meta.url)));
const threeURL = pathToFileURL(resolve(game, 'vendor/three.module.min.js')).href;
const THREE = await import(threeURL);
// Native modules use the browser import map. Replace only that specifier in
// memory so Node exercises the actual current source without a repository edit.
async function component(name) {
  const source = readFileSync(resolve(game, `src/${name}.js`), 'utf8')
    .replace("from 'three'", `from '${threeURL}'`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { Player } = await component('player');
const { Weapon } = await component('weapon');
const cases = [];

function test(name, run) {
  const evidence = run();
  cases.push({ name, passed: true, evidence });
}
function fixture(solids = []) {
  const input = {
    queue: new Set(), held: new Set(), move: { x: 0, z: 0 }, buttons: new Set(),
    pressed(key) { const present = this.queue.has(key); this.queue.delete(key); return present; },
    axis() { return { ...this.move }; }, down(key) { return this.held.has(key); },
    mouse(button) { return this.buttons.has(button); }, look() { return { x: 0, y: 0 }; },
  };
  const world = { solids, floorAt() { return 0; }, rayBlocked() { return false; } };
  const cues = [], pulses = [];
  const audio = { sfx(...args) { cues.push(args); } };
  const effects = { burst() {}, ring() {}, trail() {} };
  const player = new Player(world, input, audio, effects, () => assert.fail('Unexpected fall'));
  const combat = {
    hitSegment() { return 1; }, parry() { return 1; },
    pulse(...args) { pulses.push(args); },
  };
  return { input, world, audio, effects, player, combat, cues, pulses };
}
function weaponFixture() {
  const data = fixture();
  // Rendering assets are irrelevant to behavioral checks; emulate the real
  // material factory's acceptance of texture-repeat options without textures.
  data.materials = { get(name, { repeat, ...options } = {}) { return new THREE.MeshStandardMaterial(options); } };
  data.weapon = new Weapon({ ...data, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera() });
  return data;
}
function frames(player, count = 60) {
  const history = [];
  for (let i = 0; i < count; i++) { player.step(1 / 60); history.push(player.position.toArray()); }
  return history;
}

test('A jump beneath a ceiling stops upward motion without lateral teleportation', () => {
  const f = fixture([{ minX: -20, maxX: 20, minY: 2, maxY: 3, minZ: -20, maxZ: 20, active: true }]);
  f.input.queue.add('Space');
  const history = frames(f.player, 60);
  const maxY = Math.max(...history.map(p => p[1]));
  assert.ok(maxY > .1 && maxY <= .281, `Head passed through ceiling: feet ${maxY}`);
  assert.ok(history.every(p => Math.abs(p[0]) < .001 && Math.abs(p[2]) < .001), 'Ceiling ejected player sideways');
  assert.equal(f.player.grounded, true);
  return { maxY, final: f.player.position.toArray() };
});

test('Landing on a solid prop remains on its top rather than sinking and ejecting', () => {
  const f = fixture([{ minX: -1, maxX: 1, minY: 0, maxY: 1.1, minZ: -1, maxZ: 1, active: true }]);
  f.player.position.set(0, 1.3, 0); f.player.velocity.y = -3; f.player.grounded = false;
  frames(f.player, 90);
  assert.ok(Math.abs(f.player.position.y - 1.1) < .001);
  assert.equal(f.player.position.x, 0); assert.equal(f.player.position.z, 0);
  assert.equal(f.player.grounded, true); assert.equal(f.player.velocity.y, 0);
  return f.player.position.toArray();
});

test('A dash into a thin wall stays on the near side', () => {
  const f = fixture([{ minX: -5, maxX: 5, minY: 0, maxY: 4, minZ: -2.1, maxZ: -2, active: true }]);
  f.input.move.z = 1; f.input.queue.add('ShiftLeft'); frames(f.player, 30);
  assert.ok(f.player.position.z >= -1.641, `Dash crossed wall at ${f.player.position.z}`);
  assert.equal(f.player.position.x, 0);
  return { z: f.player.position.z };
});

test('Respawn clears buffered jump and movement transients', () => {
  const f = fixture();
  Object.assign(f.player, { jumpBuffer: .14, sliding: true, slideTime: .5, speed: 25, swimming: true, cameraRoll: .3 });
  f.player.reset(new THREE.Vector3()); f.player.step(1 / 60);
  assert.equal(f.player.velocity.y, 0); assert.equal(f.player.position.y, 0);
  assert.equal(f.player.sliding, false); assert.equal(f.player.swimming, false);
  assert.equal(f.player.speed, 0); assert.equal(f.player.cameraRoll, 0);
  return { y: f.player.position.y, jumpBuffer: f.player.jumpBuffer };
});

test('Throw collision includes the segment immediately in front of the eye', () => {
  const f = weaponFixture();
  f.world.rayBlocked = (a, b) => Math.max(a.z, b.z) >= -.6 && Math.min(a.z, b.z) <= -.5;
  f.weapon.throw(); f.weapon.step(1 / 60);
  assert.equal(f.weapon.state, 'lodged');
  assert.ok(f.weapon.position.z >= -.501 && f.weapon.position.z <= -.45, `Lance passed wall: ${f.weapon.position.z}`);
  return { z: f.weapon.position.z, state: f.weapon.state };
});

test('A caught lance clears its timing window while held and charging', () => {
  const f = weaponFixture();
  f.weapon.state = 'returning'; f.weapon.position.copy(f.player.eye()).add(new THREE.Vector3(0, 0, -1.6));
  f.weapon.step(1 / 60);
  assert.equal(f.weapon.state, 'held'); assert.equal(f.weapon.perfectWindow, false);
  f.input.buttons.add(0); f.weapon.step(1 / 60);
  assert.ok(f.weapon.charge > 0); assert.equal(f.weapon.perfectWindow, false);
  return { state: f.weapon.state, charge: f.weapon.charge, perfectWindow: f.weapon.perfectWindow };
});

test('Charged behavior agrees with the fully charged cue', () => {
  const f = weaponFixture(); f.weapon.charge = .65; f.weapon.throw();
  assert.equal(f.weapon.charged, false, 'Partial charge incorrectly receives charged damage');
  const normalSpeed = f.weapon.velocity.length();
  f.weapon.reset(); f.input.buttons.add(0);
  for (let i = 0; i < 60; i++) f.weapon.step(1 / 60);
  assert.equal(f.cues.filter(([name]) => name === 'charge').length, 1, 'Ready cue should play exactly once per hold');
  f.weapon.throw(); assert.equal(f.weapon.charged, true);
  assert.ok(f.weapon.velocity.length() > normalSpeed);
  return { normalSpeed, chargedSpeed: f.weapon.velocity.length(), readyCues: 1 };
});

test('A parry during return primes the next throw, not the current returning pass', () => {
  const f = weaponFixture(); f.player.skillSet.add('stormchain'); f.weapon.state = 'returning';
  f.weapon.parry(); assert.equal(f.weapon.stormReady, true);
  f.weapon.damagePass(42, true);
  assert.equal(f.pulses.length, 0); assert.equal(f.weapon.stormReady, true);
  f.weapon.catch(false); f.weapon.throw(); f.weapon.damagePass(32, false);
  assert.equal(f.pulses.length, 1); assert.equal(f.weapon.stormReady, false);
  f.weapon.damagePass(32, false); assert.equal(f.pulses.length, 1, 'One primed throw chained repeatedly');
  return { pulses: f.pulses.length, stormReady: f.weapon.stormReady, stormPass: f.weapon.stormPass };
});

test('Weapon reset clears primed and active Storm plus catch feedback state', () => {
  const f = weaponFixture();
  Object.assign(f.weapon, { stormReady: true, stormPass: true, perfectWindow: true, catchArmed: .2 });
  f.weapon.reset();
  assert.equal(f.weapon.stormReady, false); assert.equal(f.weapon.stormPass, false);
  assert.equal(f.weapon.perfectWindow, false); assert.equal(f.weapon.catchArmed, 0);
  return { state: f.weapon.state };
});

test('Perfect catches provide their owned skill effects exactly once', () => {
  const f = weaponFixture(); f.player.skillSet = new Set(['catchdrive', 'pulsecatch']);
  f.player.dashCd = .9; f.player.health = 70; let perfects = 0; f.weapon.onPerfect = () => perfects++;
  f.weapon.catch(true);
  assert.equal(f.player.dashCd, 0); assert.equal(f.player.health, 73);
  assert.equal(f.pulses.length, 1); assert.equal(perfects, 1);
  return { health: f.player.health, dashCd: f.player.dashCd, pulses: f.pulses.length };
});

const report = { generated: new Date().toISOString(), source: game, passed: cases.length, cases };
writeFileSync(resolve(process.env.BREAKWATER_QA_OUT || tmpdir(), 'breakwater-regression-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: cases.length, cases: cases.map(c => c.name) }, null, 2));
