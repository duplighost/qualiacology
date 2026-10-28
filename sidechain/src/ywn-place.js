// Your Wife, My Number: the estate itself. Its wall and lanterns at the gate; the cypress allée;
// clipped yews, urns and marble statues on the lawns; sprinklers ticking round on the beat in
// the heat; the festoon lights and the marquees of the garden party; the canals with their jets
// leaping on the beat; and for the choruses, magnums of champagne along both sides popping on
// the beat (all of them at once on the drop), umbrellas opening on the beat in the storm.
// Also the water itself: canals and the pool, laid along the road like the road is.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { groundAt } from './trail.js';
import { clamp, smooth, hash, TAU, V, rgb, seeded, merge, paint, shade, box, cyl, sph, lathe, tube, vcMat, quat } from './ywn-lib.js';

const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const pick = (R, a) => a[Math.floor(R() * a.length)];

// the beat now (cached per frame on the scenery): index, fraction, the pulse, the section
export function beatInfo(S) {
  const T = S.tNow ?? 0;
  if (S._ywnBI && S._ywnBI.T === T) return S._ywnBI;
  const c = S.course, b = c.beatAt(T), i = Math.floor(b), sec = c.sectionAt(T);
  const bi = S._ywnBI || (S._ywnBI = {});
  bi.T = T; bi.b = b; bi.i = i; bi.f = b - i; bi.pulse = Math.exp(-(b - i) * 6); bi.sec = sec;
  bi.chorus = sec.kind === 'chorus' || sec.kind === 'final'; bi.bar = c.isBar(i);
  bi.e = c.beatEnergy[i] ?? 0.5;
  return bi;
}
// the nearest beat at or before t that falls in a chorus, or null
function chorusBeatBefore(c, t) {
  const i = Math.floor(c.beatAt(t)), tb = c.beats[i];
  const k = c.sectionAt(tb).kind;
  return (k === 'chorus' || k === 'final') ? tb : null;
}

