/* An evening, in four parts: the flock gathers, the falcon comes nine times,
 * the light goes, the birds go down. Nothing tells you which part you are in
 * except the colour of the sky.
 */

import { Flock } from "./flock.js";
import { Waves } from "./waves.js";
import { Falcon } from "./falcon.js";
import { Player } from "./player.js";
import { Sky } from "./sky.js";
import { Renderer } from "./render.js";
import { Audio } from "./audio.js";
import { Input } from "./input.js";
import { mulberry32, clamp, lerp } from "./math.js";

export const FLOCK = 3000;
const STOOPS = 9;
const FIRST_STOOP = 7.5;
const GAP_START = 12.5;
const GAP_END = 8.0;
const NIGHT_FALL = 11;   /* seconds from last stoop to full dark */
const DUSK_CEIL = 0.6;   /* how dark it gets before the roost phase */

export class Game {
  constructor(canvas, host) {
    this.canvas = canvas;
    this.host = host || {};
    this.world = { w: 1600, h: 900, ground: 150, hoverX: 800, hoverY: 360, holdX: 520, holdY: 320, roostX: 800, roostY: 700, roostR: 105 };
    this.audio = new Audio();
    this.renderer = new Renderer(canvas, this.world);
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.input = new Input(canvas, (cx, cy) => ({
      x: cx / this.renderer.scale,
      y: cy / this.renderer.scale,
    }));
    this.input.onFirst = () => this.begin();
    this.input.onKey = (k) => {
      if (k === "m") this.host.onMute && this.host.onMute(this.audio.toggle());
      else if (k === "r" && this.phase === "done") this.reset();
    };

    this.resize();
    this.reset();
  }

  resize() {
    const cssW = Math.max(320, innerWidth);
    const cssH = Math.max(240, innerHeight);
    const w = this.world;
    /* The short axis is always 900 simulation units, so a bird is the same
     * size and the wave takes the same time to cross whatever shape of window
     * it is being played in. A phone gets a tall sky, not a cropped one. */
    if (cssW >= cssH) { w.h = 900; w.w = 900 * (cssW / cssH); }
    else { w.w = 900; w.h = 900 * (cssH / cssW); }
    w.ground = Math.min(190, w.h * 0.17);
    w.hoverX = w.w * 0.5;
    w.hoverY = w.h * 0.42;
    /* Stretched along whichever axis the window is long on, so a phone held
     * upright gets a tall murmuration rather than a cropped wide one. */
    const wide = w.w >= w.h;
    const shortR = Math.min(330, w.h * 0.36, w.w * 0.36);
    w.holdX = wide ? shortR * 1.62 : shortR;
    w.holdY = wide ? shortR : shortR * 1.62;
    w.roostX = w.w * 0.5;
    w.roostY = w.h - w.ground * 0.62;
    w.roostR = Math.min(130, w.w * 0.11);
    this.renderer.resize(cssW, cssH, Math.min(devicePixelRatio || 1, 2));
    if (this.sky) this.sky = new Sky(this.world, this.seed);
  }

  reset() {
    /* ?seed= fixes the evening so a frame can be shot twice. It fixes the
     * random number generator and nothing else — no code path here is
     * conditional on it, because a debug flag that skips real work is exactly
     * how this repository once shipped a game that passed every test and could
     * not be seen. */
    const forced = new URLSearchParams(location.search).get("seed");
    this.seed = forced !== null && forced !== "" && Number.isFinite(+forced)
      ? (+forced) >>> 0
      : (Math.random() * 0xffffffff) >>> 0;
    const rng = mulberry32(this.seed);
    this.rng = rng;
    this.flock = new Flock(FLOCK, this.world, rng);
    this.waves = new Waves();
    this.falcon = new Falcon(this.world, rng);
    this.player = new Player(this.world);
    this.sky = new Sky(this.world, this.seed);

    this.phase = "waiting";
    this.t = 0;
    this.huntT = 0;
    this.nightT = 0;
    this.nextStoop = FIRST_STOOP;
    this.stoopsDone = 0;
    this.night = 0;
    this.roosting = 0;
    this.taken = 0;
    this.lastStrikeAt = -99;
    this.shake = 0;
    this.last = 0;
    this.audioTick = 0;
    this.report(true);
  }

  begin() {
    this.audio.start();
    if (this.phase === "waiting") {
      this.phase = "hunt";
      this.huntT = 0;
    }
  }

