// Frozen water. Built exactly like water-surface.js: the sky dome's own fragment shader is
// patched at the same three anchors, so the sheet reflects the live sky (moon, clouds,
// ridges, the clock's colours) through the dome's uniforms, and shares its vn2 noise.
//
// What differs from water: STILL. No swells, no wind ripples; the only relief is a faint
// tilt along the cracks. Snow drift lifts the frost albedo toward the ground's snow colour,
// piled at the shore and thin in the middle, so the middle reads as black ice over the dark
// water sheet drawn 0.30 m below it: the sheet is TRANSPARENT (alpha 0.96 at the shore, 0.55
// mid) but still writes depth, so approach never fades it into mist. Live snow (uWeather.x)
// whitens it with the same fill curve chunks.js uses for the ground.
//
// One material for every frozen body (the reservoir, and the road pools when the wilds take
// it): sharedIceMaterial(ctx) makes it once per sky and hands the same object back.
// ONE new GPU program in the census; the reservoir's sheet is in the scene at world-stories
// init, so main's warm-up compiles it before the title lets anyone play.
import * as THREE from 'three';
import { CFG } from '../config.js';

function replaceRequired(source, anchor, replacement) {
  if (!source.includes(anchor)) throw new Error('ice: sky shader contract changed: ' + anchor);
  return source.replace(anchor, replacement);
}

// Read with fallbacks: CFG is deep-frozen and these sections belong to other owners.
const FROST_COL = (CFG.world && CFG.world.frost && CFG.world.frost.colour) || [0.150, 0.164, 0.188];
const SNOW_COL = (CFG.world && CFG.world.weather && CFG.world.weather.snowCol) || [0.330, 0.345, 0.385];

