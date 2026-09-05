// CURFEW — sites: the builders.
//
// EXTERIORS AND SET-PIECES ONLY. M0 has no interior system and this file does not invent
// one: a door here is a dark hole in a wall you can stand in, not a cell transition.
// DESIGN section 7 puts interiors at M3.
//
// Discipline, lifted from flora.js's planting loop (src/world/flora.js:780-960, read
// 2026-09-02) and obeyed everywhere below:
//   - MERGED static geometry. Every builder assembles primitives into ONE BufferGeometry
//     per material family, so a whole destination is two or three draw calls, not eighty.
//     At these counts (28 gravestones = 336 triangles) merging beats instancing: an
//     InstancedMesh is still a draw call and carries a per-instance matrix buffer.
//   - ONE MATERIAL PER KIND, owned by places.js and passed in. Three bakes the light census
//     into every program; a new material variant is a permanent line on the shader-program
//     budget, so colour variety is carried in a `color` vertex attribute instead. THE
//     BUDGET IS ONE NUMBER AND IT LIVES IN CFG.render.budget.programsMax — this comment
//     used to assert its own figure, four files asserted four different ones, and none of
//     them matched config. The integrator measures the real count and sets it there.
//   - COLLIDERS ARE EMITTED AS THE GEOMETRY IS BUILT, through `api.emit`, in the same
//     statement that places the wall. Never afterwards, never opt-in. That is the law in
//     docs/CONTRACT.md and it is why `emit` is a required argument rather than a return value.
//   - GROUNDED ON terrain.heightAt. Nothing floats and nothing is buried: every builder
//     works in LOCAL metres above `api.padY` (the level of the site's FLATS disc) and the
//     apron skirt closes the seam to the real ground at the rim.
//   - SHADOW CASTERS only where the silhouette needs it, decided by places.js per mesh.
//
// donor: Projects/qualiacology/skyshard/src/world/destinations.js:126-190 (`_shell` — a
//   building is four solids with a doorway gap, and the collider goes on at the same moment
//   as the wall), read 2026-09-02.
// donor history: SKYSHARD's generic marker column was tried and then rejected for CURFEW;
//   physical silhouettes and authored lights now carry destination visibility.
// donor: Projects/eaten-path/src/world/props.js:660-700 (`bicycle`, `flyers`) — the
//   environmental-storytelling minors: someone was here and is not now.
//
// No THREE object here is added to a scene. Builders return geometry and places.js owns
// every Mesh, every material and every add()/remove().

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, clamp } from '../engine/math.js';

// ROUND 13: scratch for the Relay's guy wires (a member from A to B, like wilds.js strut()).
const _wireUp = new THREE.Vector3(0, 1, 0);
const _wireDir = new THREE.Vector3();
const _wireQ = new THREE.Quaternion();
import CFG from '../config.js';           // ROUND 6: roadApproach reads CFG.player.STEP_UP
// The county's material break-up field, three octaves in world space. The chunk ground and
// the road ribbon already take it (chunks.js:679, :787); the destination aprons never did,
// and an apron is the single largest surface in the opening frame.
import { groundDetail } from './terrain.js';
// ROUND 6: Blackthorn Manor is compiled from its own room tables in manor.js and handed
// this file's kit vocabulary through a factory, so there is no import cycle.
import { makeManorBuilder } from './manor.js';
import { makeAveryHouseBuilder } from './avery-house.js';

/* ==========================================================================
   Palette. LINEAR-space albedos, in the same band terrain.js settled on after
   measurement (REGIONS[].ground is 0.08-0.15). Structures sit a little ABOVE the
   ground band on purpose: a building has to read as a made thing at 60 m under a
   moon, and the M0 lesson was that FETCH's albedos render as a void here.
   ========================================================================== */
const C = {
  stone: [0.135, 0.139, 0.133],
  dark: [0.105, 0.108, 0.115],
  slate: [0.085, 0.092, 0.104],
  wood: [0.140, 0.108, 0.082],
  plank: [0.180, 0.148, 0.106],
  metal: [0.128, 0.134, 0.146],
  rust: [0.176, 0.098, 0.062],
  // Old plaster was the brightest broad surface in the game and turned every destination
  // into a blank white block under moon/torch exposure. This is dirty lime render; actual
  // surface variation now comes from places.js's mapped weather texture and from courses,
  // ribs and repairs authored into each compound.
  plaster: [0.180, 0.163, 0.139],
  brick: [0.196, 0.124, 0.100],
  glass: [0.050, 0.062, 0.082],
  soil: [0.098, 0.088, 0.072],
  ash: [0.130, 0.126, 0.122],
  cloth: [0.230, 0.216, 0.190],
  paper: [0.320, 0.306, 0.270],
};

// Ordinary climb props live close to the torch, where the broad site palette can wash into
// pale blocks. These darker, desaturated finishes are confined to the new service routes and
// wreck shells; mapped destination weather still supplies their small-scale grain.
const ORDINARY = Object.freeze({
  timber: Object.freeze([0.072, 0.052, 0.035]),
  timberAlt: Object.freeze([0.108, 0.077, 0.048]),
  char: Object.freeze([0.032, 0.033, 0.034]),
  iron: Object.freeze([0.060, 0.065, 0.071]),
  rust: Object.freeze([0.096, 0.070, 0.054]),
  rustDark: Object.freeze([0.054, 0.043, 0.037]),
});

/* ==========================================================================
   GLOW FALLOFF — the difference between a light and a decal.

   MEASURED 2026-09-02, frame A (spawn), grain zeroed, one rAF, world columns only:
   the places lane's additive material covered 3.28% of world pixels at mean 189 /
   p50 192.9 / p95 211.2 / max 227.5, and owned 1.026 of the frame's 1.076% of world
   pixels above 200 — NINETY-FIVE PERCENT of the entire bright budget, on one lane.
   ART 0.3 row 12 allows lamps, glints and glows above 150 on at most 1.5% of the frame
   and gate H.4 row 9 wants at most 0.2% above 200. Open tests/shots/value-A.png and the
   reason is in the top-left corner: a large flat orange trapezoid with hard straight
   edges and no internal variation. It is the Filling Station's canopy light, an
   11.6 x 7.4 m quad — 86 square metres — at a flat [1, 1, 1].

   Every lit surface in the county was authored that way, so every one of them reads as a
   pasted rectangle rather than as light coming out of a building. Three things fix it and
   all three are used below: FALLOFF (these profiles), INTERNAL STRUCTURE (a fixture is
   several narrow strips, not one slab), and OCCLUSION (`sash` puts solid bars in front of
   the glass, and matGlow's depthWrite:false means they occlude it properly).

   u and v run -1..1 across a pane. Every profile returns 0..1 and the additive material
   multiplies its colour by it, so 0 at the border means the pane has no border: it fades
   out instead of ending.
   ========================================================================== */

/** 1 across the middle, smoothly to 0 over the outer quarter. */
const soft = (t) => { const k = clamp((1 - t) / 0.26, 0, 1); return k * k * (3 - 2 * k); };
const vignette = (u, v) => soft(Math.abs(u)) * soft(Math.abs(v));

/** A window. The fitting is up near the head; the sill is the dark end. */
const PANE_WINDOW = (u, v) => vignette(u, v) * (0.20 + 0.34 * (0.5 + 0.5 * v));
/** A fluorescent tube seen from underneath: hot along the middle, dying at the end caps. */
const PANE_TUBE = (u, v) => soft(Math.abs(u) * 0.6) * soft(Math.abs(v)) * 0.50;
// There is deliberately no PANE_WASH any more. "The pool of light a fixture throws back onto
// the soffit" was a 12 x 7.8 m horizontal additive sheet under the Filling Station canopy,
// and it is what Alex reported as "a translucent square overlay across the screen". A pane
// is a fixture or a window: vertical, or small. tests/sites.mjs pins the largest horizontal
// glow part in the county at 2 m^2.
/** An illuminated sign face: even, but with a rim and a little grime in one corner. */
const PANE_SIGN = (u, v) => vignette(u, v) * (0.34 - 0.09 * u * v);
/** A rose window: bright at the boss, falling to the tracery. */
const PANE_ROSE = (u, v) => {
  const r = Math.min(1, Math.hypot(u, v));
  return 0.50 * soft(r) * (1 - 0.5 * r * r);
};
/** One lamp, one brazier, one dying headlight: a hot core and nothing at the rim. */
const PANE_LAMP = (u, v) => {
  const r = Math.min(1, Math.hypot(u, v));
  return 0.60 * soft(r) * (1 - 0.55 * r * r);
};

/** Glow colours, used as the emissive of the shared additive material. */
export const GLOW = {
  lamp: 0xffb060,     // a filament behind dirty glass
  cold: 0x9fd8ff,     // mercury vapour
  red: 0xff2a18,      // aviation
  white: 0xf6f2e6,    // the mast once it is yours
  ember: 0xff7a26,    // the stack tops
  wisp: 0x86e0d0,     // the fen
};

/* ==========================================================================
   The kit. Primitives in, one merged geometry out.

   Every primitive THREE gives us here (Box, Cylinder, Cone, Plane, Torus) carries
   exactly position/normal/uv, so adding a matching `color` attribute makes them all
   mergeable. mergeGeometries refuses a set whose attributes disagree, silently returning
   null in older builds — hence the explicit normalisation.
   ========================================================================== */

/**
 * THE PANE LEDGER. Every glow pane any builder has ever laid is recorded here by its size
 * and hang — build time only, a bounded Map keyed by shape — so tests/sites.mjs can assert
 * the law the translucent square taught: no horizontal additive pane larger than ~2 m^2
 * anywhere in the county. A pane is horizontal when it was rotated about X by a right
 * angle (rx of +-PI/2), which is how the wash quad was hung and how the ember beds and the
 * hanging lamps still are. Read through paneRecords().
 */
const _panes = new Map();
function recordPane(w, h, rx) {
  const horizontal = Math.abs(Math.abs(rx || 0) - Math.PI * 0.5) < 0.05;
  const key = w.toFixed(2) + 'x' + h.toFixed(2) + (horizontal ? 'H' : 'V');
  let r = _panes.get(key);
  if (!r) { r = { w, h, area: +(w * h).toFixed(3), horizontal, n: 0 }; _panes.set(key, r); }
  r.n++;
}
export function paneRecords() { return Array.from(_panes.values()); }

class Kit {
  constructor() { this.parts = []; this.breaks = null; this._openIdx = -1; }

  /* ------------------------------------------------------------------ *
   * BREAKABLE PARTS — ROUND 7, lane F.
   *
   * A destination is ONE merged geometry (see the discipline note at the top of this
   * file), and that is not negotiable: it is why a whole site is two draw calls. But a car
   * that goes through a fence and leaves the fence standing is this project's signature
   * failure — a system that runs and never reaches the screen. So a builder brackets the
   * primitives that belong to one smashable thing:
   *
   *     k.solid.open();
   *     ...the posts and rails...
   *     k.solid.close(lx, lz, radius, colour);
   *     api.emit({ ..., tag: 'fence' });
   *
   * and `build()` writes the VERTEX RANGE of each bracket onto the finished geometry as
   * `geometry.userData.breakParts`. `vehicle/car.js` matches a crushed collider to its part
   * by position and collapses those vertices to a point: the triangles degenerate, the
   * thing is gone, and nothing else in the merge is touched. Ranges survive the merge
   * because mergeGeometries concatenates attributes in array order.
   *
   * (lx, lz) are the site's OWN local metres, the same frame `api.emit` takes, so a part
   * and the collider it belongs to can never disagree about where the thing is.
   * ------------------------------------------------------------------ */
  open() { this._openIdx = this.parts.length; return this; }

  close(lx, lz, radius, col) {
    if (this._openIdx < 0 || this.parts.length === this._openIdx) { this._openIdx = -1; return this; }
    (this.breaks || (this.breaks = [])).push({
      p0: this._openIdx, p1: this.parts.length,
      x: +lx || 0, z: +lz || 0, r: radius > 0 ? +radius : 1,
      col: col || null,
    });
    this._openIdx = -1;
    return this;
  }

  /** Colour a finished, already-transformed geometry and keep it. */
  push(geo, col) {
    const n = geo.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = col[0]; c[i * 3 + 1] = col[1]; c[i * 3 + 2] = col[2]; }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    this.parts.push(geo);
    return geo;
  }

  /** Transform order is Z, X, then Y — so `rz` reads as a lean and `ry` as a heading. */
  at(geo, col, x, y, z, ry, rx, rz) {
    if (rz) geo.rotateZ(rz);
    if (rx) geo.rotateX(rx);
    if (ry) geo.rotateY(ry);
    geo.translate(x, y, z);
    return this.push(geo, col);
  }

  box(w, h, d, x, y, z, col, ry, rx, rz) {
    // a flat box on the glow kit is a horizontal sheet by another name: on the ledger
    if (this.additive && h <= 0.3 && !rx && !rz) recordPane(w, d, Math.PI * 0.5);
    return this.at(new THREE.BoxGeometry(w, h, d), col, x, y, z, ry, rx, rz);
  }

  cyl(r0, r1, h, seg, x, y, z, col, ry, rx, rz) {
    return this.at(new THREE.CylinderGeometry(r0, r1, h, seg, 1, false), col, x, y, z, ry, rx, rz);
  }

  tube(r0, r1, h, seg, x, y, z, col, ry, rx, rz) {
    return this.at(new THREE.CylinderGeometry(r0, r1, h, seg, 1, true), col, x, y, z, ry, rx, rz);
  }

  cone(r, h, seg, x, y, z, col, ry, rx, rz) {
    return this.at(new THREE.ConeGeometry(r, h, seg, 1, false), col, x, y, z, ry, rx, rz);
  }

  /** A vertical quad facing +Z before `ry`. Used for windows, posters, signs, map pins. */
  quad(w, h, x, y, z, col, ry, rx) {
    if (this.additive) recordPane(w, h, rx);    // a glow quad is a pane without a profile
    return this.at(new THREE.PlaneGeometry(w, h), col, x, y, z, ry, rx, 0);
  }

  /**
   * A GLOW quad with a per-vertex falloff — the one above, done as a light instead of as
   * a sticker. `profile(u, v)` is one of the PANE_* functions at the top of this file and
   * gets normalised plane coordinates, both -1..1 at the edges.
   *
   * The colours are computed in the plane's OWN frame, before any rotation, so a profile
   * always means the same thing however the pane is hung. Rotation order matches `at`
   * (X then Y then translate) so `pane` and `quad` can be swapped without moving anything.
   * Subdivision is what makes the gradient exist at all — a 1x1 plane has four vertices
   * and interpolates a flat slab between them — and 8x8 is 128 triangles, which against a
   * budget of 2.4 M (gate H.4 row 17) is free.
   */
  pane(w, h, x, y, z, profile, ry, rx, segW, segH) {
    recordPane(w, h, rx);
    const g = new THREE.PlaneGeometry(w, h, segW || 8, segH || 8);
    const p = g.attributes.position, n = p.count;
    const c = new Float32Array(n * 3);
    const hw = (w * 0.5) || 1, hh = (h * 0.5) || 1;
    for (let i = 0; i < n; i++) {
      const k = clamp(profile(p.getX(i) / hw, p.getY(i) / hh), 0, 1);
      c[i * 3] = k; c[i * 3 + 1] = k; c[i * 3 + 2] = k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    if (rx) g.rotateX(rx);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    this.parts.push(g);
    return g;
  }

  /** A pitched roof as two slabs. `pitch` is the half-angle of the gable. */
  gable(w, d, h, rise, x, y, z, col, ry) {
    const slope = Math.atan2(rise, w * 0.5);
    const len = Math.hypot(rise, w * 0.5) + 0.22;
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(len, 0.20, d + 0.5);
      g.rotateZ(-s * slope);
      g.translate(s * w * 0.25, h + rise * 0.5, 0);
      if (ry) g.rotateY(ry);
      g.translate(x, y, z);
      this.push(g, col);
    }
  }

  empty() { return this.parts.length === 0; }

  /** Merge and hand over. The kit is empty afterwards and can be reused. */
  build() {
    if (!this.parts.length) return null;
    // ROUND 7: part index -> first vertex, taken BEFORE the merge, while the parts still
    // exist. mergeGeometries concatenates attributes in array order, so these offsets are
    // the merged geometry's own.
    let breakParts = null;
    if (this.breaks && this.breaks.length) {
      const offs = new Array(this.parts.length + 1);
      let off = 0;
      for (let i = 0; i < this.parts.length; i++) {
        offs[i] = off;
        const p = this.parts[i].attributes.position;
        off += p ? p.count : 0;
      }
      offs[this.parts.length] = off;
      breakParts = [];
      for (const b of this.breaks) {
        const v0 = offs[b.p0], v1 = offs[b.p1];
        if (!(v1 > v0)) continue;
        breakParts.push({ x: b.x, z: b.z, r: b.r, v0, v1, col: b.col });
      }
    }
    this.breaks = null; this._openIdx = -1;
    const merged = this.parts.length === 1 ? this.parts[0] : mergeGeometries(this.parts, false);
    if (this.parts.length > 1) for (const g of this.parts) g.dispose();
    this.parts.length = 0;
    if (merged) {
      merged.computeBoundingSphere();
      if (breakParts && breakParts.length) merged.userData.breakParts = breakParts;
    }
    return merged;
  }
}

/** A builder allocates three kits: opaque body, the tall silhouette, and the glow. */
function kits() {
  const glow = new Kit();
  glow.additive = true;     // the ledger records this kit's sheets whatever method laid them
  return { solid: new Kit(), glow };
}

/**
 * The real ground under a LOCAL point of this site, in world metres.
 *
 * `api.padY` is the height at the site CENTRE, and a FLATS disc is only dead level across
 * its inner `blend` fraction — 0.62 of a 42 m disc is 26 m. Anything authored at padY
 * further out than that hovers or buries itself by however much the hill moves, and with
 * the pads rolled back entirely (see places.js _registerFlats) that error is up to 7.4 m
 * over an 18 m footprint. So every prop that stands OUTSIDE the level core — field walls,
 * corn, slag, reeds, orchards, yard walls, the boardwalk — is grounded on this instead,
 * which is the same heightfield the apron is projected onto and the same one collision
 * stands the player on. Build-time only; nothing here runs in step().
 */
function groundY(api, lx, lz) {
  return api.heightAt(api.wx(lx, lz), api.wz(lx, lz));
}

/* ==========================================================================
   Shared sub-builders. Every one of them emits its own collider.
   ========================================================================== */

/**
 * A rectangular shell with a doorway gap on its -Z face. Four solids, four colliders,
 * emitted wall by wall (SKYSHARD destinations.js:130-146 does exactly this and the reason
 * is that a shell whose colliders are added in a second pass ships with one wall missing).
 *
 * (ox, oz) is the shell's centre in the SITE's local frame, and `yaw` is its heading in
 * that frame. places.js rotates the whole site group and applies the same rotation to
 * every emitted collider, so local is the only frame a builder ever has to think in.
 */
function shell(k, api, ox, oz, w, d, h, yaw, col, doorW) {
  const t = 0.44;
  const hw = w * 0.5, hd = d * 0.5;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  // THE PLINTH. Walls run from the LOWEST ground under the footprint up to the pad plus h,
  // so a building on a slope grows a foundation on its downhill side and buries one on the
  // uphill side, the way a real one does. With the site's FLATS disc registered this is a
  // 0.5 m skirt that costs nothing; without it (see the rollback note in places.js) it is
  // the difference between a house and a house hanging over a bank.
  let gmin = api.padY;
  for (let i = 0; i < 4; i++) {
    const lx = (i & 1 ? hw : -hw), lz = (i & 2 ? hd : -hd);
    const px = ox + lx * cy + lz * sy, pz = oz - lx * sy + lz * cy;
    const g = api.heightAt(api.wx(px, pz), api.wz(px, pz));
    if (g < gmin) gmin = g;
  }
  const base = gmin - 0.5;
  const top = api.padY + h;
  const H = top - base, midY = (top + base) * 0.5;
  // (lx, lz) is inside the shell's own frame; rotate it into the site frame.
  const put = (lx, lz, sw, sd) => {
    const px = ox + lx * cy + lz * sy;
    const pz = oz - lx * sy + lz * cy;
    k.box(sw, H, sd, px, midY, pz, col, yaw);
    api.emit({
      kind: 'obb', x: px, z: pz, halfX: sw * 0.5, halfZ: sd * 0.5, yaw,
      y0: base, y1: top, tag: 'wall',
    });
  };
  put(0, hd, w, t);                       // back (+Z in the shell's frame)
  put(-hw, 0, t, d);                      // left
  put(hw, 0, t, d);                       // right
  const gap = Math.min(doorW || 2.2, w - 1.2);
  const side = (w - gap) * 0.5;
  put(-(gap + side) * 0.5, -hd, side, t); // front, either side of the doorway
  put((gap + side) * 0.5, -hd, side, t);
  // lintel over the doorway, so the opening reads as a door and not as a missing wall
  k.box(gap, 0.5, t, ox + (-hd) * sy, api.padY + h - 0.25, oz + (-hd) * cy, col, yaw);
}

/**
 * A short, visible route onto one eave of a SMALL shell.
 *
 * The roof itself remains a pitched roof, not an invisible flat floor. Four made things
 * explain every top collision instead: split firewood, a square packing crate, a braced
 * service awning, and a narrow plank walk fixed under one eave. They rise in a readable
 * chain beside the right wall. The route is authored only onto selected huts/outbuildings;
 * calling this from shell() would turn every gable in the county into the same staircase.
 */
function smallShellRoute(k, api, ox, oz, w, d, h, yaw) {
  const hw = w * 0.5, hd = d * 0.5;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const put = (lx, lz) => ({
    x: ox + lx * cy + lz * sy,
    z: oz - lx * sy + lz * cy,
  });
  const box = (sw, sh, sd, lx, y, lz, col, rz) => {
    const p = put(lx, lz);
    k.box(sw, sh, sd, p.x, y, p.z, col, yaw, 0, rz || 0);
    return p;
  };
  const floor = (sw, sd, lx, lz, top, col, tag) => {
    const p = box(sw, 0.14, sd, lx, top - 0.07, lz, col);
    api.emit({
      kind: 'obb', x: p.x, z: p.z, halfX: sw * 0.5, halfZ: sd * 0.5, yaw,
      y0: top - 0.14, y1: top, tag: tag || 'wood', standable: true,
    });
    return p;
  };

  const woodX = hw + 1.42, woodZ = -hd + 0.58, woodTop = api.padY + 0.42;
  for (let i = 0; i < 6; i++) {
    const row = i > 2 ? 1 : 0, slot = i % 3;
    box(0.24, 0.20, 0.82, woodX + (slot - 1) * 0.28,
      api.padY + 0.10 + row * 0.22, woodZ,
      i & 1 ? ORDINARY.timber : ORDINARY.timberAlt, (slot - 1) * 0.04);
  }
  const wp = put(woodX, woodZ);
  api.emit({ kind: 'obb', x: wp.x, z: wp.z, halfX: 0.52, halfZ: 0.47, yaw,
    y0: api.padY - 0.2, y1: woodTop, tag: 'wood', standable: true });

  const crateX = hw + 1.40, crateZ = -hd + 1.62, crateTop = api.padY + 1.08;
  box(0.88, 1.02, 0.88, crateX, api.padY + 0.51, crateZ, ORDINARY.timberAlt);
  box(0.92, 0.07, 0.92, crateX, crateTop - 0.035, crateZ, ORDINARY.timber);
  for (const s of [-1, 1]) box(0.09, 0.92, 0.92, crateX + s * 0.32,
    api.padY + 0.51, crateZ, ORDINARY.timber);
  // Two face braces sit below the exact top; silhouette and standable rectangle stay unchanged.
  for (const face of [-1, 1]) box(0.09, 0.86, 0.045, crateX,
    api.padY + 0.50, crateZ + face * 0.455, ORDINARY.timber, face * 0.58);
  const cp = put(crateX, crateZ);
  api.emit({ kind: 'obb', x: cp.x, z: cp.z, halfX: 0.46, halfZ: 0.46, yaw,
    y0: api.padY - 0.2, y1: crateTop, tag: 'wood', standable: true });

  const awnTop = api.padY + Math.min(1.76, h - 0.70);
  const awnX = hw + 0.98, awnZ = -hd + 2.72;
  floor(1.62, 2.38, awnX, awnZ, awnTop, ORDINARY.timberAlt, 'wood');
  for (const dx of [-0.60, -0.20, 0.20, 0.60]) {
    box(0.045, 0.045, 2.34, awnX + dx, awnTop - 0.115, awnZ, ORDINARY.char);
  }
  // Two posts and diagonal knees make the floor read as an awning, not a hovering shelf.
  for (const lz of [awnZ - 0.90, awnZ + 0.90]) {
    const p = put(hw + 1.62, lz);
    k.box(0.12, awnTop - api.padY, 0.12, p.x,
      (api.padY + awnTop) * 0.5, p.z, ORDINARY.timber, yaw);
    const q = put(hw + 1.22, lz);
    k.box(0.10, 0.92, 0.10, q.x, awnTop - 0.42, q.z, ORDINARY.timberAlt, yaw, 0, -0.70);
  }

  // A real horizontal maintenance strip below ONE eave. Nothing claims the gable pitches.
  const eaveTop = api.padY + h;
  const eaveX = hw + 0.42, eaveZ = -hd + Math.min(d - 1.0, 3.32);
  const eaveD = Math.min(3.25, d - 0.55);
  floor(1.12, eaveD, eaveX, eaveZ, eaveTop, ORDINARY.timberAlt, 'wood');
  for (const dx of [-0.40, 0, 0.40]) {
    box(0.045, 0.045, eaveD - 0.04, eaveX + dx, eaveTop - 0.115,
      eaveZ, ORDINARY.char);
  }
  for (const dz of [-1.0, 1.0]) {
    const p = put(hw + 0.70, eaveZ + dz);
    k.box(0.10, 1.25, 0.10, p.x, eaveTop - 0.62, p.z, ORDINARY.timber, yaw, 0, -0.48);
  }
}

