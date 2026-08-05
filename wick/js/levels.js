// levels.js — the six movements, painted cell by cell into the sim's fields.
//
// Cell (0,0) is the bottom-left. Everything is authored by hand: no procedural
// level generation, because the whole point is that these rooms were made for you.

import { makeNoise2, fbm2, segDist, clamp, TAU } from './util.js';

class Painter {
  constructor(gw, gh, seed = 7) {
    this.gw = gw; this.gh = gh;
    this.solid = new Float32Array(gw * gh * 4);
    this.fuel = new Float32Array(gw * gh * 4);
    this.medium = new Float32Array(gw * gh * 4);
    this.vent = new Float32Array(gw * gh * 2);
    this.n = makeNoise2(seed);
  }

  _apply(i, o) {
    const S = this.solid, F = this.fuel, M = this.medium;
    if (o.solid !== undefined) S[i * 4] = o.solid;
    if (o.open !== undefined) S[i * 4 + 1] = o.open;
    if (o.mat !== undefined) S[i * 4 + 2] = o.mat;
    if (o.decor !== undefined) S[i * 4 + 3] = o.decor;
    if (o.fuel !== undefined) F[i * 4] = o.add ? F[i * 4] + o.fuel : o.fuel;
    if (o.kind !== undefined) F[i * 4 + 1] = o.kind;
    if (o.heat !== undefined) M[i * 4] = o.heat;
    if (o.smoke !== undefined) M[i * 4 + 1] = o.smoke;
    if (o.humid !== undefined) M[i * 4 + 2] = o.humid;
  }

  /** Stamp anywhere the signed distance is negative. `rough` wobbles the edge. */
  stamp(sdf, x0, y0, x1, y1, o) {
    const gw = this.gw, gh = this.gh;
    const ax = Math.max(0, Math.floor(x0)), bx = Math.min(gw - 1, Math.ceil(x1));
    const ay = Math.max(0, Math.floor(y0)), by = Math.min(gh - 1, Math.ceil(y1));
    const rough = o.rough || 0, rs = o.roughScale || 0.09;
    for (let y = ay; y <= by; y++) {
      for (let x = ax; x <= bx; x++) {
        let d = sdf(x + 0.5, y + 0.5);
        if (rough) d += fbm2(this.n, x * rs, y * rs, 3) * rough;
        if (d < 0) this._apply(y * gw + x, o);
      }
    }
  }

  rect(x, y, w, h, o = {}) {
    this.stamp((px, py) => Math.max(Math.max(x - px, px - (x + w)), Math.max(y - py, py - (y + h))),
      x - 4, y - 4, x + w + 4, y + h + 4, o);
  }
  disk(cx, cy, r, o = {}) {
    this.stamp((px, py) => Math.hypot(px - cx, py - cy) - r, cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4, o);
  }
  capsule(x0, y0, x1, y1, r, o = {}) {
    this.stamp((px, py) => segDist(px, py, x0, y0, x1, y1) - r,
      Math.min(x0, x1) - r - 4, Math.min(y0, y1) - r - 4, Math.max(x0, x1) + r + 4, Math.max(y0, y1) + r + 4, o);
  }
  poly(pts, r, o = {}) { for (let i = 0; i + 1 < pts.length; i++) this.capsule(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r, o); }

  /** Hollow out a rectangular room inside solid rock. */
  room(x, y, w, h, o = {}) { this.rect(x, y, w, h, Object.assign({ solid: 0, mat: 0, fuel: 0 }, o)); }

  fill(o) { this.rect(-2, -2, this.gw + 4, this.gh + 4, o); }

