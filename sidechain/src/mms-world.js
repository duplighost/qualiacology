// Miss Misdemeanor. The pageant is held in the county courthouse, and it is her trial. The square at
// night, the courthouse lit, TONIGHT ✦ MISS MISDEMEANOR in bulbs over the door. In at the door with
// the band: the marble hall and the red runner down it, and a pair of red stilettos walking it beside
// her, a click on every beat ("heels click hard on the courthouse tile"); the lipgloss with a hazard
// beacon turning on its cap; the thrift-store suit with the sash across it; a row of cameras aimed
// across the hall like a firing squad that all go off on "flashes" and again on "squad"; the gallery
// seats, one in the second row RESERVED for MOM with her handbag on it, shaking; her number, 13, on
// a safety pin that shuts on "pin"; the height chart, and the booking camera's flash on "pose". The
// courtroom: the microphone ("state your name"), the judges' bench with its three cards up, 10 10 10,
// turned to GUILTY on "your honor, that's me", the fishbowl a question comes up out of on "win"; the
// lights go down on "I'll take the blame". Every chorus bursts through the curtain onto the stage:
// the orchestra pit under the jump, empty red seats in tiers both sides that all stand up on "stand
// up", the trusses and APPLAUSE, the sashes printed with her rap sheet hung across the road, the
// gavel coming down on "guilty", confetti, the poster torn in two on "tear me apart". The lineup room
// (a height chart round the walls, five numbered places, what each ex left on its hook), the baton on
// the talent stage, EXHIBIT A; the trophy hall (glitter on "weaponize cute"), the open mic and its
// ba-dum, the sequined gown, the script; the dressing room's racks, the match struck on "light me
// up", the gasoline gown zipped on "zip" that goes up on "burn" with fire running ahead down both sides
// of the road into the second chorus, the stage's jets firing on the beat. The witness stand, the oath,
// the masks on their poles turning to face her on "which mask"; out in the street the front pages fly
// in and land, the tiara cage over the road on "tiny cage", the glare. Back inside her name comes up in
// bulbs a letter at a time on "say my name", the stop, and the last chorus bursts through it; the cell
// bars come down on "serving time". At the end, the height chart wall, the booking board, the stool
// with her sash over it, the roses, and the camera's flash.
// The things are in mms-props.js, the course and looks in mms-song.js.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local, signV, col } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room, paint } from './summer.js';
import { AA_GLSL } from './aa.js';
import { MG, cellMat, kMat, glassMat, rapTexture, cardTexture, numberTexture, placardTexture, chartTexture, posterTexture, tentTexture, paperTexture, nameTexture, scriptTexture, brickTexture, questionTexture, slotTexture } from './mms-props.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.45 : -Math.PI / 2 - 0.45);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const GOLDL = [1, 0.78, 0.36], WHITEL = [1, 0.96, 0.92], WARM = [1, 0.86, 0.62], PINKL = [1, 0.32, 0.6], REDL = [1, 0.12, 0.22], AMBERL = [1, 0.6, 0.12],
  COOL = [0.82, 0.92, 1], BLUEL = [0.55, 0.72, 1], FIREL = [1, 0.42, 0.08], YELLOWL = [1, 0.86, 0.3], GREENL = [0.5, 1, 0.55], LILACL = [0.8, 0.6, 1];

// ---------- the house lights ----------
// down to one light for "I'll take the blame", low at the witness stand and for "say my name", out
// for the stop
export function houseLit(T) {
  let k = 1;
  if (T > 42.1 && T < 44.94) k = 0.42;
  if (T > 146.58 && T < 157.88) k = 0.55;
  if (T > 172.0 && T < 179.07) k = 0.5;
  if (T > 179.07 && T < 180.46) k = 0.03;
  return k;
}
// the beat, as a fraction (0 on it) and a decaying pulse
const beatF = (c, T) => ((c.beatAt(T) % 1) + 1) % 1;
const pulse = (c, T, k = 4) => Math.exp(-beatF(c, T) * k);
// in one of the three choruses (the stage's own time)
const CHORUS = [[44.94, 73.16], [112.70, 140.93], [180.46, 214.35]];
const inChorus = (T) => CHORUS.some(([a, b]) => T > a && T < b);
// the camera flashes the place itself lights with (the squad, the pose, the last hit)
const FLASHES = [23.18, 24.64, 33.18, 214.35];

