import * as THREE from 'three';

// Replaces the former two 2048 maps with two 1024 maps (10.67 MiB with
// mipmaps). Color and height/roughness/AO stay registered through every blend.
export async function loadTerrainSurfaceScan(renderer) {
  if (typeof document === 'undefined' || typeof DecompressionStream === 'undefined') return null;
  const response = await fetch(new URL('../../assets/materials/terrain-forest-v1.bin.gz', import.meta.url));
  if (!response.ok) throw new Error('terrain scan: asset HTTP ' + response.status);
  const bytes = new Uint8Array(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  const size = 1024, pixels = size * size;
  if (bytes.length !== 8 + pixels * 6 || String.fromCharCode(...bytes.subarray(0, 8)) !== 'TSCAN001') {
    throw new Error('terrain scan: invalid packed data');
  }
  let offset = 8;
  const textures = [];
  for (const name of ['albedo', 'physical']) {
    const data = new Uint8Array(pixels * 4);
    for (let p = 0; p < data.length; p += 4) {
      data[p] = bytes[offset++]; data[p+1] = bytes[offset++]; data[p+2] = bytes[offset++]; data[p+3] = 255;
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.name = 'terrain-forest-' + name;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    texture.colorSpace = THREE.NoColorSpace;
    texture.needsUpdate = true;
    textures.push(texture);
  }
  return { albedo: textures[0], physical: textures[1], mean: new THREE.Vector3(.5, .5, .5),
    dispose() { for (const texture of textures) texture.dispose(); } };
}

export const TERRAIN_SURFACE_GLSL = `
float countyTerrainHash(vec2 p) {
  vec3 q = fract(mod(p, 2048.0).xyx * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float countyTerrainNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(countyTerrainHash(i),countyTerrainHash(i+vec2(1.,0.)),f.x),
    mix(countyTerrainHash(i+vec2(0.,1.)),countyTerrainHash(i+vec2(1.)),f.x),f.y);
}
vec3 countyTerrainSample(sampler2D map, vec2 uv, vec2 dx, vec2 dy) {
  #ifdef texture2DGradEXT
    return texture2DGradEXT(map, uv, dx, dy).rgb;
  #else
    return texture2D(map, uv).rgb;
  #endif
}
`;

// Four filtered fetches, as before: the old fine/coarse procedural pair is
// replaced by a second scan phase. Slowly varying phase choices break the
// repeating three-metre moss islands without shrinking the leaves or twigs.
export const TERRAIN_SURFACE_FRAGMENT = `
float gTerr = 0.0, gNearF = vGroundD.z, gUpF = 0.0, gRelief = 0.0;
float gDryRoughness = .94, gScanCavity = 1.0;
float wCoverF = 0.0, wCrestF = 0.0, wReliefF = 0.0;
if (uGroundReady > .5) {
  vec2 scanUV = vGroundD.xy / vec2(3.00097251, 3.00098014);
  vec2 scanDx = dFdx(scanUV), scanDy = dFdy(scanUV);
  float macro = countyTerrainNoise(vGroundD.xy * .067);
  float phase = macro * 8.0, index = floor(phase);
  vec2 offsetA = vec2(countyTerrainHash(vec2(index, 7.)), countyTerrainHash(vec2(index, 29.)));
  vec2 offsetB = vec2(countyTerrainHash(vec2(index+1., 7.)), countyTerrainHash(vec2(index+1., 29.)));
  vec3 colorA = countyTerrainSample(uGroundScan, scanUV + offsetA, scanDx, scanDy);
  vec3 colorB = countyTerrainSample(uGroundScan, scanUV + offsetB, scanDx, scanDy);
  vec3 physicalA = countyTerrainSample(uGroundHeight, scanUV + offsetA, scanDx, scanDy);
  vec3 physicalB = countyTerrainSample(uGroundHeight, scanUV + offsetB, scanDx, scanDy);
  // Height-aware narrow transitions keep individual litter edges readable.
  float blend = smoothstep(.28, .72, fract(phase) + (physicalB.r-physicalA.r)*.16);
  vec3 color = mix(colorA, colorB, blend) / uGroundMean;
  vec3 physical = mix(physicalA, physicalB, blend);
  float footprint = max(length(scanDx), length(scanDy)) * 3.001;
  float reliefFade = 1.0 - smoothstep(.018, .10, footprint);
  diffuseColor.rgb *= clamp(color, vec3(.22), vec3(2.15)) * mix(.92, 1.06, macro);
  gTerr = (physical.r-.5) * .32;
  gUpF = max(gTerr, 0.0);
  gRelief = physical.r * .043 * reliefFade;
  gDryRoughness = clamp(physical.g, .63, .98);
  gScanCavity = mix(1.0, physical.b, .30);
} else {
  vec3 gSample = texture2D(uGroundMap, vGroundD.xy*uGroundParams.x).rgb;
  float gGrit = gSample.r*2.0-1.0;
  float gMott = texture2D(uGroundMap, vGroundD.yx*uGroundParams.y+.37).g*2.0-1.0;
  float gT = gGrit*uGroundMix.x + gMott*uGroundMix.y;
  float gUp = max(gT,0.0), gDn = min(gT,0.0);
  diffuseColor.rgb *= 1.0 + gNearF*(uGroundParams.z * gUp + uGroundParams.w*gDn);
  diffuseColor.g *= 1.0+.06*gUp*gNearF;
  diffuseColor.b *= 1.0+.20*gUp*gNearF;
  gTerr = gT; gUpF = gUp;
  gRelief = gSample.b*gNearF*.027;
}
`;

// Soil is matte, leaf cuticles have a broad sheen, and water pools first in
// recesses. The existing shared snow response replaces both when snow lies.
export const TERRAIN_ROUGHNESS_FRAGMENT = `
float soilWet = uWeather.y*(1.0-uWeather.x)*smoothstep(.35,.92,vGroundUp);
float soilRecess = 1.0-smoothstep(-.10,.10,gTerr);
roughnessFactor = mix(gDryRoughness,.29,soilWet*(.55+.45*soilRecess));
roughnessFactor = mix(roughnessFactor,mix(.93,.62,wCrestF),wCoverF);
`;
