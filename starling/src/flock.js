/* The flock. Three thousand birds in flat arrays and one uniform grid.
 *
 * The whole game lives in this file's one honest claim: a starling does not
 * see the flock, it sees about seven neighbours. Everything the player feels —
 * the wave, the turn that arrives too late, the sense of being listened to by
 * a crowd you cannot address — falls out of that and nothing else. There is no
 * flock-level code anywhere. Resist adding any.
 */

import { TAU, wrapAngle, angleTo } from "./math.js";

/* Seven is not a round number chosen for flavour. Ballerini 2008 counted the
 * interaction range of real starlings in topological terms and got six to
 * seven; the flock stays coherent under a hawk because each bird tracks that
 * many regardless of how far away they drift. Capping the neighbour scan is
 * therefore both the cheap thing and the correct thing, which almost never
 * happens. */
const NEIGHBOURS = 7;

export class Flock {
  constructor(count, world, rng) {
    this.world = world;
    this.rng = rng;
    this.n = count;

    this.x = new Float32Array(count);
    this.y = new Float32Array(count);
    this.vx = new Float32Array(count);
    this.vy = new Float32Array(count);
    /* Heading is stored apart from velocity so a bird can be turning while its
     * body still carries the old direction. That lag is the animation and the
     * feel; collapsing the two makes the flock snap like a shoal of arrows. */
    this.dir = new Float32Array(count);
    /* 0 = calm, 1 = fully agitated. Drives colour (a banking starling flashes
     * its pale underwing, which is why real murmurations look like smoke with
     * light rolling through it) and drives the spread that beats the falcon. */
    this.alarm = new Float32Array(count);
    this.alive = new Uint8Array(count).fill(1);
    /* Roosted birds are alive but out of the sim — parked in the trees. */
    this.roosted = new Uint8Array(count);
    this.speed = new Float32Array(count);

    this.aliveCount = count;
    this.roostedCount = 0;

    /* Uniform grid. Cell size is the perception radius so a scan touches 9
     * cells and never more. */
    this.cell = 52;
    this.cols = Math.ceil(world.w / this.cell) + 1;
    this.rows = Math.ceil(world.h / this.cell) + 1;
    this.cellCount = this.cols * this.rows;
    this.cellStart = new Int32Array(this.cellCount + 1);
    this.cellItems = new Int32Array(count);
    this.counts = new Int32Array(this.cellCount);

    /* Scratch reused every bird, every frame. Allocating in the inner loop is
     * how a 3000-boid sim quietly becomes a 20fps sim. */
    this._nd = new Float32Array(NEIGHBOURS);
    this._ni = new Int32Array(NEIGHBOURS);

    this.seed();
  }

  seed() {
    const { rng, world } = this;
    for (let i = 0; i < this.n; i++) {
      /* Start as a loose ball aloft, the way a murmuration gathers before it
       * organises: too dense to be pretty, which makes the first seconds of
       * self-organisation legible as something the player did not do. */
      const a = rng() * TAU;
      const r = Math.sqrt(rng()) * world.h * 0.24;
      this.x[i] = world.w * 0.5 + Math.cos(a) * r * 1.7;
      this.y[i] = world.h * 0.42 + Math.sin(a) * r;
      const d = rng() * TAU;
      this.dir[i] = d;
      this.speed[i] = 108 + rng() * 26;
      this.vx[i] = Math.cos(d) * this.speed[i];
      this.vy[i] = Math.sin(d) * this.speed[i];
    }
  }

  rebuildGrid() {
    const { counts, cellStart, cellItems, cols, cell } = this;
    counts.fill(0);
    const rows = this.rows;
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i] || this.roosted[i]) continue;
      let cx = (this.x[i] / cell) | 0;
      let cy = (this.y[i] / cell) | 0;
      if (cx < 0) cx = 0; else if (cx >= cols) cx = cols - 1;
      if (cy < 0) cy = 0; else if (cy >= rows) cy = rows - 1;
      counts[cy * cols + cx]++;
    }
    let running = 0;
    for (let c = 0; c < this.cellCount; c++) {
      cellStart[c] = running;
      running += counts[c];
    }
    cellStart[this.cellCount] = running;
    /* counts is reused as a write cursor, then it is garbage until next frame. */
    const cursor = counts;
    for (let c = 0; c < this.cellCount; c++) cursor[c] = cellStart[c];
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i] || this.roosted[i]) continue;
      let cx = (this.x[i] / cell) | 0;
      let cy = (this.y[i] / cell) | 0;
      if (cx < 0) cx = 0; else if (cx >= cols) cx = cols - 1;
      if (cy < 0) cy = 0; else if (cy >= rows) cy = rows - 1;
      cellItems[cursor[cy * cols + cx]++] = i;
    }
  }
}

