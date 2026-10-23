// Nothing Happens Every Week. A sunny suburb on a Sunday, and a case built out of
// nothing: the dentist three times this week, his car halfway down her street, brunch in
// broad daylight, the market and the matinee. Red string between the lamp posts, the
// evidence pinned up like polaroids. In the end he makes his getaway at the speed limit,
// blinker on, past the edge of town, gone for good.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { extend, col, glowAt, poolAt, local, PASTEL } from './scenery.js';
import { tintMaterial, buildingMaterial } from './props.js';
import { prepare, groundAt, Terrain } from './trail.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (gs) => mergeGeometries(gs.map(ni), false);
const SIDE = (x) => (x > 0 ? Math.PI / 2 : -Math.PI / 2);

const SG = {
  // the dentist's sign: a big white tooth on a pole
  tooth() {
    const parts = [];
    const crown = new THREE.SphereGeometry(1.6, 24, 16); crown.scale(1.2, 0.78, 0.8); crown.translate(0, 9.7, 0); parts.push(crown);
    for (const x of [-0.85, 0.85]) {
      const cusp = new THREE.SphereGeometry(0.95, 16, 12); cusp.scale(1, 0.8, 0.85); cusp.translate(x, 10.45, 0); parts.push(cusp);
      const root = new THREE.CylinderGeometry(0.62, 0.16, 2.9, 14); root.rotateZ(-x * 0.16); root.translate(x * 1.12, 7.85, 0); parts.push(root);
    }
    return merge(parts);
  },
  toothPole() { const p = new THREE.CylinderGeometry(0.16, 0.2, 6.8, 8); p.translate(0, 3.4, 0); return p; },
  // a café table and two chairs
  table() {
    const parts = [];
    const top = new THREE.CylinderGeometry(0.55, 0.55, 0.05, 16); top.translate(0, 0.74, 0); parts.push(top);
    const leg = new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6); leg.translate(0, 0.36, 0); parts.push(leg);
    const foot = new THREE.CylinderGeometry(0.28, 0.3, 0.04, 12); foot.translate(0, 0.02, 0); parts.push(foot);
    for (const z of [-0.8, 0.8]) {
      const s = new THREE.BoxGeometry(0.42, 0.05, 0.42); s.translate(0, 0.46, z); parts.push(s);
      const b = new THREE.BoxGeometry(0.42, 0.45, 0.04); b.translate(0, 0.7, z + Math.sign(z) * 0.2); parts.push(b);
      for (const dx of [-0.18, 0.18]) for (const dz of [-0.18, 0.18]) { const l = new THREE.BoxGeometry(0.03, 0.46, 0.03); l.translate(dx, 0.23, z + dz); parts.push(l); }
    }
    return merge(parts);
  },
  // a market stall: a table of produce under a canopy
  stall() {
    const parts = [];
    const t = new THREE.BoxGeometry(3.2, 0.9, 1.4); t.translate(0, 0.45, 0); parts.push(t);
    for (const x of [-1.5, 1.5]) for (const z of [-0.65, 0.65]) { const p = new THREE.CylinderGeometry(0.04, 0.04, 2.6, 5); p.translate(x, 1.3, z); parts.push(p); }
    return merge(parts);
  },
  canopy() { const c = new THREE.BoxGeometry(3.6, 0.12, 2.0); c.rotateX(0.18); c.translate(0, 2.62, 0); return c; },
  produce() {
    const parts = [];
    for (let k = 0; k < 14; k++) { const b = new THREE.SphereGeometry(0.12 + (k % 3) * 0.02, 8, 6); b.translate(-1.3 + (k % 7) * 0.43, 0.98, -0.3 + Math.floor(k / 7) * 0.5); parts.push(b); }
    return merge(parts);
  },
  // the courthouse: steps, columns, a pediment
  courthouse() {
    const parts = [];
    for (let k = 0; k < 4; k++) { const s = new THREE.BoxGeometry(26 - k * 0.8, 0.5, 4 - k * 0.5); s.translate(0, 0.25 + k * 0.5, 9 - k * 0.25); parts.push(s); }
    const hall = new THREE.BoxGeometry(24, 14, 16); hall.translate(0, 9, -1); parts.push(hall);
    const ent = new THREE.BoxGeometry(24, 1.2, 6); ent.translate(0, 15.4, 8); parts.push(ent);
    for (let k = 0; k < 6; k++) { const c = new THREE.CylinderGeometry(0.75, 0.85, 12.6, 16); c.translate(-10 + k * 4, 8.6, 9.2); parts.push(c); }
    const ped = new THREE.CylinderGeometry(0.01, 13.5, 4, 3, 1); ped.rotateZ(Math.PI / 2); ped.rotateY(Math.PI / 2); ped.scale(1, 1, 0.48); ped.rotateX(0); ped.translate(0, 17.6, 8.2);
    parts.push(ped);
    return merge(parts);
  },
  // a big gilded frame, empty, on two posts: "I'll frame it hanging in the hall"
  frame() {
    const parts = [];
    // the moulding: an outer bar, a raised lip and an inner bead, all round
    for (const [w, h, x, y, d, z] of [[9, 0.7, 0, 9.7, 0.5, 0], [9, 0.7, 0, 3.3, 0.5, 0], [0.7, 7.1, -4.15, 6.5, 0.5, 0], [0.7, 7.1, 4.15, 6.5, 0.5, 0],
      [9.2, 0.2, 0, 10.05, 0.7, 0], [9.2, 0.2, 0, 2.95, 0.7, 0], [0.2, 7.3, -4.5, 6.5, 0.7, 0], [0.2, 7.3, 4.5, 6.5, 0.7, 0],
      [7.6, 0.12, 0, 9.33, 0.62, 0], [7.6, 0.12, 0, 3.67, 0.62, 0], [0.12, 5.8, -3.78, 6.5, 0.62, 0], [0.12, 5.8, 3.78, 6.5, 0.62, 0]]) {
      const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); parts.push(b);
    }
    return merge(parts);
  },
  frameWire() {
    const parts = [];
    for (const x of [-3.6, 3.6]) {
      const a = new THREE.Vector3(x, 10.2, -0.1), b = new THREE.Vector3(0, 40, -0.1), d = b.clone().sub(a);
      const w = new THREE.BoxGeometry(0.05, d.length(), 0.05); w.translate(0, d.length() / 2, 0);
      w.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); w.translate(a.x, a.y, a.z); parts.push(w);
    }
    return merge(parts);
  },
  // a main-street building: shop window and awning below (the city's store/awning layers fit
  // its front at z 7), a row or two of windows above, a cornice along the top
  mainst(floors) {
    const H = floors === 3 ? 12.9 : 9.5, parts = [];
    const body = new THREE.BoxGeometry(13.4, H, 14); body.translate(0, H / 2, 0); parts.push(body);
    const cor = new THREE.BoxGeometry(13.9, 0.7, 0.9); cor.translate(0, H - 0.1, 7.1); parts.push(cor);
    const belt = new THREE.BoxGeometry(13.6, 0.28, 0.3); belt.translate(0, 4.75, 7.1); parts.push(belt);
    for (const x of [-6.55, 6.55]) { const pil = new THREE.BoxGeometry(0.4, H - 0.4, 0.3); pil.translate(x, (H - 0.4) / 2, 7.1); parts.push(pil); }
    return merge(parts);
  },
  blade() { const g = new THREE.PlaneGeometry(7.5, 2.35); return g; },
  bladeArm() { const g = new THREE.BoxGeometry(0.08, 0.08, 1.6); g.translate(0, 0.7, 0); const r = new THREE.BoxGeometry(0.05, 1.4, 0.05); r.translate(0, 0, 0.75); return merge([g, r]); },
  roadPole() { const p = new THREE.CylinderGeometry(0.06, 0.06, 3.0, 6); p.translate(0, 1.5, -0.04); return p; },
  roadFace() { const g = new THREE.PlaneGeometry(1.3, 1.7); g.translate(0, 3.4, 0); return g; },
  mailbox() {
    const parts = [];
    const p = new THREE.BoxGeometry(0.1, 1.05, 0.1); p.translate(0, 0.52, 0); parts.push(p);
    const b = new THREE.CylinderGeometry(0.22, 0.22, 0.6, 10, 1, false, 0, Math.PI); b.rotateX(Math.PI / 2); b.rotateZ(Math.PI / 2); b.translate(0, 1.12, 0); parts.push(b);
    const base = new THREE.BoxGeometry(0.44, 0.24, 0.6); base.translate(0, 1.0, 0); parts.push(base);
    const flag = new THREE.BoxGeometry(0.03, 0.3, 0.08); flag.translate(0.24, 1.26, -0.1); parts.push(flag);
    return merge(parts);
  },
  // one length of red string, along +z, 1 m (scaled to fit between two posts)
  thread() { const g = new THREE.BoxGeometry(0.035, 0.035, 1); g.translate(0, 0, 0.5); return g; },
  pin() { const g = new THREE.SphereGeometry(0.12, 8, 6); return g; },
  // the edge of town: a green sign on two posts
  townSign() {
    const parts = [];
    for (const x of [-3.2, 3.2]) { const p = new THREE.BoxGeometry(0.22, 6.2, 0.22); p.translate(x, 3.1, -0.12); parts.push(p); }
    return merge(parts);
  },
  townFace() { const g = new THREE.PlaneGeometry(8.4, 2.9); g.translate(0, 4.6, 0); return g; },
};

