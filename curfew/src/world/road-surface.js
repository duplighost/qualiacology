import * as THREE from 'three';
import { SURFACE_RELIEF_GLSL } from './surface-relief.js';
import { SNOW_FIELD_GLSL } from './snow-field.js';

// One shared asphalt response on the existing road ribbons. The profile texture
// still supplies the readable crown and verge; water changes how that surface
// reflects light, rather than adding a painted blue stripe or another mesh.
const ROAD_NOISE = `
float countyRoadHash(vec2 p) {
  vec3 q = fract(mod(p, 2048.0).xyx * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float countyRoadNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(countyRoadHash(i), countyRoadHash(i+vec2(1.0,0.0)), f.x),
    mix(countyRoadHash(i+vec2(0.0,1.0)), countyRoadHash(i+vec2(1.0)), f.x), f.y);
}
`;

// Two shared 512 maps (2.67 MiB including mipmaps), loaded beside terrain scans.
// The single gzip contains RGB albedo and height/roughness/AO, with no browser
// canvas conversion and no normal-map material variant.
export async function loadRoadSurfaceScan(renderer) {
  if (typeof document === 'undefined' || typeof DecompressionStream === 'undefined') return null;
  const response = await fetch(new URL('../../assets/materials/road-asphalt-v1.bin.gz', import.meta.url));
  if (!response.ok) throw new Error('road scan: asset HTTP ' + response.status);
  const bytes = new Uint8Array(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  const size = 512, pixels = size * size;
  if (bytes.length !== 8 + pixels * 6 || String.fromCharCode(...bytes.subarray(0, 8)) !== 'RSCAN001') {
    throw new Error('road scan: invalid packed data');
  }
  let offset = 8;
  const textures = [];
  for (const name of ['albedo', 'physical']) {
    const data = new Uint8Array(pixels * 4);
    for (let p = 0; p < data.length; p += 4) {
      data[p] = bytes[offset++]; data[p+1] = bytes[offset++]; data[p+2] = bytes[offset++]; data[p+3] = 255;
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.name = 'road-scan-' + name;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    texture.colorSpace = THREE.NoColorSpace;
    texture.needsUpdate = true;
    textures.push(texture);
  }
  return { albedo: textures[0], physical: textures[1], dispose() { for (const texture of textures) texture.dispose(); } };
}

export function installRoadSurface(material, weatherUniforms, scan = null) {
  const uniforms = {
    uRoadWeather: weatherUniforms?.uWeather || { value: new THREE.Vector2() },
    uRoadSnowCol: weatherUniforms?.uSnowCol || { value: new THREE.Color().setRGB(0.33, 0.345, 0.385, THREE.LinearSRGBColorSpace) },
    uRoadScanColor: { value: scan?.albedo || material.map },
    uRoadScanPhysical: { value: scan?.physical || material.map },
    uRoadScanReady: { value: scan ? 1 : 0 },
  };
  material.userData.roadUniforms = uniforms;
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = shader => {
    previous.call(material, shader);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', [
        '#include <common>',
        'varying vec3 vRoadPosition;',
        'varying float vRoadUp;',
        'varying vec2 vRoadUv;',
      ].join('\n'))
      .replace('#include <uv_vertex>', [
        '#include <uv_vertex>',
        'vRoadPosition = (modelMatrix * vec4(position, 1.0)).xyz;',
        'vRoadUp = normalize(mat3(modelMatrix) * normal).y;',
        'vRoadUv = uv;',
      ].join('\n'));
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', [
        '#include <common>',
        'uniform vec2 uRoadWeather;',
        'uniform vec3 uRoadSnowCol;',
        'uniform sampler2D uRoadScanColor;',
        'uniform sampler2D uRoadScanPhysical;',
        'uniform float uRoadScanReady;',
        'varying vec3 vRoadPosition;',
        'varying float vRoadUp;',
        'varying vec2 vRoadUv;',
        ROAD_NOISE, SURFACE_RELIEF_GLSL, SNOW_FIELD_GLSL,
      ].join('\n'))
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        // Metre-scale wear and hollows stay in world space, independent of the
        // eight-metre road-profile repeat or any streamed chunk boundary.
        'vec2 roadP = vRoadPosition.xz;',
        'float roadBroad = countyRoadNoise(roadP * 0.18);',
        'float roadPatches = countyRoadNoise(roadP * 0.72 + roadBroad * 1.7);',
        'float roadAggregate = countyRoadNoise(roadP * 27.0);',
        'float roadFootprint = max(length(dFdx(vRoadPosition)), length(dFdy(vRoadPosition)));',
        'float roadFine = 1.0 - smoothstep(0.012, 0.085, roadFootprint);',
        'vec3 roadScanColor = vec3(0.5);',
        'vec3 roadScanPhysical = vec3(roadAggregate, 0.91, 1.0);',
        'if (uRoadScanReady > 0.5) {',
        // The source scan measures 2.2 metres. Mipmapped world coordinates retain
        // millimetre aggregate without stretching it along each road ribbon.
        '  vec2 roadScanUv = roadP / 2.2;',
        '  roadScanColor = texture2D(uRoadScanColor, roadScanUv).rgb;',
        '  roadScanPhysical = texture2D(uRoadScanPhysical, roadScanUv).rgb;',
        '  roadAggregate = roadScanPhysical.r;',
        '}',
        'float roadEdge = smoothstep(0.24, 0.48, abs(vRoadUv.x - 0.5));',
        'float roadLevel = smoothstep(0.93, 0.998, vRoadUp);',
        'float roadWet = clamp(uRoadWeather.y, 0.0, 1.0);',
        // A film forms first; connected shallow hollows become much smoother
        // as rain accumulates. The raised crown drains more readily.
        'float roadHollow = roadBroad * 0.68 + roadPatches * 0.32 + roadEdge * 0.065;',
        'float roadPuddle = smoothstep(0.45, 0.68, roadHollow)',
        '  * smoothstep(0.24, 0.90, roadWet) * roadLevel;',
        'vec4 roadSnow = vec4(0.0);',
        'if (uRoadWeather.x > 0.001) {',
        '  roadSnow = countySnow(roadP, uRoadWeather.x, -0.12 + roadEdge * 0.09, smoothstep(0.58, 0.94, vRoadUp));',
        '  roadSnow.x *= mix(0.70, 0.94, roadEdge);',
        '}',
        'roadWet *= 1.0 - roadSnow.x;',
        'roadPuddle *= 1.0 - roadSnow.x;',
        'float roadLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));',
        // Keep regional/gravel colour and the readable profile. A restrained
        // neutral centre lets exposed stone read through the dirt-coloured tint.
        'diffuseColor.rgb = mix(diffuseColor.rgb, roadLuma * vec3(0.985, 1.0, 1.015), uRoadScanReady * 0.30 * (1.0 - roadEdge * 0.65));',
        'diffuseColor.rgb *= mix(vec3(1.0 + (roadAggregate - 0.5) * 0.12 * roadFine), roadScanColor * 2.0, uRoadScanReady);',
        'diffuseColor.rgb *= (0.97 + (roadPatches - 0.5) * 0.09);',
        // Water saturates asphalt; its bright part now comes from the physical
        // reflected sky and lamps, not from lifting the diffuse albedo.
        'diffuseColor.rgb *= 1.0 - roadWet * 0.13 - roadPuddle * 0.09;',
        'diffuseColor.rgb = mix(diffuseColor.rgb, countySnowColour(uRoadSnowCol, roadSnow.y), roadSnow.x);',
      ].join('\n'))
      .replace('#include <roughnessmap_fragment>', [
        '#include <roughnessmap_fragment>',
        'float roadDryRoughness = mix(0.91 + (roadAggregate - 0.5) * 0.07 * roadFine, max(0.68, roadScanPhysical.g), uRoadScanReady);',
        'roughnessFactor = mix(roadDryRoughness, 0.43, roadWet);',
        'roughnessFactor = mix(roughnessFactor, 0.16, roadPuddle);',
        'roughnessFactor = mix(roughnessFactor, mix(0.94, 0.73, roadSnow.z), roadSnow.x);',
      ].join('\n'))
      .replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        'float roadRelief = ((roadAggregate - 0.5) * mix(0.0018, 0.0065, uRoadScanReady) * roadFine + (roadPatches - 0.5) * 0.0035)',
        '  * (1.0 - roadWet * 0.38) * (1.0 - roadPuddle * 0.96);',
        'normal = countyReliefNormal(-vViewPosition, normal, mix(roadRelief, roadSnow.w, roadSnow.x));',
      ].join('\n'))
      .replace('#include <aomap_fragment>', [
        '#include <aomap_fragment>',
        'float roadCavity = mix(1.0, roadScanPhysical.b, uRoadScanReady * 0.35 * (1.0 - roadSnow.x) * (1.0 - roadPuddle));',
        'reflectedLight.indirectDiffuse *= roadCavity;',
        'reflectedLight.indirectSpecular *= sqrt(roadCavity);',
      ].join('\n'))
      .replace('#include <dithering_fragment>', [
        '#include <dithering_fragment>',
        // Opaque HDR alpha is a reflection mask, consumed before the weapon
        // overlay and post output. No transparent road or extra geometry.
        'gl_FragColor.a = 0.98 - roadPuddle * 0.75;',
      ].join('\n'));
    material.userData.roadShaderPatched = {
      position: shader.vertexShader.includes('vRoadPosition ='),
      wet: shader.fragmentShader.includes('float roadPuddle ='),
      snow: shader.fragmentShader.includes('countySnowColour(uRoadSnowCol'),
      relief: shader.fragmentShader.includes('normal = countyReliefNormal'),
      scan: shader.fragmentShader.includes('roadScanUv = roadP / 2.2'),
    };
  };
  material.customProgramCacheKey = () => 'county-asphalt-weather-scan-2';
  material.needsUpdate = true;
  return material;
}