  /** A gaussian blob of steady acceleration — a draught. */
  vent2(cx, cy, r, vx, vy) {
    const gw = this.gw, gh = this.gh;
    const ax = Math.max(0, Math.floor(cx - r * 3)), bx = Math.min(gw - 1, Math.ceil(cx + r * 3));
    const ay = Math.max(0, Math.floor(cy - r * 3)), by = Math.min(gh - 1, Math.ceil(cy + r * 3));
    for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const w = Math.exp(-(dx * dx + dy * dy) / (r * r));
      const i = (y * gw + x) * 2;
      this.vent[i] += vx * w; this.vent[i + 1] += vy * w;
    }
  }
  /**
   * A draught that follows a line — corridors, flues, wind off the sea.
   * The blobs overlap heavily, so divide by how many of them a point on the
   * line actually sees; otherwise (vx, vy) is nothing like the strength you get.
   */
  ventLine(x0, y0, x1, y1, r, vx, vy) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(2, Math.ceil(len / (r * 0.6)));
    const spacing = Math.max(len / steps, 1e-3);
    const norm = Math.max(1, (r * Math.sqrt(Math.PI)) / spacing);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.vent2(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, vx / norm, vy / norm);
    }
  }

  // ---- props -------------------------------------------------------------
  /** A candle: waxy body, and a wick that will hold a flame for a long time. */
  candle(x, y, h = 9, r = 2.4) {
    this.capsule(x, y, x, y + h, r, { solid: 1, mat: 0.15, decor: 1.0, fuel: 0 });
    this.disk(x, y + h + 2.2, 2.0, { solid: 0, fuel: 1600, kind: 0.66 });
    return { x, y: y + h + 2.4, r: 3.6 };
  }
  /** A hanging lamp: a metal cup with a fat wick. */
  lamp(x, y, r = 4.5) {
    this.capsule(x, y - r, x, y - r * 0.2, r, { solid: 1, mat: 0.5, decor: 0.85, fuel: 0 });
    this.disk(x, y + 1.6, 2.6, { solid: 0, fuel: 2000, kind: 0.66 });
    return { x, y: y + 1.8, r: 4.4 };
  }
  /** A brazier / pyre: slow, huge, coal-hearted. */
  pyre(x, y, r = 8) {
    this.capsule(x - r, y, x + r, y, 2.6, { solid: 1, mat: 0.5, decor: 0.7, fuel: 0 });
    this.disk(x, y + r * 0.55, r * 0.78, { solid: 0, fuel: 4200, kind: 1.0 });
    return { x, y: y + r * 0.55, r: r * 0.95 };
  }
  /** A line of spilled oil — fire runs along it. */
  oil(pts, r = 1.6, amount = 26) { this.poly(pts, r, { fuel: amount, kind: 0.33, solid: 0 }); }
  /** Fine dust or soot clinging to a surface — flashes over. */
  soot(x0, y0, x1, y1, r, amount = 9) { this.capsule(x0, y0, x1, y1, r, { fuel: amount, kind: 0.0, add: true }); }
  water(x, y, w, h) { this.rect(x, y, w, h, { solid: 1, mat: 0.75, fuel: 0 }); }
}

const G = (o) => Object.assign({
  exposure: 1.0, ambient: 0.10, ambientTint: [0.30, 0.36, 0.52],
  wallTint: [0.34, 0.36, 0.48], wallLift: 0.135,
  vignette: 0.62, fogGain: 1.5, shimmer: 0.55, detail: 1.35,
  bloom: 0.62, grain: 0.026, aberr: 1.0, desat: 0.0,
  lift: [0.006, 0.004, 0.012], gain: [1.02, 0.99, 0.97], gamma: [1.0, 1.0, 1.02],
  moteTint: [0.55, 0.45, 0.32], moteGain: 0.65, sparkGain: 1.0,
}, o);

// ═══════════════════════════════════════════════════════════════ movements

export const MOVEMENTS = ['strike', 'house', 'cellar', 'flue', 'storm', 'hands'];

export const META = {
  strike: { numeral: 'I', name: 'STRIKE' },
  house: { numeral: 'II', name: 'HOUSE' },
  cellar: { numeral: 'III', name: 'CELLAR' },
  flue: { numeral: 'IV', name: 'FLUE' },
  storm: { numeral: 'V', name: 'STORM' },
  hands: { numeral: 'VI', name: '' },
};