/* ---------------------------------------------------------------------------
 * One step.
 *
 * Read order matters here: alarm is contagious and is read from the *previous*
 * frame's values while the new ones are written. Doing it in place would let a
 * wave cross the whole flock in a single frame, in whatever arbitrary order the
 * grid happens to list birds — the flock would flash all at once and the game
 * would have no mechanic left.
 * ------------------------------------------------------------------------- */

const SEP = 17;          /* personal space, calm */
const SEP_ALARMED = 40;  /* personal space at full alarm: the flash expansion */
const PERCEPT = 52;      /* == grid cell; keeps a scan to nine cells */
const TURN_RATE = 4.4;   /* radians/sec a starling can bank */

Flock.prototype.step = function step(dt, ctx) {
  this.rebuildGrid();

  const {
    x, y, vx, vy, dir, alarm, alive, roosted, speed,
    cellStart, cellItems, cols, rows, cell, world,
  } = this;
  const nd = this._nd, ni = this._ni;
  const nextAlarm = this._nextAlarm || (this._nextAlarm = new Float32Array(this.n));

  const player = ctx.player;
  const falcon = ctx.falcon;
  const roost = ctx.roost;
  const roosting = ctx.roosting;
  const waves = ctx.waves;

  for (let i = 0; i < this.n; i++) {
    if (!alive[i] || roosted[i]) continue;

    const px = x[i], py = y[i], pd = dir[i];

    /* --- gather the seven nearest ------------------------------------- */
    let found = 0, worst = Infinity;
    let cx = (px / cell) | 0, cy = (py / cell) | 0;
    if (cx < 0) cx = 0; else if (cx >= cols) cx = cols - 1;
    if (cy < 0) cy = 0; else if (cy >= rows) cy = rows - 1;
    const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < cols - 1 ? cx + 1 : cols - 1;
    const y0 = cy > 0 ? cy - 1 : 0, y1 = cy < rows - 1 ? cy + 1 : rows - 1;

    for (let gy = y0; gy <= y1; gy++) {
      const rowBase = gy * cols;
      for (let gx = x0; gx <= x1; gx++) {
        const c = rowBase + gx;
        const end = cellStart[c + 1];
        for (let k = cellStart[c]; k < end; k++) {
          const j = cellItems[k];
          if (j === i) continue;
          const dx = x[j] - px, dy = y[j] - py;
          const d2 = dx * dx + dy * dy;
          if (d2 > PERCEPT * PERCEPT) continue;
          if (found < NEIGHBOURS) {
            /* insertion into a seven-slot sorted list */
            let s = found++;
            while (s > 0 && nd[s - 1] > d2) { nd[s] = nd[s - 1]; ni[s] = ni[s - 1]; s--; }
            nd[s] = d2; ni[s] = j;
            worst = nd[found - 1];
          } else if (d2 < worst) {
            let s = NEIGHBOURS - 1;
            while (s > 0 && nd[s - 1] > d2) { nd[s] = nd[s - 1]; ni[s] = ni[s - 1]; s--; }
            nd[s] = d2; ni[s] = j;
            worst = nd[NEIGHBOURS - 1];
          }
        }
      }
    }

    /* --- the three rules, plus contagion ------------------------------- */
    let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0;
    let heardAlarm = 0;
    const myAlarm = alarm[i];
    const sepRange = SEP + (SEP_ALARMED - SEP) * myAlarm;

    for (let s = 0; s < found; s++) {
      const j = ni[s];
      const d = Math.sqrt(nd[s]) || 0.0001;
      const dx = (x[j] - px) / d, dy = (y[j] - py) / d;
      if (d < sepRange) {
        /* 1/d, not a constant: a bird nearly on top of you is the emergency,
         * one at arm's length is merely close. Linear separation makes the
         * flock breathe as one soggy blob. */
        const push = (sepRange - d) / sepRange;
        sepX -= dx * push; sepY -= dy * push;
      }
      aliX += Math.cos(dir[j]); aliY += Math.sin(dir[j]);
      cohX += dx; cohY += dy;
      const a = alarm[j];
      if (a > heardAlarm) heardAlarm = a;
    }

    /* --- the player ----------------------------------------------------
     * You are not a leader. You are a bird whose neighbours happen to be
     * looking at you, which is the whole of the influence you get. The radius
     * below is the only thumb on the scale in the game, and it exists because
     * seven topological neighbours out of three thousand is authority so thin
     * that the game reads as a screensaver. */
    let steerX = 0, steerY = 0;
    if (player) {
      const dx = player.x - px, dy = player.y - py;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < player.authority) {
        const w = (1 - d / player.authority);
        aliX += Math.cos(player.dir) * w * 5.5;
        aliY += Math.sin(player.dir) * w * 5.5;
        /* No alarm is injected here on purpose. The player used to transmit
         * fright to its neighbours directly as well as emitting a wave from
         * the same spot, which put a permanent bright smear around you that
         * moved where you moved — it read as the player being on fire, and it
         * hid the one thing the colour is supposed to mean. The wave starts at
         * your position anyway. One source. */
        if (d > 60) { cohX += (dx / d) * w * 0.9; cohY += (dy / d) * w * 0.9; }
      }
    }

    /* --- the falcon ---------------------------------------------------- */
    if (falcon && falcon.active) {
      const dx = px - falcon.x, dy = py - falcon.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      if (d < 120) {
        const w = (1 - d / 120);
        /* Seeing it yourself is NOT enough, and that is the entire point.
         *
         * This first read the other way round — a bird that could see the
         * falcon got the full alarm and swerved early — and it quietly deleted
         * the game: measured over nine stoops, a player who did nothing at all
         * lost one bird, because the flock parted around the dive on its own
         * and everyone near it was armed by line of sight. That is also just
         * wrong about starlings. A bird inside a murmuration cannot see a
         * stooping peregrine, and one that can has a fifth of a second, which
         * is why the wave exists at all: the flock knows things no bird in it
         * knows. So this caps below the threshold that saves you. Seeing it
         * makes you flinch. Being told is what keeps you alive. */
        const seen = w * 0.26;
        if (seen > heardAlarm) heardAlarm = seen;
        steerX += (dx / d) * w * 3.2;
        steerY += (dy / d) * w * 3.2;
      }
    }

    /* --- alarm ---------------------------------------------------------
     * Three sources, strongest wins: what is left of your own fright, what the
     * birds beside you are doing, and the wave. Neighbour contagion is heavily
     * lossy on purpose — it smears the edges of a band so it looks like it is
     * made of birds rather than drawn on top of them, but it is deliberately
     * too weak to carry the wave itself. waves.js explains why. */
    /* Two-speed decay. The bright flash of a bank is gone in about half a
     * second, which is what makes a wave read as a band travelling rather than
     * the whole flock lighting up; but a bird that has just had a fright stays
     * watchful well below the brightness where you can see it. Without the
     * split you must choose between a visible wave and a fair one. */
    let a = myAlarm - dt * (0.42 + myAlarm * 0.95);
    const passed = heardAlarm * 0.82;
    if (passed > a) a = passed;
    if (waves) {
      const w = waves.at(px, py);
      if (w > a) a = w;
    }
    nextAlarm[i] = a < 0 ? 0 : a > 1 ? 1 : a;

    /* --- assemble the desired heading ---------------------------------- */
    let wantX = steerX * 1.0 + sepX * 1.55 + cohX * 0.085;
    let wantY = steerY * 1.0 + sepY * 1.55 + cohY * 0.085;
    if (found > 0) {
      const inv = 1 / found;
      wantX += (aliX * inv) * 1.15;
      wantY += (aliY * inv) * 1.15;
    }

    /* --- holding over the roost ----------------------------------------
     * Topological cohesion alone does not hold a flock together; left to the
     * three rules the birds spread until separation is satisfied everywhere
     * and you get a screen evenly buttered with starlings, which is not what a
     * murmuration looks like at all. The missing term is not a flocking rule,
     * it is a place: the birds are over their roost and they stay over it.
     * That is the actual reason a murmuration hangs above one reed bed for
     * half an hour instead of wandering off, so this is the physical fix and
     * not a cheat to make the picture nicer.
     *
     * Soft radius is 300 but the flock settles nearer 430 — separation pushes
     * out until the two balance, and that equilibrium is what sets the size of
     * the thing you are trying to send a wave across. */
    /* Elliptical, not round. A murmuration is wider than it is tall, and more
     * to the point a round flock small enough to fit the sky was small enough
     * for one wave to cover all of it — which quietly deleted the game, since
     * every alarm then saved everybody and where you were standing stopped
     * mattering. The flock has to be wider than the wave can reach. */
    const hx = (px - world.hoverX) / world.holdX;
    const hy = (py - world.hoverY) / world.holdY;
    const hd = Math.sqrt(hx * hx + hy * hy) || 0.0001;
    /* A spring that acts everywhere, not a fence that acts only at the rim.
     * The fence version left a permanent hole in the middle of the flock:
     * inside it nothing pulled inward and separation alone hollowed the mass
     * into a donut. Rising with distance instead gives the dense core and
     * ragged edge a murmuration actually has. */
    const k = hd;   /* already normalised: 1.0 is on the ellipse */
    /* Gentle inside, firm outside. Two failures got us here: a pull that only
     * acted past the rim left a permanent hole in the middle, because in a
     * uniform crowd every bird's separation cancels against its neighbours and
     * nothing pushes outward from the interior — only the boundary feels
     * anything. Making it a spring everywhere fixed the hole and crushed the
     * flock into a ball, for the same reason in reverse. The interior needs
     * almost nothing and the edge needs a wall. */
    const pull = k <= 1 ? k * k * 0.18 : Math.min(0.18 + (k - 1) * 1.5, 2.4);
    wantX -= (hx / hd) * pull;
    wantY -= (hy / hd) * pull;

    /* --- the box -------------------------------------------------------
     * A soft wall, not a bounce. The hold above means birds rarely reach it;
     * it is here for the seconds after a falcon scatters them. */
    const m = 70;
    if (px < m) wantX += (m - px) * 0.05;
    else if (px > world.w - m) wantX -= (px - (world.w - m)) * 0.05;
    const topM = 60;
    if (py < topM) wantY += (topM - py) * 0.06;
    /* The ground is firmer than the sky: hitting it should never be possible. */
    const floor = world.h - world.ground;
    if (py > floor - 120) wantY -= (py - (floor - 120)) * 0.12;

    /* --- roosting ------------------------------------------------------
     * At nightfall the pull to the trees overrides everything except each
     * other. They do not land one by one; they pour. */
    if (roosting > 0 && roost) {
      const dx = roost.x - px, dy = roost.y - py;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      wantX += (dx / d) * roosting * 7.0;
      wantY += (dy / d) * roosting * 7.0;
      if (d < roost.r && roosting > 0.55) {
        roosted[i] = 1;
        this.roostedCount++;
        /* Park it somewhere in the thicket rather than on the pin. The trees
         * filling up is the only score the game shows while it is running. */
        const a2 = this.rng() * TAU;
        const rr = Math.sqrt(this.rng()) * roost.r * 1.15;
        x[i] = roost.x + Math.cos(a2) * rr * 1.35;
        y[i] = roost.y + Math.sin(a2) * rr * 0.72;
        continue;
      }
    }

    /* --- turn ----------------------------------------------------------- */
    let want = Math.atan2(wantY, wantX);
    if (wantX === 0 && wantY === 0) want = pd;
    let turn = wrapAngle(want - pd);
    /* Alarm buys agility. A calm starling in a cruising flock banks lazily;
     * a frightened one can turn on a wingtip, which is why the wave both looks
     * and behaves like something travelling. */
    const maxTurn = TURN_RATE * (1 + nextAlarm[i] * 1.5) * dt;
    if (turn > maxTurn) turn = maxTurn; else if (turn < -maxTurn) turn = -maxTurn;
    const nd2 = pd + turn;
    dir[i] = nd2;

    const sp = speed[i] * (1 + nextAlarm[i] * 0.42);
    vx[i] = Math.cos(nd2) * sp;
    vy[i] = Math.sin(nd2) * sp;
    x[i] = px + vx[i] * dt;
    y[i] = py + vy[i] * dt;
  }

  /* Swap alarm buffers. */
  const tmp = this.alarm;
  this.alarm = nextAlarm;
  this._nextAlarm = tmp;
};

/* Everything still in the air goes down. Called once, when the evening ends. */
Flock.prototype.settleStragglers = function settleStragglers() {
  for (let i = 0; i < this.n; i++) {
    if (!this.alive[i] || this.roosted[i]) continue;
    this.roosted[i] = 1;
    this.roostedCount++;
  }
};
