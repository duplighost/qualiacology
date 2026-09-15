// The car's parts. Stable ids; each one installs driving hooks and nothing else.
// THE ELEVEN REWIRE: nothing sells these any more. Every part arrives from one of the
// Eleven the instant it dies (vehicle/parts.js maps boss -> part; progress.grantUpgrade
// fits it). The `price` fields stay because the workshop cards still lay a row out with
// one, and because a part's price is the shape of what it would have been worth.
// This module contains data and installers only, with no renderer dependency.

/** The one hook the Treebreaker installs. car.js reads it in _crushStep. */
export const TREEBREAK = Object.freeze({
  minSpeed: 9.0,      // m/s below which a trunk still stops you dead
  radius: 2.35,       // metres either side of the nose that get taken down
  scrub: 0.22,        // fraction of speed a felled trunk costs, per trunk
  regrowS: 26.0,      // seconds before the tree stands back up ("temporarily destroying")
  maxPerStep: 3,      // trunks one step may take, so a thicket cannot cost a frame
});

// Driving parameters are shared by the install hooks and their existing consumers.
const HOTWIRE_S = 0.5;
const NITRO = Object.freeze({ mul: 1.45, accel: 2.2, drainS: 4.0, refillS: 9.0, holdS: 1.1 });
// Mire Tyres. One multiplier on both off-road numbers (CFG.car offRoad 12.2, accelOff 4.6),
// so the surface still costs you something — it costs you less.
const OFFROAD_MUL = 1.35;
// The Funeral Peal. Hold the horn; the bell under the bumper answers and what hunts you
// loses the thread. Radius is a little over two horn-lures; the deafness is long enough to
// break a chase and short enough that you cannot stand in a yard ringing it.
const PEAL = Object.freeze({ chargeS: 1.0, radius: 48, deafS: 9, cooldownS: 22 });

export const UPGRADES = Object.freeze([
  {
    id: 'armour', name: 'STEEL SHELL', price: 720,
    line: 'Riveted body armour. Enemy hits cause half as much damage to the car.',
    install: hooks => { hooks.on('carImpact', 'garage:armour', v => v * .5); },
  },
  {
    id: 'ward', name: 'STORM WARD', price: 1250,
    line: 'Roof coils absorb three hits. Recharges after twelve seconds without a hit.',
    install: hooks => { hooks.on('carWard', 'garage:ward', () => true); },
  },
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
    // REBUILT. It used to be a full rebuild that also healed the car while you drove, which
    // meant the car looked after itself and gas would have had nothing to do. Now it takes
    // the MILEAGE out of the car and nothing else: the road no longer wears it, but every
    // impact, ram, felled tree, crushed prop and enemy blow still does. The one full
    // restoration happens once, on the grant (car.js listens for it on garage:bought).
    id: 'rebuilt', name: 'REBUILT', price: 1500,
    line: 'Permanent engine rebuild. The road alone no longer wears the car.',
    install: (hooks) => {
      hooks.on('wearAdd', 'garage:rebuilt', (v, ctx, why) => (why === 'drive' ? 0 : v));
    },
  },
  {
    id: 'treebreaker', name: 'TREEBREAKER', price: 3600,
    line: 'Forestry splitter and braces. Drive straight through trees.',
    install: (hooks) => { hooks.on('treeBreak', 'garage:treebreaker', () => TREEBREAK); },
  },
  {
    // From the Lantern Eater, which ate light. Alex named the part; the boss's weapon finish
    // was called Stolen Light too and was renamed Swallowed Lamp so only one thing has it.
    id: 'stolenlight', name: 'STOLEN LIGHT', price: 660,
    line: 'Damage no longer dims the working headlamp.',
    install: (hooks) => { hooks.on('lampWearProof', 'garage:stolenlight', () => true); },
  },
  {
    id: 'mothscreen', name: 'MOTH SCREEN', price: 420,
    line: 'Moths no longer settle on the lamp.',
    install: (hooks) => { hooks.on('mothScreen', 'garage:mothscreen', () => true); },
  },
  {
    id: 'miretyres', name: 'MIRE TYRES', price: 840,
    line: 'Better speed and pull off the road.',
    install: (hooks) => { hooks.on('offRoadMul', 'garage:miretyres', () => OFFROAD_MUL); },
  },
  {
    id: 'funeralpeal', name: 'FUNERAL PEAL', price: 1100,
    line: 'Hold the horn. A peal scatters what hunts you.',
    install: (hooks) => { hooks.on('funeralPeal', 'garage:funeralpeal', () => PEAL); },
  },
]);

export const UPGRADE_BY_ID = Object.freeze(
  UPGRADES.reduce((m, u) => { m[u.id] = u; return m; }, Object.create(null)),
);

export default UPGRADES;
