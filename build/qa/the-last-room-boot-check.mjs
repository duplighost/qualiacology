// Hosted-path acceptance for THE LAST ROOM.
//
// This deliberately watches the painting requests. The game's own health
// snapshot stays green when those textures 404, so a boot-only check can miss
// most of the authored wall art when the Vite bundle moves under a subfolder.
//
// Usage:
//   node build/qa/the-last-room-boot-check.mjs <route-url> [capture.png]
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("../node_modules/playwright");
const { default: AxeBuilder } = await import("@axe-core/playwright");

const routeUrl = process.argv[2] || "http://127.0.0.1:4173/the-last-room/";
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
const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await desktopContext.newPage();
const errors = [];
const badResponses = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error?.message || error}`));
page.on("console", (message) => {
  if (message.type() === "error" && !/favicon/i.test(message.text())) errors.push(`console: ${message.text()}`);
});
page.on("requestfailed", (request) => errors.push(`requestfailed: ${request.url()} (${request.failure()?.errorText || "unknown"})`));
page.on("response", (response) => {
  if (response.status() >= 400 && response.url().startsWith(base.origin)) {
    badResponses.push(`${response.status()} ${response.url()}`);
  }
});

const captureUrl = new URL(base);
captureUrl.searchParams.set("autotest", "1");
captureUrl.searchParams.set("seed", "visual-mansion");
captureUrl.searchParams.set("wing", "0");
captureUrl.searchParams.set("view", "upper");
await page.goto(captureUrl.href, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForFunction(() => document.body.dataset.gameReady === "true" && window.__LAST_ROOM__?.snapshot, null, { timeout: 90000 });
await page.waitForFunction(() => performance.getEntriesByType("resource").filter((entry) => entry.name.includes("/assets/paintings/")).length === 15, null, { timeout: 30000 });
await page.waitForTimeout(5000);

const captureState = await page.evaluate(() => {
  const snapshot = window.__LAST_ROOM__.snapshot();
  const paintingUrls = performance.getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((name) => name.includes("/assets/paintings/"));
  return {
    buildId: snapshot.buildId,
    validation: snapshot.validation,
    errors: snapshot.errors,
    stats: snapshot.stats,
    paintingUrls,
  };
});

let captureBytes = 0;
if (capturePath) {
  await page.evaluate(() => {
    for (const selector of [".home-link", "#reticle", "#hand", "#room-name", "#marrow-counter", "#touch-ui", "#announce"]) {
      const element = document.querySelector(selector);
      if (element) element.style.visibility = "hidden";
    }
  });
  const shot = await page.screenshot({ path: capturePath, type: "png" });
  captureBytes = shot.byteLength;
}

const playUrl = new URL(base);
playUrl.searchParams.set("seed", "hosted-path-player-start");
await page.goto(playUrl.href, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForFunction(() => document.body.dataset.gameReady === "true" && window.__LAST_ROOM__?.snapshot, null, { timeout: 90000 });
const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
const seriousAxe = axe.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
await page.locator("#enter").click();
await page.waitForFunction(() => window.__LAST_ROOM__.audioSnapshot().active === true, null, { timeout: 15000 });
await page.waitForFunction(() => document.pointerLockElement === document.querySelector("#scene"), null, { timeout: 15000 });
const homeDuringPlay = await page.evaluate(() => {
  const link = document.querySelector(".home-link");
  return {
    hidden: link?.hidden,
    display: link ? getComputedStyle(link).display : null,
    focused: document.activeElement === link,
  };
});
await page.keyboard.down("KeyW");
await page.waitForTimeout(900);
await page.keyboard.up("KeyW");
await page.waitForTimeout(250);
const playState = await page.evaluate(() => ({
  snapshot: window.__LAST_ROOM__.snapshot(),
  audio: window.__LAST_ROOM__.audioSnapshot(),
}));
await page.keyboard.press("Escape");
await page.waitForTimeout(250);
if (await page.evaluate(() => Boolean(document.pointerLockElement))) {
  await page.evaluate(() => document.exitPointerLock());
}
await page.waitForFunction(() => !document.pointerLockElement && document.querySelector(".home-link")?.hidden === false && document.querySelector("#pause")?.hidden === false, null, { timeout: 15000 });
const homeAfterUnlock = await page.evaluate(() => {
  const link = document.querySelector(".home-link");
  return {
    hidden: link?.hidden,
    display: link ? getComputedStyle(link).display : null,
    pauseVisible: document.querySelector("#pause")?.hidden === false,
  };
});
await desktopContext.close();

const storageContext = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 1 });
const storagePage = await storageContext.newPage();
storagePage.on("pageerror", (error) => errors.push(`storage pageerror: ${error?.message || error}`));
storagePage.on("console", (message) => {
  const text = message.text();
  const intentionalStorageProbe = text === "SecurityError: Storage disabled for hosted-path check";
  if (message.type() === "error" && !/favicon/i.test(text) && !intentionalStorageProbe) errors.push(`storage console: ${text}`);
});
storagePage.on("requestfailed", (request) => errors.push(`storage requestfailed: ${request.url()} (${request.failure()?.errorText || "unknown"})`));
await storagePage.addInitScript(() => {
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    get() { throw new DOMException("Storage disabled for hosted-path check", "SecurityError"); },
  });
});
const storageUrl = new URL(base);
storageUrl.searchParams.set("autotest", "1");
await storagePage.goto(storageUrl.href, { waitUntil: "domcontentloaded", timeout: 90000 });
await storagePage.waitForFunction(() => document.body.dataset.gameReady === "true" && window.__LAST_ROOM__?.snapshot, null, { timeout: 90000 });
const firstStorageSeed = await storagePage.evaluate(() => window.__LAST_ROOM__.snapshot().seed);
await storagePage.evaluate(() => document.querySelector("#new-house").click());
await storagePage.waitForFunction((previousSeed) => window.__LAST_ROOM__.snapshot().seed !== previousSeed, firstStorageSeed, { timeout: 30000 });
const storageState = await storagePage.evaluate(() => window.__LAST_ROOM__.snapshot());
await storageContext.close();

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
const mobilePage = await mobileContext.newPage();
mobilePage.on("pageerror", (error) => errors.push(`mobile pageerror: ${error?.message || error}`));
mobilePage.on("console", (message) => {
  if (message.type() === "error" && !/favicon/i.test(message.text())) errors.push(`mobile console: ${message.text()}`);
});
mobilePage.on("requestfailed", (request) => errors.push(`mobile requestfailed: ${request.url()} (${request.failure()?.errorText || "unknown"})`));
await mobilePage.goto(playUrl.href, { waitUntil: "domcontentloaded", timeout: 90000 });
await mobilePage.waitForFunction(() => document.body.dataset.gameReady === "true", null, { timeout: 90000 });
await mobilePage.locator("#enter").click({ timeout: 90000 });
await mobilePage.waitForTimeout(900);
const mobileState = await mobilePage.evaluate(() => {
  const box = (selector) => {
    const rect = document.querySelector(selector)?.getBoundingClientRect();
    return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
  };
  return {
    viewport: [innerWidth, innerHeight],
    page: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    coarse: matchMedia("(pointer: coarse)").matches,
    touchDisplay: getComputedStyle(document.querySelector("#touch-ui")).display,
    home: box(".home-link"),
    move: box("#move-zone"),
    pause: box("#touch-pause"),
    crouch: box("#touch-crouch"),
    jump: box("#touch-jump"),
    throwButton: box("#touch-throw"),
    bone: box("#marrow-counter"),
  };
});
await mobileContext.close();

await browser.close();

const failures = [];
const check = (condition, message) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${message}`);
  if (!condition) failures.push(message);
};
const overlaps = (a, b) => Boolean(a && b && !(
  a.x + a.width <= b.x || b.x + b.width <= a.x
  || a.y + a.height <= b.y || b.y + b.height <= a.y
));

