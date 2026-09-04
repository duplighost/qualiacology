// CURFEW — what stands inside the other ten destinations. ROUND 7, lane B.
//
// Alex, sixth playtest: "places should have something in them."
// docs/NEXT.md C0, honestly: "Every other destination is a hollow shell or an exterior, and
// what you did at the original twelve was identical: walk to a lever and hold E. That sameness is the
// real reason the county feels thin."
//
// This file owns the dress of every major EXCEPT the Filling Station (lane A owns that one,
// in dress-station.js) and Blackthorn Manor's rooms (manor.js already builds those). It is a
// DRESS: places.js calls it after the base builder with the same api and merges what it
// returns into that destination's body geometry. It never replaces the base builder — the
// shells, the roof strips, the claim fixture and their colliders all live in sites.js and
// must keep working.
//
//   DRESS[kindOrId](api, out) -> { solid, glow, glowColour, cast } | null
//
// `api` is places.js's builder api: { site, padY, yaw, rng, heightAt, wx, wz, emit }, in the
// site's LOCAL frame, +Z toward the road. Build with the kit toolkit exported by sites.js —
// `kits()`, `C`, `groundY`, the PANE_* profiles — so a prop authored here is
// indistinguishable from one authored there.
//
// `cast` is a staged cast: [{ species, lx, lz, yaw, awake }], placed dormant the first time
// the player comes within 150 m. See places.js _recordCast. Casts are placed ON THE GROUND —
// enemies.spawn ignores y and stands a body on terrain.heightAt — so nothing here is ever
// cast onto a deck, and every cast point is left clear of colliders, because enemies.spawn
// asks collision.canOccupy first and REFUSES rather than clipping.
//
// ================================ THE FOUR RULES THIS FILE OBEYS ======================
//
// 1. ONE MERGED SOLID, ONE MERGED GLOW, per destination. Kit.build() merges; places.js makes
//    exactly one Mesh of each and hands them the two shared materials. Nothing here allocates
//    a material, a texture or a light. The whole dress of a place is two draw calls.
//
// 2. THE COLLIDER GOES ON IN THE SAME STATEMENT AS THE GEOMETRY. `solid()`, `deck()`,
//    `steps()` and `post()` below take the emit with them; there is no second pass and no
//    opt-in flag. CINDERBLOOM's walk-through trees were a structural absence, not a
//    forgotten call.
//
// 3. VALUE STRUCTURE, NOT BRIGHTNESS (docs/ART.md 0.3, 1.9). Measured in the manor's cellar
//    2026-09-03: a 0.125-albedo wall under the torch at 1.5 m reads 155 and looks white. So
//    the BULK of everything in here is at or below the dark end of sites.js's band — C.dark
//    0.105, C.slate 0.085, C.glass 0.050, plus the three darker mixes below — and the pale
//    end (C.paper 0.320, C.cloth 0.230) is spent only on SMALL things: a shift tag, a chart,
//    a candle stub, a hymn tile, a spilt sack. A dark mass with a few pale accents survives
//    the torch; a pale mass does not.
//
// 4. THE GLOW ONLY EXISTS ONCE THE PLACE IS YOURS. places.js keeps a body's glow mesh
//    invisible until the site is claimed and then ripples it up from the claim point
//    (_rippleRecord). So every lamp authored here is a REWARD: claim the place and its
//    inside lights, one room at a time, outward from the thing you held E on. Nothing in
//    here needs the glow to be legible — the torch is the light until then.

import * as THREE from 'three';
import { kits, C, groundY, PANE_LAMP, PANE_TUBE, PANE_SIGN } from './sites.js';

const TAU = Math.PI * 2;

/* ==========================================================================
   Three albedos this file adds, all BELOW sites.js's structural band on purpose
   (rule 3). They are the inside of things: a locker's shadow, an iron frame, a
   creosoted pile, the mouth of a bell.
   ========================================================================== */
const IRON = [0.062, 0.064, 0.070];     // cast iron: the darkest large surface in here
const SOOT = [0.038, 0.038, 0.040];     // a recess, a flue, the back of a cupboard
const TAR = [0.072, 0.062, 0.052];      // creosoted timber

/* ==========================================================================
   Local kit sugar. Each of these DRAWS and EMITS in one call.
   ========================================================================== */

/** A yawed sub-frame inside the site frame — the same arithmetic sites.js's shell() uses,
 *  so a prop placed at (lx, lz) inside a yawed shell lands where the shell's wall is. */
function frame(ox, oz, yaw) {
  const cy = Math.cos(yaw || 0), sy = Math.sin(yaw || 0);
  return {
    yaw: yaw || 0,
    x: (lx, lz) => ox + lx * cy + lz * sy,
    z: (lx, lz) => oz - lx * sy + lz * cy,
  };
}

/** Where a kit's LOCAL +x points after rotateY(f). Three sends +x to (cos f, -sin f). */
function ax(f) { return Math.cos(f); }
function az(f) { return -Math.sin(f); }

/** A solid box that stops you: drawn and collided in one statement. `y` is the box's CENTRE
 *  in local metres over api.padY. */
function solid(k, api, w, h, d, x, y, z, col, yaw, tag, standable) {
  k.box(w, h, d, x, api.padY + y, z, col, yaw || 0);
  api.emit({
    kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw: yaw || 0,
    y0: api.padY + y - h * 0.5, y1: api.padY + y + h * 0.5,
    tag: tag || 'wood', standable: !!standable,
  });
}

/** A floor you can stand on: the slab, its edge beams, its legs, and ONE standable collider.
 *  `y` is the walking surface in local metres over api.padY. */
function deck(k, api, cx, cz, w, d, y, col, yaw, legs) {
  const t = 0.16;
  solid(k, api, w, t, d, cx, y - t * 0.5, cz, col, yaw, 'wood', true);
  const f = frame(cx, cz, yaw);
  for (const [ex, ez, ew, ed] of [[0, -d * 0.5, w, 0.18], [0, d * 0.5, w, 0.18],
    [-w * 0.5, 0, 0.18, d], [w * 0.5, 0, 0.18, d]]) {
    k.box(ew, 0.30, ed, f.x(ex, ez), api.padY + y - 0.30, f.z(ex, ez), TAR, yaw || 0);
  }
  if (legs !== false) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = f.x(sx * (w * 0.5 - 0.35), sz * (d * 0.5 - 0.35));
      const pz = f.z(sx * (w * 0.5 - 0.35), sz * (d * 0.5 - 0.35));
      k.cyl(0.13, 0.13, y, 6, px, api.padY + y * 0.5, pz, TAR);
    }
  }
}

/** A flight of steps whose TOP tread is at (cx, cz) and whose foot runs back along -Z of its
 *  own frame. Every riser is under CFG.player.STEP_UP (0.52) and under collision's
 *  GROUND_SNAP (0.48), so it is a walk in both directions and never a fall. */
function steps(k, api, cx, cz, w, y, yaw, col) {
  const n = Math.max(2, Math.ceil(y / 0.42));
  const rise = y / n, run = 0.44;
  const f = frame(cx, cz, yaw);
  for (let i = 0; i < n; i++) {
    const lz = -(n - 1 - i) * run;
    solid(k, api, w, rise * (i + 1), run + 0.02,
      f.x(0, lz), rise * (i + 1) * 0.5, f.z(0, lz), col || C.plank, yaw, 'wood', true);
  }
}

/** A tall thin thing that stops a bullet: a post, a stanchion, a candle stand. */
function post(k, api, r, h, x, y, z, col, tag) {
  k.cyl(r, r, h, 6, x, api.padY + y + h * 0.5, z, col);
  api.emit({
    kind: 'circle', x, z, r: r * 1.2,
    y0: api.padY + y, y1: api.padY + y + h, tag: tag || 'wood',
  });
}

/** A lit fitting: a dark housing on the SOLID kit with a small pane inside it on the GLOW
 *  kit. sites.js's pane note in one sentence — a lamp is a fixture with something solid in
 *  front of it, never a bright rectangle. `face` is the yaw the pane looks along. */
function lamp(kS, kG, api, x, y, z, face, w, h) {
  const ww = w || 0.34, hh = h || 0.40, f = face || 0;
  kG.pane(ww, hh, x, api.padY + y, z, PANE_LAMP, f, 0, 6, 6);
  kS.box(ww + 0.22, 0.07, 0.22, x, api.padY + y + hh * 0.62, z, SOOT, f);      // the hood
  for (const s of [-1, 1]) {                                                    // a cheek each side
    kS.box(0.06, hh + 0.10, 0.20,
      x + ax(f) * s * (ww * 0.5 + 0.06), api.padY + y, z + az(f) * s * (ww * 0.5 + 0.06), SOOT, f);
  }
}

/** A grid of small pale things — hymn tiles, shift tags, chalked numbers. The only place in
 *  this file that spends the pale end of the palette, and never more than 0.03 m^2 a piece. */
function tags(k, api, x, y, z, face, cols, rows, gap, col) {
  const f = face || 0;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const a = (i - (cols - 1) * 0.5) * gap;
      k.box(gap * 0.62, gap * 0.62, 0.02,
        x + ax(f) * a, api.padY + y - j * gap, z + az(f) * a, col || C.paper, f);
    }
  }
}

/* ==========================================================================
   THE TEN. Keyed by `kind` — each of these kinds belongs to exactly one destination.
   ========================================================================== */

