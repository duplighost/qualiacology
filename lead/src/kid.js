/* The kid.
 *
 * A small platformer body with the usual courtesies — coyote time, a jump
 * buffer, variable height, step-up over kerbs — plus one thing that is not
 * usual: the arm holding the leash is a real IK chain that gets straightened
 * by the rope. When the dog pulls, you watch the arm go taut, the shoulder
 * drag, the torso twist, and the feet skid. Being towed has to be legible on
 * the body or it just reads as broken input. */

import { C, PX, PAL } from './config.js';
import { clamp, lerp, damp } from './feel.js';
import { ik2 } from './dog.js';

export class Kid {
  constructor() {
    this.H = C.kid.height * PX;
    this.x = 0; this.y = 0;            // feet
    this.vx = 0; this.vy = 0;
    this.face = 1;
    this.onGround = false;
    this.coyote = 0;
    this.crouch = 0;
    this.ground = 0;
    this.slope = 0;

    /* Where the leash hand wants to be, and where the rope has dragged it. */
    this.pull = { x: 0, y: 0 };        // unit vector of rope tension
    this.pullAmt = 0;
    this.lean = 0;
    this.stride = 0;
    this.armExt = 0.35;
    this.landT = 0;
    this.skid = 0;
    this.braceT = 0;                   // hauling the player back up a ledge
    this.t = 0;

    this.onFootfall = null;
    this.onLand = null;
  }

  place(x, y) { this.x = x; this.y = y; this.vx = this.vy = 0; this.onGround = true; }

  headY() { return this.y - this.H * (1 - this.crouch * 0.26); }
  /* The hand on the rope. Rises and extends toward the pull. */
  handX() {
    return this.x + this.face * this.H * 0.20 + this.pull.x * this.H * this.armExt;
  }
  handY() {
    return this.y - this.H * (0.60 - this.crouch * 0.18) + this.pull.y * this.H * this.armExt * 0.8;
  }