// brick, cream and painted fronts; striped-cloth colours for the awnings
const FACADES = [0xa8543e, 0xe6d8bc, 0x9aae96, 0x8aa2bc, 0xd4ac5c, 0x8a5a46, 0xc88a74, 0xe8e0d0];
const AWNINGS = [0x2a5a3a, 0x8a2030, 0x204a6a, 0xd86a3a, 0xf2efe6, 0x3a3a46];
// a zone can keep a stretch clear, on one side, for a set-piece: clear: [[t0, t1, side], ...]
const cleared = (z, t, side, all) => (z.clear || []).some(([a, b, sd, how]) => t > a && t < b && (!sd || sd === side) && (!all || how === 'all'));

// kits here put things on the town's own ground, which rises and falls with the song
function onGround(S) {
  const c = S.course; prepare(c, S.plan);
  return (it) => { if (it.h === undefined) it.h = groundAt(c, it.t, it.x); S.items.push(it); return it; };
}

const TT = { aTint: 3 };
extend({
  layers: {
    mainst2: (M) => [SG.mainst(2), M.mainst || (M.mainst = buildingMaterial(M.P, [2.6, 3.4], { floors: 2, sill: 5.6 })), 160, { aWake: 3, aTint: 3 }],
    mainst3: (M) => [SG.mainst(3), M.mainst || (M.mainst = buildingMaterial(M.P, [2.6, 3.4], { floors: 2, sill: 5.6 })), 160, { aWake: 3, aTint: 3 }],
    wallSign: (M) => [SG.blade(), M.sign, 200, { aIdx: 1, aWake: 2 }],
    bladeArm: (M) => [SG.bladeArm(), M.metal, 200, TT],
    tooth: (M) => [SG.tooth(), M.enamel || (M.enamel = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0xfff8f0, emissiveIntensity: 0.22 })), 8, {}],
    toothPole: (M) => [SG.toothPole(), M.metal, 8, TT],
    frameWire: (M) => [SG.frameWire(), M.metal, 3, TT],
    cafeTable: (M) => [SG.table(), M.metal, 80, TT],
    stall: (M) => [SG.stall(), M.wood, 40, TT],
    canopy: (M) => [SG.canopy(), M.cloth, 40, TT],
    produce: (M) => [SG.produce(), M.cloth, 40, TT],
    courthouse: (M) => [SG.courthouse(), M.concrete, 3, TT],
    frame: (M) => [SG.frame(), M.gold || (M.gold = tintMaterial(0xffffff, { rough: 0.32, metal: 0.25, emissive: 0x7a5214 })), 3, TT],
    roadPole: (M) => [SG.roadPole(), M.metal, 60, TT],
    roadFace: (M) => [SG.roadFace(), M.sign, 60, { aIdx: 1, aWake: 2 }],
    mailbox: (M) => [SG.mailbox(), M.metal, 300, TT],
    thread: (M) => [SG.thread(), M.threadM || (M.threadM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff1a28).multiplyScalar(1.3) })), 900, {}],
    pin: (M) => [SG.pin(), M.threadM || (M.threadM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff1a28).multiplyScalar(1.3) })), 300, {}],
  },
  parts: {
    tooth(S, it, p, q) {
      const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, s, s)); S.layers.toothPole.add(m, { aTint: [0.7, 0.72, 0.76] }); S.layers.tooth.add(m);
    },
    cafeTable(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1.2, 1.2, 1.2)); S.layers.cafeTable.add(m, { aTint: [0.85, 0.85, 0.82] }); },
    stall(S, it, p, q) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1));
      S.layers.stall.add(m, { aTint: [0.62, 0.46, 0.3] }); S.layers.canopy.add(m, { aTint: it.tint }); S.layers.produce.add(m, { aTint: it.fruit });
    },
    courthouse(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.courthouse.add(m, { aTint: [0.92, 0.9, 0.86] }); },
    frame(S, it, p, q) { const m = S._m, s = it.s ?? 1; m.compose(p, q, S._s.set(s, it.sy ?? s, s)); S.layers.frame.add(m, { aTint: [1, 0.78, 0.36] }); S.layers.frameWire.add(m, { aTint: [0.12, 0.1, 0.08] }); },
    // a road sign, turned to you a little
    roadsign(S, it, p) {
      const h = S.course.sample(it.t).yaw;
      S._e.set(0, h + Math.PI + (it.x > 0 ? -0.35 : 0.35), 0); const fq = S._q2 ? S._q2.setFromEuler(S._e) : (S._q2 = new THREE.Quaternion().setFromEuler(S._e));
      const m = S._m; m.compose(p, fq, S._s.set(it.s ?? 1.6, it.s ?? 1.6, it.s ?? 1.6));
      S.layers.roadPole.add(m, { aTint: [0.6, 0.62, 0.66] }); S.layers.roadFace.add(m, { aIdx: it.idx, aWake: [0.55, 0] });
    },
    // a shop on the main street: the window and the awning, its name over the door, and
    // every other one a sign hung out over the sidewalk, turned to you
    mainst(S, it, p, q, yaw) {
      const m = S._m, s = it.s ?? 1;
      m.compose(p, q, S._s.set(s, 1, 1)); S.layers[it.tall ? 'mainst3' : 'mainst2'].add(m, { aWake: [it.wakeNow, it.seed, 0], aTint: it.tint });
      S.layers.store.add(m, { aWake: [0.2 + 0.8 * it.wakeNow, (it.seed * 7.31) % 1, 0] });
      S.layers.awning.add(m, { aTint: it.awning });
      if (it.idx === undefined) return;
      const w = local(p, yaw, 0, 5.25, 7.27, S._o);
      m.compose(w, q, S._s.set(0.62, 0.62, 1)); S.layers.wallSign.add(m, { aIdx: it.idx, aWake: [0.5 + 0.5 * it.wakeNow, 0] });
      if (!it.blade) return;
      const b = local(p, yaw, 4.6 * s * (it.x > 0 ? 1 : -1), 6.9, 8.0, S._o);
      const h = S.course.sample(it.t).yaw;
      S._e.set(0, h + Math.PI + (it.x > 0 ? -0.25 : 0.25), 0); const fq = (S._q3 || (S._q3 = new THREE.Quaternion())).setFromEuler(S._e);
      m.compose(b, fq, S._s.set(0.4, 0.4, 1)); S.layers.wallSign.add(m, { aIdx: it.idx, aWake: [0.5 + 0.5 * it.wakeNow, 0] });
      S._o.y += 0.5; m.compose(S._o, q, S._s.set(1, 1, 1)); S.layers.bladeArm.add(m, { aTint: [0.18, 0.18, 0.2] });
    },
    mailbox(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.mailbox.add(m, { aTint: it.tint }); },
    // a lamp post with the red string run from it to the next one, pinned at the top
    stringPost(S, it, p, q, yaw) {
      const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.lamp.add(m, { aTint: [0.25, 0.26, 0.3] });
      const top = S._o.set(p.x, p.y + 7.2, p.z);
      m.makeTranslation(top.x, top.y, top.z); S.layers.pin.add(m);
      if (!it.next || !S.track || it.t > (S.tNow ?? 0) + 18) return;
      const n = S.track.ground(it.next.t, it.next.x, S._n || (S._n = new THREE.Vector3())); n.y = (it.next.h ?? 0) + 7.2;
      // two lengths, sagging in the middle
      const mid = S._mid || (S._mid = new THREE.Vector3());
      mid.copy(top).add(n).multiplyScalar(0.5); mid.y -= 1.1;
      for (const [a, b] of [[top, mid], [mid, n]]) {
        const d = S._d || (S._d = new THREE.Vector3()); d.copy(b).sub(a);
        const len = d.length(); if (len < 0.01) continue;
        const qq = S._qq || (S._qq = new THREE.Quaternion());
        qq.setFromUnitVectors(S._zAxis || (S._zAxis = new THREE.Vector3(0, 0, 1)), d.normalize());
        m.compose(a, qq, S._s.set(1, 1, len)); S.layers.thread.add(m);
      }
    },
  },
  kits: {
    // houses on lawns, picket fences and mailboxes, big trees, a few cars in driveways
    sundaystreet(S, zz, R) {
      const z = zz; const push = onGround(S);
      const roofs = [0x8a4a3a, 0x4a4a5a, 0x5a3a3a, 0x3a4a5a, 0x6a5a4a];
      const greens = [[0.95, 1, 0.9], [1.05, 1, 0.85], [0.9, 1.05, 0.95]];
      for (const side of [-1, 1]) {
        for (let t = z.from + R() * 0.2; t < z.to; t += 0.42 + R() * 0.2) {
          const x = side * (21 + R() * 4);
          if (cleared(z, t, side, true)) continue;
          push({ t, x, rot: SIDE(side), s: 0.95 + R() * 0.3, parts: 'house', tint: col(pick(R, PASTEL)), roofTint: col(pick(R, roofs)), seed: R(), wake0: 0.05 });
          if (cleared(z, t, side)) continue;
          push({ t, x: side * 14.6, rot: 0, s: 1.25, parts: 'fence', tint: col(0xf4f2ee) });
          if (R() < 0.7) push({ t: t + 0.06, x: side * 13.6, rot: SIDE(side), parts: 'mailbox', tint: col(pick(R, [0x2a2a30, 0xe8e4dc, 0x2a4a8a, 0x8a2a2a])) });
          if (R() < 0.35) push({ t: t + 0.12, x: side * 17.5, rot: SIDE(side) + Math.PI / 2 + (R() - 0.5) * 0.1, parts: 'parked', tint: col(pick(R, PASTEL)) });
          if (R() < 0.6) push({ t: t + 0.2, x: side * (16 + R() * 3), rot: R() * 6.28, s: 0.75 + R() * 0.35, sy: 0.9 + R() * 0.3, parts: 'oak', tint: pick(R, greens), ahead: 30 });
          if (R() < 0.6) push({ t: t + R() * 0.3, x: side * (36 + R() * 14), rot: SIDE(side), s: 0.85 + R() * 0.3, parts: 'house', tint: col(pick(R, PASTEL)), roofTint: col(pick(R, roofs)), seed: R(), wake0: 0.05 });
          if (R() < 0.5) push({ t: t + R() * 0.3, x: side * (52 + R() * 90), rot: R() * 6.28, s: 0.9 + R() * 0.5, parts: R() < 0.3 ? 'fir' : 'oak', tint: pick(R, greens), ahead: 40 });
        }
      }
      if (!z.string) for (let t = z.from; t < z.to; t += 0.62) for (const side of [-1, 1]) push({ t, x: side * 11, rot: SIDE(side), parts: 'lamp', seed: R(), dim: 0.1 });
    },
    // the main street: shops with their signs, more trees, the occasional bench
    mainstreet(S, z, R) {
      const push = onGround(S);
      const signs = z.signs || ['BARBER', 'PHARMACY', 'FLORIST', 'HARDWARE', 'BAKERY'];
      const greens = [[0.95, 1, 0.9], [1.05, 1, 0.85], [0.9, 1.05, 0.95]];
      const roofs = [0x8a4a3a, 0x4a4a5a, 0x5a3a3a, 0x3a4a5a];
      for (const side of [-1, 1]) {
        // one building after another, a gap now and then
        let k = 0;
        for (let t = z.from + R() * 0.2; t < z.to; ) {
          const s = 0.92 + R() * 0.16;
          if (!cleared(z, t, side)) push({ t, x: side * 20.2, rot: SIDE(side), s, parts: 'mainst', tall: R() < 0.3, tint: col(pick(R, FACADES)), awning: col(pick(R, AWNINGS)), seed: R(), idx: S.atlas.index[signs[k % signs.length]], blade: R() < 0.55, wake0: 0.1 });
          k++;
          t += 0.215 * s + (R() < 0.12 ? 0.12 : 0.004);
        }
        for (let t = z.from + R() * 0.4; t < z.to; t += 0.55 + R() * 0.4) {
          if (R() < 0.55) push({ t, x: side * (36 + R() * 8), rot: SIDE(side), s: 0.85 + R() * 0.25, parts: 'house', tint: col(pick(R, PASTEL)), roofTint: col(pick(R, roofs)), seed: R(), wake0: 0.05 });
          push({ t: t + 0.25, x: side * (32 + R() * 30), rot: R() * 6.28, s: 0.8 + R() * 0.4, parts: R() < 0.25 ? 'fir' : 'oak', tint: pick(R, greens), ahead: 40 });
        }
      }
      if (!z.string) for (let t = z.from; t < z.to; t += 0.62) for (const side of [-1, 1]) push({ t, x: side * 11, rot: SIDE(side), parts: 'lamp', seed: R(), dim: 0.1 });
    },
    // the red string: lamp posts both sides, a length of it to the next post
    evidence(S, z, R) {
      const push = onGround(S);
      for (const side of [-1, 1]) {
        let prev = null;
        for (let t = z.from; t < z.to; t += 0.62) {
          const it = { t, x: side * 11, rot: SIDE(side), parts: 'stringPost', seed: R() };
          if (prev) prev.next = it;
          push(it); prev = it;
        }
      }
    },
    tooth(S, z, R) {
      const push = onGround(S);
      const at = [].concat(z.at), x = z.x ?? 14.5;
      at.forEach((t, k) => push({ t, x: (k % 2 ? -1 : 1) * x, rot: R() * 6.28, s: z.s ?? 1.5, parts: 'tooth', ahead: 34 }));
      const last = at[at.length - 1];
      push({ t: last + 0.22, x: 20.2, rot: SIDE(1), s: 1, parts: 'mainst', tint: col(0xeef4f6), awning: col(0x2a6ad8), seed: 0.37, idx: S.atlas.index.DENTIST, blade: true, wake0: 0.2 });
    },
    cafe(S, z, R) {
      const push = onGround(S);
      const side = Math.sign(z.x ?? -1);
      push({ t: z.at, x: side * 20.2, rot: SIDE(side), s: 1.05, parts: 'mainst', tint: col(0xf6e3b4), awning: col(0xff5a3a), seed: 0.02, idx: S.atlas.index.BRUNCH, blade: true, wake0: 0.4 });
      for (let k = 0; k < 10; k++) {
        const t = z.at - 0.5 + k * 0.11, x = side * (13.5 + (k % 2) * 2.4);
        push({ t, x, rot: R() * 0.5, parts: 'cafeTable' });
        push({ t, x, rot: R() * 6.28, s: 0.85, parts: 'umbrella', tint: col(pick(R, [0xff6f6f, 0xffffff, 0x4a9adf, 0xffd166])) });
      }
    },
    market(S, z, R) {
      const push = onGround(S);
      const tints = [[0.9, 0.2, 0.25], [0.95, 0.95, 0.92], [0.2, 0.55, 0.3], [0.95, 0.75, 0.2], [0.3, 0.45, 0.85]];
      const fruit = [[1, 0.35, 0.2], [0.9, 0.8, 0.2], [0.4, 0.8, 0.3], [0.85, 0.2, 0.35]];
      for (let t = z.from; t < z.to; t += 0.24) for (const side of [-1, 1]) if (R() < 0.8) push({ t: t + R() * 0.05, x: side * (13.5 + R() * 1.5), rot: SIDE(side) + (R() - 0.5) * 0.15, parts: 'stall', tint: pick(R, tints), fruit: pick(R, fruit) });
    },
    matinee(S, z, R) {
      const push = onGround(S);
      const side = Math.sign(z.x ?? 1);
      push({ t: z.at, x: side * 30, rot: SIDE(side), s: 1.6, sy: 0.55, parts: 'block', tint: col(0x8a5a6a), seed: R(), wake0: 0.6, keepLit: true });
      push({ t: z.at - 0.8, x: side * 17, s: 1.2, parts: 'sign', idx: S.atlas.index.MATINEE, seed: R(), wake0: 1, keepLit: true });
    },
    courthouse(S, z, R) {
      const push = onGround(S);
      const side = Math.sign(z.x ?? 1);
      push({ t: z.at, x: side * (z.dist ?? 40), rot: SIDE(side), parts: 'courthouse', ahead: 40 });
      push({ t: z.at - 1.2, x: side * 16, s: 1, parts: 'sign', idx: S.atlas.index.COURT, seed: R(), wake0: 1, keepLit: true });
    },
    bigframe(S, z, R) {
      const s = z.s ?? 2.5, sy = z.sy ?? s, y = S.course.sample(z.at).y;
      S.items.push({ t: z.at, x: 0, rot: 0, s, sy, h: y - 1.4 - 3.65 * sy, parts: 'frame', ahead: 30 });
    },
    // the last few houses, further apart, then nothing
    sundayedge(S, z, R) {
      const push = onGround(S);
      const greens = [[0.95, 1, 0.9], [1.05, 1, 0.85]];
      for (const side of [-1, 1]) for (let t = z.from + R() * 0.3; t < z.to; t += 0.8 + R() * 0.9) {
        if (R() < 0.6) push({ t, x: side * (24 + R() * 10), rot: SIDE(side), s: 0.85 + R() * 0.2, parts: 'house', tint: col(pick(R, PASTEL)), roofTint: col(0x5a3a3a), seed: R(), wake0: 0.05 });
        push({ t: t + 0.3, x: side * (14 + R() * 40), rot: R() * 6.28, s: 0.8 + R() * 0.5, parts: R() < 0.35 ? 'fir' : 'oak', tint: pick(R, greens), ahead: 34 });
      }
      for (let t = z.from; t < z.to; t += 0.5) for (const side of [-1, 1]) push({ t, x: side * 9.5, rot: 0, s: 1.25, parts: 'fence', tint: col(0xe8e4dc) });
    },
    fields(S, z, R) {
      const push = onGround(S);
      const greens = [[0.95, 1, 0.85], [1.1, 1, 0.75]];
      for (let t = z.from; t < z.to; t += 0.35 + R() * 0.5) { const side = R() < 0.5 ? -1 : 1; push({ t, x: side * (14 + Math.pow(R(), 1.3) * 120), rot: R() * 6.28, s: 0.8 + R() * 0.6, parts: R() < 0.3 ? 'fir' : 'oak', tint: pick(R, greens), ahead: 40 }); }
      for (let t = z.from; t < z.to; t += 0.5) for (const side of [-1, 1]) push({ t, x: side * 8.5, rot: 0, s: 1.25, parts: 'fence', tint: col(0xd8d0c0) });
    },
    speedsigns(S, z, R) { const push = onGround(S); for (let t = z.from; t < z.to; t += z.every ?? 2.4) push({ t, x: 10.5, s: 1.6, parts: 'roadsign', idx: S.atlas.index.SPEED, ahead: 16 }); },
  },
});

