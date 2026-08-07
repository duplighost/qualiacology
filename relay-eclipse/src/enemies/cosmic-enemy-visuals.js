// The visual library that dresses enemies in the articulated RELAY ZERO models.
//
// It deliberately presents the same surface the impostor library did — create,
// setOpacity, setVisible, setQuality, syncPositionFrom, update, dispose — so
// swapping which one gets constructed is the entire integration. Nothing in
// enemy.js needed to change to accept real geometry.
//
// The models stay purely cosmetic, exactly as the impostors were: hit meshes,
// collision and movement all still belong to the procedural rig underneath.

import * as THREE from 'three';
import { clamp01, damp } from '../engine/math.js';
import { buildEnemyVisual, updateEnemyVisual } from './cosmic-enemy-models.js';

// relay-eclipse names its roles for the art it used to load; RELAY ZERO named
// them for what they do. Same five silhouettes either way.
const ROLE_FOR_TYPE = Object.freeze({
  rusher: 'rusher',
  shooter: 'shooter',
  brute: 'brute',
  commander: 'warden',
  maw: 'planet',
});

export const COSMIC_VISUAL_TYPES = Object.freeze(Object.keys(ROLE_FOR_TYPE));

// Quality maps onto the donor's touchMode, which drops segment counts on every
// capsule and sphere and skips the small decorative meshes.
const LOW_DETAIL = Object.freeze({ low: true, medium: true, high: false, ultra: false });

export class CosmicVisualLibrary {
  constructor() {
    this._instances = new Set();
    this._quality = 'high';
    this._disposed = false;
  }

  create(type, options = {}) {
    if (this._disposed) throw new Error('CosmicVisualLibrary has been disposed.');
    const role = ROLE_FOR_TYPE[type];
    if (!role) throw new Error(`Unknown cosmic visual type: ${type}`);
    const visual = new CosmicVisual(this, type, role, options);
    this._instances.add(visual);
    if (options.parent) options.parent.add(visual.root);
    return visual;
  }

  setQuality(value = 'high') {
    const name = typeof value === 'string' ? value : (value && value.name) || 'high';
    this._quality = ['ultra', 'high', 'medium', 'low'].includes(name) ? name : 'high';
    // Segment counts are baked at build time, so a live quality change only
    // takes effect for models created afterwards. Rebuilding every enemy mid
    // fight to save a few triangles would cost far more than it saves.
    return this;
  }

  // Present for parity with the impostor library, which prewarmed shaders.
  prewarm() { return this; }

  dispose() {
    if (this._disposed) return;
    while (this._instances.size) this._instances.values().next().value.dispose();
    this._disposed = true;
  }
}

export class CosmicVisual {
  constructor(library, type, role, options = {}) {
    this.library = library;
    this.type = type;
    this.role = role;

    this.root = new THREE.Group();
    this.root.name = `cosmic-visual-${type}`;

    const touchMode = !!LOW_DETAIL[library._quality];
    this._model = buildEnemyVisual(role, {}, { touchMode });
    this.root.add(this._model.modelRoot);

    const scale = Number.isFinite(options.scale) ? options.scale : 1;
    this._scale = scale;
    this.root.scale.setScalar(scale);

    // The donor's palette was lit for RELAY ZERO's much brighter arena. Under
    // this game's night exposure and bloom, a near-white suit carrying a lifted
    // emissive blows out into a glowing smear instead of reading as a body.
    // Darken the shell and pull both emissives back so the figures read solid
    // with a lit trim, which is also what keeps the role accents legible as
    // trim rather than as the whole silhouette.
    const shell = this._model.materials.shell;
    shell.color.multiplyScalar(0.6);
    shell.emissiveIntensity *= 0.5;
    shell.userData.baseEmissive = shell.emissiveIntensity;
    shell.roughness = Math.min(1, shell.roughness + 0.14);
    const glow = this._model.materials.glow;
    glow.emissiveIntensity *= 0.72;
    glow.userData.baseEmissive = glow.emissiveIntensity;

    this._materials = [
      this._model.materials.shell,
      this._model.materials.glow,
      this._model.materials.visor,
      ...(this._model._extraMaterials || []),
    ].filter(Boolean);
    for (const material of this._materials) {
      material.userData.baseOpacity = material.opacity;
    }

    this._age = 0;
    this._gait = 0;
    this._opacity = 1;
    this._targetOpacity = 1;
    this._hit = 0;
    this._motion = 0;
    this._charge = 0;
    this._disposed = false;
  }

  triggerHit(strength = 1) { this._hit = Math.max(this._hit, clamp01(strength)); }

  setOpacity(opacity, immediate = false) {
    this._targetOpacity = clamp01(opacity);
    if (immediate) { this._opacity = this._targetOpacity; this._applyOpacity(); }
  }

  setVisible(visible) { this.root.visible = !!visible; }

