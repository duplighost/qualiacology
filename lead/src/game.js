/* The game.
 *
 * Holds the two bodies, the rope between them, the route, and a small
 * director that fires authored beats off the player's position. There is no
 * HUD, no menu, no pause that stops the world, and no moment where the camera
 * stops answering the player. */

import { C, PX, PAL } from './config.js';
import { clamp, lerp, damp, Camera, Particles, rnd } from './feel.js';
import { Dog } from './dog.js';
import { Kid } from './kid.js';
import { Leash } from './leash.js';
import { Brain } from './brain.js';
import { World } from './world.js';
import { ROUTE } from './route.js';
import { Sound } from './sound.js';

export class Game {
  constructor(gfx, input, save) {
    this.gfx = gfx; this.input = input; this.save = save;
    this.world = new World(ROUTE);
    this.kid = new Kid();
    this.dog = new Dog({
      size: C.dog.shoulder * PX, coat: PAL.dogCoat, dark: PAL.dogDark, pale: PAL.dogPale
    });
    this.leash = new Leash(this.kid, this.dog, this.world.groundAt);
    this.brain = new Brain(this.dog, this.kid, this.world);
    this.parts = new Particles(1600);
    this.cam = new Camera(gfx.vw, gfx.vh);
    this.sound = new Sound();

    this.time = 0;
    this.state = 'play';
    this.unclipped = false;
    this.endT = 0;
    this.fired = new Set();
    this.cars = [];
    this.pal = null;          // the other dog, made when the park needs one
    this.hauling = 0;
    this.gapCleared = false;
    this.stats = { lookBacks: 0, bites: 0, chokes: 0, jumps: 0, falls: 0, time: 0 };

    this._wire();
    this.reset();
  }

  reset() {
    this.kid.place(0, this.world.groundAt(0));
    this.dog.place(1.4 * PX, this.world.groundAt(1.4 * PX));
    this.dog.trust = this.brain.trust = C.trust.start;
    this.leash.L = C.leash.longRest;
    this.leash._seeded = false;
    this.cam.x = this.kid.x; this.cam.y = this.kid.y;
    this.cam.px = this.cam.x; this.cam.py = this.cam.y;
    this.time = 0; this.state = 'play';
    this.fired.clear();
    this.cars.length = 0;
    this.pal = null; this.roadOn = false; this.sitBeat = false;
    this.unclipped = false; this.gapCleared = false; this.shakeGag = false;
    this.kid.free = false; this.fadeT = 0;
    this.dog.sitT = 0; this.dog.planted = false; this.dog.vx = 0; this.dog.airborne = false;
    this.kid.urge = 0; this.sniffCool = 0; this.roadT = 0; this.hitstop = 0;
    this.runUp = null;
    this._sitHold = null;
    this.waitBeat = false; this.hauling = 0; this.endT = 0; this.sitAt = null;
    this._queue = null; this.brain._q = null;
    this.brain.hold = null; this.brain.wake = null; this.brain._woke = false;
    this.brain.joy = 0; this.brain.hurt = 0;
    this.brain.scared = 0;
    this.stats = { lookBacks: 0, bites: 0, chokes: 0, jumps: 0, falls: 0, time: 0 };
    /* Props carry a run's worth of state — a tipped cart, a flown flock, a
     * sniffed lamppost. Starting again has to start them again too. */
    this.world.props = this.world.props.filter((p) => p.kind !== 'sausage');
    for (const p of this.world.props) {
      p.arrived = false; p.mult = 1; p.dead = false;
      p.tipped = 0; p.flown = 0; p.done = false; p.seen = false;
      p.spent = false; p.spooked = 0; p.alarm = 0;
    }
  }

  /* Where a sound is, left to right, as a fraction of the screen. This is not
   * decoration: a dog held on a metre and a half of rope sits almost on top of
   * you, and a dog out at the end of seven and a half is over at the edge of
   * the field. The length of the leash becomes the width of the afternoon. */
  panAt(worldX) {
    const half = C.view.width / 2;
    const p = (worldX - this.cam.x) * this.cam.zoom / half;
    return clamp(p, -1, 1) * 0.8;
  }