/**
 * ROUND 13: THE ROOF IS A FLOOR YOU CAN WALK. Kit.gable() draws two slabs and emits nothing,
 * so a body that reached the eave strip or a wall top stepped a hand's width onto the picture
 * of a roof and dropped into the hut — Alex, at the Relay: "climbed up some steps to the roof.
 * then fell through the roof lol." The collider store holds vertical prisms, so each pitch
 * becomes a short stair of standable strips whose tops follow the slope, every riser under
 * STEP_UP, and the body walks up one pitch, over the ridge and down the other. Same footprint
 * and depth as the gable it sits under; nothing is drawn. Called only where a shell also has
 * a smallShellRoute, so the roofs you can reach are the roofs that hold you.
 */
function gableFloor(api, x, z, w, d, h, rise, ry) {
  const yaw = ry || 0;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const half = w * 0.5;
  const n = Math.max(2, Math.ceil(half / 0.85));
  const sw = half / n;
  const hd = (d + 0.5) * 0.5;
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) * sw;                        // metres out from the ridge
      const top = h + rise * (1 - u / half) + 0.08;    // the slab's upper face, near enough
      const lx = s * u;
      api.emit({
        kind: 'obb', x: x + lx * cy, z: z - lx * sy, halfX: sw * 0.5 + 0.02, halfZ: hd, yaw,
        y0: top - 0.30, y1: top, tag: 'roof', standable: true,
      });
    }
  }
}

/**
 * A short glow column on the GLOW kit: an open tapered cylinder whose vertex colour falls to
 * nothing at the top, a shared tapered glow profile at prop scale. `gain` scales the whole
 * profile so a campfire is a fire and not a lighthouse. Reads from every bearing, which is
 * what a flat ember bed cannot do (see the works stacks).
 */
function glowColumn(k, x, y, z, r, h, gain) {
  const g = new THREE.CylinderGeometry(r * 0.35, r, h, 8, 1, true);
  g.translate(0, h * 0.5, 0);
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  const py = g.attributes.position.array;
  for (let i = 0; i < n; i++) {
    const t = clamp(1 - py[i * 3 + 1] / h, 0, 1);
    const v = gain * t * t;
    c[i * 3] = v; c[i * 3 + 1] = v; c[i * 3 + 2] = v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.translate(x, y, z);
  k.parts.push(g);
  return g;
}

/** A four-legged lattice mast or headframe, in the site's local frame. */
/**
 * A window's frame and the bars across it, on the SOLID kit.
 *
 * A lit window is an OPENING. What makes it read as one rather than as a bright rectangle
 * is that something solid stands in front of part of it and cuts it up — and the sash is
 * dark, so it is also the only thing in the frame that gives the glow an edge worth
 * having. matGlow is `depthWrite:false` and draws after the opaque pass, so a bar placed
 * proud of the glass along the plane's own normal occludes it properly.
 *
 * `off` is how far proud, in the pane's local +Z before rotation; the default puts the
 * whole bar in front of a pane hung the way the builders below hang them.
 */
function sash(k, w, h, x, y, z, col, ry, rx, cols, rows, bar, off) {
  const t = bar || 0.07, o = off === undefined ? 0.10 : off, d = t * 1.7;
  const put = (bw, bh, bx, by) => {
    const g = new THREE.BoxGeometry(bw, bh, d);
    g.translate(bx, by, o);
    if (rx) g.rotateX(rx);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    k.push(g, col);
  };
  put(w + t * 2, t, 0, (h + t) * 0.5);          // head
  put(w + t * 2, t, 0, -(h + t) * 0.5);         // sill
  put(t, h, -(w + t) * 0.5, 0);                 // jambs
  put(t, h, (w + t) * 0.5, 0);
  const nc = cols || 1, nr = rows || 1;
  for (let i = 1; i < nc; i++) put(t * 0.75, h, -w * 0.5 + w * i / nc, 0);
  for (let j = 1; j < nr; j++) put(w, t * 0.75, 0, -h * 0.5 + h * j / nr);
}

function lattice(k, api, lx, lz, base, top, height, rungs, col, tag) {
  const legR = 0.14 + height * 0.0026;
  for (let i = 0; i < 4; i++) {
    const sx = (i & 1) ? 1 : -1, sz = (i & 2) ? 1 : -1;
    const bx = lx + sx * base, bz = lz + sz * base;
    const tx = lx + sx * top, tz = lz + sz * top;
    const dx = tx - bx, dz = tz - bz;
    const len = Math.hypot(height, Math.hypot(dx, dz));
    const g = new THREE.CylinderGeometry(legR * 0.7, legR, len, 6);
    // lean the leg from its base to its top
    g.rotateZ(-Math.atan2(dx, height));
    g.rotateX(Math.atan2(dz, height));
    g.translate((bx + tx) * 0.5, api.padY + height * 0.5, (bz + tz) * 0.5);
    k.push(g, col);
  }
  for (let r = 1; r <= rungs; r++) {
    const t = r / (rungs + 1);
    const y = api.padY + height * t;
    const hwd = base + (top - base) * t;
    k.box(hwd * 2, 0.10, 0.10, lx, y, lz - hwd, col);
    k.box(hwd * 2, 0.10, 0.10, lx, y, lz + hwd, col);
    k.box(0.10, 0.10, hwd * 2, lx - hwd, y, lz, col);
    k.box(0.10, 0.10, hwd * 2, lx + hwd, y, lz, col);
  }
  // ROUND 13: THE COLLIDER IS THE FOUR LEGS, NOT A TUBE OVER THE WHOLE SPREAD. One circle of
  // base*1.05 made the Relay's mast a 10.5 m invisible wall with open ground drawn between
  // its legs — Alex walked into it: "there was an area that looked like i could just walk
  // across. it blocked me. i walked all the way around." Each leg is now a thin round post
  // from the pad to the head, tagged 'mast' so the mantle refuses it (collision.js
  // NON_CLIMB_TAGS); the rungs start at height/(rungs+1) and stay draw-only. Same emit at
  // the Weeping Mine headframe. (The tag argument stays in the signature for its callers.)
  void tag;
  for (let i = 0; i < 4; i++) {
    const sx = (i & 1) ? 1 : -1, sz = (i & 2) ? 1 : -1;
    api.emit({
      kind: 'circle', x: lx + sx * base, z: lz + sz * base, r: Math.max(0.42, legR * 1.8),
      y0: api.padY - 0.3, y1: api.padY + height, tag: 'mast',
    });
  }
}

/** A ring of low wall around a yard, with a gap facing the road. */
function yardWall(k, api, radius, height, gapDir, col) {
  const N = 22;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    // leave two segments out where the gate is
    let da = a - gapDir;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    if (Math.abs(da) < 0.30) continue;
    // ROUND 6 (lane D2's route audit): and two more on the ROAD side. Both callers put the
    // gate at -PI/2 (local -Z) on the belief that -Z faces the road; places.js sends local
    // +Z to the road point, so the gate faced the back of the yard and the approach steps
    // (roadApproach) landed against a closed wall. A yard on a road has a gate on the road.
    let dr = a - Math.PI * 0.5;
    while (dr > Math.PI) dr -= TAU;
    while (dr < -Math.PI) dr += TAU;
    if (Math.abs(dr) < 0.30) continue;
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
    const seg = (TAU / N) * radius * 1.12;
    const h = height * (0.72 + 0.28 * Math.abs(Math.sin(i * 2.7)));
    // A yard wall is a ring 19-24 m out, which is at or past the level core of every disc
    // it is used on. Each segment stands on the ground it is actually over and steps down
    // the hill the way a dry-stone wall does; at padY they hovered on the low side.
    const gy = groundY(api, x, z);
    // TANGENTIAL. rotateY(-a) sends a box's long axis along the RADIUS (measured for the
    // lighthouse stair and again here, tests/manor.mjs: a body fit at a segment's
    // tangential end and not at its radial end), so this ring was 22 spokes with
    // 6 m gaps between them. -(a + PI/2) lays each length along the ring.
    const yaw = -(a + Math.PI * 0.5);
    k.box(seg, h + 0.3, 0.42, x, gy + h * 0.5 - 0.15, z, col, yaw);
    api.emit({
      kind: 'obb', x, z, halfX: seg * 0.5, halfZ: 0.21, yaw,
      y0: gy - 0.3, y1: gy + h, tag: 'wall',
    });
  }
}

/* ==========================================================================
   THE TWELVE. Each entry is { landmark, body }.

   landmark(api)  builds the tall silhouette ONCE at boot. It lives in a persistent group
                  that is never distance-culled, so this is the part of a destination you
                  see from across the county. Returns { solid, glow, moving }.
   body(api)      builds everything at ground level and is streamed with the chunk ring.
                  Returns { solid, glow, moving }.

   `moving` entries become their own Mesh with a pivot, for the sails, the beam and the
   bell. Their geometry is authored around the pivot at the origin.

   api = { padY, yaw, rng, age, emit(localShape), heightAt(worldX, worldZ), wx, wz, site }
   Local coordinates are metres from the site origin, in the site's own yawed frame; Y is
   absolute world metres. api.wx(lx,lz)/api.wz(lx,lz) convert when world space is needed.
   ========================================================================== */

