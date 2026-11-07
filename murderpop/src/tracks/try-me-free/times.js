// The song's map for this fight, in song seconds (from data/beats/try-me-free.json and the vocal timings).
// Everything the set and the boss are at any moment is derived from these lists, so a rewind (or ?at=) can put
// the whole commercial back exactly as it was.

// the record's worst lines: the commercial cuts out, nothing to fight, she's back in her box
export const DARKS = [[93.47, 103.52], [113.56, 126.03], [138.49, 152.34], [188.48, 211.55], [233.39, 247.67], [282.92, 289.54]];
export const inDark = (t) => DARKS.some(([a, b]) => t >= a && t < b);
export const darkStart = (t) => { let s = -1; for (const [a, b] of DARKS) if (t >= b) s = b; return s; };   // the end of the last dark before t

// lighting, from each time on. Baked states: offair commercial court funeral suburb tile sunset.
// bank1..3: the opening's banks coming on; livestream: the set at 40%; quiet/quiet2: the current state at 50%.
export const LIGHTS = [
  [0, 'offair'], [1.05, 'bank1'], [1.38, 'bank2'], [1.73, 'bank3'], [2.07, 'commercial'],
  [13.48, 'court'], [16.61, 'funeral'], [37.38, 'livestream'], [53.64, 'commercial'], [58.16, 'suburb'], [59.54, 'quiet'],
  [63.69, 'suburb'], [64.04, 'funeral'], [70.62, 'commercial'], [93.47, 'offair'], [103.52, 'commercial'], [113.56, 'offair'],
  [126.03, 'commercial'], [138.49, 'offair'], [152.34, 'suburb'], [155.46, 'commercial'], [175.24, 'court'], [188.48, 'offair'],
  [211.55, 'tile'], [223.50, 'quiet2'], [229.16, 'funeral'], [233.39, 'offair'], [247.67, 'court'], [253.42, 'funeral'],
  [259.17, 'commercial'], [268.80, 'court'], [271.90, 'sunset'], [282.92, 'offair'], [289.54, 'finale'],
];
export const lightAt = (t) => { let s = LIGHTS[0]; for (const L of LIGHTS) if (L[0] <= t + 1e-4) s = L; return s; };

// THE CUT: on the beat she appears on her mark, already posed and dressed. [time, costume, x, z, opts]
export const CUTS = [
  [6.57, 'self', 0, -5.6, { entrance: true, face: 'grin', clip: 'Spell_Simple_Idle_Loop' }],
  [13.48, 'defendant', 0, -5.3, { face: 'smug', idle: 'Idle_FoldArms_Loop' }],
  [16.61, 'mourner', 4, -3, { face: 'smug', idle: 'Idle_TalkingPhone_Loop' }],
  [33.22, 'mourner', 0, -4.6, { face: 'smug', idle: 'Idle_TalkingPhone_Loop' }],
  [37.38, 'self', 0, -3.6, { face: 'grin', idle: 'Idle_TalkingPhone_Loop', phone: true }],
  [58.16, 'ex', 5, -4, { face: 'laugh', idle: 'Idle_Talking_Loop' }],
  [64.04, 'mourner', 0, -5.3, { face: 'smug', idle: 'Idle_TalkingPhone_Loop' }],
  [70.62, 'self', 0, -2, { face: 'grin' }],
  [85.51, 'self', -8.4, -3.5, { face: 'grin', idle: 'Spell_Simple_Idle_Loop' }],
  [103.52, 'self', 0, -2.5, { face: 'grin', clip: 'Spell_Simple_Idle_Loop', mini: true, nomark: true }],
  [126.03, 'self', 0, -3, { face: 'wink', nomark: true }],
  [152.34, 'ex', 0, -3, { face: 'laugh', nomark: true }],
  [155.46, 'self', 0, -3.6, { face: 'grin' }],
  [163.43, 'self', 0, -2.5, { face: 'grin' }],
  [175.24, 'defendant', 0, -5.3, { face: 'smug', idle: 'Idle_FoldArms_Loop' }],
  [180.82, 'defendant', 0, -5.3, { face: 'smug', idle: 'Idle_FoldArms_Loop' }],
  [211.55, 'self', 0, -3, { face: 'grin', nomark: true }],
  [223.50, 'ex', 6.5, 3.4, { face: 'laugh', sit: true }],
  [229.16, 'mourner', -5, -3.4, { face: 'smug', idle: 'Idle_TalkingPhone_Loop' }],
  [247.67, 'defendant', 0, -5.3, { face: 'smug', idle: 'Idle_FoldArms_Loop', nomark: true }],
  [253.42, 'mourner', 4, -3, { face: 'smug', idle: 'Idle_TalkingPhone_Loop' }],
  [259.17, 'self', 0, -1.2, { face: 'grin' }],
  [268.80, 'defendant', 0, -5.3, { face: 'smug', idle: 'Idle_FoldArms_Loop' }],
  [271.90, 'self', 0, -3, { face: 'grin', nomark: true }],
  [273.22, 'defendant', 0, -5.3, { face: 'smug', idle: 'Idle_FoldArms_Loop' }],
  [275.96, 'mourner', 5, -3.5, { face: 'smug', idle: 'Idle_TalkingPhone_Loop' }],
  [278.03, 'ex', -3, -3, { face: 'laugh' }],
  [280.11, 'self', 0, -2.5, { face: 'grin' }],
];
export const cutAt = (t) => { let c = null; for (const x of CUTS) if (x[0] <= t + 1e-4) c = x; return c; };

// set pieces that rise from the trapdoors: [name, up, gone] (they rise in 0.8 s on `up`, sink in 0.6 s at `gone`;
// at a dark they go with the lights)
export const T1 = { x: 0, z: -4.2 }, T2 = { x: -5, z: -2 }, T3 = { x: 5, z: -2 };
export const PIECES = {
  bench: [[12.46, 16.26], [174.89, 188.48], [246.8, 282.92]],
  lectern: [[63.69, 70.27]],
  casket: [[31.47, 37.03]],
  bar: [[32.18, 37.03]],
  mug: [[58.16, 64.04]],
  pews: [[175.24, 188.48]],
  guestbook: [[228.81, 233.39]],
};
export const DARK_ENDS = new Set(DARKS.map((d) => d[0]));

// PRETTY (strikes bounce off her red lacquer) and GUILTY (open) while she's the Defendant: the guilty spans
export const GUILTY = [[14.14, 15.57], [176.63, 178.03], [182.56, 183.96], [187.80, 188.48], [248.76, 250.18], [271.21, 271.90], [274.61, 275.96]];

// the song's own moments the set reacts to
export const PULL = 211.55;          // the tablecloth comes off
export const FIRE = { strike: 61.27, drop: 61.62, ignite: 63.69, speed: 9.5, scorchUntil: 93.47 };
export const PUDDLE = { x: 5, z: 0.4, r: 1.2, t0: 59.19, t1: 70.27 };
export const FREEZE = [164.81, 166.20];
export const BRIDGE = [223.50, 233.39];