  step(dt, input, world) {
    const K = C.kid;
    this.t += dt;
    const g = world.groundAt(this.x);
    this.ground = g;
    this.slope = world.slopeAt(this.x);
    this.face = this.face || 1;

    const left = input.held('a', 'arrowleft');
    const right = input.held('d', 'arrowright');
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    const wantCrouch = input.held('s', 'arrowdown') && this.onGround;
    this.crouch = damp(this.crouch, wantCrouch ? 1 : 0, 0.0008, dt);

    /* Slope. Past about seventeen degrees you start losing traction and past
     * thirty you have none: your legs cannot push you up it and gravity walks
     * you back down. Nothing announces this — the hill simply refuses, and
     * the only other thing in your hands is a rope tied to something that
     * climbs like it is nothing. */
    const up = -this.slope * (dir || this.face);
    this.slipping = this.onGround ? clamp((up - 0.30) / 0.28, 0, 1) : 0;
    const traction = 1 - this.slipping * 0.97;

    /* Horizontal. Turning is snappier than accelerating, which is what makes
     * a body feel like it has intent rather than inertia. */
    const top = K.topSpeed * PX * (1 - this.crouch * 0.72) * (this.onGround ? traction : 1);
    const a = (this.onGround ? K.accel * traction : K.airAccel) * PX;
    /* What this body is asking for. The dog publishes the same thing, and the
     * rope needs both ends to know how hard it is working. */
    this.want = dir * top;
    if (dir !== 0) {
      const turning = Math.sign(this.vx) !== 0 && Math.sign(this.vx) !== dir;
      const over = Math.sign(this.vx) === dir && Math.abs(this.vx) > top;
      if (!over) {
        /* Your own legs take you to your own top speed and not one step past
         * it. Everything above this line is the rope's doing, and it has to
         * stay the rope's doing or letting go would mean nothing. */
        this.vx += dir * a * (turning ? K.turnBoost : 1) * dt;
        if (Math.sign(this.vx) === dir) this.vx = clamp(this.vx, -top, top);
      } else if (this.onGround) {
        /* Coasting out of a tow: you keep the speed for a second or so and
         * then your legs cannot hold it any more. Only your legs — in the air
         * there is nothing to coast out of, and bleeding speed there would
         * quietly shorten every jump the rope has just paid for. */
        this.vx = Math.sign(this.vx) * Math.max(top, Math.abs(this.vx) - 5.5 * PX * dt);
      }
      this.face = dir;
    } else if (this.onGround) {
      const f = K.friction * PX * dt;
      this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
    }
    /* Gravity down the face of it. */
    if (this.onGround && this.slipping > 0) {
      this.vx += Math.sign(this.slope) * this.slipping * 14 * PX * dt;
    }

    /* Jump. Buffered on the way in, cuttable on the way out. */
    if (this.onGround) this.coyote = K.coyote; else this.coyote = Math.max(0, this.coyote - dt);
    if (this.coyote > 0 && input.pressed(['space', 'w', 'arrowup'], K.buffer)) {
      input.consume(['space', 'w', 'arrowup']);
      this.vy = -K.jumpV * PX;
      this.onGround = false; this.coyote = 0;
      this.jumpedAt = this.t;
      if (this.onJump) this.onJump();
    }
    if (this.vy < 0 && !input.held('space', 'w', 'arrowup')) this.vy *= Math.pow(K.cutFactor, dt * 12);

    this.vy += K.gravity * PX * dt;
    this.vy = Math.min(this.vy, K.maxFall * PX);

    const wasAir = !this.onGround;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    /* Ground. Step-up handles kerbs and stairs without a jump; anything
     * taller is a real obstacle and reads like one. */
    const gy = world.groundAt(this.x);
    if (this.y >= gy) {
      const rise = this.y - gy;
      if (rise >= 0 || rise > -K.stepUp * PX) {
        this.y = gy;
        if (this.vy > 0) {
          if (wasAir && this.onLand) this.onLand(this.vy / PX);
          if (wasAir) this.landT = 0.22;
          this.vy = 0;
        }
        this.onGround = true;
      }
    } else if (gy - this.y < K.stepUp * PX && this.vy >= 0) {
      /* The ground came up under you: a kerb, a stair, the lip of a dune.
       *
       * But the last thirty-four centimetres of ANY fall look exactly like a
       * kerb from here, so this branch was catching every landing in the game
       * before the branch above could see it — twenty-five jumps, a thousand
       * airborne frames, and onLand fired zero times. No thud, no dust, no
       * hitstop, no kick. Every landing in a game about momentum was silent.
       * If you were in the air, this is a landing, and it has to be heard. */
      if (wasAir && this.vy > 1.2 * PX) {
        if (this.onLand) this.onLand(this.vy / PX);
        this.landT = 0.22;
      }
      this.y = gy; this.vy = 0; this.onGround = true;
    } else {
      this.onGround = false;
    }

    this.landT = Math.max(0, this.landT - dt);
    this.braceT = Math.max(0, this.braceT - dt);

    /* How fast the rope is allowed to drag you while your feet are down.
     * A little faster than you can run on the flat; much faster downhill,
     * because gravity is doing the work and your legs only have to keep up.
     * Off the ground this number stops existing. */
    /* Signed: downhill gravity does the work and your legs only have to keep
     * up, so the rope may drag you much faster; uphill you are being hauled
     * against it and the steeper it gets the slower that goes. Without the
     * uphill half, a viaduct of five distinct pitches is one flat ride. */
    const pitch = clamp(this.slope * this.face, -0.85, 0.85);
    const cap = pitch >= 0 ? 1.18 + (pitch / 0.75) * 0.85
      : 1.18 - Math.min(0.72, (-pitch / 0.85) * 0.80);
    this.groundCap = K.topSpeed * PX * cap * (1 - this.crouch * 0.55);
    this.skidDrag = damp(this.skidDrag || 0, 0, 0.004, dt);

    /* Stride phase for the legs, driven by real distance covered. */
    /* Stride rate. The divisor is the distance one cycle of the legs covers,
     * and at H*0.62 that was 0.83 m — so a kid at 7 m/s ran their legs round
     * 8.4 times a second and strobed. A child at a sprint covers nearer 2.5 m
     * a cycle. */
    if (this.onGround) {
      const before = this.stride;
      this.stride += (Math.abs(this.vx) / (this.H * 2.1)) * dt;
      /* Each half cycle is a foot going down. It has never made a sound. */
      if (this.onFootfall && Math.floor(before * 2) !== Math.floor(this.stride * 2)) {
        this.onFootfall(Math.floor(this.stride * 2) & 1, this.x, this.y, Math.abs(this.vx));
      }
    }
    const skidding = this.onGround && Math.sign(this.vx) !== 0 &&
      Math.sign(this.vx) !== Math.sign(dir || Math.sign(this.vx)) ? 1 : 0;
    this.skid = damp(this.skid, skidding, 0.002, dt);

    /* Lean into the tow, away from your own acceleration. */
    const want = clamp(this.vx / (K.topSpeed * PX), -1, 1) * 0.20
      + this.pull.x * this.pullAmt * 0.34;
    this.lean = damp(this.lean, want, 0.0012, dt);
    this.armExt = damp(this.armExt, 0.30 + this.pullAmt * 0.34, 0.001, dt);
  }

