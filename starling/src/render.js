/* Drawing three thousand birds sixty times a second, in a 2D canvas.
 *
 * The rule that makes this possible is not the obvious one. Batching every
 * bird into one path per tone and filling three times a frame is the textbook
 * answer and it cost 45ms — three thousand subpaths in a single path is a case
 * the rasteriser falls off a cliff on, and it is superlinear, so the fix is not
 * fewer birds. Measured on this flock:
 *
 *     one fill of 3000 ....... 45.0 ms
 *     chunks of 1000 ......... 15.5 ms
 *     chunks of 400 ...........6.4 ms
 *     chunks of 100 ...........2.2 ms
 *     chunks of 50 ............1.4 ms
 *
 * So it fills in small batches instead: same geometry, same number of birds,
 * twenty times faster. Density is not the problem — the same 3000 birds spread
 * evenly over the whole canvas cost the same 45ms in one fill. It is the size
 * of the path.
 *
 * A sprite atlas with one drawImage per bird was also tried, on the assumption
 * that blits beat path rasterisation. It measured 24.7ms against the 15.7ms
 * that batching already gave, so it is not in here.
 *
 * One real side effect: birds overlapping inside a single path merge under the
 * nonzero winding rule and blend once, while birds in different batches blend
 * twice. Dense parts of the flock therefore come out slightly darker than they
 * did. That is the correct direction — a murmuration reads its own density as
 * darkness — so it stays.
 *
 * The three buckets are not a rendering convenience, they are the readout. A
 * banking starling shows its pale underwing, which is why a real murmuration
 * looks like smoke with light moving through it, and it is why the wave is
 * visible at all. Nothing draws the wave. The birds are the wave.
 */

import { clamp, lerp } from "./math.js";
import { ARMED } from "./falcon.js";

const CALM = 0.17;
/* Pale is not a brightness choice, it is the rule made visible: this is the
 * exact alarm at which a bird survives a stoop, imported from the falcon so the
 * two can never drift apart. A bird showing its underwing is a bird that lives.
 * Nothing in the game says so and nothing needs to — you learn it by watching a
 * dive go through a pale patch and take nothing. */
const HOT = ARMED;
/* Birds per fill. See the note at the top: this number is the frame rate. */
const BATCH = 96;

