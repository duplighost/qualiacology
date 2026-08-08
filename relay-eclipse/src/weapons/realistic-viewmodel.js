// A real rendered first-person viewmodel made from the high-resolution pulse
// carbine render. It is not a DOM image: the transparent cutout is drawn as a
// plane in a dedicated Three.js overlay scene after the world depth is cleared.

import * as THREE from 'three';

export const PULSE_CARBINE_ASSET_URL = new URL(
  '../../assets/art/pulse-carbine-hip-v2.png',
  import.meta.url,
).href;

const artUrl = (filename) => new URL(`../../assets/art/${filename}`, import.meta.url).href;

// The hip and reload renders are deliberately three-quarter compositions.
// ADS therefore uses a separate, genuinely bore-axis render rather than the
// old (and visually false) trick of translating one pixel in the hip image to
// the crosshair. `adsSightY` is the independently reviewed sight center in the
// new axial master; the runtime projects that point to the firing ray.
export const REALISTIC_VIEWMODEL_ASSETS = Object.freeze({
  pistol: Object.freeze({
    assetUrl: artUrl('pulse-sidearm-hip-v2.png'),
    reloadAssetUrl: artUrl('pulse-sidearm-reload-v2.png'),
    adsAssetUrl: artUrl('pulse-sidearm-ads-v1.png'),
    layout: Object.freeze({
      hipScaleDesktop: 0.70, hipScalePortrait: 0.30, hipScaleShort: 0.72,
      hipScreenXDesktop: 0.68, hipScreenXPortrait: 0.50, hipScreenXShort: 0.45,
      reloadPortraitScale: 0.78, reloadPortraitOffsetX: -0.011,
      adsSightX: 0, adsSightY: 0.127, adsScale: 0.79,
      muzzleX: -0.246, muzzleY: 0.08,
    }),
  }),
  smg: Object.freeze({
    assetUrl: PULSE_CARBINE_ASSET_URL,
    reloadAssetUrl: artUrl('pulse-carbine-reload-v2.png'),
    adsAssetUrl: artUrl('pulse-carbine-ads-v1.png'),
    layout: Object.freeze({
      hipScaleDesktop: 0.74, hipScalePortrait: 0.30, hipScaleShort: 0.76,
      hipScreenXDesktop: 0.67, hipScreenXPortrait: 0.50, hipScreenXShort: 0.45,
      reloadPortraitScale: 0.82, reloadPortraitOffsetX: 0,
      adsSightX: 0, adsSightY: 0.130, adsScale: 0.79,
      muzzleX: -0.306, muzzleY: 0.036,
    }),
  }),
  shotgun: Object.freeze({
    assetUrl: artUrl('breach-scattergun-hip-v2.png'),
    reloadAssetUrl: artUrl('breach-scattergun-reload-v2.png'),
    adsAssetUrl: artUrl('breach-scattergun-ads-v1.png'),
    layout: Object.freeze({
      hipScaleDesktop: 0.74, hipScalePortrait: 0.30, hipScaleShort: 0.76,
      hipScreenXDesktop: 0.67, hipScreenXPortrait: 0.50, hipScreenXShort: 0.45,
      reloadPortraitScale: 0.78, reloadPortraitOffsetX: -0.010,
      adsSightX: 0, adsSightY: 0.123, adsScale: 0.80,
      muzzleX: -0.26, muzzleY: 0.078,
    }),
  }),
  rifle: Object.freeze({
    assetUrl: artUrl('longbow-mr-hip-v2.png'),
    reloadAssetUrl: artUrl('longbow-mr-reload-v2.png'),
    adsAssetUrl: artUrl('longbow-mr-ads-v1.png'),
    layout: Object.freeze({
      hipScaleDesktop: 0.72, hipScalePortrait: 0.29, hipScaleShort: 0.72,
      hipScreenXDesktop: 0.66, hipScreenXPortrait: 0.48, hipScreenXShort: 0.43,
      reloadPortraitScale: 0.82, reloadPortraitOffsetX: 0,
      adsSightX: 0, adsSightY: 0.076, adsScale: 0.86,
      muzzleX: -0.344, muzzleY: 0.094,
    }),
  }),
});

