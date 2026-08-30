// Hosted-path acceptance for I SEENT IT.
//
// Usage:
//   node build/qa/i-seent-it-boot-check.mjs <route-url> [capture.png]
import { createRequire } from "node:module";
import { format, parse } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("../node_modules/playwright");
const { default: AxeBuilder } = await import("@axe-core/playwright");

const routeUrl = process.argv[2] || "http://127.0.0.1:4173/i-seent-it/";
const capturePath = process.argv[3] || "";
const base = new URL(routeUrl);
if (!base.pathname.endsWith("/")) base.pathname += "/";

const errors = [];
const badResponses = [];
const resourceUrls = new Set();
const watch = (page, label = "") => {
  const prefix = label ? `${label} ` : "";
  page.on("pageerror", (error) => errors.push(`${prefix}pageerror: ${error?.message || error}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !/favicon/i.test(message.text())) {
      errors.push(`${prefix}console: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    errors.push(`${prefix}requestfailed: ${request.url()} (${request.failure()?.errorText || "unknown"})`);
  });
  page.on("response", (response) => {
    resourceUrls.add(response.url());
    if (response.status() >= 400 && response.url().startsWith(base.origin)) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });
};

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=d3d11", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
});

const desktopContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const desktop = await desktopContext.newPage();
watch(desktop);
await desktop.goto(base.href, { waitUntil: "domcontentloaded", timeout: 90000 });
await desktop.waitForFunction(
  () => document.body.dataset.gameReady === "true" && window.__SEENT_IT__?.snapshot,
  null,
  { timeout: 90000 },
);
await desktop.waitForTimeout(700);

const axe = await new AxeBuilder({ page: desktop })
  .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
  .analyze();
const seriousAxe = axe.violations.filter(
  (item) => item.impact === "serious" || item.impact === "critical",
);

const beforeKeyboard = await desktop.evaluate(() => window.__SEENT_IT__.snapshot());
const canvas = desktop.locator("canvas.game-canvas");
await canvas.click({ position: { x: 360, y: 260 } });
await desktop.keyboard.down("ArrowRight");
await desktop.waitForTimeout(650);
await desktop.keyboard.up("ArrowRight");
await desktop.keyboard.press("Space");
await desktop.waitForTimeout(450);
const afterKeyboard = await desktop.evaluate(() => window.__SEENT_IT__.snapshot());

const desktopState = await desktop.evaluate(() => {
  const rect = (selector) => {
    const box = document.querySelector(selector)?.getBoundingClientRect();
    return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
  };
  const canvas = document.querySelector("canvas.game-canvas");
  const context = canvas?.getContext("2d");
  let visibleSamples = 0;
  let totalSamples = 0;
  if (canvas && context) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const stride = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 64));
    for (let y = 0; y < canvas.height; y += stride) {
      for (let x = 0; x < canvas.width; x += stride) {
        const offset = (y * canvas.width + x) * 4;
        totalSamples += 1;
        if (pixels[offset] + pixels[offset + 1] + pixels[offset + 2] > 45) visibleSamples += 1;
      }
    }
  }
  return {
    title: document.title,
    buildId: document.body.dataset.buildId,
    viewport: [innerWidth, innerHeight],
    page: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    canvas: rect("canvas.game-canvas"),
    home: rect(".qualiacology-home"),
    actions: rect(".case-actions"),
    homeHref: document.querySelector(".qualiacology-home")?.getAttribute("href"),
    openingGone: document.querySelector(".opening-card")?.classList.contains("is-gone"),
    visibleSamples,
    totalSamples,
  };
});