export const BUILDERS = {

  /* ---------------------------------------------------------------- station */
  // The lit hub you wake in. Everything here is legible at 3 a.m. through a windscreen:
  // a canopy you can stand under, two pumps, a shop with a lit window, and the sign.
  station: {
    landmark(api) {
      const k = kits();
      // the sign pylon — the one thing at the Filling Station tall enough to be a read
      k.solid.box(0.42, 9.4, 0.42, 6.6, api.padY + 4.7, -7.4, C.metal);
      k.solid.box(3.4, 1.9, 0.30, 6.6, api.padY + 8.7, -7.4, C.plaster);
      // The sign face: a lit box behind a frame and a bar, not a white sticker on a pole.
      k.glow.pane(3.0, 1.5, 6.6, api.padY + 8.7, -7.22, PANE_SIGN, 0, 0, 6, 5);
      sash(k.solid, 3.0, 1.5, 6.6, api.padY + 8.7, -7.22, C.dark, 0, 0, 1, 2, 0.08, 0.10);
      api.emit({
        kind: 'circle', x: 6.6, z: -7.4, r: 0.42,
        y0: api.padY, y1: api.padY + 9.4, tag: 'metal',
      });
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.cold };
    },
    body(api) {
      const k = kits();
      // canopy on four posts
      const cw = 13, cd = 9, ch = 4.6;
      k.solid.box(cw, 0.55, cd, 0, api.padY + ch, 0, C.plaster);
      for (const px of [-cw * 0.42, cw * 0.42]) {
        for (const pz of [-cd * 0.40, cd * 0.40]) {
          k.solid.cyl(0.20, 0.20, ch, 8, px, api.padY + ch * 0.5, pz, C.metal);
          api.emit({
            kind: 'circle', x: px, z: pz, r: 0.24,
            y0: api.padY, y1: api.padY + ch, tag: 'metal',
          });
        }
      }
      // THE STRIP LIGHT UNDER THE CANOPY — the reason this place reads as SAFE, and the
      // single worst pixel in the build until now. It was ONE 11.6 x 7.4 m quad at a flat
      // [1, 1, 1]: 86 square metres of unvarying orange, hanging in the top-left of
      // tests/shots/value-A.png with a hard straight edge, reading as a pasted rectangle
      // rather than as a lit forecourt. Measured, it owned most of the 1.026% of world
      // pixels above 200 that this lane was spending against a 0.2% gate.
      //
      // A strip light is a STRIP. Three fixtures with dark housings, a hot core that dies
      // at the end caps, and the pool of light they throw back on the plaster above them.
      // Bright area falls from 86 m^2 to about 5, the gradient gives the soffit somewhere
      // to be in the 48-127 band ART 0.2 says the frame has nothing in, and the housings
      // put four dark edges across the light so it has internal structure to read.
      //
      // ROUND 5 (Alex, playtest 4): "I'm seeing some kind of translucent square overlay
      // across the screen at many points." That was the fourth glow part here: a 12 x 7.8 m
      // HORIZONTAL additive pane at lamp height (PANE_WASH, "the pool of light the fixtures
      // throw back on the soffit"). Measured from under the canopy looking up it filled the
      // whole frame at a flat orange, and from the forecourt at any angle it read as a
      // translucent rectangle floating under the roof, hard-edged at the slab
      // (tests/shots/round5-E-canopy-up-before.png). A soffit is lit by its fixtures and by
      // what the light lands on, never by a sheet of glass in the air. Deleted. The three
      // tubes are the fixtures and they stay; the fascia below gives the slab an edge to
      // read as a made thing instead of a plaster plank.
      const lampY = api.padY + ch - 0.30;
      for (const lx of [-3.9, 0, 3.9]) {
        k.solid.box(0.66, 0.15, cd - 2.0, lx, lampY - 0.07, 0, C.slate);
        k.glow.pane(0.30, cd - 2.8, lx, lampY - 0.16, 0, PANE_TUBE, 0, Math.PI * 0.5, 2, 12);
      }
      // the fascia: a dark band round the slab edge, and a drip rail under it
      k.solid.box(cw + 0.10, 0.42, 0.12, 0, api.padY + ch + 0.06, -cd * 0.5 - 0.02, C.slate);
      k.solid.box(cw + 0.10, 0.42, 0.12, 0, api.padY + ch + 0.06, cd * 0.5 + 0.02, C.slate);
      k.solid.box(0.12, 0.42, cd + 0.10, -cw * 0.5 - 0.02, api.padY + ch + 0.06, 0, C.slate);
      k.solid.box(0.12, 0.42, cd + 0.10, cw * 0.5 + 0.02, api.padY + ch + 0.06, 0, C.slate);
      // THE CANOPY IS A ROOF YOU CAN STAND ON (Alex: "It would also be cool if you could
      // get on top of this stuff"). One standable slab collider; walking under it at ground
      // level never touches it (feet padY, head padY + 1.8, slab from padY + 4.325).
      api.emit({
        kind: 'obb', x: 0, z: 0, halfX: cw * 0.5, halfZ: cd * 0.5, yaw: 0,
        y0: api.padY + ch - 0.275, y1: api.padY + ch + 0.275, tag: 'wall', standable: true,
      });
      // two pump islands. The old single 1.7 m block over the whole island was an invisible
      // wall; now the kerb and the pump tops carry their own colliders. MEASURED (round 5
      // verification): the 0.30 m kerb is walked THROUGH at ground level, not stood on —
      // controller.js STICK (0.42) snaps a body back to terrain from anything lower than
      // that, whatever collision reports as support — so `standable` on the kerb only stops
      // it being a wall. The pump TOP (padY + 1.85) is a floor, reachable from the canopy.
      for (const iz of [-2.4, 2.4]) {
        k.solid.box(3.6, 0.30, 1.5, 0, api.padY + 0.15, iz, C.ash);
        api.emit({
          kind: 'obb', x: 0, z: iz, halfX: 1.8, halfZ: 0.75, yaw: 0,
          y0: api.padY, y1: api.padY + 0.30, tag: 'stone', standable: true,
        });
        for (const px of [-0.9, 0.9]) {
          k.solid.box(0.75, 1.55, 0.55, px, api.padY + 1.05, iz, C.plaster);
          k.solid.box(0.55, 0.30, 0.04, px, api.padY + 1.45, iz - 0.29, C.dark);   // the display
          k.solid.box(0.08, 0.34, 0.10, px + 0.26, api.padY + 0.95, iz - 0.30, C.dark);   // the nozzle
          api.emit({
            kind: 'obb', x: px, z: iz, halfX: 0.375, halfZ: 0.275, yaw: 0,
            y0: api.padY + 0.30, y1: api.padY + 1.85, tag: 'metal', standable: true,
          });
        }
      }
      // the shop
      shell(k.solid, api, -10.5, 0.5, 10, 7, 3.6, 0, C.plaster, 2.4);
      k.solid.gable(10.6, 7.6, api.padY + 3.6, 1.1, -10.5, 0, 0.5, C.slate, 0);
      // THE SHOP ROOF IS A FLOOR. Measured 2026-09-03 (docs/ROUND-5/E-places.md): standing on
      // any collider top the player controller reads airborne (controller.js:860 clamps to
      // terrain.heightAt), so there is no jump and no mantle off a crate, and the mantle
      // probe (controller.js:1057) reads terrain only. The only climb the shipped controller
      // can make is a STAIR of risers inside STEP_UP + STEP_TOL = 0.60 m. So the roof is
      // five standable strips nested about the ridge that follow the gable's pitch in
      // quarter-metre steps, and the way up to it is the crate stair against the back wall
      // below, which tops out at the WEST EAVE — the nested strips all share the back edge,
      // so the only place their walls are inside a step of a 3.3 m crate is where the pitch
      // is lowest (measured: at the ridge column the stair was a dead end, probe 3).
      {
        const gx = -10.5, gz = 0.5, halfD = 4.05, eaveTop = api.padY + 3.78;
        // The inner strips start 1.0 m in from the crate column's footprint (x -15.41..-14.59
        // plus the body's 0.36): a strip wall inside that reach is a 0.7 m step and a dead end.
        const strips = [[5.3, 0], [3.5, 0.22], [2.5, 0.44], [1.5, 0.67], [0.5, 0.92]];
        for (const [hx, rise] of strips) {
          api.emit({
            kind: 'obb', x: gx, z: gz, halfX: hx, halfZ: halfD, yaw: 0,
            y0: api.padY + 3.0, y1: eaveTop + rise, tag: 'wall', standable: true,
          });
        }
        // the plant box on the +x pitch: the last step, level with the canopy top
        k.solid.box(2.3, 0.90, 1.6, -7.75, api.padY + 4.40, 1.2, C.metal);
        k.solid.box(0.5, 0.22, 0.5, -7.3, api.padY + 4.96, 1.2, C.dark);     // the vent hood
        api.emit({
          kind: 'obb', x: -7.75, z: 1.2, halfX: 1.15, halfZ: 0.8, yaw: 0,
          y0: api.padY + 3.9, y1: api.padY + 4.85, tag: 'metal', standable: true,
        });
      }
      // THE CRATE STAIR, against the back wall: six columns of stacked crates rising 0.55 m
      // a column, from the yard up to the west eave. Each column is one standable collider.
      for (let i = 0; i < 6; i++) {
        const cx = -10.9 - i * 0.82, cz = 4.95, top = 0.55 * (i + 1);
        for (let j = 0; j <= i; j++) {
          const jit = api.rng.range(-0.05, 0.05);
          k.solid.box(0.78, 0.50, 0.78, cx + jit, api.padY + 0.275 + j * 0.55, cz - jit, C.plank,
            api.rng.range(-0.08, 0.08));
          k.solid.box(0.80, 0.05, 0.80, cx + jit, api.padY + 0.53 + j * 0.55, cz - jit, C.wood);
        }
        api.emit({
          kind: 'obb', x: cx, z: cz, halfX: 0.41, halfZ: 0.41, yaw: 0,
          y0: api.padY - 0.2, y1: api.padY + top, tag: 'wood', standable: true,
        });
      }
      // ROUND 6 (NEXT.md 3, lane E's leftover): THE CRATE STAIR YOU CANNOT FIND. It stands
      // behind the shop, out of sight of the pumps and the forecourt. Three things now say
      // "round here": a work lamp on a bracket off the shop's back-east corner, hung 1.2 m
      // proud of the wall so it is in the line of sight from BOTH pumps (measured: the ray
      // from (0.9, -2.4) clears the east wall's z extent by 0.5 m and the gable's x extent
      // by 0.1 m; tests/manor.mjs raycasts it); a tin of paint kicked over at that corner
      // whose spill runs along the back wall to the first crate; and a glint on the first
      // crate's lid where the spill ends. No new light: the lamp and the glint are the
      // shared additive material, small and vertical or on the ledger under a square metre.
      {
        const bx = -5.6, bz = 4.0, by = api.padY + 3.55;
        k.solid.box(0.08, 0.08, 1.3, bx, by, bz + 0.65, C.metal);                      // the bracket
        k.solid.box(0.10, 0.6, 0.10, bx, by - 0.3, bz + 0.05, C.metal);                // its stay
        k.solid.cone(0.26, 0.24, 8, bx, by - 0.10, bz + 1.25, C.slate);               // the hood
        k.glow.pane(0.34, 0.34, bx, by - 0.25, bz + 1.25, PANE_LAMP, 0, -Math.PI * 0.5, 6, 6);
        glowColumn(k.glow, bx, by - 0.30, bz + 1.25, 0.30, 0.9, 0.5);
        // the paint: the tin on its side at the corner, and the spill along the wall
        const tinX = -5.9, tinZ = 4.85;
        k.solid.cyl(0.13, 0.13, 0.18, 8, tinX, api.padY + 0.13, tinZ, C.metal, 0.4, 0, Math.PI * 0.5);
        k.solid.cyl(0.13, 0.13, 0.02, 8, tinX + 0.1, api.padY + 0.13, tinZ, C.paper, 0.4, 0, Math.PI * 0.5);
        const spill = [[-6.3, 4.9, 0.9, 0.55], [-7.4, 4.95, 1.0, 0.40], [-8.5, 4.9, 1.1, 0.32], [-9.6, 4.95, 1.0, 0.28], [-10.5, 4.55, 0.7, 0.45]];
        for (const [sx, sz, sw, sd] of spill) {
          k.solid.quad(sw, sd, sx, api.padY + 0.012, sz, C.paper, api.rng.range(-0.2, 0.2), -Math.PI * 0.5);
        }
        // the smear up the first crate's east face, and the glint on its lid
        k.solid.quad(0.30, 0.42, -10.47, api.padY + 0.24, 4.95, C.paper, Math.PI * 0.5, 0);
        k.glow.pane(0.28, 0.28, -10.9, api.padY + 0.58, 4.95, PANE_LAMP, 0, -Math.PI * 0.5, 5, 5);
      }
      // FORECOURT CLUTTER (Alex: "they don't look like they have any detail"). Every piece
      // emits its own collider in the statement that places it.
      // a tyre stack by the north-east post
      for (let j = 0; j < 4; j++) {
        k.solid.tube(0.36, 0.36, 0.22, 10, 4.3 + api.rng.range(-0.04, 0.04), api.padY + 0.11 + j * 0.23,
          5.1 + api.rng.range(-0.04, 0.04), C.dark, 0, 0, 0);
        k.solid.cyl(0.36, 0.36, 0.06, 10, 4.3, api.padY + 0.11 + j * 0.23, 5.1, C.slate);
      }
      api.emit({ kind: 'circle', x: 4.3, z: 5.1, r: 0.40, y0: api.padY - 0.2, y1: api.padY + 0.92, tag: 'wood', standable: true });
      // three oil drums at the shop's back corner
      for (const [dx, dz, lean] of [[-4.5, 4.7, 0], [-3.8, 5.2, 0], [-4.4, 5.6, 0.9]]) {
        if (lean) {
          k.solid.cyl(0.29, 0.29, 0.88, 10, dx, api.padY + 0.30, dz, C.rust, 0, 0, Math.PI * 0.5);
          api.emit({ kind: 'obb', x: dx, z: dz, halfX: 0.44, halfZ: 0.30, yaw: 0, y0: api.padY - 0.2, y1: api.padY + 0.58, tag: 'metal', standable: true });
        } else {
          k.solid.cyl(0.29, 0.29, 0.88, 10, dx, api.padY + 0.44, dz, C.rust);
          k.solid.cyl(0.30, 0.30, 0.04, 10, dx, api.padY + 0.87, dz, C.dark);
          api.emit({ kind: 'circle', x: dx, z: dz, r: 0.30, y0: api.padY - 0.2, y1: api.padY + 0.88, tag: 'metal', standable: true });
        }
      }
      // the ice chest under the shop window, and the bench under the map board
      k.solid.box(1.3, 0.90, 0.72, -13.6, api.padY + 0.45, -3.72, C.plaster);
      k.solid.box(1.3, 0.06, 0.74, -13.6, api.padY + 0.92, -3.72, C.dark);
      api.emit({ kind: 'obb', x: -13.6, z: -3.72, halfX: 0.65, halfZ: 0.36, yaw: 0, y0: api.padY - 0.2, y1: api.padY + 0.95, tag: 'metal', standable: true });
      k.solid.box(1.7, 0.07, 0.42, -7.4, api.padY + 0.46, -3.72, C.plank);
      for (const bx of [-8.1, -6.7]) k.solid.box(0.08, 0.44, 0.40, bx, api.padY + 0.22, -3.72, C.metal);
      api.emit({ kind: 'obb', x: -7.4, z: -3.72, halfX: 0.85, halfZ: 0.21, yaw: 0, y0: api.padY - 0.2, y1: api.padY + 0.50, tag: 'wood', standable: true });
      // a bin by the door
      k.solid.cyl(0.27, 0.24, 0.85, 9, -6.4, api.padY + 0.42, -3.9, C.metal);
      k.solid.cyl(0.29, 0.29, 0.06, 9, -6.4, api.padY + 0.87, -3.9, C.dark);
      api.emit({ kind: 'circle', x: -6.4, z: -3.9, r: 0.28, y0: api.padY - 0.2, y1: api.padY + 0.88, tag: 'metal', standable: true });
      // pallets by the sign, one with a drum still on it
      for (const [px, pz, ry] of [[2.6, -5.9, 0.15], [3.9, -5.5, -0.35]]) {
        k.solid.box(1.2, 0.14, 1.0, px, api.padY + 0.07, pz, C.wood, ry);
        api.emit({ kind: 'obb', x: px, z: pz, halfX: 0.6, halfZ: 0.5, yaw: ry, y0: api.padY - 0.2, y1: api.padY + 0.14, tag: 'wood', standable: true });
      }
      k.solid.cyl(0.29, 0.29, 0.88, 10, 3.9, api.padY + 0.58, -5.5, C.rust);
      api.emit({ kind: 'circle', x: 3.9, z: -5.5, r: 0.30, y0: api.padY, y1: api.padY + 1.02, tag: 'metal', standable: true });
      // the air-line post between the pumps and the east posts
      k.solid.cyl(0.06, 0.07, 1.1, 6, 4.2, api.padY + 0.55, 0, C.metal);
      k.solid.box(0.32, 0.26, 0.22, 4.2, api.padY + 1.22, 0, C.rust);
      api.emit({ kind: 'circle', x: 4.2, z: 0, r: 0.14, y0: api.padY - 0.2, y1: api.padY + 1.35, tag: 'metal' });
      // the phone box at the shop's far end, glass dark
      k.solid.box(1.0, 2.45, 1.0, -17.0, api.padY + 1.225, -1.6, C.rust);
      k.solid.quad(0.78, 1.7, -17.0, api.padY + 1.35, -2.11, C.glass, Math.PI);
      k.solid.quad(0.78, 1.7, -17.51, api.padY + 1.35, -1.6, C.glass, -Math.PI * 0.5);
      api.emit({ kind: 'obb', x: -17.0, z: -1.6, halfX: 0.5, halfZ: 0.5, yaw: 0, y0: api.padY - 0.2, y1: api.padY + 2.45, tag: 'metal', standable: true });
      // the shop window: four panes behind a frame, a blind pulled half down over the top
      // of them, and a gradient that is brightest at the fitting and dies at the sill
      k.glow.pane(3.0, 1.4, -13.6, api.padY + 2.1, -3.06, PANE_WINDOW, Math.PI, 0, 8, 8);
      sash(k.solid, 3.0, 1.4, -13.6, api.padY + 2.1, -3.06, C.dark, Math.PI, 0, 2, 2, 0.08, 0.10);
      k.solid.box(2.86, 0.40, 0.06, -13.6, api.padY + 2.56, -3.15, C.slate);
      // the county map board on the shop's road-facing wall — the third record of a
      // filling map (DESIGN section 2). places.js adds one pin quad per found place.
      k.solid.box(3.2, 2.1, 0.14, -8.4, api.padY + 1.9, -3.14, C.wood, Math.PI);
      k.solid.quad(2.9, 1.8, -8.4, api.padY + 1.9, -3.23, C.paper, Math.PI);
      return {
        solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp,
        // ROUND 6.1 (Alex, sixth playtest: "it just has a rectangle thing over part of the
        // doorway"). It did. shell() puts the shop's 2.4 m doorway at local x -11.7..-9.3;
        // this board is 2.7 wide and stood at x -8.4, so it spanned -9.75..-7.05 and hung
        // 0.45 m ACROSS the opening, 0.29 m proud of the wall, at eye height (padY+1.07 to
        // padY+2.73 against an eye of 1.68). Centred on the wall panel beside the door
        // instead: the panel is -9.3..-5.5, its middle is -7.4, and the board now clears the
        // doorway by 0.55 m. The bench under it moved the same 1.0 m.
        mapBoard: { x: -7.4, y: api.padY + 1.9, z: -3.29, w: 2.7, h: 1.66, yaw: Math.PI },
      };
    },
  },

  /* ------------------------------------------------------------------ house */
  // Briar House. Power out, coats wet. Six windows that do nothing until the cellar
  // breaker is thrown, and then all six at once.
  house: {
    landmark(api) {
      const k = kits();
      k.solid.box(1.1, 3.2, 1.1, 3.4, api.padY + 8.2, 1.6, C.brick);      // the chimney
      k.solid.box(1.5, 0.35, 1.5, 3.4, api.padY + 9.9, 1.6, C.stone);
      return { solid: k.solid.build(), glow: null, moving: null, glowColour: GLOW.lamp };
    },
    body(api) {
      const k = kits();
      const w = 11, d = 8.4, h = 6.6;
      shell(k.solid, api, 0, 0, w, d, h, 0, C.plaster, 2.2);
      k.solid.gable(w + 0.6, d + 0.6, api.padY + h, 2.4, 0, 0, 0, C.slate, 0);
      // porch
      k.solid.box(3.6, 0.22, 1.8, 0, api.padY + 2.9, -(d * 0.5 + 0.9), C.plank);
      for (const px of [-1.5, 1.5]) {
        k.solid.cyl(0.11, 0.11, 2.9, 6, px, api.padY + 1.45, -(d * 0.5 + 0.85), C.plank);
      }
      // six windows: two floors, three bays
      for (let f = 0; f < 2; f++) {
        for (let b = -1; b <= 1; b++) {
          if (f === 0 && b === 0) continue;                 // the doorway
          const y = api.padY + 1.7 + f * 2.7;
          k.glow.pane(1.05, 1.35, b * 3.1, y, -(d * 0.5 + 0.03), PANE_WINDOW, Math.PI, 0, 5, 6);
          sash(k.solid, 1.05, 1.35, b * 3.1, y, -(d * 0.5 + 0.03), C.dark, Math.PI, 0, 2, 2, 0.06, 0.08);
        }
      }
      k.glow.pane(1.05, 1.35, 0, api.padY + 4.4, d * 0.5 + 0.03, PANE_WINDOW, 0, 0, 5, 6);
      sash(k.solid, 1.05, 1.35, 0, api.padY + 4.4, d * 0.5 + 0.03, C.dark, 0, 0, 2, 2, 0.06, 0.08);
      // the cellar breaker on the gable end — the claim
      const c = api.site.claim;
      k.solid.box(0.5, 0.7, 0.24, c.dx, api.padY + 1.25, c.dz, C.metal);
      k.solid.box(0.16, 0.16, 0.34, c.dx, api.padY + 1.25, c.dz - 0.22, C.rust);
      // the briar: a dead hedge along the road side
      for (let i = 0; i < 9; i++) {
        const a = api.rng.range(-1, 1);
        k.solid.cyl(0.05, 0.09, api.rng.range(1.2, 2.1), 5,
          -6 + i * 1.5, api.padY + 0.7, -(d * 0.5 + 3.4) + a * 0.5, C.wood, 0, a * 0.3, a * 0.4);
      }
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
    },
  },

  /* ------------------------------------------------------------------ works */
  // The Weeping Mine and its ore works. The stacks are one of the five horizon reads:
  // ember tops that breathe. The headframe wheel turns only once the winding house has
  // power, which is the claim.
  works: {
    landmark(api) {
      const k = kits();
      // two stacks, 46 m and 38 m
      k.solid.tube(1.5, 2.4, 46, 12, -13, api.padY + 23, 8, C.brick);
      k.solid.tube(1.3, 2.0, 38, 12, -19.5, api.padY + 19, 3, C.brick);
      api.emit({ kind: 'circle', x: -13, z: 8, r: 2.5, y0: api.padY, y1: api.padY + 46, tag: 'stone' });
      api.emit({ kind: 'circle', x: -19.5, z: 3, r: 2.1, y0: api.padY, y1: api.padY + 38, tag: 'stone' });
      // headframe
      lattice(k.solid, api, 8, -6, 3.2, 1.6, 22, 5, C.rust, 'metal');
      k.solid.box(7.4, 0.5, 0.5, 8, api.padY + 22.4, -6, C.rust);
      // The ember caps. THESE USED TO BE HORIZONTAL QUADS and that is a horizon read you
      // can only see from a helicopter: a flat plane at 46 m, viewed from a road 2 km away
      // at an elevation of one degree, is edge-on and contributes nothing. Measured, the
      // stacks' whole per-frame luminance delta at 2 km was 9.4 against a gate of 12.
      // A short vertical cylinder has the same projected area from EVERY bearing, which is
      // what a thing on the skyline has to have. 4.2 m and 3.6 m across, as the caps were.
      k.glow.cyl(2.1, 2.1, 4.4, 10, -13, api.padY + 45.4, 8, [1, 1, 1]);
      k.glow.cyl(1.8, 1.8, 3.8, 10, -19.5, api.padY + 37.6, 3, [1, 1, 1]);
      // the winding wheel: authored around its own pivot so places.js can turn it
      const wk = new Kit();
      wk.tube(3.3, 3.3, 0.34, 16, 0, 0, 0, C.rust, 0, Math.PI * 0.5);
      for (let i = 0; i < 6; i++) {
        wk.box(6.4, 0.22, 0.22, 0, 0, 0, C.rust, 0, 0, (i / 6) * Math.PI);
      }
      return {
        solid: k.solid.build(), glow: k.glow.build(), glowColour: GLOW.ember,
        moving: [{ geo: wk.build(), colour: null, role: 'wheel', x: 8, y: api.padY + 22.4, z: -6, rate: 0.9 }],
      };
    },
    body(api) {
      const k = kits();
      // winding house
      shell(k.solid, api, 12.5, -8, 12, 9, 5.4, 0, C.brick, 2.6);
      k.solid.gable(12.6, 9.6, api.padY + 5.4, 1.5, 12.5, 0, -8, C.slate, 0);
      k.glow.pane(2.6, 1.2, 12.5, api.padY + 3.0, -12.6, PANE_WINDOW, Math.PI, 0, 8, 6);
      sash(k.solid, 2.6, 1.2, 12.5, api.padY + 3.0, -12.6, C.dark, Math.PI, 0, 3, 2, 0.07, 0.09);
      // the breaker cabinet — the claim
      const c = api.site.claim;
      k.solid.box(0.9, 1.5, 0.4, c.dx, api.padY + 0.75, c.dz, C.metal);
      // ore bins, a conveyor, and the collar of the shaft
      // ROUND 13: the ore bins hold a body (standable), and a 1.5 m ore step against the first
      // bin makes them a 1.5 + 1.5 stack as well as a 3.0 m fling — "more areas to get up to".
      for (let i = 0; i < 3; i++) {
        k.solid.box(4.2, 3.0, 4.2, -2 + i * 5.0, api.padY + 1.5, 12, C.rust);
        api.emit({
          kind: 'obb', x: -2 + i * 5.0, z: 12, halfX: 2.1, halfZ: 2.1, yaw: 0,
          y0: api.padY, y1: api.padY + 3.0, tag: 'metal', standable: true,
        });
      }
      k.solid.box(2.4, 1.5, 1.6, -2, api.padY + 0.75, 9.1, C.dark);
      api.emit({
        kind: 'obb', x: -2, z: 9.1, halfX: 1.2, halfZ: 0.8, yaw: 0,
        y0: api.padY - 0.2, y1: api.padY + 1.5, tag: 'stone', standable: true,
      });
      k.solid.box(0.7, 0.35, 21, 8, api.padY + 6.2, 2.5, C.rust, 0, -0.22);
      k.solid.box(6.5, 0.6, 6.5, 8, api.padY + 0.3, -6, C.dark);
      // slag: a low ash ridge that says this place burned for a century. Out at 16-26 m
      // these sit past the level core of the works disc, so they are grounded on the real
      // heightfield and buried 0.9 m into it — a slag heap has no visible base — and each
      // one emits its own collider as it is built. A 3 m mound you walk through is the
      // working-but-wrong failure this file's header is about.
      for (let i = 0; i < 7; i++) {
        const a = api.rng.range(0, TAU), r = api.rng.range(16, 26);
        const cr = api.rng.range(2.4, 4.6), ch = api.rng.range(1.6, 3.4);
        const lx = Math.cos(a) * r, lz = Math.sin(a) * r;
        const gy = groundY(api, lx, lz);
        k.solid.cone(cr, ch, 7, lx, gy + ch * 0.5 - 0.9, lz, C.ash);
        api.emit({
          kind: 'circle', x: lx, z: lz, r: cr * 0.80,
          y0: gy - 0.3, y1: gy + ch - 0.9, tag: 'stone', standable: true,
        });
      }
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
    },
  },

  /* ------------------------------------------------------------------ relay */
  // A 62 m lattice mast with a red aviation lamp. Claim it and the lamp goes white and
  // starts blinking — the one state change in the county you can check from anywhere.
  relay: {
    landmark(api) {
      const k = kits();
      // ART 4.1 — SIZE. Measured unoccluded at 2 km, the mast's whole silhouette owned
      // TWENTY-ONE pixels of a 1600x900 frame: three columns by eleven rows, and most of
      // that is holes. A 62 m mast on a 5.2 m base is spindlier than any real one; 8 m
      // across the feet, 2.8 across the head, plus the three maintenance platforms a mast
      // that size actually carries, is both truer and the cheapest width there is.
      lattice(k.solid, api, 0, 0, 5.0, 2.0, 62, 12, C.metal, 'metal');
      // FIVE platforms, each with an ice skirt. Measured: with three thin decks the mast
      // covered 98 px of a 21 x 41 bounding box at 2 km — eleven per cent, because a 0.30 m
      // deck is a fifth of a pixel tall at that range and four 0.3 m legs are half a pixel
      // wide each. A lattice is mostly holes and the holes are what you measure. The skirt
      // is a metre of solid, which is a pixel, which is the difference.
      for (const f of [0.18, 0.36, 0.54, 0.72, 0.88]) {
        const y = api.padY + 62 * f;
        const r = 5.0 + (2.0 - 5.0) * f + 1.4;      // the leg spread at that height, plus a lip
        k.solid.cyl(r, r, 0.34, 12, 0, y, 0, C.metal);
        k.solid.tube(r * 0.94, r * 0.94, 1.05, 12, 0, y + 0.62, 0, C.metal);
      }
      // three guy wires, thin enough to read as wires rather than pipes. ROUND 13: they run
      // from the mast at 42 m DOWN to a concrete anchor 21 m out. The two tilts used to be
      // applied the wrong way round, so every wire rose from the foot to a point floating
      // 21 m out at 42 m (measured: 30 endpoint vertices at the foot, 42 at y 42, r 21).
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + 0.4;
        const gx = Math.cos(a) * 21, gz = Math.sin(a) * 21;
        const gy = api.heightAt(api.wx(gx, gz), api.wz(gx, gz)) - api.padY;
        const ay = gy + 0.55;                              // the anchor's eye
        const dx = gx, dy = ay - 42, dz = gz;
        const len = Math.hypot(dx, dy, dz);
        const g = new THREE.CylinderGeometry(0.035, 0.035, len, 4);
        _wireUp.set(0, 1, 0); _wireDir.set(dx / len, dy / len, dz / len);
        g.applyQuaternion(_wireQ.setFromUnitVectors(_wireUp, _wireDir));
        g.translate(gx * 0.5, api.padY + (42 + ay) * 0.5, gz * 0.5);
        k.solid.push(g, C.metal);
        // and the block it is pinned to, standable, knee high
        k.solid.box(0.9, 0.7, 0.9, gx, api.padY + gy + 0.25, gz, C.ash);
        api.emit({
          kind: 'obb', x: gx, z: gz, halfX: 0.45, halfZ: 0.45, yaw: 0,
          y0: api.padY + gy - 0.3, y1: api.padY + gy + 0.6, tag: 'stone', standable: true,
        });
      }
      // dish
      k.solid.cone(2.6, 1.5, 10, 2.6, api.padY + 34, 0, C.plaster, 0, 0, Math.PI * 0.5);
      // The aviation lamp. A HORIZONTAL QUAD at 62.8 m is edge-on to every road in the
      // county and it measured a 2.8 luminance delta over four seconds — the blink DESIGN
      // section 2 names as a horizon read was invisible. A vertical cylinder reads the same
      // from every bearing, which is the only thing a skyline light may be.
      k.glow.cyl(2.0, 2.0, 3.6, 10, 0, api.padY + 63.1, 0, [1, 1, 1]);
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.red };
    },
    body(api) {
      const k = kits();
      // the pad, widened with the mast's feet (they now stand 4.0 m out, not 2.6)
      k.solid.box(11.6, 0.4, 11.6, 0, api.padY + 0.2, 0, C.ash);
      // ROUND 13: the slab has the collider its picture promised. With the mast's tube gone
      // the body would otherwise stand shin-deep inside the drawn concrete.
      api.emit({
        kind: 'obb', x: 0, z: 0, halfX: 5.8, halfZ: 5.8, yaw: 0,
        y0: api.padY - 0.3, y1: api.padY + 0.4, tag: 'stone', standable: true,
      });
      shell(k.solid, api, -7.5, 6.5, 6, 5, 3.0, 0, C.plaster, 2.0);
      k.solid.gable(6.4, 5.4, api.padY + 3.0, 0.7, -7.5, 0, 6.5, C.slate, 0);
      gableFloor(api, -7.5, 6.5, 6.4, 5.4, api.padY + 3.0, 0.7, 0);
      smallShellRoute(k.solid, api, -7.5, 6.5, 6, 5, 3.0, 0);
      const c = api.site.claim;
      k.solid.box(1.2, 1.7, 0.6, c.dx, api.padY + 0.85, c.dz, C.metal);
      k.solid.quad(0.9, 1.2, c.dx, api.padY + 0.95, c.dz - 0.32, C.dark);
      api.emit({
        kind: 'obb', x: c.dx, z: c.dz, halfX: 0.6, halfZ: 0.3, yaw: 0,
        y0: api.padY, y1: api.padY + 1.7, tag: 'metal',
      });
      // the chain fence that never kept anyone out
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        k.solid.cyl(0.06, 0.06, 1.9, 5, Math.cos(a) * 14, api.padY + 0.95, Math.sin(a) * 14, C.metal);
      }
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
    },
  },

  /* -------------------------------------------------------------- cathedral */
  // The far physical landmark from the first frame. 77 m to the tip of the spire, on the highest
  // ground on the north arc, and the rose window is the lamp.
  cathedral: {
    landmark(api) {
      const k = kits();
      const towerH = 34, spireH = 43;   // 77 m total, DESIGN section 2
      k.solid.box(11, towerH, 11, 0, api.padY + towerH * 0.5, 0, C.stone);
      // corner pinnacles
      for (let i = 0; i < 4; i++) {
        const sx = (i & 1) ? 1 : -1, sz = (i & 2) ? 1 : -1;
        k.solid.box(1.5, 5.0, 1.5, sx * 4.8, api.padY + towerH + 2.5, sz * 4.8, C.stone);
        k.solid.cone(1.1, 3.4, 5, sx * 4.8, api.padY + towerH + 6.7, sz * 4.8, C.slate);
      }
      k.solid.cone(7.2, spireH, 8, 0, api.padY + towerH + spireH * 0.5, 0, C.slate);
      api.emit({
        kind: 'obb', x: 0, z: 0, halfX: 5.5, halfZ: 5.5, yaw: 0,
        y0: api.padY - 0.3, y1: api.padY + towerH, tag: 'wall',
      });
      // the rose window, high on the west front, facing the road
      // 29 square metres of flat [1, 1, 1] was the second-largest slab in the county.
      // A rose window is a WHEEL: bright at the boss, dying at the rim, and read through
      // its own stone tracery. Eight spokes and two rings, all on the solid kit, standing
      // proud of the glass so matGlow's depthWrite:false lets them cut it up.
      k.glow.pane(5.4, 5.4, 0, api.padY + 22, -5.7, PANE_ROSE, Math.PI, 0, 12, 12);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI;
        const g = new THREE.BoxGeometry(5.4, 0.20, 0.16);
        g.rotateZ(a); g.translate(0, 0, 0.10); g.rotateY(Math.PI);
        g.translate(0, api.padY + 22, -5.7);
        k.solid.push(g, C.stone);
      }
      for (const rr of [1.05, 2.05]) {
        const g = new THREE.TorusGeometry(rr, 0.11, 4, 20);
        g.translate(0, 0, 0.10); g.rotateY(Math.PI);
        g.translate(0, api.padY + 22, -5.7);
        k.solid.push(g, C.stone);
      }
      // ART 4.2: the cathedral was the one horizon read with NOTHING that moves. One
      // guttering brazier at the tip of the spire, on the shared additive material, with no
      // new light and no new program. It is authored as its own mesh (role 'brazier') and
      // not merged into `glow`, because the rose window is YOUR lamp and comes up when you
      // claim the place, while this fire is somebody else's and burns from the first frame.
      // A vertical cylinder, for the same reason as the mast lamp: a skyline light has to
      // read from every bearing. The iron basket it sits in is part of the silhouette.
      const bz = new Kit();
      bz.cyl(2.4, 2.4, 4.6, 10, 0, 0, 0, [1, 1, 1]);
      k.solid.tube(2.7, 1.6, 2.4, 8, 0, api.padY + towerH + spireH - 1.2, 0, C.metal);
      return {
        solid: k.solid.build(), glow: k.glow.build(), glowColour: GLOW.lamp,
        moving: [{
          geo: bz.build(), colour: GLOW.lamp, role: 'brazier',
          x: 0, y: api.padY + towerH + spireH + 1.4, z: 0, rate: 0,
        }],
      };
    },
    body(api) {
      const k = kits();
      // nave running north from the tower. ROUND 6 (lane D2's route audit): 18 m deep, not
      // 30. MEASURED 2026-09-03: the road runs past this yard at local z 28.9 and a 30 m
      // nave from z 5 reached z 35 - the loop road passed THROUGH the nave between its side
      // walls (tests/shots/r6-D2-cathedral-road.png), and its back wall stood on the far
      // verge. At 18 m it stops at z 23, on the pad, short of the bank the road sits above.
      const nw = 17, nd = 18, nh = 15;
      shell(k.solid, api, 0, 14, nw, nd, nh, 0, C.stone, 3.0);
      k.solid.gable(nw + 1.0, nd + 1.0, api.padY + nh, 4.2, 0, 0, 14, C.slate, 0);
      // buttresses down both flanks
      for (let i = 0; i < 3; i++) {
        const bz = 8 + i * 6.5;
        for (const sx of [-1, 1]) {
          k.solid.box(1.5, 9.0, 3.0, sx * (nw * 0.5 + 0.9), api.padY + 4.5, bz, C.stone);
          api.emit({
            kind: 'obb', x: sx * (nw * 0.5 + 0.9), z: bz,
            halfX: 0.8, halfZ: 1.5, yaw: 0, y0: api.padY, y1: api.padY + 9.0, tag: 'wall',
          });
        }
      }
      // lancet windows
      for (let i = 0; i < 2; i++) {
        for (const sx of [-1, 1]) {
          const ly = sx > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          k.glow.pane(1.0, 3.4, sx * (nw * 0.5 + 0.03), api.padY + 7.5, 11 + i * 6.5,
            PANE_WINDOW, ly, 0, 4, 10);
          sash(k.solid, 1.0, 3.4, sx * (nw * 0.5 + 0.03), api.padY + 7.5, 11 + i * 6.5,
            C.stone, ly, 0, 2, 4, 0.08, 0.09);
        }
      }
      // the brazier at the west door — the claim
      const c = api.site.claim;
      k.solid.cyl(0.55, 0.34, 1.0, 8, c.dx, api.padY + 0.5, c.dz, C.rust);
      k.glow.pane(0.9, 0.9, c.dx, api.padY + 1.05, c.dz, PANE_LAMP, 0, -Math.PI * 0.5, 8, 8);
      // steps
      for (let i = 0; i < 3; i++) {
        k.solid.box(13 - i * 1.2, 0.24, 1.1, 0, api.padY + 0.12 + i * 0.24, -8.5 - i * 1.1, C.stone);
      }
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.ember };
    },
  },

  /* ----------------------------------------------------------------- chapel */
  chapel: {
    landmark(api) {
      const k = kits();
      // This used to be one 6 x 19 x 6 solid box. The nave's real doorway is on -Z at
      // z=-2, exactly inside that box's footprint (-7..-1), so the bell tower sealed the
      // only entrance while the claim fixture sat tantalisingly beside it. Build the same
      // silhouette as four walls with aligned front/back doors: the tower is now a porch
      // through which the player can actually reach the dressed chapel interior.
      const base = api.padY - 0.3, top = api.padY + 19, H = top - base;
      const sideX = 2.72, wallT = 0.56, door = 2.4;
      for (const x of [-sideX, sideX]) {
        k.solid.box(wallT, H, 6.0, x, (top + base) * 0.5, -4, C.stone);
        api.emit({ kind: 'obb', x, z: -4, halfX: wallT * 0.5, halfZ: 3.0, yaw: 0, y0: base, y1: top, tag: 'wall' });
      }
      const pierW = (6.0 - door) * 0.5;
      for (const z of [-6.72, -1.28]) {
        for (const x of [-(door + pierW) * 0.5, (door + pierW) * 0.5]) {
          k.solid.box(pierW, H, wallT, x, (top + base) * 0.5, z, C.stone);
          api.emit({ kind: 'obb', x, z, halfX: pierW * 0.5, halfZ: wallT * 0.5, yaw: 0, y0: base, y1: top, tag: 'wall' });
        }
        // high lintel, leaving a 2.8 m clear doorway beneath it
        k.solid.box(door, 16.2, wallT, 0, api.padY + 10.9, z, C.stone);
        api.emit({ kind: 'obb', x: 0, z, halfX: door * 0.5, halfZ: wallT * 0.5, yaw: 0,
          y0: api.padY + 2.8, y1: top, tag: 'wall' });
      }
      k.solid.cone(4.2, 5.4, 4, 0, api.padY + 21.7, -4, C.slate);
      k.glow.pane(1.3, 2.0, 0, api.padY + 14, -7.05, PANE_WINDOW, Math.PI, 0, 5, 8);
      sash(k.solid, 1.3, 2.0, 0, api.padY + 14, -7.05, C.stone, Math.PI, 0, 2, 3, 0.07, 0.09);
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
    },
    body(api) {
      const k = kits();
      shell(k.solid, api, 0, 5, 9, 14, 6.0, 0, C.stone, 2.4);
      k.solid.gable(9.6, 14.6, api.padY + 6.0, 2.2, 0, 0, 5, C.slate, 0);
      for (let i = 0; i < 3; i++) {
        for (const sx of [-1, 1]) {
          const cy = sx > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          k.glow.pane(0.8, 2.2, sx * 4.53, api.padY + 3.2, 1.5 + i * 3.6, PANE_WINDOW, cy, 0, 4, 8);
          sash(k.solid, 0.8, 2.2, sx * 4.53, api.padY + 3.2, 1.5 + i * 3.6, C.stone, cy, 0, 1, 3, 0.07, 0.09);
        }
      }
      // the hearth in the porch — the claim
      const c = api.site.claim;
      k.solid.box(1.6, 1.0, 0.8, c.dx, api.padY + 0.5, c.dz, C.stone);
      k.glow.pane(1.2, 0.7, c.dx, api.padY + 0.55, c.dz - 0.42, PANE_LAMP, Math.PI, 0, 8, 6);
      yardWall(k.solid, api, 19, 1.5, -Math.PI * 0.5, C.stone);
      // the yard: eleven stones, leaning the way old ones do
      for (let i = 0; i < 11; i++) {
        const a = api.rng.range(0, TAU), r = api.rng.range(9, 16.5);
        const lean = api.rng.range(-0.16, 0.16);
        k.solid.box(0.62, api.rng.range(0.8, 1.4), 0.16,
          Math.cos(a) * r, api.padY + 0.55, Math.sin(a) * r, C.stone, api.rng.range(0, TAU), 0, lean);
      }
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.ember };
    },
  },

  /* ---------------------------------------------------------------- steeple */
  // Gallowsfen. A church that went under and left its steeple. It leans, and the lamp in
  // the belfry is the claim: you have to stand in the water and shoot it.
  steeple: {
    landmark(api) {
      const k = kits();
      const lean = 0.13;
      k.solid.box(4.6, 18, 4.6, 0, api.padY + 8.4, 0, C.stone, 0, 0, lean);
      k.solid.cone(3.4, 6.4, 4, -2.2, api.padY + 19.9, 0, C.slate, 0, 0, lean);
      api.emit({
        kind: 'circle', x: 0, z: 0, r: 3.0,
        y0: api.padY - 0.4, y1: api.padY + 15, tag: 'wall',
      });
      // the hanging lamp in the open belfry
      const c = api.site.claim;
      // the bracket reaches out of the leaning tower (which has drifted -1.74 m in x by
      // this height) and the lamp hangs at the end of it, AT the claim point.
      k.solid.box(3.0, 0.12, 0.12, c.dx + 1.5, api.padY + c.dy + 1.05, c.dz, C.metal);
      k.solid.cyl(0.04, 0.04, 0.9, 4, c.dx, api.padY + c.dy + 0.55, c.dz, C.metal);
      k.glow.pane(0.8, 0.8, c.dx, api.padY + c.dy, c.dz, PANE_LAMP, 0, -Math.PI * 0.5, 8, 8);
      // A SHOOT claim made of additive geometry cannot be shot: the bullet goes straight
      // through and combat reports the hit on the ground 40 m behind it. The target is a
      // real collider, which also makes the lamp CLANG (combat.js:61-63 maps tag 'metal'
      // to a metal surface and a metal spark).
      api.emit({
        kind: 'circle', x: c.dx, z: c.dz, r: 0.55,
        y0: api.padY + c.dy - 0.55, y1: api.padY + c.dy + 0.55, tag: 'metal',
      });
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.wisp };
    },
    body(api) {
      const k = kits();
      // The whole of Gallowsfen's body lies 6-26 m out, and its disc is level only to
      // 21 m, so every loop below stands on groundY rather than on the pad.
      // the drowned nave: three broken wall stubs sticking out of black water
      for (let i = 0; i < 6; i++) {
        const lz = 6 + i * 3.4;
        const hh = api.rng.range(0.7, 2.3);
        for (const sx of [-1, 1]) {
          if (api.rng.next() < 0.25) continue;
          const lx = sx * 4.4;
          const gy = groundY(api, lx, lz);
          k.solid.box(3.0, hh + 0.4, 0.4, lx, gy + hh * 0.5 - 0.2, lz, C.stone);
          api.emit({
            kind: 'obb', x: lx, z: lz, halfX: 1.5, halfZ: 0.2, yaw: 0,
            y0: gy - 0.3, y1: gy + hh, tag: 'wall',
          });
        }
      }
      // the boardwalk out to it — the only footing that is not mud
      for (let i = 0; i < 14; i++) {
        const lz = -22 + i * 1.7;
        const lx = api.rng.range(-0.3, 0.3);
        k.solid.box(2.0, 0.14, 1.5, lx, groundY(api, lx, lz) + 0.22, lz, C.plank,
          api.rng.range(-0.05, 0.05));
      }
      // reeds, dead birch
      for (let i = 0; i < 34; i++) {
        const a = api.rng.range(0, TAU), r = api.rng.range(7, 24);
        const h = api.rng.range(1.0, 2.2);
        const lx = Math.cos(a) * r, lz = Math.sin(a) * r;
        k.solid.cyl(0.03, 0.05, h, 4, lx, groundY(api, lx, lz) + h * 0.5 - 0.25, lz, C.wood, 0,
          api.rng.range(-0.2, 0.2), api.rng.range(-0.2, 0.2));
      }
      for (let i = 0; i < 5; i++) {
        const a = api.rng.range(0, TAU), r = api.rng.range(12, 26);
        const h = api.rng.range(5, 8.5);
        const lx = Math.cos(a) * r, lz = Math.sin(a) * r;
        const gy = groundY(api, lx, lz);
        k.solid.cyl(0.10, 0.20, h, 6, lx, gy + h * 0.5 - 0.2, lz, C.plaster);
        api.emit({
          kind: 'circle', x: lx, z: lz, r: 0.24,
          y0: gy - 0.3, y1: gy + h, tag: 'tree',
        });
      }
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.wisp };
    },
  },

  /* ------------------------------------------------------------- lighthouse */
  // The Drowned Light. Light it and its beam is the county's compass: 80 m of it,
  // sweeping at 0.22 rad/s (DESIGN section 2, PALEHOLLOW landmarks.js).
  lighthouse: {
    // ROUND 6 (Alex, playtest 5): "And I can't even go into the lighthouse to load a cool
    // environment. Or not load by walk up stairs." The tower was a closed tube on a solid
    // circle collider with the claim at a door slab outside its foot. It is a CLIMB now:
    // a doorway at the foot facing the road, 81 wedge treads spiralling up the inside of
    // the tower around a central post to the lamp room on the gallery, and a low wall up
    // there you can look over. The claim is the lamp (placedata claim.dy 36.7).
    //
    // The numbers that make it walkable on the shipped controller, measured rather than
    // assumed: a tread RISE of 0.453 m (36.7 / 81) is under CFG.player.STEP_UP (0.52) so
    // it is a step going up, and under collision.js GROUND_SNAP (0.48) so it is a step
    // going DOWN as well — a 0.5 m riser is a fall on the way back. 14 treads a turn is
    // 6.3 m of rise a turn, which is the headroom over any tread. The tower's wall is a
    // ring of OBB segments in three height bands (collision has no hollow circle), the
    // gallery floor is a ring of standable segments, and the lamp-room floor is a 144-deg
    // sector so the stair has a full head-height opening on both ascent and descent.
    landmark(api) {
      const k = kits();
      // ART 4.1 — SIZE. 28 px at 2 km. The tower keeps its 3.6 m foot and gains height
      // and a broader head instead: 36 m to the gallery, which is an ordinary size for a
      // light that is supposed to be seen from the far side of a county.
      const H = 36;
      const F = H + 0.7;                       // the gallery / lamp-room floor
      const wallR = (y) => 3.6 - 0.5 * clamp(y / H, 0, 1);     // the tube's taper
      // the doorway faces the road: places.js sends local +Z to the road point (its
      // comment says -Z; the arithmetic and tests/manor.mjs say +Z), so the door is at +Z
      const DOOR_A = Math.PI * 0.5;
      const DOOR_HALF = 0.7 / 3.6;             // half-angle of a 1.4 m doorway at the foot
      const DOOR_H = 2.6;
      // tangential OBB yaw for a segment whose centre sits at angle `a`: local +x must
      // be the tangent (-sin a, cos a). Three's rotateY(t) sends +x to (cos t, -sin t),
      // so t = -(a + PI/2). MEASURED 2026-09-03: rotateY(-a) is RADIAL, not tangential.
      const tangYaw = (a) => -(a + Math.PI * 0.5);
      // Three's CylinderGeometry measures theta from +z toward +x: theta = PI/2 - a.
      const theta = (a) => Math.PI * 0.5 - a;

      // ---- the tower: a sector tube at the foot with the doorway cut out, a full tube above
      {
        const g = new THREE.CylinderGeometry(wallR(2.8), 3.6, 2.8, 16, 1, true,
          theta(DOOR_A) + DOOR_HALF, TAU - 2 * DOOR_HALF);
        g.translate(0, api.padY + 1.4, 0);
        k.solid.push(g, C.plaster);
        k.solid.tube(3.1, wallR(2.8), H - 2.8, 16, 0, api.padY + 2.8 + (H - 2.8) * 0.5, 0, C.plaster);
        // THE INSIDE IS DARK. The tube is one DoubleSide surface, so its inner face wore
        // the same 0.265 plaster as the outside and the stairwell measured as a white
        // room under the torch (tests/shots/r6-D2-light-stair-foot.png, first cut). A
        // liner 6 cm inside it in C.dark is what a stairwell nobody has whitewashed in
        // thirty years looks like, and it is what the torch has to find its way up.
        const liner = new THREE.CylinderGeometry(wallR(2.8) - 0.06, 3.54, 2.8, 16, 1, true,
          theta(DOOR_A) + DOOR_HALF, TAU - 2 * DOOR_HALF);
        liner.translate(0, api.padY + 1.4, 0);
        k.solid.push(liner, C.dark);
        k.solid.tube(3.04, wallR(2.8) - 0.06, H - 2.8, 16, 0, api.padY + 2.8 + (H - 2.8) * 0.5, 0, C.dark);
        // the doorway: jambs and a lintel, so it reads as a doorway and not as a crack
        const dx = Math.cos(DOOR_A) * 3.5, dz = Math.sin(DOOR_A) * 3.5;
        const tx = -Math.sin(DOOR_A), tz = Math.cos(DOOR_A);
        for (const s of [-1, 1]) {
          k.solid.box(0.24, DOOR_H + 0.2, 0.6, dx + tx * s * 0.82, api.padY + DOOR_H * 0.5, dz + tz * s * 0.82, C.dark, tangYaw(DOOR_A));
        }
        k.solid.box(1.9, 0.32, 0.6, dx, api.padY + DOOR_H + 0.1, dz, C.dark, tangYaw(DOOR_A));
        // the door itself, hanging open outward beside the opening
        k.solid.box(1.4, 2.4, 0.1, dx + tx * 1.2 - 0.5 * Math.cos(DOOR_A), api.padY + 1.2, dz + tz * 1.2 - 0.5 * Math.sin(DOOR_A), C.wood, tangYaw(DOOR_A) + 1.2);
      }
      // ---- the wall colliders: 16 tangential segments in three bands, the doorway's
      //      segment in the lowest band replaced by its lintel
      {
        const N = 16;
        const bands = [[-0.3, 12], [12, 24], [24, H + 0.7]];
        for (const [b0, b1] of bands) {
          const r = wallR((b0 + b1) * 0.5);
          for (let i = 0; i < N; i++) {
            const a = (i / N) * TAU - Math.PI;
            let da = a - DOOR_A;
            while (da > Math.PI) da -= TAU;
            while (da < -Math.PI) da += TAU;
            const isDoor = b0 < 0 && Math.abs(da) < (Math.PI / N) * 0.99;
            api.emit({
              kind: 'obb', x: Math.cos(a) * r, z: Math.sin(a) * r, halfX: 0.72, halfZ: 0.25, yaw: tangYaw(a),
              y0: api.padY + (isDoor ? DOOR_H : b0), y1: api.padY + b1, tag: 'wall',
            });
          }
        }
      }
      // ---- the post, the treads and the handrail
      const N_TREADS = 81, PER_TURN = 14;
      const RISE = F / N_TREADS;                                  // 0.453
      const STEP_A = TAU / PER_TURN;
      const POST_R = 0.9;
      const A0 = DOOR_A + STEP_A;              // tread 1 is one step round from the doorway
      k.solid.cyl(POST_R, POST_R, F + 0.3, 12, 0, api.padY + (F - 0.3) * 0.5, 0, C.dark);
      api.emit({ kind: 'circle', x: 0, z: 0, r: POST_R, y0: api.padY - 0.3, y1: api.padY + F, tag: 'metal' });
      for (let i = 1; i <= N_TREADS; i++) {
        const top = api.padY + RISE * i;
        const a = A0 + STEP_A * (i - 1);
        const rOut = wallR(RISE * i) - 0.3;
        const g = new THREE.CylinderGeometry(rOut, rOut, 0.22, 3, 1, false, theta(a) - STEP_A * 0.5, STEP_A);
        g.translate(0, top - 0.11, 0);
        k.solid.push(g, i % 2 ? C.metal : C.slate);
        // The collider runs from the post to the wall. At halfZ 0.55 adjacent treads
        // overlapped by more than a player's radius at 0.55. A narrower 0.42 keeps the
        // ascending body continuously supported; the lamp-room ceiling's explicit
        // non-climbable flag below is what prevents the false mantle on descent.
        const rc = (POST_R + rOut) * 0.5;
        api.emit({
          kind: 'obb', x: Math.cos(a) * rc, z: Math.sin(a) * rc,
          halfX: (rOut - POST_R) * 0.5, halfZ: 0.42, yaw: -a,
          y0: top - 0.22, y1: top, tag: 'metal', standable: true,
        });
        // a handrail on the post side, 0.9 m over each tread
        const hr = POST_R + 0.22;
        k.solid.box(0.06, 0.06, 0.62, Math.cos(a) * hr, top + 0.9, Math.sin(a) * hr, C.rust, tangYaw(a));
        if (i % 3 === 0) k.solid.box(0.04, 0.9, 0.04, Math.cos(a) * hr, top + 0.45, Math.sin(a) * hr, C.rust);
      }
      // ---- the gallery: an annulus on the tower head with a low wall round its rim
      {
        const ring = new THREE.RingGeometry(2.9, 4.6, 24, 1);
        ring.rotateX(-Math.PI * 0.5);
        ring.translate(0, api.padY + F, 0);
        k.solid.push(ring, C.metal);
        const under = new THREE.RingGeometry(2.9, 4.6, 24, 1);
        under.rotateX(Math.PI * 0.5);
        under.translate(0, api.padY + H, 0);
        k.solid.push(under, C.dark);
        k.solid.tube(4.6, 4.6, 0.7, 24, 0, api.padY + H + 0.35, 0, C.metal);      // the rim
        k.solid.tube(4.6, 4.6, 1.0, 24, 0, api.padY + F + 0.5, 0, C.metal);        // the low wall
        const N = 12;
        for (let i = 0; i < N; i++) {
          const a = (i / N) * TAU;
          api.emit({
            kind: 'obb', x: Math.cos(a) * 3.75, z: Math.sin(a) * 3.75, halfX: 1.05, halfZ: 0.85, yaw: tangYaw(a),
            y0: api.padY + H, y1: api.padY + F, tag: 'metal', standable: true,
          });
          api.emit({
            kind: 'obb', x: Math.cos(a) * 4.45, z: Math.sin(a) * 4.45, halfX: 1.25, halfZ: 0.15, yaw: tangYaw(a),
            y0: api.padY + F, y1: api.padY + F + 1.0, tag: 'metal',
          });
        }
      }
      // ---- the lamp room: a 2.9 m tube on the gallery with a doorway onto it, a floor
      //      that is a 144-degree sector (the stair arrives through the rest), the lamp on
      //      its pedestal, and the cap
      const LAMP_DOOR_A = A0 + STEP_A * (N_TREADS - 1) + Math.PI * 0.55;   // across the room from the arrival
      const ARRIVE_A = A0 + STEP_A * (N_TREADS - 1);
      {
        const gap = 0.55 / 2.9;
        const g = new THREE.CylinderGeometry(2.9, 2.9, 3.2, 16, 1, true, theta(LAMP_DOOR_A) + gap, TAU - 2 * gap);
        g.translate(0, api.padY + F + 1.6, 0);
        k.solid.push(g, C.metal);
        k.solid.cone(3.5, 2.4, 12, 0, api.padY + F + 3.2 + 1.2, 0, C.slate);
        const N = 12;
        for (let i = 0; i < N; i++) {
          const a = (i / N) * TAU;
          let da = a - LAMP_DOOR_A;
          while (da > Math.PI) da -= TAU;
          while (da < -Math.PI) da += TAU;
          if (Math.abs(da) < (Math.PI / N) * 0.99) continue;
          api.emit({
            kind: 'obb', x: Math.cos(a) * 2.9, z: Math.sin(a) * 2.9, halfX: 0.8, halfZ: 0.15, yaw: tangYaw(a),
            y0: api.padY + F, y1: api.padY + F + 3.2, tag: 'metal',
          });
        }
        // The floor begins far enough past the final tread to leave a body-width stairwell.
        // At the old +0.14 rad the clear arc was only 0.22-0.28 m across at walking radius:
        // a body could step UP onto the floor but could not get back into the stairwell.
        // +0.50 leaves roughly 0.9 m for the 0.72 m capsule and makes the tower two-way.
        // A 144-degree floor leaves eight tread angles open. The former 216-degree floor
        // caught the descending player's head on its fourth tread and pushed the body back
        // upstairs; even a half-room floor met the head before it cleared the slab.
        const S0 = ARRIVE_A + 0.50, SPAN = TAU * 0.4;
        const fl = new THREE.CylinderGeometry(2.9, 2.9, 0.2, 14, 1, false, theta(S0 + SPAN), SPAN);
        fl.translate(0, api.padY + F - 0.1, 0);
        k.solid.push(fl, C.metal);
        const NW = 9;
        for (let i = 0; i < NW; i++) {
          const a = S0 + SPAN * (i + 0.5) / NW;
          api.emit({
            kind: 'obb', x: Math.cos(a) * 1.45, z: Math.sin(a) * 1.45, halfX: 1.45, halfZ: 2.9 * Math.tan(SPAN / NW * 0.5), yaw: -a,
            // It is a floor from above and a ceiling from below. Letting the generic ledge
            // probe call it climbable made held-forward mantle back upstairs on every lap.
            y0: api.padY + F - 0.2, y1: api.padY + F, tag: 'metal', standable: true, climbable: false,
          });
        }
        // the rail along the floor's far edge, over the well (the open side)
        const ra = S0 + SPAN;
        k.solid.box(2.0, 0.06, 0.06, Math.cos(ra) * 1.9, api.padY + F + 1.0, Math.sin(ra) * 1.9, C.rust, -ra);
        for (const rr of [1.1, 1.9, 2.7]) k.solid.box(0.05, 1.0, 0.05, Math.cos(ra) * rr, api.padY + F + 0.5, Math.sin(ra) * rr, C.rust);
        api.emit({
          kind: 'obb', x: Math.cos(ra) * 1.9, z: Math.sin(ra) * 1.9, halfX: 1.0, halfZ: 0.08, yaw: -ra,
          y0: api.padY + F, y1: api.padY + F + 1.05, tag: 'metal',
        });
        // the pedestal: 0.7 m, one step too tall to climb, so the lamp is looked at
        k.solid.cyl(0.8, 0.9, 0.7, 12, 0, api.padY + F + 0.35, 0, C.dark);
        api.emit({ kind: 'circle', x: 0, z: 0, r: 0.9, y0: api.padY + F - 0.1, y1: api.padY + F + 0.7, tag: 'metal' });
      }
      // The lamp itself: a vertical cylinder in the lamp room, not the horizontal quad
      // that was there before. A flat plate at 32 m is edge-on from every road in the
      // county — the same fault as the mast lamp and the ember caps.
      k.glow.cyl(1.4, 1.4, 2.0, 10, 0, api.padY + F + 1.9, 0, [1, 1, 1]);
      // THE BEAM. The old one was an 80 m open cone with a flat [1,1,1] vertex colour —
      // effectively a giant white triangular slab rotating over the road. Worse, its radii
      // were reversed after the Y->Z rotation, so it was 9 m wide AT THE LAMP. That is not
      // light in mist; it is a wind-turbine blade nailed to the lantern room.
      //
      // Two correctly tapered, axially faded skins now widen AWAY from the lens. Their
      // colours decay in the geometry itself, with a weak warm core inside a very faint
      // outer falloff. places.js still owns the one shared additive material, claim strength
      // and 0.22 rad/s sweep; there is no new light and no new moving system.
      const bk = new Kit();
      const beamSkin = (nearR, farR, len, gain, warm) => {
        // CylinderGeometry is +Y at radiusTop and -Y at radiusBottom. After rotateX(+90)
        // +Y becomes +Z, hence (farR, nearR): narrow at z=0, broad at z=len.
        const g = new THREE.CylinderGeometry(farR, nearR, len, 12, 12, true);
        const p = g.attributes.position, col = new Float32Array(p.count * 3);
        for (let i = 0; i < p.count; i++) {
          const t = clamp((p.getY(i) + len * 0.5) / len, 0, 1);
          // End at almost-black rather than zero so the last two rings interpolate softly.
          // The small sine breaks the mathematically perfect plate into mist-like bands.
          const band = 0.88 + 0.12 * Math.sin(t * Math.PI * 9.0);
          const v = (0.012 + gain * Math.pow(1 - t, 1.45)) * band;
          col[i * 3] = v;
          col[i * 3 + 1] = v * (warm ? 0.84 : 0.94);
          col[i * 3 + 2] = v * (warm ? 0.62 : 0.82);
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        g.rotateX(Math.PI * 0.5);
        g.translate(0, 0, len * 0.5);
        // Do not Kit.push(): it would replace the gradient with one flat colour.
        bk.parts.push(g);
      };
      beamSkin(0.22, 2.5, 68, 0.28, false);  // atmospheric outer falloff
      beamSkin(0.10, 0.95, 48, 0.55, true);  // narrow warm optical core
      return {
        solid: k.solid.build(), glow: k.glow.build(), glowColour: GLOW.white,
        moving: [{ geo: bk.build(), colour: GLOW.white, role: 'beam', x: 0, y: api.padY + F + 1.9, z: 0, rate: 0.22 }],
      };
    },
    body(api) {
      const k = kits();
      // the keeper's cottage
      shell(k.solid, api, 9, 3, 9, 6.5, 3.4, 0.3, C.plaster, 2.2);
      k.solid.gable(9.6, 7.0, api.padY + 3.4, 1.2, 9, 0, 3, C.slate, 0.3);
      gableFloor(api, 9, 3, 9.6, 7.0, api.padY + 3.4, 1.2, 0.3);
      smallShellRoute(k.solid, api, 9, 3, 9, 6.5, 3.4, 0.3);
      k.glow.pane(1.4, 1.0, 9 - 1.0, api.padY + 2.0, 3 - 3.4, PANE_WINDOW, Math.PI + 0.3, 0, 6, 5);
      sash(k.solid, 1.4, 1.0, 9 - 1.0, api.padY + 2.0, 3 - 3.4, C.dark, Math.PI + 0.3, 0, 2, 2, 0.07, 0.09);
      // ROUND 6: the claim is the lamp at the top of the stair (landmark). The door at the
      // foot is the tower's own doorway now, facing the road; nothing is claimed down here.
      // breakwater
      for (let i = 0; i < 22; i++) {
        const a = -0.9 + (i / 22) * 2.6;
        const r = 15 + Math.sin(i * 1.7) * 2.0;
        k.solid.box(api.rng.range(1.2, 2.4), api.rng.range(0.7, 1.6), api.rng.range(1.2, 2.2),
          Math.cos(a) * r, api.padY + 0.4, Math.sin(a) * r, C.dark, api.rng.range(0, TAU));
      }
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
    },
  },

  /* ------------------------------------------------------------------- mill */
  // The Hollow Mill. The sails read from 600 m and they turn whether or not the mill is
  // yours — a dead mill still turns in the wind. Claiming it lights the lamp.
  mill: {
    landmark(api) {
      const k = kits();
      // ART 4.1 — SIZE. Measured 21 px at 2 km and 110 px at 800 m, against a gate of 120,
      // and DESIGN section 2 says in as many words that "the sails read from 600 m". A
      // 17 m tower with a 22 m sail span made of 0.30 m sticks does not. This is a 20 m
      // tower with a 25 m span and sail frames wide enough to be a shape: still a tower
      // mill, still the smallest of the five majors, and now something on the skyline.
      const H = 20;
      k.solid.tube(2.8, 4.8, H, 12, 0, api.padY + H * 0.5, 0, C.stone);
      k.solid.cone(3.6, 3.6, 12, 0, api.padY + H + 1.8, 0, C.slate);          // the cap
      api.emit({
        kind: 'circle', x: 0, z: 0, r: 4.4,
        y0: api.padY - 0.3, y1: api.padY + H, tag: 'wall',
      });
      k.glow.pane(1.1, 1.5, 0, api.padY + 11, -3.85, PANE_WINDOW, Math.PI, 0, 5, 6);
      sash(k.solid, 1.1, 1.5, 0, api.padY + 11, -3.85, C.dark, Math.PI, 0, 2, 2, 0.07, 0.09);
      // sails: four arms, 25 m across, authored around the hub
      const sk = new Kit();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        const arm = new THREE.BoxGeometry(0.55, 12.8, 0.34);
        arm.translate(0, 6.4, 0);
        arm.rotateZ(a);
        sk.push(arm, C.plank);
        const sail = new THREE.BoxGeometry(3.3, 9.8, 0.14);
        sail.translate(1.85, 7.0, 0.24);
        sail.rotateZ(a);
        sk.push(sail, C.cloth);
      }
      sk.cyl(0.7, 0.7, 1.6, 8, 0, 0, 0, C.wood, 0, Math.PI * 0.5);
      return {
        solid: k.solid.build(), glow: k.glow.build(), glowColour: GLOW.lamp,
        moving: [{ geo: sk.build(), colour: null, role: 'sails', x: 0, y: api.padY + 17.2, z: -4.0, rate: 0.42 }],
      };
    },
    body(api) {
      const k = kits();
      // lean-to, millstones, a cart
      shell(k.solid, api, 7.5, 4.5, 7, 5, 2.8, 0.6, C.plank, 2.0);
      k.solid.gable(7.4, 5.4, api.padY + 2.8, 0.8, 7.5, 0, 4.5, C.slate, 0.6);
      gableFloor(api, 7.5, 4.5, 7.4, 5.4, api.padY + 2.8, 0.8, 0.6);
      smallShellRoute(k.solid, api, 7.5, 4.5, 7, 5, 2.8, 0.6);
      for (let i = 0; i < 3; i++) {
        k.solid.cyl(1.15, 1.15, 0.3, 12, -6 + i * 2.6, api.padY + 0.15, 7 + i * 0.7, C.stone);
      }
      const c = api.site.claim;
      k.solid.box(0.4, 0.9, 0.3, c.dx, api.padY + 0.45, c.dz, C.metal);
      k.solid.box(3.2, 0.2, 1.8, -4.5, api.padY + 0.7, -6, C.plank);
      for (const wx of [-5.9, -3.1]) {
        k.solid.tube(0.55, 0.55, 0.16, 10, wx, api.padY + 0.6, -6, C.wood, 0, 0, Math.PI * 0.5);
      }
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
    },
  },

  /* --------------------------------------------------------------- cemetery */
  // The Garden of Rest. An arch you see from the road, a walled acre, and a lamp on the
  // far mausoleum that you have to walk the length of the graves to reach.
  cemetery: {
    landmark(api) {
      const k = kits();
      // the arch
      for (const sx of [-1, 1]) {
        k.solid.box(1.4, 6.0, 1.4, sx * 3.1, api.padY + 3.0, -20, C.stone);
        api.emit({
          kind: 'circle', x: sx * 3.1, z: -20, r: 0.9,
          y0: api.padY, y1: api.padY + 6.0, tag: 'wall',
        });
      }
      k.solid.box(8.2, 1.3, 1.2, 0, api.padY + 6.6, -20, C.stone);
      k.solid.cone(1.0, 1.6, 4, 0, api.padY + 8.0, -20, C.slate);
      return { solid: k.solid.build(), glow: null, moving: null, glowColour: GLOW.lamp };
    },
    body(api) {
      const k = kits();
      yardWall(k.solid, api, 24, 1.4, -Math.PI * 0.5, C.stone);
      // graves on a lattice, jittered, leaning
      for (let gz = 0; gz < 7; gz++) {
        for (let gx = 0; gx < 6; gx++) {
          const lx = -13 + gx * 5.2 + api.rng.range(-0.8, 0.8);
          const lz = -13 + gz * 4.4 + api.rng.range(-0.7, 0.7);
          if (Math.hypot(lx, lz) > 20) continue;
          const h = api.rng.range(0.65, 1.35);
          k.solid.box(0.66, h, 0.17, lx, api.padY + h * 0.5, lz, C.stone,
            api.rng.range(-0.35, 0.35), 0, api.rng.range(-0.14, 0.14));
          if (api.rng.next() < 0.30) k.solid.box(1.9, 0.16, 0.9, lx, api.padY + 0.08, lz + 0.9, C.stone);
        }
      }
      // three mausolea; the far one carries the lamp that is the claim
      // Three mausolea at FIXED local positions; the far one carries the lamp, and the
      // claim stands in front of its door instead of inside the building.
      const MAUS = [[-10, -6], [0, 14], [10, 2]];
      for (let i = 0; i < 3; i++) {
        const lx = MAUS[i][0], lz = MAUS[i][1];
        const mausYaw = api.rng.range(-0.2, 0.2);
        shell(k.solid, api, lx, lz, 4.0, 4.6, 3.0, mausYaw, C.stone, 1.4);
        k.solid.gable(4.4, 5.0, api.padY + 3.0, 0.9, lx, 0, lz, C.slate, mausYaw);
        // One sexton's service route is enough; repeating it on all three would turn the
        // graveyard into an obstacle course and erase the mausolea's different reads.
        if (i === 1) {
          gableFloor(api, lx, lz, 4.4, 5.0, api.padY + 3.0, 0.9, mausYaw);
          smallShellRoute(k.solid, api, lx, lz, 4.0, 4.6, 3.0, mausYaw);
        }
      }
      k.glow.pane(0.7, 1.0, 0, api.padY + 2.6, 11.5, PANE_LAMP, Math.PI, 0, 6, 8);
      // dead trees, because a cemetery with living trees is a park. 15-22 m out, which is
      // at the edge of the 24.8 m level core: grounded, not padded.
      for (let i = 0; i < 6; i++) {
        const a = api.rng.range(0, TAU), r = api.rng.range(15, 22);
        const h = api.rng.range(4.5, 7.5);
        const lx = Math.cos(a) * r, lz = Math.sin(a) * r;
        const gy = groundY(api, lx, lz);
        k.solid.cyl(0.12, 0.26, h, 6, lx, gy + h * 0.5 - 0.2, lz, C.wood);
        api.emit({
          kind: 'circle', x: lx, z: lz, r: 0.30,
          y0: gy - 0.3, y1: gy + h, tag: 'tree',
        });
      }
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
    },
  },

  /* ------------------------------------------------------------------ tower */
  // The Bell Tower. Four lofts, an outside stair, and a bell you can shoot from the road.
  // Ringing it is the loudest thing in CURFEW and it lights the tower for good.
  tower: {
    landmark(api) {
      const k = kits();
      // ROUND 6 (lane D2's route audit): the shaft is 19 m, not 22, and the belfry above it
      // is 6.9 m tall instead of 4.5. MEASURED 2026-09-03: with a 22 m solid shaft the bell
      // (claim.dy 24.4, its skirt at 23.45) hangs above the shaft's top edge, and from the
      // ground the shaft's own near face hides it inside 48 m - from the pad (r < 21) it
      // could never be seen, and from the road, 5.3 m lower, it needed 60 m and a gap in
      // the pines. A bell you cannot see is a place you cannot finish. Now the bell hangs
      // INSIDE the open belfry and clears the shaft from 16 m on the pad and 20 m on the
      // road; the silhouette's height is unchanged (30.3 m to the spire's tip).
      const H = 19;
      k.solid.box(6.4, H, 6.4, 0, api.padY + H * 0.5, 0, C.stone);
      api.emit({
        kind: 'obb', x: 0, z: 0, halfX: 3.2, halfZ: 3.2, yaw: 0,
        y0: api.padY - 0.3, y1: api.padY + H, tag: 'wall',
      });
      // the open belfry: four corner posts and a cap, so the bell reads as hanging in air
      for (let i = 0; i < 4; i++) {
        const sx = (i & 1) ? 1 : -1, sz = (i & 2) ? 1 : -1;
        k.solid.box(0.75, 6.6, 0.75, sx * 2.8, api.padY + H + 3.3, sz * 2.8, C.stone);
      }
      k.solid.box(7.6, 0.6, 7.6, 0, api.padY + H + 6.9, 0, C.stone);
      k.solid.cone(5.2, 4.4, 4, 0, api.padY + H + 9.4, 0, C.slate);
      // the bell, on its own pivot so it can swing when it is rung
      const bk = new Kit();
      bk.tube(1.05, 0.55, 1.7, 12, 0, -0.95, 0, C.rust);
      bk.cyl(0.16, 0.16, 0.5, 6, 0, 0.1, 0, C.metal);
      // The bell is shootable FROM THE ROAD, so its collider belongs to the landmark and
      // never streams out with a chunk (see the gallowsfen note).
      const bc = api.site.claim;
      api.emit({
        kind: 'circle', x: bc.dx, z: bc.dz, r: 1.15,
        y0: api.padY + bc.dy - 1.3, y1: api.padY + bc.dy + 0.7, tag: 'metal',
      });
      // narrow band of lofts: four floor slabs you can see through the windows
      for (let f = 0; f < 4; f++) {
        k.solid.box(5.6, 0.22, 5.6, 0, api.padY + 4.4 + f * 4.4, 0, C.plank);
        for (const sx of [-1, 1]) {
          const ty = sx > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          k.glow.pane(0.7, 1.4, sx * 3.23, api.padY + 5.6 + f * 4.4, 0, PANE_WINDOW, ty, 0, 4, 6);
          sash(k.solid, 0.7, 1.4, sx * 3.23, api.padY + 5.6 + f * 4.4, 0, C.stone, ty, 0, 1, 2, 0.07, 0.09);
        }
      }
      return {
        solid: k.solid.build(), glow: k.glow.build(), glowColour: GLOW.lamp,
        moving: [{ geo: bk.build(), colour: null, role: 'bell', x: 0, y: api.padY + api.site.claim.dy, z: 0, rate: 0 }],
      };
    },
    body(api) {
      const k = kits();
      // the outside stair, which is how you get up if you ever get an interior
      for (let i = 0; i < 14; i++) {
        const a = i * 0.42;
        const r = 4.6;
        k.solid.box(1.6, 0.18, 0.9, Math.cos(a) * r, api.padY + 0.4 + i * 0.42, Math.sin(a) * r,
          C.stone, -a);
      }
      // a ruined nave stub, so the tower is clearly what is LEFT of something
      for (let i = 0; i < 5; i++) {
        const lz = 6 + i * 3.0;
        const hh = api.rng.range(0.8, 2.6);
        for (const sx of [-1, 1]) {
          k.solid.box(2.6, hh, 0.4, sx * 4.0, api.padY + hh * 0.5, lz, C.stone);
          api.emit({
            kind: 'obb', x: sx * 4.0, z: lz, halfX: 1.3, halfZ: 0.2, yaw: 0,
            y0: api.padY - 0.3, y1: api.padY + hh, tag: 'wall',
          });
        }
      }
      return { solid: k.solid.build(), glow: null, moving: null, glowColour: GLOW.lamp };
    },
  },

  /* -------------------------------------------------------------------- barn */
  // Jackfield. Corn to the waist, stone walls, and the only long sightlines in the county.
  barn: {
    landmark(api) {
      const k = kits();
      k.solid.tube(3.0, 3.0, 15, 12, -14, api.padY + 7.5, -2, C.metal);     // the silo
      k.solid.cone(3.4, 2.6, 12, -14, api.padY + 16.3, -2, C.rust);
      api.emit({
        kind: 'circle', x: -14, z: -2, r: 3.1,
        y0: api.padY - 0.3, y1: api.padY + 15, tag: 'metal',
      });
      return { solid: k.solid.build(), glow: null, moving: null, glowColour: GLOW.lamp };
    },
    body(api) {
      const k = kits();
      const w = 20, d = 12, h = 6.4;
      shell(k.solid, api, 0, 0, w, d, h, 0, C.plank, 4.2);
      // gambrel: two pitches, which is what makes a barn read as a barn
      k.solid.gable(w + 0.8, d + 0.8, api.padY + h, 1.6, 0, 0, 0, C.rust, 0);
      k.solid.gable(w * 0.55, d + 0.9, api.padY + h + 1.6, 1.9, 0, 0, 0, C.rust, 0);
      // the loft lantern — the claim
      const c = api.site.claim;
      k.solid.box(0.5, 0.7, 0.5, c.dx, api.padY + 1.1, c.dz, C.metal);
      k.glow.pane(3.0, 2.0, 0, api.padY + 7.6, -d * 0.5 - 0.05, PANE_WINDOW, Math.PI, 0, 8, 8);
      sash(k.solid, 3.0, 2.0, 0, api.padY + 7.6, -d * 0.5 - 0.05, C.plank, Math.PI, 0, 3, 3, 0.09, 0.10);
      // stone walls out into the field. 31 m from the centre at the ends, past the 26 m
      // level core, so each length sits on the ground it crosses.
      // ROUND 6 (lane D2's route audit): a gate. The wall ran unbroken across the road side
      // of the yard (the road is at local +Z; the approach steps land at x 2-5), so the one
      // way in from the road was over a 1.4 m wall. Two lengths left out where a gate is.
      for (let i = 0; i < 18; i++) {
        if (i === 9 || i === 10) continue;
        const lx = -26 + i * 3.0;
        const gy = groundY(api, lx, 17);
        k.solid.box(3.0, 1.4, 0.5, lx, gy + 0.55 - 0.15, 17, C.stone);
        api.emit({
          kind: 'obb', x: lx, z: 17, halfX: 1.5, halfZ: 0.25, yaw: 0,
          y0: gy - 0.3, y1: gy + 1.1, tag: 'wall',
        });
      }
      // corn: merged rows of waist-high blades, no collider — you walk through corn, and
      // that is deliberate, not an omission. The field runs out to 48 m, twice the level
      // core, so a padY corn field would hover over the far rows or bury the near ones.
      for (let row = 0; row < 12; row++) {
        for (let i = 0; i < 26; i++) {
          const lx = -25 + i * 2.0 + api.rng.range(-0.4, 0.4);
          const lz = 22 + row * 2.2 + api.rng.range(-0.4, 0.4);
          const ch = api.rng.range(1.0, 1.5);
          k.solid.box(0.10, ch, 0.10, lx, groundY(api, lx, lz) + ch * 0.5 - 0.15, lz, C.soil,
            api.rng.range(0, TAU), api.rng.range(-0.12, 0.12));
        }
      }
      // three scarecrows. Some of them will not be scarecrows later — which is exactly why
      // each one gets a post collider now: the thing you shoot has to stop a bullet.
      for (let i = 0; i < 3; i++) {
        const lx = -14 + i * 13, lz = 30 + api.rng.range(-4, 4);
        const gy = groundY(api, lx, lz);
        k.solid.cyl(0.08, 0.08, 2.2, 5, lx, gy + 1.1, lz, C.wood);
        k.solid.box(1.6, 0.10, 0.10, lx, gy + 1.75, lz, C.wood, api.rng.range(0, TAU));
        k.solid.box(0.42, 0.5, 0.36, lx, gy + 2.25, lz, C.cloth, api.rng.range(0, TAU));
        api.emit({
          kind: 'circle', x: lx, z: lz, r: 0.26,
          y0: gy - 0.2, y1: gy + 2.5, tag: 'wood',
        });
      }
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: GLOW.lamp };
    },
  },
};

