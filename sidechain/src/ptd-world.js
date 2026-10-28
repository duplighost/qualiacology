// PTSDream Girl: the place. His night three years after her, and she's in every room of it; she is
// the alarm. Her stage is the dark between his rooms: a black floor that follows the road, roadworks
// barricades down both sides with a red beacon on each sweeping its beams across the road on the
// beat, DREAM GIRL in neon further out, and alert boards over the road saying what she says. His
// rooms are the shared Room with this song's own table (his hall with the pale squares where her
// pictures hung, the bathroom, the kitchen, the 24-hour store with its shelves in the walls and aisle
// four closing in, his bedroom with every light on, the therapist's office, the new girl's morning
// with her lace coming up the walls). Between them, his street in October and the inside of his
// head at 3 a.m. are this floor's other two kinds. Every chorus is through an EMERGENCY EXIT.
// The things are in ptd-props.js, the course and looks in ptd-song.js.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local, signV, col } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room } from './summer.js';
import { AA_GLSL } from './aa.js';
import { PROP, FURN, merge, labelTexture, calendarTexture, journalTexture, compassTexture, canvasTex } from './ptd-props.js';
import { paint, rgb } from './summer.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);   // a thing beside the road, its front to the road
const REDL = [1, 0.08, 0.12], PINKL = [1, 0.3, 0.55], WHITEL = [1, 0.96, 0.92], WARM = [1, 0.8, 0.52], COLD = [0.72, 0.86, 1], GREENL = [0.55, 1, 0.75],
  AMBER = [1, 0.62, 0.18], BLUEL = [0.35, 0.55, 1], GOLDL = [1, 0.76, 0.32], CORALL = [1, 0.55, 0.5], CYANL = [0.4, 0.9, 1], LACE = [1, 0.1, 0.2];
// the breakdowns: the neon shorts out on each "breakdown"
const BREAKS = [74.78, 75.48, 78.14, 147.60, 150.16, 151.00, 221.82, 223.74];
const broken = (T) => { for (const b of BREAKS) if (T > b - 0.02 && T < b + 0.26) return 1 - 0.85 * (Math.sin((T - b) * 90) > -0.2 ? 1 : 0); return 1; };

// ---------- how lit his places are ----------
// the store: on; flickering on aisle four; out on "do you miss me?" but for the exit sign
export function storeLit(T) {
  if (T > 54.66) return 0.05;
  if (T > 46.6 && T < 49.3) return (Math.sin(T * 37) > -0.55 || Math.sin(T * 11.3) > 0.7) ? 0.95 : 0.15;
  return 1;
}
function roomLit(style, T) {
  switch (style) {
    case 3: return storeLit(T);
    case 4: return 1.12;
    case 5: return T > 127.3 ? Math.max(0.12, 1 - (T - 127.3) / 1.2) : 0.85;
    case 6: return T > 201.4 ? 0.2 : 1.05;
    case 0: return 0.6;
    case 1: return 0.85;
    case 2: return 0.7;
    default: return 1;
  }
}

// ---------- materials ----------
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VC = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const pic = (M, key, map, k = 0.6, opts = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.6, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, ...opts }));
const glass = (M) => M.ptdGlassM || (M.ptdGlassM = new THREE.MeshStandardMaterial({ color: 0xd8f0ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, emissive: 0x20283a }));
let TEX = null;
const tex = () => TEX || (TEX = { label: labelTexture(), cal: calendarTexture(), journal: journalTexture(), compass: compassTexture() });
// a face for a sign on the shared sheet (uv inset to its cell, like the other signs)
function signFace(w, h) { const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02 + 0.96 * uv.getX(i), 0.045 + 0.91 * uv.getY(i)); return g; }
// the calendar's face: one of the two pages of its picture
function calFace(page) { const g = new THREE.PlaneGeometry(14, 14); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, (page ? 0 : 0.5) + 0.5 * uv.getY(i)); g.translate(0, 13.6, 0.2); return g; }

// a beam of light (the lift's searchlights' way of drawing one: it reads from the side and fades as
// it turns toward you), per instance its strength and colour
const BEAM_VS = `attribute float aK; attribute vec3 aCol; varying float vL; varying float vK; varying vec3 vN; varying vec3 vV; varying vec3 vC; varying vec3 vA;
void main(){ vL = uv.y; vK = aK; vC = aCol; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vA = normalize(normalMatrix * mat3(instanceMatrix) * vec3(0.0, 0.0, 1.0)); gl_Position = projectionMatrix * mv; }`;
const BEAM_FS = `varying float vL; varying float vK; varying vec3 vN; varying vec3 vV; varying vec3 vC; varying vec3 vA;
void main(){ vec3 V = normalize(vV); float f = abs(dot(normalize(vN), V)); float end = 1.0 - smoothstep(0.55, 0.92, abs(dot(normalize(vA), V)));
  float a = pow(f, 2.5) * pow(max(1.0 - vL, 0.0), 1.4) * smoothstep(0.0, 0.08, vL) * vK * end;
  a = (a == a) ? clamp(a, 0.0, 3.0) : 0.0; if (vK <= 0.0) discard; gl_FragColor = vec4(vC * a, 1.0); }`;
function beamMaterial() { return new THREE.ShaderMaterial({ vertexShader: BEAM_VS, fragmentShader: BEAM_FS, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide }); }

