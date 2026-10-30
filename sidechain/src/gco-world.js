// Good Company. Her house on a night he got there first, and his yellow sticky notes on everything he
// did. Her street, four times life size, the neighbours dark; her windows go on all at once when the
// band comes in (he was here before you got home). Her yard: the kennel with the dog's name over the
// door, lit on "your dog's name"; the keypad on her door frame asking her mother's maiden name, the
// tick on "maiden", the door open before you reach it. Her kitchen: May flipping to June on the
// fridge with the fourteenth ringed; the photo of the coast, the 2 and the 3 lit on "23"; the wine he
// brought, with a bow, the glasses filling on "wine". The living room: the mantel filling with
// thank-you cards on "everyone adores me", a present opening on each "gift", and his notes popping
// onto the walls ahead of you, more and more of them, until the back wall is all notes and the
// chorus goes through it. The choruses are her street again: bunting of notes across it, notes in
// the air, every window with one in the corner; on "ask around, they'll all agree" every porch light
// comes on in a wave up the street, and a mug the size of a house says WORLD'S NICEST MAN. In at the
// back for the dinner party he planned: round tables, the seating chart, the place cards (YOU and ME
// at table five), two of them swapped on "who sits with who". The kettle on "the kettle's working",
// whistling; the hall of doors, each slamming shut a beat before you reach it, the rail down the
// middle of it the path of least resistance, his-and-hers towels at the end on "a life you didn't
// choose". Lamps switching on ahead of you on "being needed before you even think to ask"; the bath he
// ran on "relax", the lights down to its candles. The second chorus on the street, out to the bank on
// the corner and into its vault for the bridge: safe-deposit boxes sliding open on the beat, the
// ledger of favours (BALANCE: YOU), the piggy bank swallowing coins from "deposit", the vault door.
// The bass goes out on "no really, don't worry about it", and the last of it is back in her kitchen,
// the kettle on, two mugs, and one more note on the table: ALWAYS.
// The things are in gco-props.js, the course and looks in gco-song.js.

import * as THREE from 'three';
import { extend, glowAt, poolAt, local } from './scenery.js';
import { prepare, floorAt } from './trail.js';
import { Room } from './summer.js';
import { AA_GLSL } from './aa.js';
import { GC, SIDINGS, NOTE_CELL, merge, cellMat, windowMat, noteGeo, notesTexture, lyricTexture, calendarTexture, coastTexture, keypadTexture, nameTexture, cardsTexture, placeTexture, chartTexture, towelTexture, ledgerTexture, mugTexture } from './gco-props.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);
const FACE = (x) => (x > 0 ? Math.PI / 2 + 0.45 : -Math.PI / 2 - 0.45);
const onFloor = (S, it) => { prepare(S.course, S.plan); it.h = floorAt(S.course, it.t); return it; };
const WARM = [1, 0.78, 0.46], LAMPL = [1, 0.84, 0.58], WHITEL = [1, 0.97, 0.92], NOTEL = [1, 0.88, 0.36], GOLDL = [1, 0.74, 0.3], REDL = [1, 0.25, 0.3],
  GREENL = [0.4, 1, 0.55], BLUEL = [0.55, 0.8, 1], FLAME = [1, 0.62, 0.22], PINKL = [1, 0.55, 0.7], STEAM = [0.85, 0.88, 0.92], COOL = [0.75, 0.85, 1];

// ---------- how lit her house is ----------
// her windows from the street are dark until the band comes in; "relax" takes the room down to the
// bath's candles; the bass out in the vault takes it down too
export function houseLit(T) {
  let k = 1;
  if (T > 129.28 && T < 130.79) k = 0.12 + 0.88 * (1 - smooth(129.2, 129.6, T));
  if (T > 182.31 && T < 187.39) k = 0.32 + 0.68 * smooth(186.6, 187.3, T);
  return k;
}
const frontLit = (T) => smooth(8.4, 8.62, T);

// ---------- materials ----------
function selfLit(opts, k = 0.5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: k, ...opts });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb * vColor.rgb;'); };
  return m;
}
const VC = (M, key, k, opts) => M[key] || (M[key] = selfLit(opts, k));
const pic = (M, key, map, k = 0.6, opts = {}) => M[key] || (M[key] = new THREE.MeshStandardMaterial({ map, roughness: 0.6, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: k, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, ...opts }));
let TEX = null;
const tex = () => TEX || (TEX = { notes: notesTexture(), cal: calendarTexture(), coast: coastTexture(), keypad: keypadTexture(), name: nameTexture(), cards: cardsTexture(), place: placeTexture(), chart: chartTexture(), towel: towelTexture(), ledger: ledgerTexture(), mug: mugTexture() });
// the lyric boards' words (the props kit reads them off the plan before the boards' layer is made)
let LYRICS = [];
const paintM = (M) => VC(M, 'gcoPaintM', 0.16, { roughness: 0.6 });
const glossM = (M) => VC(M, 'gcoGlossM', 0.22, { roughness: 0.25, metalness: 0.1 });
const chromeM = (M) => VC(M, 'gcoChromeM', 0.2, { roughness: 0.18, metalness: 0.8 });
const houseM = (M) => VC(M, 'gcoHouseM', 0.1, { roughness: 0.8 });
const glowM = (M) => VC(M, 'gcoGlowM', 1.6, { roughness: 0.5 });
const notesM = (M) => M.gcoNotesM || (M.gcoNotesM = cellMat(tex().notes, 4, 4, 0.3, 0.85));
const KV = { aK: 0 }, CK = { aCell: 0, aK: 0 }, GV = { aK: 0, aSeed: 0 };
const ck = (c, k) => { CK.aCell = c; CK.aK = k; return CK; };
const gv = (k, s) => { GV.aK = k; GV.aSeed = s; return GV; };
const beatK = (c, T, k = 4) => Math.exp(-(((c.beatAt(T) % 1) + 1) % 1) * k);
const NOTEG = noteGeo(0.25, 6);
const KEYS = (p, n) => Array.from({ length: n }, (_, j) => p + j);
const TQ = KEYS('_gctq', 6), MQ = KEYS('_gcmq', 8), CQ = KEYS('_gcco', 2), HOUSES = KEYS('gcoHouse', 6);
const FOGGED = ['gcoNotesM', 'gcoLyrM', 'gcoWinM', 'gcoKeyM', 'gcoCalM', 'gcoCardM', 'gcoPlaceM', 'gcoTowelM'];

// a note stuck somewhere on a thing: put(…) by a caller's local frame, cell from NOTE_CELL
function stick(S, at, yaw, x, y, z, s, cell, k, rx = 0, rz = 0) {
  const w = local(at, yaw, x, y, z, S._o);
  S._e.set(rx, yaw, rz); const q = (S._gcq || (S._gcq = new THREE.Quaternion())).setFromEuler(S._e);
  S._m.compose(w, q, S._s.set(s, s, s)); S.layers.gcoNote.add(S._m, ck(cell, k));
}

// ---------- the pieces, registered ----------
const PROP_LAYERS = {
  kennel: ['gcoKennel', 'gcoName'], keypad: ['gcoKeypad', 'gcoKeyFace'], fridge: ['gcoFridge', 'gcoCal'], sideboard: ['gcoSideboard', 'gcoPhoto', 'gcoCandles'],
  island: ['gcoIsland', 'gcoWine', 'gcoWGlass', 'gcoWineIn'], mantel: ['gcoMantel', 'gcoCard', 'gcoCardFace'], gift: ['gcoGift', 'gcoGiftLid'],
  stove: ['gcoStove', 'gcoKettle'], table: ['gcoTable', 'gcoPlace'], easel: ['gcoEasel', 'gcoChart'], door: ['gcoFrame', 'gcoLeaf'], rail: ['gcoRail', 'gcoTowel'],
  lamp: ['gcoFloorLamp'], armchair: ['gcoArmchair'], tub: ['gcoTub'], boxes: ['gcoBoxes', 'gcoDrawer'], pig: ['gcoPig', 'gcoCoin'], lectern: ['gcoLectern', 'gcoLedger'],
  vault: ['gcoVault'], mug: ['gcoMug', 'gcoMugFace'], note: [], porch: [],
};

