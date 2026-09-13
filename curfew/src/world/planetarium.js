// CURFEW — the town of Morning: a science centre with a dome, at the east end of the map.
// ROUND 22, lane I. Manifest id `planetarium`, constructed after `refuge`, before `player`.
//
// Alex, 2026-09-10: "Green highway sign: MORNING — 40. It's a town. It's the far end of the
// map. Whether there's anything there is your ending." "A planetarium or science center.
// Press the button and the dome does a sunrise. Twelve minutes long. It's the only morning
// in the game, and a horde knows the schedule." "The Planetarium. Morning is a twelve-minute
// projection and a logbook that says *this is all it ever was.* You press the button and sit
// down. Quiet, gnostic, mean."
//
// TWO THINGS LIVE HERE. First, the BUILDERS for the 'planetarium' major kind — the dome hall,
// the foyer, the benches, the console the claim post stands in, the lectern — authored the way
// outer-destinations.js is: this file imports nothing from sites.js (sites.js imports THIS
// file, and placedata -> staged -> sites would make a cycle) and takes the kit helpers as
// parameters. Second, the SYSTEM: the projection on the inside of the dome, the button that
// restarts it, the seat, and the logbook page.
//
// THE GEOMETRY IS OFFSET FROM THE SITE CENTRE ON PURPOSE. places.js faces every claim post
// AWAY from the site's (0, 0) and its sight rule refuses a hold from behind the plate. With
// the console at local (0, +3) the plate faces +Z (west, toward the seats and the door), so
// you stand between the audience and the console, looking east at the button — and east is
// where the sun comes up on the dome. The hall is centred at (0, +6); the door is at (0, +24),
// eleven metres off the ring road.
//
// ZERO NEW PROGRAMS. The projection surface is a CLONE of the sky's ShaderMaterial (same
// source, same defines, so three serves the same program) with the cloud, ridge and Milky Way
// zeroed and the moon block driven as a sun. The logbook is a canvas paper on a clone of
// places.matBody, exactly as opening.js's calendar is. The room warms with ONE borrowed
// rover. The light census stays 13. tools/round22/check-I.mjs measures all three.
//
// No words on the HUD: the button and the seat prompt with detail ''. The one line of copy in
// this lane is on the page on the lectern, in the world, where Alex put it.

import * as THREE from 'three';
import { CFG } from '../config.js';
import { TAU, clamp01, lerp, smoothstep } from '../engine/math.js';

const SITE_ID = 'morning';
const P = CFG.planetarium || {};

/* ==========================================================================
   THE LAYOUT, in the site's local frame (+Z toward the road, -Z east).
   Shared by the builders (geometry + colliders) and the system (seat points,
   the dome mesh), written once so they cannot disagree.
   ========================================================================== */
const DOME_Z = 6;            // the hall's centre
const RING_R = 8;            // the drum wall's centreline radius
const RING_SEG = 16;         // wall segments; segment 0 (at +Z) is the way in
const WALL_T = 0.44;
const WALL_H = 4.5;          // the drum, pad to springing line
const ROOF_R = 8.4;          // the hemisphere outside
const FOYER_HW = 6;          // half width
const FOYER_Z0 = 11.2, FOYER_Z1 = 24;   // side walls run between these; the door is at Z1
const FOYER_H = 4.2;
const DOOR_W = 2.4;          // the refuge leaf is 2.42 tall; the header starts there
const FLOOR = 0.14;          // the slab's top above padY
const CONSOLE_Z = 3;         // the claim point: placedata's claim.dz
const CONSOLE_R = 3.28;      // + places' FIXTURE_PROUD 0.28: where the post actually stands
const LECTERN = { x: -4.6, z: 19 };
const BENCH_W = 2.2;
const SEAT_OUT = 0.67;       // seat point: in front of the bench, feet on the floor

/** The benches: three arcs about the console, the aisle |x| < 1.2 clear. */
function benchList() {
  const out = [];
  // [radius, bench centre angles (deg) from +Z about the console]
  const rows = [
    [3.6, [38, 74]],
    [6.0, [23, 46, 69]],
    [8.4, [16.7, 33.7]],
  ];
  for (const [r, angs] of rows) {
    for (const deg of angs) for (const s of [-1, 1]) {
      const a = s * deg * Math.PI / 180;
      out.push({ x: r * Math.sin(a), z: CONSOLE_R + r * Math.cos(a), yaw: a, r });
    }
  }
  return out;
}
const BENCHES = benchList();

/** Two seat points per bench, on the floor in front of it, in the site's local frame. */
function seatList() {
  const out = [];
  for (const b of BENCHES) {
    const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw);   // toward the console
    const tx = Math.cos(b.yaw), tz = -Math.sin(b.yaw);    // along the bench
    for (const s of [-0.55, 0.55]) {
      out.push({ x: b.x + fx * SEAT_OUT + tx * s, z: b.z + fz * SEAT_OUT + tz * s });
    }
  }
  return out;
}
const SEATS = seatList();

/* ==========================================================================
   THE BUILDERS. Same contract as sites.js's: { landmark(api), body(api) } ->
   { solid, glow, glowLive, moving, glowColour }. Every collider is emitted here
   with the geometry it belongs to. Guarded for tests/sites.mjs's stub api
   (emit returns -1, heightAt is constant, no cast/flag/gate).
   ========================================================================== */
