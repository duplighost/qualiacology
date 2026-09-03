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
// donor: Projects/qualiacology/skyshard/src/world/destinations.js:95-107 (`_beacon`) — the
//   beacon column geometry is rebuilt in places.js; this file only says how tall.
// donor: Projects/eaten-path/src/world/props.js:660-700 (`bicycle`, `flyers`) — the
//   environmental-storytelling minors: someone was here and is not now.
//
// No THREE object here is added to a scene. Builders return geometry and places.js owns
// every Mesh, every material and every add()/remove().

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, clamp } from '../engine/math.js';
import CFG from '../config.js';           // ROUND 6: roadApproach reads CFG.player.STEP_UP
// The county's material break-up field, three octaves in world space. The chunk ground and
// the road ribbon already take it (chunks.js:679, :787); the destination aprons never did,
// and an apron is the single largest surface in the opening frame.
import { groundDetail } from './terrain.js';
// ROUND 6: Blackthorn Manor is compiled from its own room tables in manor.js and handed
// this file's kit vocabulary through a factory, so there is no import cycle.
import { makeManorBuilder } from './manor.js';

/* ==========================================================================
   Palette. LINEAR-space albedos, in the same band terrain.js settled on after
   measurement (REGIONS[].ground is 0.08-0.15). Structures sit a little ABOVE the
   ground band on purpose: a building has to read as a made thing at 60 m under a
   moon, and the M0 lesson was that FETCH's albedos render as a void here.
   ========================================================================== */
