// Cash-bought car upgrades. Stable IDs and legacy XP mappings preserve old saves.
// Each purchase installs driving hooks; car.js applies its visible fittings and repair.
// This module contains data and installers only, with no renderer dependency.

/** The one hook the Treebreaker installs. car.js reads it in _crushStep. */
export const TREEBREAK = Object.freeze({
  minSpeed: 9.0,      // m/s below which a trunk still stops you dead
  radius: 2.35,       // metres either side of the nose that get taken down
  scrub: 0.22,        // fraction of speed a felled trunk costs, per trunk
  regrowS: 26.0,      // seconds before the tree stands back up ("temporarily destroying")
  maxPerStep: 3,      // trunks one step may take, so a thicket cannot cost a frame
});

// Driving parameters are shared by the purchase hooks and their existing consumers.
const HOTWIRE_S = 0.5;
const NITRO = Object.freeze({ mul: 1.45, accel: 2.2, drainS: 4.0, refillS: 9.0, holdS: 1.1 });
const WEAR_MEND = 0.9;

export const UPGRADES = Object.freeze([
  {
    id: 'hotwire', name: 'HOTWIRE', price: 240,
    line: 'Starts in half a second. Illuminated starter fitted.',
    install: (hooks) => { hooks.on('hotwireS', 'garage:hotwire', () => HOTWIRE_S); },
  },
  {
    id: 'rambar', name: 'RAM BAR', price: 480,
    line: 'Steel push bar. Keep your speed when you hit a body.',
    install: (hooks) => { hooks.on('ramClean', 'garage:rambar', () => true); },
  },
  {
    id: 'nitro', name: 'NITRO', price: 900,
    line: 'Hold SHIFT to boost. Twin tanks refill automatically.',
    install: (hooks) => { hooks.on('nitro', 'garage:nitro', () => NITRO); },
  },
  {
    id: 'kept', name: 'REBUILT', price: 1500,
    line: 'Permanent engine rebuild. Full repair, fresh paint, touring rack.',
    install: (hooks) => {
      hooks.on('wearAdd', 'garage:kept', () => 0);
      hooks.on('wearMend', 'garage:kept', (v, ctx, running) => (running ? v + WEAR_MEND : v));
    },
  },
  {
    id: 'treebreaker', name: 'TREEBREAKER', price: 3600,
    line: 'Forestry splitter and braces. Drive straight through trees.',
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
