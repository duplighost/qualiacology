// Twenty optional ruin expeditions. These are deliberately separate from the
// five guardian destinations: their bosses grant cosmetic relics and Aster,
// never movement verbs, weapon tiers, health pips, or story-gate flags.

const RELICS = {
  seedwake:        { id: 'seedwake', name: 'SEEDWAKE', effect: 'trail', color: [0.55, 1.0, 0.45], shape: 'leaf', description: 'Footsteps briefly flower.' },
  mothLantern:     { id: 'moth-lantern', name: 'MOTH LANTERN', effect: 'familiar', color: [1.0, 0.9, 0.55], shape: 'moth', description: 'A warm moth keeps pace.' },
  raincoat:        { id: 'raincoat', name: 'RAINCOAT', effect: 'aura', color: [0.45, 0.78, 1.0], shape: 'drop', description: 'Rain bends around the vessel.' },
  verdantGlass:    { id: 'verdant-glass', name: 'VERDANT GLASS', effect: 'weapon', color: [0.45, 1.0, 0.62], shape: 'prism', description: 'The Sparkcaster grows green filigree.' },
  cinderstep:      { id: 'cinderstep', name: 'CINDERSTEP', effect: 'trail', color: [1.0, 0.35, 0.08], shape: 'ember', description: 'Movement leaves dying cinders.' },
  hearthling:      { id: 'hearthling', name: 'HEARTHLING', effect: 'familiar', color: [1.0, 0.55, 0.16], shape: 'coal', description: 'A coal-heart follows close.' },
  heatHaze:        { id: 'heat-haze', name: 'HEAT HAZE', effect: 'aura', color: [1.0, 0.5, 0.18], shape: 'sun', description: 'The air remembers the forge.' },
  arenaStandard:   { id: 'arena-standard', name: 'ARENA STANDARD', effect: 'death', color: [1.0, 0.25, 0.22], shape: 'pennant', description: 'Defeated foes become pennant sparks.' },
  snowprint:       { id: 'snowprint', name: 'SNOWPRINT', effect: 'trail', color: [0.72, 0.9, 1.0], shape: 'flake', description: 'Every landing writes itself in snow.' },
  windchime:       { id: 'windchime', name: 'WINDCHIME', effect: 'sound', color: [0.65, 0.9, 1.0], shape: 'bell', description: 'Fast movement carries a spare harmony.' },
  boneConstellation:{ id: 'bone-constellation', name: 'BONE CONSTELLATION', effect: 'precision', color: [0.94, 0.92, 0.78], shape: 'star', description: 'Precision hits draw pale stars.' },
  mirrorcoat:      { id: 'mirrorcoat', name: 'MIRRORCOAT', effect: 'weapon', color: [0.62, 0.86, 1.0], shape: 'prism', description: 'The Sparkcaster wears refracted ice.' },
  pufffriend:      { id: 'pufffriend', name: 'PUFFFRIEND', effect: 'familiar', color: [0.58, 1.0, 0.78], shape: 'puff', description: 'A harmless little puff joins you.' },
  breathbloom:     { id: 'breathbloom', name: 'BREATHBLOOM', effect: 'landing', color: [0.55, 1.0, 0.72], shape: 'spore', description: 'Landings exhale rings of spores.' },
  boglight:        { id: 'boglight', name: 'BOGLIGHT', effect: 'soul', color: [0.42, 1.0, 0.65], shape: 'flame', description: 'Collected souls linger as fireflies.' },
  velvetCrown:     { id: 'velvet-crown', name: 'VELVET CROWN', effect: 'death', color: [0.78, 0.35, 0.72], shape: 'cap', description: 'Defeated foes flower once.' },
  orbitals:        { id: 'orbitals', name: 'ORBITALS', effect: 'chain', color: [0.75, 0.56, 1.0], shape: 'shard', description: 'A kill chain gathers orbiting shards.' },
  pocketOrrery:    { id: 'pocket-orrery', name: 'POCKET ORRERY', effect: 'familiar', color: [0.88, 0.68, 1.0], shape: 'moon', description: 'A tiny moon system circles the weapon.' },
  redaction:       { id: 'redaction', name: 'REDACTION', effect: 'precision', color: [1.0, 0.42, 0.84], shape: 'glyph', description: 'Precision hits tear violet glyphs.' },
  nightglass:      { id: 'nightglass', name: 'NIGHTGLASS', effect: 'weapon', color: [0.64, 0.42, 1.0], shape: 'prism', description: 'The Sparkcaster carries a night wake.' },
};

