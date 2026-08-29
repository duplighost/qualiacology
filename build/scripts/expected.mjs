// The single place catalog counts are declared. Adding or removing a game or
// album means editing site-data.json AND bumping expected.json — one
// deliberate step, replacing the four hardcoded asserts that used to live in
// build-site.mjs, validate-site.mjs, and browser-qa.mjs. Everything else here
// (horror roster, "Showing N worlds.") derives from the catalog itself.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = join(projectRoot, "src", "content");

export const expected = JSON.parse(readFileSync(join(contentRoot, "expected.json"), "utf8"));
const data = JSON.parse(readFileSync(join(contentRoot, "site-data.json"), "utf8"));

// Games-array order: the /games/ shelf renders in array order and the filter
// preserves DOM order, so this list is also the expected on-page order.
export const horrorSlugs = data.games.filter((game) => game.group === "horror").map((game) => game.slug);
export const horrorStatus = `Showing ${horrorSlugs.length} worlds.`;

export function checkCatalog(assert) {
  const bump = "if the change is intentional, bump build/src/content/expected.json";
  const featuredGames = data.games.filter((game) => game.featured).length;
  const featuredAlbums = data.albums.filter((album) => album.featured).length;
  assert(data.games.length === expected.games,
    `site-data.json has ${data.games.length} games but expected.json says ${expected.games} — ${bump}`);
  assert(data.albums.length === expected.albums,
    `site-data.json has ${data.albums.length} albums but expected.json says ${expected.albums} — ${bump}`);
  assert(featuredGames === expected.featuredGames,
    `${featuredGames} featured games but expected.json says ${expected.featuredGames} — ${bump}`);
  assert(featuredAlbums === expected.featuredAlbums,
    `${featuredAlbums} featured albums but expected.json says ${expected.featuredAlbums} — ${bump}`);
}