check(captureState.buildId === "the-last-room-1.5.0-architectural-variety", `exact v1.5.0 build (${captureState.buildId})`);
check(captureState.validation?.ok === true, "generated wing passes architectural validation");
check(captureState.errors?.length === 0, `game reports zero errors (${captureState.errors?.length || 0})`);
check(captureState.stats?.rooms >= 6, `furnished room graph loaded (${captureState.stats?.rooms || 0} rooms)`);
check(captureState.stats?.topologyAreas >= 2, `landmark topology loaded (${captureState.stats?.topologyAreas || 0} areas)`);
check(captureState.stats?.paintings >= 8, `painting placements loaded (${captureState.stats?.paintings || 0})`);
check(captureState.paintingUrls.length === 15, `all painting textures requested from the hosted route (${captureState.paintingUrls.length}/15)`);
check(captureState.paintingUrls.every((url) => new URL(url).pathname.startsWith(`${base.pathname}assets/paintings/`)), "painting textures stay inside /the-last-room/");
check(playState.snapshot?.validation?.ok === true, "real ENTER click starts a valid house");
check(playState.audio?.active === true, "spatial sound activates from the real start gesture");
check(playState.snapshot?.errors?.length === 0, "real player start reports zero game errors");
check(homeDuringPlay.hidden === true && homeDuringPlay.display === "none" && homeDuringPlay.focused === false, "pointer lock removes the Qualiacology link from paint, focus, and hit testing");
check(homeAfterUnlock.hidden === false && homeAfterUnlock.display !== "none" && homeAfterUnlock.pauseVisible === true, "leaving pointer lock restores the Qualiacology return link and pause state");
check(storageState?.ready === true && storageState?.validation?.ok === true, "storage-disabled browsers boot and start a new house");
check(storageState?.seed && storageState.seed !== firstStorageSeed, "NEW HOUSE keeps an in-memory seed when sessionStorage throws");
check(storageState?.errors?.length === 0, "storage-disabled run reports zero game errors");
check(seriousAxe.length === 0, `game page has zero serious/critical Axe violations${seriousAxe.length ? `: ${seriousAxe.map((item) => item.id).join(", ")}` : ""}`);
check(mobileState.viewport[0] === 390 && mobileState.page[0] <= 391, `390px touch layout has no horizontal overflow (${mobileState.page[0]}px)`);
check(mobileState.coarse === true && mobileState.touchDisplay !== "none", "390px mobile context exposes coarse pointer controls");
check([mobileState.crouch, mobileState.jump, mobileState.throwButton].every((box) => box?.width > 0 && box?.height > 0), "touch actions are visibly rendered");
check(mobileState.crouch?.width <= 65 && mobileState.jump?.width <= 65 && mobileState.throwButton?.width <= 65, "touch actions keep their authored 64px width");
check(!overlaps(mobileState.crouch, mobileState.jump), "HOP and DUCK do not overlap");
check(!overlaps(mobileState.jump, mobileState.throwButton) && !overlaps(mobileState.crouch, mobileState.throwButton), "THROW does not overlap HOP or DUCK");
check(!overlaps(mobileState.home, mobileState.pause) && !overlaps(mobileState.home, mobileState.bone), "Qualiacology return control clears PAUSE and the bone counter on touch");
check(!overlaps(mobileState.home, mobileState.move), "Qualiacology return control clears the movement pad on touch");
if (capturePath) check(captureBytes > 20000, `representative 1280x720 capture contains rendered pixels (${captureBytes} bytes)`);
check(badResponses.length === 0, `zero same-origin HTTP errors${badResponses.length ? `: ${badResponses.slice(0, 4).join(" | ")}` : ""}`);
check(errors.length === 0, `zero page, console, and request errors${errors.length ? `: ${errors.slice(0, 4).join(" | ")}` : ""}`);

console.log(failures.length ? `\nTHE LAST ROOM HOSTED-PATH CHECK FAILED (${failures.length})` : "\nTHE LAST ROOM HOSTED-PATH CHECK PASSED");
process.exit(failures.length ? 1 : 0);
