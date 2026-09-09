// CURFEW — THE GARAGE. What the people at the lookouts will do to your car, and what it costs.
//
// ALEX, 2026-09-09: "Let's get the car upgrades out of the xp things. They should cost money
// from those other people who fix your car." And: "I want to be able to upgrade the car in
// very expensive ways. If an upgrade is wicked expensive and it lets it crash through the
// trees in a forest knocking them over/temporarily destroying them, that would be the best."
//
// So the WHEEL branch is gone out of progression/nodes.js and lives here instead. Every one
// of these five is the SAME node it was — same effect, same hook, same numbers, because
// those were tuned and shipped in PR #216 and nothing about moving where you buy them
// should change how they feel. What changed is the currency and the counter you buy them at.
//
// THIS FILE IS DATA ONLY, exactly like nodes.js: no THREE, no ctx, no side effects, so a
// test can import it without booting a renderer. An upgrade INSTALLS its own effect into
// the same hook registry the tree uses (nodes.js's second law: the hook registry is the
// contract, and no sibling switches on an id). car.js therefore did not have to learn that
// any of this moved — it still calls perk('nitro') at the same line it always did.
//
// THE PRICES. The whole point of the ask is that money should mean something, so the ladder
// runs from "one good night" to "a real goal": 240 / 480 / 900 / 1500, and then the
// Treebreaker at 3600, which is more than the other four together. Alex's word for what he
// wanted was "wicked expensive" and this is what that has to look like against the county's
// income after the round-18 rebalance (a purse is 8-26, a strongbox 90-140, a supply cache
// 22-40). Do not quietly soften these: an expensive thing that is not expensive is just a
// longer walk to the same car.

/** The one hook the Treebreaker installs. car.js reads it in _crushStep. */
export const TREEBREAK = Object.freeze({
  minSpeed: 9.0,      // m/s below which a trunk still stops you dead
  radius: 2.35,       // metres either side of the nose that get taken down
  scrub: 0.22,        // fraction of speed a felled trunk costs, per trunk
  regrowS: 26.0,      // seconds before the tree stands back up ("temporarily destroying")
  maxPerStep: 3,      // trunks one step may take, so a thicket cannot cost a frame
});

// The numbers the WHEEL branch used, moved verbatim from nodes.js. Every one of these was
// measured live by tools/perk-check.mjs in PR #216.
const HOTWIRE_S = 0.5;
const NITRO = Object.freeze({ mul: 1.45, accel: 2.2, drainS: 4.0, refillS: 9.0, holdS: 1.1 });
const WEAR_MEND = 0.9;

export const UPGRADES = Object.freeze([
  {
    id: 'hotwire', name: 'HOTWIRE', price: 240,
    line: 'HALF A SECOND UNDER THE COLUMN',
    install: (hooks) => { hooks.on('hotwireS', 'garage:hotwire', () => HOTWIRE_S); },
  },
  {
    id: 'rambar', name: 'RAM BAR', price: 480,
    line: 'AT SPEED, A BODY IS NOT AN OBSTACLE',
    install: (hooks) => { hooks.on('ramClean', 'garage:rambar', () => true); },
  },
  {
    id: 'nitro', name: 'NITRO', price: 900,
    line: 'A TANK OF SPEED ON SHIFT',
    install: (hooks) => { hooks.on('nitro', 'garage:nitro', () => NITRO); },
  },
  {
    id: 'kept', name: 'REBUILT', price: 1500,
    line: 'IT STOPS WEARING OUT',
    install: (hooks) => {
      hooks.on('wearAdd', 'garage:kept', () => 0);
      hooks.on('wearMend', 'garage:kept', (v, ctx, running) => (running ? v + WEAR_MEND : v));
    },
  },
  {
    id: 'treebreaker', name: 'TREEBREAKER', price: 3600,
    line: 'THE WOODS STOP BEING A WALL',
    install: (hooks) => { hooks.on('treeBreak', 'garage:treebreaker', () => TREEBREAK); },
  },
]);

export const UPGRADE_BY_ID = Object.freeze(
  UPGRADES.reduce((m, u) => { m[u.id] = u; return m; }, Object.create(null)),
);

/**
 * A legacy save that bought one of these as an XP node keeps it. The WHEEL branch's four
 * node ids map onto the four upgrades that used to be them, so nobody who spent points on
 * Nitro before this round loses Nitro — progress.js runs this once at load and the spent
 * points come back as points.
 */
export const LEGACY_NODE_UPGRADE = Object.freeze({
  wheel_1: 'hotwire', wheel_2: 'rambar', wheel_3: 'nitro', wheel_4: 'kept',
});

/** The point cost each of those WHEEL nodes used to have, so a migration can refund it. */
export const LEGACY_NODE_COST = Object.freeze({
  wheel_1: 1, wheel_2: 2, wheel_3: 3, wheel_4: 5,
});

export default UPGRADES;
