// Hosted-path acceptance for SECONDHAND SAINT.
//
// The game's own suite lives in its source repo and passes against a local
// dev server. This checks the thing the site actually serves: that the
// authored player shell binds from the hosted route (a procedural fallback
// still boots green and still looks wrong), that a real click and real keys
// move her and land damage, that pointer lock takes the Qualiacology pill off
// screen and gives it back, and that a phone visitor gets a clean page with a
// way home. It is keyboard/mouse/gamepad only, so mobile is checked for
// reachability, not for playability.
//
// Usage:
//   node build/qa/secondhand-saint-boot-check.mjs <route-url> [capture.png]
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../node_modules/playwright");
const { default: AxeBuilder } = await import("@axe-core/playwright");

const routeUrl = process.argv[2] || "http://127.0.0.1:4173/secondhand-saint/";
const capturePath = process.argv[3] || "";
const base = new URL(routeUrl);
if (!base.pathname.endsWith("/")) base.pathname += "/";

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--use-angle=d3d11",
    "--enable-gpu-rasterization",
    "--mute-audio",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

const errors = [];
const badResponses = [];
const watch = (page, label) => {
  page.on("pageerror", (error) => errors.push(`${label} pageerror: ${error?.message || error}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !/favicon/i.test(message.text())) errors.push(`${label} console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => errors.push(`${label} requestfailed: ${request.url()} (${request.failure()?.errorText || "unknown"})`));
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().startsWith(base.origin)) badResponses.push(`${response.status()} ${response.url()}`);
  });
};

const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await desktopContext.newPage();
watch(page, "desktop");

