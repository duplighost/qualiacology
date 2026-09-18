// Authored destination residents. Bodies are staged before entry; attention starts the beat.
// September 8: these residents are real combatants. Damage owns health and death;
// shots can never restart a decorative collapse or revive a defeated resident.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeShell } from '../enemies/bodies.js';
import { clamp01 } from '../engine/math.js';
import { CFG } from '../config.js';
import { loft, tendon } from '../art/character-sculpt.js';
import { fracturedMask } from '../art/character-faces.js';

const FOLD_BREAKFAST = 0.45;  // leaning in, not folded double: two faces across one table never meet

// Site-local coordinates use the SAME yaw/pad frame as places.nodes. The zone is the actual
// room, not a radius through its walls; a head-height sight ray is a second independent gate.
// A room is allowed to keep its resident after the site's power is restored. Only the real
// closed refuge is safe, and that public predicate wins over every encounter state below.
// A seat may carry its own yaw as a third number. A row may carry its own hp (per body), the
// fold its bodies wait in, and `rise`: how far each pushes back from its place as it stands.
export const INTERIOR_ENCOUNTERS = Object.freeze([
  // The guests stayed for breakfast. Four places at the dining table are still taken, each
  // leaning in over its plate. When they stand, they push back from the table first.
  { id: 'blackthorn-breakfast', site: 'blackthorn-manor', kind: 'congregation', x: 14, z: 11, y: 3.2,
    zone: [14, 11, 11.4, 9.4], look: [9.2, 11, 3.2], yaw: 0, hp: 95, fold: FOLD_BREAKFAST, rise: 0.55,
    seats: [[-1.8, -1.15, 0], [1.8, -1.15, 0], [-0.6, 1.15, Math.PI], [1.8, 1.15, Math.PI]] },
  { id: 'blackthorn-upper', site: 'blackthorn-manor', kind: 'resident', x: -2, z: -10, y: 7.4,
    zone: [-12, -10, 33, 3.5], look: [-11, -10, 7.4], yaw: Math.PI / 2 },
  { id: 'blackthorn-cellar', site: 'blackthorn-manor', kind: 'resident', x: -9, z: -12.1, y: 0,
    zone: [-10, -12, 23, 3.1], look: [0, -12, 0], yaw: -Math.PI / 2, scale: 0.77 },
  { id: 'avery-hall', site: 'avery-house', kind: 'resident', x: -14.8, z: 4.6, y: 3.2,
    zone: [0, 4, 57, 3.7], look: [-7, 4, 3.2], yaw: -Math.PI / 2 },
  { id: 'avery-upper', site: 'avery-house', kind: 'resident', x: 13, z: 4.8, y: 7.4,
    zone: [0, 4, 57, 3.6], look: [5, 4, 7.4], yaw: Math.PI / 2, scale: 0.91 },
  // Clear of the gas can it used to stand in, the crates its hand reached into, and the gallery
  // deck it used to lean through. A head shorter than the others: the winding house is low.
  { id: 'mine-shift', site: 'weeping-mine', kind: 'suspended', x: 9.4, z: -10.4, y: 0,
    zone: [12.5, -8, 10.7, 7.8], look: [8.2, -11.2, 0], yaw: 0, scale: 0.93 },
  // 1.2 m behind the grid wall, so turning to you on the floor it does not reach into it.
  { id: 'mine-chain-room', site: 'weeping-mine', kind: 'suspended', x: -9.2, z: 5.0, y: 0,
    zone: [-11.3, 8.4, 9.0, 7.0], look: [-10.0, 11.0, 0], yaw: Math.PI },
  { id: 'cathedral-congregation', site: 'cathedral', kind: 'congregation', x: 0, z: 17, y: 0,
    zone: [0, 14, 15.6, 16.5], look: [0, 21.0, 0], yaw: Math.PI,
    seats: [[-3.0, -0.75], [3.0, 1], [-3.8, 2.75], [4.4, -0.75]] },
  { id: 'chapel-vesper', site: 'chapel', kind: 'resident', x: -1.65, z: 6.2, y: 0,
    zone: [0, 4.2, 7.4, 8.7], look: [-1.55, 1.8, 0], yaw: 0, scale: 0.93 },
  { id: 'mill-sacks', site: 'hollow-mill', kind: 'resident', x: 7.4, z: 4.6, y: 0,
    zone: [7.5, 4.5, 5.8, 3.7, 0.6], look: [6.1, 3.4, 0], yaw: 0.6, scale: 0.76, minDistance: 1.5 },
  { id: 'mill-granary', site: 'hollow-mill', kind: 'resident', x: 11.0, z: -5.0, y: 0,
    zone: [10.7, -5.5, 3.2, 15.5], look: [11.0, 0.9, 0], yaw: Math.PI, scale: 0.95 },
  { id: 'garden-mourner', site: 'garden-of-rest', kind: 'resident', x: -18.9, z: 8.4, y: 0,
    zone: [-17.2, 6.5, 5.7, 7.2, 0.34], look: [-18.0, 4.4, 0], yaw: 0.34, terrain: true },
  { id: 'jackfield-rafters', site: 'jackfield', kind: 'suspended', x: -2.3, z: 1.2, y: 0,
    zone: [-0.6, 0, 6.0, 10.0], look: [-3.3, -1.1, 0], yaw: 0, minDistance: 2.0 },
]);

const POOL = 4;
const REARM = 300;                 // a new visit, not a loop you can farm by turning around
const GLOBAL_GAP = 42;             // between places: scares do not chain across the county
const SITE_GAP = 5;                // the next room of the place you are clearing: a breath, not a wait
const RELOCATE_UNSEEN = 1.5;       // the pool follows you to the room you are heading for, unseen
const ONE_SEAT = Object.freeze([Object.freeze([0, 0])]);
const VIEW_H = [0.4, 1.4, 2.4, 3.4];   // feet to a hanging head: any of these in view is "seen"
const _seatP = { x: 0, y: 0, z: 0 };
const NUDGE_H = [0.3, 0.64, 1.85];     // shin, knee, shoulder (the last scales with the body)
const RUSH_H = NUDGE_H;                 // _rush looks ahead at the same three heights
// Hanging. The rope is tied to what is really overhead, measured once per room: every
// collider AND every drawn surface over the whole hanging silhouette (a drawn ceiling can sit
// a metre under its collider), so a body never hangs through a deck, a beam or a hopper.
const HANG_MAX = 1.55;             // feet over the floor, at most
const HANG_MIN = 0.35;             // less than this is standing, not hanging: no rope at all
const HANG_CLEAR = 0.08;           // between the top of a hanging body and what is over it
const FAR_RESET = 90;              // a body that dropped hangs again only after you went this far
const DROP_G = CFG.player.GRAVITY; // it falls like you do: 1.55 m is 0.38 s, then the floor
// Stooping. A resident stands 2.7-2.9 m tall and rooms have lintels, beams, lamps and decks
// lower than that. Per room, once, the drawn faces in the band a head passes through are kept
// (world space, walls left out); a standing body bends under whatever is over it or just ahead.
const BAND_LO = 1.2, BAND_HI = 3.2, BAND_HANG = 4.4;   // a hanging room keeps faces up to 4.4 m
const BAND_MAX = 12000;            // triangles kept per room, at most
const STOOP_STEP = 0.1, STOOP_N = 12;  // the rig's top is measured at folds 0, 0.1 .. 1.1
const PROFILE_CELL = 0.15;         // the hanging silhouette's top, binned on the floor plan
const _box = new THREE.Box3();
const _sph = new THREE.Sphere();
const _colO = { x: 0, y: 0, z: 0 };
const _colUp = { x: 0, y: 1, z: 0 };
const _colDown = { x: 0, y: -1, z: 0 };
const SKIN = [0.056, 0.049, 0.043];
const CLOTH = [0.040, 0.048, 0.043];
const SEAM = [0.108, 0.087, 0.063];
const VOID = [0.002, 0.003, 0.003];
const TEETH = [0.135, 0.113, 0.088];
const _origin = { x: 0, y: 0, z: 0 };
const _meshRay = new THREE.Raycaster();
const RESIDENT_DEF=Object.freeze({id:'interior-resident',owner:'pressure',hp:150,xp:90,height:2.9,radius:.43,mass:110,dmg:20});

// The fold a room's bodies wait in: a row's own, else a congregation bows, a resident hunches.
function restFold(d) { return d.fold ?? (d.seats ? 1.04 : 0.83); }

// Does the place this room belongs to still hold a room nobody has cleared? Module-level so
// a bare lane (tests call _finish on a stub) needs nothing but events and _isCleared.
function moreAtSite(h, e) {
  const events = h.events; if (!events) return false;
  for (let i = 0; i < events.length; i++) {
    const c = events[i];
    if (c !== e && c.def.site === e.def.site && !h._isCleared(c)) return true;
  }
  return false;
}

