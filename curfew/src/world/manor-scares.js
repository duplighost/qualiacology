// CURFEW — manor-scares: the five things in Blackthorn Manor that belong to no other house.
//
// Alex, 2026-09-18: "black thorn manner is so empty. also where are the unique scary things?"
// and "make it so there are beautifully horrifying things that make my stomach drop or my
// heart beat rapidly irl around each corner."
//
// The house's own lore is the script (lore/catalog.js, Vera's ledger): a masque on Halloween,
// the guests who stayed for breakfast when the morning did not come, every clock stopped at
// one fifty-nine, and Lucian going down to throw the cellar breaker himself. manor.js dresses
// the rooms around that (the table still laid, the coats still on the rail). This file owns
// the five things in them that MOVE, each anchored to a room in manor-data.js SCARES:
//
//   THE MASQUE      the ballroom. Three couples mid-waltz. Every time you have looked away
//                   for a second, one more masked head has turned to watch you. When all six
//                   are on you and you look back: a soft 'witnessed' and the house goes quiet.
//   THE HORSE       the nursery. The rocking horse is already rocking when you come in, and
//                   settles. A child laughs once, from under the bed by the wall.
//   LADY CONSTANCE  her room. Somebody is in her bed, breathing under the cover, hair on the
//                   pillow. Come close and the breathing stops dead. Leave, and when you come
//                   back the covers are thrown back and the bed is empty. For good.
//   LUCIAN          the Cellar. A man in evening dress with his face in the corner, 1.6 m
//                   from the breaker he threw. To restore the light you turn your back on him.
//                   When the lights come up he is not there, and he never is again.
//   THE SUNRISE     the portrait gallery. Every canvas has been turned to the wall but one,
//                   and that one is a sunrise. Look at it, look away: you hear the wire creak,
//                   and it has been turned to the wall like the rest.
//
// Rules this file keeps: no light, no prompt, no new program (every mesh is places.matPeople,
// the county's cloth Lambert), no Math.random and no timers but sim-time accumulators; the
// step allocates nothing and makes at most ONE collision.segmentClear a step (the scare the
// player is nearest to gets it); every animation is written in present() from what step()
// latched; nothing hovers (every part is built on the floor, bed or wall it touches) and
// everything you could walk into has its collider for exactly as long as it is there.
// Saved state is three world flags, absent by default: 'manor:constance-up',
// 'manor:lucian-gone', 'manor:sunrise-turned'.

import * as THREE from 'three';
import { SCARES, LV } from './manor-data.js';
import { HX, HZ, LIFT, CLOTH_GAIN } from './manor.js';
import { Kit } from './sites.js';
import { projectPlaceSurfaceUVs } from './place-surfaces.js';

const SITE = 'blackthorn-manor';
const NEAR = 70;                     // m from the site centre: beyond it nothing here steps

// cloth tones, pre-scaled like manor.js's cloth channel so a dancer and a guest match
const g = (c) => [c[0] * CLOTH_GAIN, c[1] * CLOTH_GAIN, c[2] * CLOTH_GAIN];
const COL = {
  coat: g([0.030, 0.029, 0.032]), gown: g([0.105, 0.040, 0.070]), gown2: g([0.040, 0.062, 0.090]),
  gown3: g([0.160, 0.140, 0.120]), shirt: g([0.255, 0.246, 0.222]), skin: g([0.215, 0.170, 0.140]),
  hair: g([0.035, 0.028, 0.024]), mask: g([0.330, 0.318, 0.292]), gilt: g([0.200, 0.155, 0.085]),
  slit: g([0.012, 0.011, 0.012]), shoe: g([0.030, 0.022, 0.018]),
  blanket: g([0.060, 0.074, 0.110]), linen: g([0.255, 0.246, 0.222]),
  horse: g([0.285, 0.272, 0.250]), dapple: g([0.160, 0.155, 0.150]), mane: g([0.050, 0.038, 0.030]),
  saddle: g([0.150, 0.045, 0.040]), runner: g([0.140, 0.105, 0.070]),
  frame: g([0.300, 0.240, 0.100]), board: g([0.180, 0.135, 0.092]), batten: g([0.120, 0.090, 0.066]),
  sky0: g([0.020, 0.024, 0.052]), sky1: g([0.050, 0.050, 0.100]), sky2: g([0.170, 0.090, 0.090]),
  glow: g([0.360, 0.190, 0.080]), sun: g([0.400, 0.330, 0.170]), land: g([0.020, 0.030, 0.022]),
  wire: g([0.100, 0.100, 0.110]),
};

/* ----------------------------------------------------------------- building -- */
// Every builder below works in a thing's OWN frame: +z is where it faces (a dancer's front,
// the horse's nose, the head of the bed, a canvas's painted side), +x its left as it faces,
// y up from the floor it stands on. The mesh is then placed with rotation.y = yaw, which
// sends that +z to (sin yaw, cos yaw).
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _q = new THREE.Quaternion();
function box(k, col, x, y, z, w, h, d, rx, ry, rz) { k.box(w, h, d, x, y, z, col, ry || 0, rx || 0, rz || 0); }
function ball(k, col, x, y, z, r, sx, sy, sz) {
  const geo = new THREE.SphereGeometry(r, 12, 9); geo.scale(sx || 1, sy || 1, sz || 1); k.at(geo, col, x, y, z);
}
/** A limb (a tapered cylinder) from a to b. Build time only. */
function limb(k, col, a, b, r0, r1) {
  _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _d.length();
  const geo = new THREE.CylinderGeometry(r1 || r0, r0, len, 8);
  geo.applyQuaternion(_q.setFromUnitVectors(_up, _d.normalize()));
  geo.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  k.push(geo, col);
}
function finish(k, scale) { const geo = k.build(); if (geo) projectPlaceSurfaceUVs(geo, scale || 0.6); return geo; }

/** A dancer's body, below the neck. `lady`: a gown and her hands on his shoulders; otherwise
 *  a tailcoat and his arms round her waist. The partner stands 0.60 m ahead on +z. */
