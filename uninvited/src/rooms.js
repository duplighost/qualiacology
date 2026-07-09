// Furnishing: a lived-in family home built from a small primitive prop kit, lit
// by whatever candles and torches the family found when the power went. Plus the
// one thing that ends the night: a dressmaker's form at the far bedroom window.
import * as THREE from 'three';
import { LV } from './world.js';
import { makeArtTextures } from './textures.js';

let M, W, S, CTX;
const CANDLES = [], FLAMES = [];
let ART = [];
export function getCandles() { return CANDLES; }
export function getFlames() { return FLAMES; }

/* ---------------- helpers ---------------- */
function matOf(m) { return typeof m === 'string' ? (M[m] || M.plaster) : m; }
function mesh(geo, m, x, y, z, ry = 0, cast = true) {
  const o = new THREE.Mesh(geo, matOf(m));
  o.position.set(x, y, z); if (ry) o.rotation.y = ry;
  o.castShadow = cast; o.receiveShadow = true; S.add(o); return o;
}
function box(w, h, d, m, x, y, z, ry = 0) { return mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, ry); }
function cyl(rt, rb, h, seg, m, x, y, z) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z); }
function R(id) {
  const r = W.roomById[id];
  return { x0: r.wx0, x1: r.wx1, z0: r.wz0, z1: r.wz1, cx: r.cx, cz: r.cz, y: LV[r.level].floor, r };
}

function candle(x, y, z, color = 0xffb060, intensity = 5.5, r = 8.5) {
  CANDLES.push({ x, y: y + 0.12, z, color, intensity, r });
  cyl(0.03, 0.045, 0.15, 8, 'candleWax', x, y + 0.075, z);
  const f = mesh(new THREE.ConeGeometry(0.03, 0.09, 6), M.flame, x, y + 0.19, z, 0, false);
  f.scale.y = 1.9; FLAMES.push(f);
}
function nightlight(x, y, z) {
  CANDLES.push({ x, y: y + 0.05, z, color: 0xff9a5a, intensity: 2.6, r: 5 });
  const b = mesh(new THREE.SphereGeometry(0.05, 8, 8), M.flame, x, y + 0.05, z, 0, false);
}
function torchGlow(x, y, z) {  // a dropped/standing torch throwing cold light
  CANDLES.push({ x, y, z, color: 0xdfe8ff, intensity: 6, r: 9 });
}

function rug(cx, cz, w, d, m, y) { const o = box(w, 0.02, d, m, cx, y + 0.011, cz); o.castShadow = false; return o; }
function framedPic(x, y, z, ry, tex, w = 0.52, h = 0.64) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; S.add(g);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.07, h + 0.07, 0.04), M.woodDark);
  fr.castShadow = true; g.add(fr);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 }));
  p.position.z = 0.03; g.add(p);
  return g;
}