// ---------- geometry ----------
export const PG = {
  cypress(v) {
    const R = seeded(11 + v * 17), parts = [paint(cyl(0.35, 0.5, 3, 6, 0, 1.5, 0), rgb(0x3a2a1e))];
    const h = 20, n = 8;
    for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, y = 2.4 + u * (h - 3.6), r = 2.5 * Math.sin(Math.PI * (0.13 + 0.8 * u)) + 0.35; parts.push(paint(sph(1, r, h / n * 0.78, r, (R() - 0.5) * 0.4, y, (R() - 0.5) * 0.4, 8, 6), rgb(v ? 0x22442a : 0x1e3e26), 0.8 + 0.35 * u)); }
    parts.push(paint(new THREE.ConeGeometry(0.8, 2.6, 7).translate(0, h + 0.6, 0), rgb(0x24482c), 1.1));
    return merge(parts);
  },
  // a clipped yew: a tall cone, a ball on a stem, or three balls stacked
  yew(kind) {
    const g = rgb(0x1e4a26), parts = [];
    if (kind === 0) parts.push(shade(lathe([[0, 0], [2.6, 0.2], [2.8, 1.2], [1.9, 4.6], [0.9, 7.4], [0.0, 8.6]], 14), g, 0.75, 1.15));
    else if (kind === 1) { parts.push(paint(cyl(0.22, 0.28, 3.2, 6, 0, 1.6, 0), rgb(0x4a3020))); parts.push(shade(sph(2.2, 1, 1, 1, 0, 4.8, 0, 14, 10), g, 0.8, 1.15)); parts.push(paint(box(2.2, 1.0, 2.2, 0, 0.5, 0), rgb(0xf0ebe0))); }
    else { for (const [r, y] of [[2.1, 1.9], [1.6, 5.0], [1.05, 7.4]]) parts.push(shade(sph(r, 1, 0.92, 1, 0, y, 0, 14, 10), g, 0.8, 1.15)); }
    return merge(parts);
  },
  // a stone urn on its pedestal, red geraniums spilling over
  urn() {
    const R = seeded(4), stone = rgb(0xece4d4), parts = [];
    parts.push(paint(box(2.4, 3.4, 2.4, 0, 1.7, 0), stone)); parts.push(paint(box(2.8, 0.4, 2.8, 0, 3.6, 0), stone));
    parts.push(paint(lathe([[0, 0], [0.7, 0], [0.5, 0.4], [0.5, 0.8], [1.5, 1.6], [1.9, 2.6], [2.0, 2.9], [0, 2.9]], 20).translate(0, 3.8, 0), stone));
    for (let k = 0; k < 26; k++) { const a = R() * TAU, r = R() * 1.8; parts.push(paint(sph(0.34 + R() * 0.2, 1, 0.8, 1, Math.cos(a) * r, 6.7 + R() * 0.6 - r * 0.25, Math.sin(a) * r, 6, 4), R() < 0.6 ? rgb(0xd8202e) : rgb(0x2e5a24))); }
    return merge(parts);
  },
  // a marble woman on a plinth, draped, one arm up holding a wreath
  statue() {
    const m = rgb(0xf2eee6), parts = [];
    parts.push(shade(box(3, 4, 3, 0, 2, 0), rgb(0xd8d0c2), 0.8, 1.0)); parts.push(paint(box(3.6, 0.5, 3.6, 0, 4.25, 0), rgb(0xe4dccc)));
    parts.push(shade(lathe([[0, 0], [1.25, 0], [1.05, 1.0], [0.8, 2.4], [0.62, 3.2], [0.72, 3.9], [0.55, 4.5], [0.3, 4.75], [0, 4.75]], 16).translate(0, 4.5, 0), m, 0.75, 1.05));
    parts.push(paint(sph(0.42, 1, 1.15, 1, 0, 9.65, 0.05, 12, 10), m));
    parts.push(paint(sph(0.46, 1, 0.9, 0.95, 0, 9.85, -0.12, 12, 8), m));
    parts.push(paint(tube(V(0.6, 8.9, 0), V(1.05, 10.6, 0.2), 0.17, 0.13, 6), m));
    parts.push(paint(tube(V(1.05, 10.6, 0.2), V(0.85, 11.9, 0.35), 0.13, 0.11, 6), m));
    parts.push(paint(new THREE.TorusGeometry(0.42, 0.09, 6, 14).translate(0.85, 12.3, 0.35), rgb(0xe8d898)));
    parts.push(paint(tube(V(-0.6, 8.9, 0), V(-0.75, 7.0, 0.35), 0.17, 0.13, 6), m));
    // folds down the drape
    for (let k = 0; k < 7; k++) { const a = -0.9 + k * 0.3; parts.push(paint(tube(V(Math.sin(a) * 0.95, 5.0, Math.cos(a) * 0.95), V(Math.sin(a) * 0.62, 7.6, Math.cos(a) * 0.62), 0.09, 0.05, 5), m)); }
    return merge(parts);
  },
  // a length of the estate's wall (along z), a pier at its end with a ball, ivy over it
  wall() {
    const R = seeded(8), st = rgb(0xd8ccb2), parts = [];
    parts.push(shade(box(0.9, 4.2, 12, 0, 2.1, 0), st, 0.78, 1.0)); parts.push(paint(box(1.3, 0.35, 12.2, 0, 4.35, 0), rgb(0xece4d0)));
    parts.push(shade(box(1.7, 5.6, 1.7, 0, 2.8, 6), st, 0.75, 1.0)); parts.push(paint(box(2.0, 0.4, 2.0, 0, 5.8, 6), rgb(0xece4d0))); parts.push(paint(sph(0.8, 1, 1, 1, 0, 6.9, 6, 12, 8), rgb(0xece4d0)));
    // ivy: a few clumps, thick by the pier and hanging off the coping
    for (let k = 0; k < 5; k++) { const z = 4.6 - k * 2.2 - R() * 0.6, y = 4.3 - k * 0.55 - R() * 0.5, s = 1.3 - k * 0.15; for (const sd of [-1, 1]) parts.push(paint(sph(s, 0.45, 1.25, 1.3, sd * 0.42, y, z, 8, 6), rgb(0x4a7a34), 0.85 + 0.3 * R())); }
    return merge(parts);
  },
  // an iron lantern post (the light is a glow)
  lanternPost() { const k = rgb(0x18161a); return merge([paint(cyl(0.5, 0.6, 0.6, 8, 0, 0.3, 0), k), paint(cyl(0.12, 0.16, 4.6, 6, 0, 2.6, 0), k), paint(new THREE.CylinderGeometry(0.42, 0.3, 0.9, 6, 1, true).translate(0, 5.3, 0), rgb(0xffe6b0)), paint(new THREE.ConeGeometry(0.6, 0.6, 6).translate(0, 6.05, 0), k)]); },
  // a magnum of champagne, eight metres of it: green glass, gold foil, a cream label (the cork is its own)
  bottle() {
    const parts = [];
    parts.push(paint(lathe([[0, 0.05], [1.05, 0], [1.12, 0.3], [1.12, 4.6], [1.0, 5.2], [0.62, 5.9], [0.42, 6.5], [0.4, 7.7], [0.46, 7.8], [0.44, 7.95], [0, 7.95]], 24), rgb(0x0e3a22)));
    parts.push(paint(cyl(0.47, 0.6, 1.9, 20, 0, 6.95, 0), rgb(0xe8c050)));
    parts.push(paint(cyl(1.14, 1.14, 1.9, 24, 0, 2.6, 0), rgb(0xf4ecd8)));
    parts.push(paint(cyl(1.15, 1.15, 0.22, 24, 0, 3.3, 0), rgb(0xd8a840)));
    parts.push(paint(cyl(1.15, 1.15, 0.22, 24, 0, 1.9, 0), rgb(0xd8a840)));
    return merge(parts);
  },
  cork() { return merge([paint(cyl(0.42, 0.36, 0.9, 12, 0, 0.45, 0), rgb(0xc89a5a)), paint(cyl(0.48, 0.48, 0.2, 12, 0, 0.95, 0), rgb(0xe8c050))]); },
  // a drop of water (or of champagne): stretched along y
  drop() { return sph(0.18, 1, 2.4, 1, 0, 0, 0, 6, 4); },
  // a lawn sprinkler's head on its spike
  sprinkler() { return merge([paint(cyl(0.05, 0.05, 0.5, 5, 0, 0.25, 0), rgb(0x3a3a3a)), paint(cyl(0.16, 0.16, 0.22, 8, 0, 0.55, 0), rgb(0xc8a040)), paint(box(0.5, 0.08, 0.08, 0.2, 0.68, 0), rgb(0xc8a040))]); },
  // a jet in the canal: a column of water (scaled to its height)
  jet() { return new THREE.CylinderGeometry(0.34, 0.16, 1, 10, 1, true).translate(0, 0.5, 0); },
  // an umbrella (canopy +y, closed by scaling x/z), its handle down
  umbrella() { const g = new THREE.ConeGeometry(1.7, 0.85, 8, 1, true).rotateY(Math.PI / 8).translate(0, 2.55, 0); return shade(g, [1, 1, 1], 0.7, 1.05); },
  umbrellaStick() { return merge([paint(cyl(0.03, 0.03, 2.6, 5, 0, 1.6, 0), rgb(0x1a1a1a)), paint(sph(0.07, 1, 1, 1, 0, 3.05, 0, 6, 4), rgb(0xc8a040))]); },
  // a party marquee: white canvas, peaked, its flaps tied back
  tent() {
    const w = rgb(0xf6f2ea), parts = [];
    parts.push(shade(box(14, 3.2, 10, 0, 1.6, 0), w, 0.85, 1.0));
    parts.push(paint(new THREE.ConeGeometry(9.2, 4.6, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.72).translate(0, 5.5, 0), w));
    for (const x of [-7, 7]) parts.push(paint(cyl(0.12, 0.12, 9, 5, x, 4.5, 0), rgb(0xd8d0c0)));
    parts.push(paint(cyl(0.1, 0.1, 2, 5, 0, 8.6, 0), rgb(0xc8a040)));
    parts.push(paint(box(0.04, 0.7, 1.1, 0, 9.2, 0.55), rgb(0xe0b84a)));
    return merge(parts);
  },
  pole() { return merge([paint(cyl(0.1, 0.13, 6.2, 6, 0, 3.1, 0), rgb(0x2a2420)), paint(sph(0.18, 1, 1, 1, 0, 6.3, 0, 6, 4), rgb(0xc8a040))]); },
};

