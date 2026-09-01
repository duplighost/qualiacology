const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
};

const encounter = ({ phasePools, ...definition }) => {
  const pools = { ...phasePools };
  const max = Object.values(pools).reduce((sum, value) => sum + value, 0);
  const phaseFloors = {};
  const phaseCeilings = {};
  let floor = max;
  for (let phase = 1; phase <= Object.keys(pools).length; phase += 1) {
    phaseCeilings[phase] = floor;
    floor -= pools[phase];
    phaseFloors[phase] = floor;
  }
  return {
    ...definition,
    phasePools: pools,
    phaseCount: Object.keys(pools).length,
    health: {
      max,
      phaseFloors,
      phaseCeilings,
      phase2Threshold: phaseFloors[1],
      phase3Threshold: phaseFloors[2],
    },
  };
};

export const TRANSIT_TIMELINE = deepFreeze({
  duration: 5.6,
  driveStatus: .28,
  driveBurnStart: .30,
  tunnelStart: .32,
  actorsHidden: .34,
  swap: .68,
  arrivalStart: .70,
  driveBurnEnd: .72,
  landingBeamStart: .86,
  touchdownStatus: .92,
});

export function transitBeat(progress = 0) {
  const value = Number(progress);
  const p = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return {
    progress: p,
    segment: p < TRANSIT_TIMELINE.tunnelStart
      ? 'pickup'
      : p < TRANSIT_TIMELINE.arrivalStart ? 'starDrive' : 'landing',
    actorsHidden: p >= TRANSIT_TIMELINE.actorsHidden,
    swapped: p >= TRANSIT_TIMELINE.swap,
    complete: p >= 1,
    status: p < TRANSIT_TIMELINE.driveStatus
      ? 'WOUNDLIGHT DESCENDING'
      : p < TRANSIT_TIMELINE.swap
        ? 'SAINTFALL DRIVE // BURNING'
        : p < TRANSIT_TIMELINE.touchdownStatus
          ? 'ATMOSPHERIC KNIFE-EDGE'
          : 'TOUCHDOWN IMMINENT',
  };
}

