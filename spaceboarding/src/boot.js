import { preloadBakedScoriaEnvironmentData } from './scoria-preloads.js';
import { preloadBakedStaticScoriaSurfacePackage } from './static-scoria-package.js';
import { chooseInitialQuality } from './quality.js';

const params = new URLSearchParams(location.search);
const quality = chooseInitialQuality(params);
let scoriaEnvironmentDataPromise = null;
let staticScoriaSurfacePackageRequest = null;
if (quality === 'high') {
  // These calls deliberately precede the dynamic main/renderer/Three import
  // graph. The required environment request begins first; the optional
  // geometry package begins immediately afterward at normal network priority.
  scoriaEnvironmentDataPromise = preloadBakedScoriaEnvironmentData();
  void scoriaEnvironmentDataPromise.catch(() => undefined);
  if (!params.has('procedural-static-scoria') && !params.has('rolling-p1-surface')) {
    staticScoriaSurfacePackageRequest = preloadBakedStaticScoriaSurfacePackage();
  }
}

Object.defineProperty(globalThis, '__SPACEBOARDING_BOOT_PRELOADS__', {
  value: Object.freeze({ quality, scoriaEnvironmentDataPromise, staticScoriaSurfacePackageRequest }),
  configurable: false,
  enumerable: false,
  writable: false,
});

try {
  await import('./main.js');
} catch (error) {
  // main.js normally owns fatal presentation. A module fetch/parse/evaluation
  // failure happens before that handler exists, so keep CALIBRATING from
  // becoming a permanent dead screen.
  document.body.dataset.raceStatus = 'fatal';
  const fatal = document.querySelector('#fatal');
  const message = document.querySelector('#fatal-message');
  if (fatal) fatal.hidden = false;
  if (message) message.textContent = `${error?.message || error}`;
  console.error(error);
}
