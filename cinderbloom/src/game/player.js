// Capsule controller + camera feel.
//
// INTEGRATOR PASS (post six-agent landing). This file was still the scaffold
// baseline: a heightfield-only controller that walked through every boulder,
// log, fin and hoodoo in the world, had no aim-kick channel for weapons.js to
// read, and never told water.js it was wading. `props.js` published 900
// colliders and a full narrowphase (`resolveSphere` / `surfaceAt`) two stages
// ago, `physics.js` wrapped them in `resolveCapsule` / `groundY` last stage,
// and nothing consumed any of it -- filed under HANDOFF `## requests` by both
// owners. It does now.
//
// What this file owns and publishes:
//   pos / vel / yaw / pitch      world state, metres and radians
//   grounded / surface           what is under the foot, by NAME (physics.surfaceAt)
//   addRecoil(pitch, yaw)        cosmetic view kick (springs back to zero)
//   addAimKick(pitch, yaw)       real aim displacement + `kickAccum` (COMBAT_FEEL 1.3)
//   teleport(p, yaw, pitch)      the vista/respawn hook
//   debugState()                 the __CB.state() dump
import * as THREE from 'three';
import { clamp, damp, Spring, Spring3, TAU, wrapPi } from '../util/math.js';

const EYE = 1.68, CROUCH_EYE = 1.06, RADIUS = 0.36;
const STAND_H = 1.80, CROUCH_H = 1.18;
// A step this tall is climbed rather than blocked. Anything above it is a wall.
const STEP_UP = 0.52;

export class Player {
  static id = 'player';
  static deps = ['terrain', 'input'];

  constructor(ctx) {
    this.ctx = ctx;
    this.pos = new THREE.Vector3(0, 6, 30);
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.grounded = false;
    this.eye = new Spring(EYE, { freq: 9, damping: 1 });
    this.bobT = 0;
    this.lean = new Spring(0, { freq: 7, damping: 0.9 });
    this.punch = new Spring3(0, 0, 0, { freq: 11, damping: 0.55 });
    this.landing = new Spring(0, { freq: 8, damping: 0.6 });
    this._move = { x: 0, y: 0 };
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();

    // COMBAT_FEEL 1.3: the aim kick is a SECOND accumulator, separate from the
    // cosmetic `punch`. It moves where the bullets go; only 72% of it
    // auto-recenters, and player look input eats it before it recenters.
    // weapons.js drives the camera directly and mirrors its own accumulator, so
    // this exists for anything else that wants to kick the aim (explosions,
    // creature slams) without fighting the weapon.
    this.kickAccum = { pitch: 0, yaw: 0 };
    this._kickRest = { pitch: 0, yaw: 0 };
    this._kickHold = 0;

    this.surface = 'ash';
    this.wading = 0;         // metres of liquid at the feet, 0 when dry
    this._stepT = 0;         // stride phase, drives footstep + splash events
    this._lastSplash = -9;
    this._airT = 0;
    this._res = { x: 0, y: 0, z: 0, n: 0, depth: 0, tag: null, groundY: 0, grounded: false };
  }

  async init() {
    const c = this.ctx;
    this.terrain = c.sys.terrain;
    this.input = c.sys.input;
    // Optional on purpose: every one of these is allowed to be missing (the
    // review-set harness boots subsets) and the controller degrades to the
    // heightfield-only behaviour it had before.
    this.physics = c.sys.physics || null;
    this.water = c.sys.water || null;
    this.audio = c.sys.audio || null;
    this.pos.y = this.terrain.heightAt(this.pos.x, this.pos.z) + EYE;
  }

