import assert from 'node:assert/strict';
import { PerformanceGovernor } from '../../relay-eclipse/src/engine/performance-governor.js';

function makeRenderer(width = 1536, height = 738) {
  const calls = [];
  return {
    calls,
    domElement: { clientWidth: width, clientHeight: height },
    setPixelRatio(value) { calls.push({ type: 'dpr', value }); },
    setSize(w, h) { calls.push({ type: 'size', width: w, height: h }); },
  };
}

function runFrames(governor, frameMs, durationMs) {
  const transitions = [];
  let lastAdjustment = '';
  for (let now = 0; now <= durationMs; now += frameMs) {
    const snapshot = governor.frame(now);
    const adjustment = JSON.stringify(snapshot.lastAdjustment);
    if (snapshot.lastAdjustment && adjustment !== lastAdjustment) {
      transitions.push({
        atMs: snapshot.lastAdjustment.atMs,
        direction: snapshot.lastAdjustment.direction,
        axis: snapshot.lastAdjustment.axis,
        dpr: snapshot.dpr,
        quality: snapshot.qualityName,
      });
      lastAdjustment = adjustment;
    }
  }
  return { transitions, snapshot: governor.debugSnapshot(durationMs) };
}

const initialDpr = Math.min(1, Math.sqrt(720_000 / (1536 * 738)));
const renderer = makeRenderer();
const governor = new PerformanceGovernor({
  renderer,
  deviceDpr: 1.25,
  minDpr: 0.65,
  maxDpr: 1.25,
  initialDpr,
  initialQuality: 'medium',
  minimumSamples: 24,
  degradeAfterMs: 900,
  degradeCooldownMs: 1200,
});

const initial = governor.debugSnapshot();
assert.ok(Math.abs(initial.dpr - initialDpr) < 0.001, `cold-start DPR drifted: ${initial.dpr}`);
assert.equal(initial.qualityName, 'medium');
assert.equal(initial.manualLock, false, 'cold-start budget must remain adaptive');
assert.ok(1536 * 738 * initial.dpr ** 2 <= 721_500, 'cold-start drawing buffer exceeded its pixel budget');

governor.resize(1920, 1080, 1.25);
assert.ok(Math.abs(governor.dpr - initialDpr) < 1e-6, 'resize did not preserve the adaptive absolute DPR');

const healthy = runFrames(governor, 16.667, 39_000);
assert.deepEqual(
  healthy.transitions.slice(0, 3).map(({ direction, axis, dpr, quality }) => ({ direction, axis, dpr, quality })),
  [
    { direction: 'recover', axis: 'resolution', dpr: 0.897, quality: 'medium' },
    { direction: 'recover', axis: 'resolution', dpr: 1, quality: 'medium' },
    { direction: 'recover', axis: 'quality', dpr: 1, quality: 'high' },
  ],
  'healthy recovery no longer restores 1x resolution before extra effects',
);
governor.dispose();

const pressureRenderer = makeRenderer();
const pressureGovernor = new PerformanceGovernor({
  renderer: pressureRenderer,
  deviceDpr: 1.25,
  minDpr: 0.65,
  maxDpr: 1.25,
  initialDpr,
  initialQuality: 'medium',
  minimumSamples: 24,
  degradeAfterMs: 900,
  degradeCooldownMs: 1200,
});
const pressure = runFrames(pressureGovernor, 50, 8_000);
assert.equal(pressure.snapshot.dpr, 0.65, 'sustained pressure did not reach the safe DPR floor');
assert.equal(pressure.snapshot.qualityName, 'low', 'sustained pressure did not reach low quality');
assert.ok(pressure.transitions.length >= 3, 'sustained pressure did not exercise both adaptive axes');
assert.ok(pressure.transitions.every((transition) => transition.direction === 'degrade'));
pressureGovernor.dispose();

const legacyRenderer = makeRenderer();
const legacyDefault = new PerformanceGovernor({
  renderer: legacyRenderer,
  deviceDpr: 1.25,
  minDpr: 0.65,
  maxDpr: 1.25,
});
assert.equal(legacyDefault.debugSnapshot().dpr, 1.25, 'omitting initialDpr changed the governor default');
legacyDefault.dispose();

console.log(JSON.stringify({
  pass: true,
  initial,
  healthyTransitions: healthy.transitions,
  pressureTransitions: pressure.transitions,
  pressureFinal: pressure.snapshot,
}, null, 2));
