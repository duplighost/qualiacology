import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createStaticServer } from "./static-server.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootArgument = process.argv.find((argument) => argument.startsWith("--root="))?.slice(7);
const portArgument = Number(process.argv.find((argument) => argument.startsWith("--port="))?.slice(7) || 4175);
const reportArgument = process.argv.find((argument) => argument.startsWith("--report="))?.slice(9);
const outputRoot = rootArgument ? resolve(projectRoot, rootArgument) : join(projectRoot, "work", "qualiacology-unified-hub");
const data = JSON.parse(readFileSync(join(projectRoot, "src", "content", "site-data.json"), "utf8"));
const baseUrl = `http://127.0.0.1:${portArgument}`;
const routes = [
  "/",
  "/psychopharmacology/",
  "/games/",
  "/music/",
  ...data.games.map((game) => `/${game.slug}/`),
  ...data.albums.map((album) => `/music/${album.slug}/`),
  "/fetch/ending/",
  "/instead-of-the-goodbye/",
  "/doopliss/",
  "/no-moon/codex/",
  "/404.html",
];
// Routes that must stay gone. Case guards, the retired book, and games pulled
// from the shelf — asserted 404 so a stray file or redirect cannot quietly
// bring one back.
const retiredRoutes = [
  "/blackthorn-manor/",
  "/dusk",
  "/evensong.html",
  "/sing",
  "/cantor",
  "/neon-breach",
  "/neon-breach.html",
  "/Psychopharmacology/",
  "/assets/Favicon.svg",
  "/book",
  "/book.html",
  "/this-helped-someone/",
  "/this-helped-someone/index.html",
  ...[
    "afterglow",
    "afterparty-at-the-end-of-the-world",
    "cinderbloom",
    "duet",
    "duskfall",
    "echo-saint",
    "evensong",
    "everybody-leaves-in-4-4",
    "false-sun",
    "finale",
    "flare",
    "goodfire",
    "goodnight-little-gods",
    "potlight",
    "relay-eclipse",
    "starling",
    "stay",
    "sundog",
    "the-dead-keep-playing",
    "the-lag",
    "uninvited",
    "unsay-it",
    "vanta-9",
    "vesperbane",
    "ninefold-burn",
  ].map((slug) => `/${slug}/`),
  // NINEFOLD BURN's legacy .html, retired with the game. Its three vanity
  // short links (/ninefold, /burn, /nine-worlds) are NOT here: they now point
  // at SPACEBOARDING, which replaced it.
  "/ninefold-burn.html",
  // STARLING and STAY came off the shelf 2026-08-30 with nothing replacing
  // them, so their legacy .html and every vanity short link they owned were
  // deleted rather than repointed, and are asserted gone here.
  "/starling.html",
  "/murmuration",
  "/flock",
  "/stay.html",
  "/hold",
  "/orbit",
  "/last-call",
];
const results = [];
const failures = [];
const server = await createStaticServer({ root: outputRoot, port: portArgument });

try {
  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`);
    const bytes = (await response.arrayBuffer()).byteLength;
    results.push({ route, status: response.status, type: response.headers.get("content-type"), bytes });
    if (response.status !== 200) failures.push(`${route} returned ${response.status}`);
  }

  for (const route of retiredRoutes) {
    const response = await fetch(`${baseUrl}${route}`);
    results.push({ route, status: response.status, expected: 404 });
    if (response.status !== 404) failures.push(`${route} should be a strict-case 404, got ${response.status}`);
  }

  const manifest = await fetch(`${baseUrl}/assets/site.webmanifest`);
  const manifestType = manifest.headers.get("content-type") || "";
  if (!manifestType.startsWith("application/manifest+json")) failures.push(`Manifest MIME is ${manifestType}`);
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}

const reportPath = reportArgument
  ? resolve(projectRoot, reportArgument)
  : join(projectRoot, "qa", "results", "route-smoke.json");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify({ routes: results, failures }, null, 2)}\n`);

if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Strict route smoke passed: ${routes.length} reachable routes, ${retiredRoutes.length} intentional case/retired 404s`);
}
