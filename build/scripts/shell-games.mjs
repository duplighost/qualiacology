// One-shot: shell incoming game folders so they belong to the site.
//  - repair double-encoded UTF-8 (mojibake) + strip BOM in HTML
//  - replace <title>, description, canonical, OG/Twitter, favicon, theme-color
//  - drop root-absolute favicon/manifest links that 404 under a subpath
//  - inject the Qualiacology home-link pill
// Usage: node build/scripts/shell-games.mjs
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = "https://qualiacology.com";

const GAMES = {
  "afterglow": { title: "AFTERGLOW", theme: "#0a0420",
    desc: "AFTERGLOW is a browser twin-stick survival roguelite — one neon arena, escalating waves, and a dash you learn to live inside.",
    og: "One arena, waves that keep arriving, and a dash with invincibility frames — you go through the danger, not around it." },
  "cinderbloom": { title: "CINDERBLOOM", theme: "#040302",
    desc: "CINDERBLOOM is a browser first-person shooter on an alien fire world where the ammunition comes out of the things you kill.",
    og: "A survey on a planet that has been burning for a billion years. Every mesh, texture and sound is generated at boot." },
  "echo-saint": { title: "ECHO//SAINT", theme: "#05030b",
    desc: "ECHO//SAINT is a browser bullet hell where you draw closed shapes around enemy fire and it comes back as your own.",
    og: "Your ship fires on its own. What you do is draw — seal a shape and every bullet inside it becomes yours." },
  "finale": { title: "FINALE", theme: "#05060b",
    desc: "FINALE is a browser bullet hell about beating a firework to its own explosion — kill a shell in its fuse window and its volley blooms in your colour.",
    og: "Every enemy is a firework shell. Kill one while its fuse is lit and the volley it was about to fire blooms in your colour instead." },
  "goodfire": { title: "GOODFIRE", theme: "#14100d",
    desc: "GOODFIRE is a browser wildfire simulation across one season on one mountain, where the ground you fail to hold is what saves you later.",
    og: "One mountain, one fire season, one warden on foot. There is no fail state — a fire that overruns you becomes scar." },
  "the-lag": { title: "THE LAG", theme: "#05070a",
    desc: "THE LAG is a browser first-person horror game in a maze of mirrors where your reflection runs half a second behind — and keeps closing.",
    og: "Every wall is a mirror. The only way to tell a corridor from a reflection is your own lantern, and it comes back late." },
  "little-gods": { title: "Goodnight, Little Gods", theme: "#050711",
    desc: "Goodnight, Little Gods is a short browser rhythm game about singing nine small creatures home before morning.",
    og: "Nine small gods loose in a night orchard, and you have until morning. Pick a colour, sing on the beat, walk them home." },
  "vanta-9": { title: "VANTA//9", theme: "#05080d",
    desc: "VANTA//9 is a browser first-person shooter: descend into a low-poly alien city, sever three Choir Anchors, and survive the last note.",
    og: "The planet started transmitting in the voices of dead pilots. Three anchors hold the signal up. Go down and take them apart." },
  "afterparty": { title: "AFTERPARTY AT THE END OF THE WORLD", theme: "#090812",
    desc: "AFTERPARTY AT THE END OF THE WORLD is a browser platformer about outrunning the sunrise and rescuing the people who made the night worth it.",
    og: "Sunrise is deleting the city behind you. Every person you stop for adds an instrument to the song and a move to your kit." },
  "everybody-leaves": { title: "EVERYBODY LEAVES IN 4/4", theme: "#f1e8d4",
    desc: "EVERYBODY LEAVES IN 4/4 is a browser action platformer: one last song with your old band, where everything you use is something they threw at you.",
    og: "Twelve minutes before the 6:05 train and one song left. You can't make anything yourself — you can only catch what they throw." },
  "pocket-sun": { title: "POCKET SUN", theme: "#090611",
    desc: "POCKET SUN is an endless browser gravity toy for one finger — hold to pull a small sun, let go to push it away, and every collision is a note.",
    og: "Your finger is gravity. The sun has no brakes. Everything else is percussion." },
  "dead-keep-playing": { title: "THE DEAD KEEP PLAYING", theme: "#09070d",
    desc: "THE DEAD KEEP PLAYING is a browser platformer where every failed run comes back as a teammate — a one-player co-op built out of your own ghosts.",
    og: "Every take lasts thirty-four seconds. However it ends, it comes back as a ghost that plays alongside you." },
  "unsay-it": { title: "UNSAY IT", theme: "#17131f",
    desc: "UNSAY IT is a browser action-adventure where every adjective exists exactly once — peel a word off one thing and stick it on another, and live with the trade.",
    og: "Every adjective in town exists exactly once. Peel one off something and put it somewhere else; it takes its physics with it." },
};

