export const BUILD_ID = 'falling-open-1.0.0';
export const WIDTH = 900;
export const HEIGHT = 1400;
export const FIXED_STEP = 1 / 120;

export const PALETTE = Object.freeze({
  ink: '#080b14',
  deep: '#10192b',
  storm: '#263a58',
  rain: '#d9f1f3',
  paper: '#f5eddc',
  gold: '#ffd27b',
  coral: '#ff6e67',
  bruise: '#7f78a8',
  repaired: '#f6bd78'
});

export const PLAYER = Object.freeze({
  bodyRadius: 18,
  canopyX: 108,
  canopyY: 42,
  canopyOffset: 58,
  maxCaught: 7,
  openRate: 12,
  closeRate: 16,
  closedFall: 720,
  openFall: 188,
  closedSteer: 285,
  openSteer: 470,
  closedAccel: 1060,
  openAccel: 1780,
  invulnerability: 1.15,
  panels: 4
});

export const ACTS = Object.freeze({
  1: Object.freeze({
    id: 'first-rain',
    plate: 'FIRST RAIN',
    hp: 8,
    sourceGap: 690,
    fireEvery: 0.42,
    gateBelow: 740,
    baseWind: 0,
    sourceScale: 0.78
  }),
  2: Object.freeze({
    id: 'crosswind',
    plate: 'CROSSWIND',
    hp: 8,
    sourceGap: 760,
    fireEvery: 0.44,
    gateBelow: 780,
    baseWind: 215,
    sourceScale: 0.94
  }),
  3: Object.freeze({
    id: 'closed-sky',
    plate: 'THE CLOSED SKY',
    hp: 40,
    sourceGap: 620,
    fireEvery: 0.34,
    gateBelow: 780,
    baseWind: 285,
    sourceScale: 1.32
  })
});
