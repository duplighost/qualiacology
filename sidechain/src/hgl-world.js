// Hot Girl Lobotomy. The Lobotomy Bar: a pink chain clinic on a palm street at night, a giant drill
// on its roof drilling into it on "drill, baby, drill". In at its door with the band: the lobby's
// columns, the waiting chairs, the intake form with EXISTENTIAL DREAD ticked, the treatment menu
// (LOBOTOMY $499 lights on "make me dumb"), purple marker dots drawn round the columns on "he drew
// dots around my temples", the BAD PARTS bin's lid popping on "out", the laughing gas, the
// magazines. The procedure room: the lamps, the chair, and the THIRD EYE crystal under the ice pick,
// the mallet coming down on "third" and the crystal going on "eye"; the lights cut for the stop.
// The first chorus bursts out of its wall over the city, giant phones standing in it like towers,
// TRENDING NOW, hearts coming off them; one lies face up under the jump. The melon and its baller
// ("wow" throws the ball), the pool drained ("used to drown"), a music box ("a pretty little hollow
// sound"), NO THINKING signs, the vanity. Back in through the recovery wing (hood dryers in rows,
// VACANCY); the trade-in counter (WE BUY DEGREES: her degree across it, a syringe of filler back),
// philosophy into the shredder, the scale counting down to 0 KCAL, a smoothie, a salad and a plate
// of nothing on their words, the tiara on "winner". The monitor room: FRONTAL LOBE, CLOSED; every
// EEG going flat on "brain-dead"; LOST posters for her introspection; the stop in the dark. The
// second chorus in a hall whose walls are shelves of feelings in jars: five stars lighting on "five
// stars", specimen jars along the road (HURT, WORK, CARE on their words), the line of compacts
// stamped on the beat. A gallery of empty frames for "empty, empty, so pretty"; then the red carpet:
// thought bubbles with nothing in them popping on "nothing", the press line flashing on every
// "stunning", and at the end the treatment chair under a ring light, the phone on its tripod
// still live, the pick and the baller on a tray with a bow on them.
// The things are in hgl-props.js, the course and looks in hgl-song.js.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local, signV } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room } from './summer.js';
import { AA_GLSL } from './aa.js';
import { HG, FEELINGS, cellMat, kMat, eegMat, glassMat, canvasTex, formTexture, menuTexture, magTexture, phoneTexture, labelTexture, lostTexture, diplomaTexture, kcalTexture, noThinkTexture, logoTexture, spineTexture, merge } from './hgl-props.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.45 : -Math.PI / 2 - 0.45);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const PINKL = [1, 0.3, 0.62], HOTL = [1, 0.12, 0.5], BLUSHL = [1, 0.72, 0.84], WHITEL = [1, 0.96, 0.92], COOL = [0.85, 0.95, 1], GOLDL = [1, 0.76, 0.34],
  MARK = [0.62, 0.18, 1], AMETH = [0.72, 0.4, 1], GREENL = [0.55, 1, 0.45], JARL = [0.78, 1, 0.42], REDL = [1, 0.15, 0.2], LILACL = [0.78, 0.6, 1], MELONL = [1, 0.62, 0.3], SKYL = [0.5, 0.85, 1];

// ---------- when the clinic's own lights are on ----------
// Off for the two stops (the second one longer, in the monitor room after "brain-dead"), dimmed in
// the recovery wing; they come back with the band.
export function clinicLit(T) {
  let k = 1;
  if (T > 19.92 && T < 21.32) k = 0.04;
  if (T > 43.0 && T < 46.5) k = 0.55;
  if (T > 61.84 && T < 66.81) k = 0.6;
  if (T > 66.81 && T < 68.9) k = 0.03;
  if (T > 90.6 && T < 94.1) k = 0.5;
  return k;
}

// ---------- materials ----------
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VC = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const pic = (M, key, map, k = 0.6, opts = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.6, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, ...opts }));
let TEX = null;
const tex = () => TEX || (TEX = { form: formTexture(), menu: menuTexture(), mag: magTexture(), phone: phoneTexture(), label: labelTexture(), lost: lostTexture(), diploma: diplomaTexture(), kcal: kcalTexture(), noThink: noThinkTexture(), logo: logoTexture(), spine: spineTexture() });
const paintM = (M) => VC(M, 'hglPaintM', 0.2, { roughness: 0.5 });
const glossM = (M) => VC(M, 'hglGlossM', 0.3, { roughness: 0.22, metalness: 0.1 });
const chromeM = (M) => VC(M, 'hglChromeM', 0.18, { roughness: 0.22, metalness: 0.75 });
const darkM = (M) => VC(M, 'hglDarkM', 0.1, { roughness: 0.4, metalness: 0.2 });
const KV = { aK: 0 }, CK = { aCell: 0, aK: 0 };
const kv = (k) => { KV.aK = k; return KV; };
const ck = (c, k) => { CK.aCell = c; CK.aK = k; return CK; };

// a length of velvet rope from u to v (no new objects: this runs for every stanchion every frame)
const _rq = new THREE.Quaternion(), _rd = new THREE.Vector3(), _rz = new THREE.Vector3(0, 0, 1);
function ropeSeg(S, u, v) {
  const d = u.distanceTo(v); if (d < 0.01) return;
  _rd.subVectors(v, u).multiplyScalar(1 / d); _rq.setFromUnitVectors(_rz, _rd);
  S._m.compose(u, _rq, S._s.set(1, 1, d)); S.layers.hglRope.add(S._m);
}

// ---------- the pieces, registered ----------
const PROP_LAYERS = {
  drill: ['hglDrill', 'hglBit'], neon: ['hglNeonBig', 'hglNeonSmall'], desk: ['hglDesk', 'hglSignMid'], easel: ['hglEasel', 'hglForm'], menu: ['hglMenu', 'hglMenuFace'],
  bin: ['hglBin', 'hglBinLid', 'hglBinFace'], gas: ['hglGas', 'hglSignMid'], rack: ['hglRack', 'hglMag'], pick: ['hglPlinth', 'hglCrystal', 'hglShard', 'hglPick', 'hglMallet', 'hglSignSmall'],
  tchair: ['hglTChair'], phoneFlat: ['hglPhone', 'hglPhoneFace'], melon: ['hglMelon', 'hglBaller', 'hglBall'], pool: ['hglPool'], musicbox: ['hglMusicBox', 'hglDrum'],
  vanity: ['hglVanity', 'hglMirror'], vacancy: ['hglSignMid'], counter: ['hglCounter', 'hglSignBig', 'hglDiploma', 'hglDiplomaFace', 'hglSyringe'],
  shredder: ['hglShredder', 'hglBook', 'hglBookFace', 'hglStrip'], scale: ['hglScale', 'hglKcal'], plate: ['hglPedestal', 'hglSmoothie', 'hglSalad', 'hglCutlery'],
  tiara: ['hglTiara'], lobe: ['hglWayPost', 'hglWayTop', 'hglWayBottom'], stars: ['hglStarBoard', 'hglStar'], bubble: ['hglBubble'],
};

