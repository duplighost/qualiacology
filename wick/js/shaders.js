// shaders.js — every GLSL program in WICK.
//
// Field layout, shared by all passes:
//   MEDIUM  rgba16f : r = heat, g = smoke, b = humidity, a = ash
//   FUEL    rgba16f : r = amount, g = kind (0 dust / .33 oil / .66 wax / 1 coal), b = -, a = -
//   SOLID   rgba16f : r = solidity, g = open boundary, b = material, a = decor tint
//   VEL     rg16f   : velocity in cells/second
//   VENT    rg16f   : per-cell target acceleration (level-authored draughts)

const H = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
uniform vec2 uTexel;
`;

const LIB = `
float sol(sampler2D s, vec2 uv){ return texture(s, uv).r; }
vec2 clampUv(vec2 p, vec2 t){ return clamp(p, t * 0.5, 1.0 - t * 0.5); }
float hash11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i), b = hash12(i + vec2(1,0)), c = hash12(i + vec2(0,1)), d = hash12(i + vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ s += a * vnoise(p); p *= 2.03; p += 17.1; a *= 0.5; }
  return s;
}
vec2 bump(vec2 p){
  const float e = 0.75;
  float a = vnoise(p);
  return vec2(vnoise(p + vec2(e, 0.0)) - a, vnoise(p + vec2(0.0, e)) - a);
}
vec3 fireColor(float h){
  vec3 c = vec3(0.0);
  c += vec3(0.85, 0.13, 0.02) * smoothstep(0.04, 0.42, h);
  c += vec3(0.95, 0.40, 0.05) * smoothstep(0.30, 1.00, h);
  c += vec3(0.80, 0.68, 0.28) * smoothstep(0.85, 1.90, h);
  c += vec3(0.55, 0.62, 0.80) * smoothstep(1.90, 3.60, h);
  return c;
}
`;

// ─────────────────────────────────────────────────────────────── simulation

export const ADVECT_VEL = H + LIB + `
uniform sampler2D uVel, uSolid;
uniform float uDt, uDiss;
out vec4 outColor;
void main(){
  if (sol(uSolid, vUv) > 0.5) { outColor = vec4(0.0); return; }
  vec2 v1 = texture(uVel, vUv).xy;
  vec2 mid = clampUv(vUv - 0.5 * uDt * v1 * uTexel, uTexel);
  vec2 v2 = texture(uVel, mid).xy;
  vec2 p = clampUv(vUv - uDt * v2 * uTexel, uTexel);
  outColor = vec4(texture(uVel, p).xy * uDiss, 0.0, 1.0);
}`;

// MacCormack advection with a local-extrema limiter — keeps smoke and flame
// crisp on a coarse grid, where plain semi-Lagrangian turns everything to soup.
export const ADVECT_MEDIUM = H + LIB + `
uniform sampler2D uVel, uSrc, uSolid;
uniform float uDt;
uniform vec4 uDiss;
out vec4 outColor;
vec2 back(vec2 p, float dt){
  vec2 v1 = texture(uVel, p).xy;
  vec2 m = clampUv(p - 0.5 * dt * v1 * uTexel, uTexel);
  vec2 v2 = texture(uVel, m).xy;
  return clampUv(p - dt * v2 * uTexel, uTexel);
}
void main(){
  if (sol(uSolid, vUv) > 0.5) { outColor = vec4(0.0); return; }
  vec2 p1 = back(vUv, uDt);
  vec4 hatN1 = texture(uSrc, p1);
  vec2 p2 = back(p1, -uDt);
  vec4 hatN  = texture(uSrc, p2);
  vec4 phiN  = texture(uSrc, vUv);
  vec4 res = hatN1 + 0.5 * (phiN - hatN);

  vec2 st = p1 / uTexel - 0.5;
  vec2 base = (floor(st) + 0.5) * uTexel;
  vec4 t00 = texture(uSrc, clampUv(base, uTexel));
  vec4 t10 = texture(uSrc, clampUv(base + vec2(uTexel.x, 0.0), uTexel));
  vec4 t01 = texture(uSrc, clampUv(base + vec2(0.0, uTexel.y), uTexel));
  vec4 t11 = texture(uSrc, clampUv(base + uTexel, uTexel));
  vec4 mn = min(min(t00, t10), min(t01, t11));
  vec4 mx = max(max(t00, t10), max(t01, t11));
  res = clamp(res, mn, mx);
  outColor = max(res * uDiss, vec4(0.0));
}`;

// Combustion + the ember's own heat, written to medium and fuel in one pass
// so the two can never disagree about how much fuel was consumed.
export const COMBUST = H + LIB + `
uniform sampler2D uMedium, uFuel, uSolid;
uniform float uDt, uIgnite, uBurnRate, uHeatYield, uSmokeYield, uCool, uQuench;
uniform float uSmokeFade, uHumidFade, uRain, uTime, uHeatCap, uConduct, uFlame, uWet;
uniform vec2 uEmber;          // uv
uniform vec3 uEmberEmit;      // heat, radius(uv), smoke
uniform vec2 uAspect;
uniform float uIgnR, uEmberHeat;
layout(location = 0) out vec4 outMedium;
layout(location = 1) out vec4 outFuel;
void main(){
  vec4 s = texture(uSolid, vUv);
  vec4 m = texture(uMedium, vUv);
  vec4 f = texture(uFuel, vUv);
  if (s.r > 0.5) {
    // solids hold no air, but wet stone keeps seeping humidity into the room
    float wet = step(0.6, s.b) * step(s.b, 0.9);
    outMedium = vec4(0.0, 0.0, wet, 0.0);
    outFuel = f;
    return;
  }
  float heat = m.r, smoke = m.g, humid = m.b, ash = m.a;
  float fuel = f.r;
  float kind = f.g;

  // Ignition latches. Once a wick is lit it keeps burning until it is soaked or
  // spent — otherwise its own buoyant plume advects the flame cell empty faster
  // than it can burn, and every candle in the house quietly goes out.
  float burning = f.b;
  // A wick wants to catch; coal does not. Dust sits in between, which is what
  // makes a sooty flue a slow fuse rather than one big bang.
  float ignMul = mix(1.0, 0.42, smoothstep(0.0, 0.66, kind)) + smoothstep(0.70, 1.0, kind) * 0.85;
  float thresh = uIgnite * (1.0 + humid * 4.0) * ignMul;
  float wetOut = uWet * (0.35 + kind * 1.75);
  // The ember lights what it touches. This is deliberately separate from the
  // heat it puts into the air: heat means lift, and an ember with enough lift
  // to light a candle from across the room would never be able to reach one.
  vec2 dI = (vUv - uEmber) * uAspect;
  float spark = exp(-dot(dI, dI) / max(uIgnR * uIgnR, 1e-8)) * uEmberHeat;

  if (fuel <= 0.0001 || humid > wetOut) burning = 0.0;
  else if (heat > thresh || spark > thresh) burning = 1.0;

  float burn = 0.0;
  if (burning > 0.5) {
    float rate = uBurnRate * (1.35 - kind * 0.75) * (0.55 + min(heat, 2.0));
    burn = min(fuel, rate * uDt);
  }
  heat  += burn * uHeatYield * (0.75 + kind * 0.6);
  smoke += burn * uSmokeYield * (1.35 - kind * 0.85);
  ash   += burn * 0.35;
  humid = max(0.0, humid - burn * 3.0);

  // the ember: a moving heat source that makes its own thermal
  vec2 d = (vUv - uEmber) * uAspect;
  float g = exp(-dot(d, d) / max(uEmberEmit.y * uEmberEmit.y, 1e-6));
  heat  += uEmberEmit.x * g * uDt;
  smoke += uEmberEmit.z * g * uDt;

  humid += uRain * uDt * (0.6 + 0.4 * vnoise(vUv * 40.0 + uTime * vec2(0.7, -2.3)));

  // Conduction. A flame front travels along fuel far faster than heat drifts,
  // which is what makes an oil line race and a sooty flue go up all at once.
  vec2 t = uTexel;
  float hN = 0.25 * (texture(uMedium, vUv + vec2(t.x, 0.0)).r + texture(uMedium, vUv - vec2(t.x, 0.0)).r
                   + texture(uMedium, vUv + vec2(0.0, t.y)).r + texture(uMedium, vUv - vec2(0.0, t.y)).r);
  float cond = uConduct * (1.0 + 9.0 * step(0.005, fuel));
  heat = mix(heat, max(heat, hN), clamp(cond * uDt, 0.0, 0.8));

  heat -= uDt * (uCool * heat * (0.30 + heat * 0.85) + uQuench * humid * heat);
  // a flame holds its own temperature; this is what makes a lit candle a place
  // you can go back to
  if (burning > 0.5) heat = max(heat, uFlame * (0.55 + 0.45 * kind));
  heat  = clamp(heat, 0.0, uHeatCap);
  smoke = max(0.0, smoke - uDt * uSmokeFade * smoke);
  humid = max(0.0, humid - uDt * (uHumidFade * humid + heat * 0.9));
  ash   = max(0.0, ash - uDt * 0.12 * ash);

  outMedium = vec4(heat, smoke, humid, ash);
  outFuel = vec4(max(fuel - burn, 0.0), kind, burning, f.a);
}`;

export const CURL = H + LIB + `
uniform sampler2D uVel;
out vec4 outColor;
void main(){
  vec2 t = uTexel;
  float r = texture(uVel, vUv + vec2(t.x, 0.0)).y;
  float l = texture(uVel, vUv - vec2(t.x, 0.0)).y;
  float u = texture(uVel, vUv + vec2(0.0, t.y)).x;
  float d = texture(uVel, vUv - vec2(0.0, t.y)).x;
  outColor = vec4(0.5 * ((r - l) - (u - d)), 0.0, 0.0, 1.0);
}`;

export const FORCES = H + LIB + `
uniform sampler2D uVel, uMedium, uCurl, uSolid, uVent;
uniform float uDt, uBuoy, uSmokeW, uVort, uDamp, uVentGain, uTime, uAmbientSwirl;
uniform vec2 uPointer, uPointerForce, uAspect;
uniform float uPointerR;
uniform vec4 uGustA[4];   // xy = uv centre, z = radius, w = strength
uniform vec4 uGustB[4];   // xy = direction
out vec4 outColor;
void main(){
  if (sol(uSolid, vUv) > 0.5) { outColor = vec4(0.0); return; }
  vec2 v = texture(uVel, vUv).xy;
  vec4 m = texture(uMedium, vUv);

  // Buoyancy saturates. Straight-line lift makes a hot cell rise several grid
  // cells per step, which shreds the flame it came from.
  float lift = m.r / (1.0 + 0.45 * m.r);
  v.y += uDt * (uBuoy * lift - uSmokeW * m.g - uSmokeW * 0.4 * m.a);

  vec2 t = uTexel;
  float cC = texture(uCurl, vUv).r;
  float cL = abs(texture(uCurl, vUv - vec2(t.x, 0.0)).r);
  float cR = abs(texture(uCurl, vUv + vec2(t.x, 0.0)).r);
  float cB = abs(texture(uCurl, vUv - vec2(0.0, t.y)).r);
  float cT = abs(texture(uCurl, vUv + vec2(0.0, t.y)).r);
  vec2 g = 0.5 * vec2(cR - cL, cT - cB);
  g /= length(g) + 1e-4;
  v += uDt * uVort * vec2(g.y * cC, -g.x * cC);

  vec2 d = (vUv - uPointer) * uAspect;
  float w = exp(-dot(d, d) / max(uPointerR * uPointerR, 1e-6));
  v += uPointerForce * w * uDt;

  for (int i = 0; i < 4; i++){
    vec4 a = uGustA[i];
    if (a.w == 0.0) continue;
    vec2 dd = (vUv - a.xy) * uAspect;
    float gw = exp(-dot(dd, dd) / max(a.z * a.z, 1e-6));
    v += uGustB[i].xy * a.w * gw * uDt;
  }

  v += texture(uVent, vUv).xy * uVentGain * uDt;

  // a whisper of ambient turbulence so still rooms are never dead
  float n1 = vnoise(vUv * 9.0 + vec2(uTime * 0.15, uTime * 0.11));
  float n2 = vnoise(vUv * 9.0 + vec2(31.7 - uTime * 0.09, 12.3 + uTime * 0.13));
  v += (vec2(n1, n2) - 0.5) * uAmbientSwirl * uDt;

  v *= exp(-uDamp * uDt);
  outColor = vec4(v, 0.0, 1.0);
}`;

// The inhale is a genuine mass sink in the projection, not a fake attractor:
// the pressure solve then produces convergent flow from every direction.
export const DIVERGENCE = H + LIB + `
uniform sampler2D uVel, uSolid;
uniform vec2 uPointer, uAspect;
uniform float uSink, uPointerR;
out vec4 outColor;
void main(){
  vec2 t = uTexel;
  vec2 vC = texture(uVel, vUv).xy;
  vec2 vL = texture(uVel, vUv - vec2(t.x, 0.0)).xy;
  vec2 vR = texture(uVel, vUv + vec2(t.x, 0.0)).xy;
  vec2 vB = texture(uVel, vUv - vec2(0.0, t.y)).xy;
  vec2 vT = texture(uVel, vUv + vec2(0.0, t.y)).xy;
  if (sol(uSolid, vUv - vec2(t.x, 0.0)) > 0.5) vL = vec2(-vC.x,  vC.y);
  if (sol(uSolid, vUv + vec2(t.x, 0.0)) > 0.5) vR = vec2(-vC.x,  vC.y);
  if (sol(uSolid, vUv - vec2(0.0, t.y)) > 0.5) vB = vec2( vC.x, -vC.y);
  if (sol(uSolid, vUv + vec2(0.0, t.y)) > 0.5) vT = vec2( vC.x, -vC.y);
  float div = 0.5 * ((vR.x - vL.x) + (vT.y - vB.y));
  vec2 d = (vUv - uPointer) * uAspect;
  div += uSink * exp(-dot(d, d) / max(uPointerR * uPointerR, 1e-6));
  outColor = vec4(div, 0.0, 0.0, 1.0);
}`;

export const JACOBI = H + LIB + `
uniform sampler2D uP, uDiv, uSolid;
out vec4 outColor;
void main(){
  vec4 s = texture(uSolid, vUv);
  if (s.g > 0.5) { outColor = vec4(0.0); return; }   // open boundary: p = 0
  vec2 t = uTexel;
  float pC = texture(uP, vUv).r;
  float pL = sol(uSolid, vUv - vec2(t.x, 0.0)) > 0.5 ? pC : texture(uP, vUv - vec2(t.x, 0.0)).r;
  float pR = sol(uSolid, vUv + vec2(t.x, 0.0)) > 0.5 ? pC : texture(uP, vUv + vec2(t.x, 0.0)).r;
  float pB = sol(uSolid, vUv - vec2(0.0, t.y)) > 0.5 ? pC : texture(uP, vUv - vec2(0.0, t.y)).r;
  float pT = sol(uSolid, vUv + vec2(0.0, t.y)) > 0.5 ? pC : texture(uP, vUv + vec2(0.0, t.y)).r;
  outColor = vec4((pL + pR + pB + pT - texture(uDiv, vUv).r) * 0.25, 0.0, 0.0, 1.0);
}`;

export const GRADIENT = H + LIB + `
uniform sampler2D uP, uVel, uSolid;
out vec4 outColor;
void main(){
  if (sol(uSolid, vUv) > 0.5) { outColor = vec4(0.0); return; }
  vec2 t = uTexel;
  float pC = texture(uP, vUv).r;
  float sL = sol(uSolid, vUv - vec2(t.x, 0.0));
  float sR = sol(uSolid, vUv + vec2(t.x, 0.0));
  float sB = sol(uSolid, vUv - vec2(0.0, t.y));
  float sT = sol(uSolid, vUv + vec2(0.0, t.y));
  float pL = sL > 0.5 ? pC : texture(uP, vUv - vec2(t.x, 0.0)).r;
  float pR = sR > 0.5 ? pC : texture(uP, vUv + vec2(t.x, 0.0)).r;
  float pB = sB > 0.5 ? pC : texture(uP, vUv - vec2(0.0, t.y)).r;
  float pT = sT > 0.5 ? pC : texture(uP, vUv + vec2(0.0, t.y)).r;
  vec2 v = texture(uVel, vUv).xy - 0.5 * vec2(pR - pL, pT - pB);
  if (sL > 0.5) v.x = max(v.x, 0.0);
  if (sR > 0.5) v.x = min(v.x, 0.0);
  if (sB > 0.5) v.y = max(v.y, 0.0);
  if (sT > 0.5) v.y = min(v.y, 0.0);
  outColor = vec4(v, 0.0, 1.0);
}`;

// Gameplay needs to read the fields, but a full readback would stall the GPU.
// Instead we gather up to 48 point queries into a 48x2 texture and read that
// back asynchronously through a fence.
export const PROBE = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
uniform sampler2D uVel, uMedium, uFuel, uSolid;
uniform vec2 uProbe[48];
out vec4 outColor;
void main(){
  int i = int(gl_FragCoord.x);
  int row = int(gl_FragCoord.y);
  vec2 uv = clamp(uProbe[i], vec2(0.0), vec2(1.0));
  if (row == 0) {
    vec4 m = texture(uMedium, uv);
    outColor = vec4(texture(uVel, uv).xy, m.r, m.g);
  } else {
    vec4 s = texture(uSolid, uv);
    vec4 m = texture(uMedium, uv);
    vec4 f = texture(uFuel, uv);
    outColor = vec4(s.r, f.r, m.b, f.b);   // solid, fuel left, humidity, burning
  }
}`;