function dancerBody(k, lady, tone) {
  if (lady) {
    const geo = new THREE.ConeGeometry(0.46, 1.02, 16, 1, false); geo.translate(0, 0.51, 0); k.push(geo, tone);
    const bod = new THREE.CylinderGeometry(0.15, 0.11, 0.46, 12); bod.scale(1, 1, 0.7); bod.translate(0, 1.19, 0); k.push(bod, tone);
    for (const sx of [-1, 1]) ball(k, tone, sx * 0.14, 1.38, 0.01, 0.05);
    for (const sx of [-1, 1]) {
      limb(k, tone, [sx * 0.17, 1.38, 0.02], [sx * 0.2, 1.42, 0.3], 0.045, 0.04);        // upper arm, out to him
      limb(k, COL.skin, [sx * 0.2, 1.42, 0.3], [sx * 0.21, 1.47, 0.46], 0.035, 0.03);    // forearm onto his shoulder
    }
    limb(k, COL.skin, [0, 1.42, 0], [0, 1.52, 0.01], 0.042);
    return;
  }
  for (const sx of [-1, 1]) {
    box(k, COL.coat, sx * 0.095, 0.44, 0, 0.14, 0.88, 0.15);
    box(k, COL.shoe, sx * 0.095, 0.035, 0.05, 0.11, 0.07, 0.27);
    limb(k, COL.coat, [sx * 0.23, 1.42, 0.0], [sx * 0.26, 1.2, 0.26], 0.05, 0.045);       // upper arm, forward
    limb(k, COL.coat, [sx * 0.26, 1.2, 0.26], [sx * 0.2, 1.17, 0.52], 0.045, 0.04);        // forearm round her waist
  }
  const tor = new THREE.CylinderGeometry(0.22, 0.17, 0.62, 12); tor.scale(1, 1, 0.62); tor.translate(0, 1.17, 0); k.push(tor, COL.coat);
  for (const sx of [-1, 1]) ball(k, COL.coat, sx * 0.21, 1.43, 0, 0.065);
  box(k, COL.coat, 0, 0.72, -0.1, 0.34, 0.36, 0.05, 0.08);                                 // the tails
  box(k, COL.shirt, 0, 1.32, 0.134, 0.13, 0.24, 0.01);
  limb(k, COL.skin, [0, 1.47, 0], [0, 1.57, 0.01], 0.045);
}
/**
 * A masked head centred on its own pivot (the neck top), facing +z. r3 polish: the old one was
 * a pale or yellow disc with two 13 mm slits and read as a sleepy smiley face, which is the one
 * thing the masque cannot be. Now the pale mask is a full volto with a nose ridge, the gilt
 * one a half mask of old gilt over the bare face; both have almond eye holes 5 x 2.8 cm set
 * INTO the curve (each turned to the surface under it) and a black ribbon round the back of
 * the head, and nothing below the eyes reads as a mouth. The same build as manor.js maskFace.
 */
function maskedHead(k, lady, gilt, beak) {
  const r = lady ? 0.1 : 0.11, cy = r * 0.95, fc = 0.045;
  const FX = r * 0.94 * 1.02, FY = r * 0.94 * 1.08, FZ = r * 0.94 * 0.62;
  const EY = r * 0.3, EX = r * 0.37;
  const half = (py) => FX * Math.sqrt(Math.max(0, 1 - (py / FY) ** 2));
  ball(k, COL.hair, 0, cy, -0.005, r, 1, 1.06, 1);
  ball(k, gilt ? COL.skin : COL.mask, 0, cy, fc, r * 0.94, 1.02, 1.08, 0.62);
  let ax = half(EY), cz = ax * FZ / FX;
  if (gilt) {
    const yB = r * 0.07, yT = r * 0.6, rB = half(yB) * 1.05, rT = half(yT) * 1.05;
    const geo = new THREE.CylinderGeometry(rT, rB, yT - yB, 18, 1, false, -Math.PI * 0.45, Math.PI * 0.9);
    geo.scale(1, 1, FZ / FX); geo.translate(0, cy + (yB + yT) / 2, fc); k.push(geo, COL.gilt);
    ax = rB + (rT - rB) * (EY - yB) / (yT - yB); cz = ax * FZ / FX;
  } else {
    const nz = fc + FZ * Math.sqrt(1 - (0.012 / FY) ** 2);
    box(k, COL.mask, 0, cy - 0.012, nz - 0.002, 0.018, 0.06, 0.016, -0.35);                  // the ridge of the nose
  }
  for (const sx of [-1, 1]) {
    const ex = sx * EX, ez = fc + cz * Math.sqrt(Math.max(0, 1 - (ex / ax) ** 2)) - 0.003;
    const geo = new THREE.SphereGeometry(0.025, 8, 5);
    geo.scale(1, 0.55, 0.3);
    geo.rotateY(Math.atan2(ex / (ax * ax), (ez - fc) / (cz * cz)));
    geo.translate(ex, cy + EY, ez); k.push(geo, COL.slit);
  }
  if (beak) { const geo = new THREE.ConeGeometry(0.028, 0.15, 6); geo.rotateX(Math.PI / 2); geo.translate(0, cy + 0.012, fc + FZ + 0.065); k.push(geo, gilt ? COL.gilt : COL.mask); }
  const rb = new THREE.CylinderGeometry(1, 1, 0.014, 14, 1, true, Math.PI * 0.35, Math.PI * 1.3);   // the ribbon, round the back
  rb.scale(r * 0.98, 1, r * 1.03); rb.translate(0, cy + EY, -0.005); k.push(rb, COL.slit);
  if (lady) ball(k, COL.hair, 0, r * 1.55, -0.07, 0.07, 1, 0.9, 1);                        // the hair put up
}

