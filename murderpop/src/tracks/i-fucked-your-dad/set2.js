// The set's holidays, section by section (design §4.4, §6): the frozen-foods aisle, Dad's car, the scales,
// the childhood bedroom and the giant teddy, Christmas (tree, presents, Polaroids, the snow sheet, the click),
// bridge 2's hanging presents, Father's Day, Thanksgiving and the ghost, the rain, the frozen rain and the
// mortar, every holiday at once, the cloche, the doormat, the bulbs. Every piece is placed from song time.
import * as THREE from 'three';
import * as P from './props.js';
import * as Q from './props2.js';
import { Flames } from './fire.js';
import { soak, snow, frost, dashRing } from './overlays.js';
import { Bulbs, PAL } from './bulbs.js';
import { M, GLOW, G } from './mats.js';

const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const ease = (k) => k * k * (3 - 2 * k);
const back = (k) => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const bounce = (k) => (k < 0.7 ? (k / 0.7) ** 2 : 1 - Math.sin((k - 0.7) / 0.3 * Math.PI) * 0.08 * (1 - k));
// out of a trapdoor at t0 (over d), back down at t1
const rise = (t, t0, t1, d = 0.4, depth = 3) => (t < t0 ? -depth : t < t0 + d ? -depth * (1 - back(ramp(t, t0, t0 + d))) : t < t1 ? 0 : -depth * ease(ramp(t, t1, t1 + d * 2.5)));
// dropped in from the flies at t0, flown out at t1
const drop = (t, t0, t1, d = 0.42, h = 10) => (t < t0 ? h : t < t0 + d ? h * (1 - bounce(ramp(t, t0, t0 + d))) : t < t1 ? 0 : h * ease(ramp(t, t1, t1 + 0.8)));

export const T2 = {
  market: 22.587, marketOut: 46.457, doors: [23.302, 24.016, 24.737, 25.443, 26.153], cartGrab: 31.12, cartGo: 33.28, cartHit: 33.988,
  scales: 42.54, panL: 44.32, panR: 45.03, panBoth: 46.10, scalesOut: 46.457,
  bedroom: 95.625, teddyLock: 97.76, teddyRoll: 98.83, bedroomOut: 117.0, xmas: 117.708, click: 124.843, sign2: [122.71, 123.06, 123.41, 124.13, 124.49, 124.84],
  lift: [131.29, 132.0, 132.72, 133.42, 134.13, 134.83, 135.52], treeLift: 136.57, ignite: 137.65, falls: [138.01, 138.37, 138.73, 139.09, 139.45, 139.81, 140.17], treeFall: 140.53,
  summer: 140.879, day: 141.58, sprinklers: 156.20, brand: 165.83,
  garage: 166.539, tableIn: 167.25, ghost: 177.59, gravy: 178.34, blue: 182.20, tableUp: 183.649, rain: 184.37, tableOut: 185.08,
  freeze: 195.056, mortarFire: 197.545, cloche: 213.24, clocheLock: 214.67, clocheSlam: 215.379, clocheLift: 216.45, finish: 231.6, dawn: 232.14, youre: 239.34, out: 240.43,
};