export const ENCOUNTERS = deepFreeze([
  encounter({
    id: 'vespera',
    index: 0,
    area: 'THE BORROWED MERIDIAN',
    arrival: 'THE BORROWED MERIDIAN',
    bossName: 'SAINT VESPERA',
    bossTitle: 'KEEPER OF THE BORROWED SECOND',
    strategy: 'duel',
    phasePools: { 1: 2000, 2: 2400, 3: 3000 },
    phaseNames: {
      1: 'I · THE MEASURED HAND',
      2: 'II · THE BROKEN DIAL',
      3: 'III · BLACK NOON',
    },
    phaseCallouts: { 2: 'THE DIAL BREAKS', 3: 'THE MERIDIAN RUPTURES' },
    phaseTone: { 1: 'cyan', 2: 'amber', 3: 'danger' },
    phaseAttacks: {
      1: ['measureCut', 'plumbDrop', 'noonRing', 'spearline'],
      2: ['orbitShear', 'triangulation', 'zenithDive', 'coronaCage'],
      3: ['twinMeridian', 'hourbreak', 'totality', 'blackSpearline'],
    },
    openingOrders: {
      1: ['measureCut', 'plumbDrop', 'noonRing', 'spearline'],
      2: ['orbitShear', 'zenithDive', 'triangulation', 'coronaCage'],
      3: ['twinMeridian', 'totality', 'hourbreak', 'blackSpearline'],
    },
    accent: 0xff5ca8,
    phaseAccent: [0x62e7f0, 0xffa643, 0xba72ff],
    arenaRadius: 18.2,
    playerStart: [0, 0, 8.5],
    bossStart: [0, 0, -2.5],
    poise: [0, 105, 125, 150],
  }),
  encounter({
    id: 'lacrima',
    index: 1,
    area: 'THE MIRROR TIDE',
    arrival: 'THE MIRROR TIDE // DROWNED BASILICA',
    bossName: 'LACRIMA',
    bossTitle: 'THE GLASS WIDOW',
    strategy: 'mirror',
    phasePools: { 1: 1350, 2: 1650, 3: 1950 },
    phaseNames: {
      1: 'I · STILL WATER LIES',
      2: 'II · EVERY FACE BREAKS',
      3: 'III · A SEA OF KNIVES',
    },
    phaseCallouts: { 2: 'THE BASILICA FLOODS', 3: 'THE MIRROR TIDE RISES' },
    phaseTone: { 1: 'cyan', 2: 'amber', 3: 'danger' },
    phaseAttacks: {
      1: ['widowGaze', 'prismScissor', 'glassTide'],
      2: ['widowGazeII', 'crystalRain', 'mirrorCross'],
      3: ['widowGazeIII', 'kaleidoscope', 'shatterdance'],
    },
    openingOrders: {
      1: ['widowGaze', 'prismScissor', 'glassTide'],
      2: ['widowGazeII', 'crystalRain', 'mirrorCross'],
      3: ['widowGazeIII', 'kaleidoscope', 'shatterdance'],
    },
    mechanicTargets: [3, 3, 4],
    mechanicLabel: 'PRISM ANCHORS',
    accent: 0x67f5ff,
    phaseAccent: [0x67f5ff, 0xff8de2, 0xb68cff],
    arenaRadius: 16.6,
    playerStart: [0, 0, 7.8],
    bossStart: [0, 0, -3.1],
    poise: [0, 92, 112, 132],
  }),
  encounter({
    id: 'cathedra',
    index: 2,
    area: 'THE BLACK ORBIT',
    arrival: 'THE BLACK ORBIT // LAST ENGINE',
    bossName: 'CATHEDRA-9',
    bossTitle: 'THE STAR-EATER',
    strategy: 'tether',
    incomingDamageScale: .82,
    phasePools: { 1: 1450, 2: 1750, 3: 2150 },
    phaseNames: {
      1: 'I · MASS WITHOUT MERCY',
      2: 'II · THE ENGINE STARVES',
      3: 'III · EAT THE SUN',
    },
    phaseCallouts: { 2: 'THE ORBIT BUCKLES', 3: 'THE LAST ENGINE OPENS' },
    phaseTone: { 1: 'cyan', 2: 'amber', 3: 'danger' },
    phaseAttacks: {
      1: ['singularitySeed', 'orbitalRake', 'starfall'],
      2: ['doubleWell', 'eventHorizon', 'crownSweep'],
      3: ['blackMass', 'deadStarChoir', 'aphelion'],
    },
    openingOrders: {
      1: ['singularitySeed', 'orbitalRake', 'starfall'],
      2: ['doubleWell', 'eventHorizon', 'crownSweep'],
      3: ['blackMass', 'deadStarChoir', 'aphelion'],
    },
    exposureAttacks: ['crownCrash', 'voidClaw'],
    mechanicTargets: [3, 4, 5],
    mechanicLabel: 'CROWN TETHERS',
    accent: 0xffc95d,
    phaseAccent: [0xffcf6b, 0xff754f, 0xa26bff],
    arenaRadius: 17.4,
    playerStart: [0, 0, 8.2],
    bossStart: [0, 4.8, -9.8],
    flightRadius: 9.8,
    flightHeight: 4.8,
    exposureDuration: [0, 10.5, 9.5, 8.7],
    poise: [0, 118, 138, 158],
  }),
]);