  _wire() {
    this.leash.onBite = (amt, nx, ny) => {
      this.stats.bites++;
      this.hitstop = Math.max(this.hitstop || 0, C.feel.hitstopBite * amt);
      this.cam.kick(C.feel.shakeBite * amt);
      this.sound.bite(amt, this.panAt(this.kid.handX()));
      const hx = this.kid.handX(), hy = this.kid.handY();
      for (let i = 0; i < 8; i++) {
        this.parts.spawn(hx, hy, rnd(-90, 90), rnd(-120, 20), rnd(0.2, 0.5), rnd(2, 5), 0,
          { drag: 0.2, grav: 700 });
      }
      /* Skid dust under the feet: being dragged has to leave a mark. */
      if (this.kid.onGround) this.dust(this.kid.x, this.kid.y, 10, 200 * Math.sign(nx));
    };
    this.leash.onChoke = () => {
      this.stats.chokes++;
      this.sound.cough(this.panAt(this.dog.x));
      this.dog.shakeT = Math.max(this.dog.shakeT, 0.3);
      this.brain.hurt = Math.max(this.brain.hurt || 0, C.trust.hurtSeconds);
    };
    /* The one input the player has must answer the moment they use it. It did
     * not: closing your hand on a leash was the only silent thing in the game. */
    this.leash.onGrip = (on) => {
      this.sound.grip(on, this.panAt(this.kid.handX()));
      const h = { x: this.kid.handX(), y: this.kid.handY() };
      for (let i = 0; i < (on ? 4 : 7); i++) {
        this.parts.spawn(h.x, h.y, rnd(-60, 60), rnd(-70, 10), rnd(0.15, 0.35), rnd(2, 4), 0,
          { drag: 0.18, grav: 500 });
      }
    };
    /* The kid has had a footfall hook since the first day with nothing
     * attached to it, so the player's own body was the one thing in the game
     * that moved in silence. Lighter than the dog: a child in soft shoes. */
    this.kid.onFootfall = (side, x, y, speed) => {
      if (speed < 1.6 * PX) return;
      this.sound.step(speed / PX, this.panAt(x));
      if (speed > 4.5 * PX) this.dust(x, y, 1, 0);
    };
    this.dog.onFootfall = (i, x, y, speed) => {
      this.sound.paw(speed / PX, i, this.panAt(x));
      if (speed > 3 * PX) this.dust(x, y, 2, 0);
    };
    this.kid.onLand = (v) => {
      this.hitstop = Math.max(this.hitstop || 0, C.feel.hitstopLand);
      this.cam.kick(clamp(v / 22, 0, 1) * 0.20);
      this.sound.land(clamp(v / 22, 0, 1), this.panAt(this.kid.x));
      this.dust(this.kid.x, this.kid.y, 6, 0);
    };
    this.kid.onJump = () => {
      this.stats.jumps++;
      this.sound.jump(this.panAt(this.kid.x));
      /* Jumping in the same beat as the dog is the most valuable thing in the
       * game, and it answers instantly so it can never be a hidden bonus. */
      if (this.dog.airborne || (this.dog.suspend || 0) > 0.5) {
        this.brain.joy = Math.max(this.brain.joy || 0, C.trust.syncSeconds);
        this.dog.glanceBack(0.4);
        this.sound.sync();
        this.zoomPunch = Math.max(this.zoomPunch || 0, 0.045);
        for (let i = 0; i < 12; i++) {
          this.parts.spawn(this.kid.x, this.kid.y, rnd(-140, 140), rnd(-200, -40),
            rnd(0.3, 0.7), rnd(3, 6), 2, { drag: 0.25, grav: 260 });
        }
      }
    };
    this.brain.onLookBack = () => { this.stats.lookBacks++; this.sound.lookBack(); };
    this.brain.onArrive = (p) => {
      this.sound.arrive(this.panAt(p.x * PX));
      if (p.kind === 'puddle') {
        for (let i = 0; i < 24; i++) {
          this.parts.spawn(p.x * PX + rnd(-40, 40), this.world.groundAt(p.x * PX),
            rnd(-260, 260), rnd(-420, -120), rnd(0.4, 0.9), rnd(3, 7), 1,
            { drag: 0.3, grav: 1400 });
        }
      }
    };
  }

  dust(x, y, n, push) {
    for (let i = 0; i < n; i++) {
      this.parts.spawn(x + rnd(-14, 14), y - 4, rnd(-70, 70) + push, rnd(-120, -20),
        rnd(0.3, 0.8), rnd(3, 8), 0, { drag: 0.12, grav: 180 });
    }
  }

  /* --- update ---------------------------------------------------------- */

