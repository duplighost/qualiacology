import test from "node:test";
import assert from "node:assert/strict";
import { moonLayout, moonProgressForScore, bounceOffMoon, pushOutsideMoon } from "../app/moon.ts";

test("points bring the moon inward and only the final approach becomes solid", () => {
  for (const [w, h] of [[390, 844], [844, 390], [320, 568]]) {
    let previous = Infinity;
    for (const score of [0, 500, 1500, 3000, 4000, 5000, 15000]) {
      const moon = moonLayout(w, h, moonProgressForScore(score), 0);
      const distance = Math.hypot(moon.x - w / 2, moon.y - h / 2);
      assert.ok(distance <= previous);
      previous = distance;
      if (score < 4500) assert.equal(moon.solid, false);
      if (score >= 5000) {
        assert.equal(moon.solid, true);
        assert.equal(moon.x, w / 2); assert.equal(moon.y, h / 2);
        assert.ok(moon.r + 40 < Math.min(w, h) / 2, "room for sun and targets on every side");
      }
    }
  }
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
