/* The leash.
 *
 * One rope between two bodies. It pulls and never pushes, and its length is
 * the only thing the player controls directly. That is the whole game: a rope
 * shortened to a metre physically cannot let the dog get more than a metre
 * ahead of you, so holding on caps the dog to your own speed as a matter of
 * arithmetic. Nothing here scales the dog down; geometry does it.
 *
 * Solved as a positional constraint with the correction split by inverse
 * mass, so a 32 kg kid absorbs 54% of every arrest and genuinely gets dragged
 * around by a 38 kg dog. The drawn rope is a separate verlet chain that only
 * has to look right. */

import { C, PX } from './config.js';
import { clamp, damp } from './feel.js';

export class Leash {
  constructor(kid, dog, ground) {
    this.ground = ground;
    this.kid = kid; this.dog = dog;
    this.L = C.leash.longRest;         // current rest length, metres
    this.grip = false;
    this.gripT = 0;                    // seconds the hand has been closed
    this.openT = 99;                   // seconds since it opened
    this.excess = 0;                   // metres past rest, before correction
    this.strain = 0;                   // 0..1 smoothed readout
    this.bite = 0;                     // one-frame spike when it arrests hard
    this.towing = 0;                   // 0..1: how much the rope is carrying you
    this.chokeT = 0;
    this.onBite = null;
    this.onChoke = null;
    this.onTug = null;

    const n = C.leash.segments;
    this.pts = Array.from({ length: n }, () => ({ x: 0, y: 0, px: 0, py: 0 }));
    this._seeded = false;
  }

  /* Metres of rope left before it bites. Zero means it is already tight. */
  slack() { return Math.max(0, this.L - this.dist()); }
  dist() { return Math.hypot(this.dog.x - this.kid.handX(), this.dogY() - this.kidY()) / PX; }
  kidY() { return this.kid.handY(); }
  dogY() { const c = this.dog.collarPoint(); return c.y; }

  setGrip(on) {
    if (on === this.grip) return;
    this.grip = on;
    if (on) { this.gripT = 0; }
    else {
      this.openT = 0;
      /* Late-release forgiveness, and it belongs at exactly one place: you
       * jumped and opened your hand a moment too late. Everything else in this
       * game has coyote time and a jump buffer; the input the whole design
       * turns on should not be the one thing with no give in it. */
      const kid = this.kid;
      const air = !kid.onGround && kid.jumpedAt != null &&
        (kid.t - kid.jumpedAt) <= C.leash.gripGrace;
      if (air) this.L = C.leash.longRest;
    }
    if (this.onGrip) this.onGrip(on, this.gripT);
  }

  step(dt) {
    const L = C.leash;
    if (this.grip) { this.gripT += dt; this.openT = 0; }
    else { this.openT += dt; }

    const target = this.grip ? L.shortRest : L.longRest;
    const rate = this.grip ? L.shortenRate : L.lengthenRate;
    if (this.L < target) this.L = Math.min(target, this.L + rate * dt);
    else this.L = Math.max(target, this.L - rate * dt);

    /* Substepped solve: two passes at the physics rate is enough because the
     * constraint is one distance and the masses are similar. */
    this.wasTaut = this.dist() >= this.L - 0.42;
    const sub = L.substeps, h = dt / sub;
    let peak = 0, correctionSum = 0;
    for (let s = 0; s < sub; s++) {
      const r = this._solve(h);
      peak = Math.max(peak, r.excess);
      correctionSum += r.moved;
    }

    this.excess = peak;
    /* How tight the rope is.
     *
     * Stretch alone is a bad measure: a gripped leash is nearly rigid, so it
     * barely stretches however hard the dog hauls on it. What the rope is
     * actually carrying is the difference between where the dog is trying to
     * go and where it is being allowed to go — which is the force in the rope,
     * and also exactly the thing the ears and the collar should be reporting. */
    this.taut = this.dist() >= this.L - 0.42;
    const denied = this.taut
      ? clamp(Math.abs((this.dog.want || 0) - this.dog.vx) / (3.6 * PX), 0, 1) : 0;
    /* And the same measurement pointed the other way.
     *
     * A rope has two ends and the readout above only watched one of them. When
     * the dog plants itself and the rope stops YOU dead — which is the last
     * beat of the game — the dog wants nothing, so denial is zero, and a rigid
     * rope does not stretch, so excess is zero, and the rope drew itself slack
     * at the exact moment it was carrying everything. */
    const arrested = this.taut
      ? clamp(Math.abs((this.kid.want || 0) - this.kid.vx) / (3.6 * PX), 0, 1) : 0;
    const raw = Math.max(clamp(peak / 0.25, 0, 1), denied, arrested);
    const rising = raw > this.strain;
    this.strain = damp(this.strain, raw, rising ? 0.0008 : 0.02, dt);

    /* Towing: the rope is carrying you when its correction is what is moving
     * you forward. This is the free-ride readout. */
    const towRaw = clamp((correctionSum / dt) / (4 * PX), 0, 1);
    this.towing = damp(this.towing, towRaw, 0.02, dt);

    /* Choke: a dog that wants to be somewhere and is not getting there,
     * because your hand is shut. The price of gripping, made audible and
     * visible long before the player is ever told there is a price. */
    const want = Math.abs(this.dog.want || 0);
    const got = Math.abs(this.dog.vx);
    const stalled = this.grip && this.strain > 0.30 && want > 3 * PX && got < want * 0.55;
    this.chokeT = stalled ? this.chokeT + dt : 0;
    if (this.chokeT > L.chokeAfter) {
      this.chokeT = 0;
      if (this.onChoke) this.onChoke();
    }

    this._visual(dt);
  }

