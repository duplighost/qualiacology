// Keep Three's contributing point-light path intact, including shadows and any
// caller's near-light response. Parked lights and fragments beyond a finite
// cutoff need no BRDF work. Negative RGB still contributes and must pass.
const POINT_START = '\t\tgetPointLightInfo( pointLight, geometryPosition, directLight );';
const POINT_END = '\t\tRE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
const GUARD = [
  '\t\tif ( pointLight.color != vec3( 0.0 ) ) {',
  '\t\t\tvec3 countyPointDelta = pointLight.position - geometryPosition;',
  '\t\t\tbool countyPointHasCutoff = pointLight.distance > 0.0;',
  '\t\t\t#ifdef LEGACY_LIGHTS',
  '\t\t\tcountyPointHasCutoff = countyPointHasCutoff && pointLight.decay > 0.0;',
  '\t\t\t#endif',
  '\t\t\tif ( !countyPointHasCutoff || dot( countyPointDelta, countyPointDelta )',
  '\t\t\t  <= pointLight.distance * pointLight.distance * 1.000001 ) {',
  '',
].join('\n');

export function guardPointLightLoop(chunk) {
  const start = chunk.indexOf(POINT_START), end = chunk.indexOf(POINT_END, start);
  const loopEnd = chunk.indexOf('#pragma unroll_loop_end', start);
  if (start < 0 || end < start || loopEnd < end
    || chunk.indexOf(POINT_START, start + POINT_START.length) !== -1
    || chunk.includes('countyPointHasCutoff')) {
    throw new Error('point-light guard: lights_fragment_begin anchors changed or already guarded');
  }
  // The outward margin leaves float-rounded cutoff fragments on the original
  // path. This branch adds no sampler or derivative, and never changes the
  // existing getPointLightInfo -> response -> shadow -> RE_Direct ordering.
  const after = end + POINT_END.length;
  return chunk.slice(0,start) + GUARD + chunk.slice(start,after)
    + '\n\t\t\t}\n\t\t}' + chunk.slice(after);
}