// double-encoded UTF-8 repair (mojibake) — targeted, so clean text can't be damaged
const MOJI = [
  ["â€”", "—"],  // em dash
  ["â€“", "–"],  // en dash
  ["â€™", "’"],  // right single quote
  ["â€˜", "‘"],
  ["â€œ", "“"],
  ["â€", "”"],
  ["â€¢", "•"],  // bullet
  ["Ã—", "×"],        // multiplication sign
  ["Â·", "·"],        // middle dot
  ["Â ", " "],
  ["â†’", "→"],  // arrows
  ["â†‘", "↑"],
  ["â†“", "↓"],
  ["â†µ", "↵"],
  ["â—", "●"],  // filled circle
  ["â€¦", "…"],  // ellipsis
];
function demojibake(s) { for (const [bad, good] of MOJI) s = s.split(bad).join(good); return s; }

const PILL = (theme) => `
<style>
  .qc-home-link{position:fixed;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));z-index:2147483000;
    color:rgba(255,255,255,.82);text-decoration:none;font:700 10px/1.2 system-ui,-apple-system,sans-serif;letter-spacing:.16em;
    text-transform:uppercase;padding:7px 11px;border-radius:999px;background:rgba(8,8,14,.62);border:1px solid rgba(255,255,255,.22);
    backdrop-filter:blur(8px);transition:opacity .25s ease,color .25s ease}
  .qc-home-link:hover,.qc-home-link:focus-visible{color:#fff;border-color:rgba(255,255,255,.45)}
  body:has(canvas:fullscreen) .qc-home-link{opacity:0;pointer-events:none}
</style>
<a class="qc-home-link" href="/">Qualiacology</a>
<script>
  // hide the pill while the game holds pointer lock, so it never sits over a locked cursor
  document.addEventListener('pointerlockchange',function(){
    var a=document.querySelector('.qc-home-link'); if(!a) return;
    var locked=!!document.pointerLockElement; a.style.opacity=locked?'0':''; a.style.pointerEvents=locked?'none':'';
  });
</script>`;

function stripTags(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, "")
    .replace(/<meta[^>]+name=["']description["'][^>]*>\s*/gi, "")
    .replace(/<meta[^>]+name=["']theme-color["'][^>]*>\s*/gi, "")
    .replace(/<meta[^>]+property=["']og:[^"']*["'][^>]*>\s*/gi, "")
    .replace(/<meta[^>]+name=["']twitter:[^"']*["'][^>]*>\s*/gi, "")
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>\s*/gi, "")
    .replace(/<link[^>]+rel=["']manifest["'][^>]*>\s*/gi, "");
}

const files = [];
for (const slug of Object.keys(GAMES)) {
  const dir = join(ROOT, slug);
  let entries = [];
  try { entries = await readdir(dir); } catch { console.log(`${slug}: MISSING FOLDER`); continue; }
  const g = GAMES[slug];
  const cardExt = entries.includes("index.html") ? await cardFor(slug) : "jpg";
  for (const name of entries.filter(n => n.endsWith(".html"))) {
    const p = join(dir, name);
    let html = await readFile(p, "utf8");
    const before = html;
    if (html.charCodeAt(0) === 0xFEFF) html = html.slice(1);          // BOM
    html = demojibake(html);
    if (name === "index.html") {
      html = stripTags(html);
      const head = `
  <title>${g.title} | Qualiacology</title>
  <meta name="description" content="${g.desc}">
  <meta name="theme-color" content="${g.theme}">
  <link rel="canonical" href="${SITE}/${slug}/">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <meta property="og:site_name" content="Qualiacology">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${g.title} | Qualiacology">
  <meta property="og:description" content="${g.og}">
  <meta property="og:url" content="${SITE}/${slug}/">
  <meta property="og:image" content="${SITE}/assets/games/${slug}-card-clean.${cardExt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${g.title} | Qualiacology">
  <meta name="twitter:description" content="${g.og}">
  <meta name="twitter:image" content="${SITE}/assets/games/${slug}-card-clean.${cardExt}">
`;
      if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, head + "</head>");
      else html = head + html;
      if (!/qc-home-link/.test(html)) {
        if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, PILL(g.theme) + "\n</body>");
        else html += PILL(g.theme);
      }
    }
    if (html !== before) { await writeFile(p, html, "utf8"); files.push(`${slug}/${name}`); }
  }
  console.log(`${slug.padEnd(19)} shelled (card .${cardExt})`);
}

async function cardFor(slug) {
  for (const ext of ["jpg", "webp", "png", "svg"]) {
    try { await stat(join(ROOT, "assets/games", `${slug}-card-clean.${ext}`)); return ext; } catch {}
  }
  return "jpg";
}

console.log(`\nrewrote ${files.length} html files`);