export function makePlanetariumBuilders({ Kit, kits, C, GLOW, groundY }) {
  const CONCRETE = [0.112, 0.113, 0.110];
  const GLASS = C.glass;

  /** A box on the solid kit plus its OBB, in one call, so the two cannot drift apart. */
  const wall = (k, api, w, y0, y1, d, x, z, ry, col, tag, extra) => {
    k.solid.box(w, y1 - y0, d, x, (y0 + y1) * 0.5, z, col, ry);
    api.emit(Object.assign({ kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw: ry || 0,
      y0, y1, tag: tag || 'wall' }, extra || null));
  };

  return {
    planetarium: {
      /** The far read and the shell: the drum, the dome, the foyer, the canopy. */
      landmark(api) {
        const k = kits();
        const y = api.padY;
        // THE PLINTH RULE (sites.js shell): walls run from the lowest ground under the
        // footprint, so a building on a slope grows a foundation rather than a gap.
        let gmin = y;
        for (let i = 0; i < RING_SEG; i++) {
          const a = i * TAU / RING_SEG;
          const g = groundY(api, RING_R * Math.sin(a), DOME_Z + RING_R * Math.cos(a));
          if (g < gmin) gmin = g;
        }
        for (const [x, z] of [[-FOYER_HW, FOYER_Z1], [FOYER_HW, FOYER_Z1], [-FOYER_HW, FOYER_Z0], [FOYER_HW, FOYER_Z0]]) {
          const g = groundY(api, x, z);
          if (g < gmin) gmin = g;
        }
        const base = gmin - 0.5;

        // --- the drum: sixteen faces, one left out for the way in from the foyer ---------
        const chord = 2 * RING_R * Math.sin(Math.PI / RING_SEG);
        for (let i = 1; i < RING_SEG; i++) {
          const a = i * TAU / RING_SEG;
          wall(k, api, chord + 0.10, base, y + WALL_H, WALL_T,
            RING_R * Math.sin(a), DOME_Z + RING_R * Math.cos(a), a, C.stone);
        }
        // the base course and the ring beam: draw-only, the way shell()'s plinth is
        k.solid.tube(RING_R + 0.34, RING_R + 0.34, 0.55, 32, 0, gmin + 0.27, DOME_Z, [C.stone[0] * 0.62, C.stone[1] * 0.62, C.stone[2] * 0.64]);
        k.solid.tube(RING_R + 0.55, RING_R + 0.55, 0.6, 32, 0, y + WALL_H, DOME_Z, C.dark);
        // --- the dome. A hemisphere on the springing line; the projection surface the
        //     system hangs inside it is a separate mesh with its own (cloned) material. -----
        const dome = new THREE.SphereGeometry(ROOF_R, 32, 12, 0, TAU, 0, Math.PI * 0.5);
        dome.translate(0, y + WALL_H, DOME_Z);
        k.solid.push(dome, C.slate);

        // --- the foyer: two side walls, a front wall either side of the door, the header
        //     over the refuge leaf, a flat roof, glass. -----------------------------------
        const zc = (FOYER_Z0 + FOYER_Z1) * 0.5, len = FOYER_Z1 - FOYER_Z0;
        for (const s of [-1, 1]) wall(k, api, WALL_T, base, y + FOYER_H, len, s * FOYER_HW, zc, 0, C.stone);
        const side = (FOYER_HW * 2 - DOOR_W) * 0.5;
        for (const s of [-1, 1]) wall(k, api, side, base, y + FOYER_H, WALL_T, s * (DOOR_W + side) * 0.5, FOYER_Z1, 0, C.stone);
        // the header: the doorway is exactly the leaf's 2.42 m; above it, wall to the roof
        wall(k, api, DOOR_W, y + 2.42, y + FOYER_H, WALL_T, 0, FOYER_Z1, 0, C.stone, 'wall', { climbable: false });
        // the roof slab, standable so anything that lands on it stands
        wall(k, api, FOYER_HW * 2 + 1.0, y + FOYER_H, y + FOYER_H + 0.30, len + 1.2, 0, zc - 0.2, 0, C.slate, 'roof', { standable: true, climbable: false });
        // the base course, draw-only
        const dark = [C.stone[0] * 0.62, C.stone[1] * 0.62, C.stone[2] * 0.64];
        for (const s of [-1, 1]) k.solid.box(WALL_T + 0.2, gmin + 0.55 - base, len, s * FOYER_HW, (gmin + 0.55 + base) * 0.5, zc, dark);
        for (const s of [-1, 1]) k.solid.box(side - 0.1, gmin + 0.55 - base, WALL_T + 0.2, s * (DOOR_W + side) * 0.5, (gmin + 0.55 + base) * 0.5, FOYER_Z1, dark);
        // glass: three tall lights a side and two beside the door, dark, for the far read
        for (const s of [-1, 1]) {
          for (const z of [14.5, 17.6, 20.7]) k.solid.quad(0.9, 2.4, s * (FOYER_HW + 0.25), y + 2.2, z, GLASS, s * Math.PI * 0.5);
          k.solid.quad(1.6, 2.0, s * 4.2, y + 2.0, FOYER_Z1 + 0.25, GLASS, 0);
        }
        // the canopy over the entrance: a slab on two posts
        k.solid.box(6.4, 0.24, 3.0, 0, y + 3.3, FOYER_Z1 + 1.6, C.slate);
        for (const s of [-1, 1]) {
          const px = s * 2.7, pz = FOYER_Z1 + 2.9;
          const g = groundY(api, px, pz);
          k.solid.cyl(0.11, 0.11, y + 3.2 - g, 8, px, (y + 3.2 + g) * 0.5, pz, C.metal);
          api.emit({ kind: 'circle', x: px, z: pz, r: 0.16, y0: g - 0.3, y1: y + 3.2, tag: 'metal' });
        }
        return { solid: k.solid.build(), glow: null, moving: null, glowColour: GLOW.lamp };
      },

      /** Inside: the slab, the benches, the console, the lectern, the lamps, the exit light. */
      body(api) {
        const k = kits();
        const y = api.padY, F = y + FLOOR;
        const live = new Kit(); live.additive = true;

        // --- the floor: one concrete slab, colliders tiled so collision keeps them --------
        {
          const x0 = -8.6, x1 = 8.6, z0 = -2.4, z1 = FOYER_Z1 + 0.4;
          const w = x1 - x0, d = z1 - z0;
          k.solid.box(w, FLOOR + 0.2, d, 0, (F + y - 0.2) * 0.5, (z0 + z1) * 0.5, CONCRETE);
          for (let iz = 0; iz < 2; iz++) for (let ix = 0; ix < 2; ix++) {
            api.emit({ kind: 'obb', x: x0 + (ix + 0.5) * w * 0.5, z: z0 + (iz + 0.5) * d * 0.5,
              halfX: w * 0.25, halfZ: d * 0.25, yaw: 0, y0: y - 0.2, y1: F, tag: 'stone', standable: true, climbable: false });
          }
        }

        // --- the benches: seat, two ends, a back. The seat top is under STEP_UP so a row
        //     can be crossed; the back is not climbable. ----------------------------------
        for (const b of BENCHES) {
          const cy = Math.cos(b.yaw), sy = Math.sin(b.yaw);
          const at = (lx, lz) => ({ x: b.x + lx * cy + lz * sy, z: b.z - lx * sy + lz * cy });
          k.solid.box(BENCH_W, 0.10, 0.50, b.x, F + 0.39, b.z, C.plank, b.yaw);
          for (const s of [-1, 1]) {
            const p = at(s * (BENCH_W * 0.5 - 0.12), 0);
            k.solid.box(0.10, 0.34, 0.44, p.x, F + 0.17, p.z, C.metal, b.yaw);
          }
          const bk = at(0, 0.27);
          k.solid.box(BENCH_W, 0.46, 0.08, bk.x, F + 0.72, bk.z, C.plank, b.yaw);
          api.emit({ kind: 'obb', x: b.x, z: b.z, halfX: BENCH_W * 0.5, halfZ: 0.25, yaw: b.yaw,
            y0: F, y1: F + 0.44, tag: 'wood', standable: true, climbable: false });
          api.emit({ kind: 'obb', x: bk.x, z: bk.z, halfX: BENCH_W * 0.5, halfZ: 0.045, yaw: b.yaw,
            y0: F + 0.44, y1: F + 0.96, tag: 'wood', climbable: false });
        }

        // --- the console. places stands the claim post at (0, CONSOLE_R); this is the desk
        //     it rises out of, so the lever reads as the one control on it. ---------------
        {
          const cz = CONSOLE_Z + 0.05;
          k.solid.box(1.7, 0.85, 0.9, 0, F + 0.425, cz, C.dark);
          k.solid.box(1.8, 0.05, 1.0, 0, F + 0.87, cz, C.metal);
          // a sloped fascia toward the operator, with a strip of dead indicator glass
          k.solid.box(1.5, 0.22, 0.05, 0, F + 0.98, cz + 0.46, C.dark, 0, -0.7);
          k.solid.quad(1.1, 0.10, 0, F + 1.0, cz + 0.505, GLASS, 0, -0.7);
          api.emit({ kind: 'obb', x: 0, z: cz, halfX: 0.85, halfZ: 0.45, yaw: 0,
            y0: F, y1: F + 0.9, tag: 'metal', standable: false, climbable: false });
        }

        // --- the lectern, by the west wall of the foyer. The page on it is the system's. --
        {
          const L = LECTERN;
          k.solid.box(0.50, 0.06, 0.40, L.x, F + 0.03, L.z, C.dark);
          k.solid.box(0.16, 1.0, 0.16, L.x, F + 0.53, L.z, C.wood);
          k.solid.box(0.46, 0.035, 0.36, L.x, F + 1.06, L.z, C.wood, Math.PI * 0.5, 0.55);
          api.emit({ kind: 'circle', x: L.x, z: L.z, r: 0.28, y0: F, y1: F + 1.15, tag: 'wood' });
        }

        // --- the lamps: wall sconces, switched on by the claim (places ripples them) ------
        const sconce = (x, z, ry, yy) => {
          const nx = Math.sin(ry), nz = Math.cos(ry);   // the pane's normal after ry
          k.solid.box(0.14, 0.52, 0.06, x - nx * 0.04, yy, z - nz * 0.04, C.metal, ry);
          k.glow.pane(0.30, 0.42, x, yy, z, PANE_LAMP_LOCAL, ry, 0);
        };
        for (const deg of [45, 90, 135, 225, 270, 315]) {
          const a = deg * Math.PI / 180, r = RING_R - WALL_T * 0.5 - 0.06;
          sconce(r * Math.sin(a), DOME_Z + r * Math.cos(a), a + Math.PI, y + 3.1);
        }
        for (const z of [15.5, 20.5]) for (const s of [-1, 1]) {
          sconce(s * (FOYER_HW - WALL_T * 0.5 - 0.06), z, -s * Math.PI * 0.5, y + 3.2);
        }
        // two flanking the way in, on the drum's foyer face
        for (const s of [-1, 1]) {
          const a = s * Math.PI / 8, r = RING_R + WALL_T * 0.5 + 0.06;
          sconce(r * Math.sin(a), DOME_Z + r * Math.cos(a), a, y + 3.3);
        }

        // --- the exit light over the door, inside: red, always on, never a word ----------
        k.solid.box(0.40, 0.14, 0.10, 0, y + 2.72, FOYER_Z1 - 0.28, C.dark);
        live.box(0.30, 0.08, 0.04, 0, y + 2.72, FOYER_Z1 - 0.35, [0.9, 0.9, 0.9]);

        return { solid: k.solid.build(), glow: k.glow.build(), glowLive: live.build(),
          glowLiveColour: GLOW.red, moving: null, glowColour: GLOW.lamp };
      },
    },
  };
}