extend({
  layers: {
    hglDrill: (M) => [HG.drill(), glossM(M), 2, {}],
    hglBit: (M) => [HG.bit(), chromeM(M), 2, {}],
    hglNeonBig: (M) => [HG.signFace(40, 8.4), M.sign, 4, { aIdx: 1, aWake: 2 }],
    hglNeonSmall: (M) => [HG.signFace(22, 4.4), M.sign, 4, { aIdx: 1, aWake: 2 }],
    hglSignBig: (M) => [HG.signFace(17, 4.4).translate(0, 15.8, -1.55), M.sign, 3, { aIdx: 1, aWake: 2 }],
    hglSignMid: (M) => [HG.signFace(12, 3.0), M.sign, 12, { aIdx: 1, aWake: 2 }],
    hglSignSmall: (M) => [HG.signFace(6.6, 1.7).translate(0, 2.0, 3.72), M.sign, 3, { aIdx: 1, aWake: 2 }],
    hglPalm: (M) => [HG.palm(), darkM(M), 160, {}],
    hglColumn: (M) => [HG.column(), paintM(M), 60, {}],
    hglChair: (M) => [HG.chair(), glossM(M), 120, {}],
    hglDesk: (M) => [HG.desk(), glossM(M), 2, {}],
    hglEasel: (M) => [HG.easel(), paintM(M), 2, {}],
    hglForm: (M) => [HG.formFace(), pic(M, 'hglFormM', tex().form, 0.55), 2, {}],
    hglMenu: (M) => [HG.menuBox(), paintM(M), 2, {}],
    hglMenuFace: (M) => [HG.menuFace(), pic(M, 'hglMenuM', tex().menu, 0.85), 2, {}],
    hglBin: (M) => [HG.bin(), glossM(M), 2, {}],
    hglBinLid: (M) => [HG.binLid(), glossM(M), 2, {}],
    hglBinFace: (M) => [HG.binFace(), M.sign, 2, { aIdx: 1, aWake: 2 }],
    hglGas: (M) => [HG.gas(), glossM(M), 2, {}],
    hglRack: (M) => [HG.rack(), chromeM(M), 2, {}],
    hglMag: (M) => [HG.mag(), M.hglMagM || (M.hglMagM = cellMat(tex().mag, 2, 2, 0.2, 0.9)), 8, { aCell: 1, aK: 1 }],
    hglLampHead: (M) => [HG.lampHead(), chromeM(M), 80, {}],
    hglTChair: (M) => [HG.tchair(), glossM(M), 3, {}],
    hglPlinth: (M) => [HG.plinth(), paintM(M), 2, {}],
    hglCrystal: (M) => [HG.crystal(), VC(M, 'hglCrystalM', 0.9, { roughness: 0.1, metalness: 0.2 }), 2, {}],
    hglShard: (M) => [HG.shard(), VC(M, 'hglCrystalM', 0.9, { roughness: 0.1, metalness: 0.2 }), 24, {}],
    hglPick: (M) => [HG.pick(), chromeM(M), 2, {}],
    hglMallet: (M) => [HG.mallet(), paintM(M), 2, {}],
    hglPhone: (M) => [HG.phone(), darkM(M), 70, {}],
    hglPhoneFace: (M) => [HG.phoneFace(), M.hglPhoneM || (M.hglPhoneM = cellMat(tex().phone, 2, 2, 0.2, 0.95)), 70, { aCell: 1, aK: 1 }],
    hglHeart: (M) => [HG.heart(), M.hglHeartM || (M.hglHeartM = kMat(0.3, 2.0)), 300, { aK: 1 }],
    hglMelon: (M) => [HG.melon(), paintM(M), 2, {}],
    hglBaller: (M) => [HG.baller(), chromeM(M), 2, {}],
    hglBall: (M) => [HG.ball(), VC(M, 'hglBallM', 0.6, { roughness: 0.4 }), 2, {}],
    hglPool: (M) => [HG.pool(), paintM(M), 2, {}],
    hglMusicBox: (M) => [HG.musicbox(), glossM(M), 2, {}],
    hglDrum: (M) => [HG.drum(), chromeM(M), 2, {}],
    hglSignPole: (M) => [HG.signPole(), paintM(M), 40, {}],
    hglSignDisc: (M) => [HG.discFace(), pic(M, 'hglNoThinkM', tex().noThink, 0.7), 40, {}],
    hglVanity: (M) => [HG.vanity(), glossM(M), 2, {}],
    hglMirror: (M) => [HG.mirror(), M.hglMirrorM || (M.hglMirrorM = new THREE.MeshStandardMaterial({ color: 0xc8d4e4, roughness: 0.08, metalness: 0.9, emissive: 0x6a7488, emissiveIntensity: 0.9 })), 2, {}],
    hglDryer: (M) => [HG.dryer(), glossM(M), 90, {}],
    hglCounter: (M) => [HG.counter(), paintM(M), 2, {}],
    hglDiploma: (M) => [HG.diploma(), paintM(M), 2, {}],
    hglDiplomaFace: (M) => [HG.diplomaFace(), pic(M, 'hglDiplomaM', tex().diploma, 0.55), 2, {}],
    hglSyringe: (M) => [HG.syringe(), glossM(M), 2, {}],
    hglShredder: (M) => [HG.shredder(), darkM(M), 2, {}],
    hglBook: (M) => [HG.book(), paintM(M), 8, {}],
    hglBookFace: (M) => [HG.bookFace(), M.hglSpineM || (M.hglSpineM = cellMat(tex().spine, 6, 1, 0.3, 0.6)), 8, { aCell: 1, aK: 1 }],
    hglStrip: (M) => [HG.strip(), VC(M, 'hglStripM', 0.6, { roughness: 0.8, side: THREE.DoubleSide }), 48, {}],
    hglScale: (M) => [HG.scale(), paintM(M), 2, {}],
    hglKcal: (M) => [HG.scaleFace(), M.hglKcalM || (M.hglKcalM = cellMat(tex().kcal, 1, 4, 0.3, 1.2)), 2, { aCell: 1, aK: 1 }],
    hglPedestal: (M) => [HG.pedestal(), paintM(M), 4, {}],
    hglSmoothie: (M) => [HG.smoothie(), glossM(M), 2, {}],
    hglSalad: (M) => [HG.salad(), paintM(M), 2, {}],
    hglCutlery: (M) => [HG.cutlery(), chromeM(M), 2, {}],
    hglTiara: (M) => [HG.tiara(), VC(M, 'hglTiaraM', 0.35, { roughness: 0.2, metalness: 0.6 }), 2, {}],
    hglWayPost: (M) => [HG.wayPost(), paintM(M), 2, {}],
    hglWayTop: (M) => [HG.wayFace(15.2), M.sign, 2, { aIdx: 1, aWake: 2 }],
    hglWayBottom: (M) => [HG.wayFace(11.0), M.sign, 2, { aIdx: 1, aWake: 2 }],
    hglMonitor: (M) => [HG.monitor(), darkM(M), 60, {}],
    hglEEG: (M) => [HG.monitorFace(), M.hglEegM || (M.hglEegM = eegMat()), 60, { aK: 1 }],
    hglPoster: (M) => [HG.poster(), pic(M, 'hglLostM', tex().lost, 0.5), 30, {}],
    hglStarBoard: (M) => [HG.starBoard(), darkM(M), 2, {}],
    hglStar: (M) => [HG.star(), M.hglStarM || (M.hglStarM = kMat(0.18, 2.4)), 10, { aK: 1 }],
    hglJarBase: (M) => [HG.jarBase(), paintM(M), 60, {}],
    hglJarGlass: (M) => [HG.jarGlass(), M.hglJarGlassM || (M.hglJarGlassM = glassMat()), 60, {}],
    hglJarFluid: (M) => [HG.jarFluid(), M.hglFluidM || (M.hglFluidM = kMat(0.25, 1.4)), 60, { aK: 1 }],
    hglJarLabel: (M) => [HG.jarLabel(), M.hglLabelM || (M.hglLabelM = cellMat(tex().label, 4, 4, 0.35, 0.8)), 60, { aCell: 1, aK: 1 }],
    hglBelt: (M) => [HG.belt(), darkM(M), 40, {}],
    hglGantry: (M) => [HG.gantry(), glossM(M), 20, {}],
    hglPress: (M) => [HG.press(), chromeM(M), 20, {}],
    hglCompact: (M) => [HG.compact(), glossM(M), 200, {}],
    hglFrame: (M) => [HG.frame(), VC(M, 'hglGiltM', 0.3, { roughness: 0.3, metalness: 0.6 }), 30, {}],
    hglStanchion: (M) => [HG.stanchion(), VC(M, 'hglGiltM', 0.3, { roughness: 0.3, metalness: 0.6 }), 200, {}],
    hglRope: (M) => [HG.rope(), VC(M, 'hglRopeM', 0.25, { roughness: 0.7 }), 400, {}],
    hglCamera: (M) => [HG.camera(), darkM(M), 120, {}],
    hglBubble: (M) => [HG.bubble(), M.hglBubbleM || (M.hglBubbleM = kMat(0.5, 0.9)), 4, { aK: 1 }],
    hglBoard: (M) => [HG.board(), glossM(M), 30, {}],
    hglBoardFace: (M) => [HG.boardFace(), M.sign, 30, { aIdx: 1, aWake: 2 }],
  },
  parts: {
    // ---- the set-pieces, each where it's sung ----
    hglProp(S, it, p, q, yaw) {
      const L = S.layers, k = it.kind;
      if (!S.track) { for (const n of PROP_LAYERS[k] || []) void L[n]; return; }
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, c = S.course, lit = clinicLit(T);
      const at = S._hgv || (S._hgv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (x, y, z, size, cl, k2) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, cl, k2); };
      const spot = (k2, cl = WHITEL, r = 26) => poolAt(S, at.x, (it.h ?? 0) + 0.2, at.z, r * s, cl, k2);
      const sgn = S.atlas.index;
      if (k === 'drill') {
        // the drill on the roof, its bit into it: it runs on "drill, baby, drill" and throws sparks
        put('hglDrill');
        const run = smooth(2.9, 3.15, T) * (1 - smooth(4.4, 4.9, T));
        const spin = T * 1.3 + 46 * clamp((T - 2.9) / 2.0, 0, 1);
        put('hglBit', 0, 1.8, 0, quat('_hgbq', spin));
        const w = local(at, yaw, 0, -6 * s, 0, S._o);
        for (let j = 0; j < 8; j++) { const a = j * 2.4 + T * 23, r = (2 + 4 * hash(j + Math.floor(T * 14))) * s; glowAt(S, w.x + Math.cos(a) * r, w.y + hash(j * 3.1 + Math.floor(T * 14)) * 3 * s, w.z + Math.sin(a) * r, 1.4 * s, j % 2 ? GOLDL : WHITEL, 1.6 * run); }
        glowAt(S, w.x, w.y, w.z, 14 * s, GOLDL, 0.15 + 0.8 * run);
        light(0, 16, 4.2, 2.2, PINKL, 0.9);
        for (const x of [-1.6, 1.6]) light(x, 23.5, 3.2, 1.2, WHITEL, 0.6);
      } else if (k === 'neon') {
        // the clinic's name in neon over its door; it blinks for "empty, pretty"
        const big = it.size !== 'small', f = it.flick && T < 1.6 ? ((Math.floor(T * 9) % 3) ? 1 : 0.15) : 1;
        put(big ? 'hglNeonBig' : 'hglNeonSmall', 0, 0, 0, q, s, signV(sgn[it.sign], f));
        light(0, 0, 1.4, big ? 34 : 18, it.cl || HOTL, 0.22 * f);
      } else if (k === 'desk') {
        put('hglDesk');
        put('hglSignMid', 0, 19.6, -8.2, q, s * 1.3, signV(sgn.hglCONSULT, 0.4 + 0.6 * lit));
        light(0, 19.6, -7, 20, PINKL, 0.3 * lit); spot(0.5 * lit, BLUSHL, 26);
        for (let j = 0; j < 5; j++) light(-6 + j * 3, 4.9, 4.4, 1.2, GOLDL, 0.7 * lit);
      } else if (k === 'easel') {
        put('hglEasel'); put('hglForm');
        light(0, 9.6, 5, 16, WHITEL, 0.25 * lit); spot(0.45 * lit, WHITEL, 18);
        // the tick goes in on "consultation"
        const tk = it.tick ?? 1e9;
        if (T > tk && T < tk + 0.8) light(-2.8, 10.6, 1.4, 4, HOTL, 1.4 * (1 - (T - tk) / 0.8));
      } else if (k === 'menu') {
        // the menu; LOBOTOMY, the last line, lights up on "make me dumb"
        put('hglMenu'); put('hglMenuFace');
        const on = smooth(it.on - 0.05, it.on + 0.15, T), bf = ((c.beatAt(T) % 1) + 1) % 1, beat = Math.exp(-bf * 3);
        for (let j = 0; j < 5; j++) light(-3.6 + j * 1.8, 7.05, 0.9, 2.6, HOTL, on * (0.6 + 0.5 * beat));
        light(0, 11, 2, 18, WHITEL, 0.15 * lit); spot(0.35 * lit, BLUSHL, 16);
      } else if (k === 'bin') {
        // BAD PARTS: the lid pops open on "out" and stays open
        put('hglBin'); put('hglBinFace', 0, 0, 0, q, s, signV(sgn.hglBAD, 0.5 + 0.5 * lit));
        const o = it.open ?? 1e9, op = smooth(o - 0.05, o + 0.12, T);
        put('hglBinLid', 0, 6.4, -2.9, quat('_hgbl', 0, -1.95 * op + 0.25 * op * Math.exp(-(T - o) * 6) * Math.sin((T - o) * 30)));
        if (T > o && T < o + 0.9) light(0, 9, 0, 9 * (1 + (T - o)), HOTL, 1.2 * (1 - (T - o) / 0.9));
        spot(0.4 * lit, REDL, 14);
      } else if (k === 'gas') {
        // the laughing gas: little bubbles of it going up, faster while she giggles
        put('hglGas'); put('hglSignMid', 0, 4.1, 1.75, q, s * 0.8, signV(sgn.hglGAS, 0.45 + 0.55 * lit));
        const g0 = it.giggle ?? 1e9, gk = smooth(g0 - 0.2, g0 + 0.2, T) * (1 - smooth(g0 + 2.6, g0 + 3.4, T));
        for (let j = 0; j < 12; j++) {
          const x = [-3.3, 0, 3.3][j % 3], f = ((T * (0.35 + 0.9 * gk) + j * 0.27) % 1);
          light(x + Math.sin(T * 3 + j) * 1.2, 15.6 + f * 14, 0, 1.0 + f * 1.4, [SKYL, PINKL, LILACL][j % 3], (0.25 + 1.1 * gk) * (1 - f));
        }
        spot(0.35 * lit, PINKL, 16);
      } else if (k === 'rack') {
        put('hglRack');
        for (let j = 0; j < 4; j++) put('hglMag', -2.6 + (j % 2) * 5.2, j < 2 ? 4.4 : 11.4, 1.0, q, s, ck((j + (it.v ?? 0)) % 4, 0.55 + 0.45 * lit));
        light(0, 16, 3, 18, WHITEL, 0.2 * lit); spot(0.35 * lit, BLUSHL, 16);
      } else if (k === 'tchair') {
        put('hglTChair');
        spot(0.7 * lit, COOL, 22); light(0, 6, 0, 12, COOL, 0.15 * lit);
      } else if (k === 'pick') {
        // THIRD EYE: the pick comes down onto the crystal on "pick", the mallet comes down on it on
        // "third", and on "eye" the crystal goes to pieces and its light with it
        const p0 = it.pick ?? 1e9, hit = it.hit ?? 1e9, go = it.go ?? 1e9;
        put('hglPlinth'); put('hglSignSmall', 0, 0, 0, q, s, signV(sgn.hglEYE, 0.4 + 0.6 * lit));
        if (T < go) put('hglCrystal');
        // the pick leans in, its point on the crystal; it slides down onto it on "pick" and in on "third"
        const th = 0.95, ux = Math.sin(th), uy = Math.cos(th);
        const drive = smooth(hit - 0.02, hit + 0.06, T), back = 5 * (1 - smooth(p0 - 0.7, p0, T)) - 1.3 * drive;
        const tx = ux * back, ty = 10.6 + uy * back;
        put('hglPick', tx, ty, 0, quat('_hgpq', 0, 0, -th));
        if (T > p0 - 0.1 && T < go) light(0, 10.8, 0, 3, PINKL, 1.4);
        // the mallet waits up and back, comes down square on the pick's end on "third", bounces a little
        const ex = ux * -1.3 + ux * 17.5, ey = 10.6 + uy * -1.3 + uy * 17.5, pvx = ex + 9 * Math.cos(th), pvy = ey - 9 * Math.sin(th);
        const sw = smooth(hit - 0.3, hit, T), bo = T > hit ? 0.16 * Math.exp(-(T - hit) * 7) * Math.sin((T - hit) * 26) : 0;
        put('hglMallet', pvx, pvy, 0, quat('_hgmq', 0, 0, Math.PI / 2 - th - 1.25 * (1 - sw) - bo));
        if (T > hit && T < hit + 0.4) light(ex, ey, 0, 8, HOTL, 1.6 * (1 - (T - hit) / 0.4));
        if (T < go) { const pulse = 0.5 + 0.5 * Math.sin(T * 5); light(0, 8.5, 0, 14, AMETH, (0.35 + 0.25 * pulse) * (0.4 + 0.6 * lit) + 0.8 * drive); }
        else {
          // the pieces, out and down
          const u = T - go;
          if (u < 1.8) for (let j = 0; j < 22; j++) {
            const a = hash(j + 1) * 6.28, v = 7 + hash(j + 5) * 9, up = 6 + hash(j + 9) * 12;
            const x = Math.cos(a) * v * u, z = Math.sin(a) * v * u, y = 8 + up * u - 11 * u * u;
            if (y < 4.4 && Math.hypot(x, z) < 4) continue;
            put('hglShard', x, Math.max(0.4, y), z, quat('_hgsq', u * 7 + j, u * 5 + j * 0.3), s);
          }
          if (u < 0.6) light(0, 8, 0, 30 * (0.6 + u), AMETH, 2.2 * (1 - u / 0.6));
        }
        spot(0.5 * lit, AMETH, 20);
      } else if (k === 'phoneFlat') {
        // the phone face up under the jump, the size of a block, trending
        const qf = quat('_hgpf', 0, -Math.PI / 2);
        put('hglPhone', 0, 0.6, 0, qf); put('hglPhoneFace', 0, 0.6, 0, qf, s, ck(0, 0.9 + 0.1 * Math.sin(T * 6)));
        light(0, 2, -9.5, 60, PINKL, 0.3);
      } else if (k === 'melon') {
        // the baller comes down on "melon", turns in it on "baller", and on "wow" throws the ball
        put('hglMelon');
        const a = it.melon ?? 1e9, b = it.baller ?? 1e9, w0 = it.wow ?? 1e9;
        const down = smooth(a - 0.5, a, T), turn = smooth(b - 0.3, b, T), up = smooth(w0 - 0.5, w0 - 0.05, T);
        const by = 30 - 19.4 * down + 10 * up;
        put('hglBaller', 1.6, by, 0, quat('_hgba', 0, 0, -0.35 + turn * 1.2 - up * 0.6));
        if (T > b - 0.1 && T < w0) put('hglBall', 1.6 + 0.4 * turn, by + 0.2, 0);
        else if (T >= w0 && T < w0 + 2.2) { const u = T - w0; put('hglBall', 1.6 - 9 * u, by + 0.2 + 26 * u - 14 * u * u, 4 * u, q, s * (1 + 0.8 * u)); light(1.6 - 9 * u, by + 26 * u - 14 * u * u, 4 * u, 6, MELONL, 1.2 * (1 - u / 2.2)); }
        light(0, 15.5, 0, 16, MELONL, 0.35); spot(0.45, MELONL, 26);
      } else if (k === 'pool') {
        put('hglPool');
        // the lights in its walls still on, nothing for them to light
        for (let j = 0; j < 6; j++) light(-10 + j * 4, 1.8, -7.4, 2, SKYL, 0.6);
        spot(0.35, SKYL, 30);
      } else if (k === 'musicbox') {
        // the drum turning, the comb catching it; on "sound" the whole box rings
        put('hglMusicBox');
        put('hglDrum', 0, 8.55, 0.45, quat('_hgmd', 0, T * 1.6));
        const r0 = it.ring ?? 1e9, rk = T > r0 ? Math.exp(-(T - r0) * 1.6) : 0;
        for (let j = 0; j < 14; j++) light(-3.9 + j * 0.6, 8.7, 2.6, 0.9, GOLDL, 0.3 + 0.7 * Math.max(0, Math.sin(T * 9 + j * 1.3)) * 0.6 + rk * 1.5);
        light(0, 14, -3, 20, BLUSHL, 0.25 + 1.2 * rk); spot(0.4 + 0.6 * rk, PINKL, 30);
      } else if (k === 'vanity') {
        // the mirror's bulbs, all of them on "pretty"
        put('hglVanity'); put('hglMirror');
        const pr = it.pretty ?? 1e9, pk = T > pr ? Math.exp(-(T - pr) * 0.8) : 0;
        for (let j = 0; j < 18; j++) {
          let x, y; if (j < 7) { x = -7.2 + j * 2.4; y = 19.2; } else if (j < 11) { x = 8.0; y = 17.2 - (j - 7) * 2.4; } else if (j < 15) { x = -8.0; y = 17.2 - (j - 11) * 2.4; } else { x = -4.8 + (j - 15) * 4.8; y = 8.0; }
          light(x, y, -1.8, 1.5, WHITEL, 0.7 + 1.2 * pk);
        }
        light(0, 13, 0, 22, WHITEL, 0.2 + 0.5 * pk); spot(0.4 + 0.5 * pk, WHITEL, 26);
      } else if (k === 'vacancy') {
        const f = (Math.floor(T * 7 + it.t * 3) % 11) ? 1 : 0.25;
        put('hglSignMid', 0, 0, 0, q, s, signV(sgn.hglVAC, f * (0.5 + 0.5 * lit)));
        light(0, 0, 1, 16 * s, REDL, 0.2 * f);
      } else if (k === 'counter') {
        // WE BUY DEGREES: her degree goes across on "degree", a box of filler comes back on "fillers"
        put('hglCounter'); put('hglSignBig', 0, 0, 0, q, s, signV(sgn.hglBUY, 0.45 + 0.55 * lit));
        const d0 = it.degree ?? 1e9, f0 = it.fillers ?? 1e9;
        const dz = 4.4 - 7.2 * smooth(d0 - 0.1, d0 + 0.5, T), dy = 8.6 - 4 * smooth(d0 + 0.5, d0 + 0.9, T);
        if (T < d0 + 0.9) { const dq = quat('_hgdq', 0, -0.9); put('hglDiploma', 0, dy, dz, dq); put('hglDiplomaFace', 0, dy, dz, dq); }
        const sz = -2.4 + 5.8 * smooth(f0 - 0.15, f0 + 0.35, T), sy = 5.8 + 1.4 * smooth(f0 - 0.3, f0 - 0.1, T) * (1 - smooth(f0 + 0.35, f0 + 0.5, T));
        if (T > f0 - 0.3) put('hglSyringe', 0, sy + 1.3, sz);
        light(0, 15.8, 0, 20, GOLDL, 0.25 * lit); spot(0.5 * lit, GOLDL, 22);
        if (T > d0 && T < d0 + 0.6) light(0, 9, 3, 10, GOLDL, 1.2 * (1 - (T - d0) / 0.6));
      } else if (k === 'shredder') {
        // philosophy, a book at a time, into the shredder on "philosophy"; out comes paper
        put('hglShredder');
        const p0 = it.philo ?? 1e9;
        for (let j = 0; j < 6; j++) {
          const t0 = p0 + j * 0.13, u = clamp((T - t0) / 0.22, 0, 1);
          if (u >= 1) continue;
          const y = 12.0 + j * 0.95 - (12.0 + j * 0.95 - 10.0) * u * u;
          const bq = quat('_hgbk', (j % 2 ? 0.08 : -0.06) + u * 0.4);
          put('hglBook', 0, y, 0, bq); put('hglBookFace', 0, y, 0, bq, s, ck(j, 0.5 + 0.5 * lit));
        }
        if (T > p0) for (let j = 0; j < 24; j++) {
          const t0 = p0 + 0.2 + j * 0.05, u = T - t0;
          if (u < 0 || u > 2.2) continue;
          const x = -3 + (j % 12) * 0.55, y = 8.2 - Math.min(8.0, 5 * u * u), z = 3.2 + u * 1.6 + hash(j) * 1.2;
          put('hglStrip', x, y, z, quat('_hgst', hash(j) * 0.6, 0.2 + u * 0.9, (hash(j + 3) - 0.5) * 0.8));
        }
        light(0, 11, 2, 12, WHITEL, 0.25 * lit); spot(0.4 * lit, WHITEL, 18);
      } else if (k === 'scale') {
        // counting the calories: 1200, 800, 400, 0
        put('hglScale');
        const c0 = it.count ?? 1e9, cell = T < c0 - 0.35 ? 0 : T < c0 ? 1 : T < c0 + 0.35 ? 2 : 3;
        put('hglKcal', 0, 0, 0, q, s, ck(cell, 0.6 + 0.4 * lit));
        light(0, 17.6, -0.4, 10, GREENL, 0.4 + (cell === 3 ? 0.5 * Math.exp(-(T - c0 - 0.35) * 1.5) : 0)); spot(0.35 * lit, WHITEL, 16);
      } else if (k === 'plate') {
        // dinner: what's on the plate, on its word; on the last one, nothing
        put('hglPedestal');
        const on = it.on ?? 1e9, u = smooth(on - 0.1, on + 0.12, T);
        if (it.v === 0 && u > 0) put('hglSmoothie', 0, 8.8 * (1 - u), 0, q, s * u + 0.001);
        else if (it.v === 1 && u > 0) put('hglSalad', 0, 8.8 * (1 - u), 0, q, s * u + 0.001);
        else if (it.v === 2) put('hglCutlery');
        const sp = T > on - 0.1 ? 0.6 + 0.8 * Math.exp(-(T - on) * 1.4) : 0.15;
        light(0, 18, 0, 10, WHITEL, 0.5 * sp); spot(0.5 * sp, WHITEL, 12);
      } else if (k === 'tiara') {
        // "finally a winner": the tiara, glittering, and all of it on "winner"
        put('hglTiara');
        const wn = it.win ?? 1e9, wk = T > wn ? Math.exp(-(T - wn) * 0.9) : 0;
        for (let j = 0; j < 5; j++) { const a = Math.PI * (j + 0.5) / 5; light(Math.cos(a) * 2.4, 8.8 + Math.sin(a) * 2.4 + 1.6, 0.4, 1.6, j % 2 ? WHITEL : PINKL, 0.5 + 0.9 * Math.max(0, Math.sin(T * 7 + j * 2)) + 1.5 * wk); }
        light(0, 10, 0, 22, GOLDL, 0.2 + 1.2 * wk); spot(0.45 + 0.6 * wk, GOLDL, 22);
      } else if (k === 'lobe') {
        // "frontal lobe, don't know her": its sign, and CLOSED on "don't"
        put('hglWayPost'); put('hglWayTop', 0, 0, 0, q, s, signV(sgn.hglLOBE, 0.4 + 0.6 * lit));
        const cl = it.closed ?? 1e9;
        if (T > cl) put('hglWayBottom', 0, 0, 0, q, s, signV(sgn.hglCLOSED, (Math.floor((T - cl) * 8) % 2 || T > cl + 0.6 ? 1 : 0.2) * (0.5 + 0.5 * lit)));
        spot(0.3 * lit, COOL, 14);
      } else if (k === 'stars') {
        // five stars, one at a time on "five", all of them on "stars"
        const sm = c.sample(it.t, S._hgSs || (S._hgSs = {})), sy = yaw + Math.PI;
        S._e.set(0, sy, Math.sin(T * 1.1) * 0.02); const fq = (S._hgsb || (S._hgsb = new THREE.Quaternion())).setFromEuler(S._e);
        p.y = sm.y + (it.above ?? 19);
        m.compose(p, fq, S._s.set(s, s, s)); L.hglStarBoard.add(m);
        const f0 = it.five ?? 1e9, st = it.stars ?? 1e9, sk = T > st ? Math.exp(-(T - st) * 0.9) : 0;
        for (let j = 0; j < 5; j++) {
          const on = smooth(f0 - 0.5 + j * 0.13, f0 - 0.42 + j * 0.13, T), w = local(p, sy, (-17.6 + j * 8.8) * s, 0, 0.4 * s, S._o);
          m.compose(w, fq, S._s.set(s, s, s)); L.hglStar.add(m, kv(0.05 + 0.75 * on + 0.8 * sk));
          if (on > 0) glowAt(S, w.x, w.y, w.z, 9 * s, GOLDL, 0.3 * on + 0.9 * sk);
        }
      } else if (k === 'bubble') {
        // an empty thought over the road; it pops a beat later
        const a = it.on ?? 1e9, b = it.pop ?? a + 0.8;
        if (T < a - 0.05 || T > b + 0.5) return;
        const sm = c.sample(it.t, S._hgSb || (S._hgSb = {}));
        const grow = smooth(a - 0.05, a + 0.18, T), pop = T > b ? (T - b) / 0.5 : 0;
        const sc = s * (0.4 + 0.6 * grow) * (1 + 0.5 * pop);
        p.y = sm.y + (it.above ?? 15);
        S._e.set(0, sm.yaw + Math.PI, Math.sin(T * 2 + it.t) * 0.06); const bq = (S._hgbb || (S._hgbb = new THREE.Quaternion())).setFromEuler(S._e);
        if (pop <= 0) { m.compose(p, bq, S._s.set(sc, sc, sc)); L.hglBubble.add(m, kv(0.7 + 0.3 * Math.sin(T * 6))); glowAt(S, p.x, p.y, p.z, 26 * s, WHITEL, 0.2 * grow); }
        else { glowAt(S, p.x, p.y, p.z, 30 * s * (1 + pop), WHITEL, 1.4 * (1 - pop)); for (let j = 0; j < 10; j++) { const an = j * 0.628; glowAt(S, p.x + Math.cos(an) * 14 * s * pop, p.y + Math.sin(an) * 9 * s * pop, p.z, 2.4 * s, WHITEL, 1.2 * (1 - pop)); } }
      }
    },
    // a palm on the street, a pink lamp's worth of light on it
    hglPalm(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s * (it.sy ?? 1), it.s)); S.layers.hglPalm.add(m); },
    // the lobby's columns; the ones you pass on "he drew dots" get a ring of them, one at a time
    hglColumn(S, it, p, q) {
      const L = S.layers; void L.hglColumn;
      if (!S.track) return;
      const m = S._m, T = S.tNow ?? 0, lit = clinicLit(T);
      m.compose(p, q, S._s.set(1, 1, 1)); L.hglColumn.add(m);
      glowAt(S, p.x, p.y + 24.6, p.z, 3, BLUSHL, 0.4 * lit);
      if (it.dots === undefined) return;
      for (let j = 0; j < 14; j++) {
        const t0 = it.dots + j * 0.07; if (T < t0) break;
        const a = j / 14 * Math.PI * 2;
        for (const y of [12.6, 16.2]) glowAt(S, p.x + Math.cos(a) * 2.05, p.y + y + 0.4 * Math.sin(a * 2), p.z + Math.sin(a) * 2.05, 0.75, MARK, 1.6 + 1.2 * Math.exp(-(T - t0) * 6));
      }
    },
    // a waiting-room chair
    hglChair(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s ?? 1, it.s ?? 1, it.s ?? 1)); S.layers.hglChair.add(m); },
    // a salon chair with its hood dryer, the hood glowing a little
    hglDryer(S, it, p, q, yaw) {
      const L = S.layers; void L.hglDryer;
      if (!S.track) return;
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); L.hglDryer.add(m);
      const T = S.tNow ?? 0, w = local(p, yaw, 0, 7.6, -0.4, S._o);
      glowAt(S, w.x, w.y, w.z, 2.2, LILACL, (0.3 + 0.25 * Math.sin(T * 3 + it.seed * 9)) * clinicLit(T));
    },
    // a phone as tall as a tower, out in the city, its screen on, hearts coming off it
    hglPhone(S, it, p, q, yaw) {
      const L = S.layers; void L.hglPhone; void L.hglPhoneFace; void L.hglHeart;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s;
      m.compose(p, q, S._s.set(s, s, s)); L.hglPhone.add(m);
      const fl = 0.85 + 0.15 * Math.sin(T * 2 + it.seed * 20);
      L.hglPhoneFace.add(m, ck(it.cell, fl));
      const w = local(p, yaw, 0, 9.5 * s, 2 * s, S._o);
      glowAt(S, w.x, w.y, w.z, 22 * s, it.cell === 1 ? HOTL : PINKL, 0.12);
      if (it.t > T + 30) return;
      // hearts up off the top, faster in the choruses
      const hq = S._hgHq || (S._hgHq = new THREE.Quaternion());
      S._e.set(0, yaw, 0); hq.setFromEuler(S._e);
      for (let j = 0; j < 3; j++) {
        const f = (T * 0.22 + j / 3 + it.seed) % 1;
        const hw = local(p, yaw, (Math.sin(j * 2.1 + it.seed * 9 + T) * 3) * s, (19 + f * 26) * s, 1 * s, S._o);
        const hs = s * (0.8 + 0.6 * f) * (f < 0.1 ? f / 0.1 : 1);
        m.compose(hw, hq, S._s.set(hs, hs, hs)); L.hglHeart.add(m, kv(0.6 * (1 - f)));
      }
    },
    // NO THINKING, on a pole
    hglSign(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s ?? 1, it.s ?? 1, it.s ?? 1)); S.layers.hglSignPole.add(m); S.layers.hglSignDisc.add(m); },
    // an EEG on its stand: the traces go flat on "brain-dead"
    hglMonitor(S, it, p, q, yaw) {
      const L = S.layers; void L.hglMonitor; void L.hglEEG;
      if (!S.track) return;
      const m = S._m; m.compose(p, q, S._s.set(1.2, 1.2, 1.2)); L.hglMonitor.add(m); L.hglEEG.add(m, kv(it.seed));
      const w = local(p, yaw, 0, 13.9, 1.2, S._o);
      glowAt(S, w.x, w.y, w.z, 7, GREENL, 0.18);
    },
    // a LOST poster on the wall
    hglPoster(S, it, p, q) { if (!S.track) { void S.layers.hglPoster; return; } const m = S._m; p.y = (it.h ?? 0) + it.y; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.hglPoster.add(m); },
    // a specimen jar on its pedestal: a feeling in it, its label, its light
    hglJar(S, it, p, q, yaw) {
      const L = S.layers; void L.hglJarBase; void L.hglJarGlass; void L.hglJarFluid; void L.hglJarLabel;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, s = it.s ?? 1;
      const said = it.said !== undefined ? (T > it.said ? Math.exp(-(T - it.said) * 1.2) : 0) : 0, jk = it.jars !== undefined && T > it.jars ? Math.exp(-(T - it.jars) * 1.5) : 0;
      m.compose(p, q, S._s.set(s, s, s));
      L.hglJarBase.add(m); L.hglJarFluid.add(m, kv(0.32 + 0.12 * Math.sin(T * 1.5 + it.seed * 10) + 0.5 * jk + 1.2 * said)); L.hglJarLabel.add(m, ck(it.cell, 0.6 + 0.4 * said)); L.hglJarGlass.add(m);
      const w = local(p, yaw, 0, (8.4 + 0.6 * Math.sin(T * 0.9 + it.seed * 7)) * s, 0, S._o);
      glowAt(S, w.x, w.y, w.z, (3.6 + 4 * said) * s, it.cl, 0.75 + 1.4 * said + 0.6 * jk);
      poolAt(S, p.x, p.y + 0.2, p.z, 9 * s, it.cl, 0.3 + 0.5 * said);
    },
    // a stretch of the line: the belt, the compacts riding it, a stamp coming down on the beat
    hglBelt(S, it, p, q, yaw) {
      const L = S.layers; void L.hglBelt; void L.hglCompact; void L.hglGantry; void L.hglPress;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, c = S.course;
      m.compose(p, q, S._s.set(1, 1, 1)); L.hglBelt.add(m);
      const dir = it.x > 0 ? -1 : 1;
      for (let j = 0; j < 4; j++) {
        const z = ((T * 6 * dir + j * 7.5 + it.seed * 30) % 30 + 30) % 30 - 15;
        const w = local(p, yaw, 0, 5.0, z, S._o); m.compose(w, q, S._s.set(1, 1, 1)); L.hglCompact.add(m);
      }
      if (!it.press) return;
      const f = ((c.beatAt(T) % 1) + 1) % 1, down = f < 0.12 ? f / 0.12 : Math.max(0, 1 - (f - 0.12) / 0.4);
      const g = local(p, yaw, 0, 0, 0, S._o); m.compose(g, q, S._s.set(1, 1, 1)); L.hglGantry.add(m);
      const pw = local(p, yaw, 0, 12.2 - 6.2 * down, 0, S._o); m.compose(pw, q, S._s.set(1, 1, 1)); L.hglPress.add(m);
      if (f < 0.15) { const hw = local(p, yaw, 0, 5.6, 0, S._o); glowAt(S, hw.x, hw.y, hw.z, 5, HOTL, 1.4 * (1 - f / 0.15)); }
    },
    // an empty gilt frame on its stand in the gallery
    hglFrame(S, it, p, q, yaw) {
      if (!S.track) { void S.layers.hglFrame; return; }
      const m = S._m, T = S.tNow ?? 0; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.hglFrame.add(m);
      const lk = it.lit !== undefined && T > it.lit ? 0.5 + 0.8 * Math.exp(-(T - it.lit) * 1.2) : 0.35;
      const w = local(p, yaw, 0, 20 * it.s, 2.4 * it.s, S._o); glowAt(S, w.x, w.y, w.z, 4 * it.s, WHITEL, lk);
      poolAt(S, p.x, p.y + 0.15, p.z, 14 * it.s, WHITEL, 0.4 * lk);
    },
    // the carpet's stanchions and the velvet rope to the next
    hglRope(S, it, p, q) {
      const L = S.layers; void L.hglStanchion; void L.hglRope;
      if (!S.track) return;
      const m = S._m; m.compose(p, q, S._s.set(1.2, 1.2, 1.2)); L.hglStanchion.add(m);
      if (it.next === undefined || it.t > (S.tNow ?? 0) + 30) return;
      const a = S._hga || (S._hga = new THREE.Vector3()), b = S._hgb || (S._hgb = new THREE.Vector3()), mid = S._hgm || (S._hgm = new THREE.Vector3());
      S.track.ground(it.t, it.x, a); S.track.ground(it.next, it.x, b); a.y = b.y = p.y + 5.0;
      mid.addVectors(a, b).multiplyScalar(0.5); mid.y -= 1.3;
      ropeSeg(S, a, mid); ropeSeg(S, mid, b);
    },
    // a press photographer's camera behind the rope, going off
    hglPress(S, it, p, q, yaw) {
      if (!S.track) { void S.layers.hglCamera; return; }
      const T = S.tNow ?? 0, m = S._m; m.compose(p, q, S._s.set(1.3, 1.3, 1.3)); S.layers.hglCamera.add(m);
      const ev = Math.floor(T * 5 + it.seed * 50), go = hash(ev * 1.7 + it.seed * 31) > 0.86;
      let f = go ? Math.max(0, 1 - ((T * 5 + it.seed * 50) % 1) * 3) : 0;
      for (const t0 of it.shots || []) if (T > t0 && T < t0 + 0.35) f = Math.max(f, 1 - (T - t0) / 0.35);
      if (f > 0.01) { const w = local(p, yaw, 0.4, 11.1, 0.9, S._o); glowAt(S, w.x, w.y, w.z, 9 + 10 * f, WHITEL, 2.2 * f); }
    },
    // a lyric light box hung over the road, its pink tube
    hglBoard(S, it, p) {
      const L = S.layers; void L.hglBoard; void L.hglBoardFace;
      if (!S.track) return;
      const T = S.tNow ?? 0, c = S.course, sm = c.sample(it.t, S._hgSl || (S._hgSl = {})), yaw = sm.yaw + Math.PI;
      S._e.set(0, yaw, Math.sin(T * 1.1 + it.t) * 0.02); const fq = (S._hgbd || (S._hgbd = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = sm.y + (it.h || 14);
      const m = S._m, s = it.s ?? 1, lit = 0.45 + 0.55 * clinicLit(T);
      m.compose(p, fq, S._s.set(s, s, s)); L.hglBoard.add(m); L.hglBoardFace.add(m, signV(it.idx, lit));
      const w = S._o, beat = Math.exp(-(((c.beatAt(T) % 1) + 1) % 1) * 4);
      for (let j = 0; j < 22; j++) {
        let bx, by;
        if (j < 8) { bx = -12.6 + j * 3.6; by = 5.3; } else if (j < 16) { bx = 12.6 - (j - 8) * 3.6; by = -5.3; } else if (j < 19) { bx = 14.1; by = -2.6 + (j - 16) * 2.6; } else { bx = -14.1; by = 2.6 - (j - 19) * 2.6; }
        local(p, yaw, bx * s, by * s, -1.2 * s, w); glowAt(S, w.x, w.y, w.z, 2.2 * s, HOTL, (0.55 + 0.4 * beat) * lit);
      }
      glowAt(S, p.x, p.y, p.z, 34 * s, PINKL, 0.08 * lit);
    },
  },
  kits: {
    // the set-pieces; those indoors stand on the room's floor
    hglProps(S, z) {
      for (const a of z.at) {
        const it = { ...a, parts: 'hglProp', rot: a.rot ?? (a.x === 0 ? (a.kind === 'neon' ? Math.PI : 0) : FACE(a.x)), s: a.s ?? 1 };
        if (a.floor) onFloor(S, it);
        if (a.roof !== undefined) { prepare(S.course, S.plan); it.h = floorAt(S.course, a.roof) + a.y0; it.y = 0; }
        S.items.push(it);
      }
    },
    // palms both sides of the street, a row of them further back
    hglPalms(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) {
        S.items.push({ t: t + R() * 0.15, x: side * (29 + R() * 6), rot: R() * 6.28, s: 1.25 + R() * 0.35, sy: 0.9 + R() * 0.4, parts: 'hglPalm' });
        if (R() < 0.7) S.items.push({ t: t + R() * 0.3, x: side * (58 + R() * 70), rot: R() * 6.28, s: 1.4 + R() * 0.6, parts: 'hglPalm' });
      }
    },
    // the lobby's columns down both walls; the ones in [dotFrom, dotTo] get the dots
    hglColumns(S, z) {
      for (let t = z.from; t < z.to; t += z.every ?? 1.1) for (const side of [-1, 1]) {
        const it = onFloor(S, { t, x: side * (z.x ?? 31), rot: 0, parts: 'hglColumn' });
        if (z.dotFrom !== undefined && t > z.dotFrom && t < z.dotTo) it.dots = z.dotAt + (side > 0 ? 0.04 : 0);
        S.items.push(it);
      }
    },
    // the waiting chairs along the walls in twos and threes, facing the road
    hglChairs(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 0.42) for (const side of [-1, 1]) {
        if ((z.clear || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) continue;
        if (R() < 0.25) continue;
        S.items.push(onFloor(S, { t: t + R() * 0.05, x: side * ((z.x ?? 25) + R() * 1.5), rot: SIDE(side), s: z.s ?? 1, parts: z.dryer ? 'hglDryer' : 'hglChair', seed: R() }));
        if (z.rows && R() < 0.8) S.items.push(onFloor(S, { t: t + 0.2 + R() * 0.05, x: side * ((z.x ?? 25) + 7 + R() * 1.5), rot: SIDE(side), s: z.s ?? 1, parts: z.dryer ? 'hglDryer' : 'hglChair', seed: R() }));
      }
    },
    // the phones standing in the city
    hglPhones(S, z, R) {
      for (let t = z.from; t < z.to; t += z.every ?? 1.1) for (const side of [-1, 1]) {
        const x = side * (z.x0 + R() * (z.x1 - z.x0));
        S.items.push({ t: t + R() * 0.5, x, rot: FACE(side) + (R() - 0.5) * 0.4, s: 3.2 + R() * 3.5 + Math.abs(x) * 0.01, cell: Math.floor(R() * 4), seed: R(), parts: 'hglPhone' });
      }
    },
    // NO THINKING on both sides
    hglSigns(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) S.items.push({ t: t + (side > 0 ? 0.25 : 0) + R() * 0.05, x: side * (z.x ?? 24), rot: FACE(side), s: z.s ?? 1.3, parts: 'hglSign' }); },
    // the EEGs along the monitor room
    hglMonitors(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.6) for (const side of [-1, 1]) if (R() < 0.85) S.items.push(onFloor(S, { t: t + R() * 0.1, x: side * ((z.x ?? 24) + R() * 3), rot: FACE(side), seed: R(), parts: 'hglMonitor' })); },
    // LOST on the walls
    hglPosters(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.45) for (const side of [-1, 1]) if (R() < 0.8) S.items.push(onFloor(S, { t: t + R() * 0.1, x: side * (z.x ?? 33.5), rot: SIDE(side), y: 9 + R() * 8, s: 1.0 + R() * 0.25, parts: 'hglPoster' })); },
    // the specimen jars on their pedestals; HURT, WORK and CARE are where they're sung
    hglJars(S, z, R) {
      const said = z.said || [];
      let k = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.45) for (const side of [-1, 1]) {
        const sp = said.find((e) => Math.abs(e.at - t - (side > 0 ? 0.22 : 0)) < 0.24 && e.side === side);
        let cell = sp ? FEELINGS.indexOf(sp.word) : [0, 1, 2, 3, 4, 5, 6, 7, 11, 12, 13, 14, 15][Math.floor(R() * 13)];
        const cl = sp ? [1, 0.55, 0.85] : [JARL, JARL, JARL, [1, 0.7, 0.35], [1, 0.5, 0.75], [0.6, 0.9, 1]][Math.floor(R() * 6)];
        S.items.push(onFloor(S, { t: t + (side > 0 ? 0.22 : 0), x: side * ((z.x ?? 24) + R() * 2), rot: FACE(side), s: z.s ?? 1.5, cell, cl, said: sp ? sp.on : undefined, jars: z.jars, seed: R(), parts: 'hglJar' }));
        k++;
      }
    },
    // the line of compacts, a stamp every so often
    hglBelts(S, z, R) { let k = 0; for (let t = z.from; t < z.to; t += z.every ?? 0.5) { for (const side of [-1, 1]) S.items.push(onFloor(S, { t, x: side * (z.x ?? 23), rot: 0, seed: R(), press: k % 3 === 0, parts: 'hglBelt' })); k++; } },
    // empty frames standing in the gallery
    hglFrames(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.8) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + (side > 0 ? 0.4 : 0) + R() * 0.1, x: side * ((z.x ?? 26) + R() * 4), rot: FACE(side), s: 1.2 + R() * 0.4, lit: z.lit ? z.lit[(side > 0 ? 1 : 0)] : undefined, parts: 'hglFrame' })); },
    // the red carpet's ropes, each stanchion knowing where the next one is
    hglRopes(S, z) {
      for (const side of [-1, 1]) {
        let last = null;
        for (let t = z.from; t < z.to; t += z.every ?? 0.32) { const it = onFloor(S, { t, x: side * (z.x ?? 14), rot: 0, parts: 'hglRope' }); if (last) last.next = t; S.items.push(it); last = it; }
      }
    },
    // the press line, behind the ropes; all of them on the shots
    hglPress(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.45) for (const side of [-1, 1]) if (R() < 0.85) S.items.push(onFloor(S, { t: t + R() * 0.15, x: side * ((z.x ?? 19) + R() * 4), rot: FACE(side), seed: R(), shots: z.shots, parts: 'hglPress' })); },
  },
});