const BUILD = {

  // ── I. STRIKE ── one room, three candles, and the only two things you can do.
  // Across the room, then up, then down into a hole. That last one is the game.
  strike() {
    const gw = 320, gh = 180, P = new Painter(gw, gh, 11);
    P.fill({ solid: 1, mat: 0.0, open: 0 });
    P.room(18, 30, 284, 128, { rough: 1.6 });
    // the well on the right — the ember wants to climb, so you must pull it down
    P.rect(246, 12, 46, 20, { solid: 0, mat: 0, fuel: 0, rough: 1.2 });
    // the matchbox you start on
    P.rect(34, 30, 34, 12, { solid: 1, mat: 0.25 });
    P.soot(38, 43, 64, 43, 1.4, 6);

    const t = [];
    t.push(P.candle(96, 30, 14, 2.8));            // 1: straight across the floor
    P.oil([[70, 32], [92, 32]], 1.3, 14);
    // A pillar rather than a shelf: a wide ledge means an ember rising under it
    // is simply blocked, and movement I is not the place to learn that.
    P.rect(168, 30, 24, 67, { solid: 1, mat: 0.25, rough: 0.8 });
    t.push(P.candle(180, 97, 12, 2.6));           // 2: up, where warmth takes you
    t.push(P.candle(268, 14, 11, 2.6));           // 3: down the well
    P.vent2(300, 146, 24, -8, -3);
    return {
      id: 'strike', gw, gh, P, spawn: [51, 48], view: [320, 180], camera: 'fixed',
      targets: t, rain: 0, windCool: 0.9, ventGain: 1,
      startHeat: 1.0, timeHint: 90,
      grade: G({ ambient: 0.105, ambientTint: [0.26, 0.30, 0.46], fogGain: 1.3 }),
      hints: [
        { at: 0.0, text: 'sweep your hand through the spark, not at it', hold: 14 },
        { at: 15.0, text: 'you are moving the air. the air moves the spark.', hold: 12 },
        { when: (g) => g.litCount >= 1, text: 'a bright ember rises. a dim one falls.', hold: 12 },
        { when: (g) => g.litCount >= 2, text: 'hold the button — your breath draws it to you', hold: 16 },
        { when: (g) => g.litCount >= 2 && g.levelTime > 60, text: 'hold below the spark to pull it down the well', hold: 14 },
      ],
    };
  },

  // ── II. HOUSE ── rooms, doorways, spilled oil, and a window that hates you.
  house() {
    const gw = 480, gh = 270, P = new Painter(gw, gh, 23);
    P.fill({ solid: 1, mat: 0.0 });
    P.room(14, 12, 452, 246, { rough: 2.0 });
    // floor between storeys, with two gaps to climb through
    P.rect(14, 118, 452, 12, { solid: 1, mat: 0.25, rough: 1.0 });
    P.rect(96, 114, 34, 22, { solid: 0, mat: 0, fuel: 0 });
    P.rect(330, 114, 30, 22, { solid: 0, mat: 0, fuel: 0 });
    // ground floor partitions
    P.rect(196, 12, 12, 74, { solid: 1, mat: 0.25, rough: 0.9 });
    P.rect(300, 12, 12, 62, { solid: 1, mat: 0.25, rough: 0.9 });
    // upper partition
    P.rect(238, 130, 12, 66, { solid: 1, mat: 0.25, rough: 0.9 });
    // the broken window, top right — open to the night
    P.rect(452, 176, 22, 46, { solid: 0, open: 1, mat: 0 });
    P.rect(444, 176, 10, 46, { solid: 0, mat: 0 });
    P.ventLine(452, 200, 400, 186, 17, -74, -26);

    const t = [];
    P.rect(40, 12, 60, 22, { solid: 1, mat: 0.0, rough: 0.8 });
    t.push(P.candle(70, 34, 13, 2.8));
    P.oil([[70, 15], [150, 15], [176, 22], [176, 60]], 1.7, 30);
    t.push(P.lamp(176, 66, 4.6));
    P.oil([[214, 15], [286, 15]], 1.7, 30);
    P.rect(206, 12, 16, 16, { solid: 1, mat: 0.25 });
    t.push(P.candle(214, 28, 12, 2.6));
    t.push(P.lamp(340, 58, 5.0));
    P.oil([[286, 15], [340, 15], [340, 50]], 1.7, 30);
    // upstairs
    P.rect(60, 130, 54, 18, { solid: 1, mat: 0.25, rough: 0.7 });
    t.push(P.candle(88, 148, 14, 2.8));
    t.push(P.lamp(300, 200, 5.2));
    P.oil([[150, 132], [286, 132], [300, 150], [300, 192]], 1.7, 28);
    P.soot(20, 250, 460, 250, 3.0, 4);

    P.vent2(60, 250, 22, 16, -8);
    return {
      id: 'house', gw, gh, P, spawn: [40, 40], view: [320, 180], camera: 'follow',
      targets: t, rain: 0, windCool: 1.0, ventGain: 1,
      startHeat: 0.95, timeHint: 150,
      grade: G({ ambient: 0.100, ambientTint: [0.24, 0.29, 0.45], fogGain: 1.55, bloom: 0.9 }),
      hints: [
        { at: 0.0, text: 'spilled oil carries fire further than you can', hold: 12 },
        { when: (g) => g.levelTime > 22 && g.litCount === 0, text: 'hold the button beside a wick to draw the spark onto it', hold: 14 },
        { when: (g) => g.litCount >= 1, text: 'go back to a lit flame when you dim — fire is the only refill', hold: 13 },
      ],
      tick(t_, f) {
        const g = 0.6 + 0.4 * Math.sin(t_ * 0.37) + 0.25 * Math.sin(t_ * 1.13 + 1.7);
        f.ventGain = 0.55 + Math.max(0, g) * 0.9;
      },
    };
  },

  // ── III. CELLAR ── cold stone, standing water, and things that want to drown you.
  cellar() {
    const gw = 480, gh = 270, P = new Painter(gw, gh, 41);
    P.fill({ solid: 1, mat: 0.0 });
    P.room(16, 14, 448, 210, { rough: 3.2, roughScale: 0.055 });
    // vaulted ceiling ribs
    for (let k = 0; k < 6; k++) {
      const cx = 52 + k * 76;
      P.disk(cx, 236, 34, { solid: 1, mat: 0.0, rough: 2.0 });
      P.disk(cx, 224, 26, { solid: 0, mat: 0, fuel: 0 });
    }
    // standing water on the floor
    P.water(16, 14, 96, 9);
    P.water(160, 14, 74, 8);
    P.water(300, 14, 120, 10);
    P.rect(112, 14, 48, 15, { solid: 1, mat: 0.0, rough: 1.1 });
    P.rect(234, 14, 66, 13, { solid: 1, mat: 0.0, rough: 1.1 });
    // damp air near the water
    P.rect(16, 14, 448, 34, { humid: 0.55 });
    P.rect(16, 14, 448, 16, { humid: 1.05 });

    // crates and stairs to climb
    P.rect(120, 29, 26, 20, { solid: 1, mat: 0.25, rough: 0.6 });
    P.rect(250, 27, 30, 26, { solid: 1, mat: 0.25, rough: 0.6 });
    P.rect(370, 14, 40, 44, { solid: 1, mat: 0.25, rough: 0.8 });
    P.rect(196, 88, 88, 11, { solid: 1, mat: 0.0, rough: 0.9 });
    P.rect(60, 116, 74, 11, { solid: 1, mat: 0.0, rough: 0.9 });
    P.rect(348, 128, 92, 11, { solid: 1, mat: 0.0, rough: 0.9 });

    const t = [];
    t.push(P.pyre(133, 49, 7.5));
    t.push(P.pyre(265, 99, 8.5));
    t.push(P.pyre(392, 139, 9.0));
    t.push(P.pyre(96, 127, 8.0));
    P.soot(22, 210, 458, 210, 3.4, 3);
    return {
      id: 'cellar', gw, gh, P, spawn: [40, 60], view: [320, 180], camera: 'follow',
      targets: t, rain: 0.030, windCool: 1.25, ventGain: 1, sim: { ambientSwirl: 18 },
      startHeat: 1.05, timeHint: 170,
      grade: G({
        ambient: 0.095, ambientTint: [0.20, 0.30, 0.44], fogGain: 1.55, vignette: 0.72,
        lift: [0.004, 0.008, 0.018], gain: [0.98, 1.0, 1.05], moteTint: [0.34, 0.42, 0.52], moteGain: 0.42,
      }),
      hints: [
        { at: 0.0, text: 'damp air will not hold a flame — stay high', hold: 12 },
        { when: (g) => g.ember.inWater || g.deaths > 0, text: 'the water will put you out. keep off the floor.', hold: 12 },
      ],
      tick(t_, f) {
        // slow drips falling from the vault
        f.clearGusts();
        for (let k = 0; k < 4; k++) {
          const ph = (t_ * 0.24 + k * 0.31) % 1;
          const cx = (70 + k * 106) / 480;
          f.setGust(k, cx, 0.86 - ph * 0.55, 0.030, 150 * Math.sin(Math.PI * Math.min(1, ph * 2.4)), 0, -1);
        }
      },
    };
  },

  // ── IV. FLUE ── straight up, through everything the house ever burned.
  flue() {
    const gw = 200, gh = 780, P = new Painter(gw, gh, 67);
    P.fill({ solid: 1, mat: 0.0 });
    // a wandering shaft
    const pts = [];
    for (let y = 10; y <= 770; y += 14) {
      const x = 100 + Math.sin(y * 0.0135) * 30 + Math.sin(y * 0.0047 + 2.1) * 20;
      pts.push([x, y]);
    }
    P.poly(pts, 30, { solid: 0, mat: 0, fuel: 0, rough: 1.6, roughScale: 0.035 });
    P.rect(60, 4, 80, 22, { solid: 0, mat: 0, fuel: 0 });
    // ledges that pinch the shaft
    for (let k = 0; k < 11; k++) {
      const y = 66 + k * 62;
      const side = k % 2 === 0 ? -1 : 1;
      const cx = 100 + Math.sin(y * 0.0135) * 30 + Math.sin(y * 0.0047 + 2.1) * 20;
      P.capsule(cx + side * 14, y, cx + side * 40, y + 3, 8, { solid: 1, mat: 0.0, rough: 1.4 });
      // side flues that breathe
      P.ventLine(cx - side * 26, y + 24, cx + side * 24, y + 30, 13, side * 62, 34);
    }
    // soot on every wall — this is the fuel, and there is a lot of it.
    // Lay it all down first, then scoop the middle out, or overlapping
    // segments punch holes in each other's coating.
    for (let i = 0; i + 1 < pts.length; i++)
      P.capsule(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 30, { fuel: 3.2, kind: 0.0, add: true });
    for (let i = 0; i + 1 < pts.length; i++)
      P.capsule(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 20, { fuel: 0, kind: 0.0 });
    P.ventLine(100, 40, 100, 740, 26, 0, 34);
    P.rect(20, 764, 160, 14, { solid: 0, open: 1, mat: 0 });
    const t = [P.pyre(100, 748, 12)];
    return {
      id: 'flue', gw, gh, P, spawn: [100, 22], view: [200, 150], camera: 'followY',
      targets: t, reach: { x: 100, y: 752, r: 24 },
      rain: 0, windCool: 0.85, ventGain: 1, sim: { vort: 1.6, ambientSwirl: 34 },
      startHeat: 1.0, timeHint: 130,
      grade: G({
        ambient: 0.078, ambientTint: [0.26, 0.24, 0.30], fogGain: 1.5, vignette: 0.74,
        bloom: 0.78, detail: 1.25, moteTint: [0.42, 0.34, 0.28],
        gain: [1.05, 0.98, 0.92],
      }),
      hints: [
        { at: 0.0, text: 'soot. all of it will go up.', hold: 10 },
        { when: (g) => g.levelTime > 14, text: 'stay bright and the draught will carry you up', hold: 12 },
      ],
      tick(t_, f) { f.ventGain = 0.75 + 0.55 * Math.sin(t_ * 0.63) + 0.2 * Math.sin(t_ * 1.9 + 0.6); },
    };
  },

  // ── V. STORM ── outside, in weather, where nothing is on your side.
  storm() {
    const gw = 840, gh = 230, P = new Painter(gw, gh, 89);
    P.fill({ solid: 0, mat: 0 });
    // The ground is a thick polyline, so the walkable surface is the spine plus
    // the stroke radius. Everything that stands on it has to be placed against
    // THIS, not against the spine — otherwise it ends up buried in the hill.
    const SPINE = (x) => 30 + Math.sin(x * 0.013) * 9 + Math.sin(x * 0.041 + 1.2) * 4;
    const GROUND = 26;
    const surf = (x) => SPINE(x) + GROUND - 3;
    const gpts = [];
    for (let x = -10; x <= gw + 10; x += 8) gpts.push([x, SPINE(x)]);
    P.poly(gpts, GROUND, { solid: 1, mat: 0.0, rough: 2.6, roughScale: 0.05 });
    // standing stones to shelter behind — and to carry the fires
    const rocks = [[128, 13, 30], [268, 14, 36], [408, 16, 32], [548, 15, 38], [688, 16, 34]];
    for (const [x, w, h] of rocks)
      P.capsule(x, surf(x) - 6, x + w * 0.2, surf(x) + h, w, { solid: 1, mat: 0.0, rough: 3.0, roughScale: 0.06 });
    P.rect(0, 214, gw, 18, { solid: 0, open: 1, mat: 0 });
    P.rect(824, 40, 18, 180, { solid: 0, open: 1, mat: 0 });
    P.rect(0, 40, 8, 180, { solid: 0, open: 1, mat: 0 });
    P.rect(0, 40, gw, 60, { humid: 0.10 });   // damp only near the ground

    const t = [];
    for (const [x, w, h] of rocks) t.push(P.pyre(x + w * 0.2, surf(x) + h + 1, 9));
    // the beacon, up on a cairn so you can see where you are going
    P.rect(778, surf(798) - 10, 40, 40, { solid: 1, mat: 0.0, rough: 1.6 });
    t.push(P.pyre(798, surf(798) + 30, 15));
    P.ventLine(0, 90, 840, 100, 56, 30, -1);
    return {
      id: 'storm', gw, gh, P, spawn: [158, 106], view: [320, 180], camera: 'followX',
      targets: t, reach: null,
      rain: 0.030, windCool: 1.25, ventGain: 1, sim: { vort: 1.2, ambientSwirl: 30, damp: 0.95 },
      startHeat: 1.15, timeHint: 200,
      grade: G({
        ambient: 0.135, ambientTint: [0.22, 0.29, 0.44], fogGain: 1.25, vignette: 0.58,
        wallTint: [0.20, 0.26, 0.38], wallLift: 0.075,
        bloom: 0.60, grain: 0.040, desat: 0.10, moteTint: [0.42, 0.52, 0.66], moteGain: 1.5,
        lift: [0.010, 0.014, 0.024], gain: [0.96, 0.99, 1.05],
      }),
      hints: [
        { at: 0.0, text: 'the fires are on the stones. the wind will carry you.' },
        { at: 18.0, text: 'rain. shelter in the lee when you are low.' },
      ],
      tick(t_, f) {
        f.ventGain = 0.6 + 0.55 * Math.max(0, Math.sin(t_ * 0.29)) + 0.22 * Math.sin(t_ * 0.83 + 2.0);
        f.clearGusts();
        for (let k = 0; k < 3; k++) {
          const ph = (t_ * 0.16 + k * 0.37) % 1;
          f.setGust(k, ph * 1.25 - 0.12, 0.42 + 0.22 * Math.sin(t_ * 0.6 + k), 0.10,
            55 * Math.sin(Math.PI * Math.min(1, ph * 1.6)), 1, -0.16);
        }
      },
    };
  },

  // ── VI ── the last one. Everything you learned, and then not doing it.
  hands() {
    const gw = 210, gh = 820, P = new Painter(gw, gh, 101);
    P.fill({ solid: 1, mat: 0.0 });
    const pts = [];
    for (let y = 8; y <= 814; y += 14) {
      const x = 105 + Math.sin(y * 0.0072 + 0.4) * 16;
      pts.push([x, y]);
    }
    P.poly(pts, 40, { solid: 0, mat: 0, fuel: 0, rough: 1.1, roughScale: 0.03 });
    P.rect(46, 4, 118, 20, { solid: 0, mat: 0, fuel: 0 });
    // The one gate. A ledge reaches in from the right near the top, and a soft
    // draught below it nudges you toward the ledge. The gap is on the left, and
    // getting through it costs exactly one breath.
    P.capsule(154, 690, 108, 693, 11, { solid: 1, mat: 0.0, rough: 1.0 });
    P.ventLine(62, 626, 142, 630, 12, 46, 3);
    // the still column
    P.ventLine(105, 40, 105, 780, 30, 0, 22);
    P.rect(30, 806, 150, 14, { solid: 0, open: 1, mat: 0 });
    return {
      id: 'hands', gw, gh, P, spawn: [105, 26], view: [210, 152], camera: 'followY',
      targets: [], reach: { x: 105, y: 788, r: 30 },
      rain: 0, windCool: 4.6, windFloor: 55, coolScale: 0.11, ventGain: 1, stillness: true,
      sim: { vort: 0.5, ambientSwirl: 3.0, damp: 0.78, buoy: 70 },
      startHeat: 1.15, timeHint: 150,
      grade: G({
        ambient: 0.072, ambientTint: [0.24, 0.27, 0.42], fogGain: 1.1, vignette: 0.66,
        bloom: 0.85, grain: 0.022, detail: 0.8, sparkGain: 0.8,
        moteTint: [0.48, 0.44, 0.40], moteGain: 0.55,
        lift: [0.005, 0.005, 0.012], gain: [1.0, 0.99, 1.0],
      }),
      hints: [{ at: 1.5, text: 'be still' }],
      tick(t_, f) { f.ventGain = 0.9 + 0.1 * Math.sin(t_ * 0.21); },
    };
  },
};

