/* What the dog wants.
 *
 * A small scoring loop over everything nearby, plus a constant pull toward the
 * sea and a comfort term that likes you within a few metres. Whatever wins is
 * where the head points, so the dog's intention is never hidden state — it is
 * drawn on the animal, every frame, before it acts on it.
 *
 * Trust lives here too, and it deliberately does NOT touch speed. It changes
 * how often the dog checks on you, whether it commits to a route before you
 * do, how it carries its ears and tail, and what happens on the beach. If it
 * scaled the dog's top speed, then "I opened my hand and we went faster"
 * would mean something different on every run for reasons nobody can see. */

import { C, PX } from './config.js';
import { clamp, lerp, damp } from './feel.js';

export class Brain {
  constructor(dog, kid, world) {
    this.dog = dog; this.kid = kid; this.world = world;
    this.trust = C.trust.start;
    this.target = null;
    this.targetPos = { x: 0, y: 0 };
    this.think = 0;
    this.arriveT = 0;
    this.lookTimer = 4.0;
    this.lookBacks = 0;
    this.scared = 0;                   // set by scripted beats, decays
    this.hold = null;                  // a beat can pin the dog's attention
    this.freeUntil = 0;
    this.onLookBack = null;
    this.onArrive = null;
  }

  /* Metres from the dog to a world x. */
  _d(x) { return Math.abs(this.dog.x / PX - x); }

  score(p) {
    const d = this._d(p.x);
    if (d > p.r) return 0;
    /* A gentle falloff: a dog that can see gulls two lamp-posts away wants
     * them now, not when it gets there. */
    const near = 1 - (d / p.r) * 0.38;
    /* Things behind the dog are worth less; a dog going somewhere does not
     * spin around for a bin it already passed. */
    const behind = (p.x - this.dog.x / PX) * this.dog.face < -0.5 ? 0.30 : 1;
    return p.pull * near * behind * (p.mult == null ? 1 : p.mult);
  }

