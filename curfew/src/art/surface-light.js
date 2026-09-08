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
