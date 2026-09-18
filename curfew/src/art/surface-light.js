import * as THREE from 'three';

// Preserve authored skin/cloth/stock detail at arm's length. The beam's intensity,
// reach and gameplay light field remain unchanged; only this material's near-light
// response rolls off before HDR detail is lost to the final exposure.
const RESPONSE = '\n directLight.color *= min(1.0, 3.2 / max(0.0001, max(directLight.color.r, max(directLight.color.g, directLight.color.b))));';
const LIGHTING = THREE.ShaderChunk.lights_fragment_begin
  .replace('getSpotLightInfo( spotLight, geometryPosition, directLight );', 'getSpotLightInfo( spotLight, geometryPosition, directLight );'+RESPONSE)
  .replace('getPointLightInfo( pointLight, geometryPosition, directLight );', 'getPointLightInfo( pointLight, geometryPosition, directLight );'+RESPONSE);
export function readableSurface(material){
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',LIGHTING);};
  material.customProgramCacheKey=()=> 'wwpm-near-surface-v1';
  return material;
}

// SKIN (D16, 2026-09-17). One program for every face and hand in the county, and it is the
// only place skin shading lives. Two edits to three's RE_Direct_Physical, nothing else:
//   1. the diffuse term is WRAPPED: NdotL' = saturate((NdotL + .35) / 1.35). Light bleeds a
//      third of the way round the terminator, which is what light does in flesh a few
//      millimetres deep; specular and sheen still use the honest NdotL, so a cheek still has
//      a hard highlight on a soft form.
//   2. the terminator is RED-SHIFTED: mix(1, (1, .45, .35), (1 - NdotL)^2 * .5). Where the
//      light grazes, the blood shows through before the shadow closes. Half strength, so it
//      is a warmth at the edge and not a sunburn.
// Same near-light roll-off as readableSurface, because the torch at arm's length is still
// the brightest thing a face ever sees. Own cache key: it must never share a program with
// the plain physical eye material, and tests/syntax.mjs demands the key wherever there is
// an onBeforeCompile.
const SKIN_DIRECT = THREE.ShaderChunk.lights_physical_pars_fragment
  .replace('float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
    'float dotNLraw = dot( geometryNormal, directLight.direction );\n\tfloat dotNL = saturate( dotNLraw );')
  .replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
    'float wrapNL = saturate( ( dotNLraw + 0.35 ) / 1.35 );\n'
    + '\tvec3 terminator = mix( vec3( 1.0 ), vec3( 1.0, 0.45, 0.35 ), pow( 1.0 - dotNL, 2.0 ) * 0.5 );\n'
    + '\treflectedLight.directDiffuse += wrapNL * directLight.color * terminator * BRDF_Lambert( material.diffuseColor );');
// Loud failure at import, not a silent fall-through to plain Lambert when three moves a line.
if (!SKIN_DIRECT.includes('dotNLraw') || !SKIN_DIRECT.includes('wrapNL')) throw new Error('skinSurface: RE_Direct_Physical no longer matches; re-read vendor/three.module.min.js');
// THE MOUTH (R3). A face opens its mouth in this program, not with a second mesh: each vertex
// carries `jawW` (0 = still, 1 = the lower lip and chin), and uJaw swings that share of it about
// the hinge in the head's own y-z plane, normal with it. Per-material uniforms on the shared
// program: three keeps a uniforms object per material, so each person's mouth is its own.
// EVERY mesh drawn with this material must carry jawW (people.js gives the hands zeros).
const JAW_ANCHORS = ['#include <common>', '#include <beginnormal_vertex>', '#include <begin_vertex>'];
if (!JAW_ANCHORS.every(a => THREE.ShaderLib.physical.vertexShader.includes(a))) throw new Error('skinSurface: meshphysical_vert no longer has the jaw anchors; re-read vendor/three.module.min.js');
const JAW_PARS = '#include <common>\nattribute float jawW;\nuniform float uJaw;\nuniform vec3 uJawHinge;';
const JAW_NORMAL = '#include <beginnormal_vertex>\n\tfloat jawA = uJaw * jawW;\n\tmat2 jawR = mat2( cos( jawA ), sin( jawA ), -sin( jawA ), cos( jawA ) );\n\tobjectNormal.yz = jawR * objectNormal.yz;';
const JAW_BEGIN = '#include <begin_vertex>\n\ttransformed.yz = uJawHinge.yz + jawR * ( transformed.yz - uJawHinge.yz );';
export function skinSurface(material){
  material.userData.jaw = { value: 0 };
  material.userData.jawHinge = { value: new THREE.Vector3() };
  material.onBeforeCompile=shader=>{
    shader.uniforms.uJaw = material.userData.jaw;
    shader.uniforms.uJawHinge = material.userData.jawHinge;
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>',JAW_PARS)
      .replace('#include <beginnormal_vertex>',JAW_NORMAL)
      .replace('#include <begin_vertex>',JAW_BEGIN);
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <lights_physical_pars_fragment>',SKIN_DIRECT)
      .replace('#include <lights_fragment_begin>',LIGHTING);
  };
  material.customProgramCacheKey=()=> 'wwpm-skin-v2';
  return material;
}