  update(dt) {
    this.time += dt;
    this.stats.time = this.time;
    const W = this.world;

    /* Grip. One input, and it is the whole game. */
    const gripping = this.input.held('shift', 'm0', 'k', 'j');
    if (!this.unclipped) this.leash.setGrip(gripping);
    this.kid.gripped = gripping && !this.unclipped;

    this.kid.step(dt, this.input, W);

    this.brain.step(dt, this.unclipped ? null : this.leash);
    this.dog.want = this.brain.want;
    this._dogBody(dt);

    if (!this.unclipped) {
      this.leash.step(dt);
      /* The constraint is free to move either body in any direction, which is
       * correct in the air and nonsense on the ground — a rope does not lift
       * a standing dog off the pavement. Re-seat whatever is standing. */
      if (!this.dog.airborne) {
        this.dog.y = W.groundAt(this.dog.x);
        this.dog.vy = 0;
      }
      if (this.kid.onGround) {
        const gy = W.groundAt(this.kid.x);
        if (this.kid.y > gy - 4) { this.kid.y = gy; this.kid.vy = Math.min(this.kid.vy, 0); }
      }
      const dx = this.dog.x - this.kid.x, dy = this.leash.dogY() - this.kid.handY();
      const d = Math.hypot(dx, dy) || 1;
      this.kid.setPull(dx / d, dy / d, this.leash.strain);
    } else {
      this.kid.setPull(0, 0, 0);
    }

    /* The invitation. When something loud is coming, or the dog has locked on
     * to something it is going to bolt for, the hand starts closing by itself.
     * It is not a prompt and it never says anything; it just pulls the eye to
     * the one input the player has not tried yet. */
    let urge = 0;
    if (!this.unclipped && !this.leash.grip) {
      for (const c of this.cars) {
        const d = Math.abs(c.x - this.kid.x) / PX;
        if (d < 13) urge = Math.max(urge, clamp(1 - d / 13, 0, 1));
      }
      const tgt = this.brain.target;
      if (tgt && (this.brain.targetScore || 0) > 0.80) {
        const d = Math.abs(tgt.x - this.dog.x / PX);
        if (d < 7) urge = Math.max(urge, clamp(1 - d / 7, 0, 1) * 0.85);
      }
      if (this.kid.slipping > 0.4) urge = Math.max(urge, this.kid.slipping);
    }
    this.kid.urge = damp(this.kid.urge || 0, urge, 0.004, dt);
    this.kid.nose = this.dog.collarPoint();

    W.step(dt, this);
    this._beats(dt);
    this._cars(dt);
    this._camera(dt);
    this.parts.step(dt);
    this.sound.update(dt, this);
    this._q2(dt);
    this.leash.endFrame();
    this.input.step(dt);
  }

  _dogBody(dt) {
    const D = C.dog, W = this.world;
    const g = W.groundAt(this.dog.x);
    const gap = W.inGap(this.dog.x, this.dog.y);

    this.dog.x += this.dog.vx * dt;

    if (this.dog.airborne) {
      this.dog.vy += D.gravity * PX * dt;
      this.dog.y += this.dog.vy * dt;
      const gy = W.groundAt(this.dog.x);
      /* Land on contact, whatever the rope is doing. Requiring a downward
       * velocity lets a taut leash fly the dog like a kite forever. */
      if (this.dog.y >= gy || (!W.gapAtX(this.dog.x) && this.dog.y > gy - 6)) {
        this.dog.y = gy; this.dog.vy = 0; this.dog.airborne = false;
        this.dust(this.dog.x, this.dog.y, 5, 0);
        this.sound.land(0.5);
      }
    } else {
      this.dog.y = g;
      /* At the lip of the gap the dog leaps on its own. It never needed you. */
      const ahead = this.dog.x + Math.sign(this.dog.vx || 1) * 0.55 * PX;
      const over = W.gapAtX(ahead);
      /* Can the rope even let it get to the far side? A dog on a metre and a
       * half of leash cannot be five metres from you, so it cannot be on the
       * other side of a five-metre gap, and it knows that. */
      const span = over ? (over.x1 - over.x0) : 0;
      const enoughRope = this.unclipped || this.leash.L > span * 0.8;
      if (over && enoughRope && Math.abs(this.dog.vx) > 4 * PX) {
        this.dog.airborne = true;
        this.dog.vy = -D.jumpV * PX;
        this.sound.jump();
        this.dust(this.dog.x, this.dog.y, 8, 0);
        this.runUp = null;
      } else if (over && enoughRope) {
        /* It has the rope but not the run-up — it walked up to the edge and
         * stopped. Bleeding its speed here is a closed loop: the balk prevents
         * the jump that would end the balk, and the dog stands at the lip
         * doing a walk cycle on the spot forever. So it backs off and takes a
         * run at it, the way anything alive would. */
        this.dog.x = Math.min(this.dog.x, (over.x0 - 0.45) * PX);
        if (this.runUp == null) {
          this.runUp = over.x0 - 8;
          this.dog.glanceBack(0.4);
        }
      } else if (over) {
        /* It pulls up short at the lip, digs in, and looks at you. Held on a
         * metre of rope it cannot make the leap and it knows it. */
        this.dog.vx *= 0.12;
        /* Clamp to whichever lip it is standing on, not always the near one. */
        const g2 = W.gapAtX(ahead);
        if (this.dog.x / PX <= g2.x0) this.dog.x = Math.min(this.dog.x, (g2.x0 - 0.45) * PX);
        else this.dog.x = Math.max(this.dog.x, (g2.x1 + 0.45) * PX);
        this.dog.strain = Math.max(this.dog.strain, 0.6);
        this.dog.glanceBack(0.25);
      }
    }
    this.dog.step(dt, this.world);
    if (this.pal) {
      this.pal.x += this.pal.vx * dt;
      this.pal.y = W.groundAt(this.pal.x);
      this.pal.look.x = this.pal.x + this.pal.face * 400;
      this.pal.look.y = this.pal.y - 200;
      this.pal.step(dt, this.world);
    }

    /* Falling in the gap costs a second and a half and a piece of theme: the
     * dog braces at the lip and hauls you out. It is never a game over. */
    /* Only once you are clearly not going to make it. A jump arc dips below
     * the lip on the way across, and grabbing the player there would eat the
     * exact moment the game exists for. */
    /* Falling in costs you a second and a half and a piece of theme: the dog
     * plants itself at the lip and hauls you out on the rope. It is never a
     * game over, and — this matters more — it is never a cutscene. Your keys
     * keep working the whole way up; the rope is simply stronger than you. */
    const kg = this.world.inGap(this.kid.x, this.kid.y);
    if (kg && this.kid.vy > 0 && this.hauling <= 0 && !this.unclipped) {
      this.hauling = 1.6;
      this.stats.falls++;
      /* Out on whichever side the dog is standing. It does not cross the gap
       * to fetch you, and it certainly does not cross it in one frame. */
      const far = this.dog.x / PX > kg.x1;
      const lipX = (far ? kg.x1 + 1.1 : kg.x0 - 1.1) * PX;
      this.haulTo = { x: lipX, y: W.groundAt(lipX) };
      this.sound.strain();
    }
    if (this.hauling > 0) {
      this.hauling -= dt;
      /* The dog is the anchor: it plants where it already is and leans back.
       * Moving it to a convenient spot is how it ended up walking through a
       * chasm in a single frame. */
      this.dog.planted = true;
      this.dog.vx = 0;
      if (!W.gapAtX(this.dog.x)) this.dog.y = W.groundAt(this.dog.x);
      this.dog.airborne = false;
      this.dog.strain = 1;
      this.dog.face = Math.sign(this.kid.x - this.dog.x) || 1;
      /* And it pulls. Real forces on a real body: you can still steer, and if
       * you help it you get out faster. */
      const dx = this.haulTo.x - this.kid.x, dy = this.haulTo.y - 40 - this.kid.y;
      const d = Math.hypot(dx, dy) || 1;
      this.kid.vx += (dx / d) * 34 * PX * dt;
      this.kid.vy += ((dy / d) * 34 - C.kid.gravity * 0.55) * PX * dt;
      this.kid.vy = Math.min(this.kid.vy, 3 * PX);
      if (Math.random() < dt * 26) {
        this.dust(this.dog.x + rnd(-20, 20), this.dog.y, 1, -60);
      }
      if (this.hauling <= 0 || (!this.world.inGap(this.kid.x, this.kid.y) && this.kid.onGround)) {
        this.hauling = 0; this.dog.strain = 0; this.dog.planted = false;
      }
    }
  }

