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
/** The pool of light a fixture throws back onto the soffit above it. */
const PANE_WASH = (u, v) => 0.13 * (1 - u * u) * (1 - v * v);
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
function kits() { return { solid: new Kit(), glow: new Kit() }; }

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
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
    const seg = (TAU / N) * radius * 1.12;
    const h = height * (0.72 + 0.28 * Math.abs(Math.sin(i * 2.7)));
    // A yard wall is a ring 19-24 m out, which is at or past the level core of every disc
    // it is used on. Each segment stands on the ground it is actually over and steps down
    // the hill the way a dry-stone wall does; at padY they hovered on the low side.
    const gy = groundY(api, x, z);
    k.box(seg, h + 0.3, 0.42, x, gy + h * 0.5 - 0.15, z, col, -a);
    api.emit({
      kind: 'obb', x, z, halfX: seg * 0.5, halfZ: 0.21, yaw: -a,
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
      const lampY = api.padY + ch - 0.30;
      for (const lx of [-3.9, 0, 3.9]) {
        k.solid.box(0.66, 0.15, cd - 2.0, lx, lampY - 0.07, 0, C.slate);
        k.glow.pane(0.34, cd - 2.6, lx, lampY - 0.16, 0, PANE_TUBE, 0, Math.PI * 0.5, 2, 12);
      }
      k.glow.pane(cw - 1.0, cd - 1.2, 0, lampY, 0, PANE_WASH, 0, Math.PI * 0.5, 10, 8);
      // two pump islands
      for (const iz of [-2.4, 2.4]) {
        k.solid.box(3.6, 0.30, 1.5, 0, api.padY + 0.15, iz, C.ash);
        k.solid.box(0.75, 1.55, 0.55, -0.9, api.padY + 1.05, iz, C.plaster);
        k.solid.box(0.75, 1.55, 0.55, 0.9, api.padY + 1.05, iz, C.plaster);
        api.emit({
          kind: 'obb', x: 0, z: iz, halfX: 1.8, halfZ: 0.8, yaw: 0,
          y0: api.padY, y1: api.padY + 1.7, tag: 'metal',
        });
      }
      // the shop
      shell(k.solid, api, -10.5, 0.5, 10, 7, 3.6, 0, C.plaster, 2.4);
      k.solid.gable(10.6, 7.6, api.padY + 3.6, 1.1, -10.5, 0, 0.5, C.slate, 0);
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
      // nave running north from the tower
      const nw = 17, nd = 30, nh = 15;
      shell(k.solid, api, 0, 20, nw, nd, nh, 0, C.stone, 3.0);
      k.solid.gable(nw + 1.0, nd + 1.0, api.padY + nh, 4.2, 0, 0, 20, C.slate, 0);
      // buttresses down both flanks
      for (let i = 0; i < 5; i++) {
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
      for (let i = 0; i < 5; i++) {
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
    landmark(api) {
      const k = kits();
      // ART 4.1 — SIZE. 28 px at 2 km. The tower keeps its 3.6 m foot (the claim door
      // stands at z 4.3 and a fatter base would bury it) and gains height and a broader
      // head instead: 36 m to the gallery, which is an ordinary size for a light that is
      // supposed to be seen from the far side of a county.
      const H = 36;
      k.solid.tube(3.1, 3.6, H, 14, 0, api.padY + H * 0.5, 0, C.plaster);
      k.solid.cyl(4.6, 4.6, 0.7, 14, 0, api.padY + H + 0.35, 0, C.metal);      // gallery
      k.solid.tube(2.6, 2.6, 3.2, 10, 0, api.padY + H + 2.2, 0, C.metal);      // lamp room
      k.solid.cone(3.3, 2.4, 10, 0, api.padY + H + 5.0, 0, C.slate);
      api.emit({
        kind: 'circle', x: 0, z: 0, r: 3.3,
        y0: api.padY - 0.3, y1: api.padY + H + 6, tag: 'wall',
      });
      // The lamp itself: a vertical cylinder inside the lamp room, not the horizontal quad
      // that was there before. A flat plate at 32 m is edge-on from every road in the
      // county — the same fault as the mast lamp and the ember caps.
      k.glow.cyl(2.3, 2.3, 3.0, 10, 0, api.padY + H + 2.2, 0, [1, 1, 1]);
      // the beam, authored around the lamp so places.js can turn it. An open cone laid on
      // its side: 80 m long, widening to 9 m, additive and never fogged.
      const bk = new Kit();
      const beam = new THREE.CylinderGeometry(0.5, 4.5, 80, 10, 1, true);
      beam.rotateX(Math.PI * 0.5);
      beam.translate(0, 0, 40);
      bk.push(beam, [1, 1, 1]);
      return {
        solid: k.solid.build(), glow: k.glow.build(), glowColour: GLOW.white,
        moving: [{ geo: bk.build(), colour: GLOW.white, role: 'beam', x: 0, y: api.padY + H + 2.2, z: 0, rate: 0.22 }],
      };
    },
    body(api) {
      const k = kits();
      // the keeper's cottage
      shell(k.solid, api, 9, 3, 9, 6.5, 3.4, 0.3, C.plaster, 2.2);
      k.solid.gable(9.6, 7.0, api.padY + 3.4, 1.2, 9, 0, 3, C.slate, 0.3);
      k.glow.pane(1.4, 1.0, 9 - 1.0, api.padY + 2.0, 3 - 3.4, PANE_WINDOW, Math.PI + 0.3, 0, 6, 5);
      sash(k.solid, 1.4, 1.0, 9 - 1.0, api.padY + 2.0, 3 - 3.4, C.dark, Math.PI + 0.3, 0, 2, 2, 0.07, 0.09);
      // the door at the tower foot — the claim
      const c = api.site.claim;
      k.solid.box(1.5, 2.4, 0.22, c.dx, api.padY + 1.2, c.dz, C.wood);
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
      const H = 22;
      k.solid.box(6.4, H, 6.4, 0, api.padY + H * 0.5, 0, C.stone);
      api.emit({
        kind: 'obb', x: 0, z: 0, halfX: 3.2, halfZ: 3.2, yaw: 0,
        y0: api.padY - 0.3, y1: api.padY + H, tag: 'wall',
      });
      // the open belfry: four corner posts and a cap, so the bell reads as hanging in air
      for (let i = 0; i < 4; i++) {
        const sx = (i & 1) ? 1 : -1, sz = (i & 2) ? 1 : -1;
        k.solid.box(0.75, 4.2, 0.75, sx * 2.8, api.padY + H + 2.1, sz * 2.8, C.stone);
      }
      k.solid.box(7.6, 0.6, 7.6, 0, api.padY + H + 4.5, 0, C.stone);
      k.solid.cone(5.2, 4.4, 4, 0, api.padY + H + 7.0, 0, C.slate);
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
      for (let i = 0; i < 18; i++) {
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
};

/* ==========================================================================
   The apron. Every major stands on one.

   A FLATS disc levels the terrain FUNCTION; this levels the LOOK. It is a disc of made
   ground at the pad height with a skirt whose lower rim follows terrain.heightAt, so the
   seam between the yard and the hill is closed even when the disc has to be rolled back
   (see the note in places.js about terrain.ready()).
   ========================================================================== */
export function apron(api, radius, col) {
  const k = new Kit();
  const N = 28, RINGS = 4, LIFT = 0.08;
  const pos = [], nor = [], uv = [], idx = [];
  // PROJECTED ON THE HEIGHTFIELD, never authored above it. That is roads.js's own rule for
  // its ribbon ("the ribbon is PROJECTED onto the heightfield, never authored above it, so
  // it cannot float or sink relative to the ground"). Where the site's FLATS disc took,
  // heightAt IS the pad and this comes out perfectly flat; where it did not, the yard
  // drapes over the real hill. One rule, right in both worlds, and it can never disagree
  // with the surface collision is standing the player on.
  pos.push(0, api.heightAt(api.wx(0, 0), api.wz(0, 0)) + LIFT, 0);
  nor.push(0, 1, 0); uv.push(0.5, 0.5);
  for (let r = 1; r <= RINGS; r++) {
    const rr = radius * (r / RINGS);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr;
      pos.push(cx, api.heightAt(api.wx(cx, cz), api.wz(cx, cz)) + LIFT, cz);
      nor.push(0, 1, 0);
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