/** The rocking horse, standing on the floor at y 0 with its runners' arc centred at y R. */
const RUNNER_R = 0.62;
function horse(k) {
  for (const sx of [-0.2, 0.2]) {
    for (let i = 0; i < 7; i++) {
      const a0 = -0.62 + i * (1.24 / 7), a1 = a0 + 1.24 / 7;
      const p0 = [sx, RUNNER_R - RUNNER_R * Math.cos(a0) + 0.02, RUNNER_R * Math.sin(a0)];
      const p1 = [sx, RUNNER_R - RUNNER_R * Math.cos(a1) + 0.02, RUNNER_R * Math.sin(a1)];
      limb(k, COL.runner, p0, p1, 0.022);
    }
  }
  // the two cross-bars that tie the runners, sitting ON them where they curve up
  for (const z of [-0.3, 0.3]) {
    const a = Math.asin(z / RUNNER_R), y = RUNNER_R - RUNNER_R * Math.cos(a) + 0.02;
    box(k, COL.runner, 0, y + 0.004, z, 0.44, 0.035, 0.04);
  }
  for (const [lx, lz, ax] of [[-0.14, 0.2, 0.25], [0.14, 0.2, 0.25], [-0.14, -0.22, -0.25], [0.14, -0.22, -0.25]]) {
    limb(k, COL.horse, [lx, 0.54, lz * 0.8], [lx * 1.4, 0.08, lz + ax * 0.5], 0.035, 0.028);
  }
  ball(k, COL.horse, 0, 0.62, 0, 0.19, 0.8, 0.8, 1.6);                                     // the barrel
  for (const [x, y, z] of [[0.1, 0.66, 0.1], [-0.12, 0.6, -0.14], [0.05, 0.7, -0.22]]) ball(k, COL.dapple, x, y, z, 0.05, 1, 0.5, 1);
  limb(k, COL.horse, [0, 0.7, 0.2], [0, 0.95, 0.38], 0.07, 0.06);                            // the neck
  ball(k, COL.horse, 0, 0.98, 0.46, 0.08, 0.8, 0.9, 1.5);                                  // the head
  box(k, COL.mane, 0, 0.9, 0.3, 0.03, 0.22, 0.2, -0.9);
  for (const sx of [-1, 1]) ball(k, COL.slit, sx * 0.06, 1.01, 0.5, 0.012);
  box(k, COL.saddle, 0, 0.8, -0.02, 0.3, 0.03, 0.3);
  limb(k, COL.mane, [0, 0.62, -0.3], [0, 0.42, -0.42], 0.03, 0.01);                          // the tail
}

/** Somebody under the cover: legs, hips, chest; the hair on the pillow turned to the wall.
 *  Bed frame: +z the head end; the cover top at y 0.57. */
function sleeper(k, bl) {
  ball(k, COL.blanket, 0.02, 0.57, -0.52, 0.2, 1, 0.42, 1.9);
  ball(k, COL.blanket, 0.0, 0.57, 0.02, 0.27, 1, 0.52, 1.25);
  ball(k, COL.blanket, -0.02, 0.57, 0.36, 0.24, 1.05, 0.55, 0.85);
  ball(k, COL.hair, 0.08, 0.66, bl / 2 - 0.34, 0.11, 1.05, 0.95, 1.1);
}
/** The cover on the bed. `back`: thrown back toward the foot in a thick fold, the sheet and the
 *  pillow showing, the dent where a head was. */
function cover(k, bw, bl, back) {
  if (!back) {
    // pulled up to the pillow: somebody is under it
    box(k, COL.blanket, 0, 0.555, -0.04, bw - 0.02, 0.03, bl - 0.46);
    for (const sx of [-1, 1]) box(k, COL.blanket, sx * (bw / 2 - 0.018), 0.44, -0.04, 0.025, 0.26, bl - 0.46);
    return;
  }
  box(k, COL.linen, 0, 0.546, 0.05, bw - 0.1, 0.012, bl - 0.4);                              // the bottom sheet
  box(k, COL.blanket, 0, 0.585, -(bl / 2 - 0.45), bw - 0.02, 0.07, 0.5);                    // the fold at the foot
  for (const sx of [-1, 1]) box(k, COL.blanket, sx * (bw / 2 - 0.018), 0.44, -(bl / 2 - 0.45), 0.025, 0.26, 0.5);
  box(k, COL.blanket, 0.05, 0.56, -(bl / 2 - 0.9), bw - 0.2, 0.03, 0.4, 0, 0.12);           // a corner dragged back
}

/** The portrait: the sunrise on its painted face, or its back when it has been turned. */
function canvas(k, w, h, back) {
  const fw = w + 0.12, fh = h + 0.12;
  if (back) {
    box(k, COL.board, 0, 0, -0.013, fw, fh, 0.034);
    for (const sx of [-1, 1]) box(k, COL.batten, sx * w * 0.28, 0, 0.016, 0.05, h, 0.024);
    box(k, COL.batten, 0, 0, 0.016, w, 0.05, 0.024);
    for (const sx of [-1, 1]) box(k, COL.wire, sx * w * 0.2, h * 0.25 - 0.05, 0.03, w * 0.42, 0.006, 0.004, 0, 0, -sx * 0.24);
    return;
  }
  box(k, COL.frame, 0, 0, -0.005, fw, fh, 0.06);
  // the painting, in layers a millimetre apart: the night sky fading to a warm horizon, the
  // sun half over the edge of the land, and the land black under it
  const z = 0.0265;
  box(k, COL.sky0, 0, h * 0.32, z, w, h * 0.36, 0.002);
  box(k, COL.sky1, 0, h * 0.06, z, w, h * 0.16, 0.002);
  box(k, COL.sky2, 0, -h * 0.06, z, w, h * 0.08, 0.002);
  box(k, COL.glow, 0, -h * 0.125, z, w, h * 0.05, 0.002);
  const sun = new THREE.CylinderGeometry(w * 0.16, w * 0.16, 0.002, 24, 1, false, Math.PI / 2, Math.PI);
  sun.rotateX(Math.PI / 2); sun.translate(0.06, -h * 0.15, z + 0.0015); k.push(sun, COL.sun);
  box(k, COL.land, 0, -h * 0.33, z + 0.003, w, h * 0.34, 0.002);
}