/* ------------------------------------------------------------------- manor */
// Blackthorn Manor (ROUND 6, Alex: "if any of my haunted mansion from previous games made it
// in as destinations"). The whole builder lives in manor.js; it gets this file's kit,
// palette and pane profiles and returns the same { landmark, body } shape as the rest.
BUILDERS.manor = makeManorBuilder({ Kit, kits, sash, C, PANE_WINDOW, PANE_LAMP, GLOW, groundY });
BUILDERS.avery = makeAveryHouseBuilder({ Kit, kits, sash, C, PANE_WINDOW, PANE_LAMP, GLOW, groundY });

/* ------------------------------------------------------- Round 9 donor landmarks
   A measured road-coverage audit found three 0.65--0.91 km dead legs between the original
   twelve. These are the three lowest-cost landmark-class compositions already catalogued
   from DUSKFALL: the henge, Great Tree/treehouse and rock arch/sleeper. They are rebuilt in
   CURFEW's merged Lambert kit, deterministic RNG and collider vocabulary; no donor light or
   Standard material crosses the boundary. */

BUILDERS.stones = {
  landmark(api) {
    const k = kits(), R = 16.2, COUNT = 12;
    const tops = [];
    for (let i = 0; i < COUNT; i++) {
      const a = i / COUNT * TAU + 0.20;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      // Twelve 12--16 m rough, tapered megaliths form a thirty-two-metre ring. The old
      // nine rectangular 8 m pylons read as a tiny brick colonnade; five-sided stones with
      // different girths, crowns and lean read as geology people dragged here.
      const h = 13.8 + Math.sin(i * 3.7) * 2.25;
      const yaw = -(a + Math.PI * 0.5) + Math.sin(i * 2.7) * 0.14;
      const lean = Math.sin(i * 5.1) * 0.115;
      const r0 = 1.28 + (i % 3) * 0.14, r1 = 2.02 + (i % 4) * 0.12;
      const monolith = new THREE.CylinderGeometry(r0, r1, h, 5, 2, false);
      monolith.scale(1.0 + (i & 1) * 0.12, 1, 0.66 + (i % 3) * 0.06);
      k.solid.at(monolith, i % 4 === 0 ? C.dark : C.stone,
        x, api.padY + h * 0.5, z, yaw, 0, lean);
      // Two broken mineral seams and an offset cap stop even the faceted stones reading as
      // cloned columns under the shared moss-stone texture.
      for (let c = 1; c <= 2; c++) {
        const seam = new THREE.CylinderGeometry(r0 + 0.05, r1 - c * 0.18, 0.18, 5);
        seam.scale(1.03, 1, 0.72 + (i % 3) * 0.05);
        k.solid.at(seam, c === 1 ? C.slate : C.rust, x,
          api.padY + h * (c === 1 ? 0.32 : 0.69), z, yaw, 0, lean);
      }
      k.solid.box(r0 * 1.55, 0.55, r0 * 1.28, x + Math.sin(a) * 0.22,
        api.padY + h + 0.06, z - Math.cos(a) * 0.22, i & 1 ? C.slate : C.dark,
        yaw + 0.18, 0, lean * 1.5);
      if (i === 2 || i === 7 || i === 10) {
        k.glow.box(0.15, h * 0.58, 0.12, x - Math.cos(a) * 0.95,
          api.padY + h * 0.54, z - Math.sin(a) * 0.75, [0.72, 0.86, 0.76], yaw);
      }
      api.emit({ kind: 'circle', x, z, r: r1 * 0.90,
        y0: api.padY - 0.3, y1: api.padY + h, tag: 'stone', standable: true });
      tops.push({ x, z, h, a });
    }
    // Four trilithons around the ring, with deliberately mismatched capstones.
    for (const [ia, ib] of [[0, 1], [3, 4], [6, 7], [9, 10]]) {
      const A = tops[ia], B = tops[ib], x = (A.x + B.x) * 0.5, z = (A.z + B.z) * 0.5;
      const len = Math.hypot(B.x - A.x, B.z - A.z) + 3.8;
      const top = Math.max(A.h, B.h) + 0.45;
      const yaw = Math.atan2(-(B.z - A.z), B.x - A.x);
      k.solid.box(len, 1.05, 2.35, x, api.padY + top, z, C.slate,
        yaw + (ia & 1 ? 0.04 : -0.03), 0, ia & 1 ? -0.07 : 0.06);
      api.emit({ kind: 'obb', x, z, halfX: len * 0.5, halfZ: 1.18, yaw,
        y0: api.padY + top - 0.53, y1: api.padY + top + 0.53,
        tag: 'stone', standable: true });
    }
    return { solid: k.solid.build(), glow: k.glow.build(), moving: null,
      glowColour: GLOW.wisp };
  },
  body(api) {
    const k = kits();
    // Processional path, central altar/claim, and two fallen lintels as hop-up perches.
    for (let i = 0; i < 9; i++) {
      const z = 25 - i * 2.35, y = groundY(api, 0, z);
      k.solid.box(i & 1 ? 3.6 : 4.6, 0.16, 1.65, 0, y + 0.08, z,
        i % 3 ? C.slate : C.rust, (i & 1) ? 0.08 : -0.06);
    }
    k.solid.box(4.6, 1.25, 3.4, 0, api.padY + 0.625, 0, C.dark, 0.16);
    k.solid.box(3.7, 0.14, 2.6, 0, api.padY + 1.32, 0, C.rust, 0.16);
    api.emit({ kind: 'obb', x: 0, z: 0, halfX: 2.3, halfZ: 1.7, yaw: 0.16,
      y0: api.padY - 0.2, y1: api.padY + 1.4, tag: 'stone', standable: true });
    for (const [x, z, yaw, top] of [[-8, 4, -0.55, 0.75], [8.5, 7, 0.42, 1.05]]) {
      k.solid.box(8.0, 1.0, 2.2, x, api.padY + top * 0.5, z, C.stone, yaw, 0, 0.08);
      api.emit({ kind: 'obb', x, z, halfX: 4.0, halfZ: 1.1, yaw,
        y0: api.padY - 0.2, y1: api.padY + top, tag: 'stone', standable: true });
    }
    return { solid: k.solid.build(), glow: null, moving: null, glowColour: GLOW.wisp };
  },
};

