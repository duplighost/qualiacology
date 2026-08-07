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

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Publish target defaults to the site repo root (one level above build/), so
// `npm run build` regenerates the hub pages in place. Override with --root=<path>.
const rootArgument = process.argv.find((a) => a.startsWith("--root="))?.slice(7);
const outputRoot = rootArgument ? resolve(projectRoot, rootArgument) : resolve(projectRoot, "..");
const sourceRoot = join(projectRoot, "src");
const data = JSON.parse(readFileSync(join(sourceRoot, "content", "site-data.json"), "utf8"));
const { site, games, albums } = data;

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
const twoDigits = (index) => String(index + 1).padStart(2, "0");
const routeForGame = (game) => `/${game.slug}/`;
const routeForAlbum = (album) => `/music/${album.slug}/`;
const external = 'target="_blank" rel="noopener noreferrer"';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateData() {
  assert(existsSync(outputRoot), `Missing output root: ${outputRoot}`);
  assert(games.length === 38, `Expected 38 games, found ${games.length}`);
  assert(albums.length === 10, `Expected 10 albums, found ${albums.length}`);
  assert(games.filter((item) => item.featured).length === 6, "Exactly six games must be featured");
  assert(albums.filter((item) => item.featured).length === 3, "Exactly three albums must be featured");

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

  const css = readFileSync(join(sourceRoot, "site.css"));
  const js = readFileSync(join(sourceRoot, "site.js"));
  const cssName = `qualiacology.${hash(css)}.css`;
  const jsName = `qualiacology.${hash(js)}.js`;
  writeFileSync(join(hubRoot, cssName), css);
  writeFileSync(join(hubRoot, jsName), js);
  return { css: `/assets/hub/${cssName}`, js: `/assets/hub/${jsName}` };
}

let builtAssets;

function navLink(href, label, key, current) {
  const active = key === current ? ' aria-current="page"' : "";
  return `<a class="nav-link" href="${href}"${active}>${label}</a>`;
}

function header(current) {
  return `
  <a class="skip-link" href="#main-content">Skip to the work</a>
  <div class="scroll-progress" data-scroll-progress aria-hidden="true"></div>
  <header class="site-header">
    <div class="container header-row">
      <a class="brand" href="/"${current === "home" ? ' aria-current="page"' : ""}>
        <span class="brand-mark" aria-hidden="true">Q.</span>
        <span class="brand-word">Qualiacology</span>
      </a>
      <nav class="desktop-nav" aria-label="Primary navigation">
        ${navLink("/psychopharmacology/", "Psychopharmacology", "psych", current)}
        ${navLink("/games/", "Games", "games", current)}
        ${navLink("/music/", "Music", "music", current)}
        ${navLink("/#connect", "Connect", "connect", current)}
        <a class="button button-primary external-link" href="${escapeHtml(site.discord)}" ${external}>Discord</a>
      </nav>
      <button class="menu-button" type="button" data-menu-open aria-expanded="false" aria-controls="site-menu">Menu</button>
    </div>
  </header>
  <dialog class="mobile-dialog" id="site-menu" data-menu-dialog>
    <div class="dialog-shell">
      <div class="dialog-head">
        <span class="dialog-label">Choose a doorway</span>
        <button class="dialog-close" type="button" data-menu-close>Close</button>
      </div>
      <nav class="dialog-nav" aria-label="Mobile navigation">
        <a href="/">Home</a>
        <a href="/psychopharmacology/">Psychopharmacology</a>
        <a href="/games/">Games</a>
        <a href="/music/">Music</a>
        <a href="/#connect">Connect</a>
        <a href="${escapeHtml(site.discord)}" ${external}>Join Discord</a>
      </nav>
      <p class="dialog-note">The serious work, the strange songs, and the people trying to get it right — all under one roof.</p>
    </div>
  </dialog>`;
}