// ---------- materials ----------
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VC = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const pic = (M, key, map, k = 0.6, opts = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.6, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, ...opts }));
let TEX = null;
const tex = () => TEX || (TEX = (() => {
  const chart = chartTexture(); chart.wrapS = THREE.RepeatWrapping;
  return { rap: rapTexture(), card: cardTexture(), number: numberTexture(), placard: placardTexture(), chart, poster: posterTexture(), tent: tentTexture(), paper: paperTexture(), name: nameTexture(), script: scriptTexture(), brick: brickTexture(), question: questionTexture(), slot: slotTexture() };
})());
const paintM = (M) => VC(M, 'mmsPaintM', 0.2, { roughness: 0.55 });
const glossM = (M) => VC(M, 'mmsGlossM', 0.3, { roughness: 0.2, metalness: 0.1 });
const chromeM = (M) => VC(M, 'mmsChromeM', 0.2, { roughness: 0.22, metalness: 0.75 });
const darkM = (M) => VC(M, 'mmsDarkM', 0.1, { roughness: 0.45, metalness: 0.2 });
const velvetM = (M) => VC(M, 'mmsVelvetM', 0.32, { roughness: 0.85 });
const goldM = (M) => VC(M, 'mmsGoldM', 0.55, { roughness: 0.28, metalness: 0.3 });
const marbleM = (M) => VC(M, 'mmsMarbleM', 0.25, { roughness: 0.3 });
const glass = (M) => M.mmsGlassM || (M.mmsGlassM = glassMat());
const cells = (M, key, map, c, r, base = 0.18, gain = 0.9) => M[key] || (M[key] = cellMat(map, c, r, base, gain));
const KV = { aK: 0 }, CK = { aCell: 0, aK: 0 };
const kv = (k) => { KV.aK = k; return KV; };
const ck = (c, k) => { CK.aCell = c; CK.aK = k; return CK; };
// the sash's satin: the rap sheet printed on it, lit from in front
function sashMat(map) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uK: { value: 1 }, uBurn: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */`varying vec2 vUv; varying float vY; void main(){ vUv = uv; vY = position.y; gl_Position = projectionMatrix * (modelViewMatrix * (instanceMatrix * vec4(position, 1.0))); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform float uK, uBurn, uTime; varying vec2 vUv; varying float vY;
      void main(){
        vec3 c = texture2D(map, vUv).rgb;
        float sheen = 0.75 + 0.35 * sin(vUv.x * 9.0 + uTime * 1.3);
        vec3 col = c * (0.5 + 0.9 * uK) * sheen;
        // the second chorus's: scorched along its lower edge, embers in it
        float e = smoothstep(0.32, 0.0, vUv.y) * uBurn;
        col = mix(col, vec3(0.08, 0.02, 0.01), e * 0.8) + vec3(1.0, 0.45, 0.08) * e * (0.6 + 0.6 * sin(vUv.x * 40.0 + uTime * 7.0)) * step(0.06, vUv.y);
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the pieces, registered ----------
const PROP_LAYERS = {
  banner: ['mmsMarquee', 'mmsSignBig'], heels: ['mmsHeel'], gloss: ['mmsGloss', 'mmsBeacon'], suit: ['mmsSuit', 'mmsSuitSash'],
  pin: ['mmsPinBody', 'mmsPinLeg', 'mmsCard', 'mmsCardFace'], chart: ['mmsChart', 'mmsChartFace'], booking: ['mmsBooking'], mic: ['mmsMic'],
  bench: ['mmsBench', 'mmsPaddle', 'mmsPaddleFront', 'mmsPaddleBack'], bowl: ['mmsBowlStand', 'mmsBowl', 'mmsBowlCards', 'mmsQCard', 'mmsQFace'],
  sash: ['mmsSash', 'mmsSashF', 'mmsSashB', 'mmsSashBF'], gavel: ['mmsGavel', 'mmsGavelBlock', 'mmsLightBox', 'mmsSignMid'], poster: ['mmsPosterFrame', 'mmsPosterL', 'mmsPosterR'],
  baton: ['mmsBatonStage', 'mmsBaton'], standup: ['mmsStandup', 'mmsBrick'], gown: ['mmsGown'], script: ['mmsScript', 'mmsScriptFace'],
  match: ['mmsMatchbook', 'mmsMatch'], gasgown: ['mmsGasGown'], stand: ['mmsStand'], paper: ['mmsPaper', 'mmsPaperFace'], cage: ['mmsCage'],
  thirteen: ['mmsCard', 'mmsCardFace'], name: ['mmsNameBoard', 'mmsNameFace'], bars: ['mmsBars'],
};
// what the exes left (made once: five pieces)
let EXES = null;
const exes = () => EXES || (EXES = MG.exes());
// where the sequins catch the light on the gown (points on its skirt and bodice)
const SEQ = Array.from({ length: 40 }, (_, j) => { const y = 1.5 + hash(j * 3.1) * 15, r = y > 11.3 ? 1.5 + (16 - y) * 0.1 : 5.2 - (y - 0.6) * 0.33, a = -1.2 + hash(j * 7.7) * 2.4; return [Math.sin(a) * r, y, Math.cos(a) * r]; });

extend({
  layers: {
    mmsMarquee: (M) => [MG.marquee(), goldM(M), 2, {}],
    mmsSignBig: (M) => [MG.signFace(44, 7), M.sign, 2, { aIdx: 1, aWake: 2 }],
    mmsSignMid: (M) => [MG.signFace(12, 3.6), M.sign, 60, { aIdx: 1, aWake: 2 }],
    mmsSignSmall: (M) => [MG.signFace(2.3, 1.45), M.sign, 2, { aIdx: 1, aWake: 2 }],
    mmsColumn: (M) => [MG.column(), marbleM(M), 40, {}],
    mmsHeel: (M) => [MG.heel(), VC(M, 'mmsPatentM', 0.35, { roughness: 0.12, metalness: 0.15 }), 2, {}],
    mmsGloss: (M) => [MG.gloss(), glossM(M), 2, {}],
    mmsBeacon: (M) => [MG.beacon(), M.mmsBeaconM || (M.mmsBeaconM = kMat(0.3, 2.2)), 2, { aK: 1 }],
    mmsSuit: (M) => [MG.suit(), paintM(M), 2, {}],
    mmsSuitSash: (M) => [MG.suitSash(), M.mmsSashKM || (M.mmsSashKM = kMat(0.35, 1.8)), 2, { aK: 1 }],
    mmsCamera: (M) => [MG.camera(), darkM(M), 24, {}],
    mmsRiser: (M) => [MG.riser(4), velvetM(M), 200, {}],
    mmsRiser3: (M) => [MG.riser(3), velvetM(M), 16, {}],
    mmsCushion: (M) => [MG.cushions(), velvetM(M), 860, {}],
    mmsHandbag: (M) => [MG.handbag(), glossM(M), 2, {}],
    mmsPinBody: (M) => [MG.pinBody(), chromeM(M), 2, {}],
    mmsPinLeg: (M) => [MG.pinLeg(), chromeM(M), 2, {}],
    mmsCard: (M) => [MG.card(), paintM(M), 4, {}],
    mmsCardFace: (M) => [MG.cardFace(), cells(M, 'mmsNumberM', tex().number, 1, 1, 0.25, 0.8), 4, { aCell: 1, aK: 1 }],
    mmsChart: (M) => [MG.chart(), darkM(M), 2, {}],
    mmsChartFace: (M) => [MG.chartFace(), cells(M, 'mmsChartM', tex().chart, 1, 1, 0.3, 0.7), 2, { aCell: 1, aK: 1 }],
    mmsBooking: (M) => [MG.booking(), paintM(M), 2, {}],
    mmsMic: (M) => [MG.mic(), chromeM(M), 2, {}],
    mmsBench: (M) => [MG.bench(), paintM(M), 2, {}],
    mmsPaddle: (M) => [MG.paddle(), paintM(M), 6, {}],
    mmsPaddleFront: (M) => [MG.paddleFace(false), cells(M, 'mmsCardM', tex().card, 2, 1, 0.3, 0.9), 6, { aCell: 1, aK: 1 }],
    mmsPaddleBack: (M) => [MG.paddleFace(true), cells(M, 'mmsCardM', tex().card, 2, 1, 0.3, 0.9), 6, { aCell: 1, aK: 1 }],
    mmsBowlStand: (M) => [MG.bowlStand(), glossM(M), 2, {}],
    mmsBowl: (M) => [MG.bowl(), glass(M), 2, {}],
    mmsBowlCards: (M) => [MG.bowlCards(), paintM(M), 2, {}],
    mmsQCard: (M) => [MG.qcard(), paintM(M), 2, {}],
    mmsQFace: (M) => [MG.qcardFace(), pic(M, 'mmsQM', tex().question, 0.7), 2, {}],
    mmsRail: (M) => [MG.rail(), paintM(M), 40, {}],
    mmsSash: (M) => [MG.sash(false), M.mmsSashM || (M.mmsSashM = sashMat(tex().rap)), 4, {}],
    mmsSashF: (M) => [MG.sash(true), M.mmsSashM || (M.mmsSashM = sashMat(tex().rap)), 4, {}],
    mmsSashB: (M) => [MG.sash(false), M.mmsSashBM || (M.mmsSashBM = sashMat(tex().rap)), 4, {}],
    mmsSashBF: (M) => [MG.sash(true), M.mmsSashBM || (M.mmsSashBM = sashMat(tex().rap)), 4, {}],
    mmsGavel: (M) => [MG.gavel(), glossM(M), 4, {}],
    mmsGavelBlock: (M) => [MG.gavelBlock(), glossM(M), 4, {}],
    mmsLightBox: (M) => [MG.lightBox(), darkM(M), 60, {}],
    mmsPosterFrame: (M) => [MG.posterFrame(), goldM(M), 2, {}],
    mmsPosterL: (M) => [MG.posterHalf(false), pic(M, 'mmsPosterM', tex().poster, 0.75), 2, {}],
    mmsPosterR: (M) => [MG.posterHalf(true), pic(M, 'mmsPosterM', tex().poster, 0.75), 2, {}],
    mmsTruss: (M) => [MG.truss(), chromeM(M), 40, {}],
    mmsJet: (M) => [MG.jet(), darkM(M), 80, {}],
    mmsLineWall: (M) => [MG.lineWall(), darkM(M), 12, {}],
    mmsLineFace: (M) => [MG.lineFace(), cells(M, 'mmsChartM', tex().chart, 1, 1, 0.3, 0.7), 12, { aCell: 1, aK: 1 }],
    mmsSlot: (M) => [MG.slotFace(), cells(M, 'mmsSlotM', tex().slot, 5, 1, 0.3, 1.0), 12, { aCell: 1, aK: 1 }],
    mmsEx0: (M) => [exes()[0], paintM(M), 4, {}],
    mmsEx1: (M) => [exes()[1], glossM(M), 4, {}],
    mmsEx2: (M) => [exes()[2], glossM(M), 4, {}],
    mmsEx3: (M) => [exes()[3], paintM(M), 4, {}],
    mmsEx4: (M) => [exes()[4], glossM(M), 4, {}],
    mmsBatonStage: (M) => [MG.batonStage(), glossM(M), 2, {}],
    mmsBaton: (M) => [MG.baton(), chromeM(M), 2, {}],
    mmsEvidence: (M) => [MG.evidence(), paintM(M), 10, {}],
    mmsBags: (M) => [MG.evidenceBags(), glass(M), 10, {}],
    mmsTent: (M) => [MG.tent(), paintM(M), 10, {}],
    mmsTentFace: (M) => [MG.tentFace(), cells(M, 'mmsTentM', tex().tent, 5, 1, 0.35, 0.9), 10, { aCell: 1, aK: 1 }],
    mmsTrophies: (M) => [MG.trophies(), goldM(M), 60, {}],
    mmsStandup: (M) => [MG.standup(), darkM(M), 2, {}],
    mmsBrick: (M) => [MG.brickFace(), pic(M, 'mmsBrickM', tex().brick, 0.35), 2, {}],
    mmsGown: (M) => [MG.gown(), VC(M, 'mmsGownM', 0.6, { roughness: 0.2, metalness: 0.3 }), 2, {}],
    mmsGasGown: (M) => [MG.gasgown(), glossM(M), 2, {}],
    mmsRack0: (M) => [MG.rack(0), VC(M, 'mmsSequinM', 0.35, { roughness: 0.25, metalness: 0.55 }), 24, {}],
    mmsRack1: (M) => [MG.rack(1), VC(M, 'mmsSequinM', 0.35, { roughness: 0.25, metalness: 0.55 }), 24, {}],
    mmsRack2: (M) => [MG.rack(2), VC(M, 'mmsSequinM', 0.35, { roughness: 0.25, metalness: 0.55 }), 24, {}],
    mmsScript: (M) => [MG.script(), darkM(M), 2, {}],
    mmsScriptFace: (M) => [MG.scriptFace(), pic(M, 'mmsScriptM', tex().script, 0.6), 2, {}],
    mmsMatchbook: (M) => [MG.matchbook(), paintM(M), 2, {}],
    mmsMatch: (M) => [MG.match(), paintM(M), 2, {}],
    mmsStand: (M) => [MG.stand(), paintM(M), 2, {}],
    mmsMaskPole: (M) => [MG.maskPole(), darkM(M), 50, {}],
    mmsMask: (M) => [MG.mask(), VC(M, 'mmsMaskM', 0.45, { roughness: 0.35 }), 50, {}],
    mmsPaper: (M) => [MG.paper(), paintM(M), 4, {}],
    mmsPaperFace: (M) => [MG.paperFace(), cells(M, 'mmsPaperM', tex().paper, 2, 2, 0.35, 0.75), 4, { aCell: 1, aK: 1 }],
    mmsCage: (M) => [MG.cage(), goldM(M), 2, {}],
    mmsNameBoard: (M) => [MG.nameBoard(), goldM(M), 2, {}],
    mmsNameFace: (M) => [MG.nameFace(), cells(M, 'mmsNameM', tex().name, 4, 4, 0.25, 1.3), 2, { aCell: 1, aK: 1 }],
    mmsBars: (M) => [MG.bars(), chromeM(M), 2, {}],
    mmsBoard: (M) => [MG.board(), glossM(M), 30, {}],
    mmsBoardFace: (M) => [MG.boardFace(), M.sign, 30, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // ---- the set-pieces, each where it's sung ----
    mmsProp(S, it, p, q, yaw) {
      const L = S.layers, k = it.kind;
      if (!S.track) { for (const n of PROP_LAYERS[k] || []) void L[n]; return; }
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, c = S.course, lit = houseLit(T);
      const at = S._mmv || (S._mmv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const E = S._mmE || (S._mmE = new THREE.Euler(0, 0, 0, 'YXZ'));
      // (yaw first, then the piece's own turn about its x and z)
      const quat = (key, ry = 0, rx = 0, rz = 0) => { E.set(rx, yaw + ry, rz, 'YXZ'); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(E); };
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (x, y, z, size, cl, k2) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, cl, k2); };
      const spot = (k2, cl = WHITEL, r = 26) => poolAt(S, at.x, (it.h ?? 0) + 0.2, at.z, r * s, cl, k2);
      const sgn = S.atlas.index;
      const after = (t0, d = 1) => (T > t0 ? Math.exp(-(T - t0) / d) : 0);
      if (k === 'banner') {
        // TONIGHT ✦ MISS MISDEMEANOR over the courthouse door, its bulbs chasing round it
        put('mmsMarquee'); put('mmsSignBig', 0, 0, 0.05, q, s, signV(sgn.mmsTONIGHT, 0.75 + 0.25 * pulse(c, T)));
        const ch = Math.floor(T * 9);
        for (let j = 0; j < 44; j++) {
          const u = j / 44, per = 2 * (47 + 9.2), d = u * per; let x, y;
          if (d < 47) { x = -23.5 + d; y = 4.6; } else if (d < 56.2) { x = 23.5; y = 4.6 - (d - 47); } else if (d < 103.2) { x = 23.5 - (d - 56.2); y = -4.6; } else { x = -23.5; y = -4.6 + (d - 103.2); }
          light(x, y, 0.7, 1.0, GOLDL, (j + ch) % 3 === 0 ? 1.5 : 0.45);
        }
        light(0, 0, 3, 46, GOLDL, 0.12);
      } else if (k === 'heels') {
        // a pair of red stilettos walking the tile beside her, a step a beat, a click as each lands
        const [w0, w1] = it.walk;
        if (T < w0 - 0.5 || T > w1 + 0.5) return;
        // (where they are on the road at song time T2: two seconds ahead of her at first, walking at
        // two fifths of her pace, so she draws level with them a little after "courthouse tile")
        const wt = (T2) => { const u = Math.max(w0, Math.min(w1, T2)); return u + 2.2 - (u - w0) * 0.6; };
        const bi = c.beatAt(T), hq = S._mmhq || (S._mmhq = new THREE.Quaternion()), pos = S._mmhp || (S._mmhp = new THREE.Vector3());
        for (const foot of [0, 1]) {
          const n = Math.floor((bi - foot) / 2), pb = 2 * n + foot, u = bi - pb;
          const ta = wt(c.timeOfBeat(pb)), tb = wt(c.timeOfBeat(pb + 2));
          let tt = ta, lift = 0, pitch = 0;
          if (u >= 1) { const v = u - 1, e = v * v * (3 - 2 * v); tt = ta + (tb - ta) * e; lift = Math.sin(Math.PI * v) * 2.6; pitch = -0.25 * Math.sin(Math.PI * v); }
          const yw = S.track.groundYaw(tt, it.x + (foot ? 2.1 : -2.1), pos);
          pos.y = floorAt(c, tt) + lift;
          E.set(pitch, yw, 0, 'YXZ'); hq.setFromEuler(E);
          m.compose(pos, hq, S._s.set(s, s, s)); L.mmsHeel.add(m);
          // the click: a spark of light at the heel's point as it comes down
          if (u < 0.22 && T > w0 && T < w1) { const w = local(pos, yw, 0, 0.2, -4.05 * s, S._o); glowAt(S, w.x, w.y, w.z, 3.2 * s, WHITEL, 1.8 * (1 - u / 0.22)); poolAt(S, w.x, pos.y + 0.1, w.z, 7 * s, PINKL, 0.9 * (1 - u / 0.22)); }
          poolAt(S, pos.x, floorAt(c, tt) + 0.1, pos.z, 10 * s, REDL, 0.25);
        }
      } else if (k === 'gloss') {
        // the lipgloss with a hazard beacon on its cap: turning, and on "hazard sign" going round fast
        const act = smooth(it.on - 0.15, it.on + 0.1, T) * (1 - smooth(it.off, it.off + 0.6, T));
        put('mmsGloss'); put('mmsBeacon', 0, 0, 0, q, s, kv(0.25 + 0.75 * act + 0.15 * Math.sin(T * 3)));
        const ang = T * (1.5 + 8 * act);
        for (let j = 0; j < 5; j++) { const a = ang - j * 0.16; light(Math.cos(a) * 2.4, 16.1, Math.sin(a) * 2.4, 2.4 + 0.4 * act, AMBERL, (0.3 + 1.7 * act) * (1 - j / 5)); }
        light(0, 16.1, 0, 10, AMBERL, 0.15 + 0.8 * act); spot(0.25 + 0.75 * act, AMBERL, 30);
        light(1.0, 6, 1.6, 3.4, PINKL, 0.5); light(-0.6, 9, 1.7, 2.0, WHITEL, 0.6);
      } else if (k === 'suit') {
        // the thrift-store suit; the sash across it lights on "sash"
        put('mmsSuit'); put('mmsSuitSash', 0, 0, 0, q, s, kv(0.15 + 0.85 * smooth(it.sash - 0.1, it.sash + 0.15, T) + 0.5 * after(it.sash, 0.5)));
        spot(0.4 * lit, WARM, 18); light(0, 16, 4, 16, WARM, 0.18 * lit);
        if (T > it.sash && T < it.sash + 0.8) light(0, 10.4, 1.4, 9, PINKL, 1.2 * (1 - (T - it.sash) / 0.8));
      } else if (k === 'pin') {
        // her number, 13, on a safety pin: open, then shut on "pin"
        const sh = smooth(it.shut - 0.12, it.shut, T), bo = T > it.shut ? 0.06 * Math.exp(-(T - it.shut) * 9) * Math.sin((T - it.shut) * 40) : 0;
        put('mmsCard', 0, 6.4, 0); put('mmsCardFace', 0, 6.4, 0, q, s, ck(0, 0.65 + 0.35 * lit));
        put('mmsPinBody', 0, 9.0, 0.6);
        put('mmsPinLeg', -7.2, 9.9, 0.6, quat('_mmpl', 0, 0, 0.55 * (1 - sh) + bo));
        if (T > it.shut && T < it.shut + 0.6) light(7.8, 9.0, 1.4, 6, WHITEL, 1.8 * (1 - (T - it.shut) / 0.6));
        light(0, 6.4, 5, 16, WARM, 0.2 * lit); spot(0.4 * lit, WARM, 18);
      } else if (k === 'chart') {
        // the height chart along the wall; the booking flash lights all of it
        put('mmsChart'); put('mmsChartFace', 0, 0, 0, q, s, ck(0, 0.55 + 0.45 * lit + 1.4 * after(it.flash, 0.25)));
        if (T > it.flash - 0.05 && T < it.flash + 0.4) light(0, 12, 4, 60, WHITEL, 1.4 * after(it.flash, 0.12));
      } else if (k === 'booking') {
        // the booking camera and its umbrella; it goes off on "pose"
        put('mmsBooking');
        const f = after(it.flash, 0.15);
        light(5.4, 14, 1.2, 8 + 10 * f, WHITEL, 0.15 + 2.4 * f);
        light(0, 9.9, 4.2, 2, BLUEL, 0.5);
      } else if (k === 'mic') {
        // the pageant's microphone, a spotlight on it; it hums with the vocal
        put('mmsMic');
        const b = pulse(c, T, 5);
        light(0, 11.2, 1.0, 3 + b, WHITEL, 0.6 + 0.6 * b); spot(0.55 * lit, WHITEL, 16);
        light(0, 22, 0, 26, WHITEL, 0.12 * lit);
      } else if (k === 'bench') {
        // the judges' bench; their cards come up on "plea", 10 10 10, and turn on "that's me": GUILTY
        put('mmsBench');
        const up = smooth(it.up - 0.2, it.up + 0.2, T), fl = smooth(it.flip - 0.2, it.flip + 0.15, T);
        for (let j = 0; j < 3; j++) {
          const x = -6.4 + j * 6.4, fj = smooth(it.flip - 0.2 + j * 0.12, it.flip + 0.1 + j * 0.12, T);
          const qq = quat('_mmpd' + j, Math.PI * fj, 0, 0.12 * Math.sin(T * 2 + j));
          const y = 4.2 + 7.0 * up;
          put('mmsPaddle', x, y, -1.4, qq); put('mmsPaddleFront', x, y, -1.4, qq, s, ck(0, 0.6 + 0.4 * lit)); put('mmsPaddleBack', x, y, -1.4, qq, s, ck(1, 0.6 + 0.4 * lit + 0.6 * after(it.flip + j * 0.12, 0.4)));
          light(x, 9.7, 1.4, 3, GREENL, 0.5 * lit);
        }
        for (const x of [-9, 9]) { light(x, 9.6, 1.4, 4, GREENL, 0.8 * lit); }
        if (fl > 0 && T < it.flip + 1.2) light(0, 15, 2, 30, REDL, 0.6 * after(it.flip, 0.5));
        spot(0.45 * lit, WARM, 30); light(0, 18, 4, 30, WARM, 0.15 * lit);
      } else if (k === 'bowl') {
        // the fishbowl of questions; on "win" one comes up out of it and opens
        put('mmsBowlStand'); put('mmsBowlCards'); put('mmsBowl');
        const u = clamp((T - (it.pull - 0.15)) / 0.9, 0, 1), e = u * u * (3 - 2 * u);
        if (u > 0) { const qq = quat('_mmqc', 0.4 * (1 - e), -1.4 * (1 - e)); put('mmsQCard', 0, 10.2 + 9 * e, 0, qq); put('mmsQFace', 0, 10.2 + 9 * e, 0, qq); light(0, 19, 2, 10, GOLDL, 0.5 * e + 1.2 * after(it.pull + 0.75, 0.5)); }
        light(0, 11.4, 0, 9, PINKL, 0.3); spot(0.45 * lit, WARM, 18);
      } else if (k === 'sash') {
        // a sash across the road, the rap sheet printed down it; it swings in on its line
        const sm = c.sample(it.t, S._mmSs || (S._mmSs = {})), yw = sm.yaw;
        const e = smooth(it.on - 1.6, it.on, T);
        E.set(0, yw, 0.05 * Math.sin(T * 0.9 + it.t), 'YXZ'); const sq = (S._mmsq || (S._mmsq = new THREE.Quaternion())).setFromEuler(E);
        p.y = sm.y + (it.above ?? 16) + 40 * (1 - e);
        m.compose(p, sq, S._s.set(s, s, s));
        L[it.burnt ? (it.flip ? 'mmsSashBF' : 'mmsSashB') : (it.flip ? 'mmsSashF' : 'mmsSash')].add(m);
        const kk = after(it.on, 0.8);
        for (let j = 0; j < 7; j++) { const x = (j / 6 * 2 - 1) * 50, xx = it.flip ? -x : x; const y = 12 - 0.13 * xx - 10 * (1 - (x / 58) ** 2); const w = local(p, yw, -x * s, (y + 3.2) * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 3 * s, it.burnt ? FIREL : GOLDL, 0.5 + 1.4 * kk); }
      } else if (k === 'gavel') {
        // the gavel: raised, then down on "guilty", GUILTY lit over it
        put('mmsGavelBlock');
        const h = it.hit, wind = smooth(h - 0.9, h - 0.25, T), down = smooth(h - 0.14, h, T);
        const bo = T > h ? 0.14 * Math.exp(-(T - h) * 7) * Math.abs(Math.sin((T - h) * 18)) : 0;
        const ang = -(0.5 + 0.6 * wind) * (1 - down) - bo;
        put('mmsGavel', 0, 4.2, 0, quat('_mmgv', 0, ang));
        const g = after(h, 0.35);
        if (T > h) { for (let j = 0; j < 18; j++) { const a = j / 18 * Math.PI * 2, r = 5 + 26 * (1 - Math.exp(-(T - h) * 4)); light(Math.cos(a) * r, 2.6, 13.2 + Math.sin(a) * r, 2.4, j % 2 ? GOLDL : WHITEL, 2.2 * g); } }
        put('mmsLightBox', 0, 21, 13.2); put('mmsSignMid', 0, 21, 13.82, q, s, signV(sgn.mmsGUILTY, T > h ? ((Math.floor((T - h) * 10) % 2) || T > h + 0.6 ? 1 : 0.3) : 0.12));
        if (T > h) light(0, 21, 15, 22, REDL, 0.25 + 1.4 * g);
        spot(0.4 + 1.4 * g, T > h ? REDL : WARM, 30); light(0, 6, 13.2, 14, WARM, 0.2);
      } else if (k === 'poster') {
        // the pageant's poster: torn in two on "tear me apart", the halves swinging open
        put('mmsPosterFrame');
        const u = clamp((T - it.tear) / 0.5, 0, 1), sw = u * u * (3 - 2 * u), wob = T > it.tear ? 0.08 * Math.exp(-(T - it.tear) * 2) * Math.sin((T - it.tear) * 9) : 0;
        put('mmsPosterL', -6.8, 25.6, 0, quat('_mmpL', 0, 0, -1.1 * sw - wob));
        put('mmsPosterR', 6.8, 25.6, 0, quat('_mmpR', 0, 0, 1.1 * sw + wob));
        if (T > it.tear && T < it.tear + 1.4) for (let j = 0; j < 16; j++) { const v = T - it.tear, a = hash(j) * 6.28; light(Math.cos(a) * 6 * v, 14 + 8 * v - 6 * v * v + hash(j + 4) * 6, 1 + Math.sin(a) * 2, 1.2, WHITEL, 1.4 * (1 - v / 1.4)); }
        light(0, 14, 4, 26, WARM, 0.2); spot(0.5, PINKL, 22);
      } else if (k === 'baton') {
        // the talent: the baton spinning over its stage; on "talent" up it goes, and back
        put('mmsBatonStage');
        const v = T - it.toss, y = v > 0 && v < 1.86 ? 26 * v - 14 * v * v : 0;
        put('mmsBaton', 0, 10.5 + y, 0, quat('_mmbt', 0, 0, T * (7 + (v > 0 && v < 1.86 ? 8 : 0))));
        light(-7.4 * Math.cos(T * 7), 10.5 + y - 7.4 * Math.sin(T * 7), 0.6, 2, WHITEL, 0.8);
        light(0, 24, 0, 12, WHITEL, 0.3); spot(0.65, WHITEL, 16);
        light(0, 4.4, -4.8, 6, GOLDL, 0.4);
      } else if (k === 'standup') {
        // the open mic: bricks, a stool, a stand; the spot snaps on for "punchline"
        put('mmsStandup'); put('mmsBrick');
        const sp = T > it.punch - 0.1 ? 0.6 + 1.0 * after(it.punch, 0.8) : 0.12;
        spot(0.9 * sp, WARM, 12); light(-2.4, 10.1, 1.0, 3, WARM, sp); light(0, 26, 4, 10, WHITEL, 0.4 * sp);
      } else if (k === 'gown') {
        // the sequined gown: every sequin catching the light, all of them on "sequined"
        put('mmsGown');
        const on = smooth(it.on - 0.1, it.on + 0.1, T), sp = 0.45 + 0.9 * on;
        for (let j = 0; j < SEQ.length; j++) { const tw = Math.max(0, Math.sin(T * (3 + hash(j) * 4) + j * 2.1)); light(SEQ[j][0], SEQ[j][1], SEQ[j][2], 0.9 + 0.6 * tw, j % 3 ? WHITEL : PINKL, (0.2 + 1.4 * tw * tw) * sp); }
        spot(0.3 + 0.7 * on, WHITEL, 22); light(0, 28, 4, 14, WHITEL, 0.2 + 0.6 * on);
        // the light it throws: specks on the floor going round
        if (on > 0) for (let j = 0; j < 10; j++) { const a = j * 0.628 + T * 0.6, r = 14 + 6 * hash(j); const w = local(at, yaw, Math.cos(a) * r * s, 0.3, Math.sin(a) * r * s, S._o); poolAt(S, w.x, w.y, w.z, 2.4, WHITEL, 0.7 * on); }
      } else if (k === 'script') {
        // the script on its stand: the lines she reads lit on "reading"
        put('mmsScript'); put('mmsScriptFace');
        const on = smooth(it.on - 0.2, it.on + 0.2, T);
        light(0, 13, 6, 9, WARM, 0.25 + 0.7 * on); spot(0.35 + 0.4 * on, WARM, 16);
      } else if (k === 'match') {
        // the matchbook, a match standing up out of it: struck on "light me up", and burning
        put('mmsMatchbook'); put('mmsMatch', 3.4, 0, 3.4);
        if (T > it.strike) {
          const v = T - it.strike, fl = 0.8 + 0.2 * Math.sin(T * 31) * Math.sin(T * 17);
          light(3.4, 11.4, 3.4, 3 + 9 * Math.exp(-v * 5), YELLOWL, (1.2 + 2.0 * Math.exp(-v * 4)) * fl);
          for (let j = 0; j < 4; j++) light(3.4 + Math.sin(T * 9 + j) * 0.3, 11.6 + j * 0.9, 3.4, 1.6 - j * 0.3, j < 2 ? FIREL : YELLOWL, 1.3 * fl);
          spot(0.7 * fl, FIREL, 26);
        } else spot(0.3, PINKL, 18);
      } else if (k === 'gasgown') {
        // the gasoline gown: zipped up on "zip", dripping, and on "burn" it goes up
        put('mmsGasGown');
        const zu = clamp((T - it.zip) / 0.6, 0, 1);
        if (zu > 0 && zu < 1) light(0, 6 + 10 * zu, -1.6, 2.4, WHITEL, 1.8);
        for (let j = 0; j < 4; j++) { const f = (T * 0.7 + j * 0.25) % 1; light(-3 + j * 2, 1.4 - f * 1.2, 4.6, 0.8, AMBERL, 0.8 * (1 - f)); }
        if (T > it.burn) {
          const v = T - it.burn, kk = Math.min(1, v * 3);
          for (let j = 0; j < 18; j++) { const f = (T * (0.9 + hash(j)) + hash(j * 3)) % 1, a = hash(j * 5) * 6.28, r = 2 + 3 * (1 - f); light(Math.cos(a) * r, 2 + f * 22, Math.sin(a) * r, 2.6 + 3 * (1 - f), f < 0.5 ? YELLOWL : FIREL, 1.6 * kk * (1 - f)); }
          spot(1.2 * kk, FIREL, 40); light(0, 12, 0, 40, FIREL, 0.5 * kk);
        } else { spot(0.45, PINKL, 20); light(0, 14, 4, 14, PINKL, 0.2); }
      } else if (k === 'stand') {
        // the witness stand: the book on its lectern lit on "swear", one cold light over it all
        put('mmsStand');
        const on = smooth(it.swear - 0.1, it.swear + 0.2, T);
        light(3.0, 10.4, 2.6, 4, WARM, 0.3 + 1.2 * on); spot(0.25 + 0.9 * on, COOL, 22);
        light(0, 30, 0, 18, COOL, 0.15 + 0.5 * on); light(-3.6, 12.4, 2.4, 1.6, WHITEL, 0.4);
      } else if (k === 'paper') {
        // a front page flying in, spinning, landing face out on its word
        const u = clamp((T - (it.land - 0.95)) / 0.95, 0, 1);
        if (u <= 0) return;
        const e = 1 - (1 - u) * (1 - u), sm = c.sample(it.t, S._mmSp || (S._mmSp = {}));
        const spin = (1 - e) * 16 + (T > it.land ? 0.04 * Math.sin((T - it.land) * 3) * Math.exp(-(T - it.land)) : 0);
        const sc = s * (0.25 + 0.75 * e);
        at.y = sm.y + (it.above ?? 0) + 6.2 + 30 * (1 - e);
        const w = local(at, yaw, 0, 0, 70 * (1 - e) * s, S._o);
        E.set(0, yaw, spin, 'YXZ'); const pq = (S._mmpq || (S._mmpq = new THREE.Quaternion())).setFromEuler(E);
        m.compose(w, pq, S._s.set(sc, sc, sc)); L.mmsPaper.add(m); L.mmsPaperFace.add(m, ck(it.cell, 0.7 + 0.8 * after(it.land, 0.6)));
        if (T > it.land) { glowAt(S, w.x, w.y, w.z, 22 * s, WARM, 0.5 * after(it.land, 0.4)); }
        glowAt(S, w.x, w.y + 9 * s, w.z, 8 * s, WARM, 0.2);
      } else if (k === 'cage') {
        // the tiara cage over the road: its jewels coming on, a hoop at a time, as she goes in
        const sm = c.sample(it.t, S._mmSc || (S._mmSc = {})), yw = sm.yaw;
        p.y = sm.y + (it.above ?? -14);
        E.set(0, yw, 0, 'YXZ'); const cq = (S._mmcq || (S._mmcq = new THREE.Quaternion())).setFromEuler(E);
        m.compose(p, cq, S._s.set(s, s, s)); L.mmsCage.add(m);
        const Z = [-28, -14, 0, 14, 28];
        for (let h = 0; h < 5; h++) {
          const on = smooth(it.on + h * 0.12, it.on + h * 0.12 + 0.15, T);
          for (let j = 0; j < 9; j++) { const a = Math.PI * (j + 0.5) / 9, x = Math.cos(a) * 30, y = Math.sin(a) * 46 - 6; const w = local(p, yw, x * s, y * s, Z[h] * s, S._o); glowAt(S, w.x, w.y, w.z, 2.2 * s, j % 2 ? WHITEL : PINKL, 0.25 + 1.4 * on * (0.7 + 0.3 * Math.sin(T * 6 + j + h))); }
          const tw = local(p, yw, 0, 49 * s, Z[h] * s, S._o); glowAt(S, tw.x, tw.y, tw.z, 5 * s, GOLDL, 0.3 + 1.6 * on);
        }
      } else if (k === 'thirteen') {
        // "how can you contest a thirteen": her number on its easel, lit on it
        const on = smooth(it.on - 0.1, it.on + 0.1, T);
        put('mmsCard', 0, 6.4, 0); put('mmsCardFace', 0, 6.4, 0, q, s, ck(0, 0.35 + 0.65 * on + 0.8 * after(it.on, 0.5)));
        spot(0.2 + 0.8 * on, WARM, 18); light(0, 6.4, 4, 14, WARM, 0.1 + 0.5 * on);
      } else if (k === 'name') {
        // her name in bulbs over the way through, a letter at a time on "say my name", all of it on "something"
        const n = T < it.from ? 0 : Math.min(15, 1 + Math.floor((T - it.from) / (it.to - it.from) * 15));
        const all = T > it.all ? (Math.floor((T - it.all) * 8) % 2 ? 1.4 : 0.9) : 1;
        put('mmsNameBoard'); put('mmsNameFace', 0, 0, 0, q, s, ck(n, 0.3 + 0.7 * all));
        const ch = Math.floor(T * 10);
        for (let j = 0; j < 40; j++) { const d = j / 40 * 2 * (68 + 11); let x, y; if (d < 68) { x = -34 + d; y = 5.5; } else if (d < 79) { x = 34; y = 5.5 - (d - 68); } else if (d < 147) { x = 34 - (d - 79); y = -5.5; } else { x = -34; y = -5.5 + (d - 147); } light(x, y, 0.8, 1.1, GOLDL, n ? ((j + ch) % 4 === 0 ? 1.6 : 0.5) : 0.15); }
        light(0, 0, 4, 50, GOLDL, 0.05 + 0.02 * n + (T > it.all ? 0.2 : 0));
      } else if (k === 'bars') {
        // the cell's bars come down across the road on "serving time", and stay down over her
        const sm = c.sample(it.t, S._mmSb || (S._mmSb = {}));
        const u = clamp((T - (it.down - 0.35)) / 0.35, 0, 1), bo = T > it.down ? 1.2 * Math.exp(-(T - it.down) * 8) * Math.abs(Math.sin((T - it.down) * 20)) : 0;
        p.y = sm.y + 10 + 70 * (1 - u * u) + bo;
        E.set(0, sm.yaw, 0, 'YXZ'); const bq = (S._mmbq || (S._mmbq = new THREE.Quaternion())).setFromEuler(E);
        m.compose(p, bq, S._s.set(s, s, s)); L.mmsBars.add(m);
        if (T > it.down && T < it.down + 0.8) for (let j = 0; j < 12; j++) { const w = local(p, sm.yaw, (-28 + j * 5) * s, 0.4, 0, S._o); glowAt(S, w.x, w.y, w.z, 3, WHITEL, 2 * (1 - (T - it.down) / 0.8)); }
        for (const x of [-30, 30]) { const w = local(p, sm.yaw, x * s, 34 * s, 0, S._o); glowAt(S, w.x, w.y, w.z, 6, BLUEL, 0.6); }
      }
    },
    // the hall's columns
    mmsColumn(S, it, p, q) {
      if (!S.track) { void S.layers.mmsColumn; return; }
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.mmsColumn.add(m);
      glowAt(S, p.x, p.y + 27.5, p.z, 4, WARM, 0.35 * houseLit(S.tNow ?? 0));
    },
    // a stand of seats, its tiers; the cushions down (someone in every one) until the crowd stands up
    mmsSeat(S, it, p, q, yaw) {
      const L = S.layers, tiers = it.tiers ?? 4; void L[tiers === 4 ? 'mmsRiser' : 'mmsRiser3']; void L.mmsCushion; if (it.mom) { void L.mmsHandbag; void L.mmsSignSmall; }
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, c = S.course;
      m.compose(p, q, S._s.set(1, 1, 1)); L[tiers === 4 ? 'mmsRiser' : 'mmsRiser3'].add(m);
      const E = S._mmE || (S._mmE = new THREE.Euler(0, 0, 0, 'YXZ')), cq = S._mmcu || (S._mmcu = new THREE.Quaternion());
      let upK = 0, popAt = -1;
      for (const [a, b] of it.up || []) {
        const ft = a + it.seed * 0.35, ft2 = b + it.seed * 0.3;
        if (T > ft - 0.1 && T < ft2 + 0.6) { upK = Math.max(upK, smooth(ft, ft + 0.14, T) * (1 - smooth(ft2, ft2 + 0.35, T))); popAt = ft; }
      }
      const cheer = inChorus(T) && upK > 0.9 ? 0.06 * pulse(c, T, 5) : 0;
      const shake = it.mom && T > it.mom.from && T < it.mom.to ? 0.05 * Math.sin(T * 47) * Math.sin(T * 13) : 0;
      for (let i = 0; i < tiers; i++) {
        const top = 1.2 + i * 2.2, zb = -i * 5.4 - 5.4 + 1.0;
        const ti = clamp(upK * 1.15 - i * 0.05, 0, 1);
        const ang = -1.42 * ti + cheer * ti + (it.mom && i === 1 ? shake : 0);
        const w = local(p, yaw, 0, top + 1.0, zb + 0.35, S._o);
        E.set(ang, yaw, 0, 'YXZ'); cq.setFromEuler(E);
        m.compose(w, cq, S._s.set(1, 1, 1)); L.mmsCushion.add(m);
        if (popAt > 0 && T > popAt + i * 0.05 && T < popAt + i * 0.05 + 0.45) { const g = local(p, yaw, 0, top + 3.0, zb + 1.2, S._o); glowAt(S, g.x, g.y, g.z, 9, GOLDL, 1.1 * (1 - (T - popAt - i * 0.05) / 0.45)); }
        // stood up, the crowd's cameras go off all over the stands
        if (ti > 0.9) { const ev = Math.floor(T * 5 + it.seed * 20 + i * 3.7); if (hash(ev * 1.3 + it.seed * 17 + i) > 0.8) { const f = 1 - ((T * 5 + it.seed * 20 + i * 3.7) % 1) * 2.5; if (f > 0) { const g = local(p, yaw, -4.5 + 3 * Math.floor(hash(ev + i) * 4), top + 6.5, zb + 0.5, S._o); glowAt(S, g.x, g.y, g.z, 5 + 4 * f, WHITEL, 2.0 * f); } } }
      }
      // the aisle lights along the tiers' fronts
      for (let i = 0; i < tiers; i++) { const g = local(p, yaw, 6.6, 1.3 + i * 2.2, -i * 5.4 - 0.2, S._o); glowAt(S, g.x, g.y, g.z, 1.2, GOLDL, 0.9); }
      // her mother's seat: second row, RESERVED, the handbag on it
      if (it.mom) {
        const w = local(p, yaw, -1.5, 1.2 + 2.2 + 1.35, -5.4 - 5.4 + 1.0 + 1.5 + shake * 8, S._o);
        m.compose(w, q, S._s.set(1, 1, 1)); L.mmsHandbag.add(m);
        const sw = local(p, yaw, -1.5, 1.2 + 2.2 + 3.0, -5.4 - 5.4 + 1.0 + 0.3, S._o);
        m.compose(sw, q, S._s.set(1, 1, 1)); L.mmsSignSmall.add(m, signV(S.atlas.index.mmsRESERVED, 1));
        glowAt(S, sw.x, sw.y + 1.5, sw.z, 6, WARM, 0.6 + (shake ? 0.4 : 0));
      }
    },
    // a camera in the firing squad, aimed across the hall; all of them go off together
    mmsCam(S, it, p, q, yaw) {
      if (!S.track) { void S.layers.mmsCamera; return; }
      const T = S.tNow ?? 0, m = S._m; m.compose(p, q, S._s.set(1.3, 1.3, 1.3)); S.layers.mmsCamera.add(m);
      let f = 0; for (const v of it.volley || []) if (T > v - 0.02 && T < v + 0.35) f = Math.max(f, 1 - (T - v) / 0.35);
      const w = local(p, yaw, 0, 14.2, 1.2, S._o);
      if (f > 0.01) { glowAt(S, w.x, w.y, w.z, 10 + 12 * f, WHITEL, 2.6 * f); const g = local(p, yaw, 0, 0.3, 26, S._o); poolAt(S, g.x, g.y, g.z, 22, WHITEL, 1.2 * f); }
      else glowAt(S, w.x, w.y, w.z, 1.2, REDL, 0.8 * (Math.floor(T * 2 + it.seed * 3) % 2));
    },
    // the courtroom's rail, its lamp
    mmsRail(S, it, p, q, yaw) {
      if (!S.track) { void S.layers.mmsRail; return; }
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.mmsRail.add(m);
      const w = local(p, yaw, 6.6, 12.0, 0, S._o), lt = houseLit(S.tNow ?? 0); glowAt(S, w.x, w.y, w.z, 4, GREENL, 0.7 * lt); poolAt(S, w.x, p.y + 0.15, w.z, 10, WARM, 0.35 * lt);
    },
    // a truss across the stage: its lamps on the beat, APPLAUSE at its ends, the jets under it
    mmsTruss(S, it, p, q, yaw) {
      const L = S.layers; void L.mmsTruss; void L.mmsLightBox; void L.mmsSignMid; if (it.jets) void L.mmsJet;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, c = S.course, sm = c.sample(it.t, S._mmSt || (S._mmSt = {}));
      const fy = floorAt(c, it.t);
      p.y = Math.max(fy + 38, sm.y + 24);
      E2.set(0, sm.yaw, 0, 'YXZ'); const tq = (S._mmtq || (S._mmtq = new THREE.Quaternion())).setFromEuler(E2);
      m.compose(p, tq, S._s.set(1, 1, 1)); L.mmsTruss.add(m);
      const ch = inChorus(T), b = pulse(c, T, 5), lt = houseLit(T);
      const cols = [WHITEL, PINKL, GOLDL, WHITEL, REDL];
      for (let j = 0; j < 10; j++) {
        const x = -40 + j * (80 / 9), w = local(p, sm.yaw, x, -2.4, 0, S._o);
        const on = ch ? (0.5 + 1.0 * b * ((j + Math.floor(c.beatAt(T))) % 2)) : 0.35;
        glowAt(S, w.x, w.y, w.z, 2.6, cols[j % 5], on * lt);
        if (ch && j % 3 === 0) poolAt(S, w.x, fy + 0.2, w.z, 16, cols[j % 5], 0.35 * b * lt);
      }
      // APPLAUSE, lit from "cheer", flashing on the beat
      const ap = T > it.cheer && T < it.until ? (beatF(c, T) < 0.5 ? 1 : 0.45) : 0.1;
      for (const sd of [-1, 1]) {
        const w = local(p, sm.yaw, sd * 34, -7, 0, S._o); E2.set(0, sm.yaw + Math.PI + sd * 0.35, 0, 'YXZ'); const aq = (S._mmaq || (S._mmaq = new THREE.Quaternion())).setFromEuler(E2);
        m.compose(w, aq, S._s.set(0.9, 0.9, 0.9)); L.mmsLightBox.add(m); L.mmsSignMid.add(m, signV(S.atlas.index.mmsAPPLAUSE, ap));
        if (ap > 0.5) glowAt(S, w.x, w.y, w.z, 16, REDL, 0.3);
      }
      // the jets along the stage's edges: a column of flame up on every beat
      if (!it.jets) return;
      const [a, bb] = it.jets;
      for (const sd of [-1, 1]) {
        const g = S.track.ground(it.t, sd * 21, S._mmg || (S._mmg = new THREE.Vector3())); g.y = fy;
        m.compose(g, tq, S._s.set(1, 1, 1)); L.mmsJet.add(m);
        if (T > a && T < bb) {
          const f = beatF(c, T), on = f < 0.4 ? 1 - f / 0.4 : 0;
          if (on > 0) for (let j = 0; j < 6; j++) glowAt(S, g.x + Math.sin(T * 20 + j) * 0.5, fy + 3 + j * 2.6 * (0.6 + 0.4 * on), g.z, 3.6 - j * 0.35, j < 2 ? YELLOWL : FIREL, 1.6 * on);
          glowAt(S, g.x, fy + 3, g.z, 2, FIREL, 0.5);
        }
      }
    },
    // a stretch of the lineup's wall: its number, what that one left hanging in front of it
    mmsLine(S, it, p, q, yaw) {
      const L = S.layers; void L.mmsLineWall; void L.mmsLineFace; void L.mmsSlot; void L['mmsEx' + it.v];
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m;
      m.compose(p, q, S._s.set(1, 1, 1)); L.mmsLineWall.add(m); L.mmsLineFace.add(m, ck(0, 0.6));
      const on = smooth(it.on, it.on + 0.12, T), kk = 0.25 + 0.75 * on + 0.8 * (T > it.on ? Math.exp(-(T - it.on) * 2) : 0);
      L.mmsSlot.add(m, ck(it.v, kk));
      L['mmsEx' + it.v].add(m);
      const w = local(p, yaw, 0, 24, 6, S._o); glowAt(S, w.x, w.y, w.z, 8, YELLOWL, 0.6 * kk);
      poolAt(S, p.x, p.y + 0.2, p.z, 14, COOL, 0.3 + 0.6 * on);
    },
    // an evidence table: the bags, the letters in them, a tent with its letter; EXHIBIT A over the first
    mmsEvid(S, it, p, q, yaw) {
      const L = S.layers; void L.mmsEvidence; void L.mmsBags; void L.mmsTent; void L.mmsTentFace; if (it.first) { void L.mmsLightBox; void L.mmsSignMid; }
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m;
      m.compose(p, q, S._s.set(1, 1, 1)); L.mmsEvidence.add(m); L.mmsBags.add(m);
      const w = local(p, yaw, 4.6, 6.0, 1.6, S._o); m.compose(w, q, S._s.set(1.4, 1.4, 1.4)); L.mmsTent.add(m); L.mmsTentFace.add(m, ck(it.v, 0.6 + 0.6 * (it.first && T > it.said ? Math.exp(-(T - it.said) * 1.5) + 0.3 : 0)));
      if (it.first) {
        const s2 = local(p, yaw, 0, 16, 0, S._o); m.compose(s2, q, S._s.set(0.75, 0.75, 0.75)); L.mmsLightBox.add(m);
        const on = T > it.said ? 1 : 0.2; L.mmsSignMid.add(m, signV(S.atlas.index.mmsEXHIBIT, on));
        if (T > it.said) glowAt(S, s2.x, s2.y, s2.z, 14, YELLOWL, 0.3 + 0.8 * Math.exp(-(T - it.said) * 2));
      }
      poolAt(S, p.x, p.y + 0.2, p.z, 14, WHITEL, 0.4);
      for (const x of [-3.2, 1.6]) { const g = local(p, yaw, x, 6.4, 0.2, S._o); glowAt(S, g.x, g.y, g.z, 2.2, REDL, 0.5); }
    },
    // a stand of trophies; on "weaponize cute", glitter
    mmsTrophy(S, it, p, q, yaw) {
      if (!S.track) { void S.layers.mmsTrophies; return; }
      const T = S.tNow ?? 0, m = S._m; m.compose(p, q, S._s.set(1.2, 1.2, 1.2)); S.layers.mmsTrophies.add(m);
      for (let j = 0; j < 3; j++) { const w = local(p, yaw, (-3.2 + j * 3.2) * 1.2, [9.6, 14, 8.4][j] * 1.2, 0, S._o); glowAt(S, w.x, w.y, w.z, 3, GOLDL, 0.4 + 0.3 * Math.sin(T * 3 + j + it.seed * 9)); }
      if (it.pop !== undefined && T > it.pop && T < it.pop + 2.2) {
        const v = T - it.pop;
        for (let j = 0; j < 14; j++) { const a = hash(j + it.seed * 50) * 6.28, sp = 6 + hash(j * 3 + it.seed) * 8; const w = local(p, yaw, Math.cos(a) * sp * v, 12 + 14 * v - 9 * v * v, Math.sin(a) * sp * v, S._o); glowAt(S, w.x, w.y, w.z, 1.2, j % 3 ? GOLDL : PINKL, 1.8 * (1 - v / 2.2) * (0.6 + 0.4 * Math.sin(T * 20 + j))); }
      }
      poolAt(S, p.x, p.y + 0.2, p.z, 14, GOLDL, 0.35);
    },
    // a rack of gowns along the dressing room's wall
    mmsRack(S, it, p, q, yaw) {
      const L = S.layers; void L['mmsRack' + it.v];
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L['mmsRack' + it.v].add(m);
      for (let j = 0; j < 4; j++) { const w = local(p, yaw, -9.6 + j * 6.4, 8 + 3 * Math.sin(T * 2 + j + it.seed * 7), 4.6, S._o); glowAt(S, w.x, w.y, w.z, 1.6, j % 2 ? WHITEL : PINKL, 0.5 + 0.5 * Math.max(0, Math.sin(T * 5 + j * 2 + it.seed * 11))); }
      poolAt(S, p.x, p.y + 0.2, p.z, 20, PINKL, 0.3);
    },
    // the fire running away up both edges of the road from "burn", faster than she goes
    mmsFlame(S, it, p) {
      if (!S.track) return;
      const T = S.tNow ?? 0, ig = it.at + (it.t - it.at) * 0.4;
      if (T < ig || T > it.t + 1.2) return;
      const v = T - ig, k = Math.min(1, v * 5) * (1 - smooth(it.t + 0.4, it.t + 1.2, T));
      const y = S.course.sample(it.t, S._mmSf || (S._mmSf = {})).y;
      for (let j = 0; j < 4; j++) { const f = (T * 1.9 + j * 0.25 + it.seed) % 1; glowAt(S, p.x + Math.sin(T * 13 + j) * 0.5, y + 0.6 + f * 7.5 * (0.6 + 0.4 * Math.min(1, v * 2)), p.z, 3.0 - f * 1.8, f < 0.35 ? YELLOWL : FIREL, 1.9 * k * (1 - f)); }
      if (v < 0.25) glowAt(S, p.x, y + 1, p.z, 6, WHITEL, 1.5 * (1 - v / 0.25));
    },
    // a mask on its pole: turned away until "which mask", then round to face her
    mmsMask(S, it, p, q, yaw) {
      const L = S.layers; void L.mmsMaskPole; void L.mmsMask;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m;
      m.compose(p, q, S._s.set(1.2, 1.2, 1.2)); L.mmsMaskPole.add(m);
      const tu = smooth(it.turn, it.turn + 0.3, T);
      const E = S._mmE || (S._mmE = new THREE.Euler(0, 0, 0, 'YXZ')), mq = S._mmmq || (S._mmmq = new THREE.Quaternion());
      E.set(0.08 * Math.sin(T * 0.7 + it.seed * 9), yaw + Math.PI * (1 - tu) + 0.15 * Math.sin(T * 0.5 + it.seed * 5), 0, 'YXZ'); mq.setFromEuler(E);
      const w = local(p, yaw, 0, 12.6 * 1.2, 0, S._o); m.compose(w, mq, S._s.set(2.4, 2.4, 2.4)); L.mmsMask.add(m);
      const ey = local(p, yaw, 0, 13.4 * 1.2, 1.6, S._o); glowAt(S, ey.x, ey.y, ey.z, 6, COOL, 0.15 + 0.6 * tu * (T > it.turn ? Math.exp(-(T - it.turn) * 0.8) + 0.3 : 0));
      poolAt(S, p.x, p.y + 0.2, p.z, 8, COOL, 0.25);
    },
    // a lyric board hung over the road: the marquee board, its bulbs chasing round it
    mmsBoard(S, it, p) {
      const L = S.layers; void L.mmsBoard; void L.mmsBoardFace;
      if (!S.track) return;
      const T = S.tNow ?? 0, c = S.course, sm = c.sample(it.t, S._mmSl || (S._mmSl = {})), yaw = sm.yaw + Math.PI;
      E2.set(0, yaw, Math.sin(T * 1.1 + it.t) * 0.02, 'YXZ'); const fq = (S._mmbd || (S._mmbd = new THREE.Quaternion())).setFromEuler(E2);
      p.y = sm.y + (it.h || 14);
      const m = S._m, s = it.s ?? 1, lt = 0.5 + 0.5 * houseLit(T);
      m.compose(p, fq, S._s.set(s, s, s)); L.mmsBoard.add(m); L.mmsBoardFace.add(m, signV(it.idx, lt));
      const w = S._o, ch = Math.floor(T * 8);
      for (let j = 0; j < 24; j++) {
        let bx, by;
        if (j < 8) { bx = -12.6 + j * 3.6; by = 5.6; } else if (j < 16) { bx = 12.6 - (j - 8) * 3.6; by = -5.6; } else if (j < 20) { bx = 14.4; by = -3.6 + (j - 16) * 2.4; } else { bx = -14.4; by = 3.6 - (j - 20) * 2.4; }
        local(p, yaw, bx * s, by * s, -1.2 * s, w); glowAt(S, w.x, w.y, w.z, 1.8 * s, GOLDL, ((j + ch) % 3 === 0 ? 1.4 : 0.55) * lt);
      }
      glowAt(S, p.x, p.y, p.z, 34 * s, GOLDL, 0.06 * lt);
    },
  },
  kits: {
    // the set-pieces; those indoors stand on the room's floor
    mmsProps(S, z) {
      for (const a of z.at) {
        const center = a.x === 0;
        const it = { ...a, parts: 'mmsProp', rot: a.rot ?? (center ? (a.kind === 'banner' || a.kind === 'name' ? Math.PI : 0) : FACE(a.x)), s: a.s ?? 1 };
        if (a.floor) onFloor(S, it);
        if (a.roof !== undefined) { prepare(S.course, S.plan); it.h = floorAt(S.course, a.roof) + a.y0; it.y = 0; }
        S.items.push(it);
      }
    },
    // lamps round the courthouse square, trees behind them
    mmsLamps(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 0.9) for (const side of [-1, 1]) {
        S.items.push({ t, x: side * (z.x ?? 22), rot: SIDE(side), parts: 'lamp', seed: R() });
        if (R() < 0.6) S.items.push({ t: t + R() * 0.4, x: side * (36 + R() * 20), s: 0.9 + R() * 0.4, parts: 'tree', tint: col(0x1a2a24), seed: R() });
      }
    },
    // the hall's columns down both walls
    mmsColumns(S, z) { for (let t = z.from; t < z.to; t += z.every ?? 1.3) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + (side > 0 ? z.every * 0.5 : 0), x: side * (z.x ?? 34), rot: 0, parts: 'mmsColumn' })); },
    // stands of seats; the gallery's three tiers on one side, the stage's four on both
    mmsSeats(S, z, R) {
      const sides = z.side ? [z.side] : [-1, 1];
      for (let t = z.from; t < z.to; t += z.every ?? 0.62) for (const side of sides) {
        const it = onFloor(S, { t: t + (side > 0 ? 0.31 : 0), x: side * (z.x ?? 27), rot: SIDE(side), tiers: z.tiers ?? 4, up: z.up, seed: R(), parts: 'mmsSeat' });
        if (z.mom && Math.abs(it.t - z.mom.at) < (z.every ?? 0.62) / 2) it.mom = z.mom;
        S.items.push(it);
      }
    },
    // the firing squad: cameras in a line on one side, aimed across
    mmsSquad(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.42) S.items.push(onFloor(S, { t, x: (z.x ?? -24) + R() * 0.6, rot: SIDE(z.x ?? -24), volley: z.volley, seed: R(), parts: 'mmsCam' })); },
    // the courtroom's rails both sides
    mmsRails(S, z) { for (let t = z.from; t < z.to; t += z.every ?? 0.55) for (const side of [-1, 1]) S.items.push(onFloor(S, { t, x: side * (z.x ?? 22), rot: SIDE(side), parts: 'mmsRail' })); },
    // the trusses over the stage
    mmsTruss(S, z) { for (let t = z.from; t < z.to; t += z.every ?? 2.6) S.items.push(onFloor(S, { t, x: 0, rot: 0, cheer: z.cheer, until: z.until, jets: z.jets, parts: 'mmsTruss' })); },
    // the lineup's wall: five places, each lit as the sweep goes by
    mmsLineup(S, z) { let v = 0; for (let t = z.from; t < z.to && v < 5; t += z.every ?? 0.75, v++) S.items.push(onFloor(S, { t, x: z.x ?? -27, rot: SIDE(z.x ?? -27), v, on: z.sweep + v * 0.2, parts: 'mmsLine' })); },
    // the evidence tables, A to E
    mmsEvidence(S, z) { let v = 0; for (let t = z.from; t < z.to && v < 5; t += z.every ?? 0.75, v++) S.items.push(onFloor(S, { t, x: z.x ?? 25, rot: FACE(z.x ?? 25), v, first: v === 0, said: z.said, parts: 'mmsEvid' })); },
    // the trophy stands both sides
    mmsTrophies(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.55) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + (side > 0 ? 0.27 : 0), x: side * ((z.x ?? 27) + R() * 3), rot: FACE(side), seed: R(), pop: z.pop, parts: 'mmsTrophy' })); },
    // the gown racks both sides
    mmsRacks(S, z, R) { let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 0.6) for (const side of [-1, 1]) { const tt = t + (side > 0 ? 0.3 : 0); if ((z.clear || []).some(([a, b, sd]) => tt > a && tt < b && sd === side)) continue; S.items.push(onFloor(S, { t: tt, x: side * (z.x ?? 29), rot: SIDE(side), v: k++ % 3, seed: R(), parts: 'mmsRack' })); } },
    // the fire both sides of the road
    mmsFireLine(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.12) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + R() * 0.04, x: side * (z.x ?? 17), at: z.at, seed: R(), parts: 'mmsFlame' })); },
    // the masks on their poles both sides; nearer ones turn first
    mmsMasks(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.55) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + (side > 0 ? 0.27 : 0), x: side * ((z.x ?? 24) + R() * 5), rot: FACE(side), seed: R(), turn: z.turn + Math.max(0, t - z.turn) * 0.04 + R() * 0.15, parts: 'mmsMask' })); },
  },
});
// (a second Euler of its own, in the order the pieces want: turned about y, then tilted)
const E2 = new THREE.Euler(0, 0, 0, 'YXZ');

// ---------- the courthouse: its rooms ----------
const RINGS = {
  box: (W = 40, H = 30) => [[-W, H, 1, 1], [-W, 0, 1, 1], [-W, 0, 1, 0], [-W * 0.5, 0, 1, 0], [0, 0, 1, 0], [W * 0.5, 0, 1, 0], [W, 0, 1, 0], [W, 0, 1, 2], [W, H, 1, 2], [W, H, 1, 3], [W * 0.5, H, 1, 3], [0, H, 1, 3], [-W * 0.5, H, 1, 3], [-W, H, 1, 3]],
  open: (W = 64, H = 44) => [[-W, H, 1, 1], [-W, 0, 1, 1], [-W, 0, 1, 0], [-W * 0.5, 0, 1, 0], [0, 0, 1, 0], [W * 0.5, 0, 1, 0], [W, 0, 1, 0], [W, 0, 1, 2], [W, H, 1, 2]],
};
const COURTHOUSE = {
  rings: RINGS,
  ringOf: (s) => (s === 'stage' ? 'open' : 'box'),
  styles: { hall: 0, court: 1, stage: 2, lineup: 3, trophy: 4, dressing: 4, truth: 5, name: 5 },
  dims: { hall: [42, 34], court: [38, 48], stage: [64, 44], lineup: [36, 28], trophy: [40, 30], dressing: [38, 48], truth: [40, 36], name: [42, 50] },
  lights: (id) => (id === 0 ? [24, 8] : id === 1 ? [18, 4] : id === 3 ? [13, 3] : id === 4 ? [18, 6] : null),
};

function roomMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.002 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uLight: { value: new THREE.Color(1, 1, 1) }, uLit: { value: 1 }, uBeat: { value: 0 }, uFlash: { value: 0 }, uMove: { value: 0 }, uFire: { value: 0 }, uChorus: { value: 0 },
      uGapsA: { value: new THREE.Vector4(-1e5, -1e5, -1e5, -1e5) }, uGapsB: { value: new THREE.Vector4(-1e5, -1e5, -1e5, -1e5) }, tChart: { value: null },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uLit, uBeat, uFlash, uMove, uFire, uChorus; uniform vec3 uFog, uCam, uLight; uniform vec4 uGapsA, uGapsB; uniform sampler2D tChart;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      ${AA_GLSL}
      float h1(float n){ return fract(sin(n * 127.1 + 3.7) * 43758.5453); }
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float covP(float d, float w){ return clamp(d / max(w, 1e-4) + 0.5, 0.0, 1.0); }
      float archD(vec2 p, float hw, float hb){ float d = p.y < hb ? hw - abs(p.x) : hw - length(vec2(p.x, p.y - hb)); return min(d, p.y); }
      float boxD(vec2 p, vec2 a, vec2 b){ return min(min(p.x - a.x, b.x - p.x), min(p.y - a.y, b.y - p.y)); }
      float inGap(float t, vec4 g){ return max(step(g.x, t) * step(t, g.y), step(g.z, t) * step(t, g.w)); }
      float gapRim(float t, vec4 g){ return exp(-pow((t - g.x) * 10.0, 2.0)) + exp(-pow((t - g.y) * 10.0, 2.0)) + exp(-pow((t - g.z) * 10.0, 2.0)) + exp(-pow((t - g.w) * 10.0, 2.0)); }
      const vec3 GOLD = vec3(0.91, 0.7, 0.28), CREAM = vec3(0.92, 0.88, 0.8), RED = vec3(0.62, 0.03, 0.09), WALNUT = vec3(0.2, 0.11, 0.05), PINK = vec3(1.0, 0.45, 0.66);
      // velvet drapes: deep folds, a highlight down each
      vec3 drape(float a2, float h, float lit){
        float f = sin(a2 * 1.3 + 0.6 * sin(a2 * 0.37)) * 0.5 + 0.5;
        // (seen edge-on, or rushing by, the folds go to their average: they flapped at the screen's edges)
        f = mix(f, 0.55, smoothstep(0.5, 1.6, fwidth(a2) * 1.3 + uMove * 1.3));
        vec3 c = RED * (0.45 + 0.75 * f * f);
        c += vec3(0.6, 0.08, 0.12) * pow(f, 8.0) * 0.5 * lit;
        return c;
      }
      void main(){
        int part = int(vPart + 0.5); int st = int(uStyle + 0.5);
        float x = vC.x, h = vC.y, along = vC.z, ax = abs(x);
        vec3 col = vec3(0.0), glow = vec3(0.0);
        float lit = 0.08 + 0.92 * uLit;
        float wpx = max(fwidth(h), fwidth(along)) * 1.2;
        float a2 = part == 6 ? x : along;
        if (part == 7) {
          // the courthouse from the square: white stone, a colonnade, a pediment, the steps, lit from below
          col = vec3(0.86, 0.84, 0.8) * (0.86 + 0.14 * n2(vec2(x, h) * 0.3));
          col *= 0.92 + 0.08 * aaPulse(h / 3.2, 0.06);
          float cw = 12.0, cx = mod(ax - 6.0, cw) - cw * 0.5;
          float colm = covP(2.0 - abs(cx), fwidth(x) * 1.2) * step(ax, 74.0) * step(4.0, h) * step(h, 40.0) * step(15.0, ax);
          float shade = 0.65 + 0.45 * cos(cx / 2.0 * 1.4);
          vec3 back = vec3(0.12, 0.1, 0.14);
          float wx = mod(ax, cw) - cw * 0.5;
          float win = covP(boxD(vec2(wx, h - 12.0), vec2(-2.6, 0.0), vec2(2.6, 16.0)), fwidth(x) * 1.2) * step(15.0, ax) * step(ax, 74.0);
          col = mix(col, back, win * 0.85); glow += vec3(1.0, 0.82, 0.55) * win * 0.35 * step(0.45, h1(floor((ax - 6.0) / cw)));
          col = mix(col, vec3(0.95, 0.93, 0.88) * shade, colm);
          // the steps under it, the entablature and the pediment over it
          col *= 1.0 - 0.25 * step(h, 4.0) * aaPulse(h / 0.8, 0.5);
          col = mix(col, vec3(0.92, 0.9, 0.86), clamp(aaBand(h, 41.5, 1.5) + aaBand(h, 44.5, 0.6), 0.0, 1.0));
          float ped = 46.0 + (74.0 - ax) * 0.22 - h;
          col = mix(col, vec3(0.9, 0.88, 0.84) * (0.9 + 0.1 * n2(vec2(x, h))), covP(ped, wpx) * step(46.0, h) * step(ax, 74.0));
          col = mix(col, vec3(0.08, 0.06, 0.1), step(46.0 + (74.0 - ax) * 0.22 + 1.2, h) * step(46.0, h));
          // lit from below: warm floodlight up the columns
          glow += vec3(1.0, 0.86, 0.6) * exp(-h / 18.0) * 0.35 * step(h, 46.0);
          glow += vec3(1.0, 0.3, 0.5) * exp(-pow(h - 40.5, 2.0) * 0.5) * 0.4;
        } else if (part == 8) { col = GOLD * 0.8; glow += GOLD * 0.25 * lit; }
        else if (st == 0) {
          // ---- the hall: black and white marble, the red runner, cream marble walls, tall windows ----
          if (part == 0) {
            float chk = aaChkM(vec2(x, along) / 6.0, vec2(0.0, uMove / 6.0));
            col = mix(vec3(0.07, 0.065, 0.07), vec3(0.88, 0.86, 0.82), chk);
            float vein = n2(vec2(x * 0.09 + along * 0.02, along * 0.07)); vein = exp(-pow((vein - 0.5) * 16.0, 2.0)) * (1.0 - smoothstep(0.3, 1.0, wpx));
            col = mix(col, vec3(0.5, 0.48, 0.5), vein * 0.3);
            float run = covP(9.0 - ax, fwidth(x) * 1.2);
            col = mix(col, vec3(0.52, 0.02, 0.08) * (0.9 + 0.1 * n2(vec2(x, along) * 2.0)), run);
            col = mix(col, GOLD, aaBand(ax, 8.6, 0.28));
            glow += vec3(1.0, 0.92, 0.8) * exp(-pow(mod(along, 24.0) - 16.0, 2.0) / 30.0) * exp(-x * x / 500.0) * 0.18 * lit;
          } else if (part == 3) {
            vec2 q = vec2(x / 10.5, along / 10.5); vec2 f = abs(fract(q) - 0.5);
            float rib = 1.0 - smoothstep(0.38, 0.45, max(f.x, f.y));
            col = mix(CREAM * 0.7, CREAM * 0.95, rib);
            col = mix(col, GOLD, clamp(aaBand(max(f.x, f.y), 0.43, 0.012) * (1.0 - smoothstep(0.5, 1.5, wpx)), 0.0, 1.0));
            glow += vec3(1.0, 0.86, 0.62) * (1.0 - rib) * 0.25 * lit;
          } else {
            col = CREAM * (0.86 + 0.14 * n2(vec2(a2, h) * 0.18));
            if (h < 6.0) { float pan = aaPulse(a2 / 4.0, 0.05) + aaPulse(h / 2.8, 0.08); col = WALNUT * (1.15 - 0.3 * clamp(pan, 0.0, 1.0)); }
            col = mix(col, GOLD, aaBand(h, 6.2, 0.3) + aaBand(h, 29.0, 0.6));
            float pw = 24.0, px = mod(a2, pw) - pw * 0.5;
            float pil = covP(2.4 - abs(px), fwidth(a2) * 1.2) * step(6.0, h);
            col = mix(col, CREAM * (0.7 + 0.35 * cos(px / 2.4 * 1.5)), pil);
            float wd = archD(vec2(mod(a2 + pw * 0.5, pw) - pw * 0.5, h - 9.0), 5.0, 13.0);
            float inW = covP(wd, wpx);
            vec3 night = mix(vec3(0.03, 0.04, 0.1), vec3(0.08, 0.1, 0.22), smoothstep(9.0, 26.0, h));
            float mull = clamp(aaBand(mod(a2 + pw * 0.5, pw) - pw * 0.5, 0.0, 0.15) + aaPulse(h / 4.5, 0.04), 0.0, 1.0);
            col = mix(col, mix(night, WALNUT * 0.5, mull), inW);
            glow += vec3(0.4, 0.5, 1.0) * inW * 0.05 + GOLD * exp(-pow(wd * 3.0, 2.0)) * 0.4 * lit;
            glow += vec3(1.0, 0.88, 0.66) * exp(-pow((h - 27.0) / 2.0, 2.0)) * 0.12 * lit;
          }
        } else if (st == 1) {
          // ---- the courtroom: a parquet floor, panelled walls, the end wall's velvet curtain ----
          if (part == 0) {
            vec2 q = vec2(x, along) / 3.0; float diag = aaSq((q.x + q.y) * 0.5) ;
            float plank = aaPulse(q.x * 2.0, 0.06) * (1.0 - diag) + aaPulse(q.y * 2.0, 0.06) * diag;
            col = mix(vec3(0.42, 0.24, 0.11), vec3(0.32, 0.17, 0.07), diag) * (0.88 + 0.12 * n2(vec2(x, along)));
            col *= 1.0 - 0.3 * plank;
            float run = covP(8.0 - ax, fwidth(x) * 1.2); col = mix(col, RED * 0.9, run * 0.9); col = mix(col, GOLD, aaBand(ax, 7.7, 0.25));
            glow += vec3(1.0, 0.8, 0.5) * exp(-pow(mod(along, 18.0) - 13.0, 2.0) / 20.0) * exp(-x * x / 300.0) * 0.14 * lit;
          } else if (part == 3) {
            col = vec3(0.6, 0.55, 0.48) * (0.85 + 0.15 * aaPulse(x / 8.0, 0.04)) * (0.85 + 0.15 * aaPulse(along / 8.0, 0.04));
          } else if (part == 6) {
            col = drape(a2, h, lit);
            col = mix(col, GOLD, aaBand(h, 1.0, 0.8));
            glow += vec3(1.0, 0.3, 0.4) * exp(-h / 8.0) * 0.25 * lit;
          } else {
            col = WALNUT * 1.6;
            if (h < 18.0) { vec2 pq = vec2(mod(a2, 6.0) - 3.0, mod(h - 1.0, 8.0) - 4.0); float pnl = covP(boxD(pq, vec2(-2.3, -3.2), vec2(2.3, 3.2)), wpx); col = mix(col * 0.75, col * 1.25, pnl); }
            else col = vec3(0.72, 0.64, 0.52) * (0.9 + 0.1 * n2(vec2(a2, h) * 0.2));
            col = mix(col, GOLD * 0.8, aaBand(h, 18.2, 0.35) + aaBand(h, 26.0, 0.5));
            float sd = length(vec2(mod(a2, 30.0) - 15.0, h - 22.0));
            col = mix(col, GOLD, covP(2.4 - sd, wpx) * (1.0 - covP(1.8 - sd, wpx)) + covP(1.0 - sd, wpx));
            glow += GOLD * exp(-sd * sd / 6.0) * 0.3 * lit;
          }
        } else if (st == 2) {
          // ---- the stage: black gloss, the runway and its bulbs, the pit under the jump, velvet round it ----
          if (part == 0) {
            col = vec3(0.025, 0.02, 0.03);
            float rw = covP(10.0 - ax, fwidth(x) * 1.2);
            col = mix(col, vec3(0.75, 0.74, 0.78), rw * 0.85);
            col = mix(col, GOLD, aaBand(ax, 10.3, 0.22));
            float bd = length(vec2(ax - 11.2, mod(along, 3.0) - 1.5));
            float chase = uChorus > 0.5 ? (0.4 + 0.6 * step(0.5, fract(along / 6.0 - uTime * 2.0))) : 0.55;
            glow += vec3(1.0, 0.85, 0.55) * (smoothstep(0.55, 0.15, bd) * 2.0 + exp(-bd * bd * 1.5) * 0.25) * chase * lit;
            // the lights' gloss on it
            glow += vec3(1.0, 0.6, 0.75) * exp(-pow(mod(along, 26.0) - 13.0, 2.0) / 40.0) * exp(-pow(ax - 22.0, 2.0) / 60.0) * 0.16 * lit * (0.6 + 0.4 * uBeat);
            float g = max(inGap(vT, uGapsA), inGap(vT, uGapsB.xyxy));
            col *= 1.0 - g; glow *= 1.0 - g;
            glow += vec3(1.0, 0.2, 0.35) * (gapRim(vT, uGapsA) + gapRim(vT, uGapsB.xyxy) * 0.5) * 1.4;
          } else {
            col = drape(a2, h, lit) * (h < 30.0 ? 1.0 : 0.25);
            col = mix(col, GOLD * 0.9, aaBand(h, 30.0, 0.8) + aaBand(h, 0.6, 0.6));
            float sw = mod(a2, 16.0) - 8.0; col = mix(col, GOLD * 0.7, aaBand(sw, 0.0, 0.25) * step(h, 30.0) * (1.0 - smoothstep(0.3, 1.2, fwidth(a2) + uMove * 0.5)));
            float sc = length(vec2(mod(a2 + 8.0, 16.0) - 8.0, h - 15.0));
            glow += vec3(1.0, 0.82, 0.6) * (smoothstep(0.9, 0.3, sc) * 1.4 + exp(-sc * sc / 10.0) * 0.25) * lit;
          }
          glow += vec3(1.0, 0.45, 0.1) * uFire * (0.5 + 0.5 * sin(uTime * 9.0 + a2 * 0.3) * sin(uTime * 5.0 + h)) * 0.35 * exp(-h / 20.0);
        } else if (st == 3) {
          // ---- the lineup room: concrete, the height chart round the walls, strip lights ----
          if (part == 0) {
            col = vec3(0.3, 0.31, 0.32) * (0.85 + 0.15 * n2(vec2(x, along) * 0.8));
            col = mix(col, vec3(1.0, 0.82, 0.12), aaBand(ax, 12.0, 0.3) * 0.8);
            glow += vec3(0.85, 0.95, 1.0) * exp(-pow(mod(along, 13.0) - 6.5, 2.0) / 9.0) * exp(-x * x / 260.0) * 0.12 * lit;
          } else if (part == 3) {
            col = vec3(0.7, 0.74, 0.76);
            float tube = aaBand(mod(along, 13.0), 6.5, 0.45) * step(ax, 24.0) * step(4.0, mod(ax, 12.0));
            glow += vec3(0.88, 0.97, 1.0) * tube * 2.4 * lit;
          } else {
            vec3 ch = texture2D(tChart, vec2((part == 2 ? -a2 : a2) / 18.0, h / 24.0)).rgb;
            col = h < 24.0 ? ch * 0.85 : vec3(0.22, 0.23, 0.25);
            col = mix(col, vec3(0.1, 0.1, 0.12), aaBand(h, 24.0, 0.3));
          }
          glow += vec3(1.0, 0.95, 0.9) * uFlash * 0.35;
        } else if (st == 4) {
          // ---- the trophy hall, the dressing room: pink and gold, a damask, the photographs ----
          if (part == 0) {
            float chk = aaChkM(vec2(x, along) / 4.0, vec2(0.0, uMove / 4.0));
            col = mix(vec3(0.95, 0.72, 0.8), vec3(0.98, 0.94, 0.9), chk);
            float run = covP(8.0 - ax, fwidth(x) * 1.2); col = mix(col, vec3(0.75, 0.1, 0.3), run * 0.9); col = mix(col, GOLD, aaBand(ax, 7.7, 0.25));
            glow += vec3(1.0, 0.8, 0.88) * exp(-pow(mod(along, 18.0) - 12.0, 2.0) / 26.0) * exp(-x * x / 400.0) * 0.16 * lit;
          } else if (part == 3) {
            col = vec3(0.95, 0.86, 0.88) * (0.88 + 0.12 * aaPulse(x / 9.0, 0.05));
          } else {
            col = vec3(0.95, 0.62, 0.74) * (0.9 + 0.1 * n2(vec2(a2, h) * 0.2));
            vec2 dq = vec2(mod(a2, 4.0) - 2.0, mod(h, 5.0) - 2.5);
            float dm = abs(dq.x) / 2.0 + abs(dq.y) / 2.5;
            col = mix(col, vec3(1.0, 0.82, 0.86), aaBand(dm, 0.62, 0.06) * (1.0 - smoothstep(0.4, 1.2, wpx)) * 0.7);
            if (h < 5.0) col = vec3(0.98, 0.95, 0.92) * (0.92 - 0.1 * aaPulse(a2 / 3.0, 0.06));
            col = mix(col, GOLD, aaBand(h, 5.2, 0.3) + aaBand(h, 27.0, 0.5));
            vec2 pq = vec2(mod(a2, 20.0) - 10.0, h - 15.0);
            float fr = covP(boxD(pq, vec2(-4.0, -5.0), vec2(4.0, 5.0)), wpx), inn = covP(boxD(pq, vec2(-3.3, -4.3), vec2(3.3, 4.3)), wpx);
            col = mix(col, GOLD, fr * (1.0 - inn));
            vec3 photo = mix(vec3(1.0, 0.75, 0.82), vec3(0.6, 0.3, 0.45), smoothstep(-4.0, 4.0, pq.y)) * (0.8 + 0.2 * sin(pq.x * 0.8 + floor(a2 / 20.0)));
            col = mix(col, photo, inn);
            glow += vec3(1.0, 0.9, 0.82) * inn * 0.12 * lit + GOLD * exp(-pow((h - 21.0) / 1.5, 2.0)) * exp(-pq.x * pq.x / 8.0) * 0.4 * lit;
          }
        } else {
          // ---- the witness stand, her name: black marble, one cold light, dark panels ----
          if (part == 0) {
            col = vec3(0.03, 0.03, 0.045) * (0.8 + 0.4 * aaChkM(vec2(x, along) / 9.0, vec2(0.0, uMove / 9.0)));
            glow += vec3(0.55, 0.65, 0.9) * exp(-x * x / 90.0) * 0.08 * lit;
          } else if (part == 3) {
            col = vec3(0.02, 0.02, 0.03);
          } else {
            col = vec3(0.05, 0.06, 0.1) * (0.85 + 0.3 * aaPulse(a2 / 8.0, 0.04));
            float wd = archD(vec2(mod(a2, 22.0) - 11.0, h - 8.0), 4.5, 14.0);
            float inW = covP(wd, wpx);
            col = mix(col, vec3(0.02, 0.03, 0.08), inW);
            glow += vec3(0.35, 0.45, 0.9) * (inW * 0.06 + exp(-pow(wd * 2.5, 2.0)) * 0.12) * lit;
            glow += vec3(1.0, 0.75, 0.4) * exp(-pow((h - 1.0) / 0.6, 2.0)) * 0.15 * lit;
          }
        }
        if (part != 7) col *= uLight * lit;
        else col *= uLight;
        col += glow;
        col += vec3(1.0, 0.97, 0.95) * uFlash * 0.25 * step(float(part), 6.5);
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the place, per frame ----------
export class MmsWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = roomMaterial();
    this.mat.uniforms.tChart.value = tex().chart;
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, COURTHOUSE));
    // the orchestra pit under each chorus's jump, cut in the stage's floor
    const stages = (S.plan.rooms || []).filter((r) => r.style === 'stage');
    const g = S.course.gaps.filter((gp) => stages.some((r) => gp.from >= r.from - 0.5 && gp.from < r.to));
    const gv = (i) => (g[i] ? [g[i].from - 0.05, g[i].to + 0.05] : [-1e5, -1e5]);
    this.mat.uniforms.uGapsA.value.set(...gv(0), ...gv(1));
    this.mat.uniforms.uGapsB.value.set(...gv(2), -1e5, -1e5);
    this._g = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1, 1, 1);
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, T = S.rider.t, c = S.course;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.6) / 1.9);
    u.uLit.value = houseLit(T);
    u.uBeat.value = Math.exp(-(((c.beatAt(T) % 1) + 1) % 1) * 4);
    let fl = 0; for (const t0 of FLASHES) if (T > t0 && T < t0 + 0.4) fl = Math.max(fl, 1 - (T - t0) / 0.4);
    u.uFlash.value = fl;
    u.uChorus.value = inChorus(T) ? 1 : 0;
    u.uFire.value = smooth(111.4, 113, T) * (1 - smooth(140.5, 142, T));
    // (how far she goes in a frame, in metres: a floor's squares rushing past are blurred by that much)
    u.uMove.value = clamp((S.rider.v || 0) / 60, 0, 2);
    for (const r of this.rooms) r.update(S.track, S.rider, T);
    const M = S.town.mats;
    for (const k of ['mmsSashM', 'mmsSashBM']) { const sm = M[k]; if (sm) { sm.uniforms.uTime.value = time; sm.uniforms.uBurn.value = k === 'mmsSashBM' ? 1 : 0; } }
  }
  // the hall's chandeliers, the courtroom's pendants, the lineup room's tubes, the pink rooms' crystal
  draw(T) {
    const S = this.S, g = this._g, c = S.course, track = S.track, lit = houseLit(S.rider.t);
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(c, f.t);
        track.ground(f.t, 0, g);
        if (r.style === 0) {
          for (let j = 0; j < 8; j++) { const a = j / 8 * Math.PI * 2 + T.tNow * 0.15; T.glow(g.x + Math.cos(a) * 3.2, fy + r.H - 7 - (j % 2) * 1.4, g.z + Math.sin(a) * 3.2, 1.4, WARM, 1.0 * lit); }
          T.glow(g.x, fy + r.H - 7.5, g.z, 16, WARM, 0.22 * lit); T.pool(g.x, fy + 0.15, g.z, 30, WARM, 0.35 * lit);
        } else if (r.style === 1) {
          T.glow(g.x, fy + r.H - 6, g.z, 3, WARM, 1.2 * lit); T.glow(g.x, fy + r.H - 6, g.z, 14, WARM, 0.18 * lit); T.pool(g.x, fy + 0.15, g.z, 22, WARM, 0.32 * lit);
        } else if (r.style === 3) {
          T.pool(g.x, fy + 0.15, g.z, 24, COOL, 0.28 * lit);
        } else if (r.style === 4) {
          for (let j = 0; j < 7; j++) { const a = j / 7 * Math.PI * 2 + T.tNow * 0.2; T.glow(g.x + Math.cos(a) * 2.4, fy + r.H - 6.5 - (j % 2), g.z + Math.sin(a) * 2.4, 1.2, j % 2 ? WHITEL : PINKL, 1.1 * lit); }
          T.glow(g.x, fy + r.H - 7, g.z, 14, PINKL, 0.2 * lit); T.pool(g.x, fy + 0.15, g.z, 26, [1, 0.75, 0.85], 0.32 * lit);
        }
      }
    }
  }
}

// ---------- the end: the height chart wall, the booking board, the stool with the sash, the roses ----------
export class MmsFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.t = cfg.t; this.x = cfg.x ?? -22;
    this.group = new THREE.Group(); scene.add(this.group);
    const paintM0 = selfLit({ roughness: 0.55 }, 0.2), dark = selfLit({ roughness: 0.4, metalness: 0.2 }, 0.1), chrome = selfLit({ roughness: 0.22, metalness: 0.75 }, 0.2);
    const add = (geo, mat, x = 0, y = 0, z = 0, ry = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.y = ry; this.group.add(o); return o; };
    // the wall: the chart, life size times four, framed in the dark
    add(MG.chart(40, 26), dark, 0, 0, -6);
    const cf = MG.chartFace(40, 26); add(cf, new THREE.MeshBasicMaterial({ map: tex().chart, color: new THREE.Color(1.15, 1.15, 1.15) }), 0, 0, -5.55);
    // the booking board on its stand, the stool with her sash over it
    const pf = MG.placardFace(); add(MG.placardStand(), chrome, -2.2, 0, 2.4).scale.setScalar(2.4); this.board = add(pf, new THREE.MeshBasicMaterial({ map: tex().placard, color: new THREE.Color(1.3, 1.3, 1.3) }), -2.2, 0, 2.4); this.board.scale.setScalar(2.4);
    add(MG.stool(), paintM0, 6.5, 0, 1.5).scale.setScalar(2.2);
    // the roses thrown on the floor in front of it
    const roseM = selfLit({ roughness: 0.5 }, 0.3);
    for (let j = 0; j < 6; j++) { add(paint(new THREE.SphereGeometry(0.9, 10, 8).scale(1, 0.8, 1), [0.75, 0.04, 0.12]), roseM, -9 + j * 3.4 + Math.sin(j * 2.3) * 0.8, 0.6, 6 + Math.cos(j * 1.7) * 1.4); add(paint(new THREE.CylinderGeometry(0.08, 0.08, 4, 5).rotateZ(Math.PI / 2 - 0.3 + j * 0.2), [0.15, 0.4, 0.12]), roseM, -9 + j * 3.4 + Math.sin(j * 2.3) * 0.8 + 1.6, 0.3, 6 + Math.cos(j * 1.7) * 1.4); }
    // the camera on its tripod, its umbrella: it goes off on the last hit, and every few seconds after
    this.cam = add(MG.booking(), paintM0, 18, 0, 18, -2.4);
    this.group.scale.setScalar(cfg.s ?? 1);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
    prepare(course, null);
  }
  fire(earned) { this.fired = true; this.earned = earned; this.firedAt = performance.now(); }
  update(track, rider, songT, dt) {
    track.ground(this.t, this.x, this._p); this._p.y = floorAt(this.course, this.t);
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t, this._sm || (this._sm = {})).yaw + (this.cfg.rot ?? -Math.PI / 2), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1, w = this._w, T = rider.t;
    this.fireK = this.fired ? Math.min(1, (this.fireK || 0) + dt * 0.8) : 0;
    // the flash: on the last hit, then every few seconds
    const ft = songT - 214.35, per = 3.2, fp = ft > 0 ? (ft % per) : 99, fk = fp < 0.35 ? 1 - fp / 0.35 : 0;
    w.set(5.4, 14, 0.4).applyMatrix4(this.cam.matrixWorld); S.glow(w.x, w.y, w.z, (8 + 14 * fk) * s, WHITEL, 0.2 + 2.6 * fk);
    w.set(0, 13, -5).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 40 * s, WHITEL, 0.12 + 0.9 * fk);
    w.set(0, 0, 0).applyMatrix4(this.group.matrixWorld); S.pool(w.x, this._p.y + 0.12, w.z, 46 * s, WHITEL, 0.45 + 0.6 * fk + 0.2 * this.fireK);
    // the bulbs along the top of the wall, the board's light
    for (let j = 0; j < 14; j++) { w.set(-19.5 + j * 3, 27, -5.4).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 1.6 * s, GOLDL, 0.6 + 0.6 * ((j + Math.floor(songT * 6)) % 3 === 0 ? 1 : 0)); }
    w.set(-2.2, 10.6, 3).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 8 * s, WHITEL, 0.3 + 0.4 * this.fireK);
    w.set(0, 1, 6).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 6 * s, REDL, 0.5);
  }
}
