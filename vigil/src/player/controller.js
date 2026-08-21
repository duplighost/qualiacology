// Player body: COMBAT_FEEL §2 movement on Duskfall's analytic-ground
// collision. The bob phase clock lives HERE and is the single clock for
// camera bob, weapon bob, and footstep audio (two timers = floaty, the
// number-one giveaway of a hobby FPS).

import * as THREE from 'three';
import { TAU, clamp, clamp01, lerp, damp, ease, Spring } from '../engine/math.js';

const WALK = 4.35, SPRINT = 6.60, CROUCH = 2.10, ADS_WALK = 2.95, CROUCH_ADS = 1.55;
const GROUND_ACCEL = 62, AIR_ACCEL = 16, AIR_CAP = 1.40;
const FRICTION = 11.5, STOP_SNAP = 26, GRAVITY = 22, JUMP = 6.40;
const EYE = 1.68, EYE_CROUCH = 1.06, RADIUS = 0.36;
const STICK = 0.42, COYOTE = 0.12, JUMP_BUFFER = 0.16;
const SLIDE_MIN_ENTRY = 5.60, SLIDE_CAP = 9.40, SLIDE_TIME = 0.85, SLIDE_COOLDOWN = 1.10;

export function create(ctx) {
  const input = ctx.systems.input;
  const world = ctx.systems.world;

  const pos = new THREE.Vector3(world.playerStart.x, 0, world.playerStart.z);
  pos.y = world.groundAt(pos.x, pos.z, 50);
  const vel = new THREE.Vector3();
  let grounded = true, sinceGround = 0, jumpBuffered = -1;
  let sprinting = false, crouched = false;
  let crouchT = 0;              // 0 stand .. 1 crouch (190/240 ms)
  let sliding = false, slideT = 0, slideCooldown = 0, slideDir = new THREE.Vector3();
  let bobPhase = 0;             // ONE stride clock, [0, TAU)
  let stepParity = 0;
  let eyeSpring = new Spring(7.5, 0.62);   // landing dip
  let slideEye = new Spring(9, 0.68);      // slide drop overshoot
  let hp = 100, sinceHurt = 99, dead = false;
  const HIT_GRACE = 0.35;      // three simultaneous lunges must not triple-tap
  let fallDamageAccum = 0;

  const wish = new THREE.Vector3();
  const fwd = new THREE.Vector3(), right = new THREE.Vector3();

  function speedCap() {
    const adsT = ctx.systems.weapons ? ctx.systems.weapons.adsT : 0;
    let cap = crouched ? CROUCH : sprinting ? SPRINT : WALK;
    if (adsT > 0.5) cap = crouched ? CROUCH_ADS : ADS_WALK;
    return cap;
  }

  function tryJump() {
    if (sinceGround > COYOTE) return false;
    vel.y = JUMP;
    grounded = false;
    sinceGround = COYOTE + 1;
    if (sliding && slideT > 0.30) {
      // slide-cancel keeps 0.85x of horizontal speed — a combat move, not tech
      vel.x *= 0.85; vel.z *= 0.85;
      endSlide();
    }
    ctx.bus.emit('player:jump');
    return true;
  }

  function startSlide() {
    const hs = Math.hypot(vel.x, vel.z);
    if (hs < SLIDE_MIN_ENTRY || slideCooldown > 0 || !grounded) return;
    sliding = true;
    slideT = 0;
    slideDir.set(vel.x, 0, vel.z).normalize();
    const s = Math.min(hs * 1.28, SLIDE_CAP);
    vel.x = slideDir.x * s;
    vel.z = slideDir.z * s;
    slideEye.set(0);
    slideEye.nudge(-3.4); // the 0.09 m overshoot is the whole feeling
    ctx.bus.emit('player:slide');
  }
  function endSlide() {
    sliding = false;
    slideCooldown = SLIDE_COOLDOWN;
  }

  const api = {
    id: 'player',
    pos, vel,
    radius: RADIUS,
    get eyeY() {
      const stand = lerp(EYE, EYE_CROUCH, ease.outQuad(crouchT));
      const slideDrop = sliding ? lerp(stand, 0.82, clamp01(slideT / 0.14)) + slideEye.value * 0.026 : stand;
      return pos.y + (sliding ? slideDrop : stand) + eyeSpring.value;
    },
    get grounded() { return grounded; },
    get sprinting() { return sprinting; },
    get crouched() { return crouched; },
    get sliding() { return sliding; },
    get slideT() { return slideT; },
    get bobPhase() { return bobPhase; },
    get hp() { return hp; },
    get dead() { return dead; },
    get speed() { return Math.hypot(vel.x, vel.z); },
    get landDip() { return eyeSpring.value; },

    hurt(amount, fromDir) {
      if (dead || ctx.state !== 'playing' || ctx.debug.god) return;
      if (sinceHurt < HIT_GRACE) return;
      hp -= amount;
      sinceHurt = 0;
      ctx.bus.emit('player:hurt', { amount, fromDir, hp });
      if (hp <= 0) {
        hp = 0;
        dead = true;
        ctx.bus.emit('player:died');
      }
    },
    heal(v) { hp = Math.min(100, hp + v); },
    reset() {
      pos.set(world.playerStart.x, 0, world.playerStart.z);
      pos.y = world.groundAt(pos.x, pos.z, 50);
      vel.set(0, 0, 0);
      hp = 100; dead = false; sinceHurt = 99;
      sliding = false; crouched = false; sprinting = false;
      bobPhase = 0;
    },

    update(dt) {
      if (dead) { eyeSpring.update(dt); return; }
      const cam = ctx.systems.camera;
      slideCooldown = Math.max(0, slideCooldown - dt);

      // ---- intent
      const f = (input.held('forward') ? 1 : 0) - (input.held('back') ? 1 : 0);
      const s = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
      fwd.set(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
      right.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
      wish.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, s);
      const hasInput = wish.lengthSq() > 0;
      if (hasInput) wish.normalize();

      // sprint: forward + key; fire/ADS cancels on the input frame
      const wepBlocks = ctx.systems.weapons && (ctx.systems.weapons.wantsSprintCancel);
      sprinting = input.held('sprint') && f > 0 && !crouched && !wepBlocks && grounded && !sliding;

      // crouch + slide entry
      if (input.pressed('crouch')) {
        if (!crouched && sprinting && grounded) startSlide();
        crouched = !crouched;
      }
      if (sliding) crouched = true;
      crouchT = damp(crouchT, crouched ? 1 : 0, crouched ? 12 : 9.5, dt);

      // ---- jump buffering + coyote
      if (input.pressed('jump')) jumpBuffered = JUMP_BUFFER;
      else jumpBuffered -= dt;
      if (jumpBuffered > 0 && tryJump()) jumpBuffered = -1;

      // ---- slide physics
      if (sliding) {
        slideT += dt;
        const fr = 3.40 + 1.60 * slideT;
        const sp = Math.hypot(vel.x, vel.z);
        const ns = Math.max(0, sp - fr * sp * dt * 0.32 - fr * dt);
        if (sp > 0.01) { vel.x *= ns / sp; vel.z *= ns / sp; }
        // ±38°/s of steering, zero acceleration
        if (hasInput) {
          const want = Math.atan2(-wish.x, -wish.z);
          const cur = Math.atan2(-vel.x, -vel.z);
          let d = want - cur;
          while (d > Math.PI) d -= TAU;
          while (d < -Math.PI) d += TAU;
          const turn = clamp(d, -0.663 * dt, 0.663 * dt);
          const cs = Math.cos(turn), sn = Math.sin(turn);
          const vx = vel.x * cs - vel.z * sn, vz = vel.x * sn + vel.z * cs;
          vel.x = vx; vel.z = vz;
        }
        if (slideT >= SLIDE_TIME || ns < 2.60 || !grounded) { endSlide(); crouched = ns < 2.6; }
      } else if (grounded) {
        // ---- Quake-with-snap ground move (COMBAT_FEEL §2.1)
        const cap = speedCap();
        const sp = Math.hypot(vel.x, vel.z);
        const fr = FRICTION * (hasInput ? 0.55 : 1);
        const drop = sp * fr * dt;
        let ns = Math.max(0, sp - drop);
        if (!hasInput && ns < 1.2) ns = Math.max(0, ns - STOP_SNAP * dt);
        if (sp > 0.001) { vel.x *= ns / sp; vel.z *= ns / sp; }
        if (hasInput) {
          const cur = vel.x * wish.x + vel.z * wish.z;
          const add = Math.min(GROUND_ACCEL * dt, Math.max(0, cap - cur));
          vel.x += wish.x * add;
          vel.z += wish.z * add;
          const sp2 = Math.hypot(vel.x, vel.z);
          if (sp2 > cap) { vel.x *= cap / sp2; vel.z *= cap / sp2; }
        }
      } else if (hasInput) {
        // air control, capped so bhop cannot exist
        const cur = vel.x * wish.x + vel.z * wish.z;
        const add = Math.min(AIR_CAP, speedCap()) - cur;
        if (add > 0) {
          const a = Math.min(AIR_ACCEL * dt, add);
          vel.x += wish.x * a;
          vel.z += wish.z * a;
        }
      }

      // ---- gravity + integrate
      vel.y -= GRAVITY * dt;
      const wasAirborne = !grounded;
      const fallSpeed = -vel.y;
      pos.x += vel.x * dt;
      pos.z += vel.z * dt;
      pos.y += vel.y * dt;

      // ---- collide: circle pushout then ground clamp (tunneling impossible)
      world.collideCircle(pos, RADIUS, vel, pos.y);
      const g = world.groundAt(pos.x, pos.z, pos.y + STICK);
      if (pos.y <= g + (vel.y <= 0 ? STICK : 0) && vel.y <= 0.001) {
        pos.y = g;
        if (wasAirborne && fallSpeed > 1.6) {
          const dip = clamp(fallSpeed * 0.030, 0, 0.42);
          eyeSpring.nudge(-dip * 9);
          ctx.bus.emit('player:land', { speed: fallSpeed });
          // 16 m/s ~= a 5.8 m drop is free; stepping off the 9 m deck stings
          // (~29 hp) without reading as a death sentence for one slip.
          if (fallSpeed > 16) api.hurt((fallSpeed - 16) * 8, null);
        }
        vel.y = 0;
        grounded = true;
        sinceGround = 0;
      } else {
        grounded = pos.y <= g + 0.02 && vel.y <= 0;
        sinceGround += dt;
        if (!grounded && pos.y < g) { pos.y = g; vel.y = Math.max(0, vel.y); grounded = true; sinceGround = 0; }
      }

      // ---- the ONE stride clock
      const hSpeed = Math.hypot(vel.x, vel.z);
      if (grounded && hSpeed > 0.4 && !sliding) {
        const stride = sprinting ? 1.86 : crouched ? 1.18 : 1.42;
        const prev = bobPhase;
        bobPhase = (bobPhase + TAU * (hSpeed / stride) * dt * 0.5) % TAU;
        // footfalls at 0 and π crossings
        const half = Math.PI;
        if ((prev < half && bobPhase >= half) || (prev > bobPhase)) {
          stepParity ^= 1;
          ctx.bus.emit('player:step', { sprint: sprinting, crouch: crouched, speed: hSpeed, parity: stepParity });
          if (sprinting) eyeSpring.nudge(0.006 * 9); // subliminal sprint pulse
        }
      }

      eyeSpring.update(dt);
      slideEye.update(dt);

      // ---- regen (delay 4.2 s, 33 hp/s)
      sinceHurt += dt;
      if (sinceHurt > 4.2 && hp > 0) hp = Math.min(100, hp + 33 * dt);
    },
  };
  return api;
}