export function dress(set) {
  const f = set.f, R = set.root, piece = (fn) => set.addPiece(fn);
  const col = (o) => set.colliders.push(o), blk = (o) => set.blockers.push(o);

  // ------------------------------------------------ the house's bulb strings (Christmas lights, fairy lights)
  const B = set.bulbs = new Bulbs(R);
  B.line([-5.2, 3.1, -8.05], [16, 3.1, -8.05], 90, 0, 0.12);
  B.line([-16, 3.45, -7.3], [-5.5, 3.45, -7.3], 44, 0, 0.12);
  B.line([-2.3, 0.62, -7.25], [2.3, 0.62, -7.25], 18, 3, 0.03);
  B.line([-0.95, 3.02, -8.0], [0.95, 3.02, -8.0], 9, 3, 0.03);
  for (const x of [-4.8, -3.6, 2.6, 7.6, 8.8, 10.0]) for (let i = 0; i < 14; i++) { const a = i * 2.4, h = 0.15 + (i / 14) * 0.95, r = 0.58 * (1 - h / 1.25) + 0.04; B.add(x + Math.cos(a) * r, h, -7.25 + Math.sin(a) * r * 0.5 + 0.05, 1, 0.08); }
  for (let i = 0; i < 70; i++) B.add(-11.45 - Math.random() * 0.15, 0.3 + Math.random() * 1.9, -7.2 + Math.random() * 10.6, 2, 0.06);
  B.line([-11.0, 1.03, -7.3], [-11.0, 1.03, 3.35], 30, 2, 0.04);
  B.line([11.0, 1.03, -7.3], [11.0, 1.03, 3.35], 30, 1, 0.04);
  B.build();
  // lamp bulbs (the street lamps' globes snap on left to right)
  const lampGlow = [new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), G(0xffd9a0, 0.0)), new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), G(0xffd9a0, 0.0))];
  lampGlow[0].position.set(6.4, 3.85, 4.2); lampGlow[1].position.set(14.0, 3.85, 4.3); for (const m of lampGlow) R.add(m);

  // ------------------------------------------------ permanent props: Dad's car, the mailbox, the gnomes, the doormat
  const car = Q.car(); car.position.set(-8.5, 0, -3.4); car.rotation.y = Math.PI; R.add(car);
  set.carCab = car.userData.cab;
  piece((t) => {
    car.position.y = t < T2.garage ? 0 : -2.2 * ease(ramp(t, T2.garage, T2.garage + 0.6)); car.visible = car.position.y > -2.1;
    car.userData.cab.scale.y = t < T2.panL ? 1 : 0.38 + 0.62 * (1 - ramp(t, T2.panL, T2.panL + 0.08));
    car.userData.cab.position.y = 1.05 - (1 - car.userData.cab.scale.y) * 0.25;
  });
  col({ type: 'box', x: -8.5, z: -3.4, hx: 1.0, hz: 2.4, active: (t) => t < T2.garage + 0.2 });
  blk({ x0: -9.5, z0: -5.8, x1: -7.5, z1: -1.0, active: (t) => t < T2.garage + 0.2 });
  const mbox = Q.mailbox(); mbox.position.set(-4.6, 0, 4.2); mbox.rotation.y = Math.PI / 2; R.add(mbox);
  set.breakables.push({ x: -4.6, z: 4.2, r: 0.35, mesh: mbox, active: () => true, chips: new THREE.Color(1.4, 0.3, 0.3), onBreak: (ff) => set.burstLob && set.burstLob('card', -4.6, 4.2) });
  for (const [x, z] of [[-1.9, -6.4], [1.9, -6.4]]) { const gn = Q.gnome(); gn.position.set(x, 0, z); R.add(gn); set.breakables.push({ x, z, r: 0.3, mesh: gn, active: (t) => t < 140.88 || t > 166.5, chips: new THREE.Color(0.5, 1.4, 1.4), onBreak: () => set.burstLob && set.burstLob('star', x, z) }); }
  const mat = Q.doormat(); mat.position.set(0, 0, -6.6); R.add(mat);
  set.doormat = mat;
  piece((t) => { const u = mat.userData; const you = set._finished && set.outroT() >= T2.youre; u.mat.map = you ? u.t1 : u.t0; u.mat.emissive = u.mat.emissive || new THREE.Color(); });

  // ------------------------------------------------ verse 1b-1c: the frozen foods aisle
  const fr = [];
  for (const x of [-4, -2, 0, 2, 4]) { const g = Q.freezer(); g.position.set(x, -3, -5.95); R.add(g); fr.push(g); }
  const isl = Q.island(); isl.position.set(0, -3, -1.6); R.add(isl);
  set.island = isl;
  const fixtures = [-8, -3, 3, 8].map((x) => { const g = Q.fixture(); g.position.set(x, 5, -3.8); R.add(g); return g; });
  const cart = Q.cart(); cart.position.set(7.4, -3, -3.85); R.add(cart);
  set.cart = cart;
  piece((t) => {
    const up = rise(t, T2.market, T2.marketOut, 0.36, 3.0);
    fr.forEach((g, i) => { g.position.y = up; g.visible = up > -2.9; g.userData.door.rotation.y = -1.9 * ease(ramp(t, T2.doors[i] - 0.08, T2.doors[i] + 0.1)); });
    isl.position.y = up; isl.visible = up > -2.9;
    isl.userData.cup.visible = t < 28.28;
    fixtures.forEach((g, i) => { g.position.y = 5 + (t < T2.market ? 8 : t < T2.market + 0.4 ? 8 * (1 - bounce(ramp(t, T2.market, T2.market + 0.4))) : 0); g.visible = t > T2.market - 0.01 && t < 48.5; const off = t > 46.82 + i * 0.357; g.userData.tube.color.setScalar(off ? 0.05 : 2.6).multiply(new THREE.Color(0.85, 1, 0.94)); });
    // the cart: parked, grabbed, launched down the aisle into Dad's car
    let cx = 7.4, cy = up;
    if (t >= T2.cartGo) { const k = ramp(t, T2.cartGo, T2.cartHit); cx = 7.0 + (-7.15 - 7.0) * k; }
    else if (t >= 32.21) cx = 7.4 + 0.25 * Math.sin((t - 32.21) * 22) * ramp(t, 32.21, 32.5);
    cart.position.set(cx, Math.min(0, cy), -3.85);
    cart.rotation.z = t >= T2.cartHit ? 0.35 : 0; cart.scale.x = t >= T2.cartHit ? 0.6 : 1;
    cart.visible = up > -2.9;
  });
  col({ type: 'box', x: 0, z: -5.95, hx: 5.0, hz: 0.45, active: (t) => t > T2.market + 0.15 && t < T2.marketOut + 0.4 });
  blk({ x0: -5, z0: -6.4, x1: 5, z1: -5.5, active: (t) => t > T2.market + 0.15 && t < T2.marketOut + 0.4 });
  col({ type: 'box', x: 0, z: -1.6, hx: 3.6, hz: 0.6, active: (t) => t > T2.market + 0.15 && t < T2.marketOut + 0.4 });
  // the light of the aisle on the floor: cool pools under the fixtures, the freezers' glow
  const pools = [];
  for (const [x, z, r, c] of [[-8, -3.8, 3.2, 0xd8fff0], [-3, -3.8, 3.2, 0xd8fff0], [3, -3.8, 3.2, 0xd8fff0], [8, -3.8, 3.2, 0xd8fff0], [0, -4.6, 5.5, 0x9ad8ff]]) pools.push(set.pool(x, z, r, c));
  piece((t) => { const k = ramp(t, T2.market, T2.market + 0.4) * (1 - ramp(t, T2.marketOut, T2.marketOut + 1.4)); pools.forEach((p, i) => p.set(k * (i < 4 ? 0.09 : 0.06))); });

  // ------------------------------------------------ 42.54: the produce scales drop from the flies
  const pans = [Q.scalePan(), Q.scalePan()];
  pans[0].position.set(-5.5, 20, -0.5); pans[1].position.set(5.5, 20, -0.5); for (const p of pans) R.add(p);
  const panY = (t, hits) => {
    if (t < T2.scales) return 20;
    if (t < T2.scales + 0.5) return 4.4 + 15.6 * (1 - bounce(ramp(t, T2.scales, T2.scales + 0.5)));
    if (t > T2.scalesOut) return 4.4 + 15 * ease(ramp(t, T2.scalesOut, T2.scalesOut + 1.0));
    let y = 4.4;
    for (const h of hits) { if (t > h - 0.12 && t < h + 0.6) y = t < h ? 4.4 * (1 - ((t - (h - 0.12)) / 0.12) ** 2) : 0.15 + 4.25 * ease(ramp(t, h + 0.18, h + 0.6)); }
    return y;
  };
  piece((t) => { pans[0].position.y = panY(t, [T2.panL, T2.panBoth]); pans[1].position.y = panY(t, [T2.panR, T2.panBoth]); for (const p of pans) p.visible = p.position.y < 19.5; });

  // ------------------------------------------------ verse 2: your childhood bedroom (dropped in on the song's biggest hit)
  const tbed = Q.twinBed(); tbed.position.set(4.6, 10, -2.4); R.add(tbed);
  const rug = Q.rug(2.5); rug.position.set(4.6, 0, -2.4); R.add(rug);
  const flat1 = Q.posterFlat(0); flat1.position.set(4.5, 10, -6.4); R.add(flat1);
  const flat2 = Q.posterFlat(1); flat2.position.set(8.2, 10, -2.5); flat2.rotation.y = -Math.PI / 2; R.add(flat2);
  const ted = P.teddy(1.4); ted.position.set(-3.6, 10, -2.2); R.add(ted);
  set.teddy = ted; set.teddyHome = { x: -3.6, z: -2.2 }; set.teddyEnd = set.teddyEnd || { x: -3.6, z: 3.0 };
  piece((t) => {
    tbed.position.y = t < T2.bedroomOut ? drop(t, T2.bedroom, 999) : -1.8 * ease(ramp(t, T2.bedroomOut, T2.xmas)); tbed.visible = t > T2.bedroom - 0.01 && tbed.position.y > -1.7;
    rug.visible = t > T2.bedroom + 0.3 && t < T2.xmas; rug.scale.setScalar(ease(ramp(t, T2.bedroom + 0.3, T2.bedroom + 0.55)));
    flat1.position.y = drop(t, T2.bedroom, T2.bedroomOut); flat2.position.y = drop(t, T2.bedroom + 0.04, T2.bedroomOut + 0.05);
    flat1.visible = flat1.position.y < 9.9; flat2.visible = flat2.position.y < 9.9;
    // the giant teddy: it rolls down its lane at 98.83 and stays where it stops, as cover, until the summer
    const home = set.teddyHome, end = set.teddyEnd;
    const k = ramp(t, T2.teddyRoll, T2.teddyRoll + set.teddyRollDur());
    ted.position.set(home.x + (end.x - home.x) * k, drop(t, T2.bedroom, 999), home.z + (end.z - home.z) * k);
    if (t > T2.summer) ted.position.y = 6 * ease(ramp(t, T2.summer, T2.summer + 0.7));
    ted.rotation.x = k > 0 && k < 1 ? (t - T2.teddyRoll) * 12 / 1.4 : 0;
    ted.rotation.y = Math.atan2(end.x - home.x, end.z - home.z) * (k > 0 ? 1 : 0) * 0;
    ted.visible = t > T2.bedroom - 0.01 && t < T2.summer + 0.7;
  });
  col({ type: 'box', x: 4.6, z: -2.4, hx: 0.55, hz: 1.05, active: (t) => t > T2.bedroom + 0.3 && t < T2.bedroomOut + 0.4 });
  blk({ x0: 4.05, z0: -3.45, x1: 5.15, z1: -1.35, active: (t) => t > T2.bedroom + 0.3 && t < T2.bedroomOut + 0.4 });
  col({ type: 'box', x: 4.5, z: -6.4, hx: 1.5, hz: 0.15, active: (t) => t > T2.bedroom + 0.3 && t < T2.bedroomOut });
  blk({ x0: 3, z0: -6.6, x1: 6, z1: -6.2, active: (t) => t > T2.bedroom + 0.3 && t < T2.bedroomOut });
  col({ type: 'box', x: 8.2, z: -2.5, hx: 0.15, hz: 1.5, active: (t) => t > T2.bedroom + 0.3 && t < T2.bedroomOut });
  blk({ x0: 8.0, z0: -4, x1: 8.4, z1: -1, active: (t) => t > T2.bedroom + 0.3 && t < T2.bedroomOut });
  col({ type: 'circle', get x() { return ted.position.x; }, get z() { return ted.position.z; }, r: 1.0, active: (t) => t > T2.bedroom + 0.3 && t < T2.summer && (t < T2.teddyRoll || t > T2.teddyRoll + set.teddyRollDur()) });
  blk({ r: 1.0, get x() { return ted.position.x; }, get z() { return ted.position.z; }, active: (t) => t > T2.bedroom + 0.3 && t < T2.summer });

  // ------------------------------------------------ Christmas: the tree rises, presents pop up, the snow sheet, Polaroids
  const tree = Q.tree(); tree.position.set(4.8, -6, -2.4); R.add(tree);
  for (const [x, y, z, s] of tree.userData.lights) B.add(4.8 + x, y, -2.4 + z, 3, 0.06);
  set.treeBulbs = tree.userData.lights.length;
  const presents = [];
  const PR = [[0.9, 0.7], [0.6, 0.55], [0.75, 0.65], [0.5, 0.5], [0.85, 0.6], [0.65, 0.7], [0.55, 0.9]];
  for (let i = 0; i < 7; i++) { const s = 0.5 + ((i * 37) % 5) * 0.1; const g = Q.present(i, s); const a = -0.6 + i * 0.95; g.userData.home = { x: 4.8 + Math.cos(a) * 2.0, z: -2.4 + Math.sin(a) * 1.6 }; g.userData.s = s; R.add(g); presents.push(g); }
  set.presents = presents;
  const polas = [];
  for (let i = 0; i < 10; i++) { const g = Q.polaroid(i); const a = i / 10 * Math.PI * 2; const r = 2.2 + (i % 3) * 0.2; g.userData.home = { x: 4.8 + Math.cos(a) * r, z: -2.4 + Math.sin(a) * r, y: 1.6 + ((i * 7) % 4) * 0.2 }; R.add(g); polas.push(g); set.breakables.push({ get x() { return g.position.x; }, get z() { return g.position.z; }, r: 0.35, mesh: g, active: (t) => t > T2.xmas + 0.4 && t < T2.click, pola: true, chips: new THREE.Color(2.2, 2.1, 1.9), onBreak: () => {} }); }
  set.polas = polas;
  const sheet = [snow(R, [-6.0, -6.9, -1.4, 3.4], 0.02), snow(R, [1.4, -6.9, 8.6, 3.4], 0.0202), snow(R, [-1.4, -6.9, 1.4, 3.4], 0.0198)];
  piece((t) => {
    // the tree: up through a trapdoor at 117.71, lifted at 136.57 to hang point-down, dropped at 140.53
    let ty = rise(t, T2.xmas, 999, 0.5, 6), rx = 0;
    if (t > T2.treeLift) { const k = ease(ramp(t, T2.treeLift, T2.treeLift + 0.8)); ty = 6.6 * k; rx = Math.PI * k; }
    if (t > T2.treeFall - 0.25) { const k = ramp(t, T2.treeFall - 0.25, T2.treeFall); ty = 6.6 * (1 - k * k) + 0.0; }
    tree.position.y = rx > 0.01 ? ty + 5.6 * Math.sin(rx / 2) : ty; tree.rotation.x = rx;
    tree.visible = t > T2.xmas - 0.01 && t < T2.treeFall + 0.02;
    // presents pop up round the tree at 117.71; lifted one by one in bridge 2 (the set's bridge-2 code moves them)
    presents.forEach((g, i) => {
      const h = g.userData.home, k = ramp(t, T2.xmas + 0.05 * i, T2.xmas + 0.05 * i + 0.3);
      if (t < T2.lift[i] || !set.hang) { g.position.set(h.x, 0, h.z); g.scale.setScalar(Math.max(0.001, back(k))); g.rotation.set(0, i * 0.7, 0); g.visible = t > T2.xmas && t < T2.lift[i] + 0.01; }
      else set.hang(g, i, t);
    });
    // the Polaroids hang on gold strings, slowly turning; at the click they flash white and burn to ash
    polas.forEach((g, i) => {
      const h = g.userData.home, k = ramp(t, T2.xmas + 0.2, T2.xmas + 0.6);
      const burn = ramp(t, T2.click, T2.click + 0.7);
      g.position.set(h.x, h.y + (1 - k) * 4 - burn * 0.6, h.z);
      if (set.polaAim && t > 123.06 && t < T2.click) g.rotation.y = set.polaAim(g); else g.rotation.y = t * 0.4 + i;
      const card = g.userData.card;
      card.material.emissive.setScalar(t > T2.click - 0.02 && t < T2.click + 0.25 ? 3 * (1 - ramp(t, T2.click, T2.click + 0.25)) : 0);
      card.material.color.setScalar(1 - burn * 0.9); card.scale.setScalar(1 - burn * 0.6);
      g.visible = t > T2.xmas + 0.2 && t < T2.click + 0.7;
    });
    // the cream snow sheet slides over the lawns from the house at 117.71; yanked off at 140.88 (taking the wreckage)
    const on = ramp(t, T2.xmas, T2.xmas + 0.6), off = ramp(t, T2.summer, T2.summer + 0.7);
    // warm cream, held well under white so WHITE telegraphs stay unmistakable on it (design §4.5)
    const lightK = t < T2.click ? 0.23 : 0.12;
    sheet.forEach((s) => { s.set(on * (1 - off)); s.u.uTime.value = t; s.u.uLight.value = lightK; s.u.uTint.value.setRGB(1.0, 0.92, 0.78); s.m.position.z = (s.base ?? (s.base = s.m.position.z)) - off * 9; });
  });
  col({ type: 'circle', x: 4.8, z: -2.4, r: 1.5, active: (t) => t > T2.xmas + 0.3 && t < T2.treeLift + 0.3 });
  blk({ r: 1.5, x: 4.8, z: -2.4, active: (t) => t > T2.xmas + 0.3 && t < T2.treeLift + 0.3 });
  for (const g of presents) { const h = g.userData.home; col({ type: 'circle', x: h.x, z: h.z, r: g.userData.s * 0.55, active: (t) => t > T2.xmas + 0.3 && t < T2.lift[presents.indexOf(g)] }); }

  // ------------------------------------------------ bridge 2: the presents float up over YOU, drip, ignite, fall
  set.hangSpots = set.hangSpots || [];
  const drips = presents.map((g) => dashRing(R, 0.9 + g.userData.s * 0.8));
  const pfire = presents.map((g) => { const fl = new Flames(f.scene, g); for (let k = 0; k < 5; k++) fl.add({ x: (k - 2) * g.userData.s * 0.18, z: ((k * 7) % 3 - 1) * g.userData.s * 0.2, y: g.userData.s * 0.8, w: 0.5, h: 0.9, group: 'p' }); fl.build(); return fl; });
  const ground = presents.map(() => { const grp = new THREE.Group(); R.add(grp); const fl = new Flames(f.scene, grp); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; fl.add({ x: Math.cos(a) * 0.45, z: Math.sin(a) * 0.45, w: 0.6, h: 0.8, group: 'g' }); } fl.build(); return { grp, fl }; });
  set.knocked = set.knocked || [];
  const tPark = (i) => T2.lift[i] + 2 * 0.356;
  set.hang = (g, i, t) => {
    const h = g.userData.home, pl = f.player;
    const park = tPark(i), fall = set.knocked[i] ?? T2.falls[i];
    let x = h.x, z = h.z, y = 0;
    if (t < park) { const k = ease(ramp(t, T2.lift[i], park)); x = h.x + (pl.x - h.x) * k; z = h.z + (pl.z - h.z) * k; y = 5.0 * k; }
    else { if (!set.hangSpots[i]) set.hangSpots[i] = { x: pl.x, z: pl.z }; const s2 = set.hangSpots[i]; x = s2.x; z = s2.z; y = 5.0 + Math.sin(t * 2 + i) * 0.06; }
    if (t > fall - 0.32) y = 5.0 * (1 - ((t - (fall - 0.32)) / 0.32) ** 2);
    g.position.set(x, Math.max(0, y), z); g.rotation.set(Math.sin(t * 1.3 + i) * 0.08, i * 0.7 + t * 0.2, 0);
    g.scale.setScalar(1);
    g.visible = t < fall + 0.02 && t < T2.summer;
  };
  piece((t, dt) => {
    presents.forEach((g, i) => {
      const park = tPark(i), fall = set.knocked[i] ?? T2.falls[i], sp = set.hangSpots[i];
      drips[i].set(sp && t > park && t < fall ? 1 : 0);
      if (sp) drips[i].m.position.set(sp.x, 0.017, sp.z);
      const lit = t > T2.ignite && t < fall + 0.02 && set.knocked[i] === undefined;
      pfire[i].set('p', lit ? 1 : 0, 1); pfire[i].update(dt, t);
      const gf = ground[i], burning = sp && t > fall && t < T2.summer && set.knocked[i] === undefined;
      if (sp) gf.grp.position.set(sp.x, 0, sp.z);
      gf.fl.set('g', burning ? 1 - 0.3 * ramp(t, fall, fall + 1) : 0, 1); gf.fl.update(dt, t);
    });
  });
  set.hazards.push({ name: 'present fire', active: (t) => t > 138.0 && t < T2.summer, test: (x, z, r, t) => presents.some((g, i) => { const sp = set.hangSpots[i]; return sp && t > T2.falls[i] + 0.05 && set.knocked[i] === undefined && Math.hypot(x - sp.x, z - sp.z) < 0.8 + r; }) });

  // ------------------------------------------------ Father's Day: bunting, #1 DAD, the grill, the lawn chairs, the sprinkler
  const ban = Q.banner('#1 DAD', 5.4, 1.0); ban.position.set(0, 3.8, -8.05); R.add(ban);
  const bunts = [Q.bunting([-2.3, 1.2, -7.2], [2.3, 1.2, -7.2], 0.25, 14), Q.bunting([-11.0, 1.15, -7.0], [-11.0, 1.15, 3.3], 0.5, 26), Q.bunting([11.0, 1.15, -7.0], [11.0, 1.15, 3.3], 0.5, 26), Q.bunting([-5.2, 3.0, -8.0], [16, 3.0, -8.0], 0.35, 50)];
  for (const b of bunts) R.add(b);
  const grill = Q.grill(); grill.position.set(-7.0, 0, 1.5); R.add(grill);
  const chairs = [Q.lawnChair(0xe0b04a, 0xefe3cf), Q.lawnChair(0x5c1a1f, 0xefe3cf)];
  chairs[0].position.set(6.5, 0, 1.2); chairs[0].rotation.y = -2.6; chairs[1].position.set(7.6, 0, 0.4); chairs[1].rotation.y = -2.2;
  for (const c of chairs) R.add(c);
  chairs.forEach((c) => set.breakables.push({ x: c.position.x, z: c.position.z, r: 0.45, mesh: c, active: (t) => t > T2.summer + 0.4 && t < T2.garage, chips: new THREE.Color(2.4, 1.8, 0.8), onBreak: () => {} }));
  const summerOn = (t) => (t > T2.summer + 0.2 && t < T2.garage) || (t > T2.mortarFire && t < T2.finish + 0.5);
  piece((t) => {
    const k = back(ramp(t, T2.summer + 0.2, T2.summer + 0.5));
    for (const b of [...bunts, ban]) b.visible = summerOn(t);
    ban.scale.set(1, t < T2.garage ? Math.max(0.01, k) : 1, 1);
    grill.visible = t > T2.summer + 0.2 && t < T2.garage; grill.scale.setScalar(Math.max(0.001, k));
    for (const c of chairs) c.scale.setScalar(Math.max(0.001, k));
  });
  col({ type: 'circle', x: -7.0, z: 1.5, r: 0.5, active: (t) => t > T2.summer + 0.4 && t < T2.garage });
  blk({ r: 0.5, x: -7.0, z: 1.5, active: (t) => t > T2.summer + 0.4 && t < T2.garage });

  // ------------------------------------------------ Thanksgiving: the garage door flies up, the table slides out and swings into place
  const gdoor = Q.garageDoor(); gdoor.position.set(-8.25, 0, -7.45); R.add(gdoor);
  const table = Q.dinnerTable(); R.add(table);
  set.table = table;
  const chs = [];
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const c = Q.chair(); c.userData.home = { x: -3 + i * 2, z: -0.6 + s * 1.05, ry: s > 0 ? Math.PI : 0 }; R.add(c); chs.push(c); }
  const empty = Q.chair(true); empty.userData.home = { x: -4.6, z: -0.6, ry: Math.PI / 2 }; R.add(empty); chs.push(empty);
  set.emptyChair = empty;
  const tf = set.tableFire = new Flames(f.scene, table);
  for (const [x, y, z] of table.userData.candles) tf.add({ x, z, y, w: 0.12, h: 0.24, group: 'candles' });
  for (let x = -3.9; x <= 3.9; x += 0.32) tf.add({ x, z: (Math.random() - 0.5) * 1.2, y: 0.82, w: 0.9, h: 1.9, group: 'erupt', ignite: -1 });
  for (let x = -3.9; x <= 3.9; x += 0.5) for (const s of [-1, 1]) tf.add({ x: x + Math.random() * 0.3, z: s * (1.2 + Math.random() * 0.6), y: 0, w: 0.9, h: 1.5, group: 'erupt' });
  for (let x = -4.0; x <= 4.0; x += 0.25) tf.add({ x, z: 0, y: 0.82, w: 0.25, h: 0.3, group: 'runner', ignite: T2.blue + (x + 4) / 8 * 0.9 });
  tf.build();
  piece((t, dt) => {
    gdoor.position.y = 2.75 * ease(ramp(t, T2.garage, T2.garage + 0.35)); gdoor.rotation.x = -1.4 * ease(ramp(t, T2.garage, T2.garage + 0.35)); gdoor.position.z = -7.45 - 0.9 * ramp(t, T2.garage, T2.garage + 0.35);
    gdoor.visible = t < T2.garage + 0.36 || t > 999;
    // the table: out of the garage, down the driveway, swung round across the yard (lands 167.25); sinks burnt at 185.08
    let x = 0, z = -0.6, ry = 0, y = 0;
    if (t < T2.tableIn) { const k = ramp(t, T2.garage, T2.tableIn); if (k < 0.6) { const kk = ease(k / 0.6); x = -8.25; z = -8.6 + kk * 8.0; ry = Math.PI / 2; } else { const kk = ease((k - 0.6) / 0.4); x = -8.25 + kk * 8.25; z = -0.6; ry = Math.PI / 2 * (1 - kk); } }
    if (t > T2.tableOut) y = -1.4 * ease(ramp(t, T2.tableOut, T2.tableOut + 0.7));
    table.position.set(x, y, z); table.rotation.y = ry;
    table.visible = t > T2.garage && t < T2.tableOut + 0.7;
    const cin = back(ramp(t, T2.tableIn, T2.tableIn + 0.3));
    chs.forEach((c) => { const h = c.userData.home; c.position.set(h.x, y, h.z); c.rotation.y = h.ry; c.scale.setScalar(Math.max(0.001, cin)); c.visible = table.visible; });
    // fire on the table: lit tapers from 167.25, the blue runner at 182.20, the eruption at 183.65, out in the rain
    const candles = t > T2.tableIn && t < T2.tableUp ? (t < T2.ghost ? 1 : 1.25) : 0;
    tf.set('candles', candles, t < T2.tableIn + 0.4 ? 2.4 - 3.5 * (t - T2.tableIn) : 1);
    const er = t > T2.tableUp && t < T2.tableOut + 0.2 ? ramp(t, T2.tableUp, T2.tableUp + 0.1) * (1 - ramp(t, T2.rain + 0.2, T2.tableOut)) : 0;
    tf.set('erupt', er, 1 + 0.6 * Math.exp(-(t - T2.tableUp) * 4));
    tf.set('runner', t > T2.blue && t < T2.tableUp ? 0.7 : 0, 1);
    tf.update(dt, t);
  });
  col({ type: 'box', x: 0, z: -0.6, hx: 4.0, hz: 0.7, active: (t) => t > T2.tableIn - 0.05 && t < T2.tableOut + 0.2 });
  set.hazards.push({ name: 'table', active: (t) => t > T2.tableUp + 0.05 && t < T2.rain + 0.5, rect: [-4.3, -2.8, 4.3, 1.6] });
  // the gravy: two soaked bands along the table, a dashed outline round the table and both
  const gb = [soak(R, [-4.3, -2.8, 4.3, -1.3], 0.0135), soak(R, [-4.3, 0.1, 4.3, 1.6], 0.0136)], gOut = soak(R, [-4.3, -2.8, 4.3, 1.6], 0.0165);
  piece((t) => { const k = ramp(t, 179.4, 179.85) * (1 - ramp(t, T2.tableUp, T2.tableUp + 0.3)); gb.forEach((s) => { s.set(k, 0); s.u.uTime.value = t; }); gOut.set(0, t > 179.4 && t < T2.tableUp ? 1 : 0); gOut.u.uTime.value = t; });

  // ------------------------------------------------ snow: the first snow, bridge 1's big slow flakes, Christmas; ash and embers in the fire
  set.snowfall = makeSnow(R);
  piece((t, dt) => set.snowfall.update(t, dt));

  // ------------------------------------------------ the rain (184.37), frozen mid-air (195.06), falling all at once (197.55)
  set.rain = makeRain(R);
  piece((t, dt) => set.rain.update(t, dt));

  // ------------------------------------------------ the final chorus: the gold mortar, fireworks
  const mor = Q.mortar(); mor.position.set(0, -2, -4.5); R.add(mor);
  piece((t) => { mor.position.y = t < T2.freeze ? -2 : t < T2.mortarFire + 0.1 ? -1.6 * (1 - back(ramp(t, T2.freeze, T2.freeze + 0.45))) : -1.6 * ease(ramp(t, T2.mortarFire + 0.1, 198.26)); mor.visible = mor.position.y > -1.55; });
  col({ type: 'circle', x: 0, z: -4.5, r: 0.55, active: (t) => t > T2.freeze + 0.3 && t < T2.mortarFire + 0.3 });
  set.fireworks = makeFireworks(R);
  piece((t, dt) => set.fireworks.update(t, dt, f));

  // ------------------------------------------------ final 2: the silver cloche; its gold plate with one lit match
  const clo = Q.cloche(); clo.position.set(0, 16, 0); R.add(clo);
  const plate = Q.goldPlate(); plate.visible = false; plate.scale.setScalar(0.55); R.add(plate);
  const plf = new Flames(f.scene, plate); plf.add({ x: 0, z: 0, y: 0.72, w: 0.16, h: 0.3, group: 'm' }); plf.build();
  const fr2 = frost(R, 0, 0, 2.6);
  set.clocheSpot = set.clocheSpot || { x: 0, z: 2 };
  piece((t, dt) => {
    const s = set.clocheSpot;
    let y = 16;
    if (t > T2.cloche && t < T2.clocheSlam) { const k = ramp(t, T2.cloche, T2.cloche + 0.9); y = 16 - (16 - 8.6) * ease(k) + Math.sin(t * 3) * 0.08; if (t > T2.clocheSlam - 0.16) y = 8.6 * (1 - ((t - (T2.clocheSlam - 0.16)) / 0.16) ** 2); }
    else if (t >= T2.clocheSlam && t < T2.clocheLift) y = 0;
    else if (t >= T2.clocheLift) y = 16 * ease(ramp(t, T2.clocheLift, T2.clocheLift + 1.0));
    if (t > T2.cloche && t < T2.clocheLock && set.f.player) { s.x = set.f.player.x; s.z = set.f.player.z; }
    clo.position.set(s.x, y, s.z); clo.visible = y < 15.9;
    plate.position.set(s.x, 0, s.z); plate.visible = t > T2.clocheSlam && t < T2.finish + 0.4;
    plf.set('m', plate.visible ? 1 : 0, 1); plf.update(dt, t);
    fr2.m.position.set(s.x, 0.016, s.z); fr2.set(t > T2.clocheSlam ? 1 - ramp(t, T2.clocheSlam + 3, T2.clocheSlam + 9) : 0); fr2.u.uTime.value = t;
  });
  set.clocheShadow = set.pool(0, 0, 2.5, 0x0a0812, 'dark');
  piece((t) => { const s = set.clocheSpot; set.clocheShadow.mesh.position.set(s.x, 0.02, s.z); set.clocheShadow.set(t > T2.cloche + 0.3 && t < T2.clocheSlam ? 0.55 * ramp(t, T2.cloche + 0.3, T2.cloche + 1.2) : 0); });
  col({ type: 'circle', get x() { return set.clocheSpot.x; }, get z() { return set.clocheSpot.z; }, r: 2.4, active: (t) => t > T2.clocheSlam + 0.05 && t < T2.clocheLift });
  blk({ r: 2.5, get x() { return set.clocheSpot.x; }, get z() { return set.clocheSpot.z; }, active: (t) => t > T2.clocheSlam && t < T2.clocheLift });

  // ------------------------------------------------ the bulbs' life: on at 11.18, dead in the quiet, every bulb popped on "click"...
  piece((t) => {
    const u = B.u; u.uTime.value = t; const beatP = f.bm ? f.bm.pulse(t, 7) : 0;
    let eaves = 0, shrubs = 0, hedge = 0.6, porch = 0, pop = 0, flash = 0, chase = 0, pal = 'christmas';
    if (t > 11.178 && t < T2.marketOut) { eaves = 1; shrubs = 1; porch = 0.6; if (t < 11.6) { const k = ramp(t, 11.178, 11.54); eaves *= k > 0.5 ? 1 : 0.3; shrubs *= k; } }
    if (t > T2.marketOut && t < 59.6) { hedge = 0.35 * (1 - ramp(t, T2.marketOut, 47.2)); }
    if (t > 59.6 && t < 117.7) { hedge = 0; eaves = t > 93.84 ? 0.4 : 0; }
    if (t > T2.xmas && t < T2.click) { eaves = 1.15; shrubs = 1.1; hedge = 0.9; porch = 1; chase = 0.5; }
    if (t >= T2.click && t < T2.summer) { pop = 1.0; }
    if (t > T2.summer && t < T2.garage) { eaves = 0.25; shrubs = 0.25; hedge = 0.2; pal = 'dad'; }
    if (t > T2.garage && t < T2.ghost) { const bars = Math.floor(Math.max(0, f.bm.beatAt(t) - f.bm.beatAt(T2.garage)) / 4); pal = ['christmas', 'halloween', 'christmas', 'newyear', 'valentine', 'easter', 'july', 'dad'][Math.min(7, bars)]; eaves = 1.0; shrubs = 1.0; hedge = 0.7; porch = 1; flash = beatP * 0.5; }
    if (t > T2.ghost && t < T2.mortarFire) { eaves = 0; shrubs = 0; hedge = 0.15; porch = 0; }
    if (t > T2.mortarFire && t < T2.finish + 0.05) { pal = 'all'; eaves = 1.2; shrubs = 1.2; hedge = 1.0; porch = 1.2; flash = beatP * 1.2; chase = 0.6; }
    if (set._finished) { const ot = set.outroT(); pal = 'all'; eaves = 1; shrubs = 1; hedge = 0.8; porch = 1; pop = ramp(ot, 232.0, 239.6); }
    B.set(eaves, shrubs, hedge, porch); u.uPop.value = pop; u.uFlash.value = flash; u.uChase.value = chase;
    if (pal !== set._pal) { B.palette(pal); set._pal = pal; }
    // the street lamps snap on left to right at 11.18
    lampGlow[0].material.color.setRGB(1, 0.85, 0.63).multiplyScalar(t > 11.178 && (t < T2.click || t > T2.summer) ? 2.4 : 0.05);
    lampGlow[1].material.color.setRGB(1, 0.85, 0.63).multiplyScalar(t > 11.36 && (t < T2.click || t > T2.summer) ? 2.4 : 0.05);
  });
}

