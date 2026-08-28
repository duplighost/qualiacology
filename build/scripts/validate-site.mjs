import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootArgument = process.argv.find((argument) => argument.startsWith("--root="))?.slice(7);
const outputRoot = rootArgument ? resolve(projectRoot, rootArgument) : join(projectRoot, "work", "qualiacology-unified-hub");
const data = JSON.parse(readFileSync(join(projectRoot, "src", "content", "site-data.json"), "utf8"));
const generatedPages = [
  "index.html",
  join("psychopharmacology", "index.html"),
  join("games", "index.html"),
  join("music", "index.html"),
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relativePath) {
  return readFileSync(join(outputRoot, relativePath), "utf8");
}

function exactPathExists(relativePath) {
  const normalized = relativePath.replaceAll("/", sep).replace(/^[/\\]+/, "");
  const segments = normalized.split(sep).filter(Boolean);
  let current = outputRoot;

  for (const segment of segments) {
    if (!existsSync(current) || !statSync(current).isDirectory()) return false;
    if (!readdirSync(current).includes(segment)) return false;
    current = join(current, segment);
  }

  return existsSync(current);
}

function localTarget(rawValue) {
  if (!rawValue || /^(?:https?:|mailto:|tel:|data:|blob:|#)/i.test(rawValue)) return null;
  const clean = rawValue.split("#")[0].split("?")[0];
  if (!clean) return null;
  let target = clean.replace(/^\//, "");
  if (clean.endsWith("/")) target += "index.html";
  return target;
}

function collectLocalReferences(html) {
  const values = [];
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) values.push(match[1]);
  for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(",")) values.push(candidate.trim().split(/\s+/)[0]);
  }
  return values.map(localTarget).filter(Boolean);
}

function collectHtmlFiles(relativeDirectory = "") {
  const directory = join(outputRoot, relativeDirectory);
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && (entry.name === "node_modules" ||
      (relativeDirectory === "" && [".git", ".github", "build"].includes(entry.name)))) continue;
    const relativePath = join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...collectHtmlFiles(relativePath));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(relativePath);
  }

  return files;
}

function jsonLd(html) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert(match, "Missing JSON-LD block");
  return JSON.parse(match[1]);
}

assert(data.games.length === 25, "Canonical game total is not 25");
assert(data.albums.length === 12, "Canonical album total is not 12");
assert(data.games.filter((item) => item.featured).length === 3, "Featured game total is not 3");
assert(data.albums.filter((item) => item.featured).length === 3, "Featured album total is not 3");
assert(!existsSync(join(outputRoot, "blackthorn-manor")), "Blackthorn directory must not exist");
assert(!existsSync(join(outputRoot, "assets", "brand", "pikachu-forest.webp")), "Replaced hero asset must not remain in deploy");
assert(!existsSync(join(outputRoot, "book.html")), "Retired book page must not exist");
assert(!existsSync(join(outputRoot, "this-helped-someone")), "Retired book route must not exist");
assert(!existsSync(join(outputRoot, "assets", "book")), "Retired book assets must not exist");