// ---------- materials and layers (made per song, kept on the scenery's materials) ----------
const vc = (key, o) => (M) => M[key] || (M[key] = vcMat(o));
const dropM = (M) => M.ywnDropM || (M.ywnDropM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.4, 1.5), transparent: true, opacity: 0.75, depthWrite: false }));
const fizzM = (M) => M.ywnFizzM || (M.ywnFizzM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.45, 1.15, 0.55), transparent: true, opacity: 0.8, depthWrite: false }));
const jetM = (M) => M.ywnJetM || (M.ywnJetM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 1.1, 1.2), transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }));
const glassM = (M) => M.ywnBottleM || (M.ywnBottleM = vcMat({ rough: 0.12, metal: 0.4, k: 1.2 }));

extend({
  layers: {
    ywnCypress0: (M) => [PG.cypress(0), vc('ywnTreeM', { rough: 0.95, k: 0.5, flat: true })(M), 700, {}],
    ywnCypress1: (M) => [PG.cypress(1), vc('ywnTreeM', { rough: 0.95, k: 0.5, flat: true })(M), 700, {}],
    ywnYew0: (M) => [PG.yew(0), vc('ywnYewM', { rough: 0.9, k: 0.55, flat: true, glow: true })(M), 260, { aGlow: 1 }],
    ywnYew1: (M) => [PG.yew(1), vc('ywnYewM', { rough: 0.9, k: 0.55, flat: true, glow: true })(M), 260, { aGlow: 1 }],
    ywnYew2: (M) => [PG.yew(2), vc('ywnYewM', { rough: 0.9, k: 0.55, flat: true, glow: true })(M), 260, { aGlow: 1 }],
    ywnUrn: (M) => [PG.urn(), vc('ywnStoneM', { rough: 0.8, k: 1.0 })(M), 80, {}],
    ywnStatue: (M) => [PG.statue(), vc('ywnMarbleM', { rough: 0.45, k: 1.2 })(M), 80, {}],
    ywnWall: (M) => [PG.wall(), vc('ywnStoneM', { rough: 0.8, k: 1.0 })(M), 170, {}],
    ywnLantern: (M) => [PG.lanternPost(), vc('ywnIronM', { rough: 0.5, metal: 0.3, k: 1.0 })(M), 260, {}],
    ywnBottle: (M) => [PG.bottle(), glassM(M), 120, {}],
    ywnCork: (M) => [PG.cork(), vc('ywnStoneM', { rough: 0.8, k: 1.0 })(M), 120, {}],
    ywnDrop: (M) => [PG.drop(), dropM(M), 2000, {}],
    ywnFizz: (M) => [PG.drop(), fizzM(M), 1600, {}],
    ywnSprinkler: (M) => [PG.sprinkler(), vc('ywnIronM', { rough: 0.5, metal: 0.3, k: 1.0 })(M), 120, {}],
    ywnJet: (M) => [PG.jet(), jetM(M), 400, {}],
    ywnBrolly: (M) => [PG.umbrella(), vc('ywnBrollyM', { rough: 0.6, k: 0.9, tint: true, side: THREE.DoubleSide })(M), 240, { aTint: 3 }],
    ywnBrollyStick: (M) => [PG.umbrellaStick(), vc('ywnIronM', { rough: 0.5, metal: 0.3, k: 1.0 })(M), 240, {}],
    ywnTent: (M) => [PG.tent(), vc('ywnCanvasM', { rough: 0.85, k: 1.6 })(M), 30, {}],
    ywnPole: (M) => [PG.pole(), vc('ywnIronM', { rough: 0.5, metal: 0.3, k: 1.0 })(M), 200, {}],
  },
  parts: {
    // a cypress: sways a little in the wind, hard in the storm
    ywnCypress(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnCypress0; void L.ywnCypress1; if (!S.track) return;
      const T = S.tNow ?? 0, wind = S.ywnWind ?? 0.2, sw = Math.sin(T * (1.1 + it.seed) + it.seed * 20) * 0.025 * wind + wind * 0.03;
      const m = S._m, s = it.s ?? 1; m.compose(p, quat(S, '_ywnQc', yaw, sw, sw * 0.6), S._s.set(s, s * (it.sy ?? 1), s)); L[it.v ? 'ywnCypress1' : 'ywnCypress0'].add(m);
    },
    // a clipped yew; it breathes with the beat (a hair bigger on each one)
    ywnYew(S, it, p, q) {
      const L = S.layers; void L.ywnYew0; void L.ywnYew1; void L.ywnYew2; if (!S.track) return;
      const bi = beatInfo(S), k = 1 + 0.035 * bi.pulse * (0.5 + bi.e);
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s * k, s * (2 - k) * k, s * k)); L['ywnYew' + it.v].add(m, { aGlow: 0.08 * bi.pulse * (bi.chorus ? 1.5 : 0.6) });
    },
    ywnUrn(S, it, p, q) { const L = S.layers; void L.ywnUrn; if (!S.track) return; const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); L.ywnUrn.add(m); },
    ywnStatue(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnStatue; if (!S.track) return;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); L.ywnStatue.add(m);
      if (it.lit) { const w = local(p, yaw, 0, 1, 3 * s, S._o); glowAt(S, w.x, w.y, w.z, 3 * s, [1, 0.85, 0.6], 0.9 * it.lit); poolAt(S, p.x, p.y + 0.1, p.z, 10 * s, [1, 0.85, 0.6], 0.5 * it.lit); }
    },
    ywnWall(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnWall; if (!S.track) return;
      const m = S._m; m.compose(p, q, S._s.set(1, 1, it.s ?? 1)); L.ywnWall.add(m);
      if (it.lamp) { const bi = beatInfo(S), w = local(p, yaw, 0, 7.6, 6, S._o); glowAt(S, w.x, w.y, w.z, 2.2 + 1.2 * bi.pulse * bi.e, [1, 0.82, 0.5], 0.5 + 0.5 * (it.wakeNow ?? 0) + 0.9 * bi.pulse * bi.e); }
    },
    ywnLantern(S, it, p, q) {
      const L = S.layers; void L.ywnLantern; if (!S.track) return;
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.ywnLantern.add(m);
      const k = (S.ywnK ? S.ywnK.lamps : 0.5) * (0.7 + 0.6 * (it.wakeNow ?? 0));
      glowAt(S, p.x, p.y + 5.3, p.z, 2.6, [1, 0.8, 0.48], k * 1.4, S.beatLamps ? 4 : 0); poolAt(S, p.x, p.y + 0.08, p.z, 11, [1, 0.78, 0.45], k * 0.8);
    },
    // a sprinkler ticking round on the beat, its stream thrown out in an arc
    ywnSprinkler(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnSprinkler; void L.ywnDrop; if (!S.track) return;
      const bi = beatInfo(S), T = S.tNow ?? 0;
      // a step a beat: out along the beat, back on the bar, a little jump as it ticks
      const steps = bi.i + (1 - Math.exp(-bi.f * 14)), sweep = Math.sin(steps * 0.42 + it.seed * 6) * 1.25;
      const a = yaw + it.face + sweep, dx = Math.sin(a), dz = Math.cos(a);
      const m = S._m; m.compose(p, quat(S, '_ywnQs', a), S._s.set(3, 3, 3)); L.ywnSprinkler.add(m);
      const len = 14 * (it.s ?? 1), up = 5.2 * (it.s ?? 1), n = 18;
      for (let j = 0; j < n; j++) {
        const u = ((j / n) + T * 0.9 + it.seed) % 1, x = dx * len * u, z = dz * len * u, y = 2 + up * 4 * u * (1 - u) - 1.6 * u * u;
        const w = S._o.set(p.x + x, p.y + y, p.z + z);
        m.compose(w, quat(S, '_ywnQd', a, 1.2 - 2.2 * u), S._s.set(1.4, 1.4 + 1.2 * u, 1.4)); L.ywnDrop.add(m);
      }
      if (bi.pulse > 0.5) glowAt(S, p.x + dx * len * 0.5, p.y + 2 + up, p.z + dz * len * 0.5, 4, [1, 1, 1], 0.25 * bi.pulse);
    },
    // a jet in the canal, up and down with the beat; in a chorus it leaps, a wave along the canal
    ywnJet(S, it, p) {
      const L = S.layers; void L.ywnJet; void L.ywnDrop; if (!S.track) return;
      const bi = beatInfo(S), storm = S.ywnWind > 0.6 ? 1 : 0;
      const wave = 0.5 + 0.5 * Math.sin(bi.b * Math.PI - it.t * 2.2);
      const h = (3.5 + 3 * wave) * (bi.chorus ? 1 + 1.4 * bi.pulse + 0.4 * storm : 0.8 + 0.4 * bi.pulse);
      const m = S._m; m.makeScale(1.4, h, 1.4); m.setPosition(p.x, p.y + 0.2, p.z); L.ywnJet.add(m);
      for (let j = 0; j < 6; j++) { const a = j / 6 * TAU + (S.tNow ?? 0) * 1.3, u = ((S.tNow ?? 0) * 1.1 + hash(j + it.seed * 9)) % 1, r = 0.5 + 2.4 * u; m.makeScale(1.1, 1.1, 1.1); m.setPosition(p.x + Math.cos(a) * r, p.y + h * (1 - 0.35 * u * u) + 0.6 * Math.sin(Math.PI * u), p.z + Math.sin(a) * r); L.ywnDrop.add(m); }
      glowAt(S, p.x, p.y + h, p.z, 3 + h * 0.2, [0.85, 0.95, 1], 0.22 + 0.3 * bi.pulse * (bi.chorus ? 1 : 0.3));
    },
    // a magnum: in a chorus it pops on its beat, the cork up and away and the champagne in an arc
    // toward the road, gold in the light
    ywnBottle(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnBottle; void L.ywnCork; void L.ywnFizz; if (!S.track) return;
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m;
      const lean = it.lean ?? 0;
      const bq = quat(S, '_ywnQb', yaw, 0, lean);
      m.compose(p, bq, S._s.set(s, s, s)); L.ywnBottle.add(m);
      const top = local(p, yaw, -Math.sin(lean) * 7.95 * s, Math.cos(lean) * 7.95 * s, 0, S._ywnTop || (S._ywnTop = new THREE.Vector3()));
      const f = it.pop !== null && it.pop !== undefined ? T - it.pop : -1;
      if (f < 0) { m.compose(top, bq, S._s.set(s, s, s)); L.ywnCork.add(m); return; }
      // the cork, gone up and turning
      if (f < 3) { const cy = top.y + (it.big ? 40 : 26) * f * s - 11 * f * f * s, side = it.x > 0 ? -1 : 1; const cw = local(top, yaw, side * -6 * f * s, 0, 3 * f * s, S._o); cw.y = cy; m.compose(cw, quat(S, '_ywnQk', yaw + f * 7, f * 9, f * 5), S._s.set(s, s, s)); L.ywnCork.add(m); }
      // the spray: a fizzing arc out toward the road, gone in a second and a half
      const life = it.big ? 2.2 : 1.5;
      if (f < life) {
        const fade = 1 - smooth(life - 0.6, life, f), side = it.x > 0 ? 1 : -1, n = it.big ? 22 : 12, B = it.big ? 1.7 : 1;
        for (let j = 0; j < n; j++) {
          const u = ((j / n) + f * 1.6) % 1, age = Math.min(f, 0.5);
          const reach = (6 + 8 * age) * s * B, x = side * reach * u, y = (5 + 7 * age) * s * B * 4 * u * (1 - u) * 0.5 + 1.0 * s * (1 - u) - 3.5 * u * u * s;
          const w = local(top, yaw, x, y, (hash(j) - 0.5) * 2.0 * s * u, S._o);
          const k = (0.55 + 0.45 * hash(j * 7)) * s * fade * (1 - 0.5 * u) * (it.big ? 1.4 : 1);
          m.compose(w, quat(S, '_ywnQf', yaw, 0, side * (1.2 - 2.4 * u)), S._s.set(k, k * (1.3 + u), k)); L.ywnFizz.add(m);
        }
        glowAt(S, top.x, top.y + 1.0 * s, top.z, (3 + 6 * Math.exp(-f * 5)) * s * B, [1, 0.85, 0.45], (0.15 + 1.1 * Math.exp(-f * 6)) * fade);
      }
    },
    // an umbrella: furled, then open on its beat in the storm, bobbing in the wind
    ywnBrolly(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnBrolly; void L.ywnBrollyStick; if (!S.track) return;
      const T = S.tNow ?? 0, f = it.open !== null && it.open !== undefined ? T - it.open : -1;
      const o = f < 0 ? 0.1 : 0.1 + 0.9 * (1 - Math.exp(-f * 18)) * (1 + 0.12 * Math.exp(-f * 6) * Math.sin(f * 30));
      const s = it.s ?? 1.4, wob = Math.sin(T * 2.3 + it.seed * 10) * 0.08 * (S.ywnWind ?? 0.3);
      const m = S._m, bq = quat(S, '_ywnQu', yaw + T * 0.2 * it.seed, wob, wob * 0.7);
      m.compose(p, bq, S._s.set(s, s, s)); L.ywnBrollyStick.add(m);
      m.compose(p, bq, S._s.set(s * o, s * (1.5 - 0.5 * o), s * o)); L.ywnBrolly.add(m, { aTint: it.tint });
    },
    ywnTent(S, it, p, q, yaw) {
      const L = S.layers; void L.ywnTent; if (!S.track) return;
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); L.ywnTent.add(m);
      const k = (S.ywnK ? S.ywnK.lamps : 0.5), w = local(p, yaw, 0, 2.6 * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 16 * s, [1, 0.82, 0.55], 0.22 + 0.4 * k);
    },
    // a pole of the festoon; its string of bulbs runs to the next pole along, swinging, lit on the beat
    ywnPole(S, it, p, q) {
      const L = S.layers; void L.ywnPole; if (!S.track) return;
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.ywnPole.add(m);
      if (it.next === undefined) return;
      const b = S.track.ground(it.next, it.x, S._ywnNx || (S._ywnNx = new THREE.Vector3())); b.y = groundAt(S.course, it.next, it.x);
      const T = S.tNow ?? 0, k = (S.ywnK ? S.ywnK.lamps : 0.5), bi = beatInfo(S), n = 9;
      for (let j = 1; j < n; j++) {
        const u = j / n, sag = Math.sin(Math.PI * u) * 1.6, sw = Math.sin(T * 1.6 + it.t * 3 + u * 2) * 0.25;
        const x = p.x + (b.x - p.x) * u, z = p.z + (b.z - p.z) * u, y = p.y + 6.1 + (b.y - p.y) * u - sag + sw * 0.3;
        const on = bi.chorus ? 0.6 + 1.2 * bi.pulse : 0.9;
        glowAt(S, x, y, z, 0.9, [1, 0.8 - 0.1 * (j % 2), 0.45 + 0.1 * (j % 3)], (0.35 + 1.1 * k) * on);
      }
    },
  },
  kits: {
    // the estate's wall along both sides, a lantern on every pier
    ywnWalls(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.32) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 27), rot: 0, s: 1.05, parts: 'ywnWall', lamp: true, seed: R(), wake0: 0.4, ahead: 40 }); },
    // the cypress allée, and more cypresses scattered over the lawns behind
    ywnAllee(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 0.36) for (const side of [-1, 1]) {
        if ((z.gaps || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) continue;
        S.items.push({ t: t + R() * 0.04, x: side * ((z.x ?? 38) + R() * 2), rot: R() * 6.28, s: 0.95 + R() * 0.25, sy: 0.9 + R() * 0.35, v: R() < 0.5 ? 1 : 0, seed: R(), parts: 'ywnCypress', ahead: 40 });
        if (R() < (z.far ?? 0.55)) S.items.push({ t: t + R() * 0.2, x: side * (60 + R() * 110), rot: R() * 6.28, s: 0.9 + R() * 0.5, v: R() < 0.5 ? 1 : 0, seed: R(), parts: 'ywnCypress', ahead: 40 });
      }
    },
    // clipped yews in pairs down the lawns, an urn now and then
    ywnTopiary(S, z, R) {
      let k = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.5) {
        const v = z.kinds ? z.kinds[k % z.kinds.length] : k % 3; k++;
        for (const side of [-1, 1]) {
          if ((z.gaps || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) continue;
          S.items.push({ t, x: side * (z.x ?? 22), rot: 0, s: z.s ?? 1, v, parts: 'ywnYew', ahead: 40 });
          if (z.urns && k % z.urns === 0) S.items.push({ t: t + 0.25, x: side * ((z.x ?? 22) + 2), rot: 0, s: 1, parts: 'ywnUrn', ahead: 36 });
        }
      }
    },
    ywnStatues(S, z, R) { for (const a of z.at) { const [t, x, lit] = a; S.items.push({ t, x, rot: SIDE(x) + (x > 0 ? 0.35 : -0.35), s: z.s ?? 1.2, lit: lit ?? 0, parts: 'ywnStatue', ahead: 40 }); } },
    ywnLanterns(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.55) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.x ?? 15), rot: 0, seed: R(), wake0: 0.3, parts: 'ywnLantern' }); },
    // sprinklers out on the lawns, both sides, throwing their water toward the road
    ywnSprinklers(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 0.7) for (const side of [-1, 1]) {
        if (R() < 0.25) continue;
        const x = side * (24 + R() * 30);
        S.items.push({ t: t + R() * 0.3, x, rot: 0, face: x > 0 ? -Math.PI / 2 : Math.PI / 2, seed: R(), s: 0.9 + R() * 0.4, parts: 'ywnSprinkler', ahead: 14 });
      }
    },
    // jets down the middle of each canal
    ywnJets(S, z, R) { const xm = ((z.x0 ?? 26) + (z.x1 ?? 38)) / 2; for (let t = z.from + 0.1; t < z.to - 0.1; t += z.every ?? 0.26) for (const side of [-1, 1]) S.items.push({ t, x: side * xm, rot: 0, seed: R(), parts: 'ywnJet', ahead: 18 }); },
    // magnums along both sides for a chorus: each pops on the beat a little before she's there,
    // every one in sight on the drop
    ywnBottles(S, z, R) {
      const c = S.course;
      for (let t = z.from; t < z.to; t += z.every ?? 0.56) {
        let k = 0;
        for (const side of [-1, 1]) {
          const tt = t + (side > 0 ? 0 : (z.every ?? 0.56) * 0.5), x = side * ((z.x ?? 21) + R() * 2);
          let pop = null;
          let big = false;
          if (z.drop !== undefined && tt < z.drop + 3.4) { pop = z.drop + k++ * 0.02; big = true; }
          else { const tb = chorusBeatBefore(c, tt - (z.lead ?? 1.5)); if (tb !== null && tb >= (z.drop ?? -1e9)) pop = tb; }
          S.items.push({ t: tt, x, rot: R() * 6.28, s: (z.s ?? 1) * (0.9 + R() * 0.25), lean: (R() - 0.5) * 0.12, pop, big, parts: 'ywnBottle', ahead: 40 });
        }
      }
    },
    // umbrellas along both sides in the storm: each opens on its beat as she comes
    ywnBrollies(S, z, R) {
      const c = S.course, cols = [0x1a1a1e, 0xf4f0e8, 0xb8182a, 0x1e3a2a, 0xe0b84a, 0x1a1a1e];
      for (let t = z.from; t < z.to; t += z.every ?? 0.2) for (const side of [-1, 1]) {
        if (R() < 0.2) continue;
        const tt = t + R() * 0.1, x = side * ((z.x ?? 19) + R() * 9);
        const b = Math.round(c.beatAt(tt - (z.lead ?? 1.3) - R() * 0.4));
        S.items.push({ t: tt, x, rot: R() * 6.28, s: (z.s ?? 1.4) * (0.9 + R() * 0.3), open: c.beats[b] ?? null, tint: rgb(pick(R, cols)), seed: R(), parts: 'ywnBrolly', ahead: 30 });
      }
    },
    ywnTents(S, z, R) { for (const [t, x, s] of z.at) S.items.push({ t, x, rot: SIDE(x) + (R() - 0.5) * 0.3, s: s ?? 1.2, parts: 'ywnTent', ahead: 40 }); },
    // the festoon: poles both sides, a string of bulbs from each to the next
    ywnFestoon(S, z, R) {
      for (const side of [-1, 1]) {
        const ts = []; for (let t = z.from; t < z.to; t += z.every ?? 0.5) ts.push(t);
        ts.forEach((t, i) => S.items.push({ t, x: side * (z.x ?? 17), rot: 0, parts: 'ywnPole', next: ts[i + 1], ahead: 30 }));
      }
    },
  },
});

