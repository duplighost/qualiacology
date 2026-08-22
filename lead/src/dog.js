/* A dog.
 *
 * Nothing in here is keyframed. Two masses on a spring spine, four legs on
 * two-bone IK with feet that plant and swing, a neck that lags behind where
 * the dog is looking, and a tail and ears that are pure consequence. The gait
 * falls out of speed, the posture falls out of mood.
 *
 * This matters more than anything else in the game, because the game has no
 * HUD: everything the player needs to know about the dog is written on the
 * dog. Ears say afraid. Tail says happy. Stride says fast. The head says what
 * it wants. If this reads as a puppet, nothing else can save it.
 */

import { clamp, lerp, damp, mulberry } from './feel.js';

/* Phase offsets per leg (FL, FR, HL, HR), duty factor, and how much the body
 * rises and falls. Real gaits, blended by speed — the dog is never "in" one. */
const GAITS = {
  walk:  { off: [0.00, 0.50, 0.25, 0.75], duty: 0.72, lift: 0.08, reach: 0.26, bob: 0.018, pitch: 0.00 },
  trot:  { off: [0.00, 0.50, 0.50, 0.00], duty: 0.54, lift: 0.14, reach: 0.42, bob: 0.045, pitch: 0.01 },
  bound: { off: [0.06, 0.00, 0.52, 0.58], duty: 0.34, lift: 0.22, reach: 0.66, bob: 0.100, pitch: 0.10 },
};

