// Shared height-field lighting for the county's instanced wood and streamed ground.
// The height is in metres. Screen derivatives reconstruct the surface basis without
// another vertex attribute, texture lookup, geometry copy or material family.
export const SURFACE_RELIEF_GLSL = [
  'vec3 countyReliefNormal(vec3 surfacePosition, vec3 surfaceNormal, float height) {',
  '  vec3 dx = dFdx(surfacePosition), dy = dFdy(surfacePosition);',
  '  vec3 rx = cross(dy, surfaceNormal), ry = cross(surfaceNormal, dx);',
  '  float determinant = dot(dx, rx);',
  '  vec3 gradient = sign(determinant) * (dFdx(height) * rx + dFdy(height) * ry);',
  // Degenerate triangles and grazing derivatives retain the geometric normal.
  '  return normalize(max(abs(determinant), 0.00000001) * surfaceNormal - gradient);',
  '}',
].join('\n');
