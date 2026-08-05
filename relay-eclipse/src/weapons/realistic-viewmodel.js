// A real rendered first-person viewmodel made from the high-resolution pulse
// carbine render. It is not a DOM image: the transparent cutout is drawn as a
// plane in a dedicated Three.js overlay scene after the world depth is cleared.

import * as THREE from 'three';

export const PULSE_CARBINE_ASSET_URL = new URL(
  '../../assets/art/pulse-carbine-v1.png',
  import.meta.url,
).href;

const artUrl = (filename) => new URL(`../../assets/art/${filename}`, import.meta.url).href;

// One authored normal pose and one unambiguously articulated reload pose per
// weapon. Keeping the registry here makes asset failures local to one slot and
// gives the procedural meshes a clean per-weapon fallback path.
export const REALISTIC_VIEWMODEL_ASSETS = Object.freeze({
  pistol: Object.freeze({
    assetUrl: artUrl('pulse-sidearm-v1.png'),
    reloadAssetUrl: artUrl('pulse-sidearm-reload-v1.png'),
    layout: Object.freeze({ hipX: 0.18, hipY: -0.12, muzzleX: -0.01, muzzleY: 0.105 }),
  }),
  smg: Object.freeze({
    assetUrl: PULSE_CARBINE_ASSET_URL,
    reloadAssetUrl: artUrl('pulse-carbine-reload-v1.png'),
    layout: Object.freeze({ muzzleX: -0.155, muzzleY: 0.115 }),
  }),
  shotgun: Object.freeze({
    assetUrl: artUrl('breach-scattergun-v1.png'),
    reloadAssetUrl: artUrl('breach-scattergun-reload-v1.png'),
    layout: Object.freeze({ hipX: 0.19, hipY: -0.135, muzzleX: -0.19, muzzleY: 0.12 }),
  }),
  rifle: Object.freeze({
    assetUrl: artUrl('longbow-mr-v1.png'),
    reloadAssetUrl: artUrl('longbow-mr-reload-v1.png'),
    layout: Object.freeze({ hipX: 0.18, hipY: -0.13, muzzleX: -0.29, muzzleY: 0.11 }),
  }),
});

export const REALISTIC_VIEWMODEL_DEFAULTS = Object.freeze({
  hipX: 0.2,
  hipY: -0.14,
  adsX: -0.31,
  adsY: -0.155,
  sprintX: 0.21,
  sprintY: -0.34,
  sprintRoll: -0.34,
  imageAspect: 1536 / 1024,
  muzzleX: -0.215,
  muzzleY: 0.115,
});