BUILDERS['great-tree'] = {
  landmark(api) {
    const k = kits();
    const bark = [0.165, 0.087, 0.038], barkDark = [0.052, 0.032, 0.020];
    // A broad burnt-copper oak, deliberately unlike the county's thin blue-green pines.
    // The former crown began at 39 m. From the nearest road its base and 13 m deck sat
    // behind a terrain shoulder while the crown was at/above the player's frame, so the
    // screenshot contained a gate pointing at empty sky. This crown starts at 20 m, spans
    // thirty metres and rises to 61 m: a silhouette throughout the ordinary look range,
    // not a taller pole the player has to aim upward to discover.
    const leaf = [0.205, 0.112, 0.047], leafDark = [0.102, 0.052, 0.027];
    const H = 54;
    k.solid.cyl(1.80, 4.25, H, 11, 0, api.padY + H * 0.5 - 0.8, 0, bark);
    for (let band = 0; band < 11; band++) k.solid.tube(1.82 + band * 0.16,
      1.96 + band * 0.18, 0.38, 11, 0, api.padY + 3.3 + band * 4.25, 0,
      band & 1 ? C.rust : barkDark);
    api.emit({ kind: 'circle', x: 0, z: 0, r: 1.55,
      y0: api.padY - 1.2, y1: api.padY + H, tag: 'tree' });
    // Overlapping, gnarled low-poly masses: a spreading crown rather than one sphere.
    const blobs = [[0,27,0,9.6],[-7.8,28,1.8,7.2],[7.6,29,-1.4,7.0],
      [-2.8,34,-7.2,7.0],[3.4,35,7.0,7.2],[-8.2,37,-3.2,6.2],
      [8.4,38,3.0,6.0],[0,43,0,8.0],[-5.0,47,3.8,5.6],
      [5.2,48,-3.0,5.4],[0,54,0,5.1],[0,59,0,3.7]];
    for (let i = 0; i < blobs.length; i++) {
      const [x, y, z, r] = blobs[i];
      // SphereGeometry is intentionally low-segment here. IcosahedronGeometry is
      // non-indexed in this Three build while every trunk/branch primitive is indexed;
      // BufferGeometryUtils refuses to merge the two and silently handed places.js a null
      // landmark, leaving only the little approach gate in the world. This keeps the same
      // faceted crown while satisfying the site's one-merged-mesh contract.
      const g = new THREE.SphereGeometry(r, 7, 5);
      g.scale(1 + (i % 3) * 0.08, 0.82 + (i & 1) * 0.12, 1 - (i % 2) * 0.08);
      g.rotateY(i * 0.61); g.translate(x, api.padY + y, z);
      k.solid.push(g, i % 3 ? leaf : leafDark);
    }
    // Five huge limbs break the pole silhouette below and through the crown. Their exposed
    // rust-coloured collars and the lightning scar also make real surface breakup at road
    // distance instead of relying on one flat brown cylinder.
    for (const [x, y, z, yaw, len, lean] of [[7.0,18,1.0,1.10,17,0.20],
      [-7.0,23,-2.5,-0.92,18,-0.18],[5.0,30,-5.8,2.25,16,0.16],
      [-4.8,36,5.8,-2.30,15,-0.15],[3.5,44,2.8,0.68,12,0.20]]) {
      k.solid.box(len, 1.18, 1.24, x, api.padY + y, z, bark, yaw, 0, lean);
      k.solid.box(1.55, 1.36, 1.42, x - Math.cos(yaw) * len * 0.30,
        api.padY + y - Math.sin(lean) * len * 0.30, z + Math.sin(yaw) * len * 0.30,
        C.rust, yaw, 0, lean);
    }
    for (let i = 0; i < 7; i++) k.solid.box(0.42, 3.5, 0.16,
      -0.20 + Math.sin(i * 2.1) * 0.25, api.padY + 4.0 + i * 3.45,
      3.60 - i * 0.08, i & 1 ? C.plank : C.rust, 0, 0, i % 3 === 0 ? 0.05 : -0.04);
    return { solid: k.solid.build(), glow: null, moving: null, glowColour: GLOW.lamp };
  },
  body(api) {
    const k = kits(), bark = [0.090, 0.058, 0.037];
    // Thirty walkable spiral treads: 0.42 m per tread, five metres headroom per turn.
    const N = 30, perTurn = 12, r = 3.25;
    for (let i = 0; i < N; i++) {
      const a = Math.PI * 0.5 + i * TAU / perTurn, top = 0.42 * (i + 1);
      const x = Math.cos(a) * r, z = Math.sin(a) * r, yaw = -a;
      // At 3.25 m radius adjacent 30-degree centres are 1.68 m apart. The former
      // 1.05 m tangential depth left a 0.63 m hole between every tread: visually a spiral,
      // physically a fall on tread three. A 1.90 m tread overlaps its neighbours enough
      // for the 0.72 m capsule while still leaving the stair visibly open.
      k.solid.box(3.55, 0.20, 1.90, x, api.padY + top - 0.10, z,
        i % 3 ? C.plank : bark, yaw);
      api.emit({ kind: 'obb', x, z, halfX: 1.78, halfZ: 0.95, yaw,
        y0: api.padY + top - 0.20, y1: api.padY + top,
        tag: 'wood', standable: true, climbable: false });
      const hr = 4.60;
      if ((i & 1) === 0) k.solid.box(0.10, 1.0, 0.10, Math.cos(a) * hr,
        api.padY + top + 0.5, Math.sin(a) * hr, C.rust);
    }
    const deckY = 12.9;
    // A horseshoe deck, with the west/south-west stairwell genuinely open. The former full
    // cylinder was a ceiling over the final five treads: at 10.5 m the player's head met
    // its 12.48 m underside and the otherwise walkable spiral threw them back to ground.
    // Three planked wings retain a substantial treehouse floor around the claim while the
    // 12.6 m bridge gives the last tread a single ordinary step onto it.
    const deckSlabs = [[2.55, 0, 6.30, 11.0], [-3.25, 4.55, 5.30, 2.0], [-3.25, -4.55, 5.30, 2.0]];
    for (const [x, z, w, d] of deckSlabs) {
      k.solid.box(w, 0.42, d, x, api.padY + deckY - 0.21, z, C.plank);
      api.emit({ kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw: 0,
        y0: api.padY + deckY - 0.42, y1: api.padY + deckY,
        tag: 'wood', standable: true, climbable: false });
    }
    k.solid.box(3.40, 0.24, 1.35, 0, api.padY + 12.48, -2.65, C.rust);
    api.emit({ kind: 'obb', x: 0, z: -2.65, halfX: 1.70, halfZ: 0.675, yaw: 0,
      y0: api.padY + 12.36, y1: api.padY + 12.60,
      tag: 'wood', standable: true, climbable: false });
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, x = Math.cos(a) * 5.25, z = Math.sin(a) * 5.25;
      k.solid.box(0.14, 1.15, 0.14, x, api.padY + deckY + 0.57, z, C.wood);
      if (i % 3) k.solid.box(2.75, 0.12, 0.12, Math.cos(a - TAU / 24) * 5.15,
        api.padY + deckY + 0.95, Math.sin(a - TAU / 24) * 5.15, C.wood, -a);
    }
    // The visible payoff is an open supply cage around the real completion fixture.
    // Keep it on the east shoulder with the fixture rather than buried in the trunk's
    // visible taper. There is still more than a metre of deck in front of the panel and
    // broad standing room to either side of it.
    const claimX = +api.site.claim.dx, claimZ = +api.site.claim.dz;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU, x = claimX + Math.cos(a) * 0.82, z = claimZ + Math.sin(a) * 0.82;
      k.solid.cyl(0.06, 0.06, 2.1, 6, x, api.padY + deckY + 1.05, z, C.rust);
    }
    k.solid.tube(0.82, 0.82, 0.10, 12, claimX, api.padY + deckY + 2.05, claimZ, C.rust);
    k.solid.box(1.25, 0.58, 0.76, claimX, api.padY + deckY + 0.34, claimZ, C.dark);
    k.glow.cyl(0.11, 0.11, 1.5, 7, claimX, api.padY + deckY + 1.05, claimZ, [1,1,1]);
    // Root flare and an abandoned lookout camp make the foot a place too.
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + 0.2;
      k.solid.box(7.8, 0.9, 1.2, Math.cos(a) * 2.2, api.padY + 0.36,
        Math.sin(a) * 2.2, bark, -a, 0, 0.11);
    }
    for (const [x,z] of [[-9,8],[-7.2,9.2],[-10.2,5.7]]) {
      k.solid.box(1.4, 0.75, 1.0, x, api.padY + 0.38, z, C.wood, 0.2);
      api.emit({ kind:'obb', x, z, halfX:0.7, halfZ:0.5, yaw:0.2,
        y0:api.padY-0.2, y1:api.padY+0.76, tag:'wood', standable:true });
    }
    return { solid: k.solid.build(), glow: k.glow.build(), moving: null,
      glowColour: GLOW.lamp };
  },
};