// ---------------------------------------------------------------- the rain rig: streaks falling over the yard
function makeRain(parent) {
  const N = 1800;
  const geo = new THREE.InstancedBufferGeometry();
  const q = new THREE.PlaneGeometry(1, 1); geo.index = q.index; geo.setAttribute('position', q.attributes.position); geo.setAttribute('uv', q.attributes.uv);
  const P0 = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) P0.set([-17 + Math.random() * 34, Math.random() * 12, -11 + Math.random() * 22, Math.random()], i * 4);
  geo.setAttribute('aP', new THREE.InstancedBufferAttribute(P0, 4)); geo.instanceCount = N;
  const u = { uT: { value: 0 }, uFall: { value: 0 }, uK: { value: 0 }, uFrozen: { value: 0 }, uDrop: { value: 0 }, uGlint: { value: new THREE.Vector3(0, 1, 0) } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
    vertexShader: `attribute vec4 aP; uniform float uT, uFall, uFrozen, uDrop; varying vec2 vUv; varying float vA; varying float vG; uniform vec3 uGlint;
      void main() { vUv = uv; float y = mod(aP.y - uFall * (1.0 + aP.w * 0.3), 12.0) - uDrop * (6.0 + aP.w * 6.0);
        vec3 p = vec3(aP.x, y, aP.z); vA = smoothstep(-0.5, 0.5, y) * (1.0 - smoothstep(10.0, 12.0, y));
        float len = mix(0.55, 0.06, uFrozen); vec4 mv = viewMatrix * vec4(p, 1.0);
        vG = uFrozen * pow(max(0.0, 1.0 - distance(p, uGlint) / 9.0), 2.0) * (0.5 + 0.5 * sin(aP.w * 60.0 + uT * 2.0));
        mv.xy += vec2(position.x * 0.025, position.y * len); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uK, uFrozen; varying vec2 vUv; varying float vA; varying float vG; void main() { float a = (1.0 - abs(vUv.x - 0.5) * 2.0) * vA * uK; if (a < 0.01) discard; vec3 c = mix(vec3(0.55, 0.62, 0.78), vec3(1.0, 0.7, 0.4), clamp(vG * 3.0, 0.0, 1.0)) * (0.35 + 2.5 * vG); gl_FragColor = vec4(c * a, 0.0); }` });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 9; parent.add(mesh);
  return {
    u, mesh,
    update(t) {
      const on = t > T2.rain && t < T2.mortarFire + 1.2;
      mesh.visible = on;
      if (!on) return;
      u.uT.value = t;
      u.uK.value = ramp(t, T2.rain, T2.rain + 0.3);
      // falling until 195.06, then held still in the air; at 197.55 it all falls at once
      const fallT = Math.min(t, T2.freeze) - T2.rain;
      u.uFall.value = fallT * 16;
      u.uFrozen.value = t > T2.freeze ? 1 : 0;
      u.uDrop.value = t > T2.mortarFire ? ease(ramp(t, T2.mortarFire, T2.mortarFire + 0.9)) : 0;
    },
  };
}