// ---------- the edge of town ----------
function townTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 354;
  const g = c.getContext('2d');
  g.fillStyle = '#0b5d3b'; g.fillRect(0, 0, 1024, 354);
  g.strokeStyle = '#f2f2ea'; g.lineWidth = 10; g.strokeRect(16, 16, 992, 322);
  g.fillStyle = '#f2f2ea'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 132px "Arial Narrow", Arial, sans-serif'; g.fillText('NOW LEAVING', 512, 140);
  g.font = '600 64px "Arial Narrow", Arial, sans-serif'; g.fillText('DRIVE SAFELY', 512, 262);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export class TownLineFinale {
  constructor(scene, course, P, cfg, scenery) {
    this.course = course; this.cfg = cfg; this.S = scenery; this.P = P;
    this.t = cfg.t; this.x = cfg.x ?? 12;
    this.group = new THREE.Group(); scene.add(this.group); this.group.scale.setScalar(cfg.s ?? 1);
    const posts = new THREE.Mesh(SG.townSign(), new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.5, metalness: 0.6 }));
    const tex = townTexture();
    this.faceMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.32 });
    const face = new THREE.Mesh(SG.townFace(), this.faceMat);
    const back = new THREE.Mesh(SG.townFace(), new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: 0.6 })); back.rotation.y = Math.PI; back.position.z = -0.02;
    this.group.add(posts, face, back);
    this.lit = 0; this.fired = false;
    this._p = new THREE.Vector3();
  }
  fire() { this.fired = true; }
  update(track, rider, songT) {
    const p = track.ground(this.t, this.x, this._p);
    p.y = groundAt(this.course, this.t, this.x);
    this.group.position.copy(p);
    this.group.rotation.y = this.course.sample(this.t).yaw + Math.PI + (this.x > 0 ? -0.45 : 0.45);
  }
}

// the town's ground: lawns on a long hill that goes up and down with the song
export class SundayWorld {
  constructor(scene, S) {
    this.S = S;
    this.terrain = new Terrain(scene, S.course, S.P, S.plan);
    const u = this.terrain.mat.uniforms; u.uPath.value = 0; u.uLawn.value = 1; u.uDry.value = 0.35; u.uWood.value = 0;
    const c = S.course;
    if (S.town) S.town.floorFn = (t, x) => groundAt(c, t, x);
    if (S.town) for (const r of S.town.roadMeshes) r.floorFn = S.town.floorFn;
  }
  update(S, dt, camera) { this.terrain.update(S.track, S.rider, S.P, camera, 0); this.terrain.mat.uniforms.uWood.value = 0; }
}