// The lowest drawn surface above y0 over each query point (_qx/_qz), folded into _qTop, for
// one mesh. A vertical ray against every triangle, projected on the ground plane: a wall face
// has no area there and is skipped, a deck, a beam or a ceiling is found. Up must stay up in
// the mesh's world transform (a place body is only ever yawed); anything else is skipped.
const QN = 1;
const _qx = new Float64Array(QN), _qz = new Float64Array(QN), _qTop = new Float64Array(QN), _qDrawn = new Float64Array(QN);
const _lx = new Float64Array(QN), _lz = new Float64Array(QN), _ly = new Float64Array(QN), _lTop = new Float64Array(QN);
const _inv = new THREE.Matrix4(), _q = new THREE.Vector3();
function scanUp(o, n, y0) {
  const g = o.geometry, attr = g?.attributes?.position;
  if (!attr || attr.isInterleavedBufferAttribute || attr.itemSize !== 3) return;
  const m = o.material;
  if (!m || (!Array.isArray(m) && (m.transparent || m.depthWrite === false))) return;
  const e = o.matrixWorld.elements;
  if (Math.abs(e[1]) > 1e-4 || Math.abs(e[9]) > 1e-4 || Math.abs(e[4]) > 1e-4 || Math.abs(e[6]) > 1e-4 || !(e[5] > 1e-6)) return;
  _inv.copy(o.matrixWorld).invert();
  for (let i = 0; i < n; i++) {
    _q.set(_qx[i], y0, _qz[i]).applyMatrix4(_inv);
    _lx[i] = _q.x; _ly[i] = _q.y; _lz[i] = _q.z; _lTop[i] = Infinity;
  }
  const pos = attr.array, idx = g.index ? g.index.array : null;
  const tris = idx ? idx.length / 3 : attr.count / 3;
  for (let t = 0; t < tris; t++) {
    const ia = (idx ? idx[t * 3] : t * 3) * 3, ib = (idx ? idx[t * 3 + 1] : t * 3 + 1) * 3, ic = (idx ? idx[t * 3 + 2] : t * 3 + 2) * 3;
    const ax = pos[ia], az = pos[ia + 2], bx = pos[ib], bz = pos[ib + 2], cx = pos[ic], cz = pos[ic + 2];
    const minX = ax < bx ? (ax < cx ? ax : cx) : (bx < cx ? bx : cx), maxX = ax > bx ? (ax > cx ? ax : cx) : (bx > cx ? bx : cx);
    const minZ = az < bz ? (az < cz ? az : cz) : (bz < cz ? bz : cz), maxZ = az > bz ? (az > cz ? az : cz) : (bz > cz ? bz : cz);
    for (let i = 0; i < n; i++) {
      const px = _lx[i], pz = _lz[i];
      if (px < minX || px > maxX || pz < minZ || pz > maxZ) continue;
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (d > -1e-9 && d < 1e-9) continue;
      const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / d;
      const l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      const y = l1 * pos[ia + 1] + l2 * pos[ib + 1] + l3 * pos[ic + 1];
      if (y > _ly[i] && y < _lTop[i]) _lTop[i] = y;
    }
  }
  for (let i = 0; i < n; i++) if (_lTop[i] < Infinity) {
    const wy = e[5] * _lTop[i] + e[13];
    if (wy < _qTop[i]) _qTop[i] = wy;
    if (wy < _qDrawn[i]) _qDrawn[i] = wy;
  }
}

// Collect one mesh's faces in the head band [lo, hi] within rad of (cx, cz), world space.
const _bandTmp = [];
const _va = new THREE.Vector3(), _vb = new THREE.Vector3(), _vc = new THREE.Vector3();
function bandFrom(o, cx, cz, rad, lo, hi) {
  const g = o.geometry, attr = g?.attributes?.position;
  if (!attr || attr.isInterleavedBufferAttribute || attr.itemSize !== 3) return;
  const m = o.material;
  if (!m || (!Array.isArray(m) && (m.transparent || m.depthWrite === false))) return;
  if (!g.boundingSphere) g.computeBoundingSphere();
  _sph.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
  if (Math.hypot(_sph.center.x - cx, _sph.center.z - cz) > _sph.radius + rad) return;
  if (_sph.center.y - _sph.radius > hi || _sph.center.y + _sph.radius < lo) return;
  const e = o.matrixWorld.elements, pos = attr.array, idx = g.index ? g.index.array : null;
  const tris = idx ? idx.length / 3 : attr.count / 3;
  // A place body is only ever yawed: test in its own frame and move to the world only the few
  // faces that are kept. Anything else is moved vertex by vertex.
  const upright = Math.abs(e[1]) < 1e-4 && Math.abs(e[9]) < 1e-4 && Math.abs(e[4]) < 1e-4 && Math.abs(e[6]) < 1e-4 && e[5] > 1e-6;
  let llo = -Infinity, lhi = Infinity, lcx = 0, lcz = 0, lrad = Infinity;
  if (upright) {
    llo = (lo - e[13]) / e[5]; lhi = (hi - e[13]) / e[5];
    _inv.copy(o.matrixWorld).invert(); _q.set(cx, lo, cz).applyMatrix4(_inv); lcx = _q.x; lcz = _q.z;
    lrad = rad / Math.max(1e-6, Math.min(Math.hypot(e[0], e[2]), Math.hypot(e[8], e[10])));
  }
  for (let t = 0; t < tris && _bandTmp.length < BAND_MAX * 9; t++) {
    const ia = (idx ? idx[t * 3] : t * 3) * 3, ib = (idx ? idx[t * 3 + 1] : t * 3 + 1) * 3, ic = (idx ? idx[t * 3 + 2] : t * 3 + 2) * 3;
    if (upright) {
      const ya = pos[ia + 1], yb = pos[ib + 1], yc = pos[ic + 1];
      if ((ya < llo && yb < llo && yc < llo) || (ya > lhi && yb > lhi && yc > lhi)) continue;
      const ax = pos[ia], az = pos[ia + 2], bx = pos[ib], bz = pos[ib + 2], qx = pos[ic], qz = pos[ic + 2];
      const minX = Math.min(ax, bx, qx), maxX = Math.max(ax, bx, qx), minZ = Math.min(az, bz, qz), maxZ = Math.max(az, bz, qz);
      if (minX > lcx + lrad || maxX < lcx - lrad || minZ > lcz + lrad || maxZ < lcz - lrad) continue;
      // no area seen from above: a wall face, never over a head
      if (Math.abs((bx - ax) * (qz - az) - (qx - ax) * (bz - az)) < 1e-6) continue;
    }
    _va.fromArray(pos, ia).applyMatrix4(o.matrixWorld); _vb.fromArray(pos, ib).applyMatrix4(o.matrixWorld); _vc.fromArray(pos, ic).applyMatrix4(o.matrixWorld);
    if (!upright) {
      if ((_va.y < lo && _vb.y < lo && _vc.y < lo) || (_va.y > hi && _vb.y > hi && _vc.y > hi)) continue;
      if (Math.min(_va.x, _vb.x, _vc.x) > cx + rad || Math.max(_va.x, _vb.x, _vc.x) < cx - rad
        || Math.min(_va.z, _vb.z, _vc.z) > cz + rad || Math.max(_va.z, _vb.z, _vc.z) < cz - rad) continue;
      if (Math.abs((_vb.x - _va.x) * (_vc.z - _va.z) - (_vc.x - _va.x) * (_vb.z - _va.z)) < 1e-6) continue;
    }
    _bandTmp.push(_va.x, _va.y, _va.z, _vb.x, _vb.y, _vb.z, _vc.x, _vc.y, _vc.z);
  }
}