const VIEWMODEL_TEXTURE_WIDTH = 1152;
const VIEWMODEL_TEXTURE_HEIGHT = 768;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function smoothstep01(value) {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

function makeMuzzleFlashTexture(size = 96) {
  const data = new Uint8Array(size * size * 4);
  const half = size * 0.5;
  let offset = 0;
  for (let y = 0; y < size; y++) {
    const py = (y + 0.5 - half) / half;
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5 - half) / half;
      const r = Math.sqrt(px * px + py * py);
      const radial = clamp01(1 - r);
      const horizontal = clamp01(1 - Math.abs(py) * 8) * clamp01(1 - Math.abs(px) * 0.7);
      const vertical = clamp01(1 - Math.abs(px) * 10) * clamp01(1 - Math.abs(py) * 0.9);
      const alpha = clamp01(radial * radial * 1.2 + horizontal * 0.68 + vertical * 0.28);
      const hot = clamp01(radial * 1.7 + horizontal * 0.45);
      data[offset++] = 255;
      data[offset++] = Math.round(174 + hot * 81);
      data[offset++] = Math.round(62 + hot * 178);
      data[offset++] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = 'pulse-carbine-muzzle-flash';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function prepareWeaponTexture(texture, renderer) {
  texture.name = texture.name || 'pulse-carbine-v1.png';
  const source = texture.image;
  if (source && source.width > VIEWMODEL_TEXTURE_WIDTH && typeof document !== 'undefined') {
    // The authored 1536x1024 masters remain in the package, but uploading all
    // eight at full size plus mip chains creates needless residency pressure
    // on older discrete/mobile GPUs. The plane never exceeds ~1000px on the
    // validated 1440px viewport, so this preserves visible detail while more
    // than halving the live viewmodel texture footprint.
    const canvas = document.createElement('canvas');
    canvas.width = VIEWMODEL_TEXTURE_WIDTH;
    canvas.height = VIEWMODEL_TEXTURE_HEIGHT;
    const context = canvas.getContext('2d', { alpha: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    texture.userData.masterDimensions = [source.width, source.height];
    texture.image = canvas;
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Loads pulse-carbine-v1.png and constructs a ready-to-render viewmodel.
 *
 * @param {object} options
 * @param {THREE.WebGLRenderer} [options.renderer] Used only for anisotropy.
 * @param {THREE.LoadingManager} [options.loadingManager]
 * @param {string} [options.assetUrl]
 * @returns {Promise<RealisticViewmodel>}
 */
export async function loadRealisticViewmodel(options = {}) {
  const loader = new THREE.TextureLoader(options.loadingManager);
  const texture = await loader.loadAsync(options.assetUrl || PULSE_CARBINE_ASSET_URL);
  prepareWeaponTexture(texture, options.renderer);
  let reloadTexture = null;
  try {
    if (options.reloadAssetUrl) {
      reloadTexture = await loader.loadAsync(options.reloadAssetUrl);
      prepareWeaponTexture(reloadTexture, options.renderer);
    }
  } catch (error) {
    texture.dispose();
    throw error;
  }
  return new RealisticViewmodel(texture, {
    ...options,
    reloadTexture,
    ownsTexture: true,
    ownsReloadTexture: !!reloadTexture,
  });
}

export class RealisticViewmodel {
  /**
   * @param {THREE.Texture} texture Loaded transparent pulse-carbine texture.
   * @param {object} options
   * @param {boolean} [options.ownsTexture=false] Dispose the supplied texture.
   * @param {(progress:number)=>void} [options.onReloadProgress]
   */
  constructor(texture, options = {}) {
    if (!texture) throw new Error('RealisticViewmodel requires a loaded weapon texture.');
    this.texture = texture;
    this.reloadTexture = options.reloadTexture || null;
    this._ownsTexture = !!options.ownsTexture;
    this._ownsReloadTexture = !!options.ownsReloadTexture;
    this.layout = Object.freeze({
      ...REALISTIC_VIEWMODEL_DEFAULTS,
      ...(options.layout || {}),
    });
    this.onReloadProgress = options.onReloadProgress || null;
    this._disposed = false;

    this.scene = new THREE.Scene();
    this.scene.name = 'pulse-carbine-overlay-scene';
    this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 10);
    this.camera.name = 'pulse-carbine-overlay-camera';
    this.camera.position.z = 1;
    this.viewScene = this.scene;
    this.viewCamera = this.camera;

    this.poseRoot = new THREE.Group();
    this.poseRoot.name = 'pulse-carbine-pose';
    this.poseRoot.position.z = -1;
    this.scene.add(this.poseRoot);

    this.recoilRoot = new THREE.Group();
    this.recoilRoot.name = 'pulse-carbine-recoil';
    this.poseRoot.add(this.recoilRoot);

    this.weaponGeometry = new THREE.PlaneGeometry(this.layout.imageAspect, 1, 1, 1);
    this.weaponMaterial = new THREE.MeshBasicMaterial({
      name: 'pulse-carbine-cutout',
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      alphaTest: 0.015,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.weaponMaterial.premultipliedAlpha = false;
    this.weaponMaterial.forceSinglePass = true;
    this.weapon = new THREE.Mesh(this.weaponGeometry, this.weaponMaterial);
    this.weapon.name = 'pulse-carbine-rendered-plane';
    this.weapon.frustumCulled = false;
    this.weapon.renderOrder = 1000;
    this.recoilRoot.add(this.weapon);

    this.reloadMaterial = null;
    this.reloadWeapon = null;
    if (this.reloadTexture) {
      this.reloadMaterial = new THREE.MeshBasicMaterial({
        name: 'weapon-reload-cutout',
        map: this.reloadTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        alphaTest: 0.015,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      this.reloadMaterial.premultipliedAlpha = false;
      this.reloadMaterial.forceSinglePass = true;
      this.reloadWeapon = new THREE.Mesh(this.weaponGeometry, this.reloadMaterial);
      this.reloadWeapon.name = 'weapon-articulated-reload-plane';
      this.reloadWeapon.frustumCulled = false;
      this.reloadWeapon.renderOrder = 1001;
      this.reloadWeapon.visible = false;
      this.recoilRoot.add(this.reloadWeapon);
    }
    this.object3d = this.poseRoot;

    this.flashTexture = makeMuzzleFlashTexture();
    this.flashGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    this.flashMaterial = new THREE.MeshBasicMaterial({
      name: 'pulse-carbine-muzzle-flash',
      map: this.flashTexture,
      color: 0xffd48a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.flash = new THREE.Mesh(this.flashGeometry, this.flashMaterial);
    this.flash.name = 'pulse-carbine-muzzle-flash-plane';
    this.flash.position.set(
      this.layout.muzzleX,
      this.layout.muzzleY,
      0.01,
    );
    this.flash.scale.set(0.18, 0.095, 1);
    this.flash.frustumCulled = false;
    this.flash.renderOrder = 1002;
    this.recoilRoot.add(this.flash);

    this._aim = 0;
    this._aimTarget = 0;
    this._sprint = 0;
    this._sprintTarget = 0;
    this._move01 = 0;
    this._lookX = 0;
    this._lookY = 0;
    this._bobPhase = 0;
    this._recoilKick = 0;
    this._recoilPitch = 0;
    this._recoilYaw = 0;
    this._flashLife = 0;
    this._flashDuration = 0.052;
    this._flashIntensity = 0;
    this._shotIndex = 0;
    this._reloadProgress = -1;
    this._reloadElapsed = 0;
    this._reloadDuration = 1.15;
    this._responsiveScale = 1;
    this._aspect = 16 / 9;
    this._portraitShiftX = 0;
    this._fov = 70;
    this.visible = true;
    this.syncCamera(70, this._aspect);
  }

  setADS(amount) {
    this._aimTarget = clamp01(amount === true ? 1 : amount === false ? 0 : amount);
    return this;
  }

  setSprinting(amount) {
    this._sprintTarget = clamp01(amount === true ? 1 : amount === false ? 0 : amount);
    return this;
  }

  /** Adds a recoil impulse without creating a temporary vector. */
  addRecoil(kick = 1, yaw = 0) {
    if (typeof kick === 'object') {
      yaw = kick.yaw || 0;
      const pitch = kick.pitch === undefined ? 1 : kick.pitch;
      const push = kick.kick === undefined ? pitch : kick.kick;
      this._recoilKick = Math.min(1.8, this._recoilKick + Math.max(0, push));
      this._recoilPitch = Math.min(1.8, this._recoilPitch + Math.max(0, pitch));
    } else {
      this._recoilKick = Math.min(1.8, this._recoilKick + Math.max(0, kick));
      this._recoilPitch = Math.min(1.8, this._recoilPitch + Math.max(0, kick));
    }
    this._recoilYaw = Math.max(-1.2, Math.min(1.2, this._recoilYaw + yaw));
    return this;
  }

  triggerMuzzleFlash(intensity = 1) {
    this._flashIntensity = Math.max(this._flashIntensity, Math.max(0.1, intensity));
    this._flashLife = this._flashDuration;
    this._shotIndex++;
    // Deterministic variation avoids a samey flash without random work in the
    // hot update path.
    this.flash.rotation.z = (this._shotIndex % 6) * Math.PI / 3;
    return this;
  }

  /** Starts a timed reload pose. update() advances it automatically. */
  beginReload(duration = 1.15) {
    this._reloadDuration = Math.max(0.1, duration);
    this._reloadElapsed = 0;
    this._reloadProgress = 0;
    if (this.onReloadProgress) this.onReloadProgress(0);
    return this;
  }

  /** Drives the reload pose externally (0..1); useful for weapon state sync. */
  setReloadPose(progress) {
    this._reloadProgress = clamp01(progress);
    if (this.onReloadProgress) this.onReloadProgress(this._reloadProgress);
    return this;
  }

  cancelReload() {
    this._reloadProgress = -1;
    this._reloadElapsed = 0;
    this._resetReloadBlend();
    if (this.onReloadProgress) this.onReloadProgress(-1);
    return this;
  }

  _resetReloadBlend() {
    this.weaponMaterial.opacity = 1;
    this.weapon.visible = true;
    if (this.reloadMaterial) this.reloadMaterial.opacity = 0;
    if (this.reloadWeapon) this.reloadWeapon.visible = false;
  }

  isReloading() {
    return this._reloadProgress >= 0;
  }

  setVisible(visible) {
    this.visible = !!visible;
    this.poseRoot.visible = this.visible;
    return this;
  }

  /**
   * Allocation-free animation update.
   * state may contain aim, sprint, move01, lookX, lookY, reloadProgress,
   * visible, and lowered (all optional).
   */
  update(dt, state = null) {
    if (this._disposed) return;
    const step = Math.max(0, Math.min(dt, 0.1));
    if (state) {
      if (state.aim !== undefined) this.setADS(state.aim);
      if (state.sprint !== undefined) this.setSprinting(state.sprint);
      if (state.move01 !== undefined) this._move01 = clamp01(state.move01);
      if (state.lookX !== undefined) this._lookX = state.lookX;
      if (state.lookY !== undefined) this._lookY = state.lookY;
      if (state.reloadProgress !== undefined) this.setReloadPose(state.reloadProgress);
      if (state.visible !== undefined) this.setVisible(state.visible);
    }

    this._aim = damp(this._aim, this._aimTarget, 17, step);
    this._sprint = damp(this._sprint, this._sprintTarget, 14, step);
    // ADS wins over sprint so aim transitions never leave the optic off-axis.
    const sprintPose = this._sprint * (1 - this._aim);

    if (this._reloadProgress >= 0 && (!state || state.reloadProgress === undefined)) {
      this._reloadElapsed += step;
      this._reloadProgress = clamp01(this._reloadElapsed / this._reloadDuration);
      if (this.onReloadProgress) this.onReloadProgress(this._reloadProgress);
      if (this._reloadProgress >= 1) this.cancelReload();
    }

    let reloadPose = 0;
    if (this._reloadProgress >= 0) {
      // Raise quickly, stay canted through the magazine swap, then snap home.
      const p = this._reloadProgress;
      reloadPose = p < 0.24
        ? smoothstep01(p / 0.24)
        : p > 0.76
          ? 1 - smoothstep01((p - 0.76) / 0.24)
          : 1;
    }

    this._bobPhase += step * (5.2 + this._move01 * 6.8);
    const bobSuppression = (1 - this._aim * 0.88) * (1 - reloadPose * 0.55);
    const bobX = Math.sin(this._bobPhase) * 0.012 * this._move01 * bobSuppression;
    const bobY = Math.abs(Math.cos(this._bobPhase)) * 0.014 * this._move01 * bobSuppression;
    const swayX = Math.max(-0.045, Math.min(0.045, -this._lookX * 0.7));
    const swayY = Math.max(-0.035, Math.min(0.035, this._lookY * 0.65));

    const d = this.layout;
    const hipX = d.hipX + bobX + swayX;
    const hipY = d.hipY + bobY + swayY;
    let x = hipX + (d.adsX - hipX) * this._aim;
    let y = hipY + (d.adsY - hipY) * this._aim;
    x += (d.sprintX - x) * sprintPose;
    y += (d.sprintY - y) * sprintPose;
    const articulatedReload = !!this.reloadWeapon;
    x += reloadPose * (articulatedReload ? 0.025 : 0.12);
    y -= reloadPose * (articulatedReload ? 0.055 : 0.2);

    const responsive = this._responsiveScale;
    this.poseRoot.position.x = x * responsive + this._portraitShiftX;
    this.poseRoot.position.y = y * responsive;
    this.poseRoot.position.z = -1;
    this.poseRoot.rotation.x = reloadPose * (articulatedReload ? -0.035 : -0.16);
    this.poseRoot.rotation.y = reloadPose * (articulatedReload ? 0.055 : 0.21);
    this.poseRoot.rotation.z = d.sprintRoll * sprintPose
      + reloadPose * (articulatedReload ? 0.085 : 0.58)
      + swayX * 0.42;

    const scale = responsive * (
      1 + this._aim * 0.075 - sprintPose * 0.055 - reloadPose * (articulatedReload ? 0.012 : 0.035)
    );
    this.poseRoot.scale.setScalar(scale);

    if (this.reloadWeapon) {
      // A deliberately quick eased cut avoids a translucent double-gun while
      // still preventing a visible pop between the authored poses.
      const reloadBlend = smoothstep01(clamp01((reloadPose - 0.16) / 0.34));
      this.weaponMaterial.opacity = 1 - reloadBlend;
      this.reloadMaterial.opacity = reloadBlend;
      this.weapon.visible = reloadBlend < 0.985;
      this.reloadWeapon.visible = reloadBlend > 0.015;
    }

    this._recoilKick = damp(this._recoilKick, 0, 19, step);
    this._recoilPitch = damp(this._recoilPitch, 0, 15, step);
    this._recoilYaw = damp(this._recoilYaw, 0, 17, step);
    this.recoilRoot.position.x = this._recoilYaw * 0.012;
    this.recoilRoot.position.y = -this._recoilPitch * 0.022;
    this.recoilRoot.position.z = 0;
    this.recoilRoot.rotation.x = -this._recoilPitch * 0.055;
    this.recoilRoot.rotation.y = this._recoilYaw * 0.035;
    this.recoilRoot.rotation.z = this._recoilYaw * 0.018;
    const recoilScale = 1 - this._recoilKick * 0.025;
    this.recoilRoot.scale.set(recoilScale, recoilScale, 1);

    if (this._flashLife > 0) {
      this._flashLife = Math.max(0, this._flashLife - step);
      const life = this._flashLife / this._flashDuration;
      const envelope = Math.sin(life * Math.PI) * this._flashIntensity;
      this.flashMaterial.opacity = clamp01(envelope * 1.2);
      const flashScale = 0.86 + (1 - life) * 0.48;
      this.flash.scale.set(0.18 * flashScale, 0.095 * flashScale, 1);
      if (this._flashLife <= 0) {
        this.flashMaterial.opacity = 0;
        this._flashIntensity = 0;
      }
    }
  }

  /** Matches the overlay to the active game camera and viewport aspect. */
  syncCamera(fov, aspect) {
    this._fov = Number.isFinite(fov) ? fov : this._fov;
    this._aspect = Math.max(0.35, Number.isFinite(aspect) ? aspect : this._aspect);
    this.camera.left = -this._aspect * 0.5;
    this.camera.right = this._aspect * 0.5;
    this.camera.top = 0.5;
    this.camera.bottom = -0.5;
    this.camera.updateProjectionMatrix();

    // Keep the whole 3:2 source plane inside a portrait viewport and pull it
    // away from the phone's right-side fire/aim cluster. Landscape and desktop
    // retain the authored large weapon presence.
    const portraitScale = this._aspect < 0.82
      ? Math.max(0.24, Math.min(0.48, this._aspect / 1.72))
      : Math.min(1, Math.max(0.52, this._aspect / 1.42));
    const fovScale = Math.max(0.92, Math.min(1.06, 70 / this._fov));
    this._responsiveScale = portraitScale * fovScale;
    this._portraitShiftX = this._aspect < 0.82 ? -this._aspect * 0.045 : 0;
  }

  /** Renders the overlay safely after the world/post stack. */
  render(renderer, clearDepth = true) {
    if (this._disposed || !this.visible) return;
    const previousAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    try {
      if (clearDepth) renderer.clearDepth();
      renderer.render(this.scene, this.camera);
    } finally {
      renderer.autoClear = previousAutoClear;
    }
  }

  dispose() {
    if (this._disposed) return;
    if (this.poseRoot.parent) this.poseRoot.parent.remove(this.poseRoot);
    this.weaponGeometry.dispose();
    this.weaponMaterial.dispose();
    if (this.reloadMaterial) this.reloadMaterial.dispose();
    this.flashGeometry.dispose();
    this.flashMaterial.dispose();
    this.flashTexture.dispose();
    if (this._ownsTexture) this.texture.dispose();
    if (this._ownsReloadTexture && this.reloadTexture && this.reloadTexture !== this.texture) {
      this.reloadTexture.dispose();
    }
    this.onReloadProgress = null;
    this._disposed = true;
  }
}