const attackSets = {
  vale:    [['charge', 'radial'], ['charge', 'radial', 'aimed'], ['charge', 'wave', 'aimed', 'summon']],
  ember:   [['rain', 'charge'], ['rain', 'wave', 'aimed'], ['rain', 'wave', 'beam', 'summon']],
  frost:   [['beam', 'radial'], ['beam', 'rain', 'aimed'], ['beam', 'rain', 'wave', 'summon']],
  mycel:   [['seekers', 'wave'], ['seekers', 'wave', 'pull'], ['seekers', 'radial', 'pull', 'summon']],
  shatter: [['aimed', 'pull'], ['aimed', 'beam', 'radial'], ['aimed', 'pull', 'beam', 'summon']],
};

const make = (d) => ({
  kind: 'trial', enter: true, r: 20,
  attacks: attackSets[d.region],
  ...d,
});

export const TRIAL_DESTS = [
  // Verdant Vale — waterworks, orchards, bells, and mossed devotional stone.
  make({ id: 'rootcourt', region: 'vale', x: -210, z: 380, y: 7.0, name: 'Rootcourt Weir', layout: 'weir',
    boss: 'graft-king', bossName: 'THE GRAFT KING', bossShape: 'antler', hp: 54, fly: 0.6, radius: 1.8, speed: 2.6, arenaR: 9, minion: 'hopper', relic: RELICS.seedwake,
    path: [[0, 48], [-10, 28], [8, 8], [-12, -15], [0, -46]] }),
  make({ id: 'toothorchard', region: 'vale', x: 240, z: 390, y: 8.5, name: 'Orchard of Teeth', layout: 'orchard',
    boss: 'pommeljaw', bossName: 'POMMELJAW', bossShape: 'jaw', hp: 58, fly: 0.2, radius: 1.9, speed: 3.1, arenaR: 9, minion: 'puff', relic: RELICS.mothLantern,
    path: [[0, 48], [13, 30], [14, 5], [-8, -15], [4, -47]] }),
  make({ id: 'rainbell', region: 'vale', x: -185, z: 520, y: 5.8, name: 'Rainbell Aqueduct', layout: 'aqueduct',
    boss: 'bellweather', bossName: 'BELLWEATHER', bossShape: 'bell', hp: 56, fly: 2.0, radius: 1.6, speed: 2.8, arenaR: 8, minion: 'puff', relic: RELICS.raincoat,
    path: [[0, 48], [-14, 34], [-4, 12], [16, -7], [0, -46]] }),
  make({ id: 'mossglass', region: 'vale', x: 225, z: 545, y: 6.5, name: 'Mossglass Cloister', layout: 'cloister', apex: true,
    boss: 'vesper-hart', bossName: 'THE VESPER HART', bossShape: 'hart', hp: 96, fly: 1.0, radius: 1.7, speed: 3.8, arenaR: 10, minion: 'hopper', relic: RELICS.verdantGlass,
    path: [[0, 48], [16, 34], [16, 4], [-16, 4], [-16, -24], [0, -47]] }),

  // Ember Flats — industrial scars, glass optics, rib kilns, and spectacle.
  make({ id: 'cruciblescar', region: 'ember', x: -340, z: 440, y: 4.6, name: 'Crucible Scar', layout: 'trenches',
    boss: 'mother-clinker', bossName: 'MOTHER CLINKER', bossShape: 'clinker', hp: 66, fly: 0, radius: 2.0, speed: 2.1, arenaR: 9, minion: 'hound', relic: RELICS.cinderstep,
    path: [[0, 48], [-16, 29], [9, 13], [-9, -8], [13, -28], [0, -47]] }),
  make({ id: 'furnaceribs', region: 'ember', x: -430, z: 330, y: 6.2, name: 'Furnace Ribs', layout: 'ribs',
    boss: 'kiln-saint', bossName: 'THE KILN SAINT', bossShape: 'halo', hp: 70, fly: 1.2, radius: 1.9, speed: 2.4, arenaR: 9, minion: 'turret', relic: RELICS.hearthling,
    path: [[0, 48], [0, 29], [-15, 12], [15, -4], [0, -23], [0, -48]] }),
  make({ id: 'suncut', region: 'ember', x: -550, z: 110, y: 7.0, name: 'Suncut Labyrinth', layout: 'lensmaze',
    boss: 'noon-widow', bossName: 'THE NOON WIDOW', bossShape: 'widow', hp: 64, fly: 2.1, radius: 1.6, speed: 3.7, arenaR: 8, minion: 'hound', relic: RELICS.heatHaze,
    path: [[0, 48], [18, 33], [-17, 20], [17, 4], [-17, -14], [0, -47]] }),
  make({ id: 'ashenamphitheater', region: 'ember', x: -450, z: -150, y: 8.8, name: 'Ashen Amphitheater', layout: 'amphitheater', apex: true,
    boss: 'crown-of-nails', bossName: 'CROWN OF NAILS', bossShape: 'crown', hp: 112, fly: 0.4, radius: 2.0, speed: 3.1, arenaR: 12, minion: 'turret', relic: RELICS.arenaStandard,
    path: [[0, 48], [-18, 31], [0, 13], [18, -4], [0, -24], [0, -48]] }),

  // Frostmere — drowned galleries, wind architecture, bones, and prisms.
  make({ id: 'bluewake', region: 'frost', x: -520, z: -250, y: 3.2, name: 'Bluewake Gallery', layout: 'causeway',
    boss: 'pale-wake', bossName: 'THE PALE WAKE', bossShape: 'whale', hp: 62, fly: 1.8, radius: 2.1, speed: 2.2, arenaR: 10, minion: 'wisp', relic: RELICS.snowprint,
    path: [[0, 48], [-9, 30], [12, 15], [-12, -4], [9, -24], [0, -47]] }),
  make({ id: 'rimewind', region: 'frost', x: -480, z: -450, y: 7.8, name: 'Rimewind Nave', layout: 'windnave',
    boss: 'canon-gale', bossName: 'CANON GALE', bossShape: 'organ', hp: 68, fly: 2.4, radius: 1.7, speed: 3.0, arenaR: 9, minion: 'wisp', relic: RELICS.windchime,
    path: [[0, 48], [15, 32], [4, 12], [-15, -5], [-4, -25], [0, -48]] }),
  make({ id: 'glacierossuary', region: 'frost', x: -250, z: -550, y: 10.0, name: 'Glacier Ossuary', layout: 'ossuary', apex: true,
    boss: 'ivory-melt', bossName: 'THE IVORY MELT', bossShape: 'bonewheel', hp: 122, fly: 0.8, radius: 2.0, speed: 2.8, arenaR: 11, minion: 'golem', relic: RELICS.boneConstellation,
    path: [[0, 48], [-17, 36], [-17, 10], [13, 10], [13, -21], [0, -48]] }),
  make({ id: 'mirrortarn', region: 'frost', x: -70, z: -430, y: 6.8, name: 'Mirror Tarn', layout: 'prismtarn',
    boss: 'saint-refraction', bossName: 'SAINT REFRACTION', bossShape: 'prism', hp: 66, fly: 2.0, radius: 1.7, speed: 3.3, arenaR: 10, minion: 'wisp', relic: RELICS.mirrorcoat,
    path: [[0, 48], [17, 28], [-8, 11], [17, -8], [-12, -25], [0, -48]] }),

  // Mycel Hollow — breathing roots, fruiting gardens, flood crypts, velvet caps.
  make({ id: 'sporeorchard', region: 'mycel', x: 250, z: 195, y: 3.2, name: 'Spore Orchard', layout: 'sporeorchard',
    boss: 'fruiting-body', bossName: 'THE FRUITING BODY', bossShape: 'fruit', hp: 60, fly: 1.1, radius: 2.0, speed: 2.2, arenaR: 9, minion: 'creeper', relic: RELICS.pufffriend,
    path: [[0, 48], [-13, 31], [14, 17], [-14, 0], [14, -21], [0, -47]] }),
  make({ id: 'rootlung', region: 'mycel', x: 320, z: 60, y: 2.8, name: 'Rootlung Labyrinth', layout: 'rootlung',
    boss: 'bellows-below', bossName: 'BELLOWS BELOW', bossShape: 'lungs', hp: 68, fly: 0.7, radius: 2.2, speed: 2.0, arenaR: 9, minion: 'gasbag', relic: RELICS.breathbloom,
    path: [[0, 48], [17, 36], [17, 9], [-17, 9], [-17, -21], [0, -48]] }),
  make({ id: 'floodedreliquary', region: 'mycel', x: 520, z: 280, y: 1.8, name: 'Flooded Reliquary', layout: 'floodcrypt',
    boss: 'drowned-mycel', bossName: 'THE DROWNED MYCEL', bossShape: 'jelly', hp: 64, fly: 2.2, radius: 1.8, speed: 2.4, arenaR: 10, minion: 'gasbag', relic: RELICS.boglight,
    path: [[0, 48], [-16, 32], [2, 15], [17, -1], [-4, -21], [0, -48]] }),
  make({ id: 'capcathedral', region: 'mycel', x: 575, z: -75, y: 4.0, name: 'Cathedral of Caps', layout: 'capcathedral', apex: true,
    boss: 'velvet-bishop', bossName: 'THE VELVET BISHOP', bossShape: 'bishop', hp: 132, fly: 1.6, radius: 1.9, speed: 3.0, arenaR: 11, minion: 'creeper', relic: RELICS.velvetCrown,
    path: [[0, 48], [0, 30], [16, 13], [0, -3], [-16, -20], [0, -48]] }),

  // The Shatter — impossible architecture, orbits, redaction, and judgment.
  make({ id: 'gravitystair', region: 'shatter', x: 120, z: -250, y: 17.5, name: 'Gravity Stair', layout: 'gravitystair',
    boss: 'plumb-tyrant', bossName: 'THE PLUMB TYRANT', bossShape: 'pendulum', hp: 72, fly: 2.4, radius: 1.8, speed: 3.1, arenaR: 9, minion: 'sentinel', relic: RELICS.orbitals,
    path: [[0, 48], [-18, 34], [15, 20], [-15, 3], [18, -18], [0, -48]] }),
  make({ id: 'brokenorrery', region: 'shatter', x: 300, z: -190, y: 18.0, name: 'Broken Orrery', layout: 'orrery',
    boss: 'aphelion-engine', bossName: 'THE APHELION ENGINE', bossShape: 'orrery', hp: 78, fly: 2.8, radius: 1.9, speed: 3.2, arenaR: 10, minion: 'drone', relic: RELICS.pocketOrrery,
    path: [[0, 48], [15, 34], [-15, 18], [15, 2], [-15, -20], [0, -48]] }),
  make({ id: 'mirrorarchive', region: 'shatter', x: 520, z: -350, y: 20.0, name: 'Mirror Archive', layout: 'archive',
    boss: 'redaction-angel', bossName: 'REDACTION ANGEL', bossShape: 'pages', hp: 76, fly: 2.4, radius: 1.7, speed: 3.8, arenaR: 9, minion: 'sentinel', relic: RELICS.redaction, teleports: true,
    path: [[0, 48], [-17, 33], [17, 33], [17, 4], [-17, 4], [-17, -25], [0, -48]] }),
  make({ id: 'suspendedtribunal', region: 'shatter', x: 400, z: -540, y: 20.5, name: 'Suspended Tribunal', layout: 'tribunal', apex: true,
    boss: 'last-bailiff', bossName: 'THE LAST BAILIFF', bossShape: 'bailiff', hp: 148, fly: 1.8, radius: 2.1, speed: 3.2, arenaR: 12, minion: 'drone', relic: RELICS.nightglass, teleports: true,
    path: [[0, 48], [18, 31], [0, 15], [-18, -1], [0, -19], [18, -32], [0, -49]] }),
];

export const TRIAL_BY_ID = Object.fromEntries(TRIAL_DESTS.map((d) => [d.id, d]));
export const TRIAL_BOSS_BY_ID = Object.fromEntries(TRIAL_DESTS.map((d) => [d.boss, d]));
export const RELIC_BY_ID = Object.fromEntries(TRIAL_DESTS.map((d) => [d.relic.id, d.relic]));

// Boss victory and reward claim are deliberately separate states. A cleared
// trial must not resurrect its boss, but it is not complete until its relic is
// safely in the save. These helpers keep every wayfinding and re-entry system
// on that same contract.
export function isTrialCleared(saveState, dest) {
  return !!(dest?.kind === 'trial' && saveState?.trialsDown?.[dest.id]);
}

export function isTrialComplete(saveState, dest) {
  return !!(dest?.kind === 'trial' && saveState?.relics?.[dest.relic?.id]);
}

export function isTrialRewardPending(saveState, dest) {
  return isTrialCleared(saveState, dest) && !isTrialComplete(saveState, dest);
}