/* ---------------- furniture ---------------- */
function sofa(x, z, ry, m) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
  const add = (w, h, d, mm, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matOf(mm)); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; g.add(o); };
  add(1.9, 0.4, 0.85, m, 0, 0.35, 0);
  add(1.9, 0.5, 0.2, m, 0, 0.65, -0.32);
  add(0.2, 0.5, 0.85, m, -0.85, 0.55, 0);
  add(0.2, 0.5, 0.85, m, 0.85, 0.55, 0);
  add(1.5, 0.12, 0.6, m, 0, 0.56, 0.05);
  return g;
}
function armchair(x, z, ry, m) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
  const add = (w, h, d, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matOf(m)); o.position.set(px, py, pz); o.castShadow = true; g.add(o); };
  add(0.8, 0.4, 0.8, 0, 0.35, 0); add(0.8, 0.5, 0.18, 0, 0.65, -0.3);
  add(0.16, 0.4, 0.8, -0.4, 0.5, 0); add(0.16, 0.4, 0.8, 0.4, 0.5, 0);
  return g;
}
function lowTable(x, z, m, w = 1.1, d = 0.6) {
  const g = new THREE.Group(); g.position.set(x, 0, z); S.add(g);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), matOf(m)); top.position.y = 0.42; top.castShadow = true; g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.07), matOf(m)); l.position.set(sx * (w / 2 - 0.08), 0.21, sz * (d / 2 - 0.08)); g.add(l);
  }
  return g;
}
function table(x, z, m, w = 1.6, d = 1.0, h = 0.78) {
  const g = new THREE.Group(); g.position.set(x, 0, z); S.add(g);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), matOf(m)); top.position.y = h; top.castShadow = true; top.receiveShadow = true; g.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.09, h, 0.09), matOf(m)); l.position.set(sx * (w / 2 - 0.12), h / 2, sz * (d / 2 - 0.12)); g.add(l);
  }
  return g;
}
function chair(x, z, ry, m) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
  const a = (w, h, d, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matOf(m)); o.position.set(px, py, pz); o.castShadow = true; g.add(o); };
  a(0.42, 0.06, 0.42, 0, 0.46, 0); a(0.42, 0.5, 0.06, 0, 0.72, -0.18);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) a(0.05, 0.46, 0.05, sx * 0.17, 0.23, sz * 0.17);
  return g;
}
function bed(x, z, ry, sheet, w = 1.5, l = 2.0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
  const a = (ww, h, d, mm, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(ww, h, d), matOf(mm)); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; g.add(o); };
  a(w, 0.3, l, 'woodPale', 0, 0.3, 0);
  a(w, 0.18, l * 0.98, sheet, 0, 0.5, 0.02);
  a(w, 0.16, 0.5, 'linen', 0, 0.6, -l / 2 + 0.35);   // pillows
  a(w + 0.1, 0.7, 0.12, 'woodPale', 0, 0.5, -l / 2);  // headboard
  return g;
}
function wardrobe(x, z, ry, m = 'woodPale') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.6), matOf(m)); b.position.y = 1.0; b.castShadow = true; g.add(b);
  for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), M.brass); h.position.set(sx * 0.06, 1.05, 0.31); g.add(h); }
  return g;
}
function shelf(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.32), matOf('woodPale')); b.position.y = 1.0; b.castShadow = true; g.add(b);
  for (let i = 0; i < 4; i++) {
    const row = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.26), M.bookRows[i % 3]); row.position.set(0, 0.4 + i * 0.44, 0.02); g.add(row);
  }
  return g;
}
function counter(x, z, ry, len = 3.6) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.9, len), matOf('woodPale')); base.position.set(0, 0.45, 0); base.castShadow = true; base.receiveShadow = true; g.add(base);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, len), matOf('marblePlain')); top.position.set(0, 0.93, 0); g.add(top);
  return g;
}
function appliance(x, z, ry, m = 'metalWhite', w = 0.7, h = 1.7, d = 0.7) { return box(w, h, d, m, x, h / 2, z, ry); }
function tvUnit(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.4), matOf('woodPale')); stand.position.y = 0.2; stand.castShadow = true; g.add(stand);
  const tv = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.06), matOf('screenOff')); tv.position.set(0, 0.95, 0); tv.castShadow = true; g.add(tv);
  return g;
}
function desk(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; S.add(g);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 0.7), matOf('woodPale')); top.position.y = 0.75; top.castShadow = true; g.add(top);
  box(0.5, 0.75, 0.6, 'woodPale', x + (ry ? 0 : 0.4), 0.375, z); // pedestal (approx)
  return g;
}
function dressForm(x, y, z, ry) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; S.add(g);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.05, 14), matOf('metalSteel')); base.position.y = 0.03; g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.0, 8), matOf('metalSteel')); pole.position.y = 0.55; g.add(pole);
  const dress = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.0, 14, 1, true), matOf('paleDress')); dress.position.y = 0.92; dress.castShadow = true; g.add(dress);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 4, 8), matOf('mannequin')); torso.position.y = 1.28; torso.scale.z = 0.68; torso.castShadow = true; g.add(torso);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), matOf('mannequin')); knob.position.y = 1.55; g.add(knob);
  return g;
}