function footer() {
  return `
  <footer class="site-footer">
    <div class="container">
      <p class="footer-wordmark" aria-hidden="true">Qualiacology</p>
    </div>
    <div class="container footer-grid">
      <div>
        <p class="footer-name">Qualiacology</p>
        <p class="footer-copy">Psychopharmacology, browser worlds, and murder pop by Alexander Duncan Guitar. Built by hand; best explored after dark.</p>
      </div>
      <nav class="footer-links" aria-label="Social and contact links">
        <a class="external-link" href="${escapeHtml(site.discord)}" ${external}>Discord</a>
        <a class="external-link" href="${escapeHtml(site.suno)}" ${external}>Suno</a>
        <a class="external-link" href="${escapeHtml(site.tiktok)}" ${external}>TikTok</a>
        <a class="external-link" href="${escapeHtml(site.instagram)}" ${external}>Instagram</a>
        <a class="external-link" href="${escapeHtml(site.youtube)}" ${external}>YouTube</a>
        <a href="mailto:${escapeHtml(site.email)}">Email</a>
      </nav>
    </div>
  </footer>
  <button class="audio-toggle" type="button" data-audio-toggle data-audio-src="/assets/audio/jelly-strobe-instrumental-v280.mp3" aria-pressed="false">
    <span data-audio-label>Sound off</span>
  </button>`;
}

function head({ title, description, path, schema, image = "/assets/visuals/qualiacology-social-1200x630-v2.jpg" }) {
  const url = `${site.origin}${path}`;
  return `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#060a0f">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/assets/site.webmanifest">
  <link rel="preload" href="/assets/fonts/inter-latin-v20.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/space-grotesk-latin-v22.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${builtAssets.css}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Qualiacology">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${site.origin}${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Qualiacology — Psychopharmacology, Browser Worlds, Murder Pop">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${site.origin}${image}">
  <script type="application/ld+json">${safeJson(schema)}</script>
  <script src="${builtAssets.js}" defer></script>`;
}

