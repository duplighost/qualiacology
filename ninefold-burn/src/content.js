export const BUILD_ID = 'ninefold-burn-1.0.0';
export const GAME_TITLE = 'NINEFOLD BURN';

export const CONTROL_GRAMMAR = Object.freeze({
  steer: Object.freeze(['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'GamepadAxis0', 'TouchSteer']),
  surge: Object.freeze(['KeyW', 'ArrowUp', 'MouseLeft', 'GamepadA', 'TouchSurge']),
  slip: Object.freeze(['Space', 'ShiftLeft', 'ShiftRight', 'MouseRight', 'GamepadX', 'TouchSlip']),
  rule: 'The vehicle always accelerates. Steer stays steer; SURGE becomes boost/fire; SLIP becomes drift/dodge.',
});

const P = (index, id, name, epithet, colors, options) => Object.freeze({
  type: 'planet',
  index,
  id: `planet-${index}-${id}`,
  shortId: `planet-${index}`,
  name,
  epithet,
  ...colors,
  ...options,
});

const S = (index, id, name, epithet, colors, options) => Object.freeze({
  type: 'space',
  index,
  id: `space-${index}-${id}`,
  shortId: `space-${index}`,
  name,
  epithet,
  ...colors,
  ...options,
});

export const PLANETS = Object.freeze([
  P(1, 'scoria', 'SCORIA RUN', 'THE FORGE IS BREATHING', {
    sky: 0x09070b, fog: 0x2a0905, road: 0x19171d, shoulder: 0x481307,
    ground: 0x120a08, accent: 0xff4b16, secondary: 0xffc15a, sun: 0xff7a28,
  }, {
    length: 8200, width: 15.5, baseSpeed: 330, maxSpeed: 650,
    curve: [5.5, 2.2, 0.0026, 0.0061], hills: [2.8, 0.0018], bank: 0.16,
    decor: 'basalt-forge', atmosphere: 'embers',
    gimmick: { id: 'thermal-vent-slings', label: 'THERMAL SLINGS', spacing: 430, reward: 0.16 },
  }),
  P(2, 'thunderglass', 'THUNDERGLASS', 'OCEAN OF STATIC', {
    sky: 0x07121f, fog: 0x0a2940, road: 0x102a35, shoulder: 0x11586a,
    ground: 0x061521, accent: 0x66f4ff, secondary: 0xf5fbff, sun: 0xa7eeff,
  }, {
    length: 5200, width: 16.5, baseSpeed: 344, maxSpeed: 675,
    curve: [7.2, 3.8, 0.0022, 0.0054], hills: [1.8, 0.0025], bank: 0.2,
    decor: 'storm-ocean', atmosphere: 'rain',
    gimmick: { id: 'lightning-rails', label: 'RIDE THE STRIKE', spacing: 390, reward: 0.15 },
  }),
  P(3, 'verdant-maw', 'VERDANT MAW', 'THE HIGHWAY IS ALIVE', {
    sky: 0x06130f, fog: 0x0c2f22, road: 0x14241c, shoulder: 0x245b3b,
    ground: 0x061a10, accent: 0x89ff72, secondary: 0xffe67a, sun: 0xb7ff9b,
  }, {
    length: 5350, width: 15, baseSpeed: 354, maxSpeed: 695,
    curve: [9.5, 4.5, 0.0019, 0.0047], hills: [4.2, 0.0021], bank: 0.24,
    decor: 'living-jungle', atmosphere: 'pollen',
    gimmick: { id: 'vine-gates', label: 'OUTRUN THE VINES', spacing: 365, reward: 0.17 },
  }),
  P(4, 'pale-zero', 'PALE ZERO', 'DRIFT NEVER ENDS', {
    sky: 0x111826, fog: 0x29465c, road: 0x263847, shoulder: 0x6aa7c0,
    ground: 0x102333, accent: 0xbef5ff, secondary: 0xe8c8ff, sun: 0xd9f8ff,
  }, {
    length: 5480, width: 17.5, baseSpeed: 364, maxSpeed: 720,
    curve: [12.5, 5.8, 0.0017, 0.0039], hills: [3.4, 0.0016], bank: 0.31,
    decor: 'crystal-glacier', atmosphere: 'ice-dust',
    gimmick: { id: 'friction-bloom', label: 'CHAIN THE WHITE DRIFT', spacing: 470, reward: 0.2 },
  }),
  P(5, 'neon-citadel', 'NEON CITADEL', 'THE CITY MOVES ASIDE', {
    sky: 0x050512, fog: 0x130f34, road: 0x101121, shoulder: 0x30165c,
    ground: 0x090814, accent: 0xff3dd1, secondary: 0x5dfff0, sun: 0xff7be9,
  }, {
    length: 5600, width: 16, baseSpeed: 376, maxSpeed: 745,
    curve: [8.7, 6.7, 0.0028, 0.0066], hills: [5.5, 0.0028], bank: 0.27,
    decor: 'kinetic-city', atmosphere: 'neon-haze',
    gimmick: { id: 'magnetic-lane-swap', label: 'LET THE CITY THROW YOU', spacing: 340, reward: 0.16 },
  }),
  P(6, 'goliath-dunes', 'GOLIATH DUNES', 'RIDE THE WORMWAKE', {
    sky: 0x2a1005, fog: 0x6a2d0b, road: 0x362119, shoulder: 0x8e4c16,
    ground: 0x3d1b08, accent: 0xffb23d, secondary: 0xfff0b0, sun: 0xffd071,
  }, {
    length: 5800, width: 19, baseSpeed: 386, maxSpeed: 775,
    curve: [11.2, 7.2, 0.0015, 0.0042], hills: [8.8, 0.0024], bank: 0.22,
    decor: 'colossal-desert', atmosphere: 'sand',
    gimmick: { id: 'wormwake', label: 'SURF THE COLOSSUS', spacing: 520, reward: 0.21 },
  }),
  P(7, 'tidebreak', 'TIDEBREAK', 'GRAVITY HAS A SIDE', {
    sky: 0x050b18, fog: 0x111f44, road: 0x171d31, shoulder: 0x193e70,
    ground: 0x070d1d, accent: 0x5f8dff, secondary: 0xff6b8e, sun: 0x92adff,
  }, {
    length: 5950, width: 17, baseSpeed: 398, maxSpeed: 805,
    curve: [14.5, 8.5, 0.0016, 0.0037], hills: [6.2, 0.0018], bank: 0.38,
    decor: 'tidal-monoliths', atmosphere: 'gravity-motes',
    gimmick: { id: 'gravity-tides', label: 'LEAN INTO THE MOON', spacing: 410, reward: 0.18 },
  }),
  P(8, 'echo-veil', 'ECHO VEIL', 'RACE YOUR LAST SECOND', {
    sky: 0x10091b, fog: 0x2b153b, road: 0x21152e, shoulder: 0x533064,
    ground: 0x100818, accent: 0xc37bff, secondary: 0x7dfff2, sun: 0xe0b5ff,
  }, {
    length: 6100, width: 16.5, baseSpeed: 410, maxSpeed: 840,
    curve: [16.2, 9.1, 0.0013, 0.0033], hills: [5.2, 0.0015], bank: 0.34,
    decor: 'temporal-prisms', atmosphere: 'echoes',
    gimmick: { id: 'echo-gates', label: 'DODGE WHO YOU WERE', spacing: 380, reward: 0.2 },
  }),
  P(9, 'crownstar', 'CROWNSTAR', 'LIGHT THE NINTH SUN', {
    sky: 0x160803, fog: 0x4d1607, road: 0x25170f, shoulder: 0x7a2608,
    ground: 0x170805, accent: 0xffd34d, secondary: 0xffffff, sun: 0xfff0a3,
  }, {
    length: 7200, width: 18, baseSpeed: 430, maxSpeed: 940,
    curve: [18.5, 10.5, 0.0015, 0.0041], hills: [9.5, 0.002], bank: 0.42,
    decor: 'solar-crown', atmosphere: 'sunfire',
    gimmick: { id: 'solar-crown', label: 'BECOME THE FINISH LINE', spacing: 330, reward: 0.22 },
  }),
]);

export const SPACE_SECTORS = Object.freeze([
  S(1, 'shard-cathedral', 'SHARD CATHEDRAL', 'CLOSE ENOUGH TO BLEED', {
    sky: 0x01030a, fog: 0x050a17, road: 0x070a13, shoulder: 0x17233b,
    ground: 0x02030a, accent: 0xff7547, secondary: 0x7ee7ff, sun: 0xffb173,
  }, {
    length: 5400, width: 22, baseSpeed: 505, maxSpeed: 850, decor: 'asteroid-arches', atmosphere: 'starlines',
    gimmick: { id: 'asteroid-cathedral', label: 'THREAD THE SHARDS', spacing: 320, reward: 0.14 },
  }),
  S(2, 'ion-suture', 'ION SUTURE', 'LIGHTNING HOLDS THE WORLDS TOGETHER', {
    sky: 0x010817, fog: 0x03142e, road: 0x071226, shoulder: 0x0d3261,
    ground: 0x01050d, accent: 0x61f5ff, secondary: 0xd8f7ff, sun: 0x72cfff,
  }, {
    length: 3750, width: 23, baseSpeed: 522, maxSpeed: 875, decor: 'ion-filaments', atmosphere: 'charged-stars',
    gimmick: { id: 'ion-polarity', label: 'CUT THE CURRENT', spacing: 290, reward: 0.15 },
  }),
  S(3, 'comet-garden', 'COMET GARDEN', 'DRAFT THE LIVING ICE', {
    sky: 0x020b0d, fog: 0x062329, road: 0x07181b, shoulder: 0x16434b,
    ground: 0x010708, accent: 0x8bffda, secondary: 0xffe48f, sun: 0xc8fff0,
  }, {
    length: 3900, width: 25, baseSpeed: 538, maxSpeed: 905, decor: 'comet-flock', atmosphere: 'comet-seeds',
    gimmick: { id: 'comet-drafting', label: 'STEAL THE TAIL', spacing: 350, reward: 0.17 },
  }),
  S(4, 'mirror-wake', 'MIRROR WAKE', 'ONLY ONE RIVAL CASTS A SHADOW', {
    sky: 0x080611, fog: 0x191126, road: 0x120f1c, shoulder: 0x39284c,
    ground: 0x06040b, accent: 0xd8a0ff, secondary: 0x86fff8, sun: 0xf0d1ff,
  }, {
    length: 4050, width: 24, baseSpeed: 554, maxSpeed: 930, decor: 'mirror-debris', atmosphere: 'refractions',
    gimmick: { id: 'mirror-decoys', label: 'SHOOT THE SHADOW', spacing: 310, reward: 0.18 },
  }),
  S(5, 'ghost-traffic', 'GHOST TRAFFIC', 'DRAFT THE DEAD CONVOY', {
    sky: 0x03030a, fog: 0x10101d, road: 0x0e0e17, shoulder: 0x2c263d,
    ground: 0x030306, accent: 0xff4f9a, secondary: 0x9dfcff, sun: 0xff9ec6,
  }, {
    length: 4200, width: 23, baseSpeed: 570, maxSpeed: 960, decor: 'derelict-convoy', atmosphere: 'signal-dust',
    gimmick: { id: 'ghost-slipstream', label: 'WAKE THE CONVOY', spacing: 370, reward: 0.19 },
  }),
  S(6, 'dark-current', 'DARK CURRENT', 'THE VOID PULLS SIDEWAYS', {
    sky: 0x000106, fog: 0x080b18, road: 0x080b12, shoulder: 0x151d33,
    ground: 0x000103, accent: 0x6b7dff, secondary: 0xff6d75, sun: 0x9c9fff,
  }, {
    length: 4380, width: 26, baseSpeed: 588, maxSpeed: 995, decor: 'gravity-wells', atmosphere: 'lensing-stars',
    gimmick: { id: 'dark-current', label: 'DRIFT THE GRAVITY WELL', spacing: 330, reward: 0.2 },
  }),
  S(7, 'timewreck', 'TIMEWRECK', 'EVERY SHOT COMES BACK', {
    sky: 0x070314, fog: 0x19082b, road: 0x11091e, shoulder: 0x32134f,
    ground: 0x05020a, accent: 0xb15cff, secondary: 0x56ffe6, sun: 0xd4a5ff,
  }, {
    length: 4550, width: 24, baseSpeed: 608, maxSpeed: 1030, decor: 'time-fragments', atmosphere: 'afterimages',
    gimmick: { id: 'echo-volley', label: 'FIRE TWICE IN ONE SECOND', spacing: 300, reward: 0.2 },
  }),
  S(8, 'last-flare', 'THE LAST FLARE', 'OUTRUN THE LIGHT', {
    sky: 0x100201, fog: 0x3a0802, road: 0x1b0b07, shoulder: 0x621706,
    ground: 0x090100, accent: 0xffa52f, secondary: 0xffffff, sun: 0xffdd77,
  }, {
    length: 4900, width: 27, baseSpeed: 630, maxSpeed: 1100, decor: 'solar-flare', atmosphere: 'sun-streaks',
    gimmick: { id: 'flare-surfing', label: 'SURF THE LAST LIGHT', spacing: 270, reward: 0.23 },
  }),
]);

export const COURSE = Object.freeze(PLANETS.flatMap((planet, i) => (
  i < SPACE_SECTORS.length ? [planet, SPACE_SECTORS[i]] : [planet]
)));

export const RIVALS = Object.freeze([
  Object.freeze({ id: 'vanta', name: 'VANTA', epithet: 'THE KNIFE', color: 0xff356e, secondary: 0x24030e, bias: 5, racePace: 118, aggression: 0.82, laneSeed: 0.8 }),
  Object.freeze({ id: 'saint', name: 'SAINT-0', epithet: 'THE HALO', color: 0xffd451, secondary: 0x271b02, bias: 1, racePace: 93, aggression: 0.58, laneSeed: 2.7 }),
  Object.freeze({ id: 'morrow', name: 'MORROW', epithet: 'THE GHOST', color: 0x7d73ff, secondary: 0x090625, bias: -3, racePace: 78, aggression: 0.7, laneSeed: 4.6 }),
]);

export function getSegment(idOrIndex) {
  if (typeof idOrIndex === 'number') return COURSE[idOrIndex] ?? null;
  return COURSE.find((segment) => segment.id === idOrIndex || segment.shortId === idOrIndex) ?? null;
}

export function courseDistance(short = false) {
  const scale = short ? 0.075 : 1;
  return COURSE.reduce((sum, segment) => sum + segment.length * scale, 0);
}

export function segmentLength(segment, short = false) {
  return segment.length * (short ? 0.075 : 1);
}

export function hashText(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