// ---------------------------------------------------------------- fireworks overhead (gold, coral, violet) on the beats
function makeFireworks(parent) {
  const N = 1400;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), base = new Float32Array(N * 3), vel = new Float32Array(N * 3), age = new Float32Array(N);
  age.fill(99);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, uniforms: {},
    vertexShader: 'attribute vec3 aCol; varying vec3 vC; void main() { vC = aCol; vec4 mv = viewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(1.0, 0.2 * 900.0 / -mv.z); }',
    fragmentShader: 'varying vec3 vC; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a *= a; if (a < 0.01 || max(vC.r, max(vC.g, vC.b)) < 0.01) discard; gl_FragColor = vec4(vC * a * 1.4, 0.0); }' });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 9; parent.add(pts);
  let next = 0, lastBurst = -1;
  const PAL = [new THREE.Color(3.0, 2.0, 0.6), new THREE.Color(3.0, 0.9, 0.6), new THREE.Color(1.8, 1.2, 3.0), new THREE.Color(2.6, 2.4, 2.0)];
  const fw = {
    burst(x, y, z, c, n = 220) {
      for (let i = 0; i < n; i++) {
        const k = next++ % N; const a = Math.random() * Math.PI * 2, e = Math.acos(2 * Math.random() - 1), s = 3.2 + Math.random() * 1.2;
        pos.set([x, y, z], k * 3); vel.set([Math.sin(e) * Math.cos(a) * s, Math.cos(e) * s, Math.sin(e) * Math.sin(a) * s], k * 3); age[k] = 0;
        base.set([c.r, c.g, c.b], k * 3);
      }
    },
    clear() { age.fill(99); },
    update(t, dt, f) {
      const on = t > T2.mortarFire - 0.05 && t < T2.finish;
      if (on && f.bm) {
        const b = Math.floor(f.bm.beatAt(t));
        if (b !== lastBurst && b % 2 === 0 && dt > 0) { lastBurst = b; const c = PAL[(b / 2) % PAL.length]; fw.burst(-7 + ((b * 5.3) % 14), 2.9 + (b % 3) * 0.35, -1.6 - (b % 3) * 0.9, c); f.fx.flash(c.clone().multiplyScalar(0.018), 1); }
      }
      if (dt <= 0) { if (!on) fw.clear(); }
      for (let i = 0; i < N; i++) {
        if (age[i] > 2.2) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; continue; }
        age[i] += dt; vel[i * 3 + 1] -= 3.0 * dt; for (let c = 0; c < 3; c++) { vel[i * 3 + c] *= Math.exp(-dt * 1.2); pos[i * 3 + c] += vel[i * 3 + c] * dt; }
        const fade = Math.max(0, 1 - age[i] / 2.2) ** 1.5 * (0.7 + 0.3 * Math.sin(age[i] * 40 + i));
        for (let c = 0; c < 3; c++) col[i * 3 + c] = base[i * 3 + c] * fade;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.aCol.needsUpdate = true;
    },
  };
  return fw;
}