extend({
  layers: {
    gcoHouse0: (M) => [GC.house(SIDINGS[0]), houseM(M), 40, {}],
    gcoHouse1: (M) => [GC.house(SIDINGS[1]), houseM(M), 40, {}],
    gcoHouse2: (M) => [GC.house(SIDINGS[2]), houseM(M), 40, {}],
    gcoHouse3: (M) => [GC.house(SIDINGS[3]), houseM(M), 40, {}],
    gcoHouse4: (M) => [GC.house(SIDINGS[4]), houseM(M), 40, {}],
    gcoHouse5: (M) => [GC.house(SIDINGS[5]), houseM(M), 40, {}],
    gcoGlass: (M) => [GC.houseGlass(), M.gcoWinM || (M.gcoWinM = windowMat()), 240, { aK: 1, aSeed: 1 }],
    gcoFence: (M) => [GC.fence(), VC(M, 'gcoFenceM', 0.06, { roughness: 0.8 }), 320, {}],
    gcoLamp: (M) => [GC.lamp(), paintM(M), 120, {}],
    gcoMailbox: (M) => [GC.mailbox(), glossM(M), 120, {}],
    gcoTree: (M) => [GC.tree(), houseM(M), 200, {}],
    gcoNote: (M) => [NOTEG, notesM(M), 700, { aCell: 1, aK: 1 }],
    gcoLine: (M) => [GC.line(), paintM(M), 400, {}],
    gcoStake: (M) => [GC.stake(), paintM(M), 24, {}],
    gcoBoard: (M) => [GC.boardFace(), M.gcoLyrM || (M.gcoLyrM = cellMat(lyricTexture(LYRICS), 4, 4, 0.34, 0.8)), 24, { aCell: 1, aK: 1 }],
    gcoKennel: (M) => [GC.kennel(), paintM(M), 2, {}],
    gcoName: (M) => [GC.nameFace(), pic(M, 'gcoNameM', tex().name, 0.5), 2, {}],
    gcoKeypad: (M) => [GC.keypad(), glossM(M), 2, {}],
    gcoKeyFace: (M) => [GC.keyFace(), M.gcoKeyM || (M.gcoKeyM = cellMat(tex().keypad, 1, 2, 0.4, 1.4, { offset: true })), 2, { aCell: 1, aK: 1 }],
    gcoFridge: (M) => [GC.fridge(), glossM(M), 2, {}],
    gcoCal: (M) => [GC.calFace(), M.gcoCalM || (M.gcoCalM = cellMat(tex().cal, 1, 2, 0.35, 0.7, { offset: true })), 2, { aCell: 1, aK: 1 }],
    gcoSideboard: (M) => [GC.sideboard(), paintM(M), 2, {}],
    gcoPhoto: (M) => [GC.photoFace(), pic(M, 'gcoCoastM', tex().coast, 0.55), 2, {}],
    gcoCandles: (M) => [GC.candles(), glossM(M), 2, {}],
    gcoIsland: (M) => [GC.island(), paintM(M), 2, {}],
    gcoWine: (M) => [GC.wine(), glossM(M), 2, {}],
    gcoWGlass: (M) => [GC.glass(), M.gcoGlassM || (M.gcoGlassM = new THREE.MeshStandardMaterial({ color: 0xeef4ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, emissive: 0x30343c })), 4, {}],
    gcoWineIn: (M) => [GC.wineIn(), M.gcoWineInM || (M.gcoWineInM = new THREE.MeshStandardMaterial({ color: 0x6a0818, roughness: 0.2, emissive: 0x3a0410 })), 4, {}],
    gcoMantel: (M) => [GC.mantel(), paintM(M), 2, {}],
    gcoCard: (M) => [GC.card(), paintM(M), 16, {}],
    gcoCardFace: (M) => [GC.cardFace(), M.gcoCardM || (M.gcoCardM = cellMat(tex().cards, 4, 2, 0.35, 0.8, { offset: true })), 16, { aCell: 1, aK: 1 }],
    gcoGift: (M) => [GC.gift(), glossM(M), 4, {}],
    gcoGiftLid: (M) => [GC.giftLid(), glossM(M), 4, {}],
    gcoStove: (M) => [GC.stove(), glossM(M), 2, {}],
    gcoKettle: (M) => [GC.kettle(), chromeM(M), 3, {}],
    gcoTable: (M) => [GC.table(), paintM(M), 16, {}],
    gcoPlace: (M) => [GC.place(), M.gcoPlaceM || (M.gcoPlaceM = cellMat(tex().place, 8, 1, 0.4, 0.8)), 100, { aCell: 1, aK: 1 }],
    gcoEasel: (M) => [GC.easel(), paintM(M), 2, {}],
    gcoChart: (M) => [GC.chartFace(), pic(M, 'gcoChartM', tex().chart, 0.5), 2, {}],
    gcoFrame: (M) => [GC.doorFrame(), paintM(M), 40, {}],
    gcoLeaf: (M) => [GC.leaf(), paintM(M), 40, {}],
    gcoRail: (M) => [GC.rail(), chromeM(M), 2, {}],
    gcoTowel: (M) => [GC.towelFace(), M.gcoTowelM || (M.gcoTowelM = cellMat(tex().towel, 1, 2, 0.35, 0.8)), 4, { aCell: 1, aK: 1 }],
    gcoFloorLamp: (M) => [GC.floorLamp(), paintM(M), 60, {}],
    gcoArmchair: (M) => [GC.armchair(), paintM(M), 4, {}],
    gcoTub: (M) => [GC.tub(), VC(M, 'gcoTubM', 0.55, { roughness: 0.3, metalness: 0.05 }), 2, {}],
    gcoBoxes: (M) => [GC.boxes(), paintM(M), 40, {}],
    gcoDrawer: (M) => [GC.drawer(), glossM(M), 200, {}],
    gcoPig: (M) => [GC.pig(), glossM(M), 2, {}],
    gcoCoin: (M) => [GC.coin(), VC(M, 'gcoCoinM', 0.5, { roughness: 0.2, metalness: 0.7 }), 40, {}],
    gcoLectern: (M) => [GC.lectern(), paintM(M), 2, {}],
    gcoLedger: (M) => [GC.ledgerFace(), pic(M, 'gcoLedgerM', tex().ledger, 0.5), 2, {}],
    gcoVault: (M) => [GC.vaultDoor(), chromeM(M), 2, {}],
    gcoMug: (M) => [GC.mug(), glossM(M), 3, {}],
    gcoMugFace: (M) => [GC.mugFace(), pic(M, 'gcoMugM', tex().mug, 0.45, { side: THREE.FrontSide }), 3, {}],
  },
  parts: {
    // ---- her street ----
    // a house: its body, its windows lit by how awake the street is (it.on: when its lights came on)
    gcoHouse(S, it, p, q, yaw) {
      const L = S.layers, hl = HOUSES[it.v]; void L[hl]; void L.gcoGlass;
      if (!S.track) return;
      const T = S.tNow ?? 0, m = S._m;
      m.compose(p, q, S._s.set(it.s, it.s, it.s)); L[hl].add(m);
      const on = it.on !== undefined ? smooth(it.on - 0.05, it.on + 0.25, T) : 0;
      const k = clamp((it.base ?? 0.18) + 0.82 * on, 0, 1);
      L.gcoGlass.add(m, gv(k, it.seed));
      // the porch light by its door, and its light on the steps
      const pl = 0.15 + 1.1 * on;
      const w = local(p, yaw, -4.6 * it.s, 10.4 * it.s, 15.9 * it.s, S._o); glowAt(S, w.x, w.y, w.z, 3.2 * it.s, LAMPL, pl);
      if (on > 0.02) { const w2 = local(p, yaw, 0, 3.2 * it.s, 21 * it.s, S._o); poolAt(S, w2.x, 0.2, w2.z, 18 * it.s, WARM, 0.5 * on); }
      if (it.on !== undefined && T > it.on && T < it.on + 0.5) { const w3 = local(p, yaw, -4.6 * it.s, 10.4 * it.s, 16.5 * it.s, S._o); glowAt(S, w3.x, w3.y, w3.z, 10 * it.s, LAMPL, 1.4 * (1 - (T - it.on) / 0.5)); }
    },
    // a length of picket fence, stretched to meet the next
    gcoFence(S, it, p, q) {
      void S.layers.gcoFence;
      if (!S.track) return;
      const b = S._gfb || (S._gfb = new THREE.Vector3());
      S.track.ground(it.t + it.dt, it.x, b);
      const len = Math.hypot(b.x - p.x, b.z - p.z);
      S._o.set((p.x + b.x) / 2, 0, (p.z + b.z) / 2);
      const yaw = Math.atan2(b.x - p.x, b.z - p.z);
      const qq = (S._gfq || (S._gfq = new THREE.Quaternion())).set(0, Math.sin(yaw * 0.5), 0, Math.cos(yaw * 0.5));
      S._m.compose(S._o, qq, S._s.set(1, 1, Math.max(0.2, len / 24))); S.layers.gcoFence.add(S._m);
    },
    gcoLamp(S, it, p, q, yaw) {
      void S.layers.gcoLamp;
      if (!S.track) return;
      S._m.compose(p, q, S._s.set(1, 1, 1)); S.layers.gcoLamp.add(S._m);
      glowAt(S, p.x, 20.3, p.z, 5.5, LAMPL, 1.1); glowAt(S, p.x, 20.3, p.z, 16, LAMPL, 0.16);
      poolAt(S, p.x, 0.15, p.z, 30, LAMPL, 0.55);
    },
    gcoMailbox(S, it, p, q) { void S.layers.gcoMailbox; if (!S.track) return; S._m.compose(p, q, S._s.set(1, 1, 1)); S.layers.gcoMailbox.add(S._m); if (it.note !== undefined) stick(S, p, S.course.yawAt(it.t) + it.rot, 0, 6.4, 2.65, 2.6, it.note, 0.8); },
    gcoTree(S, it, p, q) { void S.layers.gcoTree; if (!S.track) return; S._m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.gcoTree.add(S._m); },
    // the bunting: a line across the street, his notes pegged along it, swinging, flipping on the beat
    gcoBunting(S, it) {
      const L = S.layers; void L.gcoLine; void L.gcoNote;
      if (!S.track) return;
      const T = S.tNow ?? 0, c = S.course, tr = S.track, a = S._gba || (S._gba = new THREE.Vector3()), b = S._gbb || (S._gbb = new THREE.Vector3());
      const W = it.w ?? 30, N = 12, y0 = it.y ?? 30, sag = it.sag ?? 3.2;
      const yaw = c.yawAt(it.t), bf = ((c.beatAt(T) % 1) + 1) % 1, flip = Math.exp(-bf * 5);
      const yAt = (u) => y0 - sag * (1 - u * u);
      const q = S._gbq || (S._gbq = new THREE.Quaternion()), up = S._gbu || (S._gbu = new THREE.Vector3(1, 0, 0)), d = S._gbd || (S._gbd = new THREE.Vector3());
      for (let j = 0; j < N; j++) {
        const u0 = -1 + 2 * j / N, u1 = -1 + 2 * (j + 1) / N;
        tr.ground(it.t, u0 * W, a); a.y = yAt(u0); tr.ground(it.t, u1 * W, b); b.y = yAt(u1);
        const len = a.distanceTo(b); d.subVectors(b, a).normalize(); q.setFromUnitVectors(up, d);
        S._o.addVectors(a, b).multiplyScalar(0.5); S._m.compose(S._o, q, S._s.set(len, 1, 1)); L.gcoLine.add(S._m);
      }
      for (let j = 0; j < 9; j++) {
        const u = -0.86 + 0.215 * j; tr.ground(it.t, u * W, a); a.y = yAt(u) - 1.5;
        const sw = Math.sin(T * 2.1 + j * 1.3 + it.t) * 0.28 + (j % 2 ? 1 : -1) * flip * 0.5;
        S._e.set(sw, yaw + Math.PI + flip * (j % 2 ? 0.6 : -0.6), Math.sin(T * 1.3 + j) * 0.08);
        q.setFromEuler(S._e);
        S._m.compose(a, q, S._s.set(3.0, 3.0, 3.0)); L.gcoNote.add(S._m, ck(it.cells ? it.cells[j % it.cells.length] : 15, 0.75 + 0.35 * flip));
      }
    },
    gcoCandle(S, it, p) {
      if (!S.track) return;
      const T = S.tNow ?? 0, f = 0.82 + 0.18 * Math.sin(T * 12 + it.t * 7), y = (it.h ?? 0) + 1.2;
      glowAt(S, p.x, y, p.z, 1.6 * f, FLAME, 2.0); glowAt(S, p.x, y - 0.4, p.z, 6, FLAME, 0.3);
      poolAt(S, p.x, (it.h ?? 0) + 0.15, p.z, 9, FLAME, 0.55);
    },
    // a lyric: a giant note on a stake, in his hand, turned to her coming (indoors on the floor)
    gcoBoard(S, it, p) {
      const L = S.layers; void L.gcoStake; void L.gcoBoard;
      if (!S.track) return;
      const T = S.tNow ?? 0, c = S.course, yaw = c.yawAt(it.t) + Math.PI + (it.x > 0 ? -0.42 : 0.42);
      p.y = it.floor ? floorAt(c, it.t) : 0;
      const q = (S._gcbq || (S._gcbq = new THREE.Quaternion())).setFromEuler(S._e.set(0, yaw, Math.sin(T * 0.9 + it.t) * 0.015));
      const s = it.s ?? 1, k = 0.7 + 0.3 * houseLit(T);
      S._m.compose(p, q, S._s.set(s, s, s)); L.gcoStake.add(S._m); L.gcoBoard.add(S._m, ck(it.idx - S.atlas.index.LYR0, k));
      const w = local(p, yaw, 0, 23 * s, 5 * s, S._o); glowAt(S, w.x, w.y, w.z, 26 * s, NOTEL, 0.1 * k);
      poolAt(S, p.x, p.y + 0.2, p.z, 22 * s, NOTEL, 0.3 * k);
    },
    // ---- the set-pieces, each where it's sung ----
    gcoProp(S, it, p, q, yaw) {
      const L = S.layers, k = it.kind;
      if (!S.track) { for (const n of PROP_LAYERS[k] || []) void L[n]; void L.gcoNote; return; }
      const T = S.tNow ?? 0, s = it.s ?? 1, m = S._m, c = S.course, lit = houseLit(T);
      const at = S._gcv || (S._gcv = new THREE.Vector3()); at.set(p.x, (it.h ?? 0) + (it.y ?? 0), p.z);
      const quat = (key, ry = 0, rx = 0, rz = 0) => { S._e.set(rx, yaw + ry, rz); return (S[key] || (S[key] = new THREE.Quaternion())).setFromEuler(S._e); };
      const put = (layer, x = 0, y = 0, z = 0, qq = q, sc = s, vals) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); m.compose(w, qq, S._s.set(sc, sc, sc)); return L[layer].add(m, vals); };
      const light = (x, y, z, size, cl, k2) => { const w = local(at, yaw, x * s, y * s, z * s, S._o); glowAt(S, w.x, w.y, w.z, size * s, cl, k2); };
      const spot = (k2, cl = WARM, r = 26) => poolAt(S, at.x, (it.h ?? 0) + 0.2, at.z, r * s, cl, k2);
      const note = (x, y, z, sz, cell, rx = 0, rz = 0) => stick(S, at, yaw, x * s, y * s, z * s, sz * s, cell, 0.55 + 0.45 * lit, rx, rz);
      const on = (t0, d = 0.12) => smooth(t0 - 0.02, t0 + d, T);
      if (k === 'kennel') {
        // the dog's name over its door, lit on "name"
        const n0 = it.name ?? 1e9, nk = on(n0);
        put('gcoKennel'); put('gcoName', 0, 0, 0, q, s);
        light(0, 5.6, 5.8, 4 + 3 * Math.exp(-Math.max(0, T - n0) * 2), REDL, 0.15 + 0.9 * nk);
        note(3.2, 8.6, 3.0, 2.6, NOTE_CELL['FED BISCUIT'], -0.5, 0.15);
        spot(0.3 + 0.3 * nk, WARM, 22);
      } else if (k === 'keypad') {
        // her mother's maiden name asked, and answered: the tick on "maiden"
        const ok = it.ok ?? 1e9, kk = on(ok, 0.05);
        put('gcoKeypad'); put('gcoKeyFace', 0, 0, 0, q, s, ck(kk > 0.5 ? 1 : 0, 0.9));
        light(0, 1.25, 0.8, 3.4, kk > 0.5 ? GREENL : BLUEL, 0.7);
        if (T > ok && T < ok + 0.6) light(0, 1.25, 1.2, 14, GREENL, 1.4 * (1 - (T - ok) / 0.6));
        note(0, -5.2, 0.5, 2.6, NOTE_CELL['LET MYSELF IN'], 0, -0.08);
      } else if (k === 'fridge') {
        // the calendar flips from May to June on "June"
        const f0 = it.flip ?? 1e9, fk = smooth(f0 - 0.15, f0 + 0.05, T);
        put('gcoFridge');
        const fl = Math.abs(1 - 2 * fk), page = fk > 0.5 ? 1 : 0;
        const w = local(at, yaw, 1.6 * s, 12.6 * s, 5.56 * s, S._o); m.compose(w, q, S._s.set(s, s * Math.max(0.05, fl), s)); L.gcoCal.add(m, ck(page, 0.6 + 0.4 * lit));
        note(-3.4, 22.6, 5.7, 3.4, NOTE_CELL["YOU'RE OUT OF MILK"], 0, 0.06);
        note(4.2, 4.6, 5.7, 3.0, NOTE_CELL['TABLE FOR TWO'], 0, -0.1);
        if (T > f0 && T < f0 + 0.7) light(1.6, 12.6, 6.5, 10, REDL, 1.0 * (1 - (T - f0) / 0.7));
        spot(0.4 * lit, WARM, 22);
      } else if (k === 'sideboard') {
        // the photo of the coast; the 2 and the 3 lit on "23"
        const l0 = it.candles ?? 1e9, lk = on(l0, 0.1);
        put('gcoSideboard'); put('gcoPhoto'); put('gcoCandles', 4.2, 9.6, 0.6);
        if (lk > 0) for (const x of [-1.1, 1.0]) { const fl = 0.85 + 0.15 * Math.sin(T * 13 + x * 9); light(4.2 + x, 9.6 + 5.2, 0.6, 1.3 * fl, FLAME, 1.6 * lk); light(4.2 + x, 9.6 + 5.0, 0.6, 5, FLAME, 0.3 * lk); }
        if (T > l0 && T < l0 + 0.5) light(4.2, 14.6, 0.6, 12, FLAME, 1.2 * (1 - (T - l0) / 0.5));
        note(2.6, 18.6, -0.8, 2.6, NOTE_CELL['FRAMED IT FOR YOU'], -0.16, 0.12);
        light(-2.6, 14.5, 3, 16, WARM, 0.14 * lit); spot(0.35 * lit + 0.25 * lk, WARM, 22);
      } else if (k === 'island') {
        // the wine he brought, its bow; two glasses fill on "wine"
        const w0 = it.pour ?? 1e9, wk = smooth(w0 - 0.05, w0 + 0.6, T);
        put('gcoIsland'); put('gcoWine', -3, 9.8, 0, q, s * 0.75);
        for (const x of [3.4, 6.6]) { put('gcoWGlass', x, 9.8, x > 5 ? -1.2 : 1.0, q, s * 0.85); if (wk > 0.01) { const w = local(at, yaw, x * s, (9.8 + 3.0 * 0.85) * s, (x > 5 ? -1.2 : 1.0) * s, S._o); m.compose(w, q, S._s.set(s * 0.85, s * 0.85 * wk, s * 0.85)); L.gcoWineIn.add(m); } }
        note(-3, 14.2, 1.2, 2.4, NOTE_CELL['THE ONE YOU MENTIONED'], 0, 0.1);
        if (T > w0 && T < w0 + 0.5) light(5, 13, 0, 9, REDL, 0.8 * (1 - (T - w0) / 0.5));
        light(0, 22, 0, 18, WARM, 0.12 * lit); spot(0.45 * lit, WARM, 24);
      } else if (k === 'mantel') {
        // everyone adores him: a card on the mantel on every beat from "everyone"
        put('gcoMantel');
        const c0 = it.cards ?? 1e9, spb = 60 / (c.chart.bpm || 106), n = 8;
        for (let j = 0; j < n; j++) {
          const tj = c0 + j * spb * 0.5, u = smooth(tj - 0.02, tj + 0.12, T);
          if (u <= 0.01) continue;
          const x = -10.5 + j * 3.0, bob = 1 + 0.25 * Math.exp(-Math.max(0, T - tj) * 8);
          const qq = quat(MQ[j], (j % 2 ? 0.25 : -0.25));
          put('gcoCard', x, 14.0, 0.6 + (j % 3) * 0.4, qq, s * 0.8 * u * bob); put('gcoCardFace', x, 14.0, 0.6 + (j % 3) * 0.4, qq, s * 0.8 * u * bob, ck(j % 8, 0.55 + 0.45 * lit));
          if (T > tj && T < tj + 0.35) light(x, 17, 2, 4, PINKL, 0.9 * (1 - (T - tj) / 0.35));
        }
        light(0, 4.2, 1.8, 9, FLAME, 0.5 + 0.12 * Math.sin(T * 7)); light(0, 3, 2.5, 3, FLAME, 1.1);
        spot(0.35 * lit, WARM, 26);
      } else if (k === 'gift') {
        // a present with his note on it: the lid comes off on "gift" and the light comes out of it
        const o = it.open ?? 1e9, ok = smooth(o - 0.05, o + 0.25, T);
        put('gcoGift');
        const lq = quat('_gcgl', ok * 0.6, -ok * 0.4, ok * 0.3);
        put('gcoGiftLid', -ok * 4, 7 + ok * 6, ok * 2, lq);
        if (ok > 0) { light(0, 7.5 + 3 * ok, 0, 6 + 8 * ok, NOTEL, 1.4 * ok); light(0, 12 + 10 * ok, 0, 20, NOTEL, 0.25 * ok); }
        note(3.5, 4.2, 4.65, 2.6, NOTE_CELL['NO NEED TO THANK ME'], 0, 0.12);
        spot(0.3 * lit + 0.4 * ok, NOTEL, 20);
      } else if (k === 'stove') {
        // the kettle on the hob; on "kettle's" it whistles, steam out of its spout
        const w0 = it.whistle ?? 1e9, wk = T > w0 ? Math.max(0, 1 - (T - w0) / 1.6) : 0;
        put('gcoStove'); put('gcoKettle', 3.6, 13.8, -2.4, q, s * 0.9);
        note(-4.8, 16.6, -4.3, 2.4, NOTE_CELL['FIXED IT'], 0, 0.08);
        light(3.6, 13.9, -2.4, 4, FLAME, 0.8);
        // steam: always a little, a jet while it whistles
        for (let j = 0; j < 7; j++) {
          const f = ((T * (0.5 + 1.6 * wk) + j / 7) % 1), jet = wk;
          const x = 3.6 + 5.4 * 0.9 + f * (3 + 9 * jet), y = 13.8 + 5.4 * 0.9 + f * (4 + 4 * jet);
          light(x, y, -2.4 + Math.sin(T * 3 + j) * 0.8, (1.2 + f * 3.5) * (1 + jet), STEAM, (0.25 + 0.9 * jet) * (1 - f));
        }
        if (wk > 0) light(3.6 + 5.2, 13.8 + 5.2, -2.4, 6 + 6 * wk, WHITEL, 0.7 * wk);
        spot(0.4 * lit, WARM, 22);
      } else if (k === 'table') {
        // a round table set for the party; at table five, YOU and ME. On "who sits with who" two of
        // the names change places
        put('gcoTable');
        const sw = it.swap ?? 1e9, u = smooth(sw - 0.1, sw + 0.4, T);
        for (let j = 0; j < 6; j++) {
          const a = j / 6 * Math.PI * 2 + 0.52;
          let x = Math.cos(a) * 5.4, z = Math.sin(a) * 5.4, cell = it.special ? (j === 0 ? 6 : j === 3 ? 7 : (j + (it.seed * 8 | 0)) % 6) : (j + (it.seed * 8 | 0)) % 6;
          let y = 9.95;
          if (it.swapper && (j === 1 || j === 4)) {
            const o = j === 1 ? 4 : 1, b2 = o / 6 * Math.PI * 2 + 0.52, x2 = Math.cos(b2) * 5.4, z2 = Math.sin(b2) * 5.4;
            x = x + (x2 - x) * u; z = z + (z2 - z) * u; y += Math.sin(u * Math.PI) * 3.5;
          }
          const qq = quat(TQ[j], -a - Math.PI / 2);
          put('gcoPlace', x, y, z, qq, s * 1.4, ck(cell, 0.6 + 0.4 * lit));
        }
        if (it.swapper && T > sw && T < sw + 0.8) light(0, 13, 0, 9, GOLDL, 0.9 * (1 - (T - sw) / 0.8));
        light(0, 14, 0, 4, FLAME, 0.9);
        spot(0.45 * lit, WARM, 22);
      } else if (k === 'easel') {
        // the seating chart: every seat; its light comes up on "seat"
        const s0 = it.seat ?? 1e9, sk = on(s0, 0.2);
        put('gcoEasel'); put('gcoChart');
        note(4.6, 22.2, 1.0, 2.4, NOTE_CELL['SORTED THE SEATING'], 0, -0.12);
        light(0, 16, 6, 18, WHITEL, 0.15 + 0.35 * sk);
        if (T > s0 && T < s0 + 0.5) light(0, 16, 3, 14, GOLDL, 1.0 * (1 - (T - s0) / 0.5));
        spot((0.3 + 0.4 * sk) * lit, WARM, 24);
      } else if (k === 'door') {
        // a door in the hall, open; it slams shut a beat before you reach it
        put('gcoFrame');
        const sh = it.shut ?? 1e9, u = clamp((T - sh) / 0.16, 0, 1);
        const bounce = T > sh + 0.16 ? 0.06 * Math.exp(-(T - sh - 0.16) * 9) * Math.sin((T - sh) * 40) : 0;
        const ang = -1.35 * (1 - u * u) + bounce;
        put('gcoLeaf', -7, 0, 0.4, quat('_gcdl', ang));
        if (T > sh + 0.12 && T < sh + 0.5) light(0, 13, 1.5, 10, WHITEL, 0.5 * (1 - (T - sh - 0.12) / 0.38));
        if (T < sh) light(0, 13, -2, 9, WARM, 0.35);
      } else if (k === 'rail') {
        // his and hers: the towels; HERS lights on "choose"
        const c0 = it.on ?? 1e9, hk = on(c0, 0.2);
        put('gcoRail');
        put('gcoTowel', -4.6, 0, 0, q, s, ck(0, 0.55 + 0.4 * lit)); put('gcoTowel', 4.6, 0, 0, q, s, ck(1, 0.55 + 0.4 * lit + 0.6 * hk));
        light(4.6, 13, 3, 12, PINKL, 0.1 + 0.5 * hk);
        spot(0.35 * lit, WARM, 22);
      } else if (k === 'lamp') {
        // a floor lamp that switches itself on before you get to it
        const o = it.on ?? -1e9, lk = smooth(o, o + 0.08, T);
        put('gcoFloorLamp');
        light(0, 23.4, 0, 5.5, LAMPL, 0.08 + 1.2 * lk); light(0, 22, 0, 18, LAMPL, 0.22 * lk);
        if (T > o && T < o + 0.3) light(0, 23.4, 0, 12, LAMPL, 1.2 * (1 - (T - o) / 0.3));
        poolAt(S, at.x, (it.h ?? 0) + 0.2, at.z, 26 * s, LAMPL, 0.55 * lk);
      } else if (k === 'armchair') {
        put('gcoArmchair');
        note(0, 19.2, -4.8, 2.6, NOTE_CELL['HAPPY TO HELP'], 0, 0.1);
        for (let j = 0; j < 3; j++) { const f = ((T * 0.4 + j / 3) % 1); light(9.6 + Math.sin(T + j) * 0.3, 8.4 + f * 4, 2, 0.8 + f, STEAM, 0.35 * (1 - f)); }
        spot(0.4 * lit, WARM, 22);
      } else if (k === 'tub') {
        // the bath he ran, its candles: what's left on "relax"
        put('gcoTub');
        for (const [x, z, h] of [[-13, 6.8, 3], [-10.6, 8.2, 2.2], [12, 7.2, 3.4], [14, 5.4, 2.4], [0, 9.6, 2.8]]) { const f = 0.85 + 0.15 * Math.sin(T * 11 + x); light(x, h + 0.7, z, 1.8 * f, FLAME, 2.2); light(x, h + 0.5, z, 8, FLAME, 0.35); }
        note(0, 12.4, -6.4, 2.8, NOTE_CELL.RELAX, 0, 0.06);
        light(0, 8, 0, 30, FLAME, 0.12); spot(0.9, FLAME, 34);
      } else if (k === 'boxes') {
        // a pillar of safe-deposit boxes; drawers slide out on the beat, gold inside
        put('gcoBoxes');
        const bi = Math.floor(c.beatAt(T)), bf = c.beatAt(T) - bi;
        for (let r = 0; r < 8; r++) for (let cc = 0; cc < 4; cc++) {
          const h0 = hash(r * 7.1 + cc * 3.3 + it.seed * 91);
          const pulse = hash(bi * 1.7 + r * 3.1 + cc * 5.3 + it.seed * 13) > 0.86 ? Math.exp(-bf * 3.5) : 0;
          const open = (h0 > 0.82 ? 1 : 0) * smooth(it.t - 2.5, it.t - 1.2, T) + pulse;
          if (open < 0.02) continue;
          const x = -5.1 + cc * 3.4, y = 2.4 + r * 3.6;
          put('gcoDrawer', x, y, 3.1 + 2.6 * Math.min(1, open));
          light(x, y, 3.6, 2.6, GOLDL, 0.9 * Math.min(1, open));
        }
        spot(0.4 * lit, GOLDL, 18);
      } else if (k === 'pig') {
        // the piggy bank: from "deposit", a coin into its slot on every beat; on "mine" it glows
        put('gcoPig');
        const d0 = it.coins ?? 1e9, m0 = it.mine ?? 1e9;
        if (T > d0 - 0.6) {
          const bf = ((c.beatAt(T) % 1) + 1) % 1;
          for (let j = 0; j < 2; j++) { const f = (bf + j * 0.5) % 1, y = 40 - 20.6 * f * f; if (y > 19.8) put('gcoCoin', 0, y, 0, quat(CQ[j], T * 4 + j, 0, Math.PI / 2), s * 1.2); }
          light(0, 20, 0, 4 + 3 * Math.exp(-bf * 6), GOLDL, 0.8);
        }
        const mk = T > m0 ? Math.exp(-(T - m0) * 0.9) : 0;
        light(0, 11, 0, 26, PINKL, 0.15 + 0.9 * mk); light(0, 22, 0, 8, GOLDL, 0.2 + 1.2 * mk);
        spot(0.5 * lit + 0.4 * mk, GOLDL, 30);
      } else if (k === 'lectern') {
        // the ledger: what every favour cost
        put('gcoLectern'); put('gcoLedger');
        light(0, 26, 4, 14, WHITEL, 0.3 * lit); spot(0.5 * lit, WHITEL, 22);
      } else if (k === 'vault') {
        // the vault door, swung open beside the way in
        put('gcoVault', 0, 20, 0, quat('_gcvd', it.open ?? -1.2));
        light(0, 20, 6, 30, COOL, 0.12);
      } else if (k === 'mug') {
        // WORLD'S NICEST MAN, as tall as a house, steaming
        put('gcoMug'); put('gcoMugFace');
        for (let j = 0; j < 8; j++) { const f = ((T * 0.22 + j / 8) % 1); light(Math.sin(T * 0.7 + j * 2) * 4, 32 + f * 24, Math.cos(T * 0.6 + j) * 3, (3 + f * 8), STEAM, 0.35 * (1 - f)); }
        light(0, 15, 16, 40, WARM, 0.12); spot(0.5, WARM, 46);
      } else if (k === 'porch') {
        // the lanterns either side of her door: dark, then on all at once with the band (he's home)
        const fk = frontLit(T), burst = T > 8.53 && T < 9.6 ? 1 - (T - 8.53) / 1.07 : 0;
        for (const x of [-17, 17]) { light(x, 0, 0, 3.6, LAMPL, 0.06 + 1.6 * fk); light(x, 0, 0, 14, LAMPL, 0.25 * fk + 0.8 * burst); }
        light(0, 6, 0, 46, WARM, 0.12 * fk + 0.6 * burst);
        poolAt(S, at.x, (it.h ?? 0) - (it.y ?? 0) + 0.2, at.z, 60, WARM, 0.5 * fk);
      } else if (k === 'note') {
        note(0, 0, 0, it.size ?? 3, it.cell ?? 15, it.rx ?? 0, it.rz ?? 0);
      }
    },
  },
  kits: {
    // the set-pieces; those indoors stand on the room's floor. (And the lyric boards' words, read off
    // the plan here before their layer is made.)
    gcoProps(S, z) {
      LYRICS = (S.plan.lyrics || []).map((l) => l.text);
      for (const a of z.at) {
        const it = { ...a, parts: 'gcoProp', rot: a.rot ?? (a.x === 0 ? 0 : FACE(a.x)), s: a.s ?? 1, seed: a.seed ?? hash(a.t * 3.7) };
        if (a.floor) onFloor(S, it);
        S.items.push(it);
      }
    },
    // her street: houses both sides facing it, their fences and mailboxes, lamps, trees; `wave`: the
    // time the porch lights start coming on up the street (on before it if `lit`)
    gcoStreet(S, z, R) {
      let k = 0;
      for (const side of [-1, 1]) {
        for (let t = z.from + (side > 0 ? 0.55 : 0); t < z.to; t += (z.every ?? 1.6) + R() * 0.35) {
          if ((z.clear || []).some(([a, b]) => t > a && t < b)) continue;
          const x = side * (z.x ?? 76) + side * R() * 12;
          let on;
          if (z.wave !== undefined) on = t < z.wave ? undefined : z.wave + (t - z.wave) * (z.waveRate ?? 0.18) + R() * 0.12;
          if (z.lit) on = -1e9;
          S.items.push({ t, x, rot: SIDE(side), s: 1, v: k++ % 6, seed: R(), on, base: z.base ?? 0.12, parts: 'gcoHouse' });
          // a tree in the gap before the next house, another out back
          if (R() < 0.8) S.items.push({ t: t + 0.75 + R() * 0.2, x: side * ((z.x ?? 76) - 14 + R() * 10), s: 1.1 + R() * 0.4, rot: R() * 6, parts: 'gcoTree' });
          if (R() < 0.6) S.items.push({ t: t + 0.2 + R() * 0.2, x: side * (z.x ?? 76) + side * (34 + R() * 30), s: 1 + R() * 0.4, rot: R() * 6, parts: 'gcoTree' });
          if (!z.bare) S.items.push({ t: t + 0.22, x: side * 27.5, rot: SIDE(side), parts: 'gcoMailbox' });
        }
        if (z.bare) continue;
        for (let t = z.from; t < z.to; t += 0.62) S.items.push({ t, dt: 0.62, x: side * 30, rot: 0, parts: 'gcoFence' });
        for (let t = z.from + (side > 0 ? 0.35 : 0); t < z.to; t += z.lampEvery ?? 0.7) S.items.push({ t, x: side * 21, rot: SIDE(side), parts: 'gcoLamp' });
      }
    },
    // the bunting across the street
    gcoBunting(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.8) S.items.push({ t, x: 0, w: z.w ?? 32, y: z.y ?? 30, sag: 2.6 + R() * 1.4, ahead: z.ahead ?? 16, cells: [15, 15, 15, Math.floor(R() * 15), 15, 15, 15, Math.floor(R() * 15), 15], parts: 'gcoBunting' }); },
    // the hall of doors, both walls, each slamming shut `lead` before she gets to it
    gcoDoors(S, z) {
      const c = S.course;
      for (let b = c.nearestBeatIndex(z.from); c.beats[b] < z.to; b++) {
        const t = c.beats[b] + (z.lead ?? 0.55), side = b % 2 ? 1 : -1;
        S.items.push(onFloor(S, { t, x: side * (z.x ?? 28.6), rot: SIDE(side), s: 1, kind: 'door', shut: c.beats[b], parts: 'gcoProp' }));
      }
    },
    // floor lamps along the room that switch on before she gets to them
    gcoLamps(S, z) {
      const c = S.course;
      for (let b = c.nearestBeatIndex(z.from); c.beats[b] < z.to; b++) for (const side of [-1, 1]) {
        if ((b + (side > 0 ? 1 : 0)) % 2) continue;
        const t = c.beats[b] + (side > 0 ? 0.28 : 0);
        S.items.push(onFloor(S, { t, x: side * (z.x ?? 27), rot: 0, s: 1, kind: 'lamp', on: t - (z.lead ?? 1.5), parts: 'gcoProp' }));
      }
    },
    // the party's round tables, both sides
    gcoTables(S, z, R) { let j = 0; for (let t = z.from; t < z.to; t += z.every ?? 0.75) for (const side of [-1, 1]) { const it = onFloor(S, { t: t + (side > 0 ? 0.35 : 0), x: side * ((z.x ?? 28) + R() * 3), rot: R() * 6, s: 1, kind: 'table', seed: R(), parts: 'gcoProp' }); if (z.special !== undefined && Math.abs(it.t - z.special) < 0.4 && side < 0) { it.special = true; it.swapper = true; it.swap = z.swap; } S.items.push(it); j++; } },
    // candles along both sides of the floor
    gcoCandles(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.16) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + R() * 0.06, x: side * ((z.x ?? 13) + R() * 3), parts: 'gcoCandle' })); },
    // safe-deposit pillars along the vault
    gcoBoxes(S, z, R) { for (let t = z.from; t < z.to; t += z.every ?? 0.6) for (const side of [-1, 1]) S.items.push(onFloor(S, { t: t + (side > 0 ? 0.3 : 0), x: side * ((z.x ?? 30) + R() * 2), rot: SIDE(side), s: 1, kind: 'boxes', seed: R(), parts: 'gcoProp' })); },
  },
});