  /* --- camera ---------------------------------------------------------- */
  /* Frames both of them. Separation pushes the view out, so how much room the
   * picture gives you is exactly how much rope you have given the dog. */
  _camera(dt) {
    const K = C.cam;
    this.cam.w = this.gfx.vw; this.cam.h = this.gfx.vh;
    const sep = Math.abs(this.dog.x - this.kid.x) / PX;
    const f = clamp((sep - K.sepNear) / (K.sepFar - K.sepNear), 0, 1);
    /* Mostly-square easing, but not entirely: a pure f*f spends the whole
     * first metre and a half of separation on the flat part of the curve, and
     * that is the half of the range a gripped player lives in. */
    this.cam.zoomT = lerp(K.zoomNear, K.zoomFar, f * f * 0.7 + f * 0.3);
    /* Punches are added on top, because this line runs every frame and used
     * to silently overwrite anything an event had done to zoomT. */
    this.zoomPunch = (this.zoomPunch || 0) * Math.pow(0.02, dt);
    this.cam.zoomT += this.zoomPunch;

    const mid = lerp(this.kid.x, this.dog.x, 0.34);
    const ty = lerp(this.kid.y, this.dog.y, 0.3) + K.biasY * PX;
    const lead = clamp(this.kid.vx / (C.kid.topSpeed * PX), -1, 1) * K.lead * PX;
    this.cam.follow(mid, ty, dt, {
      rate: K.followRate, leadX: lead, leadY: 0, leadRate: K.leadRate
    });
  }

  /* --- the director ---------------------------------------------------- */

  at(x, id, fn) {
    if (this.kid.x / PX < x || this.fired.has(id)) return;
    this.fired.add(id); fn();
  }