// ─────────────────────────────────────────────────────────────── particles

export const PART_UPDATE = H + LIB + `
uniform sampler2D uPart, uVel, uMedium, uSolid;
uniform float uDt, uTime, uSpawnRate, uEmberHeat, uSparkLife, uMoteLife, uHandActive;
uniform vec2 uHand;
uniform vec2 uEmber, uEmberVel, uGrid;
out vec4 outColor;
void main(){
  vec4 p = texture(uPart, vUv);
  float seed = hash12(vUv * 719.3);
  bool mote = seed > 0.90;
  float life = p.z;
  float born = p.w;

  if (life <= 0.0) {
    float roll = hash12(vUv * 311.7 + uTime * 1.37);
    float wake = hash12(vUv * 77.1 + uTime * 0.53);
    if (mote) {
      if (wake > 0.972) {
        // most new dust appears around your hand, so the air you are stirring
        // is the air you can see
        vec2 np;
        if (uHandActive > 0.5 && roll < 0.72) {
          float ang = hash12(vUv * 57.3 + uTime * 2.1) * 6.2831853;
          float rad = 0.02 + 0.055 * hash12(vUv * 13.7 - uTime * 1.3);
          np = clamp(uHand + vec2(cos(ang), sin(ang)) * rad * vec2(1.0, uGrid.x / uGrid.y),
                     vec2(0.0), vec2(1.0));
        } else {
          np = vec2(hash12(vUv * 91.7 + uTime), hash12(vUv * 43.1 - uTime));
        }
        outColor = vec4(np, uMoteLife * (0.35 + roll * 0.7), 1.0);
        return;
      }
    } else if (wake < uSpawnRate * uDt * 60.0 && uEmberHeat > 0.05) {
      float a = roll * 6.2831853;
      float r = 0.004 * sqrt(wake / max(uSpawnRate * uDt * 60.0, 1e-5));
      outColor = vec4(uEmber + vec2(cos(a), sin(a)) * r * vec2(uGrid.y / uGrid.x, 1.0),
                      uSparkLife * (0.35 + roll * 0.8), 0.0);
      return;
    }
    outColor = vec4(p.xy, 0.0, born);
    return;
  }

  vec2 v = texture(uVel, p.xy).xy;
  float drag = mote ? 3.0 : 8.5;
  float rise = mote ? 0.0 : 5.0;
  vec2 vel = v + vec2(0.0, rise * texture(uMedium, p.xy).r - (mote ? 1.2 : 3.0));
  vec2 np = p.xy + vel * uDt * uTexel * (mote ? 0.85 : 1.0);
  np += (vec2(hash12(p.xy * 131.0 + uTime), hash12(p.xy * 57.0 - uTime)) - 0.5) * uTexel * (mote ? 0.9 : 2.2);
  np = clamp(np, vec2(0.0), vec2(1.0));
  if (texture(uSolid, np).r > 0.5) np = p.xy;
  float dl = uDt * (mote ? 1.0 : 1.0 + 0.9 * max(0.0, 1.0 - texture(uMedium, np).r));
  outColor = vec4(np, life - dl, born);
}`;

