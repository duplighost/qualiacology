import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkCatalog } from "./expected.mjs";
import { arcadeMain } from "./arcade-page.mjs";
import { loadArcadeCatalog } from "./arcade-catalog.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Publish target defaults to the site repo root (one level above build/), so
// `npm run build` regenerates the hub pages in place. Override with --root=<path>.
const rootArgument = process.argv.find((a) => a.startsWith("--root="))?.slice(7);
const outputRoot = rootArgument ? resolve(projectRoot, rootArgument) : resolve(projectRoot, "..");
const sourceRoot = join(projectRoot, "src");
const data = JSON.parse(readFileSync(join(sourceRoot, "content", "site-data.json"), "utf8"));
const { site, games, albums, psych } = data;
const arcade = loadArcadeCatalog(data);

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const safeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex").slice(0, 12);

// Catalog art keeps stable filenames, but /assets/** is served
// `immutable, max-age=1y`. Without a versioned URL a returning visitor keeps
// the art they already cached, so replacing a card silently shows them a mix
// of old and new images. Stamp each URL with a hash of its own bytes: the URL
// changes only when the picture actually changes.
const assetVersions = new Map();
function versioned(urlPath) {
  if (assetVersions.has(urlPath)) return assetVersions.get(urlPath);
  const file = join(outputRoot, urlPath.replace(/^\//, ""));
  const stamped = existsSync(file) ? `${urlPath}?v=${hash(readFileSync(file)).slice(0, 8)}` : urlPath;
  assetVersions.set(urlPath, stamped);
  return stamped;
}
const routeForGame = (game) => `/${game.slug}/`;
const routeForAlbum = (album) => `/music/${album.slug}/`;
const external = 'target="_blank" rel="noopener noreferrer"';

// The pages the build does not write but does dress: it puts the site's fonts and
// stylesheet, its header and its footer between the `<!-- site:… -->` markers in each
// of them, and leaves everything else in the file alone. A game's own page (one you
// download from, not one you play on) also gets its picture, at `<!-- site:shot -->`.
const dressedPages = [
  ...albums.map((album) => ({ file: join("music", album.slug, "index.html"), current: "music" })),
  ...["murderpop-greatest-hits", "bring-an-umbrella", "sill", "everhouse"].map((slug) => ({
    file: join(slug, "index.html"),
    current: "games",
    game: slug,
  })),
  { file: "404.html", current: "" },
];

const bannerWide = [800, 1200, 1600, 2160];
const bannerTall = [640, 960];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateData() {
  assert(existsSync(outputRoot), `Missing output root: ${outputRoot}`);
  checkCatalog(assert);

  for (const [label, records] of [["game", games], ["album", albums]]) {
    const slugs = records.map((item) => item.slug);
    assert(new Set(slugs).size === slugs.length, `Duplicate ${label} slug found`);
    for (const item of records) {
      assert(item.slug && item.title && item.summary && item.image, `Incomplete ${label} record: ${item.slug || "unknown"}`);
      assert(existsSync(join(outputRoot, item.image.slice(1))), `Missing ${label} image: ${item.image}`);
    }
  }

  for (const game of games) {
    assert(existsSync(join(outputRoot, game.slug, "index.html")), `Missing game route: ${routeForGame(game)}`);
    if (game.featured) {
      // The homepage shows its games as wide banners, so a featured game needs one.
      assert(game.banner && game.bannerAlt, `Featured game needs "banner" and "bannerAlt": ${game.slug}`);
    }
    if (game.banner) {
      assert(existsSync(join(outputRoot, game.banner.slice(1))), `Missing banner: ${game.banner}`);
      for (const [shape, widths] of [["wide", bannerWide], ["tall", bannerTall]]) {
        for (const width of widths) {
          for (const ext of ["avif", "webp"]) {
            const tier = `assets/banners/${game.slug}-${shape}-${width}.${ext}`;
            assert(existsSync(join(outputRoot, tier)), `Missing banner size /${tier}: run "py -3 build/qa/catalog-art.py build --only=${game.slug}"`);
          }
        }
      }
    }
  }

  for (const album of albums) {
    assert(existsSync(join(outputRoot, "music", album.slug, "index.html")), `Missing album route: ${routeForAlbum(album)}`);
  }

  assert(!safeJson(data).toLowerCase().includes("blackthorn"), "Blackthorn must not appear in canonical data");
}

function buildAssets() {
  const hubRoot = join(outputRoot, "assets", "hub");
  mkdirSync(hubRoot, { recursive: true });

  for (const name of readdirSync(hubRoot)) {
    if (/^qualiacology\.[a-f0-9]{12}\.(css|js)$/.test(name)) {
      unlinkSync(join(hubRoot, name));
    }
  }

  // Where each banner is held when its frame is not 3:1. One line per banner, from
  // site-data, because the pages may not carry inline styles.
  const bannerFocus = games
    .filter((game) => game.banner)
    .map((game) => `[data-banner="${game.slug}"] img { object-position: ${Number(game.bannerFocus ?? 50)}% 50%; }`)
    .join("\n");

  const css = Buffer.concat([
    readFileSync(join(sourceRoot, "site.css")),
    Buffer.from("\n"),
    readFileSync(join(sourceRoot, "arcade.css")),
    Buffer.from(`\n/* Banner focus, written by the build from site-data.json. */\n${bannerFocus}\n`),
  ]);
  const js = readFileSync(join(sourceRoot, "site.js"));
  const cssName = `qualiacology.${hash(css)}.css`;
  const jsName = `qualiacology.${hash(js)}.js`;
  writeFileSync(join(hubRoot, cssName), css);
  writeFileSync(join(hubRoot, jsName), js);
  const arcadeJs = readFileSync(join(sourceRoot, "arcade.js"));
  const arcadeJsName = `arcade.${hash(arcadeJs)}.js`;
  for (const name of readdirSync(hubRoot)) if (/^arcade\.[a-f0-9]{12}\.js$/.test(name)) unlinkSync(join(hubRoot,name));
  writeFileSync(join(hubRoot, arcadeJsName), arcadeJs);
  const catalogRoot = join(outputRoot, "assets", "arcade");
  mkdirSync(catalogRoot, {recursive:true});
  const catalogBytes = Buffer.from(JSON.stringify(arcade));
  const catalogName = `catalog.${hash(catalogBytes)}.json`;
  for (const name of readdirSync(catalogRoot)) if (/^catalog\.[a-f0-9]{12}\.json$/.test(name)) unlinkSync(join(catalogRoot,name));
  writeFileSync(join(catalogRoot,catalogName),catalogBytes);
  return { css: `/assets/hub/${cssName}`, js: `/assets/hub/${jsName}`, arcadeJs: `/assets/hub/${arcadeJsName}`, arcadeData: `/assets/arcade/${catalogName}` };
}

let builtAssets;

// The menu, in the order it is read. Connect is the foot of whatever page you are on.
const navItems = [
  ["/games/", "Games", "games"],
  ["/music/", "Music", "music"],
  ["/psychopharmacology/", "Psychopharmacology", "psych"],
  ["/arcade/", "Arcade", "arcade"],
  ["#connect", "Connect", "connect"],
];

function header(current) {
  const currentAttr = (key) => (key === current ? ' aria-current="page"' : "");
  return `
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header">
    <div class="container header-row">
      <a class="brand" href="/"${currentAttr("home")}>
        <span class="brand-mark" aria-hidden="true">Q.</span>
        <span class="brand-word">Qualiacology</span>
      </a>
      <nav class="desktop-nav" aria-label="Primary navigation">
        ${navItems.map(([href, label, key]) => `<a class="nav-link" href="${href}"${currentAttr(key)}>${label}</a>`).join("\n        ")}
        <a class="button button-outline button-small external-link" href="${escapeHtml(site.discord)}" ${external}>Discord</a>
      </nav>
      <button class="menu-button" type="button" data-menu-open aria-expanded="false" aria-controls="site-menu">Menu<span class="menu-icon" aria-hidden="true"></span></button>
    </div>
  </header>
  <dialog class="mobile-dialog" id="site-menu" data-menu-dialog aria-label="Menu">
    <div class="dialog-shell">
      <div class="dialog-head">
        <a class="brand" href="/">
          <span class="brand-mark" aria-hidden="true">Q.</span>
          <span class="brand-word">Qualiacology</span>
        </a>
        <button class="dialog-close" type="button" data-menu-close>Close</button>
      </div>
      <nav class="dialog-nav" aria-label="Mobile navigation">
        <a href="/"${currentAttr("home")}>Home</a>
        ${navItems.map(([href, label, key]) => `<a href="${href}"${currentAttr(key)}>${label}</a>`).join("\n        ")}
        <a class="external-link" href="${escapeHtml(site.discord)}" ${external}>Discord</a>
      </nav>
    </div>
  </dialog>`;
}

function footer({ audio = true } = {}) {
  const links = [
    [`mailto:${escapeHtml(site.email)}`, "Email", false],
    [escapeHtml(site.instagram), "Instagram", true],
    [escapeHtml(site.discord), "Discord", true],
    [escapeHtml(site.suno), "Suno", true],
    [escapeHtml(site.tiktok), "TikTok", true],
    [escapeHtml(site.youtube), "YouTube", true],
  ];
  return `
  <footer class="site-footer" id="connect">
    <div class="container">
      <div class="footer-top">
        <div class="footer-intro">
          <h2>Connect</h2>
          <p>Best way to reach me: email, Instagram DMs, or jump into the Discord.</p>
        </div>
        <nav class="footer-links" aria-label="Social and contact links">
          ${links.map(([href, label, out]) => `<a${out ? ' class="external-link"' : ""} href="${href}"${out ? ` ${external}` : ""}>${label}</a>`).join("\n          ")}
        </nav>
      </div>
      <div class="footer-base">
        <a class="brand" href="/">
          <span class="brand-mark" aria-hidden="true">Q.</span>
          <span class="brand-word">Qualiacology</span>
        </a>
        <p>${escapeHtml(site.owner)}</p>
      </div>
    </div>
  </footer>${audio ? `
  <button class="audio-toggle" type="button" data-audio-toggle data-audio-src="/assets/audio/jelly-strobe-instrumental-v280.mp3" aria-pressed="false">
    <span class="audio-bars" aria-hidden="true"><i></i><i></i><i></i></span><span data-audio-label>Sound off</span>
  </button>` : ""}`;
}

function fontPreloads() {
  return `<link rel="preload" href="/assets/fonts/fraunces-italic-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>`;
}

function head({ title, description, path, schema, image = "/assets/og/qualiacology-og-v20261128.jpg", preloadImage = "" }) {
  const url = `${site.origin}${path}`;
  return `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#09090b">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/assets/site.webmanifest">
  ${fontPreloads()}${preloadImage}
  <link rel="stylesheet" href="${builtAssets.css}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Qualiacology">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${site.origin}${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Qualiacology. Studying what it feels like to be alive.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${site.origin}${image}">
  <script type="application/ld+json">${safeJson(schema)}</script>
  <script src="${builtAssets.js}" defer></script>`;
}

function page({ current, title, description, path, schema, main, bodyClass = "", scripts = [], preloadImage = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>${head({ title, description, path, schema, preloadImage })}
${scripts.map(src => `<script src="${escapeHtml(src)}" defer></script>`).join("\n")}
</head>
<body class="${bodyClass}" data-page="${current}" data-game-count="${games.length}" data-album-count="${albums.length}">
${header(current)}
${main}
${footer()}
</body>
</html>
`;
}

// `sizes` must describe the real width of the slot the picture sits in. Nothing checks
// which file the browser picked, so one that under-asks silently upscales the art.
// The column is 85rem, and the rem grows with the window (site.css, `html`): from
// 1500px wide the column is 46.75vw + 707px, and from 2125px it stops at 1700px.
const slotSizes = {
  full: "(min-width: 2125px) 1700px, (min-width: 1500px) calc(46.75vw + 707px), 94vw",
  half: "(min-width: 2125px) 835px, (min-width: 1500px) calc(23vw + 346px), (min-width: 768px) 46vw, 92vw",
  third: "(min-width: 2125px) 545px, (min-width: 1500px) calc(15.2vw + 228px), (min-width: 992px) 30vw, (min-width: 640px) 46vw, 92vw",
  beside: "(min-width: 2125px) 930px, (min-width: 1500px) calc(25.6vw + 386px), (min-width: 896px) 54vw, 94vw",
};
const cardSizes = {
  games: slotSizes.third,
  albums: "(min-width: 2125px) 403px, (min-width: 1500px) calc(11.3vw + 168px), (min-width: 992px) 22vw, (min-width: 768px) 30vw, 45vw",
  homeAlbums: "(min-width: 2125px) 545px, (min-width: 1500px) calc(15.2vw + 228px), (min-width: 768px) 30vw, 44vw",
};

function catalogPicture(item, type, { eager = false, sizes = cardSizes[type] } = {}) {
  const isGame = type === "games";
  const widths = isGame ? [480, 800, 1200] : [360, 600, 900];
  // Intrinsic size must match the real art (16:9 games, 1:1 albums) so the
  // browser reserves the right box and nothing shifts while images load.
  const dimensions = isGame ? [800, 450] : [600, 600];
  const loading = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';

  if (item.image.endsWith(".svg")) {
    return `<img src="${escapeHtml(versioned(item.image))}" width="${dimensions[0]}" height="${dimensions[1]}" alt="${escapeHtml(item.alt)}" ${loading} decoding="async">`;
  }

  const root = `/assets/catalog/${type}/${item.slug}`;
  const src = (width, ext) => `${escapeHtml(versioned(`${root}-${width}.${ext}`))} ${width}w`;
  const set = (ext) => widths.map((width) => src(width, ext)).join(", ");
  return `<picture>
    <source type="image/avif" srcset="${set("avif")}" sizes="${sizes}">
    <source type="image/webp" srcset="${set("webp")}" sizes="${sizes}">
    <img src="${escapeHtml(versioned(item.image))}" width="${dimensions[0]}" height="${dimensions[1]}" alt="${escapeHtml(item.alt)}" ${loading} decoding="async">
  </picture>`;
}

// A game's wide banner. Below `tallBelow` a phone gets the 4:3 cut of it instead of a
// sliver of the whole width; the stylesheet switches the frame at the same width.
function bannerPicture(game, { sizes, tallBelow = "", eager = false }) {
  const root = `/assets/banners/${game.slug}`;
  const set = (shape, widths, ext) =>
    widths.map((width) => `${escapeHtml(versioned(`${root}-${shape}-${width}.${ext}`))} ${width}w`).join(", ");
  const loading = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  const tall = tallBelow
    ? `<source media="(max-width: ${tallBelow})" type="image/avif" srcset="${set("tall", bannerTall, "avif")}" sizes="92vw">
    <source media="(max-width: ${tallBelow})" type="image/webp" srcset="${set("tall", bannerTall, "webp")}" sizes="92vw">
    `
    : "";
  return `<picture>
    ${tall}<source type="image/avif" srcset="${set("wide", bannerWide, "avif")}" sizes="${sizes}">
    <source type="image/webp" srcset="${set("wide", bannerWide, "webp")}" sizes="${sizes}">
    <img src="${escapeHtml(versioned(game.banner))}" width="2160" height="720" alt="${escapeHtml(game.bannerAlt)}" ${loading} decoding="async">
  </picture>`;
}

// "MURDERPOP: GREATEST HITS" is set as a name and the line under it.
function splitTitle(title) {
  const at = title.indexOf(": ");
  return at === -1 ? [title, ""] : [title.slice(0, at), title.slice(at + 2)];
}

// The line under a featured name is spread to the name's own width, letter by letter.
function spreadLetters(text) {
  return [...text].map((letter) => (letter === " " ? '<i class="gap"></i>' : `<i>${escapeHtml(letter)}</i>`)).join("");
}

// What a card says about a game that is not a page you play: his own words for it.
function gameFacts(game) {
  return [
    game.duration,
    game.kind === "windows" ? (game.unreleased ? "For Windows" : "Windows download") : "",
    game.unreleased ? "Not out yet" : "",
  ].filter(Boolean);
}

function featureBlock(game) {
  const [name, line] = splitTitle(game.title);
  const note = game.unreleased ? "Not out yet" : game.kind === "windows" ? "Windows download" : "";
  return `<article class="feature" data-catalog-game="${escapeHtml(game.slug)}">
          <div class="feature-media" data-banner="${escapeHtml(game.slug)}">
            ${bannerPicture(game, { sizes: slotSizes.full, tallBelow: "47.99rem", eager: true })}
          </div>
          <p class="eyebrow feature-eyebrow">Featured game</p>
          <h2 class="feature-title">
            <a href="${routeForGame(game)}"><span class="feature-name">${escapeHtml(name)}</span>${line ? `<span class="visually-hidden">: ${escapeHtml(line)}</span><span class="feature-line" aria-hidden="true">${spreadLetters(line)}</span>` : ""}</a>
          </h2>
          <p class="feature-actions">
            <span class="button button-gold button-arrow" aria-hidden="true">View game</span>${note ? `
            <span class="feature-note">${escapeHtml(note)}</span>` : ""}
          </p>
        </article>`;
}

function bannerCard(game) {
  return `<li data-catalog-game="${escapeHtml(game.slug)}">
            <article class="banner-card">
              <div class="banner-media" data-banner="${escapeHtml(game.slug)}">
                ${bannerPicture(game, { sizes: slotSizes.half })}
              </div>
              <h3 class="banner-title"><a href="${routeForGame(game)}">${escapeHtml(game.title)}</a><span class="arrow" aria-hidden="true"></span></h3>
            </article>
          </li>`;
}

function gameCard(game, index, { eager = false } = {}) {
  // Controls stay on each game's own page. Play times and "Windows download" are
  // here because they help you choose.
  const facts = gameFacts(game);
  return `<li data-filter-kind="${escapeHtml(game.group)}" data-catalog-game="${escapeHtml(game.slug)}">
    <article class="work-card">
      <div class="card-media">
        ${catalogPicture(game, "games", { eager })}
      </div>
      <div class="card-body">
        <p class="card-kicker">${escapeHtml(game.descriptor)}</p>
        <h3 class="card-title">${escapeHtml(game.title)}</h3>
        <p class="card-summary">${escapeHtml(game.summary)}</p>
${facts.length ? `        <p class="card-meta">${facts.map(escapeHtml).join(" · ")}</p>
` : ""}        <a class="card-action" href="${routeForGame(game)}">${escapeHtml(game.actionLabel)}<span class="visually-hidden">: ${escapeHtml(game.title)}</span></a>
      </div>
    </article>
  </li>`;
}

function coverCard(album, { eager = false, sizes = cardSizes.albums, detail = false } = {}) {
  // One album's own tag already says "28 tracks deep"; don't count them twice.
  const tagsCountTracks = album.tags.some((tag) => /\btracks\b/i.test(tag));
  const facts = [...album.tags, ...(album.tracks && !tagsCountTracks ? [`${album.tracks} tracks`] : [])];
  return `<li data-catalog-album="${escapeHtml(album.slug)}">
    <article class="cover-card">
      <div class="cover-media">
        ${catalogPicture(album, "albums", { eager, sizes })}
      </div>
      <h3 class="cover-title"><a href="${routeForAlbum(album)}">${escapeHtml(album.title)}</a></h3>${detail ? `
      <p class="card-meta">${facts.map(escapeHtml).join(" · ")}</p>
      <a class="cover-listen external-link" href="${escapeHtml(album.listen)}" ${external}>Listen<span class="visually-hidden"> to ${escapeHtml(album.title)}</span></a>` : ""}
    </article>
  </li>`;
}

// The Discord, live: site.js writes how many people are online in the server right now,
// read from its public widget. Until then the line is empty and holds its place, so
// nothing moves when the number lands; if the number never comes it stays empty.
function discordPresence() {
  return `<p class="discord-presence" data-discord-presence="${escapeHtml(site.discordServer)}"></p>`;
}

function homepage() {
  const featuredGames = games.filter((item) => item.featured);
  const featuredAlbums = albums.filter((item) => item.featured);
  const [feature, ...otherGames] = featuredGames;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: site.name,
        url: `${site.origin}/`,
        description: site.description,
      },
      {
        "@type": "Person",
        name: site.owner,
        url: `${site.origin}/`,
        jobTitle: "Psychopharmacology researcher, musician, and game creator",
        sameAs: [site.instagram, site.youtube, site.tiktok, site.suno],
      },
    ],
  };

  const main = `<main id="main-content">
    <section class="hero">
      <div class="container">
        <div class="masthead">
          <h1>${escapeHtml(site.thesis).replace(/\balive\b/, "<em>alive</em>")}</h1>
          <p class="role-line">${escapeHtml(site.role).replace(/[A-Za-z]+-[A-Za-z]+/g, (word) => `<span class="nowrap">${word}</span>`)}</p>
        </div>
        ${featureBlock(feature)}
      </div>
    </section>

    <section class="section" id="games" aria-labelledby="games-title">
      <div class="container">
        <div class="section-head">
          <h2 id="games-title">Games</h2>
          <a class="more-link" href="/games/">All games</a>
        </div>
        <ul class="banner-list" data-featured-games="${featuredGames.length}">
          ${otherGames.map((item) => bannerCard(item)).join("\n          ")}
        </ul>
      </div>
    </section>

    <section class="section" id="music" aria-labelledby="music-title">
      <div class="container">
        <div class="section-head">
          <h2 id="music-title">Doopliss</h2>
          <a class="more-link" href="/music/">All music</a>
        </div>
        <ul class="cover-list home-covers" data-featured-albums="${featuredAlbums.length}">
          ${featuredAlbums.map((item) => coverCard(item, { sizes: cardSizes.homeAlbums })).join("\n          ")}
        </ul>
      </div>
    </section>

    <section class="section" id="community" aria-labelledby="community-title">
      <div class="container">
        <div class="strip">
          <h2 class="strip-title" id="community-title">The Psychopharmacology Server</h2>
          <div class="strip-copy">
            <p>We study medication, help people, and chill with friends.</p>
            ${discordPresence()}
          </div>
          <a class="button button-outline button-arrow" href="/psychopharmacology/">Explore the community</a>
        </div>
      </div>
    </section>
  </main>`;

  return page({
    current: "home",
    title: "Qualiacology | Psychopharmacology, Games & Murder Pop",
    description: site.description,
    path: "/",
    schema,
    main,
    bodyClass: "home-page",
  });
}

function psychopharmacologyPage() {
  const description = "The Psychopharmacology Server. We study medication, help people, and chill with friends.";
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Psychopharmacology | Qualiacology",
    url: `${site.origin}/psychopharmacology/`,
    description,
    about: ["Psychopharmacology", "Peer support", "Psychiatric medicine"],
  };

  // Numbers are a CSS counter on .rules-list, never emitted here — see site.css.
  const rules = psych.rules.items
    .map(
      (rule) => `
          <li>
            <h3>${escapeHtml(rule.title)}</h3>
            <p>${escapeHtml(rule.note)}</p>
          </li>`,
    )
    .join("");

  const main = `<main id="main-content">
    <section class="page-head">
      <div class="container">
        <h1>The Psychopharmacology Server</h1>
        <p class="page-deck">We study medication, help people, and chill with friends.</p>
        <div class="button-row">
          <a class="button button-gold external-link" href="${escapeHtml(site.discord)}" ${external}>Join the Discord</a>
          <a class="button button-outline external-link" href="${escapeHtml(site.chatgptGroup)}" ${external}>ChatGPT group chat</a>
        </div>
        <dl class="fact-row">
          <div><dt>3,000+</dt><dd>members</dd></div>
          <div><dt>Saturdays · 4 PM ET</dt><dd>Live voice chats</dd></div>
          <div class="fact-live"><dt class="visually-hidden">In the server now</dt><dd>${discordPresence()}</dd></div>
        </dl>
      </div>
    </section>

    <section class="section" id="rules" aria-labelledby="rules-title">
      <div class="container">
        <div class="section-head">
          <h2 id="rules-title">${escapeHtml(psych.rules.title)}</h2>
        </div>
        <ol class="rules-list">${rules}
        </ol>
        <p class="rules-thanks">${escapeHtml(psych.rules.copy)}</p>
      </div>
    </section>

    <section class="section" aria-labelledby="notice-title">
      <div class="container">
        <aside class="server-notice">
          <p class="eyebrow" id="notice-title">${escapeHtml(psych.notice.eyebrow)}</p>
          <p class="notice-body">${escapeHtml(psych.notice.body)}</p>
          <p class="notice-lede">${escapeHtml(psych.notice.lede)}</p>
          <p class="notice-answer">${escapeHtml(psych.notice.answer)}</p>
        </aside>
      </div>
    </section>
  </main>`;

  return page({
    current: "psych",
    title: "Psychopharmacology | Qualiacology",
    description,
    path: "/psychopharmacology/",
    schema,
    main,
  });
}

function gamesPage() {
  const description = `${games.length} games by ${site.owner}. Most run in the browser; a few are Windows downloads.`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Games | Qualiacology",
    url: `${site.origin}/games/`,
    description,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: games.length,
      itemListElement: games.map((game, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: game.title,
        url: `${site.origin}${routeForGame(game)}`,
      })),
    },
  };

  const main = `<main id="main-content">
    <section class="page-head">
      <div class="container">
        <h1>Games</h1>
      </div>
    </section>

    <section class="catalog" aria-label="All games">
      <div class="container">
        <div class="filter-shell">
          <fieldset>
            <legend class="visually-hidden">Filter the games</legend>
            <button class="filter-button" type="button" data-filter="all" aria-pressed="true">All ${games.length}</button>
            <button class="filter-button" type="button" data-filter="action" aria-pressed="false">Action</button>
            <button class="filter-button" type="button" data-filter="horror" aria-pressed="false">Horror</button>
            <button class="filter-button" type="button" data-filter="worlds" aria-pressed="false">Worlds &amp; toys</button>
          </fieldset>
          <p class="filter-status" data-filter-status aria-live="polite">Showing ${games.length} games.</p>
        </div>
        <ul class="catalog-grid" data-game-catalog="${games.length}">
          ${games.map((item, index) => gameCard(item, index, { eager: index < 3 })).join("\n")}
        </ul>
      </div>
    </section>
  </main>`;

  return page({
    current: "games",
    title: "Games | Qualiacology",
    description,
    path: "/games/",
    schema,
    main,
  });
}

function musicPage() {
  const description = `${albums.length} Doopliss releases. Bright, catchy, upbeat melodies with psychologically dark, emotionally raw lyrics.`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Doopliss Music | Qualiacology",
    url: `${site.origin}/music/`,
    description,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: albums.length,
      itemListElement: albums.map((album, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "MusicAlbum",
          name: album.title,
          url: `${site.origin}${routeForAlbum(album)}`,
          ...(album.tracks ? { numTracks: album.tracks } : {}),
        },
      })),
    },
  };

  const main = `<main id="main-content">
    <section class="page-head">
      <div class="container">
        <h1>Doopliss</h1>
        <p class="page-deck">Bright, catchy, upbeat melodies with psychologically dark, emotionally raw lyrics — murder pop on purpose.</p>
        <div class="button-row">
          <a class="button button-gold external-link" href="${escapeHtml(site.suno)}" ${external}>Follow on Suno</a>
          <a class="button button-outline external-link" href="${escapeHtml(site.tiktok)}" ${external}>TikTok</a>
          <a class="button button-outline external-link" href="${escapeHtml(site.youtube)}" ${external}>YouTube</a>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="music-catalog-title">
      <div class="container">
        <div class="section-head">
          <h2 id="music-catalog-title">Albums</h2>
        </div>
        <ul class="cover-list album-grid" data-album-catalog="${albums.length}">
          ${albums.map((item, index) => coverCard(item, { eager: index < 4, detail: true })).join("\n")}
        </ul>
      </div>
    </section>

    <section class="section" aria-labelledby="goodbye-title">
      <div class="container">
        <article class="aside-feature">
          <div class="aside-feature-media">
            <img src="${escapeHtml(versioned("/assets/og/instead-of-the-goodbye-1200x630.jpg"))}" width="1200" height="630" alt="" loading="lazy" decoding="async">
          </div>
          <div class="aside-feature-body">
            <p class="eyebrow">One-off</p>
            <h2 id="goodbye-title"><a href="/instead-of-the-goodbye/">Instead of the Goodbye</a></h2>
            <p>A walk dictated into a phone with no bars. Every message was written to someone who couldn't receive it yet. Recorded from a field recording, Oswegatchie Hills, August 1st — 5:54, with the photographs.</p>
            <span class="more-link" aria-hidden="true">Keep walking</span>
          </div>
        </article>
      </div>
    </section>
  </main>`;

  return page({
    current: "music",
    title: "Doopliss Music | Qualiacology",
    description,
    path: "/music/",
    schema,
    main,
  });
}

function sitemap() {
  const routes = [
    ["/", "1.0"],
    ["/psychopharmacology/", "0.9"],
    ["/games/", "0.9"],
    ["/arcade/", "0.9"],
    ["/music/", "0.9"],
    ...games.map((game) => [routeForGame(game), "0.8"]),
    ...albums.map((album) => [routeForAlbum(album), "0.7"]),
    ["/spooky/", "0.8"],
    ["/instead-of-the-goodbye/", "0.7"],
    ["/no-moon/codex/", "0.6"],
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(([route, priority]) => `  <url><loc>${site.origin}${route}</loc><priority>${priority}</priority></url>`).join("\n")}
</urlset>
`;
}

function write(relativePath, contents) {
  const target = join(outputRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
}

// Put the site's own parts into a page somebody wrote by hand: what goes in its <head>,
// the header, and the footer. Everything outside the markers is left exactly as it is.
function dress({ file, current, game: slug }) {
  const target = join(outputRoot, file);
  assert(existsSync(target), `Missing page to dress: ${file}`);
  let html = readFileSync(target, "utf8");
  const newline = html.includes("\r\n") ? "\r\n" : "\n";
  const parts = {
    head: `  ${fontPreloads()}
  <link rel="stylesheet" href="${builtAssets.css}">
  <script src="${builtAssets.js}" defer></script>`,
    header: header(current),
    footer: footer({ audio: false }),
  };
  if (slug) {
    const game = games.find((item) => item.slug === slug);
    assert(game, `No game called ${slug} in site-data.json for ${file}`);
    // The wide banner where the game has one, across the page; its card beside the words where it doesn't.
    parts.shot = game.banner
      ? bannerPicture(game, { sizes: slotSizes.full, tallBelow: "47.99rem", eager: true })
      : catalogPicture(game, "games", { eager: true, sizes: slotSizes.beside });
  }
  for (const [name, content] of Object.entries(parts)) {
    const open = `<!-- site:${name} -->`;
    const close = `<!-- /site:${name} -->`;
    const start = html.indexOf(open);
    const end = html.indexOf(close);
    assert(start !== -1 && end > start, `${file} needs the markers ${open} and ${close} (see build/docs/design-system.md)`);
    const body = content.replace(/^\n+/, "").replace(/\s+$/, "").replaceAll("\n", newline);
    html = `${html.slice(0, start + open.length)}${newline}${body}${newline}  ${html.slice(end)}`;
  }
  writeFileSync(target, html, "utf8");
}

validateData();
builtAssets = buildAssets();
write("index.html", homepage());
write(join("psychopharmacology", "index.html"), psychopharmacologyPage());
write(join("games", "index.html"), gamesPage());
write(join("arcade", "index.html"), page({
  current: "arcade", title: "Arcade | Qualiacology",
  description: "Scraps of unfinished games.",
  path: "/arcade/", bodyClass: "arcade-page", scripts: [builtAssets.arcadeJs],
  schema: {"@context":"https://schema.org", "@type":"CollectionPage", name:"Qualiacology Arcade", url:`${site.origin}/arcade/`, mainEntity:{"@type":"ItemList",numberOfItems:arcade.games.length,itemListElement:arcade.games.map((game,index)=>({"@type":"ListItem",position:index+1,name:game.title,url:`${site.origin}/arcade/?game=${encodeURIComponent(game.id)}`}))}},
  main: arcadeMain(arcade, builtAssets.arcadeData, escapeHtml),
}));
write(join("music", "index.html"), musicPage());
write("sitemap.xml", sitemap());
for (const dressed of dressedPages) dress(dressed);

for (const file of ["index.html", join("psychopharmacology", "index.html"), join("games", "index.html"), join("music", "index.html"), "sitemap.xml"]) {
  const contents = readFileSync(join(outputRoot, file), "utf8");
  assert(!contents.toLowerCase().includes("blackthorn"), `Forbidden Blackthorn reference in ${file}`);
}

console.log(`Built Qualiacology hub: ${games.length} games, ${albums.length} releases, ${dressedPages.length} pages dressed`);
console.log(`CSS ${builtAssets.css}`);
console.log(`JS  ${builtAssets.js}`);
