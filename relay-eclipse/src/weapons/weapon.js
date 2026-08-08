// Weapons + viewmodels. The viewmodel is rendered in a separate overlay scene
// with its own camera (depth cleared) so the gun never clips through walls —
// a hallmark of a polished FPS. Firing is hitscan with spread "bloom" that
// grows while shooting/moving and recovers when you stop. Each shot drives
// recoil, FOV punch, screen shake, muzzle flash, a tracer, smoke and brass.

import * as THREE from 'three';
import { clamp, clamp01, damp, rand, randSign, lerp } from '../engine/math.js';

// Each role has a magazine and a reserve pool. Reloads borrow VANTA//9's crisp
// military cadence, but never lock movement: a loaded tactical reload can be
// cancelled by firing, weapon switching is immediate, and an empty magazine
// reloads automatically. `capacity` caps reserve ammunition, while `start` is
// the total ammunition split between magazine and reserve on spawn. `ads` and
// `rest` describe the procedural viewmodel poses.
export const WEAPONS = {
  pistol: {
    kind: 'pistol', slot: 1, name: 'PULSE SIDEARM', auto: false,
    damage: 38, headMult: 2.35, fireInterval: 0.22,
    capacity: 116, start: 70, magSize: 16, reloadTime: 0.92, drop: 14, finisher: 18,
    recoilPitch: 0.026, recoilYaw: 0.013, pellets: 1,
    spreadBase: 0.0015, spreadMove: 0.010, spreadBloom: 0.0032, spreadMax: 0.028,
    range: 190, falloffStart: 72, falloffMin: 0.68,
    fovPunch: 0.85, shake: 0.045, tracer: 0x6eefff, sound: 'pistol',
    rest: new THREE.Vector3(0.22, -0.29, -0.54),
    ads: new THREE.Vector3(-0.012, -0.235, -0.42),
    viewScale: 1.08, muzzleZ: -0.55, flashScale: 0.038,
  },
  smg: {
    kind: 'smg', slot: 2, name: 'RELAY CARBINE', auto: true,
    damage: 15, headMult: 1.65, fireInterval: 0.058,
    capacity: 280, start: 168, magSize: 36, reloadTime: 1.24, drop: 30, finisher: 40,
    recoilPitch: 0.011, recoilYaw: 0.009, pellets: 1,
    // VANTA//9's strongest donor idea, repaired here: a learnable horizontal
    // ladder with a real per-burst reset. VANTA indexed after incrementing and
    // never reset its global shot counter, so its authored first step and
    // first-shot character were effectively lost after the opening burst.
    recoilPatternDeg: [-0.09, 0.07, 0.11, -0.04, 0.14, 0.02, -0.13, 0.10, 0.16, -0.07, 0.03, 0.12],
    recoilReset: 0.165, recoilFirstMult: 1.18,
    spreadBase: 0.006, spreadMove: 0.026, spreadBloom: 0.0065, spreadMax: 0.078,
    range: 118, falloffStart: 34, falloffMin: 0.40,
    fovPunch: 0.5, shake: 0.035, tracer: 0xffe36e, sound: 'gunshot', soundStrength: 0.72,
    rest: new THREE.Vector3(0.255, -0.275, -0.59),
    ads: new THREE.Vector3(-0.018, -0.225, -0.43),
    viewScale: 1.0, muzzleZ: -0.75, flashScale: 0.038,
  },
  rifle: {
    // Keep the historical `rifle` key for API compatibility; its role is now
    // the semi-automatic marksman weapon from the four-slot APEX synthesis.
    kind: 'rifle', slot: 4, name: 'LONGBOW MR', auto: false,
    damage: 54, headMult: 2.4, fireInterval: 0.28,
    capacity: 94, start: 52, magSize: 12, reloadTime: 1.38, drop: 12, finisher: 16,
    recoilPitch: 0.036, recoilYaw: 0.012, pellets: 1,
    spreadBase: 0.0007, spreadMove: 0.012, spreadBloom: 0.003, spreadMax: 0.026,
    range: 340, falloffStart: 180, falloffMin: 0.78,
    fovPunch: 2.2, shake: 0.11, tracer: 0xd0a2ff, sound: 'gunshot', soundStrength: 1.2,
    rest: new THREE.Vector3(0.275, -0.255, -0.64),
    ads: new THREE.Vector3(-0.018, -0.215, -0.46),
    viewScale: 1.08, muzzleZ: -1.06, flashScale: 0.052,
  },
  shotgun: {
    kind: 'shotgun', slot: 3, name: 'BREACH SCATTERGUN', auto: false,
    damage: 17, headMult: 1.55, fireInterval: 0.34,
    capacity: 68, start: 38, magSize: 8, reloadTime: 1.08, drop: 7, finisher: 9,
    recoilPitch: 0.055, recoilYaw: 0.026, pellets: 10,
    spreadBase: 0.045, spreadMove: 0.022, spreadBloom: 0.008, spreadMax: 0.115,
    range: 52, falloffStart: 9, falloffMin: 0.22,
    fovPunch: 4.5, shake: 0.32, tracer: 0xfff0a8, sound: 'shotgun',
    rest: new THREE.Vector3(0.28, -0.265, -0.64),
    ads: new THREE.Vector3(-0.018, -0.23, -0.47),
    viewScale: 1.05, muzzleZ: -1.03, flashScale: 0.078,
  },
};