// ---------- her house, the bank: their rooms ----------
const RINGS = {
  box: (W = 40, H = 30) => [[-W, H, 1, 1], [-W, 0, 1, 1], [-W, 0, 1, 0], [-W * 0.5, 0, 1, 0], [0, 0, 1, 0], [W * 0.5, 0, 1, 0], [W, 0, 1, 0], [W, 0, 1, 2], [W, H, 1, 2], [W, H, 1, 3], [W * 0.5, H, 1, 3], [0, H, 1, 3], [-W * 0.5, H, 1, 3], [-W, H, 1, 3]],
};
const HOUSE = {
  rings: RINGS,
  ringOf: () => 'box',
  styles: { home: 0, kitchen: 1, dining: 2, hall: 3, bath: 4, vault: 5 },
  dims: { home: [40, 32], kitchen: [38, 30], dining: [44, 32], hall: [30, 28], bath: [34, 26], vault: [42, 36] },
  lights: (id) => (id === 0 ? [26, 8] : id === 1 ? [22, 6] : id === 2 ? [30, 10] : id === 3 ? [18, 4] : id === 4 ? [24, 8] : [20, 6]),
};

function roomMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStyle: { value: 0 }, uTime: { value: 0 }, uT: { value: 0 }, uDist: { value: 0 }, uFogDensity: { value: 0.002 }, uFog: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() },
      uLight: { value: new THREE.Color(1, 1, 1) }, uLit: { value: 1 }, uFront: { value: 0 }, uBeat: { value: 0 }, uMove: { value: 0 }, uGold: { value: 0 },
      uNoteRamp: { value: new THREE.Vector4(1e5, 1e5, 0.1, 0.1) }, uNote2: { value: new THREE.Vector3(1e5, 1e5, 0.1) },
    },
    vertexShader: /* glsl */`
      attribute float aPart; attribute vec3 aCoord; attribute float aT;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      void main(){ vPart = aPart; vC = aCoord; vT = aT; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
    fragmentShader: /* glsl */`
      uniform float uStyle, uTime, uT, uDist, uFogDensity, uLit, uFront, uBeat, uMove, uGold; uniform vec3 uFog, uCam, uLight, uNote2; uniform vec4 uNoteRamp;
      varying float vPart; varying vec3 vC; varying vec3 vW; varying float vT;
      ${AA_GLSL}
      float h1(float n){ return fract(sin(n * 127.1 + 3.7) * 43758.5453); }
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
      float covP(float d, float w){ return clamp(d / max(w, 1e-4) + 0.5, 0.0, 1.0); }
      float boxD(vec2 p, vec2 a, vec2 b){ return min(min(p.x - a.x, b.x - p.x), min(p.y - a.y, b.y - p.y)); }
      const vec3 NOTE = vec3(1.0, 0.86, 0.3), INK = vec3(0.1, 0.13, 0.3), CREAM = vec3(0.93, 0.89, 0.8), WHITE = vec3(0.95, 0.94, 0.9), SAGE = vec3(0.47, 0.6, 0.5), GOLD = vec3(0.9, 0.7, 0.3), WINE = vec3(0.36, 0.06, 0.11);
      // his notes stuck on a wall: one a cell where the hash says, popping on as she comes within a
      // few seconds of it; settling to their average tone once they're smaller than a few pixels
      vec3 wallNotes(vec3 col, float a2, float h, float side, float dens, float lo, float hi, inout vec3 glow){
        if (h < lo || h > hi || dens <= 0.0) return col;
        vec2 cs = vec2(6.0, 5.0);
        vec2 cid = floor(vec2(a2, h) / cs);
        float r = h2(cid + side * 7.13);
        if (r > dens) return col;
        float ahead = (cid.x + 0.5) * cs.x - uDist;
        float lead = 30.0 + 140.0 * h2(cid + 3.3);
        float on = clamp((lead - ahead) / 5.0, 0.0, 1.0);
        if (on <= 0.0) return col;
        vec2 f = vec2(a2, h) - (cid + 0.5) * cs - (vec2(h2(cid + 1.1), h2(cid + 2.2)) - 0.5) * vec2(2.4, 1.6);
        float a = (h2(cid + 4.4) - 0.5) * 0.5; float ca = cos(a), sa = sin(a);
        vec2 q = vec2(ca * f.x - sa * f.y, sa * f.x + ca * f.y) / (1.7 * (0.6 + 0.4 * on));
        float px = max(fwidth(a2), fwidth(h)) * 1.2 / 1.7;
        float body = covP(1.0 - max(abs(q.x), abs(q.y)), px);
        float tiny = smoothstep(0.08, 0.3, px);
        float lines = aaPulse(q.y * 2.6 + 0.4, 0.22) * step(abs(q.x), 0.7) * step(q.y, 0.5) * step(-0.65, q.y) * (1.0 - tiny);
        vec3 nc = mix(NOTE, NOTE * 0.82, smoothstep(0.55, 1.0, q.y)) * (1.0 - 0.1 * smoothstep(-0.4, -1.0, q.y));
        nc = mix(nc, INK, lines * 0.8);
        glow += NOTE * body * 0.1 * on;
        return mix(col, nc, body);
      }
      // a few everywhere; more and more through the first pre-chorus (and gone again after it); a patch
      float noteDens(float t){
        if (t > uNoteRamp.x && t < uNoteRamp.y + 1.2) return mix(uNoteRamp.z, uNoteRamp.w, smoothstep(uNoteRamp.x, uNoteRamp.y, t));
        if (t > uNote2.x && t < uNote2.y) return uNote2.z;
        return uNoteRamp.z;
      }
      // a lit sash window seen from outside: the warm room, the curtains, his note in the corner
      vec4 window(vec2 p, vec2 a, vec2 b, float lit, inout vec3 glow, float w){
        float inW = covP(boxD(p, a, b), w);
        if (inW <= 0.0) return vec4(0.0);
        vec2 u = (p - a) / (b - a);
        float cur = covP(0.22 - u.x, w / (b.x - a.x)) + covP(u.x - 0.78, w / (b.x - a.x));
        vec3 room = vec3(1.0, 0.76, 0.42) * (0.7 + 0.4 * u.y) * (1.0 - 0.4 * cur);
        vec3 c = mix(vec3(0.05, 0.06, 0.1), room * 0.5, lit);
        glow += room * lit * 1.6 * inW;
        float mull = max(1.0 - covP(abs(u.x - 0.5) * (b.x - a.x) - 0.35, w), 1.0 - covP(abs(u.y - 0.52) * (b.y - a.y) - 0.35, w));
        c = mix(c, WHITE * (0.5 + 0.4 * lit), mull);
        vec2 nq = (u - vec2(0.7, 0.74)) / vec2(0.12, 0.1);
        float note = covP(1.0 - max(abs(nq.x), abs(nq.y)), w * 8.0 / (b.x - a.x));
        c = mix(c, NOTE * (0.5 + 0.8 * lit), note); glow += NOTE * note * 0.4 * lit * inW;
        return vec4(c, inW);
      }
      void main(){
        int part = int(vPart + 0.5); int st = int(uStyle + 0.5);
        float x = vC.x, h = vC.y, along = vC.z, ax = abs(x);
        vec3 col = vec3(0.0), glow = vec3(0.0);
        float lit = 0.08 + 0.92 * uLit;
        float wpx = max(fwidth(h), fwidth(along)) * 1.2;
        if (part == 7) {
          float w = fwidth(x) * 1.2 + fwidth(h) * 0.6;
          if (st == 5) {
            // ---- the bank on the corner: limestone, its columns, the pediment, the vault door's ring ----
            float top = 66.0 + (60.0 - min(ax, 60.0)) * 0.42;
            if (h > top || ax > 96.0) discard;
            col = vec3(0.6, 0.55, 0.48) * (0.86 + 0.14 * n2(vec2(x, h) * 0.3));
            col *= 1.0 - 0.22 * clamp(aaPulse(h / 3.2, 0.06) + aaPulse((x + 0.5 * floor(h / 3.2)) / 7.0, 0.03), 0.0, 1.0);
            float cx = mod(ax - 20.0, 16.0) - 8.0;
            float colm = covP(2.6 - abs(cx), w) * step(20.0, ax) * step(ax, 84.0) * step(h, 52.0) * step(6.0, h);
            col = mix(col, vec3(0.3, 0.27, 0.24), covP(4.6 - abs(cx), w) * (1.0 - colm) * step(20.0, ax) * step(ax, 84.0) * step(h, 52.0) * step(6.0, h));
            col = mix(col, vec3(0.95, 0.92, 0.84) * (0.75 + 0.25 * cos(cx * 1.1)), colm);
            glow += vec3(1.0, 0.82, 0.5) * colm * exp(-h / 18.0) * 0.12;
            col = mix(col, vec3(0.62, 0.58, 0.52), aaBand(h, 53.0, 1.2) + aaBand(h, 64.0, 0.8));
            float ring = abs(length(vec2(x, h - 22.0)) - 25.0);
            col = mix(col, vec3(0.55, 0.57, 0.6), covP(2.2 - ring, w)); glow += GOLD * exp(-ring * ring / 3.0) * 0.5;
            col *= 0.7; glow += GOLD * smoothstep(40.0, 0.0, h) * 0.04;
          } else {
            // ---- her house from outside: clapboard, the porch, the gable, every window lit with his
            // note in the corner (front when the kitchen starts here, back at the dining room) ----
            float back = st == 2 ? 1.0 : 0.0;
            float eave = 44.0, peak = 66.0;
            float roofH = eave + (peak - eave) * clamp(1.0 - ax / 64.0, 0.0, 1.0);
            if (ax > 66.0 || h > roofH + 1.6) discard;
            float roofLine = covP(roofH - h, w);
            // the siding, its boards
            vec3 sid = mix(vec3(0.62, 0.72, 0.8), vec3(0.86, 0.8, 0.66), back);
            col = sid * (0.86 + 0.14 * aaPulse(h / 2.2, 0.85));
            col *= 1.0 - 0.25 * aaPulse(h / 2.2 + 0.08, 0.08);
            // the stone under it, the corner boards
            col = mix(col, vec3(0.42, 0.38, 0.36) * (0.85 + 0.15 * n2(vec2(x, h))), step(h, 6.0));
            col = mix(col, WHITE, covP(1.4 - abs(ax - 62.0), w));
            // the porch roof across the front, its fascia, the columns
            float pr = covP(1.4 - abs(h - 38.0), w); col = mix(col, WHITE * 0.95, pr);
            col = mix(col, vec3(0.2, 0.18, 0.22), covP(1.0 - abs(h - 40.2), w) * step(ax, 50.0));
            float pc = covP(1.1 - abs(mod(ax - 17.0, 16.0) - 8.0), w) * step(16.0, ax) * step(ax, 50.0) * step(h, 37.0) * step(6.0, h);
            col = mix(col, WHITE, pc);
            // the windows, ground floor each side of the door and in the gable
            vec4 wc = window(vec2(ax, h), vec2(24.0, 14.0), vec2(36.0, 31.0), uFront, glow, w); col = mix(col, wc.rgb, wc.a);
            vec4 wd = window(vec2(ax, h), vec2(42.0, 14.0), vec2(52.0, 31.0), uFront, glow, w); col = mix(col, wd.rgb, wd.a);
            vec4 wg = window(vec2(x, h), vec2(-6.0, 46.0), vec2(6.0, 57.0), uFront, glow, w); col = mix(col, wg.rgb, wg.a);
            // the roof: its shingles, its edge
            vec3 roof = vec3(0.2, 0.18, 0.23) * (0.85 + 0.15 * aaPulse(h / 1.6, 0.5));
            col = mix(col, roof, (1.0 - roofLine) * step(eave, h));
            col = mix(col, WHITE * 0.9, covP(0.8 - abs(h - roofH), w) * step(eave - 1.0, h));
            col *= 0.62;
            // the light from inside on the porch boards
            glow += vec3(1.0, 0.76, 0.42) * uFront * exp(-pow((h - 8.0) / 6.0, 2.0)) * exp(-ax * ax / 900.0) * 0.18;
          }
        } else if (part == 8) {
          col = st == 5 ? vec3(0.6, 0.48, 0.24) : WHITE * 0.9; glow += (st == 5 ? GOLD : WHITE) * 0.05;
        } else if (st == 0 || st == 3) {
          // ---- the living room, the hall: oak boards, a rug down the middle, a wainscot, the paper ----
          if (part == 0) {
            vec2 pl = vec2(x / 2.0, along / 12.0 + 0.37 * floor(x / 2.0));
            col = vec3(0.5, 0.33, 0.18) * (0.82 + 0.25 * h2(floor(pl))) * (1.0 - 0.18 * aaPulse(x / 2.0, 0.05));
            float rw = st == 3 ? 9.0 : 17.0;
            float rug = covP(rw - ax, fwidth(x) * 1.2);
            vec3 rc = st == 3 ? vec3(0.42, 0.08, 0.1) : vec3(0.16, 0.3, 0.24);
            rc *= 0.9 + 0.1 * aaChk(vec2(x, along) / 3.0);
            rc = mix(rc, CREAM * 0.8, aaBand(ax, rw - 1.6, 0.5));
            col = mix(col, rc, rug);
            glow += vec3(1.0, 0.8, 0.5) * exp(-pow(mod(along, 26.0) - 13.0, 2.0) / 30.0) * exp(-x * x / 500.0) * 0.08 * lit;
          } else if (part == 3) {
            col = WHITE * 0.9 * (1.0 - 0.1 * aaBand(mod(along, 26.0), 13.0, 3.0));
          } else {
            float a2 = part == 6 ? x : along, side = part == 2 ? 1.0 : 0.0;
            if (st == 3) {
              // the hall: sage and cream stripes, blurred by as far as she goes in a frame
              float sw = 2.4, f = a2 / sw;
              float blur = max(fwidth(f) * 1.7, uMove * 1.2 / sw);
              float s2 = clamp((aaSqI(f + 0.5 * blur) - aaSqI(f - 0.5 * blur)) / max(blur, 1e-4), 0.0, 1.0);
              col = mix(CREAM, SAGE * 1.1, s2 * 0.75);
            } else {
              col = CREAM * (0.94 + 0.06 * n2(vec2(a2, h) * 0.3));
              col = mix(col, SAGE * 1.05, 0.25 * aaChk(vec2(a2 / 1.5 + h / 1.5, h / 1.5 - a2 / 1.5)) * (1.0 - smoothstep(0.1, 0.4, max(fwidth(a2), fwidth(h)))) + 0.06);
            }
            if (h < 8.0) { float pan = aaPulse(a2 / 7.0, 0.04) + aaPulse(h / 7.0 + 0.1, 0.06); col = WHITE * (0.88 - 0.12 * clamp(pan, 0.0, 1.0)); }
            col = mix(col, WHITE, aaBand(h, 8.2, 0.4) + aaBand(h, 29.0, 0.6));
            col = wallNotes(col, a2, h, side, noteDens(vT), 9.5, 27.0, glow);
          }
        } else if (st == 1) {
          // ---- the kitchen: black and white tiles, sage cabinets, subway tile, brass knobs ----
          if (part == 0) {
            col = mix(vec3(0.9, 0.88, 0.84), vec3(0.08, 0.08, 0.1), aaChkM(vec2(x, along) / 6.0, vec2(0.0, uMove * 0.6 / 6.0)));
            glow += vec3(1.0, 0.86, 0.6) * exp(-pow(mod(along, 22.0) - 11.0, 2.0) / 20.0) * exp(-x * x / 400.0) * 0.06 * lit;
          } else if (part == 3) {
            col = WHITE * 0.9;
          } else {
            float a2 = part == 6 ? x : along, side = part == 2 ? 1.0 : 0.0;
            if (h < 10.0) {
              float d = mod(a2, 6.5) - 3.25;
              col = SAGE * (0.95 - 0.2 * aaBand(d, 3.25, 0.18) - 0.1 * clamp(aaBand(h, 1.0, 0.6), 0.0, 1.0));
              col = mix(col, GOLD, covP(0.35 - length(vec2(d - 2.2, h - 7.6)), wpx) * (1.0 - smoothstep(0.2, 0.5, wpx)));
            } else if (h < 11.0) col = vec3(0.92, 0.9, 0.86);
            else if (h < 21.0) {
              vec2 tq = vec2((a2 + 0.5 * mod(floor(h / 1.2), 2.0) * 2.4) / 2.4, h / 1.2);
              col = WHITE * (1.0 - 0.22 * clamp(aaPulse(tq.x, 0.05) + aaPulse(tq.y, 0.07), 0.0, 1.0));
              col = wallNotes(col, a2, h, side, noteDens(vT), 12.0, 20.0, glow);
            } else {
              float d = mod(a2, 6.5) - 3.25;
              col = SAGE * (1.0 - 0.2 * aaBand(d, 3.25, 0.18)) * (1.0 - 0.12 * aaBand(h, 21.4, 0.4));
            }
          }
        } else if (st == 2) {
          // ---- the dining room: dark boards, wine-red damask, a dark wood wainscot, gilt ----
          if (part == 0) {
            vec2 pl = vec2(x / 1.6, along / 9.0 + 0.41 * floor(x / 1.6));
            col = vec3(0.24, 0.13, 0.07) * (0.8 + 0.3 * h2(floor(pl))) * (1.0 - 0.2 * aaPulse(x / 1.6, 0.05));
            glow += vec3(1.0, 0.8, 0.5) * exp(-pow(mod(along, 30.0) - 15.0, 2.0) / 40.0) * exp(-x * x / 600.0) * 0.07 * lit;
          } else if (part == 3) {
            col = vec3(0.25, 0.1, 0.12);
          } else {
            float a2 = part == 6 ? x : along;
            vec2 dq = vec2(a2 / 3.0 + h / 4.0, h / 4.0 - a2 / 3.0);
            float fine = smoothstep(0.1, 0.35, max(fwidth(dq.x), fwidth(dq.y)));
            col = WINE * (1.0 + 0.35 * (1.0 - fine) * (aaPulse(dq.x, 0.1) + aaPulse(dq.y, 0.1)) + 0.1 * fine);
            if (h < 9.0) col = vec3(0.2, 0.11, 0.06) * (1.0 - 0.15 * clamp(aaPulse(a2 / 6.0, 0.05) + aaPulse(h / 4.5, 0.08), 0.0, 1.0));
            col = mix(col, GOLD, aaBand(h, 9.2, 0.35) + aaBand(h, 29.5, 0.5));
          }
        } else if (st == 4) {
          // ---- the bathroom: pink tile to the dado, pale blue over it ----
          if (part == 0) col = mix(vec3(0.92, 0.9, 0.88), vec3(0.72, 0.78, 0.84), aaChk(vec2(x, along) / 1.8) * 0.5);
          else if (part == 3) col = WHITE * 0.9;
          else {
            float a2 = part == 6 ? x : along;
            if (h < 13.0) col = vec3(0.94, 0.72, 0.76) * (1.0 - 0.2 * clamp(aaPulse(a2 / 2.0, 0.06) + aaPulse(h / 2.0, 0.06), 0.0, 1.0));
            else col = vec3(0.7, 0.82, 0.9);
            col = mix(col, WHITE, aaBand(h, 13.2, 0.35));
          }
        } else {
          // ---- the vault: marble and brass, safe-deposit boxes floor to ceiling, opening on the beat ----
          if (part == 0) {
            col = mix(vec3(0.86, 0.84, 0.8), vec3(0.08, 0.08, 0.1), aaChkM(vec2(x, along) / 8.0, vec2(0.0, uMove * 0.6 / 8.0)));
            col = mix(col, GOLD, clamp(aaBand(ax, 12.0, 0.25) + aaBand(ax, 13.0, 0.12), 0.0, 1.0));
            glow += GOLD * (0.05 + 0.25 * uGold) * exp(-x * x / 300.0);
          } else if (part == 3) {
            vec2 cf = vec2(x / 10.0, along / 10.0);
            col = vec3(0.3, 0.31, 0.34) * (1.0 - 0.3 * clamp(aaPulse(cf.x, 0.08) + aaPulse(cf.y, 0.08), 0.0, 1.0));
            float dl = length(fract(cf) - 0.5) * 10.0;
            glow += vec3(1.0, 0.92, 0.75) * smoothstep(1.4, 0.6, dl) * 1.2 * lit;
          } else {
            float a2 = part == 6 ? x : along;
            vec2 cell = vec2(3.6, 3.4);
            vec2 id = floor(vec2(a2, h) / cell), f = vec2(a2, h) - (id + 0.5) * cell;
            float fine = smoothstep(0.12, 0.4, max(fwidth(a2 / cell.x), uMove * 1.2 / cell.x));
            float doorD = covP(1.0 - max(abs(f.x) / 1.55, abs(f.y) / 1.45), wpx / 1.5);
            vec3 brass = vec3(0.62, 0.48, 0.24) * (0.85 + 0.25 * h2(id));
            col = mix(vec3(0.3, 0.31, 0.33), brass, mix(doorD, 0.75, fine));
            float key = covP(0.18 - length(f - vec2(0.0, -0.4)), wpx) * (1.0 - fine);
            col = mix(col, vec3(0.05), key);
            float plate = covP(0.12 - abs(f.y - 0.8), wpx) * step(abs(f.x), 0.6) * (1.0 - fine);
            col = mix(col, vec3(0.95, 0.85, 0.6), plate);
            // a box lit from inside now and then, on the beat
            float bt = floor(uTime * 1.766 + h2(id) * 3.0);
            float pop = step(0.93, h2(id + bt * 0.37)) * uBeat;
            glow += GOLD * (pop * 1.6 + uGold * 0.3 * step(0.7, h2(id + 9.0))) * mix(doorD, 0.5, fine);
            if (h < 2.4) col = vec3(0.25, 0.25, 0.28);
          }
        }
        if (part != 7) col *= uLight * lit;
        // lamplight: the walls darker up toward the ceiling, the ceiling darker still
        if (part == 1 || part == 2 || part == 6) col *= 0.5 + 0.5 * (1.0 - smoothstep(6.0, 30.0, h));
        if (part == 3 && st != 5) col *= 0.42;
        col += glow;
        float d = length(uCam - vW);
        float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
        gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------- her street's ground: the road, the curb, the sidewalk, the lawns, the drives ----------
// Laid along the course at fixed song times (rows don't slide with her) for one outdoor stretch.
class Yard {
  constructor(scene, course, span, P) {
    this.span = span; this.course = course;
    const N = 140, M = 2; this.N = N;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * (M + 1) * 3); this.uv = new Float32Array(N * (M + 1) * 2);
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + 1, c = a + M + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    this.geo = g; this.W = 150;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uFog: { value: new THREE.Color(P.fog) }, uFogDensity: { value: P.fogDensity }, uCam: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) }, uMove: { value: 0 }, uW: { value: this.W } },
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * (viewMatrix * w); }`,
      fragmentShader: /* glsl */`
        uniform vec3 uFog, uCam, uLight; uniform float uFogDensity, uMove, uW; varying vec2 vUv; varying vec3 vW;
        ${AA_GLSL}
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
        float covP(float d, float w){ return clamp(d / max(w, 1e-4) + 0.5, 0.0, 1.0); }
        void main(){
          float x = (vUv.x - 0.5) * 2.0 * uW, along = vUv.y, ax = abs(x);
          float w = fwidth(x) * 1.2;
          // the lawns, mown in stripes, and a drive across to every other house
          vec3 col = vec3(0.1, 0.2, 0.11) * (0.85 + 0.2 * n2(vec2(x, along) * 0.08));
          col *= 0.9 + 0.12 * aaSq(along / 9.0);
          float drive = covP(5.5 - abs(mod(along + (x > 0.0 ? 40.0 : 0.0), 84.0) - 42.0), fwidth(along) * 1.2) * step(29.0, ax) * step(ax, 60.0);
          col = mix(col, vec3(0.26, 0.25, 0.27), drive);
          // the verge, the sidewalk's slabs, the curb, the road
          col = mix(col, vec3(0.12, 0.22, 0.12), covP(29.0 - ax, w));
          vec3 walk = vec3(0.3, 0.29, 0.31) * (1.0 - 0.25 * aaPulse(along / 5.0, 0.04)) * (0.92 + 0.08 * h2(floor(vec2(along / 5.0, x))));
          col = mix(col, walk, covP(27.0 - ax, w) * covP(ax - 19.2, w));
          col = mix(col, vec3(0.42, 0.41, 0.43), covP(ax - 18.0, w) * covP(19.2 - ax, w));
          vec3 road = vec3(0.07, 0.07, 0.09) * (0.85 + 0.25 * n2(vW.xz * 0.3));
          col = mix(col, road, covP(18.0 - ax, w));
          col *= uLight;
          float d = length(uCam - vW);
          float fog = 1.0 - exp(-pow(d * uFogDensity, 1.5));
          gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
        }`,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = -3;
    scene.add(this.mesh);
    this._p = new THREE.Vector3();
  }
  update(track, rider) {
    const sp = this.span, N = this.N, DT = 46 / (N - 2);
    const ta = Math.max(sp.from, rider.t - 4), tb = Math.min(sp.to, rider.t + 46);
    const on = tb > ta + 0.05;
    this.mesh.visible = on;
    if (!on) return;
    const ts = this._ts || (this._ts = new Float32Array(N));
    let rows = 0; ts[rows++] = ta;
    for (let k = Math.floor(ta / DT) + 1; k * DT < tb - 1e-4 && rows < N - 1; k++) ts[rows++] = k * DT;
    ts[rows++] = tb;
    const W = this.W, c = this.course, smp = this._smp || (this._smp = {});
    let cum = 0, lx = 0, lz = 0, base = 0;
    for (let i = 0; i < rows; i++) {
      const t = ts[i];
      track.ground(t, 0, this._p);
      const cx = this._p.x, cz = this._p.z, yaw = c.sample(t, smp).yaw, ax = -Math.cos(yaw), az = Math.sin(yaw);
      if (i) cum += Math.hypot(cx - lx, cz - lz);
      lx = cx; lz = cz;
      if (i === 0) base = this._baseAt(track, rider, t);
      for (let j = 0; j < 3; j++) {
        const xx = (j - 1) * W, o = (i * 3 + j) * 3;
        this.pos[o] = cx + ax * xx; this.pos[o + 1] = 0.02; this.pos[o + 2] = cz + az * xx;
        this.uv[(i * 3 + j) * 2] = j / 2; this.uv[(i * 3 + j) * 2 + 1] = base + cum;
      }
    }
    // (rows past the last are folded onto it)
    for (let i = rows; i < N; i++) for (let j = 0; j < 3; j++) { const o = (i * 3 + j) * 3, l = ((rows - 1) * 3 + j) * 3; this.pos[o] = this.pos[l]; this.pos[o + 1] = this.pos[l + 1]; this.pos[o + 2] = this.pos[l + 2]; this.uv[(i * 3 + j) * 2] = this.uv[((rows - 1) * 3 + j) * 2]; this.uv[(i * 3 + j) * 2 + 1] = this.uv[((rows - 1) * 3 + j) * 2 + 1]; }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true;
  }
  // the distance along at the first row, so the patterns stay put on the ground as she rides
  _baseAt(track, rider, t) {
    let d = 0, px = 0, pz = 0;
    for (let k = 0; k <= 24; k++) { track.ground(rider.t + (t - rider.t) * k / 24, 0, this._p); if (k) d += Math.hypot(this._p.x - px, this._p.z - pz); px = this._p.x; pz = this._p.z; }
    return rider.stats.dist + (t >= rider.t ? d : -d);
  }
}

// ---------- the place, per frame ----------
const YARDS = [[-6, 22.3], [51.3, 88.0], [130.5, 160.5], [195.5, 217]];
export class GcoWorld {
  constructor(scene, S) {
    this.S = S;
    prepare(S.course, S.plan);
    this.mat = roomMaterial();
    this.rooms = (S.plan.rooms || []).map((sp) => new Room(scene, S.course, sp, this.mat, HOUSE));
    this.yards = YARDS.map(([a, b]) => new Yard(scene, S.course, { from: a, to: b }, S.P));
    const nr = S.plan.notes || [37.96, 49.28, 0.12, 0.92];
    this.mat.uniforms.uNoteRamp.value.set(nr[0], nr[1], nr[2], nr[3]);
    const n2 = S.plan.notes2; if (n2) this.mat.uniforms.uNote2.value.set(n2[0], n2[1], n2[2]);
    this.flurry = S.plan.flurry || [];
    this._g = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1, 1, 1); this._e = new THREE.Euler();
    void S.town.layers.gcoNote;
  }
  update(S, dt, camera, time) {
    const u = this.mat.uniforms, P = S.P, T = S.rider.t, c = S.course;
    u.uTime.value = time; u.uT.value = T; u.uDist.value = S.rider.stats.dist;
    u.uCam.value.copy(camera.position); u.uFog.value.set(P.fog); u.uFogDensity.value = P.fogDensity;
    u.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.6) / 2.3);
    u.uLit.value = houseLit(T); u.uFront.value = frontLit(T);
    u.uBeat.value = Math.exp(-(((c.beatAt(T) % 1) + 1) % 1) * 4);
    u.uMove.value = clamp((S.rider.v || 0) / 60, 0, 2);
    u.uGold.value = smooth(176.0, 179.5, T) * (1 - smooth(182.0, 183.0, T));
    for (const r of this.rooms) r.update(S.track, S.rider, T);
    for (const y of this.yards) { y.update(S.track, S.rider); const yu = y.mat.uniforms; yu.uCam.value.copy(camera.position); yu.uFog.value.set(P.fog); yu.uFogDensity.value = P.fogDensity; yu.uLight.value.set(P.skyLight ?? 0xffffff).multiplyScalar((P.hemiK ?? 1.6) / 2.4); }
    // the pictures' and the windows' fog
    const M = S.town.mats;
    for (const k of FOGGED) { const m = M[k]; if (!m) continue; m.uniforms.uCam.value.copy(camera.position); m.uniforms.uFog.value.set(P.fog); m.uniforms.uFogDensity.value = P.fogDensity; }
    if (M.gcoWinM) M.gcoWinM.uniforms.uWarm.value.set(P.window ?? 0xffc878);
  }
  // her lamps and chandeliers, the vault's lights; in the choruses, his notes in the air
  draw(T) {
    const S = this.S, g = this._g, c = S.course, track = S.track, lit = houseLit(S.rider.t);
    for (const r of this.rooms) {
      if (!r.mesh.visible) continue;
      for (const f of r.fixtures) {
        const fy = floorAt(c, f.t);
        track.ground(f.t, 0, g);
        if (r.style === 2) {
          // a chandelier: a ring of little flames, its pool on the boards
          for (let j = 0; j < 8; j++) { const a = j / 8 * Math.PI * 2 + T.tNow * 0.15; T.glow(g.x + Math.cos(a) * 3.2, fy + r.H - 7 - (j % 2) * 1.2, g.z + Math.sin(a) * 3.2, 1.3, FLAME, 1.1 * lit); }
          T.glow(g.x, fy + r.H - 7, g.z, 16, FLAME, 0.22 * lit); T.pool(g.x, fy + 0.15, g.z, 34, WARM, 0.4 * lit);
        } else if (r.style === 5) {
          T.glow(g.x, fy + r.H - 1.5, g.z, 6, WHITEL, 0.8 * lit); T.pool(g.x, fy + 0.15, g.z, 26, GOLDL, 0.3 * lit);
        } else {
          // a pendant lamp over the middle, warm
          T.glow(g.x, fy + r.H - 6, g.z, 4.4, LAMPL, 1.0 * lit); T.glow(g.x, fy + r.H - 6, g.z, 15, LAMPL, 0.16 * lit);
          T.pool(g.x, fy + 0.15, g.z, 30, WARM, 0.42 * lit);
        }
      }
    }
    // the notes in the air over her street in the choruses, drifting down and turning
    const t = S.rider.t;
    for (const [a, b] of this.flurry) {
      if (t < a - 6 || t > b + 1) continue;
      const k = smooth(a - 1, a + 0.5, t) * (1 - smooth(b - 0.5, b + 1, t));
      if (k <= 0.01) continue;
      const time = T.tNow;
      for (let j = 0; j < 64; j++) {
        const per = 5 + hash(j * 1.3) * 3, ph = (time / per + hash(j * 7.1)) % 1, cyc = Math.floor(time / per + hash(j * 7.1));
        const tt = t + 0.5 + hash(j * 3.1 + cyc * 0.7) * 9;
        if (tt < a || tt > b + 0.6) continue;
        const side = hash(j * 5.3 + cyc) < 0.5 ? -1 : 1, x = side * (6 + hash(j * 2.9 + cyc * 1.3) * 44);
        track.ground(tt, x, g);
        g.y = 46 - ph * 42 + Math.sin(time * 1.3 + j) * 1.5;
        this._e.set(Math.sin(time * 1.7 + j) * 1.2, time * (0.6 + hash(j) * 1.4) + j, Math.cos(time * 1.1 + j * 0.7) * 0.9);
        this._q.setFromEuler(this._e);
        const sc = 2.4 * k * Math.min(1, ph * 6);
        this._m.compose(g, this._q, this._s.set(sc, sc, sc));
        T.layers.gcoNote.add(this._m, ck(hash(j * 11.7) < 0.3 ? Math.floor(hash(j * 13.1 + cyc) * 15) : 15, 0.85));
      }
    }
  }
}

// ---------- the end: her kitchen table, the kettle on, two mugs, and one more note ----------
export class GcoFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.t = cfg.t; this.x = cfg.x ?? -24;
    this.group = new THREE.Group(); scene.add(this.group);
    const paintMat = selfLit({ roughness: 0.6 }, 0.16), chrome = selfLit({ roughness: 0.18, metalness: 0.8 }, 0.25), gloss = selfLit({ roughness: 0.3, metalness: 0.05 }, 0.3);
    const add = (geo, mat, x = 0, y = 0, z = 0, ry = 0, s = 1) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(s); this.group.add(o); return o; };
    // the table and its two chairs (a dining table from the party, its cloth off)
    add(tableGeo(), paintMat, 0, 0, 0);
    add(GC.kettle(), chrome, -1.5, 9.8, -1, 0.6, 0.9);
    this.mugs = [add(mugGeo(0xf8f5ee), gloss, 4.5, 9.8, 1.6, -0.8), add(mugGeo(0xf2b8c8), gloss, 7.4, 9.8, -1.8, 0.5)];
    // ALWAYS: one on the table between the mugs, and one on every side of the kettle
    const noteMat = new THREE.MeshBasicMaterial({ map: tex().notes, color: new THREE.Color(1.1, 1.1, 1.1), side: THREE.DoubleSide });
    const always = (curl) => { const g = noteGeo(curl, 6), uv = g.attributes.uv, cell = NOTE_CELL.ALWAYS, cx = cell % 4, cy = Math.floor(cell / 4); for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i)) / 4, 1 - (cy + 1 - uv.getY(i)) / 4); return g; };
    const flat = always(0.12); flat.rotateX(-Math.PI / 2); flat.translate(0, 9.92, 0);
    this.note = add(flat, noteMat, 1.5, 0, 4.4, 0.3, 1); this.note.scale.set(3.4, 1, 3.4);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.3, o = add(always(0.2), noteMat, -1.5 + Math.sin(a) * 3.2, 11.3, -1 + Math.cos(a) * 3.2, a); o.scale.setScalar(2.5); o.rotation.z = (k % 2 ? 0.08 : -0.06); }
    this.group.scale.setScalar(cfg.s ?? 1.4);
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
    const s = this.cfg.s ?? 1.4, w = this._w, mw = this.group.matrixWorld;
    this.fireK = this.fired ? Math.min(1, (this.fireK || 0) + dt * 0.8) : 0;
    // the lamp over the table, the hob's flame under the kettle, its steam
    w.set(0, 30, 0).applyMatrix4(mw); S.glow(w.x, w.y, w.z, 5 * s, LAMPL, 1.2); S.glow(w.x, w.y, w.z, 20 * s, LAMPL, 0.2);
    w.set(0, 0.2, 0).applyMatrix4(mw); S.pool(w.x, this._p.y + 0.15, w.z, 38 * s, WARM, 0.75);
    for (let j = 0; j < 8; j++) { const f = ((songT * (0.6 + 0.8 * this.fireK) + j / 8) % 1); w.set(-1.5 + 5.6 * 0.9 + f * 3, 9.8 + 5.4 * 0.9 + f * 6, -1 + Math.sin(songT * 2 + j) * 0.6).applyMatrix4(mw); S.glow(w.x, w.y, w.z, (1 + f * 3) * s, STEAM, 0.45 * (1 - f)); }
    for (let j = 0; j < 2; j++) { const m = this.mugs[j]; for (let k = 0; k < 3; k++) { const f = ((songT * 0.35 + k / 3 + j * 0.5) % 1); w.set(m.position.x + Math.sin(songT + k) * 0.3, 13 + f * 4, m.position.z).applyMatrix4(mw); S.glow(w.x, w.y, w.z, (0.6 + f * 1.4) * s, STEAM, 0.3 * (1 - f)); } }
    w.set(1.5, 10.6, 4.4).applyMatrix4(mw); S.glow(w.x, w.y, w.z, 6 * s, NOTEL, 0.25 + 0.35 * this.fireK);
  }
}
// the kitchen table: a scrubbed top on turned legs, two chairs pulled up
function tableGeo() {
  const g = [], B = (w, h, d, x, y, z, c) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); return paintG(b, c); };
  g.push(B(24, 0.9, 15, 0, 9.4, 0, [0.82, 0.68, 0.5]));
  for (const [x, z] of [[-10.6, -6], [10.6, -6], [-10.6, 6], [10.6, 6]]) g.push(B(1.1, 9, 1.1, x, 4.5, z, [0.6, 0.45, 0.3]));
  for (const sd of [-1, 1]) {
    g.push(B(6, 0.6, 6, sd * 6, 5.6, sd * 11, [0.5, 0.62, 0.52]), B(6, 9, 0.6, sd * 6, 9.8, sd * 13.7, [0.5, 0.62, 0.52]));
    for (const [x, z] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) g.push(B(0.5, 5.6, 0.5, sd * 6 + x, 2.8, sd * 11 + z, [0.4, 0.3, 0.2]));
  }
  return mergeAll(g);
}
function mugGeo(hex) {
  const c = new THREE.Color(hex), col = [c.r, c.g, c.b];
  const body = new THREE.LatheGeometry([[0, 0], [1.4, 0], [1.5, 0.2], [1.5, 3.4], [1.35, 3.4], [1.35, 0.5], [0, 0.5]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
  const tea = new THREE.CylinderGeometry(1.34, 1.34, 0.1, 20); tea.translate(0, 2.8, 0);
  const handle = new THREE.TorusGeometry(0.9, 0.22, 8, 16, Math.PI * 1.2); handle.rotateZ(-Math.PI * 0.6); handle.translate(1.6, 1.8, 0);
  return mergeAll([paintG(body, col), paintG(tea, [0.45, 0.25, 0.12]), paintG(handle, col)]);
}
function paintG(g, c) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
function mergeAll(gs) { return merge(gs); }