/* ---------------- the house ---------------- */
export function furnish(world, mats, ctx) {
  M = mats; W = world; CTX = ctx; S = world.scene;
  ART = makeArtTextures();
  const pic = (i) => ART[i % ART.length];

  /* ===== GROUND ===== */
  // entrance hall — the way in, the stairs, a console with keys and post
  {
    const r = R('foyer');
    const console = box(1.3, 0.8, 0.4, 'woodPale', 24.6, 0.4, 36.5, Math.PI / 2);
    framedPic(23.2, 2.0, 34, Math.PI / 2, pic(6), 0.6, 0.74);
    const bowl = cyl(0.12, 0.1, 0.06, 12, 'brass', 24.6, 0.86, 36.5);
    CTX.examine(console, 'the hall table', "Car keys in a bowl. Post on the mat. People who mean to come back.");
    torchGlow(30, 1.4, 37);   // the torch you brought, on the floor by the door
  }
  // living room — sofa, telly, hearth, a warm candle
  {
    rug(9, 35, 4.4, 3, 'carpetWarm', 0);
    sofa(9, 37.6, Math.PI, 'sofaBlue');
    sofa(4.5, 35, Math.PI / 2, 'sofaBlue');
    lowTable(9, 35, 'woodPale');
    const tv = tvUnit(9, 31.2, 0);
    CTX.examine(tv, 'the television', "Big flat telly. That alone pays for tonight. If my hands would stop shaking.");
    armchair(15, 33, -Math.PI / 2, 'sofaGrey');
    framedPic(1.2, 1.9, 33, Math.PI / 2, pic(0), 0.7, 0.55);
    framedPic(1.2, 1.9, 37, Math.PI / 2, pic(3), 0.55, 0.68);
    candle(9, 0.5, 35, 0xffb060, 5.5, 9);   // on the coffee table
  }
  // dining room — table, chairs, sideboard, family photos
  {
    table(44, 35, 'woodPale', 2.0, 1.0);
    for (const dx of [-0.7, 0, 0.7]) { chair(44 + dx, 33.6, 0, 'woodPale'); chair(44 + dx, 36.4, Math.PI, 'woodPale'); }
    const side = box(2.0, 0.9, 0.5, 'woodPale', 44, 0.45, 39.4);
    const fp = framedPic(44, 1.9, 39.7, Math.PI, pic(5), 0.6, 0.5);
    CTX.examine(fp, 'a photograph', "A family. All done up, squinting at the sun. Whoever they were. Long gone.");
    candle(46, 0.86, 39.4, 0xffb060, 4.5, 8);
  }
  // kitchen — counters along the outer wall, sink under the window (the mother works here)
  {
    counter(58.9, 34.5, Math.PI / 2, 6.6);   // east wall run
    const sink = box(0.7, 0.12, 0.9, 'metalSteel', 58.6, 0.9, 33);
    appliance(58.6, 38.6, 0, 'metalWhite');  // fridge
    box(0.7, 0.6, 0.7, 'metalSteel', 58.6, 0.45, 37); // oven
    table(53, 35, 'woodPale', 1.4, 0.9, 0.76);
    chair(53, 33.8, 0, 'woodPale'); chair(53, 36.2, Math.PI, 'woodPale');
    candle(57, 0.98, 36, 0xffb060, 5, 8);    // her candle by the sink
  }
  // study/den — the father paces here; a desk, shelves, his candle
  {
    desk(3, 20, Math.PI / 2);
    armchair(8, 24, Math.PI, 'sofaGrey');
    shelf(1.6, 18, Math.PI / 2);
    shelf(1.6, 24, Math.PI / 2);
    framedPic(6, 1.9, 16.3, 0, pic(7), 0.5, 0.6);
    candle(3, 0.82, 20, 0xffb060, 4.5, 8);
  }
  // family room — sofas, toys on the rug
  {
    rug(20, 21, 4, 3, 'carpetGrey', 0);
    sofa(20, 24, Math.PI, 'sofaGrey');
    lowTable(20, 21, 'woodPale');
    box(0.3, 0.3, 0.3, 'plasticRed', 18.5, 0.15, 19.5);
    box(0.25, 0.25, 0.25, 'plasticBlue', 21.2, 0.13, 20);
    candle(20, 0.5, 21, 0xffb060, 4, 7);
  }
  // sun room — wicker chairs, plants under the glass roof
  {
    armchair(52, 20, 0, 'fabricCream'); armchair(56, 20, 0, 'fabricCream');
    for (const [px, pz] of [[50, 24], [58, 24], [54, 17]]) {
      cyl(0.22, 0.26, 0.4, 8, 'woodDark', px, 0.2, pz);
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), matOf('clothGreen')); bush.position.set(px, 0.75, pz); bush.scale.y = 1.4; bush.castShadow = true; S.add(bush);
    }
  }
  // playroom — the boy's train set on the floor
  {
    rug(40, 8, 5, 4, 'carpetGrey', 0);
    const loop = new THREE.Group(); loop.position.set(40, 0.02, 6); S.add(loop);
    const tr = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.05, 6, 24), matOf('woodDark'));
    tr.rotation.x = Math.PI / 2; tr.position.y = 0.03; loop.add(tr);
    const train = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.18), matOf('plasticRed')); train.position.set(41.1, 0.12, 6); train.castShadow = true; S.add(train);
    box(1.2, 1.2, 0.35, 'wallKidBlue', 33.2, 0.6, 4); // toy shelf
    box(0.4, 0.4, 0.4, 'plasticYel', 44, 0.2, 4);
    CTX.examine(train, 'a toy train', "Kid's train set, laid out on the floor. Left mid-game. Kids don't just… stop, do they.");
    nightlight(46, 0.4, 12);
  }
  // hall — a runner and a couple of pictures
  {
    rug(30, 28, 1.6, 11, 'runner', 0);
    framedPic(0.3, 2.0, 24, -Math.PI / 2, pic(1), 0.5, 0.62);
    framedPic(59.7, 2.0, 24, Math.PI / 2, pic(2), 0.5, 0.62);
  }
  // garage / pantry / boot room — sparse, working spaces
  {
    box(2.2, 1.4, 4.5, 'screenOff', 10, 0.7, 8);   // a car in the garage
    box(2.3, 0.4, 4.6, 'iron', 10, 0.2, 8);
    box(1.0, 2.0, 0.45, 'metalWhite', 26, 1.0, 1.2); // pantry shelving
    box(1.0, 2.0, 0.45, 'woodPale', 54, 1.0, 1.2);   // boot room cupboard
  }
  // utility — washer + dryer
  {
    appliance(40, 24.6, 0, 'metalWhite', 0.7, 0.9, 0.7);
    appliance(41, 24.6, 0, 'metalWhite', 0.7, 0.9, 0.7);
  }

  /* ===== FIRST FLOOR ===== */
  // the landing — a runner, a console, the girl drifts here (a nightlight for her)
  {
    rug(30, 28, 1.6, 40, 'runner', 4.2);
    const con = box(1.1, 0.8, 0.35, 'woodPale', 4, 4.6, 27, 0);
    framedPic(4, 5.9, 26.3, 0, pic(4), 0.5, 0.6);
    nightlight(22, 4.4, 27);
    // little shoes by a door — the detail the prowler misreads
    box(0.12, 0.06, 0.24, 'plasticRed', 12.6, 4.24, 26.4);
    box(0.12, 0.06, 0.24, 'plasticBlue', 12.9, 4.24, 26.4);
  }
  // the long hall to the master — a runner, framed photos climbing away
  {
    rug(29, 17, 1.3, 16, 'runner', 4.2);
    framedPic(28.16, 6.0, 13, Math.PI / 2, pic(5), 0.42, 0.52);
    framedPic(28.16, 6.0, 21, Math.PI / 2, pic(0), 0.42, 0.52);
    framedPic(29.84, 6.0, 17, -Math.PI / 2, pic(3), 0.42, 0.52);
  }
  // boy's room
  {
    bed(4, 11, 0, 'pjBlue', 1.2, 1.9);
    wardrobe(2, 24, Math.PI / 2);
    box(1.0, 1.0, 0.32, 'wallKidBlue', 12.6, 0.6 + 4.2, 22, -Math.PI / 2); // shelf
    box(0.3, 0.3, 0.3, 'plasticGrn', 8, 4.35, 20);
    nightlight(11, 4.4, 11);
  }
  // girl's room
  {
    bed(53, 11, 0, 'clothPink', 1.2, 1.9);
    wardrobe(58, 24, -Math.PI / 2);
    // a doll's house
    const dh = box(0.8, 0.9, 0.5, 'wallKidPink', 47, 4.65, 23);
    CTX.examine(dh, "a doll's house", "A doll's house, every little room lit up in my torch. Someone loves this kid.");
    nightlight(50, 4.4, 11);
  }
  // bathroom
  {
    box(0.7, 0.5, 1.5, 'tileWhite', 16, 4.45, 11);   // bath
    box(0.5, 0.4, 0.4, 'tileWhite', 26, 4.4, 11);    // sink
    box(0.4, 0.7, 0.5, 'tileWhite', 26, 4.55, 13);   // toilet
  }
  // parents' study upstairs
  {
    desk(39, 11, 0);
    shelf(45.4, 22, -Math.PI / 2);
    armchair(43, 22, Math.PI, 'sofaGrey');
  }
  // guest room + a spare bedroom flanking the master
  {
    bed(6, 4, 0, 'fabricCream', 1.4, 2.0);
    wardrobe(22, 6, -Math.PI / 2);
    bed(54, 4, 0, 'sofaGrey', 1.4, 2.0);
  }
  // the master bedroom — the far room. A bed, a wardrobe, and the shape at the window.
  {
    bed(26, 5, 0, 'sofaBlue', 1.6, 2.1);
    wardrobe(34.5, 6, -Math.PI / 2);
    box(0.5, 0.5, 0.4, 'woodPale', 26, 4.45, 2.3);  // nightstand
    // THE THING: a dressmaker's form at the north window, pale in the moonlight
    dressForm(30, 4.2, 1.4, Math.PI);
  }
}