/* ------------------------------------------------------------------- system -- */
const _fwd = new THREE.Vector3(), _cam = new THREE.Vector3();

export class ManorScares {
  static id = 'manor-scares';

  constructor(ctx) {
    this.ctx = ctx;
    this.ready_ = false;
    this.active = false;
    this.time = 0;
    this.nearRR = 0;                // round-robin: whose turn it is for the one segmentClear
    this.site = null;
    this.flagsRead = false;
    // the masque
    this.masque = { heads: null, base: null, baseN: null, pivots: new Float32Array(18), yaw: new Float32Array(6),
      rest: new Float32Array(6), turned: 0, order: [2, 5, 0, 3, 1, 4], unseen: 0, done: false, dirty: false, awayT: 0,
      verts: 0, colliders: [] };
    // the horse
    this.horse = { mesh: null, t: -1, giggled: false, since: 1e9, awayT: 0, angle: 0, collider: -1 };
    // Lady Constance
    this.con = { lump: null, cover: null, geoOn: null, geoBack: null, present: true, stopped: false, gaze: 0,
      breath: 0, awayT: 0, collider: -1 };
    // Lucian
    this.luc = { mesh: null, present: true, armed: false, unseen: 0, hushed: false, collider: -1 };
    // the sunrise
    this.sun = { mesh: null, geoFront: null, geoBack: null, turned: false, looked: 0, unseen: 0 };
    this._off = [];
    this._c = { x: 0, z: 0 };
    this.pd = new Float32Array(3);           // the player in the donor frame, from the last step
    this._dist = 0;
    this._usedClear = false;
  }

  _sys(id) { return this.ctx.systems.get(id); }
  ready() { return this.ready_; }

  async init() {
    const places = this._sys('places');
    const n = places && places.nodes ? places.nodes.get(SITE) : null;
    if (!n || !places.matPeople) { this.ready_ = true; return; }
    this.site = { x: n.def.x, z: n.def.z, yaw: n.yaw || 0, padY: n.padY, c: Math.cos(n.yaw || 0), s: Math.sin(n.yaw || 0) };
    this.mat = places.matPeople;
    this.group = new THREE.Group();
    this.group.name = 'manor-scares';
    this.group.position.set(this.site.x, 0, this.site.z);
    this.group.rotation.y = this.site.yaw;
    this.group.visible = false;
    this.ctx.scene.add(this.group);
    this.group.updateMatrixWorld(true);
    this._buildMasque();
    this._buildHorse();
    this._buildConstance();
    this._buildLucian();
    this._buildSunrise();
    const bus = this.ctx.bus;
    if (bus && typeof bus.on === 'function') {
      const arm = (e) => { if (e && e.id === SITE) this.luc.armed = true; };
      const off1 = bus.on('place:claimStart', arm), off2 = bus.on('place:claimed', arm);
      if (typeof off1 === 'function') this._off.push(off1);
      if (typeof off2 === 'function') this._off.push(off2);
    }
    this.ready_ = true;
  }

  /* ---- frames ------------------------------------------------------------------ */
  // donor metres (manor-data's frame) -> the group's local frame, and -> world
  _lx(x) { return x - HX; }
  _lz(z) { return z - HZ; }
  _ly(level, y) { return this.site.padY + LIFT + LV[level].floor + (y || 0); }
  _wx(x, z) { const lx = x - HX, lz = z - HZ; return this.site.x + lx * this.site.c + lz * this.site.s; }
  _wz(x, z) { const lx = x - HX, lz = z - HZ; return this.site.z - lx * this.site.s + lz * this.site.c; }
  _place(mesh, x, z, level, yaw, y) {
    mesh.position.set(this._lx(x), this._ly(level, y), this._lz(z));
    mesh.rotation.y = yaw || 0;
    this.group.add(mesh);
    mesh.updateMatrixWorld(true);
  }
  _mesh(geo, name, shadow) {
    const m = new THREE.Mesh(geo, this.mat);
    m.name = name; m.receiveShadow = true; m.castShadow = !!shadow; m.matrixAutoUpdate = true;
    return m;
  }
  _collider(shape, chunk) {
    const col = this._sys('collision');
    return col && typeof col.addCollider === 'function' ? col.addCollider(shape, chunk) : -1;
  }
  _drop(id) { const col = this._sys('collision'); if (id >= 0 && col && col.removeCollider) col.removeCollider(id); return -1; }

