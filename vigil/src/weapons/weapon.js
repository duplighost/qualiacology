// The KV-7 "CINDER" — Cinderbloom's hero weapon, transplanted number-for-
// number from its COMBAT_FEEL bible. This file is the ONE owner of trigger,
// recoil, spread, ADS, and reload; combat.js owns only ballistics resolution
// and feedback. (Cinderbloom's dual-ownership split needed a bus latch and an
// outcome-checked melee handshake; we do not repeat it.)

import * as THREE from 'three';
import { TAU, DEG, clamp, clamp01, lerp, ease } from '../engine/math.js';
import { createViewmodel } from './viewmodel.js';

const RPM = 725;
const INTERVAL = 60 / RPM;              // 0.082759 s — 4.966 frames. Sub-frame or bust.
const MAG = 30;
const RESERVE_START = 210, RESERVE_MAX = 270;

// authored 16-shot aim-kick pattern (deg): seven up, drift right, hook left
const PATTERN = [
  [0.62, 0.00], [0.44, 0.06], [0.42, 0.11], [0.40, 0.17],
  [0.38, 0.22], [0.34, 0.26], [0.30, 0.24], [0.26, 0.14],
  [0.22, -0.02], [0.20, -0.18], [0.18, -0.28], [0.16, -0.31],
  [0.15, -0.28], [0.14, -0.20], [0.13, -0.09], [0.12, 0.04],
];
const SUSTAIN_YAW = [0.10, 0.18, 0.12, -0.04, -0.16, -0.22, -0.12, 0.02];
const RECOIL_HOLD = 0.090, RECOVER_FRACTION = 0.72, RECOIL_HL = 0.130;

// [aim, view, weapon] channel multipliers by stance
const MOD = {
  hip: [1, 1, 1], ads: [0.86, 0.55, 0.32],
  crouch: [0.88, 0.90, 0.92], crouchAds: [0.76, 0.50, 0.30],
  air: [1.55, 1.40, 1.25], moving: [1.08, 1.05, 1.00],
};

const SPREAD = { adsStand: 0.050, adsWalk: 0.085, hipStand: 2.100, hipWalk: 2.900 };
const BLOOM = { hipAdd: 0.160, hipCap: 1.300, hipHL: 0.180, adsAdd: 0.012, adsCap: 0.090, adsHL: 0.140, delay: 0.110 };

const ADS_IN = 0.220, ADS_OUT = 0.180;
const SPRINT_OUT = 0.150, INPUT_BUFFER = 0.220;

// Melee — the panic button. COMBAT_FEEL: the wind-up TRAVELS for 200 ms then
// HOLDS still for 60 ms, because anticipation only reads if the motion stops.
// Acquisition is a wide 42-deg cone with the vertical squashed, since a 1.1 m
// thrall at 1.6 m sits ~35 deg BELOW the eye and a camera-axis ray simply
// cannot hit anything shorter than you are.
const MELEE = {
  windup: 0.260, travel: 0.200, active: 0.140, recover: 0.380,
  damage: 130, range: 2.05, assist: 2.70, coneDeg: 42, ySquash: 0.55,
  hitstop: 0.075, cooldown: 0.0,
};

// reload beat sheet (s). tac / empty
const RELOAD_TAC = 2.100, RELOAD_EMPTY = 2.850;
const BEATS_TAC = [
  ['release', 0.130], ['drop', 0.190], ['enter', 0.620], ['contact', 0.900],
  ['seat', 1.080], ['tug', 1.420], ['cancelopen', 1.560],
];
const BEATS_EMPTY = [
  ['release', 0.130], ['drop', 0.210], ['enter', 0.700], ['contact', 1.010],
  ['seat', 1.180], ['boltrelease', 1.940], ['cancelopen', 2.340],
];