  /* One update. dt is clamped because a backgrounded tab hands back a delta
   * measured in seconds, and the flock resolves that by teleporting into a
   * uniform smear it never recovers from. */
  update(dt) {
    dt = Math.min(dt, 1 / 30);
    this.t += dt;

    if (this.phase === "hunt") {
      this.huntT += dt;
      this.night = clamp(this.huntT / (FIRST_STOOP + GAP_START * STOOPS * 0.82), 0, 1) * DUSK_CEIL;

      if (this.stoopsDone < STOOPS && this.huntT >= this.nextStoop && this.falcon.phase === "away") {
        if (this.falcon.begin(this.flock)) {
          this.stoopsDone++;
          const k = this.stoopsDone / STOOPS;
          this.nextStoop = this.huntT + lerp(GAP_START, GAP_END, k);
        }
      }

      if (this.stoopsDone >= STOOPS && this.falcon.phase === "away") {
        this.phase = "night";
        this.nightT = 0;
      }
    } else if (this.phase === "night") {
      this.nightT += dt;
      this.night = clamp(DUSK_CEIL + (this.nightT / NIGHT_FALL) * (1 - DUSK_CEIL), 0, 1);
      /* The pull to the trees comes on over four seconds. They do not turn
       * for the roost together, they start leaning and then it is a pour. */
      this.roosting = clamp((this.nightT - 1.2) / 4, 0, 1);
      const settled = this.flock.roostedCount + (FLOCK - this.flock.aliveCount);
      if ((settled >= FLOCK - 6 && this.nightT > 6) || this.nightT > 34) {
        /* Settle the last few stragglers rather than leaving them in the air.
         * The end screen reports roosted and taken against three thousand, and
         * a handful of birds still circling when the clock ran out made those
         * numbers fail to add up — 2,754 roosted and 241 taken out of 3,000,
         * with five unaccounted for. They get down eventually; we just stopped
         * watching. */
        this.flock.settleStragglers();
        this.phase = "done";
        this.report(true);
      }
    }

    this.waves.step(dt);

    if (this.phase !== "waiting") {
      this.player.step(dt, this.input, this.waves, (s) => this.audio.wave(s));
    }

    this.falcon.step(
      dt, this.flock,
      (killed) => {
        this.taken += killed;
        this.lastStrikeAt = this.t;
        this.audio.strike(killed);
        if (killed > 0 && !this.reducedMotion) this.shake = Math.min(1, killed / 55);
        this.report();
      },
      () => this.audio.shriek(),
    );

    this.flock.step(dt, {
      player: this.phase === "waiting" ? null : this.player,
      falcon: this.falcon,
      roost: { x: this.world.roostX, y: this.world.roostY, r: this.world.roostR },
      roosting: this.roosting,
      waves: this.waves,
    });

    this.shake = Math.max(0, this.shake - dt * 3.4);

    /* Mean alarm drives the sound bed. Sampling every eleventh bird is within
     * a percent of the true mean and costs a tenth as much, and the whole thing
     * runs every fourth frame — the filters already glide over 80ms, so sixty
     * updates a second scheduled four audio parameters apiece to no audible end. */
    this.audioTick = (this.audioTick + 1) & 3;
    if (this.audioTick === 0) {
      let sum = 0, n = 0;
      for (let i = 0; i < this.flock.n; i += 11) {
        if (!this.flock.alive[i] || this.flock.roosted[i]) continue;
        sum += this.flock.alarm[i]; n++;
      }
      this.audio.set(n ? sum / n : 0, this.night, clamp(n / 200, 0, 1));
    }
  }

  draw() {
    const r = this.renderer;
    r.begin(this.shake);
    this.sky.draw(r.g, this.night, this.t);
    r.drawFalconUnder(this.falcon);
    r.drawFlock(this.flock, this.t, this.night);
    if (this.phase !== "waiting") r.drawPlayer(this.player, this.t);
    r.drawFalcon(this.falcon, this.t);
    this.sky.drawGround(r.g, this.night, this.flock.roostedCount);
    r.drawRoosted(this.flock);
    r.vignette(this.night);
  }

  frame(now) {
    const dt = this.last ? (now - this.last) / 1000 : 1 / 60;
    this.last = now;
    this.update(dt);
    this.draw();
  }

  /* Everything the page outside the canvas is allowed to know. Kept to
   * numbers: the page has no opinions to add. */
  report(force) {
    const s = {
      phase: this.phase,
      alive: this.flock.aliveCount,
      roosted: this.flock.roostedCount,
      taken: this.taken,
      total: FLOCK,
      night: this.night,
    };
    this.state = s;
    if (this.host.onState) this.host.onState(s, force);
  }
}