// ---------------------------------------------------------------- snowfall (and, in the fire, ash and embers rising)
function makeSnow(parent) {
  const N = 1100;
  const geo = new THREE.BufferGeometry();
  const P0 = new Float32Array(N * 3), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) { P0.set([-16 + Math.random() * 32, Math.random() * 10, -11 + Math.random() * 22], i * 3); ph[i] = Math.random(); }
  geo.setAttribute('position', new THREE.BufferAttribute(P0, 3)); geo.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const u = { uT: { value: 0 }, uFall: { value: 0 }, uK: { value: 0 }, uSize: { value: 0.06 }, uCol: { value: new THREE.Color(0.95, 0.93, 0.9) }, uEmber: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
    vertexShader: `attribute float ph; uniform float uT, uFall, uSize, uEmber; varying float vA; varying float vP;
      void main() { vec3 p = position; float y = mod(p.y - uFall * (0.75 + ph * 0.5), 10.0);
        p.y = mix(y, 10.0 - y, uEmber); p.x += sin(uT * 0.7 + ph * 40.0) * 0.5; p.z += cos(uT * 0.5 + ph * 23.0) * 0.4;
        vA = smoothstep(0.0, 0.6, p.y) * (1.0 - smoothstep(8.5, 10.0, p.y)); vP = ph;
        vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uSize * (0.6 + ph * 0.8) * 900.0 / -mv.z; }`,
    fragmentShader: `uniform float uK, uEmber; uniform vec3 uCol; varying float vA; varying float vP;
      void main() { vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.1, length(d)) * vA * uK; if (a < 0.01) discard;
        vec3 c = mix(uCol, mix(vec3(1.0, 0.35, 0.08), vec3(0.5, 0.45, 0.45), step(0.6, vP)), uEmber); gl_FragColor = vec4(c * a, 0.0); }` });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 9; parent.add(pts);
  return {
    update(t) {
      // the first snow; bridge 1 (big, slow); Christmas (heavy) and bridge 2; ash and embers rising in the fire
      let k = 0, size = 0.055, speed = 0.7, ember = 0;
      if (t < 22.59) { k = 0.55; }
      else if (t > 46.8 && t < 60.35) { k = 0.75 * (1 - ramp(t, 58.21, 60.3) * 0.5); size = 0.085; speed = 0.45; }
      else if (t > 60.35 && t < 95.0) { k = 0.8; size = 0.05; speed = 1.1; ember = 1; }
      else if (t > 117.71 && t < 140.88) { k = t < 124.84 ? 0.9 : 0.6; size = 0.07; speed = 0.9; }
      pts.visible = k > 0.01;
      u.uT.value = t; u.uK.value = k; u.uSize.value = size; u.uEmber.value = ember; u.uFall.value = t * speed;
    },
  };
}