let captureBytes = 0;
if (capturePath) {
  const shot = await desktop.screenshot({ path: capturePath, type: "png" });
  captureBytes = shot.byteLength;
}
await desktopContext.close();

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
const mobile = await mobileContext.newPage();
watch(mobile, "mobile");
await mobile.goto(base.href, { waitUntil: "domcontentloaded", timeout: 90000 });
await mobile.waitForFunction(
  () => document.body.dataset.gameReady === "true" && window.__SEENT_IT__?.snapshot,
  null,
  { timeout: 90000 },
);
await mobile.waitForTimeout(500);
const beforeTouch = await mobile.evaluate(() => window.__SEENT_IT__.snapshot());
const rightButton = mobile.getByRole("button", { name: "Move right" });
const rightBox = await rightButton.boundingBox();
if (rightBox) {
  await mobile.mouse.move(rightBox.x + rightBox.width / 2, rightBox.y + rightBox.height / 2);
  await mobile.mouse.down();
  await mobile.waitForTimeout(650);
  await mobile.mouse.up();
}
await mobile.getByRole("button", { name: "Jump" }).click();
await mobile.waitForTimeout(350);
const afterTouch = await mobile.evaluate(() => window.__SEENT_IT__.snapshot());
const mobileState = await mobile.evaluate(() => {
  const rect = (selector) => {
    const box = document.querySelector(selector)?.getBoundingClientRect();
    return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
  };
  return {
    viewport: [innerWidth, innerHeight],
    page: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    coarse: matchMedia("(pointer: coarse)").matches,
    controlsDisplay: getComputedStyle(document.querySelector(".touch-controls")).display,
    home: rect(".qualiacology-home"),
    left: rect('[aria-label="Move left"]'),
    right: rect('[aria-label="Move right"]'),
    jump: rect('[aria-label="Jump"]'),
  };
});
let mobileCaptureBytes = 0;
if (capturePath) {
  const capture = parse(capturePath);
  const mobileCapturePath = format({ ...capture, base: "", name: `${capture.name}-mobile` });
  const shot = await mobile.screenshot({ path: mobileCapturePath, type: "png" });
  mobileCaptureBytes = shot.byteLength;
}
await mobileContext.close();
const gameResourceUrls = Array.from(resourceUrls);

const catalogResults = [];
let cardCaptureBytes = 0;
for (const dpr of [1, 2, 3]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: dpr,
  });
  const page = await context.newPage();
  watch(page, `catalog dpr${dpr}`);
  await page.goto(new URL("/games/", base.origin).href, { waitUntil: "domcontentloaded", timeout: 90000 });
  const card = page.locator('[data-catalog-game="i-seent-it"]');
  const image = card.locator("img");
  await card.scrollIntoViewIfNeeded();
  await image.evaluate((element) => {
    element.loading = "eager";
  });
  await page.waitForFunction(
    () => {
      const element = document.querySelector('[data-catalog-game="i-seent-it"] img');
      return element?.complete && element.naturalWidth > 0;
    },
    null,
    { timeout: 30000 },
  );
  catalogResults.push(await image.evaluate((element, scale) => ({
    dpr: scale,
    currentSrc: element.currentSrc,
    naturalWidth: element.naturalWidth,
    naturalHeight: element.naturalHeight,
    href: element.closest("a")?.getAttribute("href"),
  }), dpr));
  if (capturePath && dpr === 1) {
    const capture = parse(capturePath);
    const cardCapturePath = format({ ...capture, base: "", name: `${capture.name}-card` });
    const shot = await card.screenshot({ path: cardCapturePath, type: "png" });
    cardCaptureBytes = shot.byteLength;
  }
  await context.close();
}
await browser.close();

const failures = [];
const check = (condition, message) => {
  console.log(`${condition ? "PASS" : "FAIL"} ${message}`);
  if (!condition) failures.push(message);
};
const overlaps = (a, b) => Boolean(
  a && b && !(
    a.x + a.width <= b.x || b.x + b.width <= a.x
    || a.y + a.height <= b.y || b.y + b.height <= a.y
  ),
);