export const PART_VS = `#version 300 es
precision highp float;
uniform sampler2D uPart, uVelTex;
uniform ivec2 uPartRes;
uniform vec4 uCam;        // xy = uv origin, zw = uv size
uniform vec2 uPx;         // target size in pixels
uniform vec3 uEmber;      // uv.xy, heat
uniform vec2 uAspect;
uniform float uScale;
out float vLife;
out float vMote;
out float vGlow;
void main(){
  ivec2 c = ivec2(gl_VertexID % uPartRes.x, gl_VertexID / uPartRes.x);
  vec4 p = texelFetch(uPart, c, 0);
  vec2 s = (p.xy - uCam.xy) / uCam.zw;
  gl_Position = vec4(s * 2.0 - 1.0, 0.0, 1.0);
  vLife = p.z;
  vMote = p.w;
  // Dust is visible where your light reaches it — and where it is moving,
  // which is the only way to see what your hand just did to the air.
  vec2 d = (p.xy - uEmber.xy) * uAspect;
  float lit = uEmber.z / (1.0 + dot(d, d) * 900.0);
  float moving = clamp(length(texture(uVelTex, p.xy).xy) / 74.0 - 0.07, 0.0, 1.6);
  vGlow = lit + moving * moving * 1.15;
  float base = p.w > 0.5 ? 4.4 : 2.8;
  // moving dust draws a little larger, so a swept current reads as a stroke
  gl_PointSize = max(1.5, base * uScale
    * (p.w > 0.5 ? 1.0 + moving * 0.55 : clamp(p.z * 1.6, 0.35, 1.4)));
  if (p.z <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;

export const PART_FS = `#version 300 es
precision highp float;
in float vLife;
in float vMote;
in float vGlow;
uniform float uSparkGain, uMoteGain;
uniform vec3 uMoteTint;
out vec4 outColor;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float a = max(0.0, 1.0 - dot(d, d) * 4.0);
  a *= a;
  if (vMote > 0.5) {
    outColor = vec4(uMoteTint * a * uMoteGain * clamp(vLife * 0.35, 0.0, 1.0) * min(vGlow, 2.0), 1.0);
  } else {
    float t = clamp(vLife * 0.9, 0.0, 1.6);
    vec3 c = mix(vec3(0.9, 0.18, 0.03), vec3(1.0, 0.86, 0.55), clamp(t, 0.0, 1.0));
    outColor = vec4(c * a * uSparkGain * clamp(vLife * 1.3, 0.0, 1.0), 1.0);
  }
}`;

// ─────────────────────────────────────────────────────────── light + shade

// A 1D polar depth map around the ember. One texel per ray; the composite
// compares angle+distance against it to get real cast shadows in 2D.
export const SHADOW = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
uniform sampler2D uSolid;
uniform vec2 uGrid, uLight;   // uLight in cell coords
uniform float uMaxDist;
out vec4 outColor;
void main(){
  float a = vUv.x * 6.28318530718;
  vec2 dir = vec2(cos(a), sin(a));
  float step0 = uMaxDist / 150.0;
  float d = step0;
  float hit = uMaxDist;
  for (int i = 0; i < 150; i++){
    vec2 p = uLight + dir * d;
    vec2 uv = p / uGrid;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { hit = d; break; }
    if (texture(uSolid, uv).r > 0.5) { hit = d; break; }
    d += step0;
    if (d > uMaxDist) break;
  }
  // bisect back for a crisp edge
  if (hit < uMaxDist) {
    float lo = max(hit - step0, 0.0), hi = hit;
    for (int k = 0; k < 6; k++){
      float mid = 0.5 * (lo + hi);
      vec2 uv = (uLight + dir * mid) / uGrid;
      bool inside = uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 || texture(uSolid, uv).r > 0.5;
      if (inside) hi = mid; else lo = mid;
    }
    hit = hi;
  }
  outColor = vec4(hit, 0.0, 0.0, 1.0);
}`;