export class Renderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d", { alpha: false, desynchronized: true });
    this.world = world;
    this.scale = 1;
    this.shakeX = 0; this.shakeY = 0;
  }

  resize(cssW, cssH, dpr) {
    const { world } = this;
    this.scale = cssH / world.h;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.dpr = dpr;
  }

  begin(shake) {
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.scale(this.dpr * this.scale, this.dpr * this.scale);
    if (shake > 0) {
      this.shakeX = (Math.random() - 0.5) * shake * 16;
      this.shakeY = (Math.random() - 0.5) * shake * 16;
      g.translate(this.shakeX, this.shakeY);
    }
  }

  /* One bird into the current path. Kept inline-shaped and allocation-free.
   * The four points are nose, left wingtip, a notch behind the body, right
   * wingtip — a chevron, which is the least you can draw that still reads as
   * a bird at six pixels long. */
  static bird(g, x, y, cos, sin, s, sweep) {
    const bx = -cos * s, by = -sin * s;
    const px = -sin * s * sweep, py = cos * s * sweep;
    g.moveTo(x + cos * s * 1.15, y + sin * s * 1.15);
    g.lineTo(x + bx * 0.9 + px, y + by * 0.9 + py);
    g.lineTo(x + bx * 0.35, y + by * 0.35);
    g.lineTo(x + bx * 0.9 - px, y + by * 0.9 - py);
    g.closePath();
  }

  drawFlock(flock, time, night) {
    const g = this.g;
    const { x, y, dir, alarm, alive, roosted } = flock;
    const n = flock.n;

    /* Silhouettes lift slightly as the sky darkens, or the flock disappears
     * into the night before the roost phase can show it landing. */
    const dark = night > 0.55
      ? `rgba(${Math.round(lerp(12, 34, (night - 0.55) / 0.45))},${Math.round(lerp(13, 36, (night - 0.55) / 0.45))},${Math.round(lerp(22, 52, (night - 0.55) / 0.45))},0.95)`
      : "rgba(16,15,26,0.9)";

    const passes = [
      { lo: -1, hi: CALM, fill: dark, size: 1 },
      { lo: CALM, hi: HOT, fill: night > 0.6 ? "rgba(126,132,168,0.92)" : "rgba(92,86,110,0.92)", size: 1.04 },
      { lo: HOT, hi: 2, fill: night > 0.6 ? "rgba(216,222,246,0.97)" : "rgba(238,230,214,0.95)", size: 1.12 },
    ];

    for (let p = 0; p < 3; p++) {
      const pass = passes[p];
      g.fillStyle = pass.fill;
      let batch = 0;
      g.beginPath();
      for (let i = 0; i < n; i++) {
        if (!alive[i] || roosted[i]) continue;
        const a = alarm[i];
        if (a <= pass.lo || a > pass.hi) continue;
        /* Depth from a hash of the index: free, stable frame to frame, and it
         * gives the flock volume that a flat scatter of identical dots never
         * has. */
        const h = ((i * 2654435761) >>> 0) / 4294967296;
        const s = (2.6 + h * 2.1) * pass.size;
        const d = dir[i];
        /* Wingbeat. Each bird on its own phase, so the flock shimmers rather
         * than pulsing in time like a single animal. */
        const sweep = 0.62 + 0.34 * Math.sin(time * (13 + h * 5) + h * 37);
        Renderer.bird(g, x[i], y[i], Math.cos(d), Math.sin(d), s, sweep);
        if (++batch >= BATCH) { g.fill(); g.beginPath(); batch = 0; }
      }
      if (batch > 0) g.fill();
    }
  }

  /* Birds already down in the trees. Static, so they cost almost nothing, and
   * watching the roost fill up is the only score readout during play. */
  drawRoosted(flock) {
    const g = this.g;
    if (flock.roostedCount === 0) return;
    g.fillStyle = "rgba(198,206,236,0.5)";
    let batch = 0;
    g.beginPath();
    for (let i = 0; i < flock.n; i++) {
      if (!flock.roosted[i]) continue;
      g.moveTo(flock.x[i], flock.y[i]);
      g.lineTo(flock.x[i] + 2.2, flock.y[i]);
      g.lineTo(flock.x[i] + 1.1, flock.y[i] - 2.2);
      g.closePath();
      /* Three thousand roosted birds is the same cliff as three thousand
       * flying ones, and by the end of a good evening that is exactly how
       * many are down there. */
      if (++batch >= BATCH) { g.fill(); g.beginPath(); batch = 0; }
    }
    if (batch > 0) g.fill();
  }

  /* You.
   *
   * The one concession to legibility in the whole picture: a warm bird with a
   * warm halo, because finding yourself in three thousand identical
   * silhouettes is otherwise genuinely impossible and the game is unplayable
   * without it. It is at least honest about the light — you are the bird with
   * the last of the sun on your back. */
  drawPlayer(player, time) {
    const g = this.g;
    const halo = g.createRadialGradient(player.x, player.y, 0, player.x, player.y, 34);
    halo.addColorStop(0, "rgba(255,206,138,0.30)");
    halo.addColorStop(0.55, "rgba(255,178,104,0.09)");
    halo.addColorStop(1, "rgba(255,170,90,0)");
    g.fillStyle = halo;
    g.beginPath();
    g.arc(player.x, player.y, 34, 0, 6.2832);
    g.fill();

    const d = player.dir;
    const sweep = 0.6 + 0.3 * Math.sin(time * 15);
    g.beginPath();
    Renderer.bird(g, player.x, player.y, Math.cos(d), Math.sin(d), 5.6, sweep);
    g.fillStyle = player.alarm > 0.35 ? "#fff4e0" : "#ffcf92";
    g.fill();
  }

  /* The falcon, and the shadow it puts on the flock before it drops.
   *
   * The shadow is the telegraph. It could have been a ring and a countdown,
   * and that would have been clearer and would have made this a different and
   * much worse game — the whole tension is reading a bird's intent off its
   * body and a patch of dark, a beat before it commits. */
  drawFalconUnder(falcon) {
    if (falcon.phase === "away") return;
    const g = this.g;

    if (falcon.phase === "mark") {
      const k = clamp(falcon.t / 1.55, 0, 1);
      const r = lerp(200, 118, k);
      const sh = g.createRadialGradient(falcon.tx, falcon.ty, 0, falcon.tx, falcon.ty, r);
      const a = 0.09 + k * 0.26;
      sh.addColorStop(0, `rgba(6,4,12,${a})`);
      sh.addColorStop(0.6, `rgba(6,4,12,${a * 0.45})`);
      sh.addColorStop(1, "rgba(6,4,12,0)");
      g.fillStyle = sh;
      g.beginPath();
      g.arc(falcon.tx, falcon.ty, r, 0, 6.2832);
      g.fill();
    }

    if (falcon.phase === "stoop") {
      g.strokeStyle = "rgba(10,8,18,0.30)";
      g.lineWidth = 3.5;
      g.beginPath();
      g.moveTo(falcon.x - Math.cos(falcon.dir) * 74, falcon.y - Math.sin(falcon.dir) * 74);
      g.lineTo(falcon.x, falcon.y);
      g.stroke();
    }
  }

  /* Body goes over the flock; the shadow and the dive line go under it, so the
   * birds are between the falcon and its own mark. */
  drawFalcon(falcon, time) {
    if (falcon.phase === "away") return;
    const g = this.g;
    const d = falcon.dir;
    const cos = Math.cos(d), sin = Math.sin(d);
    /* Wings tucked in the stoop, open otherwise — the shape change is the tell
     * that it has committed. */
    const tuck = falcon.phase === "stoop" ? 0.34 : 0.95 + Math.sin(time * 7) * 0.12;
    const s = 17;
    g.beginPath();
    Renderer.bird(g, falcon.x, falcon.y, cos, sin, s, tuck);
    g.fillStyle = "rgba(10,8,16,0.96)";
    g.fill();
  }

  vignette(night) {
    const g = this.g;
    const { w, h } = this.world;
    const v = g.createRadialGradient(w * 0.5, h * 0.46, h * 0.32, w * 0.5, h * 0.46, h * 0.92);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, `rgba(0,0,0,${0.3 + night * 0.24})`);
    g.fillStyle = v;
    g.fillRect(0, 0, w, h);
  }
}
