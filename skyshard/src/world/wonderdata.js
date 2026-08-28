// R5 authored open-world sites. These are deliberately placed between the
// existing destinations instead of rolled from a scatter field: each point is
// a composed landmark, a readable approach, and either a contained encounter
// or a small one-time Aster cache. None of them grants guardian progression.

const inward = (x, z, twist = 0) => Math.atan2(-x, -z) + twist;
const W = (id, name, region, x, z, variant, scale, encounter, rank, twist = 0) => ({
  id, name, region, x, z, variant, scale, encounter, rank,
  rotation: inward(x, z, twist),
  reward: 'aster',
  radius: 16 + scale * 4,
});

// Five compact inner-ring landmarks, kept separate from the 45 outer-world
// wonders so their authored placement, deterministic encounter indices, and
// ecosystem distributions remain unchanged. Every first step away from the
// Spire now has a nearby regional threshold with a contained Aster fight.
export const R6_THRESHOLDS = [
  W('starfall-threshold', 'Asterfall Threshold', 'vale', 7, 69, 3, .78, true, 1, -.06),
  W('cinderwake-gate', 'Cinderwake Gate', 'ember', -67, 22, 3, .76, true, 1, .08),
  W('hushglass-cairn', 'Hushglass Cairn', 'frost', -41, -57, 3, .76, true, 1, -.05),
  W('lanternroot-vestibule', 'Lanternroot Vestibule', 'mycel', 67, 22, 3, .78, true, 1, .07),
  W('gravity-well-garden', 'Gravity Well Garden', 'shatter', 41, -57, 3, .78, true, 1, -.07),
];
export const STARFALL_THRESHOLD = R6_THRESHOLDS[0];