// Emission at half grid res, then blurred down a few levels — a cheap stand-in
// for bounce light. Everything you see is lit by fire, so this matters a lot.
export const EMISSION = H + LIB + `
uniform sampler2D uMedium, uSolid, uFuel;
uniform vec2 uEmber, uAspect;
uniform float uEmberHeat, uEmberR, uGain;
out vec4 outColor;
void main(){
  vec4 m = texture(uMedium, vUv);
  vec3 c = fireColor(m.r) * min(m.r * 1.35, 3.2);
  vec2 d = (vUv - uEmber) * uAspect;
  float g = exp(-dot(d, d) / max(uEmberR * uEmberR, 1e-6));
  c += mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.88, 0.62), clamp(uEmberHeat, 0.0, 1.0)) * g * uEmberHeat * 2.0;
  c *= 1.0 - clamp(texture(uSolid, vUv).r, 0.0, 1.0);
  outColor = vec4(c * uGain, 1.0);
}`;

export const DOWNSAMPLE = H + `
uniform sampler2D uSrc;
out vec4 outColor;
void main(){
  vec2 t = uTexel;
  vec4 s = texture(uSrc, vUv) * 4.0;
  s += texture(uSrc, vUv + vec2( t.x,  t.y));
  s += texture(uSrc, vUv + vec2(-t.x,  t.y));
  s += texture(uSrc, vUv + vec2( t.x, -t.y));
  s += texture(uSrc, vUv + vec2(-t.x, -t.y));
  s += 2.0 * texture(uSrc, vUv + vec2( t.x, 0.0));
  s += 2.0 * texture(uSrc, vUv + vec2(-t.x, 0.0));
  s += 2.0 * texture(uSrc, vUv + vec2(0.0,  t.y));
  s += 2.0 * texture(uSrc, vUv + vec2(0.0, -t.y));
  outColor = s / 16.0;
}`;