const C = {
  stone: [0.175, 0.175, 0.170],
  dark: [0.105, 0.108, 0.115],
  slate: [0.085, 0.092, 0.104],
  wood: [0.140, 0.108, 0.082],
  plank: [0.180, 0.148, 0.106],
  metal: [0.128, 0.134, 0.146],
  rust: [0.176, 0.098, 0.062],
  plaster: [0.265, 0.252, 0.232],
  brick: [0.196, 0.124, 0.100],
  glass: [0.050, 0.062, 0.082],
  soil: [0.098, 0.088, 0.072],
  ash: [0.130, 0.126, 0.122],
  cloth: [0.230, 0.216, 0.190],
  paper: [0.320, 0.306, 0.270],
};

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
  constructor() { this.parts = []; }

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
    const merged = this.parts.length === 1 ? this.parts[0] : mergeGeometries(this.parts, false);
    if (this.parts.length > 1) for (const g of this.parts) g.dispose();
    this.parts.length = 0;
    if (merged) merged.computeBoundingSphere();
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
 * A short glow column on the GLOW kit: an open tapered cylinder whose vertex colour falls to
 * nothing at the top, the beacon's own construction at prop scale. `gain` scales the whole
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
  api.emit({
    kind: 'circle', x: lx, z: lz, r: base * 1.05,
    y0: api.padY - 0.3, y1: api.padY + height, tag: tag || 'metal',
  });
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
      k.solid.box(1.7, 0.07, 0.42, -8.4, api.padY + 0.46, -3.72, C.plank);
      for (const bx of [-9.1, -7.7]) k.solid.box(0.08, 0.44, 0.40, bx, api.padY + 0.22, -3.72, C.metal);
      api.emit({ kind: 'obb', x: -8.4, z: -3.72, halfX: 0.85, halfZ: 0.21, yaw: 0, y0: api.padY - 0.2, y1: api.padY + 0.50, tag: 'wood', standable: true });
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
        mapBoard: { x: -8.4, y: api.padY + 1.9, z: -3.29, w: 2.7, h: 1.66, yaw: Math.PI },
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
      for (let i = 0; i < 3; i++) {
        k.solid.box(4.2, 3.0, 4.2, -2 + i * 5.0, api.padY + 1.5, 12, C.rust);
        api.emit({
          kind: 'obb', x: -2 + i * 5.0, z: 12, halfX: 2.1, halfZ: 2.1, yaw: 0,
          y0: api.padY, y1: api.padY + 3.0, tag: 'metal',
        });
      }
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
      // three guy wires, thin enough to read as wires rather than pipes
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + 0.4;
        const gx = Math.cos(a) * 21, gz = Math.sin(a) * 21;
        const len = Math.hypot(42, 21);
        const g = new THREE.CylinderGeometry(0.035, 0.035, len, 4);
        g.rotateZ(-Math.atan2(gx, 42));
        g.rotateX(Math.atan2(gz, 42));
        g.translate(gx * 0.5, api.padY + 21, gz * 0.5);
        k.solid.push(g, C.metal);
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
      shell(k.solid, api, -7.5, 6.5, 6, 5, 3.0, 0, C.plaster, 2.0);
      k.solid.gable(6.4, 5.4, api.padY + 3.0, 0.7, -7.5, 0, 6.5, C.slate, 0);
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
  // The far beacon from the first frame. 77 m to the tip of the spire, on the highest
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
      k.solid.box(6.0, 19, 6.0, 0, api.padY + 9.5, -4, C.stone);
      k.solid.cone(4.2, 5.4, 4, 0, api.padY + 21.7, -4, C.slate);
      api.emit({
        kind: 'obb', x: 0, z: -4, halfX: 3.0, halfZ: 3.0, yaw: 0,
        y0: api.padY - 0.3, y1: api.padY + 19, tag: 'wall',
      });
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
    // gallery floor is a ring of standable segments, and the lamp-room floor is a 216-deg
    // sector so the stair can arrive through the remaining 144.
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
        // the collider: a rectangle from the post to the wall, as wide as the wedge is at
        // its outer rim, so the rim is covered and only the inner ends overlap
        const rc = (POST_R + rOut) * 0.5;
        api.emit({
          kind: 'obb', x: Math.cos(a) * rc, z: Math.sin(a) * rc,
          halfX: (rOut - POST_R) * 0.5, halfZ: 0.55, yaw: -a,
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
      //      that is a 216-degree sector (the stair arrives through the rest), the lamp on
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
        // the floor sector: from 8 degrees past the arrival, round 216 degrees
        const S0 = ARRIVE_A + 0.14, SPAN = TAU * 0.6;
        const fl = new THREE.CylinderGeometry(2.9, 2.9, 0.2, 14, 1, false, theta(S0 + SPAN), SPAN);
        fl.translate(0, api.padY + F - 0.1, 0);
        k.solid.push(fl, C.metal);
        const NW = 9;
        for (let i = 0; i < NW; i++) {
          const a = S0 + SPAN * (i + 0.5) / NW;
          api.emit({
            kind: 'obb', x: Math.cos(a) * 1.45, z: Math.sin(a) * 1.45, halfX: 1.45, halfZ: 2.9 * Math.tan(SPAN / NW * 0.5), yaw: -a,
            y0: api.padY + F - 0.2, y1: api.padY + F, tag: 'metal', standable: true,
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
      // the beam, authored around the lamp so places.js can turn it. An open cone laid on
      // its side: 80 m long, widening to 9 m, additive and never fogged.
      const bk = new Kit();
      const beam = new THREE.CylinderGeometry(0.5, 4.5, 80, 10, 1, true);
      beam.rotateX(Math.PI * 0.5);
      beam.translate(0, 0, 40);
      bk.push(beam, [1, 1, 1]);
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
        shell(k.solid, api, lx, lz, 4.0, 4.6, 3.0, api.rng.range(-0.2, 0.2), C.stone, 1.4);
        k.solid.gable(4.4, 5.0, api.padY + 3.0, 0.9, lx, 0, lz, C.slate, 0);
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

/* ==========================================================================
   MINOR SITES.

   Small, cheap, and the reason a 900 m leg between two majors is not empty. Every one is
   a single merged geometry plus at most one collider, and each is a piece of the same
   sentence: people used this road, and then they stopped.

   donor: Projects/eaten-path/src/world/props.js:660-700 — the vocabulary (the bike, the
   notice board of MISSING posters, the dead car). Re-kitted to a rural county road.
   ========================================================================== */

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
    let gy0 = api.padY, gyN = api.padY;
    for (let i = 0; i < n; i++) {
      const lx = (i - (n - 1) * 0.5) * 2.3;
      const down = api.rng.next() < 0.34;
      const h = down ? 0.3 : api.rng.range(1.0, 1.4);
      const gy = groundY(api, lx, 0);
      if (i === 0) gy0 = gy;
      if (i === n - 1) gyN = gy;
      k.solid.cyl(0.08, 0.10, h + 0.3, 5, lx, gy + h * 0.5 - 0.15, 0, C.wood,
        0, down ? api.rng.range(0.9, 1.5) : api.rng.range(-0.1, 0.1), api.rng.range(-0.12, 0.12));
      if (i < n - 1 && !down) {
        k.solid.box(2.3, 0.10, 0.06, lx + 1.15, groundY(api, lx + 1.15, 0) + h * 0.66, 0, C.wood,
          0, 0, api.rng.range(-0.06, 0.06));
      }
    }
    // one collider for the run, spanning from the lower end to the top of the higher one
    const lo = Math.min(gy0, gyN), hi = Math.max(gy0, gyN);
    // yaw 0, NOT api.yaw: emit() composes the shape's yaw with the site's own
    // (places.js _buildMinor), so passing api.yaw here turned the collider twice and left
    // an invisible wall lying across the road at double the fence's angle.
    api.emit({
      kind: 'obb', x: 0, z: 0, halfX: 8.2, halfZ: 0.18, yaw: 0,
      y0: lo - 0.2, y1: hi + 1.1, tag: 'fence',
    });
    return k;
  },

  /** A waystone: one carved stone that has been telling you the same thing for 300 years. */
  waystone(api) {
    const k = kits();
    const h = api.rng.range(1.3, 1.9);
    k.solid.box(0.62, h, 0.30, 0, api.padY + h * 0.5, 0, C.stone, api.rng.range(0, TAU), 0,
      api.rng.range(-0.10, 0.10));
    k.solid.box(1.0, 0.2, 0.8, 0, api.padY + 0.1, 0, C.stone);
    api.emit({ kind: 'circle', x: 0, z: 0, r: 0.45, y0: api.padY - 0.2, y1: api.padY + h, tag: 'stone' });
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
    return k;
  },

  /** A hunting blind on stilts, facing away from the road. Somebody sat in this. */
  blind(api) {
    const k = kits();
    const legH = 2.6;
    for (let i = 0; i < 4; i++) {
      const sx = (i & 1) ? 1 : -1, sz = (i & 2) ? 1 : -1;
      k.solid.cyl(0.09, 0.11, legH, 5, sx * 0.8, api.padY + legH * 0.5, sz * 0.8, C.wood);
    }
    k.solid.box(2.1, 0.14, 2.1, 0, api.padY + legH, 0, C.plank);
    k.solid.box(1.9, 1.5, 1.9, 0, api.padY + legH + 0.75, 0, C.plank);
    k.solid.box(1.6, 0.5, 0.06, 0, api.padY + legH + 1.05, -0.98, C.dark);   // the slot
    k.solid.gable(2.3, 2.3, api.padY + legH + 1.5, 0.4, 0, 0, 0, C.rust, 0);
    // the ladder
    for (let i = 0; i < 5; i++) k.solid.box(0.7, 0.06, 0.06, 0, api.padY + 0.4 + i * 0.5, 1.15, C.wood);
    api.emit({ kind: 'circle', x: 0, z: 0, r: 1.25, y0: api.padY - 0.2, y1: api.padY + legH + 2.2, tag: 'wood' });
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
        k.solid.cyl(0.13, 0.22, h, 6, lx, gy + h * 0.5 - 0.15, lz, C.wood, 0,
          api.rng.range(-0.10, 0.10), api.rng.range(-0.10, 0.10));
        for (let b = 0; b < 3; b++) {
          k.solid.cyl(0.05, 0.09, api.rng.range(1.0, 1.8), 4, lx, gy + h * 0.86 - 0.15, lz, C.wood,
            api.rng.range(0, TAU), api.rng.range(0.6, 1.1));
        }
        api.emit({ kind: 'circle', x: lx, z: lz, r: 0.26, y0: gy - 0.2, y1: gy + h, tag: 'tree' });
      }
    }
    return k;
  },

  /** A cairn. Somebody has been adding to this, and recently. */
  cairn(api) {
    const k = kits();
    let y = 0;
    for (let i = 0; i < 9; i++) {
      const s = 0.72 - i * 0.062;
      k.solid.box(s, s * 0.42, s * 0.86, api.rng.range(-0.06, 0.06), api.padY + y + s * 0.21,
        api.rng.range(-0.06, 0.06), C.stone, api.rng.range(0, TAU));
      y += s * 0.40;
    }
    api.emit({ kind: 'circle', x: 0, z: 0, r: 0.55, y0: api.padY - 0.2, y1: api.padY + y, tag: 'stone' });
    return k;
  },

  /**
   * A wrecked car with one headlight that has not given up. The glow is handed back as
   * a `flicker` part so places.js can run it off the sim clock rather than a timer.
   */
  wreck(api) {
    const k = kits();
    const yaw = api.rng.range(0, TAU);
    k.solid.box(4.3, 0.85, 1.85, 0, api.padY + 0.62, 0, C.rust, yaw, 0, api.rng.range(-0.12, 0.12));
    k.solid.box(2.1, 0.75, 1.70, -0.25, api.padY + 1.32, 0, C.dark, yaw);
    for (let i = 0; i < 4; i++) {
      const sx = (i & 1) ? 1.5 : -1.5, sz = (i & 2) ? 0.85 : -0.85;
      const wx = sx * Math.cos(yaw) + sz * Math.sin(yaw);
      const wz = -sx * Math.sin(yaw) + sz * Math.cos(yaw);
      k.solid.tube(0.33, 0.33, 0.22, 8, wx, api.padY + 0.33, wz, C.dark, 0, 0, Math.PI * 0.5);
    }
    // the headlight, on the front-left corner in the car's own frame
    const hx = 2.16 * Math.cos(yaw) + 0.6 * Math.sin(yaw);
    const hz = -2.16 * Math.sin(yaw) + 0.6 * Math.cos(yaw);
    k.glow.pane(0.42, 0.30, hx, api.padY + 0.72, hz, PANE_LAMP, yaw + Math.PI * 0.5, 0, 6, 5);
    api.emit({
      kind: 'obb', x: 0, z: 0, halfX: 2.2, halfZ: 0.95, yaw,
      y0: api.padY - 0.2, y1: api.padY + 1.7, tag: 'vehicle',
    });
    k.flicker = { x: hx, y: api.padY + 0.72, z: hz };
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
    // the ones that came loose
    for (let i = 0; i < 2 + Math.round(age * 2); i++) {
      k.solid.quad(0.34, 0.24, api.rng.range(-1.4, 1.4), api.padY + 0.03, api.rng.range(-1.6, 1.6),
        paper, api.rng.range(0, TAU), -Math.PI * 0.5);
    }
    api.emit({ kind: 'circle', x: 0, z: 0, r: 0.55, y0: api.padY - 0.2, y1: api.padY + 1.9, tag: 'wood' });
    return k;
  },

  /** Search-party gear, left where it was dropped. Nobody came back for it. */
  gear(api) {
    const k = kits();
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
    api.emit({ kind: 'circle', x: 0, z: 0, r: 0.62, y0: api.padY - 0.2, y1: api.padY + 0.6, tag: 'wood' });
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
  const zA = roadLower ? roadStart + 0.3 : padEnd - 0.3 - APPROACH_W;
  const zB = zA + APPROACH_W, zc = (zA + zB) * 0.5;
  const x0 = ax - L * 0.5, base = lowY - 0.4;
  for (let s = 0; s < steps; s++) {
    const top = lowY + Math.min(rise, APPROACH_RISE * (s + 1));
    const xc = x0 + run * (s + 0.5);
    k.box(run + 0.02, top - base, APPROACH_W, xc, (top + base) * 0.5, zc, C.stone);
    api.emit({
      kind: 'obb', x: xc, z: zc, halfX: run * 0.5, halfZ: APPROACH_W * 0.5, yaw: 0,
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
  // parapets down both sides of the flight, sloped with it. The bank-side one stops where
  // the bridge leaves the flight (it stood across the bridge on the first cut, measured:
  // the walker rounded its end onto the last 0.4 m of the slab).
  const pitch = Math.atan2(rise, L);
  const bankSide = roadLower ? zA - 0.16 : zB + 0.16, farSide = roadLower ? zB + 0.16 : zA - 0.16;
  const full = Math.hypot(L, rise) + 0.4;
  k.box(full, 0.9, 0.32, x0 + L * 0.5, lowY + rise * 0.5 + 0.55, farSide, C.stone, 0, 0, pitch);
  api.emit({
    kind: 'obb', x: x0 + L * 0.5, z: farSide, halfX: full * 0.5, halfZ: 0.16, yaw: 0,
    y0: lowY - 0.3, y1: highY + 1.0, tag: 'wall',
  });
  const cut = (bx0 - 0.3) - (x0 - 0.2);                 // the bank-side parapet's run
  const cutRise = rise * cut / L;
  k.box(Math.hypot(cut, cutRise), 0.9, 0.32, x0 - 0.2 + cut * 0.5, lowY + cutRise * 0.5 + 0.55, bankSide, C.stone, 0, 0, pitch);
  api.emit({
    kind: 'obb', x: x0 - 0.2 + cut * 0.5, z: bankSide, halfX: Math.hypot(cut, cutRise) * 0.5, halfZ: 0.16, yaw: 0,
    y0: lowY - 0.3, y1: lowY + cutRise + 1.0, tag: 'wall',
  });
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

/** The beacon column. donor: skyshard destinations.js:95-107 (`_beacon`), read 2026-09-02:
 *  an OPEN cylinder tapering upward, additive, low opacity, never fogged. 92 m for a major
 *  is SKYSHARD's own number for the same job. */
export function beaconGeometry(height, radius) {
  const g = new THREE.CylinderGeometry(radius * 0.4, radius, height, 8, 1, true);
  g.translate(0, height * 0.5, 0);
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  // fade the column out toward its top in the VERTEX colours, so one material serves
  // every beacon and the additive falloff costs no shader
  const py = g.attributes.position.array;
  for (let i = 0; i < n; i++) {
    const t = clamp(1 - py[i * 3 + 1] / height, 0, 1);
    const v = 0.25 + 0.75 * t * t;
    c[i * 3] = v; c[i * 3 + 1] = v; c[i * 3 + 2] = v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

export { C as SITE_COLOURS };
export default BUILDERS;