  _solve(h) {
    const L = C.leash;
    const kid = this.kid, dog = this.dog;
    const ax = kid.handX(), ay = this.kidY();
    const bx = dog.x, by = this.dogY();
    let dx = bx - ax, dy = by - ay;
    const dpx = Math.hypot(dx, dy) || 1e-6;
    const d = dpx / PX;
    const excess = d - this.L;
    if (excess <= 0) return { excess: 0, moved: 0 };

    const nx = dx / dpx, ny = dy / dpx;
    /* Traction. Whoever has feet on the ground is anchored to a planet and
     * whoever does not is a body on a string, so the one in the air goes
     * where the one on the ground says. This is why the dog can throw you
     * across a gap and why you can stop it dead while you are standing. */
    const TRACTION = 7.2;
    const kidM = C.kid.mass * (kid.onGround && dog.airborne ? TRACTION : 1);
    /* A dog that has sat down has decided something, and forty kilos of
     * decided dog does not get walked any further. */
    const dogM = C.dog.mass * (dog.planted ? 40 : (dog.airborne || kid.onGround ? 1 : TRACTION));
    const w1 = 1 / kidM, w2 = 1 / dogM;
    const wsum = w1 + w2;
    const compliance = this.grip ? L.complianceShut : L.complianceOpen;
    /* XPBD: soft on first contact, firm once it has taken up. Softness is
     * what makes a bite feel like a rope instead of a wall. */
    const alpha = compliance / (h * h);
    const stiff = 1 / (1 + alpha / wsum);
    const fix = Math.min(excess * stiff, L.maxCorrection);

    const k1 = fix * (w1 / wsum) * PX;
    const k2 = fix * (w2 / wsum) * PX;

    kid.x += nx * k1; kid.y += ny * k1;
    dog.x -= nx * k2; dog.y -= ny * k2;

    /* Velocity along the rope. Not an added impulse — a shared one: whatever
     * relative speed is pulling the two apart gets split by mass and cancelled,
     * which is precisely what a rope does and precisely what a tow feels like.
     * Adding corrections instead accumulates and the rope explodes. */
    const rel = (dog.vx - kid.vx) * nx + (dog.vy - kid.vy) * ny;
    if (rel > 0) {
      const j = (rel / wsum) * stiff;
      kid.vx += nx * j * w1; kid.vy += ny * j * w1;
      dog.vx -= nx * j * w2; dog.vy -= ny * j * w2;
    }

    /* The rule the whole game turns on.
     *
     * On the ground you are limited by your own legs: a dog can tow a kid a
     * little faster than they can run and no faster, because past that the
     * kid simply falls over. In the air there is no such limit — nothing is
     * holding you back but the rope, and the rope is not holding you back.
     *
     * So a held leash cannot get you across a gap, and a loose one can. The
     * theme is not a coefficient anywhere; it is this clamp and the fact that
     * it stops applying the moment your feet leave the ground. */
    if (kid.onGround) {
      const cap2 = kid.groundCap || (C.kid.topSpeed * PX);
      if (Math.abs(kid.vx) > cap2) {
        const over = Math.abs(kid.vx) - cap2;
        kid.vx -= Math.sign(kid.vx) * over;
        kid.skidDrag = Math.max(kid.skidDrag || 0, clamp(over / (3 * PX), 0, 1));
        /* The dog feels the anchor: this is what makes it visibly strain. */
        dog.vx -= Math.sign(dog.vx) * Math.min(Math.abs(dog.vx), over * 0.22);
      }
    }

    const cap = L.velClamp * PX;
    kid.vx = clamp(kid.vx, -cap, cap); kid.vy = clamp(kid.vy, -cap, cap);
    dog.vx = clamp(dog.vx, -cap, cap); dog.vy = clamp(dog.vy, -cap, cap);

    /* A hard arrest is an event, not a gradient. What makes it an event is the
     * rope going from slack to tight while the two of you are still moving
     * apart — the yank, not the stretch. A stiff rope barely stretches at all,
     * so measuring stretch means the yank never fires and the player never
     * learns that the rope stops them. */
    this.biteLock = Math.max(0, (this.biteLock || 0) - h);
    if (rel > 2.4 * PX && this.biteLock <= 0) {
      this.biteLock = 0.42;
      this.bite = clamp(rel / (7 * PX), 0.28, 1);
      if (this.onBite) this.onBite(this.bite, nx, ny);
    }
    return { excess, moved: k1 };
  }

