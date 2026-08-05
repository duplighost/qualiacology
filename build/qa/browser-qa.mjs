import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createStaticServer } from "../scripts/static-server.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The generator now emits into the repo root (one level above build/).
const outputRoot = resolve(projectRoot, "..");
const resultsRoot = join(projectRoot, "qa", "results");
const baseUrl = "http://127.0.0.1:4174";
const viewports = [
  { width: 320, height: 700 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 640, height: 900 },
  { width: 768, height: 1024 },
  { width: 860, height: 900 },
  { width: 899, height: 900 },
  { width: 900, height: 900 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];
const routes = ["/", "/psychopharmacology/", "/games/", "/music/"];
const failures = [];
const report = { viewports: [], routes: [], interactions: {}, accessibility: [] };

function check(condition, message) {
  if (!condition) failures.push(message);
}

function attachErrorCapture(page, label) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => errors.push(`requestfailed: ${request.url()} (${request.failure()?.errorText || "unknown"})`));
  return () => {
    for (const error of errors) failures.push(`${label} ${error}`);
    return errors;
  };
}

mkdirSync(resultsRoot, { recursive: true });
const server = await createStaticServer({ root: outputRoot, port: 4174 });
const browser = await chromium.launch({ channel: "chrome", headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, colorScheme: "dark" });
    const page = await context.newPage();
    const finishErrors = attachErrorCapture(page, `home ${viewport.width}x${viewport.height}`);
    const initialRequests = [];
    page.on("request", (request) => initialRequests.push(request.url()));
    const response = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    check(response?.status() === 200, `Homepage returned ${response?.status()} at ${viewport.width}x${viewport.height}`);

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const hero = document.querySelector(".hero");
      const menu = document.querySelector("[data-menu-open]");
      const desktopNav = document.querySelector(".desktop-nav");
      const rect = (element) => element?.getBoundingClientRect();
      return {
        width: innerWidth,
        height: innerHeight,
        pageHeight: root.scrollHeight,
        pageWidth: root.scrollWidth,
        heroHeight: rect(hero)?.height || 0,
        menuVisible: Boolean(menu && rect(menu)?.width && getComputedStyle(menu).display !== "none"),
        desktopVisible: Boolean(desktopNav && rect(desktopNav)?.width && getComputedStyle(desktopNav).display !== "none"),
        h1Visible: Boolean(document.querySelector("h1") && rect(document.querySelector("h1")).height > 0),
        bodyGameCount: document.body.dataset.gameCount,
        bodyAlbumCount: document.body.dataset.albumCount,
      };
    });

    report.viewports.push({ viewport, ...metrics, errors: finishErrors() });
    check(metrics.pageWidth <= metrics.width + 1, `Horizontal overflow at ${viewport.width}x${viewport.height}: ${metrics.pageWidth} > ${metrics.width}`);
    check(metrics.h1Visible, `Homepage H1 is not visible at ${viewport.width}x${viewport.height}`);
    check(metrics.bodyGameCount === "37" && metrics.bodyAlbumCount === "10", `Catalog proof counts drifted at ${viewport.width}px`);
    check(!initialRequests.some((url) => url.includes("/assets/audio/")), `Audio requested before opt-in at ${viewport.width}px`);

    if (viewport.width < 960) {
      check(metrics.menuVisible && !metrics.desktopVisible, `Mobile navigation breakpoint failed at ${viewport.width}px`);
    } else {
      check(!metrics.menuVisible && metrics.desktopVisible, `Desktop navigation breakpoint failed at ${viewport.width}px`);
    }

    if (viewport.width === 390) {
      check(metrics.pageHeight <= 6600, `390px homepage is too long: ${metrics.pageHeight}px`);
      check(metrics.heroHeight <= viewport.height * 1.25, `390px hero exceeds 1.25 viewports: ${metrics.heroHeight}px`);
      await page.screenshot({ path: join(resultsRoot, "home-390x844.png"), fullPage: true, animations: "disabled" });
    }

    if (viewport.width === 1440) {
      // 6700: the 2026-07-24 psych-section redesign (server pillars + inline facts) sits at ~6617px.
      check(metrics.pageHeight <= 6700, `1440px homepage is too long: ${metrics.pageHeight}px`);
      await page.screenshot({ path: join(resultsRoot, "home-1440x900.png"), fullPage: true, animations: "disabled" });
    }

    await context.close();
  }

  for (const route of routes) {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const context = await browser.newContext({ viewport, colorScheme: "dark" });
      const page = await context.newPage();
      const finishErrors = attachErrorCapture(page, `${route} ${viewport.width}px`);
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      const routeMetrics = await page.evaluate(() => ({
        title: document.title,
        h1: document.querySelector("h1")?.textContent.trim(),
        pageWidth: document.documentElement.scrollWidth,
        width: innerWidth,
      }));
      check(response?.status() === 200, `${route} returned ${response?.status()} at ${viewport.width}px`);
      check(Boolean(routeMetrics.h1), `${route} has no visible H1 at ${viewport.width}px`);
      check(routeMetrics.pageWidth <= routeMetrics.width + 1, `${route} overflows horizontally at ${viewport.width}px`);

      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = axe.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
      report.accessibility.push({ route, viewport: viewport.width, violations: axe.violations.length, serious: serious.map((item) => item.id) });
      check(serious.length === 0, `${route} has serious/critical Axe violations at ${viewport.width}px: ${serious.map((item) => item.id).join(", ")}`);
      report.routes.push({ route, viewport, ...routeMetrics, errors: finishErrors() });
      await context.close();
    }
  }

  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
    const page = await context.newPage();
    const finishErrors = attachErrorCapture(page, "mobile interactions");
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });

    await page.keyboard.press("Tab");
    const firstFocus = await page.evaluate(() => ({ text: document.activeElement?.textContent.trim(), href: document.activeElement?.getAttribute("href") }));
    check(firstFocus.href === "#main-content", `Skip link is not first keyboard target: ${JSON.stringify(firstFocus)}`);

    const opener = page.getByRole("button", { name: "Menu" });
    await opener.click();
    check(await page.locator("dialog").evaluate((dialog) => dialog.open), "Mobile dialog did not open");
    check(await page.evaluate(() => document.body.classList.contains("menu-open")), "Body scroll was not locked for mobile dialog");
    for (let index = 0; index < 9; index += 1) {
      await page.keyboard.press("Tab");
      check(await page.evaluate(() => document.querySelector("dialog").contains(document.activeElement)), `Focus escaped mobile dialog on Tab ${index + 1}`);
    }
    await page.keyboard.press("Escape");
    check(!(await page.locator("dialog").evaluate((dialog) => dialog.open)), "Escape did not close mobile dialog");
    check(await opener.evaluate((button) => button === document.activeElement), "Focus was not restored to the menu opener");

    const audioRequests = [];
    page.on("request", (request) => {
      if (request.url().includes("/assets/audio/")) audioRequests.push(request.url());
    });
    check(audioRequests.length === 0, "Audio requested before click in interaction test");
    await page.getByRole("button", { name: "Sound off" }).click();
    await page.waitForTimeout(500);
    const audioOn = await page.locator("[data-audio-toggle]").evaluate((button) => ({ pressed: button.getAttribute("aria-pressed"), text: button.textContent.trim() }));
    check(audioOn.pressed === "true" && audioOn.text === "Sound on", `Sound-on state failed: ${JSON.stringify(audioOn)}`);
    check(audioRequests.length > 0, "Audio did not request after explicit opt-in");
    await page.getByRole("button", { name: "Sound on" }).click();

    report.interactions.mobile = { firstFocus, audioRequests: audioRequests.length, errors: finishErrors() };
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
    const page = await context.newPage();
    const finishErrors = attachErrorCapture(page, "game filters");
    await page.goto(`${baseUrl}/games/`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Horror" }).click();
    const horror = await page.evaluate(() => ({
      status: document.querySelector("[data-filter-status]").textContent.trim(),
      visible: [...document.querySelectorAll("[data-catalog-game]")].filter((item) => !item.hidden).map((item) => item.dataset.catalogGame),
      query: location.search,
    }));
    check(horror.status === "Showing 6 worlds.", `Horror filter status failed: ${horror.status}`);
    check(horror.visible.join(",") === "eaten-path,uninvited,marrow,behind-you,still,the-lag", `Horror filter results failed: ${horror.visible.join(",")}`);
    check(horror.query === "?filter=horror", `Horror filter URL failed: ${horror.query}`);
    report.interactions.filters = { ...horror, errors: finishErrors() };
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    const motion = await page.evaluate(() => ({
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      cardTransition: getComputedStyle(document.querySelector(".work-card")).transitionDuration,
    }));
    check(motion.scrollBehavior === "auto", `Reduced motion did not disable smooth scrolling: ${motion.scrollBehavior}`);
    report.interactions.reducedMotion = motion;
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

report.failures = failures;
writeFileSync(join(resultsRoot, "browser-qa.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error(`Browser QA failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Browser QA passed: ${viewports.length} homepage viewports, ${routes.length * 2} route renders, zero serious/critical Axe violations`);
}