// the alert boards: the sign sheet drawn as LEDs, a dot per lamp; far off (finer than a pixel) the
// dots settle to how much of the board they light
function ledMaterial(M) {
  const t = M.sign.uniforms.tAtlas.value, img = t.image;
  const C = Math.max(1, Math.round(img.width / 512)).toFixed(1), R = Math.max(1, Math.round(img.height / 160)).toFixed(1);
  return new THREE.ShaderMaterial({
    uniforms: { tAtlas: { value: t }, uBeat: { value: 0 }, uFogColor: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */`
      attribute float aIdx; attribute vec2 aWake; varying vec2 vCell; flat varying vec2 vBase; varying float vWake; varying vec3 vW;
      void main(){ vBase = vec2(mod(aIdx, ${C}), floor(aIdx / ${C})); vCell = uv; vWake = aWake.x;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tAtlas; uniform float uBeat, uFogDensity; uniform vec3 uFogColor, uCam;
      varying vec2 vCell; flat varying vec2 vBase; varying float vWake; varying vec3 vW;
      vec2 at(vec2 c){ return vec2((vBase.x + c.x) / ${C}, 1.0 - (vBase.y + 1.0 - c.y) / ${R}); }
      void main(){
        vec2 N = vec2(176.0, 56.0), g = vCell * N, fw = fwidth(g);
        float fpx = max(fw.x, fw.y), far = smoothstep(0.18, 0.45, fpx);   // (dots under about three pixels across fade to their average)
        vec3 lit = texture2D(tAtlas, at(mix((floor(g) + 0.5) / N, vCell, far))).rgb;
        float d = length(fract(g) - 0.5);
        float dotm = mix(1.0 - smoothstep(0.28 - fpx * 0.4, 0.42 + fpx * 0.4, d), 0.58, far);
        vec3 col = lit * dotm * (0.45 + 0.55 * vWake) * (0.92 + 0.25 * uBeat) * 2.4 + vec3(0.018, 0.004, 0.006) * dotm;
        float dd = length(uCam - vW);
        float fog = 1.0 - exp(-pow(dd * uFogDensity * 0.7, 1.5));
        gl_FragColor = vec4(mix(col, uFogColor, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the pieces, registered ----------
const PROP_LAYERS = {
  bottle: ['ptdBottle', 'ptdBottleGold', 'ptdLabel', 'ptdPin', 'ptdShard', 'ptdPlinth'], gantry: ['ptdGantry'], doorLeaf: ['ptdDoor'], boxes: ['ptdBoxes'], frameDown: ['ptdFrameDown'],
  coat: ['ptdCoat'], hole: ['ptdHole'], shower: ['ptdShower', 'ptdShowerHead', 'ptdShowerGlass'], sink: ['ptdSink'], mirror: ['ptdMirror', 'ptdMirrorFace'], counter: ['ptdCounter'],
  perfume: ['ptdPerfume'], aisleSign: ['ptdAisleSign', 'ptdAisleFace'], checkout: ['ptdCheckout'], basket: ['ptdBasket', 'ptdOrange'], exit: ['ptdExitDoors', 'ptdExitFace'],
  cushion: ['ptdCushion', 'ptdBeam'], calendar: ['ptdCalSlab', 'ptdCalOct', 'ptdCalMar'], phone: ['ptdPhone', 'ptdPhoneFace'], armchair: ['ptdArmchair'], sideTable: ['ptdSideTable'],
  notepad: ['ptdPadBoard', 'ptdPadFace'], clock: ['ptdClock', 'ptdHand'], journal: ['ptdJournal', 'ptdPages', 'ptdPen'], alarmClock: ['ptdAlarmClock'], wine: ['ptdWine', 'ptdPenny'],
  gift: ['ptdGift', 'ptdBeam'], seahorse: ['ptdSeahorse', 'ptdHeartRim', 'ptdHeartFace'], compass: ['ptdCompass', 'ptdCompassFace', 'ptdNeedle'], plant: ['ptdPlant'], candle: ['ptdCandle'],
  mug: ['ptdMug'], flowers: ['ptdFlowers'], table2: ['ptdTable2', 'ptdPendant'],
};
const FACING = new Set(['bottle', 'seahorse', 'cushion', 'phone', 'armchair', 'sideTable', 'notepad', 'journal', 'alarmClock', 'wine', 'gift', 'compass', 'calendar', 'boxes', 'frameDown', 'coat', 'perfume', 'plant', 'candle', 'mug', 'flowers', 'table2', 'sink', 'shower', 'counter', 'basket']);
const BEAM_V = { aK: 0, aCol: null };
const beamV = (k, c) => { BEAM_V.aK = k; BEAM_V.aCol = c; return BEAM_V; };

extend({
  layers: {
    // her stage
    ptdBarricade: (M) => [PROP.barricade(), VC(M, 'ptdPaintM', 0.22, { roughness: 0.5 }), 260, {}],
    ptdDome: (M) => [PROP.dome(), VC(M, 'ptdDomeM', 2.2, { roughness: 0.2 }), 260, {}],
    ptdBeam: (M) => { const g = PROP.beamCone(40, 4.6); g.rotateX(Math.PI / 2); return [g, M.ptdBeamM || (M.ptdBeamM = beamMaterial()), 120, { aK: 1, aCol: 3 }]; },
    ptdNeonFrame: (M) => [PROP.neonFrame(), VC(M, 'ptdSteelM', 0.12, { roughness: 0.45, metalness: 0.3 }), 40, {}],
    ptdNeonFace: (M) => [signFace(24.6, 7.7).translate(0, 27, -0.15), M.sign, 40, { aIdx: 1, aWake: 2 }],
    ptdWarn: (M) => [PROP.warnSign(), VC(M, 'ptdPaintM', 0.22, { roughness: 0.5 }), 12, {}],
    ptdWarnFace: (M) => [signFace(6.4, 4.4).translate(0, 15, 0.45), M.sign, 12, { aIdx: 1, aWake: 2 }],
    ptdBoardBox: (M) => [PROP.boardBox(), VC(M, 'ptdSteelM', 0.12, { roughness: 0.45, metalness: 0.3 }), 12, {}],
    ptdBoardFace: (M) => [signFace(26, 8.4).translate(0, 0, 0.3), M.ptdLedM || (M.ptdLedM = ledMaterial(M)), 12, { aIdx: 1, aWake: 2 }],
    ptdLeg: (M) => [new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), VC(M, 'ptdLegM', 0.1, { roughness: 0.5, metalness: 0.4 }), 60, {}],
    // her perfume, the count
    ptdBottle: (M) => [PROP.bottle(), VC(M, 'ptdGlassRedM', 0.55, { roughness: 0.12, metalness: 0.25 }), 2, {}],
    ptdBottleGold: (M) => [PROP.bottleGold(), VC(M, 'ptdGoldM', 0.35, { roughness: 0.25, metalness: 0.8 }), 2, {}],
    ptdLabel: (M) => [PROP.bottleLabel(), pic(M, 'ptdLabelM', tex().label, 0.7), 2, {}],
    ptdPin: (M) => [PROP.pin(), VC(M, 'ptdGoldM', 0.35, { roughness: 0.25, metalness: 0.8 }), 2, {}],
    ptdShard: (M) => [PROP.shard(), VC(M, 'ptdGlassRedM', 0.55, { roughness: 0.12, metalness: 0.25 }), 60, {}],
    ptdPlinth: (M) => [PROP.plinth(), VC(M, 'ptdPaintM', 0.22, { roughness: 0.5 }), 2, {}],
    ptdGantry: (M) => [PROP.gantry(), VC(M, 'ptdPaintM', 0.22, { roughness: 0.5 }), 2, {}],
    // his place
    ptdDoor: (M) => [PROP.doorLeaf(), VC(M, 'ptdWoodM', 0.15, { roughness: 0.7 }), 2, {}],
    ptdBoxes: (M) => [PROP.boxes(), VC(M, 'ptdWoodM', 0.15, { roughness: 0.7 }), 2, {}],
    ptdFrameDown: (M) => [PROP.frameDown(), VC(M, 'ptdWoodM', 0.15, { roughness: 0.7 }), 2, {}],
    ptdCoat: (M) => [PROP.coat(), VC(M, 'ptdClothM', 0.3, { roughness: 0.85 }), 2, {}],
    ptdHole: (M) => [PROP.hole(), VC(M, 'ptdFlatM', 0.05, { roughness: 1, side: THREE.DoubleSide }), 2, {}],
    ptdShower: (M) => [PROP.shower(), VC(M, 'ptdChromeM', 0.25, { roughness: 0.18, metalness: 0.7 }), 2, {}],
    ptdShowerHead: (M) => [PROP.showerHead(), VC(M, 'ptdChromeM', 0.25, { roughness: 0.18, metalness: 0.7 }), 2, {}],
    ptdShowerGlass: (M) => [PROP.showerGlass(), M.ptdShowerGlassM || (M.ptdShowerGlassM = new THREE.MeshStandardMaterial({ color: 0xc8e8ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide, emissive: 0x2a4a6a })), 2, {}],
    ptdSink: (M) => [PROP.sink(), VC(M, 'ptdChinaM', 0.3, { roughness: 0.25 }), 2, {}],
    ptdMirror: (M) => [PROP.mirrorFrame(), VC(M, 'ptdChromeM', 0.25, { roughness: 0.18, metalness: 0.7 }), 3, {}],
    ptdMirrorFace: (M) => [signFace(20.2, 13.2).translate(0, 0, 0.12), M.sign, 3, { aIdx: 1, aWake: 2 }],
    ptdCounter: (M) => [PROP.counter(), VC(M, 'ptdPaintM', 0.22, { roughness: 0.5 }), 2, {}],
    // the store
    ptdPerfume: (M) => [PROP.perfumeStand(), VC(M, 'ptdGlassRedM', 0.55, { roughness: 0.12, metalness: 0.25 }), 2, {}],
    ptdAisleSign: (M) => [PROP.aisleSign(), VC(M, 'ptdPaintM', 0.22, { roughness: 0.5 }), 2, {}],
    ptdAisleFace: (M) => [merge([signFace(16.4, 6.0).translate(0, -3.2, 0.55), signFace(16.4, 6.0).rotateY(Math.PI).translate(0, -3.2, -0.55)]), M.sign, 2, { aIdx: 1, aWake: 2 }],
    ptdCheckout: (M) => [PROP.checkout(), VC(M, 'ptdPaintM', 0.22, { roughness: 0.5 }), 6, {}],
    ptdBasket: (M) => [PROP.basket(), VC(M, 'ptdPaintM', 0.22, { roughness: 0.5 }), 2, {}],
    ptdOrange: (M) => [PROP.orange(), VC(M, 'ptdClothM', 0.3, { roughness: 0.85 }), 12, {}],
    ptdExitDoors: (M) => [PROP.exitDoor(), VC(M, 'ptdPaintM', 0.22, { roughness: 0.5 }), 6, {}],
    ptdExitFace: (M) => [signFace(19, 5.6), M.sign, 3, { aIdx: 1, aWake: 2 }],
    ptdCushion: (M) => [PROP.cushion(), VC(M, 'ptdClothM', 0.3, { roughness: 0.85 }), 3, {}],
    // October, his bedroom
    ptdCalSlab: (M) => [PROP.calendarSlab(), VC(M, 'ptdPaintM', 0.22, { roughness: 0.5 }), 2, {}],
    ptdCalOct: (M) => [calFace(0), pic(M, 'ptdCalM', tex().cal, 0.75), 2, {}],
    ptdCalMar: (M) => [calFace(1), pic(M, 'ptdCalM', tex().cal, 0.75), 2, {}],
    ptdLampN: (M) => [PROP.nightLamp(), VC(M, 'ptdWoodM', 0.15, { roughness: 0.7 }), 70, {}],
    ptdShadeN: (M) => [PROP.lampShade(), VC(M, 'ptdShadeM', 1.6, { roughness: 0.9, side: THREE.DoubleSide }), 70, {}],
    ptdLampF: (M) => [PROP.floorLamp(), VC(M, 'ptdSteelM', 0.12, { roughness: 0.45, metalness: 0.3 }), 70, {}],
    ptdShadeF: (M) => [PROP.floorShade(), VC(M, 'ptdShadeM', 1.6, { roughness: 0.9, side: THREE.DoubleSide }), 70, {}],
    ptdPhone: (M) => [PROP.phone(), VC(M, 'ptdWoodM', 0.15, { roughness: 0.7 }), 2, {}],
    ptdPhoneFace: (M) => [signFace(6.0, 11.6).translate(0, 13.2, 0.6), M.sign, 2, { aIdx: 1, aWake: 2 }],
    ptdPin2: (M) => [PROP.pin2(), VC(M, 'ptdPinM', 0.6, { roughness: 0.2, metalness: 0.3 }), 160, {}],
    // the office
    ptdArmchair: (M) => [PROP.armchair(), VC(M, 'ptdClothM', 0.3, { roughness: 0.85 }), 2, {}],
    ptdSideTable: (M) => [PROP.sideTable(), VC(M, 'ptdWoodM', 0.15, { roughness: 0.7 }), 2, {}],
    ptdPadBoard: (M) => [PROP.padBoard(), VC(M, 'ptdWoodM', 0.15, { roughness: 0.7 }), 2, {}],
    ptdPadFace: (M) => [signFace(6.6, 8.8).translate(0, 4.8, 0.45), M.sign, 2, { aIdx: 1, aWake: 2 }],
    ptdClock: (M) => [PROP.clock(), VC(M, 'ptdChinaM', 0.3, { roughness: 0.25 }), 2, {}],
    ptdHand: (M) => [PROP.hand(), VC(M, 'ptdFlatM', 0.05, { roughness: 1, side: THREE.DoubleSide }), 6, {}],
    ptdJournal: (M) => [PROP.journal(), VC(M, 'ptdClothM', 0.3, { roughness: 0.85 }), 3, {}],
    ptdPages: (M) => [PROP.journalPages(), pic(M, 'ptdJournalM', tex().journal, 0.6), 3, {}],
    ptdPen: (M) => [PROP.pen(), VC(M, 'ptdChromeM', 0.25, { roughness: 0.18, metalness: 0.7 }), 3, {}],
    // inside his head
    ptdAlarmClock: (M) => [PROP.alarmClock(), VC(M, 'ptdChromeM', 0.25, { roughness: 0.18, metalness: 0.7 }), 2, {}],
    ptdWine: (M) => [PROP.wineGlass(), VC(M, 'ptdWineGlassM', 0.5, { roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.72 }), 2, {}],
    ptdPenny: (M) => [PROP.penny(), VC(M, 'ptdGoldM', 0.35, { roughness: 0.25, metalness: 0.8 }), 20, {}],
    ptdFlood: (M) => [PROP.flood(), VC(M, 'ptdSteelM', 0.12, { roughness: 0.45, metalness: 0.3 }), 40, {}],
    ptdFloodLens: (M) => [PROP.floodLens(), VC(M, 'ptdLensM', 2.4, { roughness: 0.3 }), 40, {}],
    ptdCamPole: (M) => [PROP.camPole(), VC(M, 'ptdSteelM', 0.12, { roughness: 0.45, metalness: 0.3 }), 40, {}],
    ptdCamHead: (M) => [PROP.camHead(), VC(M, 'ptdChinaM', 0.3, { roughness: 0.25 }), 40, {}],
    ptdGift: (M) => [PROP.gift(), VC(M, 'ptdClothM', 0.3, { roughness: 0.85 }), 2, {}],
    ptdSeahorse: (M) => [PROP.seahorse(), VC(M, 'ptdCoralM', 0.55, { roughness: 0.45 }), 2, {}],
    ptdHeartRim: (M) => [PROP.heartRim(), VC(M, 'ptdCoralM', 0.55, { roughness: 0.45 }), 2, {}],
    ptdHeartFace: (M) => [signFace(4.2, 2.6), M.sign, 2, { aIdx: 1, aWake: 2 }],
    ptdCompass: (M) => [PROP.compassCase(), VC(M, 'ptdGoldM', 0.35, { roughness: 0.25, metalness: 0.8 }), 2, {}],
    ptdCompassFace: (M) => [PROP.compassFace(), pic(M, 'ptdCompassM', tex().compass, 0.55), 2, {}],
    ptdNeedle: (M) => [PROP.needle(), VC(M, 'ptdNeedleM', 0.7, { roughness: 0.3, side: THREE.DoubleSide }), 2, {}],
    // the new girl's things
    ptdPlant: (M) => [PROP.plant(), VC(M, 'ptdClothM', 0.3, { roughness: 0.85 }), 2, {}],
    ptdCandle: (M) => [PROP.candle(), VC(M, 'ptdClothM', 0.3, { roughness: 0.85 }), 2, {}],
    ptdMug: (M) => [PROP.mug(), VC(M, 'ptdChinaM', 0.3, { roughness: 0.25 }), 2, {}],
    ptdFlowers: (M) => [PROP.flowers(), VC(M, 'ptdClothM', 0.3, { roughness: 0.85 }), 2, {}],
    // the last chorus
    ptdTable2: (M) => [PROP.table2(), VC(M, 'ptdClothM', 0.3, { roughness: 0.85 }), 2, {}],
    ptdPendant: (M) => [PROP.pendant(), VC(M, 'ptdSteelM', 0.12, { roughness: 0.45, metalness: 0.3 }), 2, {}],
    // his rooms' furniture, one layer a kind
    ...Object.fromEntries(Object.keys(FURN).map((k) => ['ptdF_' + k, (M) => [FURN[k](), VC(M, 'ptdFurnM', 0.12, { roughness: 0.7 }), 32, {}]])),
    // October's leaves (the world puts them in the air)
    ptdLeaf: (M) => { const s = new THREE.Shape(); s.moveTo(0, -0.9); s.quadraticCurveTo(1.0, -0.2, 0.15, 0.95); s.quadraticCurveTo(-0.9, 0.1, 0, -0.9); return [paint(new THREE.ShapeGeometry(s), [0.95, 0.42, 0.06]), VC(M, 'ptdLeafM', 0.35, { roughness: 0.8, side: THREE.DoubleSide }), 90, {}]; },
  },
  parts: {
    // a roadworks barricade facing the road, a beacon on its corner, its two beams turning on the beat
    ptdBarricade(S, it, p, q, yaw) {
      const L = S.layers; void L.ptdBarricade; void L.ptdDome; void L.ptdBeam;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, c = S.course, by = yaw + SIDE(it.x);
      S._e.set(0, by, 0); const bq = (S._ptq || (S._ptq = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, bq, S._s.set(1, 1, 1)); L.ptdBarricade.add(m);
      // (they come on down the road one after the other, from "cold red lullaby")
      const on = it.on === undefined ? 1 : clamp((T - (it.on + Math.max(0, it.t - it.on) * 0.12)) / 0.12, 0, 1);
      const w = local(p, by, 5.2, 10.5, 0, S._o);
      m.compose(w, S._q.set(0, 0, 0, 1), S._s.set(1.1, 1.1, 1.1)); if (on > 0.05) L.ptdDome.add(m);
      const bp = c.beatAt(T), pulse = Math.exp(-(((bp % 1) + 1) % 1) * 5);
      glowAt(S, w.x, w.y + 0.5, w.z, 4.2, REDL, (0.5 + 1.1 * pulse) * on);
      if (it.t > T - 1 && it.t < T + 4) poolAt(S, w.x, (it.h ?? 0) + 0.3, w.z, 14, REDL, 0.2 * on);
      // "insurrection": a flare burning on its top board, its smoke going up
      if (it.flares && it.t > it.flares[0] && it.t < it.flares[1] && it.t < T + 20) {
        for (const fx of [-3.4, 0.6]) {
          const f = local(p, by, fx, 10.2, 0.2, S._p2 || (S._p2 = new THREE.Vector3())), fl = 0.75 + 0.5 * hash(Math.floor(T * 24) + it.seed * 100 + fx);
          glowAt(S, f.x, f.y, f.z, 3.4 * fl, REDL, 2.0 * fl); glowAt(S, f.x, f.y + 0.3, f.z, 1.3, WHITEL, 1.1 * fl);
          for (let j = 0; j < 2; j++) { const u = ((T * 0.3 + j * 0.5 + it.seed + fx) % 1); glowAt(S, f.x, f.y + 1.5 + u * 18, f.z, 5 + u * 11, [0.5, 0.1, 0.13], 0.13 * (1 - u)); }
        }
      }
      // the beams: two, opposite, turning a half turn a beat, the two sides mirrored so they cross the road together
      if (on > 0.05 && it.t > T - 1.5 && it.t < T + 7) {
        const a = Math.PI * bp * (it.x > 0 ? 1 : -1) + it.seed * 0.6;
        const k = (0.28 + 0.4 * pulse) * on * smooth(7, 4.5, it.t - T);
        for (const ad of [0, Math.PI]) {
          S._e.set(0.06, yaw + a + ad, 0, 'YXZ'); const q2 = (S._ptq2 || (S._ptq2 = new THREE.Quaternion())).setFromEuler(S._e); S._e.order = 'XYZ';
          m.compose(S._p2 || (S._p2 = new THREE.Vector3()).set(w.x, w.y + 0.5, w.z), q2, S._s.set(1, 1, 1)); L.ptdBeam.add(m, beamV(k, REDL));
        }
      }
    },
    // DREAM GIRL in neon on its frame; it shorts out on every "breakdown"
    ptdNeon(S, it, p, q, yaw) {
      const L = S.layers; void L.ptdNeonFrame; void L.ptdNeonFace;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m;
      const fy = yaw + Math.PI + (it.x > 0 ? -0.45 : 0.45);
      S._e.set(0, fy, 0); const fq = (S._ptn || (S._ptn = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, fq, S._s.set(it.s ?? 1, it.s ?? 1, it.s ?? 1)); L.ptdNeonFrame.add(m);
      const k = broken(T) * (0.85 + 0.15 * Math.sin(T * 9 + it.seed * 20));
      L.ptdNeonFace.add(m, signV(it.idx, k));
      const w = local(p, fy, 0, 27 * (it.s ?? 1), -2, S._o); glowAt(S, w.x, w.y, w.z, 34 * (it.s ?? 1), PINKL, 0.12 * k);
      if (k < 0.5) for (let j = 0; j < 3; j++) { const u = local(p, fy, (hash(T * 31 + j) - 0.5) * 22, 23 + hash(T * 17 + j) * 8, 0.5, S._o); glowAt(S, u.x, u.y, u.z, 2.2, WHITEL, 2.0); }
    },
    // "trigger warning": a road sign, an amber lamp blinking on its top
    ptdWarn(S, it, p, q, yaw) {
      const L = S.layers; void L.ptdWarn; void L.ptdWarnFace;
      if (!S.track) return;
      const m = S._m, fy = yaw + Math.PI + (it.x > 0 ? -0.5 : 0.5);
      S._e.set(0, fy, 0); const fq = (S._ptw || (S._ptw = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, fq, S._s.set(1.3, 1.3, 1.3)); L.ptdWarn.add(m); L.ptdWarnFace.add(m, signV(it.idx, 0.85));
      const w = local(p, fy, 0, 23.4, 0, S._o); glowAt(S, w.x, w.y, w.z, 3.2, AMBER, 1.3, 1);
      poolAt(S, p.x, (it.h ?? 0) + 0.3, p.z, 14, AMBER, 0.18);
    },
    // an alert board over the road: on a gantry out in the open, hung from the ceiling in a room
    ptdBoard(S, it, p) {
      const L = S.layers; void L.ptdBoardBox; void L.ptdBoardFace; void L.ptdLeg;
      if (!S.track) return;
      const T = S.tNow ?? 0, c = S.course, sm = c.sample(it.t, S._ptdSb || (S._ptdSb = {})), yaw = sm.yaw + Math.PI;
      S._e.set(0, yaw, Math.sin(T * 1.1 + it.t) * 0.012); const fq = (S._ptb || (S._ptb = new THREE.Quaternion())).setFromEuler(S._e);
      p.y = sm.y + (it.h || 14);
      const m = S._m, s = it.s ?? 1.1;
      m.compose(p, fq, S._s.set(s, s, s)); L.ptdBoardBox.add(m); L.ptdBoardFace.add(m, signV(it.idx, 1));
      prepare(c, S.plan);
      const fl = floorAt(c, it.t), room = roomAt(S.plan, it.t), top = p.y + 5 * s;
      const legs = S._ptl || (S._ptl = new THREE.Vector3());
      S._e.set(0, yaw, 0); const lq = (S._ptlq || (S._ptlq = new THREE.Quaternion())).setFromEuler(S._e);
      for (const sx of [-1, 1]) {
        if (room) { local(p, yaw, sx * 11 * s, 4.9 * s, -0.9 * s, legs); const y1 = fl + room[1]; if (y1 > legs.y) { m.compose(legs, lq, S._s.set(0.35, y1 - legs.y, 0.35)); L.ptdLeg.add(m); } }
        else { local(p, yaw, sx * 16 * s, 0, -0.9 * s, legs); legs.y = fl; m.compose(legs, lq, S._s.set(1.0, top - fl, 1.0)); L.ptdLeg.add(m); }
      }
      if (!room) { local(p, yaw, 0, 4.9 * s, -0.9 * s, legs); m.compose(legs, lq, S._s.set(32 * s, 1.0, 1.2)); L.ptdLeg.add(m); }
      const w = S._o; local(p, yaw, 0, 0, 1.5, w); glowAt(S, w.x, w.y, w.z, 30 * s, REDL, 0.07);
    },
    // a piece of his furniture against a wall
    ptdFurn(S, it, p, q) {
      const L = S.layers; void L['ptdF_' + it.kind];
      if (!S.track) return;
      const sc = it.s ?? 1; S._m.compose(p, q, S._s.set(sc, sc, sc)); L['ptdF_' + it.kind].add(S._m);
      if (it.spot) { const T = S.tNow ?? 0, bp = S.course.beatAt(T), k = 0.75 + 0.5 * Math.exp(-(((bp % 1) + 1) % 1) * 4); glowAt(S, p.x, p.y + 34, p.z, 10, REDL, 0.9 * k); poolAt(S, p.x, p.y + 0.35, p.z, 24, REDL, 0.55 * k); glowAt(S, p.x, p.y + 12, p.z, 30, REDL, 0.08 * k); }
      if (it.kind === 'desk') { const w = local(p, S.course.yawAt(it.t) + (it.rot || 0), -5, 15.6, -1.6, S._o); glowAt(S, w.x, w.y, w.z, 6, WARM, 0.8); poolAt(S, w.x, p.y + 9.7, w.z, 8, WARM, 0.5); }
    },
    // a lamp by his bed: a nightstand's or a floor lamp, every one of them on
    ptdLamp(S, it, p, q, yaw) {
      const L = S.layers; void L.ptdLampN; void L.ptdShadeN; void L.ptdLampF; void L.ptdShadeF;
      if (!S.track) return;
      const m = S._m; m.compose(p, q, S._s.set(it.s ?? 1, it.s ?? 1, it.s ?? 1));
      const fl = it.v ? 1 : 0, s = it.s ?? 1;
      if (fl) { L.ptdLampF.add(m); L.ptdShadeF.add(m); } else { L.ptdLampN.add(m); L.ptdShadeN.add(m); }
      const y = (fl ? 21.4 : 12.2) * s;
      glowAt(S, p.x, p.y + y, p.z, 12 * s, WARM, 1.0);
      if (it.t < (S.tNow ?? 0) + 18) poolAt(S, p.x, p.y + 0.25, p.z, 22 * s, WARM, 0.55);
    },
    // "colonize your brain": a red pin stuck in his floor, landing as you come
    ptdPin(S, it, p, q) {
      const L = S.layers; void L.ptdPin2;
      if (!S.track) return;
      const T = S.tNow ?? 0, u = clamp((T - it.at) / 0.28, 0, 1);
      if (u <= 0) return;
      const m = S._m; p.y = (it.h ?? 0) + 18 * (1 - u * u) - 0.6 * Math.sin(Math.min(1, (T - it.at - 0.28) / 0.2) * Math.PI) * (T > it.at + 0.28 ? 1 : 0);
      S._e.set(it.tilt, it.seed * 6, it.tilt * 0.6); const pq = (S._ptp || (S._ptp = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, pq, S._s.set(1.4, 1.4, 1.4)); L.ptdPin2.add(m);
      if (u >= 1) glowAt(S, p.x, p.y + 9.4, p.z, 2.6, REDL, 0.6);
    },
    // a motion floodlight: it comes on hard as you get to it ("every trigger")
    ptdFlood(S, it, p, q, yaw) {
      const L = S.layers; void L.ptdFlood; void L.ptdFloodLens;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m, by = yaw + SIDE(it.x);
      S._e.set(0, by, 0); const bq = (S._ptf || (S._ptf = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(p, bq, S._s.set(1.3, 1.3, 1.3)); L.ptdFlood.add(m);
      const on = T > it.t - 0.85 && T < it.t + 2.6 ? 1 : 0, snap = on ? Math.min(1, (T - (it.t - 0.85)) / 0.04) * (T - (it.t - 0.85) < 0.18 ? (Math.sin(T * 120) > 0 ? 1 : 0.3) : 1) : 0;
      if (snap > 0) { L.ptdFloodLens.add(m); const w = local(p, by, 0, 26.5, 4.0, S._o); glowAt(S, w.x, w.y, w.z, 16, WHITEL, 1.6 * snap); const g = local(p, by, 0, 0, 14, S._o); poolAt(S, g.x, (it.h ?? 0) + 0.3, g.z, 30, WHITEL, 0.6 * snap); }
    },
    // a security camera turning on its pole to keep you in the picture
    ptdCam(S, it, p, q, yaw) {
      const L = S.layers; void L.ptdCamPole; void L.ptdCamHead;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m;
      m.compose(p, q, S._s.set(1.3, 1.3, 1.3)); L.ptdCamPole.add(m);
      const hp = S._ptch || (S._ptch = new THREE.Vector3()); hp.set(p.x, p.y + 24.4, p.z);
      const rp = S._ptcr || (S._ptcr = new THREE.Vector3()); S.track.ground(T + 0.15, 0, rp); rp.y = S.course.sample(T + 0.15, S._ptcs || (S._ptcs = {})).y + 1.4;
      const dx = rp.x - hp.x, dy = rp.y - hp.y, dz = rp.z - hp.z, d = Math.hypot(dx, dz);
      S._e.set(-Math.atan2(dy, d), Math.atan2(dx, dz), 0, 'YXZ'); const cq = (S._ptcq || (S._ptcq = new THREE.Quaternion())).setFromEuler(S._e); S._e.order = 'XYZ';
      m.compose(hp, cq, S._s.set(1.3, 1.3, 1.3)); L.ptdCamHead.add(m);
      const w = S._o.set(hp.x + Math.sin(Math.atan2(dx, dz)) * 1.2, hp.y + 2.0, hp.z + Math.cos(Math.atan2(dx, dz)) * 1.2);
      glowAt(S, w.x, w.y, w.z, 1.4, REDL, 1.4, 1);
    },
    // the set-pieces, each where it's sung
    ptdProp(S, it, p, q, yaw) {
      const L = S.layers, k = it.kind;
      if (!S.track) { for (const n of PROP_LAYERS[k] || []) void L[n]; return; }
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, c = S.course;
      const at = S._ptv || (S._ptv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const fy = it.x === 0 ? yaw + (it.rot ?? 0) : (FACING.has(k) ? yaw + Math.PI + (it.x > 0 ? -0.55 : 0.55) : yaw + SIDE(it.x)) + (it.rot ?? 0);
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, fy + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      const fq = quat('_ptdfq');
      const put = (layer, x = 0, y = 0, z = 0, qq = fq, sc = s, vals) => { const w = local(at, fy, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (x, y, z, size, cl, k2, mode = 0) => { const w = local(at, fy, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, cl, k2, mode); };
      const spot = (k2, cl = WHITEL, r = 30, x = 0, z = 0) => { const w = local(at, fy, x * s, 0, z * s, S._o); poolAt(S, w.x, (it.h ?? 0) + 0.3, w.z, r * s, cl, k2); };
      const sgn = S.atlas.index, bp = c.beatAt(T), pulse = Math.exp(-(((bp % 1) + 1) % 1) * 5);
      if (k === 'bottle') {
        // her perfume, the pin pulled on "pull the pin", her breath, and on "sting" it goes
        const blow = it.blow ?? 1e9, pull = it.pull ?? 1e9;
        put('ptdPlinth');
        if (T < blow) {
          const count = T > 12.9 ? pulse : 0;
          put('ptdBottle', 0, 1.6, 0); put('ptdBottleGold', 0, 1.6, 0); put('ptdLabel', 0, 1.6, 0);
          if (T < pull + 3) {
            const u = clamp((T - pull) / 0.22, 0, 1), f = Math.max(0, T - pull - 0.22);
            const px = -3.2 - 7 * u - 16 * f, py = 23.6 + 1.6 + 16 * f - 12 * f * f;
            put('ptdPin', px, py, 0, quat('_ptdpq', 0, 0, f * 9));
            if (T > pull) light(px - 2.9, py - 1.7, 0, 5, GOLDL, 1.4 * Math.max(0, 1 - f / 2.6));
          }
          light(0, 11, 0, 30, PINKL, 0.22 + 0.5 * count); light(0, 26, 0, 6, GOLDL, 0.6);
          spot(0.55, PINKL, 26);
          const mist = it.mist ?? 1e9;
          if (T > mist && T < mist + 4.5) for (let j = 0; j < 10; j++) {
            const u = T - mist - j * 0.12; if (u < 0) continue;
            const kk = Math.max(0, 1 - u / 3.6) * 0.32;
            light(-1 - u * 3 + Math.sin(j * 2.1) * 2, 26 + u * 2.4 + Math.cos(j) * 1.2, u * 7.5, 7 + u * 5, PINKL, kk);
          }
        } else {
          const u = T - blow;
          if (u < 3.2) {
            for (let j = 0; j < 40; j++) {
              const a = hash(j * 1.3) * Math.PI * 2, el = (hash(j * 2.7) - 0.3) * 1.4, sp = 18 + hash(j * 5.1) * 26;
              const vx = Math.cos(a) * Math.cos(el) * sp, vz = Math.sin(a) * Math.cos(el) * sp, vy = Math.sin(el) * sp + 8;
              const y = 12 + vy * u - 11 * u * u; if (y < -2) continue;
              put('ptdShard', vx * u, y, vz * u, quat('_ptdsq', u * (4 + j), u * (3 + j * 0.5), u * 5), s * (0.8 + hash(j * 9.1) * 1.4));
            }
            light(0, 14, 0, 56, WHITEL, 1.5 * Math.exp(-u * 4.0)); light(0, 12, 0, 40, PINKL, 1.4 * Math.exp(-u * 2.2));
            for (let j = 0; j < 18; j++) { const a = j / 18 * Math.PI * 2, r = 10 + 46 * u; light(Math.cos(a) * r, 6 + 4 * u, Math.sin(a) * r, 16 + 10 * u, PINKL, 0.5 * Math.exp(-u * 1.3)); }
          }
        }
      } else if (k === 'gantry') {
        // four start lights: one on each count, then the flash
        put('ptdGantry');
        const counts = it.counts || [], blow = it.blow ?? 1e9;
        for (let i = 0; i < 4; i++) {
          const lx = [-7.5, -2.5, 2.5, 7.5][i];
          let kk = 0.06, cl = REDL;
          if (T >= counts[i] && T < blow) kk = 1.3 * (1 + 1.4 * Math.exp(-(T - counts[i]) * 6));
          if (T >= blow && T < blow + 0.6) { cl = WHITEL; kk = 1.7 * (1 - (T - blow) / 0.6); }
          for (const z of [-1.1, 1.1]) light(lx, 21.6, z, cl === WHITEL ? 2.8 : 4.2, cl, kk);
        }
        light(0, 25, 0, 20, AMBER, 0.08, 1);
      } else if (k === 'doorLeaf') { put('ptdDoor'); light(0, 12, 0, 18, WARM, 0.08);
      } else if (k === 'boxes') { put('ptdBoxes'); spot(0.25, WARM, 20);
      } else if (k === 'frameDown') { put('ptdFrameDown'); light(0, 13, 0, 8, WARM, 0.25); spot(0.3, WARM, 14);
      } else if (k === 'coat') { put('ptdCoat'); light(0, 26, 2, 10, WARM, 0.3); spot(0.3, WARM, 16);
      } else if (k === 'hole') { put('ptdHole');
      } else if (k === 'shower') {
        // the water running; the head shaking while he does
        put('ptdShower'); put('ptdShowerGlass');
        const sh = it.shake && T > it.shake[0] && T < it.shake[1] ? 1 : 0.15;
        const jx = 0.35 * sh * Math.sin(T * 53), jz = 0.3 * sh * Math.sin(T * 41 + 1);
        put('ptdShowerHead', jx, 24.0, -3.4 + jz, quat('_ptdhq', 0, 0.1 * sh * Math.sin(T * 47), 0.1 * sh * Math.sin(T * 39)));
        for (let j = 0; j < 40; j++) { const ph = ((T * (1.6 + hash(j) * 0.6) + hash(j * 3.3)) % 1); light(jx + (hash(j * 7.7) - 0.5) * 4.4 * (0.4 + ph), 23.2 - 22 * ph, -3.4 + jz + (hash(j * 5.3) - 0.5) * 4.4 * (0.4 + ph), 1.3, COLD, 0.9); }
        for (let j = 0; j < 5; j++) { const u = ((T * 0.25 + j * 0.2) % 1); light((hash(j) - 0.5) * 10, 8 + u * 22, (hash(j * 2) - 0.5) * 8, 10 + u * 6, [0.6, 0.7, 0.8], 0.06 * (1 - u)); }
        light(0, 25.5, -3.4, 8, COLD, 0.5); spot(0.4, COLD, 22);
      } else if (k === 'sink') { put('ptdSink'); light(0, 26, -4, 10, WARM, 0.3);
      } else if (k === 'mirror') {
        // his mirror, her lipstick on it; the bulbs over it
        put('ptdMirror'); put('ptdMirrorFace', 0, 0, 0, fq, s, signV(sgn[it.sign] ?? 0, 0.9));
        for (let j = 0; j < 5; j++) light(-8 + j * 4, 8.6, 1.0, 2.2, WARM, 0.9);
      } else if (k === 'counter') {
        // the knife block with one slot dark, a light right on it
        put('ptdCounter');
        light(-4, 26, 2, 7, WARM, 0.5); spot(0.6, WARM, 14, -4, 2);
        if (T > (it.look ?? 1e9) - 0.6) light(-4.6, 17.4, 0.6, 2.4, REDL, 0.9 * smooth(it.look - 0.6, it.look, T), 1);
      } else if (k === 'perfume') {
        // her perfume at the end of the aisle, the tester going on "perfume"
        put('ptdPerfume'); light(0, 18, 4, 18, PINKL, 0.35); spot(0.5, PINKL, 20);
        const sp = it.spray ?? 1e9;
        if (T > sp && T < sp + 3.4) for (let j = 0; j < 9; j++) { const u = T - sp - j * 0.1; if (u < 0) continue; light(u * 2 * Math.sin(j), 21.2 + u * 1.6, 1.4 + u * 9, 4 + u * 6, PINKL, 0.3 * Math.max(0, 1 - u / 3)); }
      } else if (k === 'aisleSign') {
        // hung from the ceiling over the road, both sides
        const room = roomAt(S.plan, it.t), H = room ? room[1] : 30;
        const w = local(at, fy, 0, 0, 0, S._o); w.y = (it.h ?? 0) + H - 6;
        m.compose(w, fq, S._s.set(1.15, 1.15, 1.15)); L.ptdAisleSign.add(m); L.ptdAisleFace.add(m, signV(sgn[it.sign] ?? 0, 0.9 * storeLit(T) + 0.1));
      } else if (k === 'checkout') {
        // a lane: the scanner's red on every beat
        const right = it.x > 0;
        S._e.set(0, yaw + (right ? 0 : Math.PI), 0); const lq = (S._ptdcq || (S._ptdcq = new THREE.Quaternion())).setFromEuler(S._e);
        m.compose(at, lq, S._s.set(s, s, s)); L.ptdCheckout.add(m);
        const lit = storeLit(T), hot = T > 49.2 && T < 52.7 ? 1 : 0.35;
        const ly = yaw + (right ? 0 : Math.PI);
        const sc = local(at, ly, -0.6, 8.4, 6.6, S._o); glowAt(S, sc.x, sc.y, sc.z, 5 * s, REDL, (0.2 + 1.8 * pulse) * hot * Math.max(0.25, lit));
        const rg = local(at, ly, 2.8, 15.6, 10.9, S._o); glowAt(S, rg.x, rg.y, rg.z, 3 * s, GREENL, 0.7 * Math.max(0.2, lit));
        const ov = local(at, ly, 0, 24, 0, S._o); glowAt(S, ov.x, ov.y, ov.z, 10, [0.9, 1, 0.95], 0.25 * lit);
      } else if (k === 'basket') {
        // dropped on "hit the floor", the oranges rolling out across it
        const d = it.drop ?? -1e9, u = clamp((T - d) / 0.32, 0, 1);
        if (T > d - 3) {
          const by = 12 * (1 - u * u);
          put('ptdBasket', 0, by, 0, quat('_ptdbq', 0, (1 - u) * 0.6, 0));
          for (let j = 0; j < 7; j++) {
            const f = Math.max(0, T - d - 0.3), r = Math.min(1, f / (1.2 + hash(j) * 0.8)), ease = 1 - (1 - r) * (1 - r);
            const a = -0.9 + hash(j * 3.1) * 1.8, dist = (5 + hash(j * 7.3) * 16) * ease;
            put('ptdOrange', Math.sin(a) * dist + (hash(j * 2) - 0.5) * 3, T > d + 0.3 ? 0 : by + 2, 4 + Math.cos(a) * dist, quat('_ptdoq', dist * 0.6, dist * 0.8, 0));
          }
        }
        spot(0.3, WHITEL, 18);
      } else if (k === 'exit') {
        // EMERGENCY EXIT, ALARM WILL SOUND: the doors swung out, the sign over them, the light going
        S._e.set(0, fy + Math.PI, 0); const bq = (S._ptdeq || (S._ptdeq = new THREE.Quaternion())).setFromEuler(S._e);
        for (const sx of [-1, 1]) {
          const hinge = local(at, fy, sx * 12.2, 0, 0.6, S._o);
          S._e.set(0, fy + sx * 1.75, 0); const dq = (S._ptddq || (S._ptddq = new THREE.Quaternion())).setFromEuler(S._e);
          const w = S._p3 || (S._p3 = new THREE.Vector3()); w.copy(hinge);
          // (the leaf's own middle, swung out on its hinge)
          const dx = -sx * 5.8; w.x += Math.cos(fy + sx * 1.75) * dx; w.z -= Math.sin(fy + sx * 1.75) * dx;
          m.compose(w, dq, S._s.set(1, 1, 1)); L.ptdExitDoors.add(m);
        }
        const sw = local(at, fy, 0, 27.5, -0.8, S._o); m.compose(sw, bq, S._s.set(1, 1, 1)); L.ptdExitFace.add(m, signV(sgn.ptdEXIT, 1));
        light(0, 31.5, -1.2, 5, REDL, 1.8, 2); light(0, 31.5, -1.2, 18, REDL, 0.25);
        spot(0.35, REDL, 26, 0, -6);
      } else if (k === 'cushion') {
        // where her crown should be: nothing on it
        put('ptdCushion'); light(0, 40, 0, 18, WHITEL, 0.35); light(0, 17, 0, 9, WHITEL, 0.4 * (0.7 + 0.3 * pulse)); spot(0.9, WHITEL, 22);
        // a spotlight straight down on it
        if (it.t < T + 12 && it.t > T - 2) {
          const w = local(at, fy, 0, 56 * s, 0, S._p4 || (S._p4 = new THREE.Vector3()));
          m.compose(w, S._ptdDown || (S._ptdDown = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)), S._s.set(1.4, 1.4, 1.0)); L.ptdBeam.add(m, beamV(0.6, WHITEL));
        }
      } else if (k === 'calendar') {
        put('ptdCalSlab'); put(it.page ? 'ptdCalMar' : 'ptdCalOct');
        if (it.page) light(1.4, 10.9, 1.2, 4.5, REDL, 0.6 + 0.4 * pulse);
        light(0, 26, 6, 18, WARM, 0.25); spot(0.4, WARM, 18);
      } else if (k === 'phone') {
        // her phone on his nightstand: dark until it dings at dawn, then her words on it, buzzing
        const d = it.ding ?? 1e9, buzz = T > d && T < d + 0.7 ? 1 : 0;
        put('ptdPhone', 0.25 * buzz * Math.sin(T * 90), 0, 0);
        if (T > d) { put('ptdPhoneFace', 0.25 * buzz * Math.sin(T * 90), 0, 0, fq, s, signV(sgn[it.sign] ?? 0, 1)); light(0, 13.2, 1.5, 20, [0.75, 0.82, 1], 0.4 + 1.6 * Math.exp(-(T - d) * 3)); }
      } else if (k === 'armchair') { put('ptdArmchair'); light(-9, 22, 0, 10, WARM, 0.5); spot(0.5, WARM, 24);
      } else if (k === 'sideTable') { put('ptdSideTable');
      } else if (k === 'notepad') { put('ptdPadBoard'); put('ptdPadFace', 0, 0, 0, fq, s, signV(sgn[it.sign] ?? 0, 0.85)); light(0, 12, 3, 7, WARM, 0.35);
      } else if (k === 'clock') {
        put('ptdClock');
        const sec = T * Math.PI * 2 / 60 * 6, min = 3.9 + T * 0.02;
        put('ptdHand', 0, 0, 0, quat('_ptdh1', 0, 0, -sec), s * 1.05); put('ptdHand', 0, 0, 0.05, quat('_ptdh2', 0, 0, -min), s * 0.9); put('ptdHand', 0, 0, 0.1, quat('_ptdh3', 0, 0, -min / 12 - 2.4), s * 0.65);
      } else if (k === 'journal') { put('ptdJournal'); put('ptdPages'); put('ptdPen'); light(0, 10, 0, 22, WARM, 0.18); spot(0.35, WARM, 24);
      } else if (k === 'alarmClock') {
        // 3:47: its bells going
        const r = it.ring ?? 1e9, sh = T > r && T < r + 1.1 ? 1 : 0;
        put('ptdAlarmClock', 0, 0, 0, quat('_ptdaq', 0, 0, 0.06 * sh * Math.sin(T * 70)));
        light(0, 10, 4, 16, [1, 0.9, 0.75], 0.3); if (sh) for (const x of [-4.4, 4.4]) light(x, 17.2, 0, 7, WHITEL, 0.7);
        spot(0.4, [1, 0.9, 0.75], 18);
      } else if (k === 'wine') {
        // the glass on its side, the wine going out across the floor, the pennies
        put('ptdWine');
        const u = smooth(it.spill ?? 0, (it.spill ?? 0) + 3.2, T);
        // (out of its mouth, at the glass's -x end)
        spot(0.9, [0.6, 0.0, 0.05], 3 + 10 * u, -11 - 4 * u, 0); spot(0.55, [0.45, 0.0, 0.04], 2 + 7 * u, -16 - 5 * u, 3);
        for (let j = 0; j < 8; j++) { const a = hash(j * 4.1) * 6.28, r = 3 + hash(j * 2.2) * 7; put('ptdPenny', -14 + Math.cos(a) * r, 0.1, Math.sin(a) * r, quat('_ptdnq', a, 0.04, 0)); if ((Math.floor(T * 3) + j) % 4 === 0) light(-14 + Math.cos(a) * r, 0.6, Math.sin(a) * r, 1.6, [1, 0.6, 0.3], 0.8); }
        light(-2, 6, 0, 16, [1, 0.3, 0.35], 0.3); light(0, 12, 0, 30, [1, 0.5, 0.55], 0.12);
      } else if (k === 'gift') {
        // her parting gift: open, and in it the alarm, turning
        put('ptdGift');
        light(0, 9.5, 0, 12, REDL, 0.8 + 0.6 * pulse);
        if (it.t < T + 9) for (const ad of [0, Math.PI]) {
          S._e.set(-0.9, fy + T * 6 + ad, 0, 'YXZ'); const q2 = (S._ptdgq || (S._ptdgq = new THREE.Quaternion())).setFromEuler(S._e); S._e.order = 'XYZ';
          const w = local(at, fy, 0, 8.5, 0, S._p4 || (S._p4 = new THREE.Vector3())); m.compose(w, q2, S._s.set(1.3, 1.3, 1.3)); L.ptdBeam.add(m, beamV(0.5, REDL));
        }
      } else if (k === 'seahorse') {
        // the hippocampus, PTSD carved in a heart on it
        put('ptdSeahorse');
        put('ptdHeartRim', 0.6, 18.6, 3.75, quat('_ptdrq', 0, 0, 0), s * 1.0);
        put('ptdHeartFace', 0.6, 18.75, 4.5, fq, s, signV(sgn.ptdPTSD, 1));
        for (let j = 0; j < 9; j++) { const y = 4 + j * 3.2; light(Math.sin(j * 1.3) * 2, y, 0, 6, CORALL, 0.12 + 0.12 * Math.sin(T * 2 + j)); }
        light(0, 20, 6, 40, CORALL, 0.14); spot(0.4, CYANL, 30);
      } else if (k === 'compass') {
        // the compass, her crown for north, its needle on you
        put('ptdCompass'); put('ptdCompassFace');
        const cw = local(at, fy, 0, 12.6 * s, 0, S._p5 || (S._p5 = new THREE.Vector3()));
        const rp = S._ptdr || (S._ptdr = new THREE.Vector3()); S.track.ground(T, 0, rp); rp.y = c.sample(T, S._ptds || (S._ptds = {})).y + 1.5;
        const dx = rp.x - cw.x, dz = rp.z - cw.z, lx = dx * Math.cos(fy) - dz * Math.sin(fy);
        const ang = Math.atan2(lx, rp.y - cw.y + 4);
        put('ptdNeedle', 0, 12.6, 0.7, quat('_ptdnd', 0, 0, -ang));
        light(0, 12.6, 3, 26, GOLDL, 0.2); spot(0.4, GOLDL, 26);
      } else if (k === 'plant') { put('ptdPlant'); spot(0.4, WARM, 18);
      } else if (k === 'candle') { put('ptdCandle'); const f = 0.85 + 0.3 * hash(Math.floor(T * 18)); light(0, 14.9, 0, 3.2 * f, GOLDL, 1.4 * f); light(0, 14.9, 0, 14, WARM, 0.3 * f); spot(0.5 * f, WARM, 18);
      } else if (k === 'mug') { put('ptdMug'); for (let j = 0; j < 4; j++) { const u = ((T * 0.4 + j * 0.25) % 1); light(Math.sin(u * 6 + j) * 0.8, 13 + u * 7, 0, 2 + u * 3, [0.9, 0.9, 0.95], 0.18 * (1 - u)); } spot(0.35, WARM, 16);
      } else if (k === 'flowers') { put('ptdFlowers'); spot(0.4, WARM, 18);
      } else if (k === 'table2') {
        // a table set for two under one lamp
        put('ptdTable2'); put('ptdPendant');
        light(0, 16.6, 0, 16, WARM, 1.3); light(0, 11.9, 0, 3.2, GOLDL, 1.6 * (0.85 + 0.3 * hash(Math.floor(T * 16)))); light(0, 9, 0, 34, WARM, 0.18); spot(1.4, WARM, 30);
      }
    },
  },
  kits: {
    // her barricades down both sides of the road, on her stage's floor
    ptdBarricades(S, z, R) {
      prepare(S.course, S.plan);
      for (let t = z.from; t < z.to; t += z.every ?? 0.6) for (const side of z.side ? [z.side] : [-1, 1]) {
        const tt = t + (side > 0 ? (z.every ?? 0.6) * 0.5 : 0);
        if ((z.clear || []).some(([a, b, sd]) => tt > a && tt < b && (!sd || sd === side))) continue;
        S.items.push({ t: tt, x: side * (13.5 + R() * 0.8), parts: 'ptdBarricade', on: z.on, flares: z.flares, seed: R(), h: floorAt(S.course, tt) });
      }
    },
    ptdNeon(S, z, R) {
      prepare(S.course, S.plan);
      const ix = S.atlas.index; let i = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 2) {
        const side = i++ % 2 ? 1 : -1;
        S.items.push({ t, x: side * (38 + R() * 8), parts: 'ptdNeon', idx: R() < 0.72 ? ix.ptdDG : ix.ptdSN, s: 1 + R() * 0.25, seed: R(), h: floorAt(S.course, t) });
      }
    },
    ptdWarns(S, z) {
      prepare(S.course, S.plan);
      for (const [t, x] of z.at) S.items.push({ t, x, parts: 'ptdWarn', idx: S.atlas.index.ptdTW, h: floorAt(S.course, t) });
    },
    // his street in October: walk-ups, trees gone orange, the lamps
    ptdStreet(S, z, R) {
      prepare(S.course, S.plan);
      const bricks = [0x8a4a3a, 0x6a3a30, 0x9a5a44, 0x5a3a34, 0x7a4636], leaves = [0xd8661a, 0xc8401a, 0xe89a2a, 0xb83a14, 0xd87a20];
      for (const side of [-1, 1]) {
        for (let t = z.from; t < z.to; t += 0.3 + R() * 0.12) S.items.push({ t, x: side * (35 + R() * 4), rot: SIDE(side), s: 0.95 + R() * 0.2, sy: 0.55 + R() * 0.55, parts: 'block', tint: col(bricks[Math.floor(R() * bricks.length)]), seed: R(), wake0: 0.45, h: floorAt(S.course, t) });
        for (let t = z.from + R() * 0.2; t < z.to; t += 0.24 + R() * 0.1) S.items.push({ t, x: side * (18 + R() * 3), s: 1.0 + R() * 0.45, sy: 1.1, parts: 'tree', tint: col(leaves[Math.floor(R() * leaves.length)]), seed: R(), h: floorAt(S.course, t) });
        for (let t = z.from + (side > 0 ? 0.2 : 0); t < z.to; t += 0.42) S.items.push({ t, x: side * 13.2, rot: SIDE(side), parts: 'lamp', seed: R(), h: floorAt(S.course, t) });
      }
    },
    // furniture down both walls of one of his rooms, in that room's own order
    ptdDress(S, z, R) {
      prepare(S.course, S.plan);
      const W = TABLE.dims[z.style][0], set = DRESS[z.style];
      for (const side of [-1, 1]) {
        let i = side > 0 ? 2 : 0;
        for (let t = z.from + 0.35 + (side > 0 ? (z.every ?? 0.95) * 0.5 : 0); t < z.to - 0.3; t += z.every ?? 0.95) {
          if ((z.clear || []).some(([a, b, sd]) => t > a && t < b && (!sd || sd === side))) continue;
          const kind = set[i++ % set.length];
          S.items.push({ t, x: side * (W - 0.7 - DEPTH[kind] / 2), rot: SIDE(side), parts: 'ptdFurn', kind, h: floorAt(S.course, t), seed: R() });
        }
      }
    },
    // the last chorus: his things, all of them, out on her stage
    ptdParade(S, z, R) {
      prepare(S.course, S.plan);
      // (only his tall things: the barricades hide anything lower out there)
      const kinds = ['fridge', 'door', 'bookshelf', 'wardrobe', 'tallPlant', 'door', 'fridge', 'bookshelf'];
      let i = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.5) {
        const side = i % 2 ? 1 : -1, kind = kinds[i++ % kinds.length];
        S.items.push({ t, x: side * (21 + R() * 6), rot: SIDE(side) + (R() - 0.5) * 0.8, parts: 'ptdFurn', kind, spot: true, s: 1.25, h: floorAt(S.course, t), seed: R() });
      }
    },
    ptdLamps(S, z, R) {
      prepare(S.course, S.plan);
      let i = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.5) for (const side of [-1, 1]) {
        const fl = (i++ % 3) === 1;
        S.items.push({ t: t + R() * 0.12, x: side * (fl ? 27 : 25 + R() * 3), rot: SIDE(side), parts: 'ptdLamp', v: fl ? 1 : 0, s: 1, h: floorAt(S.course, t) });
      }
    },
    ptdPins(S, z, R) {
      prepare(S.course, S.plan);
      for (let t = z.from; t < z.to; t += z.every ?? 0.1) {
        const side = R() < 0.5 ? -1 : 1;
        S.items.push({ t, x: side * (17 + R() * 15), parts: 'ptdPin', at: t - 1.5 - R() * 0.5, tilt: (R() - 0.5) * 0.5, seed: R(), h: floorAt(S.course, t) });
      }
    },
    ptdFloods(S, z) {
      prepare(S.course, S.plan);
      let i = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.5) { const side = i++ % 2 ? 1 : -1; S.items.push({ t, x: side * 17, parts: 'ptdFlood', h: floorAt(S.course, t) }); }
    },
    ptdCams(S, z) {
      prepare(S.course, S.plan);
      let i = 0;
      for (let t = z.from; t < z.to; t += z.every ?? 0.6) { const side = i++ % 2 ? 1 : -1; S.items.push({ t, x: side * 16, parts: 'ptdCam', h: floorAt(S.course, t) }); }
    },
    // the set-pieces; the ones that stand on the floor take its height there
    ptdProps(S, z) {
      prepare(S.course, S.plan);
      for (const a of z.at) {
        const it = { ...a, parts: 'ptdProp' };
        if (a.floor) it.h = floorAt(S.course, a.t);
        S.items.push(it);
      }
    },
  },
});

// what stands down the walls of each kind of his rooms, in turn, and how deep each thing is
const DRESS = {
  home: ['sideboard', 'radiator', 'bookshelf', 'door', 'sofa', 'tv', 'radiator', 'tallPlant'],
  bath: ['towels', 'bathShelf', 'radiator', 'tub'],
  kitchen: ['cupboards', 'fridge', 'cupboards', 'cupboards'],
  office: ['bookshelf', 'desk', 'bookshelf', 'tallPlant', 'door', 'bookshelf'],
  morning: ['sideboard', 'bookshelf', 'radiator', 'tallPlant', 'door', 'sofa'],
};
const DEPTH = { bookshelf: 5, sideboard: 5.4, radiator: 1.4, door: 1.2, sofa: 9, tv: 5, cupboards: 8.8, fridge: 9, tub: 10, towels: 1.4, bathShelf: 3, dresser: 6.4, wardrobe: 7.4, desk: 9, tallPlant: 6 };

// a room's [W, H] at a song time, if she's in one then
function roomAt(plan, t) {
  for (const r of (plan && plan.rooms) || []) if (t >= r.from && t <= r.to) return TABLE.dims[r.style];
  return null;
}

// ---------- his rooms ----------
// The store's outline has its shelves in it: up the shelf's face, along its top, then the wall.
const RINGS = {
  box: (W = 34, H = 30) => [
    [-W, H, 1, 1], [-W, 0, 1, 1],
    [-W, 0, 1, 0], [-W * 0.5, 0, 1, 0], [0, 0, 1, 0], [W * 0.5, 0, 1, 0], [W, 0, 1, 0],
    [W, 0, 1, 2], [W, H, 1, 2],
    [W, H, 1, 3], [W * 0.5, H, 1, 3], [0, H, 1, 3], [-W * 0.5, H, 1, 3], [-W, H, 1, 3],
  ],
  store: (W = 40, H = 32) => {
    const S = 7, T = 11.5;
    return [
      [-W, H, 1, 1], [-W, T, 1, 1],
      [-W, T, 1, 5], [-W + S, T, 1, 5],
      [-W + S, T, 1, 4], [-W + S, 0, 1, 4],
      [-W + S, 0, 1, 0], [-W * 0.4, 0, 1, 0], [0, 0, 1, 0], [W * 0.4, 0, 1, 0], [W - S, 0, 1, 0],
      [W - S, 0, 1, 4], [W - S, T, 1, 4],
      [W - S, T, 1, 5], [W, T, 1, 5],
      [W, T, 1, 2], [W, H, 1, 2],
      [W, H, 1, 3], [0, H, 1, 3], [-W, H, 1, 3],
    ];
  },
};
const TABLE = {
  rings: RINGS,
  ringOf: (s) => (s === 'store' || s === 'aisle' ? 'store' : 'box'),
  styles: { home: 0, bath: 1, kitchen: 2, store: 3, aisle: 3, bed: 4, office: 5, morning: 6 },
  dims: { home: [34, 30], bath: [30, 28], kitchen: [32, 28], store: [40, 32], aisle: [22, 32], bed: [34, 30], office: [34, 30], morning: [34, 30] },
  lights: (id) => [[26, 6], [18, 4], [22, 6], [12, 3], [16, 5], [24, 8], [26, 6]][id] || null,
};

function roomMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uFogDensity: { value: 0.002 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uLight: { value: new THREE.Color(1, 1, 1) }, uLit: { value: 1 }, uLace: { value: 0 }, uDawn: { value: 0 }, uMove: { value: 0 }, uLits: { value: [1, 1, 1, 1, 1, 1, 1] },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uFogDensity, uLace, uDawn, uMove; uniform float uLits[7]; uniform vec3 uFog, uCam, uLight;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      ${AA_GLSL}
      float h1(float n){ return fract(sin(n * 127.1 + 3.7) * 43758.5453); }
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      // how much of the pixel is inside the box [a, b] (both ways)
      float rectA(vec2 p, vec2 a, vec2 b){ vec2 w = max(fwidth(p), vec2(1e-4)); vec2 lo = clamp((p - a) / w + 0.5, 0.0, 1.0), hi = clamp((b - p) / w + 0.5, 0.0, 1.0); return lo.x * lo.y * hi.x * hi.y; }
      // her lace: rosettes on a net, settling to its average far off
      float lace(vec2 p){
        vec2 q = p / 2.8, c = fract(q) - 0.5; float r = length(c), a = atan(c.y, c.x);
        float fw = fwidth(r) + 1e-3;
        float petals = 0.29 + 0.07 * cos(a * 6.0);
        float ro = 1.0 - smoothstep(0.02, 0.05 + fw, abs(r - petals));
        float dotc = 1.0 - smoothstep(0.07, 0.1 + fw, r);
        vec2 g = abs(fract(q * 2.0 + 0.5) - 0.5);
        float net = 1.0 - smoothstep(0.025, 0.05 + fwidth(q.x) * 2.0, min(g.x, g.y));
        return mix(max(max(ro, dotc), net * 0.7), 0.4, smoothstep(0.12, 0.5, fwidth(q.x)));
      }
      void main(){
        int part = int(vPart + 0.5); int st = int(uStyle + 0.5);
        float x = vC.x, h = vC.y, along = vC.z, ax = abs(x);
        float lit = uLits[st];
        vec3 col = vec3(0.5), glow = vec3(0.0);
        if (part == 0) {
          if (st == 1) { float k = aaChk(vec2(x, along) / 2.4); col = mix(vec3(0.86, 0.88, 0.9), vec3(0.08, 0.08, 0.1), k); }
          else if (st == 2) { float g = max(aaPulse(x / 3.0, 0.04), aaPulse(along / 3.0, 0.04)); col = vec3(0.5, 0.25, 0.16) * (0.85 + 0.25 * h2(floor(vec2(x, along) / 3.0))) * (1.0 - 0.45 * g); }
          else if (st == 3) { float k = aaChk(vec2(x, along) / 3.2); col = mix(vec3(0.8, 0.82, 0.78), vec3(0.6, 0.64, 0.6), k) * (0.9 + 0.1 * n2(vec2(x, along) * 0.3)); col += vec3(0.14) * exp(-pow(ax / 7.0, 2.0)) * lit; }
          else if (st == 5) { col = vec3(0.3, 0.08, 0.07) * (0.8 + 0.3 * n2(vec2(x, along) * 1.3)); col = mix(col, vec3(0.5, 0.36, 0.14), aaBand(ax, 25.0, 0.8)); }
          else {
            float pk = floor(x / 1.6), off = h1(pk) * 9.0;
            float sx = aaPulse(x / 1.6, 0.04), sz = aaPulse((along + off) / 9.0, 0.012);
            vec3 w = vec3(0.34, 0.19, 0.1) * (0.75 + 0.4 * h1(pk * 3.1 + floor((along + off) / 9.0)));
            col = w * (1.0 - 0.5 * max(sx, sz));
            if (st == 4) col = mix(col, vec3(0.6, 0.52, 0.48), 0.8 * (1.0 - smoothstep(18.0, 18.6, ax)));
            if (st == 6) col *= 1.25;
          }
        } else if (part == 1 || part == 2 || part == 6) {
          float u = part == 6 ? x : along + (part == 2 ? 37.0 : 0.0);
          if (st == 1) {
            vec2 tq = vec2(u / 1.2 + 0.5 * floor(h / 0.6), h / 0.6);
            float gr = max(aaPulse(tq.x, 0.06), aaPulse(tq.y, 0.1));
            col = mix(vec3(0.86, 0.9, 0.92), vec3(0.5, 0.55, 0.58), gr);
            col = mix(col, vec3(0.04, 0.04, 0.05), aaBand(h, 9.0, 0.35));
          } else if (st == 2) {
            vec2 tq = vec2(u / 1.5, h / 1.5); float gr = max(aaPulse(tq.x, 0.05), aaPulse(tq.y, 0.05));
            col = mix(vec3(0.4, 0.46, 0.42), mix(vec3(0.82, 0.86, 0.8), vec3(0.5), gr), step(h, 16.0));
          } else if (st == 3) {
            vec2 bq = vec2(u / 2.4 + 0.5 * floor(h / 1.2), h / 1.2); float gr = max(aaPulse(bq.x, 0.04), aaPulse(bq.y, 0.06));
            col = vec3(0.74, 0.78, 0.72) * (1.0 - 0.25 * gr);
            col = mix(col, vec3(0.75, 0.08, 0.1), aaBand(h, 21.0, 1.0));
          } else if (st == 5) {
            float pan = aaPulse(u / 3.5, 0.05);
            vec3 wood = vec3(0.3, 0.16, 0.08) * (0.8 + 0.3 * h1(floor(u / 3.5))) * (1.0 - 0.5 * pan);
            col = h < 7.0 ? wood : vec3(0.4, 0.5, 0.4);
            col = mix(col, vec3(0.22, 0.12, 0.06), max(aaBand(h, 7.0, 0.3), aaBand(h, 22.0, 0.25)));
            float cell = floor(u / 15.0), lu = u - cell * 15.0, has = step(0.4, h1(cell + 5.0));
            col = mix(col, vec3(0.08), rectA(vec2(lu, h), vec2(4.0, 12.0), vec2(11.0, 17.0)) * has);
            col = mix(col, vec3(0.93, 0.9, 0.8), rectA(vec2(lu, h), vec2(4.5, 12.5), vec2(10.5, 16.5)) * has);
          } else if (st == 4) {
            col = mix(vec3(0.6, 0.64, 0.72), vec3(0.68, 0.7, 0.78), aaSq(u / 1.2));
            float cell = floor(u / 30.0), lu = u - cell * 30.0;
            float win = rectA(vec2(lu, h), vec2(9.0, 8.0), vec2(21.0, 22.0)) * (part == 6 ? 0.0 : 1.0);
            float slat = aaPulse(h / 0.8, 0.3);
            vec3 outside = mix(vec3(0.03, 0.04, 0.08), vec3(0.75, 0.65, 1.0) * 1.4, uDawn);
            col = mix(col, mix(outside, vec3(0.62, 0.62, 0.64) * 0.5, slat), win);
            glow += vec3(0.6, 0.55, 1.0) * uDawn * win * (1.0 - slat) * 1.1;
          } else {
            vec3 pnt = st == 6 ? vec3(0.76, 0.7, 0.6) : vec3(0.4, 0.42, 0.48);
            col = pnt * (0.92 + 0.1 * n2(vec2(u, h) * 0.2));
            float cell = floor(u / 19.0), lu = u - cell * 19.0, has = step(0.25, h1(cell * 7.7)) * (part == 6 ? 0.0 : 1.0);
            float w = 4.0 + 4.0 * h1(cell * 1.7), hh = 5.0 + 4.0 * h1(cell * 2.3), y0 = 10.0 + 3.0 * h1(cell * 3.1), x0 = 9.5 - w * 0.5 + 2.0 * (h1(cell) - 0.5);
            // the paler squares where her pictures hung, and the nail each one hung from
            col = mix(col, pnt * 1.35 + 0.035, rectA(vec2(lu, h), vec2(x0, y0), vec2(x0 + w, y0 + hh)) * has);
            col = mix(col, vec3(0.05), (1.0 - smoothstep(0.08, 0.16, length(vec2(lu - x0 - w * 0.5, h - y0 - hh - 0.6)))) * has);
            col = mix(col, vec3(0.86, 0.84, 0.8) * 0.75, step(h, 1.4));
          }
        } else if (part == 3) {
          col = st == 3 ? vec3(0.8, 0.82, 0.8) : vec3(0.68, 0.68, 0.7);
          if (st == 3) {
            float gr = max(aaPulse(x / 2.4, 0.05), aaPulse(along / 2.4, 0.05)); col *= 1.0 - 0.3 * gr;
            float pan = rectA(vec2(mod(x + 6.0, 12.0), mod(along, 12.0)), vec2(4.6, 1.5), vec2(7.4, 10.5));
            glow += vec3(0.85, 1.0, 0.92) * pan * 2.4 * lit;
          }
        } else if (part == 4) {
          // a shelf's face: rows of product, the price strips, the shelves' lips
          float lev = floor(h / 2.3), lh = h - lev * 2.3;
          float u = along + (x < 0.0 ? 0.0 : 113.0) + lev * 7.3;
          float colId = floor(u / 1.25), f = fract(u / 1.25);
          vec3 pc = vec3(h1(colId * 1.3), h1(colId * 2.1 + 3.0), h1(colId * 3.7 + 5.0));
          // (all about as bright as each other: only their colour changes column to column, so rushing past they don't strobe)
          pc = mix(pc, vec3(dot(pc, vec3(0.33))), 0.25); pc = pc / (dot(pc, vec3(0.3, 0.59, 0.11)) + 0.2) * 0.42;
          float top = 1.2 + 0.7 * h1(colId * 5.3);
          float prod = rectA(vec2(f, lh), vec2(0.08, 0.32), vec2(0.92, 0.32 + top));
          col = mix(vec3(0.24, 0.25, 0.27), pc, prod);
          col = mix(col, vec3(0.95), rectA(vec2(f, lh), vec2(0.18, 0.55), vec2(0.82, 0.95)) * prod * 0.55);
          col = mix(col, vec3(0.86, 0.88, 0.9), aaBand(lh, 0.14, 0.14));
          // settling to their average when finer than a pixel, and a little as they rush past (a frame's travel)
          col = mix(col, vec3(0.4, 0.38, 0.37), smoothstep(0.2, 0.7, max(fwidth(u), uMove) / 1.25) * 0.7);
        } else if (part == 5) {
          col = vec3(0.55, 0.42, 0.26) * (0.75 + 0.4 * h1(floor(along / 3.0) + floor(x)));
        } else if (part == 7) {
          if (st == 3) {
            float mul = max(aaPulse(x / 8.0, 0.06), step(h, 1.5));
            col = mix(vec3(0.7, 1.0, 0.9) * 0.9, vec3(0.3), mul);
            glow += vec3(0.7, 1.0, 0.88) * (1.0 - mul) * 1.4 * step(h, 24.0) * step(14.5, ax);
            col = mix(col, vec3(0.2, 0.22, 0.24), step(24.0, h));
          } else {
            vec2 b = vec2(x / 2.4 + 0.5 * mod(floor(h / 0.9), 2.0), h / 0.9);
            float mm = max(aaPulse(b.x, 0.07), aaPulse(b.y, 0.1));
            col = mix(vec3(0.3, 0.12, 0.09) * (0.75 + 0.4 * h2(floor(b))), vec3(0.16, 0.14, 0.13), mm);
            vec2 wq = vec2(x / 14.0, h / 11.0), wc = floor(wq), wf = fract(wq);
            float win = rectA(wf, vec2(0.3, 0.25), vec2(0.7, 0.75)) * step(3.0, h / 11.0) * step(0.35, h2(wc));
            vec3 wl = mix(vec3(1.0, 0.75, 0.45), vec3(0.6, 0.75, 1.0), step(0.6, h2(wc + 3.0)));
            col = mix(col, wl * 0.5, win); glow += wl * win * 0.8;
          }
          lit = 1.0;
        } else if (part == 8) { col = vec3(0.12, 0.1, 0.1); }
        // the light pools under each of the room's lamps (where the table hangs them), dark between
        float LP = st == 0 ? 26.0 : st == 1 ? 18.0 : st == 2 ? 22.0 : st == 3 ? 12.0 : st == 4 ? 16.0 : st == 5 ? 24.0 : 26.0;
        float LO = st == 0 ? 6.0 : st == 1 ? 4.0 : st == 2 ? 6.0 : st == 3 ? 3.0 : st == 4 ? 5.0 : st == 5 ? 8.0 : 6.0;
        float dA = mod(along - LO + LP * 0.5, LP) - LP * 0.5;
        float pool = exp(-dA * dA / (LP * LP * 0.05)) * (part == 0 ? exp(-x * x / 500.0) * 0.7 + 0.3 : 1.0) * (part == 3 ? 0.6 : 1.0);
        float lk = (part == 6 || part == 7 || part == 8) ? 0.9 : (st == 3 ? 0.9 + 0.2 * pool : st == 4 ? 0.85 + 0.3 * pool : 0.42 + 0.95 * pool);
        col *= mix(uLight, vec3(1.0), 0.35) * (0.2 + 0.8 * lit) * lk;
        // her lace up his walls (and in over the floor from them)
        if (uLace > 0.001 && st == 6 && part != 3 && part != 7 && part != 8) {
          float ly = part == 0 ? (36.0 - ax) * 0.9 : h;
          float front = uLace * 36.0 + 3.0 * (n2(vec2(along * 0.15, x * 0.1)) - 0.5);
          float m = smoothstep(front + 0.8, front - 0.8, ly) * lace(part == 0 ? vec2(along, x) : vec2(part == 6 ? x : along, h));
          col = mix(col, vec3(0.7, 0.02, 0.08) * (0.4 + 0.6 * lit), m * 0.92);
          glow += vec3(0.35, 0.0, 0.04) * m;
        }
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- the floor of everywhere else ----------
// Her stage (black lacquer boards, red lines down both sides of the road), his street in October
// (asphalt, the curbs, the walks with leaves on them), and the inside of his head (dark water, light
// moving on it, threads of nerve glowing). Rows at fixed song times, like the rooms, so it keeps to
// its places as she rides; under a room it sinks out of the way of the room's own floor.
class PtdFloor {
  constructor(scene, course, plan) {
    this.course = course; this.plan = plan || {};
    this.rooms = this.plan.rooms || []; this.floors = this.plan.floors || [];
    this.cols = [-240, -190, -150, -110, -80, -58, -42, -30, -22, -16, -12, -7, 0, 7, 12, 16, 22, 30, 42, 58, 80, 110, 150, 190, 240];
    const N = this.N = 150, M = this.M = this.cols.length;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * M * 3); this.b = new Float32Array(N * M * 2); this.k = new Float32Array(N * M * 2);
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b2 = a + 1, c = a + M, d = c + 1; idx.push(a, c, b2, b2, c, d); }
    g.setIndex(idx); this.idxPerRow = idx.length / (N - 1);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aB', new THREE.BufferAttribute(this.b, 2).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aK', new THREE.BufferAttribute(this.k, 2).setUsage(THREE.DynamicDrawUsage));
    this.mat = floorMaterial();
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = -5;
    this.geo = g; scene.add(this.mesh);
    this._p = new THREE.Vector3(); this.ts = new Float32Array(N); this.cum = new Float32Array(N);
    this.DT = 0.36;
  }
  kindAt(t) { for (const f of this.floors) if (t >= f.from && t <= f.to) return f.kind; return 0; }
  inRoom(t) { for (const r of this.rooms) if (t > r.from + 0.2 && t < r.to - 0.2) return true; return false; }
  update(track, rider) {
    const ta = rider.t - 5, tb = rider.t + 46;
    const N = this.N, M = this.M, ts = this.ts, cum = this.cum, DT = this.DT, cols = this.cols, c = this.course;
    let rows = 0;
    ts[rows++] = ta;
    for (let k = Math.floor(ta / DT) + 1; k * DT < tb - 1e-4 && rows < N - 1; k++) if (k * DT > ta + 1e-4) ts[rows++] = k * DT;
    ts[rows++] = tb;
    let lx = 0, lz = 0;
    for (let i = 0; i < rows; i++) {
      const t = ts[i], base = floorAt(c, t) - (this.inRoom(t) ? 1.8 : 0), kind = this.kindAt(t);
      for (let j = 0; j < M; j++) {
        const x = cols[j], ax = Math.abs(x);
        track.ground(t, x, this._p);
        const o = (i * M + j) * 3; this.pos[o] = this._p.x; this.pos[o + 1] = ax <= 150 ? base : base * (1 - smooth(150, 230, ax)); this.pos[o + 2] = this._p.z;
        const ko = (i * M + j) * 2; this.k[ko] = kind === 1 ? 1 : 0; this.k[ko + 1] = kind === 2 ? 1 : 0;
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
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aB.needsUpdate = true; this.geo.attributes.aK.needsUpdate = true;
  }
}
function floorMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.002 }, uCam: { value: new THREE.Vector3() }, uBase: { value: new THREE.Color(0x0c0a0e) }, uLine: { value: new THREE.Color(0xff2a3a) }, uSky: { value: new THREE.Color() }, uTime: { value: 0 }, uBeat: { value: 0 } },
    vertexShader: /* glsl */`attribute vec2 aB; attribute vec2 aK; varying vec2 vB; varying vec2 vK; varying vec3 vW; void main(){ vB = aB; vK = aK; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uFog, uCam, uBase, uLine, uSky; uniform float uFogDensity, uTime, uBeat;
      varying vec2 vB; varying vec2 vK; varying vec3 vW;
      ${AA_GLSL}
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float x = vB.x, along = vB.y, ax = abs(x);
        vec2 p = vec2(x, along);
        // her stage
        vec3 st = uBase * (0.6 + 0.35 * n2(p * 0.03));
        st *= 1.0 - 0.45 * max(aaPulse(x / 16.0 + 0.5, 0.014), aaPulse(along / 16.0, 0.014));
        vec3 stG = uLine * (aaBand(ax, 11.4, 0.2) * (0.75 + 0.5 * uBeat) + aaBand(ax, 12.6, 0.1) * 0.4);
        // his street
        vec3 sr = vec3(0.05, 0.05, 0.055) * (0.8 + 0.4 * h2(floor(vW.xz * 1.3)));
        float walk = smoothstep(11.8, 12.2, ax) * (1.0 - smoothstep(21.8, 22.2, ax));
        vec3 slab = vec3(0.22, 0.21, 0.2) * (0.85 + 0.2 * h2(floor(vec2(along / 4.0, x / 4.0)))) * (1.0 - 0.35 * aaPulse(along / 4.0, 0.03));
        sr = mix(sr, slab, walk);
        sr = mix(sr, vec3(0.42, 0.42, 0.4), aaBand(ax, 12.0, 0.18));
        sr = mix(sr, vec3(0.08, 0.06, 0.04) * (0.7 + 0.5 * n2(p * 0.2)), smoothstep(22.0, 22.6, ax));
        vec2 lc = floor(p / 1.3); float lv = step(0.84, h2(lc)) * step(11.5, ax) * (1.0 - smoothstep(0.25, 0.7, fwidth(x)));
        sr = mix(sr, mix(vec3(0.7, 0.28, 0.05), vec3(0.8, 0.55, 0.08), h2(lc + 7.0)) * 0.7, lv);
        // the inside of his head
        float cau = sin(x * 0.11 + uTime * 0.7 + sin(along * 0.05)) * sin(along * 0.09 - uTime * 0.5 + sin(x * 0.07));
        vec3 hd = uBase * 0.7 + vec3(0.015, 0.04, 0.1) * (0.6 + 0.5 * cau);
        float nv = n2(p * 0.025) + 0.5 * n2(p * 0.07 + 3.0);
        float fw = fwidth(nv) * 1.5;
        float thread = max(1.0 - smoothstep(0.0, 0.035 + fw, abs(nv - 0.74)), 0.7 * (1.0 - smoothstep(0.0, 0.03 + fw, abs(nv - 0.58))));
        vec3 hdG = uLine * thread * (0.35 + 0.65 * max(0.0, sin(uTime * 2.2 - along * 0.03 + x * 0.02))) * 1.3;
        float a = vK.x, b = vK.y;
        vec3 col = st * (1.0 - a - b) + sr * a + hd * b;
        col *= uSky;
        col += stG * (1.0 - a - b) + hdG * b;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
  });
}

// ---------- the end: her crown, behind glass ----------
// IN CASE OF EMERGENCY, BREAK GLASS: a red case on a post, her crown on a cushion in it, an alarm
// bell and a beacon on top, the hammer on its chain. On the last hit the glass goes.
function caseLabel() {
  return canvasTex(1024, 512, (g, W, H) => {
    g.fillStyle = '#c80c1c'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 96px "Arial Black", Impact, sans-serif'; g.fillText('IN CASE OF', W / 2, 110, W - 80); g.fillText('EMERGENCY', W / 2, 220, W - 80);
    g.fillRect(150, 300, W - 300, 150); g.fillStyle = '#c80c1c'; g.font = '900 100px "Arial Black", Impact, sans-serif'; g.fillText('BREAK GLASS', W / 2, 378, W - 340);
  });
}
const B = (w, h, d, x, y, z, c) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return paint(g, c); };
export class PtdFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? -27;
    prepare(course, scenery && scenery.plan);
    this.group = new THREE.Group(); scene.add(this.group);
    const red = rgb(0xc80c1c), dark = rgb(0x1a1418), steel = rgb(0x9aa0aa), gold = rgb(0xe8a838);
    const paintM = selfLit({ roughness: 0.4, metalness: 0.15 }, 0.25);
    // the post, its foot, the case (an open box facing the road), the bell and the beacon on top
    const parts = [B(4, 18, 4, 0, 9, 0, red), B(10, 1.2, 10, 0, 0.6, 0, dark),
      B(24, 1.6, 10, 0, 18.8, 0, red), B(24, 1.6, 10, 0, 44.2, 0, red), B(1.6, 27, 10, -11.2, 31.5, 0, red), B(1.6, 27, 10, 11.2, 31.5, 0, red), B(24, 27, 1, 0, 31.5, -4.5, rgb(0x2a0a10)),
      B(24.4, 0.8, 1.2, 0, 19.6, 4.6, steel), B(24.4, 0.8, 1.2, 0, 43.4, 4.6, steel), B(0.8, 24.6, 1.2, -11.8, 31.5, 4.6, steel), B(0.8, 24.6, 1.2, 11.8, 31.5, 4.6, steel)];
    const bell = new THREE.LatheGeometry([[0, 0], [3.6, 0.2], [3.9, 1.4], [3.2, 3.4], [1.6, 4.4], [0, 4.6]].map(([r, y]) => new THREE.Vector2(r, y)), 28); bell.translate(-5, 45, 0); parts.push(paint(bell, red));
    parts.push(B(1, 2, 1, -5, 50, 0, steel));
    parts.push(B(3.4, 1.4, 3.4, 5, 45.7, 0, dark));
    // the hammer on its chain, hanging off the case's side
    parts.push(B(0.7, 7, 0.7, 13.6, 24, 3, rgb(0xd8d0c0))); parts.push(B(3.4, 1.4, 1.4, 13.6, 27.8, 3, red));
    for (let k = 0; k < 8; k++) parts.push(B(0.25, 0.9, 0.5, 12.8 + Math.sin(k * 0.6) * 0.3, 41 - k * 1.6, 3.6, steel));
    this.body = new THREE.Mesh(merge(parts), paintM); this.group.add(this.body);
    this.dome = new THREE.Mesh(paint(new THREE.SphereGeometry(1.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), [1, 0.1, 0.1]), selfLit({ roughness: 0.2 }, 2.2)); this.dome.position.set(5, 46.4, 0); this.group.add(this.dome);
    // the label under the case
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(18, 9), new THREE.MeshStandardMaterial({ map: caseLabel(), emissive: 0xffffff, roughness: 0.5 }));
    lab.material.emissiveMap = lab.material.map; lab.material.emissiveIntensity = 0.55; lab.position.set(0, 12.2, 2.05); this.group.add(lab);
    this.labelBack = new THREE.Mesh(paint(new THREE.BoxGeometry(19, 10, 0.4), dark), paintM); this.labelBack.position.set(0, 12.2, 1.8); this.group.add(this.labelBack);
    // the crown on its cushion inside
    this.gold = selfLit({ roughness: 0.22, metalness: 0.75 }, 0.55);
    this.crown = new THREE.Mesh(PROP.crown(), this.gold); this.crown.scale.setScalar(1.55); this.crown.position.set(0, 28.6, 0.6); this.group.add(this.crown);
    this.cush = new THREE.Mesh(paint(new THREE.SphereGeometry(1, 20, 10).scale(6.2, 2.0, 3.6), rgb(0x8a0418)), paintM); this.cush.position.set(0, 26.4, 0.2); this.group.add(this.cush);
    this.cushGold = new THREE.Mesh(paint(new THREE.BoxGeometry(14, 2.6, 6), gold), this.gold); this.cushGold.position.set(0, 21.4, 0.2); this.group.add(this.cushGold);
    // the glass: whole until the last hit, then its pieces
    this.glassM = new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, emissive: 0x1a2030 });
    this.pane = new THREE.Mesh(new THREE.PlaneGeometry(22.4, 23.8), this.glassM); this.pane.position.set(0, 31.5, 4.8); this.group.add(this.pane);
    const sg = new THREE.TetrahedronGeometry(1.0); sg.scale(1.8, 1.4, 0.12);
    this.shards = new THREE.InstancedMesh(sg, new THREE.MeshStandardMaterial({ color: 0xf0f8ff, roughness: 0.05, metalness: 0.2, emissive: 0x3a4a5a }), 36);
    this.shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.shards.count = 0; this.shards.frustumCulled = false; this.group.add(this.shards);
    this.group.scale.setScalar(cfg.s ?? 1);
    this._p = new THREE.Vector3(); this._w = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3();
    this.fired = false; this.fireAt = null; this.fireK = 0;
  }
  fire() { this.fired = true; }
  update(track, rider, songT, dt) {
    const c = this.course, cfg = this.cfg;
    track.ground(this.t, this.x, this._p); this._p.y = floorAt(c, this.t);
    this.group.position.copy(this._p);
    this.group.rotation.set(0, c.sample(this.t).yaw + (cfg.rot ?? -2.3), 0);
    if (this.fired && this.fireAt === null) this.fireAt = songT;
    const u = this.fireAt === null ? -1 : songT - this.fireAt;
    this.pane.visible = u < 0;
    // the pieces: out and down
    if (u >= 0 && u < 4) {
      let n = 0;
      for (let j = 0; j < 36; j++) {
        const gx = ((j % 6) - 2.5) * 3.6, gy = (Math.floor(j / 6) - 2.5) * 3.8;
        const vx = gx * 1.6 + (hash(j) - 0.5) * 10, vz = 14 + hash(j * 3.1) * 18, vy = gy * 0.6 + 4 + hash(j * 5.7) * 8;
        const y = 31.5 + gy + vy * u - 14 * u * u; if (y < 0.5) continue;
        this._e.set(u * (3 + j % 5), u * (2 + j % 3), u * 4); this._q.setFromEuler(this._e);
        this._m.compose(this._w.set(gx + vx * u, y, 4.8 + vz * u), this._q, this._s.set(1, 1, 1)); this.shards.setMatrixAt(n++, this._m);
      }
      this.shards.count = n; this.shards.instanceMatrix.needsUpdate = true;
    } else this.shards.count = 0;
    this.fireK = u >= 0 ? Math.min(1, this.fireK + dt * 1.5) : 0;
    this.gold.emissiveIntensity = 0.55 + 0.6 * this.fireK;
    this.crown.rotation.y = songT * 0.3;
    this.crown.position.y = 28.6 + 0.8 * this.fireK + 0.3 * Math.sin(songT * 1.6) * this.fireK;
    const ring = u >= 0 && u < 3.2 ? 1 : 0;
    this.body.rotation.z = ring ? 0.004 * Math.sin(songT * 80) : 0;
    const S = this.S; if (!S) return;
    const T = rider.t; if (this.t - T > 46) return;
    const w = this._w, gm = this.group.matrixWorld; this.group.updateMatrixWorld(true);
    // the beacon on top, turning; the red light round it
    const spin = songT * (u >= 0 ? 7 : 3);
    w.set(5, 47.4, 0).applyMatrix4(gm); S.glow(w.x, w.y, w.z, 6, REDL, 1.2 + 0.8 * Math.max(0, Math.sin(spin * 2)));
    for (let j = 0; j < 2; j++) { const a = spin + j * Math.PI; w.set(5 + Math.cos(a) * 9, 47.0, Math.sin(a) * 9).applyMatrix4(gm); S.glow(w.x, w.y, w.z, 10, REDL, 0.35); }
    w.set(0, 31, 1).applyMatrix4(gm); S.glow(w.x, w.y, w.z, 26, GOLDL, 0.25 + 0.8 * this.fireK);
    w.set(0, 31, 6).applyMatrix4(gm); S.glow(w.x, w.y, w.z, 4, WHITEL, 0.5 + 1.5 * this.fireK * (0.6 + 0.4 * Math.sin(songT * 5)));
    w.set(0, 0, 8).applyMatrix4(gm); S.pool(w.x, this._p.y + 0.3, w.z, 44, REDL, 0.55 + 0.25 * Math.sin(spin * 2));
    w.set(0, 0, 4).applyMatrix4(gm); S.pool(w.x, this._p.y + 0.35, w.z, 24, GOLDL, 0.25 + 0.4 * this.fireK);
  }
}

