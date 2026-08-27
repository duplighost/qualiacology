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
const BODY_STAND = 1.70, BODY_CROUCH = 1.16, BODY_SLIDE = 0.94;
const STICK = 0.42, COYOTE = 0.12, JUMP_BUFFER = 0.16;
const SLIDE_MIN_ENTRY = 5.60, SLIDE_BOOST = 1.38, SLIDE_CAP = 9.75;
const SLIDE_TIME = 1.08, SLIDE_COOLDOWN = 1.10, SLIDE_STEP = 0.15;

export function create(ctx) {
  const input = ctx.systems.input;
  const world = ctx.systems.world;

  const pos = new THREE.Vector3(world.playerStart.x, 0, world.playerStart.z);
  pos.y = world.groundAt(pos.x, pos.z, 50);
  const vel = new THREE.Vector3();
  let grounded = true, sinceGround = 0, jumpBuffered = -1;
  let sprinting = false, crouched = false;
  let standingClear = true;       // refreshed once after each non-slide move
  let crouchT = 0;              // 0 stand .. 1 crouch (190/240 ms)
  let slideViewT = 0;           // camera posture outlives the physical slide
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

  function hasStandingClearance() {
    return !world.canFitBody || world.canFitBody(pos.x, pos.z, RADIUS, pos.y, BODY_STAND);
  }

  function resolveCrouch(crouchHeld = input.held('crouch')) {
    crouched = sliding || crouchHeld || !standingClear;
    return crouched;
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
      resolveCrouch();
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
    const s = Math.min(hs * SLIDE_BOOST, SLIDE_CAP);
    vel.x = slideDir.x * s;
    vel.z = slideDir.z * s;
    slideEye.set(0);
    slideEye.nudge(-3.4); // the 0.09 m overshoot is the whole feeling
    ctx.bus.emit('player:slide');
  }
  function endSlide() {
    if (!sliding) return;
    sliding = false;
    slideCooldown = SLIDE_COOLDOWN;
  }

  const api = {
    id: 'player',
    pos, vel,
    radius: RADIUS,
    get eyeY() {
      const stand = lerp(EYE, EYE_CROUCH, ease.outQuad(crouchT));
      const slideDrop = lerp(stand, 0.82, slideViewT) + slideEye.value * 0.026 * slideViewT;
      return pos.y + slideDrop + eyeSpring.value;
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
      standingClear = true;
      grounded = true; sinceGround = 0; jumpBuffered = -1;
      crouchT = 0; slideViewT = 0; slideT = 0; slideCooldown = 0;
      slideDir.set(0, 0, 0);
      eyeSpring.set(0); slideEye.set(0);
      bobPhase = 0; stepParity = 0;
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

      const crouchHeld = input.held('crouch');
      const crouchPressed = input.pressed('crouch');
      let clearanceQueried = false;

      // The previous frame's post-move clearance is exact for our current
      // position. Using it here lets a released crouch stand before sprint
      // evaluation without issuing the same world query twice this frame. A
      // release edge refreshes first so newly registered/dynamic cover cannot
      // invalidate the cache between frames.
      if (!sliding && input.released('crouch')) {
        standingClear = hasStandingClearance();
        clearanceQueried = true;
      }
      if (!sliding && !crouchHeld) resolveCrouch(false);

      // sprint: forward + key; fire/ADS cancels on the input frame
      const wepBlocks = ctx.systems.weapons && (ctx.systems.weapons.wantsSprintCancel);
      sprinting = input.held('sprint') && f > 0 && !crouched && !wepBlocks && grounded && !sliding;

      // Crouch is a held intent. Its press still starts a sprint slide, but a
      // release never cancels that slide; posture resolves when the move ends.
      if (crouchPressed && !crouched && sprinting && grounded) startSlide();
      if (sliding || crouchHeld) crouched = true;

      // ---- jump buffering + coyote
      if (input.pressed('jump')) jumpBuffered = JUMP_BUFFER;
      else jumpBuffered -= dt;
      if (jumpBuffered > 0 && tryJump()) jumpBuffered = -1;

      // ---- slide physics
      const slideMotion = sliding;
      if (sliding) {
        slideT += dt;
        const phase = clamp01(slideT / SLIDE_TIME);
        const shaped = ease.inQuad(phase);
        const sp = Math.hypot(vel.x, vel.z);
        // Low early drag carries a full-sprint slide roughly 8.7 m; the rising
        // tail keeps the exit readable and prevents an endlessly optimal move.
        const drag = lerp(0.50, 4.60, shaped);
        const rolling = lerp(0.055, 0.24, shaped);
        const ns = Math.max(0, sp - (drag + sp * rolling) * dt);
        if (sp > 0.01) { vel.x *= ns / sp; vel.z *= ns / sp; }
        // About 45–58°/s of authored steering, with zero acceleration.
        if (hasInput) {
          const want = Math.atan2(wish.x, -wish.z);
          const cur = Math.atan2(vel.x, -vel.z);
          let d = want - cur;
          while (d > Math.PI) d -= TAU;
          while (d < -Math.PI) d += TAU;
          const turnRate = lerp(0.78, 1.02, ease.inOutQuad(phase));
          const turn = clamp(d, -turnRate * dt, turnRate * dt);
          const cs = Math.cos(turn), sn = Math.sin(turn);
          const vx = vel.x * cs - vel.z * sn, vz = vel.x * sn + vel.z * cs;
          vel.x = vx; vel.z = vz;
        }
        if (slideT >= SLIDE_TIME || ns < 2.80 || !grounded) {
          endSlide();
          resolveCrouch(crouchHeld);
        }
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
      const bodyHeight = sliding ? BODY_SLIDE : crouched ? BODY_CROUCH : BODY_STAND;
      const travel = Math.hypot(vel.x, vel.z) * dt;
      const moveSteps = slideMotion ? Math.max(1, Math.ceil(travel / SLIDE_STEP)) : 1;
      const moveDt = dt / moveSteps;

      // ---- integrate + collide. Only high-speed slide frames substep; all
      // ordinary movement retains the exact prior single-step dt behavior.
      for (let i = 0; i < moveSteps; i++) {
        pos.x += vel.x * moveDt;
        pos.z += vel.z * moveDt;
        pos.y += vel.y * moveDt;
        world.collideCircle(pos, RADIUS, vel, pos.y, bodyHeight);
      }

      // ---- ground clamp
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

      // Refresh once, after movement: entering low cover crouches and moving
      // clear stands on this frame. The cached result drives next frame's
      // pre-sprint posture without a duplicate query.
      if (!sliding) {
        if (!clearanceQueried) standingClear = hasStandingClearance();
        resolveCrouch(crouchHeld);
      }
      crouchT = damp(crouchT, crouched ? 1 : 0, crouched ? 12 : 9.5, dt);
      slideViewT = damp(slideViewT, sliding ? 1 : 0, sliding ? 10 : 7, dt);

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
