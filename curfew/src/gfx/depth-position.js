// A nearest-filtered depth value belongs to the centre of its source texel.
// Reconstructing it along the caller's fractional ray creates false surface
// slopes when half/quarter-size fields do not divide the viewport evenly.
export const VIEW_POSITION_GLSL = `
  ivec2 pixelAt(vec2 uv){
    ivec2 size=textureSize(tDepth,0);
    return clamp(ivec2(floor(uv*vec2(size))),ivec2(0),size-1);
  }
  vec3 positionAtPixel(ivec2 pixel){
    ivec2 size=textureSize(tDepth,0);
    pixel=clamp(pixel,ivec2(0),size-1);
    float d=texelFetch(tDepth,pixel,0).r;
    vec2 center=(vec2(pixel)+.5)/vec2(size);
    vec4 p=uInvProjection*vec4(center*2.0-1.0,d*2.0-1.0,1.0);
    return p.xyz/max(.00001,p.w);
  }
  vec3 positionAt(vec2 uv){return positionAtPixel(pixelAt(uv));}
`;

// Offset the integer source pixel, never its floating-point UV. At half-size
// sample centres, UV +/- one texel can round back onto the centre pixel and
// produce a zero tangent: the periodic missing normals become visible grids.
export const VIEW_NORMAL_GLSL = `
  float depthAtPixel(ivec2 q){
    return texelFetch(tDepth,clamp(q,ivec2(0),textureSize(tDepth,0)-1),0).r;
  }
  vec3 surfaceNormalAt(vec2 uv,vec3 p){
    ivec2 q=pixelAt(uv),last=textureSize(tDepth,0)-1;
    float c=depthAtPixel(q);
    float l1=depthAtPixel(q+ivec2(-1,0)),l2=depthAtPixel(q+ivec2(-2,0));
    float r1=depthAtPixel(q+ivec2(1,0)),r2=depthAtPixel(q+ivec2(2,0));
    float b1=depthAtPixel(q+ivec2(0,-1)),b2=depthAtPixel(q+ivec2(0,-2));
    float t1=depthAtPixel(q+ivec2(0,1)),t2=depthAtPixel(q+ivec2(0,2));
    bool left=q.x>=2&&(q.x>last.x-2||abs(2.0*l1-l2-c)<abs(2.0*r1-r2-c));
    bool below=q.y>=2&&(q.y>last.y-2||abs(2.0*b1-b2-c)<abs(2.0*t1-t2-c));
    vec3 dx=left?p-positionAtPixel(q+ivec2(-2,0)):positionAtPixel(q+ivec2(2,0))-p;
    vec3 dy=below?p-positionAtPixel(q+ivec2(0,-2)):positionAtPixel(q+ivec2(0,2))-p;
    vec3 basis=cross(dx,dy);
    // A silhouette can have no usable pair on either side. It has no reliable
    // screen-space plane; keep a finite facing normal instead of a zero vector.
    float area=dot(basis,basis);
    vec3 n=area>1e-20?basis*inversesqrt(area):normalize(-p);
    return dot(n,-p)<0.0?-n:n;
  }
`;