  /* ---- the masque ------------------------------------------------------------------ */
  _buildMasque() {
    const S = SCARES.masque, M = this.masque;
    const bodies = new Kit(), heads = [];
    const tones = [COL.gown, COL.gown2, COL.gown3];
    let i = 0;
    for (let p = 0; p < S.pairs.length; p++) {
      const [px, pz, axis] = S.pairs[p];
      const dx = Math.sin(axis), dz = Math.cos(axis);
      for (const lady of [false, true]) {
        // he stands 0.30 back along the axis facing along it; she 0.30 on, facing him
        const sgn = lady ? 1 : -1, x = px + dx * 0.3 * sgn, z = pz + dz * 0.3 * sgn;
        const yaw = lady ? axis + Math.PI : axis;
        const kb = new Kit(); dancerBody(kb, lady, tones[p]);
        const bg = kb.build(); bg.rotateY(yaw); bg.translate(this._lx(x), 0, this._lz(z)); bodies.parts.push(bg);
        const kh = new Kit(); maskedHead(kh, lady, i % 3 === 1, i === 2 || i === 5);
        heads.push(kh.build());
        const neckY = lady ? 1.52 : 1.57;
        M.pivots[i * 3] = this._lx(x); M.pivots[i * 3 + 1] = neckY; M.pivots[i * 3 + 2] = this._lz(z);
        M.yaw[i] = M.rest[i] = yaw;
        M.colliders.push({ x: this._wx(x, z), z: this._wz(x, z), r: lady ? 0.36 : 0.26, h: lady ? 1.68 : 1.8 });
        i++;
      }
    }
    const bg = finish(bodies);
    const floorY = this._ly(S.level, 0);
    const bm = this._mesh(bg, 'masque-bodies', false);
    bm.position.set(0, floorY, 0); this.group.add(bm);
    this.masqueBodies = bm;
    // THE HEADS are one geometry whose vertices are rewritten, head by head, only when one
    // turns (and only while nobody can see it): one draw, no per-frame work.
    const merged = mergeParts(heads);
    projectPlaceSurfaceUVs(merged, 0.6);
    M.counts = heads.map(h => h.attributes.position.count);
    M.base = Float32Array.from(merged.attributes.position.array);
    M.baseN = Float32Array.from(merged.attributes.normal.array);
    M.heads = this._mesh(merged, 'masque-heads', false);
    M.heads.position.set(0, floorY, 0);
    this.group.add(M.heads);
    // put every head on its neck BEFORE taking the bounds: a head only ever turns about its
    // own neck, so these bounds plus a margin hold for good. (Taken first, they sat at the site
    // origin and three culled all six heads: measured, six headless dancers in the r3 shots.)
    this._writeHeads();
    merged.computeBoundingSphere(); merged.boundingSphere.radius += 0.35;
    for (const c of M.colliders) {
      c.id = this._collider({ kind: 'circle', x: c.x, z: c.z, r: c.r, y0: this.site.padY + LIFT, y1: this.site.padY + LIFT + c.h,
        tag: 'cloth', standable: false, breakable: false, authored: true }, 'story:manor-masque');
    }
  }
  _writeHeads() {
    const M = this.masque, pos = M.heads.geometry.attributes.position, nor = M.heads.geometry.attributes.normal;
    const P = pos.array, N = nor.array;
    let v = 0;
    for (let i = 0; i < 6; i++) {
      const c = Math.cos(M.yaw[i]), s = Math.sin(M.yaw[i]);
      const ox = M.pivots[i * 3], oy = M.pivots[i * 3 + 1], oz = M.pivots[i * 3 + 2];
      const n = M.counts[i];
      for (let j = 0; j < n; j++, v++) {
        const k = v * 3, bx = M.base[k], bz = M.base[k + 2], nx = M.baseN[k], nz = M.baseN[k + 2];
        P[k] = ox + bx * c + bz * s; P[k + 1] = oy + M.base[k + 1]; P[k + 2] = oz - bx * s + bz * c;
        N[k] = nx * c + nz * s; N[k + 1] = M.baseN[k + 1]; N[k + 2] = -nx * s + nz * c;
      }
    }
    pos.needsUpdate = true; nor.needsUpdate = true;
  }

  /* ---- the horse ------------------------------------------------------------------- */
  _buildHorse() {
    const S = SCARES.horse, k = new Kit();
    horse(k);
    const geo = finish(k);
    geo.translate(0, -RUNNER_R, 0);            // pivot on the runners' arc centre
    const m = this._mesh(geo, 'nursery-horse', false);
    m.rotation.order = 'YXZ';                  // it rocks about its OWN width, after the yaw
    this._place(m, S.x, S.z, S.level, S.ry, RUNNER_R);
    this.horse.mesh = m;
    this.horse.collider = this._collider({ kind: 'obb', x: this._wx(S.x, S.z), z: this._wz(S.x, S.z), halfX: 0.24, halfZ: 0.5,
      yaw: this.site.yaw + S.ry, y0: this._ly(S.level, 0), y1: this._ly(S.level, 1.05), tag: 'wood', standable: false,
      breakable: false, authored: true },
    'story:manor-horse');
  }

  /* ---- Lady Constance -------------------------------------------------------------- */
  _buildConstance() {
    const B = SCARES.constance.bed, C = this.con;
    const kl = new Kit(); sleeper(kl, B.l);
    const lump = finish(kl);
    C.lump = this._mesh(lump, 'constance-sleeper', false);
    // breathing scales about the mattress: the lump's own origin sits on it
    lump.translate(0, -0.55, 0);
    this._place(C.lump, B.x, B.z, SCARES.constance.level, B.ry, 0.55);
    const k1 = new Kit(); cover(k1, B.w, B.l, false); C.geoOn = finish(k1);
    const k2 = new Kit(); cover(k2, B.w, B.l, true); C.geoBack = finish(k2);
    C.cover = this._mesh(C.geoOn, 'constance-cover', false);
    this._place(C.cover, B.x, B.z, SCARES.constance.level, B.ry, 0);
  }
  _constanceCollider(on) {
    const C = this.con, B = SCARES.constance.bed;
    if (on && C.collider < 0) {
      C.collider = this._collider({ kind: 'obb', x: this._wx(B.x, B.z), z: this._wz(B.x, B.z), halfX: 0.3, halfZ: 0.75,
        yaw: this.site.yaw + B.ry, y0: this._ly(SCARES.constance.level, 0.57), y1: this._ly(SCARES.constance.level, 0.84),
        tag: 'cloth', standable: false, breakable: false, authored: true }, 'story:manor-constance');
    } else if (!on) C.collider = this._drop(C.collider);
  }