/** sites.js's PANE_LAMP, restated so this file imports nothing from it. */
const _soft = (t) => { const k = clamp01((1 - t) / 0.26); return k * k * (3 - 2 * k); };
function PANE_LAMP_LOCAL(u, v) {
  const r = Math.min(1, Math.hypot(u, v));
  return 0.60 * _soft(r) * (1 - 0.55 * r * r);
}

/* ==========================================================================
   THE SYSTEM.
   ========================================================================== */
const SUNRISE_S = P.sunriseS ?? 720;        // Alex: "Twelve minutes long."
const HUM_S = P.humS ?? 4;
const BUTTON_HOLD_S = P.buttonHoldS ?? 0.6;
const SEAT_HOLD_S = P.seatHoldS ?? 0.45;
const SEAT_REACH = P.seatReach ?? 1.9;
const SEAT_DROP = P.seatDrop ?? 0.52;
const SEAT_EASE_S = P.seatEaseS ?? 0.28;
const ROVER_PEAK = P.roverPeak ?? 8.0;
const ROVER_Y = P.roverY ?? 5.5;
const ROVER_DECAY = P.roverDecay ?? 1.25;
const DOME_R = P.domeR ?? 7.6;
const SUN_R = P.sunR ?? 0.06;
const SUN_ELEV = P.sunElev || [-0.06, 0.32];
const SUN_FROM = P.sunFrom ?? 0.42;
const REACH = 2.4;                  // places' CLAIM_REACH: the button is the same post
const FACE = 0.5;                   // places' CLAIM_FACE
const SEAT_FACE = 0.35;             // refuge's FACE_MIN: you are indoors and cannot back off
export const MORNING_STOPS = P.stops || [
  { t: 0.00, horizon: 0x000000, mid: 0x000000, zenith: 0x000000, sun: 0.0, glow: 0.0 },
  { t: 0.10, horizon: 0x101427, mid: 0x080a18, zenith: 0x03040c, sun: 0.0, glow: 0.05 },
  { t: 0.32, horizon: 0x3b2f5e, mid: 0x1e1f4a, zenith: 0x0b1030, sun: 0.0, glow: 0.18 },
  { t: 0.50, horizon: 0xc46a6e, mid: 0x5a3a72, zenith: 0x1d2350, sun: 0.0, glow: 0.35 },
  { t: 0.62, horizon: 0xf0a24a, mid: 0x9a6a6a, zenith: 0x3a4a80, sun: 1.6, glow: 0.55 },
  { t: 0.78, horizon: 0xf7c66a, mid: 0xb9a6a0, zenith: 0x6a8ec0, sun: 2.6, glow: 0.45 },
  { t: 1.00, horizon: 0xd9e6f2, mid: 0xa8c8ec, zenith: 0x6f9fdc, sun: 3.0, glow: 0.30 },
];
const SUN_GOLD = 0xffb347, SUN_WHITE = 0xfff4e0;

