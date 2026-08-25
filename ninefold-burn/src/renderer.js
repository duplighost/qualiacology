import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  createVehicle as createPremiumVehicle,
  resetVehiclePresentation as resetPremiumVehiclePresentation,
  updateVehicleVisual as updatePremiumVehicleVisual,
} from './vehicle-art.js';
import { createPlanetOneArt, preloadBakedScoriaEnvironmentData } from './procedural-art.js';
import {
  encodeStaticScoriaSurfacePackage,
  preloadBakedStaticScoriaSurfacePackage,
} from './static-scoria-package.js';
import { CameraDirector } from './camera-director.js';
import { writeVehicleSurfaceFrame } from './surface-frame.js';
import { CombatFX } from './combat-fx.js';
import { createArrivalArt } from './arrival-art.js';
import { createTouchdownArt } from './touchdown-art.js';

import { COURSE, PLANETS, segmentLength } from './content.js';
import {
  FIXED_STEP,
  createRaceState,
  gateTarget,
  getMorphState,
  getSegmentFraction,
  DRIFT_RIPE_CHARGE,
  locateCourseDistance,
  morphAt,
  seededLayout,
  SPACE_WEAPONS_ARM_FRACTION,
  stepRace,
  trackSample,
} from './sim.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (value, target, sharpness, dt) => lerp(value, target, 1 - Math.exp(-sharpness * dt));
const smoothstep = (a, b, value) => {
  const t = clamp((value - a) / Math.max(0.000001, b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const TRACK_RESPONSE_SAMPLE_FIELDS = [
  'x', 'y', 'z', 'cos', 'sin', 'width',
  'normalX', 'normalY', 'normalZ', 'worldProgress', 'fraction',
];
const VERIFY_RIBBON_NORMAL_PARITY = globalThis.location
  ? new URLSearchParams(globalThis.location.search).has('qa-normal-parity')
  : false;
const QA_VISIBILITY_TERRAIN_LAYER = 26;
const QA_VISIBILITY_ROAD_LAYER = 27;
const QA_VISIBILITY_SURFACE_LAYER = 28;
const QA_VISIBILITY_OCCLUDER_LAYER = 29;
const QA_VISIBILITY_PLAYER_LAYER = 30;
const QA_VISIBILITY_TRANSIENT_PLAYER_MESHES = new Set([
  'combustor-core-cluster',
  'combustor-corona-cluster',
  'engine-core-cluster',
  'engine-wake-cluster',
]);
const SCORIA_AUTHORED_BATCH_LABELS = Object.freeze([
  'basalt-spires',
  'rubble-field',
  'vent-shells',
  'vent-glow',
  'launch-pillars',
  'launch-beams',
  'launch-ribs',
  'launch-hot-seams',
]);
const STATIC_SCORIA_TRACK_GRACE_MS = 30;

// Allocation-free form of sim.trackSample's exact Planet I branch. The live
// high-quality ribbon and optic-flow field sample Scoria hundreds of times per
// frame; returning a fresh object for every point produced periodic garbage
// collections even after the terrain arithmetic itself was fast. Keeping the
// same formula in caller-owned records preserves every sampled coordinate.
function sampleScoriaTrackInto(segment, distance, target) {
  const fraction = clamp(distance / Math.max(segment.length, 0.0000001), 0, 1);
  const launchRamp = smoothstep(0.78, 1, fraction);
  const furnace = smoothstep(0.14, 0.31, fraction) * (1 - smoothstep(0.52, 0.66, fraction));
  const canyon = smoothstep(0.48, 0.62, fraction) * (1 - smoothstep(0.74, 0.81, fraction));
  const caldera = smoothstep(0.70, 0.82, fraction);
  target.x = Math.sin(distance * 0.00108 + 0.35) * 5.2
    + Math.sin(distance * 0.00355 + 1.1) * (2.2 + furnace * 8.8)
    + Math.sin(distance * 0.0061) * canyon * 2.1;
  target.y = Math.sin(distance * 0.00132 + 0.6) * 2.1
    + Math.sin(distance * 0.0031) * furnace * 2.8
    + canyon * 1.6
    + launchRamp * launchRamp * 96;
  target.bank = Math.sin(distance * 0.00115 + 0.8) * 0.09
    + Math.sin(distance * 0.00355 + 1.55) * furnace * 0.28
    + Math.sin(distance * 0.0056) * canyon * 0.17
    + launchRamp * 0.22;
  target.width = segment.width * (1 - canyon * 0.18 - caldera * 0.09);
  return target;
}

// High-quality Scoria is the only live surface that combines 168 sampled
// course rows with the full 34-column displaced terrain. Keeping that work in
// updateTrack made V8 repeatedly enter one enormous polymorphic method whose
// other call sites cover every planet, space corridor, quality tier, response
// bank, and hidden-surface branch. This focused writer receives only stable
// numeric values, typed arrays, and preallocated profile/sample records. The
// arithmetic and Float32 store order are intentionally identical to the former
// inline Planet I branch; generic planets and lower quality tiers retain the
// original fallback below.
function writeHighQualityScoriaRibbonRows(
  segment,
  logicalProgress,
  currentX,
  currentY,
  trackRows,
  behindRows,
  trackSpacing,
  samples,
  courseSamples,
  nextSamples,
  roadPosition,
  roadColor,
  roadUv,
  roadProfile,
  terrainPosition,
  terrainColor,
  terrainUv,
  terrainProfile,
  roadBaseR,
  roadBaseG,
  roadBaseB,
  roadAccentR,
  roadAccentG,
  roadAccentB,
  accentR,
  accentG,
  accentB,
  {
    worldProgresses = null,
    worldCoordinates = false,
    writeRoad = true,
    writeTerrain = true,
  } = {},
) {
  const roadColumns = roadProfile.u.length;
  const terrainColumns = terrainProfile.side.length;
  const terrainPhaseSin = terrainProfile.phaseSin;
  const terrainPhaseCos = terrainProfile.phaseCos;
  for (let i = 0; i < trackRows; i += 1) {
    const offset = (i - behindRows) * trackSpacing;
    const worldProgress = worldProgresses ? worldProgresses[i] : logicalProgress + offset;
    const sample = sampleScoriaTrackInto(segment, worldProgress, courseSamples[i]);
    const nextSample = sampleScoriaTrackInto(segment, worldProgress + 2, nextSamples[i]);
    const x = sample.x - currentX;
    let y = sample.y - currentY - 0.52;
    if (worldProgress > segment.length) {
      const fallaway = smoothstep(0, 92, worldProgress - segment.length);
      y -= fallaway * fallaway * 680;
    }
    const z = worldCoordinates ? -worldProgress : -offset;
    const cos = Math.cos(sample.bank);
    const sin = Math.sin(sample.bank);
    const normalXRaw = -sin * 2;
    const normalYRaw = cos * 2;
    const normalZRaw = cos * (nextSample.y - sample.y) - sin * (nextSample.x - sample.x);
    const normalLength = Math.sqrt(
      normalXRaw * normalXRaw + normalYRaw * normalYRaw + normalZRaw * normalZRaw,
    ) || 1;
    const normalX = normalXRaw / normalLength;
    const normalY = normalYRaw / normalLength;
    const normalZ = normalZRaw / normalLength;
    const fraction = clamp(worldProgress / segment.length, 0, 1);
    const canyon = smoothstep(0.48, 0.62, fraction) * (1 - smoothstep(0.74, 0.81, fraction));
    const launch = smoothstep(0.76, 1, fraction);
    const trackRow = samples[i];
    trackRow.x = x;
    trackRow.y = y;
    trackRow.z = z;
    trackRow.cos = cos;
    trackRow.sin = sin;
    trackRow.width = sample.width;
    trackRow.normalX = normalX;
    trackRow.normalY = normalY;
    trackRow.normalZ = normalZ;
    trackRow.worldProgress = worldProgress;
    trackRow.fraction = fraction;

    if (writeRoad) {
      const roadUvY = worldProgress / 38;
      const roadRowOffset = i * roadColumns;
      for (let column = 0; column < roadColumns; column += 1) {
        const u = roadProfile.u[column];
        const vertical = roadProfile.vertical[column];
        const thermalChannel = roadProfile.thermal[column];
        const vertex = roadRowOffset + column;
        const index = vertex * 3;
        const uvIndex = vertex * 2;
        roadPosition[index] = x + u * sample.width * cos - vertical * sin;
        roadPosition[index + 1] = y + u * sample.width * sin + vertical * cos;
        roadPosition[index + 2] = z;
        roadUv[uvIndex] = roadProfile.uv[column];
        roadUv[uvIndex + 1] = roadUvY;
        const accentAmount = 0.012
          + thermalChannel * (0.07 + launch * 0.18)
          + roadProfile.lanePolish[column] * 0.025;
        roadColor[index] = roadBaseR + roadAccentR * accentAmount;
        roadColor[index + 1] = roadBaseG + roadAccentG * accentAmount;
        roadColor[index + 2] = roadBaseB + roadAccentB * accentAmount;
      }
    }

    if (!writeTerrain) continue;
    const terrainRowOffset = i * terrainColumns;
    const terrainUvY = worldProgress / 52;
    const macroRowA = worldProgress * 0.0061 + segment.index * 0.9;
    const macroRowB = worldProgress * 0.0137;
    const macroRowC = worldProgress * 0.0022;
    const macroRowD = worldProgress * 0.027 + segment.index;
    const broadRow = worldProgress * 0.00325;
    const ridgeRowA = worldProgress * 0.0057;
    const ridgeRowB = worldProgress * 0.00235;
    const shelfRowA = worldProgress * 0.011;
    const shelfRowB = worldProgress * 0.0043;
    const fractureRowA = worldProgress * 0.041;
    const fractureRowB = worldProgress * 0.073;
    const canyonRow = worldProgress * 0.012;
    const stratumRow = worldProgress * 0.017;
    const macroRowASin = Math.sin(macroRowA);
    const macroRowACos = Math.cos(macroRowA);
    const macroRowBSin = Math.sin(macroRowB);
    const macroRowBCos = Math.cos(macroRowB);
    const macroRowCSin = Math.sin(macroRowC);
    const macroRowCCos = Math.cos(macroRowC);
    const macroRowDSin = Math.sin(macroRowD);
    const macroRowDCos = Math.cos(macroRowD);
    const broadRowSin = Math.sin(broadRow);
    const broadRowCos = Math.cos(broadRow);
    const ridgeRowASin = Math.sin(ridgeRowA);
    const ridgeRowACos = Math.cos(ridgeRowA);
    const ridgeRowBSin = Math.sin(ridgeRowB);
    const ridgeRowBCos = Math.cos(ridgeRowB);
    const shelfRowASin = Math.sin(shelfRowA);
    const shelfRowACos = Math.cos(shelfRowA);
    const shelfRowBSin = Math.sin(shelfRowB);
    const shelfRowBCos = Math.cos(shelfRowB);
    const fractureRowASin = Math.sin(fractureRowA);
    const fractureRowACos = Math.cos(fractureRowA);
    const fractureRowBSin = Math.sin(fractureRowB);
    const fractureRowBCos = Math.cos(fractureRowB);
    const canyonRowSin = Math.sin(canyonRow);
    const canyonRowCos = Math.cos(canyonRow);
    for (let column = 0; column < terrainColumns; column += 1) {
      const sideScale = terrainProfile.side[column];
      const outerEnvelope = terrainProfile.outer[column];
      const vertex = terrainRowOffset + column;
      const index = vertex * 3;
      const uvIndex = vertex * 2;
      const macroNoise = (macroRowASin * terrainPhaseCos.macroA[column]
        + macroRowACos * terrainPhaseSin.macroA[column]) * 2.8
        + (macroRowBSin * terrainPhaseCos.macroB[column]
          + macroRowBCos * terrainPhaseSin.macroB[column]) * 1.35
        + (macroRowCSin * terrainPhaseCos.macroC[column]
          + macroRowCCos * terrainPhaseSin.macroC[column]) * 4.2
        + (macroRowDSin * terrainPhaseCos.macroD[column]
          + macroRowDCos * terrainPhaseSin.macroD[column]) * 0.72;
      const broadFold = (broadRowSin * terrainPhaseCos.broad[column]
        + broadRowCos * terrainPhaseSin.broad[column]) * 0.5 + 0.5;
      const ridgeAValue = ridgeRowASin * terrainPhaseCos.ridgeA[column]
        + ridgeRowACos * terrainPhaseSin.ridgeA[column];
      const ridgeBValue = ridgeRowBSin * terrainPhaseCos.ridgeB[column]
        + ridgeRowBCos * terrainPhaseSin.ridgeB[column];
      const ridgeA = Math.pow(Math.max(0, ridgeAValue), 3.1);
      const ridgeB = Math.pow(Math.max(0, ridgeBValue), 5.2);
      const escarpment = outerEnvelope * (2.5 + broadFold * 7.5 + ridgeA * 18 + ridgeB * 10.5);
      const terraceUnit = terrainProfile.terraceUnit[column];
      const rawRelief = macroNoise * 0.64 + escarpment;
      const steppedRelief = Math.round(rawRelief / terraceUnit) * terraceUnit;
      const terracedRelief = lerp(rawRelief, steppedRelief, terrainProfile.terraceBlend[column]);
      const shelfFracture = terrainProfile.brokenShelf[column] * (
        (shelfRowASin * terrainPhaseCos.shelfA[column]
          + shelfRowACos * terrainPhaseSin.shelfA[column]) * 2.1
        + (shelfRowBSin * terrainPhaseCos.shelfB[column]
          + shelfRowBCos * terrainPhaseSin.shelfB[column]) * 1.35
      );
      const fractureLips = outerEnvelope * (
        (fractureRowASin * terrainPhaseCos.fractureA[column]
          + fractureRowACos * terrainPhaseSin.fractureA[column]) * 0.9
        + (fractureRowBSin * terrainPhaseCos.fractureB[column]
          + fractureRowBCos * terrainPhaseSin.fractureB[column]) * 0.46
      );
      const canyonWave = canyonRowSin * terrainPhaseCos.canyon[column]
        + canyonRowCos * terrainPhaseSin.canyon[column];
      const terrainRise = macroNoise * terrainProfile.macroScale[column]
        + terracedRelief * terrainProfile.terracedScale[column]
        + shelfFracture
        + fractureLips
        + canyon * terrainProfile.canyonEnvelope[column] * (17 + canyonWave * 7)
        - launch * terrainProfile.launchEnvelope[column] * terrainProfile.launchDepth[column];
      const rawElevation = terrainProfile.shoulderShelf[column] + terrainRise;
      // The terrain ribbon spans both sides of the road as one indexed strip.
      // Its innermost vertices used to retain the full macro ridge field, so
      // triangles crossing the drivable corridor could rise several metres
      // through the asphalt and completely depth-occlude the hero. Preserve
      // the authored outer escarpments, but carve the physical road corridor
      // into a guaranteed sub-road bed before reconstructing normals.
      const corridorCut = terrainProfile.corridorCut[column];
      const elevation = lerp(
        rawElevation,
        Math.min(rawElevation, terrainProfile.corridorClearance[column]),
        corridorCut,
      );
      terrainPosition[index] = x + sideScale * sample.width * cos + elevation * normalX;
      terrainPosition[index + 1] = y + sideScale * sample.width * sin + elevation * normalY;
      terrainPosition[index + 2] = z + elevation * normalZ;
      terrainUv[uvIndex] = terrainProfile.uv[column];
      terrainUv[uvIndex + 1] = terrainUvY;
      const stratum = Math.sin(terrainRise * 1.19 + stratumRow + terrainProfile.stratum[column]) * 0.5 + 0.5;
      const exposure = terrainProfile.exposureBase[column]
        + stratum * terrainProfile.exposureStratum[column];
      const emberMineral = terrainProfile.emberBase[column]
        + stratum * terrainProfile.emberStratum[column];
      terrainColor[index] = Math.min(1, terrainProfile.colorR[column] * exposure + accentR * emberMineral);
      terrainColor[index + 1] = Math.min(1, terrainProfile.colorG[column] * exposure + accentG * emberMineral);
      terrainColor[index + 2] = Math.min(1, terrainProfile.colorB[column] * exposure + accentB * emberMineral);
    }
  }
}

// Exact color endpoints for the first physical launch/arrival corridor. These
// are immutable scratch-free targets: updateTransitionFX can blend every frame
// without constructing Color objects or letting setSegment create a sky cut.
const SCORIA_SKY_TOP = new THREE.Color(PLANETS[0].sky).lerp(new THREE.Color(0x000008), 0.08);
const SCORIA_SKY_BOTTOM = new THREE.Color(PLANETS[0].fog).multiplyScalar(0.7);
const SCORIA_SKY_ACCENT = new THREE.Color(PLANETS[0].accent);
const SCORIA_FOG = new THREE.Color(PLANETS[0].fog);
const SPACE_ONE_SKY_TOP = new THREE.Color(COURSE[1].sky).lerp(new THREE.Color(0x000008), 0.68);
const SPACE_ONE_SKY_BOTTOM = new THREE.Color(COURSE[1].fog).multiplyScalar(0.16);
const SPACE_ONE_SKY_ACCENT = new THREE.Color(0x16455a);
const SPACE_ONE_FOG = new THREE.Color(COURSE[1].fog);
const STORMGLASS_SKY_TOP = new THREE.Color(PLANETS[1].sky).lerp(new THREE.Color(0x000008), 0.08);
const STORMGLASS_SKY_BOTTOM = new THREE.Color(PLANETS[1].fog).multiplyScalar(0.7);
const STORMGLASS_SKY_ACCENT = new THREE.Color(PLANETS[1].accent);
const STORMGLASS_FOG = new THREE.Color(PLANETS[1].fog);
const SCORIA_SUN_LIGHT = new THREE.Color(0xffe3d5);
const SPACE_ONE_SUN_LIGHT = new THREE.Color(0xc5eaff);
const STORMGLASS_SUN_LIGHT = new THREE.Color(PLANETS[1].sun);
const SCORIA_AMBIENT_LIGHT = new THREE.Color(0xffd8cf);
const SPACE_ONE_AMBIENT_LIGHT = new THREE.Color(COURSE[1].sun).lerp(new THREE.Color(0xffffff), 0.2);
const STORMGLASS_AMBIENT_LIGHT = new THREE.Color(PLANETS[1].sun).lerp(new THREE.Color(0xffffff), 0.2);
const SCORIA_HEMISPHERE_LIGHT = new THREE.Color(PLANETS[0].accent).lerp(new THREE.Color(0xffffff), 0.45);
const SPACE_ONE_HEMISPHERE_LIGHT = new THREE.Color(COURSE[1].accent).lerp(new THREE.Color(0xffffff), 0.45);
const STORMGLASS_HEMISPHERE_LIGHT = new THREE.Color(PLANETS[1].accent).lerp(new THREE.Color(0xffffff), 0.45);
const SCORIA_HEMISPHERE_GROUND = new THREE.Color(0x3f2823);
const SPACE_ONE_HEMISPHERE_GROUND = new THREE.Color(COURSE[1].ground);
const STORMGLASS_HEMISPHERE_GROUND = new THREE.Color(PLANETS[1].ground);
const SCORIA_RIM_LIGHT = new THREE.Color(PLANETS[0].accent);
const SPACE_ONE_RIM_LIGHT = new THREE.Color(COURSE[1].secondary);
const STORMGLASS_RIM_LIGHT = new THREE.Color(PLANETS[1].accent);
const SCORIA_DESTINATION_LIGHT = new THREE.Color(0xffddcf);
const SPACE_ONE_DESTINATION_LIGHT = new THREE.Color(0x7bdcff);
const STORMGLASS_DESTINATION_LIGHT = new THREE.Color(0x7bdcff);

function combatPresentationActive(state, segment) {
  if (segment.type !== 'space') return false;
  const morph = getMorphState(state);
  return getSegmentFraction(state) >= SPACE_WEAPONS_ARM_FRACTION && morph.landing < 0.08;
}

function visualUnit(index, salt = 0) {
  const value = Math.sin((index + 1) * 12.9898 + (salt + 1) * 78.233) * 43758.5453123;
  return value - Math.floor(value);
}

function fnv1a32(text, seed = 0x811c9dc5) {
  let hash = seed >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function murmur3x8632Utf16(text, seed = 0x9747b28c) {
  let hash = seed >>> 0;
  let index = 0;
  for (; index + 1 < text.length; index += 2) {
    let chunk = (text.charCodeAt(index) & 0xffff)
      | ((text.charCodeAt(index + 1) & 0xffff) << 16);
    chunk = Math.imul(chunk, 0xcc9e2d51);
    chunk = (chunk << 15) | (chunk >>> 17);
    chunk = Math.imul(chunk, 0x1b873593);
    hash ^= chunk;
    hash = (hash << 13) | (hash >>> 19);
    hash = (Math.imul(hash, 5) + 0xe6546b64) | 0;
  }
  if (index < text.length) {
    let chunk = text.charCodeAt(index) & 0xffff;
    chunk = Math.imul(chunk, 0xcc9e2d51);
    chunk = (chunk << 15) | (chunk >>> 17);
    chunk = Math.imul(chunk, 0x1b873593);
    hash ^= chunk;
  }
  hash ^= text.length * 2;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function independent64BitTextSignature(text) {
  return `${fnv1a32(text)}${murmur3x8632Utf16(text)}`;
}

function describeThreeConstant(value, candidates) {
  const match = candidates.find(([, constant]) => constant === value);
  return match?.[0] ?? String(value);
}

function describeRenderTargetTexture(target) {
  const texture = target?.texture;
  if (!texture) return null;
  return {
    type: texture.type,
    typeName: describeThreeConstant(texture.type, [
      ['UnsignedByteType', THREE.UnsignedByteType],
      ['HalfFloatType', THREE.HalfFloatType],
      ['FloatType', THREE.FloatType],
    ]),
    minFilter: texture.minFilter,
    minFilterName: describeThreeConstant(texture.minFilter, [
      ['NearestFilter', THREE.NearestFilter],
      ['LinearFilter', THREE.LinearFilter],
      ['NearestMipmapNearestFilter', THREE.NearestMipmapNearestFilter],
      ['NearestMipmapLinearFilter', THREE.NearestMipmapLinearFilter],
      ['LinearMipmapNearestFilter', THREE.LinearMipmapNearestFilter],
      ['LinearMipmapLinearFilter', THREE.LinearMipmapLinearFilter],
    ]),
    magFilter: texture.magFilter,
    magFilterName: describeThreeConstant(texture.magFilter, [
      ['NearestFilter', THREE.NearestFilter],
      ['LinearFilter', THREE.LinearFilter],
    ]),
    colorSpace: texture.colorSpace,
    colorSpaceName: describeThreeConstant(texture.colorSpace, [
      ['NoColorSpace', THREE.NoColorSpace],
      ['SRGBColorSpace', THREE.SRGBColorSpace],
      ['LinearSRGBColorSpace', THREE.LinearSRGBColorSpace],
    ]),
    format: texture.format,
    formatName: describeThreeConstant(texture.format, [
      ['RGBAFormat', THREE.RGBAFormat],
      ['RGBFormat', THREE.RGBFormat],
      ['RedFormat', THREE.RedFormat],
    ]),
  };
}

class PresentationRandom {
  constructor() {
    this.mode = 'ambient';
    this.seed = null;
    this.state = null;
    this.calls = 0;
    this.resets = 0;
  }

  setDeterministic(enabled, seed = 0x4e494e45) {
    if (!enabled) {
      this.mode = 'ambient';
      this.seed = null;
      this.state = null;
      this.calls = 0;
      this.resets += 1;
      return this.diagnostics();
    }
    this.mode = 'deterministic';
    this.seed = Number(seed) >>> 0;
    return this.reset();
  }

  reset() {
    if (this.mode !== 'deterministic') return this.diagnostics();
    this.state = this.seed >>> 0;
    this.calls = 0;
    this.resets += 1;
    return this.diagnostics();
  }

  next() {
    this.calls += 1;
    if (this.mode !== 'deterministic') return Math.random();
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let mixed = this.state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  }

  diagnostics() {
    return {
      mode: this.mode,
      seed: this.seed,
      state: this.state,
      calls: this.calls,
      resets: this.resets,
    };
  }
}

/**
 * Builds the same spherical ridge field as the former per-pixel sampler, but
 * factors each octave into longitude and latitude tables first. The angle-
 * addition identities below remove four transcendental calls from every
 * octave of every pixel. At the authored 512x256 resolution that turns the 18
 * planet canvases from tens of millions of trig calls into a few thousand,
 * without changing the resolution, octaves, palette, or procedural formula.
 */
function makeSphericalFieldGrid(width, height, seed, octaves = 5, {
  longitudeScale = 1,
  longitudeOffset = 0,
  latitudeScale = 1,
  latitudeOffset = 0,
  latitudeDivisor = Math.max(1, height - 1),
} = {}) {
  const values = new Float64Array(width * height);
  const longitudeSin = new Float64Array(width);
  const longitudeCos = new Float64Array(width);
  const innerSin = new Float64Array(width);
  const innerCos = new Float64Array(width);
  const latitudeOffsetSin = new Float64Array(height);
  const latitudeOffsetCos = new Float64Array(height);
  const latitudeSin = new Float64Array(height);
  const latitudeCos = new Float64Array(height);
  let amplitude = 0.55;
  let frequency = 1;
  let normalizer = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    const phase = seed * (0.0137 + octave * 0.0061);
    for (let x = 0; x < width; x += 1) {
      const longitude = (x / width) * Math.PI * 2 * longitudeScale + longitudeOffset;
      const longitudeAngle = longitude * frequency;
      longitudeSin[x] = Math.sin(longitudeAngle);
      longitudeCos[x] = Math.cos(longitudeAngle);
      const inner = Math.sin(longitudeAngle * 0.47 + phase);
      innerSin[x] = Math.sin(inner);
      innerCos[x] = Math.cos(inner);
    }
    for (let y = 0; y < height; y += 1) {
      const latitude = (y / latitudeDivisor - 0.5) * Math.PI * latitudeScale + latitudeOffset;
      const warpOffset = Math.sin(latitude * frequency * 1.37 + phase) * (1.15 / frequency)
        + phase * 2.3;
      latitudeOffsetSin[y] = Math.sin(warpOffset);
      latitudeOffsetCos[y] = Math.cos(warpOffset);
      const latitudeAngle = latitude * frequency * 0.83;
      latitudeSin[y] = Math.sin(latitudeAngle);
      latitudeCos[y] = Math.cos(latitudeAngle);
    }

    let index = 0;
    for (let y = 0; y < height; y += 1) {
      const offsetSin = latitudeOffsetSin[y];
      const offsetCos = latitudeOffsetCos[y];
      const latSin = latitudeSin[y];
      const latCos = latitudeCos[y];
      for (let x = 0; x < width; x += 1) {
        const warpedLongitude = longitudeSin[x] * offsetCos + longitudeCos[x] * offsetSin;
        const latitudeRidge = latCos * innerCos[x] + latSin * innerSin[x];
        const ridge = warpedLongitude * latitudeRidge;
        values[index] += (ridge * 0.5 + 0.5) * amplitude;
        index += 1;
      }
    }
    normalizer += amplitude;
    amplitude *= 0.51;
    frequency *= 2.07;
  }

  const inverseNormalizer = 1 / Math.max(0.0001, normalizer);
  for (let i = 0; i < values.length; i += 1) values[i] *= inverseNormalizer;
  return values;
}

function colorMix(a, b, amount) {
  return new THREE.Color(a).lerp(new THREE.Color(b), amount);
}

function setAttrDynamic(attribute) {
  attribute.setUsage(THREE.DynamicDrawUsage);
  return attribute;
}

function setAttrUsage(attribute, usage) {
  attribute.setUsage(usage);
  return attribute;
}

function makeRibbonGeometry(
  rows,
  columns = 2,
  usage = THREE.DynamicDrawUsage,
  initializeNormals = true,
) {
  const positions = new Float32Array(rows * columns * 3);
  const colors = new Float32Array(rows * columns * 3);
  const uvs = new Float32Array(rows * columns * 2);
  const indices = [];
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + columns;
      const c = b + 1;
      const d = a + 1;
      indices.push(a, b, d, b, c, d);
    }
  }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const uv = (row * columns + column) * 2;
      uvs[uv] = column / Math.max(1, columns - 1);
      uvs[uv + 1] = row / Math.max(1, rows - 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', setAttrUsage(new THREE.BufferAttribute(positions, 3), usage));
  geometry.setAttribute('color', setAttrUsage(new THREE.BufferAttribute(colors, 3), usage));
  geometry.setAttribute('uv', setAttrUsage(new THREE.BufferAttribute(uvs, 2), usage));
  geometry.setIndex(indices);
  geometry.index.setUsage(usage);
  if (initializeNormals) {
    geometry.computeVertexNormals();
  } else {
    geometry.setAttribute('normal', setAttrUsage(
      new THREE.BufferAttribute(new Float32Array(rows * columns * 3), 3),
      usage,
    ));
  }
  // All ribbon families reconstruct or rewrite their normals during live
  // movement. computeVertexNormals creates this attribute with StaticDrawUsage
  // by default, which left D3D free to place a per-frame stream in static
  // storage and produced rare clustered buffer-sync stalls during drift.
  // The array values, topology, precision and update cadence are unchanged.
  setAttrUsage(geometry.getAttribute('normal'), usage);
  return geometry;
}

// BufferGeometry.computeVertexNormals is intentionally general-purpose: it
// allocates several Vector3 scratch objects and repeatedly crosses the
// BufferAttribute accessor boundary for every triangle. These ribbons are
// reconstructed in-place during play, so the generic pass used to turn every
// fourth high-quality Scoria frame into a visible CPU spike. This is the same
// indexed, area-weighted normal reconstruction performed directly on the
// packed arrays. It preserves the authored topology and displaced surface; it
// only removes the abstraction overhead from the live frame.
function reconstructRibbonNormals(geometry, rows, columns) {
  const positions = geometry.attributes.position.array;
  const normals = geometry.attributes.normal.array;
  normals.fill(0);
  const rowStride = columns * 3;
  for (let row = 0; row < rows - 1; row += 1) {
    let ia = row * rowStride;
    for (let column = 0; column < columns - 1; column += 1) {
      const ib = ia + rowStride;
      const id = ia + 3;
      const ic = ib + 3;
      // Exact index order from makeRibbonGeometry: a,b,d then b,c,d.
      let cbx = positions[id] - positions[ib];
      let cby = positions[id + 1] - positions[ib + 1];
      let cbz = positions[id + 2] - positions[ib + 2];
      let abx = positions[ia] - positions[ib];
      let aby = positions[ia + 1] - positions[ib + 1];
      let abz = positions[ia + 2] - positions[ib + 2];
      let nx = cby * abz - cbz * aby;
      let ny = cbz * abx - cbx * abz;
      let nz = cbx * aby - cby * abx;
      normals[ia] += nx;
      normals[ia + 1] += ny;
      normals[ia + 2] += nz;
      normals[ib] += nx;
      normals[ib + 1] += ny;
      normals[ib + 2] += nz;
      normals[id] += nx;
      normals[id + 1] += ny;
      normals[id + 2] += nz;

      cbx = positions[id] - positions[ic];
      cby = positions[id + 1] - positions[ic + 1];
      cbz = positions[id + 2] - positions[ic + 2];
      abx = positions[ib] - positions[ic];
      aby = positions[ib + 1] - positions[ic + 1];
      abz = positions[ib + 2] - positions[ic + 2];
      nx = cby * abz - cbz * aby;
      ny = cbz * abx - cbx * abz;
      nz = cbx * aby - cby * abx;
      normals[ib] += nx;
      normals[ib + 1] += ny;
      normals[ib + 2] += nz;
      normals[ic] += nx;
      normals[ic + 1] += ny;
      normals[ic + 2] += nz;
      normals[id] += nx;
      normals[id + 1] += ny;
      normals[id + 2] += nz;
      ia += 3;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const normalX = normals[i];
    const normalY = normals[i + 1];
    const normalZ = normals[i + 2];
    const length = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ) || 1;
    normals[i] /= length;
    normals[i + 1] /= length;
    normals[i + 2] /= length;
  }
  if (VERIFY_RIBBON_NORMAL_PARITY) {
    const reference = new Float32Array(normals.length);
    const indices = geometry.index.array;
    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i] * 3;
      const ib = indices[i + 1] * 3;
      const ic = indices[i + 2] * 3;
      const cbx = positions[ic] - positions[ib];
      const cby = positions[ic + 1] - positions[ib + 1];
      const cbz = positions[ic + 2] - positions[ib + 2];
      const abx = positions[ia] - positions[ib];
      const aby = positions[ia + 1] - positions[ib + 1];
      const abz = positions[ia + 2] - positions[ib + 2];
      const nx = cby * abz - cbz * aby;
      const ny = cbz * abx - cbx * abz;
      const nz = cbx * aby - cby * abx;
      reference[ia] += nx;
      reference[ia + 1] += ny;
      reference[ia + 2] += nz;
      reference[ib] += nx;
      reference[ib + 1] += ny;
      reference[ib + 2] += nz;
      reference[ic] += nx;
      reference[ic + 1] += ny;
      reference[ic + 2] += nz;
    }
    for (let i = 0; i < reference.length; i += 3) {
      const x = reference[i];
      const y = reference[i + 1];
      const z = reference[i + 2];
      const length = Math.sqrt(x * x + y * y + z * z) || 1;
      reference[i] /= length;
      reference[i + 1] /= length;
      reference[i + 2] /= length;
    }
    const actualBits = new Uint32Array(normals.buffer, normals.byteOffset, normals.length);
    const referenceBits = new Uint32Array(reference.buffer);
    for (let i = 0; i < actualBits.length; i += 1) {
      if (actualBits[i] !== referenceBits[i]) {
        throw new Error(`Regular-grid ribbon normal parity failed at component ${i}.`);
      }
    }
  }
}

function makeLineGeometry(rows, usage = THREE.DynamicDrawUsage) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', setAttrUsage(
    new THREE.BufferAttribute(new Float32Array(rows * 3), 3),
    usage,
  ));
  return geometry;
}

const STATIC_SCORIA_REAR_PAD = 180;
const STATIC_SCORIA_FORWARD_WINDOW = 2325;
const STATIC_SCORIA_FALL_TAIL = 105;

function makeStaticScoriaProgressRows(segmentLengthValue, spacing) {
  const rows = [];
  const roundProgress = (value) => Number(value.toFixed(6));
  for (let progress = -STATIC_SCORIA_REAR_PAD;
    progress < segmentLengthValue - 0.000001;
    progress += spacing) {
    rows.push(roundProgress(progress));
  }
  // The launch ownership boundary must be a literal vertex row. The rear
  // lattice is intentionally not phase-shifted to make 8,200 divisible: that
  // would remove the exact -180 m opening pad.
  if (rows.at(-1) !== segmentLengthValue) rows.push(segmentLengthValue);
  const tailEnd = segmentLengthValue + STATIC_SCORIA_FALL_TAIL;
  for (let progress = segmentLengthValue + spacing;
    progress < tailEnd - 0.000001;
    progress += spacing) {
    rows.push(roundProgress(progress));
  }
  if (rows.at(-1) !== tailEnd) rows.push(tailEnd);
  // Preserve the exact point where the legacy fallaway smoothstep saturates.
  // Without this anchor the 15 m lattice linearly smears the final 2 m of the
  // plunge across a 13 m triangle before reaching the retained flat tail.
  const fallawayKnee = segmentLengthValue + 92;
  if (fallawayKnee < tailEnd && !rows.includes(fallawayKnee)) {
    rows.push(fallawayKnee);
    rows.sort((left, right) => left - right);
  }
  return Float64Array.from(rows);
}

function lowerBoundProgress(rows, target) {
  let low = 0;
  let high = rows.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (rows[middle] < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function upperBoundProgress(rows, target) {
  let low = 0;
  let high = rows.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (rows[middle] <= target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function geometryResidentBytes(geometry) {
  let bytes = geometry.index?.array?.byteLength ?? 0;
  for (const attribute of Object.values(geometry.attributes)) {
    bytes += attribute.array?.byteLength ?? 0;
  }
  return bytes;
}

function triangleWingGeometry(side = 1) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([
    0, 0, 0.8,
    side * 3.1, 0, 2.5,
    side * 0.5, 0, -1.8,
    0, 0, 0.8,
    side * 0.5, 0, -1.8,
    0, 0.2, -2.2,
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function makeFracturedRockGeometry(detail = 2, seed = 1) {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const positions = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i += 1) {
    point.fromBufferAttribute(positions, i);
    const ridge = Math.sin(point.x * 17.3 + point.y * 9.7 + point.z * 13.1 + seed * 1.91) * 0.08
      + Math.sin(point.x * 31.7 - point.y * 21.3 + point.z * 7.9 + seed) * 0.045;
    const fracture = Math.sign(Math.sin(point.x * 5.2 + point.z * 4.7 + seed)) * 0.035;
    point.multiplyScalar(1 + ridge + fracture);
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A purpose-built volcanic stack, still cheap enough to instance for the whole
 * Scoria run. The previous non-uniformly-scaled icosahedron made every landmark
 * read as the same pointed pebble. Ring-dependent taper, a sheared fault plane,
 * and a genuinely broken crown give the shared mesh a geological silhouette;
 * deterministic per-instance rotation/scale below supplies the larger variety
 * without splitting the field into more draw calls.
 */
function makeScoriaSpireGeometry(detail = 2, seed = 17) {
  const radialSegments = detail <= 0 ? 7 : detail === 1 ? 9 : 11;
  const heightSegments = detail <= 0 ? 4 : 7;
  const geometry = new THREE.CylinderGeometry(0.62, 1, 1, radialSegments, heightSegments, false);
  const positions = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i += 1) {
    point.fromBufferAttribute(positions, i);
    const originalRadius = Math.hypot(point.x, point.z);
    const height = clamp(point.y + 0.5, 0, 1);
    const angle = originalRadius > 0.0001 ? Math.atan2(point.z, point.x) : 0;
    const taper = lerp(1.12, 0.84, Math.pow(height, 0.72));
    const shoulder = Math.exp(-Math.pow((height - 0.24) / 0.17, 2)) * 0.2;
    const verticalFault = Math.sign(Math.sin(angle * 2.04 + seed * 0.37)) * (0.045 + height * 0.038);
    const angularFracture = Math.sin(angle * 3.0 + seed) * 0.11
      + Math.sin(angle * 7.0 - seed * 0.41) * 0.055;
    const ringFracture = Math.sin(height * 19.7 + angle * 1.8 + seed) * 0.06;
    const radius = originalRadius * Math.max(0.16, taper + shoulder + angularFracture + ringFracture + verticalFault);
    const crownBreak = smoothstep(0.78, 1, height)
      * (0.055 + (Math.sin(angle * 2.0 + seed * 1.7) * 0.5 + 0.5) * 0.13);
    const faultShear = height * height * 0.17 + Math.sin(height * 8.6 + seed) * 0.025;
    point.x = Math.cos(angle) * radius + faultShear;
    point.z = Math.sin(angle) * radius - height * 0.075;
    point.y -= crownBreak;
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeSoftDiscTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size * 0.5, size * 0.5, 0, size * 0.5, size * 0.5, size * 0.5);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,.92)');
  gradient.addColorStop(0.54, 'rgba(255,255,255,.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function mesh(geometry, material, parent, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position);
  item.rotation.set(...rotation);
  item.scale.set(...scale);
  parent.add(item);
  return item;
}

const LAUNCH_FALLAWAY_RADIUS = 218;
const LAUNCH_FALLAWAY_CENTER_Z = 158;

function launchFallawaySurfaceHeight(x, z, lift = 0) {
  const dz = z - LAUNCH_FALLAWAY_CENTER_Z;
  const radial = Math.max(0, LAUNCH_FALLAWAY_RADIUS * LAUNCH_FALLAWAY_RADIUS - x * x - dz * dz);
  return -LAUNCH_FALLAWAY_RADIUS + Math.sqrt(radial) + lift;
}

function launchFallawayTerrainHalfWidth(along, z) {
  const dz = z - LAUNCH_FALLAWAY_CENTER_Z;
  const sphericalWidth = Math.sqrt(Math.max(
    1,
    LAUNCH_FALLAWAY_RADIUS * LAUNCH_FALLAWAY_RADIUS - dz * dz,
  ));
  const roadEnvelope = Math.sin(Math.PI * Math.pow(along, 0.92));
  const roadShape = Math.pow(Math.max(0, roadEnvelope), 0.52);
  const roadHalfWidth = lerp(6.8, 14.5, roadShape);
  const roadCenter = Math.sin(along * Math.PI) * Math.sin(along * Math.PI * 2.3) * 1.35;
  const shoulderWidth = lerp(32, 52, roadShape);
  return Math.min(
    sphericalWidth * 0.45,
    Math.abs(roadCenter) + roadHalfWidth + shoulderWidth,
  );
}

function launchFallawayRoadPoint(along, across) {
  const z = lerp(-34, 350, along);
  const endEnvelope = Math.sin(Math.PI * Math.pow(along, 0.92));
  const halfWidth = lerp(6.8, 14.5, Math.pow(Math.max(0, endEnvelope), 0.52));
  const center = Math.sin(along * Math.PI) * Math.sin(along * Math.PI * 2.3) * 1.35;
  const x = center + across * halfWidth;
  const crown = (1 - Math.abs(across)) * 0.16;
  return {
    x,
    y: launchFallawaySurfaceHeight(x, z, 1.58 + crown),
    z,
  };
}

function makeLaunchFallawayTerrainGeometry(rows = 23, columns = 21) {
  const positions = new Float32Array(rows * columns * 3);
  const uvs = new Float32Array(rows * columns * 2);
  const indices = [];
  let minHalfWidth = Infinity;
  let maxHalfWidth = 0;
  let maxSphereRatio = 0;
  let minRoadClearance = Infinity;
  for (let row = 0; row < rows; row += 1) {
    const along = row / Math.max(1, rows - 1);
    const z = lerp(-34, 350, along);
    const dz = z - LAUNCH_FALLAWAY_CENTER_Z;
    const sphericalWidth = Math.sqrt(Math.max(1, LAUNCH_FALLAWAY_RADIUS * LAUNCH_FALLAWAY_RADIUS - dz * dz));
    const halfWidth = launchFallawayTerrainHalfWidth(along, z);
    const leftRoadEdge = launchFallawayRoadPoint(along, -1).x;
    const rightRoadEdge = launchFallawayRoadPoint(along, 1).x;
    const roadExtent = Math.max(Math.abs(leftRoadEdge), Math.abs(rightRoadEdge));
    minHalfWidth = Math.min(minHalfWidth, halfWidth);
    maxHalfWidth = Math.max(maxHalfWidth, halfWidth);
    maxSphereRatio = Math.max(maxSphereRatio, halfWidth / sphericalWidth);
    minRoadClearance = Math.min(minRoadClearance, halfWidth - roadExtent);
    for (let column = 0; column < columns; column += 1) {
      const across = column / Math.max(1, columns - 1);
      const x = lerp(-halfWidth, halfWidth, across);
      const side = Math.abs(across * 2 - 1);
      const fracture = Math.sin(x * 0.043 + z * 0.018) * (0.22 + side * 0.72)
        + Math.sin(x * 0.012 - z * 0.041) * (0.12 + side * 0.38);
      const index = (row * columns + column) * 3;
      const uv = (row * columns + column) * 2;
      positions[index] = x;
      positions[index + 1] = launchFallawaySurfaceHeight(x, z, 1.05 + fracture * 0.55);
      positions[index + 2] = z;
      uvs[uv] = across * 5.5;
      uvs[uv + 1] = along * 7.5;
      if (row < rows - 1 && column < columns - 1) {
        const a = row * columns + column;
        indices.push(a, a + columns, a + 1, a + columns, a + columns + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData.launchFallaway = {
    rows,
    columns,
    triangles: indices.length / 3,
    minHalfWidth,
    maxHalfWidth,
    maxSphereRatio,
    minRoadClearance,
  };
  return geometry;
}

function makeLaunchFallawayRoadGeometry(rows = 31, columns = 5) {
  const positions = new Float32Array(rows * columns * 3);
  const uvs = new Float32Array(rows * columns * 2);
  const indices = [];
  for (let row = 0; row < rows; row += 1) {
    const along = row / Math.max(1, rows - 1);
    for (let column = 0; column < columns; column += 1) {
      const across = column / Math.max(1, columns - 1) * 2 - 1;
      const point = launchFallawayRoadPoint(along, across);
      const index = (row * columns + column) * 3;
      const uv = (row * columns + column) * 2;
      positions[index] = point.x;
      positions[index + 1] = point.y;
      positions[index + 2] = point.z;
      uvs[uv] = column / Math.max(1, columns - 1);
      uvs[uv + 1] = along * 8;
      if (row < rows - 1 && column < columns - 1) {
        const a = row * columns + column;
        indices.push(a, a + columns, a + 1, a + columns, a + columns + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData.launchFallaway = {
    rows,
    columns,
    triangles: indices.length / 3,
  };
  return geometry;
}

function makeLaunchFallawayHeatGeometry(rows = 29) {
  const positions = [];
  let minEdgeMargin = Infinity;
  const pushCurve = (sampler) => {
    let previous = sampler(0);
    for (let row = 1; row < rows; row += 1) {
      const current = sampler(row / (rows - 1));
      positions.push(previous.x, previous.y, previous.z, current.x, current.y, current.z);
      previous = current;
    }
  };
  for (const lane of [-1, 0, 1]) {
    pushCurve((along) => {
      const point = launchFallawayRoadPoint(along, lane);
      point.y += 0.16;
      return point;
    });
  }
  for (const side of [-0.62, 0.67]) {
    pushCurve((along) => {
      const z = lerp(-24, 338, along);
      const terrainAlong = clamp((z + 34) / 384, 0, 1);
      const width = launchFallawayTerrainHalfWidth(terrainAlong, z);
      // Preserve each seam's old phase and relative placement inside the
      // former 0.93-radius terrain while keeping it on the cropped crust.
      const x = width * (side / 0.93) + Math.sin(along * 10.4 + side) * 3.2;
      minEdgeMargin = Math.min(minEdgeMargin, width - Math.abs(x));
      return { x, y: launchFallawaySurfaceHeight(x, z, 1.34), z };
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  geometry.userData.launchFallaway = {
    rows,
    lineSegments: positions.length / 6,
    minEdgeMargin,
  };
  return geometry;
}

function createVehicle(accentHex, secondaryHex, { player = false, personality = 0 } = {}) {
  const group = new THREE.Group();
  group.name = player ? 'player-vehicle' : `rival-${personality}`;
  const dark = new THREE.MeshPhysicalMaterial({
    color: 0x080a0f,
    metalness: 0.92,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
  const metal = new THREE.MeshPhysicalMaterial({
    color: player ? 0xcad7df : secondaryHex,
    metalness: 0.86,
    roughness: 0.22,
    clearcoat: 0.85,
    clearcoatRoughness: 0.14,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: colorMix(accentHex, 0xffffff, 0.32),
    emissive: accentHex,
    emissiveIntensity: 0.22,
    metalness: 0.12,
    roughness: 0.06,
    transmission: 0.42,
    transparent: true,
    opacity: 0.83,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const tire = new THREE.MeshStandardMaterial({ color: 0x030406, roughness: 0.9, metalness: 0.15 });

  const core = new THREE.Group();
  group.add(core);
  const body = mesh(new THREE.BoxGeometry(2.55, 0.56, 4.5), metal, core, [0, 0.18, 0.05]);
  body.geometry.translate(0, 0, 0.12);
  mesh(new THREE.ConeGeometry(1.26, 2.7, 6), metal, core, [0, 0.16, -3], [-Math.PI / 2, 0, 0], [1, 0.72, 1]);
  mesh(new THREE.SphereGeometry(0.92, 20, 12), glass, core, [0, 0.67, -0.55], [0, 0, 0], [0.95, 0.44, 1.35]);
  mesh(new THREE.BoxGeometry(2.8, 0.18, 1.2), dark, core, [0, -0.13, 1.35]);
  mesh(new THREE.BoxGeometry(0.22, 0.16, 3.8), glow, core, [0, 0.48, 0.25]);

  const carParts = new THREE.Group();
  group.add(carParts);
  mesh(new THREE.BoxGeometry(3.2, 0.22, 0.82), dark, carParts, [0, 0.22, 1.9]);
  mesh(new THREE.BoxGeometry(3.65, 0.12, 0.45), metal, carParts, [0, 0.87, 1.85]);
  const wheels = [];
  for (const x of [-1.48, 1.48]) {
    for (const z of [-1.45, 1.38]) {
      const wheel = mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.32, 18), tire, carParts, [x, -0.3, z], [0, 0, Math.PI / 2]);
      mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.34, 14), glow, wheel, [0, 0, 0]);
      wheels.push(wheel);
    }
  }
  const frontFin = mesh(new THREE.BoxGeometry(0.18, 0.5, 1.8), metal, carParts, [0, 0.47, -2.1], [0, 0, Math.PI / 2]);

  const rocketParts = new THREE.Group();
  group.add(rocketParts);
  mesh(new THREE.ConeGeometry(0.85, 3.2, 8), dark, rocketParts, [0, 0.15, -3.55], [-Math.PI / 2, 0, 0], [1, 1, 1]);
  const leftWing = mesh(triangleWingGeometry(-1), metal, rocketParts, [0, -0.05, 0.55]);
  const rightWing = mesh(triangleWingGeometry(1), metal, rocketParts, [0, -0.05, 0.55]);
  const gunPods = [
    mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.2, 10), dark, rocketParts, [-1.55, 0.08, -0.65], [Math.PI / 2, 0, 0]),
    mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.2, 10), dark, rocketParts, [1.55, 0.08, -0.65], [Math.PI / 2, 0, 0]),
  ];
  for (const pod of gunPods) mesh(new THREE.CircleGeometry(0.13, 12), glow, pod, [0, 1.11, 0], [Math.PI / 2, 0, 0]);
  const turbines = [];
  for (const x of [-0.78, 0, 0.78]) {
    const turbine = mesh(new THREE.TorusGeometry(0.28, 0.085, 8, 24), glow, core, [x, 0.04, 2.38], [0, 0, 0]);
    turbines.push(turbine);
  }

  const wakes = [];
  for (const x of [-0.78, 0, 0.78]) {
    const wake = mesh(new THREE.ConeGeometry(0.32, 5.5, 12, 1, true), glow.clone(), core, [x, 0.04, 5.15], [Math.PI / 2, 0, 0]);
    wake.material.opacity = 0.28;
    wakes.push(wake);
  }
  rocketParts.scale.setScalar(0.001);

  group.userData = {
    accent: new THREE.Color(accentHex),
    materials: [dark, metal, glass, glow, tire, ...wakes.map((wake) => wake.material)],
    core,
    body,
    carParts,
    rocketParts,
    wheels,
    turbines,
    wakes,
    wings: [leftWing, rightWing],
    frontFin,
    gunPods,
    player,
    personality,
  };
  group.scale.setScalar(player ? 1 : 0.92 + personality * 0.05);
  return group;
}

function updateVehicleVisual(vehicle, { morph, boost, speed, yaw, roll, lift = 0, hitFlash = 0, dt = 1 / 60 }) {
  const data = vehicle.userData;
  const carAmount = 1 - morph;
  data.carParts.visible = carAmount > 0.01;
  data.rocketParts.visible = morph > 0.01;
  data.carParts.scale.set(1, Math.max(0.02, carAmount), 1);
  data.rocketParts.scale.setScalar(Math.max(0.001, morph));
  data.rocketParts.position.y = (1 - morph) * -0.35;
  data.core.scale.set(1 - morph * 0.13, 1 - morph * 0.08, 1 + morph * 0.34);
  for (let i = 0; i < data.wheels.length; i += 1) {
    const wheel = data.wheels[i];
    wheel.rotation.x -= speed * dt * 0.032;
    wheel.position.y = -0.3 + morph * 0.42;
    wheel.position.x = (i < 2 ? -1 : 1) * (1.48 - morph * 0.7);
    wheel.scale.setScalar(Math.max(0.06, 1 - morph * 0.82));
  }
  data.frontFin.rotation.z = Math.PI / 2 + morph * Math.PI / 2;
  const flame = 0.72 + boost * 1.3 + clamp((speed - 300) / 700, 0, 1) * 0.5;
  data.turbines.forEach((turbine, i) => {
    turbine.scale.setScalar(0.82 + flame * 0.24 + Math.sin(performance.now() * 0.012 + i) * 0.04);
    turbine.material.opacity = 0.65 + boost * 0.35;
  });
  data.wakes.forEach((wake, i) => {
    wake.scale.set(0.8 + morph * 0.45, 0.8 + morph * 0.45, flame * (0.7 + i * 0.1));
    wake.material.opacity = 0.2 + boost * 0.32 + morph * 0.1;
  });
  vehicle.rotation.y = yaw;
  vehicle.rotation.z = roll;
  vehicle.position.y = 0.2 + lift;
  const flash = 0.2 + hitFlash * 2.8;
  data.materials[2].emissiveIntensity = flash;
}

export function makePlanetTexture(baseHex, accentHex, seed, styleIndex = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d', { alpha: false });
  const image = context.createImageData(canvas.width, canvas.height);
  const base = new THREE.Color(baseHex);
  const accent = new THREE.Color(accentHex);
  const field = makeSphericalFieldGrid(canvas.width, canvas.height, seed, 5);
  const broad = makeSphericalFieldGrid(canvas.width, canvas.height, seed + 177, 4, {
    longitudeScale: 0.53,
    longitudeOffset: 1.7,
    latitudeScale: 0.72,
    latitudeOffset: -0.3,
  });
  const fine = makeSphericalFieldGrid(canvas.width, canvas.height, seed + 991, 3, {
    longitudeScale: 3.6,
    longitudeOffset: -2.1,
    latitudeScale: 3.1,
    latitudeOffset: 0.7,
  });
  for (let y = 0; y < canvas.height; y += 1) {
    const latitude = (y / (canvas.height - 1) - 0.5) * Math.PI;
    for (let x = 0; x < canvas.width; x += 1) {
      const longitude = (x / canvas.width) * Math.PI * 2;
      const pixel = y * canvas.width + x;
      const fieldValue = field[pixel];
      const broadValue = broad[pixel];
      const bands = Math.sin(latitude * (styleIndex === 1 ? 31 : 12 + (seed % 4))
        + (fieldValue - 0.5) * (styleIndex === 1 ? 8.5 : 4.2)
        + Math.sin(longitude * 2.0 + seed * 0.01) * 0.72) * 0.5 + 0.5;
      const fineValue = fine[pixel];
      const polar = Math.pow(Math.abs(Math.sin(latitude)), 5);
      const stormAmount = styleIndex === 1
        ? 0.06 + bands * 0.24 + broadValue * 0.15 + fineValue * fineValue * fineValue * 0.13
        : 0.07 + fieldValue * 0.35 + broadValue * 0.18 + fineValue * 0.06 + polar * 0.06;
      const amount = clamp(stormAmount, 0.025, styleIndex === 1 ? 0.56 : 0.72);
      const brightness = styleIndex === 1
        ? 0.62 + broadValue * 0.28 + bands * 0.09
        : 0.68 + fieldValue * 0.31 + fineValue * 0.07;
      const imageIndex = pixel * 4;
      image.data[imageIndex] = Math.round((base.r + (accent.r - base.r) * amount) * brightness * 255);
      image.data[imageIndex + 1] = Math.round((base.g + (accent.g - base.g) * amount) * brightness * 255);
      image.data[imageIndex + 2] = Math.round((base.b + (accent.b - base.b) * amount) * brightness * 255);
      image.data[imageIndex + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

export function makePlanetCloudTexture(accentHex, seed, styleIndex = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const image = context.createImageData(canvas.width, canvas.height);
  const accent = new THREE.Color(accentHex).lerp(new THREE.Color(0xffffff), 0.68);
  const field = makeSphericalFieldGrid(canvas.width, canvas.height, seed, 5, {
    longitudeScale: 1.55,
    latitudeScale: 1.35,
    latitudeDivisor: canvas.height,
  });
  const broken = makeSphericalFieldGrid(canvas.width, canvas.height, seed + 401, 3, {
    longitudeScale: 3.2,
    longitudeOffset: 0.4,
    latitudeScale: 2.6,
    latitudeDivisor: canvas.height,
  });
  for (let y = 0; y < canvas.height; y += 1) {
    const v = y / canvas.height;
    for (let x = 0; x < canvas.width; x += 1) {
      const u = x / canvas.width;
      const longitude = u * Math.PI * 2;
      const latitude = (v - 0.5) * Math.PI;
      const pixel = y * canvas.width + x;
      const fieldValue = field[pixel];
      const ribbons = Math.sin(latitude * (styleIndex === 1 ? 43 : 19)
        + (fieldValue - 0.5) * (styleIndex === 1 ? 12 : 6)
        + Math.sin(longitude * 2.7 + seed * 0.01) * 1.2) * 0.5 + 0.5;
      const brokenValue = broken[pixel];
      const density = smoothstep(styleIndex === 1 ? 0.58 : 0.62, styleIndex === 1 ? 0.79 : 0.84,
        ribbons * (styleIndex === 1 ? 0.58 : 0.42) + fieldValue * 0.31 + brokenValue * 0.16);
      const imageIndex = pixel * 4;
      image.data[imageIndex] = Math.round(accent.r * 255);
      image.data[imageIndex + 1] = Math.round(accent.g * 255);
      image.data[imageIndex + 2] = Math.round(accent.b * 255);
      image.data[imageIndex + 3] = Math.round(density * (styleIndex === 1 ? 205 : 165));
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function loadRuntimePlanetTexture(planetIndex, kind) {
  const number = String(planetIndex + 1).padStart(2, '0');
  const sourceUrl = new URL(`../assets/textures/runtime/planets/planet-${number}-${kind}.png`, import.meta.url).href;
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const texture = new THREE.TextureLoader().load(
    sourceUrl,
    () => resolveReady(texture),
    undefined,
    (error) => rejectReady(new Error(`Unable to load baked planet ${number} ${kind}: ${error?.message ?? error}`)),
  );
  texture.name = `planet-${number}-${kind}-runtime`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  texture.userData.ready = ready;
  texture.userData.losslessProceduralBake = true;
  return texture;
}

class ParticlePool {
  constructor(scene, count = 380, random = Math.random) {
    this.count = count;
    this.random = random;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.velocity = Array.from({ length: count }, () => new THREE.Vector3());
    this.life = new Float32Array(count);
    this.cursor = 0;
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', setAttrDynamic(new THREE.BufferAttribute(this.positions, 3)));
    this.geometry.setAttribute('color', setAttrDynamic(new THREE.BufferAttribute(this.colors, 3)));
    this.material = new THREE.PointsMaterial({
      size: 0.14,
      sizeAttenuation: true,
      vertexColors: true,
      map: makeSoftDiscTexture(48),
      alphaTest: 0.015,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    for (let i = 0; i < count; i += 1) this.positions[i * 3 + 1] = -10000;
  }

  spawn(position, colorHex, amount = 8, speed = 6, direction = new THREE.Vector3(0, 0.2, 1)) {
    const color = colorHex instanceof THREE.Color ? colorHex : new THREE.Color(colorHex);
    for (let n = 0; n < amount; n += 1) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.count;
      const offset = i * 3;
      this.positions[offset] = position.x + (this.random() - 0.5) * 1.3;
      this.positions[offset + 1] = position.y + (this.random() - 0.5) * 0.7;
      this.positions[offset + 2] = position.z + (this.random() - 0.5) * 1.4;
      this.colors[offset] = color.r;
      this.colors[offset + 1] = color.g;
      this.colors[offset + 2] = color.b;
      this.velocity[i].set(
        direction.x * speed + (this.random() - 0.5) * speed,
        direction.y * speed + (this.random() - 0.5) * speed * 0.55,
        direction.z * speed + this.random() * speed,
      );
      this.life[i] = 0.35 + this.random() * 0.65;
    }
  }

  update(dt) {
    if (!(dt > 0)) {
      // Zero-time QA checkpoint submissions publish already-authored particle
      // buffers; they must not repeatedly re-fade active colors.
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
      return;
    }
    for (let i = 0; i < this.count; i += 1) {
      const offset = i * 3;
      if (this.life[i] <= 0) {
        this.positions[offset + 1] = -10000;
        continue;
      }
      this.life[i] -= dt;
      this.positions[offset] += this.velocity[i].x * dt;
      this.positions[offset + 1] += this.velocity[i].y * dt;
      this.positions[offset + 2] += this.velocity[i].z * dt;
      this.velocity[i].multiplyScalar(Math.exp(-1.8 * dt));
      this.velocity[i].y -= dt * 2;
      const fade = clamp(this.life[i] * 2.2, 0, 1);
      this.colors[offset] *= fade;
      this.colors[offset + 1] *= fade;
      this.colors[offset + 2] *= fade;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  clear() {
    this.cursor = 0;
    this.life.fill(0);
    for (let i = 0; i < this.count; i += 1) {
      const offset = i * 3;
      this.positions[offset] = 0;
      this.positions[offset + 1] = -10000;
      this.positions[offset + 2] = 0;
      this.colors[offset] = 0;
      this.colors[offset + 1] = 0;
      this.colors[offset + 2] = 0;
      this.velocity[i].set(0, 0, 0);
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  diagnostics() {
    let active = 0;
    let lifeSum = 0;
    let positionSum = 0;
    let colorSum = 0;
    let velocitySum = 0;
    for (let index = 0; index < this.count; index += 1) {
      if (this.life[index] > 0) active += 1;
      lifeSum += this.life[index];
      const offset = index * 3;
      positionSum += this.positions[offset] + this.positions[offset + 1] + this.positions[offset + 2];
      colorSum += this.colors[offset] + this.colors[offset + 1] + this.colors[offset + 2];
      velocitySum += this.velocity[index].x + this.velocity[index].y + this.velocity[index].z;
    }
    return {
      count: this.count,
      active,
      cursor: this.cursor,
      lifeSum: Number(lifeSum.toFixed(6)),
      positionSum: Number(positionSum.toFixed(4)),
      colorSum: Number(colorSum.toFixed(6)),
      velocitySum: Number(velocitySum.toFixed(6)),
    };
  }
}

class TireTrailPool {
  constructor(parent, count = 240) {
    this.count = count;
    this.cursor = 0;
    this.timer = 0;
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    this.marks = Array.from({ length: count }, () => ({ x: 0, y: -10000, z: 0, yaw: 0, life: 0, heat: 0 }));
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.24, 0.018, 1.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false, toneMapped: true }),
      count,
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    this.mesh.frustumCulled = false;
    parent.add(this.mesh);
  }

  spawn(x, z, yaw, heat) {
    const mark = this.marks[this.cursor];
    this.cursor = (this.cursor + 1) % this.count;
    mark.x = x;
    mark.y = -0.285;
    mark.z = z;
    mark.yaw = yaw;
    mark.life = 1.65;
    mark.heat = heat;
  }

  update(state, segment, dt) {
    this.mesh.visible = segment.type === 'planet';
    if (!this.mesh.visible) return;
    this.timer -= dt;
    if (dt > 0 && state.drifting && this.timer <= 0) {
      this.timer = 0.022;
      const sideShift = Math.sin(state.yaw) * 1.45;
      this.spawn(state.lateral - 1.05 + sideShift, 1.48, state.yaw, state.driftCharge);
      this.spawn(state.lateral + 1.05 + sideShift, 1.48, state.yaw, state.driftCharge);
    }
    for (let i = 0; i < this.count; i += 1) {
      const mark = this.marks[i];
      if (mark.life > 0) {
        mark.life -= dt;
        mark.z += state.speed * dt * 0.76;
      }
      const alive = mark.life > 0 && mark.z < 42;
      if (!alive) {
        this.dummy.position.set(0, -10000, 0);
        this.dummy.scale.setScalar(0.001);
        this.color.setRGB(0, 0, 0);
      } else {
        const fade = smoothstep(0, 0.36, mark.life) * clamp((42 - mark.z) / 18, 0, 1);
        this.dummy.position.set(mark.x, mark.y, mark.z);
        this.dummy.rotation.set(0, -mark.yaw, 0);
        this.dummy.scale.set(1 + mark.heat * 0.22, 1, 1 + mark.heat * 0.55);
        this.color.setRGB((0.21 + mark.heat * 0.82) * fade, (0.22 + mark.heat * 0.14) * fade, (0.24 + mark.heat * 0.025) * fade);
      }
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.color);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }

  clear() {
    this.cursor = 0;
    this.timer = 0;
    this.dummy.position.set(0, -10000, 0);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.scale.setScalar(0.001);
    this.dummy.updateMatrix();
    this.color.setRGB(0, 0, 0);
    for (let i = 0; i < this.count; i += 1) {
      const mark = this.marks[i];
      mark.x = 0;
      mark.y = -10000;
      mark.z = 0;
      mark.yaw = 0;
      mark.life = 0;
      mark.heat = 0;
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.color);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }
}

export class RaceRenderer {
  constructor(canvas, {
    quality = 'high',
    reducedMotion = false,
    scoriaEnvironmentDataPromise = null,
    staticScoriaSurfacePackageRequest = null,
    forceProceduralStaticScoriaSurface = false,
  } = {}) {
    const startupStarted = performance.now();
    let startupLap = startupStarted;
    const startupStages = {};
    const recordStartupStage = (name) => {
      const now = performance.now();
      startupStages[name] = Number((now - startupLap).toFixed(3));
      startupLap = now;
    };
    this.canvas = canvas;
    // The ambient mode delegates to Math.random exactly as production did.
    // QA can opt into a resettable local stream without monkey-patching the
    // page global or letting unrelated browser work consume capture entropy.
    this.presentationRandom = new PresentationRandom();
    this.quality = ['low', 'medium', 'high'].includes(quality) ? quality : 'high';
    const runtimeParams = new URLSearchParams(window.location.search);
    this.useStaticScoriaSurface = this.quality === 'high'
      && !runtimeParams.has('rolling-p1-surface');
    this.staticScoriaParityEnabled = runtimeParams.has('static-surface-parity');
    this.forceProceduralStaticScoriaSurface = forceProceduralStaticScoriaSurface
      || runtimeParams.has('procedural-static-scoria');
    this.staticScoriaSurfacePackageRequest = this.useStaticScoriaSurface
      && !this.forceProceduralStaticScoriaSurface
      ? (staticScoriaSurfacePackageRequest ?? preloadBakedStaticScoriaSurfacePackage())
      : null;
    this.bakedStaticScoriaSurfacePackage = null;
    this.staticScoriaPackageTelemetry = {
      source: this.forceProceduralStaticScoriaSurface
        ? 'procedural-authoring'
        : (this.useStaticScoriaSurface ? 'pending' : 'not-required'),
      status: this.forceProceduralStaticScoriaSurface
        ? 'authoring-procedural'
        : (this.useStaticScoriaSurface ? 'pending' : 'not-required'),
      requestStatusAtTrack: null,
      startedAt: this.staticScoriaSurfacePackageRequest?.startedAt ?? null,
      trackCheckedAt: null,
      trackResolvedAt: null,
      headStartMs: null,
      responseMs: null,
      fetchMs: null,
      shaMs: null,
      decodeMs: null,
      readyMs: null,
      waitMs: 0,
      graceMs: STATIC_SCORIA_TRACK_GRACE_MS,
      hydrateMs: 0,
      assetBytes: null,
      residentBytes: null,
      payloadBytes: null,
      manifestBytes: null,
      sha256: null,
      fallbackReason: null,
    };
    // QA-only render-path ablations. These flags are intentionally inert for
    // every production/default URL and exist solely to distinguish periodic
    // driver stalls in the shadow and bloom passes from surface-geometry work.
    this.diagnosticNoShadows = runtimeParams.has('no-shadows');
    this.diagnosticNoBloom = runtimeParams.has('no-bloom');
    this.diagnosticShadowMapSize = runtimeParams.has('shadow-map-768') ? 768 : 1024;
    const diagnosticBloomScaleCandidates = [
      ['bloom-scale-080', 0.8],
      ['bloom-scale-060', 0.6],
      ['bloom-scale-050', 0.5],
    ].filter(([parameter]) => runtimeParams.has(parameter));
    if (diagnosticBloomScaleCandidates.length > 1) {
      throw new Error(
        `Bloom target scale diagnostics are mutually exclusive: ${diagnosticBloomScaleCandidates
          .map(([parameter]) => parameter)
          .join(', ')}`,
      );
    }
    this.diagnosticBloomScale = diagnosticBloomScaleCandidates[0]?.[1] ?? 1;
    this.reducedMotion = reducedMotion;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.quality !== 'low',
      alpha: false,
      powerPreference: 'high-performance',
      depth: true,
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Preserve incandescent accents without letting a raking key turn the pale
    // Scoria aggregate into a white slab.  The broad fill below carries the
    // shadow readability; exposure should not have to do that job.
    this.renderer.toneMappingExposure = 1.26;
    this.renderer.info.autoReset = false;
    this.lastRenderInfo = { calls: 0, triangles: 0, points: 0, lines: 0 };
    this.renderer.shadowMap.enabled = this.quality === 'high' && !this.diagnosticNoShadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    recordStartupStage('webgl');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.08, 6000);
    this.camera.position.set(0, 4.5, 11.5);
    this.camera.up.set(0, 1, 0);
    this.cameraDirector = this.makeCameraDirector();
    this.playerSurfaceFrame = {
      x: 0,
      y: 0.2,
      bank: 0,
      anchorX: 0,
      anchorY: 0.48,
      unitLateral: 0,
      roadVertical: 0.13,
      surface: 1,
    };
    // TouchdownArt draws Planet II's entry ribbon while the simulation is
    // still in Space I. Keep one immutable destination contact pair so the
    // craft attaches to the road it can actually touch, with no hot-path
    // sampling allocation and no opposite-bank snap at the mode boundary.
    this.stormglassEntrySurface = Object.freeze({
      current: Object.freeze(trackSample(PLANETS[1], 0)),
      ahead: Object.freeze(trackSample(PLANETS[1], 18)),
    });
    this.playerSurfaceSource = 'segment';
    this.playerVehiclePitch = 0;
    this.cameraX = 0;
    this.cameraY = 4.5;
    this.cameraLookX = 0;
    this.cameraRoll = 0;
    this.shake = 0;
    this.flash = 0;
    this.cameraCssValues = {
      speed: null,
      boost: null,
      flash: null,
      drift: null,
      sharpness: null,
      driftRipe: null,
      driftVoid: null,
    };
    this.segmentId = null;
    this.logicalProgress = 0;
    this.trackGeometryCache = {
      segmentId: null,
      logicalProgress: Number.NaN,
      time: Number.NaN,
      quality: null,
      current: null,
    };
    // The rolling diagnostic/fallback keeps the old exact first-frame response
    // vocabulary. High-quality production P1 selects one immutable full-course
    // package instead, so no opening response clones exist in that mode.
    this.openingTrackResponseCache = new Map();
    this.openingInitialTrackResponse = null;
    this.openingTrackResponseBuild = false;
    this.openingTrackResponseTelemetry = {
      status: this.useStaticScoriaSurface
        ? 'not-required-static-course'
        : (this.quality === 'high' ? 'pending' : 'not-required'),
      entries: 0,
      bytes: 0,
      buildMs: 0,
      workMs: 0,
      maxSliceMs: 0,
      hits: 0,
      misses: 0,
    };
    this.frameTimes = [];
    this.renderSubmissionTimes = [];
    this.lastDecorUpdateMs = 0;
    this.decorFrameStats = {
      segmentId: null,
      batches: 0,
      itemsVisited: 0,
      visibleItems: 0,
      hiddenItems: 0,
      trackSampleCalls: 0,
      retainedPoseUses: 0,
      matricesWritten: 0,
      batchesDirtied: 0,
      matrixFloatsUploaded: 0,
      visibilityEdges: 0,
      retainedDynamicVisibilityEdges: 0,
      submittedItems: 0,
      activeSlotSwaps: 0,
      stableRepacks: 0,
      instanceCountChanges: 0,
    };
    this.rivalFrameStats = {
      visibleMask: 0,
      newlyVisibleMask: 0,
      newlyHiddenMask: 0,
      visibleCount: 0,
    };
    // Retain a complete definitive first-loop capture, not merely its final
    // twelve seconds. The samples are scalar telemetry and are only sorted by
    // explicit QA/stat calls, so this stays cheap during live play.
    this.maxFrames = 2400;
    this.prewarmStatus = 'idle';
    this.prewarmPromise = null;
    this.prewarmReport = null;
    this.controlPrimeTelemetry = { status: 'pending' };
    // Opt-in, QA-only phase timing for diagnosing the cold-to-moving Scoria
    // transition. The production and canonical evidence URLs do not allocate
    // or sample here; `?track-profile=1` keeps the probe out of live cadence.
    const diagnosticParams = runtimeParams;
    this.trackProfileSamples = diagnosticParams.has('track-profile') ? [] : null;
    // Renderer-group profiling is independently opt-in. Keep both the timing
    // calls and retained evidence completely outside normal/live URLs; the
    // cadence harness enables this only for dedicated root-cause traces.
    this.rendererProfileEnabled = diagnosticParams.has('renderer-profile');
    this.lastRendererProfile = null;
    this.lastTrackProfileSample = null;
    this.trackProfileCallSerial = 0;
    this.activeSubmissionProfile = null;
    // Native Object3D callbacks provide a non-invasive ownership census for a
    // single submitted frame. This is deliberately diagnostic-slow and only
    // exists behind an explicit query; normal play allocates no maps, installs
    // no wrappers, and performs no traversal for it.
    this.drawOwnershipCensusEnabled = diagnosticParams.has('draw-ownership-census');
    this.drawOwnershipCensusHooks = this.drawOwnershipCensusEnabled ? new WeakMap() : null;
    this.drawOwnershipCensusContext = null;
    this.activeDrawOwnershipCensus = null;
    this.lastDrawOwnershipCensus = null;
    this.deferredTextureUploads = new WeakSet();
    this.deferredGeometryUploads = new WeakSet();
    this.deferredInstanceUploads = new WeakSet();
    this.deferredProgramWarmKeys = new Set();
    this.prewarmMaterialRetainers = [];
    // Keep the small detached descriptor/object vocabulary alive for the
    // session. Releasing eleven ~200-object snapshots and their compiler
    // clones one stage at a time made V8 collect them during later live
    // renderer updates, producing isolated 27-43 ms pauses even though the
    // measured GPU slice beside them was only 0-13 ms.
    this.prewarmObjectRetainers = [];
    this.prewarmDescriptorRetainers = [];
    this.prewarmZeroCountInstancePrimes = 0;
    this.liveFrameSerial = 0;
    this.liveFrameOrigin = null;
    this.liveFrameWaiters = [];
    this.prewarmLastSliceFrameSerial = null;
    this.prewarmGetLiveState = null;
    this.prewarmControlReadyAt = 0;
    this.prewarmInputQuietUntil = 0;
    this.prewarmLastControlSignature = '0:0:0';
    this.prewarmInputIsolation = {
      inputEvents: 0,
      firstInputAt: null,
      lastInputAt: null,
      fallbackStartedAt: null,
      deferredForInput: 0,
      deferredForPendingInput: 0,
      deferredForCadence: 0,
      sliceCount: 0,
      minFrameGap: null,
      maxSliceMs: 0,
      slicesAbove8Ms: 0,
      slicesAbove16_8Ms: 0,
      inputCollisions: 0,
      lastSlice: null,
    };
    this.tmpColor = new THREE.Color();
    this.dummy = new THREE.Object3D();
    this.worldRoot = new THREE.Group();
    this.scene.add(this.worldRoot);
    const textureSize = this.quality === 'high' ? 640 : this.quality === 'medium' ? 448 : 256;
    const scoriaEnvironmentRequest = this.quality === 'high'
      ? (scoriaEnvironmentDataPromise ?? preloadBakedScoriaEnvironmentData())
      : null;
    let startupYieldCount = 0;
    const startupYieldWaitMs = [];
    const yieldStartupFrame = async () => {
      // The first boundary must reach an actual rendering opportunity so the
      // ignition surface paints before expensive authored world construction.
      // Later boundaries only need separate tasks: waiting for eight complete
      // display intervals added ~0.4 s of cold wall time without reducing any
      // chunk's work. A user-blocking posted task preserves browser/input task
      // boundaries while keeping image decode from serializing ahead of the
      // control-critical scene graph; MessageChannel is the older fallback.
      if (startupYieldCount === 0) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      } else if (globalThis.scheduler?.postTask) {
        await globalThis.scheduler.postTask(() => undefined, { priority: 'user-blocking' });
      } else {
        await new Promise((resolve) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = () => {
            channel.port1.close();
            channel.port2.close();
            resolve();
          };
          channel.port2.postMessage(0);
        });
      }
      startupYieldWaitMs.push(Number((performance.now() - startupLap).toFixed(3)));
      startupYieldCount += 1;
      startupLap = performance.now();
    };
    // Construction used to perform every world build in the module-evaluation
    // task, freezing the ignition screen for multiple seconds. Everything
    // below is required before prewarm, not before the constructor returns.
    // Yielding at authored boundaries lets the browser paint and handle input
    // while preserving the exact same scene graph and prewarm contract.
    this.initializationPromise = (async () => {
      await yieldStartupFrame();
      this.planetOneArt = await createPlanetOneArt({
        renderer: this.renderer,
        road: { size: textureSize, repeat: [1.35, 8] },
        lava: { size: textureSize, repeat: [2.4, 2.4] },
        environment: {
          width: this.quality === 'high' ? 640 : 384,
          height: this.quality === 'high' ? 320 : 192,
          terrainResponseSize: textureSize,
          dataPromise: scoriaEnvironmentRequest,
        },
      });
      recordStartupStage('scoriaTextures');
      this.scene.environment = this.planetOneArt.environment.environmentTexture;
      this.scene.environmentIntensity = 0.82;
      await yieldStartupFrame();
      this.createLighting();
      this.createSky();
      recordStartupStage('lightingAndSky');
      await yieldStartupFrame();
      await this.createPlanets();
      startupStages.planetVistas = this.planetVistaBuildMs;
      startupLap = performance.now();
      await yieldStartupFrame();
      await this.resolveStaticScoriaPackageAtTrackBoundary();
      // The package grace is an explicit network/digest wait recorded in its
      // own telemetry, not renderer main-thread construction work.
      startupLap = performance.now();
      this.createTrack();
      this.createSpeedLines();
      this.createAtmosphereFlow();
      recordStartupStage('trackAndFlow');
      await yieldStartupFrame();
      this.playerVehicle = createPremiumVehicle(0x62f6ff, 0xbccbd5, { player: true });
      this.playerVehicle.position.set(0, 0.2, 0);
      this.worldRoot.add(this.playerVehicle);
      this.createTransitionFX();
      recordStartupStage('playerAndTransition');
      await yieldStartupFrame();
      this.arrivalArt = createArrivalArt({
        scene: this.scene,
        root: this.worldRoot,
        player: this.playerVehicle,
        quality: this.quality,
        seed: 0x9f0d21,
      });
      this.touchdownArt = createTouchdownArt({
        scene: this.scene,
        root: this.worldRoot,
        segment: PLANETS[1],
        sampleTrack: trackSample,
        quality: this.quality,
        seed: 0x4a2719d3,
      });
      recordStartupStage('arrivalAndTouchdown');
      await yieldStartupFrame();
      const rivalColors = [[0xff356e, 0x3d0615], [0xffd451, 0x382600], [0x7d73ff, 0x100a46]];
      this.rivalVehicles = rivalColors.map(([accent, secondary], i) => {
        const vehicle = createPremiumVehicle(accent, secondary, { personality: i });
        vehicle.userData.presentationBaseScale = vehicle.scale.x;
        this.worldRoot.add(vehicle);
        return vehicle;
      });
      this.combatFX = new CombatFX({ scene: this.scene, root: this.worldRoot, player: this.playerVehicle });
      this.particles = new ParticlePool(
        this.scene,
        this.quality === 'high' ? 460 : this.quality === 'medium' ? 300 : 190,
        () => this.presentationRandom.next(),
      );
      this.tireTrails = new TireTrailPool(this.worldRoot, this.quality === 'high' ? 280 : 180);
      recordStartupStage('rivalsAndEffects');
      await yieldStartupFrame();
      this.createPostFX();
      this.resize();
      recordStartupStage('postFxAndResize');
      this.startupTimings = {
        totalMs: Number((performance.now() - startupStarted).toFixed(3)),
        mainThreadWorkMs: Number(Object.values(startupStages).reduce((sum, value) => sum + value, 0).toFixed(3)),
        stages: startupStages,
        yieldWaitMs: startupYieldWaitMs,
        scoria: this.planetOneArt.startupTimings,
      };
      return this.startupTimings;
    })();
  }

  async resolveStaticScoriaPackageAtTrackBoundary() {
    const telemetry = this.staticScoriaPackageTelemetry;
    const checkedAt = performance.now();
    telemetry.trackCheckedAt = checkedAt;
    if (!this.useStaticScoriaSurface) {
      telemetry.source = 'not-required';
      telemetry.status = 'not-required';
      return null;
    }
    if (this.forceProceduralStaticScoriaSurface) {
      telemetry.source = 'procedural-authoring';
      telemetry.status = 'authoring-procedural';
      telemetry.requestStatusAtTrack = 'not-requested';
      return null;
    }
    const request = this.staticScoriaSurfacePackageRequest;
    telemetry.startedAt = request?.startedAt ?? null;
    telemetry.headStartMs = Number.isFinite(request?.startedAt)
      ? Number((checkedAt - request.startedAt).toFixed(3))
      : null;
    if (request?.status === 'pending') {
      const waitStartedAt = performance.now();
      let timeoutId = null;
      const timeout = new Promise((resolve) => {
        timeoutId = setTimeout(resolve, STATIC_SCORIA_TRACK_GRACE_MS);
      });
      const settlement = request.promise && typeof request.promise.then === 'function'
        ? request.promise
        : new Promise(() => undefined);
      await Promise.race([settlement, timeout]);
      if (timeoutId !== null) clearTimeout(timeoutId);
      telemetry.waitMs = Number((performance.now() - waitStartedAt).toFixed(3));
    }
    telemetry.trackResolvedAt = performance.now();
    telemetry.requestStatusAtTrack = request?.status ?? 'not-requested';
    telemetry.responseMs = Number.isFinite(request?.responseMs)
      ? Number(request.responseMs.toFixed(3))
      : null;
    telemetry.fetchMs = Number.isFinite(request?.fetchMs)
      ? Number(request.fetchMs.toFixed(3))
      : null;
    telemetry.shaMs = Number.isFinite(request?.shaMs)
      ? Number(request.shaMs.toFixed(3))
      : null;
    telemetry.decodeMs = Number.isFinite(request?.decodeMs)
      ? Number(request.decodeMs.toFixed(3))
      : null;
    telemetry.readyMs = Number.isFinite(request?.readyMs)
      ? Number(request.readyMs.toFixed(3))
      : null;
    if (request?.status === 'fulfilled' && request.value) {
      this.bakedStaticScoriaSurfacePackage = request.value;
      telemetry.source = 'baked';
      telemetry.status = 'ready-at-track';
      telemetry.assetBytes = request.value.bytes;
      telemetry.residentBytes = request.value.manifest.residentBytes;
      telemetry.payloadBytes = request.value.payloadBytes;
      telemetry.manifestBytes = request.value.manifestBytes;
      telemetry.sha256 = request.value.sha256;
      return request.value;
    }
    telemetry.source = 'procedural-fallback';
    if (request?.status === 'pending') {
      telemetry.status = 'pending-at-track';
      telemetry.fallbackReason = `Baked static Scoria package was still pending after the ${STATIC_SCORIA_TRACK_GRACE_MS}ms track-boundary grace.`;
      request.abandon(telemetry.fallbackReason);
      telemetry.readyMs = Number.isFinite(request.readyMs)
        ? Number(request.readyMs.toFixed(3))
        : null;
    } else if (request?.status === 'rejected') {
      telemetry.status = 'rejected-at-track';
      telemetry.fallbackReason = request.error?.message ?? String(request.error ?? 'Baked static Scoria package rejected.');
    } else {
      telemetry.status = 'unavailable-at-track';
      telemetry.fallbackReason = 'No baked static Scoria package readiness record was available.';
    }
    return null;
  }

  makeCameraDirector() {
    return new CameraDirector(this.camera, {
      reducedMotion: this.reducedMotion,
      vehicleFramingHeight: 1.85,
      maximumFov: 78,
      minimumDistance: 12.8,
      maximumDistance: 24,
    });
  }

  resetCameraDirector() {
    this.camera.position.set(0, 4.5, 11.5);
    this.camera.quaternion.identity();
    this.camera.up.set(0, 1, 0);
    this.camera.fov = 68;
    this.camera.updateProjectionMatrix();
    this.cameraDirector = this.makeCameraDirector();
  }

  setDeterministicPresentationMode(enabled, seed = 0x4e494e45) {
    return this.presentationRandom.setDeterministic(Boolean(enabled), seed);
  }

  resetIntegratedFlowPresentation() {
    if (this.speedLineData) {
      for (const line of this.speedLineData) {
        line.x = line.initialX;
        line.y = line.initialY;
        line.z = line.initialZ;
        line.wraps = 0;
      }
    }
    if (this.roadFlowData) {
      for (const mark of this.roadFlowData) {
        mark.lateral = mark.initialLateral;
        mark.z = mark.initialZ;
        mark.wraps = 0;
      }
    }
    if (this.ashData) {
      for (let index = 0; index < this.ashData.length; index += 1) {
        const mote = this.ashData[index];
        mote.z = mote.initialZ;
        const offset = index * 3;
        this.ashPositions[offset] = mote.x;
        this.ashPositions[offset + 1] = mote.y;
        this.ashPositions[offset + 2] = mote.z;
      }
      this.ash.geometry.attributes.position.needsUpdate = true;
    }
    if (this.reentryCloudData) {
      for (let index = 0; index < this.reentryCloudData.length; index += 1) {
        const cloud = this.reentryCloudData[index];
        cloud.z = cloud.initialZ;
        const offset = index * 3;
        this.reentryCloudPositions[offset] = cloud.x;
        this.reentryCloudPositions[offset + 1] = cloud.y;
        this.reentryCloudPositions[offset + 2] = cloud.z;
        this.reentryCloudColors[offset] = 0;
        this.reentryCloudColors[offset + 1] = 0;
        this.reentryCloudColors[offset + 2] = 0;
      }
      this.reentryClouds.visible = false;
      this.reentryClouds.material.opacity = 0;
      this.reentryClouds.geometry.attributes.position.needsUpdate = true;
      this.reentryClouds.geometry.attributes.color.needsUpdate = true;
    }
  }

  resetRacePresentation() {
    this.resetCameraDirector();
    this.shake = 0;
    this.flash = 0;
    this.cameraX = 0;
    this.cameraY = 4.5;
    this.cameraLookX = 0;
    this.cameraRoll = 0;
    if (this.planetMeshes) {
      for (const planet of this.planetMeshes) {
        planet.rotation.set(0, 0, 0);
        planet.userData.cloud.rotation.set(0, 0, 0);
      }
    }
    this.horizon?.rotation.set(0, 0, 0);
    this.stars?.rotation.set(0, 0, 0);
    this.resetIntegratedFlowPresentation();
    this.arrivalArt?.resetPresentation();
    this.touchdownArt?.resetPresentation();
    if (this.playerVehicle) resetPremiumVehiclePresentation(this.playerVehicle);
    for (const vehicle of this.rivalVehicles ?? []) resetPremiumVehiclePresentation(vehicle);
    this.particles?.clear();
    this.tireTrails?.clear();
    this.combatFX?.resetDiagnostics();
    if (this.presentationRandom.mode === 'deterministic') this.presentationRandom.reset();
  }

  makePrewarmState(segment, fraction, { seed, short, lift = 0, boost = 0.62 } = {}) {
    const state = createRaceState({
      seed,
      short,
      startSegmentId: segment.id,
      started: false,
    });
    const progress = segmentLength(segment, short) * clamp(fraction, 0, 0.9995);
    state.segmentProgress = progress;
    state.globalProgress += progress;
    state.speed = Math.max(segment.baseSpeed, segment.type === 'space' ? segment.baseSpeed + 92 : segment.baseSpeed + 36);
    state.boost = boost;
    state.lift = lift;
    state.time = 2.4 + segment.index * 0.73 + fraction * 3.1;
    for (const rival of state.rivals) rival.globalProgress += progress;
    return state;
  }

  captureOpeningTrackResponse(logicalProgress) {
    const samples = new Float64Array(this.trackRows * TRACK_RESPONSE_SAMPLE_FIELDS.length);
    for (let row = 0; row < this.trackRows; row += 1) {
      const source = this.trackSamples[row];
      const offset = row * TRACK_RESPONSE_SAMPLE_FIELDS.length;
      for (let field = 0; field < TRACK_RESPONSE_SAMPLE_FIELDS.length; field += 1) {
        samples[offset + field] = source[TRACK_RESPONSE_SAMPLE_FIELDS[field]];
      }
    }
    const roadGeometry = this.roadWorkGeometry.clone();
    const terrainGeometry = this.terrainWorkGeometry.clone();
    // Indices never change. Share the immutable topology with the work bank;
    // only fully rewritten attributes need their own preuploaded storage.
    roadGeometry.setIndex(this.roadWorkGeometry.index);
    terrainGeometry.setIndex(this.terrainWorkGeometry.index);
    const response = {
      logicalProgress,
      samples,
      roadGeometry,
      terrainGeometry,
    };
    response.bytes = samples.byteLength;
    for (const geometry of [roadGeometry, terrainGeometry]) {
      for (const attribute of Object.values(geometry.attributes)) {
        response.bytes += attribute.array.byteLength;
      }
    }
    return response;
  }

  applyOpeningTrackResponse(response) {
    // Cached opening responses are immutable display banks. Keep the CPU
    // procedural owners pinned to the mutable work ring: switching these
    // fields to a response clone and back made the first live miss enter the
    // 8,232-vertex row loop through a different BufferGeometry object shape.
    // The mesh still selects the exact preuploaded response for this frame;
    // only the hot-path ownership invariant changes.
    this.road.geometry = response.roadGeometry;
    this.terrain.geometry = response.terrainGeometry;
    for (let row = 0; row < this.trackRows; row += 1) {
      const target = this.trackSamples[row];
      const offset = row * TRACK_RESPONSE_SAMPLE_FIELDS.length;
      for (let field = 0; field < TRACK_RESPONSE_SAMPLE_FIELDS.length; field += 1) {
        target[TRACK_RESPONSE_SAMPLE_FIELDS[field]] = response.samples[offset + field];
      }
    }
  }

  async prepareOpeningTrackResponses({ seed, short } = {}) {
    const telemetry = this.openingTrackResponseTelemetry;
    if (this.staticScoriaSurface?.enabled) {
      this.openingTrackResponseCache.clear();
      this.openingInitialTrackResponse = null;
      Object.assign(telemetry, {
        status: 'not-required-static-course',
        entries: 0,
        bytes: 0,
        buildMs: 0,
        workMs: 0,
        maxSliceMs: 0,
        hits: 0,
        misses: 0,
      });
      return telemetry;
    }
    if (this.quality !== 'high' || short) {
      telemetry.status = 'not-required';
      return telemetry;
    }
    const started = performance.now();
    let workMs = 0;
    let maxSliceMs = 0;
    this.openingTrackResponseCache.clear();
    this.openingTrackResponseBuild = true;
    // Main aligns ignition to exactly one fixed step. On that first step P1
    // progress is affected only by surge; drift adds its fixed boost after the
    // speed/progress calculation. These are therefore the complete exact
    // boost-off/on response vocabulary, not approximate input classes.
    const inputs = [
      { steer: 0, surge: false, slip: false },
      { steer: 0, surge: true, slip: false },
    ];
    try {
      for (const input of inputs) {
        const state = createRaceState({
          seed,
          short: false,
          startSegmentId: COURSE[0].id,
          started: true,
        });
        stepRace(state, input, FIXED_STEP);
        const logicalProgress = state.segmentProgress;
        const sliceStarted = performance.now();
        this.updateTrack(state, COURSE[0]);
        const response = this.captureOpeningTrackResponse(logicalProgress);
        this.openingTrackResponseCache.set(logicalProgress, response);
        const sliceMs = performance.now() - sliceStarted;
        workMs += sliceMs;
        maxSliceMs = Math.max(maxSliceMs, sliceMs);
        // Keep each deterministic response in its own pre-control task. Links
        // are already complete at the call site, so no driver compile can
        // stretch this bounded CPU slice.
        await this.waitWarmTask();
      }
    } finally {
      this.openingTrackResponseBuild = false;
    }
    const bytes = [...this.openingTrackResponseCache.values()]
      .reduce((sum, response) => sum + response.bytes, 0);
    Object.assign(telemetry, {
      status: 'complete',
      entries: this.openingTrackResponseCache.size,
      bytes,
      buildMs: Number((performance.now() - started).toFixed(3)),
      workMs: Number(workMs.toFixed(3)),
      maxSliceMs: Number(maxSliceMs.toFixed(3)),
      progressMin: Number(Math.min(...this.openingTrackResponseCache.keys()).toFixed(6)),
      progressMax: Number(Math.max(...this.openingTrackResponseCache.keys()).toFixed(6)),
    });
    return telemetry;
  }

  async uploadStaticScoriaSurfaceBeforeControl() {
    const surface = this.staticScoriaSurface;
    if (!surface?.enabled) {
      return { status: 'not-required', totalMs: 0, maxSliceMs: 0, bytes: 0, programDelta: 0 };
    }
    if (surface.upload.status === 'complete') return { ...surface.upload };

    const startedAt = performance.now();
    const programsBefore = this.renderer.info.programs.length;
    const previousTarget = this.renderer.getRenderTarget();
    const previousScissorTest = this.renderer.getScissorTest();
    const previousScissor = this.renderer.getScissor(new THREE.Vector4());
    const previousViewport = this.renderer.getViewport(new THREE.Vector4());
    const previousShadowAutoUpdate = this.renderer.shadowMap.autoUpdate;
    const previousShadowNeedsUpdate = this.renderer.shadowMap.needsUpdate;
    const target = this.composer?.readBuffer ?? previousTarget;
    const allSurfaceObjects = [
      this.road,
      this.terrain,
      ...this.lavaRibbons,
      ...this.laneLines,
      ...this.edgeLines,
    ];
    const families = [
      { name: 'road', objects: [this.road], geometries: [surface.roadGeometry] },
      { name: 'terrain', objects: [this.terrain], geometries: [surface.terrainGeometry] },
      { name: 'lava-left', objects: [this.lavaRibbons[0]], geometries: [surface.lavaGeometries[0]] },
      { name: 'lava-right', objects: [this.lavaRibbons[1]], geometries: [surface.lavaGeometries[1]] },
      {
        name: 'line-family',
        objects: [...this.laneLines, ...this.edgeLines],
        geometries: surface.lineGeometries,
      },
    ];
    const visibleState = new Map();
    const hiddenRenderables = [];
    this.scene.traverse((object) => {
      if (!(object.isMesh || object.isPoints || object.isLine || object.isSprite)) return;
      visibleState.set(object, object.visible);
      if (allSurfaceObjects.includes(object)) return;
      if (object.visible) hiddenRenderables.push(object);
      object.visible = false;
    });
    const samples = [];
    let maxSliceMs = 0;
    try {
      surface.uploadPhase = 'static-pre-control';
      this.activateStaticScoriaSurface();
      this.renderer.setRenderTarget(target);
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = false;
      this.renderer.setScissorTest(true);
      this.renderer.setScissor(0, 0, 1, 1);
      for (const family of families) {
        await this.waitWarmTask();
        const selected = new Set(family.objects);
        for (const object of allSurfaceObjects) object.visible = selected.has(object);
        const sliceStartedAt = performance.now();
        this.renderer.render(this.scene, this.camera);
        const sliceMs = performance.now() - sliceStartedAt;
        maxSliceMs = Math.max(maxSliceMs, sliceMs);
        for (const geometry of family.geometries) this.deferredGeometryUploads.add(geometry);
        samples.push({
          name: family.name,
          geometries: family.geometries.length,
          bytes: family.geometries.reduce(
            (sum, geometry) => sum + geometryResidentBytes(geometry),
            0,
          ),
          ms: Number(sliceMs.toFixed(3)),
        });
      }
    } finally {
      surface.uploadPhase = 'awaiting-control';
      for (const [object, visible] of visibleState) object.visible = visible;
      for (const object of hiddenRenderables) object.visible = true;
      this.renderer.setRenderTarget(previousTarget);
      this.renderer.shadowMap.autoUpdate = previousShadowAutoUpdate;
      this.renderer.shadowMap.needsUpdate = previousShadowNeedsUpdate;
      this.renderer.setViewport(previousViewport);
      this.renderer.setScissor(previousScissor);
      this.renderer.setScissorTest(previousScissorTest);
    }
    const programDelta = this.renderer.info.programs.length - programsBefore;
    if (programDelta !== 0) {
      throw new Error(`Static Scoria residency discovered ${programDelta} program(s).`);
    }
    const uploadedKeys = new Set(surface.uploadEvents.map((event) => event.key));
    const missingUploadKeys = surface.expectedUploadKeys.filter((key) => !uploadedKeys.has(key));
    if (missingUploadKeys.length > 0) {
      throw new Error(
        `Static Scoria residency missed ${missingUploadKeys.length} WebGL buffer upload(s): ${missingUploadKeys.join(', ')}`,
      );
    }
    surface.upload = {
      status: 'complete',
      totalMs: Number((performance.now() - startedAt).toFixed(3)),
      maxSliceMs: Number(maxSliceMs.toFixed(3)),
      bytes: surface.bytes,
      geometries: surface.geometries.length,
      programDelta,
      expectedUploads: surface.expectedUploadKeys.length,
      actualUploads: surface.uploadEvents.length,
      actualUploadBytes: surface.uploadEvents.reduce((sum, event) => sum + event.bytes, 0),
      samples,
    };
    return { ...surface.upload };
  }

  async uploadFutureDynamicTrackBanksBeforeControl({ initialState, seed, short } = {}) {
    if (!initialState) throw new TypeError('Future dynamic-bank upload requires the opening state.');
    const startedAt = performance.now();
    const programsBefore = this.renderer.info.programs.length;
    const previousTarget = this.renderer.getRenderTarget();
    const previousScissorTest = this.renderer.getScissorTest();
    const previousScissor = this.renderer.getScissor(new THREE.Vector4());
    const previousViewport = this.renderer.getViewport(new THREE.Vector4());
    const previousShadowAutoUpdate = this.renderer.shadowMap.autoUpdate;
    const previousShadowNeedsUpdate = this.renderer.shadowMap.needsUpdate;
    const target = this.composer?.readBuffer ?? previousTarget;
    const futureState = this.makePrewarmState(COURSE[2], 0.2, { seed, short, boost: 0.34 });
    const retainedVisibility = new Map();
    this.scene.traverse((object) => {
      if (object.isMesh || object.isPoints || object.isLine || object.isSprite) {
        retainedVisibility.set(object, object.visible);
      }
    });
    const keepVisible = new Set([this.road, this.terrain, ...this.laneLines, ...this.edgeLines]);
    const samples = [];
    let maxSliceMs = 0;
    try {
      this.renderer.setRenderTarget(target);
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = false;
      this.renderer.setScissorTest(true);
      this.renderer.setScissor(0, 0, 1, 1);
      for (let pass = 0; pass < this.roadWorkGeometries.length; pass += 1) {
        await this.waitWarmTask();
        futureState.time += 0.001;
        this.trackGeometryCache.segmentId = null;
        const sliceStartedAt = performance.now();
        this.update(futureState, [], 0);
        this.scene.traverse((object) => {
          if (!(object.isMesh || object.isPoints || object.isLine || object.isSprite)) return;
          object.visible = keepVisible.has(object) && object.visible;
        });
        this.renderer.render(this.scene, this.camera);
        const sliceMs = performance.now() - sliceStartedAt;
        maxSliceMs = Math.max(maxSliceMs, sliceMs);
        const geometries = [
          this.roadWorkGeometry,
          this.terrainWorkGeometry,
          ...this.lineWorkGeometries,
        ];
        for (const geometry of geometries) this.deferredGeometryUploads.add(geometry);
        samples.push({
          pass,
          workGeometryIndex: this.trackWorkGeometryIndex,
          geometries: geometries.length,
          ms: Number(sliceMs.toFixed(3)),
        });
        for (const [object, visible] of retainedVisibility) object.visible = visible;
      }
    } finally {
      for (const [object, visible] of retainedVisibility) object.visible = visible;
      this.renderer.setRenderTarget(previousTarget);
      this.renderer.shadowMap.autoUpdate = previousShadowAutoUpdate;
      this.renderer.shadowMap.needsUpdate = previousShadowNeedsUpdate;
      this.renderer.setViewport(previousViewport);
      this.renderer.setScissor(previousScissor);
      this.renderer.setScissorTest(previousScissorTest);
      this.resetCameraDirector();
      this.trackGeometryCache.segmentId = null;
      this.update(initialState, [], 0);
    }
    const programDelta = this.renderer.info.programs.length - programsBefore;
    if (programDelta !== 0) {
      throw new Error(`Future dynamic-bank upload discovered ${programDelta} program(s).`);
    }
    return {
      status: 'complete',
      mode: 'future-dynamic-fallback',
      totalMs: Number((performance.now() - startedAt).toFixed(3)),
      maxSliceMs: Number(maxSliceMs.toFixed(3)),
      programDelta,
      banks: new Set(samples.map((sample) => sample.workGeometryIndex)).size,
      samples,
    };
  }

  async uploadOpeningTrackResponsesBeforeControl(options = {}) {
    if (this.staticScoriaSurface?.enabled) {
      return this.uploadFutureDynamicTrackBanksBeforeControl(options);
    }
    if (this.openingTrackResponseCache.size === 0) {
      return { status: 'not-required', totalMs: 0, maxSliceMs: 0, programDelta: 0 };
    }
    const started = performance.now();
    let maxSliceMs = 0;
    const samples = [];
    const programsBefore = this.renderer.info.programs.length;
    const previousTarget = this.renderer.getRenderTarget();
    // Use the literal live high-quality scene target. A fresh tiny target has
    // a different output/tone-mapping key and would compile two QA-only
    // variants that the player's composer never consumes.
    const target = this.composer?.readBuffer ?? previousTarget;
    const pairs = [
      ...this.roadWorkGeometries.map((roadGeometry, index) => ({
        kind: 'work',
        index,
        roadGeometry,
        terrainGeometry: this.terrainWorkGeometries[index],
      })).filter((pair) => (
        this.openingInitialTrackResponse || pair.index !== this.trackWorkGeometryIndex
      )),
      ...[...this.openingTrackResponseCache.values()].map((response, index) => ({
        kind: 'opening-response',
        index,
        response,
        roadGeometry: response.roadGeometry,
        terrainGeometry: response.terrainGeometry,
      })),
    ];
    const hiddenRenderables = [];
    const previousScissorTest = this.renderer.getScissorTest();
    const previousScissor = this.renderer.getScissor(new THREE.Vector4());
    const previousViewport = this.renderer.getViewport(new THREE.Vector4());
    const previousShadowAutoUpdate = this.renderer.shadowMap.autoUpdate;
    const previousShadowNeedsUpdate = this.renderer.shadowMap.needsUpdate;
    // Geometry residency needs the literal live material/light/fog/output key,
    // not 250 unrelated opening draws. Keep the live scene configuration but
    // temporarily suppress every renderable except the selected road/terrain
    // pair. A one-pixel scissor still submits every vertex/buffer while avoiding
    // full-frame fragment work on this discarded composer target.
    this.scene.traverse((object) => {
      if (!(object.isMesh || object.isPoints || object.isLine || object.isSprite)) return;
      if (object === this.road || object === this.terrain || !object.visible) return;
      hiddenRenderables.push(object);
      object.visible = false;
    });
    try {
      this.renderer.setRenderTarget(target);
      // The exact shadow-enabled program/uniform configuration is already
      // resident from the authored opening. Do not clear and rebuild an empty
      // shadow atlas for geometry-only residency draws; Three's shadow pass
      // also disables scissor internally, defeating the bounded 1px target.
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = false;
      this.renderer.setScissorTest(true);
      this.renderer.setScissor(0, 0, 1, 1);
      for (const pair of pairs) {
        await this.waitWarmTask();
        const sliceStarted = performance.now();
        this.roadGeometry = pair.roadGeometry;
        this.terrainGeometry = pair.terrainGeometry;
        this.road.geometry = pair.roadGeometry;
        this.terrain.geometry = pair.terrainGeometry;
        this.renderer.render(this.scene, this.camera);
        if (pair.response) pair.response.preuploaded = true;
        const sliceMs = performance.now() - sliceStarted;
        maxSliceMs = Math.max(maxSliceMs, sliceMs);
        samples.push({
          kind: pair.kind,
          index: pair.index,
          ms: Number(sliceMs.toFixed(3)),
        });
      }
    } finally {
      for (const object of hiddenRenderables) object.visible = true;
      this.roadGeometry = this.roadWorkGeometry;
      this.terrainGeometry = this.terrainWorkGeometry;
      this.road.geometry = this.roadWorkGeometry;
      this.terrain.geometry = this.terrainWorkGeometry;
      this.renderer.setRenderTarget(previousTarget);
      this.renderer.shadowMap.autoUpdate = previousShadowAutoUpdate;
      this.renderer.shadowMap.needsUpdate = previousShadowNeedsUpdate;
      this.renderer.setViewport(previousViewport);
      this.renderer.setScissor(previousScissor);
      this.renderer.setScissorTest(previousScissorTest);
    }
    const programDelta = this.renderer.info.programs.length - programsBefore;
    // The resident alternate road + terrain objects intentionally contribute
    // one exact object-program binding each on this literal render target.
    // They are completed while IGNITE is disabled and must never grow beyond
    // that bounded pair.
    if (programDelta > 2) {
      throw new Error(`Opening response upload discovered ${programDelta} programs; expected at most 2.`);
    }
    return {
      status: 'complete',
      totalMs: Number((performance.now() - started).toFixed(3)),
      maxSliceMs: Number(maxSliceMs.toFixed(3)),
      programDelta,
      geometries: pairs.length * 2,
      samples,
    };
  }

  retireOpeningTrackWorkGeometryBeforeControl() {
    if (this.prewarmStatus !== 'control-ready' && this.prewarmStatus !== 'complete') {
      throw new Error('Opening track work geometry cannot retire before graphics calibration is ready.');
    }
    if (this.staticScoriaSurface?.enabled) {
      Object.assign(this.controlPrimeTelemetry, {
        bufferRetireMs: 0,
        bufferRetireProgramDelta: 0,
        bufferRetireStatus: 'not-required-static-course',
      });
      return {
        status: 'not-required-static-course',
        totalMs: 0,
        programDelta: 0,
        workGeometryIndex: this.trackWorkGeometryIndex,
      };
    }
    const started = performance.now();
    const programsBefore = this.renderer.info.programs.length;
    const previousTarget = this.renderer.getRenderTarget();
    const previousScissorTest = this.renderer.getScissorTest();
    const previousScissor = this.renderer.getScissor(new THREE.Vector4());
    const previousViewport = this.renderer.getViewport(new THREE.Vector4());
    const previousShadowAutoUpdate = this.renderer.shadowMap.autoUpdate;
    const previousShadowNeedsUpdate = this.renderer.shadowMap.needsUpdate;
    const previousRoadGeometry = this.road.geometry;
    const previousTerrainGeometry = this.terrain.geometry;
    const target = this.composer?.readBuffer ?? previousTarget;
    try {
      // The exact CPU prime leaves the final mutable work bank dirty, then
      // restores the visible opening from its immutable resident bank. Attach
      // that final work pair to this discarded target once so its pending
      // bufferSubData retirement cannot leak into live control.
      this.renderer.setRenderTarget(target);
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = false;
      this.renderer.setScissorTest(true);
      this.renderer.setScissor(0, 0, 1, 1);
      this.road.geometry = this.roadWorkGeometry;
      this.terrain.geometry = this.terrainWorkGeometry;
      this.renderer.render(this.scene, this.camera);
    } finally {
      this.road.geometry = previousRoadGeometry;
      this.terrain.geometry = previousTerrainGeometry;
      this.renderer.setRenderTarget(previousTarget);
      this.renderer.shadowMap.autoUpdate = previousShadowAutoUpdate;
      this.renderer.shadowMap.needsUpdate = previousShadowNeedsUpdate;
      this.renderer.setViewport(previousViewport);
      this.renderer.setScissor(previousScissor);
      this.renderer.setScissorTest(previousScissorTest);
    }
    const programDelta = this.renderer.info.programs.length - programsBefore;
    if (programDelta !== 0) {
      throw new Error(`Final opening dynamic-buffer retirement discovered ${programDelta} program(s).`);
    }
    const totalMs = performance.now() - started;
    Object.assign(this.controlPrimeTelemetry, {
      bufferRetireMs: Number(totalMs.toFixed(3)),
      bufferRetireProgramDelta: programDelta,
      totalMs: Number(((this.controlPrimeTelemetry.totalMs ?? 0) + totalMs).toFixed(3)),
    });
    return {
      status: 'complete',
      totalMs: Number(totalMs.toFixed(3)),
      programDelta,
      workGeometryIndex: this.trackWorkGeometryIndex,
    };
  }

  primeOpeningControlPath({ initialState, seed = initialState?.seed, short = initialState?.short } = {}) {
    if (!initialState) throw new TypeError('primeOpeningControlPath requires the untouched opening state.');
    if (this.prewarmStatus !== 'control-ready' && this.prewarmStatus !== 'complete') {
      throw new Error('Opening control path cannot be primed before graphics calibration is ready.');
    }
    const started = performance.now();
    const activeState = createRaceState({
      seed,
      short,
      startSegmentId: COURSE[0].id,
      started: true,
    });
    const activeInput = { steer: 0.22, surge: true, slip: false };
    for (let step = 0; step < 14; step += 1) stepRace(activeState, activeInput, FIXED_STEP);
    if (this.staticScoriaSurface?.enabled) {
      const activeStartedAt = performance.now();
      this.trackGeometryCache.segmentId = null;
      this.update(activeState, [], 0);
      const activeMs = performance.now() - activeStartedAt;
      const restoreStartedAt = performance.now();
      this.resetCameraDirector();
      this.shake = 0;
      this.flash = 0;
      this.combatFX.resetDiagnostics();
      this.trackGeometryCache.segmentId = null;
      this.update(initialState, [], 0);
      const restoreMs = performance.now() - restoreStartedAt;
      this.controlPrimeStateRetainer = activeState;
      this.staticScoriaSurface.controlVersions = this.captureStaticScoriaVersions();
      this.staticScoriaSurface.controlUploadEventCount = this.staticScoriaSurface.uploadEvents.length;
      this.staticScoriaSurface.uploadPhase = 'control-ready';
      Object.assign(this.controlPrimeTelemetry, {
        status: 'complete',
        steps: 14,
        fraction: Number(getSegmentFraction(activeState).toFixed(6)),
        passes: [Number(activeMs.toFixed(3))],
        restorePasses: [Number(restoreMs.toFixed(3))],
        trackCacheMisses: [true],
        updateMs: Number(activeMs.toFixed(3)),
        restoreMs: Number(restoreMs.toFixed(3)),
        renderMs: 0,
        totalMs: Number((performance.now() - started).toFixed(3)),
        target: 'static-p1-transform-only',
      });
      return { ...this.controlPrimeTelemetry };
    }
    const activeLogicalProgress = activeState.segmentProgress / (activeState.short ? 0.075 : 1);
    const trackPrimeWouldMiss = () => !(
      this.trackGeometryCache.segmentId === COURSE[0].id
      && this.trackGeometryCache.logicalProgress === activeLogicalProgress
      && this.trackGeometryCache.time === activeState.time
      && this.trackGeometryCache.quality === this.quality
    );
    // This CPU-only pose runs after every boot/UI/QA allocation but never
    // touches the visible framebuffer. dt=0 keeps renderer-owned flow state
    // byte-fresh while exercising the literal first-moving terrain path. Cycle
    // the exact response->miss seam once per mutable bank so every backing
    // store enters the hot typed-array path. The final attached bank is retired
    // by the discarded draw below.
    const passes = [];
    const restorePasses = [];
    const trackCacheMisses = [];
    for (let index = 0; index < this.roadWorkGeometries.length; index += 1) {
      const updateStarted = performance.now();
      trackCacheMisses.push(trackPrimeWouldMiss());
      this.update(activeState, [], 0);
      passes.push(Number((performance.now() - updateStarted).toFixed(3)));

      const restoreStarted = performance.now();
      this.resetCameraDirector();
      this.shake = 0;
      this.flash = 0;
      this.combatFX.resetDiagnostics();
      this.update(initialState, [], 0);
      restorePasses.push(Number((performance.now() - restoreStarted).toFixed(3)));
    }
    this.controlPrimeStateRetainer = activeState;
    const restoreMs = restorePasses.reduce((sum, value) => sum + value, 0);
    const updateMs = passes.reduce((sum, value) => sum + value, 0);
    Object.assign(this.controlPrimeTelemetry, {
      status: 'complete',
      steps: 14,
      fraction: Number(getSegmentFraction(activeState).toFixed(6)),
      passes,
      restorePasses,
      trackCacheMisses,
      updateMs: Number(updateMs.toFixed(3)),
      restoreMs: Number(restoreMs.toFixed(3)),
      renderMs: 0,
      totalMs: Number((performance.now() - started).toFixed(3)),
      target: 'final-boot-cpu-only',
    });
    return { ...this.controlPrimeTelemetry };
  }

  /**
   * Compiles the exact opening + launch presentation before control is offered,
   * then warms space/reentry/touchdown progressively during the long playable
   * Scoria run. Deferred staging is restored atomically around every compile;
   * its geometry uploads are spread over subsequent animation frames.
   */
  async prewarmFirstLoop({
    initialState,
    seed = initialState?.seed,
    short = initialState?.short,
    getLiveState = () => initialState,
  } = {}) {
    if (!initialState) throw new TypeError('prewarmFirstLoop requires the untouched initial race state.');
    this.prewarmZeroCountInstancePrimes = 0;
    if (this.prewarmStatus === 'control-ready' || this.prewarmStatus === 'complete') return this.prewarmReport;
    if (this.prewarmPromise) return this.prewarmPromise;

    this.prewarmStatus = 'running';
    this.prewarmPromise = (async () => {
      const started = performance.now();
      const initializationStarted = performance.now();
      await this.initializationPromise;
      const initializationReadyMs = performance.now() - initializationStarted;
      const textureStarted = performance.now();
      await Promise.all([
        this.planetOneArt.ready,
        this.planetVistaTexturesReady,
      ]);
      const textureReadyMs = performance.now() - textureStarted;
      const stageReports = [];
      const criticalTextureUploads = [];
      // The authored cathedral color is a full-resolution image whose first
      // WebGL transfer can exceed one frame on the hostile D3D path. Upload it
      // during calibration after exact links are issued; every smaller future
      // texture remains part of the bounded resource vocabulary below.
      const criticalTextureCandidates = [this.planetOneArt.shardCathedral.map];
      const originalShadowEnabled = this.renderer.shadowMap.enabled;
      const originalSunCastShadow = this.sunLight.castShadow;
      const originalShadowMapSize = this.sunLight.shadow.mapSize.clone();
      // Shader programs and detached future vertex buffers are
      // resolution-independent. Compile/upload them against tiny targets;
      // the mandatory visible opening itself is drawn once at full authored
      // resolution below (an earlier implementation redundantly drew it once
      // tiny and once full-size before enabling IGNITE).
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(96, 54, false);
      if (this.composer) {
        this.composer.setPixelRatio(1);
        this.composer.setSize(96, 54);
      }
      // Shadow participation is part of a MeshStandardMaterial program key.
      // Keep it enabled so the live launch cannot request shadowed variants,
      // but pay the staging draw against a 64px map instead of seven 1024px
      // maps. Program compilation and vertex upload are resolution-independent.
      this.renderer.shadowMap.enabled = originalShadowEnabled;
      this.sunLight.castShadow = originalSunCastShadow;
      this.sunLight.shadow.mapSize.set(64, 64);
      const stages = [
        {
          name: 'planet1-launch-0945',
          compile: true,
          state: this.makePrewarmState(COURSE[0], 0.945, { seed, short, lift: 3.8, boost: 0.72 }),
        },
        {
          // All four pressure rings overlap only in the middle of the car ->
          // rocket closure. The old .945 stage had already hidden them, so a
          // cold GPU first encountered four torus uploads during live launch.
          // The preceding full launch compile covers the material family; an
          // exact composer render here uploads only the missing visible rings.
          name: 'planet1-launch-rings-08905',
          state: this.makePrewarmState(COURSE[0], 0.8905, { seed, short, lift: 2.45, boost: 0.72 }),
        },
        {
          name: 'space1-departure',
          compile: true,
          state: this.makePrewarmState(COURSE[1], 0.025, { seed, short, lift: 7.2, boost: 0.72 }),
        },
        {
          // Match the literal first live combat input: VANTA visible, weapons
          // armed, one dual-gun miss. This exposes both muzzle sprites, both
          // travelling bolt shader layers, and their first texture upload.
          name: 'space1-first-dual-miss-0082',
          compile: true,
          clearCombat: true,
          events: [{ type: 'shot', targetId: 'vanta', hit: false, intensity: 0.34 }],
          state: this.makePrewarmState(COURSE[1], 0.082, { seed, short, lift: 7.2, boost: 0.72 }),
        },
        {
          // Exercise the causal reward path too. Ten bounded 50ms pool steps
          // carry the dual hit into shield fracture + return signal; a later
          // stage advances the return far enough to ignite the engine pulse.
          name: 'space1-hit-impact-return',
          clearCombat: true,
          combatSteps: 10,
          events: [{ type: 'shot', targetId: 'vanta', hit: true, intensity: 0.72 }],
          state: this.makePrewarmState(COURSE[1], 0.24, { seed, short, lift: 6.4, boost: 0.84 }),
        },
        {
          name: 'space1-return-engine-pulse',
          combatSteps: 6,
          state: this.makePrewarmState(COURSE[1], 0.255, { seed, short, lift: 6.2, boost: 0.92 }),
        },
        {
          name: 'space1-reentry-0840',
          state: this.makePrewarmState(COURSE[1], 0.84, { seed, short, lift: 1.8, boost: 0.68 }),
        },
        {
          name: 'space1-reentry-0920',
          state: this.makePrewarmState(COURSE[1], 0.92, { seed, short, lift: 1.1, boost: 0.68 }),
        },
        {
          name: 'space1-final-approach-0998',
          state: this.makePrewarmState(COURSE[1], 0.998, { seed, short, lift: 0.45, boost: 0.68 }),
        },
        {
          name: 'planet2-touchdown',
          compile: true,
          // The carried landing impulse places the first settled gameplay
          // frame roughly 150-220 metres into Stormglass. Stage that actual
          // touchdown region instead of the mathematical zero point so all
          // near-strip layers upload before the live boundary.
          state: this.makePrewarmState(COURSE[2], 0.04, { seed, short, lift: 2.35, boost: 0.68 }),
        },
        {
          // The authored touchdown zone hides generic storm-ocean decor for
          // its opening 855 metres. Upload it now as well so crossing that
          // boundary cannot become a second delayed first-use hitch.
          name: 'planet2-surface-decor',
          state: this.makePrewarmState(COURSE[2], 0.18, { seed, short, lift: 0, boost: 0.62 }),
        },
      ];
      // Compile the exact opening, morph/launch, and first S1 draw sets before
      // IGNITE, but leave vertex and texture transfer progressive. Program
      // links can outlive their JS issue task, so every exact first-loop family
      // is completed before control; only bounded buffer/texture uploads run
      // during the long Planet I drive.
      const criticalStages = [{
        name: 'planet1-opening',
        compile: true,
        visibleOnly: true,
        state: initialState,
      }];
      const deferredStages = stages;
      let openingRenderedAtFullSize = false;

      try {
        // Issue the exact opening family as soon as its detached snapshot
        // exists. EXT_parallel_shader_compile can then link it while the CPU
        // builds the future first-loop descriptors; serializing those two
        // independent jobs left roughly 200-250 ms on the cold control path.
        const descriptorVocabulary = {
          observed: {
            geometries: new Set(),
            instanceMatrices: new Set(),
            instanceColors: new Set(),
            morphTextures: new Set(),
            textures: new Set(),
          },
          retained: {
            geometries: new Set(),
            instanceMatrices: new Set(),
            instanceColors: new Set(),
            morphTextures: new Set(),
            textures: new Set(),
          },
          snapshots: [],
        };
        const makeSnapshotPair = (stage, frustumOnly = false, includeFrustumSubset = false) => {
          if (stage.clearCombat) this.combatFX.clear();
          this.update(stage.state, stage.events ?? [], 0);
          for (let step = 0; step < (stage.combatSteps ?? 0); step += 1) {
            this.combatFX.update(0.05, stage.state.time + (step + 1) * 0.05);
          }
          this.scene.updateMatrixWorld(true);
          this.camera.updateMatrixWorld(true);
          const snapshot = this.collectDeferredRenderables(
            this.scene,
            (frustumOnly || includeFrustumSubset) ? this.camera : null,
            frustumOnly,
            includeFrustumSubset,
            descriptorVocabulary,
            stage.name === 'planet1-opening',
          );
          const pair = {
            name: stage.name,
            candidates: [],
            rawCandidateCount: 0,
            selectedCount: snapshot.renderables.length,
            compileScene: null,
            targetScene: null,
            camera: this.camera.clone(),
            lights: snapshot.lights,
            snapshot,
            issueMs: 0,
            totalMs: 0,
          };
          this.combatFX.clear();
          return pair;
        };
        const prepareCompilePair = (pair, select = () => true) => {
          const selected = pair.snapshot.renderables.filter(select);
          // compileAsync only needs one object for each exact material +
          // program-affecting geometry/object feature tuple. Vehicle shells,
          // rivals and decor intentionally reuse a small shader vocabulary.
          const candidates = this.selectDeferredProgramCandidates(selected);
          const compileScene = new THREE.Scene();
          const targetScene = new THREE.Scene();
          targetScene.fog = pair.snapshot.fog;
          targetScene.environment = pair.snapshot.environment;
          targetScene.environmentIntensity = pair.snapshot.environmentIntensity;
          if (pair.snapshot.environmentRotation && targetScene.environmentRotation) {
            targetScene.environmentRotation.copy(pair.snapshot.environmentRotation);
          }
          for (const light of pair.snapshot.lights) {
            targetScene.add(light);
            if (light.target) targetScene.add(light.target);
          }
          pair.candidates = candidates;
          pair.rawCandidateCount = candidates.length;
          pair.selectedCount = selected.length;
          pair.compileScene = compileScene;
          pair.targetScene = targetScene;
          return pair;
        };
        const snapshotBuildStarted = performance.now();
        const openingPair = prepareCompilePair(makeSnapshotPair(criticalStages[0], true));
        // The opening track has just been generated byte-for-byte for the real
        // initial state. Retain that exact Float32 geometry + Float64 sample
        // vocabulary once, so later canonical restores select it instead of
        // running the same 8,232-vertex row/normal reconstruction twice.
        if (!this.staticScoriaSurface?.enabled) {
          this.openingInitialTrackResponse = this.captureOpeningTrackResponse(0);
          this.openingInitialTrackResponse.short = Boolean(short);
          this.openingInitialTrackResponse.quality = this.quality;
        }
        const openingSceneKey = this.deferredSceneProgramKey(openingPair.snapshot);
        openingPair.candidates = openingPair.candidates.filter((source) => {
          const key = `${openingSceneKey}\u0003${source.prewarmProgramKey ?? this.deferredRenderableProgramKey(source)}`;
          if (this.deferredProgramWarmKeys.has(key)) return false;
          this.deferredProgramWarmKeys.add(key);
          return true;
        });
        for (const source of openingPair.candidates) {
          openingPair.compileScene.add(this.makeDeferredRenderable(source));
        }
        const previousRenderTarget = this.renderer.getRenderTarget();
        const liveRenderTarget = this.quality === 'low'
          ? previousRenderTarget
          : (this.composer?.readBuffer ?? previousRenderTarget);
        const issueCompileScene = (pair, compileScene, source = null, index = 0) => {
          const issueStarted = performance.now();
          const promise = typeof this.renderer.compileAsync === 'function'
            ? this.renderer.compileAsync(compileScene, pair.camera, pair.targetScene)
            : Promise.resolve(this.renderer.compile(compileScene, pair.camera, pair.targetScene));
          const issueMs = performance.now() - issueStarted;
          pair.issueMs = Math.max(pair.issueMs ?? 0, issueMs);
          pair.issueTotalMs = (pair.issueTotalMs ?? 0) + issueMs;
          pair.issueDetails ??= [];
          pair.issueDetails.push({
            index,
            name: source?.name ?? null,
            kind: source?.kind ?? null,
            material: Array.isArray(source?.material)
              ? source.material.map((material) => material?.type ?? null).join('+')
              : source?.material?.type ?? null,
            programKey: source
              ? (source.prewarmProgramKey ?? this.deferredRenderableProgramKey(source))
              : null,
            issueMs: Number(issueMs.toFixed(3)),
          });
          return promise;
        };
        const issueCompilePair = (pair) => {
          if (pair.candidates.length === 0) return Promise.resolve();
          const compileStarted = performance.now();
          pair.issueMs = 0;
          pair.issueTotalMs = 0;
          pair.issueDetails = [];
          const promise = issueCompileScene(pair, pair.compileScene);
          return promise.then(() => {
            pair.totalMs = performance.now() - compileStarted;
          });
        };
        const issueCompilePairInTasks = async (pair) => {
          if (pair.candidates.length === 0) return { completion: Promise.resolve() };
          const compileStarted = performance.now();
          pair.issueMs = 0;
          pair.issueTotalMs = 0;
          pair.issueDetails = [];
          pair.compileSlices = [];
          const children = [...pair.compileScene.children];
          const pending = [];
          for (let index = 0; index < children.length; index += 1) {
            if (index > 0) await this.waitWarmTask();
            const compileScene = new THREE.Scene();
            compileScene.add(children[index]);
            pair.compileSlices.push(compileScene);
            try {
              this.renderer.setRenderTarget(liveRenderTarget);
              pending.push(issueCompileScene(pair, compileScene, pair.candidates[index], index));
            } finally {
              this.renderer.setRenderTarget(previousRenderTarget);
            }
          }
          return {
            completion: Promise.all(pending).then(() => {
              pair.totalMs = performance.now() - compileStarted;
            }),
          };
        };
        let openingCompilePromise;
        try {
          this.renderer.setRenderTarget(liveRenderTarget);
          openingCompilePromise = issueCompilePair(openingPair);
        } finally {
          this.renderer.setRenderTarget(previousRenderTarget);
        }
        // Snapshot every first-loop pose before control. This costs only CPU
        // scene traversal and cloned descriptors, and means progressive work
        // never has to mutate/restore the live race in response to a later
        // first-use. GPU program issue/upload remains deferred.
        const futurePairs = new Array(stages.length);
        const futureCompilePromises = [];
        let compilerSceneBuildMs = 0;
        let spaceDepartureVisiblePair = null;
        const buildAndIssueFuturePair = async (stageIndex) => {
          const stage = stages[stageIndex];
          // Capture the exact detached descriptor now. Its program vocabulary
          // is issued immediately below; the retained descriptor is reused
          // later for input-quiet buffer/texture upload without mutating the
          // live scene.
          const pair = makeSnapshotPair(stage, false, stageIndex === 2);
          // Reuse the exact detached scene descriptors after control. This
          // prevents progressive work from mutating/restoring the live scene
          // and guarantees the compiler sees the authored material instances.
          stage.prewarmSnapshot = pair.snapshot;
          stage.prewarmCamera = pair.camera;
          stage.prewarmProgramsReady = false;
          futurePairs[stageIndex] = pair;
          // Prepare, globally deduplicate, and issue this exact family before
          // constructing the next pose. The driver links it while later
          // snapshots are built in separate tasks; by the time the opening is
          // drawn there is no shader tail left to fight that full-resolution
          // submission.
          const compilerSceneStarted = performance.now();
          prepareCompilePair(pair);
          const sceneKey = this.deferredSceneProgramKey(pair.snapshot);
          pair.candidates = pair.candidates.filter((source) => {
            const key = `${sceneKey}\u0003${source.prewarmProgramKey ?? this.deferredRenderableProgramKey(source)}`;
            if (this.deferredProgramWarmKeys.has(key)) return false;
            this.deferredProgramWarmKeys.add(key);
            return true;
          });
          for (const source of pair.candidates) pair.compileScene.add(this.makeDeferredRenderable(source));
          compilerSceneBuildMs += performance.now() - compilerSceneStarted;
          if (stage.name === 'space1-departure') {
            // On a hostile clean driver the nine exact S1 representatives can
            // occasionally make compileAsync spend >1 s in its synchronous
            // issue traversal even though links remain parallel. Submit the
            // already-deduplicated representatives as separate tasks. This
            // preserves every exact scene/light/material key and all links
            // still complete before IGNITE, but no single JS task owns the
            // entire driver queue. Per-key timings below make the contract
            // independently auditable rather than hiding the spike in one
            // aggregate pair.
            const issued = await issueCompilePairInTasks(pair);
            futureCompilePromises.push(issued.completion);
          } else {
            try {
              this.renderer.setRenderTarget(liveRenderTarget);
              futureCompilePromises.push(issueCompilePair(pair));
            } finally {
              this.renderer.setRenderTarget(previousRenderTarget);
            }
          }
          if (stageIndex === 2) {
            spaceDepartureVisiblePair = {
              snapshot: pair.snapshot.frustumSnapshot,
              camera: pair.camera,
            };
          }
        };
        // Stormglass surface contributes only two exact programs, but they are
        // the slowest driver links and have no combat/transition dependency.
        // Snapshot and issue that authored state first so its ~1.7 s link runs
        // underneath every route-ordered P1/S1 snapshot task. Its descriptor
        // remains in the original stage slot for deferred resource upload.
        const earlySurfaceStageIndex = stages.length - 1;
        const earlyDepartureStageIndex = stages.findIndex((stage) => stage.name === 'space1-departure');
        const snapshotBuildOrder = [earlySurfaceStageIndex, earlyDepartureStageIndex];
        for (let stageIndex = 0; stageIndex < stages.length - 1; stageIndex += 1) {
          if (stageIndex !== earlyDepartureStageIndex) snapshotBuildOrder.push(stageIndex);
        }
        // S1 departure is independent of the later combat-state chain and has
        // the slowest exact link family on the hostile driver. Issue it directly
        // after the already-prioritized P2 surface family. Route-ordered launch,
        // combat, reentry and touchdown descriptors remain in their canonical
        // slots, but those two long links now run beneath every later bounded
        // snapshot task instead of starting after launch/ring CPU work.
        for (const stageIndex of snapshotBuildOrder) {
          await buildAndIssueFuturePair(stageIndex);
          // The opening link is already running in the driver. Keep each
          // exact snapshot as a separate user-blocking task so driver
          // contention cannot stretch the whole eleven-pose build into one
          // post-paint long task. This is a task boundary, not a display-frame
          // delay, and every descriptor still exists before IGNITE.
          await this.waitWarmTask();
        }
        // Early P2 compilation must not alter the canonical retained-course
        // order exposed to diagnostics or later cache iteration.
        const retainedPlanetTwo = this.decorCache.get('planet-2');
        if (retainedPlanetTwo) {
          this.decorCache.delete('planet-2');
          this.decorCache.set('planet-2', retainedPlanetTwo);
        }
        const snapshotBuildMs = performance.now() - snapshotBuildStarted;
        // Shader linking is the only progressive operation whose driver work
        // can outlive its tiny JS issue slice and contend with a later live
        // submission. Enumerate every exact first-loop program family now,
        // globally deduplicate its real scene/material/object key, and issue it
        // while IGNITE is disabled. Background work then becomes resource
        // upload only; player input can never collide with a lingering link.
        const preparedFuturePairs = futurePairs;
        const launchPair = preparedFuturePairs[0];
        const spaceDeparturePair = preparedFuturePairs[2];
        const planetTwoDecorPair = preparedFuturePairs.at(-1);
        // Keep a separately culled descriptor for the mandatory first S1
        // upload. Program coverage is full-scene, but only resources visible
        // at the literal boundary need to cross the bus before control.
        for (const stage of stages) stage.prewarmProgramsReady = true;
        const compilePairs = [openingPair, ...preparedFuturePairs];
        const compilePromises = [openingCompilePromise, ...futureCompilePromises];
        let deferredTargetCompileMs = 0;
        let deferredTargetCompileIssueMs = 0;
        let deferredTargetCompileProgramDelta = 0;
        // Every exact first-loop compile was issued progressively in global
        // stage/key order while the remaining descriptors were built. Await
        // the small remaining tail before the mandatory full-size draw so
        // shader linking can never inflate that presentation submission.
        const compileHeadStartAt = performance.now();
        // Texture slots already exist on every exact material, so program keys
        // do not depend on texel residency. Issue the entire shader vocabulary
        // first, then transfer this decoded 2K color map while the driver links
        // in parallel. This removes a purely serial ~70 ms gate without ever
        // letting decode/upload contend with the visible opening draw.
        for (const texture of criticalTextureCandidates) {
          const uploadStarted = performance.now();
          this.renderer.initTexture(texture);
          this.deferredTextureUploads.add(texture);
          criticalTextureUploads.push({
            name: texture.name || null,
            ms: Number((performance.now() - uploadStarted).toFixed(3)),
          });
        }
        await Promise.all(compilePromises);
        const compileHeadStartMs = performance.now() - compileHeadStartAt;
        // With the driver link queue empty, build the two exact first-frame
        // Scoria responses in bounded CPU-only tasks. Doing this under active
        // shader links once stretched a 17 ms row build to 760 ms; ordering is
        // the root performance fix, not a relaxed long-task allowance.
        const openingTrackResponses = await this.prepareOpeningTrackResponses({ seed, short });
        // Static high-quality P1 owns one immutable full-course surface. Submit
        // each exact real-material family through a one-pixel live target now,
        // after all opening links and before the visible full-size draw.
        const staticScoriaSurfaceUpload = await this.uploadStaticScoriaSurfaceBeforeControl();
        // Restore the authored output and draw the exact opening once with no
        // driver compile work left in flight. No controls exist yet, and the
        // draw covers the full live composer/shadow/geometry path.
        //
        // This
        // single draw both presents the player-visible frame and warms the
        // composer/shadow/geometry path; a preceding 96x54 composer draw cost
        // another ~0.5 s without covering any resource the full draw misses.
        this.sunLight.shadow.map?.dispose();
        this.sunLight.shadow.map = null;
        this.sunLight.shadow.mapSize.copy(originalShadowMapSize);
        this.renderer.shadowMap.enabled = originalShadowEnabled;
        this.sunLight.castShadow = originalSunCastShadow;
        this.resize();
        this.resetCameraDirector();
        this.update(initialState, [], 0);
        const renderStarted = performance.now();
        this.renderer.info.reset();
        if (this.quality === 'low') this.renderer.render(this.scene, this.camera);
        else this.composer.render(0);
        const renderMs = performance.now() - renderStarted;
        if (this.openingInitialTrackResponse) this.openingInitialTrackResponse.preuploaded = true;
        openingRenderedAtFullSize = true;
        for (const source of openingPair.snapshot.renderables) this.markDeferredRenderableUploaded(source);
        for (const geometry of openingPair.snapshot.uploadResources?.geometries ?? []) {
          this.deferredGeometryUploads.add(geometry);
        }
        for (const attribute of openingPair.snapshot.uploadResources?.instanceMatrices ?? []) {
          this.deferredInstanceUploads.add(attribute);
        }
        for (const attribute of openingPair.snapshot.uploadResources?.instanceColors ?? []) {
          this.deferredInstanceUploads.add(attribute);
        }
        for (const texture of openingPair.snapshot.uploadResources?.morphTextures ?? []) {
          this.deferredTextureUploads.add(texture);
        }
        for (const texture of openingPair.snapshot.textures) this.deferredTextureUploads.add(texture);
        try {
          await Promise.all(compilePromises);
          if (this.quality === 'low') {
            // Low quality presents directly to the default framebuffer, whose
            // output-color program key differs from every non-XR WebGL render
            // target in Three. Progressive geometry transfer uses a tiny
            // discarded render target, so compile that exact second target
            // family now as well. Without this pass, the first trusted touch
            // could collide with 20+ blocking driver links (one measured at
            // 416 ms) even though all default-framebuffer programs were warm.
            // Low quality has no shadow pass or composer, and this preserves
            // its live shader family plus every visual/material setting.
            const target = new THREE.WebGLRenderTarget(32, 18, {
              depthBuffer: true,
              stencilBuffer: false,
            });
            const programsBefore = this.renderer.info.programs.length;
            const compileStarted = performance.now();
            const previousTarget = this.renderer.getRenderTarget();
            const promises = [];
            try {
              this.renderer.setRenderTarget(target);
              for (const pair of compilePairs) {
                if (pair.candidates.length === 0) continue;
                const issueStarted = performance.now();
                const promise = typeof this.renderer.compileAsync === 'function'
                  ? this.renderer.compileAsync(pair.compileScene, pair.camera, pair.targetScene)
                  : Promise.resolve(this.renderer.compile(pair.compileScene, pair.camera, pair.targetScene));
                deferredTargetCompileIssueMs += performance.now() - issueStarted;
                promises.push(promise);
              }
            } finally {
              this.renderer.setRenderTarget(previousTarget);
            }
            try {
              await Promise.all(promises);
            } finally {
              target.dispose();
            }
            deferredTargetCompileMs = performance.now() - compileStarted;
            deferredTargetCompileProgramDelta = this.renderer.info.programs.length - programsBefore;
          }
        } finally {
          for (const light of openingPair.lights) light.dispose?.();
        }
        // Filter the critical first-space upload only after the real opening
        // draw has registered every shared geometry/texture. Doing this in the
        // opposite order redundantly re-uploaded the entire P1 opening (217
        // renderables / 17 textures) and spent ~250 ms before control. The
        // resulting S1 draw set is identical; only genuinely cold resources
        // are submitted here.
        const spaceDepartureUpload = this.uploadCriticalDeferredScene(
          spaceDepartureVisiblePair.snapshot,
          spaceDepartureVisiblePair.camera,
        );
        // WebGLRenderer.compileAsync() only prepares each object's authored
        // surface material. Three creates its generated MeshDepthMaterial
        // variants inside WebGLShadowMap's real render path, so the hero's
        // double-sided rocket chines could otherwise discover their exact
        // depth family during the first live reentry shadow update. Prime one
        // retained departure representative against cloned 64px staging
        // lights now. The helper restores the live target/shadow state and
        // disposes only its detached targets/lights; shared geometry/material
        // ownership remains with the retained snapshot and vehicle.
        const rocketChineShadowPrime = this.primeDeferredShadowProgramBeforeControl(
          spaceDeparturePair.snapshot,
          spaceDeparturePair.camera,
          { ownerName: 'sealed-rocket-chines', expectedMapSize: 64 },
        );
        // compileAsync covers authored surface materials but Three creates its
        // generated instanced shadow-depth family only inside a real shadow
        // pass. P2's cone field was the sole exact post-control program delta
        // (and a repeatable 5-13 ms upload slice). Submit only the two small
        // cast-shadow instanced decor families now, using the exact retained
        // P2 snapshot/light/material state. Their geometry/instance uploads are
        // harmlessly early; no visual, density, topology or shader setting is
        // changed, and background work remains strictly upload-only.
        const planetTwoInstancedShadowSnapshot = {
          ...planetTwoDecorPair.snapshot,
          renderables: planetTwoDecorPair.snapshot.renderables.filter((source) => (
            source.kind === 'instancedMesh' && source.castShadow
          )),
          textures: [],
        };
        const planetTwoShadowUpload = this.uploadCriticalDeferredScene(
          planetTwoInstancedShadowSnapshot,
          planetTwoDecorPair.camera,
        );
        // Startup optimization has recovered enough wall budget to make the
        // stronger gamefeel contract possible: transfer every remaining exact
        // first-loop texture/geometry before controls exist. The measured 64
        // geometry + 7 texture vocabulary is submitted in authored stage-sized
        // tasks, followed by driver retirement below. Live play therefore has
        // no background compile/upload worker to collide with any input frame.
        const precontrolUploads = await this.uploadDeferredStagesBeforeControl(stages);
        // The first exact moving road/terrain pair uses separate backing
        // stores. Upload both now, then swap to the chosen resident bank on
        // ignition without setting needsUpdate; the ordinary mutable bank is
        // restored for frame two onward. This avoids carrying a ~362 KB first
        // bufferSubData into the next live frame while preserving every value.
        const openingTrackResponseUploads = await this.uploadOpeningTrackResponsesBeforeControl({
          initialState,
          seed,
          short,
        });
        // Descriptor wrappers contain their own matrix clones, camera and
        // texture arrays; compiler Object3D retention alone does not keep those
        // records alive. Hold the bounded first-loop vocabulary for the session
        // so V8 cannot collect it during the first playable Scoria frames.
        const retainedDescriptorSnapshots = [
          openingPair.snapshot,
          spaceDepartureVisiblePair.snapshot,
          planetTwoInstancedShadowSnapshot,
          ...stages.map((stage) => stage.prewarmSnapshot),
        ];
        const retainedDescriptorCameras = [
          openingPair.camera,
          spaceDepartureVisiblePair.camera,
          planetTwoDecorPair.camera,
          ...stages.map((stage) => stage.prewarmCamera),
        ];
        this.prewarmDescriptorRetainers.push(
          ...retainedDescriptorSnapshots,
          ...retainedDescriptorCameras,
        );
        const descriptorRetention = {
          snapshots: retainedDescriptorSnapshots.length,
          cameras: retainedDescriptorCameras.length,
          uniqueRenderables: new Set(retainedDescriptorSnapshots.flatMap(
            (snapshot) => snapshot?.renderables ?? [],
          )).size,
          entries: this.prewarmDescriptorRetainers.length,
        };
        stageReports.push({
          name: 'planet1-opening',
          compileMs: Number(openingPair.totalMs.toFixed(3)),
          compileIssueMs: Number(openingPair.issueMs.toFixed(3)),
          renderMs: Number(renderMs.toFixed(3)),
          totalMs: Number((openingPair.totalMs + renderMs).toFixed(3)),
          candidates: openingPair.candidates.length,
          rawCandidates: openingPair.rawCandidateCount,
        });
        stageReports.push({
          name: 'launch-first-space-programs',
          deferred: true,
          compileMs: Number(Math.max(...compilePairs.map((pair) => pair.totalMs)).toFixed(3)),
          compileIssueMs: Number(Math.max(...compilePairs.map((pair) => pair.issueMs)).toFixed(3)),
          compileIssueTotalMs: Number(compilePairs
            .reduce((sum, pair) => sum + pair.issueMs, 0).toFixed(3)),
          compilePairs: compilePairs.map((pair) => ({
            name: pair.name,
            candidates: pair.candidates.length,
            issueMs: Number(pair.issueMs.toFixed(3)),
            issueTotalMs: Number((pair.issueTotalMs ?? pair.issueMs).toFixed(3)),
            issueDetails: pair.issueDetails ?? [],
            totalMs: Number(pair.totalMs.toFixed(3)),
          })),
          deferredTargetCompileMs: Number(deferredTargetCompileMs.toFixed(3)),
          deferredTargetCompileIssueMs: Number(deferredTargetCompileIssueMs.toFixed(3)),
          deferredTargetCompileProgramDelta,
          compileHeadStartMs: Number(compileHeadStartMs.toFixed(3)),
          snapshotBuildMs: Number(snapshotBuildMs.toFixed(3)),
          snapshotIssueOrder: snapshotBuildOrder.map((index) => stages[index].name),
          descriptorCompaction: {
            snapshots: descriptorVocabulary.snapshots,
            resources: Object.fromEntries(Object.keys(descriptorVocabulary.observed).map((key) => [key, {
              observed: descriptorVocabulary.observed[key].size,
              retained: descriptorVocabulary.retained[key].size,
            }])),
          },
          compilerSceneBuildMs: Number(compilerSceneBuildMs.toFixed(3)),
          renderMs: Number((
            spaceDepartureUpload.renderMs + rocketChineShadowPrime.renderMs
          ).toFixed(3)),
          totalMs: Number((Math.max(...compilePairs.map((pair) => pair.totalMs))
            + spaceDepartureUpload.totalMs
            + rocketChineShadowPrime.totalMs).toFixed(3)),
          criticalUpload: spaceDepartureUpload,
          criticalRocketShadowPrime: rocketChineShadowPrime,
          criticalShadowUpload: planetTwoShadowUpload,
          precontrolUploads: {
            status: precontrolUploads.status,
            totalMs: precontrolUploads.totalMs,
            maxSliceMs: precontrolUploads.maxSliceMs,
            renderables: precontrolUploads.renderables,
            textures: precontrolUploads.textures,
            programDelta: precontrolUploads.programDelta,
          },
          openingTrackResponseUploads,
          staticScoriaSurface: {
            activeMode: this.staticScoriaSurface?.activeMode ?? 'rolling',
            buildMs: this.staticScoriaSurface?.buildMs ?? 0,
            maxBuildSliceMs: this.staticScoriaSurface?.maxBuildSliceMs ?? 0,
            bytes: this.staticScoriaSurface?.bytes ?? 0,
            upload: staticScoriaSurfaceUpload,
          },
          activePrime: this.controlPrimeTelemetry,
          openingTrackResponses,
          descriptorRetention,
          candidates: compilePairs.reduce((sum, pair) => sum + pair.candidates.length, 0),
          rawCandidates: compilePairs.reduce((sum, pair) => sum + pair.rawCandidateCount, 0),
          selectedCandidates: futurePairs.reduce((sum, pair) => sum + pair.selectedCount, 0),
          exactStages: preparedFuturePairs.map((pair) => pair.name),
          criticalExactStages: [launchPair.name, spaceDeparturePair.name],
          deferredExactStages: [],
          prebuiltSnapshots: futurePairs.map((pair) => pair.name),
        });
        stageReports.push(...precontrolUploads.reports);
        // KHR_parallel_shader_compile can report links complete while the GPU
        // process is still retiring exact critical draw/upload work. Give that
        // already-issued queue four display turns before the final CPU prime;
        // no new program/resource work is introduced and controls remain under
        // the hard five-second navigation budget.
        const driverSettleStarted = performance.now();
        await this.waitWarmFrame(4);
        stageReports.at(-1).driverSettleMs = Number((performance.now() - driverSettleStarted).toFixed(3));
      } finally {
        if (!openingRenderedAtFullSize) {
          // Preserve a usable authored opening even if calibration throws
          // before the normal full-size presentation point.
          this.sunLight.shadow.map?.dispose();
          this.sunLight.shadow.map = null;
          this.sunLight.shadow.mapSize.copy(originalShadowMapSize);
          this.renderer.shadowMap.enabled = originalShadowEnabled;
          this.sunLight.castShadow = originalSunCastShadow;
          this.resize();
        }
        if (!openingRenderedAtFullSize) {
          // The camera director is stateful. The normal path already reset and
          // restored it after the active prime; only an exceptional early exit
          // still needs this recovery path.
          this.resetCameraDirector();
          this.shake = 0;
          this.flash = 0;
          this.combatFX.resetDiagnostics();
          this.update(initialState, [], 0);
          this.render(0, 0, 'prewarm-recovery');
        }
        this.resetFrameSamples();
      }

      this.prewarmStatus = 'complete';
      this.prewarmControlReadyAt = performance.now();
      this.prewarmGetLiveState = getLiveState;
      this.prewarmReport = {
        status: this.prewarmStatus,
        totalMs: Number((performance.now() - started).toFixed(3)),
        controlReadyMs: Number((performance.now() - started).toFixed(3)),
        initializationReadyMs: Number(initializationReadyMs.toFixed(3)),
        textureReadyMs: Number(textureReadyMs.toFixed(3)),
        criticalTextureUploads,
        stages: stageReports,
        backgroundStatus: 'complete',
        backgroundMs: 0,
        inputIsolation: this.prewarmInputIsolation,
        retainedDecor: [...this.decorCache.keys()],
        restoredSegmentId: COURSE[initialState.segmentIndex]?.id ?? null,
        zeroCountInstancePrimes: this.prewarmZeroCountInstancePrimes,
      };
      this.backgroundPrewarmPromise = Promise.resolve(this.prewarmReport);
      return this.prewarmReport;
    })();

    try {
      return await this.prewarmPromise;
    } catch (error) {
      this.prewarmStatus = 'failed';
      this.prewarmReport = {
        status: this.prewarmStatus,
        error: error?.message ?? String(error),
      };
      throw error;
    } finally {
      this.prewarmPromise = null;
    }
  }

  async waitForFirstLoopPrewarm() {
    if (this.backgroundPrewarmPromise) return this.backgroundPrewarmPromise;
    if (this.prewarmPromise) await this.prewarmPromise;
    return this.backgroundPrewarmPromise ? this.backgroundPrewarmPromise : this.prewarmReport;
  }

  /**
   * Tell the progressive warmer that a control edge has arrived.  A trusted
   * pointer/key listener calls this before InputManager handles the event, and
   * the QA surface calls it when it changes its synthetic control state.  The
   * warmer never starts a GPU slice inside the protected response window.
   */
  notePlayerInput({ type = 'input', eventTime = performance.now() } = {}) {
    const now = performance.now();
    const isolation = this.prewarmInputIsolation;
    const first = isolation.inputEvents === 0;
    isolation.inputEvents += 1;
    isolation.firstInputAt ??= Number(now.toFixed(3));
    isolation.lastInputAt = Number(now.toFixed(3));
    const isContinuous = type.includes('move');
    const isRelease = type.includes('up') || type.includes('cancel') || type.includes('release');
    const quietMs = first ? 420 : isContinuous ? 92 : isRelease ? 150 : 180;
    this.prewarmInputQuietUntil = Math.max(this.prewarmInputQuietUntil, now + quietMs);

    // Event.timeStamp uses the same time origin in modern browsers.  If an
    // event was queued while one of our synchronous slices owned the thread,
    // expose that as a hard diagnostic instead of silently calling it idle.
    const normalizedEventTime = Number(eventTime);
    const lastSlice = isolation.lastSlice;
    if (lastSlice
      && Number.isFinite(normalizedEventTime)
      && normalizedEventTime >= lastSlice.startedAt
      && normalizedEventTime <= lastSlice.endedAt) {
      isolation.inputCollisions += 1;
    }
  }

  noteControlState(controls = {}) {
    const signature = `${Number(controls.steer || 0).toFixed(3)}:${controls.surge ? 1 : 0}:${controls.slip ? 1 : 0}`;
    if (signature === this.prewarmLastControlSignature) return;
    this.prewarmLastControlSignature = signature;
    this.notePlayerInput({ type: 'control-change' });
  }

  publishLiveFrame(origin = 'renderer-direct') {
    this.liveFrameSerial += 1;
    this.liveFrameOrigin = String(origin || 'renderer-direct');
    if (!this.liveFrameWaiters.length) return;
    const waiters = this.liveFrameWaiters.splice(0);
    for (const resolve of waiters) resolve(this.liveFrameSerial);
  }

  waitForNextLiveFrame() {
    return new Promise((resolve) => this.liveFrameWaiters.push(resolve));
  }

  async waitForPrewarmOpportunity() {
    while (true) {
      // Progressive work begins only after the real scene has submitted. This
      // ordering leaves the input/simulation/render path first claim on every
      // frame instead of racing it from an older rAF callback.
      await this.waitForNextLiveFrame();
      const now = performance.now();
      const isolation = this.prewarmInputIsolation;
      const liveState = this.prewarmGetLiveState?.();
      if (isolation.inputEvents === 0) {
        // Normal play reaches this branch only while IGNITE is still waiting.
        // Autotests can begin without a trusted gesture, so permit a bounded
        // fallback once their race is demonstrably advancing.
        const fallbackReady = Boolean(liveState?.started)
          && now - this.prewarmControlReadyAt >= 1200;
        if (!fallbackReady) {
          isolation.deferredForInput += 1;
          continue;
        }
        isolation.fallbackStartedAt ??= Number(now.toFixed(3));
      }
      if (now < this.prewarmInputQuietUntil) {
        isolation.deferredForInput += 1;
        continue;
      }
      const scheduling = globalThis.navigator?.scheduling;
      if (scheduling?.isInputPending?.({ includeContinuous: true })) {
        isolation.deferredForPendingInput += 1;
        this.prewarmInputQuietUntil = Math.max(this.prewarmInputQuietUntil, now + 92);
        continue;
      }
      // A slice runs only after a completed live submission. Requiring a
      // two-serial gap means at least one subsequent live frame receives no
      // upload callback at all, giving the driver a recovery turn instead of
      // feeding it another buffer every rAF throughout a held control.
      if (this.prewarmLastSliceFrameSerial != null
        && this.liveFrameSerial - this.prewarmLastSliceFrameSerial < 2) {
        isolation.deferredForCadence += 1;
        continue;
      }
      return;
    }
  }

  async runPrewarmSlice(kind, operation) {
    await this.waitForPrewarmOpportunity();
    const startedAt = performance.now();
    const result = await operation();
    const endedAt = performance.now();
    const elapsed = endedAt - startedAt;
    const isolation = this.prewarmInputIsolation;
    const previousSliceFrameSerial = this.prewarmLastSliceFrameSerial;
    this.prewarmLastSliceFrameSerial = this.liveFrameSerial;
    isolation.sliceCount += 1;
    if (previousSliceFrameSerial != null) {
      const frameGap = this.liveFrameSerial - previousSliceFrameSerial;
      isolation.minFrameGap = isolation.minFrameGap == null
        ? frameGap
        : Math.min(isolation.minFrameGap, frameGap);
    }
    isolation.maxSliceMs = Number(Math.max(isolation.maxSliceMs, elapsed).toFixed(3));
    if (elapsed > 8) isolation.slicesAbove8Ms += 1;
    if (elapsed > 16.8) isolation.slicesAbove16_8Ms += 1;
    isolation.lastSlice = {
      kind,
      startedAt: Number(startedAt.toFixed(3)),
      endedAt: Number(endedAt.toFixed(3)),
      ms: Number(elapsed.toFixed(3)),
      frameSerial: this.liveFrameSerial,
    };
    return { result, ms: elapsed };
  }

  waitWarmFrame(count = 1) {
    let remaining = Math.max(1, count | 0);
    return new Promise((resolve) => {
      const next = () => {
        remaining -= 1;
        if (remaining <= 0) resolve();
        else requestAnimationFrame(next);
      };
      requestAnimationFrame(next);
    });
  }

  waitWarmTask() {
    if (globalThis.scheduler?.postTask) {
      return globalThis.scheduler.postTask(() => undefined, { priority: 'user-blocking' });
    }
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        channel.port2.close();
        resolve();
      };
      channel.port2.postMessage(0);
    });
  }

  collectDeferredRenderables(
    scene,
    camera = null,
    frustumOnly = false,
    includeFrustumSubset = false,
    descriptorVocabulary = null,
    resourcesUploadedByLiveScene = false,
  ) {
    const renderables = [];
    const frustumRenderables = includeFrustumSubset ? [] : null;
    const lights = [];
    const textures = new Set();
    const frustumTextures = includeFrustumSubset ? new Set() : null;
    const materialSnapshots = new Map();
    const materialTextureCache = new Map();
    const scannedTextureMaterials = new Set();
    const scannedFrustumTextureMaterials = includeFrustumSubset ? new Set() : null;
    const sourceProgramKeys = descriptorVocabulary ? new Set() : null;
    const retainedProgramKeys = descriptorVocabulary ? new Set() : null;
    const sourceMaterialProgramKeys = descriptorVocabulary ? new Map() : null;
    const snapshotUploadResources = descriptorVocabulary ? {
      geometries: new Set(),
      instanceMatrices: new Set(),
      instanceColors: new Set(),
      morphTextures: new Set(),
    } : null;
    let sourceRenderableCount = 0;
    const textureKeys = [
      'map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap',
      'envMap', 'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap',
    ];
    let materialReferenceCount = 0;
    let materialTextureReferenceCount = 0;
    const getMaterialTextures = (material) => {
      if (materialTextureCache.has(material)) return materialTextureCache.get(material);
      const found = [];
      for (const key of textureKeys) {
        const texture = material[key];
        if (texture?.isTexture) found.push(texture);
      }
      if (descriptorVocabulary) {
        // Assert the cached vocabulary against the literal material slots at
        // its single scan point. Every later owner of this material consumes
        // this exact array, eliminating repeated slot walks without weakening
        // texture coverage evidence.
        const literal = new Set(textureKeys
          .map((key) => material[key])
          .filter((texture) => texture?.isTexture));
        if (literal.size !== new Set(found).size || found.some((texture) => !literal.has(texture))) {
          throw new Error('Prewarm material texture cache changed exact texture coverage.');
        }
      }
      materialTextureCache.set(material, found);
      return found;
    };
    let frustum = null;
    if ((frustumOnly || includeFrustumSubset) && camera) {
      const projection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum = new THREE.Frustum().setFromProjectionMatrix(projection);
    }
    scene.traverseVisible((object) => {
      if (object.isLight) {
        const light = object.clone(false);
        light.matrixAutoUpdate = false;
        light.matrix.copy(object.matrixWorld);
        light.matrixWorld.copy(object.matrixWorld);
        if (light.target && object.target) {
          light.target.matrixAutoUpdate = false;
          light.target.matrix.copy(object.target.matrixWorld);
          light.target.matrixWorld.copy(object.target.matrixWorld);
        }
        if (light.shadow) {
          light.shadow.map = null;
          light.shadow.mapPass = null;
          light.shadow.mapSize.set(64, 64);
        }
        lights.push(light);
        return;
      }
      if (!(object.isMesh || object.isPoints || object.isLine || object.isSprite)) return;
      const cameraLayerVisible = !camera || object.layers.test(camera.layers);
      if (frustumOnly && !cameraLayerVisible) return;
      let frustumVisible = cameraLayerVisible;
      if (frustum && object.frustumCulled && cameraLayerVisible) {
        const intersects = object.isSprite
          ? frustum.intersectsSprite(object)
          : frustum.intersectsObject(object);
        frustumVisible = intersects;
        if (frustumOnly && !intersects) return;
      }
      const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const kind = object.isInstancedMesh
        ? 'instancedMesh'
        : object.isPoints
          ? 'points'
          : object.isLineSegments
            ? 'lineSegments'
            : object.isLine
              ? 'line'
              : object.isSprite
                ? 'sprite'
                : 'mesh';
      sourceRenderableCount += 1;
      for (const material of sourceMaterials) {
        if (!material) continue;
        materialReferenceCount += 1;
        const materialTextures = getMaterialTextures(material);
        materialTextureReferenceCount += materialTextures.length;
        if (!scannedTextureMaterials.has(material)) {
          scannedTextureMaterials.add(material);
          for (const texture of materialTextures) {
            textures.add(texture);
            descriptorVocabulary?.observed.textures.add(texture);
            // Textures are retained directly by the snapshot array rather than
            // through a renderable descriptor, so this is their exact upload
            // owner coverage set.
            descriptorVocabulary?.retained.textures.add(texture);
          }
        }
        if (frustumTextures && frustumVisible && !scannedFrustumTextureMaterials.has(material)) {
          scannedFrustumTextureMaterials.add(material);
          for (const texture of materialTextures) frustumTextures.add(texture);
        }
      }
      if (object.morphTexture?.isTexture) {
        textures.add(object.morphTexture);
        if (frustumTextures && frustumVisible) frustumTextures.add(object.morphTexture);
        descriptorVocabulary?.observed.textures.add(object.morphTexture);
        descriptorVocabulary?.retained.textures.add(object.morphTexture);
      }
      let programKey = null;
      let retainForProgram = true;
      let retainForGeometry = false;
      let retainForInstanceMatrix = false;
      let retainForInstanceColor = false;
      let retainForMorphTexture = false;
      if (descriptorVocabulary) {
        programKey = this.deferredRenderableProgramKey({
          kind,
          geometry: object.geometry,
          material: object.material,
          castShadow: object.castShadow,
          receiveShadow: object.receiveShadow,
          instanceColor: object.instanceColor,
          morphTexture: object.morphTexture,
          skinning: object.isSkinnedMesh === true,
        }, sourceMaterialProgramKeys);
        retainForProgram = !sourceProgramKeys.has(programKey);
        sourceProgramKeys.add(programKey);
        const newGeometry = Boolean(
          object.geometry && !descriptorVocabulary.observed.geometries.has(object.geometry),
        );
        const newInstanceMatrix = Boolean(
          object.isInstancedMesh
          && object.instanceMatrix
          && !descriptorVocabulary.observed.instanceMatrices.has(object.instanceMatrix),
        );
        const newInstanceColor = Boolean(
          object.isInstancedMesh
          && object.instanceColor
          && !descriptorVocabulary.observed.instanceColors.has(object.instanceColor),
        );
        const newMorphTexture = Boolean(
          object.isInstancedMesh
          && object.morphTexture?.isTexture
          && !descriptorVocabulary.observed.morphTextures.has(object.morphTexture),
        );
        retainForGeometry = newGeometry && !resourcesUploadedByLiveScene;
        retainForInstanceMatrix = newInstanceMatrix && !resourcesUploadedByLiveScene;
        retainForInstanceColor = newInstanceColor && !resourcesUploadedByLiveScene;
        retainForMorphTexture = newMorphTexture && !resourcesUploadedByLiveScene;
        if (object.geometry) descriptorVocabulary.observed.geometries.add(object.geometry);
        if (object.isInstancedMesh && object.instanceMatrix) {
          descriptorVocabulary.observed.instanceMatrices.add(object.instanceMatrix);
        }
        if (object.isInstancedMesh && object.instanceColor) {
          descriptorVocabulary.observed.instanceColors.add(object.instanceColor);
        }
        if (object.isInstancedMesh && object.morphTexture?.isTexture) {
          descriptorVocabulary.observed.morphTextures.add(object.morphTexture);
        }
        if (object.geometry) snapshotUploadResources.geometries.add(object.geometry);
        if (object.isInstancedMesh && object.instanceMatrix) {
          snapshotUploadResources.instanceMatrices.add(object.instanceMatrix);
        }
        if (object.isInstancedMesh && object.instanceColor) {
          snapshotUploadResources.instanceColors.add(object.instanceColor);
        }
        if (object.isInstancedMesh && object.morphTexture?.isTexture) {
          snapshotUploadResources.morphTextures.add(object.morphTexture);
        }
        if (resourcesUploadedByLiveScene) {
          if (newGeometry) descriptorVocabulary.retained.geometries.add(object.geometry);
          if (newInstanceMatrix) descriptorVocabulary.retained.instanceMatrices.add(object.instanceMatrix);
          if (newInstanceColor) descriptorVocabulary.retained.instanceColors.add(object.instanceColor);
          if (newMorphTexture) descriptorVocabulary.retained.morphTextures.add(object.morphTexture);
        }
        if (!(retainForProgram
          || retainForGeometry
          || retainForInstanceMatrix
          || retainForInstanceColor
          || retainForMorphTexture)) return;
      }
      const retainedMaterials = sourceMaterials.map((material) => {
        if (!material) return material;
        if (!materialSnapshots.has(material)) {
          const retained = material.clone();
          materialSnapshots.set(material, retained);
          this.prewarmMaterialRetainers.push(retained);
        }
        return materialSnapshots.get(material);
      });
      const retainedRenderable = {
        name: object.name || null,
        kind,
        geometry: object.geometry,
        material: Array.isArray(object.material) ? retainedMaterials : retainedMaterials[0],
        matrixWorld: object.matrixWorld.clone(),
        renderOrder: object.renderOrder,
        castShadow: object.castShadow,
        receiveShadow: object.receiveShadow,
        layers: object.layers.mask,
        count: object.count,
        instanceMatrix: object.instanceMatrix,
        instanceColor: object.instanceColor,
        morphTexture: object.morphTexture,
        skinning: object.isSkinnedMesh === true,
        prewarmProgramKey: programKey,
      };
      renderables.push(retainedRenderable);
      if (frustumRenderables && frustumVisible) frustumRenderables.push(retainedRenderable);
      if (descriptorVocabulary) {
        retainedProgramKeys.add(programKey);
        if (retainForGeometry) descriptorVocabulary.retained.geometries.add(object.geometry);
        if (retainForInstanceMatrix) {
          descriptorVocabulary.retained.instanceMatrices.add(object.instanceMatrix);
        }
        if (retainForInstanceColor) {
          descriptorVocabulary.retained.instanceColors.add(object.instanceColor);
        }
        if (retainForMorphTexture) {
          descriptorVocabulary.retained.morphTextures.add(object.morphTexture);
        }
      }
    });
    if (scene.environment?.isTexture) {
      textures.add(scene.environment);
      frustumTextures?.add(scene.environment);
      descriptorVocabulary?.observed.textures.add(scene.environment);
      descriptorVocabulary?.retained.textures.add(scene.environment);
    }
    if (scene.background?.isTexture) {
      textures.add(scene.background);
      frustumTextures?.add(scene.background);
      descriptorVocabulary?.observed.textures.add(scene.background);
      descriptorVocabulary?.retained.textures.add(scene.background);
    }
    if (descriptorVocabulary) {
      for (const key of sourceProgramKeys) {
        if (!retainedProgramKeys.has(key)) {
          throw new Error('Prewarm descriptor compaction dropped an exact renderable program key.');
        }
      }
      for (const key of Object.keys(descriptorVocabulary.observed)) {
        if (descriptorVocabulary.observed[key].size !== descriptorVocabulary.retained[key].size) {
          throw new Error(`Prewarm descriptor compaction dropped ${key} upload coverage.`);
        }
      }
      descriptorVocabulary.snapshots.push({
        sourceRenderables: sourceRenderableCount,
        retainedRenderables: renderables.length,
        sourceProgramKeys: sourceProgramKeys.size,
        retainedProgramKeys: retainedProgramKeys.size,
        materialReferences: materialReferenceCount,
        uniqueMaterials: materialTextureCache.size,
        materialTextureReferences: materialTextureReferenceCount,
      });
    }
    const snapshot = {
      renderables,
      lights,
      textures: [...textures],
      fog: scene.fog?.clone?.() ?? scene.fog ?? null,
      environment: scene.environment,
      environmentIntensity: scene.environmentIntensity,
      environmentRotation: scene.environmentRotation?.clone?.() ?? scene.environmentRotation,
      uploadResources: snapshotUploadResources ? {
        geometries: [...snapshotUploadResources.geometries],
        instanceMatrices: [...snapshotUploadResources.instanceMatrices],
        instanceColors: [...snapshotUploadResources.instanceColors],
        morphTextures: [...snapshotUploadResources.morphTextures],
      } : null,
    };
    if (frustumRenderables) {
      // This is the byte-equivalent result of a second frustum-only traversal,
      // derived from the same immutable descriptor/material snapshots. It
      // removes one complete S1 update, matrix walk and clone pass from the
      // control path while preserving the exact critical upload membership.
      snapshot.frustumSnapshot = {
        renderables: frustumRenderables,
        lights,
        textures: [...frustumTextures],
        fog: snapshot.fog,
        environment: snapshot.environment,
        environmentIntensity: snapshot.environmentIntensity,
        environmentRotation: snapshot.environmentRotation,
      };
    }
    return snapshot;
  }

  deferredMaterialProgramKey(material) {
    if (!material) return 'null';
    const textureKeys = [
      'map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap',
      'envMap', 'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap',
      'anisotropyMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
      'iridescenceMap', 'iridescenceThicknessMap', 'sheenColorMap', 'sheenRoughnessMap',
      'specularMap', 'specularColorMap', 'specularIntensityMap', 'transmissionMap',
      'thicknessMap', 'gradientMap', 'matcap',
    ];
    const textures = textureKeys.map((key) => {
      const texture = material[key];
      return texture
        ? `${key}:${texture.channel ?? 0}:${texture.mapping ?? 0}:${texture.isVideoTexture ? 1 : 0}:${texture.colorSpace ?? ''}`
        : `${key}:0`;
    });
    const defines = Object.entries(material.defines ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`);
    const customShader = material.isShaderMaterial || material.isRawShaderMaterial
      ? `${material.vertexShader ?? ''}\u0001${material.fragmentShader ?? ''}`
      : '';
    return [
      material.type,
      material.precision ?? '',
      material.glslVersion ?? '',
      material.isRawShaderMaterial ? 1 : 0,
      customShader,
      defines.join(';'),
      textures.join(';'),
      material.normalMapType ?? 0,
      material.vertexColors ? 1 : 0,
      material.transparent ? 1 : 0,
      material.blending ?? 0,
      material.alphaToCoverage ? 1 : 0,
      material.alphaTest > 0 ? 1 : 0,
      material.alphaHash ? 1 : 0,
      material.flatShading ? 1 : 0,
      material.sizeAttenuation ? 1 : 0,
      material.fog ? 1 : 0,
      material.dithering ? 1 : 0,
      material.premultipliedAlpha ? 1 : 0,
      material.side ?? 0,
      material.depthPacking ?? 0,
      material.toneMapped ? 1 : 0,
      material.anisotropy > 0 ? 1 : 0,
      material.clearcoat > 0 ? 1 : 0,
      material.dispersion > 0 ? 1 : 0,
      material.iridescence > 0 ? 1 : 0,
      material.sheen > 0 ? 1 : 0,
      material.transmission > 0 ? 1 : 0,
      material.combine ?? 0,
      material.index0AttributeName ?? '',
      material.extensions?.clipCullDistance ? 1 : 0,
      material.extensions?.multiDraw ? 1 : 0,
      material.customProgramCacheKey?.() ?? '',
    ].join('|');
  }

  deferredRenderableProgramKey(source, materialProgramKeys = null) {
    const geometry = source.geometry;
    const attributes = geometry?.attributes ?? {};
    const morph = geometry?.morphAttributes ?? {};
    const materials = Array.isArray(source.material) ? source.material : [source.material];
    return [
      source.kind,
      source.skinning ? 1 : 0,
      source.castShadow ? 1 : 0,
      source.receiveShadow ? 1 : 0,
      source.instanceColor ? 1 : 0,
      source.morphTexture ? 1 : 0,
      attributes.tangent ? 1 : 0,
      attributes.color?.itemSize ?? 0,
      attributes.uv ? 1 : 0,
      attributes.uv1 ? 1 : 0,
      attributes.uv2 ? 1 : 0,
      attributes.uv3 ? 1 : 0,
      morph.position?.length ?? 0,
      morph.normal?.length ?? 0,
      morph.color?.length ?? 0,
      materials.map((material) => {
        if (!materialProgramKeys || !material) return this.deferredMaterialProgramKey(material);
        if (!materialProgramKeys.has(material)) {
          materialProgramKeys.set(material, this.deferredMaterialProgramKey(material));
        }
        return materialProgramKeys.get(material);
      }).join('\u0002'),
    ].join(':');
  }

  deferredSceneProgramKey(snapshot) {
    const lightCounts = new Map();
    const shadowCounts = new Map();
    for (const light of snapshot.lights) {
      const type = light.type ?? 'Light';
      lightCounts.set(type, (lightCounts.get(type) ?? 0) + 1);
      if (light.castShadow) shadowCounts.set(type, (shadowCounts.get(type) ?? 0) + 1);
    }
    const encodeCounts = (counts) => [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, count]) => `${type}:${count}`)
      .join(',');
    const fog = snapshot.fog?.isFogExp2 ? 'exp2' : snapshot.fog?.isFog ? 'linear' : 'none';
    const environment = snapshot.environment;
    return [
      fog,
      environment?.isTexture ? 1 : 0,
      environment?.mapping ?? 0,
      environment?.colorSpace ?? '',
      encodeCounts(lightCounts),
      encodeCounts(shadowCounts),
      this.renderer.shadowMap.enabled ? 1 : 0,
      this.renderer.shadowMap.type ?? 0,
      this.renderer.toneMapping ?? 0,
      this.renderer.outputColorSpace ?? '',
    ].join('|');
  }

  selectDeferredProgramCandidates(renderables) {
    const programKeys = new Set();
    const materialProgramKeys = new Map();
    return renderables.filter((source) => {
      const key = source.prewarmProgramKey
        ?? this.deferredRenderableProgramKey(source, materialProgramKeys);
      if (programKeys.has(key)) return false;
      programKeys.add(key);
      return true;
    });
  }

  makeDeferredRenderable(source) {
    // A zero-count live InstancedMesh still owns a real program, geometry and
    // instance buffer. Prime one degenerate slot in the detached prewarm clone
    // so driver submission cannot skip that resource family; the live count and
    // visible scene remain untouched.
    const prewarmInstanceCount = source.kind === 'instancedMesh'
      ? Math.max(1, source.count)
      : null;
    if (source.kind === 'instancedMesh' && source.count === 0) {
      this.prewarmZeroCountInstancePrimes += 1;
    }
    const clone = source.kind === 'instancedMesh'
      ? new THREE.InstancedMesh(source.geometry, source.material, prewarmInstanceCount)
      : source.kind === 'points'
        ? new THREE.Points(source.geometry, source.material)
        : source.kind === 'lineSegments'
          ? new THREE.LineSegments(source.geometry, source.material)
          : source.kind === 'line'
            ? new THREE.Line(source.geometry, source.material)
            : source.kind === 'sprite'
              ? new THREE.Sprite(source.material)
              : new THREE.Mesh(source.geometry, source.material);
    if (source.kind === 'instancedMesh') {
      clone.instanceMatrix = source.instanceMatrix;
      clone.instanceColor = source.instanceColor;
      clone.morphTexture = source.morphTexture;
    }
    clone.matrixAutoUpdate = false;
    clone.matrix.copy(source.matrixWorld);
    clone.matrixWorld.copy(source.matrixWorld);
    clone.renderOrder = source.renderOrder;
    clone.castShadow = source.castShadow;
    clone.receiveShadow = source.receiveShadow;
    clone.layers.mask = source.layers;
    clone.frustumCulled = false;
    this.prewarmObjectRetainers.push(clone);
    return clone;
  }

  markDeferredRenderableUploaded(source) {
    if (source.geometry) this.deferredGeometryUploads.add(source.geometry);
    if (source.kind === 'instancedMesh') {
      if (source.instanceMatrix) this.deferredInstanceUploads.add(source.instanceMatrix);
      if (source.instanceColor) this.deferredInstanceUploads.add(source.instanceColor);
      if (source.morphTexture?.isTexture) this.deferredTextureUploads.add(source.morphTexture);
    }
  }

  deferredRenderableNeedsUpload(source) {
    if (source.geometry && !this.deferredGeometryUploads.has(source.geometry)) return true;
    if (source.kind !== 'instancedMesh') return false;
    if (source.instanceMatrix && !this.deferredInstanceUploads.has(source.instanceMatrix)) return true;
    if (source.instanceColor && !this.deferredInstanceUploads.has(source.instanceColor)) return true;
    return Boolean(source.morphTexture?.isTexture && !this.deferredTextureUploads.has(source.morphTexture));
  }

  selectDeferredUploadRenderables(renderables) {
    // A snapshot often contains dozens of meshes that share one immutable
    // geometry. Rendering every owner does not upload anything new, but it
    // does repeat draw submission and can accidentally stack that work with a
    // late driver program. Select the smallest exact cover of cold GPU
    // resources: one owner per geometry / instance buffer / morph texture.
    // This changes no live object, material, matrix, topology or buffer data.
    const queuedGeometries = new Set();
    const queuedInstances = new Set();
    const queuedTextures = new Set();
    const selected = [];
    for (const source of renderables) {
      let needed = false;
      if (
        source.geometry
        && !this.deferredGeometryUploads.has(source.geometry)
        && !queuedGeometries.has(source.geometry)
      ) {
        needed = true;
      }
      if (source.kind === 'instancedMesh') {
        for (const attribute of [source.instanceMatrix, source.instanceColor]) {
          if (
            attribute
            && !this.deferredInstanceUploads.has(attribute)
            && !queuedInstances.has(attribute)
          ) {
            needed = true;
          }
        }
        if (
          source.morphTexture?.isTexture
          && !this.deferredTextureUploads.has(source.morphTexture)
          && !queuedTextures.has(source.morphTexture)
        ) {
          needed = true;
        }
      }
      if (!needed) continue;
      selected.push(source);
      if (source.geometry && !this.deferredGeometryUploads.has(source.geometry)) {
        queuedGeometries.add(source.geometry);
      }
      if (source.kind === 'instancedMesh') {
        for (const attribute of [source.instanceMatrix, source.instanceColor]) {
          if (attribute && !this.deferredInstanceUploads.has(attribute)) queuedInstances.add(attribute);
        }
        if (source.morphTexture?.isTexture && !this.deferredTextureUploads.has(source.morphTexture)) {
          queuedTextures.add(source.morphTexture);
        }
      }
    }
    return selected;
  }

  selectDeferredUploadWork(snapshot) {
    return {
      renderables: this.selectDeferredUploadRenderables(snapshot.renderables),
      textures: snapshot.textures.filter((texture) => !this.deferredTextureUploads.has(texture)),
    };
  }

  primeDeferredShadowProgramBeforeControl(
    snapshot,
    camera,
    { ownerName = 'sealed-rocket-chines', expectedMapSize = 64 } = {},
  ) {
    const totalStarted = performance.now();
    const owners = snapshot.renderables.filter((source) => (
      source.name === ownerName && source.kind === 'mesh' && source.castShadow
    ));
    if (owners.length !== 1) {
      throw new Error(`Expected one retained ${ownerName} shadow owner; found ${owners.length}.`);
    }
    const source = owners[0];
    const sourceMaterials = Array.isArray(source.material) ? source.material : [source.material];
    if (sourceMaterials.length !== 1 || !sourceMaterials[0]) {
      throw new Error(`${ownerName} shadow prime requires one authored material.`);
    }
    const material = sourceMaterials[0];
    const shadowLightSources = snapshot.lights.filter((light) => light.castShadow && light.shadow);
    const directionalShadowSources = shadowLightSources.filter((light) => light.isDirectionalLight);
    const effectiveShadowSide = material.shadowSide !== null
      ? material.shadowSide
      : ({
        [THREE.FrontSide]: THREE.BackSide,
        [THREE.BackSide]: THREE.FrontSide,
        [THREE.DoubleSide]: THREE.DoubleSide,
      })[material.side];
    const owner = {
      name: source.name,
      kind: source.kind,
      castShadow: source.castShadow,
      receiveShadow: source.receiveShadow,
      geometry: source.geometry?.type ?? null,
      material: material.type,
      materialSide: material.side,
      shadowSide: material.shadowSide,
      effectiveShadowSide,
      depthPacking: THREE.RGBADepthPacking,
    };
    if (!this.renderer.shadowMap.enabled || directionalShadowSources.length === 0) {
      return {
        status: 'skipped-shadows-disabled',
        owner,
        renderMs: 0,
        totalMs: Number((performance.now() - totalStarted).toFixed(3)),
        programsBefore: this.renderer.info.programs.length,
        programsAfter: this.renderer.info.programs.length,
        programDelta: 0,
        newPrograms: [],
        restoration: { passed: true, checks: {} },
      };
    }
    if (directionalShadowSources.length !== 1) {
      throw new Error(`Expected one retained directional shadow light; found ${directionalShadowSources.length}.`);
    }
    const shadowLightSource = directionalShadowSources[0];
    if (
      shadowLightSource.shadow.mapSize.x !== expectedMapSize
      || shadowLightSource.shadow.mapSize.y !== expectedMapSize
    ) {
      throw new Error(
        `${ownerName} shadow prime expected a ${expectedMapSize}px staging map; got `
        + `${shadowLightSource.shadow.mapSize.x}x${shadowLightSource.shadow.mapSize.y}.`,
      );
    }
    if (
      !source.geometry
      || typeof source.geometry.addEventListener !== 'function'
      || typeof source.geometry.removeEventListener !== 'function'
    ) {
      throw new Error(`${ownerName} shadow prime requires auditable shared geometry ownership.`);
    }
    if (
      typeof material.addEventListener !== 'function'
      || typeof material.removeEventListener !== 'function'
    ) {
      throw new Error(`${ownerName} shadow prime requires auditable shared material ownership.`);
    }

    const renderer = this.renderer;
    const shadowMap = renderer.shadowMap;
    const liveSunShadow = this.sunLight.shadow;
    const previous = {
      renderTarget: renderer.getRenderTarget(),
      activeCubeFace: renderer.getActiveCubeFace(),
      activeMipmapLevel: renderer.getActiveMipmapLevel(),
      viewport: renderer.getViewport(new THREE.Vector4()),
      scissor: renderer.getScissor(new THREE.Vector4()),
      scissorTest: renderer.getScissorTest(),
      clearColor: renderer.getClearColor(new THREE.Color()).clone(),
      clearAlpha: renderer.getClearAlpha(),
      shadowEnabled: shadowMap.enabled,
      shadowAutoUpdate: shadowMap.autoUpdate,
      shadowNeedsUpdate: shadowMap.needsUpdate,
      shadowType: shadowMap.type,
      liveSunMap: liveSunShadow.map,
      liveSunMapPass: liveSunShadow.mapPass,
      liveSunMapSize: liveSunShadow.mapSize.clone(),
      liveSunAutoUpdate: liveSunShadow.autoUpdate,
      liveSunNeedsUpdate: liveSunShadow.needsUpdate,
    };
    const faultMode = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('qa-rocket-shadow-prime-fault')
      : null;
    const injectAfterDoubleSidedDepthSubmit = faultMode === 'after-double-sided-depth-submit';
    const programsBefore = renderer.info.programs.length;
    const programKeysBefore = new Set(renderer.info.programs.map((program) => program.cacheKey));
    const originalRenderBufferDirect = renderer.renderBufferDirect;
    const submissions = [];
    const primeLights = [];
    const detachedShadowDisposeEvents = new Set();
    const cleanupFailures = [];
    const onSharedGeometryDispose = () => { sharedGeometryDisposeEvents += 1; };
    const onSharedMaterialDispose = () => { sharedMaterialDisposeEvents += 1; };
    const attemptCleanup = (name, action) => {
      try {
        action();
      } catch (error) {
        cleanupFailures.push({
          name,
          message: error?.message ?? String(error),
        });
      }
    };
    let gl = null;
    const shaderDefines = (shader) => {
      try {
        return (gl?.getShaderSource(shader)?.match(/^#define\s+[^\n]+/gm) ?? []).sort();
      } catch {
        return [];
      }
    };
    const describeProgram = (program) => ({
      id: program.id,
      name: program.name,
      type: program.type,
      cacheKey: program.cacheKey,
      vertexDefines: shaderDefines(program.vertexShader),
      fragmentDefines: shaderDefines(program.fragmentShader),
    });
    let primeTargetDisposed = false;
    let sharedGeometryDisposeEvents = 0;
    let sharedMaterialDisposeEvents = 0;
    let sharedGeometryListenerAttached = false;
    let sharedMaterialListenerAttached = false;
    let sharedDisposeListenersRemoved = false;
    let primeScene = null;
    let primeCamera = null;
    let primeShadowLight = null;
    let primeObject = null;
    let generatedDepthMaterial = null;
    let generatedDepthMaterialVersionBefore = null;
    let generatedDepthMaterialVersionAtPrime = null;
    let generatedDepthMaterialVersionRearmed = null;
    let generatedDepthMaterialSideBefore = null;
    let generatedDepthPackingBefore = null;
    let generatedDepthMaterialRearmedBeforeHookRestore = null;
    let programsAfter = programsBefore;
    let newPrograms = [];
    let renderMs = 0;
    let totalMs = 0;
    let lightSetupProgramDelta = 0;
    let primeShadowMapAllocated = null;
    let detachedShadowTargetsDisposed = false;
    let detachedShadowMapsCleared = false;
    let faultInjected = false;
    let pendingError = null;
    const primeTarget = new THREE.WebGLRenderTarget(32, 18, {
      depthBuffer: true,
      stencilBuffer: false,
    });
    try {
      // From the first statement after target allocation onward, every setup
      // step is inside this cleanup boundary. A clone/listener/mesh failure can
      // therefore neither retain detached resources nor poison renderer state.
      primeTarget.addEventListener('dispose', () => { primeTargetDisposed = true; });
      source.geometry.addEventListener('dispose', onSharedGeometryDispose);
      sharedGeometryListenerAttached = true;
      material.addEventListener('dispose', onSharedMaterialDispose);
      sharedMaterialListenerAttached = true;
      if (this.composer?.readBuffer?.texture) {
        primeTarget.texture.colorSpace = this.composer.readBuffer.texture.colorSpace;
      }
      primeScene = new THREE.Scene();
      primeScene.fog = snapshot.fog;
      primeScene.environment = snapshot.environment;
      primeScene.environmentIntensity = snapshot.environmentIntensity;
      if (snapshot.environmentRotation && primeScene.environmentRotation) {
        primeScene.environmentRotation.copy(snapshot.environmentRotation);
      }
      primeCamera = camera.clone();
      primeCamera.matrixAutoUpdate = false;
      primeCamera.matrix.copy(camera.matrixWorld);
      primeCamera.matrixWorld.copy(camera.matrixWorld);
      for (const lightSource of snapshot.lights) {
        const light = lightSource.clone(false);
        // Push immediately so a later failure while configuring this clone is
        // still covered by detached-resource cleanup.
        primeLights.push(light);
        light.matrixAutoUpdate = false;
        light.matrix.copy(lightSource.matrixWorld);
        light.matrixWorld.copy(lightSource.matrixWorld);
        if (light.target && lightSource.target) {
          light.target.matrixAutoUpdate = false;
          light.target.matrix.copy(lightSource.target.matrixWorld);
          light.target.matrixWorld.copy(lightSource.target.matrixWorld);
        }
        if (light.shadow && lightSource.shadow) {
          light.shadow.map = null;
          light.shadow.mapPass = null;
          light.shadow.mapSize.copy(lightSource.shadow.mapSize);
          light.shadow.bias = lightSource.shadow.bias;
          light.shadow.normalBias = lightSource.shadow.normalBias;
          light.shadow.radius = lightSource.shadow.radius;
          light.shadow.blurSamples = lightSource.shadow.blurSamples;
          light.shadow.autoUpdate = lightSource.shadow.autoUpdate;
          light.shadow.needsUpdate = lightSource.shadow.needsUpdate;
        }
        primeScene.add(light);
        if (light.target) primeScene.add(light.target);
      }
      primeShadowLight = primeLights.find((light) => light.isDirectionalLight && light.castShadow);
      if (!primeShadowLight) throw new Error(`${ownerName} shadow prime lost its directional light clone.`);
      primeObject = new THREE.Mesh(source.geometry, source.material);
      primeObject.name = source.name;
      primeObject.matrixAutoUpdate = false;
      primeObject.matrix.copy(source.matrixWorld);
      primeObject.matrixWorld.copy(source.matrixWorld);
      primeObject.renderOrder = source.renderOrder;
      primeObject.castShadow = source.castShadow;
      primeObject.receiveShadow = source.receiveShadow;
      primeObject.layers.mask = source.layers;
      // This detached representative exists solely to submit the exact family;
      // shadow-camera placement must not accidentally cull the diagnostic prime.
      primeObject.frustumCulled = false;
      primeObject.onBeforeShadow = (
        renderRenderer,
        object,
        renderCamera,
        shadowCamera,
        geometry,
        depthMaterial,
      ) => {
        // WebGLShadowMap assigns its shared generated material's side immediately
        // before this callback, but r165's fast program path does not treat that
        // side mutation alone as invalidation. Force one exact cache selection for
        // the detached owner; the authored wing material remains untouched.
        generatedDepthMaterial = depthMaterial;
        generatedDepthMaterialVersionBefore = depthMaterial.version;
        generatedDepthMaterialSideBefore = depthMaterial.side;
        generatedDepthPackingBefore = depthMaterial.depthPacking;
        depthMaterial.needsUpdate = true;
        generatedDepthMaterialVersionAtPrime = depthMaterial.version;
      };
      primeScene.add(primeObject);
      primeScene.updateMatrixWorld(true);
      primeCamera.updateMatrixWorld(true);
      gl = renderer.getContext();
      renderer.renderBufferDirect = function renderDeferredShadowPrime(
        renderCamera,
        renderScene,
        geometry,
        renderMaterial,
        object,
        group,
      ) {
        const result = originalRenderBufferDirect.call(
          this,
          renderCamera,
          renderScene,
          geometry,
          renderMaterial,
          object,
          group,
        );
        if (object === primeObject) {
          const program = renderer.properties.get(renderMaterial)?.currentProgram ?? null;
          const pass = renderCamera === primeShadowLight.shadow.camera ? 'shadow' : 'main';
          submissions.push({
            pass,
            cameraType: renderCamera?.type ?? null,
            material: renderMaterial?.type ?? null,
            side: renderMaterial?.side ?? null,
            depthPacking: renderMaterial?.depthPacking ?? null,
            program: program ? describeProgram(program) : null,
          });
          if (
            injectAfterDoubleSidedDepthSubmit
            && !faultInjected
            && pass === 'shadow'
            && renderMaterial?.isMeshDepthMaterial
            && renderMaterial.side === THREE.DoubleSide
          ) {
            // Query-only fault point: originalRenderBufferDirect has already
            // selected and submitted the exact DoubleSide depth program. Throw
            // here to exercise cleanup/rearm without changing normal topology.
            faultInjected = true;
            const fault = new Error('Injected rocket shadow-prime failure after DoubleSide depth submission.');
            fault.code = 'NINEFOLD_QA_ROCKET_SHADOW_PRIME_AFTER_DEPTH_SUBMIT';
            throw fault;
          }
        }
        return result;
      };
      renderer.setRenderTarget(primeTarget);
      // WebGLRenderer.render() invokes WebGLShadowMap before setupLights(). A
      // brand-new detached Scene would therefore expose zero cached light
      // counts to its first depth program, unlike the already-rendered live
      // race scene. compile() performs that exact light setup without running a
      // shadow pass; the following single real render then sees the same 2/3/1
      // cached light vocabulary as live reentry.
      const lightSetupProgramsBefore = renderer.info.programs.length;
      renderer.compile(primeScene, primeCamera);
      lightSetupProgramDelta = renderer.info.programs.length - lightSetupProgramsBefore;
      shadowMap.enabled = true;
      shadowMap.autoUpdate = true;
      shadowMap.needsUpdate = true;
      primeShadowLight.shadow.autoUpdate = true;
      primeShadowLight.shadow.needsUpdate = true;
      renderer.setScissorTest(false);
      const renderStarted = performance.now();
      try {
        renderer.render(primeScene, primeCamera);
      } finally {
        renderMs = performance.now() - renderStarted;
      }
    } catch (error) {
      pendingError = error;
    } finally {
      primeShadowMapAllocated = primeShadowLight?.shadow?.map
        ? [primeShadowLight.shadow.map.width, primeShadowLight.shadow.map.height]
        : null;
      // Leave Three's shared generated depth material explicitly invalidated on
      // both success and failure. This must happen after onBeforeShadow captured
      // it and before the temporary renderBufferDirect hook is restored.
      attemptCleanup('generated-depth-material-rearm', () => {
        if (generatedDepthMaterial) {
          generatedDepthMaterial.needsUpdate = true;
          generatedDepthMaterialVersionRearmed = generatedDepthMaterial.version;
          generatedDepthMaterialRearmedBeforeHookRestore = (
            renderer.renderBufferDirect !== originalRenderBufferDirect
          );
        }
      });
      renderer.renderBufferDirect = originalRenderBufferDirect;
      attemptCleanup('render-target-restore', () => renderer.setRenderTarget(
        previous.renderTarget,
        previous.activeCubeFace,
        previous.activeMipmapLevel,
      ));
      attemptCleanup('shadow-state-restore', () => {
        shadowMap.enabled = previous.shadowEnabled;
        shadowMap.autoUpdate = previous.shadowAutoUpdate;
        shadowMap.needsUpdate = previous.shadowNeedsUpdate;
        shadowMap.type = previous.shadowType;
      });
      attemptCleanup('viewport-restore', () => renderer.setViewport(previous.viewport));
      attemptCleanup('scissor-restore', () => renderer.setScissor(previous.scissor));
      attemptCleanup('scissor-test-restore', () => renderer.setScissorTest(previous.scissorTest));
      attemptCleanup('clear-state-restore', () => (
        renderer.setClearColor(previous.clearColor, previous.clearAlpha)
      ));

      const detachedShadowTargets = [...new Set(primeLights.flatMap((light) => (
        [light.shadow?.map, light.shadow?.mapPass].filter(Boolean)
      )))];
      for (const target of detachedShadowTargets) {
        attemptCleanup('detached-shadow-dispose-listener', () => (
          target.addEventListener('dispose', () => detachedShadowDisposeEvents.add(target))
        ));
      }
      attemptCleanup('detached-scene-clear', () => primeScene?.clear());
      for (const light of primeLights) {
        attemptCleanup('detached-light-dispose', () => light.dispose?.());
        attemptCleanup('detached-shadow-map-clear', () => {
          if (light.shadow) {
            light.shadow.map = null;
            light.shadow.mapPass = null;
          }
        });
      }
      detachedShadowTargetsDisposed = detachedShadowTargets
        .every((target) => detachedShadowDisposeEvents.has(target));
      detachedShadowMapsCleared = primeLights.every((light) => (
        !light.shadow || (light.shadow.map === null && light.shadow.mapPass === null)
      ));
      attemptCleanup('detached-prime-target-dispose', () => primeTarget.dispose());
      attemptCleanup('shared-geometry-listener-remove', () => {
        if (sharedGeometryListenerAttached) {
          source.geometry.removeEventListener('dispose', onSharedGeometryDispose);
          sharedGeometryListenerAttached = false;
        }
      });
      attemptCleanup('shared-material-listener-remove', () => {
        if (sharedMaterialListenerAttached) {
          material.removeEventListener('dispose', onSharedMaterialDispose);
          sharedMaterialListenerAttached = false;
        }
      });
      sharedDisposeListenersRemoved = !sharedGeometryListenerAttached && !sharedMaterialListenerAttached;
      totalMs = performance.now() - totalStarted;
    }

    programsAfter = renderer.info.programs.length;
    newPrograms = renderer.info.programs
      .filter((program) => !programKeysBefore.has(program.cacheKey))
      .map(describeProgram)
      .sort((a, b) => a.cacheKey.localeCompare(b.cacheKey));

    const restorationChecks = {
      renderTarget: renderer.getRenderTarget() === previous.renderTarget,
      activeCubeFace: renderer.getActiveCubeFace() === previous.activeCubeFace,
      activeMipmapLevel: renderer.getActiveMipmapLevel() === previous.activeMipmapLevel,
      viewport: renderer.getViewport(new THREE.Vector4()).equals(previous.viewport),
      scissor: renderer.getScissor(new THREE.Vector4()).equals(previous.scissor),
      scissorTest: renderer.getScissorTest() === previous.scissorTest,
      clearColor: renderer.getClearColor(new THREE.Color()).equals(previous.clearColor),
      clearAlpha: renderer.getClearAlpha() === previous.clearAlpha,
      shadowEnabled: shadowMap.enabled === previous.shadowEnabled,
      shadowAutoUpdate: shadowMap.autoUpdate === previous.shadowAutoUpdate,
      shadowNeedsUpdate: shadowMap.needsUpdate === previous.shadowNeedsUpdate,
      shadowType: shadowMap.type === previous.shadowType,
      liveSunMap: liveSunShadow.map === previous.liveSunMap,
      liveSunMapPass: liveSunShadow.mapPass === previous.liveSunMapPass,
      liveSunMapSize: liveSunShadow.mapSize.equals(previous.liveSunMapSize),
      liveSunAutoUpdate: liveSunShadow.autoUpdate === previous.liveSunAutoUpdate,
      liveSunNeedsUpdate: liveSunShadow.needsUpdate === previous.liveSunNeedsUpdate,
      renderBufferDirect: renderer.renderBufferDirect === originalRenderBufferDirect,
      detachedPrimeTargetDisposed: primeTargetDisposed,
      detachedShadowTargetsDisposed,
      detachedShadowMapsCleared,
      detachedSceneCleared: !primeScene || primeScene.children.length === 0,
      sharedGeometryPreserved: !primeObject || primeObject.geometry === source.geometry,
      sharedMaterialPreserved: !primeObject || primeObject.material === source.material,
      sharedGeometryNotDisposed: sharedGeometryDisposeEvents === 0,
      sharedMaterialNotDisposed: sharedMaterialDisposeEvents === 0,
      sharedDisposeListenersRemoved,
      generatedDepthMaterialRearmed: !generatedDepthMaterial || (
        generatedDepthMaterialVersionRearmed === generatedDepthMaterialVersionAtPrime + 1
      ),
      generatedDepthMaterialRearmedBeforeHookRestore: !generatedDepthMaterial
        || generatedDepthMaterialRearmedBeforeHookRestore === true,
      cleanupFailures: cleanupFailures.length === 0,
    };
    const restorationPassed = Object.values(restorationChecks).every(Boolean);
    if (!restorationPassed) {
      const failed = Object.entries(restorationChecks)
        .filter(([, passed]) => !passed)
        .map(([name]) => name)
        .join(', ');
      const cleanupDetail = cleanupFailures.length > 0
        ? ` Cleanup failures: ${cleanupFailures
          .map((failure) => `${failure.name}: ${failure.message}`)
          .join('; ')}.`
        : '';
      const restorationError = new Error(
        `${ownerName} shadow prime failed to restore/dispose: ${failed}.${cleanupDetail}`,
      );
      if (pendingError) {
        throw new AggregateError(
          [pendingError, restorationError],
          `${ownerName} shadow prime and its cleanup both failed.`,
        );
      }
      throw restorationError;
    }
    const expectedInjectedFailure = faultInjected
      && pendingError?.code === 'NINEFOLD_QA_ROCKET_SHADOW_PRIME_AFTER_DEPTH_SUBMIT';
    if (pendingError && !expectedInjectedFailure) throw pendingError;
    return {
      status: expectedInjectedFailure ? 'fault-injected' : 'complete',
      owner,
      light: {
        type: shadowLightSource.type,
        castShadow: shadowLightSource.castShadow,
        mapSize: shadowLightSource.shadow.mapSize.toArray(),
        allocatedMapSize: primeShadowMapAllocated,
        cameraType: shadowLightSource.shadow.camera.type,
      },
      targetSize: [primeTarget.width, primeTarget.height],
      renderMs: Number(renderMs.toFixed(3)),
      totalMs: Number(totalMs.toFixed(3)),
      lightSetupProgramDelta,
      programsBefore,
      programsAfter,
      programDelta: programsAfter - programsBefore,
      newPrograms,
      submissions,
      generatedDepthMaterial: {
        captured: Boolean(generatedDepthMaterial),
        versionBefore: generatedDepthMaterialVersionBefore,
        versionAtPrime: generatedDepthMaterialVersionAtPrime,
        versionRearmed: generatedDepthMaterialVersionRearmed,
        rearmedBeforeRenderBufferDirectRestore: generatedDepthMaterialRearmedBeforeHookRestore,
        sideBeforeInvalidation: generatedDepthMaterialSideBefore,
        depthPackingBeforeInvalidation: generatedDepthPackingBefore,
      },
      sharedResourceDisposal: {
        geometryDisposeEvents: sharedGeometryDisposeEvents,
        materialDisposeEvents: sharedMaterialDisposeEvents,
        listenersRemoved: sharedDisposeListenersRemoved,
      },
      faultInjection: {
        mode: faultMode,
        requested: injectAfterDoubleSidedDepthSubmit,
        triggered: faultInjected,
        failure: expectedInjectedFailure ? {
          name: pendingError.name,
          message: pendingError.message,
          code: pendingError.code,
        } : null,
      },
      cleanupFailures,
      restoration: {
        passed: restorationPassed,
        checks: restorationChecks,
      },
    };
  }

  uploadCriticalDeferredScene(snapshot, camera, preselectedWork = null) {
    const { renderables, textures } = preselectedWork ?? this.selectDeferredUploadWork(snapshot);
    const textureStarted = performance.now();
    for (const texture of textures) {
      this.renderer.initTexture(texture);
      this.deferredTextureUploads.add(texture);
    }
    const textureMs = performance.now() - textureStarted;
    if (renderables.length === 0) {
      return {
        renderables: 0,
        textures: 0,
        textureMs: Number(textureMs.toFixed(3)),
        renderMs: 0,
        totalMs: Number(textureMs.toFixed(3)),
        programDelta: 0,
        skippedEmpty: textures.length === 0,
        skippedTextureOnlyDraw: textures.length > 0,
      };
    }
    const target = new THREE.WebGLRenderTarget(32, 18, { depthBuffer: true, stencilBuffer: false });
    if (this.composer?.readBuffer?.texture) target.texture.colorSpace = this.composer.readBuffer.texture.colorSpace;
    const uploadScene = new THREE.Scene();
    uploadScene.fog = snapshot.fog;
    uploadScene.environment = snapshot.environment;
    uploadScene.environmentIntensity = snapshot.environmentIntensity;
    if (snapshot.environmentRotation && uploadScene.environmentRotation) {
      uploadScene.environmentRotation.copy(snapshot.environmentRotation);
    }
    for (const light of snapshot.lights) {
      uploadScene.add(light);
      if (light.target) uploadScene.add(light.target);
    }
    for (const source of renderables) uploadScene.add(this.makeDeferredRenderable(source));
    const programsBefore = this.renderer.info.programs.length;
    const renderStarted = performance.now();
    const previousTarget = this.renderer.getRenderTarget();
    const previousScissorTest = this.renderer.getScissorTest();
    const previousScissor = this.renderer.getScissor(new THREE.Vector4());
    const previousViewport = this.renderer.getViewport(new THREE.Vector4());
    const previousShadowAutoUpdate = this.renderer.shadowMap.autoUpdate;
    const previousShadowNeedsUpdate = this.renderer.shadowMap.needsUpdate;
    try {
      this.renderer.setRenderTarget(target);
      // These snapshots exist to make exact buffers/textures resident, not to
      // produce pixels. Every detached renderable is explicitly non-culled,
      // so the main pass submits every selected resource. Preserve the live
      // shadow-enabled shader key while preventing an unrelated shadow-atlas
      // clear/rebuild from disabling scissor and dominating this discarded
      // target.
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = false;
      this.renderer.setScissorTest(true);
      this.renderer.setScissor(0, 0, 1, 1);
      this.renderer.render(uploadScene, camera);
    } finally {
      this.renderer.setRenderTarget(previousTarget);
      this.renderer.shadowMap.autoUpdate = previousShadowAutoUpdate;
      this.renderer.shadowMap.needsUpdate = previousShadowNeedsUpdate;
      this.renderer.setViewport(previousViewport);
      this.renderer.setScissor(previousScissor);
      this.renderer.setScissorTest(previousScissorTest);
    }
    const renderMs = performance.now() - renderStarted;
    for (const source of renderables) this.markDeferredRenderableUploaded(source);
    uploadScene.clear();
    target.dispose();
    return {
      renderables: renderables.length,
      textures: textures.length,
      textureMs: Number(textureMs.toFixed(3)),
      renderMs: Number(renderMs.toFixed(3)),
      totalMs: Number((textureMs + renderMs).toFixed(3)),
      programDelta: this.renderer.info.programs.length - programsBefore,
    };
  }

  async uploadDeferredStagesBeforeControl(stages) {
    const started = performance.now();
    const reports = [];
    let maxSliceMs = 0;
    let renderables = 0;
    let textures = 0;
    let programDelta = 0;
    for (const stage of stages) {
      // Keep every authored stage in its own task. The measured remaining
      // first-loop vocabulary is tiny once opening/S1 critical resources are
      // resident, but task separation prevents those exact uploads from ever
      // re-forming a calibration megatask.
      const work = this.selectDeferredUploadWork(stage.prewarmSnapshot);
      // No task boundary or offscreen target is needed when earlier exact
      // stages already made every resource resident. The preselection is
      // read-only and the pre-control uploader is sequential, so it remains
      // the exact resource set consumed after a non-empty yield.
      if (work.renderables.length || work.textures.length) await this.waitWarmTask();
      const sliceStarted = performance.now();
      const upload = this.uploadCriticalDeferredScene(stage.prewarmSnapshot, stage.prewarmCamera, work);
      const sliceMs = performance.now() - sliceStarted;
      maxSliceMs = Math.max(maxSliceMs, sliceMs);
      renderables += upload.renderables;
      textures += upload.textures;
      programDelta += upload.programDelta;
      reports.push({
        name: stage.name,
        deferred: false,
        precontrol: true,
        startedAt: Number(sliceStarted.toFixed(3)),
        endedAt: Number(performance.now().toFixed(3)),
        compileIssueMs: 0,
        compileMs: 0,
        renderMs: upload.renderMs,
        totalMs: Number(sliceMs.toFixed(3)),
        programWarm: {
          candidates: this.selectDeferredProgramCandidates(stage.prewarmSnapshot.renderables).length,
          issueMs: 0,
          totalMs: 0,
          programsBefore: this.renderer.info.programs.length,
          programsAfter: this.renderer.info.programs.length,
          programDelta: 0,
          critical: true,
        },
        upload: {
          renderables: stage.prewarmSnapshot.renderables.length,
          coldRenderables: upload.renderables,
          textures: upload.textures,
          batches: upload.renderables ? 1 : 0,
          maxTextureUploadMs: upload.textureMs,
          maxBatchRenderMs: upload.renderMs,
          programsBefore: this.renderer.info.programs.length - upload.programDelta,
          programsAfter: this.renderer.info.programs.length,
          programDelta: upload.programDelta,
          uploadSamples: [],
          batchSamples: upload.renderables ? [upload.renderMs] : [],
          batchDetails: [],
          compileSamples: [],
          skippedEmpty: Boolean(upload.skippedEmpty),
          skippedTextureOnlyDraw: Boolean(upload.skippedTextureOnlyDraw),
        },
      });
      for (const light of stage.prewarmSnapshot.lights) light.dispose?.();
    }
    if (programDelta !== 0) {
      throw new Error(`Pre-control resource upload discovered ${programDelta} uncompiled program(s).`);
    }
    return {
      status: 'complete',
      totalMs: Number((performance.now() - started).toFixed(3)),
      maxSliceMs: Number(maxSliceMs.toFixed(3)),
      renderables,
      textures,
      programDelta,
      reports,
    };
  }

  async uploadDeferredScene(snapshot, camera, { batchSize = 2 } = {}) {
    const renderables = this.selectDeferredUploadRenderables(snapshot.renderables);
    const textures = snapshot.textures.filter((texture) => !this.deferredTextureUploads.has(texture));
    const uploadSamples = [];
    for (const texture of textures) {
      const { ms } = await this.runPrewarmSlice('texture', () => this.renderer.initTexture(texture));
      this.deferredTextureUploads.add(texture);
      uploadSamples.push({
        ms,
        name: texture.name || null,
        source: texture.image?.currentSrc || texture.image?.src || null,
        width: texture.image?.naturalWidth || texture.image?.videoWidth || texture.image?.width || null,
        height: texture.image?.naturalHeight || texture.image?.videoHeight || texture.image?.height || null,
      });
    }

    const target = new THREE.WebGLRenderTarget(32, 18, { depthBuffer: true, stencilBuffer: false });
    if (this.composer?.readBuffer?.texture) {
      target.texture.colorSpace = this.composer.readBuffer.texture.colorSpace;
    }
    const batchSamples = [];
    const batchDetails = [];
    const programsBefore = this.renderer.info.programs.length;
    // Every material instance in this snapshot was compiled before control.
    // Post-control work therefore transfers only cold vertex/instance buffers,
    // two renderables at a time, after a completed live frame.
    const batchScene = new THREE.Scene();
    batchScene.fog = snapshot.fog;
    batchScene.environment = snapshot.environment;
    batchScene.environmentIntensity = snapshot.environmentIntensity;
    if (snapshot.environmentRotation && batchScene.environmentRotation) {
      batchScene.environmentRotation.copy(snapshot.environmentRotation);
    }
    batchScene.background = null;
    const batchRoot = new THREE.Group();
    batchScene.add(batchRoot);
    for (const light of snapshot.lights) {
      batchScene.add(light);
      if (light.target) batchScene.add(light.target);
    }
    try {
      for (let offset = 0; offset < renderables.length; offset += batchSize) {
        const limit = Math.min(renderables.length, offset + batchSize);
        const batch = renderables.slice(offset, limit);
        const { ms, result: exactProgramCounts } = await this.runPrewarmSlice('geometry', () => {
          // Count immediately around this exact synchronous submission. The
          // previous counter was sampled before waitForPrewarmOpportunity;
          // a normal live frame could create/retire a renderer cache entry
          // during that wait and be falsely charged to this upload batch.
          const before = this.renderer.info.programs.length;
          batchRoot.clear();
          for (const source of batch) batchRoot.add(this.makeDeferredRenderable(source));
          const previousTarget = this.renderer.getRenderTarget();
          try {
            this.renderer.setRenderTarget(target);
            this.renderer.render(batchScene, camera);
          } finally {
            this.renderer.setRenderTarget(previousTarget);
          }
          return {
            before,
            after: this.renderer.info.programs.length,
          };
        });
        batchSamples.push(ms);
        batchDetails.push({
          ms: Number(ms.toFixed(3)),
          programsBefore: exactProgramCounts.before,
          programsAfter: exactProgramCounts.after,
          programDelta: exactProgramCounts.after - exactProgramCounts.before,
          sources: batch.map((source) => ({
            name: source.name,
            kind: source.kind,
            geometry: source.geometry?.type ?? null,
            vertices: source.geometry?.attributes?.position?.count ?? 0,
            indices: source.geometry?.index?.count ?? 0,
            instances: source.kind === 'instancedMesh' ? source.count : 0,
          })),
        });
        for (const source of batch) this.markDeferredRenderableUploaded(source);
      }
    } finally {
      for (const light of snapshot.lights) light.dispose?.();
      target.dispose();
    }
    const uploadDurations = uploadSamples.map((sample) => sample.ms);
    const programsAfter = this.renderer.info.programs.length;
    const exactProgramDelta = batchDetails.reduce((sum, batch) => sum + batch.programDelta, 0);
    return {
      renderables: snapshot.renderables.length,
      coldRenderables: renderables.length,
      textures: textures.length,
      batches: batchSamples.length,
      maxTextureUploadMs: Number(Math.max(0, ...uploadDurations).toFixed(3)),
      maxBatchRenderMs: Number(Math.max(0, ...batchSamples).toFixed(3)),
      maxCompileIssueMs: 0,
      maxCompileTotalMs: 0,
      compileTotalMs: 0,
      programsBefore,
      programsAfter,
      // This aggregate is intentionally the sum of exact callback-local
      // deltas, not programsAfter-programsBefore across dozens of live-frame
      // scheduling boundaries.
      programDelta: exactProgramDelta,
      uploadSamples: uploadSamples.map((sample) => ({
        ...sample,
        ms: Number(sample.ms.toFixed(3)),
      })),
      batchSamples: batchSamples.map((value) => Number(value.toFixed(3))),
      batchDetails,
      compileSamples: [],
    };
  }

  async compileDeferredScenePrograms(snapshot, camera) {
    const rawCandidates = this.selectDeferredProgramCandidates(snapshot.renderables);
    const sceneKey = this.deferredSceneProgramKey(snapshot);
    const candidates = rawCandidates
      .map((source) => ({
        source,
        key: `${sceneKey}\u0003${this.deferredRenderableProgramKey(source)}`,
      }))
      .filter(({ key }) => !this.deferredProgramWarmKeys.has(key));
    const targetScene = new THREE.Scene();
    targetScene.fog = snapshot.fog;
    targetScene.environment = snapshot.environment;
    targetScene.environmentIntensity = snapshot.environmentIntensity;
    if (snapshot.environmentRotation && targetScene.environmentRotation) {
      targetScene.environmentRotation.copy(snapshot.environmentRotation);
    }
    for (const light of snapshot.lights) {
      targetScene.add(light);
      if (light.target) targetScene.add(light.target);
    }
    const target = new THREE.WebGLRenderTarget(32, 18, { depthBuffer: true, stencilBuffer: false });
    if (this.composer?.readBuffer?.texture) target.texture.colorSpace = this.composer.readBuffer.texture.colorSpace;
    const programsBefore = this.renderer.info.programs.length;
    const issueSamples = [];
    const candidateWallSamples = [];
    const compileStarted = performance.now();
    for (const { source, key } of candidates) {
      const compileScene = new THREE.Scene();
      compileScene.add(this.makeDeferredRenderable(source));
      const candidateStarted = performance.now();
      // Return the async driver promise inside a plain object. runPrewarmSlice
      // measures only synchronous main-thread issue; awaiting the parallel
      // shader completion must not masquerade as a blocked JS slice.
      const issue = await this.runPrewarmSlice('program-issue', () => {
        const previousTarget = this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(target);
        const issuedAt = performance.now();
        try {
          const promise = typeof this.renderer.compileAsync === 'function'
            ? this.renderer.compileAsync(compileScene, camera, targetScene)
            : Promise.resolve(this.renderer.compile(compileScene, camera, targetScene));
          return { promise, issueMs: performance.now() - issuedAt };
        } finally {
          this.renderer.setRenderTarget(previousTarget);
        }
      });
      issueSamples.push(issue.result.issueMs);
      await issue.result.promise;
      candidateWallSamples.push(performance.now() - candidateStarted);
      this.deferredProgramWarmKeys.add(key);
      compileScene.clear();
    }
    target.dispose();
    return {
      candidates: candidates.length,
      rawCandidates: rawCandidates.length,
      issueMs: Number(Math.max(0, ...issueSamples).toFixed(3)),
      totalMs: Number((performance.now() - compileStarted).toFixed(3)),
      maxCandidateWallMs: Number(Math.max(0, ...candidateWallSamples).toFixed(3)),
      issueSamples: issueSamples.map((value) => Number(value.toFixed(3))),
      candidateWallSamples: candidateWallSamples.map((value) => Number(value.toFixed(3))),
      programsBefore,
      programsAfter: this.renderer.info.programs.length,
      programDelta: this.renderer.info.programs.length - programsBefore,
    };
  }

  async prewarmDeferredStage(stage, getLiveState) {
    const stageStarted = performance.now();
    const stageStartedAt = stageStarted;
    let stagedScene = stage.prewarmSnapshot;
    let stagingCamera = stage.prewarmCamera;
    if (!stagedScene || !stagingCamera) {
      const staged = await this.runPrewarmSlice('stage-snapshot', () => {
        const liveCamera = this.camera;
        const liveDirector = this.cameraDirector;
        const camera = liveCamera.clone();
        this.camera = camera;
        this.cameraDirector = this.makeCameraDirector();
        try {
          if (stage.clearCombat) this.combatFX.clear();
          this.update(stage.state, stage.events ?? [], 0);
          for (let step = 0; step < (stage.combatSteps ?? 0); step += 1) {
            this.combatFX.update(0.05, stage.state.time + (step + 1) * 0.05);
          }
          this.scene.updateMatrixWorld(true);
          camera.updateMatrixWorld(true);
          return { scene: this.collectDeferredRenderables(this.scene), camera };
        } finally {
          this.combatFX.clear();
          this.camera = liveCamera;
          this.cameraDirector = liveDirector;
          this.update(getLiveState(), [], 0);
        }
      });
      stagedScene = staged.result.scene;
      stagingCamera = staged.result.camera;
    }

    const programWarm = stage.prewarmProgramsReady
      ? {
          candidates: this.selectDeferredProgramCandidates(stagedScene.renderables).length,
          issueMs: 0,
          totalMs: 0,
          programsBefore: this.renderer.info.programs.length,
          programsAfter: this.renderer.info.programs.length,
          programDelta: 0,
          critical: true,
        }
      : await this.compileDeferredScenePrograms(stagedScene, stagingCamera);
    stage.prewarmProgramsReady = true;
    const upload = await this.uploadDeferredScene(stagedScene, stagingCamera, {
      // A single exact source per protected live-frame boundary keeps one
      // late program discovery from combining with a second geometry upload.
      // The P1 runway has ample frames to finish the first loop before launch.
      batchSize: 1,
    });
    // Retain the exact descriptor/camera pair with the compiler objects. Its
    // bounded memory is preferable to a nondeterministic major collection in
    // the playable P1 runway; it also remains useful provenance for the full
    // first-loop warm set.
    return {
      name: stage.name,
      deferred: true,
      startedAt: Number(stageStartedAt.toFixed(3)),
      endedAt: Number(performance.now().toFixed(3)),
      compileIssueMs: programWarm.issueMs,
      compileMs: programWarm.totalMs,
      renderMs: Number(upload.batchSamples.reduce((sum, value) => sum + value, 0).toFixed(3)),
      totalMs: Number((performance.now() - stageStarted).toFixed(3)),
      programWarm,
      upload,
    };
  }

  async prewarmDeferredStages(stages, { getLiveState, started }) {
    const backgroundStarted = performance.now();
    this.prewarmReport.backgroundStatus = 'running';
    try {
      // waitForPrewarmOpportunity gates the first slice on an actual control
      // edge (or a bounded no-gesture autotest fallback), then places every
      // upload after a completed live draw. No fixed rAF delay can provide
      // that ordering guarantee when a player touches at an arbitrary time.
      for (const stage of stages) {
        const report = await this.prewarmDeferredStage(stage, getLiveState);
        this.prewarmReport.stages.push(report);
      }
      this.prewarmStatus = 'complete';
      this.prewarmReport.status = 'complete';
      this.prewarmReport.backgroundStatus = 'complete';
      this.prewarmReport.backgroundMs = Number((performance.now() - backgroundStarted).toFixed(3));
      this.prewarmReport.totalMs = Number((performance.now() - started).toFixed(3));
      this.prewarmReport.retainedDecor = [...this.decorCache.keys()];
      return this.prewarmReport;
    } catch (error) {
      this.prewarmStatus = 'failed';
      this.prewarmReport.status = 'failed';
      this.prewarmReport.backgroundStatus = 'failed';
      this.prewarmReport.backgroundError = error?.message ?? String(error);
      throw error;
    }
  }

  createPostFX() {
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.24, 0.42, 1.08);
    if (this.diagnosticBloomScale !== 1) {
      const setBloomSize = this.bloomPass.setSize.bind(this.bloomPass);
      this.bloomPass.setSize = (width, height) => setBloomSize(
        Math.max(1, Math.round(width * this.diagnosticBloomScale)),
        Math.max(1, Math.round(height * this.diagnosticBloomScale)),
      );
    }
    this.outputPass = new OutputPass();
    if (this.rendererProfileEnabled) {
      for (const [name, pass] of [
        ['sceneMs', this.renderPass],
        ['bloomMs', this.bloomPass],
        ['outputMs', this.outputPass],
      ]) {
        const renderPass = pass.render.bind(pass);
        pass.render = (...args) => {
          const startedAt = performance.now();
          try {
            return renderPass(...args);
          } finally {
            if (this.activeSubmissionProfile) {
              this.activeSubmissionProfile[name] = performance.now() - startedAt;
            }
          }
        };
      }
    }
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.outputPass);
    this.bloomPass.enabled = this.quality !== 'low' && !this.diagnosticNoBloom;
  }

  createTransitionFX() {
    this.reentryUniforms = {
      time: { value: 0 },
      intensity: { value: 0 },
      hotColor: { value: new THREE.Color(0xff5a18) },
      coolColor: { value: new THREE.Color(0x8eeeff) },
      cooling: { value: 0 },
    };
    this.reentryShell = new THREE.Mesh(
      new THREE.SphereGeometry(1, this.quality === 'low' ? 24 : 40, this.quality === 'low' ? 14 : 24),
      new THREE.ShaderMaterial({
        uniforms: this.reentryUniforms,
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vView;
          varying vec3 vPosition;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vView = normalize(-mv.xyz);
            vPosition = position;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vView;
          varying vec3 vPosition;
          uniform float time;
          uniform float intensity;
          uniform float cooling;
          uniform vec3 hotColor;
          uniform vec3 coolColor;
          void main() {
            float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 1.7);
            float leading = 1.0 - smoothstep(-0.95, -0.3, normalize(vPosition).z);
            float lick = sin(vPosition.x * 8.0 + vPosition.y * 11.0 + time * 28.0) * 0.5 + 0.5;
            float alpha = (rim * 0.65 + leading * (0.34 + lick * 0.18)) * intensity;
            vec3 color = mix(hotColor, coolColor, cooling) * (0.72 + rim * 1.5 + leading * 0.8);
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    this.reentryShell.scale.set(2.25, 1.08, 4.35);
    this.reentryShell.position.set(0, 0.22, -0.15);
    this.reentryShell.visible = false;
    this.playerVehicle.userData.pose.add(this.reentryShell);

    this.reentryTrail = new THREE.Mesh(
      new THREE.ConeGeometry(1.05, 8.5, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff6a22, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    this.reentryTrail.rotation.x = Math.PI / 2;
    this.reentryTrail.position.set(0, 0.12, 5.2);
    this.playerVehicle.userData.pose.add(this.reentryTrail);

    // Launch uses the same compiled atmospheric-shell shader family as reentry,
    // but reverses the fantasy: pressure is born on the car, hardens around the
    // closing rocket hull, then stays continuous for the first metres of space.
    // The separate uniforms let both effects be prewarmed without another
    // material program or a dynamic light.
    this.launchShockUniforms = THREE.UniformsUtils.clone(this.reentryUniforms);
    this.launchShockUniforms.hotColor.value.set(0xfff0c2);
    this.launchShockUniforms.coolColor.value.set(0xff5b18);
    this.launchShockShell = new THREE.Mesh(
      this.reentryShell.geometry,
      this.reentryShell.material.clone(),
    );
    this.launchShockShell.material.uniforms = this.launchShockUniforms;
    // Launch pressure is a thin, fast shock boundary, not a translucent ball
    // wrapped around the hero.  Retain the shared vertex/uniform contract so it
    // stays cheap to prewarm, but suppress the face fill that was tinting the
    // entire morph orange in chase-camera frames.
    this.launchShockShell.material.fragmentShader = `
      varying vec3 vNormal;
      varying vec3 vView;
      varying vec3 vPosition;
      uniform float time;
      uniform float intensity;
      uniform float cooling;
      uniform vec3 hotColor;
      uniform vec3 coolColor;
      void main() {
        float viewEdge = 1.0 - max(dot(vNormal, vView), 0.0);
        float rim = pow(viewEdge, 4.2);
        float leading = 1.0 - smoothstep(-0.95, -0.3, normalize(vPosition).z);
        float lick = sin(vPosition.x * 8.0 + vPosition.y * 11.0 + time * 28.0) * 0.5 + 0.5;
        float alpha = (rim * (0.92 + lick * 0.22) + leading * 0.012) * intensity;
        vec3 color = mix(hotColor, coolColor, cooling) * (0.24 + rim * 2.7 + leading * 0.12);
        gl_FragColor = vec4(color, alpha);
      }
    `;
    this.launchShockShell.material.side = THREE.FrontSide;
    this.launchShockShell.material.needsUpdate = true;
    this.launchShockShell.position.set(0, 0.08, 0.35);
    this.launchShockShell.scale.set(2.45, 1.12, 4.8);
    this.launchShockShell.visible = false;
    this.launchShockShell.renderOrder = 8;
    this.playerVehicle.userData.pose.add(this.launchShockShell);

    const launchPlumeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6a24,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.launchPlume = new THREE.Mesh(
      new THREE.ConeGeometry(1.45, 7.6, 28, 1, true),
      launchPlumeMaterial,
    );
    this.launchPlume.rotation.x = Math.PI / 2;
    this.launchPlume.position.set(0, -0.02, 7);
    this.launchPlume.visible = false;
    this.playerVehicle.userData.pose.add(this.launchPlume);

    this.launchPlumeCore = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 5.4, 22, 1, true),
      launchPlumeMaterial.clone(),
    );
    this.launchPlumeCore.material.color.set(0xfff3c4);
    this.launchPlumeCore.rotation.x = Math.PI / 2;
    this.launchPlumeCore.position.set(0, -0.02, 6.1);
    this.launchPlumeCore.visible = false;
    this.playerVehicle.userData.pose.add(this.launchPlumeCore);

    this.reentryCloudCount = this.quality === 'high' ? 180 : this.quality === 'medium' ? 120 : 72;
    this.reentryCloudPositions = new Float32Array(this.reentryCloudCount * 3);
    this.reentryCloudColors = new Float32Array(this.reentryCloudCount * 3);
    this.reentryCloudData = Array.from({ length: this.reentryCloudCount }, (_, index) => {
      const u = ((Math.sin(index * 91.17 + 0.71) * 13758.27) % 1 + 1) % 1;
      const v = ((Math.sin(index * 47.11 + 2.91) * 9137.41) % 1 + 1) % 1;
      const w = ((Math.sin(index * 13.73 + 6.19) * 7219.11) % 1 + 1) % 1;
      const z = 40 - w * 1500;
      return {
        x: (u * 2 - 1) * (22 + w * 72),
        y: (v * 2 - 1) * (10 + w * 42) + 7,
        z,
        initialZ: z,
        speed: 0.42 + u * 0.34,
        phase: v * Math.PI * 2,
      };
    });
    const cloudGeometry = new THREE.BufferGeometry();
    cloudGeometry.setAttribute('position', setAttrDynamic(new THREE.BufferAttribute(this.reentryCloudPositions, 3)));
    cloudGeometry.setAttribute('color', setAttrDynamic(new THREE.BufferAttribute(this.reentryCloudColors, 3)));
    this.reentryClouds = new THREE.Points(cloudGeometry, new THREE.PointsMaterial({
      size: 22,
      sizeAttenuation: true,
      map: makeSoftDiscTexture(64),
      alphaTest: 0.01,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: true,
    }));
    this.reentryClouds.visible = false;
    this.reentryClouds.frustumCulled = false;
    this.scene.add(this.reentryClouds);
  }

  updateTransitionFX(state, segment, dt) {
    const morph = getMorphState(state);
    const fraction = getSegmentFraction(state);
    const planetLaunch = segment.shortId === 'planet-1' ? morph.launch : 0;
    const reentry = segment.type === 'space' ? morph.landing : 0;
    const spaceDeparture = segment.shortId === 'space-1'
      ? 1 - smoothstep(0.004, SPACE_WEAPONS_ARM_FRACTION, fraction)
      : 0;
    const launchPressure = Math.max(
      smoothstep(0.08, 0.72, planetLaunch),
      spaceDeparture,
    );
    if (segment.shortId === 'planet-1') {
      const rupture = smoothstep(0.48, 0.96, planetLaunch);
      this.launchFallaway.userData.atmosphereEscape = rupture;
      this.launchFallaway.userData.destinationAtmosphere = 0;
      this.sky.material.uniforms.spaceFactor.value = rupture;
      this.stars.material.opacity = lerp(0.003, 0.2, rupture);
      for (const plane of this.scoriaHaze.children) {
        plane.material.uniforms.opacity.value = plane.userData.baseOpacity * (1 - rupture);
      }
    } else if (segment.shortId === 'space-1') {
      // setSegment changes palettes atomically. Rebuild the first corridor's
      // actual visual state here so the first space frame still contains the
      // atmosphere Scoria just ruptured, and the last space frame is already
      // inside Thunderglass' atmosphere before the simulation boundary.
      const escape = smoothstep(0.008, 0.19, fraction);
      const atmosphericCapture = smoothstep(0.2, 0.96, reentry);
      this.launchFallaway.userData.atmosphereEscape = escape;
      this.launchFallaway.userData.destinationAtmosphere = atmosphericCapture;
      this.sky.material.uniforms.topColor.value
        .copy(SCORIA_SKY_TOP)
        .lerp(SPACE_ONE_SKY_TOP, escape)
        .lerp(STORMGLASS_SKY_TOP, atmosphericCapture);
      this.sky.material.uniforms.bottomColor.value
        .copy(SCORIA_SKY_BOTTOM)
        .lerp(SPACE_ONE_SKY_BOTTOM, escape)
        .lerp(STORMGLASS_SKY_BOTTOM, atmosphericCapture);
      this.sky.material.uniforms.accentColor.value
        .copy(SCORIA_SKY_ACCENT)
        .lerp(SPACE_ONE_SKY_ACCENT, escape)
        .lerp(STORMGLASS_SKY_ACCENT, atmosphericCapture);
      this.sky.material.uniforms.spaceFactor.value = 1 - atmosphericCapture;
      this.scene.fog.color
        .copy(SCORIA_FOG)
        .lerp(SPACE_ONE_FOG, escape)
        .lerp(STORMGLASS_FOG, atmosphericCapture);
      this.scene.fog.density = lerp(
        lerp(0.00068, 0.00027, escape),
        0.00072,
        atmosphericCapture,
      );
      this.stars.material.opacity = lerp(0.2, 0.003, atmosphericCapture);
      const scoriaAmbient = this.quality === 'low' ? 1.92 : this.quality === 'medium' ? 1.86 : 1.8;
      this.sunLight.color
        .copy(SCORIA_SUN_LIGHT)
        .lerp(SPACE_ONE_SUN_LIGHT, escape)
        .lerp(STORMGLASS_SUN_LIGHT, atmosphericCapture);
      this.ambientLight.color
        .copy(SCORIA_AMBIENT_LIGHT)
        .lerp(SPACE_ONE_AMBIENT_LIGHT, escape)
        .lerp(STORMGLASS_AMBIENT_LIGHT, atmosphericCapture);
      this.hemisphere.color
        .copy(SCORIA_HEMISPHERE_LIGHT)
        .lerp(SPACE_ONE_HEMISPHERE_LIGHT, escape)
        .lerp(STORMGLASS_HEMISPHERE_LIGHT, atmosphericCapture);
      this.hemisphere.groundColor
        .copy(SCORIA_HEMISPHERE_GROUND)
        .lerp(SPACE_ONE_HEMISPHERE_GROUND, escape)
        .lerp(STORMGLASS_HEMISPHERE_GROUND, atmosphericCapture);
      this.rimLight.color
        .copy(SCORIA_RIM_LIGHT)
        .lerp(SPACE_ONE_RIM_LIGHT, escape)
        .lerp(STORMGLASS_RIM_LIGHT, atmosphericCapture);
      this.destinationFill.color
        .copy(SCORIA_DESTINATION_LIGHT)
        .lerp(SPACE_ONE_DESTINATION_LIGHT, escape)
        .lerp(STORMGLASS_DESTINATION_LIGHT, atmosphericCapture);
      this.sunLight.intensity = lerp(lerp(0.7, 3.15, escape), 3.8, atmosphericCapture);
      this.ambientLight.intensity = lerp(lerp(scoriaAmbient, 0.16, escape), 0.28, atmosphericCapture);
      this.hemisphere.intensity = lerp(lerp(0.5, 0.78, escape), 1.18, atmosphericCapture);
      this.rimLight.intensity = lerp(lerp(32, 48, escape), 32, atmosphericCapture);
      this.lavaFill.intensity = lerp(lerp(6.5, 4.5, escape), 0, atmosphericCapture);
      this.destinationFill.intensity = lerp(lerp(0.35, 3.6, escape), 0.55, atmosphericCapture);
    } else {
      this.launchFallaway.userData.atmosphereEscape = 1;
      this.launchFallaway.userData.destinationAtmosphere = segment.shortId === 'planet-2' ? 1 : 0;
    }
    const launchVisible = launchPressure > 0.012;
    this.launchFallaway.userData.launchPressure = launchPressure;
    // The authored aperture, pressure rings, atmosphere rupture and two-stage
    // plume already describe the pressure event. A full enclosing shell read
    // as a shield pickup and hid the morph, so keep the prewarmed mesh dormant.
    this.launchShockShell.visible = false;
    // The premium vehicle already deploys three nozzle-aligned pressure wakes.
    // The extra camera-facing cones collapsed into two flat triangles in motion
    // and weakened the rocket silhouette, so let the real engine cluster own
    // ignition while the aperture/rings/particles sell the planetary rupture.
    this.launchPlume.visible = false;
    this.launchPlumeCore.visible = false;
    this.launchShockUniforms.time.value = state.time;
    this.launchShockUniforms.intensity.value = launchPressure * (0.055 + state.boost * 0.026);
    this.launchShockUniforms.cooling.value = 0;
    const shockExpansion = segment.shortId === 'space-1'
      ? 1.18 + (1 - spaceDeparture) * 0.42
      : 0.84 + planetLaunch * 0.34;
    this.launchShockShell.scale.set(
      2.45 * shockExpansion,
      1.12 * shockExpansion,
      4.8 * (0.9 + shockExpansion * 0.18),
    );
    const plumePulse = 0.88 + Math.sin(state.time * 48) * 0.08 + Math.sin(state.time * 21) * 0.04;
    this.launchPlume.material.opacity = launchPressure * (0.035 + state.boost * 0.025);
    this.launchPlumeCore.material.opacity = launchPressure * (0.065 + state.boost * 0.04);
    const outerRadius = 1 + launchPressure * 0.24;
    const coreRadius = 1 + launchPressure * 0.14;
    this.launchPlume.scale.set(outerRadius, plumePulse * (0.78 + launchPressure * 0.46), outerRadius);
    this.launchPlumeCore.scale.set(coreRadius, plumePulse * (0.86 + launchPressure * 0.28), coreRadius);
    const arrivalActive = segment.shortId === 'space-1';
    const active = reentry > 0.015 && !arrivalActive;
    this.reentryShell.visible = active;
    this.reentryTrail.visible = active;
    this.reentryClouds.visible = active;
    this.reentryUniforms.time.value = state.time;
    this.reentryUniforms.intensity.value = smoothstep(0.03, 0.28, reentry) * (1 - smoothstep(0.93, 1, reentry)) * 0.78;
    this.reentryUniforms.cooling.value = smoothstep(0.58, 0.95, reentry);
    this.reentryTrail.material.opacity = smoothstep(0.05, 0.34, reentry) * (1 - smoothstep(0.9, 1, reentry)) * 0.22;
    this.reentryTrail.material.color.setRGB(1, 0.22 + reentry * 0.45, 0.05 + reentry * 0.5);
    this.arrivalArt.update({
      active: arrivalActive,
      time: state.time,
      dt,
      approach: arrivalActive ? getSegmentFraction(state) : 0,
      reentry,
      speed: state.speed,
      lateral: state.lateral,
      roll: state.roll,
      camera: this.camera,
    });
    if (!active) return;
    const cloudEnvelope = smoothstep(0.42, 0.78, reentry) * (1 - smoothstep(0.97, 1, reentry));
    this.reentryClouds.material.opacity = cloudEnvelope * 0.42;
    this.reentryClouds.material.size = 16 + reentry * 24;
    for (let i = 0; i < this.reentryCloudData.length; i += 1) {
      const cloud = this.reentryCloudData[i];
      cloud.z += state.speed * dt * cloud.speed;
      if (cloud.z > 65) cloud.z -= 1550;
      const index = i * 3;
      this.reentryCloudPositions[index] = cloud.x + Math.sin(state.time * 0.22 + cloud.phase) * 4;
      this.reentryCloudPositions[index + 1] = cloud.y + Math.sin(state.time * 0.37 + cloud.phase) * 2;
      this.reentryCloudPositions[index + 2] = cloud.z;
      const bright = 0.52 + (i % 7) * 0.045;
      this.reentryCloudColors[index] = bright * (0.72 + reentry * 0.18);
      this.reentryCloudColors[index + 1] = bright * (0.82 + reentry * 0.12);
      this.reentryCloudColors[index + 2] = bright;
    }
    this.reentryClouds.geometry.attributes.position.needsUpdate = true;
    this.reentryClouds.geometry.attributes.color.needsUpdate = true;
  }

  createLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffe6dc, 0.42);
    this.scene.add(this.ambientLight);
    this.hemisphere = new THREE.HemisphereLight(0xa6cfff, 0x180704, 1.05);
    this.scene.add(this.hemisphere);
    this.sunLight = new THREE.DirectionalLight(0xffe2bd, 3.4);
    this.sunLight.position.set(-90, 120, 55);
    this.sunLight.castShadow = this.quality === 'high';
    this.sunLight.shadow.mapSize.set(this.diagnosticShadowMapSize, this.diagnosticShadowMapSize);
    this.sunLight.shadow.camera.left = -28;
    this.sunLight.shadow.camera.right = 28;
    this.sunLight.shadow.camera.top = 24;
    this.sunLight.shadow.camera.bottom = -18;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 260;
    this.sunLight.shadow.bias = -0.00018;
    this.sunLight.shadow.normalBias = 0.018;
    this.scene.add(this.sunLight);
    this.rimLight = new THREE.PointLight(0x53ddff, 35, 70, 2);
    this.rimLight.position.set(0, 7, 8);
    this.scene.add(this.rimLight);
    this.lavaFill = new THREE.PointLight(0xff4212, 22, 155, 1.55);
    this.lavaFill.position.set(0, -1.2, -42);
    this.scene.add(this.lavaFill);
    // Reuse the destination key as Scoria's broad volcanic bounce. Keeping the
    // light count fixed avoids compiling every PBR material against extra
    // point/directional-light permutations during the seamless launch prewarm.
    this.destinationFill = new THREE.DirectionalLight(0x7bdcff, 0.8);
    this.destinationFill.position.set(120, 80, -220);
    this.scene.add(this.destinationFill);
  }

  createSky() {
    const geometry = new THREE.SphereGeometry(2600, 36, 20);
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x081224) },
        bottomColor: { value: new THREE.Color(0x190706) },
        accentColor: { value: new THREE.Color(0xff5a25) },
        time: { value: 0 },
        spaceFactor: { value: 0 },
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDirection;
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 accentColor;
        uniform float time;
        uniform float spaceFactor;
        float hash(vec3 p) {
          p = fract(p * 0.1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }
        void main() {
          float horizon = smoothstep(-0.35, 0.72, vDirection.y);
          vec3 color = mix(bottomColor, topColor, horizon);
          float nebula = sin(vDirection.x * 11.0 + sin(vDirection.y * 9.0 + time * 0.025) * 2.0) * 0.5 + 0.5;
          nebula *= smoothstep(0.2, 0.95, 1.0 - abs(vDirection.y));
          color += accentColor * nebula * (0.035 + spaceFactor * 0.08);
          float star = hash(floor(vDirection * 1350.0));
          star = smoothstep(0.9984, 1.0, star) * (0.0015 + spaceFactor * 0.23);
          color += vec3(star);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(geometry, material);
    this.scene.add(this.sky);

    const starCount = this.quality === 'high' ? 980 : this.quality === 'medium' ? 680 : 420;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const radius = 900 + visualUnit(i, 11) * 900;
      const theta = visualUnit(i, 29) * Math.PI * 2;
      const phi = Math.acos(2 * visualUnit(i, 47) - 1);
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.cos(phi) * radius;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
      const warmth = visualUnit(i, 71);
      colors[i * 3] = 0.72 + warmth * 0.28;
      colors[i * 3 + 1] = 0.78 + warmth * 0.2;
      colors[i * 3 + 2] = 1;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({
      size: 0.84,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }));
    this.scene.add(this.stars);

    this.scoriaHaze = new THREE.Group();
    const hazeVertex = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const hazeFragment = `
      varying vec2 vUv;
      uniform vec3 color;
      uniform float opacity;
      void main() {
        float vertical = smoothstep(0.0, 0.34, vUv.y) * (1.0 - smoothstep(0.54, 1.0, vUv.y));
        float horizontal = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
        float strata = 0.72 + sin(vUv.y * 61.0 + sin(vUv.x * 13.0) * 1.8) * 0.12;
        gl_FragColor = vec4(color, vertical * horizontal * strata * opacity);
      }
    `;
    const hazeLayers = [
      { color: 0xa32a0b, opacity: 0.28, position: [0, 62, -940], scale: [1480, 250, 1] },
      { color: 0x42100a, opacity: 0.5, position: [0, 118, -680], scale: [1220, 330, 1] },
      { color: 0xe06820, opacity: 0.11, position: [-80, 28, -1110], scale: [1740, 170, 1] },
    ];
    for (const layer of hazeLayers) {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.ShaderMaterial({
          uniforms: { color: { value: new THREE.Color(layer.color) }, opacity: { value: layer.opacity } },
          vertexShader: hazeVertex,
          fragmentShader: hazeFragment,
          transparent: true,
          depthWrite: false,
          depthTest: true,
          blending: THREE.NormalBlending,
          toneMapped: true,
        }),
      );
      plane.userData.baseOpacity = layer.opacity;
      plane.position.set(...layer.position);
      plane.scale.set(...layer.scale);
      this.scoriaHaze.add(plane);
    }
    this.scene.add(this.scoriaHaze);
  }

  async createPlanets() {
    this.planetRoot = new THREE.Group();
    this.scene.add(this.planetRoot);
    this.planetMeshes = [];
    const textureReady = [];
    let buildMs = 0;
    for (let i = 0; i < PLANETS.length; i += 1) {
      const planet = PLANETS[i];
      const planetStarted = performance.now();
      const group = new THREE.Group();
      const surfaceTexture = loadRuntimePlanetTexture(i, 'surface');
      textureReady.push(surfaceTexture.userData.ready);
      const sphere = mesh(
        new THREE.SphereGeometry(1, this.quality === 'low' ? 32 : 64, this.quality === 'low' ? 20 : 40),
        new THREE.MeshStandardMaterial({
          map: surfaceTexture,
          bumpMap: surfaceTexture,
          bumpScale: 0.035,
          color: 0xffffff,
          roughness: 0.74,
          metalness: i === 4 ? 0.3 : 0.03,
          envMapIntensity: 0.65,
        }),
        group,
      );
      sphere.rotation.z = i * 0.41;
      const atmosphere = mesh(
        new THREE.SphereGeometry(i === 1 ? 1.035 : 1.07, this.quality === 'low' ? 28 : 52, this.quality === 'low' ? 16 : 30),
        new THREE.ShaderMaterial({
          uniforms: {
            color: { value: new THREE.Color(planet.accent).lerp(new THREE.Color(0xbfeaff), 0.28) },
            intensity: { value: i === 1 ? 0.31 : 0.4 },
          },
          vertexShader: `
            varying vec3 vNormal;
            varying vec3 vView;
            void main() {
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vNormal = normalize(normalMatrix * normal);
              vView = normalize(-mv.xyz);
              gl_Position = projectionMatrix * mv;
            }
          `,
          fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vView;
            uniform vec3 color;
            uniform float intensity;
            void main() {
              float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 3.45);
              float body = pow(1.0 - max(dot(vNormal, vView), 0.0), 7.5) * 0.3;
              gl_FragColor = vec4(color * (0.45 + rim * 1.12), (rim + body) * intensity);
            }
          `,
          transparent: true,
          side: THREE.FrontSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
        group,
      );
      const cloud = mesh(
        new THREE.SphereGeometry(1.022, this.quality === 'low' ? 28 : 56, this.quality === 'low' ? 16 : 32),
        new THREE.MeshStandardMaterial({
          map: loadRuntimePlanetTexture(i, 'cloud'),
          transparent: true,
          opacity: i === 1 ? 0.31 : 0.24,
          depthWrite: false,
          roughness: 0.9,
          metalness: 0,
          side: THREE.DoubleSide,
        }),
        group,
      );
      textureReady.push(cloud.material.map.userData.ready);
      const terminator = mesh(
        new THREE.SphereGeometry(1.011, this.quality === 'low' ? 28 : 52, this.quality === 'low' ? 16 : 30),
        new THREE.ShaderMaterial({
          uniforms: { strength: { value: i === 1 ? 0.88 : 0.68 } },
          vertexShader: `
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec3 vNormal;
            uniform float strength;
            void main() {
              vec3 lightDirection = normalize(vec3(-0.82, 0.24, 0.34));
              float light = dot(normalize(vNormal), lightDirection);
              float shadow = 1.0 - smoothstep(-0.16, 0.26, light);
              gl_FragColor = vec4(vec3(0.003, 0.006, 0.012), shadow * strength);
            }
          `,
          transparent: true,
          depthWrite: false,
          side: THREE.FrontSide,
          toneMapped: false,
        }),
        group,
      );
      terminator.renderOrder = 3;
      group.userData = { sphere, atmosphere, cloud, terminator, planet };
      this.planetRoot.add(group);
      this.planetMeshes.push(group);
      buildMs += performance.now() - planetStarted;
    }
    const horizonStarted = performance.now();
    const makeHorizonTexture = (texture, suffix) => {
      const clone = texture.clone();
      clone.name = `${texture.name || 'scoria-terrain'}-horizon-${suffix}`;
      // A SphereGeometry closes at u=0/1. Fractional horizontal repeat makes
      // those two vertices sample different texels, creating a guaranteed
      // longitude scar that slowly rotates through the vista. Six repeats
      // preserve density while meeting exactly at the seam.
      clone.repeat.set(6, texture.repeat.y);
      clone.needsUpdate = true;
      return clone;
    };
    this.horizonTextures = {
      map: makeHorizonTexture(this.planetOneArt.terrain.map, 'color'),
      normalMap: makeHorizonTexture(this.planetOneArt.terrain.normalMap, 'normal'),
      roughnessMap: makeHorizonTexture(this.planetOneArt.terrain.roughnessMap, 'roughness'),
      emissiveMap: makeHorizonTexture(this.planetOneArt.terrain.emissiveMap, 'emissive'),
    };
    this.horizon = new THREE.Mesh(
      new THREE.SphereGeometry(950, this.quality === 'low' ? 32 : 56, this.quality === 'low' ? 18 : 30),
      new THREE.MeshStandardMaterial({
        map: this.horizonTextures.map,
        normalMap: this.horizonTextures.normalMap,
        roughnessMap: this.horizonTextures.roughnessMap,
        emissiveMap: this.horizonTextures.emissiveMap,
        color: 0x8d746a,
        roughness: 0.97,
        metalness: 0.015,
        emissive: 0x120503,
        emissiveIntensity: 0,
        envMapIntensity: 0.6,
      }),
    );
    this.horizon.position.set(0, -954, -440);
    this.scene.add(this.horizon);
    this.sunOrb = new THREE.Mesh(
      new THREE.SphereGeometry(28, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd18b, toneMapped: false }),
    );
    this.sunOrb.position.set(-420, 230, -1150);
    this.scene.add(this.sunOrb);
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeSoftDiscTexture(96),
      color: 0xff8a3d,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }));
    this.sunHalo.position.copy(this.sunOrb.position);
    this.sunHalo.scale.set(170, 170, 1);
    this.scene.add(this.sunHalo);
    this.planetVistaBuildMs = Number((buildMs + performance.now() - horizonStarted).toFixed(3));
    this.planetVistaTexturesReady = Promise.all(textureReady).then(() => undefined);
  }

  createTrack() {
    this.trackRows = this.quality === 'high' ? 168 : this.quality === 'medium' ? 138 : 106;
    this.roadColumns = this.quality === 'low' ? 9 : 15;
    this.terrainColumns = this.quality === 'low' ? 14 : this.quality === 'medium' ? 24 : 34;
    this.behindRows = 12;
    this.trackSpacing = this.quality === 'low' ? 20 : 15;
    this.surfaceNormalFrame = 0;
    this.trackSamples = Array.from({ length: this.trackRows }, () => ({
      x: 0,
      y: 0,
      z: 0,
      cos: 1,
      sin: 0,
      width: 0,
      normalX: 0,
      normalY: 1,
      normalZ: 0,
      worldProgress: 0,
      fraction: 0,
    }));
    const makeCourseSample = () => ({ x: 0, y: 0, bank: 0, width: 0 });
    this.scoriaCurrentSample = makeCourseSample();
    this.scoriaCourseSamples = Array.from({ length: this.trackRows }, makeCourseSample);
    this.scoriaNextSamples = Array.from({ length: this.trackRows }, makeCourseSample);
    this.scoriaFlowSamples = {
      current: makeCourseSample(),
      near: makeCourseSample(),
      far: makeCourseSample(),
      rival: makeCourseSample(),
      camera: makeCourseSample(),
    };
    this.trackColors = {
      roadBase: new THREE.Color(),
      accent: new THREE.Color(),
      ground: new THREE.Color(),
      shoulder: new THREE.Color(),
      target: new THREE.Color(),
      surfaceTint: new THREE.Color(),
      white: new THREE.Color(0xffffff),
    };
    this.roadColumnProfile = {
      u: new Float64Array(this.roadColumns),
      vertical: new Float64Array(this.roadColumns),
      thermal: new Float64Array(this.roadColumns),
      lanePolish: new Float64Array(this.roadColumns),
      uv: new Float64Array(this.roadColumns),
    };
    for (let column = 0; column < this.roadColumns; column += 1) {
      const u = (column / (this.roadColumns - 1)) * 2 - 1;
      const edge = Math.abs(u);
      const crown = (1 - Math.pow(edge, 1.45)) * 0.13;
      const shoulderDrop = smoothstep(0.78, 1, edge) * 0.22;
      this.roadColumnProfile.u[column] = u;
      this.roadColumnProfile.vertical[column] = crown - shoulderDrop;
      this.roadColumnProfile.thermal[column] = Math.exp(-Math.pow((edge - 0.72) / 0.055, 2));
      this.roadColumnProfile.lanePolish[column] = 1 - smoothstep(0.04, 0.3, Math.min(Math.abs(u - 0.36), Math.abs(u + 0.36)));
      this.roadColumnProfile.uv[column] = column / (this.roadColumns - 1) * 3;
    }
    const terrainPhaseNames = [
      'macroA', 'macroB', 'macroC', 'macroD', 'broad', 'ridgeA',
      'ridgeB', 'shelfA', 'shelfB', 'fractureA', 'fractureB', 'canyon',
    ];
    this.terrainColumnProfile = {
      side: new Float64Array(this.terrainColumns),
      absolute: new Float64Array(this.terrainColumns),
      sign: new Float64Array(this.terrainColumns),
      outer: new Float64Array(this.terrainColumns),
      brokenShelf: new Float64Array(this.terrainColumns),
      terraceUnit: new Float64Array(this.terrainColumns),
      terraceBlend: new Float64Array(this.terrainColumns),
      macroScale: new Float64Array(this.terrainColumns),
      terracedScale: new Float64Array(this.terrainColumns),
      shoulderShelf: new Float64Array(this.terrainColumns),
      shoulderAmount: new Float64Array(this.terrainColumns),
      corridorCut: new Float64Array(this.terrainColumns),
      corridorClearance: new Float64Array(this.terrainColumns),
      canyonEnvelope: new Float64Array(this.terrainColumns),
      launchEnvelope: new Float64Array(this.terrainColumns),
      launchDepth: new Float64Array(this.terrainColumns),
      exposureBase: new Float64Array(this.terrainColumns),
      exposureStratum: new Float64Array(this.terrainColumns),
      emberBase: new Float64Array(this.terrainColumns),
      emberStratum: new Float64Array(this.terrainColumns),
      colorR: new Float64Array(this.terrainColumns),
      colorG: new Float64Array(this.terrainColumns),
      colorB: new Float64Array(this.terrainColumns),
      uv: new Float64Array(this.terrainColumns),
      phaseSin: Object.fromEntries(terrainPhaseNames.map((name) => [name, new Float64Array(this.terrainColumns)])),
      phaseCos: Object.fromEntries(terrainPhaseNames.map((name) => [name, new Float64Array(this.terrainColumns)])),
      stratum: new Float64Array(this.terrainColumns),
    };
    for (let column = 0; column < this.terrainColumns; column += 1) {
      const side = (column / (this.terrainColumns - 1)) * 14 - 7;
      const absolute = Math.abs(side);
      const sign = side < 0 ? -1 : 1;
      const outer = smoothstep(1.18, 6.45, absolute);
      this.terrainColumnProfile.side[column] = side;
      this.terrainColumnProfile.absolute[column] = absolute;
      this.terrainColumnProfile.sign[column] = sign;
      this.terrainColumnProfile.outer[column] = outer;
      this.terrainColumnProfile.brokenShelf[column] = smoothstep(1.05, 2.35, absolute)
        * (1 - smoothstep(5.15, 6.85, absolute));
      this.terrainColumnProfile.terraceUnit[column] = 1.7 + outer * 1.65;
      this.terrainColumnProfile.terraceBlend[column] = 0.42 + outer * 0.18;
      this.terrainColumnProfile.macroScale[column] = 0.34 + outer * 0.42;
      this.terrainColumnProfile.terracedScale[column] = 0.38 + outer * 0.62;
      this.terrainColumnProfile.shoulderShelf[column] = -0.62 - smoothstep(1.02, 2.1, absolute) * 1.25;
      const shoulderAmount = 0.08 + (1 - smoothstep(1.1, 3.8, absolute)) * 0.54;
      this.terrainColumnProfile.shoulderAmount[column] = shoulderAmount;
      const corridorCut = 1 - smoothstep(0.96, 1.42, absolute);
      this.terrainColumnProfile.corridorCut[column] = corridorCut;
      this.terrainColumnProfile.corridorClearance[column] = -0.95 - corridorCut * 0.55;
      this.terrainColumnProfile.canyonEnvelope[column] = smoothstep(1.55, 4.4, absolute);
      this.terrainColumnProfile.launchEnvelope[column] = smoothstep(1.04, 3.3, absolute);
      this.terrainColumnProfile.launchDepth[column] = 7 + absolute * 1.45;
      this.terrainColumnProfile.exposureBase[column] = 0.88 + shoulderAmount * 0.08 + outer * 0.035;
      this.terrainColumnProfile.exposureStratum[column] = outer * 0.085;
      this.terrainColumnProfile.emberBase[column] = outer * 0.006;
      this.terrainColumnProfile.emberStratum[column] = outer * 0.012;
      this.terrainColumnProfile.uv[column] = side * 0.47;
      const phases = {
        macroA: side * 1.81,
        macroB: -side * 0.77,
        macroC: side * 3.1,
        macroD: side * 4.73,
        broad: sign * 1.73 + absolute * 0.28,
        ridgeA: sign * 2.31 + absolute * 0.63,
        ridgeB: -sign * 0.81 + absolute * 1.17,
        shelfA: side * 2.7,
        shelfB: -side * 4.1,
        fractureA: side * 6.1 + sign,
        fractureB: -side * 3.7,
        canyon: side,
      };
      for (const name of terrainPhaseNames) {
        this.terrainColumnProfile.phaseSin[name][column] = Math.sin(phases[name]);
        this.terrainColumnProfile.phaseCos[name][column] = Math.cos(phases[name]);
      }
      this.terrainColumnProfile.stratum[column] = side * 0.8;
    }
    this.roadGeometry = makeRibbonGeometry(this.trackRows, this.roadColumns);
    this.roadMaterial = new THREE.MeshPhysicalMaterial({
      ...this.planetOneArt.road.materialParameters,
      vertexColors: true,
      metalness: 0.18,
      roughness: 0.82,
      clearcoat: 0.08,
      clearcoatRoughness: 0.68,
      emissiveIntensity: 0.16,
      side: THREE.DoubleSide,
    });
    this.roadMaterial.forceSinglePass = true;
    this.road = new THREE.Mesh(this.roadGeometry, this.roadMaterial);
    this.road.receiveShadow = true;
    this.worldRoot.add(this.road);
    this.roadWorkGeometry = this.roadGeometry;

    this.terrainGeometry = makeRibbonGeometry(this.trackRows, this.terrainColumns);
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      map: this.planetOneArt.terrain.map,
      color: 0xc0a89d,
      vertexColors: true,
      roughness: 0.93,
      metalness: 0.015,
      emissive: 0x120503,
      emissiveIntensity: 0,
      envMapIntensity: 0.76,
      side: THREE.DoubleSide,
    });
    this.terrain = new THREE.Mesh(this.terrainGeometry, this.terrainMaterial);
    this.terrain.receiveShadow = true;
    this.worldRoot.add(this.terrain);
    this.terrainWorkGeometry = this.terrainGeometry;
    const cloneWorkGeometry = (geometry) => {
      const clone = geometry.clone();
      clone.setIndex(geometry.index);
      return clone;
    };
    // Rotate three exact mutable backing stores. Three/WebGL otherwise issues
    // whole-array bufferSubData into the same ~362 KB road/terrain allocation
    // every frame; periodic D3D retirement waits then steal 17-26 ms from the
    // next CPU row build. Three banks preserve every Float32 value and topology
    // while giving each GPU buffer two complete frames of retirement distance;
    // the final dirty bank is explicitly retired before control below.
    this.roadWorkGeometries = [
      this.roadWorkGeometry,
      cloneWorkGeometry(this.roadWorkGeometry),
      cloneWorkGeometry(this.roadWorkGeometry),
    ];
    this.terrainWorkGeometries = [
      this.terrainWorkGeometry,
      cloneWorkGeometry(this.terrainWorkGeometry),
      cloneWorkGeometry(this.terrainWorkGeometry),
    ];
    this.trackWorkGeometryIndex = 0;

    this.lavaRibbonMaterial = new THREE.MeshStandardMaterial({
      map: this.planetOneArt.lava.map,
      normalMap: this.planetOneArt.lava.normalMap,
      roughnessMap: this.planetOneArt.lava.roughnessMap,
      // Let the cooled-crust albedo carry the channel. Multiplying it by a
      // saturated red turned the entire shoulder into a flat arcade guardrail.
      color: 0x8c807a,
      emissive: 0xff5d26,
      emissiveIntensity: 0.03,
      roughness: 0.76,
      metalness: 0.025,
      side: THREE.DoubleSide,
    });
    this.lavaColumns = this.quality === 'high' ? 9 : this.quality === 'medium' ? 7 : 4;
    this.lavaColumnProfile = {
      across: new Float64Array(this.lavaColumns),
      uv: new Float64Array(this.lavaColumns),
      rippleSin: new Float64Array(this.lavaColumns),
      rippleCos: new Float64Array(this.lavaColumns),
    };
    for (let column = 0; column < this.lavaColumns; column += 1) {
      const across = (column / (this.lavaColumns - 1)) * 2 - 1;
      this.lavaColumnProfile.across[column] = across;
      this.lavaColumnProfile.uv[column] = column / (this.lavaColumns - 1) * 1.4;
      this.lavaColumnProfile.rippleSin[column] = Math.sin(across * 2.7);
      this.lavaColumnProfile.rippleCos[column] = Math.cos(across * 2.7);
    }
    this.lavaRibbons = [-1, 1].map((side) => {
      const geometry = makeRibbonGeometry(this.trackRows, this.lavaColumns);
      const ribbon = new THREE.Mesh(geometry, this.lavaRibbonMaterial);
      ribbon.userData.side = side;
      ribbon.frustumCulled = false;
      ribbon.receiveShadow = false;
      this.worldRoot.add(ribbon);
      return ribbon;
    });

    this.laneLines = [-0.34, 0, 0.34].map((lane) => {
      const line = new THREE.Line(
        makeLineGeometry(this.trackRows),
        new THREE.LineBasicMaterial({ color: 0x74efff, transparent: true, opacity: lane === 0 ? 0.62 : 0.33, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      line.userData.lane = lane;
      this.worldRoot.add(line);
      return line;
    });
    this.edgeLines = [-1, 1].map((side) => {
      const line = new THREE.Line(
        makeLineGeometry(this.trackRows),
        new THREE.LineBasicMaterial({ color: 0xff8b5a, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      line.userData.side = side;
      this.worldRoot.add(line);
      return line;
    });
    this.lavaWorkGeometries = this.lavaRibbons.map((ribbon) => ribbon.geometry);
    this.lineWorkGeometries = [...this.laneLines, ...this.edgeLines].map((line) => line.geometry);
    this.staticScoriaSurface = this.createStaticScoriaSurface();
    if (this.staticScoriaSurface.enabled) this.activateStaticScoriaSurface();

    this.reflectorPairs = this.quality === 'low' ? 34 : 52;
    this.reflectors = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.32, 0.11, 0.72),
      new THREE.MeshStandardMaterial({ color: 0xffd2a4, emissive: 0xff5b1d, emissiveIntensity: 0.85, metalness: 0.62, roughness: 0.28 }),
      this.reflectorPairs * 2,
    );
    this.reflectors.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.reflectors.frustumCulled = false;
    this.worldRoot.add(this.reflectors);
    this.reflectorCourseState = { segmentId: null, first: null, startSlot: 0 };
    this.expansionJointCount = this.quality === 'low' ? 18 : 28;
    this.expansionJoints = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.025, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x4f5558, metalness: 0.82, roughness: 0.23, envMapIntensity: 1.4 }),
      this.expansionJointCount,
    );
    this.expansionJoints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.expansionJoints.frustumCulled = false;
    this.worldRoot.add(this.expansionJoints);
    this.jointCourseState = { segmentId: null, first: null, startSlot: 0 };

    this.gates = Array.from({ length: 7 }, (_, i) => {
      const group = new THREE.Group();
      const material = new THREE.MeshBasicMaterial({ color: 0xff6b30, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const ring = mesh(new THREE.TorusGeometry(3.5, 0.12, 8, 44), material, group, [0, 2.7, 0]);
      const left = mesh(new THREE.BoxGeometry(0.14, 5.4, 0.14), material, group, [-3.5, 0, 0]);
      const right = mesh(new THREE.BoxGeometry(0.14, 5.4, 0.14), material, group, [3.5, 0, 0]);
      group.userData = { ring, left, right, material, index: i };
      this.worldRoot.add(group);
      return group;
    });

    this.launchAperture = new THREE.Group();
    const apertureMetal = new THREE.MeshStandardMaterial({
      color: 0x665048,
      map: this.planetOneArt.terrain.map,
      normalMap: this.planetOneArt.road.normalMap,
      metalness: 0.72,
      roughness: 0.34,
      envMapIntensity: 1.8,
      transparent: true,
    });
    const apertureHot = new THREE.MeshStandardMaterial({ color: 0x5a2a18, emissive: 0xff6228, emissiveIntensity: 1.35, metalness: 0.38, roughness: 0.32, transparent: true });
    for (const side of [-1, 1]) {
      mesh(new THREE.BoxGeometry(1.65, 18.5, 2.1), apertureMetal, this.launchAperture, [side * 11.3, 7.9, 0], [0, 0, side * -0.13]);
      mesh(new THREE.BoxGeometry(0.34, 16.8, 2.25), apertureHot, this.launchAperture, [side * 10.35, 7.85, -0.12], [0, 0, side * -0.13]);
      mesh(new THREE.BoxGeometry(5.2, 0.78, 3.1), apertureMetal, this.launchAperture, [side * 10.1, -0.35, 0.35]);
    }
    mesh(new THREE.TorusGeometry(11.45, 0.78, 18, 96, Math.PI), apertureMetal, this.launchAperture, [0, 7.9, 0]);
    mesh(new THREE.TorusGeometry(10.45, 0.26, 12, 96, Math.PI), apertureHot, this.launchAperture, [0, 7.9, -0.22]);
    mesh(new THREE.TorusGeometry(9.55, 0.11, 10, 88, Math.PI), apertureHot, this.launchAperture, [0, 7.9, 0.7]);
    mesh(new THREE.BoxGeometry(24.2, 1.05, 2.2), apertureMetal, this.launchAperture, [0, 7.75, 0]);
    this.launchAperture.visible = false;
    this.launchAperture.userData.materials = [apertureMetal, apertureHot];
    this.worldRoot.add(this.launchAperture);

    // Keep a physical piece of the launch lip in view for the first moments of
    // Space 1. With the carried lift impulse, this proves continuous departure
    // from a planet instead of visually loading a different scene.
    this.launchFallaway = new THREE.Group();
    this.launchFallaway.name = 'scoria-launch-lip-fallaway';
    const fallawayTerrain = new THREE.MeshStandardMaterial({
      color: 0x4a2720,
      map: this.planetOneArt.terrain.map,
      normalMap: this.planetOneArt.terrain.normalMap,
      roughnessMap: this.planetOneArt.terrain.roughnessMap,
      emissiveMap: this.planetOneArt.terrain.emissiveMap,
      emissive: 0xa82b0c,
      emissiveIntensity: 0.24,
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0,
      side: THREE.FrontSide,
    });
    fallawayTerrain.normalScale.set(0.52, 0.52);
    const fallawayRoad = new THREE.MeshPhysicalMaterial({
      color: 0x76524a,
      map: this.planetOneArt.road.map,
      normalMap: this.planetOneArt.road.normalMap,
      roughnessMap: this.planetOneArt.road.roughnessMap,
      emissiveMap: this.planetOneArt.road.emissiveMap,
      emissive: 0xff4b1c,
      emissiveIntensity: 0.22,
      roughness: 0.75,
      metalness: 0.16,
      clearcoat: 0.18,
      clearcoatRoughness: 0.5,
      transparent: true,
      opacity: 0,
      side: THREE.FrontSide,
    });
    fallawayRoad.normalScale.set(0.48, 0.48);
    const fallawayHeat = new THREE.LineBasicMaterial({
      color: 0xff4b16,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const fallawayTerrainGeometry = makeLaunchFallawayTerrainGeometry();
    const fallawayRoadGeometry = makeLaunchFallawayRoadGeometry();
    const fallawayHeatGeometry = makeLaunchFallawayHeatGeometry();
    const fallawayTerrainMesh = mesh(fallawayTerrainGeometry, fallawayTerrain, this.launchFallaway);
    fallawayTerrainMesh.receiveShadow = false;
    const fallawayDeckMesh = mesh(fallawayRoadGeometry, fallawayRoad, this.launchFallaway);
    fallawayDeckMesh.receiveShadow = false;
    const heatBatch = new THREE.LineSegments(fallawayHeatGeometry, fallawayHeat);
    heatBatch.frustumCulled = false;
    this.launchFallaway.add(heatBatch);
    // Reuse Scoria's already-created geometry/material families. Parenting the
    // clone under the exact same transform as the tangent patch makes the
    // crust, road, atmosphere, and globe one departing body rather than four
    // independently animated props.
    this.launchSourcePlanet = new THREE.Group();
    this.launchSourcePlanet.name = 'scoria-attached-source-globe';
    const sourceSphere = this.planetMeshes[0].userData.sphere;
    const sourceSphereClone = sourceSphere.clone();
    sourceSphereClone.name = 'scoria-attached-source-surface';
    sourceSphereClone.material = sourceSphere.material.clone();
    sourceSphereClone.material.color.set(0x55271f);
    sourceSphereClone.material.roughness = 0.94;
    sourceSphereClone.material.metalness = 0;
    sourceSphereClone.material.emissive.set(0x190402);
    sourceSphereClone.material.emissiveIntensity = 0.17;
    sourceSphereClone.castShadow = false;
    sourceSphereClone.receiveShadow = false;
    this.launchSourcePlanet.add(sourceSphereClone);
    this.launchSourcePlanet.position.set(0, -LAUNCH_FALLAWAY_RADIUS, LAUNCH_FALLAWAY_CENTER_Z);
    this.launchSourcePlanet.scale.setScalar(LAUNCH_FALLAWAY_RADIUS);
    this.launchFallaway.add(this.launchSourcePlanet);
    this.launchFallaway.userData = {
      terrainMaterial: fallawayTerrain,
      roadMaterial: fallawayRoad,
      heatMaterial: fallawayHeat,
      geometryMetadata: {
        terrain: { ...fallawayTerrainGeometry.userData.launchFallaway },
        road: { ...fallawayRoadGeometry.userData.launchFallaway },
        heat: { ...fallawayHeatGeometry.userData.launchFallaway },
      },
      fraction: 1,
      fall: 1,
      fade: 0,
      atmosphereEscape: 1,
      destinationAtmosphere: 0,
      tangentGap: 1.05,
      departureScale: 1,
    };
    this.launchFallaway.visible = false;
    this.worldRoot.add(this.launchFallaway);
    this.launchRings = Array.from({ length: 4 }, (_, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.8 + i * 0.45, 0.095, 8, 56),
        new THREE.MeshBasicMaterial({ color: 0xffaa52, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      ring.visible = false;
      this.worldRoot.add(ring);
      return ring;
    });
    this.decorRoot = new THREE.Group();
    this.worldRoot.add(this.decorRoot);
    this.decorLayout = [];
    this.decorMeshes = [];
    this.authoredBatches = [];
    // The first launch loop is revisited during startup prewarming. Retaining
    // these authored batches means their GPU buffers survive the return to
    // Scoria instead of being disposed and recreated at the live transition.
    this.retainedDecorKeys = new Set(['planet-1', 'space-1', 'planet-2']);
    this.decorCache = new Map();
    this.activeDecorKey = null;
  }

  createStaticScoriaSurface() {
    // Both package hydration and the procedural authoring/fallback path share
    // this immutable P1 terrain-color profile. Keeping its initialization
    // outside the procedural builder prevents baked startup from leaving the
    // retained rolling/parity profile at Float64Array's zero defaults.
    const ground = new THREE.Color(0xb49e93);
    const shoulder = new THREE.Color(0xc7a99c);
    const shoulderDeltaR = shoulder.r - ground.r;
    const shoulderDeltaG = shoulder.g - ground.g;
    const shoulderDeltaB = shoulder.b - ground.b;
    for (let column = 0; column < this.terrainColumns; column += 1) {
      const amount = this.terrainColumnProfile.shoulderAmount[column];
      this.terrainColumnProfile.colorR[column] = ground.r + shoulderDeltaR * amount;
      this.terrainColumnProfile.colorG[column] = ground.g + shoulderDeltaG * amount;
      this.terrainColumnProfile.colorB[column] = ground.b + shoulderDeltaB * amount;
    }
    if (this.useStaticScoriaSurface && this.bakedStaticScoriaSurfacePackage) {
      try {
        return this.createBakedStaticScoriaSurface(this.bakedStaticScoriaSurfacePackage);
      } catch (error) {
        this.staticScoriaPackageTelemetry.source = 'procedural-fallback';
        this.staticScoriaPackageTelemetry.status = 'hydrate-failed';
        this.staticScoriaPackageTelemetry.fallbackReason = error?.message ?? String(error);
        this.bakedStaticScoriaSurfacePackage = null;
      }
    }
    return this.createProceduralStaticScoriaSurface();
  }

  validateBakedStaticScoriaSurface(packageData) {
    const manifest = packageData?.manifest;
    const expected = [
      { name: 'static-scoria-road', role: 'road', rows: 1134, columns: 15, indexCount: 95172, attributes: { position: 51030, color: 51030, uv: 34020, normal: 51030 } },
      { name: 'static-scoria-terrain', role: 'terrain', rows: 568, columns: 34, indexCount: 112266, attributes: { position: 57936, color: 57936, uv: 38624, normal: 57936 } },
      { name: 'static-scoria-lava-left', role: 'lava-left', rows: 568, columns: 9, indexCount: 27216, attributes: { position: 15336, color: 15336, uv: 10224, normal: 15336 } },
      { name: 'static-scoria-lava-right', role: 'lava-right', rows: 568, columns: 9, indexCount: 27216, attributes: { position: 15336, color: 15336, uv: 10224, normal: 15336 } },
      ...Array.from({ length: 5 }, (_, index) => ({
        name: `static-scoria-line-${index}`,
        role: `line-${index}`,
        rows: 568,
        columns: 1,
        indexCount: 0,
        attributes: { position: 1704 },
      })),
    ];
    if (!manifest || manifest.geometryCount !== 9 || manifest.arrayCount !== 25
      || manifest.residentBytes !== 2605844 || packageData.geometries?.length !== expected.length) {
      throw new Error('Baked static Scoria package failed the exact 9/25/2,605,844 census.');
    }
    const expectedRoadProgress = makeStaticScoriaProgressRows(COURSE[0].length, 7.5);
    const expectedSurfaceProgress = makeStaticScoriaProgressRows(COURSE[0].length, 15);
    const compareProgress = (actual, reference, label) => {
      if (!(actual instanceof Float64Array) || actual.length !== reference.length) {
        throw new Error(`Baked static Scoria ${label} row count is not exact.`);
      }
      const actualBytes = new Uint8Array(actual.buffer, actual.byteOffset, actual.byteLength);
      const referenceBytes = new Uint8Array(reference.buffer, reference.byteOffset, reference.byteLength);
      for (let index = 0; index < referenceBytes.length; index += 1) {
        if (actualBytes[index] !== referenceBytes[index]) {
          throw new Error(`Baked static Scoria ${label} differs at byte ${index}.`);
        }
      }
    };
    compareProgress(packageData.roadProgress, expectedRoadProgress, 'roadProgress');
    compareProgress(packageData.surfaceProgress, expectedSurfaceProgress, 'surfaceProgress');
    for (let index = 0; index < expected.length; index += 1) {
      const record = packageData.geometries[index];
      const invariant = expected[index];
      if (record.name !== invariant.name || record.role !== invariant.role
        || record.rows !== invariant.rows || record.columns !== invariant.columns) {
        throw new Error(`Baked static Scoria geometry ${index} identity/topology is not exact.`);
      }
      if (record.drawRange?.start !== 0 || record.drawRange?.count !== null) {
        throw new Error(`Baked static Scoria ${record.name} authoring draw range is not full/infinite.`);
      }
      if (invariant.indexCount === 0) {
        if (record.index || record.indexArray) throw new Error(`Baked static Scoria ${record.name} must be non-indexed.`);
      } else if (record.index?.count !== invariant.indexCount
        || record.index?.type !== 'Uint16Array'
        || record.index?.itemSize !== 1
        || record.index?.normalized
        || record.index?.usage !== THREE.StaticDrawUsage
        || record.indexArray?.length !== invariant.indexCount) {
        throw new Error(`Baked static Scoria ${record.name} index contract is not exact.`);
      }
      const expectedNames = Object.keys(invariant.attributes);
      const actualNames = record.attributes.map((attribute) => attribute.name);
      if (actualNames.length !== expectedNames.length
        || actualNames.some((name, attributeIndex) => name !== expectedNames[attributeIndex])) {
        throw new Error(`Baked static Scoria ${record.name} attribute insertion order is not exact.`);
      }
      for (const attribute of record.attributes) {
        const expectedCount = invariant.attributes[attribute.name];
        const expectedItemSize = attribute.name === 'uv' ? 2 : 3;
        if (attribute.count !== expectedCount || attribute.type !== 'Float32Array'
          || attribute.itemSize !== expectedItemSize || attribute.normalized
          || attribute.usage !== THREE.StaticDrawUsage
          || record.attributeArrays[attribute.name]?.length !== expectedCount) {
          throw new Error(`Baked static Scoria ${record.name}.${attribute.name} contract is not exact.`);
        }
        if (record.attributeArrays[attribute.name].buffer !== packageData.buffer) {
          throw new Error(`Baked static Scoria ${record.name}.${attribute.name} is not a zero-copy package view.`);
        }
      }
      if (record.indexArray && record.indexArray.buffer !== packageData.buffer) {
        throw new Error(`Baked static Scoria ${record.name}.index is not a zero-copy package view.`);
      }
    }
    return true;
  }

  createBakedStaticScoriaSurface(packageData) {
    // Structural validation, exact topology validation and every typed view are
    // complete before the first Three object is allocated.
    const startedAt = performance.now();
    const geometries = [];
    try {
      this.validateBakedStaticScoriaSurface(packageData);
      for (const record of packageData.geometries) {
        const geometry = new THREE.BufferGeometry();
        geometries.push(geometry);
        geometry.name = record.name;
        for (const name of ['position', 'color', 'uv', 'normal']) {
          const descriptor = record.attributes.find((attribute) => attribute.name === name);
          if (!descriptor) continue;
          const attribute = new THREE.BufferAttribute(
            record.attributeArrays[name],
            descriptor.itemSize,
            descriptor.normalized,
          );
          attribute.setUsage(descriptor.usage);
          geometry.setAttribute(name, attribute);
        }
        if (record.index) {
          const index = new THREE.BufferAttribute(
            record.indexArray,
            record.index.itemSize,
            record.index.normalized,
          );
          index.setUsage(record.index.usage);
          geometry.setIndex(index);
        }
        geometry.setDrawRange(
          record.drawRange.start,
          record.drawRange.count === null ? Infinity : record.drawRange.count,
        );
        geometry.boundingBox = new THREE.Box3(
          new THREE.Vector3().fromArray(record.bounds.box.min),
          new THREE.Vector3().fromArray(record.bounds.box.max),
        );
        geometry.boundingSphere = new THREE.Sphere(
          new THREE.Vector3().fromArray(record.bounds.sphere.center),
          record.bounds.sphere.radius,
        );
      }
      const byName = new Map(geometries.map((geometry) => [geometry.name, geometry]));
      const hydrateMs = Number((performance.now() - startedAt).toFixed(3));
      this.staticScoriaPackageTelemetry.source = 'baked';
      this.staticScoriaPackageTelemetry.status = 'hydrated';
      this.staticScoriaPackageTelemetry.hydrateMs = hydrateMs;
      this.staticScoriaPackageTelemetry.assetBytes = packageData.bytes;
      return this.finalizeStaticScoriaSurface({
        roadProgress: packageData.roadProgress,
        surfaceProgress: packageData.surfaceProgress,
        roadSamples: [],
        surfaceSamples: [],
        roadGeometry: byName.get('static-scoria-road'),
        terrainGeometry: byName.get('static-scoria-terrain'),
        lavaGeometries: [
          byName.get('static-scoria-lava-left'),
          byName.get('static-scoria-lava-right'),
        ],
        lineGeometries: Array.from({ length: 5 }, (_, index) => byName.get(`static-scoria-line-${index}`)),
        buildMs: hydrateMs,
        buildSliceDetails: [{ name: 'baked-package-hydrate', ms: hydrateMs, bytes: packageData.manifest.residentBytes }],
        buildSource: 'baked',
        packageBuffer: packageData.buffer,
        packageManifest: packageData.manifest,
      });
    } catch (error) {
      this.staticScoriaPackageTelemetry.hydrateMs = Number((performance.now() - startedAt).toFixed(3));
      for (const geometry of geometries) geometry.dispose();
      this.staticScoriaSurfacePackageRequest?.abandon?.(
        `Baked static Scoria package was discarded after hydration failure: ${error?.message ?? error}`,
      );
      throw error;
    }
  }

  createProceduralStaticScoriaSurface() {
    const disabled = {
      enabled: false,
      requested: this.useStaticScoriaSurface,
      active: false,
      activeMode: 'rolling',
      buildMs: 0,
      maxBuildSliceMs: 0,
      bytes: 0,
      upload: { status: 'not-required', totalMs: 0, maxSliceMs: 0, programDelta: 0 },
      parity: null,
      controlVersions: null,
    };
    if (!this.useStaticScoriaSurface) return disabled;

    const startedAt = performance.now();
    const setupStartedAt = performance.now();
    const buildSliceDetails = [];
    const recordBuildSlice = (name, sliceStartedAt, bytes = 0) => {
      buildSliceDetails.push({
        name,
        ms: Number((performance.now() - sliceStartedAt).toFixed(3)),
        bytes,
      });
    };
    const segment = COURSE[0];
    const roadProgress = makeStaticScoriaProgressRows(segment.length, 7.5);
    const surfaceProgress = makeStaticScoriaProgressRows(segment.length, 15);
    const makeTrackRow = () => ({
      x: 0,
      y: 0,
      z: 0,
      cos: 1,
      sin: 0,
      width: 0,
      normalX: 0,
      normalY: 1,
      normalZ: 0,
      worldProgress: 0,
      fraction: 0,
    });
    const makeCourseRow = () => ({ x: 0, y: 0, bank: 0, width: 0 });
    const roadSamples = Array.from({ length: roadProgress.length }, makeTrackRow);
    const roadCourseSamples = Array.from({ length: roadProgress.length }, makeCourseRow);
    const roadNextSamples = Array.from({ length: roadProgress.length }, makeCourseRow);
    const surfaceSamples = Array.from({ length: surfaceProgress.length }, makeTrackRow);
    const surfaceCourseSamples = Array.from({ length: surfaceProgress.length }, makeCourseRow);
    const surfaceNextSamples = Array.from({ length: surfaceProgress.length }, makeCourseRow);

    const roadBase = new THREE.Color(0xa08f87);
    const accent = new THREE.Color(segment.accent);
    const roadAccentR = accent.r - roadBase.r;
    const roadAccentG = accent.g - roadBase.g;
    const roadAccentB = accent.b - roadBase.b;

    recordBuildSlice('setup-and-samples', setupStartedAt);
    let sliceStartedAt = performance.now();
    const roadGeometry = makeRibbonGeometry(
      roadProgress.length,
      this.roadColumns,
      THREE.StaticDrawUsage,
      false,
    );
    roadGeometry.name = 'static-scoria-road';
    writeHighQualityScoriaRibbonRows(
      segment,
      0,
      0,
      0,
      roadProgress.length,
      0,
      0,
      roadSamples,
      roadCourseSamples,
      roadNextSamples,
      roadGeometry.attributes.position.array,
      roadGeometry.attributes.color.array,
      roadGeometry.attributes.uv.array,
      this.roadColumnProfile,
      null,
      null,
      null,
      this.terrainColumnProfile,
      roadBase.r,
      roadBase.g,
      roadBase.b,
      roadAccentR,
      roadAccentG,
      roadAccentB,
      accent.r,
      accent.g,
      accent.b,
      {
        worldProgresses: roadProgress,
        worldCoordinates: true,
        writeRoad: true,
        writeTerrain: false,
      },
    );
    reconstructRibbonNormals(roadGeometry, roadProgress.length, this.roadColumns);
    recordBuildSlice('road-allocate-write-normal', sliceStartedAt, geometryResidentBytes(roadGeometry));

    sliceStartedAt = performance.now();
    const terrainGeometry = makeRibbonGeometry(
      surfaceProgress.length,
      this.terrainColumns,
      THREE.StaticDrawUsage,
      false,
    );
    terrainGeometry.name = 'static-scoria-terrain';
    writeHighQualityScoriaRibbonRows(
      segment,
      0,
      0,
      0,
      surfaceProgress.length,
      0,
      0,
      surfaceSamples,
      surfaceCourseSamples,
      surfaceNextSamples,
      null,
      null,
      null,
      this.roadColumnProfile,
      terrainGeometry.attributes.position.array,
      terrainGeometry.attributes.color.array,
      terrainGeometry.attributes.uv.array,
      this.terrainColumnProfile,
      roadBase.r,
      roadBase.g,
      roadBase.b,
      roadAccentR,
      roadAccentG,
      roadAccentB,
      accent.r,
      accent.g,
      accent.b,
      {
        worldProgresses: surfaceProgress,
        worldCoordinates: true,
        writeRoad: false,
        writeTerrain: true,
      },
    );
    reconstructRibbonNormals(terrainGeometry, surfaceProgress.length, this.terrainColumns);
    recordBuildSlice(
      'terrain-allocate-write-normal',
      sliceStartedAt,
      geometryResidentBytes(terrainGeometry),
    );

    sliceStartedAt = performance.now();
    const lavaGeometries = [-1, 1].map((side) => {
      const geometry = makeRibbonGeometry(
        surfaceProgress.length,
        this.lavaColumns,
        THREE.StaticDrawUsage,
        false,
      );
      geometry.name = `static-scoria-lava-${side < 0 ? 'left' : 'right'}`;
      const positions = geometry.attributes.position.array;
      const normals = geometry.attributes.normal.array;
      const uvs = geometry.attributes.uv.array;
      for (let row = 0; row < surfaceSamples.length; row += 1) {
        const sample = surfaceSamples[row];
        const meander = Math.sin(sample.worldProgress * 0.0037 + side * 1.8)
          + Math.sin(sample.worldProgress * 0.0091 - side * 0.7) * 0.38;
        const center = side * sample.width * (1.48 + meander * 0.12);
        const slowPocket = Math.sin(sample.worldProgress * 0.0063 + side) * 0.5 + 0.5;
        const brokenPocket = Math.sin(sample.worldProgress * 0.019 - side * 2.1) * 0.5 + 0.5;
        const channelPocket = Math.pow(slowPocket * (0.54 + brokenPocket * 0.46), 1.55);
        const halfWidth = sample.width * (0.018 + channelPocket * 0.14);
        const rippleAngle = sample.worldProgress * 0.035 + side;
        const rippleSin = Math.sin(rippleAngle);
        const rippleCos = Math.cos(rippleAngle);
        for (let column = 0; column < this.lavaColumns; column += 1) {
          const across = this.lavaColumnProfile.across[column];
          const lateral = center + across * halfWidth;
          const index = (row * this.lavaColumns + column) * 3;
          const uvIndex = (row * this.lavaColumns + column) * 2;
          const channelRipple = (rippleSin * this.lavaColumnProfile.rippleCos[column]
            + rippleCos * this.lavaColumnProfile.rippleSin[column]) * 0.16;
          positions[index] = sample.x + lateral * sample.cos;
          positions[index + 1] = sample.y + lateral * sample.sin - 0.82 + channelRipple * 0.46;
          positions[index + 2] = sample.z;
          normals[index] = sample.normalX;
          normals[index + 1] = sample.normalY;
          normals[index + 2] = sample.normalZ;
          uvs[uvIndex] = this.lavaColumnProfile.uv[column];
          uvs[uvIndex + 1] = sample.worldProgress / 42;
        }
      }
      return geometry;
    });
    recordBuildSlice(
      'lava-allocate-write',
      sliceStartedAt,
      lavaGeometries.reduce((sum, geometry) => sum + geometryResidentBytes(geometry), 0),
    );

    sliceStartedAt = performance.now();
    const lineDefinitions = [
      ...this.laneLines.map((line) => ({ lane: line.userData.lane })),
      ...this.edgeLines.map((line) => ({ lane: line.userData.side })),
    ];
    const lineGeometries = lineDefinitions.map(({ lane }, index) => {
      const geometry = makeLineGeometry(surfaceProgress.length, THREE.StaticDrawUsage);
      geometry.name = `static-scoria-line-${index}`;
      const positions = geometry.attributes.position.array;
      for (let row = 0; row < surfaceSamples.length; row += 1) {
        const sample = surfaceSamples[row];
        const offset = row * 3;
        positions[offset] = sample.x + lane * sample.width * sample.cos;
        positions[offset + 1] = sample.y + lane * sample.width * sample.sin + 0.16;
        positions[offset + 2] = sample.z;
      }
      return geometry;
    });
    recordBuildSlice(
      'lines-allocate-write',
      sliceStartedAt,
      lineGeometries.reduce((sum, geometry) => sum + geometryResidentBytes(geometry), 0),
    );

    const geometries = [roadGeometry, terrainGeometry, ...lavaGeometries, ...lineGeometries];
    sliceStartedAt = performance.now();
    for (const geometry of geometries) {
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
    recordBuildSlice('bounds', sliceStartedAt);
    return this.finalizeStaticScoriaSurface({
      roadProgress,
      surfaceProgress,
      roadSamples,
      surfaceSamples,
      roadGeometry,
      terrainGeometry,
      lavaGeometries,
      lineGeometries,
      buildMs: Number((performance.now() - startedAt).toFixed(3)),
      buildSliceDetails,
      buildSource: this.forceProceduralStaticScoriaSurface ? 'procedural-authoring' : 'procedural-fallback',
      packageBuffer: null,
      packageManifest: null,
    });
  }

  finalizeStaticScoriaSurface({
    roadProgress,
    surfaceProgress,
    roadSamples,
    surfaceSamples,
    roadGeometry,
    terrainGeometry,
    lavaGeometries,
    lineGeometries,
    buildMs,
    buildSliceDetails,
    buildSource,
    packageBuffer,
    packageManifest,
  }) {
    const geometries = [roadGeometry, terrainGeometry, ...lavaGeometries, ...lineGeometries];
    if (geometries.some((geometry) => !geometry?.isBufferGeometry)) {
      throw new Error('Static Scoria surface assembly received an incomplete geometry family.');
    }
    const bytes = geometries.reduce((sum, geometry) => sum + geometryResidentBytes(geometry), 0);
    const lines = [...this.laneLines, ...this.edgeLines];
    const drawables = [this.road, this.terrain, ...this.lavaRibbons, ...lines];
    const makeRangeRecord = () => ({
      firstRow: 0,
      lastRowExclusive: 0,
      rowSegments: 0,
      firstProgress: null,
      lastProgress: null,
    });
    const surface = {
      enabled: true,
      requested: true,
      active: false,
      activeMode: 'static-p1',
      roadProgress,
      surfaceProgress,
      roadSamples,
      surfaceSamples,
      roadGeometry,
      terrainGeometry,
      lavaGeometries,
      lineGeometries,
      lines,
      drawables,
      geometries,
      bytes,
      buildSource,
      // Retain the fetched package explicitly for the entire surface lifetime;
      // every baked BufferAttribute is a zero-copy view into this buffer.
      packageBuffer,
      packageManifest,
      packageAssetBytes: packageBuffer?.byteLength ?? 0,
      buildMs,
      maxBuildSliceMs: Number(Math.max(0, ...buildSliceDetails.map((slice) => slice.ms)).toFixed(3)),
      buildSlices: buildSliceDetails.map((slice) => slice.ms),
      buildSliceDetails,
      upload: { status: 'pending', totalMs: 0, maxSliceMs: 0, programDelta: null },
      parity: null,
      controlVersions: null,
      uploadPhase: 'constructed',
      expectedUploadKeys: [],
      uploadEvents: [],
      controlUploadEventCount: null,
      currentWindow: { minProgress: 0, maxProgress: STATIC_SCORIA_FORWARD_WINDOW },
      currentRoadRange: makeRangeRecord(),
      currentSurfaceRange: makeRangeRecord(),
      currentLavaRanges: lavaGeometries.map(makeRangeRecord),
      currentLineRanges: lineGeometries.map(makeRangeRecord),
    };
    for (const geometry of geometries) {
      const uploadAttributes = [
        ...(geometry.index ? [['index', geometry.index]] : []),
        ...Object.entries(geometry.attributes),
      ];
      for (const [name, attribute] of uploadAttributes) {
        const key = `${geometry.id}:${name}`;
        surface.expectedUploadKeys.push(key);
        // BufferAttribute invokes this callback immediately after WebGL's
        // bufferData/bufferSubData call. Retain that literal driver-facing
        // evidence: WeakSet bookkeeping alone cannot prove residency.
        attribute.onUpload(() => {
          surface.uploadEvents.push({
            key,
            geometryId: geometry.id,
            geometryName: geometry.name,
            attribute: name,
            bytes: attribute.array?.byteLength ?? 0,
            version: attribute.version,
            phase: surface.uploadPhase,
            liveFrameSerial: this.liveFrameSerial,
            atMs: Number(performance.now().toFixed(3)),
          });
        });
      }
    }
    if (this.staticScoriaParityEnabled) {
      surface.parity = this.measureStaticScoriaParity(surface);
    }
    return surface;
  }

  exportStaticScoriaSurfacePackage() {
    const surface = this.staticScoriaSurface;
    if (!surface?.enabled) throw new Error('Static Scoria surface is not enabled for package authoring.');
    return encodeStaticScoriaSurfacePackage({
      roadProgress: surface.roadProgress,
      surfaceProgress: surface.surfaceProgress,
      geometries: [
        { geometry: surface.roadGeometry, role: 'road', rows: surface.roadProgress.length, columns: this.roadColumns },
        { geometry: surface.terrainGeometry, role: 'terrain', rows: surface.surfaceProgress.length, columns: this.terrainColumns },
        { geometry: surface.lavaGeometries[0], role: 'lava-left', rows: surface.surfaceProgress.length, columns: this.lavaColumns },
        { geometry: surface.lavaGeometries[1], role: 'lava-right', rows: surface.surfaceProgress.length, columns: this.lavaColumns },
        ...surface.lineGeometries.map((geometry, index) => ({
          geometry,
          role: `line-${index}`,
          rows: surface.surfaceProgress.length,
          columns: 1,
        })),
      ],
    });
  }

  measureStaticScoriaParity(surface) {
    const segment = COURSE[0];
    const makeTrackRow = () => ({
      x: 0,
      y: 0,
      z: 0,
      cos: 1,
      sin: 0,
      width: 0,
      normalX: 0,
      normalY: 1,
      normalZ: 0,
      worldProgress: 0,
      fraction: 0,
    });
    const makeCourseRow = () => ({ x: 0, y: 0, bank: 0, width: 0 });
    const roadBase = new THREE.Color(0xa08f87);
    const accent = new THREE.Color(segment.accent);
    const roadAccentR = accent.r - roadBase.r;
    const roadAccentG = accent.g - roadBase.g;
    const roadAccentB = accent.b - roadBase.b;
    const buildReference = (progressRows, columns, writeRoad) => {
      const geometry = makeRibbonGeometry(
        progressRows.length,
        columns,
        THREE.StaticDrawUsage,
        false,
      );
      const samples = Array.from({ length: progressRows.length }, makeTrackRow);
      const courseSamples = Array.from({ length: progressRows.length }, makeCourseRow);
      const nextSamples = Array.from({ length: progressRows.length }, makeCourseRow);
      writeHighQualityScoriaRibbonRows(
        segment,
        0,
        0,
        0,
        progressRows.length,
        0,
        0,
        samples,
        courseSamples,
        nextSamples,
        writeRoad ? geometry.attributes.position.array : null,
        writeRoad ? geometry.attributes.color.array : null,
        writeRoad ? geometry.attributes.uv.array : null,
        this.roadColumnProfile,
        writeRoad ? null : geometry.attributes.position.array,
        writeRoad ? null : geometry.attributes.color.array,
        writeRoad ? null : geometry.attributes.uv.array,
        this.terrainColumnProfile,
        roadBase.r,
        roadBase.g,
        roadBase.b,
        roadAccentR,
        roadAccentG,
        roadAccentB,
        accent.r,
        accent.g,
        accent.b,
        {
          worldProgresses: progressRows,
          worldCoordinates: true,
          writeRoad,
          writeTerrain: !writeRoad,
        },
      );
      reconstructRibbonNormals(geometry, progressRows.length, columns);
      return geometry;
    };
    const referenceRoad = buildReference(surface.roadProgress, this.roadColumns, true);
    const referenceTerrain = buildReference(surface.surfaceProgress, this.terrainColumns, false);
    let bakedAttributeBitMismatches = 0;
    let interiorNormalBitMismatches = 0;
    const countAttributeMismatches = (actualGeometry, referenceGeometry, name) => {
      const actual = actualGeometry.attributes[name].array;
      const expected = referenceGeometry.attributes[name].array;
      const actualBits = new Uint32Array(actual.buffer, actual.byteOffset, actual.length);
      const expectedBits = new Uint32Array(expected.buffer, expected.byteOffset, expected.length);
      for (let index = 0; index < actualBits.length; index += 1) {
        if (actualBits[index] !== expectedBits[index]) bakedAttributeBitMismatches += 1;
      }
    };
    for (const [actual, reference] of [
      [surface.roadGeometry, referenceRoad],
      [surface.terrainGeometry, referenceTerrain],
    ]) {
      for (const name of ['position', 'color', 'uv']) {
        countAttributeMismatches(actual, reference, name);
      }
    }
    const countInteriorNormalMismatches = (actualGeometry, referenceGeometry, rows, columns) => {
      const actual = actualGeometry.attributes.normal.array;
      const expected = referenceGeometry.attributes.normal.array;
      const actualBits = new Uint32Array(actual.buffer, actual.byteOffset, actual.length);
      const expectedBits = new Uint32Array(expected.buffer, expected.byteOffset, expected.length);
      const first = columns * 3;
      const last = (rows - 1) * columns * 3;
      for (let index = first; index < last; index += 1) {
        if (actualBits[index] !== expectedBits[index]) interiorNormalBitMismatches += 1;
      }
    };
    countInteriorNormalMismatches(
      surface.roadGeometry,
      referenceRoad,
      surface.roadProgress.length,
      this.roadColumns,
    );
    countInteriorNormalMismatches(
      surface.terrainGeometry,
      referenceTerrain,
      surface.surfaceProgress.length,
      this.terrainColumns,
    );
    referenceRoad.dispose();
    referenceTerrain.dispose();

    const positions = surface.roadGeometry.attributes.position.array;
    const exactSample = { x: 0, y: 0, bank: 0, width: 0 };
    let denseRoadContactMaxError = 0;
    let denseRoadContactRmsSum = 0;
    let denseRoadContactComparisons = 0;
    const progressSamples = 4096;
    for (let progressIndex = 0; progressIndex <= progressSamples; progressIndex += 1) {
      const progress = segment.length * progressIndex / progressSamples;
      const upper = Math.min(
        surface.roadProgress.length - 1,
        Math.max(1, lowerBoundProgress(surface.roadProgress, progress)),
      );
      const lower = upper - 1;
      const lowerProgress = surface.roadProgress[lower];
      const upperProgress = surface.roadProgress[upper];
      const amount = (progress - lowerProgress) / Math.max(0.000001, upperProgress - lowerProgress);
      const sample = sampleScoriaTrackInto(segment, progress, exactSample);
      const cos = Math.cos(sample.bank);
      const sin = Math.sin(sample.bank);
      for (let column = 0; column < this.roadColumns; column += 1) {
        const lowerOffset = (lower * this.roadColumns + column) * 3;
        const upperOffset = (upper * this.roadColumns + column) * 3;
        const actualX = lerp(positions[lowerOffset], positions[upperOffset], amount);
        const actualY = lerp(positions[lowerOffset + 1], positions[upperOffset + 1], amount);
        const actualZ = lerp(positions[lowerOffset + 2], positions[upperOffset + 2], amount);
        const lateral = this.roadColumnProfile.u[column] * sample.width;
        const vertical = this.roadColumnProfile.vertical[column];
        const expectedX = sample.x + lateral * cos - vertical * sin;
        const expectedY = sample.y - 0.52 + lateral * sin + vertical * cos;
        const expectedZ = -progress;
        const error = Math.hypot(
          actualX - expectedX,
          actualY - expectedY,
          actualZ - expectedZ,
        );
        denseRoadContactMaxError = Math.max(denseRoadContactMaxError, error);
        denseRoadContactRmsSum += error * error;
        denseRoadContactComparisons += 1;
      }
    }

    const roadLipIndex = surface.roadProgress.indexOf(segment.length);
    const surfaceLipIndex = surface.surfaceProgress.indexOf(segment.length);
    const roadFallawayKneeIndex = surface.roadProgress.indexOf(segment.length + 92);
    const surfaceFallawayKneeIndex = surface.surfaceProgress.indexOf(segment.length + 92);
    const roadTailIndex = surface.roadProgress.length - 1;
    const surfaceTailIndex = surface.surfaceProgress.length - 1;
    const tailProgress = surface.roadProgress[roadTailIndex];
    const tailSample = sampleScoriaTrackInto(segment, tailProgress, exactSample);
    const centerColumn = Math.floor(this.roadColumns / 2);
    const centerOffset = (roadTailIndex * this.roadColumns + centerColumn) * 3;
    const tailFallaway = smoothstep(0, 92, tailProgress - segment.length) ** 2 * 680;
    const expectedTailY = tailSample.y - 0.52
      + this.roadColumnProfile.vertical[centerColumn] * Math.cos(tailSample.bank)
      - tailFallaway;
    return {
      bakedAttributeBitMismatches,
      interiorNormalBitMismatches,
      denseRoadContactMaxError,
      denseRoadContactRmsError: Math.sqrt(
        denseRoadContactRmsSum / Math.max(1, denseRoadContactComparisons),
      ),
      denseRoadContactComparisons,
      roadLipIndex,
      surfaceLipIndex,
      roadFallawayKneeIndex,
      surfaceFallawayKneeIndex,
      roadTailIndex,
      surfaceTailIndex,
      roadLipProgress: surface.roadProgress[roadLipIndex] ?? null,
      surfaceLipProgress: surface.surfaceProgress[surfaceLipIndex] ?? null,
      roadFallawayKneeProgress: surface.roadProgress[roadFallawayKneeIndex] ?? null,
      surfaceFallawayKneeProgress: surface.surfaceProgress[surfaceFallawayKneeIndex] ?? null,
      roadTailProgress: tailProgress,
      surfaceTailProgress: surface.surfaceProgress[surfaceTailIndex],
      tailFallaway,
      tailCenterYError: Math.abs(positions[centerOffset + 1] - expectedTailY),
    };
  }

  activateStaticScoriaSurface() {
    const surface = this.staticScoriaSurface;
    if (!surface?.enabled) return false;
    if (surface.active) return true;
    this.road.geometry = surface.roadGeometry;
    this.terrain.geometry = surface.terrainGeometry;
    for (let index = 0; index < this.lavaRibbons.length; index += 1) {
      this.lavaRibbons[index].geometry = surface.lavaGeometries[index];
    }
    for (let index = 0; index < surface.lines.length; index += 1) {
      surface.lines[index].geometry = surface.lineGeometries[index];
    }
    surface.active = true;
    surface.activeMode = 'static-p1';
    return true;
  }

  activateRollingTrackSurface() {
    const surface = this.staticScoriaSurface;
    if (!surface?.active) return false;
    this.road.geometry = this.roadWorkGeometry;
    this.terrain.geometry = this.terrainWorkGeometry;
    for (let index = 0; index < this.lavaRibbons.length; index += 1) {
      this.lavaRibbons[index].geometry = this.lavaWorkGeometries[index];
    }
    for (let index = 0; index < surface.lines.length; index += 1) {
      surface.lines[index].geometry = this.lineWorkGeometries[index];
    }
    for (const object of surface.drawables) object.position.set(0, 0, 0);
    surface.active = false;
    surface.activeMode = 'rolling';
    return true;
  }

  setStaticRibbonDrawRange(geometry, rows, columns, minProgress, maxProgress, out) {
    const firstRow = Math.max(0, lowerBoundProgress(rows, minProgress) - 1);
    const lastRowExclusive = Math.min(rows.length, upperBoundProgress(rows, maxProgress) + 1);
    const rowSegments = Math.max(0, lastRowExclusive - firstRow - 1);
    const indicesPerRow = Math.max(0, columns - 1) * 6;
    geometry.setDrawRange(firstRow * indicesPerRow, rowSegments * indicesPerRow);
    out.firstRow = firstRow;
    out.lastRowExclusive = lastRowExclusive;
    out.rowSegments = rowSegments;
    out.firstProgress = rows[firstRow] ?? null;
    out.lastProgress = rows[lastRowExclusive - 1] ?? null;
    return out;
  }

  setStaticLineDrawRange(geometry, rows, minProgress, maxProgress, out) {
    const firstRow = Math.max(0, lowerBoundProgress(rows, minProgress) - 1);
    const lastRowExclusive = Math.min(rows.length, upperBoundProgress(rows, maxProgress) + 1);
    geometry.setDrawRange(firstRow, Math.max(0, lastRowExclusive - firstRow));
    out.firstRow = firstRow;
    out.lastRowExclusive = lastRowExclusive;
    out.rowSegments = Math.max(0, lastRowExclusive - firstRow - 1);
    out.firstProgress = rows[firstRow] ?? null;
    out.lastProgress = rows[lastRowExclusive - 1] ?? null;
    return out;
  }

  updateStaticScoriaSurface(current) {
    const surface = this.staticScoriaSurface;
    this.activateStaticScoriaSurface();
    const x = -current.x;
    const y = -current.y;
    const z = this.logicalProgress;
    for (let index = 0; index < surface.drawables.length; index += 1) {
      surface.drawables[index].position.set(x, y, z);
    }
    const minProgress = this.logicalProgress - STATIC_SCORIA_REAR_PAD;
    const maxProgress = this.logicalProgress + STATIC_SCORIA_FORWARD_WINDOW;
    surface.currentWindow.minProgress = minProgress;
    surface.currentWindow.maxProgress = maxProgress;
    this.setStaticRibbonDrawRange(
      surface.roadGeometry,
      surface.roadProgress,
      this.roadColumns,
      minProgress,
      maxProgress,
      surface.currentRoadRange,
    );
    this.setStaticRibbonDrawRange(
      surface.terrainGeometry,
      surface.surfaceProgress,
      this.terrainColumns,
      minProgress,
      maxProgress,
      surface.currentSurfaceRange,
    );
    for (let index = 0; index < surface.lavaGeometries.length; index += 1) {
      this.setStaticRibbonDrawRange(
        surface.lavaGeometries[index],
        surface.surfaceProgress,
        this.lavaColumns,
        minProgress,
        maxProgress,
        surface.currentLavaRanges[index],
      );
    }
    for (let index = 0; index < surface.lineGeometries.length; index += 1) {
      this.setStaticLineDrawRange(
        surface.lineGeometries[index],
        surface.surfaceProgress,
        minProgress,
        maxProgress,
        surface.currentLineRanges[index],
      );
    }
  }

  captureStaticScoriaVersions() {
    const surface = this.staticScoriaSurface;
    if (!surface?.enabled) return [];
    return surface.geometries.map((geometry) => ({
      id: geometry.id,
      index: geometry.index?.version ?? 0,
      attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([name, attribute]) => [
        name,
        attribute.version,
      ])),
    }));
  }

  staticScoriaSurfaceDiagnostics() {
    const surface = this.staticScoriaSurface;
    if (!surface) return { enabled: false, activeMode: 'rolling' };
    const versions = this.captureStaticScoriaVersions();
    const controlVersions = surface.controlVersions ?? versions;
    let versionChanges = 0;
    let postIgniteUploadBytes = 0;
    versions.forEach((entry, geometryIndex) => {
      const baseline = controlVersions[geometryIndex];
      if (!baseline) return;
      if (entry.index !== baseline.index) {
        versionChanges += 1;
        postIgniteUploadBytes += surface.geometries[geometryIndex].index?.array?.byteLength ?? 0;
      }
      for (const [name, version] of Object.entries(entry.attributes)) {
        if (version === baseline.attributes?.[name]) continue;
        versionChanges += 1;
        postIgniteUploadBytes += surface.geometries[geometryIndex].attributes[name]?.array?.byteLength ?? 0;
      }
    });
    const geometryDiagnostics = surface.enabled
      ? surface.geometries.map((geometry) => ({
        id: geometry.id,
        name: geometry.name,
        indexed: Boolean(geometry.index),
        indexUsage: geometry.index?.usage ?? null,
        indexCount: geometry.index?.count ?? 0,
        drawRange: { ...geometry.drawRange },
        residentBytes: geometryResidentBytes(geometry),
        attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([name, attribute]) => [
          name,
          {
            count: attribute.count,
            itemSize: attribute.itemSize,
            usage: attribute.usage,
            version: attribute.version,
            bytes: attribute.array?.byteLength ?? 0,
          },
        ])),
      }))
      : [];
    const controlUploadEventCount = Number.isInteger(surface.controlUploadEventCount)
      ? surface.controlUploadEventCount
      : null;
    const preControlUploadEvents = controlUploadEventCount == null
      ? []
      : surface.uploadEvents.slice(0, controlUploadEventCount);
    const postControlUploadEvents = controlUploadEventCount == null
      ? []
      : surface.uploadEvents.slice(controlUploadEventCount);
    const preControlUploadKeys = new Set(preControlUploadEvents.map((event) => event.key));
    const actualResidentBeforeControl = surface.enabled
      && controlUploadEventCount != null
      && surface.expectedUploadKeys.every((key) => preControlUploadKeys.has(key));
    return {
      enabled: surface.enabled,
      requested: surface.requested,
      active: surface.active,
      activeMode: surface.activeMode,
      bytes: surface.bytes,
      buildSource: surface.buildSource ?? 'disabled',
      package: {
        ...this.staticScoriaPackageTelemetry,
        requestStatus: this.staticScoriaSurfacePackageRequest?.status ?? null,
        requestFetchMs: Number.isFinite(this.staticScoriaSurfacePackageRequest?.fetchMs)
          ? Number(this.staticScoriaSurfacePackageRequest.fetchMs.toFixed(3))
          : null,
        requestResponseMs: Number.isFinite(this.staticScoriaSurfacePackageRequest?.responseMs)
          ? Number(this.staticScoriaSurfacePackageRequest.responseMs.toFixed(3))
          : null,
        requestShaMs: Number.isFinite(this.staticScoriaSurfacePackageRequest?.shaMs)
          ? Number(this.staticScoriaSurfacePackageRequest.shaMs.toFixed(3))
          : null,
        requestDecodeMs: Number.isFinite(this.staticScoriaSurfacePackageRequest?.decodeMs)
          ? Number(this.staticScoriaSurfacePackageRequest.decodeMs.toFixed(3))
          : null,
        requestReadyMs: Number.isFinite(this.staticScoriaSurfacePackageRequest?.readyMs)
          ? Number(this.staticScoriaSurfacePackageRequest.readyMs.toFixed(3))
          : null,
        retainedBufferBytes: surface.packageBuffer?.byteLength ?? 0,
        packageAssetBytes: surface.packageAssetBytes ?? 0,
      },
      buildMs: surface.buildMs,
      maxBuildSliceMs: surface.maxBuildSliceMs,
      buildSlices: [...(surface.buildSlices ?? [])],
      buildSliceDetails: surface.buildSliceDetails?.map((slice) => ({ ...slice })) ?? [],
      roadRows: surface.roadProgress?.length ?? 0,
      surfaceRows: surface.surfaceProgress?.length ?? 0,
      roadFirstProgress: surface.roadProgress?.[0] ?? null,
      roadLipProgress: surface.roadProgress?.includes(COURSE[0].length) ? COURSE[0].length : null,
      roadFallawayKneeProgress: surface.roadProgress?.includes(COURSE[0].length + 92)
        ? COURSE[0].length + 92
        : null,
      roadTailProgress: surface.roadProgress?.at(-1) ?? null,
      surfaceFirstProgress: surface.surfaceProgress?.[0] ?? null,
      surfaceLipProgress: surface.surfaceProgress?.includes(COURSE[0].length) ? COURSE[0].length : null,
      surfaceFallawayKneeProgress: surface.surfaceProgress?.includes(COURSE[0].length + 92)
        ? COURSE[0].length + 92
        : null,
      surfaceTailProgress: surface.surfaceProgress?.at(-1) ?? null,
      currentRoadRange: surface.currentRoadRange ? { ...surface.currentRoadRange } : null,
      currentSurfaceRange: surface.currentSurfaceRange ? { ...surface.currentSurfaceRange } : null,
      currentLavaRanges: surface.currentLavaRanges?.map((range) => ({ ...range })) ?? [],
      currentLineRanges: surface.currentLineRanges?.map((range) => ({ ...range })) ?? [],
      currentWindow: surface.currentWindow ? { ...surface.currentWindow } : null,
      transform: surface.enabled ? {
        logicalProgress: this.logicalProgress,
        road: this.road.position.toArray(),
        terrain: this.terrain.position.toArray(),
        lava: this.lavaRibbons.map((ribbon) => ribbon.position.toArray()),
        lines: surface.lines.map((line) => line.position.toArray()),
      } : null,
      geometries: geometryDiagnostics,
      upload: { ...surface.upload },
      expectedUploadKeys: [...(surface.expectedUploadKeys ?? [])],
      actualUploadEvents: surface.uploadEvents?.map((event) => ({ ...event })) ?? [],
      controlUploadEventCount,
      actualResidentBeforeControl,
      residentBeforeControl: actualResidentBeforeControl,
      declaredResidentBeforeControl: surface.enabled
        ? surface.geometries.every((geometry) => this.deferredGeometryUploads.has(geometry))
        : false,
      preControlUploadBytes: preControlUploadEvents.reduce((sum, event) => sum + event.bytes, 0),
      postControlUploadEvents: postControlUploadEvents.map((event) => ({ ...event })),
      postControlUploadBytes: postControlUploadEvents.reduce((sum, event) => sum + event.bytes, 0),
      versions,
      controlVersions,
      versionChanges,
      postIgniteUploadBytes,
      parity: surface.parity ? { ...surface.parity } : null,
    };
  }

  createSpeedLines() {
    this.speedLineCount = this.quality === 'high' ? 64 : this.quality === 'medium' ? 56 : 48;
    this.speedLinePositions = new Float32Array(this.speedLineCount * 2 * 3);
    this.speedLineData = Array.from({ length: this.speedLineCount }, (_, i) => {
      const angle = visualUnit(i, 311) * Math.PI * 2;
      const near = i < this.speedLineCount * 0.78;
      // Real optic flow is quiet at the focus of expansion and strongest in
      // the periphery. Keep a generous central aiming cone completely clean;
      // depth, not random 2D angle, supplies the streak divergence.
      const radius = near
        ? 34 + Math.pow(visualUnit(i, 733), 0.52) * 64
        : 72 + Math.pow(visualUnit(i, 733), 0.58) * 62;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.58 + 5,
        z: near
          ? -28 - visualUnit(i, 997) * 330
          : -330 - visualUnit(i, 997) * 430,
        initialX: Math.cos(angle) * radius,
        initialY: Math.sin(angle) * radius * 0.58 + 5,
        initialZ: near
          ? -28 - visualUnit(i, 997) * 330
          : -330 - visualUnit(i, 997) * 430,
        near,
        phase: i * 0.17,
        wraps: 0,
      };
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', setAttrDynamic(new THREE.BufferAttribute(this.speedLinePositions, 3)));
    this.speedLines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
      color: 0x8adfff,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }));
    this.speedLines.frustumCulled = false;
    this.scene.add(this.speedLines);

    // Nearby ground reference is indispensable to surface speed. These marks
    // are not HUD motion confetti: they sit a few centimetres above the sampled
    // road, follow its bank/curve, and remain anchored in world progress while
    // the player tears past. One batched draw gives every planet a physical
    // optic-flow layer without blurring the vehicle or combat corridor.
    this.roadFlowCount = this.quality === 'high' ? 64 : this.quality === 'medium' ? 52 : 44;
    this.roadFlowPositions = new Float32Array(this.roadFlowCount * 2 * 3);
    this.roadFlowColors = new Float32Array(this.roadFlowCount * 2 * 3);
    this.roadFlowData = Array.from({ length: this.roadFlowCount }, (_, index) => {
      let lateral = visualUnit(index, 2707) * 1.84 - 0.92;
      if (Math.abs(lateral) < 0.28) lateral += lateral < 0 ? -0.3 : 0.3;
      return {
        lateral,
        z: -18 - visualUnit(index, 3181) * 610,
        initialLateral: lateral,
        initialZ: -18 - visualUnit(index, 3181) * 610,
        wraps: 0,
        authoredVariation: 0.74 + visualUnit(index, 6011) * 0.26,
        farBrightnessScale: 0.22 + visualUnit(index, 6221) * 0.12,
      };
    });
    const roadFlowGeometry = new THREE.BufferGeometry();
    roadFlowGeometry.setAttribute('position', setAttrDynamic(new THREE.BufferAttribute(this.roadFlowPositions, 3)));
    roadFlowGeometry.setAttribute('color', setAttrDynamic(new THREE.BufferAttribute(this.roadFlowColors, 3)));
    this.roadFlow = new THREE.LineSegments(roadFlowGeometry, new THREE.LineBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.045,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: true,
    }));
    this.roadFlow.frustumCulled = false;
    this.worldRoot.add(this.roadFlow);
  }

  createAtmosphereFlow() {
    this.ashCount = this.quality === 'high' ? 760 : this.quality === 'medium' ? 480 : 260;
    this.ashPositions = new Float32Array(this.ashCount * 3);
    this.ashColors = new Float32Array(this.ashCount * 3);
    this.ashData = Array.from({ length: this.ashCount }, (_, index) => {
      const a = Math.sin(index * 12.9898 + 3.17) * 43758.5453;
      const b = Math.sin(index * 78.233 + 8.91) * 12414.379;
      const c = Math.sin(index * 39.425 + 1.03) * 9521.713;
      const unitA = a - Math.floor(a);
      const unitB = b - Math.floor(b);
      const unitC = c - Math.floor(c);
      const phase = unitB * Math.PI * 2;
      const heat = unitC > 0.86 ? 1 : 0;
      const colorValue = 0.16 + (index % 7) * 0.012;
      const colorIndex = index * 3;
      if (heat) {
        this.ashColors[colorIndex] = 1;
        this.ashColors[colorIndex + 1] = 0.32;
        this.ashColors[colorIndex + 2] = 0.08;
      } else {
        this.ashColors[colorIndex] = colorValue * 1.08;
        this.ashColors[colorIndex + 1] = colorValue * 0.9;
        this.ashColors[colorIndex + 2] = colorValue * 0.82;
      }
      const z = 45 - unitC * 2550;
      return {
        x: (unitA * 2 - 1) * (20 + unitC * 76),
        y: -0.2 + unitB * (6 + unitC * 34),
        z,
        initialZ: z,
        speed: 0.42 + unitA * 0.7,
        phaseSin: Math.sin(phase),
        phaseCos: Math.cos(phase),
      };
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', setAttrDynamic(new THREE.BufferAttribute(this.ashPositions, 3)));
    // Ash composition is immutable. Keep its exact authored color buffer static;
    // only particle positions flow toward the camera during play.
    geometry.setAttribute('color', new THREE.BufferAttribute(this.ashColors, 3));
    this.ash = new THREE.Points(geometry, new THREE.PointsMaterial({
      size: 0.24,
      sizeAttenuation: true,
      map: makeSoftDiscTexture(48),
      alphaTest: 0.025,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: true,
    }));
    this.ash.frustumCulled = false;
    this.scene.add(this.ash);
  }

  updateAtmosphereFlow(state, segment, dt) {
    const scoria = segment.shortId === 'planet-1';
    const departure = segment.shortId === 'space-1'
      ? 1 - smoothstep(0.004, SPACE_WEAPONS_ARM_FRACTION, getSegmentFraction(state))
      : 0;
    const active = scoria || departure > 0.001;
    this.ash.visible = active;
    this.ash.material.opacity = scoria ? 0.4 : 0.4 * departure;
    if (!active) return;
    const lowPhase = state.time * 0.3;
    const lowPhaseSin = Math.sin(lowPhase);
    const lowPhaseCos = Math.cos(lowPhase);
    const highPhase = state.time * 0.72;
    const highPhaseSin = Math.sin(highPhase);
    const highPhaseCos = Math.cos(highPhase);
    for (let i = 0; i < this.ashData.length; i += 1) {
      const mote = this.ashData[i];
      mote.z += state.speed * dt * mote.speed;
      if (mote.z > 55) mote.z -= 2600;
      const index = i * 3;
      this.ashPositions[index] = mote.x
        + (lowPhaseSin * mote.phaseCos + lowPhaseCos * mote.phaseSin) * 2.4;
      this.ashPositions[index + 1] = mote.y
        + (highPhaseSin * mote.phaseCos + highPhaseCos * mote.phaseSin) * 0.5;
      this.ashPositions[index + 2] = mote.z;
    }
    this.ash.geometry.attributes.position.needsUpdate = true;
    this.ash.material.size = 0.22 + clamp((state.speed - segment.baseSpeed) / 400, 0, 1) * 0.24;
  }

  addAuthoredBatch(geometry, material, items, { castShadow = false, receiveShadow = false } = {}) {
    const batch = new THREE.InstancedMesh(geometry, material, items.length);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.castShadow = castShadow;
    batch.receiveShadow = receiveShadow;
    batch.frustumCulled = false;
    this.decorRoot.add(batch);
    this.decorMeshes.push(batch);
    this.authoredBatches.push({ mesh: batch, items });
    return batch;
  }

  prepareStaticCourseBatch(batch, segment) {
    const hiddenMatrix = new THREE.Matrix4().compose(
      new THREE.Vector3(0, -10000, 0),
      new THREE.Quaternion(),
      new THREE.Vector3(0.001, 0.001, 0.001),
    );
    const matrices = batch.items.map((item) => {
      const sample = trackSample(segment, item.progress);
      const cos = Math.cos(sample.bank);
      const sin = Math.sin(sample.bank);
      const lateral = Number.isFinite(item.lateral)
        ? item.lateral
        : (item.side ?? 0) * sample.width * (item.offset ?? 0);
      this.dummy.position.set(
        sample.x + lateral * cos,
        sample.y + lateral * sin + (item.y ?? 0),
        -item.progress,
      );
      this.dummy.rotation.set(item.rx ?? 0, item.ry ?? 0, sample.bank + (item.rz ?? 0));
      const widthMultiplier = item.widthScale ? sample.width : 1;
      this.dummy.scale.set(
        (item.sx ?? 1) * widthMultiplier,
        item.sy ?? 1,
        item.sz ?? 1,
      );
      this.dummy.updateMatrix();
      return this.dummy.matrix.clone();
    });
    const stableOrder = (Array.isArray(batch.mesh.material)
      ? batch.mesh.material
      : [batch.mesh.material]).some((material) => material?.transparent === true);
    const slotByItem = new Int32Array(batch.items.length).fill(-1);
    const itemBySlot = new Int32Array(batch.items.length).fill(-1);
    batch.staticCourse = {
      segmentId: segment.shortId,
      matrices,
      hiddenMatrix,
      // Two is an impossible boolean value and forces the first staged update
      // to populate every instance before the opening render uploads it.
      visible: new Uint8Array(batch.items.length).fill(2),
      stableOrder,
      activeCount: 0,
      slotByItem,
      itemBySlot,
      changedSlots: [],
    };
    // Capacity remains batch.items.length in instanceMatrix, but no off-window
    // instance is submitted. Detached prewarm clones explicitly prime one slot
    // for a truly empty visible set, so count zero never loses program/resource
    // residency before controls.
    batch.mesh.count = 0;
  }

  prepareDynamicCourseBatch(batch, segment) {
    const hiddenMatrix = new THREE.Matrix4().compose(
      new THREE.Vector3(0, -10000, 0),
      new THREE.Quaternion(),
      new THREE.Vector3(0.001, 0.001, 0.001),
    );
    // Authored progress never changes. Retain the exact course sample and
    // bank/lateral products once instead of asking sim.trackSample to allocate
    // a fresh object for every spinning Cathedral shard on every frame.
    const poses = batch.items.map((item) => {
      const sample = trackSample(segment, item.progress);
      const cos = Math.cos(sample.bank);
      const sin = Math.sin(sample.bank);
      const lateral = Number.isFinite(item.lateral)
        ? item.lateral
        : (item.side ?? 0) * sample.width * (item.offset ?? 0);
      return {
        x: sample.x + lateral * cos,
        y: sample.y + lateral * sin + (item.y ?? 0),
        bank: sample.bank,
        widthMultiplier: item.widthScale ? sample.width : 1,
      };
    });
    batch.dynamicCourse = {
      segmentId: segment.shortId,
      poses,
      hiddenMatrix,
      // Match the static path's impossible initial state so the first staged
      // update records every retained-dynamic visibility decision without
      // allocating or probing old matrices during live play.
      visible: new Uint8Array(batch.items.length).fill(2),
    };
  }

  disposeDecorMeshes(meshes) {
    const geometries = new Set();
    const materials = new Set();
    for (const item of meshes) {
      this.decorRoot.remove(item);
      if (item.geometry) geometries.add(item.geometry);
      const itemMaterials = Array.isArray(item.material) ? item.material : [item.material];
      for (const material of itemMaterials) if (material) materials.add(material);
    }
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }

  deactivateCurrentDecor() {
    if (!this.decorMeshes.length) {
      this.activeDecorKey = null;
      this.authoredBatches = [];
      this.decorLayout = [];
      return;
    }
    const retained = this.activeDecorKey ? this.decorCache.get(this.activeDecorKey) : null;
    if (retained) {
      for (const meshItem of retained.meshes) meshItem.visible = false;
    } else {
      this.disposeDecorMeshes(this.decorMeshes);
    }
    this.decorMeshes = [];
    this.authoredBatches = [];
    this.decorLayout = [];
    this.activeDecorKey = null;
  }

  activateCachedDecor(key) {
    const cached = this.decorCache.get(key);
    if (!cached) return false;
    this.decorMeshes = cached.meshes;
    this.authoredBatches = cached.authoredBatches;
    this.decorLayout = cached.decorLayout;
    this.activeDecorKey = key;
    for (const meshItem of cached.meshes) meshItem.visible = true;
    return true;
  }

  retainCurrentDecor(key) {
    const entry = {
      meshes: [...this.decorMeshes],
      authoredBatches: [...this.authoredBatches],
      decorLayout: this.decorLayout,
    };
    this.decorCache.set(key, entry);
    this.activeDecorKey = key;
  }

  clearDecorCache() {
    const allMeshes = new Set(this.decorMeshes);
    for (const entry of this.decorCache.values()) {
      for (const meshItem of entry.meshes) allMeshes.add(meshItem);
    }
    this.disposeDecorMeshes([...allMeshes]);
    this.decorCache.clear();
    this.decorMeshes = [];
    this.authoredBatches = [];
    this.decorLayout = [];
    this.activeDecorKey = null;
  }

  rebuildScoriaDecor() {
    this.authoredBatches = [];
    const basaltItems = [];
    for (let progress = 180, index = 0; progress < 7350; index += 1) {
      const fraction = progress / 8200;
      const canyon = smoothstep(0.47, 0.6, fraction) * (1 - smoothstep(0.74, 0.81, fraction));
      for (const side of [-1, 1]) {
        const presence = visualUnit(index * 2 + (side > 0 ? 1 : 0), 4319);
        if (!canyon && presence < 0.44) continue;
        const widthNoise = visualUnit(index * 2 + (side > 0 ? 1 : 0), 4513);
        const heightNoise = visualUnit(index * 2 + (side > 0 ? 1 : 0), 4721);
        const leanNoise = visualUnit(index * 2 + (side > 0 ? 1 : 0), 4931) * 2 - 1;
        const height = 5.2 + Math.pow(heightNoise, 1.42) * 17.5 + canyon * (8 + widthNoise * 12.5);
        basaltItems.push({
          progress: progress + side * (widthNoise - 0.5) * 58,
          side,
          offset: canyon ? 1.34 + widthNoise * 0.58 : 1.52 + widthNoise * 0.96,
          y: height * 0.46 - (canyon ? 0.9 : 3.2),
          sx: 1.8 + widthNoise * 1.65,
          sy: height,
          sz: 1.55 + presence * 1.7,
          rx: leanNoise * 0.16,
          ry: visualUnit(index, side > 0 ? 5171 : 5381) * Math.PI * 2,
          rz: leanNoise * 0.14 + side * (0.025 + canyon * 0.07),
        });
      }
      // The interval itself is authored noise, so the horizon never resolves
      // into evenly spaced fenceposts. Average density remains slightly below
      // the previous 112 m grid and the instanced draw count stays identical.
      progress += 76 + visualUnit(index, 5591) * 96;
    }
    const basaltMaterial = new THREE.MeshStandardMaterial({
      // The authored albedo is already dark volcanic rock. Keep the material
      // multiplier close to neutral so raking light reveals its aggregate and
      // fractured faces instead of multiplying them into a black silhouette.
      color: 0xc6b4ac,
      map: this.planetOneArt.terrain.map,
      normalMap: this.planetOneArt.terrain.normalMap,
      normalScale: new THREE.Vector2(0.92, 0.92),
      roughnessMap: this.planetOneArt.terrain.roughnessMap,
      emissive: 0x120503,
      emissiveIntensity: 0.035,
      roughness: 0.96,
      metalness: 0.025,
      envMapIntensity: 0.72,
    });
    this.addAuthoredBatch(makeScoriaSpireGeometry(this.quality === 'low' ? 0 : this.quality === 'medium' ? 1 : 2, 17), basaltMaterial, basaltItems, {
      castShadow: this.quality === 'high', receiveShadow: true,
    });

    // One existing instanced draw carries two physical scales: a frequent,
    // close slag tier that tears through the lower periphery, and a smaller
    // distant tier that keeps the shoulder field continuous. Their deterministic
    // staggering keeps the racing corridor completely open.
    const rubbleItems = [];
    for (let progress = 82, index = 0; progress < 8050; progress += 44, index += 1) {
      for (const side of [-1, 1]) {
        for (let tier = 0; tier < 2; tier += 1) {
          // Keep close parallax frequent without increasing the original
          // instance/triangle budget: the small outer field only needs every
          // second beat because its screen-space motion is correspondingly low.
          if (tier === 1 && index % 2 !== 0) continue;
          const wobble = Math.sin(index * 4.173 + side * 1.7 + tier * 2.4);
          const sizeStep = ((index * 7 + tier * 3) % 9) / 8;
          const nearTier = tier === 0;
          const size = nearTier
            ? 1.05 + sizeStep * 1.35
            : 0.38 + sizeStep * 0.72;
          rubbleItems.push({
            progress: progress + side * (8 + tier * 19),
            side,
            offset: nearTier
              ? 1.08 + (wobble * 0.5 + 0.5) * 0.2
              : 1.76 + (wobble * 0.5 + 0.5) * 0.34,
            y: -0.54 + size * (nearTier ? 0.46 : 0.42),
            sx: size * (nearTier ? 1.2 : 1.32),
            sy: size * ((nearTier ? 0.68 : 0.62) + (index % 4) * 0.09),
            sz: size * ((nearTier ? 0.96 : 0.85) + ((index + tier) % 3) * 0.16),
            rx: wobble * 0.35,
            ry: index * 1.931 + side,
            rz: side * wobble * 0.18,
          });
        }
      }
    }
    const rubbleMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0bdb3,
      map: this.planetOneArt.terrain.map,
      normalMap: this.planetOneArt.terrain.normalMap,
      normalScale: new THREE.Vector2(0.84, 0.84),
      roughnessMap: this.planetOneArt.terrain.roughnessMap,
      roughness: 0.97,
      metalness: 0.03,
      envMapIntensity: 0.7,
    });
    this.addAuthoredBatch(makeFracturedRockGeometry(this.quality === 'low' ? 0 : 1, 131), rubbleMaterial, rubbleItems, {
      receiveShadow: true,
    });

    const ventItems = [];
    const scoria = COURSE[0];
    const ventCenters = Array.from({ length: 12 }, (_, index) => ({ gate: index + 2, progress: (index + 2) * scoria.gimmick.spacing }));
    ventCenters.forEach(({ gate, progress }) => {
      const target = gateTarget(scoria, gate);
      for (let rib = -2; rib <= 2; rib += 1) {
        ventItems.push({
          progress: progress + rib * 23,
          side: 0,
          offset: 0,
          lateral: target + rib * 0.52,
          y: 0.05,
          sx: 0.38 + (2 - Math.abs(rib)) * 0.055,
          sy: 0.58,
          sz: 0.82,
          rx: 0,
          ry: 0,
          rz: 0,
        });
      }
    });
    const ventShell = new THREE.MeshStandardMaterial({
      color: 0x78574d,
      map: this.planetOneArt.terrain.map,
      normalMap: this.planetOneArt.terrain.normalMap,
      normalScale: new THREE.Vector2(0.72, 0.72),
      roughnessMap: this.planetOneArt.terrain.roughnessMap,
      roughness: 0.88,
      metalness: 0.22,
      envMapIntensity: 1.1,
    });
    const ventGlow = new THREE.MeshBasicMaterial({
      color: 0xff8a35, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    this.addAuthoredBatch(new THREE.CylinderGeometry(0.58, 1.34, 1, 14, 4), ventShell, ventItems, { castShadow: true });
    this.addAuthoredBatch(new THREE.CylinderGeometry(0.25, 0.5, 1.06, 16), ventGlow, ventItems);

    const pillarItems = [];
    const beamItems = [];
    const launchRibItems = [];
    const launchSeamItems = [];
    for (let progress = 6460, index = 0; progress < 8120; progress += 205, index += 1) {
      const height = 9 + index * 0.55;
      for (const side of [-1, 1]) {
        pillarItems.push({ progress, side, offset: 1.12, y: height * 0.5 - 0.4, sx: 0.38, sy: height, sz: 0.48, rx: 0, ry: 0, rz: 0 });
        launchRibItems.push({
          progress: progress + side * 12,
          side,
          offset: 1.5 + (index % 2) * 0.16,
          y: height * 0.53 - 1.2,
          sx: 2.3 + (index % 3) * 0.35,
          sy: height * 0.82,
          sz: 2.1 + (index % 2) * 0.55,
          rx: 0.05 * (index % 3 - 1),
          ry: index * 1.27,
          rz: -side * (0.14 + index * 0.008),
        });
        launchSeamItems.push({
          progress: progress + side * 11,
          side,
          offset: 1.28,
          y: height * 0.48,
          sx: 0.12,
          sy: height * 0.58,
          sz: 0.16,
          rx: 0,
          ry: 0,
          rz: -side * 0.08,
        });
      }
      beamItems.push({ progress, side: 0, offset: 0, y: height - 0.35, sx: 2.38, sy: 0.38, sz: 0.55, widthScale: true, rx: 0, ry: 0, rz: 0 });
      // Only an inset service strip glows. The load-bearing crossmember remains
      // physical metal, avoiding the old full-width neon rectangle at launch.
      launchSeamItems.push({ progress: progress - 0.8, side: 0, offset: 0, y: height - 0.7, sx: 2.14, sy: 0.055, sz: 0.16, widthScale: true, rx: 0, ry: 0, rz: 0 });
    }
    const gantryMaterial = new THREE.MeshStandardMaterial({ color: 0x8b6350, metalness: 0.82, roughness: 0.28, envMapIntensity: 1.7 });
    const gantryBeamMaterial = new THREE.MeshStandardMaterial({ color: 0x765f55, emissive: 0x2b0a03, emissiveIntensity: 0.12, metalness: 0.88, roughness: 0.31, envMapIntensity: 1.85 });
    const gantryHot = new THREE.MeshStandardMaterial({ color: 0x77412d, emissive: 0xff5a20, emissiveIntensity: 1.48, metalness: 0.42, roughness: 0.3 });
    this.addAuthoredBatch(new THREE.BoxGeometry(1, 1, 1), gantryMaterial, pillarItems, { castShadow: true });
    this.addAuthoredBatch(new THREE.BoxGeometry(1, 1, 1), gantryBeamMaterial, beamItems, { castShadow: true });
    this.addAuthoredBatch(makeScoriaSpireGeometry(this.quality === 'low' ? 0 : this.quality === 'medium' ? 1 : 2, 211), basaltMaterial.clone(), launchRibItems, {
      castShadow: this.quality === 'high', receiveShadow: true,
    });
    this.addAuthoredBatch(new THREE.BoxGeometry(1, 1, 1), gantryHot.clone(), launchSeamItems);
    for (const batch of this.authoredBatches) this.prepareStaticCourseBatch(batch, COURSE[0]);
  }

  rebuildShardCathedralDecor() {
    this.authoredBatches = [];
    const shardItems = [];
    const fractureItems = [];
    const archItems = [];
    const archGlowItems = [];
    const naveSpines = [];
    // Three four-beat bars of structural bays make the crossing read as one
    // impossible nave rather than isolated asteroid props. The player and all
    // three rivals are clamped to +/- 0.48 of the 22 m course width, while the
    // nearest stone begins outside +/- 17 m: the centre stays physically and
    // compositionally clean even under a full dodge.
    // Match the 320 m gameplay beat exactly and clear the final 1,560 m for the
    // Cathedral -> Thunderglass arrival. Architecture never collides visually
    // with the reentry shell, cloud wall, or landing silhouette.
    const baySpacing = 320;
    const cells = Array.from({ length: 12 }, (_, index) => 320 + index * baySpacing);
    cells.forEach((center, cell) => {
      // The launch trajectory still carries 15-18 m of physical lift through
      // the first bars. Raise their crowns gradually, then settle the nave to
      // its close-pass racing height only after the rocket has descended.
      const earlyClearance = 18 * (1 - smoothstep(640, 2240, center));
      for (const side of [-1, 1]) {
        for (let tier = 0; tier < 3; tier += 1) {
          const lateral = side * (20.6 + tier * 6.4 + (cell % 2) * 0.65);
          const y = 3.2 + tier * 10.8 + Math.sin(cell * 1.7 + tier) * 0.85;
          const progress = center + (tier - 1) * 12;
          const sy = 23 + ((cell + tier) % 3) * 3.4;
          shardItems.push({
            progress,
            lateral,
            y,
            sx: 3.9 + tier * 0.82,
            sy,
            sz: 5.2 + ((cell + tier) % 2) * 1.45,
            rx: (tier - 1) * 0.075,
            ry: cell * 0.37 + tier * 0.73,
            rz: -side * (0.14 + tier * 0.04),
            spin: side * (0.0008 + tier * 0.00025),
          });
          fractureItems.push({
            progress: progress - 1.5,
            lateral: lateral - side * (3.42 + tier * 0.42),
            y: y + sy * 0.05,
            sx: 0.1,
            sy: sy * 0.46,
            sz: 0.075,
            rx: (tier - 1) * 0.075,
            ry: cell * 0.37 + tier * 0.73,
            rz: -side * (0.14 + tier * 0.04) + 0.045,
          });
        }
        // A split inner crown gives each vault visible shoulders while the
        // central opening remains large enough to frame the current target.
        shardItems.push({
          progress: center,
          lateral: side * 16.7,
          y: 28.5 + earlyClearance + (cell % 3) * 1.15,
          sx: 3.25,
          sy: 11.4,
          sz: 4.3,
          rx: side * 0.24,
          ry: 0.35 + cell * 0.42,
          rz: side * 0.46,
          spin: -side * 0.0007,
        });

        // Longitudinal mineral spines visually connect adjacent bays. One
        // high side spine per gap shares an instanced draw and stops the nave from
        // disappearing between transverse arches at hyperspeed.
        if (cell < cells.length - 1) {
          naveSpines.push({
            progress: center + baySpacing * 0.5,
            lateral: side * 22.2,
            y: 17.5 + earlyClearance,
            sx: 2.35,
            sy: 1.45,
            sz: baySpacing - 20,
            rx: 0,
            ry: 0,
            rz: side * -0.025,
          });
        }
      }
      // Thirteen thick voussoirs form an unmistakable load-bearing arch. The
      // old nine thin bars vanished into the background and read as a wire.
      for (let rib = 0; rib < 13; rib += 1) {
        const angle = Math.PI * (0.105 + (rib / 12) * 0.79);
        const tangent = Math.atan2(Math.cos(angle) * 21.6, -Math.sin(angle) * 20.8);
        const item = {
          progress: center,
          lateral: Math.cos(angle) * 20.8,
          y: 7.4 + earlyClearance + Math.sin(angle) * 21.6,
          sx: 4.05,
          sy: 1.18,
          sz: 2.35,
          rx: 0,
          ry: 0,
          rz: tangent,
        };
        archItems.push(item);
        if (rib % 2 === 0) {
          archGlowItems.push({
            ...item,
            progress: center - 1.45,
            sx: 2.65,
            sy: 0.085,
            sz: 0.13,
          });
        }
      }
      // Sparse detached chips sell age without turning the aiming corridor back
      // into asteroid confetti.
      for (let fragment = 0; fragment < 4; fragment += 1) {
        const side = fragment % 2 === 0 ? -1 : 1;
        const tier = Math.floor(fragment / 2);
        shardItems.push({
          progress: center - 104 + fragment * 69,
          lateral: side * (23.5 + tier * 5.2),
          y: 9 + ((fragment * 7 + cell * 3) % 19),
          sx: 1.05 + (fragment % 3) * 0.48,
          sy: 1.8 + ((fragment + cell) % 4) * 0.65,
          sz: 1.1 + ((fragment * 2 + cell) % 3) * 0.44,
          rx: fragment * 0.37,
          ry: cell * 1.41 + fragment * 0.83,
          rz: side * (0.18 + fragment * 0.035),
          spin: side * (0.0015 + (fragment % 3) * 0.0006),
        });
      }
    });
    const rockMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8f9aa0,
      map: this.planetOneArt.shardCathedral.map,
      normalMap: this.planetOneArt.shardCathedral.normalMap,
      normalScale: new THREE.Vector2(0.44, 0.44),
      roughnessMap: this.planetOneArt.shardCathedral.roughnessMap,
      emissive: 0x06141b,
      emissiveIntensity: 0.1,
      roughness: 0.73,
      metalness: 0.16,
      clearcoat: 0.12,
      clearcoatRoughness: 0.58,
      envMapIntensity: 1.55,
    });
    const fractureMaterial = new THREE.MeshStandardMaterial({
      color: 0x76cbd7,
      emissive: 0x238ca8,
      emissiveIntensity: 1.18,
      roughness: 0.36,
      metalness: 0.24,
    });
    const shardGeometry = makeFracturedRockGeometry(this.quality === 'low' ? 1 : 2, 73);
    this.addAuthoredBatch(shardGeometry, rockMaterial, shardItems);
    this.addAuthoredBatch(new THREE.BoxGeometry(1, 1, 1), fractureMaterial, [...fractureItems, ...archGlowItems]);
    this.addAuthoredBatch(new THREE.BoxGeometry(1, 1, 1), rockMaterial.clone(), [...archItems, ...naveSpines]);

    const navigationItems = [];
    for (let gate = 1; gate < 16; gate += 1) {
      const progress = gate * 320;
      const target = gateTarget(COURSE[1], gate);
      const earlyClearance = 18 * (1 - smoothstep(640, 2240, progress));
      for (const side of [-1, 1]) {
        navigationItems.push({
          progress,
          lateral: target + side * 8.4,
          y: earlyClearance + side * 1.2,
          sx: 0.13,
          sy: 3.2,
          sz: 0.13,
          rx: 0,
          ry: 0,
          rz: side * 0.14,
        });
      }
    }
    const navigationMaterial = new THREE.MeshStandardMaterial({
      color: 0x4e9aa8,
      emissive: 0x247b92,
      emissiveIntensity: 0.72,
      roughness: 0.32,
      metalness: 0.44,
    });
    this.addAuthoredBatch(new THREE.OctahedronGeometry(1, 0), navigationMaterial, navigationItems);
    for (const batch of this.authoredBatches) {
      if (batch.items.every((item) => !(item.spin ?? 0))) {
        this.prepareStaticCourseBatch(batch, COURSE[1]);
      } else {
        this.prepareDynamicCourseBatch(batch, COURSE[1]);
      }
    }
  }

  rebuildDecor(segment, seed) {
    const retainedKey = this.retainedDecorKeys.has(segment.shortId) ? segment.shortId : null;
    this.deactivateCurrentDecor();
    if (retainedKey && this.activateCachedDecor(retainedKey)) return;
    if (segment.shortId === 'planet-1') {
      this.decorLayout = [];
      this.rebuildScoriaDecor();
      if (retainedKey) this.retainCurrentDecor(retainedKey);
      return;
    }
    if (segment.shortId === 'space-1') {
      this.decorLayout = [];
      this.rebuildShardCathedralDecor();
      if (retainedKey) this.retainCurrentDecor(retainedKey);
      return;
    }
    const count = this.quality === 'high' ? 118 : this.quality === 'medium' ? 82 : 52;
    this.decorLayout = seededLayout(segment, seed, count);
    const spec = this.decorSpec(segment);
    const materialA = new THREE.MeshStandardMaterial({
      color: spec.colorA ?? segment.shoulder,
      emissive: spec.emissiveA ?? 0x000000,
      emissiveIntensity: spec.emissiveIntensity ?? 0.2,
      roughness: spec.roughness ?? 0.7,
      metalness: spec.metalness ?? 0.15,
    });
    const materialB = new THREE.MeshStandardMaterial({
      color: spec.colorB ?? segment.ground,
      emissive: spec.emissiveB ?? segment.accent,
      emissiveIntensity: spec.emissiveIntensityB ?? 0.24,
      roughness: spec.roughnessB ?? 0.55,
      metalness: spec.metalnessB ?? 0.25,
    });
    const primary = new THREE.InstancedMesh(spec.primary, materialA, count);
    const secondary = new THREE.InstancedMesh(spec.secondary, materialB, count);
    primary.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    secondary.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    primary.castShadow = this.quality === 'high' && segment.type === 'planet';
    secondary.castShadow = false;
    primary.frustumCulled = false;
    secondary.frustumCulled = false;
    this.decorRoot.add(primary, secondary);
    this.decorMeshes = [primary, secondary];
    if (retainedKey) this.retainCurrentDecor(retainedKey);
  }

  decorSpec(segment) {
    const common = { colorA: segment.shoulder, colorB: segment.ground, emissiveB: segment.accent };
    switch (segment.decor) {
      case 'basalt-forge':
        return { ...common, primary: new THREE.CylinderGeometry(0.7, 2.2, 12, 6), secondary: new THREE.ConeGeometry(0.38, 6, 6), roughness: 0.92, metalness: 0.08, emissiveIntensityB: 0.85 };
      case 'storm-ocean':
        return { ...common, primary: new THREE.ConeGeometry(0.6, 14, 7), secondary: new THREE.TorusGeometry(1.8, 0.12, 6, 24), metalness: 0.78, roughness: 0.18, emissiveIntensityB: 1.1 };
      case 'living-jungle':
        return { ...common, primary: new THREE.CylinderGeometry(0.7, 1.45, 14, 7), secondary: new THREE.IcosahedronGeometry(2.6, 1), roughness: 0.86, metalness: 0.02 };
      case 'crystal-glacier':
        return { ...common, primary: new THREE.ConeGeometry(1.3, 13, 5), secondary: new THREE.OctahedronGeometry(1.4, 0), metalness: 0.48, roughness: 0.12, emissiveIntensityB: 0.6 };
      case 'kinetic-city':
        return { ...common, primary: new THREE.BoxGeometry(3, 16, 3), secondary: new THREE.BoxGeometry(3.2, 0.22, 3.2), metalness: 0.72, roughness: 0.24, emissiveIntensityB: 1.35 };
      case 'colossal-desert':
        return { ...common, primary: new THREE.ConeGeometry(3.4, 12, 8), secondary: new THREE.TorusGeometry(2.8, 0.42, 8, 28, Math.PI * 1.25), roughness: 0.96, metalness: 0.02 };
      case 'tidal-monoliths':
        return { ...common, primary: new THREE.BoxGeometry(2.2, 20, 2.2), secondary: new THREE.TorusGeometry(2.2, 0.18, 8, 32), metalness: 0.82, roughness: 0.2, emissiveIntensityB: 0.78 };
      case 'temporal-prisms':
        return { ...common, primary: new THREE.OctahedronGeometry(3.2, 0), secondary: new THREE.TetrahedronGeometry(1.5, 0), metalness: 0.58, roughness: 0.1, emissiveIntensityB: 0.95 };
      case 'solar-crown':
        return { ...common, primary: new THREE.CylinderGeometry(0.45, 2.2, 22, 8), secondary: new THREE.TorusGeometry(2.9, 0.2, 8, 36), metalness: 0.65, roughness: 0.22, emissiveIntensityB: 1.45 };
      case 'asteroid-arches':
        return { ...common, primary: new THREE.DodecahedronGeometry(3.4, 1), secondary: new THREE.TorusGeometry(3.8, 0.35, 7, 20), roughness: 0.93, metalness: 0.06 };
      case 'ion-filaments':
        return { ...common, primary: new THREE.TorusKnotGeometry(1.2, 0.22, 42, 6), secondary: new THREE.CylinderGeometry(0.12, 0.12, 12, 5), metalness: 0.35, roughness: 0.2, emissiveIntensityB: 1.6 };
      case 'comet-flock':
        return { ...common, primary: new THREE.IcosahedronGeometry(2.2, 1), secondary: new THREE.ConeGeometry(0.5, 10, 8), roughness: 0.45, metalness: 0.12, emissiveIntensityB: 0.75 };
      case 'mirror-debris':
        return { ...common, primary: new THREE.TetrahedronGeometry(3, 1), secondary: new THREE.PlaneGeometry(4, 7), metalness: 0.95, roughness: 0.05, emissiveIntensityB: 0.48 };
      case 'derelict-convoy':
        return { ...common, primary: new THREE.BoxGeometry(5, 4, 16), secondary: new THREE.TorusGeometry(2.4, 0.35, 8, 26), metalness: 0.84, roughness: 0.34 };
      case 'gravity-wells':
        return { ...common, primary: new THREE.TorusGeometry(4.2, 0.72, 10, 42), secondary: new THREE.SphereGeometry(1.3, 14, 10), metalness: 0.75, roughness: 0.12, emissiveIntensityB: 1.3 };
      case 'time-fragments':
        return { ...common, primary: new THREE.TetrahedronGeometry(3.1, 0), secondary: new THREE.TorusGeometry(2.2, 0.13, 8, 28), metalness: 0.64, roughness: 0.1, emissiveIntensityB: 1.2 };
      case 'solar-flare':
        return { ...common, primary: new THREE.TorusKnotGeometry(2.2, 0.32, 48, 7), secondary: new THREE.ConeGeometry(0.7, 14, 10), metalness: 0.38, roughness: 0.24, emissiveIntensityB: 1.8 };
      default:
        return { ...common, primary: new THREE.DodecahedronGeometry(2, 0), secondary: new THREE.TorusGeometry(1.5, 0.15, 6, 20) };
    }
  }

  setSegment(segment, seed) {
    if (this.segmentId === segment.id) return;
    this.segmentId = segment.id;
    const isScoria = segment.shortId === 'planet-1';
    this.scene.fog = new THREE.FogExp2(
      segment.fog,
      segment.type === 'space' ? 0.00027 : (isScoria ? 0.00068 : 0.00072),
    );
    this.sky.material.uniforms.topColor.value.set(segment.sky).lerp(new THREE.Color(0x000008), segment.type === 'space' ? 0.68 : 0.08);
    this.sky.material.uniforms.bottomColor.value.set(segment.fog).multiplyScalar(segment.type === 'space' ? 0.16 : 0.7);
    this.sky.material.uniforms.accentColor.value.set(segment.shortId === 'space-1' ? 0x16455a : segment.accent);
    this.sky.material.uniforms.spaceFactor.value = segment.type === 'space' ? 1 : 0;
    this.roadMaterial.map = isScoria ? this.planetOneArt.road.map : null;
    this.roadMaterial.normalMap = isScoria ? this.planetOneArt.road.normalMap : null;
    this.roadMaterial.roughnessMap = isScoria ? this.planetOneArt.road.roughnessMap : null;
    this.roadMaterial.emissiveMap = null;
    this.roadMaterial.emissive.set(isScoria ? 0x2b1a16 : segment.accent);
    this.roadMaterial.emissiveIntensity = isScoria ? 0.58 : (segment.type === 'space' ? 0.16 : 0.08);
    this.roadMaterial.color.set(isScoria ? 0xc2ada4 : 0xffffff);
    this.roadMaterial.metalness = segment.type === 'space' ? 0.72 : (isScoria ? 0.18 : 0.46);
    this.roadMaterial.roughness = segment.type === 'space' ? 0.22 : (isScoria ? 0.82 : 0.5);
    // Planet 2 crossfades from the already-visible authored touchdown strip;
    // retaining the transparent variant prevents a live shader toggle there.
    this.roadMaterial.transparent = segment.type === 'space' || segment.shortId === 'planet-2';
    this.roadMaterial.opacity = segment.type === 'space' || segment.shortId === 'planet-2' ? 0 : 1;
    this.roadMaterial.needsUpdate = true;
    this.terrainMaterial.map = isScoria ? this.planetOneArt.terrain.map : null;
    this.terrainMaterial.normalMap = isScoria ? this.planetOneArt.terrain.normalMap : null;
    this.terrainMaterial.normalScale.set(1.08, 1.08);
    this.terrainMaterial.roughnessMap = isScoria ? this.planetOneArt.terrain.roughnessMap : null;
    // A low, map-independent atmospheric bounce keeps distant folded terrain
    // readable through the red haze. The old sparse ember mask left every
    // non-ember texel black whenever a ridge turned away from the key light.
    this.terrainMaterial.emissiveMap = null;
    this.terrainMaterial.emissive.set(isScoria ? 0x2b1711 : 0x000000);
    this.terrainMaterial.emissiveIntensity = isScoria ? 1.05 : 0;
    // Scoria's texture, material colour, and per-vertex terrain tint multiply.
    // The old three dark factors buried the authored stone response. This warm
    // near-neutral multiplier leaves darkness to the physical lighting.
    this.terrainMaterial.color.set(isScoria ? 0xc0a89d : segment.ground);
    this.terrainMaterial.needsUpdate = true;
    this.horizon.material.map = isScoria ? this.horizonTextures.map : null;
    this.horizon.material.normalMap = isScoria ? this.horizonTextures.normalMap : null;
    this.horizon.material.normalScale.set(0.68, 0.68);
    this.horizon.material.roughnessMap = isScoria ? this.horizonTextures.roughnessMap : null;
    this.horizon.material.emissiveMap = null;
    this.horizon.material.emissive.set(isScoria ? 0x24120d : 0x000000);
    this.horizon.material.emissiveIntensity = isScoria ? 0.5 : 0;
    this.horizon.material.color.set(isScoria ? 0x8f6f64 : segment.ground);
    this.horizon.material.needsUpdate = true;
    this.horizon.visible = segment.type === 'planet';
    this.sunLight.color.set(isScoria ? 0xffe3d5 : (segment.shortId === 'space-1' ? 0xc5eaff : segment.sun));
    this.sunLight.intensity = segment.type === 'space' ? 3.15 : (isScoria ? 0.7 : 3.8);
    this.ambientLight.color.set(isScoria ? 0xffd8cf : colorMix(segment.sun, 0xffffff, 0.2));
    this.ambientLight.intensity = isScoria
      ? (this.quality === 'low' ? 1.92 : this.quality === 'medium' ? 1.86 : 1.8)
      : (segment.type === 'space' ? 0.16 : 0.28);
    this.hemisphere.color.set(colorMix(segment.accent, 0xffffff, 0.45));
    this.hemisphere.groundColor.set(isScoria ? 0x3f2823 : segment.ground);
    this.hemisphere.intensity = segment.type === 'space' ? 0.78 : (isScoria ? 0.5 : 1.18);
    this.rimLight.color.set(segment.shortId === 'space-1' ? segment.secondary : segment.accent);
    this.rimLight.intensity = segment.type === 'space' ? 48 : 32;
    this.lavaFill.intensity = isScoria ? 6.5 : (segment.type === 'space' && segment.index === 1 ? 4.5 : 0);
    this.destinationFill.color.set(isScoria ? 0xffddcf : 0x7bdcff);
    this.destinationFill.intensity = segment.shortId === 'space-1' ? 3.6 : (isScoria ? 0.35 : 0.55);
    this.sunOrb.material.color.set(segment.sun);
    this.sunHalo.material.color.set(segment.sun);
    this.stars.material.opacity = segment.type === 'space' ? 0.2 : 0.003;
    this.scoriaHaze.visible = isScoria;
    this.speedLines.material.color.set(segment.secondary);
    for (const line of this.laneLines) line.material.color.set(segment.secondary);
    for (const line of this.edgeLines) line.material.color.set(segment.accent);
    for (const gate of this.gates) gate.userData.material.color.set(segment.accent);
    for (const ring of this.launchRings) ring.material.color.set(segment.secondary);
    this.rebuildDecor(segment, seed);
  }

  writeReflectorMarker(segment, markerIndex, slot, spacing) {
    const progress = markerIndex * spacing;
    const sample = trackSample(segment, progress);
    const cos = Math.cos(sample.bank);
    const sin = Math.sin(sample.bank);
    for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
      const side = sideIndex === 0 ? -1 : 1;
      const lateral = side * sample.width * 0.91;
      this.dummy.position.set(
        sample.x + lateral * cos,
        sample.y - 0.3 + lateral * sin,
        -progress,
      );
      this.dummy.rotation.set(0, 0, sample.bank);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.reflectors.setMatrixAt(slot * 2 + sideIndex, this.dummy.matrix);
    }
  }

  writeExpansionJoint(segment, jointIndex, slot, spacing) {
    const progress = jointIndex * spacing;
    const sample = trackSample(segment, progress);
    this.dummy.position.set(sample.x, sample.y - 0.34, -progress);
    this.dummy.rotation.set(0, 0, sample.bank);
    this.dummy.scale.set(sample.width * 1.92, 1, 1);
    this.dummy.updateMatrix();
    this.expansionJoints.setMatrixAt(slot, this.dummy.matrix);
  }

  updateTrackMarkers(segment, current, inStormglassTouchdown) {
    this.reflectors.visible = segment.type === 'planet' && !inStormglassTouchdown;
    this.expansionJoints.visible = segment.type === 'planet' && !inStormglassTouchdown;
    if (segment.type !== 'planet' || inStormglassTouchdown) return;

    const markerSpacing = 52;
    const firstMarker = Math.floor(this.logicalProgress / markerSpacing) + 1;
    this.reflectors.position.set(-current.x, -current.y, this.logicalProgress);
    const reflectorState = this.reflectorCourseState;
    if (reflectorState.segmentId !== segment.id
      || reflectorState.first == null
      || firstMarker < reflectorState.first
      || firstMarker - reflectorState.first >= this.reflectorPairs) {
      reflectorState.segmentId = segment.id;
      reflectorState.first = firstMarker;
      reflectorState.startSlot = 0;
      for (let slot = 0; slot < this.reflectorPairs; slot += 1) {
        this.writeReflectorMarker(segment, firstMarker + slot, slot, markerSpacing);
      }
      this.reflectors.instanceMatrix.needsUpdate = true;
    } else if (firstMarker > reflectorState.first) {
      while (reflectorState.first < firstMarker) {
        const slot = reflectorState.startSlot;
        const nextMarker = reflectorState.first + this.reflectorPairs;
        this.writeReflectorMarker(segment, nextMarker, slot, markerSpacing);
        reflectorState.first += 1;
        reflectorState.startSlot = (reflectorState.startSlot + 1) % this.reflectorPairs;
      }
      this.reflectors.instanceMatrix.needsUpdate = true;
    }

    const jointSpacing = 93;
    const firstJoint = Math.floor(this.logicalProgress / jointSpacing) + 1;
    this.expansionJoints.position.set(-current.x, -current.y, this.logicalProgress);
    const jointState = this.jointCourseState;
    if (jointState.segmentId !== segment.id
      || jointState.first == null
      || firstJoint < jointState.first
      || firstJoint - jointState.first >= this.expansionJointCount) {
      jointState.segmentId = segment.id;
      jointState.first = firstJoint;
      jointState.startSlot = 0;
      for (let slot = 0; slot < this.expansionJointCount; slot += 1) {
        this.writeExpansionJoint(segment, firstJoint + slot, slot, jointSpacing);
      }
      this.expansionJoints.instanceMatrix.needsUpdate = true;
    } else if (firstJoint > jointState.first) {
      while (jointState.first < firstJoint) {
        const slot = jointState.startSlot;
        const nextJoint = jointState.first + this.expansionJointCount;
        this.writeExpansionJoint(segment, nextJoint, slot, jointSpacing);
        jointState.first += 1;
        jointState.startSlot = (jointState.startSlot + 1) % this.expansionJointCount;
      }
      this.expansionJoints.instanceMatrix.needsUpdate = true;
    }
  }

  activateNextTrackWorkGeometry() {
    this.trackWorkGeometryIndex = (this.trackWorkGeometryIndex + 1) % this.roadWorkGeometries.length;
    this.roadWorkGeometry = this.roadWorkGeometries[this.trackWorkGeometryIndex];
    this.terrainWorkGeometry = this.terrainWorkGeometries[this.trackWorkGeometryIndex];
    this.roadGeometry = this.roadWorkGeometry;
    this.terrainGeometry = this.terrainWorkGeometry;
    this.road.geometry = this.roadWorkGeometry;
    this.terrain.geometry = this.terrainWorkGeometry;
  }

  updateTrack(state, segment) {
    const profile = this.trackProfileSamples;
    const profileStartedAt = profile ? performance.now() : 0;
    const profileCallSerial = profile ? ++this.trackProfileCallSerial : 0;
    const workBankBefore = profile ? this.trackWorkGeometryIndex : 0;
    const shortScale = state.short ? 0.075 : 1;
    this.logicalProgress = state.segmentProgress / shortScale;
    const cachedTrack = this.trackGeometryCache;
    if (cachedTrack.segmentId === segment.id
      && cachedTrack.logicalProgress === this.logicalProgress
      && cachedTrack.time === state.time
      && cachedTrack.quality === this.quality) {
      if (profile) {
        const sample = {
          callSerial: profileCallSerial,
          expectedLiveFrameSerial: this.liveFrameSerial + 1,
          logicalProgress: this.logicalProgress,
          raceTime: state.time,
          started: Boolean(state.started),
          segmentId: segment.id,
          cacheHit: true,
          openingResponse: false,
          workBankBefore,
          workBankAfter: this.trackWorkGeometryIndex,
          workBankActivated: false,
          roadGeometryId: this.road.geometry.id,
          terrainGeometryId: this.terrain.geometry.id,
          totalMs: performance.now() - profileStartedAt,
        };
        this.lastTrackProfileSample = sample;
        profile.push(sample);
        if (profile.length > 64) profile.splice(0, profile.length - 64);
      }
      return { current: cachedTrack.current, samples: this.trackSamples };
    }
    const isScoria = segment.shortId === 'planet-1';
    const isStaticScoria = isScoria && this.staticScoriaSurface?.enabled;
    if (!isStaticScoria) this.activateRollingTrackSurface();
    const openingInitialResponse = !isStaticScoria && isScoria
      && !this.openingTrackResponseBuild
      && !state.started
      && this.logicalProgress === 0
      && this.openingInitialTrackResponse
      && this.openingInitialTrackResponse.short === Boolean(state.short)
      && this.openingInitialTrackResponse.quality === this.quality
      ? this.openingInitialTrackResponse
      : null;
    const openingResponseCandidate = !isStaticScoria && isScoria
      && this.quality === 'high'
      && !state.short
      && !this.openingTrackResponseBuild
      && state.started
      && this.logicalProgress > 0
      ? this.openingTrackResponseCache.get(this.logicalProgress)
      : null;
    const openingResponse = openingInitialResponse
      ?? (openingResponseCandidate?.preuploaded ? openingResponseCandidate : null);
    const workBankActivated = !isStaticScoria && !openingResponse;
    if (workBankActivated) this.activateNextTrackWorkGeometry();
    const current = isScoria
      ? sampleScoriaTrackInto(segment, this.logicalProgress, this.scoriaCurrentSample)
      : trackSample(segment, this.logicalProgress);
    if (isStaticScoria) {
      const profileSetupAt = profile ? performance.now() : 0;
      this.updateStaticScoriaSurface(current);
      this.roadMaterial.opacity = 1;
      this.road.visible = true;
      this.terrain.visible = true;
      for (const ribbon of this.lavaRibbons) ribbon.visible = true;
      this.lavaRibbonMaterial.emissiveIntensity = 0.03 + Math.sin(state.time * 2.2) * 0.008;
      for (let lineIndex = 0;
        lineIndex < this.staticScoriaSurface.lines.length;
        lineIndex += 1) {
        const line = this.staticScoriaSurface.lines[lineIndex];
        line.material.opacity = line.userData.side
          ? 0.08
          : (line.userData.lane === 0 ? 0.15 : 0.055);
      }
      this.updateTrackMarkers(segment, current, false);
      const profileFinishedAt = profile ? performance.now() : 0;
      if (profile) {
        const sample = {
          callSerial: profileCallSerial,
          expectedLiveFrameSerial: this.liveFrameSerial + 1,
          logicalProgress: this.logicalProgress,
          raceTime: state.time,
          started: Boolean(state.started),
          segmentId: segment.id,
          cacheHit: false,
          staticSurface: true,
          openingResponse: false,
          workBankBefore,
          workBankAfter: this.trackWorkGeometryIndex,
          workBankActivated: false,
          roadGeometryId: this.road.geometry.id,
          terrainGeometryId: this.terrain.geometry.id,
          roadPositionVersion: this.road.geometry.attributes.position.version,
          terrainPositionVersion: this.terrain.geometry.attributes.position.version,
          skipRoadGeometry: false,
          skipTerrainGeometry: false,
          skipLineGeometry: false,
          setupMs: profileSetupAt - profileStartedAt,
          rowsMs: 0,
          lavaMs: 0,
          normalsMs: 0,
          dirtyMs: 0,
          linesAndMarkersMs: profileFinishedAt - profileSetupAt,
          totalMs: profileFinishedAt - profileStartedAt,
        };
        this.lastTrackProfileSample = sample;
        profile.push(sample);
        if (profile.length > 64) profile.splice(0, profile.length - 64);
      }
      cachedTrack.segmentId = segment.id;
      cachedTrack.logicalProgress = this.logicalProgress;
      cachedTrack.time = state.time;
      cachedTrack.quality = this.quality;
      cachedTrack.current = current;
      return { current, samples: this.trackSamples };
    }
    const roadPosition = this.roadGeometry.attributes.position.array;
    const roadColor = this.roadGeometry.attributes.color.array;
    const roadNormal = this.roadGeometry.attributes.normal.array;
    const roadUv = this.roadGeometry.attributes.uv.array;
    const terrainPosition = this.terrainGeometry.attributes.position.array;
    const terrainColor = this.terrainGeometry.attributes.color.array;
    const terrainNormal = this.terrainGeometry.attributes.normal.array;
    const terrainUv = this.terrainGeometry.attributes.uv.array;
    const roadProfile = this.roadColumnProfile;
    const terrainProfile = this.terrainColumnProfile;
    const terrainPhaseSin = terrainProfile.phaseSin;
    const terrainPhaseCos = terrainProfile.phaseCos;
    const morphState = getMorphState(state);
    const landingAmount = segment.type === 'space' ? morphState.landing : 0;
    const landingReveal = segment.shortId === 'space-1'
      ? smoothstep(0.62, 0.94, landingAmount)
      : landingAmount;
    const isSpaceOne = segment.shortId === 'space-1';
    const inStormglassTouchdown = segment.shortId === 'planet-2' && this.logicalProgress < 855;
    const stormglassGenericReveal = segment.shortId === 'planet-2'
      ? smoothstep(710, 855, this.logicalProgress)
      : 1;
    // ArrivalArt/TouchdownArt own every visible surface while the generic
    // ribbon families are hidden. Keep sampling the exact course for camera,
    // rivals, collision, and downstream FX, but do not rebuild or upload
    // buffers that cannot contribute a pixel. During the P2 handoff the road
    // becomes visible before the terrain, so the two predicates deliberately
    // follow their shipping visibility thresholds independently.
    const skipRoadGeometry = isSpaceOne
      || (segment.shortId === 'planet-2' && stormglassGenericReveal <= 0.002);
    const skipTerrainGeometry = isSpaceOne
      || (segment.shortId === 'planet-2' && stormglassGenericReveal <= 0.92);
    const skipLineGeometry = isSpaceOne || inStormglassTouchdown;
    const destination = segment.type === 'space' ? PLANETS[Math.min(PLANETS.length - 1, segment.index)] : null;
    const reconstructScoriaNormals = isScoria && this.quality === 'high';
    if (isScoria
      && this.quality === 'high'
      && !state.short
      && !this.openingTrackResponseBuild
      && state.started
      && this.logicalProgress > 0
      && this.logicalProgress <= (this.openingTrackResponseTelemetry.progressMax ?? -1)) {
      if (openingResponse) this.openingTrackResponseTelemetry.hits += 1;
      else this.openingTrackResponseTelemetry.misses += 1;
    }
    const roadBase = this.trackColors.roadBase
      .set(isScoria ? 0xa08f87 : segment.road)
      .lerp(this.trackColors.target.set(destination?.road ?? segment.road), landingAmount);
    const accent = this.trackColors.accent.set(segment.accent);
    const ground = this.trackColors.ground
      .set(isScoria ? 0xb49e93 : segment.ground)
      .lerp(this.trackColors.target.set(destination?.ground ?? segment.ground), landingAmount);
    const shoulder = this.trackColors.shoulder
      .set(isScoria ? 0xc7a99c : segment.shoulder)
      .lerp(this.trackColors.target.set(destination?.shoulder ?? segment.shoulder), landingAmount);
    if (isSpaceOne) {
      // ArrivalArt + TouchdownArt are the one continuous physical runway for
      // S1->P2. The generic space ribbon used an orange vertex accent and
      // inflated into the captured red/cyan slab one frame before landing.
      this.roadMaterial.opacity = 0;
      this.road.visible = false;
      this.terrain.visible = false;
      this.terrainMaterial.color.copy(STORMGLASS_FOG);
    } else if (segment.type === 'space') {
      this.roadMaterial.opacity = 0.015 + landingReveal * landingReveal * 0.965;
      this.terrainMaterial.color.copy(
        this.trackColors.surfaceTint
          .set(destination?.ground ?? segment.ground)
          .lerp(this.trackColors.white, landingReveal * 0.16),
      );
      this.road.visible = true;
    } else if (segment.shortId === 'planet-2') {
      this.roadMaterial.opacity = stormglassGenericReveal;
      this.road.visible = stormglassGenericReveal > 0.002;
    } else {
      this.road.visible = true;
    }
    const roadBaseR = roadBase.r;
    const roadBaseG = roadBase.g;
    const roadBaseB = roadBase.b;
    const roadAccentR = accent.r - roadBaseR;
    const roadAccentG = accent.g - roadBaseG;
    const roadAccentB = accent.b - roadBaseB;
    const shoulderDeltaR = shoulder.r - ground.r;
    const shoulderDeltaG = shoulder.g - ground.g;
    const shoulderDeltaB = shoulder.b - ground.b;
    if (!skipTerrainGeometry) {
      for (let column = 0; column < this.terrainColumns; column += 1) {
        const amount = terrainProfile.shoulderAmount[column];
        terrainProfile.colorR[column] = ground.r + shoulderDeltaR * amount;
        terrainProfile.colorG[column] = ground.g + shoulderDeltaG * amount;
        terrainProfile.colorB[column] = ground.b + shoulderDeltaB * amount;
      }
    }
    const profileSetupAt = profile ? performance.now() : 0;
    const samples = this.trackSamples;
    if (openingResponse) {
      this.applyOpeningTrackResponse(openingResponse);
    } else if (reconstructScoriaNormals && !skipRoadGeometry && !skipTerrainGeometry) {
      writeHighQualityScoriaRibbonRows(
        segment,
        this.logicalProgress,
        current.x,
        current.y,
        this.trackRows,
        this.behindRows,
        this.trackSpacing,
        samples,
        this.scoriaCourseSamples,
        this.scoriaNextSamples,
        roadPosition,
        roadColor,
        roadUv,
        roadProfile,
        terrainPosition,
        terrainColor,
        terrainUv,
        terrainProfile,
        roadBaseR,
        roadBaseG,
        roadBaseB,
        roadAccentR,
        roadAccentG,
        roadAccentB,
        accent.r,
        accent.g,
        accent.b,
      );
    } else for (let i = 0; i < this.trackRows; i += 1) {
      const offset = (i - this.behindRows) * this.trackSpacing;
      const worldProgress = this.logicalProgress + offset;
      const sample = isScoria
        ? sampleScoriaTrackInto(segment, worldProgress, this.scoriaCourseSamples[i])
        : trackSample(segment, worldProgress);
      const nextSample = isScoria
        ? sampleScoriaTrackInto(segment, worldProgress + 2, this.scoriaNextSamples[i])
        : trackSample(segment, worldProgress + 2);
      const x = sample.x - current.x;
      let y = sample.y - current.y - 0.52;
      if (isScoria && worldProgress > segment.length) {
        const fallaway = smoothstep(0, 92, worldProgress - segment.length);
        y -= fallaway * fallaway * 680;
      }
      const z = -offset;
      const cos = Math.cos(sample.bank);
      const sin = Math.sin(sample.bank);
      const normalXRaw = -sin * 2;
      const normalYRaw = cos * 2;
      const normalZRaw = cos * (nextSample.y - sample.y) - sin * (nextSample.x - sample.x);
      const normalLength = Math.sqrt(
        normalXRaw * normalXRaw + normalYRaw * normalYRaw + normalZRaw * normalZRaw,
      ) || 1;
      const normalX = normalXRaw / normalLength;
      const normalY = normalYRaw / normalLength;
      const normalZ = normalZRaw / normalLength;
      const fraction = clamp(worldProgress / segment.length, 0, 1);
      const canyon = segment.type === 'planet' && segment.index === 1
        ? smoothstep(0.48, 0.62, fraction) * (1 - smoothstep(0.74, 0.81, fraction))
        : 0;
      const launch = segment.type === 'planet' ? smoothstep(0.76, 1, fraction) : 0;
      const trackRow = samples[i];
      trackRow.x = x;
      trackRow.y = y;
      trackRow.z = z;
      trackRow.cos = cos;
      trackRow.sin = sin;
      trackRow.width = sample.width;
      trackRow.normalX = normalX;
      trackRow.normalY = normalY;
      trackRow.normalZ = normalZ;
      trackRow.worldProgress = worldProgress;
      trackRow.fraction = fraction;

      if (!skipRoadGeometry) {
        const roadUvY = worldProgress / (segment.type === 'space' ? 72 : 38);
        const pulse = Math.sin(worldProgress * 0.034 + segment.index) * 0.5 + 0.5;
        const roadRowOffset = i * this.roadColumns;

        for (let column = 0; column < this.roadColumns; column += 1) {
          const u = roadProfile.u[column];
          const vertical = roadProfile.vertical[column];
          const thermalChannel = roadProfile.thermal[column];
          const vertex = roadRowOffset + column;
          const index = vertex * 3;
          const uvIndex = vertex * 2;
          roadPosition[index] = x + u * sample.width * cos - vertical * sin;
          roadPosition[index + 1] = y + u * sample.width * sin + vertical * cos;
          roadPosition[index + 2] = z;
          if (!reconstructScoriaNormals) {
            roadNormal[index] = normalX;
            roadNormal[index + 1] = normalY;
            roadNormal[index + 2] = normalZ;
          }
          roadUv[uvIndex] = roadProfile.uv[column];
          roadUv[uvIndex + 1] = roadUvY;
          const accentAmount = segment.type === 'space'
            ? 0.1 + thermalChannel * 0.22 + pulse * 0.025
            : 0.012 + thermalChannel * (0.07 + launch * 0.18) + roadProfile.lanePolish[column] * 0.025;
          roadColor[index] = roadBaseR + roadAccentR * accentAmount;
          roadColor[index + 1] = roadBaseG + roadAccentG * accentAmount;
          roadColor[index + 2] = roadBaseB + roadAccentB * accentAmount;
        }
      }

      if (!skipTerrainGeometry) {
        const terrainRowOffset = i * this.terrainColumns;
        const terrainUvY = worldProgress / 52;
        const macroRowA = worldProgress * 0.0061 + segment.index * 0.9;
        const macroRowB = worldProgress * 0.0137;
        const macroRowC = worldProgress * 0.0022;
        const macroRowD = worldProgress * 0.027 + segment.index;
        const broadRow = worldProgress * 0.00325;
        const ridgeRowA = worldProgress * 0.0057;
        const ridgeRowB = worldProgress * 0.00235;
        const shelfRowA = worldProgress * 0.011;
        const shelfRowB = worldProgress * 0.0043;
        const fractureRowA = worldProgress * 0.041;
        const fractureRowB = worldProgress * 0.073;
        const canyonRow = worldProgress * 0.012;
        const stratumRow = worldProgress * 0.017;
        const macroRowASin = Math.sin(macroRowA);
        const macroRowACos = Math.cos(macroRowA);
        const macroRowBSin = Math.sin(macroRowB);
        const macroRowBCos = Math.cos(macroRowB);
        const macroRowCSin = Math.sin(macroRowC);
        const macroRowCCos = Math.cos(macroRowC);
        const macroRowDSin = Math.sin(macroRowD);
        const macroRowDCos = Math.cos(macroRowD);
        const broadRowSin = Math.sin(broadRow);
        const broadRowCos = Math.cos(broadRow);
        const ridgeRowASin = Math.sin(ridgeRowA);
        const ridgeRowACos = Math.cos(ridgeRowA);
        const ridgeRowBSin = Math.sin(ridgeRowB);
        const ridgeRowBCos = Math.cos(ridgeRowB);
        const shelfRowASin = Math.sin(shelfRowA);
        const shelfRowACos = Math.cos(shelfRowA);
        const shelfRowBSin = Math.sin(shelfRowB);
        const shelfRowBCos = Math.cos(shelfRowB);
        const fractureRowASin = Math.sin(fractureRowA);
        const fractureRowACos = Math.cos(fractureRowA);
        const fractureRowBSin = Math.sin(fractureRowB);
        const fractureRowBCos = Math.cos(fractureRowB);
        const canyonRowSin = Math.sin(canyonRow);
        const canyonRowCos = Math.cos(canyonRow);
        for (let column = 0; column < this.terrainColumns; column += 1) {
          const sideScale = terrainProfile.side[column];
          const absoluteSide = terrainProfile.absolute[column];
          const outerEnvelope = terrainProfile.outer[column];
          const vertex = terrainRowOffset + column;
          const index = vertex * 3;
          const uvIndex = vertex * 2;
          const macroNoise = (macroRowASin * terrainPhaseCos.macroA[column]
          + macroRowACos * terrainPhaseSin.macroA[column]) * 2.8
          + (macroRowBSin * terrainPhaseCos.macroB[column]
            + macroRowBCos * terrainPhaseSin.macroB[column]) * 1.35
          + (macroRowCSin * terrainPhaseCos.macroC[column]
            + macroRowCCos * terrainPhaseSin.macroC[column]) * 4.2
          + (macroRowDSin * terrainPhaseCos.macroD[column]
            + macroRowDCos * terrainPhaseSin.macroD[column]) * 0.72;
        const broadFold = (broadRowSin * terrainPhaseCos.broad[column]
          + broadRowCos * terrainPhaseSin.broad[column]) * 0.5 + 0.5;
        const ridgeAValue = ridgeRowASin * terrainPhaseCos.ridgeA[column]
          + ridgeRowACos * terrainPhaseSin.ridgeA[column];
        const ridgeBValue = ridgeRowBSin * terrainPhaseCos.ridgeB[column]
          + ridgeRowBCos * terrainPhaseSin.ridgeB[column];
        const ridgeA = Math.pow(Math.max(0, ridgeAValue), 3.1);
        const ridgeB = Math.pow(Math.max(0, ridgeBValue), 5.2);
        const escarpment = outerEnvelope * (2.5 + broadFold * 7.5 + ridgeA * 18 + ridgeB * 10.5);
        const terraceUnit = terrainProfile.terraceUnit[column];
        const rawRelief = macroNoise * 0.64 + escarpment;
        const steppedRelief = Math.round(rawRelief / terraceUnit) * terraceUnit;
        const terracedRelief = lerp(rawRelief, steppedRelief, terrainProfile.terraceBlend[column]);
        const shelfFracture = terrainProfile.brokenShelf[column] * (
          (shelfRowASin * terrainPhaseCos.shelfA[column]
            + shelfRowACos * terrainPhaseSin.shelfA[column]) * 2.1
          + (shelfRowBSin * terrainPhaseCos.shelfB[column]
            + shelfRowBCos * terrainPhaseSin.shelfB[column]) * 1.35
        );
        const fractureLips = outerEnvelope * (
          (fractureRowASin * terrainPhaseCos.fractureA[column]
            + fractureRowACos * terrainPhaseSin.fractureA[column]) * 0.9
          + (fractureRowBSin * terrainPhaseCos.fractureB[column]
            + fractureRowBCos * terrainPhaseSin.fractureB[column]) * 0.46
        );
        const canyonWave = canyonRowSin * terrainPhaseCos.canyon[column]
          + canyonRowCos * terrainPhaseSin.canyon[column];
        const terrainRise = macroNoise * terrainProfile.macroScale[column]
          + terracedRelief * terrainProfile.terracedScale[column]
          + shelfFracture
          + fractureLips
          + canyon * terrainProfile.canyonEnvelope[column] * (17 + canyonWave * 7)
          - launch * terrainProfile.launchEnvelope[column] * terrainProfile.launchDepth[column];
        const rawElevation = terrainProfile.shoulderShelf[column] + terrainRise;
        const corridorCut = terrainProfile.corridorCut[column];
        const elevation = lerp(
          rawElevation,
          Math.min(rawElevation, terrainProfile.corridorClearance[column]),
          corridorCut,
        );
        // Displace along the sampled surface normal, not screen-space Y. Banks
        // now expose real escarpment faces instead of rotating one flat slab.
        terrainPosition[index] = x + sideScale * sample.width * cos + elevation * normalX;
        terrainPosition[index + 1] = y + sideScale * sample.width * sin + elevation * normalY;
        terrainPosition[index + 2] = z + elevation * normalZ;
        if (!reconstructScoriaNormals) {
          terrainNormal[index] = normalX;
          terrainNormal[index + 1] = normalY;
          terrainNormal[index + 2] = normalZ;
        }
        terrainUv[uvIndex] = terrainProfile.uv[column];
        terrainUv[uvIndex + 1] = terrainUvY;
        const stratum = Math.sin(terrainRise * 1.19 + stratumRow + terrainProfile.stratum[column]) * 0.5 + 0.5;
        const exposure = terrainProfile.exposureBase[column]
          + stratum * terrainProfile.exposureStratum[column];
        const emberMineral = terrainProfile.emberBase[column]
          + stratum * terrainProfile.emberStratum[column];
        terrainColor[index] = Math.min(1, terrainProfile.colorR[column] * exposure + accent.r * emberMineral);
        terrainColor[index + 1] = Math.min(1, terrainProfile.colorG[column] * exposure + accent.g * emberMineral);
          terrainColor[index + 2] = Math.min(1, terrainProfile.colorB[column] * exposure + accent.b * emberMineral);
        }
      }
    }
    const profileRowsAt = profile ? performance.now() : 0;

    for (const ribbon of this.lavaRibbons) {
      ribbon.visible = isScoria;
      if (!isScoria) continue;
      const side = ribbon.userData.side;
      const positions = ribbon.geometry.attributes.position.array;
      const normals = ribbon.geometry.attributes.normal.array;
      const uvs = ribbon.geometry.attributes.uv.array;
      for (let row = 0; row < samples.length; row += 1) {
          const sample = samples[row];
          const meander = Math.sin(sample.worldProgress * 0.0037 + side * 1.8)
            + Math.sin(sample.worldProgress * 0.0091 - side * 0.7) * 0.38;
          const center = side * sample.width * (1.48 + meander * 0.12);
          const slowPocket = Math.sin(sample.worldProgress * 0.0063 + side) * 0.5 + 0.5;
          const brokenPocket = Math.sin(sample.worldProgress * 0.019 - side * 2.1) * 0.5 + 0.5;
          const channelPocket = Math.pow(slowPocket * (0.54 + brokenPocket * 0.46), 1.55);
          const halfWidth = sample.width * (0.018 + channelPocket * 0.14);
          const rippleAngle = sample.worldProgress * 0.035 + side;
          const rippleSin = Math.sin(rippleAngle);
          const rippleCos = Math.cos(rippleAngle);
        for (let column = 0; column < this.lavaColumns; column += 1) {
          const across = this.lavaColumnProfile.across[column];
          const lateral = center + across * halfWidth;
          const index = (row * this.lavaColumns + column) * 3;
          const uvIndex = (row * this.lavaColumns + column) * 2;
          const channelRipple = (rippleSin * this.lavaColumnProfile.rippleCos[column]
            + rippleCos * this.lavaColumnProfile.rippleSin[column]) * 0.16;
          positions[index] = sample.x + lateral * sample.cos;
          // Keep the molten surface just below the road crown but above the
          // eroded shelf.  The previous -2.05 offset buried both channels under
          // the terrain ribbon, so their light existed mathematically while no
          // player could actually see the river producing it.
          positions[index + 1] = sample.y + lateral * sample.sin - 0.82 + channelRipple * 0.46;
          positions[index + 2] = sample.z;
          normals[index] = sample.normalX;
          normals[index + 1] = sample.normalY;
          normals[index + 2] = sample.normalZ;
          uvs[uvIndex] = this.lavaColumnProfile.uv[column];
          uvs[uvIndex + 1] = sample.worldProgress / 42;
        }
      }
      ribbon.geometry.attributes.position.needsUpdate = true;
      ribbon.geometry.attributes.normal.needsUpdate = true;
      ribbon.geometry.attributes.uv.needsUpdate = true;
    }
    if (isScoria) {
      // Broad molten mass first, hairline heat detail second. Excess emission
      // flattened the procedural crust into parallel red wires in motion.
      this.lavaRibbonMaterial.emissiveIntensity = 0.03 + Math.sin(state.time * 2.2) * 0.008;
    }
    const profileLavaAt = profile ? performance.now() : 0;
    // Scoria's terrain is deliberately lumpy. Reconstruct every high-quality
    // frame so raking light follows the displaced relief continuously. The old
    // every-fourth-frame generic pass alternated detailed indexed normals with
    // three flat analytic frames, creating both a CPU cliff and a subtle
    // shading pulse.
    if (reconstructScoriaNormals && !openingResponse) {
      reconstructRibbonNormals(this.roadGeometry, this.trackRows, this.roadColumns);
      reconstructRibbonNormals(this.terrainGeometry, this.trackRows, this.terrainColumns);
    }
    const profileNormalsAt = profile ? performance.now() : 0;
    if (!openingResponse && !skipRoadGeometry) {
      this.roadGeometry.attributes.position.needsUpdate = true;
      this.roadGeometry.attributes.color.needsUpdate = true;
      this.roadGeometry.attributes.normal.needsUpdate = true;
      this.roadGeometry.attributes.uv.needsUpdate = true;
    }
    if (!openingResponse && !skipTerrainGeometry) {
      this.terrainGeometry.attributes.position.needsUpdate = true;
      this.terrainGeometry.attributes.color.needsUpdate = true;
      this.terrainGeometry.attributes.normal.needsUpdate = true;
      this.terrainGeometry.attributes.uv.needsUpdate = true;
    }
    const profileDirtyAt = profile ? performance.now() : 0;
    this.terrain.visible = isSpaceOne
      ? false
      : (segment.shortId === 'planet-2'
        ? stormglassGenericReveal > 0.92
        : segment.type === 'planet' || landingReveal > 0.56);

    for (const line of [...this.laneLines, ...this.edgeLines]) {
      if (!skipLineGeometry) {
        const positions = line.geometry.attributes.position.array;
        const lane = line.userData.lane ?? line.userData.side;
        for (let i = 0; i < samples.length; i += 1) {
          const sample = samples[i];
          const index = i * 3;
          positions[index] = sample.x + lane * sample.width * sample.cos;
          positions[index + 1] = sample.y + lane * sample.width * sample.sin + 0.16;
          positions[index + 2] = sample.z;
        }
        line.geometry.attributes.position.needsUpdate = true;
      }
      line.material.opacity = isSpaceOne || inStormglassTouchdown
        ? 0
          : (segment.type === 'space'
          ? (line.userData.side ? 0.008 + landingReveal * 0.5 : 0.012 + landingReveal * 0.34)
          : (line.userData.side ? (isScoria ? 0.08 : 0.28) : (line.userData.lane === 0 ? 0.15 : 0.055)));
    }
    this.updateTrackMarkers(segment, current, inStormglassTouchdown);
    const profileFinishedAt = profile ? performance.now() : 0;
    if (profile) {
      const sample = {
        callSerial: profileCallSerial,
        expectedLiveFrameSerial: this.liveFrameSerial + 1,
        logicalProgress: this.logicalProgress,
        raceTime: state.time,
        started: Boolean(state.started),
        segmentId: segment.id,
        cacheHit: false,
        openingResponse: Boolean(openingResponse),
        workBankBefore,
        workBankAfter: this.trackWorkGeometryIndex,
        workBankActivated,
        roadGeometryId: this.road.geometry.id,
        terrainGeometryId: this.terrain.geometry.id,
        roadPositionVersion: this.road.geometry.attributes.position.version,
        terrainPositionVersion: this.terrain.geometry.attributes.position.version,
        skipRoadGeometry,
        skipTerrainGeometry,
        skipLineGeometry,
        setupMs: profileSetupAt - profileStartedAt,
        rowsMs: profileRowsAt - profileSetupAt,
        lavaMs: profileLavaAt - profileRowsAt,
        normalsMs: profileNormalsAt - profileLavaAt,
        dirtyMs: profileDirtyAt - profileNormalsAt,
        linesAndMarkersMs: profileFinishedAt - profileDirtyAt,
        totalMs: profileFinishedAt - profileStartedAt,
      };
      this.lastTrackProfileSample = sample;
      profile.push(sample);
      if (profile.length > 64) profile.splice(0, profile.length - 64);
    }
    cachedTrack.segmentId = segment.id;
    cachedTrack.logicalProgress = this.logicalProgress;
    cachedTrack.time = state.time;
    cachedTrack.quality = this.quality;
    cachedTrack.current = current;
    return { current, samples };
  }

  updateGates(state, segment, currentSample) {
    const shortScale = state.short ? 0.075 : 1;
    const spacing = segment.gimmick.spacing;
    const firstGate = Math.floor(this.logicalProgress / spacing) + 1;
    for (let i = 0; i < this.gates.length; i += 1) {
      const gateIndex = firstGate + i;
      const gateProgress = gateIndex * spacing;
      const local = gateProgress - this.logicalProgress;
      const gate = this.gates[i];
      const visible = !['planet-1', 'space-1'].includes(segment.shortId)
        && !(segment.shortId === 'planet-2' && this.logicalProgress < 855)
        && local > 18 && local < this.trackRows * this.trackSpacing - 40 && gateProgress < segment.length * 0.88;
      gate.visible = visible;
      if (!visible) continue;
      const sample = trackSample(segment, gateProgress);
      const target = gateTarget(segment, Math.floor(gateProgress * shortScale / Math.max(18, segment.gimmick.spacing * (state.short ? 0.16 : 1))), state);
      gate.position.set(sample.x - currentSample.x + target, sample.y - currentSample.y, -local);
      const size = segment.type === 'space' ? 1.45 : 1;
      gate.scale.set(size, size, size);
      gate.rotation.z = sample.bank;
      gate.userData.ring.rotation.z = state.time * (segment.type === 'space' ? 0.75 : 0.15) * (i % 2 ? -1 : 1);
      gate.userData.material.opacity = 0.32 + (1 - clamp(local / 900, 0, 1)) * 0.46;
    }
    const remaining = segment.length - this.logicalProgress;
    const apertureProgress = segment.length - 250;
    const apertureLocal = apertureProgress - this.logicalProgress;
    const apertureOnPlanet = segment.shortId === 'planet-1' && remaining < 1900 && apertureLocal > -90;
    // Once crossed, the aperture stays behind on Scoria. The old space-side
    // branch teleported a 30%-scale duplicate in front of the camera; the
    // pressure shell, plume and literal fallaway deck now carry continuity.
    this.launchAperture.visible = apertureOnPlanet;
    if (apertureOnPlanet) {
      const sample = trackSample(segment, apertureProgress);
      this.launchAperture.position.set(sample.x - currentSample.x, sample.y - currentSample.y, -apertureLocal);
      this.launchAperture.rotation.set(0, 0, sample.bank);
      this.launchAperture.scale.setScalar(1);
      for (const material of this.launchAperture.userData.materials) material.opacity = 1;
    }
    const morph = getMorphState(state);
    for (let i = 0; i < this.launchRings.length; i += 1) {
      const ring = this.launchRings[i];
      const phase = clamp((morph.morph - 0.12 - i * 0.08) / 0.44, 0, 1);
      const show = segment.shortId === 'planet-1' && phase > 0 && phase < 1;
      ring.visible = show;
      if (!show) continue;
      const spread = 1 + phase * (2.8 + i * 0.42);
      ring.position.set(state.lateral, 0.27 + state.lift, 3.2 + i * 2.4 + phase * 8);
      ring.scale.setScalar(spread);
      ring.rotation.z = state.roll * 0.4;
      ring.material.opacity = (1 - phase) * (0.46 - i * 0.045);
    }
  }

  updateLaunchFallaway(state, segment) {
    const fraction = segment.shortId === 'space-1' ? getSegmentFraction(state) : 1;
    const active = segment.shortId === 'space-1' && fraction < 0.38;
    this.launchFallaway.visible = active;
    const fall = smoothstep(0.006, 0.14, fraction);
    const fade = 1 - smoothstep(0.105, 0.245, fraction);
    const recede = smoothstep(0.008, 0.38, fraction);
    const departureScale = lerp(1, 0.26, recede);
    this.launchFallaway.userData.fraction = fraction;
    this.launchFallaway.userData.fall = fall;
    this.launchFallaway.userData.fade = fade;
    this.launchFallaway.userData.departureScale = departureScale;
    if (!active) {
      this.launchFallaway.userData.terrainMaterial.opacity = 0;
      this.launchFallaway.userData.roadMaterial.opacity = 0;
      this.launchFallaway.userData.heatMaterial.opacity = 0;
      return;
    }
    // At the mode boundary this is the same wide crust/road plane the rocket
    // just left, already beneath the carried simulation lift. It then pitches,
    // drops, and slides behind the camera instead of disappearing on one frame.
    this.launchFallaway.position.set(
      -state.lateral * 0.08,
      -0.9 - Math.pow(fall, 1.3) * 94 - recede * 190,
      -180 - recede * 250,
    );
    this.launchFallaway.rotation.set(0.04 + recede * 0.76, recede * -0.08, state.roll * 0.06);
    this.launchFallaway.scale.setScalar(departureScale);
    this.launchSourcePlanet.rotation.y = state.time * 0.018;
    this.launchFallaway.userData.terrainMaterial.opacity = fade * 0.96;
    this.launchFallaway.userData.roadMaterial.opacity = fade * 0.98;
    this.launchFallaway.userData.heatMaterial.opacity = fade * (0.3 + (1 - fall) * 0.22);
  }

  addStaticCourseUploadRanges(batch, changedSlots, telemetry) {
    if (!changedSlots.length) return;
    changedSlots.sort((a, b) => a - b);
    let rangeStart = changedSlots[0];
    let rangeEnd = rangeStart;
    for (let index = 1; index <= changedSlots.length; index += 1) {
      const slot = changedSlots[index];
      if (slot === rangeEnd || slot === rangeEnd + 1) {
        rangeEnd = slot;
        continue;
      }
      const slotCount = rangeEnd - rangeStart + 1;
      batch.mesh.instanceMatrix.addUpdateRange(rangeStart * 16, slotCount * 16);
      telemetry.matrixFloatsUploaded += slotCount * 16;
      rangeStart = slot;
      rangeEnd = slot;
    }
    batch.mesh.instanceMatrix.needsUpdate = true;
    telemetry.batchesDirtied += 1;
  }

  updateOpaqueStaticCourseBatch(batch, forwardLimit, telemetry) {
    const course = batch.staticCourse;
    const changedSlots = course.changedSlots;
    changedSlots.length = 0;
    const previousCount = course.activeCount;
    for (let itemIndex = 0; itemIndex < batch.items.length; itemIndex += 1) {
      const local = batch.items[itemIndex].progress - this.logicalProgress;
      const visible = local > -220 && local < forwardLimit;
      if (visible) telemetry.visibleItems += 1;
      else telemetry.hiddenItems += 1;
      const encoded = visible ? 1 : 0;
      if (course.visible[itemIndex] === encoded) continue;
      course.visible[itemIndex] = encoded;
      telemetry.visibilityEdges += 1;
      if (visible) {
        const slot = course.activeCount;
        course.activeCount += 1;
        course.slotByItem[itemIndex] = slot;
        course.itemBySlot[slot] = itemIndex;
        batch.mesh.setMatrixAt(slot, course.matrices[itemIndex]);
        changedSlots.push(slot);
        telemetry.matricesWritten += 1;
        continue;
      }
      const removedSlot = course.slotByItem[itemIndex];
      if (removedSlot < 0) continue;
      const lastSlot = course.activeCount - 1;
      const movedItem = course.itemBySlot[lastSlot];
      course.slotByItem[itemIndex] = -1;
      course.itemBySlot[lastSlot] = -1;
      course.activeCount = lastSlot;
      if (removedSlot !== lastSlot) {
        course.itemBySlot[removedSlot] = movedItem;
        course.slotByItem[movedItem] = removedSlot;
        batch.mesh.setMatrixAt(removedSlot, course.matrices[movedItem]);
        changedSlots.push(removedSlot);
        telemetry.matricesWritten += 1;
        telemetry.activeSlotSwaps += 1;
      }
    }
    batch.mesh.count = course.activeCount;
    telemetry.submittedItems += course.activeCount;
    if (course.activeCount !== previousCount) telemetry.instanceCountChanges += 1;
    this.addStaticCourseUploadRanges(batch, changedSlots, telemetry);
  }

  updateStableStaticCourseBatch(batch, forwardLimit, telemetry) {
    const course = batch.staticCourse;
    const previousCount = course.activeCount;
    let visibilityChanged = false;
    for (let itemIndex = 0; itemIndex < batch.items.length; itemIndex += 1) {
      const local = batch.items[itemIndex].progress - this.logicalProgress;
      const visible = local > -220 && local < forwardLimit;
      if (visible) telemetry.visibleItems += 1;
      else telemetry.hiddenItems += 1;
      const encoded = visible ? 1 : 0;
      if (course.visible[itemIndex] === encoded) continue;
      course.visible[itemIndex] = encoded;
      telemetry.visibilityEdges += 1;
      visibilityChanged = true;
    }
    if (visibilityChanged) {
      course.slotByItem.fill(-1);
      course.itemBySlot.fill(-1);
      let activeCount = 0;
      for (let itemIndex = 0; itemIndex < batch.items.length; itemIndex += 1) {
        if (course.visible[itemIndex] !== 1) continue;
        course.slotByItem[itemIndex] = activeCount;
        course.itemBySlot[activeCount] = itemIndex;
        batch.mesh.setMatrixAt(activeCount, course.matrices[itemIndex]);
        activeCount += 1;
      }
      course.activeCount = activeCount;
      if (activeCount > 0) {
        batch.mesh.instanceMatrix.addUpdateRange(0, activeCount * 16);
        batch.mesh.instanceMatrix.needsUpdate = true;
        telemetry.batchesDirtied += 1;
        telemetry.matrixFloatsUploaded += activeCount * 16;
        telemetry.matricesWritten += activeCount;
      }
      telemetry.stableRepacks += 1;
    }
    batch.mesh.count = course.activeCount;
    telemetry.submittedItems += course.activeCount;
    if (course.activeCount !== previousCount) telemetry.instanceCountChanges += 1;
  }

  updateDecor(state, segment, currentSample) {
    const telemetry = this.decorFrameStats;
    telemetry.segmentId = segment.shortId;
    telemetry.batches = 0;
    telemetry.itemsVisited = 0;
    telemetry.visibleItems = 0;
    telemetry.hiddenItems = 0;
    telemetry.trackSampleCalls = 0;
    telemetry.retainedPoseUses = 0;
    telemetry.matricesWritten = 0;
    telemetry.batchesDirtied = 0;
    telemetry.matrixFloatsUploaded = 0;
    telemetry.visibilityEdges = 0;
    telemetry.retainedDynamicVisibilityEdges = 0;
    telemetry.submittedItems = 0;
    telemetry.activeSlotSwaps = 0;
    telemetry.stableRepacks = 0;
    telemetry.instanceCountChanges = 0;
    if (this.authoredBatches?.length) {
      const forwardLimit = this.trackRows * this.trackSpacing + 260;
      for (const batch of this.authoredBatches) {
        telemetry.batches += 1;
        telemetry.itemsVisited += batch.items.length;
        if (batch.staticCourse?.segmentId === segment.shortId) {
          // Static authored architecture never spins. Its exact
          // course-space matrices are immutable; one shared translation is
          // mathematically identical to rebuilding every instance relative to
          // the current track sample. Only instances crossing the existing
          // visibility window touch the GPU buffer.
          batch.mesh.position.set(-currentSample.x, -currentSample.y, this.logicalProgress);
          if (batch.staticCourse.stableOrder) {
            this.updateStableStaticCourseBatch(batch, forwardLimit, telemetry);
          } else {
            this.updateOpaqueStaticCourseBatch(batch, forwardLimit, telemetry);
          }
          continue;
        }
        const retainedCourse = batch.dynamicCourse?.segmentId === segment.shortId
          ? batch.dynamicCourse
          : null;
        for (let i = 0; i < batch.items.length; i += 1) {
          const item = batch.items[i];
          const local = item.progress - this.logicalProgress;
          const visible = local > -220 && local < forwardLimit;
          if (retainedCourse) {
            const encoded = visible ? 1 : 0;
            if (retainedCourse.visible[i] !== encoded) {
              retainedCourse.visible[i] = encoded;
              telemetry.visibilityEdges += 1;
              telemetry.retainedDynamicVisibilityEdges += 1;
            }
          }
          if (visible) telemetry.visibleItems += 1;
          else telemetry.hiddenItems += 1;
          if (!visible) {
            if (retainedCourse) batch.mesh.setMatrixAt(i, retainedCourse.hiddenMatrix);
            else {
              this.dummy.position.set(0, -10000, 0);
              this.dummy.scale.setScalar(0.001);
              this.dummy.updateMatrix();
              batch.mesh.setMatrixAt(i, this.dummy.matrix);
            }
            telemetry.matricesWritten += 1;
            continue;
          }
          const pose = retainedCourse?.poses[i] ?? null;
          if (pose) telemetry.retainedPoseUses += 1;
          else telemetry.trackSampleCalls += 1;
          const sample = pose ? null : trackSample(segment, item.progress);
          const cos = pose ? 0 : Math.cos(sample.bank);
          const sin = pose ? 0 : Math.sin(sample.bank);
          const lateral = pose
            ? 0
            : (Number.isFinite(item.lateral)
              ? item.lateral
              : (item.side ?? 0) * sample.width * (item.offset ?? 0));
          this.dummy.position.set(
            (pose?.x ?? (sample.x + lateral * cos)) - currentSample.x,
            (pose?.y ?? (sample.y + lateral * sin + (item.y ?? 0))) - currentSample.y,
            -local,
          );
          this.dummy.rotation.set(
            (item.rx ?? 0),
            (item.ry ?? 0) + state.time * (item.spin ?? 0),
            (pose?.bank ?? sample.bank) + (item.rz ?? 0),
          );
          const widthMultiplier = pose?.widthMultiplier ?? (item.widthScale ? sample.width : 1);
          this.dummy.scale.set(
            (item.sx ?? 1) * widthMultiplier,
            item.sy ?? 1,
            item.sz ?? 1,
          );
          this.dummy.updateMatrix();
          batch.mesh.setMatrixAt(i, this.dummy.matrix);
          telemetry.matricesWritten += 1;
        }
        batch.mesh.instanceMatrix.needsUpdate = true;
        telemetry.batchesDirtied += 1;
        telemetry.matrixFloatsUploaded += batch.items.length * 16;
        telemetry.submittedItems += batch.mesh.count;
      }
      return;
    }
    if (this.decorMeshes.length < 2) return;
    const shortScale = state.short ? 0.075 : 1;
    const logicalProgress = state.segmentProgress / shortScale;
    const [primary, secondary] = this.decorMeshes;
    telemetry.batches = 2;
    telemetry.itemsVisited = this.decorLayout.length;
    for (let i = 0; i < this.decorLayout.length; i += 1) {
      const item = this.decorLayout[i];
      const local = item.progress - logicalProgress;
      const visible = local > -160 && local < this.trackRows * this.trackSpacing + 180;
      if (visible) telemetry.visibleItems += 1;
      else telemetry.hiddenItems += 1;
      const sample = trackSample(segment, item.progress);
      telemetry.trackSampleCalls += 1;
      const baseX = sample.x - currentSample.x + item.side * item.offset;
      const baseY = sample.y - currentSample.y + (segment.type === 'space' ? (item.height - 0.5) * 26 : item.scale * 2.4);
      this.dummy.position.set(baseX, visible ? baseY : -10000, -local);
      this.dummy.rotation.set(item.spin * 0.12, item.spin + state.time * (segment.type === 'space' ? 0.08 : 0.01), item.side * 0.08 + item.variant * 0.11);
      const stretch = segment.type === 'planet' ? (0.8 + item.height * 1.9) : 1;
      this.dummy.scale.set(item.scale, item.scale * stretch, item.scale);
      this.dummy.updateMatrix();
      primary.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.y += segment.type === 'space' ? -item.scale * 4 : item.scale * (5 + item.variant * 2);
      this.dummy.rotation.x += Math.PI * 0.5 + item.variant * 0.2;
      this.dummy.scale.multiplyScalar(0.55 + item.variant * 0.14);
      this.dummy.updateMatrix();
      secondary.setMatrixAt(i, this.dummy.matrix);
      telemetry.matricesWritten += 2;
    }
    primary.instanceMatrix.needsUpdate = true;
    secondary.instanceMatrix.needsUpdate = true;
    telemetry.batchesDirtied = 2;
    telemetry.matrixFloatsUploaded = this.decorLayout.length * 32;
  }

  updatePlanets(state, segment, dt) {
    const fraction = getSegmentFraction(state);
    const morphState = getMorphState(state);
    const currentPlanetIndex = segment.index - 1;
    const destinationIndex = Math.min(8, segment.index);
    this.planetMeshes.forEach((planetGroup, i) => {
      planetGroup.rotation.y += dt * (0.025 + i * 0.004);
      planetGroup.userData.cloud.rotation.y += dt * (0.012 + i * 0.002);
      planetGroup.userData.cloud.rotation.z += dt * 0.0015;
      if (segment.type === 'planet') {
        if (segment.shortId === 'planet-1' && i === 1) {
          planetGroup.visible = true;
          // Match ArrivalArt's first-space pose exactly at launch completion;
          // Thunderglass must not shrink or teleport when its render family
          // changes at the segment boundary.
          planetGroup.position.set(
            lerp(330, 300, morphState.launch),
            lerp(96, 80, morphState.launch),
            lerp(-1660, -1540, morphState.launch),
          );
          planetGroup.scale.setScalar(lerp(58, 64, morphState.launch));
          planetGroup.rotation.z = lerp(-0.28, -0.33, morphState.launch);
        } else {
          const relative = (i - currentPlanetIndex + 9) % 9;
          const angle = relative * 0.91 + 0.3;
          // Three deliberately placed worlds sell the wider course. A loose
          // handful of equally sized spheres reads as an arcade backdrop.
          planetGroup.visible = i !== currentPlanetIndex && (relative === 2 || relative === 4);
          planetGroup.position.set(Math.sin(angle) * 760, 190 + Math.cos(angle * 1.7) * 145, -1280 - relative * 150);
          planetGroup.scale.setScalar(22 + (i % 3) * 7);
        }
      } else {
        const isDestination = i === destinationIndex;
        const isSource = i === currentPlanetIndex;
        if (segment.shortId === 'space-1' && isDestination) {
          planetGroup.visible = false;
          return;
        }
        if (segment.shortId === 'space-1' && isSource) {
          // The attached clone inside launchFallaway owns Scoria's departure;
          // showing this independent globe as well would split the planet back
          // into a floating slab plus a second sphere.
          planetGroup.visible = false;
          return;
        }
        planetGroup.visible = isDestination || isSource || ((i + segment.index) % 5 === 0 && fraction < 0.6);
        if (isDestination) {
          const size = 52 + fraction * fraction * 250;
          planetGroup.position.set(150 - fraction * 90, 82 - fraction * 36, -1320 + fraction * 720);
          planetGroup.scale.setScalar(size);
        } else if (isSource) {
          planetGroup.position.set(-360 - fraction * 260, -225 - fraction * 55, -760 + fraction * 210);
          planetGroup.scale.setScalar(168 - fraction * 92);
        } else {
          planetGroup.position.set((i % 2 ? -1 : 1) * (620 + i * 20), 190 - i * 26, -1300 - i * 70);
          planetGroup.scale.setScalar(28);
        }
      }
    });
    this.horizon.rotation.y += dt * 0.004;
    if (segment.type === 'planet') {
      this.horizon.position.set(0, -954 - morphState.launch * 520, -440 + morphState.launch * 210);
    }
    this.sunOrb.position.x = -420 + Math.sin(state.time * 0.01) * 35;
    this.sunHalo.position.copy(this.sunOrb.position);
  }

  updateRivals(state, segment, dt) {
    const priorVisibleMask = this.rivalFrameStats.visibleMask;
    let visibleMask = 0;
    const currentLocation = locateCourseDistance(state.globalProgress, state.short);
    const combatPresentation = combatPresentationActive(state, segment);
    const segmentFraction = getSegmentFraction(state);
    const approachSpread = segment.shortId === 'space-1' ? smoothstep(0.74, 0.94, segmentFraction) : 0;
    const touchdownSpread = segment.shortId === 'planet-2' ? 1 - smoothstep(0.018, 0.12, segmentFraction) : 0;
    const landingLaneSlots = [-9.4, 9.4, 0];
    const landingDepthByIndex = new Array(state.rivals.length).fill(10);
    const landingOrder = state.rivals
      .map((rival, index) => ({ index, progress: rival.globalProgress }))
      .sort((a, b) => b.progress - a.progress);
    const orderedDepths = [24, 16, 10];
    landingOrder.forEach(({ index }, rank) => {
      landingDepthByIndex[index] = orderedDepths[Math.min(rank, orderedDepths.length - 1)];
    });
    const targetCandidates = [];
    this.currentTargetVehicle = null;
    const isScoria = segment.shortId === 'planet-1';
    const currentTrackSample = isScoria
      ? sampleScoriaTrackInto(segment, this.logicalProgress, this.scoriaFlowSamples.camera)
      : trackSample(segment, this.logicalProgress);
    for (let i = 0; i < state.rivals.length; i += 1) {
      const rival = state.rivals[i];
      const vehicle = this.rivalVehicles[i];
      const delta = rival.globalProgress - state.globalProgress;
      const location = locateCourseDistance(rival.globalProgress, state.short);
      const launchHeroWindow = segment.shortId === 'planet-1' && getMorphState(state).launch > 0.55;
      const behindLaunchCamera = launchHeroWindow && delta < 0;
      const visible = !behindLaunchCamera
        && Math.abs(delta) < 2200
        && Math.abs(location.segmentIndex - currentLocation.segmentIndex) <= 1;
      vehicle.visible = visible;
      if (visible) visibleMask |= (1 << i);
      if (!visible) continue;
      const magnitude = Math.abs(delta);
      const scoriaTrain = segment.shortId === 'planet-1'
        && location.segmentIndex === currentLocation.segmentIndex;
      // Preserve the simulation's sign and strict distance ordering while
      // mapping Scoria's kilometre-scale gaps into a readable 30-150 m train.
      // The asymptote avoids the hard-cap ties that would visually reorder a
      // distant pack; no mechanical progress or race position is changed.
      const scoriaMagnitude = scoriaTrain && magnitude > 30
        ? 30 + 120 * (1 - Math.exp(-(magnitude - 30) / 280))
        : magnitude;
      const compressedMagnitude = segment.type === 'space' && magnitude > 36
        ? Math.min(112, 36 + Math.log1p((magnitude - 36) / 42) * 24)
        : scoriaMagnitude;
      const visualDelta = Math.sign(delta || 1) * compressedMagnitude;
      const visualProgress = this.logicalProgress + visualDelta;
      const sample = isScoria
        ? sampleScoriaTrackInto(segment, visualProgress, this.scoriaFlowSamples.rival)
        : trackSample(segment, visualProgress);
      const morph = morphAt(location.segment, location.localProgress, state.short).morph;
      // Presentation-only formation slots preserve simulation order while
      // guaranteeing the hero one clean silhouette through capture/touchdown.
      // The centred third rival is pushed far ahead instead of sharing the
      // player's contact plane.
      const formationSpread = Math.max(approachSpread, touchdownSpread);
      const laneLimit = Math.max(0, sample.width - 2.6);
      const desiredLane = clamp(state.lateral + landingLaneSlots[i], -laneLimit, laneLimit);
      const presentationLane = (desiredLane - rival.lateral) * formationSpread;
      vehicle.position.x = sample.x - currentTrackSample.x + rival.lateral + presentationLane;
      // Blend into an order-preserving landing train. Both the natural Z and
      // the ranked formation Z have the same order, so the interpolation
      // cannot visually swap racers; the nearest rival still clears the
      // hero's full body length at the contact plane.
      vehicle.position.z = lerp(-visualDelta, -landingDepthByIndex[i], formationSpread);
      const presentationScale = vehicle.userData.presentationBaseScale ?? 1;
      vehicle.scale.setScalar(presentationScale * (segment.type === 'space' ? 1.24 : 1));
      updatePremiumVehicleVisual(vehicle, {
        morph,
        boost: clamp((rival.speed - location.segment.baseSpeed) / 450, 0.1, 1),
        speed: rival.speed,
        yaw: Math.sin(state.time * 0.7 + rival.laneSeed) * 0.12 - rival.lateralVelocity * 0.015,
        roll: -rival.lateralVelocity * 0.028,
        lift: location.segment.type === 'space' ? Math.sin(state.time * 1.3 + i) * 0.8 : 0,
        hitFlash: rival.hitFlash,
        dt,
        time: state.time,
      });
      if (combatPresentation && delta > -18 && visualDelta < 360) targetCandidates.push({ vehicle, delta: Math.max(0, delta), lateral: Math.abs(vehicle.position.x - state.lateral) });
    }
    targetCandidates.sort((a, b) => (a.lateral * 2 + a.delta * 0.018) - (b.lateral * 2 + b.delta * 0.018));
    const target = targetCandidates[0]?.vehicle ?? null;
    this.currentTargetVehicle = target;
    if (target) {
      target.updateWorldMatrix(true, false);
      this.camera.updateMatrixWorld(true);
      this.targetProjection ??= new THREE.Vector3();
      this.targetProjection.setFromMatrixPosition(target.matrixWorld).project(this.camera);
      const onScreen = this.targetProjection.z > -1 && this.targetProjection.z < 1
        && Math.abs(this.targetProjection.x) < 0.94 && Math.abs(this.targetProjection.y) < 0.9;
      document.documentElement.style.setProperty('--target-lock', onScreen ? '1' : '0');
      if (onScreen) {
        document.documentElement.style.setProperty('--target-x', `${((this.targetProjection.x * 0.5 + 0.5) * 100).toFixed(2)}%`);
        document.documentElement.style.setProperty('--target-y', `${((-this.targetProjection.y * 0.5 + 0.5) * 100).toFixed(2)}%`);
      }
    } else {
      document.documentElement.style.setProperty('--target-lock', '0');
    }
    this.rivalFrameStats.visibleMask = visibleMask;
    this.rivalFrameStats.newlyVisibleMask = visibleMask & ~priorVisibleMask;
    this.rivalFrameStats.newlyHiddenMask = priorVisibleMask & ~visibleMask;
    this.rivalFrameStats.visibleCount = (visibleMask & 1)
      + ((visibleMask >> 1) & 1)
      + ((visibleMask >> 2) & 1);
  }

  updateSpeedLines(state, segment, dt) {
    const speedFactor = state.speed * dt * (segment.type === 'space' ? 1.25 : 0.72);
    const length = 10 + clamp((state.speed - segment.baseSpeed) / 500, 0, 1) * 38 + state.boost * 28;
    for (let i = 0; i < this.speedLineData.length; i += 1) {
      const line = this.speedLineData[i];
      line.z += speedFactor;
      if (line.z > 38) {
        line.wraps += 1;
        const sampleIndex = i + line.wraps * this.speedLineCount;
        line.z = line.near
          ? -310 - visualUnit(sampleIndex, 1201) * 150
          : -640 - visualUnit(sampleIndex, 1201) * 220;
        const angle = visualUnit(sampleIndex, 1607) * Math.PI * 2;
        const radius = line.near
          ? 34 + Math.pow(visualUnit(sampleIndex, 2017), 0.52) * 66
          : 74 + Math.pow(visualUnit(sampleIndex, 2017), 0.58) * 64;
        line.x = Math.cos(angle) * radius;
        line.y = Math.sin(angle) * radius * 0.56 + 5;
      }
      const index = i * 6;
      this.speedLinePositions[index] = line.x;
      this.speedLinePositions[index + 1] = line.y;
      this.speedLinePositions[index + 2] = line.z;
      this.speedLinePositions[index + 3] = line.x;
      this.speedLinePositions[index + 4] = line.y;
      this.speedLinePositions[index + 5] = line.z - length;
    }
    this.speedLines.geometry.attributes.position.needsUpdate = true;
    const lowQualityLift = this.quality === 'low' ? 0.014 : 0;
    this.speedLines.material.opacity = (segment.type === 'space' ? 0.054 : 0.027)
      + state.boost * (segment.type === 'space' ? 0.055 : 0.04)
      + lowQualityLift;

    const surface = segment.type === 'planet';
    this.roadFlow.visible = surface;
    if (!surface) return;
    const isScoria = segment.shortId === 'planet-1';
    const current = isScoria
      ? sampleScoriaTrackInto(segment, this.logicalProgress, this.scoriaFlowSamples.current)
      : trackSample(segment, this.logicalProgress);
    const roadLength = 7
      + clamp((state.speed - segment.baseSpeed) / 420, 0, 1) * 18
      + state.boost * 12
      + state.driftCharge * 7;
    // The deterministic short course compresses simulation distance to 7.5%
    // while rendering against the full authored track. Keep these genuinely
    // world-anchored marks in the same distance domain as logicalProgress;
    // otherwise QA/capture optic flow crawls at 1/13.33 of the road beneath it.
    const shortScale = state.short ? 0.075 : 1;
    const travel = state.speed * dt / shortScale;
    const flowColor = this.tmpColor.set(isScoria ? 0xa88775 : segment.secondary);
    for (let i = 0; i < this.roadFlowData.length; i += 1) {
      const mark = this.roadFlowData[i];
      mark.z += travel;
      if (mark.z > 16) {
        mark.wraps += 1;
        const sampleIndex = i + mark.wraps * this.roadFlowCount;
        mark.z = -560 - visualUnit(sampleIndex, 3583) * 180;
        let lateral = visualUnit(sampleIndex, 3767) * 1.84 - 0.92;
        if (Math.abs(lateral) < 0.28) lateral += lateral < 0 ? -0.3 : 0.3;
        mark.lateral = lateral;
      }
      const farZ = mark.z - roadLength;
      const nearSample = isScoria
        ? sampleScoriaTrackInto(segment, this.logicalProgress - mark.z, this.scoriaFlowSamples.near)
        : trackSample(segment, this.logicalProgress - mark.z);
      const farSample = isScoria
        ? sampleScoriaTrackInto(segment, this.logicalProgress - farZ, this.scoriaFlowSamples.far)
        : trackSample(segment, this.logicalProgress - farZ);
      const nearCos = Math.cos(nearSample.bank);
      const nearSin = Math.sin(nearSample.bank);
      const farCos = Math.cos(farSample.bank);
      const farSin = Math.sin(farSample.bank);
      const nearLateral = mark.lateral * nearSample.width;
      const farLateral = mark.lateral * farSample.width;
      const index = i * 6;
      this.roadFlowPositions[index] = nearSample.x - current.x + nearLateral * nearCos;
      this.roadFlowPositions[index + 1] = nearSample.y - current.y - 0.37 + nearLateral * nearSin;
      this.roadFlowPositions[index + 2] = mark.z;
      this.roadFlowPositions[index + 3] = farSample.x - current.x + farLateral * farCos;
      this.roadFlowPositions[index + 4] = farSample.y - current.y - 0.37 + farLateral * farSin;
      this.roadFlowPositions[index + 5] = farZ;
      const depthFade = smoothstep(-730, -130, mark.z) * (1 - smoothstep(-34, 16, mark.z));
      const peripheralResponse = 0.5 + Math.abs(mark.lateral) * 0.28;
      const nearBrightness = depthFade * peripheralResponse * mark.authoredVariation;
      const farBrightness = nearBrightness * mark.farBrightnessScale;
      this.roadFlowColors[index] = flowColor.r * nearBrightness;
      this.roadFlowColors[index + 1] = flowColor.g * nearBrightness;
      this.roadFlowColors[index + 2] = flowColor.b * nearBrightness;
      this.roadFlowColors[index + 3] = flowColor.r * farBrightness;
      this.roadFlowColors[index + 4] = flowColor.g * farBrightness;
      this.roadFlowColors[index + 5] = flowColor.b * farBrightness;
    }
    this.roadFlow.geometry.attributes.position.needsUpdate = true;
    this.roadFlow.geometry.attributes.color.needsUpdate = true;
    const steadySurfaceSpeed = clamp(
      (state.speed - segment.baseSpeed) / Math.max(1, segment.maxSpeed - segment.baseSpeed),
      0,
      1,
    );
    this.roadFlow.material.opacity = 0.04
      + steadySurfaceSpeed * 0.052
      + state.boost * 0.034
      + state.driftCharge * 0.028
      + (this.quality === 'low' ? 0.012 : 0);
  }

  processEvents(state, events, segment) {
    const combatPresentation = combatPresentationActive(state, segment);
    for (const item of events) {
      const intensity = item.intensity ?? 0.35;
      if (item.type === 'shot' && combatPresentation) this.cameraDirector.trauma('shot', intensity);
      else if ((item.type === 'shot-hit' || item.type === 'echo-hit') && combatPresentation) {
        this.cameraDirector.trauma('hit', intensity * 0.55);
      }
      else if (item.type === 'player-hit' && combatPresentation) this.cameraDirector.trauma('hit', intensity);
      else if (item.type === 'incoming-dodge' && combatPresentation) this.cameraDirector.trauma('boost', intensity * 0.72);
      else if (item.type === 'launch') this.cameraDirector.trauma('launch', intensity);
      else if (item.type === 'landing') this.cameraDirector.trauma('touchdown', intensity);
      else if (['thermal-sling', 'space-gate', 'lightning-ride', 'crown-ring'].includes(item.type)) this.cameraDirector.trauma('boost', intensity * 0.55);
      if (item.type === 'shot' && combatPresentation) {
        const targetIndex = state.rivals.findIndex((rival) => rival.id === item.targetId);
        const target = targetIndex >= 0 ? this.rivalVehicles[targetIndex] : this.currentTargetVehicle;
        if (target?.visible) {
          this.combatFX.firePlayer({
            target,
            targetId: item.targetId ?? target.name,
            hit: Boolean(item.hit),
            // A deliberate miss must remain legible against the Cathedral's
            // cyan rails; its hot tracer contrasts while confirmed-hit bolts
            // retain the cyan return-signal language.
            color: item.hit ? segment.secondary : segment.accent,
            time: state.time,
          });
        }
      } else if (item.type === 'rival-shot' && combatPresentation) {
        const sourceIndex = state.rivals.findIndex((rival) => rival.id === item.sourceId);
        const source = sourceIndex >= 0 ? this.rivalVehicles[sourceIndex] : null;
        if (source?.visible) {
          this.combatFX.fireRival({
            shotId: item.shotId,
            source,
            targetPosition: this.playerVehicle,
            aimed: true,
            missSide: item.missSide,
            travelTime: item.flightTime,
            color: state.rivals[sourceIndex]?.color ?? 0xff4c76,
            time: state.time,
          });
        }
      } else if (item.type === 'player-hit' && combatPresentation) {
        const sourceIndex = state.rivals.findIndex((rival) => rival.id === item.sourceId);
        this.combatFX.hitTarget(this.playerVehicle, {
          externalShotId: item.shotId,
          color: state.rivals[sourceIndex]?.color ?? 0xff4c76,
          time: state.time,
          returnToPlayer: false,
        });
      }
      if (['drift-release', 'thermal-sling', 'lightning-ride', 'ice-bloom', 'worm-surf', 'gravity-lean', 'echo-break', 'crown-ring', 'space-gate', 'incoming-dodge'].includes(item.type)) {
        this.shake = Math.max(this.shake, intensity * 0.7);
        this.flash = Math.max(this.flash, intensity * 0.24);
        // Drift already has authored tyre trails, suspension load, camera kick,
        // and a boost surge. Generic glowing balls made the release read like
        // a pickup explosion instead of rubber unloading into acceleration.
        if (item.type !== 'drift-release') {
          const amount = Math.round(4 + intensity * 6);
          this.particles.spawn(new THREE.Vector3(this.playerVehicle.position.x, 0.15, 2.7), segment.accent, amount, 6 + intensity * 6, new THREE.Vector3(0, 0.12, 1));
        }
      } else if (item.type === 'launch') {
        this.shake = 1.3;
        this.flash = 0.55;
        this.particles.spawn(new THREE.Vector3(this.playerVehicle.position.x, 0.27 + state.lift, 3.2), segment.secondary, 28, 18, new THREE.Vector3(0, 0.1, 1));
      } else if (item.type === 'landing') {
        this.shake = 1.05;
        this.flash = 0.42;
        this.particles.spawn(new THREE.Vector3(this.playerVehicle.position.x, -0.1, 1.7), segment.accent, 24, 13, new THREE.Vector3(0, 0.2, 1));
      } else if (item.type === 'finish') {
        this.shake = 1.4;
        this.flash = 1.3;
        this.particles.spawn(this.playerVehicle.position, 0xffffff, 110, 30);
      } else if (['rail-touch', 'vent-burst', 'space-near-miss'].includes(item.type)) {
        this.shake = Math.max(this.shake, 0.28);
        this.particles.spawn(this.playerVehicle.position, segment.secondary, 10, 7);
      } else if (item.type === 'player-hit') {
        this.shake = Math.max(this.shake, 0.82);
        this.flash = Math.max(this.flash, 0.34);
        this.particles.spawn(this.playerVehicle.position, 0xff5f86, 18, 11, new THREE.Vector3(item.side * 0.3, 0.18, 1));
      } else if (item.type === 'incoming-whiff') {
        this.particles.spawn(this.playerVehicle.position, segment.accent, 8, 9, new THREE.Vector3(-item.side * 0.4, 0.08, 1));
      }
    }
  }

  updateCamera(state, segment, currentSample, dt) {
    const morph = getMorphState(state);
    const speedNorm = clamp((state.speed - segment.baseSpeed) / Math.max(1, segment.maxSpeed - segment.baseSpeed), 0, 1);
    const next = segment.shortId === 'planet-1'
      ? sampleScoriaTrackInto(segment, this.logicalProgress + 80, this.scoriaFlowSamples.camera)
      : trackSample(segment, this.logicalProgress + 80);
    this.cameraDirector.update({
      state,
      segment,
      morphState: morph,
      currentSample,
      nextSample: next,
      vehicleFrame: this.playerSurfaceFrame,
      vehiclePitch: this.playerVehiclePitch,
      dt,
    });
    this.shake = Math.max(0, this.shake - dt * 2.2);
    this.flash = Math.max(0, this.flash - dt * 2.8);
    const cssValues = this.cameraCssValues;
    const speedValue = speedNorm.toFixed(3);
    const boostValue = state.boost.toFixed(3);
    const flashValue = clamp(this.flash, 0, 1).toFixed(3);
    const driftValue = state.drifting ? Math.max(0.2, state.driftCharge).toFixed(3) : '0';
    // Sharpness is what actually decides the race (see SHARPNESS_* in sim.js).
    // It is published to CSS so the player can see the thing that is beating
    // or losing the race for them, rather than having to infer it.
    const sharpnessValue = clamp(state.sharpness ?? 0, 0, 1).toFixed(3);
    // The drift loop, published so it can be seen. Charge alone was already
    // here and unused; what was missing were the two moments that teach the
    // loop - when the drift is worth taking, and when the rail just killed it.
    const driftRipeValue = (state.drifting && !state.driftRailInvalidated
      && state.driftCharge >= DRIFT_RIPE_CHARGE) ? '1' : '0';
    const driftVoidValue = clamp(state.driftVoidFlash ?? 0, 0, 1).toFixed(3);
    if (cssValues.speed !== speedValue) {
      cssValues.speed = speedValue;
      document.documentElement.style.setProperty('--speed', speedValue);
    }
    if (cssValues.boost !== boostValue) {
      cssValues.boost = boostValue;
      document.documentElement.style.setProperty('--boost', boostValue);
    }
    if (cssValues.flash !== flashValue) {
      cssValues.flash = flashValue;
      document.documentElement.style.setProperty('--flash', flashValue);
    }
    if (cssValues.drift !== driftValue) {
      cssValues.drift = driftValue;
      document.documentElement.style.setProperty('--drift', driftValue);
    }
    if (cssValues.sharpness !== sharpnessValue) {
      cssValues.sharpness = sharpnessValue;
      document.documentElement.style.setProperty('--sharpness', sharpnessValue);
    }
    if (cssValues.driftRipe !== driftRipeValue) {
      cssValues.driftRipe = driftRipeValue;
      document.documentElement.style.setProperty('--drift-ripe', driftRipeValue);
      // Also as a body attribute: the ripe state changes hue, not just level,
      // and a plain attribute selector is a far sturdier hook for that than
      // pattern-matching the inline style string.
      document.body.dataset.driftRipe = driftRipeValue;
    }
    if (cssValues.driftVoid !== driftVoidValue) {
      cssValues.driftVoid = driftVoidValue;
      document.documentElement.style.setProperty('--drift-void', driftVoidValue);
    }
  }

  update(state, events, dt) {
    const rendererProfile = this.rendererProfileEnabled ? {
      expectedLiveFrameSerial: this.liveFrameSerial + 1,
      raceTime: state.time,
      segmentIndex: state.segmentIndex,
      segmentProgress: state.segmentProgress,
      started: Boolean(state.started),
      dtMs: dt * 1000,
      phases: {},
    } : null;
    const rendererProfileStartedAt = rendererProfile ? performance.now() : 0;
    let rendererProfileCursor = rendererProfileStartedAt;
    const markRendererProfile = rendererProfile ? (name) => {
      const now = performance.now();
      rendererProfile.phases[name] = now - rendererProfileCursor;
      rendererProfileCursor = now;
    } : null;
    const segment = COURSE[state.segmentIndex];
    this.setSegment(segment, state.seed);
    this.sky.material.uniforms.time.value = state.time;
    if (rendererProfile) markRendererProfile('segmentSetupMs');
    const { current } = this.updateTrack(state, segment);
    if (rendererProfile) markRendererProfile('trackMs');
    const morph = getMorphState(state);
    const inStormglassTouchdown = segment.shortId === 'planet-2' && this.logicalProgress < 855;
    this.decorRoot.visible = !inStormglassTouchdown;
    this.updateGates(state, segment, current);
    this.updateLaunchFallaway(state, segment);
    if (rendererProfile) markRendererProfile('gatesAndFallawayMs');
    const decorStarted = performance.now();
    this.updateDecor(state, segment, current);
    this.lastDecorUpdateMs = performance.now() - decorStarted;
    if (rendererProfile) markRendererProfile('decorMs');
    this.updatePlanets(state, segment, dt);
    if (rendererProfile) markRendererProfile('planetsMs');
    const segmentAhead = segment.shortId === 'planet-1'
      ? sampleScoriaTrackInto(segment, this.logicalProgress + 18, this.scoriaFlowSamples.near)
      : trackSample(segment, this.logicalProgress + 18);
    const usesStormglassEntrySurface = segment.shortId === 'space-1' && morph.landing > 0;
    const surfaceCurrent = usesStormglassEntrySurface
      ? this.stormglassEntrySurface.current
      : current;
    const surfaceAhead = usesStormglassEntrySurface
      ? this.stormglassEntrySurface.ahead
      : segmentAhead;
    const pitch = -Math.atan2(surfaceAhead.y - surfaceCurrent.y, 18) * morph.surface;
    writeVehicleSurfaceFrame(this.playerSurfaceFrame, {
      lateral: state.lateral,
      width: surfaceCurrent.width,
      bank: surfaceCurrent.bank,
      surface: morph.surface,
      lift: state.lift,
      roadColumns: this.roadColumns,
      pitch,
    });
    this.playerSurfaceSource = usesStormglassEntrySurface ? 'planet-2-entry' : 'segment';
    this.playerVehicle.position.x = this.playerSurfaceFrame.x;
    this.playerVehicle.position.y = this.playerSurfaceFrame.y;
    this.playerVehicle.rotation.x = pitch;
    this.playerVehicle.rotation.z = this.playerSurfaceFrame.bank;
    this.playerVehiclePitch = pitch;
    updatePremiumVehicleVisual(this.playerVehicle, {
      morph: morph.morph,
      boost: state.boost,
      speed: state.speed,
      yaw: state.yaw,
      roll: state.roll,
      // Launch, free-flight, reentry, and touchdown altitude live entirely in
      // simulation state so the rendered hull shares the exact same physical
      // trajectory on both sides of every mode boundary.
      lift: state.lift,
      drift: state.driftCharge,
      driftSide: state.driftSide,
      steer: state.lastInput?.steer ?? 0,
      releaseKick: events.some((event) => event.type === 'drift-release') ? Math.max(0.35, state.boost) : 0,
      hitFlash: state.incomingHitFlash,
      dt,
      time: state.time,
    });
    if (rendererProfile) markRendererProfile('vehicleAndSurfaceMs');
    this.updateTransitionFX(state, segment, dt);
    const onStormglassApproach = segment.shortId === 'space-1' && morph.landing > 0.5;
    const touchdownProgress = segment.shortId === 'planet-2'
      ? this.logicalProgress
      : lerp(-260, 0, smoothstep(0.5, 1, morph.landing));
    this.touchdownArt.update({
      active: inStormglassTouchdown || onStormglassApproach,
      time: state.time,
      dt,
      progress: touchdownProgress,
      speed: state.speed,
      camera: this.camera,
      visibility: segment.shortId === 'planet-2' ? 1 : smoothstep(0.5, 0.96, morph.landing),
      contact: events.some((event) => event.type === 'landing'),
      lateral: state.lateral,
    });
    if (rendererProfile) markRendererProfile('transitionAndTouchdownMs');
    this.updateRivals(state, segment, dt);
    this.updateSpeedLines(state, segment, dt);
    this.updateAtmosphereFlow(state, segment, dt);
    this.tireTrails.update(state, segment, dt);
    this.processEvents(state, events, segment);
    if (segment.type === 'space' && !combatPresentationActive(state, segment)) this.combatFX.clear();
    this.combatFX.update(dt, state.time);
    if (rendererProfile) markRendererProfile('rivalsAndFlowFxMs');
    if (dt > 0 && state.drifting && this.presentationRandom.next() < dt * 58) {
      this.particles.spawn(new THREE.Vector3(state.lateral - state.driftSide * 1.15, 0, 1.5), segment.secondary, 2, 4, new THREE.Vector3(-state.driftSide * 0.25, 0.2, 1));
    } else if (dt > 0 && segment.type === 'space' && this.presentationRandom.next() < dt * 44) {
      this.particles.spawn(new THREE.Vector3(state.lateral, 0.2, 2.2), segment.accent, 1, 8, new THREE.Vector3(0, 0, 1));
    }
    this.particles.update(dt);
    if (rendererProfile) markRendererProfile('particlesMs');
    this.updateCamera(state, segment, current, dt);
    this.stars.rotation.y += dt * 0.003;
    if (rendererProfile) {
      markRendererProfile('cameraAndFinalizeMs');
      rendererProfile.totalMs = performance.now() - rendererProfileStartedAt;
      rendererProfile.segmentId = segment.id;
      rendererProfile.segmentFraction = state.segmentProgress / segmentLength(segment, state.short);
      rendererProfile.track = this.lastTrackProfileSample ? { ...this.lastTrackProfileSample } : null;
      this.lastRendererProfile = rendererProfile;
    }
    if (this.drawOwnershipCensusEnabled) {
      this.drawOwnershipCensusContext = {
        expectedLiveFrameSerial: this.liveFrameSerial + 1,
        raceTime: state.time,
        segmentId: segment.id,
        segmentShortId: segment.shortId,
        segmentIndex: state.segmentIndex,
        segmentProgress: state.segmentProgress,
        segmentFraction: state.segmentProgress / segmentLength(segment, state.short),
        logicalProgress: this.logicalProgress,
        speed: state.speed,
        lateral: state.lateral,
        morph: morph.morph,
        launch: morph.launch,
        landing: morph.landing,
      };
    }
  }

  isDrawOwnershipDescendant(object, ancestor) {
    if (!object || !ancestor) return false;
    for (let cursor = object; cursor; cursor = cursor.parent) {
      if (cursor === ancestor) return true;
    }
    return false;
  }

  drawOwnershipPath(object, ancestor = this.scene) {
    const parts = [];
    for (let cursor = object; cursor && cursor !== ancestor; cursor = cursor.parent) {
      const base = cursor.name || cursor.type || 'Object3D';
      const parent = cursor.parent;
      if (!parent) {
        parts.push(base);
        break;
      }
      const peers = parent.children.filter((child) => (child.name || child.type || 'Object3D') === base);
      const suffix = peers.length > 1 ? `[${peers.indexOf(cursor)}]` : '';
      parts.push(`${base}${suffix}`);
    }
    return parts.reverse().join('/');
  }

  resolveDrawOwnership(object) {
    const authoredIndex = this.authoredBatches?.findIndex((batch) => batch.mesh === object) ?? -1;
    if (authoredIndex >= 0) {
      const label = SCORIA_AUTHORED_BATCH_LABELS[authoredIndex] ?? `batch-${authoredIndex}`;
      return { subtree: `authored-p1/${label}`, path: `authored-p1/${label}` };
    }
    if (this.isDrawOwnershipDescendant(object, this.playerVehicle)) {
      const wheel = this.playerVehicle?.userData?.wheelAssemblies?.find(
        (assembly) => this.isDrawOwnershipDescendant(object, assembly),
      );
      const relative = this.drawOwnershipPath(object, this.playerVehicle);
      return {
        subtree: wheel ? 'hero/player-vehicle/wheels' : 'hero/player-vehicle',
        path: `hero/player-vehicle/${relative}`,
      };
    }
    const rivalIndex = this.rivalVehicles?.findIndex(
      (vehicle) => this.isDrawOwnershipDescendant(object, vehicle),
    ) ?? -1;
    if (rivalIndex >= 0) {
      return {
        subtree: `rivals/rival-${rivalIndex}`,
        path: `rivals/rival-${rivalIndex}/${this.drawOwnershipPath(object, this.rivalVehicles[rivalIndex])}`,
      };
    }
    const gateIndex = this.gates?.findIndex((gate) => this.isDrawOwnershipDescendant(object, gate)) ?? -1;
    if (gateIndex >= 0) {
      return {
        subtree: 'course/gates',
        path: `course/gates/gate-${gateIndex}/${this.drawOwnershipPath(object, this.gates[gateIndex])}`,
      };
    }
    const vistaIndex = this.planetMeshes?.findIndex(
      (planet) => this.isDrawOwnershipDescendant(object, planet),
    ) ?? -1;
    if (vistaIndex >= 0) {
      return {
        subtree: `vista-planets/planet-${vistaIndex + 1}`,
        path: `vista-planets/planet-${vistaIndex + 1}/${this.drawOwnershipPath(object, this.planetMeshes[vistaIndex])}`,
      };
    }
    if (this.isDrawOwnershipDescendant(object, this.scoriaHaze)) {
      return {
        subtree: 'atmosphere/scoria-haze',
        path: `atmosphere/scoria-haze/${this.drawOwnershipPath(object, this.scoriaHaze)}`,
      };
    }
    const surfaceMatches = [
      [this.road, 'surface/road'],
      [this.terrain, 'surface/terrain'],
      [this.reflectors, 'surface/reflectors'],
      [this.expansionJoints, 'surface/expansion-joints'],
    ];
    for (const [candidate, label] of surfaceMatches) {
      if (candidate === object) return { subtree: label, path: label };
    }
    const lavaIndex = this.lavaRibbons?.indexOf(object) ?? -1;
    if (lavaIndex >= 0) {
      const side = object.userData?.side < 0 ? 'left' : 'right';
      return { subtree: 'surface/lava-ribbons', path: `surface/lava-ribbons/${side}-${lavaIndex}` };
    }
    const laneIndex = this.laneLines?.indexOf(object) ?? -1;
    if (laneIndex >= 0) {
      return { subtree: 'surface/lane-lines', path: `surface/lane-lines/lane-${object.userData?.lane ?? laneIndex}` };
    }
    const edgeIndex = this.edgeLines?.indexOf(object) ?? -1;
    if (edgeIndex >= 0) {
      const side = object.userData?.side < 0 ? 'left' : 'right';
      return { subtree: 'surface/edge-lines', path: `surface/edge-lines/${side}` };
    }
    if (this.isDrawOwnershipDescendant(object, this.launchAperture)) {
      return {
        subtree: 'launch/aperture',
        path: `launch/aperture/${this.drawOwnershipPath(object, this.launchAperture)}`,
      };
    }
    if (this.isDrawOwnershipDescendant(object, this.launchFallaway)) {
      return {
        subtree: 'launch/fallaway',
        path: `launch/fallaway/${this.drawOwnershipPath(object, this.launchFallaway)}`,
      };
    }
    if (this.isDrawOwnershipDescendant(object, this.arrivalArt?.root)) {
      return {
        subtree: 'transition/arrival',
        path: `transition/arrival/${this.drawOwnershipPath(object, this.arrivalArt.root)}`,
      };
    }
    if (this.isDrawOwnershipDescendant(object, this.touchdownArt?.root)) {
      return {
        subtree: 'transition/touchdown',
        path: `transition/touchdown/${this.drawOwnershipPath(object, this.touchdownArt.root)}`,
      };
    }
    if (object === this.sky) return { subtree: 'sky', path: 'sky/dome' };
    if (object === this.stars) return { subtree: 'sky', path: 'sky/stars' };
    if (object === this.horizon) return { subtree: 'sky', path: 'sky/horizon' };
    if (object === this.sunOrb) return { subtree: 'sky', path: 'sky/sun-orb' };
    if (object === this.sunHalo) return { subtree: 'sky', path: 'sky/sun-halo' };
    const path = this.drawOwnershipPath(object);
    const rootName = path.split('/')[0] || 'unnamed';
    return { subtree: `other/${rootName}`, path: `other/${path}` };
  }

  drawOwnershipGeometry(geometry, group, material) {
    const position = geometry?.attributes?.position;
    const indexedCount = geometry?.index?.count;
    const available = Number.isFinite(indexedCount) ? indexedCount : (position?.count ?? 0);
    const rangeFactor = material?.wireframe === true ? 2 : 1;
    const drawRange = geometry?.drawRange ?? { start: 0, count: Infinity };
    let start = Math.max(0, (drawRange.start ?? 0) * rangeFactor);
    let end = (drawRange.start + drawRange.count) * rangeFactor;
    if (!Number.isFinite(end)) end = available;
    if (group) {
      start = Math.max(start, group.start * rangeFactor);
      end = Math.min(end, (group.start + group.count) * rangeFactor);
    }
    end = Math.min(end, available);
    return {
      id: geometry?.id ?? null,
      uuid: geometry?.uuid ?? null,
      name: geometry?.name || '',
      type: geometry?.type ?? null,
      indexed: Boolean(geometry?.index),
      availableElements: available,
      drawStart: start,
      drawElements: Math.max(0, end - start),
      drawRange: {
        start: drawRange.start,
        count: Number.isFinite(drawRange.count) ? drawRange.count : 'Infinity',
      },
      group: group ? { start: group.start, count: group.count, materialIndex: group.materialIndex } : null,
      exact: material?.wireframe !== true,
    };
  }

  drawOwnershipMaterial(material) {
    return {
      id: material?.id ?? null,
      uuid: material?.uuid ?? null,
      name: material?.name || '',
      type: material?.type ?? null,
      color: material?.color?.isColor ? `#${material.color.getHexString()}` : null,
      emissive: material?.emissive?.isColor ? `#${material.emissive.getHexString()}` : null,
      transparent: Boolean(material?.transparent),
      opacity: material?.opacity ?? null,
      side: material?.side ?? null,
      wireframe: Boolean(material?.wireframe),
      forceSinglePass: material?.forceSinglePass ?? null,
    };
  }

  createDrawOwnershipMetric() {
    return {
      callbackInvocations: 0,
      physicalDrawCalls: 0,
      submittedInstances: 0,
      maxInstancesPerDraw: 0,
      triangles: 0,
      lines: 0,
      points: 0,
      drawElements: 0,
      objectIds: new Set(),
    };
  }

  addDrawOwnershipMetric(metric, measurement) {
    metric.callbackInvocations += 1;
    metric.physicalDrawCalls += measurement.physicalDrawCalls;
    metric.submittedInstances += measurement.submittedInstances;
    metric.maxInstancesPerDraw = Math.max(metric.maxInstancesPerDraw, measurement.instancesPerDraw);
    metric.triangles += measurement.triangles;
    metric.lines += measurement.lines;
    metric.points += measurement.points;
    metric.drawElements += measurement.drawElements;
    metric.objectIds.add(measurement.objectId);
  }

  serializeDrawOwnershipMetric(metric) {
    return {
      callbackInvocations: metric.callbackInvocations,
      physicalDrawCalls: metric.physicalDrawCalls,
      uniqueObjects: metric.objectIds.size,
      submittedInstances: metric.submittedInstances,
      maxInstancesPerDraw: metric.maxInstancesPerDraw,
      triangles: metric.triangles,
      lines: metric.lines,
      points: metric.points,
      drawElements: metric.drawElements,
    };
  }

  recordDrawOwnership(pass, object, geometry, material, group) {
    const active = this.activeDrawOwnershipCensus;
    if (!active) return;
    const ownership = this.resolveDrawOwnership(object);
    const geometryRecord = this.drawOwnershipGeometry(geometry, group, material);
    let instancesPerDraw = 1;
    if (object.isInstancedMesh) instancesPerDraw = object.count;
    else if (geometry?.isInstancedBufferGeometry) instancesPerDraw = geometry.instanceCount;
    const transparentDoublePass = pass === 'main'
      && material?.transparent === true
      && material.side === THREE.DoubleSide
      && material.forceSinglePass === false;
    const physicalDrawCalls = instancesPerDraw <= 0 ? 0 : (transparentDoublePass ? 2 : 1);
    const submittedInstances = instancesPerDraw * physicalDrawCalls;
    let triangles = 0;
    let lines = 0;
    let points = 0;
    if (object.isPoints) points = geometryRecord.drawElements * submittedInstances;
    else if (object.isLineSegments) lines = geometryRecord.drawElements * 0.5 * submittedInstances;
    else if (object.isLineLoop) lines = geometryRecord.drawElements * submittedInstances;
    else if (object.isLine) lines = Math.max(0, geometryRecord.drawElements - 1) * submittedInstances;
    else if (material?.wireframe === true) lines = geometryRecord.drawElements * 0.5 * submittedInstances;
    else triangles = geometryRecord.drawElements / 3 * submittedInstances;
    const measurement = {
      objectId: object.id,
      physicalDrawCalls,
      submittedInstances,
      instancesPerDraw,
      triangles,
      lines,
      points,
      drawElements: geometryRecord.drawElements * physicalDrawCalls,
    };
    this.addDrawOwnershipMetric(active.totals[pass], measurement);
    let subtreeMetric = active.subtrees.get(ownership.subtree);
    if (!subtreeMetric) {
      subtreeMetric = { main: this.createDrawOwnershipMetric(), shadow: this.createDrawOwnershipMetric() };
      active.subtrees.set(ownership.subtree, subtreeMetric);
    }
    this.addDrawOwnershipMetric(subtreeMetric[pass], measurement);
    const key = `${pass}:${object.id}:${geometry?.id ?? 'none'}:${material?.id ?? 'none'}:${group?.start ?? 'all'}:${group?.count ?? 'all'}`;
    let entry = active.entries.get(key);
    if (!entry) {
      entry = {
        pass,
        ownership,
        object: {
          id: object.id,
          uuid: object.uuid,
          name: object.name || '',
          type: object.type,
          castShadow: Boolean(object.castShadow),
          receiveShadow: Boolean(object.receiveShadow),
          frustumCulled: Boolean(object.frustumCulled),
          visible: Boolean(object.visible),
          instanceCount: object.isInstancedMesh ? object.count : 1,
        },
        geometry: geometryRecord,
        material: this.drawOwnershipMaterial(material),
        metrics: this.createDrawOwnershipMetric(),
      };
      active.entries.set(key, entry);
    }
    this.addDrawOwnershipMetric(entry.metrics, measurement);
  }

  syncDrawOwnershipHooks() {
    if (!this.drawOwnershipCensusEnabled) return;
    const owner = this;
    let renderableCount = 0;
    let installedThisFrame = 0;
    let existingBeforeRender = 0;
    let existingBeforeShadow = 0;
    const inventory = [];
    this.scene.traverse((object) => {
      if (!(object.isMesh || object.isLine || object.isPoints || object.isSprite)) return;
      renderableCount += 1;
      let effectivelyVisible = true;
      for (let cursor = object; cursor; cursor = cursor.parent) {
        if (!cursor.visible) {
          effectivelyVisible = false;
          break;
        }
      }
      const ownership = this.resolveDrawOwnership(object);
      const materials = (Array.isArray(object.material) ? object.material : [object.material])
        .filter(Boolean)
        .map((material) => this.drawOwnershipMaterial(material));
      inventory.push({
        ownership,
        object: {
          id: object.id,
          uuid: object.uuid,
          name: object.name || '',
          type: object.type,
          visible: Boolean(object.visible),
          effectivelyVisible,
          castShadow: Boolean(object.castShadow),
          receiveShadow: Boolean(object.receiveShadow),
          instanceCount: object.isInstancedMesh ? object.count : 1,
        },
        geometry: this.drawOwnershipGeometry(
          object.geometry,
          null,
          Array.isArray(object.material) ? object.material[0] : object.material,
        ),
        materials,
      });
      const prior = this.drawOwnershipCensusHooks.get(object);
      if (prior
        && object.onBeforeRender === prior.beforeRenderWrapper
        && object.onBeforeShadow === prior.beforeShadowWrapper) {
        if (prior.customBeforeRender) existingBeforeRender += 1;
        if (prior.customBeforeShadow) existingBeforeShadow += 1;
        return;
      }
      const originalBeforeRender = prior && object.onBeforeRender === prior.beforeRenderWrapper
        ? prior.originalBeforeRender
        : object.onBeforeRender;
      const originalBeforeShadow = prior && object.onBeforeShadow === prior.beforeShadowWrapper
        ? prior.originalBeforeShadow
        : object.onBeforeShadow;
      const customBeforeRender = originalBeforeRender !== THREE.Object3D.prototype.onBeforeRender;
      const customBeforeShadow = originalBeforeShadow !== THREE.Object3D.prototype.onBeforeShadow;
      function beforeRenderWrapper(...args) {
        const result = originalBeforeRender.apply(this, args);
        owner.recordDrawOwnership('main', this, args[3], args[4], args[5]);
        return result;
      }
      function beforeShadowWrapper(...args) {
        const result = originalBeforeShadow.apply(this, args);
        owner.recordDrawOwnership('shadow', this, args[4], args[5], args[6]);
        return result;
      }
      object.onBeforeRender = beforeRenderWrapper;
      object.onBeforeShadow = beforeShadowWrapper;
      this.drawOwnershipCensusHooks.set(object, {
        originalBeforeRender,
        originalBeforeShadow,
        beforeRenderWrapper,
        beforeShadowWrapper,
        customBeforeRender,
        customBeforeShadow,
      });
      installedThisFrame += 1;
      if (customBeforeRender) existingBeforeRender += 1;
      if (customBeforeShadow) existingBeforeShadow += 1;
    });
    return {
      renderableCount,
      installedThisFrame,
      existingBeforeRender,
      existingBeforeShadow,
      inventory,
    };
  }

  beginDrawOwnershipCensusFrame() {
    const hookResult = this.syncDrawOwnershipHooks();
    const { inventory, ...hooks } = hookResult;
    this.activeDrawOwnershipCensus = {
      context: this.drawOwnershipCensusContext ? { ...this.drawOwnershipCensusContext } : null,
      hooks,
      totals: {
        main: this.createDrawOwnershipMetric(),
        shadow: this.createDrawOwnershipMetric(),
      },
      subtrees: new Map(),
      entries: new Map(),
      inventory,
    };
  }

  finishDrawOwnershipCensusFrame() {
    const active = this.activeDrawOwnershipCensus;
    this.activeDrawOwnershipCensus = null;
    if (!active) return;
    const main = this.serializeDrawOwnershipMetric(active.totals.main);
    const shadow = this.serializeDrawOwnershipMetric(active.totals.shadow);
    const rendererTotals = {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      lines: this.renderer.info.render.lines,
      points: this.renderer.info.render.points,
    };
    const attributed = {
      calls: main.physicalDrawCalls + shadow.physicalDrawCalls,
      triangles: main.triangles + shadow.triangles,
      lines: main.lines + shadow.lines,
      points: main.points + shadow.points,
    };
    const unownedPostOrInternal = {
      calls: rendererTotals.calls - attributed.calls,
      triangles: rendererTotals.triangles - attributed.triangles,
      lines: rendererTotals.lines - attributed.lines,
      points: rendererTotals.points - attributed.points,
    };
    const subtrees = [...active.subtrees.entries()].map(([name, metrics]) => ({
      name,
      main: this.serializeDrawOwnershipMetric(metrics.main),
      shadow: this.serializeDrawOwnershipMetric(metrics.shadow),
    })).sort((a, b) => a.name.localeCompare(b.name));
    const entries = [...active.entries.values()].map((entry) => ({
      ...entry,
      metrics: this.serializeDrawOwnershipMetric(entry.metrics),
    })).sort((a, b) => (
      a.pass.localeCompare(b.pass)
      || a.ownership.path.localeCompare(b.ownership.path)
      || (a.geometry.id ?? 0) - (b.geometry.id ?? 0)
      || (a.material.id ?? 0) - (b.material.id ?? 0)
    ));
    const authoredBatches = (this.authoredBatches ?? []).map((batch, index) => {
      const label = SCORIA_AUTHORED_BATCH_LABELS[index] ?? `batch-${index}`;
      const retainedVisibility = batch.staticCourse?.visible ?? batch.dynamicCourse?.visible ?? null;
      const visibleItems = retainedVisibility
        ? retainedVisibility.reduce((sum, visible) => sum + (visible ? 1 : 0), 0)
        : null;
      const positionCount = batch.mesh.geometry.index?.count
        ?? batch.mesh.geometry.attributes.position?.count
        ?? 0;
      const trianglesPerInstance = positionCount / 3;
      const mainEntry = entries.find((entry) => entry.pass === 'main' && entry.object.id === batch.mesh.id);
      const shadowEntry = entries.find((entry) => entry.pass === 'shadow' && entry.object.id === batch.mesh.id);
      return {
        index,
        label,
        totalItems: batch.items.length,
        visibleItems,
        hiddenItems: visibleItems == null ? null : batch.items.length - visibleItems,
        meshCountSubmittedPerDraw: batch.mesh.count,
        geometry: this.drawOwnershipGeometry(batch.mesh.geometry, null, batch.mesh.material),
        material: this.drawOwnershipMaterial(batch.mesh.material),
        trianglesPerInstance,
        conceptualVisibleTriangles: visibleItems == null ? null : visibleItems * trianglesPerInstance,
        main: mainEntry?.metrics ?? null,
        shadow: shadowEntry?.metrics ?? null,
      };
    });
    this.lastDrawOwnershipCensus = {
      enabled: true,
      requiredQuery: 'draw-ownership-census=1',
      diagnosticSlow: true,
      callbackContract: 'native Object3D onBeforeRender/onBeforeShadow; existing callbacks chained first',
      context: active.context,
      hooks: active.hooks,
      totals: { main, shadow, renderer: rendererTotals, attributed, unownedPostOrInternal },
      subtrees,
      authoredBatches,
      sceneInventory: active.inventory,
      entries,
    };
  }

  render(dt = 1 / 60, observedDt = dt, origin = 'renderer-direct') {
    const submissionStarted = performance.now();
    const submissionProfile = this.rendererProfileEnabled ? {} : null;
    this.activeSubmissionProfile = submissionProfile;
    this.renderer.info.reset();
    if (this.drawOwnershipCensusEnabled) this.beginDrawOwnershipCensusFrame();
    try {
      if (this.quality === 'low') {
        const sceneStartedAt = submissionProfile ? performance.now() : 0;
        this.renderer.render(this.scene, this.camera);
        if (submissionProfile) submissionProfile.sceneMs = performance.now() - sceneStartedAt;
      } else this.composer.render(dt);
    } finally {
      this.activeSubmissionProfile = null;
      if (this.drawOwnershipCensusEnabled) this.finishDrawOwnershipCensusFrame();
    }
    const submissionMs = performance.now() - submissionStarted;
    if (this.rendererProfileEnabled && this.lastRendererProfile) {
      this.lastRendererProfile.submission = submissionProfile;
      this.lastRendererProfile.submissionMs = submissionMs;
    }
    this.lastRenderInfo = {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      points: this.renderer.info.render.points,
      lines: this.renderer.info.render.lines,
    };
    this.frameTimes.push(observedDt * 1000);
    if (this.frameTimes.length > this.maxFrames) this.frameTimes.splice(0, this.frameTimes.length - this.maxFrames);
    this.renderSubmissionTimes.push(submissionMs);
    if (this.renderSubmissionTimes.length > this.maxFrames) {
      this.renderSubmissionTimes.splice(0, this.renderSubmissionTimes.length - this.maxFrames);
    }
    this.publishLiveFrame(origin);
  }

  resize() {
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const cap = this.quality === 'high' ? 1.5 : this.quality === 'medium' ? 1.25 : 1;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, cap);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    if (this.composer) {
      this.composer.setPixelRatio(pixelRatio);
      this.composer.setSize(width, height);
    }
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setQuality(quality) {
    if (!['low', 'medium', 'high'].includes(quality) || quality === this.quality) return false;
    this.quality = quality;
    this.renderer.shadowMap.enabled = quality === 'high' && !this.diagnosticNoShadows;
    this.sunLight.castShadow = quality === 'high';
    if (this.bloomPass) {
      this.bloomPass.enabled = quality !== 'low' && !this.diagnosticNoBloom;
      this.bloomPass.strength = quality === 'high' ? 0.24 : 0.14;
    }
    this.resize();
    if (this.segmentId) {
      const segment = COURSE.find((item) => item.id === this.segmentId);
      if (segment) {
        this.clearDecorCache();
        this.segmentId = null;
        this.setSegment(segment, 1);
        if (this.prewarmStatus === 'complete') this.prewarmStatus = 'invalidated';
      }
    }
    return true;
  }

  bloomTelemetry() {
    if (!this.bloomPass) return null;
    const horizontal = this.bloomPass.renderTargetsHorizontal ?? [];
    const vertical = this.bloomPass.renderTargetsVertical ?? [];
    return {
      enabled: Boolean(this.bloomPass.enabled),
      strength: this.bloomPass.strength,
      radius: this.bloomPass.radius,
      threshold: this.bloomPass.threshold,
      targetScale: this.diagnosticBloomScale,
      renderTargetTextures: {
        bright: describeRenderTargetTexture(this.bloomPass.renderTargetBright),
        horizontal: horizontal.map(describeRenderTargetTexture),
        vertical: vertical.map(describeRenderTargetTexture),
      },
    };
  }

  canonicalPresentationState() {
    const number = (value) => {
      if (Number.isNaN(value)) return '@nonfinite:NaN';
      if (value === Infinity) return '@nonfinite:+Infinity';
      if (value === -Infinity) return '@nonfinite:-Infinity';
      if (!Number.isFinite(value)) return `@nonnumeric:${typeof value}:${String(value)}`;
      const rounded = Math.fround(value);
      if (rounded === Infinity) return '@f32overflow:+Infinity';
      if (rounded === -Infinity) return '@f32overflow:-Infinity';
      return rounded;
    };
    const numbers = (values = []) => Array.from(values, number);
    const vector = (value) => (value?.toArray ? numbers(value.toArray()) : []);
    const textureState = (texture) => ({
      name: texture?.name ?? '',
      mapping: texture?.mapping ?? null,
      channel: texture?.channel ?? null,
      wrapS: texture?.wrapS ?? null,
      wrapT: texture?.wrapT ?? null,
      magFilter: texture?.magFilter ?? null,
      minFilter: texture?.minFilter ?? null,
      anisotropy: number(texture?.anisotropy ?? 0),
      format: texture?.format ?? null,
      internalFormat: texture?.internalFormat ?? null,
      type: texture?.type ?? null,
      colorSpace: texture?.colorSpace ?? '',
      flipY: Boolean(texture?.flipY),
      premultiplyAlpha: Boolean(texture?.premultiplyAlpha),
      unpackAlignment: texture?.unpackAlignment ?? null,
      offset: vector(texture?.offset),
      repeat: vector(texture?.repeat),
      center: vector(texture?.center),
      rotation: number(texture?.rotation ?? 0),
      matrix: vector(texture?.matrix),
    });
    const uniformState = (value, depth = 0) => {
      if (depth > 5) return '[depth-limit]';
      if (value == null) return null;
      if (typeof value === 'number') return number(value);
      if (typeof value === 'string' || typeof value === 'boolean') return value;
      if (value?.isTexture) return { texture: textureState(value) };
      if (ArrayBuffer.isView(value)) return numbers(value);
      if (Array.isArray(value)) return value.map((item) => uniformState(item, depth + 1));
      if (value?.toArray && (
        value.isColor
        || value.isVector2
        || value.isVector3
        || value.isVector4
        || value.isQuaternion
        || value.isMatrix3
        || value.isMatrix4
        || value.isEuler
      )) return vector(value);
      if (typeof value === 'object') {
        const primitiveEntries = Object.entries(value)
          .filter(([, item]) => (
            item == null
            || typeof item === 'number'
            || typeof item === 'string'
            || typeof item === 'boolean'
            || Array.isArray(item)
            || ArrayBuffer.isView(item)
            || item?.isTexture
            || item?.toArray
          ))
          .sort(([left], [right]) => left.localeCompare(right));
        if (primitiveEntries.length) {
          return Object.fromEntries(primitiveEntries.map(([key, item]) => [
            key,
            uniformState(item, depth + 1),
          ]));
        }
        return { type: value.constructor?.name ?? 'Object' };
      }
      return String(value);
    };
    const materialState = (material) => {
      if (!material) return null;
      const scalarKeys = [
        'opacity', 'transparent', 'blending', 'blendSrc', 'blendDst', 'blendEquation',
        'depthTest', 'depthWrite', 'colorWrite', 'alphaTest', 'side', 'toneMapped',
        'vertexColors', 'size', 'sizeAttenuation', 'linewidth', 'roughness', 'metalness',
        'transmission', 'thickness', 'clearcoat', 'clearcoatRoughness', 'ior',
        'reflectivity', 'emissiveIntensity', 'envMapIntensity', 'lightMapIntensity',
        'aoMapIntensity', 'bumpScale', 'displacementScale', 'wireframe', 'flatShading',
      ];
      const colorKeys = ['color', 'emissive', 'specular', 'sheenColor', 'attenuationColor'];
      const state = {
        type: material.type,
        name: material.name ?? '',
        visible: material.visible,
      };
      for (const key of scalarKeys) {
        const value = material[key];
        if (typeof value === 'number') state[key] = number(value);
        else if (typeof value === 'boolean') state[key] = value;
      }
      for (const key of colorKeys) {
        if (material[key]?.isColor) state[key] = vector(material[key]);
      }
      const textureKeys = [
        'map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap',
        'envMap', 'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap',
        'transmissionMap', 'thicknessMap', 'gradientMap', 'matcap',
      ];
      for (const key of textureKeys) {
        if (material[key]?.isTexture) state[key] = textureState(material[key]);
      }
      if (material.normalScale?.toArray) state.normalScale = vector(material.normalScale);
      if (material.defines) {
        state.defines = Object.fromEntries(Object.entries(material.defines)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, value]) => [key, uniformState(value)]));
      }
      if (material.uniforms) {
        state.uniforms = Object.fromEntries(Object.entries(material.uniforms)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, uniform]) => [key, uniformState(uniform?.value)]));
      }
      return state;
    };
    const transformState = (object) => ({
      position: vector(object?.position),
      quaternion: vector(object?.quaternion),
      scale: vector(object?.scale),
      matrix: vector(object?.matrix),
    });

    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    const objects = [];
    this.scene.traverse((object) => {
      const dynamicAttributes = {};
      const attributes = object.geometry?.attributes ?? {};
      for (const name of Object.keys(attributes).sort()) {
        const attribute = attributes[name];
        const usage = attribute?.usage ?? attribute?.data?.usage ?? THREE.StaticDrawUsage;
        const version = Math.max(attribute?.version ?? 0, attribute?.data?.version ?? 0);
        // Default-usage attributes can still be mutated and uploaded by
        // setting needsUpdate (Stormglass lightning color is one example).
        // Hash every non-static or live-mutated buffer; immutable authored
        // geometry remains source-fingerprinted without bloating each frame.
        if (usage === THREE.StaticDrawUsage && version === 0) continue;
        const array = attribute.array ?? attribute.data?.array;
        dynamicAttributes[name] = {
          usage,
          itemSize: attribute.itemSize,
          count: attribute.count,
          normalized: attribute.normalized,
          offset: attribute.offset ?? 0,
          stride: attribute.data?.stride ?? attribute.itemSize,
          array: array ? numbers(array) : [],
        };
      }
      const state = {
        index: objects.length,
        type: object.type,
        name: object.name ?? '',
        visible: object.visible,
        renderOrder: object.renderOrder,
        frustumCulled: object.frustumCulled,
        castShadow: object.castShadow,
        receiveShadow: object.receiveShadow,
        layers: object.layers?.mask ?? 0,
        matrixAutoUpdate: object.matrixAutoUpdate,
        transform: transformState(object),
      };
      if (object.geometry) {
        state.geometry = {
          type: object.geometry.type,
          drawRange: {
            start: object.geometry.drawRange.start,
            count: object.geometry.drawRange.count,
          },
          dynamicAttributes,
        };
      }
      if (object.isInstancedMesh) {
        const activeCount = Math.max(0, Number(object.count) | 0);
        const matrixArray = object.instanceMatrix?.array ?? [];
        const colorArray = object.instanceColor?.array ?? [];
        const colorItemSize = object.instanceColor?.itemSize ?? 3;
        state.instances = {
          count: activeCount,
          // InstancedMesh buffers retain unused capacity. Hash only the slots
          // submitted by `count`; stale matrices beyond that boundary cannot
          // affect pixels and must not manufacture a determinism failure.
          matrices: numbers(matrixArray.subarray?.(0, activeCount * 16) ?? matrixArray),
          colors: numbers(colorArray.subarray?.(0, activeCount * colorItemSize) ?? colorArray),
        };
      }
      if (Array.isArray(object.morphTargetInfluences)) {
        state.morphTargetInfluences = numbers(object.morphTargetInfluences);
      }
      if (object.material) {
        state.material = Array.isArray(object.material)
          ? object.material.map(materialState)
          : materialState(object.material);
      }
      if (object.isLight) {
        state.light = {
          color: vector(object.color),
          intensity: number(object.intensity),
          distance: number(object.distance),
          decay: number(object.decay),
          angle: number(object.angle),
          penumbra: number(object.penumbra),
        };
      }
      objects.push(state);
    });

    const particles = this.particles
      ? {
        cursor: this.particles.cursor,
        positions: numbers(this.particles.positions),
        colors: numbers(this.particles.colors),
        life: numbers(this.particles.life),
        velocity: this.particles.velocity.map(vector),
      }
      : null;
    const tireTrails = this.tireTrails
      ? {
        cursor: this.tireTrails.cursor,
        timer: number(this.tireTrails.timer),
        marks: this.tireTrails.marks.map((mark) => ({
          x: number(mark.x),
          y: number(mark.y),
          z: number(mark.z),
          yaw: number(mark.yaw),
          life: number(mark.life),
          heat: number(mark.heat),
        })),
      }
      : null;
    const random = this.presentationRandom.diagnostics();
    return {
      version: 3,
      random: {
        mode: random.mode,
        seed: random.seed,
        state: random.state,
        calls: random.calls,
      },
      renderer: {
        toneMapping: this.renderer.toneMapping,
        toneMappingExposure: number(this.renderer.toneMappingExposure),
        outputColorSpace: this.renderer.outputColorSpace,
        shadowEnabled: this.renderer.shadowMap.enabled,
        shadowType: this.renderer.shadowMap.type,
      },
      scene: {
        background: uniformState(this.scene.background),
        environment: uniformState(this.scene.environment),
        fog: this.scene.fog
          ? {
            type: this.scene.fog.constructor?.name ?? 'Fog',
            color: vector(this.scene.fog.color),
            near: number(this.scene.fog.near),
            far: number(this.scene.fog.far),
            density: number(this.scene.fog.density),
          }
          : null,
      },
      camera: {
        ...transformState(this.camera),
        projectionMatrix: vector(this.camera.projectionMatrix),
        matrixWorld: vector(this.camera.matrixWorld),
        fov: number(this.camera.fov),
        near: number(this.camera.near),
        far: number(this.camera.far),
      },
      objects,
      logicalFlow: {
        speedLines: (this.speedLineData ?? []).map((line) => ({
          x: number(line.x),
          y: number(line.y),
          z: number(line.z),
          wraps: line.wraps ?? 0,
        })),
        roadFlow: (this.roadFlowData ?? []).map((mark) => ({
          lateral: number(mark.lateral),
          z: number(mark.z),
          wraps: mark.wraps ?? 0,
        })),
      },
      particles,
      tireTrails,
      combat: this.combatFX?.presentationSignatureState() ?? null,
    };
  }

  presentationTelemetry({ canonical = false } = {}) {
    const round = (value, places = 6) => Number((Number.isFinite(value) ? value : 0).toFixed(places));
    const summarizeFlow = (items = []) => {
      let x = 0;
      let y = 0;
      let z = 0;
      for (const item of items) {
        x += item.x ?? 0;
        y += item.y ?? 0;
        z += item.z ?? 0;
      }
      return { count: items.length, xSum: round(x, 4), ySum: round(y, 4), zSum: round(z, 4) };
    };
    const vehiclePose = (vehicle) => {
      if (!vehicle?.userData?.wheelAssemblies) return null;
      const data = vehicle.userData;
      let instanceMatrixSum = 0;
      for (const value of data.tireBatch.instanceMatrix.array) instanceMatrixSum += value;
      return {
        rootPosition: vehicle.position.toArray().map((value) => round(value)),
        rootRotation: vehicle.rotation.toArray().slice(0, 3).map((value) => round(value)),
        posePosition: data.pose.position.toArray().map((value) => round(value)),
        poseRotation: data.pose.rotation.toArray().slice(0, 3).map((value) => round(value)),
        releaseKick: round(data.releaseKick),
        wheels: data.wheelAssemblies.map((assembly) => ({
          tire: assembly.userData.tire.rotation.toArray().slice(0, 3).map((value) => round(value)),
          rim: assembly.userData.rim.rotation.toArray().slice(0, 3).map((value) => round(value)),
        })),
        tireInstanceMatrixSum: round(instanceMatrixSum),
      };
    };
    const trailMarks = this.tireTrails?.marks ?? [];
    let trailLifeSum = 0;
    let trailPositionSum = 0;
    for (const mark of trailMarks) {
      trailLifeSum += mark.life;
      trailPositionSum += mark.x + mark.y + mark.z;
    }
    const speedLineState = summarizeFlow(this.speedLineData);
    speedLineState.wraps = (this.speedLineData ?? []).reduce(
      (sum, line) => sum + (line.wraps ?? 0),
      0,
    );
    const roadFlowState = {
      count: this.roadFlowData?.length ?? 0,
      lateralSum: round((this.roadFlowData ?? []).reduce(
        (sum, mark) => sum + (mark.lateral ?? 0),
        0,
      ), 4),
      zSum: round((this.roadFlowData ?? []).reduce(
        (sum, mark) => sum + (mark.z ?? 0),
        0,
      ), 4),
      wraps: (this.roadFlowData ?? []).reduce(
        (sum, mark) => sum + (mark.wraps ?? 0),
        0,
      ),
    };
    const payload = {
      random: this.presentationRandom.diagnostics(),
      planetRotations: (this.planetMeshes ?? []).map((planet) => ({
        group: planet.rotation.toArray().slice(0, 3).map((value) => round(value)),
        cloud: planet.userData.cloud.rotation.toArray().slice(0, 3).map((value) => round(value)),
      })),
      horizonRotation: this.horizon?.rotation.toArray().slice(0, 3).map((value) => round(value)) ?? null,
      starRotation: this.stars?.rotation.toArray().slice(0, 3).map((value) => round(value)) ?? null,
      player: vehiclePose(this.playerVehicle),
      rivals: (this.rivalVehicles ?? []).map(vehiclePose),
      flow: {
        speedLines: speedLineState,
        roadFlow: roadFlowState,
        ash: summarizeFlow(this.ashData),
        reentryClouds: summarizeFlow(this.reentryCloudData),
        arrival: this.arrivalArt?.diagnostics() ?? null,
        touchdown: this.touchdownArt?.diagnostics() ?? null,
      },
      particles: this.particles?.diagnostics() ?? null,
      tireTrails: {
        count: trailMarks.length,
        cursor: this.tireTrails?.cursor ?? 0,
        timer: round(this.tireTrails?.timer ?? 0),
        lifeSum: round(trailLifeSum),
        positionSum: round(trailPositionSum, 4),
      },
      combat: this.combatFX?.diagnostics().presentation ?? null,
    };
    if (!canonical) {
      return {
        ...payload,
        signature: null,
        signatureBits: 0,
        signatureAlgorithm: null,
        signatureScope: 'aggregate-telemetry-only',
        canonicalBytes: 0,
        canonicalObjects: 0,
      };
    }
    const canonicalState = this.canonicalPresentationState();
    const canonicalText = JSON.stringify(canonicalState);
    return {
      ...payload,
      signature: independent64BitTextSignature(canonicalText),
      signatureBits: 64,
      signatureAlgorithm: 'fnv1a32+murmur3x86_32-utf16le',
      signatureScope: 'ordered-render-state-v3',
      canonicalBytes: canonicalText.length,
      canonicalObjects: canonicalState.objects.length,
    };
  }

  stats() {
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const percentile = (p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;
    const sortedSubmission = [...this.renderSubmissionTimes].sort((a, b) => a - b);
    const submissionPercentile = (p) => sortedSubmission.length
      ? sortedSubmission[Math.min(sortedSubmission.length - 1, Math.floor(sortedSubmission.length * p))]
      : 0;
    return {
      quality: this.quality,
      frames: sorted.length,
      frameAverageMs: sorted.length ? Number((sorted.reduce((sum, value) => sum + value, 0) / sorted.length).toFixed(3)) : 0,
      frameP95Ms: Number(percentile(0.95).toFixed(3)),
      frameP99Ms: Number(percentile(0.99).toFixed(3)),
      frameMaxMs: Number((sorted.at(-1) ?? 0).toFixed(3)),
      renderSubmissionAverageMs: sortedSubmission.length
        ? Number((sortedSubmission.reduce((sum, value) => sum + value, 0) / sortedSubmission.length).toFixed(3))
        : 0,
      renderSubmissionP95Ms: Number(submissionPercentile(0.95).toFixed(3)),
      renderSubmissionP99Ms: Number(submissionPercentile(0.99).toFixed(3)),
      renderSubmissionMaxMs: Number((sortedSubmission.at(-1) ?? 0).toFixed(3)),
      drawCalls: this.lastRenderInfo.calls,
      triangles: this.lastRenderInfo.triangles,
      points: this.lastRenderInfo.points,
      lines: this.lastRenderInfo.lines,
      programs: this.renderer.info.programs?.length ?? 0,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      renderer: this.renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1',
      maxTextureSize: this.renderer.capabilities.maxTextureSize,
      camera: this.cameraDirector.getDiagnostics(),
      combat: this.combatFX.diagnostics(),
      bloom: this.bloomTelemetry(),
      startup: this.startupTimings,
      prewarm: this.prewarmReport
        ? { ...this.prewarmReport, status: this.prewarmStatus }
        : { status: this.prewarmStatus },
      openingTrackResponses: { ...this.openingTrackResponseTelemetry },
      staticScoriaSurface: this.staticScoriaSurfaceDiagnostics(),
      diagnosticRenderAblation: {
        noShadows: this.diagnosticNoShadows,
        noBloom: this.diagnosticNoBloom,
        shadowMapScale: this.diagnosticShadowMapSize / 1024,
        shadowMap: {
          configured: [this.sunLight.shadow.mapSize.x, this.sunLight.shadow.mapSize.y],
          allocated: this.sunLight.shadow.map
            ? [this.sunLight.shadow.map.width, this.sunLight.shadow.map.height]
            : null,
          targetCount: this.sunLight.shadow.map ? 1 : 0,
          targetPixels: this.sunLight.shadow.map
            ? this.sunLight.shadow.map.width * this.sunLight.shadow.map.height
            : 0,
        },
        bloomScale: this.diagnosticBloomScale,
        composer: this.composer?.readBuffer
          ? [this.composer.readBuffer.width, this.composer.readBuffer.height]
          : null,
        bloomTargets: this.bloomPass ? (() => {
          const bright = [
            this.bloomPass.renderTargetBright.width,
            this.bloomPass.renderTargetBright.height,
          ];
          const horizontal = this.bloomPass.renderTargetsHorizontal.map((target) => [
            target.width,
            target.height,
          ]);
          const vertical = this.bloomPass.renderTargetsVertical.map((target) => [
            target.width,
            target.height,
          ]);
          const all = [bright, ...horizontal, ...vertical];
          return {
            bright,
            horizontal,
            vertical,
            targetCount: all.length,
            targetPixels: all.reduce((sum, size) => sum + size[0] * size[1], 0),
          };
        })() : null,
      },
      drawOwnershipCensus: this.drawOwnershipCensusEnabled
        ? (this.lastDrawOwnershipCensus ?? {
          enabled: true,
          requiredQuery: 'draw-ownership-census=1',
          diagnosticSlow: true,
          status: 'awaiting-render',
        })
        : {
          enabled: false,
          requiredQuery: 'draw-ownership-census=1',
          diagnosticSlow: true,
        },
      trackProfile: this.trackProfileSamples ? [...this.trackProfileSamples] : null,
      decor: {
        updateMs: Number(this.lastDecorUpdateMs.toFixed(3)),
        ...this.decorFrameStats,
      },
    };
  }

  transitionDiagnostics() {
    const launch = this.launchFallaway.userData;
    const launchTerrainGeometry = launch.geometryMetadata?.terrain;
    const launchRoadGeometry = launch.geometryMetadata?.road;
    const launchHeatGeometry = launch.geometryMetadata?.heat;
    return {
      launch: {
        active: this.launchFallaway.visible,
        apertureVisible: Boolean(this.launchAperture.visible),
        visiblePressureRings: this.launchRings.filter((ring) => ring.visible).length,
        launchPressure: Number((launch.launchPressure ?? 0).toFixed(4)),
        fraction: Number((launch.fraction ?? 1).toFixed(4)),
        fall: Number((launch.fall ?? 1).toFixed(4)),
        fade: Number((launch.fade ?? 0).toFixed(4)),
        roadOpacity: Number((launch.roadMaterial?.opacity ?? 0).toFixed(4)),
        terrainOpacity: Number((launch.terrainMaterial?.opacity ?? 0).toFixed(4)),
        atmosphereEscape: Number((launch.atmosphereEscape ?? 1).toFixed(4)),
        destinationAtmosphere: Number((launch.destinationAtmosphere ?? 0).toFixed(4)),
        sourcePlanetVisible: Boolean(this.launchFallaway.visible && this.launchSourcePlanet?.visible),
        sourcePlanetAttached: this.launchSourcePlanet?.parent === this.launchFallaway,
        tangentGap: Number((launch.tangentGap ?? 0).toFixed(4)),
        departureScale: Number((launch.departureScale ?? 1).toFixed(4)),
        terrainHalfWidthMin: Number((launchTerrainGeometry?.minHalfWidth ?? 0).toFixed(4)),
        terrainHalfWidthMax: Number((launchTerrainGeometry?.maxHalfWidth ?? 0).toFixed(4)),
        terrainMaxSphereRatio: Number((launchTerrainGeometry?.maxSphereRatio ?? 0).toFixed(6)),
        terrainMinRoadClearance: Number((launchTerrainGeometry?.minRoadClearance ?? 0).toFixed(4)),
        heatMinEdgeMargin: Number((launchHeatGeometry?.minEdgeMargin ?? 0).toFixed(4)),
        terrainTriangles: launchTerrainGeometry?.triangles ?? 0,
        roadTriangles: launchRoadGeometry?.triangles ?? 0,
        terrainFrontSide: launch.terrainMaterial?.side === THREE.FrontSide,
        roadFrontSide: launch.roadMaterial?.side === THREE.FrontSide,
      },
      arrival: this.arrivalArt.diagnostics(),
      touchdown: this.touchdownArt.diagnostics(),
    };
  }

  captureTelemetry({ canonicalPresentation = false } = {}) {
    return {
      quality: this.quality,
      frameDtMs: this.frameTimes.at(-1) ?? 0,
      renderSubmissionMs: this.renderSubmissionTimes.at(-1) ?? 0,
      drawCalls: this.lastRenderInfo.calls,
      triangles: this.lastRenderInfo.triangles,
      points: this.lastRenderInfo.points,
      lines: this.lastRenderInfo.lines,
      programs: this.renderer.info.programs?.length ?? 0,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      renderer: this.renderer.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1',
      maxTextureSize: this.renderer.capabilities.maxTextureSize,
      camera: this.cameraDirector.getDiagnostics(),
      bloom: this.bloomTelemetry(),
      presentation: this.presentationTelemetry({ canonical: canonicalPresentation }),
      playerSurface: {
        source: this.playerSurfaceSource,
        rootPosition: this.playerVehicle.position.toArray(),
        rootRotation: this.playerVehicle.rotation.toArray().slice(0, 3),
        pitch: this.playerVehiclePitch,
        frame: { ...this.playerSurfaceFrame },
      },
      combat: this.combatFX.diagnostics(),
      transition: this.transitionDiagnostics(),
      decor: {
        updateMs: Number(this.lastDecorUpdateMs.toFixed(3)),
        ...this.decorFrameStats,
      },
    };
  }

  /**
   * QA-only, depth-aware visibility measurement. This method is never called
   * by the production loop and lazily allocates every probe resource. It first
   * renders the physical hero alone, then renders opaque course/decor depth
   * followed by the same hero mask without clearing depth. The ratio therefore
   * catches a car hidden by a road crest even when its projected OBB remains
   * comfortably inside the viewport.
   */
  measurePlayerVisibility({ width = 240, height = 135, perMesh = false } = {}) {
    const probeWidth = Math.max(64, Math.min(512, Number(width) | 0));
    const probeHeight = Math.max(36, Math.min(288, Number(height) | 0));
    if (!this.playerVehicle || !this.road || !this.terrain) {
      throw new Error('Player visibility probe requires the initialized race scene.');
    }

    let probe = this.qaVisibilityProbe;
    if (!probe || probe.width !== probeWidth || probe.height !== probeHeight) {
      probe?.target.dispose();
      probe?.blackMaterial.dispose();
      probe?.whiteMaterial.dispose();
      const target = new THREE.WebGLRenderTarget(probeWidth, probeHeight, {
        depthBuffer: true,
        stencilBuffer: false,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        generateMipmaps: false,
      });
      target.texture.generateMipmaps = false;
      target.texture.name = 'qa-player-depth-visibility-mask';
      const maskMaterial = (color) => new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true,
        transparent: false,
        blending: THREE.NoBlending,
        toneMapped: false,
      });
      probe = {
        width: probeWidth,
        height: probeHeight,
        target,
        expected: new Uint8Array(probeWidth * probeHeight * 4),
        roadVisible: new Uint8Array(probeWidth * probeHeight * 4),
        terrainVisible: new Uint8Array(probeWidth * probeHeight * 4),
        surfaceVisible: new Uint8Array(probeWidth * probeHeight * 4),
        visible: new Uint8Array(probeWidth * probeHeight * 4),
        perMeshExpected: new Uint8Array(probeWidth * probeHeight * 4),
        perMeshVisible: new Uint8Array(probeWidth * probeHeight * 4),
        blackMaterial: maskMaterial(0x000000),
        whiteMaterial: maskMaterial(0xffffff),
        playerMeshes: 0,
        playerObjects: [],
        roadOccluderMeshes: 0,
        terrainOccluderMeshes: 0,
        surfaceOccluderMeshes: 0,
        occluderMeshes: 0,
        layersAssigned: false,
      };
      this.qaVisibilityProbe = probe;
    }

    if (!probe.layersAssigned) {
      this.playerVehicle.traverse((object) => {
        if (!object.isMesh || QA_VISIBILITY_TRANSIENT_PLAYER_MESHES.has(object.name)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (!materials.some((material) => material && material.depthWrite !== false)) return;
        object.layers.enable(QA_VISIBILITY_PLAYER_LAYER);
        probe.playerMeshes += 1;
        probe.playerObjects.push(object);
      });
      const roadOccluderRoots = [
        this.road,
        this.arrivalArt?.runway,
        this.touchdownArt?.road,
      ].filter(Boolean);
      const terrainOccluderRoots = [
        this.terrain,
        this.arrivalArt?.planetSurface,
        this.touchdownArt?.ocean,
      ].filter(Boolean);
      const assignCategoryLayer = (roots, layer, counter) => {
        const assigned = new Set();
        for (const root of roots) root.traverse((object) => {
          if (!object.isMesh || assigned.has(object)) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          if (!materials.some((material) => material && material.depthWrite !== false)) return;
          assigned.add(object);
          object.layers.enable(layer);
          probe[counter] += 1;
        });
      };
      assignCategoryLayer(roadOccluderRoots, QA_VISIBILITY_ROAD_LAYER, 'roadOccluderMeshes');
      assignCategoryLayer(terrainOccluderRoots, QA_VISIBILITY_TERRAIN_LAYER, 'terrainOccluderMeshes');
      const surfaceOccluderRoots = [...roadOccluderRoots, ...terrainOccluderRoots];
      const surfaceAssigned = new Set();
      for (const root of surfaceOccluderRoots) root.traverse((object) => {
        if (!object.isMesh || surfaceAssigned.has(object)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (!materials.some((material) => material && material.depthWrite !== false)) return;
        surfaceAssigned.add(object);
        object.layers.enable(QA_VISIBILITY_SURFACE_LAYER);
        probe.surfaceOccluderMeshes += 1;
      });
      const occluderRoots = [
        ...surfaceOccluderRoots,
        this.decorRoot,
        this.launchFallaway,
        this.arrivalArt?.root,
        this.touchdownArt?.root,
      ].filter(Boolean);
      const assigned = new Set();
      for (const root of occluderRoots) root.traverse((object) => {
        if (!object.isMesh || assigned.has(object)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (!materials.some((material) => material && material.depthWrite !== false)) return;
        assigned.add(object);
        object.layers.enable(QA_VISIBILITY_OCCLUDER_LAYER);
        probe.occluderMeshes += 1;
      });
      probe.layersAssigned = true;
    }

    const scanMask = (pixels) => {
      let count = 0;
      let minX = probeWidth;
      let minY = probeHeight;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < probeHeight; y += 1) {
        for (let x = 0; x < probeWidth; x += 1) {
          const offset = (y * probeWidth + x) * 4;
          if (pixels[offset] < 128) continue;
          count += 1;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
      if (count === 0) return { pixels: 0, box: null };
      const boxWidth = maxX - minX + 1;
      const boxHeight = maxY - minY + 1;
      const top = probeHeight - 1 - maxY;
      return {
        pixels: count,
        box: {
          x: minX,
          y: top,
          width: boxWidth,
          height: boxHeight,
          centerX: minX + boxWidth * 0.5,
          centerY: top + boxHeight * 0.5,
          normalizedCenterX: (minX + boxWidth * 0.5) / probeWidth,
          normalizedCenterY: (top + boxHeight * 0.5) / probeHeight,
        },
      };
    };

    const previousTarget = this.renderer.getRenderTarget();
    const previousViewport = this.renderer.getViewport(new THREE.Vector4());
    const previousScissor = this.renderer.getScissor(new THREE.Vector4());
    const previousScissorTest = this.renderer.getScissorTest();
    const previousClearColor = this.renderer.getClearColor(new THREE.Color());
    const previousClearAlpha = this.renderer.getClearAlpha();
    const previousAutoClear = this.renderer.autoClear;
    const previousOverride = this.scene.overrideMaterial;
    const previousBackground = this.scene.background;
    const previousCameraLayers = this.camera.layers.mask;
    const previousShadowEnabled = this.renderer.shadowMap.enabled;
    const startedAt = performance.now();
    let perMeshVisibility = null;
    let isolatedPlayerLayers = false;
    try {
      this.scene.updateMatrixWorld(true);
      this.camera.updateMatrixWorld(true);
      this.renderer.shadowMap.enabled = false;
      this.renderer.setRenderTarget(probe.target);
      this.renderer.setViewport(0, 0, probeWidth, probeHeight);
      this.renderer.setScissor(0, 0, probeWidth, probeHeight);
      this.renderer.setScissorTest(false);
      this.renderer.setClearColor(0x000000, 1);
      this.scene.background = null;

      this.renderer.autoClear = true;
      this.scene.overrideMaterial = probe.whiteMaterial;
      this.camera.layers.set(QA_VISIBILITY_PLAYER_LAYER);
      this.renderer.render(this.scene, this.camera);
      this.renderer.readRenderTargetPixels(
        probe.target, 0, 0, probeWidth, probeHeight, probe.expected,
      );

      const renderOcclusionMask = (layer, destination) => {
        this.renderer.autoClear = true;
        this.scene.overrideMaterial = probe.blackMaterial;
        this.camera.layers.set(layer);
        this.renderer.render(this.scene, this.camera);
        this.renderer.autoClear = false;
        this.scene.overrideMaterial = probe.whiteMaterial;
        this.camera.layers.set(QA_VISIBILITY_PLAYER_LAYER);
        this.renderer.render(this.scene, this.camera);
        this.renderer.readRenderTargetPixels(
          probe.target, 0, 0, probeWidth, probeHeight, destination,
        );
      };
      renderOcclusionMask(QA_VISIBILITY_ROAD_LAYER, probe.roadVisible);
      renderOcclusionMask(QA_VISIBILITY_TERRAIN_LAYER, probe.terrainVisible);

      this.renderer.autoClear = true;
      this.scene.overrideMaterial = probe.blackMaterial;
      this.camera.layers.set(QA_VISIBILITY_SURFACE_LAYER);
      this.renderer.render(this.scene, this.camera);
      this.renderer.autoClear = false;
      this.scene.overrideMaterial = probe.whiteMaterial;
      this.camera.layers.set(QA_VISIBILITY_PLAYER_LAYER);
      this.renderer.render(this.scene, this.camera);
      this.renderer.readRenderTargetPixels(
        probe.target, 0, 0, probeWidth, probeHeight, probe.surfaceVisible,
      );

      this.renderer.autoClear = true;
      this.scene.overrideMaterial = probe.blackMaterial;
      this.camera.layers.set(QA_VISIBILITY_OCCLUDER_LAYER);
      this.renderer.render(this.scene, this.camera);
      this.renderer.autoClear = false;
      this.scene.overrideMaterial = probe.whiteMaterial;
      this.camera.layers.set(QA_VISIBILITY_PLAYER_LAYER);
      this.renderer.render(this.scene, this.camera);
      this.renderer.readRenderTargetPixels(
        probe.target, 0, 0, probeWidth, probeHeight, probe.visible,
      );

      if (perMesh) {
        perMeshVisibility = [];
        isolatedPlayerLayers = true;
        for (const object of probe.playerObjects) object.layers.disable(QA_VISIBILITY_PLAYER_LAYER);
        for (const object of probe.playerObjects) {
          let effectivelyVisible = object.visible;
          for (let parent = object.parent; effectivelyVisible && parent; parent = parent.parent) {
            effectivelyVisible = parent.visible;
            if (parent === this.playerVehicle) break;
          }
          if (!effectivelyVisible) continue;
          object.layers.enable(QA_VISIBILITY_PLAYER_LAYER);

          this.renderer.autoClear = true;
          this.scene.overrideMaterial = probe.whiteMaterial;
          this.camera.layers.set(QA_VISIBILITY_PLAYER_LAYER);
          this.renderer.render(this.scene, this.camera);
          this.renderer.readRenderTargetPixels(
            probe.target, 0, 0, probeWidth, probeHeight, probe.perMeshExpected,
          );

          this.renderer.autoClear = true;
          this.scene.overrideMaterial = probe.blackMaterial;
          this.camera.layers.set(QA_VISIBILITY_ROAD_LAYER);
          this.renderer.render(this.scene, this.camera);
          this.renderer.autoClear = false;
          this.scene.overrideMaterial = probe.whiteMaterial;
          this.camera.layers.set(QA_VISIBILITY_PLAYER_LAYER);
          this.renderer.render(this.scene, this.camera);
          this.renderer.readRenderTargetPixels(
            probe.target, 0, 0, probeWidth, probeHeight, probe.perMeshVisible,
          );

          const meshExpected = scanMask(probe.perMeshExpected);
          const meshVisible = scanMask(probe.perMeshVisible);
          if (meshExpected.pixels > 0) {
            perMeshVisibility.push({
              id: object.id,
              name: object.name || object.geometry?.type || 'unnamed-mesh',
              expectedPixels: meshExpected.pixels,
              visiblePixels: meshVisible.pixels,
              visibleRatio: Number((meshVisible.pixels / meshExpected.pixels).toFixed(6)),
              expectedBox: meshExpected.box,
              visibleBox: meshVisible.box,
            });
          }
          object.layers.disable(QA_VISIBILITY_PLAYER_LAYER);
        }
        for (const object of probe.playerObjects) object.layers.enable(QA_VISIBILITY_PLAYER_LAYER);
        isolatedPlayerLayers = false;
        perMeshVisibility.sort((left, right) => right.expectedPixels - left.expectedPixels);
      }
    } finally {
      if (isolatedPlayerLayers) {
        for (const object of probe.playerObjects) object.layers.enable(QA_VISIBILITY_PLAYER_LAYER);
      }
      this.camera.layers.mask = previousCameraLayers;
      this.scene.overrideMaterial = previousOverride;
      this.scene.background = previousBackground;
      this.renderer.autoClear = previousAutoClear;
      this.renderer.shadowMap.enabled = previousShadowEnabled;
      this.renderer.setRenderTarget(previousTarget);
      this.renderer.setViewport(previousViewport);
      this.renderer.setScissor(previousScissor);
      this.renderer.setScissorTest(previousScissorTest);
      this.renderer.setClearColor(previousClearColor, previousClearAlpha);
    }

    const expected = scanMask(probe.expected);
    const roadVisible = scanMask(probe.roadVisible);
    const terrainVisible = scanMask(probe.terrainVisible);
    const surfaceVisible = scanMask(probe.surfaceVisible);
    const visible = scanMask(probe.visible);
    const visibleRatio = expected.pixels > 0 ? visible.pixels / expected.pixels : 0;
    const roadVisibleRatio = expected.pixels > 0 ? roadVisible.pixels / expected.pixels : 0;
    const terrainVisibleRatio = expected.pixels > 0 ? terrainVisible.pixels / expected.pixels : 0;
    const surfaceVisibleRatio = expected.pixels > 0 ? surfaceVisible.pixels / expected.pixels : 0;
    return {
      width: probeWidth,
      height: probeHeight,
      liveFrameSerial: this.liveFrameSerial,
      liveFrameOrigin: this.liveFrameOrigin,
      expectedPixels: expected.pixels,
      visiblePixels: visible.pixels,
      visibleRatio: Number(visibleRatio.toFixed(6)),
      opaqueSceneOcclusionRatio: Number((1 - visibleRatio).toFixed(6)),
      roadVisibleRatio: Number(roadVisibleRatio.toFixed(6)),
      roadOcclusionRatio: Number((1 - roadVisibleRatio).toFixed(6)),
      terrainVisibleRatio: Number(terrainVisibleRatio.toFixed(6)),
      terrainOcclusionRatio: Number((1 - terrainVisibleRatio).toFixed(6)),
      surfaceVisiblePixels: surfaceVisible.pixels,
      surfaceVisibleRatio: Number(surfaceVisibleRatio.toFixed(6)),
      surfaceOcclusionRatio: Number((1 - surfaceVisibleRatio).toFixed(6)),
      expectedBox: expected.box,
      visibleBox: visible.box,
      playerMeshes: probe.playerMeshes,
      roadOccluderMeshes: probe.roadOccluderMeshes,
      terrainOccluderMeshes: probe.terrainOccluderMeshes,
      surfaceOccluderMeshes: probe.surfaceOccluderMeshes,
      occluderMeshes: probe.occluderMeshes,
      perMeshVisibility,
      playerTransform: {
        rootPosition: this.playerVehicle.position.toArray(),
        rootRotation: this.playerVehicle.rotation.toArray().slice(0, 3),
        rootScale: this.playerVehicle.scale.toArray(),
        posePosition: this.playerVehicle.userData.pose.position.toArray(),
        poseRotation: this.playerVehicle.userData.pose.rotation.toArray().slice(0, 3),
        surfaceFrame: { ...this.playerSurfaceFrame },
        trackSample: this.trackGeometryCache.current
          ? {
            x: this.trackGeometryCache.current.x,
            y: this.trackGeometryCache.current.y,
            bank: this.trackGeometryCache.current.bank,
            width: this.trackGeometryCache.current.width,
          }
          : null,
        cameraPosition: this.camera.position.toArray(),
        cameraAnchor: this.cameraDirector.vehicleAnchor.toArray(),
        cameraLook: this.cameraDirector.look.toArray(),
      },
      probeMs: Number((performance.now() - startedAt).toFixed(3)),
    };
  }

  readLiveFrameSerial() {
    return this.liveFrameSerial;
  }

  captureFrameCounters() {
    return {
      liveFrameSerial: this.liveFrameSerial,
      liveFrameOrigin: this.liveFrameOrigin,
      frameDtMs: this.frameTimes.at(-1) ?? 0,
      renderSubmissionMs: this.renderSubmissionTimes.at(-1) ?? 0,
      drawCalls: this.lastRenderInfo.calls,
      triangles: this.lastRenderInfo.triangles,
      points: this.lastRenderInfo.points,
      lines: this.lastRenderInfo.lines,
      programs: this.renderer.info.programs?.length ?? 0,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      decorUpdateMs: Number(this.lastDecorUpdateMs.toFixed(3)),
      decorTrackSampleCalls: this.decorFrameStats.trackSampleCalls,
      decorRetainedPoseUses: this.decorFrameStats.retainedPoseUses,
      decorMatricesWritten: this.decorFrameStats.matricesWritten,
      decorBatchesDirtied: this.decorFrameStats.batchesDirtied,
      decorMatrixFloatsUploaded: this.decorFrameStats.matrixFloatsUploaded,
      decorVisibilityEdges: this.decorFrameStats.visibilityEdges,
      decorRetainedDynamicVisibilityEdges: this.decorFrameStats.retainedDynamicVisibilityEdges,
      rivalVisibleMask: this.rivalFrameStats.visibleMask,
      rivalNewlyVisibleMask: this.rivalFrameStats.newlyVisibleMask,
      rivalNewlyHiddenMask: this.rivalFrameStats.newlyHiddenMask,
      rivalVisibleCount: this.rivalFrameStats.visibleCount,
      rendererProfile: this.rendererProfileEnabled && this.lastRendererProfile
        ? {
          ...this.lastRendererProfile,
          phases: { ...this.lastRendererProfile.phases },
          track: this.lastRendererProfile.track ? { ...this.lastRendererProfile.track } : null,
        }
        : null,
    };
  }

  resetFrameSamples() {
    this.frameTimes.length = 0;
    this.renderSubmissionTimes.length = 0;
    this.lastRenderInfo = { calls: 0, triangles: 0, points: 0, lines: 0 };
    this.renderer.info.reset();
  }

  readFrameSamples() {
    return [...this.frameTimes];
  }

  readRenderSubmissionSamples() {
    return [...this.renderSubmissionTimes];
  }

  captureAuthoredBatchParity(segment, time = 0) {
    if (!segment || !this.authoredBatches?.length) {
      return { segmentId: segment?.shortId ?? null, compared: 0, maxAbsError: 0, batches: [] };
    }
    const currentSample = segment.shortId === 'planet-1'
      ? sampleScoriaTrackInto(segment, this.logicalProgress, { x: 0, y: 0, bank: 0, width: 0 })
      : trackSample(segment, this.logicalProgress);
    const forwardLimit = this.trackRows * this.trackSpacing + 260;
    const legacyObject = new THREE.Object3D();
    const actualMatrix = new THREE.Matrix4();
    const actualCourseMatrix = new THREE.Matrix4();
    const legacyMatrix = new THREE.Matrix4();
    const legacyFloat = new Float32Array(16);
    let compared = 0;
    let maxAbsError = 0;
    const batches = [];
    for (const batch of this.authoredBatches) {
      batch.mesh.updateMatrix();
      let batchCompared = 0;
      let batchMaxAbsError = 0;
      let hiddenCompared = 0;
      let hiddenMatrixMaxAbsError = 0;
      let visibilityStateMismatches = 0;
      let slotMappingMismatches = 0;
      let denseSlotMismatches = 0;
      let stableOrderMismatches = 0;
      const retainedCourse = batch.staticCourse?.segmentId === segment.shortId
        ? batch.staticCourse
        : (batch.dynamicCourse?.segmentId === segment.shortId ? batch.dynamicCourse : null);
      const compactedStatic = batch.staticCourse?.segmentId === segment.shortId
        ? batch.staticCourse
        : null;
      const hiddenFloat = retainedCourse && !compactedStatic
        ? new Float32Array(retainedCourse.hiddenMatrix.elements)
        : null;
      for (let index = 0; index < batch.items.length; index += 1) {
        const item = batch.items[index];
        const local = item.progress - this.logicalProgress;
        const visible = local > -220 && local < forwardLimit;
        if (retainedCourse?.visible && retainedCourse.visible[index] !== (visible ? 1 : 0)) {
          visibilityStateMismatches += 1;
        }
        if (!visible) {
          if (compactedStatic) {
            if (compactedStatic.slotByItem[index] !== -1) slotMappingMismatches += 1;
            hiddenCompared += 1;
          } else if (retainedCourse) {
            batch.mesh.getMatrixAt(index, actualMatrix);
            for (let element = 0; element < 16; element += 1) {
              hiddenMatrixMaxAbsError = Math.max(
                hiddenMatrixMaxAbsError,
                Math.abs(actualMatrix.elements[element] - hiddenFloat[element]),
              );
            }
            hiddenCompared += 1;
          }
          continue;
        }
        const sample = trackSample(segment, item.progress);
        const cos = Math.cos(sample.bank);
        const sin = Math.sin(sample.bank);
        const lateral = Number.isFinite(item.lateral)
          ? item.lateral
          : (item.side ?? 0) * sample.width * (item.offset ?? 0);
        legacyObject.position.set(
          sample.x - currentSample.x + lateral * cos,
          sample.y - currentSample.y + lateral * sin + (item.y ?? 0),
          -local,
        );
        legacyObject.rotation.set(
          item.rx ?? 0,
          (item.ry ?? 0) + time * (item.spin ?? 0),
          sample.bank + (item.rz ?? 0),
        );
        const widthMultiplier = item.widthScale ? sample.width : 1;
        legacyObject.scale.set(
          (item.sx ?? 1) * widthMultiplier,
          item.sy ?? 1,
          item.sz ?? 1,
        );
        legacyObject.updateMatrix();
        legacyFloat.set(legacyObject.matrix.elements);
        legacyMatrix.fromArray(legacyFloat);
        const actualSlot = compactedStatic ? compactedStatic.slotByItem[index] : index;
        if (compactedStatic && (
          actualSlot < 0
          || actualSlot >= compactedStatic.activeCount
          || compactedStatic.itemBySlot[actualSlot] !== index
        )) {
          slotMappingMismatches += 1;
          continue;
        }
        batch.mesh.getMatrixAt(actualSlot, actualMatrix);
        if (batch.staticCourse?.segmentId === segment.shortId) {
          actualCourseMatrix.multiplyMatrices(batch.mesh.matrix, actualMatrix);
        } else {
          actualCourseMatrix.copy(actualMatrix);
        }
        for (let element = 0; element < 16; element += 1) {
          const error = Math.abs(actualCourseMatrix.elements[element] - legacyMatrix.elements[element]);
          batchMaxAbsError = Math.max(batchMaxAbsError, error);
          maxAbsError = Math.max(maxAbsError, error);
        }
        batchCompared += 1;
        compared += 1;
      }
      if (compactedStatic) {
        let previousItem = -1;
        for (let slot = 0; slot < compactedStatic.activeCount; slot += 1) {
          const itemIndex = compactedStatic.itemBySlot[slot];
          if (
            itemIndex < 0
            || itemIndex >= batch.items.length
            || compactedStatic.slotByItem[itemIndex] !== slot
            || compactedStatic.visible[itemIndex] !== 1
          ) denseSlotMismatches += 1;
          if (compactedStatic.stableOrder && itemIndex <= previousItem) stableOrderMismatches += 1;
          previousItem = itemIndex;
        }
        if (batch.mesh.count !== compactedStatic.activeCount) denseSlotMismatches += 1;
      }
      batches.push({
        items: batch.items.length,
        compared: batchCompared,
        hiddenCompared,
        hiddenMatrixMaxAbsError,
        visibilityStateMismatches,
        slotMappingMismatches,
        denseSlotMismatches,
        stableOrderMismatches,
        activeCount: compactedStatic?.activeCount ?? batch.mesh.count,
        meshCount: batch.mesh.count,
        stableOrder: compactedStatic?.stableOrder ?? null,
        minProgress: Math.min(...batch.items.map((item) => item.progress)),
        maxProgress: Math.max(...batch.items.map((item) => item.progress)),
        mode: batch.staticCourse?.segmentId === segment.shortId ? 'static' : (
          batch.dynamicCourse?.segmentId === segment.shortId ? 'retained-dynamic' : 'legacy-dynamic'
        ),
        maxAbsError: batchMaxAbsError,
      });
    }
    return {
      segmentId: segment.shortId,
      logicalProgress: this.logicalProgress,
      compared,
      maxAbsError,
      batches,
    };
  }

  captureScoriaKernelParityBuffers() {
    let road = this.road.geometry;
    let terrain = this.terrain.geometry;
    if (this.staticScoriaSurface?.enabled) {
      // Preserve the frozen rolling-kernel oracle without attaching or dirtying
      // any live static buffer. QA capture rewrites only the detached mutable
      // work owner, using the exact legacy 168-row lattice and arithmetic.
      const segment = COURSE[0];
      const current = sampleScoriaTrackInto(segment, this.logicalProgress, this.scoriaCurrentSample);
      const roadBase = this.trackColors.roadBase.set(0xa08f87);
      const accent = this.trackColors.accent.set(segment.accent);
      const ground = this.trackColors.ground.set(0xb49e93);
      const shoulder = this.trackColors.shoulder.set(0xc7a99c);
      const shoulderDeltaR = shoulder.r - ground.r;
      const shoulderDeltaG = shoulder.g - ground.g;
      const shoulderDeltaB = shoulder.b - ground.b;
      for (let column = 0; column < this.terrainColumns; column += 1) {
        const amount = this.terrainColumnProfile.shoulderAmount[column];
        this.terrainColumnProfile.colorR[column] = ground.r + shoulderDeltaR * amount;
        this.terrainColumnProfile.colorG[column] = ground.g + shoulderDeltaG * amount;
        this.terrainColumnProfile.colorB[column] = ground.b + shoulderDeltaB * amount;
      }
      writeHighQualityScoriaRibbonRows(
        segment,
        this.logicalProgress,
        current.x,
        current.y,
        this.trackRows,
        this.behindRows,
        this.trackSpacing,
        this.trackSamples,
        this.scoriaCourseSamples,
        this.scoriaNextSamples,
        this.roadWorkGeometry.attributes.position.array,
        this.roadWorkGeometry.attributes.color.array,
        this.roadWorkGeometry.attributes.uv.array,
        this.roadColumnProfile,
        this.terrainWorkGeometry.attributes.position.array,
        this.terrainWorkGeometry.attributes.color.array,
        this.terrainWorkGeometry.attributes.uv.array,
        this.terrainColumnProfile,
        roadBase.r,
        roadBase.g,
        roadBase.b,
        accent.r - roadBase.r,
        accent.g - roadBase.g,
        accent.b - roadBase.b,
        accent.r,
        accent.g,
        accent.b,
      );
      reconstructRibbonNormals(this.roadWorkGeometry, this.trackRows, this.roadColumns);
      reconstructRibbonNormals(this.terrainWorkGeometry, this.trackRows, this.terrainColumns);
      road = this.roadWorkGeometry;
      terrain = this.terrainWorkGeometry;
    }
    const packSamples = new Float64Array(this.trackRows * TRACK_RESPONSE_SAMPLE_FIELDS.length);
    for (let row = 0; row < this.trackRows; row += 1) {
      const sample = this.trackSamples[row];
      const offset = row * TRACK_RESPONSE_SAMPLE_FIELDS.length;
      for (let field = 0; field < TRACK_RESPONSE_SAMPLE_FIELDS.length; field += 1) {
        packSamples[offset + field] = sample[TRACK_RESPONSE_SAMPLE_FIELDS[field]];
      }
    }
    return {
      logicalProgress: this.logicalProgress,
      workBank: this.trackWorkGeometryIndex,
      road: {
        position: road.attributes.position.array,
        color: road.attributes.color.array,
        normal: road.attributes.normal.array,
        uv: road.attributes.uv.array,
      },
      terrain: {
        position: terrain.attributes.position.array,
        color: terrain.attributes.color.array,
        normal: terrain.attributes.normal.array,
        uv: terrain.attributes.uv.array,
      },
      samples: packSamples,
      staticSurface: this.staticScoriaSurfaceDiagnostics(),
    };
  }
}
