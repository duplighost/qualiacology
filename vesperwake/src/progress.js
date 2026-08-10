/* progress.js — the part of the game that persists.
 *
 * This is the Bloodstained layer: what you keep between rooms and between
 * runs. Three things live here and nowhere else:
 *
 *   DUST      the currency. Everything that dies leaves a little noon behind.
 *   FORGE     what you spend it on, at a sun-disc: Vitality, Weight, Reach.
 *   SHARDS    the abilities pulled out of the things you have killed. A shard
 *             is not a stat — it is a verb, and every one of them opens a door
 *             that was closed the first time you walked past it.
 *
 * The rule that makes this a metroidvania rather than a shop: an upgrade may
 * make you stronger, but only a SHARD may make a place reachable.
 */

const SAVE_KEY = 'vesperwake.save.v2';

export const SHARDS = {
  crow: {
    name: 'CROW SHARD',
    line: 'A second step in empty air',
    from: 'the crows of the Wake Orchard',
    ability: 'doubleJump',
  },
  moth: {
    name: 'MOTH SHARD',
    line: 'Hold, and fall slowly',
    from: 'the moths of the Drowned Reliquary',
    ability: 'glide',
  },
  harrier: {
    name: 'HARRIER SHARD',
    line: 'The step works in the air',
    from: 'the harriers of the Meridian Belfry',
    ability: 'airStep',
  },
};

/* Each upgrade is deliberately shallow — five ranks, a flat curve, no
 * arithmetic to do in your head. The interesting decision is which of the
 * three you want first, not how to optimise a build. */
export const FORGE = {
  vitality: {
    name: 'VITALITY',
    line: 'The vow holds longer',
    ranks: 5,
    cost: (r) => 60 + r * 55,
    apply: (p, r) => { p.maxHp = 100 + r * 20; },
    describe: (r) => `${100 + r * 20} health`,
    next: (r) => `${100 + (r + 1) * 20} health`,
  },
  weight: {
    name: 'WEIGHT',
    line: 'The clapper falls harder',
    ranks: 5,
    cost: (r) => 75 + r * 65,
    apply: (p, r) => { p.damageMult = 1 + r * 0.14; },
    describe: (r) => `+${Math.round(r * 14)}% strike damage`,
    next: (r) => `+${Math.round((r + 1) * 14)}% strike damage`,
  },
  reach: {
    name: 'REACH',
    line: 'More chain between you and it',
    ranks: 5,
    cost: (r) => 70 + r * 70,
    apply: (p, r) => { p.reachMult = 1 + r * 0.055; },
    describe: (r) => `+${Math.round(r * 5.5)}% whip reach · ${9 + r} links`,
    next: (r) => `+${Math.round((r + 1) * 5.5)}% reach · ${10 + r} links`,
  },
};

export function makeProgress() {
  return {
    dust: 0,
    ranks: { vitality: 0, weight: 0, reach: 0 },
    shards: new Set(),
    relics: new Set(),
    secretsFound: new Set(),
    zonesSeen: new Set(),
    chaptersCleared: new Set(),
    furthestChapter: 0,
    deaths: 0,
    bestTime: null,
  };
}

export function applyAll(progress, player) {
  for (const [key, def] of Object.entries(FORGE)) {
    def.apply(player, progress.ranks[key] ?? 0);
  }
  player.maxHp = Math.max(player.maxHp, 100);
  player.hp = Math.min(player.hp, player.maxHp);
  player.abilities.doubleJump = progress.shards.has('crow');
  player.abilities.glide = progress.shards.has('moth');
  player.abilities.airStep = progress.shards.has('harrier');
}

export const chainLinksFor = (progress) => 9 + (progress.ranks.reach ?? 0);

export function costOf(key, progress) {
  const def = FORGE[key];
  const rank = progress.ranks[key] ?? 0;
  if (rank >= def.ranks) return null;
  return def.cost(rank);
}

export function buy(key, progress, player) {
  const cost = costOf(key, progress);
  if (cost === null || progress.dust < cost) return false;
  progress.dust -= cost;
  progress.ranks[key] += 1;
  applyAll(progress, player);
  player.hp = player.maxHp;
  return true;
}

/* ---- persistence ---- */

export function save(progress, extra = {}) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      dust: progress.dust,
      ranks: progress.ranks,
      shards: [...progress.shards],
      relics: [...progress.relics],
      secretsFound: [...progress.secretsFound],
      zonesSeen: [...progress.zonesSeen],
      chaptersCleared: [...progress.chaptersCleared],
      furthestChapter: progress.furthestChapter,
      deaths: progress.deaths,
      bestTime: progress.bestTime,
      ...extra,
    }));
  } catch { /* private browsing */ }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    const p = makeProgress();
    p.dust = d.dust ?? 0;
    p.ranks = { vitality: 0, weight: 0, reach: 0, ...(d.ranks ?? {}) };
    p.shards = new Set(d.shards ?? []);
    p.relics = new Set(d.relics ?? []);
    p.secretsFound = new Set(d.secretsFound ?? []);
    p.zonesSeen = new Set(d.zonesSeen ?? []);
    p.chaptersCleared = new Set(d.chaptersCleared ?? []);
    p.furthestChapter = d.furthestChapter ?? 0;
    p.deaths = d.deaths ?? 0;
    p.bestTime = d.bestTime ?? null;
    return { progress: p, checkpoint: d.checkpoint ?? null, level: d.level ?? 0 };
  } catch { return null; }
}

export function wipe() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

/* Dust dropped by a kill: bigger things are worth more, with a little jitter
 * so a run never feels like it is paying out on a schedule. */
export function dustFor(score, roll) {
  return Math.max(2, Math.round((score / 22) * (0.75 + roll * 0.6)));
}