// Exported so future HUD/touch affordances and deterministic tests can share
// the canonical slot order instead of duplicating it.
export const WEAPON_ORDER = Object.freeze(['pistol', 'smg', 'shotgun', 'rifle']);
const ORDER = WEAPON_ORDER;
const REST = new THREE.Vector3(0.26, -0.26, -0.62);

export class Weapons {
  constructor(ctx) {
    // ctx: { fx, audio, cam, mainCamera, hitscan(origin,dir,range), applyDamage }
    this.ctx = ctx;
    this.viewScene = new THREE.Scene();
    this.viewCamera = new THREE.PerspectiveCamera(70, 1, 0.01, 10);
    // Preserve the procedural overlay even when a loaded high-resolution
    // viewmodel temporarily becomes the public render target.
    this._proceduralViewScene = this.viewScene;
    this._proceduralViewCamera = this.viewCamera;
    this._realisticViewmodels = Object.create(null);
    // Compatibility alias: always points at the currently selected authored
    // viewmodel, or null when that slot is using its procedural fallback.
    this._realisticViewmodel = null;
    this.viewScene.add(new THREE.HemisphereLight(0xbfd4ff, 0x30301f, 0.9));
    const key = new THREE.DirectionalLight(0xffe6c0, 2.2); // warm golden-hour key
    key.position.set(-0.6, 1, 0.8);
    this.viewScene.add(key);
    const rim = new THREE.DirectionalLight(0x9fb8ff, 0.7); // cool sky rim
    rim.position.set(1, 0.4, -1);
    this.viewScene.add(rim);

    this.models = {};
    this.ammo = {};
    this.reserve = {};
    this.recoilStep = {};
    this.recoilIdle = {};
    for (const id of ORDER) {
      const m = buildViewmodel(WEAPONS[id]);
      m.visible = false;
      this.viewScene.add(m);
      this.models[id] = m;
      this.ammo[id] = Math.min(WEAPONS[id].magSize, WEAPONS[id].start);
      this.reserve[id] = Math.max(0, WEAPONS[id].start - this.ammo[id]);
      this.recoilStep[id] = 0;
      this.recoilIdle[id] = Infinity;
    }

    // The SMG inherits the old carbine's immediate, hold-trigger flow, making
    // the expanded arsenal additive rather than changing the opening feel.
    this.current = 'smg';
    this.def = WEAPONS.smg;
    this.model = this.models.smg;
    this.model.visible = true;
    this.capacityMult = 1;   // raised by the "+max ammo" upgrade

    this.fireTimer = 0;
    this.switchTimer = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.reloadDuration = 0;
    this.reloadMidPlayed = false;
    this.reloadWasEmpty = false;
    this.spread = this.def.spreadBase;
    this.aimT = 0;               // ADS blend, read from the camera each frame

    // animated viewmodel offsets
    this.pos = REST.clone();
    this.rot = new THREE.Vector3();
    this.kick = 0;           // recoil push-back amount
    this.kickRot = 0;
    this.sway = new THREE.Vector2();
    this.bobPhase = 0;
    this.raiseT = 0;         // 0 = lowered, 1 = up

    // muzzle flash sprite in view space
    this.muzzle = new THREE.Group();
    const flashTex = makeFlashTexture();
    this.flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flashTex, color: 0xffd27f, blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false,
    }));
    this.flashSprite.scale.set(0.5, 0.5, 0.5);
    this.flashSprite.material.opacity = 0;
    this.muzzle.add(this.flashSprite);
    this.viewScene.add(this.muzzle);
    this.flashLife = 0;

    this.onAmmoChange = null; // hud hook
    this.onReloadChange = null;
    this._emitAmmo();
  }

  reset() {
    this.capacityMult = 1;
    for (const id of ORDER) {
      this.ammo[id] = Math.min(WEAPONS[id].magSize, WEAPONS[id].start);
      this.reserve[id] = Math.max(0, WEAPONS[id].start - this.ammo[id]);
      this.recoilStep[id] = 0;
      this.recoilIdle[id] = Infinity;
    }
    this.cancelReload(false);
    this.fireTimer = 0;
    this.switchTimer = 0;
    this.spread = WEAPONS.smg.spreadBase;
    this.aimT = 0;
    this.kick = 0;
    this.kickRot = 0;
    this.raiseT = 1;
    this.switchTo('smg', true);
    this._emitAmmo();
    this._emitReload();
  }

  switchTo(id, instant = false) {
    if (!WEAPONS[id] || (id === this.current && !instant)) return;
    this.cancelReload();
    this.model.visible = false;
    this.current = id;
    this.def = WEAPONS[id];
    this.model = this.models[id];
    this.model.visible = true;
    this.switchTimer = instant ? 0 : 0.32;
    this.raiseT = instant ? 1 : 0;
    this.fireTimer = Math.max(this.fireTimer, 0.12);
    if (!instant) this.ctx.audio.weaponSwitch();
    this._syncViewmodelSelection();
    this._emitAmmo();
    if (this.ammo[id] <= 0 && this.reserve[id] > 0) this.beginReload();
  }

  /**
   * Optionally attach the separately loaded high-resolution RELAY viewmodel.
   * The caller retains ownership and may pass a different compatible weapon id
   * (the automatic `smg` role is the default). Invalid/partial objects are
   * ignored, leaving the fully functional procedural overlay in place.
   */
  attachRealisticViewmodel(viewmodel, weaponId = 'smg') {
    if (!WEAPONS[weaponId]) {
      console.warn(`Ignored realistic viewmodel for unknown weapon slot: ${weaponId}`);
      return this;
    }
    if (!viewmodel) {
      this._realisticViewmodels[weaponId]?.setVisible?.(false);
      delete this._realisticViewmodels[weaponId];
      this._syncViewmodelSelection();
      return this;
    }
    const scene = viewmodel.viewScene || viewmodel.scene;
    const camera = viewmodel.viewCamera || viewmodel.camera;
    if (!scene || !camera || typeof viewmodel.update !== 'function') {
      console.warn('Ignored incompatible realistic weapon viewmodel; procedural weapons remain active.');
      return this;
    }
    const previous = this._realisticViewmodels[weaponId];
    if (previous && previous !== viewmodel) previous.setVisible?.(false);
    this._realisticViewmodels[weaponId] = viewmodel;
    this._syncViewmodelSelection();
    return this;
  }

  _currentRealisticViewmodel() {
    return this._realisticViewmodels[this.current] || null;
  }

  _usingRealisticViewmodel() {
    return !!this._currentRealisticViewmodel();
  }

  _syncViewmodelSelection() {
    const active = this._currentRealisticViewmodel();
    const useRealistic = !!active;
    this._realisticViewmodel = active;
    if (this.model) this.model.visible = !useRealistic;
    for (const viewmodel of Object.values(this._realisticViewmodels)) {
      viewmodel.setVisible?.(viewmodel === active);
    }
    this.viewScene = useRealistic
      ? (active.viewScene || active.scene)
      : this._proceduralViewScene;
    this.viewCamera = useRealistic
      ? (active.viewCamera || active.camera)
      : this._proceduralViewCamera;
  }

  cycle(dir) {
    const i = ORDER.indexOf(this.current);
    const n = (i + (dir > 0 ? 1 : ORDER.length - 1)) % ORDER.length;
    this.switchTo(ORDER[n]);
  }

  update(dt, ctrl, input) {
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    this.switchTimer = Math.max(0, this.switchTimer - dt);
    this.raiseT = damp(this.raiseT, 1, 12, dt);
    this.aimT = this.ctx.cam.aimT || 0;
    for (const id of ORDER) {
      this.recoilIdle[id] += dt;
      const resetAfter = WEAPONS[id].recoilReset || 0.18;
      if (this.recoilIdle[id] >= resetAfter) this.recoilStep[id] = 0;
    }

    // input: switch weapons
    if (input.wasPressed('weapon1')) this.switchTo('pistol');
    if (input.wasPressed('weapon2')) this.switchTo('smg');
    if (input.wasPressed('weapon3')) this.switchTo('shotgun');
    if (input.wasPressed('weapon4')) this.switchTo('rifle');
    const wheel = input.consumeWheel();
    if (wheel !== 0) this.cycle(wheel);
    if (input.wasPressed('reload')) this.beginReload();

    this._advanceReload(dt);

    // Loaded tactical reloads yield immediately to the trigger. Empty-mag
    // reloads keep running so holding fire resumes on the first ready frame.
    const wantFire = this.def.auto ? input.isDown('fire') : input.wasPressed('fire');
    if (wantFire && this.fireTimer <= 0 && this.switchTimer <= 0) {
      if (this.reloading && this.ammo[this.current] > 0) this.cancelReload();
      if (!this.reloading && this.ammo[this.current] > 0) {
        this._fire(ctrl);
      } else if (!this.reloading && this.reserve[this.current] > 0) {
        this.beginReload();
      } else if (!this.reloading && (input.wasPressed('fire') || this.def.auto)) {
        // Truly empty: dry click, then hop to another viable weapon.
        this.ctx.audio.dryFire();
        if (!this._autoSwitch()) this.fireTimer = 0.18;
      }
    }

    // spread = base + movement/air penalty (tightened while sighted), bloom decays
    const movePenalty = clamp01(ctrl.horizSpeed / 10) * this.def.spreadMove + (ctrl.onGround ? 0 : 0.025);
    const target = (this.def.spreadBase + movePenalty) * lerp(1, 0.28, this.aimT);
    this.spread = Math.max(target, damp(this.spread, target, 7, dt));

    this._animate(dt, ctrl);
    // Resolve firing and reload cancellation first, then animate the authored
    // planes in the same frame. Every hidden slot stays warm, while only the
    // active weapon receives the authoritative reload progress.
    const activeViewmodel = this._currentRealisticViewmodel();
    const look = this.ctx.cam.lastLook || { yaw: 0, pitch: 0 };
    for (const viewmodel of Object.values(this._realisticViewmodels)) {
      viewmodel.update(dt, {
        aim: this.aimT,
        sprint: ctrl.isDashing() ? 1 : 0,
        move01: clamp01(ctrl.horizSpeed / 10.5),
        lookX: look.yaw || 0,
        lookY: look.pitch || 0,
        ...(viewmodel === activeViewmodel && this.reloading
          ? { reloadProgress: this._reloadProgress() }
          : {}),
        visible: viewmodel === activeViewmodel,
      });
    }
    this._emitSpread();
  }

  // Switch to a loaded weapon first. If only reserve ammunition remains, draw
  // that weapon and immediately begin its reload. Returns true on either path.
  _autoSwitch() {
    for (const id of ORDER) {
      if (id !== this.current && this.ammo[id] > 0) { this.switchTo(id); return true; }
    }
    for (const id of ORDER) {
      if (id !== this.current && this.reserve[id] > 0) {
        this.switchTo(id);
        this.beginReload();
        return true;
      }
    }
    return false;
  }

  _reloadProgress() {
    return this.reloading && this.reloadDuration > 0
      ? clamp01(this.reloadTimer / this.reloadDuration)
      : 0;
  }

  beginReload() {
    const id = this.current;
    if (this.reloading || this.ammo[id] >= this.def.magSize || this.reserve[id] <= 0) return false;
    this.reloading = true;
    this.reloadTimer = 0;
    this.reloadWasEmpty = this.ammo[id] <= 0;
    this.reloadDuration = this.def.reloadTime + (this.reloadWasEmpty ? 0.14 : 0);
    this.reloadMidPlayed = false;
    this.ctx.audio.reloadOut();
    this._currentRealisticViewmodel()?.beginReload?.(this.reloadDuration);
    this._emitAmmo();
    this._emitReload();
    return true;
  }

  cancelReload(notify = true) {
    const wasReloading = this.reloading;
    this.reloading = false;
    this.reloadTimer = 0;
    this.reloadDuration = 0;
    this.reloadMidPlayed = false;
    this.reloadWasEmpty = false;
    for (const viewmodel of Object.values(this._realisticViewmodels)) viewmodel.cancelReload?.();
    if (notify && wasReloading) {
      this._emitAmmo();
      this._emitReload();
    }
    return wasReloading;
  }

  _advanceReload(dt) {
    if (!this.reloading) return;
    this.reloadTimer = Math.min(this.reloadDuration, this.reloadTimer + Math.max(0, dt));
    if (!this.reloadMidPlayed && this.reloadTimer >= this.reloadDuration * 0.58) {
      this.reloadMidPlayed = true;
      this.ctx.audio.reloadIn();
    }
    if (this.reloadTimer >= this.reloadDuration) this._finishReload();
    else this._emitReload();
  }

  _finishReload() {
    if (!this.reloading) return false;
    const id = this.current;
    const moved = Math.min(this.def.magSize - this.ammo[id], this.reserve[id]);
    this.ammo[id] += moved;
    this.reserve[id] -= moved;
    this.reloading = false;
    this.reloadTimer = this.reloadDuration;
    this.reloadMidPlayed = false;
    this.reloadWasEmpty = false;
    this.fireTimer = Math.max(this.fireTimer, 0.045);
    this._currentRealisticViewmodel()?.cancelReload?.();
    this.ctx.audio.reloadDone();
    this._emitAmmo();
    this._emitReload();
    return moved > 0;
  }

  // effective ammo cap for a weapon (raised by the +max-ammo upgrade)
  _cap(id) { return Math.round(WEAPONS[id].capacity * this.capacityMult); }

  // Raise every weapon's reserve capacity (upgrade). Also fill the gained
  // headroom so the pick feels immediately rewarding.
  setCapacityMult(m) {
    const prev = this.capacityMult;
    this.capacityMult = m;
    if (m > prev) {
      for (const id of ORDER) {
        const gained = this._cap(id) - Math.round(WEAPONS[id].capacity * prev);
        this.reserve[id] = Math.min(this._cap(id), this.reserve[id] + Math.max(0, gained));
      }
    }
    if (this.ammo[this.current] <= 0 && this.reserve[this.current] > 0 && !this.reloading) this.beginReload();
    else this._emitAmmo();
  }

  // Pickup top-up for every reserve (mult scales the amount). Returns true if
  // anything actually changed, so a full player does not vacuum up a pickup.
  addAmmo(mult = 1) {
    let added = false;
    for (const id of ORDER) {
      const before = this.reserve[id];
      this.reserve[id] = Math.min(this._cap(id), before + Math.round(WEAPONS[id].drop * mult));
      if (this.reserve[id] > before) added = true;
    }
    if (this.ammo[this.current] <= 0 && this.reserve[this.current] > 0 && !this.reloading) this.beginReload();
    else this._emitAmmo();
    return added;
  }

  // A chunky guaranteed reward for a dash finisher (the aggressive "chainsaw" loop).
  grantFinisherAmmo() {
    for (const id of ORDER) this.reserve[id] = Math.min(this._cap(id), this.reserve[id] + WEAPONS[id].finisher);
    if (this.ammo[this.current] <= 0 && this.reserve[this.current] > 0 && !this.reloading) this.beginReload();
    else this._emitAmmo();
  }

  hasAnyAmmo() { return ORDER.some((id) => this.ammo[id] > 0 || this.reserve[id] > 0); }

  _fire(ctrl) {
    const def = this.def;
    this.ammo[this.current]--;
    this.fireTimer = def.fireInterval;

    const cam = this.ctx.cam;
    const origin = this.ctx.mainCamera.getWorldPosition(new THREE.Vector3());
    const baseDir = cam.aimDirection();

    // world-space muzzle position for tracers / smoke
    const right = new THREE.Vector3().crossVectors(baseDir, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, baseDir).normalize();
    const muzzleWorld = origin.clone()
      .addScaledVector(baseDir, 0.7)
      .addScaledVector(right, 0.16)
      .addScaledVector(up, -0.12);

    for (let p = 0; p < def.pellets; p++) {
      const dir = baseDir.clone();
      const s = this.spread;
      dir.x += rand(-s, s); dir.y += rand(-s, s); dir.z += rand(-s, s);
      dir.normalize();

      const hit = this.ctx.hitscan(origin, dir, def.range);
      const endPoint = hit ? hit.point : origin.clone().addScaledVector(dir, def.range);
      this.ctx.fx.tracer(muzzleWorld, endPoint, def.tracer);

      if (hit) {
        if (hit.enemy && hit.enemy.alive) {
          const isHead = hit.enemy.isHeadshot(hit.point);
          // Distance falloff is role-specific: the shotgun owns arm's length,
          // the SMG owns short lanes, while pistol and marksman shots retain
          // meaningful authority across the relay. Role remains legible even
          // when tracer colour is difficult to distinguish.
          const distance = hit.point.distanceTo(origin);
          const falloffSpan = Math.max(0.001, def.range - def.falloffStart);
          const falloffT = clamp01((distance - def.falloffStart) / falloffSpan);
          const distanceScale = lerp(1, def.falloffMin, falloffT);
          const dmg = def.damage * distanceScale * (isHead ? def.headMult : 1);
          this.ctx.applyDamage(hit.enemy, dmg, hit.point.clone(), dir.clone(), isHead);
        } else {
          this.ctx.fx.bulletImpact(hit.point, hit.normal || new THREE.Vector3(0, 1, 0));
        }
      }
    }

    // feedback
    this.spread = Math.min(this.spread + def.spreadBloom, def.spreadMax);
    const recoilIndex = this.recoilStep[this.current] || 0;
    const pattern = def.recoilPatternDeg;
    // Authored automatic weapons follow a fixed horizontal ladder, making
    // burst control learnable. The deterministic sub-pixel weave prevents a
    // perfectly robotic line without turning the pattern back into dice.
    const authoredYaw = pattern
      ? THREE.MathUtils.degToRad(pattern[recoilIndex % pattern.length])
      : def.recoilYaw * randSign() * rand(0.4, 1);
    const microWeave = pattern
      ? Math.sin((recoilIndex + 1) * (def.slot * 1.73 + 0.61)) * def.recoilYaw * 0.035
      : 0;
    const recoilPitch = def.recoilPitch * (recoilIndex === 0 ? (def.recoilFirstMult || 1) : 1);
    const recoilYaw = authoredYaw + microWeave;
    this.recoilStep[this.current] = recoilIndex + 1;
    this.recoilIdle[this.current] = 0;
    cam.addRecoil(recoilPitch, recoilYaw);
    cam.addFovPunch(def.fovPunch);
    this.ctx.fx.addTrauma(def.shake);
    this.ctx.fx.muzzleFlash(muzzleWorld);
    this.ctx.fx.muzzleSmoke(muzzleWorld, baseDir);
    this.ctx.fx.brass(muzzleWorld, right);

    // viewmodel kick
    this.kick = Math.min(this.kick + 0.06 + def.fovPunch * 0.01, 0.16);
    this.kickRot = Math.min(this.kickRot + def.recoilPitch * 2.2, 0.5);

    // muzzle flash sprite (kept small so it reads as a pop, not a screen-wash)
    this.flashLife = 0.035;
    this.flashSprite.material.opacity = 0.5;
    this.flashSprite.material.rotation = rand(0, Math.PI * 2);
    const fscale = def.flashScale || (def.pellets > 1 ? 0.075 : 0.045);
    this.flashSprite.scale.setScalar(fscale * rand(0.85, 1.15));

    const activeViewmodel = this._currentRealisticViewmodel();
    if (activeViewmodel) {
      // The cutout module uses normalized impulses rather than camera radians.
      activeViewmodel.addRecoil?.({
        pitch: clamp(recoilPitch * 22, 0.18, 1.25),
        kick: clamp(0.35 + def.fovPunch * 0.18, 0.35, 1.35),
        yaw: clamp(recoilYaw * 34, -0.9, 0.9),
      });
      activeViewmodel.triggerMuzzleFlash?.(clamp(0.6 + def.fovPunch * 0.16, 0.6, 1.35));
    }

    this.ctx.audio[def.sound](def.soundStrength || 1);
    this._emitAmmo();
    if (this.ammo[this.current] <= 0 && this.reserve[this.current] > 0) this.beginReload();
  }

  _animate(dt, ctrl) {
    const def = this.def;
    // sway from look movement (gun lags the camera)
    const look = this.ctx.cam.lastLook;
    const swayTargetX = clamp(-look.yaw * 8, -0.06, 0.06);
    const swayTargetY = clamp(look.pitch * 8, -0.06, 0.06);
    this.sway.x = damp(this.sway.x, swayTargetX, 10, dt);
    this.sway.y = damp(this.sway.y, swayTargetY, 10, dt);

    // bob synced with movement (suppressed while sighted)
    const aimT = this.aimT;
    this.bobPhase += ctrl.horizSpeed * dt * 1.5;
    const bobAmt = clamp01(ctrl.horizSpeed / 10.5) * (ctrl.onGround ? 1 : 0.2) * (1 - aimT * 0.9);
    const bobX = Math.cos(this.bobPhase) * 0.012 * bobAmt;
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.016 * bobAmt;

    // recoil recovery
    this.kick = damp(this.kick, 0, 12, dt);
    this.kickRot = damp(this.kickRot, 0, 11, dt);

    // raise / lower on switch + a quick dip while dashing
    const lower = (1 - this.raiseT) * 0.5 + (ctrl.isDashing() ? 0.22 : 0);
    const reloadPose = this.reloading ? Math.sin(Math.PI * this._reloadProgress()) : 0;

    const target = (def.rest || REST).clone();
    target.x += this.sway.x + bobX;
    target.y += this.sway.y + bobY - lower;
    target.z += this.kick;
    // blend toward the sighted (ADS) pose
    target.lerp(def.ads, aimT);
    target.x += reloadPose * 0.08;
    target.y -= reloadPose * 0.23;
    target.z += reloadPose * 0.035;
    this.pos.lerp(target, 1 - Math.exp(-18 * dt));

    this.model.position.copy(this.pos);
    const rotScale = 1 - aimT * 0.7;   // steadier hold while sighted (recoil stays)
    this.model.rotation.set(
      this.kickRot + this.sway.y * 1.5 * rotScale - reloadPose * 0.14,
      -this.sway.x * 2 * rotScale + reloadPose * 0.18,
      (this.sway.x * 1.5 + (ctrl._sliding ? -0.12 : 0)) * rotScale + reloadPose * 0.52,
      'YXZ'
    );

    // A real moving magazine sells the reload much better than a whole-gun
    // wobble. It drops clear, crosses the hand-off beat, then seats before the
    // optional empty-mag action cycle. No meshes are allocated in this path.
    const magazine = this.model.userData.magazine;
    if (magazine) {
      const basePos = magazine.userData.reloadBasePosition;
      const baseRot = magazine.userData.reloadBaseRotation;
      magazine.position.copy(basePos);
      magazine.rotation.copy(baseRot);
      if (this.reloading) {
        const p = this._reloadProgress();
        const phase = clamp01(p < 0.55 ? p / 0.28 : (p - 0.55) / 0.28);
        const eased = phase * phase * (3 - 2 * phase);
        const separation = p < 0.55 ? eased : 1 - eased;
        magazine.position.x += separation * 0.055;
        magazine.position.y -= separation * 0.27;
        magazine.position.z += separation * 0.045;
        magazine.rotation.z += separation * 0.32;
      }
    }
    const action = this.model.userData.action;
    if (action) {
      action.position.copy(action.userData.reloadBasePosition);
      action.rotation.copy(action.userData.reloadBaseRotation);
      if (this.reloading && this.reloadWasEmpty) {
        const chargeT = clamp01((this._reloadProgress() - 0.78) / 0.22);
        action.position.z += Math.sin(chargeT * Math.PI) * 0.12;
      }
    }

    // flash follows the muzzle tip of the model
    this.muzzle.position.set(this.pos.x + 0.02, this.pos.y + 0.02, this.pos.z + (def.muzzleZ || -0.85));
    if (this.flashLife > 0) {
      this.flashLife -= dt;
      this.flashSprite.material.opacity = clamp01(this.flashLife / 0.05);
      if (this.flashLife <= 0) this.flashSprite.material.opacity = 0;
    }
  }

  syncCamera(fov, aspect, width = null, height = null) {
    this._proceduralViewCamera.fov = fov;
    this._proceduralViewCamera.aspect = aspect;
    this._proceduralViewCamera.updateProjectionMatrix();
    for (const viewmodel of Object.values(this._realisticViewmodels)) {
      viewmodel.syncCamera?.(fov, aspect, width, height);
    }
  }

  _emitAmmo() {
    if (this.onAmmoChange) {
      this.onAmmoChange({
        name: this.def.name,
        ammo: this.ammo[this.current],
        reserve: this.reserve[this.current],
        capacity: this._cap(this.current),
        magSize: this.def.magSize,
        reloading: this.reloading,
        kind: this.def.kind,
      });
    }
  }
  _emitReload() {
    if (this.onReloadChange) this.onReloadChange({ active: this.reloading, progress: this._reloadProgress() });
  }
  _emitSpread() {
    if (this.onSpread) this.onSpread(this.spread);
  }
}

