/* Sky, stars, treeline, roost.
 *
 * The clock in this game is the light. There is no timer anywhere on screen
 * and no words telling you the hunt is nearly over — the sky just gets darker,
 * the way it does, and when it is dark the birds go down. Everything here
 * exists to make that legible enough to plan against.
 */

import { lerp, clamp, mulberry32 } from "./math.js";

/* Four bands, three times of evening. Sampled off a real winter dusk rather
 * than picked in a colour wheel: the rose sits *under* the blue, the horizon
 * keeps a little sodium in it long after the top has gone, and nothing is
 * saturated at the end. A gradient chosen by eye always goes purple. */
const STAGES = [
  [[0x2c, 0x33, 0x6e], [0x6d, 0x54, 0x8f], [0xc4, 0x6c, 0x7e], [0xf3, 0xa5, 0x6b]],
  [[0x18, 0x1c, 0x42], [0x3a, 0x2f, 0x5e], [0x7c, 0x45, 0x60], [0xc0, 0x6b, 0x45]],
  [[0x05, 0x06, 0x10], [0x0c, 0x0d, 0x22], [0x1c, 0x17, 0x30], [0x3a, 0x26, 0x2e]],
];

function band(t, i) {
  const k = t * (STAGES.length - 1);
  const a = Math.min(STAGES.length - 1, Math.floor(k));
  const b = Math.min(STAGES.length - 1, a + 1);
  const f = k - a;
  const c0 = STAGES[a][i], c1 = STAGES[b][i];
  return `rgb(${Math.round(lerp(c0[0], c1[0], f))},${Math.round(lerp(c0[1], c1[1], f))},${Math.round(lerp(c0[2], c1[2], f))})`;
}

export class Sky {
  constructor(world, seed) {
    this.world = world;
    const rng = mulberry32(seed ^ 0x5eed);

    this.stars = [];
    for (let i = 0; i < 190; i++) {
      this.stars.push({
        x: rng(), y: rng() * 0.72,
        r: 0.5 + rng() * 1.15,
        /* Stars do not all arrive at once; the bright ones are out while it is
         * still blue. */
        at: 0.28 + rng() * 0.5,
        tw: rng() * 6.28,
      });
    }

    this.trees = this.growTrees(rng);
    this._grad = null;
    this._gradKey = -1;
  }

  /* Bare winter trees, because a murmuration is a November thing.
   *
   * First pass drew each limb as a free-floating quad hung off the trunk and
   * the treeline came out as a heap of broken pallets. Branches have to grow
   * from the tip of their parent at its width, or the eye reads planks. */
  growTrees(rng) {
    const { w, h, ground } = this.world;
    const baseY = h - ground * 0.16;
    const path = new Path2D();

    const limb = (x, y, ang, len, wid, depth) => {
      const x2 = x + Math.cos(ang) * len;
      const y2 = y + Math.sin(ang) * len;
      const w2 = wid * 0.66;
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      path.moveTo(x + nx * wid, y + ny * wid);
      path.lineTo(x2 + nx * w2, y2 + ny * w2);
      path.lineTo(x2 - nx * w2, y2 - ny * w2);
      path.lineTo(x - nx * wid, y - ny * wid);
      path.closePath();
      if (depth <= 0 || len < 3.5) return;
      /* Two forks usually, three sometimes. Always at the tip. */
      const forks = rng() < 0.22 ? 3 : 2;
      for (let i = 0; i < forks; i++) {
        const lean = (i - (forks - 1) / 2) * (0.52 + rng() * 0.3) + (rng() - 0.5) * 0.34;
        limb(x2, y2, ang + lean, len * (0.6 + rng() * 0.26), w2, depth - 1);
      }
    };

    const plant = (x, scale, depth) => {
      const trunk = ground * (0.34 + rng() * 0.2) * scale;
      limb(x, baseY, -Math.PI / 2 + (rng() - 0.5) * 0.14, trunk,
           Math.max(1.1, trunk * 0.085), depth);
    };

    /* A thicket at the roost, scattered singles along the rest of the skyline. */
    const roostAt = this.world.roostX;
    for (let i = 0; i < 15; i++) {
      plant(roostAt + (rng() - 0.5) * this.world.roostR * 2.9, 0.9 + rng() * 0.55, 5);
    }
    for (let i = 0; i < 22; i++) {
      const x = rng() * w;
      if (Math.abs(x - roostAt) < this.world.roostR * 1.5) continue;
      plant(x, 0.42 + rng() * 0.46, 4);
    }
    this.treePath = path;
    return [];
  }