export const CAMPAIGN_ATTACKS = deepFreeze({
  measureCut: {
    encounter: 'vespera', phase: 1, anim: 'slash', duration: 1.72, telegraph: .46, cue: 'cut', punish: .39, recoveryStart: 1.33,
    events: [
      { t: .49, kind: 'arc', range: 5.0, arc: 2.05, damage: 10, parryable: true, knock: 2.4 },
      { t: .87, kind: 'arc', range: 5.15, arc: 2.25, damage: 11, parryable: true, knock: 2.7 },
      { t: 1.23, kind: 'line', range: 7.3, width: 1.25, damage: 14, parryable: true, knock: 4.0 },
    ],
  },
  plumbDrop: {
    encounter: 'vespera', phase: 1, anim: 'slam', duration: 1.82, telegraph: .86, cue: 'dive', punish: .76, recoveryStart: 1.06,
    events: [{ t: .91, kind: 'aimAoe', radius: 3.25, damage: 18, parryable: true, knock: 4.5 }],
  },
  noonRing: {
    encounter: 'vespera', phase: 1, anim: 'sweep', duration: 1.80, telegraph: .90, cue: 'ring', punish: .69, recoveryStart: 1.11,
    events: [{ t: .96, kind: 'lowRing', inner: 1.7, outer: 12, damage: 13, parryable: false, jumpSafe: true, knock: 3.3 }],
  },
  spearline: {
    encounter: 'vespera', phase: 1, anim: 'thrust', duration: 1.86, telegraph: 1.02, cue: 'thrust', punish: .66, recoveryStart: 1.20,
    events: [{ t: 1.08, kind: 'aimLine', range: 21, width: 1.05, damage: 16, parryable: true, knock: 5.2 }],
  },
  orbitShear: {
    encounter: 'vespera', phase: 2, anim: 'sweep', duration: 1.98, telegraph: .68, cue: 'ring', punish: .63, recoveryStart: 1.35,
    events: [
      { t: .72, kind: 'lowRing', inner: 1.6, outer: 13.5, damage: 12, parryable: false, jumpSafe: true, knock: 2.8 },
      { t: 1.22, kind: 'aimLine', range: 20, width: 1.2, damage: 15, parryable: true, knock: 4.4 },
    ],
  },
  triangulation: {
    encounter: 'vespera', phase: 2, anim: 'cast', duration: 2.40, telegraph: .78, cue: 'cast', punish: .54, recoveryStart: 1.86,
    events: [
      { t: .83, kind: 'lane', angleOffset: 0, width: .95, damage: 11, parryable: false, knock: 2.5 },
      { t: 1.28, kind: 'lane', angleOffset: Math.PI / 3, width: .95, damage: 11, parryable: false, knock: 2.5 },
      { t: 1.73, kind: 'lane', angleOffset: -Math.PI / 3, width: .95, damage: 13, parryable: false, knock: 3.2 },
    ],
  },
  zenithDive: {
    encounter: 'vespera', phase: 2, anim: 'dive', duration: 2.24, telegraph: .92, cue: 'dive', punish: .80, recoveryStart: 1.44,
    events: [
      { t: 1.00, kind: 'aimAoe', radius: 3.4, damage: 18, parryable: true, knock: 5.3 },
      { t: 1.31, kind: 'lowRing', inner: 1.0, outer: 11.5, damage: 12, parryable: false, jumpSafe: true, knock: 3.6 },
    ],
  },
  coronaCage: {
    encounter: 'vespera', phase: 2, anim: 'cast', duration: 2.36, telegraph: .82, cue: 'cast', punish: .59, recoveryStart: 1.77,
    events: [
      { t: .92, kind: 'outer', safeRadius: 12.5, damage: 8, parryable: false, knock: -2.5 },
      { t: 1.28, kind: 'outer', safeRadius: 9.8, damage: 9, parryable: false, knock: -3.0 },
      { t: 1.64, kind: 'outer', safeRadius: 7.2, damage: 11, parryable: false, knock: -3.5 },
    ],
  },
  twinMeridian: {
    encounter: 'vespera', phase: 3, anim: 'cast', duration: 3.28, telegraph: .96, cue: 'cast', punish: 1.08, recoveryStart: 2.20,
    events: [
      { t: 1.02, kind: 'missile', side: -1, speed: 6.2, turn: 2.8, damage: 13, reflectable: true, parryable: false },
      { t: 1.52, kind: 'missile', side: 1, speed: 6.5, turn: 3.0, damage: 13, reflectable: true, parryable: false },
      { t: 2.02, kind: 'missile', side: -1, speed: 6.8, turn: 3.1, damage: 15, reflectable: true, parryable: false },
    ],
  },
  hourbreak: {
    encounter: 'vespera', phase: 3, anim: 'cast', duration: 3.52, telegraph: 1.02, cue: 'cast', punish: 1.19, recoveryStart: 2.33,
    events: [
      { t: 1.18, kind: 'sectors', dangerParity: 0, damage: 14, parryable: false, knock: 3.8 },
      { t: 1.62, kind: 'missile', side: 1, speed: 6.6, turn: 3.1, damage: 14, reflectable: true, parryable: false },
      { t: 2.16, kind: 'missile', side: -1, speed: 7.0, turn: 3.2, damage: 16, reflectable: true, parryable: false },
    ],
  },
  totality: {
    encounter: 'vespera', phase: 3, anim: 'cast', duration: 4.34, telegraph: 1.12, cue: 'dive', punish: 1.34, recoveryStart: 3.00,
    events: [
      { t: 1.22, kind: 'laneCross', width: .72, damage: 13, parryable: false, knock: 3.2 },
      { t: 1.62, kind: 'missile', side: -1, speed: 6.8, turn: 3.1, damage: 14, reflectable: true, parryable: false },
      { t: 2.02, kind: 'missile', side: 1, speed: 7.0, turn: 3.2, damage: 14, reflectable: true, parryable: false },
      { t: 2.42, kind: 'missile', side: -1, speed: 7.2, turn: 3.25, damage: 16, reflectable: true, parryable: false },
      { t: 2.82, kind: 'missile', side: 1, speed: 7.4, turn: 3.35, damage: 16, reflectable: true, parryable: false },
    ],
  },
  blackSpearline: {
    encounter: 'vespera', phase: 3, anim: 'thrust', duration: 3.20, telegraph: 1.06, cue: 'thrust', punish: .87, recoveryStart: 2.33,
    events: [
      { t: 1.18, kind: 'aimLine', range: 30, width: .88, damage: 17, parryable: true, knock: 5.1 },
      { t: 1.68, kind: 'missile', side: -1, speed: 7.0, turn: 3.25, damage: 15, reflectable: true, parryable: false },
      { t: 2.16, kind: 'missile', side: 1, speed: 7.0, turn: 3.25, damage: 15, reflectable: true, parryable: false },
    ],
  },

  widowGaze: {
    encounter: 'lacrima', phase: 1, anim: 'gaze', duration: 2.18, telegraph: .92, cue: 'cast', punish: .72, recoveryStart: 1.46,
    events: [{ t: 1.02, kind: 'mirrorBeam', range: 28, width: 1.25, damage: 18, parryable: false, knock: 5.5 }],
  },
  prismScissor: {
    encounter: 'lacrima', phase: 1, anim: 'scissor', duration: 1.92, telegraph: .55, cue: 'cut', punish: .52, recoveryStart: 1.36,
    events: [
      { t: .62, kind: 'arc', range: 5.6, arc: 1.8, damage: 11, parryable: true, knock: 2.8 },
      { t: 1.04, kind: 'shadowArc', range: 6.0, arc: 2.25, damage: 14, parryable: true, knock: 3.4 },
    ],
  },
  glassTide: {
    encounter: 'lacrima', phase: 1, anim: 'tide', duration: 2.08, telegraph: .88, cue: 'ring', punish: .66, recoveryStart: 1.42,
    events: [
      { t: .98, kind: 'lowRing', inner: 1.4, outer: 13.8, damage: 14, parryable: false, jumpSafe: true, knock: 3.2 },
      { t: 1.36, kind: 'aimAoe', radius: 2.7, damage: 11, parryable: false, knock: 2.2 },
    ],
  },
  widowGazeII: {
    encounter: 'lacrima', phase: 2, anim: 'gaze', duration: 2.54, telegraph: .82, cue: 'cast', punish: .75, recoveryStart: 1.79,
    events: [
      { t: .94, kind: 'mirrorBeam', range: 30, width: 1.1, damage: 18, parryable: false, knock: 5.8 },
      { t: 1.48, kind: 'mirrorBeam', range: 30, width: 1.0, damage: 19, parryable: false, knock: 5.8, retarget: true },
    ],
  },
  crystalRain: {
    encounter: 'lacrima', phase: 2, anim: 'rain', duration: 2.62, telegraph: .70, cue: 'cast', punish: .66, recoveryStart: 1.96,
    events: [
      { t: .82, kind: 'aimAoe', radius: 2.35, offsetX: -2.8, damage: 11, parryable: false, knock: 2.4 },
      { t: 1.26, kind: 'aimAoe', radius: 2.6, offsetX: 2.8, damage: 12, parryable: false, knock: 2.7 },
      { t: 1.70, kind: 'aimAoe', radius: 3.0, damage: 15, parryable: true, knock: 4.2 },
    ],
  },
  mirrorCross: {
    encounter: 'lacrima', phase: 2, anim: 'scissor', duration: 2.42, telegraph: .72, cue: 'cut', punish: .63, recoveryStart: 1.79,
    events: [
      { t: .83, kind: 'laneCross', width: .8, damage: 12, parryable: false, knock: 3.0 },
      { t: 1.34, kind: 'arc', range: 6.3, arc: 2.7, damage: 17, parryable: true, knock: 4.2 },
    ],
  },
  widowGazeIII: {
    encounter: 'lacrima', phase: 3, anim: 'gaze', duration: 2.72, telegraph: .70, cue: 'cast', punish: .72, recoveryStart: 2.0,
    events: [
      { t: .82, kind: 'mirrorBeam', range: 32, width: .95, damage: 18, parryable: false, knock: 6.0 },
      { t: 1.26, kind: 'mirrorBeam', range: 32, width: .9, damage: 19, parryable: false, knock: 6.1, retarget: true },
      { t: 1.70, kind: 'mirrorBeam', range: 32, width: .84, damage: 21, parryable: false, knock: 6.3, retarget: true },
    ],
  },
  kaleidoscope: {
    encounter: 'lacrima', phase: 3, anim: 'tide', duration: 2.88, telegraph: .72, cue: 'ring', punish: .72, recoveryStart: 2.16,
    events: [
      { t: .86, kind: 'sectors', dangerParity: 0, damage: 13, parryable: false, knock: 3.0 },
      { t: 1.34, kind: 'sectors', dangerParity: 1, damage: 14, parryable: false, knock: 3.2 },
      { t: 1.82, kind: 'lowRing', inner: 1.3, outer: 14.8, damage: 16, parryable: false, jumpSafe: true, knock: 4.0 },
    ],
  },
  shatterdance: {
    encounter: 'lacrima', phase: 3, anim: 'scissor', duration: 2.64, telegraph: .54, cue: 'cut', punish: .64, recoveryStart: 2.0,
    events: [
      { t: .62, kind: 'arc', range: 6.1, arc: 1.75, damage: 12, parryable: true, knock: 2.5 },
      { t: 1.00, kind: 'shadowArc', range: 6.5, arc: 2.1, damage: 14, parryable: true, knock: 3.0 },
      { t: 1.38, kind: 'arc', range: 6.8, arc: 2.5, damage: 16, parryable: true, knock: 3.7 },
      { t: 1.78, kind: 'aimLine', range: 24, width: .82, damage: 19, parryable: false, knock: 5.2 },
    ],
  },

  singularitySeed: {
    encounter: 'cathedra', phase: 1, anim: 'gravity', duration: 2.44, telegraph: .82, cue: 'cast', punish: .58, recoveryStart: 1.86,
    events: [{ t: .94, kind: 'gravityWell', radius: 4.7, duration: 2.9, pull: 10.5, damage: 18, offsetX: 0, offsetZ: 0 }],
  },
  orbitalRake: {
    encounter: 'cathedra', phase: 1, anim: 'rake', duration: 2.20, telegraph: .68, cue: 'thrust', punish: .56, recoveryStart: 1.64,
    events: [
      { t: .78, kind: 'lane', angleOffset: -.48, width: .9, damage: 12, parryable: false, knock: 3.0 },
      { t: 1.18, kind: 'lane', angleOffset: .48, width: .9, damage: 13, parryable: false, knock: 3.2 },
    ],
  },
  starfall: {
    encounter: 'cathedra', phase: 1, anim: 'bombard', duration: 2.52, telegraph: .70, cue: 'dive', punish: .60, recoveryStart: 1.92,
    events: [
      { t: .82, kind: 'aimAoe', radius: 2.65, offsetX: -2.5, damage: 12, parryable: false, knock: 3.1 },
      { t: 1.28, kind: 'aimAoe', radius: 2.65, offsetX: 2.5, damage: 12, parryable: false, knock: 3.1 },
      { t: 1.72, kind: 'aimAoe', radius: 3.0, damage: 15, parryable: true, knock: 4.1 },
    ],
  },
  doubleWell: {
    encounter: 'cathedra', phase: 2, anim: 'gravity', duration: 3.02, telegraph: .72, cue: 'cast', punish: .62, recoveryStart: 2.40,
    events: [
      { t: .84, kind: 'gravityWell', radius: 4.4, duration: 2.7, pull: 11.5, damage: 18, offsetX: -4.2, offsetZ: 1.2 },
      { t: 1.38, kind: 'gravityWell', radius: 4.4, duration: 2.7, pull: 11.5, damage: 18, offsetX: 4.2, offsetZ: -1.2 },
    ],
  },
  eventHorizon: {
    encounter: 'cathedra', phase: 2, anim: 'gravity', duration: 2.70, telegraph: .78, cue: 'ring', punish: .62, recoveryStart: 2.08,
    events: [
      { t: .90, kind: 'outer', safeRadius: 9.2, damage: 11, parryable: false, knock: -4.0 },
      { t: 1.40, kind: 'lowRing', inner: 1.2, outer: 12.8, damage: 15, parryable: false, jumpSafe: true, knock: 3.8 },
      { t: 1.82, kind: 'aimAoe', radius: 2.8, damage: 15, parryable: true, knock: 4.2 },
    ],
  },
  crownSweep: {
    encounter: 'cathedra', phase: 2, anim: 'rake', duration: 2.56, telegraph: .60, cue: 'cut', punish: .60, recoveryStart: 1.96,
    events: [
      { t: .72, kind: 'laneCross', width: .78, damage: 13, parryable: false, knock: 3.2 },
      { t: 1.22, kind: 'aimLine', range: 28, width: .92, damage: 16, parryable: true, knock: 4.8 },
      { t: 1.64, kind: 'aimAoe', radius: 3.1, damage: 17, parryable: false, knock: 4.3 },
    ],
  },
  blackMass: {
    encounter: 'cathedra', phase: 3, anim: 'gravity', duration: 3.38, telegraph: .70, cue: 'cast', punish: .66, recoveryStart: 2.72,
    events: [
      { t: .84, kind: 'gravityWell', radius: 5.4, duration: 3.25, pull: 13.5, damage: 22 },
      { t: 1.46, kind: 'outer', safeRadius: 8.0, damage: 12, parryable: false, knock: -4.3 },
      { t: 2.02, kind: 'lowRing', inner: 1.0, outer: 14.5, damage: 18, parryable: false, jumpSafe: true, knock: 4.4 },
    ],
  },
  deadStarChoir: {
    encounter: 'cathedra', phase: 3, anim: 'bombard', duration: 3.24, telegraph: .66, cue: 'dive', punish: .64, recoveryStart: 2.60,
    events: [
      { t: .78, kind: 'sectors', dangerParity: 0, damage: 13, parryable: false, knock: 3.0 },
      { t: 1.26, kind: 'sectors', dangerParity: 1, damage: 14, parryable: false, knock: 3.2 },
      { t: 1.72, kind: 'aimAoe', radius: 3.0, offsetX: -3.4, damage: 15, parryable: false, knock: 3.8 },
      { t: 2.14, kind: 'aimAoe', radius: 3.0, offsetX: 3.4, damage: 17, parryable: true, knock: 4.4 },
    ],
  },
  aphelion: {
    encounter: 'cathedra', phase: 3, anim: 'rake', duration: 3.02, telegraph: .58, cue: 'thrust', punish: .64, recoveryStart: 2.38,
    events: [
      { t: .70, kind: 'laneCross', width: .68, damage: 14, parryable: false, knock: 3.2 },
      { t: 1.12, kind: 'aimLine', range: 32, width: .78, damage: 17, parryable: true, knock: 4.9 },
      { t: 1.58, kind: 'aimAoe', radius: 2.7, damage: 16, parryable: false, knock: 4.0 },
      { t: 2.02, kind: 'lowRing', inner: 1.2, outer: 14.8, damage: 19, parryable: false, jumpSafe: true, knock: 4.6 },
    ],
  },
  crownCrash: {
    encounter: 'cathedra', phase: 1, anim: 'crash', duration: 1.96, telegraph: .58, cue: 'dive', punish: .82, recoveryStart: 1.14,
    events: [
      { t: .68, kind: 'aimAoe', radius: 3.4, damage: 17, parryable: true, knock: 5.0 },
      { t: 1.02, kind: 'lowRing', inner: 1.0, outer: 10.8, damage: 12, parryable: false, jumpSafe: true, knock: 3.2 },
    ],
  },
  voidClaw: {
    encounter: 'cathedra', phase: 1, anim: 'claw', duration: 1.72, telegraph: .44, cue: 'cut', punish: .74, recoveryStart: .98,
    events: [
      { t: .52, kind: 'arc', range: 6.0, arc: 2.0, damage: 13, parryable: true, knock: 2.8 },
      { t: .84, kind: 'shadowArc', range: 6.3, arc: 2.45, damage: 15, parryable: true, knock: 3.4 },
    ],
  },
});

export function encounterByIndex(index = 0) {
  return ENCOUNTERS[Math.max(0, Math.min(ENCOUNTERS.length - 1, Math.round(index)))] || ENCOUNTERS[0];
}

export function phaseBounds(definition, phase) {
  const safe = Math.max(1, Math.min(definition.phaseCount, Math.round(phase || 1)));
  return {
    floor: definition.health.phaseFloors[safe],
    ceiling: definition.health.phaseCeilings[safe],
    max: definition.phasePools[safe],
  };
}

export function phaseForHealth(definition, hp) {
  for (let phase = definition.phaseCount; phase >= 1; phase -= 1) {
    if (hp <= definition.health.phaseCeilings[phase]) return phase;
  }
  return 1;
}