// The kept faces, bucketed on a 1 m grid so a stoop reads a handful of faces, not the room.
const BAND_CELL = 1;
function bandGrid(t) {
  const n = t.length / 9;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < t.length; i += 3) { x0 = Math.min(x0, t[i]); x1 = Math.max(x1, t[i]); z0 = Math.min(z0, t[i + 2]); z1 = Math.max(z1, t[i + 2]); }
  if (!n) return { t, x0: 0, z0: 0, nx: 0, nz: 0, start: new Int32Array(1), list: new Int32Array(0) };
  const nx = Math.max(1, Math.ceil((x1 - x0) / BAND_CELL) + 1), nz = Math.max(1, Math.ceil((z1 - z0) / BAND_CELL) + 1);
  const count = new Int32Array(nx * nz + 1);
  const cells = (i, fn) => {
    const ax = t[i], az = t[i + 2], bx = t[i + 3], bz = t[i + 5], cx = t[i + 6], cz = t[i + 8];
    const i0 = Math.floor((Math.min(ax, bx, cx) - x0) / BAND_CELL), i1 = Math.floor((Math.max(ax, bx, cx) - x0) / BAND_CELL);
    const k0 = Math.floor((Math.min(az, bz, cz) - z0) / BAND_CELL), k1 = Math.floor((Math.max(az, bz, cz) - z0) / BAND_CELL);
    for (let k = k0; k <= k1; k++) for (let j = i0; j <= i1; j++) fn(k * nx + j);
  };
  for (let i = 0; i < t.length; i += 9) cells(i, c => { count[c + 1]++; });
  for (let c = 0; c < nx * nz; c++) count[c + 1] += count[c];
  const fill = count.slice(0, nx * nz), list = new Int32Array(count[nx * nz]);
  for (let i = 0; i < t.length; i += 9) cells(i, c => { list[fill[c]++] = i; });
  return { t, x0, z0, nx, nz, start: count, list };
}

// The lowest kept face over a disc of radius r at (x, z), above y0, or Infinity. Exact for a
// level face (a beam, a lintel, a deck); a sloping one is taken at its lowest over the disc.
function bandUnder(g, x, z, r, y0) {
  const C = BAND_CELL, band = g.t;
  const j0 = Math.max(0, Math.floor((x - r - g.x0) / C)), j1 = Math.min(g.nx - 1, Math.floor((x + r - g.x0) / C));
  const k0 = Math.max(0, Math.floor((z - r - g.z0) / C)), k1 = Math.min(g.nz - 1, Math.floor((z + r - g.z0) / C));
  let top = Infinity;
  for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) {
    const c = k * g.nx + j;
    for (let q = g.start[c], end = g.start[c + 1]; q < end; q++) {
      const i = g.list[q];
      const ax = band[i], ay = band[i + 1], az = band[i + 2], bx = band[i + 3], by = band[i + 4], bz = band[i + 5];
      const cx = band[i + 6], cy = band[i + 7], cz = band[i + 8];
      const lowY = ay < by ? (ay < cy ? ay : cy) : (by < cy ? by : cy);
      if (lowY >= top) continue;
      if ((ax < x - r && bx < x - r && cx < x - r) || (ax > x + r && bx > x + r && cx > x + r)
        || (az < z - r && bz < z - r && cz < z - r) || (az > z + r && bz > z + r && cz > z + r)) continue;
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (d > -1e-9 && d < 1e-9) continue;
      // the point of the face nearest the disc's centre, on the floor plan
      let l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
      let px = x, pz = z, dist = 0;
      if (l1 < 0 || l2 < 0 || l1 + l2 > 1) {
        dist = Infinity;
        for (let e = 0; e < 3; e++) {
          const sx = e === 0 ? ax : e === 1 ? bx : cx, sz = e === 0 ? az : e === 1 ? bz : cz;
          const tx = e === 0 ? bx : e === 1 ? cx : ax, tz = e === 0 ? bz : e === 1 ? cz : az;
          const ex = tx - sx, ez = tz - sz, len = ex * ex + ez * ez;
          const u = len > 1e-12 ? Math.min(1, Math.max(0, ((x - sx) * ex + (z - sz) * ez) / len)) : 0;
          const qx = sx + ex * u, qz = sz + ez * u, dd = Math.hypot(x - qx, z - qz);
          if (dd < dist) { dist = dd; px = qx; pz = qz; }
        }
        if (dist > r) continue;
        l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / d; l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / d;
      }
      const y = l1 * ay + l2 * by + (1 - l1 - l2) * cy;
      // how fast the face falls away across the floor plan, for the rest of the disc
      const gx = ((bz - cz) * (ay - cy) + (cz - az) * (by - cy)) / d, gz = ((cx - bx) * (ay - cy) + (ax - cx) * (by - cy)) / d;
      const est = Math.max(lowY, y - Math.hypot(gx, gz) * (r - dist));
      if (est > y0 && est < top) top = est;
    }
  }
  return top;
}

function paint(g, color) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set(color, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

function sculpt(mat, fn) {
  const parts = [];
  const shape = (g, x, y, z, color, rx = 0, rz = 0) => {
    g.rotateX(rx); g.rotateZ(rz); g.translate(x, y, z); parts.push(paint(g, color));
  };
  const ell = (x, y, z, w, h, d, color, rx = 0, rz = 0) => {
    const g = new THREE.SphereGeometry(1, 12, 9); g.scale(w, h, d); shape(g, x, y, z, color, rx, rz);
  };
  const rod = (x, y, z, top, bottom, length, color, rx = 0, rz = 0) =>
    shape(new THREE.CylinderGeometry(top, bottom, length, 7), x, y, z, color, rx, rz);
  fn(ell, rod, shape);
  const g = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; return mesh;
}

// One readable, deliberately wrong anatomy: a narrow coat hanging off an extra-long chest,
// a face whose mouth reaches its throat, bone fingers, and a second lower row of teeth.
// Every moving section is merged. The mapped enemy shell already has a boot-warmed program.
function residentRig(mat, index) {
  const root = new THREE.Group(); root.name = 'interior-resident-' + index; root.visible = false;
  const hips = new THREE.Group(); root.add(hips);
  const lower = sculpt(mat, (ell, _rod, shape) => {
    shape(loft([[.58,.10,.10],[.70,.25,.18],[.91,.28,.21],[1.17,.23,.17],[1.34,.15,.11]],
      {segments:32,subdivisions:4,folds:.10,seed:index}),0,0,0,CLOTH);
    for (const s of [-1, 1]) {
      shape(loft([[.07,.065,.075,0,.025],[.20,.077,.080],[.43,.089,.085],[.61,.105,.094],
        [.85,.117,.105],[.98,.09,.09]],{segments:24,subdivisions:4,folds:.065,seed:index+s}),s*.18,0,-.06,CLOTH);
      ell(s * 0.20, 0.09, 0.10, 0.115, 0.075, 0.24, VOID);
      shape(tendon([[s*.22,.51,.12],[s*.26,.78,.14],[s*.30,1.08,.10],[s*.25,1.32,.065]],.031,.015,24,8),0,0,0,SEAM);
    }
  });
  hips.add(lower);
  const torso = new THREE.Group(); torso.position.y = 1.18; hips.add(torso);
  torso.add(sculpt(mat, (ell, _rod, shape) => {
    shape(loft([[-.12,.13,.10],[.08,.25,.16],[.28,.22,.14],[.51,.255,.165],
      [.76,.31,.171,-.015,-.01],[.92,.42,.149,-.018,-.028],[1.02,.31,.13],[1.11,.095,.087]],
      {segments:40,subdivisions:4,folds:.075,seed:index+.3}),0,0,0,CLOTH);
    shape(tendon([[0,.07,.153],[.017,.39,.171],[-.011,.73,.184],[0,1.09,.10]],.023,.012,30,9),0,0,0,SEAM);
    for (let i = 0; i < 6; i++) {
      ell(-0.018, 0.97 - i * 0.15, 0.177, 0.025, 0.024, 0.018, SKIN);
      for(const s of [-1,1]){
        const y=.88-i*.12,r=.285-i*.015;
        shape(tendon([[s*.055,y+.045,-.05],[s*r,y,.04],[s*r*.69,y-.035,.155],[s*.03,y-.064,.18]],.018,.008,22,8),0,0,0,SEAM);
      }
    }
    shape(loft([[1.04,.103,.092],[1.16,.089,.080,.012,.014],[1.31,.073,.069,.022,.034],[1.40,.061,.057,.018,.03]],
      {segments:24,subdivisions:3,folds:.025}),0,0,0,SKIN);
  }));
  const head = new THREE.Group(); head.position.set(0.018, 1.40, 0.028); torso.add(head);
  head.add(sculpt(mat, (_ell, _rod, shape) => {
    // The resident looks along +Z, opposite the roaming bodies. Rotate the
    // anatomical sculpture once without changing this encounter's head pivot.
    const face=fracturedMask({variant:index%2,scale:[2.12,2.95,1.88],origin:[0,.015,-.008],fracture:.019,mouth:.038});
    face.geometry.rotateY(Math.PI);face.innerGeometry.rotateY(Math.PI);
    shape(face.innerGeometry,0,0,0,VOID);shape(face.geometry,0,0,0,SKIN);
    shape(loft([[-.29,.086,.068,0,-.105],[-.16,.193,.105,0,-.11],[.06,.226,.143,0,-.102],
      [.27,.184,.135,0,-.079],[.38,.016,.017,0,-.065]],{segments:32,subdivisions:4,folds:.065,seed:index}),0,0,0,CLOTH);
    for(const s of [-1,1]){
      shape(tendon([[s*.122,.12,.13],[s*.144,-.055,.16],[s*.082,-.245,.185],[s*.017,-.367,.19]],
        .018,.007,26,9),0,0,0,SEAM);
      const rag=loft([[-.41,.003,.003],[-.29,.018,.006,.01,0],[-.02,.024,.009],
        [.23,.022,.008,-.014,-.01],[.31,.009,.005]],{segments:12,subdivisions:3,folds:.18,seed:index+s});
      shape(rag,s*.18,-.035,.08,CLOTH,0,s*.13);
    }
    // Fine irregular teeth stay inside the mouth opening, without emissive eyes.
    for(let i=0;i<5;i++)shape(tendon([[(i-2)*.018,-.106,.228],[(i-2)*.019,-.142-(i%2)*.021,.237]],.006,.002,6,6),0,0,0,TEETH);
  }));
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.40, 0.95, 0); torso.add(arm); arms.push(arm);
    arm.add(sculpt(mat, (_ell, _rod, shape) => {
      shape(loft([[.025,.047,.049],[0,.118,.115],[-.17,.117,.099,s*.052,.006],[-.43,.096,.08,s*.14,.014],
        [-.68,.065,.067,s*.20,.033],[-.78,.061,.066,s*.21,.038]],{segments:24,subdivisions:4,folds:.075,seed:index}),0,0,0,CLOTH);
      shape(loft([[-.72,.060,.062,s*.21,.038],[-.89,.071,.063,s*.20,.06],[-1.11,.040,.038,s*.19,.105],
        [-1.27,.033,.03,s*.18,.127],[-1.36,.068,.035,s*.17,.14],[-1.435,.055,.029,s*.17,.151]],
        {segments:24,subdivisions:4,folds:.035}),0,0,0,SKIN);
      for(let i=0;i<4;i++){
        const x=s*(.12+i*.033),len=.23+i*.014;
        shape(tendon([[x,-1.405,.158],[x+s*.009,-1.49,.174],[x+s*.015,-1.46-len,.199],[x,-1.49-len,.17]],
          .017,.0045,24,8),0,0,0,SKIN);
      }
    }));
  }
  const rope = sculpt(mat, (_ell, rod) => rod(0, 0.5, 0, 0.018, 0.020, 1, SEAM));
  rope.visible = false; root.add(rope);
  return { root, hips, torso, head, arms, rope, x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0,
    yaw: 0, baseYaw: 0, face: 0, prevFace: 0, fold: 0, prevFold: 0, scale: 1,
    floor: 0, ceiling: 0, active: false, phase: 0,
    interior:true,def:RESIDENT_DEF,species:'interior-resident',pos:new THREE.Vector3(),
    hp:150,alive:true,dead:false,deathT:0,searched:false,attackT:-1,cooldown:0,index };
}

