// CURFEW — the set pieces. ROUND 22, lane H.
//
// Alex, 2026-09-10, "Things people did in the dark":
//
//   "The Waiting. A ridge with forty lawn chairs facing east, people in them. They don't
//    move. When your headlights sweep across, every head turns to follow. (Static meshes plus
//    a rotating neck bone. Cheap, and it'll be the screenshot.)"
//   "Bleachers hauled into a field, facing east. Coolers. A banner: SUNRISE WATCH."
//   "Sunflowers. They track light. A whole field slowly turns to face your headlights as you
//    drive past. Stop the car and they all settle on you."
//   "Eastbound lanes: a traffic jam frozen forever. Westbound: empty. The roads tell you
//    which way people went without a single word."
//   "A car pointed into the trees, engine off, high beams on, two columns of light into the
//    woods. The last thing they saw. Another one with the battery dying, headlights dimming
//    slowly while you watch."
//   "A watch tree. Hundreds of wristwatches hung on a single tree like ornaments, all still
//    ticking, all disagreeing."   "Tally marks on trees. Days since."
//   "Trail cams strapped to trees. They flash when you walk past (free jumpscare)."
//   "Wind turbines above the treeline, red lights blinking in unison across the whole
//    horizon, the way they actually do."
//   "Roadside memorial crosses, and someone has put headlamps on them. They're still on."
//   "School bus at a stop, doors open, hazards blinking. Backpacks in a row on the curb."
//   "A cul-de-sac where everyone hung every Christmas light they owned. A fake day, in the
//    wrong month, on a timer."
//   "A railroad crossing dinging and the gates dropping for no train."
//
// HOW IT IS BUILT, and why it costs nothing it does not have to.
//
//   - Every set piece is a MINOR SITE: a builder in the same shape as staged.js's, registered
//     into STAGED_BUILDERS at module load so places.js builds it, groups it, colliders it and
//     streams it out exactly like a campfire. Five are rationed rows (SETPIECE_KINDS, spliced
//     after 'gear'); seven are FIXED rows (placedata.FIXED_MINORS) with coordinates measured
//     against the real terrain and roads, because a jam has to be ON the road and a ridge has
//     to fall away east.
//   - The things that MOVE (the forty heads, six hundred sunflower heads) cannot be a minor's
//     merged mesh and cannot be an InstancedMesh either: an instanced draw on a places
//     material links a new shader program (USE_INSTANCING) and tests/lights.mjs forbids one.
//     So a TRACKER is one merged geometry on places.matBody whose vertex positions are
//     rewritten on the CPU, and only while something is actually turning: step() eases every
//     pivot's yaw toward the car's beam (prev/curr), present(alpha) rotates the template's
//     verts about each pivot into the live buffer. Idle, it uploads nothing.
//   - The things that BLINK (hazards, the crossing's pair, the cul-de-sac, a dying headlamp)
//     are opacity writes on the minor's own glow material, found through places.bodies after
//     the chunk builds; the crossing swaps two vertex ranges twice a second.
//   - The turbines stand 2 km out, past the 900 m far plane, so they are drawn the way places
//     draws a far landmark: one node at the farm's centroid through the PROXY transform
//     (places.js present), on a clone of matLand, with the nine lamps in ONE glow mesh whose
//     opacity is the blink — nine lamps, one write. The mesh is named so airlight's scan
//     leaves it alone (NOT_A_LAMP), or every lamp would hang a bonfire on the horizon.
//   - No light is ever created. The trail cam BORROWS a rover for 80 ms. Everything else is
//     the shared additive glow material at a rationed GLOW colour.
//   - This file must NOT import placedata.js (it imports SETPIECE_KINDS from here).

import * as THREE from 'three';
import { CFG } from '../config.js';
import { TAU, clamp, clamp01, lerp, noise1D, smoothstep } from '../engine/math.js';
import {
  C, Kit, kits, groundY, glowColumn, GLOW, PANE_LAMP, shell, gableFloor,
} from './sites.js';
import { STAGED_BUILDERS, shade, rod, seatedShoulders, carShell } from './staged.js';
import { projectPlaceSurfaceUVs } from './place-surfaces.js';

const SP = CFG.setpieces || {};
const TC = SP.trailcam || {};
const TC_REACH = TC.reachM ?? 5.5, TC_DOT = TC.faceDot ?? 0.30, TC_CD = TC.cd ?? 260, TC_TTL = TC.ttlS ?? 0.08, TC_COOL = TC.coolS ?? 25;
const HEADS_R = (SP.heads && SP.heads.trackR) ?? 120, HEADS_RATE = (SP.heads && SP.heads.turnRate) ?? 1.6;
const SUN_N = (SP.sunflowers && SP.sunflowers.n) ?? 600, SUN_R = (SP.sunflowers && SP.sunflowers.trackR) ?? 80, SUN_RATE = (SP.sunflowers && SP.sunflowers.turnRate) ?? 0.9;
const TB = SP.turbines || {};
const TB_N = TB.count ?? 9, TB_BLINK = TB.blinkS ?? 2.0, TB_DUTY = TB.duty ?? 0.25;
const HAZ_S = (SP.hazards && SP.hazards.periodS) ?? 1.2;
const XING_S = (SP.crossing && SP.crossing.periodS) ?? 1.0;
const XMAS_DAY = (SP.xmas && SP.xmas.dayS) ?? 120, XMAS_NIGHT = (SP.xmas && SP.xmas.nightS) ?? 20;
const DYING_S = (SP.dying && SP.dying.fadeS) ?? 90, DYING_FLOOR = (SP.dying && SP.dying.floor) ?? 0.15;

// The far-landmark proxy, copied from places.js (PROXY_R, HZ_GAIN_*, TINT_*) so the turbine
// farm sits on the same horizon as the county's towers. If places retunes these, retune here.
const PROXY_R = 460, HZ_GAIN_FROM = 560, HZ_GAIN_FULL = 1900, HZ_GAIN_MAX = 2.05;
const TINT_NEAR = 130, TINT_FAR = 880, TINT_FLOOR = 0.42, TINT_GLOW_FLOOR = 0.66;

/* ==========================================================================
   THE TABLE. Rationed rows, appended AFTER 'gear' in placedata.MINOR_KINDS so the campfire
   and the seven staged scenes keep their precedence in _chooseMinor's starvation order.
   Starve counts 18-34: a thing you come across, not the thing the road is made of. (They are
   spliced ahead of the campfire, not after 'gear': see the measurement in placedata.js.)
   ========================================================================== */
export const SETPIECE_KINDS = [
  // headlamps on the crosses, still on
  { id: 'crosses', weight: 2.4, minSince: 4, starve: 20, bulk: 1.6 },
  // it flashes when you walk past
  { id: 'trail-cam', weight: 2.6, minSince: 3, starve: 18, bulk: 1.2 },
  // days since, in gates of five, older and higher the deeper you are
  { id: 'tally-tree', weight: 2.2, minSince: 5, starve: 24, bulk: 1.4 },
  // doors open, hazards going, the backpacks in a row
  { id: 'school-bus', weight: 1.6, minSince: 8, starve: 34, bulk: 6.5 },
  // high beams into the trees; one in three is dying while you watch
  { id: 'car-into-trees', weight: 2.0, minSince: 6, starve: 28, bulk: 4.0 },
];

/* ==========================================================================
   The registry between a builder (which runs inside places._buildMinor with no handle on
   the scene) and the system (which owns the meshes that move). A builder pushes ONE record
   for its site; the system adopts it on the next chunk:built / init / step and drops it on
   chunk:disposed by the same chunk key places used. A builder run against a test stub
   (tests/staged.mjs: no site.x) registers nothing.
   ========================================================================== */
let LIVE = null;
const PENDING = [];

function register(api, rec) {
  if (!LIVE || !api.site || !Number.isFinite(api.site.x)) return null;
  const chunks = LIVE.ctx.systems.get('chunks');
  const CH = (CFG.world && CFG.world.CHUNK) || 64;
  rec.key = chunks && chunks.chunkIdAt
    ? String(chunks.chunkIdAt(api.site.x, api.site.z))
    : (Math.floor(api.site.x / CH) + '|' + Math.floor(api.site.z / CH));
  rec.x = api.site.x; rec.z = api.site.z; rec.y = api.padY;
  rec.kind = api.site.kind;
  PENDING.push(rec);
  return rec;
}

/* ==========================================================================
   THE TRACKER. One merged geometry; every pivot is a copy of one template (facing +Z,
   pivot at the origin) placed in WORLD metres and yawed by its own eased angle.
   ========================================================================== */
