export const BUILD_ID = 'false-sun-1.0.0';
export const FIXED_DT = 1 / 60;
export const MAX_CATCHUP_STEPS = 6;
export const SAVE_KEY = 'false-sun-save-v1';
export const SAVE_VERSION = 1;

export const PLAYER = Object.freeze({
  radius: 18,
  maxHp: 6,
  acceleration: 2350,
  friction: 9.5,
  speed: 345,
  shadeSpeed: 430,
  dashSpeed: 1040,
  dashDuration: 0.145,
  dashInvulnerability: 0.22,
  dashCharges: 2,
  dashRecharge: 1.5,
  sunOrbit: 142,
  sunPinRange: 610,
  beamRange: 690,
  beamWidth: 15,
  beamDamage: 8,
  beamCadence: 5,
  heatGain: 0.68,
  heatCoolLight: 0.26,
  heatCoolShade: 0.78,
});

export const LIMITS = Object.freeze({
  enemies: 80,
  bullets: 260,
  particles: 520,
  trails: 48,
  shadowCasters: 96,
});

export const COLORS = Object.freeze({
  cream: '#fff4d6',
  gold: '#ffd86a',
  cyan: '#54e8ff',
  cyanWhite: '#d9fbff',
  violet: '#8e67ff',
  magenta: '#f06ccf',
  ink: '#09091a',
  deep: '#10102b',
  danger: '#efe8ff',
});