export const WONDERS = [
  // Verdant Vale — old growth, waterworks, and inhabited stone.
  W('vale-heartwood', 'Heartwood Sanctuary', 'vale', 43, 117, 0, 1.08, true, 1, -.16),
  W('vale-weir', 'Drowned Weir Garden', 'vale', -51, 141, 1, .92, false, 1, .18),
  W('vale-crown', 'Crownroot Crossing', 'vale', 21, 204, 2, 1.16, true, 2, -.10),
  W('vale-bells', 'Bellstone Orchard', 'vale', -92, 227, 0, .98, true, 1, .22),
  W('vale-giant', 'The Sleeping Giant', 'vale', 120, 258, 2, 1.28, true, 2, -.24),
  W('vale-vigil', 'Greenward Vigil', 'vale', -46, 327, 1, 1.05, false, 1, .12),
  W('vale-terraces', 'Sunken Terraces', 'vale', 85, 320, 0, 1.12, true, 2, -.34),
  W('vale-hush', 'Hushgrove', 'vale', -145, 405, 1, 1.18, true, 3, .20),
  W('vale-last-oak', 'The Last Oak Court', 'vale', -70, 500, 2, 1.34, true, 3, -.08),

  // Ember Flats — vitrified architecture and the bones of impossible fauna.
  W('ember-glassgate', 'Glassgate', 'ember', -99, 77, 1, .96, false, 1, -.12),
  W('ember-cinderjaw', 'Cinderjaw', 'ember', -150, -5, 2, 1.06, true, 1, .18),
  W('ember-ribfall', 'Ribfall Processional', 'ember', -187, 83, 0, 1.10, true, 2, -.20),
  W('ember-kiln', 'The Black Kiln', 'ember', -244, -17, 1, 1.22, true, 2, .10),
  W('ember-sunsink', 'Sunsink Caldera', 'ember', -208, 194, 2, 1.20, true, 2, -.26),
  W('ember-furnace', 'Furnace Wreck', 'ember', -330, 100, 0, 1.14, false, 1, .22),
  W('ember-throne', 'Ashglass Throne', 'ember', -319, 207, 1, 1.26, true, 3, -.10),
  W('ember-teeth', 'Titan Teeth', 'ember', -415, -55, 2, 1.30, true, 3, .16),
  W('ember-vigil', 'Red Horizon Vigil', 'ember', -395, 390, 0, 1.20, true, 3, -.18),

  // Frostmere — glacial cathedrals, stranded hulls, and singing ice.
  W('frost-choir', 'The Ice Choir', 'frost', -104, -70, 0, 1.02, true, 1, .14),
  W('frost-hull', 'White Hull Grave', 'frost', -41, -144, 2, 1.08, false, 1, -.20),
  W('frost-needle', 'Needle Chapel', 'frost', -137, -152, 1, 1.15, true, 2, .18),
  W('frost-fall', 'Frozen Fall', 'frost', -59, -238, 0, 1.17, true, 2, -.12),
  W('frost-crown', 'Rime Crown', 'frost', -249, -138, 2, 1.22, true, 2, .24),
  W('frost-cairn', 'Aurora Cairn', 'frost', -155, -291, 1, 1.09, false, 1, -.16),
  W('frost-basilica', 'Blueglass Basilica', 'frost', -295, -239, 0, 1.30, true, 3, .12),
  W('frost-shelf', 'Whalebone Shelf', 'frost', -240, -350, 2, 1.25, true, 3, -.22),
  W('frost-lantern', 'Last Lantern Glacier', 'frost', -454, -221, 1, 1.32, true, 3, .18),

  // Mycel Hollow — root cathedrals and luminous wetland ecologies.
  W('mycel-bloom', 'First Bloom Grotto', 'mycel', 125, -4, 0, 1.02, false, 1, -.12),
  W('mycel-rootcourt', 'Rootcourt', 'mycel', 118, 92, 1, 1.12, true, 1, .20),
  W('mycel-lanterns', 'Lanternfen', 'mycel', 201, 43, 2, 1.07, true, 2, -.18),
  W('mycel-choir', 'Spore Choir', 'mycel', 188, 157, 0, 1.18, false, 1, .14),
  W('mycel-vault', 'The Undercap Vault', 'mycel', 283, -35, 1, 1.25, true, 2, -.24),
  W('mycel-cascade', 'Glowroot Cascade', 'mycel', 297, 145, 2, 1.14, true, 2, .12),
  W('mycel-matriarch', 'Matriarch Grove', 'mycel', 379, 20, 0, 1.32, true, 3, -.20),
  W('mycel-pilgrims', 'Pilgrim Caps', 'mycel', 420, 330, 1, 1.24, true, 3, .16),
  W('mycel-lastlight', 'Lastlight Fen', 'mycel', 530, 90, 2, 1.28, true, 3, -.14),

  // The Shatter — impossible courts held together by residual gravity.
  W('shatter-orrery', 'Broken Orrery', 'shatter', 34, -120, 0, 1.00, false, 1, .18),
  W('shatter-stair', 'Unmoored Stair', 'shatter', 124, -84, 1, 1.06, true, 1, -.16),
  W('shatter-court', 'Gravity Court', 'shatter', 103, -178, 2, 1.14, true, 2, .24),
  W('shatter-lens', 'Fracture Lens', 'shatter', 208, -130, 0, 1.18, false, 1, -.22),
  W('shatter-bridge', 'Bridge Without Banks', 'shatter', 54, -280, 1, 1.24, true, 2, .12),
  W('shatter-archive', 'Fallen Star Archive', 'shatter', 229, -237, 2, 1.20, true, 2, -.18),
  W('shatter-crown', 'Levitation Crown', 'shatter', 310, -320, 0, 1.32, true, 3, .20),
  W('shatter-procession', 'The Hanging Procession', 'shatter', 220, -430, 1, 1.28, true, 3, -.14),
  W('shatter-end', 'Worldbreak Court', 'shatter', 450, -330, 2, 1.36, true, 3, .18),
];

export const WONDERS_BY_REGION = Object.freeze({
  vale: WONDERS.filter((w) => w.region === 'vale'),
  ember: WONDERS.filter((w) => w.region === 'ember'),
  frost: WONDERS.filter((w) => w.region === 'frost'),
  mycel: WONDERS.filter((w) => w.region === 'mycel'),
  shatter: WONDERS.filter((w) => w.region === 'shatter'),
});