  teleport(p, yaw = this.yaw, pitch = this.pitch) {
    if (p) {
      this.pos.set(p[0], p[1], p[2]);
      this.pos.y = this.terrain.heightAt(this.pos.x, this.pos.z) + EYE;
    }
    this.yaw = yaw; this.pitch = pitch;
    this.vel.set(0, 0, 0);
    this.eye.set(EYE);
    this.bobT = 0;
    this.lean.set(0); this.landing.set(0);
    this.punch.x.set(0); this.punch.y.set(0); this.punch.z.set(0);
    this.kickAccum.pitch = this.kickAccum.yaw = 0;
    this._kickRest.pitch = this._kickRest.yaw = 0;
    this._kickHold = 0;
    this.grounded = true; this._airT = 0; this._stepT = 0;
    // Resolve out of anything the destination happens to be inside. A vista or
    // a respawn point measured against last stage's props can land in a rock,
    // and a player who starts the frame inside a collider gets ejected across
    // the map by the push-out on the first update.
    if (this.physics) {
      let footY = this.pos.y - this.eye.value;
      for (let i = 0; i < 3; i++) {
        const r = this.physics.resolveCapsule(this.pos.x, footY, this.pos.z, RADIUS, STAND_H, this._res);
        if (r.n === 0) break;
        this.pos.x += r.x; this.pos.z += r.z;
      }
      const g = this.physics.groundY(this.pos.x, this.pos.z, footY + 1.2);
      this.pos.y = g + this.eye.value;
      this.surface = this.physics.surfaceAt(this.pos.x, this.pos.z);
      this.wading = this.water?.getDepthAt?.(this.pos.x, this.pos.z) ?? 0;
    }
    this._applyCamera();
    return this;
  }

  /** Cosmetic view kick. Springs fully back; does not move the point of aim. */
  addRecoil(pitchKick, yawKick) {
    this.punch.nudge(yawKick, pitchKick, 0);
  }

  /**
   * Real aim displacement, in RADIANS. Moves the shot, and only `recoverFrac`
   * of it comes back (COMBAT_FEEL 1.3). Player look input is subtracted from
   * the accumulator before recovery runs, so pulling down does not fight the
   * auto-recentre and drag the view at the floor.
   */
  addAimKick(pitchKick, yawKick = 0) {
    this.pitch = clamp(this.pitch + pitchKick, -1.48, 1.48);
    this.yaw = wrapPi(this.yaw + yawKick);
    this.kickAccum.pitch += pitchKick;
    this.kickAccum.yaw += yawKick;
    this._kickRest.pitch = this.kickAccum.pitch;
    this._kickRest.yaw = this.kickAccum.yaw;
    this._kickHold = 0.090;      // COMBAT_FEEL 3.4 hold before recovery starts
  }

  update(dt) {
    const inp = this.input;
    // The director owns the downed interval. Consume pending look so it cannot
    // jump the camera on respawn, and freeze locomotion until the checkpoint
    // actually restores the player. Previously a dead player could sprint,
    // jump and steer for the full respawn delay.
    if (this.ctx.sys.director?.dead) {
      inp.consumeLook();
      this.vel.set(0, 0, 0);
      return;
    }
    const [lx, ly] = inp.consumeLook();
    this.yaw = wrapPi(this.yaw - lx);
    this.pitch = clamp(this.pitch - ly, -1.48, 1.48);

    inp.moveVector(this._move);
    const crouching = inp.crouch;
    const sprinting = inp.sprint && this._move.y > 0.2 && !crouching;
    const speed = crouching ? 2.1 : sprinting ? 6.6 : 4.35;

    // camera basis on the horizontal plane
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    this._fwd.set(-s, 0, -c);
    this._right.set(c, 0, -s);

    const wishX = this._right.x * this._move.x + this._fwd.x * this._move.y;
    const wishZ = this._right.z * this._move.x + this._fwd.z * this._move.y;
    const wl = Math.hypot(wishX, wishZ);
    const wx = wl > 0 ? wishX / wl : 0, wz = wl > 0 ? wishZ / wl : 0;

    // ground accel / friction — snappy on, quick off, the CoD feel
    const accel = this.grounded ? 62 : 16;
    const friction = this.grounded ? 11.5 : 0.4;
    if (wl > 0.01) {
      this.vel.x += wx * accel * dt;
      this.vel.z += wz * accel * dt;
    }
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 0) {
      const drop = hs * friction * dt * (wl > 0.01 ? 0.55 : 1.0);
      const k = Math.max(0, hs - drop) / hs;
      this.vel.x *= k; this.vel.z *= k;
    }
    const hs2 = Math.hypot(this.vel.x, this.vel.z);
    if (hs2 > speed) { const k = speed / hs2; this.vel.x *= k; this.vel.z *= k; }