// ---------- the clinic: its rooms ----------
const RINGS = {
  box: (W = 40, H = 30) => [[-W, H, 1, 1], [-W, 0, 1, 1], [-W, 0, 1, 0], [-W * 0.5, 0, 1, 0], [0, 0, 1, 0], [W * 0.5, 0, 1, 0], [W, 0, 1, 0], [W, 0, 1, 2], [W, H, 1, 2], [W, H, 1, 3], [W * 0.5, H, 1, 3], [0, H, 1, 3], [-W * 0.5, H, 1, 3], [-W, H, 1, 3]],
  open: (W = 46, H = 20) => [[-W, H, 1, 1], [-W, 0, 1, 1], [-W, 0, 1, 0], [-W * 0.5, 0, 1, 0], [0, 0, 1, 0], [W * 0.5, 0, 1, 0], [W, 0, 1, 0], [W, 0, 1, 2], [W, H, 1, 2]],
};
const CLINIC = {
  rings: RINGS,
  ringOf: (s) => (s === 'archive' || s === 'carpet' ? 'open' : 'box'),
  styles: { lobby: 0, recovery: 0, diet: 0, or: 1, monitor: 1, archive: 2, gallery: 3, carpet: 4 },
  dims: { lobby: [40, 30], recovery: [38, 26], diet: [40, 30], or: [34, 28], monitor: [34, 28], archive: [48, 70], gallery: [40, 28], carpet: [46, 20] },
  lights: (id) => (id === 0 ? [20, 6] : id === 1 ? [17, 4] : null),
};

function roomMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.002 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uLight: { value: new THREE.Color(1, 1, 1) }, uLit: { value: 1 }, uBeat: { value: 0 }, uGaps: { value: new THREE.Vector4(-1e5, -1e5, -1e5, -1e5) }, tLogo: { value: null }, uFlash: { value: 0 }, uMove: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uLit, uBeat, uFlash, uMove; uniform vec3 uFog, uCam, uLight; uniform vec4 uGaps; uniform sampler2D tLogo;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      ${AA_GLSL}
      float h1(float n){ return fract(sin(n * 127.1 + 3.7) * 43758.5453); }
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float covP(float d, float w){ return clamp(d / max(w, 1e-4) + 0.5, 0.0, 1.0); }
      // inside an arch (a rectangle with a half circle on top), blended over the pixel; p from the middle of its foot
      float archD(vec2 p, float hw, float hb){ float d = p.y < hb ? hw - abs(p.x) : hw - length(vec2(p.x, p.y - hb)); return min(d, p.y); }
      float boxD(vec2 p, vec2 a, vec2 b){ return min(min(p.x - a.x, b.x - p.x), min(p.y - a.y, b.y - p.y)); }
      const vec3 PINK = vec3(1.0, 0.36, 0.66), HOT = vec3(1.0, 0.14, 0.52), BLUSH = vec3(0.98, 0.72, 0.82), GOLD = vec3(0.91, 0.7, 0.28), WHITE = vec3(0.95, 0.93, 0.94);
      void main(){
        int part = int(vPart + 0.5); int st = int(uStyle + 0.5);
        float x = vC.x, h = vC.y, along = vC.z, ax = abs(x);
        vec3 col = vec3(0.0), glow = vec3(0.0);
        float lit = 0.1 + 0.9 * uLit;
        float wpx = max(fwidth(h), fwidth(along)) * 1.2;
        if (part == 7) {
          // the clinic from the street: pink stucco, arched windows lit inside, pink neon round them,
          // white cornices, a row of smaller windows above
          col = vec3(0.88, 0.48, 0.64) * (0.88 + 0.12 * n2(vec2(x, h) * 0.25));
          float cw = 22.0, cx = mod(ax - 25.0, cw) - cw * 0.5;
          float w = fwidth(x) * 1.2 + fwidth(h) * 0.6;
          float aw = ax < 27.0 ? -10.0 : archD(vec2(cx, h - 3.0), 6.0, 11.0);
          float inA = covP(aw, w);
          vec3 inside = mix(vec3(1.0, 0.62, 0.78), vec3(1.0, 0.85, 0.9), smoothstep(3.0, 20.0, h)) * (0.75 + 0.25 * sin(cx * 0.9));
          col = mix(col, inside * 0.35, inA); glow += inside * inA * 0.9;
          glow += HOT * exp(-pow(aw * 2.2, 2.0)) * 1.2 * step(-1.0, aw);
          float corn = aaBand(h, 25.0, 1.0) + aaBand(h, 44.0, 0.8);
          col = mix(col, WHITE * 0.9, clamp(corn, 0.0, 1.0));
          float up = covP(boxD(vec2(mod(ax, 11.0) - 5.5, h - 29.5), vec2(-2.2, 0.0), vec2(2.2, 7.0)), w);
          col = mix(col, vec3(0.35, 0.12, 0.22), up * step(h, 40.0)); glow += vec3(1.0, 0.5, 0.7) * up * 0.25 * step(h, 40.0) * step(0.4, h1(floor(ax / 11.0) + 3.0));
          glow += HOT * exp(-pow((h - 23.6) * 1.6, 2.0)) * 0.7;
        } else if (part == 8) { col = GOLD * 0.8; glow += GOLD * 0.25 * lit; }
        else if (st == 0) {
          // ---- the clinic's lobby, its recovery wing, its counter: marble, blush lacquer, gold ----
          if (part == 0) {
            float chk = aaChk(vec2(x, along) / 8.0);
            col = mix(vec3(0.82, 0.78, 0.8), vec3(0.9, 0.87, 0.88), chk);
            float vein = n2(vec2(x * 0.08 + along * 0.03, along * 0.06)); vein = exp(-pow((vein - 0.5) * 18.0, 2.0)) * (1.0 - smoothstep(0.3, 1.0, wpx));
            col = mix(col, vec3(0.9, 0.55, 0.7), vein * 0.35);
            // the runner down the middle: pink, a gold edge
            float run = covP(10.0 - ax, fwidth(x) * 1.2);
            col = mix(col, vec3(0.46, 0.08, 0.26) * (0.9 + 0.1 * n2(vec2(x, along) * 2.0)), run);
            col = mix(col, GOLD, aaBand(ax, 9.4, 0.25));
            float sheen = exp(-pow(mod(along, 20.0) - 10.0, 2.0) / 10.0) * exp(-x * x / 300.0);
            glow += BLUSH * sheen * 0.16 * lit;
          } else if (part == 3) {
            col = vec3(0.86, 0.72, 0.78) * (0.95 + 0.05 * aaPulse(x / 13.0 + 0.5, 0.02));
            vec2 q = vec2(x / 13.0, along / 10.0); vec2 f = fract(q) - 0.5;
            float dl = length(f * vec2(13.0, 10.0)); glow += vec3(1.0, 0.9, 0.86) * (smoothstep(1.0, 0.45, dl) * 1.1 + exp(-dl * dl / 5.0) * 0.12) * lit;
          } else {
            // the walls: a white wainscot, a gold rail, blush lacquer with arched niches lit in pink
            float a2 = part == 6 ? x : along;
            col = BLUSH * (0.92 + 0.08 * n2(vec2(a2, h) * 0.2));
            if (h < 7.0) { float pan = aaPulse(a2 / 4.0, 0.03) + aaPulse(h / 3.4, 0.05); col = WHITE * (0.9 - 0.12 * clamp(pan, 0.0, 1.0)); }
            col = mix(col, GOLD, aaBand(h, 7.3, 0.35) + aaBand(h, 27.0, 0.5));
            float nw = 22.0, nx = mod(a2, nw) - nw * 0.5;
            float nd = archD(vec2(nx, h - 9.0), 4.6, 9.0);
            float inN = covP(nd, wpx);
            col = mix(col, vec3(0.62, 0.22, 0.4), inN);
            glow += HOT * (exp(-pow(nd * 3.0, 2.0)) * 1.3 + inN * 0.12) * lit * (0.75 + 0.25 * uBeat);
            float sc = length(vec2(mod(a2 + 11.0, nw) - nw * 0.5, h - 17.0));
            glow += vec3(1.0, 0.82, 0.72) * (smoothstep(1.0, 0.4, sc) * 1.4 + exp(-sc * sc / 18.0) * 0.3) * lit;
          }
        } else if (st == 1) {
          // ---- the procedure room, the monitor room: white tile, a mint band, strip lights ----
          if (part == 0) {
            col = vec3(0.46, 0.5, 0.52) * (0.9 + 0.1 * n2(vec2(x, along) * 1.3));
            col = mix(col, vec3(0.3, 0.45, 0.45), smoothstep(25.0, 26.0, ax));
            col = mix(col, vec3(0.85, 0.3, 0.3), aaBand(ax, 6.0, 0.18) * 0.6);
            glow += vec3(0.85, 0.95, 1.0) * exp(-pow(mod(along, 17.0) - 8.5, 2.0) / 9.0) * exp(-x * x / 200.0) * 0.12 * lit;
          } else if (part == 3) {
            col = vec3(0.86, 0.9, 0.9);
            float tube = aaBand(mod(along, 12.0), 6.0, 0.5) * step(ax, 26.0) * step(4.0, mod(ax, 13.0));
            glow += vec3(0.88, 0.97, 1.0) * tube * 2.2 * lit;
            col *= 0.85 + 0.15 * aaPulse(x / 6.0, 0.97);
          } else {
            float a2 = part == 6 ? x : along;
            float grout = clamp(aaPulse(a2 / 1.8, 0.05) + aaPulse(h / 1.8, 0.05), 0.0, 1.0);
            col = vec3(0.9, 0.93, 0.93) * (1.0 - 0.18 * grout);
            col = mix(col, vec3(0.45, 0.82, 0.72), aaBand(h, 6.0, 0.6));
            if (h < 1.4) col = vec3(0.4, 0.42, 0.45);
          }
        } else if (st == 2) {
          // ---- the hall of jars: shelves to the top, every jar lit from inside ----
          if (part == 0) {
            col = vec3(0.04, 0.06, 0.05) * (0.85 + 0.3 * aaChk(vec2(x, along) / 10.0));
            float inGap = max(step(uGaps.x, vT) * step(vT, uGaps.y), step(uGaps.z, vT) * step(vT, uGaps.w));
            float rim = max(exp(-pow((vT - uGaps.x) * 10.0, 2.0)) + exp(-pow((vT - uGaps.y) * 10.0, 2.0)), exp(-pow((vT - uGaps.z) * 10.0, 2.0)) + exp(-pow((vT - uGaps.w) * 10.0, 2.0)));
            glow += vec3(0.5, 0.9, 0.3) * exp(-pow(ax - 40.0, 2.0) / 60.0) * 0.15 * lit;
            col *= 1.0 - inGap; glow *= 1.0 - inGap;
            glow += vec3(0.75, 1.0, 0.4) * rim * 1.4;
          } else {
            float a2 = part == 6 ? x : along;
            float sh = 7.0, row = floor(h / sh), hb = h - row * sh;
            col = vec3(0.12, 0.07, 0.04);
            float plank = covP(0.5 - abs(hb - 0.25), fwidth(h) * 1.2);
            float cwid = 3.0, cell = floor(a2 / cwid), fx = fract(a2 / cwid) - 0.5;
            float ah = max(fwidth(a2) * 1.2, uMove * 2.2), hh = fwidth(h) * 1.2;
            float present = step(0.12, h1(cell + row * 5.0));
            float jh = 3.3 + 1.3 * h1(cell * 3.1 + row * 17.0), jw = 1.05 + 0.2 * h1(cell * 1.7 + row);
            vec2 q = vec2(fx * cwid, hb - 0.55 - jh * 0.5), hs = vec2(jw, jh * 0.5);
            vec2 dq = abs(q) - hs + 0.55; float sd = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0) - 0.55;
            float body = covP(-sd, max(ah, hh)) * present;
            float lid = covP(0.28 - abs(hb - (0.55 + jh + 0.22)), hh) * covP(jw * 0.82 - abs(q.x), ah) * present;
            float far = smoothstep(0.08, 0.3, max(fwidth(a2 / cwid), uMove * 1.2 / cwid));
            body = mix(body, 0.62 * present * covP(hb - 0.55, hh) * covP(0.55 + jh - hb, hh), far); lid *= 1.0 - far;
            float kk = h1(cell * 7.3 + row);
            vec3 fl = kk < 0.72 ? vec3(0.72, 0.95, 0.32) : (kk < 0.86 ? vec3(1.0, 0.72, 0.3) : (kk < 0.94 ? vec3(1.0, 0.5, 0.72) : vec3(0.55, 0.85, 1.0)));
            float core = exp(-dot(q / hs, q / hs) * 1.8) * (1.0 - far);
            float pulse = 0.78 + 0.22 * sin(uTime * 1.3 + cell * 1.7 + row * 2.3);
            col = mix(col, fl * 0.2, body); glow += fl * body * (0.22 + 0.5 * far + 1.1 * core) * 0.85 * pulse * lit;
            col = mix(col, vec3(0.16, 0.12, 0.09), lid);
            col = mix(col, vec3(0.3, 0.18, 0.1), plank);
            float post = covP(0.8 - abs(mod(a2, 28.0) - 14.0), fwidth(a2) * 1.2);
            col = mix(col, vec3(0.16, 0.09, 0.05), post);
          }
        } else if (st == 3) {
          // ---- the gallery: pale boards, white walls, gilt frames with nothing in them ----
          if (part == 0) {
            col = vec3(0.62, 0.46, 0.32) * (0.85 + 0.15 * n2(vec2(x * 0.7, along * 0.05)) - 0.12 * aaPulse(x / 1.4, 0.04));
            glow += vec3(1.0, 0.95, 0.88) * exp(-pow(mod(along, 14.0) - 7.0, 2.0) / 8.0) * exp(-x * x / 400.0) * 0.1 * lit;
          } else if (part == 3) {
            col = WHITE * 0.92;
            glow += vec3(1.0, 0.95, 0.85) * smoothstep(0.9, 0.3, length(vec2(mod(along, 9.0) - 4.5, ax - 18.0))) * 1.6 * lit;
          } else {
            float a2 = part == 6 ? x : along;
            col = WHITE * 0.92;
            float pw = 20.0, cell = floor(a2 / pw), px = mod(a2, pw) - pw * 0.5;
            vec2 hs = vec2(3.5 + 3.0 * h1(cell * 2.3), 2.8 + 2.6 * h1(cell * 5.1));
            vec2 pq = vec2(px, h - 14.0 - (h1(cell * 7.7) - 0.5) * 3.0);
            float outer = boxD(pq, -hs - 0.9, hs + 0.9), inner = boxD(pq, -hs, hs);
            float fr = covP(outer, wpx) * (1.0 - covP(inner, wpx));
            col = mix(col, GOLD * (0.85 + 0.25 * sin((pq.x + pq.y) * 3.0)), fr);
            col *= 1.0 - 0.18 * covP(inner, wpx) * smoothstep(-hs.y, hs.y, pq.y);
            glow += vec3(1.0, 0.92, 0.8) * exp(-pow(pq.x / (hs.x + 1.5), 2.0) - pow((pq.y - hs.y - 1.0) / 3.0, 2.0)) * 0.35 * lit;
          }
        } else {
          // ---- the red carpet: the carpet, black gloss either side, the step-and-repeat ----
          if (part == 0) {
            float rc = covP(11.0 - ax, fwidth(x) * 1.2);
            vec3 carpet = vec3(0.5, 0.02, 0.06) * (0.85 + 0.15 * n2(vec2(x, along) * 1.5));
            col = mix(vec3(0.02, 0.018, 0.025), carpet, rc);
            col = mix(col, GOLD, aaBand(ax, 11.3, 0.22));
            glow += vec3(1.0, 0.95, 0.98) * uFlash * exp(-pow(ax - 18.0, 2.0) / 30.0) * 0.4 * (1.0 - rc);
          } else {
            float a2 = part == 6 ? x : along;
            if (h < 16.0) {
              vec3 lg = texture2D(tLogo, vec2((part == 2 ? -a2 : a2) / 14.0, h / 7.0)).rgb;   // (the right-hand wall is seen from the other side)
              col = lg * 0.9;
              glow += lg * (0.12 + 0.5 * uFlash) * lit;
            } else col = vec3(0.04, 0.03, 0.04);
            glow += vec3(1.0, 0.95, 0.9) * smoothstep(1.0, 0.3, length(vec2(mod(a2, 10.0) - 5.0, h - 17.5))) * 1.5 * lit;
          }
        }
        if (part != 7) col *= uLight * lit;
        else col *= uLight;
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the place, per frame ----------
export class HglWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = roomMaterial();
    this.mat.uniforms.tLogo.value = tex().logo;
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, CLINIC));
    // the hole in the hall of jars' floor under the second chorus's jump
    const arc = (S.plan.rooms || []).find((r) => r.style === 'archive');
    const g = arc ? S.course.gaps.filter((gp) => gp.from >= arc.from - 0.5 && gp.from < arc.to) : [];
    this.mat.uniforms.uGaps.value.set(g[0] ? g[0].from - 0.05 : -1e5, g[0] ? g[0].to + 0.05 : -1e5, g[1] ? g[1].from - 0.05 : -1e5, g[1] ? g[1].to + 0.05 : -1e5);
    this._g = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1, 1, 1);
    this.shots = ((S.plan.zones || []).find((z) => z.kits.includes('hglPress')) || {}).shots || [];
    void S.town.layers.hglLampHead;
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, T = S.rider.t, c = S.course;
    u.uTime.value = time; u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.6) / 1.9);
    u.uLit.value = clinicLit(T);
    u.uBeat.value = Math.exp(-(((c.beatAt(T) % 1) + 1) % 1) * 4);
    let fl = 0; for (const t0 of this.shots) if (T > t0 && T < t0 + 0.4) fl = Math.max(fl, 1 - (T - t0) / 0.4);
    u.uFlash.value = fl;
    // (how far she goes in a frame: patterns rushing past are blurred by that much, or they strobe)
    u.uMove.value = clamp((S.rider.v || 0) / 60, 0, 2);
    for (const r of this.rooms) r.update(S.track, S.rider, T);
    const M = S.town.mats;
    if (M.hglEegM) { M.hglEegM.uniforms.uTime.value = time; M.hglEegM.uniforms.uFlat.value = smooth(61.7, 61.95, T); }
  }
  // the lobby's chandeliers, the procedure rooms' lamps
  draw(T) {
    const S = this.S, g = this._g, c = S.course, track = S.track, lit = clinicLit(S.rider.t);
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(c, f.t);
        track.ground(f.t, 0, g);
        if (r.style === 1) {
          // the surgical lamp: its head hung over the road, its light straight down
          const yaw = c.sample(f.t, this._sm || (this._sm = {})).yaw;
          this._q.set(0, Math.sin(yaw * 0.5), 0, Math.cos(yaw * 0.5));
          for (const x of [-15, 15]) {
            const w = track.ground(f.t, x, S._o || (S._o = new THREE.Vector3())); w.y = fy + r.H - 7;
            this._m.compose(w, this._q, this._s); T.layers.hglLampHead.add(this._m);
            T.glow(w.x, w.y - 0.8, w.z, 5, COOL, 1.2 * lit); T.glow(w.x, w.y - 1, w.z, 16, COOL, 0.15 * lit);
            T.pool(w.x, fy + 0.15, w.z, 20, COOL, 0.22 * lit);
          }
        } else {
          // a chandelier: a cluster of little lights, their pool on the runner
          for (let j = 0; j < 7; j++) { const a = j / 7 * Math.PI * 2 + T.tNow * 0.2; T.glow(g.x + Math.cos(a) * 2.6, fy + r.H - 5.5 - (j % 2) * 1.2, g.z + Math.sin(a) * 2.6, 1.3, WHITEL, 1.0 * lit); }
          T.glow(g.x, fy + r.H - 6, g.z, 14, BLUSHL, 0.2 * lit);
          T.pool(g.x, fy + 0.15, g.z, 30, BLUSHL, 0.35 * lit);
        }
      }
    }
  }
}