export class InteriorHorror {
  static id = 'interior-horror';

  constructor(ctx) {
    this.ctx = ctx; this.enabled = true; this.clock = 0; this.active = null;
    this.cooldown = 0; this.events = []; this.actors = []; this._siteGate = null;
    this.stats = { started: 0, payoffs: 0, shots: 0, protected: 0, blockedSight: 0, blockedRush: 0 };
  }

  async init() {
    this.rng = this.ctx.rng.fork('interior-horror');
    this.root = new THREE.Group(); this.root.name = 'interior-horror'; this.ctx.scene.add(this.root);
    this.mat = makeShell(1, 1, 1); this.mat.name = 'interior-resident-cloth';
    for (let i = 0; i < POOL; i++) { const a = residentRig(this.mat, i); this.actors.push(a); this.root.add(a.root); }
    this._measureRig(this.actors[0]);
    const places = this.ctx.systems.get('places');
    for (const def of INTERIOR_ENCOUNTERS) {
      const site = places.nodes.get(def.site); if (!site) throw new Error('interior-horror: missing ' + def.site);
      this.events.push({ def, site, spent: false, away: 0, last: -REARM, dwell: 0,
        stage: 'dormant', t: 0, seen: 0, notSeen: 0, sounded: 0, rushed: false,
        dropped: false, far: false, hangAt: -1, ropeTop: 0 });
    }
    this._offRespawn = this.ctx.bus.on('player:respawn', () => this._finish());
    this.ctx.shared.interiorHorror = false;
  }

  ready() { return this.events.length === INTERIOR_ENCOUNTERS.length && this.actors.length === POOL; }
  _sys(id) { return this.ctx.systems.get(id); }

  _world(e, x, y, z, out) {
    const r = e.site, c = Math.cos(r.yaw), s = Math.sin(r.yaw);
    out.x = r.def.x + x * c + z * s; out.z = r.def.z - x * s + z * c;
    out.y = r.padY + y;
    if (e.def.terrain) out.y = this._sys('terrain').heightAt(out.x, out.z) + y;
    return out;
  }

  _inside(e, p) {
    const r = e.site, z = e.def.zone, c = Math.cos(r.yaw), s = Math.sin(r.yaw);
    const dx = p.x - r.def.x, dz = p.z - r.def.z;
    const lx = dx * c - dz * s - z[0], lz = dx * s + dz * c - z[1];
    const cy = Math.cos(z[4] || 0), sy = Math.sin(z[4] || 0);
    const x = lx * cy - lz * sy, zz = lx * sy + lz * cy;
    const floor = e.def.terrain ? this._sys('terrain').heightAt(p.x, p.z) : r.padY;
    return Math.abs(x) < z[2] * 0.5 && Math.abs(zz) < z[3] * 0.5 && Math.abs(p.y - floor - e.def.y) < 1.15;
  }

  _protected(p) {
    if(this._sys('holdfast-life')?.contains(p.x,p.z) || this.ctx.shared.bossEncounter) return true;
    const refuge = this._sys('refuge');
    return refuge.isResting() || refuge.isProtected(p.x, p.y, p.z);
  }

  // Something else already owns the moment. A Kneeler counts only while it is actually on you:
  // the Mine's sits 16 m from the shift room and can hunt for minutes, and a room that waits
  // for it to sleep is a marked defender that never comes.
  _busy(p) {
    if (this._sys('director').permit().huntNear) return true;
    for (const boss of this._sys('kneeler').all) {
      if (boss.alive && boss.state !== 'dormant' && boss.state !== 'kneel' && boss.state !== 'return'
        && Math.hypot(p.x - boss.pos.x, p.z - boss.pos.z) < 12 && Math.abs(p.y - boss.pos.y) < 4) return true;
    }
    return false;
  }

  _visible(a, p, cone = 0.65) {
    const cam = this._sys('camera'), eye = p.y + CFG.player.EYE;
    const crouch = 1 - clamp01((a.fold - 0.7) / 0.6) * 0.42;
    const forward = 1.4 * Math.sin(a.fold * 1.26) * a.scale;
    const tx = a.x + Math.sin(a.baseYaw) * forward, tz = a.z + Math.cos(a.baseYaw) * forward;
    const targetY = a.y + a.scale * (1.18 + 1.4 * Math.cos(a.fold * 1.26)) * crouch;
    const dx = tx - p.x, dy = targetY - eye, dz = tz - p.z;
    const d = Math.hypot(dx, dy, dz); if (d < 0.001 || d > 26) return false;
    const pitch = cam.pitch || 0, cp = Math.cos(pitch);
    const dot = (-Math.sin(cam.yaw) * cp * dx + Math.sin(pitch) * dy - Math.cos(cam.yaw) * cp * dz) / d;
    if (dot < cone) return false;
    const clear = this._sys('collision').segmentClear(p.x, eye, p.z, tx, targetY, tz);
    if (!clear) this.stats.blockedSight++;
    return clear;
  }

  // Could the player see any of this room's places right now, from the floor to a hanging
  // head? A body is only ever put into a room, or taken out of one, when this is false.
  _seatsInView(e, p) {
    const cam = this._sys('camera'), col = this._sys('collision'), eye = p.y + CFG.player.EYE;
    const pitch = cam.pitch || 0, cp = Math.cos(pitch);
    const fx = -Math.sin(cam.yaw) * cp, fy = Math.sin(pitch), fz = -Math.cos(cam.yaw) * cp;
    const seats = e.def.seats || ONE_SEAT;
    for (let i = 0; i < seats.length; i++) {
      this._world(e, e.def.x + seats[i][0], e.def.y, e.def.z + seats[i][1], _seatP);
      for (let k = 0; k < VIEW_H.length; k++) {
        const ty = _seatP.y + VIEW_H[k], dx = _seatP.x - p.x, dy = ty - eye, dz = _seatP.z - p.z;
        const d = Math.hypot(dx, dy, dz);
        if (d > 34) continue;
        if (d > 0.001 && (fx * dx + fy * dy + fz * dz) / d < 0.35) continue;
        if (col.segmentClear(p.x, eye, p.z, _seatP.x, ty, _seatP.z)) return true;
      }
    }
    return false;
  }

