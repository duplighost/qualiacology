// Shared height-field lighting for the county's instanced wood and streamed ground.
// The height is in metres. Screen derivatives reconstruct the surface basis without
// another vertex attribute, texture lookup, geometry copy or material family.
//
// THE WEAVE, and what the four-argument form is for. dFdx(height) is relief only while
// one pixel covers a SMALL step of the height field. Roll a trunk towards its silhouette
// and a pixel spans tens of texels: the difference between two neighbours stops being a
// slope and becomes the scan's full contrast pointing nowhere, so the normal flips from
// quad to quad and the edge wears a woven crosshatch. That is the artefact Alex reported
// on the trunks and the station wall.
//
// MEASURED at 1600x900 in the close-trunk pose, bark pixels binned by |dFdx(height)|
// (a debug shader wrote tests/shots/kick-trunks.png; it is not kept). Pixels the relief
// barely moved: 0.00044 m per pixel. Pixels where it changed the picture by 18 levels or
// more - the band itself: 0.0024. Five times apart, and nothing else separated them:
// the uv footprint was 0.018 against 0.0042, well inside one smoothstep of each other,
// which is why fading on that alone left the band standing.
//
// So `legibleStep` is the metres-per-pixel of height a caller still calls relief, and the
// normal rolls back to the geometric one across legibleStep..2.6x. Give it about twice
// the step a face-on surface produces; for the bark scan at 0.046 m that is 0.0010.
export const SURFACE_RELIEF_GLSL = [
  'vec3 countyReliefNormal(vec3 surfacePosition, vec3 surfaceNormal, float height) {',
  '  vec3 dx = dFdx(surfacePosition), dy = dFdy(surfacePosition);',
  '  vec3 rx = cross(dy, surfaceNormal), ry = cross(surfaceNormal, dx);',
  '  float determinant = dot(dx, rx);',
  '  vec3 gradient = sign(determinant) * (dFdx(height) * rx + dFdy(height) * ry);',
  // Degenerate triangles and grazing derivatives retain the geometric normal.
  '  return normalize(max(abs(determinant), 0.00000001) * surfaceNormal - gradient);',
  '}',
  'vec3 countyReliefNormal(vec3 surfacePosition, vec3 surfaceNormal, float height, float legibleStep) {',
  '  vec3 relief = countyReliefNormal(surfacePosition, surfaceNormal, height);',
  '  float step = max(abs(dFdx(height)), abs(dFdy(height)));',
  '  float legible = 1.0 - smoothstep(legibleStep, legibleStep * 2.6, step);',
  '  return normalize(mix(surfaceNormal, relief, legible));',
  '}',
].join('\n');