  /* ---- Lucian ----------------------------------------------------------------------- */
  _buildLucian() {
    const S = SCARES.lucian, k = new Kit();
    // his frame: +z is the corner he is facing. The corner's two walls run off at 45 degrees
    // either side; his right hand (-x) is flat on the wall to his right at shoulder height.
    for (const sx of [-1, 1]) {
      box(k, COL.coat, sx * 0.095, 0.44, 0, 0.14, 0.88, 0.15);
      box(k, COL.shoe, sx * 0.095, 0.035, 0.05, 0.11, 0.07, 0.27);
    }
    box(k, COL.coat, 0, 1.17, 0.03, 0.44, 0.62, 0.25, 0.1);
    box(k, COL.coat, 0, 0.72, -0.08, 0.38, 0.36, 0.06, 0.06);
    limb(k, COL.coat, [0.23, 1.42, 0.04], [0.26, 1.02, 0.02], 0.05, 0.045);                 // left arm, hanging
    limb(k, COL.coat, [0.26, 1.02, 0.02], [0.25, 0.8, 0.06], 0.045, 0.04);
    ball(k, COL.skin, 0.25, 0.75, 0.07, 0.045, 1, 1.4, 0.8);
    // the right arm, up and out to the wall on his right. The corner is 0.45 m ahead; in his
    // frame that wall is the line x - z = -0.4525, running off at 45 degrees
    limb(k, COL.coat, [-0.23, 1.42, 0.05], [-0.3, 1.28, 0.08], 0.05, 0.045);
    limb(k, COL.coat, [-0.3, 1.28, 0.08], [-0.27, 1.5, 0.14], 0.045, 0.04);
    box(k, COL.skin, -0.28, 1.56, 0.153, 0.08, 0.16, 0.022, 0, -Math.PI / 4);               // the palm, flat on it
    limb(k, COL.shirt, [0, 1.46, 0.07], [0, 1.56, 0.12], 0.05);
    ball(k, COL.hair, 0, 1.63, 0.2, 0.11, 0.95, 1.05, 1.05);                                 // his head, bowed into the corner
    const m = this._mesh(finish(k), 'lucian', true);
    this._place(m, S.x, S.z, S.level, S.ry, 0);
    this.luc.mesh = m;
  }
  _lucianCollider(on) {
    const L = this.luc, S = SCARES.lucian;
    if (on && L.collider < 0) {
      L.collider = this._collider({ kind: 'circle', x: this._wx(S.x, S.z), z: this._wz(S.x, S.z), r: 0.3,
        y0: this._ly(S.level, 0), y1: this._ly(S.level, 1.85), tag: 'cloth', standable: false, breakable: false, authored: true },
      'story:manor-lucian');
    } else if (!on) L.collider = this._drop(L.collider);
  }

  /* ---- the sunrise ------------------------------------------------------------------ */
  _buildSunrise() {
    const S = SCARES.sunrise, U = this.sun;
    const k1 = new Kit(); canvas(k1, S.w, S.h, false); U.geoFront = finish(k1, 2);
    const k2 = new Kit(); canvas(k2, S.w, S.h, true); U.geoBack = finish(k2, 2);
    // hung with its BACK 0.035 behind the anchor, on the wall face; the painted side (+z) to the room
    U.mesh = this._mesh(U.geoFront, 'sunrise-portrait', false);
    this._place(U.mesh, S.x, S.z, S.level, S.ry + Math.PI, S.y);
  }

  /* ---- saved state -------------------------------------------------------------------- */
  _readFlags() {
    const pr = this._sys('progress'), places = this._sys('places');
    if (!pr || typeof pr.flag !== 'function') return;
    this.flagsRead = true;
    const gone = !!pr.flag('manor:lucian-gone') || !!pr.flag('secured:' + SITE) || !!(places && places.claimed && places.claimed.has(SITE));
    this.luc.present = !gone;
    this.luc.mesh.visible = !gone;
    this._lucianCollider(!gone);
    this.con.present = !pr.flag('manor:constance-up');
    this.con.lump.visible = this.con.present;
    this.con.cover.geometry = this.con.present ? this.con.geoOn : this.con.geoBack;
    this._constanceCollider(this.con.present);
    this.sun.turned = !!pr.flag('manor:sunrise-turned');
    this.sun.mesh.geometry = this.sun.turned ? this.sun.geoBack : this.sun.geoFront;
  }