// ---------- the end: the chair under the ring light, the phone still live ----------
export class HglFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.t = cfg.t; this.x = cfg.x ?? -26;
    this.group = new THREE.Group(); scene.add(this.group);
    const gloss = selfLit({ roughness: 0.22, metalness: 0.1 }, 0.3), dark = selfLit({ roughness: 0.4, metalness: 0.2 }, 0.1), chrome = selfLit({ roughness: 0.22, metalness: 0.75 }, 0.2);
    const add = (geo, mat, x = 0, y = 0, z = 0, ry = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.y = ry; this.group.add(o); return o; };
    add(HG.tchair(), gloss, 0, 0, 0);
    // the ring light behind it, a halo round where her head would be
    this.ring = add(HG.ringLight(), selfLit({ roughness: 0.3 }, 1.4), 0, 0, -10.5, 0);
    add(HG.tray(), chrome, 7.4, 0, 3.4, -0.5);
    // the phone on its tripod, filming the chair: LIVE
    add(HG.tripodPhone(), dark, -8, 0, 14, -0.52);
    const fg = HG.tripodFace(); const uv = fg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + 0.5 * uv.getX(i), 0.5 * uv.getY(i));
    this.screen = new THREE.MeshBasicMaterial({ map: tex().phone, color: new THREE.Color(1.4, 1.4, 1.4) });
    add(fg, this.screen, -8, 0, 14, -0.52);
    // the floor under it all: a round white platform
    add(merge([HG.pedestal().scale(5.2, 0.05, 5.2)]), gloss, 0, -0.1, 4);
    this.group.scale.setScalar(cfg.s ?? 1);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3();
    prepare(course, null);
  }
  fire(earned) { this.fired = true; this.earned = earned; }
  update(track, rider, songT, dt) {
    track.ground(this.t, this.x, this._p); this._p.y = floorAt(this.course, this.t);
    this.group.position.copy(this._p);
    this.group.rotation.set(0, this.course.sample(this.t, this._sm || (this._sm = {})).yaw + (this.cfg.rot ?? -Math.PI / 2), 0);
    const S = this.S; if (!S || this.t - rider.t > 46) return;
    this.group.updateMatrixWorld(true);
    const s = this.cfg.s ?? 1, w = this._w, T = rider.t;
    this.fireK = this.fired ? Math.min(1, (this.fireK || 0) + dt * 0.8) : 0;
    // the ring light, full on
    for (let j = 0; j < 28; j++) { const a = j / 28 * Math.PI * 2; w.set(Math.cos(a) * 5.4, 15 + Math.sin(a) * 5.4, -10.2).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 2.0 * s, WHITEL, 1.4); }
    w.set(0, 15, -10).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 34 * s, BLUSHL, 0.3 + 0.25 * this.fireK);
    w.set(0, 0, 4).applyMatrix4(this.group.matrixWorld); S.pool(w.x, this._p.y + 0.12, w.z, 40 * s, BLUSHL, 0.7 + 0.3 * this.fireK);
    // the phone's light, and hearts going up off it the whole time
    w.set(-8, 10.6, 14.3).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 7 * s, PINKL, 0.5);
    for (let j = 0; j < 6; j++) { const f = (songT * 0.35 + j / 6) % 1; w.set(-8 + Math.sin(j * 2 + songT) * 1.5, 13 + f * 16, 14.3).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, (1.4 + f) * s, j % 2 ? HOTL : PINKL, 1.2 * (1 - f) * (0.4 + 0.6 * this.fireK)); }
    // the chair's own little light, the pick on the tray catching it
    w.set(7.4, 7.4, 3.4).applyMatrix4(this.group.matrixWorld); S.glow(w.x, w.y, w.z, 3 * s, WHITEL, 0.6 + 0.4 * Math.sin(T * 2));
  }
}