  /* The drawn rope. Purely cosmetic — it never touches the constraint, which
   * is why it can sag and whip without ever destabilising anything. */
  _visual(dt) {
    const a = { x: this.kid.handX(), y: this.kidY() };
    const c = this.dog.collarPoint();
    const n = this.pts.length;
    if (!this._seeded) {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const p = this.pts[i];
        p.x = p.px = a.x + (c.x - a.x) * t;
        p.y = p.py = a.y + (c.y - a.y) * t;
      }
      this._seeded = true;
    }
    /* A real leash keeps its spare length looped in the hand, not dumped on
     * the pavement. The drawn rope only ever carries a believable sag. */
    const span = Math.hypot(c.x - a.x, c.y - a.y);
    /* Under load the drawn rope pulls itself straight; loose, it keeps a
     * believable sag. The picture and the physics have to agree or the rope
     * looks slack at the exact moment it is carrying you. */
    const k = this.strain;
    const drawn = Math.min(this.L * PX,
      span * (1.055 - k * 0.052) + (0.20 - k * 0.185) * PX);
    const rest = drawn / (n - 1);
    for (let i = 2; i < n - 2; i++) {
      const p = this.pts[i];
      const vx = (p.x - p.px) * 0.965, vy = (p.y - p.py) * 0.965;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + 2400 * dt * dt;
      /* A leash lies ON the ground, it does not go through it. */
      const gy = this.ground ? this.ground(p.x) : null;
      if (gy != null && p.y > gy) { p.y = gy; p.x -= vx * 0.35; }
    }
    /* Both ends are driven, and so is the first link out of each — a rope
     * leaves a hand and a collar pointing somewhere, and pinning only the end
     * points puts a hard right-angle kink at both. */
    const ux = (c.x - a.x), uy = (c.y - a.y);
    const ul = Math.hypot(ux, uy) || 1;
    this.pts[0].x = a.x; this.pts[0].y = a.y;
    this.pts[n - 1].x = c.x; this.pts[n - 1].y = c.y;
    this.pts[1].x = a.x + (ux / ul) * rest * 0.9;
    this.pts[1].y = a.y + (uy / ul) * rest * 0.9 + rest * 0.25;
    this.pts[n - 2].x = c.x - (ux / ul) * rest * 0.9;
    this.pts[n - 2].y = c.y - (uy / ul) * rest * 0.9 + rest * 0.25;
    for (let k = 0; k < 6; k++) {
      for (let i = 0; i < n - 1; i++) {
        const p = this.pts[i], q = this.pts[i + 1];
        let dx = q.x - p.x, dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        if (d <= rest) continue;                 // rope, not rod
        const f = (d - rest) / d * 0.5;
        const wp = (i === 0 || i === 1) ? 0 : 1;
        const wq = (i + 1 === n - 1 || i + 1 === n - 2) ? 0 : 1;
        const s = wp + wq || 1;
        p.x += dx * f * (wp / s) * 2 * (wp && wq ? 0.5 : 1);
        p.y += dy * f * (wp / s) * 2 * (wp && wq ? 0.5 : 1);
        q.x -= dx * f * (wq / s) * 2 * (wp && wq ? 0.5 : 1);
        q.y -= dy * f * (wq / s) * 2 * (wp && wq ? 0.5 : 1);
      }
      this.pts[0].x = a.x; this.pts[0].y = a.y;
      this.pts[n - 1].x = c.x; this.pts[n - 1].y = c.y;
    }
  }

  endFrame() { this.bite = 0; }
}