function page({ current, title, description, path, schema, main, bodyClass = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>${head({ title, description, path, schema })}
</head>
<body class="${bodyClass}" data-page="${current}" data-game-count="${games.length}" data-album-count="${albums.length}">
${header(current)}
${main}
${footer()}
</body>
</html>
`;
}

function heroPicture() {
  return `<picture>
    <source type="image/avif" srcset="/assets/visuals/qualiacology-candy-city-640.avif 640w, /assets/visuals/qualiacology-candy-city-960.avif 960w, /assets/visuals/qualiacology-candy-city-1280.avif 1280w, /assets/visuals/qualiacology-candy-city-1640.avif 1640w" sizes="(min-width: 1280px) 1216px, calc(100vw - 2rem)">
    <source type="image/webp" srcset="/assets/visuals/qualiacology-candy-city-640.webp 640w, /assets/visuals/qualiacology-candy-city-960.webp 960w, /assets/visuals/qualiacology-candy-city-1280.webp 1280w, /assets/visuals/qualiacology-candy-city-1640.webp 1640w" sizes="(min-width: 1280px) 1216px, calc(100vw - 2rem)">
    <img src="/assets/visuals/qualiacology-candy-city-1640.jpg" width="1640" height="640" alt="A candy-loving ghost in a dark rain-soaked neon city, holding a lollipop and a bag of Ghost Pops" fetchpriority="high" decoding="async">
  </picture>`;
}

function catalogPicture(item, type, eager = false) {
  const isGame = type === "games";
  const widths = isGame ? [480, 800] : [360, 600];
  // Intrinsic size must match the real art (16:9 games, 1:1 albums) so the
  // browser reserves the right box and nothing shifts while images load.
  const dimensions = isGame ? [800, 450] : [600, 600];
  const sizes = isGame ? "(min-width: 1120px) 31vw, (min-width: 720px) 48vw, 86vw" : "(min-width: 1120px) 31vw, (min-width: 720px) 48vw, 86vw";
  const loading = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';

  if (item.image.endsWith(".svg")) {
    return `<img src="${escapeHtml(versioned(item.image))}" width="${dimensions[0]}" height="${dimensions[1]}" alt="${escapeHtml(item.alt)}" ${loading} decoding="async">`;
  }

  const root = `/assets/catalog/${type}/${item.slug}`;
  const src = (width, ext) => `${escapeHtml(versioned(`${root}-${width}.${ext}`))} ${width}w`;
  return `<picture>
    <source type="image/avif" srcset="${src(widths[0], "avif")}, ${src(widths[1], "avif")}" sizes="${sizes}">
    <source type="image/webp" srcset="${src(widths[0], "webp")}, ${src(widths[1], "webp")}" sizes="${sizes}">
    <img src="${escapeHtml(versioned(item.image))}" width="${dimensions[0]}" height="${dimensions[1]}" alt="${escapeHtml(item.alt)}" ${loading} decoding="async">
  </picture>`;
}

function gameCard(game, index, { eager = false } = {}) {
  const metadata = [game.duration, game.controls].filter(Boolean);
  const secondaryAction = game.secondary
    ? `\n          <a class="button button-quiet" href="${escapeHtml(game.secondary.href)}">${escapeHtml(game.secondary.label)}</a>`
    : "";
  return `<li data-filter-kind="${escapeHtml(game.group)}" data-catalog-game="${escapeHtml(game.slug)}">
    <article class="work-card">
      <span class="card-index" aria-hidden="true">${twoDigits(index)}</span>
      <a class="card-media" href="${routeForGame(game)}">
        ${catalogPicture(game, "games", eager)}
      </a>
      <div class="card-body">
        <p class="card-kicker">${escapeHtml(game.descriptor)}</p>
        <h3 class="card-title"><a href="${routeForGame(game)}">${escapeHtml(game.title)}</a></h3>
        <p class="card-summary">${escapeHtml(game.summary)}</p>
        <ul class="card-meta" aria-label="Game details">
          ${metadata.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        <div class="card-actions">
          <a class="button button-primary button-arrow" href="${routeForGame(game)}">${escapeHtml(game.actionLabel)}</a>${secondaryAction}
        </div>
      </div>
    </article>
  </li>`;
}

function albumCard(album, index, { eager = false } = {}) {
  const meta = [...album.tags, ...(album.tracks ? [`${album.tracks} tracks`] : [])];
  return `<li data-catalog-album="${escapeHtml(album.slug)}">
    <article class="album-card">
      <span class="card-index" aria-hidden="true">${twoDigits(index)}</span>
      <a class="card-media" href="${routeForAlbum(album)}">
        ${catalogPicture(album, "albums", eager)}
      </a>
      <div class="card-body">
        <p class="card-kicker">Doopliss release</p>
        <h3 class="card-title"><a href="${routeForAlbum(album)}">${escapeHtml(album.title)}</a></h3>
        <p class="card-summary">${escapeHtml(album.summary)}</p>
        <ul class="card-meta" aria-label="Release details">
          ${meta.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        <div class="card-actions">
          <a class="button button-pink external-link" href="${escapeHtml(album.listen)}" ${external}>Listen</a>
          <a class="button button-quiet button-arrow" href="${routeForAlbum(album)}">Liner notes</a>
        </div>
      </div>
    </article>
  </li>`;
}

function homepage() {
  const featuredGames = games.filter((item) => item.featured);
  const featuredAlbums = albums.filter((item) => item.featured);
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
        <p class="role-line">${escapeHtml(site.role)}</p>
        <h1>${escapeHtml(site.thesis).replace(/\balive\b/, '<span class="alive-word">alive</span>')}</h1>
        ${site.thesisDeck ? `<p class="hero-deck">${escapeHtml(site.thesisDeck)}</p>` : ""}
        <div class="button-row">
          <a class="button button-primary button-arrow" href="#community">Explore the work</a>
          <a class="button external-link" href="${escapeHtml(site.discord)}" ${external}>Join Discord</a>
        </div>
        <figure class="hero-art">
          ${heroPicture()}
          <figcaption>Original Qualiacology candy-city artwork</figcaption>
        </figure>
        <dl class="proof-list">
          <div><dt>3,000+</dt><dd>community members</dd></div>
          <div><dt>${games.length}</dt><dd>browser worlds</dd></div>
          <div><dt>${albums.length}</dt><dd>Doopliss releases</dd></div>
        </dl>
      </div>
    </section>

    <section class="section" id="community">
      <div class="container">
        <div class="section-heading">
          <span class="ghost-index" aria-hidden="true">01</span>
          <div>
            <p class="eyebrow">01 · Psychopharmacology</p>
            <h2>The Psychopharmacology Server</h2>
          </div>
          <div class="section-heading-copy">
            <p>We study medication, help people, and chill with friends.</p>
            <div class="section-action"><a class="button button-arrow" href="/psychopharmacology/">Explore the community</a></div>
          </div>
        </div>

        <div class="server-pillars">
          <article class="server-pillar">
            <span class="pillar-number" aria-hidden="true">01</span>
            <h3>3,000+ members</h3>
            <p>Members sharing knowledge, asking better questions, and comparing notes without treating anecdotes like scripture.</p>
          </article>
          <article class="server-pillar">
            <span class="pillar-number" aria-hidden="true">02</span>
            <h3>Saturdays · 4 PM ET</h3>
            <p>Live voice chats — discussion, support, and figuring things out together.</p>
          </article>
          <article class="server-pillar">
            <span class="pillar-number" aria-hidden="true">03</span>
            <h3>Warm and blunt</h3>
            <p>Credible, warm, and blunt enough to be useful when the subject is too important for fake certainty.</p>
          </article>
        </div>

        <div class="button-row community-actions">
          <a class="button button-primary external-link" href="${escapeHtml(site.discord)}" ${external}>Join the Discord</a>
        </div>
      </div>
    </section>

    <section class="section" id="game">
      <div class="container">
        <div class="section-heading">
          <span class="ghost-index" aria-hidden="true">02</span>
          <div>
            <p class="eyebrow">02 · Browser worlds</p>
            <h2>Games</h2>
          </div>
          <div class="section-heading-copy">
            <p>Small, self-contained worlds that run right in your browser — horror, exploration, movement, celestial chaos, and descent. No downloads; each opens on its own page.</p>
            <div class="section-action"><a class="button button-arrow" href="/games/">Browse all ${games.length} worlds</a></div>
          </div>
        </div>
        <ul class="card-list homepage-shelf" data-featured-games="${featuredGames.length}">
          ${featuredGames.map((item, index) => gameCard(item, index, { eager: index === 0 })).join("\n")}
        </ul>
      </div>
    </section>

    <section class="section" id="music">
      <div class="container">
        <div class="section-heading">
          <span class="ghost-index" aria-hidden="true">03</span>
          <div>
            <p class="eyebrow">03 · Doopliss</p>
            <h2>Doopliss</h2>
          </div>
          <div class="section-heading-copy">
            <p>Bright, catchy, upbeat melodies with psychologically dark, emotionally raw lyrics — murder pop on purpose. The hooks invite you in. The subtext quietly locks the door behind you.</p>
            <div class="section-action"><a class="button button-arrow" href="/music/">Explore all ${albums.length} releases</a></div>
          </div>
        </div>
        <ul class="card-list homepage-shelf" data-featured-albums="${featuredAlbums.length}">
          ${featuredAlbums.map((item, index) => albumCard(item, index)).join("\n")}
        </ul>
      </div>
    </section>

    <section class="section" id="connect">
      <div class="container">
        <div class="section-heading">
          <span class="ghost-index" aria-hidden="true">04</span>
          <div>
            <p class="eyebrow">04 · Connect</p>
            <h2>Find the right door.</h2>
          </div>
          <div class="section-heading-copy"><p>Best way to reach me: email, Instagram DMs, or jump into the Discord. Everything else is here if you want the full trail of evidence, noise, hooks, and neon.</p></div>
        </div>
        <div class="route-grid">
          <a class="route-card" href="${escapeHtml(site.discord)}" ${external}><small>Psychopharmacology</small><strong>Join the Discord</strong><span>Enter the community ↗</span></a>
          <a class="route-card" href="${escapeHtml(site.suno)}" ${external}><small>Music</small><strong>Follow Doopliss</strong><span>Listen on Suno ↗</span></a>
          <a class="route-card" href="mailto:${escapeHtml(site.email)}"><small>Collaborate or say hi</small><strong>Email Alexander</strong><span>Start a conversation →</span></a>
        </div>
      </div>
    </section>
  </main>`;

  return page({
    current: "home",
    title: "Qualiacology | Psychopharmacology, Browser Worlds & Murder Pop",
    description: site.description,
    path: "/",
    schema,
    main,
    bodyClass: "home-page",
  });
}

function psychopharmacologyPage() {
  const description = "The chemistry of subjective experience, traced through mechanism, evidence, and real human mess.";
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Psychopharmacology | Qualiacology",
    url: `${site.origin}/psychopharmacology/`,
    description,
    about: ["Psychopharmacology", "Peer support", "Psychiatric medicine"],
  };

  const main = `<main id="main-content">
    <section class="subhero">
      <div class="container subhero-grid">
        <div>
          <span class="ghost-index" aria-hidden="true">01</span>
          <p class="eyebrow">01 · Psychopharmacology</p>
          <h1>The Psychopharmacology Server</h1>
          <p class="subhero-deck">We study medication, help people, and chill with friends.</p>
        </div>
        <div class="subhero-stat"><strong>3,000+</strong><span>members</span></div>
      </div>
    </section>

    <section class="section" id="community" aria-labelledby="community-title">
      <div class="container">
        <div class="section-heading">
          <div><p class="eyebrow">The community</p><h2 id="community-title">We study medication, help people, and chill with friends.</h2></div>
          <div class="section-heading-copy"><p>3,000+ people comparing notes, asking better questions, and helping each other out — without treating anecdotes like scripture.</p></div>
        </div>
        <div class="community-grid">
          <article class="community-card"><h3>3,000+ members</h3><p>Knowledge, questions, and useful disagreement without treating anecdotes like scripture.</p></article>
          <article class="community-card"><h3>Practical support</h3><p>People help one another make sense of hard situations, find useful information, and feel less alone.</p></article>
          <article class="community-card"><h3>Saturdays · 4 PM ET</h3><p>Live voice chats — discussion, support, and figuring things out together.</p></article>
          <article class="community-card"><h3>Warm and blunt</h3><p>Credible, warm, and blunt enough to be useful when the subject is too important for fake certainty.</p></article>
        </div>
        <div class="button-row section-action">
          <a class="button button-primary external-link" href="${escapeHtml(site.discord)}" ${external}>Join the Discord</a>
          <a class="button external-link" href="${escapeHtml(site.chatgptGroup)}" ${external}>ChatGPT group chat</a>
        </div>
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
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Browser Games | Qualiacology",
    url: `${site.origin}/games/`,
    description: `${games.length} small, self-contained browser worlds by Alexander Duncan Guitar. No downloads; each opens on its own page.`,
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
    <section class="subhero">
      <div class="container subhero-grid">
        <div>
          <span class="ghost-index" aria-hidden="true">02</span>
          <p class="eyebrow">02 · Browser worlds</p>
          <h1>Games</h1>
          <p class="subhero-deck">Small, self-contained worlds that run right in your browser — horror, exploration, movement, celestial chaos, and descent. No downloads; each opens on its own page.</p>
        </div>
        <div class="subhero-stat"><strong>${games.length}</strong><span>playable routes</span></div>
      </div>
    </section>

    <section class="section" aria-labelledby="catalog-title">
      <div class="container">
        <div class="section-heading">
          <div><p class="eyebrow">The full shelf</p><h2 id="catalog-title">All ${games.length} worlds.</h2></div>
          <div class="section-heading-copy"><p>Filter by mood. Controls and play times are listed where the game actually reports them — where it doesn't, I left it blank instead of guessing.</p></div>
        </div>
        <div class="filter-shell">
          <fieldset>
            <legend>Filter the worlds</legend>
            <button class="filter-button" type="button" data-filter="all" aria-pressed="true">All ${games.length}</button>
            <button class="filter-button" type="button" data-filter="action" aria-pressed="false">Action</button>
            <button class="filter-button" type="button" data-filter="horror" aria-pressed="false">Horror</button>
            <button class="filter-button" type="button" data-filter="worlds" aria-pressed="false">Worlds &amp; toys</button>
          </fieldset>
          <p class="filter-status" data-filter-status aria-live="polite">Showing ${games.length} worlds.</p>
        </div>
        <ul class="catalog-grid" data-game-catalog="${games.length}">
          ${games.map((item, index) => gameCard(item, index, { eager: index < 2 })).join("\n")}
        </ul>
      </div>
    </section>
  </main>`;

  return page({
    current: "games",
    title: `Browser Games | ${games.length} Worlds from Qualiacology`,
    description: `${games.length} small, self-contained browser worlds — horror, exploration, movement, celestial chaos, and descent. No downloads; each opens on its own page.`,
    path: "/games/",
    schema,
    main,
  });
}

function musicPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Doopliss Music | Qualiacology",
    url: `${site.origin}/music/`,
    description: `${albums.length} Doopliss releases — bright melodies, dark subtext, and pop songs that smile sweetly right before they bite.`,
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
    <section class="subhero">
      <div class="container subhero-grid">
        <div>
          <span class="ghost-index" aria-hidden="true">03</span>
          <p class="eyebrow">03 · Doopliss</p>
          <h1>Doopliss</h1>
          <p class="subhero-deck">Bright, catchy, upbeat melodies with psychologically dark, emotionally raw lyrics — murder pop on purpose. The hooks invite you in. The subtext quietly locks the door behind you.</p>
        </div>
        <div class="subhero-stat"><strong>${albums.length}</strong><span>releases</span></div>
      </div>
    </section>

    <section class="section" aria-labelledby="music-catalog-title">
      <div class="container">
        <div class="music-intro">
          <div><p class="eyebrow">The artist</p><h2>Doopliss</h2><p>Doopliss lives in that deliciously wrong sweet spot between neon-pop seduction and emotional sabotage — playful, glossy, a little dangerous, and never interested in pretending the dark stuff only sounds dark.</p></div>
          <div class="button-row"><a class="button button-pink external-link" href="${escapeHtml(site.suno)}" ${external}>Follow on Suno</a><a class="button external-link" href="${escapeHtml(site.tiktok)}" ${external}>TikTok</a></div>
        </div>
        <div class="music-intro">
          <div><p class="eyebrow">One-off</p><h2>Instead of the Goodbye</h2><p>A walk dictated into a phone with no bars. Every message was written to someone who couldn't receive it yet. Recorded from a field recording, Oswegatchie Hills, August 1st — 5:54, with the photographs.</p></div>
          <div class="button-row"><a class="button button-pink button-arrow" href="/instead-of-the-goodbye/">Keep walking</a></div>
        </div>
        <div class="section-heading">
          <div><p class="eyebrow">The full discography</p><h2 id="music-catalog-title">All ${albums.length} releases.</h2></div>
          <div class="section-heading-copy"><p>Every Doopliss release in one place. Track counts where the pages actually have them — nothing made up.</p></div>
        </div>
        <ul class="catalog-grid" data-album-catalog="${albums.length}">
          ${albums.map((item, index) => albumCard(item, index, { eager: index < 2 })).join("\n")}
        </ul>
      </div>
    </section>
  </main>`;

  return page({
    current: "music",
    title: `Doopliss Music | ${albums.length} Releases from Qualiacology`,
    description: `${albums.length} Doopliss releases — bright melodies, dark subtext, and pop songs that smile sweetly right before they bite.`,
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
    ["/music/", "0.9"],
    ...games.map((game) => [routeForGame(game), "0.8"]),
    ...albums.map((album) => [routeForAlbum(album), "0.7"]),
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

validateData();
builtAssets = buildAssets();
write("index.html", homepage());
write(join("psychopharmacology", "index.html"), psychopharmacologyPage());
write(join("games", "index.html"), gamesPage());
write(join("music", "index.html"), musicPage());
write("sitemap.xml", sitemap());

for (const file of ["index.html", join("psychopharmacology", "index.html"), join("games", "index.html"), join("music", "index.html"), "sitemap.xml"]) {
  const contents = readFileSync(join(outputRoot, file), "utf8");
  assert(!contents.toLowerCase().includes("blackthorn"), `Forbidden Blackthorn reference in ${file}`);
}

console.log(`Built Qualiacology hub: ${games.length} games, ${albums.length} releases`);
console.log(`CSS ${builtAssets.css}`);
console.log(`JS  ${builtAssets.js}`);