// module scratch: the hot path allocates nothing
const _ca = new THREE.Color(), _cb = new THREE.Color();
const _gold = new THREE.Color(SUN_GOLD), _white = new THREE.Color(SUN_WHITE);
const _sun = new THREE.Color();
const _promptP = { kind: 'hold', label: 'E', rank: 3, x: 0, y: 0, z: 0, k: 0, detail: '', subdetail: '', unavailable: false };
const _evt = { x: 0, z: 0, seconds: SUNRISE_S };
const _seatEvt = { x: 0, z: 0, on: false };
const _noise = { x: 0, z: 0, radius: 60, source: 'planetarium' };

export class Planetarium {
  static id = 'planetarium';

  constructor(ctx) {
    this.ctx = ctx;
    // --- the projection
    this.phase = 'off';          // 'off' | 'hum' | 'sunrise'
    this.t = 0;
    this.runs = 0;
    this.sunEl = 0;
    this.roverPeak = 0;
    // --- the verbs
    this.hold = 0; this.holdKind = ''; this._candKey = ''; this._release = false;
    this.seated = false; this.seatIdx = -1; this.seatK = 0; this.seatX = 0; this.seatZ = 0;
    // --- the scene side
    this.dome = null; this.mat = null; this.paper = null; this.tex = null;
    this.rover = null;
    this._vertexMode = false;    // the matGlow fallback, only if the sky clone is unavailable
    this._seats = [];            // world { x, y, z }
    this.fx = null;              // the claim post in world: { x, y, z, nx, nz }
    this.ox = 0; this.oz = 0; this.yaw = 0; this.padY = 0; this._cy = 1; this._sy = 0;
    this._stops = null;
    this._offs = [];
    this._notes = [];
    this._ready = false;
  }

  _note(m) { if (this._notes.length < 16) this._notes.push(m); }
  _sys(id) { return this.ctx && this.ctx.systems ? this.ctx.systems.get(id) : null; }
  _wx(lx, lz) { return this.ox + lx * this._cy + lz * this._sy; }
  _wz(lx, lz) { return this.oz - lx * this._sy + lz * this._cy; }

  async init() {
    const places = this._sys('places');
    const rec = places && places.nodes ? places.nodes.get(SITE_ID) : null;
    if (!rec) { this._note('places has no node for ' + SITE_ID + ': no planetarium'); return; }
    this.ox = rec.def.x; this.oz = rec.def.z;
    this.yaw = rec.yaw || 0; this.padY = rec.padY || 0;
    this._cy = Math.cos(this.yaw); this._sy = Math.sin(this.yaw);
    const F = this.padY + FLOOR;
    for (const s of SEATS) this._seats.push({ x: this._wx(s.x, s.z), y: F, z: this._wz(s.x, s.z) });
    const f = rec.fixture;
    if (f) this.fx = { x: f.wx, y: f.wy, z: f.wz, nx: f.fwx, nz: f.fwz };
    else this._note('no claim fixture on ' + SITE_ID + ': the button has nothing to stand on');

    // the stops, as linear colours, once
    this._stops = MORNING_STOPS.map(s => ({ t: s.t, h: new THREE.Color(s.horizon), m: new THREE.Color(s.mid),
      z: new THREE.Color(s.zenith), sun: s.sun, glow: s.glow }));

    this._buildDome(places);
    this._buildPaper(places);

    const bus = this.ctx.bus;
    if (bus) {
      this._offs.push(bus.on('place:claimed', (p) => { if (p && p.id === SITE_ID) this._start(); }));
      this._offs.push(bus.on('save:loaded', () => this._loadRuns()));
    }
    this._loadRuns();
    this._ready = true;
  }

  _loadRuns() {
    const prog = this._sys('progress');
    const n = prog && typeof prog.flag === 'function' ? prog.flag('planetarium:runs') : 0;
    this.runs = Number.isFinite(+n) ? +n : 0;
  }