  // How much this room wants the pool: its distance, a storey counts heavily, and the room you
  // are standing in wins. Infinity when it cannot take a body at all.
  _score(c, p) {
    if (c.spent) return Infinity;
    const pr = this._sys('progress');
    if (pr.flag('interior-returned:' + c.def.id) || pr.flag('secured:' + c.def.site) || this._isCleared(c)) return Infinity;
    this._world(c, c.def.x, c.def.y, c.def.z, _origin);
    const d = Math.hypot(p.x - _origin.x, p.z - _origin.z), dy = Math.abs(p.y - _origin.y);
    if (d > 48 || dy > 5) return Infinity;
    return d + dy * 6 - (this._inside(c, p) ? 24 : 0);
  }

  // Measured once from the real rig at scale 1, facing +Z: how tall it stands at each fold
  // (the stoop reads this), and the top of its hanging pose over each patch of floor.
  _pose(a, fold) {
    const r = a.root; r.position.set(0, 0, 0); r.rotation.set(0, 0, 0); r.scale.setScalar(1);
    a.hips.scale.y = 1 - clamp01((fold - 0.7) / 0.6) * 0.42;
    a.torso.rotation.set(fold * 1.26, 0, 0);
    a.head.rotation.set(-fold * 0.68 - 0.16, 0, 0.13);
    for (let i = 0; i < a.arms.length; i++) a.arms[i].rotation.set(-fold * 0.42, 0, (i ? 1 : -1) * 0.09);
    r.updateMatrixWorld(true);
  }

