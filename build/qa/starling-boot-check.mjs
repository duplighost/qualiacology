/* STARLING boot check — pixels, not counters.
 *
 * Written to the lesson recorded in AGENTS.md: FETCH 0.6.1 passed seventy-four
 * counter-based assertions and shipped a game you could hear and not see,
 * because every suite booted a test flag and none of them ever looked at the
 * screen. So this one boots the page exactly the way a player does — no query
 * string, no injected state — and reads the canvas back.
 *
 * The three things it will not take on trust:
 *   1. there are birds on screen while the game is running;
 *   2. an alarm visibly crosses them — pale birds appear where dark ones were;
 *   3. the alarm is worth something — a falcon that strikes an unwarned flock
 *      kills, and the same strike on a warned one does not.
 *
 * Counting is done against a per-row median rather than a fixed threshold,
 * because the sky is a gradient that moves through the whole evening: any
 * absolute brightness cutoff passes at dusk and fails at night, or the reverse.
 *
 * Usage: serve the repo, then
 *   node build/qa/starling-boot-check.mjs http://localhost:4173/starling/
 */

import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:4173/starling/";
const failures = [];
const note = (ok, message) => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${message}`);
  if (!ok) failures.push(message);
};

const browser = await chromium.launch(
  process.env.QA_CHROME_PATH
    ? { executablePath: process.env.QA_CHROME_PATH, headless: true }
    : { channel: "chrome", headless: true },
);
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

/* Counts pixels that stand out against their own row of sky. Runs inside the
 * page and inside the same frame the game just drew, so it reads what a player
 * would actually be looking at. */
const sample = () => page.evaluate(() => {
  const c = document.getElementById("sky");
  const g = c.getContext("2d");
  const W = c.width, H = c.height;
  const y0 = Math.round(H * 0.08), y1 = Math.round(H * 0.62);
  let dark = 0, pale = 0;
  const lums = new Float64Array(W);
  for (let y = y0; y < y1; y += 6) {
    const d = g.getImageData(0, y, W, 1).data;
    for (let x = 0; x < W; x++) {
      const i = x * 4;
      lums[x] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    }
    const sorted = Array.from(lums).sort((a, b) => a - b);
    const med = sorted[W >> 1];
    for (let x = 0; x < W; x++) {
      if (lums[x] < med - 16) dark++;
      else if (lums[x] > med + 26) pale++;
    }
  }
  return { dark, pale };
});

await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(4000);

/* 1. Is anything there? */
const idle = await sample();
note(idle.dark > 3000, `flock is on screen before any input (${idle.dark} bird pixels, want >3000)`);

/* Start the run the way a player does: move the pointer. */
await page.mouse.move(640, 360);
await page.waitForTimeout(300);
note(await page.evaluate(() => window.__STARLING.game.phase === "hunt"), "moving the pointer starts the evening");

/* 2. Does an alarm visibly cross the flock?
 * The bank is driven by real pointer motion, not by poking the player object. */
/* Let the flock's patience come back first. Habituation is real and it means a
 * wave sent right after several others is deliberately faint — sampling then
 * measures the flock ignoring you, which is correct behaviour and a useless
 * test of whether alarm is visible at all. */
await page.waitForFunction(() => window.__STARLING.game.player.credit > 0.95, null, { timeout: 15000 });
const before = await sample();
const wavesBefore = await page.evaluate(() => window.__STARLING.game.player.waves);
/* A real swerve, not a nudge. The trigger wants roughly a quarter second of
 * committed turning, so a single pointer jump does not do it — dragging the
 * cursor across and around does, which is what a player's hand does anyway. */
let fired = 0;
try {
  for (let i = 0; i < 14 && !fired; i++) {
    await page.mouse.move(640 + Math.cos(i / 2.2) * 420, 360 + Math.sin(i / 2.2) * 230);
    await page.waitForTimeout(40);
    fired = await page.evaluate(() => window.__STARLING.game.player.waves) - wavesBefore;
  }
  /* Catch it while it is still young. The band is brightest where it starts
   * and fades as it travels, so a sample taken half a second later is looking
   * at a wave that has correctly nearly spent itself, and reads as nothing
   * having happened. */
  await page.waitForFunction(
    (n) => window.__STARLING.game.player.waves > n,
    wavesBefore, { polling: "raf", timeout: 6000 },
  );
} catch { /* fall through to the assertions below */ }
fired = await page.evaluate(() => window.__STARLING.game.player.waves) - wavesBefore;
note(fired > 0, `swerving raises the alarm (${fired} wave${fired === 1 ? "" : "s"} sent)`);
const during = await sample();
note(during.pale > before.pale + 250,
  `and it lights the flock (pale pixels ${before.pale} -> ${during.pale})`);
await page.waitForTimeout(2200);
const after = await sample();
note(after.pale < during.pale * 0.6,
  `and it passes rather than staying lit (pale back to ${after.pale})`);

/* 3. Is the alarm worth anything?
 * Same falcon, same flock, twice: once unwarned, once with a wave landing on
 * the target. If these two come out the same the game has no mechanic, which
 * has already happened once — an earlier build let every bird see the falcon
 * for itself, and a player who did nothing at all lost one bird in nine
 * stoops. */
const strike = (warn) => page.evaluate(async (doWarn) => {
  const g = window.__STARLING.game;
  const f = g.flock;
  /* Park the player out of the way and stop it being able to raise the alarm.
   * Without this it keeps flying toward wherever the cursor was left, banks on
   * its own, and warns the flock during the run that is supposed to be the
   * unwarned one — which showed up as the falcon catching nothing and looked
   * exactly like the bug this check exists to catch. */
  g.input.aimActive = false; g.input.keyTurn = 0;
  g.player.x = 20; g.player.y = 20; g.player.dir = -Math.PI / 2;
  g.player.bank = 0; g.player.cool = 1e9;
  g.waves.clear();
  for (let i = 0; i < f.n; i++) { f.alarm[i] = 0; f.alive[i] = 1; }
  f.aliveCount = f.n;
  g.falcon.phase = "away"; g.falcon.active = false;
  g.falcon.begin(f);
  const before = f.aliveCount;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  /* Timed off the falcon's own clock, not the wall clock. The game advances on
   * simulation time with a clamped delta, so on a slow machine a wall-clock
   * wait lands somewhere else entirely in the dive — an earlier version of
   * this check warned 1.2 seconds before impact instead of half a second,
   * watched the alarm decay exactly as designed, and reported a broken game.
   *
   * Half a second before impact is the real window. Warning earlier genuinely
   * does not work and is not a bug: it is why panicking the moment the falcon
   * appears scores about the same as doing nothing at all. */
  while (g.falcon.phase === "mark") await wait(16);
  while (g.falcon.phase === "stoop" && g.falcon.t < 0.5) await wait(8);
  if (doWarn) g.waves.emit(g.falcon.tx, g.falcon.ty, 1);
  while (g.falcon.phase === "mark" || g.falcon.phase === "stoop") await wait(16);
  g.player.cool = 0;
  return before - f.aliveCount;
}, warn);

const unwarned = await strike(false);
const warned = await strike(true);
note(unwarned > 20, `an unwarned flock loses birds to a stoop (${unwarned} taken)`);
note(warned === 0, `a warned flock does not (${warned} taken)`);
note(errors.length === 0, `no console or page errors (${errors.length}${errors.length ? ": " + errors[0] : ""})`);

await browser.close();
console.log(failures.length ? `\nSTARLING boot check FAILED (${failures.length})` : "\nSTARLING boot check passed");
process.exit(failures.length ? 1 : 0);