BUILDERS['rock-arch'] = {
  landmark(api) {
    const k = kits();
    const darkStone = [0.066, 0.071, 0.069], seam = [0.125, 0.079, 0.054];
    // Seven crooked portals make a 30 m long, 28 m tall stone rib-cage. The earlier two
    // squat arches and two posts read as another little gate from the road. Repetition in
    // depth now gives the Black Rib its own impossible skeletal silhouette and makes the
    // central passage an authored sequence instead of empty apron.
    const heights = [18.5, 21.5, 24.5, 27.5, 25.0, 22.0, 19.0];
    for (let i = 0; i < heights.length; i++) {
      const z = 15 - i * 5.0, h = heights[i];
      const mid = 1 - Math.abs(i - 3) / 3;
      const spread = 12.5 + mid * 2.2;
      const thick = 1.65 + (i % 3) * 0.20;
      for (const side of [-1, 1]) {
        const lowLean = side * (0.10 + (i & 1) * 0.025);
        const highLean = side * (0.43 + (i % 3) * 0.035);
        k.solid.box(thick + 0.30, h * 0.56, 2.10,
          side * spread * 0.87, api.padY + h * 0.28, z,
          i % 3 === 0 ? C.slate : darkStone, i * 0.018 * side, 0, lowLean);
        k.solid.box(thick, h * 0.57, 1.95,
          side * spread * 0.47, api.padY + h * 0.69, z,
          i & 1 ? C.stone : darkStone, -i * 0.014 * side, 0, highLean);
        // Oxide/mineral collar at the joint: visible breakup on every otherwise dark rib.
        k.solid.box(thick + 0.42, 0.52, 2.28,
          side * spread * 0.73, api.padY + h * 0.51, z,
          seam, i * 0.018 * side, 0, side * 0.25);
        api.emit({ kind:'obb', x:side * spread * 0.87, z,
          halfX:(thick + 0.30) * 0.62, halfZ:1.10, yaw:i * 0.018 * side,
          y0:api.padY-0.3, y1:api.padY+h * 0.58, tag:'stone', standable:true });
      }
      // Broken keystones leave a ragged notch along the spine instead of seven clean gates.
      const capW = 7.3 + (i % 2) * 1.4;
      k.solid.box(capW, 1.55 + (i % 3) * 0.18, 2.40,
        (i % 3 - 1) * 0.38, api.padY + h * 0.955, z,
        i & 1 ? C.slate : darkStone, i * 0.025, 0, (i - 3) * 0.018);
      // Hanging stone teeth make the tunnel feel ribbed from underneath too.
      if (i !== 3) for (const side of [-1, 1])
        k.solid.box(0.72, 2.0 + (i % 2) * 0.8, 0.82,
          side * (2.1 + (i % 2) * 0.8), api.padY + h * 0.88, z,
          C.rust, i * 0.03, 0, side * 0.10);
    }
    // The stair's useful crown: a compact lookout/claim ledge joining the final body stair
    // to the existing fixture at +10.2 m. It is a destination action, not area inflation.
    k.solid.box(9.6, 0.82, 6.8, 0, api.padY + 9.82, -0.5,
      darkStone, -0.03, 0, 0.035);
    k.solid.box(6.8, 0.22, 4.8, 0, api.padY + 10.30, -0.5,
      seam, 0.04, 0, -0.02);
    api.emit({ kind:'obb', x:0, z:-0.5, halfX:4.8, halfZ:3.4, yaw:-0.03,
      y0:api.padY+9.35, y1:api.padY+10.25, tag:'stone', standable:true,
      climbable:false });
    return {solid:k.solid.build(), glow:null, moving:null, glowColour:GLOW.wisp};
  },
  body(api) {
    const k = kits(), darkStone = [0.066, 0.071, 0.069];
    // A solid monumental stair climbs the east rib; the last landing crosses onto the
    // crown where the real completion fixture waits.
    const N = 21;
    for (let i = 0; i < N; i++) {
      const z = 14 - i * 0.92, top = 0.46 * (i + 1), x = 7.0;
      k.solid.box(2.3, top, 1.02, x, api.padY + top * 0.5, z,
        i % 4 === 0 ? C.rust : darkStone, 0.04 * Math.sin(i));
      api.emit({kind:'obb',x,z,halfX:1.15,halfZ:0.51,yaw:0.04*Math.sin(i),
        y0:api.padY-0.2,y1:api.padY+top,tag:'stone',standable:true,climbable:false});
    }
    // The cross-landing connects the last stair to the crown but stops 0.8 m short of the
    // stair centre in X. Its old collider reached to x=7.1 and presented its 10.08 m side
    // to a player still on tread 19 at 8.74 m, blocking the final two steps. Once the body
    // stands on tread 21 it turns left onto the same substantial landing and claim ledge.
    k.solid.box(6.4, 0.40, 2.4, 3.0, api.padY + 9.88, -4.4, darkStone);
    api.emit({kind:'obb',x:3.0,z:-4.4,halfX:3.2,halfZ:1.2,yaw:0,
      y0:api.padY+9.55,y1:api.padY+10.08,tag:'stone',standable:true,climbable:false});
    // The sleeper-monolith donor shape is the ground-level alternate perch/cover.
    k.solid.box(11.5, 1.45, 3.2, -11.0, api.padY + 1.05, -5.0, C.stone,
      -0.58, 0, 0.14);
    api.emit({kind:'obb',x:-11,z:-5,halfX:5.75,halfZ:1.6,yaw:-0.58,
      y0:api.padY-0.2,y1:api.padY+1.75,tag:'stone',standable:true});
    // Shattered blocks form a close arena without narrowing the central arch passage.
    for (let i=0;i<8;i++) {
      const a=i/8*TAU, x=Math.cos(a)*16, z=Math.sin(a)*12-2;
      const h=0.8+(i%3)*0.45;
      k.solid.box(1.8+(i&1),h,1.5,x,api.padY+h*0.5,z,i%3?C.slate:C.rust,a);
    }
    return {solid:k.solid.build(),glow:null,moving:null,glowColour:GLOW.wisp};
  },
};

/* ==========================================================================
   MINOR SITES.

   Small, cheap, and the reason a 900 m leg between two majors is not empty. Every one is
   a single merged geometry plus at most one collider, and each is a piece of the same
   sentence: people used this road, and then they stopped.

   donor: Projects/eaten-path/src/world/props.js:660-700 — the vocabulary (the bike, the
   notice board of MISSING posters, the dead car). Re-kitted to a rural county road.
   ========================================================================== */

/* ==========================================================================
   THINGS YOU CAN DRIVE THROUGH — ROUND 7, lane F.

   Alex, fifth playtest: "more towards the dying light driving expansion type style. Car
   that handles great. CAN CRUSH THINGS WITH IT."

   Each of these is a small roadside thing that a car at road speed goes through: geometry
   bracketed by k.solid.open()/close() so `vehicle/car.js` can take the triangles down, and
   ONE collider whose tag puts it on collision.js's BREAKABLE_TAGS table. The tag is the
   whole opt-in — a builder in any other lane joins by tagging a shape 'crate', 'drum',
   'sign', 'pallet', 'tyres', 'stall', 'aboard', 'letterbox', 'sapling' or 'fence' and
   never touches this file (docs/ROUND-7/HANDOFF-F.md).

   Nothing here is load-bearing, nothing here is standable, and nothing here is on the
   racing line of a road: they sit on the verge, which is where the fun is.
   ========================================================================== */

/** A county road sign on two legs, leaning the way the last one to hit it left it. */
function roadSign(k, api, lx, lz, ry) {
  const gy = groundY(api, lx, lz);
  const lean = api.rng.range(-0.22, 0.22);
  k.solid.open();
  k.solid.cyl(0.045, 0.055, 1.85, 5, lx - 0.30, gy + 0.92, lz, C.metal, ry, 0, lean);
  k.solid.cyl(0.045, 0.055, 1.85, 5, lx + 0.30, gy + 0.92, lz, C.metal, ry, 0, lean);
  // NOT C.plaster. A sign board is the brightest thing this lane adds and it stands on the
  // verge where the headlamp lands square on it; at 0.265 albedo it was the brightest
  // object in the frame, which is the exact backwardsness docs/NEXT.md B6 complains about
  // with the filling station's pumps. Weathered enamel, in the same band as C.stone.
  k.solid.box(1.05, 0.62, 0.05, lx, gy + 1.62, lz, [0.178, 0.172, 0.160], ry, 0, lean);
  k.solid.box(0.72, 0.10, 0.06, lx, gy + 1.70, lz - 0.04, C.dark, ry, 0, lean);
  k.solid.box(0.46, 0.09, 0.06, lx - 0.10, gy + 1.52, lz - 0.04, C.dark, ry, 0, lean);
  k.solid.close(lx, lz, 0.8, C.plaster);
  api.emit({ kind: 'circle', x: lx, z: lz, r: 0.44, y0: gy - 0.2, y1: gy + 1.95, tag: 'sign' });
}

/** A letterbox on a post at the end of a track nobody walks up any more. */
function letterbox(k, api, lx, lz, ry) {
  const gy = groundY(api, lx, lz);
  k.solid.open();
  k.solid.cyl(0.06, 0.075, 1.15, 5, lx, gy + 0.57, lz, C.wood, ry, 0, api.rng.range(-0.1, 0.1));
  k.solid.box(0.30, 0.26, 0.44, lx, gy + 1.24, lz, C.metal, ry);
  k.solid.box(0.32, 0.05, 0.05, lx + 0.18, gy + 1.30, lz, C.rust, ry, 0, 0.9);
  k.solid.close(lx, lz, 0.5, C.metal);
  api.emit({ kind: 'circle', x: lx, z: lz, r: 0.32, y0: gy - 0.2, y1: gy + 1.42, tag: 'letterbox' });
}

/** A sandwich board. The lightest thing in the county and it goes at a walking pace. */
function aboard(k, api, lx, lz, ry) {
  const gy = groundY(api, lx, lz);
  k.solid.open();
  for (const s of [-1, 1]) {
    k.solid.box(0.72, 1.02, 0.05, lx + s * 0.16, gy + 0.52, lz, C.plank, ry, 0, s * 0.28);
  }
  k.solid.box(0.52, 0.34, 0.04, lx - 0.20, gy + 0.62, lz, C.paper, ry, 0, -0.28);
  k.solid.close(lx, lz, 0.6, C.plank);
  api.emit({ kind: 'circle', x: lx, z: lz, r: 0.42, y0: gy - 0.2, y1: gy + 1.05, tag: 'aboard' });
}

/** A trestle stall with its awning half down. Somebody sold something here. */
function stall(k, api, lx, lz, ry) {
  const gy = groundY(api, lx, lz);
  k.solid.open();
  for (let i = 0; i < 4; i++) {
    const sx = (i & 1) ? 0.86 : -0.86, sz = (i & 2) ? 0.42 : -0.42;
    const px = lx + sx * Math.cos(ry) + sz * Math.sin(ry);
    const pz = lz - sx * Math.sin(ry) + sz * Math.cos(ry);
    k.solid.cyl(0.05, 0.06, 0.92, 4, px, gy + 0.46, pz, C.wood);
  }
  k.solid.box(2.0, 0.09, 1.0, lx, gy + 0.94, lz, C.plank, ry);
  k.solid.box(2.1, 0.06, 1.1, lx, gy + 1.86, lz, C.cloth, ry, 0, api.rng.range(0.18, 0.34));
  k.solid.cyl(0.05, 0.05, 1.9, 4, lx - 0.9 * Math.cos(ry), gy + 0.95, lz + 0.9 * Math.sin(ry), C.wood);
  k.solid.close(lx, lz, 1.4, C.plank);
  api.emit({
    kind: 'obb', x: lx, z: lz, halfX: 1.0, halfZ: 0.55, yaw: ry,
    y0: gy - 0.2, y1: gy + 1.0, tag: 'stall',
  });
}

/** A stack of crates. Each crate is its own part and its own collider: they go one at a time. */
function crates(k, api, lx, lz, n) {
  let y = 0;
  for (let i = 0; i < n; i++) {
    const s = api.rng.range(0.52, 0.68);
    const ox = lx + api.rng.range(-0.16, 0.16), oz = lz + api.rng.range(-0.16, 0.16);
    const gy = groundY(api, ox, oz);
    const ry = api.rng.range(0, TAU);
    k.solid.open();
    k.solid.box(s, s * 0.72, s * 0.86, ox, gy + y + s * 0.36, oz, C.plank, ry);
    k.solid.box(s * 1.03, 0.05, s * 0.10, ox, gy + y + s * 0.36, oz, C.wood, ry);
    k.solid.close(ox, oz, s, C.plank);
    api.emit({
      kind: 'circle', x: ox, z: oz, r: s * 0.5,
      y0: gy + y - 0.05, y1: gy + y + s * 0.74, tag: 'crate',
    });
    y += s * 0.72;
  }
}

/** A pallet stack, leaning. */
function pallets(k, api, lx, lz, ry) {
  const gy = groundY(api, lx, lz);
  const n = 3 + ((api.rng.next() * 3) | 0);
  k.solid.open();
  for (let i = 0; i < n; i++) {
    k.solid.box(1.15, 0.11, 0.95, lx + api.rng.range(-0.07, 0.07), gy + 0.07 + i * 0.14,
      lz + api.rng.range(-0.07, 0.07), C.plank, ry + api.rng.range(-0.09, 0.09));
  }
  k.solid.close(lx, lz, 0.9, C.plank);
  api.emit({
    kind: 'obb', x: lx, z: lz, halfX: 0.60, halfZ: 0.50, yaw: ry,
    y0: gy - 0.2, y1: gy + 0.14 * n + 0.06, tag: 'pallet',
  });
}

/** An oil drum. The heaviest thing on the breakable table that is not stone. */
function drum(k, api, lx, lz, down) {
  const gy = groundY(api, lx, lz);
  const ry = api.rng.range(0, TAU);
  k.solid.open();
  if (down) {
    k.solid.cyl(0.29, 0.29, 0.88, 10, lx, gy + 0.29, lz, C.rust, ry, 0, Math.PI * 0.5);
    k.solid.close(lx, lz, 0.6, C.rust);
    api.emit({ kind: 'circle', x: lx, z: lz, r: 0.44, y0: gy - 0.15, y1: gy + 0.58, tag: 'drum' });
  } else {
    k.solid.cyl(0.29, 0.29, 0.88, 10, lx, gy + 0.44, lz, C.rust, ry);
    k.solid.cyl(0.30, 0.30, 0.05, 10, lx, gy + 0.66, lz, C.metal, ry);
    k.solid.close(lx, lz, 0.5, C.rust);
    api.emit({ kind: 'circle', x: lx, z: lz, r: 0.31, y0: gy - 0.15, y1: gy + 0.88, tag: 'drum' });
  }
}

/** A stack of tyres. */
function tyreStack(k, api, lx, lz) {
  const gy = groundY(api, lx, lz);
  const n = 3 + ((api.rng.next() * 3) | 0);
  k.solid.open();
  for (let i = 0; i < n; i++) {
    k.solid.tube(0.36, 0.36, 0.22, 10, lx + api.rng.range(-0.05, 0.05), gy + 0.11 + i * 0.21,
      lz + api.rng.range(-0.05, 0.05), C.dark, api.rng.range(0, TAU));
  }
  k.solid.close(lx, lz, 0.6, C.dark);
  api.emit({
    kind: 'circle', x: lx, z: lz, r: 0.40,
    y0: gy - 0.15, y1: gy + 0.21 * n + 0.02, tag: 'tyres',
  });
}

/**
 * THE VERGE. Round 7, lane F, and it is the whole difference between "there are breakable
 * things in the county" and "you can mow through the small stuff at speed".
 *
 * A minor site sits 7.4-12.6 m off the road centreline (placedata MINOR_OFFSET) and
 * places.js yaws it so its LOCAL +Z faces the road. So local +Z of 2.6-4.4 m puts a prop
 * 3-10 m from the centreline: the verge, the edge of the drivable ribbon, and the first
 * thing a car clips when it swerves. Everything on this line is LIGHT — nothing over 30 kg,
 * so nothing here needs more than 4.3 m/s to go through and nothing here can ever stop you.
 *
 * MEASURED, and it is the reason this exists: the first cut put every breakable at the
 * site's own centre, 8-12 m off the road in the trees, and a car driving the road passed
 * 9.8 m from the nearest one and broke nothing (tools/f-crush.mjs, first three runs).
 */
function verge(k, api, n) {
  const count = n === undefined ? 3 : n;
  for (let i = 0; i < count; i++) {
    const lx = (i - (count - 1) * 0.5) * api.rng.range(4.4, 6.6) + api.rng.range(-1.2, 1.2);
    // A SPREAD, NOT A RANDOM DRAW, and it is spread on purpose. The site's own distance
    // from the centreline is drawn from 7.4-12.6 m and a builder cannot see it, so a single
    // offset lands anywhere from the tarmac to the treeline depending on the draw. Stepping
    // 6.6 / 5.3 / 4.0 guarantees the FIRST of them is 0.8-6.0 m from the centreline — the
    // wheel track or the verge, whatever the site drew — and the last is well back on the
    // grass. (places.js should hand the builder the offset; docs/ROUND-7/HANDOFF-F.md.)
    const lz = 6.6 - i * 1.3;
    const pick = api.rng.next();
    if (pick < 0.28) aboard(k, api, lx, lz, api.rng.range(0, TAU));
    else if (pick < 0.52) crates(k, api, lx, lz, 1);
    else if (pick < 0.72) pallets(k, api, lx, lz, api.rng.range(0, TAU));
    else if (pick < 0.88) letterbox(k, api, lx, lz, api.rng.range(0, TAU));
    else roadSign(k, api, lx, lz, api.rng.range(0, TAU));
  }
}