class Tracker {
  constructor(template, pivots, opts) {
    const tp = template.attributes.position, tn = template.attributes.normal;
    const tu = template.attributes.uv, tc = template.attributes.color;
    const V = tp.count, N = pivots.length;
    this.V = V; this.N = N;
    this.trackR = opts.trackR; this.turnRate = opts.turnRate;
    this.tpos = new Float32Array(tp.array);          // template verts, pivot-local
    this.tnrm = tn ? new Float32Array(tn.array) : null;
    this.piv = new Float32Array(N * 3);
    this.yaw0 = new Float32Array(N);
    this.prev = new Float32Array(N);
    this.curr = new Float32Array(N);
    let cx = 0, cz = 0;
    for (let p = 0; p < N; p++) {
      this.piv[p * 3] = pivots[p].x; this.piv[p * 3 + 1] = pivots[p].y; this.piv[p * 3 + 2] = pivots[p].z;
      this.yaw0[p] = pivots[p].yaw0; this.prev[p] = pivots[p].yaw0; this.curr[p] = pivots[p].yaw0;
      cx += pivots[p].x; cz += pivots[p].z;
    }
    this.cx = N ? cx / N : 0; this.cz = N ? cz / N : 0;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * V * 3);
    const nrm = new Float32Array(N * V * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    if (tu) {
      const uv = new Float32Array(N * V * 2);
      for (let p = 0; p < N; p++) uv.set(tu.array, p * V * 2);
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    if (tc) {
      const col = new Float32Array(N * V * 3);
      for (let p = 0; p < N; p++) col.set(tc.array, p * V * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    if (template.index) {
      const ti = template.index.array, I = ti.length;
      const idx = N * V > 65535 ? new Uint32Array(N * I) : new Uint16Array(N * I);
      for (let p = 0; p < N; p++) for (let i = 0; i < I; i++) idx[p * I + i] = ti[i] + p * V;
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    this.geo = geo;
    // a bounding sphere over every pivot plus the template's own reach, computed once: the
    // live positions only ever turn about their pivots, so it never has to move
    let tr = 0;
    for (let i = 0; i < V; i++) tr = Math.max(tr, Math.hypot(this.tpos[i * 3], this.tpos[i * 3 + 1], this.tpos[i * 3 + 2]));
    let rr = 0, cy = 0;
    for (let p = 0; p < N; p++) cy += this.piv[p * 3 + 1];
    cy = N ? cy / N : 0;
    for (let p = 0; p < N; p++) rr = Math.max(rr, Math.hypot(this.piv[p * 3] - this.cx, this.piv[p * 3 + 1] - cy, this.piv[p * 3 + 2] - this.cz));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(this.cx, cy, this.cz), rr + tr + 0.5);
    this.moving = false; this.dirty = 1; this.lit = false;
    this.mesh = null;
    this._writeAll(1);
    projectPlaceSurfaceUVs(geo, 3.2);
  }

  /** Ease every pivot toward the beam (or back to its rest yaw). Fixed step. */
  step(dt, beam) {
    let on = false, bx = 0, bz = 0;
    if (beam && beam.on > 0) {
      const dx = beam.x - this.cx, dz = beam.z - this.cz;
      if (dx * dx + dz * dz < this.trackR * this.trackR) { on = true; bx = beam.x; bz = beam.z; }
    }
    this.lit = on;
    const maxStep = this.turnRate * dt, ease = Math.min(1, 5 * dt);
    let moved = false;
    const piv = this.piv, curr = this.curr, prev = this.prev, yaw0 = this.yaw0;
    for (let p = 0; p < this.N; p++) {
      const target = on ? Math.atan2(bx - piv[p * 3], bz - piv[p * 3 + 2]) : yaw0[p];
      let d = target - curr[p];
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      let s = d * ease;
      if (s > maxStep) s = maxStep; else if (s < -maxStep) s = -maxStep;
      prev[p] = curr[p];
      if (s > 1e-5 || s < -1e-5) { curr[p] += s; moved = true; }
    }
    if (moved) this.dirty = 2;
    this.moving = moved;
  }

  /** Mean |yaw error| of every pivot against a point, radians. A measurement for the tool. */
  errorTo(bx, bz) {
    let sum = 0;
    for (let p = 0; p < this.N; p++) {
      let d = Math.atan2(bx - this.piv[p * 3], bz - this.piv[p * 3 + 2]) - this.curr[p];
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      sum += Math.abs(d);
    }
    return this.N ? sum / this.N : 0;
  }
  /** Mean |yaw - rest| — how far from east the heads are. */
  restError() {
    let sum = 0;
    for (let p = 0; p < this.N; p++) {
      let d = this.yaw0[p] - this.curr[p];
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      sum += Math.abs(d);
    }
    return this.N ? sum / this.N : 0;
  }

  present(alpha) {
    if (!this.moving && this.dirty <= 0) return;
    if (!this.moving) this.dirty--;
    this._writeAll(alpha);
  }

  _writeAll(alpha) {
    const a = (alpha === undefined || alpha === null) ? 1 : alpha;
    const pos = this.geo.attributes.position.array, nrm = this.geo.attributes.normal.array;
    const tp = this.tpos, tn = this.tnrm, V = this.V, piv = this.piv;
    for (let p = 0; p < this.N; p++) {
      const yaw = this.prev[p] + (this.curr[p] - this.prev[p]) * a;
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const px = piv[p * 3], py = piv[p * 3 + 1], pz = piv[p * 3 + 2];
      const o = p * V * 3;
      for (let i = 0; i < V; i++) {
        const j = i * 3;
        const x = tp[j], y = tp[j + 1], z = tp[j + 2];
        pos[o + j] = px + x * c + z * s;
        pos[o + j + 1] = py + y;
        pos[o + j + 2] = pz - x * s + z * c;
        if (tn) {
          const nx = tn[j], nz = tn[j + 2];
          nrm[o + j] = nx * c + nz * s; nrm[o + j + 1] = tn[j + 1]; nrm[o + j + 2] = -nx * s + nz * c;
        }
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.normal.needsUpdate = true;
  }

  dispose() { this.geo.dispose(); }
}

/** A template from kit primitives: facing +Z, pivot at the origin. */
function template(fn) {
  const k = new Kit();
  fn(k);
  return k.build();
}

/* ==========================================================================
   Shared props.
   ========================================================================== */

/** Old bus paint, desaturated the way staged.js's RUSTED is: a value, not a colour. */
const BUS_YELLOW = [0.132, 0.112, 0.070];
const RUST_DARK = [0.066, 0.052, 0.044];
const OLD_IRON = [0.058, 0.063, 0.069];

/** A short horizontal beam of glow lying along a heading: an open cone whose colour dies
 *  along its length. For the car in the trees, whose high beams are painted, not borrowed. */
function glowBeam(k, x, y, z, yaw, r0, r1, len, gain) {
  const g = new THREE.CylinderGeometry(r1, r0, len, 8, 1, true);
  g.rotateX(Math.PI * 0.5);          // +Y -> +Z: the cone lies along +Z, narrow end at the origin
  g.translate(0, 0, len * 0.5);
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  const pz = g.attributes.position.array;
  for (let i = 0; i < n; i++) {
    const t = clamp(1 - pz[i * 3 + 2] / len, 0, 1);
    const v = gain * t * t;
    c[i * 3] = v; c[i * 3 + 1] = v; c[i * 3 + 2] = v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.rotateY(yaw);
  g.translate(x, y, z);
  k.parts.push(g);
  return g;
}

/** A tyre track: a dark strip on the ground from (ax,az) to (bx,bz). */
function track(k, api, ax, az, bx, bz, w) {
  const L = Math.hypot(bx - ax, bz - az);
  if (!(L > 0.1)) return;
  const yaw = Math.atan2(bx - ax, bz - az);
  const mx = (ax + bx) * 0.5, mz = (az + bz) * 0.5;
  k.quad(w, L, mx, groundY(api, mx, mz) + 0.012, mz, shade(C.soil, 0.55), yaw, -Math.PI * 0.5);
}

/* ==========================================================================
   THE BUILDERS. Same frame as staged.js: local +Z faces the road for a rationed row; a
   fixed row's yaw is authored (see placedata.FIXED_MINORS for what each one means).
   ========================================================================== */

export const SETPIECE_BUILDERS = {

  /**
   * A CLEARING. Nothing is built; the row exists for its BULK. places keeps flora out of a
   * minor's bulk disc and nothing else, and The Waiting sits 45 m off the county loop on a
   * ridge that is all trunks: MEASURED from the road with the lamp on, forty chairs and not
   * one in the frame (tests/shots/round22-H-waiting.png, first pass). This row stands between
   * the road and the chairs so the corridor is open ground, and the beam reaches them.
   */
  clearing: (api) => kits(),

  /**
   * THE WAITING. Fixed row, yaw PI/2: local +Z IS world east. Four ranks of ten lawn chairs
   * facing +Z, thirty-eight of them with somebody in them, static, coats at the corpse value
   * (shade(C.dark, 0.55): NIGHT-VALUE LAW) and no faces. The HEADS are a tracker: they turn
   * to the car's beam within 120 m and ease back east when it goes. One chair in the back
   * rank is empty; the one behind it is the Standing Kind, and it only moves when you are
   * not looking at it.
   */
  'the-waiting': (api) => {
    const k = kits();
    const r = api.rng;
    const s = k.solid;
    // the coats at the corpse value (NIGHT-VALUE LAW); the chairs' webbing is what a lawn
    // chair is, pale plastic, at 0.195 — under the paper ceiling, and the pale edge round a
    // dark coat is how a seated figure reads from the road at 28 m
    const coat = shade(C.dark, 0.55), frame = shade(C.metal, 0.75), web = shade(C.cloth, 0.85);
    const pivots = [];
    const RANKS = 4, PER = 10, PITCH = 0.95, RANK = 1.4;
    const emptyRank = 0, emptyCol = 4;
    const tipped = { rank: 2, col: 8 };
    for (let rk = 0; rk < RANKS; rk++) {
      const lz = (rk - (RANKS - 1) * 0.5) * RANK;
      let gmin = Infinity, gmax = -Infinity;
      for (let cI = 0; cI < PER; cI++) {
        const lx = (cI - (PER - 1) * 0.5) * PITCH + r.range(-0.06, 0.06);
        const gy = groundY(api, lx, lz);
        gmin = Math.min(gmin, gy); gmax = Math.max(gmax, gy);
        const ry = r.range(-0.08, 0.08);
        if (rk === tipped.rank && cI === tipped.col) {
          // one on its side, the way a folding chair goes over
          s.box(0.50, 0.05, 0.50, lx, gy + 0.26, lz, web, ry, 0, Math.PI * 0.5);
          s.box(0.50, 0.55, 0.04, lx - 0.30, gy + 0.26, lz - 0.24, web, ry, 0, Math.PI * 0.5);
          continue;
        }
        // the chair: seat, back, four legs
        s.box(0.50, 0.05, 0.50, lx, gy + 0.42, lz, web, ry);
        s.box(0.50, 0.55, 0.04, lx, gy + 0.70, lz - 0.24, web, ry, -0.12);
        for (const sx of [-0.22, 0.22]) for (const sz of [-0.22, 0.22]) {
          s.cyl(0.014, 0.016, 0.42, 4, lx + sx, gy + 0.21, lz + sz, frame);
        }
        for (const sx of [-0.26, 0.26]) s.box(0.04, 0.03, 0.46, lx + sx, gy + 0.66, lz + 0.02, frame, ry);
        if (rk === emptyRank && cI === emptyCol) continue;
        // the one in it: thighs, shins, torso, arms on the rests; no head here — that is the
        // tracker's, on a pivot at the neck
        s.box(0.40, 0.14, 0.46, lx, gy + 0.52, lz + 0.06, coat, ry);
        for (const sx of [-0.12, 0.12]) s.box(0.12, 0.44, 0.12, lx + sx, gy + 0.22, lz + 0.36, shade(C.dark, 0.7), ry);
        s.box(0.44, 0.60, 0.24, lx, gy + 0.90, lz - 0.10, coat, ry, -0.10);
        for (const sx of [-0.27, 0.27]) s.box(0.10, 0.10, 0.40, lx + sx, gy + 0.74, lz + 0.02, coat, ry);
        pivots.push({ x: api.wx(lx, lz - 0.14), y: gy + 1.20, z: api.wz(lx, lz - 0.14), yaw0: Math.PI * 0.5 + r.range(-0.05, 0.05) });
      }
      api.emit({ kind: 'obb', x: 0, z: lz, halfX: PER * PITCH * 0.5, halfZ: 0.45, yaw: 0,
        y0: gmin - 0.3, y1: gmax + 1.0, tag: 'wood', climbable: false });
    }
    // THE ONE STANDING, behind the empty chair, facing east like the rest
    {
      const lx = (emptyCol - (PER - 1) * 0.5) * PITCH;
      const lz = (emptyRank - (RANKS - 1) * 0.5) * RANK - 1.35;
      api.cast([{ species: 'standing', lx, lz, yaw: 0, awake: false }]);
    }
    // the heads. A 7-sided head is a cylinder about its own axis and a turning cylinder is
    // invisible: the cap brim and the nose are what make the turn read from the road.
    const head = template((t) => {
      t.cyl(0.115, 0.125, 0.26, 7, 0, 0.13, 0, shade(C.dark, 1.15));
      t.box(0.24, 0.025, 0.15, 0, 0.245, 0.09, shade(C.dark, 0.9));
      t.cyl(0.12, 0.10, 0.07, 7, 0, 0.29, -0.01, shade(C.dark, 0.8));
      t.box(0.05, 0.05, 0.06, 0, 0.12, 0.13, shade(C.dark, 1.15));
    });
    const tracker = new Tracker(head, pivots, { trackR: HEADS_R, turnRate: HEADS_RATE });
    register(api, { tracker, label: 'heads' });
    return k;
  },

  /**
   * BLEACHERS. Fixed row, yaw toward the road (+Z). The tiers FACE WORLD EAST whatever the
   * road does: local east is (cos yaw, sin yaw). Five tiers of plank, each its own standable
   * step (0.42 m: under STEP_UP, so the controller walks up them), four coolers at the foot,
   * and two posts on the road side carrying the banner — lane D's signage paints SUNRISE
   * WATCH on it from Setpieces.init() (BANNER below is the shared spot).
   */
  bleachers: (api) => {
    const k = kits();
    const r = api.rng;
    const s = k.solid;
    const ex = Math.cos(api.yaw), ez = Math.sin(api.yaw);       // local east
    const rx = ez, rz = -ex;                                      // local "right" when facing east
    const ryE = Math.atan2(ex, ez);
    const put = (u, v) => ({ x: u * rx + v * ex, z: u * rz + v * ez });
    const plank = shade(C.plank, 0.62), steel = shade(C.metal, 0.7);
    const g0 = groundY(api, 0, 0);
    const TIERS = 5, W = 8.0;
    for (let t = 0; t < TIERS; t++) {
      const v = -0.75 * t, y = g0 + 0.42 + 0.42 * t;
      const p = put(0, v);
      s.box(W, 0.06, 0.70, p.x, y, p.z, plank, ryE);
      s.box(W, 0.36, 0.05, p.x, y - 0.21, p.z, shade(C.plank, 0.45), ryE);   // the riser
      for (const u of [-3.6, -1.2, 1.2, 3.6]) {
        const q = put(u, v);
        s.cyl(0.03, 0.03, y - g0, 4, q.x, g0 + (y - g0) * 0.5, q.z, steel);
      }
      api.emit({ kind: 'obb', x: p.x, z: p.z, halfX: W * 0.5, halfZ: 0.36, yaw: ryE,
        y0: g0 - 0.3, y1: y + 0.03, tag: 'wood', standable: true, climbable: false });
    }
    // the rail along the top and the two ends
    {
      const p = put(0, -0.75 * (TIERS - 1) - 0.4);
      s.box(W, 0.04, 0.04, p.x, g0 + 0.42 * TIERS + 0.9, p.z, steel, ryE);
      for (const u of [-W * 0.5, W * 0.5]) {
        const q = put(u, -0.75 * (TIERS - 1) - 0.4);
        s.cyl(0.02, 0.02, 0.95, 4, q.x, g0 + 0.42 * TIERS + 0.45, q.z, steel);
      }
    }
    // coolers, at the foot, lids up on two of them
    for (let i = 0; i < 4; i++) {
      const p = put(-2.6 + i * 1.7 + r.range(-0.3, 0.3), 1.1 + r.range(-0.3, 0.3));
      const gy = groundY(api, p.x, p.z);
      const ry = ryE + r.range(-0.5, 0.5);
      s.box(0.62, 0.42, 0.40, p.x, gy + 0.21, p.z, shade(C.cloth, 0.58), ry);
      if (i & 1) s.box(0.62, 0.04, 0.40, p.x, gy + 0.62, p.z + 0.18, shade(C.cloth, 0.50), ry, 1.2);
      api.emit({ kind: 'circle', x: p.x, z: p.z, r: 0.36, y0: gy - 0.2, y1: gy + 0.42, tag: 'box', standable: true });
    }
    // the banner's posts on the road side, and the cloth behind the painted face (the face
    // itself is the system's, painted with lane D's stencil: see _paintBanner and BANNER)
    {
      s.box(BANNER.w + 0.04, BANNER.h + 0.04, 0.03, 0, api.padY + BANNER.y, BANNER.lz - 0.02, shade(C.cloth, 0.55));
      const gL = groundY(api, -BANNER.w * 0.5 - 0.1, BANNER.lz), gR = groundY(api, BANNER.w * 0.5 + 0.1, BANNER.lz);
      s.cyl(0.06, 0.07, 3.3, 6, -BANNER.w * 0.5 - 0.1, gL + 1.65, BANNER.lz, C.wood);
      s.cyl(0.06, 0.07, 3.3, 6, BANNER.w * 0.5 + 0.1, gR + 1.65, BANNER.lz, C.wood);
      s.box(BANNER.w + 0.4, 0.05, 0.05, 0, api.padY + BANNER.y + BANNER.h * 0.5 + 0.06, BANNER.lz, C.wood);
      api.emit({ kind: 'circle', x: -BANNER.w * 0.5 - 0.1, z: BANNER.lz, r: 0.12, y0: gL - 0.3, y1: gL + 3.3, tag: 'wood' });
      api.emit({ kind: 'circle', x: BANNER.w * 0.5 + 0.1, z: BANNER.lz, r: 0.12, y0: gR - 0.3, y1: gR + 3.3, tag: 'wood' });
    }
    register(api, { label: 'bleachers' });
    return k;
  },

  /**
   * THE SUNFLOWER FIELD. Fixed row, yaw toward the road: the field's long side runs along
   * local X, parallel to the road, its near edge 20 m off the tarmac. Six hundred static
   * stalks; the HEADS are a tracker, drooped twenty degrees, resting east, turning to the
   * beam within 80 m at 0.9 rad/s — "Stop the car and they all settle on you" is what that
   * easing does when the target stops moving. No colliders: a field you can walk into.
   */
  'sunflower-field': (api) => {
    const k = kits();
    const r = api.rng;
    const s = k.solid;
    const stalk = shade(C.wood, 0.70), leaf = shade(C.wood, 0.55);
    const pivots = [];
    const W = 40, D = 26, PITCH = 1.3;
    const cols = Math.floor(W / PITCH), rows = Math.floor(D / PITCH);
    let n = 0;
    for (let iz = 0; iz < rows && n < SUN_N; iz++) {
      for (let ix = 0; ix < cols && n < SUN_N; ix++) {
        const lx = (ix - (cols - 1) * 0.5) * PITCH + r.range(-0.35, 0.35);
        const lz = (iz - (rows - 1) * 0.5) * PITCH + r.range(-0.35, 0.35);
        const gy = groundY(api, lx, lz);
        const h = r.range(1.6, 2.1);
        const lean = r.range(-0.06, 0.06);
        s.cyl(0.018, 0.024, h, 4, lx, gy + h * 0.5, lz, stalk, 0, lean, lean * 0.7);
        const ly = r.range(0.5, 0.9);
        s.quad(0.22, 0.12, lx + 0.12, gy + h * ly, lz, leaf, r.range(0, TAU), -0.6);
        s.quad(0.22, 0.12, lx - 0.12, gy + h * (ly + 0.18), lz, leaf, r.range(0, TAU), -0.6);
        pivots.push({ x: api.wx(lx, lz), y: gy + h, z: api.wz(lx, lz), yaw0: Math.PI * 0.5 + r.range(-0.12, 0.12) });
        n++;
      }
    }
    // the head: a disc of petals with a dark centre, drooped, facing +Z at rest
    const head = template((t) => {
      const petals = new THREE.CircleGeometry(0.16, 8);
      const core = new THREE.CircleGeometry(0.075, 8);
      core.translate(0, 0, 0.012);
      const droop = 0.35;
      // MEASURED: at shade(C.plank, 0.55) (0.10) the heads vanished under the lamp from the
      // road (round22-H-field.png, first pass). C.cloth x 0.8 is 0.18 linear, under the paper
      // ceiling every sign in the county sits at, and it is what a dry petal is worth.
      for (const [g, col] of [[petals, shade(C.cloth, 0.8)], [core, shade(C.dark, 0.9)]]) {
        g.rotateX(droop);
        g.translate(0, 0.05, 0.02);
        t.push(g, col);
      }
    });
    const tracker = new Tracker(head, pivots, { trackR: SUN_R, turnRate: SUN_RATE });
    register(api, { tracker, label: 'sunflowers' });
    return k;
  },

  /**
   * ONE SEGMENT OF THE JAM. Fixed rows, seven of them 55 m apart along the broken highway
   * with local +Z along the road TOWARD the Toll and the road to Morning: eight car shells
   * nose to tail in the lane on the driver's right (local -X: heading T, right = (-tz, tx),
   * and local +X in world is (tz, -tx)), the other lane empty. One car in three has someone
   * still in it; one boot per segment is open. Streams car by car because each 55 m is its
   * own minor.
   */
  'jam-segment': (api) => {
    const k = kits();
    const r = api.rng;
    const LANE = -2.2;                // m off the centreline, the right-hand lane of an 8.8 m road
    const N = 8, PITCH = 6.5;
    const bootCar = Math.floor(r.next() * N);
    for (let i = 0; i < N; i++) {
      const lz = (i - (N - 1) * 0.5) * PITCH + r.range(-0.25, 0.25);
      const lx = LANE + r.range(-0.22, 0.22);
      // car-local +X (the bonnet) maps to site (cos yaw, -sin yaw): -PI/2 sends it along +Z
      const yaw = -Math.PI * 0.5 + r.range(-0.05, 0.05);
      const rust = (i % 2) === 1;
      const open = (i % 4) === 2 ? r.range(0.7, 1.1) : 0;
      const car = carShell(k, api, lx, lz, yaw, { rust, open });
      if ((i % 3) === 1) {
        const p = car.put(-0.25, -0.35);
        seatedShoulders(k, p.x, car.gy + 0.92, p.z, yaw);
      }
      if (i === bootCar) {
        // the boot lid, up
        const p = car.put(-1.75, 0);
        k.solid.box(0.06, 1.0, 1.5, p.x, car.gy + 1.35, p.z, rust ? RUST_DARK : shade(C.metal, 0.85), yaw, 0, -0.55);
      }
    }
    register(api, { label: 'jam' });
    return k;
  },

  /**
   * THE CAR IN THE TREES. Rationed. It left the road and stopped nose-first into the pines,
   * pointing away from the road (-Z), both lamps still on: two painted cones of glow into
   * the trees and the tyre tracks back to the tarmac. One in three is 'dying': the glow
   * ramps to a floor over ninety seconds from the moment you first see it.
   */
  'car-into-trees': (api) => {
    const k = kits();
    const r = api.rng;
    const lx = r.range(-0.6, 0.6), lz = 1.2;
    const yaw = Math.PI * 0.5 + r.range(-0.18, 0.18);      // bonnet along -Z
    const car = carShell(k, api, lx, lz, yaw, { rust: r.next() < 0.5, open: r.next() < 0.5 ? r.range(0.6, 1.0) : 0 });
    const p = car.put(-0.25, -0.35);
    seatedShoulders(k, p.x, car.gy + 0.92, p.z, yaw);
    // the lamps, and the beams they throw
    const head = Math.PI + (yaw - Math.PI * 0.5);            // facing -Z, plus the car's own skew
    for (const side of [-0.62, 0.62]) {
      const q = car.put(2.16, side);
      k.glow.pane(0.28, 0.20, q.x, car.gy + 0.72, q.z, PANE_LAMP, head, 0, 5, 5);
      glowBeam(k.glow, q.x, car.gy + 0.72, q.z, head, 0.16, 1.1, 8.0, 0.22);
    }
    k.glowColour = GLOW.lamp;
    // the tracks it left: from the road edge to its rear wheels
    for (const side of [-0.85, 0.85]) {
      const a = car.put(-1.5, side), b = car.put(-1.5 - 7.5, side + r.range(-0.4, 0.4));
      track(k.solid, api, a.x, a.z, b.x, b.z, 0.32);
    }
    const rec = { label: 'car-into-trees' };
    if (r.next() < 0.34) rec.blinker = { kind: 'dying' };
    register(api, rec);
    return k;
  },

  /**
   * MEMORIAL CROSSES. Rationed. Two to four on the verge, spaced so airlight gives each its
   * own bead and pool (>= 1.8 m: CLUSTER_JOIN is 1.4), a headlamp strapped to every arm and
   * still on: GLOW.white, a small vertical pane, a plastic flower cone and a photograph.
   */
  crosses: (api) => {
    const k = kits();
    const r = api.rng;
    const s = k.solid;
    const n = 2 + Math.floor(r.next() * 3);
    const wood = shade(C.plank, 0.8);
    for (let i = 0; i < n; i++) {
      const lx = (i - (n - 1) * 0.5) * r.range(1.9, 2.6) + r.range(-0.15, 0.15);
      const lz = r.range(2.6, 4.2);
      const gy = groundY(api, lx, lz);
      const ry = r.range(-0.25, 0.25), lean = r.range(-0.08, 0.08);
      s.box(0.06, 1.10, 0.06, lx, gy + 0.55, lz, wood, ry, 0, lean);
      s.box(0.50, 0.06, 0.06, lx, gy + 0.86, lz, wood, ry, 0, lean);
      s.cone(0.12, 0.22, 6, lx + 0.14, gy + 0.11, lz + 0.08, shade(C.cloth, 0.62), r.range(0, TAU));
      s.quad(0.12, 0.16, lx, gy + 0.66, lz + 0.04, shade(C.paper, 0.6), ry);
      // the headlamp: a strap round the arm, the lamp on the front of it
      s.box(0.07, 0.04, 0.10, lx, gy + 0.92, lz, shade(C.dark, 0.9), ry);
      k.glow.pane(0.10, 0.08, lx, gy + 0.92, lz + 0.06, PANE_LAMP, ry, 0, 4, 4);
      api.emit({ kind: 'circle', x: lx, z: lz, r: 0.18, y0: gy - 0.3, y1: gy + 1.12, tag: 'wood' });
    }
    k.glowColour = GLOW.white;
    register(api, { label: 'crosses' });
    return k;
  },

  /**
   * THE TRAIL CAM. Rationed. A built trunk with a camera strapped to it at chest height
   * looking at the road. Its IR array is a vertex value of 0.10 — visible dim red up close,
   * under airlight's 0.14 floor so it throws no halo — and the FLASH is the system's: a
   * borrowed rover, 260 cd for 80 ms, in front of the lens only, once per 25 s.
   */
  'trail-cam': (api) => {
    const k = kits();
    const r = api.rng;
    const s = k.solid;
    const gy = groundY(api, 0, 0);
    s.cyl(0.30, 0.36, 6.0, 8, 0, gy + 2.8, 0, shade(C.wood, 0.85), 0, 0, r.range(-0.03, 0.03));
    api.emit({ kind: 'circle', x: 0, z: 0, r: 0.36, y0: gy - 0.3, y1: gy + 6.0, tag: 'tree' });
    const cy = gy + 1.55;
    s.tube(0.34, 0.34, 0.04, 10, 0, cy, 0, shade(C.dark, 0.8));                    // the strap
    s.box(0.12, 0.18, 0.10, 0, cy, 0.36, shade(C.dark, 0.7));                     // the housing
    s.quad(0.035, 0.035, 0, cy + 0.04, 0.412, C.glass, 0);                        // the lens
    k.glow.quad(0.07, 0.025, 0, cy - 0.04, 0.412, [0.10, 0.10, 0.10], 0);          // the IR array
    k.glowColour = GLOW.red;
    register(api, { label: 'trail-cam', trigger: {
      x: api.wx(0, 0.36), y: cy, z: api.wz(0, 0.36),
      fx: Math.sin(api.yaw), fz: Math.cos(api.yaw), cool: 0, fired: 0,
    } });
    return k;
  },

  /**
   * THE TALLY TREE. Rationed. Days since, cut in gates of five on the road side of one big
   * trunk and two lesser ones. Deeper in there are more of them, and the old ones sit
   * higher and darker than the fresh ones near the ground: count = 40 + 160 * age.
   */
  'tally-tree': (api) => {
    const k = kits();
    const r = api.rng;
    const s = k.solid;
    const trunks = [[0, 0, 0.45, 7.5], [-2.3, -1.4, 0.28, 6.0], [2.5, -0.9, 0.30, 6.2]];
    const count = Math.round(40 + 160 * clamp01(api.age));
    const gates = Math.ceil(count / 5);
    let placed = 0;
    for (let ti = 0; ti < trunks.length; ti++) {
      const [tx, tz, tr, th] = trunks[ti];
      const gy = groundY(api, tx, tz);
      s.cyl(tr * 0.8, tr, th, 8, tx, gy + th * 0.5, tz, shade(C.wood, 0.85), 0, 0, r.range(-0.04, 0.04));
      api.emit({ kind: 'circle', x: tx, z: tz, r: tr + 0.05, y0: gy - 0.3, y1: gy + th, tag: 'tree' });
      const share = ti === 0 ? Math.ceil(gates * 0.6) : Math.ceil(gates * 0.2);
      for (let g = 0; g < share && placed < gates; g++, placed++) {
        // the fresh ones low and pale; the old ones high and dark. Wrapped round the road
        // side of the trunk, each gate at its own bearing.
        const old = placed > gates * 0.45;
        const y = gy + (old ? r.range(2.4, 4.0) : r.range(0.5, 1.7));
        const a = r.range(-0.8, 0.8);
        const col = old ? shade(C.wood, 0.35) : C.plank;
        const bx = tx + Math.sin(a) * (tr + 0.012), bz = tz + Math.cos(a) * (tr + 0.012);
        const ux = Math.cos(a), uz = -Math.sin(a);     // along the bark, across the gate
        for (let m = 0; m < 4; m++) {
          const o = (m - 1.5) * 0.055;
          s.quad(0.022, 0.16, bx + ux * o, y, bz + uz * o, col, a);
        }
        const dg = new THREE.PlaneGeometry(0.022, 0.24);
        dg.rotateZ(0.65);
        dg.rotateY(a);
        dg.translate(bx, y, bz);
        s.push(dg, col);
      }
    }
    register(api, { label: 'tally-tree' });
    return k;
  },

  /**
   * THE WATCH TREE. Fixed row, deep on radial-south. A built trunk with seven branches and
   * three hundred wristwatches hung from them on their straps, every face a little brighter
   * than the bark. Registered for lane G (setpiece:built/gone) so the ticking has a place.
   */
  'watch-tree': (api) => {
    const k = kits();
    const r = api.rng;
    const s = k.solid;
    const gy = groundY(api, 0, 0);
    s.cyl(0.36, 0.52, 8.0, 8, 0, gy + 3.7, 0, shade(C.wood, 0.9));
    api.emit({ kind: 'circle', x: 0, z: 0, r: 0.52, y0: gy - 0.3, y1: gy + 8.0, tag: 'tree' });
    const face = shade(C.metal, 1.3), strap = shade(C.dark, 0.8);
    let hung = 0;
    for (let b = 0; b < 7; b++) {
      const a = (b / 7) * TAU + r.range(-0.3, 0.3);
      const y0 = gy + 2.0 + b * 0.5 + r.range(-0.2, 0.2);
      const len = r.range(2.6, 3.8);
      const rise = r.range(0.6, 1.4);
      const ex = Math.sin(a) * len, ez = Math.cos(a) * len;
      rod(s, Math.sin(a) * 0.3, y0, Math.cos(a) * 0.3, ex, y0 + rise, ez, 0.06, 5, shade(C.wood, 0.8));
      // the watches, along the branch, hanging under it
      for (let t = 0.18; t < 0.98 && hung < 300; t += r.range(0.045, 0.11)) {
        const x = ex * t + r.range(-0.05, 0.05), z = ez * t + r.range(-0.05, 0.05);
        const y = y0 + rise * t - r.range(0.10, 0.32);
        const ry = r.range(0, TAU);
        s.quad(0.012, 0.16, x, y + 0.09, z, strap, ry);
        s.box(0.036, 0.008, 0.036, x, y, z, face, ry, r.range(-0.4, 0.4), r.range(-0.3, 0.3));
        hung++;
      }
    }
    register(api, { label: 'watch-tree' });
    return k;
  },

  /**
   * THE SCHOOL BUS. Rationed. Pulled onto the verge parallel to the road (along local X at
   * lz 3.0), the door open, the four hazards going at 1.2 s, and the backpacks in a row on
   * the curb side where you have to walk round to see them.
   */
  'school-bus': (api) => {
    const k = kits();
    const r = api.rng;
    const s = k.solid;
    const bz = 3.0, ry = r.range(-0.06, 0.06);
    const gy = groundY(api, 0, bz);
    // the bus's own frame: centred on (0, bz), headed ry, +X along its length
    const put = (px, pz) => ({ x: px * Math.cos(ry) + pz * Math.sin(ry), z: bz - px * Math.sin(ry) + pz * Math.cos(ry) });
    s.box(10.4, 0.36, 2.2, 0, gy + 0.62, bz, RUST_DARK, ry);                   // the chassis skirt
    s.box(10.4, 1.30, 2.2, 0, gy + 1.45, bz, BUS_YELLOW, ry);                  // the body to the belt line
    s.box(10.4, 0.90, 2.1, 0, gy + 2.55, bz, BUS_YELLOW, ry);                  // above the glass
    s.box(10.6, 0.10, 2.3, 0, gy + 3.02, bz, shade(BUS_YELLOW, 0.8), ry);     // the roof
    for (const side of [-1, 1]) {
      s.box(9.2, 0.70, 0.05, 0, gy + 2.15, bz + side * 1.09, C.glass, ry);     // the window strip
      for (let i = 0; i < 8; i++) s.box(0.06, 0.70, 0.07, -4.2 + i * 1.15, gy + 2.15, bz + side * 1.10, RUST_DARK, ry);
    }
    s.box(0.08, 0.66, 1.9, 5.16, gy + 2.13, bz, C.glass, ry);                  // the windscreen
    s.box(0.40, 0.30, 1.6, 5.28, gy + 0.98, bz, RUST_DARK, ry);                // the bumper
    for (let i = 0; i < 6; i++) {
      const p = put((i % 3 === 0 ? -3.4 : i % 3 === 1 ? -2.5 : 3.6), (i < 3 ? -1.05 : 1.05));
      s.tube(0.48, 0.48, 0.30, 10, p.x, gy + 0.48, p.z, shade(C.dark, 0.75), ry, Math.PI * 0.5, 0);
      s.cyl(0.18, 0.18, 0.31, 8, p.x, gy + 0.48, p.z, OLD_IRON, ry, Math.PI * 0.5, 0);
    }
    // the door, folded open on the curb side (-Z), and the stop arm out on the road side
    {
      const p = put(4.6, -1.1);
      s.box(0.55, 2.0, 0.06, p.x - 0.35, gy + 1.85, p.z - 0.2, BUS_YELLOW, ry + 1.2);
      s.box(0.55, 2.0, 0.06, p.x + 0.25, gy + 1.85, p.z - 0.2, BUS_YELLOW, ry - 1.2);
      const q = put(4.4, 1.15);
      s.box(0.05, 0.05, 0.55, q.x, gy + 2.0, q.z + 0.2, RUST_DARK, ry);
      s.cyl(0.22, 0.22, 0.02, 8, q.x, gy + 2.0, q.z + 0.5, shade(C.dark, 1.0), ry, Math.PI * 0.5, 0);
    }
    // the hazards: four amber panes at the corners, one glow mesh, one opacity write
    for (const sx of [-5.15, 5.15]) for (const sz of [-0.85, 0.85]) {
      const p = put(sx, sz);
      k.glow.pane(0.16, 0.12, p.x + (sx > 0 ? 0.06 : -0.06), gy + 1.10, p.z, PANE_LAMP, ry + (sx > 0 ? Math.PI * 0.5 : -Math.PI * 0.5), 0, 4, 4);
    }
    k.glowColour = GLOW.lamp;
    api.emit({ kind: 'obb', x: 0, z: bz, halfX: 5.25, halfZ: 1.12, yaw: ry, y0: gy - 0.2, y1: gy + 3.05, tag: 'vehicle', standable: true, climbable: false });
    // the backpacks, in a row on the curb
    const nb = 6 + Math.floor(r.next() * 3);
    for (let i = 0; i < nb; i++) {
      const lx = -3.0 + i * 0.9 + r.range(-0.1, 0.1), lz = bz - 2.1 + r.range(-0.1, 0.1);
      const g = groundY(api, lx, lz);
      s.box(0.30, 0.40, 0.20, lx, g + 0.20, lz, shade(C.cloth, 0.30 + 0.06 * (i % 4)), r.range(-0.3, 0.3), r.range(-0.15, 0.05));
      api.emit({ kind: 'circle', x: lx, z: lz, r: 0.18, y0: g - 0.2, y1: g + 0.40, tag: 'box', standable: true });
    }
    register(api, { label: 'school-bus', blinker: { kind: 'hazard' } });
    return k;
  },

  /**
   * THE RAILROAD CROSSING. Fixed row ON a road point of the outer ring, local +Z along the
   * road toward Morning. Two rails flush on the tarmac that stop at the treeline — there is
   * no railway in the county this round, and nothing this file can do about that — a
   * crossbuck post on each verge with its lamp pair, the far post's arm DOWN across the
   * lane heading AWAY from Morning (local +X: that driver's right), the near post's arm
   * broken off on the verge. The lamps alternate every half second, and the bell is lane
   * G's (setpiece:crossing).
   */
  crossing: (api) => {
    const k = kits();
    const r = api.rng;
    const s = k.solid;
    const y = api.padY;
    const rail = shade(C.metal, 0.9);
    for (const rz of [-0.72, 0.72]) s.box(12, 0.05, 0.08, 0, y + 0.03, rz, rail);
    // sleepers only where the tarmac is not: past the road's own half width
    for (let x = -5.7; x <= 5.7; x += 0.62) {
      if (Math.abs(x) < 2.9) continue;
      s.box(0.22, 0.03, 2.2, x, groundY(api, x, 0) + 0.015, 0, shade(C.wood, 0.6));
    }
    const post = (px, pz, armDown, broken) => {
      const gy = groundY(api, px, pz);
      s.box(0.16, 3.4, 0.16, px, gy + 1.7, pz, shade(C.metal, 0.7));
      // the crossbuck: two boards in an X, facing along the road
      s.box(1.2, 0.14, 0.03, px, gy + 3.05, pz, shade(C.cloth, 0.55), Math.PI * 0.5, 0, Math.PI * 0.25);
      s.box(1.2, 0.14, 0.03, px, gy + 3.05, pz, shade(C.cloth, 0.55), Math.PI * 0.5, 0, -Math.PI * 0.25);
      s.box(0.9, 0.22, 0.10, px, gy + 2.35, pz, shade(C.dark, 0.9), Math.PI * 0.5);       // the lamp bar
      api.emit({ kind: 'circle', x: px, z: pz, r: 0.14, y0: gy - 0.3, y1: gy + 3.5, tag: 'metal' });
      const toward = px > 0 ? -1 : 1;    // the arm reaches toward the centreline
      if (armDown) {
        s.box(3.6, 0.10, 0.06, px + toward * 1.85, gy + 0.95, pz, shade(C.cloth, 0.6));
        for (let i = 0; i < 4; i++) s.box(0.30, 0.11, 0.07, px + toward * (0.5 + i * 0.9), gy + 0.95, pz, shade(C.dark, 0.6));
        s.box(0.30, 0.50, 0.30, px, gy + 0.95, pz, shade(C.metal, 0.6));
        api.emit({ kind: 'obb', x: px + toward * 1.85, z: pz, halfX: 1.8, halfZ: 0.08, yaw: 0, y0: gy + 0.4, y1: gy + 1.05, tag: 'fence' });
      } else if (broken) {
        s.box(0.30, 0.50, 0.30, px, gy + 0.95, pz, shade(C.metal, 0.6));
        const bx = px - toward * 0.9, bzz = pz - 1.6;
        s.box(3.2, 0.10, 0.06, bx, groundY(api, bx, bzz) + 0.06, bzz, shade(C.cloth, 0.6), 0.7, 0, 0.05);
      }
      return gy;
    };
    const gA = post(-4.0, -4.0, false, true);     // the near post: for traffic heading +Z; its arm is on the ground
    const gB = post(4.0, 4.0, true, false);       // the far post: for traffic heading -Z; its arm is down
    // the lamp pairs: the A panes first, then the B panes, so the blinker can swap the two
    // vertex ranges (mergeGeometries keeps part order)
    for (const [px, pz, gy] of [[-4.0, -4.0, gA], [4.0, 4.0, gB]]) {
      k.glow.pane(0.22, 0.22, px - 0.32, gy + 2.35, pz + 0.07, PANE_LAMP, Math.PI * 0.5, 0, 4, 4);
    }
    let splitV = 0;
    for (const g of k.glow.parts) splitV += g.attributes.position.count;
    for (const [px, pz, gy] of [[-4.0, -4.0, gA], [4.0, 4.0, gB]]) {
      k.glow.pane(0.22, 0.22, px + 0.32, gy + 2.35, pz + 0.07, PANE_LAMP, Math.PI * 0.5, 0, 4, 4);
    }
    k.glowColour = GLOW.red;
    register(api, { label: 'crossing', crossing: true, blinker: { kind: 'alternate', splitV } });
    return k;
  },

  /**
   * THE CHRISTMAS-LIGHT CUL-DE-SAC. Fixed row in a field beside holdfast-road. Three shells
   * round a 14 m turning circle, a dirt drive to the road, cords house to house, and a bulb
   * every 35 cm along every eave and ridge in four colours on one white glow material. It
   * twinkles, and it is on a timer: 120 s on, 20 s off, so the fake day has a night.
   */
  'xmas-culdesac': (api) => {
    const k = kits();
    const r = api.rng;
    const s = k.solid;
    const y = api.padY;
    // the circle and the drive
    const disc = new THREE.CircleGeometry(7.0, 18);
    disc.rotateX(-Math.PI * 0.5);
    s.at(disc, shade(C.soil, 0.78), 0, y + 0.02, 0);
    s.quad(4.2, 34, 0, y + 0.02, 24, shade(C.soil, 0.78), 0, -Math.PI * 0.5);
    const HOUSES = [[-11.5, -4.5], [0, -12.5], [11.5, -4.5]];
    const hcol = [shade(C.plaster, 0.72), shade(C.brick, 0.8), shade(C.plaster, 0.62)];
    const BULBS = [[0.90, 0.16, 0.10], [0.18, 0.80, 0.24], [0.95, 0.60, 0.14], [0.20, 0.36, 0.95]];
    let bi = 0;
    const bulb = (x, yy, z, ry) => { k.glow.quad(0.06, 0.06, x, yy, z, BULBS[(bi++) % 4], ry); };
    const W = 7.4, D = 6.4, H = 3.2, RISE = 1.6;
    for (let i = 0; i < HOUSES.length; i++) {
      const [ox, oz] = HOUSES[i];
      const yaw = Math.atan2(ox, oz) + r.range(-0.08, 0.08);     // the door faces the circle
      shell(s, api, ox, oz, W, D, H, yaw, hcol[i], 1.4);
      s.gable(W, D, y + H, RISE, ox, 0, oz, C.slate, yaw, { api, depth: D, col: hcol[i] });
      gableFloor(api, ox, oz, W, D, y + H, RISE, yaw);
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const put = (lx, lz) => ({ x: ox + lx * cy + lz * sy, z: oz - lx * sy + lz * cy });
      // the eaves (the long sides, x = +-W/2) and the ridge
      for (const sx of [-1, 1]) {
        for (let lz = -D * 0.5 - 0.2; lz <= D * 0.5 + 0.2; lz += 0.35) {
          const p = put(sx * (W * 0.5 + 0.55), lz);
          bulb(p.x, y + H - 0.02, p.z, yaw + sx * Math.PI * 0.5);
        }
      }
      for (let lz = -D * 0.5 - 0.3; lz <= D * 0.5 + 0.3; lz += 0.35) {
        const p = put(0, lz);
        bulb(p.x, y + H + RISE + 0.16, p.z, yaw + (r.next() < 0.5 ? 0 : Math.PI));
      }
      // the gable ends, both, up one slope and down the other
      for (const e of [-1, 1]) {
        for (let t = -1; t <= 1; t += 0.1) {
          const p = put(t * W * 0.5, e * (D * 0.5 + 0.25));
          bulb(p.x, y + H + RISE * (1 - Math.abs(t)) + 0.05, p.z, yaw + (e > 0 ? 0 : Math.PI));
        }
      }
    }
    // the cords, house to house, sagging
    for (let i = 0; i < HOUSES.length; i++) {
      const a = HOUSES[i], b = HOUSES[(i + 1) % HOUSES.length];
      const mx = (a[0] + b[0]) * 0.5, mz = (a[1] + b[1]) * 0.5;
      rod(s, a[0], y + H - 0.1, a[1], mx, y + H - 1.1, mz, 0.015, 3, shade(C.dark, 0.7));
      rod(s, mx, y + H - 1.1, mz, b[0], y + H - 0.1, b[1], 0.015, 3, shade(C.dark, 0.7));
    }
    // one string across the circle's mouth, on two posts, and a lit shrub in the middle
    {
      for (const px of [-7.6, 7.6]) {
        const gy = groundY(api, px, 7.0);
        s.cyl(0.05, 0.06, 3.0, 5, px, gy + 1.5, 7.0, C.wood);
        api.emit({ kind: 'circle', x: px, z: 7.0, r: 0.1, y0: gy - 0.3, y1: gy + 3.0, tag: 'wood' });
      }
      for (let t = -1; t <= 1; t += 0.05) {
        bulb(t * 7.6, y + 2.9 - 0.5 * (1 - t * t), 7.0, 0);
      }
      s.cone(0.9, 1.9, 7, 0, y + 0.95, 0, shade(C.wood, 0.5));
      for (let a = 0; a < TAU; a += 0.5) for (const hh of [0.5, 1.0, 1.4]) {
        const rr = 0.9 * (1 - hh / 1.9) + 0.06;
        bulb(Math.cos(a) * rr, y + hh, Math.sin(a) * rr, -a + Math.PI * 0.5);
      }
      api.emit({ kind: 'circle', x: 0, z: 0, r: 0.9, y0: y - 0.3, y1: y + 1.9, tag: 'sapling' });
    }
    k.glowColour = GLOW.white;
    register(api, { label: 'xmas', blinker: { kind: 'twinkle', seed: r.range(0, 100) } });
    return k;
  },
};

/** Where the SUNRISE WATCH banner hangs on the bleachers, in the bleachers' local frame. */
const BANNER = { lx: 0, lz: 7.4, y: 2.55, w: 6.0, h: 0.9 };

/**
 * THE TURBINES. Nine masts on the north-east ridge, MEASURED in the live game
 * (tools/round22/check-H.mjs and its pre-pass, 2026-09-10): every one on terrain.regionAt
 * 'ridge', ground 154-234 m against 98-130 m on the loop's east side, >= 340 m from any
 * road, >= 778 m from any major, >= 536 m from any wilds site. r 2080-2240 from the centre.
 */
const TURBINES = [
  [1167, -1818], [1303, -1822], [1210, -1692], [1343, -1692], [1478, -1683],
  [1373, -1563], [1505, -1549], [1639, -1527], [1652, -1392],
];

Object.assign(STAGED_BUILDERS, SETPIECE_BUILDERS);

/* ==========================================================================
   THE SYSTEM.
   ========================================================================== */
export class Setpieces {
  static id = 'setpieces';

  constructor(ctx) {
    this.ctx = ctx;
    LIVE = this;
    this.group = new THREE.Group();
    this.group.name = 'setpieces';
    this._byKey = new Map();      // chunk key -> [records]
    this._trackers = [];
    this._triggers = [];
    this._blinkers = [];
    this._records = [];
    this._t = 0;
    this._ready = false;
    this._notes = [];
    this.turbine = null;          // { node, solid, glow, padY, x, z, proxy }
    this.stats = { adopted: 0, dropped: 0, flashes: 0, crossings: 0 };
    this._player = null;
    this._ev = { x: 0, y: 0, z: 0, kind: '', on: false };
    if (ctx.bus) {
      ctx.bus.on('chunk:built', () => this._drain());
      ctx.bus.on('chunk:disposed', (p) => { if (p) this._drop(String(p.id)); });
    }
  }

  _sys(id) { return this.ctx.systems ? this.ctx.systems.get(id) : null; }
  _note(s) { if (this._notes.length < 20) this._notes.push(s); }

  async init() {
    const scene = this.ctx.scene;
    if (scene) scene.add(this.group);
    try { this._buildTurbines(); } catch (e) { this._note('turbines: ' + e.message); }
    try { await this._paintBanner(); } catch (e) { this._note('banner: ' + e.message); }
    this._drain();      // the boot ring was built inside places.init(), before this ran
    this._ready = true;
  }

  ready() { return this._ready; }

  /* ------------------------------------------------------------- adopt / drop -- */
  _drain() {
    if (!PENDING.length) return;
    const places = this._sys('places');
    for (let i = 0; i < PENDING.length; i++) this._adopt(PENDING[i], places);
    PENDING.length = 0;
  }

  _adopt(rec, places) {
    let list = this._byKey.get(rec.key);
    if (!list) { list = []; this._byKey.set(rec.key, list); }
    list.push(rec);
    this._records.push(rec);
    if (rec.tracker) {
      const t = rec.tracker;
      if (places && places.matBody && !t.mesh) {
        t.mesh = new THREE.Mesh(t.geo, places.matBody);
        t.mesh.name = 'setpiece-tracker-' + rec.kind;
        t.mesh.castShadow = true; t.mesh.receiveShadow = true;
        t.mesh.frustumCulled = true;
        this.group.add(t.mesh);
      }
      this._trackers.push(t);
    }
    if (rec.trigger) { rec.trigger.rec = rec; this._triggers.push(rec.trigger); }
    if (rec.blinker) {
      const b = rec.blinker;
      b.rec = rec; b.t0 = this._t; b.glow = null;
      // the minor's own glow mesh, through places.bodies under the same chunk key
      const find = (bodies) => {
        if (!bodies) return null;
        for (const body of bodies) {
          if (body.kind !== 'minor' || body.minorKind !== rec.kind || !body.glow) continue;
          if (Math.abs(body.group.position.x - rec.x) > 0.01 || Math.abs(body.group.position.z - rec.z) > 0.01) continue;
          return body.glow;
        }
        return null;
      };
      b.glow = places && places.bodies ? find(places.bodies.get(rec.key)) : null;
      // a body built by hand (a tool, tests/sites.mjs) is filed under its own key: look everywhere
      if (!b.glow && places && places.bodies) for (const list of places.bodies.values()) { b.glow = find(list); if (b.glow) break; }
      if (b.glow && b.kind === 'alternate') {
        const col = b.glow.geometry.attributes.color;
        b.base = new Float32Array(col.array);
        b.phase = -1;
      }
      if (!b.glow) this._note('blinker without a glow: ' + rec.kind + ' at ' + rec.key);
      this._blinkers.push(b);
    }
    if (rec.kind === 'bleachers' && this._bannerMesh) this._bannerMesh.visible = true;
    this.stats.adopted++;
    this._emit('setpiece:built', rec);
    if (rec.crossing) { this.stats.crossings++; this._emitCrossing(rec, true); }
  }

  _drop(key) {
    const list = this._byKey.get(key);
    if (!list) return;
    this._byKey.delete(key);
    for (const rec of list) {
      if (rec.tracker) {
        const t = rec.tracker;
        const i = this._trackers.indexOf(t);
        if (i >= 0) { this._trackers[i] = this._trackers[this._trackers.length - 1]; this._trackers.pop(); }
        if (t.mesh) { this.group.remove(t.mesh); t.mesh = null; }
        t.dispose();
      }
      if (rec.trigger) {
        const i = this._triggers.indexOf(rec.trigger);
        if (i >= 0) { this._triggers[i] = this._triggers[this._triggers.length - 1]; this._triggers.pop(); }
      }
      if (rec.blinker) {
        const i = this._blinkers.indexOf(rec.blinker);
        if (i >= 0) { this._blinkers[i] = this._blinkers[this._blinkers.length - 1]; this._blinkers.pop(); }
        rec.blinker.glow = null;
      }
      const ri = this._records.indexOf(rec);
      if (ri >= 0) { this._records[ri] = this._records[this._records.length - 1]; this._records.pop(); }
      if (rec.kind === 'bleachers' && this._bannerMesh) this._bannerMesh.visible = false;
      this.stats.dropped++;
      if (rec.crossing) { this.stats.crossings--; this._emitCrossing(rec, false); }
      this._emit('setpiece:gone', rec);
    }
  }

  /** Drop everything filed under a key, for a tool that built a site by hand. */
  dropKey(key) { this._drop(String(key)); }

  _emit(ev, rec) {
    if (!this.ctx.bus) return;
    const p = this._ev;
    p.kind = rec.kind; p.x = rec.x; p.y = rec.y; p.z = rec.z;
    this.ctx.bus.emit(ev, p);
  }
  _emitCrossing(rec, on) {
    if (!this.ctx.bus) return;
    const p = this._ev;
    p.kind = rec.kind; p.x = rec.x; p.y = rec.y; p.z = rec.z; p.on = on;
    this.ctx.bus.emit('setpiece:crossing', p);
  }

  /* ---------------------------------------------------------------- banner -- */
  /**
   * Alex, 2026-09-10: "A banner: SUNRISE WATCH." Verbatim, nothing added.
   *
   * MEASURED: asked of lane D's signage.request() as a 6 x 0.9 m banner, the face went into
   * D's 2048 x 1024 atlas at 79% and two of D's own promises fell out of it (JOY COMES IN
   * THE MORNING on the Garden of Rest, YOU SAID TOMORROW on the Black Rib: 'atlas full' in
   * signage.notes). So the banner is painted here on its own 900 x 135 canvas, with D's
   * exported painter (SIGN_STYLES.banner: the same cloth, the same stencil) on D's exact
   * material recipe (places.matBody.clone() with the map, bump off) — the paper program the
   * whole signage lane already rides, so it links nothing. Fetched lazily: a static import
   * of signage.js from here would close a cycle through placedata.js.
   */
  async _paintBanner() {
    const places = this._sys('places'), terrain = this._sys('terrain');
    if (!places || !places.minors || !places.matBody) return;
    const row = places.minors.find((m) => m.kind === 'bleachers' && m.fixed);
    if (!row) { this._note('no bleachers row for the banner'); return; }
    const { SIGN_STYLES } = await import('./signage.js');
    if (!SIGN_STYLES || typeof SIGN_STYLES.banner !== 'function') { this._note('signage has no banner painter'); return; }
    const PPM = 150;
    const w = Math.round(BANNER.w * PPM), h = Math.round(BANNER.h * PPM);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const c = canvas.getContext('2d');
    let seed = 0x51ce;
    const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    SIGN_STYLES.banner(c, w, h, { lines: ['SUNRISE WATCH'] }, rnd);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 4;
    const mat = places.matBody.clone(); mat.map = tex; mat.bumpScale = 0; mat.name = 'signage-paper';
    const cy = Math.cos(row.yaw), sy = Math.sin(row.yaw);
    const x = row.x + BANNER.lx * cy + BANNER.lz * sy;
    const z = row.z - BANNER.lx * sy + BANNER.lz * cy;
    const y = (terrain && terrain.heightAt ? terrain.heightAt(row.x, row.z) : 0) + BANNER.y;
    const g = new THREE.PlaneGeometry(BANNER.w, BANNER.h);
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count * 3).fill(1), 3));
    g.rotateY(row.yaw);
    g.translate(x, y, z);
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = 'setpiece-banner';
    mesh.castShadow = false; mesh.receiveShadow = true;
    mesh.visible = false;          // shown while the bleachers are streamed in (see _adopt / _drop)
    this.group.add(mesh);
    this._bannerMesh = mesh; this._bannerTex = tex; this._bannerMat = mat;
    this.banner = { x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), yaw: row.yaw, ok: true, px: [w, h] };
  }

  /* -------------------------------------------------------------- turbines -- */
  _buildTurbines() {
    const places = this._sys('places'), terrain = this._sys('terrain'), scene = this.ctx.scene;
    if (!places || !places.matLand || !places.matGlow || !terrain || !scene) { this._note('turbines: no places/terrain'); return; }
    const n = Math.min(TB_N, TURBINES.length);
    let cx = 0, cz = 0, py = 0;
    const lamps = [];
    for (let i = 0; i < n; i++) { cx += TURBINES[i][0]; cz += TURBINES[i][1]; }
    cx /= n; cz /= n;
    const k = kits();
    const mast = shade(C.plaster, 0.55), nac = shade(C.metal, 0.6), blade = shade(C.plaster, 0.62);
    // the rotors face the county: the direction from the farm back to the centre
    const face = Math.atan2(-cx, -cz);
    for (let i = 0; i < n; i++) {
      const [x, z] = TURBINES[i];
      const foot = terrain.heightAt(x, z);
      py += foot;
      const lx = x - cx, lz = z - cz;
      const H = 95;
      k.solid.cyl(1.6, 2.6, H, 6, lx, foot + H * 0.5, lz, mast);
      k.solid.box(6, 3, 3, lx, foot + H + 1.2, lz, nac, face);
      k.solid.cyl(1.2, 1.2, 1.6, 8, lx + Math.sin(face) * 3.2, foot + H + 1.2, lz + Math.cos(face) * 3.2, nac, face, Math.PI * 0.5);
      for (let b = 0; b < 3; b++) {
        const g = new THREE.BoxGeometry(1.2, 40, 0.25);
        g.translate(0, 20, 0);
        g.rotateZ((b / 3) * TAU + i * 0.7);
        g.rotateY(face);
        g.translate(lx + Math.sin(face) * 3.6, foot + H + 1.2, lz + Math.cos(face) * 3.6);
        k.solid.push(g, blade);
      }
      // the lamp: two crossed vertical panes on the nacelle. 6 m, because through the proxy a
      // pane at 1.3-2.2 km is drawn at 460 m scaled by 0.45-0.57: 3 m held two pixels at 720p
      // and read as nothing (round22-H-turbines.png, first pass); 6 m holds five.
      k.glow.pane(6.0, 6.0, lx, foot + H + 5.5, lz, PANE_LAMP, 0, 0, 4, 4);
      k.glow.pane(6.0, 6.0, lx, foot + H + 5.5, lz, PANE_LAMP, Math.PI * 0.5, 0, 4, 4);
      lamps.push({ x: lx, y: foot + H + 5.5, z: lz });
    }
    py /= n;
    const node = new THREE.Group();
    node.name = 'setpiece-turbines';
    const solidGeo = k.solid.build();
    projectPlaceSurfaceUVs(solidGeo, 3.2);
    const solid = new THREE.Mesh(solidGeo, places.matLand.clone());
    solid.name = 'setpiece-turbine-masts';
    solid.frustumCulled = false;
    node.add(solid);
    const glow = new THREE.Mesh(k.glow.build(), places.matGlow.clone());
    glow.material.color.set(GLOW.red);
    glow.name = 'setpiece-horizon-lamps';      // NOT_A_LAMP: airlight leaves it alone
    glow.renderOrder = 4;
    glow.frustumCulled = false;
    node.add(glow);
    this.group.add(node);
    this.turbine = { node, solid, glow, padY: py, x: cx, z: cz, proxy: null, n, lamps };
  }

  /* ------------------------------------------------------------------ step -- */
  step(dt) {
    this._t += dt;
    if (PENDING.length) this._drain();
    const car = this._sys('car');
    const beam = car && typeof car.beamPose === 'function' ? car.beamPose() : null;
    for (let i = 0; i < this._trackers.length; i++) this._trackers[i].step(dt, beam);

    // the trail cams
    if (this._triggers.length) {
      const player = this._player || (this._player = this._sys('player'));
      const pos = player && player.pos;
      const lights = this._sys('lights');
      for (let i = 0; i < this._triggers.length; i++) {
        const tg = this._triggers[i];
        if (tg.cool > 0) { tg.cool -= dt; continue; }
        if (!pos) continue;
        const dx = pos.x - tg.x, dz = pos.z - tg.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > TC_REACH * TC_REACH || d2 < 1e-4) continue;
        const d = Math.sqrt(d2);
        if ((dx * tg.fx + dz * tg.fz) / d < TC_DOT) continue;
        tg.cool = TC_COOL;
        tg.fired++;
        this.stats.flashes++;
        if (lights && typeof lights.borrow === 'function') lights.borrow('trailcam', tg.x, tg.y, tg.z, 0xffffff, TC_CD, TC_TTL);
        this._emit('setpiece:trailcam', tg.rec);
      }
    }
  }

  /* --------------------------------------------------------------- present -- */
  present(alpha) {
    for (let i = 0; i < this._trackers.length; i++) this._trackers[i].present(alpha);

    const t = this._t;
    for (let i = 0; i < this._blinkers.length; i++) {
      const b = this._blinkers[i];
      if (!b.glow) continue;
      const m = b.glow.material;
      if (b.kind === 'hazard') {
        m.opacity = (t % HAZ_S) < HAZ_S * 0.5 ? 1 : 0.08;
      } else if (b.kind === 'alternate') {
        const ph = (t % XING_S) < XING_S * 0.5 ? 0 : 1;
        if (ph !== b.phase) {
          b.phase = ph;
          const col = b.glow.geometry.attributes.color, arr = col.array, base = b.base;
          const split = b.splitV * 3;
          for (let v = 0; v < arr.length; v++) {
            const a = v < split;
            arr[v] = base[v] * ((a === (ph === 0)) ? 1 : 0.08);
          }
          col.needsUpdate = true;
        }
      } else if (b.kind === 'twinkle') {
        const cyc = (t + b.seed) % (XMAS_DAY + XMAS_NIGHT);
        if (cyc > XMAS_DAY) { m.opacity = 0.0; b.glow.visible = false; }
        else {
          b.glow.visible = true;
          m.opacity = 0.55 + 0.45 * (0.5 + 0.5 * noise1D(t * 2.2, 1, 3 + (b.seed | 0)));
        }
      } else if (b.kind === 'dying') {
        m.opacity = lerp(1, DYING_FLOOR, clamp01((t - b.t0) / DYING_S));
      }
    }

    const tb = this.turbine, cam = this.ctx.camera;
    if (tb && cam) {
      const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
      const dx = tb.x - cx, dz = tb.z - cz;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1e-3;
      const s = dist > PROXY_R ? PROXY_R / dist : 1;
      const g = dist <= HZ_GAIN_FROM ? 1 : 1 + (HZ_GAIN_MAX - 1) * smoothstep(HZ_GAIN_FROM, HZ_GAIN_FULL, dist);
      tb.node.position.set(cx + dx * s, cy * (1 - s) + s * tb.padY * (1 - g), cz + dz * s);
      tb.node.scale.setScalar(s * g);
      const proxy = s < 1;
      if (proxy !== tb.proxy) {
        tb.proxy = proxy;
        tb.solid.material.depthTest = !proxy;
        tb.solid.renderOrder = proxy ? -960 : 0;
        tb.glow.material.depthTest = true;
      }
      const tt = clamp01((dist - TINT_NEAR) / (TINT_FAR - TINT_NEAR));
      tb.solid.material.color.setScalar(lerp(1, TINT_FLOOR, tt));
      // in unison: one opacity, nine lamps
      const lit = (t % TB_BLINK) < TB_BLINK * TB_DUTY;
      tb.glow.material.opacity = lerp(1, TINT_GLOW_FLOOR, tt) * (lit ? 1 : 0.06);
      tb.lit = lit;
    }
  }

  /* ----------------------------------------------------------------- state -- */
  state() {
    const car = this._sys('car');
    const beam = car && typeof car.beamPose === 'function' ? car.beamPose() : null;
    return {
      ready: this._ready,
      records: this._records.map((r) => ({ kind: r.kind, key: r.key, x: +r.x.toFixed(1), z: +r.z.toFixed(1), label: r.label })),
      trackers: this._trackers.map((tr) => ({
        n: tr.N, verts: tr.N * tr.V, lit: tr.lit, moving: tr.moving,
        cx: +tr.cx.toFixed(1), cz: +tr.cz.toFixed(1),
        errBeam: beam ? +tr.errorTo(beam.x, beam.z).toFixed(3) : null,
        errRest: +tr.restError().toFixed(3),
      })),
      triggers: this._triggers.map((tg) => ({ x: +tg.x.toFixed(1), y: +tg.y.toFixed(2), z: +tg.z.toFixed(1), fx: +tg.fx.toFixed(3), fz: +tg.fz.toFixed(3), cool: +tg.cool.toFixed(2), fired: tg.fired })),
      blinkers: this._blinkers.map((b) => ({ kind: b.kind, key: b.rec.key, x: +b.rec.x.toFixed(1), z: +b.rec.z.toFixed(1), hasGlow: !!b.glow, opacity: b.glow ? +b.glow.material.opacity.toFixed(3) : null })),
      turbines: this.turbine ? { n: this.turbine.n, x: +this.turbine.x.toFixed(0), z: +this.turbine.z.toFixed(0), padY: +this.turbine.padY.toFixed(1),
        proxy: this.turbine.proxy, lit: !!this.turbine.lit, opacity: +this.turbine.glow.material.opacity.toFixed(3),
        lamps: TURBINES.slice(0, this.turbine.n) } : null,
      banner: this.banner || null,
      stats: { ...this.stats },
      pending: PENDING.length,
      notes: this._notes.slice(),
    };
  }

  dispose() {
    for (const key of Array.from(this._byKey.keys())) this._drop(key);
    if (this._bannerMesh) {
      this.group.remove(this._bannerMesh);
      this._bannerMesh.geometry.dispose(); this._bannerMat.dispose(); this._bannerTex.dispose();
      this._bannerMesh = null;
    }
    if (this.turbine) {
      this.group.remove(this.turbine.node);
      this.turbine.solid.geometry.dispose(); this.turbine.solid.material.dispose();
      this.turbine.glow.geometry.dispose(); this.turbine.glow.material.dispose();
      this.turbine = null;
    }
    if (this.ctx.scene) this.ctx.scene.remove(this.group);
    if (LIVE === this) LIVE = null;
  }
}

export default Setpieces;