// --- procedural viewmodel meshes -----------------------------------------

function buildViewmodel(def) {
  const g = new THREE.Group();
  g.name = `viewmodel-${def.kind}`;
  g.userData.weaponKind = def.kind;
  const metal = new THREE.MeshStandardMaterial({ color: 0x46556b, metalness: 0.82, roughness: 0.38 });
  const black = new THREE.MeshStandardMaterial({ color: 0x141d2b, metalness: 0.58, roughness: 0.52 });
  const poly = new THREE.MeshStandardMaterial({ color: 0x314158, metalness: 0.18, roughness: 0.68 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xaebccc, metalness: 0.72, roughness: 0.3 });
  const accent = new THREE.MeshStandardMaterial({
    color: def.tracer,
    emissive: def.tracer,
    emissiveIntensity: 1.35,
    metalness: 0.25,
    roughness: 0.3,
  });
  const lens = new THREE.MeshStandardMaterial({
    color: 0x090d18,
    emissive: def.tracer,
    emissiveIntensity: 0.8,
    metalness: 0.8,
    roughness: 0.18,
  });

  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    g.add(m);
    return m;
  };
  const box = (w, h, d, mat, x, y, z, rx, ry, rz) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
  const cyl = (r1, r2, len, mat, x, y, z) => add(new THREE.CylinderGeometry(r1, r2, len, 14), mat, x, y, z, Math.PI / 2, 0, 0);
  let magazine = null;
  let action = null;

  if (def.kind === 'pistol') {
    // Short slide + steep grip: unmistakable even in peripheral vision.
    action = box(0.082, 0.105, 0.44, pale, 0, 0.025, -0.18); // slide
    box(0.086, 0.065, 0.34, metal, 0, -0.045, -0.14);        // frame
    box(0.092, 0.235, 0.13, poly, 0, -0.18, 0.005, 0.24);    // grip
    magazine = box(0.058, 0.165, 0.082, black, 0, -0.225, 0.012, 0.24); // magazine base
    cyl(0.024, 0.024, 0.31, black, 0, 0.035, -0.31);         // barrel
    box(0.024, 0.038, 0.026, accent, 0, 0.105, -0.39);       // bright front post
    box(0.058, 0.026, 0.035, black, 0, 0.102, 0.015);        // rear sight
    box(0.012, 0.018, 0.22, accent, 0, 0.086, -0.18);        // luminous slide index
  } else if (def.kind === 'smg') {
    // Compact box receiver, vertical magazine and collapsible stock.
    box(0.095, 0.135, 0.53, metal, 0, 0.005, -0.18);         // receiver
    box(0.105, 0.105, 0.24, poly, 0, -0.005, -0.51);         // handguard
    cyl(0.03, 0.034, 0.34, black, 0, 0.025, -0.65);         // barrel
    magazine = box(0.07, 0.255, 0.105, black, 0, -0.205, -0.12, 0.08); // stick magazine
    box(0.075, 0.18, 0.11, poly, 0, -0.165, 0.08, 0.28);    // pistol grip
    box(0.05, 0.045, 0.38, black, 0, 0.025, 0.25);          // stock rail
    box(0.082, 0.16, 0.055, poly, 0, -0.015, 0.46);         // shoulder pad
    box(0.045, 0.052, 0.13, lens, 0, 0.115, -0.15);         // reflex optic
    action = box(0.025, 0.035, 0.11, pale, 0.064, 0.055, -0.08); // charging handle
    box(0.014, 0.025, 0.4, accent, 0.052, 0.02, -0.23);     // yellow role stripe
    cyl(0.045, 0.052, 0.07, black, 0, 0.025, -0.84);        // compensator
  } else if (def.kind === 'shotgun') {
    box(0.09, 0.11, 0.62, metal, 0, 0, -0.18);            // receiver
    cyl(0.05, 0.05, 1.0, black, 0, 0.055, -0.55);          // barrel
    cyl(0.026, 0.026, 0.42, black, 0, -0.01, -0.73);        // short gas tube
    magazine = box(0.1, 0.22, 0.17, black, 0, -0.18, -0.13, 0.1); // detachable box
    box(0.085, 0.09, 0.24, poly, 0, -0.02, -0.42);         // pump/forend
    action = box(0.028, 0.038, 0.12, pale, 0.066, 0.035, -0.1); // charging handle
    box(0.09, 0.2, 0.16, poly, 0, -0.14, 0.14, 0.32, 0, 0); // grip
    box(0.08, 0.14, 0.28, poly, 0, 0.0, 0.32, -0.12, 0, 0); // stock
    box(0.026, 0.048, 0.03, accent, 0, 0.12, -1.02);        // brilliant bead sight
    box(0.018, 0.022, 0.34, accent, 0.052, 0.035, -0.46);   // receiver index
  } else {
    // Long marksman profile with optic, cheek rest and exposed barrel.
    box(0.075, 0.12, 0.72, metal, 0, 0, -0.14);            // receiver/upper
    box(0.07, 0.05, 0.36, metal, 0, 0.075, -0.14);         // top rail
    cyl(0.022, 0.026, 0.8, black, 0, 0.03, -0.84);         // long barrel
    box(0.08, 0.11, 0.42, poly, 0, 0.0, -0.54);            // handguard
    box(0.09, 0.16, 0.14, poly, 0, -0.14, 0.08, 0.28, 0, 0); // grip
    magazine = box(0.058, 0.16, 0.11, black, 0, -0.145, -0.04); // short magazine
    box(0.09, 0.1, 0.34, poly, 0, 0.005, 0.35, -0.05, 0, 0); // stock body
    box(0.09, 0.14, 0.06, poly, 0, -0.03, 0.46);           // butt pad
    box(0.082, 0.045, 0.24, pale, 0, 0.087, 0.27);          // cheek rest
    cyl(0.052, 0.052, 0.34, black, 0, 0.145, -0.17);       // scope body
    cyl(0.068, 0.058, 0.09, lens, 0, 0.145, -0.38);        // objective bell
    cyl(0.042, 0.05, 0.065, lens, 0, 0.145, 0.03);         // ocular bell
    action = box(0.032, 0.035, 0.13, pale, 0.068, 0.045, -0.03); // bolt handle
    box(0.016, 0.025, 0.5, accent, 0.052, 0.025, -0.42);   // violet range rail
    cyl(0.036, 0.044, 0.095, black, 0, 0.03, -1.28);       // muzzle brake
  }
  if (magazine) {
    magazine.userData.reloadBasePosition = magazine.position.clone();
    magazine.userData.reloadBaseRotation = magazine.rotation.clone();
    g.userData.magazine = magazine;
  }
  if (action) {
    action.userData.reloadBasePosition = action.position.clone();
    action.userData.reloadBaseRotation = action.rotation.clone();
    g.userData.action = action;
  }
  g.scale.setScalar(def.viewScale || 1.05);
  return g;
}

function makeFlashTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,240,200,0.95)');
  g.addColorStop(0.5, 'rgba(255,180,90,0.5)');
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // star spikes
  ctx.translate(cx, cx);
  ctx.fillStyle = 'rgba(255,230,170,0.85)';
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cx * 0.9, cx * 0.08);
    ctx.lineTo(cx * 0.9, -cx * 0.08);
    ctx.closePath();
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