// ---------- water laid along the road: the canals, and the pool under the jump ----------
const WATER_VS = /* glsl */`
  attribute vec2 aUv; varying vec2 vUv; varying vec3 vW;
  void main(){ vUv = aUv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`;
const WATER_FS = /* glsl */`
  uniform vec3 uCam, uFog, uZen, uHor, uSun, uSunDir, uDeep; uniform float uFogD, uTime, uRain, uPool, uW, uLit;
  varying vec2 vUv; varying vec3 vW;
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float aaLine(float d, float w){ float f = fwidth(d) + 1e-4; return 1.0 - smoothstep(w - f, w + f, abs(d)); }
  void main(){
    float x = vUv.x * uW, along = vUv.y;
    float ex = min(x, uW - x);
    // the stone edge (the coping)
    if (ex < 0.9) {
      vec3 st = vec3(0.86, 0.82, 0.74) * (0.85 + 0.15 * h2(floor(vec2(along / 1.2, x))));
      st *= 0.75 + 0.35 * smoothstep(0.0, 0.5, ex);
      vec3 col = st * (0.55 + 0.5 * uLit);
      float d = length(uCam - vW); float fog = 1.0 - exp(-pow(d * uFogD, 1.5));
      gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0); return;
    }
    vec2 q = vec2(x, along);
    float t = uTime;
    vec2 n = vec2(sin(q.x * 0.9 + t * 1.4) + 0.5 * sin(q.y * 0.7 - q.x * 1.3 + t * 2.1), sin(q.y * 0.6 - t * 1.2) + 0.5 * sin(q.y * 1.9 + q.x * 0.4 + t * 1.7)) * 0.03;
    // rain: rings everywhere
    if (uRain > 0.01) { vec2 g = floor(q / 1.6), f = fract(q / 1.6) - 0.5; float ph = fract(t * 1.3 + h2(g) * 7.0); float r = length(f + (vec2(h2(g + 3.1), h2(g + 7.7)) - 0.5) * 0.5); n += normalize(f + 1e-3) * sin((r - ph * 0.5) * 40.0) * exp(-ph * 3.0) * smoothstep(0.5, 0.1, r) * 0.12 * uRain; }
    vec3 N = normalize(vec3(n.x, 1.0, n.y));
    vec3 V = normalize(uCam - vW);
    vec3 R = reflect(-V, N);
    vec3 sky = mix(uHor, uZen, smoothstep(0.0, 0.6, R.y)) + uSun * pow(max(dot(R, normalize(uSunDir)), 0.0), 220.0) * 6.0;
    float fres = 0.04 + 0.96 * pow(max(1.0 - max(V.y, 0.0), 0.0), 5.0);
    vec3 deep = uDeep;
    if (uPool > 0.5) {
      // a pool: tiles and their lines under the water, lane lines, light rippling on the floor
      vec2 tq = q / 1.0; float lines = max(aaLine(fract(tq.x + n.x * 4.0) - 0.5, 0.04), aaLine(fract(tq.y + n.y * 4.0) - 0.5, 0.04));
      float lane = aaLine(mod(x - uW * 0.5 + 6.0, 12.0) - 6.0, 0.35);
      float web = pow(abs(sin(q.x * 0.8 + n.y * 30.0 + t) * sin(q.y * 0.7 + n.x * 30.0 - t * 0.8)), 6.0);
      deep = mix(vec3(0.1, 0.62, 0.78), vec3(0.32, 0.86, 0.95), 0.35 + 0.4 * web) * (1.0 - 0.12 * lines) * (1.0 - 0.45 * lane * vec3(1.0, 0.6, 0.4));
      deep *= 0.6 + 0.5 * uLit;
    }
    vec3 col = mix(deep, sky, clamp(fres * (uPool > 0.5 ? 0.7 : 1.0) + (uPool > 0.5 ? 0.04 : 0.18), 0.0, 1.0));
    float d = length(uCam - vW); float fog = 1.0 - exp(-pow(d * uFogD, 1.5));
    gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
  }`;