  _beats(dt) {
    const W = this.world, X = this.kid.x / PX, M = ROUTE.marks;
    const at = (x) => W.props.reduce((best, p) =>
      (Math.abs(p.x - x) < 3 && (!best || Math.abs(p.x - x) < Math.abs(best.x - x))) ? p : best, null);

    this.at(0.9, 'wake', () => { this.sound.first(); });

    /* --- both directions of the rope ---------------------------------- */
    /* Pigeons: the dog lunges and the rope drags you into a sprint. */
    for (const px of [M.pigeons, M.pigeons2]) {
      const pig = at(px);
      if (!pig || pig.kind !== 'pigeons') continue;
      if (!pig.flown && Math.abs(this.dog.x / PX - pig.x) < 3.4) {
        pig.flown = 0.001;
        this.sound.flock(this.panAt(pig.x * PX));
        this.cam.kick(0.14);
      }
      if (pig.flown) {
        pig.flown = Math.min(2.6, pig.flown + dt * 0.9);
        if (pig.flown > 1.5) pig.mult = 0.04;
      }
    }

    /* Lampposts and hydrants stop the dog dead while you are still running.
     * That is the other half of the rope's lesson, and it is taught by a
     * lamppost rather than by anybody saying anything. */
    this.sniffCool = Math.max(0, (this.sniffCool || 0) - dt);
    if (this.sniffCool <= 0 && !this.brain.hold) {
      for (const p of W.nearProps(this.dog.x, 3)) {
        if (p.done || (p.kind !== 'lamppost' && p.kind !== 'hydrant')) continue;
        if (Math.abs(this.dog.x / PX - p.x) > 1.2) continue;
        p.done = true;
        /* Half of what the street teaches is the dog stopping dead while
         * you keep running. On a twenty-six second global timer only three
         * of the eight anchor props on the route ever fired, and the back
         * half of the street had nothing in it. */
        this.sniffCool = 9;
        this.brain.hold = p;
        this.dog.sniff(1.7);
        setTimeout2(this, 1.9, () => { if (this.brain.hold === p) this.brain.hold = null; p.mult = 0.04; });
        break;
      }
    }

    this.at(52, 'cyclist1', () => this.spawnCyclist(1));
    this.at(64, 'cyclist2', () => this.spawnCyclist(2));
    this.at(238, 'cyclist3', () => this.spawnCyclist(3));

    /* --- the crossing --------------------------------------------------
     * The one chapter where holding on is simply the right answer, so the
     * game never becomes a sermon about letting go. */
    this.at(M.roadStart - 14, 'road', () => { this.roadOn = true; });
    if (X > M.roadEnd + 6) this.roadOn = false;

    /* --- the park ------------------------------------------------------ */
    const cart = at(M.cart);
    if (cart && cart.kind === 'cart') {
      const near = Math.abs(this.dog.x / PX - cart.x);
      /* The telegraph: it locks on well before it gets there, and the vendor
       * looks up. Everything you need to know arrives two seconds early. */
      if (near < 9 && !cart.seen) { cart.seen = true; this.dog.bow(); }
      cart.alarm = clamp(1 - (near - 1.2) / 7, 0, 1);
      /* Held at your side, the dog goes past it. Given the rope, it does not.
       * This is the beat where an open hand is the wrong answer, and the game
       * needs one of those or it is just a sermon about letting go. */
      /* Decided by the rope, not the key: a leash short enough keeps the dog
       * at your side and it goes past the cart. Shortening takes about a
       * second, so this is a state you can see, not an input you can flick. */
      const roomToReach = this.leash.L > 3.0;
      if (!cart.tipped && near < 1.4 && roomToReach) this._tipCart(cart);
      /* And the closed hand needs a payoff of its own, or the loud wrong
       * answer is simply the better one and nobody learns anything. The dog is
       * denied, and it looks round at you about it, and the man behind the
       * counter — who was watching the whole approach — relaxes. */
      if (!cart.tipped && !cart.saved && near < 1.2 && !roomToReach) {
        cart.saved = true;
        cart.nod = 1;
        this.dog.glanceBack(1.1);
        this.brain.joy = Math.max(this.brain.joy || 0, C.trust.joySeconds);
        this.sound.arrive(this.panAt(cart.x * PX));
      }
      if (cart.nod) cart.nod = Math.max(0, cart.nod - dt * 0.55);
      if (cart.tipped) cart.tipped = Math.min(1, cart.tipped + dt * 2.2);
    }

    /* Backing off to take a run at the gap. Held as the dog's own attention
     * so the head points where it is going, like everything else it does. */
    if (this.runUp != null) {
      if (!this._runUpHold) this._runUpHold = { pull: 1, r: 9, high: 0.6, runUp: true };
      this._runUpHold.x = this.runUp;
      this.brain.hold = this._runUpHold;
      if (this.dog.x / PX <= this.runUp + 1.0) this.runUp = null;
    } else if (this.brain.hold && this.brain.hold.runUp) { this.brain.hold = null; this._runUpHold = null; }

    const pack = at(M.pack);
    if (pack && pack.kind === 'otherdog' && !this.pal && !pack.spent && Math.abs(X - pack.x) < 26) {
      this.spawnPal(pack);
    }
    if (this.pal) {
      this._pal(dt);
      /* While its friend is running, nothing else in the world scores. */
      if (this.pal) {
        if (!this._packHold) this._packHold = { pull: 1, r: 30, high: 0.6, pack: true };
        /* One persistent target, moved.
         *
         * This used to be a fresh object literal every frame, so its arrived
         * flag reset every frame and the dog re-arrived about one and a half
         * times a second: twenty notification plucks through the beat, and a
         * sniff with each one, which held its head down for the whole sprint.
         * And aiming it off the pal gave the dog a target that stood still
         * relative to the thing it was chasing, so its desire collapsed every
         * time the two closed up and the run yo-yoed. Ahead of the player is
         * a place that keeps running away.
         */
        this._packHold.x = this.kid.x / PX + 9;
        this.brain.hold = this._packHold;
      }
    } else if (this.brain.hold && this.brain.hold.pack) { this.brain.hold = null; this._packHold = null; }

    /* Cats. The renderer has carried a whole spook pose — arched back, tail
     * up, bolting — since the first day, and nothing ever raised the flag it
     * reads. Both cats were statues, and a cat that does not run is not a
     * reason to hold on to anything. */
    for (const p of this.world.props) {
      if (p.kind !== 'cat') continue;
      const near = Math.abs(this.dog.x / PX - p.x);
      if (!p.spooked && near < 3.0) {
        p.spooked = 0.001;
        p.mult = 0.05;                    /* it is gone; stop wanting it */
        this.sound.flock(this.panAt(p.x * PX));
      }
      if (p.spooked) p.spooked = Math.min(1, p.spooked + dt * 2.6);
    }

    /* --- the viaduct --------------------------------------------------- */
    this.at(M.lip - 10, 'sea', () => this.sound.sea());
    /* The moment the far side takes your weight. This used to wait until you
     * were 0.8 m past the edge — a tenth of a second after the landing it is
     * punctuating — and then punctuate it more quietly than a hot-dog cart. */
    if (!this.gapCleared && X > M.gapEnd && this.kid.onGround) {
      this.gapCleared = true;
      this.cam.kick(0.5);
      this.hitstop = Math.max(this.hitstop || 0, 0.10);
      this.zoomPunch = Math.max(this.zoomPunch || 0, 0.06);
      this.sound.cleared();
      this.brain.joy = Math.max(this.brain.joy || 0, C.trust.syncSeconds);
      for (let i = 0; i < 24; i++) {
        this.parts.spawn(this.kid.x, this.kid.y, rnd(-170, 170), rnd(-230, -50),
          rnd(0.3, 0.8), rnd(3, 7), 2, { drag: 0.25, grav: 240 });
      }
    }

    /* --- the beach ----------------------------------------------------- */
    /* The last dune. The dog goes on ahead, stops, sits, and looks back at
     * you — the same look it has been giving you all afternoon, except this
     * time it is waiting for something. The only thing left to do is walk up
     * and crouch, which is the affection verb you have had since minute one. */
    this.at(M.lastDune, 'sit', () => {
      this.sitBeat = true;
      this.sitAt = Math.max(this.kid.x / PX + 7, M.lastDune + 5);
    });
    if (this.sitBeat && !this.unclipped) {
      /* It goes on ahead to the crest, stops, and sits down facing back at
       * you. Then it will not move: the rope stops you dead a few metres past
       * it, which is the only thing in the game that has ever done that, and
       * it is the whole invitation. Walk back. Crouch. That is the ending. */
      if (!this._sitHold) this._sitHold = { x: this.sitAt, pull: 1, r: 5, high: 0.62 };
      this._sitHold.x = this.sitAt;
      this.brain.hold = this._sitHold;
      const arrived = Math.abs(this.dog.x / PX - this.sitAt) < 1.4;
      const still = Math.abs(this.dog.vx) < 1.6 * PX;
      this.dog.sitT = damp(this.dog.sitT, arrived && still ? 1 : 0, 0.00008, dt);
      if (this.dog.sitT > 0.5) {
        this.dog.planted = true;
        this.dog.vx = 0;
        this.dog.x = damp(this.dog.x, this.sitAt * PX, 0.0001, dt);
        { const dx = this.kid.x - this.dog.x; if (Math.abs(dx) > 0.5 * PX) this.dog.face = Math.sign(dx) || this.dog.face; }
        if (this.dog.lookBackT <= 0 && Math.random() < dt * 0.9) this.dog.glanceBack(1.2);
      } else this.dog.planted = false;
      if (Math.abs(this.dog.x - this.kid.x) / PX < 3.0 && this.dog.sitT > 0.55
        && this.kid.crouch > 0.7) this.unclip();
    }
    if (this.unclipped) this._ending(dt);
  }

