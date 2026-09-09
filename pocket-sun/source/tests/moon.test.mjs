import test from "node:test";
import assert from "node:assert/strict";
import { moonLayout, moonProgressForScore, bounceOffMoon, pushOutsideMoon, moonExcursion, advanceMoonJourney, MOON_MILESTONES, MOON_EXCURSION_SECONDS } from "../app/moon.ts";

test("points bring the moon inward and only the final approach becomes solid", () => {
  for (const [w, h] of [[390, 844], [844, 390], [320, 568]]) {
    let previous = Infinity;
    for (const score of [0, 500, 1500, 5000, 15000, 49999, 50000, 75000]) {
      const moon = moonLayout(w, h, moonProgressForScore(score), 0);
      const distance = Math.hypot(moon.x - w / 2, moon.y - h / 2);
      assert.ok(distance <= previous);
      previous = distance;
      if (score < 50000) { assert.equal(moon.solid, false); assert.equal(moon.face, 0); }
      if (score >= 50000) {
        assert.equal(moon.solid, true);
        assert.equal(moon.x, w / 2); assert.equal(moon.y, h / 2);
        assert.ok(moon.r + 40 < Math.min(w, h) / 2, "room for sun and targets on every side");
      }
    }
  }
});

test("early milestone trips depart and return without a face or a collider", () => {
  for (const [index, score] of MOON_MILESTONES.entries()) {
    const journey = { moonProgress: 0, moonFace: 0, moonExcursionIndex: index - 1, moonExcursionElapsed: 12 };
    advanceMoonJourney(journey, score, 1 / 60);
    assert.equal(journey.moonExcursionIndex, index);
    assert.deepEqual(moonExcursion(index, 0), { x: 0, y: 0 });
    assert.notDeepEqual(moonExcursion(index, 6), { x: 0, y: 0 });
    for (let frame = 0; frame < 721; frame++) {
      advanceMoonJourney(journey, score, 1 / 60);
      const moon = moonLayout(390, 844, journey.moonProgress, frame / 60, { index, elapsed: journey.moonExcursionElapsed }, journey.moonFace);
      assert.equal(moon.face, 0); assert.equal(moon.solid, false);
    }
    assert.deepEqual(moonExcursion(index, MOON_EXCURSION_SECONDS), { x: 0, y: 0 });
    assert.equal(journey.moonExcursionIndex, index, "the same score cannot retrigger a trip");
  }
});

test("new milestones queue without snapping an unfinished trip, and the face waits for arrival", () => {
  const journey = { moonProgress: 0, moonFace: 0, moonExcursionIndex: -1, moonExcursionElapsed: 12 };
  advanceMoonJourney(journey, 500, 1 / 60);
  advanceMoonJourney(journey, 3500, 3);
  assert.equal(journey.moonExcursionIndex, 0); assert.equal(journey.moonExcursionElapsed, 3);
  for (let frame = 0; frame < 14 * 60; frame++) {
    advanceMoonJourney(journey, 50000, 1 / 60);
    const moon = moonLayout(390, 844, journey.moonProgress, 0, undefined, journey.moonFace);
    assert.equal(moon.face, 0); assert.equal(moon.solid, false);
  }
  for (let frame = 0; frame < 160; frame++) advanceMoonJourney(journey, 50000, 1 / 60);
  const moon = moonLayout(390, 844, journey.moonProgress, 0, undefined, journey.moonFace);
  assert.equal(moon.x, 195); assert.equal(moon.y, 422);
  assert.equal(moon.face, 1); assert.equal(moon.solid, true);
});

test("fast shots cannot tunnel through the moon and gain a bounded sideways launch", () => {
  const moon = { x: 200, y: 200, r: 70, progress: 1, solid: true };
  const body = { x: 340, y: 200, r: 12, vx: 900, vy: 0 };
  assert.equal(bounceOffMoon(body, { x: 60, y: 200 }, moon, moon, 1 / 25, true), true);
  assert.ok(body.x < 200 - 82);
  assert.ok(body.vx < 0 && Math.abs(body.vy) >= 210);
  assert.ok(Math.hypot(body.vx, body.vy) <= 900);
  assert.equal(bounceOffMoon(body, { x: body.x, y: body.y }, moon, moon, 1 / 60, true), false);
});

test("outgoing overlap is separated without reflecting back into the moon", () => {
  const moon = { x: 200, y: 200, r: 70, progress: 1, solid: true };
  const body = { x: 280, y: 200, r: 12, vx: 120, vy: 40 };
  assert.equal(bounceOffMoon(body, { x: 277, y: 200 }, moon, moon, 1 / 60, true), false);
  assert.equal(body.vx, 120); assert.equal(body.vy, 40);
  assert.ok(body.x > 282);
});

test("a moving moon and center overlaps stay finite, and scenery is non-solid", () => {
  const previous = { x: 200, y: 200, r: 70, progress: 1, solid: true };
  const moon = { ...previous, x: 201 };
  const body = { x: 201, y: 200, r: 12, vx: 0, vy: 10 };
  bounceOffMoon(body, { x: 200, y: 200 }, moon, previous, 0, true);
  assert.ok(Object.values(body).every(Number.isFinite));
  assert.ok(Math.hypot(body.x - moon.x, body.y - moon.y) > moon.r);
  const target = { x: 201, y: 200, r: 20 };
  pushOutsideMoon(target, moon, 6);
  assert.ok(Math.hypot(target.x - moon.x, target.y - moon.y) >= 96);
  const before = { ...body };
  assert.equal(bounceOffMoon(body, body, { ...moon, solid: false }, previous, 1 / 60, true), false);
  assert.deepEqual(body, before);
});
