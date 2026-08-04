import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(path, needle, replacement) {
  const text = readFileSync(path, "utf8");
  if (!text.includes(needle)) throw new Error(`Missing marker in ${path}: ${needle.slice(0, 80)}`);
  writeFileSync(path, text.replace(needle, replacement));
}

const dataPath = "build/src/content/site-data.json";
const data = readFileSync(dataPath, "utf8");
if (!data.includes('"slug": "pocket-sun"')) {
  const marker = '    {\n      "slug": "uninvited",';
  const entry = `    {\n      "slug": "pocket-sun",\n      "title": "POCKET SUN",\n      "descriptor": "Musical gravity toy",\n      "group": "worlds",\n      "featured": false,\n      "image": "/assets/games/pocket-sun-card-clean.svg",\n      "alt": "A tiny glowing sun curving through a neon gravity playground with black voids and colored orbit trails",\n      "summary": "Pull a tiny living sun through an endless musical gravity playground. Make full orbits, skim the black voids, clear dares, and turn every collision into music.",\n      "metaDescription": "POCKET SUN is an endless one-finger musical gravity toy for phones and desktop browsers.",\n      "controls": "Hold to pull · tap to pulse · mouse or touch",\n      "actionLabel": "Play POCKET SUN"\n    },\n`;
  if (!data.includes(marker)) throw new Error("Could not find Pocket Sun catalog insertion point");
  writeFileSync(dataPath, data.replace(marker, entry + marker));
}

for (const path of ["build/scripts/build-site.mjs", "build/scripts/validate-site.mjs"]) {
  const text = readFileSync(path, "utf8");
  if (text.includes("Expected 17 games")) {
    writeFileSync(path, text.replaceAll("Expected 17 games", "Expected 18 games").replaceAll("games.length === 17", "games.length === 18"));
  } else if (text.includes("Canonical game total is not 17")) {
    writeFileSync(path, text.replaceAll("data.games.length === 17", "data.games.length === 18").replaceAll("Canonical game total is not 17", "Canonical game total is not 18"));
  }
}

const redirectsPath = "_redirects";
let redirects = readFileSync(redirectsPath, "utf8");
if (!redirects.includes("# --- POCKET SUN ---")) {
  const block = `\n# --- POCKET SUN ---\n/pocket-sun       https://curious-gumdrop-5fe24d.netlify.app/  302!\n/pocket-sun/      https://curious-gumdrop-5fe24d.netlify.app/  302!\n/pocket-sun/*     https://curious-gumdrop-5fe24d.netlify.app/:splat  302!\n/pocketsun        /pocket-sun/  302\n`;
  redirects += block;
  writeFileSync(redirectsPath, redirects);
}

console.log("Pocket Sun catalog and redirect source changes applied.");