  _measureRig(a) {
    this._tops = new Float64Array(STOOP_N);
    for (let i = 0; i < STOOP_N; i++) {
      this._pose(a, i * STOOP_STEP);
      _box.makeEmpty(); _box.expandByObject(a.torso, true);
      this._tops[i] = _box.max.y;
    }
    this._pose(a, 0.83);
    const cells = new Map(), v = _va;
    a.hips.traverse(o => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        const key = Math.round(v.x / PROFILE_CELL) * 4096 + Math.round(v.z / PROFILE_CELL);
        const top = cells.get(key);
        if (top === undefined || v.y > top) cells.set(key, v.y);
      }
    });
    const out = [];
    for (const [key, top] of cells) {
      const k = Math.round(key / 4096), j = key - k * 4096;
      out.push(k * PROFILE_CELL, j * PROFILE_CELL, top);
    }
    this._profile = new Float64Array(out);
  }

  // The least fold at which this body's top is under `room` metres.
  _foldUnder(a, room) {
    const t = this._tops, s = a.scale;
    if (t[0] * s <= room) return 0;
    for (let i = 1; i < STOOP_N; i++) if (t[i] * s <= room) {
      const f = (t[i - 1] * s - room) / Math.max(1e-6, (t[i - 1] - t[i]) * s);
      return (i - 1 + f) * STOOP_STEP;
    }
    return (STOOP_N - 1) * STOOP_STEP;
  }

  // How high this room's body hangs, and where its rope is tied. 0 = it stands on the floor.
  // Measured once per room per session (never per frame): every collider and every drawn face
  // of the place over each patch of the hanging silhouette, against that patch's own top.
  _hangFor(e, a) {
    if (e.hangAt >= 0) { a.ceiling = e.ropeTop; return e.hangAt; }
    const band = this._headBand(e);
    if (!band) return 0;                           // the place is not built yet: stand, measure later
    const col = this._sys('collision'), s = a.scale, c = Math.cos(a.baseYaw), sn = Math.sin(a.baseYaw);
    const y0 = a.floor + 1.0, pr = this._profile;
    let hang = HANG_MAX;
    for (let i = 0; i < pr.length; i += 3) {
      const lx = pr[i] * s, lz = pr[i + 1] * s, x = a.x + lx * c + lz * sn, z = a.z - lx * sn + lz * c;
      _colO.x = x; _colO.y = y0; _colO.z = z;
      const h = col.raycast(_colO, _colUp, 9, col.MASK.SOLID | col.MASK.SHOT | col.MASK.SIGHT);
      const over = Math.min(h ? y0 + h.t : Infinity, bandUnder(band, x, z, PROFILE_CELL * 0.75, y0));
      hang = Math.min(hang, over - a.floor - pr[i + 2] * s - HANG_CLEAR);
    }
    // The rope is tied to the drawn surface straight over it, else to the solid one.
    _qx[0] = a.x; _qz[0] = a.z; _colO.x = a.x; _colO.y = y0; _colO.z = a.z;
    const hr = col.raycast(_colO, _colUp, 9, col.MASK.SOLID | col.MASK.SHOT | col.MASK.SIGHT);
    _qTop[0] = hr ? y0 + hr.t : Infinity; _qDrawn[0] = Infinity;
    const places = this._sys('places'), body = places.group.getObjectByName('place-body-' + e.def.site);
    body.traverse(o => { if (o.isMesh) scanUp(o, 1, y0); });
    for (const g of [places.landGroup, this._sys('world-stories')?.group]) g?.traverseVisible(o => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const geo = o.geometry; if (!geo.boundingSphere) geo.computeBoundingSphere();
      _sph.copy(geo.boundingSphere).applyMatrix4(o.matrixWorld);
      if (Math.hypot(_sph.center.x - a.x, _sph.center.z - a.z) < _sph.radius) scanUp(o, 1, y0);
    });
    const rope = _qDrawn[0] < Infinity ? _qDrawn[0] : _qTop[0];
    // The feet clear whatever stands under the rope (a crate, a can, a bench).
    let under = a.floor;
    for (let k = -1; k <= 1; k++) {
      _colO.x = a.x + k * 0.25 * c; _colO.y = a.floor + HANG_MAX + 0.2; _colO.z = a.z - k * 0.25 * sn;
      const h = col.raycast(_colO, _colDown, HANG_MAX + 0.2, col.MASK.SOLID);
      if (h) under = Math.max(under, _colO.y - h.t);
    }
    if (!(hang >= Math.max(HANG_MIN, under - a.floor + 0.05)) || !Number.isFinite(rope)) hang = 0;
    e.hangAt = hang; e.ropeTop = rope; a.ceiling = rope;
    return hang;
  }

  // Can a swing from here reach you? From the hip or from the shoulder: a bench back or a
  // table edge between you does not stop a 2.9 m arm, a wall or a shut door does.
  _reaches(a, p) {
    const col = this._sys('collision');
    return col.segmentClear(a.x, a.floor + 1.0, a.z, p.x, p.y + 1.0, p.z)
      || col.segmentClear(a.x, a.floor + 1.9 * a.scale, a.z, p.x, p.y + 1.3, p.z);
  }

  // The room's head band (see BAND_LO). Built once per room per session, when it is staged.
  _headBand(e) {
    if (e.band) return e.band;
    const places = this._sys('places'), body = places?.group?.getObjectByName('place-body-' + e.def.site);
    if (!body) return null;
    const z = e.def.zone;
    this._world(e, z[0], e.def.y, z[1], _origin);
    const rad = Math.hypot(z[2], z[3]) * 0.5 + 4, lo = _origin.y + BAND_LO;
    const hi = _origin.y + (e.def.kind === 'suspended' ? BAND_HANG : BAND_HI);
    _bandTmp.length = 0;
    body.updateMatrixWorld(true);
    body.traverse(o => { if (o.isMesh) bandFrom(o, _origin.x, _origin.z, rad, lo, hi); });
    // The place's landmark and the county's story props (a line of coats, a lamp) count too.
    for (const g of [places.landGroup, this._sys('world-stories')?.group]) {
      if (!g) continue;
      g.updateMatrixWorld(true);
      g.traverseVisible(o => { if (o.isMesh) bandFrom(o, _origin.x, _origin.z, rad, lo, hi); });
    }
    e.band = bandGrid(new Float32Array(_bandTmp)); _bandTmp.length = 0;
    return e.band;
  }

  // Bend under whatever is over this body and, when it is moving, the way it is going. Once it
  // has to bend, its head goes forward, so where the head would then be is read as well.
  // Bending is quick but never a snap; straightening is slower, as a body that has learned the
  // room is low.
  _stoop(e, a, dt, towardX, towardZ, moving) {
    const band = e.band; if (!band || !band.list.length) { a.stoop = 0; return; }
    // Anything under chest height is furniture to walk round, not a beam to bend under.
    const s = a.scale, y0 = a.floor + 1.8 * s, r = 0.45 * s;
    let room = bandUnder(band, a.x, a.z, r, y0);
    const tx = towardX - a.x, tz = towardZ - a.z, d = Math.hypot(tx, tz);
    if (moving && d > 0.05) room = Math.min(room, bandUnder(band, a.x + tx / d * 0.8 * s, a.z + tz / d * 0.8 * s, r, y0));
    let target = room < Infinity ? this._foldUnder(a, room - a.floor - 0.06) : 0;
    const fx = Math.sin(a.baseYaw), fz = Math.cos(a.baseYaw);
    for (let k = 0; k < 2; k++) {
      const bent = Math.max(target, a.fold); if (bent <= 0.02) break;
      const reach = (0.25 + 1.4 * Math.sin(1.26 * Math.min(bent, 1.1))) * s;
      room = Math.min(room, bandUnder(band, a.x + fx * reach * 0.5, a.z + fz * reach * 0.5, r, y0),
        bandUnder(band, a.x + fx * reach, a.z + fz * reach, r, y0));
      target = room < Infinity ? this._foldUnder(a, room - a.floor - 0.06) : 0;
    }
    const cur = a.stoop || 0;
    a.stoop = target > cur ? Math.min(target, cur + dt * 8) : cur + (target - cur) * Math.min(1, dt * 5);
    if (a.fold < a.stoop) a.fold = a.stoop;
  }

  _stage(e) {
    if (this._returning() || this._sys('progress')?.flag('interior-returned:'+e.def.id)) return;
    this._siteGate = null;
    this.active = e; e.stage = 'waiting'; e.t = 0; e.dwell = 0; e.seen = 0; e.notSeen = 0; e.sounded = 0; e.rushed = false;
    const d = e.def, seats = d.seats;
    // A body that dropped stays down while you are anywhere near. Only after you went 90 m
    // away, and only if you cannot see its room as it is put back, does it hang again.
    let hangs = d.kind === 'suspended';
    if (hangs && e.dropped) {
      const p = this._sys('player')?.pos;
      hangs = e.far && !!p && !this._seatsInView(e, p);
      if (hangs) { e.dropped = false; e.far = false; }
    }
    this._headBand(e);
    for (let i = 0; i < POOL; i++) {
      const a = this.actors[i],killed=this._sys('progress').flag('interior-killed:'+e.def.id)||0;
      a.active = i < (seats ? seats.length : 1) && !(killed & (1<<i)); a.root.visible = a.active;
      if (!a.active) continue;
      a.hp=a.maxHp=d.hp||RESIDENT_DEF.hp;a.alive=true;a.dead=false;a.deathT=0;a.searched=false;a.attackT=-1;a.cooldown=0;
      a.encounter=e.def.id;a.index=i;
      const seat = seats ? seats[i] : ONE_SEAT[0];
      this._world(e, d.x + seat[0], d.y, d.z + seat[1], _origin);
      a.floor = _origin.y; a.x = a.px = _origin.x; a.z = a.pz = _origin.z;
      a.scale = d.scale || (seats ? 0.88 + i * 0.026 : 1);
      a.yaw = a.baseYaw = e.site.yaw + (seat.length > 2 ? seat[2] : d.yaw);
      a.ceiling = a.floor; a.hang = hangs ? this._hangFor(e, a) : 0; a.landed = false; a.fallV = 0; a.stoop = 0;
      a.seatYaw = a.baseYaw; a.back = 0;
      a.y = a.py = a.floor + a.hang;
      a.face = a.prevFace = 0; a.fold = restFold(d);
      // Waiting too, a body bows under the lamp or the beam it stands at, never into it.
      if (a.hang === 0) this._stoop(e, a, 1, a.x, a.z, false);
      a.prevFold = a.fold;
      a.phase = this.rng.range(0, 6.28); a.rope.visible = a.hang > 0;
      a.pos.set(a.x,a.y,a.z);
    }
    this.present(1);
  }

  _say(kind, a, gain = 0.6) { this._sys('dread').answer(kind, a.x, a.y + 1.6, a.z, gain); }

  _begin(e) {
    e.stage = 'listening'; e.t = 0; e.last = this.clock; this.stats.started++;
    this.ctx.shared.interiorHorror = true;
    this._say(this.actors[0].hang > 0 ? 'branch' : 'door', this.actors[0], 0.53);
    this._sys('dread').hush(4.0, this.actors[0].x, this.actors[0].z);
    this.ctx.bus.emit('interior:beat', { id: e.def.id, site: e.def.site, kind: e.def.kind, phase: 'build' });
  }

  _payoff(e) {
    e.stage = 'turning'; e.t = 0; this.stats.payoffs++;
    const a = this.actors[0];
    // A hanging body lets go now and is heard when it hits the floor (step). It drops once.
    if (a.hang > 0) { this._say('brush', a, 0.5); e.dropped = true; e.far = false; }
    else this._say('witnessed', a, 0.80);
    this.ctx.bus.emit('dread:stinger', { kind: 'interior-' + e.def.kind });
    this.ctx.bus.emit('interior:beat', { id: e.def.id, site: e.def.site, kind: e.def.kind, phase: 'payoff' });
  }

  _isCleared(e) {
    if (this._sys('progress')?.flag('interior-returned:'+e.def.id)) return true;
    const mask=(1<<(e.def.seats?.length||1))-1;
    return ((this._sys('progress')?.flag('interior-killed:'+e.def.id)||0)&mask)===mask;
  }

  _finish(spent = true) {
    const e = this.active;
    if (e) {
      // These bodies are now part of the site's clear condition. Leaving a fight
      // cannot consume a vignette and hide required survivors for five minutes.
      // Actual kills persist seat by seat; only a completed mask spends the scene.
      const cleared=this._isCleared(e);e.spent=cleared;
      // A cleared room with another uncleared room at the same place hands over after a
      // breath, not the county's 42 s: "ROOM TO CHECK" must never point at an empty room.
      if (spent && e.stage !== 'waiting') {
        e.last = this.clock;
        this.cooldown = cleared ? (moreAtSite(this, e) ? SITE_GAP : GLOBAL_GAP) : Math.max(this.cooldown,6);
      }
      // Whatever comes back to this place next arrives out of sight: you were just here.
      this._siteGate = e.def.site;
      e.stage = 'dormant'; e.away = 0;
    }
    for (const a of this.actors) { a.root.visible = false; a.active = false; }
    this.active = null; this.ctx.shared.interiorHorror = false;
  }

  _rush(a, p, dt) {
    const dx = p.x - a.x, dz = p.z - a.z, dist = Math.hypot(dx, dz);
    if (dist < 1.55) return;
    const amount = Math.min(dist - 1.55, dt * 4.8);
    const col = this._sys('collision');
    // Three parallel rays cover shoulders, knees and shins. Never sprint a silhouette through
    // a pew, a sealed door, or a wall merely because the centre ray happened to be clear. The
    // shin ray (the same heights as _nudge) is for a chair: its body stops at the seat, 0.47 m,
    // under the knee ray, and a Blackthorn guest walked through the grandfather's chair.
    const base=Math.atan2(dx,dz),side=a.steerSide||1;
    for(const turn of [0,side*.55,-side*.55,side*1.05,-side*1.05,side*1.5,-side*1.5]){
      const vx=Math.sin(base+turn),vz=Math.cos(base+turn),look=Math.min(dist-.9,Math.max(amount,.68));
      let clear=true;
      for(const offset of [-.32,0,.32]){
        const sx=vz*offset,sz=-vx*offset;
        for(const h of RUSH_H)if(!col.segmentClear(a.x+sx,a.floor+(h>1?h*a.scale:h),a.z+sz,
          a.x+sx+vx*look,a.floor+(h>1?h*a.scale:h),a.z+sz+vz*look)){clear=false;break;}
        if(!clear)break;
      }
      if(clear){a.x+=vx*amount;a.z+=vz*amount;if(turn)a.steerSide=Math.sign(turn);return;}
    }
    this.stats.blockedRush++;
  }

  raycast(origin, direction, maxT) {
    if(!this.active||this._returning())return null;
    _meshRay.set(origin,direction);_meshRay.near=0;_meshRay.far=maxT;
    let best=null;
    for(const a of this.actors){
      if(!a.active||!a.alive)continue;
      a.root.updateMatrixWorld(true);
      const hits=_meshRay.intersectObject(a.root,true);
      const h=hits.find(h=>h.object!==a.rope);
      if(h&&(!best||h.distance<best.t))best={t:h.distance,enemy:a,zone:h.object.parent===a.head?'head':'torso',point:h.point};
    }
    return best;
  }

  damage(a,amount,info={}) {
    if(!a?.active||!a.alive||this._returning())return{killed:false};
    const e=this.active;a.hp-=Math.max(1,Number.isFinite(amount)?amount:1);this.stats.shots++;
    a.pos.set(a.x,a.y,a.z);
    if(a.hp<=0){
      a.hp=0;a.alive=false;a.dead=true;a.deathT=0;a.deathFold=a.fold;a.attackT=-1;a.rope.visible=false;
      const pr=this._sys('progress'),flag='interior-killed:'+a.encounter;
      pr.flag(flag,(pr.flag(flag)||0)|(1<<a.index));
      this._say('withdraw',a,.60);
      // A lighter body pays in proportion: four breakfast guests are not four full residents.
      const xp=Math.round(RESIDENT_DEF.xp*(a.maxHp||RESIDENT_DEF.hp)/RESIDENT_DEF.hp);
      this.ctx.bus.emit('enemy:killed',{e:a,x:a.x,y:a.y+.6,z:a.z,xp,species:a.species,owner:'pressure',zone:info.zone,melee:!!info.melee});
      if(!this.actors.some(b=>b.active&&b.alive)){e.stage='remains';e.t=0;e.spent=true;this.ctx.shared.interiorHorror=false;}
      return{killed:true,hpFrac:0,species:a.species};
    }
    if(e.stage==='waiting'||e.stage==='listening'||e.stage==='collapsing'||e.stage==='remains')this._payoff(e);
    a.flinchUntil=this.clock+.15;
    return{killed:false,hpFrac:a.hp/(a.maxHp||RESIDENT_DEF.hp),species:a.species};
  }

  _combat(dt,p,player) {
    if (this._returning()) return;
    const e=this.active;
    for(const a of this.actors){
      if(!a.active||!a.alive)continue;
      a.fold=0;a.y=a.floor;a.rope.visible=false;
      this._stoop(e,a,dt,p.x,p.z,true);
      const dx=p.x-a.x,dz=p.z-a.z,dist=Math.hypot(dx,dz);
      a.face=0;a.baseYaw=Math.atan2(dx,dz);a.cooldown=Math.max(0,a.cooldown-dt);
      if(a.attackT>=0){
        a.attackT+=dt;
        if(a.attackT>=.68){
          // Commit the swing before it lands. Sidestepping it or closing a solid door works;
          // a low bench back between you does not (the Mine's chain room: 7 swings, 0 hurts).
          if(Math.hypot(p.x-a.strikeX,p.z-a.strikeZ)<1.05&&dist<2.45&&Math.abs(p.y-a.floor)<1.1
            &&this._reaches(a,p))player.hurt(RESIDENT_DEF.dmg,{x:dx/(dist||1),y:0,z:dz/(dist||1)});
          a.attackT=-1;a.cooldown=1.8;
        }
      }else if(this.clock>(a.flinchUntil||0)){
        // It only swings at you when the swing can arrive; otherwise it keeps coming round.
        const close=dist<2.05&&a.cooldown<=0&&Math.abs(p.y-a.floor)<1.1;
        if(close&&this._reaches(a,p)){a.attackT=0;a.strikeX=p.x;a.strikeZ=p.z;this._say('brush',a,.55);}
        else if(dist>1.8||close)this._rush(a,p,dt);
      }
      a.pos.set(a.x,a.y,a.z);
    }
    // Bodies that come for you together keep their own space: four guests never merge into one
    // silhouette. Each only takes a step that is clear (see _nudge).
    for(let i=0;i<POOL;i++){const a=this.actors[i];if(!a.active||!a.alive)continue;
      for(let j=i+1;j<POOL;j++){const b=this.actors[j];if(!b.active||!b.alive)continue;
        const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),min=RESIDENT_DEF.radius*(a.scale+b.scale)*1.15;
        if(d>=min||d<1e-4)continue;
        const push=(min-d)*.5,ux=dx/d,uz=dz/d;this._nudge(a,-ux*push,-uz*push);this._nudge(b,ux*push,uz*push);
      }
    }
    if(!this.actors.some(a=>a.active&&a.alive)){e.stage='remains';e.t=0;}
  }

  // A short step, taken only if it is clear at the shin, the knee and the shoulder.
  _nudge(a,mx,mz){
    const col=this._sys('collision'),r=Math.hypot(mx,mz),k=r>1e-6?(r+RESIDENT_DEF.radius*a.scale)/r:0,ex=mx*k,ez=mz*k;
    for(const h of NUDGE_H)if(!col.segmentClear(a.x,a.floor+h*(h>1?a.scale:1),a.z,a.x+ex,a.floor+h*(h>1?a.scale:1),a.z+ez))return false;
    a.x+=mx;a.z+=mz;a.pos.set(a.x,a.y,a.z);return true;
  }

  _returning() { return !!(this.ctx.shared.lateBellFinal || this.ctx.shared.morningReturned); }

  _homecoming(dt) {
    const pr=this._sys('progress');
    // A returned resident is a resolved encounter, not a kill: no XP, cash, corpse
    // search, kill event or fabricated mask. This also covers rooms visited after dawn.
    for(const row of this.events) if(!pr.flag('interior-returned:'+row.def.id)) {
      pr.flag('interior-returned:'+row.def.id,true);row.spent=true;
    }
    this.ctx.shared.interiorHorror=false;
    const e=this.active;if(!e)return;
    if(e.stage!=='returning'){
      e.stage='returning';e.t=0;
      for(const a of this.actors)if(a.active&&a.alive){a.homeFold=a.fold;a.homeYaw=a.baseYaw;a.attackT=-1;a.rope.visible=false;}
    }
    e.t+=dt;
    for(const a of this.actors)if(a.active&&a.alive){
      a.px=a.x;a.py=a.y;a.pz=a.z;a.prevFold=a.fold;a.prevFace=a.face;
      let turn=Math.PI/2-a.homeYaw;while(turn>Math.PI)turn-=Math.PI*2;while(turn<-Math.PI)turn+=Math.PI*2;
      const rise=clamp01(e.t/2);a.baseYaw=a.homeYaw+turn*rise;a.face=0;a.fold=a.homeFold*(1-rise);a.y=a.floor;
      if(e.band)this._stoop(e,a,dt,a.x+1,a.z,true);
      // A few quiet eastward steps use the existing shoulder/knee collision probes.
      if(e.t>2&&e.t<6)this._rush(a,{x:a.x+15,z:a.z},dt*.25);
      a.homeSink=Math.max(0,(e.t-6)/3);a.pos.set(a.x,a.y-a.homeSink*3.2,a.z);
    }
    if(e.t>=9)this._finish(true);
  }

  step(dt) {
    if (!(dt > 0) || !this.ctx.playing || this.ctx.paused) return;
    this.clock += dt; this.cooldown = Math.max(0, this.cooldown - dt);
    const player = this._sys('player'), p = player.pos;
    if (this._returning()) { this._homecoming(dt); return; }
    if (!this.enabled || player.dead || this.ctx.shared.inCar || this._protected(p)) {
      if (this.active) { this.stats.protected++; this._finish(this.active.stage !== 'waiting'); }
      return;
    }
    for (const e of this.events) {
      const distance = Math.hypot(p.x - e.site.def.x, p.z - e.site.def.z);
      e.away = distance > 80 ? e.away + dt : 0;
      if (e.dropped && distance > FAR_RESET) e.far = true;
      if (e.spent && e.away > 30 && this.clock - e.last > REARM) e.spent = false;
    }
    let e = this.active;
    if (!e) {
      if (this.cooldown > 0) return;
      let best = null, score = Infinity;
      for (const candidate of this.events) {
        const s = this._score(candidate, p);
        if (s < score) { best = candidate; score = s; }
      }
      // Arriving at a place stages at once. Back at a place you were just in, the next body
      // is put in its room only while you are not looking at that room.
      if (best && !(this._siteGate === best.def.site && this._seatsInView(best, p))) this._stage(best);
      return;
    }
    for (const a of this.actors) {
      a.px=a.x;a.py=a.y;a.pz=a.z;a.prevFace=a.face;a.prevFold=a.fold;
      if(a.active&&a.dead){
        a.deathT+=dt;a.fold=a.deathFold+(1.30-a.deathFold)*clamp01(a.deathT/.6);
        // Shot off its rope, it falls the rest of the way; it never snaps to the floor.
        a.fallV=(a.fallV||0)+DROP_G*dt;a.y=Math.max(a.floor,a.y-a.fallV*dt);a.pos.set(a.x,a.y,a.z);
      }
    }
    const inside = this._inside(e, p), a0 = this.actors[0];
    let watched = false;
    for (const a of this.actors) if (a.active && this._visible(a, p)) watched = true;
    e.notSeen = watched ? 0 : e.notSeen + dt;
    const distance = Math.hypot(p.x - a0.x, p.z - a0.z);
    if (distance > 60 || Math.abs(p.y - a0.floor) > 8) { this._finish(e.stage !== 'waiting'); return; }
    if (e.stage === 'waiting') {
      // The pool follows you to the room you are heading for, so the marked room is filled
      // before you reach it. Only ever out of sight: the body does not vanish from a room you
      // can see, and does not appear in one you are looking into.
      if (!inside && e.notSeen > RELOCATE_UNSEEN) {
        let other = null, best = this._score(e, p) - 8;
        for (const c of this.events) {
          if (c === e) continue;
          const s = this._score(c, p);
          if (s < best) { best = s; other = c; }
        }
        if (other && !this._seatsInView(other, p)) { this._finish(false); this._stage(other); return; }
      }
      e.dwell = inside && watched ? e.dwell + dt : Math.max(0, e.dwell - dt * 0.7);
      if (e.dwell > 0.75 && distance < 12
        && !this._busy(p) && this._sys('dread').permitOk()) this._begin(e);
      return;
    }
    e.t += dt;
    if(e.stage==='combat'){this._combat(dt,p,player);return;}
    if (e.stage === 'listening') {
      if (e.t > 0.72 && e.sounded === 0) { this._say('footfall', a0, 0.35); e.sounded = 1; }
      if (e.t > 1.45 && e.sounded === 1) { this._say('mimic', a0, 0.38); e.sounded = 2; }
      // Wait for the player to choose to look. The payoff never burns off behind their back.
      if (e.t > 2.1 && watched) this._payoff(e);
      else if (e.t > 16 || !inside && e.notSeen > 3) this._finish();
      return;
    }
    if (e.stage === 'turning' || e.stage === 'standing') {
      let i = 0;
      for (const a of this.actors) {
        if (!a.active || !a.alive) continue;
        const time = e.t - i * 0.085, k = clamp01(time / 0.34);
        const target = Math.atan2(p.x - a.x, p.z - a.z);
        let delta = target - a.baseYaw;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        a.face = delta * k;
        a.fold = (1 - clamp01((time - 0.20) / 0.74)) * restFold(e.def);
        if (a.y <= a.floor + 0.01) this._stoop(e, a, dt, p.x, p.z, e.t > 1.4);
        if (e.def.rise) {
          // A guest pushes back from the table as it rises, so its hands come up clear of it.
          const step = e.def.rise * clamp01((time - 0.15) / 0.55) - a.back;
          if (step > 0.001 && this._nudge(a, -Math.sin(a.seatYaw) * step, -Math.cos(a.seatYaw) * step)) a.back += step;
        }
        if (a.hang > 0 && !a.landed) {
          // Let go, fall, land: the same pull as yours, and the thud when it arrives.
          const fall = time > 0 ? 0.5 * DROP_G * time * time : 0;
          a.y = Math.max(a.floor, a.floor + a.hang - fall);
          if (a.y <= a.floor) { a.landed = true; this._say('drop-impact', a, 0.8); }
        }
        i++;
      }
      if (e.t > 1.15 && e.stage === 'turning') { e.stage = 'standing'; }
      if (e.t > 1.45 && e.t < 1.94 && inside && e.def.kind !== 'congregation') {
        this._rush(a0, p, dt);
        if (!e.rushed) { e.rushed = true; this._say('brush', a0, 0.68); }
      }
      if (e.t > 1.95) { e.stage='combat';e.t=0; }
      return;
    }
    if (e.stage === 'collapsing') {
      for (const a of this.actors) if (a.active) { a.fold = clamp01(e.t / 0.52) * 1.30; a.y += (a.floor - a.y) * Math.min(1, dt * 9); }
      if (e.t > 0.72) { e.stage = 'remains'; e.t = 0; this.ctx.shared.interiorHorror = false; }
      return;
    }
    if (e.stage === 'remains' && e.t > 3.0 && (!watched && e.notSeen > 0.7 || distance > 25)) this._finish();
  }

  present(alpha = 1) {
    const e = this.active; if (!e) return;
    for (const a of this.actors) {
      if (!a.active) continue;
      const fold = a.prevFold + (a.fold - a.prevFold) * alpha;
      const turn = a.prevFace + (a.face - a.prevFace) * alpha;
      const t = this.clock + alpha / 60;
      a.root.position.set(a.px + (a.x - a.px) * alpha, a.py + (a.y - a.py) * alpha, a.pz + (a.z - a.pz) * alpha);
      if(e.stage==='returning')a.root.position.y-=(a.homeSink||0)*3.2;
      a.root.scale.setScalar(a.scale); a.root.rotation.set(0,a.baseYaw,0);
      // A dead body falls all the way onto its side. The old folded standing pose was
      // indistinguishable from the living ambush pose, even after damage was repaired.
      const fall=a.dead?clamp01(a.deathT/.65):0;
      a.root.rotation.z=fall*1.48;
      a.root.position.y+=fall*.27*a.scale;
      a.hips.scale.y = 1 - clamp01((fold - 0.7) / 0.6) * 0.42;
      a.torso.rotation.x = fold * 1.26;
      a.torso.rotation.z = a.dead?0:Math.sin(t * 1.7 + a.phase) * 0.013;
      a.head.rotation.set(-fold * 0.68 - 0.16, turn, a.dead ? .13 : Math.sin(t * 2.1 + a.phase) * 0.025 + 0.13);
      // The shoulders follow the face after it has turned too far. This keeps a face aimed
      // at the player while retaining the impossible first half-second of neck movement.
      a.torso.rotation.y = turn * clamp01(Math.abs(turn) / Math.PI) * 0.54;
      a.head.rotation.y = turn - a.torso.rotation.y;
      for (let i = 0; i < a.arms.length; i++) {
        const swing=a.attackT>=0?(a.attackT<.48 ? -1.65*a.attackT/.48 : -1.65+2.15*(a.attackT-.48)/.20):0;
        a.arms[i].rotation.x = -fold * 0.42 + (e.stage === 'standing' ? -0.34 : 0)+swing;
        a.arms[i].rotation.z = (i ? 1 : -1) * (a.dead?.18:0.09 + Math.sin(t * 2 + i) * 0.012);
      }
      if (a.rope.visible) {
        const attach = 2.65 - fold * 0.66;
        const length = Math.max(0.01, (a.ceiling - a.root.position.y) / a.scale - attach);
        a.rope.position.set(0, attach, -0.08); a.rope.scale.y = length;
        a.rope.visible = !a.dead && (e.stage === 'waiting' || e.stage === 'listening');
      }
    }
  }

  state() {
    return { active: this.active?.def.id || null, stage: this.active?.stage || 'dormant',
      time: this.active?.t || 0, cooldown: this.cooldown, ownsBeat: !!this.ctx.shared.interiorHorror,
      bodies: this.actors.filter(a => a.active).length, stats: { ...this.stats },
      dropped: !!this.active?.dropped,
      actors: this.actors.filter(a => a.active).map(a => ({ x: a.x, y: a.y, z: a.z, fold: a.fold, face: a.face,hp:a.hp,alive:a.alive,attackT:a.attackT,
        floor: a.floor, hang: a.hang || 0, rope: a.rope.visible ? a.ceiling : null })) };
  }

  // Exact world-space views for a human audit. This reports setup; it never teleports or
  // forces a scary beat. A test can arrive here and use the normal camera/input loop.
  encounters() {
    return this.events.map(e => {
      const at = this._world(e, e.def.x, e.def.y, e.def.z, { x: 0, y: 0, z: 0 });
      const v = e.def.look, view = this._world(e, v[0], v[2], v[1], { x: 0, y: 0, z: 0 });
      return { id: e.def.id, site: e.def.site, kind: e.def.kind, at, view,
        yaw: Math.atan2(-(at.x - view.x), -(at.z - view.z)), spent: e.spent };
    });
  }

  config(patch) { if (typeof patch?.enabled === 'boolean') { this.enabled = patch.enabled; if (!this.enabled) this._finish(false); } }
  reset() { this._finish(false); this.cooldown = 0; this._siteGate = null; for (const e of this.events) { e.spent = false; e.dwell = 0; e.last = -REARM; e.dropped = false; e.far = false; } }
  dispose() {
    this._offRespawn?.(); this._finish(false); this.root.removeFromParent();
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this.mat.dispose();
  }
}

export default InteriorHorror;