export const REALISTIC_VIEWMODEL_DEFAULTS = Object.freeze({
  hipScaleDesktop: 0.74,
  hipScalePortrait: 0.30,
  hipScaleShort: 0.76,
  hipScreenXDesktop: 0.67,
  hipScreenXPortrait: 0.50,
  hipScreenXShort: 0.45,
  reloadPortraitScale: 1,
  reloadPortraitOffsetX: 0,
  adsSightX: 0,
  adsSightY: 0.13,
  adsScale: 0.79,
  sprintOffsetX: 0.1,
  sprintOffsetY: -0.14,
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

function prepareWeaponTexture(texture, renderer, assetUrl = '') {
  const assetName = assetUrl
    ? decodeURIComponent(new URL(assetUrl, globalThis.location?.href || import.meta.url).pathname.split('/').pop())
    : 'weapon-art.png';
  texture.name = texture.name || assetName;
  const source = texture.image;
  if (source && source.width > VIEWMODEL_TEXTURE_WIDTH && typeof document !== 'undefined') {
    // The authored 1536x1024 masters remain in the package, but uploading all
    // twelve at full size creates needless residency pressure on older
    // discrete/mobile GPUs. The plane never exceeds ~1000px on the
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
    if (/-hip-v2\.png$|-reload-v2\.png$/i.test(assetName)) {
      // First-person forearms intentionally continue through the bottom of
      // the masters. Feather only that final strip so compact portrait layouts
      // can lift the weapon above touch controls without revealing a hard
      // horizontal image boundary. On desktop the feather remains offscreen.
      context.globalCompositeOperation = 'destination-in';
      // Draw the mask across the entire canvas. With destination-in, drawing
      // only the bottom strip also clears every destination pixel outside that
      // strip, which previously amputated the upper 78% of the weapon.
      const fade = context.createLinearGradient(0, 0, 0, canvas.height);
      fade.addColorStop(0, 'rgba(255,255,255,1)');
      fade.addColorStop(0.78, 'rgba(255,255,255,1)');
      fade.addColorStop(0.97, 'rgba(255,255,255,0.42)');
      fade.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = fade;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = 'source-over';
    }
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
 * Loads a weapon's hip, reload and axial-ADS renders and constructs a
 * ready-to-render viewmodel.
 *
 * @param {object} options
 * @param {THREE.WebGLRenderer} [options.renderer] Used only for anisotropy.
 * @param {THREE.LoadingManager} [options.loadingManager]
 * @param {string} [options.assetUrl]
 * @returns {Promise<RealisticViewmodel>}
 */
export async function loadRealisticViewmodel(options = {}) {
  const loader = new THREE.TextureLoader(options.loadingManager);
  const assetUrl = options.assetUrl || PULSE_CARBINE_ASSET_URL;
  let texture = null;
  let reloadTexture = null;
  let adsTexture = null;
  try {
    texture = await loader.loadAsync(assetUrl);
    prepareWeaponTexture(texture, options.renderer, assetUrl);
    if (options.reloadAssetUrl) {
      reloadTexture = await loader.loadAsync(options.reloadAssetUrl);
      prepareWeaponTexture(reloadTexture, options.renderer, options.reloadAssetUrl);
    }
    if (!options.adsAssetUrl) {
      throw new Error('RealisticViewmodel requires a dedicated axial ADS texture.');
    }
    adsTexture = await loader.loadAsync(options.adsAssetUrl);
    prepareWeaponTexture(adsTexture, options.renderer, options.adsAssetUrl);
    return new RealisticViewmodel(texture, {
      ...options,
      reloadTexture,
      adsTexture,
      ownsTexture: true,
      ownsReloadTexture: !!reloadTexture,
      ownsAdsTexture: true,
    });
  } catch (error) {
    if (texture) texture.dispose();
    if (reloadTexture && reloadTexture !== texture) reloadTexture.dispose();
    if (adsTexture && adsTexture !== texture && adsTexture !== reloadTexture) adsTexture.dispose();
    throw error;
  }
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
    if (!options.adsTexture) {
      throw new Error('RealisticViewmodel requires a dedicated axial ADS texture.');
    }
    this.texture = texture;
    this.reloadTexture = options.reloadTexture || null;
    this.adsTexture = options.adsTexture;
    this._ownsTexture = !!options.ownsTexture;
    this._ownsReloadTexture = !!options.ownsReloadTexture;
    this._ownsAdsTexture = !!options.ownsAdsTexture;
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

    // ADS is a separate axial composition. A broadside hip render cannot be
    // made into a truthful sight picture by translating or rotating a flat
    // plane, so the old fake-optic-centering path is intentionally gone.
    this.adsRoot = new THREE.Group();
    this.adsRoot.name = 'weapon-axial-ads-pose';
    this.adsRoot.position.z = -1;
    this.scene.add(this.adsRoot);

    this.adsRecoilRoot = new THREE.Group();
    this.adsRecoilRoot.name = 'weapon-axial-ads-recoil';
    this.adsRoot.add(this.adsRecoilRoot);

    this.adsGeometry = new THREE.PlaneGeometry(this.layout.imageAspect, 1, 1, 1);
    this.adsMaterial = new THREE.MeshBasicMaterial({
      name: 'weapon-axial-ads-cutout',
      map: this.adsTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      alphaTest: 0.015,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.adsMaterial.premultipliedAlpha = false;
    this.adsMaterial.forceSinglePass = true;
    this.adsWeapon = new THREE.Mesh(this.adsGeometry, this.adsMaterial);
    this.adsWeapon.name = 'weapon-axial-ads-plane';
    this.adsWeapon.frustumCulled = false;
    this.adsWeapon.renderOrder = 1003;
    this.adsWeapon.visible = false;
    this.adsRecoilRoot.add(this.adsWeapon);
    this.adsMode = 'dedicated-axial-art';

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
    this._responsiveScale = this.layout.hipScaleDesktop;
    this._adsResponsiveScale = this.layout.adsScale;
    this._hipScreenX = this.layout.hipScreenXDesktop;
    this._hipLift = 0;
    this._portraitWeight = 0;
    this._shortWeight = 0;
    this._aspect = 16 / 9;
    this._viewportWidth = 1280;
    this._viewportHeight = 720;
    this._fov = 70;
    this.visible = true;
    this.syncCamera(70, this._aspect, this._viewportWidth, this._viewportHeight);
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
    this.adsMaterial.opacity = 0;
    this.adsWeapon.visible = false;
  }

  isReloading() {
    return this._reloadProgress >= 0;
  }

  setVisible(visible) {
    this.visible = !!visible;
    this.poseRoot.visible = this.visible;
    this.adsRoot.visible = this.visible;
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
    const d = this.layout;
    const responsive = this._responsiveScale;
    // Scale motion with the responsive art. The old unscaled phone sway was
    // large enough to yank a cropped image boundary back into view.
    const motionScale = Math.max(0.42, Math.min(1.08, responsive / d.hipScaleDesktop));
    const bobX = Math.sin(this._bobPhase) * 0.01 * this._move01 * bobSuppression * motionScale;
    const bobY = Math.abs(Math.cos(this._bobPhase)) * 0.012 * this._move01 * bobSuppression * motionScale;
    const swayX = Math.max(-0.025, Math.min(0.025, -this._lookX * 0.55)) * motionScale;
    const swayY = Math.max(-0.012, Math.min(0.012, this._lookY * 0.5)) * motionScale;

    // Edge-safe v2 art can finally be composed around the playfield instead
    // of being nailed to the lower-right crop. Portrait and short-landscape
    // layouts keep the useful silhouette away from FIRE; the lower forearms
    // use a soft alpha feather where they leave the screen.
    const aimRaise = smoothstep01(this._aim / 0.68);
    const hipX = (this._hipScreenX - 0.5) * this._aspect + bobX + swayX;
    const hipY = -0.5 + responsive * 0.5 + this._hipLift + bobY + swayY;
    let x = hipX + d.sprintOffsetX * sprintPose;
    let y = hipY + d.sprintOffsetY * sprintPose;
    const articulatedReload = !!this.reloadWeapon;
    x += reloadPose * (articulatedReload ? 0.01 : 0.12);
    y += reloadPose * (articulatedReload ? 0.025 : -0.2);
    x *= 1 - aimRaise * 0.72;
    if (articulatedReload) {
      // Apply portrait reload centering after the ADS pose compression so the
      // same authored silhouette stays safe whether reload began from hip or
      // while the optic was raised.
      x += reloadPose * d.reloadPortraitOffsetX * this._portraitWeight;
    }
    y += aimRaise * 0.12;

    this.poseRoot.position.x = x;
    this.poseRoot.position.y = y;
    this.poseRoot.position.z = -1;
    this.poseRoot.rotation.x = reloadPose * (articulatedReload ? -0.01 : -0.16);
    this.poseRoot.rotation.y = reloadPose * (articulatedReload ? 0.015 : 0.21);
    this.poseRoot.rotation.z = d.sprintRoll * sprintPose
      + reloadPose * (articulatedReload ? 0.02 : 0.58)
      + swayX * 0.42 * (1 - aimRaise);

    const scale = responsive * (
      1 + aimRaise * 0.08 - sprintPose * 0.055 - reloadPose * (articulatedReload ? 0.035 : 0.035)
    );
    this.poseRoot.scale.setScalar(scale);

    let reloadBlend = 0;
    if (this.reloadWeapon) {
      // The edge-safe reload composition is spatially compatible with the new
      // hip art, so transition directly and quickly rather than briefly
      // stacking ADS, hip, and reload silhouettes.
      reloadBlend = smoothstep01(reloadPose / 0.22);
    }

    // Make the art swap inside a narrow part of the raise animation. The old
    // long dissolve left two separately positioned guns visible for ~5 frames.
    const adsPoseBlend = smoothstep01((this._aim - 0.46) / 0.08);
    const basePoseBlend = 1 - reloadBlend;
    const hipBlend = basePoseBlend * (1 - adsPoseBlend);
    const adsBlend = basePoseBlend * adsPoseBlend;
    this.weaponMaterial.opacity = hipBlend;
    this.weapon.visible = this.weaponMaterial.opacity > 0.015;
    if (this.reloadMaterial) {
      this.reloadMaterial.opacity = reloadBlend;
      this.reloadWeapon.visible = this.reloadMaterial.opacity > 0.015;
      const reloadPortraitScale = 1
        + (d.reloadPortraitScale - 1) * this._portraitWeight;
      this.reloadWeapon.scale.setScalar(reloadPortraitScale);
    }
    this.adsMaterial.opacity = adsBlend;
    this.adsWeapon.visible = adsBlend > 0.015;

    const adsScale = this._adsResponsiveScale;
    this.adsRoot.position.x = -d.adsSightX * adsScale;
    this.adsRoot.position.y = -d.adsSightY * adsScale;
    this.adsRoot.position.z = -1;
    this.adsRoot.rotation.set(0, 0, 0);
    this.adsRoot.scale.setScalar(adsScale);

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
    // ADS recoil stays on-axis: a short vertical impulse communicates the
    // shot without turning the flat sight render into another canted slab.
    this.adsRecoilRoot.position.set(
      this._recoilYaw * 0.003,
      -this._recoilPitch * 0.012,
      0,
    );
    this.adsRecoilRoot.rotation.set(
      -this._recoilPitch * 0.018,
      this._recoilYaw * 0.008,
      0,
    );
    const adsRecoilScale = 1 - this._recoilKick * 0.012;
    this.adsRecoilRoot.scale.set(adsRecoilScale, adsRecoilScale, 1);

    if (this._flashLife > 0) {
      this._flashLife = Math.max(0, this._flashLife - step);
      const life = this._flashLife / this._flashDuration;
      const envelope = Math.sin(life * Math.PI) * this._flashIntensity;
      this.flashMaterial.opacity = clamp01(envelope * 1.2) * hipBlend;
      const flashScale = 0.86 + (1 - life) * 0.48;
      this.flash.scale.set(0.18 * flashScale, 0.095 * flashScale, 1);
      if (this._flashLife <= 0) {
        this.flashMaterial.opacity = 0;
        this._flashIntensity = 0;
      }
    }
  }

  /** Matches the overlay to the active game camera and viewport aspect. */
  syncCamera(fov, aspect, width = null, height = null) {
    this._fov = Number.isFinite(fov) ? fov : this._fov;
    this._aspect = Math.max(0.35, Number.isFinite(aspect) ? aspect : this._aspect);
    if (Number.isFinite(width) && width > 0) this._viewportWidth = width;
    if (Number.isFinite(height) && height > 0) this._viewportHeight = height;
    this.camera.left = -this._aspect * 0.5;
    this.camera.right = this._aspect * 0.5;
    this.camera.top = 0.5;
    this.camera.bottom = -0.5;
    this.camera.updateProjectionMatrix();

    // Blend responsive modes across aspect and height bands. A binary 0.82
    // breakpoint previously changed the carbine scale 2.7x on a one-pixel
    // resize around small tablets/foldables.
    const portraitWeight = 1 - smoothstep01((this._aspect - 0.68) / 0.38);
    const landscapeWeight = 1 - portraitWeight;
    const shortness = 1 - smoothstep01((this._viewportHeight - 420) / 180);
    const shortWeight = landscapeWeight * shortness;
    const desktopWeight = landscapeWeight - shortWeight;
    const baseHipScale = this.layout.hipScalePortrait * portraitWeight
      + this.layout.hipScaleShort * shortWeight
      + this.layout.hipScaleDesktop * desktopWeight;
    const fovScale = Math.max(0.92, Math.min(1.06, 70 / this._fov));
    const wideCompensation = 1 + desktopWeight
      * (Math.max(1, Math.min(1.08, this._aspect / (16 / 9))) - 1);
    this._responsiveScale = baseHipScale * wideCompensation * fovScale;
    this._hipScreenX = this.layout.hipScreenXPortrait * portraitWeight
      + this.layout.hipScreenXShort * shortWeight
      + this.layout.hipScreenXDesktop * desktopWeight;
    this._hipLift = 0.14 * portraitWeight
      + 0.06 * shortWeight
      + 0.015 * desktopWeight;
    this._portraitWeight = portraitWeight;
    this._shortWeight = shortWeight;
    // The widest axial silhouette (the sidearm hands) occupies ~59% of its
    // source. This fit keeps that silhouette inside a 390px portrait viewport
    // with breathing room instead of merely fitting the transparent plane.
    const portraitFit = Math.min(1, this._aspect / 0.86);
    const adsFit = portraitFit * portraitWeight + 0.9 * shortWeight + desktopWeight;
    this._adsResponsiveScale = this.layout.adsScale * adsFit * fovScale;
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
    if (this.adsRoot.parent) this.adsRoot.parent.remove(this.adsRoot);
    this.weaponGeometry.dispose();
    this.weaponMaterial.dispose();
    if (this.reloadMaterial) this.reloadMaterial.dispose();
    this.adsGeometry.dispose();
    this.adsMaterial.dispose();
    this.flashGeometry.dispose();
    this.flashMaterial.dispose();
    this.flashTexture.dispose();
    if (this._ownsTexture) this.texture.dispose();
    if (this._ownsReloadTexture && this.reloadTexture && this.reloadTexture !== this.texture) {
      this.reloadTexture.dispose();
    }
    if (this._ownsAdsTexture && this.adsTexture
      && this.adsTexture !== this.texture && this.adsTexture !== this.reloadTexture) {
      this.adsTexture.dispose();
    }
    this.onReloadProgress = null;
    this._disposed = true;
  }
}