// ---------- the place, per frame ----------
export class PtdWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    scene.userData.hasTerrain = true;   // (the street-grid ground sits lower, out of the way of her floor)
    this.mat = roomMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, TABLE));
    this.floor = new PtdFloor(scene, S.course, S.plan);
    this._g = new THREE.Vector3(); this._lits = new Array(7).fill(1);
    void S.town.layers.ptdLeaf;   // (made now, so it compiles with the rest instead of mid-ride)
  }
  update(S, dt, camera, time) {
    const P = S.P, t = S.rider.t, c = S.course;
    const u = this.mat.uniforms;
    u.uTime.value = time; u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity; u.uCam.value.copy(camera.position);
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.6) / 2.2);
    const L = u.uLits.value; for (let i = 0; i < 7; i++) L[i] = roomLit(i, t);
    u.uLace.value = smooth(187.3, 199.5, t);
    u.uDawn.value = smooth(105.6, 107.4, t); u.uMove.value = Math.abs(S.rider.v || 0) * Math.min(dt, 1 / 30);
    for (const r of this.rooms) r.update(S.track, S.rider, t);
    const fu = this.floor.mat.uniforms;
    fu.uFog.value.set(P.fog); fu.uFogDensity.value = P.fogDensity; fu.uCam.value.copy(camera.position); fu.uBase.value.set(P.ground ?? 0x0c0a0e); fu.uLine.value.set(P.street ?? 0xff2a3a);
    fu.uSky.value.set(P.skyLight ?? 0x8a8aa8).multiplyScalar((P.hemiK ?? 1.6) * 0.36); fu.uTime.value = time; fu.uBeat.value = S.pulse ?? 0;
    this.floor.update(S.track, S.rider);
    const M = S.town.mats;
    if (M.ptdLedM) { const lu = M.ptdLedM.uniforms; lu.uFogColor.value.set(P.fog); lu.uFogDensity.value = P.fogDensity; lu.uCam.value.copy(camera.position); lu.uBeat.value = S.pulse ?? 0; }
  }
  // the rooms' own lights, and what's in the air: October's leaves, the bubbles in his head
  draw(T) {
    const g = this._g, S = this.S, c = S.course, track = S.track, t = S.rider.t;
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      const st = r.style, lit = roomLit(st, t);
      for (const f of r.fixtures) {
        const fy = floorAt(c, f.t), H = f.H;
        if (st === 3) {
          // the store's strip lights: a row across, cold and a little green
          for (const x of [-24, -12, 0, 12, 24]) { track.ground(f.t, x, g); T.glow(g.x, fy + H - 0.8, g.z, 4.2, [0.85, 1, 0.92], 0.55 * lit); }
          track.ground(f.t, 0, g); T.pool(g.x, fy + 0.15, g.z, 34, [0.85, 1, 0.92], 0.18 * lit);
        } else if (st === 4) {
          for (const x of [-12, 12]) { track.ground(f.t, x, g); T.glow(g.x, fy + H - 1.2, g.z, 7, WARM, 1.1); }
        } else {
          // a bulb on its flex in the middle of the ceiling
          track.ground(f.t, 0, g); T.glow(g.x, fy + H - 4, g.z, st === 1 ? 6 : 4.5, st === 1 ? COLD : WARM, (st === 1 ? 1.2 : 0.9) * lit);
          T.pool(g.x, fy + 0.15, g.z, 30, st === 1 ? COLD : WARM, 0.22 * lit);
        }
      }
    }
    // the store's exit sign, the one light left on
    if (t > 54.0 && t < 59.4) { track.ground(59.2, 0, g); T.glow(g.x, floorAt(c, 59.2) + 27.5, g.z, 14, REDL, 0.4); }
    // October: leaves blowing across the road ahead
    if (t > 86.5 && t < 101.5) {
      const L = T.layers.ptdLeaf, m = T._m, e = T._e;
      const q = this._lq || (this._lq = new THREE.Quaternion());
      for (let j = 0; j < 70; j++) {
        const tt = t + 0.4 + ((j * 0.37) % 7), side = j % 2 ? 1 : -1;
        if (tt < 88.6 || tt > 101) continue;
        const ph = (T.tNow * (0.18 + hash(j) * 0.12) + hash(j * 3.7)) % 1;
        track.ground(tt, side * (28 - 56 * ph), g);
        g.y = floorAt(c, tt) + 2 + 14 * (0.5 + 0.5 * Math.sin(j * 1.7 + ph * 6)) * (1 - ph * 0.6);
        e.set(T.tNow * (2 + j % 3) + j, T.tNow * 1.3 + j * 0.7, T.tNow * (1.5 + (j % 4) * 0.3)); q.setFromEuler(e);
        m.compose(g, q, T._s.set(1.6, 1.6, 1.6)); L.add(m);
      }
    }
    // inside his head: bubbles going up, slowly, and memories lit out in the dark, breathing
    if (t > 156 && t < 186.5) {
      for (let j = 0; j < 64; j++) {
        const tt = t + 0.4 + ((j * 0.53) % 10); if (tt < 158.6 || tt > 185) continue;
        const ph = (T.tNow * (0.06 + hash(j) * 0.05) + hash(j * 2.3)) % 1;
        track.ground(tt, (hash(j * 5.1) - 0.5) * 110, g);
        T.glow(g.x, floorAt(c, tt) + ph * 60, g.z, 2.2 + hash(j) * 2.6, [0.55, 0.78, 1], 0.55 * Math.sin(ph * Math.PI));
      }
      for (let j = 0; j < 26; j++) {
        const tt = 158.8 + j * 1.0; if (tt < t - 2 || tt > t + 40) continue;
        const side = j % 2 ? 1 : -1, br = 0.5 + 0.5 * Math.sin(T.tNow * (0.7 + hash(j) * 0.6) + j);
        track.ground(tt, side * (55 + hash(j * 3.3) * 110), g);
        const y = floorAt(c, tt) + 12 + hash(j * 7.1) * 50, cl = j % 3 === 0 ? CORALL : BLUEL;
        T.glow(g.x, y, g.z, 22 + hash(j) * 20, cl, 0.16 + 0.22 * br); T.glow(g.x, y, g.z, 4, cl, 0.8 * br);
      }
    }
  }
}