  step(dt, leash) {
    const D = C.dog, T = C.trust;
    const dogXm = this.dog.x / PX, kidXm = this.kid.x / PX;

    this.think -= dt;
    if (this.think <= 0) {
      this.think = 0.22;
      let best = null, bestScore = 0.30;   // the sea is the floor
      if (this.hold) { best = this.hold; bestScore = 9; }
      else {
                /* Search wide enough that each prop's own radius is what decides.
         * A dog sees gulls from further away than it smells grass. */
        for (const p of this.world.nearProps(this.dog.x, 44)) {
          const s = this.score(p);
          if (s > bestScore) { bestScore = s; best = p; }
        }
      }
      this.target = best;
      this.targetScore = bestScore;
    }

    /* Where the head points. Always a real place in the world. */
    let tx, ty;
    if (this.target) {
      tx = this.target.x * PX;
      ty = this.world.groundAt(tx) - (this.target.high || 0.6) * PX;
    } else {
      tx = this.dog.x + PX * 6;
      ty = this.world.groundAt(tx) - PX * 0.7;
    }
    this.targetPos.x = tx; this.targetPos.y = ty;

    /* Arrival. Getting the thing it wanted is the biggest trust event in the
     * game, and it is entirely under the player's control. */
    if (this.target && this._d(this.target.x) < 1.1) {
      this.arriveT += dt;
      if (this.arriveT > 0.35 && !this.target.arrived) {
        this.target.arrived = true;
        this.joy = Math.max(this.joy || 0, T.joySeconds);
        this.dog.sniff(0.9);
        if (this.onArrive) this.onArrive(this.target);
        /* It got what it wanted, so it is done with it. Letting interest come
         * back put the dog in a loop: sniff the lamppost, lose interest, walk
         * two metres, want the lamppost again, forever — and the player stuck
         * behind it wondering what they did wrong. */
        this.target.mult = 0.05;
      }
    } else this.arriveT = 0;

    /* Desired velocity. The dog runs at its own speed, full stop — the leash
     * is what decides whether it is allowed to.
     *
     * Wanting something badly is what makes it run. With nothing calling it
     * the dog ambles, which is the only reason a slack rope is ever restful
     * and the only reason a sprint means anything when it comes. */
    let want = 0;
    const gap = tx - this.dog.x;
    this.wake = Math.max(0, (this.wake == null ? 1.6 : this.wake) - dt);
    if (this.wake > 0) {
      want = 0;
      if (this.wake < 0.55 && !this._woke) { this._woke = true; this.dog.shake(); }
    } else if (this.scared > 0.4) {
      want = 0;                        // frightened: it will not lead
    } else if (Math.abs(gap) > PX * 0.6) {
      /* A dog on a walk keeps pace with its person and drifts a little ahead.
       * Wanting something is what makes it faster than you — which is the
       * only reason letting go of the rope ever buys you anything. */
      const eager = clamp(((this.targetScore || 0.3) - 0.30) / 0.70, 0, 1);
      const kidSp = Math.abs(this.kid.vx) / PX;
      const pace = Math.max(1.75, kidSp * 1.10 + 0.5);
      const cruise = lerp(pace, D.topSpeed, Math.pow(eager, 1.4));
      want = Math.sign(gap) * cruise * PX;
    }

    /* Comfort, and the one rule that makes the whole game legible: a dog
     * waits for you unless it sees something it wants.
     *
     * With nothing calling, it drifts to the end of its patience and stops,
     * so the rope hangs slack and a slack rope tows you nowhere. The moment
     * something scores, it forgets you exist and runs to the end of the rope,
     * and that is when letting go is worth anything. Every hill you cannot
     * climb and every gap you can only cross falls out of this. */
    const sep = dogXm - kidXm;
    const obsessed = (this.targetScore || 0) > 0.62 || !!this.hold;
    const patience = obsessed ? D.comfort[1] : D.comfort[0];
    if (Math.abs(sep) > patience) {
      const over = clamp((Math.abs(sep) - patience) / 1.4, 0, 1);
      /* Coming back to you is a hurry, not an amble — a dog that has got too
       * far behind trots to catch up rather than holding you to its pace.
       * Otherwise the animal you are supposed to be following is a speed
       * limit, and the whole afternoon drags. */
      const kidSp2 = Math.abs(this.kid.vx) / PX;
      const home = -Math.sign(sep) * Math.max(kidSp2 * 1.25 + 1.0, 3.2) * PX;
      want = lerp(want, home, over);
    }
    if (this.scared > 0.4 && Math.abs(sep) > 1.4) want = -Math.sign(sep) * D.topSpeed * PX * 0.25;
    /* Crouching calls it. Costs you all your momentum, which is what makes
     * affection a real decision in a game about speed. */
    if (this.kid.crouch > 0.6 && Math.abs(sep) > 0.9) {
      /* A fixed trot back to you. Trust must not appear in any speed anywhere,
       * or the same input produces a different result on different runs for a
       * reason nobody can see. */
      want = -Math.sign(sep) * 4.2 * PX;
      if (Math.abs(sep) < 2.2) this.joy = Math.max(this.joy || 0, 0.5);
    }

    this.want = want;
    const acc = D.accel * PX * dt;
    if (Math.abs(want - this.dog.vx) < acc) this.dog.vx = want;
    else this.dog.vx += Math.sign(want - this.dog.vx) * acc;
    if (want === 0 && Math.abs(this.dog.vx) < 8) this.dog.vx = 0;

    /* --- trust -------------------------------------------------------
     *
     * Not a score you accumulate — a running average of how the last minute
     * has gone. An accumulator saturates inside ten seconds and then the dog
     * is permanently delighted with you no matter what you do, which makes
     * the whole readout a lie. This one has to be maintained. */
    this.joy = Math.max(0, (this.joy || 0) - dt);
    this.hurt = Math.max(0, (this.hurt || 0) - dt);
    {
      let want;
      if (!leash) {
        /* Off the leash: it is entirely about whether you are with it. Trust
         * still moves out here, so a player who spent the whole afternoon
         * hauling it about can still earn the look-back with their own hands
         * in the last minute. */
        const sep2 = Math.abs(this.dog.x - this.kid.x) / PX;
        want = sep2 < 7 ? 0.94 : 0.55;
      }
      else if (leash.strain > 0.45) want = 0.04;                     // being hauled about
      else if (leash.grip) want = 0.38;                         // held close: fine, not free
      else if (Math.abs(this.dog.vx) > 0.6 * PX) want = 0.96;   // loose, and getting on with it
      else want = 0.62;                                          // loose, and waiting for you
      /* Good and bad moments move the TARGET for a few seconds rather than the
       * value. Adding straight to the value ratchets: a slow average cannot
       * shed a bump before the next one lands, and after a few minutes the dog
       * adores a player who has done nothing but haul it about. */
      if (this.joy > 0) want = Math.max(want, 0.98);
      if (this.hurt > 0) want = Math.min(want, 0.02);
      this.trustWant = want;
      this.trust = clamp(damp(this.trust, want, T.memory, dt), 0, 1);
    }

    /* Look-backs. The only score the game has, and it is an animation. */
    this.lookTimer -= dt;
    if (this.lookTimer <= 0) {
      this.lookTimer = lerp(9.5, 2.6, this.trust) * (0.7 + Math.random() * 0.6);
      if (this.scared < 0.4 && Math.abs(sep) > 0.8) {
        this.dog.glanceBack(0.5 + this.trust * 0.25);
        this.lookBacks++;
        if (this.onLookBack) this.onLookBack();
      }
    }

    /* Body readouts. */
    this.dog.trust = this.trust;
    this.dog.fear = damp(this.dog.fear, this.scared, 0.002, dt);
    this.dog.interest = damp(this.dog.interest,
      clamp(this.targetScore != null ? (this.targetScore - 0.3) / 0.7 : 0, 0, 1), 0.01, dt);
    this.dog.strain = leash ? leash.strain : 0;
    this.dog.look.x = tx; this.dog.look.y = ty;
    if (Math.abs(this.dog.vx) > 20) this.dog.face = Math.sign(this.dog.vx);
    /* Half a metre of deadband: without it a dog standing on its own target
     * flips its facing every frame and the whole rig mirrors back and forth. */
    else if (this.target && Math.abs(tx - this.dog.x) > 0.5 * PX) {
      this.dog.face = Math.sign(tx - this.dog.x) || this.dog.face;
    }

    this.scared = Math.max(0, this.scared - dt * 0.35);
    this._pending(dt);
  }

  _pending(dt) {
    if (!this._q) return;
    for (const e of this._q) { e.t -= dt; if (e.t <= 0 && !e.done) { e.done = true; e.fn(); } }
    this._q = this._q.filter((e) => !e.done);
  }
}

function setTimeoutish(brain, seconds, fn) {
  (brain._q = brain._q || []).push({ t: seconds, fn, done: false });
}