/** Build a movement into upload-ready typed arrays plus its gameplay data. */
export function buildLevel(id) {
  const raw = BUILD[id]();
  const P = raw.P;
  const L = {
    id: raw.id, gw: raw.gw, gh: raw.gh,
    solid: P.solid, fuel: P.fuel, medium: P.medium, vent: P.vent,
    spawn: raw.spawn, view: raw.view, camera: raw.camera,
    targets: (raw.targets || []).map((t) => ({ x: t.x, y: t.y, r: t.r || 4, lit: false, litAt: -1 })),
    reach: raw.reach || null,
    rain: raw.rain || 0, windCool: raw.windCool ?? 1, ventGain: raw.ventGain ?? 1,
    windFloor: raw.windFloor, coolScale: raw.coolScale ?? 1,
    startHeat: raw.startHeat ?? 1, timeHint: raw.timeHint || 120,
    stillness: !!raw.stillness, sim: raw.sim || null,
    grade: raw.grade, hints: raw.hints || [], tick: raw.tick || null,
    meta: META[raw.id],
  };
  // A clean copy of the starting fields so a death can rewind without a rebuild.
  L.solid0 = P.solid.slice();
  L.fuel0 = P.fuel.slice();
  L.medium0 = P.medium.slice();
  return L;
}

export { Painter };