export const MINOR_BUILDERS = {

  /**
   * Fallen post-and-rail, walkable through the gaps.
   *
   * A minor's `padY` is heightAt at its own centre and this run is 16 m long, so on the
   * banked verge the end posts were the most visible floaters in the county. Every post
   * and rail stands on the ground under it; the fence follows the hill.
   */
  fence(api) {
    const k = kits();
    const n = 7;
    let vaultTop = api.padY + 0.82;
    for (let i = 0; i < n; i++) {
      const lx = (i - (n - 1) * 0.5) * 2.3;
      // The centre bay is the guaranteed readable vault. Other bays may have fallen, so
      // this still looks abandoned without making the interaction depend on one RNG draw.
      const fell = api.rng.next() < 0.34;
      const down = i === 3 ? false : fell;
      const h = down ? 0.3 : api.rng.range(1.0, 1.4);
      const gy = groundY(api, lx, 0);
      const lean = down ? api.rng.range(0.9, 1.5) : api.rng.range(-0.1, 0.1);
      // Each visible post is its own break part and collider. The former one-box collider
      // filled every open bay from earth to rail and made a 16 m invisible wall; it also
      // meant clipping one end with the car erased the entire fence at once.
      k.solid.open();
      k.solid.cyl(0.08, 0.10, h + 0.3, 5, lx, gy + h * 0.5 - 0.15, 0, C.wood,
        0, lean, api.rng.range(-0.12, 0.12));
      k.solid.close(lx, 0, down ? 0.34 : 0.22, C.wood);
      api.emit({
        kind: 'circle', x: lx, z: 0, r: down ? 0.32 : 0.14,
        y0: gy - 0.2, y1: gy + (down ? 0.34 : h), tag: 'fence', climbable: false,
      });
      if (i < n - 1 && !down) {
        const rx = lx + 1.15;
        const railY = groundY(api, rx, 0) + h * 0.66;
        k.solid.open();
        k.solid.box(2.3, 0.10, 0.08, rx, railY, 0, C.wood);
        k.solid.close(rx, 0, 1.18, C.wood);
        // This thin suspended bar is the actual vault target: its 0.71--0.97 m top is in
        // the waist-high band, its far side is genuinely empty, and standable deliberately
        // overrides the usual no-climb rule for breakables. There is no filled floor below.
        api.emit({
          kind: 'obb', x: rx, z: 0, halfX: 1.15, halfZ: 0.04, yaw: 0,
          y0: railY - 0.05, y1: railY + 0.05, tag: 'fence', standable: true,
        });
        if (i === 3) vaultTop = railY + 0.05;
      }
    }
    // Local-space audit hint. The body is still discovered through collision; this merely
    // names the guaranteed bay so a natural-input proof need not guess which rail survived.
    api.site.parkourRoute = {
      kind: 'vault', space: 'local',
      approach: { x: 1.15, z: 2.35, y: groundY(api, 1.15, 2.35) },
      target: { x: 1.15, z: 0, y: vaultTop },
      exit: { x: 1.15, z: -1.65, y: groundY(api, 1.15, -1.65) },
    };
    // ROUND 7: the gatepost furniture. A letterbox at one end and a county sign at the
    // other, each its own collider and its own part, so a pass down the verge takes three
    // separate things and the road looks like you were here.
    letterbox(k, api, -9.4, api.rng.range(-0.5, 0.5), api.rng.range(0, TAU));
    roadSign(k, api, 9.6, api.rng.range(-0.6, 0.6), api.rng.range(-0.5, 0.5));
    verge(k, api, 3);
    return k;
  },

  /** A waystone: one carved stone that has been telling you the same thing for 300 years. */
  waystone(api) {
    const k = kits();
    const h = api.rng.range(1.3, 1.9);
    k.solid.open();
    k.solid.box(0.62, h, 0.30, 0, api.padY + h * 0.5, 0, C.stone, api.rng.range(0, TAU), 0,
      api.rng.range(-0.10, 0.10));
    k.solid.box(1.0, 0.2, 0.8, 0, api.padY + 0.1, 0, C.stone);
    k.solid.close(0, 0, 0.7, C.stone);
    // ROUND 7: 120 kg. It needs 9.2 m/s, so it stands through everything but a real run at
    // it — which is the point: the heavy things are the ones worth aiming at.
    api.emit({ kind: 'circle', x: 0, z: 0, r: 0.45, y0: api.padY - 0.2, y1: api.padY + h, tag: 'waystone' });
    verge(k, api, 2);
    return k;
  },

  /** A culvert head: a black mouth under the road, and whatever runs out of it. */
  culvert(api) {
    const k = kits();
    k.solid.box(3.4, 1.5, 0.6, 0, api.padY + 0.4, 0, C.stone);
    k.solid.tube(0.62, 0.62, 1.6, 10, 0, api.padY + 0.55, 0.2, C.dark, 0, Math.PI * 0.5);
    for (let i = 0; i < 5; i++) {
      k.solid.box(api.rng.range(0.4, 0.9), api.rng.range(0.2, 0.5), api.rng.range(0.4, 0.8),
        api.rng.range(-2, 2), api.padY + 0.15, api.rng.range(1.2, 3.2), C.dark, api.rng.range(0, TAU));
    }
    // yaw 0 for the same reason as the fence: emit() adds the site's yaw itself.
    api.emit({ kind: 'obb', x: 0, z: 0, halfX: 1.7, halfZ: 0.3, yaw: 0, y0: api.padY - 0.3, y1: api.padY + 1.2, tag: 'stone' });
    verge(k, api, 2);
    return k;
  },

  /** A pylon base. The wires are gone; the concrete is not. */
  pylon(api) {
    const k = kits();
    k.solid.box(4.4, 0.5, 4.4, 0, api.padY + 0.25, 0, C.ash);
    for (let i = 0; i < 4; i++) {
      const sx = (i & 1) ? 1 : -1, sz = (i & 2) ? 1 : -1;
      const h = api.rng.range(1.6, 3.4);
      k.solid.cyl(0.16, 0.20, h, 6, sx * 1.5, api.padY + 0.5 + h * 0.5, sz * 1.5, C.rust,
        0, sx * 0.10, sz * 0.10);
    }
    api.emit({ kind: 'circle', x: 0, z: 0, r: 2.3, y0: api.padY - 0.2, y1: api.padY + 0.6, tag: 'stone', standable: true });
    // ROUND 7: the linesmen's leavings round the base — a drum, a tyre stack and a sign on
    // the verge. The concrete pad stays: it is standable and you drive over it.
    drum(k, api, api.rng.range(2.6, 3.6), api.rng.range(-2.4, 2.4), api.rng.next() < 0.3);
    tyreStack(k, api, api.rng.range(-3.6, -2.6), api.rng.range(-2.4, 2.4));
    roadSign(k, api, api.rng.range(-1.2, 1.2), api.rng.range(3.2, 4.2), api.rng.range(0, TAU));
    verge(k, api, 3);
    return k;
  },

  /** A hunting blind on stilts, facing away from the road. Somebody sat in this. */
  blind(api) {
    const k = kits();
    const legH = 2.6;
    k.solid.open();               // ROUND 7: Alex named "deer stands' legs". Take the legs,
    for (let i = 0; i < 4; i++) { // take the blind — the whole thing comes down together.
      const sx = (i & 1) ? 1 : -1, sz = (i & 2) ? 1 : -1;
      k.solid.cyl(0.09, 0.11, legH, 5, sx * 0.8, api.padY + legH * 0.5, sz * 0.8, C.wood);
    }
    k.solid.box(2.1, 0.14, 2.1, 0, api.padY + legH, 0, C.plank);
    k.solid.box(1.9, 1.5, 1.9, 0, api.padY + legH + 0.75, 0, C.plank);
    k.solid.box(1.6, 0.5, 0.06, 0, api.padY + legH + 1.05, -0.98, C.dark);   // the slot
    k.solid.gable(2.3, 2.3, api.padY + legH + 1.5, 0.4, 0, 0, 0, C.rust, 0);
    // the ladder
    for (let i = 0; i < 5; i++) k.solid.box(0.7, 0.06, 0.06, 0, api.padY + 0.4 + i * 0.5, 1.15, C.wood);
    k.solid.close(0, 0, 1.6, C.plank);
    api.emit({ kind: 'circle', x: 0, z: 0, r: 1.25, y0: api.padY - 0.2, y1: api.padY + legH + 2.2, tag: 'leg' });
    verge(k, api, 2);
    return k;
  },

  /** A dead orchard: ranks of trees that stopped bearing and were never taken out. */
  orchard(api) {
    const k = kits();
    // The ranks run 13 m across and 9 m deep, so the far corners are well off this
    // minor's own centre height: every trunk stands on the ground beneath it.
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const lx = (c - 1.5) * 4.4 + api.rng.range(-0.6, 0.6);
        const lz = r * 4.4 + api.rng.range(-0.6, 0.6);
        const h = api.rng.range(2.6, 4.2);
        const gy = groundY(api, lx, lz);
        k.solid.open();
        k.solid.cyl(0.13, 0.22, h, 6, lx, gy + h * 0.5 - 0.15, lz, C.wood, 0,
          api.rng.range(-0.10, 0.10), api.rng.range(-0.10, 0.10));
        for (let b = 0; b < 3; b++) {
          k.solid.cyl(0.05, 0.09, api.rng.range(1.0, 1.8), 4, lx, gy + h * 0.86 - 0.15, lz, C.wood,
            api.rng.range(0, TAU), api.rng.range(0.6, 1.1));
        }
        k.solid.close(lx, lz, 0.5, C.wood);
        // ROUND 7: 'sapling', not 'tree'. A 0.13 m dead orchard stem is Alex's "thin
        // saplings" and it is the one thing on this table you can mow a whole rank of.
        api.emit({ kind: 'circle', x: lx, z: lz, r: 0.26, y0: gy - 0.2, y1: gy + h, tag: 'sapling' });
      }
    }
    verge(k, api, 2);
    return k;
  },

  /** A cairn. Somebody has been adding to this, and recently. */
  cairn(api) {
    const k = kits();
    let y = 0;
    k.solid.open();
    for (let i = 0; i < 9; i++) {
      const s = 0.72 - i * 0.062;
      k.solid.box(s, s * 0.42, s * 0.86, api.rng.range(-0.06, 0.06), api.padY + y + s * 0.21,
        api.rng.range(-0.06, 0.06), C.stone, api.rng.range(0, TAU));
      y += s * 0.40;
    }
    k.solid.close(0, 0, 0.7, C.stone);
    api.emit({ kind: 'circle', x: 0, z: 0, r: 0.55, y0: api.padY - 0.2, y1: api.padY + y, tag: 'cairn' });
    verge(k, api, 2);
    return k;
  },

  /**
   * A wrecked car with one headlight that has not given up. The glow is handed back as
   * a `flicker` part so places.js can run it off the sim clock rather than a timer.
   */
  wreck(api) {
    const k = kits();
    const yaw = api.rng.range(0, TAU);
    const roll = api.rng.range(-0.12, 0.12);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const put = (x, z) => ({ x: x * cy + z * sy, z: -x * sy + z * cy });
    // Layered stamped shell reaches the exact old envelope but loses the single toy-block face.
    k.solid.box(4.30, 0.28, 1.85, 0, api.padY + 0.24, 0, ORDINARY.rustDark, yaw, 0, roll);
    k.solid.box(4.06, 0.34, 1.78, -0.02, api.padY + 0.49, 0, ORDINARY.rust, yaw, 0, roll);
    k.solid.box(3.82, 0.22, 1.72, -0.08, api.padY + 0.77, 0, ORDINARY.rustDark, yaw, 0, roll);
    const cab = put(-0.25, 0);
    k.solid.box(2.1, 0.75, 1.70, cab.x, api.padY + 1.32, cab.z, ORDINARY.char, yaw);
    k.solid.box(1.72, 0.08, 1.40, cab.x, api.padY + 1.655, cab.z, ORDINARY.iron, yaw);
    for (const px of [-1.28, 0.78]) {
      const p = put(px, 0);
      k.solid.box(0.055, 0.48, 1.42, p.x, api.padY + 1.34, p.z, C.glass,
        yaw, 0, px < 0 ? -0.16 : 0.16);
    }
    // A buckled but horizontal bonnet skin gives the player the surface the silhouette
    // promises. The body underneath stays canted; only the made, visible plate is flat.
    const hood = put(1.42, 0);
    k.solid.box(1.34, 0.10, 1.50, hood.x, api.padY + 1.07, hood.z, ORDINARY.rustDark, yaw);
    // Side glass, rockers, stamped seams and steel bumpers turn the merged cuboids into a car
    // without lifting any dressing above its existing standable hood/cabin tops.
    for (const side of [-1, 1]) {
      let p = put(-0.25, side * 0.87);
      k.solid.box(1.44, 0.42, 0.045, p.x, api.padY + 1.34, p.z, C.glass, yaw);
      p = put(-0.10, side * 0.94);
      k.solid.box(3.70, 0.14, 0.055, p.x, api.padY + 0.36, p.z, ORDINARY.rustDark, yaw);
      for (const sx of [-0.94, 0.48]) {
        p = put(sx, side * 0.945);
        k.solid.box(0.045, 0.54, 0.04, p.x, api.padY + 0.76, p.z, ORDINARY.char, yaw);
      }
    }
    for (const sx of [-2.13, 2.13]) {
      const p = put(sx, 0);
      k.solid.box(0.13, 0.16, 1.72, p.x, api.padY + 0.45, p.z, ORDINARY.iron, yaw);
    }
    for (const sx of [1.08, 1.40, 1.72]) {
      const p = put(sx, 0);
      k.solid.box(0.045, 0.11, 1.46, p.x, api.padY + 1.045, p.z, ORDINARY.iron, yaw);
    }
    for (let i = 0; i < 4; i++) {
      const sx = (i & 1) ? 1.5 : -1.5, sz = (i & 2) ? 0.85 : -0.85;
      const wheel = put(sx, sz);
      const wx = wheel.x;
      const wz = wheel.z;
      k.solid.tube(0.34, 0.34, 0.24, 10, wx, api.padY + 0.33, wz,
        ORDINARY.char, yaw, Math.PI * 0.5, 0);
      k.solid.cyl(0.13, 0.13, 0.255, 8, wx, api.padY + 0.33, wz,
        ORDINARY.iron, yaw, Math.PI * 0.5, 0);
    }
    // the headlight, on the front-left corner in the car's own frame
    const hx = 2.16 * Math.cos(yaw) + 0.6 * Math.sin(yaw);
    const hz = -2.16 * Math.sin(yaw) + 0.6 * Math.cos(yaw);
    k.glow.pane(0.42, 0.30, hx, api.padY + 0.72, hz, PANE_LAMP, yaw + Math.PI * 0.5, 0, 6, 5);
    api.emit({
      kind: 'obb', x: 0, z: 0, halfX: 2.2, halfZ: 0.95, yaw,
      y0: api.padY - 0.2, y1: api.padY + 1.00, tag: 'vehicle',
    });
    api.emit({
      kind: 'obb', x: hood.x, z: hood.z, halfX: 0.67, halfZ: 0.75, yaw,
      y0: api.padY + 1.02, y1: api.padY + 1.12, tag: 'vehicle', standable: true,
    });
    api.emit({
      kind: 'obb', x: cab.x, z: cab.z, halfX: 1.05, halfZ: 0.85, yaw,
      y0: api.padY + 0.945, y1: api.padY + 1.695, tag: 'vehicle', standable: true,
    });
    k.flicker = { x: hx, y: api.padY + 0.72, z: hz };
    verge(k, api, 3);
    return k;
  },

  /**
   * A MISSING poster on a stake. It AGES with distance from the Filling Station: near the
   * hub the paper is bright and the print is sharp; out at the rim it is grey, curled and
   * the face has all but gone. `api.age` is 0..1, handed in by places.js.
   *
   * REDUCED: EATEN PATH's version paints a real face into a canvas texture
   * (props.js:684 `missingTex`). A texture map is a new shader program against
   * CFG.render.budget.programsMax, so the ageing is carried in the vertex colours instead —
   * the paper greys, the printed block shrinks and the corners curl. See docs/HANDOFF.md.
   */
  poster(api) {
    const k = kits();
    const age = api.age;
    const paper = [
      C.paper[0] * (1 - 0.62 * age), C.paper[1] * (1 - 0.66 * age), C.paper[2] * (1 - 0.70 * age),
    ];
    k.solid.open();
    k.solid.cyl(0.05, 0.06, 1.9, 5, -0.42, api.padY + 0.95, 0, C.wood);
    k.solid.cyl(0.05, 0.06, 1.9, 5, 0.42, api.padY + 0.95, 0, C.wood);
    k.solid.box(1.15, 0.85, 0.05, 0, api.padY + 1.45, 0, C.wood);
    k.solid.quad(0.98, 0.70, 0, api.padY + 1.45, -0.04, paper, Math.PI, api.rng.range(-0.05, 0.05));
    // the face block, shrinking as the poster ages
    const fs = 0.44 * (1 - 0.55 * age);
    k.solid.quad(fs, fs * 1.15, 0, api.padY + 1.56, -0.05, C.dark, Math.PI);
    // curled corners: two small quads leaning off the board
    if (age > 0.3) {
      for (const sx of [-1, 1]) {
        k.solid.quad(0.22, 0.22, sx * 0.40, api.padY + 1.16, -0.07, paper, Math.PI, sx * 0.9 * age);
      }
    }
    k.solid.close(0, 0, 0.8, paper);
    api.emit({ kind: 'circle', x: 0, z: 0, r: 0.55, y0: api.padY - 0.2, y1: api.padY + 1.9, tag: 'sign' });
    // the ones that came loose. OUTSIDE the bracket: paper on the ground is not part of the
    // board and should still be lying there after the board has gone.
    for (let i = 0; i < 2 + Math.round(age * 2); i++) {
      k.solid.quad(0.34, 0.24, api.rng.range(-1.4, 1.4), api.padY + 0.03, api.rng.range(-1.6, 1.6),
        paper, api.rng.range(0, TAU), -Math.PI * 0.5);
    }
    // ROUND 7: whoever nailed the notice up was selling something here first. A trestle
    // stall gone over and two boards, all breakable, all on the verge.
    stall(k, api, api.rng.range(2.2, 3.2), api.rng.range(-1.2, 1.2), api.rng.range(0, TAU));
    aboard(k, api, api.rng.range(-2.6, -1.7), api.rng.range(-1.4, 1.4), api.rng.range(0, TAU));
    aboard(k, api, api.rng.range(1.2, 2.0), api.rng.range(2.0, 3.0), api.rng.range(0, TAU));
    verge(k, api, 2);
    return k;
  },

  /** Search-party gear, left where it was dropped. Nobody came back for it. */
  gear(api) {
    const k = kits();
    k.solid.open();
    k.solid.box(0.9, 0.55, 0.55, 0, api.padY + 0.28, 0, C.cloth, api.rng.range(0, TAU));
    k.solid.box(0.30, 0.14, 0.22, api.rng.range(0.7, 1.4), api.padY + 0.07, api.rng.range(-0.9, 0.9), C.metal, api.rng.range(0, TAU));
    // a stack of poles for a tent nobody put up
    for (let i = 0; i < 4; i++) {
      k.solid.cyl(0.03, 0.03, 1.5, 4, api.rng.range(-1.2, 1.2), api.padY + 0.04, api.rng.range(-1.2, 1.2),
        C.metal, api.rng.range(0, TAU), Math.PI * 0.5);
    }
    // a boot, and then the other one somewhere else
    for (const s of [-1, 1]) {
      k.solid.box(0.28, 0.14, 0.13, s * api.rng.range(0.8, 2.0), api.padY + 0.07,
        api.rng.range(-1.8, 1.8), C.dark, api.rng.range(0, TAU));
    }
    // a torch, still pointing at whatever it was pointing at
    k.solid.cyl(0.05, 0.05, 0.24, 6, api.rng.range(-0.8, 0.8), api.padY + 0.05, api.rng.range(-0.8, 0.8),
      C.metal, api.rng.range(0, TAU), Math.PI * 0.5);
    k.solid.close(0, 0, 0.9, C.cloth);
    api.emit({ kind: 'circle', x: 0, z: 0, r: 0.62, y0: api.padY - 0.2, y1: api.padY + 0.6, tag: 'kit' });
    // ROUND 7: what the search party brought and did not take away. Two crates, a pallet
    // stack and a drum, each one its own collider, so a pass across this lay-by takes four.
    crates(k, api, api.rng.range(1.8, 2.6), api.rng.range(-2.2, -1.2), 2);
    crates(k, api, api.rng.range(-2.6, -1.8), api.rng.range(1.2, 2.2), 1);
    pallets(k, api, api.rng.range(-1.0, 1.0), api.rng.range(2.4, 3.4), api.rng.range(0, TAU));
    drum(k, api, api.rng.range(2.0, 3.0), api.rng.range(1.4, 2.6), api.rng.next() < 0.4);
    verge(k, api, 3);
    return k;
  },

  /**
   * A campfire, OFF the road (placedata CAMPFIRE_OFFSET) and visible from it: somebody sat
   * out the night here, and the embers are still going. A stone ring, a bed of embers that
   * breathes (places.js runs it off the sim clock, like the stack tops), a log to sit on, a
   * lean-to of poles under a tarp, and the pack they left. It is a LIT FIRE: places.js
   * broadcasts place:near {lit: true} at it, so carried XP banks here. No light is created:
   * the embers are the shared additive material at GLOW.ember, and every bright part is
   * under a square metre, low, and read through the stones in front of it.
   *
   * The site's local +Z faces the road (places.js sets yaw to look at it), so the lean-to
   * stands on -Z with its open side to the fire and the road: you see the glow in front of it.
   */
  campfire(api) {
    const k = kits();
    const gy = api.padY;
    // the ring: nine stones, each on the ground under it
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + api.rng.range(-0.12, 0.12);
      const r = 0.72 + api.rng.range(-0.05, 0.05);
      const s = api.rng.range(0.26, 0.40);
      const lx = Math.cos(a) * r, lz = Math.sin(a) * r;
      const g = groundY(api, lx, lz);
      k.solid.box(s, s * 0.7, s * 0.85, lx, g + s * 0.30, lz, C.stone, api.rng.range(0, TAU), 0, api.rng.range(-0.2, 0.2));
    }
    // the ash bed and the embers: a hot core seen from above, and a glow COLUMN that fades
    // out at head height so the fire reads from the road side-on — a flat bed is edge-on
    // at 25 m through pines and measured invisible from the verge (probe, 2026-09-03), the
    // same lesson as the stack tops above.
    k.solid.cyl(0.52, 0.40, 0.14, 10, 0, gy + 0.05, 0, C.ash);
    k.glow.pane(0.90, 0.90, 0, gy + 0.16, 0, PANE_LAMP, 0, -Math.PI * 0.5, 8, 8);
    glowColumn(k.glow, 0, gy + 0.10, 0, 0.42, 1.5, 0.62);
    for (let i = 0; i < 5; i++) {
      k.solid.cyl(0.03, 0.05, api.rng.range(0.35, 0.6), 4, api.rng.range(-0.25, 0.25), gy + 0.20,
        api.rng.range(-0.25, 0.25), C.dark, api.rng.range(0, TAU), api.rng.range(0.9, 1.4));
    }
    api.emit({ kind: 'circle', x: 0, z: 0, r: 0.85, y0: gy - 0.2, y1: gy + 0.32, tag: 'stone', standable: true });
    // the sitting log, to one side of the fire — never between the fire and the road, or it
    // hides the bottom of the glow from a verge 25 m away (measured, probe 8)
    {
      const side = api.rng.next() < 0.5 ? -1 : 1;
      const a = api.rng.range(-0.3, 0.3);
      const lx = side * 1.7, lz = Math.sin(a) * 0.6;
      const g = groundY(api, lx, lz);
      k.solid.cyl(0.19, 0.22, 1.9, 7, lx, g + 0.19, lz, C.wood, a + Math.PI * 0.5, 0, Math.PI * 0.5);
      api.emit({ kind: 'obb', x: lx, z: lz, halfX: 0.95, halfZ: 0.22, yaw: a + Math.PI * 0.5, y0: g - 0.2, y1: g + 0.40, tag: 'wood', standable: true });
    }
    // the lean-to: two poles, a ridge, and a tarp hung over it, open toward the fire and the
    // road. places.js yaws a minor so its local +Z faces the road (yaw = atan2(road - site)),
    // so the shelter stands on -Z, BEHIND the fire as seen from the verge. The first cut had
    // it on +Z and the tarp was a pale sheet between the road and every campfire in the
    // county: measured 0 px of glow from eight of ten road points (tests/sites.mjs).
    {
      const cz = -2.6, w = 2.4, h = 1.7;
      const gL = groundY(api, -w * 0.5, cz), gR = groundY(api, w * 0.5, cz);
      k.solid.cyl(0.04, 0.05, h + 0.2, 5, -w * 0.5, gL + h * 0.5, cz, C.wood, 0, 0, 0.08);
      k.solid.cyl(0.04, 0.05, h + 0.2, 5, w * 0.5, gR + h * 0.5, cz, C.wood, 0, 0, -0.08);
      const ridgeY = (gL + gR) * 0.5 + h;
      k.solid.cyl(0.03, 0.03, w + 0.3, 4, 0, ridgeY, cz, C.wood, 0, 0, Math.PI * 0.5);
      // the tarp: one sloped sheet from the ridge back (-Z) and down to the ground behind.
      // Dark canvas (C.slate), not cloth: a pale sheet was the brightest thing at the site.
      const drop = 1.9;
      const len = Math.hypot(h, drop);
      k.solid.quad(w + 0.2, len, 0, ridgeY - h * 0.5, cz - drop * 0.5, C.slate, 0, Math.atan2(drop, h));
      api.emit({ kind: 'obb', x: 0, z: cz - 1.0, halfX: w * 0.5 + 0.1, halfZ: 1.1, yaw: 0, y0: (gL + gR) * 0.5 - 0.2, y1: ridgeY, tag: 'wood' });
    }
    // the pack they dropped, and a tin
    {
      const px = api.rng.range(0.9, 1.4), pz = api.rng.range(0.6, 1.2);
      const g = groundY(api, px, pz);
      k.solid.box(0.46, 0.38, 0.30, px, g + 0.19, pz, C.cloth, api.rng.range(0, TAU), 0, api.rng.range(-0.3, 0.3));
      k.solid.box(0.18, 0.06, 0.34, px, g + 0.40, pz, C.dark, api.rng.range(0, TAU));
      k.solid.cyl(0.05, 0.05, 0.09, 6, px - 0.4, g + 0.045, pz + 0.3, C.metal);
      api.emit({ kind: 'circle', x: px, z: pz, r: 0.30, y0: g - 0.2, y1: g + 0.42, tag: 'wood', standable: true });
    }
    k.glowColour = GLOW.ember;
    k.ember = true;      // places.js breathes it off the sim clock
    // The lit broadcast (place:near {lit: true} within CAMPFIRE_NEAR_R) is keyed on the
    // kind's `lit` flag in placedata's MINOR_KINDS, not on anything this builder returns:
    // places.js reads the table before any body exists.
    return k;
  },
};

