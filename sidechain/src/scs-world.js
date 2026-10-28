// Summa Cum Stupid. A carnival on a summer night, the night he wins everything with nothing in his
// head, and she rides it like the coaster it is: the road on white trestles over the midway.
// In from the lot under the arch, whose bulbs read SUMMA CUM LAUDE until "stupid" flips them; the
// band comes in and every bulb on the midway comes on with it. The booths both sides (GUESS YOUR
// GPA, TEST YOUR IQ, BIG BRAIN...), the bulb strings between their poles, the rides turning further
// off; the score board reads her 4.0; the claw machine full of plush brains picks one up on "pickup".
// The band stops and the lights cut: over the dark in silence. The strength tester rings its bell on
// "pop" at 4.0; the big board blue-screens on "blue screens"; and on "summa cum stupid!" she flies
// right over the carousel. The swings, the drop tower falling on "losing control", fireworks on
// every "summa cum". Verse two is in the big top: the talk stage and its slides coming apart into
// nonsense, the spelling bee spelt wrong; out past the carousel again ("spinning on my carousel",
// on the rail round it), the prize booth's wall of W's, the rock in its glass case (MY BRAIN), the
// board's 4.0 going to 0.4, and the rock again on the winner's podium in a mortarboard ("the dumbest
// one here got the best degree"). The bass drops out and only the bulbs pulse; then the last
// stretch chasing a gold trophy that floats ahead on balloons, a dunce cap on top, until it comes
// down at the end.
// The things are in scs-props.js, the course and looks in scs-song.js.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local, signV, PARTS } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room } from './summer.js';
import { PROP, STRIPES, merge, scaleTexture, boardTexture, slidesTexture, beeTexture, plaqueTexture, placardTexture } from './scs-props.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const BULB = [1, 0.74, 0.38], PINKL = [1, 0.32, 0.68], CYAN = [0.32, 0.92, 1], GOLDL = [1, 0.72, 0.26], WHITEL = [1, 0.95, 0.86], REDL = [1, 0.18, 0.14], BLUEL = [0.3, 0.5, 1], PURPL = [0.72, 0.38, 1];
const BULBS = [BULB, PINKL, GOLDL, CYAN, BULB, WHITEL];
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);   // a thing beside the road, its front to the road

// ---------- how lit the midway is ----------
// Dim and waiting until the band comes in, then everything; the stop cuts it; while the bass is out
// the bulbs only flash with the beat; after the last note they go down.
export function midwayLit(course, T) {
  let k = T < 7.98 ? 0.2 : 1;
  if (T > 5.14 && T < 7.98) k = 0.32;
  if (T > 27.86 && T < 29.69) k = 0.03;
  if (T > 119.43 && T < 123.84) { const f = ((course.beatAt(T) % 1) + 1) % 1; k = 0.12 + 0.88 * Math.exp(-f * 5); }
  if (T > 150.5) k = Math.max(0.18, 1 - (T - 150.5) / 2.4);
  return k;
}
// the score boards' face, by song time: her 4.0, the blue screen, 4.0 going wrong, 0.4
function boardState(T) {
  if (T >= 38.05 && T < 45.5) return 1;
  if (T >= 111.95 && T < 112.67) return (Math.floor(T * 14) % 3) ? 2 : 0;
  if (T >= 112.67) return 3;
  return 0;
}

// ---------- materials ----------
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VC = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const pic = (M, key, map, k = 0.6, opts = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.6, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, ...opts }));
const glass = (M) => M.scsGlassM || (M.scsGlassM = new THREE.MeshStandardMaterial({ color: 0xd8f0ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, emissive: 0x20283a }));
let TEX = null;
const tex = () => TEX || (TEX = { scale: scaleTexture(), board: boardTexture(), slides: slidesTexture(), bee: beeTexture(), plaque: plaqueTexture(), placard: placardTexture() });
// a face that shows one cell of a picture of several (the board, the slides): which cell is the
// texture's own offset, set by the world each frame
function cellFace(map, cells) {
  map.repeat.set(1, 1 / cells);
  return new THREE.MeshBasicMaterial({ map, color: new THREE.Color(1.5, 1.5, 1.5), side: THREE.DoubleSide });
}

// ---------- the pieces, registered ----------
const SIGNS = {
  booth: ['scsRING', 'scsPOP', 'scsGPA', 'scsIQ', 'scsBRAIN', 'scsWIN', 'scsDEAN', 'scsHONOR', 'scsSTEP', 'scsDUCK'],
  stand: ['scsFUNNEL', 'scsLEMON', 'scsCORN', 'scsCOTTON', 'scsPOPCORN'],
};
const PROP_LAYERS = {
  arch: ['scsArch', 'scsArchFace'], score: ['scsScore', 'scsScoreFace'], claw: ['scsClaw', 'scsClawGlass', 'scsClawHead', 'scsBrain', 'scsClawFace'],
  striker: ['scsStriker', 'scsScale', 'scsPuck', 'scsStrikeFace'], carousel: ['scsCarousel', 'scsHorse'], drop: ['scsDrop', 'scsDropRing'],
  swing: ['scsSwing', 'scsSwingCrown', 'scsSwingSeat'], stage: ['scsStage', 'scsScreen', 'scsScreenFace', 'scsBlock'], bee: ['scsBee', 'scsBeeFace'],
  wstack: ['scsWStack', 'scsWFace'], rock: ['scsRock', 'scsDome', 'scsPlacard'], podium: ['scsPodium', 'scsRock', 'scsMortar', 'scsRosette'],
};
const FACING = new Set(['score', 'wstack', 'claw', 'rock', 'podium', 'bee', 'stage']);

