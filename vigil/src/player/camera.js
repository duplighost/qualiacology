// Camera: PURE aim state (yaw/pitch) + additive juice applied at render time
// only — punch spring (view kick), trauma shake, bob, landing dip, lean, FOV
// pipeline. Juice can never corrupt aim (Duskfall discipline). The weapon
// writes aim kick into yaw/pitch and reads lookDelta to give the player's
// counter-input first claim on the recoil accumulator.

import * as THREE from 'three';
import { TAU, DEG, clamp, clamp01, lerp, damp, ease, Spring3 } from '../engine/math.js';

const BASE_FOV = 65;                 // vertical; = CoD slider 80 @16:9
const ADS_ZOOM = 1.18;
const SENS = 0.0022;                 // rad/px
const PITCH_LIMIT = Math.PI / 2 - 0.04;

export function create(ctx) {
  const input = ctx.systems.input;
  const player = ctx.systems.player;
  const camera = ctx.camera;

  let yaw = 0;                       // start facing the relay (-Z) from +Z
  let pitch = 0;
  let lookDeltaPitch = 0, lookDeltaYaw = 0;
  const punch = new Spring3(13, 0.42);   // view kick (visual only)
  let trauma = 0;
  let shakeT = 0;
  let sprintT = 0, slideFovT = 0;

  const api = {
    id: 'camera',
    get yaw() { return yaw; },
    set yaw(v) { yaw = v; },
    get pitch() { return pitch; },
    set pitch(v) { pitch = clamp(v, -PITCH_LIMIT, PITCH_LIMIT); },
    /** the player's OWN look input applied this step (radians). */
    get lookDelta() { return { pitch: lookDeltaPitch, yaw: lookDeltaYaw }; },
    /** view kick: visual-only punch, recovers to zero (deg). */
    addPunch(pitchDeg, yawDeg, rollDeg) {
      punch.x.nudge(pitchDeg * DEG * 22);
      punch.y.nudge(yawDeg * DEG * 22);
      punch.z.nudge(rollDeg * DEG * 22);
    },
    addTrauma(v) { trauma = Math.min(1, trauma + v); },
    get fov() { return camera.fov; },
    /** world-space aim direction (recoil-included — shots track the kick). */
    aimDir(out) {
      out.set(
        -Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch),
      );
      return out;
    },

    update(dt) {
      // ---- look input (ADS sensitivity: zoom-relative)
      const wep = ctx.systems.weapons;
      const adsT = wep ? wep.adsT : 0;
      const sensMult = lerp(1, 0.847, adsT);
      const { dx, dy } = input.consumeLook();
      lookDeltaYaw = -dx * SENS * sensMult;
      lookDeltaPitch = -dy * SENS * sensMult;
      yaw = (yaw + lookDeltaYaw) % TAU;
      pitch = clamp(pitch + lookDeltaPitch, -PITCH_LIMIT, PITCH_LIMIT);

      punch.update(dt);
      trauma = Math.max(0, trauma - 1.6 * dt);
      shakeT += dt * 28;
      sprintT = damp(sprintT, player.sprinting ? 1 : 0, player.sprinting ? 9 : 13, dt);
      slideFovT = damp(slideFovT, (player.sliding && player.slideT < 0.4) ? 1 : 0, 10, dt);

      // ---- FOV pipeline: ADS eased both ends (front-loaded zoom = nausea)
      const adsEase = ease.inOutQuad(adsT);
      const adsFov = 2 * Math.atan(Math.tan(BASE_FOV * DEG / 2) / ADS_ZOOM) / DEG;
      let fov = lerp(BASE_FOV, adsFov, adsEase);
      fov += 6.5 * ease.outCubic(sprintT) * (1 - adsEase);
      fov += 3.5 * slideFovT;
      if (wep) fov += wep.fovPunch || 0;
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    },

    /** compose the final camera transform (render time, after sim). */
    lateUpdate(dt) {
      const wep = ctx.systems.weapons;
      const adsT = wep ? wep.adsT : 0;

      // bob from the ONE stride clock (COMBAT_FEEL §1.4)
      const t = player.bobPhase * 2;      // phase stored at half rate
      const spd = player.speed;
      const ref = player.sprinting ? 6.6 : player.crouched ? 2.1 : 4.35;
      const amp = Math.pow(clamp(spd / ref, 0, 1.6), 0.85) * (player.grounded && !player.sliding ? 1 : 0) * lerp(1, 0.25, adsT);
      const Ay = player.sprinting ? 0.038 : player.crouched ? 0.011 : 0.021;
      const Ax = player.sprinting ? 0.026 : player.crouched ? 0.009 : 0.014;
      const Ar = (player.sprinting ? 1.15 : player.crouched ? 0.22 : 0.42) * DEG;
      const bobY = -Ay * Math.cos(2 * t) * amp;
      const bobX = Ax * Math.sin(t) * amp;
      const bobRoll = Ar * Math.sin(t + 0.35) * amp * (1 - adsT);
      const bobPitch = player.sprinting ? -0.55 * DEG * Math.cos(2 * t) * amp : 0;

      // shake: rotational, amplitude trauma-shaped
      const sAmp = trauma * (0.4 + 0.6 * trauma);
      const shP = Math.sin(shakeT * 1.13) * 0.09 * sAmp * (1 - adsT * 0.6);
      const shY = Math.sin(shakeT * 0.97 + 4.2) * 0.09 * sAmp;
      const shR = Math.sin(shakeT * 1.31 + 1.7) * 0.10 * sAmp;

      // lean: strafe + slide cant
      const strafe = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
      const lean = -strafe * 0.032 * (1 - adsT) - (player.sliding ? 4.5 * DEG : 0) * (player.sliding ? clamp01(player.slideT / 0.16) : 0);

      camera.position.set(player.pos.x + bobX * Math.cos(yaw), player.eyeY + bobY, player.pos.z - bobX * Math.sin(yaw));
      camera.rotation.order = 'YXZ';
      camera.rotation.set(
        pitch + punch.x.value + shP + bobPitch + (player.landDip * -0.35),
        yaw + punch.y.value + shY,
        punch.z.value + shR + bobRoll + lean,
      );
    },
  };
  return api;
}