    this.vel.y -= 22 * dt;
    if (this.grounded && inp.jump) { this.vel.y = 6.4; this.grounded = false; this.audio?.jump?.(); }

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vel.y * dt;

    // --- SOLIDS -------------------------------------------------------------
    // The heightfield is only half of the world's collision. props.js publishes
    // 900 sphere/capsule/box colliders and physics.js wraps them; without this
    // block the player walks through every rock and log in the frame, which is
    // the single most obvious "this is a tech demo" tell in a shooter.
    const ph = this.physics;
    let footY = this.pos.y - this.eye.value;
    let gh = this.terrain.heightAt(this.pos.x, this.pos.z);

    if (ph) {
      const height = crouching ? CROUCH_H : STAND_H;
      // Two passes: the first resolves the deepest contact, the second cleans
      // up the corner case where pushing out of one collider pushed into
      // another. Three would be textbook; two is what a 900-collider scatter
      // with 16 m broadphase cells actually needs, measured.
      for (let i = 0; i < 2; i++) {
        const r = ph.resolveCapsule(this.pos.x, footY, this.pos.z, RADIUS, height, this._res);
        if (r.n === 0) break;
        this.pos.x += r.x; this.pos.z += r.z;
        // A push straight up under STEP_UP is a step, not a wall: take it and
        // keep the horizontal speed. Above that, it is a face and the vertical
        // component is discarded so the player cannot ride up a boulder.
        if (r.y > 0 && r.y <= STEP_UP) footY += r.y;
        // Kill the velocity INTO the surface only — sliding along it is what
        // makes a controller feel smooth rather than sticky.
        const pl = Math.hypot(r.x, r.z);
        if (pl > 1e-5) {
          const nx = r.x / pl, nz = r.z / pl;
          const into = this.vel.x * nx + this.vel.z * nz;
          if (into < 0) { this.vel.x -= into * nx; this.vel.z -= into * nz; }
        }
        if (r.depth < 0.004) break;
      }
      // Standing ON props (a fallen stem, a clinker slab) — props.surfaceAt
      // through physics.groundY, so the top of a log is walkable ground.
      gh = ph.groundY(this.pos.x, this.pos.z, footY + 1.2);
    }

    // ground clamp
    this.pos.y = footY + this.eye.value;
    const foot = this.pos.y - this.eye.value;
    if (foot <= gh + 0.02) {
      if (!this.grounded && this.vel.y < -4) {
        this.landing.nudge(clamp(-this.vel.y * 0.028, 0, 0.5));
        this.audio?.land?.(-this.vel.y);
        this.water?.splash?.(this.pos.x, gh, this.pos.z, clamp(-this.vel.y * 0.12, 0.3, 1.6));
      }
      this.pos.y = gh + this.eye.value;
      this.vel.y = 0;
      this.grounded = true;
      this._airT = 0;
    } else if (foot > gh + 0.06) {
      this.grounded = false;
      this._airT += dt;
    }

    // keep inside the playfield
    const lim = 236;
    this.pos.x = clamp(this.pos.x, -lim, lim);
    this.pos.z = clamp(this.pos.z, -lim, lim);

    // --- what am I standing in / on -----------------------------------------
    // One authority for the surface name so footsteps, impact FX and bullet
    // decals cannot disagree about whether this is ash, sinter, glass or coal.
    if ((this.ctx.time.frame & 7) === 0) {
      this.surface = ph ? ph.surfaceAt(this.pos.x, this.pos.z) : 'ash';
      this.wading = this.water?.getDepthAt?.(this.pos.x, this.pos.z) ?? 0;
    }