export const UPSAMPLE = H + `
uniform sampler2D uSrc, uAdd;
uniform float uMix;
out vec4 outColor;
void main(){
  vec2 t = uTexel;
  vec4 s = texture(uSrc, vUv) * 4.0;
  s += texture(uSrc, vUv + vec2( t.x,  t.y));
  s += texture(uSrc, vUv + vec2(-t.x,  t.y));
  s += texture(uSrc, vUv + vec2( t.x, -t.y));
  s += texture(uSrc, vUv + vec2(-t.x, -t.y));
  s += 2.0 * texture(uSrc, vUv + vec2( t.x, 0.0));
  s += 2.0 * texture(uSrc, vUv + vec2(-t.x, 0.0));
  s += 2.0 * texture(uSrc, vUv + vec2(0.0,  t.y));
  s += 2.0 * texture(uSrc, vUv + vec2(0.0, -t.y));
  outColor = texture(uAdd, vUv) + (s / 16.0) * uMix;
}`;

// ──────────────────────────────────────────────────────────────── composite

export const COMPOSITE = H + LIB + `
uniform sampler2D uMedium, uSolid, uFuel, uVel, uShadow, uGI0, uGI1, uGI2;
uniform vec4 uCam;                 // xy = uv origin, zw = uv size
uniform vec2 uGrid, uAspect;
uniform vec4 uEmber;               // uv.xy, heat, radius(uv)
uniform vec2 uEmberVel;
uniform float uTime, uShadowMax, uDetail, uShimmer, uFogGain, uAmbient, uWallLift;
uniform vec3 uAmbientTint, uWallTint;
out vec4 outColor;

vec3 wallAlbedo(float mat, vec2 g){
  vec3 stone  = vec3(0.235, 0.205, 0.180);
  vec3 wood   = vec3(0.205, 0.120, 0.062);
  vec3 metal  = vec3(0.165, 0.170, 0.190);
  vec3 water  = vec3(0.035, 0.070, 0.105);
  vec3 glassy = vec3(0.120, 0.150, 0.165);
  vec3 wax    = vec3(0.560, 0.500, 0.410);
  vec3 c = stone;
  c = mix(c, wax,    smoothstep(0.10, 0.20, mat) * (1.0 - smoothstep(0.20, 0.30, mat)));
  c = mix(c, wood,   smoothstep(0.20, 0.32, mat) * (1.0 - smoothstep(0.32, 0.44, mat)));
  c = mix(c, metal,  smoothstep(0.40, 0.52, mat) * (1.0 - smoothstep(0.55, 0.68, mat)));
  c = mix(c, water,  smoothstep(0.62, 0.76, mat) * (1.0 - smoothstep(0.86, 0.94, mat)));
  c = mix(c, glassy, smoothstep(0.90, 0.99, mat));
  float n = fbm(g * 0.42) * 0.55 + fbm(g * 1.9) * 0.28;
  return c * (0.62 + 0.75 * n);
}

float shadowAt(vec2 cell, vec2 lightCell, float dist){
  float a = atan(cell.y - lightCell.y, cell.x - lightCell.x) / 6.28318530718 + 0.5;
  float spread = clamp(dist / uShadowMax, 0.0, 1.0) * 0.013 + 0.0030;
  float s = 0.0;
  s += step(dist, texture(uShadow, vec2(a, 0.5)).r + 0.9);
  s += step(dist, texture(uShadow, vec2(a + spread, 0.5)).r + 0.9);
  s += step(dist, texture(uShadow, vec2(a - spread, 0.5)).r + 0.9);
  s += step(dist, texture(uShadow, vec2(a + spread * 2.0, 0.5)).r + 0.9);
  s += step(dist, texture(uShadow, vec2(a - spread * 2.0, 0.5)).r + 0.9);
  return s * 0.2;
}

void main(){
  vec2 guv = uCam.xy + vUv * uCam.zw;
  vec2 cell = guv * uGrid;

  vec4 m0 = texture(uMedium, guv);
  vec2 gh = vec2(
    texture(uMedium, guv + vec2(uTexel.x, 0.0)).r - texture(uMedium, guv - vec2(uTexel.x, 0.0)).r,
    texture(uMedium, guv + vec2(0.0, uTexel.y)).r - texture(uMedium, guv - vec2(0.0, uTexel.y)).r);
  vec2 warp = gh * uShimmer * uCam.zw;
  vec2 wuv = clamp(guv + warp, vec2(0.0), vec2(1.0));

  vec4 s = texture(uSolid, wuv);
  vec4 m = texture(uMedium, wuv);
  float heat = m0.r;

  // break up the coarse grid with advected detail noise
  vec2 fv = texture(uVel, guv).xy;
  vec2 dn = cell * uDetail + vec2(uTime * 0.6, -uTime * 1.4) - fv * 0.09;
  float det = fbm(dn * 0.13) * 0.7 + fbm(dn * 0.38 + 4.1) * 0.42;
  heat *= 0.52 + 1.05 * det;
  float smoke = m.g * (0.55 + 0.9 * fbm(dn * 0.075 + 9.3));

  vec3 gi = texture(uGI0, wuv).rgb * 0.70 + texture(uGI1, wuv).rgb * 0.80 + texture(uGI2, wuv).rgb * 0.55;

  vec2 ecell = uEmber.xy * uGrid;
  vec2 toE = ecell - cell;
  float dE = length(toE);
  float sh = shadowAt(cell, ecell, dE);
  // Not inverse-square: a real 1/r^2 falloff makes the room unreadable, and the
  // point of the room is that you can just make out what it wants from you.
  float atten = 1.0 / (1.0 + dE * 0.016 + dE * dE * 0.00045);
  vec3 emberCol = mix(vec3(1.0, 0.26, 0.04), vec3(1.0, 0.78, 0.46), clamp(uEmber.z * 0.72, 0.0, 1.0));
  vec3 emberLight = emberCol * uEmber.z * 2.9 * atten * sh;

  // Both sides are evaluated and blended rather than branched: the solid field
  // is one value per cell, and at these zoom levels a hard cutoff turns every
  // wall edge into a visible flight of stairs.
  float solidness = smoothstep(0.30, 0.70, s.r);

  vec2 gsol = vec2(
    texture(uSolid, wuv + vec2(uTexel.x, 0.0)).r - texture(uSolid, wuv - vec2(uTexel.x, 0.0)).r,
    texture(uSolid, wuv + vec2(0.0, uTexel.y)).r - texture(uSolid, wuv - vec2(0.0, uTexel.y)).r);
  vec2 relief = bump(cell * 0.24) * 1.15 + bump(cell * 0.85) * 0.55 + bump(cell * 3.1) * 0.22;
  vec3 N = normalize(vec3(-gsol * 2.4 + relief, 0.85));
  vec3 L = normalize(vec3(normalize(toE + 1e-5), 0.62));
  float ndl = max(dot(N, L), 0.0) * 0.78 + 0.22;
  // props are pale wax and brass; they must read from across a dark room
  vec3 alb = wallAlbedo(s.b, cell) * (1.0 + s.a * 1.9);
  float spec = pow(max(dot(reflect(-L, N), vec3(0.0, 0.0, 1.0)), 0.0), 24.0)
             * (0.10 + smoothstep(0.38, 0.58, s.b) * 0.85 + smoothstep(0.62, 0.80, s.b) * 1.2);
  vec3 fill = uAmbientTint * uAmbient * (0.9 + 0.9 * N.y) + uWallTint * uWallLift;
  vec3 wall = alb * (emberLight * ndl + gi * mix(0.30, 0.62, sh) + fill)
            + emberCol * spec * uEmber.z * atten * sh * 1.6;

  vec3 air = uAmbientTint * uAmbient * 0.22 + gi * 0.14;
  // Smoke occludes. Only its lit edge glows; deeper in, it swallows the light,
  // otherwise a burning flue fills with a flat bright slab.
  float fog = (1.0 - exp(-smoke * uFogGain)) * 0.88;
  float selfShade = exp(-smoke * 0.85);
  vec3 smokeLit = (gi * 0.30 + emberLight * 0.22 + uAmbientTint * uAmbient * 0.7) * selfShade;
  air = mix(air, smokeLit, fog);
  air *= 1.0 - clamp(m.b, 0.0, 1.0) * 0.18;
  air += fireColor(heat) * min(heat * heat * 0.34 + heat * 0.30, 2.6);
  // damp humidity is visible as a cold sheen
  air += vec3(0.06, 0.11, 0.16) * clamp(m.b, 0.0, 1.4) * 0.30;

  vec3 col = mix(air, wall, solidness);

  // the ember itself: hot core, plus a streak along its motion
  vec2 ed = (guv - uEmber.xy) * uAspect;
  float r2 = dot(ed, ed);
  vec2 dir = uEmberVel;
  float sp = length(dir);
  if (sp > 1e-4) {
    dir /= sp;
    float along = dot(ed, dir);
    float across = dot(ed, vec2(-dir.y, dir.x));
    float st = clamp(sp * 0.0016, 0.0, 2.4);
    r2 = min(r2, along * along / (1.0 + st * 5.0) + across * across * (1.0 + st * 0.7));
  }
  float core = exp(-r2 / max(uEmber.w * uEmber.w * 0.30, 1e-8));
  float halo = exp(-r2 / max(uEmber.w * uEmber.w * 4.5, 1e-8));
  col += emberCol * (core * 1.25 * (0.35 + uEmber.z) + halo * 0.20 * uEmber.z);
  col += vec3(1.0, 0.94, 0.86) * core * core * 0.45 * clamp(uEmber.z, 0.0, 1.2);

  outColor = vec4(max(col, vec3(0.0)), 1.0);
}`;