  /**
   * The projection surface: a hemisphere inside the roof, on a CLONE of the sky dome's
   * material. The sky's uHorizon/uMid/uZenith ramp is a sky gradient and its moon block is
   * a sun disc with glare; cloud, ridge and band go to 0 and stay there. Same source, same
   * defines: the same program (measured in the check tool). Renamed so gfx/airlight.js,
   * which scans materials by NAME, never mistakes three hundred vertices for lamps.
   */
  _buildDome(places) {
    const scene = this.ctx.scene;
    if (!scene) { this._note('ctx.scene missing: the dome has nowhere to hang'); return; }
    const sky = this._sys('sky');
    const base = sky && sky.dome ? sky.dome.material : null;
    let mat = null;
    if (base && base.isShaderMaterial && base.uniforms && base.uniforms.uHorizon) {
      mat = base.clone();
      mat.depthWrite = true;
      mat.depthTest = true;
      const u = mat.uniforms;
      const set = (n, v) => { if (u[n]) u[n].value = v; };
      set('uCloud', 0); set('uRidge', 0); set('uBand', 0);
      set('uMoonGlow', 0); set('uMoonPeak', 0); set('uEastGlow', 0); set('uMoonPhase', 2.0); set('uMoonR', SUN_R);   // uEastGlow 0: the county's east line is not painted on the dome at rest
      set('uTrueDawn', 0); // the projector never inherits the outdoor sun
      if (u.uMoonDir) u.uMoonDir.value.set(0, 0.2, -1).normalize();
      if (u.uHorizon) u.uHorizon.value.setRGB(0, 0, 0);
      if (u.uMid) u.uMid.value.setRGB(0, 0, 0);
      if (u.uZenith) u.uZenith.value.setRGB(0, 0, 0);
      if (u.uMoonCol) u.uMoonCol.value.copy(_gold);
    } else if (places && places.matGlow) {
      // the fallback: places' additive vertex-colour material, colours rewritten each step
      mat = places.matGlow.clone();
      mat.side = THREE.BackSide;
      this._vertexMode = true;
      this._note('sky dome material unavailable: projecting on vertex colours');
    } else {
      this._note('no material to project on');
      return;
    }
    mat.name = 'planetarium-dome';
    this.mat = mat;
    const geo = new THREE.SphereGeometry(DOME_R, 32, 16, 0, TAU, 0, Math.PI * 0.5);
    if (this._vertexMode) {
      const n = geo.attributes.position.count;
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      this._vdir = new Float32Array(n * 3);
      const p = geo.attributes.position;
      for (let i = 0; i < n; i++) {
        const x = p.getX(i), yy = p.getY(i), z = p.getZ(i), l = Math.hypot(x, yy, z) || 1;
        this._vdir[i * 3] = x / l; this._vdir[i * 3 + 1] = yy / l; this._vdir[i * 3 + 2] = z / l;
      }
    }
    const m = new THREE.Mesh(geo, mat);
    m.name = 'planetarium-dome';
    m.position.set(this._wx(0, DOME_Z), this.padY + WALL_H, this._wz(0, DOME_Z));
    m.rotation.y = this.yaw;
    m.renderOrder = 0;
    m.castShadow = false; m.receiveShadow = false;
    scene.add(m);
    this.dome = m;
  }