export function createIceMaterial(sky) {
  const dome = sky && sky.dome && sky.dome.material;
  if (!dome) throw new Error('ice requires the sky material before the reservoir is built');
  let fragment = replaceRequired(dome.fragmentShader, 'varying vec3 vDir;', /* glsl */`
    varying vec3 vWaterWorld;
    varying float vWaterDepth;
    uniform vec2 uWeather;
    uniform vec3 uFrost;
    uniform vec3 uSnowCol;
    #include <fog_pars_fragment>
  `);
  fragment = replaceRequired(fragment, 'vec3 d = normalize(vDir);', /* glsl */`
    vec2 p = vWaterWorld.xz;
    vec3 eye = normalize(cameraPosition - vWaterWorld);
    float depth = clamp(vWaterDepth, 0.0, 1.0);
    // STILL ICE. Two crack octaves: a coarse field (cells ~3 m) and a fine one (~0.7 m).
    // The coarse field's gradient tilts the normal a few thousandths ALONG a crack, so the
    // reflection bends there instead of reading as one mirror plate; nothing moves.
    float cA = vn2(p * 0.35);
    float cAx = vn2((p + vec2(0.15, 0.0)) * 0.35);
    float cAz = vn2((p + vec2(0.0, 0.15)) * 0.35);
    float crackA = abs(cA - 0.5);
    float crackB = abs(vn2(p * 1.4 + 7.0) - 0.5);
    float onCrack = 1.0 - smoothstep(0.0, 0.020, crackA);
    vec2 tilt = vec2(cAx - cA, cAz - cA) * onCrack * 0.15;
    vec3 iceNormal = normalize(vec3(-tilt.x, 1.0, -tilt.y));
    vec3 d = normalize(reflect(-eye, iceNormal));
  `);
  fragment = replaceRequired(fragment, 'gl_FragColor = vec4(col, 1.0);', /* glsl */`
    // col is the sky seen in the sheet. Still ice keeps a grazing slice of it, not the lot.
    float fresnel = 0.18 + 0.76 * pow(1.0 - max(0.0, dot(eye, iceNormal)), 2.7);
    vec3 reflectedSky = col * 0.82;
    // The sheet is lit by the whole dome, not the band at the horizon: a little zenith in
    // the light, at 1.6x because the water's silt term is a deliberate under-read and the
    // ice must sit between it and the snow on the bank.
    vec3 skyLight = mix(uHorizon, uZenith, 0.35) * 1.6;
    // DRIFT. Snow that stayed: fine grains inside broad lobes (~0.6 m and ~4 m). It piles at
    // the shore (depth under 0.25) and thins to nothing mid-sheet, which is where black ice is.
    float driftFine = vn2(p * 1.7 + 31.0);
    float driftBroad = vn2(p * 0.25 + 13.0);
    float drift = smoothstep(0.40, 0.72, driftBroad * 0.55 + driftFine * 0.45);
    float shore = 1.0 - smoothstep(0.04, 0.25, depth);
    float snowK = clamp(drift * (0.30 + 0.70 * shore) + shore * 0.45, 0.0, 1.0);
    vec3 albedo = mix(uFrost, uSnowCol, snowK);
    // CRACKS. Thin dark lines, refrozen pale along one lip; the drift hides them.
    float lineA = 1.0 - smoothstep(0.0, 0.012, crackA);
    float lineB = 1.0 - smoothstep(0.0, 0.008, crackB);
    float bare = 1.0 - snowK * 0.85;
    float crack = clamp(lineA + lineB * 0.6, 0.0, 1.0) * bare;
    float lipA = 1.0 - smoothstep(0.0, 0.012, abs(vn2((p + vec2(0.08, 0.05)) * 0.35) - 0.5));
    float lip = max(0.0, lipA - lineA) * bare;
    albedo = mix(albedo, uFrost * 0.35, crack);
    albedo += uSnowCol * 0.5 * lip;
    vec3 body = skyLight * albedo;
    // GRAZING REFLECTION: a third of the water's weight. Powder is matte, so drift kills it;
    // rain (uWeather.y) wets the sheet and brings it back.
    float mirror = fresnel * 0.35 * (1.0 - snowK * 0.8) * (1.0 + uWeather.y * 0.8);
    col = mix(body, reflectedSky, clamp(mirror, 0.0, 1.0));
    // The dark water 0.30 m below shows through the middle and never at the shore, which
    // also hides the seam where the lowered water sheet meets the bank.
    float alpha = mix(0.96, 0.55, smoothstep(0.1, 0.5, depth));
    // LIVE SNOW. The ground's fill curve (chunks.js), keyed on the drift grain, so a fresh
    // fall whitens the sheet as it whitens the bank and the sheet goes opaque under it.
    float wSnow = uWeather.x;
    if (wSnow > 0.001) {
      float wFill = smoothstep(-0.75, 0.75, wSnow * 2.0 - 1.0 - driftFine * 0.6);
      float wK = clamp(wSnow * (0.30 + 0.70 * wFill), 0.0, 1.0);
      col = mix(col, skyLight * uSnowCol, wK);
      alpha = mix(alpha, 0.98, wK);
    }
    gl_FragColor = vec4(col, alpha);
    #include <fog_fragment>
  `);
  const material = new THREE.ShaderMaterial({
    name: 'frozen-water',
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      ...dome.uniforms,
      uWeather: { value: new THREE.Vector2(0, 0) },   // x lying snow 0..1, y wet 0..1
      uFrost: { value: new THREE.Color(FROST_COL[0], FROST_COL[1], FROST_COL[2]) },
      uSnowCol: { value: new THREE.Color(SNOW_COL[0], SNOW_COL[1], SNOW_COL[2]) },
    },
    vertexShader: /* glsl */`
      attribute float waterDepth;
      varying vec3 vWaterWorld;
      varying float vWaterDepth;
      #include <fog_pars_vertex>
      void main() {
        vWaterWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        vWaterDepth = waterDepth;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: fragment,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: true,
    fog: true,
    toneMapped: false,
  });
  material.userData.dome = dome;
  return material;
}

/* ------------------------------------------------------------------ *
 * The shared instance. Keyed on the sky's dome material: a rebuilt sky means new uniform
 * objects, and a material holding the old ones would freeze the reflection at boot.
 * Without a renderer (geometry-only tools, the node suites) it is a plain translucent
 * material, the way wilds.matWater falls back.
 * ------------------------------------------------------------------ */

let shared = null;

export function sharedIceMaterial(ctx) {
  const sky = ctx && ctx.systems ? ctx.systems.get('sky') : null;
  const dome = sky && sky.dome && sky.dome.material;
  const rendered = !!(ctx && ctx.renderer && dome);
  if (shared && (rendered ? shared.userData.dome === dome : !shared.userData.dome)) return shared;
  if (shared) { shared.dispose(); shared = null; }
  shared = rendered ? createIceMaterial(sky)
    : new THREE.MeshBasicMaterial({ color: 0x1c2230, side: THREE.DoubleSide, transparent: true, opacity: 0.8, depthWrite: true });
  if (!rendered) shared.name = 'frozen-water';
  return shared;
}

/** The shared instance if one exists, or null. Never creates one: a weather writer (the
 *  wilds' setWeather) must not decide which sky the material is keyed on. */
export function currentIceMaterial() { return shared; }

/** Owner teardown only (world-stories dispose). The next sharedIceMaterial() makes a new one. */
export function disposeSharedIceMaterial() {
  if (shared) { shared.dispose(); shared = null; }
}