  /* The counterweight. Everything else in the game rewards an open hand;
   * this rewards a closed one, and without it the theme is a bumper sticker. */
  _tipCart(cart) {
    const W = this.world;
    cart.tipped = 0.001;
    this.sound.crash(this.panAt(cart.x * PX));
    this.cam.kick(0.45);
    this.hitstop = 0.08;
    for (let i = 0; i < 34; i++) {
      this.parts.spawn(cart.x * PX + rnd(-60, 60), W.groundAt(cart.x * PX) - 110,
        rnd(-380, 380), rnd(-560, -160), rnd(0.8, 1.8), rnd(5, 10), 0,
        { drag: 0.4, grav: 1500, spin: rnd(-9, 9) });
    }
    /* Sausages roll downhill and the dog wants every single one. Comedy,
     * not punishment: nothing is lost, the afternoon just gets louder. */
    for (let i = 0; i < 6; i++) {
      W.props.push({
        kind: 'sausage', x: cart.x + 2.4 + i * 2.2, pull: 0.93, r: 10,
        high: 0.12, t: 0, mult: 1
      });
    }
  }

  /* The pack run. Another dog crosses the park, and if you simply give the
   * rope away and run alongside, you get the fastest fifteen seconds in the
   * game with nothing to solve. It is the reward for trusting, and the only
   * way to have it is to stop steering. */
  _pal(dt) {
    const P = this.pal, D = this.dog;
    P.t = (P.t || 0) + dt;
    const lead = D.x + 1.1 * PX;
    const want = clamp((lead - P.x) * 2.4, -12.4 * PX, 12.4 * PX);
    P.vx = damp(P.vx, want, 0.0006, dt);
    P.face = P.vx >= 0 ? 1 : -1;
    P.trust = 0.92;
    P.interest = 0.85;
    if (!P.hi && Math.abs(P.x - D.x) / PX < 3) {
      P.hi = true; D.bow(); D.glanceBack(0.4); this.sound.arrive(this.panAt(P.x));
    }
    /* It leaves when the park does. */
    if (P.x / PX > ROUTE.marks.pack + 62) {
      P.gone = (P.gone || 0) + dt;
      P.vx = damp(P.vx, 3 * PX, 0.002, dt);
    }
    if ((P.gone || 0) > 4) {
      const src = this.world.props.find((q) => q.kind === 'otherdog');
      if (src) { src.spent = true; src.mult = 0.02; }
      this.pal = null;
      this.brain.hold = null;
    }
  }