for (const page of generatedPages) {
  assert(exactPathExists(page), `Missing generated page with exact case: ${page}`);
  const html = read(page);
  assert(!/<style(?:\s|>)/i.test(html), `Inline style block found in ${page}`);
  assert(!/\sstyle="/i.test(html), `Inline style attribute found in ${page}`);
  assert(!/(?:fonts\.googleapis|cdnjs|font-?awesome)/i.test(html), `External font or icon dependency found in ${page}`);
  assert(!html.toLowerCase().includes("blackthorn"), `Blackthorn reference found in ${page}`);
  assert((html.match(/<h1(?:\s|>)/g) || []).length === 1, `Expected exactly one H1 in ${page}`);
  for (const target of collectLocalReferences(html)) {
    assert(exactPathExists(target), `Missing or case-mismatched reference in ${page}: /${target.replaceAll(sep, "/")}`);
  }
}

for (const page of collectHtmlFiles()) {
  const html = read(page);
  const descriptionTag = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => match[0])
    .find((tag) => /\bname\s*=\s*(["'])description\1/i.test(tag));
  assert(descriptionTag, `Missing meta description in ${page}`);
  const content = descriptionTag.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i);
  const description = content?.[2]?.trim() || "";
  assert(description, `Empty meta description in ${page}`);
  assert(/[.!?]$/.test(description), `Meta description appears truncated in ${page}: ${description}`);
}

const home = read("index.html");
const gamesPage = read(join("games", "index.html"));
const musicPage = read(join("music", "index.html"));
const sitemap = read("sitemap.xml");
const publicHubText = [home, read(join("psychopharmacology", "index.html")), sitemap].join("\n").toLowerCase();
assert(!publicHubText.includes("this helped someone"), "Retired book title remains in public hub");
assert(!publicHubText.includes("book.html"), "Retired book URL remains in public hub");
assert(!publicHubText.includes("ways of knowing converge"), "Obsolete convergence copy remains in public hub");
assert(!publicHubText.includes("not diagnosis"), "Obsolete diagnosis disclaimer remains in public hub");
assert(!publicHubText.includes("1st &amp; 3rd tuesdays"), "Unrelated NAMI schedule remains in the server section");
assert(!publicHubText.includes("gives a shit"), "Homepage metadata or early copy still contains the removed swear");
assert(!publicHubText.includes("learn. support. connect."), "Rejected generic server tagline remains in public hub");
assert(!publicHubText.includes("serious questions. human answers."), "Rejected generic server heading remains in public hub");
assert(!publicHubText.includes("friendship that is allowed to be ordinary"), "Rejected server copy remains in public hub");
assert(!publicHubText.includes("the pharmacology matters. so do the people."), "Rejected generic server CTA remains in public hub");
assert(!publicHubText.includes("the three things the server is built to hold together"), "Rejected server filler remains in public hub");

assert((home.match(/data-catalog-game="/g) || []).length === 3, "Homepage must feature three games");
assert((home.match(/data-catalog-album="/g) || []).length === 3, "Homepage must feature three releases");
assert((gamesPage.match(/data-catalog-game="/g) || []).length === data.games.length, "Game card count does not match canonical data");
assert((musicPage.match(/data-catalog-album="/g) || []).length === data.albums.length, "Album card count does not match canonical data");
assert(jsonLd(gamesPage).mainEntity.numberOfItems === data.games.length, "Game JSON-LD count mismatch");
assert(jsonLd(musicPage).mainEntity.numberOfItems === data.albums.length, "Album JSON-LD count mismatch");

for (const game of data.games) {
  const route = `/${game.slug}/`;
  assert(exactPathExists(`${game.slug}/index.html`), `Missing exact game route: ${route}`);
  assert(sitemap.includes(`<loc>${data.site.origin}${route}</loc>`), `Game missing from sitemap: ${route}`);
}

for (const album of data.albums) {
  const route = `/music/${album.slug}/`;
  assert(exactPathExists(`music/${album.slug}/index.html`), `Missing exact album route: ${route}`);
  assert(sitemap.includes(`<loc>${data.site.origin}${route}</loc>`), `Album missing from sitemap: ${route}`);
}

const redirects = read("_redirects");
const netlifyConfig = read("netlify.toml");
assert(!redirects.includes("/#music"), "Legacy music-to-home redirect remains");
assert(
  redirects.includes("/no-moon /no-moon/index.html 301!") &&
    redirects.includes("/no-moon.html /no-moon/index.html 301!"),
  "No Moon legacy redirects must resolve directly to the real game",
);
assert(
  !/pretty_urls\s*=\s*true/i.test(netlifyConfig),
  "Netlify pretty_urls creates a redirect loop between no-moon.html and no-moon/index.html",
);
assert(read("_headers").includes("application/manifest+json"), "Manifest MIME header is missing");
assert(JSON.parse(read(join("assets", "site.webmanifest"))).name === "Qualiacology", "Manifest is invalid");

console.log(`Static validation passed: ${generatedPages.length} hub pages, ${data.games.length} games, ${data.albums.length} releases`);