export const BLOOM_PREFILTER = H + `
uniform sampler2D uSrc;
uniform float uThreshold, uKnee;
out vec4 outColor;
void main(){
  vec3 c = texture(uSrc, vUv).rgb;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-5);
  float w = max(soft, br - uThreshold) / max(br, 1e-5);
  outColor = vec4(c * w, 1.0);
}`;

export const POST = H + LIB + `
uniform sampler2D uScene, uBloom;
uniform vec2 uRes;
uniform float uTime, uBloomGain, uVignette, uGrain, uAberr, uExposure, uFade, uDesat, uFlash;
uniform vec3 uLift, uGamma, uGain;
out vec4 outColor;

vec3 aces(vec3 x){
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
void main(){
  vec2 uv = vUv;
  vec2 off = (uv - 0.5) * uAberr * 0.0009;
  vec3 c;
  c.r = texture(uScene, uv + off).r;
  c.g = texture(uScene, uv).g;
  c.b = texture(uScene, uv - off).b;
  c += texture(uBloom, uv).rgb * uBloomGain;

  c *= uExposure * (1.0 + uFlash);
  c = aces(c);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c = uLift + c * uGain;
  c = pow(max(c, 0.0), uGamma);

  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, vec3(lum) * vec3(1.02, 0.97, 0.94), uDesat);

  float d = length((uv - 0.5) * vec2(1.0, 0.92));
  c *= 1.0 - uVignette * smoothstep(0.32, 0.94, d);

  float g = hash12(gl_FragCoord.xy + fract(uTime) * 517.0) - 0.5;
  c += g * uGrain * (1.0 - 0.55 * lum);

  c *= uFade;
  outColor = vec4(max(c, vec3(0.0)), 1.0);
}`;

export const BLIT = H + `
uniform sampler2D uSrc;
out vec4 outColor;
void main(){ outColor = texture(uSrc, vUv); }
`;