export function ik2(ax, ay, tx, ty, l1, l2, flip = 1) {
  let dx = tx - ax, dy = ty - ay;
  let d = Math.hypot(dx, dy);
  const max = (l1 + l2) * 0.998;
  const min = Math.abs(l1 - l2) * 1.02 + 1e-4;
  if (d > max) { const k = max / d; dx *= k; dy *= k; d = max; }
  if (d < min) { const k = min / (d || 1e-6); dx *= k; dy *= k; d = min; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / d, uy = dy / d;
  const mx = ax + ux * a, my = ay + uy * a;
  return { jx: mx - uy * h * flip, jy: my + ux * h * flip, ex: ax + dx, ey: ay + dy };
}

export class Dog {
  constructor({ size = 88, coat = '#d1894a', dark = '#8e5326', pale = '#f4e0c2' } = {}) {
    this.S = size;                    // shoulder height, world units
    this.coat = coat; this.dark = dark; this.pale = pale;

    this.x = 0; this.y = 0;           // ground contact under the chest
    this.vx = 0; this.vy = 0;
    this.face = 1;
    this.ground = 0;
    this.slope = 0;
    this.airborne = false;

    this.chest = { x: 0, y: 0, vx: 0, vy: 0 };
    this.hips = { x: 0, y: 0, vx: 0, vy: 0 };
    this.spine = size * 0.55;

    this.phase = 0;
    this.gw = { walk: 1, trot: 0, bound: 0 };

    this.feet = [0, 1, 2, 3].map(() => ({
      x: 0, y: 0, planted: true, px: 0, py: 0, tx: 0, ty: 0, lift: 0
    }));

    this.look = { x: 0, y: 0 };
    this.head = { x: 0, y: 0, vx: 0, vy: 0 };
    this.neck = { x: 0, y: 0 };

    this.tail = Array.from({ length: 8 }, () => ({ x: 0, y: 0, px: 0, py: 0 }));
    this.ears = [0, 1].map(() => Array.from({ length: 4 }, () => ({ x: 0, y: 0, px: 0, py: 0 })));

    /* Mood. Every one of these is visible on the body; none is ever a number
     * on the screen. */
    this.trust = 0.55;
    this.fear = 0;
    this.interest = 0;
    this.strain = 0;
    this.pant = 0;

    /* Transient performances. */
    this.shakeT = 0;
    this.bowT = 0;
    this.sniffT = 0;
    this.lookBackT = 0;
    this.blinkT = 0;
    this.sitT = 0;

    this.onFootfall = null;
    this.rng = mulberry(0x5eed | 0);
    this._blinkNext = 2.4;
    this.t = 0;
    this._init = false;
  }

  place(x, y) {
    const S = this.S;
    this.x = x; this.y = y; this.ground = y; this.anchor = y; this.airborne = false; this.vy = 0;
    this.chest.x = x + this.face * S * 0.26; this.chest.y = y - S * 0.70;
    this.hips.x = this.chest.x - this.face * this.spine; this.hips.y = y - S * 0.68;
    this.chest.vx = this.chest.vy = this.hips.vx = this.hips.vy = 0;
    this.head.x = this.chest.x + this.face * S * 0.36; this.head.y = this.chest.y - S * 0.20;
    this.head.vx = this.head.vy = 0;
    this.look.x = this.head.x + this.face * S * 3; this.look.y = this.head.y;
    for (let i = 0; i < 4; i++) {
      const f = this.feet[i];
      f.x = f.tx = f.px = this.x + this.face * (i < 2 ? S * 0.34 : -S * 0.30);
      f.y = f.ty = f.py = y;
      f.planted = true; f.lift = 0;
    }
    for (const p of this.tail) { p.x = p.px = this.hips.x; p.y = p.py = this.hips.y; }
    for (const e of this.ears) for (const p of e) { p.x = p.px = this.head.x; p.y = p.py = this.head.y; }
    this._init = true;
  }

  speed() { return Math.abs(this.vx); }
  /* Speed in shoulder-heights per second — the only sane unit for a gait. */
  gaitSpeed() { return this.speed() / this.S; }

  shake() { this.shakeT = 0.85; }
  bow() { this.bowT = 0.9; }
  sniff(seconds = 1.2) { this.sniffT = seconds; }
  glanceBack(seconds = 0.55) { this.lookBackT = Math.max(this.lookBackT, seconds); }

  step(dt, world) {
    if (!this._init) this.place(this.x, this.y);
    /* Turning round.
     *
     * The body is a rod between two sprung masses, and the springs are the
     * only thing that moved it. So a change of facing was solved by swinging
     * that rod through vertical: about nine frames of the dog reared up on end
     * with its legs out sideways and its head crushed into its chest, reading
     * as a startled rabbit. Worse, a dog asked to turn while standing still
     * has no lever to swing with and deadlocks at the top.
     *
     * A dog does not rotate through vertical. Mirror the whole rig in one
     * frame instead: the rest of the body already lives in body-local space,
     * so this is a sign change. */
    if (this._lastFace === undefined) this._lastFace = this.face;
    if (this.face !== this._lastFace) { this._mirror(); this._lastFace = this.face; }
    this.t += dt;
    const S = this.S;
    const groundAt = world && world.groundAt ? world.groundAt : null;
    const slopeAt = world && world.slopeAt ? world.slopeAt : null;

    this.ground = groundAt ? groundAt(this.x) : this.ground;
    /* The rig hangs off whatever the body is actually standing on — and when
     * it is standing on nothing, off the body itself. Anchoring to the ground
     * while airborne means a dog over a chasm wears its own head at the bottom
     * of it, and anything attached to the dog gets dragged down there too. */
    this.anchor = this.airborne ? this.y : this.ground;
    this.slope = damp(this.slope, slopeAt ? slopeAt(this.x) : 0, 0.0005, dt);

    /* Gait weights by speed. */
    const gs = this.gaitSpeed();
    const w = { walk: 0, trot: 0, bound: 0 };
    if (gs < 1.9) w.walk = 1;
    else if (gs < 4.6) { const t = clamp((gs - 1.9) / 2.7, 0, 1); w.walk = 1 - t; w.trot = t; }
    else { const t = clamp((gs - 4.6) / 3.4, 0, 1); w.trot = 1 - t; w.bound = t; }
    const k = 1 - Math.pow(0.0004, dt);
    for (const g in w) this.gw[g] = lerp(this.gw[g], w[g], k);

    /* Stride comes out of how far a leg can actually reach, not the other way
     * round. Pick a stride longer than the legs and every foot target lands
     * outside the IK's range, the solver clamps it, and the dog runs on four
     * horizontal sticks. Reach grows with speed because a galloping dog does
     * extend — that extension is the gallop. */
    this.legMax = S * (0.28 + 0.17 * clamp(this.gaitSpeed() / 9, 0, 1));
    const strideLen = 2 * this.legMax / Math.max(0.2, this._b('duty'));
    const freq = this.speed() > 0.2 ? clamp(this.speed() / strideLen, 0.2, 4.6) : 0;
    this.phase = (this.phase + freq * dt) % 1;
    this.strideLen = strideLen;

    /* Transients. */
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.bowT = Math.max(0, this.bowT - dt);
    this.sniffT = Math.max(0, this.sniffT - dt);
    this.lookBackT = Math.max(0, this.lookBackT - dt);
    this.sitT = clamp(this.sitT, 0, 1);
    this.blinkT = Math.max(0, this.blinkT - dt);
    this._blinkNext -= dt;
    if (this._blinkNext <= 0) { this.blinkT = 0.10; this._blinkNext = 1.8 + this.rng() * 3.4; }
    this.pant = damp(this.pant, clamp(this.gaitSpeed() / 5.5, 0, 1), 0.05, dt);

    this._spine(dt);
    this._legs(dt, strideLen, groundAt);
    this._headStep(dt);
    this._tailStep(dt);
    this._earStep(dt);
  }

  _b(field, idx) {
    let v = 0;
    for (const g in this.gw) v += this.gw[g] * (idx == null ? GAITS[g][field] : GAITS[g][field][idx]);
    return v;
  }

  _spine(dt) {
    const S = this.S;
    const ph = this.phase * Math.PI * 2;
    /* Bound bobs at stride rate; trot bobs at twice it. That difference is
     * most of why a trot looks brisk and a gallop looks heavy. */
    const bob = (Math.sin(ph * 2) * this.gw.trot * 0.9 + Math.sin(ph) * this.gw.bound) * this._b('bob') * S;
    const pitch = Math.sin(ph - 0.6) * this._b('pitch') * S;
    /* Suspension: when every foot is off the ground the whole dog is, and
     * lifting the body there is most of what makes a gallop read as flight. */
    const off = this.feet.reduce((n, f) => n + (f.planted ? 0 : 1), 0);
    this.suspend = damp(this.suspend || 0, off === 4 ? 1 : 0, 0.00002, dt);
    const fly = this.suspend * this._b('lift') * S * 0.55;

    const sit = this.sitT;
    const crouch = this.fear * 0.13 + this.bowT / 0.9 * 0.02;
    const lean = clamp(this.vx / (this.S * 11), -0.22, 0.22) * this.face;

    /* On a slope the body stays level with the hill, not the horizon. */
    const sl = this.slope;
    const tilt = Math.tan(sl) * this.face * this.spine * 0.5;

    /* Springs run in BODY-LOCAL space. Springing to a world target means a
     * dog at 10 m/s wears its own head ninety pixels behind its shoulders. */
    const cX = this.face * (S * 0.26 + lean * S * 0.5);
    const cY = -tilt - S * (0.70 - crouch - sit * 0.06) + bob + pitch - fly;
    const hX = -this.face * (this.spine - S * 0.26);
    const hY = tilt - S * (0.68 - crouch * 0.5 - sit * 0.30) + bob * 0.55 - pitch - fly * 0.9;

    this._local(this.chest, cX, cY, 220, 24, dt);
    this._local(this.hips, hX, hY, 175, 22, dt);

    /* Hold the spine length so the body cannot pull itself apart. Corrections
     * are applied in local space and mirrored out, or the next frame's spring
     * would undo them. */
    const dx = this.chest.lx - this.hips.lx, dy = this.chest.ly - this.hips.ly;
    const d = Math.hypot(dx, dy) || 1e-6;
    const c = (d - this.spine) / d * 0.5;
    this.chest.lx -= dx * c; this.chest.ly -= dy * c;
    this.hips.lx += dx * c; this.hips.ly += dy * c;
    const A = this.anchor == null ? this.ground : this.anchor;
    this.chest.x = this.x + this.chest.lx; this.chest.y = A + this.chest.ly;
    this.hips.x = this.x + this.hips.lx; this.hips.y = A + this.hips.ly;
  }

  _legs(dt, strideLen, groundAt) {
    const S = this.S;
    const duty = this._b('duty');
    const lift = this._b('lift') * S;
    /* A shake rattles the whole frame; cheap and unmistakable. */
    const sh = this.shakeT > 0 ? Math.sin(this.shakeT * 46) * S * 0.05 * (this.shakeT / 0.85) : 0;

    for (let i = 0; i < 4; i++) {
      const f = this.feet[i];
      const front = i < 2;
      const anchor = front ? this.chest : this.hips;
      const side = (i % 2) ? 1 : -1;
      const baseX = anchor.x + this.face * S * (front ? 0.10 : -0.06) + side * S * 0.02;

      if (this.airborne) {
        const tuckUp = this.vy < 0 ? 0.62 : 0.22;
        f.x = damp(f.x, baseX + this.face * S * (this.vy < 0 ? -0.14 : 0.26), 0.0006, dt);
        f.y = damp(f.y, anchor.y + S * (0.58 - tuckUp * 0.30), 0.0006, dt);
        f.planted = false; f.lift = 0;
        continue;
      }

      if (this.sitT > 0.5 && !front) {
        /* Sitting: the hind feet tuck under the rump and stay there. */
        f.x = damp(f.x, this.hips.x + this.face * S * 0.10, 0.0004, dt);
        f.y = damp(f.y, (groundAt ? groundAt(f.x) : this.ground), 0.0004, dt);
        f.planted = true; f.lift = 0;
        continue;
      }

      const p = (this.phase + this._b('off', i)) % 1;
      const stance = p < duty || strideLen <= 0 || this.speed() < 0.25;

      if (stance) {
        if (!f.planted) {
          f.planted = true;
          f.x = f.tx;
          f.y = groundAt ? groundAt(f.x) : this.ground;
          if (this.onFootfall) this.onFootfall(i, f.x, f.y, this.speed());
        }
        f.y = (groundAt ? groundAt(f.x) : this.ground) + sh * (i % 2 ? 1 : -1) * 0.3;
        f.lift = damp(f.lift, 0, 0.0001, dt);
        /* Standing still, feet drift back under the body instead of leaving
         * the dog doing the splits. */
        if (this.speed() < 0.25) {
          /* Standing, the feet gather back under the body instead of leaving
           * the dog braced in a permanent stretch. */
          const gather = front ? -this.face * S * 0.07 : this.face * S * 0.09;
          f.x = damp(f.x, baseX + gather, 0.02, dt);
          f.y = groundAt ? groundAt(f.x) : this.ground;
        }
      } else {
        const sw = (p - duty) / (1 - duty);
        if (f.planted) {
          f.planted = false;
          f.px = f.x; f.py = f.y;
          const reach = this.legMax;
          f.tx = clamp(baseX + this.face * strideLen * 0.50 + this.vx * 0.045,
            baseX - reach, baseX + reach);
          f.ty = groundAt ? groundAt(f.tx) : this.ground;
        }
        const e = sw * sw * (3 - 2 * sw);
        f.x = lerp(f.px, f.tx, e);
        f.lift = Math.sin(sw * Math.PI) * lift;
        f.y = lerp(f.py, f.ty, e) - f.lift;
      }
    }
  }

  /* Spring a body part toward an offset from (this.x, this.ground), keeping
   * its state in local coordinates so translation costs nothing. */
  /* Reflect every part of the animal about its own centre line. */
  _mirror() {
    const X = this.x;
    const flip = (p) => { p.x = X - (p.x - X); };
    for (const b of [this.chest, this.hips]) {
      if (b.lx !== undefined) { b.lx = -b.lx; b.vx = -b.vx; }
      flip(b);
    }
    this.head.x = X - (this.head.x - X); this.head.vx = -this.head.vx;
    flip(this.neck);
    for (const p of this.tail) { flip(p); p.px = X - (p.px - X); }
    for (const e of this.ears) for (const p of e) { flip(p); p.px = X - (p.px - X); }
    for (const f of this.feet) {
      flip(f); f.px = X - (f.px - X); f.tx = X - (f.tx - X);
    }
  }

  _local(b, ox, oy, k, damping, dt) {
    const A = this.anchor == null ? this.ground : this.anchor;
    if (b.lx === undefined) { b.lx = b.x - this.x; b.ly = b.y - A; b.vx = 0; b.vy = 0; }
    b.vx += ((ox - b.lx) * k - b.vx * damping) * dt;
    b.vy += ((oy - b.ly) * k - b.vy * damping) * dt;
    b.lx += b.vx * dt; b.ly += b.vy * dt;
    b.x = this.x + b.lx; b.y = A + b.ly;
  }

  _headStep(dt) {
    const S = this.S;
    /* The neck leaves the withers and runs forward and down. A neck that goes
     * up makes a horse. */
    const nx = this.chest.x + this.face * S * 0.19;
    const ny = this.chest.y - S * 0.19;
    this.neck.x = nx; this.neck.y = ny;

    /* Head carriage: up and back when alert, dropped when afraid, on the
     * floor when sniffing. Carriage alone reads at a glance. */
    const alert = clamp(this.interest * 0.8 + this.trust * 0.35, 0, 1);
    const fearDrop = this.fear * S * 0.34;
    const sniffDrop = (this.sniffT > 0 ? 1 : 0) * S * 0.40;
    let restX = nx + this.face * S * (0.38 - this.fear * 0.06 - alert * 0.03);
    let restY = ny - S * (0.13 + alert * 0.08) + fearDrop + sniffDrop - this.sitT * S * 0.05;

    if (this.lookBackT > 0) {
      /* Turning to check on you: the head swings back over the shoulder. */
      const a = Math.sin(clamp(this.lookBackT / 0.55, 0, 1) * Math.PI);
      restX = lerp(restX, nx - this.face * S * 0.16, a * 0.9);
      restY = lerp(restY, ny - S * 0.06, a * 0.9);
    } else {
      let ax = this.look.x - restX, ay = this.look.y - restY;
      const al = Math.hypot(ax, ay) || 1;
      /* Aim only partway: a dog turns its head, it does not point its whole
       * neck at things. The lag is what makes attention readable. */
      const pull = Math.min(1, al / (S * 4)) * S * 0.19;
      restX += (ax / al) * pull; restY += (ay / al) * pull;
    }

    if (this.shakeT > 0) {
      const a = this.shakeT / 0.85;
      restY += Math.sin(this.shakeT * 52) * S * 0.05 * a;
      restX += Math.cos(this.shakeT * 44) * S * 0.03 * a;
    }

    const A = this.anchor == null ? this.ground : this.anchor;
    this._local(this.head, restX - this.x, restY - A, 250, 25, dt);
  }

  _tailStep(dt) {
    const S = this.S;
    /* Height is trust, motion is excitement, tucked under is fear. */
    const up = lerp(0.30, -0.75, clamp(this.trust, 0, 1)) + this.fear * 1.5;
    const wagRate = 6 + this.interest * 16 + this.trust * 5;
    const wagAmp = (0.06 + this.interest * 0.30 + this.trust * 0.10) * (1 - this.fear);
    const wag = Math.sin(this.t * wagRate) * wagAmp;

    const rx = this.hips.x - this.face * S * 0.20;
    const ry = this.hips.y - S * 0.13;
    this.tail[0].x = rx; this.tail[0].y = ry;

    /* Segment 1 is driven so the tail always leaves the rump at the angle the
     * mood asks for; everything after it is free and lags. */
    let dirX = -this.face * (0.85 - this.fear * 0.45);
    let dirY = up + wag * 0.7;
    const dl = Math.hypot(dirX, dirY) || 1; dirX /= dl; dirY /= dl;
    const t1 = this.tail[1];
    t1.px = t1.x; t1.py = t1.y;
    t1.x = rx + dirX * S * 0.11; t1.y = ry + dirY * S * 0.11;

    for (let i = 2; i < this.tail.length; i++) {
      const p = this.tail[i], q = this.tail[i - 1];
      const vx = (p.x - p.px) * 0.86, vy = (p.y - p.py) * 0.86;
      p.px = p.x; p.py = p.y;
      /* The bias dies off fast along the length, so the root points where the
       * mood asks and the rest droops into a curve instead of a stick. */
      const fall = Math.pow(1 - (i - 2) / (this.tail.length - 2), 2.2);
      p.x += vx + dirX * S * dt * 5.5 * fall - this.vx * dt * 0.26;
      p.y += vy + dirY * S * dt * 5.5 * fall + S * 5.5 * dt * dt * 60
           + wag * S * dt * 9 * (i / this.tail.length);
      let dx = p.x - q.x, dy = p.y - q.y;
      const d = Math.hypot(dx, dy) || 1e-6;
      const rest = S * 0.085;
      const f = (d - rest) / d;
      p.x -= dx * f; p.y -= dy * f;
    }
  }

  _earStep(dt) {
    const S = this.S;
    const flat = clamp(this.fear * 1.15 + this.strain * 0.95, 0, 1);
    const prick = clamp(0.30 + this.interest * 1.1, 0, 1) * (1 - flat);
    const ha = Math.atan2(this.head.y - this.neck.y, this.head.x - this.neck.x);
    const cos = Math.cos(ha), sin = Math.sin(ha);
    for (let e = 0; e < 2; e++) {
      const chain = this.ears[e];
      const lx = -S * 0.055, ly = -S * (0.085 + e * 0.020);
      chain[0].x = this.head.x + lx * cos - ly * sin;
      chain[0].y = this.head.y + lx * sin + ly * cos;
      /* Pricked: forward and up. Flat: back and down against the skull. */
      const dirX = this.face * lerp(-0.70, 0.30, prick);
      const dirY = lerp(0.70, -0.80, prick);
      for (let i = 1; i < chain.length; i++) {
        const p = chain[i], q = chain[i - 1];
        const vx = (p.x - p.px) * 0.74, vy = (p.y - p.py) * 0.74;
        p.px = p.x; p.py = p.y;
        const bias = 1 - (i - 1) / chain.length * 0.4;
        p.x += vx + dirX * S * dt * 9 * bias - this.vx * dt * 0.22;
        p.y += vy + dirY * S * dt * 9 * bias + S * 2.4 * dt * dt * 60;
        let dx = p.x - q.x, dy = p.y - q.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const rest = S * 0.062;
        const f = (d - rest) / d;
        p.x -= dx * f; p.y -= dy * f;
      }
    }
  }

  /* Where the leash clips on. */
  collarPoint() {
    const S = this.S;
    const t = 0.46;
    return {
      x: lerp(this.neck.x, this.head.x, t),
      y: lerp(this.neck.y, this.head.y, t) + S * 0.07
    };
  }

  /* --- draw ------------------------------------------------------------ */

  draw(ctx, { light = -1 } = {}) {
    const S = this.S;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const far = sh(this.coat, -0.30);

    for (const i of [1, 3]) this._leg(ctx, i, far, S);
    this._drawTail(ctx, far, S);
    this._torso(ctx, S);
    for (const i of [0, 2]) this._leg(ctx, i, this.coat, S);

    const ha = Math.atan2(this.head.y - this.neck.y, this.head.x - this.neck.x);

    /* Neck: two tapered strokes that overlap the torso so nothing detaches. */
    ctx.strokeStyle = this.coat;
    ctx.lineWidth = S * 0.245;
    ctx.beginPath();
    ctx.moveTo(this.neck.x - this.face * S * 0.06, this.neck.y + S * 0.04);
    ctx.lineTo(lerp(this.neck.x, this.head.x, 0.62), lerp(this.neck.y, this.head.y, 0.62));
    ctx.stroke();
    ctx.lineWidth = S * 0.175;
    ctx.beginPath();
    ctx.moveTo(lerp(this.neck.x, this.head.x, 0.5), lerp(this.neck.y, this.head.y, 0.5));
    ctx.lineTo(this.head.x, this.head.y);
    ctx.stroke();

    this._collar(ctx, ha, S);
    this._drawEars(ctx, far, S);
    this._head(ctx, ha, S);

    if (light !== 0) this._rim(ctx, S, light);
  }

  _torso(ctx, S) {
    const c = this.chest, h = this.hips;
    const ax = c.x - h.x, ay = c.y - h.y;
    const L = Math.hypot(ax, ay) || 1;
    const ux = ax / L, uy = ay / L, nx = -uy, ny = ux;
    const P = (p, o) => ({ x: h.x + ux * L * p + nx * S * o, y: h.y + uy * L * p + ny * S * o });

    /* Withers high, a dip behind them, a rounded rump, and a belly that tucks
     * up behind the ribs. That tuck is most of what says "dog". */
    const brisket = P(1.16, 0.15);
    const withers = P(0.98, -0.25);
    const dip = P(0.66, -0.235);
    const rump = P(0.10, -0.28);
    const rear = P(-0.26, -0.02);
    const tuck = P(0.44, 0.155);
    const ribs = P(0.86, 0.255);

    ctx.fillStyle = this.coat;
    ctx.beginPath();
    ctx.moveTo(brisket.x, brisket.y);
    ctx.quadraticCurveTo(P(1.24, -0.06).x, P(1.24, -0.06).y, withers.x, withers.y);
    ctx.quadraticCurveTo(dip.x, dip.y, rump.x, rump.y);
    ctx.quadraticCurveTo(P(-0.20, -0.30).x, P(-0.20, -0.30).y, rear.x, rear.y);
    ctx.quadraticCurveTo(P(-0.10, 0.14).x, P(-0.10, 0.14).y, tuck.x, tuck.y);
    ctx.quadraticCurveTo(ribs.x, ribs.y, brisket.x, brisket.y);
    ctx.fill();

    /* Haunch mass over the back leg — the thing that sells a dog running. */
    const hq = P(0.06, -0.03);
    ctx.fillStyle = sh(this.coat, -0.06);
    ctx.beginPath();
    ctx.ellipse(hq.x, hq.y, S * 0.225, S * 0.245, Math.atan2(uy, ux), 0, 6.2832);
    ctx.fill();
    /* Shoulder mass at the front, same job. */
    const sq = P(0.96, 0.02);
    ctx.beginPath();
    ctx.ellipse(sq.x, sq.y, S * 0.175, S * 0.215, Math.atan2(uy, ux), 0, 6.2832);
    ctx.fill();

    /* Pale underside: the body gets a top and a bottom in value alone. */
    ctx.save();
    ctx.globalAlpha *= 0.6;
    ctx.fillStyle = this.pale;
    ctx.beginPath();
    ctx.moveTo(brisket.x, brisket.y);
    ctx.quadraticCurveTo(ribs.x, ribs.y, tuck.x, tuck.y);
    ctx.quadraticCurveTo(P(0.66, 0.09).x, P(0.66, 0.09).y, brisket.x, brisket.y);
    ctx.fill();
    ctx.restore();
  }

  _leg(ctx, i, color, S) {
    const f = this.feet[i];
    const front = i < 2;
    const anchor = front ? this.chest : this.hips;
    const side = (i % 2) ? 1 : -1;
    const jx = anchor.x + this.face * S * (front ? 0.10 : -0.05) + side * S * 0.018;
    const jy = anchor.y + S * (front ? 0.10 : 0.09);
    const upper = S * 0.375, lower = S * 0.405;
    /* Front knees fold backward, hind hocks fold forward. Get this wrong and
     * you have drawn a table. */
    const flip = (front ? 1 : -1) * this.face;
    const k = ik2(jx, jy, f.x, f.y - S * 0.035, upper, lower, flip);

    ctx.strokeStyle = color;
    ctx.lineWidth = S * 0.115;
    ctx.beginPath(); ctx.moveTo(jx, jy); ctx.lineTo(k.jx, k.jy); ctx.stroke();
    ctx.lineWidth = S * 0.078;
    ctx.beginPath(); ctx.moveTo(k.jx, k.jy); ctx.lineTo(k.ex, k.ey); ctx.stroke();
    ctx.fillStyle = sh(color, -0.12);
    ctx.beginPath();
    ctx.ellipse(k.ex + this.face * S * 0.022, k.ey + S * 0.022, S * 0.058, S * 0.036, 0, 0, 6.2832);
    ctx.fill();
  }

  _drawTail(ctx, color, S) {
    ctx.strokeStyle = color;
    for (let i = 1; i < this.tail.length; i++) {
      const t = 1 - i / this.tail.length;
      ctx.lineWidth = S * (0.028 + 0.085 * t * t);
      ctx.beginPath();
      ctx.moveTo(this.tail[i - 1].x, this.tail[i - 1].y);
      ctx.lineTo(this.tail[i].x, this.tail[i].y);
      ctx.stroke();
    }
    /* A pale tip, so the tail is legible against a dark ground. */
    const a = this.tail[this.tail.length - 2], b = this.tail[this.tail.length - 1];
    ctx.strokeStyle = sh(this.pale, -0.05);
    ctx.lineWidth = S * 0.035;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  _drawEars(ctx, color, S) {
    for (const chain of this.ears) {
      ctx.strokeStyle = color;
      for (let i = 1; i < chain.length; i++) {
        const t = 1 - i / chain.length;
        ctx.lineWidth = S * (0.030 + 0.085 * t);
        ctx.beginPath();
        ctx.moveTo(chain[i - 1].x, chain[i - 1].y);
        ctx.lineTo(chain[i].x, chain[i].y);
        ctx.stroke();
      }
    }
  }

  _collar(ctx, ha, S) {
    const c = this.collarPoint();
    ctx.save();
    ctx.translate(c.x, c.y - S * 0.07);
    ctx.rotate(ha);
    ctx.fillStyle = sh('#93332f', this.strain * 0.5);
    const w = S * 0.052, h = S * 0.108 * (1 - this.strain * 0.13);
    ctx.fillRect(-w / 2, -h, w, h * 2);
    ctx.fillStyle = '#e2c479';
    ctx.beginPath(); ctx.arc(0, h * 0.82, S * 0.026, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  _head(ctx, ha, S) {
    ctx.save();
    ctx.translate(this.head.x, this.head.y);
    ctx.rotate(ha);
    ctx.scale(1, this.face);

    const open = this.pant * S * 0.028;
    ctx.fillStyle = this.coat;
    ctx.beginPath(); ctx.ellipse(0, 0, S * 0.135, S * 0.125, 0, 0, 6.2832); ctx.fill();
    /* Muzzle. */
    ctx.fillStyle = sh(this.coat, 0.14);
    ctx.beginPath();
    ctx.ellipse(S * 0.145, S * 0.028 + open * 0.5, S * 0.098, S * 0.058 + open, 0, 0, 6.2832);
    ctx.fill();
    /* Tongue, when panting hard. */
    if (open > S * 0.012) {
      ctx.fillStyle = '#d9686f';
      ctx.beginPath();
      ctx.ellipse(S * 0.175, S * 0.085 + open, S * 0.030, S * 0.048, 0.3, 0, 6.2832);
      ctx.fill();
    }
    ctx.fillStyle = '#2b2126';
    ctx.beginPath(); ctx.ellipse(S * 0.230, S * 0.012, S * 0.036, S * 0.030, 0, 0, 6.2832); ctx.fill();

    /* Eye. A value dot with a highlight — no hue carries any read. */
    const eo = this.blinkT > 0 ? 0.18 : 1;
    ctx.fillStyle = '#241a1e';
    ctx.beginPath();
    ctx.ellipse(S * 0.050, -S * 0.030, S * 0.029, S * 0.029 * eo, 0, 0, 6.2832); ctx.fill();
    if (eo > 0.5) {
      ctx.fillStyle = 'rgba(255,252,244,0.92)';
      ctx.beginPath(); ctx.arc(S * 0.062, -S * 0.040, S * 0.0105, 0, 6.2832); ctx.fill();
    }
    /* Brow. Lowers with fear; the cheapest emotion in animation. */
    const f = this.fear;
    if (f > 0.04) {
      ctx.strokeStyle = sh(this.coat, -0.42);
      ctx.lineWidth = S * 0.019;
      ctx.beginPath();
      ctx.moveTo(S * 0.018, -S * (0.068 - f * 0.020));
      ctx.lineTo(S * 0.092, -S * (0.052 + f * 0.008));
      ctx.stroke();
    }
    ctx.restore();
  }

  /* A warm rim along the sunward edge of the back. It follows the same curve
   * as the torso's top edge and sits just inside it, so it reads as light
   * catching the coat rather than as a stick laid across the dog. */
  _rim(ctx, S, dir) {
    const c = this.chest, h = this.hips;
    /* The sun sits at 0.86 of the screen width for the whole route, so the lit
     * edge is whichever end of the animal is further toward screen-right. The
     * caller hard-codes -1, which anchored the one warm light in the world to
     * the dog's rump and left the shoulder flat however the dog was facing. */
    dir = (c.x - h.x) >= 0 ? 1 : -1;
    const ax = c.x - h.x, ay = c.y - h.y;
    const L = Math.hypot(ax, ay) || 1;
    const ux = ax / L, uy = ay / L, nx = -uy, ny = ux;
    const P = (p, o) => ({ x: h.x + ux * L * p + nx * S * o, y: h.y + uy * L * p + ny * S * o });
    const a = P(0.06, -0.245), b = P(0.66, -0.205), d = P(0.96, -0.215);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const g = ctx.createLinearGradient(a.x, a.y, d.x, d.y);
    const warm = 'rgba(255,206,138,';
    g.addColorStop(0, warm + (dir < 0 ? 0.30 : 0.02) + ')');
    g.addColorStop(0.5, warm + '0.16)');
    g.addColorStop(1, warm + (dir < 0 ? 0.02 : 0.30) + ')');
    ctx.strokeStyle = g;
    ctx.lineWidth = S * 0.028;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(b.x, b.y, d.x, d.y);
    ctx.stroke();
    ctx.restore();
  }

  /* Soft contact shadows, drawn under everything by the renderer. */
  shadows() {
    const out = [];
    const S = this.S;
    for (const f of this.feet) {
      const d = clamp(1 - f.lift / (S * 0.30), 0.15, 1);
      out.push({ x: f.x, y: f.y + S * 0.02, r: S * 0.14 * d, a: 0.32 * d });
    }
    out.push({ x: (this.chest.x + this.hips.x) / 2, y: this.ground + S * 0.01, r: S * 0.42, a: 0.20 });
    return out;
  }
}

function sh(hex, amt) {
  if (hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
