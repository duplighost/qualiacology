// A nearest-filtered depth value belongs to the centre of its source texel.
// Reconstructing it along the caller's fractional ray creates false surface
// slopes when half/quarter-size fields do not divide the viewport evenly.
export const VIEW_POSITION_GLSL = `
  vec3 positionAt(vec2 uv){
    ivec2 size=textureSize(tDepth,0);
    ivec2 pixel=clamp(ivec2(floor(uv*vec2(size))),ivec2(0),size-1);
    float d=texelFetch(tDepth,pixel,0).r;
    vec2 center=(vec2(pixel)+.5)/vec2(size);
    vec4 p=uInvProjection*vec4(center*2.0-1.0,d*2.0-1.0,1.0);
    return p.xyz/max(.00001,p.w);
  }
`;