  /**
   * The logbook, open on the lectern. A canvas paper exactly as opening.js's calendar:
   * places.matBody cloned with the canvas as its map (NoColorSpace, so the pencil values are
   * albedo), bumpScale 0, a unit colour attribute. A sketch of the last sunset, and the line.
   */
  _buildPaper(places) {
    const scene = this.ctx.scene;
    if (!scene || !places || !places.matBody || typeof document === 'undefined') return;
    const w = 0.42, h = 0.30;
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = Math.round(768 * h / w);
    const c = canvas.getContext('2d');
    if (!c) return;
    const W = canvas.width, H = canvas.height;
    // the page: dirty paper, faint rules, a little grain, one dog-eared corner
    c.fillStyle = '#4b463a'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) {
      const x = (i * 347) % W, y = (i * 593) % H;
      c.fillStyle = i % 2 ? '#47423a' : '#4f4a3e'; c.fillRect(x, y, 1 + i % 3, 2);
    }
    c.strokeStyle = '#3e392f'; c.lineWidth = 2;
    for (let y = 64; y < H - 20; y += 44) { c.beginPath(); c.moveTo(34, y); c.lineTo(W - 34, y); c.stroke(); }
    c.strokeStyle = '#332e26'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(W - 60, 0); c.lineTo(W, 60); c.stroke();
    // the pencil
    c.strokeStyle = '#221d16'; c.lineCap = 'round'; c.lineJoin = 'round';
    const hz = H * 0.60, cx = W * 0.5, r = W * 0.115;
    // the horizon, drawn twice the way a pencil is
    c.lineWidth = 3.2;
    c.beginPath(); c.moveTo(W * 0.08, hz); c.lineTo(W * 0.92, hz + 2); c.stroke();
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(W * 0.10, hz + 5); c.lineTo(W * 0.90, hz + 3); c.stroke();
    // two hills either side of it
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(W * 0.08, hz); c.quadraticCurveTo(W * 0.22, hz - H * 0.13, W * 0.40, hz); c.stroke();
    c.beginPath(); c.moveTo(W * 0.58, hz); c.quadraticCurveTo(W * 0.76, hz - H * 0.10, W * 0.92, hz); c.stroke();
    // half a sun, going down between them, and its rays
    c.lineWidth = 3.4;
    c.beginPath(); c.arc(cx, hz, r, Math.PI, TAU); c.stroke();
    c.lineWidth = 2.4;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i + 0.5) * Math.PI / 9, wob = (i % 3) * 5;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * (r + 10), hz + Math.sin(a) * (r + 10));
      c.lineTo(cx + Math.cos(a) * (r + 44 + wob), hz + Math.sin(a) * (r + 44 + wob)); c.stroke();
    }
    // the shading under the hills: loose hatching
    c.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const x = W * 0.10 + i * (W * 0.80 / 14);
      c.beginPath(); c.moveTo(x, hz + 10); c.lineTo(x + 18, hz + 34 + (i % 4) * 4); c.stroke();
    }
    // the date, scribbled small in the corner
    c.fillStyle = '#221d16'; c.textAlign = 'right'; c.font = 'italic 30px Georgia';
    c.fillText('Nov 1', W - 52, 52);
    // the line. Alex: "a logbook that says this is all it ever was."
    c.textAlign = 'center'; c.font = 'italic 46px Georgia';
    c.fillText('this is all it ever was', W * 0.5, H * 0.90);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 4;
    const mat = places.matBody.clone();
    mat.map = tex; mat.bumpScale = 0;
    const geo = new THREE.PlaneGeometry(w, h);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(geo.attributes.position.count * 3).fill(1), 3));
    // lying on the lectern's slope: up, tilted toward the reader on the +X side
    geo.rotateX(-Math.PI * 0.5 + 0.55);
    geo.rotateY(Math.PI * 0.5);
    const m = new THREE.Mesh(geo, mat);
    m.name = 'planetarium-logbook';
    const F = this.padY + FLOOR;
    m.position.set(this._wx(LECTERN.x + 0.016, LECTERN.z), F + 1.10, this._wz(LECTERN.x + 0.016, LECTERN.z));
    m.rotation.y = this.yaw;
    m.castShadow = false; m.receiveShadow = true;
    scene.add(m);
    this.paper = m; this.tex = tex; this._paperMat = mat;
  }

  ready() { return true; }

  /* ------------------------------------------------------------------ step -- */
  step(dt) {
    if (!this._ready || !(dt > 0)) return;
    this._projStep(dt);

    const player = this._sys('player');
    if (!player || !player.pos) return;
    const inp = this.ctx.input;
    const held = (a) => !!(inp && typeof inp.held === 'function' && inp.held(a));
    const use = held('use');
    if (!use) this._release = false;
    const inCar = !!(this.ctx.shared && this.ctx.shared.inCar);
    const dead = !!player.dead;

    // --- seated: pinned to the seat point, eye lowered, until a move key or a jump -------
    if (this.seated) {
      const move = held('forward') || held('back') || held('left') || held('right') || held('jump');
      // a body that is no longer at the seat was moved by something that is not walking — a
      // respawn, a teleport, the car — and is stood up rather than dragged back to the bench
      const away = Math.hypot(player.pos.x - this.seatX, player.pos.z - this.seatZ) > 1.0;
      if (move || inCar || dead || away) { this._stand(player); }
      else {
        player.pos.x = this.seatX; player.pos.z = this.seatZ;
        if (player.vel) { player.vel.x = 0; player.vel.z = 0; }
        this.seatK = Math.min(1, this.seatK + dt / SEAT_EASE_S);
        const k = this.seatK;
        player.seatDrop = SEAT_DROP * (k * k * (3 - 2 * k));   // down in a beat; up is instant
        this.hold = 0; this.holdKind = '';
        return;
      }
    }
    if (inCar || dead) { this.hold = 0; this.holdKind = ''; this._candKey = ''; return; }

    // --- the candidate: the button (once claimed, between runs) or the nearest seat ------
    const cam = this._sys('camera');
    const lookX = cam ? -Math.sin(cam.yaw) : 0, lookZ = cam ? -Math.cos(cam.yaw) : -1;
    const px = player.pos.x, py = player.pos.y, pz = player.pos.z;
    const eyeY = typeof player.eyeY === 'number' ? player.eyeY : py + 1.6;
    let kind = '', key = '', need = 0, kx = 0, ky = 0, kz = 0, idx = -1;

    const fx = this.fx;
    const bookX=this._wx(LECTERN.x,LECTERN.z),bookZ=this._wz(LECTERN.x,LECTERN.z);
    const bookD=Math.hypot(bookX-px,bookZ-pz);
    if(bookD<2.1&&Math.abs(py-(this.padY+FLOOR))<1.4&&((bookX-px)*lookX+(bookZ-pz)*lookZ)/Math.max(.01,bookD)>.45){
      kind='book';key='book';need=.3;kx=bookX;ky=this.padY+1.1;kz=bookZ;
    }
    if (!kind && fx && this.phase === 'off' && !this.ctx.shared.lateBellFinal) {
      const places = this._sys('places');
      if (places && typeof places.isClaimed === 'function' && places.isClaimed(SITE_ID)) {
        const dx = fx.x - px, dz = fx.z - pz, d = Math.sqrt(dx * dx + dz * dz);
        const facing = d > 1e-3 ? (dx * lookX + dz * lookZ) / d : 1;
        // the same side of the plate places asks for, and a clear line to the lever
        const front = (px - fx.x) * fx.nx + (pz - fx.z) * fx.nz >= 0;
        if (d < REACH && Math.abs(py - fx.y) < 2.0 && facing >= FACE && front && this._sight(eyeY, px, pz, fx)) {
          kind = 'button'; key = 'button'; need = BUTTON_HOLD_S;
          kx = fx.x + fx.nx * 0.17; ky = fx.y + 1.48; kz = fx.z + fx.nz * 0.17;
        }
      }
    }
    if (!kind) {
      let bd = SEAT_REACH * SEAT_REACH, bi = -1;
      for (let i = 0; i < this._seats.length; i++) {
        const s = this._seats[i];
        const dx = s.x - px, dz = s.z - pz, dd = dx * dx + dz * dz;
        if (dd < bd && Math.abs(py - s.y) < 1.2) { bd = dd; bi = i; }
      }
      if (bi >= 0) {
        const s = this._seats[bi];
        const dx = s.x - px, dz = s.z - pz, d = Math.sqrt(bd);
        const facing = d > 1e-3 ? (dx * lookX + dz * lookZ) / d : 1;
        if (facing >= SEAT_FACE) {
          kind = 'seat'; key = 'seat' + bi; need = SEAT_HOLD_S; idx = bi;
          kx = s.x; ky = s.y + 0.62; kz = s.z;
        }
      }
    }
    if (!kind) { this.hold = 0; this.holdKind = ''; this._candKey = ''; return; }
    if (key !== this._candKey) { this.hold = 0; this._candKey = key; }
    this.holdKind = kind;

    // the glyph: rank 3 beats places' refused 'power' prompt on the same post. No words.
    _promptP.x = kx; _promptP.y = ky; _promptP.z = kz;
    _promptP.k = Math.min(1, this.hold / need);
    if (this.ctx.bus) this.ctx.bus.emit('prompt', _promptP);

    if (!use || this._release) { this.hold = 0; return; }
    this.hold += dt;
    if (this.hold < need) return;
    this.hold = 0; this._release = true;
    if (kind === 'button') this._start();
    else if(kind==='book'){
      this._sys('progress')?.flag('story:site:morning',true);
      this.ctx.bus.emit('story:read',{id:'site:morning',title:'Emmett Sayer’s logbook',text:'Nov 1. A pencil landscape: hills, a sun, rays.\n\nthis is all it ever was'});
    }else this._sit(player, idx);
  }

  /** A clear line from the eye to the lever, stopped short of the post itself. */
  _sight(eyeY, px, pz, fx) {
    const col = this._sys('collision');
    if (!col || typeof col.segmentClear !== 'function') return true;
    let tx = fx.x, tz = fx.z;
    const dx = px - tx, dz = pz - tz, d = Math.sqrt(dx * dx + dz * dz);
    if (d > 0.45) { tx += (dx / d) * 0.45; tz += (dz / d) * 0.45; }
    return col.segmentClear(px, eyeY, pz, tx, fx.y + 1.48, tz);
  }

  _sit(player, i) {
    const s = this._seats[i];
    if (!s) return;
    this.seated = true; this.seatIdx = i; this.seatK = 0;
    this.seatX = s.x; this.seatZ = s.z;
    player.pos.x = s.x; player.pos.z = s.z;
    if (player.vel) { player.vel.x = 0; player.vel.z = 0; }
    player.seatDrop = 0;
    _seatEvt.x = s.x; _seatEvt.z = s.z; _seatEvt.on = true;
    if (this.ctx.bus) this.ctx.bus.emit('planetarium:seated', _seatEvt);
  }

  _stand(player) {
    this.seated = false; this.seatIdx = -1; this.seatK = 0;
    player.seatDrop = 0;                       // "Getting up must be instant and clean."
    _seatEvt.x = this.seatX; _seatEvt.z = this.seatZ; _seatEvt.on = false;
    if (this.ctx.bus) this.ctx.bus.emit('planetarium:seated', _seatEvt);
  }

  /* ------------------------------------------------------------ projection -- */
  /** Pressed: the claim (once) or the hold on the same post between runs. Cannot be stopped. */
  _start() {
    if (!this._ready || this.phase !== 'off' || this.ctx.shared.lateBellFinal) return;
    this.phase = 'hum'; this.t = 0;
    const cx = this.fx ? this.fx.x : this._wx(0, CONSOLE_R), cz = this.fx ? this.fx.z : this._wz(0, CONSOLE_R);
    _evt.x = cx; _evt.z = cz; _evt.seconds = SUNRISE_S;
    if (this.ctx.bus) this.ctx.bus.emit('planetarium:button', _evt);
    this._say('lantern', 0.9, cx, this.padY + 1.5, cz);
  }

  _projStep(dt) {
    if (this.phase === 'off') return;
    this.t += dt;
    if (this.phase === 'hum') {
      if (this.t < HUM_S) return;
      this.phase = 'sunrise'; this.t = 0;
      const cx = _evt.x, cz = _evt.z;
      _evt.seconds = SUNRISE_S;
      if (this.ctx.bus) {
        this.ctx.bus.emit('planetarium:sunrise', _evt);     // lane C: the horde knows the schedule
        _noise.x = cx; _noise.z = cz;
        this.ctx.bus.emit('noise', _noise);
      }
      this._borrow();
    }
    const k = clamp01(this.t / SUNRISE_S);
    this._paint(k);
    this._warm(k);
    if (this.t >= SUNRISE_S) this._end();
  }

  /** The stops, piecewise linear in linear RGB, into the dome's uniforms. */
  _paint(k) {
    const S = this._stops;
    if (!S || !this.mat) return;
    let i = 0;
    while (i < S.length - 2 && S[i + 1].t < k) i++;
    const a = S[i], b = S[i + 1];
    const f = clamp01((k - a.t) / Math.max(1e-6, b.t - a.t));
    // the sun climbs over the last part of the run; before that only its glow is in the sky
    const el = lerp(SUN_ELEV[0], SUN_ELEV[1], smoothstep(SUN_FROM, 1.0, k));
    this.sunEl = el;
    const peak = lerp(a.sun, b.sun, f), glow = lerp(a.glow, b.glow, f);
    _sun.copy(_gold).lerp(_white, clamp01(el / 0.25));
    if (!this._vertexMode) {
      const u = this.mat.uniforms;
      if (u.uHorizon) u.uHorizon.value.copy(a.h).lerp(b.h, f);
      if (u.uMid) u.uMid.value.copy(a.m).lerp(b.m, f);
      if (u.uZenith) u.uZenith.value.copy(a.z).lerp(b.z, f);
      if (u.uMoonDir) u.uMoonDir.value.set(0, Math.sin(el), -Math.cos(el));
      if (u.uMoonPeak) u.uMoonPeak.value = peak;
      if (u.uMoonGlow) u.uMoonGlow.value = glow;
      if (u.uMoonCol) u.uMoonCol.value.copy(_sun);
      return;
    }
    // the fallback: the same ramp written into vertex colours
    const geo = this.dome ? this.dome.geometry : null;
    const col = geo ? geo.attributes.color : null;
    if (!col) return;
    _ca.copy(a.h).lerp(b.h, f); _cb.copy(a.m).lerp(b.m, f);
    const zr = a.z.r + (b.z.r - a.z.r) * f, zg = a.z.g + (b.z.g - a.z.g) * f, zb = a.z.b + (b.z.b - a.z.b) * f;
    const sx = 0, sy = Math.sin(el), sz = -Math.cos(el);
    const v = this._vdir, arr = col.array, n = col.count;
    for (let j = 0; j < n; j++) {
      const dx = v[j * 3], dy = v[j * 3 + 1], dz = v[j * 3 + 2];
      const t1 = smoothstep(0.0, 0.236, dy), t2 = smoothstep(0.13, 0.76, dy);
      let r = lerp(lerp(_ca.r, _cb.r, t1), zr, t2), g = lerp(lerp(_ca.g, _cb.g, t1), zg, t2), bb = lerp(lerp(_ca.b, _cb.b, t1), zb, t2);
      const ml = Math.max(0, dx * sx + dy * sy + dz * sz);
      const disc = ml > Math.cos(SUN_R) ? peak : 0;
      const halo = (Math.pow(ml, 60) * 0.3 + Math.pow(ml, 6) * 0.08) * glow;
      r += _sun.r * (disc + halo); g += _sun.g * (disc + halo); bb += _sun.b * (disc + halo);
      arr[j * 3] = r; arr[j * 3 + 1] = g; arr[j * 3 + 2] = bb;
    }
    col.needsUpdate = true;
  }

  /** ONE rover, moved and re-peaked every step, released at the end. The census is untouched. */
  _borrow() {
    if (this.rover) return;
    const lights = this._sys('lights');
    if (!lights || typeof lights.borrow !== 'function') return;
    const h = lights.borrow('planetarium', this._wx(0, DOME_Z), this.padY + ROVER_Y, this._wz(0, DOME_Z), SUN_GOLD, 0.0001, 0);
    if (!h) return;                     // pool empty: asked again next step
    h.decay = ROVER_DECAY;
    this.rover = h;
  }

  _warm(k) {
    if (!this.rover) { this._borrow(); if (!this.rover) return; }
    const S = this._stops;
    let i = 0;
    while (i < S.length - 2 && S[i + 1].t < k) i++;
    const a = S[i], b = S[i + 1], f = clamp01((k - a.t) / Math.max(1e-6, b.t - a.t));
    const h = this.rover;
    _ca.copy(a.h).lerp(b.h, f);
    h.r = _ca.r; h.g = _ca.g; h.b = _ca.b;
    const w = clamp01((k - 0.25) / 0.70);
    this.roverPeak = ROVER_PEAK * w * Math.sqrt(w);
    h.peak = this.roverPeak;
    h.decay = ROVER_DECAY;
  }

  /** Twelve minutes, then off in one step. The flag is the only thing it leaves behind. */
  _end() {
    this.phase = 'off'; this.t = 0;
    this.runs++;
    this.sunEl = 0; this.roverPeak = 0;
    if (this.mat && !this._vertexMode) {
      const u = this.mat.uniforms;
      if (u.uHorizon) u.uHorizon.value.setRGB(0, 0, 0);
      if (u.uMid) u.uMid.value.setRGB(0, 0, 0);
      if (u.uZenith) u.uZenith.value.setRGB(0, 0, 0);
      if (u.uMoonPeak) u.uMoonPeak.value = 0;
      if (u.uMoonGlow) u.uMoonGlow.value = 0;
    } else if (this.dome && this.dome.geometry.attributes.color) {
      this.dome.geometry.attributes.color.array.fill(0);
      this.dome.geometry.attributes.color.needsUpdate = true;
    }
    if (this.rover) {
      const lights = this._sys('lights');
      if (lights && typeof lights.release === 'function') lights.release(this.rover);
      this.rover = null;
    }
    const prog = this._sys('progress');
    if (prog && typeof prog.flag === 'function') {
      prog.flag('planetarium:seen', 1);
      prog.flag('planetarium:runs', this.runs);
    }
    this._say('door', 0.6, _evt.x, this.padY + 1.2, _evt.z);    // the click-off
    if (this.ctx.bus) this.ctx.bus.emit('planetarium:ended', _evt);
  }

  _say(kind, gain, x, y, z) {
    const audio = this._sys('audio');
    if (audio && typeof audio.dread === 'function') audio.dread(kind, x, y, z, gain);
  }

  // The console stays off. Real light falls through the foyer onto the benches;
  // the dark hemisphere and Emmett's logbook remain exactly where they were.
  setTrueMorning(k) {
    if (this.phase !== 'off') this._end();
    if (k <= 0) return;
    const p=this._sys('player');
    if(!p?.pos||Math.hypot(p.pos.x-this._wx(0,0),p.pos.z-this._wz(0,0))>90){
      if(this.rover)this._sys('lights')?.release(this.rover);this.rover=null;this.roverPeak=0;return;
    }
    this._borrow();
    if (this.rover) {
      this.rover.x = this._wx(0, FOYER_Z1 - 1);
      this.rover.y = this.padY + 2.8;
      this.rover.z = this._wz(0, FOYER_Z1 - 1);
      _ca.copy(_gold).lerp(_white, k * .45);
      this.rover.r = _ca.r; this.rover.g = _ca.g; this.rover.b = _ca.b;
      this.rover.peak = 34 * k; this.rover.distance = 40; this.rover.decay = 1.1;
      this.roverPeak = this.rover.peak;
    }
  }

  /* ------------------------------------------------------------- readouts -- */
  state() {
    const u = this.mat && !this._vertexMode ? this.mat.uniforms : null;
    const hex = (n) => (u && u[n] ? '#' + u[n].value.getHexString() : null);
    return {
      ready: this._ready, phase: this.phase, t: +this.t.toFixed(2), runs: this.runs,
      seated: this.seated, seatIdx: this.seatIdx, seatDrop: this.seated ? +(SEAT_DROP * this.seatK).toFixed(3) : 0,
      hold: this.holdKind, holdT: +this.hold.toFixed(3),
      sunEl: +this.sunEl.toFixed(4), roverPeak: +this.roverPeak.toFixed(3), rover: !!this.rover,
      vertexMode: this._vertexMode,
      dome: u ? { horizon: hex('uHorizon'), mid: hex('uMid'), zenith: hex('uZenith'),
        sunPeak: u.uMoonPeak ? +u.uMoonPeak.value.toFixed(3) : null, glow: u.uMoonGlow ? +u.uMoonGlow.value.toFixed(3) : null } : null,
      domeAt: this.dome ? [this.dome.position.x, this.dome.position.y, this.dome.position.z] : null,
      fixture: this.fx ? { x: this.fx.x, y: this.fx.y, z: this.fx.z, nx: this.fx.nx, nz: this.fx.nz } : null,
      seats: this._seats.map(s => [s.x, s.y, s.z]),
      lectern: [this._wx(LECTERN.x, LECTERN.z), this.padY + FLOOR, this._wz(LECTERN.x, LECTERN.z)],
      door: [this._wx(0, FOYER_Z1), this.padY, this._wz(0, FOYER_Z1)],
      notes: this._notes.slice(),
    };
  }

  dispose() {
    for (const off of this._offs) { try { off(); } catch (e) { /* already gone */ } }
    this._offs.length = 0;
    if (this.rover) {
      const lights = this._sys('lights');
      if (lights && typeof lights.release === 'function') lights.release(this.rover);
      this.rover = null;
    }
    const player = this._sys('player');
    if (player) player.seatDrop = 0;
    for (const m of [this.dome, this.paper]) {
      if (!m) continue;
      if (m.parent) m.parent.remove(m);
      if (m.geometry) m.geometry.dispose();
    }
    if (this.mat) this.mat.dispose();
    if (this._paperMat) this._paperMat.dispose();
    if (this.tex) this.tex.dispose();
    this.dome = null; this.paper = null; this.mat = null; this.tex = null; this._paperMat = null;
    this._ready = false;
  }
}

export default Planetarium;