/* ==========================================================================
   THE MAJOR ARRIVAL FRAME — Round 9.

   The tall landmark answers "what is that?" across the county. This answers "where do I
   leave the road, and did I finish it?" at ordinary driving/walking distance. Every real
   major except the already unmistakable Filling Station sign gets one persistent authored
   frame on its road side, plus paired witness stakes that lead into its real composition.
   The little lamp in the frame belongs to the site's existing landmark glow: weak/breathing
   before completion, full after it. No label, arrow, HUD text, or fake interaction.
   ========================================================================== */
export function majorApproach(api) {
  const a = api && api.site ? api.site.approach : null;
  if (!a || a.existing) return null;
  const k = kits();
  const x = +a.x || 0, z = +a.z || 0, w = Math.max(6, +a.w || 8), h = Math.max(7, +a.h || 8);
  const style = a.style || api.site.kind;
  const stone = style === 'manor' || style === 'cathedral' || style === 'chapel'
    || style === 'cemetery' || style === 'tower' || style === 'steeple' || style === 'lighthouse'
    || style === 'stones' || style === 'rock-arch';
  const industrial = style === 'works' || style === 'relay';
  const col = stone ? C.stone : industrial ? C.metal : C.wood;
  const gy = groundY(api, x, z);
  const postX = w * 0.5;

  // The clear mouth is never less than five metres: car and player both understand it as
  // an entrance, while the two uprights remain large enough to survive torch and fog.
  for (const s of [-1, 1]) {
    const px = x + s * postX;
    const py = groundY(api, px, z);
    if (style === 'lighthouse' || style === 'tower' || style === 'steeple') {
      k.solid.tube(0.58, 0.78, h, 10, px, py + h * 0.5, z, col);
      k.solid.cone(0.92, 1.25, style === 'lighthouse' ? 10 : 4, px, py + h + 0.62, z, C.slate);
      api.emit({ kind: 'circle', x: px, z, r: 0.80, y0: py - 0.3, y1: py + h, tag: 'wall' });
    } else {
      const pw = industrial ? 0.62 : 0.82;
      k.solid.box(pw, h, pw, px, py + h * 0.5, z, col);
      api.emit({ kind: 'obb', x: px, z, halfX: pw * 0.5, halfZ: pw * 0.5, yaw: 0,
        y0: py - 0.3, y1: py + h, tag: industrial ? 'metal' : 'wall' });
    }
  }
  k.solid.box(w + 1.0, 0.62, industrial ? 0.48 : 0.72, x, gy + h - 0.42, z, col);

  // Each family has one different crown. The destination behind it remains the actual
  // unique silhouette; this smaller gesture stops eleven gates becoming copy-paste signs.
  if (style === 'works') {
    const len = Math.hypot(w * 0.5, 2.4);
    k.solid.box(len, 0.28, 0.30, x - w * 0.25, gy + h + 0.55, z, C.rust, 0, 0, 0.45);
    k.solid.box(len, 0.28, 0.30, x + w * 0.25, gy + h + 0.55, z, C.rust, 0, 0, -0.45);
  } else if (style === 'relay') {
    for (const s of [-1, 1]) k.solid.cyl(0.12, 0.12, 2.8, 7, x + s * 1.0, gy + h + 1.1, z, C.metal);
    k.solid.box(2.4, 0.18, 0.20, x, gy + h + 2.35, z, C.rust);
  } else if (style === 'mill') {
    k.solid.box(0.32, 3.8, 0.28, x, gy + h + 0.8, z, C.plank, 0, 0, Math.PI * 0.25);
    k.solid.box(0.32, 3.8, 0.28, x, gy + h + 0.8, z, C.plank, 0, 0, -Math.PI * 0.25);
  } else if (style === 'barn') {
    const len = Math.hypot(w * 0.5, 2.2);
    k.solid.box(len, 0.34, 0.40, x - w * 0.25, gy + h + 0.52, z, C.rust, 0, 0, 0.46);
    k.solid.box(len, 0.34, 0.40, x + w * 0.25, gy + h + 0.52, z, C.rust, 0, 0, -0.46);
  } else if (style === 'manor') {
    for (const s of [-1, 1]) k.solid.cone(0.72, 1.8, 4, x + s * 2.0, gy + h + 0.9, z, C.slate, Math.PI * 0.25);
  } else if (style === 'cathedral') {
    k.solid.cone(1.15, 3.2, 6, x, gy + h + 1.55, z, C.slate);
  } else if (style === 'cemetery') {
    k.solid.box(0.34, 2.5, 0.34, x, gy + h + 1.0, z, C.stone);
    k.solid.box(1.8, 0.34, 0.34, x, gy + h + 1.55, z, C.stone);
  } else if (style === 'chapel') {
    k.solid.cone(0.86, 2.2, 4, x, gy + h + 1.0, z, C.slate, Math.PI * 0.25);
  } else if (style === 'stones') {
    for (const s of [-1, 0, 1]) k.solid.box(0.70, 3.1 - Math.abs(s) * 0.5, 0.70,
      x + s * 1.35, gy + h + 1.2, z, s ? C.stone : C.slate, s * 0.14, 0, s * 0.10);
    k.solid.box(4.1, 0.46, 0.82, x, gy + h + 2.55, z, C.rust, 0, 0, -0.06);
  } else if (style === 'great-tree') {
    k.solid.box(0.70, 4.6, 0.70, x, gy + h + 1.8, z, C.wood);
    k.solid.box(4.6, 0.42, 0.42, x, gy + h + 2.5, z, C.plank, 0, 0, 0.55);
    k.solid.box(4.6, 0.42, 0.42, x, gy + h + 2.5, z, C.plank, 0, 0, -0.55);
  } else if (style === 'rock-arch') {
    for (const s of [-1, 1]) k.solid.box(0.90, 3.2, 1.0, x + s * 1.55,
      gy + h + 1.2, z, C.slate, 0, 0, s * 0.08);
    k.solid.box(4.2, 0.75, 1.15, x, gy + h + 2.9, z, C.dark, 0, 0, 0.05);
  } else {
    k.solid.tube(0.72, 0.72, 0.42, 12, x, gy + h + 0.35, z, C.rust, Math.PI * 0.5, 0, 0);
  }

  // The road-facing state witness: a dark cage with a small vertical lamp. It shares the
  // site's completion ripple, so a claimed place reads as powered from the same approach.
  k.solid.box(1.42, 1.72, 0.34, x, gy + h - 2.0, z + 0.42, C.dark);
  k.solid.box(0.18, 2.15, 0.18, x, gy + h - 3.82, z, C.metal);
  k.glow.pane(0.42, 0.62, x, gy + h - 2.0, z + 0.61, PANE_LAMP, 0, 0, 6, 7);
  glowColumn(k.glow, x, gy + h - 2.25, z + 0.58, 0.32, 1.15, 0.55);

  // Paired low lamps draw a traversable lane from the frame into the actual site. They do
  // not pretend to be completion fixtures; they make the route to the real one readable.
  const tx = Number.isFinite(a.routeX) ? a.routeX : (+api.site.claim.dx || 0);
  const tz = Number.isFinite(a.routeZ) ? a.routeZ : (+api.site.claim.dz || 0);
  const vx = tx - x, vz = tz - z, vl = Math.hypot(vx, vz) || 1;
  const nx = -vz / vl, nz = vx / vl;
  for (let i = 1; i <= 4; i++) {
    const t = i / 5, cx = x + vx * t, cz = z + vz * t;
    for (const s of [-1, 1]) {
      const px = cx + nx * 1.35 * s, pz = cz + nz * 1.35 * s;
      const py = groundY(api, px, pz);
      k.solid.cyl(0.10, 0.14, 0.72, 7, px, py + 0.36, pz, industrial ? C.metal : C.wood);
      k.glow.pane(0.16, 0.20, px, py + 0.64, pz, PANE_LAMP, 0, 0, 3, 3);
      api.emit({ kind: 'circle', x: px, z: pz, r: 0.15, y0: py - 0.1, y1: py + 0.72,
        tag: industrial ? 'metal' : 'wood' });
    }
  }
  return { solid: k.solid.build(), glow: k.glow.build(), glowColour: GLOW.lamp };
}

/* ==========================================================================
   The apron. Every major stands on one.

   A FLATS disc levels the terrain FUNCTION; this levels the LOOK. It is a disc of made
   ground at the pad height with a skirt whose lower rim follows terrain.heightAt, so the
   seam between the yard and the hill is closed even when the disc has to be rolled back
   (see the note in places.js about terrain.ready()).
   ========================================================================== */
// Slightly under the chunk ground's 0.55: made ground is meant to read as made, so it keeps
// a little of its evenness rather than pretending to be forest floor.
const APRON_DETAIL_AMP = 0.42;

/* ------------------------------------------------------------- the road approach --
 * ROUND 6 (lane D2's route audit, 2026-09-03). Walking the real controller from the road to
 * every claim found five pads a body cannot get onto: the road runs past the yard at
 * 25-30 m, roads.js baked its spline elevations before the pads registered their discs
 * (the boot note from places._measureSeam), and where the two disagree the ground is a
 * step of 3.0-5.8 m over about a metre and a half - a wall to controller.js, which backs
 * out of any rise past STEP_UP. MEASURED at the road point nearest each centre, road minus
 * pad, along local +Z (places.js sends local +Z to the road point): cathedral +5.8,
 * chapel -5.8, bell-tower -5.3, jackfield +4.5, garden-of-rest +3.0, drowned-light -2.6,
 * relay -0.7 over 6 m (a 0.27 grade, walkable), the other five 0.
 *
 * So every major measures its own seam at build time and, where the seam is more than a
 * step, cuts a flight of stone steps into it: on the lower side's level ground, running
 * ALONG the bank (a flight straight up a 5 m bank would have to be steeper than the bank,
 * and APPROACH_RISE caps it at 0.68), with a slab at the upper level bridging the bank
 * from the top of the flight to the upper ground, and a parapet down each side so it
 * reads as a cut in a wall and not as a ledge. Built from the ground it measures, so a
 * site whose seam is under a step builds nothing and the whole thing disappears by itself
 * the day roads.js re-bakes after the pads exist. Every step is a standable collider
 * emitted as it is placed; tests/manor.mjs walks every one of them.
 */
const APPROACH_RISE = 0.42, APPROACH_RUN = 0.62, APPROACH_W = 2.0;
// What each site built, by id, in its LOCAL frame: null when the seam was under a step.
// tests/manor.mjs walks foot -> top -> pad on every one that exists.
const APPROACHES = new Map();
export function approachFor(id) { return APPROACHES.has(id) ? APPROACHES.get(id) : null; }
// Where a building stands across the road side at x 0, the flight is cut beside it: the
// cathedral's nave is 17 m wide and runs to z 35, past the pad's edge and up to the road.
const APPROACH_X = { cathedral: -17 };
function roadApproach(k, api, radius) {
  APPROACHES.set(api.site.id, null);
  const pad = api.padY;
  const ax = APPROACH_X[api.site.kind] || 0;
  // The Garden's three-metre seam needs a little more breathing room than the standard
  // cut. Its 2 m flight left only 0.64 m of capsule-centre clearance inside the rails,
  // narrower than the route's ordinary cornering envelope. Keep every other destination's
  // established profile; widen the Garden's visible structure and exact colliders together.
  const approachW = api.site.id === 'garden-of-rest' ? 2.4 : APPROACH_W;
  const g = (lz) => api.heightAt(api.wx(ax, lz), api.wz(ax, lz));
  const zMax = radius / 0.86 + 6;
  // the pad's edge: the last quarter-metre out along +Z that is still at pad level
  let padEnd = 0;
  for (let z = 6; z <= zMax; z += 0.25) { if (Math.abs(g(z) - pad) <= 0.25) padEnd = z; else break; }
  if (padEnd < 6 || padEnd >= zMax - 1) return;
  APPROACHES.set(api.site.id, { padEnd });
  // the far side of the bank: the first point past it where the ground is level for a
  // full two metres. MEASURED 2026-09-03 at the bell tower: a quarter-metre test stopped
  // on a shoulder 0.27 m above the road, and the first riser came out at 0.69 - a wall.
  let roadStart = -1, maxGrade = 0;
  for (let z = padEnd; z <= zMax; z += 0.25) {
    const a = g(z), b = g(z + 0.25), c = g(z + 1.0), d2 = g(z + 2.0);
    const grade = Math.abs(b - a) / 0.25;
    if (grade > maxGrade) maxGrade = grade;
    // a road has a crown (0.1 m over a metre, measured at the bell tower); a shoulder
    // climbs faster than that
    if (z > padEnd + 0.5 && Math.abs(b - a) < 0.05 && Math.abs(c - a) < 0.12 && Math.abs(d2 - a) < 0.25 && Math.abs(a - pad) > CFG.player.STEP_UP) { roadStart = z; break; }
  }
  APPROACHES.set(api.site.id, { padEnd, roadStart, maxGrade: +maxGrade.toFixed(2) });
  if (roadStart < 0) return;
  // the flight's foot sits at the lowest (road below) or highest (road above) ground in
  // its own 2.5 m band, so its first riser is never a wall
  let roadY = g(roadStart);
  for (let z = roadStart; z <= roadStart + 2.5; z += 0.25) { const v = g(z); if ((v < pad && v < roadY) || (v > pad && v > roadY)) roadY = v; }
  const drop = roadY - pad;
  APPROACHES.set(api.site.id, { padEnd, roadStart, maxGrade: +maxGrade.toFixed(2), drop: +drop.toFixed(2) });
  if (Math.abs(drop) <= CFG.player.STEP_UP || maxGrade < 1.0) return;

  const lowY = Math.min(pad, roadY), highY = Math.max(pad, roadY), rise = highY - lowY;
  const steps = Math.ceil(rise / APPROACH_RISE);
  const run = APPROACH_RUN, L = steps * run;
  const roadLower = roadY < pad;
  // the flight's z band: on the lower side's level ground, hard against the bank
  const zA = roadLower ? roadStart + 0.3 : padEnd - 0.3 - approachW;
  const zB = zA + approachW, zc = (zA + zB) * 0.5;
  const x0 = ax - L * 0.5, base = lowY - 0.4;
  for (let s = 0; s < steps; s++) {
    const top = lowY + Math.min(rise, APPROACH_RISE * (s + 1));
    const xc = x0 + run * (s + 0.5);
    // Draw an actual tread and riser, not a solid column from the lowest ground to every
    // successive step. Those full-height boxes joined into an enormous pale triangle when
    // seen side-on from the road: at Drowned Light and the Bell Tower the "way in" hid the
    // destination it was meant to reveal. Collision keeps the full stepped support below,
    // but the visible structure is an open, repaired stair carried on narrow steel piers.
    k.box(run + 0.03, 0.18, approachW, xc, top - 0.09, zc,
      s % 3 === 0 ? C.rust : C.slate);
    k.box(0.12, Math.min(APPROACH_RISE, top - lowY), approachW,
      xc - run * 0.5 + 0.06, top - Math.min(APPROACH_RISE, top - lowY) * 0.5,
      zc, C.dark);
    if (s === 0 || s === steps - 1 || (s & 1) === 0) {
      const supportH = Math.max(0.18, top - base - 0.18);
      for (const side of [-1, 1]) k.box(0.18, supportH, 0.18,
        xc, base + supportH * 0.5, zc + side * (approachW * 0.5 - 0.16), C.dark);
    }
    api.emit({
      kind: 'obb', x: xc, z: zc, halfX: run * 0.5, halfZ: approachW * 0.5, yaw: 0,
      y0: base, y1: top, tag: 'stone', standable: true,
    });
  }
  // the bridge at the upper level: over the last step, out past the flight's end, and
  // across the bank to the upper ground
  const bz0 = roadLower ? padEnd - 0.6 : zA, bz1 = roadLower ? zB : roadStart + 0.6;
  const bx0 = x0 + L - run, bx1 = x0 + L + 1.4;
  k.box(bx1 - bx0, 0.5, bz1 - bz0, (bx0 + bx1) * 0.5, highY - 0.25, (bz0 + bz1) * 0.5, C.stone);
  api.emit({
    kind: 'obb', x: (bx0 + bx1) * 0.5, z: (bz0 + bz1) * 0.5, halfX: (bx1 - bx0) * 0.5, halfZ: (bz1 - bz0) * 0.5, yaw: 0,
    y0: highY - 0.5, y1: highY, tag: 'stone', standable: true,
  });
  APPROACHES.set(api.site.id, {
    padEnd, roadStart, maxGrade: +maxGrade.toFixed(2), drop: +drop.toFixed(2), steps, roadLower,
    // the walk: onto the foot of the flight, up it, onto the bridge, onto the upper ground
    foot: { x: x0 + 0.4, z: zc }, top: { x: x0 + L - run * 0.5, z: zc },
    bridge: { x: (bx0 + bx1) * 0.5, z: roadLower ? padEnd - 0.3 : roadStart + 0.3 },
    landing: { x: (bx0 + bx1) * 0.5, z: roadLower ? padEnd - 2.5 : roadStart + 2.5 },
  });
  // Open handrails down both sides of the flight. The collision rails below deliberately
  // remain continuous, but the visible bars and posts leave the destination readable
  // through them. The bank-side one stops where the bridge leaves the flight (it stood
  // across the bridge on the first cut, measured: the walker rounded its end onto the last
  // 0.4 m of the slab).
  const pitch = Math.atan2(rise, L);
  const bankSide = roadLower ? zA - 0.16 : zB + 0.16, farSide = roadLower ? zB + 0.16 : zA - 0.16;
  const full = Math.hypot(L, rise) + 0.4;
  k.box(full, 0.14, 0.14, x0 + L * 0.5, lowY + rise * 0.5 + 0.92,
    farSide, C.rust, 0, 0, pitch);
  api.emit({
    kind: 'obb', x: x0 + L * 0.5, z: farSide, halfX: full * 0.5, halfZ: 0.16, yaw: 0,
    y0: lowY - 0.3, y1: highY + 1.0, tag: 'wall',
  });
  const cut = (bx0 - 0.3) - (x0 - 0.2);                 // the bank-side parapet's run
  const cutRise = rise * cut / L;
  k.box(Math.hypot(cut, cutRise), 0.14, 0.14, x0 - 0.2 + cut * 0.5,
    lowY + cutRise * 0.5 + 0.92, bankSide, C.rust, 0, 0, pitch);
  api.emit({
    kind: 'obb', x: x0 - 0.2 + cut * 0.5, z: bankSide, halfX: Math.hypot(cut, cutRise) * 0.5, halfZ: 0.16, yaw: 0,
    y0: lowY - 0.3, y1: lowY + cutRise + 1.0, tag: 'wall',
  });
  // Repeated uprights make the sloping bars legible as handrails even in torchlight.
  for (let s = 0; s <= steps; s += 2) {
    const t = s / steps, px = x0 + L * t, py = lowY + rise * t;
    for (const side of [bankSide, farSide])
      k.box(0.10, 0.92, 0.10, px, py + 0.46, side, C.rust);
  }
}

export function apron(api, radius, col) {
  const k = new Kit();
  roadApproach(k, api, radius);
  // 28 x 4 put 113 vertices under a 40 m disc — one every three and a half metres, which
  // cannot carry material detail however it is coloured, and it is why the apron measured as
  // one flat plane across 40% of the opening frame. 56 x 12 is 673 vertices, roughly one per
  // 1.2 m, matching the chunk ground's own density, and it is still a rounding error against
  // a two-million-triangle county.
  const N = 56, RINGS = 12, LIFT = 0.08;
  const pos = [], nor = [], uv = [], idx = [];
  // PROJECTED ON THE HEIGHTFIELD, never authored above it. That is roads.js's own rule for
  // its ribbon ("the ribbon is PROJECTED onto the heightfield, never authored above it, so
  // it cannot float or sink relative to the ground"). Where the site's FLATS disc took,
  // heightAt IS the pad and this comes out perfectly flat; where it did not, the yard
  // drapes over the real hill. One rule, right in both worlds, and it can never disagree
  // with the surface collision is standing the player on.
  // Sampled at the WORLD position of each vertex, so the apron's break-up is continuous with
  // the chunk ground it meets at its edge — the seam between made ground and real ground is
  // where a flat pad announces itself.
  const det = [];
  const detAt = (cx, cz) => groundDetail(api.wx(cx, cz), api.wz(cx, cz));
  pos.push(0, api.heightAt(api.wx(0, 0), api.wz(0, 0)) + LIFT, 0);
  nor.push(0, 1, 0); uv.push(0.5, 0.5); det.push(detAt(0, 0));
  for (let r = 1; r <= RINGS; r++) {
    const rr = radius * (r / RINGS);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr;
      pos.push(cx, api.heightAt(api.wx(cx, cz), api.wz(cx, cz)) + LIFT, cz);
      nor.push(0, 1, 0); det.push(detAt(cx, cz));
      uv.push(0.5 + Math.cos(a) * 0.5 * (r / RINGS), 0.5 + Math.sin(a) * 0.5 * (r / RINGS));
    }
  }
  for (let i = 0; i < N; i++) idx.push(0, 1 + ((i + 1) % N), 1 + i);
  for (let r = 1; r < RINGS; r++) {
    const a = 1 + (r - 1) * N, b = 1 + r * N;
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      idx.push(a + i, a + j, b + i, a + j, b + j, b + i);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(pos), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(nor), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(Float32Array.from(uv), 2));
  g.setIndex(idx);
  k.push(g, col || C.ash);
  // Kit.push writes ONE flat colour across every vertex. Modulate it in place by the field,
  // centred on 1 so the apron's mean value does not move — ART.md 3.1 says give the ground
  // spread, not exposure, and marks its mean "do not darken".
  const ca = g.getAttribute('color');
  if (ca && det.length === ca.count) {
    const arr = ca.array;
    for (let i = 0; i < ca.count; i++) {
      const m = 1 + APRON_DETAIL_AMP * det[i];
      arr[i * 3] *= m; arr[i * 3 + 1] *= m; arr[i * 3 + 2] *= m;
    }
    ca.needsUpdate = true;
  }
  return k.build();
}

export { C as SITE_COLOURS };
// ROUND 7: the kit toolkit is shared. New dress modules (dress-station.js,
// dress-interiors.js, staged.js) build with exactly these helpers so a prop authored in a
// lane's own file is indistinguishable from one authored here. Nothing below is new code.
export {
  C, Kit, kits, groundY, shell, glowColumn, sash, lattice, yardWall,
  PANE_WINDOW, PANE_TUBE, PANE_SIGN, PANE_ROSE, PANE_LAMP, recordPane,
};
export default BUILDERS;