  setQuality() { return this; }

  setPosition(position) {
    if (position) this.root.position.set(position.x, position.y, position.z);
  }

  syncPositionFrom(object3d) {
    if (!object3d) return;
    object3d.getWorldPosition(this.root.position);
    if (this.root.parent) {
      this.root.parent.worldToLocal(this.root.position);
    }
  }

  _applyOpacity() {
    // The threshold has to be loose. An exponential fade approaches 1 without
    // ever arriving, so a tight test left every enemy permanently transparent
    // with depth writes off — its own limbs blended through its own torso and
    // the whole figure read as a pale ghost instead of a solid body.
    const transparent = this._opacity < 0.995;
    for (const material of this._materials) {
      const base = material.userData.baseOpacity ?? 1;
      material.opacity = base * this._opacity;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.depthWrite = !transparent;
    }
  }

  update(dt, camera, target = null, state = null) {
    if (this._disposed) return;
    const step = Math.max(0, Math.min(dt, 0.1));
    this._age += step;

    const locked = !!(state && state.poseLocked);
    if (state) {
      if (state.hit !== undefined) this._hit = Math.max(this._hit, clamp01(state.hit));
      if (state.opacity !== undefined) this._targetOpacity = clamp01(state.opacity);
      if (state.visible !== undefined) this.root.visible = !!state.visible;
    }
    this._hit = Math.max(0, this._hit - step * 7.5);
    const previousOpacity = this._opacity;
    this._opacity = damp(this._opacity, this._targetOpacity, 13, step);
    if (this._targetOpacity >= 1 && this._opacity > 0.995) this._opacity = 1;
    if (Math.abs(this._opacity - previousOpacity) > 0.0005) this._applyOpacity();

    const speed01 = locked ? 0 : clamp01((state && state.speed01) || 0);
    this._motion = damp(this._motion, speed01, speed01 > this._motion ? 12 : 7, step);
    const charge = locked ? 0 : Math.max(
      clamp01((state && state.windup) || 0),
      clamp01((state && state.attack) || 0),
    );
    this._charge = damp(this._charge, charge, charge > this._charge ? 20 : 8, step);

    // The gait is driven entirely by the phase gameplay already accumulates —
    // it scales with real speed and stops dead when a pose is locked — so the
    // donor's absolute-time term is passed as zero rather than letting a second
    // clock run underneath it.
    if (state && Number.isFinite(state.gaitPhase) && !locked) this._gait = state.gaitPhase;

    // Turn to face the player, then apply the rig's own lean and pitch.
    if (target) {
      const tx = target.isVector3 ? target.x : (target.position ? target.position.x : null);
      const tz = target.isVector3 ? target.z : (target.position ? target.position.z : null);
      if (tx !== null && tz !== null) {
        const dx = tx - this.root.position.x;
        const dz = tz - this.root.position.z;
        if (dx * dx + dz * dz > 1e-8) this.root.rotation.y = Math.atan2(dx, dz);
      }
    }
    this.root.rotation.x = (state && state.pitch) || 0;
    this.root.rotation.z = (state && state.lean) || 0;

    updateEnemyVisual(this._model, 0, step, {
      moving: !locked && this._motion > 0.04,
      speed: this._motion * 4,
      hurt: this._hit,
      charging: this._charge,
      phase: this._gait,
    });
  }

  debugAnimationSnapshot() {
    return {
      type: this.type,
      role: this.role,
      family: this._model.visualFamily,
      articulated: true,
      motion: this._motion,
      charge: this._charge,
      hit: this._hit,
      opacity: this._opacity,
      gaitPhase: this._gait,
      // The pivots a gait actually drives. A billboard had none of these.
      joints: ['leftArm', 'rightArm', 'leftLeg', 'rightLeg']
        .filter((name) => !!this._model._nodes[name])
        .map((name) => [name, +this._model._nodes[name].rotation.x.toFixed(4)]),
      position: [this.root.position.x, this.root.position.y, this.root.position.z],
      rotation: [this.root.rotation.x, this.root.rotation.y, this.root.rotation.z],
      scale: [this.root.scale.x, this.root.scale.y, this.root.scale.z],
    };
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.library._instances.delete(this);
    if (this.root.parent) this.root.parent.remove(this.root);
    const seenGeometry = new Set();
    this.root.traverse((object) => {
      if (!object.isMesh) return;
      if (object.geometry && !seenGeometry.has(object.geometry)) {
        seenGeometry.add(object.geometry);
        object.geometry.dispose();
      }
    });
    for (const material of this._materials) material.dispose();
  }
}

export function loadCosmicEnemyVisuals() {
  // Procedural: nothing to fetch. Kept async so the caller's load path, which
  // settles a batch of asset promises, does not need a special case.
  return Promise.resolve(new CosmicVisualLibrary());
}