  spawnCyclist(n) {
    this.cars.push({
      kind: 'cycle', x: this.kid.x + 26 * PX, v: -7.2 * PX, ring: 0.6, n
    });
  }

  spawnPal(p) {
    this.pal = new Dog({ size: C.dog.shoulder * PX * 0.86, coat: '#4b4a52', dark: '#2f2e36', pale: '#cfc9c0' });
    this.pal.place((p.x + 26) * PX, this.world.groundAt((p.x + 16) * PX));
    this.pal.vx = -7.5 * PX;
    p.mult = 1.0;
  }

  _cars(dt) {
    const W = this.world;
    /* Traffic on the crossing: a fixed cycle, always visible before it
     * matters, never lethal. It swerves and honks; nothing is ever hurt. */
    if (this.roadOn) {
      this.roadT = (this.roadT || 0) + dt;
      const X2 = this.kid.x / PX;
      if (this.roadT > 2.9 && X2 > ROUTE.marks.roadStart - 18 && X2 < ROUTE.marks.roadEnd + 6) {
        this.roadT = 0;
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.cars.push({
          kind: 'car', x: this.kid.x + dir * 26 * PX, v: -dir * 13 * PX,
          col: ['#c8564a', '#5d7fa8', '#d9b45c', '#6e6f7a'][(Math.random() * 4) | 0]
        });
      }
    }
    for (const c of this.cars) {
      c.x += c.v * dt;
      c.y = W.groundAt(c.x);
      const near = Math.abs(c.x - this.dog.x) / PX;
      /* Out in the road, rather than at your knee. This is the difference the
       * crossing is about, and it is a distance rather than a key state. */
      const outThere = Math.abs(this.dog.x - this.kid.x) / PX > 2.2;
      if (near < 2.4 && !c.honked) {
        c.honked = true;
        this.sound.honk(c.kind === 'car', this.panAt(c.x));
        c.v *= outThere ? 0.72 : 0.94;
        if (outThere) {
          /* A near miss makes the dog flinch, which is the only warning the
           * game ever gives and it is written on the dog. */
          this.brain.scared = Math.max(this.brain.scared, 0.65);
          this.brain.hurt = Math.max(this.brain.hurt || 0, C.trust.hurtSeconds);
          this.cam.kick(0.16);
          this.dog.shakeT = Math.max(this.dog.shakeT, 0.25);
        }
      }
      if (near < 8 && !c.seen) { c.seen = true; this.dog.glanceBack(0.2); }
    }
    /* Traffic belongs to the street and the crossing. Nothing on wheels
     * should ever follow you up a viaduct. */
    const roadZone = (x) => x / PX < ROUTE.marks.roadEnd + 14;
    this.cars = this.cars.filter((c) =>
      Math.abs(c.x - this.kid.x) < 36 * PX && roadZone(c.x) && roadZone(this.kid.x));
  }