  /* The gradient object is rebuilt only when the light has actually moved a
   * step, not sixty times a second. */
  gradient(g, night) {
    const key = Math.round(night * 120);
    if (key !== this._gradKey) {
      const { h } = this.world;
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, band(night, 0));
      grad.addColorStop(0.42, band(night, 1));
      grad.addColorStop(0.76, band(night, 2));
      grad.addColorStop(1, band(night, 3));
      this._grad = grad;
      this._gradKey = key;
    }
    return this._grad;
  }

  draw(g, night, time) {
    const { w, h, ground } = this.world;

    g.fillStyle = this.gradient(g, night);
    g.fillRect(0, 0, w, h);

    /* Stars */
    if (night > 0.24) {
      g.fillStyle = "#fdf6e6";
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        if (night < s.at) continue;
        const a = clamp((night - s.at) / 0.3, 0, 1) * (0.55 + 0.45 * Math.sin(time * 1.6 + s.tw));
        if (a <= 0.02) continue;
        g.globalAlpha = a * 0.85;
        g.beginPath();
        g.arc(s.x * w, s.y * h, s.r, 0, 6.2832);
        g.fill();
      }
      g.globalAlpha = 1;
    }

    /* The last of the sun, low and to the west. It is the only warm thing left
     * once the sky has gone, and it is what the treeline is read against. */
    const glowA = clamp(1 - night * 1.15, 0, 1);
    if (glowA > 0.01) {
      const gy = h - ground * 0.1;
      const glow = g.createRadialGradient(w * 0.22, gy, 0, w * 0.22, gy, h * 0.52);
      glow.addColorStop(0, `rgba(255,196,124,${0.38 * glowA})`);
      glow.addColorStop(0.5, `rgba(226,120,96,${0.13 * glowA})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);
    }
  }

  /* Drawn after the birds so the flock passes behind the trees, which is the
   * cheapest possible depth cue and the only one this needs. */
  drawGround(g, night, roostedCount) {
    const { w, h, ground } = this.world;
    const baseY = h - ground * 0.18;

    /* Land. Not black — a hair of blue keeps it reading as ground at night
     * rather than as a hole in the screen. */
    const soil = night > 0.6 ? "#05060d" : `rgb(${Math.round(lerp(26, 5, night))},${Math.round(lerp(22, 6, night))},${Math.round(lerp(34, 13, night))})`;
    g.fillStyle = soil;
    g.fillRect(0, baseY - 1, w, h - baseY + 1);

    /* Haze. Without it the land meets the sky on a hard black edge that reads
     * as a rendering seam rather than a horizon. */
    const haze = g.createLinearGradient(0, baseY - ground * 0.95, 0, baseY);
    haze.addColorStop(0, "rgba(0,0,0,0)");
    haze.addColorStop(1, night > 0.6 ? "rgba(5,6,13,0.75)" : "rgba(30,18,30,0.5)");
    g.fillStyle = haze;
    g.fillRect(0, baseY - ground * 0.95, w, ground * 0.95);

    /* Roost glow, once there is anything in it worth glowing about. */
    if (roostedCount > 0) {
      const a = clamp(roostedCount / 1800, 0, 1) * clamp(night, 0, 1);
      const rg = g.createRadialGradient(this.world.roostX, baseY - ground * 0.42, 0, this.world.roostX, baseY - ground * 0.42, this.world.roostR * 1.9);
      rg.addColorStop(0, `rgba(120,138,190,${0.15 * a})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, w, h);
    }

    g.fillStyle = soil;
    g.fill(this.treePath);
  }
}