await page.goto(base.href, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForFunction(() => window.__DUEL_QA__?.ready === true, null, { timeout: 90000 });

const boot = await page.evaluate(() => ({
  buildId: window.__DUEL_QA__.buildId,
  bootError: window.__DUEL_QA__.bootError,
  visual: window.__DUEL_QA__.visualSnapshot(),
  renderer: window.__DUEL_QA__.rendererSummary(),
}));
const assetUrls = await page.evaluate(() => performance.getEntriesByType("resource")
  .map((entry) => entry.name)
  .filter((name) => name.endsWith(".glb")));

// Excluding iframes because Netlify injects its deploy-preview toolbar as one,
// and that widget trips aria-required-children on its own role="tablist". It
// is not our markup and it does not exist in production, so scoring it would
// make this gate fail only on previews. The game itself ships no iframes.
const axe = await new AxeBuilder({ page })
  .exclude("iframe")
  .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
  .analyze();
const seriousAxe = axe.violations.filter((item) => item.impact === "serious" || item.impact === "critical");

// A real click on the real button, then real keys.
await page.locator("#start-button").click();
await page.waitForFunction(() => window.__DUEL_QA__.snapshot().mode === "playing", null, { timeout: 20000 });
const startPosition = await page.evaluate(() => window.__DUEL_QA__.snapshot().player.position);
const bossHpBefore = await page.evaluate(() => window.__DUEL_QA__.snapshot().boss.hp);

await page.waitForFunction(() => document.pointerLockElement === document.querySelector("#game"), null, { timeout: 15000 }).catch(() => {});
// The pill fades out over 160ms and only then flips visibility, so sampling
// the computed style on the same tick as the lock reads it mid-transition.
await page.waitForTimeout(400);
const homeDuringPlay = await page.evaluate(() => {
  const link = document.querySelector(".home-link");
  const style = link ? getComputedStyle(link) : null;
  return {
    locked: document.documentElement.classList.contains("pointer-locked"),
    opacity: style ? Number(style.opacity) : null,
    visibility: style ? style.visibility : null,
    pointerEvents: style ? style.pointerEvents : null,
  };
});

// Lock on, close the distance, then keep swinging. Landing a hit depends on
// range, so one swing from wherever she happens to be is a flaky assertion.
await page.keyboard.press("KeyQ");
await page.waitForTimeout(250);
await page.keyboard.down("KeyW");
await page.waitForTimeout(1400);
await page.keyboard.up("KeyW");
await page.waitForTimeout(250);
for (let swing = 0; swing < 6; swing += 1) {
  await page.keyboard.press(swing % 3 === 2 ? "KeyK" : "KeyJ");
  await page.waitForTimeout(420);
  if (await page.evaluate((hp) => window.__DUEL_QA__.snapshot().boss.hp < hp, bossHpBefore)) break;
  // Drift back into range between combos rather than swinging at empty air.
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(220);
  await page.keyboard.up("KeyW");
}
await page.waitForTimeout(400);

const play = await page.evaluate(() => window.__DUEL_QA__.snapshot());
const playVisual = await page.evaluate(() => window.__DUEL_QA__.visualSnapshot());
const frames = await page.evaluate(() => window.__DUEL_QA__.renderFrames);
const moved = Math.hypot(play.player.position[0] - startPosition[0], play.player.position[2] - startPosition[2]);

let captureBytes = 0;
if (capturePath) {
  await page.evaluate(() => { const link = document.querySelector(".home-link"); if (link) link.style.visibility = "hidden"; });
  const shot = await page.screenshot({ path: capturePath, type: "png" });
  captureBytes = shot.byteLength;
}

await page.evaluate(() => { if (document.pointerLockElement) document.exitPointerLock(); });
await page.waitForTimeout(400);
const homeAfterUnlock = await page.evaluate(() => {
  const link = document.querySelector(".home-link");
  const style = link ? getComputedStyle(link) : null;
  return {
    locked: document.documentElement.classList.contains("pointer-locked"),
    opacity: style ? Number(style.opacity) : null,
    visibility: style ? style.visibility : null,
    href: link ? link.getAttribute("href") : null,
  };
});
await desktopContext.close();

// A phone cannot play this one. It must still get a clean page and a way home.
const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const mobilePage = await mobileContext.newPage();
watch(mobilePage, "mobile");
await mobilePage.goto(base.href, { waitUntil: "domcontentloaded", timeout: 90000 });
await mobilePage.waitForFunction(() => window.__DUEL_QA__?.ready === true, null, { timeout: 90000 });
const mobileState = await mobilePage.evaluate(() => {
  const rect = document.querySelector(".home-link")?.getBoundingClientRect();
  return {
    viewport: [innerWidth, innerHeight],
    page: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    home: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
    zoomBlocked: /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(
      document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "",
    ),
  };
});
await mobileContext.close();
await browser.close();

const failures = [];
const check = (condition, message) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${message}`);
  if (!condition) failures.push(message);
};

check(boot.buildId === "secondhand-saint-1.5.0", `exact build id (${boot.buildId})`);
check(!boot.bootError, `boot reports no error (${boot.bootError || "none"})`);
check(boot.renderer?.webgl2 === true, "WebGL2 context");
check(boot.visual?.mode === "authored", `authored player shell bound, not the procedural fallback (${boot.visual?.mode})`);
check(boot.visual?.mappedBones?.length === 20, `all 20 bone mappings resolved (${boot.visual?.mappedBones?.length})`);
check(boot.visual?.missingBones?.length === 0, `no missing authored bones (${boot.visual?.missingBones?.length})`);
check(boot.visual?.finitePose === true, "authored pose is finite");
check(assetUrls.length > 0 && assetUrls.every((url) => new URL(url).pathname.startsWith(`${base.pathname}assets/`)),
  `the character model loads from inside ${base.pathname} (${assetUrls.length} glb request(s))`);
check(play.mode === "playing", `real START click begins the duel (${play.mode})`);
check(moved > 0.5, `real W moves her (${moved.toFixed(2)} m)`);
check(play.boss.hp < bossHpBefore, `real attacks land damage (${bossHpBefore} -> ${play.boss.hp})`);
check(Number.isFinite(playVisual?.gripError) && playVisual.gripError <= 0.8, `greatblade stays in her hand (gripError ${playVisual?.gripError})`);
check(frames > 60, `frames actually rendered (${frames})`);
check(homeDuringPlay.locked !== true || (homeDuringPlay.opacity === 0 && homeDuringPlay.visibility === "hidden"),
  "pointer lock takes the Qualiacology pill off screen");
check(homeAfterUnlock.locked === false && homeAfterUnlock.opacity === 1 && homeAfterUnlock.href === "/",
  "leaving pointer lock restores the Qualiacology return link");
check(seriousAxe.length === 0, `game page has zero serious/critical Axe violations${seriousAxe.length ? `: ${seriousAxe.map((item) => item.id).join(", ")}` : ""}`);
check(mobileState.viewport[0] === 390 && mobileState.page[0] <= 391, `390px layout has no horizontal overflow (${mobileState.page[0]}px)`);
check(mobileState.home?.width > 0 && mobileState.home?.height > 0, "a phone visitor still gets a visible way back to Qualiacology");
check(mobileState.zoomBlocked === false, "viewport does not block pinch zoom");
if (capturePath) check(captureBytes > 20000, `representative 1280x720 capture contains rendered pixels (${captureBytes} bytes)`);
check(badResponses.length === 0, `zero same-origin HTTP errors${badResponses.length ? `: ${badResponses.slice(0, 4).join(" | ")}` : ""}`);
check(errors.length === 0, `zero page, console, and request errors${errors.length ? `: ${errors.slice(0, 4).join(" | ")}` : ""}`);

console.log(failures.length ? `\nSECONDHAND SAINT HOSTED-PATH CHECK FAILED (${failures.length})` : "\nSECONDHAND SAINT HOSTED-PATH CHECK PASSED");
process.exit(failures.length ? 1 : 0);