extend({
  layers: {
    scsArch: (M) => [PROP.arch(), VC(M, 'scsPaintM', 0.18, { roughness: 0.55 }), 3, {}],
    scsArchFace: (M) => [PROP.signFace(40, 7.6).translate(0, 30.6, 0.95), M.sign, 3, { aIdx: 1, aWake: 2 }],
    scsPole: (M) => [PROP.pole(), VC(M, 'scsPaintM', 0.18, { roughness: 0.55 }), 260, {}],
    scsBooth: (M) => [PROP.booth(), VC(M, 'scsBoothM', 0.22, { roughness: 0.7 }), 120, {}],
    ...Object.fromEntries(STRIPES.map(([a, b], i) => ['scsRoof' + i, (M) => [PROP.boothRoof(a, b), VC(M, 'scsClothM', 0.3, { roughness: 0.8, side: THREE.DoubleSide }), 40, {}]])),
    scsBoothFace: (M) => [PROP.signFace(12.4, 3.4).translate(0, 14.4, 4.85), M.sign, 120, { aIdx: 1, aWake: 2 }],
    scsStand: (M) => [PROP.stand(), VC(M, 'scsBoothM', 0.22, { roughness: 0.7 }), 60, {}],
    scsStandFace: (M) => [PROP.signFace(8.6, 3.0).translate(0, 11.8, 0.4), M.sign, 60, { aIdx: 1, aWake: 2 }],
    scsBent: (M) => [PROP.bent(), VC(M, 'scsSteelM', 0.12, { roughness: 0.45, metalness: 0.3 }), 720, {}],
    scsBentTop: (M) => [PROP.bentTop(), VC(M, 'scsSteelM', 0.12, { roughness: 0.45, metalness: 0.3 }), 260, {}],
    scsCarousel: (M) => [PROP.carousel(), VC(M, 'scsRideM', 0.3, { roughness: 0.45, metalness: 0.2 }), 3, {}],
    scsHorse: (M) => [PROP.horse(), VC(M, 'scsHorseM', 0.3, { roughness: 0.35 }), 64, {}],
    scsStriker: (M) => [PROP.striker(), VC(M, 'scsRideM', 0.3, { roughness: 0.45, metalness: 0.2 }), 3, {}],
    scsScale: (M) => [PROP.scaleFace(), pic(M, 'scsScaleM', tex().scale, 0.75), 3, {}],
    scsPuck: (M) => [PROP.puck(), VC(M, 'scsPuckM', 1.2, { roughness: 0.3 }), 3, {}],
    scsStrikeFace: (M) => [PROP.signFace(9, 3).translate(0, 41.6, 0.4), M.sign, 3, { aIdx: 1, aWake: 2 }],
    scsClaw: (M) => [PROP.claw(), VC(M, 'scsRideM', 0.3, { roughness: 0.45, metalness: 0.2 }), 3, {}],
    scsClawGlass: (M) => [PROP.clawGlass(), glass(M), 3, {}],
    scsClawHead: (M) => [PROP.clawHead(), VC(M, 'scsMetalM', 0.25, { roughness: 0.3, metalness: 0.7 }), 3, {}],
    scsBrain: (M) => [PROP.brain(), VC(M, 'scsHorseM', 0.3, { roughness: 0.35 }), 3, {}],
    scsClawFace: (M) => [PROP.signFace(9.4, 2.2).translate(0, 19.6, 5.65), M.sign, 3, { aIdx: 1, aWake: 2 }],
    scsScore: (M) => [PROP.scoreboard(), VC(M, 'scsSteelM', 0.12, { roughness: 0.45, metalness: 0.3 }), 4, {}],
    scsScoreFace: (M) => [PROP.scoreFace(), M.scsBoardFaceM || (M.scsBoardFaceM = cellFace(tex().board, 4)), 4, {}],
    scsDrop: (M) => [PROP.dropTower(), VC(M, 'scsRideM', 0.3, { roughness: 0.45, metalness: 0.2 }), 4, {}],
    scsDropRing: (M) => [PROP.dropRing(), VC(M, 'scsRideM', 0.3, { roughness: 0.45, metalness: 0.2 }), 4, {}],
    scsSwing: (M) => [PROP.swingTower(), VC(M, 'scsSteelM', 0.12, { roughness: 0.45, metalness: 0.3 }), 8, {}],
    scsSwingCrown: (M) => [PROP.swingCrown(), VC(M, 'scsClothM', 0.3, { roughness: 0.8, side: THREE.DoubleSide }), 8, {}],
    scsSwingSeat: (M) => [PROP.swingSeat(), VC(M, 'scsRideM', 0.3, { roughness: 0.45, metalness: 0.2 }), 160, {}],
    scsWStack: (M) => [PROP.wStack(), VC(M, 'scsWM', 0.45, { roughness: 0.3, metalness: 0.4 }), 3, {}],
    scsWFace: (M) => [PROP.signFace(14, 3.6).translate(0, 39, 0.05), M.sign, 3, { aIdx: 1, aWake: 2 }],
    scsRock: (M) => [PROP.rock(), VC(M, 'scsRockM', 0.15, { roughness: 0.8 }), 4, {}],
    scsDome: (M) => [PROP.dome(), glass(M), 3, {}],
    scsPlacard: (M) => [PROP.placardFace(), pic(M, 'scsPlacardM', tex().placard, 0.55), 3, {}],
    scsPodium: (M) => [podiumGeo(), VC(M, 'scsPaintM', 0.18, { roughness: 0.55 }), 3, {}],
    scsMortar: (M) => [PROP.mortar(), VC(M, 'scsPaintM', 0.18, { roughness: 0.55 }), 3, {}],
    scsRosette: (M) => [PROP.rosette(), VC(M, 'scsPaintM', 0.35, { roughness: 0.55 }), 3, {}],
    scsStage: (M) => [PROP.stage(), VC(M, 'scsPaintM', 0.18, { roughness: 0.55 }), 3, {}],
    scsScreen: (M) => [PROP.screen(), VC(M, 'scsSteelM', 0.12, { roughness: 0.45, metalness: 0.3 }), 3, {}],
    scsScreenFace: (M) => [PROP.screenFace(), M.scsSlidesM || (M.scsSlidesM = cellFace(tex().slides, 2)), 3, {}],
    scsBlock: (M) => [PROP.block(), VC(M, 'scsBlockM', 0.5, { roughness: 0.5 }), 40, {}],
    scsBee: (M) => [PROP.beeBoard(), VC(M, 'scsPaintM', 0.18, { roughness: 0.55 }), 3, {}],
    scsBeeFace: (M) => [PROP.beeFace(), pic(M, 'scsBeeM', tex().bee, 0.6), 3, {}],
    scsChair: (M) => [PROP.chair(), VC(M, 'scsChairM', 0.3, { roughness: 0.5, metalness: 0.2 }), 420, {}],
    scsMarquee: (M) => [PROP.marquee(), VC(M, 'scsMetalM', 0.25, { roughness: 0.3, metalness: 0.7 }), 30, {}],
    scsMarqueeFace: (M) => [PROP.signFace(25, 8).translate(0, 0, 0.08), M.sign, 30, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // a pole with the bulb strings to the next one along
    scsPole(S, it, p) {
      const L = S.layers; void L.scsPole;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, c = S.course;
      const lit = midwayLit(c, T);
      m.compose(p, S._q.set(0, 0, 0, 1), S._s.set(1, 1, 1)); L.scsPole.add(m);
      glowAt(S, p.x, 18.8, p.z, 2.4, BULB, 0.9 * lit);
      if (it.t > T + 26 || it.next === undefined) return;
      // the string: seven bulbs on a sag to the next pole, every other one lit as the lights run
      const a = S._scsA || (S._scsA = new THREE.Vector3()), b = S._scsB || (S._scsB = new THREE.Vector3());
      S.track.ground(it.t, it.x, a); S.track.ground(it.next, it.x, b);
      const run = Math.floor(T * 6 + (it.x > 0 ? 1 : 0)), near = smooth(26, 18, it.t - T);
      for (let j = 0; j < 7; j++) {
        const u = (j + 0.5) / 7, y = 18 - 4.2 * 4 * u * (1 - u);
        const on = ((j + run) % 2 ? 0.45 : 1) * lit * near;
        glowAt(S, a.x + (b.x - a.x) * u, y, a.z + (b.z - a.z) * u, 1.5, BULBS[(((j + Math.round(it.t * 3)) % BULBS.length) + BULBS.length) % BULBS.length], on);
      }
      if (it.t < T + 16) poolAt(S, p.x, 0.45, p.z, 16, BULB, 0.22 * lit);
    },
    // a game booth facing the road: its roof, its sign, bulbs along the roof
    scsBooth(S, it, p, q, yaw) {
      const L = S.layers; void L.scsBooth; void L['scsRoof' + (it.v ?? 0)]; void L.scsBoothFace;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, lit = midwayLit(S.course, T);
      S._e.set(0, yaw + SIDE(it.x), 0); const bq = (S._scsq || (S._scsq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, bq, S._s.set(1, 1, 1));
      L.scsBooth.add(m); L['scsRoof' + (it.v ?? 0)].add(m); L.scsBoothFace.add(m, signV(it.idx, 0.25 + 0.75 * lit));
      if (it.t > T + 22) return;
      const run = Math.floor(T * 5), byaw = yaw + SIDE(it.x), w = S._o;
      for (let j = 0; j < 9; j++) { local(p, byaw, -8 + j * 2, 11.6, 6.4, w); glowAt(S, w.x, w.y, w.z, 1.1, BULBS[(j + (it.v ?? 0)) % BULBS.length], ((j + run) % 3 ? 0.4 : 1) * lit); }
      local(p, byaw, 0, 6, 8, w); poolAt(S, w.x, 0.45, w.z, 18, BULB, 0.35 * lit);
    },
    scsStand(S, it, p, q, yaw) {
      const L = S.layers; void L.scsStand; void L.scsStandFace;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, lit = midwayLit(S.course, T);
      S._e.set(0, yaw + SIDE(it.x), 0); const bq = (S._scsq || (S._scsq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, bq, S._s.set(1, 1, 1)); L.scsStand.add(m); L.scsStandFace.add(m, signV(it.idx, 0.3 + 0.7 * lit));
      if (it.t > T + 22) return;
      const w = S._o; local(p, yaw + SIDE(it.x), 0, 8.6, 4.6, w); glowAt(S, w.x, w.y, w.z, 6, WHITEL, 0.3 * lit); poolAt(S, w.x, 0.45, w.z, 14, WHITEL, 0.3 * lit);
    },
    // the coaster's trestle under her road, as tall as the road is high there: bays of about 6 m, each
    // stretched a little at most (p is S._p: read before it's reused)
    scsBent(S, it, p, q) {
      const L = S.layers; void L.scsBent; void L.scsBentTop;
      if (!S.track) return;
      const H = S.course.sample(it.t, S._scsSm || (S._scsSm = {})).y - 0.9;
      const px = p.x, py = p.y, pz = p.z, T = H - py;
      if (T < 2) return;
      const n = Math.max(1, Math.round(T / 6)), hb = T / n, m = S._m;
      for (let i = 0; i < n; i++) { m.compose(S._p.set(px, py + i * hb, pz), q, S._s.set(1, hb / 6, 1)); L.scsBent.add(m); }
      m.compose(S._p.set(px, H, pz), q, S._s.set(1, 1, 1)); L.scsBentTop.add(m);
    },
    // the rides off in the distance: mostly their lights
    scsRide(S, it, p, q, yaw) {
      const L = S.layers;
      if (it.kind === 'swing' || it.kind === 'drop') return PARTS.scsProp(S, it, p, q, yaw);
      if (!S.track) return;
      const T = S.tNow ?? 0, lit = midwayLit(S.course, T), w = S._o, s = it.s ?? 1;
      if (it.kind === 'loop') {
        // a ring of bulbs stood on its edge, a car going round inside it
        const R = 22 * s, cy = R + 4, ph = T * 1.6 + it.t;
        for (let j = 0; j < 28; j++) { const a = j / 28 * Math.PI * 2; local(p, yaw + Math.PI / 2, Math.cos(a) * R, cy + Math.sin(a) * R, 0, w); glowAt(S, w.x, w.y, w.z, 2.2 * s, BULBS[j % 3 + 1], ((j + Math.floor(T * 8)) % 4 ? 0.5 : 1.2) * lit); }
        local(p, yaw + Math.PI / 2, Math.cos(ph) * R * 0.88, cy + Math.sin(ph) * R * 0.88, 0, w); glowAt(S, w.x, w.y, w.z, 5 * s, WHITEL, 0.9 * lit);
      } else if (it.kind === 'zip') {
        // a boom turning end over end, a car at each end
        const R = 26 * s, ph = T * 0.9 + it.t, cy = 34 * s;
        for (let j = -6; j <= 6; j++) { const r = j / 6 * R; local(p, yaw + Math.PI / 2, Math.cos(ph) * r, cy + Math.sin(ph) * r, 0, w); glowAt(S, w.x, w.y, w.z, 1.9 * s, j % 2 ? PINKL : CYAN, (Math.abs(j) === 6 ? 1.6 : 0.7) * lit); }
        local(p, yaw, 0, cy, 0, w); glowAt(S, w.x, w.y, w.z, 8 * s, GOLDL, 0.6 * lit);
      } else if (it.kind === 'tent') {
        // a little tent's ridge of bulbs and its glow
        for (let j = 0; j < 12; j++) { const u = j / 11 - 0.5; local(p, yaw + Math.PI / 2, u * 30 * s, 16 * s - Math.abs(u) * 14 * s, 0, w); glowAt(S, w.x, w.y, w.z, 1.8 * s, BULBS[j % BULBS.length], 0.8 * lit); }
        local(p, yaw, 0, 6 * s, 0, w); glowAt(S, w.x, w.y, w.z, 26 * s, BULB, 0.12 * lit);
      }
    },
    // the set-pieces, each where it's sung
    scsProp(S, it, p, q, yaw) {
      const L = S.layers, k = it.kind;
      if (!S.track) { for (const n of PROP_LAYERS[k] || []) void L[n]; return; }
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, c = S.course, lit = midwayLit(c, T);
      const at = S._scsv || (S._scsv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const fy = it.rot !== undefined || it.x === 0 ? yaw : (FACING.has(k) ? yaw + Math.PI + (it.x > 0 ? -0.55 : 0.55) : yaw + SIDE(it.x));
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, fy + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      const fq = quat('_scsfq');
      const put = (layer, x = 0, y = 0, z = 0, qq = fq, sc = s, vals) => { const w = local(at, fy, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (x, y, z, size, cl, k2) => { const w = local(at, fy, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, cl, k2); };
      const spot = (k2, cl = BULB, r = 30) => poolAt(S, at.x, (it.h ?? 0) + 0.45, at.z, r * s, cl, k2);
      const sgn = S.atlas.index;
      if (k === 'arch') {
        // the sign: LAUDE until "stupid", then STUPID
        put('scsArch'); put('scsArchFace', 0, 0, 0, fq, s, signV(T < (it.flip ?? 0) ? sgn.scsLAUDE : sgn.scsSTUPID, 0.35 + 0.65 * lit));
        const run = Math.floor(T * 7);
        for (let j = 0; j < 17; j++) { const a = Math.PI * j / 16; light(-27 * Math.cos(a), 44 + 9 * Math.sin(a) + 1.8, 1.8, 2.2, BULBS[j % BULBS.length], ((j + run) % 3 ? 0.45 : 1.3) * lit); }
        for (const x of [-27, 27]) for (let j = 0; j < 7; j++) light(x, 6 + j * 6, 2.8, 1.8, j % 2 ? PINKL : BULB, ((j + run) % 2 ? 0.5 : 1.1) * lit);
        spot(0.6 * lit, BULB, 46);
      } else if (k === 'score') {
        put('scsScore'); put('scsScoreFace');
        const st = boardState(T);
        light(0, 30, 6, 30, st === 1 ? BLUEL : REDL, (st === 1 ? 0.55 : 0.28) * Math.max(0.3, lit));
        for (let j = 0; j < 12; j++) light(-16 + j * 2.9, 41.8, 1.2, 1.4, BULBS[j % BULBS.length], ((j + Math.floor(T * 6)) % 2 ? 0.5 : 1.1) * lit);
      } else if (k === 'claw') {
        // the claw comes down over the pile, closes on a brain on "pickup" and lifts it
        put('scsClaw'); put('scsClawGlass'); put('scsClawFace', 0, 0, 0, fq, s, signV(sgn.scsCLAW, 0.4 + 0.6 * lit));
        const g = it.grab ?? 1e9;
        const down = smooth(g - 1.4, g - 0.15, T) * (1 - smooth(g + 0.25, g + 1.6, T));
        const slide = smooth(g + 1.6, g + 3.0, T);
        const y = 15.6 - 7.4 * down, x = 1.5 - 5.6 * slide;
        const closed = smooth(g - 0.1, g + 0.12, T);
        S._e.set(0, fy + T * 0.4, 0); const cq = (S._scsc || (S._scsc = new THREE.Quaternion())).setFromEuler(S._e);
        { const w = local(at, fy, x * s, y * s, 0, S._o); m.compose(w, cq, S._s.set(s * (1 - 0.35 * closed), s, s * (1 - 0.35 * closed))); L.scsClawHead.add(m); }
        if (T > g) { const w = local(at, fy, x * s, (y - 2.3) * s, 0, S._o); m.compose(w, fq, S._s.set(s, s, s)); L.scsBrain.add(m); }
        light(0, 19.6, 6, 10, PINKL, 0.7 * lit); light(0, 12, 0, 16, PINKL, 0.25 * lit); spot(0.5 * lit, PINKL, 24);
        if (T > g - 0.05 && T < g + 0.6) light(x, y - 2.4, 0, 8, WHITEL, 1.4 * (1 - (T - g) / 0.6));
      } else if (k === 'striker') {
        // "the higher the grades, the louder the pop": the puck goes all the way up and rings it
        put('scsStriker'); put('scsScale'); put('scsStrikeFace', 0, 0, 0, fq, s, signV(sgn.scsSTRIKE, 0.4 + 0.6 * lit));
        const r = it.ring ?? 1e9, u = clamp((T - (r - 0.32)) / 0.32, 0, 1);
        const fall = T > r ? clamp((T - r - 0.4) / 0.9, 0, 1) : 0;
        const py = 3.2 + 31.6 * (1 - (1 - u) * (1 - u)) * (1 - fall * fall);
        put('scsPuck', 0, py, 0.6);
        const ding = T > r && T < r + 1.4 ? 1 - (T - r) / 1.4 : 0;
        light(0, 36.4, 1.2, 10, GOLDL, 0.3 * lit + 2.6 * ding);
        for (let j = 0; j < 7; j++) light(0, 6 + j * 4.6, 1.4, 1.6, BULBS[j % BULBS.length], (py > 6 + j * 4.6 - 2 ? 1.4 : 0.35) * lit);
        spot(0.4 * lit, GOLDL, 18);
      } else if (k === 'carousel') {
        // turning, the horses rising and falling on their poles
        const spin = T * (it.speed ?? 0.55) + (it.t * 0.7);
        { const w = local(at, fy, 0, 0, 0, S._o); S._e.set(0, spin, 0); const rq = (S._scsr || (S._scsr = new THREE.Quaternion())).setFromEuler(S._e); m.compose(w, rq, S._s.set(s, s, s)); L.scsCarousel.add(m); }
        for (let j = 0; j < 16; j++) {
          const a = j / 16 * Math.PI * 2 + spin, r = j % 2 ? 9.5 : 12.5, bob = 6.2 + 1.3 * Math.sin(T * 3.2 + j * 1.7);
          S._p.set(at.x + Math.cos(a) * r * s, at.y + bob * s, at.z - Math.sin(a) * r * s);
          S._e.set(0, a + Math.PI, 0); const hq = (S._scsh || (S._scsh = new THREE.Quaternion())).setFromEuler(S._e);
          m.compose(S._p, hq, S._s.set(s, s, s)); L.scsHorse.add(m);
        }
        const run = Math.floor(T * 8);
        for (let j = 0; j < 30; j++) { const a = j / 30 * Math.PI * 2 + spin; glowAt(S, at.x + Math.cos(a) * 17.6 * s, at.y + 15.2 * s, at.z - Math.sin(a) * 17.6 * s, 1.5 * s, BULBS[j % BULBS.length], ((j + run) % 3 ? 0.55 : 1.3) * lit); }
        for (let j = 0; j < 12; j++) { const a = j / 12 * Math.PI * 2 - spin; glowAt(S, at.x + Math.cos(a) * 15.5 * s, at.y + 2.6 * s, at.z - Math.sin(a) * 15.5 * s, 1.2 * s, BULB, 0.8 * lit); }
        glowAt(S, at.x, at.y + 9 * s, at.z, 36 * s, BULB, 0.22 * lit);
        poolAt(S, at.x, (it.h ?? 0) + 0.45, at.z, 44 * s, BULB, 0.7 * lit);
      } else if (k === 'drop') {
        // the ring climbs slowly to the top and drops all at once on "losing control"
        put('scsDrop');
        const d = it.drop ?? 1e9, up0 = it.up ?? (d - 8);
        let hy = 4;
        if (T < d) hy = 4 + 84 * smooth(up0, d - 0.4, T);
        else { const f = clamp((T - d) / 0.85, 0, 1); hy = 88 - 84 * f * f; }
        // (the car is drawn half again as big as the tower would have it, so it reads from the road)
        put('scsDropRing', 0, hy + 2.5, 0, quat('_scsdq', T * 0.15), s * 1.6);
        const fall = T > d && T < d + 0.9 ? 1 : 0;
        for (let j = 0; j < 16; j++) { const a = j / 16 * Math.PI * 2 + T * 0.15; light(Math.cos(a) * 13.2, hy + 2.5, -Math.sin(a) * 13.2, 4.4, j % 2 ? GOLDL : PINKL, (1.1 + 1.6 * fall) * Math.max(0.4, lit)); }
        for (let j = 0; j < 9; j++) light(0, 8 + j * 10, 2, 2.2, j % 2 ? REDL : WHITEL, (j * 10 + 8 < hy ? 1.2 : 0.4) * lit);
        light(0, 96, 0, 10, REDL, (0.5 + 0.5 * Math.sin(T * 6)) * lit);
        if (T > d && T < d + 1.3) light(0, hy + 2, 0, 14, WHITEL, 1.5 * (1 - (T - d) / 1.3));
        spot(0.4 * lit, REDL, 26);
      } else if (k === 'swing') {
        // the crown turns; the seats fly out as it gets going
        put('scsSwing');
        const om = 1.4, a0 = T * om + it.t, lean = 0.75;
        put('scsSwingCrown', 0, 26, 0, quat('_scscq', a0));
        for (let j = 0; j < 16; j++) {
          const a = a0 + j / 16 * Math.PI * 2, R0 = 11.2;
          S._e.set(0, fy + a, -lean, 'YXZ'); const sq = (S._scss || (S._scss = new THREE.Quaternion())).setFromEuler(S._e); S._e.order = 'XYZ';
          const w = local(at, fy, Math.cos(a) * R0 * s, 26 * s, -Math.sin(a) * R0 * s, S._o);
          m.compose(w, sq, S._s.set(s, s, s)); L.scsSwingSeat.add(m);
        }
        const run = Math.floor(T * 7);
        for (let j = 0; j < 20; j++) { const a = a0 + j / 20 * Math.PI * 2; light(Math.cos(a) * 12.4, 26, -Math.sin(a) * 12.4, 1.6, BULBS[j % BULBS.length], ((j + run) % 2 ? 0.5 : 1.2) * lit); }
        light(0, 32, 0, 22, PURPL, 0.25 * lit); spot(0.4 * lit, PURPL, 30);
      } else if (k === 'stage') {
        // the talk: the round red carpet, the lectern, the screen behind; on "babbling" the
        // slides come apart and the letters come off the stage
        put('scsStage'); put('scsScreen', 0, 2.4, -10); put('scsScreenFace', 0, 2.4, -10);
        const sl = S.layers.scsScreenFace.mesh.material.map; sl.offset.y = T < (it.babble ?? 1e9) ? 0.5 : 0;
        light(0, 21, -8, 26, WHITEL, 0.35); light(-4, 9, 4, 6, WHITEL, 0.5); spot(1.0, WHITEL, 22);
        const b0 = it.babble ?? 1e9;
        if (T > b0 - 0.2) for (let j = 0; j < 24; j++) {
          const t0 = b0 + j * 0.16, u = clamp((T - t0) / 1.1, 0, 1);
          if (T < t0) continue;
          const ang = hash(j + 1) * 2.4 - 1.2, dist = 8 + hash(j + 7) * 18;
          const x = Math.sin(ang) * dist * u, z = 4 + Math.cos(ang) * dist * u, y = 3 + 9 * Math.sin(Math.PI * u) * (1 - 0.3 * hash(j + 3)) - (u >= 1 ? 2.4 : 0);
          const tw = quat('_scsbq' , j, u * 4 + j, u * 3);
          put('scsBlock', x, Math.max(0.2, y), z, tw, s);
        }
      } else if (k === 'bee') {
        put('scsBee'); put('scsBeeFace'); light(0, 14, 6, 18, WHITEL, 0.35); spot(0.5, WHITEL, 18);
      } else if (k === 'wstack') {
        put('scsWStack'); put('scsWFace', 0, 0, 0, fq, s, signV(sgn.scsWS, 0.4 + 0.6 * lit));
        const run = Math.floor(T * 7);
        for (let j = 0; j < 14; j++) light(-16 + j * 2.5, 36.6, 1, 1.6, BULBS[j % BULBS.length], ((j + run) % 2 ? 0.5 : 1.2) * lit);
        light(0, 16, 6, 30, GOLDL, 0.3 * lit); spot(0.6 * lit, GOLDL, 34);
      } else if (k === 'rock') {
        put('scsRock'); put('scsDome'); put('scsPlacard');
        light(0, 26, 3, 6, WHITEL, 0.9); light(0, 13, 0, 9, WHITEL, 0.4); spot(0.9, WHITEL, 14);
      } else if (k === 'podium') {
        // the rock again, on the top step, and on "the best degree" the mortarboard comes down on it
        put('scsPodium'); put('scsRock', 0, 4.6, 0);
        const d = it.degree ?? 1e9, u = clamp((T - (d - 0.9)) / 0.9, 0, 1);
        put('scsMortar', 0, 4.6 + 13.9 + 24 * (1 - u * u), 0, quat('_scsmq', (1 - u) * 6));
        if (T > d) put('scsRosette', 0, 4.6 + 10.6, 4.6);
        light(0, 30, 6, 8, WHITEL, 0.9); light(0, 12, 4, 24, GOLDL, 0.35); spot(1.1, GOLDL, 26);
        for (let j = 0; j < 12; j++) light(-14 + j * 2.6, 0.6, 5.4, 1.4, BULBS[j % BULBS.length], ((j + Math.floor(T * 7)) % 2 ? 0.5 : 1.2) * lit);
        if (T > d && T < d + 1) light(0, 18, 4, 22, GOLDL, 2.0 * (1 - (T - d)));
      }
    },
    // a lyric marquee hung over the road, its bulbs running round it
    scsBoard(S, it, p) {
      const L = S.layers; void L.scsMarquee; void L.scsMarqueeFace;
      if (!S.track) return;
      const T = S.tNow ?? 0, c = S.course, sm = c.sample(it.t, S._scsSb || (S._scsSb = {})), yaw = sm.yaw + Math.PI;
      S._e.set(0, yaw, Math.sin(T * 1.1 + it.t) * 0.02); const fq = (S._scsbd || (S._scsbd = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = sm.y + (it.h || 14);
      const m = S._m, s = it.s ?? 1, lit = 0.35 + 0.65 * Math.max(midwayLit(c, T), it.keep ? 1 : 0);
      m.compose(p, fq, S._s.set(s, s, s)); L.scsMarquee.add(m); L.scsMarqueeFace.add(m, signV(it.idx, lit));
      const w = S._o, run = Math.floor(T * 7);
      for (let j = 0; j < 26; j++) {
        let bx, by;
        if (j < 10) { bx = -12.2 + j * 2.7; by = 5.1; } else if (j < 20) { bx = 12.2 - (j - 10) * 2.7; by = -5.1; } else if (j < 23) { bx = 13.4; by = -2.5 + (j - 20) * 2.5; } else { bx = -13.4; by = 2.5 - (j - 23) * 2.5; }
        local(p, yaw, bx * s, by * s, 0.4 * s, w); glowAt(S, w.x, w.y, w.z, 1.5 * s, BULBS[j % BULBS.length], ((j + run) % 3 === 0 ? 1.2 : 0.35) * lit);
      }
      glowAt(S, p.x, p.y, p.z, 30 * s, BULB, 0.08 * lit);
    },
    // the big top's audience: a row of folding chairs across the left side, facing the stage
    scsChairs(S, it, p, q, yaw) {
      const L = S.layers; void L.scsChair;
      if (!S.track) return;
      const m = S._m, fy = it.h ?? 0;
      S._e.set(0, yaw - Math.PI / 2, 0); const cq = (S._scsch || (S._scsch = new THREE.Quaternion())).setFromEuler(S._e);
      // (x0 is how far out the row starts, on her left; the rows run outward from there)
      const w = S._scsv0 || (S._scsv0 = new THREE.Vector3());
      for (let j = 0; j < it.n; j++) { if (j && hash(it.t * 31 + j) < 0.12) continue; S.track.ground(it.t, -(Math.abs(it.x0) + j * 3.2), w); w.y = fy; m.compose(w, cq, S._s.set(1.3, 1.3, 1.3)); L.scsChair.add(m); }
    },
  },
  kits: {
    // the booths and the food both sides, their sign picked from the song's own
    scsMidway(S, z, R) {
      const ix = S.atlas.index;
      for (let t = z.from; t < z.to; t += z.every ?? 1.3) for (const side of z.side ? [z.side] : [-1, 1]) {
        if ((z.clear || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) continue;
        const food = R() < 0.28, keys = food ? SIGNS.stand : SIGNS.booth;
        const key = keys[Math.floor(R() * keys.length)];
        S.items.push({ t: t + R() * 0.3, x: side * ((z.x ?? 36) + R() * 5), parts: food ? 'scsStand' : 'scsBooth', idx: ix[key], v: Math.floor(R() * STRIPES.length), seed: R() });
      }
    },
    // the poles the bulb strings hang between, each knowing where the next one along is
    scsBulbs(S, z, R) {
      for (const side of [-1, 1]) {
        let last = null;
        for (let t = z.from; t < z.to; t += z.every ?? 0.75) {
          const it = { t, x: side * (z.x ?? 22), parts: 'scsPole' };
          if (last) last.next = t;
          S.items.push(it); last = it;
        }
      }
    },
    // the trestles under the road, but not over the gaps she flies
    scsCoaster(S, z) {
      const gaps = (S.course._gapLips || []).map((g) => [g.lip - 0.1, g.end + 0.25]);
      for (let t = z.from; t < z.to; t += z.every ?? 0.45) { if (gaps.some(([a, b]) => t > a && t < b)) continue; S.items.push({ t, x: 0, parts: 'scsBent' }); }
    },
    scsRides(S, z, R) {
      const kinds = z.kinds || ['loop', 'zip', 'tent', 'swing', 'tent', 'drop'];
      let i = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 3.2) {
        const side = i % 2 ? 1 : -1, kind = kinds[(i + Math.floor(R() * 2)) % kinds.length];
        S.items.push({ t: t + R(), x: side * ((z.x ?? 95) + R() * 70), parts: 'scsRide', kind, s: kind === 'drop' ? 0.75 : 1, drop: 1e9, up: -1e9, speed: 0.5 });
        i++;
      }
    },
    // the set-pieces; those in the big top stand on its floor
    scsProps(S, z) {
      for (const a of z.at) {
        const it = { ...a, parts: 'scsProp' };
        if (a.floor) { prepare(S.course, S.plan); it.h = floorAt(S.course, a.t); }
        S.items.push(it);
      }
    },
    // rows of chairs inside the big top, on its floor
    scsChairs(S, z) {
      prepare(S.course, S.plan);
      for (let t = z.from; t < z.to; t += z.every ?? 0.32) S.items.push({ t, x: 0, parts: 'scsChairs', n: z.n ?? 8, x0: z.x0 ?? -14, h: floorAt(S.course, t) });
    },
  },
});
function podiumGeo() {
  const parts = [];
  const R = [[1, 0.85, 0.2], [0.85, 0.85, 0.9], [0.9, 0.55, 0.3]];
  // the three steps, the top one in the middle (the world puts the rock on it)
  parts.push(boxC(10, 4.6, 10, 0, 2.3, 0, R[0]), boxC(10, 3.0, 10, -10, 1.5, 0, R[1]), boxC(10, 2.0, 10, 10, 1.0, 0, R[2]));
  return merge(parts);
}
function boxC(w, h, d, x, y, z, c) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }

// ---------- the big top: a long tent the road runs through ----------
const TENT = {
  rings: {
    tent: (W = 48, H = 36) => [
      [-W, 12, 1, 1], [-W, 0, 1, 1],
      // (its floor a little above the ground of the lot outside, which runs on under it)
      [-W, 0.25, 1, 0], [-W * 0.5, 0.25, 1, 0], [0, 0.25, 1, 0], [W * 0.5, 0.25, 1, 0], [W, 0.25, 1, 0],
      [W, 0, 1, 2], [W, 12, 1, 2],
      [W, 12, 1, 3], [W * 0.66, 21, 1, 3], [W * 0.33, 29, 1, 3], [0, H, 1, 3], [-W * 0.33, 29, 1, 3], [-W * 0.66, 21, 1, 3], [-W, 12, 1, 3],
    ],
  },
  ringOf: () => 'tent',
  styles: { tent: 0 },
  dims: { tent: [48, 36] },
  lights: () => [16, 4],
};
function tentMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.002 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) }, uLit: { value: 1 }, uBeat: { value: 0 } },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      void main(){ vPart = aPart; vC = aCoord; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uFogDensity, uLit, uBeat; uniform vec3 uFog, uCam, uLight;
      varying float vPart; varying vec3 vC; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      // a stripe edge filtered over the pixel, so it doesn't sparkle far off
      float band(float x, float w){ float f = fwidth(x) * 1.2; return smoothstep(-f, f, abs(fract(x) - 0.5) - (0.5 - w)); }
      float sq(float x){ float f = fwidth(x) + 1e-5; float v = clamp((abs(fract(x) - 0.5) * 2.0 - 0.5) / (2.0 * f) + 0.5, 0.0, 1.0); return mix(v, 0.5, smoothstep(0.25, 0.5, f)); }
      void main(){
        int part = int(vPart + 0.5);
        float x = vC.x, h = vC.y, along = vC.z, ax = abs(x);
        vec3 red = vec3(0.62, 0.05, 0.07), cream = vec3(0.86, 0.8, 0.68);
        vec3 col; vec3 glow = vec3(0.0);
        if (part == 0) {
          // sawdust, trodden darker down the aisle, popcorn here and there
          col = vec3(0.5, 0.36, 0.2) * (0.78 + 0.3 * n2(vec2(x, along) * 0.7)) * (0.85 + 0.15 * n2(vec2(x, along) * 6.0));
          col *= 0.8 + 0.2 * smoothstep(4.0, 14.0, ax);
          col = mix(col, vec3(0.95, 0.9, 0.7), step(0.985, h2(floor(vec2(x, along) * 3.0))) * 0.8);
        } else if (part == 1 || part == 2) {
          // the side walls: red and cream panels, a scalloped band at the top, the bulbs along it
          float st = sq(along / 6.0);
          col = mix(red, cream, st) * (0.85 + 0.15 * n2(vec2(along * 0.4, h * 0.6)));
          float scal = step(h, 12.0) * step(10.2 - 0.9 * abs(sin(along * 0.5236)), h);
          col = mix(col, vec3(0.75, 0.55, 0.12), scal);
          float bulb = smoothstep(0.35, 0.15, length(vec2(fract(along / 3.0) - 0.5, (h - 9.6) / 3.0) * vec2(3.0, 3.0)));
          glow += vec3(1.0, 0.72, 0.36) * bulb * 2.5 * uLit;
        } else if (part == 3) {
          // the roof: wide stripes running up to the ridge, darker the higher, the seams
          float st = sq(along / 9.0 + ax * 0.02);
          col = mix(red, cream, st) * (0.45 + 0.4 * smoothstep(36.0, 12.0, h));
          col *= 0.9 + 0.1 * band(ax / 4.0, 0.03);
          float bulb = smoothstep(0.3, 0.1, length(vec2(fract(along / 4.0) - 0.5, (ax - 2.0) / 4.0) * vec2(2.4, 2.4))) * step(h, 37.0);
          glow += vec3(1.0, 0.78, 0.42) * bulb * 2.0 * uLit;
        } else if (part == 7) {
          // the tent's front from outside: the big stripes, the scallops, the bulbs round the door
          float st = sq(x / 6.0);
          col = mix(red, cream, st);
          float val = step(abs(h - 11.0), 1.4);
          col = mix(col, vec3(0.85, 0.6, 0.12), val);
        } else if (part == 8) { col = vec3(0.9, 0.65, 0.15); glow += vec3(0.3, 0.2, 0.05) * uLit; }
        else {
          // the end walls inside
          float st = sq(x / 6.0);
          col = mix(red, cream, st) * 0.8;
        }
        col *= mix(uLight, vec3(1.0), 0.45);
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// the big top's ends: its own outline (the ring's), a door in it, striped like the canvas outside
function tentEnd(W, H, hw, hh) {
  const pts = [[-W, 0], [-hw, 0], [-hw, hh - hw * 0.4], [-hw * 0.7, hh - hw * 0.1], [0, hh], [hw * 0.7, hh - hw * 0.1], [hw, hh - hw * 0.4], [hw, 0], [W, 0], [W, 12], [W * 0.66, 21], [W * 0.33, 29], [0, H], [-W * 0.33, 29], [-W * 0.66, 21], [-W, 12]];
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath();
  const g = new THREE.ShapeGeometry(s);
  const n = g.attributes.position.count, P = g.attributes.position.array, co = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { co[i * 3] = P[i * 3]; co[i * 3 + 1] = P[i * 3 + 1]; co[i * 3 + 2] = 0; }
  g.setAttribute('aCoord', new THREE.BufferAttribute(co, 3)); g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(7), 1));
  return g;
}

// ---------- the lot under the midway: trodden grass, the sawdust walks, laid along the road ----------
// Rows at fixed song times (like the rooms), so the ground keeps to its places as she rides.
class Lot {
  constructor(scene, course, from, to) {
    this.course = course; this.from = from; this.to = to;
    this.cols = [-150, -110, -80, -60, -48, -40, -33, -27, -21, -15, -8, 0, 8, 15, 21, 27, 33, 40, 48, 60, 80, 110, 150];
    const N = this.N = 150, M = this.M = this.cols.length;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * M * 3); this.b = new Float32Array(N * M * 2);
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b2 = a + 1, c = a + M, d = c + 1; idx.push(a, c, b2, b2, c, d); }
    g.setIndex(idx); this.idxPerRow = idx.length / (N - 1);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aB', new THREE.BufferAttribute(this.b, 2).setUsage(THREE.DynamicDrawUsage));
    this.mat = lotMaterial();
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = -5;
    this.geo = g; scene.add(this.mesh);
    this._p = new THREE.Vector3(); this.ts = new Float32Array(N); this.cum = new Float32Array(N);
    this.DT = 0.36;
  }
  update(track, rider) {
    const ta = Math.max(this.from, rider.t - 5), tb = Math.min(this.to, rider.t + 46);
    this.mesh.visible = tb > ta + 0.05;
    if (!this.mesh.visible) return;
    const N = this.N, M = this.M, ts = this.ts, cum = this.cum, DT = this.DT, cols = this.cols;
    let rows = 0;
    ts[rows++] = ta;
    for (let k = Math.floor(ta / DT) + 1; k * DT < tb - 1e-4 && rows < N - 1; k++) if (k * DT > ta + 1e-4) ts[rows++] = k * DT;
    ts[rows++] = tb;
    let lx = 0, lz = 0;
    for (let i = 0; i < rows; i++) {
      const t = ts[i];
      const sink = 0.1;
      for (let j = 0; j < M; j++) {
        track.ground(t, cols[j], this._p);
        const o = (i * M + j) * 3; this.pos[o] = this._p.x; this.pos[o + 1] = sink; this.pos[o + 2] = this._p.z;
        if (j === (M >> 1)) { cum[i] = i ? cum[i - 1] + Math.hypot(this._p.x - lx, this._p.z - lz) : 0; lx = this._p.x; lz = this._p.z; }
      }
    }
    let base;
    if (rider.t <= ta) base = rider.stats.dist;
    else {
      let iR = 0; while (iR < rows - 2 && ts[iR + 1] <= rider.t) iR++;
      const u = clamp((rider.t - ts[iR]) / Math.max(1e-6, ts[iR + 1] - ts[iR]), 0, 1);
      base = rider.stats.dist - (cum[iR] + (cum[iR + 1] - cum[iR]) * u);
    }
    for (let i = 0; i < rows; i++) for (let j = 0; j < M; j++) { const o = (i * M + j) * 2; this.b[o] = cols[j]; this.b[o + 1] = cum[i] + base; }
    this.geo.setDrawRange(0, (rows - 1) * this.idxPerRow);
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aB.needsUpdate = true;
  }
}
function lotMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.0016 }, uCam: { value: new THREE.Vector3() }, uGrass: { value: new THREE.Color(0x1a2a18) }, uSky: { value: new THREE.Color() }, uK: { value: 1 } },
    vertexShader: /* glsl */`attribute vec2 aB; varying vec2 vB; varying vec3 vW; void main(){ vB = aB; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uFog, uCam, uGrass, uSky; uniform float uFogDensity, uK;
      varying vec2 vB; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float x = vB.x, along = vB.y, ax = abs(x);
        // trodden grass, worn to dirt where the crowds walk: under the road and in front of the booths
        float pat = n2(vec2(x, along) * 0.08) * 0.6 + n2(vec2(x, along) * 0.5) * 0.4;
        vec3 grass = uGrass * (0.7 + 0.6 * pat);
        float walk = (1.0 - smoothstep(26.0, 30.0, ax)) * (0.65 + 0.35 * n2(vec2(along * 0.05, x * 0.1)));
        vec3 dirt = vec3(0.32, 0.22, 0.13) * (0.75 + 0.4 * n2(vec2(x, along) * 0.9));
        vec3 col = mix(grass, dirt, walk);
        // the cables taped across the walks
        float cab = smoothstep(0.12, 0.0, abs(fract(along / 47.0) - 0.5) * 47.0 - 0.0) * (1.0 - smoothstep(28.0, 32.0, ax));
        col = mix(col, vec3(0.04), cab * 0.8);
        col *= uSky * uK;
        // into the fields at the edges
        col = mix(col, uGrass * 0.6 * uSky * uK, smoothstep(70.0, 140.0, ax));
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
  });
}

// ---------- the end: the trophy, carried in on balloons and set down ----------
export class ScsFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -30;
    this.group = new THREE.Group(); scene.add(this.group);
    const gold = this.gold = selfLit({ roughness: 0.22, metalness: 0.75 }, 0.5);
    const paintM = selfLit({ roughness: 0.55 }, 0.2);
    // the plinth (stays put) and the cup (comes in on the balloons)
    this.plinth = new THREE.Mesh(merge([boxC(16, 6, 16, 0, 3, 0, [0.1, 0.1, 0.14]), boxC(12, 4, 12, 0, 8, 0, [0.16, 0.16, 0.22])]), paintM);
    this.group.add(this.plinth);
    this.plaque = new THREE.Mesh(PROP.trophyPlaque(), new THREE.MeshStandardMaterial({ map: plaqueTexture(), roughness: 0.4, metalness: 0.3, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0.0 }));
    this.plaque.material.emissiveMap = this.plaque.material.map; this.plaque.material.emissiveIntensity = 0.45;
    this.group.add(this.plaque);
    this.cup = new THREE.Group(); this.group.add(this.cup);
    const cupMesh = new THREE.Mesh(PROP.trophy(), gold); this.cup.add(cupMesh);
    // the balloons: a bunch on strings over the cup
    const cols = [0xff3a6a, 0xffd23a, 0x3ad8ff, 0xb05aff, 0xff7a2a, 0xffffff, 0x3aff8a];
    const bal = [], R = (k) => hash(k * 13.1);
    for (let k = 0; k < 14; k++) {
      const a = k * 2.4, r = 3 + R(k) * 6, y = 44 + R(k + 3) * 10;
      const g = new THREE.SphereGeometry(2.6, 14, 10); g.scale(1, 1.18, 1); g.translate(Math.cos(a) * r, y, Math.sin(a) * r);
      bal.push(paintG(g, cols[k % cols.length]));
      const str = new THREE.CylinderGeometry(0.05, 0.05, y - 33, 3); str.translate(Math.cos(a) * r * 0.5, (y + 33) / 2 - 2, Math.sin(a) * r * 0.5); bal.push(paintG(str, 0xe8e8e8));
    }
    this.balloons = new THREE.Mesh(merge(bal), selfLit({ roughness: 0.25, metalness: 0.05 }, 0.45));
    this.cup.add(this.balloons);
    this.group.scale.setScalar(cfg.s ?? 1);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3(); this._q = new THREE.Quaternion();
    this.fired = false; this.fireK = 0;
  }
  fire() { this.fired = true; }
  update(track, rider, songT, dt) {
    const c = this.course, cfg = this.cfg, s = cfg.s ?? 1;
    track.ground(this.t, this.x, this._p); this._p.y = 0;
    this.group.position.copy(this._p);
    this.group.rotation.set(0, c.sample(this.t).yaw + (cfg.rot ?? Math.PI / 2 + 0.5), 0);
    this.group.updateMatrixWorld(true);
    // "the trophy I chase": from then it rides ahead of her on its balloons, just out of reach, until
    // after the last note it comes down onto its plinth and the balloons let go
    const T = rider.t, a = cfg.chase ?? 133.3, land = cfg.land ?? 150.3;
    this.cup.visible = T > a - 1.5;
    if (this.cup.visible) {
      const k = smooth(land, land + 3.2, T), sw = 1 - k;
      const w = this._w; track.ground(T + 2.6, 0, w); w.y = c.sample(T + 2.6).y + 22 + 1.5 * Math.sin(songT * 1.4);
      this.group.worldToLocal(w);
      this.cup.position.set(w.x * sw, w.y * sw + 10 * k, w.z * sw);
      this.cup.rotation.set(0.05 * Math.sin(songT * 1.1) * sw, songT * 0.4 * sw, 0.05 * Math.cos(songT * 0.9) * sw);
      this.balloons.position.y = 40 * k * k; this.balloons.visible = k < 0.97;
    }
    const S = this.S; if (!S) return;
    this.fireK = this.fired ? Math.min(1, this.fireK + dt * 0.8) : 0;
    this.gold.emissiveIntensity = 0.5 + 0.45 * this.fireK;   // (it catches the light once it's down)
    const w = this._w;
    if (this.cup.visible) { this.cup.updateMatrixWorld(true); w.set(0, 18, 0); this.cup.localToWorld(w); S.glow(w.x, w.y, w.z, 22 * s, [1, 0.8, 0.4], 0.35 + 0.5 * this.fireK); }
    if (this.t - T < 46) {
      for (let j = 0; j < 16; j++) { const an = j / 16 * Math.PI * 2; w.set(Math.cos(an) * 8.6, 6.4, Math.sin(an) * 8.6).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 1.6 * s, BULBS[j % BULBS.length], (j + Math.floor(songT * 6)) % 2 ? 0.5 : 1.2); }
      w.set(0, 0, 0).applyMatrix4(this.group.matrixWorld); S.pool(w.x, 0.45, w.z, 40 * s, [1, 0.85, 0.5], 0.6 + 0.3 * this.fireK);
    }
  }
}
function paintG(g, hex) { const c = new THREE.Color(hex); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }

// ---------- the place, per frame ----------
export class ScsWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = tentMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, TENT));
    // the big top's two ends, its door in each
    this.ends = [];
    for (const sp of S.plan.rooms || []) (sp.ends || []).forEach(([hw, hh], k) => {
      const mesh = new THREE.Mesh(tentEnd(48, 36, hw, hh), this.mat); mesh.frustumCulled = false;
      scene.add(mesh); this.ends.push({ mesh, t: k ? sp.to : sp.from });
    });
    this._e = new THREE.Vector3();
    this.lot = new Lot(scene, S.course, -6, S.course.duration + 12);
    this._g = new THREE.Vector3();
  }
  update(S, dt, camera, time) {
    const P = S.P, t = S.rider.t, c = S.course;
    const lit = midwayLit(c, t);
    const u = this.mat.uniforms;
    u.uTime.value = time; u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity; u.uCam.value.copy(camera.position);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.6) / 2.2);
    u.uLit.value = lit; u.uBeat.value = S.pulse ?? 0;
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    for (const e of this.ends) {
      e.mesh.visible = e.t > t - 3 && e.t < t + 46;
      if (!e.mesh.visible) continue;
      S.track.ground(e.t, 0, this._e);
      e.mesh.position.set(this._e.x, floorAt(c, e.t), this._e.z); e.mesh.rotation.set(0, c.sample(e.t).yaw, 0);
    }
    const lu = this.lot.mat.uniforms;
    lu.uFog.value.set(P.fog); lu.uFogDensity.value = P.fogDensity; lu.uCam.value.copy(camera.position); lu.uGrass.value.set(P.ground);
    lu.uSky.value.set(P.skyLight ?? 0x8a8aa8).multiplyScalar((P.hemiK ?? 1.6) * 0.32); lu.uK.value = 0.6 + 0.4 * lit;
    this.lot.update(S.track, S.rider);
    // the score boards' face and the talk's slides
    const M = S.town.mats;
    if (M.scsBoardFaceM) M.scsBoardFaceM.map.offset.y = 0.75 - 0.25 * boardState(t);
  }
  // the big top's lights: bulbs hung down its ridge
  draw(T) {
    const g = this._g, c = this.S.course, track = this.S.track, lit = midwayLit(c, this.S.rider.t);
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(c, f.t);
        for (const x of [-10, 10]) { track.ground(f.t, x, g); T.glow(g.x, fy + 30, g.z, 3.2, BULB, 1.1 * lit); }
        track.ground(f.t, 0, g); T.pool(g.x, fy + 0.1, g.z, 34, BULB, 0.3 * lit);
      }
    }
  }
}