export const DRESS = {

  /* ------------------------------------------------------------------ works
     THE WEEPING MINE'S WINDING HOUSE. sites.js puts a 12 x 9 x 5.4 shell at (12.5, -8) with
     its doorway on the -Z face. What was in a winding house: the drum the rope wound onto,
     the gantry that lifted off it, the shift board that said who was underground, and the
     lockers of the men who were. You come in past the drum, climb to the control mezzanine —
     and somebody is already standing at the board with their back to you. */
  works(api) {
    const k = kits(), S = k.solid, G = k.glow;
    const OX = 12.5, OZ = -8;

    // ---- the winding drum: the reason the building exists ------------------------------
    for (const s of [-1, 1]) {
      solid(S, api, 0.9, 1.5, 1.2, OX + s * 2.0, 0.75, OZ - 0.6, C.stone, 0, 'stone');
    }
    S.cyl(1.05, 1.05, 3.2, 14, OX, api.padY + 1.7, OZ - 0.6, IRON, 0, 0, Math.PI * 0.5);
    for (const s of [-1, 1]) {
      S.cyl(1.35, 1.35, 0.20, 14, OX + s * 1.6, api.padY + 1.7, OZ - 0.6, C.rust, 0, 0, Math.PI * 0.5);
    }
    api.emit({
      kind: 'obb', x: OX, z: OZ - 0.6, halfX: 1.9, halfZ: 1.35, yaw: 0,
      y0: api.padY, y1: api.padY + 2.9, tag: 'metal',
    });
    S.cyl(0.07, 0.07, 8.6, 5, OX - 2.8, api.padY + 3.3, OZ - 4.4, IRON, 0, -0.30, 0.55);

    // ---- the gantry over it -----------------------------------------------------------
    S.box(0.34, 0.34, 9.4, OX, api.padY + 4.35, OZ - 0.6, IRON, Math.PI * 0.5);
    for (const s of [-1, 1]) S.box(0.26, 1.15, 0.26, OX + s * 4.2, api.padY + 3.75, OZ - 0.6, IRON);
    S.box(0.42, 0.52, 0.42, OX + 1.1, api.padY + 3.95, OZ - 0.6, IRON);
    S.cyl(0.035, 0.035, 1.5, 4, OX + 1.1, api.padY + 2.95, OZ - 0.6, IRON);
    S.cyl(0.30, 0.30, 0.28, 8, OX + 1.1, api.padY + 2.16, OZ - 0.6, C.rust);

    // ---- the control mezzanine along the back wall -------------------------------------
    const MY = 2.35;
    deck(S, api, OX, OZ + 2.9, 10.6, 3.0, MY, C.plank, 0, false);
    for (const px of [OX - 4.6, OX - 1.5, OX + 1.5, OX + 4.6]) {
      S.cyl(0.13, 0.13, MY, 6, px, api.padY + MY * 0.5, OZ + 1.7, TAR);
    }
    // its handrail, stopped short so the stair can arrive
    S.box(8.7, 0.08, 0.08, OX - 0.95, api.padY + MY + 1.0, OZ + 1.42, C.rust);
    for (let i = -4; i <= 2; i++) S.box(0.05, 1.0, 0.05, OX + i * 1.2, api.padY + MY + 0.5, OZ + 1.42, C.rust);
    steps(S, api, OX + 4.3, OZ + 1.35, 1.2, MY, 0, C.plank);

    // ---- THE SHIFT BOARD, still up ----------------------------------------------------
    // A slate board on the back wall with the brass tags of the men still hung on it: the
    // one thing you walk in to find, and the only pale mass in the building.
    S.box(3.0, 1.35, 0.10, OX, api.padY + MY + 1.20, OZ + 4.20, SOOT);
    S.box(3.2, 0.10, 0.16, OX, api.padY + MY + 1.94, OZ + 4.17, TAR);
    tags(S, api, OX, MY + 1.62, OZ + 4.13, 0, 11, 4, 0.24, C.paper);
    // the desk, its chair pushed back, the day book left open
    solid(S, api, 1.9, 0.08, 0.8, OX - 2.6, MY + 0.76, OZ + 3.1, C.plank, 0, 'wood', true);
    for (const s of [-1, 1]) S.box(0.09, 0.72, 0.09, OX - 2.6 + s * 0.8, api.padY + MY + 0.36, OZ + 3.1, TAR);
    S.box(0.46, 0.06, 0.44, OX - 4.0, api.padY + MY + 0.46, OZ + 3.0, TAR, 0.6);
    S.box(0.42, 0.52, 0.06, OX - 4.0, api.padY + MY + 0.76, OZ + 3.22, TAR, 0.6);
    S.box(0.36, 0.02, 0.26, OX - 2.2, api.padY + MY + 0.81, OZ + 3.0, C.paper, 0.4);

    // ---- the locker row, west wall, three doors standing open --------------------------
    for (let i = 0; i < 7; i++) {
      const lz = OZ - 3.6 + i * 1.05;
      solid(S, api, 0.55, 1.90, 0.52, OX - 5.2, 0.95, lz, IRON, 0, 'metal');
      S.box(0.03, 1.72, 0.44, OX - 4.92, api.padY + 0.95, lz, SOOT);
      if (i === 1 || i === 4 || i === 5) {
        S.box(0.50, 1.80, 0.04, OX - 4.60, api.padY + 0.98, lz + 0.30, C.metal, 1.05);
        S.box(0.24, 0.44, 0.10, OX - 4.86, api.padY + 1.28, lz, C.cloth);
      }
    }
    S.box(0.30, 0.06, 3.4, OX - 5.0, api.padY + 2.02, OZ - 1.0, TAR);

    // ---- the floor of a working building ------------------------------------------------
    for (let i = 0; i < 5; i++) {
      const a = api.rng.range(0, TAU);
      solid(S, api, 0.62, 0.86, 0.62, OX - 3.2 + i * 0.9, 0.43,
        OZ - 3.8 + api.rng.range(-0.4, 0.4), C.rust, a, 'metal');
    }
    S.box(2.4, 0.05, 1.1, OX + 3.8, api.padY + 0.03, OZ - 4.6, SOOT, 0.2);
    for (let i = 0; i < 3; i++) post(S, api, 0.05, 1.1, OX + 4.4 + i * 0.26, 0, OZ - 2.4, TAR);

    // ---- claimed, the winding house has power again -------------------------------------
    lamp(S, G, api, OX, MY + 2.10, OZ + 3.95, 0, 0.70, 0.30);
    lamp(S, G, api, OX - 3.4, 3.30, OZ - 3.0, 0, 0.30, 0.34);
    G.pane(1.1, 0.5, OX + 1.1, api.padY + 2.30, OZ - 0.6, PANE_TUBE, 0, 0, 6, 4);

    return {
      solid: S.build(), glow: G.build(),
      // Dread-owned: no XP, outside the pressure budget, and it only moves while you are
      // not looking at it.
      cast: [{ species: 'standing', lx: OX + 3.9, lz: OZ, yaw: Math.PI, awake: false }],
    };
  },

  /* ------------------------------------------------------------------ relay
     THE EQUIPMENT HUT. sites.js puts a 6 x 5 x 3.0 hut at (-7.5, 6.5), doorway on -Z.
     Racks, a dead console, cable trays that leave through the wall and run along the pad to
     the mast's foot — and outside, a stack of cable drums that walks you up onto a lookout
     stage at 3 m. The Relay is on the ridge; that stage is one of the few places in the
     county you stand above the road. */
  relay(api) {
    const k = kits(), S = k.solid, G = k.glow;
    const OX = -7.5, OZ = 6.5;

    // ---- three racks against the back wall ---------------------------------------------
    for (let i = 0; i < 3; i++) {
      const rx = OX - 1.8 + i * 1.8;
      solid(S, api, 0.72, 2.05, 0.62, rx, 1.03, OZ + 1.85, IRON, 0, 'metal');
      S.box(0.62, 1.85, 0.05, rx, api.padY + 1.03, OZ + 1.52, SOOT);
      for (let j = 0; j < 6; j++) {
        S.box(0.58, 0.16, 0.04, rx, api.padY + 0.35 + j * 0.30, OZ + 1.50, C.metal);
      }
      // the panel lamps: what comes up when the mast is yours
      for (let j = 0; j < 3; j++) {
        G.pane(0.05, 0.05, rx - 0.22 + j * 0.22, api.padY + 1.55, OZ + 1.47, PANE_SIGN, 0, 0, 2, 2);
      }
    }
    // ---- the dead console ----------------------------------------------------------------
    // It used to stand squarely across the only doorway: an automated corner-turn could
    // scrape around it, while a player looking in saw a black box and no room. Seat the same
    // console against the east wall and leave one straight body-width aisle to the racks.
    {
      const CX = OX + 2.48, CZ = OZ - 0.45, Y = Math.PI * 0.5;
      const f = frame(CX, CZ, Y);
      solid(S, api, 2.1, 0.78, 0.72, CX, 0.39, CZ, IRON, Y, 'metal');
      S.box(2.0, 0.10, 0.62, f.x(0, -0.12), api.padY + 0.86, f.z(0, -0.12), TAR, Y, -0.42);
      tags(S, api, f.x(-0.5, -0.24), 0.90, f.z(-0.5, -0.24), Y, 5, 2, 0.11, C.metal);
      S.box(0.60, 0.44, 0.06, f.x(0.6, 0.24), api.padY + 1.02, f.z(0.6, 0.24), C.glass, Y, -0.30);
      G.pane(0.52, 0.36, f.x(0.6, 0.20), api.padY + 1.02, f.z(0.6, 0.20), PANE_SIGN, Y, -0.30, 5, 4);
      S.cyl(0.24, 0.24, 0.05, 8, f.x(-1.2, 0.70), api.padY + 0.24, f.z(-1.2, 0.70), TAR, Y, Math.PI * 0.5);
      S.box(0.40, 0.06, 0.42, f.x(-1.2, 0.70), api.padY + 0.50, f.z(-1.2, 0.70), TAR, Y, 1.2);
    }

    // ---- cable trays, and the bundle that leaves for the mast ---------------------------
    S.box(0.42, 0.06, 5.2, OX - 2.3, api.padY + 2.55, OZ, IRON);
    S.box(0.42, 0.06, 5.2, OX + 2.3, api.padY + 2.55, OZ, IRON);
    for (let i = 0; i < 9; i++) {
      S.cyl(0.045, 0.045, 4.6, 4, OX - 2.3 + api.rng.range(-0.14, 0.14),
        api.padY + 2.62, OZ + 0.2, SOOT, 0, Math.PI * 0.5);
    }
    for (let i = 0; i < 7; i++) {
      const t0 = i / 7, t1 = (i + 1) / 7;
      const x0 = OX * (1 - t0), z0 = (OZ - 2.6) * (1 - t0);
      const x1 = OX * (1 - t1), z1 = (OZ - 2.6) * (1 - t1);
      const len = Math.hypot(x1 - x0, z1 - z0);
      S.box(0.34, 0.14, len, (x0 + x1) * 0.5, api.padY + 0.07, (z0 + z1) * 0.5, SOOT,
        Math.atan2(x1 - x0, z1 - z0));
    }

    // ---- the drums outside: 0 -> 0.62 -> 1.30 -> 2.02, then a mantle onto the stage ------
    // Alex, playtest 5: "I'm not sure why I can't climb up stuff either." These are stages
    // of 0.62-0.72, which is over CFG.player.STEP_UP: they are a CLIMB, not a stair.
    const DR = [[-2.0, 3.0, 0.62, 0.95], [-2.4, 4.6, 1.30, 0.85], [-3.0, 6.2, 2.02, 0.80]];
    for (const [dx, dz, top, r] of DR) {
      S.cyl(r, r, top, 12, dx, api.padY + top * 0.5, dz, TAR);
      S.cyl(r * 0.55, r * 0.55, top + 0.06, 8, dx, api.padY + top * 0.5, dz, IRON);
      api.emit({
        kind: 'circle', x: dx, z: dz, r: r * 1.02,
        y0: api.padY, y1: api.padY + top, tag: 'wood', standable: true,
      });
    }
    // the lookout stage, on four posts clear of the hut's gable
    deck(S, api, -2.6, 8.4, 3.4, 2.8, 2.90, C.plank, 0, true);
    S.box(3.4, 0.09, 0.09, -2.6, api.padY + 3.90, 7.0, C.rust);
    for (let i = -1; i <= 1; i++) S.box(0.05, 1.0, 0.05, -2.6 + i * 1.5, api.padY + 3.40, 7.0, C.rust);
    S.box(0.09, 0.09, 2.8, -4.3, api.padY + 3.90, 8.4, C.rust);
    lamp(S, G, api, -2.6, 3.55, 8.4, 0, 0.32, 0.34);
    lamp(S, G, api, OX, 2.62, OZ - 2.35, Math.PI, 0.34, 0.30);

    return {
      solid: S.build(), glow: G.build(),
      // The Pale still owns the Relay encounter, but it watches from the existing lookout
      // deck. A shut powered room cannot honestly be safe with a horror body already in it.
      cast: [{ species: 'pale', lx: -2.6, lz: 8.4, ly: 2.90, yaw: Math.PI, awake: false }],
    };
  },

  /* -------------------------------------------------------------- cathedral
     THE NAVE. sites.js puts a 17 x 18 x 15 nave at (0, 14) with its doorway on -Z. Pews in
     two ranks, the chandelier that came down across them, a screened side chapel with a rack
     of candles that all burned out, and the altar at the far end up three steps. Two of them
     are lying in the aisle, which is where they were put. */
  cathedral(api) {
    const k = kits(), S = k.solid, G = k.glow;

    // ---- pews: two ranks of seven, a 4.7 m aisle down the middle -------------------------
    for (let r = 0; r < 7; r++) {
      const pz = 8.2 + r * 1.75;
      for (const s of [-1, 1]) {
        const px = s * 4.95;
        solid(S, api, 5.2, 0.10, 0.42, px, 0.45, pz, TAR, 0, 'wood', true);
        S.box(5.2, 0.86, 0.08, px, api.padY + 0.92, pz + 0.28, TAR);
        for (const e of [-1, 1]) S.box(0.10, 0.45, 0.40, px + e * 2.5, api.padY + 0.22, pz, TAR);
      }
    }
    S.box(5.2, 0.42, 0.10, 4.95, api.padY + 0.21, 13.2, TAR, 0, 0, 1.35);   // one pushed over

    // ---- THE CHANDELIER, down across the pews, and standable -----------------------------
    {
      const cx = 3.4, cz = 13.6;
      const ring = new THREE.TorusGeometry(1.55, 0.11, 5, 22);
      ring.rotateX(Math.PI * 0.5 - 0.22); ring.rotateY(0.4);
      ring.translate(cx, api.padY + 1.05, cz);
      S.push(ring, IRON);
      const ring2 = new THREE.TorusGeometry(0.92, 0.09, 5, 18);
      ring2.rotateX(Math.PI * 0.5 - 0.22); ring2.rotateY(0.4);
      ring2.translate(cx, api.padY + 1.32, cz);
      S.push(ring2, IRON);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        const px = cx + Math.cos(a) * 1.55, pz = cz + Math.sin(a) * 1.55;
        const dy = 1.05 + Math.sin(a) * 0.34;
        S.cyl(0.055, 0.055, 0.22, 5, px, api.padY + dy + 0.11, pz, IRON);
        S.cyl(0.045, 0.045, 0.16, 5, px, api.padY + dy + 0.28, pz, C.cloth);
        G.pane(0.13, 0.20, px, api.padY + dy + 0.34, pz, PANE_LAMP, 0, 0, 4, 4);
      }
      S.cyl(0.05, 0.05, 2.6, 4, cx - 0.5, api.padY + 2.4, cz - 0.3, IRON, 0, 0.30, 0.24);
      api.emit({
        kind: 'circle', x: cx, z: cz, r: 1.62,
        y0: api.padY, y1: api.padY + 1.22, tag: 'metal', standable: true,
      });
    }

    // ---- the chancel: three steps, the altar, the reredos behind it ----------------------
    for (let i = 0; i < 3; i++) {
      solid(S, api, 12.0, 0.24, 0.9, 0, 0.12 + i * 0.24, 19.4 + i * 0.9, C.stone, 0, 'stone', true);
    }
    solid(S, api, 3.2, 1.0, 1.1, 0, 1.22, 21.6, C.stone, 0, 'stone');
    S.box(3.6, 0.10, 1.3, 0, api.padY + 1.77, 21.6, C.slate);
    for (const s of [-1, 1]) {
      post(S, api, 0.09, 1.35, s * 2.3, 0.72, 20.9, IRON, 'metal');
      S.cyl(0.10, 0.10, 0.30, 6, s * 2.3, api.padY + 2.22, 20.9, C.cloth);
      G.pane(0.18, 0.34, s * 2.3, api.padY + 2.46, 20.9, PANE_LAMP, 0, 0, 4, 5);
    }
    S.box(6.4, 4.4, 0.20, 0, api.padY + 2.3, 22.4, SOOT);
    S.box(1.0, 2.2, 0.10, 0, api.padY + 2.5, 22.26, C.plaster);

    // ---- the side chapel, screened off in the east aisle ---------------------------------
    {
      const sx = 5.9, sz = 17.4;
      for (const oz of [-1.9, 1.9]) {
        solid(S, api, 0.20, 3.4, 1.6, sx, 1.7, sz + oz, IRON, 0, 'metal');
      }
      for (let i = 0; i < 7; i++) S.box(0.06, 3.2, 0.06, sx, api.padY + 1.7, sz - 2.6 + i * 0.9, IRON);
      solid(S, api, 1.6, 0.9, 0.7, sx + 1.7, 0.45, sz + 1.0, C.stone, 0, 'stone');
      solid(S, api, 1.5, 0.85, 0.35, sx + 1.7, 0.42, sz - 1.4, IRON, 0, 'metal');
      for (let i = 0; i < 18; i++) {
        const cx2 = sx + 1.05 + (i % 9) * 0.16, cz2 = sz - 1.5 + Math.floor(i / 9) * 0.22;
        const hgt = api.rng.range(0.03, 0.22);
        S.cyl(0.045, 0.045, hgt, 4, cx2, api.padY + 0.85 + hgt * 0.5, cz2, C.cloth);
        if (hgt > 0.14) G.pane(0.10, 0.16, cx2, api.padY + 0.85 + hgt + 0.06, cz2, PANE_LAMP, 0, 0, 3, 3);
      }
    }

    // ---- the floor of a church nobody has swept, and the hymn board by the door -----------
    for (let i = 0; i < 14; i++) {
      S.box(api.rng.range(0.3, 0.8), 0.03, api.rng.range(0.2, 0.5),
        api.rng.range(-7, 7), api.padY + 0.02, api.rng.range(6, 19), SOOT, api.rng.range(0, TAU));
    }
    S.box(0.9, 1.3, 0.08, -7.4, api.padY + 2.1, 6.6, SOOT);
    tags(S, api, -7.4, 2.5, 6.52, 0, 1, 4, 0.28, C.paper);

    return {
      solid: S.build(), glow: G.build(),
      cast: [
        { species: 'pallbearer', lx: 0.6, lz: 10.4, yaw: 0, awake: false },
        { species: 'pallbearer', lx: -0.8, lz: 15.2, yaw: 0, awake: false },
      ],
    };
  },

  /* ----------------------------------------------------------------- chapel
     A 9 x 14 chapel at (0, 5), doorway on -Z. A font first thing through the door, the chairs
     stacked the way they are when a room has been cleared, hymn boards nobody changed, and a
     VESTRY partitioned off the far end with a LOFT over it. The loft is the point: three
     shelf-ledges 0.62 apart up the vestry wall, which is a climb, not a stair, and the only
     place at the Chapel you look down from. */
  chapel(api) {
    const k = kits(), S = k.solid, G = k.glow;

    // ---- the font ------------------------------------------------------------------------
    solid(S, api, 0.78, 0.72, 0.78, 0, 0.36, 0.4, C.stone, 0.39, 'stone');
    S.cyl(0.62, 0.50, 0.42, 8, 0, api.padY + 0.92, 0.4, C.stone);
    S.cyl(0.50, 0.50, 0.06, 8, 0, api.padY + 1.06, 0.4, SOOT);
    api.emit({ kind: 'circle', x: 0, z: 0.4, r: 0.66, y0: api.padY, y1: api.padY + 1.13, tag: 'stone' });

    // ---- the chairs, stacked ---------------------------------------------------------------
    for (const [cx, cz, n] of [[-2.9, 2.6, 8], [-2.9, 4.1, 7], [2.9, 2.4, 6]]) {
      for (let i = 0; i < n; i++) {
        const j = api.rng.range(-0.05, 0.05);
        S.box(0.42, 0.05, 0.42, cx + j, api.padY + 0.46 + i * 0.13, cz + j, TAR, api.rng.range(-0.06, 0.06));
        S.box(0.40, 0.44, 0.05, cx + j, api.padY + 0.70 + i * 0.13, cz + j + 0.19, TAR);
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        S.box(0.05, 0.44, 0.05, cx + sx * 0.17, api.padY + 0.22, cz + sz * 0.17, TAR);
      }
      api.emit({
        kind: 'obb', x: cx, z: cz, halfX: 0.30, halfZ: 0.30, yaw: 0,
        y0: api.padY, y1: api.padY + 0.46 + n * 0.13, tag: 'wood',
      });
    }

    // ---- hymn boards and the altar table ---------------------------------------------------
    for (const bz of [3.4, 6.2]) {
      S.box(0.08, 1.10, 0.72, 4.10, api.padY + 2.05, bz, SOOT);
      S.box(0.10, 0.09, 0.84, 4.09, api.padY + 2.64, bz, TAR);
      tags(S, api, 4.02, 2.38, bz, Math.PI * 0.5, 1, 4, 0.24, C.paper);
    }
    solid(S, api, 2.0, 0.86, 0.7, 0, 0.43, 7.5, TAR, 0, 'wood');
    S.box(2.2, 0.06, 0.9, 0, api.padY + 0.89, 7.5, C.cloth);

    // ---- THE VESTRY and the loft over it ----------------------------------------------------
    const VZ = 8.9;
    solid(S, api, 3.2, 3.0, 0.22, -2.6, 1.5, VZ, C.stone, 0, 'wall');
    solid(S, api, 3.7, 3.0, 0.22, 2.35, 1.5, VZ, C.stone, 0, 'wall');
    S.box(1.7, 0.34, 0.26, -0.15, api.padY + 2.85, VZ, TAR);
    deck(S, api, 0, 10.3, 8.3, 2.7, 2.55, C.plank, 0, false);
    S.box(8.3, 0.09, 0.09, 0, api.padY + 3.35, 8.98, C.rust);
    for (let i = -3; i <= 3; i++) S.box(0.05, 0.80, 0.05, i * 1.3, api.padY + 2.95, 8.98, C.rust);
    // the climb: three shelf-ledges up the east wall, 0.62 apart
    for (let i = 0; i < 3; i++) {
      solid(S, api, 0.70, 0.10, 1.6, 3.7, 0.72 + i * 0.62, 10.6 - i * 0.5, TAR, 0, 'wood', true);
    }
    // inside the vestry
    S.box(0.06, 0.06, 3.0, -2.4, api.padY + 1.85, 10.6, C.rust, Math.PI * 0.5);
    for (let i = 0; i < 5; i++) {
      S.box(0.40, 1.05, 0.14, -2.4, api.padY + 1.25, 9.4 + i * 0.5, C.cloth, api.rng.range(-0.15, 0.15));
    }
    solid(S, api, 1.3, 0.62, 0.66, 1.4, 0.31, 11.2, TAR, 0.12, 'wood', true);
    S.box(1.34, 0.10, 0.70, 1.4, api.padY + 0.67, 11.2, IRON, 0.12);
    solid(S, api, 0.8, 0.80, 0.5, 3.2, 0.40, 9.4, C.stone, 0, 'stone');
    S.cyl(0.28, 0.28, 0.18, 8, 3.2, api.padY + 0.89, 9.4, C.metal);
    // and what was put up on the loft and left
    for (let i = 0; i < 4; i++) {
      S.box(0.52, 0.34, 0.42, -3.0 + i * 0.8, api.padY + 2.72,
        10.6 + api.rng.range(-0.4, 0.4), TAR, api.rng.range(0, TAU));
    }
    S.box(0.9, 0.55, 0.62, 2.6, api.padY + 2.83, 10.4, C.plank, 0.3);

    lamp(S, G, api, -0.15, 2.55, VZ - 0.2, Math.PI, 0.30, 0.30);
    lamp(S, G, api, 0, 2.30, 7.9, Math.PI, 0.26, 0.26);

    return { solid: S.build(), glow: G.build() };
  },

  /* ---------------------------------------------------------------- steeple
     GALLOWSFEN. The church went under and the steeple is what is left; sites.js's tower is
     one solid leaning shaft you cannot get into. So the ringing chamber came down with the
     rest of it. The bell frame lies collapsed in the water, the bell is on its side in the
     mud, the rope still runs from the belfry down to a boarded RINGING FLOOR built on piles
     out of the fen — and a ladder-stair off that floor climbs the OUTSIDE of the tower to a
     landing at 4.6 m, which is the only dry standing at Gallowsfen. */
  steeple(api) {
    const k = kits(), S = k.solid, G = k.glow;
    const gAt = (x, z) => groundY(api, x, z) - api.padY;

    // ---- the ringing floor, on piles beside the boardwalk --------------------------------
    const RX = 3.2, RZ = -5.0, RY = gAt(RX, RZ) + 1.35;
    deck(S, api, RX, RZ, 5.0, 4.2, RY, C.plank, -0.12, false);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = RX + sx * 2.1, pz = RZ + sz * 1.7;
      S.cyl(0.16, 0.16, 2.6, 6, px, api.padY + gAt(px, pz) + 1.0, pz, TAR);
    }
    steps(S, api, RX - 2.0, RZ - 2.4, 1.4, RY, 0, C.plank);
    S.box(5.0, 0.08, 0.08, RX, api.padY + RY + 1.0, RZ - 2.1, C.rust, -0.12);
    for (let i = -2; i <= 2; i++) S.box(0.05, 1.0, 0.05, RX + i * 1.2, api.padY + RY + 0.5, RZ - 2.1, C.rust);
    // the ringers' bench, the chalked peal board, the coil of rope
    solid(S, api, 1.8, 0.10, 0.42, RX + 1.2, RY + 0.46, RZ + 1.4, TAR, 0, 'wood', true);
    for (const e of [-1, 1]) S.box(0.10, 0.46, 0.36, RX + 1.2 + e * 0.8, api.padY + RY + 0.23, RZ + 1.4, TAR);
    S.box(1.1, 0.80, 0.06, RX - 1.6, api.padY + RY + 1.30, RZ + 1.9, SOOT, 0.5);
    tags(S, api, RX - 1.6, RY + 1.55, RZ + 1.86, 0.5, 3, 3, 0.20, C.paper);
    S.cyl(0.28, 0.28, 0.22, 10, RX - 1.4, api.padY + RY + 0.11, RZ - 0.8, C.cloth, 0, Math.PI * 0.5);

    // ---- THE ROPE, from the belfry down to the floor ---------------------------------------
    {
      const c = api.site.claim;
      const x0 = c.dx + 0.9, z0 = c.dz, y0 = c.dy + 0.6;
      const x1 = RX - 1.2, z1 = RZ - 0.2, y1 = RY + 0.15;
      const flat = Math.hypot(x1 - x0, z1 - z0);
      const len = Math.hypot(y0 - y1, flat);
      const g = new THREE.CylinderGeometry(0.035, 0.035, len, 4);
      g.rotateZ(-Math.atan2(x1 - x0, y0 - y1));
      g.rotateX(Math.atan2(z1 - z0, y0 - y1));
      g.translate((x0 + x1) * 0.5, api.padY + (y0 + y1) * 0.5, (z0 + z1) * 0.5);
      S.push(g, C.cloth);
      // the sally: the woolly grip a ringer holds, the one pale thing at head height
      S.cyl(0.075, 0.075, 0.62, 6,
        x1 + (x0 - x1) * 0.16, api.padY + y1 + (y0 - y1) * 0.16 + 0.31, z1 + (z0 - z1) * 0.16,
        C.paper, 0, 0.20, 0.10);
    }

    // ---- THE BELL, on its side in the mud ---------------------------------------------------
    {
      const bx = 6.4, bz = 2.6, by = gAt(bx, bz);
      S.tube(1.05, 0.62, 1.9, 12, bx, api.padY + by + 0.95, bz, IRON, 0.4, Math.PI * 0.46);
      S.cyl(1.06, 1.06, 0.12, 12, bx - 0.86, api.padY + by + 0.95, bz + 0.38, SOOT, 0.4, Math.PI * 0.46);
      S.box(1.5, 0.34, 0.42, bx + 0.9, api.padY + by + 0.90, bz - 0.4, TAR, 0.4);
      S.cyl(0.60, 0.60, 0.16, 10, bx + 0.9, api.padY + by + 0.90, bz - 1.0, C.rust, 0.4, 0, Math.PI * 0.5);
      api.emit({
        kind: 'circle', x: bx, z: bz, r: 1.15,
        y0: api.padY + by - 0.3, y1: api.padY + by + 1.7, tag: 'metal',
      });
    }
    // ---- the bell frame, collapsed across the water -----------------------------------------
    for (let i = 0; i < 5; i++) {
      const fx = -3.0 - i * 1.4, fz = 1.6 + i * 1.9;
      const gy = gAt(fx, fz);
      S.box(0.34, 0.34, api.rng.range(3.4, 5.6), fx, api.padY + gy + 0.22, fz, TAR,
        api.rng.range(-1.2, 1.2), api.rng.range(-0.2, 0.2));
      api.emit({
        kind: 'obb', x: fx, z: fz, halfX: 0.4, halfZ: 2.0, yaw: 0,
        y0: api.padY + gy - 0.2, y1: api.padY + gy + 0.42, tag: 'wood', standable: true,
      });
    }

    // ---- the ladder-stair up the tower to a landing at 4.6 m ----------------------------------
    // The tower's own collider is a circle r 3.0; every tread here stands outside it at 3.55.
    {
      const A0 = -1.15, LY = 4.6, n = 11, rise = LY / n;
      for (let i = 1; i <= n; i++) {
        const a = A0 + i * 0.16;
        const px = Math.cos(a) * 3.55, pz = Math.sin(a) * 3.55;
        solid(S, api, 1.1, 0.14, 0.62, px, gAt(px, pz) + rise * i, pz,
          C.plank, -(a + Math.PI * 0.5), 'wood', true);
        if (i % 3 === 0) {
          post(S, api, 0.07, rise * i, px + Math.cos(a) * 0.5, gAt(px, pz), pz + Math.sin(a) * 0.5, TAR);
        }
      }
      const la = A0 + (n + 1.6) * 0.16;
      const lx = Math.cos(la) * 3.9, lz = Math.sin(la) * 3.9;
      deck(S, api, lx, lz, 2.6, 1.8, LY + 0.1, C.plank, -(la + Math.PI * 0.5), false);
      for (const s of [-1, 1]) {
        S.cyl(0.14, 0.14, LY, 6, lx + Math.cos(la) * 0.9,
          api.padY + LY * 0.5, lz + Math.sin(la) * 0.9 + s * 0.6, TAR);
      }
      S.box(2.6, 0.08, 0.08, lx + Math.cos(la) * 0.9, api.padY + LY + 1.15,
        lz + Math.sin(la) * 0.9, C.rust, -(la + Math.PI * 0.5));
      lamp(S, G, api, lx, LY + 1.0, lz, -(la + Math.PI * 0.5), 0.30, 0.34);
    }
    lamp(S, G, api, RX - 2.1, RY + 1.5, RZ - 1.7, Math.PI, 0.28, 0.32);
    lamp(S, G, api, RX + 2.1, RY + 1.5, RZ + 1.7, 0, 0.28, 0.32);

    return {
      solid: S.build(), glow: G.build(),
      // one of them was already lying beside the bell
      cast: [{ species: 'pallbearer', lx: 8.6, lz: 3.8, yaw: 1.2, awake: false }],
    };
  },

  /* ------------------------------------------------------------- lighthouse
     THE DROWNED LIGHT. sites.js's landmark is the climb — 81 treads to the lamp room. What
     it has never had is anything to FIND. Three rooms get furnished here: the tower's foot
     (the oil store, on the arc the stair has already climbed clear of), the keeper's cottage
     off it (the bunk, the chart table under the window, the stove), and the lamp room at
     36.7 (the clock, the gear train and the bath the light used to turn on). */
  lighthouse(api) {
    const k = kits(), S = k.solid, G = k.glow;

    // ---- the tower foot: the oil store, under the fifth turn of the stair -------------------
    // The lowest tread over this arc is 2.3-3.8 m up (tread 1 is at angle 2.02 rad and the
    // flight rises 0.453 a tread, 14 to a turn), so nothing here is under a knee.
    for (let i = 0; i < 4; i++) {
      const a = -2.30 + i * 0.42, r = 2.45;
      const px = Math.cos(a) * r, pz = Math.sin(a) * r;
      S.cyl(0.32, 0.32, 0.84, 10, px, api.padY + 0.42, pz, C.rust);
      S.cyl(0.33, 0.33, 0.05, 10, px, api.padY + 0.86, pz, SOOT);
      api.emit({ kind: 'circle', x: px, z: pz, r: 0.36, y0: api.padY, y1: api.padY + 0.88, tag: 'metal' });
    }
    {
      const a = -0.95, r = 2.30, px = Math.cos(a) * r, pz = Math.sin(a) * r;
      const yaw = -(a + Math.PI * 0.5);
      solid(S, api, 1.5, 0.78, 0.62, px, 0.39, pz, TAR, yaw, 'wood', true);
      S.box(0.34, 0.03, 0.26, px, api.padY + 0.81, pz, C.paper, yaw, 0, 0.06);   // the keeper's log
      S.cyl(0.09, 0.09, 0.24, 8, px + 0.4, api.padY + 0.90, pz + 0.2, C.metal);
      lamp(S, G, api, px, 1.55, pz, yaw, 0.26, 0.30);
      S.cyl(0.30, 0.30, 0.20, 10, Math.cos(-1.9) * 2.7, api.padY + 0.10, Math.sin(-1.9) * 2.7,
        C.cloth, 0, Math.PI * 0.5);
      S.cyl(0.035, 0.035, 1.4, 4, Math.cos(-1.55) * 2.9, api.padY + 0.70, Math.sin(-1.55) * 2.9,
        TAR, 0, 0.20, 0.14);
    }

    // ---- the keeper's cottage at (9, 3), yaw 0.3, 9 x 6.5 x 3.4 -------------------------------
    {
      const f = frame(9, 3, 0.3), Y = f.yaw;
      solid(S, api, 2.0, 0.44, 0.92, f.x(-2.6, 0.9), 0.22, f.z(-2.6, 0.9), TAR, Y, 'wood', true);
      S.box(1.94, 0.20, 0.80, f.x(-2.6, 0.9), api.padY + 0.54, f.z(-2.6, 0.9), C.cloth, Y);
      S.cyl(0.20, 0.20, 0.80, 8, f.x(-3.3, 0.9), api.padY + 0.58, f.z(-3.3, 0.9), C.cloth, Y, 0, Math.PI * 0.5);
      // the chart table, under the window sites.js already cut in the -Z wall
      solid(S, api, 1.8, 0.76, 0.86, f.x(1.0, -1.9), 0.38, f.z(1.0, -1.9), TAR, Y, 'wood', true);
      S.box(1.5, 0.02, 0.72, f.x(1.0, -1.9), api.padY + 0.79, f.z(1.0, -1.9), C.paper, Y);
      S.box(0.7, 0.02, 0.44, f.x(1.4, -1.7), api.padY + 0.81, f.z(1.4, -1.7), C.paper, Y + 0.4);
      S.cyl(0.08, 0.08, 0.09, 8, f.x(0.4, -2.1), api.padY + 0.85, f.z(0.4, -2.1), IRON, Y);
      S.box(0.06, 0.03, 0.30, f.x(1.7, -1.6), api.padY + 0.82, f.z(1.7, -1.6), C.metal, Y + 0.9);
      lamp(S, G, api, f.x(1.0, -2.6), 1.55, f.z(1.0, -2.6), Y + Math.PI, 0.30, 0.34);
      // the stove and its flue
      solid(S, api, 0.66, 0.90, 0.62, f.x(3.2, 1.9), 0.45, f.z(3.2, 1.9), IRON, Y, 'metal');
      S.cyl(0.10, 0.10, 2.5, 8, f.x(3.2, 1.9), api.padY + 2.15, f.z(3.2, 1.9), SOOT);
      S.box(0.30, 0.28, 0.05, f.x(3.2, 1.56), api.padY + 0.50, f.z(3.2, 1.56), SOOT, Y);
      G.pane(0.24, 0.22, f.x(3.2, 1.52), api.padY + 0.50, f.z(3.2, 1.52), PANE_LAMP, Y + Math.PI, 0, 4, 4);
      // the shelf of oil cans, and the chair
      S.box(2.2, 0.06, 0.28, f.x(-1.0, 2.7), api.padY + 1.55, f.z(-1.0, 2.7), TAR, Y);
      for (let i = 0; i < 5; i++) {
        S.box(0.20, 0.26, 0.20, f.x(-1.9 + i * 0.45, 2.7), api.padY + 1.71,
          f.z(-1.9 + i * 0.45, 2.7), C.metal, Y + api.rng.range(-0.3, 0.3));
      }
      solid(S, api, 0.42, 0.46, 0.42, f.x(0.2, -0.7), 0.23, f.z(0.2, -0.7), TAR, Y + 0.7, 'wood', true);
      S.box(0.40, 0.46, 0.05, f.x(0.2, -0.5), api.padY + 0.68, f.z(0.2, -0.5), TAR, Y + 0.7);
    }

    // ---- the lamp room at 36.7: the mechanism the light turned on -------------------------------
    // Its floor is a 216-degree sector from about 0.37 to 4.14 rad round a 0.9 m pedestal, and
    // the stair arrives through the rest; everything here sits inside that sector.
    {
      const F = 36.7;
      S.tube(0.16, 0.16, 2.6, 8, 2.0, api.padY + F + 1.3, 1.1, IRON);          // the weight tube
      S.cyl(0.13, 0.13, 0.30, 8, 2.0, api.padY + F + 0.45, 1.1, C.metal);      // the weight in it
      const ring = new THREE.TorusGeometry(1.15, 0.06, 4, 20);
      ring.rotateX(Math.PI * 0.5); ring.translate(0, api.padY + F + 0.34, 0);
      S.push(ring, C.rust);
      for (const a of [0.9, 2.0, 3.1]) {
        S.cyl(0.22, 0.22, 0.07, 10, Math.cos(a) * 1.15, api.padY + F + 0.34, Math.sin(a) * 1.15,
          C.metal, 0, Math.PI * 0.5);
        S.cyl(0.045, 0.045, 0.34, 5, Math.cos(a) * 1.15, api.padY + F + 0.17, Math.sin(a) * 1.15, IRON);
      }
      S.tube(0.86, 0.86, 0.16, 12, 0, api.padY + F + 0.78, 0, C.metal);        // the bath
      S.box(1.5, 0.06, 0.26, -1.6, api.padY + F + 1.30, 1.6, TAR, -0.8);       // the tool shelf
      for (let i = 0; i < 4; i++) {
        S.box(0.14, 0.20, 0.14, -2.0 + i * 0.34, api.padY + F + 1.43, 1.9 - i * 0.14,
          C.metal, api.rng.range(0, TAU));
      }
      S.cyl(0.06, 0.06, 1.6, 6, -0.9, api.padY + F + 1.50, -0.9, C.metal, 0, 0.4, 0.4);
      G.pane(0.9, 0.30, 0, api.padY + F + 0.87, 0, PANE_TUBE, 0, -Math.PI * 0.5, 8, 4);
      lamp(S, G, api, -1.6, F + 1.62, 1.6, -0.8 + Math.PI, 0.26, 0.26);
    }

    return { solid: S.build(), glow: G.build() };
  },

  /* ------------------------------------------------------------------- mill
     THE HOLLOW MILL. The tower's collider is a 4.4 m circle — it is solid — so the milling
     floor goes where a working mill's really was: OUTSIDE, on a timber stage round the west
     side, with the sack hoist swinging over it and the grain chute coming down from a hatch
     five metres up. Sacks in the lean-to. Two hounds asleep in the meal. */
  mill(api) {
    const k = kits(), S = k.solid, G = k.glow;

    // ---- the stage ---------------------------------------------------------------------------
    const DX = -7.4, DZ = -2.0, DY = 1.05;
    deck(S, api, DX, DZ, 6.4, 4.6, DY, C.plank, 0, false);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      S.cyl(0.15, 0.15, DY + 0.4, 6, DX + sx * 2.7, api.padY + DY * 0.5, DZ + sz * 1.9, TAR);
    }
    steps(S, api, DX + 1.4, DZ - 2.5, 1.5, DY, 0, C.plank);
    // Two dressed stones stood on edge. A 1.7 m disc of C.stone under the torch is a white
    // circle and nothing else — LOOKED AT, tests/shots/r7-B-hollow-mill-stage.png, first cut.
    // What makes a millstone read as a millstone is the EYE and the furrows, and both of
    // them are dark, so they survive the torch when the face does not (docs/ART.md 1.9).
    for (const s of [-1, 1]) {
      const cx = DX + s * 1.9, cz = DZ + 1.2, ry = 0.3 * s;
      const g = new THREE.CylinderGeometry(0.85, 0.85, 0.28, 14);
      g.rotateX(Math.PI * 0.5); g.rotateY(ry);
      g.translate(cx, api.padY + DY + 0.85, cz);
      S.push(g, C.stone);
      for (const face of [-1, 1]) {
        const eye = new THREE.CylinderGeometry(0.17, 0.17, 0.10, 10);
        eye.rotateX(Math.PI * 0.5); eye.rotateY(ry);
        eye.translate(cx + Math.cos(ry) * face * 0.14, api.padY + DY + 0.85, cz - Math.sin(ry) * face * 0.14);
        S.push(eye, SOOT);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI;
          const fu = new THREE.BoxGeometry(1.55, 0.05, 0.05);
          fu.rotateZ(a); fu.rotateY(ry + Math.PI * 0.5);
          fu.translate(cx + Math.cos(ry) * face * 0.16, api.padY + DY + 0.85, cz - Math.sin(ry) * face * 0.16);
          S.push(fu, SOOT);
        }
      }
      api.emit({
        kind: 'circle', x: cx, z: cz, r: 0.88,
        y0: api.padY + DY, y1: api.padY + DY + 1.7, tag: 'stone',
      });
    }
    S.tube(1.15, 1.35, 1.05, 10, DX - 1.4, api.padY + DY + 0.52, DZ - 1.2, TAR);
    S.cyl(1.20, 1.20, 0.10, 10, DX - 1.4, api.padY + DY + 1.06, DZ - 1.2, TAR);
    api.emit({
      kind: 'circle', x: DX - 1.4, z: DZ - 1.2, r: 1.35,
      y0: api.padY + DY, y1: api.padY + DY + 1.1, tag: 'wood',
    });

    // ---- the hoist: a gantry off the tower at 7.2 m, a pulley, a sack halfway up ---------------
    S.box(0.34, 0.30, 6.6, -3.4, api.padY + 7.2, 0, TAR, Math.PI * 0.5);
    S.box(0.30, 3.2, 0.30, -1.9, api.padY + 5.8, 0, TAR, 0, 0, 0.42);
    S.cyl(0.26, 0.26, 0.12, 10, -6.3, api.padY + 7.05, 0, C.rust, 0, 0, Math.PI * 0.5);
    S.cyl(0.03, 0.03, 4.0, 4, -6.3, api.padY + 5.0, 0, C.cloth);
    S.box(0.52, 0.72, 0.42, -6.3, api.padY + 2.72, 0, C.cloth, 0.2);
    // the climb off the stage: 1.05 -> a sack stack at 1.70 -> the hoist platform at 2.55
    solid(S, api, 1.1, 1.70, 1.0, -9.0, 0.85, -5.0, C.cloth, 0.2, 'wood', true);
    deck(S, api, -9.0, -6.6, 3.0, 2.4, 2.55, C.plank, 0.1, true);
    S.box(3.0, 0.08, 0.08, -9.0, api.padY + 3.55, -7.7, C.rust, 0.1);
    for (let i = -1; i <= 1; i++) S.box(0.05, 1.0, 0.05, -9.0 + i * 1.3, api.padY + 3.05, -7.7, C.rust);

    // ---- the grain chute, from a hatch in the tower down into a bin -----------------------------
    {
      const x0 = -3.1, z0 = -3.6, y0 = 5.4, x1 = -5.9, z1 = -7.7, y1 = 1.5;
      const flat = Math.hypot(x1 - x0, z1 - z0), len = Math.hypot(y0 - y1, flat);
      const head = Math.atan2(x1 - x0, z1 - z0), pitch = -Math.atan2(y0 - y1, flat);
      const g = new THREE.BoxGeometry(0.72, 0.16, len);
      g.rotateX(pitch); g.rotateY(head);
      g.translate((x0 + x1) * 0.5, api.padY + (y0 + y1) * 0.5, (z0 + z1) * 0.5);
      S.push(g, TAR);
      for (const s of [-1, 1]) {
        const gg = new THREE.BoxGeometry(0.06, 0.34, len);
        gg.rotateX(pitch); gg.rotateY(head);
        gg.translate((x0 + x1) * 0.5 + s * 0.36 * Math.cos(head),
          api.padY + (y0 + y1) * 0.5 + 0.16, (z0 + z1) * 0.5 - s * 0.36 * Math.sin(head));
        S.push(gg, TAR);
      }
      S.box(0.90, 0.60, 0.18, x0 + 0.2, api.padY + y0 + 0.5, z0 + 0.3, SOOT, 0.9);
      solid(S, api, 1.7, 1.3, 1.5, x1 - 0.2, 0.65, z1 - 0.2, TAR, 0.15, 'wood');
      S.box(1.5, 0.06, 1.3, x1 - 0.2, api.padY + 1.28, z1 - 0.2, C.soil, 0.15);
    }

    // ---- sacks in the lean-to at (7.5, 4.5), yaw 0.6, 7 x 5 x 2.8 --------------------------------
    {
      const f = frame(7.5, 4.5, 0.6), Y = f.yaw;
      for (let i = 0; i < 9; i++) {
        const lx = -2.0 + (i % 3) * 0.76, lz = 1.3 - Math.floor(i / 3) * 0.1;
        S.box(0.66, 0.86, 0.54, f.x(lx, lz), api.padY + 0.43, f.z(lx, lz),
          C.cloth, Y + api.rng.range(-0.3, 0.3));
        api.emit({
          kind: 'circle', x: f.x(lx, lz), z: f.z(lx, lz), r: 0.40,
          y0: api.padY, y1: api.padY + 0.86, tag: 'wood',
        });
      }
      for (let i = 0; i < 4; i++) {
        const lx = -1.7 + i * 0.76;
        S.box(0.64, 0.80, 0.52, f.x(lx, 1.25), api.padY + 1.26, f.z(lx, 1.25),
          C.cloth, Y + api.rng.range(-0.4, 0.4));
      }
      S.box(1.5, 0.04, 1.1, f.x(-0.4, 0.1), api.padY + 0.02, f.z(-0.4, 0.1), C.paper, Y + 0.3);
      S.box(0.60, 0.72, 0.48, f.x(-0.2, 0.3), api.padY + 0.30, f.z(-0.2, 0.3), C.cloth, Y + 1.1, 0.7);
      // the scale beam and the barrow
      S.box(0.08, 1.5, 0.08, f.x(2.2, 1.4), api.padY + 0.75, f.z(2.2, 1.4), IRON, Y);
      S.box(1.2, 0.06, 0.06, f.x(2.2, 1.4), api.padY + 1.46, f.z(2.2, 1.4), IRON, Y + 0.9);
      for (const s of [-1, 1]) {
        S.cyl(0.22, 0.22, 0.04, 8, f.x(2.2 + s * 0.55, 1.4), api.padY + 1.24,
          f.z(2.2 + s * 0.55, 1.4), C.metal, Y, Math.PI * 0.5);
      }
      solid(S, api, 1.3, 0.52, 0.72, f.x(1.6, -1.2), 0.26, f.z(1.6, -1.2), TAR, Y + 0.3, 'wood', true);
      S.cyl(0.30, 0.30, 0.09, 8, f.x(0.9, -1.2), api.padY + 0.30, f.z(0.9, -1.2), IRON, Y + 0.3, 0, Math.PI * 0.5);
      lamp(S, G, api, f.x(0, 2.0), 2.10, f.z(0, 2.0), Y + Math.PI, 0.30, 0.34);
    }
    lamp(S, G, api, DX, DY + 2.2, DZ + 2.2, Math.PI, 0.34, 0.38);

    return {
      solid: S.build(), glow: G.build(),
      cast: [
        { species: 'hound', lx: -10.6, lz: 2.6, yaw: 0.4, awake: false },
        { species: 'hound', lx: -9.4, lz: 4.4, yaw: -0.9, awake: false },
      ],
    };
  },

  /* --------------------------------------------------------------- cemetery
     THE GARDEN OF REST. Three things it never had: a CHAPEL OF REST with the bier still on
     its trestles, a TOOL STORE against the yard wall whose flat roof is the only place you
     can see over that wall from, and, inside the far mausoleum the claim lamp hangs on, a
     shelf whose slab is on the floor. And one grave has been dug OUT rather than in. */
  cemetery(api) {
    const k = kits(), S = k.solid, G = k.glow;

    // ---- the chapel of rest, west of the graves ------------------------------------------------
    {
      const CX = -17.2, CZ = 6.5, Y = 0.34;
      const f = frame(CX, CZ, Y);
      const w = 7.0, d = 8.6, h = 4.0, t = 0.42, gap = 1.8;
      const put = (lx, lz, sw, sd) => {
        const px = f.x(lx, lz), pz = f.z(lx, lz);
        const gy = groundY(api, px, pz);
        S.box(sw, h + 0.7, sd, px, gy + (h - 0.7) * 0.5 + 0.35, pz, C.stone, Y);
        api.emit({
          kind: 'obb', x: px, z: pz, halfX: sw * 0.5, halfZ: sd * 0.5, yaw: Y,
          y0: gy - 0.7, y1: gy + h, tag: 'wall',
        });
      };
      put(0, d * 0.5, w, t); put(-w * 0.5, 0, t, d); put(w * 0.5, 0, t, d);
      const side = (w - gap) * 0.5;
      put(-(gap + side) * 0.5, -d * 0.5, side, t); put((gap + side) * 0.5, -d * 0.5, side, t);
      const gy0 = groundY(api, CX, CZ), L0 = gy0 - api.padY;
      S.box(gap, 0.5, t, f.x(0, -d * 0.5), gy0 + h - 0.25, f.z(0, -d * 0.5), C.stone, Y);
      for (const s of [-1, 1]) {
        const g = new THREE.BoxGeometry(Math.hypot(1.5, w * 0.5) + 0.2, 0.18, d + 0.5);
        g.rotateZ(-s * Math.atan2(1.5, w * 0.5));
        g.translate(s * w * 0.25, gy0 + h + 0.75, 0);
        g.rotateY(Y); g.translate(CX, 0, CZ);
        S.push(g, C.slate);
      }
      S.box(0.7, 1.5, 0.4, f.x(0, d * 0.5 - 0.1), gy0 + h + 1.6, f.z(0, d * 0.5 - 0.1), C.stone, Y);
      // THE BIER, on trestles, with what is on it under a sheet
      solid(S, api, 2.4, 0.10, 1.0, f.x(0, 0.6), L0 + 0.86, f.z(0, 0.6), TAR, Y, 'wood', true);
      for (const s of [-1, 1]) {
        S.box(0.14, 0.82, 0.90, f.x(s * 0.9, 0.6), gy0 + 0.41, f.z(s * 0.9, 0.6), TAR, Y);
      }
      S.box(2.1, 0.30, 0.72, f.x(0, 0.6), gy0 + 1.05, f.z(0, 0.6), C.cloth, Y);
      // candle stands either side, benches down the walls
      for (const s of [-1, 1]) {
        const px = f.x(s * 1.7, 1.7), pz = f.z(s * 1.7, 1.7);
        S.cyl(0.24, 0.16, 0.08, 8, px, gy0 + 0.04, pz, IRON);
        S.cyl(0.05, 0.05, 1.30, 6, px, gy0 + 0.69, pz, IRON);
        S.cyl(0.09, 0.09, 0.22, 8, px, gy0 + 1.45, pz, C.cloth);
        G.pane(0.20, 0.30, px, gy0 + 1.68, pz, PANE_LAMP, 0, 0, 4, 5);
        api.emit({ kind: 'circle', x: px, z: pz, r: 0.24, y0: gy0 - 0.2, y1: gy0 + 1.4, tag: 'metal' });
        solid(S, api, 0.42, 0.10, 4.6, f.x(s * 3.0, 0.4), L0 + 0.42, f.z(s * 3.0, 0.4), TAR, Y, 'wood', true);
      }
      for (let i = 0; i < 5; i++) {
        S.box(2.0, 0.06, 0.44, f.x(-2.2, 3.4), gy0 + 0.06 + i * 0.07, f.z(-2.2, 3.4),
          TAR, Y + api.rng.range(-0.05, 0.05));
      }
      solid(S, api, 1.9, 0.42, 0.66, f.x(2.0, 3.2), L0 + 0.21, f.z(2.0, 3.2), IRON, Y, 'metal', true);
      lamp(S, G, api, f.x(0, 3.9), L0 + 2.55, f.z(0, 3.9), Y + Math.PI, 0.32, 0.36);
    }

    // ---- the tool store against the yard wall, with a roof you can get onto ----------------------
    {
      const TX = 15.6, TZ = -13.4, Y = -0.5;
      const f = frame(TX, TZ, Y);
      const gy = groundY(api, TX, TZ), L0 = gy - api.padY;
      for (const [lx, lz, sw, sd] of [[0, 1.3, 4.2, 0.34], [-2.0, 0, 0.34, 2.6], [2.0, 0, 0.34, 2.6]]) {
        const px = f.x(lx, lz), pz = f.z(lx, lz);
        S.box(sw, 2.5, sd, px, gy + 1.05, pz, C.stone, Y);
        api.emit({
          kind: 'obb', x: px, z: pz, halfX: sw * 0.5, halfZ: sd * 0.5, yaw: Y,
          y0: gy - 0.3, y1: gy + 2.3, tag: 'wall',
        });
      }
      for (const s of [-1, 1]) S.cyl(0.12, 0.12, 2.3, 6, f.x(s * 1.9, -1.2), gy + 1.15, f.z(s * 1.9, -1.2), TAR);
      S.box(4.6, 0.18, 3.1, TX, gy + 2.39, TZ, C.slate, Y);
      api.emit({
        kind: 'obb', x: TX, z: TZ, halfX: 2.3, halfZ: 1.55, yaw: Y,
        y0: gy + 2.30, y1: gy + 2.48, tag: 'wood', standable: true,
      });
      // the climb: a lime bin at 0.75, a stack of boards at 1.42, then the eave at 2.30
      solid(S, api, 1.2, 0.75, 1.0, f.x(-3.0, -0.4), L0 + 0.375, f.z(-3.0, -0.4), C.stone, Y, 'stone', true);
      solid(S, api, 1.9, 0.67, 0.9, f.x(-2.6, -1.7), L0 + 1.085, f.z(-2.6, -1.7), TAR, Y + 0.2, 'wood', true);
      for (let i = 0; i < 5; i++) {
        const px = f.x(-1.5 + i * 0.42, 1.0), pz = f.z(-1.5 + i * 0.42, 1.0);
        S.cyl(0.035, 0.035, 1.5, 4, px, gy + 0.78, pz, TAR,
          0, api.rng.range(-0.12, 0.12), api.rng.range(-0.12, 0.12));
        S.box(0.20, 0.30, 0.03, px, gy + 0.16, pz, C.metal, Y);
      }
      solid(S, api, 1.1, 0.46, 0.7, f.x(1.2, 0.4), L0 + 0.23, f.z(1.2, 0.4), IRON, Y + 0.4, 'metal', true);
      S.cyl(0.28, 0.28, 0.08, 8, f.x(0.6, 0.4), gy + 0.28, f.z(0.6, 0.4), IRON, Y + 0.4, 0, Math.PI * 0.5);
      S.cyl(0.32, 0.32, 0.24, 10, f.x(1.5, -0.6), gy + 0.12, f.z(1.5, -0.6), C.cloth, 0, Math.PI * 0.5);
      lamp(S, G, api, f.x(0, 1.0), L0 + 2.05, f.z(0, 1.0), Y + Math.PI, 0.28, 0.30);
    }

    // ---- inside the far mausoleum, the one the claim lamp hangs on ---------------------------------
    // Its shell was set at a random yaw within +-0.2 rad, so nothing here reaches past 1.2 m
    // from the centre and a fifth of a radian cannot push it into a wall.
    {
      const MX = 0, MZ = 14;
      for (let i = 0; i < 3; i++) {
        const s = i - 1;
        solid(S, api, 1.9, 0.16, 0.62, MX, 0.62, MZ + s * 0.78, C.stone, 0, 'stone', true);
        if (i !== 2) {
          S.box(1.86, 0.44, 0.56, MX, api.padY + 0.92, MZ + s * 0.78, C.stone);
          S.box(1.90, 0.06, 0.60, MX, api.padY + 1.16, MZ + s * 0.78, IRON);
        }
      }
      S.box(1.9, 0.14, 0.60, MX + 0.5, api.padY + 0.07, MZ - 1.0, C.stone, 0.22);
      api.emit({
        kind: 'obb', x: MX + 0.5, z: MZ - 1.0, halfX: 0.95, halfZ: 0.30, yaw: 0.22,
        y0: api.padY, y1: api.padY + 0.14, tag: 'stone', standable: true,
      });
      G.pane(0.5, 0.22, MX, api.padY + 0.62, MZ + 0.78, PANE_TUBE, 0, -Math.PI * 0.5, 5, 3);
    }

    // ---- the grave that was dug OUT -----------------------------------------------------------------
    {
      const GX = -14.0, GZ = 3.2, gy = groundY(api, GX, GZ);
      for (const [ox, oz, w, d] of [[0, 1.15, 2.4, 0.5], [0, -1.15, 2.4, 0.5], [-1.0, 0, 0.5, 2.0], [1.0, 0, 0.5, 2.0]]) {
        S.box(w, 0.42, d, GX + ox, gy + 0.16, GZ + oz, C.soil, 0.3);
      }
      S.box(2.0, 0.05, 1.6, GX, gy - 0.02, GZ, SOOT, 0.3);
      S.cyl(0.035, 0.035, 1.5, 4, GX + 1.3, gy + 0.7, GZ + 0.9, TAR, 0, 0.14, 0.1);
      S.box(0.20, 0.30, 0.03, GX + 1.44, gy + 0.02, GZ + 1.0, C.metal, 0.3);
    }

    return {
      solid: S.build(), glow: G.build(),
      cast: [{ species: 'pallbearer', lx: -14.0, lz: 3.2, yaw: 0, awake: false }],
    };
  },

  /* ------------------------------------------------------------------ tower
     THE BELL TOWER. sites.js draws fourteen outside steps up the shaft and emits NO collider
     for any of them, so the one climb at this place is scenery you walk through. This dress
     collides them, carries the flight sixteen steps further to a RINGING FLOOR at 13 m, and
     hangs a bell-hop stage off it at r 7.2 — which is standing with a clean line up into the
     belfry. docs/NEXT.md B2: the bell you have to shoot is hidden by its own shaft from
     anywhere inside 13.5 m on the ground (measured: the sight line from eye height to the
     bell at 24.4 clears the shaft's top corner at (3.2, 19) only past that). Underneath, in
     the ruined nave, is the pit the bell was cast in and the bell that cracked. */
  tower(api) {
    const k = kits(), S = k.solid, G = k.glow;

    // ---- THE OUTER STRING, and the colliders --------------------------------------------------
    // MEASURED 2026-09-03, `node tools/lane-b-stairs.mjs`: sites.js's fourteen treads are
    // centred at r 4.6 from the tower's axis, and the SHAFT is a 6.4 m square whose diagonal
    // corner reaches 4.525 m. A body of radius 0.36 standing on a tread at 4.6 therefore
    // overlaps the shaft at the two corner bearings (0.79 and 3.93 rad) and cannot stand
    // there at all — which is the second half of why nobody has ever climbed this tower.
    //
    // So the dress bolts an OUTER STRING onto the flight: a timber half-tread on brackets
    // from r 5.05 to 5.65 beside every stone tread. The walking line moves out to 5.15,
    // where a body clears the corner by 0.26 m, and the collider covers stone and timber
    // together. The lash-up is the point: somebody has been keeping this stair usable.
    const RW = 5.15;                     // the walking radius, and the collider's centre
    const tread = (i, drawStone) => {
      const a = i * 0.42, y = 0.4 + i * 0.42;
      const cx = Math.cos(a), cz = Math.sin(a);
      if (drawStone) S.box(1.6, 0.18, 0.9, cx * 4.6, api.padY + y, cz * 4.6, C.stone, -a);
      // the timber half-tread on its bracket
      S.box(1.5, 0.14, 0.72, cx * 5.32, api.padY + y - 0.02, cz * 5.32, TAR, -a);
      S.box(0.16, 0.34, 0.62, cx * 5.32, api.padY + y - 0.26, cz * 5.32, IRON, -a);
      api.emit({
        kind: 'obb', x: cx * RW, z: cz * RW, halfX: 0.78, halfZ: 0.78, yaw: -a,
        y0: api.padY + y - 0.09, y1: api.padY + y + 0.09, tag: 'stone', standable: true,
      });
      if (i % 2 === 0) {
        S.box(0.07, 0.95, 0.07, cx * 5.72, api.padY + y + 0.55, cz * 5.72, C.rust);
        S.box(1.5, 0.06, 0.06, cx * 5.72, api.padY + y + 1.00, cz * 5.72, C.rust, -a);
      }
    };
    for (let i = 0; i < 14; i++) tread(i, false);     // sites.js already draws the stone
    for (let i = 14; i < 30; i++) tread(i, true);     // and this dress carries it to 13 m

    // ---- the ringing floor at the head of the flight ---------------------------------------------
    {
      const a = 30 * 0.42, RY = 0.4 + 30 * 0.42;         // 13.0 m
      const cx = Math.cos(a) * 5.7, cz = Math.sin(a) * 5.7;
      const yaw = -(a + Math.PI * 0.5);
      deck(S, api, cx, cz, 4.4, 2.6, RY, C.plank, yaw, false);
      for (const s of [-1, 1]) {
        S.box(0.30, RY, 0.30, cx + Math.cos(a) * 1.3, api.padY + RY * 0.5,
          cz + Math.sin(a) * 1.3 + s * 1.0, TAR);
      }
      S.box(4.4, 0.09, 0.09, cx + Math.cos(a) * 1.4, api.padY + RY + 1.05,
        cz + Math.sin(a) * 1.4, C.rust, yaw);
      for (let i = -2; i <= 2; i++) {
        S.box(0.05, 1.05, 0.05,
          cx + Math.cos(a) * 1.4 + ax(yaw) * i * 1.0, api.padY + RY + 0.52,
          cz + Math.sin(a) * 1.4 + az(yaw) * i * 1.0, C.rust);
      }
      // the rope down from the belfry, the sally, the coil, the peal board chalked with a date
      S.cyl(0.035, 0.035, 10.4, 4, cx * 0.55, api.padY + RY + 5.4, cz * 0.55, C.cloth, 0, 0.05, 0.11);
      S.cyl(0.075, 0.075, 0.66, 6, cx * 0.76, api.padY + RY + 1.1, cz * 0.76, C.paper);
      S.cyl(0.26, 0.26, 0.20, 10, cx - 1.0, api.padY + RY + 0.10, cz, C.cloth, 0, Math.PI * 0.5);
      S.box(1.2, 0.86, 0.07, cx + Math.cos(a) * 1.1, api.padY + RY + 1.35,
        cz + Math.sin(a) * 1.1, SOOT, yaw);
      tags(S, api, cx + Math.cos(a) * 1.05, RY + 1.60, cz + Math.sin(a) * 1.05, yaw, 3, 3, 0.22, C.paper);
      solid(S, api, 1.6, 0.10, 0.38, cx - Math.cos(a) * 1.4, RY + 0.46,
        cz - Math.sin(a) * 1.4, TAR, yaw, 'wood', true);
      lamp(S, G, api, cx + Math.cos(a) * 1.2, RY + 1.85, cz + Math.sin(a) * 1.2, yaw + Math.PI, 0.34, 0.36);

      // ---- the bell-hop stage, out at r 7.2, where the bell clears its own shaft ---------------
      const bA = a + 0.55;
      const bx = Math.cos(bA) * 7.2, bz = Math.sin(bA) * 7.2;
      const bYaw = -(bA + Math.PI * 0.5);
      const mx = (cx + bx) * 0.5, mz = (cz + bz) * 0.5;
      solid(S, api, Math.hypot(bx - cx, bz - cz) + 1.2, 0.16, 1.2, mx, RY - 0.08, mz,
        C.plank, Math.atan2(bx - cx, bz - cz) + Math.PI * 0.5, 'wood', true);
      deck(S, api, bx, bz, 2.8, 2.4, RY, C.plank, bYaw, false);
      {
        const len = Math.hypot(RY, 5.0);
        const g = new THREE.CylinderGeometry(0.20, 0.24, len, 6);
        g.rotateZ(-Math.atan2(Math.cos(bA) * 5.0, RY));
        g.rotateX(Math.atan2(Math.sin(bA) * 5.0, RY));
        g.translate(bx - Math.cos(bA) * 2.5, api.padY + RY * 0.5, bz - Math.sin(bA) * 2.5);
        S.push(g, TAR);
        api.emit({
          kind: 'circle', x: bx - Math.cos(bA) * 2.5, z: bz - Math.sin(bA) * 2.5, r: 0.3,
          y0: api.padY, y1: api.padY + RY, tag: 'wood',
        });
      }
      S.box(2.8, 0.09, 0.09, bx, api.padY + RY + 1.05, bz, C.rust, bYaw);
      for (let i = -1; i <= 1; i++) {
        S.box(0.05, 1.05, 0.05, bx + ax(bYaw) * i * 1.2, api.padY + RY + 0.52,
          bz + az(bYaw) * i * 1.2, C.rust);
      }
      // a lantern up here, so once the bell is rung the climb reads from the road
      lamp(S, G, api, bx, RY + 1.5, bz, bYaw, 0.36, 0.40);
    }

    // ---- the casting pit, in the ruined nave -------------------------------------------------------
    {
      const PX = 0, PZ = 12.5, N = 14;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU;
        const px = PX + Math.cos(a) * 2.2, pz = PZ + Math.sin(a) * 2.2;
        S.box(1.05, 0.62, 0.42, px, api.padY + 0.20, pz, C.brick, -(a + Math.PI * 0.5));
        api.emit({
          kind: 'obb', x: px, z: pz, halfX: 0.52, halfZ: 0.22, yaw: -(a + Math.PI * 0.5),
          y0: api.padY - 0.2, y1: api.padY + 0.5, tag: 'stone',
        });
      }
      S.cyl(2.0, 2.0, 0.06, 14, PX, api.padY - 0.02, PZ, SOOT);
      S.tube(0.86, 0.50, 1.55, 12, PX + 0.5, api.padY + 0.60, PZ - 0.3, IRON, 0.7, Math.PI * 0.44);
      S.cyl(0.87, 0.87, 0.10, 12, PX - 0.20, api.padY + 0.60, PZ - 0.9, SOOT, 0.7, Math.PI * 0.44);
      api.emit({
        kind: 'circle', x: PX + 0.5, z: PZ - 0.3, r: 0.95,
        y0: api.padY - 0.2, y1: api.padY + 1.3, tag: 'metal',
      });
      solid(S, api, 1.6, 1.1, 1.4, PX - 3.4, 0.55, PZ + 1.2, C.brick, 0.3, 'stone');
      S.box(0.60, 0.50, 0.06, PX - 3.4, api.padY + 0.55, PZ + 0.48, SOOT, 0.3);
      G.pane(0.52, 0.42, PX - 3.4, api.padY + 0.55, PZ + 0.44, PANE_LAMP, Math.PI + 0.3, 0, 5, 4);
      for (let i = 0; i < 3; i++) {
        S.cyl(0.04, 0.04, 1.6, 4, PX - 2.0 + i * 0.22, api.padY + 0.75, PZ + 2.6, TAR,
          0, api.rng.range(-0.16, 0.16), api.rng.range(-0.16, 0.16));
      }
    }

    return {
      solid: S.build(), glow: G.build(),
      // it is standing past the casting pit, and it has been for some time
      cast: [{ species: 'standing', lx: 0.0, lz: 15.6, yaw: Math.PI, awake: false }],
    };
  },

  /* ------------------------------------------------------------------- barn
     JACKFIELD. A 20 x 12 barn at (0, 0) with a 4.2 m cart doorway on -Z. Stalls down the west
     half, a HAY LOFT over the east half with a stair of bales up to it (the shotgun DESIGN 7.9
     always put in the loft is the claim's reward), the tractor nobody drained, and the auger
     that used to fill the loft. Somebody is asleep in the straw. */
  barn(api) {
    const k = kits(), S = k.solid, G = k.glow;

    // ---- the stalls -----------------------------------------------------------------------------
    for (let i = 0; i < 5; i++) {
      const pz = -4.4 + i * 2.2;
      solid(S, api, 5.2, 1.15, 0.12, -6.9, 0.58, pz, TAR, 0, 'wood');
      for (const px of [-9.4, -4.4]) post(S, api, 0.09, 2.4, px, 0, pz, TAR);
      if (i < 4) S.box(4.8, 0.06, 1.9, -6.9, api.padY + 0.03, pz + 1.1, C.cloth);
    }
    S.box(0.14, 0.14, 11.0, -4.4, api.padY + 2.42, 0, TAR, Math.PI * 0.5);
    solid(S, api, 0.55, 0.62, 10.6, -9.35, 0.31, 0, TAR, 0, 'wood');
    S.cyl(0.19, 0.19, 0.28, 8, -9.0, api.padY + 0.76, -2.0, C.metal);

    // ---- THE HAY LOFT over the east half ---------------------------------------------------------
    const LY = 3.30;
    deck(S, api, 5.5, 0, 8.4, 11.0, LY, C.plank, 0, false);
    for (const pz of [-4.2, 0, 4.2]) S.cyl(0.16, 0.16, LY, 6, 1.6, api.padY + LY * 0.5, pz, TAR);
    S.box(0.24, 0.30, 11.0, 1.45, api.padY + LY - 0.22, 0, TAR, Math.PI * 0.5);
    // the bale stair: six courses at 0.50, under CFG.player.STEP_UP (0.52), the top course
    // overlapping the loft's edge so there is no gap to fall down
    for (let i = 0; i < 6; i++) {
      solid(S, api, 1.6, 0.50, 0.72, 0.8, 0.25 + i * 0.50, -3.4 + i * 0.78, C.cloth,
        api.rng.range(-0.06, 0.06), 'wood', true);
      S.box(1.62, 0.05, 0.74, 0.8, api.padY + 0.50 + i * 0.50, -3.4 + i * 0.78, TAR);
    }
    // spread the length of the loft, not heaped in one corner — LOOKED AT,
    // tests/shots/r7-B-jackfield-loft.png, first cut: standing at the head of the bale
    // stair the far half of the loft was a bare box
    for (let i = 0; i < 13; i++) {
      const bx = 2.6 + (i % 4) * 1.7, bz = -4.4 + Math.floor(i / 4) * 3.1;
      solid(S, api, 1.02, 0.50, 0.70, bx, LY + 0.25 + (i % 3 === 0 ? 0.50 : 0), bz,
        C.cloth, api.rng.range(-0.2, 0.2), 'wood', true);
    }
    S.box(1.9, 0.06, 0.9, 7.6, api.padY + LY + 0.04, 3.4, C.paper, 0.2);
    // the crate the gun was in, and the pitchfork somebody left standing in a bale
    solid(S, api, 0.9, 0.42, 0.6, 8.4, LY + 0.21, -3.0, TAR, 0.3, 'wood', true);
    S.box(0.92, 0.06, 0.62, 8.4, api.padY + LY + 0.45, -3.0, TAR, 0.3);
    S.cyl(0.035, 0.035, 1.7, 4, 8.6, api.padY + LY + 0.85, 2.2, TAR, 0, 0.12, 0.08);
    for (let i = -1; i <= 1; i++) S.cyl(0.02, 0.02, 0.34, 4, 8.6 + i * 0.1, api.padY + LY + 0.15, 2.35, IRON);
    // a hay chute down through the loft floor, and the rope on its winch
    S.tube(0.44, 0.44, 0.5, 8, 3.4, api.padY + LY + 0.24, 4.6, TAR);
    S.cyl(0.035, 0.035, 2.0, 4, 3.4, api.padY + LY + 1.4, 4.6, C.cloth);
    lamp(S, G, api, 5.5, LY + 2.2, 1.6, Math.PI, 0.34, 0.38);

    // ---- THE TRACTOR, standable: its bonnet at 1.48 is a step ---------------------------------------
    {
      const TX = -2.4, TZ = -3.4, Y = 0.42;
      const f = frame(TX, TZ, Y);
      S.box(2.5, 0.62, 0.92, TX, api.padY + 0.86, TZ, C.rust, Y);
      S.box(1.25, 0.55, 0.80, f.x(0.75, 0), api.padY + 1.20, f.z(0.75, 0), C.rust, Y);
      S.cyl(0.10, 0.10, 0.70, 6, f.x(1.15, 0), api.padY + 1.75, f.z(1.15, 0), SOOT);
      for (const s of [-1, 1]) {
        const g = new THREE.CylinderGeometry(0.78, 0.78, 0.34, 12);
        g.rotateZ(Math.PI * 0.5); g.rotateY(Y);
        g.translate(f.x(-0.7, s * 0.78), api.padY + 0.78, f.z(-0.7, s * 0.78));
        S.push(g, IRON);
      }
      for (const s of [-1, 1]) {
        const g = new THREE.CylinderGeometry(0.40, 0.40, 0.22, 10);
        g.rotateZ(Math.PI * 0.5); g.rotateY(Y);
        g.translate(f.x(1.25, s * 0.62), api.padY + 0.40, f.z(1.25, s * 0.62));
        S.push(g, IRON);
      }
      S.box(0.46, 0.09, 0.44, f.x(-0.55, 0), api.padY + 1.25, f.z(-0.55, 0), TAR, Y);
      S.box(0.42, 0.40, 0.06, f.x(-0.80, 0), api.padY + 1.48, f.z(-0.80, 0), TAR, Y);
      const wheel = new THREE.TorusGeometry(0.20, 0.035, 4, 14);
      wheel.rotateX(0.7); wheel.rotateY(Y);
      wheel.translate(f.x(0.15, 0), api.padY + 1.52, f.z(0.15, 0));
      S.push(wheel, IRON);
      api.emit({
        kind: 'obb', x: TX, z: TZ, halfX: 1.9, halfZ: 1.0, yaw: Y,
        y0: api.padY, y1: api.padY + 1.48, tag: 'metal', standable: true,
      });
      G.pane(0.26, 0.16, f.x(1.42, -0.42), api.padY + 1.20, f.z(1.42, -0.42),
        PANE_LAMP, Y + Math.PI * 0.5, 0, 4, 3);
    }

    // ---- the auger, down from the loft into a bin ------------------------------------------------
    {
      const x0 = 1.9, z0 = 5.2, y0 = LY + 0.9, x1 = 6.4, z1 = 5.4, y1 = 0.5;
      const flat = Math.hypot(x1 - x0, z1 - z0), len = Math.hypot(y0 - y1, flat);
      const g = new THREE.CylinderGeometry(0.20, 0.20, len, 8);
      g.rotateZ(-Math.atan2(x1 - x0, y0 - y1));
      g.rotateX(Math.atan2(z1 - z0, y0 - y1));
      g.translate((x0 + x1) * 0.5, api.padY + (y0 + y1) * 0.5, (z0 + z1) * 0.5);
      S.push(g, IRON);
      solid(S, api, 1.2, 0.9, 1.2, x1 + 0.3, 0.45, z1, TAR, 0.2, 'wood');
    }
    // the stable lantern, the tack on the wall, the cart backed in through the big door
    lamp(S, G, api, -4.4, 2.05, -1.2, Math.PI * 0.5, 0.28, 0.32);
    for (let i = 0; i < 4; i++) {
      S.box(0.06, 0.55, 0.22, -9.55, api.padY + 1.62, 3.0 + i * 0.6, TAR, 0, 0, api.rng.range(-0.2, 0.2));
    }
    solid(S, api, 2.6, 0.30, 1.5, 5.0, 0.95, -4.6, C.plank, 0.12, 'wood', true);
    for (const s of [-1, 1]) {
      const g = new THREE.CylinderGeometry(0.62, 0.62, 0.12, 12);
      g.rotateZ(Math.PI * 0.5); g.rotateY(0.12);
      g.translate(5.0, api.padY + 0.62, -4.6 + s * 0.82);
      S.push(g, TAR);
    }

    return {
      solid: S.build(), glow: G.build(),
      cast: [{ species: 'poacher', lx: -6.9, lz: 3.4, yaw: 0, awake: false }],
    };
  },
};

export default DRESS;