export function create(ctx) {
  const input = ctx.systems.input;
  const rng = ctx.rng.fork('recoil');
  const spreadRng = ctx.rng.fork('spread');

  let ammo = MAG, reserve = RESERVE_START, chambered = true;
  let fireClock = 0, firing = false, shotIndex = 0, sinceShot = 99;
  let fireCount = 0;
  let kickPitch = 0, kickYaw = 0;          // aim-kick accumulator (deg)
  let recoverTargetP = 0, recoverTargetY = 0, recovering = false;
  let bloom = 0;
  let adsT = 0, fullyAdsFor = 0;
  let sprintOutTimer = 0;                  // counts down after sprint cancel
  let buffered = 0;                        // fire input buffer
  let reloading = null;                    // {empty, t, dur, beats, bi, credited, cancelable}
  let dryLatch = false, dryHeld = 0;
  let heat = 0, roundsRecent = 0;
  const fireTimes = [];                    // ideal sim-time of each shot (feel gate)
  let melee = null;                        // {t, phase, target, struck}
  let meleeBuffered = 0, meleeCount = 0;

  const vm = createViewmodel(ctx);
  const _dir = new THREE.Vector3(), _right = new THREE.Vector3(), _upv = new THREE.Vector3();

  function stanceMods() {
    const p = ctx.systems.player;
    let m = adsT > 0.55
      ? (p.crouched ? MOD.crouchAds : MOD.ads)
      : (p.crouched ? MOD.crouch : MOD.hip);
    let out = [m[0], m[1], m[2]];
    if (!p.grounded) { out = out.map((v, i) => v * MOD.air[i]); }
    else if (p.speed > 3) { out = out.map((v, i) => v * MOD.moving[i]); }
    return out;
  }

  function currentCone() {
    const p = ctx.systems.player;
    const moving = p.speed > 0.5;
    let cone = adsT > 0.55
      ? (moving ? SPREAD.adsWalk : SPREAD.adsStand)
      : (moving ? SPREAD.hipWalk : SPREAD.hipStand);
    if (p.crouched) cone *= 0.78;
    if (!p.grounded) cone *= 2.40;
    if (p.sliding) cone *= 1.35;
    if (sprintOutTimer > 0) cone = lerp(cone, 4.600, clamp01(sprintOutTimer / 0.220));
    cone += bloom;
    // first-shot-perfect: within 250 ms of completing ADS, shot 1 is exact
    if (adsT >= 0.999 && fullyAdsFor <= 0.250 && shotIndex === 0) cone = 0;
    return cone;
  }

  /**
   * Acquire a melee target: nearest enemy inside the assist range whose
   * bearing is within the cone, measured with Y squashed so a creature at
   * your feet costs the same as one at your shoulder. Locked at commit, then
   * re-checked every active frame so an escape is a real miss.
   */
  function acquireMelee() {
    const p = ctx.systems.player;
    const cam = ctx.systems.camera;
    cam.aimDir(_dir);
    const ex = p.pos.x, ey = p.eyeY, ez = p.pos.z;
    const cosCone = Math.cos(MELEE.coneDeg * DEG);
    const S = MELEE.ySquash;
    // Both the reach AND the cone are measured with Y squashed. Squashing the
    // range only was not enough: a 1.1 m thrall at 1.6 m sits ~35 deg below
    // the eye, and one metre of downhill terrain pushes it outside a raw
    // 42-deg cone. In squashed space a metre of vertical costs 0.55 m of
    // lateral, which is what makes a swing feel like an arc instead of a ray.
    const ax = _dir.x, ay = _dir.y * S, az = _dir.z;
    const an = Math.max(1e-4, Math.hypot(ax, ay, az));
    let best = null;
    for (const e of ctx.systems.enemies.all) {
      if (!e.alive) continue;
      const vx = e.pos.x - ex;
      const vy = ((e.pos.y + e.def.height * 0.5) - ey) * S;
      const vz = e.pos.z - ez;
      const d = Math.hypot(vx, vy, vz);
      if (d > MELEE.assist + e.def.radius) continue;
      const dot = (vx * ax + vy * ay + vz * az) / (Math.max(1e-4, d) * an);
      if (dot < cosCone) continue;
      if (!best || d < best.d) best = { e, d };
    }
    return best;
  }

  function startMelee() {
    if (melee) return;
    melee = { t: 0, phase: 'windup', target: null, struck: false };
    if (reloading) cancelReload();
    ctx.bus.emit('weapon:melee:start');
    vm.onMeleeStart();
  }

  function startReload() {
    if (reloading || reserve <= 0) return;
    const empty = ammo === 0;
    if (ammo >= MAG + (chambered ? 1 : 0)) return;
    reloading = {
      empty, t: 0,
      dur: empty ? RELOAD_EMPTY : RELOAD_TAC,
      beats: empty ? BEATS_EMPTY : BEATS_TAC,
      bi: 0, credited: false, cancelable: false,
    };
    ctx.bus.emit('weapon:reload:start', { empty });
  }

  function creditReload() {
    const keep = reloading.empty ? 0 : ammo;
    const want = MAG + (keep > 0 ? 1 : 0) - keep;
    const take = Math.min(want, reserve);
    ammo = keep + take;
    reserve -= take;
    chambered = ammo > 0;
    reloading.credited = true;
    ctx.bus.emit('weapon:ammo', { ammo, reserve });
  }

  function cancelReload() {
    if (!reloading) return;
    ctx.bus.emit('weapon:reload:cancel', { credited: reloading.credited });
    reloading = null;
    vm.onReloadEnd();
  }

  function fire(subT) {
    ammo--;
    chambered = ammo > 0;
    fireCount++;
    const idx = shotIndex++;
    sinceShot = 0;
    recovering = false;
    heat = Math.min(1, heat + 0.030);
    roundsRecent = Math.min(30, roundsRecent + 1);

    // ---- recoil: three channels
    const [mA, mV, mW] = stanceMods();
    let pk, yk;
    if (idx < PATTERN.length) { [pk, yk] = PATTERN[idx]; }
    else {
      pk = 0.12;
      yk = SUSTAIN_YAW[(idx - PATTERN.length) % SUSTAIN_YAW.length];
      const j = 1 + (rng.next() * 2 - 1) * 0.08;
      pk *= j; yk *= j;
    }
    // (no extra first-shot multiplier: the authored table's 0.62 opener IS the
    // 1.41x boost — applying it again double-counts and breaks the 3.58° sum)
    const cam = ctx.systems.camera;
    cam.pitch += pk * mA * DEG;
    cam.yaw += -yk * mA * DEG;           // +yaw pattern = right = negative world yaw
    kickPitch += pk * mA;
    kickYaw += yk * mA;
    cam.addPunch(pk * 1.6 * mV, yk * 1.4 * mV, (idx % 2 ? 0.9 : -0.9) * mV);
    vm.kick(idx, mW);

    // ---- spread sample: uniform disc
    const cone = currentCone() * DEG;
    const u = spreadRng.next(), a = spreadRng.next() * TAU;
    const r = cone * Math.sqrt(u);
    cam.aimDir(_dir);
    _right.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
    _upv.crossVectors(_right, _dir).normalize();
    _dir.addScaledVector(_right, Math.cos(a) * r).addScaledVector(_upv, Math.sin(a) * r).normalize();

    bloom = Math.min(adsT > 0.55 ? BLOOM.adsCap : BLOOM.hipCap, bloom + (adsT > 0.55 ? BLOOM.adsAdd : BLOOM.hipAdd));

    fireTimes.push(ctx.time - subT);
    if (fireTimes.length > 64) fireTimes.shift();
    const tracerRound = (fireCount % 3 === 0) || ammo < 3;
    ctx.bus.emit('weapon:fire', {
      dir: _dir.clone(),
      origin: new THREE.Vector3(ctx.systems.player.pos.x, ctx.systems.player.eyeY, ctx.systems.player.pos.z),
      subT, index: idx, tracer: tracerRound, lowAmmo: ammo <= 5,
    });
    vm.flash(subT, adsT);
    ctx.shared.flashEV = 0.35;
    if (ammo === 0) ctx.bus.emit('weapon:boltlock');
  }

  const api = {
    id: 'weapons',
    get adsT() { return adsT; },
    get fovPunch() { return 0; },
    get spreadDeg() { return currentCone(); },
    get wantsSprintCancel() { return input.fire || input.aim || buffered > 0 || !!reloading; },
    get fireCount() { return fireCount; },
    get heat() { return heat; },
    viewScene: vm.scene,
    viewCamera: vm.camera,
    ammoState: () => ({ ammo, reserve, reloading: !!reloading }),
    kickState: () => ({ pitch: kickPitch, yaw: kickYaw }),
    get fireTimes() { return fireTimes; },
    get meleeCount() { return meleeCount; },
    get meleeState() { return melee && { phase: melee.phase, t: melee.t, hasTarget: !!melee.target, struck: melee.struck }; },
    meleeSpec: MELEE,
    sightScreenOffset: () => vm.sightScreenOffset(),
    addReserve(n) {
      const got = Math.min(n, RESERVE_MAX - reserve);
      reserve += got;
      if (got > 0) ctx.bus.emit('weapon:ammo', { ammo, reserve });
      return got;
    },
    dump: () => ({
      ammo, reserve, adsT, spreadDeg: currentCone(), bloom, kickPitch, kickYaw,
      shotIndex, fireClock, sprintOutTimer, reloading: reloading && { t: reloading.t, empty: reloading.empty },
      heat, fireCount,
    }),
    reset() {
      ammo = MAG; reserve = RESERVE_START; chambered = true;
      fireClock = INTERVAL;                 // primed: the first pull is instant
      shotIndex = 0; kickPitch = 0; kickYaw = 0; bloom = 0;
      adsT = 0; reloading = null; dryLatch = false; heat = 0; fireCount = 0;
      fireTimes.length = 0;
      melee = null; meleeBuffered = 0; meleeCount = 0;
      vm.onMeleeEnd();
    },
    onResize(w, h) { vm.onResize(w, h); },
    warmup() { vm.warmup(); },
    renderOverlay() { vm.render(); },

    update(dt, realDt) {
      const p = ctx.systems.player;
      const cam = ctx.systems.camera;
      sinceShot += dt;
      heat = Math.max(0, heat + (firing ? 0.42 * dt : 0) - 0.16 * dt);
      roundsRecent = Math.max(0, roundsRecent - 4.2 * dt);

      // ---- ADS (interruptible, never restarts)
      const wantAds = input.aim && !p.sprinting && !melee && !(reloading && !reloading.cancelable);
      adsT = clamp01(adsT + (wantAds ? dt / ADS_IN : -dt / ADS_OUT));
      fullyAdsFor = adsT >= 0.999 ? fullyAdsFor + dt : 0;

      // ---- sprint-out gate
      if (p.sprinting) sprintOutTimer = SPRINT_OUT;
      else sprintOutTimer = Math.max(0, sprintOutTimer - dt);

      // ---- input buffering
      if (input.firePressed) buffered = INPUT_BUFFER;
      else buffered = Math.max(0, buffered - dt);
      if (input.pressed('melee')) meleeBuffered = INPUT_BUFFER;
      else meleeBuffered = Math.max(0, meleeBuffered - dt);

      // ---- melee: one owner, whole timeline here. Legal from sprint and
      // mid-reload — it is the answer to something already on top of you.
      if (meleeBuffered > 0 && !melee && ctx.state === 'playing' && !p.dead) {
        meleeBuffered = 0;
        startMelee();
      }
      if (melee) {
        melee.t += dt;
        if (melee.phase === 'windup') {
          if (melee.t >= MELEE.windup) {
            melee.phase = 'active';
            melee.t -= MELEE.windup;
            const got = acquireMelee();
            melee.target = got ? got.e : null;
          }
        } else if (melee.phase === 'active') {
          // trace every active frame; the lock must still be in range or the
          // escape counts as a real miss
          if (!melee.struck && melee.target) {
            const still = acquireMelee();
            if (still && still.e === melee.target) {
              melee.struck = true;
              ctx.systems.combat.meleeStrike(melee.target, MELEE.damage);
              ctx.systems.fx.hitstop(MELEE.hitstop);
              // the kick goes DOWN: a kick that goes up is a recoil, not an impact
              cam.addPunch(-1.9, 0.9, 2.6);
              vm.onMeleeConnect();
            }
          }
          if (melee.t >= MELEE.active) { melee.phase = 'recover'; melee.t -= MELEE.active; }
        } else if (melee.t >= MELEE.recover) {
          melee = null;
          meleeCount++;
          vm.onMeleeEnd();
        }
      }

      // ---- reload timeline
      if (input.pressed('reload')) startReload();
      if (reloading) {
        reloading.t += dt;
        while (reloading.bi < reloading.beats.length && reloading.t >= reloading.beats[reloading.bi][1]) {
          const [name] = reloading.beats[reloading.bi++];
          if (name === 'seat' && !reloading.empty) creditReload();
          if (name === 'boltrelease') creditReload();
          if (name === 'cancelopen') reloading.cancelable = true;
          ctx.bus.emit('weapon:reload:beat', { name, empty: reloading.empty });
          vm.onReloadBeat(name);
        }
        if (reloading.t >= reloading.dur) {
          ctx.bus.emit('weapon:reload:finish', {});
          reloading = null;
          vm.onReloadEnd();
        } else if ((input.fire || buffered > 0 || input.aimPressed) && reloading.cancelable) {
          cancelReload();
        }
      }

      // ---- trigger
      const canFire = !reloading && !melee && sprintOutTimer <= 0 && ctx.state === 'playing' && !p.dead;
      const wantFire = input.fire || buffered > 0;
      firing = false;
      if (wantFire && canFire && ammo > 0) {
        buffered = 0;
        dryLatch = false;
        firing = true;
        fireClock += dt;
        while (fireClock >= INTERVAL) {
          if (ammo <= 0) { fireClock = 0; break; }
          fireClock -= INTERVAL;
          fire(fireClock);
        }
      } else {
        // keep the clock primed so the first shot is instant, never late
        fireClock = Math.min(fireClock + dt, INTERVAL);
        if (wantFire && canFire && ammo === 0) {
          if (!dryLatch) {
            dryLatch = true;
            ctx.bus.emit('weapon:dryfire');
          }
          dryHeld += dt;
          if (dryHeld > 0.700) { dryHeld = 0; startReload(); }
        } else {
          dryHeld = 0;
          if (!wantFire) dryLatch = false;
        }
      }
      if (!firing && sinceShot > 0.4) shotIndex = 0;

      // ---- bloom decay (after 110 ms)
      if (sinceShot > BLOOM.delay) {
        const hl = adsT > 0.55 ? BLOOM.adsHL : BLOOM.hipHL;
        bloom *= Math.pow(0.5, dt / hl);
        if (bloom < 0.001) bloom = 0;
      }

      // ---- recoil recovery: 72% returns, half-life 130 ms, after 90 ms hold.
      // Player counter-input eats the accumulator FIRST (or the auto-recentre
      // fights the player and drags their view to the floor).
      const look = cam.lookDelta;
      if (kickPitch > 0 && look.pitch < 0) {
        const eaten = Math.min(kickPitch, -look.pitch / DEG);
        kickPitch -= eaten;
      }
      if (kickYaw !== 0 && Math.sign(-look.yaw) === Math.sign(kickYaw) && look.yaw !== 0) {
        const eatenY = Math.min(Math.abs(kickYaw), Math.abs(look.yaw) / DEG);
        kickYaw -= Math.sign(kickYaw) * eatenY;
      }
      if (sinceShot > RECOIL_HOLD && (kickPitch > 0.001 || Math.abs(kickYaw) > 0.001)) {
        if (!recovering) {
          recovering = true;
          recoverTargetP = kickPitch * (1 - RECOVER_FRACTION);
          recoverTargetY = kickYaw * (1 - RECOVER_FRACTION);
        }
        const k = 1 - Math.pow(0.5, dt / RECOIL_HL);
        const rp = (kickPitch - recoverTargetP) * k;
        const ry = (kickYaw - recoverTargetY) * k;
        kickPitch -= rp;
        kickYaw -= ry;
        cam.pitch -= rp * DEG;
        cam.yaw -= -ry * DEG;
      }

      // exposure transient decay
      ctx.shared.flashEV *= Math.pow(0.5, realDt / 0.083);

      vm.update(dt, {
        adsT, firing, sinceShot, ammo, mag: MAG, heat, roundsRecent,
        sprintT: p.sprinting ? 1 : 0, reloading, melee, meleeSpec: MELEE,
      });
    },

    lateUpdate(dt) {
      vm.lateUpdate(dt);
    },
  };
  return api;
}