check(desktopState.title === "I SEENT IT | Qualiacology", `site title is exact (${desktopState.title})`);
check(desktopState.buildId === "i-seent-it-2.0.0", `exact campaign build (${desktopState.buildId})`);
check(beforeKeyboard.buildId === "i-seent-it-2.0.0" && afterKeyboard.buildId === beforeKeyboard.buildId, "runtime API reports the exact release before and after input");
check(afterKeyboard.tick > beforeKeyboard.tick, `real keyboard input advances play (${beforeKeyboard.tick} -> ${afterKeyboard.tick})`);
check(afterKeyboard.player.x !== beforeKeyboard.player.x, `real keyboard input moves the player (${beforeKeyboard.player.x.toFixed(1)} -> ${afterKeyboard.player.x.toFixed(1)})`);
check(desktopState.openingGone === true, "first real input dismisses the opening card and gives immediate control");
check(desktopState.canvas?.width > 800 && desktopState.canvas?.height > 500, `game canvas is visibly large (${Math.round(desktopState.canvas?.width || 0)}x${Math.round(desktopState.canvas?.height || 0)})`);
check(desktopState.visibleSamples > desktopState.totalSamples * 0.12, `canvas contains player-visible pixels (${desktopState.visibleSamples}/${desktopState.totalSamples} lit samples)`);
check(desktopState.page[0] <= desktopState.viewport[0] && desktopState.page[1] <= desktopState.viewport[1], `desktop release has no overflow (${desktopState.page.join("x")})`);
check(desktopState.homeHref === "/" && desktopState.home?.width > 0, "Qualiacology return pill is visible and same-origin");
check(!overlaps(desktopState.home, desktopState.actions), "Qualiacology return pill clears the case controls");
check(seriousAxe.length === 0, `game page has zero serious/critical Axe violations${seriousAxe.length ? `: ${seriousAxe.map((item) => item.id).join(", ")}` : ""}`);
check(mobileState.viewport[0] === 390 && mobileState.page[0] <= 391, `390px layout has no horizontal overflow (${mobileState.page[0]}px)`);
check(mobileState.coarse === true && mobileState.controlsDisplay !== "none", "coarse-pointer layout exposes touch controls");
check([mobileState.left, mobileState.right, mobileState.jump].every((box) => box?.width >= 48 && box?.height >= 48), "all three touch controls meet the 48px target floor");
check(!overlaps(mobileState.left, mobileState.right) && !overlaps(mobileState.right, mobileState.jump), "touch controls do not overlap one another");
check(!overlaps(mobileState.home, mobileState.jump) && !overlaps(mobileState.home, mobileState.right), "Qualiacology return pill clears the touch controls");
check(afterTouch.tick > beforeTouch.tick, `touch-layout play advances (${beforeTouch.tick} -> ${afterTouch.tick})`);
check(afterTouch.player.x !== beforeTouch.player.x, `held touch control moves the player (${beforeTouch.player.x.toFixed(1)} -> ${afterTouch.player.x.toFixed(1)})`);
check(catalogResults.length === 3 && catalogResults.every((item) => new URL(item.currentSrc).pathname.startsWith("/assets/catalog/games/i-seent-it-") && new URL(item.currentSrc).pathname.endsWith(".avif")), `catalog selects I SEENT IT AVIF tiers at DPR 1/2/3 (${catalogResults.map((item) => `${item.dpr}x:${new URL(item.currentSrc).pathname.split("/").at(-1)}`).join(", ")})`);
check(catalogResults.every((item) => Math.abs(item.naturalWidth / item.naturalHeight - 16 / 9) < 0.01), `every displayed catalog tier preserves the 16:9 master (${catalogResults.map((item) => `${item.naturalWidth}x${item.naturalHeight}`).join(", ")})`);
check(catalogResults.every((item) => item.href === "/i-seent-it/"), "catalog card links to the canonical game route at every DPR");
check(gameResourceUrls.every((url) => new URL(url).origin === base.origin), "game loads no external runtime resources");
check(gameResourceUrls.filter((url) => new URL(url).pathname.includes("/assets/")).every((url) => new URL(url).pathname.startsWith(`${base.pathname}assets/`)), "hashed runtime assets stay under the game route");
if (capturePath) check(captureBytes > 30000, `representative capture contains rendered pixels (${captureBytes} bytes)`);
if (capturePath) check(mobileCaptureBytes > 15000, `representative mobile capture contains rendered pixels (${mobileCaptureBytes} bytes)`);
if (capturePath) check(cardCaptureBytes > 15000, `catalog capture contains the selected art (${cardCaptureBytes} bytes)`);
check(badResponses.length === 0, `zero same-origin HTTP errors${badResponses.length ? `: ${badResponses.slice(0, 4).join(" | ")}` : ""}`);
check(errors.length === 0, `zero page, console, and request errors${errors.length ? `: ${errors.slice(0, 4).join(" | ")}` : ""}`);

console.log(failures.length ? `\nI SEENT IT HOSTED-PATH CHECK FAILED (${failures.length})` : "\nI SEENT IT HOSTED-PATH CHECK PASSED");
process.exit(failures.length ? 1 : 0);
