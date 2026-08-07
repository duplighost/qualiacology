// Capture 1280x720 card art for game folders by actually rendering them in Chrome.
// Usage: node build/scripts/capture-game-cards.mjs --slugs=a,b,c [--port=4176]
// Writes assets/games/<slug>-card-clean.jpg
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, normalize, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, "").split("=")));
const PORT = Number(args.port || 4176);
const slugs = (args.slugs || "").split(",").filter(Boolean);

const MIME = { ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".ico":"image/x-icon",".woff2":"font/woff2",".mp3":"audio/mpeg",".wav":"audio/wav",".ogg":"audio/ogg",".avif":"image/avif",".webmanifest":"application/manifest+json" };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/") p = "/index.html";
    if (p.endsWith("/")) p += "index.html";
    let f = normalize(join(ROOT, p));
    if (!f.startsWith(normalize(ROOT))) { res.writeHead(403); return res.end(); }
    try { const s = await stat(f); if (s.isDirectory()) f = join(f, "index.html"); } catch {}
    const b = await readFile(f);
    res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(b);
  } catch { res.writeHead(404); res.end("404"); }
});
await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: "no-preference" });

for (const slug of slugs) {
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e).slice(0, 100)));
  page.on("response", r => { if (r.status() >= 400) errs.push(r.status() + " " + r.url().replace(`http://localhost:${PORT}`, "")); });
  try {
    await page.goto(`http://localhost:${PORT}/${slug}/`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1800);

    // try to get past a title screen: click a start-ish control, else click the canvas
    const startSel = ['button:has-text("Play")','button:has-text("Start")','button:has-text("Begin")','button:has-text("Enter")','button:has-text("New")','[data-start]','.start','#start'];
    let clicked = false;
    for (const sel of startSel) {
      const el = await page.$(sel);
      if (el && await el.isVisible().catch(() => false)) { await el.click({ timeout: 2000 }).catch(() => {}); clicked = true; break; }
    }
    if (!clicked) {
      await page.mouse.click(640, 400).catch(() => {});
      await page.keyboard.press("Enter").catch(() => {});
      await page.keyboard.press("Space").catch(() => {});
    }
    // let gameplay actually render
    await page.waitForTimeout(3800);
    await page.mouse.move(700, 380);
    await page.waitForTimeout(1200);

    const out = join(ROOT, "assets/games", `${slug}-card-clean.jpg`);
    await page.screenshot({ path: out, type: "jpeg", quality: 88, timeout: 90000, animations: "disabled" });
    const sz = (await stat(out)).size;
    console.log(`${slug.padEnd(19)} wrote ${(sz/1024).toFixed(0)} KB${errs.length ? "  issues=" + errs.slice(0,2).join("; ") : ""}`);
  } catch (e) {
    console.log(`${slug.padEnd(19)} FAILED ${String(e).slice(0, 90)}`);
  }
  await page.close();
}

await browser.close();
server.close();