  /* Told by the game each frame: which way the rope is pulling and how hard. */
  setPull(nx, ny, amount) {
    this.pull.x = damp(this.pull.x, nx, 0.002, 1 / 120);
    this.pull.y = damp(this.pull.y, ny, 0.002, 1 / 120);
    this.pullAmt = damp(this.pullAmt, amount, 0.002, 1 / 120);
  }

  /* --- draw ------------------------------------------------------------ */

  draw(ctx) {
    const H = this.H, F = this.face;
    const cr = this.crouch;
    const squash = 1 + (this.landT / 0.22) * -0.10 + (this.vy < -200 ? 0.05 : 0);
    const lean = this.lean + F * cr * 0.22;
    const hipY = this.y - H * (0.46 - cr * 0.26) * squash;
    const hipX = this.x + lean * H * 0.10 - F * cr * H * 0.05;
    const chestY = hipY - H * (0.24 - cr * 0.05) * squash;
    const chestX = hipX + lean * H * 0.16;
    const headY = chestY - H * 0.15 * squash;
    const headX = chestX + lean * H * 0.10;

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    /* Legs: a two-bone chain per side, driven by the stride phase. */
    const air = !this.onGround;
    for (let s = 0; s < 2; s++) {
      const back = (s === 0);
      const ph = this.stride * Math.PI * 2 + (s ? Math.PI : 0);
      let fx, fy;
      if (air) {
        fx = hipX + F * H * (this.vy < 0 ? 0.02 : 0.14) + (s ? -1 : 1) * H * 0.10;
        fy = hipY + H * (this.vy < 0 ? 0.30 : 0.38);
      } else {
        const amp = clamp(Math.abs(this.vx) / (C.kid.topSpeed * PX), 0, 1);
        fx = hipX + Math.cos(ph) * H * 0.30 * amp + F * H * 0.02
          + (s ? F : -F) * cr * H * 0.10;
        fy = this.y - Math.max(0, Math.sin(ph)) * H * 0.26 * amp;
      }
      const k = ik2(hipX + (s ? -1 : 1) * H * 0.035, hipY, fx, fy - H * 0.02,
        H * 0.235, H * 0.235, -F);
      const col = back ? shade(PAL.kidLegs, -0.26) : PAL.kidLegs;
      ctx.strokeStyle = col; ctx.lineWidth = H * 0.085;
      ctx.beginPath(); ctx.moveTo(hipX + (s ? -1 : 1) * H * 0.035, hipY); ctx.lineTo(k.jx, k.jy); ctx.stroke();
      ctx.lineWidth = H * 0.070;
      ctx.beginPath(); ctx.moveTo(k.jx, k.jy); ctx.lineTo(k.ex, k.ey); ctx.stroke();
      ctx.fillStyle = shade(col, -0.32);
      ctx.beginPath();
      ctx.ellipse(k.ex + F * H * 0.022, k.ey + H * 0.020, H * 0.055, H * 0.032, 0, 0, 6.2832);
      ctx.fill();
    }

    /* Free arm: swings with the stride, or windmills in the air. */
    {
      const ph = this.stride * Math.PI * 2 + Math.PI;
      const amp = clamp(Math.abs(this.vx) / (C.kid.topSpeed * PX), 0.15, 1);
      let hx = chestX - F * H * 0.10 + Math.cos(ph) * H * 0.13 * amp;
      let hy = chestY + H * 0.20 - Math.sin(ph) * H * 0.05 * amp
        + (air ? -H * 0.16 : 0);
      const sh = { x: chestX - F * H * 0.04, y: chestY + H * 0.02 };
      if (cr > 0.3 && this.nose) {
        const w = clamp((cr - 0.3) / 0.5, 0, 1);
        let tx = this.nose.x, ty = this.nose.y;
        const rdx = tx - sh.x, rdy = ty - sh.y, rd = Math.hypot(rdx, rdy) || 1e-6;
        const cap = H * 0.29;
        if (rd > cap) { tx = sh.x + rdx / rd * cap; ty = sh.y + rdy / rd * cap; }
        hx = lerp(hx, tx, w); hy = lerp(hy, ty, w);
      }
      const k = ik2(sh.x, sh.y, hx, hy, H * 0.155, H * 0.150, F);
      ctx.strokeStyle = shade(PAL.kidShirt, -0.28); ctx.lineWidth = H * 0.062;
      ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(k.jx, k.jy); ctx.stroke();
      ctx.lineWidth = H * 0.052;
      ctx.beginPath(); ctx.moveTo(k.jx, k.jy); ctx.lineTo(k.ex, k.ey); ctx.stroke();
      ctx.fillStyle = PAL.kidSkin;
      ctx.beginPath(); ctx.arc(k.ex, k.ey, H * 0.036, 0, 6.2832); ctx.fill();
    }

    /* Torso. */
    ctx.strokeStyle = PAL.kidShirt; ctx.lineWidth = H * 0.155;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(chestX, chestY); ctx.stroke();
    ctx.lineWidth = H * 0.115;
    ctx.beginPath(); ctx.moveTo(chestX, chestY);
    ctx.lineTo(lerp(chestX, headX, 0.55), lerp(chestY, headY, 0.55)); ctx.stroke();

    /* Leash arm. The rope straightens it, and that is the tension gauge —
     * until there is no rope, and then it is just an arm again. */
    {
      const sh = { x: chestX + F * H * 0.05, y: chestY + H * 0.02 };
      let hx = this.handX(), hy = this.handY();
      if (this.free) {
        const ph2 = this.stride * Math.PI * 2;
        const amp2 = clamp(Math.abs(this.vx) / (C.kid.topSpeed * PX), 0.15, 1);
        hx = chestX + F * H * 0.04 + Math.cos(ph2) * H * 0.13 * amp2;
        hy = chestY + H * 0.20 - Math.sin(ph2) * H * 0.05 * amp2 + (air ? -H * 0.16 : 0);
      }
      /* Let the rope pull the whole shoulder, not just straighten the elbow.
       *
       * The rope is anchored at handX()/handY(), which can sit further from
       * the shoulder than the arm is long — so the IK clamped the elbow
       * straight and the fist got painted up to a fifth of a metre short of
       * the rope, which then started in mid-air. On the one connection the
       * player looks at more than any other.
       *
       * Dragging the shoulder closes that gap and does something better as
       * well: being towed finally moves the kid's body instead of only their
       * arm. Capped, so it reads as strain and not dislocation. */
      const reach = H * 0.305;
      if (!this.free) {
        const ddx = hx - sh.x, ddy = hy - sh.y;
        const dd = Math.hypot(ddx, ddy);
        if (dd > reach) {
          const drag = Math.min(dd - reach, H * 0.16);
          sh.x += ddx / dd * drag; sh.y += ddy / dd * drag;
        }
      }
      const k = ik2(sh.x, sh.y, hx, hy, H * 0.155, H * 0.150, -F);
      ctx.strokeStyle = PAL.kidShirt; ctx.lineWidth = H * 0.064;
      ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(k.jx, k.jy); ctx.stroke();
      ctx.lineWidth = H * 0.054;
      ctx.beginPath(); ctx.moveTo(k.jx, k.jy); ctx.lineTo(k.ex, k.ey); ctx.stroke();
      /* The fist. It closes when you grip — the one place the player's own
       * input is drawn — and it half-closes ON ITS OWN when something is about
       * to happen, which is the only invitation the game ever gives. Nothing
       * says "hold on"; the hand just starts to. */
      const urge = this.urge || 0;
      const shut = this.gripped ? 1 : urge * 0.55;
      const r = H * (0.037 + shut * 0.008);
      if (!this.gripped && urge > 0.05) {
        ctx.globalAlpha = urge * 0.5;
        ctx.fillStyle = '#fff3d8';
        ctx.beginPath(); ctx.arc(k.ex, k.ey, r * (1.9 + Math.sin(this.t * 9) * 0.28), 0, 6.2832);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = PAL.kidSkin;
      ctx.beginPath(); ctx.arc(k.ex, k.ey, r, 0, 6.2832); ctx.fill();
      if (shut > 0.15) {
        ctx.strokeStyle = shade(PAL.kidSkin, -0.35);
        ctx.lineWidth = H * 0.010 * (0.5 + shut * 0.5);
        ctx.beginPath(); ctx.arc(k.ex, k.ey, r * 0.62, 0.4, 0.4 + 3.0 * shut); ctx.stroke();
      }
      this.handDrawn = { x: k.ex, y: k.ey };
    }

    /* Head. No face — the body says everything, and a face at this size is
     * two dots that go wrong. */
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(lean * 0.5 + F * cr * 0.25);
    ctx.fillStyle = PAL.kidSkin;
    ctx.beginPath(); ctx.ellipse(0, 0, H * 0.072, H * 0.080, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = PAL.kidHair;
    ctx.beginPath();
    ctx.ellipse(-F * H * 0.010, -H * 0.024, H * 0.075, H * 0.062, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-F * H * 0.062, -H * 0.010, H * 0.030, H * 0.046, 0, 0, 6.2832);
    ctx.fill();
    ctx.restore();
  }

  shadows() {
    return [{ x: this.x, y: this.ground + 2, r: this.H * 0.20, a: this.onGround ? 0.34 : 0.16 }];
  }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