  unclip() {
    this.unclipped = true;
    this.leash.setGrip(false);
    this.brain.hold = null;
    this.dog.sitT = 0;
    this.dog.planted = false;
    this.kid.free = true;
    this.sound.unclip(this.panAt(this.kid.handX()));
    this.cam.kick(0.1);
    this.endT = 0;
    this.save.set({
      finished: true,
      bestLookBacks: Math.max(this.save.data.bestLookBacks || 0, this.stats.lookBacks),
      lastTrust: this.brain.trust
    });
  }

  /* The last ninety seconds. No rope, no obstacles, and whatever you built:
   * a dog that runs ahead and turns to wait, or one that just runs. Trust
   * still climbs out here, so it is never too late to earn it. */
  _ending(dt) {
    this.endT += dt;
    const T = this.brain.trust;
    if (!this.waitBeat) this.brain.hold = null;
    const ahead = (this.dog.x - this.kid.x) / PX;

    /* What the afternoon was worth, expressed as two different animals.
     * High trust: it gets ahead, stops, turns round and waits for you — the
     * look-back you have been unknowingly farming all day, with no rope on it
     * to compel anything. Low trust: it just goes, and does not turn. Neither
     * is a fail state and neither is scored at you. */
    if (!this.waitBeat && ahead > lerp(9.5, 4.5, T) && this.endT > 3.5) {
      this.waitBeat = true;
      if (T > 0.62) {
        this.brain.hold = { x: this.dog.x / PX, pull: 1, r: 3, high: 0.7, wait: true };
        setTimeout2(this, 0.35, () => { this.dog.glanceBack(2.6); this.sound.wait(); });
        setTimeout2(this, 2.6, () => { this.brain.hold = null; this.waitBeat = false; });
      } else {
        /* Its own thing, at its own pace, without you. */
        this.dog.sniff(1.1);
        setTimeout2(this, 1.4, () => { this.waitBeat = false; });
      }
    }

    /* The water's edge. You cannot run past the sea, and wading into it slows
     * you the way wet sand does — the route stops itself. */
    const shore = ROUTE.marks.shore;
    const wade = clamp((this.kid.x / PX - shore) / 6, 0, 1);
    if (wade > 0) {
      this.kid.vx *= Math.pow(1 - wade * 0.86, dt * 60);
      if (wade > 0.85) this.kid.x = Math.min(this.kid.x, (shore + 6) * PX);
      if (Math.abs(this.kid.vx) > PX && Math.random() < dt * 22) {
        this.parts.spawn(this.kid.x + rnd(-16, 16), this.kid.y, rnd(-140, 140), rnd(-260, -60),
          rnd(0.3, 0.7), rnd(3, 6), 1, { drag: 0.3, grav: 1200 });
      }
    }
    const dogWade = clamp((this.dog.x / PX - shore) / 6, 0, 1);
    if (dogWade > 0) {
      /* Take the speed as well as the position.
       *
       * Clamping x alone left the dog holding a six-metre-a-second gallop
       * with its feet cycling and its body pinned — running on the spot, for
       * the whole fourteen seconds of the fade, as the last thing the player
       * ever sees. Damped, not locked: the gait falls through trot to stand on
       * its own, and a player who walks away can still walk away. */
      this.dog.vx *= Math.pow(1 - dogWade * 0.90, dt * 60);
      if (dogWade > 0.9) this.dog.x = Math.min(this.dog.x, (shore + 6.6) * PX);
      /* Once it has stopped it turns and looks back at you, which is the
       * thing it has been doing all afternoon. */
      if (Math.abs(this.dog.vx) < 0.6 * PX) {
        { const dx = this.kid.x - this.dog.x; if (Math.abs(dx) > 0.5 * PX) this.dog.face = Math.sign(dx) || this.dog.face; }
        this.dog.look.x = this.kid.x;
        this.dog.look.y = this.kid.y - 40;
      }
    }

    /* And then it ends. The light goes, slowly, while you still have the keys. */
    if (this.shakeGag) this.fadeT = Math.min(1, (this.fadeT || 0) + dt / 14);

    /* The gag, so the last minute is not a greeting card: it goes in the sea
     * and comes back and shakes the whole thing over you. */
    if (!this.shakeGag && this.dog.x / PX > ROUTE.marks.shore) {
      this.shakeGag = true;
      setTimeout2(this, 1.2, () => {
        this.dog.shake();
        this.sound.splash(this.panAt(this.dog.x));
        for (let i = 0; i < 40; i++) {
          this.parts.spawn(this.dog.x + rnd(-70, 70), this.dog.y - 70,
            rnd(-320, 320), rnd(-500, -100), rnd(0.5, 1.2), rnd(3, 7), 1,
            { drag: 0.35, grav: 1300 });
        }
      });
    }
  }

  _q2(dt) {
    if (!this._queue) return;
    for (const e of this._queue) { e.t -= dt; if (e.t <= 0 && !e.done) { e.done = true; e.fn(); } }
    this._queue = this._queue.filter((e) => !e.done);
  }
}

function setTimeout2(game, seconds, fn) {
  (game._queue = game._queue || []).push({ t: seconds, fn, done: false });
}
