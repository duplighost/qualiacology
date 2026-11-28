import { readFileSync } from "node:fs";

const content = new URL("../src/content/", import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, content), "utf8"));
const blocked = new Set(["restricted", "unavailable", "broken", "failed", "needs-fix", "installed", "source-only"]);
const httpsUrl = value => typeof value === "string" && /^https:\/\//.test(value);

// Keep recovery records in the build sources. Publish only the selected launch
// and information useful to a visitor, never the archive's history or QA notes.
export function loadArcadeCatalog(siteData = read("site-data.json")) {
  const source = read("arcade-data.json");
  const policy = read("arcade-curation.json");
  const mainRoutes = new Set(siteData.games.map(game => new URL(`/${game.slug}/`, siteData.site.origin).href));
  const omitDescriptions = new Set(policy.omitDescriptions);
  const omitControls = new Set(policy.omitControls);
  const cleanControls = values => (values || []).filter(value => typeof value === "string" && value.trim() && !omitControls.has(value));
  const isMainRoute = value => {
    if (!httpsUrl(value)) return false;
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/(?:\/index\.html|\/)?$/, "/");
    return mainRoutes.has(url.href);
  };
  const games = [];
  for (const original of source.games) {
    if (Object.hasOwn(policy.excluded, original.id)) continue;
    if (policy.excludeMainSiteGames && original.versions.some(version => isMainRoute(version.url))) continue;
    const game = {...original, ...policy.overrides[original.id]};
    const selectedId = policy.preferredVersions[game.id] || game.preferredId;
    const selected = game.versions.find(version => version.id === selectedId);
    if (!selected) throw new Error(`Missing selected arcade version: ${game.id} / ${selectedId}`);
    if (blocked.has(selected.status) || !httpsUrl(selected.url || selected.downloadUrl)) continue;
    const version = {...selected, ...policy.versionOverrides[selected.id]};
    const title = game.title;
    const publicVersion = {
      id: version.id,
      ...(httpsUrl(version.url) ? {url: version.url} : {}),
      ...(httpsUrl(version.downloadUrl) ? {downloadUrl: version.downloadUrl} : {}),
      ...(Number.isSafeInteger(version.bytes) && version.bytes > 0 ? {bytes: version.bytes} : {}),
      controls: cleanControls(version.controls),
    };
    games.push({
      id: game.id,
      title,
      description: omitDescriptions.has(game.description) ? "" : game.description || "",
      genres: game.genres || [],
      controlKinds: game.controlKinds || [],
      controls: cleanControls(game.controls),
      kind: game.kind,
      imageUrl: game.imageUrl,
      imageKind: game.imageKind,
      imageAlt: `${title} — ${game.imageKind === "title" ? "title artwork" : game.imageKind === "art" ? "cover art" : "game screenshot"}`,
      preferredId: version.id,
      versions: [publicVersion],
    });
  }
  return {
    schemaVersion: 1,
    metadata: {title: "Arcade", counts: {families: games.length, versions: games.length}},
    games,
  };
}