  /* ---- attention ---------------------------------------------------------------------- */
  // The camera's gaze, once a step: `_fwd` and `_cam` are the step's scratch.
  _gaze() {
    const cam = this.ctx.camera;
    if (!cam) return false;
    cam.getWorldPosition(_cam);
    cam.getWorldDirection(_fwd);
    return true;
  }
  /** cosine between the gaze and a world point, and its distance in `this._dist` */
  _dot(x, y, z) {
    const dx = x - _cam.x, dy = y - _cam.y, dz = z - _cam.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this._dist = d;
    if (d < 1e-3) return 1;
    return (dx * _fwd.x + dy * _fwd.y + dz * _fwd.z) / d;
  }
  /** The step's ONE line-of-sight test, if it is this scare's turn. The line stops 0.9 m
   *  short of the thing, on the viewer's side: every one of these stands inside its own
   *  collider (the horse, Lucian, the bed), and a line that ends inside a collider is always
   *  "blocked". MEASURED in the first run: the horse never started for exactly that reason. */
  _clear(slot, x, y, z) {
    if (this.nearRR !== slot || this._usedClear) return false;
    this._usedClear = true;
    const col = this._sys('collision');
    if (!col) return true;
    const dx = x - _cam.x, dy = y - _cam.y, dz = z - _cam.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 1.0) return true;
    const k = (d - 0.9) / d;
    return col.segmentClear(_cam.x, _cam.y, _cam.z, _cam.x + dx * k, _cam.y + dy * k, _cam.z + dz * k);
  }
  _inRoom(room, level, dx, dy, dz) {
    return dx > room[0] + 0.1 && dx < room[2] - 0.1 && dz > room[1] + 0.1 && dz < room[3] - 0.1
      && Math.abs(dy - LV[level].floor) < 1.3;
  }

  /* ---- the step ------------------------------------------------------------------------ */
  step(dt) {
    if (!this.site || !this.ctx.playing || this.ctx.paused) return;
    this.time += dt;
    const p = this._sys('player');
    if (!p || !p.pos) return;
    if (!this.flagsRead) this._readFlags();
    const wx = p.pos.x - this.site.x, wz = p.pos.z - this.site.z;
    const far = wx * wx + wz * wz > NEAR * NEAR;
    this._stepAway(dt, Math.sqrt(wx * wx + wz * wz));
    this.active = !far;
    if (far) return;
    if (!this._gaze()) return;
    // the player in the donor frame
    const lx = wx * this.site.c - wz * this.site.s, lz = wx * this.site.s + wz * this.site.c;
    const dx = lx + HX, dz = lz + HZ, dy = p.pos.y - this.site.padY - LIFT;
    this.pd[0] = dx; this.pd[1] = dy; this.pd[2] = dz;
    this._usedClear = false;
    // whose turn is the line-of-sight test: the room the player is in, else the next in turn
    this.nearRR = this._inRoom(SCARES.constance.room, 'first', dx, dy, dz) ? 1
      : this._inRoom(SCARES.horse.room, 'first', dx, dy, dz) ? 2
      : this._inRoom(SCARES.lucian.room, 'basement', dx, dy, dz) ? 3
      : this._inRoom(SCARES.sunrise.room, 'ground', dx, dy, dz) ? 4 : ((this.nearRR + 1) % 5);
    this._stepMasque(dt, dx, dy, dz);
    this._stepHorse(dt, dx, dy, dz);
    this._stepConstance(dt, dx, dy, dz);
    this._stepLucian(dt);
    this._stepSunrise(dt, dx, dy, dz);
  }

  /** Far away: the masque and the horse reset themselves for another visit. */
  _stepAway(dt, dist) {
    const M = this.masque, H = this.horse;
    if (dist > 90) {
      M.awayT += dt; H.awayT += dt;
      if (M.awayT > 60 && (M.turned > 0 || M.done)) {
        for (let i = 0; i < 6; i++) M.yaw[i] = M.rest[i];
        M.turned = 0; M.done = false; M.unseen = 0; M.dirty = true;
      }
    } else { M.awayT = 0; if (dist < 80) H.awayT = 0; }
    H.since += dt;
    if (H.t >= 0 && H.since > 300 && H.awayT > 30) { H.t = -1; H.giggled = false; }
  }

  _stepMasque(dt, dx, dy, dz) {
    const M = this.masque, S = SCARES.masque;
    if (!this._inRoom(S.room, S.level, dx, dy, dz)) { M.unseen = 0; return; }
    // seen = any head inside the view (the ballroom is one open room: the cone is the test)
    let seen = false;
    const floorY = this.site.padY + LIFT;
    for (let i = 0; i < 6 && !seen; i++) {
      const hx = this.site.x + M.pivots[i * 3] * this.site.c + M.pivots[i * 3 + 2] * this.site.s;
      const hz = this.site.z - M.pivots[i * 3] * this.site.s + M.pivots[i * 3 + 2] * this.site.c;
      if (this._dot(hx, floorY + M.pivots[i * 3 + 1] + 0.1, hz) > 0.42 && this._dist < 32) seen = true;
    }
    if (seen) {
      if (M.turned === 6 && !M.done) {
        M.done = true;
        const dread = this._sys('dread');
        const c = this._centroid();
        if (dread) { dread.answer('witnessed', c.x, floorY + 1.6, c.z, 0.45); dread.hush(2.5); }
      }
      M.unseen = 0;
      return;
    }
    M.unseen += dt;
    if (M.unseen < 1.1) return;
    M.unseen = 0;
    if (M.turned < 6) M.turned++;
    // every head that has turned so far now faces where you are (they only ever move now)
    const p = this._sys('player').pos;
    const px = (p.x - this.site.x) * this.site.c - (p.z - this.site.z) * this.site.s;
    const pz = (p.x - this.site.x) * this.site.s + (p.z - this.site.z) * this.site.c;
    for (let n = 0; n < M.turned; n++) {
      const i = M.order[n];
      M.yaw[i] = Math.atan2(px - M.pivots[i * 3], pz - M.pivots[i * 3 + 2]);
    }
    M.dirty = true;
  }
  _centroid() {
    const M = this.masque;
    let x = 0, z = 0;
    for (let i = 0; i < 6; i++) { x += M.pivots[i * 3]; z += M.pivots[i * 3 + 2]; }
    x /= 6; z /= 6;
    this._c.x = this.site.x + x * this.site.c + z * this.site.s;
    this._c.z = this.site.z - x * this.site.s + z * this.site.c;
    return this._c;
  }

  _stepHorse(dt, dx, dy, dz) {
    const H = this.horse, S = SCARES.horse;
    if (H.t >= 0) {
      H.t += dt;
      if (!H.giggled && H.t >= 2.4) {
        H.giggled = true;
        const dread = this._sys('dread');
        const bx = S.underBed[0], bz = S.underBed[1];
        if (dread) dread.answer('giggle', this._wx(bx, bz), this._ly(S.level, 0.15), this._wz(bx, bz), 0.30);
      }
      return;
    }
    if (!this._inRoom(S.room, S.level, dx, dy, dz)) return;
    const hx = this._wx(S.x, S.z), hz = this._wz(S.x, S.z), hy = this._ly(S.level, 0.8);
    const close = Math.hypot(dx - S.x, dz - S.z) < 5;
    const inView = this._dot(hx, hy, hz) > 0.55 && this._clear(2, hx, hy, hz);
    if (close || inView) { H.t = 0; H.since = 0; }
  }

  _stepConstance(dt, dx, dy, dz) {
    const C = this.con, S = SCARES.constance, B = S.bed;
    if (!C.present) return;
    C.breath += dt;
    const inside = this._inRoom(S.room, S.level, dx, dy, dz);
    const bx = this._wx(B.x, B.z), bz = this._wz(B.x, B.z), by = this._ly(S.level, 0.7);
    const dot = this._dot(bx, by, bz), dist = this._dist;
    const looking = dot > 0.9 && dist < 6 && this._clear(1, bx, by, bz);
    if (!C.stopped) {
      C.gaze = looking ? C.gaze + dt : 0;
      if ((inside && Math.hypot(dx - B.x, dz - B.z) < 2.3) || C.gaze > 1.2) {
        C.stopped = true;
        const dread = this._sys('dread');
        if (dread) dread.hush(3.0);
      }
      return;
    }
    // it has stopped breathing. Once you have gone, and not seen the bed for 45 s, she is up.
    const watched = dot > 0.5 && dist < 16;
    C.awayT = (inside || watched) ? 0 : C.awayT + dt;
    if (C.awayT > 45) {
      C.present = false;
      C.lump.visible = false;
      C.cover.geometry = C.geoBack;
      this._constanceCollider(false);
      const pr = this._sys('progress');
      if (pr) pr.flag('manor:constance-up', true);
    }
  }

  _stepLucian(dt) {
    const L = this.luc, S = SCARES.lucian;
    if (!L.present) return;
    const lx = this._wx(S.x, S.z), lz = this._wz(S.x, S.z), ly = this._ly(S.level, 1.4);
    const inCone = this._dot(lx, ly, lz) > 0.55 && this._dist < 12;
    const seen = inCone && (this.nearRR !== 3 || this._clear(3, lx, ly, lz));
    if (seen && !L.hushed && this._dist < 9) {
      L.hushed = true;
      const dread = this._sys('dread');
      if (dread) dread.hush(3.5);
    }
    if (!L.armed) return;
    L.unseen = seen ? 0 : L.unseen + dt;
    if (L.unseen >= 0.35) {
      // when the lights come on, he is not there
      L.present = false;
      L.mesh.visible = false;
      this._lucianCollider(false);
      const pr = this._sys('progress');
      if (pr) pr.flag('manor:lucian-gone', true);
    }
  }

  _stepSunrise(dt, dx, dy, dz) {
    const U = this.sun, S = SCARES.sunrise;
    if (U.turned) return;
    const inside = this._inRoom(S.room, S.level, dx, dy, dz);
    const x = this._wx(S.x, S.z), z = this._wz(S.x, S.z), y = this._ly(S.level, S.y);
    const inCone = inside && this._dot(x, y, z) > 0.8 && this._dist < 9;
    const seen = inCone && (this.nearRR !== 4 || this._clear(4, x, y, z));
    if (U.looked < 1.0) { U.looked = seen ? U.looked + dt : Math.max(0, U.looked - dt * 0.5); return; }
    U.unseen = (inside && this._dot(x, y, z) > 0.5) ? 0 : U.unseen + dt;
    if (U.unseen >= 0.6) {
      U.turned = true;
      U.mesh.geometry = U.geoBack;
      const dread = this._sys('dread');
      if (dread) dread.answer('door', x, y, z, 0.3);
      const pr = this._sys('progress');
      if (pr) pr.flag('manor:sunrise-turned', true);
    }
  }

  /* ---- present ------------------------------------------------------------------------- */
  /** Is the player (last step) within `r` of donor (x, z) and within `dy` of `level`? */
  _near(x, z, level, r, dy) {
    const p = this.pd, ax = p[0] - x, az = p[2] - z;
    return ax * ax + az * az < r * r && Math.abs(p[1] - LV[level].floor) < dy;
  }

  present() {
    if (!this.group) return;
    this.group.visible = this.active;
    if (!this.active) return;
    // Each scare draws only near its own room: the house is walls all the way through, and
    // from the drive six meshes inside it were six draw calls for nothing (measured +7).
    const mq = this._near(9, 21, 'ground', 22, 6);
    this.masque.heads.visible = mq; this.masqueBodies.visible = mq;
    this.horse.mesh.visible = this._near(SCARES.horse.x, SCARES.horse.z, 'first', 15, 2.6);
    const cn = this._near(SCARES.constance.bed.x, SCARES.constance.bed.z, 'first', 15, 2.6);
    this.con.cover.visible = cn; this.con.lump.visible = cn && this.con.present;
    this.luc.mesh.visible = this.luc.present && this._near(SCARES.lucian.x, SCARES.lucian.z, 'basement', 13, 2.6);
    this.sun.mesh.visible = this._near(SCARES.sunrise.x, SCARES.sunrise.z + 6, 'ground', 14, 2.6);
    const M = this.masque;
    if (M.dirty) { M.dirty = false; this._writeHeads(); }
    const H = this.horse;
    const a = H.t >= 0 ? 0.20 * Math.exp(-H.t / 2.8) * Math.sin((Math.PI * 2 * H.t) / 1.25) : 0;
    H.mesh.rotation.x = a;
    const C = this.con;
    if (C.present) C.lump.scale.y = C.stopped ? 1 : 1 + 0.035 * Math.sin((Math.PI * 2 * C.breath) / 4.2);
  }

  state() {
    return {
      active: this.active,
      masque: { turned: this.masque.turned, done: this.masque.done },
      horse: { t: this.horse.t, giggled: this.horse.giggled },
      constance: { present: this.con.present, stopped: this.con.stopped },
      lucian: { present: this.luc.present, armed: this.luc.armed },
      sunrise: { turned: this.sun.turned, looked: this.sun.looked },
    };
  }

  dispose() {
    for (const off of this._off) off();
    this._off.length = 0;
    const col = this._sys('collision');
    if (col) for (const id of ['story:manor-masque', 'story:manor-horse', 'story:manor-constance', 'story:manor-lucian']) col.removeChunk(id);
    if (this.group) {
      this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      for (const geo of [this.con.geoOn, this.con.geoBack, this.sun.geoFront, this.sun.geoBack]) if (geo) geo.dispose();
      this.group.removeFromParent();
    }
  }
}

/** Concatenate indexed geometries with identical attributes, keeping their order (so each
 *  part's vertex range is known). */
function mergeParts(list) {
  let nv = 0, ni = 0;
  for (const g0 of list) { nv += g0.attributes.position.count; ni += g0.index.count; }
  const out = new THREE.BufferGeometry();
  const names = ['position', 'normal', 'uv', 'color'];
  for (const n of names) {
    const size = list[0].attributes[n].itemSize, arr = new Float32Array(nv * size);
    let o = 0;
    for (const g0 of list) { arr.set(g0.attributes[n].array, o); o += g0.attributes[n].array.length; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  const idx = new Uint32Array(ni);
  let o = 0, base = 0;
  for (const g0 of list) { const a = g0.index.array; for (let i = 0; i < a.length; i++) idx[o++] = a[i] + base; base += g0.attributes.position.count; }
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.attributes.position.setUsage(THREE.DynamicDrawUsage);
  out.attributes.normal.setUsage(THREE.DynamicDrawUsage);
  for (const g0 of list) g0.dispose();
  return out;
}

export default ManorScares;