export class WaterStrip {
  // spec: { from, to, x0, x1 (across, metres: one side, or both mirrored if both: true), pool }
  constructor(scene, course, spec) {
    this.course = course; this.spec = spec;
    const N = 120; this.N = N;
    this.sides = spec.both ? [-1, 1] : [1];
    const M = this.sides.length;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * 2 * M * 3); this.uv = new Float32Array(N * 2 * M * 2);
    const idx = [];
    for (let s = 0; s < M; s++) for (let i = 0; i < N - 1; i++) { const a = s * N * 2 + i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aUv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color() }, uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uDeep: { value: new THREE.Color(0x0c2a30) }, uFogD: { value: 0.001 }, uTime: { value: 0 }, uRain: { value: 0 }, uPool: { value: spec.pool ? 1 : 0 }, uW: { value: Math.abs(spec.x1 - spec.x0) }, uLit: { value: 1 } },
      vertexShader: WATER_VS, fragmentShader: WATER_FS, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = -2;
    scene.add(this.mesh);
    this._p = new THREE.Vector3();
  }
  update(track, rider, P, cam, time) {
    const sp = this.spec, c = this.course;
    const ta = Math.max(sp.from, rider.t - 4), tb = Math.min(sp.to, rider.t + 46);
    this.mesh.visible = tb > ta + 0.05;
    if (!this.mesh.visible) return;
    const N = this.N, W = Math.abs(sp.x1 - sp.x0);
    const cum = this._cum || (this._cum = new Float32Array(N));
    let lx = 0, lz = 0;
    for (let i = 0; i < N; i++) {
      const t = ta + (tb - ta) * (i / (N - 1));
      track.ground(t, 0, this._p);
      cum[i] = i ? cum[i - 1] + Math.hypot(this._p.x - lx, this._p.z - lz) : 0; lx = this._p.x; lz = this._p.z;
      this.sides.forEach((sd, s) => {
        for (let j = 0; j < 2; j++) {
          const x = sd * (j ? sp.x1 : sp.x0);
          track.ground(t, x, this._p);
          const y = Math.max(groundAt(c, t, sd * sp.x0), groundAt(c, t, sd * sp.x1)) + (sp.y ?? 0.15);
          const o = (s * N * 2 + i * 2 + j) * 3;
          this.pos[o] = this._p.x; this.pos[o + 1] = y; this.pos[o + 2] = this._p.z;
          this.uv[(s * N * 2 + i * 2 + j) * 2] = (sd > 0 ? j : 1 - j);
        }
      });
    }
    // the pattern stays put on the ground: measure along from where she is (as the road does)
    let base;
    if (rider.t <= ta) {
      let d = 0, px = 0, pz = 0;
      for (let k = 0; k <= 16; k++) { track.ground(rider.t + (ta - rider.t) * k / 16, 0, this._p); if (k) d += Math.hypot(this._p.x - px, this._p.z - pz); px = this._p.x; pz = this._p.z; }
      base = (rider.stats ? rider.stats.dist : 0) + d;
    } else {
      const fR = clamp((rider.t - ta) / (tb - ta), 0, 1) * (N - 1), iR = Math.min(N - 2, Math.floor(fR));
      base = (rider.stats ? rider.stats.dist : 0) - (cum[iR] + (cum[iR + 1] - cum[iR]) * (fR - iR));
    }
    for (let s = 0; s < this.sides.length; s++) for (let i = 0; i < N; i++) for (let j = 0; j < 2; j++) this.uv[(s * N * 2 + i * 2 + j) * 2 + 1] = cum[i] + base;
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aUv.needsUpdate = true;
    const u = this.mat.uniforms;
    u.uCam.value.copy(cam.position); u.uFog.value.set(P.fog); u.uFogD.value = P.fogDensity; u.uTime.value = time;
    u.uZen.value.set(P.zenith); u.uHor.value.set(P.horizon); u.uSun.value.set(P.moon ?? 0xffffff); if (P.moonDir) u.uSunDir.value.set(...P.moonDir);
    u.uRain.value = P.rain ?? 0; u.uLit.value = clamp((P.hemiK ?? 1.6) / 2, 0.3, 1.2) + (this.lampK ?? 0) * 0.3;
    u.uW.value = W;
  }
}