    // --- feel
    this.eye.target = crouching ? CROUCH_EYE : EYE;
    this.eye.update(dt);
    const moving = hs2 > 0.4 && this.grounded;
    this.bobT += dt * (moving ? hs2 * 1.62 : 0);
    this.lean.target = clamp(-this._move.x * (sprinting ? 0.055 : 0.032), -0.08, 0.08);
    this.lean.update(dt);
    this.landing.target = 0; this.landing.update(dt);
    this.punch.setTarget(0, 0, 0); this.punch.update(dt);

    // --- aim-kick recovery (COMBAT_FEEL 1.3) ---------------------------------
    // Runs AFTER the look delta has already been applied above, so a player
    // pulling down eats their own kick instead of racing the recentre. weapons.js
    // owns the weapon's kick and mirrors it; this channel is for everything else.
    if (this._kickHold > 0) this._kickHold -= dt;
    else if (this.kickAccum.pitch !== 0 || this.kickAccum.yaw !== 0) {
      const a = 1 - Math.pow(2, -dt / 0.130);
      const restP = this._kickRest.pitch * 0.28, restY = this._kickRest.yaw * 0.28;
      const sp = (this.kickAccum.pitch - restP) * a;
      const sy = (this.kickAccum.yaw - restY) * a;
      this.kickAccum.pitch -= sp; this.kickAccum.yaw -= sy;
      this.pitch = clamp(this.pitch - sp, -1.48, 1.48);
      this.yaw = wrapPi(this.yaw - sy);
      if (Math.abs(this.kickAccum.pitch - restP) < 1e-5) { this.kickAccum.pitch = restP; }
      if (Math.abs(this.kickAccum.yaw - restY) < 1e-5) { this.kickAccum.yaw = restY; }
    }

    // --- wading ripples ------------------------------------------------------
    // water.js drives its own surface deformation from the player, but only
    // knows about it if somebody calls splash(). It returns false and costs
    // nothing when there is no liquid at the point, so this is unconditional.
    if (this.wading > 0.04 && moving && this.grounded) {
      this._stepT += dt * hs2;
      if (this._stepT > 1.55) {
        this._stepT = 0;
        this.water?.splash?.(this.pos.x, this.pos.y - this.eye.value, this.pos.z,
          clamp(0.25 + hs2 * 0.09, 0.25, 1.1));
      }
    }

    this._applyCamera();
  }

  _applyCamera() {
    const cam = this.ctx.camera;
    const amp = clamp(Math.hypot(this.vel.x, this.vel.z) / 6.6, 0, 1);
    const bobY = Math.sin(this.bobT * 2) * 0.036 * amp;
    const bobX = Math.cos(this.bobT) * 0.028 * amp;
    const bobR = Math.sin(this.bobT) * 0.006 * amp;

    cam.position.set(this.pos.x + bobX * 0.4, this.pos.y + bobY - this.landing.value, this.pos.z);
    cam.rotation.set(
      this.pitch + this.punch.y.value - this.landing.value * 0.5,
      this.yaw + this.punch.x.value,
      this.lean.value + bobR,
      'YXZ',
    );
    const vc = this.ctx.viewCamera;
    vc.position.set(0, 0, 0);
    vc.rotation.set(0, 0, this.lean.value * 0.5, 'YXZ');
  }

  debugState() {
    return {
      pos: this.pos.toArray().map(v => +v.toFixed(2)),
      yaw: +this.yaw.toFixed(3), pitch: +this.pitch.toFixed(3),
      speed: +Math.hypot(this.vel.x, this.vel.z).toFixed(2),
      grounded: this.grounded,
      surface: this.surface,
      wading: +this.wading.toFixed(2),
      kick: [+this.kickAccum.pitch.toFixed(4), +this.kickAccum.yaw.toFixed(4)],
      contacts: this._res.n,
    };
  }
}
